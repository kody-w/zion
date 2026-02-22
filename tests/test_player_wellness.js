/**
 * tests/test_player_wellness.js
 * Comprehensive tests for the ZION Player Wellness module
 * 125+ tests covering all exported functions, thresholds, bonuses, edge cases.
 *
 * Run with: node tests/test_player_wellness.js
 */

'use strict';

var PW = require('../src/js/player_wellness');

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

// ============================================================================
// HELPERS
// ============================================================================

var playerSeq = 0;
function uid() { return 'player' + (++playerSeq); }

function freshState() {
  return PW.createState();
}

// Tick helpers: 60 ticks per minute
var T = PW.TICKS_PER_MINUTE || 60;

function minuteTicks(m) { return m * T; }
function hourTicks(h) { return h * 60 * T; }

// ============================================================================
// SUITE 1: Module exports
// ============================================================================

suite('Module exports', function() {

  assert(typeof PW === 'object', 'module exports an object');

  // Constants
  assert(Array.isArray(PW.BREAK_THRESHOLDS), 'BREAK_THRESHOLDS is an array');
  assert(Array.isArray(PW.REST_BONUSES), 'REST_BONUSES is an array');

  // Functions
  assert(typeof PW.createState === 'function', 'createState is a function');
  assert(typeof PW.startSession === 'function', 'startSession is a function');
  assert(typeof PW.endSession === 'function', 'endSession is a function');
  assert(typeof PW.checkBreakThreshold === 'function', 'checkBreakThreshold is a function');
  assert(typeof PW.enterAwayMode === 'function', 'enterAwayMode is a function');
  assert(typeof PW.exitAwayMode === 'function', 'exitAwayMode is a function');
  assert(typeof PW.logActivity === 'function', 'logActivity is a function');
  assert(typeof PW.getSessionInfo === 'function', 'getSessionInfo is a function');
  assert(typeof PW.getPlayHabits === 'function', 'getPlayHabits is a function');
  assert(typeof PW.getWellnessScore === 'function', 'getWellnessScore is a function');
  assert(typeof PW.getBreakHistory === 'function', 'getBreakHistory is a function');
  assert(typeof PW.getWellnessJournal === 'function', 'getWellnessJournal is a function');
  assert(typeof PW.addJournalEntry === 'function', 'addJournalEntry is a function');
  assert(typeof PW.getActivityVariety === 'function', 'getActivityVariety is a function');
  assert(typeof PW.getRestBonus === 'function', 'getRestBonus is a function');
  assert(typeof PW.getSessionHistory === 'function', 'getSessionHistory is a function');
  assert(typeof PW.getDailyStats === 'function', 'getDailyStats is a function');
  assert(typeof PW.getWellnessLeaderboard === 'function', 'getWellnessLeaderboard is a function');

});

// ============================================================================
// SUITE 2: BREAK_THRESHOLDS integrity
// ============================================================================

suite('BREAK_THRESHOLDS integrity', function() {

  assertEqual(PW.BREAK_THRESHOLDS.length, 4, 'exactly 4 break thresholds');

  var ids = ['gentle', 'moderate', 'strong', 'urgent'];
  for (var i = 0; i < ids.length; i++) {
    var found = PW.BREAK_THRESHOLDS.some(function(t) { return t.id === ids[i]; });
    assert(found, 'threshold "' + ids[i] + '" exists');
  }

  // Each threshold has required fields
  for (var j = 0; j < PW.BREAK_THRESHOLDS.length; j++) {
    var t = PW.BREAK_THRESHOLDS[j];
    assert(typeof t.id === 'string' && t.id.length > 0, 'threshold[' + j + '] has id');
    assert(typeof t.message === 'string' && t.message.length > 0, 'threshold[' + j + '] has message');
    assert(typeof t.ticks === 'number' && t.ticks > 0, 'threshold[' + j + '] has ticks > 0');
    assert(typeof t.minutes === 'number' && t.minutes > 0, 'threshold[' + j + '] has minutes > 0');
  }

  // Ticks are in ascending order
  var ascending = true;
  for (var k = 1; k < PW.BREAK_THRESHOLDS.length; k++) {
    if (PW.BREAK_THRESHOLDS[k].ticks <= PW.BREAK_THRESHOLDS[k - 1].ticks) {
      ascending = false; break;
    }
  }
  assert(ascending, 'thresholds are in ascending tick order');

  // Verify specific tick values
  var gentle = PW.BREAK_THRESHOLDS.find(function(t) { return t.id === 'gentle'; });
  assertEqual(gentle.ticks, 7200, 'gentle threshold at 7200 ticks (120 min)');
  assertEqual(gentle.minutes, 120, 'gentle threshold at 120 minutes');

  var urgent = PW.BREAK_THRESHOLDS.find(function(t) { return t.id === 'urgent'; });
  assertEqual(urgent.ticks, 18000, 'urgent threshold at 18000 ticks (300 min)');
  assertEqual(urgent.minutes, 300, 'urgent threshold at 300 minutes');

  // Messages must not be punitive (no "you must", "stop", "quit" etc.)
  var punitiveWords = ['stop playing', 'quit', 'you must stop', 'forced'];
  for (var m = 0; m < PW.BREAK_THRESHOLDS.length; m++) {
    var msg = PW.BREAK_THRESHOLDS[m].message.toLowerCase();
    var isPunitive = punitiveWords.some(function(w) { return msg.indexOf(w) !== -1; });
    assert(!isPunitive, 'threshold "' + PW.BREAK_THRESHOLDS[m].id + '" message is not punitive');
  }

});

// ============================================================================
// SUITE 3: REST_BONUSES integrity
// ============================================================================

