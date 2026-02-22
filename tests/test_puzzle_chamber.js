/**
 * tests/test_puzzle_chamber.js
 * Comprehensive tests for the ZION Puzzle Chamber Engine
 * 200+ tests covering all features: generation, session management, hints,
 * timer, leaderboards, co-op, achievements, daily rotation, all 6 archetypes.
 *
 * Run with: node tests/test_puzzle_chamber.js
 */

'use strict';

var PC = require('../src/js/puzzle_chamber');

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

function assertDeep(a, b, msg) {
  assert(JSON.stringify(a) === JSON.stringify(b), msg + ' (expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a) + ')');
}

function assertExists(val, msg) {
  assert(val !== null && val !== undefined, msg);
}

function assertType(val, type, msg) {
  assert(typeof val === type, msg + ' (got ' + typeof val + ')');
}

function assertRange(val, min, max, msg) {
  assert(val >= min && val <= max, msg + ' (got ' + val + ', expected ' + min + '-' + max + ')');
}

// ============================================================================
// HELPERS
// ============================================================================

var _idSeq = 0;
function uid() { return 'player_' + (++_idSeq); }

// Small sleep simulation (just advances time via fake solve times)
function freshPC() {
  PC.resetAll();
}

// ============================================================================
// SUITE 1: MODULE EXPORTS
// ============================================================================

suite('Module Exports', function() {

  assert(typeof PC === 'object' && PC !== null, 'PC module is an object');

  // Constants
  assert(Array.isArray(PC.PUZZLE_ARCHETYPES), 'PUZZLE_ARCHETYPES is an Array');
  assert(typeof PC.DIFFICULTY_TIERS === 'object', 'DIFFICULTY_TIERS is an object');
  assert(typeof PC.TIME_LIMITS === 'object', 'TIME_LIMITS is an object');
  assert(Array.isArray(PC.SPEED_BONUS_THRESHOLDS), 'SPEED_BONUS_THRESHOLDS is Array');
  assert(Array.isArray(PC.RIDDLE_BANK), 'RIDDLE_BANK is Array');
  assert(Array.isArray(PC.CIPHER_WORDS), 'CIPHER_WORDS is Array');
  assert(Array.isArray(PC.PATTERN_COLORS), 'PATTERN_COLORS is Array');
  assert(Array.isArray(PC.PATTERN_SHAPES), 'PATTERN_SHAPES is Array');
  assert(Array.isArray(PC.LOGIC_GRID_CATEGORIES), 'LOGIC_GRID_CATEGORIES is Array');
  assert(Array.isArray(PC.SEQUENCE_GENERATORS), 'SEQUENCE_GENERATORS is Array');
  assert(Array.isArray(PC.PUZZLE_ACHIEVEMENTS), 'PUZZLE_ACHIEVEMENTS is Array');

  // Functions — generation
  assert(typeof PC.generatePuzzle === 'function', 'generatePuzzle is a function');
  assert(typeof PC.generateSequencePuzzle === 'function', 'generateSequencePuzzle is function');
  assert(typeof PC.generateLogicGridPuzzle === 'function', 'generateLogicGridPuzzle is function');
  assert(typeof PC.generateRiddlePuzzle === 'function', 'generateRiddlePuzzle is function');
  assert(typeof PC.generatePatternPuzzle === 'function', 'generatePatternPuzzle is function');
  assert(typeof PC.generateCipherPuzzle === 'function', 'generateCipherPuzzle is function');
  assert(typeof PC.generateCollaborativePuzzle === 'function', 'generateCollaborativePuzzle is function');

  // Functions — daily
  assert(typeof PC.getDailyPuzzle === 'function', 'getDailyPuzzle is function');
  assert(typeof PC.getDayNumber === 'function', 'getDayNumber is function');
  assert(typeof PC.getWeeklySchedule === 'function', 'getWeeklySchedule is function');

  // Functions — sessions
  assert(typeof PC.startSession === 'function', 'startSession is function');
  assert(typeof PC.requestHint === 'function', 'requestHint is function');
  assert(typeof PC.submitAnswer === 'function', 'submitAnswer is function');
  assert(typeof PC.getSession === 'function', 'getSession is function');
  assert(typeof PC.isSessionExpired === 'function', 'isSessionExpired is function');

  // Functions — leaderboards
  assert(typeof PC.updateLeaderboard === 'function', 'updateLeaderboard is function');
  assert(typeof PC.getLeaderboard === 'function', 'getLeaderboard is function');
  assert(typeof PC.getAllLeaderboards === 'function', 'getAllLeaderboards is function');
  assert(typeof PC.clearLeaderboard === 'function', 'clearLeaderboard is function');
  assert(typeof PC.getPlayerBest === 'function', 'getPlayerBest is function');

  // Functions — co-op
  assert(typeof PC.createCoopRoom === 'function', 'createCoopRoom is function');
  assert(typeof PC.joinCoopRoom === 'function', 'joinCoopRoom is function');
  assert(typeof PC.leaveCoopRoom === 'function', 'leaveCoopRoom is function');
  assert(typeof PC.startCoopRoom === 'function', 'startCoopRoom is function');
  assert(typeof PC.submitCoopStage === 'function', 'submitCoopStage is function');
  assert(typeof PC.addCoopChat === 'function', 'addCoopChat is function');
  assert(typeof PC.getCoopRoom === 'function', 'getCoopRoom is function');
  assert(typeof PC.listCoopRooms === 'function', 'listCoopRooms is function');

  // Functions — achievements & stats
  assert(typeof PC.checkAchievements === 'function', 'checkAchievements is function');
  assert(typeof PC.getPlayerStats === 'function', 'getPlayerStats is function');
  assert(typeof PC.recordSolve === 'function', 'recordSolve is function');

  // Functions — helpers
  assert(typeof PC.calculateSpeedBonus === 'function', 'calculateSpeedBonus is function');
  assert(typeof PC.getPuzzleCatalog === 'function', 'getPuzzleCatalog is function');
  assert(typeof PC.mulberry32 === 'function', 'mulberry32 is function');
  assert(typeof PC.hashString === 'function', 'hashString is function');
  assert(typeof PC.resetAll === 'function', 'resetAll is function');
});

// ============================================================================
// SUITE 2: CONSTANTS VALIDATION
// ============================================================================

suite('Constants Validation', function() {

  // Puzzle archetypes
  assertEqual(PC.PUZZLE_ARCHETYPES.length, 6, 'There are exactly 6 puzzle archetypes');
  assert(PC.PUZZLE_ARCHETYPES.indexOf('sequence') !== -1, 'sequence archetype exists');
  assert(PC.PUZZLE_ARCHETYPES.indexOf('logic_grid') !== -1, 'logic_grid archetype exists');
  assert(PC.PUZZLE_ARCHETYPES.indexOf('riddle') !== -1, 'riddle archetype exists');
  assert(PC.PUZZLE_ARCHETYPES.indexOf('pattern') !== -1, 'pattern archetype exists');
  assert(PC.PUZZLE_ARCHETYPES.indexOf('cipher') !== -1, 'cipher archetype exists');
  assert(PC.PUZZLE_ARCHETYPES.indexOf('collaborative') !== -1, 'collaborative archetype exists');

  // Difficulty tiers
  for (var t = 1; t <= 5; t++) {
    var tier = PC.DIFFICULTY_TIERS[t];
    assertExists(tier, 'DIFFICULTY_TIERS[' + t + '] exists');
    assertType(tier.label, 'string', 'tier ' + t + ' label is string');
    assert(tier.sparkBase > 0, 'tier ' + t + ' sparkBase > 0');
    assert(tier.hints >= 1, 'tier ' + t + ' hints >= 1');
    assert(tier.complexity >= 1, 'tier ' + t + ' complexity >= 1');
    assert(tier.timeBonus >= 0, 'tier ' + t + ' timeBonus >= 0');
  }

  // Spark rewards scale with tier
  assert(PC.DIFFICULTY_TIERS[1].sparkBase < PC.DIFFICULTY_TIERS[5].sparkBase, 'sparkBase scales with tier');
  assertEqual(PC.DIFFICULTY_TIERS[1].sparkBase, 10, 'Tier 1 sparkBase is 10');
  assertEqual(PC.DIFFICULTY_TIERS[5].sparkBase, 100, 'Tier 5 sparkBase is 100');

  // Time limits
  for (var t2 = 1; t2 <= 5; t2++) {
    assert(PC.TIME_LIMITS[t2] > 0, 'TIME_LIMITS[' + t2 + '] > 0');
  }
  assert(PC.TIME_LIMITS[1] > PC.TIME_LIMITS[5], 'Lower tier has more time than higher tier');

  // Speed bonus thresholds
  assert(PC.SPEED_BONUS_THRESHOLDS.length >= 3, 'At least 3 speed bonus thresholds');
  PC.SPEED_BONUS_THRESHOLDS.forEach(function(t, i) {
    assert(typeof t.fraction === 'number', 'threshold ' + i + ' fraction is number');
    assert(typeof t.multiplier === 'number', 'threshold ' + i + ' multiplier is number');
    assert(typeof t.label === 'string', 'threshold ' + i + ' label is string');
  });

  // Riddle bank
  assert(PC.RIDDLE_BANK.length >= 20, 'RIDDLE_BANK has at least 20 riddles');
  PC.RIDDLE_BANK.forEach(function(r) {
    assertExists(r.id, 'riddle has id');
    assertType(r.question, 'string', 'riddle has question string');
    assertType(r.answer, 'string', 'riddle has answer string');
    assert(Array.isArray(r.hints), 'riddle has hints array');
    assertRange(r.tier, 1, 5, 'riddle tier in range');
  });

  // Cipher words
  assert(PC.CIPHER_WORDS.length >= 10, 'CIPHER_WORDS has at least 10 words');
  PC.CIPHER_WORDS.forEach(function(w) {
    assertType(w, 'string', 'cipher word is string');
    assert(w.length >= 4, 'cipher word length >= 4');
  });

  // Pattern colors and shapes
  assert(PC.PATTERN_COLORS.length >= 4, 'PATTERN_COLORS has at least 4 colors');
  assert(PC.PATTERN_SHAPES.length >= 4, 'PATTERN_SHAPES has at least 4 shapes');

  // Logic grid categories
  assert(PC.LOGIC_GRID_CATEGORIES.length >= 4, 'LOGIC_GRID_CATEGORIES has at least 4 categories');
  PC.LOGIC_GRID_CATEGORIES.forEach(function(cat, i) {
    assertType(cat.name, 'string', 'category ' + i + ' has name');
    assert(Array.isArray(cat.values), 'category ' + i + ' has values array');
    assert(cat.values.length >= 4, 'category ' + i + ' has at least 4 values');
  });

  // Co-op limits
  assert(PC.COOP_MAX_PLAYERS >= 2, 'COOP_MAX_PLAYERS >= 2');
  assert(PC.COOP_MIN_PLAYERS >= 2, 'COOP_MIN_PLAYERS >= 2');
  assert(PC.COOP_MAX_PLAYERS >= PC.COOP_MIN_PLAYERS, 'max >= min players');
  assert(PC.LEADERBOARD_MAX_ENTRIES >= 5, 'LEADERBOARD_MAX_ENTRIES >= 5');
  assert(PC.HINT_COST_FRACTION > 0 && PC.HINT_COST_FRACTION < 1, 'HINT_COST_FRACTION in (0,1)');
});

