/**
 * tests/test_specializations.js
 * 140+ tests for the ZION Specialization system.
 * Tests: data integrity, all 18 specializations, all core functions,
 * mastery progression, respec, bonuses, recipes, perks, edge cases.
 * Run: node tests/test_specializations.js
 */

'use strict';

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
    throw new Error(msg || ('Expected ' + JSON.stringify(b) + ' but got ' + JSON.stringify(a)));
  }
};

assert.ok = function(value, msg) {
  if (!value) {
    throw new Error(msg || ('Expected truthy but got ' + JSON.stringify(value)));
  }
};

assert.notOk = function(value, msg) {
  if (value) {
    throw new Error(msg || ('Expected falsy but got ' + JSON.stringify(value)));
  }
};

assert.deepEqual = function(a, b, msg) {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw new Error(msg || ('Expected ' + JSON.stringify(b) + ' but got ' + JSON.stringify(a)));
  }
};

assert.isArray = function(val, msg) {
  if (!Array.isArray(val)) {
    throw new Error(msg || ('Expected array but got ' + typeof val));
  }
};

assert.isObject = function(val, msg) {
  if (typeof val !== 'object' || val === null || Array.isArray(val)) {
    throw new Error(msg || ('Expected object but got ' + typeof val));
  }
};

assert.isNull = function(val, msg) {
  if (val !== null) {
    throw new Error(msg || ('Expected null but got ' + JSON.stringify(val)));
  }
};

function test(name, fn) {
  try {
    fn();
    passed++;
    process.stdout.write('  PASS: ' + name + '\n');
  } catch (e) {
    failed++;
    errors.push({ name: name, error: e });
    process.stdout.write('  FAIL: ' + name + '\n    ' + e.message + '\n');
  }
}

function suite(name, fn) {
  process.stdout.write('\n' + name + '\n');
  fn();
}

var S = require('../src/js/specializations');

// ============================================================================
// HELPERS
// ============================================================================

var _pid = 0;
function uid() { return 'player_' + (++_pid); }

/** Fresh shared state map */
function freshState() { return {}; }

/** Add a player with given tree level and choose a spec */
function stateWithSpec(tree, specId, treeLevel) {
  var state = freshState();
  var pid   = uid();
  var result = S.chooseSpecialization(state, pid, tree, specId, treeLevel || 5);
  if (!result.success) throw new Error('Setup failed: ' + result.reason);
  return { state: state, pid: pid };
}

/** Award mastery XP N times */
function awardXPTimes(state, pid, tree, xp, times) {
  for (var i = 0; i < times; i++) {
    S.awardMasteryXP(state, pid, tree, xp);
  }
}

// ============================================================================
// MODULE SHAPE
// ============================================================================

suite('Module exports', function() {
  test('exports SPECIALIZATIONS object', function() {
    assert.isObject(S.SPECIALIZATIONS);
  });
  test('exports TREE_SPECS object', function() {
    assert.isObject(S.TREE_SPECS);
  });
  test('exports TREES array with 6 items', function() {
    assert.isArray(S.TREES);
    assert.strictEqual(S.TREES.length, 6);
  });
  test('exports LEVEL_REQUIRED = 5', function() {
    assert.strictEqual(S.LEVEL_REQUIRED, 5);
  });
  test('exports MAX_MASTERY = 10', function() {
    assert.strictEqual(S.MAX_MASTERY, 10);
  });
  test('exports BASE_RESPEC = 50', function() {
    assert.strictEqual(S.BASE_RESPEC, 50);
  });
  test('exports createSpecState function', function() {
    assert.strictEqual(typeof S.createSpecState, 'function');
  });
  test('exports chooseSpecialization function', function() {
    assert.strictEqual(typeof S.chooseSpecialization, 'function');
  });
  test('exports respec function', function() {
    assert.strictEqual(typeof S.respec, 'function');
  });
  test('exports awardMasteryXP function', function() {
    assert.strictEqual(typeof S.awardMasteryXP, 'function');
  });
  test('exports getMasteryLevel function', function() {
    assert.strictEqual(typeof S.getMasteryLevel, 'function');
  });
  test('exports getMasteryProgress function', function() {
    assert.strictEqual(typeof S.getMasteryProgress, 'function');
  });
  test('exports getSpecialization function', function() {
    assert.strictEqual(typeof S.getSpecialization, 'function');
  });
  test('exports getAllSpecializations function', function() {
    assert.strictEqual(typeof S.getAllSpecializations, 'function');
  });
  test('exports getAvailableSpecializations function', function() {
    assert.strictEqual(typeof S.getAvailableSpecializations, 'function');
  });
  test('exports getSpecById function', function() {
    assert.strictEqual(typeof S.getSpecById, 'function');
  });
  test('exports getBonuses function', function() {
    assert.strictEqual(typeof S.getBonuses, 'function');
  });
  test('exports hasExclusiveRecipe function', function() {
    assert.strictEqual(typeof S.hasExclusiveRecipe, 'function');
  });
  test('exports getExclusiveRecipes function', function() {
    assert.strictEqual(typeof S.getExclusiveRecipes, 'function');
  });
  test('exports hasExclusivePerk function', function() {
    assert.strictEqual(typeof S.hasExclusivePerk, 'function');
  });
  test('exports getTitle function', function() {
    assert.strictEqual(typeof S.getTitle, 'function');
  });
  test('exports getTotalMasteryPoints function', function() {
    assert.strictEqual(typeof S.getTotalMasteryPoints, 'function');
  });
  test('exports getRespecCost function', function() {
    assert.strictEqual(typeof S.getRespecCost, 'function');
  });
  test('exports getSpecializationTrees function', function() {
    assert.strictEqual(typeof S.getSpecializationTrees, 'function');
  });
  test('exports getLeaderboard function', function() {
    assert.strictEqual(typeof S.getLeaderboard, 'function');
  });
});

// ============================================================================
// SPECIALIZATIONS DATA INTEGRITY — all 18 specs
// ============================================================================

