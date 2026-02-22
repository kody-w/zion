/**
 * tests/test_daily_challenges.js
 * Comprehensive tests for the ZION Daily & Weekly Challenge System
 * 130+ tests covering all exported functions, edge cases, and invariants.
 */

const { test, suite, report, assert } = require('./test_runner');
const DC = require('../src/js/daily_challenges');

// ============================================================================
// HELPERS
// ============================================================================

function freshState() {
  return DC.createDailyState();
}

// Build a state with N challenges loaded for day D
function stateWithChallenges(dayNumber, count) {
  var state = freshState();
  count = count || 3;
  state.activeChallenges = DC.generateDailyChallenges(dayNumber, count);
  return state;
}

// Fully complete a specific challenge using updateProgress
function progressToComplete(state, challengeId) {
  var challenge = state.activeChallenges.filter(function(c) { return c.id === challengeId; })[0];
  if (!challenge) throw new Error('Challenge not in active list: ' + challengeId);
  var result = DC.updateProgress(state, challengeId, challenge.target);
  return result;
}

// ============================================================================
// SUITE 1 — Challenge Pool Completeness
// ============================================================================

suite('Challenge Pool — Completeness (30 challenges)', function() {

  test('CHALLENGE_POOL has exactly 30 challenges', function() {
    assert.strictEqual(DC.CHALLENGE_POOL.length, 30);
  });

  test('Every challenge has a unique id', function() {
    var ids = DC.CHALLENGE_POOL.map(function(c) { return c.id; });
    var unique = {};
    ids.forEach(function(id) { unique[id] = true; });
    assert.strictEqual(Object.keys(unique).length, 30, 'Some challenge IDs are duplicated');
  });

  test('Every challenge has required field: id (string)', function() {
    DC.CHALLENGE_POOL.forEach(function(c) {
      assert(typeof c.id === 'string' && c.id.length > 0, 'Missing/empty id on challenge: ' + JSON.stringify(c));
    });
  });

  test('Every challenge has required field: title (string)', function() {
    DC.CHALLENGE_POOL.forEach(function(c) {
      assert(typeof c.title === 'string' && c.title.length > 0, 'Missing title on: ' + c.id);
    });
  });

  test('Every challenge has required field: desc (string)', function() {
    DC.CHALLENGE_POOL.forEach(function(c) {
      assert(typeof c.desc === 'string' && c.desc.length > 0, 'Missing desc on: ' + c.id);
    });
  });

  test('Every challenge has required field: target (positive number)', function() {
    DC.CHALLENGE_POOL.forEach(function(c) {
      assert(typeof c.target === 'number' && c.target > 0, 'Invalid target on: ' + c.id);
    });
  });

  test('Every challenge has required field: type (string)', function() {
    DC.CHALLENGE_POOL.forEach(function(c) {
      assert(typeof c.type === 'string' && c.type.length > 0, 'Missing type on: ' + c.id);
    });
  });

  test('Every challenge has required field: reward (object)', function() {
    DC.CHALLENGE_POOL.forEach(function(c) {
      assert(c.reward && typeof c.reward === 'object', 'Missing reward on: ' + c.id);
    });
  });

  test('Every challenge reward has spark (positive number)', function() {
    DC.CHALLENGE_POOL.forEach(function(c) {
      assert(typeof c.reward.spark === 'number' && c.reward.spark > 0, 'Invalid reward.spark on: ' + c.id);
    });
  });

  test('Every challenge reward has xp (positive number)', function() {
    DC.CHALLENGE_POOL.forEach(function(c) {
      assert(typeof c.reward.xp === 'number' && c.reward.xp > 0, 'Invalid reward.xp on: ' + c.id);
    });
  });

  test('Every challenge has a category field', function() {
    DC.CHALLENGE_POOL.forEach(function(c) {
      assert(typeof c.category === 'string' && c.category.length > 0, 'Missing category on: ' + c.id);
    });
  });

  test('Gathering category has exactly 6 challenges', function() {
    var g = DC.CHALLENGE_POOL.filter(function(c) { return c.category === 'gathering'; });
    assert.strictEqual(g.length, 6);
  });

  test('Social category has exactly 6 challenges', function() {
    var s = DC.CHALLENGE_POOL.filter(function(c) { return c.category === 'social'; });
    assert.strictEqual(s.length, 6);
  });

  test('Exploration category has exactly 6 challenges', function() {
    var e = DC.CHALLENGE_POOL.filter(function(c) { return c.category === 'exploration'; });
    assert.strictEqual(e.length, 6);
  });

  test('Crafting category has exactly 6 challenges', function() {
    var cr = DC.CHALLENGE_POOL.filter(function(c) { return c.category === 'crafting'; });
    assert.strictEqual(cr.length, 6);
  });

  test('Minigame category has exactly 6 challenges', function() {
    var m = DC.CHALLENGE_POOL.filter(function(c) { return c.category === 'minigame'; });
    assert.strictEqual(m.length, 6);
  });

  test('gather_5_wood is in the pool with correct target and resource', function() {
    var c = DC.CHALLENGE_POOL.filter(function(c) { return c.id === 'gather_5_wood'; })[0];
    assert(c, 'gather_5_wood not found');
    assert.strictEqual(c.target, 5);
    assert.strictEqual(c.resource, 'wood');
  });

  test('compose_song is in pool with target 1 and type compose', function() {
    var c = DC.CHALLENGE_POOL.filter(function(c) { return c.id === 'compose_song'; })[0];
    assert(c, 'compose_song not found');
    assert.strictEqual(c.target, 1);
    assert.strictEqual(c.type, 'compose');
  });

  test('walk_500 has target 500', function() {
    var c = DC.CHALLENGE_POOL.filter(function(c) { return c.id === 'walk_500'; })[0];
    assert.strictEqual(c.target, 500);
  });

  test('dungeon_room_5 has target 5', function() {
    var c = DC.CHALLENGE_POOL.filter(function(c) { return c.id === 'dungeon_room_5'; })[0];
    assert.strictEqual(c.target, 5);
  });

  test('No challenge has a negative target', function() {
    DC.CHALLENGE_POOL.forEach(function(c) {
      assert(c.target > 0, 'Negative/zero target on: ' + c.id);
    });
  });

  test('Crystal hunter has highest spark reward in gathering category', function() {
    var gathering = DC.CHALLENGE_POOL.filter(function(c) { return c.category === 'gathering'; });
    var crystal = gathering.filter(function(c) { return c.id === 'gather_crystal'; })[0];
    var maxSpark = Math.max.apply(null, gathering.map(function(c) { return c.reward.spark; }));
    assert.strictEqual(crystal.reward.spark, maxSpark);
  });
});

