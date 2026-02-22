/**
 * tests/test_treasure_maps.js
 * Comprehensive tests for src/js/treasure_maps.js — ZION Treasure Map System
 * 200+ tests covering all exported functions and features.
 *
 * Run with: node tests/test_treasure_maps.js
 */

'use strict';

var TM = require('../src/js/treasure_maps');

// ============================================================================
// MINIMAL TEST HARNESS
// ============================================================================

var passed = 0;
var failed = 0;
var errors = [];
var currentSuite = '';

function suite(name, fn) {
  currentSuite = name;
  console.log('\n== ' + name + ' ==');
  fn();
}

function assert(condition, msg) {
  if (condition) {
    passed++;
    process.stdout.write('  PASS: ' + msg + '\n');
  } else {
    failed++;
    errors.push('[' + currentSuite + '] FAIL: ' + msg);
    process.stdout.write('  FAIL: ' + msg + '\n');
  }
}

function assertEqual(a, b, msg) {
  assert(a === b, msg + ' (expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a) + ')');
}

function assertNotEqual(a, b, msg) {
  assert(a !== b, msg + ' (should not equal ' + JSON.stringify(b) + ')');
}

function assertGTE(a, b, msg) {
  assert(a >= b, msg + ' (' + a + ' >= ' + b + ')');
}

function assertLTE(a, b, msg) {
  assert(a <= b, msg + ' (' + a + ' <= ' + b + ')');
}

function assertIn(arr, item, msg) {
  assert(arr.indexOf(item) !== -1, msg + ' (looking for ' + JSON.stringify(item) + ')');
}

function assertNotIn(arr, item, msg) {
  assert(arr.indexOf(item) === -1, msg + ' (should not contain ' + JSON.stringify(item) + ')');
}

function assertExists(val, msg) {
  assert(val !== null && val !== undefined, msg + ' (exists)');
}

function assertArray(val, msg) {
  assert(Array.isArray(val), msg + ' (is array)');
}

function assertObject(val, msg) {
  assert(val !== null && typeof val === 'object' && !Array.isArray(val), msg + ' (is object)');
}

// ============================================================================
// HELPERS
// ============================================================================

var playerSeq = 0;
function uid() { return 'player_' + (++playerSeq); }

var mapSeq = 0;
function mid() { return 'map_test_' + (++mapSeq); }

function freshState() {
  return {};
}

/** Build a state with a stored map definition */
function stateWithMap(map) {
  var s = freshState();
  if (!s.mapDefinitions) { s.mapDefinitions = {}; }
  s.mapDefinitions[map.id] = map;
  return s;
}

/** Generate and activate a map for a player, returning { map, state, pid } */
function activeMapScenario(rarity) {
  var pid   = uid();
  var mapId = mid();
  var map   = TM.generateMap(mapId, rarity || 'common');
  var state = stateWithMap(map);
  TM.giveMap(mapId, pid, state);
  TM.activateMap(map, pid, state);
  return { map: map, state: state, pid: pid };
}

/** Solve all clues for a scenario using each clue's own coords */
function solveAllClues(scenario) {
  var map   = scenario.map;
  var pid   = scenario.pid;
  var state = scenario.state;
  for (var i = 0; i < map.clues.length; i++) {
    var clue = map.clues[i];
    TM.solveClue(map, pid, clue.step, clue.coords, clue.zoneId, state);
  }
}

// ============================================================================
// SUITE 1: Module Exports
// ============================================================================

suite('Module Exports', function() {

  assert(typeof TM === 'object', 'TM module is an object');

  // Constants
  assertArray(TM.RARITY_TIERS,    'RARITY_TIERS is exported and is an array');
  assertObject(TM.RARITY_META,    'RARITY_META is exported and is an object');
  assertObject(TM.RARITY_WEIGHTS, 'RARITY_WEIGHTS is exported and is an object');
  assertArray(TM.ZONES,           'ZONES is exported and is an array');
  assertArray(TM.ZONE_IDS,        'ZONE_IDS is exported and is an array');
  assertArray(TM.LANDMARKS,       'LANDMARKS is exported and is an array');
  assertArray(TM.CLUE_TEMPLATES,  'CLUE_TEMPLATES is exported and is an array');
  assertArray(TM.FRAGMENT_TYPES,  'FRAGMENT_TYPES is exported and is an array');
  assertObject(TM.REWARD_ITEMS,   'REWARD_ITEMS is exported and is an object');
  assertObject(TM.REWARD_LORE,    'REWARD_LORE is exported and is an object');
  assertObject(TM.REWARD_COSMETICS,'REWARD_COSMETICS is exported and is an object');
  assertObject(TM.COOP_BONUS,     'COOP_BONUS is exported and is an object');

  // Functions
  assertEqual(typeof TM.createRng,               'function', 'createRng exported');
  assertEqual(typeof TM.hashString,              'function', 'hashString exported');
  assertEqual(typeof TM.seedFromId,              'function', 'seedFromId exported');
  assertEqual(typeof TM.rollRarity,              'function', 'rollRarity exported');
  assertEqual(typeof TM.generateMap,             'function', 'generateMap exported');
  assertEqual(typeof TM.buildRewardCache,        'function', 'buildRewardCache exported');
  assertEqual(typeof TM.isMapExpired,            'function', 'isMapExpired exported');
  assertEqual(typeof TM.timeRemaining,           'function', 'timeRemaining exported');
  assertEqual(typeof TM.activateMap,             'function', 'activateMap exported');
  assertEqual(typeof TM.deactivateMap,           'function', 'deactivateMap exported');
  assertEqual(typeof TM.solveClue,               'function', 'solveClue exported');
  assertEqual(typeof TM.claimCache,              'function', 'claimCache exported');
  assertEqual(typeof TM.tradeMap,                'function', 'tradeMap exported');
  assertEqual(typeof TM.giveMap,                 'function', 'giveMap exported');
  assertEqual(typeof TM.awardFragment,           'function', 'awardFragment exported');
  assertEqual(typeof TM.craftMapFromFragments,   'function', 'craftMapFromFragments exported');
  assertEqual(typeof TM.getFragmentType,         'function', 'getFragmentType exported');
  assertEqual(typeof TM.createSharedMap,         'function', 'createSharedMap exported');
  assertEqual(typeof TM.activateSharedMap,       'function', 'activateSharedMap exported');
  assertEqual(typeof TM.getMapHistory,           'function', 'getMapHistory exported');
  assertEqual(typeof TM.getActiveMaps,           'function', 'getActiveMaps exported');
  assertEqual(typeof TM.getOwnedMaps,            'function', 'getOwnedMaps exported');
  assertEqual(typeof TM.getFragments,            'function', 'getFragments exported');
  assertEqual(typeof TM.countCompletedByRarity,  'function', 'countCompletedByRarity exported');
  assertEqual(typeof TM.totalSparkEarned,        'function', 'totalSparkEarned exported');
  assertEqual(typeof TM.hasCompleted,            'function', 'hasCompleted exported');
  assertEqual(typeof TM.handleMessage,           'function', 'handleMessage exported');
  assertEqual(typeof TM.getCurrentClue,          'function', 'getCurrentClue exported');
  assertEqual(typeof TM.getZone,                 'function', 'getZone exported');
  assertEqual(typeof TM.toInventoryItem,         'function', 'toInventoryItem exported');
  assertEqual(typeof TM.ensurePlayerState,       'function', 'ensurePlayerState exported');
});

// ============================================================================
// SUITE 2: PRNG and Hashing
// ============================================================================

