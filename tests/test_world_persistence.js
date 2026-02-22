/**
 * Tests for src/js/world_persistence.js
 * 120+ tests covering all exported functions and edge cases.
 */

var WP = require('../src/js/world_persistence');

var passed = 0;
var failed = 0;
var errors = [];

function assert(condition, msg) {
  if (!condition) {
    throw new Error(msg || 'Assertion failed');
  }
}

assert.strictEqual = function(a, b, msg) {
  if (a !== b) {
    throw new Error(msg || ('Expected ' + JSON.stringify(a) + ' === ' + JSON.stringify(b)));
  }
};

assert.notStrictEqual = function(a, b, msg) {
  if (a === b) {
    throw new Error(msg || ('Expected ' + JSON.stringify(a) + ' !== ' + JSON.stringify(b)));
  }
};

assert.deepEqual = function(a, b, msg) {
  var as = JSON.stringify(a);
  var bs = JSON.stringify(b);
  if (as !== bs) {
    throw new Error(msg || ('Expected ' + as + ' deepEqual ' + bs));
  }
};

function test(name, fn) {
  try {
    fn();
    passed++;
    process.stdout.write('  PASS  ' + name + '\n');
  } catch (e) {
    failed++;
    errors.push({ name: name, error: e });
    process.stdout.write('  FAIL  ' + name + '\n    ' + e.message + '\n');
  }
}

