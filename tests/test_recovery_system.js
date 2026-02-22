/**
 * tests/test_recovery_system.js
 * 135+ tests for the ZION Recovery System
 * Run with: node tests/test_recovery_system.js
 */

'use strict';

var RS = require('../src/js/recovery_system');

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
  assert(JSON.stringify(a) === JSON.stringify(b), msg);
}

// ============================================================================
// HELPERS
// ============================================================================

var seq = 0;
function uid() { return 'player_' + (++seq); }

function freshState() {
  return RS.createState();
}

function playerBankrupt() {
  return { spark: 0, housing: { active: true }, health: 50, reputation: 10 };
}

function playerHealthy() {
  return { spark: 100, housing: { active: true }, health: 100, reputation: 50 };
}

function playerHomeless() {
  return { spark: 50, housing: null, health: 100, reputation: 10 };
}

function playerInjured() {
  return { spark: 50, housing: { active: true }, health: 0, reputation: 10 };
}

function playerDisgraced() {
  return { spark: 50, housing: { active: true }, health: 80, reputation: -60 };
}

// ============================================================================
// SUITE 1: MODULE EXPORTS
// ============================================================================

suite('Module exports', function() {

  assert(typeof RS === 'object', 'module is an object');
  assert(Array.isArray(RS.LOSS_CONDITIONS), 'LOSS_CONDITIONS is an array');
  assert(Array.isArray(RS.RECOVERY_PHASES), 'RECOVERY_PHASES is an array');
  assert(typeof RS.createState === 'function', 'createState is a function');
  assert(typeof RS.checkCondition === 'function', 'checkCondition is a function');
  assert(typeof RS.enterRecovery === 'function', 'enterRecovery is a function');
  assert(typeof RS.getRecoveryPhase === 'function', 'getRecoveryPhase is a function');
  assert(typeof RS.advanceRecovery === 'function', 'advanceRecovery is a function');
  assert(typeof RS.completeRecovery === 'function', 'completeRecovery is a function');
  assert(typeof RS.createDebt === 'function', 'createDebt is a function');
  assert(typeof RS.repayDebt === 'function', 'repayDebt is a function');
  assert(typeof RS.getDebts === 'function', 'getDebts is a function');
  assert(typeof RS.getDebtTotal === 'function', 'getDebtTotal is a function');
  assert(typeof RS.publicApology === 'function', 'publicApology is a function');
  assert(typeof RS.getRecoveryBonus === 'function', 'getRecoveryBonus is a function');
  assert(typeof RS.getNpcAidRate === 'function', 'getNpcAidRate is a function');
  assert(typeof RS.getRecoveryHistory === 'function', 'getRecoveryHistory is a function');
  assert(typeof RS.getRecoveryStats === 'function', 'getRecoveryStats is a function');
  assert(typeof RS.isInRecovery === 'function', 'isInRecovery is a function');

});

// ============================================================================
// SUITE 2: LOSS_CONDITIONS INTEGRITY
// ============================================================================

suite('LOSS_CONDITIONS integrity', function() {

  assertEqual(RS.LOSS_CONDITIONS.length, 4, 'exactly 4 loss conditions');

  var ids = ['bankruptcy', 'homelessness', 'injury', 'disgrace'];
  for (var i = 0; i < ids.length; i++) {
    var found = false;
    for (var j = 0; j < RS.LOSS_CONDITIONS.length; j++) {
      if (RS.LOSS_CONDITIONS[j].id === ids[i]) { found = true; break; }
    }
    assert(found, 'condition "' + ids[i] + '" exists');
  }

  var requiredFields = ['id', 'name', 'description', 'triggerCheck', 'recoverySteps', 'duration', 'npcAidRate', 'severity'];
  var allFields = true;
  for (var k = 0; k < RS.LOSS_CONDITIONS.length; k++) {
    var cond = RS.LOSS_CONDITIONS[k];
    for (var f = 0; f < requiredFields.length; f++) {
      if (!(requiredFields[f] in cond)) { allFields = false; break; }
    }
    if (!allFields) break;
  }
  assert(allFields, 'all conditions have required fields');

  var allTriggers = true;
  for (var t = 0; t < RS.LOSS_CONDITIONS.length; t++) {
    if (typeof RS.LOSS_CONDITIONS[t].triggerCheck !== 'function') { allTriggers = false; break; }
  }
  assert(allTriggers, 'all triggerCheck fields are functions');

  var allSteps = true;
  for (var s = 0; s < RS.LOSS_CONDITIONS.length; s++) {
    if (!Array.isArray(RS.LOSS_CONDITIONS[s].recoverySteps) || RS.LOSS_CONDITIONS[s].recoverySteps.length < 3) {
      allSteps = false; break;
    }
  }
  assert(allSteps, 'all conditions have at least 3 recovery steps');

  var allDurations = true;
  for (var d = 0; d < RS.LOSS_CONDITIONS.length; d++) {
    if (typeof RS.LOSS_CONDITIONS[d].duration !== 'number' || RS.LOSS_CONDITIONS[d].duration <= 0) {
      allDurations = false; break;
    }
  }
  assert(allDurations, 'all conditions have positive numeric duration');

  var allAidRates = true;
  for (var a = 0; a < RS.LOSS_CONDITIONS.length; a++) {
    var rate = RS.LOSS_CONDITIONS[a].npcAidRate;
    if (typeof rate !== 'number' || rate < 0 || rate > 1) { allAidRates = false; break; }
  }
  assert(allAidRates, 'all npcAidRate values are numbers in [0,1]');

  var validSeverities = ['low', 'medium', 'high'];
  var allSeverities = true;
  for (var sv = 0; sv < RS.LOSS_CONDITIONS.length; sv++) {
    if (validSeverities.indexOf(RS.LOSS_CONDITIONS[sv].severity) === -1) { allSeverities = false; break; }
  }
  assert(allSeverities, 'all severity values are low/medium/high');

  // Unique IDs
  var idSet = {};
  var uniqueIds = true;
  for (var u = 0; u < RS.LOSS_CONDITIONS.length; u++) {
    if (idSet[RS.LOSS_CONDITIONS[u].id]) { uniqueIds = false; break; }
    idSet[RS.LOSS_CONDITIONS[u].id] = true;
  }
  assert(uniqueIds, 'all condition IDs are unique');

});