// ============================================================================
// SUITE 3: MULBERRY32 PRNG & HASH
// ============================================================================

suite('PRNG & Hash Functions', function() {

  var rng = PC.mulberry32(42);
  assert(typeof rng === 'function', 'mulberry32 returns a function');

  var v1 = rng();
  assert(typeof v1 === 'number', 'rng returns number');
  assert(v1 >= 0 && v1 < 1, 'rng output in [0,1)');

  // Deterministic
  var rng2 = PC.mulberry32(42);
  assertEqual(rng2(), v1, 'Same seed produces same first value');

  // Different seeds produce different values
  var rng3 = PC.mulberry32(43);
  var v3 = rng3();
  assert(v3 !== v1, 'Different seeds produce different values');

  // Hash function
  var h1 = PC.hashString('hello');
  var h2 = PC.hashString('hello');
  var h3 = PC.hashString('world');
  assertType(h1, 'number', 'hashString returns number');
  assertEqual(h1, h2, 'hashString is deterministic');
  assert(h1 !== h3, 'Different strings hash differently');
  assert(h1 >= 0, 'hashString output is non-negative');

  // Empty string hash
  var h4 = PC.hashString('');
  assertType(h4, 'number', 'hashString of empty string is a number');
});

// ============================================================================
// SUITE 4: SEQUENCE PUZZLE
// ============================================================================

suite('Sequence Puzzle', function() {

  for (var t = 1; t <= 5; t++) {
    (function(tier) {
      var p = PC.generateSequencePuzzle(12345, tier);
      assertExists(p, 'sequence puzzle generated for tier ' + tier);
      assertEqual(p.archetype, 'sequence', 'archetype is sequence for tier ' + tier);
      assertEqual(p.tier, tier, 'tier matches for tier ' + tier);
      assertType(p.title, 'string', 'sequence puzzle has title for tier ' + tier);
      assertType(p.description, 'string', 'sequence puzzle has description for tier ' + tier);
      assertExists(p.data, 'sequence puzzle has data for tier ' + tier);
      assert(Array.isArray(p.data.visible), 'sequence puzzle data.visible is array for tier ' + tier);
      assert(p.data.visible.length >= 4, 'sequence visible has at least 4 elements for tier ' + tier);
      assert(typeof p.data.answer === 'number', 'sequence answer is number for tier ' + tier);
      assert(Array.isArray(p.hints), 'sequence puzzle has hints for tier ' + tier);
      assert(typeof p.validate === 'function', 'sequence puzzle has validate fn for tier ' + tier);
      assertEqual(p.sparkReward, PC.DIFFICULTY_TIERS[tier].sparkBase, 'sequence sparkReward matches tier for tier ' + tier);
      assertEqual(p.timeLimit, PC.TIME_LIMITS[tier], 'sequence timeLimit matches tier for tier ' + tier);
    })(t);
  }

  // Validation
  var p = PC.generateSequencePuzzle(99999, 1);
  assert(p.validate(p.data.answer), 'validate returns true for correct answer');
  assert(!p.validate(p.data.answer + 999), 'validate returns false for wrong answer');
  assert(!p.validate('banana'), 'validate returns false for non-numeric input');

  // Determinism
  var p2a = PC.generateSequencePuzzle(777, 3);
  var p2b = PC.generateSequencePuzzle(777, 3);
  assertDeep(p2a.data.visible, p2b.data.visible, 'same seed+tier produces same visible sequence');
  assertEqual(p2a.data.answer, p2b.data.answer, 'same seed+tier produces same answer');

  // Different seeds produce different puzzles
  var p3a = PC.generateSequencePuzzle(1, 2);
  var p3b = PC.generateSequencePuzzle(2, 2);
  assert(JSON.stringify(p3a.data.visible) !== JSON.stringify(p3b.data.visible), 'different seeds produce different sequences');

  // Validate accepts string-form number
  var p4 = PC.generateSequencePuzzle(555, 1);
  assert(p4.validate(String(p4.data.answer)), 'validate accepts string-form of correct answer');
});

// ============================================================================
// SUITE 5: LOGIC GRID PUZZLE
// ============================================================================

suite('Logic Grid Puzzle', function() {

  for (var t = 1; t <= 5; t++) {
    (function(tier) {
      var p = PC.generateLogicGridPuzzle(54321, tier);
      assertExists(p, 'logic_grid puzzle generated for tier ' + tier);
      assertEqual(p.archetype, 'logic_grid', 'archetype is logic_grid for tier ' + tier);
      assertEqual(p.tier, tier, 'tier matches for tier ' + tier);
      assertExists(p.data, 'logic_grid has data for tier ' + tier);
      assert(Array.isArray(p.data.rows), 'logic_grid has rows array for tier ' + tier);
      assert(Array.isArray(p.data.cols), 'logic_grid has cols array for tier ' + tier);
      assert(Array.isArray(p.data.clues), 'logic_grid has clues array for tier ' + tier);
      assertType(p.data.rowCategory, 'string', 'logic_grid has rowCategory for tier ' + tier);
      assertType(p.data.colCategory, 'string', 'logic_grid has colCategory for tier ' + tier);
      assertType(p.data.solution, 'object', 'logic_grid has solution for tier ' + tier);
      assert(typeof p.validate === 'function', 'logic_grid has validate fn for tier ' + tier);
    })(t);
  }

  // Validation
  var p = PC.generateLogicGridPuzzle(11111, 2);
  assert(p.validate(p.data.solution), 'validate returns true for correct solution');
  assert(!p.validate({}), 'validate returns false for empty object');
  assert(!p.validate(null), 'validate returns false for null');
  assert(!p.validate('string'), 'validate returns false for string input');

  // Wrong solution (flip two values)
  var sol = p.data.solution;
  var rows = Object.keys(sol);
  if (rows.length >= 2) {
    var wrong = {};
    for (var k in sol) wrong[k] = sol[k];
    var tmp = wrong[rows[0]]; wrong[rows[0]] = wrong[rows[1]]; wrong[rows[1]] = tmp;
    assert(!p.validate(wrong), 'validate returns false for swapped solution');
  }

  // Solution is a valid bijection (no duplicate values)
  var vals = Object.values(p.data.solution);
  var uniqueVals = vals.filter(function(v, i) { return vals.indexOf(v) === i; });
  assertEqual(vals.length, uniqueVals.length, 'logic_grid solution has no duplicate mappings');

  // Determinism
  var pa = PC.generateLogicGridPuzzle(42, 3);
  var pb = PC.generateLogicGridPuzzle(42, 3);
  assertDeep(pa.data.rows, pb.data.rows, 'same seed produces same rows');
  assertDeep(pa.data.cols, pb.data.cols, 'same seed produces same cols');
});

// ============================================================================
// SUITE 6: RIDDLE PUZZLE
// ============================================================================

suite('Riddle Puzzle', function() {

  for (var t = 1; t <= 5; t++) {
    (function(tier) {
      var p = PC.generateRiddlePuzzle(11111 + tier, tier);
      assertExists(p, 'riddle puzzle generated for tier ' + tier);
      assertEqual(p.archetype, 'riddle', 'archetype is riddle for tier ' + tier);
      assertEqual(p.tier, tier, 'tier matches for tier ' + tier);
      assertType(p.data.question, 'string', 'riddle has question for tier ' + tier);
      assert(p.data.question.length > 0, 'riddle question is non-empty for tier ' + tier);
      assert(Array.isArray(p.hints), 'riddle has hints array for tier ' + tier);
      assert(p.hints.length >= 1, 'riddle has at least 1 hint for tier ' + tier);
      assert(typeof p.validate === 'function', 'riddle has validate fn for tier ' + tier);
      assertType(p.answer, 'string', 'riddle answer is a string for tier ' + tier);
    })(t);
  }

  // Validation - correct answer
  var p = PC.generateRiddlePuzzle(200, 1);
  assert(p.validate(p.answer), 'riddle validate accepts correct answer');
  assert(p.validate(p.answer.toUpperCase()), 'riddle validate is case-insensitive');
  assert(!p.validate('zzzzxxx'), 'riddle validate rejects clearly wrong answer');

  // Riddle bank has tier coverage
  var tiersInBank = PC.RIDDLE_BANK.map(function(r) { return r.tier; });
  for (var t2 = 1; t2 <= 5; t2++) {
    assert(tiersInBank.indexOf(t2) !== -1, 'RIDDLE_BANK has riddles for tier ' + t2);
  }

  // All riddles have unique IDs
  var ids = PC.RIDDLE_BANK.map(function(r) { return r.id; });
  var uniqueIds = ids.filter(function(id, i) { return ids.indexOf(id) === i; });
  assertEqual(ids.length, uniqueIds.length, 'all riddles have unique IDs');

  // Determinism
  var pa = PC.generateRiddlePuzzle(9999, 2);
  var pb = PC.generateRiddlePuzzle(9999, 2);
  assertEqual(pa.data.question, pb.data.question, 'same seed produces same riddle question');
  assertEqual(pa.answer, pb.answer, 'same seed produces same riddle answer');
});

// ============================================================================
// SUITE 7: PATTERN PUZZLE
// ============================================================================

