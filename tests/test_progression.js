/**
 * tests/test_progression.js
 * Comprehensive tests for the ZION Player Progression & Skill Tree system
 * 130+ tests covering XP, leveling, skill trees, perks, edge cases
 */

'use strict';

const { test, suite, report, assert } = require('./test_runner');
const P = require('../src/js/progression');

// ============================================================================
// HELPERS
// ============================================================================

var pid = 0;
function uid() { return 'player_' + (++pid); }

/** Create a fresh progression state */
function fresh() {
  return P.createPlayerProgression(uid());
}

/** Award XP n times from source and return final state */
function awardMultiple(state, source, times) {
  for (var i = 0; i < times; i++) {
    var result = P.awardXP(state, source);
    state = result.state;
  }
  return state;
}

/** Give a player exactly enough XP to reach a target level */
function stateAtLevel(targetLevel) {
  var state = fresh();
  var xpNeeded = P.getXPForLevel(targetLevel);
  if (xpNeeded > 0) {
    var result = P.awardXP(state, 'gathering', xpNeeded);
    state = result.state;
  }
  return state;
}

// ============================================================================
// MODULE SHAPE
// ============================================================================

suite('Module exports', function() {
  test('exports XP_SOURCES object', function() {
    assert.ok(P.XP_SOURCES && typeof P.XP_SOURCES === 'object');
  });
  test('exports SKILL_TREES object', function() {
    assert.ok(P.SKILL_TREES && typeof P.SKILL_TREES === 'object');
  });
  test('exports createPlayerProgression function', function() {
    assert.strictEqual(typeof P.createPlayerProgression, 'function');
  });
  test('exports awardXP function', function() {
    assert.strictEqual(typeof P.awardXP, 'function');
  });
  test('exports getLevel function', function() {
    assert.strictEqual(typeof P.getLevel, 'function');
  });
  test('exports getXPForLevel function', function() {
    assert.strictEqual(typeof P.getXPForLevel, 'function');
  });
  test('exports getXPToNextLevel function', function() {
    assert.strictEqual(typeof P.getXPToNextLevel, 'function');
  });
  test('exports spendSkillPoint function', function() {
    assert.strictEqual(typeof P.spendSkillPoint, 'function');
  });
  test('exports getSkillTier function', function() {
    assert.strictEqual(typeof P.getSkillTier, 'function');
  });
  test('exports hasPerks function', function() {
    assert.strictEqual(typeof P.hasPerks, 'function');
  });
  test('exports getActivePerks function', function() {
    assert.strictEqual(typeof P.getActivePerks, 'function');
  });
  test('exports applyPerkBonus function', function() {
    assert.strictEqual(typeof P.applyPerkBonus, 'function');
  });
  test('exports getProgressionSummary function', function() {
    assert.strictEqual(typeof P.getProgressionSummary, 'function');
  });
  test('exports formatSkillTree function', function() {
    assert.strictEqual(typeof P.formatSkillTree, 'function');
  });
  test('exports formatProgressBar function', function() {
    assert.strictEqual(typeof P.formatProgressBar, 'function');
  });
  test('exports getTitle function', function() {
    assert.strictEqual(typeof P.getTitle, 'function');
  });
  test('exports MAX_LEVEL = 50', function() {
    assert.strictEqual(P.MAX_LEVEL, 50);
  });
});

// ============================================================================
// XP_SOURCES STRUCTURE
// ============================================================================

suite('XP_SOURCES data', function() {
  test('crafting = 10', function() {
    assert.strictEqual(P.XP_SOURCES.crafting, 10);
  });
  test('trading = 15', function() {
    assert.strictEqual(P.XP_SOURCES.trading, 15);
  });
  test('fishing = 8', function() {
    assert.strictEqual(P.XP_SOURCES.fishing, 8);
  });
  test('dungeon_clear = 50', function() {
    assert.strictEqual(P.XP_SOURCES.dungeon_clear, 50);
  });
  test('card_win = 20', function() {
    assert.strictEqual(P.XP_SOURCES.card_win, 20);
  });
  test('quest_complete = 25', function() {
    assert.strictEqual(P.XP_SOURCES.quest_complete, 25);
  });
  test('gathering = 5', function() {
    assert.strictEqual(P.XP_SOURCES.gathering, 5);
  });
  test('social = 10', function() {
    assert.strictEqual(P.XP_SOURCES.social, 10);
  });
  test('exploring = 12', function() {
    assert.strictEqual(P.XP_SOURCES.exploring, 12);
  });
  test('teaching = 30', function() {
    assert.strictEqual(P.XP_SOURCES.teaching, 30);
  });
  test('has exactly 10 sources', function() {
    assert.strictEqual(Object.keys(P.XP_SOURCES).length, 10);
  });
});