suite('PRNG and Hashing', function() {

  assert(TM.createRng(42) !== null, 'createRng returns a function');
  assertEqual(typeof TM.createRng(42), 'function', 'createRng returns a function type');

  var rng = TM.createRng(123);
  var v1  = rng();
  assert(v1 >= 0 && v1 < 1, 'RNG value in [0, 1)');

  // Determinism: same seed => same sequence
  var rngA = TM.createRng(999);
  var rngB = TM.createRng(999);
  var seqA = [rngA(), rngA(), rngA(), rngA(), rngA()];
  var seqB = [rngB(), rngB(), rngB(), rngB(), rngB()];
  assert(JSON.stringify(seqA) === JSON.stringify(seqB), 'Same seed => same sequence');

  // Different seeds => different sequences
  var rngC = TM.createRng(1);
  var rngD = TM.createRng(2);
  var seqC = [rngC(), rngC(), rngC()];
  var seqD = [rngD(), rngD(), rngD()];
  assert(JSON.stringify(seqC) !== JSON.stringify(seqD), 'Different seeds => different sequences');

  // hashString
  var h1 = TM.hashString('hello');
  var h2 = TM.hashString('hello');
  assertEqual(h1, h2, 'hashString is deterministic');
  assertNotEqual(TM.hashString('aaa'), TM.hashString('bbb'), 'Different strings hash differently');
  assert(typeof h1 === 'number', 'hashString returns a number');
  assert(h1 >= 0, 'hashString returns non-negative');

  // seedFromId
  var s1 = TM.seedFromId('map_abc');
  var s2 = TM.seedFromId('map_abc');
  assertEqual(s1, s2, 'seedFromId is deterministic');
  assertNotEqual(TM.seedFromId('map_abc'), TM.seedFromId('map_xyz'), 'Different IDs => different seeds');

  // Zero seed fallback
  var rngZero = TM.createRng(0);
  var vz = rngZero();
  assert(vz >= 0 && vz < 1, 'Zero seed RNG still produces valid values');

  // 100 values all in range
  var rng100 = TM.createRng(77);
  var allInRange = true;
  for (var i = 0; i < 100; i++) {
    var v = rng100();
    if (v < 0 || v >= 1) { allInRange = false; break; }
  }
  assert(allInRange, '100 consecutive RNG values all in [0, 1)');
});

// ============================================================================
// SUITE 3: Rarity Tiers
// ============================================================================

suite('Rarity Tiers', function() {

  assertEqual(TM.RARITY_TIERS.length, 5, 'Five rarity tiers defined');
  assertIn(TM.RARITY_TIERS, 'common',    'common tier exists');
  assertIn(TM.RARITY_TIERS, 'uncommon',  'uncommon tier exists');
  assertIn(TM.RARITY_TIERS, 'rare',      'rare tier exists');
  assertIn(TM.RARITY_TIERS, 'epic',      'epic tier exists');
  assertIn(TM.RARITY_TIERS, 'legendary', 'legendary tier exists');

  TM.RARITY_TIERS.forEach(function(r) {
    var meta = TM.RARITY_META[r];
    assertExists(meta,              'RARITY_META has entry for ' + r);
    assertExists(meta.label,        r + ' has label');
    assertExists(meta.color,        r + ' has color');
    assert(meta.clueMin >= 3,       r + ' clueMin >= 3');
    assert(meta.clueMax <= 7,       r + ' clueMax <= 7');
    assert(meta.clueMin <= meta.clueMax, r + ' clueMin <= clueMax');
    assert(meta.fragmentsNeeded >= 2,   r + ' fragmentsNeeded >= 2');
    assert(meta.sparkMin > 0,       r + ' sparkMin > 0');
    assert(meta.sparkMax > meta.sparkMin, r + ' sparkMax > sparkMin');
  });

  // common has no expiry
  assert(TM.RARITY_META.common.expiryDays === null, 'common maps never expire');

  // higher tiers expire sooner
  assert(TM.RARITY_META.legendary.expiryDays < TM.RARITY_META.rare.expiryDays,
    'legendary expires sooner than rare');

  // Weights exist and are positive
  TM.RARITY_TIERS.forEach(function(r) {
    assert(TM.RARITY_WEIGHTS[r] > 0, r + ' has positive weight');
  });

  // Common is more common than legendary
  assert(TM.RARITY_WEIGHTS.common > TM.RARITY_WEIGHTS.legendary,
    'common has higher weight than legendary');
});

// ============================================================================
// SUITE 4: rollRarity
// ============================================================================

suite('rollRarity', function() {

  // Roll 1000 times, all results valid
  var rng = TM.createRng(42);
  var counts = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 };
  var allValid = true;
  for (var i = 0; i < 1000; i++) {
    var r = TM.rollRarity(rng);
    if (TM.RARITY_TIERS.indexOf(r) === -1) { allValid = false; break; }
    counts[r]++;
  }
  assert(allValid, 'rollRarity always returns a valid tier over 1000 rolls');
  assert(counts.common > counts.legendary, 'common rolled more than legendary over 1000 trials');
  assert(counts.uncommon > 0, 'uncommon rolled at least once');
  assert(counts.rare > 0,     'rare rolled at least once');

  // Deterministic with same seed
  var rngX = TM.createRng(55);
  var rngY = TM.createRng(55);
  assertEqual(TM.rollRarity(rngX), TM.rollRarity(rngY), 'rollRarity is deterministic with same seed');
});

// ============================================================================
// SUITE 5: Zone and Landmark Data
// ============================================================================

suite('Zone and Landmark Data', function() {

  assertEqual(TM.ZONES.length, 8, 'Eight zones defined');
  assertEqual(TM.ZONE_IDS.length, 8, 'ZONE_IDS has 8 entries');

  TM.ZONES.forEach(function(z) {
    assertExists(z.id,     'Zone has id: ' + z.id);
    assertExists(z.name,   'Zone has name: ' + z.id);
    assert(typeof z.cx === 'number', z.id + ' has numeric cx');
    assert(typeof z.cz === 'number', z.id + ' has numeric cz');
    assert(z.radius > 0,             z.id + ' has positive radius');
  });

  assertIn(TM.ZONE_IDS, 'nexus',     'nexus in ZONE_IDS');
  assertIn(TM.ZONE_IDS, 'gardens',   'gardens in ZONE_IDS');
  assertIn(TM.ZONE_IDS, 'athenaeum', 'athenaeum in ZONE_IDS');
  assertIn(TM.ZONE_IDS, 'studio',    'studio in ZONE_IDS');
  assertIn(TM.ZONE_IDS, 'wilds',     'wilds in ZONE_IDS');
  assertIn(TM.ZONE_IDS, 'agora',     'agora in ZONE_IDS');
  assertIn(TM.ZONE_IDS, 'commons',   'commons in ZONE_IDS');
  assertIn(TM.ZONE_IDS, 'arena',     'arena in ZONE_IDS');

  // getZone
  var nexus = TM.getZone('nexus');
  assertExists(nexus,        'getZone(nexus) returns a zone');
  assertEqual(nexus.id, 'nexus', 'getZone returns correct zone');
  assertEqual(nexus.cx, 0,       'nexus cx is 0');
  assertEqual(nexus.cz, 0,       'nexus cz is 0');

  assert(TM.getZone('unknown') === null, 'getZone returns null for unknown zone');

  // Landmarks
  assert(TM.LANDMARKS.length >= 10, 'At least 10 landmarks defined');
  TM.LANDMARKS.forEach(function(lm) {
    assertExists(lm.id,   'Landmark has id: ' + lm.id);
    assertExists(lm.name, 'Landmark has name: ' + lm.id);
    assertIn(TM.ZONE_IDS, lm.zone, 'Landmark ' + lm.id + ' zone is valid');
  });
});

// ============================================================================
// SUITE 6: Map Generation
// ============================================================================