suite('SPECIALIZATIONS — 18 total', function() {
  test('has exactly 18 specializations', function() {
    assert.strictEqual(Object.keys(S.SPECIALIZATIONS).length, 18);
  });

  var expectedIds = [
    'armorer', 'jeweler', 'alchemist',
    'berserker', 'guardian', 'tactician',
    'pathfinder', 'cartographer', 'archaeologist',
    'diplomat', 'entertainer', 'merchant_prince',
    'herbalist', 'miner', 'lumberjack',
    'angler', 'deep_sea', 'aquaculturist'
  ];

  expectedIds.forEach(function(id) {
    test(id + ' exists in SPECIALIZATIONS', function() {
      assert.ok(S.SPECIALIZATIONS[id], 'Missing: ' + id);
    });
    test(id + ' has id field matching key', function() {
      assert.strictEqual(S.SPECIALIZATIONS[id].id, id);
    });
    test(id + ' has name string', function() {
      assert.strictEqual(typeof S.SPECIALIZATIONS[id].name, 'string');
      assert.ok(S.SPECIALIZATIONS[id].name.length > 0);
    });
    test(id + ' has tree string', function() {
      assert.strictEqual(typeof S.SPECIALIZATIONS[id].tree, 'string');
    });
    test(id + ' tree is one of the 6 valid trees', function() {
      assert.ok(S.TREES.indexOf(S.SPECIALIZATIONS[id].tree) !== -1, id + '.tree = ' + S.SPECIALIZATIONS[id].tree);
    });
    test(id + ' has description string', function() {
      assert.strictEqual(typeof S.SPECIALIZATIONS[id].description, 'string');
      assert.ok(S.SPECIALIZATIONS[id].description.length > 0);
    });
    test(id + ' levelRequired = 5', function() {
      assert.strictEqual(S.SPECIALIZATIONS[id].levelRequired, 5);
    });
    test(id + ' has at least 3 bonuses', function() {
      assert.isArray(S.SPECIALIZATIONS[id].bonuses);
      assert.ok(S.SPECIALIZATIONS[id].bonuses.length >= 3, id + ' bonuses.length = ' + S.SPECIALIZATIONS[id].bonuses.length);
    });
    test(id + ' each bonus has type and value', function() {
      S.SPECIALIZATIONS[id].bonuses.forEach(function(b) {
        assert.strictEqual(typeof b.type, 'string');
        assert.strictEqual(typeof b.value, 'number');
      });
    });
    test(id + ' has at least 3 exclusiveRecipes', function() {
      assert.isArray(S.SPECIALIZATIONS[id].exclusiveRecipes);
      assert.ok(S.SPECIALIZATIONS[id].exclusiveRecipes.length >= 3, id + ' exclusiveRecipes.length = ' + S.SPECIALIZATIONS[id].exclusiveRecipes.length);
    });
    test(id + ' exclusiveRecipes are strings', function() {
      S.SPECIALIZATIONS[id].exclusiveRecipes.forEach(function(r) {
        assert.strictEqual(typeof r, 'string');
      });
    });
    test(id + ' has at least 3 exclusivePerks', function() {
      assert.isArray(S.SPECIALIZATIONS[id].exclusivePerks);
      assert.ok(S.SPECIALIZATIONS[id].exclusivePerks.length >= 3, id + ' exclusivePerks.length = ' + S.SPECIALIZATIONS[id].exclusivePerks.length);
    });
    test(id + ' exclusivePerks are strings', function() {
      S.SPECIALIZATIONS[id].exclusivePerks.forEach(function(p) {
        assert.strictEqual(typeof p, 'string');
      });
    });
    test(id + ' masteryLevels = 10', function() {
      assert.strictEqual(S.SPECIALIZATIONS[id].masteryLevels, 10);
    });
    test(id + ' xpPerMastery is a positive number', function() {
      assert.ok(typeof S.SPECIALIZATIONS[id].xpPerMastery === 'number' && S.SPECIALIZATIONS[id].xpPerMastery > 0);
    });
    test(id + ' masteryRewards has entries at levels 3, 5, 7, 10', function() {
      var r = S.SPECIALIZATIONS[id].masteryRewards;
      assert.isObject(r);
      assert.ok(r[3] && r[3].title, id + ' missing reward at 3');
      assert.ok(r[5] && r[5].title, id + ' missing reward at 5');
      assert.ok(r[7] && r[7].title, id + ' missing reward at 7');
      assert.ok(r[10] && r[10].title, id + ' missing reward at 10');
    });
  });
});

// ============================================================================
// TREE_SPECS — 3 specs per tree
// ============================================================================

suite('TREE_SPECS — 3 specializations per tree', function() {
  S.TREES.forEach(function(tree) {
    test(tree + ' has exactly 3 specializations', function() {
      assert.isArray(S.TREE_SPECS[tree]);
      assert.strictEqual(S.TREE_SPECS[tree].length, 3);
    });
    test(tree + ' specialization ids match SPECIALIZATIONS keys', function() {
      S.TREE_SPECS[tree].forEach(function(id) {
        assert.ok(S.SPECIALIZATIONS[id], 'Missing SPECIALIZATIONS[' + id + '] for tree ' + tree);
      });
    });
    test(tree + ' specializations all reference this tree', function() {
      S.TREE_SPECS[tree].forEach(function(id) {
        assert.strictEqual(S.SPECIALIZATIONS[id].tree, tree);
      });
    });
  });

  test('crafting specs: armorer, jeweler, alchemist', function() {
    assert.deepEqual(S.TREE_SPECS.crafting, ['armorer', 'jeweler', 'alchemist']);
  });
  test('combat specs: berserker, guardian, tactician', function() {
    assert.deepEqual(S.TREE_SPECS.combat, ['berserker', 'guardian', 'tactician']);
  });
  test('exploration specs: pathfinder, cartographer, archaeologist', function() {
    assert.deepEqual(S.TREE_SPECS.exploration, ['pathfinder', 'cartographer', 'archaeologist']);
  });
  test('social specs: diplomat, entertainer, merchant_prince', function() {
    assert.deepEqual(S.TREE_SPECS.social, ['diplomat', 'entertainer', 'merchant_prince']);
  });
  test('gathering specs: herbalist, miner, lumberjack', function() {
    assert.deepEqual(S.TREE_SPECS.gathering, ['herbalist', 'miner', 'lumberjack']);
  });
  test('fishing specs: angler, deep_sea, aquaculturist', function() {
    assert.deepEqual(S.TREE_SPECS.fishing, ['angler', 'deep_sea', 'aquaculturist']);
  });
});

// ============================================================================
// EXCLUSIVE RECIPES AND PERKS — uniqueness
// ============================================================================

suite('Exclusive recipes are unique per specialization', function() {
  test('no two specs share the same exclusive recipe', function() {
    var seen = {};
    var ids  = Object.keys(S.SPECIALIZATIONS);
    for (var i = 0; i < ids.length; i++) {
      var spec = S.SPECIALIZATIONS[ids[i]];
      for (var j = 0; j < spec.exclusiveRecipes.length; j++) {
        var r = spec.exclusiveRecipes[j];
        assert.ok(!seen[r], 'Duplicate recipe "' + r + '" in spec ' + ids[i]);
        seen[r] = true;
      }
    }
  });

  test('no two specs share the same exclusive perk', function() {
    var seen = {};
    var ids  = Object.keys(S.SPECIALIZATIONS);
    for (var i = 0; i < ids.length; i++) {
      var spec = S.SPECIALIZATIONS[ids[i]];
      for (var j = 0; j < spec.exclusivePerks.length; j++) {
        var p = spec.exclusivePerks[j];
        assert.ok(!seen[p], 'Duplicate perk "' + p + '" in spec ' + ids[i]);
        seen[p] = true;
      }
    }
  });
});