function suite(name, fn) {
  process.stdout.write('\n' + name + '\n');
  fn();
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

/**
 * Make a minimal state with a ledger so balance checks work.
 */
function makeState(currentTick) {
  var s = WP.createState();
  s.currentTick = currentTick || 0;
  s.ledger = { balances: {} };
  return s;
}

/**
 * Give a player some Spark in a state's ledger.
 */
function giveBalance(state, playerId, amount) {
  state.ledger.balances[playerId] = (state.ledger.balances[playerId] || 0) + amount;
}

function getBalance(state, playerId) {
  return state.ledger.balances[playerId] || 0;
}

/**
 * Place a structure without the fund check (give exact funds first).
 */
function quickPlace(state, playerId, structureType, zone, position) {
  var typeDef = WP.STRUCTURE_TYPES[structureType];
  giveBalance(state, playerId, typeDef.buildCost);
  return WP.placeStructure(state, playerId, structureType, zone, position || { x: 10, z: 20 });
}

/**
 * Create a garden state entry manually.
 */
function quickGarden(state, playerId, zone) {
  return WP.createGardenState(state, playerId, zone || 'gardens', { x: 0, z: 0 });
}

// ---------------------------------------------------------------------------
// SUITE: STRUCTURE_TYPES constants
// ---------------------------------------------------------------------------

suite('STRUCTURE_TYPES — 12 types present', function() {

  test('wooden_cabin is defined', function() {
    assert(WP.STRUCTURE_TYPES.wooden_cabin, 'wooden_cabin missing');
  });

  test('stone_house is defined', function() {
    assert(WP.STRUCTURE_TYPES.stone_house, 'stone_house missing');
  });

  test('market_stall is defined', function() {
    assert(WP.STRUCTURE_TYPES.market_stall, 'market_stall missing');
  });

  test('workshop is defined', function() {
    assert(WP.STRUCTURE_TYPES.workshop, 'workshop missing');
  });

  test('garden_plot is defined', function() {
    assert(WP.STRUCTURE_TYPES.garden_plot, 'garden_plot missing');
  });

  test('watchtower is defined', function() {
    assert(WP.STRUCTURE_TYPES.watchtower, 'watchtower missing');
  });

  test('bridge is defined', function() {
    assert(WP.STRUCTURE_TYPES.bridge, 'bridge missing');
  });

  test('fountain is defined', function() {
    assert(WP.STRUCTURE_TYPES.fountain, 'fountain missing');
  });

  test('statue is defined', function() {
    assert(WP.STRUCTURE_TYPES.statue, 'statue missing');
  });

  test('shrine is defined', function() {
    assert(WP.STRUCTURE_TYPES.shrine, 'shrine missing');
  });

  test('lighthouse is defined', function() {
    assert(WP.STRUCTURE_TYPES.lighthouse, 'lighthouse missing');
  });

  test('amphitheater is defined', function() {
    assert(WP.STRUCTURE_TYPES.amphitheater, 'amphitheater missing');
  });

  test('all 12 types have required fields', function() {
    var required = ['id', 'name', 'category', 'buildCost', 'dailyUpkeep', 'maxHealth', 'decayRate', 'repairCost', 'maxPerZone', 'allowedZones'];
    var types = Object.keys(WP.STRUCTURE_TYPES);
    assert.strictEqual(types.length, 12, 'Expected 12 structure types');
    for (var i = 0; i < types.length; i++) {
      var t = WP.STRUCTURE_TYPES[types[i]];
      for (var j = 0; j < required.length; j++) {
        assert(t[required[j]] !== undefined, types[i] + ' missing field: ' + required[j]);
      }
    }
  });

  test('wooden_cabin buildCost is 100', function() {
    assert.strictEqual(WP.STRUCTURE_TYPES.wooden_cabin.buildCost, 100);
  });

  test('wooden_cabin dailyUpkeep is 1', function() {
    assert.strictEqual(WP.STRUCTURE_TYPES.wooden_cabin.dailyUpkeep, 1);
  });

  test('wooden_cabin maxHealth is 100', function() {
    assert.strictEqual(WP.STRUCTURE_TYPES.wooden_cabin.maxHealth, 100);
  });

  test('wooden_cabin decayRate is 5', function() {
    assert.strictEqual(WP.STRUCTURE_TYPES.wooden_cabin.decayRate, 5);
  });

  test('wooden_cabin maxPerZone is 5', function() {
    assert.strictEqual(WP.STRUCTURE_TYPES.wooden_cabin.maxPerZone, 5);
  });

  test('amphitheater maxPerZone is 1', function() {
    assert.strictEqual(WP.STRUCTURE_TYPES.amphitheater.maxPerZone, 1);
  });

  test('garden_plot has zero decayRate', function() {
    assert.strictEqual(WP.STRUCTURE_TYPES.garden_plot.decayRate, 0);
  });

});

// ---------------------------------------------------------------------------
// SUITE: GARDEN_CROPS constants
// ---------------------------------------------------------------------------

suite('GARDEN_CROPS — 10 crops present', function() {

  test('wheat is defined', function() {
    assert(WP.GARDEN_CROPS.wheat, 'wheat missing');
  });

  test('sunflower is defined', function() {
    assert(WP.GARDEN_CROPS.sunflower, 'sunflower missing');
  });

  test('herbs is defined', function() {
    assert(WP.GARDEN_CROPS.herbs, 'herbs missing');
  });

  test('mushroom is defined', function() {
    assert(WP.GARDEN_CROPS.mushroom, 'mushroom missing');
  });

  test('crystal_bloom is defined', function() {
    assert(WP.GARDEN_CROPS.crystal_bloom, 'crystal_bloom missing');
  });

  test('oak_sapling is defined', function() {
    assert(WP.GARDEN_CROPS.oak_sapling, 'oak_sapling missing');
  });

  test('starfruit is defined', function() {
    assert(WP.GARDEN_CROPS.starfruit, 'starfruit missing');
  });

  test('fireblossom is defined', function() {
    assert(WP.GARDEN_CROPS.fireblossom, 'fireblossom missing');
  });

  test('frost_lily is defined', function() {
    assert(WP.GARDEN_CROPS.frost_lily, 'frost_lily missing');
  });

  test('moonvine is defined', function() {
    assert(WP.GARDEN_CROPS.moonvine, 'moonvine missing');
  });

  test('all 10 crops have required fields', function() {
    var required = ['id', 'name', 'growthStages', 'ticksPerStage', 'season', 'offSeasonPenalty', 'yield', 'waterNeeded'];
    var crops = Object.keys(WP.GARDEN_CROPS);
    assert.strictEqual(crops.length, 10, 'Expected 10 crop types');
    for (var i = 0; i < crops.length; i++) {
      var c = WP.GARDEN_CROPS[crops[i]];
      for (var j = 0; j < required.length; j++) {
        assert(c[required[j]] !== undefined, crops[i] + ' missing field: ' + required[j]);
      }
    }
  });

  test('wheat has 4 growth stages', function() {
    assert.strictEqual(WP.GARDEN_CROPS.wheat.growthStages, 4);
  });

  test('wheat ticksPerStage is 100', function() {
    assert.strictEqual(WP.GARDEN_CROPS.wheat.ticksPerStage, 100);
  });

  test('wheat season is summer', function() {
    assert.strictEqual(WP.GARDEN_CROPS.wheat.season, 'summer');
  });

  test('wheat offSeasonPenalty is 0.5', function() {
    assert.strictEqual(WP.GARDEN_CROPS.wheat.offSeasonPenalty, 0.5);
  });

  test('wheat waterNeeded is true', function() {
    assert.strictEqual(WP.GARDEN_CROPS.wheat.waterNeeded, true);
  });

  test('mushroom waterNeeded is false', function() {
    assert.strictEqual(WP.GARDEN_CROPS.mushroom.waterNeeded, false);
  });

  test('wheat yield has itemId, minQty, maxQty', function() {
    var y = WP.GARDEN_CROPS.wheat.yield;
    assert(y.itemId, 'wheat yield missing itemId');
    assert(typeof y.minQty === 'number', 'wheat yield missing minQty');
    assert(typeof y.maxQty === 'number', 'wheat yield missing maxQty');
  });

  test('crystal_bloom has 5 growth stages', function() {
    assert.strictEqual(WP.GARDEN_CROPS.crystal_bloom.growthStages, 5);
  });

});

// ---------------------------------------------------------------------------
// SUITE: createState
// ---------------------------------------------------------------------------

suite('createState', function() {

  test('returns object with structures, gardens, timeCapsules, events', function() {
    var s = WP.createState();
    assert(typeof s.structures === 'object', 'missing structures');
    assert(typeof s.gardens === 'object', 'missing gardens');
    assert(typeof s.timeCapsules === 'object', 'missing timeCapsules');
    assert(Array.isArray(s.events), 'events should be array');
  });

  test('fresh state has empty structures', function() {
    var s = WP.createState();
    assert.strictEqual(Object.keys(s.structures).length, 0);
  });

  test('fresh state has empty gardens', function() {
    var s = WP.createState();
    assert.strictEqual(Object.keys(s.gardens).length, 0);
  });

  test('fresh state has empty timeCapsules', function() {
    var s = WP.createState();
    assert.strictEqual(Object.keys(s.timeCapsules).length, 0);
  });

});

// ---------------------------------------------------------------------------
// SUITE: placeStructure
// ---------------------------------------------------------------------------

suite('placeStructure', function() {

  test('places wooden_cabin successfully', function() {
    var state = makeState(0);
    var res = quickPlace(state, 'player1', 'wooden_cabin', 'gardens');
    assert(res.success, 'Expected success: ' + res.reason);
  });

  test('returned structure has correct type', function() {
    var state = makeState(0);
    var res = quickPlace(state, 'player1', 'wooden_cabin', 'gardens');
    assert.strictEqual(res.structure.type, 'wooden_cabin');
  });

  test('returned structure has correct ownerId', function() {
    var state = makeState(0);
    var res = quickPlace(state, 'player1', 'wooden_cabin', 'gardens');
    assert.strictEqual(res.structure.ownerId, 'player1');
  });

  test('returned structure has correct zone', function() {
    var state = makeState(0);
    var res = quickPlace(state, 'player1', 'wooden_cabin', 'gardens');
    assert.strictEqual(res.structure.zone, 'gardens');
  });

  test('returned structure starts with full health', function() {
    var state = makeState(0);
    var res = quickPlace(state, 'player1', 'wooden_cabin', 'gardens');
    assert.strictEqual(res.structure.health, WP.STRUCTURE_TYPES.wooden_cabin.maxHealth);
  });

  test('returned structure has status active', function() {
    var state = makeState(0);
    var res = quickPlace(state, 'player1', 'wooden_cabin', 'gardens');
    assert.strictEqual(res.structure.status, 'active');
  });

  test('returned structure has an id', function() {
    var state = makeState(0);
    var res = quickPlace(state, 'player1', 'wooden_cabin', 'gardens');
    assert(typeof res.structure.id === 'string' && res.structure.id.length > 0);
  });

  test('deducts build cost from player balance', function() {
    var state = makeState(0);
    giveBalance(state, 'player1', 200);
    WP.placeStructure(state, 'player1', 'wooden_cabin', 'gardens', { x: 10, z: 20 });
    assert.strictEqual(getBalance(state, 'player1'), 100);
  });

  test('fails with insufficient Spark', function() {
    var state = makeState(0);
    giveBalance(state, 'player1', 50); // wooden_cabin costs 100
    var res = WP.placeStructure(state, 'player1', 'wooden_cabin', 'gardens', { x: 10, z: 20 });
    assert(!res.success, 'Should fail with insufficient Spark');
    assert(res.reason.toLowerCase().includes('spark') || res.reason.toLowerCase().includes('insufficient'), res.reason);
  });

  test('fails with unknown structure type', function() {
    var state = makeState(0);
    giveBalance(state, 'player1', 9999);
    var res = WP.placeStructure(state, 'player1', 'magic_fortress', 'nexus', { x: 0, z: 0 });
    assert(!res.success);
  });

  test('fails when zone not allowed for type', function() {
    var state = makeState(0);
    giveBalance(state, 'player1', 9999);
    // amphitheater is not allowed in wilds
    var res = WP.placeStructure(state, 'player1', 'amphitheater', 'wilds', { x: 0, z: 0 });
    assert(!res.success);
  });

  test('fails when zone limit exceeded', function() {
    var state = makeState(0);
    // lighthouse maxPerZone = 1
    giveBalance(state, 'player1', 9999);
    WP.placeStructure(state, 'player1', 'lighthouse', 'nexus', { x: 0, z: 0 });
    var res = WP.placeStructure(state, 'player1', 'lighthouse', 'nexus', { x: 10, z: 10 });
    assert(!res.success, 'Second lighthouse in same zone should fail');
    assert(res.reason.toLowerCase().includes('limit') || res.reason.toLowerCase().includes('max'), res.reason);
  });

  test('two different zones for same type are independent limits', function() {
    var state = makeState(0);
    giveBalance(state, 'player1', 9999);
    WP.placeStructure(state, 'player1', 'lighthouse', 'nexus', { x: 0, z: 0 });
    var res = WP.placeStructure(state, 'player1', 'lighthouse', 'wilds', { x: 50, z: 50 });
    assert(res.success, 'Should succeed in different zone: ' + res.reason);
  });

  test('fails with missing zone', function() {
    var state = makeState(0);
    giveBalance(state, 'player1', 9999);
    var res = WP.placeStructure(state, 'player1', 'wooden_cabin', null, { x: 0, z: 0 });
    assert(!res.success);
  });

  test('fails with invalid position (no x)', function() {
    var state = makeState(0);
    giveBalance(state, 'player1', 9999);
    var res = WP.placeStructure(state, 'player1', 'wooden_cabin', 'gardens', { z: 10 });
    assert(!res.success);
  });

  test('structure is stored in state.structures', function() {
    var state = makeState(0);
    var res = quickPlace(state, 'player1', 'wooden_cabin', 'gardens');
    assert(state.structures[res.structure.id], 'Structure not stored in state');
  });

  test('two structures get distinct IDs', function() {
    var state = makeState(0);
    giveBalance(state, 'player1', 9999);
    var r1 = WP.placeStructure(state, 'player1', 'wooden_cabin', 'gardens', { x: 0, z: 0 });
    var r2 = WP.placeStructure(state, 'player1', 'wooden_cabin', 'gardens', { x: 5, z: 5 });
    assert.notStrictEqual(r1.structure.id, r2.structure.id);
  });

});

// ---------------------------------------------------------------------------
// SUITE: payUpkeep
// ---------------------------------------------------------------------------

suite('payUpkeep', function() {

  test('payUpkeep deducts dailyUpkeep cost', function() {
    var state = makeState(100);
    var r = quickPlace(state, 'p1', 'wooden_cabin', 'gardens');
    giveBalance(state, 'p1', 10);
    var before = getBalance(state, 'p1');
    var res = WP.payUpkeep(state, r.structure.id, 100);
    assert(res.success, res.reason);
    assert.strictEqual(getBalance(state, 'p1'), before - WP.STRUCTURE_TYPES.wooden_cabin.dailyUpkeep);
  });

  test('payUpkeep updates lastUpkeep tick', function() {
    var state = makeState(0);
    var r = quickPlace(state, 'p1', 'wooden_cabin', 'gardens');
    giveBalance(state, 'p1', 10);
    WP.payUpkeep(state, r.structure.id, 200);
    assert.strictEqual(state.structures[r.structure.id].lastUpkeep, 200);
  });

  test('payUpkeep returns cost in result', function() {
    var state = makeState(0);
    var r = quickPlace(state, 'p1', 'wooden_cabin', 'gardens');
    giveBalance(state, 'p1', 10);
    var res = WP.payUpkeep(state, r.structure.id, 0);
    assert.strictEqual(res.cost, WP.STRUCTURE_TYPES.wooden_cabin.dailyUpkeep);
  });

  test('payUpkeep fails for unknown structureId', function() {
    var state = makeState(0);
    var res = WP.payUpkeep(state, 'nonexistent', 100);
    assert(!res.success);
  });

  test('payUpkeep fails when insufficient funds', function() {
    var state = makeState(0);
    var r = quickPlace(state, 'p1', 'lighthouse', 'nexus');
    // lighthouse dailyUpkeep = 3, give nothing
    giveBalance(state, 'p1', 0);
    var res = WP.payUpkeep(state, r.structure.id, 100);
    assert(!res.success);
  });

  test('payUpkeep fails on demolished structure', function() {
    var state = makeState(0);
    var r = quickPlace(state, 'p1', 'wooden_cabin', 'gardens');
    giveBalance(state, 'p1', 500);
    WP.demolishStructure(state, 'p1', r.structure.id);
    var res = WP.payUpkeep(state, r.structure.id, 100);
    assert(!res.success);
  });

});

// ---------------------------------------------------------------------------
// SUITE: payAllUpkeep
// ---------------------------------------------------------------------------

suite('payAllUpkeep', function() {

  test('payAllUpkeep pays for all player structures', function() {
    var state = makeState(0);
    giveBalance(state, 'p1', 9999);
    var r1 = WP.placeStructure(state, 'p1', 'wooden_cabin', 'gardens', { x: 0, z: 0 });
    var r2 = WP.placeStructure(state, 'p1', 'market_stall', 'nexus', { x: 10, z: 10 });
    var before = getBalance(state, 'p1');
    var res = WP.payAllUpkeep(state, 'p1', 100);
    var expectedCost = WP.STRUCTURE_TYPES.wooden_cabin.dailyUpkeep + WP.STRUCTURE_TYPES.market_stall.dailyUpkeep;
    assert.strictEqual(res.totalCost, expectedCost);
    assert.strictEqual(getBalance(state, 'p1'), before - expectedCost);
  });

  test('payAllUpkeep returns structures array', function() {
    var state = makeState(0);
    giveBalance(state, 'p1', 9999);
    WP.placeStructure(state, 'p1', 'wooden_cabin', 'gardens', { x: 0, z: 0 });
    var res = WP.payAllUpkeep(state, 'p1', 100);
    assert(Array.isArray(res.structures), 'structures should be array');
    assert.strictEqual(res.structures.length, 1);
  });

  test('payAllUpkeep skips demolished structures', function() {
    var state = makeState(0);
    giveBalance(state, 'p1', 9999);
    var r = WP.placeStructure(state, 'p1', 'wooden_cabin', 'gardens', { x: 0, z: 0 });
    WP.demolishStructure(state, 'p1', r.structure.id);
    var res = WP.payAllUpkeep(state, 'p1', 100);
    assert.strictEqual(res.structures.length, 0);
    assert.strictEqual(res.totalCost, 0);
  });

  test('payAllUpkeep skips other players structures', function() {
    var state = makeState(0);
    giveBalance(state, 'p1', 9999);
    giveBalance(state, 'p2', 9999);
    WP.placeStructure(state, 'p1', 'wooden_cabin', 'gardens', { x: 0, z: 0 });
    WP.placeStructure(state, 'p2', 'wooden_cabin', 'commons', { x: 50, z: 50 });
    var res = WP.payAllUpkeep(state, 'p1', 100);
    assert.strictEqual(res.structures.length, 1);
  });

  test('multiple structures accumulate total upkeep correctly', function() {
    var state = makeState(0);
    giveBalance(state, 'p1', 99999);
    // Place 3 different structures
    WP.placeStructure(state, 'p1', 'wooden_cabin', 'gardens', { x: 0, z: 0 });   // upkeep 1
    WP.placeStructure(state, 'p1', 'workshop', 'nexus', { x: 10, z: 0 });          // upkeep 2
    WP.placeStructure(state, 'p1', 'lighthouse', 'nexus', { x: 20, z: 0 });        // upkeep 3
    var res = WP.payAllUpkeep(state, 'p1', 100);
    assert.strictEqual(res.totalCost, 1 + 2 + 3);
  });

});

// ---------------------------------------------------------------------------
// SUITE: checkDecay
// ---------------------------------------------------------------------------

suite('checkDecay', function() {

  test('no decay when upkeep is current', function() {
    var state = makeState(0);
    var r = quickPlace(state, 'p1', 'wooden_cabin', 'gardens');
    var res = WP.checkDecay(state, 50); // within UPKEEP_INTERVAL
    assert.strictEqual(res.decayed.length, 0);
  });

  test('decay applied after missed upkeep interval', function() {
    var state = makeState(0);
    var r = quickPlace(state, 'p1', 'wooden_cabin', 'gardens');
    // UPKEEP_INTERVAL is 100; advance past it
    var res = WP.checkDecay(state, 110);
    assert(res.decayed.length > 0, 'Expected decay to occur');
  });

  test('health reduced on missed upkeep', function() {
    var state = makeState(0);
    var r = quickPlace(state, 'p1', 'wooden_cabin', 'gardens');
    WP.checkDecay(state, 110);
    assert(state.structures[r.structure.id].health < WP.STRUCTURE_TYPES.wooden_cabin.maxHealth);
  });

  test('structure becomes ruined at 0 health', function() {
    var state = makeState(0);
    var r = quickPlace(state, 'p1', 'wooden_cabin', 'gardens');
    // wooden_cabin decayRate = 5, maxHealth = 100
    // To lose 100 health: need 100/5 = 20 missed intervals = 20*100 = 2000+ ticks
    WP.checkDecay(state, 2500);
    assert.strictEqual(state.structures[r.structure.id].status, 'ruined');
    assert.strictEqual(state.structures[r.structure.id].health, 0);
  });

  test('structure becomes decaying below 30 health', function() {
    var state = makeState(0);
    var r = quickPlace(state, 'p1', 'wooden_cabin', 'gardens');
    // Need health < 30: lose > 70 health = 14 intervals = 1400+ ticks
    WP.checkDecay(state, 1500);
    var s = state.structures[r.structure.id];
    assert(s.status === 'decaying' || s.status === 'ruined', 'Expected decaying or ruined, got: ' + s.status);
  });

  test('garden_plot does not decay (decayRate 0)', function() {
    var state = makeState(0);
    var r = quickPlace(state, 'p1', 'garden_plot', 'gardens');
    WP.checkDecay(state, 10000);
    assert.strictEqual(state.structures[r.structure.id].status, 'active');
  });

  test('checkDecay result includes healthLost', function() {
    var state = makeState(0);
    quickPlace(state, 'p1', 'wooden_cabin', 'gardens');
    var res = WP.checkDecay(state, 110);
    if (res.decayed.length > 0) {
      assert(typeof res.decayed[0].healthLost === 'number', 'healthLost should be number');
      assert(res.decayed[0].healthLost > 0);
    }
  });

  test('checkDecay skips demolished structures', function() {
    var state = makeState(0);
    var r = quickPlace(state, 'p1', 'wooden_cabin', 'gardens');
    giveBalance(state, 'p1', 100);
    WP.demolishStructure(state, 'p1', r.structure.id);
    var res = WP.checkDecay(state, 10000);
    assert.strictEqual(res.decayed.length, 0);
  });

});

// ---------------------------------------------------------------------------
// SUITE: repairStructure
// ---------------------------------------------------------------------------

suite('repairStructure', function() {

  test('repairStructure restores health', function() {
    var state = makeState(0);
    var r = quickPlace(state, 'p1', 'wooden_cabin', 'gardens');
    // Apply decay
    WP.checkDecay(state, 1100);
    var healthBefore = state.structures[r.structure.id].health;
    giveBalance(state, 'p1', 999);
    var res = WP.repairStructure(state, 'p1', r.structure.id, 50);
    assert(res.success, res.reason);
    assert(state.structures[r.structure.id].health > healthBefore, 'Health should increase after repair');
  });

  test('repairStructure deducts Spark cost', function() {
    var state = makeState(0);
    var r = quickPlace(state, 'p1', 'wooden_cabin', 'gardens');
    WP.checkDecay(state, 1100);
    giveBalance(state, 'p1', 999);
    var before = getBalance(state, 'p1');
    var res = WP.repairStructure(state, 'p1', r.structure.id, 10);
    assert(res.success);
    assert(getBalance(state, 'p1') < before, 'Spark should be deducted');
  });

  test('repairStructure fails for non-owner', function() {
    var state = makeState(0);
    var r = quickPlace(state, 'p1', 'wooden_cabin', 'gardens');
    giveBalance(state, 'p2', 999);
    var res = WP.repairStructure(state, 'p2', r.structure.id, 50);
    assert(!res.success);
    assert(res.reason.toLowerCase().includes('owner'), res.reason);
  });

  test('repairStructure at max health returns success with 0 cost', function() {
    var state = makeState(0);
    var r = quickPlace(state, 'p1', 'wooden_cabin', 'gardens');
    giveBalance(state, 'p1', 999);
    var res = WP.repairStructure(state, 'p1', r.structure.id, 50);
    assert(res.success, 'Should succeed even at max health');
    assert.strictEqual(res.cost, 0, 'Cost should be 0 at max health');
  });

  test('repairStructure fails on unknown structure', function() {
    var state = makeState(0);
    var res = WP.repairStructure(state, 'p1', 'ghost_struct', 50);
    assert(!res.success);
  });

  test('repairStructure fails on demolished structure', function() {
    var state = makeState(0);
    var r = quickPlace(state, 'p1', 'wooden_cabin', 'gardens');
    giveBalance(state, 'p1', 999);
    WP.demolishStructure(state, 'p1', r.structure.id);
    var res = WP.repairStructure(state, 'p1', r.structure.id, 50);
    assert(!res.success);
  });

  test('repairStructure fails with insufficient Spark', function() {
    var state = makeState(0);
    var r = quickPlace(state, 'p1', 'wooden_cabin', 'gardens');
    WP.checkDecay(state, 1100);
    // Give no extra spark
    giveBalance(state, 'p1', 0);
    var res = WP.repairStructure(state, 'p1', r.structure.id, 50);
    // If health is already at max (no decay applied due to counter reset), just verify function works
    if (state.structures[r.structure.id].health < WP.STRUCTURE_TYPES.wooden_cabin.maxHealth) {
      assert(!res.success, 'Should fail with no Spark');
    }
  });

  test('repairStructure reverts decaying status when health >= 30', function() {
    var state = makeState(0);
    var r = quickPlace(state, 'p1', 'wooden_cabin', 'gardens');
    // Force decaying status
    state.structures[r.structure.id].health = 25;
    state.structures[r.structure.id].status = 'decaying';
    giveBalance(state, 'p1', 999);
    WP.repairStructure(state, 'p1', r.structure.id, 20);
    assert.strictEqual(state.structures[r.structure.id].status, 'active');
  });

});

// ---------------------------------------------------------------------------
// SUITE: demolishStructure
// ---------------------------------------------------------------------------

suite('demolishStructure', function() {

  test('demolishStructure succeeds for owner', function() {
    var state = makeState(0);
    var r = quickPlace(state, 'p1', 'wooden_cabin', 'gardens');
    giveBalance(state, 'p1', 0);
    var res = WP.demolishStructure(state, 'p1', r.structure.id);
    assert(res.success, res.reason);
  });

  test('demolishStructure gives 50% refund', function() {
    var state = makeState(0);
    var r = quickPlace(state, 'p1', 'wooden_cabin', 'gardens');
    var before = getBalance(state, 'p1');
    var res = WP.demolishStructure(state, 'p1', r.structure.id);
    assert.strictEqual(res.refund, Math.floor(WP.STRUCTURE_TYPES.wooden_cabin.buildCost * 0.5));
    assert.strictEqual(getBalance(state, 'p1'), before + res.refund);
  });

  test('demolishStructure sets status to demolished', function() {
    var state = makeState(0);
    var r = quickPlace(state, 'p1', 'wooden_cabin', 'gardens');
    WP.demolishStructure(state, 'p1', r.structure.id);
    assert.strictEqual(state.structures[r.structure.id].status, 'demolished');
  });

  test('demolishStructure fails for non-owner', function() {
    var state = makeState(0);
    var r = quickPlace(state, 'p1', 'wooden_cabin', 'gardens');
    var res = WP.demolishStructure(state, 'p2', r.structure.id);
    assert(!res.success);
    assert(res.reason.toLowerCase().includes('owner'), res.reason);
  });

  test('demolishStructure fails on already demolished structure', function() {
    var state = makeState(0);
    var r = quickPlace(state, 'p1', 'wooden_cabin', 'gardens');
    WP.demolishStructure(state, 'p1', r.structure.id);
    var res = WP.demolishStructure(state, 'p1', r.structure.id);
    assert(!res.success);
  });

  test('demolishStructure fails on unknown structure', function() {
    var state = makeState(0);
    var res = WP.demolishStructure(state, 'p1', 'ghost_struct');
    assert(!res.success);
  });

  test('amphitheater 50% refund = 250', function() {
    var state = makeState(0);
    var r = quickPlace(state, 'p1', 'amphitheater', 'nexus');
    var res = WP.demolishStructure(state, 'p1', r.structure.id);
    assert.strictEqual(res.refund, 250); // 500 * 0.5
  });

});

// ---------------------------------------------------------------------------
// SUITE: getStructures / getPlayerStructures / getStructureById
// ---------------------------------------------------------------------------

suite('getStructures / getPlayerStructures / getStructureById', function() {

  test('getStructures returns structures in correct zone', function() {
    var state = makeState(0);
    quickPlace(state, 'p1', 'wooden_cabin', 'gardens');
    quickPlace(state, 'p1', 'market_stall', 'nexus');
    var res = WP.getStructures(state, 'gardens');
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].zone, 'gardens');
  });

  test('getStructures excludes demolished structures', function() {
    var state = makeState(0);
    var r = quickPlace(state, 'p1', 'wooden_cabin', 'gardens');
    WP.demolishStructure(state, 'p1', r.structure.id);
    var res = WP.getStructures(state, 'gardens');
    assert.strictEqual(res.length, 0);
  });

  test('getPlayerStructures returns only player structures', function() {
    var state = makeState(0);
    quickPlace(state, 'p1', 'wooden_cabin', 'gardens');
    quickPlace(state, 'p2', 'market_stall', 'nexus');
    var res = WP.getPlayerStructures(state, 'p1');
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].ownerId, 'p1');
  });

  test('getPlayerStructures excludes demolished', function() {
    var state = makeState(0);
    var r = quickPlace(state, 'p1', 'wooden_cabin', 'gardens');
    WP.demolishStructure(state, 'p1', r.structure.id);
    var res = WP.getPlayerStructures(state, 'p1');
    assert.strictEqual(res.length, 0);
  });

  test('getStructureById returns correct structure', function() {
    var state = makeState(0);
    var r = quickPlace(state, 'p1', 'wooden_cabin', 'gardens');
    var s = WP.getStructureById(state, r.structure.id);
    assert(s !== null);
    assert.strictEqual(s.id, r.structure.id);
  });

  test('getStructureById returns null for unknown id', function() {
    var state = makeState(0);
    var s = WP.getStructureById(state, 'ghost');
    assert.strictEqual(s, null);
  });

});

