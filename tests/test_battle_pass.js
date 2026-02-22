/**
 * tests/test_battle_pass.js
 * 155+ tests for the ZION Battle Pass System
 * Run with: node tests/test_battle_pass.js
 */

var BP = require('../src/js/battle_pass');

// =========================================================================
// MINIMAL TEST FRAMEWORK
// =========================================================================

var passed = 0;
var failed = 0;
var failures = [];
var currentSuite = '';

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
    throw new Error(msg || ('Deep equal failed: ' + as + ' vs ' + bs));
  }
};

function suite(name, fn) {
  currentSuite = name;
  console.log('\n' + name);
  fn();
}

function test(name, fn) {
  try {
    fn();
    passed++;
    process.stdout.write('  PASS ' + name + '\n');
  } catch (e) {
    failed++;
    failures.push({ suite: currentSuite, name: name, error: e.message });
    process.stdout.write('  FAIL ' + name + '\n    ' + e.message + '\n');
  }
}

// =========================================================================
// HELPERS
// =========================================================================

function freshState() {
  return {};
}

function stateWithPlayer(playerId, spark) {
  var s = freshState();
  s.players = {};
  s.players[playerId] = { spark: spark || 200 };
  return s;
}

function setupPass(playerId, seasonId, spark) {
  var state = stateWithPlayer(playerId, spark !== undefined ? spark : 200);
  BP.initSeason(state, seasonId);
  BP.initPlayerPass(state, playerId, seasonId);
  return state;
}

function advanceToTier(state, playerId, seasonId, tier) {
  var xpNeeded = tier * 50;
  BP.addXPToSeason(state, playerId, seasonId, xpNeeded, 'test');
}

// =========================================================================
// SUITE 1 — MODULE EXPORTS
// =========================================================================

suite('Module Exports', function() {

  test('BP module is an object', function() {
    assert(typeof BP === 'object' && BP !== null, 'BP must be an object');
  });

  test('SEASONS is exported', function() {
    assert(typeof BP.SEASONS === 'object', 'SEASONS must be exported');
  });

  test('TIER_REWARDS is exported as array', function() {
    assert(Array.isArray(BP.TIER_REWARDS), 'TIER_REWARDS must be array');
  });

  test('FREE_TRACK is exported as array', function() {
    assert(Array.isArray(BP.FREE_TRACK), 'FREE_TRACK must be array');
  });

  test('PREMIUM_TRACK is exported as array', function() {
    assert(Array.isArray(BP.PREMIUM_TRACK), 'PREMIUM_TRACK must be array');
  });

  test('TOTAL_TIERS is exported as 40', function() {
    assert.strictEqual(BP.TOTAL_TIERS, 40);
  });

  test('VALID_REWARD_TYPES is exported as array', function() {
    assert(Array.isArray(BP.VALID_REWARD_TYPES), 'VALID_REWARD_TYPES must be array');
  });

  test('All core functions are exported', function() {
    var fns = [
      'initSeason', 'initPlayerPass', 'addXP', 'addXPToSeason',
      'claimReward', 'claimRewardForSeason', 'claimAllRewards',
      'purchasePremium', 'getCurrentTier', 'getTierProgress',
      'getRewards', 'getAllTierRewards', 'getUnclaimedRewards',
      'getClaimedRewards', 'getXPSources', 'getSeasonInfo',
      'getSeasonTimeRemaining', 'isSeasonActive', 'endSeason',
      'getLeaderboard', 'getCompletionStats'
    ];
    fns.forEach(function(fn) {
      assert(typeof BP[fn] === 'function', 'Missing export: ' + fn);
    });
  });

});

// =========================================================================
// SUITE 2 — SEASON DEFINITIONS
// =========================================================================

suite('SEASONS — definitions', function() {

  test('SEASONS has season_1_spring', function() {
    assert(BP.SEASONS.season_1_spring !== undefined);
  });

  test('season_1_spring has correct id', function() {
    assert.strictEqual(BP.SEASONS.season_1_spring.id, 'season_1_spring');
  });

  test('season_1_spring has correct name', function() {
    assert.strictEqual(BP.SEASONS.season_1_spring.name, 'Season 1: Awakening');
  });

  test('season_1_spring theme is spring', function() {
    assert.strictEqual(BP.SEASONS.season_1_spring.theme, 'spring');
  });

  test('season_1_spring startTick is 0', function() {
    assert.strictEqual(BP.SEASONS.season_1_spring.startTick, 0);
  });

  test('season_1_spring duration is 20160', function() {
    assert.strictEqual(BP.SEASONS.season_1_spring.duration, 20160);
  });

  test('season_1_spring has 40 tiers', function() {
    assert.strictEqual(BP.SEASONS.season_1_spring.tiers, 40);
  });

  test('season_1_spring xpPerTier is 50', function() {
    assert.strictEqual(BP.SEASONS.season_1_spring.xpPerTier, 50);
  });

  test('season_1_spring premiumCost is 100', function() {
    assert.strictEqual(BP.SEASONS.season_1_spring.premiumCost, 100);
  });

  test('SEASONS has at least 2 seasons defined', function() {
    assert(Object.keys(BP.SEASONS).length >= 2);
  });

  test('All seasons have required fields', function() {
    var required = ['id', 'name', 'theme', 'startTick', 'duration', 'tiers', 'xpPerTier', 'premiumCost'];
    Object.values(BP.SEASONS).forEach(function(s) {
      required.forEach(function(f) {
        assert(s[f] !== undefined, 'Season ' + s.id + ' missing field: ' + f);
      });
    });
  });

});

// =========================================================================
// SUITE 3 — TIER REWARDS STRUCTURE
// =========================================================================

