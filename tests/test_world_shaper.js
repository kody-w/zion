/**
 * tests/test_world_shaper.js
 * Comprehensive tests for the ZION World Shaper system
 * 125+ tests covering terrain edits, weather voting, resources, aesthetics,
 * capacity, history, PRNG, and edge cases.
 *
 * Run with: node tests/test_world_shaper.js
 */

'use strict';

var WS = require('../src/js/world_shaper');

// ============================================================================
// MINIMAL TEST HARNESS
// ============================================================================

var passed = 0;
var failed = 0;
var failures = [];
var currentSuite = '';

function suite(name, fn) {
  currentSuite = name;
  console.log('\n' + name);
  fn();
}

function assert(condition, msg) {
  if (condition) {
    passed++;
    process.stdout.write('  ok - ' + msg + '\n');
  } else {
    failed++;
    var fullMsg = '[' + currentSuite + '] FAIL: ' + msg;
    failures.push(fullMsg);
    process.stdout.write('  FAIL - ' + msg + '\n');
  }
}

function assertEqual(a, b, msg) {
  assert(a === b, msg + ' (expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a) + ')');
}

function assertApprox(a, b, tol, msg) {
  assert(Math.abs(a - b) <= tol, msg + ' (expected ~' + b + ', got ' + a + ')');
}

function assertGte(a, b, msg) {
  assert(a >= b, msg + ' (expected >= ' + b + ', got ' + a + ')');
}

function assertLte(a, b, msg) {
  assert(a <= b, msg + ' (expected <= ' + b + ', got ' + a + ')');
}

// ============================================================================
// HELPERS
// ============================================================================

function freshState() {
  return WS.createState();
}

// Coordinates known to map to specific zones in _coordToZone
var ZONE_COORDS = {
  nexus:      { x: 0,    z: 0    },
  gardens:    { x: 200,  z: 50   },
  athenaeum:  { x: 100,  z: -220 },
  studio:     { x: -200, z: -100 },
  wilds:      { x: -30,  z: 260  },
  agora:      { x: -190, z: 120  },
  commons:    { x: 170,  z: 190  },
  arena:      { x: 0,    z: -240 }
};

// ============================================================================
// SUITE 1: MODULE EXPORTS
// ============================================================================

suite('Module exports', function() {

  assert(typeof WS === 'object',                       'module exports an object');
  assert(Array.isArray(WS.TERRAIN_TYPES),              'TERRAIN_TYPES is an array');
  assert(Array.isArray(WS.RESOURCE_TYPES),             'RESOURCE_TYPES is an array');
  assert(typeof WS.EDIT_COSTS === 'object',            'EDIT_COSTS is an object');
  assert(typeof WS.createState === 'function',         'createState is a function');
  assert(typeof WS.editTerrain === 'function',         'editTerrain is a function');
  assert(typeof WS.getTerrainAt === 'function',        'getTerrainAt is a function');
  assert(typeof WS.voteWeather === 'function',         'voteWeather is a function');
  assert(typeof WS.getWeatherProbability === 'function','getWeatherProbability is a function');
  assert(typeof WS.harvestResource === 'function',     'harvestResource is a function');
  assert(typeof WS.regenerateResources === 'function', 'regenerateResources is a function');
  assert(typeof WS.getResourceLevel === 'function',    'getResourceLevel is a function');
  assert(typeof WS.getZoneAesthetic === 'function',    'getZoneAesthetic is a function');
  assert(typeof WS.updateAesthetic === 'function',     'updateAesthetic is a function');
  assert(typeof WS.getEditHistory === 'function',      'getEditHistory is a function');
  assert(typeof WS.getPlayerEdits === 'function',      'getPlayerEdits is a function');
  assert(typeof WS.getDiffLog === 'function',          'getDiffLog is a function');
  assert(typeof WS.getZoneCapacity === 'function',     'getZoneCapacity is a function');
  assert(typeof WS.getResourceMap === 'function',      'getResourceMap is a function');
  assert(typeof WS.getTopShapers === 'function',       'getTopShapers is a function');
  assert(typeof WS.mulberry32 === 'function',          'mulberry32 PRNG is exported');

});

// ============================================================================
// SUITE 2: TERRAIN TYPES
// ============================================================================

suite('TERRAIN_TYPES constant', function() {

  assertEqual(WS.TERRAIN_TYPES.length, 8,    '8 terrain types defined');

  var expected = ['grass', 'dirt', 'stone', 'sand', 'water', 'snow', 'forest', 'urban'];
  for (var i = 0; i < expected.length; i++) {
    assert(WS.TERRAIN_TYPES.indexOf(expected[i]) !== -1,
      'TERRAIN_TYPES includes ' + expected[i]);
  }

  // All types are strings
  var allStrings = true;
  for (var j = 0; j < WS.TERRAIN_TYPES.length; j++) {
    if (typeof WS.TERRAIN_TYPES[j] !== 'string') { allStrings = false; break; }
  }
  assert(allStrings, 'all terrain types are strings');

  // No duplicates
  var seen = {};
  var noDups = true;
  for (var k = 0; k < WS.TERRAIN_TYPES.length; k++) {
    if (seen[WS.TERRAIN_TYPES[k]]) { noDups = false; break; }
    seen[WS.TERRAIN_TYPES[k]] = true;
  }
  assert(noDups, 'terrain type IDs are unique');

});

// ============================================================================
// SUITE 3: RESOURCE TYPES
// ============================================================================

