// test_federation.js — Federation Bridge tests (Article X of ZION Constitution)
const { test, suite, report, assert } = require('./test_runner');
const Federation = require('../src/js/federation');

// ─── Fixtures ────────────────────────────────────────────────────────────────

var localConfig = {
  worldId: 'zion-main',
  worldName: 'ZION',
  endpoint: 'https://kody-w.github.io/zion',
  protocolVersion: 1,
  adminUser: 'kody-w'
};

var remoteConfig = {
  worldId: 'zion-fork-aurora',
  worldName: 'Aurora',
  endpoint: 'https://aurora-zion.github.io',
  protocolVersion: 1,
  adminUser: 'aurora-admin'
};

var samplePlayer = {
  username: 'traveler42',
  homeWorld: 'zion-main',
  reputation: 85,
  appearance: { skin: 'fair', hair: 'brown', outfit: 'explorer' },
  intentions: [{ id: 'i1', trigger: { condition: 'player_nearby' }, action: { type: 'say', params: { message: 'Hello!' } }, priority: 5, ttl: 300, cooldown: 60, max_fires: 10 }],
  inventory: [{ item: 'sunflower_seed', qty: 5 }, { item: 'hammer', qty: 1 }],
  spark: 120,
  gardens: [{ id: 'g1', zone: 'gardens', plot: [10, 0, 10] }],
  structures: [{ id: 's1', type: 'cabin', zone: 'commons' }],
  isSteward: true,
  skills: ['herbalism', 'carpentry'],
  travelerMarks: [],
  position: { x: 0, y: 0, z: 0, zone: 'nexus' }
};

var federationJson = {
  worldId: 'zion-main',
  worldName: 'ZION',
  endpoint: 'https://kody-w.github.io/zion',
  protocolVersion: 1,
  federations: [
    {
      worldId: 'zion-fork-aurora',
      worldName: 'Aurora',
      endpoint: 'https://aurora-zion.github.io',
      protocolVersion: 1,
      federatedSince: '2026-01-01T00:00:00Z',
      status: 'active',
      playerCount: 12,
      lastHeartbeat: new Date().toISOString()
    }
  ],
  discoveredWorlds: [],
  lastAnnounce: null
};


// ─── Suite: Announce ──────────────────────────────────────────────────────────

suite('Federation: Announce', function() {

  test('announce() generates a valid federation_announce protocol message', function() {
    var msg = Federation.announce(localConfig);
    assert.strictEqual(msg.type, 'federation_announce');
    assert.strictEqual(msg.v, 1);
    assert(typeof msg.id === 'string' && msg.id.length > 0, 'id must be a non-empty string');
    assert(typeof msg.ts === 'string', 'ts must be a string');
    assert.strictEqual(msg.platform, 'api');
    assert(msg.payload, 'payload must exist');
    assert.strictEqual(msg.payload.worldId, localConfig.worldId);
    assert.strictEqual(msg.payload.worldName, localConfig.worldName);
    assert.strictEqual(msg.payload.endpoint, localConfig.endpoint);
    assert.strictEqual(msg.payload.protocolVersion, localConfig.protocolVersion);
  });

  test('announce() payload contains required federation fields', function() {
    var msg = Federation.announce(localConfig);
    var p = msg.payload;
    assert(p.worldId, 'worldId required');
    assert(p.worldName, 'worldName required');
    assert(p.endpoint, 'endpoint required');
    assert(typeof p.protocolVersion === 'number', 'protocolVersion must be number');
  });

  test('handleAnnounce() accepts compatible announcement', function() {
    var announceMsg = Federation.announce(remoteConfig);
    var result = Federation.handleAnnounce(announceMsg);
    assert.strictEqual(result.accept, true);
  });

  test('handleAnnounce() rejects announcement with incompatible protocol version', function() {
    var incompatibleConfig = Object.assign({}, remoteConfig, { protocolVersion: 99 });
    var announceMsg = Federation.announce(incompatibleConfig);
    var result = Federation.handleAnnounce(announceMsg);
    assert.strictEqual(result.accept, false);
    assert(result.reason, 'must include a reason when rejecting');
  });

  test('handleAnnounce() rejects self-connection (same worldId)', function() {
    var selfMsg = Federation.announce(localConfig);
    // localConfig worldId matches — set local world so self is detected
    var result = Federation.handleAnnounce(selfMsg, localConfig.worldId);
    assert.strictEqual(result.accept, false);
    assert(/self/i.test(result.reason), 'reason should mention self-connection');
  });

});