suite('Map Generation', function() {

  TM.RARITY_TIERS.forEach(function(rarity) {
    var map = TM.generateMap('gen_test_' + rarity, rarity);

    assertExists(map,               rarity + ': map generated');
    assertEqual(map.rarity, rarity, rarity + ': map.rarity correct');
    assertExists(map.id,            rarity + ': map has id');
    assertExists(map.label,         rarity + ': map has label');
    assertExists(map.color,         rarity + ': map has color');
    assertArray(map.clues,          rarity + ': map has clues array');
    assertExists(map.finalZone,     rarity + ': map has finalZone');
    assertExists(map.finalCoords,   rarity + ': map has finalCoords');
    assertExists(map.rewards,       rarity + ': map has rewards');
    assertEqual(map.type, 'treasure_map', rarity + ': map.type is treasure_map');

    var meta = TM.RARITY_META[rarity];
    assertGTE(map.clues.length, meta.clueMin, rarity + ': clue count >= clueMin');
    assertLTE(map.clues.length, meta.clueMax, rarity + ': clue count <= clueMax');
    assertEqual(map.clueCount, map.clues.length, rarity + ': clueCount matches clues.length');

    // Clue fields
    map.clues.forEach(function(c, idx) {
      assert(c.step === idx + 1,       rarity + ' clue ' + (idx+1) + ': step is sequential');
      assertExists(c.text,             rarity + ' clue ' + (idx+1) + ': has text');
      assertIn(TM.ZONE_IDS, c.zoneId, rarity + ' clue ' + (idx+1) + ': zoneId is valid');
      assertExists(c.landmark,         rarity + ' clue ' + (idx+1) + ': has landmark');
      assertExists(c.coords,           rarity + ' clue ' + (idx+1) + ': has coords');
      assert(typeof c.coords.x === 'number', rarity + ' clue ' + (idx+1) + ': coords.x is number');
      assert(typeof c.coords.z === 'number', rarity + ' clue ' + (idx+1) + ': coords.z is number');
      assert(c.solved === false,       rarity + ' clue ' + (idx+1) + ': initially not solved');
    });

    // Rewards
    var rw = map.rewards;
    assertExists(rw,           rarity + ': rewards object exists');
    assert(rw.spark > 0,       rarity + ': spark reward > 0');
    assertGTE(rw.spark, meta.sparkMin, rarity + ': spark >= sparkMin');
    assertLTE(rw.spark, meta.sparkMax, rarity + ': spark <= sparkMax');
    assertArray(rw.items,      rarity + ': rewards.items is array');
    assert(rw.items.length >= 1, rarity + ': at least 1 item in reward');
    rw.items.forEach(function(it) {
      assertExists(it.id,  rarity + ': reward item has id');
      assert(it.qty >= 1,  rarity + ': reward item qty >= 1');
    });

    // Final coords in range
    assert(map.finalCoords.x >= -600 && map.finalCoords.x <= 600, rarity + ': finalCoords.x in range');
    assert(map.finalCoords.z >= -600 && map.finalCoords.z <= 600, rarity + ': finalCoords.z in range');
  });

  // Determinism: same mapId => same map
  var m1 = TM.generateMap('det_test', 'rare');
  var m2 = TM.generateMap('det_test', 'rare');
  assert(JSON.stringify(m1) === JSON.stringify(m2), 'generateMap is deterministic with same ID');

  // Different mapId => (likely) different map
  var m3 = TM.generateMap('det_test_A', 'rare');
  var m4 = TM.generateMap('det_test_B', 'rare');
  assert(JSON.stringify(m3) !== JSON.stringify(m4), 'Different IDs produce different maps');

  // Error on missing mapId
  var threw = false;
  try { TM.generateMap(null, 'common'); } catch(e) { threw = true; }
  assert(threw, 'generateMap throws on null mapId');

  // Error on invalid rarity
  var threw2 = false;
  try { TM.generateMap('x', 'godlike'); } catch(e) { threw2 = true; }
  assert(threw2, 'generateMap throws on invalid rarity');

  // Expiry: common map has no expiry
  var cm = TM.generateMap('common_noexpiry', 'common');
  assert(cm.expiresAt === null, 'common map has null expiresAt');

  // Expiry: legendary map has expiry
  var lm = TM.generateMap('leg_expiry', 'legendary');
  assert(lm.expiresAt !== null && lm.expiresAt > Date.now(), 'legendary map has future expiresAt');

  // Custom expiresAt
  var futureTs = Date.now() + 999999;
  var cm2 = TM.generateMap('custom_exp', 'common', { expiresAt: futureTs });
  assertEqual(cm2.expiresAt, futureTs, 'custom expiresAt is stored');

  // Shared-with
  var sm = TM.generateMap('shared_gen', 'rare', { sharedWith: ['p1', 'p2'] });
  assertArray(sm.sharedWith, 'sharedWith is array');
  assertIn(sm.sharedWith, 'p1', 'sharedWith contains p1');
  assertIn(sm.sharedWith, 'p2', 'sharedWith contains p2');
});

// ============================================================================
// SUITE 7: Map Expiry
// ============================================================================

suite('Map Expiry', function() {

  var notExpired = TM.generateMap('not_expired', 'common', { expiresAt: null });
  assert(!TM.isMapExpired(notExpired), 'Map with null expiresAt is not expired');

  var futureMap = TM.generateMap('future_map', 'epic', { expiresAt: Date.now() + 3600000 });
  assert(!TM.isMapExpired(futureMap), 'Map expiring in future is not expired');

  var pastMap = TM.generateMap('past_map', 'epic', { expiresAt: Date.now() - 1000 });
  assert(TM.isMapExpired(pastMap), 'Map with past expiresAt is expired');

  // timeRemaining
  assert(TM.timeRemaining(notExpired) === null, 'timeRemaining returns null for no-expiry map');

  var rem = TM.timeRemaining(futureMap);
  assert(rem > 0, 'timeRemaining returns positive value for future map');
  assert(rem <= 3600000, 'timeRemaining not larger than set window');

  var expRem = TM.timeRemaining(pastMap);
  assertEqual(expRem, 0, 'timeRemaining returns 0 for expired map');
});

// ============================================================================
// SUITE 8: ensurePlayerState
// ============================================================================

suite('ensurePlayerState', function() {

  var state = freshState();
  var pid   = uid();
  var ps    = TM.ensurePlayerState(state, pid);

  assertObject(ps, 'ensurePlayerState returns object');
  assertObject(ps.activeMaps,    'activeMaps is object');
  assertArray(ps.completedMaps,  'completedMaps is array');
  assertObject(ps.fragments,     'fragments is object');
  assertArray(ps.ownedMaps,      'ownedMaps is array');

  // Idempotent
  var ps2 = TM.ensurePlayerState(state, pid);
  assert(ps === ps2, 'ensurePlayerState returns same object on second call');

  // State container
  assert(state.treasureMaps !== undefined, 'state.treasureMaps initialised');
  assert(state.treasureMaps[pid] !== undefined, 'player entry created in state');
});

// ============================================================================
// SUITE 9: giveMap and getOwnedMaps
// ============================================================================

suite('giveMap and getOwnedMaps', function() {

  var state = freshState();
  var pid   = uid();
  var mapId = mid();

  var res = TM.giveMap(mapId, pid, state);
  assert(res.success, 'giveMap succeeds');

  var owned = TM.getOwnedMaps(pid, state);
  assertIn(owned, mapId, 'mapId appears in ownedMaps after giveMap');

  // Duplicate give
  var res2 = TM.giveMap(mapId, pid, state);
  assert(!res2.success, 'giveMap fails on duplicate');

  // Multiple maps
  var mapId2 = mid();
  TM.giveMap(mapId2, pid, state);
  var owned2 = TM.getOwnedMaps(pid, state);
  assertEqual(owned2.length, 2, 'Two maps in ownedMaps');

  // Fresh player has no maps
  var pid2 = uid();
  var owned3 = TM.getOwnedMaps(pid2, state);
  assertEqual(owned3.length, 0, 'Fresh player has empty ownedMaps');
});

// ============================================================================
// SUITE 10: Map Activation
// ============================================================================

