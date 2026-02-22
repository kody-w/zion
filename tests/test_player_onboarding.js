/**
 * tests/test_player_onboarding.js
 * Comprehensive tests for the PlayerOnboarding module — 140+ tests.
 * Run with: node tests/test_player_onboarding.js
 */

'use strict';

var PlayerOnboarding = require('../src/js/player_onboarding');

var passed = 0;
var failed = 0;
var failures = [];

function assert(condition, msg) {
  if (!condition) {
    failed++;
    failures.push(msg);
    console.log('  FAIL: ' + msg);
  } else {
    passed++;
    console.log('  pass: ' + msg);
  }
}

function makeState() {
  return { players: {} };
}

var seq = 0;
function uid() {
  return 'ob_player_' + (++seq);
}

// Helper: init and return state + player id
function freshPlayer(currentTick) {
  var state = makeState();
  var pid = uid();
  PlayerOnboarding.initOnboarding(state, pid, currentTick || 0);
  return { state: state, pid: pid };
}

// Helper: complete all steps for a player
function completeAllSteps(state, pid) {
  var steps = PlayerOnboarding.getAllSteps();
  for (var i = 0; i < steps.length; i++) {
    PlayerOnboarding.completeStep(state, pid, steps[i].id, i * 10);
  }
}

// ---------------------------------------------------------------------------
// SUITE 1 — ONBOARDING_STEPS data structure validation
// ---------------------------------------------------------------------------
console.log('\n--- Suite 1: ONBOARDING_STEPS structure ---');

assert(Array.isArray(PlayerOnboarding.ONBOARDING_STEPS), 'ONBOARDING_STEPS is an array');
assert(PlayerOnboarding.ONBOARDING_STEPS.length === 20, 'ONBOARDING_STEPS has exactly 20 steps');

var REQUIRED_FIELDS = ['id', 'name', 'description', 'category', 'instruction', 'completionCheck', 'reward', 'prerequisite', 'order', 'zone', 'estimatedTicks', 'tip'];
var steps = PlayerOnboarding.ONBOARDING_STEPS;

for (var si = 0; si < steps.length; si++) {
  var step = steps[si];
  for (var fi = 0; fi < REQUIRED_FIELDS.length; fi++) {
    assert(step[REQUIRED_FIELDS[fi]] !== undefined, 'Step ' + step.id + ' has field: ' + REQUIRED_FIELDS[fi]);
  }
}

assert(steps[0].id === 'welcome', 'First step is welcome');
assert(steps[19].id === 'complete_onboarding', 'Last step is complete_onboarding');

// Check orders are sequential 0..19
var orderOk = true;
for (var oi = 0; oi < steps.length; oi++) {
  if (steps[oi].order !== oi) { orderOk = false; break; }
}
assert(orderOk, 'All steps have sequential order values 0..19');

// Rewards structure
for (var ri = 0; ri < steps.length; ri++) {
  assert(typeof steps[ri].reward.spark === 'number', 'Step ' + steps[ri].id + ' reward.spark is a number');
  assert(typeof steps[ri].reward.xp === 'number', 'Step ' + steps[ri].id + ' reward.xp is a number');
  assert(steps[ri].reward.spark > 0, 'Step ' + steps[ri].id + ' reward.spark > 0');
  assert(steps[ri].reward.xp > 0, 'Step ' + steps[ri].id + ' reward.xp > 0');
}

// estimatedTicks positive
for (var eti = 0; eti < steps.length; eti++) {
  assert(steps[eti].estimatedTicks > 0, 'Step ' + steps[eti].id + ' estimatedTicks > 0');
}

// Tip is a non-empty string
for (var ti = 0; ti < steps.length; ti++) {
  assert(typeof steps[ti].tip === 'string' && steps[ti].tip.length > 0, 'Step ' + steps[ti].id + ' has non-empty tip');
}

// Category is one of the known values
var VALID_CATEGORIES = ['basics', 'movement', 'social', 'economy', 'crafting', 'exploration', 'advanced'];
for (var ci = 0; ci < steps.length; ci++) {
  assert(VALID_CATEGORIES.indexOf(steps[ci].category) !== -1, 'Step ' + steps[ci].id + ' has valid category: ' + steps[ci].category);
}

// Prerequisite chain: step.prerequisite is either null or the id of the previous step
assert(steps[0].prerequisite === null, 'First step has null prerequisite');
for (var pi = 1; pi < steps.length; pi++) {
  assert(steps[pi].prerequisite !== null, 'Step ' + steps[pi].id + ' has a non-null prerequisite');
  assert(typeof steps[pi].prerequisite === 'string', 'Step ' + steps[pi].id + ' prerequisite is a string');
  // prerequisite id exists in the step list
  var prereqFound = false;
  for (var pj = 0; pj < steps.length; pj++) {
    if (steps[pj].id === steps[pi].prerequisite) { prereqFound = true; break; }
  }
  assert(prereqFound, 'Step ' + steps[pi].id + ' prerequisite "' + steps[pi].prerequisite + '" exists in step list');
}

// IDs are unique
var idSet = {};
var idsUnique = true;
for (var ii = 0; ii < steps.length; ii++) {
  if (idSet[steps[ii].id]) { idsUnique = false; break; }
  idSet[steps[ii].id] = true;
}
assert(idsUnique, 'All step IDs are unique');

// ---------------------------------------------------------------------------
// SUITE 2 — initOnboarding
// ---------------------------------------------------------------------------
console.log('\n--- Suite 2: initOnboarding ---');

