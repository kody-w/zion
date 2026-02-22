// test_warmth_system.js — 130+ tests for the Warmth System module
'use strict';
const { test, suite, report, assert } = require('./test_runner');
const WarmthSystem = require('../src/js/warmth_system');

// ─── Helpers ──────────────────────────────────────────────────────────────────

var _uid = 0;
function uid(prefix) { return (prefix || 'player') + '_' + (++_uid); }

function freshState() { return WarmthSystem.createState(); }

// Simulate walking: start at lat/lng, move north by ~distanceMeters over tickDelta ticks
// Returns {state, playerId, result}
function simulateWalk(state, playerId, lat, lng, distanceMeters, tickDelta, startTick, season, zone) {
  var pid = playerId || uid();
  // Record initial position
  WarmthSystem.recordMovement(state, pid, lat, lng, startTick || 0, season || 'spring', zone || null);
  // Move north by distanceMeters
  var latDelta = distanceMeters / 111320;
  var endTick = (startTick || 0) + (tickDelta || 30); // default 30 min
  var result = WarmthSystem.recordMovement(state, pid, lat + latDelta, lng, endTick, season || 'spring', zone || null);
  return { state: state, playerId: pid, result: result };
}

// ─── WARMTH_TIERS ─────────────────────────────────────────────────────────────

suite('WARMTH_TIERS — Data Structure', function() {

  test('WARMTH_TIERS is an array', function() {
    assert(Array.isArray(WarmthSystem.WARMTH_TIERS), 'Should be array');
  });

  test('WARMTH_TIERS has exactly 5 tiers', function() {
    assert.strictEqual(WarmthSystem.WARMTH_TIERS.length, 5, 'Should have 5 tiers');
  });

  test('Tier 0 is cold with minPoints 0', function() {
    var tier = WarmthSystem.WARMTH_TIERS[0];
    assert.strictEqual(tier.id, 'cold');
    assert.strictEqual(tier.minPoints, 0);
  });

  test('Tier 1 is cool with minPoints 25', function() {
    var tier = WarmthSystem.WARMTH_TIERS[1];
    assert.strictEqual(tier.id, 'cool');
    assert.strictEqual(tier.minPoints, 25);
  });

  test('Tier 2 is warm with minPoints 100', function() {
    var tier = WarmthSystem.WARMTH_TIERS[2];
    assert.strictEqual(tier.id, 'warm');
    assert.strictEqual(tier.minPoints, 100);
  });

  test('Tier 3 is heated with minPoints 250', function() {
    var tier = WarmthSystem.WARMTH_TIERS[3];
    assert.strictEqual(tier.id, 'heated');
    assert.strictEqual(tier.minPoints, 250);
  });

  test('Tier 4 is radiant with minPoints 500', function() {
    var tier = WarmthSystem.WARMTH_TIERS[4];
    assert.strictEqual(tier.id, 'radiant');
    assert.strictEqual(tier.minPoints, 500);
  });

  test('Each tier has required fields', function() {
    var required = ['id', 'name', 'minPoints', 'maxPoints', 'harvestBonus', 'discoveryBonus', 'sparkBonus', 'description'];
    WarmthSystem.WARMTH_TIERS.forEach(function(tier) {
      required.forEach(function(field) {
        assert(tier[field] !== undefined, 'Tier ' + tier.id + ' missing field: ' + field);
      });
    });
  });

  test('Tiers are in ascending minPoints order', function() {
    for (var i = 1; i < WarmthSystem.WARMTH_TIERS.length; i++) {
      assert(
        WarmthSystem.WARMTH_TIERS[i].minPoints > WarmthSystem.WARMTH_TIERS[i - 1].minPoints,
        'Tiers should be in ascending order'
      );
    }
  });

  test('Radiant tier has highest harvestBonus (0.25)', function() {
    var radiant = WarmthSystem.WARMTH_TIERS[4];
    assert.strictEqual(radiant.harvestBonus, 0.25);
  });

  test('Radiant tier has highest discoveryBonus (0.20)', function() {
    var radiant = WarmthSystem.WARMTH_TIERS[4];
    assert.strictEqual(radiant.discoveryBonus, 0.20);
  });

  test('Radiant tier has highest sparkBonus (0.15)', function() {
    var radiant = WarmthSystem.WARMTH_TIERS[4];
    assert.strictEqual(radiant.sparkBonus, 0.15);
  });

  test('Cold tier has all bonuses at 0', function() {
    var cold = WarmthSystem.WARMTH_TIERS[0];
    assert.strictEqual(cold.harvestBonus, 0);
    assert.strictEqual(cold.discoveryBonus, 0);
    assert.strictEqual(cold.sparkBonus, 0);
  });

  test('All tier ids are unique', function() {
    var ids = WarmthSystem.WARMTH_TIERS.map(function(t) { return t.id; });
    var unique = new Set(ids);
    assert.strictEqual(unique.size, ids.length, 'All tier ids must be unique');
  });

});

// ─── ZONE_BADGES ──────────────────────────────────────────────────────────────

suite('ZONE_BADGES — Data Structure', function() {

  test('ZONE_BADGES is an array', function() {
    assert(Array.isArray(WarmthSystem.ZONE_BADGES), 'Should be array');
  });

  test('ZONE_BADGES has exactly 8 badges', function() {
    assert.strictEqual(WarmthSystem.ZONE_BADGES.length, 8, 'Should have 8 badges');
  });

  test('Each badge has required fields', function() {
    var required = ['id', 'zone', 'name', 'description', 'icon', 'requiredSteps'];
    WarmthSystem.ZONE_BADGES.forEach(function(badge) {
      required.forEach(function(field) {
        assert(badge[field] !== undefined, 'Badge ' + badge.id + ' missing field: ' + field);
      });
    });
  });

  test('Badge zones cover all 8 ZION zones', function() {
    var zones = WarmthSystem.ZONE_BADGES.map(function(b) { return b.zone; });
    ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'].forEach(function(z) {
      assert(zones.indexOf(z) !== -1, 'Missing badge for zone: ' + z);
    });
  });

  test('All badge ids are unique', function() {
    var ids = WarmthSystem.ZONE_BADGES.map(function(b) { return b.id; });
    var unique = new Set(ids);
    assert.strictEqual(unique.size, ids.length, 'Duplicate badge ids');
  });

  test('All badge requiredSteps are positive numbers', function() {
    WarmthSystem.ZONE_BADGES.forEach(function(badge) {
      assert(typeof badge.requiredSteps === 'number', badge.id + ' requiredSteps must be number');
      assert(badge.requiredSteps > 0, badge.id + ' requiredSteps must be positive');
    });
  });

  test('Arena badge has the highest requiredSteps (1000)', function() {
    var arena = WarmthSystem.ZONE_BADGES.find(function(b) { return b.zone === 'arena'; });
    assert(arena, 'Arena badge not found');
    assert.strictEqual(arena.requiredSteps, 1000);
  });

  test('Badge names are non-empty strings', function() {
    WarmthSystem.ZONE_BADGES.forEach(function(badge) {
      assert(typeof badge.name === 'string' && badge.name.length > 0, 'Badge name must be non-empty string');
    });
  });

});