suite('Pattern Puzzle', function() {

  for (var t = 1; t <= 5; t++) {
    (function(tier) {
      var p = PC.generatePatternPuzzle(33333 + tier, tier);
      assertExists(p, 'pattern puzzle generated for tier ' + tier);
      assertEqual(p.archetype, 'pattern', 'archetype is pattern for tier ' + tier);
      assertEqual(p.tier, tier, 'tier matches for tier ' + tier);
      assertExists(p.data, 'pattern has data for tier ' + tier);
      assert(Array.isArray(p.data.sequence), 'pattern data.sequence is array for tier ' + tier);
      assert(p.data.sequence.length >= 3, 'pattern sequence has at least 3 elements for tier ' + tier);
      assertType(p.data.period, 'number', 'pattern has period for tier ' + tier);
      assert(Array.isArray(p.data.colors), 'pattern has colors array for tier ' + tier);
      assert(Array.isArray(p.data.shapes), 'pattern has shapes array for tier ' + tier);
      assert(typeof p.validate === 'function', 'pattern has validate fn for tier ' + tier);
    })(t);
  }

  // Validation
  var p = PC.generatePatternPuzzle(12321, 2);
  assert(p.validate(p.answer), 'pattern validate returns true for correct answer');
  assert(!p.validate({ color: 'invalid_color', shape: 'invalid_shape' }), 'pattern validate rejects wrong values');
  assert(!p.validate(null), 'pattern validate rejects null');
  assert(!p.validate('string'), 'pattern validate rejects string');
  assert(!p.validate({}), 'pattern validate rejects empty object');

  // Answer elements are from known colors/shapes
  for (var t2 = 1; t2 <= 5; t2++) {
    var pp = PC.generatePatternPuzzle(77777, t2);
    var ans = pp.answer;
    assert(PC.PATTERN_COLORS.indexOf(ans.color) !== -1, 'pattern answer color is in PATTERN_COLORS for tier ' + t2);
    assert(PC.PATTERN_SHAPES.indexOf(ans.shape) !== -1, 'pattern answer shape is in PATTERN_SHAPES for tier ' + t2);
  }

  // Sequence elements use valid colors/shapes
  var p2 = PC.generatePatternPuzzle(55555, 3);
  p2.data.sequence.forEach(function(item, i) {
    assert(PC.PATTERN_COLORS.indexOf(item.color) !== -1, 'sequence[' + i + '] color valid');
    assert(PC.PATTERN_SHAPES.indexOf(item.shape) !== -1, 'sequence[' + i + '] shape valid');
  });

  // Determinism
  var pa = PC.generatePatternPuzzle(123, 4);
  var pb = PC.generatePatternPuzzle(123, 4);
  assertDeep(pa.answer, pb.answer, 'same seed produces same pattern answer');
});

// ============================================================================
// SUITE 8: CIPHER PUZZLE
// ============================================================================

suite('Cipher Puzzle', function() {

  for (var t = 1; t <= 5; t++) {
    (function(tier) {
      var p = PC.generateCipherPuzzle(44444 + tier, tier);
      assertExists(p, 'cipher puzzle generated for tier ' + tier);
      assertEqual(p.archetype, 'cipher', 'archetype is cipher for tier ' + tier);
      assertEqual(p.tier, tier, 'tier matches for tier ' + tier);
      assertType(p.data.ciphertext, 'string', 'cipher has ciphertext string for tier ' + tier);
      assert(p.data.ciphertext.length > 0, 'ciphertext is non-empty for tier ' + tier);
      assertType(p.data.cipherType, 'string', 'cipher has cipherType for tier ' + tier);
      assert(p.data.alphabet === 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'cipher has full alphabet for tier ' + tier);
      assert(typeof p.validate === 'function', 'cipher has validate fn for tier ' + tier);
      assertType(p.answer, 'string', 'cipher answer is a string for tier ' + tier);
    })(t);
  }

  // Validation
  var p = PC.generateCipherPuzzle(55555, 1);
  assert(p.validate(p.answer), 'cipher validate returns true for correct answer');
  assert(p.validate(p.answer.toLowerCase()), 'cipher validate is case-insensitive');
  assert(!p.validate('WRONGANSWER'), 'cipher validate rejects wrong answer');

  // Caesar cipher tiers 1-2
  var pc1 = PC.generateCipherPuzzle(100, 1);
  var pc2 = PC.generateCipherPuzzle(200, 2);
  assertEqual(pc1.data.cipherType, 'caesar', 'tier 1 uses caesar cipher');
  assertEqual(pc2.data.cipherType, 'caesar', 'tier 2 uses caesar cipher');

  // Atbash for tier 3-4
  var pc3 = PC.generateCipherPuzzle(300, 3);
  var pc4 = PC.generateCipherPuzzle(400, 4);
  assertEqual(pc3.data.cipherType, 'atbash', 'tier 3 uses atbash cipher');
  assertEqual(pc4.data.cipherType, 'atbash', 'tier 4 uses atbash cipher');

  // Substitution for tier 5
  var pc5 = PC.generateCipherPuzzle(500, 5);
  assertEqual(pc5.data.cipherType, 'substitution', 'tier 5 uses substitution cipher');

  // Caesar: ciphertext is different from plaintext (shift != 0)
  assert(pc1.data.ciphertext !== pc1.answer, 'caesar ciphertext differs from plaintext');

  // Atbash: verify property A<->Z
  var pc3b = PC.generateCipherPuzzle(999, 3);
  // Verify: atbash of answer gives ciphertext
  var atbashEncoded = pc3b.answer.split('').map(function(c) {
    var idx = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(c);
    return idx === -1 ? c : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[25 - idx];
  }).join('');
  assertEqual(atbashEncoded, pc3b.data.ciphertext, 'atbash cipher is correctly encoded');

  // Determinism
  var ca = PC.generateCipherPuzzle(777, 2);
  var cb = PC.generateCipherPuzzle(777, 2);
  assertEqual(ca.answer, cb.answer, 'same seed produces same cipher answer');
  assertEqual(ca.data.ciphertext, cb.data.ciphertext, 'same seed produces same ciphertext');
});

// ============================================================================
// SUITE 9: COLLABORATIVE PUZZLE
// ============================================================================

suite('Collaborative Puzzle', function() {

  for (var t = 1; t <= 5; t++) {
    (function(tier) {
      var p = PC.generateCollaborativePuzzle(22222 + tier, tier);
      assertExists(p, 'collaborative puzzle generated for tier ' + tier);
      assertEqual(p.archetype, 'collaborative', 'archetype is collaborative for tier ' + tier);
      assertEqual(p.tier, tier, 'tier matches for tier ' + tier);
      assertExists(p.data, 'collaborative has data for tier ' + tier);
      assert(Array.isArray(p.data.stages), 'collaborative has stages array for tier ' + tier);
      var expectedStages = 2 + tier;
      assertEqual(p.data.stages.length, expectedStages, 'collaborative has ' + expectedStages + ' stages for tier ' + tier);
      assert(p.data.stageCount >= 3, 'stageCount >= 3 for tier ' + tier);
      assertEqual(p.timeLimit, PC.TIME_LIMITS[tier] * 2, 'collaborative timeLimit is double for tier ' + tier);
    })(t);
  }

  var p = PC.generateCollaborativePuzzle(12345, 3);

  // Stages have required fields
  p.data.stages.forEach(function(stage, i) {
    assertEqual(stage.stageIndex, i, 'stage ' + i + ' has correct stageIndex');
    assertType(stage.archetype, 'string', 'stage ' + i + ' has archetype');
    assert(['sequence', 'riddle', 'pattern', 'cipher'].indexOf(stage.archetype) !== -1,
      'stage ' + i + ' archetype is valid non-collaborative type');
    assertExists(stage.puzzle, 'stage ' + i + ' has puzzle');
    assert(!stage.solved, 'stage ' + i + ' starts unsolved');
    assert(stage.solvedBy === null, 'stage ' + i + ' starts with no solver');
    assert(typeof stage.puzzle.validate === 'function', 'stage ' + i + ' puzzle has validate');
  });

  // Validate on collaborative puzzle
  var validStageInput = { stageIndex: 0, answer: p.data.stages[0].puzzle.answer };
  assert(p.validate(validStageInput), 'collaborative validate accepts correct stage input');
  assert(!p.validate({ stageIndex: 0, answer: 'totally_wrong_xxxxxx' }), 'collaborative validate rejects wrong stage answer');
  assert(!p.validate(null), 'collaborative validate rejects null');
  assert(!p.validate('string'), 'collaborative validate rejects string');

  // Determinism
  var ca = PC.generateCollaborativePuzzle(555, 2);
  var cb = PC.generateCollaborativePuzzle(555, 2);
  assertEqual(ca.data.stageCount, cb.data.stageCount, 'same seed produces same stage count');
});

// ============================================================================
// SUITE 10: GENERATE PUZZLE (DISPATCHER)
// ============================================================================

suite('generatePuzzle Dispatcher', function() {

  PC.PUZZLE_ARCHETYPES.forEach(function(archetype) {
    for (var t = 1; t <= 5; t++) {
      var p = PC.generatePuzzle(archetype, 1000 + t, t);
      assertExists(p, 'generatePuzzle works for ' + archetype + ' tier ' + t);
      assertEqual(p.archetype, archetype, 'generatePuzzle sets archetype correctly for ' + archetype);
      assertEqual(p.tier, t, 'generatePuzzle sets tier correctly for ' + archetype + ' tier ' + t);
    }
  });

  // Unknown archetype defaults to sequence
  var fallback = PC.generatePuzzle('unknown_type', 1, 1);
  assertExists(fallback, 'generatePuzzle handles unknown archetype');

  // Tier clamping
  var p1 = PC.generatePuzzle('sequence', 1, 0);
  assertEqual(p1.tier, 1, 'tier 0 clamped to 1');
  var p2 = PC.generatePuzzle('sequence', 1, 10);
  assertEqual(p2.tier, 5, 'tier 10 clamped to 5');

  // Missing seed defaults
  var p3 = PC.generatePuzzle('riddle', undefined, 1);
  assertExists(p3, 'generatePuzzle works with undefined seed');
});

// ============================================================================
// SUITE 11: DAILY PUZZLE ROTATION
// ============================================================================

suite('Daily Puzzle Rotation', function() {

  freshPC();

  var today = new Date('2026-02-22');
  var dp = PC.getDailyPuzzle(today);

  assertExists(dp, 'getDailyPuzzle returns a puzzle');
  assert(dp.isDaily === true, 'daily puzzle has isDaily flag');
  assertType(dp.dailyDate, 'number', 'daily puzzle has dailyDate number');
  assert(dp.dailyBonus > 0, 'daily puzzle has positive dailyBonus');
  assert(PC.PUZZLE_ARCHETYPES.indexOf(dp.archetype) !== -1, 'daily puzzle archetype is valid');
  assertRange(dp.tier, 1, 5, 'daily puzzle tier in range');

  // getDayNumber
  var dayNum = PC.getDayNumber(today);
  assertType(dayNum, 'number', 'getDayNumber returns a number');
  assert(dayNum > 0, 'getDayNumber is positive');
  assertEqual(PC.getDayNumber(dayNum), dayNum, 'getDayNumber is idempotent for numbers');

  // Determinism for same day
  var dp2 = PC.getDailyPuzzle(today);
  assertEqual(dp.archetype, dp2.archetype, 'same date produces same daily archetype');
  assertEqual(dp.tier, dp2.tier, 'same date produces same daily tier');
  assertEqual(dp.seed, dp2.seed, 'same date produces same daily seed');

  // Different days produce potentially different puzzles
  var tomorrow = new Date('2026-02-23');
  var dp3 = PC.getDailyPuzzle(tomorrow);
  assertExists(dp3, 'getDailyPuzzle works for tomorrow');
  assertEqual(dp3.isDaily, true, 'tomorrows daily also has isDaily flag');

  // String date
  var dpStr = PC.getDailyPuzzle('2026-02-22');
  assertEqual(dpStr.archetype, dp.archetype, 'string date gives same daily puzzle as Date object');

  // Weekly schedule
  var week = PC.getWeeklySchedule('2026-02-22');
  assertEqual(week.length, 7, 'getWeeklySchedule returns 7 puzzles');
  week.forEach(function(p, i) {
    assert(p.isDaily, 'week puzzle ' + i + ' has isDaily flag');
    assert(PC.PUZZLE_ARCHETYPES.indexOf(p.archetype) !== -1, 'week puzzle ' + i + ' has valid archetype');
  });

  // Daily bonus = 50% of sparkReward
  assert(dp.dailyBonus === Math.round(dp.sparkReward * 0.5), 'dailyBonus is 50% of sparkReward');
});