suite('REST_BONUSES integrity', function() {

  assert(PW.REST_BONUSES.length >= 2, 'at least 2 rest bonus tiers');

  for (var i = 0; i < PW.REST_BONUSES.length; i++) {
    var rb = PW.REST_BONUSES[i];
    assert(typeof rb.id === 'string' && rb.id.length > 0, 'rest bonus[' + i + '] has id');
    assert(typeof rb.sparkMultiplier === 'number', 'rest bonus[' + i + '] has sparkMultiplier');
    assert(rb.sparkMultiplier > 1.0, 'rest bonus[' + i + '] sparkMultiplier > 1.0');
    assert(typeof rb.minBreakTicks === 'number' && rb.minBreakTicks > 0, 'rest bonus[' + i + '] has minBreakTicks');
  }

  // Short rest = +10% (1.10)
  var shortRest = PW.REST_BONUSES.find(function(r) { return r.id === 'short_rest'; });
  assert(shortRest !== undefined, 'short_rest bonus exists');
  assertEqual(shortRest.sparkMultiplier, 1.10, 'short_rest gives 1.10x multiplier');
  assertEqual(shortRest.minBreakTicks, 1800, 'short_rest requires 1800 ticks (30 min)');

  // Full rest = +25% (1.25)
  var fullRest = PW.REST_BONUSES.find(function(r) { return r.id === 'full_rest'; });
  assert(fullRest !== undefined, 'full_rest bonus exists');
  assertEqual(fullRest.sparkMultiplier, 1.25, 'full_rest gives 1.25x multiplier');
  assertEqual(fullRest.minBreakTicks, 3600, 'full_rest requires 3600 ticks (60 min)');

  // Higher tier bonuses have higher multipliers
  var sorted = PW.REST_BONUSES.slice().sort(function(a, b) { return a.minBreakTicks - b.minBreakTicks; });
  var ascending = true;
  for (var j = 1; j < sorted.length; j++) {
    if (sorted[j].sparkMultiplier < sorted[j - 1].sparkMultiplier) { ascending = false; break; }
  }
  assert(ascending, 'longer breaks give higher multipliers');

});

// ============================================================================
// SUITE 4: createState()
// ============================================================================

suite('createState()', function() {

  var s = PW.createState();
  assert(typeof s === 'object', 'createState returns an object');
  assert(typeof s.sessions === 'object', 'state has sessions object');
  assert(typeof s.habits === 'object', 'state has habits object');
  assert(Array.isArray(s.journal), 'state has journal array');
  assert(typeof s.wellnessScores === 'object', 'state has wellnessScores object');
  assert(typeof s.activityLog === 'object', 'state has activityLog object');

  // Initial state is empty
  assertEqual(Object.keys(s.sessions).length, 0, 'sessions starts empty');
  assertEqual(Object.keys(s.habits).length, 0, 'habits starts empty');
  assertEqual(s.journal.length, 0, 'journal starts empty');
  assertEqual(Object.keys(s.wellnessScores).length, 0, 'wellnessScores starts empty');
  assertEqual(Object.keys(s.activityLog).length, 0, 'activityLog starts empty');

  // Two calls return separate objects
  var s2 = PW.createState();
  s2.journal.push({ test: true });
  assertEqual(s.journal.length, 0, 'createState instances are independent');

});

// ============================================================================
// SUITE 5: startSession()
// ============================================================================

suite('startSession()', function() {

  var s = freshState();
  var p = uid();
  var result = PW.startSession(s, p, 1000);

  assert(result.success === true, 'startSession returns success=true');
  assert(typeof result.sessionId === 'string', 'startSession returns sessionId string');
  assert(result.sessionId.length > 0, 'sessionId is non-empty');

  // Session is now active
  var info = PW.getSessionInfo(s, p);
  assert(info.active === true, 'session is active after startSession');
  assertEqual(info.startTick, 1000, 'startTick matches currentTick');

  // Second startSession closes first and starts new
  var result2 = PW.startSession(s, p, 2000);
  assert(result2.success === true, 'second startSession succeeds');
  assert(result2.sessionId !== result.sessionId, 'second session has different ID');

  // History should now have the first session
  var history = PW.getSessionHistory(s, p, 10);
  assertEqual(history.length, 1, 'first session moved to history on re-start');
  assert(history[0].ended === true, 'first session marked ended');

  // Null guards
  var r1 = PW.startSession(null, 'x', 0);
  assert(r1.success === false, 'startSession null state returns failure');
  var r2 = PW.startSession(freshState(), null, 0);
  assert(r2.success === false, 'startSession null playerId returns failure');

  // Different players are independent
  var s2 = freshState();
  var p2 = uid(), p3 = uid();
  PW.startSession(s2, p2, 100);
  PW.startSession(s2, p3, 200);
  var info2 = PW.getSessionInfo(s2, p2);
  var info3 = PW.getSessionInfo(s2, p3);
  assert(info2.active === true && info3.active === true, 'multiple players can have concurrent sessions');
  assertEqual(info2.startTick, 100, 'p2 session has correct startTick');
  assertEqual(info3.startTick, 200, 'p3 session has correct startTick');

});

// ============================================================================
// SUITE 6: endSession()
// ============================================================================

suite('endSession()', function() {

  // Normal end
  var s = freshState();
  var p = uid();
  PW.startSession(s, p, 0);
  var result = PW.endSession(s, p, minuteTicks(90));

  assert(result.success === true, 'endSession returns success=true');
  assert(typeof result.sessionId === 'string', 'endSession returns sessionId');
  assertEqual(result.duration, minuteTicks(90), 'endSession duration correct');
  assertEqual(result.durationMinutes, 90, 'endSession durationMinutes correct');

  // No active session after end
  var info = PW.getSessionInfo(s, p);
  assert(info.active === false, 'session not active after endSession');

  // Session in history
  var history = PW.getSessionHistory(s, p, 5);
  assertEqual(history.length, 1, 'ended session in history');
  assert(history[0].ended === true, 'history session marked ended');

  // Break suggestion for long session (60+ minutes)
  assert(result.breakSuggestion !== null, 'breakSuggestion given for 90-min session');
  assert(typeof result.breakSuggestion === 'string', 'breakSuggestion is string');

  // No break suggestion for short session
  var s2 = freshState();
  var p2 = uid();
  PW.startSession(s2, p2, 0);
  var r2 = PW.endSession(s2, p2, minuteTicks(30));
  assert(r2.breakSuggestion === null, 'no breakSuggestion for 30-min session');

  // endSession without active session
  var s3 = freshState();
  var p3 = uid();
  var r3 = PW.endSession(s3, p3, 1000);
  assert(r3.success === false, 'endSession without session returns failure');
  assertEqual(r3.reason, 'no_active_session', 'reason is no_active_session');

  // Null guards
  var r4 = PW.endSession(null, 'x', 0);
  assert(r4.success === false, 'endSession null state returns failure');
  var r5 = PW.endSession(freshState(), null, 0);
  assert(r5.success === false, 'endSession null player returns failure');

  // Longest session tracked
  var s4 = freshState();
  var p4 = uid();
  PW.startSession(s4, p4, 0);
  PW.endSession(s4, p4, hourTicks(3));
  var habits = PW.getPlayHabits(s4, p4);
  assertEqual(habits.longestSessionTicks, hourTicks(3), 'longestSession tracked after endSession');

  // Journal entry added on end
  var s5 = freshState();
  var p5 = uid();
  PW.startSession(s5, p5, 0);
  PW.endSession(s5, p5, minuteTicks(45));
  var journal = PW.getWellnessJournal(s5, p5, 10);
  assert(journal.length >= 1, 'journal entry created on endSession');
  assertEqual(journal[0].type, 'session_end', 'journal entry type is session_end');

});

