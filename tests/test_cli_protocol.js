// test_cli_protocol.js — Protocol compliance tests for ZION CLI
const { test, suite, report, assert } = require('./test_runner');
const path = require('path');
const Protocol = require(path.join(__dirname, '..', 'src', 'js', 'protocol.js'));
const Zones = require(path.join(__dirname, '..', 'src', 'js', 'zones.js'));
const StateModule = require(path.join(__dirname, '..', 'src', 'js', 'state.js'));

// Import CLI main for testing (without starting the game loop)
var CLI = require(path.join(__dirname, '..', 'cli', 'zion-cli.js'));

suite('CLI Protocol — Message Creation', function() {
  // Set up game state for testing
  CLI.game.playerId = 'test-cli-player';
  CLI.game.zone = 'nexus';
  CLI.game.position = { x: 10, y: 0, z: 20 };
  CLI.game.state = StateModule.createWorldState();
  CLI.game.messageLog = [];
  CLI.game.chatLog = [];

  test('createProtocolMessage returns valid message shape', function() {
    var msg = CLI.createProtocolMessage('move', { position: { x: 1, y: 0, z: 2 } });
    assert.ok(msg);
    assert.strictEqual(msg.v, 1);
    assert.ok(msg.id);
    assert.ok(msg.ts);
    assert.strictEqual(typeof msg.seq, 'number');
    assert.strictEqual(msg.from, 'test-cli-player');
    assert.strictEqual(msg.type, 'move');
    assert.strictEqual(msg.platform, 'api');
    assert.ok(msg.position);
    assert.ok(msg.payload);
  });

  test('move message passes validation', function() {
    var msg = CLI.createProtocolMessage('move', {
      position: { x: 5, y: 0, z: 10 },
      zone: 'nexus'
    });
    var result = Protocol.validateMessage(msg);
    assert.strictEqual(result.valid, true, 'Move message should be valid: ' + JSON.stringify(result.errors));
  });

  test('join message passes validation', function() {
    var msg = CLI.createProtocolMessage('join', {});
    var result = Protocol.validateMessage(msg);
    assert.strictEqual(result.valid, true, 'Join message should be valid: ' + JSON.stringify(result.errors));
  });

  test('leave message passes validation', function() {
    var msg = CLI.createProtocolMessage('leave', {});
    var result = Protocol.validateMessage(msg);
    assert.strictEqual(result.valid, true, 'Leave message should be valid: ' + JSON.stringify(result.errors));
  });

  test('say message passes validation', function() {
    var msg = CLI.createProtocolMessage('say', { message: 'Hello ZION!' });
    var result = Protocol.validateMessage(msg);
    assert.strictEqual(result.valid, true, 'Say message should be valid: ' + JSON.stringify(result.errors));
  });

  test('warp message passes validation', function() {
    var msg = CLI.createProtocolMessage('warp', { zone: 'gardens' });
    var result = Protocol.validateMessage(msg);
    assert.strictEqual(result.valid, true, 'Warp message should be valid: ' + JSON.stringify(result.errors));
  });

  test('inspect message passes validation', function() {
    var msg = CLI.createProtocolMessage('inspect', { target: 'agent_001' });
    var result = Protocol.validateMessage(msg);
    assert.strictEqual(result.valid, true, 'Inspect message should be valid: ' + JSON.stringify(result.errors));
  });
});

suite('CLI Protocol — Platform Compliance', function() {
  test('all CLI messages use platform api', function() {
    var types = ['move', 'join', 'leave', 'say', 'warp', 'inspect'];
    types.forEach(function(type) {
      var msg = CLI.createProtocolMessage(type, {});
      assert.strictEqual(msg.platform, 'api', type + ' should use platform "api"');
    });
  });

  test('platform api is in PLATFORMS set', function() {
    assert.ok(Protocol.PLATFORMS.has('api'), 'Protocol should recognize "api" platform');
  });
});