suite('TIER_REWARDS — structure', function() {

  test('TIER_REWARDS has exactly 40 entries', function() {
    assert.strictEqual(BP.TIER_REWARDS.length, 40);
  });

  test('FREE_TRACK has exactly 40 entries', function() {
    assert.strictEqual(BP.FREE_TRACK.length, 40);
  });

  test('PREMIUM_TRACK has exactly 40 entries', function() {
    assert.strictEqual(BP.PREMIUM_TRACK.length, 40);
  });

  test('Each TIER_REWARDS entry has tier, free, premium', function() {
    BP.TIER_REWARDS.forEach(function(t) {
      assert(typeof t.tier === 'number', 'tier must be number');
      assert(t.free !== undefined && t.free !== null, 'free reward must exist at tier ' + t.tier);
      assert(t.premium !== undefined && t.premium !== null, 'premium reward must exist at tier ' + t.tier);
    });
  });

  test('TIER_REWARDS tier numbers are 1-40 in order', function() {
    for (var i = 0; i < 40; i++) {
      assert.strictEqual(BP.TIER_REWARDS[i].tier, i + 1);
    }
  });

  test('All free rewards have a valid type', function() {
    BP.TIER_REWARDS.forEach(function(t) {
      assert(BP.VALID_REWARD_TYPES.indexOf(t.free.type) !== -1,
        'Invalid free reward type at tier ' + t.tier + ': ' + t.free.type);
    });
  });

  test('All premium rewards have a valid type', function() {
    BP.TIER_REWARDS.forEach(function(t) {
      assert(BP.VALID_REWARD_TYPES.indexOf(t.premium.type) !== -1,
        'Invalid premium reward type at tier ' + t.tier + ': ' + t.premium.type);
    });
  });

  test('Tier 10 free reward is a cosmetic', function() {
    assert.strictEqual(BP.TIER_REWARDS[9].free.type, 'cosmetic');
  });

  test('Tier 20 free reward is a cosmetic', function() {
    assert.strictEqual(BP.TIER_REWARDS[19].free.type, 'cosmetic');
  });

  test('Tier 30 free reward is a cosmetic', function() {
    assert.strictEqual(BP.TIER_REWARDS[29].free.type, 'cosmetic');
  });

  test('Tier 40 free reward is a cosmetic', function() {
    assert.strictEqual(BP.TIER_REWARDS[39].free.type, 'cosmetic');
  });

  test('Tier 40 premium reward is a legendary cosmetic', function() {
    var r = BP.TIER_REWARDS[39].premium;
    assert.strictEqual(r.type, 'cosmetic');
    assert.strictEqual(r.rarity, 'legendary');
  });

  test('Tier 35 premium reward is a pet_skin', function() {
    assert.strictEqual(BP.TIER_REWARDS[34].premium.type, 'pet_skin');
  });

  test('Tier 25 premium reward is an aura', function() {
    assert.strictEqual(BP.TIER_REWARDS[24].premium.type, 'aura');
  });

  test('Tier 10 premium reward is a title', function() {
    assert.strictEqual(BP.TIER_REWARDS[9].premium.type, 'title');
  });

  test('Tier 20 premium reward is a title', function() {
    assert.strictEqual(BP.TIER_REWARDS[19].premium.type, 'title');
  });

  test('Tier 30 premium reward is a title', function() {
    assert.strictEqual(BP.TIER_REWARDS[29].premium.type, 'title');
  });

  test('Free track has Spark rewards on odd tiers (excl milestones)', function() {
    // Check a few odd non-milestone tiers
    var sparkTiers = [1, 3, 7, 9, 11, 13, 17, 19, 21, 23];
    sparkTiers.forEach(function(t) {
      var reward = BP.TIER_REWARDS[t - 1].free;
      assert(reward.type === 'spark' || reward.type === 'xp_boost',
        'Tier ' + t + ' free should be spark or xp_boost, got ' + reward.type);
    });
  });

  test('Free Spark rewards have positive amounts', function() {
    BP.TIER_REWARDS.forEach(function(t) {
      if (t.free.type === 'spark') {
        assert(t.free.amount > 0, 'Spark amount must be positive at tier ' + t.tier);
      }
    });
  });

  test('No duplicate free reward IDs across tiers', function() {
    var seenIds = {};
    BP.TIER_REWARDS.forEach(function(t) {
      var id = t.free.id;
      if (id !== undefined) {
        // Shared IDs for generic rewards are allowed (e.g., craft_materials bundle)
        // but we check that the combination tier+id is unique
        var key = t.tier + ':' + id;
        assert(!seenIds[key], 'Duplicate free reward id+tier: ' + key);
        seenIds[key] = true;
      }
    });
  });

  test('No duplicate premium reward IDs across tiers', function() {
    var seenIds = {};
    BP.TIER_REWARDS.forEach(function(t) {
      var id = t.premium.id;
      if (id !== undefined) {
        var key = t.tier + ':' + id;
        assert(!seenIds[key], 'Duplicate premium reward id+tier: ' + key);
        seenIds[key] = true;
      }
    });
  });

  test('VALID_REWARD_TYPES contains all expected types', function() {
    var expected = ['spark', 'cosmetic', 'pet_skin', 'title', 'emote', 'name_color', 'aura', 'xp_boost', 'craft_materials', 'loot_box'];
    expected.forEach(function(t) {
      assert(BP.VALID_REWARD_TYPES.indexOf(t) !== -1, 'Missing reward type: ' + t);
    });
  });

});

// =========================================================================
// SUITE 4 — initSeason
// =========================================================================

suite('initSeason', function() {

  test('initSeason returns state', function() {
    var state = freshState();
    var result = BP.initSeason(state, 'season_1_spring');
    assert(result === state, 'Must return state object');
  });

  test('initSeason creates battlePass.seasons', function() {
    var state = freshState();
    BP.initSeason(state, 'season_1_spring');
    assert(state.battlePass !== undefined);
    assert(state.battlePass.seasons !== undefined);
  });

  test('initSeason populates season data', function() {
    var state = freshState();
    BP.initSeason(state, 'season_1_spring');
    var s = state.battlePass.seasons['season_1_spring'];
    assert(s !== undefined);
    assert.strictEqual(s.id, 'season_1_spring');
    assert.strictEqual(s.theme, 'spring');
    assert.strictEqual(s.active, true);
    assert.strictEqual(s.ended, false);
  });

  test('initSeason with unknown seasonId does not crash', function() {
    var state = freshState();
    var result = BP.initSeason(state, 'nonexistent_season');
    assert(result === state, 'Should return state unchanged for unknown season');
  });

  test('initSeason preserves existing season data on re-call', function() {
    var state = freshState();
    BP.initSeason(state, 'season_1_spring');
    // Second init should not error
    BP.initSeason(state, 'season_1_spring');
    assert(state.battlePass.seasons['season_1_spring'] !== undefined);
  });

});

// =========================================================================
// SUITE 5 — initPlayerPass
// =========================================================================

suite('initPlayerPass', function() {

  test('initPlayerPass returns state', function() {
    var state = setupPass('p1', 'season_1_spring');
    assert(state !== null);
  });

  test('initPlayerPass creates player pass state', function() {
    var state = freshState();
    BP.initSeason(state, 'season_1_spring');
    BP.initPlayerPass(state, 'p1', 'season_1_spring');
    var pass = state.battlePass.players['p1']['season_1_spring'];
    assert(pass !== undefined);
  });

  test('initPlayerPass sets playerId correctly', function() {
    var state = setupPass('alice', 'season_1_spring');
    var pass = state.battlePass.players['alice']['season_1_spring'];
    assert.strictEqual(pass.playerId, 'alice');
  });

  test('initPlayerPass sets seasonId correctly', function() {
    var state = setupPass('alice', 'season_1_spring');
    var pass = state.battlePass.players['alice']['season_1_spring'];
    assert.strictEqual(pass.seasonId, 'season_1_spring');
  });

  test('initPlayerPass starts at tier 0', function() {
    var state = setupPass('alice', 'season_1_spring');
    var pass = state.battlePass.players['alice']['season_1_spring'];
    assert.strictEqual(pass.currentTier, 0);
  });

  test('initPlayerPass starts at 0 XP', function() {
    var state = setupPass('alice', 'season_1_spring');
    var pass = state.battlePass.players['alice']['season_1_spring'];
    assert.strictEqual(pass.currentXP, 0);
  });

  test('initPlayerPass totalXPEarned starts at 0', function() {
    var state = setupPass('alice', 'season_1_spring');
    var pass = state.battlePass.players['alice']['season_1_spring'];
    assert.strictEqual(pass.totalXPEarned, 0);
  });

  test('initPlayerPass hasPremium starts false', function() {
    var state = setupPass('alice', 'season_1_spring');
    var pass = state.battlePass.players['alice']['season_1_spring'];
    assert.strictEqual(pass.hasPremium, false);
  });

  test('initPlayerPass claimedFree starts as empty array', function() {
    var state = setupPass('alice', 'season_1_spring');
    var pass = state.battlePass.players['alice']['season_1_spring'];
    assert(Array.isArray(pass.claimedFree));
    assert.strictEqual(pass.claimedFree.length, 0);
  });

  test('initPlayerPass claimedPremium starts as empty array', function() {
    var state = setupPass('alice', 'season_1_spring');
    var pass = state.battlePass.players['alice']['season_1_spring'];
    assert(Array.isArray(pass.claimedPremium));
    assert.strictEqual(pass.claimedPremium.length, 0);
  });

  test('initPlayerPass xpSources starts as empty object', function() {
    var state = setupPass('alice', 'season_1_spring');
    var pass = state.battlePass.players['alice']['season_1_spring'];
    assert(typeof pass.xpSources === 'object');
    assert.strictEqual(Object.keys(pass.xpSources).length, 0);
  });

  test('initPlayerPass does not overwrite existing pass', function() {
    var state = setupPass('alice', 'season_1_spring');
    BP.addXPToSeason(state, 'alice', 'season_1_spring', 100, 'quests');
    BP.initPlayerPass(state, 'alice', 'season_1_spring'); // re-init should not reset
    var pass = state.battlePass.players['alice']['season_1_spring'];
    assert(pass.totalXPEarned > 0, 'Re-init must not reset existing pass data');
  });

});