// ============================================================================
// createSpecState
// ============================================================================

suite('createSpecState', function() {
  test('returns an object', function() {
    var ps = S.createSpecState('p1');
    assert.isObject(ps);
  });
  test('playerId is set', function() {
    var ps = S.createSpecState('myPlayer');
    assert.strictEqual(ps.playerId, 'myPlayer');
  });
  test('specializations starts as empty object', function() {
    var ps = S.createSpecState('p1');
    assert.deepEqual(ps.specializations, {});
  });
  test('respecCount starts at 0', function() {
    var ps = S.createSpecState('p1');
    assert.strictEqual(ps.respecCount, 0);
  });
  test('totalMasteryPoints starts at 0', function() {
    var ps = S.createSpecState('p1');
    assert.strictEqual(ps.totalMasteryPoints, 0);
  });
});

// ============================================================================
// chooseSpecialization
// ============================================================================

suite('chooseSpecialization — valid', function() {
  test('returns success:true with valid args', function() {
    var state = freshState();
    var pid   = uid();
    var r = S.chooseSpecialization(state, pid, 'crafting', 'armorer', 5);
    assert.strictEqual(r.success, true);
  });
  test('returns specialization object', function() {
    var state = freshState();
    var pid   = uid();
    var r = S.chooseSpecialization(state, pid, 'crafting', 'armorer', 5);
    assert.ok(r.specialization && r.specialization.id === 'armorer');
  });
  test('reason is null on success', function() {
    var state = freshState();
    var pid   = uid();
    var r = S.chooseSpecialization(state, pid, 'crafting', 'armorer', 5);
    assert.isNull(r.reason);
  });
  test('player state is created in shared state', function() {
    var state = freshState();
    var pid   = uid();
    S.chooseSpecialization(state, pid, 'crafting', 'armorer', 5);
    assert.ok(state[pid]);
  });
  test('spec is stored in player state', function() {
    var state = freshState();
    var pid   = uid();
    S.chooseSpecialization(state, pid, 'crafting', 'armorer', 5);
    assert.ok(state[pid].specializations.crafting);
    assert.strictEqual(state[pid].specializations.crafting.specId, 'armorer');
  });
  test('masteryLevel starts at 0 after choosing', function() {
    var state = freshState();
    var pid   = uid();
    S.chooseSpecialization(state, pid, 'crafting', 'armorer', 5);
    assert.strictEqual(state[pid].specializations.crafting.masteryLevel, 0);
  });
  test('masteryXP starts at 0 after choosing', function() {
    var state = freshState();
    var pid   = uid();
    S.chooseSpecialization(state, pid, 'crafting', 'armorer', 5);
    assert.strictEqual(state[pid].specializations.crafting.masteryXP, 0);
  });
  test('can choose specs in two different trees independently', function() {
    var state = freshState();
    var pid   = uid();
    S.chooseSpecialization(state, pid, 'crafting', 'armorer', 5);
    var r = S.chooseSpecialization(state, pid, 'combat', 'berserker', 5);
    assert.strictEqual(r.success, true);
    assert.strictEqual(state[pid].specializations.combat.specId, 'berserker');
  });
  test('treeLevel exactly at 5 succeeds', function() {
    var state = freshState();
    var pid   = uid();
    var r = S.chooseSpecialization(state, pid, 'fishing', 'angler', 5);
    assert.strictEqual(r.success, true);
  });
  test('treeLevel above 5 succeeds', function() {
    var state = freshState();
    var pid   = uid();
    var r = S.chooseSpecialization(state, pid, 'social', 'diplomat', 10);
    assert.strictEqual(r.success, true);
  });
});

suite('chooseSpecialization — failures', function() {
  test('fails when tree level below 5', function() {
    var state = freshState();
    var pid   = uid();
    var r = S.chooseSpecialization(state, pid, 'crafting', 'armorer', 4);
    assert.strictEqual(r.success, false);
  });
  test('reason mentions level on low-level failure', function() {
    var state = freshState();
    var pid   = uid();
    var r = S.chooseSpecialization(state, pid, 'crafting', 'armorer', 2);
    assert.ok(r.reason && r.reason.length > 0);
  });
  test('fails when spec not in tree', function() {
    var state = freshState();
    var pid   = uid();
    var r = S.chooseSpecialization(state, pid, 'crafting', 'berserker', 5);
    assert.strictEqual(r.success, false);
  });
  test('fails with unknown tree', function() {
    var state = freshState();
    var pid   = uid();
    var r = S.chooseSpecialization(state, pid, 'magic', 'wizard', 5);
    assert.strictEqual(r.success, false);
  });
  test('fails with unknown specId', function() {
    var state = freshState();
    var pid   = uid();
    var r = S.chooseSpecialization(state, pid, 'crafting', 'nonexistent_spec', 5);
    assert.strictEqual(r.success, false);
  });
  test('fails if player already specialised in tree', function() {
    var state = freshState();
    var pid   = uid();
    S.chooseSpecialization(state, pid, 'crafting', 'armorer', 5);
    var r = S.chooseSpecialization(state, pid, 'crafting', 'jeweler', 5);
    assert.strictEqual(r.success, false);
  });
  test('reason mentions respec on already-specialised failure', function() {
    var state = freshState();
    var pid   = uid();
    S.chooseSpecialization(state, pid, 'crafting', 'armorer', 5);
    var r = S.chooseSpecialization(state, pid, 'crafting', 'jeweler', 5);
    assert.ok(r.reason && r.reason.toLowerCase().indexOf('respec') !== -1);
  });
  test('specialization is null on failure', function() {
    var state = freshState();
    var pid   = uid();
    var r = S.chooseSpecialization(state, pid, 'crafting', 'armorer', 1);
    assert.isNull(r.specialization);
  });
  test('treeLevel=0 fails', function() {
    var state = freshState();
    var pid   = uid();
    var r = S.chooseSpecialization(state, pid, 'gathering', 'herbalist', 0);
    assert.strictEqual(r.success, false);
  });
});

// ============================================================================
// respec
// ============================================================================