suite('Map Activation', function() {

  var map   = TM.generateMap(mid(), 'common');
  var pid   = uid();
  var state = freshState();
  TM.giveMap(map.id, pid, state);

  // Activate
  var res = TM.activateMap(map, pid, state);
  assert(res.success, 'activateMap succeeds');
  assertExists(res.message, 'activateMap returns message');
  assert(res.message.indexOf(map.clues[0].text) !== -1, 'message contains first clue text');

  // Duplicate activation
  var res2 = TM.activateMap(map, pid, state);
  assert(!res2.success, 'activateMap fails if already active');

  // getActiveMaps
  var active = TM.getActiveMaps(pid, state);
  assertEqual(active.length, 1, 'One active map');
  assertEqual(active[0].mapId, map.id, 'Active map has correct id');
  assertEqual(active[0].progress.clueProgress, 0, 'clueProgress starts at 0');

  // Activate expired map
  var expMap = TM.generateMap(mid(), 'epic', { expiresAt: Date.now() - 1000 });
  var pid2   = uid();
  TM.giveMap(expMap.id, pid2, state);
  var res3   = TM.activateMap(expMap, pid2, state);
  assert(!res3.success, 'Cannot activate expired map');

  // Shared map: non-participant cannot activate
  var shMap = TM.generateMap(mid(), 'rare', { sharedWith: ['participantA', 'participantB'] });
  var outsider = uid();
  TM.giveMap(shMap.id, outsider, state);
  var res4 = TM.activateMap(shMap, outsider, state);
  assert(!res4.success, 'Outsider cannot activate shared map');
});

// ============================================================================
// SUITE 11: Map Deactivation (Abandon)
// ============================================================================

suite('Map Deactivation', function() {

  var s = activeMapScenario('common');

  var res = TM.deactivateMap(s.map.id, s.pid, s.state);
  assert(res.success, 'deactivateMap succeeds for active map');

  var active = TM.getActiveMaps(s.pid, s.state);
  assertEqual(active.length, 0, 'No active maps after deactivation');

  // Deactivate non-active map
  var res2 = TM.deactivateMap(s.map.id, s.pid, s.state);
  assert(!res2.success, 'deactivateMap fails for non-active map');
});

// ============================================================================
// SUITE 12: Clue Solving
// ============================================================================

suite('Clue Solving', function() {

  var s   = activeMapScenario('common');
  var map = s.map;
  var pid = s.pid;
  var state = s.state;

  // Solve first clue at correct position and zone
  var clue1 = map.clues[0];
  var res1  = TM.solveClue(map, pid, 1, clue1.coords, clue1.zoneId, state);
  assert(res1.success, 'First clue solved successfully');
  assert(!res1.complete || map.clues.length === 1, 'Not complete unless single-clue map');

  // Wrong order: trying step 3 when on step 2
  if (map.clues.length >= 3) {
    var clue3 = map.clues[2];
    var res2  = TM.solveClue(map, pid, 3, clue3.coords, clue3.zoneId, state);
    assert(!res2.success, 'Cannot skip clues (must solve in order)');
  }

  // Too far away from clue coords
  var s2   = activeMapScenario('uncommon');
  var clue = s2.map.clues[0];
  var farPos = { x: clue.coords.x + 500, z: clue.coords.z + 500 };
  var res3 = TM.solveClue(s2.map, s2.pid, 1, farPos, clue.zoneId, s2.state);
  assert(!res3.success, 'Clue fails when too far from target');
  assert(res3.message.indexOf('not close enough') !== -1, 'Error message mentions distance');

  // Wrong zone
  var s3 = activeMapScenario('uncommon');
  var clue0 = s3.map.clues[0];
  var wrongZone = 'nexus';
  if (clue0.zoneId === 'nexus') { wrongZone = 'arena'; }
  var res4 = TM.solveClue(s3.map, s3.pid, 1, clue0.coords, wrongZone, s3.state);
  assert(!res4.success, 'Clue fails in wrong zone');

  // Inactive map
  var s4   = freshState();
  var pid4 = uid();
  var map4 = TM.generateMap(mid(), 'common');
  s4.mapDefinitions = {}; s4.mapDefinitions[map4.id] = map4;
  var res5 = TM.solveClue(map4, pid4, 1, map4.clues[0].coords, map4.clues[0].zoneId, s4);
  assert(!res5.success, 'Clue solving fails on inactive map');

  // Invalid clue step
  var s5   = activeMapScenario('common');
  var res6 = TM.solveClue(s5.map, s5.pid, 0, { x: 0, z: 0 }, 'nexus', s5.state);
  assert(!res6.success, 'Invalid clue step 0 fails');

  // Expired map
  var expMap = TM.generateMap(mid(), 'epic', { expiresAt: Date.now() - 1 });
  var expState = stateWithMap(expMap);
  var expPid = uid();
  TM.giveMap(expMap.id, expPid, expState);
  var expActive = TM.activateMap(expMap, expPid, expState);
  // Force-activate by directly manipulating state since activate blocks expired
  TM.ensurePlayerState(expState, expPid).activeMaps[expMap.id] = { clueProgress: 0, startedAt: Date.now() };
  var res7 = TM.solveClue(expMap, expPid, 1, expMap.clues[0].coords, expMap.clues[0].zoneId, expState);
  assert(!res7.success, 'Cannot solve clue on expired map');

  // Complete all clues on a fresh scenario
  var sc = activeMapScenario('common');
  var finalResult;
  for (var i = 0; i < sc.map.clues.length; i++) {
    var c = sc.map.clues[i];
    finalResult = TM.solveClue(sc.map, sc.pid, c.step, c.coords, c.zoneId, sc.state);
  }
  assert(finalResult.success, 'Last clue solution succeeds');
  assert(finalResult.complete, 'complete flag set after last clue');
  assert(finalResult.nextClue === null, 'nextClue is null after completion');

  // nextClue is provided for intermediate steps
  var sc2 = activeMapScenario('rare'); // rare has 4-5 clues
  if (sc2.map.clues.length >= 2) {
    var c0 = sc2.map.clues[0];
    var midRes = TM.solveClue(sc2.map, sc2.pid, 1, c0.coords, c0.zoneId, sc2.state);
    assert(midRes.success, 'Intermediate clue solved');
    if (!midRes.complete) {
      assertExists(midRes.nextClue, 'nextClue provided for intermediate step');
    }
  }
});

// ============================================================================
// SUITE 13: getCurrentClue
// ============================================================================

suite('getCurrentClue', function() {

  var s   = activeMapScenario('common');
  var map = s.map;
  var pid = s.pid;
  var state = s.state;

  var cur = TM.getCurrentClue(map, pid, state);
  assertExists(cur, 'getCurrentClue returns clue for active map');
  assertEqual(cur.step, 1, 'First current clue is step 1');

  // After solving first clue, current clue advances
  if (map.clues.length >= 2) {
    var c1 = map.clues[0];
    TM.solveClue(map, pid, 1, c1.coords, c1.zoneId, state);
    var cur2 = TM.getCurrentClue(map, pid, state);
    assertEqual(cur2.step, 2, 'getCurrentClue advances after solving clue 1');
  }

  // Inactive map returns null
  var pid2 = uid();
  assert(TM.getCurrentClue(map, pid2, state) === null, 'getCurrentClue returns null for inactive map');
});

// ============================================================================
// SUITE 14: Cache Claiming
// ============================================================================

