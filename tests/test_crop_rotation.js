// test_crop_rotation.js — Comprehensive tests for CropRotation module
// 200+ tests covering: catalog structure, soil nutrients, companion/antagonist
// planting, seasonal validity, yield calculation, soil restoration,
// multi-season planner, PRNG determinism, and edge cases.
'use strict';

var CropRotation = require('../src/js/crop_rotation');

// ── Test runner ────────────────────────────────────────────────────────────

var passed = 0;
var failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log('  ok - ' + msg);
  } else {
    failed++;
    console.error('  FAIL - ' + msg);
  }
}

function assertEq(a, b, msg) {
  assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')');
}

function assertClose(a, b, tol, msg) {
  assert(Math.abs(a - b) <= (tol || 0.01), msg + ' (expected ~' + b + ', got ' + a + ')');
}

function assertGt(a, b, msg) {
  assert(a > b, msg + ' (expected > ' + b + ', got ' + a + ')');
}

function assertGte(a, b, msg) {
  assert(a >= b, msg + ' (expected >= ' + b + ', got ' + a + ')');
}

function assertLte(a, b, msg) {
  assert(a <= b, msg + ' (expected <= ' + b + ', got ' + a + ')');
}

function suite(name, fn) {
  console.log('\n=== ' + name + ' ===');
  fn();
}

function reset() {
  CropRotation._reset();
}

// ── Unique plot ID helper ──────────────────────────────────────────────────

var _pid = 0;
function pid() { return 'plot_' + (++_pid); }

// ══════════════════════════════════════════════════════════════════════════
// 1. CROP CATALOG
// ══════════════════════════════════════════════════════════════════════════

suite('CROP CATALOG — structure', function() {
  reset();

  assert(Array.isArray(CropRotation.CROP_CATALOG), 'CROP_CATALOG is an array');
  assertGte(CropRotation.CROP_CATALOG.length, 20, 'CROP_CATALOG has at least 20 crops');

  // Unique IDs
  var ids = CropRotation.CROP_CATALOG.map(function(c) { return c.id; });
  var unique = {};
  var dupFound = false;
  ids.forEach(function(id) { if (unique[id]) dupFound = true; unique[id] = true; });
  assert(!dupFound, 'All crop IDs are unique');

  // Required fields on every crop
  var required = ['id', 'name', 'category', 'seasons', 'npkDemand', 'npkFix', 'baseYield', 'growthDays', 'value', 'description'];
  CropRotation.CROP_CATALOG.forEach(function(c) {
    required.forEach(function(f) {
      assert(c[f] !== undefined, 'Crop ' + c.id + ' has field: ' + f);
    });
  });

  // seasons is array with at least one entry
  CropRotation.CROP_CATALOG.forEach(function(c) {
    assert(Array.isArray(c.seasons) && c.seasons.length > 0, c.id + '.seasons is non-empty array');
  });

  // All seasons values are valid
  var validSeasons = ['spring', 'summer', 'autumn', 'winter'];
  CropRotation.CROP_CATALOG.forEach(function(c) {
    c.seasons.forEach(function(s) {
      assert(validSeasons.indexOf(s) !== -1, c.id + ' season "' + s + '" is valid');
    });
  });

  // npkDemand has N, P, K
  CropRotation.CROP_CATALOG.forEach(function(c) {
    assert(c.npkDemand.N !== undefined, c.id + '.npkDemand.N defined');
    assert(c.npkDemand.P !== undefined, c.id + '.npkDemand.P defined');
    assert(c.npkDemand.K !== undefined, c.id + '.npkDemand.K defined');
  });

  // npkFix has N, P, K
  CropRotation.CROP_CATALOG.forEach(function(c) {
    assert(c.npkFix.N !== undefined, c.id + '.npkFix.N defined');
    assert(c.npkFix.P !== undefined, c.id + '.npkFix.P defined');
    assert(c.npkFix.K !== undefined, c.id + '.npkFix.K defined');
  });

  // baseYield > 0
  CropRotation.CROP_CATALOG.forEach(function(c) {
    assertGt(c.baseYield, 0, c.id + '.baseYield > 0');
  });

  // growthDays > 0
  CropRotation.CROP_CATALOG.forEach(function(c) {
    assertGt(c.growthDays, 0, c.id + '.growthDays > 0');
  });

  // value > 0
  CropRotation.CROP_CATALOG.forEach(function(c) {
    assertGt(c.value, 0, c.id + '.value > 0');
  });

  // npkFix >= 0 (no negative fixation)
  CropRotation.CROP_CATALOG.forEach(function(c) {
    assert(c.npkFix.N >= 0 && c.npkFix.P >= 0 && c.npkFix.K >= 0,
      c.id + '.npkFix values are non-negative');
  });

  // Verify specific crops exist
  var cropIds = CropRotation.CROP_CATALOG.map(function(c) { return c.id; });
  ['carrot', 'potato', 'wheat', 'bean', 'pea', 'clover', 'tomato', 'corn',
   'mint', 'rosemary', 'basil', 'lavender', 'kale', 'spinach', 'lettuce',
   'barley', 'rice', 'pumpkin', 'mustard', 'buckwheat'].forEach(function(id) {
    assert(cropIds.indexOf(id) !== -1, 'Catalog contains crop: ' + id);
  });

  // Categories present
  var categories = CropRotation.CROP_CATALOG.map(function(c) { return c.category; });
  ['root_vegetable', 'leafy_green', 'grain', 'legume', 'fruiting_vegetable', 'herb', 'cover_crop'].forEach(function(cat) {
    assert(categories.indexOf(cat) !== -1, 'Category "' + cat + '" is present in catalog');
  });

  // Legumes must fix N > 0
  var legumes = CropRotation.CROP_CATALOG.filter(function(c) { return c.category === 'legume'; });
  assert(legumes.length >= 3, 'At least 3 legumes in catalog');
  legumes.forEach(function(c) {
    assertGt(c.npkFix.N, 0, 'Legume ' + c.id + ' fixes nitrogen');
  });

  // Cover crops should fix some nutrients
  var coverCrops = CropRotation.CROP_CATALOG.filter(function(c) { return c.category === 'cover_crop'; });
  assert(coverCrops.length >= 2, 'At least 2 cover crops in catalog');
});

// ══════════════════════════════════════════════════════════════════════════
// 2. COMPANION & ANTAGONIST PAIRS
// ══════════════════════════════════════════════════════════════════════════