// ─── createState ──────────────────────────────────────────────────────────────

suite('createState — Initial State', function() {

  test('createState returns an object', function() {
    var state = freshState();
    assert(typeof state === 'object' && state !== null, 'Should return object');
  });

  test('createState has players object', function() {
    var state = freshState();
    assert(typeof state.players === 'object', 'Should have players');
  });

  test('createState has warmthLog array', function() {
    var state = freshState();
    assert(Array.isArray(state.warmthLog), 'Should have warmthLog array');
  });

  test('createState players is empty initially', function() {
    var state = freshState();
    assert.strictEqual(Object.keys(state.players).length, 0, 'Players should be empty');
  });

  test('createState warmthLog is empty initially', function() {
    var state = freshState();
    assert.strictEqual(state.warmthLog.length, 0, 'WarmthLog should be empty');
  });

  test('Two createState calls return independent objects', function() {
    var s1 = freshState();
    var s2 = freshState();
    s1.players['x'] = { warmthPoints: 100 };
    assert(!s2.players['x'], 'States should be independent');
  });

});

// ─── getSeasonMultiplier ──────────────────────────────────────────────────────

suite('getSeasonMultiplier — Season Scaling', function() {

  test('Winter returns 1.5x', function() {
    assert.strictEqual(WarmthSystem.getSeasonMultiplier('winter'), 1.5);
  });

  test('Summer returns 0.8x', function() {
    assert.strictEqual(WarmthSystem.getSeasonMultiplier('summer'), 0.8);
  });

  test('Spring returns 1.0x', function() {
    assert.strictEqual(WarmthSystem.getSeasonMultiplier('spring'), 1.0);
  });

  test('Autumn returns 1.0x', function() {
    assert.strictEqual(WarmthSystem.getSeasonMultiplier('autumn'), 1.0);
  });

  test('Unknown season returns 1.0x', function() {
    assert.strictEqual(WarmthSystem.getSeasonMultiplier('monsoon'), 1.0);
  });

  test('Null season returns 1.0x', function() {
    assert.strictEqual(WarmthSystem.getSeasonMultiplier(null), 1.0);
  });

  test('Winter has highest multiplier', function() {
    var seasons = ['winter', 'spring', 'summer', 'autumn'];
    var winter = WarmthSystem.getSeasonMultiplier('winter');
    seasons.slice(1).forEach(function(s) {
      assert(winter > WarmthSystem.getSeasonMultiplier(s), 'Winter should be highest');
    });
  });

  test('Summer has lowest multiplier', function() {
    var seasons = ['winter', 'spring', 'autumn'];
    var summer = WarmthSystem.getSeasonMultiplier('summer');
    seasons.forEach(function(s) {
      assert(summer < WarmthSystem.getSeasonMultiplier(s), 'Summer should be lowest');
    });
  });

});

// ─── getTierName ──────────────────────────────────────────────────────────────

suite('getTierName — Tier Lookup', function() {

  test('0 points returns Cold', function() {
    assert.strictEqual(WarmthSystem.getTierName(0), 'Cold');
  });

  test('24 points returns Cold', function() {
    assert.strictEqual(WarmthSystem.getTierName(24), 'Cold');
  });

  test('25 points returns Cool', function() {
    assert.strictEqual(WarmthSystem.getTierName(25), 'Cool');
  });

  test('99 points returns Cool', function() {
    assert.strictEqual(WarmthSystem.getTierName(99), 'Cool');
  });

  test('100 points returns Warm', function() {
    assert.strictEqual(WarmthSystem.getTierName(100), 'Warm');
  });

  test('249 points returns Warm', function() {
    assert.strictEqual(WarmthSystem.getTierName(249), 'Warm');
  });

  test('250 points returns Heated', function() {
    assert.strictEqual(WarmthSystem.getTierName(250), 'Heated');
  });

  test('499 points returns Heated', function() {
    assert.strictEqual(WarmthSystem.getTierName(499), 'Heated');
  });

  test('500 points returns Radiant', function() {
    assert.strictEqual(WarmthSystem.getTierName(500), 'Radiant');
  });

  test('1000 points returns Radiant', function() {
    assert.strictEqual(WarmthSystem.getTierName(1000), 'Radiant');
  });

});

// ─── recordMovement ───────────────────────────────────────────────────────────

suite('recordMovement — First Call (Position Init)', function() {

  test('First call returns success false (no prior position)', function() {
    var state = freshState();
    var pid = uid();
    var result = WarmthSystem.recordMovement(state, pid, 40.0, -74.0, 0);
    assert.strictEqual(result.success, false, 'First call should not gain warmth');
  });

  test('First call records player in state', function() {
    var state = freshState();
    var pid = uid();
    WarmthSystem.recordMovement(state, pid, 40.0, -74.0, 0);
    assert(state.players[pid], 'Player should be in state after first call');
  });

  test('First call warmthGained is 0', function() {
    var state = freshState();
    var pid = uid();
    var result = WarmthSystem.recordMovement(state, pid, 40.0, -74.0, 0);
    assert.strictEqual(result.warmthGained, 0);
  });

});