suite('respec', function() {
  test('success:true when specialization exists', function() {
    var ctx   = stateWithSpec('crafting', 'armorer');
    var r     = S.respec(ctx.state, ctx.pid, 'crafting');
    assert.strictEqual(r.success, true);
  });
  test('removedSpecId is the removed spec', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    var r   = S.respec(ctx.state, ctx.pid, 'crafting');
    assert.strictEqual(r.removedSpecId, 'armorer');
  });
  test('first respec costs 50 Spark', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    var r   = S.respec(ctx.state, ctx.pid, 'crafting');
    assert.strictEqual(r.cost, 50);
  });
  test('second respec costs 100 Spark', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    S.respec(ctx.state, ctx.pid, 'crafting');
    S.chooseSpecialization(ctx.state, ctx.pid, 'crafting', 'jeweler', 5);
    var r = S.respec(ctx.state, ctx.pid, 'crafting');
    assert.strictEqual(r.cost, 100);
  });
  test('third respec costs 150 Spark', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    S.respec(ctx.state, ctx.pid, 'crafting');
    S.chooseSpecialization(ctx.state, ctx.pid, 'crafting', 'jeweler', 5);
    S.respec(ctx.state, ctx.pid, 'crafting');
    S.chooseSpecialization(ctx.state, ctx.pid, 'crafting', 'alchemist', 5);
    var r = S.respec(ctx.state, ctx.pid, 'crafting');
    assert.strictEqual(r.cost, 150);
  });
  test('respec clears the specialization from player state', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    S.respec(ctx.state, ctx.pid, 'crafting');
    assert.isNull(ctx.state[ctx.pid].specializations.crafting);
  });
  test('respec increments respecCount', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    S.respec(ctx.state, ctx.pid, 'crafting');
    assert.strictEqual(ctx.state[ctx.pid].respecCount, 1);
  });
  test('can choose new spec after respec', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    S.respec(ctx.state, ctx.pid, 'crafting');
    var r = S.chooseSpecialization(ctx.state, ctx.pid, 'crafting', 'jeweler', 5);
    assert.strictEqual(r.success, true);
  });
  test('fails with success:false when no spec in tree', function() {
    var state = freshState();
    var pid   = uid();
    var r     = S.respec(state, pid, 'crafting');
    assert.strictEqual(r.success, false);
  });
  test('reason is set on no-spec failure', function() {
    var state = freshState();
    var pid   = uid();
    var r     = S.respec(state, pid, 'crafting');
    assert.ok(r.reason && r.reason.length > 0);
  });
  test('cost is 0 on failure', function() {
    var state = freshState();
    var pid   = uid();
    var r     = S.respec(state, pid, 'crafting');
    assert.strictEqual(r.cost, 0);
  });
  test('respec on unknown tree fails', function() {
    var state = freshState();
    var pid   = uid();
    var r     = S.respec(state, pid, 'magic');
    assert.strictEqual(r.success, false);
  });
  test('respec reduces totalMasteryPoints by removed mastery level', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    // Award enough XP for 2 mastery levels (500 each)
    S.awardMasteryXP(ctx.state, ctx.pid, 'crafting', 1000);
    var before = S.getTotalMasteryPoints(ctx.state, ctx.pid);
    assert.ok(before >= 2);
    S.respec(ctx.state, ctx.pid, 'crafting');
    var after = S.getTotalMasteryPoints(ctx.state, ctx.pid);
    assert.ok(after < before);
  });
});

// ============================================================================
// getRespecCost
// ============================================================================

suite('getRespecCost', function() {
  test('fresh player respec cost = 50', function() {
    var state = freshState();
    var pid   = uid();
    assert.strictEqual(S.getRespecCost(state, pid), 50);
  });
  test('after 1 respec, cost = 100', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    S.respec(ctx.state, ctx.pid, 'crafting');
    assert.strictEqual(S.getRespecCost(ctx.state, ctx.pid), 100);
  });
  test('after 2 respecs, cost = 150', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    S.respec(ctx.state, ctx.pid, 'crafting');
    S.chooseSpecialization(ctx.state, ctx.pid, 'crafting', 'jeweler', 5);
    S.respec(ctx.state, ctx.pid, 'crafting');
    assert.strictEqual(S.getRespecCost(ctx.state, ctx.pid), 150);
  });
  test('cost scales linearly: BASE_RESPEC * (respecCount + 1)', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    S.respec(ctx.state, ctx.pid, 'crafting');
    S.chooseSpecialization(ctx.state, ctx.pid, 'crafting', 'jeweler', 5);
    S.respec(ctx.state, ctx.pid, 'crafting');
    S.chooseSpecialization(ctx.state, ctx.pid, 'crafting', 'alchemist', 5);
    S.respec(ctx.state, ctx.pid, 'crafting');
    // respecCount=3, cost = 50*4 = 200
    assert.strictEqual(S.getRespecCost(ctx.state, ctx.pid), 200);
  });
});

// ============================================================================
// awardMasteryXP
// ============================================================================

suite('awardMasteryXP', function() {
  test('returns xpAdded, levelUp, newLevel, reward', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    var r   = S.awardMasteryXP(ctx.state, ctx.pid, 'crafting', 100);
    assert.ok('xpAdded'  in r);
    assert.ok('levelUp'  in r);
    assert.ok('newLevel' in r);
    assert.ok('reward'   in r);
  });
  test('xpAdded matches the amount provided', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    var r   = S.awardMasteryXP(ctx.state, ctx.pid, 'crafting', 250);
    assert.strictEqual(r.xpAdded, 250);
  });
  test('XP below threshold: levelUp is false', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    var r   = S.awardMasteryXP(ctx.state, ctx.pid, 'crafting', 100);
    assert.strictEqual(r.levelUp, false);
  });
  test('XP below threshold: newLevel stays 0', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    var r   = S.awardMasteryXP(ctx.state, ctx.pid, 'crafting', 100);
    assert.strictEqual(r.newLevel, 0);
  });
  test('XP exactly at threshold: levels up to 1', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    var r   = S.awardMasteryXP(ctx.state, ctx.pid, 'crafting', 500);
    assert.strictEqual(r.levelUp, true);
    assert.strictEqual(r.newLevel, 1);
  });
  test('double threshold: levels up to 2 in one call', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    var r   = S.awardMasteryXP(ctx.state, ctx.pid, 'crafting', 1000);
    assert.strictEqual(r.newLevel, 2);
  });
  test('award 0 XP: xpAdded = 0, no level up', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    var r   = S.awardMasteryXP(ctx.state, ctx.pid, 'crafting', 0);
    assert.strictEqual(r.xpAdded, 0);
    assert.strictEqual(r.levelUp, false);
  });
  test('award XP with no specialization: xpAdded = 0', function() {
    var state = freshState();
    var pid   = uid();
    var r = S.awardMasteryXP(state, pid, 'crafting', 1000);
    assert.strictEqual(r.xpAdded, 0);
  });
  test('XP accumulates across multiple calls', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    S.awardMasteryXP(ctx.state, ctx.pid, 'crafting', 300);
    S.awardMasteryXP(ctx.state, ctx.pid, 'crafting', 300);
    var level = S.getMasteryLevel(ctx.state, ctx.pid, 'crafting');
    assert.strictEqual(level, 1);
  });
  test('totalMasteryPoints increases on level up', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    S.awardMasteryXP(ctx.state, ctx.pid, 'crafting', 500);
    assert.strictEqual(S.getTotalMasteryPoints(ctx.state, ctx.pid), 1);
  });
  test('cannot exceed MAX_MASTERY (10)', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    S.awardMasteryXP(ctx.state, ctx.pid, 'crafting', 999999);
    var level = S.getMasteryLevel(ctx.state, ctx.pid, 'crafting');
    assert.strictEqual(level, S.MAX_MASTERY);
  });
  test('extra XP after max mastery gives xpAdded 0', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    S.awardMasteryXP(ctx.state, ctx.pid, 'crafting', 999999);
    var r = S.awardMasteryXP(ctx.state, ctx.pid, 'crafting', 500);
    assert.strictEqual(r.xpAdded, 0);
  });
});