// ============================================================================
// SKILL_TREES STRUCTURE
// ============================================================================

suite('SKILL_TREES structure', function() {
  var TREES = ['crafting', 'combat', 'gathering', 'social', 'exploration', 'knowledge'];

  test('has 6 trees', function() {
    assert.strictEqual(Object.keys(P.SKILL_TREES).length, 6);
  });

  TREES.forEach(function(key) {
    test(key + ' tree exists', function() {
      assert.ok(P.SKILL_TREES[key], 'Missing tree: ' + key);
    });
    test(key + ' has a name string', function() {
      assert.strictEqual(typeof P.SKILL_TREES[key].name, 'string');
    });
    test(key + ' has 5 tiers', function() {
      assert.strictEqual(P.SKILL_TREES[key].tiers.length, 5);
    });
    test(key + ' has 5 perks', function() {
      assert.strictEqual(P.SKILL_TREES[key].perks.length, 5);
    });
    test(key + ' tiers are strings', function() {
      P.SKILL_TREES[key].tiers.forEach(function(t) {
        assert.strictEqual(typeof t, 'string');
      });
    });
    test(key + ' perks are strings', function() {
      P.SKILL_TREES[key].perks.forEach(function(p) {
        assert.strictEqual(typeof p, 'string');
      });
    });
  });

  test('crafting name is Artisan', function() {
    assert.strictEqual(P.SKILL_TREES.crafting.name, 'Artisan');
  });
  test('combat name is Warrior', function() {
    assert.strictEqual(P.SKILL_TREES.combat.name, 'Warrior');
  });
  test('gathering name is Harvester', function() {
    assert.strictEqual(P.SKILL_TREES.gathering.name, 'Harvester');
  });
  test('social name is Diplomat', function() {
    assert.strictEqual(P.SKILL_TREES.social.name, 'Diplomat');
  });
  test('exploration name is Pathfinder', function() {
    assert.strictEqual(P.SKILL_TREES.exploration.name, 'Pathfinder');
  });
  test('knowledge name is Scholar', function() {
    assert.strictEqual(P.SKILL_TREES.knowledge.name, 'Scholar');
  });

  test('crafting first tier is Novice Crafter', function() {
    assert.strictEqual(P.SKILL_TREES.crafting.tiers[0], 'Novice Crafter');
  });
  test('crafting last tier is Grand Artisan', function() {
    assert.strictEqual(P.SKILL_TREES.crafting.tiers[4], 'Grand Artisan');
  });
  test('combat first perk is damage_10', function() {
    assert.strictEqual(P.SKILL_TREES.combat.perks[0], 'damage_10');
  });
  test('knowledge last perk is enlightenment', function() {
    assert.strictEqual(P.SKILL_TREES.knowledge.perks[4], 'enlightenment');
  });
});

// ============================================================================
// createPlayerProgression
// ============================================================================

suite('createPlayerProgression', function() {
  test('returns an object', function() {
    var s = fresh();
    assert.ok(s && typeof s === 'object');
  });
  test('playerId is set', function() {
    var id = uid();
    var s  = P.createPlayerProgression(id);
    assert.strictEqual(s.playerId, id);
  });
  test('totalXP starts at 0', function() {
    assert.strictEqual(fresh().totalXP, 0);
  });
  test('level starts at 1', function() {
    assert.strictEqual(fresh().level, 1);
  });
  test('skillPoints starts at 0', function() {
    assert.strictEqual(fresh().skillPoints, 0);
  });
  test('xpHistory starts empty', function() {
    assert.deepStrictEqual(fresh().xpHistory, []);
  });
  test('perks starts empty', function() {
    assert.deepStrictEqual(fresh().perks, []);
  });
  test('skills object has 6 trees', function() {
    var s = fresh();
    assert.strictEqual(Object.keys(s.skills).length, 6);
  });
  test('all skills start at 0', function() {
    var s = fresh();
    Object.values(s.skills).forEach(function(v) {
      assert.strictEqual(v, 0);
    });
  });
  test('two calls produce independent states', function() {
    var a = fresh();
    var b = fresh();
    assert.notStrictEqual(a.playerId, b.playerId);
  });
});

// ============================================================================
// getLevel formula
// ============================================================================