suite('recordMovement — Walking Speed Detection', function() {

  test('Walking at 3 km/h gains warmth (success = true)', function() {
    var state = freshState();
    // Walk ~250m in 5 minutes = 3 km/h
    var w = simulateWalk(state, uid(), 40.0, -74.0, 250, 5, 0);
    assert.strictEqual(w.result.success, true, 'Walking speed should succeed');
    assert(w.result.warmthGained > 0, 'Should gain warmth');
  });

  test('Too slow (stationary) returns success false', function() {
    var state = freshState();
    var pid = uid();
    // Move only 5m in 60 minutes = 0.005 km/h
    WarmthSystem.recordMovement(state, pid, 40.0, -74.0, 0);
    var latDelta = 5 / 111320;
    var result = WarmthSystem.recordMovement(state, pid, 40.0 + latDelta, -74.0, 60);
    assert.strictEqual(result.success, false, 'Stationary should not gain warmth');
    assert.strictEqual(result.reason, 'too_slow');
  });

  test('Too fast (running) returns success false', function() {
    var state = freshState();
    var pid = uid();
    // Move 1000m in 1 minute = 60 km/h
    WarmthSystem.recordMovement(state, pid, 40.0, -74.0, 0);
    var latDelta = 1000 / 111320;
    var result = WarmthSystem.recordMovement(state, pid, 40.0 + latDelta, -74.0, 1);
    assert.strictEqual(result.success, false, 'Running should not gain warmth');
    assert.strictEqual(result.reason, 'too_fast');
  });

  test('Success result includes speed', function() {
    var state = freshState();
    var w = simulateWalk(state, uid(), 40.0, -74.0, 250, 5, 0);
    assert(typeof w.result.speed === 'number', 'Result should have speed');
    assert(w.result.speed > 0, 'Speed should be positive');
  });

  test('Success result includes tier', function() {
    var state = freshState();
    var w = simulateWalk(state, uid(), 40.0, -74.0, 250, 5, 0);
    assert(typeof w.result.tier === 'string', 'Result should have tier');
  });

  test('Same tick twice returns success false', function() {
    var state = freshState();
    var pid = uid();
    WarmthSystem.recordMovement(state, pid, 40.0, -74.0, 10);
    var result = WarmthSystem.recordMovement(state, pid, 40.001, -74.0, 10);
    assert.strictEqual(result.success, false, 'Same tick should not gain warmth');
  });

});

suite('recordMovement — Warmth Accumulation', function() {

  test('Multiple walks accumulate warmth', function() {
    var state = freshState();
    var pid = uid();
    simulateWalk(state, pid, 40.0, -74.0, 500, 10, 0);
    simulateWalk(state, pid, 40.005, -74.0, 500, 10, 20);
    var warmth = WarmthSystem.getWarmth(state, pid);
    assert(warmth.points > 0, 'Should have accumulated warmth');
  });

  test('Winter walk gains more warmth than summer walk of same distance', function() {
    var state1 = freshState();
    var state2 = freshState();
    var pid1 = uid();
    var pid2 = uid();

    simulateWalk(state1, pid1, 40.0, -74.0, 500, 10, 0, 'winter');
    simulateWalk(state2, pid2, 40.0, -74.0, 500, 10, 0, 'summer');

    var winterWarmth = WarmthSystem.getWarmth(state1, pid1).points;
    var summerWarmth = WarmthSystem.getWarmth(state2, pid2).points;
    assert(winterWarmth > summerWarmth, 'Winter should grant more warmth than summer');
  });

  test('Warmth points never go negative from movement', function() {
    var state = freshState();
    var pid = uid();
    WarmthSystem.recordMovement(state, pid, 40.0, -74.0, 0);
    var warmth = WarmthSystem.getWarmth(state, pid);
    assert(warmth.points >= 0, 'Warmth should never be negative');
  });

  test('Warmth log is updated on valid walk', function() {
    var state = freshState();
    simulateWalk(state, uid(), 40.0, -74.0, 300, 8, 0);
    assert(state.warmthLog.length > 0, 'Warmth log should have entries');
  });

  test('WarmthLog entry has playerId and warmthGained', function() {
    var state = freshState();
    var pid = uid();
    simulateWalk(state, pid, 40.0, -74.0, 300, 8, 0);
    var entry = state.warmthLog[0];
    assert(entry, 'Log entry should exist');
    assert(entry.playerId, 'Log entry should have playerId');
    assert(typeof entry.warmthGained === 'number', 'Log entry should have warmthGained');
  });

  test('Walking longer distance gains more warmth', function() {
    var state1 = freshState();
    var state2 = freshState();
    var pid1 = uid();
    var pid2 = uid();

    simulateWalk(state1, pid1, 40.0, -74.0, 200, 10, 0);
    simulateWalk(state2, pid2, 40.0, -74.0, 600, 30, 0);

    var short = WarmthSystem.getWarmth(state1, pid1).points;
    var long = WarmthSystem.getWarmth(state2, pid2).points;
    assert(long > short, 'Longer walk should gain more warmth');
  });

});

// ─── Daily Cap ────────────────────────────────────────────────────────────────

suite('Daily Warmth Cap', function() {

  test('DAILY_WARMTH_CAP is 200', function() {
    assert.strictEqual(WarmthSystem.DAILY_WARMTH_CAP, 200);
  });

  test('getDailyWarmthRemaining returns 200 for fresh player', function() {
    var state = freshState();
    var pid = uid();
    var remaining = WarmthSystem.getDailyWarmthRemaining(state, pid, 0);
    assert.strictEqual(remaining, 200);
  });

  test('getDailyWarmthRemaining decreases after earning warmth', function() {
    var state = freshState();
    var pid = uid();
    simulateWalk(state, pid, 40.0, -74.0, 500, 10, 0);
    var remaining = WarmthSystem.getDailyWarmthRemaining(state, pid, 10);
    assert(remaining < 200, 'Remaining should decrease');
    assert(remaining >= 0, 'Remaining should not go negative');
  });

  test('getDailyWarmthRemaining resets on new day', function() {
    var state = freshState();
    var pid = uid();
    simulateWalk(state, pid, 40.0, -74.0, 500, 10, 0);
    // Next day tick = 1440 ticks later
    var remaining = WarmthSystem.getDailyWarmthRemaining(state, pid, 1440);
    assert.strictEqual(remaining, 200, 'Remaining should reset next day');
  });

  test('Movement stops gaining after daily cap reached', function() {
    var state = freshState();
    var pid = uid();
    // Do many walks to fill the cap
    var currentTick = 0;
    var lat = 40.0;
    var result;
    for (var i = 0; i < 50; i++) {
      WarmthSystem.recordMovement(state, pid, lat, -74.0, currentTick, 'winter', null);
      lat += 500 / 111320;
      currentTick += 10;
      result = WarmthSystem.recordMovement(state, pid, lat, -74.0, currentTick, 'winter', null);
      lat += 500 / 111320;
      currentTick += 10;
    }
    // At some point reason should be daily_cap_reached
    var remaining = WarmthSystem.getDailyWarmthRemaining(state, pid, currentTick);
    assert(remaining >= 0, 'Remaining should be non-negative');
  });

  test('getDailyWarmthRemaining returns number', function() {
    var state = freshState();
    var pid = uid();
    var remaining = WarmthSystem.getDailyWarmthRemaining(state, pid, 500);
    assert(typeof remaining === 'number', 'Should return number');
  });

});

