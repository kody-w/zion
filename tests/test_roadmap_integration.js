// Test: End-to-end onboarding — createState -> initOnboarding -> completeStep -> verify
var PlayerOnboarding = require('../src/js/player_onboarding.js');

var passed = 0;
var failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; }
  else { failed++; console.error('FAIL: ' + msg); }
}

// Full flow: createState -> init -> complete steps -> check progress
var state = PlayerOnboarding.createState();
assert(state && state.players, 'createState gives valid container');

// Init two players
PlayerOnboarding.initOnboarding(state, 'alice', 0);
PlayerOnboarding.initOnboarding(state, 'bob', 0);
assert(Object.keys(state.players).length === 2, 'two players initialized');

// Alice completes first 3 steps
var r1 = PlayerOnboarding.completeStep(state, 'alice', 'welcome', 1);
assert(r1.success, 'alice completes welcome');
var r2 = PlayerOnboarding.completeStep(state, 'alice', 'move_character', 2);
assert(r2.success, 'alice completes move_character');
var r3 = PlayerOnboarding.completeStep(state, 'alice', 'visit_zone', 3);
assert(r3.success, 'alice completes visit_zone');

// Alice progress
var aliceProg = PlayerOnboarding.getProgress(state, 'alice');
assert(aliceProg.completed === 3, 'alice has 3 completed steps');
assert(aliceProg.percent === Math.round((3 / 20) * 100), 'alice percent correct');

// Bob has 0 progress
var bobProg = PlayerOnboarding.getProgress(state, 'bob');
assert(bobProg.completed === 0, 'bob has 0 completed');

// getCurrentStep for alice should be next uncompleted
var aliceNext = PlayerOnboarding.getCurrentStep(state, 'alice');
assert(aliceNext && aliceNext.id === 'open_inventory', 'alice next step is open_inventory');

// getHint works
var hint = PlayerOnboarding.getHint(state, 'alice');
assert(hint !== null, 'getHint returns a hint');
assert(hint.instruction !== undefined, 'hint has instruction');

// getRewardsEarned accumulates
var rewards = PlayerOnboarding.getRewardsEarned(state, 'alice');
assert(rewards.spark === 10 + 10 + 15, 'alice earned 35 spark from 3 steps');
assert(rewards.xp === 5 + 10 + 15, 'alice earned 30 xp from 3 steps');

// Stats across all players
var stats = PlayerOnboarding.getOnboardingStats(state);
assert(stats.totalPlayers === 2, 'stats show 2 total players');
assert(stats.completedPlayers === 0, 'no one has completed yet');

// isOnboardingComplete is false for both
assert(!PlayerOnboarding.isOnboardingComplete(state, 'alice'), 'alice not complete');
assert(!PlayerOnboarding.isOnboardingComplete(state, 'bob'), 'bob not complete');

console.log('test_roadmap_integration: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
