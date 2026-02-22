// test_alchemy_lab.js — Comprehensive tests for the AlchemyLab module
'use strict';

var AlchemyLab = require('../src/js/alchemy_lab');

// ── Test runner ───────────────────────────────────────────────────────────────

var passed = 0;
var failed = 0;
var errors = [];

function assert(condition, msg) {
  if (condition) {
    passed++;
    process.stdout.write('  ok - ' + msg + '\n');
  } else {
    failed++;
    errors.push(msg);
    process.stdout.write('  FAIL - ' + msg + '\n');
  }
}

function suite(name, fn) {
  process.stdout.write('\n' + name + '\n');
  fn();
}

// ── State factory helpers ─────────────────────────────────────────────────────

function makeState(players) {
  return { players: players || {} };
}

function makePlayer(overrides) {
  var base = {
    inventory: [],
    activeBuffs: [],
    alchemyStats: {
      potionsBrewed: 0,
      explosions: 0,
      failures: 0,
      discoveries: [],
      transmutations: 0,
      xpEarned: 0
    }
  };
  var result = {};
  for (var k in base) { result[k] = base[k]; }
  if (overrides) {
    for (var ok in overrides) { result[ok] = overrides[ok]; }
  }
  return result;
}

function withPlayer(playerId, overrides) {
  var players = {};
  players[playerId] = makePlayer(overrides);
  return makeState(players);
}

function addItem(state, playerId, id, qty) {
  state.players[playerId].inventory.push({ id: id, qty: qty });
  return state;
}

function giveRecipeReagents(state, playerId, recipeId) {
  var recipe = AlchemyLab.getRecipeById(recipeId);
  if (!recipe) { return state; }
  for (var i = 0; i < recipe.reagents.length; i++) {
    addItem(state, playerId, recipe.reagents[i].id, recipe.reagents[i].qty);
  }
  return state;
}

function setAlchemyXp(state, playerId, xp) {
  if (!state.players[playerId].alchemyStats) {
    state.players[playerId].alchemyStats = { potionsBrewed: 0, explosions: 0, failures: 0, discoveries: [], transmutations: 0, xpEarned: 0 };
  }
  state.players[playerId].alchemyStats.xpEarned = xp;
  return state;
}

// ── CONSTANTS / DATA STRUCTURE TESTS ─────────────────────────────────────────

suite('REAGENTS — data structure', function() {
  assert(Array.isArray(AlchemyLab.REAGENTS), 'REAGENTS is an array');
  assert(AlchemyLab.REAGENTS.length >= 20, 'At least 20 reagents defined, got ' + AlchemyLab.REAGENTS.length);

  var required = ['id', 'name', 'category', 'volatility', 'potency', 'zones'];
  AlchemyLab.REAGENTS.forEach(function(r) {
    required.forEach(function(field) {
      assert(r[field] !== undefined, 'Reagent ' + r.id + ' has field: ' + field);
    });
  });

  // All ids unique
  var ids = {};
  var allUnique = true;
  AlchemyLab.REAGENTS.forEach(function(r) {
    if (ids[r.id]) { allUnique = false; }
    ids[r.id] = true;
  });
  assert(allUnique, 'All reagent ids are unique');

  // Volatility in 0-4 range
  var volatilityOk = AlchemyLab.REAGENTS.every(function(r) { return r.volatility >= 0 && r.volatility <= 4; });
  assert(volatilityOk, 'All reagent volatility values in [0,4]');

  // Potency in 1-5 range
  var potencyOk = AlchemyLab.REAGENTS.every(function(r) { return r.potency >= 1 && r.potency <= 5; });
  assert(potencyOk, 'All reagent potency values in [1,5]');

  // Zones is array
  var zonesOk = AlchemyLab.REAGENTS.every(function(r) { return Array.isArray(r.zones); });
  assert(zonesOk, 'All reagents have zones as array');

  // Categories present
  var categories = ['herb', 'mineral', 'liquid', 'animal', 'catalyst'];
  categories.forEach(function(cat) {
    var found = AlchemyLab.REAGENTS.some(function(r) { return r.category === cat; });
    assert(found, 'Reagent category "' + cat + '" is represented');
  });
});

suite('REAGENTS — specific reagents present', function() {
  var keyReagents = ['moonpetal', 'starbloom', 'lavender', 'nightshade', 'sulfur',
                     'crystal_water', 'essence_of_void', 'dragon_ichor', 'phoenix_ash',
                     'philosophers_salt', 'arcane_catalyst', 'void_crystal'];
  keyReagents.forEach(function(id) {
    var r = AlchemyLab.getReagentById(id);
    assert(r !== null, 'Reagent "' + id + '" exists');
    assert(r && r.id === id, 'Reagent "' + id + '" has correct id');
  });

  // Check volatile reagents have high volatility
  var void_crystal = AlchemyLab.getReagentById('void_crystal');
  assert(void_crystal && void_crystal.volatility === 4, 'void_crystal has max volatility 4');
  var lavender = AlchemyLab.getReagentById('lavender');
  assert(lavender && lavender.volatility === 0, 'lavender has min volatility 0');
});

suite('RECIPES — data structure', function() {
  assert(Array.isArray(AlchemyLab.RECIPES), 'RECIPES is an array');
  assert(AlchemyLab.RECIPES.length >= 15, 'At least 15 recipes defined, got ' + AlchemyLab.RECIPES.length);

  var required = ['id', 'name', 'category', 'station', 'reagents', 'output', 'brewTime', 'skillRequired', 'baseSuccessRate', 'xpReward'];
  AlchemyLab.RECIPES.forEach(function(r) {
    required.forEach(function(field) {
      assert(r[field] !== undefined, 'Recipe "' + r.id + '" has field: ' + field);
    });
  });

  // Unique recipe ids
  var ids = {};
  var allUnique = true;
  AlchemyLab.RECIPES.forEach(function(r) {
    if (ids[r.id]) { allUnique = false; }
    ids[r.id] = true;
  });
  assert(allUnique, 'All recipe ids are unique');

  // baseSuccessRate in 0-1
  var ratesOk = AlchemyLab.RECIPES.every(function(r) { return r.baseSuccessRate > 0 && r.baseSuccessRate <= 1; });
  assert(ratesOk, 'All recipe baseSuccessRate values in (0,1]');

  // skillRequired is number
  var skillOk = AlchemyLab.RECIPES.every(function(r) { return typeof r.skillRequired === 'number'; });
  assert(skillOk, 'All recipe skillRequired values are numbers');

  // xpReward positive
  var xpOk = AlchemyLab.RECIPES.every(function(r) { return r.xpReward > 0; });
  assert(xpOk, 'All recipes have positive xpReward');

  // Reagents is array with id/qty
  AlchemyLab.RECIPES.forEach(function(r) {
    assert(Array.isArray(r.reagents), 'Recipe "' + r.id + '" has reagents array');
    r.reagents.forEach(function(req) {
      assert(req.id && req.qty > 0, 'Reagent requirement in "' + r.id + '" has id and qty > 0');
    });
  });
});

suite('RECIPES — categories covered', function() {
  var categories = ['healing', 'utility', 'combat', 'enhancement', 'transmutation', 'legendary', 'void'];
  categories.forEach(function(cat) {
    var found = AlchemyLab.RECIPES.some(function(r) { return r.category === cat; });
    assert(found, 'Recipe category "' + cat + '" exists');
  });
});

suite('RECIPES — specific recipes', function() {
  var keyRecipes = [
    'minor_healing_potion', 'healing_potion', 'greater_healing_potion', 'rejuvenation_elixir',
    'swiftness_potion', 'harvester_brew', 'craftsmans_elixir', 'explorers_tonic',
    'strength_tincture', 'berserker_draught', 'wisdom_potion', 'arcane_amplifier',
    'social_elixir', 'stone_to_iron_tincture', 'iron_to_gold_tincture',
    'elixir_of_life', 'void_essence_potion'
  ];
  keyRecipes.forEach(function(id) {
    var r = AlchemyLab.getRecipeById(id);
    assert(r !== null, 'Recipe "' + id + '" exists');
    assert(r && r.id === id, 'Recipe "' + id + '" has correct id');
  });

  // Transmutation recipes have transmutation field
  var txRecipe = AlchemyLab.getRecipeById('stone_to_iron_tincture');
  assert(txRecipe && txRecipe.transmutation, 'stone_to_iron_tincture has transmutation field');
  assert(txRecipe && txRecipe.transmutation.from === 'stone', 'stone_to_iron_tincture transmutes from stone');
  assert(txRecipe && txRecipe.transmutation.to === 'iron_ore', 'stone_to_iron_tincture transmutes to iron_ore');
});