// ============================================================================
// MASTERY REWARDS
// ============================================================================

suite('Mastery rewards at levels 3, 5, 7, 10', function() {
  test('reward returned at mastery level 3', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    var reward = null;
    var r;
    // Award 500 XP 3 times to reach level 3
    for (var i = 0; i < 3; i++) {
      r = S.awardMasteryXP(ctx.state, ctx.pid, 'crafting', 500);
      if (r.reward) reward = r.reward;
    }
    assert.ok(reward && reward.title, 'Expected reward at level 3');
  });
  test('reward at level 3 has a title string', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    for (var i = 0; i < 3; i++) {
      S.awardMasteryXP(ctx.state, ctx.pid, 'crafting', 500);
    }
    var spec   = S.getSpecById('armorer');
    var reward = spec.masteryRewards[3];
    assert.strictEqual(typeof reward.title, 'string');
  });
  test('reward at level 5 has a cosmetic field', function() {
    var spec   = S.getSpecById('armorer');
    var reward = spec.masteryRewards[5];
    assert.ok(reward.cosmetic, 'Expected cosmetic in level 5 reward');
  });
  test('reward at level 7 has a cosmetic field', function() {
    var spec   = S.getSpecById('armorer');
    var reward = spec.masteryRewards[7];
    assert.ok(reward.cosmetic, 'Expected cosmetic in level 7 reward');
  });
  test('reward at level 10 has a cosmetic field', function() {
    var spec   = S.getSpecById('armorer');
    var reward = spec.masteryRewards[10];
    assert.ok(reward.cosmetic, 'Expected cosmetic in level 10 reward');
  });
  test('reward is null between milestone levels (e.g. level 1)', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    var r = S.awardMasteryXP(ctx.state, ctx.pid, 'crafting', 500);
    assert.isNull(r.reward);
  });
  test('reward is returned when passing level 10', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    var lastReward = null;
    for (var i = 0; i < 10; i++) {
      var r = S.awardMasteryXP(ctx.state, ctx.pid, 'crafting', 500);
      if (r.reward) lastReward = r.reward;
    }
    assert.ok(lastReward && lastReward.title, 'Expected final reward at level 10');
  });
});

// ============================================================================
// getMasteryLevel
// ============================================================================

suite('getMasteryLevel', function() {
  test('returns 0 when no spec chosen', function() {
    var state = freshState();
    var pid   = uid();
    assert.strictEqual(S.getMasteryLevel(state, pid, 'crafting'), 0);
  });
  test('returns 0 right after choosing spec', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    assert.strictEqual(S.getMasteryLevel(ctx.state, ctx.pid, 'crafting'), 0);
  });
  test('returns 1 after one level up', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    S.awardMasteryXP(ctx.state, ctx.pid, 'crafting', 500);
    assert.strictEqual(S.getMasteryLevel(ctx.state, ctx.pid, 'crafting'), 1);
  });
  test('returns 5 after five level-ups', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    S.awardMasteryXP(ctx.state, ctx.pid, 'crafting', 2500);
    assert.strictEqual(S.getMasteryLevel(ctx.state, ctx.pid, 'crafting'), 5);
  });
  test('caps at MAX_MASTERY = 10', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    S.awardMasteryXP(ctx.state, ctx.pid, 'crafting', 999999);
    assert.strictEqual(S.getMasteryLevel(ctx.state, ctx.pid, 'crafting'), 10);
  });
});

// ============================================================================
// getMasteryProgress
// ============================================================================

suite('getMasteryProgress', function() {
  test('returns level, xp, xpToNext, percent', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    var p   = S.getMasteryProgress(ctx.state, ctx.pid, 'crafting');
    assert.ok('level'   in p);
    assert.ok('xp'      in p);
    assert.ok('xpToNext' in p);
    assert.ok('percent' in p);
  });
  test('returns all zeros when no spec', function() {
    var state = freshState();
    var pid   = uid();
    var p = S.getMasteryProgress(state, pid, 'crafting');
    assert.strictEqual(p.level,   0);
    assert.strictEqual(p.xp,      0);
    assert.strictEqual(p.xpToNext, 0);
    assert.strictEqual(p.percent, 0);
  });
  test('xp tracks partial progress', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    S.awardMasteryXP(ctx.state, ctx.pid, 'crafting', 250);
    var p = S.getMasteryProgress(ctx.state, ctx.pid, 'crafting');
    assert.strictEqual(p.xp, 250);
  });
  test('percent = 50 at half threshold', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    S.awardMasteryXP(ctx.state, ctx.pid, 'crafting', 250);
    var p = S.getMasteryProgress(ctx.state, ctx.pid, 'crafting');
    assert.strictEqual(p.percent, 50);
  });
  test('percent = 100 at max mastery', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    S.awardMasteryXP(ctx.state, ctx.pid, 'crafting', 999999);
    var p = S.getMasteryProgress(ctx.state, ctx.pid, 'crafting');
    assert.strictEqual(p.percent, 100);
  });
  test('xpToNext = 0 at max mastery', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    S.awardMasteryXP(ctx.state, ctx.pid, 'crafting', 999999);
    var p = S.getMasteryProgress(ctx.state, ctx.pid, 'crafting');
    assert.strictEqual(p.xpToNext, 0);
  });
});

// ============================================================================
// getSpecialization
// ============================================================================

