// Test: PlayerOnboarding.createState, initOnboarding, completeStep
var PlayerOnboarding = require('../src/js/player_onboarding.js');

var passed = 0;
var failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; }
  else { failed++; console.error('FAIL: ' + msg); }
}

// createState exists and returns valid container
assert(typeof PlayerOnboarding.createState === 'function', 'createState is a function');
var state = PlayerOnboarding.createState();
assert(state !== null && typeof state === 'object', 'createState returns object');
assert(typeof state.players === 'object', 'createState returns {players:{}}');

// initOnboarding creates player record
var ps = PlayerOnboarding.initOnboarding(state, 'testPlayer', 0);
assert(ps !== null && typeof ps === 'object', 'initOnboarding returns player state');
assert(ps.playerId === 'testPlayer', 'player state has correct playerId');
assert(Array.isArray(ps.completedSteps), 'completedSteps is an array');
assert(ps.completedSteps.length === 0, 'starts with no completed steps');
assert(ps.currentStep === 0, 'starts at step 0');

// initOnboarding is idempotent
var ps2 = PlayerOnboarding.initOnboarding(state, 'testPlayer', 10);
assert(ps2 === ps, 'initOnboarding is idempotent — returns same object');

// completeStep tracks progress
var result = PlayerOnboarding.completeStep(state, 'testPlayer', 'welcome', 5);
assert(result.success === true, 'completeStep returns success');
assert(result.reward.spark === 10, 'welcome step awards 10 spark');
assert(result.reward.xp === 5, 'welcome step awards 5 xp');

// getProgress reflects completed step
var progress = PlayerOnboarding.getProgress(state, 'testPlayer');
assert(progress.completed === 1, 'progress shows 1 completed');
assert(progress.percent > 0, 'progress percent > 0');

// completeStep rejects duplicate
var dup = PlayerOnboarding.completeStep(state, 'testPlayer', 'welcome', 6);
assert(dup.success === false, 'duplicate completeStep returns false');

console.log('test_roadmap_onboarding: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