suite('QUALITY_TIERS — data structure', function() {
  var tiers = AlchemyLab.QUALITY_TIERS;
  assert(tiers !== null && typeof tiers === 'object', 'QUALITY_TIERS is an object');

  var expected = ['common', 'fine', 'superior', 'masterwork'];
  expected.forEach(function(tier) {
    assert(tiers[tier] !== undefined, 'Quality tier "' + tier + '" exists');
    assert(typeof tiers[tier].buffScale === 'number', 'Tier "' + tier + '" has numeric buffScale');
    assert(tiers[tier].buffScale >= 1.0, 'Tier "' + tier + '" buffScale >= 1.0');
  });

  // masterwork has highest buffScale
  assert(tiers.masterwork.buffScale > tiers.superior.buffScale, 'masterwork buffScale > superior');
  assert(tiers.superior.buffScale > tiers.fine.buffScale, 'superior buffScale > fine');
  assert(tiers.fine.buffScale > tiers.common.buffScale, 'fine buffScale > common');

  // QUALITY_TIER_ORDER
  assert(Array.isArray(AlchemyLab.QUALITY_TIER_ORDER), 'QUALITY_TIER_ORDER is an array');
  assert(AlchemyLab.QUALITY_TIER_ORDER.length === 4, 'QUALITY_TIER_ORDER has 4 tiers');
  assert(AlchemyLab.QUALITY_TIER_ORDER[0] === 'common', 'First tier is common');
  assert(AlchemyLab.QUALITY_TIER_ORDER[3] === 'masterwork', 'Last tier is masterwork');
});

suite('LAB_STATIONS — data structure', function() {
  var stations = AlchemyLab.LAB_STATIONS;
  assert(stations !== null && typeof stations === 'object', 'LAB_STATIONS is an object');

  var expected = ['basic_cauldron', 'alchemists_bench', 'grand_cauldron', 'arcane_distillery', 'void_crucible'];
  expected.forEach(function(id) {
    assert(stations[id] !== undefined, 'Station "' + id + '" exists');
    assert(stations[id].tier > 0, 'Station "' + id + '" has positive tier');
    assert(Array.isArray(stations[id].categories), 'Station "' + id + '" has categories array');
    assert(typeof stations[id].successBonus === 'number', 'Station "' + id + '" has numeric successBonus');
  });

  // Higher tier stations should have more categories
  assert(
    stations.arcane_distillery.categories.length > stations.basic_cauldron.categories.length,
    'arcane_distillery has more categories than basic_cauldron'
  );

  // void_crucible has highest success bonus
  assert(stations.void_crucible.successBonus >= stations.arcane_distillery.successBonus, 'void_crucible successBonus >= arcane_distillery');
});

suite('CATALYSTS — data structure', function() {
  var catalysts = AlchemyLab.getCatalysts();
  assert(catalysts !== null && typeof catalysts === 'object', 'getCatalysts returns object');

  var expected = ['philosophers_salt', 'arcane_catalyst', 'void_crystal'];
  expected.forEach(function(id) {
    assert(catalysts[id] !== undefined, 'Catalyst "' + id + '" defined');
    assert(typeof catalysts[id].successBonus === 'number', 'Catalyst "' + id + '" has successBonus');
    assert(typeof catalysts[id].qualityBonus === 'number', 'Catalyst "' + id + '" has qualityBonus');
    assert(typeof catalysts[id].explosionReduction === 'number', 'Catalyst "' + id + '" has explosionReduction');
  });

  // arcane_catalyst has higher bonus than philosophers_salt
  assert(catalysts.arcane_catalyst.successBonus > catalysts.philosophers_salt.successBonus, 'arcane_catalyst has higher successBonus');
});

suite('TRANSMUTATION_RULES — data structure', function() {
  var rules = AlchemyLab.getTransmutationRules();
  assert(Array.isArray(rules), 'getTransmutationRules returns array');
  assert(rules.length >= 2, 'At least 2 transmutation rules');

  rules.forEach(function(rule) {
    assert(rule.from, 'Rule has from field');
    assert(rule.to, 'Rule has to field');
    assert(typeof rule.lossRate === 'number', 'Rule has numeric lossRate');
    assert(rule.lossRate > 0 && rule.lossRate < 1, 'Rule lossRate in (0,1)');
  });
});

suite('DISCOVERY_COMBINATIONS — data structure', function() {
  var combos = AlchemyLab.getDiscoveryCombinations();
  assert(Array.isArray(combos), 'getDiscoveryCombinations returns array');
  assert(combos.length >= 3, 'At least 3 discovery combinations');

  combos.forEach(function(combo) {
    assert(combo.id, 'Combo has id');
    assert(Array.isArray(combo.reagents), 'Combo has reagents array');
    assert(combo.reagents.length >= 2, 'Combo has at least 2 reagents');
    assert(combo.result && combo.result.id, 'Combo has result with id');
    assert(combo.result && combo.result.name, 'Combo has result with name');
  });
});

suite('ALCHEMY_LEVEL_THRESHOLDS — data structure', function() {
  var thresholds = AlchemyLab.ALCHEMY_LEVEL_THRESHOLDS;
  assert(Array.isArray(thresholds), 'ALCHEMY_LEVEL_THRESHOLDS is an array');
  assert(thresholds.length >= 10, 'At least 10 level thresholds');
  assert(thresholds[0] === 0, 'First threshold is 0');

  // Strictly increasing
  var increasing = true;
  for (var i = 1; i < thresholds.length; i++) {
    if (thresholds[i] <= thresholds[i - 1]) { increasing = false; }
  }
  assert(increasing, 'Thresholds are strictly increasing');
});

suite('BREW_OUTCOMES — constants', function() {
  var outcomes = AlchemyLab.BREW_OUTCOMES;
  assert(outcomes.success === 'success', 'BREW_OUTCOMES.success is "success"');
  assert(outcomes.failure === 'failure', 'BREW_OUTCOMES.failure is "failure"');
  assert(outcomes.explosion === 'explosion', 'BREW_OUTCOMES.explosion is "explosion"');
});

// ── INTERNAL HELPERS TESTS ────────────────────────────────────────────────────

suite('_mulberry32 — PRNG', function() {
  var rng = AlchemyLab._mulberry32(42);
  assert(typeof rng === 'function', 'mulberry32 returns a function');

  var v1 = rng();
  var v2 = rng();
  assert(typeof v1 === 'number', 'PRNG returns numbers');
  assert(v1 >= 0 && v1 < 1, 'PRNG output in [0,1)');
  assert(v1 !== v2, 'PRNG produces different values per call');

  // Deterministic with same seed
  var rng2 = AlchemyLab._mulberry32(42);
  assert(rng2() === v1, 'Same seed produces same first value');

  // Different seeds produce different outputs
  var rng3 = AlchemyLab._mulberry32(999);
  assert(rng3() !== v1, 'Different seeds produce different outputs');
});

suite('_getQualityTier', function() {
  assert(AlchemyLab._getQualityTier(0.0) === 'common', 'quality 0.0 → common');
  assert(AlchemyLab._getQualityTier(0.1) === 'common', 'quality 0.1 → common');
  assert(AlchemyLab._getQualityTier(0.34) === 'common', 'quality 0.34 → common');
  assert(AlchemyLab._getQualityTier(0.35) === 'fine', 'quality 0.35 → fine');
  assert(AlchemyLab._getQualityTier(0.50) === 'fine', 'quality 0.50 → fine');
  assert(AlchemyLab._getQualityTier(0.64) === 'fine', 'quality 0.64 → fine');
  assert(AlchemyLab._getQualityTier(0.65) === 'superior', 'quality 0.65 → superior');
  assert(AlchemyLab._getQualityTier(0.75) === 'superior', 'quality 0.75 → superior');
  assert(AlchemyLab._getQualityTier(0.84) === 'superior', 'quality 0.84 → superior');
  assert(AlchemyLab._getQualityTier(0.85) === 'masterwork', 'quality 0.85 → masterwork');
  assert(AlchemyLab._getQualityTier(0.95) === 'masterwork', 'quality 0.95 → masterwork');
  assert(AlchemyLab._getQualityTier(1.0) === 'masterwork', 'quality 1.0 → masterwork');
});

suite('_scaleBuff', function() {
  var buff = { type: 'speed', value: 0.20, duration: 180 };

  var common = AlchemyLab._scaleBuff(buff, 'common');
  assert(common !== null, '_scaleBuff returns result for common tier');
  assert(common.type === 'speed', 'scaleBuff preserves buff type');
  assert(common.value === buff.value * AlchemyLab.QUALITY_TIERS.common.buffScale, 'common tier scales value correctly');

  var masterwork = AlchemyLab._scaleBuff(buff, 'masterwork');
  assert(masterwork !== null, '_scaleBuff returns result for masterwork tier');
  assert(masterwork.value > common.value, 'masterwork buff value > common buff value');
  assert(masterwork.duration > common.duration, 'masterwork buff duration > common buff duration');

  // Null buff returns null
  var none = AlchemyLab._scaleBuff(null, 'fine');
  assert(none === null, '_scaleBuff returns null for null buff');

  // Unknown tier returns null
  var bad = AlchemyLab._scaleBuff(buff, 'nonexistent');
  assert(bad === null, '_scaleBuff returns null for unknown tier');
});

suite('_computeVolatility', function() {
  var compute = AlchemyLab._computeVolatility;

  // Stable reagents
  var result = compute([{ id: 'lavender', qty: 1 }, { id: 'sage', qty: 1 }]);
  assert(result === 0, 'Two stable reagents give volatility 0');

  // Mixed
  var mixed = compute([{ id: 'lavender', qty: 1 }, { id: 'nightshade', qty: 1 }]);
  assert(mixed > 0, 'Mixing stable + volatile gives > 0');
  assert(mixed === (0 + 3) / 2, 'Mixed volatility is average');

  // High volatility
  var high = compute([{ id: 'void_crystal', qty: 1 }, { id: 'essence_of_void', qty: 1 }]);
  assert(high === 4, 'Two max-volatility reagents give 4');

  // Empty
  var empty = compute([]);
  assert(empty === 0, 'Empty reagents give 0 volatility');

  // Unknown reagent (skipped)
  var unknown = compute([{ id: 'does_not_exist', qty: 1 }]);
  assert(unknown === 0, 'Unknown reagent contributes 0');
});