suite('COMPANION_PAIRS — structure', function() {
  reset();

  assert(Array.isArray(CropRotation.COMPANION_PAIRS), 'COMPANION_PAIRS is an array');
  assertGte(CropRotation.COMPANION_PAIRS.length, 10, 'At least 10 companion/antagonist pairs');

  // Required fields
  CropRotation.COMPANION_PAIRS.forEach(function(cp, i) {
    assert(Array.isArray(cp.pair) && cp.pair.length === 2, 'Pair[' + i + '] has 2 crops');
    assert(typeof cp.bonus === 'number', 'Pair[' + i + '] has numeric bonus');
    assert(cp.type === 'companion' || cp.type === 'antagonist', 'Pair[' + i + '] type is valid');
    assert(typeof cp.description === 'string', 'Pair[' + i + '] has description');
  });

  // Companions have positive bonus
  var companions = CropRotation.COMPANION_PAIRS.filter(function(cp) { return cp.type === 'companion'; });
  assert(companions.length >= 5, 'At least 5 companion pairs');
  companions.forEach(function(cp) {
    assertGt(cp.bonus, 0, 'Companion pair ' + cp.pair.join('+') + ' has positive bonus');
  });

  // Antagonists have negative bonus
  var antagonists = CropRotation.COMPANION_PAIRS.filter(function(cp) { return cp.type === 'antagonist'; });
  assert(antagonists.length >= 3, 'At least 3 antagonist pairs');
  antagonists.forEach(function(cp) {
    assert(cp.bonus < 0, 'Antagonist pair ' + cp.pair.join('+') + ' has negative bonus');
  });

  // Specific companion pairs exist
  var rel1 = CropRotation.getCropRelationship('mint', 'rosemary');
  assert(rel1 !== null, 'mint+rosemary companion relationship exists');
  assert(rel1.type === 'companion', 'mint+rosemary is a companion');
  assertClose(rel1.bonus, 0.15, 0.001, 'mint+rosemary bonus is 0.15');

  var rel2 = CropRotation.getCropRelationship('basil', 'tomato');
  assert(rel2 !== null, 'basil+tomato relationship exists');
  assert(rel2.type === 'companion', 'basil+tomato is companion');
  assertGt(rel2.bonus, 0, 'basil+tomato has positive bonus');

  // Specific antagonist pairs exist
  var relAnt = CropRotation.getCropRelationship('potato', 'tomato');
  assert(relAnt !== null, 'potato+tomato relationship exists');
  assert(relAnt.type === 'antagonist', 'potato+tomato is antagonist');
  assert(relAnt.bonus < 0, 'potato+tomato has negative bonus');

  var relAnt2 = CropRotation.getCropRelationship('pea', 'onion');
  assert(relAnt2 !== null, 'pea+onion relationship exists');
  assert(relAnt2.type === 'antagonist', 'pea+onion is antagonist');
});

suite('getCropRelationship — lookup', function() {
  reset();

  // Order-insensitive
  var relA = CropRotation.getCropRelationship('corn', 'bean');
  var relB = CropRotation.getCropRelationship('bean', 'corn');
  assert(relA !== null, 'corn+bean relationship found');
  assert(relB !== null, 'bean+corn relationship found (reverse)');
  assertEq(relA.bonus, relB.bonus, 'Lookup is order-insensitive for bonus');

  // Unknown pair returns null
  var relNone = CropRotation.getCropRelationship('carrot', 'rice');
  assert(relNone === null, 'Unknown pair returns null');

  // Single unknown crop returns null
  var relUnk = CropRotation.getCropRelationship('nonexistent_crop', 'corn');
  assert(relUnk === null, 'Unknown crop ID returns null');
});

suite('getRelationshipsForCrop — all relationships', function() {
  reset();

  var mintRels = CropRotation.getRelationshipsForCrop('mint');
  assertGte(mintRels.length, 2, 'mint has at least 2 relationships');

  var cornRels = CropRotation.getRelationshipsForCrop('corn');
  assertGte(cornRels.length, 2, 'corn has at least 2 relationships');
  cornRels.forEach(function(r) {
    assert(r.pair.indexOf('corn') !== -1, 'corn relationships all include corn');
  });

  // Unknown crop returns empty array
  var noRels = CropRotation.getRelationshipsForCrop('nonexistent');
  assertEq(noRels.length, 0, 'Unknown crop returns empty array');
});

// ══════════════════════════════════════════════════════════════════════════
// 3. SEASONAL VALIDITY
// ══════════════════════════════════════════════════════════════════════════

suite('canPlantInSeason — validity checks', function() {
  reset();

  // Corn only in summer
  assert(CropRotation.canPlantInSeason('corn', 'summer'), 'corn plantable in summer');
  assert(!CropRotation.canPlantInSeason('corn', 'winter'), 'corn NOT plantable in winter');
  assert(!CropRotation.canPlantInSeason('corn', 'spring'), 'corn NOT plantable in spring');
  assert(!CropRotation.canPlantInSeason('corn', 'autumn'), 'corn NOT plantable in autumn');

  // Carrot in spring and autumn
  assert(CropRotation.canPlantInSeason('carrot', 'spring'), 'carrot plantable in spring');
  assert(CropRotation.canPlantInSeason('carrot', 'autumn'), 'carrot plantable in autumn');
  assert(!CropRotation.canPlantInSeason('carrot', 'summer'), 'carrot NOT plantable in summer');
  assert(!CropRotation.canPlantInSeason('carrot', 'winter'), 'carrot NOT plantable in winter');

  // Kale in spring, autumn, winter
  assert(CropRotation.canPlantInSeason('kale', 'spring'), 'kale plantable in spring');
  assert(CropRotation.canPlantInSeason('kale', 'autumn'), 'kale plantable in autumn');
  assert(CropRotation.canPlantInSeason('kale', 'winter'), 'kale plantable in winter');
  assert(!CropRotation.canPlantInSeason('kale', 'summer'), 'kale NOT plantable in summer');

  // Unknown crop always returns false
  assert(!CropRotation.canPlantInSeason('unknown_crop', 'spring'), 'Unknown crop returns false');

  // Turnip in winter (cold-tolerant)
  assert(CropRotation.canPlantInSeason('turnip', 'winter'), 'turnip plantable in winter');

  // Basil — summer only
  assert(CropRotation.canPlantInSeason('basil', 'summer'), 'basil plantable in summer');
  assert(!CropRotation.canPlantInSeason('basil', 'winter'), 'basil NOT plantable in winter');
  assert(!CropRotation.canPlantInSeason('basil', 'spring'), 'basil NOT plantable in spring');

  // Mint — spring, summer, autumn
  assert(CropRotation.canPlantInSeason('mint', 'spring'), 'mint plantable in spring');
  assert(CropRotation.canPlantInSeason('mint', 'summer'), 'mint plantable in summer');
  assert(CropRotation.canPlantInSeason('mint', 'autumn'), 'mint plantable in autumn');
  assert(!CropRotation.canPlantInSeason('mint', 'winter'), 'mint NOT plantable in winter');
});

suite('getCropsForSeason — filtered catalog', function() {
  reset();

  var summerCrops = CropRotation.getCropsForSeason('summer');
  assert(Array.isArray(summerCrops), 'getCropsForSeason returns array');
  assertGte(summerCrops.length, 5, 'At least 5 crops plantable in summer');
  summerCrops.forEach(function(c) {
    assert(c.seasons.indexOf('summer') !== -1, c.id + ' is a valid summer crop');
  });

  var winterCrops = CropRotation.getCropsForSeason('winter');
  assertGte(winterCrops.length, 1, 'At least 1 crop plantable in winter');
  winterCrops.forEach(function(c) {
    assert(c.seasons.indexOf('winter') !== -1, c.id + ' is valid winter crop');
  });

  // Corn must appear in summer
  var summerIds = summerCrops.map(function(c) { return c.id; });
  assert(summerIds.indexOf('corn') !== -1, 'corn appears in summer crops');

  // Kale must appear in winter
  var winterIds = winterCrops.map(function(c) { return c.id; });
  assert(winterIds.indexOf('kale') !== -1, 'kale appears in winter crops');

  // Spring crops include carrot and pea
  var springCrops = CropRotation.getCropsForSeason('spring');
  var springIds = springCrops.map(function(c) { return c.id; });
  assert(springIds.indexOf('carrot') !== -1, 'carrot in spring crops');
  assert(springIds.indexOf('pea') !== -1, 'pea in spring crops');

  // Autumn crops include turnip
  var autumnCrops = CropRotation.getCropsForSeason('autumn');
  var autumnIds = autumnCrops.map(function(c) { return c.id; });
  assert(autumnIds.indexOf('turnip') !== -1, 'turnip in autumn crops');
});