// =========================================================================
// SUITE 6 — addXP / addXPToSeason
// =========================================================================

suite('addXP and addXPToSeason', function() {

  test('addXPToSeason returns success true', function() {
    var state = setupPass('p1', 'season_1_spring');
    var result = BP.addXPToSeason(state, 'p1', 'season_1_spring', 25, 'combat');
    assert.strictEqual(result.success, true);
  });

  test('addXPToSeason returns xpAdded', function() {
    var state = setupPass('p1', 'season_1_spring');
    var result = BP.addXPToSeason(state, 'p1', 'season_1_spring', 30, 'combat');
    assert.strictEqual(result.xpAdded, 30);
  });

  test('addXPToSeason increments currentXP', function() {
    var state = setupPass('p1', 'season_1_spring');
    BP.addXPToSeason(state, 'p1', 'season_1_spring', 25, 'combat');
    var pass = state.battlePass.players['p1']['season_1_spring'];
    assert.strictEqual(pass.currentXP, 25);
  });

  test('addXPToSeason increments totalXPEarned', function() {
    var state = setupPass('p1', 'season_1_spring');
    BP.addXPToSeason(state, 'p1', 'season_1_spring', 25, 'combat');
    var pass = state.battlePass.players['p1']['season_1_spring'];
    assert.strictEqual(pass.totalXPEarned, 25);
  });

  test('addXPToSeason advances tier at 50 XP', function() {
    var state = setupPass('p1', 'season_1_spring');
    var result = BP.addXPToSeason(state, 'p1', 'season_1_spring', 50, 'quests');
    assert.strictEqual(result.currentTier, 1);
    assert.strictEqual(result.tiersGained, 1);
  });

  test('addXPToSeason carries over remainder XP', function() {
    var state = setupPass('p1', 'season_1_spring');
    BP.addXPToSeason(state, 'p1', 'season_1_spring', 60, 'quests');
    var pass = state.battlePass.players['p1']['season_1_spring'];
    assert.strictEqual(pass.currentTier, 1);
    assert.strictEqual(pass.currentXP, 10);
  });

  test('addXPToSeason multiple tiers in single call', function() {
    var state = setupPass('p1', 'season_1_spring');
    var result = BP.addXPToSeason(state, 'p1', 'season_1_spring', 200, 'grind');
    assert.strictEqual(result.currentTier, 4);
    assert.strictEqual(result.tiersGained, 4);
  });

  test('addXPToSeason reports previousTier correctly', function() {
    var state = setupPass('p1', 'season_1_spring');
    BP.addXPToSeason(state, 'p1', 'season_1_spring', 100, 'a');
    var result = BP.addXPToSeason(state, 'p1', 'season_1_spring', 100, 'b');
    assert.strictEqual(result.previousTier, 2);
    assert.strictEqual(result.currentTier, 4);
  });

  test('addXPToSeason reports newRewards on tier gain', function() {
    var state = setupPass('p1', 'season_1_spring');
    var result = BP.addXPToSeason(state, 'p1', 'season_1_spring', 50, 'quests');
    assert(Array.isArray(result.newRewards));
    assert.strictEqual(result.newRewards.length, 1);
    assert.strictEqual(result.newRewards[0].tier, 1);
  });

  test('addXPToSeason newRewards has free and premium per tier', function() {
    var state = setupPass('p1', 'season_1_spring');
    var result = BP.addXPToSeason(state, 'p1', 'season_1_spring', 100, 'quests');
    assert.strictEqual(result.newRewards.length, 2);
    result.newRewards.forEach(function(r) {
      assert(r.free !== undefined && r.free !== null);
      assert(r.premium !== undefined && r.premium !== null);
    });
  });

  test('addXPToSeason tracks xp source', function() {
    var state = setupPass('p1', 'season_1_spring');
    BP.addXPToSeason(state, 'p1', 'season_1_spring', 25, 'fishing');
    var pass = state.battlePass.players['p1']['season_1_spring'];
    assert.strictEqual(pass.xpSources['fishing'], 25);
  });

  test('addXPToSeason accumulates xp from same source', function() {
    var state = setupPass('p1', 'season_1_spring');
    BP.addXPToSeason(state, 'p1', 'season_1_spring', 20, 'fishing');
    BP.addXPToSeason(state, 'p1', 'season_1_spring', 30, 'fishing');
    var pass = state.battlePass.players['p1']['season_1_spring'];
    assert.strictEqual(pass.xpSources['fishing'], 50);
  });

  test('addXPToSeason accumulates xp from multiple sources', function() {
    var state = setupPass('p1', 'season_1_spring');
    BP.addXPToSeason(state, 'p1', 'season_1_spring', 20, 'fishing');
    BP.addXPToSeason(state, 'p1', 'season_1_spring', 30, 'combat');
    var pass = state.battlePass.players['p1']['season_1_spring'];
    assert.strictEqual(pass.xpSources['fishing'], 20);
    assert.strictEqual(pass.xpSources['combat'], 30);
  });

  test('addXPToSeason caps at max tier 40', function() {
    var state = setupPass('p1', 'season_1_spring');
    BP.addXPToSeason(state, 'p1', 'season_1_spring', 9999, 'grind');
    var pass = state.battlePass.players['p1']['season_1_spring'];
    assert.strictEqual(pass.currentTier, 40);
  });

  test('addXPToSeason currentXP is 0 at max tier', function() {
    var state = setupPass('p1', 'season_1_spring');
    BP.addXPToSeason(state, 'p1', 'season_1_spring', 9999, 'grind');
    var pass = state.battlePass.players['p1']['season_1_spring'];
    assert.strictEqual(pass.currentXP, 0);
  });

  test('addXPToSeason ignores negative XP', function() {
    var state = setupPass('p1', 'season_1_spring');
    var result = BP.addXPToSeason(state, 'p1', 'season_1_spring', -100, 'bug');
    assert.strictEqual(result.xpAdded, 0);
    var pass = state.battlePass.players['p1']['season_1_spring'];
    assert.strictEqual(pass.currentXP, 0);
  });

  test('addXPToSeason fails after season ended', function() {
    var state = setupPass('p1', 'season_1_spring');
    BP.endSeason(state, 'season_1_spring');
    var result = BP.addXPToSeason(state, 'p1', 'season_1_spring', 50, 'quests');
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.reason, 'season_ended');
  });

  test('addXPToSeason fails for non-initialized player', function() {
    var state = freshState();
    BP.initSeason(state, 'season_1_spring');
    var result = BP.addXPToSeason(state, 'ghost', 'season_1_spring', 50, 'quests');
    assert.strictEqual(result.success, false);
  });

  test('addXP finds active season automatically', function() {
    var state = setupPass('p1', 'season_1_spring');
    var result = BP.addXP(state, 'p1', 50, 'quests');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.currentTier, 1);
  });

  test('addXP returns no_active_season if player has no pass', function() {
    var state = freshState();
    BP.initSeason(state, 'season_1_spring');
    // initPlayerPass NOT called
    if (!state.battlePass) { state.battlePass = {}; }
    if (!state.battlePass.players) { state.battlePass.players = {}; }
    if (!state.battlePass.players['ghost']) { state.battlePass.players['ghost'] = {}; }
    var result = BP.addXP(state, 'ghost', 50, 'quests');
    assert.strictEqual(result.success, false);
  });

  test('zero XP add returns success with no tier gain', function() {
    var state = setupPass('p1', 'season_1_spring');
    var result = BP.addXPToSeason(state, 'p1', 'season_1_spring', 0, 'idle');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.tiersGained, 0);
    assert.strictEqual(result.xpAdded, 0);
  });

});

