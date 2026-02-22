/**
 * tests/test_prestige.js
 * Comprehensive tests for the Prestige / Ascension system
 * 120+ tests covering all exported functions and edge cases
 */

const { test, suite, report, assert } = require('./test_runner');
const Prestige = require('../src/js/prestige');

// ============================================================================
// HELPERS
// ============================================================================

function makeState(level) {
  var s = Prestige.createPrestigeState();
  // manually set level for testing tier queries
  s.level = level || 0;
  s.totalAscensions = level || 0;
  return s;
}

// Build a max-ready player
function maxPlayer(sparkOverride) {
  return {
    level: 50,
    xp: 99999,
    skillPoints: 25,
    skillTree: { crafting: 5, gathering: 3 },
    spark: (sparkOverride !== undefined) ? sparkOverride : 1000
  };
}

// Perform one ascension on a fresh state
function doAscend(prestigeLevel) {
  var state = Prestige.createPrestigeState();
  state.level = prestigeLevel - 1;
  state.totalAscensions = prestigeLevel - 1;
  // copy existing cosmetics/perks from previous levels
  for (var l = 1; l < prestigeLevel; l++) {
    var r = Prestige.PRESTIGE_REWARDS[l];
    if (!r) continue;
    for (var ci = 0; ci < r.cosmetics.length; ci++) {
      if (state.cosmetics.indexOf(r.cosmetics[ci]) === -1) state.cosmetics.push(r.cosmetics[ci]);
    }
    for (var pi = 0; pi < r.perks.length; pi++) {
      if (state.perks.indexOf(r.perks[pi]) === -1) state.perks.push(r.perks[pi]);
    }
  }
  var player = maxPlayer();
  Prestige.ascend(state, player);
  return { state: state, player: player };
}

// ============================================================================
// SUITE 1 — Module Shape
// ============================================================================
suite('Module Shape', function() {

  test('PRESTIGE_TIERS is exported and is an array', function() {
    assert(Array.isArray(Prestige.PRESTIGE_TIERS), 'PRESTIGE_TIERS must be an array');
  });

  test('PRESTIGE_TIERS has exactly 7 entries', function() {
    assert(Prestige.PRESTIGE_TIERS.length === 7, 'Expected 7 tiers, got ' + Prestige.PRESTIGE_TIERS.length);
  });

  test('PRESTIGE_REWARDS is exported and is an object', function() {
    assert(typeof Prestige.PRESTIGE_REWARDS === 'object' && Prestige.PRESTIGE_REWARDS !== null);
  });

  test('PRESTIGE_REWARDS has entries for levels 1–6', function() {
    for (var i = 1; i <= 6; i++) {
      assert(Prestige.PRESTIGE_REWARDS[i] !== undefined, 'Missing rewards for level ' + i);
    }
  });

  test('constants are exported with correct values', function() {
    assert(Prestige.ASCENSION_REQUIRED_LEVEL  === 50,  'ASCENSION_REQUIRED_LEVEL must be 50');
    assert(Prestige.ASCENSION_REQUIRED_QUESTS === 10,  'ASCENSION_REQUIRED_QUESTS must be 10');
    assert(Prestige.ASCENSION_REQUIRED_ZONES  === 8,   'ASCENSION_REQUIRED_ZONES must be 8');
    assert(Prestige.ASCENSION_SPARK_COST      === 500, 'ASCENSION_SPARK_COST must be 500');
    assert(Prestige.MAX_PRESTIGE_LEVEL        === 6,   'MAX_PRESTIGE_LEVEL must be 6');
  });

  test('all core functions are exported', function() {
    var fns = [
      'createPrestigeState', 'canAscend', 'ascend',
      'getPrestigeTier', 'getPrestigeRewards', 'getAllUnlockedRewards',
      'getSparkBonus', 'getPrestigeTitle', 'getPrestigeColor', 'getPrestigeBadge',
      'getAscensionHistory', 'getTotalPlaythroughs',
      'hasCosmetic', 'hasPerk', 'getActivePerks', 'applyPrestigeBonus',
      'formatPrestigeCard', 'formatAscensionRequirements', 'formatPrestigeBadge',
      'getLeaderboardEntry'
    ];
    for (var i = 0; i < fns.length; i++) {
      assert(typeof Prestige[fns[i]] === 'function', fns[i] + ' must be a function');
    }
  });

});