// ─── Suite: Handshake ─────────────────────────────────────────────────────────

suite('Federation: Handshake', function() {

  test('handshake() generates a federation_handshake message', function() {
    var msg = Federation.handshake('zion-fork-aurora', localConfig, remoteConfig);
    assert.strictEqual(msg.type, 'federation_handshake');
    assert.strictEqual(msg.payload.worldId, localConfig.worldId);
    assert.strictEqual(msg.payload.targetWorldId, 'zion-fork-aurora');
    assert(msg.payload.accepted === true, 'accepted must be true');
  });

  test('handshake() payload includes local world details', function() {
    var msg = Federation.handshake('zion-fork-aurora', localConfig, remoteConfig);
    assert.strictEqual(msg.payload.worldName, localConfig.worldName);
    assert.strictEqual(msg.payload.endpoint, localConfig.endpoint);
    assert.strictEqual(msg.payload.protocolVersion, localConfig.protocolVersion);
  });

  test('handleHandshake() creates a connection object on success', function() {
    var hsMsg = Federation.handshake('zion-fork-aurora', remoteConfig, localConfig);
    var conn = Federation.handleHandshake(hsMsg, localConfig);
    assert(conn, 'connection must be returned');
    assert.strictEqual(conn.worldId, remoteConfig.worldId);
    assert.strictEqual(conn.worldName, remoteConfig.worldName);
    assert.strictEqual(conn.status, 'active');
    assert(conn.connectedSince, 'connectedSince must be set');
  });

  test('handleHandshake() returns null when not accepted', function() {
    var hsMsg = Federation.handshake('zion-fork-aurora', remoteConfig, localConfig);
    hsMsg.payload.accepted = false;
    var conn = Federation.handleHandshake(hsMsg, localConfig);
    assert.strictEqual(conn, null);
  });

  test('two-way handshake creates matching connections on both sides', function() {
    // A sends announce, B accepts and sends handshake
    var announceA = Federation.announce(localConfig);
    var acceptResultB = Federation.handleAnnounce(announceA);
    assert.strictEqual(acceptResultB.accept, true);

    var hsFromB = Federation.handshake(localConfig.worldId, remoteConfig, localConfig);
    var connOnA = Federation.handleHandshake(hsFromB, localConfig);

    assert(connOnA, 'A must have a connection');
    assert.strictEqual(connOnA.worldId, remoteConfig.worldId);
    assert.strictEqual(connOnA.status, 'active');
  });

});


// ─── Suite: Connection Management ────────────────────────────────────────────