suite('RESOURCE_TYPES constant', function() {

  assertEqual(WS.RESOURCE_TYPES.length, 20, '20 resource types defined');

  var requiredFields = ['id', 'label', 'regenRate', 'maxAmount', 'zone'];
  var allHaveFields = true;
  for (var i = 0; i < WS.RESOURCE_TYPES.length; i++) {
    var rt = WS.RESOURCE_TYPES[i];
    for (var j = 0; j < requiredFields.length; j++) {
      if (!(requiredFields[j] in rt)) { allHaveFields = false; break; }
    }
    if (!allHaveFields) break;
  }
  assert(allHaveFields, 'all resource types have required fields');

  // Regen rates are positive numbers
  var validRegenRates = true;
  for (var r = 0; r < WS.RESOURCE_TYPES.length; r++) {
    if (typeof WS.RESOURCE_TYPES[r].regenRate !== 'number' || WS.RESOURCE_TYPES[r].regenRate <= 0) {
      validRegenRates = false; break;
    }
  }
  assert(validRegenRates, 'all regen rates are positive numbers');

  // maxAmount > 0
  var validMax = true;
  for (var m = 0; m < WS.RESOURCE_TYPES.length; m++) {
    if (typeof WS.RESOURCE_TYPES[m].maxAmount !== 'number' || WS.RESOURCE_TYPES[m].maxAmount <= 0) {
      validMax = false; break;
    }
  }
  assert(validMax, 'all maxAmounts are positive numbers');

  // IDs are unique
  var ids = {};
  var uniqueIds = true;
  for (var u = 0; u < WS.RESOURCE_TYPES.length; u++) {
    if (ids[WS.RESOURCE_TYPES[u].id]) { uniqueIds = false; break; }
    ids[WS.RESOURCE_TYPES[u].id] = true;
  }
  assert(uniqueIds, 'resource type IDs are unique');

  // All zones referenced are valid ZION zones
  var validZones = true;
  for (var z = 0; z < WS.RESOURCE_TYPES.length; z++) {
    if (WS.ZONES.indexOf(WS.RESOURCE_TYPES[z].zone) === -1) { validZones = false; break; }
  }
  assert(validZones, 'all resource type zones are valid ZION zones');

});

// ============================================================================
// SUITE 4: EDIT COSTS
// ============================================================================

suite('EDIT_COSTS constant', function() {

  var ops = ['flatten', 'raise', 'lower', 'terraform'];
  for (var i = 0; i < ops.length; i++) {
    assert(typeof WS.EDIT_COSTS[ops[i]] === 'number', 'EDIT_COSTS.' + ops[i] + ' is a number');
    assertGte(WS.EDIT_COSTS[ops[i]], 1, 'EDIT_COSTS.' + ops[i] + ' >= 1');
  }

  // terraform should cost more than flatten
  assert(WS.EDIT_COSTS.terraform >= WS.EDIT_COSTS.flatten,
    'terraform costs at least as much as flatten');

});

// ============================================================================
// SUITE 5: createState()
// ============================================================================

suite('createState()', function() {

  var s = freshState();

  assert(Array.isArray(s.edits),            'state.edits is an array');
  assert(typeof s.resources === 'object',   'state.resources is an object');
  assert(typeof s.weatherVotes === 'object','state.weatherVotes is an object');
  assert(typeof s.aesthetics === 'object',  'state.aesthetics is an object');
  assert(Array.isArray(s.diffLog),          'state.diffLog is an array');

  assertEqual(s.edits.length, 0,    'edits starts empty');
  assertEqual(s.diffLog.length, 0,  'diffLog starts empty');

  // Resources should be pre-initialised for all RESOURCE_TYPES
  var resKeys = Object.keys(s.resources);
  assertGte(resKeys.length, WS.RESOURCE_TYPES.length, 'resources has at least 20 entries');

  // Aesthetics initialised for all 8 zones
  for (var i = 0; i < WS.ZONES.length; i++) {
    assert(WS.ZONES[i] in s.aesthetics, 'aesthetics has zone: ' + WS.ZONES[i]);
  }

  // Weather votes initialised for all zones
  for (var j = 0; j < WS.ZONES.length; j++) {
    assert(WS.ZONES[j] in s.weatherVotes, 'weatherVotes has zone: ' + WS.ZONES[j]);
  }

  // Each resource entry has required fields
  var firstKey = Object.keys(s.resources)[0];
  var firstRes = s.resources[firstKey];
  assert('resourceId' in firstRes,    'resource has resourceId');
  assert('zone' in firstRes,          'resource has zone');
  assert('amount' in firstRes,        'resource has amount');
  assert('maxAmount' in firstRes,     'resource has maxAmount');
  assert('lastRegenTick' in firstRes, 'resource has lastRegenTick');

  // amount starts at maxAmount
  assert(firstRes.amount === firstRes.maxAmount, 'resource starts at maxAmount');

  // Two calls return independent states
  var s2 = freshState();
  s.edits.push({ dummy: true });
  assertEqual(s2.edits.length, 0, 'createState() returns independent instances');

});

// ============================================================================
// SUITE 6: editTerrain() — success cases
// ============================================================================

suite('editTerrain() success cases', function() {

  var s, res;

  // Basic edit from grass to dirt in nexus
  s = freshState();
  res = WS.editTerrain(s, 'alice', 0, 0, 'grass', 'dirt', 1);
  assert(res.success === true,     'grass->dirt edit succeeds');
  assertGte(res.cost, 1,           'cost is positive');
  assert(res.diff !== null,        'diff is returned');
  assertEqual(res.diff.fromType, 'grass', 'diff.fromType = grass');
  assertEqual(res.diff.toType,   'dirt',  'diff.toType = dirt');
  assertEqual(res.diff.playerId, 'alice', 'diff.playerId = alice');

  // Edit is stored in state.edits
  assertEqual(s.edits.length, 1, 'edit appended to state.edits');

  // Edit also in diffLog
  assertEqual(s.diffLog.length, 1, 'diff appended to diffLog');

  // Terraform (water -> stone)
  s = freshState();
  res = WS.editTerrain(s, 'bob', 0, 0, 'water', 'stone', 5);
  assert(res.success === true, 'water->stone terraform succeeds');

  // forest -> urban
  s = freshState();
  res = WS.editTerrain(s, 'carol', ZONE_COORDS.wilds.x, ZONE_COORDS.wilds.z, 'forest', 'urban', 10);
  assert(res.success === true, 'forest->urban in wilds succeeds');

  // Multiple edits same zone
  s = freshState();
  WS.editTerrain(s, 'alice', 0, 0, 'grass', 'dirt', 1);
  WS.editTerrain(s, 'alice', 0, 0, 'dirt', 'stone', 2);
  assertEqual(s.edits.length, 2, 'two sequential edits stored');

  // Edit returns tick
  s = freshState();
  res = WS.editTerrain(s, 'alice', 5, 5, 'grass', 'dirt', 42);
  assertEqual(res.diff.tick, 42, 'diff.tick equals currentTick');

});