suite('getLevel formula', function() {
  test('0 XP → level 1', function() {
    assert.strictEqual(P.getLevel(0), 1);
  });
  test('99 XP → level 1', function() {
    assert.strictEqual(P.getLevel(99), 1);
  });
  test('100 XP → level 2', function() {
    assert.strictEqual(P.getLevel(100), 2);
  });
  test('level 10: threshold is 8100 XP', function() {
    // level 10 → (10-1)^2 * 100 = 8100
    assert.strictEqual(P.getLevel(8100), 10);
  });
  test('level 10: 8099 XP is level 9', function() {
    assert.strictEqual(P.getLevel(8099), 9);
  });
  test('level 25: threshold is 57600 XP', function() {
    // (25-1)^2 * 100 = 576 * 100 = 57600
    assert.strictEqual(P.getLevel(57600), 25);
  });
  test('level 50: threshold is 240100 XP', function() {
    // (50-1)^2 * 100 = 2401 * 100 = 240100
    assert.strictEqual(P.getLevel(240100), 50);
  });
  test('XP beyond level 50 caps at 50', function() {
    assert.strictEqual(P.getLevel(9999999), 50);
  });
  test('negative XP → level 1', function() {
    assert.strictEqual(P.getLevel(-100), 1);
  });
});

// ============================================================================
// getXPForLevel formula
// ============================================================================

suite('getXPForLevel formula', function() {
  test('level 1 → 0 XP', function() {
    assert.strictEqual(P.getXPForLevel(1), 0);
  });
  test('level 2 → 100 XP', function() {
    assert.strictEqual(P.getXPForLevel(2), 100);
  });
  test('level 10 → 8100 XP', function() {
    assert.strictEqual(P.getXPForLevel(10), 8100);
  });
  test('level 25 → 57600 XP', function() {
    assert.strictEqual(P.getXPForLevel(25), 57600);
  });
  test('level 50 → 240100 XP', function() {
    assert.strictEqual(P.getXPForLevel(50), 240100);
  });
  test('level 0 clamped to level 1', function() {
    assert.strictEqual(P.getXPForLevel(0), 0);
  });
  test('level > 50 clamped to level 50', function() {
    assert.strictEqual(P.getXPForLevel(99), P.getXPForLevel(50));
  });
  test('round-trip: getLevel(getXPForLevel(n)) = n for n=1..10', function() {
    for (var n = 1; n <= 10; n++) {
      assert.strictEqual(P.getLevel(P.getXPForLevel(n)), n, 'Failed at level ' + n);
    }
  });
});

// ============================================================================
// awardXP
// ============================================================================

suite('awardXP - basic', function() {
  test('returns state, leveled, newLevel, skillPointsGained, message', function() {
    var r = P.awardXP(fresh(), 'gathering');
    assert.ok('state' in r);
    assert.ok('leveled' in r);
    assert.ok('newLevel' in r);
    assert.ok('skillPointsGained' in r);
    assert.ok('message' in r);
  });
  test('does not mutate original state', function() {
    var s  = fresh();
    var xp = s.totalXP;
    P.awardXP(s, 'gathering');
    assert.strictEqual(s.totalXP, xp);
  });
  test('totalXP increases by source amount', function() {
    var r = P.awardXP(fresh(), 'gathering');
    assert.strictEqual(r.state.totalXP, 5);
  });
  test('crafting awards 10 XP', function() {
    var r = P.awardXP(fresh(), 'crafting');
    assert.strictEqual(r.state.totalXP, 10);
  });
  test('trading awards 15 XP', function() {
    var r = P.awardXP(fresh(), 'trading');
    assert.strictEqual(r.state.totalXP, 15);
  });
  test('dungeon_clear awards 50 XP', function() {
    var r = P.awardXP(fresh(), 'dungeon_clear');
    assert.strictEqual(r.state.totalXP, 50);
  });
  test('custom amount overrides source default', function() {
    var r = P.awardXP(fresh(), 'gathering', 100);
    assert.strictEqual(r.state.totalXP, 100);
  });
  test('unknown source with no amount awards 0 XP', function() {
    var r = P.awardXP(fresh(), 'flying_pigs');
    assert.strictEqual(r.state.totalXP, 0);
  });
  test('xpHistory entry added after award', function() {
    var r = P.awardXP(fresh(), 'fishing');
    assert.strictEqual(r.state.xpHistory.length, 1);
  });
  test('xpHistory entry has source field', function() {
    var r = P.awardXP(fresh(), 'fishing');
    assert.strictEqual(r.state.xpHistory[0].source, 'fishing');
  });
  test('xpHistory entry has amount field = 8', function() {
    var r = P.awardXP(fresh(), 'fishing');
    assert.strictEqual(r.state.xpHistory[0].amount, 8);
  });
  test('xpHistory entry has totalAfter field', function() {
    var r = P.awardXP(fresh(), 'fishing');
    assert.strictEqual(r.state.xpHistory[0].totalAfter, 8);
  });
  test('leveled is false when still at same level', function() {
    var r = P.awardXP(fresh(), 'gathering');
    assert.strictEqual(r.leveled, false);
  });
  test('skillPointsGained is 0 when no level up', function() {
    var r = P.awardXP(fresh(), 'gathering');
    assert.strictEqual(r.skillPointsGained, 0);
  });
});