// ============================================================================
// SUITE 2 — createDailyState
// ============================================================================

suite('createDailyState — Initial State', function() {

  test('Returns an object', function() {
    var s = freshState();
    assert(s !== null && typeof s === 'object');
  });

  test('activeChallenges starts as empty array', function() {
    var s = freshState();
    assert(Array.isArray(s.activeChallenges));
    assert.strictEqual(s.activeChallenges.length, 0);
  });

  test('completedToday starts as empty array', function() {
    var s = freshState();
    assert(Array.isArray(s.completedToday));
    assert.strictEqual(s.completedToday.length, 0);
  });

  test('streak starts at 0', function() {
    var s = freshState();
    assert.strictEqual(s.streak, 0);
  });

  test('lastCompletionDay starts at 0', function() {
    var s = freshState();
    assert.strictEqual(s.lastCompletionDay, 0);
  });

  test('weeklyProgress starts at 0', function() {
    var s = freshState();
    assert.strictEqual(s.weeklyProgress, 0);
  });

  test('weeklyCompleted starts as false', function() {
    var s = freshState();
    assert.strictEqual(s.weeklyCompleted, false);
  });

  test('history starts as empty array', function() {
    var s = freshState();
    assert(Array.isArray(s.history));
    assert.strictEqual(s.history.length, 0);
  });

  test('totalCompleted starts at 0', function() {
    var s = freshState();
    assert.strictEqual(s.totalCompleted, 0);
  });

  test('Calling createDailyState twice returns independent objects', function() {
    var a = freshState();
    var b = freshState();
    a.streak = 99;
    assert.strictEqual(b.streak, 0, 'States should be independent');
  });
});

// ============================================================================
// SUITE 3 — generateDailyChallenges — Seeding & Deduplication
// ============================================================================

suite('generateDailyChallenges — Seeded Selection', function() {

  test('Returns an array of the requested count (default 3)', function() {
    var result = DC.generateDailyChallenges(1);
    assert(Array.isArray(result));
    assert.strictEqual(result.length, 3);
  });

  test('Returns correct count when count=5', function() {
    var result = DC.generateDailyChallenges(1, 5);
    assert.strictEqual(result.length, 5);
  });

  test('Returns correct count when count=1', function() {
    var result = DC.generateDailyChallenges(1, 1);
    assert.strictEqual(result.length, 1);
  });

  test('Same day + count produces the same challenges (seeded)', function() {
    var a = DC.generateDailyChallenges(42, 3);
    var b = DC.generateDailyChallenges(42, 3);
    assert.strictEqual(a.length, b.length);
    for (var i = 0; i < a.length; i++) {
      assert.strictEqual(a[i].id, b[i].id, 'Challenge at index ' + i + ' differs between runs');
    }
  });

  test('Different days produce different selections', function() {
    var day1 = DC.generateDailyChallenges(1, 3);
    var day2 = DC.generateDailyChallenges(2, 3);
    var ids1 = day1.map(function(c) { return c.id; }).join(',');
    var ids2 = day2.map(function(c) { return c.id; }).join(',');
    assert(ids1 !== ids2, 'Day 1 and day 2 should have different challenges');
  });

  test('No duplicate challenges within a single day', function() {
    var result = DC.generateDailyChallenges(7, 5);
    var ids = result.map(function(c) { return c.id; });
    var unique = {};
    ids.forEach(function(id) { unique[id] = true; });
    assert.strictEqual(Object.keys(unique).length, ids.length, 'Duplicate challenge IDs in daily set');
  });

  test('Each returned challenge has progress: 0', function() {
    var result = DC.generateDailyChallenges(10, 3);
    result.forEach(function(c) {
      assert.strictEqual(c.progress, 0, 'progress should start at 0 for: ' + c.id);
    });
  });

  test('Each returned challenge has completed: false', function() {
    var result = DC.generateDailyChallenges(10, 3);
    result.forEach(function(c) {
      assert.strictEqual(c.completed, false, 'completed should be false for: ' + c.id);
    });
  });

  test('Each returned challenge preserves target from pool', function() {
    var result = DC.generateDailyChallenges(5, 3);
    result.forEach(function(c) {
      var def = DC.getChallengeById(c.id);
      assert.strictEqual(c.target, def.target, 'target mismatch for: ' + c.id);
    });
  });

  test('Each returned challenge preserves reward from pool', function() {
    var result = DC.generateDailyChallenges(5, 3);
    result.forEach(function(c) {
      var def = DC.getChallengeById(c.id);
      assert.strictEqual(c.reward.spark, def.reward.spark, 'reward.spark mismatch for: ' + c.id);
      assert.strictEqual(c.reward.xp, def.reward.xp, 'reward.xp mismatch for: ' + c.id);
    });
  });

  test('Excludes yesterday IDs when possible', function() {
    // Generate day 1, use those IDs as excludeIds for day 2 with same seed
    var day1Ids = DC.generateDailyChallenges(1, 3).map(function(c) { return c.id; });
    // Use a day that would naturally produce some overlap (try day 1 seed again but exclude)
    var day2 = DC.generateDailyChallenges(1, 3, day1Ids);
    var day2Ids = day2.map(function(c) { return c.id; });
    // If the pool is large enough to avoid all, there should be no overlap
    var overlap = day2Ids.filter(function(id) { return day1Ids.indexOf(id) !== -1; });
    assert.strictEqual(overlap.length, 0, 'Should avoid yesterday IDs: overlap=' + overlap.join(','));
  });

  test('Falls back gracefully when excludeIds covers most of the pool', function() {
    // Exclude 28 of 30 challenges — should still return 3 (from the remaining 2 + reusing excluded)
    var excludeIds = DC.CHALLENGE_POOL.slice(0, 28).map(function(c) { return c.id; });
    var result = DC.generateDailyChallenges(99, 3, excludeIds);
    assert.strictEqual(result.length, 3, 'Should return requested count even with heavy exclusion');
  });

  test('Works with a large count (up to 30)', function() {
    var result = DC.generateDailyChallenges(1, 30);
    assert.strictEqual(result.length, 30);
  });

  test('Day 1 and day 100 produce different ordering', function() {
    var d1 = DC.generateDailyChallenges(1, 10).map(function(c) { return c.id; }).join(',');
    var d100 = DC.generateDailyChallenges(100, 10).map(function(c) { return c.id; }).join(',');
    assert(d1 !== d100, 'Day 1 and day 100 should have different orderings');
  });
});

// ============================================================================
// SUITE 4 — Progress Tracking
// ============================================================================