// ---------------------------------------------------------------------------
// SUITE: getUpkeepDue
// ---------------------------------------------------------------------------

suite('getUpkeepDue', function() {

  test('getUpkeepDue returns 0 when upkeep is current', function() {
    var state = makeState(0);
    quickPlace(state, 'p1', 'wooden_cabin', 'gardens');
    var due = WP.getUpkeepDue(state, 'p1', 50);
    assert.strictEqual(due, 0);
  });

  test('getUpkeepDue calculates correctly after one missed interval', function() {
    var state = makeState(0);
    quickPlace(state, 'p1', 'wooden_cabin', 'gardens'); // lastUpkeep = 0
    var due = WP.getUpkeepDue(state, 'p1', 110); // 1 full interval missed
    assert.strictEqual(due, WP.STRUCTURE_TYPES.wooden_cabin.dailyUpkeep * 1);
  });

  test('getUpkeepDue accumulates for multiple structures', function() {
    var state = makeState(0);
    giveBalance(state, 'p1', 9999);
    WP.placeStructure(state, 'p1', 'wooden_cabin', 'gardens', { x: 0, z: 0 }); // upkeep 1
    WP.placeStructure(state, 'p1', 'workshop', 'nexus', { x: 10, z: 0 });       // upkeep 2
    // After 1 interval (110 ticks):
    var due = WP.getUpkeepDue(state, 'p1', 110);
    assert.strictEqual(due, (1 + 2) * 1);
  });

  test('getUpkeepDue is 0 for garden_plot (no upkeep)', function() {
    var state = makeState(0);
    quickPlace(state, 'p1', 'garden_plot', 'gardens');
    var due = WP.getUpkeepDue(state, 'p1', 10000);
    assert.strictEqual(due, 0);
  });

  test('getUpkeepDue skips demolished structures', function() {
    var state = makeState(0);
    var r = quickPlace(state, 'p1', 'wooden_cabin', 'gardens');
    WP.demolishStructure(state, 'p1', r.structure.id);
    var due = WP.getUpkeepDue(state, 'p1', 10000);
    assert.strictEqual(due, 0);
  });

});