suite('awardXP - level up', function() {
  test('leveled is true when crossing level threshold', function() {
    var r = P.awardXP(fresh(), 'gathering', 100); // enough for level 2
    assert.strictEqual(r.leveled, true);
  });
  test('skillPointsGained = 1 on single level up', function() {
    var r = P.awardXP(fresh(), 'gathering', 100);
    assert.strictEqual(r.skillPointsGained, 1);
  });
  test('skillPoints accumulates after multiple level-ups', function() {
    var s = fresh();
    var r = P.awardXP(s, 'gathering', 1000); // should jump multiple levels
    assert.ok(r.state.skillPoints >= 1);
  });
  test('state.level reflects new level after award', function() {
    var r = P.awardXP(fresh(), 'gathering', 100);
    assert.strictEqual(r.state.level, 2);
  });
  test('jumping multiple levels gives multiple skill points', function() {
    var r = P.awardXP(fresh(), 'gathering', 8100); // level 10
    assert.ok(r.state.skillPoints >= 9, 'Expected >= 9 skill points, got ' + r.state.skillPoints);
  });
  test('level cap at 50 — no skill points beyond that', function() {
    var s  = stateAtLevel(50);
    var r  = P.awardXP(s, 'gathering', 999999);
    assert.strictEqual(r.state.level, 50);
  });
  test('message includes "Level up" on level up', function() {
    var r = P.awardXP(fresh(), 'gathering', 100);
    assert.ok(r.message.toLowerCase().indexOf('level up') !== -1, r.message);
  });
  test('message includes XP source when no level up', function() {
    var r = P.awardXP(fresh(), 'fishing');
    assert.ok(r.message.indexOf('fishing') !== -1, r.message);
  });
});

// ============================================================================
// getXPToNextLevel
// ============================================================================

suite('getXPToNextLevel', function() {
  test('fresh state needs 100 XP to reach level 2', function() {
    assert.strictEqual(P.getXPToNextLevel(fresh()), 100);
  });
  test('after 50 XP, need 50 more', function() {
    var r = P.awardXP(fresh(), 'gathering', 50);
    assert.strictEqual(P.getXPToNextLevel(r.state), 50);
  });
  test('at max level returns 0', function() {
    var s = stateAtLevel(50);
    assert.strictEqual(P.getXPToNextLevel(s), 0);
  });
  test('at level 10 threshold, need 2100 more for level 11', function() {
    // level 10 = 8100 XP, level 11 = (11-1)^2*100 = 10000
    var s = stateAtLevel(10);
    var need = P.getXPForLevel(11) - P.getXPForLevel(10);
    assert.strictEqual(P.getXPToNextLevel(s), need);
  });
});

// ============================================================================
// getSkillTier
// ============================================================================

suite('getSkillTier', function() {
  test('returns 0 for fresh state', function() {
    assert.strictEqual(P.getSkillTier(fresh(), 'crafting'), 0);
  });
  test('returns 0 for unknown tree', function() {
    assert.strictEqual(P.getSkillTier(fresh(), 'nonexistent'), 0);
  });
  test('returns correct tier after spending points', function() {
    var s  = stateAtLevel(5); // has skill points
    var r  = P.spendSkillPoint(s, 'crafting');
    assert.strictEqual(P.getSkillTier(r.state, 'crafting'), 1);
  });
});

// ============================================================================
// spendSkillPoint
// ============================================================================