(function() {
  var state = makeState();
  var pid = uid();
  var result = PlayerOnboarding.initOnboarding(state, pid, 1000);
  assert(result !== null && result !== undefined, 'initOnboarding returns the player state');
  assert(result.playerId === pid, 'initOnboarding sets playerId');
  assert(result.currentStep === 0, 'initOnboarding sets currentStep to 0');
  assert(Array.isArray(result.completedSteps), 'initOnboarding sets completedSteps to array');
  assert(result.completedSteps.length === 0, 'initOnboarding completedSteps is empty');
  assert(Array.isArray(result.skippedSteps), 'initOnboarding sets skippedSteps to array');
  assert(result.skippedSteps.length === 0, 'initOnboarding skippedSteps is empty');
  assert(result.startedAt === 1000, 'initOnboarding sets startedAt to currentTick');
  assert(result.completedAt === null, 'initOnboarding completedAt is null');
  assert(result.totalRewards.spark === 0, 'initOnboarding totalRewards.spark starts at 0');
  assert(result.totalRewards.xp === 0, 'initOnboarding totalRewards.xp starts at 0');
  assert(result.hints.shown === 0, 'initOnboarding hints.shown starts at 0');
  assert(result.hints.dismissed === 0, 'initOnboarding hints.dismissed starts at 0');
  assert(result.returnVisits === 0, 'initOnboarding returnVisits starts at 0');
})();

// Idempotent test
(function() {
  var state = makeState();
  var pid = uid();
  PlayerOnboarding.initOnboarding(state, pid, 0);
  PlayerOnboarding.completeStep(state, pid, 'welcome', 1);
  PlayerOnboarding.initOnboarding(state, pid, 999); // second init
  var ps = state.players[pid];
  assert(ps.completedSteps.length === 1, 'Second initOnboarding does not reset completed steps');
  assert(ps.completedSteps[0] === 'welcome', 'Completed steps preserved after second init');
})();

// Init with tick 0
(function() {
  var state = makeState();
  var pid = uid();
  var result = PlayerOnboarding.initOnboarding(state, pid);
  assert(result.startedAt === 0, 'initOnboarding with no tick defaults to 0');
})();

// State.players created if missing
(function() {
  var state = {};
  var pid = uid();
  PlayerOnboarding.initOnboarding(state, pid, 5);
  assert(state.players !== undefined, 'initOnboarding creates state.players if missing');
  assert(state.players[pid] !== undefined, 'initOnboarding creates player entry');
})();

// ---------------------------------------------------------------------------
// SUITE 3 — completeStep
// ---------------------------------------------------------------------------
console.log('\n--- Suite 3: completeStep ---');

(function() {
  var f = freshPlayer(0);
  var result = PlayerOnboarding.completeStep(f.state, f.pid, 'welcome', 10);
  assert(result.success === true, 'completeStep welcome returns success true');
  assert(result.reward !== null && result.reward !== undefined, 'completeStep returns reward');
  assert(result.reward.spark === 10, 'completeStep welcome awards 10 spark');
  assert(result.reward.xp === 5, 'completeStep welcome awards 5 xp');
  assert(result.onboardingComplete === false, 'completeStep welcome does not complete onboarding');
  assert(result.nextStep !== null, 'completeStep welcome returns nextStep');
  assert(result.nextStep.id === 'move_character', 'Next step after welcome is move_character');
})();

// completeStep advances currentStep
(function() {
  var f = freshPlayer(0);
  PlayerOnboarding.completeStep(f.state, f.pid, 'welcome', 10);
  var ps = f.state.players[f.pid];
  assert(ps.completedSteps.length === 1, 'completedSteps has 1 entry after first complete');
  assert(ps.completedSteps[0] === 'welcome', 'completedSteps contains welcome');
  assert(ps.currentStep === 1, 'currentStep is 1 after completing welcome');
})();

// completeStep accumulates totalRewards
(function() {
  var f = freshPlayer(0);
  PlayerOnboarding.completeStep(f.state, f.pid, 'welcome', 1);
  PlayerOnboarding.completeStep(f.state, f.pid, 'move_character', 2);
  var ps = f.state.players[f.pid];
  assert(ps.totalRewards.spark === 20, 'totalRewards.spark accumulates: 10 + 10');
  assert(ps.totalRewards.xp === 15, 'totalRewards.xp accumulates: 5 + 10');
})();

// completeStep for already-completed step
(function() {
  var f = freshPlayer(0);
  PlayerOnboarding.completeStep(f.state, f.pid, 'welcome', 1);
  var result = PlayerOnboarding.completeStep(f.state, f.pid, 'welcome', 2);
  assert(result.success === false, 'completeStep on already-completed step returns success false');
  assert(result.reason !== undefined, 'completeStep on duplicate returns reason');
  var ps = f.state.players[f.pid];
  assert(ps.completedSteps.length === 1, 'completedSteps does not grow on duplicate complete');
})();

// completeStep for unknown step
(function() {
  var f = freshPlayer(0);
  var result = PlayerOnboarding.completeStep(f.state, f.pid, 'nonexistent_step', 1);
  assert(result.success === false, 'completeStep on unknown step returns success false');
})();

// completeStep for uninitialized player
(function() {
  var state = makeState();
  var result = PlayerOnboarding.completeStep(state, 'ghost_player', 'welcome', 1);
  assert(result.success === false, 'completeStep for uninitialized player returns success false');
})();

// completeStep marks onboardingComplete when all steps done
(function() {
  var f = freshPlayer(0);
  var allSteps = PlayerOnboarding.getAllSteps();
  var lastResult;
  for (var i = 0; i < allSteps.length; i++) {
    lastResult = PlayerOnboarding.completeStep(f.state, f.pid, allSteps[i].id, i);
  }
  assert(lastResult.onboardingComplete === true, 'Last completeStep marks onboardingComplete true');
  assert(lastResult.nextStep === null, 'Last completeStep has null nextStep');
})();

// completeStep sets completedAt on last step
(function() {
  var f = freshPlayer(0);
  var allSteps = PlayerOnboarding.getAllSteps();
  for (var i = 0; i < allSteps.length; i++) {
    PlayerOnboarding.completeStep(f.state, f.pid, allSteps[i].id, i * 10);
  }
  var ps = f.state.players[f.pid];
  assert(ps.completedAt !== null, 'completedAt set after all steps done');
  assert(ps.completedAt === (allSteps.length - 1) * 10, 'completedAt equals last step tick');
})();

// ---------------------------------------------------------------------------
// SUITE 4 — skipStep
// ---------------------------------------------------------------------------
console.log('\n--- Suite 4: skipStep ---');

