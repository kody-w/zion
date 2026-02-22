/**
 * tests/test_player_wellness_wiring.js
 * Tests for the wellness tiered break system in player_wellness.js
 * Covers: createState, startSession, checkBreakThreshold (all 4 tiers),
 *         single-fire per threshold, enterAwayMode/exitAwayMode rest bonuses,
 *         getWellnessScore (0-100 range)
 */
'use strict';

// ---------------------------------------------------------------------------
// Minimal test harness
// ---------------------------------------------------------------------------

var passed = 0;
var failed = 0;
var currentSuite = '';

function suite(name, fn) {
  currentSuite = name;
  console.log('\n' + name);
  fn();
}

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log('  PASS: ' + msg);
  } else {
    failed++;
    console.log('  FAIL: ' + msg);
  }
}

function assertEqual(a, b, msg) {
  assert(a === b, msg + ' (expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a) + ')');
}

// ---------------------------------------------------------------------------
// Load module
// ---------------------------------------------------------------------------

var PW = require('../src/js/player_wellness');

// ---------------------------------------------------------------------------
// Helper constants from the module
// ---------------------------------------------------------------------------

var TICKS_PER_MINUTE = PW.TICKS_PER_MINUTE; // 60 ticks/min

// Threshold ticks:
//  120 min * 60 ticks/min = 7200 ticks  (gentle)
//  180 min * 60 ticks/min = 10800 ticks (moderate)
//  240 min * 60 ticks/min = 14400 ticks (strong)
//  300 min * 60 ticks/min = 18000 ticks (urgent)

var GENTLE_TICKS   = 120 * TICKS_PER_MINUTE;   // 7200
var MODERATE_TICKS = 180 * TICKS_PER_MINUTE;   // 10800
var STRONG_TICKS   = 240 * TICKS_PER_MINUTE;   // 14400
var URGENT_TICKS   = 300 * TICKS_PER_MINUTE;   // 18000

// Rest bonus thresholds:
//  short_rest: 30 min  = 1800 ticks → ×1.10
//  full_rest:  60 min  = 3600 ticks → ×1.25
var SHORT_REST_TICKS = 30 * TICKS_PER_MINUTE;   // 1800
var FULL_REST_TICKS  = 60 * TICKS_PER_MINUTE;   // 3600

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

suite('Exports', function() {

  assert(typeof PW.createState === 'function', 'createState is exported');
  assert(typeof PW.startSession === 'function', 'startSession is exported');
  assert(typeof PW.endSession === 'function', 'endSession is exported');
  assert(typeof PW.checkBreakThreshold === 'function', 'checkBreakThreshold is exported');
  assert(typeof PW.enterAwayMode === 'function', 'enterAwayMode is exported');
  assert(typeof PW.exitAwayMode === 'function', 'exitAwayMode is exported');
  assert(typeof PW.getWellnessScore === 'function', 'getWellnessScore is exported');
  assert(typeof PW.BREAK_THRESHOLDS === 'object', 'BREAK_THRESHOLDS is exported');
  assert(typeof PW.REST_BONUSES === 'object', 'REST_BONUSES is exported');
  assert(typeof PW.TICKS_PER_MINUTE === 'number', 'TICKS_PER_MINUTE is exported');

});

// ---------------------------------------------------------------------------
// createState
// ---------------------------------------------------------------------------

suite('createState', function() {

  var state = PW.createState();
  assert(state !== null && typeof state === 'object', 'createState returns an object');
  assert(typeof state.sessions === 'object', 'state.sessions exists');
  assert(typeof state.habits === 'object', 'state.habits exists');
  assert(Array.isArray(state.journal), 'state.journal is an array');
  assert(typeof state.wellnessScores === 'object', 'state.wellnessScores exists');
  assert(typeof state.activityLog === 'object', 'state.activityLog exists');

});

// ---------------------------------------------------------------------------
// startSession
// ---------------------------------------------------------------------------