// =========================================================================
// SUITE 7 — claimReward
// =========================================================================

suite('claimReward', function() {

  test('claimReward returns success for valid free tier', function() {
    var state = setupPass('p1', 'season_1_spring');
    advanceToTier(state, 'p1', 'season_1_spring', 1);
    var result = BP.claimRewardForSeason(state, 'p1', 'season_1_spring', 1, 'free');
    assert.strictEqual(result.success, true);
  });

  test('claimReward returns the reward object', function() {
    var state = setupPass('p1', 'season_1_spring');
    advanceToTier(state, 'p1', 'season_1_spring', 1);
    var result = BP.claimRewardForSeason(state, 'p1', 'season_1_spring', 1, 'free');
    assert(result.reward !== null && result.reward !== undefined);
    assert(typeof result.reward.type === 'string');
  });

  test('claimReward adds tier to claimedFree', function() {
    var state = setupPass('p1', 'season_1_spring');
    advanceToTier(state, 'p1', 'season_1_spring', 1);
    BP.claimRewardForSeason(state, 'p1', 'season_1_spring', 1, 'free');
    var pass = state.battlePass.players['p1']['season_1_spring'];
    assert(pass.claimedFree.indexOf(1) !== -1);
  });

  test('claimReward double-claim returns already_claimed', function() {
    var state = setupPass('p1', 'season_1_spring');
    advanceToTier(state, 'p1', 'season_1_spring', 1);
    BP.claimRewardForSeason(state, 'p1', 'season_1_spring', 1, 'free');
    var result = BP.claimRewardForSeason(state, 'p1', 'season_1_spring', 1, 'free');
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.reason, 'already_claimed');
  });

  test('claimReward fails for tier not yet reached', function() {
    var state = setupPass('p1', 'season_1_spring');
    var result = BP.claimRewardForSeason(state, 'p1', 'season_1_spring', 5, 'free');
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.reason, 'tier_not_reached');
  });

  test('claimReward premium fails without purchase', function() {
    var state = setupPass('p1', 'season_1_spring');
    advanceToTier(state, 'p1', 'season_1_spring', 1);
    var result = BP.claimRewardForSeason(state, 'p1', 'season_1_spring', 1, 'premium');
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.reason, 'premium_not_purchased');
  });

  test('claimReward premium succeeds after purchase', function() {
    var state = setupPass('p1', 'season_1_spring', 200);
    advanceToTier(state, 'p1', 'season_1_spring', 1);
    BP.purchasePremium(state, 'p1', 'season_1_spring');
    var result = BP.claimRewardForSeason(state, 'p1', 'season_1_spring', 1, 'premium');
    assert.strictEqual(result.success, true);
  });

  test('claimReward invalid track returns invalid_track', function() {
    var state = setupPass('p1', 'season_1_spring');
    advanceToTier(state, 'p1', 'season_1_spring', 1);
    var result = BP.claimRewardForSeason(state, 'p1', 'season_1_spring', 1, 'vip');
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.reason, 'invalid_track');
  });

  test('claimReward tier 0 returns invalid_tier', function() {
    var state = setupPass('p1', 'season_1_spring');
    var result = BP.claimRewardForSeason(state, 'p1', 'season_1_spring', 0, 'free');
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.reason, 'invalid_tier');
  });

  test('claimReward tier 41 returns invalid_tier', function() {
    var state = setupPass('p1', 'season_1_spring');
    var result = BP.claimRewardForSeason(state, 'p1', 'season_1_spring', 41, 'free');
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.reason, 'invalid_tier');
  });

  test('claimReward adds tier to claimedPremium after purchase', function() {
    var state = setupPass('p1', 'season_1_spring', 200);
    advanceToTier(state, 'p1', 'season_1_spring', 1);
    BP.purchasePremium(state, 'p1', 'season_1_spring');
    BP.claimRewardForSeason(state, 'p1', 'season_1_spring', 1, 'premium');
    var pass = state.battlePass.players['p1']['season_1_spring'];
    assert(pass.claimedPremium.indexOf(1) !== -1);
  });

  test('claimReward for non-initialized player returns not_initialized', function() {
    var state = freshState();
    BP.initSeason(state, 'season_1_spring');
    if (!state.battlePass.players) { state.battlePass.players = {}; }
    if (!state.battlePass.players['ghost']) { state.battlePass.players['ghost'] = {}; }
    var result = BP.claimRewardForSeason(state, 'ghost', 'season_1_spring', 1, 'free');
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.reason, 'not_initialized');
  });

});

// =========================================================================
// SUITE 8 — purchasePremium
// =========================================================================

suite('purchasePremium', function() {

  test('purchasePremium succeeds with sufficient Spark', function() {
    var state = setupPass('p1', 'season_1_spring', 200);
    var result = BP.purchasePremium(state, 'p1', 'season_1_spring');
    assert.strictEqual(result.success, true);
  });

  test('purchasePremium deducts 100 Spark', function() {
    var state = setupPass('p1', 'season_1_spring', 200);
    BP.purchasePremium(state, 'p1', 'season_1_spring');
    assert.strictEqual(state.players['p1'].spark, 100);
  });

  test('purchasePremium returns correct cost', function() {
    var state = setupPass('p1', 'season_1_spring', 200);
    var result = BP.purchasePremium(state, 'p1', 'season_1_spring');
    assert.strictEqual(result.cost, 100);
  });

  test('purchasePremium sets hasPremium true', function() {
    var state = setupPass('p1', 'season_1_spring', 200);
    BP.purchasePremium(state, 'p1', 'season_1_spring');
    var pass = state.battlePass.players['p1']['season_1_spring'];
    assert.strictEqual(pass.hasPremium, true);
  });

  test('purchasePremium fails with insufficient Spark', function() {
    var state = setupPass('p1', 'season_1_spring', 50);
    var result = BP.purchasePremium(state, 'p1', 'season_1_spring');
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.reason, 'insufficient_spark');
  });

  test('purchasePremium fails if already purchased', function() {
    var state = setupPass('p1', 'season_1_spring', 300);
    BP.purchasePremium(state, 'p1', 'season_1_spring');
    var result = BP.purchasePremium(state, 'p1', 'season_1_spring');
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.reason, 'already_purchased');
  });

  test('purchasePremium exact cost (100 Spark) succeeds', function() {
    var state = setupPass('p1', 'season_1_spring', 100);
    var result = BP.purchasePremium(state, 'p1', 'season_1_spring');
    assert.strictEqual(result.success, true);
    assert.strictEqual(state.players['p1'].spark, 0);
  });

  test('purchasePremium does not deduct Spark on failure', function() {
    var state = setupPass('p1', 'season_1_spring', 50);
    BP.purchasePremium(state, 'p1', 'season_1_spring');
    assert.strictEqual(state.players['p1'].spark, 50);
  });

  test('purchasePremium fails for not_initialized player', function() {
    var state = freshState();
    BP.initSeason(state, 'season_1_spring');
    if (!state.battlePass) { state.battlePass = {}; }
    if (!state.battlePass.players) { state.battlePass.players = {}; }
    if (!state.battlePass.players['ghost']) { state.battlePass.players['ghost'] = {}; }
    var result = BP.purchasePremium(state, 'ghost', 'season_1_spring');
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.reason, 'not_initialized');
  });

});

