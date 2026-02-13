const { test, suite, report, assert } = require('./test_runner');
const Exploration = require('../src/js/exploration');

suite('Exploration Module Tests', () => {

  test('handleDiscover adds discovery to state', () => {
    const msg = {
      from: 'alice',
      payload: {
        type: 'location',
        description: 'A hidden grove',
        position: { x: 10, y: 0, z: 10 },
        zone: 'wilds'
      }
    };

    const state = { discoveries: [] };
    const result = Exploration.handleDiscover(msg, state);

    assert(result.success === true, 'Discovery should succeed');
    assert(result.discovery !== undefined, 'Should return discovery');
    assert(result.discovery.discoverer === 'alice', 'Discoverer should be alice');
    assert(result.discovery.type === 'location', 'Type should be location');
    assert(result.discovery.description === 'A hidden grove', 'Description should match');
    assert(result.state.discoveries.length === 1, 'Discovery should be added to state');
  });

  test('handleDiscover awards Spark (5-25 range)', () => {
    const msg = {
      from: 'bob',
      payload: {
        type: 'artifact',
        description: 'An ancient relic',
        position: { x: 20, y: 5, z: 15 },
        zone: 'wilds',
        rarity: 0.8 // High rarity
      }
    };

    const state = { discoveries: [] };
    const result = Exploration.handleDiscover(msg, state);

    assert(result.success === true, 'Discovery should succeed');
    assert(result.sparkAwarded !== undefined, 'Should award Spark');
    assert(result.sparkAwarded >= 5, 'Spark award should be at least 5');
    assert(result.sparkAwarded <= 25, 'Spark award should be at most 25');
    // With rarity 0.8, spark should be 5 + floor(0.8 * 20) = 21
    assert(result.sparkAwarded === 21, 'High rarity should award more Spark');
  });

  test('handleDiscover rejects duplicate (same player, same location)', () => {
    const state = {
      discoveries: [{
        id: 'disc1',
        discoverer: 'alice',
        position: { x: 10, y: 0, z: 10 },
        type: 'location',
        zone: 'wilds'
      }]
    };

    // Try to discover very close to existing discovery
    const msg = {
      from: 'alice',
      payload: {
        type: 'location',
        description: 'Another hidden spot',
        position: { x: 11, y: 0, z: 10 }, // Distance ~1 from existing
        zone: 'wilds'
      }
    };

    const result = Exploration.handleDiscover(msg, state);

    assert(result.success === false, 'Duplicate discovery should be rejected');
    assert(result.error.includes('Already discovered'), 'Error should mention already discovered');
  });

  test('handleInspect returns info about player', () => {
    const state = {
      players: {
        alice: {
          position: { x: 0, y: 0, z: 0, zone: 'nexus' },
          inventory: { wood: 5 },
          online: true
        }
      }
    };

    const msg = {
      from: 'bob',
      payload: {
        target: 'alice'
      }
    };

    const result = Exploration.handleInspect(msg, state);

    assert(result.success === true, 'Inspect should succeed');
    assert(result.info !== undefined, 'Should return info');
    assert(result.info.type === 'player', 'Type should be player');
    assert(result.info.id === 'alice', 'ID should be alice');
    assert(result.info.data !== undefined, 'Should return player data');
  });

  test('handleInspect returns info about structure', () => {
    const state = {
      players: {},
      structures: [{
        id: 'struct1',
        type: 'house',
        position: { x: 10, y: 0, z: 10 },
        zone: 'commons',
        builder: 'alice'
      }]
    };

    const msg = {
      from: 'bob',
      payload: {
        target: 'struct1'
      }
    };

    const result = Exploration.handleInspect(msg, state);

    assert(result.success === true, 'Inspect should succeed');
    assert(result.info.type === 'structure', 'Type should be structure');
    assert(result.info.id === 'struct1', 'ID should match');
    assert(result.info.data.type === 'house', 'Structure type should be house');
  });

  test('handleInspect returns info about discovery', () => {
    const state = {
      players: {},
      structures: [],
      gardens: [],
      discoveries: [{
        id: 'disc2',
        type: 'cave',
        description: 'A mysterious cave',
        discoverer: 'charlie',
        position: { x: 50, y: 0, z: 50 },
        rarity: 0.6
      }]
    };

    const msg = {
      from: 'diana',
      payload: {
        target: 'disc2'
      }
    };

    const result = Exploration.handleInspect(msg, state);

    assert(result.success === true, 'Inspect should succeed');
    assert(result.info.type === 'discovery', 'Type should be discovery');
    assert(result.info.id === 'disc2', 'ID should match');
    assert(result.info.data.type === 'cave', 'Discovery type should be cave');
    assert(result.info.data.description === 'A mysterious cave', 'Description should match');
  });

  test('isDuplicate detects nearby existing discovery', () => {
    const state = {
      discoveries: [{
        id: 'disc3',
        discoverer: 'alice',
        position: { x: 0, y: 0, z: 0 },
        type: 'location'
      }]
    };

    const playerId = 'alice';
    const position = { x: 2, y: 0, z: 2 }; // Distance ~2.83, within threshold of 5

    const isDupe = Exploration.isDuplicate(playerId, position, state);

    assert(isDupe === true, 'Should detect duplicate within distance 5');
  });

  test('isDuplicate allows distant discovery', () => {
    const state = {
      discoveries: [{
        id: 'disc4',
        discoverer: 'alice',
        position: { x: 0, y: 0, z: 0 },
        type: 'location'
      }]
    };

    const playerId = 'alice';
    const position = { x: 10, y: 0, z: 10 }; // Distance ~14.14, beyond threshold of 5

    const isDupe = Exploration.isDuplicate(playerId, position, state);

    assert(isDupe === false, 'Should allow discovery beyond distance 5');
  });
});

const success = report();
process.exit(success ? 0 : 1);