suite('Cache Claiming', function() {

  // Full run: solve all clues then claim
  var s     = activeMapScenario('common');
  var map   = s.map;
  var pid   = s.pid;
  var state = s.state;
  solveAllClues(s);

  var res = TM.claimCache(map, pid, map.finalCoords, state, []);
  assert(res.success,             'Cache claimed successfully after solving all clues');
  assertExists(res.rewards,       'Claim result has rewards');
  assert(res.rewards.spark > 0,   'Claimed spark > 0');
  assertArray(res.rewards.items,  'Claimed rewards has items array');

  // Map no longer active after claim
  var active = TM.getActiveMaps(pid, state);
  assertEqual(active.length, 0, 'Map removed from active after claim');

  // Map removed from ownedMaps
  var owned = TM.getOwnedMaps(pid, state);
  assertNotIn(owned, map.id, 'Map removed from ownedMaps after claim');

  // Completion recorded
  var history = TM.getMapHistory(pid, state);
  assertEqual(history.length, 1, 'One entry in map history');
  assertEqual(history[0].mapId, map.id, 'History entry has correct mapId');
  assertEqual(history[0].rarity, 'common', 'History entry has correct rarity');
  assertExists(history[0].completedAt, 'History entry has completedAt');

  // Cannot claim if not solved all clues
  var s2    = activeMapScenario('common');
  var res2  = TM.claimCache(s2.map, s2.pid, s2.map.finalCoords, s2.state, []);
  assert(!res2.success, 'Cannot claim cache before solving all clues');

  // Cannot claim if too far from final coords
  var s3 = activeMapScenario('common');
  solveAllClues(s3);
  var farPos = { x: s3.map.finalCoords.x + 500, z: s3.map.finalCoords.z + 500 };
  var res3   = TM.claimCache(s3.map, s3.pid, farPos, s3.state, []);
  assert(!res3.success, 'Cannot claim cache when too far away');

  // Cannot claim inactive map
  var s4    = freshState();
  var pid4  = uid();
  var map4  = TM.generateMap(mid(), 'common');
  var res4  = TM.claimCache(map4, pid4, map4.finalCoords, s4, []);
  assert(!res4.success, 'Cannot claim inactive map');

  // Cannot claim expired map
  var expMap = TM.generateMap(mid(), 'epic', { expiresAt: Date.now() - 1 });
  var expState = stateWithMap(expMap);
  var expPid   = uid();
  TM.ensurePlayerState(expState, expPid).activeMaps[expMap.id] = {
    clueProgress: expMap.clues.length, startedAt: Date.now()
  };
  var res5 = TM.claimCache(expMap, expPid, expMap.finalCoords, expState, []);
  assert(!res5.success, 'Cannot claim expired map');
});

// ============================================================================
// SUITE 15: Co-op Bonus
// ============================================================================

suite('Co-op Bonus', function() {

  // Verify COOP_BONUS table
  assertEqual(TM.COOP_BONUS[1], 1.0, 'Solo bonus is 1.0');
  assert(TM.COOP_BONUS[2] > 1.0, 'Two-player bonus > 1');
  assert(TM.COOP_BONUS[5] > TM.COOP_BONUS[2], 'Five-player bonus > two-player bonus');

  // Solo vs co-op reward comparison
  function runScenario(coopPlayers) {
    var s = activeMapScenario('rare');
    solveAllClues(s);
    return TM.claimCache(s.map, s.pid, s.map.finalCoords, s.state, coopPlayers);
  }

  var soloResult = runScenario([]);
  var coopResult = runScenario([uid(), uid()]);

  // Co-op spark should be higher (same map seed, different multiplier)
  // Use a specific seeded scenario for determinism
  function seededCoopRun(coopPlayers, extraOpts) {
    var pid   = 'co_test_pid';
    var mapId = 'co_test_map_seeded';
    var map   = TM.generateMap(mapId, 'rare', extraOpts || {});
    var state = stateWithMap(map);
    TM.giveMap(mapId, pid, state);
    TM.activateMap(map, pid, state);
    solveAllClues({ map: map, pid: pid, state: state });
    return TM.claimCache(map, pid, map.finalCoords, state, coopPlayers);
  }

  var r1 = seededCoopRun([]);
  var r2 = seededCoopRun([uid()]);
  assert(r2.rewards.spark > r1.rewards.spark, 'Two-player co-op yields more Spark than solo');

  var r3 = seededCoopRun([uid(), uid(), uid(), uid()]);
  assert(r3.rewards.spark > r2.rewards.spark, 'Five-player co-op yields more Spark than two-player');

  // Co-op record includes participants
  var s5   = activeMapScenario('common');
  var coop = [uid(), uid()];
  solveAllClues(s5);
  var r5 = TM.claimCache(s5.map, s5.pid, s5.map.finalCoords, s5.state, coop);
  assert(r5.success, 'Co-op claim succeeds');
  assert(r5.record.participants.length === 3, 'Participant list includes primary + 2 co-op');
  assert(r5.record.coopBonus === TM.COOP_BONUS[3], 'Co-op bonus is correct for 3 participants');
});

// ============================================================================
// SUITE 16: Map Trading
// ============================================================================

suite('Map Trading', function() {

  var state = freshState();
  var pA    = uid();
  var pB    = uid();
  var mapId = mid();
  var map   = TM.generateMap(mapId, 'uncommon');
  state.mapDefinitions = {};
  state.mapDefinitions[mapId] = map;
  TM.giveMap(mapId, pA, state);

  // Successful trade
  var res = TM.tradeMap(mapId, pA, pB, state);
  assert(res.success, 'tradeMap succeeds');

  var ownedA = TM.getOwnedMaps(pA, state);
  var ownedB = TM.getOwnedMaps(pB, state);
  assertNotIn(ownedA, mapId, 'Sender no longer owns map after trade');
  assertIn(ownedB, mapId, 'Receiver owns map after trade');

  // Trade map you don't own
  var res2 = TM.tradeMap(mapId, pA, pB, state);
  assert(!res2.success, 'Cannot trade map you do not own');

  // Trade active map
  var mapId2 = mid();
  var map2   = TM.generateMap(mapId2, 'common');
  state.mapDefinitions[mapId2] = map2;
  TM.giveMap(mapId2, pB, state);
  TM.activateMap(map2, pB, state);

  var res3 = TM.tradeMap(mapId2, pB, pA, state);
  assert(!res3.success, 'Cannot trade an active map');

  // Trade to same player (edge: state allows it since different from ownedMaps perspective)
  var mapId3 = mid();
  var map3   = TM.generateMap(mapId3, 'common');
  state.mapDefinitions[mapId3] = map3;
  TM.giveMap(mapId3, pA, state);
  // Let's just verify tradeMap to a new player works
  var pC   = uid();
  var res4 = TM.tradeMap(mapId3, pA, pC, state);
  assert(res4.success, 'Trade to new player succeeds');
});

// ============================================================================
// SUITE 17: Fragment Award
// ============================================================================

suite('Fragment Award', function() {

  var state = freshState();
  var pid   = uid();

  // Award common fragment
  var res = TM.awardFragment('map_fragment_common', 2, pid, state);
  assert(res.success, 'awardFragment succeeds for valid fragment type');
  assertEqual(res.total, 2, 'Total fragment count is 2 after awarding 2');

  // Award more of same type
  TM.awardFragment('map_fragment_common', 3, pid, state);
  var frags = TM.getFragments(pid, state);
  assertEqual(frags['map_fragment_common'], 5, 'Fragment total accumulates correctly');

  // Award different type
  TM.awardFragment('map_fragment_legendary', 1, pid, state);
  var frags2 = TM.getFragments(pid, state);
  assertEqual(frags2['map_fragment_legendary'], 1, 'Different fragment type tracked separately');

  // Unknown fragment type
  var res2 = TM.awardFragment('map_fragment_unknown', 1, pid, state);
  assert(!res2.success, 'awardFragment fails for unknown type');

  // Invalid quantity
  var res3 = TM.awardFragment('map_fragment_common', 0, pid, state);
  assert(!res3.success, 'awardFragment fails for qty=0');

  // All fragment types
  TM.FRAGMENT_TYPES.forEach(function(ft) {
    var state2 = freshState();
    var pid2   = uid();
    var r = TM.awardFragment(ft.id, 1, pid2, state2);
    assert(r.success, 'awardFragment succeeds for type: ' + ft.id);
    assertIn(TM.RARITY_TIERS, ft.targetRarity, ft.id + ' targets a valid rarity');
  });
});