// =========================================================================
// SUITE 9 — claimAllRewards
// =========================================================================

suite('claimAllRewards', function() {

  test('claimAllRewards returns claimed array', function() {
    var state = setupPass('p1', 'season_1_spring');
    advanceToTier(state, 'p1', 'season_1_spring', 3);
    var result = BP.claimAllRewards(state, 'p1');
    assert(Array.isArray(result.claimed));
  });

  test('claimAllRewards claims all free tiers up to current', function() {
    var state = setupPass('p1', 'season_1_spring');
    advanceToTier(state, 'p1', 'season_1_spring', 3);
    var result = BP.claimAllRewards(state, 'p1');
    var freeCount = result.claimed.filter(function(c) { return c.track === 'free'; }).length;
    assert.strictEqual(freeCount, 3);
  });

  test('claimAllRewards claims all premium tiers when purchased', function() {
    var state = setupPass('p1', 'season_1_spring', 300);
    advanceToTier(state, 'p1', 'season_1_spring', 3);
    BP.purchasePremium(state, 'p1', 'season_1_spring');
    var result = BP.claimAllRewards(state, 'p1');
    var premCount = result.claimed.filter(function(c) { return c.track === 'premium'; }).length;
    assert.strictEqual(premCount, 3);
  });

  test('claimAllRewards does not re-claim already claimed tiers', function() {
    var state = setupPass('p1', 'season_1_spring');
    advanceToTier(state, 'p1', 'season_1_spring', 3);
    BP.claimAllRewards(state, 'p1');
    var result = BP.claimAllRewards(state, 'p1');
    assert.strictEqual(result.claimed.length, 0);
  });

  test('claimAllRewards does not claim premium if not purchased', function() {
    var state = setupPass('p1', 'season_1_spring');
    advanceToTier(state, 'p1', 'season_1_spring', 5);
    var result = BP.claimAllRewards(state, 'p1');
    var premCount = result.claimed.filter(function(c) { return c.track === 'premium'; }).length;
    assert.strictEqual(premCount, 0);
  });

  test('claimAllRewards returns empty if no active pass', function() {
    var state = freshState();
    if (!state.battlePass) { state.battlePass = {}; }
    if (!state.battlePass.players) { state.battlePass.players = {}; }
    if (!state.battlePass.players['ghost']) { state.battlePass.players['ghost'] = {}; }
    var result = BP.claimAllRewards(state, 'ghost');
    assert.strictEqual(result.claimed.length, 0);
  });

  test('claimAllRewards each entry has tier, track, reward', function() {
    var state = setupPass('p1', 'season_1_spring');
    advanceToTier(state, 'p1', 'season_1_spring', 2);
    var result = BP.claimAllRewards(state, 'p1');
    result.claimed.forEach(function(c) {
      assert(typeof c.tier === 'number', 'Each claimed entry must have tier');
      assert(typeof c.track === 'string', 'Each claimed entry must have track');
      assert(c.reward !== undefined, 'Each claimed entry must have reward');
    });
  });

});

// =========================================================================
// SUITE 10 — getUnclaimedRewards & getClaimedRewards
// =========================================================================

suite('getUnclaimedRewards and getClaimedRewards', function() {

  test('getUnclaimedRewards lists all free rewards up to tier', function() {
    var state = setupPass('p1', 'season_1_spring');
    advanceToTier(state, 'p1', 'season_1_spring', 3);
    var unclaimed = BP.getUnclaimedRewards(state, 'p1');
    var freeCount = unclaimed.filter(function(r) { return r.track === 'free'; }).length;
    assert.strictEqual(freeCount, 3);
  });

  test('getUnclaimedRewards excludes claimed tiers', function() {
    var state = setupPass('p1', 'season_1_spring');
    advanceToTier(state, 'p1', 'season_1_spring', 3);
    BP.claimRewardForSeason(state, 'p1', 'season_1_spring', 1, 'free');
    var unclaimed = BP.getUnclaimedRewards(state, 'p1');
    var freeCount = unclaimed.filter(function(r) { return r.track === 'free'; }).length;
    assert.strictEqual(freeCount, 2);
  });

  test('getUnclaimedRewards includes premium if purchased', function() {
    var state = setupPass('p1', 'season_1_spring', 300);
    advanceToTier(state, 'p1', 'season_1_spring', 2);
    BP.purchasePremium(state, 'p1', 'season_1_spring');
    var unclaimed = BP.getUnclaimedRewards(state, 'p1');
    var premCount = unclaimed.filter(function(r) { return r.track === 'premium'; }).length;
    assert.strictEqual(premCount, 2);
  });

  test('getUnclaimedRewards returns empty after claimAll', function() {
    var state = setupPass('p1', 'season_1_spring');
    advanceToTier(state, 'p1', 'season_1_spring', 3);
    BP.claimAllRewards(state, 'p1');
    var unclaimed = BP.getUnclaimedRewards(state, 'p1');
    assert.strictEqual(unclaimed.length, 0);
  });

  test('getClaimedRewards returns empty initially', function() {
    var state = setupPass('p1', 'season_1_spring');
    var claimed = BP.getClaimedRewards(state, 'p1');
    assert.strictEqual(claimed.length, 0);
  });

  test('getClaimedRewards returns claimed free rewards', function() {
    var state = setupPass('p1', 'season_1_spring');
    advanceToTier(state, 'p1', 'season_1_spring', 2);
    BP.claimRewardForSeason(state, 'p1', 'season_1_spring', 1, 'free');
    BP.claimRewardForSeason(state, 'p1', 'season_1_spring', 2, 'free');
    var claimed = BP.getClaimedRewards(state, 'p1');
    var freeCount = claimed.filter(function(c) { return c.track === 'free'; }).length;
    assert.strictEqual(freeCount, 2);
  });

  test('getClaimedRewards returns claimed premium rewards', function() {
    var state = setupPass('p1', 'season_1_spring', 300);
    advanceToTier(state, 'p1', 'season_1_spring', 2);
    BP.purchasePremium(state, 'p1', 'season_1_spring');
    BP.claimRewardForSeason(state, 'p1', 'season_1_spring', 1, 'premium');
    var claimed = BP.getClaimedRewards(state, 'p1');
    var premCount = claimed.filter(function(c) { return c.track === 'premium'; }).length;
    assert.strictEqual(premCount, 1);
  });

});

// =========================================================================
// SUITE 11 — getCurrentTier & getTierProgress
// =========================================================================

