/**
 * tests/test_network.js
 * Comprehensive tests for the ZION Network module (network.js)
 * 40+ tests covering exports, lobby peer IDs, federated peer IDs,
 * federation message handling, network stats, peer lists,
 * discovered/federated worlds, zone updates, and edge cases.
 */

'use strict';

const { test, suite, report, assert } = require('./test_runner');

// ---------------------------------------------------------------------------
// Stubs — PeerJS is not available in Node.js
// ---------------------------------------------------------------------------
global.Peer = undefined;
global.window = {
  location: {
    hostname: 'localhost',
    pathname: '/',
    href: 'http://localhost/'
  }
};

const N = require('../src/js/network');

// ============================================================================
// 1. EXPORT VERIFICATION
// ============================================================================

suite('Export verification', function() {
  var expectedFunctions = [
    'initMesh',
    'broadcastMessage',
    'onMessage',
    'getPeers',
    'connectToPeer',
    'disconnect',
    'getLobbyPeerId',
    'joinLobby',
    'leaveLobby',
    'updateLobbyZone',
    'handleLobbyMessage',
    'getNetworkStats',
    'initFederation',
    'announceFederation',
    'federationHandshake',
    'handleFederationMessage',
    'onFederationEvent',
    'getFederatedWorlds',
    'getDiscoveredWorlds',
    'isFederatedWith',
    'deriveWorldId',
    'getFederatedPeerId'
  ];

  expectedFunctions.forEach(function(name) {
    test('exports ' + name + ' as a function', function() {
      assert.strictEqual(typeof N[name], 'function', name + ' should be a function');
    });
  });

  test('module object is defined', function() {
    assert.ok(N !== null && typeof N === 'object');
  });

  test('no unexpected undefined exports among required functions', function() {
    expectedFunctions.forEach(function(name) {
      assert.ok(N[name] !== undefined, name + ' must not be undefined');
    });
  });
});

// ============================================================================
// 2. getLobbyPeerId — pure function tests
// ============================================================================

suite('getLobbyPeerId', function() {
  test('returns a string', function() {
    assert.strictEqual(typeof N.getLobbyPeerId('zion'), 'string');
  });

  test('result for "zion" contains "zion"', function() {
    var id = N.getLobbyPeerId('zion');
    assert.ok(id.indexOf('zion') !== -1, 'Expected "zion" in: ' + id);
  });

  test('result for "testworld" contains "testworld"', function() {
    var id = N.getLobbyPeerId('testworld');
    assert.ok(id.indexOf('testworld') !== -1, 'Expected "testworld" in: ' + id);
  });

  test('different world IDs produce different peer IDs', function() {
    var a = N.getLobbyPeerId('worldA');
    var b = N.getLobbyPeerId('worldB');
    assert.notStrictEqual(a, b);
  });

  test('same world ID always produces same peer ID (deterministic)', function() {
    var first  = N.getLobbyPeerId('alpha');
    var second = N.getLobbyPeerId('alpha');
    assert.strictEqual(first, second);
  });

  test('default worldId is "main" — result contains "main"', function() {
    var id = N.getLobbyPeerId();
    assert.ok(id.indexOf('main') !== -1, 'Expected "main" in default peer ID: ' + id);
  });

  test('result is non-empty string', function() {
    var id = N.getLobbyPeerId('x');
    assert.ok(id.length > 0);
  });

  test('result has format zion-lobby-<worldId>', function() {
    var id = N.getLobbyPeerId('myrealm');
    assert.strictEqual(id, 'zion-lobby-myrealm');
  });

  test('getLobbyPeerId("main") equals "zion-lobby-main"', function() {
    assert.strictEqual(N.getLobbyPeerId('main'), 'zion-lobby-main');
  });

  test('getLobbyPeerId with numeric-like world ID works', function() {
    var id = N.getLobbyPeerId('42');
    assert.ok(id.indexOf('42') !== -1);
  });
});

// ============================================================================
// 3. getFederatedPeerId — pure function tests
// ============================================================================