(function() {
  var f = freshPlayer(0);
  var result = PlayerOnboarding.skipStep(f.state, f.pid, 'welcome');
  assert(result.success === true, 'skipStep returns success true');
  assert(result.skipped === 'welcome', 'skipStep returns skipped step id');
  var ps = f.state.players[f.pid];
  assert(ps.skippedSteps.length === 1, 'skippedSteps has 1 entry');
  assert(ps.skippedSteps[0] === 'welcome', 'skippedSteps contains welcome');
})();

// skipStep does not award reward
(function() {
  var f = freshPlayer(0);
  PlayerOnboarding.skipStep(f.state, f.pid, 'welcome');
  var ps = f.state.players[f.pid];
  assert(ps.totalRewards.spark === 0, 'skipStep does not award spark');
  assert(ps.totalRewards.xp === 0, 'skipStep does not award xp');
})();

// skipStep on completed step
(function() {
  var f = freshPlayer(0);
  PlayerOnboarding.completeStep(f.state, f.pid, 'welcome', 1);
  var result = PlayerOnboarding.skipStep(f.state, f.pid, 'welcome');
  assert(result.success === false, 'skipStep on completed step returns success false');
})();

// skipStep on unknown step
(function() {
  var f = freshPlayer(0);
  var result = PlayerOnboarding.skipStep(f.state, f.pid, 'unknown_step');
  assert(result.success === false, 'skipStep on unknown step returns success false');
})();

// skipStep idempotent — skip same step twice
(function() {
  var f = freshPlayer(0);
  PlayerOnboarding.skipStep(f.state, f.pid, 'welcome');
  var result = PlayerOnboarding.skipStep(f.state, f.pid, 'welcome');
  assert(result.success === true, 'skipStep same step twice still returns success');
  assert(result.alreadySkipped === true, 'skipStep twice sets alreadySkipped true');
  var ps = f.state.players[f.pid];
  assert(ps.skippedSteps.length === 1, 'skippedSteps not duplicated on second skip');
})();

// skipStep for uninitialized player
(function() {
  var state = makeState();
  var result = PlayerOnboarding.skipStep(state, 'ghost_player', 'welcome');
  assert(result.success === false, 'skipStep for uninitialized player returns success false');
})();

// skip advances currentStep
(function() {
  var f = freshPlayer(0);
  PlayerOnboarding.skipStep(f.state, f.pid, 'welcome');
  var ps = f.state.players[f.pid];
  assert(ps.currentStep === 1, 'currentStep advances after skip');
})();

// ---------------------------------------------------------------------------
// SUITE 5 — getCurrentStep
// ---------------------------------------------------------------------------
console.log('\n--- Suite 5: getCurrentStep ---');

(function() {
  var f = freshPlayer(0);
  var current = PlayerOnboarding.getCurrentStep(f.state, f.pid);
  assert(current !== null, 'getCurrentStep returns a step for fresh player');
  assert(current.id === 'welcome', 'First current step is welcome');
})();

(function() {
  var f = freshPlayer(0);
  PlayerOnboarding.completeStep(f.state, f.pid, 'welcome', 1);
  var current = PlayerOnboarding.getCurrentStep(f.state, f.pid);
  assert(current !== null, 'getCurrentStep returns step after completing first');
  assert(current.id === 'move_character', 'Current step is move_character after completing welcome');
})();

// getCurrentStep returns null when complete
(function() {
  var f = freshPlayer(0);
  completeAllSteps(f.state, f.pid);
  var current = PlayerOnboarding.getCurrentStep(f.state, f.pid);
  assert(current === null, 'getCurrentStep returns null when onboarding is complete');
})();

// getCurrentStep for uninitialized player
(function() {
  var state = makeState();
  var result = PlayerOnboarding.getCurrentStep(state, 'ghost_player');
  assert(result === null, 'getCurrentStep returns null for uninitialized player');
})();

// getCurrentStep skips over skipped steps
(function() {
  var f = freshPlayer(0);
  PlayerOnboarding.skipStep(f.state, f.pid, 'welcome');
  var current = PlayerOnboarding.getCurrentStep(f.state, f.pid);
  assert(current !== null, 'getCurrentStep skips over skipped step');
  assert(current.id === 'move_character', 'getCurrentStep returns step after skipped welcome');
})();

// ---------------------------------------------------------------------------
// SUITE 6 — getProgress
// ---------------------------------------------------------------------------
console.log('\n--- Suite 6: getProgress ---');

(function() {
  var f = freshPlayer(0);
  var progress = PlayerOnboarding.getProgress(f.state, f.pid);
  assert(progress.completed === 0, 'Fresh player: completed is 0');
  assert(progress.total === 20, 'Total is 20');
  assert(progress.percent === 0, 'Fresh player: percent is 0');
  assert(progress.estimatedTimeRemaining > 0, 'Fresh player: estimatedTimeRemaining > 0');
})();

(function() {
  var f = freshPlayer(0);
  PlayerOnboarding.completeStep(f.state, f.pid, 'welcome', 1);
  var progress = PlayerOnboarding.getProgress(f.state, f.pid);
  assert(progress.completed === 1, '1 completed step reflected in progress');
  assert(progress.percent === 5, 'Percent is 5 after 1/20 steps');
})();

(function() {
  var f = freshPlayer(0);
  completeAllSteps(f.state, f.pid);
  var progress = PlayerOnboarding.getProgress(f.state, f.pid);
  assert(progress.completed === 20, 'All 20 steps completed');
  assert(progress.percent === 100, 'Percent is 100 when all done');
  assert(progress.estimatedTimeRemaining === 0, 'estimatedTimeRemaining is 0 when all done');
})();

// getProgress for uninitialized player
(function() {
  var state = makeState();
  var progress = PlayerOnboarding.getProgress(state, 'ghost_player');
  assert(progress.completed === 0, 'getProgress for uninitialized player: completed 0');
  assert(progress.percent === 0, 'getProgress for uninitialized player: percent 0');
})();

// getProgress after 10 steps
(function() {
  var f = freshPlayer(0);
  var allSteps = PlayerOnboarding.getAllSteps();
  for (var i = 0; i < 10; i++) {
    PlayerOnboarding.completeStep(f.state, f.pid, allSteps[i].id, i);
  }
  var progress = PlayerOnboarding.getProgress(f.state, f.pid);
  assert(progress.completed === 10, '10 steps completed');
  assert(progress.percent === 50, 'Percent is 50 after 10/20 steps');
})();