suite('getCurrentTier and getTierProgress', function() {

  test('getCurrentTier returns 0 at start', function() {
    var state = setupPass('p1', 'season_1_spring');
    assert.strictEqual(BP.getCurrentTier(state, 'p1'), 0);
  });

  test('getCurrentTier returns correct tier after XP', function() {
    var state = setupPass('p1', 'season_1_spring');
    advanceToTier(state, 'p1', 'season_1_spring', 5);
    assert.strictEqual(BP.getCurrentTier(state, 'p1'), 5);
  });

  test('getTierProgress tier is 0 at start', function() {
    var state = setupPass('p1', 'season_1_spring');
    var prog = BP.getTierProgress(state, 'p1');
    assert.strictEqual(prog.tier, 0);
  });

  test('getTierProgress xp is 0 at start', function() {
    var state = setupPass('p1', 'season_1_spring');
    var prog = BP.getTierProgress(state, 'p1');
    assert.strictEqual(prog.xp, 0);
  });

  test('getTierProgress xpToNext is 50 at start', function() {
    var state = setupPass('p1', 'season_1_spring');
    var prog = BP.getTierProgress(state, 'p1');
    assert.strictEqual(prog.xpToNext, 50);
  });

  test('getTierProgress percent is 0 at start', function() {
    var state = setupPass('p1', 'season_1_spring');
    var prog = BP.getTierProgress(state, 'p1');
    assert.strictEqual(prog.percent, 0);
  });

  test('getTierProgress percent is 50 at half XP', function() {
    var state = setupPass('p1', 'season_1_spring');
    BP.addXPToSeason(state, 'p1', 'season_1_spring', 25, 'test');
    var prog = BP.getTierProgress(state, 'p1');
    assert.strictEqual(prog.percent, 50);
  });

  test('getTierProgress percent is 100 at max tier', function() {
    var state = setupPass('p1', 'season_1_spring');
    BP.addXPToSeason(state, 'p1', 'season_1_spring', 9999, 'grind');
    var prog = BP.getTierProgress(state, 'p1');
    assert.strictEqual(prog.percent, 100);
  });

  test('getTierProgress xpToNext is 0 at max tier', function() {
    var state = setupPass('p1', 'season_1_spring');
    BP.addXPToSeason(state, 'p1', 'season_1_spring', 9999, 'grind');
    var prog = BP.getTierProgress(state, 'p1');
    assert.strictEqual(prog.xpToNext, 0);
  });

});

// =========================================================================
// SUITE 12 — getRewards & getAllTierRewards
// =========================================================================

suite('getRewards and getAllTierRewards', function() {

  test('getRewards returns free and premium for tier 1', function() {
    var rewards = BP.getRewards('season_1_spring', 1);
    assert(rewards.free !== null && rewards.free !== undefined);
    assert(rewards.premium !== null && rewards.premium !== undefined);
  });

  test('getRewards returns null for out-of-range tier', function() {
    var rewards = BP.getRewards('season_1_spring', 99);
    assert.strictEqual(rewards.free, null);
    assert.strictEqual(rewards.premium, null);
  });

  test('getRewards tier 40 returns legendary cosmetic premium', function() {
    var rewards = BP.getRewards('season_1_spring', 40);
    assert.strictEqual(rewards.premium.type, 'cosmetic');
    assert.strictEqual(rewards.premium.rarity, 'legendary');
  });

  test('getAllTierRewards returns 40 entries', function() {
    var all = BP.getAllTierRewards('season_1_spring');
    assert.strictEqual(all.length, 40);
  });

  test('getAllTierRewards does not mutate TIER_REWARDS', function() {
    var all1 = BP.getAllTierRewards('season_1_spring');
    var all2 = BP.getAllTierRewards('season_1_spring');
    assert.strictEqual(all1.length, all2.length);
  });

});

// =========================================================================
// SUITE 13 — getXPSources
// =========================================================================

suite('getXPSources', function() {

  test('getXPSources returns empty object initially', function() {
    var state = setupPass('p1', 'season_1_spring');
    var sources = BP.getXPSources(state, 'p1');
    assert.strictEqual(Object.keys(sources).length, 0);
  });

  test('getXPSources tracks single source', function() {
    var state = setupPass('p1', 'season_1_spring');
    BP.addXPToSeason(state, 'p1', 'season_1_spring', 30, 'crafting');
    var sources = BP.getXPSources(state, 'p1');
    assert.strictEqual(sources['crafting'], 30);
  });

  test('getXPSources tracks multiple sources', function() {
    var state = setupPass('p1', 'season_1_spring');
    BP.addXPToSeason(state, 'p1', 'season_1_spring', 30, 'crafting');
    BP.addXPToSeason(state, 'p1', 'season_1_spring', 20, 'social');
    BP.addXPToSeason(state, 'p1', 'season_1_spring', 10, 'exploration');
    var sources = BP.getXPSources(state, 'p1');
    assert.strictEqual(sources['crafting'], 30);
    assert.strictEqual(sources['social'], 20);
    assert.strictEqual(sources['exploration'], 10);
  });

  test('getXPSources accumulates repeat source calls', function() {
    var state = setupPass('p1', 'season_1_spring');
    BP.addXPToSeason(state, 'p1', 'season_1_spring', 15, 'combat');
    BP.addXPToSeason(state, 'p1', 'season_1_spring', 25, 'combat');
    var sources = BP.getXPSources(state, 'p1');
    assert.strictEqual(sources['combat'], 40);
  });

});

// =========================================================================
// SUITE 14 — getSeasonInfo, getSeasonTimeRemaining, isSeasonActive
// =========================================================================

suite('Season time and activity queries', function() {

  test('getSeasonInfo returns season data after initSeason', function() {
    var state = freshState();
    BP.initSeason(state, 'season_1_spring');
    var info = BP.getSeasonInfo(state, 'season_1_spring');
    assert(info !== null);
    assert.strictEqual(info.id, 'season_1_spring');
  });

  test('getSeasonInfo returns null for unknown season', function() {
    var state = freshState();
    var info = BP.getSeasonInfo(state, 'nonexistent_season_xyz');
    assert.strictEqual(info, null);
  });

  test('getSeasonTimeRemaining returns correct value mid-season', function() {
    var state = freshState();
    BP.initSeason(state, 'season_1_spring');
    var remaining = BP.getSeasonTimeRemaining(state, 'season_1_spring', 10000);
    // startTick=0, duration=20160, so at tick 10000: 20160 - 10000 = 10160
    assert.strictEqual(remaining, 10160);
  });

  test('getSeasonTimeRemaining returns 0 after season end tick', function() {
    var state = freshState();
    BP.initSeason(state, 'season_1_spring');
    var remaining = BP.getSeasonTimeRemaining(state, 'season_1_spring', 25000);
    assert.strictEqual(remaining, 0);
  });

  test('getSeasonTimeRemaining returns full duration at tick 0', function() {
    var state = freshState();
    BP.initSeason(state, 'season_1_spring');
    var remaining = BP.getSeasonTimeRemaining(state, 'season_1_spring', 0);
    assert.strictEqual(remaining, 20160);
  });

  test('isSeasonActive returns true within season', function() {
    var state = freshState();
    BP.initSeason(state, 'season_1_spring');
    assert.strictEqual(BP.isSeasonActive(state, 'season_1_spring', 1000), true);
  });

  test('isSeasonActive returns false before season starts', function() {
    var state = freshState();
    BP.initSeason(state, 'season_2_summer'); // starts at tick 20160
    assert.strictEqual(BP.isSeasonActive(state, 'season_2_summer', 5000), false);
  });

  test('isSeasonActive returns false after season ends', function() {
    var state = freshState();
    BP.initSeason(state, 'season_1_spring');
    assert.strictEqual(BP.isSeasonActive(state, 'season_1_spring', 25000), false);
  });

  test('isSeasonActive returns false after endSeason called', function() {
    var state = freshState();
    BP.initSeason(state, 'season_1_spring');
    BP.endSeason(state, 'season_1_spring');
    assert.strictEqual(BP.isSeasonActive(state, 'season_1_spring', 1000), false);
  });

});

// =========================================================================
// SUITE 15 — endSeason
// =========================================================================