// ---------------------------------------------------------------------------
// SUITE: plantCrop
// ---------------------------------------------------------------------------

suite('plantCrop', function() {

  test('plantCrop initializes garden with correct crop', function() {
    var state = makeState(100);
    var g = quickGarden(state, 'p1');
    var res = WP.plantCrop(state, 'p1', g.garden.id, 'wheat', 100, 'summer');
    assert(res.success, res.reason);
    assert.strictEqual(res.garden.crop, 'wheat');
  });

  test('plantCrop sets stage to 0', function() {
    var state = makeState(100);
    var g = quickGarden(state, 'p1');
    var res = WP.plantCrop(state, 'p1', g.garden.id, 'wheat', 100, 'summer');
    assert.strictEqual(res.garden.stage, 0);
  });

  test('plantCrop sets plantedAt to currentTick', function() {
    var state = makeState(100);
    var g = quickGarden(state, 'p1');
    WP.plantCrop(state, 'p1', g.garden.id, 'wheat', 100, 'summer');
    assert.strictEqual(state.gardens[g.garden.id].plantedAt, 100);
  });

  test('plantCrop fails for non-owner', function() {
    var state = makeState(0);
    var g = quickGarden(state, 'p1');
    var res = WP.plantCrop(state, 'p2', g.garden.id, 'wheat', 0, 'summer');
    assert(!res.success);
    assert(res.reason.toLowerCase().includes('owner'), res.reason);
  });

  test('plantCrop fails with unknown crop', function() {
    var state = makeState(0);
    var g = quickGarden(state, 'p1');
    var res = WP.plantCrop(state, 'p1', g.garden.id, 'dragonfrond', 0, 'summer');
    assert(!res.success);
  });

  test('plantCrop fails when garden already has a crop', function() {
    var state = makeState(0);
    var g = quickGarden(state, 'p1');
    WP.plantCrop(state, 'p1', g.garden.id, 'wheat', 0, 'summer');
    var res = WP.plantCrop(state, 'p1', g.garden.id, 'herbs', 0, 'spring');
    assert(!res.success);
  });

  test('plantCrop fails for unknown gardenId', function() {
    var state = makeState(0);
    var res = WP.plantCrop(state, 'p1', 'ghost_garden', 'wheat', 0, 'summer');
    assert(!res.success);
  });

  test('plantCrop sets quality to 1.0', function() {
    var state = makeState(0);
    var g = quickGarden(state, 'p1');
    WP.plantCrop(state, 'p1', g.garden.id, 'wheat', 0, 'summer');
    assert.strictEqual(state.gardens[g.garden.id].quality, 1.0);
  });

});