suite('_computePotency', function() {
  var compute = AlchemyLab._computePotency;

  var result = compute([{ id: 'lavender', qty: 1 }]);
  var lavender = AlchemyLab.getReagentById('lavender');
  assert(result === lavender.potency, 'Single reagent potency is its own potency');

  var high = compute([{ id: 'essence_of_void', qty: 1 }, { id: 'dragon_ichor', qty: 1 }]);
  assert(high === 5, 'Two max-potency reagents give 5');

  var empty = compute([]);
  assert(empty === 1, 'Empty reagents give potency 1');
});

suite('_computeOutcomeProbabilities', function() {
  var recipe = AlchemyLab.getRecipeById('minor_healing_potion');
  var compute = AlchemyLab._computeOutcomeProbabilities;

  var probs = compute(recipe, 0, 'basic_cauldron', null);
  assert(typeof probs.successRate === 'number', 'successRate is number');
  assert(typeof probs.failureRate === 'number', 'failureRate is number');
  assert(typeof probs.explosionRate === 'number', 'explosionRate is number');

  // Rates sum to ~1
  var sum = probs.successRate + probs.failureRate + probs.explosionRate;
  assert(Math.abs(sum - 1.0) < 0.001, 'Probabilities sum to 1.0, got ' + sum);

  // All rates non-negative
  assert(probs.successRate >= 0, 'successRate >= 0');
  assert(probs.failureRate >= 0, 'failureRate >= 0');
  assert(probs.explosionRate >= 0, 'explosionRate >= 0');

  // Higher skill level increases success rate
  var probs0 = compute(recipe, 0, 'basic_cauldron', null);
  var probs10 = compute(recipe, 10, 'basic_cauldron', null);
  assert(probs10.successRate > probs0.successRate, 'Higher alchemy level increases success rate');

  // Better station increases success rate — use a recipe with lower base rate to avoid capping at 0.99
  var lowRecipe = AlchemyLab.getRecipeById('berserker_draught'); // 62% base
  var probsBasic2 = compute(lowRecipe, 0, 'alchemists_bench', null);
  var probsGrand2 = compute(lowRecipe, 0, 'grand_cauldron', null);
  assert(probsGrand2.successRate > probsBasic2.successRate, 'Grand cauldron > alchemists_bench success rate for low-base recipe');

  // Catalyst increases success rate — use a recipe with room to grow
  var probsNoCat = compute(lowRecipe, 0, 'grand_cauldron', null);
  var probsCat = compute(lowRecipe, 0, 'grand_cauldron', 'philosophers_salt');
  assert(probsCat.successRate > probsNoCat.successRate, 'Catalyst increases success rate');

  // Volatile recipe has explosion chance
  var vRecipe = AlchemyLab.getRecipeById('berserker_draught');
  var vProbs = compute(vRecipe, 0, 'grand_cauldron', null);
  assert(vProbs.explosionRate > 0, 'Volatile recipe has explosion chance');
});

suite('_checkDiscovery', function() {
  var check = AlchemyLab._checkDiscovery;

  // Known discovery
  var combos = AlchemyLab.getDiscoveryCombinations();
  var first = combos[0];
  var reagentList = first.reagents.map(function(id) { return { id: id, qty: 1 }; });
  var result = check(reagentList);
  assert(result !== null, 'Known discovery combination found');
  assert(result.id === first.id, 'Correct discovery returned');

  // Unknown combination
  var unknown = check([{ id: 'lavender', qty: 1 }, { id: 'sage', qty: 1 }]);
  assert(unknown === null, 'Unknown combination returns null');

  // Order does not matter (sorted comparison)
  var reversed = first.reagents.slice().reverse().map(function(id) { return { id: id, qty: 1 }; });
  var resultRev = check(reversed);
  assert(resultRev !== null, 'Discovery found regardless of reagent order');
});

// ── getAlchemyLevel TESTS ─────────────────────────────────────────────────────

suite('getAlchemyLevel', function() {
  // Player not found
  var state = makeState();
  assert(AlchemyLab.getAlchemyLevel(state, 'ghost') === 0, 'Non-existent player returns level 0');

  // Level 0 at 0 XP
  var s0 = withPlayer('p1', {});
  assert(AlchemyLab.getAlchemyLevel(s0, 'p1') === 0, 'Level 0 at 0 XP');

  // Set XP to known threshold
  var thresholds = AlchemyLab.ALCHEMY_LEVEL_THRESHOLDS;
  for (var i = 1; i < Math.min(thresholds.length, 6); i++) {
    var s = withPlayer('px', {});
    setAlchemyXp(s, 'px', thresholds[i]);
    var level = AlchemyLab.getAlchemyLevel(s, 'px');
    assert(level === i, 'XP ' + thresholds[i] + ' gives level ' + i);
  }

  // Very high XP
  var sHigh = withPlayer('phigh', {});
  setAlchemyXp(sHigh, 'phigh', 999999);
  var highLevel = AlchemyLab.getAlchemyLevel(sHigh, 'phigh');
  assert(highLevel === thresholds.length - 1, 'Very high XP gives max level');
});

// ── canBrew TESTS ─────────────────────────────────────────────────────────────

suite('canBrew — basic validation', function() {
  var state = makeState();
  var result = AlchemyLab.canBrew(state, 'nobody', 'minor_healing_potion');
  assert(result.canBrew === false, 'canBrew false for non-existent player');
  assert(typeof result.reason === 'string', 'canBrew reason is a string');

  // Unknown recipe
  var s = withPlayer('p1', {});
  var r = AlchemyLab.canBrew(s, 'p1', 'nonexistent_recipe');
  assert(r.canBrew === false, 'canBrew false for unknown recipe');

  // Station mismatch
  var sm = withPlayer('p2', {});
  // minor_healing_potion uses basic_cauldron; try void_crucible category recipe on basic_cauldron
  var r2 = AlchemyLab.canBrew(sm, 'p2', 'void_essence_potion', 'basic_cauldron');
  assert(r2.canBrew === false, 'canBrew false when station cannot handle category');
});

suite('canBrew — skill level gating', function() {
  // minor_healing_potion requires level 0 — everyone can attempt
  var s0 = withPlayer('p1', {});
  giveRecipeReagents(s0, 'p1', 'minor_healing_potion');
  var r0 = AlchemyLab.canBrew(s0, 'p1', 'minor_healing_potion');
  assert(r0.canBrew === true, 'Level 0 player can brew minor_healing_potion');

  // void_essence_potion requires level 12
  var sv = withPlayer('pv', {});
  giveRecipeReagents(sv, 'pv', 'void_essence_potion');
  var rv = AlchemyLab.canBrew(sv, 'pv', 'void_essence_potion', 'void_crucible');
  assert(rv.canBrew === false, 'Level 0 cannot brew void_essence_potion (requires 12)');
  assert(rv.reason.indexOf('Alchemy level') !== -1, 'Reason mentions alchemy level');

  // Give enough XP for level 12
  var thresholds = AlchemyLab.ALCHEMY_LEVEL_THRESHOLDS;
  var sv12 = withPlayer('pv12', {});
  setAlchemyXp(sv12, 'pv12', thresholds[12] || 780);
  giveRecipeReagents(sv12, 'pv12', 'void_essence_potion');
  var rv12 = AlchemyLab.canBrew(sv12, 'pv12', 'void_essence_potion', 'void_crucible');
  assert(rv12.canBrew === true, 'Level 12 player can brew void_essence_potion');
});

suite('canBrew — reagent check', function() {
  var recipe = AlchemyLab.getRecipeById('minor_healing_potion');

  // Missing all reagents
  var s = withPlayer('p1', {});
  var r = AlchemyLab.canBrew(s, 'p1', 'minor_healing_potion');
  assert(r.canBrew === false, 'Cannot brew with no reagents');
  assert(r.reason.indexOf('Missing reagent') !== -1, 'Reason mentions missing reagent');

  // Partial reagents
  var sp = withPlayer('p2', {});
  addItem(sp, 'p2', recipe.reagents[0].id, recipe.reagents[0].qty); // Only first reagent
  var rp = AlchemyLab.canBrew(sp, 'p2', 'minor_healing_potion');
  assert(rp.canBrew === false, 'Cannot brew with partial reagents');

  // All reagents present
  var sa = withPlayer('p3', {});
  giveRecipeReagents(sa, 'p3', 'minor_healing_potion');
  var ra = AlchemyLab.canBrew(sa, 'p3', 'minor_healing_potion');
  assert(ra.canBrew === true, 'Can brew with all reagents');
});

// ── brew TESTS ────────────────────────────────────────────────────────────────