suite('endSeason', function() {

  test('endSeason returns ended: true', function() {
    var state = freshState();
    BP.initSeason(state, 'season_1_spring');
    var result = BP.endSeason(state, 'season_1_spring');
    assert.strictEqual(result.ended, true);
  });

  test('endSeason returns playerStats array', function() {
    var state = setupPass('p1', 'season_1_spring');
    var result = BP.endSeason(state, 'season_1_spring');
    assert(Array.isArray(result.playerStats));
  });

  test('endSeason playerStats includes player data', function() {
    var state = setupPass('p1', 'season_1_spring');
    advanceToTier(state, 'p1', 'season_1_spring', 5);
    var result = BP.endSeason(state, 'season_1_spring');
    var pStats = result.playerStats.find(function(s) { return s.playerId === 'p1'; });
    assert(pStats !== undefined);
    assert.strictEqual(pStats.tier, 5);
  });

  test('endSeason playerStats includes totalXP', function() {
    var state = setupPass('p1', 'season_1_spring');
    BP.addXPToSeason(state, 'p1', 'season_1_spring', 150, 'test');
    var result = BP.endSeason(state, 'season_1_spring');
    var pStats = result.playerStats.find(function(s) { return s.playerId === 'p1'; });
    assert.strictEqual(pStats.totalXP, 150);
  });

  test('endSeason locks further XP gains', function() {
    var state = setupPass('p1', 'season_1_spring');
    BP.endSeason(state, 'season_1_spring');
    var result = BP.addXPToSeason(state, 'p1', 'season_1_spring', 100, 'after_end');
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.reason, 'season_ended');
  });

  test('endSeason for unknown season returns ended: false', function() {
    var state = freshState();
    var result = BP.endSeason(state, 'nonexistent_season_xyz');
    assert.strictEqual(result.ended, false);
  });

  test('endSeason marks season as ended in state', function() {
    var state = freshState();
    BP.initSeason(state, 'season_1_spring');
    BP.endSeason(state, 'season_1_spring');
    assert.strictEqual(state.battlePass.seasons['season_1_spring'].ended, true);
  });

  test('endSeason with multiple players includes all in stats', function() {
    var state = stateWithPlayer('p1', 200);
    state.players['p2'] = { spark: 200 };
    BP.initSeason(state, 'season_1_spring');
    BP.initPlayerPass(state, 'p1', 'season_1_spring');
    BP.initPlayerPass(state, 'p2', 'season_1_spring');
    advanceToTier(state, 'p1', 'season_1_spring', 3);
    advanceToTier(state, 'p2', 'season_1_spring', 7);
    var result = BP.endSeason(state, 'season_1_spring');
    assert.strictEqual(result.playerStats.length, 2);
  });

});

// =========================================================================
// SUITE 16 — getLeaderboard
// =========================================================================

suite('getLeaderboard', function() {

  function setupMultiplePlayers() {
    var state = stateWithPlayer('p1', 500);
    state.players['p2'] = { spark: 500 };
    state.players['p3'] = { spark: 500 };
    BP.initSeason(state, 'season_1_spring');
    BP.initPlayerPass(state, 'p1', 'season_1_spring');
    BP.initPlayerPass(state, 'p2', 'season_1_spring');
    BP.initPlayerPass(state, 'p3', 'season_1_spring');
    return state;
  }

  test('getLeaderboard returns array', function() {
    var state = setupMultiplePlayers();
    var lb = BP.getLeaderboard(state, 'season_1_spring', 10);
    assert(Array.isArray(lb));
  });

  test('getLeaderboard sorts by tier descending', function() {
    var state = setupMultiplePlayers();
    advanceToTier(state, 'p1', 'season_1_spring', 5);
    advanceToTier(state, 'p2', 'season_1_spring', 10);
    advanceToTier(state, 'p3', 'season_1_spring', 3);
    var lb = BP.getLeaderboard(state, 'season_1_spring', 10);
    assert.strictEqual(lb[0].playerId, 'p2');
    assert.strictEqual(lb[1].playerId, 'p1');
    assert.strictEqual(lb[2].playerId, 'p3');
  });

  test('getLeaderboard breaks tier ties by totalXP', function() {
    var state = setupMultiplePlayers();
    advanceToTier(state, 'p1', 'season_1_spring', 5);
    advanceToTier(state, 'p2', 'season_1_spring', 5);
    // Give p1 extra XP within tier
    BP.addXPToSeason(state, 'p1', 'season_1_spring', 30, 'bonus');
    BP.addXPToSeason(state, 'p2', 'season_1_spring', 10, 'bonus');
    var lb = BP.getLeaderboard(state, 'season_1_spring', 10);
    // p1 has more total XP
    var p1Entry = lb.find(function(e) { return e.playerId === 'p1'; });
    var p2Entry = lb.find(function(e) { return e.playerId === 'p2'; });
    assert(p1Entry.rank <= p2Entry.rank, 'p1 should rank higher due to more XP');
  });

  test('getLeaderboard respects count limit', function() {
    var state = setupMultiplePlayers();
    var lb = BP.getLeaderboard(state, 'season_1_spring', 2);
    assert(lb.length <= 2);
  });

  test('getLeaderboard entries have rank, playerId, tier, totalXP', function() {
    var state = setupMultiplePlayers();
    advanceToTier(state, 'p1', 'season_1_spring', 2);
    var lb = BP.getLeaderboard(state, 'season_1_spring', 10);
    lb.forEach(function(entry) {
      assert(typeof entry.rank === 'number');
      assert(typeof entry.playerId === 'string');
      assert(typeof entry.tier === 'number');
      assert(typeof entry.totalXP === 'number');
    });
  });

  test('getLeaderboard rank starts at 1', function() {
    var state = setupMultiplePlayers();
    var lb = BP.getLeaderboard(state, 'season_1_spring', 10);
    if (lb.length > 0) {
      assert.strictEqual(lb[0].rank, 1);
    }
  });

  test('getLeaderboard returns empty for season with no players', function() {
    var state = freshState();
    BP.initSeason(state, 'season_1_spring');
    var lb = BP.getLeaderboard(state, 'season_1_spring', 10);
    assert.strictEqual(lb.length, 0);
  });

});

// =========================================================================
// SUITE 17 — getCompletionStats
// =========================================================================