// ============================================================================
// SUITE 7: checkBreakThreshold()
// ============================================================================

suite('checkBreakThreshold()', function() {

  // No threshold before 120 min
  var s = freshState();
  var p = uid();
  PW.startSession(s, p, 0);
  var result = PW.checkBreakThreshold(s, p, minuteTicks(119));
  assert(result === null, 'no threshold triggered at 119 minutes');

  // Gentle at exactly 120 min
  var s2 = freshState();
  var p2 = uid();
  PW.startSession(s2, p2, 0);
  var r2 = PW.checkBreakThreshold(s2, p2, minuteTicks(120));
  assert(r2 !== null, 'gentle threshold triggered at 120 minutes');
  assertEqual(r2.threshold, 'gentle', 'threshold id is gentle');
  assert(typeof r2.message === 'string' && r2.message.length > 0, 'threshold has message');
  assertEqual(r2.elapsedMinutes, 120, 'elapsedMinutes is 120');

  // Same threshold not re-triggered
  var r2b = PW.checkBreakThreshold(s2, p2, minuteTicks(125));
  assert(r2b === null, 'gentle threshold not re-triggered after first trigger');

  // Moderate at 180 min
  var s3 = freshState();
  var p3 = uid();
  PW.startSession(s3, p3, 0);
  PW.checkBreakThreshold(s3, p3, minuteTicks(120)); // trigger gentle first
  var r3 = PW.checkBreakThreshold(s3, p3, minuteTicks(180));
  assert(r3 !== null, 'moderate threshold triggered at 180 minutes');
  assertEqual(r3.threshold, 'moderate', 'threshold id is moderate');

  // Strong at 240 min
  var s4 = freshState();
  var p4 = uid();
  PW.startSession(s4, p4, 0);
  PW.checkBreakThreshold(s4, p4, minuteTicks(120));
  PW.checkBreakThreshold(s4, p4, minuteTicks(180));
  var r4 = PW.checkBreakThreshold(s4, p4, minuteTicks(240));
  assert(r4 !== null, 'strong threshold triggered at 240 minutes');
  assertEqual(r4.threshold, 'strong', 'threshold id is strong');

  // Urgent at 300 min
  var s5 = freshState();
  var p5 = uid();
  PW.startSession(s5, p5, 0);
  PW.checkBreakThreshold(s5, p5, minuteTicks(120));
  PW.checkBreakThreshold(s5, p5, minuteTicks(180));
  PW.checkBreakThreshold(s5, p5, minuteTicks(240));
  var r5 = PW.checkBreakThreshold(s5, p5, minuteTicks(300));
  assert(r5 !== null, 'urgent threshold triggered at 300 minutes');
  assertEqual(r5.threshold, 'urgent', 'threshold id is urgent');

  // No active session returns null
  var r6 = PW.checkBreakThreshold(freshState(), uid(), 99999);
  assert(r6 === null, 'no threshold without active session');

  // Null guards
  assert(PW.checkBreakThreshold(null, 'x', 0) === null, 'null state returns null');
  assert(PW.checkBreakThreshold(freshState(), null, 0) === null, 'null playerId returns null');

  // Away time excluded from elapsed
  var s7 = freshState();
  var p7 = uid();
  PW.startSession(s7, p7, 0);
  PW.enterAwayMode(s7, p7, minuteTicks(60));
  PW.exitAwayMode(s7, p7, minuteTicks(120)); // 60 min away
  // Elapsed = 180 min total - 60 min away = 120 min exactly
  var r7 = PW.checkBreakThreshold(s7, p7, minuteTicks(180));
  // At 120 min active time, gentle should trigger
  assert(r7 !== null, 'away time excluded from elapsed; gentle triggers at 120 active minutes');

});

// ============================================================================
// SUITE 8: enterAwayMode() and exitAwayMode()
// ============================================================================

suite('enterAwayMode() and exitAwayMode()', function() {

  var s = freshState();
  var p = uid();
  PW.startSession(s, p, 0);

  // Enter away
  var enter = PW.enterAwayMode(s, p, minuteTicks(30));
  assert(enter.success === true, 'enterAwayMode returns success=true');

  var info = PW.getSessionInfo(s, p);
  assert(info.awayMode === true, 'awayMode is true after entering');

  // Can't enter twice
  var enter2 = PW.enterAwayMode(s, p, minuteTicks(35));
  assert(enter2.success === false, 'cannot enter away mode twice');
  assertEqual(enter2.reason, 'already_away', 'reason is already_away');

  // Exit away — 30-minute break
  var exit = PW.exitAwayMode(s, p, minuteTicks(60));
  assert(exit.success === true, 'exitAwayMode returns success=true');
  assertEqual(exit.awayMinutes, 30, 'awayMinutes is 30');
  assert(exit.restBonus !== null, 'rest bonus awarded for 30-min break');
  assertEqual(exit.restBonus.id, 'short_rest', 'short_rest bonus for 30-min break');
  assertEqual(exit.restBonus.multiplier, 1.10, 'short_rest multiplier is 1.10');

  var infoAfter = PW.getSessionInfo(s, p);
  assert(infoAfter.awayMode === false, 'awayMode is false after exiting');

  // Can't exit when not away
  var exit2 = PW.exitAwayMode(s, p, minuteTicks(70));
  assert(exit2.success === false, 'cannot exit away when not away');
  assertEqual(exit2.reason, 'not_away', 'reason is not_away');

  // 60-minute break gives full_rest bonus
  var s2 = freshState();
  var p2 = uid();
  PW.startSession(s2, p2, 0);
  PW.enterAwayMode(s2, p2, 0);
  var exit3 = PW.exitAwayMode(s2, p2, minuteTicks(60));
  assert(exit3.restBonus !== null, 'full_rest bonus for 60-min break');
  assertEqual(exit3.restBonus.id, 'full_rest', 'full_rest for 60-min break');
  assertEqual(exit3.restBonus.multiplier, 1.25, 'full_rest multiplier is 1.25');

  // Short break gives no bonus
  var s3 = freshState();
  var p3 = uid();
  PW.startSession(s3, p3, 0);
  PW.enterAwayMode(s3, p3, 0);
  var exit4 = PW.exitAwayMode(s3, p3, minuteTicks(10));
  assert(exit4.restBonus === null, 'no rest bonus for 10-min break');

  // No active session
  var r = PW.enterAwayMode(freshState(), uid(), 0);
  assert(r.success === false, 'enterAwayMode without session fails');

  // Null guards
  assert(PW.enterAwayMode(null, 'x', 0).success === false, 'enterAwayMode null state fails');
  assert(PW.exitAwayMode(null, 'x', 0).success === false, 'exitAwayMode null state fails');

  // Away duration accumulates
  var s4 = freshState();
  var p4 = uid();
  PW.startSession(s4, p4, 0);
  PW.enterAwayMode(s4, p4, minuteTicks(30));
  PW.exitAwayMode(s4, p4, minuteTicks(60));
  PW.enterAwayMode(s4, p4, minuteTicks(90));
  PW.exitAwayMode(s4, p4, minuteTicks(120));
  var info4 = PW.getSessionInfo(s4, p4);
  // Two breaks of 30 min each
  assertEqual(info4.breaksCount, 2, 'two breaks recorded');

  // Break count in habits
  var habits4 = PW.getPlayHabits(s4, p4);
  assertEqual(habits4.breakCount, 2, 'breakCount in habits is 2');

});