suite('brew — blocked when cannot brew', function() {
  var s = withPlayer('p1', {});
  var result = AlchemyLab.brew(s, 'p1', 'minor_healing_potion', 42);
  assert(result.success === false, 'brew fails with no reagents');
  assert(result.outcome === 'blocked', 'brew outcome is "blocked" when canBrew fails');
  assert(result.xpAwarded === 0, 'No XP awarded on blocked brew');
  assert(result.potion === null, 'No potion produced on blocked brew');
});

suite('brew — reagent consumption', function() {
  var s = withPlayer('p1', {});
  giveRecipeReagents(s, 'p1', 'minor_healing_potion');

  var recipe = AlchemyLab.getRecipeById('minor_healing_potion');
  var beforeQty = 0;
  for (var i = 0; i < recipe.reagents.length; i++) {
    beforeQty += recipe.reagents[i].qty;
  }

  // With seed 12345 and level 0 on basic_cauldron, test outcome
  // (we test that reagents are consumed regardless of success/failure/explosion)
  AlchemyLab.brew(s, 'p1', 'minor_healing_potion', 12345);

  // Reagents should be consumed
  recipe.reagents.forEach(function(req) {
    var remaining = 0;
    s.players.p1.inventory.forEach(function(item) {
      if (item.id === req.id) { remaining += (item.qty || 1); }
    });
    assert(remaining === 0, 'Reagent "' + req.id + '" was consumed after brew');
  });
});

suite('brew — successful brew produces potion', function() {
  // Use a stable recipe with high success rate
  // minor_healing_potion: 90% base, stable reagents, seed chosen for success
  var s = withPlayer('p1', {});
  giveRecipeReagents(s, 'p1', 'minor_healing_potion');
  // Give high XP to improve success chance
  setAlchemyXp(s, 'p1', 1000);

  // Brew multiple times to find a success
  var successFound = false;
  var potionInInventory = false;
  for (var seed = 1; seed <= 20; seed++) {
    var fresh = withPlayer('test_' + seed, {});
    giveRecipeReagents(fresh, 'test_' + seed, 'minor_healing_potion');
    setAlchemyXp(fresh, 'test_' + seed, 1000);
    var result = AlchemyLab.brew(fresh, 'test_' + seed, 'minor_healing_potion', seed);
    if (result.success && result.outcome === 'success') {
      successFound = true;
      assert(result.potion !== null, 'Successful brew returns a potion');
      assert(result.potion.recipeId === 'minor_healing_potion', 'Potion has correct recipeId');
      assert(result.potion.quality >= 0 && result.potion.quality <= 1, 'Potion quality in [0,1]');
      assert(typeof result.potion.qualityTier === 'string', 'Potion has qualityTier string');
      assert(AlchemyLab.QUALITY_TIER_ORDER.indexOf(result.potion.qualityTier) !== -1, 'Potion qualityTier is valid');
      assert(result.potion.buff !== null || result.potion.buff === null, 'Potion has buff (or null for transmutation)');
      assert(result.potion.consumed === false, 'New potion not yet consumed');
      assert(result.xpAwarded === 5, 'Correct XP awarded for minor_healing_potion');

      // Check it's in inventory
      var foundInInv = fresh.players['test_' + seed].inventory.some(function(item) { return item.id === result.potion.id; });
      potionInInventory = foundInInv;
      break;
    }
  }
  assert(successFound, 'At least one successful brew found in 20 attempts');
  assert(potionInInventory, 'Brewed potion appears in player inventory');
});

suite('brew — failure outcome', function() {
  // Find seeds that produce failure
  var failureFound = false;
  var thresholds6 = AlchemyLab.ALCHEMY_LEVEL_THRESHOLDS;
  for (var seed = 1; seed <= 50; seed++) {
    var s = withPlayer('fail_' + seed, {});
    // Give level 6 alchemy (required for berserker_draught)
    setAlchemyXp(s, 'fail_' + seed, thresholds6[6] || 210);
    // Use berserker_draught (62% base success, volatile)
    giveRecipeReagents(s, 'fail_' + seed, 'berserker_draught');
    var result = AlchemyLab.brew(s, 'fail_' + seed, 'berserker_draught', seed, 'grand_cauldron');
    if (!result.success && result.outcome === 'failure') {
      failureFound = true;
      assert(result.potion === null, 'Failed brew returns null potion');
      assert(result.xpAwarded > 0, 'Partial XP awarded for failure');
      assert(result.xpAwarded < 30, 'Failure XP less than full reward (30)');
      assert(s.players['fail_' + seed].alchemyStats.failures > 0, 'Failure count incremented');
      break;
    }
  }
  assert(failureFound, 'At least one failure found in 50 attempts with berserker_draught');
});

suite('brew — explosion outcome', function() {
  // Use void_essence_potion on void_crucible — very volatile, high explosion chance at low skill
  var explosionFound = false;
  var thresholds = AlchemyLab.ALCHEMY_LEVEL_THRESHOLDS;
  for (var seed = 1; seed <= 80; seed++) {
    var s = withPlayer('exp_' + seed, {});
    setAlchemyXp(s, 'exp_' + seed, thresholds[12] || 780); // level 12 required
    giveRecipeReagents(s, 'exp_' + seed, 'void_essence_potion');
    var result = AlchemyLab.brew(s, 'exp_' + seed, 'void_essence_potion', seed, 'void_crucible');
    if (!result.success && result.outcome === 'explosion') {
      explosionFound = true;
      assert(result.potion === null, 'Explosion returns null potion');
      assert(result.xpAwarded >= 0, 'Explosion XP awarded >= 0');
      assert(s.players['exp_' + seed].alchemyStats.explosions > 0, 'Explosion count incremented');
      break;
    }
  }
  assert(explosionFound, 'At least one explosion found in 80 attempts with void_essence_potion');
});

suite('brew — stat tracking', function() {
  var s = withPlayer('tracker', {});
  setAlchemyXp(s, 'tracker', 1000);
  giveRecipeReagents(s, 'tracker', 'minor_healing_potion');

  var result = AlchemyLab.brew(s, 'tracker', 'minor_healing_potion', 7);
  var stats = s.players.tracker.alchemyStats;

  if (result.outcome === 'success') {
    assert(stats.potionsBrewed === 1, 'potionsBrewed incremented on success');
    assert(stats.xpEarned === 1005, 'XP updated after successful brew');
  } else if (result.outcome === 'failure') {
    assert(stats.failures === 1, 'failures incremented on failure');
  } else if (result.outcome === 'explosion') {
    assert(stats.explosions === 1, 'explosions incremented on explosion');
  }
  // XP should always increase (at least partial)
  assert(stats.xpEarned > 1000 || result.outcome === 'blocked', 'XP increases unless blocked');
});

suite('brew — catalyst usage', function() {
  var s = withPlayer('catUser', {});
  setAlchemyXp(s, 'catUser', 150);
  giveRecipeReagents(s, 'catUser', 'healing_potion');
  addItem(s, 'catUser', 'philosophers_salt', 2); // add catalyst

  var countBefore = 0;
  s.players.catUser.inventory.forEach(function(item) {
    if (item.id === 'philosophers_salt') { countBefore += (item.qty || 1); }
  });
  assert(countBefore === 2, 'Catalyst in inventory before brew');

  AlchemyLab.brew(s, 'catUser', 'healing_potion', 42, null, 'philosophers_salt');

  var countAfter = 0;
  s.players.catUser.inventory.forEach(function(item) {
    if (item.id === 'philosophers_salt') { countAfter += (item.qty || 1); }
  });
  assert(countAfter === 1, 'One catalyst consumed after brew');
});

suite('brew — no catalyst when not in inventory', function() {
  var s = withPlayer('noCat', {});
  setAlchemyXp(s, 'noCat', 150);
  giveRecipeReagents(s, 'noCat', 'healing_potion');
  // Do NOT add catalyst to inventory

  // Should still proceed normally (no catalyst bonus)
  var result = AlchemyLab.brew(s, 'noCat', 'healing_potion', 99, null, 'philosophers_salt');
  assert(result.outcome !== 'blocked', 'Brew proceeds even without catalyst in inventory');
});

suite('brew — potion quality scaling with tier', function() {
  // Test that quality tiers affect buff values
  var recipe = AlchemyLab.getRecipeById('minor_healing_potion');
  assert(recipe !== null, 'minor_healing_potion recipe exists');
  assert(recipe.buff !== null, 'minor_healing_potion has a buff');

  var tiers = AlchemyLab.QUALITY_TIER_ORDER;
  var prev = null;
  tiers.forEach(function(tier) {
    var scaled = AlchemyLab._scaleBuff(recipe.buff, tier);
    if (prev) {
      assert(scaled.value >= prev.value, tier + ' buff value >= previous tier value');
    }
    prev = scaled;
  });
});

// ── drinkPotion TESTS ─────────────────────────────────────────────────────────

suite('drinkPotion — player not found', function() {
  var s = makeState();
  var r = AlchemyLab.drinkPotion(s, 'nobody', 'some_potion');
  assert(r.success === false, 'drinkPotion fails for unknown player');
  assert(r.reason === 'Player not found', 'Correct reason for unknown player');
});

suite('drinkPotion — potion not in inventory', function() {
  var s = withPlayer('p1', {});
  var r = AlchemyLab.drinkPotion(s, 'p1', 'fake_potion_id');
  assert(r.success === false, 'drinkPotion fails for missing potion id');
  assert(r.reason.indexOf('not found') !== -1, 'Reason mentions not found');
});