// ══════════════════════════════════════════════════════════════════════════
// 4. SOIL NUTRIENT TRACKING
// ══════════════════════════════════════════════════════════════════════════

suite('DEFAULT_SOIL — constants', function() {
  reset();

  var d = CropRotation.DEFAULT_SOIL;
  assert(d.nitrogen >= 50 && d.nitrogen <= 80, 'Default nitrogen in reasonable range');
  assert(d.phosphorus >= 50 && d.phosphorus <= 80, 'Default phosphorus in reasonable range');
  assert(d.potassium >= 50 && d.potassium <= 80, 'Default potassium in reasonable range');
  assert(d.organicMatter >= 20 && d.organicMatter <= 80, 'Default organicMatter in range');
  assertEq(CropRotation.SOIL_MAX, 100, 'SOIL_MAX is 100');
  assertEq(CropRotation.SOIL_MIN, 0, 'SOIL_MIN is 0');
});

suite('getOrCreatePlot — initialization', function() {
  reset();

  var p = pid();
  var plot = CropRotation.getOrCreatePlot(p);
  assert(plot !== null && plot !== undefined, 'getOrCreatePlot returns a plot');
  assert(typeof plot.soil === 'object', 'Plot has soil object');
  assert(Array.isArray(plot.history), 'Plot has history array');
  assertEq(plot.history.length, 0, 'New plot has empty history');
  assertEq(plot.fallowSeasons, 0, 'New plot has 0 fallow seasons');

  // Second call returns same plot (not new)
  var plot2 = CropRotation.getOrCreatePlot(p);
  assertEq(plot2.id, plot.id, 'Same plot returned for same ID');

  // Soil values are set
  var soil = plot.soil;
  assert(soil.nitrogen > 0, 'New plot soil has nitrogen');
  assert(soil.phosphorus > 0, 'New plot soil has phosphorus');
  assert(soil.potassium > 0, 'New plot soil has potassium');
  assert(soil.organicMatter >= 0, 'New plot soil has organicMatter');
});

suite('getSoil — getter returns copy', function() {
  reset();

  var p = pid();
  var soil = CropRotation.getSoil(p);
  assert(typeof soil === 'object', 'getSoil returns object');
  assert(soil.nitrogen !== undefined, 'Returned soil has nitrogen');
  assert(soil.phosphorus !== undefined, 'Returned soil has phosphorus');
  assert(soil.potassium !== undefined, 'Returned soil has potassium');

  // Mutating returned soil does not affect internal state
  var originalN = soil.nitrogen;
  soil.nitrogen = 999;
  var soil2 = CropRotation.getSoil(p);
  assertEq(soil2.nitrogen, originalN, 'getSoil returns a copy (mutation safe)');
});

suite('soilHealthScore — calculation', function() {
  reset();

  // Perfect soil = score near 100
  var perfectSoil = { nitrogen: 100, phosphorus: 100, potassium: 100, organicMatter: 100 };
  var perfect = CropRotation.soilHealthScore(perfectSoil);
  assertGte(perfect, 90, 'Perfect soil score >= 90');
  assertLte(perfect, 100, 'Perfect soil score <= 100');

  // Depleted soil = low score
  var depletedSoil = { nitrogen: 0, phosphorus: 0, potassium: 0, organicMatter: 0 };
  var depleted = CropRotation.soilHealthScore(depletedSoil);
  assertEq(depleted, 0, 'Completely depleted soil score = 0');

  // Average soil
  var avgSoil = { nitrogen: 60, phosphorus: 60, potassium: 60, organicMatter: 40 };
  var avg = CropRotation.soilHealthScore(avgSoil);
  assertGt(avg, 30, 'Average soil score > 30');
  assertLte(avg, 100, 'Average soil score <= 100');

  // Score increases with better soil
  var goodSoil = { nitrogen: 80, phosphorus: 80, potassium: 80, organicMatter: 60 };
  var good = CropRotation.soilHealthScore(goodSoil);
  assertGt(good, avg, 'Better soil has higher health score');
});

// ══════════════════════════════════════════════════════════════════════════
// 5. YIELD CALCULATION
// ══════════════════════════════════════════════════════════════════════════

suite('calculateYield — basic', function() {
  reset();

  var p = pid();
  var result = CropRotation.calculateYield(p, 'carrot', 'spring', []);
  assert(result.yield > 0, 'calculateYield returns positive yield for valid crop/season');
  assert(result.breakdown !== undefined, 'calculateYield returns breakdown');
  assertGt(result.breakdown.base, 0, 'Breakdown has positive base');

  // Wrong season returns 0
  var wrongSeason = CropRotation.calculateYield(p, 'carrot', 'winter', []);
  assertEq(wrongSeason.yield, 0, 'Wrong season returns 0 yield');
  assert(wrongSeason.breakdown.error !== undefined, 'Wrong season has error in breakdown');

  // Unknown crop returns 0
  var unknown = CropRotation.calculateYield(p, 'unknown_crop', 'spring', []);
  assertEq(unknown.yield, 0, 'Unknown crop returns 0 yield');
  assert(unknown.breakdown.error !== undefined, 'Unknown crop has error in breakdown');
});

suite('calculateYield — companion modifier', function() {
  reset();

  var p = pid();

  // Basil with tomato companion
  var withCompanion = CropRotation.calculateYield(p, 'tomato', 'summer', ['basil']);
  var withoutCompanion = CropRotation.calculateYield(p, 'tomato', 'summer', []);
  assertGt(withCompanion.yield, withoutCompanion.yield, 'Companion planting (basil+tomato) increases yield');
  assertGt(withCompanion.breakdown.companionMod, 1, 'Companion modifier > 1 with companion');
  assertEq(withoutCompanion.breakdown.companionMod, 1, 'Companion modifier = 1 with no companions');

  // Antagonist reduces yield
  var p2 = pid();
  var withAntagonist = CropRotation.calculateYield(p2, 'potato', 'spring', ['tomato']);
  var withoutAnt = CropRotation.calculateYield(p2, 'potato', 'spring', []);
  assert(withAntagonist.yield < withoutAnt.yield, 'Antagonist (tomato+potato) reduces yield');
  assert(withAntagonist.breakdown.companionMod < 1, 'Antagonist companion modifier < 1');

  // Multiple companions stack
  var p3 = pid();
  var oneComp = CropRotation.calculateYield(p3, 'corn', 'summer', ['bean']);
  var twoComp = CropRotation.calculateYield(p3, 'corn', 'summer', ['bean', 'squash']);
  assertGt(twoComp.yield, oneComp.yield, 'Two companions stack: corn+bean+squash > corn+bean');
});

suite('calculateYield — soil nutrient impact', function() {
  reset();

  // Good soil vs depleted soil
  var pGood = pid();
  var pDepleted = pid();

  // Manually deplete the second plot
  CropRotation.getOrCreatePlot(pDepleted).soil.nitrogen   = 5;
  CropRotation.getOrCreatePlot(pDepleted).soil.phosphorus = 5;
  CropRotation.getOrCreatePlot(pDepleted).soil.potassium  = 5;

  var goodYield = CropRotation.calculateYield(pGood, 'wheat', 'spring', []);
  var depletedYield = CropRotation.calculateYield(pDepleted, 'wheat', 'spring', []);
  assertGt(goodYield.yield, depletedYield.yield, 'Good soil yields more than depleted soil');

  // Breakdown has npkMod
  assert(goodYield.breakdown.npkMod !== undefined, 'Breakdown includes npkMod');
  assertGt(goodYield.breakdown.npkMod, depletedYield.breakdown.npkMod,
    'Good soil has higher npkMod than depleted soil');
});