suite('spendSkillPoint - valid spend', function() {
  test('returns success: true when points available', function() {
    var s = stateAtLevel(2); // has 1 skill point
    var r = P.spendSkillPoint(s, 'crafting');
    assert.strictEqual(r.success, true);
  });
  test('reduces skillPoints by tier cost', function() {
    var s = stateAtLevel(2); // 1 sp, tier 1 costs 1
    var r = P.spendSkillPoint(s, 'crafting');
    assert.strictEqual(r.state.skillPoints, 0);
  });
  test('increments skill tier to 1', function() {
    var s = stateAtLevel(2);
    var r = P.spendSkillPoint(s, 'crafting');
    assert.strictEqual(r.state.skills.crafting, 1);
  });
  test('adds perk to state.perks', function() {
    var s = stateAtLevel(2);
    var r = P.spendSkillPoint(s, 'crafting');
    assert.ok(r.state.perks.indexOf('craft_speed_10') !== -1);
  });
  test('returns perk id', function() {
    var s = stateAtLevel(2);
    var r = P.spendSkillPoint(s, 'crafting');
    assert.strictEqual(r.perk, 'craft_speed_10');
  });
  test('returns tierName for unlocked tier', function() {
    var s = stateAtLevel(2);
    var r = P.spendSkillPoint(s, 'crafting');
    assert.strictEqual(r.tierName, 'Novice Crafter');
  });
  test('does not mutate original state', function() {
    var s  = stateAtLevel(2);
    var sp = s.skillPoints;
    P.spendSkillPoint(s, 'crafting');
    assert.strictEqual(s.skillPoints, sp);
  });
  test('can unlock tier 2 after tier 1', function() {
    // Need 1+2 = 3 skill points, so level 4
    var s  = stateAtLevel(4);
    var r1 = P.spendSkillPoint(s, 'crafting');
    var r2 = P.spendSkillPoint(r1.state, 'crafting');
    assert.strictEqual(r2.success, true);
    assert.strictEqual(r2.state.skills.crafting, 2);
  });
  test('tier 2 costs 2 points', function() {
    var s   = stateAtLevel(10); // plenty of points
    var r1  = P.spendSkillPoint(s, 'combat');
    var sp1 = r1.state.skillPoints;
    var r2  = P.spendSkillPoint(r1.state, 'combat');
    assert.strictEqual(sp1 - r2.state.skillPoints, 2);
  });
  test('tier 5 costs 5 points', function() {
    // Need 1+2+3+4+5=15 points — level 16 gives 15 skill points
    var s = stateAtLevel(16);
    var cur = s;
    for (var i = 0; i < 4; i++) {
      var r = P.spendSkillPoint(cur, 'knowledge');
      cur = r.state;
    }
    var sp_before = cur.skillPoints;
    var r5 = P.spendSkillPoint(cur, 'knowledge');
    assert.strictEqual(r5.success, true);
    assert.strictEqual(sp_before - r5.state.skillPoints, 5);
  });
  test('each tree is independent', function() {
    var s  = stateAtLevel(5);
    var r1 = P.spendSkillPoint(s, 'crafting');
    var r2 = P.spendSkillPoint(r1.state, 'combat');
    assert.strictEqual(r2.state.skills.crafting, 1);
    assert.strictEqual(r2.state.skills.combat, 1);
  });
});

suite('spendSkillPoint - failures', function() {
  test('success: false with no skill points', function() {
    var r = P.spendSkillPoint(fresh(), 'crafting');
    assert.strictEqual(r.success, false);
  });
  test('returns message about insufficient points', function() {
    var r = P.spendSkillPoint(fresh(), 'crafting');
    assert.ok(typeof r.message === 'string' && r.message.length > 0);
  });
  test('state unchanged when no skill points', function() {
    var s = fresh();
    var r = P.spendSkillPoint(s, 'crafting');
    assert.strictEqual(r.state.skills.crafting, 0);
    assert.strictEqual(r.state.skillPoints, 0);
  });
  test('success: false for fully unlocked tree', function() {
    var s = stateAtLevel(16); // 15 points, need 1+2+3+4+5=15
    var cur = s;
    for (var i = 0; i < 5; i++) {
      var r = P.spendSkillPoint(cur, 'social');
      cur = r.state;
    }
    var r6 = P.spendSkillPoint(cur, 'social');
    assert.strictEqual(r6.success, false);
  });
  test('success: false for unknown tree', function() {
    var s = stateAtLevel(2);
    var r = P.spendSkillPoint(s, 'magic');
    assert.strictEqual(r.success, false);
  });
  test('message mentions unknown tree', function() {
    var s = stateAtLevel(2);
    var r = P.spendSkillPoint(s, 'magic');
    assert.ok(r.message.indexOf('magic') !== -1, r.message);
  });
  test('perk is null on failure', function() {
    var r = P.spendSkillPoint(fresh(), 'crafting');
    assert.strictEqual(r.perk, null);
  });
  test('tierName is null on failure', function() {
    var r = P.spendSkillPoint(fresh(), 'crafting');
    assert.strictEqual(r.tierName, null);
  });
});

// ============================================================================
// hasPerks
// ============================================================================

suite('hasPerks', function() {
  test('returns false for fresh state', function() {
    assert.strictEqual(P.hasPerks(fresh(), 'craft_speed_10'), false);
  });
  test('returns true after perk unlocked', function() {
    var s = stateAtLevel(2);
    var r = P.spendSkillPoint(s, 'crafting');
    assert.strictEqual(P.hasPerks(r.state, 'craft_speed_10'), true);
  });
  test('returns false for perk not yet unlocked', function() {
    var s = stateAtLevel(2);
    var r = P.spendSkillPoint(s, 'crafting');
    assert.strictEqual(P.hasPerks(r.state, 'craft_speed_25'), false);
  });
  test('returns false for null state', function() {
    assert.strictEqual(P.hasPerks(null, 'craft_speed_10'), false);
  });
  test('returns false for unknown perk', function() {
    var s = stateAtLevel(2);
    var r = P.spendSkillPoint(s, 'crafting');
    assert.strictEqual(P.hasPerks(r.state, 'nonexistent_perk'), false);
  });
});