// ============================================================================
// SUITE 3: RECOVERY_PHASES INTEGRITY
// ============================================================================

suite('RECOVERY_PHASES integrity', function() {

  assertEqual(RS.RECOVERY_PHASES.length, 4, 'exactly 4 recovery phases');

  var phaseIds = ['emergency', 'stabilization', 'recovery', 'restored'];
  for (var i = 0; i < phaseIds.length; i++) {
    var found = false;
    for (var j = 0; j < RS.RECOVERY_PHASES.length; j++) {
      if (RS.RECOVERY_PHASES[j].id === phaseIds[i]) { found = true; break; }
    }
    assert(found, 'phase "' + phaseIds[i] + '" exists');
  }

  var requiredPhaseFields = ['id', 'name', 'description', 'tickStart', 'tickEnd', 'xpBonus', 'sparkBonus', 'aidMultiplier'];
  var allFields = true;
  for (var k = 0; k < RS.RECOVERY_PHASES.length; k++) {
    var p = RS.RECOVERY_PHASES[k];
    for (var f = 0; f < requiredPhaseFields.length; f++) {
      if (!(requiredPhaseFields[f] in p)) { allFields = false; break; }
    }
    if (!allFields) break;
  }
  assert(allFields, 'all phases have required fields');

  // Phases must be contiguous and non-overlapping
  var sorted = RS.RECOVERY_PHASES.slice().sort(function(a, b) { return a.tickStart - b.tickStart; });
  var contiguous = true;
  for (var c = 1; c < sorted.length; c++) {
    if (sorted[c].tickStart !== sorted[c - 1].tickEnd) { contiguous = false; break; }
  }
  assert(contiguous, 'phases are contiguous (each tickStart equals previous tickEnd)');

  // Emergency starts at tick 0
  assertEqual(sorted[0].tickStart, 0, 'emergency phase starts at tick 0');

  // XP bonus >= 1.0 for all phases
  var allXpBonuses = true;
  for (var x = 0; x < RS.RECOVERY_PHASES.length; x++) {
    if (RS.RECOVERY_PHASES[x].xpBonus < 1.0) { allXpBonuses = false; break; }
  }
  assert(allXpBonuses, 'all phases have xpBonus >= 1.0');

  // Spark bonus >= 1.0 for all phases
  var allSparkBonuses = true;
  for (var sp = 0; sp < RS.RECOVERY_PHASES.length; sp++) {
    if (RS.RECOVERY_PHASES[sp].sparkBonus < 1.0) { allSparkBonuses = false; break; }
  }
  assert(allSparkBonuses, 'all phases have sparkBonus >= 1.0');

  // Emergency has highest bonuses
  var emergency = null;
  var restored = null;
  for (var ph = 0; ph < RS.RECOVERY_PHASES.length; ph++) {
    if (RS.RECOVERY_PHASES[ph].id === 'emergency') emergency = RS.RECOVERY_PHASES[ph];
    if (RS.RECOVERY_PHASES[ph].id === 'restored') restored = RS.RECOVERY_PHASES[ph];
  }
  assert(emergency !== null, 'emergency phase found');
  assert(restored !== null, 'restored phase found');
  assert(emergency.xpBonus > restored.xpBonus, 'emergency xpBonus is higher than restored xpBonus');
  assert(emergency.sparkBonus > restored.sparkBonus, 'emergency sparkBonus is higher than restored sparkBonus');

});

// ============================================================================
// SUITE 4: createState
// ============================================================================

suite('createState', function() {

  var s = RS.createState();
  assert(typeof s === 'object' && s !== null, 'returns an object');
  assert(typeof s.players === 'object', 'has players property');
  assert(Array.isArray(s.debts), 'has debts array');
  assert(Array.isArray(s.recoveryLog), 'has recoveryLog array');
  assertEqual(s.debts.length, 0, 'debts is empty initially');
  assertEqual(s.recoveryLog.length, 0, 'recoveryLog is empty initially');

  // Two calls return independent states
  var s1 = RS.createState();
  var s2 = RS.createState();
  s1.debts.push({ id: 'test' });
  assertEqual(s2.debts.length, 0, 'states are independent');

});

// ============================================================================
// SUITE 5: checkCondition
// ============================================================================