suite('updateProgress — Progress Tracking', function() {

  test('Returns a result object with state, completed, reward, streakBonus, message', function() {
    var state = stateWithChallenges(1, 3);
    var id = state.activeChallenges[0].id;
    var result = DC.updateProgress(state, id, 1);
    assert(result.hasOwnProperty('state'));
    assert(result.hasOwnProperty('completed'));
    assert(result.hasOwnProperty('reward'));
    assert(result.hasOwnProperty('streakBonus'));
    assert(result.hasOwnProperty('message'));
  });

  test('Does not mutate the original state', function() {
    var state = stateWithChallenges(1, 3);
    var originalProgress = state.activeChallenges[0].progress;
    var id = state.activeChallenges[0].id;
    DC.updateProgress(state, id, 1);
    assert.strictEqual(state.activeChallenges[0].progress, originalProgress, 'Original state was mutated');
  });

  test('Updates progress in returned state', function() {
    var state = stateWithChallenges(1, 3);
    var id = state.activeChallenges[0].id;
    var result = DC.updateProgress(state, id, 2);
    var updated = result.state.activeChallenges.filter(function(c) { return c.id === id; })[0];
    assert.strictEqual(updated.progress, 2);
  });

  test('Does not auto-complete if target not reached', function() {
    var state = stateWithChallenges(1, 3);
    var challenge = state.activeChallenges[0];
    // Only progress to target - 1 (assuming target >= 2)
    if (challenge.target < 2) {
      // Skip for target-1 challenges
      return;
    }
    var result = DC.updateProgress(state, challenge.id, challenge.target - 1);
    assert.strictEqual(result.completed, false);
  });

  test('Auto-completes when progress reaches target', function() {
    var state = stateWithChallenges(1, 3);
    var id = state.activeChallenges[0].id;
    var target = state.activeChallenges[0].target;
    var result = DC.updateProgress(state, id, target);
    assert.strictEqual(result.completed, true);
  });

  test('Returns non-null reward when challenge completes', function() {
    var state = stateWithChallenges(1, 3);
    var id = state.activeChallenges[0].id;
    var target = state.activeChallenges[0].target;
    var result = DC.updateProgress(state, id, target);
    assert(result.reward !== null);
    assert(typeof result.reward.spark === 'number');
    assert(typeof result.reward.xp === 'number');
  });

  test('Progress is capped at target (no over-progress)', function() {
    var state = stateWithChallenges(1, 3);
    var id = state.activeChallenges[0].id;
    var target = state.activeChallenges[0].target;
    var result = DC.updateProgress(state, id, target * 10); // massively over
    var updated = result.state.activeChallenges.filter(function(c) { return c.id === id; })[0];
    assert.strictEqual(updated.progress, target, 'Progress should be capped at target');
  });

  test('Returns message string indicating progress', function() {
    var state = stateWithChallenges(5, 3);
    // Find a challenge with target >= 2
    var challenge = state.activeChallenges.filter(function(c) { return c.target >= 2; })[0];
    if (!challenge) return; // skip if none
    var result = DC.updateProgress(state, challenge.id, 1);
    assert(typeof result.message === 'string' && result.message.length > 0);
  });

  test('Invalid challenge ID returns state unchanged with error message', function() {
    var state = stateWithChallenges(1, 3);
    var result = DC.updateProgress(state, 'nonexistent_id_xyz', 1);
    assert.strictEqual(result.completed, false);
    assert(result.message.length > 0);
  });

  test('Progressing an already-completed challenge returns message', function() {
    var state = stateWithChallenges(1, 3);
    var id = state.activeChallenges[0].id;
    var target = state.activeChallenges[0].target;
    var r1 = DC.updateProgress(state, id, target);
    // Try to progress again
    var r2 = DC.updateProgress(r1.state, id, 1);
    assert.strictEqual(r2.completed, false);
    assert(r2.message.indexOf('already') !== -1 || r2.message.length > 0);
  });

  test('Default amount is 1 when no amount provided', function() {
    var state = stateWithChallenges(10, 3);
    // Find a challenge with target >= 2
    var challenge = state.activeChallenges.filter(function(c) { return c.target >= 2; })[0];
    if (!challenge) return;
    var result = DC.updateProgress(state, challenge.id);
    var updated = result.state.activeChallenges.filter(function(c) { return c.id === challenge.id; })[0];
    assert.strictEqual(updated.progress, 1);
  });

  test('Multiple progress calls accumulate correctly', function() {
    var state = stateWithChallenges(20, 3);
    var challenge = state.activeChallenges.filter(function(c) { return c.target >= 3; })[0];
    if (!challenge) return;
    var r1 = DC.updateProgress(state, challenge.id, 1);
    var r2 = DC.updateProgress(r1.state, challenge.id, 1);
    var updated = r2.state.activeChallenges.filter(function(c) { return c.id === challenge.id; })[0];
    assert.strictEqual(updated.progress, 2);
  });
});

// ============================================================================
// SUITE 5 — completeChallenge
// ============================================================================