// ============================================================================
// SUITE 12: SESSION MANAGEMENT
// ============================================================================

suite('Session Management', function() {

  freshPC();

  var pid = uid();
  var puzzle = PC.generatePuzzle('sequence', 1, 1);

  // Start session
  var session = PC.startSession(pid, puzzle);
  assertExists(session, 'startSession returns a session');
  assertType(session.id, 'string', 'session has id');
  assertEqual(session.playerId, pid, 'session has correct playerId');
  assertEqual(session.hintsUsed, 0, 'session starts with 0 hints used');
  assert(!session.solved, 'session starts unsolved');
  assert(!session.failed, 'session starts not failed');
  assert(session.startTime > 0, 'session has startTime');
  assertEqual(session.hintCost, 0, 'session starts with 0 hint cost');

  // getSession
  var retrieved = PC.getSession(session.id);
  assertExists(retrieved, 'getSession finds the session');
  assertEqual(retrieved.id, session.id, 'getSession returns correct session');

  // getSession with bad id
  assert(PC.getSession('nonexistent_id') === null, 'getSession returns null for bad id');

  // isSessionExpired — fresh session is not expired
  assert(!PC.isSessionExpired(session.id), 'fresh session is not expired');
  assert(PC.isSessionExpired('nonexistent_id'), 'nonexistent session is expired');

  // Null inputs
  assert(PC.startSession(null, puzzle) === null, 'startSession returns null for null playerId');
  assert(PC.startSession(pid, null) === null, 'startSession returns null for null puzzle');
});

// ============================================================================
// SUITE 13: HINT SYSTEM
// ============================================================================

suite('Hint System', function() {

  freshPC();

  var pid = uid();
  var puzzle = PC.generatePuzzle('riddle', 7777, 1);
  var session = PC.startSession(pid, puzzle);
  var maxHints = puzzle.hints.length;

  // Request hints up to the limit
  for (var i = 0; i < maxHints; i++) {
    var result = PC.requestHint(session.id);
    assert(!result.error, 'hint request ' + i + ' has no error');
    assertType(result.hint, 'string', 'hint ' + i + ' is a string');
    assert(result.hint.length > 0, 'hint ' + i + ' is non-empty');
    assertEqual(result.hintIndex, i, 'hint has correct index ' + i);
    assert(result.cost > 0, 'hint ' + i + ' has positive cost');
    assertEqual(result.remaining, maxHints - i - 1, 'remaining hints correct after hint ' + i);
  }

  // No hints remaining
  var noHint = PC.requestHint(session.id);
  assertEqual(noHint.error, 'no_hints_remaining', 'error when no hints remain');

  // Hint cost deducted from reward
  var puzzle2 = PC.generatePuzzle('sequence', 8888, 2);
  var session2 = PC.startSession(pid, puzzle2);
  PC.requestHint(session2.id);
  var expectedCost = Math.round(puzzle2.sparkReward * PC.HINT_COST_FRACTION);
  var solveResult = PC.submitAnswer(session2.id, puzzle2.data.answer);
  assert(solveResult.correct, 'puzzle2 solved correctly');
  assert(solveResult.reward.hintDeduction >= expectedCost, 'hint deduction applied to reward');
  // Note: speed bonus may make final spark > base even with hint deduction; verify deduction was applied
  assert(solveResult.reward.hintDeduction > 0, 'hint deduction is positive in reward');

  // requestHint on non-existent session
  var h = PC.requestHint('bad_session_id');
  assertEqual(h.error, 'session_not_found', 'error for bad session id');

  // requestHint on already-solved session
  var puzzle3 = PC.generatePuzzle('sequence', 3333, 1);
  var session3 = PC.startSession(pid, puzzle3);
  PC.submitAnswer(session3.id, puzzle3.data.answer);
  var h3 = PC.requestHint(session3.id);
  assertEqual(h3.error, 'already_solved', 'error when requesting hint on solved session');
});

// ============================================================================
// SUITE 14: ANSWER SUBMISSION & REWARDS
// ============================================================================

suite('Answer Submission & Rewards', function() {

  freshPC();

  var pid = uid();

  // Correct answer gives reward
  var puzzle = PC.generatePuzzle('sequence', 111, 1);
  var session = PC.startSession(pid, puzzle);
  var result = PC.submitAnswer(session.id, puzzle.data.answer);
  assert(result.correct, 'submitAnswer returns correct=true for right answer');
  assertExists(result.reward, 'submitAnswer includes reward');
  assert(result.reward.spark > 0, 'reward spark is positive');
  assert(result.reward.baseSpark > 0, 'reward baseSpark is positive');
  assertType(result.reward.speedLabel, 'string', 'reward has speedLabel');
  assertType(result.reward.timeUsed, 'number', 'reward has timeUsed');
  assert(result.solveTime >= 0, 'solveTime is non-negative');

  // Wrong answer
  var puzzle2 = PC.generatePuzzle('sequence', 222, 1);
  var session2 = PC.startSession(pid, puzzle2);
  var wrongResult = PC.submitAnswer(session2.id, -99999);
  assert(!wrongResult.correct, 'submitAnswer returns correct=false for wrong answer');
  assert(!wrongResult.error, 'wrong answer result has no error');

  // Double-submit prevention
  var puzzle3 = PC.generatePuzzle('sequence', 333, 1);
  var session3 = PC.startSession(pid, puzzle3);
  PC.submitAnswer(session3.id, puzzle3.data.answer); // First solve
  var secondResult = PC.submitAnswer(session3.id, puzzle3.data.answer);
  assertEqual(secondResult.error, 'already_solved', 'double-submit returns already_solved error');

  // Bad session id
  var badResult = PC.submitAnswer('bad_session', 42);
  assertEqual(badResult.error, 'session_not_found', 'bad session returns error');
  assert(!badResult.correct, 'bad session result has correct=false');

  // Tier 5 gives 100 base spark
  var puzzle5 = PC.generatePuzzle('sequence', 555, 5);
  var session5 = PC.startSession(pid, puzzle5);
  var result5 = PC.submitAnswer(session5.id, puzzle5.data.answer);
  assert(result5.correct, 'tier 5 puzzle solved');
  assertEqual(result5.reward.baseSpark, 100, 'tier 5 base spark is 100');

  // All archetypes can be solved
  PC.PUZZLE_ARCHETYPES.forEach(function(archetype) {
    if (archetype === 'collaborative') return; // Skip - tested separately
    var p = PC.generatePuzzle(archetype, 9000, 1);
    var s = PC.startSession(uid(), p);
    var r = PC.submitAnswer(s.id, p.answer);
    assert(r.correct, archetype + ' puzzle solved correctly');
  });
});

// ============================================================================
// SUITE 15: SPEED BONUS SYSTEM
// ============================================================================

suite('Speed Bonus System', function() {

  // calculateSpeedBonus
  var timeLimit = 300;

  // Under 25% — Lightning
  var b1 = PC.calculateSpeedBonus(10, timeLimit);
  assertEqual(b1.label, 'Lightning', 'Under 25% time gives Lightning label');
  assertEqual(b1.multiplier, 2.0, 'Lightning multiplier is 2.0');

  // Under 50% — Swift
  var b2 = PC.calculateSpeedBonus(100, timeLimit);
  assertEqual(b2.label, 'Swift', 'Under 50% time gives Swift label');
  assertEqual(b2.multiplier, 1.5, 'Swift multiplier is 1.5');

  // Under 75% — Brisk
  var b3 = PC.calculateSpeedBonus(200, timeLimit);
  assertEqual(b3.label, 'Brisk', 'Under 75% time gives Brisk label');
  assertEqual(b3.multiplier, 1.2, 'Brisk multiplier is 1.2');

  // Full time — Complete
  var b4 = PC.calculateSpeedBonus(300, timeLimit);
  assertEqual(b4.label, 'Complete', 'At 100% time gives Complete label');
  assertEqual(b4.multiplier, 1.0, 'Complete multiplier is 1.0');

  // Speed bonus reflected in session rewards
  freshPC();
  var pid = uid();
  var puzzle = PC.generatePuzzle('sequence', 1, 1);

  // Fast solve session (simulate by creating a session and immediately submitting)
  var fastSession = PC.startSession(pid, puzzle);
  var fastResult = PC.submitAnswer(fastSession.id, puzzle.data.answer);
  assert(fastResult.correct, 'fast solve correct');
  assert(fastResult.reward.speedMultiplier >= 1.0, 'speed multiplier >= 1.0');
  assert(fastResult.reward.spark >= fastResult.reward.baseSpark, 'spark >= base for fast solves (Lightning bonus applies)');
});

// ============================================================================
// SUITE 16: LEADERBOARD
// ============================================================================