suite('checkCondition', function() {

  var state = freshState();

  // Healthy player — no condition triggered
  var result = RS.checkCondition(state, 'p1', playerHealthy());
  assert(result.triggered === false, 'healthy player triggers no condition');
  assert(result.condition === null, 'condition is null for healthy player');
  assertEqual(result.severity, 'none', 'severity is none for healthy player');

  // Bankruptcy trigger
  var bankrupt = RS.checkCondition(state, 'p2', playerBankrupt());
  assert(bankrupt.triggered === true, 'zero spark triggers bankruptcy');
  assertEqual(bankrupt.condition.id, 'bankruptcy', 'condition is bankruptcy');
  assertEqual(bankrupt.severity, 'high', 'bankruptcy severity is high');

  // Negative spark also triggers
  var negSpark = RS.checkCondition(state, 'p3', { spark: -5, housing: { active: true }, health: 50, reputation: 10 });
  assert(negSpark.triggered === true, 'negative spark triggers bankruptcy');

  // Homelessness trigger
  var homeless = RS.checkCondition(state, 'p4', playerHomeless());
  assert(homeless.triggered === true, 'no housing triggers homelessness');
  assertEqual(homeless.condition.id, 'homelessness', 'condition is homelessness');

  // Injury trigger
  var injured = RS.checkCondition(state, 'p5', playerInjured());
  assert(injured.triggered === true, 'zero health triggers injury');
  assertEqual(injured.condition.id, 'injury', 'condition is injury');

  // Disgrace trigger
  var disgraced = RS.checkCondition(state, 'p6', playerDisgraced());
  assert(disgraced.triggered === true, 'reputation < -50 triggers disgrace');
  assertEqual(disgraced.condition.id, 'disgrace', 'condition is disgrace');

  // Exactly -50 reputation does NOT trigger disgrace (must be strictly less)
  var borderline = RS.checkCondition(state, 'p7', { spark: 50, housing: { active: true }, health: 80, reputation: -50 });
  // This depends on implementation: triggerCheck is < -50 so -50 should NOT trigger
  assert(borderline.triggered === false || borderline.condition.id !== 'disgrace',
    'reputation of exactly -50 does not trigger disgrace (strictly < -50)');

  // Positive spark does not trigger bankruptcy
  var richPlayer = RS.checkCondition(state, 'p8', { spark: 1, housing: { active: true }, health: 50, reputation: 10 });
  assert(richPlayer.triggered === false || richPlayer.condition.id !== 'bankruptcy',
    'spark of 1 does not trigger bankruptcy');

});

// ============================================================================
// SUITE 6: enterRecovery
// ============================================================================

suite('enterRecovery', function() {

  var state = freshState();
  var pid = uid();

  // Valid entry
  var r = RS.enterRecovery(state, pid, 'bankruptcy', 100);
  assert(r.success === true, 'enterRecovery succeeds for valid condition');
  assert(r.phase !== null, 'phase is returned');
  assert(r.aid !== null, 'aid info is returned');
  assertEqual(r.phase.id, 'emergency', 'starts in emergency phase');
  assert(typeof r.aid.discountRate === 'number', 'aid discountRate is a number');
  assert(r.aid.discountRate > 0, 'aid discountRate is positive');

  // Player is now in recovery
  assert(RS.isInRecovery(state, pid), 'player is in recovery after enterRecovery');

  // Invalid condition ID
  var bad = RS.enterRecovery(state, uid(), 'nonexistent_condition', 0);
  assert(bad.success === false, 'invalid conditionId returns success:false');
  assert(bad.phase === null, 'phase is null for invalid condition');

  // Bankruptcy creates emergency stipend
  var pid2 = uid();
  var bankResult = RS.enterRecovery(state, pid2, 'bankruptcy', 0);
  assert(bankResult.aid.emergencyStipend > 0, 'bankruptcy provides emergency stipend');

  // Injury entry
  var pid3 = uid();
  var injResult = RS.enterRecovery(state, pid3, 'injury', 200);
  assert(injResult.success === true, 'injury recovery starts successfully');
  assertEqual(injResult.phase.id, 'emergency', 'injury starts in emergency');

  // Homelessness entry
  var pid4 = uid();
  var hmResult = RS.enterRecovery(state, pid4, 'homelessness', 50);
  assert(hmResult.success === true, 'homelessness recovery starts successfully');

  // Disgrace entry
  var pid5 = uid();
  var dgResult = RS.enterRecovery(state, pid5, 'disgrace', 300);
  assert(dgResult.success === true, 'disgrace recovery starts successfully');

  // Entering recovery sets record in state.players
  assert(typeof state.players[pid] === 'object', 'state.players has entry for player');
  assert(state.players[pid].active === true, 'record is marked active');
  assertEqual(state.players[pid].conditionId, 'bankruptcy', 'record has correct conditionId');
  assertEqual(state.players[pid].startTick, 100, 'record has correct startTick');

});

// ============================================================================
// SUITE 7: isInRecovery
// ============================================================================

suite('isInRecovery', function() {

  var state = freshState();
  var pid = uid();

  assert(RS.isInRecovery(state, pid) === false, 'unknown player is not in recovery');
  assert(RS.isInRecovery(state, 'no_such_player') === false, 'undefined player is not in recovery');

  RS.enterRecovery(state, pid, 'injury', 0);
  assert(RS.isInRecovery(state, pid) === true, 'player is in recovery after enter');

  RS.completeRecovery(state, pid, 200);
  assert(RS.isInRecovery(state, pid) === false, 'player is not in recovery after completion');

});

// ============================================================================
// SUITE 8: getRecoveryPhase
// ============================================================================

suite('getRecoveryPhase', function() {

  var state = freshState();
  var pid = uid();

  // Not in recovery
  var none = RS.getRecoveryPhase(state, pid);
  assert(none.phase === null, 'not in recovery returns null phase');
  assert(none.record === null, 'not in recovery returns null record');
  assertEqual(none.elapsedTicks, 0, 'elapsed ticks is 0 when not in recovery');

  // In emergency phase (just started)
  RS.enterRecovery(state, pid, 'bankruptcy', 1000);
  var ph = RS.getRecoveryPhase(state, pid);
  assert(ph.phase !== null, 'phase is not null when in recovery');
  assertEqual(ph.phase.id, 'emergency', 'freshly entered recovery is in emergency phase');
  assert(ph.record !== null, 'record is returned');

  // After advancing ticks into stabilization
  var pid2 = uid();
  RS.enterRecovery(state, pid2, 'homelessness', 0);
  RS.advanceRecovery(state, pid2, 100); // tick 100 → elapsedTicks 100 → stabilization
  var ph2 = RS.getRecoveryPhase(state, pid2);
  assertEqual(ph2.phase.id, 'stabilization', 'at tick 100 the phase is stabilization');
  assertEqual(ph2.elapsedTicks, 100, 'elapsedTicks is 100');

  // Recovery phase
  var pid3 = uid();
  RS.enterRecovery(state, pid3, 'injury', 0);
  RS.advanceRecovery(state, pid3, 250);
  var ph3 = RS.getRecoveryPhase(state, pid3);
  assertEqual(ph3.phase.id, 'recovery', 'at tick 250 the phase is recovery');

  // Restored phase
  var pid4 = uid();
  RS.enterRecovery(state, pid4, 'disgrace', 0);
  RS.advanceRecovery(state, pid4, 600);
  var ph4 = RS.getRecoveryPhase(state, pid4);
  assertEqual(ph4.phase.id, 'restored', 'at tick 600 the phase is restored');

});

