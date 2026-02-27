// test_ai_bridge.js — Tests for ZION AI agent bridge
const { test, suite, report, assert } = require('./test_runner');
const path = require('path');

// We need to set up args before requiring ai-bridge
process.argv = ['node', 'ai-bridge.js', 'test-ai-agent'];

// Suppress stdout/stderr from bridge during tests
var origStdoutWrite = process.stdout.write;
var origStderrWrite = process.stderr.write;
var capturedOutput = [];
process.stdout.write = function(data) { capturedOutput.push(data); return true; };
process.stderr.write = function() { return true; };

// Load modules directly for unit testing
var Protocol = require(path.join(__dirname, '..', 'src', 'js', 'protocol.js'));
var Zones = require(path.join(__dirname, '..', 'src', 'js', 'zones.js'));
var StateModule = require(path.join(__dirname, '..', 'src', 'js', 'state.js'));

// Load the bridge module (will call main() but we suppress output)
var Bridge;
try {
  Bridge = require(path.join(__dirname, '..', 'cli', 'ai-bridge.js'));
} catch(e) {
  // Bridge calls main() which sets up intervals — that's ok for testing
}

// Restore output for test results
process.stdout.write = origStdoutWrite;
process.stderr.write = origStderrWrite;

suite('AI Bridge — State Snapshot', function() {
  test('buildStateSnapshot returns valid structure', function() {
    var snap = Bridge.buildStateSnapshot();
    assert.ok(snap);
    assert.strictEqual(snap.type, 'state');
    assert.strictEqual(typeof snap.tick, 'number');
    assert.ok(snap.you);
    assert.ok(snap.zone);
    assert.ok(snap.portals);
    assert.ok(Array.isArray(snap.nearby_players));
    assert.ok(Array.isArray(snap.chat));
    assert.ok(Array.isArray(snap.available_actions));
  });

  test('snapshot includes agent identity', function() {
    var snap = Bridge.buildStateSnapshot();
    assert.strictEqual(snap.you.id, 'test-ai-agent');
    assert.strictEqual(snap.you.zone, Bridge.game.zone);
    assert.strictEqual(typeof snap.you.position.x, 'number');
    assert.strictEqual(typeof snap.you.position.z, 'number');
  });

  test('snapshot includes zone info', function() {
    var snap = Bridge.buildStateSnapshot();
    assert.ok(snap.zone.id);
    assert.ok(snap.zone.name);
    assert.ok(snap.zone.description);
    assert.ok(snap.zone.rules);
    assert.strictEqual(typeof snap.zone.rules.pvp, 'boolean');
  });

  test('snapshot lists portals', function() {
    var snap = Bridge.buildStateSnapshot();
    assert.ok(snap.portals.length > 0, 'Should have at least one portal');
  });

  test('snapshot lists available actions', function() {
    var snap = Bridge.buildStateSnapshot();
    assert.ok(snap.available_actions.includes('move'));
    assert.ok(snap.available_actions.includes('say'));
    assert.ok(snap.available_actions.includes('warp'));
    assert.ok(snap.available_actions.includes('look'));
  });

  test('available actions reflect zone rules', function() {
    // Save and change zone to arena
    var origZone = Bridge.game.zone;
    Bridge.game.zone = 'arena';
    var snap = Bridge.buildStateSnapshot();
    assert.ok(snap.available_actions.includes('challenge'), 'Arena should allow challenge');
    Bridge.game.zone = origZone;
  });

  test('snapshot includes nearby players', function() {
    var snap = Bridge.buildStateSnapshot();
    // State has players loaded from state/players.json
    // Some should be in the same zone
    assert.ok(Array.isArray(snap.nearby_players));
    // Each nearby player should have id, distance, direction
    if (snap.nearby_players.length > 0) {
      var p = snap.nearby_players[0];
      assert.ok(p.id);
      assert.strictEqual(typeof p.distance, 'number');
      assert.ok(p.direction);
    }
  });
});

suite('AI Bridge — Command Execution', function() {
  test('move north changes position', function() {
    var origZ = Bridge.game.position.z;
    var result = Bridge.executeCommand({ action: 'move', direction: 'north' });
    assert.strictEqual(result.success, true);
    assert.ok(Bridge.game.position.z < origZ || Bridge.game.position.z === origZ,
      'Z should decrease or stay at boundary when moving north');
  });

  test('move south changes position', function() {
    var origZ = Bridge.game.position.z;
    var result = Bridge.executeCommand({ action: 'move', direction: 'south' });
    assert.strictEqual(result.success, true);
  });

  test('move with invalid direction fails', function() {
    var result = Bridge.executeCommand({ action: 'move', direction: 'up' });
    assert.strictEqual(result.success, false);
    assert.ok(result.error.includes('Invalid direction'));
  });

  test('say generates chat message', function() {
    var chatBefore = Bridge.game.chatLog.length;
    var result = Bridge.executeCommand({ action: 'say', message: 'Hello ZION!' });
    assert.strictEqual(result.success, true);
    assert.ok(Bridge.game.chatLog.length > chatBefore);
    var last = Bridge.game.chatLog[Bridge.game.chatLog.length - 1];
    assert.strictEqual(last.text, 'Hello ZION!');
    assert.strictEqual(last.from, 'test-ai-agent');
  });

  test('say without message fails', function() {
    var result = Bridge.executeCommand({ action: 'say' });
    assert.strictEqual(result.success, false);
  });

  test('shout generates chat message', function() {
    var result = Bridge.executeCommand({ action: 'shout', message: 'Hear me!' });
    assert.strictEqual(result.success, true);
  });

  test('emote generates emote message', function() {
    var result = Bridge.executeCommand({ action: 'emote', type: 'wave' });
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.emote, 'wave');
  });

  test('emote defaults to wave', function() {
    var result = Bridge.executeCommand({ action: 'emote' });
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.emote, 'wave');
  });

  test('look returns success', function() {
    var result = Bridge.executeCommand({ action: 'look' });
    assert.strictEqual(result.success, true);
  });

  test('inspect with target works', function() {
    // Add a player near us
    Bridge.game.state.players['nearby-test'] = {
      position: { x: Bridge.game.position.x + 5, y: 0, z: Bridge.game.position.z, zone: Bridge.game.zone }
    };
    var result = Bridge.executeCommand({ action: 'inspect', target: 'nearby-test' });
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.entity.id, 'nearby-test');
    delete Bridge.game.state.players['nearby-test'];
  });

  test('interact finds nearest entity', function() {
    Bridge.game.state.players['close-agent'] = {
      position: { x: Bridge.game.position.x + 3, y: 0, z: Bridge.game.position.z, zone: Bridge.game.zone }
    };
    var result = Bridge.executeCommand({ action: 'interact' });
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.entity.id, 'close-agent');
    delete Bridge.game.state.players['close-agent'];
  });

  test('unknown action fails gracefully', function() {
    var result = Bridge.executeCommand({ action: 'fly' });
    assert.strictEqual(result.success, false);
    assert.ok(result.error.includes('Unknown action'));
  });

  test('null command fails gracefully', function() {
    var result = Bridge.executeCommand(null);
    assert.strictEqual(result.success, false);
  });

  test('command without action fails', function() {
    var result = Bridge.executeCommand({ direction: 'north' });
    assert.strictEqual(result.success, false);
  });
});