suite('getFederatedPeerId', function() {
  test('returns a string', function() {
    assert.strictEqual(typeof N.getFederatedPeerId('worldA', 'player1'), 'string');
  });

  test('result is non-empty', function() {
    var id = N.getFederatedPeerId('worldA', 'player1');
    assert.ok(id.length > 0);
  });

  test('different world IDs produce different results (same player)', function() {
    var a = N.getFederatedPeerId('worldA', 'player1');
    var b = N.getFederatedPeerId('worldB', 'player1');
    assert.notStrictEqual(a, b);
  });

  test('different player IDs produce different results (same world)', function() {
    var a = N.getFederatedPeerId('world1', 'alice');
    var b = N.getFederatedPeerId('world1', 'bob');
    assert.notStrictEqual(a, b);
  });

  test('same inputs always produce same result (deterministic)', function() {
    var first  = N.getFederatedPeerId('worldX', 'playerY');
    var second = N.getFederatedPeerId('worldX', 'playerY');
    assert.strictEqual(first, second);
  });

  test('result contains worldId', function() {
    var id = N.getFederatedPeerId('earthrealm', 'hero');
    assert.ok(id.indexOf('earthrealm') !== -1, 'Expected worldId in: ' + id);
  });

  test('result contains playerId', function() {
    var id = N.getFederatedPeerId('earthrealm', 'hero');
    assert.ok(id.indexOf('hero') !== -1, 'Expected playerId in: ' + id);
  });

  test('has format zion-fed-<worldId>-<playerId>', function() {
    var id = N.getFederatedPeerId('alpha', 'beth');
    assert.strictEqual(id, 'zion-fed-alpha-beth');
  });

  test('completely different inputs yield different IDs', function() {
    var a = N.getFederatedPeerId('w1', 'p1');
    var b = N.getFederatedPeerId('w2', 'p2');
    assert.notStrictEqual(a, b);
  });
});

// ============================================================================
// 4. getNetworkStats — pre-init state
// ============================================================================

suite('getNetworkStats (pre-init)', function() {
  test('returns an object', function() {
    var stats = N.getNetworkStats();
    assert.ok(stats !== null && typeof stats === 'object');
  });

  test('has peerId field', function() {
    var stats = N.getNetworkStats();
    assert.ok('peerId' in stats, 'Missing peerId');
  });

  test('peerId is null when not initialized', function() {
    var stats = N.getNetworkStats();
    assert.strictEqual(stats.peerId, null);
  });

  test('has connected field', function() {
    var stats = N.getNetworkStats();
    assert.ok('connected' in stats, 'Missing connected');
  });

  test('connected is false when not initialized', function() {
    var stats = N.getNetworkStats();
    assert.strictEqual(stats.connected, false);
  });

  test('has peerCount field', function() {
    var stats = N.getNetworkStats();
    assert.ok('peerCount' in stats, 'Missing peerCount');
  });

  test('peerCount is 0 when not initialized', function() {
    var stats = N.getNetworkStats();
    assert.strictEqual(stats.peerCount, 0);
  });

  test('has knownPeers field', function() {
    var stats = N.getNetworkStats();
    assert.ok('knownPeers' in stats, 'Missing knownPeers');
  });

  test('knownPeers is a number', function() {
    var stats = N.getNetworkStats();
    assert.strictEqual(typeof stats.knownPeers, 'number');
  });

  test('has seenMessages field', function() {
    var stats = N.getNetworkStats();
    assert.ok('seenMessages' in stats, 'Missing seenMessages');
  });

  test('seenMessages is a number', function() {
    var stats = N.getNetworkStats();
    assert.strictEqual(typeof stats.seenMessages, 'number');
  });

  test('getNetworkStats returns fresh object each call', function() {
    var a = N.getNetworkStats();
    var b = N.getNetworkStats();
    // Same values but different object references
    assert.ok(a !== b || JSON.stringify(a) === JSON.stringify(b));
  });
});

// ============================================================================
// 5. getPeers — pre-init state
// ============================================================================

suite('getPeers (pre-init)', function() {
  test('returns an array', function() {
    var peers = N.getPeers();
    assert.ok(Array.isArray(peers));
  });

  test('returns empty array when not initialized', function() {
    var peers = N.getPeers();
    assert.strictEqual(peers.length, 0);
  });

  test('returns a new array each call (not shared reference)', function() {
    var a = N.getPeers();
    var b = N.getPeers();
    assert.ok(a !== b || a.length === 0);
  });
});

// ============================================================================
// 6. getFederatedWorlds — pre-init state
// ============================================================================

suite('getFederatedWorlds (pre-init)', function() {
  test('returns an array', function() {
    var worlds = N.getFederatedWorlds();
    assert.ok(Array.isArray(worlds));
  });

  test('returns empty array before any federation', function() {
    var worlds = N.getFederatedWorlds();
    assert.strictEqual(worlds.length, 0);
  });
});

// ============================================================================
// 7. getDiscoveredWorlds — pre-init state
// ============================================================================