// ============================================================================
// SUITE 9: advanceRecovery
// ============================================================================

suite('advanceRecovery', function() {

  var state = freshState();

  // Not in recovery
  var pid = uid();
  var r1 = RS.advanceRecovery(state, pid, 100);
  assert(r1.advanced === false, 'advance on non-recovery player returns advanced:false');
  assert(r1.newPhase === null, 'newPhase is null for non-recovery player');

  // No phase change within emergency window
  var pid2 = uid();
  RS.enterRecovery(state, pid2, 'bankruptcy', 0);
  var r2 = RS.advanceRecovery(state, pid2, 30); // tick 30 still emergency
  assert(r2.advanced === false, 'no phase change at tick 30');
  assertEqual(r2.bonuses.phase, 'emergency', 'bonuses show emergency phase');

  // Phase change from emergency to stabilization
  var pid3 = uid();
  RS.enterRecovery(state, pid3, 'bankruptcy', 0);
  var r3 = RS.advanceRecovery(state, pid3, 51);
  assert(r3.advanced === true, 'phase advances at tick 51 (emergency→stabilization)');
  assertEqual(r3.newPhase.id, 'stabilization', 'new phase is stabilization');

  // Bonuses are included
  assert(typeof r3.bonuses === 'object', 'bonuses is an object');
  assert(typeof r3.bonuses.xpBonus === 'number', 'xpBonus is a number');
  assert(typeof r3.bonuses.sparkBonus === 'number', 'sparkBonus is a number');
  assert(typeof r3.bonuses.npcAidRate === 'number', 'npcAidRate is a number');

  // Phase change from stabilization to recovery
  var pid4 = uid();
  RS.enterRecovery(state, pid4, 'homelessness', 0);
  RS.advanceRecovery(state, pid4, 51);  // stabilization
  var r4 = RS.advanceRecovery(state, pid4, 201);
  assert(r4.advanced === true, 'phase advances at tick 201 (stabilization→recovery)');
  assertEqual(r4.newPhase.id, 'recovery', 'new phase is recovery');

  // Phase change to restored
  var pid5 = uid();
  RS.enterRecovery(state, pid5, 'disgrace', 0);
  RS.advanceRecovery(state, pid5, 201);
  var r5 = RS.advanceRecovery(state, pid5, 501);
  assert(r5.advanced === true, 'phase advances at tick 501 (recovery→restored)');
  assertEqual(r5.newPhase.id, 'restored', 'new phase is restored');

  // Completed recovery does not advance
  var pid6 = uid();
  RS.enterRecovery(state, pid6, 'injury', 0);
  RS.completeRecovery(state, pid6, 100);
  var r6 = RS.advanceRecovery(state, pid6, 200);
  assert(r6.advanced === false, 'completed recovery does not advance');

});

// ============================================================================
// SUITE 10: completeRecovery
// ============================================================================

suite('completeRecovery', function() {

  var state = freshState();

  // Not in recovery
  var pid = uid();
  var r1 = RS.completeRecovery(state, pid, 100);
  assert(r1.success === false, 'complete on non-recovery player returns success:false');
  assertEqual(r1.duration, 0, 'duration is 0 for non-recovery player');
  assertEqual(r1.sparkBonus, 0, 'sparkBonus is 0 for non-recovery player');

  // Normal completion
  var pid2 = uid();
  RS.enterRecovery(state, pid2, 'bankruptcy', 100);
  var r2 = RS.completeRecovery(state, pid2, 350);
  assert(r2.success === true, 'complete succeeds for active recovery');
  assertEqual(r2.duration, 250, 'duration is 250 ticks (350-100)');
  assert(r2.sparkBonus >= 10, 'spark bonus is at least 10');
  assert(r2.sparkBonus <= 100, 'spark bonus is at most 100');

  // Player is no longer in recovery
  assert(RS.isInRecovery(state, pid2) === false, 'player is not in recovery after completion');

  // Log entry created
  assertEqual(state.recoveryLog.length, 1, 'recovery log has one entry');
  assertEqual(state.recoveryLog[0].playerId, pid2, 'log entry has correct playerId');
  assertEqual(state.recoveryLog[0].conditionId, 'bankruptcy', 'log entry has correct conditionId');
  assertEqual(state.recoveryLog[0].duration, 250, 'log entry has correct duration');

  // Fast completion gives higher bonus
  var pid3 = uid();
  RS.enterRecovery(state, pid3, 'bankruptcy', 0);
  var rFast = RS.completeRecovery(state, pid3, 10); // very fast

  var pid4 = uid();
  RS.enterRecovery(state, pid4, 'bankruptcy', 0);
  var rSlow = RS.completeRecovery(state, pid4, 490); // near duration limit

  assert(rFast.sparkBonus >= rSlow.sparkBonus, 'faster recovery yields higher or equal spark bonus');

  // Cannot complete twice
  var pid5 = uid();
  RS.enterRecovery(state, pid5, 'homelessness', 0);
  RS.completeRecovery(state, pid5, 200);
  var r5b = RS.completeRecovery(state, pid5, 400);
  assert(r5b.success === false, 'second completion attempt returns success:false');

});

// ============================================================================
// SUITE 11: createDebt
// ============================================================================