// ============================================================================
// SUITE 18: getFragmentType
// ============================================================================

suite('getFragmentType', function() {

  TM.FRAGMENT_TYPES.forEach(function(ft) {
    var result = TM.getFragmentType(ft.id);
    assertExists(result, 'getFragmentType finds: ' + ft.id);
    assertEqual(result.id, ft.id, 'Returned fragment has correct id: ' + ft.id);
  });

  assert(TM.getFragmentType('nonexistent') === null, 'getFragmentType returns null for unknown id');
});

// ============================================================================
// SUITE 19: Map Crafting from Fragments
// ============================================================================

suite('Map Crafting from Fragments', function() {

  // Successful craft for each rarity
  TM.RARITY_TIERS.forEach(function(rarity) {
    var fragId  = 'map_fragment_' + rarity;
    var needed  = TM.RARITY_META[rarity].fragmentsNeeded;
    var state   = freshState();
    var pid     = uid();

    TM.awardFragment(fragId, needed, pid, state);
    var res = TM.craftMapFromFragments(fragId, pid, state);
    assert(res.success, 'Crafting ' + rarity + ' map succeeds with enough fragments');
    assertExists(res.map,       rarity + ': crafted map is returned');
    assertExists(res.mapId,     rarity + ': crafted mapId is returned');
    assertEqual(res.map.rarity, rarity, rarity + ': crafted map has correct rarity');

    // Fragments consumed
    var frags = TM.getFragments(pid, state);
    assertEqual(frags[fragId] || 0, 0, rarity + ': fragments consumed after crafting');

    // Map stored in state
    assertExists(state.mapDefinitions, rarity + ': mapDefinitions initialised');
    assertExists(state.mapDefinitions[res.mapId], rarity + ': map stored in state');

    // Map in ownedMaps
    var owned = TM.getOwnedMaps(pid, state);
    assertIn(owned, res.mapId, rarity + ': crafted map in ownedMaps');
  });

  // Insufficient fragments
  var state2 = freshState();
  var pid2   = uid();
  TM.awardFragment('map_fragment_rare', 1, pid2, state2); // need 4
  var res2   = TM.craftMapFromFragments('map_fragment_rare', pid2, state2);
  assert(!res2.success, 'Crafting fails with insufficient fragments');
  assert(res2.message.indexOf('Need') !== -1, 'Error message mentions needed count');

  // Unknown fragment type
  var state3 = freshState();
  var pid3   = uid();
  var res3   = TM.craftMapFromFragments('map_fragment_fake', pid3, state3);
  assert(!res3.success, 'Crafting fails with unknown fragment type');
});

// ============================================================================
// SUITE 20: Shared Map Creation and Activation
// ============================================================================

suite('Shared Maps', function() {

  var state = freshState();
  var pA    = uid();
  var pB    = uid();
  var pC    = uid();
  var mapId = mid();

  // Create shared map
  var res = TM.createSharedMap(mapId, 'rare', [pA, pB, pC], state);
  assert(res.success, 'createSharedMap succeeds with 3 participants');
  assertExists(res.map, 'createSharedMap returns map definition');
  assertIn(res.map.sharedWith, pA, 'pA in sharedWith');
  assertIn(res.map.sharedWith, pB, 'pB in sharedWith');
  assertIn(res.map.sharedWith, pC, 'pC in sharedWith');

  // Map given to all
  assertIn(TM.getOwnedMaps(pA, state), mapId, 'pA owns shared map');
  assertIn(TM.getOwnedMaps(pB, state), mapId, 'pB owns shared map');
  assertIn(TM.getOwnedMaps(pC, state), mapId, 'pC owns shared map');

  // Activate shared map for all
  var actRes = TM.activateSharedMap(mapId, state);
  assert(actRes.success, 'activateSharedMap succeeds');
  assertArray(actRes.results, 'activateSharedMap returns results array');
  assertEqual(actRes.results.length, 3, 'Three activation results');

  // Each participant is active
  [pA, pB, pC].forEach(function(pid) {
    var active = TM.getActiveMaps(pid, state);
    assertEqual(active.length, 1, pid + ' has one active map');
  });

  // Too few participants
  var res2 = TM.createSharedMap(mid(), 'common', ['solo'], state);
  assert(!res2.success, 'createSharedMap fails with only 1 participant');

  // Too many participants
  var res3 = TM.createSharedMap(mid(), 'common', ['a','b','c','d','e','f'], state);
  assert(!res3.success, 'createSharedMap fails with >5 participants');

  // activateSharedMap with missing map definition
  var res4 = TM.activateSharedMap('nonexistent_map', state);
  assert(!res4.success, 'activateSharedMap fails for non-existent map');

  // activateSharedMap with non-shared map
  var soloMapId = mid();
  var soloMap   = TM.generateMap(soloMapId, 'common');
  state.mapDefinitions[soloMapId] = soloMap;
  var res5 = TM.activateSharedMap(soloMapId, state);
  assert(!res5.success, 'activateSharedMap fails for non-shared map');
});

// ============================================================================
// SUITE 21: Map History and Completion Tracking
// ============================================================================

suite('Map History', function() {

  var state = freshState();
  var pid   = uid();

  // Fresh history
  var hist0 = TM.getMapHistory(pid, state);
  assertEqual(hist0.length, 0, 'Fresh player has empty history');

  // Complete first map
  var s1 = { map: TM.generateMap(mid(), 'common'), pid: pid, state: state };
  state.mapDefinitions = state.mapDefinitions || {};
  state.mapDefinitions[s1.map.id] = s1.map;
  TM.giveMap(s1.map.id, pid, state);
  TM.activateMap(s1.map, pid, state);
  solveAllClues(s1);
  TM.claimCache(s1.map, pid, s1.map.finalCoords, state, []);

  var hist1 = TM.getMapHistory(pid, state);
  assertEqual(hist1.length, 1, 'One history entry after first completion');

  // hasCompleted
  assert(TM.hasCompleted(s1.map.id, pid, state), 'hasCompleted returns true for completed map');

  // Complete second map
  var s2 = { map: TM.generateMap(mid(), 'rare'), pid: pid, state: state };
  state.mapDefinitions[s2.map.id] = s2.map;
  TM.giveMap(s2.map.id, pid, state);
  TM.activateMap(s2.map, pid, state);
  solveAllClues(s2);
  TM.claimCache(s2.map, pid, s2.map.finalCoords, state, []);

  var hist2 = TM.getMapHistory(pid, state);
  assertEqual(hist2.length, 2, 'Two history entries');

  // hasCompleted for uncompleted map
  assert(!TM.hasCompleted('never_completed', pid, state), 'hasCompleted false for uncompleted map');

  // countCompletedByRarity
  var counts = TM.countCompletedByRarity(pid, state);
  assertEqual(counts.common,    1, '1 common map completed');
  assertEqual(counts.rare,      1, '1 rare map completed');
  assertEqual(counts.uncommon,  0, '0 uncommon maps completed');
  assertEqual(counts.epic,      0, '0 epic maps completed');
  assertEqual(counts.legendary, 0, '0 legendary maps completed');

  // totalSparkEarned
  var totalSpark = TM.totalSparkEarned(pid, state);
  assert(totalSpark > 0, 'totalSparkEarned > 0 after completions');
  assertEqual(totalSpark,
    hist2.reduce(function(sum, r) { return sum + r.rewards.spark; }, 0),
    'totalSparkEarned matches sum of reward sparks');

  // History does not modify original state (returns copy)
  var hist3 = TM.getMapHistory(pid, state);
  hist3.push({ fake: true });
  var hist4 = TM.getMapHistory(pid, state);
  assertEqual(hist4.length, 2, 'History copy does not modify internal state');
});