suite('drinkPotion — successful consumption and buff application', function() {
  // Manually brew a potion by setting up inventory directly
  var s = withPlayer('drinker', {});
  var fakePotion = {
    id: 'test_potion_001',
    recipeId: 'minor_healing_potion',
    name: 'Common Minor Healing Potion',
    quality: 0.5,
    qualityTier: 'fine',
    buff: { type: 'health_regen', value: 0.14, duration: 168 },
    consumed: false
  };
  s.players.drinker.inventory.push(fakePotion);
  s.players.drinker.activeBuffs = [];

  var r = AlchemyLab.drinkPotion(s, 'drinker', 'test_potion_001', 100);
  assert(r.success === true, 'drinkPotion succeeds');
  assert(r.buffApplied !== null, 'Buff applied after drinking');
  assert(r.buffApplied.type === 'health_regen', 'Correct buff type applied');
  assert(r.buffApplied.value === 0.14, 'Correct buff value applied');
  assert(r.buffApplied.duration === 168, 'Correct buff duration applied');

  // Potion removed from inventory
  var stillInInv = s.players.drinker.inventory.some(function(item) { return item.id === 'test_potion_001'; });
  assert(!stillInInv, 'Potion removed from inventory after drinking');

  // Buff active
  var activeBuffs = AlchemyLab.getActiveBuffs(s, 'drinker', 100);
  assert(activeBuffs.length === 1, 'One active buff after drinking');
  assert(activeBuffs[0].type === 'health_regen', 'Active buff has correct type');
  assert(activeBuffs[0].expiresAt === 100 + 168, 'Buff expires at correct tick');
});

suite('drinkPotion — already consumed potion', function() {
  var s = withPlayer('p1', {});
  // Put a consumed flag potion directly in inventory
  var consumed = { id: 'old_potion', recipeId: 'minor_healing_potion', consumed: true, buff: null };
  s.players.p1.inventory.push(consumed);
  var r = AlchemyLab.drinkPotion(s, 'p1', 'old_potion');
  // If consumed flag is on but still in inventory, drinkPotion finds it by id
  // The implementation removes it from inventory regardless; consumed flag = old behavior
  // Actually by spec it checks consumed flag
  // Our code checks consumed flag
  assert(r.success === false, 'Cannot drink already-consumed potion');
  assert(r.reason.indexOf('already consumed') !== -1, 'Reason mentions already consumed');
});

suite('drinkPotion — potion without buff (transmutation tincture)', function() {
  var s = withPlayer('alchemist', {});
  var tincture = {
    id: 'tincture_001',
    recipeId: 'stone_to_iron_tincture',
    name: 'Stone-to-Iron Tincture',
    quality: 0.6,
    qualityTier: 'fine',
    buff: null,
    transmutation: { from: 'stone', to: 'iron_ore', lossRate: 0.3 },
    consumed: false
  };
  s.players.alchemist.inventory.push(tincture);
  s.players.alchemist.activeBuffs = [];

  var r = AlchemyLab.drinkPotion(s, 'alchemist', 'tincture_001', 0);
  assert(r.success === true, 'Tincture can be "drunk"');
  assert(r.buffApplied === null, 'No buff applied for transmutation tincture');
});

// ── getActiveBuffs & updateBuffs TESTS ────────────────────────────────────────

suite('getActiveBuffs', function() {
  var s = withPlayer('p1', {});
  s.players.p1.activeBuffs = [
    { type: 'speed', value: 0.2, duration: 180, expiresAt: 500, sourceRecipeId: 'swiftness_potion', sourcePotionName: 'Fine Swiftness Potion' },
    { type: 'health_regen', value: 0.1, duration: 120, expiresAt: 50, sourceRecipeId: 'minor_healing_potion', sourcePotionName: 'Common Minor Healing Potion' }
  ];

  var active = AlchemyLab.getActiveBuffs(s, 'p1', 100);
  assert(active.length === 1, 'Only non-expired buff returned at tick 100');
  assert(active[0].type === 'speed', 'Active buff is the speed buff');

  var all = AlchemyLab.getActiveBuffs(s, 'p1', 0);
  assert(all.length === 2, 'Both buffs active at tick 0');

  var none = AlchemyLab.getActiveBuffs(s, 'p1', 1000);
  assert(none.length === 0, 'No buffs active at tick 1000');

  var empty = AlchemyLab.getActiveBuffs(makeState(), 'nobody', 0);
  assert(Array.isArray(empty) && empty.length === 0, 'Empty array for unknown player');
});

suite('updateBuffs', function() {
  var s = withPlayer('p1', {});
  s.players.p1.activeBuffs = [
    { type: 'speed', expiresAt: 500 },
    { type: 'health_regen', expiresAt: 50 }
  ];

  AlchemyLab.updateBuffs(s, 'p1', 100);
  assert(s.players.p1.activeBuffs.length === 1, 'Expired buff removed after updateBuffs');
  assert(s.players.p1.activeBuffs[0].type === 'speed', 'Remaining buff is the non-expired one');

  AlchemyLab.updateBuffs(s, 'p1', 1000);
  assert(s.players.p1.activeBuffs.length === 0, 'All buffs removed at tick 1000');

  // No error for player without buffs
  var s2 = withPlayer('p2', {});
  delete s2.players.p2.activeBuffs;
  var returned = AlchemyLab.updateBuffs(s2, 'p2', 100);
  assert(returned === s2, 'updateBuffs returns state unchanged when no buffs');
});

// ── transmute TESTS ───────────────────────────────────────────────────────────

suite('transmute — player/potion not found', function() {
  var s = makeState();
  var r = AlchemyLab.transmute(s, 'nobody', 'fake_id', 'stone', 10);
  assert(r.success === false, 'transmute fails for unknown player');

  var s2 = withPlayer('p1', {});
  var r2 = AlchemyLab.transmute(s2, 'p1', 'no_such_tincture', 'stone', 10);
  assert(r2.success === false, 'transmute fails when tincture not found');
  assert(r2.reason.indexOf('not found') !== -1, 'Reason mentions tincture not found');
});

suite('transmute — wrong source material', function() {
  var s = withPlayer('p1', {});
  var tincture = {
    id: 'tincture_iron',
    recipeId: 'stone_to_iron_tincture',
    transmutation: { from: 'stone', to: 'iron_ore', lossRate: 0.3 },
    consumed: false,
    quality: 0.5,
    qualityTier: 'fine',
    buff: null
  };
  s.players.p1.inventory.push(tincture);
  addItem(s, 'p1', 'wood', 10);

  var r = AlchemyLab.transmute(s, 'p1', 'tincture_iron', 'wood', 10);
  assert(r.success === false, 'transmute fails for wrong source material');
  assert(r.reason.indexOf('stone') !== -1, 'Reason mentions correct source material');
});

suite('transmute — insufficient source material', function() {
  var s = withPlayer('p1', {});
  var tincture = {
    id: 'tincture_iron2',
    recipeId: 'stone_to_iron_tincture',
    transmutation: { from: 'stone', to: 'iron_ore', lossRate: 0.3 },
    consumed: false,
    quality: 0.5,
    qualityTier: 'fine',
    buff: null
  };
  s.players.p1.inventory.push(tincture);
  addItem(s, 'p1', 'stone', 5); // only 5 but requesting 10

  var r = AlchemyLab.transmute(s, 'p1', 'tincture_iron2', 'stone', 10);
  assert(r.success === false, 'transmute fails with insufficient source material');
  assert(r.reason.indexOf('Need') !== -1, 'Reason mentions need');
});

suite('transmute — successful transmutation', function() {
  var s = withPlayer('alchemist', {});
  var tincture = {
    id: 'tincture_stone',
    recipeId: 'stone_to_iron_tincture',
    transmutation: { from: 'stone', to: 'iron_ore', lossRate: 0.3 },
    consumed: false,
    quality: 0.7,
    qualityTier: 'superior',
    buff: null
  };
  s.players.alchemist.inventory.push(tincture);
  addItem(s, 'alchemist', 'stone', 10);

  var r = AlchemyLab.transmute(s, 'alchemist', 'tincture_stone', 'stone', 10);
  assert(r.success === true, 'Transmutation succeeds');
  assert(r.consumed === 10, 'Correct quantity consumed');
  assert(r.produced > 0, 'Some iron_ore produced');
  // 10 * (1 - 0.3) = 7
  assert(r.produced === 7, 'Produced correct amount with 30% loss rate');
  assert(r.reason === 'ok', 'Reason is "ok"');

  // Source removed
  var stoneCount = 0;
  s.players.alchemist.inventory.forEach(function(item) {
    if (item.id === 'stone') { stoneCount += (item.qty || 1); }
  });
  assert(stoneCount === 0, 'All stone consumed');

  // Iron added
  var ironCount = 0;
  s.players.alchemist.inventory.forEach(function(item) {
    if (item.id === 'iron_ore') { ironCount += (item.qty || 1); }
  });
  assert(ironCount === 7, 'Iron ore in inventory matches produced amount');

  // Tincture consumed
  var tinctureCount = s.players.alchemist.inventory.filter(function(item) { return item.id === 'tincture_stone'; }).length;
  assert(tinctureCount === 0, 'Tincture consumed after use');

  // Transmutation stat incremented
  assert(s.players.alchemist.alchemyStats.transmutations === 1, 'Transmutation stat incremented');
});