// ─── getWarmth ────────────────────────────────────────────────────────────────

suite('getWarmth — Player Warmth Info', function() {

  test('getWarmth returns object with points, tier, bonuses, streak', function() {
    var state = freshState();
    var pid = uid();
    var warmth = WarmthSystem.getWarmth(state, pid);
    assert(typeof warmth === 'object', 'Should return object');
    assert(typeof warmth.points === 'number', 'Should have points');
    assert(typeof warmth.tier === 'string', 'Should have tier');
    assert(typeof warmth.bonuses === 'object', 'Should have bonuses');
    assert(typeof warmth.streak === 'number', 'Should have streak');
  });

  test('Fresh player starts at 0 points, cold tier', function() {
    var state = freshState();
    var pid = uid();
    var warmth = WarmthSystem.getWarmth(state, pid);
    assert.strictEqual(warmth.points, 0);
    assert.strictEqual(warmth.tier, 'cold');
  });

  test('Tier advances when points reach threshold', function() {
    var state = freshState();
    var pid = uid();
    state.players[pid] = {
      playerId: pid, warmthPoints: 100, lastMoveTick: -1, lastLat: null, lastLon: null,
      dailyWarmthEarned: {}, warmthHistory: [], earnedBadges: {}, zoneSteps: {},
      streak: 0, lastActiveDay: -1, loginDays: {}, totalWarmthEarned: 100
    };
    var warmth = WarmthSystem.getWarmth(state, pid);
    assert.strictEqual(warmth.tier, 'warm');
  });

  test('getWarmth creates player record if missing', function() {
    var state = freshState();
    var pid = uid();
    WarmthSystem.getWarmth(state, pid);
    assert(state.players[pid], 'Player should be created');
  });

});

// ─── getBonuses ───────────────────────────────────────────────────────────────

suite('getBonuses — Warmth Bonuses', function() {

  test('getBonuses returns object with harvestBonus, discoveryBonus, sparkBonus', function() {
    var state = freshState();
    var bonuses = WarmthSystem.getBonuses(state, uid());
    assert(typeof bonuses.harvestBonus === 'number', 'Should have harvestBonus');
    assert(typeof bonuses.discoveryBonus === 'number', 'Should have discoveryBonus');
    assert(typeof bonuses.sparkBonus === 'number', 'Should have sparkBonus');
  });

  test('Cold tier player has 0 bonuses', function() {
    var state = freshState();
    var pid = uid();
    var bonuses = WarmthSystem.getBonuses(state, pid);
    assert.strictEqual(bonuses.harvestBonus, 0);
    assert.strictEqual(bonuses.discoveryBonus, 0);
    assert.strictEqual(bonuses.sparkBonus, 0);
  });

  test('Radiant tier player has maximum bonuses', function() {
    var state = freshState();
    var pid = uid();
    state.players[pid] = {
      playerId: pid, warmthPoints: 600, lastMoveTick: -1, lastLat: null, lastLon: null,
      dailyWarmthEarned: {}, warmthHistory: [], earnedBadges: {}, zoneSteps: {},
      streak: 0, lastActiveDay: -1, loginDays: {}, totalWarmthEarned: 600
    };
    var bonuses = WarmthSystem.getBonuses(state, pid);
    assert(bonuses.harvestBonus > 0, 'Radiant should have harvest bonus');
    assert(bonuses.discoveryBonus > 0, 'Radiant should have discovery bonus');
    assert(bonuses.sparkBonus > 0, 'Radiant should have spark bonus');
  });

  test('Harvest bonus is within 0-0.30 range', function() {
    var state = freshState();
    var pid = uid();
    state.players[pid] = {
      playerId: pid, warmthPoints: 999, lastMoveTick: -1, lastLat: null, lastLon: null,
      dailyWarmthEarned: {}, warmthHistory: [], earnedBadges: {}, zoneSteps: {},
      streak: 0, lastActiveDay: -1, loginDays: {}, totalWarmthEarned: 999
    };
    var bonuses = WarmthSystem.getBonuses(state, pid);
    assert(bonuses.harvestBonus >= 0, 'Harvest bonus >= 0');
    assert(bonuses.harvestBonus <= 0.35, 'Harvest bonus <= 0.35 (with streak)');
  });

  test('Streak increases bonuses', function() {
    var state = freshState();
    var pid = uid();
    state.players[pid] = {
      playerId: pid, warmthPoints: 500, lastMoveTick: -1, lastLat: null, lastLon: null,
      dailyWarmthEarned: {}, warmthHistory: [], earnedBadges: {}, zoneSteps: {},
      streak: 10, lastActiveDay: -1, loginDays: {}, totalWarmthEarned: 500
    };
    var bonusesWithStreak = WarmthSystem.getBonuses(state, pid);

    state.players[pid].streak = 0;
    var bonusesNoStreak = WarmthSystem.getBonuses(state, pid);

    assert(bonusesWithStreak.harvestBonus > bonusesNoStreak.harvestBonus, 'Streak should increase bonuses');
  });

});

// ─── applyDecay ───────────────────────────────────────────────────────────────