// ============================================================================
// SUITE 9: logActivity()
// ============================================================================

suite('logActivity()', function() {

  var s = freshState();
  var p = uid();
  PW.startSession(s, p, 0);

  var r = PW.logActivity(s, p, 'fishing', 100);
  assert(r.success === true, 'logActivity returns success=true');
  assertEqual(r.activityType, 'fishing', 'returned activityType is fishing');
  assertEqual(r.totalCount, 1, 'first log gives count=1');

  // Logging same activity increments count
  PW.logActivity(s, p, 'fishing', 200);
  var r2 = PW.logActivity(s, p, 'fishing', 300);
  assertEqual(r2.totalCount, 3, 'count accumulates for same activity');

  // Different activities tracked independently
  PW.logActivity(s, p, 'crafting', 400);
  var variety = PW.getActivityVariety(s, p);
  assert(variety.types.indexOf('fishing') !== -1, 'fishing in activity types');
  assert(variety.types.indexOf('crafting') !== -1, 'crafting in activity types');
  assertEqual(variety.count, 2, 'variety count is 2');

  // Activity tracked in current session
  var sessionTypes = variety.sessionTypes;
  assert(sessionTypes.indexOf('fishing') !== -1, 'fishing in session types');
  assert(sessionTypes.indexOf('crafting') !== -1, 'crafting in session types');

  // Null guards
  var r3 = PW.logActivity(null, 'x', 'fishing', 0);
  assert(r3.success === false, 'logActivity null state fails');
  var r4 = PW.logActivity(freshState(), null, 'fishing', 0);
  assert(r4.success === false, 'logActivity null player fails');
  var r5 = PW.logActivity(freshState(), uid(), null, 0);
  assert(r5.success === false, 'logActivity null activity fails');

  // Activity type not in session if no active session
  var s2 = freshState();
  var p2 = uid();
  // No session started
  PW.logActivity(s2, p2, 'trading', 100);
  var variety2 = PW.getActivityVariety(s2, p2);
  assert(variety2.types.indexOf('trading') !== -1, 'activity logged even without session');
  assertEqual(variety2.sessionTypes.length, 0, 'no session types without active session');

});

// ============================================================================
// SUITE 10: getSessionInfo()
// ============================================================================

suite('getSessionInfo()', function() {

  // No session
  var s = freshState();
  var p = uid();
  var info = PW.getSessionInfo(s, p);
  assert(info !== null, 'getSessionInfo returns object even with no session');
  assert(info.active === false, 'active=false with no session');

  // Active session
  PW.startSession(s, p, 5000);
  var info2 = PW.getSessionInfo(s, p);
  assert(info2.active === true, 'active=true after startSession');
  assertEqual(info2.startTick, 5000, 'startTick is 5000');
  assert(typeof info2.sessionId === 'string', 'sessionId is string');
  assert(info2.awayMode === false, 'awayMode starts false');
  assertEqual(info2.breaksCount, 0, 'breaksCount starts 0');
  assertEqual(info2.activitiesUsed, 0, 'activitiesUsed starts 0');

  // After logging activities
  PW.logActivity(s, p, 'fishing', 5100);
  PW.logActivity(s, p, 'crafting', 5200);
  var info3 = PW.getSessionInfo(s, p);
  assertEqual(info3.activitiesUsed, 2, 'activitiesUsed reflects logged activities');

  // After break
  PW.enterAwayMode(s, p, 6000);
  PW.exitAwayMode(s, p, 6000 + minuteTicks(45));
  var info4 = PW.getSessionInfo(s, p);
  assertEqual(info4.breaksCount, 1, 'breaksCount is 1 after break');
  assert(info4.totalAwayTicks > 0, 'totalAwayTicks accumulated');

  // Null guards
  assert(PW.getSessionInfo(null, 'x') === null, 'getSessionInfo null state returns null');
  assert(PW.getSessionInfo(freshState(), null) === null, 'getSessionInfo null player returns null');

});

// ============================================================================
// SUITE 11: getPlayHabits()
// ============================================================================

