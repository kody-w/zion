// test_client_wiring.js — Verify client module wiring for audit fixes
const { test, suite, report, assert } = require('./test_runner');
const path = require('path');
const fs = require('fs');

suite('World.addStructure export', function() {
  const World = require('../src/js/world');

  test('World.addStructure is exported', function() {
    assert.strictEqual(typeof World.addStructure, 'function',
      'World.addStructure should be a function');
  });

  test('World.createPortal is exported', function() {
    assert.strictEqual(typeof World.createPortal, 'function',
      'World.createPortal should be a function');
  });
});

suite('State.applyMessage handles all protocol types', function() {
  const State = require('../src/js/state');
  const Protocol = require('../src/js/protocol');

  test('State.applyMessage is a function', function() {
    assert.strictEqual(typeof State.applyMessage, 'function',
      'State.applyMessage should be a function');
  });

  test('State.applyMessage handles buy message without error', function() {
    var state = State.initState ? State.initState() : { players: {}, economy: {} };
    var msg = Protocol.createMessage ? Protocol.createMessage('buy', 'test', {item: 'wood', quantity: 1}) :
      { type: 'buy', from: 'test', ts: Date.now(), payload: {item: 'wood', quantity: 1} };
    // Should not throw
    var result = State.applyMessage(state, msg);
    assert.ok(result, 'applyMessage should return state');
  });

  test('State.applyMessage handles sell message without error', function() {
    var state = State.initState ? State.initState() : { players: {}, economy: {} };
    var msg = { type: 'sell', from: 'test', ts: Date.now(), payload: {item: 'wood', quantity: 1} };
    var result = State.applyMessage(state, msg);
    assert.ok(result, 'applyMessage should return state');
  });

  test('State.applyMessage handles election_vote without error', function() {
    var state = State.initState ? State.initState() : { players: {}, elections: {} };
    var msg = { type: 'election_vote', from: 'test', ts: Date.now(), payload: {zone: 'nexus', candidate: 'alice'} };
    var result = State.applyMessage(state, msg);
    assert.ok(result, 'applyMessage should return state');
  });
});

suite('chat.json has valid zones', function() {
  test('All chat messages reference valid zones', function() {
    var validZones = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];
    var chatPath = path.join(__dirname, '..', 'state', 'chat.json');
    var chat = JSON.parse(fs.readFileSync(chatPath, 'utf8'));
    var messages = chat.messages || [];

    messages.forEach(function(msg, i) {
      var zone = msg.position && msg.position.zone;
      if (zone) {
        assert.ok(validZones.indexOf(zone) !== -1,
          'Message ' + i + ' has invalid zone "' + zone + '". Valid: ' + validZones.join(', '));
      }
    });
  });
});

suite('No hardcoded paths in Python scripts', function() {
  test('scripts/*.py have no /Users/ hardcoded paths', function() {
    var scriptsDir = path.join(__dirname, '..', 'scripts');
    var pyFiles = fs.readdirSync(scriptsDir).filter(function(f) { return f.endsWith('.py'); });

    pyFiles.forEach(function(fname) {
      var content = fs.readFileSync(path.join(scriptsDir, fname), 'utf8');
      var lines = content.split('\n');
      lines.forEach(function(line, i) {
        var trimmed = line.trim();
        if (trimmed.startsWith('#') || trimmed.startsWith('//')) return;
        if (line.indexOf('/Users/') !== -1) {
          assert.fail(fname + ':' + (i + 1) + ' contains hardcoded path: ' + trimmed);
        }
      });
    });
  });
});

if (!report()) process.exit(1);
