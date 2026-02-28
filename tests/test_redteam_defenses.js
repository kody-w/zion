#!/usr/bin/env node
/**
 * ZION Red Team — Defense Regression Tests
 * Confirms all security patches block the exploits found in test_redteam_exploits.js
 */
'use strict';

var path = require('path');
var assert = require('assert');

var Protocol = require(path.join(__dirname, '..', 'src', 'js', 'protocol.js'));
var State = require(path.join(__dirname, '..', 'src', 'js', 'state.js'));
var Economy = require(path.join(__dirname, '..', 'src', 'js', 'economy.js'));
var Zones = require(path.join(__dirname, '..', 'src', 'js', 'zones.js'));

var runner = require(path.join(__dirname, 'test_runner.js'));
var test = runner.test;
var suite = runner.suite;

suite('DEFENSE: Prototype Pollution Prevention (VULN-02)', function() {

  test('Join payload cannot inject __proto__ fields', function() {
    var world = State.createWorldState();
    var msg = Protocol.createMessage('join', 'attacker', {
      name: 'attacker',
      __proto__: { isAdmin: true },
      constructor: { evil: true }
    });
    var result = State.applyMessage(world, msg);
    var player = result.players['attacker'];
    assert.strictEqual(player.isAdmin, undefined, 'isAdmin should not be injected');
  });

  test('Join payload only allows whitelisted fields', function() {
    var world = State.createWorldState();
    var msg = Protocol.createMessage('join', 'attacker', {
      name: 'test',
      malicious_field: 'pwned',
      balance: 999999,
      role: 'admin'
    });
    var result = State.applyMessage(world, msg);
    var player = result.players['attacker'];
    assert.strictEqual(player.malicious_field, undefined, 'Arbitrary fields stripped');
    assert.strictEqual(player.balance, undefined, 'balance not injectable');
    assert.strictEqual(player.role, undefined, 'role not injectable');
  });

});

suite('DEFENSE: Position Bounds Clamping (VULN-03)', function() {

  test('Move clamps extreme positions to world bounds', function() {
    var world = State.createWorldState();
    var join = Protocol.createMessage('join', 'alice', { name: 'Alice' });
    world = State.applyMessage(world, join);

    var move = Protocol.createMessage('move', 'alice', {
      position: { x: 999999, y: -999999, z: Infinity }
    });
    var result = State.applyMessage(world, move);
    var pos = result.players['alice'].position;
    assert(pos.x <= 10000, 'x clamped: ' + pos.x);
    assert(pos.y >= -10000, 'y clamped: ' + pos.y);
    assert(isFinite(pos.z), 'z finite: ' + pos.z);
  });

  test('Move handles NaN gracefully', function() {
    var world = State.createWorldState();
    var join = Protocol.createMessage('join', 'alice', { name: 'Alice' });
    world = State.applyMessage(world, join);

    var move = Protocol.createMessage('move', 'alice', {
      position: { x: NaN, y: undefined, z: 'not a number' }
    });
    var result = State.applyMessage(world, move);
    var pos = result.players['alice'].position;
    assert.strictEqual(pos.x, 0, 'NaN x becomes 0');
    assert.strictEqual(pos.y, 0, 'undefined y becomes 0');
    assert.strictEqual(pos.z, 0, 'string z becomes 0');
  });

});

suite('DEFENSE: Timestamp Freshness (VULN-04)', function() {

  test('Protocol rejects far-future timestamps', function() {
    var futureDate = new Date(Date.now() + 10 * 60 * 1000);
    var msg = {
      v: 1, id: 'test_future', ts: futureDate.toISOString(), seq: 0,
      from: 'attacker', type: 'move', platform: 'desktop',
      position: { x: 0, y: 0, z: 0, zone: 'nexus' }, geo: null, payload: {}
    };
    var result = Protocol.validateMessage(msg);
    assert.strictEqual(result.valid, false, 'Future timestamps rejected');
    assert(result.errors.some(function(e) { return e.indexOf('future') >= 0; }));
  });

  test('Protocol allows near-future timestamps (within 5 min)', function() {
    var nearFuture = new Date(Date.now() + 2 * 60 * 1000);
    var msg = {
      v: 1, id: 'test_near', ts: nearFuture.toISOString(), seq: 0,
      from: 'player', type: 'move', platform: 'desktop',
      position: { x: 0, y: 0, z: 0, zone: 'nexus' }, geo: null, payload: {}
    };
    var result = Protocol.validateMessage(msg);
    assert.strictEqual(result.valid, true, 'Near-future timestamps allowed');
  });

});