suite('getPlayHabits()', function() {

  // Fresh player — no history
  var s = freshState();
  var p = uid();
  var habits = PW.getPlayHabits(s, p);
  assert(habits !== null, 'getPlayHabits returns object');
  assertEqual(habits.dailyAverageMinutes, 0, 'dailyAverageMinutes=0 for fresh player');
  assertEqual(habits.weeklyTotalMinutes, 0, 'weeklyTotalMinutes=0 for fresh player');
  assertEqual(habits.longestSessionMinutes, 0, 'longestSessionMinutes=0 for fresh player');
  assertEqual(habits.breakCount, 0, 'breakCount=0 for fresh player');
  assertEqual(habits.totalSessions, 0, 'totalSessions=0 for fresh player');

  // After sessions
  PW.startSession(s, p, 0);
  PW.endSession(s, p, minuteTicks(90));  // 90 min session
  PW.startSession(s, p, minuteTicks(90));
  PW.endSession(s, p, minuteTicks(90) + minuteTicks(60)); // 60 min session

  var habits2 = PW.getPlayHabits(s, p);
  assertEqual(habits2.totalSessions, 2, 'totalSessions=2 after two sessions');
  assertEqual(habits2.longestSessionMinutes, 90, 'longestSessionMinutes=90');
  assert(habits2.dailyAverageMinutes > 0, 'dailyAverage > 0 after sessions');

  // Null guards
  assert(PW.getPlayHabits(null, 'x') === null, 'getPlayHabits null state returns null');
  assert(PW.getPlayHabits(freshState(), null) === null, 'getPlayHabits null player returns null');

  // Longest session is updated
  var s2 = freshState();
  var p2 = uid();
  PW.startSession(s2, p2, 0);
  PW.endSession(s2, p2, hourTicks(4)); // 4 hours
  var habits3 = PW.getPlayHabits(s2, p2);
  assertEqual(habits3.longestSessionMinutes, 240, 'longestSession = 240 min for 4-hour session');

});

// ============================================================================
// SUITE 12: getWellnessScore()
// ============================================================================

suite('getWellnessScore()', function() {

  // Fresh player returns baseline
  var s = freshState();
  var p = uid();
  var score = PW.getWellnessScore(s, p);
  assert(typeof score === 'number', 'getWellnessScore returns number');
  assert(score >= 0 && score <= 100, 'score in range [0,100] for fresh player');

  // Score after sessions and breaks
  var s2 = freshState();
  var p2 = uid();
  // Do 3 sessions with breaks
  for (var i = 0; i < 3; i++) {
    PW.startSession(s2, p2, i * hourTicks(4));
    PW.logActivity(s2, p2, 'fishing', i * hourTicks(4) + 100);
    PW.logActivity(s2, p2, 'crafting', i * hourTicks(4) + 200);
    PW.logActivity(s2, p2, 'trading', i * hourTicks(4) + 300);
    PW.logActivity(s2, p2, 'exploring', i * hourTicks(4) + 400);
    PW.enterAwayMode(s2, p2, i * hourTicks(4) + hourTicks(1));
    PW.exitAwayMode(s2, p2, i * hourTicks(4) + hourTicks(1) + minuteTicks(45));
    PW.endSession(s2, p2, i * hourTicks(4) + hourTicks(2));
  }
  var score2 = PW.getWellnessScore(s2, p2);
  assert(score2 > 50, 'score > 50 for player with good habits (breaks + variety)');
  assert(score2 <= 100, 'score capped at 100');

  // Score is 0 minimum
  assert(score >= 0, 'score never negative');

  // Null guards
  assertEqual(PW.getWellnessScore(null, 'x'), 0, 'null state returns 0');
  assertEqual(PW.getWellnessScore(freshState(), null), 0, 'null player returns 0');

  // Score is stored in wellnessScores
  var s3 = freshState();
  var p3 = uid();
  PW.startSession(s3, p3, 0);
  PW.endSession(s3, p3, minuteTicks(60));
  PW.getWellnessScore(s3, p3);
  assert(s3.wellnessScores[p3] !== undefined, 'wellnessScores entry exists after getWellnessScore');
  assert(typeof s3.wellnessScores[p3].score === 'number', 'score stored in state');

});

// ============================================================================
// SUITE 13: getBreakHistory()
// ============================================================================

suite('getBreakHistory()', function() {

  var s = freshState();
  var p = uid();

  // No breaks
  var empty = PW.getBreakHistory(s, p);
  assert(Array.isArray(empty), 'getBreakHistory returns array');
  assertEqual(empty.length, 0, 'empty array for fresh player');

  // After one break
  PW.startSession(s, p, 0);
  PW.enterAwayMode(s, p, minuteTicks(60));
  PW.exitAwayMode(s, p, minuteTicks(90)); // 30 min break

  var history = PW.getBreakHistory(s, p);
  assertEqual(history.length, 1, 'one break in history');
  var br = history[0];
  assert(typeof br.durationTicks === 'number', 'break has durationTicks');
  assertEqual(br.durationMinutes, 30, 'break durationMinutes=30');

  // Returns a copy
  history.push({ fake: true });
  var history2 = PW.getBreakHistory(s, p);
  assertEqual(history2.length, 1, 'getBreakHistory returns a copy');

  // Multiple breaks
  PW.enterAwayMode(s, p, minuteTicks(120));
  PW.exitAwayMode(s, p, minuteTicks(180)); // another 60 min break
  var history3 = PW.getBreakHistory(s, p);
  assertEqual(history3.length, 2, 'two breaks in history');

  // Null guards
  assert(Array.isArray(PW.getBreakHistory(null, 'x')), 'null state returns array');
  assert(Array.isArray(PW.getBreakHistory(freshState(), null)), 'null player returns array');

});

// ============================================================================
// SUITE 14: getWellnessJournal() and addJournalEntry()
// ============================================================================