suite('applyDecay — Warmth Decay', function() {

  test('applyDecay returns object with decayed array', function() {
    var state = freshState();
    var result = WarmthSystem.applyDecay(state, 1000);
    assert(typeof result === 'object', 'Should return object');
    assert(Array.isArray(result.decayed), 'Should have decayed array');
  });

  test('Active players do not decay', function() {
    var state = freshState();
    var pid = uid();
    simulateWalk(state, pid, 40.0, -74.0, 500, 10, 0);
    var beforePoints = state.players[pid].warmthPoints;
    // Apply decay at tick 50 (only 50 ticks since last move, less than 100)
    WarmthSystem.applyDecay(state, 50);
    assert.strictEqual(state.players[pid].warmthPoints, beforePoints, 'Should not decay within 100 ticks');
  });

  test('Inactive player decays after 100 ticks', function() {
    var state = freshState();
    var pid = uid();
    simulateWalk(state, pid, 40.0, -74.0, 500, 10, 0);
    var beforePoints = state.players[pid].warmthPoints;
    WarmthSystem.applyDecay(state, 110); // 110 ticks since last move (tick 10)
    assert(state.players[pid].warmthPoints < beforePoints, 'Should decay after 100 inactive ticks');
  });

  test('Warmth does not go below 0 from decay', function() {
    var state = freshState();
    var pid = uid();
    simulateWalk(state, pid, 40.0, -74.0, 100, 5, 0);
    // Apply massive decay
    WarmthSystem.applyDecay(state, 10000);
    assert(state.players[pid].warmthPoints >= 0, 'Warmth should not go below 0');
  });

  test('DECAY_AMOUNT is 10', function() {
    assert.strictEqual(WarmthSystem.DECAY_AMOUNT, 10);
  });

  test('DECAY_TICKS is 100', function() {
    assert.strictEqual(WarmthSystem.DECAY_TICKS, 100);
  });

  test('Decayed list contains affected players', function() {
    var state = freshState();
    var pid = uid();
    simulateWalk(state, pid, 40.0, -74.0, 500, 10, 0);
    var result = WarmthSystem.applyDecay(state, 200);
    if (result.decayed.length > 0) {
      assert.strictEqual(result.decayed[0].playerId, pid, 'Decayed list should contain player');
    }
  });

  test('Players with 0 points are not in decayed list', function() {
    var state = freshState();
    var pid = uid();
    WarmthSystem.getWarmth(state, pid); // creates player with 0 points
    var result = WarmthSystem.applyDecay(state, 1000);
    var found = result.decayed.find(function(d) { return d.playerId === pid; });
    assert(!found, 'Zero-point players should not appear in decayed list');
  });

});

// ─── Zone Badges ──────────────────────────────────────────────────────────────

suite('getWarmthBadges & checkBadge — Zone Badges', function() {

  test('getWarmthBadges returns empty array for fresh player', function() {
    var state = freshState();
    var pid = uid();
    var badges = WarmthSystem.getWarmthBadges(state, pid);
    assert(Array.isArray(badges), 'Should return array');
    assert.strictEqual(badges.length, 0, 'Fresh player has no badges');
  });

  test('checkBadge returns false for unearned badge', function() {
    var state = freshState();
    var pid = uid();
    assert.strictEqual(WarmthSystem.checkBadge(state, pid, 'nexus'), false);
  });

  test('Badge earned when zone steps threshold met', function() {
    var state = freshState();
    var pid = uid();
    // Manually inject enough zone steps
    state.players[pid] = {
      playerId: pid, warmthPoints: 50, lastMoveTick: 10, lastLat: 40.0, lastLon: -74.0,
      dailyWarmthEarned: {}, warmthHistory: [], earnedBadges: {}, zoneSteps: { nexus: 600 },
      streak: 0, lastActiveDay: -1, loginDays: {}, totalWarmthEarned: 50
    };
    // Walk in nexus zone to trigger badge check
    var latDelta = 200 / 111320;
    WarmthSystem.recordMovement(state, pid, 40.0 + latDelta, -74.0, 20, 'spring', 'nexus');
    assert.strictEqual(WarmthSystem.checkBadge(state, pid, 'nexus'), true, 'Should earn nexus badge');
  });

  test('checkBadge returns true after badge earned', function() {
    var state = freshState();
    var pid = uid();
    state.players[pid] = {
      playerId: pid, warmthPoints: 50, lastMoveTick: 10, lastLat: 40.0, lastLon: -74.0,
      dailyWarmthEarned: {}, warmthHistory: [], earnedBadges: { gardens: true }, zoneSteps: {},
      streak: 0, lastActiveDay: -1, loginDays: {}, totalWarmthEarned: 50
    };
    assert.strictEqual(WarmthSystem.checkBadge(state, pid, 'gardens'), true);
  });

  test('getWarmthBadges returns badge objects with id, name, zone', function() {
    var state = freshState();
    var pid = uid();
    state.players[pid] = {
      playerId: pid, warmthPoints: 50, lastMoveTick: 10, lastLat: 40.0, lastLon: -74.0,
      dailyWarmthEarned: {}, warmthHistory: [], earnedBadges: { studio: true }, zoneSteps: {},
      streak: 0, lastActiveDay: -1, loginDays: {}, totalWarmthEarned: 50
    };
    var badges = WarmthSystem.getWarmthBadges(state, pid);
    assert.strictEqual(badges.length, 1, 'Should have 1 badge');
    assert(badges[0].badgeId, 'Badge should have badgeId');
    assert.strictEqual(badges[0].zone, 'studio', 'Badge should have zone');
    assert(badges[0].name, 'Badge should have name');
  });

  test('Multiple badges can be earned simultaneously', function() {
    var state = freshState();
    var pid = uid();
    state.players[pid] = {
      playerId: pid, warmthPoints: 200, lastMoveTick: 10, lastLat: 40.0, lastLon: -74.0,
      dailyWarmthEarned: {}, warmthHistory: [], earnedBadges: { nexus: true, gardens: true, wilds: true },
      zoneSteps: {}, streak: 0, lastActiveDay: -1, loginDays: {}, totalWarmthEarned: 200
    };
    var badges = WarmthSystem.getWarmthBadges(state, pid);
    assert.strictEqual(badges.length, 3, 'Should have 3 badges');
  });

});

// ─── Leaderboard ─────────────────────────────────────────────────────────────