suite('completeChallenge — Completion Logic', function() {

  test('Marks challenge as completed in state', function() {
    var state = stateWithChallenges(1, 3);
    var id = state.activeChallenges[0].id;
    var result = DC.completeChallenge(state, id);
    var updated = result.state.activeChallenges.filter(function(c) { return c.id === id; })[0];
    assert.strictEqual(updated.completed, true);
  });

  test('Adds challenge ID to completedToday', function() {
    var state = stateWithChallenges(1, 3);
    var id = state.activeChallenges[0].id;
    var result = DC.completeChallenge(state, id);
    assert(result.state.completedToday.indexOf(id) !== -1);
  });

  test('Increments streak on first completion of the day', function() {
    var state = stateWithChallenges(1, 3);
    var id = state.activeChallenges[0].id;
    var result = DC.completeChallenge(state, id);
    assert.strictEqual(result.state.streak, 1);
  });

  test('Does not double-increment streak on second completion same day', function() {
    var state = stateWithChallenges(1, 3);
    var id0 = state.activeChallenges[0].id;
    var id1 = state.activeChallenges[1].id;
    var r1 = DC.completeChallenge(state, id0);
    var r2 = DC.completeChallenge(r1.state, id1);
    assert.strictEqual(r2.state.streak, 1, 'Streak should only increment once per day');
  });

  test('Increments weeklyProgress', function() {
    var state = stateWithChallenges(1, 3);
    var id = state.activeChallenges[0].id;
    var result = DC.completeChallenge(state, id);
    assert.strictEqual(result.state.weeklyProgress, 1);
  });

  test('Increments totalCompleted', function() {
    var state = stateWithChallenges(1, 3);
    var id = state.activeChallenges[0].id;
    var result = DC.completeChallenge(state, id);
    assert.strictEqual(result.state.totalCompleted, 1);
  });

  test('Returns reward with spark and xp', function() {
    var state = stateWithChallenges(1, 3);
    var id = state.activeChallenges[0].id;
    var result = DC.completeChallenge(state, id);
    assert(result.reward !== null);
    assert(typeof result.reward.spark === 'number');
    assert(typeof result.reward.xp === 'number');
  });

  test('Returns message string', function() {
    var state = stateWithChallenges(1, 3);
    var id = state.activeChallenges[0].id;
    var result = DC.completeChallenge(state, id);
    assert(typeof result.message === 'string' && result.message.length > 0);
  });

  test('Returns null reward for invalid challenge ID', function() {
    var state = stateWithChallenges(1, 3);
    var result = DC.completeChallenge(state, 'bad_id_xyz');
    assert.strictEqual(result.reward, null);
  });

  test('Returns null reward for already-completed challenge', function() {
    var state = stateWithChallenges(1, 3);
    var id = state.activeChallenges[0].id;
    var r1 = DC.completeChallenge(state, id);
    var r2 = DC.completeChallenge(r1.state, id);
    assert.strictEqual(r2.reward, null);
  });

  test('Does not mutate original state', function() {
    var state = stateWithChallenges(1, 3);
    var origStreak = state.streak;
    var id = state.activeChallenges[0].id;
    DC.completeChallenge(state, id);
    assert.strictEqual(state.streak, origStreak, 'Original state.streak was mutated');
  });

  test('History entry is added after completion', function() {
    var state = stateWithChallenges(1, 3);
    var id = state.activeChallenges[0].id;
    var result = DC.completeChallenge(state, id);
    assert.strictEqual(result.state.history.length, 1);
    assert.strictEqual(result.state.history[0].challengeId, id);
  });

  test('History entry contains reward, streakAtTime, multiplier', function() {
    var state = stateWithChallenges(1, 3);
    var id = state.activeChallenges[0].id;
    var result = DC.completeChallenge(state, id);
    var entry = result.state.history[0];
    assert(entry.reward && typeof entry.reward.spark === 'number');
    assert(typeof entry.streakAtTime === 'number');
    assert(typeof entry.multiplier === 'number');
  });

  test('Completing all 3 challenges increments totalCompleted to 3', function() {
    var state = stateWithChallenges(1, 3);
    var r1 = DC.completeChallenge(state, state.activeChallenges[0].id);
    var r2 = DC.completeChallenge(r1.state, r1.state.activeChallenges[1].id);
    var r3 = DC.completeChallenge(r2.state, r2.state.activeChallenges[2].id);
    assert.strictEqual(r3.state.totalCompleted, 3);
  });
});

// ============================================================================
// SUITE 6 — Streak System
// ============================================================================

suite('Streak System — Increment, Reset, Multipliers', function() {

  test('getStreak returns 0 on fresh state', function() {
    assert.strictEqual(DC.getStreak(freshState()), 0);
  });

  test('getStreak returns current streak value', function() {
    var s = freshState();
    s.streak = 14;
    assert.strictEqual(DC.getStreak(s), 14);
  });

  test('getStreakMultiplier: streak 0 returns 1.0', function() {
    assert.strictEqual(DC.getStreakMultiplier(0), 1.0);
  });

  test('getStreakMultiplier: streak 1 returns 1.0', function() {
    assert.strictEqual(DC.getStreakMultiplier(1), 1.0);
  });

  test('getStreakMultiplier: streak 6 returns 1.0', function() {
    assert.strictEqual(DC.getStreakMultiplier(6), 1.0);
  });

  test('getStreakMultiplier: streak 7 returns 1.5', function() {
    assert.strictEqual(DC.getStreakMultiplier(7), 1.5);
  });

  test('getStreakMultiplier: streak 13 returns 1.5', function() {
    assert.strictEqual(DC.getStreakMultiplier(13), 1.5);
  });

  test('getStreakMultiplier: streak 14 returns 2.0', function() {
    assert.strictEqual(DC.getStreakMultiplier(14), 2.0);
  });

  test('getStreakMultiplier: streak 29 returns 2.0', function() {
    assert.strictEqual(DC.getStreakMultiplier(29), 2.0);
  });

  test('getStreakMultiplier: streak 30 returns 3.0', function() {
    assert.strictEqual(DC.getStreakMultiplier(30), 3.0);
  });

  test('getStreakMultiplier: streak 100 returns 3.0', function() {
    assert.strictEqual(DC.getStreakMultiplier(100), 3.0);
  });

  test('Completing a challenge on streak 7 applies 1.5x reward', function() {
    var state = stateWithChallenges(1, 3);
    state.streak = 6; // will become 7 after first completion today
    var challenge = state.activeChallenges[0];
    var baseReward = challenge.reward;
    var result = DC.completeChallenge(state, challenge.id);
    // After completion streak should be 7
    var expectedSpark = Math.round(baseReward.spark * 1.5);
    assert.strictEqual(result.reward.spark, expectedSpark);
  });

  test('Completing a challenge on streak 30+ applies 3x reward', function() {
    var state = stateWithChallenges(1, 3);
    state.streak = 29; // will become 30
    var challenge = state.activeChallenges[0];
    var baseReward = challenge.reward;
    var result = DC.completeChallenge(state, challenge.id);
    var expectedSpark = Math.round(baseReward.spark * 3.0);
    assert.strictEqual(result.reward.spark, expectedSpark);
  });

  test('Streak resets after missing a day (resetDaily with no completions)', function() {
    var state = stateWithChallenges(1, 3);
    // Simulate day 1 with no completions
    state.streak = 5;
    state.lastCompletionDay = 1;
    state.completedToday = []; // missed the day
    // Reset to day 3 (skipped day 2)
    var newState = DC.resetDaily(state, 3);
    assert.strictEqual(newState.streak, 0, 'Streak should reset if a day was missed');
  });

  test('STREAK_TIERS array is exported and has 4 tiers', function() {
    assert(Array.isArray(DC.STREAK_TIERS));
    assert.strictEqual(DC.STREAK_TIERS.length, 4);
  });

  test('Each streak tier has minDays and multiplier', function() {
    DC.STREAK_TIERS.forEach(function(tier) {
      assert(typeof tier.minDays === 'number');
      assert(typeof tier.multiplier === 'number');
    });
  });
});

// ============================================================================
// SUITE 7 — Weekly Meta-Quest
// ============================================================================