suite('calculateYield — fallow bonus', function() {
  reset();

  var p = pid();
  // Apply fallow seasons manually
  CropRotation.getOrCreatePlot(p).fallowSeasons = 3;

  var withFallow = CropRotation.calculateYield(p, 'wheat', 'spring', []);
  var pFresh = pid();
  var withoutFallow = CropRotation.calculateYield(pFresh, 'wheat', 'spring', []);

  assert(withFallow.breakdown.fallowBonus > 0, 'Fallow bonus applied when fallow > 0');
  assertGt(withFallow.yield, withoutFallow.yield, 'Fallow plot yields more than fresh plot');
});

suite('calculateYield — weather modifier', function() {
  reset();

  var p = pid();

  // Custom weather modifier passed in opts
  var goodWeather = CropRotation.calculateYield(p, 'carrot', 'spring', [], { weatherMod: 1.3 });
  var badWeather  = CropRotation.calculateYield(p, 'carrot', 'spring', [], { weatherMod: 0.6 });
  var noWeather   = CropRotation.calculateYield(p, 'carrot', 'spring', [], {});

  assertGt(goodWeather.yield, noWeather.yield, 'Good weather increases yield');
  assert(badWeather.yield < noWeather.yield, 'Bad weather decreases yield');
  assertEq(noWeather.breakdown.weatherMod, 1, 'No weather opts = weatherMod 1.0');
});

suite('calculateYield — determinism (PRNG)', function() {
  reset();

  var p = pid();

  // Same inputs produce same yield every time
  var r1 = CropRotation.calculateYield(p, 'corn', 'summer', []);
  var r2 = CropRotation.calculateYield(p, 'corn', 'summer', []);
  assertEq(r1.yield, r2.yield, 'Same inputs produce identical yield (deterministic)');

  // Different plotId = different yield (different seed)
  var p2 = pid();
  var r3 = CropRotation.calculateYield(p2, 'corn', 'summer', []);
  // Note: may occasionally be equal due to variance — just check they're computed
  assert(typeof r3.yield === 'number', 'Different plot also computes a yield');
});

// ══════════════════════════════════════════════════════════════════════════
// 6. PLANTING & HARVEST
// ══════════════════════════════════════════════════════════════════════════

suite('plant — basic planting', function() {
  reset();

  var p = pid();
  var result = CropRotation.plant(p, 'carrot', 'spring', []);
  assert(result.success, 'plant succeeds for valid crop/season');
  assertGt(result.yield, 0, 'plant returns positive yield');
  assert(result.soil !== undefined, 'plant returns soil state');
  assert(result.breakdown !== undefined, 'plant returns breakdown');

  // History recorded
  var history = CropRotation.getPlotHistory(p);
  assertEq(history.length, 1, 'History has 1 entry after planting');
  assertEq(history[0].action, 'plant', 'History entry action is "plant"');
  assertEq(history[0].cropId, 'carrot', 'History entry has correct cropId');
  assertEq(history[0].season, 'spring', 'History entry has correct season');
});

suite('plant — nutrient consumption', function() {
  reset();

  var p = pid();
  var soilBefore = CropRotation.getSoil(p);

  // Plant a high-N crop (kale)
  CropRotation.plant(p, 'kale', 'spring', []);
  var soilAfter = CropRotation.getSoil(p);

  assert(soilAfter.nitrogen < soilBefore.nitrogen, 'Nitrogen decreases after planting kale');
  assert(soilAfter.phosphorus < soilBefore.phosphorus, 'Phosphorus decreases after planting kale');
  assert(soilAfter.potassium < soilBefore.potassium, 'Potassium decreases after planting kale');
});

suite('plant — legume nitrogen fixation', function() {
  reset();

  var p = pid();
  // Deplete nitrogen first
  CropRotation.getOrCreatePlot(p).soil.nitrogen = 10;
  var beforeN = CropRotation.getSoil(p).nitrogen;

  // Plant bean (fixes N=12, demands N=4)
  CropRotation.plant(p, 'bean', 'spring', []);
  var afterN = CropRotation.getSoil(p).nitrogen;

  // Net effect: fix 12, demand 4 => net +8
  assertGt(afterN, beforeN, 'Legume (bean) increases net nitrogen via fixation');
});

suite('plant — clover strong nitrogen fixer', function() {
  reset();

  var p = pid();
  var beforeN = CropRotation.getSoil(p).nitrogen;
  CropRotation.plant(p, 'clover', 'spring', []);
  var afterN = CropRotation.getSoil(p).nitrogen;

  // clover: fix N=18, demand N=0 => net +18
  assertGt(afterN, beforeN, 'Clover significantly increases nitrogen');
});

suite('plant — wrong season fails gracefully', function() {
  reset();

  var p = pid();
  var result = CropRotation.plant(p, 'corn', 'winter', []);
  assert(!result.success, 'plant fails when season is wrong');
  assert(result.error !== undefined, 'plant returns error message on failure');

  // History should NOT record failed planting
  var history = CropRotation.getPlotHistory(p);
  assertEq(history.length, 0, 'Failed planting does not appear in history');
});

suite('plant — unknown crop fails', function() {
  reset();

  var p = pid();
  var result = CropRotation.plant(p, 'unknown_crop', 'spring', []);
  assert(!result.success, 'plant fails for unknown crop');
  assert(result.error, 'plant returns error for unknown crop');
});

suite('plant — fallow counter resets on planting', function() {
  reset();

  var p = pid();
  CropRotation.getOrCreatePlot(p).fallowSeasons = 5;
  CropRotation.plant(p, 'carrot', 'spring', []);
  var info = CropRotation.getPlotInfo(p);
  assertEq(info.fallowSeasons, 0, 'Fallow counter resets after planting');
});

suite('plant — organic matter increases slightly', function() {
  reset();

  var p = pid();
  var before = CropRotation.getSoil(p).organicMatter;
  CropRotation.plant(p, 'lettuce', 'spring', []);
  var after = CropRotation.getSoil(p).organicMatter;
  assertGte(after, before, 'Organic matter doesn\'t decrease from planting');
});

suite('plant — sequential nutrient depletion', function() {
  reset();

  var p = pid();

  // Plant wheat 3 times (heavy N feeder)
  CropRotation.plant(p, 'wheat', 'spring', []);
  CropRotation.plant(p, 'wheat', 'summer', []);
  CropRotation.plant(p, 'wheat', 'spring', []);

  var soil = CropRotation.getSoil(p);
  var freshSoil = CropRotation.getSoil(pid());
  assert(soil.nitrogen < freshSoil.nitrogen, 'Repeated heavy feeder depletes nitrogen');

  // History has 3 entries
  var history = CropRotation.getPlotHistory(p);
  assertEq(history.length, 3, 'History has 3 entries after 3 plantings');
});

// ══════════════════════════════════════════════════════════════════════════
// 7. APPLY FALLOW
// ══════════════════════════════════════════════════════════════════════════