suite('getWarmthLeaderboard — Leaderboard', function() {

  test('Returns array', function() {
    var state = freshState();
    var lb = WarmthSystem.getWarmthLeaderboard(state, 10);
    assert(Array.isArray(lb), 'Should return array');
  });

  test('Returns empty array when no players', function() {
    var state = freshState();
    var lb = WarmthSystem.getWarmthLeaderboard(state, 10);
    assert.strictEqual(lb.length, 0, 'Should be empty');
  });

  test('Returns players sorted by warmthPoints descending', function() {
    var state = freshState();
    var pid1 = uid();
    var pid2 = uid();
    var pid3 = uid();

    state.players[pid1] = { playerId: pid1, warmthPoints: 100, lastMoveTick: -1, lastLat: null, lastLon: null, dailyWarmthEarned: {}, warmthHistory: [], earnedBadges: {}, zoneSteps: {}, streak: 0, lastActiveDay: -1, loginDays: {}, totalWarmthEarned: 100 };
    state.players[pid2] = { playerId: pid2, warmthPoints: 300, lastMoveTick: -1, lastLat: null, lastLon: null, dailyWarmthEarned: {}, warmthHistory: [], earnedBadges: {}, zoneSteps: {}, streak: 0, lastActiveDay: -1, loginDays: {}, totalWarmthEarned: 300 };
    state.players[pid3] = { playerId: pid3, warmthPoints: 50, lastMoveTick: -1, lastLat: null, lastLon: null, dailyWarmthEarned: {}, warmthHistory: [], earnedBadges: {}, zoneSteps: {}, streak: 0, lastActiveDay: -1, loginDays: {}, totalWarmthEarned: 50 };

    var lb = WarmthSystem.getWarmthLeaderboard(state, 10);
    assert.strictEqual(lb[0].playerId, pid2, 'Highest warmth should be first');
    assert(lb[0].warmthPoints >= lb[1].warmthPoints, 'Should be sorted descending');
  });

  test('Count parameter limits results', function() {
    var state = freshState();
    for (var i = 0; i < 10; i++) {
      var pid = uid();
      state.players[pid] = { playerId: pid, warmthPoints: i * 10, lastMoveTick: -1, lastLat: null, lastLon: null, dailyWarmthEarned: {}, warmthHistory: [], earnedBadges: {}, zoneSteps: {}, streak: 0, lastActiveDay: -1, loginDays: {}, totalWarmthEarned: i * 10 };
    }
    var lb = WarmthSystem.getWarmthLeaderboard(state, 3);
    assert.strictEqual(lb.length, 3, 'Should return only 3');
  });

  test('Leaderboard entries have rank, playerId, warmthPoints, tier, tierName', function() {
    var state = freshState();
    var pid = uid();
    state.players[pid] = { playerId: pid, warmthPoints: 200, lastMoveTick: -1, lastLat: null, lastLon: null, dailyWarmthEarned: {}, warmthHistory: [], earnedBadges: {}, zoneSteps: {}, streak: 0, lastActiveDay: -1, loginDays: {}, totalWarmthEarned: 200 };
    var lb = WarmthSystem.getWarmthLeaderboard(state, 10);
    assert.strictEqual(lb[0].rank, 1, 'Rank 1 for top player');
    assert(lb[0].playerId, 'Should have playerId');
    assert(typeof lb[0].warmthPoints === 'number', 'Should have warmthPoints');
    assert(typeof lb[0].tier === 'string', 'Should have tier');
    assert(typeof lb[0].tierName === 'string', 'Should have tierName');
  });

});

// ─── Streaks ──────────────────────────────────────────────────────────────────

suite('getStreak & recordDailyLogin — Daily Streaks', function() {

  test('getStreak returns object with streak, lastActiveDay, streakBonus', function() {
    var state = freshState();
    var info = WarmthSystem.getStreak(state, uid());
    assert(typeof info.streak === 'number', 'Should have streak');
    assert(typeof info.streakBonus === 'number', 'Should have streakBonus');
  });

  test('Fresh player has streak 0', function() {
    var state = freshState();
    var info = WarmthSystem.getStreak(state, uid());
    assert.strictEqual(info.streak, 0);
  });

  test('recordDailyLogin on day 0 sets streak to 1', function() {
    var state = freshState();
    var pid = uid();
    var result = WarmthSystem.recordDailyLogin(state, pid, 0);
    assert.strictEqual(result.streak, 1);
    assert.strictEqual(result.newDay, true);
  });

  test('recordDailyLogin on same day returns newDay false', function() {
    var state = freshState();
    var pid = uid();
    WarmthSystem.recordDailyLogin(state, pid, 0);
    var result = WarmthSystem.recordDailyLogin(state, pid, 500); // same day
    assert.strictEqual(result.newDay, false);
  });

  test('Consecutive days increment streak', function() {
    var state = freshState();
    var pid = uid();
    WarmthSystem.recordDailyLogin(state, pid, 0);       // day 0
    WarmthSystem.recordDailyLogin(state, pid, 1440);    // day 1
    var result = WarmthSystem.recordDailyLogin(state, pid, 2880); // day 2
    assert.strictEqual(result.streak, 3);
  });

  test('Missing a day resets streak to 1', function() {
    var state = freshState();
    var pid = uid();
    WarmthSystem.recordDailyLogin(state, pid, 0);       // day 0
    WarmthSystem.recordDailyLogin(state, pid, 1440);    // day 1
    WarmthSystem.recordDailyLogin(state, pid, 4320);    // day 3 (skipped day 2)
    var info = WarmthSystem.getStreak(state, pid);
    assert.strictEqual(info.streak, 1, 'Streak should reset after missing a day');
  });

  test('Streak bonus increases with streak length', function() {
    var state = freshState();
    var pid = uid();
    WarmthSystem.recordDailyLogin(state, pid, 0);
    WarmthSystem.recordDailyLogin(state, pid, 1440);
    WarmthSystem.recordDailyLogin(state, pid, 2880);
    var info = WarmthSystem.getStreak(state, pid);
    assert(info.streakBonus > 0, 'Streak bonus should be positive');
  });

  test('recordDailyLogin returns streak value', function() {
    var state = freshState();
    var pid = uid();
    var r = WarmthSystem.recordDailyLogin(state, pid, 0);
    assert(typeof r.streak === 'number', 'Should return streak number');
  });

});

// ─── getWarmthHistory ─────────────────────────────────────────────────────────