suite('createDebt', function() {

  var state = freshState();

  // Basic creation
  var r = RS.createDebt(state, 'playerA', 'npc_healer', 50, 'emergency loan');
  assert(r.success === true, 'createDebt succeeds');
  assert(typeof r.debtId === 'string' && r.debtId.length > 0, 'debtId is a non-empty string');
  assert(r.debt !== null, 'debt object is returned');
  assertEqual(r.debt.playerId, 'playerA', 'debt has correct playerId');
  assertEqual(r.debt.npcId, 'npc_healer', 'debt has correct npcId');
  assertEqual(r.debt.originalAmount, 50, 'debt originalAmount is 50');
  assertEqual(r.debt.remainingAmount, 50, 'debt remainingAmount starts at 50');
  assertEqual(r.debt.settled, false, 'debt is not settled');
  assertEqual(r.debt.reason, 'emergency loan', 'debt reason is stored');
  assert(Array.isArray(r.debt.payments), 'payments is an array');

  // Invalid: zero amount
  var r2 = RS.createDebt(state, 'playerB', 'npc_1', 0, 'test');
  assert(r2.success === false, 'zero amount debt creation fails');

  // Invalid: negative amount
  var r3 = RS.createDebt(state, 'playerB', 'npc_1', -10, 'test');
  assert(r3.success === false, 'negative amount debt creation fails');

  // Multiple debts accumulate
  RS.createDebt(state, 'playerC', 'npc_2', 25, 'food');
  RS.createDebt(state, 'playerC', 'npc_3', 75, 'shelter');
  var debts = RS.getDebts(state, 'playerC');
  assertEqual(debts.length, 2, 'player with two debts returns two records');

  // Debt IDs are unique
  var r4 = RS.createDebt(state, 'playerD', 'npc_4', 100, 'a');
  var r5 = RS.createDebt(state, 'playerD', 'npc_4', 100, 'b');
  assert(r4.debtId !== r5.debtId, 'debt IDs are unique');

  // Debt appears in state.debts
  var beforeCount = state.debts.length;
  RS.createDebt(state, 'playerE', 'npc_5', 30, 'test');
  assertEqual(state.debts.length, beforeCount + 1, 'state.debts grows by 1');

});

// ============================================================================
// SUITE 12: repayDebt
// ============================================================================

suite('repayDebt', function() {

  var state = freshState();

  // Full repayment
  var r = RS.createDebt(state, 'pA', 'npc_1', 100, 'test');
  var debtId = r.debtId;

  var rep = RS.repayDebt(state, 'pA', debtId, 100);
  assert(rep.success === true, 'full repayment succeeds');
  assertEqual(rep.remaining, 0, 'remaining is 0 after full repayment');
  assert(rep.settled === true, 'debt is settled after full repayment');

  // Partial repayment
  var r2 = RS.createDebt(state, 'pB', 'npc_2', 100, 'test');
  var debtId2 = r2.debtId;

  var rep2 = RS.repayDebt(state, 'pB', debtId2, 40);
  assert(rep2.success === true, 'partial repayment succeeds');
  assertEqual(rep2.remaining, 60, 'remaining is 60 after 40 repaid');
  assert(rep2.settled === false, 'debt is not settled after partial repayment');

  // Second partial payment
  var rep3 = RS.repayDebt(state, 'pB', debtId2, 60);
  assert(rep3.success === true, 'second partial repayment succeeds');
  assertEqual(rep3.remaining, 0, 'remaining is 0 after full repayment');
  assert(rep3.settled === true, 'debt is settled after all repaid');

  // Cannot repay settled debt
  var rep4 = RS.repayDebt(state, 'pB', debtId2, 10);
  assert(rep4.success === false, 'cannot repay an already settled debt');

  // Wrong player ID
  var r5 = RS.createDebt(state, 'pC', 'npc_3', 50, 'test');
  var rep5 = RS.repayDebt(state, 'wrong_player', r5.debtId, 50);
  assert(rep5.success === false, 'repayment fails with wrong playerId');

  // Non-existent debt ID
  var rep6 = RS.repayDebt(state, 'pA', 'fake_debt_id', 10);
  assert(rep6.success === false, 'repayment fails with non-existent debtId');

  // Zero amount repayment fails
  var r7 = RS.createDebt(state, 'pD', 'npc_4', 50, 'test');
  var rep7 = RS.repayDebt(state, 'pD', r7.debtId, 0);
  assert(rep7.success === false, 'zero-amount repayment fails');

  // Overpayment clamps to remaining balance
  var r8 = RS.createDebt(state, 'pE', 'npc_5', 30, 'test');
  var rep8 = RS.repayDebt(state, 'pE', r8.debtId, 1000);
  assertEqual(rep8.remaining, 0, 'overpayment clamps debt to zero');
  assert(rep8.settled === true, 'overpayment settles the debt');

});

// ============================================================================
// SUITE 13: getDebts & getDebtTotal
// ============================================================================

suite('getDebts and getDebtTotal', function() {

  var state = freshState();
  var pid = uid();

  // No debts
  var debts = RS.getDebts(state, pid);
  assert(Array.isArray(debts), 'getDebts returns array');
  assertEqual(debts.length, 0, 'no debts for new player');
  assertEqual(RS.getDebtTotal(state, pid), 0, 'debt total is 0 for new player');

  // Add debts
  RS.createDebt(state, pid, 'npc_1', 50, 'a');
  RS.createDebt(state, pid, 'npc_2', 30, 'b');

  var debts2 = RS.getDebts(state, pid);
  assertEqual(debts2.length, 2, 'two debts found');
  assertEqual(RS.getDebtTotal(state, pid), 80, 'debt total is 80');

  // Settled debts are excluded
  var r3 = RS.createDebt(state, pid, 'npc_3', 20, 'c');
  RS.repayDebt(state, pid, r3.debtId, 20);
  var debts3 = RS.getDebts(state, pid);
  assertEqual(debts3.length, 2, 'settled debt not included in getDebts');
  assertEqual(RS.getDebtTotal(state, pid), 80, 'debt total unchanged after settling a debt');

  // Different player
  var pid2 = uid();
  RS.createDebt(state, pid2, 'npc_1', 200, 'other');
  assertEqual(RS.getDebtTotal(state, pid), 80, 'other player debts do not affect this player total');
  assertEqual(RS.getDebtTotal(state, pid2), 200, 'other player debt total is correct');

});