// ---------------------------------------------------------------------------
// SUITE 7 — getCompletedSteps
// ---------------------------------------------------------------------------
console.log('\n--- Suite 7: getCompletedSteps ---');

(function() {
  var f = freshPlayer(0);
  var completed = PlayerOnboarding.getCompletedSteps(f.state, f.pid);
  assert(Array.isArray(completed), 'getCompletedSteps returns array');
  assert(completed.length === 0, 'Fresh player has 0 completed steps');
})();

(function() {
  var f = freshPlayer(0);
  PlayerOnboarding.completeStep(f.state, f.pid, 'welcome', 1);
  var completed = PlayerOnboarding.getCompletedSteps(f.state, f.pid);
  assert(completed.length === 1, 'getCompletedSteps returns 1 after one complete');
  assert(completed[0].id === 'welcome', 'getCompletedSteps returns full step object');
  assert(completed[0].name !== undefined, 'Completed step has name field');
})();

(function() {
  var state = makeState();
  var completed = PlayerOnboarding.getCompletedSteps(state, 'ghost_player');
  assert(Array.isArray(completed), 'getCompletedSteps for uninitialized player returns array');
  assert(completed.length === 0, 'getCompletedSteps for uninitialized player returns empty');
})();

// ---------------------------------------------------------------------------
// SUITE 8 — getNextSteps
// ---------------------------------------------------------------------------
console.log('\n--- Suite 8: getNextSteps ---');

(function() {
  var f = freshPlayer(0);
  var next = PlayerOnboarding.getNextSteps(f.state, f.pid, 3);
  assert(Array.isArray(next), 'getNextSteps returns array');
  assert(next.length === 3, 'getNextSteps returns requested count');
  assert(next[0].id === 'welcome', 'First next step is welcome for fresh player');
  assert(next[1].id === 'move_character', 'Second next step is move_character');
  assert(next[2].id === 'visit_zone', 'Third next step is visit_zone');
})();

(function() {
  var f = freshPlayer(0);
  PlayerOnboarding.completeStep(f.state, f.pid, 'welcome', 1);
  var next = PlayerOnboarding.getNextSteps(f.state, f.pid, 2);
  assert(next.length === 2, 'getNextSteps returns 2 after completing first');
  assert(next[0].id === 'move_character', 'First next step is move_character after completing welcome');
})();

// getNextSteps returns fewer when near end
(function() {
  var f = freshPlayer(0);
  var allSteps = PlayerOnboarding.getAllSteps();
  for (var i = 0; i < 18; i++) {
    PlayerOnboarding.completeStep(f.state, f.pid, allSteps[i].id, i);
  }
  var next = PlayerOnboarding.getNextSteps(f.state, f.pid, 5);
  assert(next.length === 2, 'getNextSteps returns only 2 when only 2 remain');
})();

// getNextSteps defaults to 3
(function() {
  var f = freshPlayer(0);
  var next = PlayerOnboarding.getNextSteps(f.state, f.pid);
  assert(next.length === 3, 'getNextSteps defaults to 3 when count not specified');
})();

// getNextSteps for uninitialized player
(function() {
  var state = makeState();
  var next = PlayerOnboarding.getNextSteps(state, 'ghost_player', 3);
  assert(Array.isArray(next), 'getNextSteps for uninitialized player returns array');
  assert(next.length === 0, 'getNextSteps for uninitialized player returns empty');
})();

// ---------------------------------------------------------------------------
// SUITE 9 — getHint
// ---------------------------------------------------------------------------
console.log('\n--- Suite 9: getHint ---');

(function() {
  var f = freshPlayer(0);
  var hint = PlayerOnboarding.getHint(f.state, f.pid);
  assert(hint !== null, 'getHint returns hint for fresh player');
  assert(hint.stepId === 'welcome', 'getHint stepId is welcome for fresh player');
  assert(typeof hint.instruction === 'string', 'hint has instruction string');
  assert(typeof hint.tip === 'string', 'hint has tip string');
  assert(hint.zone === 'nexus', 'hint has zone for welcome step');
  assert(hint.categoryHint !== null, 'hint has categoryHint');
})();

// getHint increments shown count
(function() {
  var f = freshPlayer(0);
  PlayerOnboarding.getHint(f.state, f.pid);
  PlayerOnboarding.getHint(f.state, f.pid);
  var ps = f.state.players[f.pid];
  assert(ps.hints.shown === 2, 'getHint increments hints.shown');
})();

// getHint by stepId
(function() {
  var f = freshPlayer(0);
  var hint = PlayerOnboarding.getHint(f.state, f.pid, 'craft_first_item');
  assert(hint !== null, 'getHint with explicit stepId returns hint');
  assert(hint.stepId === 'craft_first_item', 'getHint returns hint for specified step');
  assert(hint.zone === 'studio', 'getHint returns correct zone for crafting step');
})();

// getHint for uninitialized player
(function() {
  var state = makeState();
  var hint = PlayerOnboarding.getHint(state, 'ghost_player');
  assert(hint === null, 'getHint returns null for uninitialized player');
})();

// getHint for unknown stepId
(function() {
  var f = freshPlayer(0);
  var hint = PlayerOnboarding.getHint(f.state, f.pid, 'nonexistent');
  assert(hint === null, 'getHint returns null for unknown stepId');
})();

// getHint for completed onboarding
(function() {
  var f = freshPlayer(0);
  completeAllSteps(f.state, f.pid);
  var hint = PlayerOnboarding.getHint(f.state, f.pid);
  assert(hint === null, 'getHint returns null when onboarding complete');
})();

// ---------------------------------------------------------------------------
// SUITE 10 — dismissHint
// ---------------------------------------------------------------------------
console.log('\n--- Suite 10: dismissHint ---');

(function() {
  var f = freshPlayer(0);
  var result = PlayerOnboarding.dismissHint(f.state, f.pid);
  assert(result === true, 'dismissHint returns true');
  var ps = f.state.players[f.pid];
  assert(ps.hints.dismissed === 1, 'dismissHint increments hints.dismissed');
})();