suite('Weekly Meta-Quest — checkWeeklyMeta & getWeeklyReward', function() {

  test('WEEKLY_META_THRESHOLD is 5', function() {
    assert.strictEqual(DC.WEEKLY_META_THRESHOLD, 5);
  });

  test('checkWeeklyMeta returns complete:false and justCompleted:false on fresh state', function() {
    var result = DC.checkWeeklyMeta(freshState());
    assert.strictEqual(result.complete, false);
    assert.strictEqual(result.justCompleted, false);
  });

  test('checkWeeklyMeta returns progress and target', function() {
    var result = DC.checkWeeklyMeta(freshState());
    assert(typeof result.progress === 'number');
    assert.strictEqual(result.target, 5);
  });

  test('checkWeeklyMeta returns complete:true when weeklyProgress >= 5', function() {
    var s = freshState();
    s.weeklyProgress = 5;
    var result = DC.checkWeeklyMeta(s);
    assert.strictEqual(result.complete, true);
  });

  test('checkWeeklyMeta justCompleted:true only when newly crossing threshold', function() {
    var s = freshState();
    s.weeklyProgress = 5;
    s.weeklyCompleted = false;
    var result = DC.checkWeeklyMeta(s);
    assert.strictEqual(result.justCompleted, true);
  });

  test('checkWeeklyMeta justCompleted:false when already marked weeklyCompleted', function() {
    var s = freshState();
    s.weeklyProgress = 5;
    s.weeklyCompleted = true;
    var result = DC.checkWeeklyMeta(s);
    assert.strictEqual(result.justCompleted, false);
  });

  test('Completing 5 challenges in a day triggers weeklyCompleted flag', function() {
    var state = stateWithChallenges(1, 5);
    var s = state;
    for (var i = 0; i < 5; i++) {
      var id = s.activeChallenges.filter(function(c) { return !c.completed; })[0].id;
      s = DC.completeChallenge(s, id).state;
    }
    assert.strictEqual(s.weeklyCompleted, true);
  });

  test('getWeeklyReward returns object with spark, xp, item', function() {
    var reward = DC.getWeeklyReward();
    assert(typeof reward.spark === 'number' && reward.spark > 0);
    assert(typeof reward.xp === 'number' && reward.xp > 0);
    assert(typeof reward.item === 'string' && reward.item.length > 0);
  });

  test('getWeeklyReward returns spark of 100', function() {
    var reward = DC.getWeeklyReward();
    assert.strictEqual(reward.spark, 100);
  });

  test('getWeeklyReward returns xp of 150', function() {
    var reward = DC.getWeeklyReward();
    assert.strictEqual(reward.xp, 150);
  });

  test('getWeeklyReward is stable within same call (not random each time)', function() {
    var r1 = DC.getWeeklyReward();
    var r2 = DC.getWeeklyReward();
    assert.strictEqual(r1.item, r2.item, 'Weekly reward item should be stable within the same week');
  });

  test('weeklyCompleted flag is set in state after 5th completion', function() {
    var state = stateWithChallenges(1, 6);
    var s = state;
    for (var i = 0; i < 5; i++) {
      var id = s.activeChallenges.filter(function(c) { return !c.completed; })[0].id;
      s = DC.completeChallenge(s, id).state;
    }
    assert.strictEqual(s.weeklyCompleted, true);
  });
});

// ============================================================================
// SUITE 8 — resetDaily
// ============================================================================

suite('resetDaily — Day Transitions', function() {

  test('Returns a new state object', function() {
    var state = stateWithChallenges(1, 3);
    var newState = DC.resetDaily(state, 2);
    assert(newState !== state);
  });

  test('activeChallenges is replaced with new challenges', function() {
    var state = stateWithChallenges(1, 3);
    var oldIds = state.activeChallenges.map(function(c) { return c.id; });
    var newState = DC.resetDaily(state, 2);
    var newIds = newState.activeChallenges.map(function(c) { return c.id; });
    // At least one should differ (seeded so they will differ for day 2 vs day 1)
    assert(JSON.stringify(oldIds) !== JSON.stringify(newIds), 'New day challenges should differ');
  });

  test('completedToday is reset to empty array', function() {
    var state = stateWithChallenges(1, 3);
    var id = state.activeChallenges[0].id;
    var r1 = DC.completeChallenge(state, id);
    var newState = DC.resetDaily(r1.state, 2);
    assert.strictEqual(newState.completedToday.length, 0);
  });

  test('New challenges have progress:0', function() {
    var state = stateWithChallenges(1, 3);
    var newState = DC.resetDaily(state, 2);
    newState.activeChallenges.forEach(function(c) {
      assert.strictEqual(c.progress, 0, 'New day challenge progress should be 0: ' + c.id);
    });
  });

  test('New challenges have completed:false', function() {
    var state = stateWithChallenges(1, 3);
    var newState = DC.resetDaily(state, 2);
    newState.activeChallenges.forEach(function(c) {
      assert.strictEqual(c.completed, false);
    });
  });

  test('Streak resets to 0 when no completions were made the previous day', function() {
    var state = stateWithChallenges(1, 3);
    state.streak = 5;
    state.lastCompletionDay = 1;
    state.completedToday = []; // didn't complete anything
    var newState = DC.resetDaily(state, 2);
    assert.strictEqual(newState.streak, 0);
  });

  test('Streak preserved when player completed something yesterday and today is consecutive', function() {
    var state = stateWithChallenges(1, 3);
    var id = state.activeChallenges[0].id;
    var completed = DC.completeChallenge(state, id);
    // completed.state has streak=1, completedToday=[id]
    var newState = DC.resetDaily(completed.state, 2); // consecutive day
    // Streak should remain 1 (not reset)
    assert(newState.streak >= 1, 'Streak should be preserved on consecutive day');
  });

  test('History is preserved across day reset', function() {
    var state = stateWithChallenges(1, 3);
    var id = state.activeChallenges[0].id;
    var r = DC.completeChallenge(state, id);
    var newState = DC.resetDaily(r.state, 2);
    assert.strictEqual(newState.history.length, 1, 'History should survive day reset');
  });

  test('totalCompleted is preserved across day reset', function() {
    var state = stateWithChallenges(1, 3);
    var id = state.activeChallenges[0].id;
    var r = DC.completeChallenge(state, id);
    var newState = DC.resetDaily(r.state, 2);
    assert.strictEqual(newState.totalCompleted, 1);
  });

  test('weeklyProgress and weeklyCompleted reset on new week boundary', function() {
    // Day 1 through 7 is week 0, day 8 starts week 1
    var state = freshState();
    state.lastCompletionDay = 7;
    state.weeklyProgress = 5;
    state.weeklyCompleted = true;
    state.completedToday = ['chat_10']; // had completion on day 7
    state.activeChallenges = DC.generateDailyChallenges(7, 3);
    var newState = DC.resetDaily(state, 8); // new week
    assert.strictEqual(newState.weeklyProgress, 0, 'weeklyProgress should reset on new week');
    assert.strictEqual(newState.weeklyCompleted, false, 'weeklyCompleted should reset on new week');
  });

  test('weeklyProgress preserved mid-week', function() {
    var state = freshState();
    state.lastCompletionDay = 3;
    state.weeklyProgress = 2;
    state.weeklyCompleted = false;
    state.completedToday = ['chat_10'];
    state.activeChallenges = DC.generateDailyChallenges(3, 3);
    var newState = DC.resetDaily(state, 4); // same week
    // weeklyProgress should carry over (was already 2, stays 2)
    assert.strictEqual(newState.weeklyProgress, 2, 'weeklyProgress should not reset mid-week');
  });

  test('Does not mutate original state', function() {
    var state = stateWithChallenges(1, 3);
    var origChallenges = state.activeChallenges.slice();
    DC.resetDaily(state, 2);
    assert.strictEqual(state.activeChallenges.length, origChallenges.length, 'Original state was mutated');
  });

  test('Respects count parameter', function() {
    var state = stateWithChallenges(1, 3);
    var newState = DC.resetDaily(state, 2, 5);
    assert.strictEqual(newState.activeChallenges.length, 5);
  });
});