// ============================================================================
// SUITE 2 — Tier Data Completeness
// ============================================================================
suite('Tier Data Completeness', function() {

  test('level 0 tier is Citizen with no title', function() {
    var t = Prestige.PRESTIGE_TIERS[0];
    assert(t.name === 'Citizen', 'Level 0 should be Citizen');
    assert(t.title === '', 'Level 0 title should be empty');
    assert(t.sparkBonus === 0, 'Level 0 sparkBonus should be 0');
  });

  test('each tier has required fields: level, name, color, sparkBonus, title', function() {
    var required = ['level', 'name', 'color', 'sparkBonus', 'title'];
    Prestige.PRESTIGE_TIERS.forEach(function(tier, idx) {
      required.forEach(function(field) {
        assert(tier[field] !== undefined, 'Tier ' + idx + ' missing field: ' + field);
      });
    });
  });

  test('tier levels match their array index', function() {
    Prestige.PRESTIGE_TIERS.forEach(function(tier, idx) {
      assert(tier.level === idx, 'Tier at index ' + idx + ' should have level ' + idx + ', got ' + tier.level);
    });
  });

  test('tier sparkBonus increases monotonically', function() {
    for (var i = 1; i < Prestige.PRESTIGE_TIERS.length; i++) {
      assert(
        Prestige.PRESTIGE_TIERS[i].sparkBonus > Prestige.PRESTIGE_TIERS[i - 1].sparkBonus,
        'sparkBonus at level ' + i + ' should exceed level ' + (i - 1)
      );
    }
  });

  test('tier colors are valid hex strings', function() {
    Prestige.PRESTIGE_TIERS.forEach(function(tier, idx) {
      assert(/^#[0-9A-Fa-f]{3,6}$/.test(tier.color), 'Tier ' + idx + ' color invalid: ' + tier.color);
    });
  });

  test('level 6 tier is Eternal with 30% spark bonus', function() {
    var t = Prestige.PRESTIGE_TIERS[6];
    assert(t.name === 'Eternal', 'Level 6 should be Eternal');
    assert(Math.abs(t.sparkBonus - 0.30) < 0.001, 'Level 6 sparkBonus should be 0.30');
  });

  test('all non-zero tier titles are non-empty strings', function() {
    Prestige.PRESTIGE_TIERS.forEach(function(tier, idx) {
      if (idx > 0) {
        assert(typeof tier.title === 'string' && tier.title.length > 0,
          'Tier ' + idx + ' should have a non-empty title');
      }
    });
  });

});

// ============================================================================
// SUITE 3 — Rewards Data Completeness
// ============================================================================
suite('Rewards Data Completeness', function() {

  test('each reward level has cosmetics array', function() {
    for (var i = 1; i <= 6; i++) {
      var r = Prestige.PRESTIGE_REWARDS[i];
      assert(Array.isArray(r.cosmetics), 'Level ' + i + ' rewards.cosmetics should be an array');
      assert(r.cosmetics.length > 0, 'Level ' + i + ' rewards.cosmetics should not be empty');
    }
  });

  test('each reward level has perks array', function() {
    for (var i = 1; i <= 6; i++) {
      var r = Prestige.PRESTIGE_REWARDS[i];
      assert(Array.isArray(r.perks), 'Level ' + i + ' rewards.perks should be an array');
      assert(r.perks.length > 0, 'Level ' + i + ' rewards.perks should not be empty');
    }
  });

  test('each reward level has a title string', function() {
    for (var i = 1; i <= 6; i++) {
      var r = Prestige.PRESTIGE_REWARDS[i];
      assert(typeof r.title === 'string' && r.title.length > 0,
        'Level ' + i + ' rewards.title should be a non-empty string');
    }
  });

  test('level 1 cosmetics include golden_aura', function() {
    assert(Prestige.PRESTIGE_REWARDS[1].cosmetics.indexOf('golden_aura') !== -1);
  });

  test('level 6 cosmetics include eternal_flames and cosmic_aura', function() {
    var c = Prestige.PRESTIGE_REWARDS[6].cosmetics;
    assert(c.indexOf('eternal_flames') !== -1, 'Missing eternal_flames');
    assert(c.indexOf('cosmic_aura')    !== -1, 'Missing cosmic_aura');
  });

  test('level 6 perks include triple_daily_rewards and instant_travel', function() {
    var p = Prestige.PRESTIGE_REWARDS[6].perks;
    assert(p.indexOf('triple_daily_rewards') !== -1, 'Missing triple_daily_rewards');
    assert(p.indexOf('instant_travel')       !== -1, 'Missing instant_travel');
  });

  test('cosmetic counts grow with level (level 5 > level 1)', function() {
    var c1 = Prestige.PRESTIGE_REWARDS[1].cosmetics.length;
    var c5 = Prestige.PRESTIGE_REWARDS[5].cosmetics.length;
    assert(c5 > c1, 'Level 5 should have more cosmetics than level 1');
  });

  test('PERK_DESCRIPTIONS is exported and covers all perk ids', function() {
    assert(typeof Prestige.PERK_DESCRIPTIONS === 'object');
    for (var i = 1; i <= 6; i++) {
      var perks = Prestige.PRESTIGE_REWARDS[i].perks;
      perks.forEach(function(perkId) {
        assert(Prestige.PERK_DESCRIPTIONS[perkId] !== undefined,
          'PERK_DESCRIPTIONS missing entry for: ' + perkId);
      });
    }
  });

});

// ============================================================================
// SUITE 4 — createPrestigeState
// ============================================================================
suite('createPrestigeState', function() {

  test('returns an object with level 0', function() {
    var s = Prestige.createPrestigeState();
    assert(s.level === 0, 'Initial level should be 0');
  });

  test('returns totalAscensions 0', function() {
    var s = Prestige.createPrestigeState();
    assert(s.totalAscensions === 0);
  });

  test('returns empty history array', function() {
    var s = Prestige.createPrestigeState();
    assert(Array.isArray(s.history) && s.history.length === 0);
  });

  test('returns empty cosmetics array', function() {
    var s = Prestige.createPrestigeState();
    assert(Array.isArray(s.cosmetics) && s.cosmetics.length === 0);
  });

  test('returns empty perks array', function() {
    var s = Prestige.createPrestigeState();
    assert(Array.isArray(s.perks) && s.perks.length === 0);
  });

  test('returns empty unlockedTitles array', function() {
    var s = Prestige.createPrestigeState();
    assert(Array.isArray(s.unlockedTitles) && s.unlockedTitles.length === 0);
  });

  test('creates independent instances', function() {
    var s1 = Prestige.createPrestigeState();
    var s2 = Prestige.createPrestigeState();
    s1.cosmetics.push('test_cosmetic');
    assert(s2.cosmetics.length === 0, 'State instances should be independent');
  });

});

// ============================================================================
// SUITE 5 — canAscend Eligibility
// ============================================================================
suite('canAscend Eligibility', function() {

  test('eligible when all requirements met', function() {
    var state = Prestige.createPrestigeState();
    var result = Prestige.canAscend(state, 50, 10, 8, 500);
    assert(result.eligible === true, 'Should be eligible');
    assert(result.missing.length === 0, 'Missing array should be empty');
  });

  test('not eligible when level too low', function() {
    var state = Prestige.createPrestigeState();
    var result = Prestige.canAscend(state, 49, 10, 8, 500);
    assert(result.eligible === false);
    assert(result.missing.length > 0);
    assert(result.missing[0].indexOf('level') !== -1 || result.missing[0].indexOf('Level') !== -1);
  });

  test('not eligible when quests too few', function() {
    var state = Prestige.createPrestigeState();
    var result = Prestige.canAscend(state, 50, 5, 8, 500);
    assert(result.eligible === false);
    var found = result.missing.some(function(m) { return m.toLowerCase().indexOf('quest') !== -1; });
    assert(found, 'Missing message should mention quests');
  });

  test('not eligible when zones too few', function() {
    var state = Prestige.createPrestigeState();
    var result = Prestige.canAscend(state, 50, 10, 5, 500);
    assert(result.eligible === false);
    var found = result.missing.some(function(m) { return m.toLowerCase().indexOf('zone') !== -1; });
    assert(found, 'Missing message should mention zones');
  });

  test('not eligible when spark insufficient', function() {
    var state = Prestige.createPrestigeState();
    var result = Prestige.canAscend(state, 50, 10, 8, 499);
    assert(result.eligible === false);
    var found = result.missing.some(function(m) { return m.toLowerCase().indexOf('spark') !== -1; });
    assert(found, 'Missing message should mention Spark');
  });

  test('not eligible at max prestige level', function() {
    var state = Prestige.createPrestigeState();
    state.level = 6;
    var result = Prestige.canAscend(state, 50, 10, 8, 500);
    assert(result.eligible === false);
    var found = result.missing.some(function(m) { return m.toLowerCase().indexOf('maximum') !== -1; });
    assert(found, 'Missing message should mention maximum');
  });

  test('multiple missing reasons when multiple requirements fail', function() {
    var state = Prestige.createPrestigeState();
    var result = Prestige.canAscend(state, 1, 0, 0, 0);
    assert(result.missing.length >= 4, 'Should report all 4 missing reasons');
  });

  test('eligible with exactly 500 spark', function() {
    var state = Prestige.createPrestigeState();
    var result = Prestige.canAscend(state, 50, 10, 8, 500);
    assert(result.eligible === true);
  });

  test('eligible with exactly 50 zones visits and 10 quests', function() {
    var state = Prestige.createPrestigeState();
    var result = Prestige.canAscend(state, 50, 10, 8, 600);
    assert(result.eligible === true);
  });

  test('extra spark does not disqualify', function() {
    var state = Prestige.createPrestigeState();
    var result = Prestige.canAscend(state, 50, 20, 8, 9999);
    assert(result.eligible === true);
  });

});

// ============================================================================
// SUITE 6 — ascend Process
// ============================================================================
suite('ascend Process', function() {

  test('increments prestige level', function() {
    var state  = Prestige.createPrestigeState();
    var player = maxPlayer();
    Prestige.ascend(state, player);
    assert(state.level === 1, 'Prestige level should be 1 after first ascension');
  });

  test('returns newPrestigeLevel', function() {
    var state  = Prestige.createPrestigeState();
    var player = maxPlayer();
    var result = Prestige.ascend(state, player);
    assert(result.newPrestigeLevel === 1);
  });

  test('deducts spark cost from playerData', function() {
    var state  = Prestige.createPrestigeState();
    var player = maxPlayer(1000);
    Prestige.ascend(state, player);
    assert(player.spark === 500, 'Spark should be reduced by 500');
  });

  test('resets player level to 1', function() {
    var state  = Prestige.createPrestigeState();
    var player = maxPlayer();
    Prestige.ascend(state, player);
    assert(player.level === 1, 'Player level should reset to 1');
  });

  test('resets player xp to 0', function() {
    var state  = Prestige.createPrestigeState();
    var player = maxPlayer();
    Prestige.ascend(state, player);
    assert(player.xp === 0, 'XP should reset to 0');
  });

  test('resets player skillPoints to 0', function() {
    var state  = Prestige.createPrestigeState();
    var player = maxPlayer();
    Prestige.ascend(state, player);
    assert(player.skillPoints === 0, 'skillPoints should reset to 0');
  });

  test('resets player skillTree to empty object', function() {
    var state  = Prestige.createPrestigeState();
    var player = maxPlayer();
    Prestige.ascend(state, player);
    assert(typeof player.skillTree === 'object' && Object.keys(player.skillTree).length === 0);
  });

  test('unlocks cosmetics from tier 1 rewards', function() {
    var state  = Prestige.createPrestigeState();
    var player = maxPlayer();
    Prestige.ascend(state, player);
    assert(state.cosmetics.indexOf('golden_aura') !== -1, 'Should unlock golden_aura');
  });

  test('unlocks perks from tier 1 rewards', function() {
    var state  = Prestige.createPrestigeState();
    var player = maxPlayer();
    Prestige.ascend(state, player);
    assert(state.perks.indexOf('spark_bonus_5') !== -1, 'Should unlock spark_bonus_5');
  });

  test('adds entry to history', function() {
    var state  = Prestige.createPrestigeState();
    var player = maxPlayer();
    Prestige.ascend(state, player);
    assert(state.history.length === 1, 'History should have one entry');
  });

  test('history entry has ascensionNumber', function() {
    var state  = Prestige.createPrestigeState();
    var player = maxPlayer();
    Prestige.ascend(state, player);
    assert(state.history[0].ascensionNumber === 1);
  });

  test('history entry has sparkSpent of 500', function() {
    var state  = Prestige.createPrestigeState();
    var player = maxPlayer();
    Prestige.ascend(state, player);
    assert(state.history[0].sparkSpent === 500);
  });

  test('history entry has rewardsUnlocked', function() {
    var state  = Prestige.createPrestigeState();
    var player = maxPlayer();
    Prestige.ascend(state, player);
    assert(typeof state.history[0].rewardsUnlocked === 'object');
  });

  test('returns rewards object', function() {
    var state  = Prestige.createPrestigeState();
    var player = maxPlayer();
    var result = Prestige.ascend(state, player);
    assert(result.rewards !== null && typeof result.rewards === 'object');
  });

  test('returns sparkCost of 500', function() {
    var state  = Prestige.createPrestigeState();
    var player = maxPlayer();
    var result = Prestige.ascend(state, player);
    assert(result.sparkCost === 500);
  });

  test('returns a message string', function() {
    var state  = Prestige.createPrestigeState();
    var player = maxPlayer();
    var result = Prestige.ascend(state, player);
    assert(typeof result.message === 'string' && result.message.length > 0);
  });

  test('updates totalAscensions to 1', function() {
    var state  = Prestige.createPrestigeState();
    var player = maxPlayer();
    Prestige.ascend(state, player);
    assert(state.totalAscensions === 1);
  });

  test('second ascension reaches level 2', function() {
    var res1 = doAscend(1);
    var state = res1.state;
    var player2 = maxPlayer();
    Prestige.ascend(state, player2);
    assert(state.level === 2);
  });

  test('second ascension unlocks tier 2 cosmetics', function() {
    var res1 = doAscend(1);
    var state = res1.state;
    var player2 = maxPlayer();
    Prestige.ascend(state, player2);
    assert(state.cosmetics.indexOf('silver_trail') !== -1, 'Missing silver_trail');
    assert(state.cosmetics.indexOf('emerald_glow') !== -1, 'Missing emerald_glow');
  });

  test('ascend at MAX level returns message without changing level', function() {
    var state = Prestige.createPrestigeState();
    state.level = 6;
    state.totalAscensions = 6;
    var player = maxPlayer();
    var result = Prestige.ascend(state, player);
    assert(state.level === 6, 'Level should remain 6');
    assert(typeof result.message === 'string' && result.message.length > 0);
  });

  test('ascend at MAX level does not deduct spark', function() {
    var state = Prestige.createPrestigeState();
    state.level = 6;
    var player = maxPlayer(1000);
    Prestige.ascend(state, player);
    assert(player.spark === 1000, 'Spark should not be deducted at max prestige');
  });

  test('unlocks title in unlockedTitles after first ascension', function() {
    var state  = Prestige.createPrestigeState();
    var player = maxPlayer();
    Prestige.ascend(state, player);
    assert(state.unlockedTitles.indexOf('the Ascended') !== -1);
  });

  test('does not duplicate cosmetics on repeated ascension to same level', function() {
    var state  = Prestige.createPrestigeState();
    var player = maxPlayer();
    Prestige.ascend(state, player);
    // Manually reset to level 0 and re-ascend (shouldn't happen in game, testing guard)
    state.level = 0;
    state.totalAscensions = 0;
    Prestige.ascend(state, maxPlayer());
    var goldenCount = state.cosmetics.filter(function(c) { return c === 'golden_aura'; }).length;
    assert(goldenCount === 1, 'golden_aura should not be duplicated');
  });

});

// ============================================================================
// SUITE 7 — getPrestigeTier
// ============================================================================
suite('getPrestigeTier', function() {

  test('level 0 returns Citizen tier', function() {
    var t = Prestige.getPrestigeTier(0);
    assert(t.name === 'Citizen');
  });

  test('level 3 returns Transcendent tier', function() {
    var t = Prestige.getPrestigeTier(3);
    assert(t.name === 'Transcendent');
  });

  test('level 6 returns Eternal tier', function() {
    var t = Prestige.getPrestigeTier(6);
    assert(t.name === 'Eternal');
  });

  test('negative level clamps to 0', function() {
    var t = Prestige.getPrestigeTier(-5);
    assert(t.name === 'Citizen');
  });

  test('level > 6 clamps to 6', function() {
    var t = Prestige.getPrestigeTier(99);
    assert(t.name === 'Eternal');
  });

});

// ============================================================================
// SUITE 8 — getPrestigeRewards
// ============================================================================
suite('getPrestigeRewards', function() {

  test('returns null for level 0', function() {
    assert(Prestige.getPrestigeRewards(0) === null);
  });

  test('returns object for level 1', function() {
    var r = Prestige.getPrestigeRewards(1);
    assert(r !== null && typeof r === 'object');
  });

  test('returns object for level 6', function() {
    var r = Prestige.getPrestigeRewards(6);
    assert(r !== null && typeof r === 'object');
  });

  test('returns null for level > 6', function() {
    assert(Prestige.getPrestigeRewards(99) === null);
  });

  test('level 4 rewards include phoenix_wings', function() {
    var r = Prestige.getPrestigeRewards(4);
    assert(r.cosmetics.indexOf('phoenix_wings') !== -1);
  });

  test('level 5 perks include double_daily_rewards', function() {
    var r = Prestige.getPrestigeRewards(5);
    assert(r.perks.indexOf('double_daily_rewards') !== -1);
  });

});

// ============================================================================
// SUITE 9 — getAllUnlockedRewards
// ============================================================================
suite('getAllUnlockedRewards', function() {

  test('level 0 state returns empty arrays', function() {
    var state = Prestige.createPrestigeState();
    var r = Prestige.getAllUnlockedRewards(state);
    assert(r.cosmetics.length === 0);
    assert(r.perks.length === 0);
    assert(r.titles.length === 0);
  });

  test('level 1 state includes golden_aura cosmetic', function() {
    var state = makeState(1);
    var r = Prestige.getAllUnlockedRewards(state);
    assert(r.cosmetics.indexOf('golden_aura') !== -1);
  });

  test('level 2 state includes both level 1 and level 2 cosmetics', function() {
    var state = makeState(2);
    var r = Prestige.getAllUnlockedRewards(state);
    assert(r.cosmetics.indexOf('golden_aura')  !== -1, 'Should include level 1 cosmetic');
    assert(r.cosmetics.indexOf('silver_trail') !== -1, 'Should include level 2 cosmetic');
  });

  test('level 6 state includes all cosmetics from all levels', function() {
    var state = makeState(6);
    var r = Prestige.getAllUnlockedRewards(state);
    assert(r.cosmetics.indexOf('golden_aura')    !== -1);
    assert(r.cosmetics.indexOf('eternal_flames') !== -1);
  });

  test('cosmetics are not duplicated', function() {
    var state = makeState(6);
    var r = Prestige.getAllUnlockedRewards(state);
    var seen = {};
    r.cosmetics.forEach(function(c) {
      assert(!seen[c], 'Duplicate cosmetic: ' + c);
      seen[c] = true;
    });
  });

  test('perks are not duplicated', function() {
    var state = makeState(6);
    var r = Prestige.getAllUnlockedRewards(state);
    var seen = {};
    r.perks.forEach(function(p) {
      assert(!seen[p], 'Duplicate perk: ' + p);
      seen[p] = true;
    });
  });

  test('level 3 state includes titles from levels 1, 2, 3', function() {
    var state = makeState(3);
    var r = Prestige.getAllUnlockedRewards(state);
    assert(r.titles.indexOf('the Ascended')     !== -1);
    assert(r.titles.indexOf('the Enlightened')  !== -1);
    assert(r.titles.indexOf('the Transcendent') !== -1);
  });

});

// ============================================================================
// SUITE 10 — Spark Bonus, Title, Color, Badge
// ============================================================================
suite('getSparkBonus / getPrestigeTitle / getPrestigeColor / getPrestigeBadge', function() {

  test('getSparkBonus(0) is 0', function() {
    assert(Prestige.getSparkBonus(0) === 0);
  });

  test('getSparkBonus(6) is 0.30', function() {
    assert(Math.abs(Prestige.getSparkBonus(6) - 0.30) < 0.001);
  });

  test('getSparkBonus(3) is 0.15', function() {
    assert(Math.abs(Prestige.getSparkBonus(3) - 0.15) < 0.001);
  });

  test('getPrestigeTitle(0) is empty string', function() {
    assert(Prestige.getPrestigeTitle(0) === '');
  });

  test('getPrestigeTitle(1) is "the Ascended"', function() {
    assert(Prestige.getPrestigeTitle(1) === 'the Ascended');
  });

  test('getPrestigeTitle(6) is "the Eternal"', function() {
    assert(Prestige.getPrestigeTitle(6) === 'the Eternal');
  });

  test('getPrestigeColor(0) is #cccccc', function() {
    assert(Prestige.getPrestigeColor(0).toLowerCase() === '#cccccc');
  });

  test('getPrestigeColor(5) is #FFD700', function() {
    assert(Prestige.getPrestigeColor(5).toUpperCase() === '#FFD700');
  });

  test('getPrestigeBadge(0) is non-empty string', function() {
    var b = Prestige.getPrestigeBadge(0);
    assert(typeof b === 'string' && b.length > 0);
  });

  test('getPrestigeBadge returns different strings for different levels', function() {
    var b0 = Prestige.getPrestigeBadge(0);
    var b6 = Prestige.getPrestigeBadge(6);
    assert(b0 !== b6, 'Badges should differ across levels');
  });

  test('getPrestigeBadge for all 7 levels returns strings', function() {
    for (var i = 0; i <= 6; i++) {
      assert(typeof Prestige.getPrestigeBadge(i) === 'string');
    }
  });

});

// ============================================================================
// SUITE 11 — History & Playthroughs
// ============================================================================
suite('getAscensionHistory / getTotalPlaythroughs', function() {

  test('getAscensionHistory returns empty array for fresh state', function() {
    var state = Prestige.createPrestigeState();
    assert(Prestige.getAscensionHistory(state).length === 0);
  });

  test('getAscensionHistory returns history after ascension', function() {
    var state  = Prestige.createPrestigeState();
    var player = maxPlayer();
    Prestige.ascend(state, player);
    assert(Prestige.getAscensionHistory(state).length === 1);
  });

  test('getTotalPlaythroughs for fresh state is 1', function() {
    var state = Prestige.createPrestigeState();
    assert(Prestige.getTotalPlaythroughs(state) === 1);
  });

  test('getTotalPlaythroughs after 1 ascension is 2', function() {
    var state  = Prestige.createPrestigeState();
    var player = maxPlayer();
    Prestige.ascend(state, player);
    assert(Prestige.getTotalPlaythroughs(state) === 2);
  });

  test('history entry ts is a number', function() {
    var state  = Prestige.createPrestigeState();
    var player = maxPlayer();
    Prestige.ascend(state, player);
    assert(typeof state.history[0].ts === 'number');
  });

  test('history entry fromLevel matches player level before reset', function() {
    var state  = Prestige.createPrestigeState();
    var player = maxPlayer();
    Prestige.ascend(state, player);
    assert(state.history[0].fromLevel === 50);
  });

});

// ============================================================================
// SUITE 12 — hasCosmetic / hasPerk / getActivePerks
// ============================================================================
suite('hasCosmetic / hasPerk / getActivePerks', function() {

  test('hasCosmetic returns false for fresh state', function() {
    var state = Prestige.createPrestigeState();
    assert(Prestige.hasCosmetic(state, 'golden_aura') === false);
  });

  test('hasCosmetic returns true after ascension unlocks it', function() {
    var state  = Prestige.createPrestigeState();
    var player = maxPlayer();
    Prestige.ascend(state, player);
    assert(Prestige.hasCosmetic(state, 'golden_aura') === true);
  });

  test('hasCosmetic returns false for non-existent cosmetic', function() {
    var state = makeState(6);
    assert(Prestige.hasCosmetic(state, 'nonexistent_item') === false);
  });

  test('hasPerk returns false for fresh state', function() {
    var state = Prestige.createPrestigeState();
    assert(Prestige.hasPerk(state, 'spark_bonus_5') === false);
  });

  test('hasPerk returns true after ascension unlocks it', function() {
    var state  = Prestige.createPrestigeState();
    var player = maxPlayer();
    Prestige.ascend(state, player);
    assert(Prestige.hasPerk(state, 'spark_bonus_5') === true);
  });

  test('getActivePerks returns empty array for fresh state', function() {
    var state = Prestige.createPrestigeState();
    assert(Prestige.getActivePerks(state).length === 0);
  });

  test('getActivePerks returns perk objects after ascension', function() {
    var state  = Prestige.createPrestigeState();
    var player = maxPlayer();
    Prestige.ascend(state, player);
    var perks = Prestige.getActivePerks(state);
    assert(perks.length > 0);
  });

  test('each active perk has id, label, type, value', function() {
    var state  = Prestige.createPrestigeState();
    var player = maxPlayer();
    Prestige.ascend(state, player);
    var perks = Prestige.getActivePerks(state);
    perks.forEach(function(perk) {
      assert(typeof perk.id    === 'string', 'perk.id should be string');
      assert(typeof perk.label === 'string', 'perk.label should be string');
      assert(typeof perk.type  === 'string', 'perk.type should be string');
      assert(typeof perk.value === 'number', 'perk.value should be number');
    });
  });

});

// ============================================================================
// SUITE 13 — applyPrestigeBonus
// ============================================================================
suite('applyPrestigeBonus', function() {

  test('no bonus for fresh state', function() {
    var state = Prestige.createPrestigeState();
    var result = Prestige.applyPrestigeBonus(state, 'spark', 100);
    assert(result === 100, 'Should return base value with no perks');
  });

  test('spark bonus adds 5% after level 1 ascension', function() {
    var state  = Prestige.createPrestigeState();
    var player = maxPlayer();
    Prestige.ascend(state, player);
    var result = Prestige.applyPrestigeBonus(state, 'spark', 100);
    assert(result === 105, 'Expected 105 with 5% spark bonus, got ' + result);
  });

  test('xp bonus adds 5% at level 2', function() {
    var res = doAscend(2);
    var result = Prestige.applyPrestigeBonus(res.state, 'xp', 100);
    assert(result >= 105, 'XP bonus should be at least 5%');
  });

  test('unrelated action not affected by spark perk', function() {
    var state  = Prestige.createPrestigeState();
    var player = maxPlayer();
    Prestige.ascend(state, player);
    var result = Prestige.applyPrestigeBonus(state, 'craft', 100);
    assert(result === 100, 'Craft should not be affected by spark_bonus_5');
  });

  test('returns integer (floored)', function() {
    var state  = Prestige.createPrestigeState();
    var player = maxPlayer();
    Prestige.ascend(state, player);
    var result = Prestige.applyPrestigeBonus(state, 'spark', 33);
    assert(Number.isInteger(result), 'Result should be an integer');
  });

  test('base value 0 returns 0', function() {
    var res = doAscend(6);
    var result = Prestige.applyPrestigeBonus(res.state, 'spark', 0);
    assert(result === 0);
  });

});

// ============================================================================
// SUITE 14 — Formatting Functions
// ============================================================================
suite('Formatting Functions', function() {

  test('formatPrestigeCard returns a non-empty string', function() {
    var state = Prestige.createPrestigeState();
    var html = Prestige.formatPrestigeCard(state);
    assert(typeof html === 'string' && html.length > 0);
  });

  test('formatPrestigeCard contains prestige level', function() {
    var state = makeState(3);
    var html = Prestige.formatPrestigeCard(state);
    assert(html.indexOf('3') !== -1, 'Card should contain prestige level 3');
  });

  test('formatPrestigeCard contains tier name', function() {
    var state = makeState(3);
    var html = Prestige.formatPrestigeCard(state);
    assert(html.indexOf('Transcendent') !== -1, 'Card should contain tier name');
  });

  test('formatPrestigeCard contains spark bonus for level 4', function() {
    var state = makeState(4);
    var html = Prestige.formatPrestigeCard(state);
    assert(html.indexOf('20%') !== -1, 'Card should mention 20% spark bonus at level 4');
  });

  test('formatAscensionRequirements returns a non-empty string', function() {
    var html = Prestige.formatAscensionRequirements(50, 10, 8, 500);
    assert(typeof html === 'string' && html.length > 0);
  });

  test('formatAscensionRequirements shows met requirements', function() {
    var html = Prestige.formatAscensionRequirements(50, 10, 8, 500);
    // The checkmark entity or similar indicator should be present
    assert(html.indexOf('&#10003;') !== -1 || html.indexOf('✓') !== -1 || html.indexOf('check') !== -1,
      'Should indicate met requirements');
  });

  test('formatAscensionRequirements shows unmet requirements', function() {
    var html = Prestige.formatAscensionRequirements(1, 0, 0, 0);
    assert(html.indexOf('&#10007;') !== -1 || html.indexOf('✗') !== -1 || html.indexOf('cross') !== -1,
      'Should indicate unmet requirements');
  });

  test('formatPrestigeBadge returns a non-empty string', function() {
    var html = Prestige.formatPrestigeBadge(1);
    assert(typeof html === 'string' && html.length > 0);
  });

  test('formatPrestigeBadge contains tier name', function() {
    var html = Prestige.formatPrestigeBadge(5);
    assert(html.indexOf('Legendary') !== -1);
  });

  test('formatPrestigeBadge contains tier color', function() {
    var html = Prestige.formatPrestigeBadge(5);
    // level 5 color is FFD700
    assert(html.toUpperCase().indexOf('FFD700') !== -1, 'Badge should contain tier color');
  });

  test('formatPrestigeCard for level 0 contains Citizen', function() {
    var state = Prestige.createPrestigeState();
    var html = Prestige.formatPrestigeCard(state);
    assert(html.indexOf('Citizen') !== -1);
  });

});

// ============================================================================
// SUITE 15 — getLeaderboardEntry
// ============================================================================
suite('getLeaderboardEntry', function() {

  test('returns an object with name, prestigeLevel, totalAscensions, title', function() {
    var state = makeState(2);
    state.totalAscensions = 2;
    var entry = Prestige.getLeaderboardEntry(state, 'Alice');
    assert(typeof entry.name === 'string');
    assert(typeof entry.prestigeLevel === 'number');
    assert(typeof entry.totalAscensions === 'number');
    assert(typeof entry.title === 'string');
  });

  test('name matches playerName argument', function() {
    var state = Prestige.createPrestigeState();
    var entry = Prestige.getLeaderboardEntry(state, 'Bob');
    assert(entry.name === 'Bob');
  });

  test('prestigeLevel matches state.level', function() {
    var state = makeState(4);
    var entry = Prestige.getLeaderboardEntry(state, 'Charlie');
    assert(entry.prestigeLevel === 4);
  });

  test('title for level 6 is "the Eternal"', function() {
    var state = makeState(6);
    var entry = Prestige.getLeaderboardEntry(state, 'Diana');
    assert(entry.title === 'the Eternal');
  });

  test('title for level 0 is empty string', function() {
    var state = Prestige.createPrestigeState();
    var entry = Prestige.getLeaderboardEntry(state, 'Eve');
    assert(entry.title === '');
  });

  test('totalAscensions matches state.totalAscensions', function() {
    var state = makeState(3);
    state.totalAscensions = 3;
    var entry = Prestige.getLeaderboardEntry(state, 'Frank');
    assert(entry.totalAscensions === 3);
  });

});

// ============================================================================
// SUITE 16 — Edge Cases
// ============================================================================
suite('Edge Cases', function() {

  test('ascend with playerData missing spark field does not throw', function() {
    var state = Prestige.createPrestigeState();
    var player = { level: 50, xp: 100, skillPoints: 5, skillTree: {} };
    // no spark field
    var result = Prestige.ascend(state, player);
    assert(typeof result === 'object');
  });

  test('getAscensionHistory handles state without history field gracefully', function() {
    var state = { level: 2, totalAscensions: 2 };
    var h = Prestige.getAscensionHistory(state);
    assert(Array.isArray(h));
  });

  test('getTotalPlaythroughs handles state without totalAscensions gracefully', function() {
    var state = { level: 1 };
    var t = Prestige.getTotalPlaythroughs(state);
    assert(t === 1);
  });

  test('multiple ascensions accumulate cosmetics correctly', function() {
    var state  = Prestige.createPrestigeState();
    var player = maxPlayer();
    Prestige.ascend(state, player); // -> level 1
    player.level = 50; player.xp = 0; player.skillPoints = 0; player.skillTree = {}; player.spark = 1000;
    Prestige.ascend(state, player); // -> level 2
    assert(state.cosmetics.indexOf('golden_aura')  !== -1, 'Level 1 cosmetic missing');
    assert(state.cosmetics.indexOf('silver_trail') !== -1, 'Level 2 cosmetic missing');
  });

  test('multiple ascensions accumulate perks correctly', function() {
    var state  = Prestige.createPrestigeState();
    var player = maxPlayer();
    Prestige.ascend(state, player);
    player.level = 50; player.spark = 1000;
    Prestige.ascend(state, player);
    assert(state.perks.indexOf('spark_bonus_5')  !== -1, 'Level 1 perk missing');
    assert(state.perks.indexOf('xp_bonus_5')     !== -1, 'Level 2 perk missing');
  });

  test('formatAscensionRequirements with very high values marks all as met', function() {
    var html = Prestige.formatAscensionRequirements(99, 999, 8, 99999);
    // Should have more checkmarks than X marks
    var checks = (html.match(/10003/g) || []).length;
    var crosses = (html.match(/10007/g) || []).length;
    assert(checks >= 4, 'All four requirements should be checked');
    assert(crosses === 0, 'No requirements should be unchecked');
  });

  test('canAscend returns eligible:false with missing array when at max prestige', function() {
    var state = makeState(6);
    var result = Prestige.canAscend(state, 50, 10, 8, 500);
    assert(result.eligible === false);
    assert(Array.isArray(result.missing) && result.missing.length > 0);
  });

  test('applyPrestigeBonus with unknown action returns base value', function() {
    var state  = Prestige.createPrestigeState();
    var player = maxPlayer();
    Prestige.ascend(state, player);
    var result = Prestige.applyPrestigeBonus(state, 'unknown_action', 200);
    assert(result === 200, 'Unknown action should return base value unchanged');
  });

  test('getPrestigeRewards returns null for negative level', function() {
    assert(Prestige.getPrestigeRewards(-1) === null);
  });

  test('formatPrestigeBadge for level 0 returns a string', function() {
    var html = Prestige.formatPrestigeBadge(0);
    assert(typeof html === 'string' && html.length > 0);
  });

  test('sixth ascension to Eternal tier includes all prior cosmetics cumulatively', function() {
    var state = makeState(6);
    var r = Prestige.getAllUnlockedRewards(state);
    // Should have cosmetics from all 6 levels
    assert(r.cosmetics.length >= 14, 'Should have at least 14 total cosmetics across 6 tiers, got ' + r.cosmetics.length);
  });

});

// ============================================================================
// RUN
// ============================================================================
var ok = report();
process.exit(ok ? 0 : 1);