suite('Leaderboard', function() {

  freshPC();

  // Add entries
  PC.updateLeaderboard('sequence_t1', { playerId: 'alice', playerName: 'Alice', solveTime: 30, tier: 1, timestamp: 100 });
  PC.updateLeaderboard('sequence_t1', { playerId: 'bob', playerName: 'Bob', solveTime: 20, tier: 1, timestamp: 101 });
  PC.updateLeaderboard('sequence_t1', { playerId: 'carol', playerName: 'Carol', solveTime: 50, tier: 1, timestamp: 102 });

  var lb = PC.getLeaderboard('sequence', 1);
  assertEqual(lb.length, 3, 'leaderboard has 3 entries');
  assertEqual(lb[0].playerId, 'bob', 'fastest solver is first');
  assertEqual(lb[1].playerId, 'alice', 'second fastest is second');
  assertEqual(lb[2].playerId, 'carol', 'slowest is third');

  // Max entries capped
  for (var i = 0; i < 15; i++) {
    PC.updateLeaderboard('cipher_t3', { playerId: 'p' + i, playerName: 'P' + i, solveTime: i + 1, tier: 3, timestamp: i });
  }
  var lb2 = PC.getLeaderboard('cipher', 3);
  assertEqual(lb2.length, PC.LEADERBOARD_MAX_ENTRIES, 'leaderboard capped at LEADERBOARD_MAX_ENTRIES');

  // getPlayerBest
  var best = PC.getPlayerBest('sequence', 1, 'alice');
  assertExists(best, 'getPlayerBest finds alice');
  assertEqual(best.solveTime, 30, 'getPlayerBest returns correct solve time');

  var notFound = PC.getPlayerBest('sequence', 1, 'nobody');
  assert(notFound === null, 'getPlayerBest returns null when player not in leaderboard');

  // clearLeaderboard
  PC.clearLeaderboard('sequence', 1);
  var cleared = PC.getLeaderboard('sequence', 1);
  assertEqual(cleared.length, 0, 'clearLeaderboard empties the leaderboard');

  // getAllLeaderboards
  var all = PC.getAllLeaderboards();
  assertType(all, 'object', 'getAllLeaderboards returns an object');
  assert(Object.keys(all).indexOf('cipher_t3') !== -1, 'getAllLeaderboards includes cipher_t3');

  // Empty leaderboard returns empty array
  var empty = PC.getLeaderboard('pattern', 5);
  assert(Array.isArray(empty), 'getLeaderboard returns array for empty category');
  assertEqual(empty.length, 0, 'getLeaderboard returns empty array for unknown category');

  // Leaderboard sorted by solve time (ascending)
  PC.updateLeaderboard('riddle_t2', { playerId: 'z', playerName: 'Z', solveTime: 100, tier: 2, timestamp: 1 });
  PC.updateLeaderboard('riddle_t2', { playerId: 'a', playerName: 'A', solveTime: 10, tier: 2, timestamp: 2 });
  PC.updateLeaderboard('riddle_t2', { playerId: 'm', playerName: 'M', solveTime: 55, tier: 2, timestamp: 3 });
  var lb3 = PC.getLeaderboard('riddle', 2);
  assert(lb3[0].solveTime <= lb3[1].solveTime, 'leaderboard sorted ascending by solveTime (0<1)');
  assert(lb3[1].solveTime <= lb3[2].solveTime, 'leaderboard sorted ascending by solveTime (1<2)');

  // getLeaderboard returns a copy (mutation-safe)
  var lb4 = PC.getLeaderboard('riddle', 2);
  lb4.push({ playerId: 'fake', playerName: 'Fake', solveTime: 999, tier: 2, timestamp: 999 });
  var lb5 = PC.getLeaderboard('riddle', 2);
  assertEqual(lb5.length, 3, 'getLeaderboard returns independent copy');
});

// ============================================================================
// SUITE 17: CO-OP ROOM MANAGEMENT
// ============================================================================

suite('Co-op Room Management', function() {

  freshPC();

  var host = uid();
  var p2 = uid();
  var p3 = uid();

  // Create room
  var room = PC.createCoopRoom(host, 'collaborative', 2, 42);
  assertExists(room, 'createCoopRoom returns a room');
  assertType(room.id, 'string', 'room has id');
  assertEqual(room.hostId, host, 'room has correct hostId');
  assert(Array.isArray(room.players), 'room has players array');
  assertEqual(room.players.length, 1, 'room starts with 1 player (host)');
  assertEqual(room.players[0], host, 'host is in players');
  assert(!room.solved, 'room starts unsolved');
  assert(room.startTime === null, 'room has no startTime initially');
  assert(Array.isArray(room.chat), 'room has chat array');
  assertExists(room.puzzle, 'room has puzzle');

  // Get room
  var fetched = PC.getCoopRoom(room.id);
  assertExists(fetched, 'getCoopRoom finds the room');
  assertEqual(fetched.id, room.id, 'getCoopRoom returns correct room');

  // getCoopRoom bad id
  assert(PC.getCoopRoom('no_room') === null, 'getCoopRoom returns null for bad id');

  // Join room
  var joinResult = PC.joinCoopRoom(room.id, p2);
  assert(joinResult.success, 'joinCoopRoom succeeds for new player');
  assertEqual(room.players.length, 2, 'room has 2 players after join');

  // Join duplicate
  var dupJoin = PC.joinCoopRoom(room.id, p2);
  assert(!dupJoin.success, 'joinCoopRoom fails for duplicate player');
  assertEqual(dupJoin.error, 'already_in_room', 'correct error for duplicate join');

  // Join bad room
  var badJoin = PC.joinCoopRoom('no_room', p3);
  assert(!badJoin.success, 'joinCoopRoom fails for bad room id');
  assertEqual(badJoin.error, 'room_not_found', 'correct error for bad room');

  // Start room — too early (only 2 players but min is 2, so this should work)
  // Actually min is 2 and we have 2, so start should succeed
  var startResult = PC.startCoopRoom(room.id);
  assert(startResult.success, 'startCoopRoom succeeds with minimum players');
  assertExists(room.startTime, 'room has startTime after start');

  // Start again fails
  var startAgain = PC.startCoopRoom(room.id);
  assert(!startAgain.success, 'startCoopRoom fails when already started');
  assertEqual(startAgain.error, 'already_started', 'correct error for already started');

  // Leave room
  var freshHost = uid();
  var freshP2 = uid();
  var freshP3 = uid();
  var freshRoom = PC.createCoopRoom(freshHost, 'sequence', 1, 100);
  PC.joinCoopRoom(freshRoom.id, freshP2);
  PC.joinCoopRoom(freshRoom.id, freshP3);

  var leaveResult = PC.leaveCoopRoom(freshRoom.id, freshP2);
  assert(leaveResult.success, 'leaveCoopRoom succeeds');
  assertEqual(leaveResult.playersRemaining, 2, 'playersRemaining is correct after leave');
  assertEqual(freshRoom.players.indexOf(freshP2), -1, 'left player is removed from players array');

  // Leave bad room
  var badLeave = PC.leaveCoopRoom('bad_room', freshHost);
  assert(!badLeave.success, 'leaveCoopRoom fails for bad room');

  // Leave player not in room
  var notInRoom = PC.leaveCoopRoom(freshRoom.id, 'not_a_player');
  assert(!notInRoom.success, 'leaveCoopRoom fails for player not in room');

  // listCoopRooms
  var list = PC.listCoopRooms();
  assert(Array.isArray(list), 'listCoopRooms returns array');
  assert(list.length >= 2, 'listCoopRooms shows created rooms');
  list.forEach(function(entry) {
    assertType(entry.id, 'string', 'list entry has id');
    assertType(entry.hostId, 'string', 'list entry has hostId');
    assertType(entry.playerCount, 'number', 'list entry has playerCount');
  });

  // createCoopRoom — null host returns null
  assert(PC.createCoopRoom(null, 'sequence', 1) === null, 'createCoopRoom returns null for null host');

  // Room full error (fill to max)
  var fullRoom = PC.createCoopRoom(uid(), 'sequence', 1, 200);
  for (var i = 0; i < PC.COOP_MAX_PLAYERS - 1; i++) {
    PC.joinCoopRoom(fullRoom.id, uid());
  }
  var overFull = PC.joinCoopRoom(fullRoom.id, uid());
  assert(!overFull.success, 'joinCoopRoom fails when room is full');
  assertEqual(overFull.error, 'room_full', 'correct error for full room');
});

// ============================================================================
// SUITE 18: CO-OP STAGE SUBMISSION
// ============================================================================

suite('Co-op Stage Submission', function() {

  freshPC();

  var host = uid();
  var partner = uid();

  // Collaborative puzzle room
  var room = PC.createCoopRoom(host, 'collaborative', 2, 77777);
  PC.joinCoopRoom(room.id, partner);
  PC.startCoopRoom(room.id);

  var stages = room.puzzle.data.stages;

  // Submit first stage correctly
  var stage0Answer = stages[0].puzzle.answer;
  var r0 = PC.submitCoopStage(room.id, host, 0, stage0Answer);
  assert(r0.success, 'co-op stage 0 submitted successfully');
  assert(r0.correct, 'co-op stage 0 is correct');
  assert(stages[0].solved, 'stage 0 is marked solved');
  assertEqual(stages[0].solvedBy, host, 'stage 0 solved by host');

  // Try to solve stage 0 again
  var dup = PC.submitCoopStage(room.id, host, 0, stage0Answer);
  assert(!dup.success, 'duplicate stage solve fails');
  assertEqual(dup.error, 'stage_already_solved', 'correct error for duplicate');

  // Try to skip to stage 2 before stage 1 is done
  if (stages.length > 2) {
    var skip = PC.submitCoopStage(room.id, partner, 2, stages[2].puzzle.answer);
    assert(!skip.success, 'skipping stage fails');
    assertEqual(skip.error, 'previous_stage_not_solved', 'correct error for skipping');
  }

  // Submit second stage
  var stage1Answer = stages[1].puzzle.answer;
  var r1 = PC.submitCoopStage(room.id, partner, 1, stage1Answer);
  assert(r1.success, 'co-op stage 1 submitted successfully');
  assert(r1.correct, 'co-op stage 1 is correct');

  // Wrong answer
  var wrongR = PC.submitCoopStage(room.id, partner, 2, 'definitely_wrong_xyz');
  // Only test that we get a response (may be wrong or error depending on stage count)
  assertExists(wrongR, 'submitCoopStage returns a result for wrong answer');

  // Error cases
  var badRoom = PC.submitCoopStage('bad_room', host, 0, 'anything');
  assertEqual(badRoom.error, 'room_not_found', 'bad room error');

  var notStarted = PC.createCoopRoom(uid(), 'collaborative', 1, 55);
  PC.joinCoopRoom(notStarted.id, uid());
  var notStartedResult = PC.submitCoopStage(notStarted.id, host, 0, 'anything');
  assertEqual(notStartedResult.error, 'room_not_started', 'not started error');

  var notInRoom = PC.submitCoopStage(room.id, 'stranger', 0, 'anything');
  assert(!notInRoom.success, 'player not in room cannot submit');
  assertEqual(notInRoom.error, 'not_in_room', 'correct error for player not in room');
});

// ============================================================================
// SUITE 19: CO-OP CHAT
// ============================================================================

suite('Co-op Chat', function() {

  freshPC();

  var host = uid();
  var guest = uid();
  var room = PC.createCoopRoom(host, 'sequence', 1, 999);
  PC.joinCoopRoom(room.id, guest);

  // Add messages
  var c1 = PC.addCoopChat(room.id, host, 'Hello team!');
  assert(c1.success, 'addCoopChat succeeds for host');
  assertExists(c1.entry, 'chat result has entry');
  assertEqual(c1.entry.playerId, host, 'chat entry has correct playerId');
  assertType(c1.entry.message, 'string', 'chat entry has message string');
  assert(c1.entry.timestamp > 0, 'chat entry has timestamp');

  var c2 = PC.addCoopChat(room.id, guest, 'Ready!');
  assert(c2.success, 'addCoopChat succeeds for guest');

  // Room chat array updated
  assertEqual(room.chat.length, 2, 'room chat has 2 messages');

  // Player not in room
  var stranger = PC.addCoopChat(room.id, 'stranger', 'I do not belong here');
  assert(!stranger.success, 'stranger cannot chat');
  assertEqual(stranger.error, 'not_in_room', 'correct error for stranger chat');

  // Bad room
  var badRoom = PC.addCoopChat('bad_room', host, 'message');
  assert(!badRoom.success, 'bad room chat fails');
  assertEqual(badRoom.error, 'room_not_found', 'correct error for bad room chat');

  // Long message gets truncated to 200 chars
  var longMsg = 'x'.repeat(300);
  var longResult = PC.addCoopChat(room.id, host, longMsg);
  assert(longResult.success, 'long message accepted');
  assert(longResult.entry.message.length <= 200, 'long message truncated to 200 chars');
});