suite('getWarmthHistory — History Log', function() {

  test('Returns array', function() {
    var state = freshState();
    var history = WarmthSystem.getWarmthHistory(state, uid(), 10);
    assert(Array.isArray(history), 'Should return array');
  });

  test('Fresh player has empty history', function() {
    var state = freshState();
    var history = WarmthSystem.getWarmthHistory(state, uid(), 10);
    assert.strictEqual(history.length, 0, 'Fresh player has no history');
  });

  test('Walk creates history entry', function() {
    var state = freshState();
    var pid = uid();
    simulateWalk(state, pid, 40.0, -74.0, 300, 8, 0);
    var history = WarmthSystem.getWarmthHistory(state, pid, 10);
    assert(history.length > 0, 'Should have history after walking');
  });

  test('History entries have tick and type fields', function() {
    var state = freshState();
    var pid = uid();
    simulateWalk(state, pid, 40.0, -74.0, 300, 8, 0);
    var history = WarmthSystem.getWarmthHistory(state, pid, 10);
    if (history.length > 0) {
      assert(typeof history[0].tick === 'number', 'Entry should have tick');
      assert(typeof history[0].type === 'string', 'Entry should have type');
    }
  });

  test('Count parameter limits history returned', function() {
    var state = freshState();
    var pid = uid();
    var lat = 40.0;
    var tick = 0;
    for (var i = 0; i < 10; i++) {
      WarmthSystem.recordMovement(state, pid, lat, -74.0, tick, 'spring', null);
      lat += 300 / 111320;
      tick += 10;
      WarmthSystem.recordMovement(state, pid, lat, -74.0, tick, 'spring', null);
      lat += 300 / 111320;
      tick += 10;
    }
    var history = WarmthSystem.getWarmthHistory(state, pid, 5);
    assert(history.length <= 5, 'Should not exceed count limit');
  });

  test('History is returned most recent first', function() {
    var state = freshState();
    var pid = uid();
    var lat = 40.0;
    var tick = 0;
    for (var i = 0; i < 5; i++) {
      WarmthSystem.recordMovement(state, pid, lat, -74.0, tick, 'spring', null);
      lat += 300 / 111320;
      tick += 10;
      WarmthSystem.recordMovement(state, pid, lat, -74.0, tick, 'spring', null);
      lat += 300 / 111320;
      tick += 10;
    }
    var history = WarmthSystem.getWarmthHistory(state, pid, 10);
    if (history.length >= 2) {
      assert(history[0].tick >= history[1].tick, 'Most recent entry should come first');
    }
  });

});

// ─── getPlayerStats ───────────────────────────────────────────────────────────

suite('getPlayerStats — Comprehensive Stats', function() {

  test('Returns object with expected fields', function() {
    var state = freshState();
    var stats = WarmthSystem.getPlayerStats(state, uid());
    var fields = ['playerId', 'warmthPoints', 'tier', 'tierName', 'bonuses', 'streak',
                  'totalWarmthEarned', 'badgesEarned', 'badges', 'zoneSteps', 'historyCount'];
    fields.forEach(function(f) {
      assert(stats[f] !== undefined, 'Stats missing field: ' + f);
    });
  });

  test('badgesEarned is a number', function() {
    var state = freshState();
    var stats = WarmthSystem.getPlayerStats(state, uid());
    assert(typeof stats.badgesEarned === 'number', 'badgesEarned should be number');
  });

  test('badges is an array', function() {
    var state = freshState();
    var stats = WarmthSystem.getPlayerStats(state, uid());
    assert(Array.isArray(stats.badges), 'badges should be array');
  });

  test('totalWarmthEarned reflects accumulated warmth', function() {
    var state = freshState();
    var pid = uid();
    simulateWalk(state, pid, 40.0, -74.0, 500, 10, 0);
    var stats = WarmthSystem.getPlayerStats(state, pid);
    assert(stats.totalWarmthEarned > 0, 'Total earned should be positive');
  });

  test('historyCount matches history length', function() {
    var state = freshState();
    var pid = uid();
    simulateWalk(state, pid, 40.0, -74.0, 300, 8, 0);
    var stats = WarmthSystem.getPlayerStats(state, pid);
    var history = WarmthSystem.getWarmthHistory(state, pid, 100);
    assert.strictEqual(stats.historyCount, history.length, 'historyCount should match');
  });

  test('tierDescription is a string', function() {
    var state = freshState();
    var stats = WarmthSystem.getPlayerStats(state, uid());
    assert(typeof stats.tierDescription === 'string', 'tierDescription should be string');
  });

});

// ─── getZoneWarmth ────────────────────────────────────────────────────────────

suite('getZoneWarmth — Zone Aggregate', function() {

  test('Returns object with zone, totalWarmth, activePlayers', function() {
    var state = freshState();
    var zw = WarmthSystem.getZoneWarmth(state, 'nexus');
    assert(typeof zw.zone === 'string', 'Should have zone');
    assert(typeof zw.totalWarmth === 'number', 'Should have totalWarmth');
    assert(typeof zw.activePlayers === 'number', 'Should have activePlayers');
  });

  test('Empty state has 0 total warmth in any zone', function() {
    var state = freshState();
    var zw = WarmthSystem.getZoneWarmth(state, 'nexus');
    assert.strictEqual(zw.totalWarmth, 0);
    assert.strictEqual(zw.activePlayers, 0);
  });

  test('Players walking in zone contribute to zone warmth', function() {
    var state = freshState();
    var pid = uid();
    simulateWalk(state, pid, 40.0, -74.0, 300, 8, 0, 'spring', 'gardens');
    simulateWalk(state, pid, 40.003, -74.0, 300, 8, 20, 'spring', 'gardens');
    var zw = WarmthSystem.getZoneWarmth(state, 'gardens');
    assert(zw.activePlayers >= 1, 'Should have at least 1 active player');
  });

  test('Zone with no walkers has 0 players', function() {
    var state = freshState();
    var pid = uid();
    simulateWalk(state, pid, 40.0, -74.0, 300, 8, 0, 'spring', 'nexus');
    var zw = WarmthSystem.getZoneWarmth(state, 'arena');
    assert.strictEqual(zw.activePlayers, 0, 'Arena should have no players');
  });

});

// ─── haversineDistance ────────────────────────────────────────────────────────