// ============================================================================
// SUITE 22: Inventory Item Representation
// ============================================================================

suite('toInventoryItem', function() {

  TM.RARITY_TIERS.forEach(function(rarity) {
    var map  = TM.generateMap(mid(), rarity);
    var item = TM.toInventoryItem(map);

    assertExists(item,                 rarity + ': inventory item exists');
    assertEqual(item.id, map.id,       rarity + ': item id matches map id');
    assertEqual(item.type, 'treasure_map', rarity + ': item type is treasure_map');
    assertExists(item.name,            rarity + ': item has name');
    assertEqual(item.rarity, rarity,   rarity + ': item rarity matches');
    assertExists(item.color,           rarity + ': item has color');
    assert(item.tradeable === true,    rarity + ': item is tradeable');
    assertExists(item.payload,         rarity + ': item has payload');
    assertEqual(item.payload.mapId, map.id, rarity + ': payload.mapId matches');
  });

  // Expiring map shows expiresAt
  var expMap = TM.generateMap(mid(), 'epic');
  var expItem = TM.toInventoryItem(expMap);
  assertExists(expItem.expiresAt, 'Epic map item has expiresAt');
});

// ============================================================================
// SUITE 23: Reward Cache Details
// ============================================================================

suite('Reward Cache Details', function() {

  // Each rarity reward pool is a non-empty array
  TM.RARITY_TIERS.forEach(function(rarity) {
    assertArray(TM.REWARD_ITEMS[rarity], rarity + ': REWARD_ITEMS has array');
    assert(TM.REWARD_ITEMS[rarity].length > 0, rarity + ': REWARD_ITEMS non-empty');
    assertArray(TM.REWARD_LORE[rarity], rarity + ': REWARD_LORE has array');
    assertArray(TM.REWARD_COSMETICS[rarity], rarity + ': REWARD_COSMETICS has array');
  });

  // buildRewardCache returns correct structure
  var rng = TM.createRng(42);
  TM.RARITY_TIERS.forEach(function(rarity) {
    var cache = TM.buildRewardCache(rarity, TM.createRng(TM.seedFromId(rarity)));
    assert(cache.spark > 0, rarity + ': spark > 0 from buildRewardCache');
    assertArray(cache.items, rarity + ': items is array from buildRewardCache');
    assert(cache.items.length >= 1, rarity + ': at least 1 item from buildRewardCache');
    cache.items.forEach(function(it) {
      assertExists(it.id,  rarity + ': item id present');
      assert(it.qty >= 1, rarity + ': item qty >= 1');
    });
  });

  // Legendary maps always have a lore entry
  var legRng = TM.createRng(12345);
  var legCache = TM.buildRewardCache('legendary', legRng);
  assertExists(legCache.lore, 'legendary cache always has lore entry');

  // Legendary maps always have a cosmetic
  var legRng2 = TM.createRng(99999);
  var legCache2 = TM.buildRewardCache('legendary', legRng2);
  assertExists(legCache2.cosmetic, 'legendary cache always has cosmetic');

  // Common maps have no lore or cosmetic
  var comRng = TM.createRng(11);
  var comCache = TM.buildRewardCache('common', comRng);
  assert(comCache.lore === null, 'common cache has no lore');
  assert(comCache.cosmetic === null, 'common cache has no cosmetic');
});

// ============================================================================
// SUITE 24: Protocol Message Handler
// ============================================================================

suite('handleMessage', function() {

  // Unknown type
  var res0 = TM.handleMessage({ type: 'unknown_type', from: uid(), payload: {} }, freshState());
  assert(!res0.success, 'handleMessage fails for unknown type');

  // Null/missing message
  var res1 = TM.handleMessage(null, freshState());
  assert(!res1.success, 'handleMessage fails for null message');

  var res2 = TM.handleMessage({}, freshState());
  assert(!res2.success, 'handleMessage fails for message without type');

  // treasure_map_activate
  (function() {
    var state  = freshState();
    var pid    = uid();
    var mapId  = mid();
    var map    = TM.generateMap(mapId, 'common');
    state.mapDefinitions = {};
    state.mapDefinitions[mapId] = map;
    TM.giveMap(mapId, pid, state);

    var res = TM.handleMessage({ type: 'treasure_map_activate', from: pid, payload: { mapId: mapId } }, state);
    assert(res.success, 'handleMessage: treasure_map_activate succeeds');

    // Missing map
    var res2 = TM.handleMessage({ type: 'treasure_map_activate', from: pid, payload: { mapId: 'no_such_map' } }, state);
    assert(!res2.success, 'handleMessage: treasure_map_activate fails for unknown mapId');
  })();

  // treasure_map_solve_clue
  (function() {
    var s   = activeMapScenario('common');
    var clue = s.map.clues[0];
    var res = TM.handleMessage({
      type:    'treasure_map_solve_clue',
      from:    s.pid,
      payload: { mapId: s.map.id, clueStep: 1, position: clue.coords, zone: clue.zoneId }
    }, s.state);
    assert(res.success, 'handleMessage: treasure_map_solve_clue succeeds at correct position');

    // Missing map
    var res2 = TM.handleMessage({
      type:    'treasure_map_solve_clue',
      from:    s.pid,
      payload: { mapId: 'ghost_map', clueStep: 1, position: { x: 0, z: 0 } }
    }, s.state);
    assert(!res2.success, 'handleMessage: treasure_map_solve_clue fails for unknown map');
  })();

  // treasure_map_claim
  (function() {
    var s = activeMapScenario('common');
    solveAllClues(s);
    var res = TM.handleMessage({
      type:    'treasure_map_claim',
      from:    s.pid,
      payload: { mapId: s.map.id, position: s.map.finalCoords, coopPlayers: [] }
    }, s.state);
    assert(res.success, 'handleMessage: treasure_map_claim succeeds after solving all clues');

    // Missing map
    var res2 = TM.handleMessage({
      type:    'treasure_map_claim',
      from:    s.pid,
      payload: { mapId: 'ghost_map', position: { x: 0, z: 0 } }
    }, s.state);
    assert(!res2.success, 'handleMessage: treasure_map_claim fails for unknown map');
  })();

  // treasure_map_trade
  (function() {
    var state  = freshState();
    var pA     = uid();
    var pB     = uid();
    var mapId  = mid();
    var map    = TM.generateMap(mapId, 'uncommon');
    state.mapDefinitions = {};
    state.mapDefinitions[mapId] = map;
    TM.giveMap(mapId, pA, state);

    var res = TM.handleMessage({
      type:    'treasure_map_trade',
      from:    pA,
      payload: { mapId: mapId, toPlayerId: pB }
    }, state);
    assert(res.success, 'handleMessage: treasure_map_trade succeeds');
  })();

  // treasure_map_craft
  (function() {
    var state = freshState();
    var pid   = uid();
    TM.awardFragment('map_fragment_common', 2, pid, state); // needs 2 for common
    var res = TM.handleMessage({
      type:    'treasure_map_craft',
      from:    pid,
      payload: { fragmentTypeId: 'map_fragment_common' }
    }, state);
    assert(res.success, 'handleMessage: treasure_map_craft succeeds with enough fragments');
  })();

  // treasure_map_award_fragment
  (function() {
    var state = freshState();
    var pid   = uid();
    var res = TM.handleMessage({
      type:    'treasure_map_award_fragment',
      from:    pid,
      payload: { fragmentTypeId: 'map_fragment_rare', qty: 3 }
    }, state);
    assert(res.success, 'handleMessage: treasure_map_award_fragment succeeds');
    var frags = TM.getFragments(pid, state);
    assertEqual(frags['map_fragment_rare'], 3, 'Fragments awarded via handleMessage');
  })();

  // treasure_map_abandon
  (function() {
    var s   = activeMapScenario('common');
    var res = TM.handleMessage({
      type:    'treasure_map_abandon',
      from:    s.pid,
      payload: { mapId: s.map.id }
    }, s.state);
    assert(res.success, 'handleMessage: treasure_map_abandon succeeds');
    assertEqual(TM.getActiveMaps(s.pid, s.state).length, 0, 'Map abandoned via handleMessage');
  })();
});