// ============================================================================
// getActivePerks
// ============================================================================

suite('getActivePerks', function() {
  test('returns empty array for fresh state', function() {
    assert.deepStrictEqual(P.getActivePerks(fresh()), []);
  });
  test('returns one item after one perk unlock', function() {
    var s = stateAtLevel(2);
    var r = P.spendSkillPoint(s, 'crafting');
    assert.strictEqual(P.getActivePerks(r.state).length, 1);
  });
  test('perk item has perkId field', function() {
    var s = stateAtLevel(2);
    var r = P.spendSkillPoint(s, 'crafting');
    var perks = P.getActivePerks(r.state);
    assert.strictEqual(perks[0].perkId, 'craft_speed_10');
  });
  test('perk item has description string', function() {
    var s = stateAtLevel(2);
    var r = P.spendSkillPoint(s, 'crafting');
    var perks = P.getActivePerks(r.state);
    assert.strictEqual(typeof perks[0].description, 'string');
    assert.ok(perks[0].description.length > 0);
  });
  test('perk item has tree name', function() {
    var s = stateAtLevel(2);
    var r = P.spendSkillPoint(s, 'crafting');
    var perks = P.getActivePerks(r.state);
    assert.strictEqual(perks[0].tree, 'Artisan');
  });
  test('perk item has tier number', function() {
    var s = stateAtLevel(2);
    var r = P.spendSkillPoint(s, 'crafting');
    var perks = P.getActivePerks(r.state);
    assert.strictEqual(perks[0].tier, 1);
  });
  test('two perks after two unlocks', function() {
    var s  = stateAtLevel(10);
    var r1 = P.spendSkillPoint(s, 'crafting');
    var r2 = P.spendSkillPoint(r1.state, 'combat');
    assert.strictEqual(P.getActivePerks(r2.state).length, 2);
  });
  test('returns empty array for null state', function() {
    assert.deepStrictEqual(P.getActivePerks(null), []);
  });
});

// ============================================================================
// applyPerkBonus
// ============================================================================

suite('applyPerkBonus - no perks', function() {
  test('returns base value unchanged when no perks', function() {
    assert.strictEqual(P.applyPerkBonus(fresh(), 'craft', 100), 100);
  });
  test('returns base value for unknown action', function() {
    assert.strictEqual(P.applyPerkBonus(fresh(), 'flying', 50), 50);
  });
});

suite('applyPerkBonus - with perks', function() {
  function stateWith(tree, tiers) {
    var s = stateAtLevel(20); // plenty of points
    var cur = s;
    for (var i = 0; i < tiers; i++) {
      var r = P.spendSkillPoint(cur, tree);
      cur = r.state;
    }
    return cur;
  }

  test('craft_speed_10 applies +10% to craft action', function() {
    var s = stateWith('crafting', 1); // has craft_speed_10
    var v = P.applyPerkBonus(s, 'craft', 100);
    assert.ok(Math.abs(v - 110) < 0.01, 'Expected 110, got ' + v);
  });
  test('craft_speed_25 stacks on top of craft_speed_10', function() {
    var s = stateWith('crafting', 2); // has craft_speed_10 + craft_speed_25
    var v = P.applyPerkBonus(s, 'craft', 100);
    // 100 * 1.10 * 1.25 = 137.5
    assert.ok(Math.abs(v - 137.5) < 0.01, 'Expected 137.5, got ' + v);
  });
  test('trade_discount_5 reduces trade value by 5%', function() {
    var s = stateWith('social', 1);
    var v = P.applyPerkBonus(s, 'trade', 100);
    assert.ok(Math.abs(v - 95) < 0.01, 'Expected 95, got ' + v);
  });
  test('damage_10 applies +10% to damage action', function() {
    var s = stateWith('combat', 1);
    var v = P.applyPerkBonus(s, 'damage', 50);
    assert.ok(Math.abs(v - 55) < 0.01, 'Expected 55, got ' + v);
  });
  test('defense_10 applies +10% to defense action', function() {
    var s = stateWith('combat', 2);
    var v = P.applyPerkBonus(s, 'defense', 100);
    assert.ok(Math.abs(v - 110) < 0.01, 'Expected 110, got ' + v);
  });
  test('gather_speed_10 applies +10% to gather action', function() {
    var s = stateWith('gathering', 1);
    var v = P.applyPerkBonus(s, 'gather', 100);
    assert.ok(Math.abs(v - 110) < 0.01, 'Expected ~110, got ' + v);
  });
  test('travel_cost_10 reduces travel cost by 10%', function() {
    var s = stateWith('exploration', 1);
    var v = P.applyPerkBonus(s, 'travel', 100);
    assert.ok(Math.abs(v - 90) < 0.01, 'Expected 90, got ' + v);
  });
  test('xp_gain_10 applies +10% to xp action', function() {
    var s = stateWith('knowledge', 1);
    var v = P.applyPerkBonus(s, 'xp', 100);
    assert.ok(Math.abs(v - 110) < 0.01, 'Expected 110, got ' + v);
  });
  test('dungeon_loot_bonus applies to dungeon action', function() {
    var s = stateWith('combat', 3);
    var v = P.applyPerkBonus(s, 'dungeon', 100);
    assert.ok(v > 100, 'Expected > 100, got ' + v);
  });
  test('reputation_gain_25 applies +25%', function() {
    var s = stateWith('social', 4);
    var v = P.applyPerkBonus(s, 'reputation', 100);
    assert.ok(Math.abs(v - 125) < 0.01, 'Expected 125, got ' + v);
  });
});