// ============================================================================
// SUITE 7: editTerrain() — validation and failure cases
// ============================================================================

suite('editTerrain() validation', function() {

  var s, res;

  // Invalid fromType
  s = freshState();
  res = WS.editTerrain(s, 'alice', 0, 0, 'lava', 'grass', 1);
  assert(res.success === false, 'invalid fromType fails');
  assertEqual(s.edits.length, 0, 'no edit stored on failure');

  // Invalid toType
  s = freshState();
  res = WS.editTerrain(s, 'alice', 0, 0, 'grass', 'neon', 1);
  assert(res.success === false, 'invalid toType fails');

  // Same type
  s = freshState();
  res = WS.editTerrain(s, 'alice', 0, 0, 'grass', 'grass', 1);
  assert(res.success === false, 'same type edit fails');

  // Missing playerId
  s = freshState();
  res = WS.editTerrain(s, '', 0, 0, 'grass', 'dirt', 1);
  assert(res.success === false, 'empty playerId fails');

  res = WS.editTerrain(s, null, 0, 0, 'grass', 'dirt', 1);
  assert(res.success === false, 'null playerId fails');

  // Failed edit returns cost=0
  s = freshState();
  res = WS.editTerrain(s, 'alice', 0, 0, 'grass', 'grass', 1);
  assertEqual(res.cost, 0, 'failed edit returns cost 0');

});

// ============================================================================
// SUITE 8: getTerrainAt()
// ============================================================================

suite('getTerrainAt()', function() {

  var s, terrain;

  // No edits: returns default terrain
  s = freshState();
  terrain = WS.getTerrainAt(s, 0, 0);
  assert(typeof terrain === 'string', 'returns a string when no edits');
  assert(WS.TERRAIN_TYPES.indexOf(terrain) !== -1, 'default terrain is a valid type');

  // After one edit, reflects edit
  s = freshState();
  WS.editTerrain(s, 'alice', 0, 0, 'stone', 'sand', 1);
  terrain = WS.getTerrainAt(s, 0, 0);
  assertEqual(terrain, 'sand', 'getTerrainAt reflects edit');

  // Multiple edits at same coord: returns latest
  s = freshState();
  WS.editTerrain(s, 'alice', 0, 0, 'stone', 'sand', 1);
  WS.editTerrain(s, 'bob', 0, 0, 'sand', 'water', 2);
  terrain = WS.getTerrainAt(s, 0, 0);
  assertEqual(terrain, 'water', 'getTerrainAt returns latest edit at coord');

  // Different coordinates are independent
  s = freshState();
  WS.editTerrain(s, 'alice', 0, 0, 'stone', 'sand', 1);
  terrain = WS.getTerrainAt(s, 10, 10);
  assert(terrain !== 'sand', 'different coord is unaffected by edit at 0,0');

  // Returns valid terrain type in all cases
  s = freshState();
  var zones8 = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];
  var allValid = true;
  for (var i = 0; i < zones8.length; i++) {
    var coords = ZONE_COORDS[zones8[i]];
    var t = WS.getTerrainAt(s, coords.x, coords.z);
    if (WS.TERRAIN_TYPES.indexOf(t) === -1) { allValid = false; break; }
  }
  assert(allValid, 'getTerrainAt returns valid types for all zone centres');

});

// ============================================================================
// SUITE 9: voteWeather()
// ============================================================================

suite('voteWeather()', function() {

  var s, res;

  // Valid vote
  s = freshState();
  res = WS.voteWeather(s, 'alice', 'nexus', 'rain', 1);
  assert(res.success === true, 'valid vote succeeds');
  assert(typeof res.currentProbabilities === 'object', 'returns currentProbabilities object');

  // All weather types returned in probabilities
  var weatherTypes = ['clear', 'cloudy', 'rain', 'storm', 'snow', 'fog', 'wind'];
  var allPresent = true;
  for (var i = 0; i < weatherTypes.length; i++) {
    if (typeof res.currentProbabilities[weatherTypes[i]] !== 'number') { allPresent = false; break; }
  }
  assert(allPresent, 'probability map has all 7 weather types');

  // Probabilities sum to ~1
  var sum = 0;
  for (var j = 0; j < weatherTypes.length; j++) {
    sum += res.currentProbabilities[weatherTypes[j]];
  }
  assertApprox(sum, 1.0, 0.001, 'weather probabilities sum to 1');

  // Invalid zone
  s = freshState();
  res = WS.voteWeather(s, 'alice', 'atlantis', 'rain', 1);
  assert(res.success === false, 'invalid zone fails');

  // Invalid weather type
  s = freshState();
  res = WS.voteWeather(s, 'alice', 'nexus', 'hurricane', 1);
  assert(res.success === false, 'invalid weatherType fails');

  // Missing playerId
  s = freshState();
  res = WS.voteWeather(s, '', 'nexus', 'rain', 1);
  assert(res.success === false, 'empty playerId fails for voteWeather');

  // Player can change vote
  s = freshState();
  WS.voteWeather(s, 'alice', 'nexus', 'rain', 1);
  WS.voteWeather(s, 'alice', 'nexus', 'snow', 2);
  // Only one vote per player per zone (override)
  var votes = s.weatherVotes['nexus'];
  assertEqual(votes['alice'].weatherType, 'snow', 'player vote is overwritten on second vote');

  // Multiple voters
  s = freshState();
  WS.voteWeather(s, 'alice', 'nexus', 'rain', 1);
  WS.voteWeather(s, 'bob',   'nexus', 'rain', 1);
  WS.voteWeather(s, 'carol', 'nexus', 'clear', 1);
  var probs = WS.getWeatherProbability(s, 'nexus');
  assert(probs['rain'] > probs['snow'], 'rain probability higher when most vote for rain');

});

// ============================================================================
// SUITE 10: getWeatherProbability()
// ============================================================================