suite('getWellnessJournal() and addJournalEntry()', function() {

  var s = freshState();
  var p = uid();

  // Empty journal
  var empty = PW.getWellnessJournal(s, p, 10);
  assert(Array.isArray(empty), 'getWellnessJournal returns array');
  assertEqual(empty.length, 0, 'empty journal for fresh player');

  // Add manual entry
  var add = PW.addJournalEntry(s, p, 'First day in ZION!', 1000);
  assert(add.success === true, 'addJournalEntry returns success=true');
  assert(typeof add.entryIndex === 'number', 'addJournalEntry returns entryIndex');

  var journal = PW.getWellnessJournal(s, p, 10);
  assertEqual(journal.length, 1, 'journal has 1 entry after add');
  assertEqual(journal[0].message, 'First day in ZION!', 'journal entry message correct');
  assertEqual(journal[0].type, 'manual', 'manual entry type is manual');
  assertEqual(journal[0].playerId, p, 'journal entry has correct playerId');

  // Journal entries from endSession are included
  PW.startSession(s, p, 2000);
  PW.endSession(s, p, 2000 + minuteTicks(60));
  var journal2 = PW.getWellnessJournal(s, p, 10);
  assert(journal2.length >= 2, 'journal includes session_end entry');

  // count parameter limits results
  // Add several more entries
  for (var i = 0; i < 8; i++) {
    PW.addJournalEntry(s, p, 'Entry ' + i, 3000 + i);
  }
  var limited = PW.getWellnessJournal(s, p, 3);
  assertEqual(limited.length, 3, 'count=3 returns at most 3 entries');

  // Only player's own entries
  var s2 = freshState();
  var p2 = uid(), p3 = uid();
  PW.addJournalEntry(s2, p2, 'p2 entry', 100);
  PW.addJournalEntry(s2, p3, 'p3 entry', 200);
  var j2 = PW.getWellnessJournal(s2, p2, 10);
  var j3 = PW.getWellnessJournal(s2, p3, 10);
  assertEqual(j2.length, 1, 'p2 sees only own journal entry');
  assertEqual(j3.length, 1, 'p3 sees only own journal entry');

  // Null guards
  assert(Array.isArray(PW.getWellnessJournal(null, 'x', 5)), 'null state returns array');
  assert(Array.isArray(PW.getWellnessJournal(freshState(), null, 5)), 'null player returns array');
  var r = PW.addJournalEntry(null, 'x', 'msg', 0);
  assert(r.success === false, 'addJournalEntry null state fails');
  var r2 = PW.addJournalEntry(freshState(), null, 'msg', 0);
  assert(r2.success === false, 'addJournalEntry null player fails');

  // Object entry
  var s3 = freshState();
  var p4 = uid();
  var r3 = PW.addJournalEntry(s3, p4, { message: 'Object entry', data: 42 }, 500);
  assert(r3.success === true, 'addJournalEntry accepts object entry');

});

// ============================================================================
// SUITE 15: getActivityVariety()
// ============================================================================

suite('getActivityVariety()', function() {

  var s = freshState();
  var p = uid();

  // No activities
  var variety = PW.getActivityVariety(s, p);
  assert(typeof variety === 'object', 'getActivityVariety returns object');
  assert(Array.isArray(variety.types), 'variety.types is array');
  assertEqual(variety.count, 0, 'count=0 for fresh player');
  assert(Array.isArray(variety.sessionTypes), 'variety.sessionTypes is array');

  // Log activities
  PW.startSession(s, p, 0);
  PW.logActivity(s, p, 'fishing', 100);
  PW.logActivity(s, p, 'fishing', 200); // duplicate type
  PW.logActivity(s, p, 'crafting', 300);
  PW.logActivity(s, p, 'trading', 400);

  var variety2 = PW.getActivityVariety(s, p);
  assertEqual(variety2.count, 3, 'variety count=3 for 3 distinct types');
  assert(variety2.types.indexOf('fishing') !== -1, 'fishing in variety types');
  assert(variety2.types.indexOf('crafting') !== -1, 'crafting in variety types');
  assert(variety2.types.indexOf('trading') !== -1, 'trading in variety types');

  // Activity counts preserved
  assert(typeof variety2.activityCounts === 'object', 'activityCounts is object');
  assertEqual(variety2.activityCounts['fishing'], 2, 'fishing logged twice');
  assertEqual(variety2.activityCounts['crafting'], 1, 'crafting logged once');

  // sessionTypes reflects current session
  assertEqual(variety2.sessionCount, 3, 'sessionCount=3 for current session');

  // After session ends, session types empty (new session needed)
  PW.endSession(s, p, minuteTicks(60));
  var variety3 = PW.getActivityVariety(s, p);
  assertEqual(variety3.sessionCount, 0, 'sessionTypes empty after session ends');
  assertEqual(variety3.count, 3, 'overall activity count preserved after session end');

  // Null guards
  var v = PW.getActivityVariety(null, 'x');
  assert(typeof v === 'object', 'null state returns object');
  assertEqual(v.count, 0, 'null state returns count=0');

});

// ============================================================================
// SUITE 16: getRestBonus()
// ============================================================================

suite('getRestBonus()', function() {

  // No session: base multiplier
  var s = freshState();
  var p = uid();
  assertEqual(PW.getRestBonus(s, p), 1.0, 'no session returns 1.0 multiplier');

  // Active session, no break yet
  PW.startSession(s, p, 0);
  assertEqual(PW.getRestBonus(s, p), 1.0, 'active session before break returns 1.0');

  // After 30-min break: short_rest
  PW.enterAwayMode(s, p, 0);
  PW.exitAwayMode(s, p, minuteTicks(30));
  var bonus = PW.getRestBonus(s, p);
  assertEqual(bonus, 1.10, 'rest bonus 1.10 after 30-min break');

  // After 60-min break: full_rest
  var s2 = freshState();
  var p2 = uid();
  PW.startSession(s2, p2, 0);
  PW.enterAwayMode(s2, p2, 0);
  PW.exitAwayMode(s2, p2, minuteTicks(60));
  var bonus2 = PW.getRestBonus(s2, p2);
  assertEqual(bonus2, 1.25, 'rest bonus 1.25 after 60-min break');

  // Bonus resets after session ends
  PW.endSession(s, p, minuteTicks(60));
  assertEqual(PW.getRestBonus(s, p), 1.0, 'rest bonus resets to 1.0 after session ends');

  // Null guard
  assertEqual(PW.getRestBonus(null, 'x'), 1.0, 'null state returns 1.0');

});

// ============================================================================
// SUITE 17: getSessionHistory()
// ============================================================================

suite('getSessionHistory()', function() {

  var s = freshState();
  var p = uid();

  // Empty history
  var empty = PW.getSessionHistory(s, p, 10);
  assert(Array.isArray(empty), 'getSessionHistory returns array');
  assertEqual(empty.length, 0, 'empty history for fresh player');

  // After sessions
  PW.startSession(s, p, 0);
  PW.endSession(s, p, minuteTicks(30));
  PW.startSession(s, p, minuteTicks(30));
  PW.endSession(s, p, minuteTicks(90));

  var history = PW.getSessionHistory(s, p, 10);
  assertEqual(history.length, 2, 'history has 2 sessions');

  // Each session has required fields
  for (var i = 0; i < history.length; i++) {
    assert(typeof history[i].sessionId === 'string', 'session[' + i + '] has sessionId');
    assert(typeof history[i].startTick === 'number', 'session[' + i + '] has startTick');
    assert(history[i].ended === true, 'session[' + i + '] is marked ended');
    assert(typeof history[i].duration === 'number', 'session[' + i + '] has duration');
  }

  // count limits results
  var limited = PW.getSessionHistory(s, p, 1);
  assertEqual(limited.length, 1, 'count=1 returns 1 most recent session');

  // Returns most recent sessions last
  assertEqual(limited[0].startTick, minuteTicks(30), 'most recent session returned with count=1');

  // Returns copy
  history.push({ fake: true });
  var history2 = PW.getSessionHistory(s, p, 10);
  assertEqual(history2.length, 2, 'getSessionHistory returns a copy');

  // Null guards
  assert(Array.isArray(PW.getSessionHistory(null, 'x', 5)), 'null state returns array');
  assert(Array.isArray(PW.getSessionHistory(freshState(), null, 5)), 'null player returns array');

});

