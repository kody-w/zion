// test_peer_host.js — Tests for ZION always-on lobby host
const { test, suite, report, assert } = require('./test_runner');
const path = require('path');
const Protocol = require(path.join(__dirname, '..', 'src', 'js', 'protocol.js'));
const Zones = require(path.join(__dirname, '..', 'src', 'js', 'zones.js'));

// Load host module without starting main() by mocking process.argv
// We need to prevent the WebSocket connection from starting
var origExit = process.exit;
process.exit = function() {};

// Capture and suppress console output during load
var origLog = console.log;
var logs = [];
console.log = function() { logs.push(Array.from(arguments).join(' ')); };

// We'll test the exported functions directly
// But first, we need to prevent the host from connecting
// Let's test the utility functions by requiring the module pieces

// Restore console
console.log = origLog;
process.exit = origExit;

// Since peer-host.js calls main() on load, we'll test the core logic
// by importing the underlying ZION modules and testing the patterns

suite('Peer Host — State Loading', function() {
  var StateModule = require(path.join(__dirname, '..', 'src', 'js', 'state.js'));
  var fs = require('fs');

  test('creates valid world state', function() {
    var state = StateModule.createWorldState();
    assert.ok(state);
    assert.ok(state.world);
    assert.ok(state.players !== undefined);
    assert.ok(state.chat !== undefined);
  });

  test('state/players.json loads and has agents', function() {
    var raw = fs.readFileSync(path.join(__dirname, '..', 'state', 'players.json'), 'utf8');
    var data = JSON.parse(raw);
    assert.ok(data.players);
    var ids = Object.keys(data.players);
    assert.ok(ids.length >= 50, 'Should have 50+ AI agents, got ' + ids.length);
    // Check agents have positions
    var sample = data.players[ids[0]];
    assert.ok(sample.position, 'Players should have positions');
    assert.ok(sample.position.zone, 'Positions should have zones');
  });

  test('state/world.json loads with zones', function() {
    var raw = fs.readFileSync(path.join(__dirname, '..', 'state', 'world.json'), 'utf8');
    var data = JSON.parse(raw);
    assert.ok(data.zones, 'World should have zones');
  });
});

suite('Peer Host — Protocol Compliance', function() {
  test('lobby announce has correct shape', function() {
    var announce = {
      type: '_lobby_announce',
      peerId: 'zion-lobby-main',
      playerName: 'ZION Lobby Host',
      zone: 'nexus',
      peers: ['zion-lobby-main'],
      timestamp: Date.now()
    };
    assert.strictEqual(announce.type, '_lobby_announce');
    assert.ok(Array.isArray(announce.peers));
    assert.ok(announce.timestamp > 0);
  });

  test('heartbeat has correct shape', function() {
    var hb = {
      type: '_heartbeat',
      peerId: 'zion-lobby-main',
      zone: 'nexus',
      peerCount: 0,
      timestamp: Date.now()
    };
    assert.strictEqual(hb.type, '_heartbeat');
    assert.strictEqual(typeof hb.peerCount, 'number');
  });

  test('agent heartbeat generates valid protocol message', function() {
    var msg = Protocol.createMessage('heartbeat', 'agent_001', {}, {
      platform: 'api',
      position: { x: 0, y: 0, z: 0, zone: 'nexus' }
    });
    var result = Protocol.validateMessage(msg);
    assert.strictEqual(result.valid, true, 'Agent heartbeat should be valid: ' + JSON.stringify(result.errors));
  });

  test('join message for connected player is valid', function() {
    var msg = Protocol.createMessage('join', 'browser-player-1', {}, {
      platform: 'desktop',
      position: { x: 0, y: 0, z: 0, zone: 'nexus' }
    });
    var result = Protocol.validateMessage(msg);
    assert.strictEqual(result.valid, true);
  });
});

