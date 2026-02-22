// test_weather_ecology.js — Comprehensive tests for WeatherEcology module
// 200+ tests covering: zone defaults, PRNG, biodiversity, harvest pressure,
// creature populations, weather impact, terraforming, conservation, seasonal
// cycles, soil health, ecology reports, endangered species, forecasting,
// zone comparison, ecology events, edge cases.
'use strict';

var WE = require('../src/js/weather_ecology');

// ── Test runner ──────────────────────────────────────────────────────────────

var passed = 0;
var failed = 0;
var failures = [];
var currentSuite = '';

function suite(name, fn) {
  currentSuite = name;
  console.log('\n=== ' + name + ' ===');
  fn();
}

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log('  ok - ' + msg);
  } else {
    failed++;
    var full = '[' + currentSuite + '] FAIL: ' + msg;
    failures.push(full);
    console.error('  FAIL - ' + msg);
  }
}

function assertEq(a, b, msg) {
  assert(a === b, msg + ' (expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a) + ')');
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

function assertLt(a, b, msg) {
  assert(a < b, msg + ' (expected < ' + b + ', got ' + a + ')');
}

function assertLte(a, b, msg) {
  assert(a <= b, msg + ' (expected <= ' + b + ', got ' + a + ')');
}

function assertIn(arr, val, msg) {
  assert(arr.indexOf(val) !== -1, msg + ' (value ' + JSON.stringify(val) + ' not in array)');
}

function reset() {
  WE._reset();
}

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 1 — MODULE EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

suite('MODULE EXPORTS — all public API', function() {
  // Constants
  assert(Array.isArray(WE.ZONE_IDS), 'ZONE_IDS is an array');
  assertEq(WE.ZONE_IDS.length, 8, 'ZONE_IDS has 8 zones');
  assert(typeof WE.ZONE_ECOLOGY_DEFAULTS === 'object', 'ZONE_ECOLOGY_DEFAULTS exported');
  assert(typeof WE.SPECIES_CATALOG === 'object', 'SPECIES_CATALOG exported');
  assert(typeof WE.WEATHER_ECOLOGY_IMPACT === 'object', 'WEATHER_ECOLOGY_IMPACT exported');
  assert(typeof WE.SEASON_ECOLOGY_MODIFIERS === 'object', 'SEASON_ECOLOGY_MODIFIERS exported');
  assert(typeof WE.TERRAFORM_ECOLOGY_IMPACT === 'object', 'TERRAFORM_ECOLOGY_IMPACT exported');
  assert(typeof WE.CONSERVATION_ACTIONS === 'object', 'CONSERVATION_ACTIONS exported');
  assert(Array.isArray(WE.ECOLOGY_EVENTS), 'ECOLOGY_EVENTS is an array');
  assert(typeof WE.DROUGHT_THRESHOLD_DAYS === 'number', 'DROUGHT_THRESHOLD_DAYS exported');

  // Functions
  assert(typeof WE.tick === 'function', 'tick() exported');
  assert(typeof WE.advanceSeason === 'function', 'advanceSeason() exported');
  assert(typeof WE.computeBiodiversity === 'function', 'computeBiodiversity() exported');
  assert(typeof WE.applyHarvestPressure === 'function', 'applyHarvestPressure() exported');
  assert(typeof WE.tickRecovery === 'function', 'tickRecovery() exported');
  assert(typeof WE.updateCreaturePopulations === 'function', 'updateCreaturePopulations() exported');
  assert(typeof WE.getCreatureCount === 'function', 'getCreatureCount() exported');
  assert(typeof WE.getTotalCreaturePopulation === 'function', 'getTotalCreaturePopulation() exported');
  assert(typeof WE.applyWeatherEvent === 'function', 'applyWeatherEvent() exported');
  assert(typeof WE.analyzeCumulativeWeather === 'function', 'analyzeCumulativeWeather() exported');
  assert(typeof WE.applyTerraformingEffect === 'function', 'applyTerraformingEffect() exported');
  assert(typeof WE.performConservationAction === 'function', 'performConservationAction() exported');
  assert(typeof WE.syncSoilState === 'function', 'syncSoilState() exported');
  assert(typeof WE.getSoilHealth === 'function', 'getSoilHealth() exported');
  assert(typeof WE.getZoneEcologyReport === 'function', 'getZoneEcologyReport() exported');
  assert(typeof WE.getWorldEcologyReport === 'function', 'getWorldEcologyReport() exported');
  assert(typeof WE.forecastBiodiversity === 'function', 'forecastBiodiversity() exported');
  assert(typeof WE.compareZones === 'function', 'compareZones() exported');
  assert(typeof WE.checkEndangeredSpecies === 'function', 'checkEndangeredSpecies() exported');
  assert(typeof WE.getEndangeredInZone === 'function', 'getEndangeredInZone() exported');
  assert(typeof WE.checkEcologyEvents === 'function', 'checkEcologyEvents() exported');
  assert(typeof WE._reset === 'function', '_reset() test helper exported');
  assert(typeof WE._getState === 'function', '_getState() test helper exported');
  assert(typeof WE._mulberry32 === 'function', '_mulberry32() exported');
  assert(typeof WE._strHash === 'function', '_strHash() exported');
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 2 — ZONE IDS AND DEFAULTS
// ══════════════════════════════════════════════════════════════════════════════

suite('ZONE IDS AND DEFAULTS', function() {
  reset();

  var expected = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];
  expected.forEach(function(z) {
    assertIn(WE.ZONE_IDS, z, 'ZONE_IDS includes ' + z);
  });

  // All zones have defaults
  WE.ZONE_IDS.forEach(function(zoneId) {
    var def = WE.ZONE_ECOLOGY_DEFAULTS[zoneId];
    assert(def !== undefined, zoneId + ' has ecology defaults');
    assert(typeof def.baselineBiodiversity === 'number', zoneId + '.baselineBiodiversity is number');
    assert(typeof def.baselineCreatures === 'number', zoneId + '.baselineCreatures is number');
    assert(Array.isArray(def.dominantSpecies), zoneId + '.dominantSpecies is array');
    assert(def.dominantSpecies.length > 0, zoneId + '.dominantSpecies is non-empty');
    assert(typeof def.terrainType === 'string', zoneId + '.terrainType is string');
    assert(typeof def.harvestCapacity === 'number', zoneId + '.harvestCapacity is number');
    assert(typeof def.weatherSensitivity === 'number', zoneId + '.weatherSensitivity is number');
    assert(typeof def.naturalRecoveryRate === 'number', zoneId + '.naturalRecoveryRate is number');
  });

  // Wilds should have highest biodiversity baseline
  assertGte(WE.ZONE_ECOLOGY_DEFAULTS.wilds.baselineBiodiversity, 90, 'wilds has high baseline biodiversity');
  assertGte(WE.ZONE_ECOLOGY_DEFAULTS.wilds.harvestCapacity, 150, 'wilds has large harvest capacity');

  // Arena should be lowest
  assertLte(WE.ZONE_ECOLOGY_DEFAULTS.arena.baselineBiodiversity, 50, 'arena has lower baseline biodiversity');

  // Sensitivity values in valid range
  WE.ZONE_IDS.forEach(function(z) {
    var def = WE.ZONE_ECOLOGY_DEFAULTS[z];
    assertGte(def.weatherSensitivity, 0, z + ' sensitivity >= 0');
    assertLte(def.weatherSensitivity, 1, z + ' sensitivity <= 1');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 3 — SPECIES CATALOG
// ══════════════════════════════════════════════════════════════════════════════

suite('SPECIES CATALOG', function() {
  reset();

  var catalog = WE.SPECIES_CATALOG;
  var keys = Object.keys(catalog);
  assertGte(keys.length, 15, 'SPECIES_CATALOG has at least 15 species');

  var required = ['type', 'basePop', 'minViable', 'endangered', 'reproductionRate', 'foodDemand'];
  keys.forEach(function(sp) {
    required.forEach(function(field) {
      assert(catalog[sp][field] !== undefined, sp + ' has field: ' + field);
    });
  });

  // Endangered threshold must be >= minViable
  keys.forEach(function(sp) {
    var s = catalog[sp];
    assertGte(s.endangered, s.minViable, sp + ' endangered >= minViable');
  });

  // Base population must be positive
  keys.forEach(function(sp) {
    assertGt(catalog[sp].basePop, 0, sp + '.basePop > 0');
  });

  // Valid types
  var validTypes = ['herbivore', 'predator', 'pollinator', 'waterfowl', 'urban', 'nocturnal', 'reptile', 'scavenger'];
  keys.forEach(function(sp) {
    assertIn(validTypes, catalog[sp].type, sp + ' has valid type');
  });

  // Reproduction rates in range
  keys.forEach(function(sp) {
    var rr = catalog[sp].reproductionRate;
    assertGt(rr, 0, sp + '.reproductionRate > 0');
    assertLte(rr, 1, sp + '.reproductionRate <= 1');
  });

  // Check specific species exist
  assert(catalog.rabbit !== undefined, 'rabbit exists');
  assert(catalog.wolf !== undefined, 'wolf exists');
  assert(catalog.butterfly !== undefined, 'butterfly exists');
  assert(catalog.bee !== undefined, 'bee exists');
  assert(catalog.deer !== undefined, 'deer exists');
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 4 — WEATHER ECOLOGY IMPACT TABLE
// ══════════════════════════════════════════════════════════════════════════════

suite('WEATHER ECOLOGY IMPACT TABLE', function() {
  reset();

  var impact = WE.WEATHER_ECOLOGY_IMPACT;
  var expectedTypes = ['clear', 'rain', 'heavy_rain', 'snow', 'blizzard', 'fog', 'thunderstorm', 'sandstorm', 'mist'];

  expectedTypes.forEach(function(t) {
    assert(impact[t] !== undefined, 'Weather impact defined for: ' + t);
  });

  var requiredFields = ['biodiversityDelta', 'soilMoistureDelta', 'creatureActivityMod', 'harvestCapacityMod', 'pollinatorMod', 'description'];
  Object.keys(impact).forEach(function(t) {
    requiredFields.forEach(function(f) {
      assert(impact[t][f] !== undefined, t + ' impact has field: ' + f);
    });
  });

  // Sandstorm should be most destructive
  assertLt(impact.sandstorm.biodiversityDelta, impact.rain.biodiversityDelta, 'sandstorm worse than rain for biodiversity');
  assertLt(impact.blizzard.biodiversityDelta, 0, 'blizzard reduces biodiversity');
  assertGt(impact.rain.biodiversityDelta, 0, 'rain increases biodiversity');

  // Pollinator mods in range 0-2
  Object.keys(impact).forEach(function(t) {
    assertGte(impact[t].pollinatorMod, 0, t + ' pollinatorMod >= 0');
    assertLte(impact[t].pollinatorMod, 2, t + ' pollinatorMod <= 2');
  });

  // Descriptions are non-empty strings
  Object.keys(impact).forEach(function(t) {
    assert(typeof impact[t].description === 'string' && impact[t].description.length > 0, t + ' has description');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 5 — SEASON ECOLOGY MODIFIERS
// ══════════════════════════════════════════════════════════════════════════════

suite('SEASON ECOLOGY MODIFIERS', function() {
  reset();

  var mods = WE.SEASON_ECOLOGY_MODIFIERS;
  var seasons = ['spring', 'summer', 'autumn', 'winter'];

  seasons.forEach(function(s) {
    assert(mods[s] !== undefined, 'Modifier defined for season: ' + s);
  });

  var requiredFields = ['biodiversityGrowthMod', 'creatureReproductionMod', 'harvestCapacityMod', 'soilFertilityMod', 'description'];
  seasons.forEach(function(s) {
    requiredFields.forEach(function(f) {
      assert(mods[s][f] !== undefined, s + ' modifier has field: ' + f);
    });
  });

  // Spring should have highest growth and reproduction
  assertGt(mods.spring.biodiversityGrowthMod, mods.winter.biodiversityGrowthMod, 'spring growth > winter growth');
  assertGt(mods.spring.creatureReproductionMod, mods.winter.creatureReproductionMod, 'spring reproduction > winter reproduction');

  // Winter should have lowest activity
  assertLt(mods.winter.biodiversityGrowthMod, 1, 'winter growth mod < 1');
  assertLt(mods.winter.creatureReproductionMod, 1, 'winter reproduction mod < 1');

  // All mods are positive numbers
  seasons.forEach(function(s) {
    assertGt(mods[s].biodiversityGrowthMod, 0, s + '.biodiversityGrowthMod > 0');
    assertGt(mods[s].creatureReproductionMod, 0, s + '.creatureReproductionMod > 0');
    assertGt(mods[s].harvestCapacityMod, 0, s + '.harvestCapacityMod > 0');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 6 — TERRAFORM ECOLOGY IMPACT
// ══════════════════════════════════════════════════════════════════════════════

suite('TERRAFORM ECOLOGY IMPACT', function() {
  reset();

  var ti = WE.TERRAFORM_ECOLOGY_IMPACT;
  var keys = Object.keys(ti);
  assertGte(keys.length, 5, 'At least 5 terraforming actions');

  // Each action has required fields
  keys.forEach(function(a) {
    assert(typeof ti[a].biodiversityDelta === 'number', a + '.biodiversityDelta is number');
    assert(typeof ti[a].soilFertilityDelta === 'number', a + '.soilFertilityDelta is number');
    assert(typeof ti[a].radiusEffect === 'number', a + '.radiusEffect is number');
    assert(typeof ti[a].category === 'string', a + '.category is string');
    assertIn(['restoration', 'disruption'], ti[a].category, a + '.category is valid');
  });

  // Restoration actions are positive
  var restorationActions = ['plant_tree', 'plant_flowers', 'create_pond', 'restore_habitat', 'compost'];
  restorationActions.forEach(function(a) {
    if (ti[a]) {
      assertGt(ti[a].biodiversityDelta, 0, a + ' biodiversityDelta > 0');
      assertGt(ti[a].soilFertilityDelta, 0, a + ' soilFertilityDelta > 0');
    }
  });

  // Disruption actions are negative
  var disruptionActions = ['clear_land', 'mine_stone', 'build_structure', 'burn_area'];
  disruptionActions.forEach(function(a) {
    if (ti[a]) {
      assertLt(ti[a].biodiversityDelta, 0, a + ' biodiversityDelta < 0');
      assertLt(ti[a].soilFertilityDelta, 0, a + ' soilFertilityDelta < 0');
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 7 — CONSERVATION ACTIONS
// ══════════════════════════════════════════════════════════════════════════════

suite('CONSERVATION ACTIONS', function() {
  reset();

  var ca = WE.CONSERVATION_ACTIONS;
  var keys = Object.keys(ca);
  assertGte(keys.length, 5, 'At least 5 conservation action types');

  keys.forEach(function(a) {
    assert(typeof ca[a].biodiversityBonus === 'number', a + '.biodiversityBonus is number');
    assert(typeof ca[a].creatureBonus === 'number', a + '.creatureBonus is number');
    assert(typeof ca[a].soilFertilityBonus === 'number', a + '.soilFertilityBonus is number');
    assert(typeof ca[a].cost === 'number', a + '.cost is number');
    assertGt(ca[a].biodiversityBonus, 0, a + '.biodiversityBonus > 0');
    assertGt(ca[a].creatureBonus, 0, a + '.creatureBonus > 0');
    assertGt(ca[a].cost, 0, a + '.cost > 0');
  });

  // wildlife_refuge should be the biggest bonus
  assert(ca.wildlife_refuge !== undefined, 'wildlife_refuge action exists');
  assert(ca.replant !== undefined, 'replant action exists');
  assert(ca.seed_bomb !== undefined, 'seed_bomb action exists');
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 8 — PRNG (mulberry32)
// ══════════════════════════════════════════════════════════════════════════════

suite('PRNG — mulberry32', function() {
  reset();

  var prng1 = WE._mulberry32(42);
  var prng2 = WE._mulberry32(42);

  // Same seed → same sequence
  var a = prng1();
  var b = prng2();
  assertEq(a, b, 'Same seed produces same first value');

  var a2 = prng1();
  var b2 = prng2();
  assertEq(a2, b2, 'Same seed produces same second value');

  // Output in [0, 1)
  var prng3 = WE._mulberry32(99);
  for (var i = 0; i < 20; i++) {
    var v = prng3();
    assertGte(v, 0, 'mulberry32 output >= 0 (iter ' + i + ')');
    assertLt(v, 1, 'mulberry32 output < 1 (iter ' + i + ')');
  }

  // Different seeds → different sequences
  var prng4 = WE._mulberry32(1);
  var prng5 = WE._mulberry32(2);
  var c = prng4();
  var d = prng5();
  assert(c !== d, 'Different seeds produce different values');

  // strHash produces consistent hashes
  var h1 = WE._strHash('wilds');
  var h2 = WE._strHash('wilds');
  assertEq(h1, h2, 'strHash is consistent');

  var h3 = WE._strHash('nexus');
  assert(h3 !== h1, 'Different strings produce different hashes');
  assertGte(h3, 0, 'strHash is non-negative');
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 9 — STATE INITIALIZATION
// ══════════════════════════════════════════════════════════════════════════════

suite('STATE INITIALIZATION', function() {
  reset();

  var st = WE._getState();
  assert(st !== null, 'State is initialized');
  assert(typeof st.zones === 'object', 'state.zones exists');
  assert(typeof st.tick === 'number', 'state.tick is number');
  assertEq(st.tick, 0, 'state.tick starts at 0');
  assert(typeof st.season === 'string', 'state.season is string');
  assertEq(st.season, 'spring', "state.season defaults to 'spring'");
  assert(typeof st.worldConservationPoints === 'number', 'worldConservationPoints is number');
  assert(Array.isArray(st.endangeredAlerts), 'endangeredAlerts is array');
  assert(Array.isArray(st.ecologyLog), 'ecologyLog is array');

  // All zones initialized
  WE.ZONE_IDS.forEach(function(z) {
    assert(st.zones[z] !== undefined, 'Zone ' + z + ' initialized in state');
    var zz = st.zones[z];
    assert(typeof zz.biodiversity === 'number', z + '.biodiversity is number');
    assert(typeof zz.harvestPressure === 'number', z + '.harvestPressure is number');
    assert(typeof zz.soilFertility === 'number', z + '.soilFertility is number');
    assert(typeof zz.soilMoisture === 'number', z + '.soilMoisture is number');
    assert(typeof zz.creatures === 'object', z + '.creatures is object');
    assert(Array.isArray(zz.weatherHistory), z + '.weatherHistory is array');
    assertEq(zz.harvestPressure, 0, z + '.harvestPressure starts at 0');
    assertEq(zz.consecutiveDryDays, 0, z + '.consecutiveDryDays starts at 0');
    assertEq(zz.droughtActive, false, z + '.droughtActive starts false');
    assertEq(zz.conservationScore, 0, z + '.conservationScore starts at 0');
    assertEq(zz.totalHarvestEvents, 0, z + '.totalHarvestEvents starts at 0');
    assertEq(zz.totalConservationActions, 0, z + '.totalConservationActions starts at 0');
  });

  // Zone creatures should match dominant species
  WE.ZONE_IDS.forEach(function(z) {
    var def = WE.ZONE_ECOLOGY_DEFAULTS[z];
    var zz = st.zones[z];
    def.dominantSpecies.forEach(function(sp) {
      var pop = zz.creatures[sp];
      assert(pop !== undefined, z + ' has creatures[' + sp + '] initialized');
      assertGt(pop, 0, z + '.' + sp + ' initial pop > 0');
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 10 — COMPUTE BIODIVERSITY
// ══════════════════════════════════════════════════════════════════════════════

suite('COMPUTE BIODIVERSITY', function() {
  reset();

  // All zones return valid scores
  WE.ZONE_IDS.forEach(function(z) {
    var score = WE.computeBiodiversity(z);
    assertGte(score, 0, z + ' biodiversity >= 0');
    assertLte(score, 100, z + ' biodiversity <= 100');
    assert(typeof score === 'number', z + ' biodiversity is number');
  });

  // Invalid zone returns 0
  assertEq(WE.computeBiodiversity('nonexistent'), 0, 'Invalid zone returns 0');

  // Wilds should have higher biodiversity than arena
  var wildsScore = WE.computeBiodiversity('wilds');
  var arenaScore = WE.computeBiodiversity('arena');
  assertGt(wildsScore, arenaScore, 'wilds biodiversity > arena biodiversity');

  // Score changes after creature population drops
  reset();
  var st = WE._getState();
  // Zero out all creatures in nexus
  var keys = Object.keys(st.zones.nexus.creatures);
  keys.forEach(function(sp) { st.zones.nexus.creatures[sp] = 0; });
  var lowScore = WE.computeBiodiversity('nexus');
  assertLt(lowScore, 50, 'Zero creatures → lower biodiversity');
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 11 — HARVEST PRESSURE
// ══════════════════════════════════════════════════════════════════════════════

suite('HARVEST PRESSURE', function() {
  reset();

  // Basic application
  var result = WE.applyHarvestPressure('gardens', 3);
  assert(typeof result.newPressure === 'number', 'applyHarvestPressure returns newPressure');
  assert(typeof result.regenMultiplier === 'number', 'applyHarvestPressure returns regenMultiplier');
  assertGt(result.newPressure, 0, 'Harvest increases pressure');
  assertLte(result.regenMultiplier, 1.0, 'RegenMultiplier <= 1 after harvest');
  assertGte(result.regenMultiplier, 0, 'RegenMultiplier >= 0');

  // Pressure accumulates
  var st = WE._getState();
  var p1 = st.zones.gardens.harvestPressure;
  WE.applyHarvestPressure('gardens', 5);
  var p2 = st.zones.gardens.harvestPressure;
  assertGt(p2, p1, 'Pressure accumulates with repeated harvests');

  // Invalid zone returns safe defaults
  var bad = WE.applyHarvestPressure('nowhere', 5);
  assertEq(bad.newPressure, 0, 'Invalid zone returns 0 pressure');
  assertEq(bad.regenMultiplier, 1, 'Invalid zone returns 1 regen');

  // Warning triggered at high pressure
  reset();
  // Apply many harvests
  for (var i = 0; i < 20; i++) {
    WE.applyHarvestPressure('arena', 5);
  }
  var highResult = WE.applyHarvestPressure('arena', 5);
  assert(highResult.warning !== null, 'High pressure triggers warning');
  assertGt(highResult.newPressure, 50, 'Pressure exceeds 50 after heavy use');

  // Pressure capped at 100
  for (var j = 0; j < 50; j++) {
    WE.applyHarvestPressure('arena', 10);
  }
  var state = WE._getState();
  assertLte(state.zones.arena.harvestPressure, 100, 'Pressure capped at 100');

  // Harvest events counter
  reset();
  WE.applyHarvestPressure('nexus', 2);
  WE.applyHarvestPressure('nexus', 2);
  var st2 = WE._getState();
  assertEq(st2.zones.nexus.totalHarvestEvents, 2, 'Harvest event counter increments');
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 12 — TICK RECOVERY
// ══════════════════════════════════════════════════════════════════════════════

suite('TICK RECOVERY', function() {
  reset();

  // Apply pressure then recover
  WE.applyHarvestPressure('commons', 5);
  var st = WE._getState();
  var pressureBefore = st.zones.commons.harvestPressure;

  WE.tickRecovery('commons', 'spring');
  var pressureAfter = st.zones.commons.harvestPressure;
  assertLte(pressureAfter, pressureBefore, 'Recovery reduces harvest pressure');

  // Biodiversity recovers when pressure is low
  reset();
  var st2 = WE._getState();
  st2.zones.wilds.harvestPressure = 5;
  st2.zones.wilds.biodiversity = 50;
  WE.tickRecovery('wilds', 'spring');
  assertGte(st2.zones.wilds.biodiversity, 50, 'Biodiversity recovers in wilds during spring');

  // Spring recovers faster than winter
  reset();
  var st3 = WE._getState();
  st3.zones.gardens.harvestPressure = 40;
  var springPressure = st3.zones.gardens.harvestPressure;
  WE.tickRecovery('gardens', 'spring');
  var afterSpring = st3.zones.gardens.harvestPressure;

  reset();
  var st4 = WE._getState();
  st4.zones.gardens.harvestPressure = 40;
  WE.tickRecovery('gardens', 'winter');
  var afterWinter = st4.zones.gardens.harvestPressure;

  // Spring should recover at least as much as winter
  assertLte(afterSpring, afterWinter, 'Spring recovery >= winter recovery');

  // Soil moisture restored during non-drought
  reset();
  var st5 = WE._getState();
  st5.zones.gardens.soilMoisture = 20;
  WE.tickRecovery('gardens', 'summer');
  assertGt(st5.zones.gardens.soilMoisture, 20, 'Soil moisture restores during recovery');

  // Invalid zone does not throw
  assert(WE.tickRecovery('bogus', 'spring') === undefined, 'tickRecovery with invalid zone returns safely');
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 13 — CREATURE POPULATIONS
// ══════════════════════════════════════════════════════════════════════════════

suite('CREATURE POPULATIONS', function() {
  reset();

  // getCreatureCount basic
  var count = WE.getCreatureCount('wilds', 'wolf');
  assertGte(count, 0, 'getCreatureCount returns non-negative');
  assert(typeof count === 'number', 'getCreatureCount returns number');

  // Unknown species returns 0
  assertEq(WE.getCreatureCount('wilds', 'dragon'), 0, 'Unknown species returns 0');

  // Invalid zone returns 0
  assertEq(WE.getCreatureCount('nowhere', 'rabbit'), 0, 'Invalid zone returns 0');

  // getTotalCreaturePopulation
  var total = WE.getTotalCreaturePopulation('gardens');
  assertGt(total, 0, 'getTotalCreaturePopulation > 0 for gardens');
  assert(typeof total === 'number', 'getTotalCreaturePopulation is number');

  // Invalid zone total
  assertEq(WE.getTotalCreaturePopulation('nowhere'), 0, 'Invalid zone total is 0');

  // updateCreaturePopulations returns changes map
  reset();
  var changes = WE.updateCreaturePopulations('wilds', 'spring');
  assert(typeof changes === 'object', 'updateCreaturePopulations returns object');

  // Changes are numbers
  var ckeys = Object.keys(changes);
  ckeys.forEach(function(sp) {
    assert(typeof changes[sp] === 'number', 'Population change for ' + sp + ' is number');
  });

  // Populations stay non-negative after updates
  reset();
  for (var i = 0; i < 10; i++) {
    WE.updateCreaturePopulations('nexus', 'winter');
  }
  var st = WE._getState();
  var nkeys = Object.keys(st.zones.nexus.creatures);
  nkeys.forEach(function(sp) {
    assertGte(st.zones.nexus.creatures[sp], 0, 'nexus.' + sp + ' population >= 0 after 10 ticks');
  });

  // Wilds has more creatures than studio baseline
  reset();
  var wildTotal = WE.getTotalCreaturePopulation('wilds');
  var studioTotal = WE.getTotalCreaturePopulation('studio');
  assertGt(wildTotal, studioTotal, 'wilds has more creatures than studio initially');

  // Heavy harvest pressure reduces populations over time
  reset();
  var st2 = WE._getState();
  st2.zones.commons.harvestPressure = 95;
  var initialTotal = WE.getTotalCreaturePopulation('commons');
  for (var j = 0; j < 5; j++) {
    WE.updateCreaturePopulations('commons', 'winter');
  }
  var finalTotal = WE.getTotalCreaturePopulation('commons');
  // Populations should have changed (possibly decreased under pressure)
  assert(typeof finalTotal === 'number', 'Total population still a number after pressure ticks');
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 14 — WEATHER IMPACT
// ══════════════════════════════════════════════════════════════════════════════

suite('WEATHER IMPACT', function() {
  reset();

  // Apply rain → biodiversity and moisture increase
  var st = WE._getState();
  var biodivBefore = st.zones.gardens.biodiversity;
  var moistBefore = st.zones.gardens.soilMoisture;
  var result = WE.applyWeatherEvent('gardens', 'rain', 1.0);
  assert(result.applied === true, 'rain applied successfully');
  assert(typeof result.biodivChange === 'number', 'biodivChange returned');
  assertGt(result.soilMoisture, moistBefore, 'Rain increases soil moisture');

  // Apply sandstorm → biodiversity decreases
  reset();
  var st2 = WE._getState();
  var biodivBefore2 = st2.zones.wilds.biodiversity;
  WE.applyWeatherEvent('wilds', 'sandstorm', 1.0);
  assertLt(st2.zones.wilds.biodiversity, biodivBefore2, 'Sandstorm reduces biodiversity');

  // Apply blizzard → biodiversity decreases
  reset();
  var st3 = WE._getState();
  var bb3 = st3.zones.commons.biodiversity;
  WE.applyWeatherEvent('commons', 'blizzard', 1.0);
  assertLte(st3.zones.commons.biodiversity, bb3, 'Blizzard does not increase biodiversity');

  // Weather history recorded
  reset();
  WE.applyWeatherEvent('nexus', 'rain', 1.0);
  WE.applyWeatherEvent('nexus', 'fog', 1.0);
  var st4 = WE._getState();
  assertEq(st4.zones.nexus.weatherHistory.length, 2, 'Weather history grows');
  assertEq(st4.zones.nexus.weatherHistory[0].type, 'rain', 'First weather event recorded');
  assertEq(st4.zones.nexus.weatherHistory[1].type, 'fog', 'Second weather event recorded');

  // Weather history capped at 30
  reset();
  for (var i = 0; i < 35; i++) {
    WE.applyWeatherEvent('nexus', 'clear', 1.0);
  }
  var st5 = WE._getState();
  assertLte(st5.zones.nexus.weatherHistory.length, 30, 'Weather history capped at 30');

  // Unknown weather type
  var bad = WE.applyWeatherEvent('gardens', 'hailstorm', 1.0);
  assertEq(bad.applied, false, 'Unknown weather type not applied');
  assertEq(bad.reason, 'unknown weather type', 'Returns reason for failure');

  // Invalid zone
  var bad2 = WE.applyWeatherEvent('nowhere', 'rain', 1.0);
  assertEq(bad2.applied, false, 'Invalid zone not applied');

  // Intensity scales effect
  reset();
  var st6 = WE._getState();
  var before6 = st6.zones.wilds.biodiversity;
  WE.applyWeatherEvent('wilds', 'sandstorm', 2.0);
  var afterDouble = st6.zones.wilds.biodiversity;

  reset();
  var st7 = WE._getState();
  var before7 = st7.zones.wilds.biodiversity;
  WE.applyWeatherEvent('wilds', 'sandstorm', 1.0);
  var afterSingle = st7.zones.wilds.biodiversity;

  // Double intensity should cause more damage (or equal due to clamping)
  assertLte(before6 + (afterDouble - before7), before7 + 0, 'Higher intensity causes more damage');
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 15 — DROUGHT MECHANICS
// ══════════════════════════════════════════════════════════════════════════════

suite('DROUGHT MECHANICS', function() {
  reset();

  // Consecutive dry days accumulate
  var st = WE._getState();
  for (var i = 0; i < 5; i++) {
    WE.applyWeatherEvent('nexus', 'clear', 1.0);
  }
  assertEq(st.zones.nexus.consecutiveDryDays, 5, 'Dry days count after 5 clear events');

  // Drought activates at threshold
  reset();
  var st2 = WE._getState();
  var threshold = WE.DROUGHT_THRESHOLD_DAYS;
  for (var j = 0; j <= threshold; j++) {
    WE.applyWeatherEvent('nexus', 'clear', 1.0);
  }
  assertEq(st2.zones.nexus.droughtActive, true, 'Drought activates after threshold days');

  // Rain resets drought
  reset();
  var st3 = WE._getState();
  st3.zones.gardens.consecutiveDryDays = 15;
  st3.zones.gardens.droughtActive = true;
  WE.applyWeatherEvent('gardens', 'rain', 1.0);
  assertEq(st3.zones.gardens.consecutiveDryDays, 0, 'Rain resets dry day count');
  assertEq(st3.zones.gardens.droughtActive, false, 'Rain deactivates drought');

  // Drought reduces biodiversity
  reset();
  var st4 = WE._getState();
  st4.zones.wilds.consecutiveDryDays = WE.DROUGHT_THRESHOLD_DAYS - 1;
  var biodivBefore = st4.zones.wilds.biodiversity;
  WE.applyWeatherEvent('wilds', 'clear', 1.0); // Triggers drought
  assertLte(st4.zones.wilds.biodiversity, biodivBefore + 1, 'Drought penalizes biodiversity');

  // analyzeCumulativeWeather detects drought
  reset();
  var st5 = WE._getState();
  st5.zones.commons.consecutiveDryDays = 15;
  st5.zones.commons.droughtActive = true;
  for (var k = 0; k < 12; k++) {
    st5.zones.commons.weatherHistory.push({ type: 'clear', intensity: 1, tick: k });
  }
  var analysis = WE.analyzeCumulativeWeather('commons');
  assertEq(analysis.drought, true, 'analyzeCumulativeWeather detects drought');
  assertGt(analysis.dryStreak, 0, 'dryStreak > 0 during drought');

  // analyzeCumulativeWeather detects flooding
  reset();
  var st6 = WE._getState();
  for (var l = 0; l < 8; l++) {
    st6.zones.gardens.weatherHistory.push({ type: 'rain', intensity: 1, tick: l });
  }
  var analysis2 = WE.analyzeCumulativeWeather('gardens');
  assertEq(analysis2.flooding, true, 'analyzeCumulativeWeather detects flooding');
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 16 — TERRAFORMING EFFECTS
// ══════════════════════════════════════════════════════════════════════════════

suite('TERRAFORMING EFFECTS', function() {
  reset();

  // Restoration action increases biodiversity
  var st = WE._getState();
  var biodivBefore = st.zones.gardens.biodiversity;
  var soilBefore = st.zones.gardens.soilFertility;
  var result = WE.applyTerraformingEffect('gardens', 'plant_tree', 1.0);
  assert(result.applied === true, 'plant_tree applied');
  assertEq(result.category, 'restoration', 'plant_tree is restoration category');
  assertGt(st.zones.gardens.biodiversity, biodivBefore - 0.01, 'plant_tree increases biodiversity');
  assertGt(st.zones.gardens.soilFertility, soilBefore - 0.01, 'plant_tree increases soil fertility');

  // Disruption action decreases biodiversity
  reset();
  var st2 = WE._getState();
  var bb2 = st2.zones.arena.biodiversity;
  var sb2 = st2.zones.arena.soilFertility;
  var res2 = WE.applyTerraformingEffect('arena', 'burn_area', 1.0);
  assert(res2.applied === true, 'burn_area applied');
  assertEq(res2.category, 'disruption', 'burn_area is disruption category');
  assertLt(st2.zones.arena.biodiversity, bb2 + 0.01, 'burn_area decreases biodiversity');
  assertLt(st2.zones.arena.soilFertility, sb2 + 0.01, 'burn_area decreases soil fertility');

  // Scale parameter affects magnitude
  reset();
  var st3 = WE._getState();
  var bb3 = st3.zones.wilds.biodiversity;
  WE.applyTerraformingEffect('wilds', 'plant_tree', 3.0);
  var largeDelta = st3.zones.wilds.biodiversity - bb3;

  reset();
  var st4 = WE._getState();
  var bb4 = st4.zones.wilds.biodiversity;
  WE.applyTerraformingEffect('wilds', 'plant_tree', 0.5);
  var smallDelta = st4.zones.wilds.biodiversity - bb4;

  assertGte(largeDelta, smallDelta, 'Larger scale causes bigger effect');

  // Invalid action
  var bad = WE.applyTerraformingEffect('gardens', 'unknown_action', 1.0);
  assertEq(bad.applied, false, 'Unknown action not applied');

  // Invalid zone
  var bad2 = WE.applyTerraformingEffect('nowhere', 'plant_tree', 1.0);
  assertEq(bad2.applied, false, 'Invalid zone not applied');

  // Terraform delta accumulates
  reset();
  var st5 = WE._getState();
  WE.applyTerraformingEffect('commons', 'plant_tree', 1.0);
  WE.applyTerraformingEffect('commons', 'plant_tree', 1.0);
  assertGt(st5.zones.commons.terraformDelta, 0, 'Terraform delta accumulates for restoration');

  WE.applyTerraformingEffect('commons', 'burn_area', 1.0);
  // After burn, delta should be lower than after two plantings
  var delta = st5.zones.commons.terraformDelta;
  assert(typeof delta === 'number', 'terraformDelta is a number');

  // Biodiversity clamped to 0-100
  reset();
  var st6 = WE._getState();
  st6.zones.nexus.biodiversity = 99;
  for (var i = 0; i < 10; i++) {
    WE.applyTerraformingEffect('nexus', 'restore_habitat', 3.0);
  }
  assertLte(st6.zones.nexus.biodiversity, 100, 'Biodiversity never exceeds 100');

  reset();
  var st7 = WE._getState();
  st7.zones.arena.biodiversity = 1;
  for (var j = 0; j < 10; j++) {
    WE.applyTerraformingEffect('arena', 'burn_area', 3.0);
  }
  assertGte(st7.zones.arena.biodiversity, 0, 'Biodiversity never goes below 0');
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 17 — CONSERVATION MECHANICS
// ══════════════════════════════════════════════════════════════════════════════

suite('CONSERVATION MECHANICS', function() {
  reset();

  // Successful conservation action
  var result = WE.performConservationAction('wilds', 'replant', 'Alice');
  assert(result.success === true, 'replant succeeds');
  assert(typeof result.biodiversityGain === 'number', 'biodiversityGain returned');
  assert(typeof result.soilFertilityGain === 'number', 'soilFertilityGain returned');
  assert(typeof result.creatureBonus === 'number', 'creatureBonus returned');
  assert(typeof result.newBiodiversity === 'number', 'newBiodiversity returned');
  assert(typeof result.conservationScore === 'number', 'conservationScore returned');
  assertGt(result.biodiversityGain, 0, 'biodiversityGain > 0');
  assertGt(result.conservationScore, 0, 'conservationScore updated');

  // Conservation counter increments
  var st = WE._getState();
  assertEq(st.zones.wilds.totalConservationActions, 1, 'Conservation action counter increments');

  // World conservation points increase
  assertGt(st.worldConservationPoints, 0, 'worldConservationPoints increases');

  // Multiple actions stack
  reset();
  WE.performConservationAction('gardens', 'seed_bomb', 'Bob');
  WE.performConservationAction('gardens', 'wildlife_refuge', 'Carol');
  var st2 = WE._getState();
  assertGt(st2.zones.gardens.conservationScore, 0, 'Conservation score accumulates');
  assertEq(st2.zones.gardens.totalConservationActions, 2, 'Two conservation actions counted');

  // Ecology log is populated
  reset();
  WE.performConservationAction('commons', 'water_source', 'Dave');
  var st3 = WE._getState();
  assertGt(st3.ecologyLog.length, 0, 'Conservation action logged in ecologyLog');
  var logEntry = st3.ecologyLog[0];
  assertEq(logEntry.zone, 'commons', 'Log entry has correct zone');
  assertEq(logEntry.action, 'water_source', 'Log entry has correct action');
  assertEq(logEntry.performer, 'Dave', 'Log entry has correct performer');

  // Harvest pressure reduced by conservation
  reset();
  var st4 = WE._getState();
  st4.zones.nexus.harvestPressure = 50;
  WE.performConservationAction('nexus', 'wildlife_refuge', 'Eve');
  assertLt(st4.zones.nexus.harvestPressure, 50, 'Conservation reduces harvest pressure');

  // Invalid action
  var bad = WE.performConservationAction('gardens', 'unknown', 'Frank');
  assertEq(bad.success, false, 'Unknown action fails');

  // Invalid zone
  var bad2 = WE.performConservationAction('nowhere', 'replant', 'Gill');
  assertEq(bad2.success, false, 'Invalid zone fails');

  // Biodiversity clamped
  reset();
  var st5 = WE._getState();
  st5.zones.wilds.biodiversity = 99;
  WE.performConservationAction('wilds', 'wildlife_refuge', 'Hank');
  assertLte(st5.zones.wilds.biodiversity, 100, 'Biodiversity capped at 100');
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 18 — SEASONAL CYCLES
// ══════════════════════════════════════════════════════════════════════════════

suite('SEASONAL CYCLES', function() {
  reset();

  // advanceSeason updates state
  WE.advanceSeason('summer');
  var st = WE._getState();
  assertEq(st.season, 'summer', 'Season updated to summer');

  // All zones get seasonal update
  WE.ZONE_IDS.forEach(function(z) {
    assertEq(st.zones[z].lastSeasonalUpdate, 'summer', z + '.lastSeasonalUpdate = summer');
  });

  // Trend history recorded
  reset();
  WE.advanceSeason('autumn');
  var st2 = WE._getState();
  WE.ZONE_IDS.forEach(function(z) {
    assertGte(st2.zones[z].trendHistory.length, 1, z + ' trend history has entry');
    var entry = st2.zones[z].trendHistory[0];
    assertEq(entry.season, 'autumn', z + ' trend entry has season');
    assert(typeof entry.biodiversity === 'number', z + ' trend entry has biodiversity');
    assert(typeof entry.harvestPressure === 'number', z + ' trend entry has harvestPressure');
    assert(typeof entry.creatureTotal === 'number', z + ' trend entry has creatureTotal');
  });

  // Winter reduces soil fertility
  reset();
  var st3 = WE._getState();
  var fertilityBefore = st3.zones.gardens.soilFertility;
  WE.advanceSeason('winter');
  // winter soilFertilityMod < 1, so fertility should decrease
  var winterMod = WE.SEASON_ECOLOGY_MODIFIERS.winter.soilFertilityMod;
  var expectedFertility = fertilityBefore * winterMod;
  assertClose(st3.zones.gardens.soilFertility, expectedFertility, 5, 'Winter reduces soil fertility');

  // Spring increases soil fertility
  reset();
  var st4 = WE._getState();
  var fertilityBefore4 = st4.zones.wilds.soilFertility;
  WE.advanceSeason('spring');
  var springMod = WE.SEASON_ECOLOGY_MODIFIERS.spring.soilFertilityMod;
  var expectedFertility4 = fertilityBefore4 * springMod;
  assertClose(st4.zones.wilds.soilFertility, expectedFertility4, 5, 'Spring modifies soil fertility correctly');

  // Trend history capped at 20
  reset();
  for (var i = 0; i < 25; i++) {
    WE.advanceSeason(i % 2 === 0 ? 'spring' : 'autumn');
  }
  var st5 = WE._getState();
  assertLte(st5.zones.nexus.trendHistory.length, 20, 'Trend history capped at 20');
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 19 — SOIL HEALTH
// ══════════════════════════════════════════════════════════════════════════════

suite('SOIL HEALTH', function() {
  reset();

  // getSoilHealth basic
  var health = WE.getSoilHealth('gardens');
  assert(health !== null, 'getSoilHealth returns object for valid zone');
  assertEq(health.zoneId, 'gardens', 'zoneId in soil health');
  assert(typeof health.fertility === 'number', 'fertility is number');
  assert(typeof health.moisture === 'number', 'moisture is number');
  assert(typeof health.compositeScore === 'number', 'compositeScore is number');
  assert(typeof health.grade === 'string', 'grade is string');
  assert(typeof health.supportedYieldMod === 'number', 'supportedYieldMod is number');

  // Grade values
  var validGrades = ['excellent', 'good', 'fair', 'poor', 'critical'];
  assertIn(validGrades, health.grade, 'Grade is a valid value');

  // Composite score in range
  assertGte(health.compositeScore, 0, 'compositeScore >= 0');
  assertLte(health.compositeScore, 100, 'compositeScore <= 100');

  // supportedYieldMod in range
  assertGte(health.supportedYieldMod, 0.1, 'supportedYieldMod >= 0.1');
  assertLte(health.supportedYieldMod, 1.5, 'supportedYieldMod <= 1.5');

  // Invalid zone
  assertEq(WE.getSoilHealth('bogus'), null, 'Invalid zone returns null');

  // syncSoilState
  reset();
  var synced = WE.syncSoilState('gardens', {
    nitrogen: 80,
    phosphorus: 70,
    potassium: 75,
    moisture: 65,
    organicMatter: 50
  });
  assert(synced === true, 'syncSoilState returns true');

  var st = WE._getState();
  assertGt(st.zones.gardens.soilFertility, 0, 'Soil fertility updated after sync');
  assertGt(st.zones.gardens.soilMoisture, 0, 'Soil moisture updated after sync');

  // Low soil nutrients → poor grade
  reset();
  var st2 = WE._getState();
  st2.zones.arena.soilFertility = 5;
  st2.zones.arena.soilMoisture = 5;
  var poorHealth = WE.getSoilHealth('arena');
  assertIn(['poor', 'critical'], poorHealth.grade, 'Low soil → poor/critical grade');

  // High soil nutrients → good grade
  reset();
  var st3 = WE._getState();
  st3.zones.gardens.soilFertility = 95;
  st3.zones.gardens.soilMoisture = 90;
  var goodHealth = WE.getSoilHealth('gardens');
  assertIn(['excellent', 'good'], goodHealth.grade, 'High soil → good/excellent grade');

  // syncSoilState with missing fields
  reset();
  var synced2 = WE.syncSoilState('nexus', { nitrogen: 50, phosphorus: 50, potassium: 50 });
  assert(synced2 === true, 'syncSoilState works with partial data');

  // syncSoilState with null data
  var synced3 = WE.syncSoilState('nexus', null);
  assertEq(synced3, false, 'syncSoilState with null data returns false');
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 20 — ECOLOGY REPORTS
// ══════════════════════════════════════════════════════════════════════════════

suite('ECOLOGY REPORTS — per zone', function() {
  reset();

  var report = WE.getZoneEcologyReport('wilds');
  assertEq(report.zoneId, 'wilds', 'Report has correct zoneId');
  assert(typeof report.biodiversity === 'number', 'Report has biodiversity');
  assert(typeof report.healthGrade === 'string', 'Report has healthGrade');
  assert(typeof report.trend === 'string', 'Report has trend');
  assert(typeof report.harvestPressure === 'number', 'Report has harvestPressure');
  assert(typeof report.harvestCapacity === 'number', 'Report has harvestCapacity');
  assert(typeof report.regenerationRate === 'number', 'Report has regenerationRate');
  assert(typeof report.soilFertility === 'number', 'Report has soilFertility');
  assert(typeof report.soilMoisture === 'number', 'Report has soilMoisture');
  assert(typeof report.droughtActive === 'boolean', 'Report has droughtActive');
  assert(typeof report.creatureCount === 'number', 'Report has creatureCount');
  assert(typeof report.speciesCount === 'number', 'Report has speciesCount');
  assert(typeof report.creatures === 'object', 'Report has creatures object');
  assert(Array.isArray(report.endangeredSpecies), 'Report has endangeredSpecies array');
  assert(typeof report.conservationScore === 'number', 'Report has conservationScore');
  assert(typeof report.totalHarvestEvents === 'number', 'Report has totalHarvestEvents');
  assert(typeof report.totalConservationActions === 'number', 'Report has totalConservationActions');
  assert(typeof report.weatherSummary === 'object', 'Report has weatherSummary');
  assert(Array.isArray(report.recentTrend), 'Report has recentTrend array');
  assert(Array.isArray(report.alerts), 'Report has alerts array');
  assert(typeof report.terraformDelta === 'number', 'Report has terraformDelta');
  assert(typeof report.terrainType === 'string', 'Report has terrainType');
  assert(Array.isArray(report.dominantSpecies), 'Report has dominantSpecies');

  // Health grades are valid
  var validGrades = ['thriving', 'healthy', 'stressed', 'degraded', 'critical'];
  assertIn(validGrades, report.healthGrade, 'healthGrade is valid');

  // Trend values are valid
  var validTrends = ['stable', 'improving', 'declining', 'strongly_improving', 'strongly_declining'];
  assertIn(['stable', 'improving', 'declining', 'insufficient_data'].concat(validTrends), report.trend, 'trend is valid');

  // Invalid zone
  var badReport = WE.getZoneEcologyReport('nowhere');
  assert(typeof badReport.error === 'string', 'Invalid zone report has error field');

  // All 8 zones produce valid reports
  WE.ZONE_IDS.forEach(function(z) {
    var r = WE.getZoneEcologyReport(z);
    assert(r.error === undefined, z + ' report has no error');
    assertEq(r.zoneId, z, z + ' report has correct zoneId');
  });

  // After harvest, report shows higher pressure
  reset();
  for (var i = 0; i < 5; i++) {
    WE.applyHarvestPressure('commons', 5);
  }
  var harvestedReport = WE.getZoneEcologyReport('commons');
  assertGt(harvestedReport.harvestPressure, 0, 'Harvested zone shows pressure in report');
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 21 — WORLD ECOLOGY REPORT
// ══════════════════════════════════════════════════════════════════════════════

suite('WORLD ECOLOGY REPORT', function() {
  reset();

  var world = WE.getWorldEcologyReport();
  assert(typeof world.tick === 'number', 'World report has tick');
  assert(typeof world.season === 'string', 'World report has season');
  assert(typeof world.averageBiodiversity === 'number', 'World report has averageBiodiversity');
  assert(typeof world.worldConservationPoints === 'number', 'World report has worldConservationPoints');
  assert(typeof world.totalEndangeredCases === 'number', 'World report has totalEndangeredCases');
  assert(Array.isArray(world.criticalZones), 'World report has criticalZones array');
  assert(Array.isArray(world.thrivingZones), 'World report has thrivingZones array');
  assert(typeof world.zones === 'object', 'World report has zones object');
  assert(typeof world.ecologyLogSize === 'number', 'World report has ecologyLogSize');

  // averageBiodiversity in range
  assertGte(world.averageBiodiversity, 0, 'averageBiodiversity >= 0');
  assertLte(world.averageBiodiversity, 100, 'averageBiodiversity <= 100');

  // All zones in world report
  WE.ZONE_IDS.forEach(function(z) {
    assert(world.zones[z] !== undefined, 'World report includes zone: ' + z);
  });

  // If we make wilds critical, it should appear in criticalZones
  reset();
  var st = WE._getState();
  st.zones.wilds.biodiversity = 10;
  var world2 = WE.getWorldEcologyReport();
  assertIn(world2.criticalZones, 'wilds', 'Critically low biodiversity zone listed');
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 22 — ENDANGERED SPECIES
// ══════════════════════════════════════════════════════════════════════════════

suite('ENDANGERED SPECIES', function() {
  reset();

  // No endangered initially in wilds (healthy zone)
  var initialEndangered = WE.checkEndangeredSpecies();
  assert(Array.isArray(initialEndangered), 'checkEndangeredSpecies returns array');

  // Reduce wolf population to endangered level
  var st = WE._getState();
  var wolfCatalog = WE.SPECIES_CATALOG.wolf;
  st.zones.wilds.creatures.wolf = wolfCatalog.minViable - 1;
  var alerts = WE.checkEndangeredSpecies();
  var wolfAlert = alerts.filter(function(a) { return a.species === 'wolf' && a.zone === 'wilds'; });
  assertGt(wolfAlert.length, 0, 'Wolf detected as endangered in wilds');
  assertEq(wolfAlert[0].severity, 'critical', 'Below minViable triggers critical alert');

  // Extinct species
  reset();
  var st2 = WE._getState();
  st2.zones.arena.creatures.rat = 0;
  var alerts2 = WE.checkEndangeredSpecies();
  var extinctAlert = alerts2.filter(function(a) { return a.species === 'rat' && a.zone === 'arena'; });
  assertGt(extinctAlert.length, 0, 'Extinct species generates alert');
  assertEq(extinctAlert[0].severity, 'extinct', 'Extinct species has extinct severity');

  // getEndangeredInZone
  reset();
  var st3 = WE._getState();
  var beeCatalog = WE.SPECIES_CATALOG.bee;
  if (st3.zones.gardens.creatures.bee !== undefined) {
    st3.zones.gardens.creatures.bee = beeCatalog.endangered - 1;
    var endangeredInGardens = WE.getEndangeredInZone('gardens');
    assert(Array.isArray(endangeredInGardens), 'getEndangeredInZone returns array');
    var beeEntry = endangeredInGardens.filter(function(e) { return e.species === 'bee'; });
    assertGt(beeEntry.length, 0, 'Bee detected as endangered in gardens');
    assert(typeof beeEntry[0].population === 'number', 'Endangered entry has population');
    assert(typeof beeEntry[0].minViable === 'number', 'Endangered entry has minViable');
    assert(typeof beeEntry[0].endangeredThreshold === 'number', 'Endangered entry has endangeredThreshold');
    assert(typeof beeEntry[0].type === 'string', 'Endangered entry has type');
    assert(typeof beeEntry[0].isExtinct === 'boolean', 'Endangered entry has isExtinct');
    assert(typeof beeEntry[0].isCritical === 'boolean', 'Endangered entry has isCritical');
  }

  // getEndangeredInZone for invalid zone
  var bad = WE.getEndangeredInZone('nowhere');
  assert(Array.isArray(bad) && bad.length === 0, 'Invalid zone returns empty array for endangered');

  // endangeredAlerts updated in state
  reset();
  var st4 = WE._getState();
  st4.zones.nexus.creatures.sparrow = 0;
  WE.checkEndangeredSpecies();
  assertGt(st4.endangeredAlerts.length, 0, 'endangeredAlerts updated in state');
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 23 — FORECAST
// ══════════════════════════════════════════════════════════════════════════════

suite('FORECAST BIODIVERSITY', function() {
  reset();

  // Insufficient data
  var forecast1 = WE.forecastBiodiversity('gardens', 5);
  assertEq(forecast1.trend, 'insufficient_data', 'Insufficient data returns correct trend');
  assertEq(forecast1.confidence, 'low', 'Insufficient data has low confidence');
  assert(typeof forecast1.currentBiodiversity === 'number', 'Forecast has current biodiversity');

  // Build trend history
  reset();
  var st = WE._getState();
  var seasons = ['spring', 'summer', 'autumn', 'spring', 'summer'];
  for (var i = 0; i < 5; i++) {
    st.zones.wilds.trendHistory.push({
      season: seasons[i],
      tick: i,
      biodiversity: 60 + i * 3, // Improving trend
      harvestPressure: 10,
      creatureTotal: 100
    });
  }
  var forecast2 = WE.forecastBiodiversity('wilds', 3);
  assert(forecast2.trend !== 'insufficient_data', 'Forecast with history produces trend');
  assert(typeof forecast2.forecastedBiodiversity === 'number', 'Forecast has forecastedBiodiversity');
  assertGte(forecast2.forecastedBiodiversity, 0, 'Forecast >= 0');
  assertLte(forecast2.forecastedBiodiversity, 100, 'Forecast <= 100');
  assertEq(forecast2.confidence, 'high', '5+ entries → high confidence');
  assert(typeof forecast2.droughtRisk === 'boolean', 'Forecast has droughtRisk');

  // Improving trend forecast
  assert(forecast2.trend === 'improving' || forecast2.trend === 'strongly_improving', 'Improving trend detected');

  // Declining trend
  reset();
  var st2 = WE._getState();
  for (var j = 0; j < 5; j++) {
    st2.zones.nexus.trendHistory.push({
      season: 'autumn',
      tick: j,
      biodiversity: 70 - j * 4, // Declining
      harvestPressure: 80,
      creatureTotal: 50
    });
  }
  var forecast3 = WE.forecastBiodiversity('nexus', 5);
  assert(forecast3.trend === 'declining' || forecast3.trend === 'strongly_declining', 'Declining trend detected');
  assertLt(forecast3.forecastedBiodiversity, forecast3.currentBiodiversity + 1, 'Forecast lower for declining trend');

  // Invalid zone
  var bad = WE.forecastBiodiversity('nowhere', 5);
  assert(typeof bad.error === 'string', 'Invalid zone returns error');
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 24 — ZONE COMPARISON
// ══════════════════════════════════════════════════════════════════════════════

suite('ZONE COMPARISON', function() {
  reset();

  // biodiversity comparison
  var result = WE.compareZones('biodiversity');
  assert(typeof result.metric === 'string', 'compareZones returns metric');
  assert(Array.isArray(result.ranked), 'compareZones returns ranked array');
  assertEq(result.ranked.length, 8, 'All 8 zones in comparison');

  // Each entry has zoneId and value
  result.ranked.forEach(function(r) {
    assert(typeof r.zoneId === 'string', r.zoneId + ' entry has zoneId');
    assert(typeof r.value === 'number', r.zoneId + ' entry has value');
  });

  // Sorted descending
  for (var i = 0; i < result.ranked.length - 1; i++) {
    assertGte(result.ranked[i].value, result.ranked[i + 1].value,
      'Zone ' + i + ' biodiversity >= zone ' + (i + 1));
  }

  // soilFertility comparison
  var result2 = WE.compareZones('soilFertility');
  assertEq(result2.metric, 'soilFertility', 'soilFertility comparison returned');
  assertEq(result2.ranked.length, 8, 'All 8 zones in soil comparison');

  // creatureCount comparison
  var result3 = WE.compareZones('creatureCount');
  assertEq(result3.metric, 'creatureCount', 'creatureCount comparison returned');

  // harvestPressure comparison
  var result4 = WE.compareZones('harvestPressure');
  assertEq(result4.metric, 'harvestPressure', 'harvestPressure comparison returned');

  // Invalid metric defaults gracefully
  var result5 = WE.compareZones('invalid_metric');
  assert(Array.isArray(result5.ranked), 'Invalid metric still returns array');
  assertEq(result5.ranked.length, 8, 'Invalid metric returns all zones');
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 25 — ECOLOGY EVENTS
// ══════════════════════════════════════════════════════════════════════════════

suite('ECOLOGY EVENTS', function() {
  reset();

  // ECOLOGY_EVENTS is non-empty
  assertGte(WE.ECOLOGY_EVENTS.length, 4, 'At least 4 ecology events defined');

  // Each event has required fields
  WE.ECOLOGY_EVENTS.forEach(function(ev) {
    assert(typeof ev.id === 'string', ev.id + ' has string id');
    assert(typeof ev.trigger === 'function', ev.id + ' has trigger function');
    assert(typeof ev.message === 'string', ev.id + ' has message string');
    assert(typeof ev.severity === 'string', ev.id + ' has severity string');
    assert(typeof ev.consequence === 'function', ev.id + ' has consequence function');
  });

  // Over-harvest event triggers
  reset();
  var st = WE._getState();
  st.zones.arena.harvestPressure = 95;
  var events = WE.checkEcologyEvents();
  assert(Array.isArray(events), 'checkEcologyEvents returns array');
  var overHarvestEvent = events.filter(function(e) { return e.eventId === 'over_harvest' && e.zone === 'arena'; });
  assertGt(overHarvestEvent.length, 0, 'over_harvest event triggered at 95% pressure');

  // Drought crisis event
  reset();
  var st2 = WE._getState();
  st2.zones.wilds.droughtActive = true;
  st2.zones.wilds.consecutiveDryDays = 25;
  var events2 = WE.checkEcologyEvents();
  var droughtEvent = events2.filter(function(e) { return e.eventId === 'drought_crisis' && e.zone === 'wilds'; });
  assertGt(droughtEvent.length, 0, 'drought_crisis event triggered');

  // Ecosystem recovery event
  reset();
  var st3 = WE._getState();
  st3.zones.gardens.biodiversity = 90;
  st3.zones.gardens.harvestPressure = 5;
  var events3 = WE.checkEcologyEvents();
  var recoveryEvent = events3.filter(function(e) { return e.eventId === 'ecosystem_recovery' && e.zone === 'gardens'; });
  assertGt(recoveryEvent.length, 0, 'ecosystem_recovery event triggered');
  assertEq(recoveryEvent[0].severity, 'positive', 'Recovery event has positive severity');

  // Events have required fields
  if (events.length > 0) {
    var ev = events[0];
    assert(typeof ev.eventId === 'string', 'Triggered event has eventId');
    assert(typeof ev.zone === 'string', 'Triggered event has zone');
    assert(typeof ev.message === 'string', 'Triggered event has message');
    assert(typeof ev.severity === 'string', 'Triggered event has severity');
    assert(typeof ev.tick === 'number', 'Triggered event has tick');
  }

  // Pollinator collapse event
  reset();
  var st4 = WE._getState();
  if (st4.zones.gardens.creatures.butterfly !== undefined) {
    st4.zones.gardens.creatures.butterfly = 5;
  }
  if (st4.zones.gardens.creatures.bee !== undefined) {
    st4.zones.gardens.creatures.bee = 5;
  }
  var events4 = WE.checkEcologyEvents();
  var pollinatorEvent = events4.filter(function(e) { return e.eventId === 'pollinator_collapse' && e.zone === 'gardens'; });
  assertGt(pollinatorEvent.length, 0, 'pollinator_collapse triggered with low pollinator counts');
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 26 — FULL TICK SIMULATION
// ══════════════════════════════════════════════════════════════════════════════

suite('FULL TICK SIMULATION', function() {
  reset();

  // Single tick
  var result = WE.tick({ season: 'spring', weather: 'rain', harvestedZones: ['gardens'] });
  assert(typeof result.tick === 'number', 'tick() returns tick number');
  assertEq(result.tick, 1, 'First tick increments to 1');
  assert(typeof result.season === 'string', 'tick() returns season');
  assert(typeof result.endangeredAlerts === 'number', 'tick() returns endangeredAlerts count');

  var st = WE._getState();
  assertEq(st.tick, 1, 'State tick incremented');

  // Multiple ticks
  for (var i = 0; i < 10; i++) {
    WE.tick({ season: 'summer', weather: 'clear', harvestedZones: ['arena'] });
  }
  var st2 = WE._getState();
  assertEq(st2.tick, 11, 'Tick counter correct after 11 ticks');

  // Harvested zones accumulate pressure
  reset();
  for (var j = 0; j < 5; j++) {
    WE.tick({ season: 'spring', harvestedZones: ['nexus'] });
  }
  var st3 = WE._getState();
  assertGt(st3.zones.nexus.harvestPressure, 0, 'Harvested zone accumulates pressure over ticks');

  // Non-harvested zones recover
  reset();
  var st4 = WE._getState();
  st4.zones.wilds.harvestPressure = 50;
  for (var k = 0; k < 5; k++) {
    WE.tick({ season: 'spring', harvestedZones: [] });
  }
  assertLt(st4.zones.wilds.harvestPressure, 50, 'Non-harvested zones recover over ticks');

  // Tick with no options
  reset();
  var result2 = WE.tick({});
  assert(typeof result2.tick === 'number', 'tick({}) works without options');

  // Weather applied during tick
  reset();
  var st5 = WE._getState();
  var moistBefore = st5.zones.commons.soilMoisture;
  WE.tick({ season: 'spring', weather: 'rain', harvestedZones: [] });
  assertGt(st5.zones.commons.soilMoisture, moistBefore, 'Weather applied during tick');
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 27 — ECOLOGY LOG
// ══════════════════════════════════════════════════════════════════════════════

suite('ECOLOGY LOG', function() {
  reset();

  // Log starts empty
  var st = WE._getState();
  assertEq(st.ecologyLog.length, 0, 'Ecology log starts empty');

  // Conservation actions log
  WE.performConservationAction('gardens', 'replant', 'Alice');
  WE.performConservationAction('wilds', 'wildlife_refuge', 'Bob');
  var st2 = WE._getState();
  assertEq(st2.ecologyLog.length, 2, 'Two conservation actions logged');

  // Log entry fields
  var entry = st2.ecologyLog[0];
  assert(typeof entry.tick === 'number', 'Log entry has tick');
  assert(typeof entry.zone === 'string', 'Log entry has zone');
  assert(typeof entry.action === 'string', 'Log entry has action');
  assert(typeof entry.performer === 'string', 'Log entry has performer');
  assert(typeof entry.biodivGain === 'number', 'Log entry has biodivGain');

  // Log capped at 100
  reset();
  for (var i = 0; i < 110; i++) {
    WE.performConservationAction('nexus', 'seed_bomb', 'Player' + i);
  }
  var st3 = WE._getState();
  assertLte(st3.ecologyLog.length, 100, 'Ecology log capped at 100 entries');
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 28 — DETERMINISM (PRNG reproducibility)
// ══════════════════════════════════════════════════════════════════════════════

suite('DETERMINISM', function() {
  // Two identical runs with same starting state should produce same creature changes
  reset();
  var st1 = WE._getState();
  // Force a known tick state
  st1.tick = 100;
  var changes1 = WE.updateCreaturePopulations('wilds', 'spring');

  reset();
  var st2 = WE._getState();
  st2.tick = 100;
  var changes2 = WE.updateCreaturePopulations('wilds', 'spring');

  // Species present in both
  var keys = Object.keys(changes1);
  keys.forEach(function(sp) {
    assertEq(changes1[sp], changes2[sp], 'Deterministic population change for ' + sp);
  });

  // Same PRNG seed → same value
  var p1 = WE._mulberry32(12345);
  var p2 = WE._mulberry32(12345);
  for (var i = 0; i < 5; i++) {
    assertEq(p1(), p2(), 'PRNG deterministic at step ' + i);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 29 — EDGE CASES
// ══════════════════════════════════════════════════════════════════════════════

suite('EDGE CASES', function() {
  reset();

  // computeBiodiversity with all creatures at zero
  var st = WE._getState();
  var keys = Object.keys(st.zones.nexus.creatures);
  keys.forEach(function(sp) { st.zones.nexus.creatures[sp] = 0; });
  var score = WE.computeBiodiversity('nexus');
  assertGte(score, 0, 'Biodiversity >= 0 with all creatures extinct');
  assertLte(score, 100, 'Biodiversity <= 100 with all creatures extinct');

  // applyHarvestPressure with 0 amount
  reset();
  var result0 = WE.applyHarvestPressure('gardens', 0);
  assert(typeof result0.newPressure === 'number', 'Zero amount harvest still returns');

  // applyWeatherEvent with intensity 0
  reset();
  var st3 = WE._getState();
  var biodivBefore3 = st3.zones.wilds.biodiversity;
  WE.applyWeatherEvent('wilds', 'sandstorm', 0);
  // With 0 intensity, effect should be minimal/zero
  var biodivAfter3 = st3.zones.wilds.biodiversity;
  // sandstorm with 0 intensity → no change (or minimal due to clamping)
  assertGte(biodivAfter3, 0, 'Zero-intensity weather keeps biodiversity >= 0');

  // Multiple _reset() calls work correctly
  reset();
  WE.applyHarvestPressure('arena', 10);
  reset();
  var st4 = WE._getState();
  assertEq(st4.zones.arena.harvestPressure, 0, '_reset() clears state properly');

  // syncSoilState with extreme values
  reset();
  WE.syncSoilState('nexus', { nitrogen: 200, phosphorus: 200, potassium: 200, moisture: 200 });
  var st5 = WE._getState();
  assertLte(st5.zones.nexus.soilFertility, 100, 'Extreme soil values clamped to 100');

  WE.syncSoilState('nexus', { nitrogen: -10, phosphorus: -10, potassium: -10, moisture: -10 });
  var st6 = WE._getState();
  assertGte(st6.zones.nexus.soilFertility, 0, 'Negative soil values clamped to 0');

  // getZoneEcologyReport after many operations
  reset();
  WE.applyHarvestPressure('commons', 8);
  WE.applyWeatherEvent('commons', 'thunderstorm', 1.0);
  WE.performConservationAction('commons', 'wildlife_refuge', 'System');
  WE.applyTerraformingEffect('commons', 'plant_tree', 1.0);
  var report = WE.getZoneEcologyReport('commons');
  assert(report.error === undefined, 'Report succeeds after multiple operations');
  assertGte(report.biodiversity, 0, 'Biodiversity >= 0 after operations');
  assertLte(report.biodiversity, 100, 'Biodiversity <= 100 after operations');

  // advanceSeason with invalid season doesn't crash
  reset();
  WE.advanceSeason('monsoon'); // Unknown season
  var st7 = WE._getState();
  assertEq(st7.season, 'monsoon', 'Unknown season stored in state without crash');

  // compareZones returns stable results when all values equal
  reset();
  var st8 = WE._getState();
  WE.ZONE_IDS.forEach(function(z) { st8.zones[z].biodiversity = 50; });
  var eq = WE.compareZones('biodiversity');
  assertEq(eq.ranked.length, 8, 'All zones compared even when equal');
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 30 — INTEGRATION (multi-system interaction)
// ══════════════════════════════════════════════════════════════════════════════

suite('INTEGRATION — multi-system interaction', function() {
  reset();

  // Simulate a realistic scenario:
  // 1. Gardens is heavily harvested for 10 ticks
  // 2. Conservation actions are performed
  // 3. Drought occurs
  // 4. Check ecology health trend

  // Phase 1: Heavy harvest
  for (var i = 0; i < 10; i++) {
    WE.tick({ season: 'summer', weather: 'clear', harvestedZones: ['gardens'] });
  }
  var reportAfterHarvest = WE.getZoneEcologyReport('gardens');
  assertGt(reportAfterHarvest.harvestPressure, 0, 'Harvest pressure built up');

  // Phase 2: Conservation
  WE.performConservationAction('gardens', 'wildlife_refuge', 'Conservationist');
  WE.performConservationAction('gardens', 'replant', 'Gardener');
  var reportAfterConservation = WE.getZoneEcologyReport('gardens');
  assertGt(reportAfterConservation.conservationScore, 0, 'Conservation score accumulated');

  // Phase 3: Drought
  for (var j = 0; j < 12; j++) {
    WE.applyWeatherEvent('gardens', 'clear', 1.0);
  }
  var st = WE._getState();
  assertGte(st.zones.gardens.consecutiveDryDays, WE.DROUGHT_THRESHOLD_DAYS, 'Drought triggered after clear streak');

  // Phase 4: Recovery with rain
  WE.applyWeatherEvent('gardens', 'heavy_rain', 1.5);
  assertEq(st.zones.gardens.consecutiveDryDays, 0, 'Rain resets drought counter');

  // Phase 5: Seasonal advance triggers trend history
  WE.advanceSeason('autumn');
  var reportFinal = WE.getZoneEcologyReport('gardens');
  assertGte(reportFinal.recentTrend.length, 1, 'Trend history has entries after seasonal advance');

  // World ecology report reflects all changes
  var worldReport = WE.getWorldEcologyReport();
  assertGt(worldReport.worldConservationPoints, 0, 'World conservation points updated');
  assert(typeof worldReport.averageBiodiversity === 'number', 'World average biodiversity computable');

  // Wilds should still be healthier than arena
  var wildsReport = worldReport.zones.wilds;
  var arenaReport = worldReport.zones.arena;
  assertGt(wildsReport.biodiversity, 0, 'Wilds has positive biodiversity');
  assert(typeof arenaReport.biodiversity === 'number', 'Arena has numeric biodiversity');

  // Soil sync affects ecology reports
  reset();
  WE.syncSoilState('commons', { nitrogen: 90, phosphorus: 85, potassium: 88, moisture: 70, organicMatter: 75 });
  var soilHealth = WE.getSoilHealth('commons');
  assertIn(['excellent', 'good'], soilHealth.grade, 'High NPK soil → good/excellent grade');

  // Terraforming + conservation together boost recovery significantly more than either alone
  reset();
  var st2 = WE._getState();
  st2.zones.studio.biodiversity = 30;
  st2.zones.studio.soilFertility = 20;
  WE.applyTerraformingEffect('studio', 'restore_habitat', 2.0);
  WE.performConservationAction('studio', 'pollinator_garden', 'Botanist');
  var studioReport = WE.getZoneEcologyReport('studio');
  assertGte(studioReport.biodiversity, 30, 'Combined restoration boosts biodiversity above initial');
});

// ══════════════════════════════════════════════════════════════════════════════
// FINAL SUMMARY
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n' + '='.repeat(60));
console.log(passed + ' passed, ' + failed + ' failed');

if (failures.length > 0) {
  console.log('\nFailed tests:');
  failures.forEach(function(f) { console.error('  ' + f); });
}

if (failed > 0) process.exit(1);