// ============================================================================
// SUITE 18: getDailyStats()
// ============================================================================

suite('getDailyStats()', function() {

  // ZION tick day = 1440 ticks (24 min at 60 ticks/min)
  // Sessions are tracked by their startTick's day
  var TICKS_PER_DAY = 1440;

  var s = freshState();
  var p = uid();

  // Start at tick 0 (day 0), end at tick 600 (10 min = day 0 still)
  PW.startSession(s, p, 0);
  PW.endSession(s, p, minuteTicks(10)); // 10 min session, all on day 0

  var stats = PW.getDailyStats(s, p, 0);
  assert(stats !== null, 'getDailyStats returns object');
  assertEqual(stats.day, 0, 'stats.day is 0');
  assertEqual(stats.totalMinutes, 10, 'totalMinutes is 10 for 10-min session started on day 0');
  assertEqual(stats.sessionCount, 1, 'sessionCount is 1');
  assert(Array.isArray(stats.sessions), 'stats.sessions is array');
  assert(Array.isArray(stats.breaks), 'stats.breaks is array');

  // Day with no activity
  var stats2 = PW.getDailyStats(s, p, 999);
  assert(stats2 !== null, 'getDailyStats for day with no activity returns object');
  assertEqual(stats2.totalMinutes, 0, 'totalMinutes=0 for day with no activity');
  assertEqual(stats2.sessionCount, 0, 'sessionCount=0 for day with no activity');

  // Breaks counted for correct day — start session and break on day 0
  var s2 = freshState();
  var p2 = uid();
  PW.startSession(s2, p2, 0);
  PW.enterAwayMode(s2, p2, 100);    // away start on day 0
  PW.exitAwayMode(s2, p2, 400);     // away end on day 0
  PW.endSession(s2, p2, minuteTicks(10));

  var stats3 = PW.getDailyStats(s2, p2, 0);
  assertEqual(stats3.breakCount, 1, 'one break on day 0');

  // Null guards
  assert(PW.getDailyStats(null, 'x', 0) === null, 'null state returns null');
  assert(PW.getDailyStats(freshState(), null, 0) === null, 'null player returns null');

});

// ============================================================================
// SUITE 19: getWellnessLeaderboard()
// ============================================================================

suite('getWellnessLeaderboard()', function() {

  var s = freshState();

  // Empty state
  var empty = PW.getWellnessLeaderboard(s, 10);
  assert(Array.isArray(empty), 'getWellnessLeaderboard returns array');
  assertEqual(empty.length, 0, 'empty leaderboard for fresh state');

  // Add multiple players with different habits
  var players = [];
  for (var i = 0; i < 5; i++) {
    var pid = uid();
    players.push(pid);
    PW.startSession(s, pid, 0);
    PW.endSession(s, pid, minuteTicks(60 * (i + 1)));
    PW.getWellnessScore(s, pid); // ensure score computed
  }

  var lb = PW.getWellnessLeaderboard(s, 10);
  assert(lb.length > 0, 'leaderboard has entries after players play');

  // Each entry has playerId and score
  for (var j = 0; j < lb.length; j++) {
    assert(typeof lb[j].playerId === 'string', 'entry[' + j + '] has playerId');
    assert(typeof lb[j].score === 'number', 'entry[' + j + '] has score');
    assert(lb[j].score >= 0 && lb[j].score <= 100, 'entry[' + j + '] score in [0,100]');
  }

  // Sorted by score descending
  var sorted = true;
  for (var k = 1; k < lb.length; k++) {
    if (lb[k].score > lb[k - 1].score) { sorted = false; break; }
  }
  assert(sorted, 'leaderboard sorted by score descending');

  // count limits results
  var lb2 = PW.getWellnessLeaderboard(s, 3);
  assert(lb2.length <= 3, 'count=3 limits leaderboard to 3 entries');

  // Null guard
  var lb3 = PW.getWellnessLeaderboard(null, 5);
  assert(Array.isArray(lb3), 'null state returns array');
  assertEqual(lb3.length, 0, 'null state returns empty array');

});

// ============================================================================
// SUITE 20: Integration — full session lifecycle
// ============================================================================

suite('Integration — full session lifecycle', function() {

  var s = freshState();
  var p = uid();

  // Start session
  var start = PW.startSession(s, p, 0);
  assert(start.success, 'session started');

  // Log activities
  PW.logActivity(s, p, 'fishing', 100);
  PW.logActivity(s, p, 'crafting', 500);
  PW.logActivity(s, p, 'exploring', 1000);

  // Check no threshold at 1 hour
  var threshold1 = PW.checkBreakThreshold(s, p, hourTicks(1));
  assert(threshold1 === null, 'no threshold at 1 hour');

  // Gentle threshold at 2 hours
  var threshold2 = PW.checkBreakThreshold(s, p, hourTicks(2));
  assert(threshold2 !== null, 'gentle threshold at 2 hours');
  assertEqual(threshold2.threshold, 'gentle', 'gentle threshold triggered');

  // Take a break
  PW.enterAwayMode(s, p, hourTicks(2));
  PW.exitAwayMode(s, p, hourTicks(2) + minuteTicks(45));

  // Rest bonus applied
  var bonus = PW.getRestBonus(s, p);
  assertEqual(bonus, 1.10, 'short_rest bonus after 45-min break');

  // End session
  var end = PW.endSession(s, p, hourTicks(3));
  assert(end.success, 'session ended successfully');
  assert(end.breakSuggestion !== null, 'break suggestion after long session');

  // Check habits
  var habits = PW.getPlayHabits(s, p);
  assertEqual(habits.totalSessions, 1, 'one total session');
  assertEqual(habits.breakCount, 1, 'one break recorded');
  assert(habits.longestSessionMinutes > 0, 'longestSession tracked');

  // Check journal
  var journal = PW.getWellnessJournal(s, p, 5);
  assert(journal.length >= 1, 'journal has entries after session');

  // Check wellness score
  var score = PW.getWellnessScore(s, p);
  assert(score > 0, 'wellness score > 0 after active session');

  // Leaderboard includes player
  var lb = PW.getWellnessLeaderboard(s, 10);
  var inLb = lb.some(function(e) { return e.playerId === p; });
  assert(inLb, 'player appears in wellness leaderboard');

});