// ============================================================================
// SUITE 25: Clue Template Coverage
// ============================================================================

suite('Clue Template Coverage', function() {

  assert(TM.CLUE_TEMPLATES.length >= 10, 'At least 10 clue templates defined');

  // All templates are non-empty strings
  TM.CLUE_TEMPLATES.forEach(function(t, i) {
    assert(typeof t === 'string' && t.length > 0, 'Template ' + i + ' is non-empty string');
  });

  // Generated clue text is interpolated (no raw {placeholders} remaining)
  var map = TM.generateMap('template_test', 'legendary');
  map.clues.forEach(function(c) {
    assert(c.text.indexOf('{landmark}') === -1,  'Clue text: {landmark} interpolated');
    assert(c.text.indexOf('{zone}') === -1,      'Clue text: {zone} interpolated');
    assert(c.text.indexOf('{direction}') === -1, 'Clue text: {direction} interpolated');
    assert(c.text.indexOf('{element}') === -1,   'Clue text: {element} interpolated');
    assert(c.text.indexOf('{creature}') === -1,  'Clue text: {creature} interpolated');
    assert(c.text.indexOf('{color}') === -1,     'Clue text: {color} interpolated');
    assert(c.text.indexOf('{number}') === -1,    'Clue text: {number} interpolated');
    assert(c.text.length > 10,                   'Clue text has meaningful content');
  });
});

// ============================================================================
// SUITE 26: Fragment Types Data Integrity
// ============================================================================

suite('Fragment Types', function() {

  assertEqual(TM.FRAGMENT_TYPES.length, 5, 'Five fragment types (one per rarity)');

  var expectedRarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  TM.FRAGMENT_TYPES.forEach(function(ft, i) {
    assertExists(ft.id,            'Fragment ' + i + ' has id');
    assertExists(ft.name,          'Fragment ' + i + ' has name');
    assertIn(TM.RARITY_TIERS, ft.targetRarity, 'Fragment ' + i + ' targets valid rarity');
    assertEqual(ft.targetRarity, expectedRarities[i], 'Fragment ' + i + ' has expected rarity ' + expectedRarities[i]);
  });

  // IDs follow expected pattern
  TM.RARITY_TIERS.forEach(function(r) {
    var found = TM.FRAGMENT_TYPES.filter(function(ft) { return ft.targetRarity === r; });
    assertEqual(found.length, 1, 'Exactly one fragment type for rarity: ' + r);
  });
});

// ============================================================================
// SUITE 27: Edge Cases
// ============================================================================

suite('Edge Cases', function() {

  // generateMap with opts.createdAt
  var now = Date.now();
  var m = TM.generateMap(mid(), 'common', { createdAt: now });
  assertEqual(m.createdAt, now, 'Custom createdAt stored');

  // generateMap with expiresAt: null explicitly
  var m2 = TM.generateMap(mid(), 'epic', { expiresAt: null });
  assert(m2.expiresAt === null, 'Explicit null expiresAt stored as null');

  // claimCache on null map
  var res1 = TM.claimCache(null, uid(), { x: 0, z: 0 }, freshState(), []);
  assert(!res1.success, 'claimCache handles null map gracefully');

  // solveClue on null map
  var res2 = TM.solveClue(null, uid(), 1, { x: 0, z: 0 }, 'nexus', freshState());
  assert(!res2.success, 'solveClue handles null map gracefully');

  // activateMap on null map
  var res3 = TM.activateMap(null, uid(), freshState());
  assert(!res3.success, 'activateMap handles null map gracefully');

  // tradeMap to self
  var state = freshState();
  var pid   = uid();
  var mapId = mid();
  TM.giveMap(mapId, pid, state);
  var res4 = TM.tradeMap(mapId, pid, pid, state);
  // Should succeed (no rule against trading to self in spec) or gracefully fail
  // Either way should not throw
  assert(res4 !== undefined, 'tradeMap to self does not throw');

  // Multiple fragment types, partial counts
  var state2 = freshState();
  var pid2   = uid();
  TM.awardFragment('map_fragment_epic', 2, pid2, state2);
  TM.awardFragment('map_fragment_epic', 1, pid2, state2);
  var frags2 = TM.getFragments(pid2, state2);
  assertEqual(frags2['map_fragment_epic'], 3, 'Fragments accumulate across multiple awards');

  // getFragments returns independent copy
  var state3 = freshState();
  var pid3   = uid();
  TM.awardFragment('map_fragment_common', 5, pid3, state3);
  var fCopy = TM.getFragments(pid3, state3);
  fCopy['map_fragment_common'] = 0;
  var fCheck = TM.getFragments(pid3, state3);
  assertEqual(fCheck['map_fragment_common'], 5, 'getFragments returns independent copy');

  // totalSparkEarned for player with no history
  var pid4  = uid();
  var spark = TM.totalSparkEarned(pid4, freshState());
  assertEqual(spark, 0, 'totalSparkEarned is 0 for player with no history');

  // countCompletedByRarity for player with no history
  var pid5   = uid();
  var counts = TM.countCompletedByRarity(pid5, freshState());
  assertEqual(counts.common, 0,    'countCompletedByRarity common = 0 for fresh player');
  assertEqual(counts.legendary, 0, 'countCompletedByRarity legendary = 0 for fresh player');
});

// ============================================================================
// SUITE 28: Clue Coordinates Range
// ============================================================================

suite('Clue Coordinate Range', function() {

  // 10 different maps, check all coords are in world bounds [-600, 600]
  for (var i = 0; i < 10; i++) {
    var map = TM.generateMap('range_test_' + i, TM.RARITY_TIERS[i % 5]);
    map.clues.forEach(function(c) {
      assert(c.coords.x >= -600 && c.coords.x <= 600, 'Clue x in range: ' + c.coords.x);
      assert(c.coords.z >= -600 && c.coords.z <= 600, 'Clue z in range: ' + c.coords.z);
    });
    assert(map.finalCoords.x >= -600 && map.finalCoords.x <= 600, 'Final x in range');
    assert(map.finalCoords.z >= -600 && map.finalCoords.z <= 600, 'Final z in range');
  }
});

// ============================================================================
// SUITE 29: Multiple Active Maps per Player
// ============================================================================

suite('Multiple Active Maps per Player', function() {

  var state = freshState();
  var pid   = uid();
  state.mapDefinitions = {};

  var maps = [];
  for (var i = 0; i < 3; i++) {
    var m = TM.generateMap(mid(), TM.RARITY_TIERS[i]);
    state.mapDefinitions[m.id] = m;
    TM.giveMap(m.id, pid, state);
    TM.activateMap(m, pid, state);
    maps.push(m);
  }

  var active = TM.getActiveMaps(pid, state);
  assertEqual(active.length, 3, 'Player can have 3 active maps simultaneously');

  // Can solve clue on specific map
  var m0 = maps[0];
  var c0 = m0.clues[0];
  var res = TM.solveClue(m0, pid, 1, c0.coords, c0.zoneId, state);
  assert(res.success, 'Can solve clue on one of multiple active maps');

  // Abandon middle map
  TM.deactivateMap(maps[1].id, pid, state);
  var active2 = TM.getActiveMaps(pid, state);
  assertEqual(active2.length, 2, 'Active map count decreases after abandonment');
});

// ============================================================================
// FINAL REPORT
// ============================================================================

console.log('\n========================================');
console.log(passed + ' passed, ' + failed + ' failed');
if (errors.length > 0) {
  console.log('\nFailures:');
  errors.forEach(function(e) { console.log('  ' + e); });
}
console.log('========================================\n');

if (failed > 0) { process.exit(1); }
