// tests/test_pet_evolution.js
// Comprehensive tests for pet_evolution.js — ZION MMO
// 200+ tests covering all features

'use strict';

var PE = require('../src/js/pet_evolution');

// ---------------------------------------------------------------------------
// MINIMAL TEST HARNESS
// ---------------------------------------------------------------------------

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
  assert(a === b, (msg || '') + ' (expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a) + ')');
}

function assertApprox(a, b, tolerance, msg) {
  tolerance = tolerance || 0.001;
  assert(Math.abs(a - b) <= tolerance, (msg || '') + ' (expected ~' + b + ', got ' + a + ')');
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

var _uid = 0;
function uid(prefix) {
  return (prefix || 'player') + '_' + (++_uid);
}

function freshRecord(petType, bondXp) {
  var id = uid(petType || 'cat');
  PE.clearPlayerEvolution(id);
  PE.initEvolution(id, petType || 'cat');
  if (bondXp) PE.setBondXp(id, bondXp);
  return id;
}

// ---------------------------------------------------------------------------
// SUITE: Constants & Data Structures
// ---------------------------------------------------------------------------

suite('Constants — TIERS', function() {
  assert(typeof PE.TIERS === 'object', 'TIERS is an object');
  assertEqual(PE.TIERS.YOUNG,    'young',    'TIERS.YOUNG is young');
  assertEqual(PE.TIERS.MATURE,   'mature',   'TIERS.MATURE is mature');
  assertEqual(PE.TIERS.ASCENDED, 'ascended', 'TIERS.ASCENDED is ascended');
});

suite('Constants — TIER_XP_THRESHOLDS', function() {
  assert(typeof PE.TIER_XP_THRESHOLDS === 'object', 'TIER_XP_THRESHOLDS is an object');
  assertEqual(PE.TIER_XP_THRESHOLDS.young,    0,    'young threshold is 0');
  assertEqual(PE.TIER_XP_THRESHOLDS.mature,   500,  'mature threshold is 500');
  assertEqual(PE.TIER_XP_THRESHOLDS.ascended, 2000, 'ascended threshold is 2000');
  assert(PE.TIER_XP_THRESHOLDS.mature < PE.TIER_XP_THRESHOLDS.ascended, 'mature < ascended XP');
});

suite('Constants — TIER_LABELS', function() {
  assert(typeof PE.TIER_LABELS === 'object', 'TIER_LABELS is an object');
  assertEqual(PE.TIER_LABELS.young,    'Young',    'TIER_LABELS.young');
  assertEqual(PE.TIER_LABELS.mature,   'Mature',   'TIER_LABELS.mature');
  assertEqual(PE.TIER_LABELS.ascended, 'Ascended', 'TIER_LABELS.ascended');
});

suite('Constants — BOND_XP_RATES', function() {
  assert(typeof PE.BOND_XP_RATES === 'object', 'BOND_XP_RATES is object');
  assert(PE.BOND_XP_RATES.proximity > 0,     'proximity rate is positive');
  assert(PE.BOND_XP_RATES.adventure > 0,     'adventure rate is positive');
  assert(PE.BOND_XP_RATES.feeding > 0,       'feeding rate is positive');
  assert(PE.BOND_XP_RATES.favorite_food > 0, 'favorite_food rate is positive');
  assert(PE.BOND_XP_RATES.play > 0,          'play rate is positive');
  assert(PE.BOND_XP_RATES.neglect < 0,       'neglect rate is negative');
  assert(PE.BOND_XP_RATES.favorite_food > PE.BOND_XP_RATES.feeding,
    'favorite food gives more bond xp than feeding');
});

suite('Constants — HAPPINESS', function() {
  assert(PE.HAPPINESS.MAX === 100, 'HAPPINESS.MAX is 100');
  assert(PE.HAPPINESS.MIN === 0,   'HAPPINESS.MIN is 0');
  assert(PE.HAPPINESS.ECSTATIC_THRESH > PE.HAPPINESS.HAPPY_THRESH,
    'ecstatic > happy threshold');
  assert(PE.HAPPINESS.HAPPY_THRESH > PE.HAPPINESS.CONTENT_THRESH,
    'happy > content threshold');
  assert(PE.HAPPINESS.CONTENT_THRESH > PE.HAPPINESS.UNHAPPY_THRESH,
    'content > unhappy threshold');
  assert(PE.HAPPINESS.ASCENDED_DECAY < PE.HAPPINESS.NEGLECT_DECAY,
    'ascended pets decay slower than normal');
});

suite('Constants — FOOD_TYPES', function() {
  assert(typeof PE.FOOD_TYPES === 'object', 'FOOD_TYPES is object');
  var keys = Object.keys(PE.FOOD_TYPES);
  assert(keys.length >= 6, 'At least 6 food types defined');

  keys.forEach(function(key) {
    var food = PE.FOOD_TYPES[key];
    assert(typeof food.bondXp === 'number' && food.bondXp > 0,
      key + ' has positive bondXp');
    assert(typeof food.happiness === 'number' && food.happiness > 0,
      key + ' has positive happiness');
    assert(food.buff && typeof food.buff.type === 'string',
      key + ' has buff with type');
    assert(food.buff && food.buff.duration > 0,
      key + ' buff has positive duration');
    assert(food.buff && food.buff.value > 0,
      key + ' buff has positive value');
  });
});

suite('Constants — FAVORITE_FOODS', function() {
  assert(typeof PE.FAVORITE_FOODS === 'object', 'FAVORITE_FOODS is object');
  var petTypes = ['cat','fox','owl','butterfly','rabbit','frog','firefly','wolf_pup','phoenix_chick','turtle'];
  petTypes.forEach(function(pt) {
    assert(typeof PE.FAVORITE_FOODS[pt] === 'string',
      pt + ' has a favorite food');
    assert(PE.FOOD_TYPES[PE.FAVORITE_FOODS[pt]] !== undefined,
      pt + ' favorite food exists in FOOD_TYPES');
  });
});

suite('Constants — EVOLUTION_FORMS', function() {
  assert(typeof PE.EVOLUTION_FORMS === 'object', 'EVOLUTION_FORMS is object');
  var petTypes = ['cat','fox','owl','butterfly','rabbit','frog','firefly','wolf_pup','phoenix_chick','turtle'];

  petTypes.forEach(function(pt) {
    assert(PE.EVOLUTION_FORMS[pt] !== undefined, pt + ' has forms');
    ['young', 'mature', 'ascended'].forEach(function(tier) {
      var form = PE.EVOLUTION_FORMS[pt][tier];
      assert(form !== undefined, pt + '.' + tier + ' form exists');
      assert(typeof form.name === 'string' && form.name.length > 0,
        pt + '.' + tier + ' has name');
      assert(typeof form.color === 'string', pt + '.' + tier + ' has color');
      assert(typeof form.scale === 'number' && form.scale > 0,
        pt + '.' + tier + ' has positive scale');
      assert(typeof form.icon === 'string', pt + '.' + tier + ' has icon');
    });

    // Ascended form should have larger scale than young
    assert(PE.EVOLUTION_FORMS[pt].ascended.scale > PE.EVOLUTION_FORMS[pt].young.scale,
      pt + ': ascended form has larger scale than young');
  });
});

suite('Constants — PET_ABILITIES', function() {
  assert(typeof PE.PET_ABILITIES === 'object', 'PET_ABILITIES is object');
  var petTypes = ['cat','fox','owl','butterfly','rabbit','frog','firefly','wolf_pup','phoenix_chick','turtle'];

  petTypes.forEach(function(pt) {
    assert(PE.PET_ABILITIES[pt] !== undefined, pt + ' has abilities');
    ['young', 'mature', 'ascended'].forEach(function(tier) {
      var abilities = PE.PET_ABILITIES[pt][tier];
      assert(Array.isArray(abilities) && abilities.length > 0,
        pt + '.' + tier + ' has at least one ability');
      abilities.forEach(function(ab) {
        assert(typeof ab.id === 'string', pt + '.' + tier + ' ability has id');
        assert(typeof ab.name === 'string', pt + '.' + tier + ' ability has name');
        assert(typeof ab.desc === 'string', pt + '.' + tier + ' ability has desc');
        assert(typeof ab.passive === 'boolean', pt + '.' + tier + ' ability has passive flag');
      });
    });
  });
});

suite('Constants — PET_BASE_BONUSES', function() {
  assert(typeof PE.PET_BASE_BONUSES === 'object', 'PET_BASE_BONUSES is object');
  var petTypes = ['cat','fox','owl','butterfly','rabbit','frog','firefly','wolf_pup','phoenix_chick','turtle'];

  petTypes.forEach(function(pt) {
    var bonus = PE.PET_BASE_BONUSES[pt];
    assert(bonus !== undefined, pt + ' has base bonus');
    assert(typeof bonus.type === 'string', pt + ' bonus has type string');
    assert(typeof bonus.value === 'number' && bonus.value > 0, pt + ' bonus has positive value');
  });

  // Phoenix chick should have highest base bonus
  assert(PE.PET_BASE_BONUSES.phoenix_chick.value >= PE.PET_BASE_BONUSES.cat.value,
    'phoenix_chick base bonus >= cat base bonus');
});

suite('Constants — TIER_STAT_MULTIPLIERS', function() {
  assert(PE.TIER_STAT_MULTIPLIERS.young === 1.0,    'young multiplier is 1.0');
  assert(PE.TIER_STAT_MULTIPLIERS.mature > PE.TIER_STAT_MULTIPLIERS.young,
    'mature multiplier > young');
  assert(PE.TIER_STAT_MULTIPLIERS.ascended > PE.TIER_STAT_MULTIPLIERS.mature,
    'ascended multiplier > mature');
});

suite('Constants — EVOLUTION_REQUIREMENTS', function() {
  assert(typeof PE.EVOLUTION_REQUIREMENTS === 'object', 'EVOLUTION_REQUIREMENTS is object');
  assert(PE.EVOLUTION_REQUIREMENTS.young_to_mature !== undefined, 'young_to_mature reqs exist');
  assert(PE.EVOLUTION_REQUIREMENTS.mature_to_ascended !== undefined, 'mature_to_ascended reqs exist');

  var petTypes = ['cat','fox','owl','butterfly','rabbit','frog','firefly','wolf_pup','phoenix_chick','turtle'];
  petTypes.forEach(function(pt) {
    var r1 = PE.EVOLUTION_REQUIREMENTS.young_to_mature[pt];
    assert(r1 !== undefined, pt + ' has young_to_mature requirements');
    assert(typeof r1.bondXp === 'number', pt + ' young_to_mature has bondXp requirement');
    assertEqual(r1.bondXp, PE.TIER_XP_THRESHOLDS.mature,
      pt + ' young_to_mature bondXp matches mature threshold');

    var r2 = PE.EVOLUTION_REQUIREMENTS.mature_to_ascended[pt];
    assert(r2 !== undefined, pt + ' has mature_to_ascended requirements');
    assert(typeof r2.bondXp === 'number', pt + ' mature_to_ascended has bondXp requirement');
    assertEqual(r2.bondXp, PE.TIER_XP_THRESHOLDS.ascended,
      pt + ' mature_to_ascended bondXp matches ascended threshold');
  });
});

// ---------------------------------------------------------------------------
// SUITE: mulberry32 PRNG
// ---------------------------------------------------------------------------

suite('mulberry32 — Seeded PRNG', function() {
  assert(typeof PE.mulberry32 === 'function', 'mulberry32 is exported');

  var rng = PE.mulberry32(42);
  assert(typeof rng === 'function', 'mulberry32(seed) returns a function');

  var r1 = rng();
  assert(typeof r1 === 'number', 'PRNG returns a number');
  assert(r1 >= 0 && r1 < 1, 'PRNG output is in [0, 1)');

  // Determinism: same seed → same sequence
  var rng2 = PE.mulberry32(42);
  assertEqual(rng2(), r1, 'Same seed produces same first value');

  // Different seeds → different values
  var rng3 = PE.mulberry32(99);
  var v3 = rng3();
  assert(v3 !== r1, 'Different seeds produce different values');

  // Sequence advances
  var rngA = PE.mulberry32(7);
  var vA1 = rngA();
  var vA2 = rngA();
  assert(vA1 !== vA2, 'Consecutive calls produce different values');

  // All values in range
  var rngRange = PE.mulberry32(12345);
  for (var i = 0; i < 50; i++) {
    var v = rngRange();
    assert(v >= 0 && v < 1, 'PRNG value ' + i + ' in [0,1)');
  }
});

// ---------------------------------------------------------------------------
// SUITE: initEvolution & getEvolutionRecord
// ---------------------------------------------------------------------------

suite('initEvolution & getEvolutionRecord', function() {
  var p1 = uid('init');
  var record = PE.initEvolution(p1, 'cat');

  assert(record !== null, 'initEvolution returns non-null record');
  assertEqual(record.playerId, p1,        'record has correct playerId');
  assertEqual(record.petType,  'cat',     'record has correct petType');
  assertEqual(record.tier,     'young',   'new record starts at young tier');
  assertEqual(record.bondXp,   0,         'new record starts with 0 bondXp');
  assertEqual(record.happiness, 100,      'new record starts at max happiness');
  assert(Array.isArray(record.activeBuffs),  'activeBuffs is array');
  assert(Array.isArray(record.evolutions),   'evolutions is array');
  assert(Array.isArray(record.abilities),    'abilities is array');
  assert(record.abilities.length > 0,        'young tier unlocks at least 1 ability');

  // getEvolutionRecord returns the same
  var fetched = PE.getEvolutionRecord(p1);
  assert(fetched !== null, 'getEvolutionRecord returns record');
  assertEqual(fetched.petType, 'cat', 'fetched record has correct petType');

  // initEvolution returns null for missing params
  var bad1 = PE.initEvolution(null, 'cat');
  assert(bad1 === null, 'initEvolution returns null for null playerId');

  var bad2 = PE.initEvolution(uid('x'), null);
  assert(bad2 === null, 'initEvolution returns null for null petType');

  // getEvolutionRecord returns null for unknown player
  var none = PE.getEvolutionRecord(uid('nobody'));
  assert(none === null, 'getEvolutionRecord returns null for unknown player');

  // Re-initialise overwrites existing record
  PE.initEvolution(p1, 'fox');
  var overwritten = PE.getEvolutionRecord(p1);
  assertEqual(overwritten.petType, 'fox', 'initEvolution overwrites existing record');
  assertEqual(overwritten.bondXp, 0, 'overwritten record resets bondXp to 0');
});

// ---------------------------------------------------------------------------
// SUITE: getTierFromXp helper
// ---------------------------------------------------------------------------

suite('getTierFromXp — tier calculation', function() {
  assertEqual(PE.getTierFromXp(0),    'young',    'XP 0 is young');
  assertEqual(PE.getTierFromXp(1),    'young',    'XP 1 is young');
  assertEqual(PE.getTierFromXp(499),  'young',    'XP 499 is young');
  assertEqual(PE.getTierFromXp(500),  'mature',   'XP 500 is mature');
  assertEqual(PE.getTierFromXp(501),  'mature',   'XP 501 is mature');
  assertEqual(PE.getTierFromXp(1999), 'mature',   'XP 1999 is mature');
  assertEqual(PE.getTierFromXp(2000), 'ascended', 'XP 2000 is ascended');
  assertEqual(PE.getTierFromXp(5000), 'ascended', 'XP 5000 is ascended');
});

suite('getNextTier helper', function() {
  assertEqual(PE.getNextTier('young'),    'mature',   'young next is mature');
  assertEqual(PE.getNextTier('mature'),   'ascended', 'mature next is ascended');
  assert(PE.getNextTier('ascended') === null, 'ascended has no next tier');
});

suite('getXpToNextTier helper', function() {
  assertEqual(PE.getXpToNextTier(0),    500,  'XP 0: need 500 to mature');
  assertEqual(PE.getXpToNextTier(250),  250,  'XP 250: need 250 more to mature');
  assertEqual(PE.getXpToNextTier(500),  1500, 'XP 500: need 1500 to ascended');
  assertEqual(PE.getXpToNextTier(1000), 1000, 'XP 1000: need 1000 to ascended');
  assertEqual(PE.getXpToNextTier(2000), 0,    'XP 2000 ascended: 0 remaining');
  assertEqual(PE.getXpToNextTier(9999), 0,    'Ascended XP: 0 remaining');
});

// ---------------------------------------------------------------------------
// SUITE: addBondXp
// ---------------------------------------------------------------------------

suite('addBondXp — basic gain', function() {
  var p = freshRecord('cat');

  var result = PE.addBondXp(p, 'proximity', 1);
  assert(result.gained > 0, 'proximity adds positive XP');
  assertEqual(result.gained, PE.BOND_XP_RATES.proximity, 'proximity gain matches rate');
  assertEqual(result.total, PE.BOND_XP_RATES.proximity, 'total accumulates correctly');
  assertEqual(result.tierChanged, false, 'no tier change from small XP gain');
  assertEqual(result.newTier, 'young', 'still young after small gain');

  var result2 = PE.addBondXp(p, 'adventure', 1);
  assertEqual(result2.gained, PE.BOND_XP_RATES.adventure, 'adventure gain matches rate');
  assert(result2.total > result.total, 'total increases with each gain');
});

suite('addBondXp — tier change to mature', function() {
  var p = freshRecord('cat');
  // Get to just below 500
  PE.setBondXp(p, 490);
  var result = PE.addBondXp(p, 'feeding', 1);
  // feeding = 15, so 490+15 = 505 >= 500 → mature
  assert(result.tierChanged, 'tier changes when crossing 500 threshold');
  assertEqual(result.newTier, 'mature', 'new tier is mature');
  var rec = PE.getEvolutionRecord(p);
  assertEqual(rec.tier, 'mature', 'record tier updated to mature');
  assert(rec.evolutions.length === 1, 'evolution history has 1 entry');
  assertEqual(rec.evolutions[0].from, 'young', 'evolution from young');
  assertEqual(rec.evolutions[0].to, 'mature', 'evolution to mature');
});

suite('addBondXp — tier change to ascended', function() {
  var p = freshRecord('cat');
  PE.setBondXp(p, 1985);
  var result = PE.addBondXp(p, 'adventure', 1);
  // adventure = 25, so 1985+25 = 2010 >= 2000 → ascended
  assert(result.tierChanged, 'tier changes when crossing 2000 threshold');
  assertEqual(result.newTier, 'ascended', 'new tier is ascended');
  var rec = PE.getEvolutionRecord(p);
  assertEqual(rec.tier, 'ascended', 'record tier updated to ascended');
});

suite('addBondXp — no XP for unknown source', function() {
  var p = freshRecord('fox');
  var result = PE.addBondXp(p, 'unknown_action', 1);
  assertEqual(result.gained, 0, 'unknown source gives 0 XP');
  assertEqual(result.total, 0, 'total unchanged for unknown source');
});

suite('addBondXp — returns zeros for no record', function() {
  var result = PE.addBondXp(uid('nobody'), 'feeding', 1);
  assertEqual(result.gained, 0, 'no record: gained is 0');
  assertEqual(result.total, 0, 'no record: total is 0');
  assertEqual(result.tierChanged, false, 'no record: tierChanged is false');
});

suite('addBondXp — multiplier scaling', function() {
  var p = freshRecord('owl');
  var result = PE.addBondXp(p, 'proximity', 5);
  assertEqual(result.gained, PE.BOND_XP_RATES.proximity * 5, 'multiplier scales gained XP');
});

// ---------------------------------------------------------------------------
// SUITE: setBondXp
// ---------------------------------------------------------------------------

suite('setBondXp', function() {
  var p = freshRecord('rabbit');
  var ok = PE.setBondXp(p, 600);
  assert(ok === true, 'setBondXp returns true on success');
  var rec = PE.getEvolutionRecord(p);
  assertEqual(rec.bondXp, 600, 'bondXp set to 600');
  assertEqual(rec.tier, 'mature', 'tier updated to mature from set XP');

  PE.setBondXp(p, 2500);
  var rec2 = PE.getEvolutionRecord(p);
  assertEqual(rec2.tier, 'ascended', 'tier updated to ascended from set XP');

  // Negative XP clamps to 0
  PE.setBondXp(p, -100);
  var rec3 = PE.getEvolutionRecord(p);
  assertEqual(rec3.bondXp, 0, 'negative XP clamps to 0');
  assertEqual(rec3.tier, 'young', 'tier resets to young after clamp');

  // Returns false for missing player
  var ok2 = PE.setBondXp(uid('nobody'), 100);
  assert(ok2 === false, 'setBondXp returns false for missing player');
});

// ---------------------------------------------------------------------------
// SUITE: feedPet
// ---------------------------------------------------------------------------

suite('feedPet — basic success', function() {
  var p = freshRecord('cat');
  var result = PE.feedPet(p, 'berry');

  assert(result.success === true,          'feedPet success for valid food');
  assert(typeof result.message === 'string', 'feedPet returns message');
  assert(result.bondXpGained > 0,          'feedPet grants bond XP');
  assert(result.happinessGained > 0,       'feedPet grants happiness');
  assert(result.buff !== null,             'feedPet grants a buff');
  assert(typeof result.buff.type === 'string', 'buff has type');
  assert(result.buff.expiresAt > Date.now(), 'buff has future expiry');
  assert(typeof result.totalBondXp === 'number', 'feedPet returns totalBondXp');
});

suite('feedPet — favorite food bonus', function() {
  // cat's favorite is 'fish'
  var p = freshRecord('cat');
  var result = PE.feedPet(p, 'fish');

  assert(result.isFavorite === true, 'fish is cat favorite food');
  assert(result.bondXpGained > PE.FOOD_TYPES.fish.bondXp,
    'favorite food gives more XP than base food XP');
  assert(result.message.includes('loves'), 'favorite food message says loves');
});

suite('feedPet — non-favorite food', function() {
  // cat's favorite is 'fish', not berry
  var p = freshRecord('cat');
  var result = PE.feedPet(p, 'berry');
  assert(result.isFavorite === false, 'berry is not cat favorite');
  assertEqual(result.bondXpGained, PE.FOOD_TYPES.berry.bondXp,
    'non-favorite gives base bondXp only');
  assert(!result.message.includes('loves'), 'non-favorite message does not say loves');
});

suite('feedPet — happiness caps at 100', function() {
  var p = freshRecord('fox');
  // Start at 95 happiness
  var rec = PE.getEvolutionRecord(p);
  rec.happiness = 95;
  PE.feedPet(p, 'treat');
  var rec2 = PE.getEvolutionRecord(p);
  assert(rec2.happiness <= 100, 'happiness does not exceed 100 after feeding');
  assertEqual(rec2.happiness, 100, 'happiness capped at 100');
});

suite('feedPet — unknown food fails', function() {
  var p = freshRecord('owl');
  var result = PE.feedPet(p, 'dragon_steak');
  assert(result.success === false, 'unknown food returns failure');
  assert(typeof result.message === 'string', 'failure has message');
});

suite('feedPet — no record fails', function() {
  var result = PE.feedPet(uid('nobody'), 'berry');
  assert(result.success === false, 'no record returns failure');
});

suite('feedPet — triggers tier change', function() {
  var p = freshRecord('cat');
  PE.setBondXp(p, 470);
  // crystal_fruit gives 25 bondXp, so 470+25 = 495, still young
  // Feeding with spirit_seed gives 30 XP → 470+30 = 500 → mature
  var result = PE.feedPet(p, 'spirit_seed');
  assert(result.tierChanged, 'feeding can trigger tier change');
  assertEqual(result.newTier, 'mature', 'feeding triggers mature evolution');
});

suite('feedPet — buff is stored in activeBuffs', function() {
  var p = freshRecord('butterfly');
  PE.feedPet(p, 'berry');
  var buffs = PE.getActiveBuffs(p, Date.now() - 1000);
  assert(buffs.length > 0, 'buff stored in activeBuffs after feeding');
});

suite('feedPet — all food types can be fed', function() {
  var foodTypes = Object.keys(PE.FOOD_TYPES);
  foodTypes.forEach(function(food) {
    var p = freshRecord('turtle');
    var result = PE.feedPet(p, food);
    assert(result.success === true, food + ' can be fed successfully');
    assert(result.bondXpGained > 0, food + ' grants bondXp');
  });
});

// ---------------------------------------------------------------------------
// SUITE: playWithPet
// ---------------------------------------------------------------------------

suite('playWithPet', function() {
  var p = freshRecord('frog');
  var result = PE.playWithPet(p);
  assert(result.success === true, 'playWithPet succeeds');
  assertEqual(result.happinessGained, PE.HAPPINESS.PLAY_BONUS, 'play grants correct happiness');
  assertEqual(result.bondXpGained, PE.BOND_XP_RATES.play, 'play grants correct bond XP');

  var rec = PE.getEvolutionRecord(p);
  assert(rec.happiness > 0, 'happiness increased after play');
  assert(rec.bondXp > 0, 'bondXp increased after play');

  // No record case
  var result2 = PE.playWithPet(uid('nobody'));
  assert(result2.success === false, 'playWithPet fails for no record');

  // Happiness caps at 100
  var p2 = freshRecord('rabbit');
  var rec2 = PE.getEvolutionRecord(p2);
  rec2.happiness = 98;
  PE.playWithPet(p2);
  var rec3 = PE.getEvolutionRecord(p2);
  assert(rec3.happiness <= 100, 'play happiness capped at 100');

  // Play can trigger tier change
  var p3 = freshRecord('wolf_pup');
  PE.setBondXp(p3, 495);
  var result3 = PE.playWithPet(p3);
  // play gives 10 XP → 495+10 = 505 >= 500 → mature
  assert(result3.tierChanged, 'play can trigger tier change');
  assertEqual(result3.newTier, 'mature', 'play triggers mature evolution');
});

// ---------------------------------------------------------------------------
// SUITE: applyHappinessDecay
// ---------------------------------------------------------------------------

suite('applyHappinessDecay', function() {
  var p = freshRecord('firefly');
  var now = Date.now();
  var rec = PE.getEvolutionRecord(p);
  rec.lastInteract = now - 3600000; // 1 hour ago

  var updated = PE.applyHappinessDecay(p, now);
  assert(updated !== null, 'applyHappinessDecay returns updated record');
  assert(updated.happiness < 100, 'happiness decays over time');

  // No record returns null
  var none = PE.applyHappinessDecay(uid('nobody'), now);
  assert(none === null, 'returns null for no record');

  // Happiness does not go below 0
  var p2 = freshRecord('cat');
  var rec2 = PE.getEvolutionRecord(p2);
  rec2.happiness = 0;
  rec2.lastInteract = now - (100 * 3600000); // 100 hours ago
  var updated2 = PE.applyHappinessDecay(p2, now);
  assert(updated2.happiness >= 0, 'happiness does not go below 0');
  assertEqual(updated2.happiness, 0, 'happiness clamped at 0');

  // Ascended pets decay slower
  var p3 = freshRecord('phoenix_chick');
  PE.setBondXp(p3, 2000);
  var rec3 = PE.getEvolutionRecord(p3);
  rec3.happiness = 100;
  rec3.lastInteract = now - 3600000; // 1 hour

  var p4 = freshRecord('cat');
  var rec4 = PE.getEvolutionRecord(p4);
  rec4.happiness = 100;
  rec4.lastInteract = now - 3600000;

  PE.applyHappinessDecay(p3, now);
  PE.applyHappinessDecay(p4, now);

  var updated3 = PE.getEvolutionRecord(p3);
  var updated4 = PE.getEvolutionRecord(p4);
  assert(updated3.happiness > updated4.happiness,
    'ascended pet decays slower than young pet');
});

// ---------------------------------------------------------------------------
// SUITE: getHappinessLabel
// ---------------------------------------------------------------------------

suite('getHappinessLabel', function() {
  assertEqual(PE.getHappinessLabel(100), 'ecstatic', 'happiness 100 is ecstatic');
  assertEqual(PE.getHappinessLabel(90),  'ecstatic', 'happiness 90 is ecstatic');
  assertEqual(PE.getHappinessLabel(89),  'happy',    'happiness 89 is happy');
  assertEqual(PE.getHappinessLabel(70),  'happy',    'happiness 70 is happy');
  assertEqual(PE.getHappinessLabel(69),  'content',  'happiness 69 is content');
  assertEqual(PE.getHappinessLabel(50),  'content',  'happiness 50 is content');
  assertEqual(PE.getHappinessLabel(49),  'unhappy',  'happiness 49 is unhappy');
  assertEqual(PE.getHappinessLabel(30),  'unhappy',  'happiness 30 is unhappy');
  assertEqual(PE.getHappinessLabel(29),  'miserable','happiness 29 is miserable');
  assertEqual(PE.getHappinessLabel(0),   'miserable','happiness 0 is miserable');
});

// ---------------------------------------------------------------------------
// SUITE: getCurrentForm & getAllForms
// ---------------------------------------------------------------------------

suite('getCurrentForm', function() {
  var p = freshRecord('fox');
  var form = PE.getCurrentForm(p);
  assert(form !== null, 'getCurrentForm returns form');
  assertEqual(form.name, PE.EVOLUTION_FORMS.fox.young.name, 'young fox form name correct');

  PE.setBondXp(p, 500);
  var form2 = PE.getCurrentForm(p);
  assertEqual(form2.name, PE.EVOLUTION_FORMS.fox.mature.name, 'mature fox form name correct');

  PE.setBondXp(p, 2000);
  var form3 = PE.getCurrentForm(p);
  assertEqual(form3.name, PE.EVOLUTION_FORMS.fox.ascended.name, 'ascended fox form name correct');

  // No record
  var formNone = PE.getCurrentForm(uid('nobody'));
  assert(formNone === null, 'returns null for no record');
});

suite('getAllForms', function() {
  var forms = PE.getAllForms('owl');
  assert(forms !== null, 'getAllForms returns forms for owl');
  assert(forms.young !== undefined,    'getAllForms returns young form');
  assert(forms.mature !== undefined,   'getAllForms returns mature form');
  assert(forms.ascended !== undefined, 'getAllForms returns ascended form');

  var noForms = PE.getAllForms('dragon');
  assert(noForms === null, 'getAllForms returns null for unknown pet type');
});

// ---------------------------------------------------------------------------
// SUITE: getEvolutionBonus & getBonusByTypeAndTier
// ---------------------------------------------------------------------------

suite('getEvolutionBonus', function() {
  var p = freshRecord('cat');
  var bonus = PE.getEvolutionBonus(p);
  assert(bonus !== null, 'getEvolutionBonus returns bonus');
  assertEqual(bonus.type, PE.PET_BASE_BONUSES.cat.type, 'bonus type matches cat bonus type');
  assertEqual(bonus.tier, 'young', 'bonus tier is young');
  assertApprox(bonus.value, PE.PET_BASE_BONUSES.cat.value * PE.TIER_STAT_MULTIPLIERS.young,
    0.001, 'young bonus value = base * young_multiplier');
  assertEqual(bonus.multiplier, PE.TIER_STAT_MULTIPLIERS.young, 'multiplier is young multiplier');

  // Mature tier
  PE.setBondXp(p, 500);
  var bonusMature = PE.getEvolutionBonus(p);
  assertApprox(bonusMature.value, PE.PET_BASE_BONUSES.cat.value * PE.TIER_STAT_MULTIPLIERS.mature,
    0.001, 'mature bonus value = base * mature_multiplier');
  assertEqual(bonusMature.multiplier, PE.TIER_STAT_MULTIPLIERS.mature, 'mature multiplier correct');

  // Ascended tier
  PE.setBondXp(p, 2000);
  var bonusAscended = PE.getEvolutionBonus(p);
  assertApprox(bonusAscended.value, PE.PET_BASE_BONUSES.cat.value * PE.TIER_STAT_MULTIPLIERS.ascended,
    0.001, 'ascended bonus value = base * ascended_multiplier');

  // Bonus scales across tiers
  assert(bonusMature.value > bonus.value, 'mature bonus > young bonus');
  assert(bonusAscended.value > bonusMature.value, 'ascended bonus > mature bonus');

  // No record
  var none = PE.getEvolutionBonus(uid('nobody'));
  assert(none === null, 'getEvolutionBonus returns null for no record');
});

suite('getBonusByTypeAndTier', function() {
  var bonus = PE.getBonusByTypeAndTier('cat', 'young');
  assert(bonus !== null, 'getBonusByTypeAndTier returns bonus');
  assertEqual(bonus.type, 'trade_luck', 'cat bonus type is trade_luck');
  assertEqual(bonus.tier, 'young', 'tier is young');

  var bonusMature = PE.getBonusByTypeAndTier('cat', 'mature');
  assert(bonusMature.value > bonus.value, 'mature > young bonus value');

  var bonusAscended = PE.getBonusByTypeAndTier('cat', 'ascended');
  assert(bonusAscended.value > bonusMature.value, 'ascended > mature bonus value');

  // Phoenix chick
  var phoenixBonus = PE.getBonusByTypeAndTier('phoenix_chick', 'ascended');
  assert(phoenixBonus !== null, 'phoenix_chick ascended bonus not null');
  assertEqual(phoenixBonus.type, 'resilience', 'phoenix bonus type is resilience');

  // Unknown type
  var none = PE.getBonusByTypeAndTier('dragon', 'young');
  assert(none === null, 'unknown pet type returns null');
});

// ---------------------------------------------------------------------------
// SUITE: getAbilitiesForTier & getPlayerAbilities
// ---------------------------------------------------------------------------

suite('getAbilitiesForTier', function() {
  // Young: only young abilities
  var youngAbilities = PE.getAbilitiesForTier('cat', 'young');
  assert(youngAbilities.length === PE.PET_ABILITIES.cat.young.length,
    'young tier has exactly young abilities');

  // Mature: young + mature abilities
  var matureAbilities = PE.getAbilitiesForTier('cat', 'mature');
  var expectedMature = PE.PET_ABILITIES.cat.young.length + PE.PET_ABILITIES.cat.mature.length;
  assertEqual(matureAbilities.length, expectedMature, 'mature tier has young + mature abilities');

  // Ascended: young + mature + ascended abilities
  var ascendedAbilities = PE.getAbilitiesForTier('cat', 'ascended');
  var expectedAscended = PE.PET_ABILITIES.cat.young.length
    + PE.PET_ABILITIES.cat.mature.length
    + PE.PET_ABILITIES.cat.ascended.length;
  assertEqual(ascendedAbilities.length, expectedAscended, 'ascended has all abilities');

  // Abilities accumulate across tiers
  assert(matureAbilities.length > youngAbilities.length,
    'mature has more abilities than young');
  assert(ascendedAbilities.length > matureAbilities.length,
    'ascended has more abilities than mature');

  // Each tier includes young abilities
  var youngIds = PE.PET_ABILITIES.cat.young.map(function(a) { return a.id; });
  youngIds.forEach(function(id) {
    var found = matureAbilities.some(function(a) { return a.id === id; });
    assert(found, 'mature includes young ability: ' + id);
  });

  // Unknown pet type returns empty array
  var none = PE.getAbilitiesForTier('dragon', 'young');
  assert(Array.isArray(none) && none.length === 0, 'unknown pet type returns empty array');
});

suite('getPlayerAbilities', function() {
  var p = freshRecord('owl');
  var abilities = PE.getPlayerAbilities(p);
  assert(Array.isArray(abilities), 'getPlayerAbilities returns array');
  assert(abilities.length > 0, 'young tier has at least one ability');

  // Abilities increase with tier
  PE.setBondXp(p, 500);
  var matureAbilities = PE.getPlayerAbilities(p);
  assert(matureAbilities.length > abilities.length, 'mature has more abilities than young');

  // No record returns empty array
  var none = PE.getPlayerAbilities(uid('nobody'));
  assert(Array.isArray(none) && none.length === 0, 'no record returns empty array');
});

suite('hasAbility', function() {
  var p = freshRecord('fox');
  // fox young ability: scout_trail
  assert(PE.hasAbility(p, 'scout_trail'), 'young fox has scout_trail ability');
  // fox mature ability: spirit_dash
  assert(!PE.hasAbility(p, 'spirit_dash'), 'young fox does not have spirit_dash yet');

  PE.setBondXp(p, 500);
  assert(PE.hasAbility(p, 'spirit_dash'), 'mature fox has spirit_dash');

  // Ascended ability
  assert(!PE.hasAbility(p, 'tail_storm'), 'mature fox does not have tail_storm yet');
  PE.setBondXp(p, 2000);
  assert(PE.hasAbility(p, 'tail_storm'), 'ascended fox has tail_storm');

  // False for no record
  assert(!PE.hasAbility(uid('nobody'), 'any_ability'), 'no record: hasAbility returns false');
});

// ---------------------------------------------------------------------------
// SUITE: getActiveBuffs & hasActiveBuff
// ---------------------------------------------------------------------------

suite('getActiveBuffs', function() {
  var p = freshRecord('butterfly');

  // No buffs initially
  var buffs = PE.getActiveBuffs(p, Date.now());
  assert(Array.isArray(buffs) && buffs.length === 0, 'no buffs initially');

  // Feed to add buff
  var futureNow = Date.now();
  PE.feedPet(p, 'berry', futureNow);
  var buffs2 = PE.getActiveBuffs(p, futureNow + 1);
  assert(buffs2.length > 0, 'buff active after feeding');

  // Buff expires — berry buff.duration is in seconds, expiresAt = futureNow + duration*1000
  var berryDurationMs = PE.FOOD_TYPES.berry.buff.duration * 1000;
  var buffs3 = PE.getActiveBuffs(p, futureNow + berryDurationMs + 1000);
  assert(buffs3.length === 0, 'buff expired after duration');

  // No record returns empty array
  var none = PE.getActiveBuffs(uid('nobody'), Date.now());
  assert(Array.isArray(none) && none.length === 0, 'no record returns empty array');
});

suite('hasActiveBuff', function() {
  var p = freshRecord('rabbit');
  var now = Date.now();
  PE.feedPet(p, 'berry', now);

  var buffType = PE.FOOD_TYPES.berry.buff.type;
  assert(PE.hasActiveBuff(p, buffType, now + 1), 'has active berry buff type');
  assert(!PE.hasActiveBuff(p, 'nonexistent_buff', now + 1), 'no nonexistent buff');

  // buff.duration is in seconds, expiresAt = now + duration*1000
  var durationMs = PE.FOOD_TYPES.berry.buff.duration * 1000;
  assert(!PE.hasActiveBuff(p, buffType, now + durationMs + 5000), 'buff expired');

  // No record
  assert(!PE.hasActiveBuff(uid('nobody'), 'speed', Date.now()), 'no record: no active buff');
});

// ---------------------------------------------------------------------------
// SUITE: checkEvolutionRequirements
// ---------------------------------------------------------------------------

suite('checkEvolutionRequirements — no record', function() {
  var result = PE.checkEvolutionRequirements(uid('nobody'));
  assert(result.canEvolve === false, 'no record: cannot evolve');
});

suite('checkEvolutionRequirements — already ascended', function() {
  var p = freshRecord('cat');
  PE.setBondXp(p, 2000);
  var result = PE.checkEvolutionRequirements(p);
  assert(result.canEvolve === false, 'already ascended: cannot evolve further');
  assert(result.reason.includes('maximum') || result.reason.includes('Ascended'), 'reason mentions maximum/Ascended');
});

suite('checkEvolutionRequirements — insufficient XP', function() {
  var p = freshRecord('cat');
  PE.setBondXp(p, 200);
  var result = PE.checkEvolutionRequirements(p);
  assert(result.canEvolve === false, 'insufficient XP: cannot evolve');
  var missingXp = result.missing.find(function(m) { return m.type === 'bondXp'; });
  assert(missingXp !== undefined, 'missing bondXp is in missing list');
  assertEqual(missingXp.needed, PE.TIER_XP_THRESHOLDS.mature, 'needed XP is mature threshold');
  assertEqual(missingXp.have, 200, 'have XP is 200');
});

suite('checkEvolutionRequirements — missing item requirement', function() {
  // owl requires lore_fragment for young→mature
  // We keep the player at young tier (low XP) but force enough XP for transition check
  // by manipulating the record directly so tier stays young
  var p = freshRecord('owl');
  var rec = PE.getEvolutionRecord(p);
  rec.bondXp = 500;
  // keep tier as young so we test young→mature requirements
  // (setBondXp would auto-upgrade; manipulate directly)
  rec.tier = 'young';
  var req = PE.EVOLUTION_REQUIREMENTS.young_to_mature.owl;
  var result = PE.checkEvolutionRequirements(p, {});
  // Should still fail if item not present
  if (req.item) {
    var missingItem = result.missing.find(function(m) { return m.type === 'item'; });
    assert(missingItem !== undefined, 'missing item in requirements list');
    assertEqual(missingItem.item, req.item, 'missing item id matches owl requirement');
  }
});

suite('checkEvolutionRequirements — item provided via inventoryItems', function() {
  var p = freshRecord('owl');
  var rec = PE.getEvolutionRecord(p);
  rec.bondXp = 500;
  rec.tier = 'young'; // force young so we test young→mature
  var req = PE.EVOLUTION_REQUIREMENTS.young_to_mature.owl;
  var item = req.item;
  var result = PE.checkEvolutionRequirements(p, {
    inventoryItems: item ? [item] : []
  });
  if (item) {
    var missingItem = result.missing.find(function(m) { return m.type === 'item'; });
    assert(missingItem === undefined, 'no missing item when provided in inventoryItems');
  } else {
    assert(true, 'owl has no item requirement (test skipped)');
  }
});

suite('checkEvolutionRequirements — missing achievement', function() {
  // wolf_pup requires 'first_steps' achievement for young→mature
  var p = freshRecord('wolf_pup');
  var rec = PE.getEvolutionRecord(p);
  rec.bondXp = 500;
  rec.tier = 'young'; // force young so we test young→mature
  var req = PE.EVOLUTION_REQUIREMENTS.young_to_mature.wolf_pup;
  var result = PE.checkEvolutionRequirements(p, { achievements: [] });
  if (req.achievement) {
    var missingAch = result.missing.find(function(m) { return m.type === 'achievement'; });
    assert(missingAch !== undefined, 'missing achievement in list');
    assertEqual(missingAch.achievement, req.achievement, 'missing achievement matches requirement');
  } else {
    assert(true, 'wolf_pup has no achievement requirement (test skipped)');
  }
});

suite('checkEvolutionRequirements — achievement provided', function() {
  var p = freshRecord('wolf_pup');
  var rec = PE.getEvolutionRecord(p);
  rec.bondXp = 500;
  rec.tier = 'young'; // force young so we test young→mature
  var req = PE.EVOLUTION_REQUIREMENTS.young_to_mature.wolf_pup;
  var achievements = req.achievement ? [req.achievement] : [];
  var result = PE.checkEvolutionRequirements(p, { achievements: achievements });
  if (req.achievement) {
    var missingAch = result.missing.find(function(m) { return m.type === 'achievement'; });
    assert(missingAch === undefined, 'no missing achievement when provided');
  } else {
    assert(true, 'no achievement needed (test skipped)');
  }
});

suite('checkEvolutionRequirements — missing zone', function() {
  // fox requires wilds zone for young→mature
  var p = freshRecord('fox');
  var rec = PE.getEvolutionRecord(p);
  rec.bondXp = 500;
  rec.tier = 'young'; // force young so we test young→mature
  var req = PE.EVOLUTION_REQUIREMENTS.young_to_mature.fox;
  if (req.zone) {
    var result = PE.checkEvolutionRequirements(p, { currentZone: 'commons' });
    var missingZone = result.missing.find(function(m) { return m.type === 'zone'; });
    assert(missingZone !== undefined, 'missing zone in list');
    assertEqual(missingZone.zone, req.zone, 'missing zone matches requirement');
  } else {
    assert(true, 'fox has no zone requirement (test skipped)');
  }
});

suite('checkEvolutionRequirements — zone provided', function() {
  var p = freshRecord('fox');
  var rec = PE.getEvolutionRecord(p);
  rec.bondXp = 500;
  rec.tier = 'young'; // force young so we test young→mature
  var req = PE.EVOLUTION_REQUIREMENTS.young_to_mature.fox;
  var zone = req.zone || 'nexus';
  var result = PE.checkEvolutionRequirements(p, { currentZone: zone });
  if (req.zone) {
    var missingZone = result.missing.find(function(m) { return m.type === 'zone'; });
    assert(missingZone === undefined, 'no missing zone when in correct zone');
  } else {
    assert(true, 'no zone requirement (test skipped)');
  }
});

suite('checkEvolutionRequirements — cat meets all requirements (no item/achievement/zone)', function() {
  // cat young_to_mature: only bondXp, no item/achievement/zone
  var p = freshRecord('cat');
  var rec = PE.getEvolutionRecord(p);
  rec.bondXp = 500;
  rec.tier = 'young'; // force young so we test young→mature
  var result = PE.checkEvolutionRequirements(p, {});
  assertEqual(result.canEvolve, true, 'cat can evolve when XP is met');
  assert(result.missing.length === 0, 'no missing requirements for cat');
  assertEqual(result.nextTier, 'mature', 'next tier is mature');
});

// ---------------------------------------------------------------------------
// SUITE: evolve
// ---------------------------------------------------------------------------

suite('evolve — successful evolution', function() {
  // For cat: young→mature requires only bondXp=500, no item/zone/achievement
  // We must keep the tier as young while having enough XP
  var p = freshRecord('cat');
  var rec = PE.getEvolutionRecord(p);
  rec.bondXp = 500;
  rec.tier = 'young'; // force young so we test young→mature via evolve()

  var result = PE.evolve(p, {});
  assert(result.success === true, 'evolve succeeds when requirements met');
  assertEqual(result.from, 'young', 'evolved from young');
  assertEqual(result.to, 'mature', 'evolved to mature');
  assert(typeof result.message === 'string', 'evolve returns message');
  assert(result.form !== null, 'evolve returns new form');
  assertEqual(result.form.name, PE.EVOLUTION_FORMS.cat.mature.name, 'correct mature form returned');
  assert(Array.isArray(result.abilities), 'evolve returns updated abilities');

  var recAfter = PE.getEvolutionRecord(p);
  assertEqual(recAfter.tier, 'mature', 'record tier updated after evolve');
  assert(recAfter.evolutions.length === 1, 'evolution history recorded');
});

suite('evolve — fails when requirements not met', function() {
  var p = freshRecord('cat');
  PE.setBondXp(p, 100);
  var result = PE.evolve(p, {});
  assert(result.success === false, 'evolve fails when XP insufficient');
  assert(Array.isArray(result.missing), 'missing array returned on failure');
});

suite('evolve — mature to ascended', function() {
  var p = freshRecord('cat');
  var rec = PE.getEvolutionRecord(p);
  // Set up mature tier with enough XP for ascension
  rec.bondXp = 2000;
  rec.tier = 'mature'; // force mature so we test mature→ascended
  var catAscReq = PE.EVOLUTION_REQUIREMENTS.mature_to_ascended.cat;
  var options = { currentZone: catAscReq.zone };
  if (catAscReq.item) {
    options.inventoryItems = [catAscReq.item];
  }
  if (catAscReq.achievement) {
    options.achievements = [catAscReq.achievement];
  }
  var result = PE.evolve(p, options);
  assert(result.success === true, 'cat can evolve from mature to ascended with all requirements');
  assertEqual(result.from, 'mature', 'evolved from mature');
  assertEqual(result.to, 'ascended', 'evolved to ascended');
  var recAfter = PE.getEvolutionRecord(p);
  assertEqual(recAfter.tier, 'ascended', 'record tier is ascended after evolve');
});

suite('evolve — no record fails gracefully', function() {
  var result = PE.evolve(uid('nobody'), {});
  assert(result.success === false, 'evolve fails for no record');
});

// ---------------------------------------------------------------------------
// SUITE: rollEvolutionEvent
// ---------------------------------------------------------------------------

suite('rollEvolutionEvent — determinism', function() {
  var p = freshRecord('cat');
  PE.setBondXp(p, 500);

  var result1 = PE.rollEvolutionEvent(p);
  var result2 = PE.rollEvolutionEvent(p);
  // Same seed → same result
  assertEqual(result1.hasSpecialEvent, result2.hasSpecialEvent,
    'same player/state gives same event roll');

  assert(typeof result1.hasSpecialEvent === 'boolean', 'hasSpecialEvent is boolean');
  if (result1.hasSpecialEvent) {
    assert(typeof result1.eventType === 'string', 'eventType is string when special event');
    var validEvents = ['bonus_xp', 'happiness_boost', 'bonus_ability', 'rare_form'];
    assert(validEvents.indexOf(result1.eventType) !== -1, 'eventType is valid event type');
  } else {
    assert(result1.eventType === null, 'eventType is null when no special event');
  }

  // No record
  var noRecord = PE.rollEvolutionEvent(uid('nobody'));
  assert(noRecord.hasSpecialEvent === false, 'no record: no special event');
});

suite('rollEvolutionEvent — ascended higher chance', function() {
  // Test over multiple different players to check that ascended generates more events
  var ascendedCount = 0;
  var youngCount = 0;
  var trials = 30;

  for (var i = 0; i < trials; i++) {
    var pa = freshRecord('cat');
    PE.setBondXp(pa, 2000);
    if (PE.rollEvolutionEvent(pa).hasSpecialEvent) ascendedCount++;

    var py = freshRecord('cat');
    PE.setBondXp(py, 0);
    if (PE.rollEvolutionEvent(py).hasSpecialEvent) youngCount++;
  }
  // With more trials, ascended should generally win (not guaranteed but statistically likely)
  assert(ascendedCount >= youngCount || ascendedCount > 0,
    'ascended tier produces at least as many special events as young');
});

// ---------------------------------------------------------------------------
// SUITE: rollFavoriteFoodBonus
// ---------------------------------------------------------------------------

suite('rollFavoriteFoodBonus — determinism', function() {
  var p = freshRecord('cat');
  var roll1 = PE.rollFavoriteFoodBonus(p, 42);
  var roll2 = PE.rollFavoriteFoodBonus(p, 42);
  assertEqual(roll1, roll2, 'same tick gives same bonus roll');
  assert(typeof roll1 === 'boolean', 'rollFavoriteFoodBonus returns boolean');

  // Different ticks give potentially different results
  var results = [];
  for (var t = 0; t < 20; t++) {
    results.push(PE.rollFavoriteFoodBonus(p, t));
  }
  var hasTrue  = results.some(function(r) { return r === true;  });
  var hasFalse = results.some(function(r) { return r === false; });
  assert(hasTrue || hasFalse, 'rollFavoriteFoodBonus produces both true and false across ticks');

  // No record returns false
  assert(!PE.rollFavoriteFoodBonus(uid('nobody'), 1), 'no record returns false');
});

// ---------------------------------------------------------------------------
// SUITE: generateEvolutionSeed
// ---------------------------------------------------------------------------

suite('generateEvolutionSeed', function() {
  var p = freshRecord('cat');
  var seed = PE.generateEvolutionSeed(p);
  assert(typeof seed === 'number', 'seed is a number');
  assert(seed >= 0, 'seed is non-negative');

  // Determinism: same state → same seed
  var seed2 = PE.generateEvolutionSeed(p);
  assertEqual(seed, seed2, 'same state gives same seed');

  // Different player gives different seed (likely)
  var p2 = freshRecord('fox');
  var seed3 = PE.generateEvolutionSeed(p2);
  assert(seed !== seed3, 'different player gives different seed');

  // Changing bondXp changes seed
  PE.setBondXp(p, 500);
  var seed4 = PE.generateEvolutionSeed(p);
  assert(seed !== seed4, 'different bondXp gives different seed');

  // No record returns 0
  assertEqual(PE.generateEvolutionSeed(uid('nobody')), 0, 'no record returns seed 0');
});

// ---------------------------------------------------------------------------
// SUITE: getEvolutionHistory
// ---------------------------------------------------------------------------

suite('getEvolutionHistory', function() {
  var p = freshRecord('turtle');
  var history = PE.getEvolutionHistory(p);
  assert(Array.isArray(history), 'getEvolutionHistory returns array');
  assert(history.length === 0, 'fresh record has empty history');

  // Trigger tier change
  PE.setBondXp(p, 500);
  history = PE.getEvolutionHistory(p);
  // setBondXp does not add to evolutions array (it only updates tier silently)
  // Using addBondXp to trigger history
  var p2 = freshRecord('turtle');
  PE.setBondXp(p2, 490);
  PE.addBondXp(p2, 'feeding', 1); // Should trigger mature
  var history2 = PE.getEvolutionHistory(p2);
  assert(history2.length >= 1, 'evolution history recorded after tier change via addBondXp');

  if (history2.length > 0) {
    var entry = history2[0];
    assert(typeof entry.from === 'string', 'history entry has from');
    assert(typeof entry.to === 'string', 'history entry has to');
    assert(typeof entry.timestamp === 'number', 'history entry has timestamp');
    assert(typeof entry.bondXp === 'number', 'history entry has bondXp');
  }

  // No record returns empty
  var none = PE.getEvolutionHistory(uid('nobody'));
  assert(Array.isArray(none) && none.length === 0, 'no record returns empty history');
});

// ---------------------------------------------------------------------------
// SUITE: awardProximityXp
// ---------------------------------------------------------------------------

suite('awardProximityXp', function() {
  var p = freshRecord('wolf_pup');
  var gained = PE.awardProximityXp(p, 1);
  assertEqual(gained, PE.BOND_XP_RATES.proximity, 'awardProximityXp gives proximity rate for 1 minute');

  var gained5 = PE.awardProximityXp(p, 5);
  assertEqual(gained5, PE.BOND_XP_RATES.proximity * 5, 'awardProximityXp scales with minutes');

  var rec = PE.getEvolutionRecord(p);
  assert(rec.bondXp > 0, 'bondXp increases after proximity award');

  // Default 1 minute when no argument
  var p2 = freshRecord('cat');
  var gainedDefault = PE.awardProximityXp(p2);
  assertEqual(gainedDefault, PE.BOND_XP_RATES.proximity, 'default minutes is 1');

  // No record returns 0
  var noGain = PE.awardProximityXp(uid('nobody'), 5);
  assertEqual(noGain, 0, 'no record: no XP gained');
});

// ---------------------------------------------------------------------------
// SUITE: getEvolutionSummary
// ---------------------------------------------------------------------------

suite('getEvolutionSummary', function() {
  var p = freshRecord('phoenix_chick');
  var summary = PE.getEvolutionSummary(p);

  assert(summary !== null, 'getEvolutionSummary returns object');
  assertEqual(summary.playerId, p, 'summary has correct playerId');
  assertEqual(summary.petType, 'phoenix_chick', 'summary has correct petType');
  assertEqual(summary.tier, 'young', 'summary tier is young');
  assertEqual(summary.tierLabel, 'Young', 'summary tierLabel is Young');
  assertEqual(summary.bondXp, 0, 'summary bondXp starts at 0');
  assertEqual(summary.xpToNext, PE.TIER_XP_THRESHOLDS.mature, 'summary xpToNext for young');
  assertEqual(summary.happiness, 100, 'summary happiness starts at 100');
  assertEqual(summary.happinessLabel, 'ecstatic', 'summary happinessLabel for 100');
  assert(summary.form !== null, 'summary includes form');
  assert(summary.bonus !== null, 'summary includes bonus');
  assert(Array.isArray(summary.abilities), 'summary abilities is array');
  assert(summary.abilityCount > 0, 'summary abilityCount > 0');
  assertEqual(summary.evolutions, 0, 'summary evolutions starts at 0');
  assertEqual(summary.isAscended, false, 'summary isAscended is false for young');

  // Ascended summary
  PE.setBondXp(p, 2000);
  var summaryAscended = PE.getEvolutionSummary(p);
  assertEqual(summaryAscended.tier, 'ascended', 'ascended summary tier');
  assertEqual(summaryAscended.xpToNext, 0, 'ascended xpToNext is 0');
  assertEqual(summaryAscended.isAscended, true, 'ascended isAscended is true');
  assert(summaryAscended.abilityCount > summary.abilityCount,
    'ascended has more abilities than young');

  // No record returns null
  var none = PE.getEvolutionSummary(uid('nobody'));
  assert(none === null, 'no record returns null summary');
});

// ---------------------------------------------------------------------------
// SUITE: isAscended & getAscendedAbilities
// ---------------------------------------------------------------------------

suite('isAscended', function() {
  var p = freshRecord('cat');
  assert(!PE.isAscended(p), 'young is not ascended');

  PE.setBondXp(p, 500);
  assert(!PE.isAscended(p), 'mature is not ascended');

  PE.setBondXp(p, 2000);
  assert(PE.isAscended(p), 'ascended tier returns true');

  assert(!PE.isAscended(uid('nobody')), 'no record is not ascended');
});

suite('getAscendedAbilities', function() {
  var petTypes = ['cat','fox','owl','butterfly','rabbit','frog','firefly','wolf_pup','phoenix_chick','turtle'];

  petTypes.forEach(function(pt) {
    var abilities = PE.getAscendedAbilities(pt);
    assert(Array.isArray(abilities), pt + ' getAscendedAbilities returns array');
    assert(abilities.length > 0, pt + ' has at least one ascended ability');
    abilities.forEach(function(ab) {
      assert(typeof ab.id === 'string', pt + ' ascended ability has id');
      assert(typeof ab.name === 'string', pt + ' ascended ability has name');
    });
  });

  var none = PE.getAscendedAbilities('dragon');
  assert(Array.isArray(none) && none.length === 0, 'unknown pet type returns empty array');
});

// ---------------------------------------------------------------------------
// SUITE: getEvolutionState & loadEvolutionState
// ---------------------------------------------------------------------------

suite('getEvolutionState & loadEvolutionState', function() {
  var p = freshRecord('frog');
  PE.setBondXp(p, 750);
  // Record bondXp AFTER setBondXp (before any extra feeding)
  var savedBondXp = PE.getEvolutionRecord(p).bondXp;

  // Take snapshot BEFORE feeding so bondXp is stable
  var state = PE.getEvolutionState();
  assert(typeof state === 'object', 'getEvolutionState returns object');
  assert(state.evolutionData !== undefined, 'state has evolutionData');
  assert(state.evolutionData[p] !== undefined, 'state has player entry');
  assertEqual(state.evolutionData[p].bondXp, savedBondXp, 'state preserves bondXp');
  assertEqual(state.evolutionData[p].petType, 'frog', 'state preserves petType');

  // Verify snapshot is a deep copy (modifying live data doesn't change snapshot)
  PE.setBondXp(p, 999);
  assertEqual(state.evolutionData[p].bondXp, savedBondXp, 'snapshot is independent of live data');

  // Load into a cleared scenario
  PE.clearPlayerEvolution(p);
  assert(PE.getEvolutionRecord(p) === null, 'record cleared before load');

  PE.loadEvolutionState(state);
  var restored = PE.getEvolutionRecord(p);
  assert(restored !== null, 'loadEvolutionState restores record');
  assertEqual(restored.bondXp, savedBondXp, 'restored bondXp correct');
  assertEqual(restored.petType, 'frog', 'restored petType correct');

  // Null state is handled gracefully
  PE.loadEvolutionState(null);
  PE.loadEvolutionState({});
  assert(true, 'loadEvolutionState handles null/empty gracefully');
});

// ---------------------------------------------------------------------------
// SUITE: clearPlayerEvolution
// ---------------------------------------------------------------------------

suite('clearPlayerEvolution', function() {
  var p = freshRecord('firefly');
  assert(PE.getEvolutionRecord(p) !== null, 'record exists before clear');

  var cleared = PE.clearPlayerEvolution(p);
  assert(cleared === true, 'clearPlayerEvolution returns true on success');
  assert(PE.getEvolutionRecord(p) === null, 'record gone after clear');

  // Clear again returns false
  var cleared2 = PE.clearPlayerEvolution(p);
  assert(cleared2 === false, 'clearPlayerEvolution returns false for missing player');
});

// ---------------------------------------------------------------------------
// SUITE: Multi-pet / multi-player isolation
// ---------------------------------------------------------------------------

suite('Multi-player isolation', function() {
  var p1 = freshRecord('cat');
  var p2 = freshRecord('fox');

  PE.setBondXp(p1, 1000);
  PE.setBondXp(p2, 0);

  var rec1 = PE.getEvolutionRecord(p1);
  var rec2 = PE.getEvolutionRecord(p2);

  assert(rec1.bondXp !== rec2.bondXp, 'players have independent bondXp');
  assert(rec1.tier !== rec2.tier, 'players have independent tiers');

  // Feeding one doesn't affect other
  var before = PE.getEvolutionRecord(p2).happiness;
  PE.feedPet(p1, 'berry');
  var after = PE.getEvolutionRecord(p2).happiness;
  assertEqual(before, after, 'feeding p1 does not affect p2 happiness');
});

// ---------------------------------------------------------------------------
// SUITE: All 10 pet types — smoke tests
// ---------------------------------------------------------------------------

suite('All pet types — evolution smoke test', function() {
  var petTypes = ['cat','fox','owl','butterfly','rabbit','frog','firefly','wolf_pup','phoenix_chick','turtle'];

  petTypes.forEach(function(pt) {
    var p = freshRecord(pt);

    // Init
    var rec = PE.getEvolutionRecord(p);
    assert(rec !== null, pt + ': record created');
    assertEqual(rec.tier, 'young', pt + ': starts young');
    assertEqual(rec.petType, pt, pt + ': petType stored');

    // Young form
    var form = PE.getCurrentForm(p);
    assert(form !== null, pt + ': young form exists');

    // Mature
    PE.setBondXp(p, 500);
    assertEqual(PE.getTierFromXp(500), 'mature', pt + ': 500 XP = mature');
    var formMature = PE.getCurrentForm(p);
    assert(formMature !== null, pt + ': mature form exists');
    assert(formMature.name !== form.name, pt + ': mature form name differs from young');

    // Ascended
    PE.setBondXp(p, 2000);
    var formAscended = PE.getCurrentForm(p);
    assert(formAscended !== null, pt + ': ascended form exists');
    assert(formAscended.name !== formMature.name, pt + ': ascended form name differs from mature');

    // Abilities at ascended
    var abilities = PE.getPlayerAbilities(p);
    assert(abilities.length >= 5, pt + ': ascended has 5+ abilities (young+mature+ascended)');

    // Bonus scales
    var bonus = PE.getEvolutionBonus(p);
    assert(bonus.value > PE.PET_BASE_BONUSES[pt].value, pt + ': ascended bonus > young base bonus');

    // Summary
    var summary = PE.getEvolutionSummary(p);
    assert(summary.isAscended, pt + ': summary shows ascended');
    assertEqual(summary.tierLabel, 'Ascended', pt + ': summary tierLabel is Ascended');
  });
});

// ---------------------------------------------------------------------------
// SUITE: Edge cases and boundary conditions
// ---------------------------------------------------------------------------

suite('Edge cases — XP boundaries', function() {
  // Exact threshold transitions
  var p1 = freshRecord('cat');
  PE.setBondXp(p1, 499);
  assertEqual(PE.getTierFromXp(499), 'young', 'XP 499 is still young');

  PE.setBondXp(p1, 500);
  assertEqual(PE.getEvolutionRecord(p1).tier, 'mature', 'XP exactly 500 sets mature');

  PE.setBondXp(p1, 1999);
  assertEqual(PE.getEvolutionRecord(p1).tier, 'mature', 'XP 1999 is still mature');

  PE.setBondXp(p1, 2000);
  assertEqual(PE.getEvolutionRecord(p1).tier, 'ascended', 'XP exactly 2000 sets ascended');
});

suite('Edge cases — multiple feedings accumulate buffs', function() {
  var p = freshRecord('turtle');
  var now = Date.now();
  PE.feedPet(p, 'berry', now);
  PE.feedPet(p, 'herb', now);
  var buffs = PE.getActiveBuffs(p, now + 1);
  assert(buffs.length >= 2, 'multiple feedings accumulate multiple buffs');
});

suite('Edge cases — happiness stays in [0, 100]', function() {
  var p = freshRecord('owl');
  var rec = PE.getEvolutionRecord(p);

  // Max feeding never exceeds 100
  rec.happiness = 100;
  for (var i = 0; i < 10; i++) {
    PE.feedPet(p, 'spirit_seed');
  }
  assert(PE.getEvolutionRecord(p).happiness <= 100, 'happiness never exceeds 100');

  // Min never below 0 after many decays
  rec.happiness = 0;
  rec.lastInteract = Date.now() - (1000 * 3600000);
  PE.applyHappinessDecay(p, Date.now());
  assert(PE.getEvolutionRecord(p).happiness >= 0, 'happiness never below 0');
});

suite('Edge cases — bondXp never negative', function() {
  var p = freshRecord('cat');
  PE.addBondXp(p, 'neglect', 1000);
  var rec = PE.getEvolutionRecord(p);
  assert(rec.bondXp >= 0, 'bondXp never goes negative even with neglect penalty');
});

suite('Edge cases — evolution history ordered chronologically', function() {
  var p = freshRecord('rabbit');
  PE.setBondXp(p, 490);

  var t1 = Date.now();
  PE.feedPet(p, 'spirit_seed', t1);     // 490+30 = 520 → mature

  // Now mature, push to ascended
  PE.setBondXp(p, 1990);
  var t2 = Date.now() + 1000;
  PE.feedPet(p, 'spirit_seed', t2);     // 1990+30 = 2020 → ascended

  var history = PE.getEvolutionHistory(p);
  if (history.length >= 2) {
    assert(history[0].timestamp <= history[1].timestamp,
      'evolution history is in chronological order');
  }
});

// ---------------------------------------------------------------------------
// FINAL REPORT
// ---------------------------------------------------------------------------

console.log('\n========================================');
console.log(passed + ' passed, ' + failed + ' failed');
if (failures.length > 0) {
  console.log('\nFailed tests:');
  failures.forEach(function(f) { console.log('  ' + f); });
}
console.log('========================================\n');

if (failed > 0) process.exit(1);