suite('Federation: Connection Management', function() {

  test('getConnections() returns an array', function() {
    var conns = Federation.getConnections();
    assert(Array.isArray(conns), 'must be an array');
  });

  test('isConnected() returns false for unknown world', function() {
    var result = Federation.isConnected('zion-nonexistent');
    assert.strictEqual(result, false);
  });

  test('connect() adds a connection to the registry', function() {
    // Start fresh for this test
    var connObj = {
      worldId: remoteConfig.worldId,
      worldName: remoteConfig.worldName,
      endpoint: remoteConfig.endpoint,
      protocolVersion: remoteConfig.protocolVersion,
      status: 'active',
      connectedSince: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString(),
      playerCount: 0,
      latency: 0
    };
    Federation.connect(connObj);
    assert.strictEqual(Federation.isConnected(remoteConfig.worldId), true);
  });

  test('disconnect() generates a disconnect message and updates status', function() {
    // Ensure connected first
    var connObj = {
      worldId: 'zion-fork-beta',
      worldName: 'Beta',
      endpoint: 'https://beta.example.com',
      protocolVersion: 1,
      status: 'active',
      connectedSince: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString(),
      playerCount: 0,
      latency: 0
    };
    Federation.connect(connObj);
    var msg = Federation.disconnect('zion-fork-beta');
    assert(msg, 'disconnect must return a message');
    assert.strictEqual(msg.type, 'leave');
    assert.strictEqual(Federation.isConnected('zion-fork-beta'), false);
  });

  test('getConnections() lists active connections with required fields', function() {
    var conns = Federation.getConnections();
    // At minimum should have what we connected above
    conns.forEach(function(c) {
      assert(c.worldId, 'worldId required');
      assert(c.worldName, 'worldName required');
      assert(c.status, 'status required');
      assert(typeof c.playerCount === 'number', 'playerCount must be number');
      assert(typeof c.latency === 'number', 'latency must be number');
    });
  });

  test('connect() ignores duplicate connections (same worldId)', function() {
    var countBefore = Federation.getConnections().length;
    var connObj = {
      worldId: remoteConfig.worldId,   // already connected above
      worldName: remoteConfig.worldName,
      endpoint: remoteConfig.endpoint,
      protocolVersion: 1,
      status: 'active',
      connectedSince: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString(),
      playerCount: 5,
      latency: 42
    };
    Federation.connect(connObj);
    var countAfter = Federation.getConnections().length;
    // Should update in place, not add a duplicate
    assert.strictEqual(countAfter, countBefore);
  });

});


// ─── Suite: Cross-World Travel (§10.3) ───────────────────────────────────────

suite('Federation: Cross-World Travel', function() {

  test('warpToFork() returns a message and travelPack', function() {
    var result = Federation.warpToFork(remoteConfig.worldId, samplePlayer);
    assert(result.message, 'must return a message');
    assert(result.travelPack, 'must return a travelPack');
  });

  test('warpToFork() message is warp_fork type', function() {
    var result = Federation.warpToFork(remoteConfig.worldId, samplePlayer);
    assert.strictEqual(result.message.type, 'warp_fork');
    assert.strictEqual(result.message.payload.fork_id, remoteConfig.worldId);
  });

  test('travelPack includes identity (username)', function() {
    var result = Federation.warpToFork(remoteConfig.worldId, samplePlayer);
    assert.strictEqual(result.travelPack.username, samplePlayer.username);
    assert.strictEqual(result.travelPack.homeWorld, samplePlayer.homeWorld);
  });

  test('travelPack includes reputation (read-only marker)', function() {
    var result = Federation.warpToFork(remoteConfig.worldId, samplePlayer);
    assert.strictEqual(result.travelPack.reputation, samplePlayer.reputation);
  });

  test('travelPack includes appearance and cosmetics', function() {
    var result = Federation.warpToFork(remoteConfig.worldId, samplePlayer);
    assert.deepStrictEqual(result.travelPack.appearance, samplePlayer.appearance);
  });

  test('travelPack includes intentions', function() {
    var result = Federation.warpToFork(remoteConfig.worldId, samplePlayer);
    assert(Array.isArray(result.travelPack.intentions), 'intentions must be array');
    assert.strictEqual(result.travelPack.intentions.length, samplePlayer.intentions.length);
  });

  test('travelPack includes skills (knowledge is universal)', function() {
    var result = Federation.warpToFork(remoteConfig.worldId, samplePlayer);
    assert(Array.isArray(result.travelPack.skills), 'skills must be array');
  });

  test('travelPack EXCLUDES inventory (items are world-bound)', function() {
    var result = Federation.warpToFork(remoteConfig.worldId, samplePlayer);
    assert(!result.travelPack.inventory, 'inventory must NOT travel');
  });

  test('travelPack EXCLUDES spark (currency is sovereign)', function() {
    var result = Federation.warpToFork(remoteConfig.worldId, samplePlayer);
    assert(result.travelPack.spark === undefined || result.travelPack.spark === null, 'spark must NOT travel');
  });

  test('travelPack EXCLUDES gardens (rooted in home world)', function() {
    var result = Federation.warpToFork(remoteConfig.worldId, samplePlayer);
    assert(!result.travelPack.gardens, 'gardens must NOT travel');
  });

  test('travelPack EXCLUDES structures (rooted in home world)', function() {
    var result = Federation.warpToFork(remoteConfig.worldId, samplePlayer);
    assert(!result.travelPack.structures, 'structures must NOT travel');
  });

  test('travelPack EXCLUDES steward status (governance is local)', function() {
    var result = Federation.warpToFork(remoteConfig.worldId, samplePlayer);
    assert(!result.travelPack.isSteward, 'steward status must NOT travel');
  });

  test('arriveFromFork() creates valid visitor player state', function() {
    var result = Federation.warpToFork(remoteConfig.worldId, samplePlayer);
    var visitor = Federation.arriveFromFork(result.travelPack);
    assert(visitor, 'visitor state must be returned');
    assert.strictEqual(visitor.username, samplePlayer.username);
    assert.strictEqual(visitor.homeWorld, samplePlayer.homeWorld);
    assert.strictEqual(visitor.isVisitor, true);
    assert(visitor.arrivedAt, 'arrivedAt must be set');
  });

  test('arriveFromFork() visitor has empty inventory in visited world', function() {
    var result = Federation.warpToFork(remoteConfig.worldId, samplePlayer);
    var visitor = Federation.arriveFromFork(result.travelPack);
    assert(Array.isArray(visitor.inventory), 'inventory must be an array');
    assert.strictEqual(visitor.inventory.length, 0, 'inventory must be empty on arrival');
  });

  test('arriveFromFork() visitor starts in nexus', function() {
    var result = Federation.warpToFork(remoteConfig.worldId, samplePlayer);
    var visitor = Federation.arriveFromFork(result.travelPack);
    assert.strictEqual(visitor.position.zone, 'nexus');
  });

  test('returnHome() generates a return_home message', function() {
    var msg = Federation.returnHome(samplePlayer);
    assert.strictEqual(msg.type, 'return_home');
    assert.strictEqual(msg.from, samplePlayer.username);
    assert(msg.payload.homeWorld, 'homeWorld must be in payload');
  });

});