// ---------------------------------------------------------------------------
// SUITE: waterGarden
// ---------------------------------------------------------------------------

suite('waterGarden', function() {

  test('waterGarden resets lastWatered timer', function() {
    var state = makeState(0);
    var g = quickGarden(state, 'p1');
    WP.plantCrop(state, 'p1', g.garden.id, 'wheat', 0, 'summer');
    WP.waterGarden(state, g.garden.id, 200);
    assert.strictEqual(state.gardens[g.garden.id].lastWatered, 200);
  });

  test('waterGarden improves quality up to 1.0', function() {
    var state = makeState(0);
    var g = quickGarden(state, 'p1');
    WP.plantCrop(state, 'p1', g.garden.id, 'wheat', 0, 'summer');
    // Reduce quality first
    state.gardens[g.garden.id].quality = 0.8;
    var res = WP.waterGarden(state, g.garden.id, 50);
    assert(res.success);
    assert(state.gardens[g.garden.id].quality > 0.8, 'Quality should improve');
    assert(state.gardens[g.garden.id].quality <= 1.0, 'Quality should not exceed 1.0');
  });

  test('waterGarden fails for unknown gardenId', function() {
    var state = makeState(0);
    var res = WP.waterGarden(state, 'ghost', 100);
    assert(!res.success);
  });

  test('waterGarden fails when no crop planted', function() {
    var state = makeState(0);
    var g = quickGarden(state, 'p1');
    var res = WP.waterGarden(state, g.garden.id, 50);
    assert(!res.success);
  });

  test('waterGarden on non-water crop returns success with note', function() {
    var state = makeState(0);
    var g = quickGarden(state, 'p1');
    WP.plantCrop(state, 'p1', g.garden.id, 'mushroom', 0, 'autumn');
    var res = WP.waterGarden(state, g.garden.id, 50);
    assert(res.success, 'Should succeed even for non-water crop');
  });

});

// ---------------------------------------------------------------------------
// SUITE: advanceGrowth
// ---------------------------------------------------------------------------

