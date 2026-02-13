const { test, suite, report, assert } = require('./test_runner');
const Creation = require('../src/js/creation');

// Mock zone rules
const buildableRules = { pvp: false, building: true, harvesting: true, trading: true, competition: false, safe: true };
const noBuildRules = { pvp: false, building: false, harvesting: false, trading: true, competition: false, safe: true };

suite('Creation Module Tests', () => {

  test('handleBuild succeeds in zone with building:true', () => {
    const msg = {
      from: 'alice',
      payload: {
        type: 'house',
        position: { x: 10, y: 0, z: 10 },
        zone: 'commons'
      }
    };

    const state = { structures: [] };
    const result = Creation.handleBuild(msg, state, buildableRules);

    assert(result.success === true, 'Build should succeed in buildable zone');
    assert(result.structure !== undefined, 'Should return structure');
    assert(result.structure.type === 'house', 'Structure type should be house');
    assert(result.structure.builder === 'alice', 'Builder should be alice');
    assert(result.state.structures.length === 1, 'Structure should be added to state');
  });

  test('handleBuild fails in zone with building:false', () => {
    const msg = {
      from: 'alice',
      payload: {
        type: 'house',
        position: { x: 10, y: 0, z: 10 },
        zone: 'nexus'
      }
    };

    const state = { structures: [] };
    const result = Creation.handleBuild(msg, state, noBuildRules);

    assert(result.success === false, 'Build should fail in non-buildable zone');
    assert(result.error.includes('not allowed'), 'Error should mention not allowed');
  });

  test('handlePlant succeeds in zone with harvesting:true', () => {
    const msg = {
      from: 'alice',
      payload: {
        species: 'sunflower',
        position: { x: 5, y: 0, z: 5 },
        zone: 'gardens'
      }
    };

    const state = { gardens: [] };
    const result = Creation.handlePlant(msg, state, buildableRules);

    assert(result.success === true, 'Plant should succeed in harvestable zone');
    assert(result.garden !== undefined, 'Should return garden');
    assert(result.garden.species === 'sunflower', 'Species should be sunflower');
    assert(result.garden.planter === 'alice', 'Planter should be alice');
  });

  test('handlePlant adds garden entry with growth timer', () => {
    const msg = {
      from: 'bob',
      payload: {
        species: 'wheat',
        position: { x: 3, y: 0, z: 3 },
        zone: 'gardens'
      }
    };

    const state = { gardens: [] };
    const result = Creation.handlePlant(msg, state, buildableRules);

    assert(result.success === true, 'Plant should succeed');
    assert(result.garden.plantedAt !== undefined, 'Should have plantedAt timestamp');
    assert(result.garden.readyAt !== undefined, 'Should have readyAt timestamp');
    assert(result.garden.readyAt > result.garden.plantedAt, 'readyAt should be after plantedAt');
    assert(result.state.gardens.length === 1, 'Garden should be added to state');
  });

  test('handleHarvest fails if plant not ready', () => {
    const now = Date.now();
    const state = {
      gardens: [{
        id: 'garden1',
        species: 'oak_tree',
        plantedAt: now,
        readyAt: now + 600000, // 10 minutes in future
        growthStage: 0
      }]
    };

    const msg = {
      from: 'alice',
      payload: {
        target: 'garden1'
      }
    };

    const result = Creation.handleHarvest(msg, state, buildableRules);

    assert(result.success === false, 'Harvest should fail if plant not ready');
    assert(result.error.includes('not ready'), 'Error should mention not ready');
  });

  test('handleHarvest succeeds if plant is ready', () => {
    const now = Date.now();
    const state = {
      gardens: [{
        id: 'garden2',
        species: 'sunflower',
        plantedAt: now - 400000, // 6.67 minutes ago
        readyAt: now - 100000, // 1.67 minutes ago (ready)
        growthStage: 1.0
      }]
    };

    const msg = {
      from: 'alice',
      payload: {
        target: 'garden2'
      }
    };

    const result = Creation.handleHarvest(msg, state, buildableRules);

    assert(result.success === true, 'Harvest should succeed if plant is ready');
    assert(result.items !== undefined, 'Should return items');
    assert(Array.isArray(result.items), 'Items should be an array');
    assert(result.state.gardens.length === 0, 'Garden should be removed from state after harvest');
  });

  test('handleHarvest returns items based on species', () => {
    const now = Date.now();
    const state = {
      gardens: [{
        id: 'garden3',
        species: 'wheat',
        plantedAt: now - 300000,
        readyAt: now - 100000,
        growthStage: 1.0
      }]
    };

    const msg = {
      from: 'alice',
      payload: {
        target: 'garden3'
      }
    };

    const result = Creation.handleHarvest(msg, state, buildableRules);

    assert(result.success === true, 'Harvest should succeed');
    const wheatItem = result.items.find(item => item.type === 'wheat');
    assert(wheatItem !== undefined, 'Should return wheat item');
    assert(wheatItem.quantity === 10, 'Wheat should yield 10 units');
  });

  test('handleCraft succeeds with correct materials', () => {
    const state = {
      players: {
        alice: {
          inventory: {
            wood: 5,
            crystal: 2
          }
        }
      }
    };

    const msg = {
      from: 'alice',
      payload: {
        recipe: 'crystal_lamp'
      }
    };

    const result = Creation.handleCraft(msg, state);

    assert(result.success === true, 'Craft should succeed with sufficient materials');
    assert(result.item !== undefined, 'Should return crafted item');
    assert(result.item.type === 'crystal_lamp', 'Item type should be crystal_lamp');
  });

  test('handleCraft fails with insufficient materials', () => {
    const state = {
      players: {
        bob: {
          inventory: {
            wood: 1, // Need 3 for wooden_bench
            crystal: 0
          }
        }
      }
    };

    const msg = {
      from: 'bob',
      payload: {
        recipe: 'wooden_bench'
      }
    };

    const result = Creation.handleCraft(msg, state);

    assert(result.success === false, 'Craft should fail with insufficient materials');
    assert(result.error.includes('Insufficient'), 'Error should mention insufficient materials');
  });

  test('handleCraft consumes materials', () => {
    const state = {
      players: {
        charlie: {
          inventory: {
            sunflower: 5
          }
        }
      }
    };

    const msg = {
      from: 'charlie',
      payload: {
        recipe: 'flower_crown'
      }
    };

    const result = Creation.handleCraft(msg, state);

    assert(result.success === true, 'Craft should succeed');
    // flower_crown requires 2 sunflowers, should have 3 left
    assert(result.state.players.charlie.inventory.sunflower === 3, 'Materials should be consumed');
    assert(result.state.players.charlie.inventory.flower_crown === 1, 'Crafted item should be added');
  });

  test('handleCompose creates entry', () => {
    const state = { structures: [] };

    const msg = {
      from: 'diana',
      payload: {
        medium: 'poetry',
        content: 'A beautiful poem about ZION',
        position: { x: 0, y: 0, z: 0 },
        zone: 'studio'
      }
    };

    const result = Creation.handleCompose(msg, state);

    assert(result.success === true, 'Compose should succeed');
    assert(result.composition !== undefined, 'Should return composition');
    assert(result.composition.type === 'composition', 'Type should be composition');
    assert(result.composition.medium === 'poetry', 'Medium should be poetry');
    assert(result.composition.content === 'A beautiful poem about ZION', 'Content should match');
    assert(result.composition.creator === 'diana', 'Creator should be diana');
    assert(result.state.structures.length === 1, 'Composition should be added to structures');
  });
});

const success = report();
process.exit(success ? 0 : 1);