// ─── Suite: Visitor Management (§10.4) ───────────────────────────────────────

suite('Federation: Visitor Management', function() {

  test('getVisitors() returns an array', function() {
    var visitors = Federation.getVisitors();
    assert(Array.isArray(visitors), 'must be an array');
  });

  test('getVisiting() returns an array', function() {
    var visiting = Federation.getVisiting();
    assert(Array.isArray(visiting), 'must be an array');
  });

  test('visitor record has required fields', function() {
    var result = Federation.warpToFork(remoteConfig.worldId, samplePlayer);
    var visitor = Federation.arriveFromFork(result.travelPack);
    // Register visitor
    Federation.registerVisitor(visitor);
    var visitors = Federation.getVisitors();
    var found = visitors.find(function(v) { return v.username === samplePlayer.username; });
    assert(found, 'visitor must be registered');
    assert(found.username, 'username required');
    assert(found.homeWorld, 'homeWorld required');
    assert(found.arrivedAt, 'arrivedAt required');
  });

});


// ─── Suite: Rift Portal (§10.5) ──────────────────────────────────────────────

suite('Federation: Rift Portal', function() {

  test('createRiftPortal() returns portal data with required display fields', function() {
    var conn = {
      worldId: remoteConfig.worldId,
      worldName: remoteConfig.worldName,
      endpoint: remoteConfig.endpoint,
      status: 'active',
      playerCount: 23,
      latency: 55,
      description: 'A shimmering gateway to Aurora.'
    };
    var portal = Federation.createRiftPortal(conn);
    assert(portal, 'portal must be returned');
    assert(portal.worldName, 'worldName required');
    assert(typeof portal.playerCount === 'number', 'playerCount must be number');
    assert(typeof portal.latency === 'number', 'latency must be number');
    assert(portal.description !== undefined, 'description required');
    assert(portal.position, 'position required');
  });

  test('createRiftPortal() position is in nexus zone', function() {
    var conn = {
      worldId: remoteConfig.worldId,
      worldName: remoteConfig.worldName,
      endpoint: remoteConfig.endpoint,
      status: 'active',
      playerCount: 5,
      latency: 30,
      description: 'Test portal'
    };
    var portal = Federation.createRiftPortal(conn);
    assert.strictEqual(portal.position.zone, 'nexus');
  });

  test('createRiftPortal() includes connection health (latency indicator)', function() {
    var conn = {
      worldId: remoteConfig.worldId,
      worldName: remoteConfig.worldName,
      endpoint: remoteConfig.endpoint,
      status: 'active',
      playerCount: 7,
      latency: 120,
      description: ''
    };
    var portal = Federation.createRiftPortal(conn);
    assert(portal.healthy !== undefined, 'healthy/health indicator required');
  });

  test('updateRiftPortal() updates portal data from connection', function() {
    var conn = {
      worldId: remoteConfig.worldId,
      worldName: remoteConfig.worldName,
      endpoint: remoteConfig.endpoint,
      status: 'active',
      playerCount: 99,
      latency: 10,
      description: 'Updated'
    };
    var portal = Federation.updateRiftPortal(conn);
    assert.strictEqual(portal.playerCount, 99);
    assert.strictEqual(portal.latency, 10);
  });

});