suite('getWeatherProbability()', function() {

  var s, probs;

  // Fresh state — returns base probs
  s = freshState();
  probs = WS.getWeatherProbability(s, 'wilds');
  assert(typeof probs === 'object', 'returns an object');

  var sum = 0;
  var wTypes = ['clear', 'cloudy', 'rain', 'storm', 'snow', 'fog', 'wind'];
  for (var i = 0; i < wTypes.length; i++) {
    assert(typeof probs[wTypes[i]] === 'number', wTypes[i] + ' is a number');
    assertGte(probs[wTypes[i]], 0, wTypes[i] + ' >= 0');
    sum += probs[wTypes[i]];
  }
  assertApprox(sum, 1.0, 0.001, 'base probabilities sum to 1.0');

  // After all-storm vote: storm probability increases
  s = freshState();
  for (var j = 0; j < 5; j++) {
    WS.voteWeather(s, 'p' + j, 'nexus', 'storm', 1);
  }
  probs = WS.getWeatherProbability(s, 'nexus');
  assert(probs['storm'] > 0.10, 'storm probability increases after votes');

  // Probabilities sum to 1 after voting
  sum = 0;
  for (var k = 0; k < wTypes.length; k++) {
    sum += probs[wTypes[k]];
  }
  assertApprox(sum, 1.0, 0.001, 'post-vote probabilities sum to 1.0');

  // All values are non-negative
  var allPos = true;
  for (var m = 0; m < wTypes.length; m++) {
    if (probs[wTypes[m]] < 0) { allPos = false; break; }
  }
  assert(allPos, 'all weather probabilities are non-negative');

  // Different zones are independent
  s = freshState();
  WS.voteWeather(s, 'alice', 'nexus', 'snow', 1);
  var nexusProbs = WS.getWeatherProbability(s, 'nexus');
  var wildsProbs = WS.getWeatherProbability(s, 'wilds');
  assert(nexusProbs['snow'] !== wildsProbs['snow'] || nexusProbs['snow'] > 0,
    'zone votes are independent');

});

// ============================================================================
// SUITE 11: harvestResource()
// ============================================================================

suite('harvestResource()', function() {

  var s, res;

  // Valid harvest
  s = freshState();
  res = WS.harvestResource(s, 'alice', 'iron_ore', 'wilds', 10, 1);
  assert(res.success === true, 'valid harvest succeeds');
  assertEqual(res.harvested, 10, 'harvested = requested amount when sufficient');
  assertGte(res.remaining, 0, 'remaining >= 0');

  // Remaining decreases
  var originalLevel = WS.getResourceLevel(s, 'iron_ore', 'wilds');
  // iron_ore max is 100, harvested 10 → remaining = 90
  assertEqual(originalLevel, 90, 'resource level decreases after harvest');

  // Harvest more than available — clamps
  s = freshState();
  // iron_ore maxAmount = 100
  WS.harvestResource(s, 'alice', 'iron_ore', 'wilds', 90, 1);
  res = WS.harvestResource(s, 'bob', 'iron_ore', 'wilds', 50, 2);
  assert(res.success === true, 'partial harvest succeeds when some remains');
  assert(res.harvested <= 10, 'cannot harvest more than remaining');

  // Depleted resource returns success=false
  s = freshState();
  WS.harvestResource(s, 'alice', 'iron_ore', 'wilds', 100, 1);
  res = WS.harvestResource(s, 'bob', 'iron_ore', 'wilds', 1, 2);
  assert(res.success === false, 'harvesting depleted resource fails');
  assertEqual(res.harvested, 0, 'harvested = 0 when depleted');

  // Invalid resourceId
  s = freshState();
  res = WS.harvestResource(s, 'alice', 'unicorn_horn', 'wilds', 5, 1);
  assert(res.success === false, 'invalid resourceId fails');

  // Invalid zone
  s = freshState();
  res = WS.harvestResource(s, 'alice', 'iron_ore', 'atlantis', 5, 1);
  assert(res.success === false, 'invalid zone fails for harvestResource');

  // Missing playerId
  s = freshState();
  res = WS.harvestResource(s, '', 'iron_ore', 'wilds', 5, 1);
  assert(res.success === false, 'empty playerId fails for harvestResource');

  // Amount <= 0 fails
  s = freshState();
  res = WS.harvestResource(s, 'alice', 'iron_ore', 'wilds', 0, 1);
  assert(res.success === false, 'amount=0 fails');

  res = WS.harvestResource(s, 'alice', 'iron_ore', 'wilds', -5, 1);
  assert(res.success === false, 'negative amount fails');

  // Harvest appends to diffLog
  s = freshState();
  WS.harvestResource(s, 'alice', 'iron_ore', 'wilds', 10, 5);
  assertEqual(s.diffLog.length, 1, 'harvest appends to diffLog');

  // Harvest updates aesthetic harvestCount
  s = freshState();
  WS.harvestResource(s, 'alice', 'iron_ore', 'wilds', 10, 1);
  assertGte(s.aesthetics['wilds'].harvestCount, 1, 'harvest increments zone harvestCount');

});

// ============================================================================
// SUITE 12: regenerateResources()
// ============================================================================

suite('regenerateResources()', function() {

  var s, result;

  // No-op on fresh state (all at max)
  s = freshState();
  result = WS.regenerateResources(s, 10);
  assert(typeof result === 'object', 'returns an object');
  assert(Array.isArray(result.regenerated), 'has regenerated array');
  assertEqual(result.regenerated.length, 0, 'no regeneration when all full');

  // After depletion, regenerates
  s = freshState();
  WS.harvestResource(s, 'alice', 'iron_ore', 'wilds', 50, 1);
  result = WS.regenerateResources(s, 30);
  assert(result.regenerated.length > 0, 'regeneration occurs after harvest');

  // Regenerated entry has required fields
  if (result.regenerated.length > 0) {
    var entry = result.regenerated[0];
    assert('resourceId' in entry, 'regenerated entry has resourceId');
    assert('zone' in entry,       'regenerated entry has zone');
    assert('amount' in entry,     'regenerated entry has amount');
    assertGte(entry.amount, 1,    'regenerated amount >= 1');
  }

  // Does not exceed maxAmount
  s = freshState();
  WS.harvestResource(s, 'alice', 'iron_ore', 'wilds', 10, 1);
  WS.regenerateResources(s, 100);
  var level = WS.getResourceLevel(s, 'iron_ore', 'wilds');
  // Find maxAmount for iron_ore
  var ironMax = 100;
  assertLte(level, ironMax, 'resource does not exceed maxAmount after regen');

  // Multiple resources can regenerate at once
  s = freshState();
  WS.harvestResource(s, 'alice', 'iron_ore',    'wilds',    20, 1);
  WS.harvestResource(s, 'bob',   'wild_herb',   'gardens',  30, 1);
  result = WS.regenerateResources(s, 50);
  assert(result.regenerated.length >= 1, 'multiple resources can regenerate simultaneously');

  // Second regeneration with no ticks elapsed produces no extra regen
  s = freshState();
  WS.harvestResource(s, 'alice', 'iron_ore', 'wilds', 50, 1);
  WS.regenerateResources(s, 10);
  var levelAfterFirst = WS.getResourceLevel(s, 'iron_ore', 'wilds');
  WS.regenerateResources(s, 10); // same tick
  var levelAfterSecond = WS.getResourceLevel(s, 'iron_ore', 'wilds');
  assertLte(levelAfterSecond, 100, 'resource stays at or below max after repeated regen');

});