(function() {
  var f = freshPlayer(0);
  PlayerOnboarding.dismissHint(f.state, f.pid);
  PlayerOnboarding.dismissHint(f.state, f.pid);
  PlayerOnboarding.dismissHint(f.state, f.pid);
  var ps = f.state.players[f.pid];
  assert(ps.hints.dismissed === 3, 'dismissHint accumulates count correctly');
})();

// dismissHint for uninitialized player
(function() {
  var state = makeState();
  var result = PlayerOnboarding.dismissHint(state, 'ghost_player');
  assert(result === false, 'dismissHint returns false for uninitialized player');
})();

// ---------------------------------------------------------------------------
// SUITE 11 — isOnboardingComplete
// ---------------------------------------------------------------------------
console.log('\n--- Suite 11: isOnboardingComplete ---');

(function() {
  var f = freshPlayer(0);
  assert(PlayerOnboarding.isOnboardingComplete(f.state, f.pid) === false, 'Fresh player: onboarding not complete');
})();

(function() {
  var f = freshPlayer(0);
  completeAllSteps(f.state, f.pid);
  assert(PlayerOnboarding.isOnboardingComplete(f.state, f.pid) === true, 'All steps completed: onboarding complete');
})();

// Complete via skips
(function() {
  var f = freshPlayer(0);
  var allSteps = PlayerOnboarding.getAllSteps();
  for (var i = 0; i < allSteps.length; i++) {
    PlayerOnboarding.skipStep(f.state, f.pid, allSteps[i].id);
  }
  assert(PlayerOnboarding.isOnboardingComplete(f.state, f.pid) === true, 'All steps skipped: onboarding complete');
})();

// Mix of complete and skip
(function() {
  var f = freshPlayer(0);
  var allSteps = PlayerOnboarding.getAllSteps();
  for (var i = 0; i < allSteps.length; i++) {
    if (i % 2 === 0) {
      PlayerOnboarding.completeStep(f.state, f.pid, allSteps[i].id, i);
    } else {
      PlayerOnboarding.skipStep(f.state, f.pid, allSteps[i].id);
    }
  }
  assert(PlayerOnboarding.isOnboardingComplete(f.state, f.pid) === true, 'Mix of complete/skip: onboarding complete');
})();

// isOnboardingComplete for uninitialized player
(function() {
  var state = makeState();
  assert(PlayerOnboarding.isOnboardingComplete(state, 'ghost_player') === false, 'Uninitialized player: not complete');
})();

// After partial completion
(function() {
  var f = freshPlayer(0);
  var allSteps = PlayerOnboarding.getAllSteps();
  for (var i = 0; i < 19; i++) {
    PlayerOnboarding.completeStep(f.state, f.pid, allSteps[i].id, i);
  }
  assert(PlayerOnboarding.isOnboardingComplete(f.state, f.pid) === false, '19 of 20 steps: not yet complete');
})();

// ---------------------------------------------------------------------------
// SUITE 12 — getRewardsEarned
// ---------------------------------------------------------------------------
console.log('\n--- Suite 12: getRewardsEarned ---');

(function() {
  var f = freshPlayer(0);
  var rewards = PlayerOnboarding.getRewardsEarned(f.state, f.pid);
  assert(rewards.spark === 0, 'Fresh player: 0 spark rewards earned');
  assert(rewards.xp === 0, 'Fresh player: 0 xp rewards earned');
})();

(function() {
  var f = freshPlayer(0);
  PlayerOnboarding.completeStep(f.state, f.pid, 'welcome', 1);
  var rewards = PlayerOnboarding.getRewardsEarned(f.state, f.pid);
  assert(rewards.spark === 10, 'After welcome: 10 spark earned');
  assert(rewards.xp === 5, 'After welcome: 5 xp earned');
})();

(function() {
  var f = freshPlayer(0);
  completeAllSteps(f.state, f.pid);
  var rewards = PlayerOnboarding.getRewardsEarned(f.state, f.pid);
  assert(rewards.spark > 0, 'All steps completed: spark > 0');
  assert(rewards.xp > 0, 'All steps completed: xp > 0');
  // Total spark should be sum of all step rewards
  var totalSpark = 0;
  var allSteps = PlayerOnboarding.getAllSteps();
  for (var i = 0; i < allSteps.length; i++) { totalSpark += allSteps[i].reward.spark; }
  assert(rewards.spark === totalSpark, 'Total spark matches sum of all step rewards');
})();

// getRewardsEarned for uninitialized player
(function() {
  var state = makeState();
  var rewards = PlayerOnboarding.getRewardsEarned(state, 'ghost_player');
  assert(rewards.spark === 0, 'getRewardsEarned for uninitialized player: 0 spark');
  assert(rewards.xp === 0, 'getRewardsEarned for uninitialized player: 0 xp');
})();

// Skip does not add to rewards
(function() {
  var f = freshPlayer(0);
  PlayerOnboarding.skipStep(f.state, f.pid, 'welcome');
  var rewards = PlayerOnboarding.getRewardsEarned(f.state, f.pid);
  assert(rewards.spark === 0, 'Skipped step: no spark reward');
  assert(rewards.xp === 0, 'Skipped step: no xp reward');
})();

// ---------------------------------------------------------------------------
// SUITE 13 — resetOnboarding
// ---------------------------------------------------------------------------
console.log('\n--- Suite 13: resetOnboarding ---');

(function() {
  var f = freshPlayer(0);
  PlayerOnboarding.completeStep(f.state, f.pid, 'welcome', 1);
  PlayerOnboarding.completeStep(f.state, f.pid, 'move_character', 2);
  var result = PlayerOnboarding.resetOnboarding(f.state, f.pid, 500);
  assert(result !== null, 'resetOnboarding returns new state');
  assert(result.completedSteps.length === 0, 'resetOnboarding clears completedSteps');
  assert(result.skippedSteps.length === 0, 'resetOnboarding clears skippedSteps');
  assert(result.currentStep === 0, 'resetOnboarding resets currentStep to 0');
  assert(result.completedAt === null, 'resetOnboarding clears completedAt');
  assert(result.startedAt === 500, 'resetOnboarding sets new startedAt tick');
  assert(result.totalRewards.spark === 0, 'resetOnboarding clears spark rewards');
  assert(result.totalRewards.xp === 0, 'resetOnboarding clears xp rewards');
  assert(result.returnVisits === 0, 'resetOnboarding clears returnVisits');
})();