// ─── Suite: Registry (§10.7) ─────────────────────────────────────────────────

suite('Federation: Registry', function() {

  test('loadRegistry() parses federation JSON correctly', function() {
    var registry = Federation.loadRegistry(federationJson);
    assert(registry, 'registry must be returned');
    assert(Array.isArray(registry.federations), 'federations must be array');
    assert.strictEqual(registry.worldId, federationJson.worldId);
  });

  test('loadRegistry() returns federations with all required fields', function() {
    var registry = Federation.loadRegistry(federationJson);
    registry.federations.forEach(function(f) {
      assert(f.worldId, 'worldId required');
      assert(f.worldName, 'worldName required');
      assert(f.endpoint, 'endpoint required');
      assert(f.status, 'status required');
    });
  });

  test('updateRegistry() merges active connections into JSON shape', function() {
    var conns = [
      {
        worldId: 'zion-fork-aurora',
        worldName: 'Aurora',
        endpoint: 'https://aurora-zion.github.io',
        protocolVersion: 1,
        status: 'active',
        connectedSince: '2026-01-01T00:00:00Z',
        lastHeartbeat: new Date().toISOString(),
        playerCount: 42,
        latency: 60
      }
    ];
    var updated = Federation.updateRegistry(conns);
    assert(Array.isArray(updated.federations), 'federations must be array');
    assert.strictEqual(updated.federations[0].worldId, 'zion-fork-aurora');
    assert.strictEqual(updated.federations[0].playerCount, 42);
  });

  test('getActiveWorlds() returns worlds with active status', function() {
    var worlds = Federation.getActiveWorlds();
    assert(Array.isArray(worlds), 'must be array');
    worlds.forEach(function(w) {
      assert.strictEqual(w.status, 'active');
      assert(w.worldId, 'worldId required');
      assert(w.worldName, 'worldName required');
      assert(w.endpoint, 'endpoint required');
    });
  });

  test('Registry serializes to valid JSON', function() {
    var conns = Federation.getConnections();
    var updated = Federation.updateRegistry(conns);
    var json = JSON.stringify(updated);
    var parsed = JSON.parse(json);
    assert.deepStrictEqual(parsed, updated);
  });

});


// ─── Suite: Protocol Validation (§10.8) ──────────────────────────────────────