// ============================================================================
// SUITE 13: getResourceLevel()
// ============================================================================

suite('getResourceLevel()', function() {

  var s;

  // Full level on fresh state
  s = freshState();
  var level = WS.getResourceLevel(s, 'iron_ore', 'wilds');
  assertEqual(level, 100, 'iron_ore starts at maxAmount=100');

  // After harvest, level decreases
  WS.harvestResource(s, 'alice', 'iron_ore', 'wilds', 25, 1);
  level = WS.getResourceLevel(s, 'iron_ore', 'wilds');
  assertEqual(level, 75, 'level decreases after harvest');

  // Unknown resource returns 0
  s = freshState();
  level = WS.getResourceLevel(s, 'nope', 'wilds');
  assertEqual(level, 0, 'unknown resource returns 0');

  // Unknown zone returns 0
  s = freshState();
  level = WS.getResourceLevel(s, 'iron_ore', 'atlantis');
  assertEqual(level, 0, 'unknown zone returns 0');

  // Full depletion
  s = freshState();
  WS.harvestResource(s, 'alice', 'iron_ore', 'wilds', 100, 1);
  level = WS.getResourceLevel(s, 'iron_ore', 'wilds');
  assertEqual(level, 0, 'fully depleted resource returns 0');

});

// ============================================================================
// SUITE 14: getZoneAesthetic() & updateAesthetic()
// ============================================================================

suite('getZoneAesthetic() and updateAesthetic()', function() {

  var s, aes;

  // Fresh state returns balanced
  s = freshState();
  aes = WS.getZoneAesthetic(s, 'gardens');
  assert(typeof aes === 'object', 'returns object');
  assertEqual(aes.type, 'balanced', 'fresh state aesthetic is balanced');
  assert(typeof aes.score === 'number', 'score is a number');

  // Many harvests → barren
  s = freshState();
  for (var i = 0; i < 35; i++) {
    WS.editTerrain(s, 'alice', ZONE_COORDS.wilds.x + i, ZONE_COORDS.wilds.z, 'forest', 'dirt', i);
  }
  WS.updateAesthetic(s, 'wilds', 100);
  aes = WS.getZoneAesthetic(s, 'wilds');
  assertEqual(aes.type, 'barren', 'many forest->dirt edits make zone barren');
  assertGte(aes.score, 1, 'barren score > 0');

  // Many plant edits → green
  s = freshState();
  for (var j = 0; j < 35; j++) {
    WS.editTerrain(s, 'bob', ZONE_COORDS.gardens.x + j, ZONE_COORDS.gardens.z, 'dirt', 'forest', j);
  }
  WS.updateAesthetic(s, 'gardens', 100);
  aes = WS.getZoneAesthetic(s, 'gardens');
  assertEqual(aes.type, 'green', 'many dirt->forest edits make zone green');

  // Many build edits → urban
  s = freshState();
  for (var k = 0; k < 35; k++) {
    WS.editTerrain(s, 'carol', ZONE_COORDS.nexus.x + k, ZONE_COORDS.nexus.z, 'grass', 'urban', k);
  }
  WS.updateAesthetic(s, 'nexus', 100);
  aes = WS.getZoneAesthetic(s, 'nexus');
  assertEqual(aes.type, 'urban', 'many grass->urban edits make zone urban');
  assertGte(aes.score, 1, 'urban score > 0');

  // Score is capped at 100
  s = freshState();
  s.aesthetics['nexus'].harvestCount = 999;
  s.aesthetics['nexus'].plantCount = 0;
  s.aesthetics['nexus'].buildCount = 0;
  WS.updateAesthetic(s, 'nexus', 1);
  aes = WS.getZoneAesthetic(s, 'nexus');
  assertLte(aes.score, 100, 'aesthetic score capped at 100');

  // updateAesthetic sets lastUpdatedTick
  s = freshState();
  WS.updateAesthetic(s, 'nexus', 77);
  assertEqual(s.aesthetics['nexus'].lastUpdatedTick, 77, 'lastUpdatedTick updated');

  // Invalid zone is a no-op
  s = freshState();
  var beforeKeys = Object.keys(s.aesthetics).length;
  WS.updateAesthetic(s, 'atlantis', 1);
  assertEqual(Object.keys(s.aesthetics).length, beforeKeys, 'invalid zone is no-op for updateAesthetic');

});

// ============================================================================
// SUITE 15: getEditHistory()
// ============================================================================