suite('applyFallow — natural restoration', function() {
  reset();

  var p = pid();
  // Deplete soil
  var plot = CropRotation.getOrCreatePlot(p);
  plot.soil.nitrogen   = 20;
  plot.soil.phosphorus = 20;
  plot.soil.potassium  = 20;

  var before = CropRotation.getSoil(p);
  var result = CropRotation.applyFallow(p);

  assert(result.success, 'applyFallow returns success');
  assertEq(result.fallowSeasons, 1, 'First fallow = 1 season');
  assertGt(result.soil.nitrogen, before.nitrogen, 'Nitrogen recovers during fallow');
  assertGt(result.soil.phosphorus, before.phosphorus, 'Phosphorus recovers during fallow');
  assertGt(result.soil.potassium, before.potassium, 'Potassium recovers during fallow');

  // History recorded
  var history = CropRotation.getPlotHistory(p);
  assertEq(history[0].action, 'fallow', 'Fallow recorded in history');

  // Multiple fallow seasons stack
  CropRotation.applyFallow(p);
  var info = CropRotation.getPlotInfo(p);
  assertEq(info.fallowSeasons, 2, 'Two consecutive fallows = 2');
});

suite('applyFallow — organic matter recovery', function() {
  reset();

  var p = pid();
  CropRotation.getOrCreatePlot(p).soil.organicMatter = 10;
  var before = CropRotation.getSoil(p).organicMatter;

  CropRotation.applyFallow(p);
  var after = CropRotation.getSoil(p).organicMatter;
  assertGt(after, before, 'Organic matter recovers during fallow');
});

// ══════════════════════════════════════════════════════════════════════════
// 8. SOIL RESTORATION
// ══════════════════════════════════════════════════════════════════════════

suite('RESTORATION_METHODS — constants', function() {
  reset();

  var methods = CropRotation.RESTORATION_METHODS;
  assert(typeof methods === 'object', 'RESTORATION_METHODS is an object');

  var expectedMethods = ['compost', 'manure', 'bone_meal', 'wood_ash', 'cover_crop_mulch', 'fallow'];
  expectedMethods.forEach(function(m) {
    assert(methods[m] !== undefined, 'Restoration method "' + m + '" exists');
    assert(methods[m].id === m, 'Method "' + m + '" has correct id');
    assert(typeof methods[m].name === 'string', 'Method "' + m + '" has name');
    assert(typeof methods[m].description === 'string', 'Method "' + m + '" has description');
    assert(typeof methods[m].cost === 'number', 'Method "' + m + '" has numeric cost');
    assert(typeof methods[m].effect === 'object', 'Method "' + m + '" has effect object');
  });

  // Fallow has cost 0
  assertEq(methods.fallow.cost, 0, 'Fallow has zero cost');

  // Manure is rich in N
  assertGt(methods.manure.effect.N, 10, 'Manure provides significant nitrogen');

  // Bone meal is rich in P
  assertGt(methods.bone_meal.effect.P, 10, 'Bone meal provides significant phosphorus');

  // Wood ash is rich in K
  assertGt(methods.wood_ash.effect.K, 10, 'Wood ash provides significant potassium');

  // Compost is balanced
  assertGt(methods.compost.effect.N, 0, 'Compost adds nitrogen');
  assertGt(methods.compost.effect.P, 0, 'Compost adds phosphorus');
  assertGt(methods.compost.effect.K, 0, 'Compost adds potassium');
  assertGt(methods.compost.effect.organicMatter, 0, 'Compost improves organic matter');
});

suite('applyRestoration — compost', function() {
  reset();

  var p = pid();
  CropRotation.getOrCreatePlot(p).soil.nitrogen   = 20;
  CropRotation.getOrCreatePlot(p).soil.phosphorus = 20;
  CropRotation.getOrCreatePlot(p).soil.potassium  = 20;

  var before = CropRotation.getSoil(p);
  var result = CropRotation.applyRestoration(p, 'compost');

  assert(result.success, 'applyRestoration compost succeeds');
  assertGt(result.soil.nitrogen, before.nitrogen, 'Compost increases nitrogen');
  assertGt(result.soil.phosphorus, before.phosphorus, 'Compost increases phosphorus');
  assertGt(result.soil.potassium, before.potassium, 'Compost increases potassium');
  assertGt(result.soil.organicMatter, before.organicMatter, 'Compost increases organic matter');
});

suite('applyRestoration — bone meal targets phosphorus', function() {
  reset();

  var p = pid();
  CropRotation.getOrCreatePlot(p).soil.phosphorus = 10;
  var before = CropRotation.getSoil(p);

  CropRotation.applyRestoration(p, 'bone_meal');
  var after = CropRotation.getSoil(p);
  assertGt(after.phosphorus, before.phosphorus, 'Bone meal significantly raises phosphorus');
});

suite('applyRestoration — manure targets nitrogen', function() {
  reset();

  var p = pid();
  CropRotation.getOrCreatePlot(p).soil.nitrogen = 10;
  var before = CropRotation.getSoil(p);

  CropRotation.applyRestoration(p, 'manure');
  var after = CropRotation.getSoil(p);
  assertGt(after.nitrogen, before.nitrogen, 'Manure significantly raises nitrogen');
});

suite('applyRestoration — wood ash targets potassium', function() {
  reset();

  var p = pid();
  CropRotation.getOrCreatePlot(p).soil.potassium = 10;
  var before = CropRotation.getSoil(p);

  CropRotation.applyRestoration(p, 'wood_ash');
  var after = CropRotation.getSoil(p);
  assertGt(after.potassium, before.potassium, 'Wood ash significantly raises potassium');
});

suite('applyRestoration — unknown method fails', function() {
  reset();

  var p = pid();
  var result = CropRotation.applyRestoration(p, 'dragon_poop');
  assert(!result.success, 'Unknown restoration method fails');
  assert(result.error !== undefined, 'Unknown method returns error');
});

suite('applyRestoration — nutrient clamping (no overflow)', function() {
  reset();

  var p = pid();
  // Already at max
  CropRotation.getOrCreatePlot(p).soil.nitrogen   = 100;
  CropRotation.getOrCreatePlot(p).soil.phosphorus = 100;
  CropRotation.getOrCreatePlot(p).soil.potassium  = 100;

  CropRotation.applyRestoration(p, 'compost');
  var soil = CropRotation.getSoil(p);
  assertLte(soil.nitrogen,   CropRotation.SOIL_MAX, 'Nitrogen does not exceed SOIL_MAX');
  assertLte(soil.phosphorus, CropRotation.SOIL_MAX, 'Phosphorus does not exceed SOIL_MAX');
  assertLte(soil.potassium,  CropRotation.SOIL_MAX, 'Potassium does not exceed SOIL_MAX');
});

suite('applyRestoration — history recorded', function() {
  reset();

  var p = pid();
  CropRotation.applyRestoration(p, 'compost');
  var history = CropRotation.getPlotHistory(p);
  assertEq(history.length, 1, 'Restoration recorded in history');
  assertEq(history[0].action, 'restore', 'History action is restore');
  assertEq(history[0].method, 'compost', 'History records method');
});

// ══════════════════════════════════════════════════════════════════════════
// 9. PLOT INFO & GETTERS
// ══════════════════════════════════════════════════════════════════════════

suite('getPlotInfo — structure', function() {
  reset();

  var p = pid();
  var info = CropRotation.getPlotInfo(p);
  assertEq(info.id, p, 'getPlotInfo.id is correct');
  assert(typeof info.soil === 'object', 'getPlotInfo has soil');
  assert(typeof info.soilHealth === 'number', 'getPlotInfo has soilHealth score');
  assertGte(info.soilHealth, 0, 'soilHealth >= 0');
  assertLte(info.soilHealth, 100, 'soilHealth <= 100');
  assertEq(info.fallowSeasons, 0, 'New plot fallowSeasons = 0');
  assertEq(info.historyLength, 0, 'New plot historyLength = 0');
});