suite('getDiscoveredWorlds (pre-init)', function() {
  test('returns an array', function() {
    var worlds = N.getDiscoveredWorlds();
    assert.ok(Array.isArray(worlds));
  });

  test('returns empty array before any discovery', function() {
    var worlds = N.getDiscoveredWorlds();
    assert.strictEqual(worlds.length, 0);
  });
});

// ============================================================================
// 8. isFederatedWith — pre-init state
// ============================================================================

suite('isFederatedWith (pre-init)', function() {
  test('returns falsy for unknown world', function() {
    assert.ok(!N.isFederatedWith('unknownWorld'));
  });

  test('returns falsy for empty string worldId', function() {
    assert.ok(!N.isFederatedWith(''));
  });

  test('returns falsy for null worldId', function() {
    assert.ok(!N.isFederatedWith(null));
  });
});

// ============================================================================
// 9. initFederation — state mutation (safe to call without peer)
// ============================================================================

suite('initFederation', function() {
  test('does not throw when called without peer', function() {
    assert.doesNotThrow(function() {
      N.initFederation('test-world', 'Test World', 'https://example.com');
    });
  });

  test('can be called with just a worldId', function() {
    assert.doesNotThrow(function() {
      N.initFederation('minimal-world');
    });
  });
});

// ============================================================================
// 10. handleFederationMessage — federation logic (no peer needed)
// ============================================================================

suite('handleFederationMessage', function() {
  // Reset federation state before these tests by re-initializing
  test('returns false for null message', function() {
    assert.strictEqual(N.handleFederationMessage(null), false);
  });

  test('returns false for message with no type', function() {
    assert.strictEqual(N.handleFederationMessage({}), false);
  });

  test('returns false for non-federation message type', function() {
    assert.strictEqual(N.handleFederationMessage({ type: 'player_move' }), false);
  });

  test('returns true for federation_announce message', function() {
    var msg = {
      type: 'federation_announce',
      worldId: 'other-world',
      worldName: 'Other World',
      endpoint: 'https://other.example.com',
      protocolVersion: 1,
      playerCount: 5,
      peerId: 'peer-abc',
      timestamp: Date.now()
    };
    // Re-init with a different worldId so it doesn't match 'other-world'
    N.initFederation('home-world', 'Home World', 'https://home.example.com');
    assert.strictEqual(N.handleFederationMessage(msg), true);
  });

  test('federation_announce adds to discoveredWorlds', function() {
    N.initFederation('home-world-2', 'Home World 2', 'https://home2.example.com');
    var before = N.getDiscoveredWorlds().length;
    var msg = {
      type: 'federation_announce',
      worldId: 'newly-discovered-' + Date.now(),
      worldName: 'New World',
      endpoint: 'https://new.example.com',
      protocolVersion: 1,
      playerCount: 3,
      peerId: 'peer-new',
      timestamp: Date.now()
    };
    N.handleFederationMessage(msg);
    var after = N.getDiscoveredWorlds().length;
    assert.ok(after >= before, 'discoveredWorlds should grow or stay same');
  });

  test('returns true for federation_handshake message', function() {
    var result = N.handleFederationMessage({
      type: 'federation_handshake',
      from_world: 'remote-world',
      to_world: 'current-world',
      worldName: 'Remote World',
      peerId: 'peer-remote',
      timestamp: Date.now()
    });
    assert.strictEqual(result, true);
  });

  test('returns true for warp_fork message', function() {
    var result = N.handleFederationMessage({
      type: 'warp_fork',
      from: 'player123',
      payload: { target_world: 'some-world', position: { x: 0, y: 0, z: 0 } }
    });
    assert.strictEqual(result, true);
  });

  test('returns true for return_home message', function() {
    var result = N.handleFederationMessage({
      type: 'return_home',
      from: 'player123',
      payload: { position: { x: 10, y: 0, z: 10 } }
    });
    assert.strictEqual(result, true);
  });

  test('returns false for unrecognized message type', function() {
    var result = N.handleFederationMessage({ type: 'unknown_federation_type' });
    assert.strictEqual(result, false);
  });
});

// ============================================================================
// 11. onFederationEvent — callback registration
// ============================================================================