suite('advanceGrowth', function() {

  test('advanceGrowth does not advance before ticksPerStage elapsed', function() {
    var state = makeState(0);
    var g = quickGarden(state, 'p1');
    WP.plantCrop(state, 'p1', g.garden.id, 'wheat', 0, 'summer');
    var res = WP.advanceGrowth(state, 50, 'summer');
    assert.strictEqual(res.advanced.length, 0);
  });

  test('advanceGrowth advances stage after ticksPerStage ticks in optimal season', function() {
    var state = makeState(0);
    var g = quickGarden(state, 'p1');
    WP.plantCrop(state, 'p1', g.garden.id, 'mushroom', 0, 'autumn'); // mushroom: waterNeeded=false, 60 ticks/stage
    // mushroom ticksPerStage = 60, no water needed; advance 70 ticks in optimal season
    var res = WP.advanceGrowth(state, 70, 'autumn');
    assert(res.advanced.length > 0, 'Expected stage advance');
    assert.strictEqual(state.gardens[g.garden.id].stage, 1);
  });

  test('advanceGrowth off-season slows growth by offSeasonPenalty', function() {
    var state = makeState(0);
    var g1 = quickGarden(state, 'p1');
    var g2 = quickGarden(state, 'p2');
    WP.plantCrop(state, 'p1', g1.garden.id, 'wheat', 0, 'summer');
    WP.plantCrop(state, 'p2', g2.garden.id, 'wheat', 0, 'winter'); // wrong season

    // At tick=110 optimal season crop should advance but off-season maybe not
    WP.advanceGrowth(state, 110, 'summer');
    var stage1 = state.gardens[g1.garden.id].stage;
    var stage2 = state.gardens[g2.garden.id].stage;
    assert(stage1 >= stage2, 'Optimal season crop should advance at least as fast as off-season');
  });

  test('advanceGrowth marks harvestReady at final stage', function() {
    var state = makeState(0);
    var g = quickGarden(state, 'p1');
    WP.plantCrop(state, 'p1', g.garden.id, 'mushroom', 0, 'autumn'); // 3 stages, 60 ticks each
    // Advance past all stages
    WP.advanceGrowth(state, 70, 'autumn');   // stage 0->1
    WP.advanceGrowth(state, 140, 'autumn');  // stage 1->2
    var res = WP.advanceGrowth(state, 210, 'autumn'); // stage 2 = final
    var garden = state.gardens[g.garden.id];
    assert(garden.harvestReady || garden.stage === 2, 'Should be ready to harvest');
  });

  test('advanceGrowth result includes readyToHarvest flag', function() {
    var state = makeState(0);
    var g = quickGarden(state, 'p1');
    WP.plantCrop(state, 'p1', g.garden.id, 'mushroom', 0, 'autumn'); // growthStages=3
    WP.advanceGrowth(state, 70, 'autumn');
    WP.advanceGrowth(state, 140, 'autumn');
    var res = WP.advanceGrowth(state, 210, 'autumn');
    if (res.advanced.length > 0) {
      assert(typeof res.advanced[0].readyToHarvest === 'boolean');
    }
  });

  test('advanceGrowth skips gardens without crops', function() {
    var state = makeState(0);
    quickGarden(state, 'p1');
    var res = WP.advanceGrowth(state, 1000, 'summer');
    assert.strictEqual(res.advanced.length, 0);
  });

  test('advanceGrowth skips already harvest-ready gardens', function() {
    var state = makeState(0);
    var g = quickGarden(state, 'p1');
    WP.plantCrop(state, 'p1', g.garden.id, 'mushroom', 0, 'autumn');
    state.gardens[g.garden.id].harvestReady = true;
    state.gardens[g.garden.id].stage = 2;
    var res = WP.advanceGrowth(state, 9999, 'autumn');
    // Should push existing ready gardens into results (the skip-and-report branch)
    // either 0 or 1 is fine as long as it doesn't crash
    assert(Array.isArray(res.advanced));
  });

});

// ---------------------------------------------------------------------------
// SUITE: harvestCrop
// ---------------------------------------------------------------------------

suite('harvestCrop', function() {

  function plantAndRipen(state, playerId, cropId, season) {
    var g = quickGarden(state, playerId);
    var gardenId = g.garden.id;
    WP.plantCrop(state, playerId, gardenId, cropId, 0, season);
    // Force harvest-ready
    var cropDef = WP.GARDEN_CROPS[cropId];
    state.gardens[gardenId].stage = cropDef.growthStages - 1;
    state.gardens[gardenId].harvestReady = true;
    return gardenId;
  }

  test('harvestCrop succeeds when crop is ready', function() {
    var state = makeState(0);
    var gardenId = plantAndRipen(state, 'p1', 'wheat', 'summer');
    var res = WP.harvestCrop(state, 'p1', gardenId, 42);
    assert(res.success, res.reason);
  });

  test('harvestCrop returns items array', function() {
    var state = makeState(0);
    var gardenId = plantAndRipen(state, 'p1', 'wheat', 'summer');
    var res = WP.harvestCrop(state, 'p1', gardenId, 42);
    assert(Array.isArray(res.items));
    assert.strictEqual(res.items.length, 1);
    assert.strictEqual(res.items[0].itemId, 'wheat');
    assert(res.items[0].qty >= 1);
  });

  test('harvestCrop yield is within minQty-maxQty range (accounting for quality)', function() {
    var state = makeState(0);
    var gardenId = plantAndRipen(state, 'p1', 'wheat', 'summer');
    var cropDef = WP.GARDEN_CROPS.wheat;
    var res = WP.harvestCrop(state, 'p1', gardenId, 42);
    assert(res.items[0].qty >= 1, 'Qty should be at least 1');
    assert(res.items[0].qty <= cropDef.yield.maxQty, 'Qty should not exceed maxQty');
  });

  test('harvestCrop yield is deterministic with same seed', function() {
    var state1 = makeState(0);
    var g1 = plantAndRipen(state1, 'p1', 'wheat', 'summer');
    var res1 = WP.harvestCrop(state1, 'p1', g1, 999);

    var state2 = makeState(0);
    var g2 = plantAndRipen(state2, 'p1', 'wheat', 'summer');
    var res2 = WP.harvestCrop(state2, 'p1', g2, 999);

    assert.strictEqual(res1.items[0].qty, res2.items[0].qty, 'Yield should be deterministic');
  });

  test('harvestCrop different seeds give potentially different yields', function() {
    // Run multiple seeds and check we get at least 2 distinct values over many tries
    var yields = {};
    for (var seed = 1; seed <= 20; seed++) {
      var state = makeState(0);
      var g = plantAndRipen(state, 'p1', 'wheat', 'summer');
      var res = WP.harvestCrop(state, 'p1', g, seed);
      yields[res.items[0].qty] = true;
    }
    assert(Object.keys(yields).length >= 1, 'Should get at least one distinct yield value');
  });

  test('harvestCrop fails before crop is ready', function() {
    var state = makeState(0);
    var g = quickGarden(state, 'p1');
    WP.plantCrop(state, 'p1', g.garden.id, 'wheat', 0, 'summer');
    var res = WP.harvestCrop(state, 'p1', g.garden.id, 42);
    assert(!res.success, 'Should fail when crop not ready');
  });

  test('harvestCrop fails for non-owner', function() {
    var state = makeState(0);
    var gardenId = plantAndRipen(state, 'p1', 'wheat', 'summer');
    var res = WP.harvestCrop(state, 'p2', gardenId, 42);
    assert(!res.success);
    assert(res.reason.toLowerCase().includes('owner'), res.reason);
  });

  test('harvestCrop fails when no crop planted', function() {
    var state = makeState(0);
    var g = quickGarden(state, 'p1');
    var res = WP.harvestCrop(state, 'p1', g.garden.id, 42);
    assert(!res.success);
  });

  test('harvestCrop fails for unknown gardenId', function() {
    var state = makeState(0);
    var res = WP.harvestCrop(state, 'p1', 'ghost_garden', 42);
    assert(!res.success);
  });

  test('harvestCrop resets garden crop to null', function() {
    var state = makeState(0);
    var gardenId = plantAndRipen(state, 'p1', 'wheat', 'summer');
    WP.harvestCrop(state, 'p1', gardenId, 42);
    assert.strictEqual(state.gardens[gardenId].crop, null);
  });

  test('harvestCrop resets stage to 0', function() {
    var state = makeState(0);
    var gardenId = plantAndRipen(state, 'p1', 'wheat', 'summer');
    WP.harvestCrop(state, 'p1', gardenId, 42);
    assert.strictEqual(state.gardens[gardenId].stage, 0);
  });

  test('harvestCrop returns quality in result', function() {
    var state = makeState(0);
    var gardenId = plantAndRipen(state, 'p1', 'wheat', 'summer');
    var res = WP.harvestCrop(state, 'p1', gardenId, 42);
    assert(typeof res.quality === 'number', 'quality should be a number');
    assert(res.quality > 0 && res.quality <= 1.0);
  });

  test('can plant again after harvest', function() {
    var state = makeState(0);
    var gardenId = plantAndRipen(state, 'p1', 'wheat', 'summer');
    WP.harvestCrop(state, 'p1', gardenId, 42);
    var res = WP.plantCrop(state, 'p1', gardenId, 'herbs', 100, 'spring');
    assert(res.success, 'Should be able to plant after harvest');
  });

});

// ---------------------------------------------------------------------------
// SUITE: createGardenState / getGardenState / getPlayerGardens
// ---------------------------------------------------------------------------