// ============================================================================
// SUITE 20: START COOP ROOM — EDGE CASES
// ============================================================================

suite('Co-op Start Room Edge Cases', function() {

  freshPC();

  // Room with only host (1 player) — cannot start
  var host = uid();
  var room = PC.createCoopRoom(host, 'sequence', 1, 11);
  var soloStart = PC.startCoopRoom(room.id);
  assert(!soloStart.success, 'cannot start room with only 1 player');
  assertEqual(soloStart.error, 'not_enough_players', 'correct error for solo start');
  assert(soloStart.need >= 1, 'need field indicates players needed');

  // Bad room id
  var badStart = PC.startCoopRoom('no_room');
  assert(!badStart.success, 'startCoopRoom fails for bad room id');
  assertEqual(badStart.error, 'room_not_found', 'correct error for bad room start');
});

// ============================================================================
// SUITE 21: ACHIEVEMENT SYSTEM
// ============================================================================

suite('Achievement System', function() {

  // PUZZLE_ACHIEVEMENTS
  assert(PC.PUZZLE_ACHIEVEMENTS.length >= 10, 'At least 10 puzzle achievements');
  PC.PUZZLE_ACHIEVEMENTS.forEach(function(ach) {
    assertType(ach.id, 'string', 'achievement ' + ach.id + ' has id');
    assertType(ach.name, 'string', 'achievement ' + ach.id + ' has name');
    assertType(ach.description, 'string', 'achievement ' + ach.id + ' has description');
    assertType(ach.category, 'string', 'achievement ' + ach.id + ' has category');
    assertExists(ach.trigger, 'achievement ' + ach.id + ' has trigger');
    assertExists(ach.reward, 'achievement ' + ach.id + ' has reward');
    assert(ach.reward.spark > 0, 'achievement ' + ach.id + ' has positive spark reward');
    assertType(ach.reward.badge, 'string', 'achievement ' + ach.id + ' has badge string');
  });

  // All achievement IDs are unique
  var achIds = PC.PUZZLE_ACHIEVEMENTS.map(function(a) { return a.id; });
  var uniqueIds = achIds.filter(function(id, i) { return achIds.indexOf(id) === i; });
  assertEqual(achIds.length, uniqueIds.length, 'all achievement IDs are unique');

  // checkAchievements — no result returns empty
  var emptyCheck = PC.checkAchievements('player1', null, {}, {});
  assert(Array.isArray(emptyCheck), 'checkAchievements returns array');
  assertEqual(emptyCheck.length, 0, 'null solve result gives no achievements');

  // checkAchievements — first solve
  var fakeResult = { correct: true, reward: { spark: 10, speedLabel: 'Complete', hintDeduction: 0 } };
  var fakePuzzle = { archetype: 'sequence', tier: 1, isDaily: false };
  var stats1 = { solved_count: 1, archetype_counts: { sequence: 1 }, daily_streak: 0 };
  var achs1 = PC.checkAchievements('p1', fakeResult, fakePuzzle, stats1);
  assert(Array.isArray(achs1), 'checkAchievements returns array for first solve');
  var firstInsight = achs1.filter(function(a) { return a.id === 'first_puzzle'; });
  assertEqual(firstInsight.length, 1, 'first_puzzle achievement triggered on solve_count=1');

  // checkAchievements — lightning speed
  var lightningResult = { correct: true, reward: { spark: 20, speedLabel: 'Lightning', hintDeduction: 0 } };
  var lightningAchs = PC.checkAchievements('p2', lightningResult, fakePuzzle, { solved_count: 5, archetype_counts: {}, daily_streak: 0 });
  var speedAch = lightningAchs.filter(function(a) { return a.id === 'speed_solver'; });
  assertEqual(speedAch.length, 1, 'speed_solver achievement triggered for Lightning speed');

  // checkAchievements — tier 5 solve
  var tier5Puzzle = { archetype: 'cipher', tier: 5, isDaily: false };
  var tier5Achs = PC.checkAchievements('p3', fakeResult, tier5Puzzle, { solved_count: 10, archetype_counts: { cipher: 1 }, daily_streak: 0 });
  var masterAch = tier5Achs.filter(function(a) { return a.id === 'master_tier5'; });
  assertEqual(masterAch.length, 1, 'master_tier5 achievement triggered on tier 5 solve');

  // checkAchievements — all archetypes
  var allArchStats = { solved_count: 20, archetype_counts: {}, daily_streak: 0 };
  PC.PUZZLE_ARCHETYPES.forEach(function(a) { allArchStats.archetype_counts[a] = 1; });
  var polyAchs = PC.checkAchievements('p4', fakeResult, fakePuzzle, allArchStats);
  var polyAch = polyAchs.filter(function(a) { return a.id === 'all_archetypes'; });
  assertEqual(polyAch.length, 1, 'all_archetypes achievement triggered when all archetypes covered');

  // checkAchievements — cooperative
  var coopPuzzle = { archetype: 'collaborative', tier: 2, isDaily: false };
  var coopAchs = PC.checkAchievements('p5', fakeResult, coopPuzzle, { solved_count: 5, archetype_counts: {}, daily_streak: 0 });
  var coopAch = coopAchs.filter(function(a) { return a.id === 'coop_solver'; });
  assertEqual(coopAch.length, 1, 'coop_solver achievement triggered for collaborative solve');

  // checkAchievements — daily streak
  var streakStats = { solved_count: 7, archetype_counts: {}, daily_streak: 7 };
  var streakAchs = PC.checkAchievements('p6', fakeResult, fakePuzzle, streakStats);
  var streakAch = streakAchs.filter(function(a) { return a.id === 'daily_streak_7'; });
  assertEqual(streakAch.length, 1, 'daily_streak_7 achievement triggered at streak=7');

  // checkAchievements — no hints on tier 5
  var noHintResult = { correct: true, reward: { spark: 100, speedLabel: 'Complete', hintDeduction: 0 } };
  var noHintAchs = PC.checkAchievements('p7', noHintResult, tier5Puzzle, { solved_count: 1, archetype_counts: {}, daily_streak: 0 });
  var noHintAch = noHintAchs.filter(function(a) { return a.id === 'no_hints'; });
  assertEqual(noHintAch.length, 1, 'no_hints achievement triggered on tier 5 with no hints');

  // No duplicate achievement for already unlocked — handled by recordSolve
});

// ============================================================================
// SUITE 22: PLAYER STATS
// ============================================================================

suite('Player Stats', function() {

  freshPC();

  var pid = uid();

  // getPlayerStats creates fresh stats
  var stats = PC.getPlayerStats(pid);
  assertExists(stats, 'getPlayerStats returns stats object');
  assertEqual(stats.solved_count, 0, 'solved_count starts at 0');
  assertEqual(stats.attempted_count, 0, 'attempted_count starts at 0');
  assertType(stats.archetype_counts, 'object', 'archetype_counts is an object');
  assertType(stats.tier_counts, 'object', 'tier_counts is an object');
  assertEqual(stats.daily_streak, 0, 'daily_streak starts at 0');
  assertEqual(stats.total_spark_earned, 0, 'total_spark_earned starts at 0');
  assert(Array.isArray(stats.unlocked_achievements), 'unlocked_achievements is array');
  assertEqual(stats.unlocked_achievements.length, 0, 'no achievements at start');

  // recordSolve — wrong answer
  var puzzle = PC.generatePuzzle('sequence', 1, 1);
  var session = PC.startSession(pid, puzzle);
  var wrongResult = { correct: false };
  var record1 = PC.recordSolve(pid, wrongResult, puzzle);
  var stats2 = PC.getPlayerStats(pid);
  assertEqual(stats2.attempted_count, 1, 'attempted_count incremented on failure');
  assertEqual(stats2.solved_count, 0, 'solved_count not incremented on failure');

  // recordSolve — correct answer
  var session2 = PC.startSession(pid, puzzle);
  var solveResult = PC.submitAnswer(session2.id, puzzle.data.answer);
  var record2 = PC.recordSolve(pid, solveResult, puzzle);
  var stats3 = PC.getPlayerStats(pid);
  assertEqual(stats3.solved_count, 1, 'solved_count incremented on correct solve');
  assertEqual(stats3.attempted_count, 2, 'attempted_count incremented again');
  assertEqual(stats3.archetype_counts['sequence'], 1, 'archetype_counts tracked correctly');
  assertEqual(stats3.tier_counts[1], 1, 'tier_counts tracked correctly');
  assert(stats3.total_spark_earned > 0, 'total_spark_earned accumulated');

  assertExists(record2.stats, 'recordSolve returns stats');
  assert(Array.isArray(record2.newAchievements), 'recordSolve returns newAchievements array');

  // Multiple solves — achievements not double-counted
  var record3 = PC.recordSolve(pid, solveResult, puzzle);
  var ach1 = record2.newAchievements.filter(function(a) { return a.id === 'first_puzzle'; });
  var ach2 = record3.newAchievements.filter(function(a) { return a.id === 'first_puzzle'; });
  assertEqual(ach1.length <= 1, true, 'first_puzzle granted at most once in first record');
  assertEqual(ach2.length, 0, 'first_puzzle not granted again in second record');

  // Daily streak tracking
  var dailyPuzzle = PC.getDailyPuzzle(100); // day 100
  var dailySolve = { correct: true, reward: { spark: 20, speedLabel: 'Complete', hintDeduction: 0 } };
  PC.recordSolve(pid, dailySolve, dailyPuzzle, 100);
  var statsAfterDay100 = PC.getPlayerStats(pid);
  assertEqual(statsAfterDay100.daily_streak, 1, 'daily streak is 1 after first daily solve');
  assertEqual(statsAfterDay100.last_daily_day, 100, 'last_daily_day recorded');

  // Day 101 — streak continues
  PC.recordSolve(pid, dailySolve, dailyPuzzle, 101);
  var statsAfterDay101 = PC.getPlayerStats(pid);
  assertEqual(statsAfterDay101.daily_streak, 2, 'daily streak increments to 2');

  // Day 105 — streak broken (gap)
  PC.recordSolve(pid, dailySolve, dailyPuzzle, 105);
  var statsAfterDay105 = PC.getPlayerStats(pid);
  assertEqual(statsAfterDay105.daily_streak, 1, 'daily streak resets after gap');

  // getPlayerStats is stable (same object returned on repeated calls)
  var stats4 = PC.getPlayerStats(pid);
  var stats5 = PC.getPlayerStats(pid);
  assertEqual(stats4.solved_count, stats5.solved_count, 'getPlayerStats returns stable data');
});

// ============================================================================
// SUITE 23: PUZZLE CATALOG
// ============================================================================