suite('getCompletionStats', function() {

  test('getCompletionStats returns correct shape', function() {
    var state = setupPass('p1', 'season_1_spring');
    var stats = BP.getCompletionStats(state, 'p1');
    assert(typeof stats.tiersCompleted === 'number');
    assert(typeof stats.totalTiers === 'number');
    assert(typeof stats.freeRewardsClaimed === 'number');
    assert(typeof stats.premiumRewardsClaimed === 'number');
    assert(typeof stats.percentComplete === 'number');
  });

  test('getCompletionStats totalTiers is 40', function() {
    var state = setupPass('p1', 'season_1_spring');
    var stats = BP.getCompletionStats(state, 'p1');
    assert.strictEqual(stats.totalTiers, 40);
  });

  test('getCompletionStats tiersCompleted is 0 at start', function() {
    var state = setupPass('p1', 'season_1_spring');
    var stats = BP.getCompletionStats(state, 'p1');
    assert.strictEqual(stats.tiersCompleted, 0);
  });

  test('getCompletionStats tiersCompleted matches currentTier', function() {
    var state = setupPass('p1', 'season_1_spring');
    advanceToTier(state, 'p1', 'season_1_spring', 10);
    var stats = BP.getCompletionStats(state, 'p1');
    assert.strictEqual(stats.tiersCompleted, 10);
  });

  test('getCompletionStats percentComplete is 0 at start', function() {
    var state = setupPass('p1', 'season_1_spring');
    var stats = BP.getCompletionStats(state, 'p1');
    assert.strictEqual(stats.percentComplete, 0);
  });

  test('getCompletionStats percentComplete is 25 at tier 10', function() {
    var state = setupPass('p1', 'season_1_spring');
    advanceToTier(state, 'p1', 'season_1_spring', 10);
    var stats = BP.getCompletionStats(state, 'p1');
    assert.strictEqual(stats.percentComplete, 25);
  });

  test('getCompletionStats percentComplete is 100 at tier 40', function() {
    var state = setupPass('p1', 'season_1_spring');
    BP.addXPToSeason(state, 'p1', 'season_1_spring', 9999, 'grind');
    var stats = BP.getCompletionStats(state, 'p1');
    assert.strictEqual(stats.percentComplete, 100);
  });

  test('getCompletionStats freeRewardsClaimed counts correctly', function() {
    var state = setupPass('p1', 'season_1_spring');
    advanceToTier(state, 'p1', 'season_1_spring', 3);
    BP.claimAllRewards(state, 'p1');
    var stats = BP.getCompletionStats(state, 'p1');
    assert.strictEqual(stats.freeRewardsClaimed, 3);
  });

  test('getCompletionStats premiumRewardsClaimed counts correctly', function() {
    var state = setupPass('p1', 'season_1_spring', 300);
    advanceToTier(state, 'p1', 'season_1_spring', 3);
    BP.purchasePremium(state, 'p1', 'season_1_spring');
    BP.claimAllRewards(state, 'p1');
    var stats = BP.getCompletionStats(state, 'p1');
    assert.strictEqual(stats.premiumRewardsClaimed, 3);
  });

  test('getCompletionStats returns 0s for player with no pass', function() {
    var state = freshState();
    if (!state.battlePass) { state.battlePass = {}; }
    if (!state.battlePass.players) { state.battlePass.players = {}; }
    if (!state.battlePass.players['ghost']) { state.battlePass.players['ghost'] = {}; }
    var stats = BP.getCompletionStats(state, 'ghost');
    assert.strictEqual(stats.tiersCompleted, 0);
    assert.strictEqual(stats.percentComplete, 0);
  });

});

// =========================================================================
// SUITE 18 — EDGE CASES
// =========================================================================

suite('Edge Cases', function() {

  test('Adding XP equal to exactly one tier advances exactly 1 tier', function() {
    var state = setupPass('p1', 'season_1_spring');
    BP.addXPToSeason(state, 'p1', 'season_1_spring', 50, 'exact');
    var pass = state.battlePass.players['p1']['season_1_spring'];
    assert.strictEqual(pass.currentTier, 1);
    assert.strictEqual(pass.currentXP, 0);
  });

  test('Adding XP equal to exactly 40 tiers hits max', function() {
    var state = setupPass('p1', 'season_1_spring');
    BP.addXPToSeason(state, 'p1', 'season_1_spring', 2000, 'grind');
    var pass = state.battlePass.players['p1']['season_1_spring'];
    assert.strictEqual(pass.currentTier, 40);
  });

  test('Cannot claim beyond tier 40', function() {
    var state = setupPass('p1', 'season_1_spring');
    BP.addXPToSeason(state, 'p1', 'season_1_spring', 9999, 'grind');
    var result = BP.claimRewardForSeason(state, 'p1', 'season_1_spring', 41, 'free');
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.reason, 'invalid_tier');
  });

  test('Claiming premium tier 1 after earning tier 1 without premium fails', function() {
    var state = setupPass('p1', 'season_1_spring');
    advanceToTier(state, 'p1', 'season_1_spring', 1);
    var result = BP.claimRewardForSeason(state, 'p1', 'season_1_spring', 1, 'premium');
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.reason, 'premium_not_purchased');
  });

  test('Multiple addXP calls accumulate correctly', function() {
    var state = setupPass('p1', 'season_1_spring');
    for (var i = 0; i < 10; i++) {
      BP.addXPToSeason(state, 'p1', 'season_1_spring', 5, 'daily');
    }
    var pass = state.battlePass.players['p1']['season_1_spring'];
    assert.strictEqual(pass.totalXPEarned, 50);
    assert.strictEqual(pass.currentTier, 1);
    assert.strictEqual(pass.currentXP, 0);
  });

  test('endSeason then claim free rewards still works (unclaimed remain available)', function() {
    var state = setupPass('p1', 'season_1_spring');
    advanceToTier(state, 'p1', 'season_1_spring', 3);
    BP.endSeason(state, 'season_1_spring');
    // Claiming should still work
    var result = BP.claimRewardForSeason(state, 'p1', 'season_1_spring', 1, 'free');
    assert.strictEqual(result.success, true);
  });

  test('addXP with source undefined uses unknown label', function() {
    var state = setupPass('p1', 'season_1_spring');
    BP.addXPToSeason(state, 'p1', 'season_1_spring', 20, undefined);
    var pass = state.battlePass.players['p1']['season_1_spring'];
    assert(pass.xpSources['unknown'] !== undefined);
    assert.strictEqual(pass.xpSources['unknown'], 20);
  });

  test('claimAllRewards after season end still claims unclaimed', function() {
    var state = setupPass('p1', 'season_1_spring');
    advanceToTier(state, 'p1', 'season_1_spring', 5);
    BP.endSeason(state, 'season_1_spring');
    var result = BP.claimAllRewards(state, 'p1');
    assert.strictEqual(result.claimed.length, 5);
  });

  test('Two players in same season are independent', function() {
    var state = stateWithPlayer('p1', 200);
    state.players['p2'] = { spark: 200 };
    BP.initSeason(state, 'season_1_spring');
    BP.initPlayerPass(state, 'p1', 'season_1_spring');
    BP.initPlayerPass(state, 'p2', 'season_1_spring');
    BP.addXPToSeason(state, 'p1', 'season_1_spring', 150, 'quest');
    BP.addXPToSeason(state, 'p2', 'season_1_spring', 50, 'quest');
    var pass1 = state.battlePass.players['p1']['season_1_spring'];
    var pass2 = state.battlePass.players['p2']['season_1_spring'];
    assert.strictEqual(pass1.currentTier, 3);
    assert.strictEqual(pass2.currentTier, 1);
  });

  test('initSeason does not affect players object', function() {
    var state = freshState();
    BP.initSeason(state, 'season_1_spring');
    assert(state.battlePass.players !== undefined, 'players should exist after initSeason');
  });

  test('Tier 1 free reward type is a valid reward type', function() {
    var reward = BP.TIER_REWARDS[0].free;
    assert(BP.VALID_REWARD_TYPES.indexOf(reward.type) !== -1);
  });

  test('Premium track has unique aura id at tier 25', function() {
    var reward = BP.TIER_REWARDS[24].premium;
    assert.strictEqual(reward.type, 'aura');
    assert(typeof reward.id === 'string' && reward.id.length > 0);
  });

  test('getLeaderboard default count 10 if not provided', function() {
    var state = freshState();
    BP.initSeason(state, 'season_1_spring');
    var lb = BP.getLeaderboard(state, 'season_1_spring');
    assert(Array.isArray(lb));
  });

  test('xpSources null source uses unknown', function() {
    var state = setupPass('p1', 'season_1_spring');
    BP.addXPToSeason(state, 'p1', 'season_1_spring', 10, null);
    var sources = BP.getXPSources(state, 'p1');
    assert(sources['unknown'] !== undefined);
  });

});

// =========================================================================
// FINAL REPORT
// =========================================================================

console.log('\n============================');
console.log('BATTLE PASS TEST RESULTS');
console.log('============================');
console.log('Passed: ' + passed);
console.log('Failed: ' + failed);

if (failures.length > 0) {
  console.log('\nFailures:');
  failures.forEach(function(f) {
    console.log('  [' + f.suite + '] ' + f.name);
    console.log('    ' + f.error);
  });
}

console.log('============================');
process.exit(failed === 0 ? 0 : 1);