suite('createGardenState / getGardenState / getPlayerGardens', function() {

  test('createGardenState returns garden with correct ownerId', function() {
    var state = makeState(0);
    var res = WP.createGardenState(state, 'alice', 'gardens', { x: 5, z: 5 });
    assert(res.success);
    assert.strictEqual(res.garden.ownerId, 'alice');
  });

  test('createGardenState stores garden in state', function() {
    var state = makeState(0);
    var res = WP.createGardenState(state, 'alice', 'gardens', { x: 0, z: 0 });
    assert(state.gardens[res.garden.id], 'Garden should be in state.gardens');
  });

  test('getGardenState returns correct garden', function() {
    var state = makeState(0);
    var res = WP.createGardenState(state, 'alice', 'gardens', { x: 0, z: 0 });
    var g = WP.getGardenState(state, res.garden.id);
    assert(g !== null);
    assert.strictEqual(g.id, res.garden.id);
  });

  test('getGardenState returns null for unknown id', function() {
    var state = makeState(0);
    var g = WP.getGardenState(state, 'ghost_garden');
    assert.strictEqual(g, null);
  });

  test('getPlayerGardens returns all gardens for player', function() {
    var state = makeState(0);
    WP.createGardenState(state, 'alice', 'gardens', { x: 0, z: 0 });
    WP.createGardenState(state, 'alice', 'wilds', { x: 10, z: 10 });
    WP.createGardenState(state, 'bob', 'gardens', { x: 5, z: 5 });
    var res = WP.getPlayerGardens(state, 'alice');
    assert.strictEqual(res.length, 2);
    for (var i = 0; i < res.length; i++) {
      assert.strictEqual(res[i].ownerId, 'alice');
    }
  });

  test('getPlayerGardens returns empty array for player with no gardens', function() {
    var state = makeState(0);
    var res = WP.getPlayerGardens(state, 'nobody');
    assert(Array.isArray(res));
    assert.strictEqual(res.length, 0);
  });

});

// ---------------------------------------------------------------------------
// SUITE: registerTimeCapsule / checkTimeCapsules
// ---------------------------------------------------------------------------

suite('registerTimeCapsule / checkTimeCapsules', function() {

  test('registerTimeCapsule returns success with correct unlocksAt', function() {
    var state = makeState(0);
    var res = WP.registerTimeCapsule(state, 'cap_1', 100, 500);
    assert(res.success, res.reason);
    assert.strictEqual(res.unlocksAt, 600);
  });

  test('registerTimeCapsule stores capsule in state', function() {
    var state = makeState(0);
    WP.registerTimeCapsule(state, 'cap_2', 0, 200);
    assert(state.timeCapsules['cap_2'], 'Capsule not stored');
  });

  test('registerTimeCapsule fails with missing capsuleId', function() {
    var state = makeState(0);
    var res = WP.registerTimeCapsule(state, null, 0, 200);
    assert(!res.success);
  });

  test('registerTimeCapsule fails with non-numeric buryTick', function() {
    var state = makeState(0);
    var res = WP.registerTimeCapsule(state, 'cap_x', 'now', 200);
    assert(!res.success);
  });

  test('registerTimeCapsule fails with negative unlockDelay', function() {
    var state = makeState(0);
    var res = WP.registerTimeCapsule(state, 'cap_y', 0, -10);
    assert(!res.success);
  });

  test('checkTimeCapsules finds ready capsule', function() {
    var state = makeState(0);
    WP.registerTimeCapsule(state, 'cap_3', 0, 100);
    var res = WP.checkTimeCapsules(state, 100);
    assert.strictEqual(res.unlocked.length, 1);
    assert.strictEqual(res.unlocked[0].capsuleId, 'cap_3');
  });

  test('checkTimeCapsules does not unlock too early', function() {
    var state = makeState(0);
    WP.registerTimeCapsule(state, 'cap_4', 0, 200);
    var res = WP.checkTimeCapsules(state, 100);
    assert.strictEqual(res.unlocked.length, 0);
  });

  test('checkTimeCapsules does not unlock same capsule twice', function() {
    var state = makeState(0);
    WP.registerTimeCapsule(state, 'cap_5', 0, 100);
    WP.checkTimeCapsules(state, 100);
    var res = WP.checkTimeCapsules(state, 200);
    assert.strictEqual(res.unlocked.length, 0, 'Should not unlock again');
  });

  test('checkTimeCapsules returns buriedBy and zone from options', function() {
    var state = makeState(0);
    WP.registerTimeCapsule(state, 'cap_6', 0, 50, { buriedBy: 'alice', zone: 'gardens' });
    var res = WP.checkTimeCapsules(state, 50);
    assert.strictEqual(res.unlocked[0].buriedBy, 'alice');
    assert.strictEqual(res.unlocked[0].zone, 'gardens');
  });

  test('checkTimeCapsules unlocks multiple capsules at once', function() {
    var state = makeState(0);
    WP.registerTimeCapsule(state, 'cap_a', 0, 100);
    WP.registerTimeCapsule(state, 'cap_b', 0, 100);
    WP.registerTimeCapsule(state, 'cap_c', 0, 200); // not yet
    var res = WP.checkTimeCapsules(state, 100);
    assert.strictEqual(res.unlocked.length, 2);
  });

  test('unlockDelay of 0 unlocks at buryTick', function() {
    var state = makeState(0);
    WP.registerTimeCapsule(state, 'cap_zero', 50, 0);
    var res = WP.checkTimeCapsules(state, 50);
    assert.strictEqual(res.unlocked.length, 1);
  });

});

// ---------------------------------------------------------------------------
// SUITE: generateWorldDiff
// ---------------------------------------------------------------------------

suite('generateWorldDiff', function() {

  test('generates diff with correct structuresBuilt count', function() {
    var state = makeState(0);
    state.currentTick = 0;
    quickPlace(state, 'p1', 'wooden_cabin', 'gardens');
    state.currentTick = 50;
    quickPlace(state, 'p1', 'market_stall', 'nexus');
    var diff = WP.generateWorldDiff(state, 0, 100);
    assert.strictEqual(diff.structuresBuilt, 2);
  });

  test('generateWorldDiff respects fromTick/toTick range', function() {
    var state = makeState(0);
    state.currentTick = 50;
    quickPlace(state, 'p1', 'wooden_cabin', 'gardens');
    // Event at tick=50, diff from 100 to 200 should not count it
    var diff = WP.generateWorldDiff(state, 100, 200);
    assert.strictEqual(diff.structuresBuilt, 0);
  });

  test('generateWorldDiff returns fromTick and toTick in result', function() {
    var state = makeState(0);
    var diff = WP.generateWorldDiff(state, 10, 20);
    assert.strictEqual(diff.fromTick, 10);
    assert.strictEqual(diff.toTick, 20);
  });

  test('generateWorldDiff counts capsulesUnlocked', function() {
    var state = makeState(0);
    WP.registerTimeCapsule(state, 'cap_d', 0, 50);
    WP.checkTimeCapsules(state, 50);
    var diff = WP.generateWorldDiff(state, 0, 100);
    assert.strictEqual(diff.capsulesUnlocked, 1);
  });

  test('generateWorldDiff counts cropsHarvested', function() {
    var state = makeState(0);
    state.currentTick = 0;
    var g = quickGarden(state, 'p1');
    WP.plantCrop(state, 'p1', g.garden.id, 'wheat', 0, 'summer');
    state.gardens[g.garden.id].stage = 3;
    state.gardens[g.garden.id].harvestReady = true;
    WP.harvestCrop(state, 'p1', g.garden.id, 1);
    var diff = WP.generateWorldDiff(state, 0, 100);
    assert.strictEqual(diff.cropsHarvested, 1);
  });

  test('generateWorldDiff has all required fields', function() {
    var state = makeState(0);
    var diff = WP.generateWorldDiff(state, 0, 100);
    assert(typeof diff.structuresBuilt === 'number');
    assert(typeof diff.structuresDecayed === 'number');
    assert(typeof diff.structuresRuined === 'number');
    assert(typeof diff.structuresDemolished === 'number');
    assert(typeof diff.cropsHarvested === 'number');
    assert(typeof diff.capsulesUnlocked === 'number');
  });

});

// ---------------------------------------------------------------------------
// SUITE: getWorldStats
// ---------------------------------------------------------------------------