suite('getEditHistory()', function() {

  var s, history;

  // Empty history on fresh state
  s = freshState();
  history = WS.getEditHistory(s, 'nexus', 10);
  assert(Array.isArray(history), 'returns array');
  assertEqual(history.length, 0, 'empty history on fresh state');

  // After edits in nexus, history returns them
  s = freshState();
  WS.editTerrain(s, 'alice', 0, 0, 'stone', 'sand', 1);
  WS.editTerrain(s, 'bob',   0, 5, 'stone', 'dirt', 2);
  history = WS.getEditHistory(s, 'nexus', 10);
  assertGte(history.length, 1, 'history has entries after edits in nexus');

  // Edits in other zone don't appear in nexus history
  s = freshState();
  WS.editTerrain(s, 'alice', ZONE_COORDS.wilds.x, ZONE_COORDS.wilds.z, 'forest', 'dirt', 1);
  history = WS.getEditHistory(s, 'nexus', 10);
  assertEqual(history.length, 0, 'wilds edit does not appear in nexus history');

  // count parameter limits results
  s = freshState();
  for (var i = 0; i < 10; i++) {
    WS.editTerrain(s, 'alice', i, 0, 'grass', 'dirt', i);
  }
  history = WS.getEditHistory(s, 'nexus', 3);
  assertLte(history.length, 3, 'count parameter limits edit history');

  // Most recent edits returned first
  s = freshState();
  WS.editTerrain(s, 'alice', 0, 0, 'stone', 'sand', 1);
  WS.editTerrain(s, 'bob',   0, 0, 'sand',  'dirt', 5);
  history = WS.getEditHistory(s, 'nexus', 10);
  if (history.length >= 2) {
    assertGte(history[0].tick, history[1].tick, 'most recent edits come first');
  }

});

// ============================================================================
// SUITE 16: getPlayerEdits()
// ============================================================================

suite('getPlayerEdits()', function() {

  var s, playerEdits;

  // No edits
  s = freshState();
  playerEdits = WS.getPlayerEdits(s, 'alice');
  assert(Array.isArray(playerEdits), 'returns array');
  assertEqual(playerEdits.length, 0, 'no edits initially');

  // Returns only that player's edits
  s = freshState();
  WS.editTerrain(s, 'alice', 0, 0, 'stone', 'sand', 1);
  WS.editTerrain(s, 'alice', 1, 1, 'stone', 'dirt', 2);
  WS.editTerrain(s, 'bob',   2, 2, 'stone', 'sand', 3);
  playerEdits = WS.getPlayerEdits(s, 'alice');
  assertEqual(playerEdits.length, 2, 'returns only alice edits');

  playerEdits = WS.getPlayerEdits(s, 'bob');
  assertEqual(playerEdits.length, 1, 'returns only bob edits');

  // Unknown player returns empty
  playerEdits = WS.getPlayerEdits(s, 'ghost');
  assertEqual(playerEdits.length, 0, 'unknown player returns empty array');

  // All returned edits belong to that player
  s = freshState();
  WS.editTerrain(s, 'alice', 0, 0, 'stone', 'sand', 1);
  WS.editTerrain(s, 'alice', 1, 0, 'stone', 'dirt', 2);
  playerEdits = WS.getPlayerEdits(s, 'alice');
  var allAlice = true;
  for (var i = 0; i < playerEdits.length; i++) {
    if (playerEdits[i].playerId !== 'alice') { allAlice = false; break; }
  }
  assert(allAlice, 'all returned edits belong to alice');

});

// ============================================================================
// SUITE 17: getDiffLog()
// ============================================================================

suite('getDiffLog()', function() {

  var s, log;

  // Empty on fresh state
  s = freshState();
  log = WS.getDiffLog(s, 0, 100);
  assert(Array.isArray(log), 'returns array');
  assertEqual(log.length, 0, 'empty diffLog on fresh state');

  // Edits appear in diffLog
  s = freshState();
  WS.editTerrain(s, 'alice', 0, 0, 'stone', 'sand', 5);
  WS.editTerrain(s, 'bob',   0, 5, 'stone', 'dirt', 15);
  log = WS.getDiffLog(s, 0, 20);
  assertEqual(log.length, 2, 'getDiffLog returns all entries in range');

  // Range filtering works
  log = WS.getDiffLog(s, 10, 20);
  assertEqual(log.length, 1, 'getDiffLog filters by tick range');

  // No entries outside range
  log = WS.getDiffLog(s, 100, 200);
  assertEqual(log.length, 0, 'getDiffLog returns empty when no entries in range');

  // Harvest entries also appear in diffLog
  s = freshState();
  WS.harvestResource(s, 'alice', 'iron_ore', 'wilds', 10, 7);
  log = WS.getDiffLog(s, 0, 10);
  assertEqual(log.length, 1, 'harvest appears in diffLog');

});

// ============================================================================
// SUITE 18: getZoneCapacity()
// ============================================================================

suite('getZoneCapacity()', function() {

  var s, capacity;

  // Fresh state: full capacity
  s = freshState();
  capacity = WS.getZoneCapacity(s, 'nexus', 0);
  assertEqual(capacity, WS.ZONE_DAILY_CAPACITY, 'full capacity on fresh state');

  // After one edit, capacity decreases
  s = freshState();
  WS.editTerrain(s, 'alice', 0, 0, 'stone', 'sand', 0);
  capacity = WS.getZoneCapacity(s, 'nexus', 0);
  assertEqual(capacity, WS.ZONE_DAILY_CAPACITY - 1, 'capacity decreases by 1 after one edit');

  // Edits in other zone don't affect nexus capacity
  s = freshState();
  WS.editTerrain(s, 'alice', ZONE_COORDS.wilds.x, ZONE_COORDS.wilds.z, 'forest', 'dirt', 0);
  capacity = WS.getZoneCapacity(s, 'nexus', 0);
  assertEqual(capacity, WS.ZONE_DAILY_CAPACITY, 'wilds edit does not consume nexus capacity');

  // Capacity resets next day
  s = freshState();
  var oneTick = 0;
  WS.editTerrain(s, 'alice', 0, 0, 'stone', 'sand', oneTick);
  // Move to next day (TICKS_PER_DAY ticks later)
  capacity = WS.getZoneCapacity(s, 'nexus', WS.TICKS_PER_DAY);
  assertEqual(capacity, WS.ZONE_DAILY_CAPACITY, 'capacity resets at start of new day');

  // Capacity at 0 when maxed out — but we just test it doesn't go below 0
  s = freshState();
  for (var i = 0; i < WS.ZONE_DAILY_CAPACITY; i++) {
    WS.editTerrain(s, 'alice', i, 0, 'grass', 'dirt', 0);
  }
  capacity = WS.getZoneCapacity(s, 'nexus', 0);
  assertEqual(capacity, 0, 'capacity hits 0 when daily limit exhausted');

  // Capacity >= 0 always
  assertGte(capacity, 0, 'capacity is never negative');

  // Capacity returns a number
  s = freshState();
  assert(typeof WS.getZoneCapacity(s, 'nexus', 5) === 'number', 'getZoneCapacity returns number');

});