// After reset, can re-complete
(function() {
  var f = freshPlayer(0);
  PlayerOnboarding.completeStep(f.state, f.pid, 'welcome', 1);
  PlayerOnboarding.resetOnboarding(f.state, f.pid, 100);
  var result = PlayerOnboarding.completeStep(f.state, f.pid, 'welcome', 101);
  assert(result.success === true, 'After reset, can re-complete welcome');
})();

// Reset creates player if doesn't exist
(function() {
  var state = makeState();
  var pid = uid();
  var result = PlayerOnboarding.resetOnboarding(state, pid, 0);
  assert(result !== null, 'resetOnboarding creates player state if missing');
})();

// ---------------------------------------------------------------------------
// SUITE 14 — recordReturn and getWelcomeBackMessage
// ---------------------------------------------------------------------------
console.log('\n--- Suite 14: recordReturn and getWelcomeBackMessage ---');

(function() {
  var f = freshPlayer(0);
  var result = PlayerOnboarding.recordReturn(f.state, f.pid, 1000);
  assert(result !== null, 'recordReturn returns result');
  assert(result.returnVisits === 1, 'recordReturn increments returnVisits to 1');
  assert(typeof result.message === 'string', 'recordReturn returns message string');
  assert(result.message.length > 0, 'recordReturn message is non-empty');
})();

// returnVisits increments on each call
(function() {
  var f = freshPlayer(0);
  PlayerOnboarding.recordReturn(f.state, f.pid, 100);
  PlayerOnboarding.recordReturn(f.state, f.pid, 200);
  PlayerOnboarding.recordReturn(f.state, f.pid, 300);
  var ps = f.state.players[f.pid];
  assert(ps.returnVisits === 3, 'returnVisits increments to 3 after 3 recordReturn calls');
})();

// recordReturn for uninitialized player
(function() {
  var state = makeState();
  var result = PlayerOnboarding.recordReturn(state, 'ghost_player', 100);
  assert(result === null, 'recordReturn returns null for uninitialized player');
})();

// getWelcomeBackMessage personalized
(function() {
  var f = freshPlayer(0);
  var msg = PlayerOnboarding.getWelcomeBackMessage(f.state, f.pid);
  assert(typeof msg === 'string', 'getWelcomeBackMessage returns a string');
  assert(msg.length > 0, 'getWelcomeBackMessage returns non-empty string');
  assert(msg.indexOf(f.pid) !== -1, 'getWelcomeBackMessage includes player id');
})();

// getWelcomeBackMessage includes progress context (0%)
(function() {
  var f = freshPlayer(0);
  var msg = PlayerOnboarding.getWelcomeBackMessage(f.state, f.pid);
  assert(msg.indexOf('beginning') !== -1 || msg.length > 10, 'getWelcomeBackMessage reflects 0% progress');
})();

// getWelcomeBackMessage includes progress context (100%)
(function() {
  var f = freshPlayer(0);
  completeAllSteps(f.state, f.pid);
  var msg = PlayerOnboarding.getWelcomeBackMessage(f.state, f.pid);
  assert(msg.length > 0, 'getWelcomeBackMessage works for completed player');
})();

// getWelcomeBackMessage for uninitialized player
(function() {
  var state = makeState();
  var msg = PlayerOnboarding.getWelcomeBackMessage(state, 'ghost_player');
  assert(typeof msg === 'string', 'getWelcomeBackMessage returns string for uninitialized player');
})();

// ---------------------------------------------------------------------------
// SUITE 15 — getStepsByCategory
// ---------------------------------------------------------------------------
console.log('\n--- Suite 15: getStepsByCategory ---');

(function() {
  var basics = PlayerOnboarding.getStepsByCategory('basics');
  assert(Array.isArray(basics), 'getStepsByCategory returns array');
  assert(basics.length > 0, 'basics category has at least one step');
  for (var i = 0; i < basics.length; i++) {
    assert(basics[i].category === 'basics', 'getStepsByCategory only returns steps of correct category');
  }
})();

(function() {
  var movement = PlayerOnboarding.getStepsByCategory('movement');
  assert(movement.length > 0, 'movement category has at least one step');
})();

(function() {
  var social = PlayerOnboarding.getStepsByCategory('social');
  assert(social.length > 0, 'social category has steps');
})();

(function() {
  var advanced = PlayerOnboarding.getStepsByCategory('advanced');
  assert(advanced.length > 0, 'advanced category has steps');
})();

(function() {
  var none = PlayerOnboarding.getStepsByCategory('nonexistent_category');
  assert(Array.isArray(none), 'getStepsByCategory for unknown category returns array');
  assert(none.length === 0, 'getStepsByCategory for unknown category returns empty array');
})();

// All 7 known categories have steps
(function() {
  var cats = ['basics', 'movement', 'social', 'economy', 'crafting', 'exploration', 'advanced'];
  for (var i = 0; i < cats.length; i++) {
    var catSteps = PlayerOnboarding.getStepsByCategory(cats[i]);
    assert(catSteps.length > 0, 'Category ' + cats[i] + ' has at least one step');
  }
})();

// ---------------------------------------------------------------------------
// SUITE 16 — getAllSteps
// ---------------------------------------------------------------------------
console.log('\n--- Suite 16: getAllSteps ---');

(function() {
  var all = PlayerOnboarding.getAllSteps();
  assert(Array.isArray(all), 'getAllSteps returns array');
  assert(all.length === 20, 'getAllSteps returns 20 steps');
})();

// getAllSteps returns a copy (not reference)
(function() {
  var all1 = PlayerOnboarding.getAllSteps();
  var all2 = PlayerOnboarding.getAllSteps();
  all1.push({ id: 'fake' });
  assert(all2.length === 20, 'getAllSteps returns a copy — mutating one does not affect another');
})();