suite('getPlotHistory — returns copy', function() {
  reset();

  var p = pid();
  CropRotation.plant(p, 'carrot', 'spring', []);
  var hist1 = CropRotation.getPlotHistory(p);
  var hist2 = CropRotation.getPlotHistory(p);

  // Should be equal but not the same reference
  assertEq(hist1.length, hist2.length, 'History lengths match');
  hist1.push({ dummy: true });
  var hist3 = CropRotation.getPlotHistory(p);
  assertEq(hist3.length, 1, 'Mutating returned history does not affect stored history');
});

suite('getAllPlots — returns all plots', function() {
  reset();

  var p1 = pid();
  var p2 = pid();
  CropRotation.getOrCreatePlot(p1);
  CropRotation.getOrCreatePlot(p2);

  var all = CropRotation.getAllPlots();
  assert(all[p1] !== undefined, 'getAllPlots includes plot 1');
  assert(all[p2] !== undefined, 'getAllPlots includes plot 2');
});

suite('getSoilTrend — tracks soil snapshots', function() {
  reset();

  var p = pid();
  CropRotation.plant(p, 'carrot', 'spring', []);
  CropRotation.plant(p, 'wheat', 'summer', []);

  var trend = CropRotation.getSoilTrend(p);
  assertEq(trend.length, 2, 'Soil trend has 2 snapshots after 2 plantings');
  trend.forEach(function(snap) {
    assert(snap.soil !== undefined, 'Each trend snapshot has soil');
    assert(snap.step !== undefined, 'Each trend snapshot has step index');
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 10. MULTI-SEASON PLANNER
// ══════════════════════════════════════════════════════════════════════════

suite('planRotation — basic structure', function() {
  reset();

  var p = pid();
  var plan = CropRotation.planRotation(p, [
    { cropId: 'pea' },
    { cropId: 'carrot' },
    { cropId: 'kale' },
    null
  ], { startSeason: 'spring' });

  assert(plan.success, 'planRotation returns success');
  assert(Array.isArray(plan.steps), 'planRotation.steps is array');
  assertEq(plan.steps.length, 4, 'planRotation has 4 steps');
  assertEq(plan.startSeason, 'spring', 'planRotation records startSeason');
  assert(typeof plan.totalProjectedYield === 'number', 'planRotation has totalProjectedYield');
  assert(typeof plan.activePlantingSeasons === 'number', 'planRotation has activePlantingSeasons');
  assert(plan.finalSoil !== undefined, 'planRotation has finalSoil');
});

suite('planRotation — season sequence is correct', function() {
  reset();

  var p = pid();
  var plan = CropRotation.planRotation(p, [
    { cropId: 'pea' },
    { cropId: 'corn' },
    { cropId: 'carrot' },
    { cropId: 'turnip' }
  ], { startSeason: 'spring' });

  assertEq(plan.steps[0].season, 'spring', 'Step 0 is spring');
  assertEq(plan.steps[1].season, 'summer', 'Step 1 is summer');
  assertEq(plan.steps[2].season, 'autumn', 'Step 2 is autumn');
  assertEq(plan.steps[3].season, 'winter', 'Step 3 is winter');
});

suite('planRotation — fallow steps', function() {
  reset();

  var p = pid();
  var plan = CropRotation.planRotation(p, [
    { cropId: 'wheat' },
    null,
    { cropId: 'carrot' }
  ], { startSeason: 'spring' });

  assertEq(plan.steps[1].action, 'fallow', 'Null entry creates fallow step');
  assertEq(plan.steps[1].projectedYield, 0, 'Fallow yield is 0');
  assertEq(plan.activePlantingSeasons, 2, 'Only 2 active planting seasons (fallow skipped)');
});

suite('planRotation — invalid season crops flagged', function() {
  reset();

  var p = pid();
  var plan = CropRotation.planRotation(p, [
    { cropId: 'corn' }  // corn can only grow in summer; start is spring
  ], { startSeason: 'spring' });

  assertEq(plan.steps[0].action, 'invalid_season', 'Crop in wrong season flagged as invalid_season');
  assert(plan.steps[0].error !== undefined, 'Invalid season step has error message');
  assertEq(plan.steps[0].projectedYield, 0, 'Invalid season step has 0 yield');
});

suite('planRotation — companion effects in plan', function() {
  reset();

  var p1 = pid();
  var p2 = pid();

  var planWith = CropRotation.planRotation(p1, [
    { cropId: 'tomato', companions: ['basil'] }
  ], { startSeason: 'summer' });

  var planWithout = CropRotation.planRotation(p2, [
    { cropId: 'tomato', companions: [] }
  ], { startSeason: 'summer' });

  assertGt(planWith.steps[0].projectedYield, planWithout.steps[0].projectedYield,
    'Plan with companion (basil+tomato) forecasts higher yield');
});

suite('planRotation — nutrient state propagates across steps', function() {
  reset();

  var p = pid();
  // Plant 4 heavy feeders in a row — soil should decline
  var plan = CropRotation.planRotation(p, [
    { cropId: 'wheat' },
    { cropId: 'corn' },
    { cropId: 'wheat' },
    { cropId: 'corn' }
  ], { startSeason: 'spring' });

  // Soil after step 4 should have less N than before
  var freshN = CropRotation.DEFAULT_SOIL.nitrogen;
  var finalN = plan.finalSoil.nitrogen;
  assert(finalN < freshN, 'Repeated heavy feeding depletes nitrogen in plan forecast');
});

suite('planRotation — restoration scheduled in plan', function() {
  reset();

  var p = pid();
  // Plan with compost scheduled at step 1
  var plan = CropRotation.planRotation(p, [
    { cropId: 'wheat' },
    { cropId: 'wheat' },
    { cropId: 'wheat' }
  ], {
    startSeason: 'spring',
    restorations: [{ seasonIndex: 1, method: 'compost' }]
  });

  assert(plan.success, 'Plan with restoration succeeds');
  // The soil at step 2 should reflect compost applied before step 1
  // Just verify it ran without error
  assertEq(plan.steps.length, 3, 'Plan still has 3 steps with restoration');
});

suite('planRotation — total yield calculation', function() {
  reset();

  var p = pid();
  var plan = CropRotation.planRotation(p, [
    { cropId: 'pea' },
    { cropId: 'corn' },
    { cropId: 'carrot' },
    { cropId: 'kale' }
  ], { startSeason: 'spring' });

  var summed = 0;
  plan.steps.forEach(function(s) {
    summed += s.projectedYield;
  });
  assertClose(plan.totalProjectedYield, summed, 0.1, 'totalProjectedYield matches sum of step yields');
});

suite('planRotation — non-array plan fails gracefully', function() {
  reset();

  var p = pid();
  var result = CropRotation.planRotation(p, 'not_an_array', {});
  assert(!result.success, 'Non-array cropPlan returns failure');
  assert(result.error !== undefined, 'Non-array cropPlan returns error');
});

suite('planRotation — does not mutate real plot soil', function() {
  reset();

  var p = pid();
  var soilBefore = CropRotation.getSoil(p);

  CropRotation.planRotation(p, [
    { cropId: 'corn' },
    { cropId: 'wheat' }
  ], { startSeason: 'summer' });

  var soilAfter = CropRotation.getSoil(p);
  assertEq(soilBefore.nitrogen, soilAfter.nitrogen, 'planRotation does not mutate actual plot nitrogen');
  assertEq(soilBefore.phosphorus, soilAfter.phosphorus, 'planRotation does not mutate actual plot phosphorus');
});

// ══════════════════════════════════════════════════════════════════════════
// 11. RECOMMENDATIONS
// ══════════════════════════════════════════════════════════════════════════

suite('recommendRestoration — low nitrogen', function() {
  reset();

  var p = pid();
  CropRotation.getOrCreatePlot(p).soil.nitrogen = 10;
  var recs = CropRotation.recommendRestoration(p);
  assert(Array.isArray(recs), 'recommendRestoration returns array');
  assertGte(recs.length, 1, 'At least 1 recommendation for low N');
  var highPriority = recs.filter(function(r) { return r.priority === 'high'; });
  assertGte(highPriority.length, 1, 'High priority recommendation for critical N deficit');
  var methods = recs.map(function(r) { return r.method; });
  assert(methods.indexOf('manure') !== -1 || methods.indexOf('compost') !== -1,
    'Low N recommends manure or compost');
});

suite('recommendRestoration — low phosphorus', function() {
  reset();

  var p = pid();
  CropRotation.getOrCreatePlot(p).soil.phosphorus = 10;
  var recs = CropRotation.recommendRestoration(p);
  var methods = recs.map(function(r) { return r.method; });
  assert(methods.indexOf('bone_meal') !== -1, 'Low P recommends bone meal');
});

suite('recommendRestoration — low potassium', function() {
  reset();

  var p = pid();
  CropRotation.getOrCreatePlot(p).soil.potassium = 10;
  var recs = CropRotation.recommendRestoration(p);
  var methods = recs.map(function(r) { return r.method; });
  assert(methods.indexOf('wood_ash') !== -1, 'Low K recommends wood ash');
});

suite('recommendRestoration — healthy soil', function() {
  reset();

  var p = pid();
  // Default soil is healthy — should recommend fallow or nothing critical
  var recs = CropRotation.recommendRestoration(p);
  assert(Array.isArray(recs) && recs.length > 0, 'Always returns at least one recommendation');
});

suite('recommendCrops — returns scored list', function() {
  reset();

  var p = pid();
  var recs = CropRotation.recommendCrops(p, 'spring');
  assert(Array.isArray(recs), 'recommendCrops returns array');
  assertGte(recs.length, 1, 'At least 1 crop recommended for spring');

  recs.forEach(function(r) {
    assert(typeof r.cropId === 'string', 'Each recommendation has cropId');
    assert(typeof r.score === 'number', 'Each recommendation has score');
    assertGte(r.score, 0, 'Score >= 0');
    assertLte(r.score, 1.1, 'Score <= 1.1');
  });
});

suite('recommendCrops — legumes recommended when N is low', function() {
  reset();

  var p = pid();
  CropRotation.getOrCreatePlot(p).soil.nitrogen = 5;
  var recs = CropRotation.recommendCrops(p, 'spring');

  // Legumes (bean, pea, clover) should score high
  var legumes = recs.filter(function(r) {
    var crop = CropRotation.CROP_CATALOG.find(function(c) { return c.id === r.cropId; });
    return crop && crop.category === 'legume';
  });
  assertGte(legumes.length, 1, 'At least one legume recommended when N is low');

  var legume = legumes[0];
  var nonLegumes = recs.filter(function(r) {
    var crop = CropRotation.CROP_CATALOG.find(function(c) { return c.id === r.cropId; });
    return crop && crop.category !== 'legume' && crop.npkDemand && crop.npkDemand.N > 15;
  });

  if (nonLegumes.length > 0) {
    assertGte(legume.score, nonLegumes[0].score,
      'Legumes score higher than heavy N feeders when N is depleted');
  } else {
    assert(true, 'No high-N-demand non-legumes to compare (OK)');
  }
});

suite('recommendCrops — winter returns only valid crops', function() {
  reset();

  var p = pid();
  var recs = CropRotation.recommendCrops(p, 'winter');
  recs.forEach(function(r) {
    assert(CropRotation.canPlantInSeason(r.cropId, 'winter'),
      r.cropId + ' is actually plantable in winter');
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 12. ANALYZE PLOT COMPANIONS
// ══════════════════════════════════════════════════════════════════════════

suite('analyzePlotCompanions — basic', function() {
  reset();

  // Three Sisters: corn + bean + squash
  var result = CropRotation.analyzePlotCompanions(['corn', 'bean', 'squash']);
  assert(result !== null, 'analyzePlotCompanions returns result');
  assert(typeof result.totalBonus === 'number', 'Result has totalBonus');
  assert(Array.isArray(result.pairs), 'Result has pairs array');
  assertGte(result.pairs.length, 2, 'Three sisters has at least 2 synergy pairs');
  assert(result.netPositive, 'Three Sisters net positive');
  assertGt(result.totalBonus, 0, 'Three Sisters total bonus > 0');
});

suite('analyzePlotCompanions — antagonist combination', function() {
  reset();

  // Potato + tomato (antagonists)
  var result = CropRotation.analyzePlotCompanions(['potato', 'tomato']);
  assert(result.pairs.length >= 1, 'At least 1 pair for potato+tomato');
  assert(!result.netPositive || result.totalBonus <= 0, 'potato+tomato is not net positive');
  assert(result.totalBonus < 0, 'potato+tomato total bonus is negative');
});

suite('analyzePlotCompanions — no relationships', function() {
  reset();

  var result = CropRotation.analyzePlotCompanions(['rice', 'beet']);
  assertEq(result.pairs.length, 0, 'No known pairs for rice+beet');
  assertEq(result.totalBonus, 0, 'Total bonus is 0 when no relationships');
});

suite('analyzePlotCompanions — single crop', function() {
  reset();

  var result = CropRotation.analyzePlotCompanions(['corn']);
  assertEq(result.pairs.length, 0, 'Single crop has no pairs');
  assertEq(result.totalBonus, 0, 'Single crop bonus is 0');
});

suite('analyzePlotCompanions — mixed companion and antagonist', function() {
  reset();

  // mint (companion to rosemary), but also check for potential antagonists
  var result = CropRotation.analyzePlotCompanions(['mint', 'rosemary', 'tomato']);
  // mint+rosemary is +0.15; no known antagonist between these and tomato
  assertGte(result.pairs.length, 1, 'At least 1 relationship in mixed group');
});

// ══════════════════════════════════════════════════════════════════════════
// 13. SEASON UTILITIES
// ══════════════════════════════════════════════════════════════════════════

suite('SEASONS — constants', function() {
  reset();

  assert(Array.isArray(CropRotation.SEASONS), 'SEASONS is an array');
  assertEq(CropRotation.SEASONS.length, 4, 'SEASONS has 4 entries');
  ['spring', 'summer', 'autumn', 'winter'].forEach(function(s) {
    assert(CropRotation.SEASONS.indexOf(s) !== -1, 'SEASONS includes ' + s);
  });
});

suite('advanceSeason — wrapping', function() {
  reset();

  assertEq(CropRotation.advanceSeason('spring'), 'summer', 'spring -> summer');
  assertEq(CropRotation.advanceSeason('summer'), 'autumn', 'summer -> autumn');
  assertEq(CropRotation.advanceSeason('autumn'), 'winter', 'autumn -> winter');
  assertEq(CropRotation.advanceSeason('winter'), 'spring', 'winter -> spring (wrap)');

  // Multi-step advance
  assertEq(CropRotation.advanceSeason('spring', 2), 'autumn', 'spring +2 = autumn');
  assertEq(CropRotation.advanceSeason('spring', 4), 'spring', 'spring +4 = spring (full cycle)');
  assertEq(CropRotation.advanceSeason('winter', 2), 'summer', 'winter +2 = summer (wraps)');
  assertEq(CropRotation.advanceSeason('spring', 0), 'spring', 'spring +0 = spring (no advance)');
});

// ══════════════════════════════════════════════════════════════════════════
// 14. MULBERRY32 PRNG
// ══════════════════════════════════════════════════════════════════════════

suite('mulberry32 — determinism', function() {
  reset();

  var rng1 = CropRotation.mulberry32(12345);
  var rng2 = CropRotation.mulberry32(12345);
  assertEq(rng1(), rng2(), 'Same seed produces same first value');
  assertEq(rng1(), rng2(), 'Same seed produces same second value');
  assertEq(rng1(), rng2(), 'Same seed produces same third value');
});

suite('mulberry32 — range [0, 1)', function() {
  reset();

  var rng = CropRotation.mulberry32(99999);
  for (var i = 0; i < 20; i++) {
    var v = rng();
    assertGte(v, 0, 'mulberry32 value >= 0 (iteration ' + i + ')');
    assert(v < 1, 'mulberry32 value < 1 (iteration ' + i + ')');
  }
});

suite('mulberry32 — different seeds produce different values', function() {
  reset();

  var rng1 = CropRotation.mulberry32(1);
  var rng2 = CropRotation.mulberry32(2);
  var v1 = rng1();
  var v2 = rng2();
  assert(v1 !== v2, 'Different seeds produce different values');
});

suite('strHash — determinism', function() {
  reset();

  var h1 = CropRotation.strHash('hello');
  var h2 = CropRotation.strHash('hello');
  assertEq(h1, h2, 'Same string always hashes to same value');

  var h3 = CropRotation.strHash('world');
  assert(h1 !== h3, 'Different strings produce different hashes');

  assert(typeof h1 === 'number', 'strHash returns a number');
  assertGte(h1, 0, 'strHash returns non-negative');
});

// ══════════════════════════════════════════════════════════════════════════
// 15. EDGE CASES & INTEGRATION
// ══════════════════════════════════════════════════════════════════════════

suite('nutrient clamping — never exceeds bounds', function() {
  reset();

  var p = pid();
  // Set to max, then restore
  CropRotation.getOrCreatePlot(p).soil.nitrogen   = 95;
  CropRotation.getOrCreatePlot(p).soil.phosphorus = 95;
  CropRotation.getOrCreatePlot(p).soil.potassium  = 95;
  CropRotation.getOrCreatePlot(p).soil.organicMatter = 95;

  CropRotation.applyRestoration(p, 'compost');
  var soil = CropRotation.getSoil(p);
  assertLte(soil.nitrogen,      100, 'Nitrogen clamped at 100');
  assertLte(soil.phosphorus,    100, 'Phosphorus clamped at 100');
  assertLte(soil.potassium,     100, 'Potassium clamped at 100');
  assertLte(soil.organicMatter, 100, 'Organic matter clamped at 100');
});

suite('nutrient clamping — never goes below 0', function() {
  reset();

  var p = pid();
  // Plant high-demand crops on depleted soil
  CropRotation.getOrCreatePlot(p).soil.nitrogen   = 2;
  CropRotation.getOrCreatePlot(p).soil.phosphorus = 2;
  CropRotation.getOrCreatePlot(p).soil.potassium  = 2;

  // Corn has demand N=20, P=10, K=14 — all should clamp to 0
  CropRotation.plant(p, 'corn', 'summer', []);
  var soil = CropRotation.getSoil(p);
  assertGte(soil.nitrogen,   0, 'Nitrogen never below 0');
  assertGte(soil.phosphorus, 0, 'Phosphorus never below 0');
  assertGte(soil.potassium,  0, 'Potassium never below 0');
});

suite('full rotation cycle — integration', function() {
  reset();

  var p = pid();

  // Typical 4-season rotation: pea → corn → carrot → fallow
  var step1 = CropRotation.plant(p, 'pea', 'spring', []);
  assert(step1.success, 'Step 1: pea in spring succeeds');

  var step2 = CropRotation.plant(p, 'corn', 'summer', ['bean']);
  assert(step2.success, 'Step 2: corn in summer with bean companion succeeds');

  var step3 = CropRotation.plant(p, 'carrot', 'autumn', ['lavender']);
  assert(step3.success, 'Step 3: carrot in autumn with lavender companion succeeds');

  var step4 = CropRotation.applyFallow(p);
  assert(step4.success, 'Step 4: fallow succeeds');

  var history = CropRotation.getPlotHistory(p);
  assertEq(history.length, 4, 'Full rotation has 4 history entries');

  var info = CropRotation.getPlotInfo(p);
  assertEq(info.fallowSeasons, 1, 'One fallow season recorded');
  assertGte(info.soilHealth, 0, 'Soil health is non-negative after full rotation');
});

suite('restoration improves yield — integration', function() {
  reset();

  var p = pid();
  // Deplete soil heavily
  CropRotation.getOrCreatePlot(p).soil.nitrogen   = 10;
  CropRotation.getOrCreatePlot(p).soil.phosphorus = 10;
  CropRotation.getOrCreatePlot(p).soil.potassium  = 10;

  var yieldBefore = CropRotation.calculateYield(p, 'carrot', 'spring', []);

  // Restore with compost
  CropRotation.applyRestoration(p, 'compost');
  CropRotation.applyRestoration(p, 'bone_meal');

  var yieldAfter = CropRotation.calculateYield(p, 'carrot', 'spring', []);
  assertGt(yieldAfter.yield, yieldBefore.yield, 'Restoration increases yield on depleted soil');
});

suite('companion planning boosts Three Sisters yield', function() {
  reset();

  var p = pid();
  var withThreeSisters = CropRotation.calculateYield(p, 'corn', 'summer', ['bean', 'squash']);
  var withNone = CropRotation.calculateYield(p, 'corn', 'summer', []);

  assertGt(withThreeSisters.yield, withNone.yield, 'Three Sisters companions boost corn yield');
  assertGt(withThreeSisters.breakdown.companionMod, 1.3, 'Three Sisters companion modifier > 1.3');
});

suite('soil trend reflects planting actions', function() {
  reset();

  var p = pid();
  CropRotation.plant(p, 'wheat', 'spring', []);
  CropRotation.applyRestoration(p, 'compost');
  CropRotation.plant(p, 'carrot', 'autumn', []);

  var trend = CropRotation.getSoilTrend(p);
  // Only plant/restore with soilAfter should appear
  assertGte(trend.length, 2, 'Trend has at least 2 soil snapshots');
  trend.forEach(function(snap) {
    assert(typeof snap.soil.nitrogen === 'number', 'Each trend snap has numeric nitrogen');
    assert(typeof snap.soil.phosphorus === 'number', 'Each trend snap has numeric phosphorus');
    assert(typeof snap.soil.potassium === 'number', 'Each trend snap has numeric potassium');
  });
});

suite('_reset — clears all plots', function() {
  reset();

  var p1 = pid();
  var p2 = pid();
  CropRotation.plant(p1, 'carrot', 'spring', []);
  CropRotation.plant(p2, 'wheat', 'spring', []);

  CropRotation._reset();

  var all = CropRotation.getAllPlots();
  assertEq(Object.keys(all).length, 0, 'All plots cleared after _reset');
});

// ══════════════════════════════════════════════════════════════════════════
// FINAL SUMMARY
// ══════════════════════════════════════════════════════════════════════════

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) {
  process.exit(1);
}