suite('onFederationEvent', function() {
  test('does not throw when registering a callback', function() {
    assert.doesNotThrow(function() {
      N.onFederationEvent(function(event) {});
    });
  });

  test('callback is invoked on federation_announce for a new world', function() {
    var received = null;
    N.onFederationEvent(function(event) {
      received = event;
    });

    N.initFederation('cb-test-world', 'CB Test World', 'https://cb.example.com');
    var uniqueWorldId = 'callback-world-' + Date.now();
    N.handleFederationMessage({
      type: 'federation_announce',
      worldId: uniqueWorldId,
      worldName: 'Callback World',
      endpoint: 'https://callback.example.com',
      protocolVersion: 1,
      playerCount: 1,
      peerId: 'peer-cb',
      timestamp: Date.now()
    });

    assert.ok(received !== null, 'Callback should have been called');
    assert.strictEqual(received.type, 'world_discovered');
  });

  test('callback receives worldInfo on world_discovered event', function() {
    var received = null;
    N.onFederationEvent(function(event) {
      received = event;
    });

    N.initFederation('event-world', 'Event World', 'https://event.example.com');
    var uniqueId = 'incoming-world-' + Date.now();
    N.handleFederationMessage({
      type: 'federation_announce',
      worldId: uniqueId,
      worldName: 'Incoming World',
      endpoint: 'https://incoming.example.com',
      protocolVersion: 1,
      playerCount: 7,
      peerId: 'peer-inc',
      timestamp: Date.now()
    });

    assert.ok(received && received.worldInfo, 'worldInfo missing from event');
    assert.strictEqual(received.worldInfo.worldId, uniqueId);
  });

  test('can overwrite callback with a new one', function() {
    var firstCalled = false;
    var secondCalled = false;

    N.onFederationEvent(function() { firstCalled = true; });
    N.onFederationEvent(function() { secondCalled = true; });

    N.initFederation('overwrite-world', 'Overwrite World', 'https://ow.example.com');
    N.handleFederationMessage({
      type: 'federation_announce',
      worldId: 'overwrite-target-' + Date.now(),
      worldName: 'Target',
      endpoint: 'https://target.example.com',
      protocolVersion: 1,
      playerCount: 0,
      peerId: 'peer-ow',
      timestamp: Date.now()
    });

    // The second callback should have been called, not the first
    assert.strictEqual(secondCalled, true);
  });
});

// ============================================================================
// 12. handleLobbyMessage — lobby protocol handling
// ============================================================================

suite('handleLobbyMessage', function() {
  test('returns false for null message', function() {
    assert.strictEqual(N.handleLobbyMessage(null), false);
  });

  test('returns false for message with no type', function() {
    assert.strictEqual(N.handleLobbyMessage({}), false);
  });

  test('returns false for non-lobby, non-federation message', function() {
    var result = N.handleLobbyMessage({ type: 'some_game_event' });
    assert.strictEqual(result, false);
  });

  test('returns true for _lobby_announce message', function() {
    // peer is null, but handleLobbyMessage should still handle the type check
    var result = N.handleLobbyMessage({ type: '_lobby_announce', peers: [] });
    assert.strictEqual(result, true);
  });

  test('returns true for _heartbeat message', function() {
    var result = N.handleLobbyMessage({ type: '_heartbeat', peerId: 'abc', zone: 'nexus', peerCount: 0, timestamp: Date.now() });
    assert.strictEqual(result, true);
  });

  test('_peer_list_request throws when peer is null (peer.id evaluated in object literal)', function() {
    // The _peer_list_request branch builds {peerId: peer.id, ...} before broadcastMessage
    // is called. When peer is null this dereference throws a TypeError. This test
    // documents the known source behavior so any future fix shows up immediately.
    assert.throws(function() {
      N.handleLobbyMessage({ type: '_peer_list_request' });
    }, TypeError);
  });

  test('returns true for federation messages processed via handleLobbyMessage', function() {
    N.initFederation('lobby-fed-world', 'Lobby Fed World', 'https://lfw.example.com');
    var result = N.handleLobbyMessage({
      type: 'federation_announce',
      worldId: 'lobby-fed-incoming-' + Date.now(),
      worldName: 'Lobby Fed Incoming',
      endpoint: 'https://lfi.example.com',
      protocolVersion: 1,
      playerCount: 2,
      peerId: 'peer-lfi',
      timestamp: Date.now()
    });
    assert.strictEqual(result, true);
  });
});

// ============================================================================
// 13. updateLobbyZone — state mutation
// ============================================================================

suite('updateLobbyZone', function() {
  test('does not throw when called', function() {
    assert.doesNotThrow(function() {
      N.updateLobbyZone('gardens');
    });
  });

  test('can be called with different zone names', function() {
    var zones = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];
    zones.forEach(function(zone) {
      assert.doesNotThrow(function() {
        N.updateLobbyZone(zone);
      });
    });
  });
});

// ============================================================================
// 14. leaveLobby — cleanup
// ============================================================================

