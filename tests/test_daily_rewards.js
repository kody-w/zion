/**
 * tests/test_daily_rewards.js
 * 70+ tests for the Daily Login Rewards system
 */

const { test, suite, report, assert } = require('./test_runner');
const DR = require('../src/js/daily_rewards');

// =========================================================================
// HELPERS
// =========================================================================

function freshPlayer() {
  return {};
}

// Return a timestamp for "now" at a specific UTC time
function utcTs(year, month, day, hour, min) {
  return Date.UTC(year, month - 1, day, hour || 0, min || 0, 0, 0);
}

// Claim with an explicit timestamp for deterministic testing
function claimAt(playerData, ts) {
  return DR.claimDailyReward('player1', playerData, { now: ts });
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_HOUR = 60 * 60 * 1000;

// =========================================================================
// SUITE 1 — MODULE EXPORTS
// =========================================================================

suite('Module Exports', () => {

  test('REWARD_CALENDAR is exported as an array', () => {
    assert(Array.isArray(DR.REWARD_CALENDAR), 'REWARD_CALENDAR must be an array');
  });

  test('REWARD_CALENDAR has 7 entries', () => {
    assert.strictEqual(DR.REWARD_CALENDAR.length, 7);
  });

  test('STREAK_BONUSES is exported as an array', () => {
    assert(Array.isArray(DR.STREAK_BONUSES), 'STREAK_BONUSES must be an array');
  });

  test('GRACE_PERIOD_HOURS is 36', () => {
    assert.strictEqual(DR.GRACE_PERIOD_HOURS, 36);
  });

  test('All functions are exported', () => {
    const fns = [
      'claimDailyReward', 'getDailyReward', 'getStreak', 'getStreakBonus',
      'canClaim', 'getNextReward', 'getRewardHistory', 'calculateStreakReward',
      'resetStreak', 'getCalendarView', 'formatReward', 'getLifetimeRewards'
    ];
    fns.forEach(fn => {
      assert(typeof DR[fn] === 'function', `Missing export: ${fn}`);
    });
  });

});

// =========================================================================
// SUITE 2 — REWARD CALENDAR STRUCTURE
// =========================================================================

suite('REWARD_CALENDAR — structure', () => {

  test('Day 1 gives 5 Spark', () => {
    const reward = DR.REWARD_CALENDAR[0];
    assert.strictEqual(reward.day, 1);
    assert.strictEqual(reward.spark, 5);
    assert.strictEqual(reward.type, 'spark');
    assert.strictEqual(reward.item, null);
  });

  test('Day 2 gives seed item, no spark', () => {
    const reward = DR.REWARD_CALENDAR[1];
    assert.strictEqual(reward.day, 2);
    assert.strictEqual(reward.spark, 0);
    assert(reward.item !== null, 'Day 2 should have an item');
    assert(reward.item.id.startsWith('seed_'), `Day 2 item should be a seed, got ${reward.item.id}`);
  });

  test('Day 3 gives 10 Spark', () => {
    const reward = DR.REWARD_CALENDAR[2];
    assert.strictEqual(reward.spark, 10);
  });

  test('Day 4 gives a crafting material item', () => {
    const reward = DR.REWARD_CALENDAR[3];
    assert(reward.item !== null, 'Day 4 should have an item');
    assert(reward.item.id !== null);
  });

  test('Day 5 gives 15 Spark', () => {
    const reward = DR.REWARD_CALENDAR[4];
    assert.strictEqual(reward.spark, 15);
  });

  test('Day 6 gives rare_chance type', () => {
    const reward = DR.REWARD_CALENDAR[5];
    assert.strictEqual(reward.type, 'rare_chance');
    assert(typeof reward.rareChance === 'number');
    assert(reward.rareChance > 0 && reward.rareChance <= 1);
    assert(reward.rareFallbackItem !== undefined, 'Day 6 needs a fallback item');
  });

  test('Day 7 gives 25 Spark and a bonus item', () => {
    const reward = DR.REWARD_CALENDAR[6];
    assert.strictEqual(reward.spark, 25);
    assert(reward.item !== null, 'Day 7 should have a bonus item');
    assert.strictEqual(reward.type, 'jackpot');
  });

  test('Every calendar entry has required fields', () => {
    const required = ['day', 'label', 'type', 'spark', 'description'];
    DR.REWARD_CALENDAR.forEach((entry, i) => {
      required.forEach(field => {
        assert(entry[field] !== undefined, `Day ${i + 1} missing field "${field}"`);
      });
    });
  });

  test('Calendar days are numbered 1-7', () => {
    DR.REWARD_CALENDAR.forEach((entry, i) => {
      assert.strictEqual(entry.day, i + 1, `Entry ${i} has wrong day number`);
    });
  });

});

// =========================================================================
// SUITE 3 — getDailyReward (cycling)
// =========================================================================

suite('getDailyReward — cycling', () => {

  test('Day 1 returns first calendar entry', () => {
    const r = DR.getDailyReward(1);
    assert.strictEqual(r.day, 1);
  });

  test('Day 7 returns seventh calendar entry', () => {
    const r = DR.getDailyReward(7);
    assert.strictEqual(r.day, 7);
  });

  test('Day 8 cycles back to day 1 reward', () => {
    const r8 = DR.getDailyReward(8);
    const r1 = DR.getDailyReward(1);
    assert.strictEqual(r8.day, r1.day);
    assert.strictEqual(r8.spark, r1.spark);
  });

  test('Day 14 cycles back to day 7 reward', () => {
    const r = DR.getDailyReward(14);
    assert.strictEqual(r.day, 7);
  });

  test('Day 15 cycles to day 1 reward', () => {
    const r = DR.getDailyReward(15);
    assert.strictEqual(r.day, 1);
  });

  test('Very large day number still cycles correctly', () => {
    const r = DR.getDailyReward(701); // 701 % 7 === 1 → day index 0 → day 1
    assert.strictEqual(r.day, 1);
  });

});

// =========================================================================
// SUITE 4 — getStreak
// =========================================================================

suite('getStreak — basic', () => {

  test('New player has streak 0', () => {
    const p = freshPlayer();
    assert.strictEqual(DR.getStreak(p), 0);
  });

  test('After first claim streak is 1', () => {
    const p = freshPlayer();
    const ts = utcTs(2026, 1, 1);
    claimAt(p, ts);
    // Immediately check — still within grace
    // Fake "now" at same moment
    const dr = p.dailyRewards;
    // streak stored is 1
    assert.strictEqual(dr.streak, 1);
  });

  test('getStreak returns 0 if grace period expired', () => {
    const p = freshPlayer();
    const ts = utcTs(2026, 1, 1);
    claimAt(p, ts);
    // Manually set lastClaimTs to 37 hours ago
    p.dailyRewards.lastClaimTs = Date.now() - (37 * MS_PER_HOUR);
    assert.strictEqual(DR.getStreak(p), 0);
  });

  test('getStreak returns stored value within grace period', () => {
    const p = freshPlayer();
    const ts = utcTs(2026, 1, 1);
    claimAt(p, ts);
    p.dailyRewards.streak = 5;
    p.dailyRewards.lastClaimTs = Date.now() - (2 * MS_PER_HOUR);
    assert.strictEqual(DR.getStreak(p), 5);
  });

  test('getStreak initialises dailyRewards if missing', () => {
    const p = {};
    const streak = DR.getStreak(p);
    assert.strictEqual(streak, 0);
    assert(p.dailyRewards !== undefined, 'dailyRewards should be initialised');
  });

});

// =========================================================================
// SUITE 5 — getStreakBonus
// =========================================================================

suite('getStreakBonus — multipliers', () => {

  test('Streak 0 gives multiplier 1.0', () => {
    const b = DR.getStreakBonus(0);
    assert.strictEqual(b.multiplier, 1.0);
  });

  test('Streak 1 gives multiplier 1.0', () => {
    const b = DR.getStreakBonus(1);
    assert.strictEqual(b.multiplier, 1.0);
  });

  test('Streak 2 gives multiplier 1.0', () => {
    const b = DR.getStreakBonus(2);
    assert.strictEqual(b.multiplier, 1.0);
  });

  test('Streak 3 gives 1.5x', () => {
    const b = DR.getStreakBonus(3);
    assert.strictEqual(b.multiplier, 1.5);
  });

  test('Streak 5 gives 1.5x', () => {
    const b = DR.getStreakBonus(5);
    assert.strictEqual(b.multiplier, 1.5);
  });

  test('Streak 6 gives 1.5x', () => {
    const b = DR.getStreakBonus(6);
    assert.strictEqual(b.multiplier, 1.5);
  });

  test('Streak 7 gives 2.0x', () => {
    const b = DR.getStreakBonus(7);
    assert.strictEqual(b.multiplier, 2.0);
  });

  test('Streak 10 gives 2.0x', () => {
    const b = DR.getStreakBonus(10);
    assert.strictEqual(b.multiplier, 2.0);
  });

  test('Streak 14 gives 2.5x', () => {
    const b = DR.getStreakBonus(14);
    assert.strictEqual(b.multiplier, 2.5);
  });

  test('Streak 20 gives 2.5x', () => {
    const b = DR.getStreakBonus(20);
    assert.strictEqual(b.multiplier, 2.5);
  });

  test('Streak 30 gives 3.0x', () => {
    const b = DR.getStreakBonus(30);
    assert.strictEqual(b.multiplier, 3.0);
  });

  test('Streak 50 gives 3.0x', () => {
    const b = DR.getStreakBonus(50);
    assert.strictEqual(b.multiplier, 3.0);
  });

  test('Each bonus has a label string', () => {
    [0, 3, 7, 14, 30].forEach(s => {
      const b = DR.getStreakBonus(s);
      assert(typeof b.label === 'string' && b.label.length > 0, `Streak ${s} missing label`);
    });
  });

});

// =========================================================================
// SUITE 6 — calculateStreakReward
// =========================================================================

suite('calculateStreakReward', () => {

  test('Base 10 with streak 1 → 10', () => {
    assert.strictEqual(DR.calculateStreakReward(10, 1), 10);
  });

  test('Base 10 with streak 3 → 15 (1.5x, floored)', () => {
    assert.strictEqual(DR.calculateStreakReward(10, 3), 15);
  });

  test('Base 10 with streak 7 → 20 (2x)', () => {
    assert.strictEqual(DR.calculateStreakReward(10, 7), 20);
  });

  test('Base 10 with streak 14 → 25 (2.5x, floored)', () => {
    assert.strictEqual(DR.calculateStreakReward(10, 14), 25);
  });

  test('Base 10 with streak 30 → 30 (3x)', () => {
    assert.strictEqual(DR.calculateStreakReward(10, 30), 30);
  });

  test('Base 5 with streak 3 → 7 (floor of 7.5)', () => {
    assert.strictEqual(DR.calculateStreakReward(5, 3), 7);
  });

  test('Base 0 always returns 0', () => {
    [1, 3, 7, 14, 30].forEach(s => {
      assert.strictEqual(DR.calculateStreakReward(0, s), 0);
    });
  });

  test('Result is always an integer', () => {
    [5, 10, 15, 25].forEach(base => {
      [1, 3, 7, 14, 30].forEach(streak => {
        const result = DR.calculateStreakReward(base, streak);
        assert.strictEqual(result, Math.floor(result), `${base} x streak ${streak} should be integer`);
      });
    });
  });

});

// =========================================================================
// SUITE 7 — canClaim
// =========================================================================

suite('canClaim', () => {

  test('New player can claim', () => {
    const p = freshPlayer();
    assert.strictEqual(DR.canClaim('p1', p), true);
  });

  test('Cannot claim twice on the same UTC day', () => {
    const p = freshPlayer();
    const ts = utcTs(2026, 2, 15, 10, 0);
    claimAt(p, ts);
    // Same day, 1 hour later
    p.dailyRewards.lastClaimTs = ts;
    // Mock "now" as 2 hours later (same day)
    const nowSameDay = ts + 2 * MS_PER_HOUR;
    // Manually verify daysDiff < 1
    const diff = DR._daysDiff(nowSameDay, ts);
    assert.strictEqual(diff, 0, 'daysDiff should be 0 for same day');
    // So canClaim should return false — test by claiming then checking state
    // (canClaim uses Date.now() internally, so we test the logic via claimAt)
    const result = DR.claimDailyReward('p1', p, { now: nowSameDay });
    assert.strictEqual(result.success, false);
  });

  test('Can claim the next UTC day', () => {
    const p = freshPlayer();
    const day1 = utcTs(2026, 2, 15, 23, 59);
    claimAt(p, day1);
    // Next day (just past midnight UTC)
    const day2 = utcTs(2026, 2, 16, 0, 1);
    const result = claimAt(p, day2);
    assert.strictEqual(result.success, true, 'Should be able to claim next day');
  });

  test('Cannot claim if just claimed (immediate re-call)', () => {
    const p = freshPlayer();
    const ts = utcTs(2026, 2, 20, 12, 0);
    const r1 = claimAt(p, ts);
    assert.strictEqual(r1.success, true);
    const r2 = claimAt(p, ts + 1000);
    assert.strictEqual(r2.success, false);
    assert(r2.message.includes('Already claimed') || r2.nextClaimTs !== undefined);
  });

});

// =========================================================================
// SUITE 8 — claimDailyReward
// =========================================================================

suite('claimDailyReward — basic flow', () => {

  test('First claim returns success', () => {
    const p = freshPlayer();
    const r = claimAt(p, utcTs(2026, 1, 10));
    assert.strictEqual(r.success, true);
  });

  test('First claim increments streak to 1', () => {
    const p = freshPlayer();
    claimAt(p, utcTs(2026, 1, 10));
    assert.strictEqual(p.dailyRewards.streak, 1);
  });

  test('First claim gives Day 1 reward (5 Spark base)', () => {
    const p = freshPlayer();
    const r = claimAt(p, utcTs(2026, 1, 10));
    assert.strictEqual(r.reward.baseSpark, 5);
  });

  test('Second claim on consecutive day gives Day 2 reward', () => {
    const p = freshPlayer();
    claimAt(p, utcTs(2026, 1, 10));
    const r = claimAt(p, utcTs(2026, 1, 11));
    assert.strictEqual(r.success, true);
    assert.strictEqual(r.newStreak, 2);
  });

  test('Day 2 reward includes seed item', () => {
    const p = freshPlayer();
    claimAt(p, utcTs(2026, 1, 10));
    const r = claimAt(p, utcTs(2026, 1, 11));
    assert(r.reward.item !== null, 'Day 2 should have an item');
  });

  test('Day 7 reward gives 25 Spark (or boosted)', () => {
    const p = freshPlayer();
    var ts = utcTs(2026, 1, 1);
    for (var i = 0; i < 7; i++) {
      claimAt(p, ts + i * MS_PER_DAY);
    }
    assert.strictEqual(p.dailyRewards.streak, 7);
    // The 7th day base is 25 Spark, multiplied by 2x streak bonus (streak 7 → 2.0x)
    const lastClaim = p.dailyRewards.history[6];
    assert.strictEqual(lastClaim.baseSpark, 25);
  });

  test('Claim stores record in history', () => {
    const p = freshPlayer();
    claimAt(p, utcTs(2026, 1, 10));
    assert.strictEqual(p.dailyRewards.history.length, 1);
  });

  test('Multiple claims grow history', () => {
    const p = freshPlayer();
    var ts = utcTs(2026, 1, 1);
    for (var i = 0; i < 5; i++) {
      claimAt(p, ts + i * MS_PER_DAY);
    }
    assert.strictEqual(p.dailyRewards.history.length, 5);
  });

  test('Claim updates lifetimeSpark', () => {
    const p = freshPlayer();
    claimAt(p, utcTs(2026, 1, 1));
    assert(p.dailyRewards.lifetimeSpark > 0, 'lifetimeSpark should be positive');
  });

  test('Result contains streakBonus object', () => {
    const p = freshPlayer();
    const r = claimAt(p, utcTs(2026, 1, 1));
    assert(r.streakBonus !== undefined);
    assert(typeof r.streakBonus.multiplier === 'number');
    assert(typeof r.streakBonus.label === 'string');
  });

  test('Result contains newStreak number', () => {
    const p = freshPlayer();
    const r = claimAt(p, utcTs(2026, 1, 1));
    assert(typeof r.newStreak === 'number');
    assert.strictEqual(r.newStreak, 1);
  });

});

// =========================================================================
// SUITE 9 — Grace Period and Streak Reset
// =========================================================================

suite('Grace Period & Streak Reset', () => {

  test('Claiming within 36h continues streak', () => {
    const p = freshPlayer();
    const ts1 = utcTs(2026, 3, 1, 10, 0);
    claimAt(p, ts1);
    // Claim 25 hours later (within 36h grace, different UTC day)
    const ts2 = ts1 + 25 * MS_PER_HOUR;
    const r = claimAt(p, ts2);
    assert.strictEqual(r.success, true);
    assert.strictEqual(r.newStreak, 2);
  });

  test('Claiming after 36h resets streak to 1', () => {
    const p = freshPlayer();
    const ts1 = utcTs(2026, 3, 1, 10, 0);
    claimAt(p, ts1);
    // 37 hours later — grace period expired
    const ts2 = ts1 + 37 * MS_PER_HOUR;
    const r = claimAt(p, ts2);
    assert.strictEqual(r.success, true);
    assert.strictEqual(r.newStreak, 1, 'Streak should reset to 1 after grace period');
  });

  test('resetStreak sets streak to 0', () => {
    const p = freshPlayer();
    const ts = utcTs(2026, 1, 10);
    claimAt(p, ts);
    claimAt(p, ts + MS_PER_DAY);
    assert.strictEqual(p.dailyRewards.streak, 2);
    DR.resetStreak(p);
    assert.strictEqual(p.dailyRewards.streak, 0);
  });

  test('resetStreak initialises state if missing', () => {
    const p = {};
    DR.resetStreak(p);
    assert.strictEqual(p.dailyRewards.streak, 0);
  });

  test('After streak reset, next claim starts from Day 1 reward', () => {
    const p = freshPlayer();
    const ts1 = utcTs(2026, 3, 1);
    // Build up a streak of 4
    for (var i = 0; i < 4; i++) {
      claimAt(p, ts1 + i * MS_PER_DAY);
    }
    assert.strictEqual(p.dailyRewards.streak, 4);
    // Reset
    DR.resetStreak(p);
    // Claim again (must be at least next UTC day from last claim)
    const ts2 = ts1 + 5 * MS_PER_DAY;
    const r = claimAt(p, ts2);
    // After grace period expired (>36h from last claim at ts1+3 days → ts2 = ts1+5days = 48h later)
    assert.strictEqual(r.newStreak, 1);
  });

  test('Exactly 36h grace boundary — claim at exactly 36h is still within grace', () => {
    const p = freshPlayer();
    const ts1 = utcTs(2026, 4, 1, 0, 0);
    claimAt(p, ts1);
    // Exactly 36 hours later — boundary case
    const ts2 = ts1 + 36 * MS_PER_HOUR;
    const r = claimAt(p, ts2);
    // 36h is on the boundary — the check is elapsed > gracePeriodMs
    // elapsed = 36h, gracePeriodMs = 36h → NOT > → streak continues
    assert.strictEqual(r.success, true);
    assert.strictEqual(r.newStreak, 2, 'At exactly 36h grace boundary, streak should continue');
  });

  test('37h after last claim — streak breaks', () => {
    const p = freshPlayer();
    const ts1 = utcTs(2026, 4, 1, 0, 0);
    claimAt(p, ts1);
    const ts2 = ts1 + 37 * MS_PER_HOUR;
    const r = claimAt(p, ts2);
    assert.strictEqual(r.newStreak, 1, 'Streak should reset after grace period');
  });

});

// =========================================================================
// SUITE 10 — Streak Bonus Applied to Spark
// =========================================================================

suite('Streak bonus applied in claimDailyReward', () => {

  test('Streak 3 applies 1.5x to Spark reward', () => {
    const p = freshPlayer();
    var ts = utcTs(2026, 5, 1);
    for (var i = 0; i < 2; i++) {
      claimAt(p, ts + i * MS_PER_DAY);
    }
    // Third claim: Day 3 reward is 10 Spark, streak 3 → 1.5x = 15
    const r = claimAt(p, ts + 2 * MS_PER_DAY);
    assert.strictEqual(r.newStreak, 3);
    assert.strictEqual(r.reward.baseSpark, 10);
    assert.strictEqual(r.reward.spark, 15);
  });

  test('Streak 7 applies 2.0x to Day 7 reward (25 * 2 = 50)', () => {
    const p = freshPlayer();
    var ts = utcTs(2026, 5, 10);
    for (var i = 0; i < 7; i++) {
      claimAt(p, ts + i * MS_PER_DAY);
    }
    const lastClaim = p.dailyRewards.history[6];
    assert.strictEqual(lastClaim.baseSpark, 25);
    assert.strictEqual(lastClaim.spark, 50); // 25 * 2.0
  });

  test('Item rewards are NOT multiplied — only spark', () => {
    const p = freshPlayer();
    var ts = utcTs(2026, 5, 1);
    claimAt(p, ts);
    // Day 2 has item reward — item count should not be multiplied
    const r = claimAt(p, ts + MS_PER_DAY);
    if (r.reward.item) {
      assert(typeof r.reward.item.count === 'number');
      // count should match catalog count, not multiplied
      const calendarDay2 = DR.REWARD_CALENDAR[1];
      assert.strictEqual(r.reward.item.count, calendarDay2.item.count);
    }
  });

});

// =========================================================================
// SUITE 11 — canClaim edge cases
// =========================================================================

suite('canClaim — edge cases', () => {

  test('canClaim is false immediately after claiming', () => {
    const p = freshPlayer();
    const ts = utcTs(2026, 6, 1, 10, 0);
    claimAt(p, ts);
    // Re-attempt same second
    const r = claimAt(p, ts + 100);
    assert.strictEqual(r.success, false);
  });

  test('nextClaimTs is returned on failed claim', () => {
    const p = freshPlayer();
    const ts = utcTs(2026, 6, 1, 10, 0);
    claimAt(p, ts);
    const r = claimAt(p, ts + 100);
    assert(r.nextClaimTs !== undefined, 'Should return nextClaimTs on failure');
    assert(typeof r.nextClaimTs === 'number');
  });

  test('canClaim returns true for brand new player', () => {
    const p = freshPlayer();
    assert.strictEqual(DR.canClaim('x', p), true);
  });

});

// =========================================================================
// SUITE 12 — getNextReward
// =========================================================================

suite('getNextReward', () => {

  test('New player: next reward is Day 1', () => {
    const p = freshPlayer();
    const next = DR.getNextReward(p);
    assert.strictEqual(next.day, 1);
  });

  test('After day 1 claim: next reward is Day 2', () => {
    const p = freshPlayer();
    claimAt(p, utcTs(2026, 7, 1));
    // Simulate "within grace period" by keeping lastClaimTs recent
    p.dailyRewards.lastClaimTs = Date.now() - 1000;
    const next = DR.getNextReward(p);
    assert.strictEqual(next.day, 2);
  });

  test('After day 6 claim: next reward is Day 7', () => {
    const p = freshPlayer();
    var ts = utcTs(2026, 7, 1);
    for (var i = 0; i < 6; i++) {
      claimAt(p, ts + i * MS_PER_DAY);
    }
    p.dailyRewards.lastClaimTs = Date.now() - 1000;
    const next = DR.getNextReward(p);
    assert.strictEqual(next.day, 7);
  });

  test('After day 7 claim: next reward cycles back to Day 1 (index 0)', () => {
    const p = freshPlayer();
    var ts = utcTs(2026, 7, 1);
    for (var i = 0; i < 7; i++) {
      claimAt(p, ts + i * MS_PER_DAY);
    }
    p.dailyRewards.lastClaimTs = Date.now() - 1000;
    const next = DR.getNextReward(p);
    // streak is 7, next is 8 → getDailyReward(8) → day 1
    assert.strictEqual(next.day, 1);
  });

});

// =========================================================================
// SUITE 13 — getRewardHistory
// =========================================================================

suite('getRewardHistory', () => {

  test('Empty history for new player', () => {
    const p = freshPlayer();
    const h = DR.getRewardHistory(p, 10);
    assert.strictEqual(h.length, 0);
  });

  test('Returns one record after one claim', () => {
    const p = freshPlayer();
    claimAt(p, utcTs(2026, 8, 1));
    const h = DR.getRewardHistory(p, 10);
    assert.strictEqual(h.length, 1);
  });

  test('History is most recent first', () => {
    const p = freshPlayer();
    var ts = utcTs(2026, 8, 1);
    for (var i = 0; i < 3; i++) {
      claimAt(p, ts + i * MS_PER_DAY);
    }
    const h = DR.getRewardHistory(p, 10);
    assert(h[0].ts >= h[1].ts, 'Most recent should be first');
    assert(h[1].ts >= h[2].ts);
  });

  test('Limit parameter restricts result count', () => {
    const p = freshPlayer();
    var ts = utcTs(2026, 8, 5);
    for (var i = 0; i < 10; i++) {
      claimAt(p, ts + i * MS_PER_DAY);
    }
    const h = DR.getRewardHistory(p, 3);
    assert.strictEqual(h.length, 3);
  });

  test('Default limit is 10', () => {
    const p = freshPlayer();
    var ts = utcTs(2026, 8, 5);
    for (var i = 0; i < 15; i++) {
      claimAt(p, ts + i * MS_PER_DAY);
    }
    const h = DR.getRewardHistory(p);
    assert(h.length <= 10, 'Default limit should be 10');
  });

  test('Each history record has ts and day fields', () => {
    const p = freshPlayer();
    claimAt(p, utcTs(2026, 8, 20));
    const h = DR.getRewardHistory(p, 5);
    h.forEach(record => {
      assert(typeof record.ts === 'number', 'Record missing ts');
      assert(typeof record.day === 'number', 'Record missing day');
    });
  });

});

// =========================================================================
// SUITE 14 — getCalendarView
// =========================================================================

suite('getCalendarView', () => {

  test('Returns 7 entries', () => {
    const p = freshPlayer();
    const view = DR.getCalendarView(p);
    assert.strictEqual(view.length, 7);
  });

  test('New player: nothing claimed', () => {
    const p = freshPlayer();
    const view = DR.getCalendarView(p);
    const claimed = view.filter(v => v.claimed);
    assert.strictEqual(claimed.length, 0);
  });

  test('New player: day 1 is current (can claim)', () => {
    const p = freshPlayer();
    const view = DR.getCalendarView(p);
    assert.strictEqual(view[0].current, true);
  });

  test('After claiming day 1: day 2 becomes current', () => {
    const p = freshPlayer();
    // Claim but keep lastClaimTs old enough for canClaim to be true for day 2
    claimAt(p, utcTs(2026, 9, 1));
    // Manually mark lastClaimTs as yesterday so canClaim is true
    p.dailyRewards.lastClaimTs = Date.now() - 25 * MS_PER_HOUR;
    const view = DR.getCalendarView(p);
    assert.strictEqual(view[1].current, true, 'Day 2 should be current after day 1 claimed');
  });

  test('Each calendar entry has day, label, claimed, current, upcoming fields', () => {
    const p = freshPlayer();
    const view = DR.getCalendarView(p);
    view.forEach((entry, i) => {
      assert(entry.day !== undefined, `Entry ${i} missing day`);
      assert(entry.label !== undefined, `Entry ${i} missing label`);
      assert(typeof entry.claimed === 'boolean', `Entry ${i} claimed must be boolean`);
      assert(typeof entry.current === 'boolean', `Entry ${i} current must be boolean`);
      assert(typeof entry.upcoming === 'boolean', `Entry ${i} upcoming must be boolean`);
    });
  });

  test('Only one entry is current at a time', () => {
    const p = freshPlayer();
    const view = DR.getCalendarView(p);
    const currentEntries = view.filter(v => v.current);
    assert(currentEntries.length <= 1, 'Only one entry should be current');
  });

});

// =========================================================================
// SUITE 15 — getLifetimeRewards
// =========================================================================

suite('getLifetimeRewards', () => {

  test('New player: all zeros', () => {
    const p = freshPlayer();
    const lt = DR.getLifetimeRewards(p);
    assert.strictEqual(lt.totalSpark, 0);
    assert.strictEqual(lt.totalItemCount, 0);
    assert.strictEqual(lt.totalClaims, 0);
    assert.deepStrictEqual(lt.items, []);
  });

  test('After claims: totalSpark accumulates', () => {
    const p = freshPlayer();
    claimAt(p, utcTs(2026, 10, 1));
    const lt = DR.getLifetimeRewards(p);
    assert(lt.totalSpark > 0, 'totalSpark should be positive');
  });

  test('totalClaims matches history length', () => {
    const p = freshPlayer();
    var ts = utcTs(2026, 10, 5);
    for (var i = 0; i < 4; i++) {
      claimAt(p, ts + i * MS_PER_DAY);
    }
    const lt = DR.getLifetimeRewards(p);
    assert.strictEqual(lt.totalClaims, 4);
  });

  test('items array counts item rewards', () => {
    const p = freshPlayer();
    var ts = utcTs(2026, 10, 10);
    // Day 1: no item; Day 2: has item
    claimAt(p, ts);
    claimAt(p, ts + MS_PER_DAY);
    const lt = DR.getLifetimeRewards(p);
    // Day 2 has a seed item
    assert(lt.totalItemCount >= 1, 'Should have at least 1 item from day 2 claim');
  });

});

// =========================================================================
// SUITE 16 — formatReward
// =========================================================================

suite('formatReward', () => {

  test('Formats spark-only reward', () => {
    const reward = { spark: 10, item: null, description: '10 Spark' };
    const str = DR.formatReward(reward);
    assert(typeof str === 'string' && str.length > 0, 'Should return non-empty string');
  });

  test('Formats item-only reward', () => {
    const reward = { spark: 0, item: { id: 'seed_wildflower', count: 3 }, description: '3 seeds' };
    const str = DR.formatReward(reward);
    assert(str.includes('seed_wildflower') || str.includes('seed') || str.length > 0);
  });

  test('Formats combined spark + item reward', () => {
    const reward = { spark: 25, item: { id: 'potion_wisdom', count: 1 }, description: '25 Spark + Wisdom Potion' };
    const str = DR.formatReward(reward);
    assert(str.includes('25') || str.includes('Spark') || str.includes('potion'));
  });

  test('Returns a string for all calendar days', () => {
    DR.REWARD_CALENDAR.forEach((reward, i) => {
      const str = DR.formatReward(reward);
      assert(typeof str === 'string' && str.length > 0, `Day ${i + 1} formatReward returned empty`);
    });
  });

  test('Handles reward with no spark and no item', () => {
    const reward = { spark: 0, item: null, description: 'Nothing' };
    const str = DR.formatReward(reward);
    assert(typeof str === 'string');
  });

});

// =========================================================================
// SUITE 17 — Edge Cases / Misc
// =========================================================================

suite('Edge Cases', () => {

  test('First login ever — no prior state, claim works', () => {
    const p = {};
    const r = DR.claimDailyReward('newUser', p);
    assert.strictEqual(r.success, true);
    assert.strictEqual(r.newStreak, 1);
  });

  test('Player state is initialised idempotently', () => {
    const p = {};
    DR.getStreak(p);
    DR.getStreak(p);
    assert(p.dailyRewards !== undefined, 'dailyRewards should exist');
  });

  test('Claiming across a midnight boundary awards next calendar reward', () => {
    const p = freshPlayer();
    // Claim just before midnight UTC
    const premidnight = utcTs(2026, 11, 1, 23, 59);
    claimAt(p, premidnight);
    // Claim just after midnight
    const postmidnight = utcTs(2026, 11, 2, 0, 1);
    const r = claimAt(p, postmidnight);
    assert.strictEqual(r.success, true);
    assert.strictEqual(r.newStreak, 2);
  });

  test('Day 6 rare_chance resolves to either rare or fallback item', () => {
    // Day 6 claim: streak must be 6
    const p = freshPlayer();
    var ts = utcTs(2026, 11, 10);
    for (var i = 0; i < 5; i++) {
      claimAt(p, ts + i * MS_PER_DAY);
    }
    const r = claimAt(p, ts + 5 * MS_PER_DAY);
    assert.strictEqual(r.newStreak, 6);
    // Item must be either the rare item or the fallback
    const calDay6 = DR.REWARD_CALENDAR[5];
    if (r.reward.item) {
      const validIds = [calDay6.item.id, calDay6.rareFallbackItem.id];
      assert(
        validIds.includes(r.reward.item.id),
        `Day 6 item must be rare or fallback, got: ${r.reward.item.id}`
      );
    }
  });

  test('Lifetime spark matches sum of claim history spark values', () => {
    const p = freshPlayer();
    var ts = utcTs(2026, 12, 1);
    for (var i = 0; i < 7; i++) {
      claimAt(p, ts + i * MS_PER_DAY);
    }
    var sumFromHistory = p.dailyRewards.history.reduce((acc, h) => acc + h.spark, 0);
    assert.strictEqual(p.dailyRewards.lifetimeSpark, sumFromHistory);
  });

  test('daysDiff helper: same day returns 0', () => {
    const ts = utcTs(2026, 1, 15, 10, 0);
    const ts2 = utcTs(2026, 1, 15, 23, 59);
    assert.strictEqual(DR._daysDiff(ts2, ts), 0);
  });

  test('daysDiff helper: next day returns 1', () => {
    const ts = utcTs(2026, 1, 15, 23, 0);
    const ts2 = utcTs(2026, 1, 16, 0, 0);
    assert.strictEqual(DR._daysDiff(ts2, ts), 1);
  });

  test('daysDiff helper: 2 days apart returns 2', () => {
    const ts = utcTs(2026, 1, 10);
    const ts2 = utcTs(2026, 1, 12);
    assert.strictEqual(DR._daysDiff(ts2, ts), 2);
  });

  test('REWARD_CALENDAR entries are immutable references (not mutated by claims)', () => {
    const p = freshPlayer();
    var ts = utcTs(2026, 1, 1);
    for (var i = 0; i < 7; i++) {
      claimAt(p, ts + i * MS_PER_DAY);
    }
    // Original calendar should still have original spark values
    assert.strictEqual(DR.REWARD_CALENDAR[0].spark, 5);
    assert.strictEqual(DR.REWARD_CALENDAR[2].spark, 10);
    assert.strictEqual(DR.REWARD_CALENDAR[4].spark, 15);
    assert.strictEqual(DR.REWARD_CALENDAR[6].spark, 25);
  });

});

// =========================================================================
// FINAL REPORT
// =========================================================================

const ok = report();
process.exit(ok ? 0 : 1);