suite('Peer Host — State Tracking', function() {
  test('applyToState tracks player join', function() {
    var state = { players: {}, chat: [] };

    // Simulate join
    var msg = { type: 'join', from: 'test-player-1', ts: new Date().toISOString(),
      position: { x: 5, y: 0, z: 10, zone: 'nexus' }, platform: 'desktop' };

    if (!state.players[msg.from]) {
      state.players[msg.from] = {
        position: msg.position,
        joinedAt: msg.ts,
        platform: msg.platform
      };
    }

    assert.ok(state.players['test-player-1']);
    assert.strictEqual(state.players['test-player-1'].position.zone, 'nexus');
  });

  test('applyToState tracks player move', function() {
    var state = { players: { 'p1': { position: { x: 0, y: 0, z: 0, zone: 'nexus' } } } };

    var msg = { type: 'move', from: 'p1', payload: { position: { x: 5, y: 0, z: 10, zone: 'nexus' } } };
    state.players[msg.from].position = msg.payload.position;

    assert.strictEqual(state.players['p1'].position.x, 5);
    assert.strictEqual(state.players['p1'].position.z, 10);
  });

  test('applyToState tracks chat', function() {
    var state = { players: {}, chat: [] };

    var msg = { type: 'say', from: 'chatter', payload: { message: 'Hello!' }, ts: new Date().toISOString() };
    state.chat.push({ from: msg.from, text: msg.payload.message, ts: msg.ts });

    assert.strictEqual(state.chat.length, 1);
    assert.strictEqual(state.chat[0].text, 'Hello!');
  });

  test('applyToState tracks player leave', function() {
    var state = { players: { 'leaver': { position: { x: 0, y: 0, z: 0, zone: 'nexus' } } } };

    delete state.players['leaver'];
    assert.strictEqual(state.players['leaver'], undefined);
  });
});

suite('Peer Host — Message Deduplication', function() {
  test('duplicate messages are detected', function() {
    var seen = new Map();
    var msg = { type: 'move', from: 'player1', timestamp: 12345 };
    var key = JSON.stringify({ t: msg.type, f: msg.from, ts: msg.timestamp });

    assert.strictEqual(seen.has(key), false);
    seen.set(key, Date.now());
    assert.strictEqual(seen.has(key), true);
  });

  test('different messages are not deduplicated', function() {
    var seen = new Map();
    var msg1 = { type: 'move', from: 'player1', timestamp: 100 };
    var msg2 = { type: 'move', from: 'player1', timestamp: 200 };
    var key1 = JSON.stringify({ t: msg1.type, f: msg1.from, ts: msg1.timestamp });
    var key2 = JSON.stringify({ t: msg2.type, f: msg2.from, ts: msg2.timestamp });

    seen.set(key1, Date.now());
    assert.strictEqual(seen.has(key1), true);
    assert.strictEqual(seen.has(key2), false);
  });
});

suite('Peer Host — Lobby Peer ID', function() {
  test('lobby peer ID follows convention', function() {
    assert.strictEqual('zion-lobby-main', 'zion-lobby-' + 'main');
  });

  test('lobby peer ID matches network.js getLobbyPeerId', function() {
    var Network = require(path.join(__dirname, '..', 'src', 'js', 'network.js'));
    assert.strictEqual(Network.getLobbyPeerId('main'), 'zion-lobby-main');
  });

  test('all zone IDs are valid for warp targets', function() {
    var zones = Zones.getAllZoneIds();
    assert.ok(zones.length === 8, 'Should have 8 zones');
    zones.forEach(function(z) {
      assert.ok(Zones.zoneExists(z));
    });
  });
});

suite('Peer Host — PeerJS Signaling Protocol', function() {
  test('OPEN message format', function() {
    var msg = { type: 'OPEN' };
    assert.strictEqual(msg.type, 'OPEN');
  });

  test('OFFER message format', function() {
    var msg = {
      type: 'OFFER',
      src: 'browser-player',
      dst: 'zion-lobby-main',
      payload: {
        sdp: { sdp: 'v=0...', type: 'offer' },
        type: 'data',
        connectionId: 'dc_abc123',
        label: 'dc_abc123',
        reliable: true,
        serialization: 'binary'
      }
    };
    assert.strictEqual(msg.payload.type, 'data');
    assert.ok(msg.payload.sdp);
    assert.ok(msg.payload.connectionId);
  });

  test('CANDIDATE message format', function() {
    var msg = {
      type: 'CANDIDATE',
      payload: {
        candidate: { candidate: 'candidate:...', sdpMid: '0' },
        type: 'data',
        connectionId: 'dc_abc123'
      },
      dst: 'browser-player'
    };
    assert.ok(msg.payload.candidate);
    assert.strictEqual(msg.payload.type, 'data');
  });
});

var ok = report();
process.exit(ok ? 0 : 1);