// ============================================================================
// SUITE 14: publicApology
// ============================================================================

suite('publicApology', function() {

  var state = freshState();

  // Not in recovery
  var r1 = RS.publicApology(state, 'noone', 100);
  assert(r1.success === false, 'apology fails when not in recovery');

  // Wrong condition (not disgrace)
  var pid2 = uid();
  RS.enterRecovery(state, pid2, 'bankruptcy', 0);
  var r2 = RS.publicApology(state, pid2, 100);
  assert(r2.success === false, 'apology fails for non-disgrace condition');

  // Valid disgrace apology
  var pid3 = uid();
  RS.enterRecovery(state, pid3, 'disgrace', 0);
  var r3 = RS.publicApology(state, pid3, 100);
  assert(r3.success === true, 'first apology succeeds');
  assertEqual(r3.apologyCount, 1, 'apology count is 1');
  assert(r3.reputationBonus > 0, 'reputation bonus is positive');

  // Second apology after cooldown
  var r4 = RS.publicApology(state, pid3, 160); // 60 ticks later
  assert(r4.success === true, 'second apology succeeds after cooldown');
  assertEqual(r4.apologyCount, 2, 'apology count is 2');

  // Apology too soon (within cooldown)
  var pid4 = uid();
  RS.enterRecovery(state, pid4, 'disgrace', 0);
  RS.publicApology(state, pid4, 100);
  var r5 = RS.publicApology(state, pid4, 130); // only 30 ticks later
  assert(r5.success === false, 'apology within cooldown fails');
  assertEqual(r5.apologyCount, 1, 'apology count unchanged after cooldown failure');

  // Diminishing returns: 1st bonus > 3rd bonus
  var pid5 = uid();
  RS.enterRecovery(state, pid5, 'disgrace', 0);
  var ap1 = RS.publicApology(state, pid5, 0);
  var ap2 = RS.publicApology(state, pid5, 60);
  var ap3 = RS.publicApology(state, pid5, 120);
  assert(ap1.reputationBonus >= ap2.reputationBonus, '1st apology bonus >= 2nd');
  assert(ap2.reputationBonus >= ap3.reputationBonus, '2nd apology bonus >= 3rd');

  // Step recorded
  var record = state.players[pid5];
  assert(record.stepsCompleted.indexOf('public_apology') !== -1, 'public_apology step recorded');

});

// ============================================================================
// SUITE 15: getRecoveryBonus
// ============================================================================

suite('getRecoveryBonus', function() {

  var state = freshState();

  // Not in recovery — baseline multipliers
  var pid = uid();
  var b1 = RS.getRecoveryBonus(state, pid);
  assertEqual(b1.xpBonus, 1.0, 'xpBonus is 1.0 when not in recovery');
  assertEqual(b1.sparkBonus, 1.0, 'sparkBonus is 1.0 when not in recovery');
  assert(b1.phase === null, 'phase is null when not in recovery');

  // Emergency phase — maximum bonuses
  var pid2 = uid();
  RS.enterRecovery(state, pid2, 'bankruptcy', 0);
  var b2 = RS.getRecoveryBonus(state, pid2);
  assert(b2.xpBonus > 1.0, 'emergency xpBonus > 1.0');
  assert(b2.sparkBonus > 1.0, 'emergency sparkBonus > 1.0');
  assertEqual(b2.phase, 'emergency', 'phase is emergency');

  // Stabilization — lower bonuses
  var pid3 = uid();
  RS.enterRecovery(state, pid3, 'homelessness', 0);
  RS.advanceRecovery(state, pid3, 100);
  var b3 = RS.getRecoveryBonus(state, pid3);
  assertEqual(b3.phase, 'stabilization', 'phase is stabilization after tick 100');
  assert(b3.xpBonus > 1.0, 'stabilization xpBonus > 1.0');

  // Emergency bonus is higher than stabilization bonus
  assert(b2.xpBonus > b3.xpBonus, 'emergency xpBonus > stabilization xpBonus');

  // After completion — back to baseline
  var pid4 = uid();
  RS.enterRecovery(state, pid4, 'injury', 0);
  RS.completeRecovery(state, pid4, 50);
  var b4 = RS.getRecoveryBonus(state, pid4);
  assertEqual(b4.xpBonus, 1.0, 'completed recovery returns to 1.0 xpBonus');
  assertEqual(b4.sparkBonus, 1.0, 'completed recovery returns to 1.0 sparkBonus');

});

// ============================================================================
// SUITE 16: getNpcAidRate
// ============================================================================