// ============================================================================
// getTitle
// ============================================================================

suite('getTitle', function() {
  test('level 1 → Newcomer', function() {
    assert.strictEqual(P.getTitle(1), 'Newcomer');
  });
  test('level 5 → Newcomer', function() {
    assert.strictEqual(P.getTitle(5), 'Newcomer');
  });
  test('level 6 → Initiate', function() {
    assert.strictEqual(P.getTitle(6), 'Initiate');
  });
  test('level 10 → Initiate', function() {
    assert.strictEqual(P.getTitle(10), 'Initiate');
  });
  test('level 25 → Veteran', function() {
    assert.strictEqual(P.getTitle(25), 'Veteran');
  });
  test('level 50 → Legend', function() {
    assert.strictEqual(P.getTitle(50), 'Legend');
  });
  test('level 35 → Master', function() {
    assert.strictEqual(P.getTitle(35), 'Master');
  });
});

// ============================================================================
// formatProgressBar
// ============================================================================

suite('formatProgressBar', function() {
  test('returns a string', function() {
    assert.strictEqual(typeof P.formatProgressBar(0, 100), 'string');
  });
  test('0/100 → starts with [----------]', function() {
    var bar = P.formatProgressBar(0, 100);
    assert.ok(bar.indexOf('[----------]') !== -1 || bar.indexOf('0%') !== -1, bar);
  });
  test('100/100 → shows 100%', function() {
    var bar = P.formatProgressBar(100, 100);
    assert.ok(bar.indexOf('100%') !== -1, bar);
  });
  test('50/100 → shows 50%', function() {
    var bar = P.formatProgressBar(50, 100);
    assert.ok(bar.indexOf('50%') !== -1, bar);
  });
  test('contains [ and ]', function() {
    var bar = P.formatProgressBar(30, 100);
    assert.ok(bar.indexOf('[') !== -1 && bar.indexOf(']') !== -1, bar);
  });
  test('max=0 returns 100%', function() {
    var bar = P.formatProgressBar(0, 0);
    assert.ok(bar.indexOf('100%') !== -1, bar);
  });
  test('value > max clamps to 100%', function() {
    var bar = P.formatProgressBar(200, 100);
    assert.ok(bar.indexOf('100%') !== -1, bar);
  });
  test('contains # characters for filled portion', function() {
    var bar = P.formatProgressBar(100, 100);
    assert.ok(bar.indexOf('#') !== -1, bar);
  });
  test('contains - characters for empty portion', function() {
    var bar = P.formatProgressBar(0, 100);
    assert.ok(bar.indexOf('-') !== -1, bar);
  });
});

// ============================================================================
// formatSkillTree
// ============================================================================

suite('formatSkillTree', function() {
  test('returns a string', function() {
    assert.strictEqual(typeof P.formatSkillTree('crafting', 0), 'string');
  });
  test('contains tree name', function() {
    var html = P.formatSkillTree('crafting', 0);
    assert.ok(html.indexOf('Artisan') !== -1, html);
  });
  test('contains tier names', function() {
    var html = P.formatSkillTree('crafting', 0);
    assert.ok(html.indexOf('Novice Crafter') !== -1, html);
  });
  test('contains HTML tags', function() {
    var html = P.formatSkillTree('crafting', 0);
    assert.ok(html.indexOf('<div') !== -1, html);
  });
  test('unknown tree returns error element', function() {
    var html = P.formatSkillTree('magic', 0);
    assert.ok(html.indexOf('magic') !== -1, html);
  });
  test('unlocked tier marked with unlocked class or text', function() {
    var html = P.formatSkillTree('crafting', 2);
    assert.ok(html.indexOf('unlocked') !== -1, html);
  });
  test('shows cost for locked tiers', function() {
    var html = P.formatSkillTree('crafting', 0);
    assert.ok(html.indexOf('pt') !== -1, html);
  });
  test('default currentTier=0 works', function() {
    var html = P.formatSkillTree('combat');
    assert.ok(typeof html === 'string' && html.length > 0);
  });
});