suite('Federation: Protocol Validation', function() {

  test('validateProtocolVersion() passes when versions match', function() {
    var result = Federation.validateProtocolVersion(1, 1);
    assert.strictEqual(result.compatible, true);
  });

  test('validateProtocolVersion() passes when remote is same major version', function() {
    var result = Federation.validateProtocolVersion(1, 1);
    assert.strictEqual(result.compatible, true);
  });

  test('validateProtocolVersion() fails when versions differ', function() {
    var result = Federation.validateProtocolVersion(1, 2);
    assert.strictEqual(result.compatible, false);
    assert(result.reason, 'reason must be provided');
  });

  test('validateProtocolVersion() fails for version 0 or below', function() {
    var result = Federation.validateProtocolVersion(1, 0);
    assert.strictEqual(result.compatible, false);
  });

  test('validateFederationRequest() accepts valid announce message', function() {
    var msg = Federation.announce(remoteConfig);
    var result = Federation.validateFederationRequest(msg, localConfig);
    assert.strictEqual(result.valid, true);
  });

  test('validateFederationRequest() rejects non-federation message type', function() {
    var msg = {
      v: 1, id: 'abc', ts: new Date().toISOString(), seq: 0,
      from: 'aurora-admin', type: 'join', platform: 'api',
      position: { x: 0, y: 0, z: 0, zone: 'nexus' }, geo: null,
      payload: { worldId: 'zion-fork-aurora' }
    };
    var result = Federation.validateFederationRequest(msg, localConfig);
    assert.strictEqual(result.valid, false);
  });

  test('validateFederationRequest() rejects message missing worldId in payload', function() {
    var msg = Federation.announce(remoteConfig);
    delete msg.payload.worldId;
    var result = Federation.validateFederationRequest(msg, localConfig);
    assert.strictEqual(result.valid, false);
  });

});


// ─── Suite: Edge Cases ────────────────────────────────────────────────────────

suite('Federation: Edge Cases', function() {

  test('disconnect() on unknown world returns null gracefully', function() {
    var result = Federation.disconnect('zion-nonexistent-world');
    // Should not throw; returns null or a no-op message
    assert(result === null || result === undefined || typeof result === 'object');
  });

  test('self-connection is rejected by handshake', function() {
    var selfHandshake = Federation.handshake(localConfig.worldId, localConfig, localConfig);
    var conn = Federation.handleHandshake(selfHandshake, localConfig);
    // Should either refuse or flag accepted=false
    // The handshake to yourself should not create a real connection
    // We check: if conn is returned, it should have isValid false OR conn is null
    if (conn !== null) {
      // If handleHandshake doesn't block it, wiring must block self-connect
      assert(conn.worldId !== localConfig.worldId || conn.status !== 'active',
        'self-connection must not become active');
    }
  });

  test('warpToFork() to unknown world still returns valid message', function() {
    var result = Federation.warpToFork('zion-unknown-fork', samplePlayer);
    assert(result.message, 'must return a message even for unknown world');
    assert.strictEqual(result.message.type, 'warp_fork');
  });

  test('arriveFromFork() with minimal travelPack does not throw', function() {
    var minimalPack = { username: 'ghost', homeWorld: 'zion-fork-alpha', reputation: 0, appearance: {}, intentions: [], skills: [] };
    var visitor = Federation.arriveFromFork(minimalPack);
    assert(visitor, 'visitor state must be returned');
    assert.strictEqual(visitor.username, 'ghost');
  });

  test('Federation state is fully serializable to JSON', function() {
    var state = Federation.getState();
    var json = JSON.stringify(state);
    var parsed = JSON.parse(json);
    assert.deepStrictEqual(parsed, state);
  });

  test('handleAnnounce() with null message returns reject', function() {
    var result = Federation.handleAnnounce(null);
    assert.strictEqual(result.accept, false);
  });

  test('getConnections() excludes disconnected worlds', function() {
    // Connect then disconnect a world
    var tempConn = {
      worldId: 'zion-temp-world',
      worldName: 'Temp',
      endpoint: 'https://temp.example.com',
      protocolVersion: 1,
      status: 'active',
      connectedSince: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString(),
      playerCount: 0,
      latency: 0
    };
    Federation.connect(tempConn);
    Federation.disconnect('zion-temp-world');
    var conns = Federation.getConnections();
    var found = conns.find(function(c) { return c.worldId === 'zion-temp-world'; });
    assert(!found, 'disconnected world must not appear in active connections');
  });

});


// ─── Run ─────────────────────────────────────────────────────────────────────

var success = report();
process.exit(success ? 0 : 1);