// ============================================================================
// SUITE 9 — getChallengeById
// ============================================================================

suite('getChallengeById — Lookup', function() {

  test('Returns correct challenge for valid ID from pool', function() {
    var result = DC.getChallengeById('gather_5_wood');
    assert(result !== null);
    assert.strictEqual(result.id, 'gather_5_wood');
  });

  test('Returns null for unknown ID', function() {
    var result = DC.getChallengeById('does_not_exist_xyz');
    assert.strictEqual(result, null);
  });

  test('Returns correct challenge for seasonal ID', function() {
    var result = DC.getChallengeById('seasonal_spring');
    assert(result !== null);
    assert.strictEqual(result.season, 'spring');
  });

  test('All 30 pool IDs are findable', function() {
    DC.CHALLENGE_POOL.forEach(function(c) {
      var found = DC.getChallengeById(c.id);
      assert(found !== null, 'getChallengeById returned null for: ' + c.id);
      assert.strictEqual(found.id, c.id);
    });
  });

  test('Returns challenge with correct target', function() {
    var result = DC.getChallengeById('walk_500');
    assert.strictEqual(result.target, 500);
  });

  test('Returns challenge with correct reward', function() {
    var result = DC.getChallengeById('gather_crystal');
    assert.strictEqual(result.reward.spark, 25);
    assert.strictEqual(result.reward.xp, 30);
  });
});

// ============================================================================
// SUITE 10 — getActiveChallenges
// ============================================================================

suite('getActiveChallenges — Accessor', function() {

  test('Returns empty array on fresh state', function() {
    var result = DC.getActiveChallenges(freshState());
    assert(Array.isArray(result));
    assert.strictEqual(result.length, 0);
  });

  test('Returns the activeChallenges from state', function() {
    var state = stateWithChallenges(1, 3);
    var result = DC.getActiveChallenges(state);
    assert.strictEqual(result.length, 3);
  });

  test('Each returned challenge has all required fields', function() {
    var state = stateWithChallenges(1, 3);
    var result = DC.getActiveChallenges(state);
    result.forEach(function(c) {
      assert(c.id, 'Missing id');
      assert(c.title, 'Missing title');
      assert(typeof c.progress === 'number', 'Missing progress');
      assert(typeof c.completed === 'boolean', 'Missing completed');
      assert(typeof c.target === 'number', 'Missing target');
    });
  });
});

// ============================================================================
// SUITE 11 — Seasonal Challenges
// ============================================================================

suite('getSeasonalChallenge — Seasonal Challenges', function() {

  test('SEASONAL_CHALLENGES has all 4 seasons', function() {
    var keys = Object.keys(DC.SEASONAL_CHALLENGES);
    assert.strictEqual(keys.length, 4);
    ['spring', 'summer', 'autumn', 'winter'].forEach(function(s) {
      assert(keys.indexOf(s) !== -1, 'Missing season: ' + s);
    });
  });

  test('Each seasonal challenge has id, title, desc, target, type, reward', function() {
    Object.values(DC.SEASONAL_CHALLENGES).forEach(function(c) {
      assert(typeof c.id === 'string' && c.id.length > 0, 'Missing id');
      assert(typeof c.title === 'string', 'Missing title');
      assert(typeof c.desc === 'string', 'Missing desc');
      assert(typeof c.target === 'number' && c.target > 0, 'Invalid target');
      assert(typeof c.type === 'string', 'Missing type');
      assert(c.reward && typeof c.reward.spark === 'number', 'Missing reward.spark');
    });
  });

  test('Each seasonal reward has an item field', function() {
    Object.values(DC.SEASONAL_CHALLENGES).forEach(function(c) {
      assert(typeof c.reward.item === 'string' && c.reward.item.length > 0, 'Missing reward.item in season: ' + c.season);
    });
  });

  test('getSeasonalChallenge returns spring challenge for spring', function() {
    var result = DC.getSeasonalChallenge('spring', 1);
    assert(result !== null);
    assert.strictEqual(result.season, 'spring');
  });

  test('getSeasonalChallenge returns null for invalid season', function() {
    var result = DC.getSeasonalChallenge('monsoon', 1);
    assert.strictEqual(result, null);
  });

  test('getSeasonalChallenge returns challenge with progress:0', function() {
    var result = DC.getSeasonalChallenge('summer', 50);
    assert.strictEqual(result.progress, 0);
  });

  test('getSeasonalChallenge returns challenge with completed:false', function() {
    var result = DC.getSeasonalChallenge('autumn', 100);
    assert.strictEqual(result.completed, false);
  });

  test('getSeasonalChallenge includes dayNumber in the returned object', function() {
    var result = DC.getSeasonalChallenge('winter', 200);
    assert.strictEqual(result.dayNumber, 200);
  });

  test('Spring seasonal challenge has Gardens zone association', function() {
    var result = DC.getSeasonalChallenge('spring', 1);
    assert.strictEqual(result.zone, 'gardens');
  });

  test('Seasonal challenge spark rewards are higher than typical daily rewards', function() {
    var avgDailySpark = DC.CHALLENGE_POOL.reduce(function(sum, c) { return sum + c.reward.spark; }, 0) / DC.CHALLENGE_POOL.length;
    Object.values(DC.SEASONAL_CHALLENGES).forEach(function(c) {
      assert(c.reward.spark > avgDailySpark, 'Seasonal reward should exceed average daily: ' + c.season);
    });
  });
});