suite('startSession', function() {

  var state = PW.createState();
  var pid = 'player_start';

  var r = PW.startSession(state, pid, 0);
  assert(r.success === true, 'startSession returns success');
  assert(typeof r.sessionId === 'string', 'sessionId is a string');
  assert(r.sessionId.length > 0, 'sessionId is non-empty');

  // Session should be active
  var sess = state.sessions[pid].current;
  assert(sess !== null, 'current session is set');
  assert(sess.ended === false, 'session is not ended');
  assertEqual(sess.startTick, 0, 'session startTick is 0');
  assertEqual(sess.awayMode, false, 'awayMode starts false');
  assertEqual(sess.totalAwayTicks, 0, 'totalAwayTicks starts at 0');

  // Invalid args
  var r2 = PW.startSession(null, pid, 0);
  assert(r2.success === false, 'returns failure when state is null');

});

// ---------------------------------------------------------------------------
// checkBreakThreshold — all four tiers
// ---------------------------------------------------------------------------

suite('checkBreakThreshold — returns null before any threshold', function() {

  var state = PW.createState();
  var pid = 'player_thresh0';
  PW.startSession(state, pid, 0);

  // Only 10 ticks elapsed — well below 120-min threshold
  var result = PW.checkBreakThreshold(state, pid, 10);
  assert(result === null, 'no threshold triggered at 10 ticks');

});

suite('checkBreakThreshold — gentle threshold at 120 min', function() {

  var state = PW.createState();
  var pid = 'player_gentle';
  PW.startSession(state, pid, 0);

  // Advance to exactly gentle threshold
  var result = PW.checkBreakThreshold(state, pid, GENTLE_TICKS);
  assert(result !== null, 'threshold triggered at 120 min (gentle)');
  assertEqual(result.threshold, 'gentle', 'threshold id is "gentle"');
  assert(typeof result.message === 'string', 'message is a string');
  assert(result.message.length > 0, 'message is non-empty');

});

suite('checkBreakThreshold — moderate threshold at 180 min', function() {

  var state = PW.createState();
  var pid = 'player_moderate';
  PW.startSession(state, pid, 0);

  // Skip to moderate (also triggers all earlier ones — call once for each)
  PW.checkBreakThreshold(state, pid, GENTLE_TICKS);     // consumes gentle
  var result = PW.checkBreakThreshold(state, pid, MODERATE_TICKS);
  assert(result !== null, 'threshold triggered at 180 min');
  assertEqual(result.threshold, 'moderate', 'threshold id is "moderate"');

});

suite('checkBreakThreshold — strong threshold at 240 min', function() {

  var state = PW.createState();
  var pid = 'player_strong';
  PW.startSession(state, pid, 0);

  PW.checkBreakThreshold(state, pid, GENTLE_TICKS);
  PW.checkBreakThreshold(state, pid, MODERATE_TICKS);
  var result = PW.checkBreakThreshold(state, pid, STRONG_TICKS);
  assert(result !== null, 'threshold triggered at 240 min');
  assertEqual(result.threshold, 'strong', 'threshold id is "strong"');

});

suite('checkBreakThreshold — urgent threshold at 300 min', function() {

  var state = PW.createState();
  var pid = 'player_urgent';
  PW.startSession(state, pid, 0);

  PW.checkBreakThreshold(state, pid, GENTLE_TICKS);
  PW.checkBreakThreshold(state, pid, MODERATE_TICKS);
  PW.checkBreakThreshold(state, pid, STRONG_TICKS);
  var result = PW.checkBreakThreshold(state, pid, URGENT_TICKS);
  assert(result !== null, 'threshold triggered at 300 min');
  assertEqual(result.threshold, 'urgent', 'threshold id is "urgent"');

});

// ---------------------------------------------------------------------------
// Each threshold fires only once per session
// ---------------------------------------------------------------------------

suite('checkBreakThreshold — each threshold fires only once', function() {

  var state = PW.createState();
  var pid = 'player_once';
  PW.startSession(state, pid, 0);

  var r1 = PW.checkBreakThreshold(state, pid, GENTLE_TICKS);
  assert(r1 !== null, 'first call at gentle fires');

  // Same tick — should not fire again (already recorded)
  var r2 = PW.checkBreakThreshold(state, pid, GENTLE_TICKS);
  assert(r2 === null, 'second call at same tick does not re-fire gentle');

  // Even advancing slightly beyond gentle but still below moderate
  var r3 = PW.checkBreakThreshold(state, pid, GENTLE_TICKS + 100);
  assert(r3 === null, 'gentle already fired — does not fire again');

});

