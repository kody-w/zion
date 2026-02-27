// test_cli_input.js — Tests for ZION CLI input handler
const { test, suite, report, assert } = require('./test_runner');
const path = require('path');
const InputHandler = require(path.join(__dirname, '..', 'cli', 'cli-input.js'));

suite('CLI Input — Key Constants', function() {
  test('MOVE_KEYS has wasd', function() {
    assert.ok(InputHandler.MOVE_KEYS.w);
    assert.ok(InputHandler.MOVE_KEYS.a);
    assert.ok(InputHandler.MOVE_KEYS.s);
    assert.ok(InputHandler.MOVE_KEYS.d);
  });

  test('MOVE_KEYS produce correct deltas', function() {
    assert.deepStrictEqual(InputHandler.MOVE_KEYS.w, { x: 0, z: -1 });
    assert.deepStrictEqual(InputHandler.MOVE_KEYS.s, { x: 0, z: 1 });
    assert.deepStrictEqual(InputHandler.MOVE_KEYS.a, { x: -1, z: 0 });
    assert.deepStrictEqual(InputHandler.MOVE_KEYS.d, { x: 1, z: 0 });
  });

  test('ARROW_MOVES has all directions', function() {
    assert.ok(InputHandler.ARROW_MOVES.A);  // Up
    assert.ok(InputHandler.ARROW_MOVES.B);  // Down
    assert.ok(InputHandler.ARROW_MOVES.C);  // Right
    assert.ok(InputHandler.ARROW_MOVES.D);  // Left
  });

  test('ACTION_KEYS has expected actions', function() {
    assert.strictEqual(InputHandler.ACTION_KEYS.e, 'interact');
    assert.strictEqual(InputHandler.ACTION_KEYS.i, 'inventory');
    assert.strictEqual(InputHandler.ACTION_KEYS.h, 'help');
    assert.strictEqual(InputHandler.ACTION_KEYS.q, 'quit');
  });
});

suite('CLI Input — Movement', function() {
  test('W key triggers onMove with north delta', function() {
    var moves = [];
    var handler = InputHandler.createInputHandler({
      onMove: function(delta) { moves.push(delta); }
    });
    handler.handleData('w');
    assert.strictEqual(moves.length, 1);
    assert.deepStrictEqual(moves[0], { x: 0, z: -1 });
  });

  test('arrow up triggers onMove with north delta', function() {
    var moves = [];
    var handler = InputHandler.createInputHandler({
      onMove: function(delta) { moves.push(delta); }
    });
    handler.handleData('\x1b[A');
    assert.strictEqual(moves.length, 1);
    assert.deepStrictEqual(moves[0], { x: 0, z: -1 });
  });

  test('arrow right triggers onMove with east delta', function() {
    var moves = [];
    var handler = InputHandler.createInputHandler({
      onMove: function(delta) { moves.push(delta); }
    });
    handler.handleData('\x1b[C');
    assert.strictEqual(moves.length, 1);
    assert.deepStrictEqual(moves[0], { x: 1, z: 0 });
  });

  test('multiple movement keys in sequence', function() {
    var moves = [];
    var handler = InputHandler.createInputHandler({
      onMove: function(delta) { moves.push(delta); }
    });
    handler.handleData('w');
    handler.handleData('d');
    handler.handleData('s');
    assert.strictEqual(moves.length, 3);
    assert.deepStrictEqual(moves[0], { x: 0, z: -1 });
    assert.deepStrictEqual(moves[1], { x: 1, z: 0 });
    assert.deepStrictEqual(moves[2], { x: 0, z: 1 });
  });
});