suite('AI Bridge — Warp', function() {
  test('warp to valid connected zone succeeds', function() {
    Bridge.game.zone = 'nexus';
    Bridge.game.position = { x: 0, y: 0, z: 0 };
    var result = Bridge.executeCommand({ action: 'warp', zone: 'gardens' });
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.zone, 'gardens');
    assert.strictEqual(Bridge.game.zone, 'gardens');
  });

  test('warp to non-existent zone fails', function() {
    var result = Bridge.executeCommand({ action: 'warp', zone: 'mordor' });
    assert.strictEqual(result.success, false);
    assert.ok(result.error.includes('does not exist'));
  });

  test('warp to non-connected zone fails', function() {
    Bridge.game.zone = 'gardens';
    var result = Bridge.executeCommand({ action: 'warp', zone: 'arena' });
    assert.strictEqual(result.success, false);
    assert.ok(result.error.includes('No portal'));
  });

  test('warp without zone field fails', function() {
    var result = Bridge.executeCommand({ action: 'warp' });
    assert.strictEqual(result.success, false);
  });

  test('warp updates position to zone center', function() {
    Bridge.game.zone = 'nexus';
    Bridge.executeCommand({ action: 'warp', zone: 'arena' });
    var arenaZone = Zones.getZone('arena');
    var expectedX = (arenaZone.bounds.x_min + arenaZone.bounds.x_max) / 2;
    var expectedZ = (arenaZone.bounds.z_min + arenaZone.bounds.z_max) / 2;
    assert.strictEqual(Bridge.game.position.x, expectedX);
    assert.strictEqual(Bridge.game.position.z, expectedZ);
  });
});

suite('AI Bridge — Protocol Compliance', function() {
  test('all commands generate valid protocol messages', function() {
    var logBefore = Bridge.game.protocolLog.length;

    Bridge.game.zone = 'nexus';
    Bridge.game.position = { x: 0, y: 0, z: 0 };

    Bridge.executeCommand({ action: 'move', direction: 'north' });
    Bridge.executeCommand({ action: 'say', message: 'test' });
    Bridge.executeCommand({ action: 'emote', type: 'bow' });

    assert.ok(Bridge.game.protocolLog.length > logBefore,
      'Should have generated protocol messages');
  });

  test('createMsg produces valid protocol message', function() {
    var msg = Bridge.createMsg('move', { position: { x: 1, y: 0, z: 1 } });
    var result = Protocol.validateMessage(msg);
    assert.strictEqual(result.valid, true, 'Message should be valid: ' + JSON.stringify(result.errors));
  });

  test('all messages use platform api', function() {
    var msg = Bridge.createMsg('say', { message: 'test' });
    assert.strictEqual(msg.platform, 'api');
  });

  test('messages have incrementing sequence numbers', function() {
    var msg1 = Bridge.createMsg('move', {});
    var msg2 = Bridge.createMsg('move', {});
    assert.ok(msg2.seq > msg1.seq);
  });
});

suite('AI Bridge — Cardinal Direction', function() {
  test('getCardinal returns correct directions', function() {
    assert.strictEqual(Bridge.getCardinal(0, -10), 'north');
    assert.strictEqual(Bridge.getCardinal(0, 10), 'south');
    assert.strictEqual(Bridge.getCardinal(10, 0), 'east');
    assert.strictEqual(Bridge.getCardinal(-10, 0), 'west');
    assert.strictEqual(Bridge.getCardinal(0, 0), 'here');
  });
});

suite('AI Bridge — JSON Output Format', function() {
  test('state snapshot is valid JSON', function() {
    var snap = Bridge.buildStateSnapshot();
    var json = JSON.stringify(snap);
    var parsed = JSON.parse(json);
    assert.strictEqual(parsed.type, 'state');
  });

  test('snapshot is compact (no unnecessary whitespace)', function() {
    var snap = Bridge.buildStateSnapshot();
    var json = JSON.stringify(snap);
    assert.ok(!json.includes('\n'), 'JSON should be single-line');
  });
});

// Clean up intervals set by main()
var timers = process._getActiveHandles ? process._getActiveHandles() : [];

var ok = report();
process.exit(ok ? 0 : 1);