suite('getSpecialization', function() {
  test('returns null when no spec chosen', function() {
    var state = freshState();
    var pid   = uid();
    assert.isNull(S.getSpecialization(state, pid, 'crafting'));
  });
  test('returns spec object after choosing', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    var spec = S.getSpecialization(ctx.state, ctx.pid, 'crafting');
    assert.ok(spec && spec.id === 'armorer');
  });
  test('returns null for tree without a spec', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    assert.isNull(S.getSpecialization(ctx.state, ctx.pid, 'combat'));
  });
});

// ============================================================================
// getAllSpecializations
// ============================================================================

suite('getAllSpecializations', function() {
  test('returns object with all 6 trees', function() {
    var state = freshState();
    var pid   = uid();
    var all = S.getAllSpecializations(state, pid);
    assert.isObject(all);
    assert.strictEqual(Object.keys(all).length, S.TREES.length);
  });
  test('all trees null for fresh player', function() {
    var state = freshState();
    var pid   = uid();
    var all   = S.getAllSpecializations(state, pid);
    S.TREES.forEach(function(t) { assert.isNull(all[t]); });
  });
  test('chosen tree is populated, others null', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    var all = S.getAllSpecializations(ctx.state, ctx.pid);
    assert.ok(all.crafting && all.crafting.id === 'armorer');
    assert.isNull(all.combat);
    assert.isNull(all.exploration);
  });
});

// ============================================================================
// getAvailableSpecializations
// ============================================================================

suite('getAvailableSpecializations', function() {
  test('returns array of 3 for each tree', function() {
    S.TREES.forEach(function(tree) {
      var avail = S.getAvailableSpecializations(tree);
      assert.isArray(avail);
      assert.strictEqual(avail.length, 3);
    });
  });
  test('returns crafting specs', function() {
    var avail = S.getAvailableSpecializations('crafting');
    var ids = avail.map(function(s) { return s.id; });
    assert.ok(ids.indexOf('armorer') !== -1);
    assert.ok(ids.indexOf('jeweler') !== -1);
    assert.ok(ids.indexOf('alchemist') !== -1);
  });
  test('returns empty array for unknown tree', function() {
    var avail = S.getAvailableSpecializations('magic');
    assert.isArray(avail);
    assert.strictEqual(avail.length, 0);
  });
  test('each returned spec is a full spec object', function() {
    var avail = S.getAvailableSpecializations('combat');
    avail.forEach(function(spec) {
      assert.ok(spec.id && spec.name && spec.bonuses);
    });
  });
});

// ============================================================================
// getSpecById
// ============================================================================

suite('getSpecById', function() {
  test('returns spec for valid id', function() {
    var spec = S.getSpecById('armorer');
    assert.ok(spec && spec.id === 'armorer');
  });
  test('returns null for unknown id', function() {
    assert.isNull(S.getSpecById('nonexistent'));
  });
  test('returns jeweler spec', function() {
    var spec = S.getSpecById('jeweler');
    assert.strictEqual(spec.tree, 'crafting');
  });
  test('returns deep_sea spec', function() {
    var spec = S.getSpecById('deep_sea');
    assert.strictEqual(spec.tree, 'fishing');
  });
});

// ============================================================================
// getBonuses
// ============================================================================

suite('getBonuses', function() {
  test('returns 0 when no specs chosen', function() {
    var state = freshState();
    var pid   = uid();
    assert.strictEqual(S.getBonuses(state, pid, 'damage_bonus'), 0);
  });
  test('returns spec bonus value when spec is chosen', function() {
    var ctx = stateWithSpec('combat', 'berserker');
    var val = S.getBonuses(ctx.state, ctx.pid, 'damage_bonus');
    assert.ok(val > 0, 'Expected bonus > 0, got ' + val);
  });
  test('returns 0 for bonus type not in any active spec', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    assert.strictEqual(S.getBonuses(ctx.state, ctx.pid, 'nonexistent_bonus'), 0);
  });
  test('aggregates bonuses across multiple specializations', function() {
    var state = freshState();
    var pid   = uid();
    S.chooseSpecialization(state, pid, 'combat',    'berserker', 5);
    S.chooseSpecialization(state, pid, 'crafting',  'armorer',   5);
    // crafting_quality from armorer and damage_bonus from berserker
    var dmg = S.getBonuses(state, pid, 'damage_bonus');
    var cq  = S.getBonuses(state, pid, 'craft_quality');
    assert.ok(dmg > 0);
    assert.ok(cq  > 0);
  });
  test('returns the correct value from armorer (craft_quality = 0.2)', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    var val = S.getBonuses(ctx.state, ctx.pid, 'craft_quality');
    // floating point safe: round to 4 decimals
    assert.ok(Math.abs(val - 0.20) < 0.0001, 'Expected 0.2, got ' + val);
  });
});

// ============================================================================
// hasExclusiveRecipe / getExclusiveRecipes
// ============================================================================

suite('hasExclusiveRecipe and getExclusiveRecipes', function() {
  test('hasExclusiveRecipe returns false when no spec', function() {
    var state = freshState();
    var pid   = uid();
    assert.strictEqual(S.hasExclusiveRecipe(state, pid, 'diamond_shield'), false);
  });
  test('hasExclusiveRecipe returns true for armorer recipe after choosing', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    assert.strictEqual(S.hasExclusiveRecipe(ctx.state, ctx.pid, 'diamond_shield'), true);
  });
  test('hasExclusiveRecipe returns false for other spec recipe', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    assert.strictEqual(S.hasExclusiveRecipe(ctx.state, ctx.pid, 'starfire_ring'), false);
  });
  test('getExclusiveRecipes returns empty array when no spec', function() {
    var state = freshState();
    var pid   = uid();
    assert.deepEqual(S.getExclusiveRecipes(state, pid), []);
  });
  test('getExclusiveRecipes returns 3 recipes for armorer', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    var recipes = S.getExclusiveRecipes(ctx.state, ctx.pid);
    assert.strictEqual(recipes.length, 3);
  });
  test('getExclusiveRecipes includes armorer recipes', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    var recipes = S.getExclusiveRecipes(ctx.state, ctx.pid);
    assert.ok(recipes.indexOf('diamond_shield') !== -1);
  });
  test('getExclusiveRecipes aggregates across multiple specs', function() {
    var state = freshState();
    var pid   = uid();
    S.chooseSpecialization(state, pid, 'crafting', 'armorer',   5);
    S.chooseSpecialization(state, pid, 'combat',   'berserker', 5);
    var recipes = S.getExclusiveRecipes(state, pid);
    assert.strictEqual(recipes.length, 6); // 3 + 3
  });
});

// ============================================================================
// hasExclusivePerk
// ============================================================================