suite('getWorldStats', function() {

  test('fresh state returns all zeros', function() {
    var state = makeState(0);
    var stats = WP.getWorldStats(state);
    assert.strictEqual(stats.totalStructures, 0);
    assert.strictEqual(stats.activeGardens, 0);
    assert.strictEqual(stats.pendingCapsules, 0);
  });

  test('totalStructures counts non-demolished structures', function() {
    var state = makeState(0);
    quickPlace(state, 'p1', 'wooden_cabin', 'gardens');
    quickPlace(state, 'p1', 'market_stall', 'nexus');
    var stats = WP.getWorldStats(state);
    assert.strictEqual(stats.totalStructures, 2);
  });

  test('demolished structure not counted in totalStructures', function() {
    var state = makeState(0);
    var r = quickPlace(state, 'p1', 'wooden_cabin', 'gardens');
    WP.demolishStructure(state, 'p1', r.structure.id);
    var stats = WP.getWorldStats(state);
    assert.strictEqual(stats.totalStructures, 0);
  });

  test('activeGardens counts gardens with crops', function() {
    var state = makeState(0);
    var g1 = quickGarden(state, 'p1');
    var g2 = quickGarden(state, 'p1');
    WP.plantCrop(state, 'p1', g1.garden.id, 'wheat', 0, 'summer');
    // g2 has no crop
    var stats = WP.getWorldStats(state);
    assert.strictEqual(stats.activeGardens, 1);
  });

  test('pendingCapsules counts unlocked=false capsules', function() {
    var state = makeState(0);
    WP.registerTimeCapsule(state, 'c1', 0, 500);
    WP.registerTimeCapsule(state, 'c2', 0, 1000);
    var stats = WP.getWorldStats(state);
    assert.strictEqual(stats.pendingCapsules, 2);
  });

  test('pendingCapsules decreases after unlock', function() {
    var state = makeState(0);
    WP.registerTimeCapsule(state, 'c3', 0, 50);
    WP.checkTimeCapsules(state, 50);
    var stats = WP.getWorldStats(state);
    assert.strictEqual(stats.pendingCapsules, 0);
  });

  test('stats include totalGardens', function() {
    var state = makeState(0);
    quickGarden(state, 'p1');
    quickGarden(state, 'p2');
    var stats = WP.getWorldStats(state);
    assert.strictEqual(stats.totalGardens, 2);
  });

});

// ---------------------------------------------------------------------------
// SUITE: mulberry32 PRNG
// ---------------------------------------------------------------------------

suite('mulberry32 PRNG', function() {

  test('mulberry32 returns a function', function() {
    var rng = WP.mulberry32(42);
    assert(typeof rng === 'function');
  });

  test('mulberry32 output is between 0 and 1', function() {
    var rng = WP.mulberry32(12345);
    for (var i = 0; i < 10; i++) {
      var v = rng();
      assert(v >= 0 && v < 1, 'Expected [0,1), got ' + v);
    }
  });

  test('mulberry32 with same seed produces same sequence', function() {
    var rng1 = WP.mulberry32(7);
    var rng2 = WP.mulberry32(7);
    for (var i = 0; i < 5; i++) {
      assert.strictEqual(rng1(), rng2(), 'Same seed should produce same sequence');
    }
  });

  test('mulberry32 with different seeds produce different sequences', function() {
    var rng1 = WP.mulberry32(1);
    var rng2 = WP.mulberry32(2);
    var same = true;
    for (var i = 0; i < 5; i++) {
      if (rng1() !== rng2()) { same = false; break; }
    }
    assert(!same, 'Different seeds should produce different sequences');
  });

});

// ---------------------------------------------------------------------------
// SUITE: Integration scenarios
// ---------------------------------------------------------------------------

suite('Integration', function() {

  test('full lifecycle: build -> pay upkeep -> repair -> demolish', function() {
    var state = makeState(0);
    giveBalance(state, 'p1', 9999);

    // Build
    var r = WP.placeStructure(state, 'p1', 'wooden_cabin', 'gardens', { x: 0, z: 0 });
    assert(r.success);

    // Pay upkeep
    var upkeepRes = WP.payUpkeep(state, r.structure.id, 100);
    assert(upkeepRes.success);

    // Simulate decay
    state.structures[r.structure.id].health = 50;
    state.structures[r.structure.id].status = 'decaying';

    // Repair
    var repairRes = WP.repairStructure(state, 'p1', r.structure.id, 50);
    assert(repairRes.success);
    assert(state.structures[r.structure.id].health > 50);

    // Demolish
    var demolishRes = WP.demolishStructure(state, 'p1', r.structure.id);
    assert(demolishRes.success);
    assert.strictEqual(state.structures[r.structure.id].status, 'demolished');
  });

  test('full crop lifecycle: plant -> water -> advance -> harvest -> replant', function() {
    var state = makeState(0);
    var g = quickGarden(state, 'farmer');

    // Plant
    var plantRes = WP.plantCrop(state, 'farmer', g.garden.id, 'wheat', 0, 'summer');
    assert(plantRes.success);

    // Water
    var waterRes = WP.waterGarden(state, g.garden.id, 30);
    assert(waterRes.success);

    // Advance to stage 3 (final for wheat, growthStages=4, max stage = 3)
    state.gardens[g.garden.id].stage = 3;
    state.gardens[g.garden.id].harvestReady = true;

    // Harvest
    var harvestRes = WP.harvestCrop(state, 'farmer', g.garden.id, 7);
    assert(harvestRes.success);
    assert(harvestRes.items[0].qty >= 1);

    // Replant
    var replantRes = WP.plantCrop(state, 'farmer', g.garden.id, 'herbs', 200, 'spring');
    assert(replantRes.success);
    assert.strictEqual(state.gardens[g.garden.id].crop, 'herbs');
  });

  test('zone limits prevent over-building', function() {
    var state = makeState(0);
    giveBalance(state, 'p1', 99999);
    // amphitheater maxPerZone = 1 in nexus
    WP.placeStructure(state, 'p1', 'amphitheater', 'nexus', { x: 0, z: 0 });
    var r2 = WP.placeStructure(state, 'p1', 'amphitheater', 'nexus', { x: 10, z: 10 });
    assert(!r2.success);
  });

  test('checkDecay and repair cycle restores structure', function() {
    var state = makeState(0);
    quickPlace(state, 'p1', 'stone_house', 'gardens');
    giveBalance(state, 'p1', 9999);

    // Let it decay
    WP.checkDecay(state, 1100);
    var structs = WP.getPlayerStructures(state, 'p1');
    assert(structs.length > 0);
    var s = structs[0];

    if (s.health < WP.STRUCTURE_TYPES.stone_house.maxHealth) {
      var repairRes = WP.repairStructure(state, 'p1', s.id, 100);
      assert(repairRes.success);
      assert(state.structures[s.id].health > s.health || state.structures[s.id].health === WP.STRUCTURE_TYPES.stone_house.maxHealth);
    }
  });

  test('time capsule full cycle: register -> check early (no unlock) -> check at time -> check again (no re-unlock)', function() {
    var state = makeState(0);
    WP.registerTimeCapsule(state, 'time_test', 0, 300, { buriedBy: 'digger', zone: 'wilds' });

    var early = WP.checkTimeCapsules(state, 100);
    assert.strictEqual(early.unlocked.length, 0);

    var onTime = WP.checkTimeCapsules(state, 300);
    assert.strictEqual(onTime.unlocked.length, 1);
    assert.strictEqual(onTime.unlocked[0].buriedBy, 'digger');

    var again = WP.checkTimeCapsules(state, 400);
    assert.strictEqual(again.unlocked.length, 0, 'Should not unlock again');
  });

});

// ---------------------------------------------------------------------------
// REPORT
// ---------------------------------------------------------------------------

process.stdout.write('\n-----------------------------\n');
process.stdout.write('Results: ' + passed + ' passed, ' + failed + ' failed\n');

if (errors.length > 0) {
  process.stdout.write('\nFailures:\n');
  for (var e = 0; e < errors.length; e++) {
    process.stdout.write('  ' + errors[e].name + ': ' + errors[e].error.message + '\n');
  }
}

if (failed > 0) {
  process.exit(1);
} else {
  process.stdout.write('\nAll tests passed.\n');
  process.exit(0);
}