suite('getNpcAidRate', function() {

  var state = freshState();

  // Not in recovery — zero aid
  var pid = uid();
  assertEqual(RS.getNpcAidRate(state, pid), 0, 'aid rate is 0 when not in recovery');

  // Bankruptcy emergency aid
  var pid2 = uid();
  RS.enterRecovery(state, pid2, 'bankruptcy', 0);
  var rate2 = RS.getNpcAidRate(state, pid2);
  assert(rate2 > 0, 'bankruptcy player gets aid > 0');
  assert(rate2 <= 1, 'aid rate is at most 1.0');

  // Injury has highest base aid rate
  var pid3 = uid();
  RS.enterRecovery(state, pid3, 'injury', 0);
  var rate3 = RS.getNpcAidRate(state, pid3);

  // Disgrace has lower aid rate
  var pid4 = uid();
  RS.enterRecovery(state, pid4, 'disgrace', 0);
  var rate4 = RS.getNpcAidRate(state, pid4);

  assert(rate3 > rate4, 'injury aid rate is higher than disgrace aid rate in emergency');

  // Aid rate decreases as phase advances (aidMultiplier decreases)
  var pid5 = uid();
  RS.enterRecovery(state, pid5, 'bankruptcy', 0);
  var earlyRate = RS.getNpcAidRate(state, pid5);
  RS.advanceRecovery(state, pid5, 201); // into recovery phase
  var laterRate = RS.getNpcAidRate(state, pid5);
  assert(earlyRate >= laterRate, 'aid rate decreases or stays same as phase advances');

  // Completed recovery — no aid
  var pid6 = uid();
  RS.enterRecovery(state, pid6, 'homelessness', 0);
  RS.completeRecovery(state, pid6, 100);
  assertEqual(RS.getNpcAidRate(state, pid6), 0, 'completed recovery gives 0 aid');

});

// ============================================================================
// SUITE 17: getRecoveryHistory
// ============================================================================

suite('getRecoveryHistory', function() {

  var state = freshState();
  var pid = uid();

  // No history
  var h1 = RS.getRecoveryHistory(state, pid);
  assert(Array.isArray(h1), 'getRecoveryHistory returns array');
  assertEqual(h1.length, 0, 'empty history for new player');

  // After one completion
  RS.enterRecovery(state, pid, 'bankruptcy', 100);
  RS.completeRecovery(state, pid, 300);
  var h2 = RS.getRecoveryHistory(state, pid);
  assertEqual(h2.length, 1, 'history has one entry after first recovery');
  assertEqual(h2[0].conditionId, 'bankruptcy', 'history entry has correct conditionId');
  assertEqual(h2[0].duration, 200, 'history entry has correct duration');

  // After second recovery for same player
  RS.enterRecovery(state, pid, 'injury', 400);
  RS.completeRecovery(state, pid, 500);
  var h3 = RS.getRecoveryHistory(state, pid);
  assertEqual(h3.length, 2, 'history has two entries after second recovery');

  // Other player's history is separate
  var pid2 = uid();
  RS.enterRecovery(state, pid2, 'disgrace', 0);
  RS.completeRecovery(state, pid2, 200);
  var h4 = RS.getRecoveryHistory(state, pid);
  assertEqual(h4.length, 2, 'other player history does not affect this player');

  // History preserves log entries
  assertEqual(h2[0].startTick, 100, 'log entry preserves startTick');

});

// ============================================================================
// SUITE 18: getRecoveryStats
// ============================================================================

suite('getRecoveryStats', function() {

  var state = freshState();

  // Empty state
  var s1 = RS.getRecoveryStats(state);
  assert(typeof s1 === 'object', 'getRecoveryStats returns an object');
  assertEqual(s1.totalRecoveries, 0, 'no recoveries initially');
  assertEqual(s1.activeRecoveries, 0, 'no active recoveries initially');
  assertEqual(s1.averageDuration, 0, 'average duration is 0 initially');
  assert(typeof s1.conditionBreakdown === 'object', 'conditionBreakdown is an object');
  assertEqual(s1.totalDebts, 0, 'no debts initially');

  // Add an active recovery
  var pid1 = uid();
  RS.enterRecovery(state, pid1, 'bankruptcy', 0);
  var s2 = RS.getRecoveryStats(state);
  assertEqual(s2.activeRecoveries, 1, 'one active recovery');
  assert(s2.conditionBreakdown.bankruptcy >= 1, 'bankruptcy counted in breakdown');

  // Complete it
  RS.completeRecovery(state, pid1, 200);
  var s3 = RS.getRecoveryStats(state);
  assertEqual(s3.activeRecoveries, 0, 'no active recoveries after completion');
  assertEqual(s3.totalRecoveries, 1, 'one total recovery after completion');
  assertEqual(s3.averageDuration, 200, 'average duration is 200');

  // Add another
  var pid2 = uid();
  RS.enterRecovery(state, pid2, 'injury', 0);
  RS.completeRecovery(state, pid2, 400);
  var s4 = RS.getRecoveryStats(state);
  assertEqual(s4.totalRecoveries, 2, 'two total recoveries');
  assertEqual(s4.averageDuration, 300, 'average duration is (200+400)/2 = 300');

  // Debt stats
  RS.createDebt(state, 'pX', 'npc_1', 100, 'test');
  var r = RS.createDebt(state, 'pX', 'npc_2', 50, 'test2');
  RS.repayDebt(state, 'pX', r.debtId, 50);
  var s5 = RS.getRecoveryStats(state);
  assertEqual(s5.totalDebts, 2, 'total debts is 2');
  assertEqual(s5.settledDebts, 1, 'one settled debt');
  assertEqual(s5.activeDebts, 1, 'one active debt');

  // Spark bonuses tracked
  assert(typeof s4.totalSparkBonusesPaid === 'number', 'totalSparkBonusesPaid is a number');
  assert(s4.totalSparkBonusesPaid >= 0, 'totalSparkBonusesPaid is non-negative');

});

// ============================================================================
// SUITE 19: FULL RECOVERY LIFECYCLE INTEGRATION
// ============================================================================