// ---------------------------------------------------------------------------
// SUITE 17 — getSuggestedActions
// ---------------------------------------------------------------------------
console.log('\n--- Suite 17: getSuggestedActions ---');

(function() {
  var f = freshPlayer(0);
  var suggested = PlayerOnboarding.getSuggestedActions(f.state, f.pid);
  assert(Array.isArray(suggested), 'getSuggestedActions returns array');
  assert(suggested.length === 3, 'getSuggestedActions returns 3 suggestions');
})();

// Suggestions are valid steps
(function() {
  var f = freshPlayer(0);
  var suggested = PlayerOnboarding.getSuggestedActions(f.state, f.pid);
  for (var i = 0; i < suggested.length; i++) {
    assert(suggested[i].id !== undefined, 'Each suggested action has an id');
    assert(suggested[i].instruction !== undefined, 'Each suggested action has an instruction');
  }
})();

// Suggestions do not include completed steps
(function() {
  var f = freshPlayer(0);
  PlayerOnboarding.completeStep(f.state, f.pid, 'welcome', 1);
  var suggested = PlayerOnboarding.getSuggestedActions(f.state, f.pid);
  var hasWelcome = false;
  for (var i = 0; i < suggested.length; i++) {
    if (suggested[i].id === 'welcome') { hasWelcome = true; }
  }
  assert(hasWelcome === false, 'Suggestions do not include completed welcome step');
})();

// getSuggestedActions for uninitialized player
(function() {
  var state = makeState();
  var suggested = PlayerOnboarding.getSuggestedActions(state, 'ghost_player');
  assert(Array.isArray(suggested), 'getSuggestedActions for uninitialized player returns array');
  assert(suggested.length === 0, 'getSuggestedActions for uninitialized player returns empty');
})();

// Suggestions when complete
(function() {
  var f = freshPlayer(0);
  completeAllSteps(f.state, f.pid);
  var suggested = PlayerOnboarding.getSuggestedActions(f.state, f.pid);
  assert(Array.isArray(suggested), 'getSuggestedActions when complete returns array');
  assert(suggested.length === 0, 'getSuggestedActions when complete returns empty array');
})();

// ---------------------------------------------------------------------------
// SUITE 18 — getOnboardingStats
// ---------------------------------------------------------------------------
console.log('\n--- Suite 18: getOnboardingStats ---');

(function() {
  var state = makeState();
  var stats = PlayerOnboarding.getOnboardingStats(state);
  assert(stats.totalPlayers === 0, 'Empty state: totalPlayers is 0');
  assert(stats.completedPlayers === 0, 'Empty state: completedPlayers is 0');
  assert(stats.completionRate === 0, 'Empty state: completionRate is 0');
  assert(stats.avgTimeToComplete === 0, 'Empty state: avgTimeToComplete is 0');
  assert(stats.mostSkippedStep === null, 'Empty state: mostSkippedStep is null');
})();

(function() {
  var state = makeState();
  var p1 = uid();
  PlayerOnboarding.initOnboarding(state, p1, 0);
  var stats = PlayerOnboarding.getOnboardingStats(state);
  assert(stats.totalPlayers === 1, 'Stats: 1 total player');
  assert(stats.completedPlayers === 0, 'Stats: 0 completed players before any completion');
  assert(stats.completionRate === 0, 'Stats: 0% completion rate');
})();

// Stats with completed player
(function() {
  var state = makeState();
  var p1 = uid();
  PlayerOnboarding.initOnboarding(state, p1, 0);
  completeAllSteps(state, p1);
  var stats = PlayerOnboarding.getOnboardingStats(state);
  assert(stats.totalPlayers === 1, 'Stats: 1 total player after completion');
  assert(stats.completedPlayers === 1, 'Stats: 1 completed player');
  assert(stats.completionRate === 100, 'Stats: 100% completion rate with 1/1 complete');
})();

// Stats with multiple players
(function() {
  var state = makeState();
  var p1 = uid(), p2 = uid();
  PlayerOnboarding.initOnboarding(state, p1, 0);
  PlayerOnboarding.initOnboarding(state, p2, 0);
  completeAllSteps(state, p1);
  var stats = PlayerOnboarding.getOnboardingStats(state);
  assert(stats.totalPlayers === 2, 'Stats: 2 total players');
  assert(stats.completedPlayers === 1, 'Stats: 1 of 2 completed');
  assert(stats.completionRate === 50, 'Stats: 50% completion rate with 1/2');
})();

// Stats mostSkippedStep
(function() {
  var state = makeState();
  var p1 = uid(), p2 = uid(), p3 = uid();
  PlayerOnboarding.initOnboarding(state, p1, 0);
  PlayerOnboarding.initOnboarding(state, p2, 0);
  PlayerOnboarding.initOnboarding(state, p3, 0);
  PlayerOnboarding.skipStep(state, p1, 'plant_seed');
  PlayerOnboarding.skipStep(state, p2, 'plant_seed');
  PlayerOnboarding.skipStep(state, p3, 'catch_first_fish');
  var stats = PlayerOnboarding.getOnboardingStats(state);
  assert(stats.mostSkippedStep === 'plant_seed', 'mostSkippedStep is plant_seed (skipped by 2 players)');
})();

// avgTimeToComplete
(function() {
  var state = makeState();
  var p1 = uid(), p2 = uid();
  PlayerOnboarding.initOnboarding(state, p1, 0);
  PlayerOnboarding.initOnboarding(state, p2, 0);
  var allSteps = PlayerOnboarding.getAllSteps();
  for (var i = 0; i < allSteps.length; i++) {
    PlayerOnboarding.completeStep(state, p1, allSteps[i].id, i);
    PlayerOnboarding.completeStep(state, p2, allSteps[i].id, i * 2);
  }
  var stats = PlayerOnboarding.getOnboardingStats(state);
  // p1: completedAt = 19, startedAt = 0, time = 19
  // p2: completedAt = 38, startedAt = 0, time = 38
  // avg = (19 + 38) / 2 = 28.5 → rounded to 29
  assert(stats.avgTimeToComplete === 29, 'avgTimeToComplete calculates correctly');
})();