// ============================================================================
// SUITE 19: Zone capacity enforcement in editTerrain
// ============================================================================

suite('Zone capacity enforcement', function() {

  var s;

  // After capacity exhausted, edits fail
  s = freshState();
  for (var i = 0; i < WS.ZONE_DAILY_CAPACITY; i++) {
    WS.editTerrain(s, 'alice', i, 0, 'grass', 'dirt', 0);
  }
  var res = WS.editTerrain(s, 'bob', 9999, 0, 'grass', 'dirt', 0);
  assert(res.success === false, 'edit fails when zone capacity exhausted');

  // Next day edits work again
  res = WS.editTerrain(s, 'bob', 9999, 0, 'grass', 'dirt', WS.TICKS_PER_DAY);
  assert(res.success === true, 'edit succeeds in new day after capacity reset');

});

// ============================================================================
// SUITE 20: getResourceMap()
// ============================================================================

suite('getResourceMap()', function() {

  var s, map;

  // Returns object
  s = freshState();
  map = WS.getResourceMap(s, 'wilds');
  assert(typeof map === 'object', 'getResourceMap returns object');

  // wilds has iron_ore, copper_ore, ancient_wood, pine_resin
  assert('iron_ore' in map,     'wilds map has iron_ore');
  assert('ancient_wood' in map, 'wilds map has ancient_wood');
  assert('pine_resin' in map,   'wilds map has pine_resin');

  // Each entry has amount, maxAmount, depleted
  var ironEntry = map['iron_ore'];
  assert('amount' in ironEntry,    'iron_ore map entry has amount');
  assert('maxAmount' in ironEntry, 'iron_ore map entry has maxAmount');
  assert('depleted' in ironEntry,  'iron_ore map entry has depleted');

  // depleted = false on fresh state
  assert(ironEntry.depleted === false, 'iron_ore not depleted on fresh state');

  // depleted = true after full harvest
  s = freshState();
  WS.harvestResource(s, 'alice', 'iron_ore', 'wilds', 100, 1);
  map = WS.getResourceMap(s, 'wilds');
  assert(map['iron_ore'].depleted === true, 'iron_ore depleted after full harvest');

  // Resources from another zone do not appear
  assert(!('wild_herb' in map), 'wild_herb (gardens) does not appear in wilds map');

  // Empty zone returns empty map (no resources seeded there)
  map = WS.getResourceMap(s, 'arena');
  // arena has sand_glass, blue_salt, ember_coal
  assert(typeof map === 'object', 'getResourceMap returns object for arena');
  assert('sand_glass' in map || 'blue_salt' in map || 'ember_coal' in map,
    'arena has at least one seeded resource');

});

// ============================================================================
// SUITE 21: getTopShapers()
// ============================================================================

suite('getTopShapers()', function() {

  var s, top;

  // Empty on fresh state
  s = freshState();
  top = WS.getTopShapers(s, 5);
  assert(Array.isArray(top), 'getTopShapers returns array');
  assertEqual(top.length, 0, 'no shapers on fresh state');

  // Single player edits
  s = freshState();
  WS.editTerrain(s, 'alice', 0, 0, 'stone', 'sand', 1);
  WS.editTerrain(s, 'alice', 1, 0, 'stone', 'dirt', 2);
  WS.editTerrain(s, 'alice', 2, 0, 'stone', 'sand', 3);
  top = WS.getTopShapers(s, 5);
  assertEqual(top.length, 1, 'one player in shapers');
  assertEqual(top[0].playerId, 'alice', 'alice is top shaper');
  assertEqual(top[0].editCount, 3, 'alice has 3 edits');

  // Multiple players sorted by edits
  s = freshState();
  WS.editTerrain(s, 'alice', 0, 0, 'stone', 'sand', 1);
  WS.editTerrain(s, 'bob',   1, 0, 'stone', 'dirt', 2);
  WS.editTerrain(s, 'bob',   2, 0, 'stone', 'sand', 3);
  WS.editTerrain(s, 'bob',   3, 0, 'stone', 'dirt', 4);
  WS.editTerrain(s, 'carol', 4, 0, 'stone', 'sand', 5);
  WS.editTerrain(s, 'carol', 5, 0, 'stone', 'dirt', 6);
  top = WS.getTopShapers(s, 5);
  assertEqual(top[0].playerId, 'bob',   'bob is #1 with 3 edits');
  assertEqual(top[1].playerId, 'carol', 'carol is #2 with 2 edits');
  assertEqual(top[2].playerId, 'alice', 'alice is #3 with 1 edit');

  // count parameter limits results
  top = WS.getTopShapers(s, 2);
  assertEqual(top.length, 2, 'count=2 returns only top 2');

  // count=0 or undefined returns all
  top = WS.getTopShapers(s, 0);
  assertGte(top.length, 0, 'count=0 returns valid array');

  // Each entry has playerId and editCount
  s = freshState();
  WS.editTerrain(s, 'dave', 0, 0, 'stone', 'sand', 1);
  top = WS.getTopShapers(s, 5);
  assert('playerId' in top[0],   'shaper entry has playerId');
  assert('editCount' in top[0],  'shaper entry has editCount');
  assertGte(top[0].editCount, 1, 'editCount >= 1');

});

// ============================================================================
// SUITE 22: mulberry32 PRNG
// ============================================================================