suite('hasExclusivePerk', function() {
  test('returns false when no spec chosen', function() {
    var state = freshState();
    var pid   = uid();
    assert.strictEqual(S.hasExclusivePerk(state, pid, 'master_temper'), false);
  });
  test('returns true for armorer perk after choosing armorer', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    assert.strictEqual(S.hasExclusivePerk(ctx.state, ctx.pid, 'master_temper'), true);
  });
  test('returns false for perk from another spec', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    assert.strictEqual(S.hasExclusivePerk(ctx.state, ctx.pid, 'gem_sight'), false);
  });
  test('returns true for perk from second chosen spec', function() {
    var state = freshState();
    var pid   = uid();
    S.chooseSpecialization(state, pid, 'crafting', 'armorer',   5);
    S.chooseSpecialization(state, pid, 'combat',   'berserker', 5);
    assert.strictEqual(S.hasExclusivePerk(state, pid, 'blood_frenzy'), true);
  });
  test('returns false for unknown perk', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    assert.strictEqual(S.hasExclusivePerk(ctx.state, ctx.pid, 'nonexistent_perk'), false);
  });
});

// ============================================================================
// getTitle
// ============================================================================

suite('getTitle', function() {
  test('returns null when no spec chosen', function() {
    var state = freshState();
    var pid   = uid();
    assert.isNull(S.getTitle(state, pid, 'crafting'));
  });
  test('returns null at mastery level 0 (no title yet)', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    assert.isNull(S.getTitle(ctx.state, ctx.pid, 'crafting'));
  });
  test('returns Apprentice Armorer at mastery level 3', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    S.awardMasteryXP(ctx.state, ctx.pid, 'crafting', 1500);
    var title = S.getTitle(ctx.state, ctx.pid, 'crafting');
    assert.strictEqual(title, 'Apprentice Armorer');
  });
  test('returns Journeyman Armorer at mastery level 5', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    S.awardMasteryXP(ctx.state, ctx.pid, 'crafting', 2500);
    var title = S.getTitle(ctx.state, ctx.pid, 'crafting');
    assert.strictEqual(title, 'Journeyman Armorer');
  });
  test('returns Master Armorer at mastery level 7', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    S.awardMasteryXP(ctx.state, ctx.pid, 'crafting', 3500);
    var title = S.getTitle(ctx.state, ctx.pid, 'crafting');
    assert.strictEqual(title, 'Master Armorer');
  });
  test('returns Grand Master Armorer at mastery level 10', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    S.awardMasteryXP(ctx.state, ctx.pid, 'crafting', 5000);
    var title = S.getTitle(ctx.state, ctx.pid, 'crafting');
    assert.strictEqual(title, 'Grand Master Armorer');
  });
  test('returns highest applicable title (level 6 = Journeyman)', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    S.awardMasteryXP(ctx.state, ctx.pid, 'crafting', 3000);
    var title = S.getTitle(ctx.state, ctx.pid, 'crafting');
    assert.strictEqual(title, 'Journeyman Armorer');
  });
});

// ============================================================================
// getTotalMasteryPoints
// ============================================================================

suite('getTotalMasteryPoints', function() {
  test('returns 0 for fresh player', function() {
    var state = freshState();
    var pid   = uid();
    assert.strictEqual(S.getTotalMasteryPoints(state, pid), 0);
  });
  test('returns 1 after one mastery level', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    S.awardMasteryXP(ctx.state, ctx.pid, 'crafting', 500);
    assert.strictEqual(S.getTotalMasteryPoints(ctx.state, ctx.pid), 1);
  });
  test('sums across multiple trees', function() {
    var state = freshState();
    var pid   = uid();
    S.chooseSpecialization(state, pid, 'crafting', 'armorer',   5);
    S.chooseSpecialization(state, pid, 'combat',   'berserker', 5);
    S.awardMasteryXP(state, pid, 'crafting', 500);  // level 1 in crafting
    S.awardMasteryXP(state, pid, 'combat',   1000); // level 2 in combat
    assert.strictEqual(S.getTotalMasteryPoints(state, pid), 3);
  });
  test('caps at MAX_MASTERY per tree (10 per tree)', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    S.awardMasteryXP(ctx.state, ctx.pid, 'crafting', 999999);
    assert.strictEqual(S.getTotalMasteryPoints(ctx.state, ctx.pid), 10);
  });
});

// ============================================================================
// getSpecializationTrees
// ============================================================================

suite('getSpecializationTrees', function() {
  test('returns an array', function() {
    assert.isArray(S.getSpecializationTrees());
  });
  test('returns 6 items', function() {
    assert.strictEqual(S.getSpecializationTrees().length, 6);
  });
  test('includes crafting', function() {
    assert.ok(S.getSpecializationTrees().indexOf('crafting') !== -1);
  });
  test('includes fishing', function() {
    assert.ok(S.getSpecializationTrees().indexOf('fishing') !== -1);
  });
  test('returns a copy, not the original array', function() {
    var arr = S.getSpecializationTrees();
    arr.push('fake_tree');
    assert.strictEqual(S.getSpecializationTrees().length, 6);
  });
  test('contains all 6 expected trees', function() {
    var trees    = S.getSpecializationTrees();
    var expected = ['crafting', 'combat', 'exploration', 'social', 'gathering', 'fishing'];
    expected.forEach(function(t) {
      assert.ok(trees.indexOf(t) !== -1, 'Missing tree: ' + t);
    });
  });
});

// ============================================================================
// getLeaderboard
// ============================================================================