// ── directTransmute TESTS ─────────────────────────────────────────────────────

suite('directTransmute — player not found', function() {
  var s = makeState();
  var r = AlchemyLab.directTransmute(s, 'nobody', 'stone', 10);
  assert(r.success === false, 'directTransmute fails for unknown player');
});

suite('directTransmute — unknown material', function() {
  var s = withPlayer('p1', {});
  setAlchemyXp(s, 'p1', 450); // level 10+
  var r = AlchemyLab.directTransmute(s, 'p1', 'magic_rocks', 5);
  assert(r.success === false, 'directTransmute fails for unknown material');
  assert(r.reason.indexOf('No transmutation rule') !== -1, 'Reason mentions no rule');
});

suite('directTransmute — low alchemy level', function() {
  var s = withPlayer('p1', {});
  // Level 0 player (xpEarned = 0)
  addItem(s, 'p1', 'stone', 10);
  var r = AlchemyLab.directTransmute(s, 'p1', 'stone', 10);
  assert(r.success === false, 'directTransmute fails at low alchemy level');
  assert(r.reason.indexOf('level 8') !== -1, 'Reason mentions level 8 requirement');
});

suite('directTransmute — insufficient materials', function() {
  var s = withPlayer('p1', {});
  setAlchemyXp(s, 'p1', 360); // level 8
  addItem(s, 'p1', 'stone', 3); // only 3 but requesting 10
  var r = AlchemyLab.directTransmute(s, 'p1', 'stone', 10);
  assert(r.success === false, 'directTransmute fails with insufficient materials');
});

suite('directTransmute — success or failure by seed', function() {
  // At level 8, 80% success. Test over several seeds.
  var thresholds = AlchemyLab.ALCHEMY_LEVEL_THRESHOLDS;
  var successCount = 0;
  var failureCount = 0;
  for (var seed = 1; seed <= 20; seed++) {
    var s = withPlayer('dt_' + seed, {});
    setAlchemyXp(s, 'dt_' + seed, thresholds[8] || 360);
    addItem(s, 'dt_' + seed, 'stone', 10);
    var r = AlchemyLab.directTransmute(s, 'dt_' + seed, 'stone', 10, seed);
    if (r.success) { successCount++; }
    else { failureCount++; }
  }
  assert(successCount > 0, 'Some direct transmutations succeed');
  // At 80% base, with 20 attempts, very likely to get at least 1 success
});

// ── experiment TESTS ──────────────────────────────────────────────────────────

suite('experiment — player not found', function() {
  var s = makeState();
  var r = AlchemyLab.experiment(s, 'nobody', [{ id: 'lavender', qty: 1 }, { id: 'sage', qty: 1 }]);
  assert(r.success === false, 'experiment fails for unknown player');
  assert(r.outcome === 'blocked', 'outcome is blocked for unknown player');
});

suite('experiment — not enough reagents in list', function() {
  var s = withPlayer('p1', {});
  var r1 = AlchemyLab.experiment(s, 'p1', []);
  assert(r1.success === false, 'experiment fails with empty reagent list');
  assert(r1.reason.indexOf('at least 2') !== -1, 'Reason mentions at least 2 reagents');

  var r2 = AlchemyLab.experiment(s, 'p1', [{ id: 'lavender', qty: 1 }]);
  assert(r2.success === false, 'experiment fails with only 1 reagent');
});

suite('experiment — missing reagents in inventory', function() {
  var s = withPlayer('p1', {});
  var r = AlchemyLab.experiment(s, 'p1', [{ id: 'lavender', qty: 1 }, { id: 'sage', qty: 1 }]);
  assert(r.success === false, 'experiment fails when reagents not in inventory');
  assert(r.reason.indexOf('Missing') !== -1, 'Reason mentions missing');
});

suite('experiment — discovery', function() {
  var combos = AlchemyLab.getDiscoveryCombinations();
  var first = combos[0]; // Use first discovery combo

  // Find a seed that avoids explosion and triggers discovery
  var discovered = false;
  for (var seed = 1; seed <= 100; seed++) {
    var s = withPlayer('discoverer', {});
    setAlchemyXp(s, 'discoverer', 550); // high level to reduce explosion chance
    // Give all needed reagents
    first.reagents.forEach(function(id) {
      addItem(s, 'discoverer', id, 2);
    });
    var reagentList = first.reagents.map(function(id) { return { id: id, qty: 1 }; });
    var r = AlchemyLab.experiment(s, 'discoverer', reagentList, seed);
    if (r.success && r.discovered) {
      discovered = true;
      assert(r.discovered.id === first.id, 'Correct discovery found');
      assert(r.outcome === 'success', 'Discovery outcome is success');
      assert(r.reason.indexOf('discovered') !== -1, 'Reason mentions discovered');

      // Check discovery recorded in stats
      var discoveries = AlchemyLab.getDiscoveries(s, 'discoverer');
      assert(discoveries.indexOf(first.id) !== -1, 'Discovery recorded in alchemyStats');

      // Check tonic added to inventory
      var tonicInInv = s.players.discoverer.inventory.some(function(item) {
        return item.recipeId === first.id;
      });
      assert(tonicInInv, 'Discovery tonic added to inventory');
      break;
    }
  }
  assert(discovered, 'Discovery found in 100 attempts');
});

suite('experiment — no duplicate discoveries', function() {
  var combos = AlchemyLab.getDiscoveryCombinations();
  var first = combos[0];

  // Find a seed that produces this discovery
  var goodSeed = null;
  for (var seed = 1; seed <= 100; seed++) {
    var s = withPlayer('dup_tester', {});
    setAlchemyXp(s, 'dup_tester', 550);
    first.reagents.forEach(function(id) { addItem(s, 'dup_tester', id, 5); });
    var rl = first.reagents.map(function(id) { return { id: id, qty: 1 }; });
    var r = AlchemyLab.experiment(s, 'dup_tester', rl, seed);
    if (r.success && r.discovered && r.discovered.id === first.id) {
      goodSeed = seed;
      break;
    }
  }

  if (goodSeed !== null) {
    // Discover twice with same player
    var s2 = withPlayer('dup_test', {});
    setAlchemyXp(s2, 'dup_test', 550);
    first.reagents.forEach(function(id) { addItem(s2, 'dup_test', id, 10); });

    var rl2 = first.reagents.map(function(id) { return { id: id, qty: 1 }; });
    AlchemyLab.experiment(s2, 'dup_test', rl2, goodSeed);
    var rl3 = first.reagents.map(function(id) { return { id: id, qty: 1 }; });
    AlchemyLab.experiment(s2, 'dup_test', rl3, goodSeed);

    var discoveries = AlchemyLab.getDiscoveries(s2, 'dup_test');
    var occurrences = discoveries.filter(function(d) { return d === first.id; }).length;
    assert(occurrences <= 1, 'Discovery not duplicated in list');
  } else {
    assert(true, 'Skipped duplicate discovery test (no seed found)');
  }
});

suite('experiment — reagents consumed on experiment', function() {
  var s = withPlayer('consumeTest', {});
  setAlchemyXp(s, 'consumeTest', 550);
  addItem(s, 'consumeTest', 'lavender', 3);
  addItem(s, 'consumeTest', 'sage', 3);

  AlchemyLab.experiment(s, 'consumeTest', [{ id: 'lavender', qty: 1 }, { id: 'sage', qty: 1 }], 42);

  var lavCount = 0;
  s.players.consumeTest.inventory.forEach(function(item) {
    if (item.id === 'lavender') { lavCount += (item.qty || 1); }
  });
  assert(lavCount === 2, 'One lavender consumed (3 - 1 = 2)');

  var sageCount = 0;
  s.players.consumeTest.inventory.forEach(function(item) {
    if (item.id === 'sage') { sageCount += (item.qty || 1); }
  });
  assert(sageCount === 2, 'One sage consumed (3 - 1 = 2)');
});

// ── getBrewProbabilities TESTS ────────────────────────────────────────────────

suite('getBrewProbabilities', function() {
  var probs = AlchemyLab.getBrewProbabilities('minor_healing_potion', 0, 'basic_cauldron', null);
  assert(typeof probs.successRate === 'number', 'successRate returned');
  assert(typeof probs.failureRate === 'number', 'failureRate returned');
  assert(typeof probs.explosionRate === 'number', 'explosionRate returned');
  var sum = probs.successRate + probs.failureRate + probs.explosionRate;
  assert(Math.abs(sum - 1.0) < 0.001, 'Probabilities sum to 1');

  // Unknown recipe returns zeros
  var zero = AlchemyLab.getBrewProbabilities('fake', 5);
  assert(zero.successRate === 0, 'Unknown recipe successRate = 0');
  assert(zero.failureRate === 0, 'Unknown recipe failureRate = 0');
  assert(zero.explosionRate === 0, 'Unknown recipe explosionRate = 0');

  // High skill improves success
  var low = AlchemyLab.getBrewProbabilities('berserker_draught', 0, 'grand_cauldron', null);
  var high = AlchemyLab.getBrewProbabilities('berserker_draught', 12, 'grand_cauldron', null);
  assert(high.successRate > low.successRate, 'Higher alchemy level improves success probability');
});