// ============================================================================
// SUITE 12 — Reward Calculations with Streak Multiplier
// ============================================================================

suite('Reward Calculations — Streak Multiplier Applied', function() {

  test('1x multiplier: reward equals base reward', function() {
    var state = stateWithChallenges(1, 3);
    state.streak = 0; // will become 1, multiplier = 1.0
    var challenge = state.activeChallenges[0];
    var result = DC.completeChallenge(state, challenge.id);
    var expectedSpark = Math.round(challenge.reward.spark * 1.0);
    assert.strictEqual(result.reward.spark, expectedSpark);
  });

  test('1.5x multiplier: reward is 1.5x base (rounded)', function() {
    var state = stateWithChallenges(1, 3);
    state.streak = 6; // will become 7, multiplier = 1.5
    var challenge = state.activeChallenges[0];
    var result = DC.completeChallenge(state, challenge.id);
    var expectedSpark = Math.round(challenge.reward.spark * 1.5);
    assert.strictEqual(result.reward.spark, expectedSpark);
  });

  test('2x multiplier: reward is exactly double base (rounded)', function() {
    var state = stateWithChallenges(1, 3);
    state.streak = 13; // will become 14, multiplier = 2.0
    var challenge = state.activeChallenges[0];
    var result = DC.completeChallenge(state, challenge.id);
    var expectedSpark = Math.round(challenge.reward.spark * 2.0);
    assert.strictEqual(result.reward.spark, expectedSpark);
  });

  test('3x multiplier: reward is triple base (rounded)', function() {
    var state = stateWithChallenges(1, 3);
    state.streak = 29; // will become 30, multiplier = 3.0
    var challenge = state.activeChallenges[0];
    var result = DC.completeChallenge(state, challenge.id);
    var expectedSpark = Math.round(challenge.reward.spark * 3.0);
    assert.strictEqual(result.reward.spark, expectedSpark);
  });

  test('XP is also multiplied by streak multiplier', function() {
    var state = stateWithChallenges(1, 3);
    state.streak = 6; // 1.5x
    var challenge = state.activeChallenges[0];
    var result = DC.completeChallenge(state, challenge.id);
    var expectedXp = Math.round(challenge.reward.xp * 1.5);
    assert.strictEqual(result.reward.xp, expectedXp);
  });

  test('Second completion same day does not change multiplier (streak stays same)', function() {
    var state = stateWithChallenges(1, 3);
    state.streak = 6; // becomes 7 after first completion (1.5x)
    var r1 = DC.completeChallenge(state, state.activeChallenges[0].id);
    // Now streak is 7 — second completion same day should NOT increment streak again
    var challenge2 = r1.state.activeChallenges[1];
    var r2 = DC.completeChallenge(r1.state, challenge2.id);
    // streak stays 7, multiplier stays 1.5
    var expectedSpark = Math.round(challenge2.reward.spark * 1.5);
    assert.strictEqual(r2.reward.spark, expectedSpark);
  });
});

// ============================================================================
// SUITE 13 — getCompletionHistory
// ============================================================================

suite('getCompletionHistory — History Retrieval', function() {

  test('Returns empty array on fresh state', function() {
    var result = DC.getCompletionHistory(freshState());
    assert(Array.isArray(result));
    assert.strictEqual(result.length, 0);
  });

  test('Returns the last N entries (default 10)', function() {
    var state = stateWithChallenges(1, 3);
    var s = state;
    s = DC.completeChallenge(s, s.activeChallenges[0].id).state;
    s = DC.completeChallenge(s, s.activeChallenges[1].id).state;
    var result = DC.getCompletionHistory(s);
    assert.strictEqual(result.length, 2);
  });

  test('Respects the limit parameter', function() {
    var state = stateWithChallenges(1, 3);
    var s = state;
    s = DC.completeChallenge(s, s.activeChallenges[0].id).state;
    s = DC.completeChallenge(s, s.activeChallenges[1].id).state;
    s = DC.completeChallenge(s, s.activeChallenges[2].id).state;
    var result = DC.getCompletionHistory(s, 2);
    assert.strictEqual(result.length, 2);
  });

  test('History entries have challengeId', function() {
    var state = stateWithChallenges(1, 3);
    var id = state.activeChallenges[0].id;
    var s = DC.completeChallenge(state, id).state;
    var history = DC.getCompletionHistory(s, 10);
    assert(history[0].challengeId === id);
  });
});

// ============================================================================
// SUITE 14 — Formatting Functions
// ============================================================================

suite('formatChallengeCard — HTML Output', function() {

  test('Returns a non-empty string', function() {
    var challenge = DC.generateDailyChallenges(1, 1)[0];
    var result = DC.formatChallengeCard(challenge);
    assert(typeof result === 'string' && result.length > 0);
  });

  test('Returned HTML contains challenge title', function() {
    var challenge = DC.generateDailyChallenges(1, 1)[0];
    var result = DC.formatChallengeCard(challenge);
    assert(result.indexOf(challenge.title) !== -1, 'HTML should contain challenge title');
  });

  test('Returned HTML contains challenge desc', function() {
    var challenge = DC.generateDailyChallenges(1, 1)[0];
    var result = DC.formatChallengeCard(challenge);
    assert(result.indexOf(challenge.desc) !== -1, 'HTML should contain description');
  });

  test('Returned HTML contains spark reward', function() {
    var challenge = DC.generateDailyChallenges(1, 1)[0];
    var result = DC.formatChallengeCard(challenge);
    assert(result.indexOf('Spark') !== -1);
  });

  test('Completed challenge card has challenge-complete class', function() {
    var challenge = DC.generateDailyChallenges(1, 1)[0];
    challenge.completed = true;
    var result = DC.formatChallengeCard(challenge);
    assert(result.indexOf('challenge-complete') !== -1);
  });

  test('Incomplete challenge card does not have challenge-complete class', function() {
    var challenge = DC.generateDailyChallenges(1, 1)[0];
    challenge.completed = false;
    challenge.progress = 0;
    var result = DC.formatChallengeCard(challenge);
    assert(result.indexOf('challenge-complete') === -1);
  });

  test('Streak multiplier > 1 shows multiplier badge in card', function() {
    var challenge = DC.generateDailyChallenges(1, 1)[0];
    var result = DC.formatChallengeCard(challenge, 0, 1.5);
    assert(result.indexOf('x1.5') !== -1 || result.indexOf('multiplier') !== -1);
  });

  test('Contains progress bar element', function() {
    var challenge = DC.generateDailyChallenges(1, 1)[0];
    var result = DC.formatChallengeCard(challenge);
    assert(result.indexOf('progress') !== -1);
  });

  test('Contains data-id attribute with challenge id', function() {
    var challenge = DC.generateDailyChallenges(1, 1)[0];
    var result = DC.formatChallengeCard(challenge);
    assert(result.indexOf(challenge.id) !== -1);
  });
});