suite('getLeaderboard', function() {
  test('returns an array', function() {
    var state = freshState();
    var result = S.getLeaderboard(state, 'armorer', 10);
    assert.isArray(result);
  });
  test('returns empty array when no players have that spec', function() {
    var state = freshState();
    var result = S.getLeaderboard(state, 'armorer', 10);
    assert.strictEqual(result.length, 0);
  });
  test('returns players with armorer spec', function() {
    var state = freshState();
    var pid   = uid();
    S.chooseSpecialization(state, pid, 'crafting', 'armorer', 5);
    var result = S.getLeaderboard(state, 'armorer', 10);
    assert.strictEqual(result.length, 1);
  });
  test('leaderboard entry has playerId, specId, masteryLevel, masteryXP', function() {
    var state = freshState();
    var pid   = uid();
    S.chooseSpecialization(state, pid, 'crafting', 'armorer', 5);
    var entry = S.getLeaderboard(state, 'armorer', 10)[0];
    assert.ok('playerId'     in entry);
    assert.ok('specId'       in entry);
    assert.ok('masteryLevel' in entry);
    assert.ok('masteryXP'    in entry);
  });
  test('leaderboard sorted by masteryLevel descending', function() {
    var state = freshState();
    var pid1  = uid();
    var pid2  = uid();
    S.chooseSpecialization(state, pid1, 'crafting', 'armorer', 5);
    S.chooseSpecialization(state, pid2, 'crafting', 'armorer', 5);
    S.awardMasteryXP(state, pid1, 'crafting', 500);  // level 1
    S.awardMasteryXP(state, pid2, 'crafting', 1500); // level 3
    var board = S.getLeaderboard(state, 'armorer', 10);
    assert.ok(board[0].masteryLevel >= board[1].masteryLevel);
  });
  test('count limits the number of results', function() {
    var state = freshState();
    for (var i = 0; i < 5; i++) {
      var pid = uid();
      S.chooseSpecialization(state, pid, 'crafting', 'armorer', 5);
    }
    var board = S.getLeaderboard(state, 'armorer', 3);
    assert.ok(board.length <= 3);
  });
  test('does not include players with different spec', function() {
    var state = freshState();
    var pid   = uid();
    S.chooseSpecialization(state, pid, 'crafting', 'jeweler', 5);
    var board = S.getLeaderboard(state, 'armorer', 10);
    assert.strictEqual(board.length, 0);
  });
  test('specId in entry matches requested spec', function() {
    var state = freshState();
    var pid   = uid();
    S.chooseSpecialization(state, pid, 'crafting', 'armorer', 5);
    var entry = S.getLeaderboard(state, 'armorer', 10)[0];
    assert.strictEqual(entry.specId, 'armorer');
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

suite('Edge cases', function() {
  test('choosing spec in same tree twice is blocked without respec', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    var r   = S.chooseSpecialization(ctx.state, ctx.pid, 'crafting', 'armorer', 5);
    assert.strictEqual(r.success, false);
  });
  test('respec then re-choose allows new spec', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    S.respec(ctx.state, ctx.pid, 'crafting');
    var r = S.chooseSpecialization(ctx.state, ctx.pid, 'crafting', 'alchemist', 5);
    assert.strictEqual(r.success, true);
  });
  test('awardMasteryXP for wrong tree has no effect on other trees', function() {
    var state = freshState();
    var pid   = uid();
    S.chooseSpecialization(state, pid, 'crafting', 'armorer', 5);
    S.awardMasteryXP(state, pid, 'combat', 1000); // no combat spec
    assert.strictEqual(S.getMasteryLevel(state, pid, 'crafting'), 0);
  });
  test('player can have all 6 specializations simultaneously', function() {
    var state = freshState();
    var pid   = uid();
    var ok    = true;
    var pairs = [
      ['crafting', 'armorer'], ['combat', 'guardian'], ['exploration', 'pathfinder'],
      ['social', 'diplomat'],  ['gathering', 'herbalist'], ['fishing', 'angler']
    ];
    pairs.forEach(function(pair) {
      var r = S.chooseSpecialization(state, pid, pair[0], pair[1], 5);
      if (!r.success) ok = false;
    });
    assert.ok(ok, 'Expected all 6 specs to be chosen');
    var all = S.getAllSpecializations(state, pid);
    S.TREES.forEach(function(t) {
      assert.ok(all[t] !== null, 'Expected spec for tree ' + t);
    });
  });
  test('getTotalMasteryPoints with 6 specs fully mastered = 60', function() {
    var state = freshState();
    var pid   = uid();
    var pairs = [
      ['crafting', 'armorer'], ['combat', 'guardian'], ['exploration', 'pathfinder'],
      ['social', 'diplomat'],  ['gathering', 'herbalist'], ['fishing', 'angler']
    ];
    pairs.forEach(function(pair) {
      S.chooseSpecialization(state, pid, pair[0], pair[1], 5);
      S.awardMasteryXP(state, pid, pair[0], 999999);
    });
    assert.strictEqual(S.getTotalMasteryPoints(state, pid), 60);
  });
  test('getSpecialization after respec returns null', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    S.respec(ctx.state, ctx.pid, 'crafting');
    assert.isNull(S.getSpecialization(ctx.state, ctx.pid, 'crafting'));
  });
  test('getMasteryLevel returns 0 after respec', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    S.awardMasteryXP(ctx.state, ctx.pid, 'crafting', 2500); // level 5
    S.respec(ctx.state, ctx.pid, 'crafting');
    assert.strictEqual(S.getMasteryLevel(ctx.state, ctx.pid, 'crafting'), 0);
  });
  test('awardMasteryXP with negative xp: no effect', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    var r   = S.awardMasteryXP(ctx.state, ctx.pid, 'crafting', -500);
    assert.strictEqual(r.xpAdded, 0);
    assert.strictEqual(r.levelUp, false);
  });
  test('SPECIALIZATIONS object is not mutated by operations', function() {
    var before = JSON.stringify(S.SPECIALIZATIONS);
    var ctx = stateWithSpec('crafting', 'armorer');
    S.awardMasteryXP(ctx.state, ctx.pid, 'crafting', 999999);
    S.respec(ctx.state, ctx.pid, 'crafting');
    assert.strictEqual(JSON.stringify(S.SPECIALIZATIONS), before);
  });
  test('multiple players have independent states', function() {
    var state = freshState();
    var pid1  = uid();
    var pid2  = uid();
    S.chooseSpecialization(state, pid1, 'crafting', 'armorer', 5);
    S.awardMasteryXP(state, pid1, 'crafting', 500);
    assert.strictEqual(S.getMasteryLevel(state, pid2, 'crafting'), 0);
  });
  test('getExclusiveRecipes returns empty after respec', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    S.respec(ctx.state, ctx.pid, 'crafting');
    assert.deepEqual(S.getExclusiveRecipes(ctx.state, ctx.pid), []);
  });
  test('hasExclusivePerk returns false after respec', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    S.respec(ctx.state, ctx.pid, 'crafting');
    assert.strictEqual(S.hasExclusivePerk(ctx.state, ctx.pid, 'master_temper'), false);
  });
  test('getBonuses returns 0 after respec', function() {
    var ctx = stateWithSpec('crafting', 'armorer');
    S.respec(ctx.state, ctx.pid, 'crafting');
    assert.strictEqual(S.getBonuses(ctx.state, ctx.pid, 'craft_quality'), 0);
  });
});

// ============================================================================
// REPORT
// ============================================================================

process.stdout.write('\n--- Results ---\n');
process.stdout.write(passed + ' passed, ' + failed + ' failed\n');
if (errors.length > 0) {
  process.stdout.write('\nFailures:\n');
  errors.forEach(function(e) {
    process.stdout.write('  ' + e.name + ': ' + e.error.message + '\n');
  });
}
if (failed > 0) {
  process.exit(1);
}