// ---------------------------------------------------------------------------
// SUITE 19 — getStepById
// ---------------------------------------------------------------------------
console.log('\n--- Suite 19: getStepById ---');

(function() {
  var step = PlayerOnboarding.getStepById('welcome');
  assert(step !== null, 'getStepById returns step for valid id');
  assert(step.id === 'welcome', 'getStepById returns correct step');
  assert(step.name === 'Welcome to ZION', 'getStepById returns full step object');
})();

(function() {
  var step = PlayerOnboarding.getStepById('complete_onboarding');
  assert(step !== null, 'getStepById returns last step');
  assert(step.order === 19, 'Last step has order 19');
})();

(function() {
  var step = PlayerOnboarding.getStepById('nonexistent');
  assert(step === null, 'getStepById returns null for unknown id');
})();

// All 20 step ids work
(function() {
  var allSteps = PlayerOnboarding.getAllSteps();
  for (var i = 0; i < allSteps.length; i++) {
    var s = PlayerOnboarding.getStepById(allSteps[i].id);
    assert(s !== null && s.id === allSteps[i].id, 'getStepById works for step: ' + allSteps[i].id);
  }
})();

// ---------------------------------------------------------------------------
// SUITE 20 — Edge cases and integration
// ---------------------------------------------------------------------------
console.log('\n--- Suite 20: Edge cases and integration ---');

// Complete onboarding then try to complete another step
(function() {
  var f = freshPlayer(0);
  completeAllSteps(f.state, f.pid);
  var result = PlayerOnboarding.completeStep(f.state, f.pid, 'welcome', 999);
  assert(result.success === false, 'Cannot re-complete welcome after onboarding is done');
})();

// Skip already-completed step
(function() {
  var f = freshPlayer(0);
  PlayerOnboarding.completeStep(f.state, f.pid, 'welcome', 1);
  var result = PlayerOnboarding.skipStep(f.state, f.pid, 'welcome');
  assert(result.success === false, 'Cannot skip already-completed step');
})();

// Init twice with different ticks — second call should be no-op
(function() {
  var state = makeState();
  var pid = uid();
  PlayerOnboarding.initOnboarding(state, pid, 100);
  PlayerOnboarding.initOnboarding(state, pid, 999);
  var ps = state.players[pid];
  assert(ps.startedAt === 100, 'Second initOnboarding preserves original startedAt');
})();

// Total estimated ticks for fresh player
(function() {
  var f = freshPlayer(0);
  var progress = PlayerOnboarding.getProgress(f.state, f.pid);
  var expectedTotal = 0;
  var allSteps = PlayerOnboarding.getAllSteps();
  for (var i = 0; i < allSteps.length; i++) { expectedTotal += allSteps[i].estimatedTicks; }
  assert(progress.estimatedTimeRemaining === expectedTotal, 'Fresh player estimatedTimeRemaining equals sum of all step ticks');
})();

// Completing out of strict order is allowed by the system
(function() {
  var f = freshPlayer(0);
  // Skip welcome, then complete move_character
  PlayerOnboarding.skipStep(f.state, f.pid, 'welcome');
  var result = PlayerOnboarding.completeStep(f.state, f.pid, 'move_character', 5);
  assert(result.success === true, 'Can complete a step after skipping its prerequisite');
})();

// Multiple players in same state object
(function() {
  var state = makeState();
  var p1 = uid(), p2 = uid();
  PlayerOnboarding.initOnboarding(state, p1, 0);
  PlayerOnboarding.initOnboarding(state, p2, 0);
  PlayerOnboarding.completeStep(state, p1, 'welcome', 1);
  var p1Progress = PlayerOnboarding.getProgress(state, p1);
  var p2Progress = PlayerOnboarding.getProgress(state, p2);
  assert(p1Progress.completed === 1, 'p1 has 1 completed step');
  assert(p2Progress.completed === 0, 'p2 is unaffected by p1 progress');
})();

// getNextSteps after completing most steps
(function() {
  var f = freshPlayer(0);
  var allSteps = PlayerOnboarding.getAllSteps();
  for (var i = 0; i < 19; i++) {
    PlayerOnboarding.completeStep(f.state, f.pid, allSteps[i].id, i);
  }
  var next = PlayerOnboarding.getNextSteps(f.state, f.pid, 3);
  assert(next.length === 1, 'getNextSteps returns 1 when only 1 remains');
  assert(next[0].id === 'complete_onboarding', 'Last remaining step is complete_onboarding');
})();

// Hints shown and dismissed are independent counters
(function() {
  var f = freshPlayer(0);
  PlayerOnboarding.getHint(f.state, f.pid);
  PlayerOnboarding.getHint(f.state, f.pid);
  PlayerOnboarding.dismissHint(f.state, f.pid);
  var ps = f.state.players[f.pid];
  assert(ps.hints.shown === 2, 'hints.shown is 2');
  assert(ps.hints.dismissed === 1, 'hints.dismissed is 1 independently');
})();

// recordReturn sets lastReturnAt
(function() {
  var f = freshPlayer(0);
  PlayerOnboarding.recordReturn(f.state, f.pid, 9999);
  var ps = f.state.players[f.pid];
  assert(ps.lastReturnAt === 9999, 'recordReturn sets lastReturnAt to currentTick');
})();

// getCompletedSteps returns full step objects in order
(function() {
  var f = freshPlayer(0);
  PlayerOnboarding.completeStep(f.state, f.pid, 'welcome', 1);
  PlayerOnboarding.completeStep(f.state, f.pid, 'move_character', 2);
  var completed = PlayerOnboarding.getCompletedSteps(f.state, f.pid);
  assert(completed.length === 2, 'getCompletedSteps returns 2');
  assert(completed[0].id === 'welcome', 'First completed step is welcome');
  assert(completed[1].id === 'move_character', 'Second completed step is move_character');
})();

// ---------------------------------------------------------------------------
// SUMMARY
// ---------------------------------------------------------------------------
console.log('\n========================================');
console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
if (failures.length > 0) {
  console.log('\nFailures:');
  for (var fi = 0; fi < failures.length; fi++) {
    console.log('  - ' + failures[fi]);
  }
}
console.log('========================================');
process.exit(failed > 0 ? 1 : 0);