suite('formatStreakDisplay — Streak HTML', function() {

  test('Returns a non-empty string', function() {
    var result = DC.formatStreakDisplay(0);
    assert(typeof result === 'string' && result.length > 0);
  });

  test('Shows streak count in output', function() {
    var result = DC.formatStreakDisplay(7);
    assert(result.indexOf('7') !== -1);
  });

  test('Shows "day streak" text', function() {
    var result = DC.formatStreakDisplay(3);
    assert(result.indexOf('streak') !== -1);
  });

  test('Shows multiplier value in output', function() {
    var result = DC.formatStreakDisplay(7);
    assert(result.indexOf('1.5') !== -1);
  });

  test('Streak 30+ shows 3x multiplier', function() {
    var result = DC.formatStreakDisplay(30);
    assert(result.indexOf('3.0') !== -1);
  });

  test('Streak 0 shows 1.0 multiplier', function() {
    var result = DC.formatStreakDisplay(0);
    assert(result.indexOf('1.0') !== -1);
  });

  test('High streak shows bonus tier label', function() {
    var result = DC.formatStreakDisplay(14);
    assert(result.indexOf('2x') !== -1 || result.indexOf('Rewards') !== -1);
  });
});

// ============================================================================
// SUITE 15 — Edge Cases & Invariants
// ============================================================================

suite('Edge Cases & Invariants', function() {

  test('updateProgress with amount=0 does not change progress', function() {
    var state = stateWithChallenges(1, 3);
    var challenge = state.activeChallenges[0];
    var result = DC.updateProgress(state, challenge.id, 0);
    var updated = result.state.activeChallenges.filter(function(c) { return c.id === challenge.id; })[0];
    assert.strictEqual(updated.progress, 0);
  });

  test('generateDailyChallenges with count=0 uses default of 3', function() {
    var result = DC.generateDailyChallenges(1, 0);
    assert.strictEqual(result.length, 3);
  });

  test('generateDailyChallenges with negative count uses default of 3', function() {
    var result = DC.generateDailyChallenges(1, -1);
    assert.strictEqual(result.length, 3);
  });

  test('resetDaily with count=0 uses default of 3', function() {
    var state = stateWithChallenges(1, 3);
    var newState = DC.resetDaily(state, 2, 0);
    assert.strictEqual(newState.activeChallenges.length, 3);
  });

  test('getCompletionHistory with limit=0 uses default of 10', function() {
    // With 0 history entries, result is still an array
    var result = DC.getCompletionHistory(freshState(), 0);
    assert(Array.isArray(result));
  });

  test('Completing the same challenge twice does not add to completedToday twice', function() {
    var state = stateWithChallenges(1, 3);
    var id = state.activeChallenges[0].id;
    var r1 = DC.completeChallenge(state, id);
    var r2 = DC.completeChallenge(r1.state, id); // already done
    var count = r2.state.completedToday.filter(function(cid) { return cid === id; }).length;
    assert.strictEqual(count, 1, 'Should not add duplicate entry to completedToday');
  });

  test('totalCompleted does not increment on duplicate completion', function() {
    var state = stateWithChallenges(1, 3);
    var id = state.activeChallenges[0].id;
    var r1 = DC.completeChallenge(state, id);
    var r2 = DC.completeChallenge(r1.state, id);
    assert.strictEqual(r2.state.totalCompleted, 1);
  });

  test('weeklyProgress does not exceed WEEKLY_META_THRESHOLD * 2 after many completions', function() {
    // Not a hard limit, but ensure it tracks correctly
    var state = stateWithChallenges(1, 3);
    var s = state;
    for (var i = 0; i < 3; i++) {
      s = DC.completeChallenge(s, s.activeChallenges[i].id).state;
    }
    assert.strictEqual(s.weeklyProgress, 3);
  });

  test('Different day seeds produce different shuffles (statistical check over 10 days)', function() {
    var seenOrders = {};
    var allSame = true;
    var first = DC.generateDailyChallenges(1, 3).map(function(c) { return c.id; }).join(',');
    for (var d = 2; d <= 10; d++) {
      var order = DC.generateDailyChallenges(d, 3).map(function(c) { return c.id; }).join(',');
      if (order !== first) allSame = false;
      seenOrders[order] = true;
    }
    assert(!allSame, 'All days produced the same challenge order — seeding is broken');
  });

  test('getStreak works even if state.streak is undefined', function() {
    var s = {};
    assert.strictEqual(DC.getStreak(s), 0);
  });

  test('getActiveChallenges works when activeChallenges is undefined', function() {
    var s = {};
    var result = DC.getActiveChallenges(s);
    assert(Array.isArray(result));
    assert.strictEqual(result.length, 0);
  });

  test('Chained: generate -> progress -> complete -> reset cycle works end-to-end', function() {
    // Day 1
    var state = freshState();
    state.activeChallenges = DC.generateDailyChallenges(1, 3);
    assert.strictEqual(state.activeChallenges.length, 3);

    // Complete one
    var id = state.activeChallenges[0].id;
    var target = state.activeChallenges[0].target;
    var r = DC.updateProgress(state, id, target);
    assert.strictEqual(r.completed, true);
    assert.strictEqual(r.state.streak, 1);

    // Day 2 reset
    var day2 = DC.resetDaily(r.state, 2);
    assert.strictEqual(day2.completedToday.length, 0);
    assert.strictEqual(day2.activeChallenges.length, 3);

    // Complete on day 2 — streak should preserve
    var id2 = day2.activeChallenges[0].id;
    var target2 = day2.activeChallenges[0].target;
    var r2 = DC.updateProgress(day2, id2, target2);
    assert.strictEqual(r2.completed, true);
    assert(r2.state.streak >= 1, 'Streak should be at least 1 on day 2');
  });
});

// ============================================================================
// RUN ALL AND REPORT
// ============================================================================

if (!report()) {
  process.exit(1);
}