// ============================================================================
// SUITE 21: Edge cases
// ============================================================================

suite('Edge cases', function() {

  // Tick 0 session
  var s = freshState();
  var p = uid();
  var r = PW.startSession(s, p, 0);
  assert(r.success === true, 'session starts at tick 0');
  var r2 = PW.endSession(s, p, 0);
  assert(r2.success === true, 'session ends at tick 0 (zero duration)');
  assertEqual(r2.duration, 0, 'zero duration session is valid');

  // Very long session (beyond all thresholds)
  var s2 = freshState();
  var p2 = uid();
  PW.startSession(s2, p2, 0);
  // Trigger all thresholds
  PW.checkBreakThreshold(s2, p2, minuteTicks(120));
  PW.checkBreakThreshold(s2, p2, minuteTicks(180));
  PW.checkBreakThreshold(s2, p2, minuteTicks(240));
  PW.checkBreakThreshold(s2, p2, minuteTicks(300));
  // Past urgent: no further thresholds
  var r3 = PW.checkBreakThreshold(s2, p2, minuteTicks(360));
  assert(r3 === null, 'no new threshold past urgent (all triggered already)');

  // Multiple players — state is isolated
  var s3 = freshState();
  var pa = uid(), pb = uid();
  PW.startSession(s3, pa, 0);
  PW.startSession(s3, pb, 1000);
  PW.endSession(s3, pa, minuteTicks(30));
  var infoA = PW.getSessionInfo(s3, pa);
  var infoB = PW.getSessionInfo(s3, pb);
  assert(infoA.active === false, 'player A session ended');
  assert(infoB.active === true, 'player B session still active');

  // Large tick values
  var s4 = freshState();
  var p4 = uid();
  var bigTick = 999999999;
  PW.startSession(s4, p4, bigTick);
  PW.logActivity(s4, p4, 'fishing', bigTick + 100);
  PW.endSession(s4, p4, bigTick + hourTicks(2));
  var habits4 = PW.getPlayHabits(s4, p4);
  assert(habits4.longestSessionMinutes > 0, 'large tick values handled correctly');

  // getWellnessJournal with count=0 or omitted uses default
  var s5 = freshState();
  var p5 = uid();
  PW.addJournalEntry(s5, p5, 'entry', 100);
  var j5a = PW.getWellnessJournal(s5, p5);
  var j5b = PW.getWellnessJournal(s5, p5, 0);
  assert(Array.isArray(j5a), 'journal without count returns array');
  assert(Array.isArray(j5b), 'journal with count=0 returns array');

  // getSessionHistory with count=0
  var s6 = freshState();
  var p6 = uid();
  PW.startSession(s6, p6, 0);
  PW.endSession(s6, p6, 1000);
  var h6 = PW.getSessionHistory(s6, p6, 0);
  assert(Array.isArray(h6), 'getSessionHistory count=0 returns array');

  // getWellnessLeaderboard default count
  var s7 = freshState();
  for (var i = 0; i < 15; i++) {
    var pid7 = uid();
    PW.startSession(s7, pid7, 0);
    PW.endSession(s7, pid7, minuteTicks(30));
    PW.getWellnessScore(s7, pid7);
  }
  var lb7 = PW.getWellnessLeaderboard(s7);
  assert(lb7.length <= 10, 'default count=10 limits leaderboard');

});

// ============================================================================
// SUITE 22: Wellness journal auto-entries
// ============================================================================

suite('Wellness journal auto-entries', function() {

  var s = freshState();
  var p = uid();

  // Journal starts empty
  assertEqual(PW.getWellnessJournal(s, p, 20).length, 0, 'journal empty at start');

  // Session end auto-creates entry
  PW.startSession(s, p, 0);
  PW.endSession(s, p, minuteTicks(60));

  var journal = PW.getWellnessJournal(s, p, 20);
  assert(journal.length >= 1, 'journal has entry after session end');
  var sessionEntry = journal.find(function(e) { return e.type === 'session_end'; });
  assert(sessionEntry !== undefined, 'session_end entry in journal');
  assert(typeof sessionEntry.durationMinutes === 'number', 'session_end entry has durationMinutes');
  assertEqual(sessionEntry.durationMinutes, 60, 'session_end entry has correct durationMinutes');

  // Multiple sessions — multiple journal entries
  PW.startSession(s, p, minuteTicks(90));
  PW.endSession(s, p, minuteTicks(90) + minuteTicks(45));

  var journal2 = PW.getWellnessJournal(s, p, 20);
  var sessionEntries = journal2.filter(function(e) { return e.type === 'session_end'; });
  assertEqual(sessionEntries.length, 2, 'two session_end entries after two sessions');

  // Manual entries and auto-entries co-exist
  PW.addJournalEntry(s, p, 'Custom note', 5000);
  var journal3 = PW.getWellnessJournal(s, p, 20);
  var manualEntries = journal3.filter(function(e) { return e.type === 'manual'; });
  assert(manualEntries.length >= 1, 'manual entries co-exist with auto entries');

});

// ============================================================================
// SUITE 23: TICKS_PER_MINUTE constant
// ============================================================================

suite('TICKS_PER_MINUTE constant', function() {

  assert(typeof PW.TICKS_PER_MINUTE === 'number', 'TICKS_PER_MINUTE is a number');
  assertEqual(PW.TICKS_PER_MINUTE, 60, 'TICKS_PER_MINUTE is 60');

  // Verify thresholds are consistent with TICKS_PER_MINUTE
  var gentle = PW.BREAK_THRESHOLDS.find(function(t) { return t.id === 'gentle'; });
  assertEqual(gentle.ticks, gentle.minutes * PW.TICKS_PER_MINUTE,
    'gentle ticks = minutes * TICKS_PER_MINUTE');

});

// ============================================================================
// FINAL REPORT
// ============================================================================

console.log('\n============================');
console.log('PLAYER WELLNESS TEST SUITE');
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