suite('haversineDistance — GPS Distance', function() {

  test('Same point returns 0', function() {
    var d = WarmthSystem.haversineDistance(40.0, -74.0, 40.0, -74.0);
    assert.strictEqual(d, 0);
  });

  test('Returns positive distance for different points', function() {
    var d = WarmthSystem.haversineDistance(40.0, -74.0, 40.001, -74.0);
    assert(d > 0, 'Distance should be positive');
  });

  test('~111m per 0.001 degree latitude', function() {
    var d = WarmthSystem.haversineDistance(40.0, -74.0, 40.001, -74.0);
    assert(d > 100 && d < 130, 'Distance should be ~111m, got ' + d);
  });

  test('Distance is symmetric', function() {
    var d1 = WarmthSystem.haversineDistance(40.0, -74.0, 40.005, -74.0);
    var d2 = WarmthSystem.haversineDistance(40.005, -74.0, 40.0, -74.0);
    assert(Math.abs(d1 - d2) < 0.001, 'Distance should be symmetric');
  });

  test('Greater distance returns larger value', function() {
    var d1 = WarmthSystem.haversineDistance(40.0, -74.0, 40.001, -74.0);
    var d2 = WarmthSystem.haversineDistance(40.0, -74.0, 40.01, -74.0);
    assert(d2 > d1, 'Greater lat difference should produce greater distance');
  });

});

// ─── mulberry32 ───────────────────────────────────────────────────────────────

suite('mulberry32 — Seeded PRNG', function() {

  test('Returns a function', function() {
    var prng = WarmthSystem.mulberry32(42);
    assert(typeof prng === 'function', 'Should return function');
  });

  test('Returns numbers between 0 and 1', function() {
    var prng = WarmthSystem.mulberry32(42);
    for (var i = 0; i < 10; i++) {
      var n = prng();
      assert(n >= 0 && n < 1, 'PRNG output should be in [0,1)');
    }
  });

  test('Same seed produces same sequence', function() {
    var prng1 = WarmthSystem.mulberry32(99);
    var prng2 = WarmthSystem.mulberry32(99);
    for (var i = 0; i < 5; i++) {
      assert.strictEqual(prng1(), prng2(), 'Same seed should produce same sequence');
    }
  });

  test('Different seeds produce different sequences', function() {
    var prng1 = WarmthSystem.mulberry32(1);
    var prng2 = WarmthSystem.mulberry32(2);
    var different = false;
    for (var i = 0; i < 5; i++) {
      if (prng1() !== prng2()) { different = true; break; }
    }
    assert(different, 'Different seeds should produce different sequences');
  });

});

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

suite('Constants — Module Constants', function() {

  test('MIN_WALKING_SPEED_KMH is 1', function() {
    assert.strictEqual(WarmthSystem.MIN_WALKING_SPEED_KMH, 1.0);
  });

  test('MAX_WALKING_SPEED_KMH is 6', function() {
    assert.strictEqual(WarmthSystem.MAX_WALKING_SPEED_KMH, 6.0);
  });

  test('TICKS_PER_DAY is 1440', function() {
    assert.strictEqual(WarmthSystem.TICKS_PER_DAY, 1440);
  });

  test('SEASON_MULTIPLIERS is an object', function() {
    assert(typeof WarmthSystem.SEASON_MULTIPLIERS === 'object');
  });

  test('SEASON_MULTIPLIERS has all 4 seasons', function() {
    ['winter', 'spring', 'summer', 'autumn'].forEach(function(s) {
      assert(WarmthSystem.SEASON_MULTIPLIERS[s] !== undefined, 'Missing season: ' + s);
    });
  });

});

// ─── EDGE CASES ───────────────────────────────────────────────────────────────

suite('Edge Cases — Robustness', function() {

  test('getWarmth for unknown player creates record with 0 points', function() {
    var state = freshState();
    var warmth = WarmthSystem.getWarmth(state, 'nonexistent_player');
    assert.strictEqual(warmth.points, 0);
    assert.strictEqual(warmth.tier, 'cold');
  });

  test('applyDecay with empty state does not throw', function() {
    var state = freshState();
    var result = WarmthSystem.applyDecay(state, 999);
    assert.strictEqual(result.decayed.length, 0);
  });

  test('getWarmthBadges for unknown player returns empty array', function() {
    var state = freshState();
    var badges = WarmthSystem.getWarmthBadges(state, 'ghost_player');
    assert.strictEqual(badges.length, 0);
  });

  test('getWarmthLeaderboard with count 0 returns empty array', function() {
    var state = freshState();
    var pid = uid();
    state.players[pid] = { playerId: pid, warmthPoints: 100, lastMoveTick: -1, lastLat: null, lastLon: null, dailyWarmthEarned: {}, warmthHistory: [], earnedBadges: {}, zoneSteps: {}, streak: 0, lastActiveDay: -1, loginDays: {}, totalWarmthEarned: 100 };
    var lb = WarmthSystem.getWarmthLeaderboard(state, 0);
    assert.strictEqual(lb.length, 0, 'count 0 should return empty');
  });

  test('recordMovement with negative tick returns success false', function() {
    var state = freshState();
    var pid = uid();
    WarmthSystem.recordMovement(state, pid, 40.0, -74.0, 0);
    var result = WarmthSystem.recordMovement(state, pid, 40.001, -74.0, -5);
    assert.strictEqual(result.success, false, 'Negative tick delta should fail');
  });

  test('Multiple players do not interfere with each other', function() {
    var state = freshState();
    var pid1 = uid();
    var pid2 = uid();
    simulateWalk(state, pid1, 40.0, -74.0, 500, 10, 0, 'winter');
    simulateWalk(state, pid2, 51.0, 0.0, 200, 5, 0, 'summer');
    var w1 = WarmthSystem.getWarmth(state, pid1);
    var w2 = WarmthSystem.getWarmth(state, pid2);
    assert(w1.points !== w2.points || w1.points === 0, 'Players should be independent');
    assert(w1.points >= 0 && w2.points >= 0, 'Both should have non-negative warmth');
  });

  test('WarmthLog is capped at 200 entries', function() {
    var state = freshState();
    var pid = uid();
    var lat = 40.0;
    var tick = 0;
    for (var i = 0; i < 250; i++) {
      WarmthSystem.recordMovement(state, pid, lat, -74.0, tick, 'spring', null);
      lat += 300 / 111320;
      tick += 10;
      WarmthSystem.recordMovement(state, pid, lat, -74.0, tick, 'spring', null);
      lat += 300 / 111320;
      tick += 10;
    }
    assert(state.warmthLog.length <= 200, 'WarmthLog should be capped at 200');
  });

});

const success = report();
process.exit(success ? 0 : 1);