suite('CLI Input — Actions', function() {
  test('E key triggers interact action', function() {
    var actions = [];
    var handler = InputHandler.createInputHandler({
      onAction: function(a) { actions.push(a); }
    });
    handler.handleData('e');
    assert.ok(actions.includes('interact'));
  });

  test('I key triggers inventory action', function() {
    var actions = [];
    var handler = InputHandler.createInputHandler({
      onAction: function(a) { actions.push(a); }
    });
    handler.handleData('i');
    assert.ok(actions.includes('inventory'));
  });

  test('H key triggers help action', function() {
    var actions = [];
    var handler = InputHandler.createInputHandler({
      onAction: function(a) { actions.push(a); }
    });
    handler.handleData('h');
    assert.ok(actions.includes('help'));
  });

  test('portal keys 1-8 trigger portal actions', function() {
    var actions = [];
    var handler = InputHandler.createInputHandler({
      onAction: function(a) { actions.push(a); }
    });
    handler.handleData('1');
    handler.handleData('5');
    assert.ok(actions.includes('portal_1'));
    assert.ok(actions.includes('portal_5'));
  });

  test('Q key triggers onQuit', function() {
    var quitCalled = false;
    var handler = InputHandler.createInputHandler({
      onQuit: function() { quitCalled = true; }
    });
    handler.handleData('q');
    assert.strictEqual(quitCalled, true);
  });

  test('Ctrl+C triggers onQuit', function() {
    var quitCalled = false;
    var handler = InputHandler.createInputHandler({
      onQuit: function() { quitCalled = true; }
    });
    handler.handleData('\x03');
    assert.strictEqual(quitCalled, true);
  });
});

suite('CLI Input — Chat Mode', function() {
  test('Enter opens chat mode', function() {
    var actions = [];
    var handler = InputHandler.createInputHandler({
      onAction: function(a) { actions.push(a); }
    });
    assert.strictEqual(handler.isChatMode(), false);
    handler.handleData('\r');
    assert.strictEqual(handler.isChatMode(), true);
    assert.ok(actions.includes('chat_open'));
  });

  test('typing in chat mode accumulates buffer', function() {
    var handler = InputHandler.createInputHandler({
      onAction: function() {}
    });
    handler.handleData('\r'); // Open chat
    handler.handleData('h');
    handler.handleData('e');
    handler.handleData('l');
    handler.handleData('l');
    handler.handleData('o');
    assert.strictEqual(handler.getChatBuffer(), 'hello');
  });

  test('Enter in chat mode sends message and closes', function() {
    var chatMessages = [];
    var handler = InputHandler.createInputHandler({
      onChat: function(msg) { chatMessages.push(msg); },
      onAction: function() {}
    });
    handler.handleData('\r'); // Open chat
    handler.handleData('h');
    handler.handleData('i');
    handler.handleData('\r'); // Send
    assert.strictEqual(chatMessages.length, 1);
    assert.strictEqual(chatMessages[0], 'hi');
    assert.strictEqual(handler.isChatMode(), false);
  });

  test('ESC in chat mode cancels without sending', function() {
    var chatMessages = [];
    var handler = InputHandler.createInputHandler({
      onChat: function(msg) { chatMessages.push(msg); },
      onAction: function() {}
    });
    handler.handleData('\r'); // Open chat
    handler.handleData('t');
    handler.handleData('e');
    handler.handleData('s');
    handler.handleData('t');
    handler.handleData('\x1b'); // ESC
    assert.strictEqual(chatMessages.length, 0);
    assert.strictEqual(handler.isChatMode(), false);
  });

  test('backspace removes last character', function() {
    var handler = InputHandler.createInputHandler({
      onAction: function() {}
    });
    handler.handleData('\r'); // Open chat
    handler.handleData('a');
    handler.handleData('b');
    handler.handleData('c');
    handler.handleData('\x7f'); // Backspace
    assert.strictEqual(handler.getChatBuffer(), 'ab');
  });

  test('movement keys are ignored in chat mode', function() {
    var moves = [];
    var handler = InputHandler.createInputHandler({
      onMove: function(d) { moves.push(d); },
      onAction: function() {}
    });
    handler.handleData('\r'); // Open chat
    handler.handleData('w'); // Should NOT move
    assert.strictEqual(moves.length, 0);
    assert.strictEqual(handler.getChatBuffer(), 'w');
  });
});

suite('CLI Input — Destroy', function() {
  test('destroy prevents further input handling', function() {
    var moves = [];
    var handler = InputHandler.createInputHandler({
      onMove: function(d) { moves.push(d); }
    });
    handler.handleData('w');
    assert.strictEqual(moves.length, 1);
    handler.destroy();
    handler.handleData('w');
    assert.strictEqual(moves.length, 1, 'Should not handle input after destroy');
  });
});

var ok = report();
process.exit(ok ? 0 : 1);
