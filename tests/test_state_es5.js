// test_state_es5.js — Verify state.js uses no ES6+ syntax that breaks older environments
var fs = require('fs');
var path = require('path');
var passed = 0;
var failed = 0;

function assert(cond, msg) {
  if (!cond) { failed++; console.log('FAIL: ' + msg); }
  else { passed++; }
}

var stateSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'js', 'state.js'), 'utf8');

// No destructuring assignment in applyMessage
var applySection = stateSource.substring(
  stateSource.indexOf('function applyMessage'),
  stateSource.indexOf('function applyMessage') + 500
);
assert(applySection.indexOf('var { ') === -1, 'applyMessage should not use destructuring');
assert(applySection.indexOf('...payload') === -1, 'applyMessage should not use spread operator');

// No optional chaining in mergeStates/resolveConflict
assert(stateSource.indexOf('?.') === -1, 'state.js should have no optional chaining (?.)');

// Verify shallow clone pattern (no JSON.parse(JSON.stringify))
assert(applySection.indexOf('JSON.parse(JSON.stringify') === -1,
  'applyMessage should use shallow clone, not JSON deep clone');
assert(applySection.indexOf('Object.assign({}, state)') !== -1,
  'applyMessage should use Object.assign for shallow clone');

// Verify state module functions work
var State = require('../src/js/state');

// Test applyMessage with join
var state = State.createWorldState();
var joinMsg = { type: 'join', from: 'test-player', ts: Date.now(), payload: { name: 'Tester', zone: 'nexus' } };
var newState = State.applyMessage(state, joinMsg);
assert(newState.players['test-player'] !== undefined, 'Join should add player');
assert(newState.players['test-player'].name === 'Tester', 'Player name should be set');
assert(newState.players['test-player'].zone === 'nexus', 'Player zone should be set');

// Verify immutability — original state unchanged
assert(state.players['test-player'] === undefined, 'Original state should not be mutated by join');

// Test move message
var moveMsg = { type: 'move', from: 'test-player', ts: Date.now(), payload: { position: { x: 10, y: 0, z: 20 } } };
var movedState = State.applyMessage(newState, moveMsg);
assert(movedState.players['test-player'].position.x === 10, 'Move should update position');
assert(newState.players['test-player'].position.x !== 10, 'Previous state should not be mutated by move');

// Test chat message
var chatMsg = { type: 'say', from: 'test-player', ts: 12345, payload: { text: 'Hello' } };
var chatState = State.applyMessage(movedState, chatMsg);
assert(chatState.chat.length === 1, 'Chat should have 1 message');
assert(chatState.chat[0].id === 'chat_12345_test-player', 'Chat ID should use string concat, not template literal');
assert(chatState.chat[0].from === 'test-player', 'Chat from should be set');
assert(movedState.chat.length === 0, 'Previous state chat should not be mutated');

// Test resolveConflict
var stateA = State.createWorldState();
stateA.changes = [{ type: 'join', from: 'a', ts: 1 }];
stateA.chat = [{ id: 'c1', ts: 1 }];
var stateB = State.createWorldState();
stateB.changes = [{ type: 'join', from: 'b', ts: 2 }];
stateB.chat = [{ id: 'c2', ts: 2 }];
var merged = State.resolveConflict(stateA, stateB);
assert(merged.changes.length === 2, 'Merged state should combine changes');
assert(merged.chat.length === 2, 'Merged state should combine chat');

console.log(passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