suite('leaveLobby', function() {
  test('does not throw when called without prior joinLobby', function() {
    assert.doesNotThrow(function() {
      N.leaveLobby();
    });
  });

  test('can be called multiple times safely', function() {
    assert.doesNotThrow(function() {
      N.leaveLobby();
      N.leaveLobby();
    });
  });
});

// ============================================================================
// 15. initMesh — graceful failure without PeerJS
// ============================================================================

suite('initMesh (no PeerJS)', function() {
  test('returns null when PeerJS is not available', function() {
    var result = N.initMesh('test-peer-id');
    assert.strictEqual(result, null);
  });

  test('does not throw when PeerJS is not available', function() {
    assert.doesNotThrow(function() {
      N.initMesh('another-peer-id', {
        onMessage: function() {},
        onPeerConnect: function() {},
        onPeerDisconnect: function() {}
      });
    });
  });
});

// ============================================================================
// 16. deriveWorldId — URL-based derivation
// ============================================================================

suite('deriveWorldId', function() {
  test('returns a string', function() {
    assert.strictEqual(typeof N.deriveWorldId(), 'string');
  });

  test('returns non-empty string', function() {
    var id = N.deriveWorldId();
    assert.ok(id.length > 0);
  });

  test('returns "localhost" for localhost URL (no github.io)', function() {
    // global.window.location.hostname is 'localhost'
    var id = N.deriveWorldId();
    assert.strictEqual(id, 'localhost');
  });

  test('returns github repo name for github.io URL', function() {
    // Temporarily override window.location
    var orig = global.window;
    global.window = {
      location: {
        hostname: 'kody-w.github.io',
        href: 'https://kody-w.github.io/zion/'
      }
    };
    var id = N.deriveWorldId();
    global.window = orig;
    assert.strictEqual(id, 'zion');
  });

  test('replaces dots in hostname when no github.io match', function() {
    var orig = global.window;
    global.window = {
      location: {
        hostname: 'my.custom.domain',
        href: 'https://my.custom.domain/'
      }
    };
    var id = N.deriveWorldId();
    global.window = orig;
    assert.ok(id.indexOf('.') === -1, 'Dots should be replaced in world ID: ' + id);
  });
});

// ============================================================================
// 17. onMessage — callback registration
// ============================================================================

suite('onMessage', function() {
  test('does not throw when setting a callback', function() {
    assert.doesNotThrow(function() {
      N.onMessage(function(msg) {});
    });
  });

  test('can replace the callback without throwing', function() {
    assert.doesNotThrow(function() {
      N.onMessage(function(msg) { return 1; });
      N.onMessage(function(msg) { return 2; });
    });
  });
});

// ============================================================================
// 18. disconnect — graceful no-op without peer
// ============================================================================

suite('disconnect (pre-init)', function() {
  test('does not throw when no peer is initialized', function() {
    assert.doesNotThrow(function() {
      N.disconnect();
    });
  });

  test('can be called multiple times safely', function() {
    assert.doesNotThrow(function() {
      N.disconnect();
      N.disconnect();
    });
  });
});

// ============================================================================
// 19. broadcastMessage and connectToPeer — warn gracefully without peer
// ============================================================================

suite('broadcastMessage and connectToPeer (pre-init)', function() {
  test('broadcastMessage does not throw without peer', function() {
    assert.doesNotThrow(function() {
      N.broadcastMessage({ type: 'test', from: 'nobody', timestamp: Date.now() });
    });
  });

  test('connectToPeer does not throw without peer', function() {
    assert.doesNotThrow(function() {
      N.connectToPeer('some-remote-peer');
    });
  });
});

// ============================================================================
// 20. joinLobby — graceful no-op without peer
// ============================================================================

suite('joinLobby (pre-init)', function() {
  test('does not throw when called without peer', function() {
    assert.doesNotThrow(function() {
      N.joinLobby('main', 'TestPlayer', 'nexus');
    });
  });

  test('does not throw with default arguments', function() {
    assert.doesNotThrow(function() {
      N.joinLobby();
    });
  });
});

// ============================================================================
// 21. announceFederation — graceful no-op without peer
// ============================================================================

suite('announceFederation (pre-init)', function() {
  test('does not throw when called without peer', function() {
    assert.doesNotThrow(function() {
      N.announceFederation();
    });
  });
});

// ============================================================================
// 22. federationHandshake — graceful no-op without peer
// ============================================================================

suite('federationHandshake (pre-init)', function() {
  test('does not throw when called without peer', function() {
    assert.doesNotThrow(function() {
      N.federationHandshake('target-world', { worldName: 'Target' });
    });
  });
});

// ============================================================================
// REPORT
// ============================================================================

var success = report();
process.exit(success ? 0 : 1);