// ============================================================================
// getProgressionSummary
// ============================================================================

suite('getProgressionSummary', function() {
  test('returns an object', function() {
    assert.ok(typeof P.getProgressionSummary(fresh()) === 'object');
  });
  test('has playerId', function() {
    var s = fresh();
    var sum = P.getProgressionSummary(s);
    assert.strictEqual(sum.playerId, s.playerId);
  });
  test('has level field', function() {
    assert.ok('level' in P.getProgressionSummary(fresh()));
  });
  test('has title field', function() {
    assert.ok('title' in P.getProgressionSummary(fresh()));
  });
  test('has totalXP field', function() {
    assert.ok('totalXP' in P.getProgressionSummary(fresh()));
  });
  test('has skillPoints field', function() {
    assert.ok('skillPoints' in P.getProgressionSummary(fresh()));
  });
  test('has trees array of length 6', function() {
    var sum = P.getProgressionSummary(fresh());
    assert.strictEqual(sum.trees.length, 6);
  });
  test('each tree has key, name, currentTier, maxTiers', function() {
    var sum = P.getProgressionSummary(fresh());
    sum.trees.forEach(function(t) {
      assert.ok('key' in t, 'Missing key');
      assert.ok('name' in t, 'Missing name');
      assert.ok('currentTier' in t, 'Missing currentTier');
      assert.ok('maxTiers' in t, 'Missing maxTiers for ' + t.key);
    });
  });
  test('has progressBar string', function() {
    var sum = P.getProgressionSummary(fresh());
    assert.strictEqual(typeof sum.progressBar, 'string');
  });
  test('has perks array', function() {
    var sum = P.getProgressionSummary(fresh());
    assert.ok(Array.isArray(sum.perks));
  });
  test('title is Newcomer for level 1', function() {
    var sum = P.getProgressionSummary(fresh());
    assert.strictEqual(sum.title, 'Newcomer');
  });
  test('xpToNextLevel is 100 for fresh state', function() {
    var sum = P.getProgressionSummary(fresh());
    assert.strictEqual(sum.xpToNextLevel, 100);
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

suite('Edge cases', function() {
  test('awardXP with amount=0 does not level up', function() {
    var r = P.awardXP(fresh(), 'gathering', 0);
    assert.strictEqual(r.leveled, false);
  });
  test('getLevel at exactly level boundary is correct', function() {
    // Level 5: (5-1)^2 * 100 = 1600
    assert.strictEqual(P.getLevel(1600), 5);
  });
  test('chaining awardXP multiple times accumulates XP', function() {
    var s = fresh();
    for (var i = 0; i < 5; i++) {
      s = P.awardXP(s, 'crafting').state;
    }
    assert.strictEqual(s.totalXP, 50);
  });
  test('xpHistory grows with each award', function() {
    var s = fresh();
    for (var i = 0; i < 3; i++) {
      s = P.awardXP(s, 'fishing').state;
    }
    assert.strictEqual(s.xpHistory.length, 3);
  });
  test('skills object not shared between cloned states', function() {
    var s  = stateAtLevel(2);
    var r1 = P.spendSkillPoint(s, 'crafting');
    var r2 = P.spendSkillPoint(s, 'combat');
    // r1 should not have combat tier 1
    assert.strictEqual(r1.state.skills.combat, 0);
  });
  test('perks array not shared between cloned states', function() {
    var s  = stateAtLevel(5);
    var r1 = P.spendSkillPoint(s, 'crafting');
    var r2 = P.spendSkillPoint(s, 'combat');
    assert.ok(r1.state.perks.indexOf('damage_10') === -1);
    assert.ok(r2.state.perks.indexOf('craft_speed_10') === -1);
  });
  test('cannot spend skill point from tier 5 in fully maxed tree', function() {
    var s = stateAtLevel(20);
    var cur = s;
    for (var i = 0; i < 5; i++) {
      cur = P.spendSkillPoint(cur, 'knowledge').state;
    }
    var r = P.spendSkillPoint(cur, 'knowledge');
    assert.strictEqual(r.success, false);
  });
  test('getXPToNextLevel with no totalXP property', function() {
    // Defensive: state.totalXP=0
    var s = { totalXP: 0, level: 1, skillPoints: 0, skills: {}, perks: [] };
    assert.strictEqual(P.getXPToNextLevel(s), 100);
  });
  test('SKILL_TREES is frozen / not directly mutated by spend', function() {
    var treesBefore = JSON.stringify(P.SKILL_TREES);
    var s = stateAtLevel(5);
    P.spendSkillPoint(s, 'crafting');
    assert.strictEqual(JSON.stringify(P.SKILL_TREES), treesBefore);
  });
});

// ============================================================================
// REPORT
// ============================================================================

if (!report()) process.exit(1);