suite('CLI Protocol — Message Sequence', function() {
  test('sequential messages have incrementing seq numbers', function() {
    var msg1 = CLI.createProtocolMessage('move', { position: { x: 1, y: 0, z: 1 } });
    var msg2 = CLI.createProtocolMessage('move', { position: { x: 2, y: 0, z: 2 } });
    assert.ok(msg2.seq > msg1.seq, 'Second message should have higher seq: ' + msg1.seq + ' vs ' + msg2.seq);
  });

  test('messages have unique IDs', function() {
    var msg1 = CLI.createProtocolMessage('move', {});
    var msg2 = CLI.createProtocolMessage('move', {});
    assert.notStrictEqual(msg1.id, msg2.id, 'Messages should have unique IDs');
  });

  test('messages have valid ISO timestamps', function() {
    var msg = CLI.createProtocolMessage('say', { message: 'test' });
    var date = new Date(msg.ts);
    assert.ok(!isNaN(date.getTime()), 'Timestamp should be valid ISO-8601');
  });
});

suite('CLI Protocol — Zone Rule Compliance', function() {
  test('zone rules are accessible for all zones', function() {
    var zones = Zones.getAllZoneIds();
    zones.forEach(function(zoneId) {
      var rules = Zones.getZoneRules(zoneId);
      assert.ok(rules, 'Zone ' + zoneId + ' should have rules');
      assert.strictEqual(typeof rules.pvp, 'boolean', zoneId + ' should have pvp rule');
      assert.strictEqual(typeof rules.building, 'boolean', zoneId + ' should have building rule');
      assert.strictEqual(typeof rules.harvesting, 'boolean', zoneId + ' should have harvesting rule');
      assert.strictEqual(typeof rules.trading, 'boolean', zoneId + ' should have trading rule');
    });
  });

  test('building not allowed in nexus', function() {
    assert.strictEqual(Zones.isActionAllowed('build', 'nexus'), false);
  });

  test('building allowed in commons', function() {
    assert.strictEqual(Zones.isActionAllowed('build', 'commons'), true);
  });

  test('pvp only in arena', function() {
    assert.strictEqual(Zones.isActionAllowed('challenge', 'arena'), true);
    assert.strictEqual(Zones.isActionAllowed('challenge', 'nexus'), false);
    assert.strictEqual(Zones.isActionAllowed('challenge', 'gardens'), false);
  });

  test('harvesting in gardens and wilds', function() {
    assert.strictEqual(Zones.isActionAllowed('harvest', 'gardens'), true);
    assert.strictEqual(Zones.isActionAllowed('harvest', 'wilds'), true);
    assert.strictEqual(Zones.isActionAllowed('harvest', 'nexus'), false);
  });
});

suite('CLI Protocol — State Loading', function() {
  test('loadWorldState returns valid state shape', function() {
    var state = CLI.loadWorldState();
    assert.ok(state);
    assert.ok(state.world);
    assert.ok(state.players !== undefined);
    assert.ok(state.economy !== undefined);
  });

  test('loaded state has players from canonical JSON', function() {
    var state = CLI.loadWorldState();
    // state/players.json has agent entries
    var playerIds = Object.keys(state.players);
    assert.ok(playerIds.length > 0, 'Should load at least one player from state/players.json');
  });

  test('spawn zone is nexus', function() {
    assert.strictEqual(Zones.getSpawnZone(), 'nexus');
  });
});

suite('CLI Protocol — Warp Compliance', function() {
  test('warp message uses payload.zone format', function() {
    var msg = CLI.createProtocolMessage('warp', { zone: 'gardens' });
    assert.strictEqual(msg.payload.zone, 'gardens');
  });

  test('connected zones are navigable from nexus', function() {
    var connected = Zones.getConnectedZones('nexus');
    assert.ok(connected.length > 0, 'Nexus should have portal connections');
    assert.ok(connected.includes('gardens'), 'Nexus should connect to gardens');
    assert.ok(connected.includes('arena'), 'Nexus should connect to arena');
  });

  test('all zones are reachable from nexus', function() {
    var connected = Zones.getConnectedZones('nexus');
    var allZones = Zones.getAllZoneIds().filter(function(z) { return z !== 'nexus'; });
    allZones.forEach(function(z) {
      assert.ok(connected.includes(z), z + ' should be reachable from nexus');
    });
  });
});

suite('CLI Protocol — Full Message Types', function() {
  var messageTypes = ['join', 'leave', 'move', 'say', 'warp', 'inspect', 'heartbeat', 'emote'];
  messageTypes.forEach(function(type) {
    test(type + ' message is valid protocol message', function() {
      var msg = CLI.createProtocolMessage(type, {});
      var result = Protocol.validateMessage(msg);
      assert.strictEqual(result.valid, true, type + ' validation failed: ' + JSON.stringify(result.errors));
    });
  });
});

var ok = report();
process.exit(ok ? 0 : 1);