suite('Puzzle Catalog', function() {

  var catalog = PC.getPuzzleCatalog();
  assert(Array.isArray(catalog), 'getPuzzleCatalog returns an array');
  assertEqual(catalog.length, PC.PUZZLE_ARCHETYPES.length * 5, 'catalog has entries for all archetypes * 5 tiers');

  catalog.forEach(function(entry) {
    assertType(entry.id, 'string', 'catalog entry has id');
    assertType(entry.archetype, 'string', 'catalog entry has archetype');
    assertRange(entry.tier, 1, 5, 'catalog entry tier in range');
    assertType(entry.title, 'string', 'catalog entry has title');
    assert(entry.sparkReward > 0, 'catalog entry has positive sparkReward');
    assert(entry.timeLimit > 0, 'catalog entry has positive timeLimit');
  });

  // Check all archetypes represented
  PC.PUZZLE_ARCHETYPES.forEach(function(archetype) {
    var found = catalog.filter(function(e) { return e.archetype === archetype; });
    assertEqual(found.length, 5, 'catalog has 5 entries for ' + archetype);
  });

  // All tiers represented for each archetype
  for (var t = 1; t <= 5; t++) {
    var tierEntries = catalog.filter(function(e) { return e.tier === t; });
    assertEqual(tierEntries.length, PC.PUZZLE_ARCHETYPES.length, 'catalog has all archetypes for tier ' + t);
  }
});

// ============================================================================
// SUITE 24: DETERMINISM ACROSS ALL ARCHETYPES
// ============================================================================

suite('Determinism Across Archetypes', function() {

  PC.PUZZLE_ARCHETYPES.forEach(function(archetype) {
    var p1 = PC.generatePuzzle(archetype, 424242, 3);
    var p2 = PC.generatePuzzle(archetype, 424242, 3);

    assertEqual(p1.id, p2.id, archetype + ': same seed+tier produces same puzzle id');
    assertEqual(p1.archetype, p2.archetype, archetype + ': archetype matches');
    assertEqual(p1.tier, p2.tier, archetype + ': tier matches');
    assertEqual(p1.sparkReward, p2.sparkReward, archetype + ': sparkReward matches');
    assertEqual(p1.timeLimit, p2.timeLimit, archetype + ': timeLimit matches');
    assertDeep(p1.hints, p2.hints, archetype + ': hints match');
  });

  // Different seeds give different puzzles
  var pa = PC.generatePuzzle('sequence', 1, 1);
  var pb = PC.generatePuzzle('sequence', 2, 1);
  assert(pa.id !== pb.id, 'different seeds give different puzzle IDs');
  assert(pa.data.answer !== pb.data.answer || JSON.stringify(pa.data.visible) !== JSON.stringify(pb.data.visible),
    'different seeds give different sequence data');
});

// ============================================================================
// SUITE 25: SEQUENCE GENERATORS
// ============================================================================

suite('Sequence Generators', function() {

  assertEqual(PC.SEQUENCE_GENERATORS.length, 5, 'There are exactly 5 sequence generators');

  var generatorIds = PC.SEQUENCE_GENERATORS.map(function(g) { return g.id; });
  assert(generatorIds.indexOf('arithmetic') !== -1, 'arithmetic generator exists');
  assert(generatorIds.indexOf('geometric') !== -1, 'geometric generator exists');
  assert(generatorIds.indexOf('fibonacci_like') !== -1, 'fibonacci_like generator exists');
  assert(generatorIds.indexOf('squares') !== -1, 'squares generator exists');
  assert(generatorIds.indexOf('triangular') !== -1, 'triangular generator exists');

  // Each generator has generate function
  PC.SEQUENCE_GENERATORS.forEach(function(gen) {
    assertType(gen.generate, 'function', 'generator ' + gen.id + ' has generate function');
  });

  // Test each generator produces valid numeric sequences
  PC.SEQUENCE_GENERATORS.forEach(function(gen) {
    var rng = PC.mulberry32(99);
    var result = gen.generate(rng, 2);
    assert(Array.isArray(result.visible), gen.id + ' produces visible array');
    assertType(result.answer, 'number', gen.id + ' produces numeric answer');
    assertType(result.rule, 'string', gen.id + ' produces rule string');
    assertType(result.type, 'string', gen.id + ' produces type string');
  });

  // Arithmetic: verify last element follows rule
  var arithRng = PC.mulberry32(42);
  var arith = PC.SEQUENCE_GENERATORS.filter(function(g) { return g.id === 'arithmetic'; })[0];
  var arithResult = arith.generate(arithRng, 1);
  // Check that consecutive differences are equal
  var diffs = [];
  var vis = arithResult.visible;
  for (var i = 1; i < vis.length; i++) diffs.push(vis[i] - vis[i-1]);
  var allSameDiff = diffs.every(function(d) { return d === diffs[0]; });
  assert(allSameDiff, 'arithmetic sequence has equal consecutive differences');
  assertEqual(arithResult.answer, vis[vis.length - 1] + diffs[0], 'arithmetic answer follows rule');

  // Fibonacci-like: each element = sum of previous two
  var fibRng = PC.mulberry32(77);
  var fib = PC.SEQUENCE_GENERATORS.filter(function(g) { return g.id === 'fibonacci_like'; })[0];
  var fibResult = fib.generate(fibRng, 2);
  var fibVis = fibResult.visible;
  for (var j = 2; j < fibVis.length; j++) {
    assertEqual(fibVis[j], fibVis[j-1] + fibVis[j-2], 'fibonacci element ' + j + ' = sum of previous two');
  }
});

// ============================================================================
// SUITE 26: DAILY BONUS EDGE CASES
// ============================================================================

suite('Daily Puzzle Bonus Edge Cases', function() {

  freshPC();

  // Daily bonus is added to final reward
  var pid = uid();
  var dp = PC.getDailyPuzzle('2026-02-22');
  var session = PC.startSession(pid, dp);
  var result = PC.submitAnswer(session.id, dp.answer);
  assert(result.correct, 'daily puzzle solved correctly');
  assertEqual(result.reward.dailyBonus, dp.dailyBonus, 'daily bonus included in reward');
  assert(result.reward.spark >= dp.sparkReward, 'daily puzzle spark includes bonus');

  // Non-daily puzzle has no daily bonus
  var normalPuzzle = PC.generatePuzzle('sequence', 1, 1);
  var normalSession = PC.startSession(pid, normalPuzzle);
  var normalResult = PC.submitAnswer(normalSession.id, normalPuzzle.data.answer);
  assert(normalResult.correct, 'normal puzzle solved correctly');
  assertEqual(normalResult.reward.dailyBonus, 0, 'non-daily puzzle has 0 daily bonus');

  // Daily bonus is 50% of base reward
  assert(dp.dailyBonus === Math.round(dp.sparkReward * 0.5), 'daily bonus = 50% of sparkReward');
});

// ============================================================================
// SUITE 27: RESET ALL
// ============================================================================

suite('Reset All', function() {

  // Add some data
  var pid = uid();
  PC.updateLeaderboard('sequence_t1', { playerId: pid, playerName: 'Test', solveTime: 10, tier: 1, timestamp: 1 });
  var room = PC.createCoopRoom(pid, 'sequence', 1, 1);
  var puzzle = PC.generatePuzzle('sequence', 1, 1);
  var session = PC.startSession(pid, puzzle);
  PC.getPlayerStats(pid);

  // Reset
  PC.resetAll();

  // Verify cleared
  var lb = PC.getLeaderboard('sequence', 1);
  assertEqual(lb.length, 0, 'leaderboard cleared after resetAll');

  var rooms = PC.listCoopRooms();
  assertEqual(rooms.length, 0, 'coop rooms cleared after resetAll');

  // Session cleared (getSession returns null)
  assert(PC.getSession(session.id) === null, 'sessions cleared after resetAll');

  // Stats reset
  var freshStats = PC.getPlayerStats(pid);
  assertEqual(freshStats.solved_count, 0, 'player stats reset after resetAll');
});

// ============================================================================
// SUITE 28: SEQUENCE PUZZLE — VALIDATE EDGE CASES
// ============================================================================

suite('Sequence Puzzle Validate Edge Cases', function() {

  var p = PC.generateSequencePuzzle(9999, 2);

  assert(p.validate(p.data.answer), 'validate correct number');
  assert(!p.validate(NaN), 'validate rejects NaN');
  assert(!p.validate(undefined), 'validate rejects undefined');
  assert(!p.validate(null), 'validate rejects null');
  assert(!p.validate([p.data.answer]), 'validate rejects array');
  assert(!p.validate({ value: p.data.answer }), 'validate rejects object with correct value');
  assert(p.validate(String(p.data.answer)), 'validate accepts string form of correct number');
  assert(p.validate('  ' + p.data.answer + '  '), 'validate handles whitespace around number');

  // Validate wrong by exactly 1
  assert(!p.validate(p.data.answer + 1), 'validate rejects answer+1');
  assert(!p.validate(p.data.answer - 1), 'validate rejects answer-1');
});

// ============================================================================
// SUITE 29: RIDDLE BANK COMPLETENESS
// ============================================================================

suite('Riddle Bank Completeness', function() {

  // Check riddle bank size
  assert(PC.RIDDLE_BANK.length >= 30, 'RIDDLE_BANK has at least 30 riddles');

  // All required fields
  PC.RIDDLE_BANK.forEach(function(r) {
    assertType(r.id, 'string', 'riddle ' + r.id + ' has id string');
    assertType(r.question, 'string', 'riddle ' + r.id + ' has question string');
    assertType(r.answer, 'string', 'riddle ' + r.id + ' has answer string');
    assert(Array.isArray(r.hints), 'riddle ' + r.id + ' has hints array');
    assert(r.hints.length >= 1, 'riddle ' + r.id + ' has at least 1 hint');
    assertRange(r.tier, 1, 5, 'riddle ' + r.id + ' tier in 1-5 range');
    assert(r.question.length > 10, 'riddle ' + r.id + ' question is non-trivial');
    assert(r.answer.length >= 1, 'riddle ' + r.id + ' answer is non-empty');
  });

  // Coverage per tier
  for (var t = 1; t <= 5; t++) {
    var tierRiddles = PC.RIDDLE_BANK.filter(function(r) { return r.tier === t; });
    assert(tierRiddles.length >= 1, 'RIDDLE_BANK has at least 1 riddle for tier ' + t);
  }

  // Unique riddle IDs
  var ids = PC.RIDDLE_BANK.map(function(r) { return r.id; });
  var uniqueIds = ids.filter(function(id, i) { return ids.indexOf(id) === i; });
  assertEqual(ids.length, uniqueIds.length, 'all riddle IDs in bank are unique');
});

// ============================================================================
// SUITE 30: LOGIC GRID — CLUE STRUCTURE
// ============================================================================