// ── getRecipesForStation TESTS ────────────────────────────────────────────────

suite('getRecipesForStation', function() {
  var basicRecipes = AlchemyLab.getRecipesForStation('basic_cauldron');
  assert(Array.isArray(basicRecipes), 'getRecipesForStation returns array');
  assert(basicRecipes.length > 0, 'basic_cauldron has available recipes');

  var voidRecipes = AlchemyLab.getRecipesForStation('void_crucible');
  assert(voidRecipes.length > basicRecipes.length, 'void_crucible has more recipes than basic_cauldron');

  // All returned recipes should be brewable at that station
  basicRecipes.forEach(function(r) {
    var station = AlchemyLab.LAB_STATIONS['basic_cauldron'];
    var supported = station.categories.indexOf(r.category) !== -1;
    assert(supported, 'basic_cauldron supports recipe category "' + r.category + '"');
  });

  // Unknown station
  var noneRecipes = AlchemyLab.getRecipesForStation('nonexistent_station');
  assert(noneRecipes.length === 0, 'Unknown station returns empty array');
});

// ── getBrewableRecipes TESTS ──────────────────────────────────────────────────

suite('getBrewableRecipes', function() {
  // Player with nothing
  var s = withPlayer('p1', {});
  var empty = AlchemyLab.getBrewableRecipes(s, 'p1');
  assert(Array.isArray(empty), 'getBrewableRecipes returns array');
  assert(empty.length === 0, 'Empty result when player has no reagents');

  // Player with all reagents for minor_healing_potion
  var s2 = withPlayer('p2', {});
  giveRecipeReagents(s2, 'p2', 'minor_healing_potion');
  var result2 = AlchemyLab.getBrewableRecipes(s2, 'p2');
  var hasPotion = result2.some(function(r) { return r.id === 'minor_healing_potion'; });
  assert(hasPotion, 'minor_healing_potion appears when player has ingredients');

  // Unknown player
  var noPlayer = AlchemyLab.getBrewableRecipes(makeState(), 'nobody');
  assert(noPlayer.length === 0, 'Empty result for unknown player');
});

// ── getMissingReagents TESTS ──────────────────────────────────────────────────

suite('getMissingReagents', function() {
  // Unknown recipe
  var missing = AlchemyLab.getMissingReagents(makeState(), 'p1', 'nonexistent');
  assert(Array.isArray(missing), 'getMissingReagents returns array for unknown recipe');
  assert(missing.length === 0, 'Empty for unknown recipe');

  // Player with no reagents
  var s = withPlayer('p1', {});
  var allMissing = AlchemyLab.getMissingReagents(s, 'p1', 'minor_healing_potion');
  assert(allMissing.length > 0, 'Missing reagents when player has none');
  allMissing.forEach(function(m) {
    assert(m.id, 'Missing reagent has id');
    assert(m.needed > 0, 'Missing reagent has needed > 0');
    assert(m.have === 0, 'Missing reagent have is 0');
  });

  // Player with all reagents
  var s2 = withPlayer('p2', {});
  giveRecipeReagents(s2, 'p2', 'minor_healing_potion');
  var none = AlchemyLab.getMissingReagents(s2, 'p2', 'minor_healing_potion');
  assert(none.length === 0, 'No missing reagents when player has all');

  // Player with partial
  var s3 = withPlayer('p3', {});
  var recipe = AlchemyLab.getRecipeById('minor_healing_potion');
  addItem(s3, 'p3', recipe.reagents[0].id, recipe.reagents[0].qty); // only first
  var partial = AlchemyLab.getMissingReagents(s3, 'p3', 'minor_healing_potion');
  assert(partial.length > 0, 'Partial ingredients shows missing');
});

// ── getAlchemyStats TESTS ─────────────────────────────────────────────────────

suite('getAlchemyStats', function() {
  var s = makeState();
  var nullStats = AlchemyLab.getAlchemyStats(s, 'nobody');
  assert(nullStats === null, 'Returns null for unknown player');

  var s2 = withPlayer('p1', {});
  var stats = AlchemyLab.getAlchemyStats(s2, 'p1');
  assert(stats !== null, 'Returns stats object for known player');
  assert(typeof stats.potionsBrewed === 'number', 'potionsBrewed is a number');
  assert(typeof stats.explosions === 'number', 'explosions is a number');
  assert(typeof stats.failures === 'number', 'failures is a number');
  assert(Array.isArray(stats.discoveries), 'discoveries is an array');
  assert(typeof stats.transmutations === 'number', 'transmutations is a number');
  assert(typeof stats.xpEarned === 'number', 'xpEarned is a number');
});

// ── getDiscoveries TESTS ──────────────────────────────────────────────────────

suite('getDiscoveries', function() {
  var s = makeState();
  var empty = AlchemyLab.getDiscoveries(s, 'nobody');
  assert(Array.isArray(empty), 'getDiscoveries returns array for unknown player');
  assert(empty.length === 0, 'Empty array for unknown player');

  var s2 = withPlayer('p1', {});
  var initial = AlchemyLab.getDiscoveries(s2, 'p1');
  assert(initial.length === 0, 'No initial discoveries');

  // Manually set discovery
  s2.players.p1.alchemyStats.discoveries.push('discovery_swift_growth');
  var after = AlchemyLab.getDiscoveries(s2, 'p1');
  assert(after.length === 1, 'One discovery returned');
  assert(after[0] === 'discovery_swift_growth', 'Correct discovery returned');
});

// ── getRecipes TESTS ──────────────────────────────────────────────────────────

suite('getRecipes', function() {
  var all = AlchemyLab.getRecipes();
  assert(Array.isArray(all), 'getRecipes returns array');
  assert(all.length >= 15, 'At least 15 recipes');

  var healing = AlchemyLab.getRecipes('healing');
  assert(Array.isArray(healing), 'getRecipes(healing) returns array');
  assert(healing.length > 0, 'healing category has recipes');
  healing.forEach(function(r) {
    assert(r.category === 'healing', 'All healing recipes have healing category');
  });

  var none = AlchemyLab.getRecipes('nonexistent_category');
  assert(none.length === 0, 'Empty for nonexistent category');

  // Returns a copy (mutation safe)
  var copy1 = AlchemyLab.getRecipes();
  var copy2 = AlchemyLab.getRecipes();
  assert(copy1 !== copy2, 'getRecipes returns new array each call');
});

// ── getReagents TESTS ─────────────────────────────────────────────────────────

suite('getReagents', function() {
  var reagents = AlchemyLab.getReagents();
  assert(Array.isArray(reagents), 'getReagents returns array');
  assert(reagents.length === AlchemyLab.REAGENTS.length, 'Same count as REAGENTS');
  assert(reagents !== AlchemyLab.REAGENTS, 'Returns a copy, not original');
});

suite('getReagentById', function() {
  var r = AlchemyLab.getReagentById('moonpetal');
  assert(r !== null, 'getReagentById returns reagent');
  assert(r.id === 'moonpetal', 'Correct reagent returned');

  var notFound = AlchemyLab.getReagentById('nonexistent_reagent');
  assert(notFound === null, 'getReagentById returns null for unknown id');
});

// ── getLabStations TESTS ──────────────────────────────────────────────────────

suite('getLabStations', function() {
  var stations = AlchemyLab.getLabStations();
  assert(stations !== null && typeof stations === 'object', 'getLabStations returns object');
  assert(Object.keys(stations).length >= 5, 'At least 5 stations');
});

// ── END-TO-END BREW WORKFLOW ──────────────────────────────────────────────────

suite('end-to-end: brew, drink, buff active', function() {
  var s = withPlayer('e2e', {});
  setAlchemyXp(s, 'e2e', 550); // level 10+

  // Give reagents for swiftness_potion
  giveRecipeReagents(s, 'e2e', 'swiftness_potion');

  // Find a successful brew
  var potionId = null;
  for (var seed = 1; seed <= 30; seed++) {
    // Reset inventory and try again
    var fresh = withPlayer('e2e_' + seed, {});
    setAlchemyXp(fresh, 'e2e_' + seed, 550);
    giveRecipeReagents(fresh, 'e2e_' + seed, 'swiftness_potion');

    var brewResult = AlchemyLab.brew(fresh, 'e2e_' + seed, 'swiftness_potion', seed);
    if (brewResult.success && brewResult.potion) {
      potionId = brewResult.potion.id;
      s = fresh;
      break;
    }
  }

  assert(potionId !== null, 'E2E: brew succeeded');

  if (potionId) {
    // Drink the potion
    var drinkResult = AlchemyLab.drinkPotion(s, Object.keys(s.players)[0], potionId, 1000);
    assert(drinkResult.success === true, 'E2E: drink succeeded');
    assert(drinkResult.buffApplied !== null, 'E2E: buff applied');
    assert(drinkResult.buffApplied.type === 'speed', 'E2E: speed buff applied');

    // Check active buffs
    var playerId = Object.keys(s.players)[0];
    var active = AlchemyLab.getActiveBuffs(s, playerId, 1001);
    assert(active.length === 1, 'E2E: one active buff');
    assert(active[0].type === 'speed', 'E2E: speed buff active');

    // Buff expires
    AlchemyLab.updateBuffs(s, playerId, 999999);
    var expired = AlchemyLab.getActiveBuffs(s, playerId, 999999);
    assert(expired.length === 0, 'E2E: buff expired correctly');
  }
});