suite('Full recovery lifecycle', function() {

  var state = freshState();
  var pid = uid();

  // Step 1: trigger bankruptcy
  var check = RS.checkCondition(state, pid, playerBankrupt());
  assert(check.triggered, 'bankruptcy triggered');

  // Step 2: enter recovery
  var entry = RS.enterRecovery(state, pid, check.condition.id, 0);
  assert(entry.success, 'entered recovery successfully');
  assert(RS.isInRecovery(state, pid), 'player is in recovery');

  // Step 3: create debt
  var debtResult = RS.createDebt(state, pid, 'npc_banker', 50, 'emergency loan');
  assert(debtResult.success, 'debt created');

  // Step 4: advance through phases
  var adv1 = RS.advanceRecovery(state, pid, 51);  // emergency → stabilization
  assert(adv1.advanced, 'advanced to stabilization');

  var adv2 = RS.advanceRecovery(state, pid, 201); // stabilization → recovery
  assert(adv2.advanced, 'advanced to recovery');

  // Step 5: get recovery bonus in recovery phase
  var bonus = RS.getRecoveryBonus(state, pid);
  assert(bonus.xpBonus > 1.0, 'recovery bonus > 1.0 in recovery phase');
  assertEqual(bonus.phase, 'recovery', 'in recovery phase');

  // Step 6: repay debt
  var repay = RS.repayDebt(state, pid, debtResult.debtId, 50);
  assert(repay.settled, 'debt settled');
  assertEqual(RS.getDebtTotal(state, pid), 0, 'zero debt after repayment');

  // Step 7: complete recovery
  var complete = RS.completeRecovery(state, pid, 350);
  assert(complete.success, 'recovery completed');
  assert(!RS.isInRecovery(state, pid), 'no longer in recovery');

  // Step 8: history and stats
  var history = RS.getRecoveryHistory(state, pid);
  assertEqual(history.length, 1, 'history has one entry');

  var stats = RS.getRecoveryStats(state);
  assertEqual(stats.totalRecoveries, 1, 'one total recovery in stats');

});

// ============================================================================
// SUITE 20: DISGRACE LIFECYCLE INTEGRATION
// ============================================================================

suite('Disgrace recovery lifecycle', function() {

  var state = freshState();
  var pid = uid();

  // Enter disgrace
  var entry = RS.enterRecovery(state, pid, 'disgrace', 0);
  assert(entry.success, 'disgrace recovery started');
  assertEqual(entry.aid.discountRate, 0.20, 'disgrace has 20% NPC aid rate');

  // First apology
  var ap1 = RS.publicApology(state, pid, 10);
  assert(ap1.success, 'first apology succeeds');
  assertEqual(ap1.apologyCount, 1, 'count is 1');

  // Cooldown enforced
  var ap2 = RS.publicApology(state, pid, 30); // too soon
  assert(!ap2.success, 'apology within cooldown fails');

  // After cooldown
  var ap3 = RS.publicApology(state, pid, 70);
  assert(ap3.success, 'apology after cooldown succeeds');
  assertEqual(ap3.apologyCount, 2, 'count is 2');

  // Third apology
  var ap4 = RS.publicApology(state, pid, 130);
  assert(ap4.success, 'third apology succeeds');
  assertEqual(ap4.apologyCount, 3, 'count is 3');

  // Complete the disgrace recovery
  var complete = RS.completeRecovery(state, pid, 600);
  assert(complete.success, 'disgrace recovery completed');

  // History records apologies
  var history = RS.getRecoveryHistory(state, pid);
  assertEqual(history.length, 1, 'one history entry');
  assert(history[0].apologies.length >= 3, 'apologies recorded in history');

});

// ============================================================================
// SUITE 21: EDGE CASES
// ============================================================================

suite('Edge cases', function() {

  var state = freshState();

  // checkCondition with missing optional fields uses defaults
  var r1 = RS.checkCondition(state, 'p1', {}); // empty playerData
  assert(typeof r1.triggered === 'boolean', 'checkCondition handles empty playerData');

  // enterRecovery at tick 0
  var pid2 = uid();
  var r2 = RS.enterRecovery(state, pid2, 'injury', 0);
  assert(r2.success, 'enterRecovery works at tick 0');
  assertEqual(state.players[pid2].startTick, 0, 'startTick is 0');

  // advanceRecovery at same tick as enter (elapsed = 0)
  var r3 = RS.advanceRecovery(state, pid2, 0);
  assert(r3.advanced === false, 'no phase change at same tick as enter');

  // completeRecovery at same tick as enter (duration = 0)
  var pid3 = uid();
  RS.enterRecovery(state, pid3, 'bankruptcy', 500);
  var r4 = RS.completeRecovery(state, pid3, 500);
  assert(r4.success, 'completion at same tick succeeds');
  assertEqual(r4.duration, 0, 'duration is 0 when completed immediately');

  // getRecoveryPhase for unknown player
  var r5 = RS.getRecoveryPhase(state, 'definitely_unknown');
  assert(r5.phase === null, 'unknown player returns null phase');

  // getRecoveryHistory for player with no history
  var h = RS.getRecoveryHistory(state, 'brand_new');
  assertEqual(h.length, 0, 'no history for unknown player');

  // Multiple players in recovery at same time
  var pidA = uid(), pidB = uid(), pidC = uid();
  RS.enterRecovery(state, pidA, 'bankruptcy', 0);
  RS.enterRecovery(state, pidB, 'injury', 0);
  RS.enterRecovery(state, pidC, 'disgrace', 0);
  var stats = RS.getRecoveryStats(state);
  assert(stats.activeRecoveries >= 3, 'three active recoveries counted');

  // getDebtTotal for unknown player
  assertEqual(RS.getDebtTotal(state, 'unknown'), 0, 'getDebtTotal is 0 for unknown player');

  // publicApology succeeds at tick 0 for first apology
  var pid6 = uid();
  RS.enterRecovery(state, pid6, 'disgrace', 0);
  var ap = RS.publicApology(state, pid6, 0);
  assert(ap.success, 'first apology at tick 0 succeeds');

});

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n============================================================');
console.log('Recovery System Tests: ' + passed + ' passed, ' + failed + ' failed');
if (failures.length > 0) {
  console.log('\nFailed tests:');
  for (var f = 0; f < failures.length; f++) {
    console.log('  ' + failures[f]);
  }
}
console.log('============================================================');

process.exit(failed > 0 ? 1 : 0);
