const { test, suite, report, assert } = require('./test_runner');
const State = require('../src/js/state');

suite('State Management Tests', () => {

  test('createWorldState returns object with all required keys', () => {
    const state = State.createWorldState();
    assert(state !== null && typeof state === 'object', 'State is not an object');
  });

  test('All required keys present', () => {
    const state = State.createWorldState();
    assert(state.world !== undefined, 'Missing world key');
    assert(state.players !== undefined, 'Missing players key');
    assert(state.economy !== undefined, 'Missing economy key');
    assert(state.gardens !== undefined, 'Missing gardens key');
    assert(state.structures !== undefined, 'Missing structures key');
    assert(state.discoveries !== undefined, 'Missing discoveries key');
    assert(state.anchors !== undefined, 'Missing anchors key');
    assert(state.chat !== undefined, 'Missing chat key');
    assert(state.actions !== undefined, 'Missing actions key');
    assert(state.changes !== undefined, 'Missing changes key');
    assert(state.competitions !== undefined, 'Missing competitions key');
    assert(state.federation !== undefined, 'Missing federation key');
  });

  test('Player join adds to state.players', () => {
    const state = State.createWorldState();
    const message = {
      type: 'join',
      from: 'player1',
      ts: new Date().toISOString(),
      payload: { name: 'Alice', position: { x: 0, y: 0, z: 0 }, zone: 'nexus' }
    };
    const newState = State.applyMessage(state, message);
    assert(newState.players['player1'] !== undefined, 'Player not added');
    assert.strictEqual(newState.players['player1'].name, 'Alice');
    assert.strictEqual(newState.players['player1'].online, true);
  });

  test('Player leave marks as offline', () => {
    const state = State.createWorldState();
    const joinMsg = {
      type: 'join',
      from: 'player1',
      ts: new Date().toISOString(),
      payload: { name: 'Alice' }
    };
    let newState = State.applyMessage(state, joinMsg);

    const leaveMsg = {
      type: 'leave',
      from: 'player1',
      ts: new Date().toISOString(),
      payload: {}
    };
    newState = State.applyMessage(newState, leaveMsg);

    assert.strictEqual(newState.players['player1'].online, false);
  });

  test('Move updates player position', () => {
    const state = State.createWorldState();
    const joinMsg = {
      type: 'join',
      from: 'player1',
      ts: new Date().toISOString(),
      payload: { name: 'Alice', position: { x: 0, y: 0, z: 0 } }
    };
    let newState = State.applyMessage(state, joinMsg);

    const moveMsg = {
      type: 'move',
      from: 'player1',
      ts: new Date().toISOString(),
      payload: { position: { x: 10, y: 5, z: 3 } }
    };
    newState = State.applyMessage(newState, moveMsg);

    assert.strictEqual(newState.players['player1'].position.x, 10);
    assert.strictEqual(newState.players['player1'].position.y, 5);
    assert.strictEqual(newState.players['player1'].position.z, 3);
  });

  test('Warp updates player zone', () => {
    const state = State.createWorldState();
    const joinMsg = {
      type: 'join',
      from: 'player1',
      ts: new Date().toISOString(),
      payload: { name: 'Alice', zone: 'nexus' }
    };
    let newState = State.applyMessage(state, joinMsg);

    const warpMsg = {
      type: 'warp',
      from: 'player1',
      ts: new Date().toISOString(),
      payload: { zone: 'gardens', position: { x: 100, y: 0, z: 0 } }
    };
    newState = State.applyMessage(newState, warpMsg);

    assert.strictEqual(newState.players['player1'].zone, 'gardens');
  });

  test('Say adds to chat', () => {
    const state = State.createWorldState();
    const sayMsg = {
      type: 'say',
      from: 'player1',
      ts: new Date().toISOString(),
      payload: { text: 'Hello world' }
    };
    const newState = State.applyMessage(state, sayMsg);

    assert(newState.chat.length > 0, 'Chat is empty');
    assert.strictEqual(newState.chat[0].type, 'say');
    assert.strictEqual(newState.chat[0].text, 'Hello world');
    assert.strictEqual(newState.chat[0].from, 'player1');
  });

  test('Build adds to structures', () => {
    const state = State.createWorldState();
    const buildMsg = {
      type: 'build',
      from: 'player1',
      ts: new Date().toISOString(),
      payload: {
        structure: {
          type: 'wall',
          position: { x: 10, y: 0, z: 5 },
          data: { material: 'stone' }
        }
      }
    };
    const newState = State.applyMessage(state, buildMsg);

    const structureKeys = Object.keys(newState.structures);
    assert(structureKeys.length > 0, 'No structures added');
    const structure = newState.structures[structureKeys[0]];
    assert.strictEqual(structure.builder, 'player1');
    assert.strictEqual(structure.type, 'wall');
  });

  test('flushToCanonical produces valid JSON', () => {
    const state = State.createWorldState();
    const joinMsg = {
      type: 'join',
      from: 'player1',
      ts: new Date().toISOString(),
      payload: { name: 'Alice' }
    };
    State.applyMessage(state, joinMsg);

    const json = State.flushToCanonical();
    assert(typeof json === 'string', 'Not a string');

    // Should be parseable
    const parsed = JSON.parse(json);
    assert(parsed !== null, 'Failed to parse');
  });

  test('loadFromCanonical restores state', () => {
    const state = State.createWorldState();
    state.players['player1'] = { id: 'player1', name: 'Alice' };
    state.chat.push({ from: 'player1', text: 'test', ts: Date.now() });

    const json = JSON.stringify(state);
    State.loadFromCanonical(json);

    const restored = State.getLiveState();
    assert(restored.players['player1'] !== undefined, 'Player not restored');
    assert.strictEqual(restored.players['player1'].name, 'Alice');
    assert(restored.chat.length > 0, 'Chat not restored');
  });

  test('resolveConflict merges two states', () => {
    const stateA = State.createWorldState();
    stateA.players['player1'] = { id: 'player1', name: 'Alice', last_seen: 1000 };
    stateA.changes = [{ type: 'join', from: 'player1', ts: 1000 }];

    const stateB = State.createWorldState();
    stateB.players['player2'] = { id: 'player2', name: 'Bob', last_seen: 2000 };
    stateB.changes = [{ type: 'join', from: 'player2', ts: 2000 }];

    const merged = State.resolveConflict(stateA, stateB);

    assert(merged.players['player1'] !== undefined, 'player1 not in merged state');
    assert(merged.players['player2'] !== undefined, 'player2 not in merged state');
    assert.strictEqual(merged.changes.length, 2, 'Changes not merged');
  });

  test('applyMessage is pure (does not mutate input)', () => {
    const state = State.createWorldState();
    const originalPlayerCount = Object.keys(state.players).length;

    const joinMsg = {
      type: 'join',
      from: 'player1',
      ts: new Date().toISOString(),
      payload: { name: 'Alice' }
    };

    const newState = State.applyMessage(state, joinMsg);

    // Original state should not be modified
    assert.strictEqual(Object.keys(state.players).length, originalPlayerCount);
    // New state should have the player
    assert(newState.players['player1'] !== undefined);
  });

});

const success = report();
process.exit(success ? 0 : 1);