suite('Logic Grid Clue Structure', function() {

  var p = PC.generateLogicGridPuzzle(314159, 3);

  assert(p.data.clues.length >= 2, 'logic grid has at least 2 clues');
  p.data.clues.forEach(function(clue, i) {
    assertType(clue.type, 'string', 'clue ' + i + ' has type');
    assertType(clue.text, 'string', 'clue ' + i + ' has text');
    assert(clue.text.length > 0, 'clue ' + i + ' text is non-empty');
    var validTypes = ['direct', 'negative', 'relative'];
    assert(validTypes.indexOf(clue.type) !== -1, 'clue ' + i + ' has valid type');
  });

  // Direct clues have encoded row/col
  var directClues = p.data.clues.filter(function(c) { return c.type === 'direct'; });
  directClues.forEach(function(clue) {
    assertExists(clue.encoded.row, 'direct clue has encoded.row');
    assertExists(clue.encoded.col, 'direct clue has encoded.col');
    assertEqual(clue.encoded.is, true, 'direct clue has encoded.is = true');
  });

  // Negative clues have encoded.is = false
  var negClues = p.data.clues.filter(function(c) { return c.type === 'negative'; });
  negClues.forEach(function(clue) {
    assert(clue.encoded.is === false, 'negative clue has encoded.is = false');
  });

  // Grid size scales with tier
  for (var t = 1; t <= 5; t++) {
    var pg = PC.generateLogicGridPuzzle(1, t);
    assert(pg.data.size >= 2, 'logic grid size >= 2 for tier ' + t);
    assert(pg.data.size <= 4, 'logic grid size <= 4 for tier ' + t);
    assertEqual(pg.data.rows.length, pg.data.size, 'rows.length matches size for tier ' + t);
    assertEqual(pg.data.cols.length, pg.data.size, 'cols.length matches size for tier ' + t);
  }
});

// ============================================================================
// SUITE 31: PATTERN PUZZLE — PERIOD VERIFICATION
// ============================================================================

suite('Pattern Puzzle Period Verification', function() {

  for (var t = 1; t <= 5; t++) {
    (function(tier) {
      var p = PC.generatePatternPuzzle(271828, tier);
      var seq = p.data.sequence;
      var period = p.data.period;

      assert(period >= 2, 'pattern period >= 2 for tier ' + tier);

      // Verify the sequence follows the pattern period
      if (seq.length >= period * 2) {
        for (var i = period; i < Math.min(seq.length, period * 2); i++) {
          assertEqual(seq[i].color, seq[i % period].color,
            'pattern color at position ' + i + ' matches period for tier ' + tier);
          assertEqual(seq[i].shape, seq[i % period].shape,
            'pattern shape at position ' + i + ' matches period for tier ' + tier);
        }
      }

      // Answer position follows period
      var answerPos = seq.length; // 0-indexed position of answer
      var expectedAnswer = seq[answerPos % period];
      if (expectedAnswer) {
        assertDeep(p.answer, expectedAnswer, 'pattern answer follows period rule for tier ' + tier);
      }
    })(t);
  }
});

// ============================================================================
// SUITE 32: CIPHER — CAESAR ROUNDTRIP
// ============================================================================

suite('Cipher Caesar Roundtrip', function() {

  // For multiple seeds at tier 1, verify ciphertext decodes to answer
  var seeds = [1001, 2002, 3003, 4004, 5005];
  seeds.forEach(function(seed) {
    var p = PC.generateCipherPuzzle(seed, 1);
    assertEqual(p.data.cipherType, 'caesar', 'tier 1 is caesar for seed ' + seed);
    var shift = p.data.cipherType === 'caesar' ? p.data.shift : 0;

    // Manually decode ciphertext using shift
    var decoded = p.data.ciphertext.split('').map(function(c) {
      var idx = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(c);
      if (idx === -1) return c;
      return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[(idx - shift + 26) % 26];
    }).join('');

    assertEqual(decoded, p.answer, 'caesar cipher decodes to answer for seed ' + seed);
  });

  // Tier 3 atbash roundtrip
  var p3 = PC.generateCipherPuzzle(7777, 3);
  var reEncoded = p3.answer.split('').map(function(c) {
    var idx = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(c);
    if (idx === -1) return c;
    return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[25 - idx];
  }).join('');
  assertEqual(reEncoded, p3.data.ciphertext, 'atbash: re-encoding plaintext gives ciphertext');
});

// ============================================================================
// SUITE 33: SESSION EXPIRY SIMULATION
// ============================================================================

suite('Session Expiry Simulation', function() {

  freshPC();

  var pid = uid();

  // submitAnswer on a solved session should return already_solved
  var puzzle = PC.generatePuzzle('riddle', 1, 1);
  var session = PC.startSession(pid, puzzle);
  PC.submitAnswer(session.id, puzzle.answer);
  var secondSubmit = PC.submitAnswer(session.id, puzzle.answer);
  assertEqual(secondSubmit.error, 'already_solved', 'second submit on solved session returns already_solved');

  // isSessionExpired false for fresh unsolved
  var p2 = PC.generatePuzzle('sequence', 2, 1);
  var s2 = PC.startSession(pid, p2);
  assert(!PC.isSessionExpired(s2.id), 'fresh session is not expired');

  // isSessionExpired true for nonexistent
  assert(PC.isSessionExpired('fake_session_id'), 'nonexistent session reports as expired');
});

// ============================================================================
// SUITE 34: PUZZLE ID FORMAT
// ============================================================================

suite('Puzzle ID Format', function() {

  var archetypes = PC.PUZZLE_ARCHETYPES;
  archetypes.forEach(function(archetype) {
    var p = PC.generatePuzzle(archetype, 123, 2);
    assertType(p.id, 'string', archetype + ' puzzle has string id');
    assert(p.id.length > 0, archetype + ' puzzle id is non-empty');
    assert(p.id.indexOf(archetype.substring(0, 3)) !== -1 || p.id.length > 5,
      archetype + ' puzzle id contains meaningful content');
  });

  // Tier and seed in ID
  var seqP = PC.generateSequencePuzzle(99, 3);
  assert(seqP.id.indexOf('seq') !== -1, 'sequence puzzle id contains "seq"');
  assert(seqP.id.indexOf('99') !== -1, 'sequence puzzle id contains seed');
  assert(seqP.id.indexOf('3') !== -1, 'sequence puzzle id contains tier');
});

// ============================================================================
// SUITE 35: COLLABORATIVE — REWARD SCALING
// ============================================================================

suite('Collaborative Reward Scaling', function() {

  for (var t = 1; t <= 5; t++) {
    (function(tier) {
      var p = PC.generateCollaborativePuzzle(11111, tier);
      var expectedStages = 2 + tier;
      var expectedReward = PC.DIFFICULTY_TIERS[tier].sparkBase * expectedStages;
      assertEqual(p.sparkReward, expectedReward, 'collaborative sparkReward = base * stages for tier ' + tier);
    })(t);
  }
});

// ============================================================================
// SUITE 36: MULTIPLE PLAYER SESSIONS
// ============================================================================

suite('Multiple Player Sessions', function() {

  freshPC();

  var players = [uid(), uid(), uid()];
  var puzzle = PC.generatePuzzle('riddle', 5555, 1);

  // Each player gets independent session
  var sessions = players.map(function(pid) {
    return PC.startSession(pid, puzzle);
  });

  // All sessions are unique
  var ids = sessions.map(function(s) { return s.id; });
  var uniqueIds = ids.filter(function(id, i) { return ids.indexOf(id) === i; });
  assertEqual(ids.length, uniqueIds.length, 'all session IDs are unique across players');

  // Player 1 solving does not affect Player 2
  PC.submitAnswer(sessions[0].id, puzzle.answer);
  var s2 = PC.getSession(sessions[1].id);
  assert(!s2.solved, 'player 2 session unaffected by player 1 solve');

  // Each player can solve independently
  players.forEach(function(pid, i) {
    var result = PC.submitAnswer(sessions[i].id, puzzle.answer);
    assert(result.correct || result.error === 'already_solved',
      'player ' + i + ' can solve puzzle');
  });
});

// ============================================================================
// SUITE 37: LEADERBOARD PER-ARCHETYPE PER-TIER
// ============================================================================

suite('Leaderboard Per-Archetype Per-Tier', function() {

  freshPC();

  // Populate multiple leaderboards
  PC.PUZZLE_ARCHETYPES.forEach(function(archetype) {
    if (archetype === 'collaborative') return;
    for (var t = 1; t <= 3; t++) {
      PC.updateLeaderboard(archetype + '_t' + t, {
        playerId: 'test_player', playerName: 'Test', solveTime: 60, tier: t, timestamp: Date.now()
      });
    }
  });

  // Each leaderboard is independent
  var seqT1 = PC.getLeaderboard('sequence', 1);
  var seqT2 = PC.getLeaderboard('sequence', 2);
  var cipherT1 = PC.getLeaderboard('cipher', 1);

  assertEqual(seqT1.length, 1, 'sequence_t1 has 1 entry');
  assertEqual(seqT2.length, 1, 'sequence_t2 has 1 entry');
  assertEqual(cipherT1.length, 1, 'cipher_t1 has 1 entry');

  // Clear one does not affect others
  PC.clearLeaderboard('sequence', 1);
  assertEqual(PC.getLeaderboard('sequence', 1).length, 0, 'sequence_t1 cleared');
  assertEqual(PC.getLeaderboard('sequence', 2).length, 1, 'sequence_t2 not affected by clear of t1');
});

// ============================================================================
// SUITE 38: SOLVE VIA SESSION INTEGRATES WITH LEADERBOARD
// ============================================================================

suite('Session Solve Integrates With Leaderboard', function() {

  freshPC();

  var pid = uid();
  var puzzle = PC.generatePuzzle('sequence', 42, 2);
  var session = PC.startSession(pid, puzzle);
  PC.submitAnswer(session.id, puzzle.data.answer);

  // Leaderboard should now have this player
  var lb = PC.getLeaderboard('sequence', 2);
  assert(lb.length >= 1, 'leaderboard populated after solve');
  var entry = lb.filter(function(e) { return e.playerId === pid; });
  assertEqual(entry.length, 1, 'player in leaderboard after solve');
  assert(entry[0].solveTime >= 0, 'solve time recorded in leaderboard');

  // Wrong answer does not go on leaderboard
  var pid2 = uid();
  var puzzle2 = PC.generatePuzzle('sequence', 43, 2);
  var session2 = PC.startSession(pid2, puzzle2);
  PC.submitAnswer(session2.id, -1); // Wrong
  var lb2 = PC.getLeaderboard('sequence', 2);
  var notInLb = lb2.filter(function(e) { return e.playerId === pid2; });
  assertEqual(notInLb.length, 0, 'wrong answer does not add to leaderboard');
});

// ============================================================================
// FINAL REPORT
// ============================================================================

console.log('\n' + '='.repeat(60));
console.log('PUZZLE CHAMBER TEST RESULTS');
console.log('='.repeat(60));
if (failures.length > 0) {
  console.log('\nFailed tests:');
  failures.forEach(function(f) { console.error('  ' + f); });
}
console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