suite('DEFENSE: UBI Drain Protection (VULN-06)', function() {

  test('Repeated UBI calls in same epoch are deduplicated', function() {
    var ledger = Economy.createLedger();
    ledger.balances['TREASURY'] = 1000;
    var epoch = '2025-06-01T00';
    var r1 = Economy.distributeUBI(ledger, ['p1', 'p2'], epoch);
    assert(r1.distributed > 0, 'First UBI should distribute');
    var r2 = Economy.distributeUBI(ledger, ['p1', 'p2'], epoch);
    assert.strictEqual(r2.distributed, 0, 'Same epoch blocked');
  });

  test('UBI works again in a new epoch', function() {
    var ledger = Economy.createLedger();
    ledger.balances['TREASURY'] = 1000;
    Economy.distributeUBI(ledger, ['p1'], '2025-06-02T00');
    var r = Economy.distributeUBI(ledger, ['p1'], '2025-06-02T01');
    assert(r.distributed > 0, 'New epoch allowed');
  });

});

suite('DEFENSE: Chat XSS Sanitization (VULN-07)', function() {

  test('Chat strips HTML tags', function() {
    var world = State.createWorldState();
    world = State.applyMessage(world, Protocol.createMessage('join', 'alice', { name: 'Alice' }));
    var result = State.applyMessage(world, Protocol.createMessage('say', 'alice', {
      text: '<script>alert("xss")</script>Hello'
    }));
    var chat = result.chat[result.chat.length - 1];
    assert(!chat.text.includes('<'), 'No < in chat');
    assert(!chat.text.includes('>'), 'No > in chat');
    assert(chat.text.includes('Hello'), 'Normal text remains');
  });

  test('Chat truncates to 500 chars', function() {
    var world = State.createWorldState();
    world = State.applyMessage(world, Protocol.createMessage('join', 'alice', { name: 'Alice' }));
    var result = State.applyMessage(world, Protocol.createMessage('say', 'alice', {
      text: 'A'.repeat(1000)
    }));
    var chat = result.chat[result.chat.length - 1];
    assert(chat.text.length <= 500, 'Truncated to 500: ' + chat.text.length);
  });

  test('Chat strips control characters', function() {
    var world = State.createWorldState();
    world = State.applyMessage(world, Protocol.createMessage('join', 'alice', { name: 'Alice' }));
    var result = State.applyMessage(world, Protocol.createMessage('say', 'alice', {
      text: 'Hello\x00\x01\x02\x03World'
    }));
    var chat = result.chat[result.chat.length - 1];
    assert.strictEqual(chat.text, 'HelloWorld', 'Control chars stripped');
  });

});

suite('DEFENSE: Zone Default-Deny (VULN-08)', function() {

  test('Unknown actions are denied by default', function() {
    assert.strictEqual(Zones.isActionAllowed('exploit_unknown', 'nexus'), false);
  });

  test('Common safe actions still allowed', function() {
    assert.strictEqual(Zones.isActionAllowed('say', 'nexus'), true);
    assert.strictEqual(Zones.isActionAllowed('move', 'nexus'), true);
    assert.strictEqual(Zones.isActionAllowed('join', 'nexus'), true);
  });

  test('Zone-restricted actions respect zone rules', function() {
    assert.strictEqual(Zones.isActionAllowed('build', 'arena'), false);
    assert.strictEqual(Zones.isActionAllowed('harvest', 'gardens'), true);
  });

});

suite('DEFENSE: Payload Size Limit (VULN-10)', function() {

  test('Protocol rejects oversized payloads', function() {
    var huge = {};
    for (var i = 0; i < 200; i++) huge['k' + i] = 'x'.repeat(100);
    var msg = {
      v: 1, id: 'huge', ts: new Date().toISOString(), seq: 0,
      from: 'attacker', type: 'say', platform: 'desktop',
      position: { x: 0, y: 0, z: 0, zone: 'nexus' }, geo: null, payload: huge
    };
    var result = Protocol.validateMessage(msg);
    assert.strictEqual(result.valid, false, 'Oversized rejected');
    assert(result.errors.some(function(e) { return e.indexOf('size') >= 0; }));
  });

  test('Protocol allows normal-sized payloads', function() {
    var msg = {
      v: 1, id: 'normal', ts: new Date().toISOString(), seq: 0,
      from: 'player', type: 'say', platform: 'desktop',
      position: { x: 0, y: 0, z: 0, zone: 'nexus' }, geo: null,
      payload: { text: 'Hello world' }
    };
    var result = Protocol.validateMessage(msg);
    assert.strictEqual(result.valid, true, 'Normal accepted');
  });

});

var passed = runner.report();
process.exit(passed ? 0 : 1);