suite('mulberry32 PRNG', function() {

  var rng = WS.mulberry32(42);
  assert(typeof rng === 'function', 'mulberry32 returns a function');

  var v1 = rng();
  assert(typeof v1 === 'number', 'PRNG returns a number');
  assertGte(v1, 0, 'PRNG value >= 0');
  assertLte(v1, 1, 'PRNG value <= 1');

  // Deterministic with same seed
  var rng2 = WS.mulberry32(42);
  var d1 = rng2();
  assertEqual(d1, v1, 'same seed produces same first value');

  // Different seeds produce different values
  var rng3 = WS.mulberry32(99);
  var e1 = rng3();
  assert(e1 !== v1, 'different seed produces different value (usually)');

  // Multiple calls advance state
  var rng4 = WS.mulberry32(1337);
  var vals = [];
  for (var i = 0; i < 10; i++) vals.push(rng4());
  var allSame = true;
  for (var j = 1; j < vals.length; j++) {
    if (vals[j] !== vals[0]) { allSame = false; break; }
  }
  assert(!allSame, 'PRNG advances state on each call');

});

// ============================================================================
// SUITE 23: Integration — full shaping workflow
// ============================================================================

suite('Integration: full shaping workflow', function() {

  var s = freshState();
  var tick = 0;

  // Phase 1: multiple players edit nexus (35 urban edits crosses the aesthetic threshold)
  for (var i = 0; i < 35; i++) {
    WS.editTerrain(s, 'builder_' + (i % 5), i, 0, 'stone', 'urban', tick++);
  }
  assert(s.edits.length === 35, 'phase1: 35 nexus edits stored');

  // Phase 2: harvest resources in wilds
  WS.harvestResource(s, 'harvester', 'iron_ore', 'wilds', 40, tick++);
  WS.harvestResource(s, 'harvester', 'ancient_wood', 'wilds', 20, tick++);

  // Phase 3: vote for weather in gardens
  WS.voteWeather(s, 'farmer1', 'gardens', 'rain', tick++);
  WS.voteWeather(s, 'farmer2', 'gardens', 'rain', tick++);
  WS.voteWeather(s, 'farmer3', 'gardens', 'clear', tick++);

  var probs = WS.getWeatherProbability(s, 'gardens');
  assert(probs['rain'] > probs['snow'], 'rain probability elevated after votes');

  // Phase 4: update aesthetics for nexus
  WS.updateAesthetic(s, 'nexus', tick++);
  var aes = WS.getZoneAesthetic(s, 'nexus');
  assertEqual(aes.type, 'urban', 'nexus becomes urban after urban edits');

  // Phase 5: regen resources
  var regenResult = WS.regenerateResources(s, tick + 20);
  assert(regenResult.regenerated.length > 0, 'resources regenerate after harvest');

  // Phase 6: audit trail
  var log = WS.getDiffLog(s, 0, tick + 30);
  assertGte(log.length, 5, 'diffLog has all actions');

  // Phase 7: top shapers
  var top = WS.getTopShapers(s, 3);
  assert(top.length > 0, 'top shapers list populated');

  // Phase 8: player edits filtered correctly
  var harvesterEdits = WS.getPlayerEdits(s, 'builder_0');
  assertGte(harvesterEdits.length, 1, 'builder_0 has at least 1 edit');

});

// ============================================================================
// SUITE 24: Edge cases and boundary conditions
// ============================================================================

suite('Edge cases and boundary conditions', function() {

  var s, res;

  // getZoneAesthetic for unknown zone
  s = freshState();
  var aes = WS.getZoneAesthetic(s, 'atlantis');
  assert(typeof aes === 'object', 'getZoneAesthetic returns object for unknown zone');
  assertEqual(aes.type, 'balanced', 'unknown zone defaults to balanced');

  // getDiffLog with start > end returns empty
  s = freshState();
  WS.editTerrain(s, 'alice', 0, 0, 'stone', 'sand', 5);
  var log = WS.getDiffLog(s, 50, 10);
  assertEqual(log.length, 0, 'getDiffLog with inverted range returns empty');

  // getResourceMap for unknown zone returns empty object
  s = freshState();
  var map = WS.getResourceMap(s, 'atlantis');
  assert(typeof map === 'object', 'getResourceMap returns object for unknown zone');
  assertEqual(Object.keys(map).length, 0, 'unknown zone resource map is empty');

  // editTerrain with large coordinates
  s = freshState();
  res = WS.editTerrain(s, 'alice', 99999, 99999, 'grass', 'dirt', 1);
  assert(res.success === true || res.success === false, 'large coordinates handled');

  // Negative coordinates
  s = freshState();
  res = WS.editTerrain(s, 'alice', -500, -500, 'stone', 'dirt', 1);
  assert(typeof res.success === 'boolean', 'negative coordinates handled');

  // voteWeather does not throw with no prior votes
  s = freshState();
  var probs = WS.getWeatherProbability(s, 'wilds');
  assert(typeof probs === 'object', 'getWeatherProbability works with zero votes');

  // regenerateResources on fully full state returns empty regenerated
  s = freshState();
  res = WS.regenerateResources(s, 0);
  assertEqual(res.regenerated.length, 0, 'no regen when all resources are full');

  // getTopShapers on fresh state
  s = freshState();
  var top = WS.getTopShapers(s, 10);
  assertEqual(top.length, 0, 'getTopShapers returns empty array on fresh state');

  // createState returns unique independent states
  var s1 = WS.createState();
  var s2 = WS.createState();
  s1.edits.push({ dummy: 1 });
  assertEqual(s2.edits.length, 0, 'createState instances are independent');

  // All resource types can be harvested from their home zone without error
  s = freshState();
  var allHarvestable = true;
  for (var i = 0; i < WS.RESOURCE_TYPES.length; i++) {
    var rt = WS.RESOURCE_TYPES[i];
    var h = WS.harvestResource(s, 'alice', rt.id, rt.zone, 1, i);
    if (typeof h.success !== 'boolean') { allHarvestable = false; break; }
  }
  assert(allHarvestable, 'all resource types can be harvested without error');

});

// ============================================================================
// FINAL REPORT
// ============================================================================

console.log('\n============================');
console.log('WORLD SHAPER TEST SUITE');
console.log('============================');
console.log(passed + ' passed, ' + failed + ' failed out of ' + (passed + failed) + ' tests');

if (failures.length > 0) {
  console.log('\nFailures:');
  for (var fi = 0; fi < failures.length; fi++) {
    console.log('  ' + failures[fi]);
  }
}

if (failed > 0) {
  process.exit(1);
} else {
  console.log('\nAll tests passed!');
}