// ---------------------------------------------------------------------------
// enterAwayMode / exitAwayMode — rest bonuses
// ---------------------------------------------------------------------------

suite('enterAwayMode / exitAwayMode — short rest bonus (30 min)', function() {

  var state = PW.createState();
  var pid = 'player_short_rest';
  PW.startSession(state, pid, 0);

  var ea = PW.enterAwayMode(state, pid, 100);
  assert(ea.success === true, 'enterAwayMode succeeds');

  // Exit after 30 min (1800 ticks) worth of away time
  var awayEnd = 100 + SHORT_REST_TICKS;
  var ex = PW.exitAwayMode(state, pid, awayEnd);
  assert(ex.success === true, 'exitAwayMode succeeds');
  assert(ex.restBonus !== null, 'restBonus is returned for 30-min break');
  assertEqual(ex.restBonus.id, 'short_rest', 'restBonus id is short_rest');
  assert(typeof ex.restBonus.multiplier === 'number', 'restBonus.multiplier is a number');
  assert(ex.restBonus.multiplier > 1.0, 'restBonus.multiplier is > 1.0');

});

suite('enterAwayMode / exitAwayMode — full rest bonus (60 min)', function() {

  var state = PW.createState();
  var pid = 'player_full_rest';
  PW.startSession(state, pid, 0);

  PW.enterAwayMode(state, pid, 0);
  var ex = PW.exitAwayMode(state, pid, FULL_REST_TICKS);
  assert(ex.success === true, 'exitAwayMode succeeds after 60 min break');
  assert(ex.restBonus !== null, 'restBonus is returned for 60-min break');
  assertEqual(ex.restBonus.id, 'full_rest', 'restBonus id is full_rest');
  assert(ex.restBonus.multiplier > 1.0, 'full rest multiplier is > 1.0');

  // full_rest bonus should be higher than short_rest
  assert(ex.restBonus.multiplier >= 1.25, 'full rest gives >= 25% bonus');

});

suite('enterAwayMode / exitAwayMode — no bonus for very short break', function() {

  var state = PW.createState();
  var pid = 'player_no_rest';
  PW.startSession(state, pid, 0);

  PW.enterAwayMode(state, pid, 0);
  var ex = PW.exitAwayMode(state, pid, 60); // only 60 ticks = 1 minute
  assert(ex.success === true, 'exitAwayMode succeeds for short break');
  assert(ex.restBonus === null, 'no restBonus for very short break');

});

suite('enterAwayMode — prevents double entry', function() {

  var state = PW.createState();
  var pid = 'player_double_away';
  PW.startSession(state, pid, 0);

  var r1 = PW.enterAwayMode(state, pid, 10);
  assert(r1.success === true, 'first enterAwayMode succeeds');

  var r2 = PW.enterAwayMode(state, pid, 20);
  assert(r2.success === false, 'second enterAwayMode fails (already away)');
  assertEqual(r2.reason, 'already_away', 'reason is already_away');

});

// ---------------------------------------------------------------------------
// getWellnessScore returns 0-100
// ---------------------------------------------------------------------------

suite('getWellnessScore — returns value in 0-100 range', function() {

  var state = PW.createState();
  var pid = 'player_wellness_score';

  var score1 = PW.getWellnessScore(state, pid);
  assert(typeof score1 === 'number', 'getWellnessScore returns a number');
  assert(score1 >= 0 && score1 <= 100, 'score is in [0, 100] range (got ' + score1 + ')');

  // After a session
  PW.startSession(state, pid, 0);
  PW.endSession(state, pid, TICKS_PER_MINUTE * 30); // 30 min session

  var score2 = PW.getWellnessScore(state, pid);
  assert(typeof score2 === 'number', 'getWellnessScore returns a number after session');
  assert(score2 >= 0 && score2 <= 100, 'score stays in [0, 100] after session (got ' + score2 + ')');

});

// ---------------------------------------------------------------------------

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed > 0 ? 1 : 0);
