// Test: BountyBoard wiring — postBounty, acceptBounty, submitEvidence, requestVerdict, expireBounties, getBountyBoardStats
var BountyBoard = require('../src/js/bounty_board.js');

var passed = 0;
var failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; }
  else { failed++; console.error('FAIL: ' + msg); }
}

// Create state
var state = BountyBoard.createState();
assert(state !== null && typeof state === 'object', 'createState returns object');

// postBounty
var postResult = BountyBoard.postBounty(state, 'poster1', 'target1', 'locate_item', 'Find the lost sword', 150, 100);
assert(postResult !== null && typeof postResult === 'object', 'postBounty returns result');
assert(postResult.success === true, 'postBounty succeeds');
var bountyId = postResult.bounty ? postResult.bounty.id : (postResult.id || null);
assert(bountyId !== null, 'postBounty returns bounty id');

// getActiveBounties
var active = BountyBoard.getActiveBounties(state);
assert(Array.isArray(active), 'getActiveBounties returns array');
assert(active.length >= 1, 'getActiveBounties has at least 1 bounty');

// acceptBounty
var acceptResult = BountyBoard.acceptBounty(state, bountyId, 'hunter1', 200);
assert(acceptResult !== null && typeof acceptResult === 'object', 'acceptBounty returns result');
assert(acceptResult.success === true, 'acceptBounty succeeds');

// submitEvidence
var evidenceResult = BountyBoard.submitEvidence(state, bountyId, 'hunter1', 'Found the sword at 100,200', 300);
assert(evidenceResult !== null && typeof evidenceResult === 'object', 'submitEvidence returns result');

// requestVerdict
var verdictResult = BountyBoard.requestVerdict(state, bountyId, 400);
assert(verdictResult !== null && typeof verdictResult === 'object', 'requestVerdict returns result');

// expireBounties: should not throw
BountyBoard.expireBounties(state, 999999);
assert(true, 'expireBounties runs without error');

// getBountyBoardStats
var stats = BountyBoard.getBountyBoardStats(state);
assert(stats !== null && typeof stats === 'object', 'getBountyBoardStats returns object');
assert(typeof stats.active === 'number' || typeof stats.total === 'number', 'stats has numeric fields');

// Post multiple bounties to test stats
BountyBoard.postBounty(state, 'poster2', 'target2', 'investigation', 'Investigate theft', 200, 500);
BountyBoard.postBounty(state, 'poster3', 'target3', 'challenge', 'Duel challenge', 100, 600);
var stats2 = BountyBoard.getBountyBoardStats(state);
assert(typeof stats2 === 'object', 'stats after multiple posts is object');

console.log('test_wiring_bounty_board: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