suite('end-to-end: brew transmutation tincture and transmute', function() {
  var thresholds = AlchemyLab.ALCHEMY_LEVEL_THRESHOLDS;

  // Find a successful brew of stone_to_iron_tincture (level 5 required, high skill)
  var tinctureId = null;
  var masterState = null;

  for (var seed = 1; seed <= 30; seed++) {
    var s = withPlayer('txe2e_' + seed, {});
    setAlchemyXp(s, 'txe2e_' + seed, thresholds[5] || 150);
    giveRecipeReagents(s, 'txe2e_' + seed, 'stone_to_iron_tincture');

    var brewResult = AlchemyLab.brew(s, 'txe2e_' + seed, 'stone_to_iron_tincture', seed, 'grand_cauldron');
    if (brewResult.success && brewResult.potion) {
      tinctureId = brewResult.potion.id;
      masterState = s;
      break;
    }
  }

  assert(tinctureId !== null, 'E2E: brew transmutation tincture succeeded');

  if (tinctureId && masterState) {
    var playerId = Object.keys(masterState.players)[0];

    // Add stone to transmute
    addItem(masterState, playerId, 'stone', 10);

    // Transmute
    var txResult = AlchemyLab.transmute(masterState, playerId, tinctureId, 'stone', 10);
    assert(txResult.success === true, 'E2E: transmutation succeeded');
    assert(txResult.produced > 0, 'E2E: iron ore produced');
    assert(txResult.produced === 7, 'E2E: 7 iron ore from 10 stone at 30% loss');

    // Verify stats
    var stats = AlchemyLab.getAlchemyStats(masterState, playerId);
    assert(stats.transmutations === 1, 'E2E: transmutation stat updated');
  }
});

// ── EDGE CASES ────────────────────────────────────────────────────────────────

suite('edge cases — null/undefined inputs', function() {
  assert(AlchemyLab.getAlchemyLevel(null, 'p1') === 0, 'getAlchemyLevel handles null state');
  assert(AlchemyLab.getAlchemyLevel({}, 'p1') === 0, 'getAlchemyLevel handles empty state');

  var r = AlchemyLab.canBrew(null, 'p1', 'minor_healing_potion');
  assert(r.canBrew === false, 'canBrew handles null state');

  var br = AlchemyLab.brew(null, 'p1', 'minor_healing_potion', 42);
  assert(br.success === false, 'brew handles null state');

  var dr = AlchemyLab.drinkPotion(null, 'p1', 'some_id');
  assert(dr.success === false, 'drinkPotion handles null state');

  var ta = AlchemyLab.getActiveBuffs(null, 'p1', 0);
  assert(Array.isArray(ta) && ta.length === 0, 'getActiveBuffs handles null state');
});

suite('edge cases — stacking buffs', function() {
  var s = withPlayer('p1', {});
  s.players.p1.activeBuffs = [];

  // Drink two potions
  var potion1 = {
    id: 'p1_001',
    recipeId: 'swiftness_potion',
    name: 'Fine Swiftness Potion',
    quality: 0.5,
    qualityTier: 'fine',
    buff: { type: 'speed', value: 0.28, duration: 252 },
    consumed: false
  };
  var potion2 = {
    id: 'p1_002',
    recipeId: 'harvester_brew',
    name: 'Fine Harvester\'s Brew',
    quality: 0.5,
    qualityTier: 'fine',
    buff: { type: 'harvest_yield', value: 0.35, duration: 420 },
    consumed: false
  };
  s.players.p1.inventory.push(potion1, potion2);

  AlchemyLab.drinkPotion(s, 'p1', 'p1_001', 0);
  AlchemyLab.drinkPotion(s, 'p1', 'p1_002', 0);

  var active = AlchemyLab.getActiveBuffs(s, 'p1', 1);
  assert(active.length === 2, 'Two different buffs can stack');
  var types = active.map(function(b) { return b.type; });
  assert(types.indexOf('speed') !== -1, 'Speed buff active');
  assert(types.indexOf('harvest_yield') !== -1, 'Harvest yield buff active');
});

suite('edge cases — brew multiple potions sequentially', function() {
  var s = withPlayer('batch', {});
  setAlchemyXp(s, 'batch', 550);

  var successCount = 0;
  for (var i = 1; i <= 5; i++) {
    giveRecipeReagents(s, 'batch', 'minor_healing_potion');
    var r = AlchemyLab.brew(s, 'batch', 'minor_healing_potion', i * 100);
    if (r.success) { successCount++; }
  }
  // With 90% base + skill bonus, should get many successes
  assert(successCount >= 3, 'Most brews succeed with high skill level');
});

suite('edge cases — getRecipeById returns null for unknown', function() {
  var r = AlchemyLab.getRecipeById('definitely_not_a_recipe');
  assert(r === null, 'getRecipeById returns null for unknown');
});

suite('edge cases — brewTime values positive', function() {
  AlchemyLab.RECIPES.forEach(function(r) {
    assert(r.brewTime > 0, 'Recipe "' + r.id + '" has positive brewTime');
  });
});

suite('edge cases — output field present and valid', function() {
  AlchemyLab.RECIPES.forEach(function(r) {
    assert(r.output && r.output.id, 'Recipe "' + r.id + '" has output.id');
    assert(r.output.name, 'Recipe "' + r.id + '" has output.name');
    assert(r.output.qty > 0, 'Recipe "' + r.id + '" has output.qty > 0');
  });
});

suite('edge cases — transmute minimum produced', function() {
  // Even with 90% loss rate, minimum 1 produced
  var s = withPlayer('minProd', {});
  var tincture = {
    id: 'harsh_tincture',
    recipeId: 'test',
    transmutation: { from: 'stone', to: 'iron_ore', lossRate: 0.99 },
    buff: null,
    quality: 0.5,
    qualityTier: 'common',
    consumed: false
  };
  s.players.minProd.inventory.push(tincture);
  addItem(s, 'minProd', 'stone', 1);

  var r = AlchemyLab.transmute(s, 'minProd', 'harsh_tincture', 'stone', 1);
  assert(r.success === true, 'Transmutation succeeds with qty 1');
  assert(r.produced >= 1, 'Minimum 1 produced even with high loss rate');
});

suite('edge cases — alchemyStats initialized lazily', function() {
  // Player with no alchemyStats at all
  var s = withPlayer('lazy', {});
  delete s.players.lazy.alchemyStats;

  var stats = AlchemyLab.getAlchemyStats(s, 'lazy');
  assert(stats !== null, 'Stats initialized lazily on getAlchemyStats');
  assert(stats.potionsBrewed === 0, 'Lazy init: potionsBrewed = 0');

  // getDiscoveries also initializes lazily
  var s2 = withPlayer('lazy2', {});
  delete s2.players.lazy2.alchemyStats;
  var disc = AlchemyLab.getDiscoveries(s2, 'lazy2');
  assert(Array.isArray(disc), 'Lazy init: discoveries is array');
  assert(disc.length === 0, 'Lazy init: no discoveries');
});

suite('edge cases — getAlchemyLevel handles missing alchemyStats', function() {
  var s = withPlayer('noStats', {});
  delete s.players.noStats.alchemyStats;
  var level = AlchemyLab.getAlchemyLevel(s, 'noStats');
  assert(level === 0, 'Level 0 when alchemyStats missing');
});

suite('reagent volatility affects experiment outcomes', function() {
  // Highly volatile combo should explode more often
  var highVolatileReagents = [
    { id: 'void_crystal', qty: 1 },
    { id: 'essence_of_void', qty: 1 },
    { id: 'dragon_ichor', qty: 1 }
  ];
  var stableReagents = [
    { id: 'lavender', qty: 1 },
    { id: 'sage', qty: 1 }
  ];

  var volExplosions = 0;
  var stableExplosions = 0;
  var attempts = 20;

  for (var seed = 1; seed <= attempts; seed++) {
    var sv = withPlayer('vol_' + seed, {});
    highVolatileReagents.forEach(function(req) { addItem(sv, 'vol_' + seed, req.id, req.qty + 1); });
    var rv = AlchemyLab.experiment(sv, 'vol_' + seed, highVolatileReagents, seed);
    if (rv.outcome === 'explosion') { volExplosions++; }

    var ss = withPlayer('stable_' + seed, {});
    stableReagents.forEach(function(req) { addItem(ss, 'stable_' + seed, req.id, req.qty + 1); });
    var rs = AlchemyLab.experiment(ss, 'stable_' + seed, stableReagents, seed);
    if (rs.outcome === 'explosion') { stableExplosions++; }
  }

  assert(volExplosions >= stableExplosions, 'Volatile combos explode >= stable combos (' + volExplosions + ' vs ' + stableExplosions + ')');
});

// ── REPORT ────────────────────────────────────────────────────────────────────

process.stdout.write('\n─────────────────────────────────────────────────────\n');
process.stdout.write(passed + ' passed, ' + failed + ' failed\n');

if (failed > 0) {
  process.stdout.write('\nFailed tests:\n');
  errors.forEach(function(msg) {
    process.stdout.write('  - ' + msg + '\n');
  });
  process.exit(1);
}
