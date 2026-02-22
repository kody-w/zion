/**
 * tests/test_zone_stewards.js
 * 135+ tests for the ZION Zone Stewards governance system.
 * Standalone runner — no external test framework required.
 * Run with: node tests/test_zone_stewards.js
 */

'use strict';

var ZoneStewards = require('../src/js/zone_stewards.js');

// ============================================================================
// MINIMAL TEST HARNESS
// ============================================================================

var passed = 0;
var failed = 0;
var failures = [];
var currentSuite = '';

function suite(name, fn) {
  currentSuite = name;
  console.log('\n--- ' + name + ' ---');
  fn();
}

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log('  pass: ' + msg);
  } else {
    failed++;
    var fullMsg = '[' + currentSuite + '] FAIL: ' + msg;
    failures.push(fullMsg);
    console.log('  FAIL: ' + msg);
  }
}

function assertEqual(a, b, msg) {
  assert(a === b, (msg || 'assertEqual') + ' (expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a) + ')');
}

function assertNotEqual(a, b, msg) {
  assert(a !== b, (msg || 'assertNotEqual') + ' (both are ' + JSON.stringify(a) + ')');
}

function assertNull(val, msg) {
  assert(val === null || val === undefined, (msg || 'assertNull') + ' (got ' + JSON.stringify(val) + ')');
}

function assertNotNull(val, msg) {
  assert(val !== null && val !== undefined, (msg || 'assertNotNull') + ' (got null/undefined)');
}

function assertGreater(a, b, msg) {
  assert(a > b, (msg || 'assertGreater') + ' (expected ' + a + ' > ' + b + ')');
}

function assertGTE(a, b, msg) {
  assert(a >= b, (msg || 'assertGTE') + ' (expected ' + a + ' >= ' + b + ')');
}

function assertArray(val, msg) {
  assert(Array.isArray(val), (msg || 'assertArray') + ' (got ' + typeof val + ')');
}

// Shorthand for fresh state
function freshState() {
  return ZoneStewards.createState();
}

// ============================================================================
// HELPERS
// ============================================================================

// Elect a steward for a zone quickly
function electSteward(state, zone, playerId, tick) {
  tick = tick || 0;
  ZoneStewards.nominateSelf(state, playerId, zone, tick);
  // Give 3 votes so they meet quorum on any proposals
  ZoneStewards.castElectionVote(state, 'voter1', zone, playerId, tick);
  ZoneStewards.castElectionVote(state, 'voter2', zone, playerId, tick);
  ZoneStewards.castElectionVote(state, 'voter3', zone, playerId, tick);
  return ZoneStewards.closeElection(state, zone, tick + 1);
}

// ============================================================================
// SUITE 1: Module Exports
// ============================================================================

suite('Module Exports', function() {
  assert(typeof ZoneStewards === 'object', 'ZoneStewards is an object');
  assertArray(ZoneStewards.ZONES, 'ZONES exported');
  assertArray(ZoneStewards.PROPOSAL_TYPES, 'PROPOSAL_TYPES exported');
  assert(typeof ZoneStewards.createState === 'function', 'createState exported');
  assert(typeof ZoneStewards.nominateSelf === 'function', 'nominateSelf exported');
  assert(typeof ZoneStewards.castElectionVote === 'function', 'castElectionVote exported');
  assert(typeof ZoneStewards.closeElection === 'function', 'closeElection exported');
  assert(typeof ZoneStewards.getSteward === 'function', 'getSteward exported');
  assert(typeof ZoneStewards.getAllStewards === 'function', 'getAllStewards exported');
  assert(typeof ZoneStewards.createProposal === 'function', 'createProposal exported');
  assert(typeof ZoneStewards.voteOnProposal === 'function', 'voteOnProposal exported');
  assert(typeof ZoneStewards.closeProposal === 'function', 'closeProposal exported');
  assert(typeof ZoneStewards.getProposals === 'function', 'getProposals exported');
  assert(typeof ZoneStewards.fileDispute === 'function', 'fileDispute exported');
  assert(typeof ZoneStewards.resolveDispute === 'function', 'resolveDispute exported');
  assert(typeof ZoneStewards.getDisputes === 'function', 'getDisputes exported');
  assert(typeof ZoneStewards.getStewardStats === 'function', 'getStewardStats exported');
  assert(typeof ZoneStewards.getElectionHistory === 'function', 'getElectionHistory exported');
  assert(typeof ZoneStewards.isElectionOpen === 'function', 'isElectionOpen exported');
  assert(typeof ZoneStewards.getTermRemaining === 'function', 'getTermRemaining exported');
  assert(typeof ZoneStewards.expireTerms === 'function', 'expireTerms exported');
});

// ============================================================================
// SUITE 2: ZONES Constant
// ============================================================================

suite('ZONES constant', function() {
  var ZONES = ZoneStewards.ZONES;
  assertEqual(ZONES.length, 8, 'exactly 8 zones');
  assert(ZONES.indexOf('nexus') !== -1, 'nexus present');
  assert(ZONES.indexOf('gardens') !== -1, 'gardens present');
  assert(ZONES.indexOf('athenaeum') !== -1, 'athenaeum present');
  assert(ZONES.indexOf('studio') !== -1, 'studio present');
  assert(ZONES.indexOf('wilds') !== -1, 'wilds present');
  assert(ZONES.indexOf('agora') !== -1, 'agora present');
  assert(ZONES.indexOf('commons') !== -1, 'commons present');
  assert(ZONES.indexOf('arena') !== -1, 'arena present');
  assert(ZONES.indexOf('unknown') === -1, 'unknown not in zones');
});

// ============================================================================
// SUITE 3: PROPOSAL_TYPES Constant
// ============================================================================

suite('PROPOSAL_TYPES constant', function() {
  var PT = ZoneStewards.PROPOSAL_TYPES;
  assertEqual(PT.length, 6, 'exactly 6 proposal types');

  var ids = PT.map(function(p) { return p.id; });
  assert(ids.indexOf('zone_event') !== -1, 'zone_event type exists');
  assert(ids.indexOf('anchor_approval') !== -1, 'anchor_approval type exists');
  assert(ids.indexOf('rule_change') !== -1, 'rule_change type exists');
  assert(ids.indexOf('resource_allocation') !== -1, 'resource_allocation type exists');
  assert(ids.indexOf('festival') !== -1, 'festival type exists');
  assert(ids.indexOf('maintenance') !== -1, 'maintenance type exists');

  // Each type has required fields
  for (var i = 0; i < PT.length; i++) {
    var p = PT[i];
    assert(typeof p.id === 'string' && p.id.length > 0, p.id + ' has valid id');
    assert(typeof p.name === 'string' && p.name.length > 0, p.id + ' has valid name');
    assert(typeof p.description === 'string' && p.description.length > 0, p.id + ' has description');
  }
});

// ============================================================================
// SUITE 4: createState
// ============================================================================

suite('createState', function() {
  var state = freshState();
  assert(typeof state === 'object', 'returns object');
  assert(typeof state.elections === 'object', 'elections map exists');
  assert(typeof state.stewards === 'object', 'stewards map exists');
  assertArray(state.proposals, 'proposals is array');
  assertArray(state.disputes, 'disputes is array');
  assertArray(state.electionLog, 'electionLog is array');
  assertEqual(state.proposals.length, 0, 'proposals starts empty');
  assertEqual(state.disputes.length, 0, 'disputes starts empty');
  assertEqual(state.electionLog.length, 0, 'electionLog starts empty');

  // Multiple createState calls return independent objects
  var s2 = freshState();
  s2.proposals.push({ id: 'x' });
  assertEqual(state.proposals.length, 0, 'states are independent');
});

// ============================================================================
// SUITE 5: nominateSelf
// ============================================================================

suite('nominateSelf', function() {
  var state = freshState();

  // Valid nomination opens election
  var r1 = ZoneStewards.nominateSelf(state, 'alice', 'nexus', 100);
  assert(r1.success, 'first nomination succeeds');
  assertNotNull(r1.nomination, 'nomination object returned');
  assertEqual(r1.nomination.playerId, 'alice', 'nomination has playerId');
  assertEqual(r1.nomination.zone, 'nexus', 'nomination has zone');
  assertEqual(r1.nomination.nominatedTick, 100, 'nomination has tick');
  assert(ZoneStewards.isElectionOpen(state, 'nexus'), 'election opened after nomination');

  // Duplicate nomination
  var r2 = ZoneStewards.nominateSelf(state, 'alice', 'nexus', 110);
  assert(!r2.success, 'duplicate nomination fails');
  assertEqual(r2.reason, 'already_nominated', 'correct reason');

  // Different player can also nominate
  var r3 = ZoneStewards.nominateSelf(state, 'bob', 'nexus', 120);
  assert(r3.success, 'second candidate can nominate');

  // Invalid zone
  var r4 = ZoneStewards.nominateSelf(state, 'carol', 'nowhere', 130);
  assert(!r4.success, 'invalid zone fails');
  assertEqual(r4.reason, 'invalid_zone', 'correct reason for bad zone');

  // Missing playerId
  var r5 = ZoneStewards.nominateSelf(state, '', 'gardens', 140);
  assert(!r5.success, 'empty playerId fails');

  // Different zone starts its own election
  var r6 = ZoneStewards.nominateSelf(state, 'dave', 'gardens', 200);
  assert(r6.success, 'nomination in different zone succeeds');
  assert(ZoneStewards.isElectionOpen(state, 'gardens'), 'gardens election is open');
  assert(ZoneStewards.isElectionOpen(state, 'nexus'), 'nexus election still open');

  // After election closes, new nomination re-opens
  var state2 = freshState();
  ZoneStewards.nominateSelf(state2, 'alice', 'studio', 0);
  ZoneStewards.closeElection(state2, 'studio', 1);
  assert(!ZoneStewards.isElectionOpen(state2, 'studio'), 'election closed');
  var r7 = ZoneStewards.nominateSelf(state2, 'bob', 'studio', 5000);
  assert(r7.success, 'new nomination after closed election opens fresh election');
  assert(ZoneStewards.isElectionOpen(state2, 'studio'), 'new election is open');
});

// ============================================================================
// SUITE 6: castElectionVote
// ============================================================================

suite('castElectionVote', function() {
  var state = freshState();
  ZoneStewards.nominateSelf(state, 'alice', 'agora', 0);
  ZoneStewards.nominateSelf(state, 'bob', 'agora', 10);

  // Valid vote
  var r1 = ZoneStewards.castElectionVote(state, 'voter1', 'agora', 'alice', 50);
  assert(r1.success, 'first vote succeeds');

  // Vote again (same voter)
  var r2 = ZoneStewards.castElectionVote(state, 'voter1', 'agora', 'bob', 55);
  assert(!r2.success, 'double-vote fails');
  assertEqual(r2.reason, 'already_voted', 'correct reason');

  // Vote for non-candidate
  var r3 = ZoneStewards.castElectionVote(state, 'voter2', 'agora', 'carol', 60);
  assert(!r3.success, 'vote for non-candidate fails');
  assertEqual(r3.reason, 'candidate_not_found', 'correct reason');

  // No open election
  var r4 = ZoneStewards.castElectionVote(state, 'voter3', 'wilds', 'alice', 70);
  assert(!r4.success, 'vote with no election fails');
  assertEqual(r4.reason, 'no_open_election', 'correct reason');

  // Invalid zone
  var r5 = ZoneStewards.castElectionVote(state, 'voter4', 'nowhere', 'alice', 80);
  assert(!r5.success, 'vote in invalid zone fails');
  assertEqual(r5.reason, 'invalid_zone', 'correct reason for invalid zone');

  // Vote after window closes
  var state2 = freshState();
  var WINDOW = ZoneStewards.ELECTION_WINDOW;
  ZoneStewards.nominateSelf(state2, 'alice', 'commons', 0);
  var r6 = ZoneStewards.castElectionVote(state2, 'voter1', 'commons', 'alice', WINDOW + 1);
  assert(!r6.success, 'vote after window expires fails');
  assertEqual(r6.reason, 'election_closed', 'correct reason');
});

// ============================================================================
// SUITE 7: closeElection
// ============================================================================

suite('closeElection', function() {
  // Normal election with votes
  var state = freshState();
  ZoneStewards.nominateSelf(state, 'alice', 'nexus', 0);
  ZoneStewards.nominateSelf(state, 'bob', 'nexus', 5);
  ZoneStewards.castElectionVote(state, 'v1', 'nexus', 'alice', 10);
  ZoneStewards.castElectionVote(state, 'v2', 'nexus', 'alice', 20);
  ZoneStewards.castElectionVote(state, 'v3', 'nexus', 'bob', 30);
  var r1 = ZoneStewards.closeElection(state, 'nexus', 100);
  assert(r1.success, 'closeElection succeeds');
  assertEqual(r1.winner, 'alice', 'alice wins with more votes');
  assertEqual(r1.voteCount, 2, 'alice got 2 votes');

  // Steward is installed
  var steward = ZoneStewards.getSteward(state, 'nexus');
  assertNotNull(steward, 'steward installed after election');
  assertEqual(steward.playerId, 'alice', 'correct steward installed');

  // Election is now closed
  assert(!ZoneStewards.isElectionOpen(state, 'nexus'), 'election no longer open after close');

  // Election logged
  var history = ZoneStewards.getElectionHistory(state, 'nexus');
  assertEqual(history.length, 1, 'one history entry');
  assertEqual(history[0].winner, 'alice', 'history records winner');

  // Close non-existent election
  var r2 = ZoneStewards.closeElection(state, 'wilds', 100);
  assert(!r2.success, 'closing non-existent election fails');
  assertEqual(r2.reason, 'no_open_election', 'correct reason');

  // Close invalid zone
  var r3 = ZoneStewards.closeElection(state, 'nowhere', 100);
  assert(!r3.success, 'closing invalid zone fails');
  assertEqual(r3.reason, 'invalid_zone', 'correct reason');

  // Election with no votes — should still succeed (no winner if no candidates)
  var state2 = freshState();
  ZoneStewards.nominateSelf(state2, 'alice', 'studio', 0);
  var r4 = ZoneStewards.closeElection(state2, 'studio', 10);
  assert(r4.success, 'election with 0 votes closes successfully');
  assertEqual(r4.winner, 'alice', 'sole candidate wins with 0 votes');

  // Tie broken by alphabetical order
  var state3 = freshState();
  ZoneStewards.nominateSelf(state3, 'zara', 'arena', 0);
  ZoneStewards.nominateSelf(state3, 'adam', 'arena', 1);
  ZoneStewards.castElectionVote(state3, 'v1', 'arena', 'zara', 5);
  ZoneStewards.castElectionVote(state3, 'v2', 'arena', 'adam', 6);
  var r5 = ZoneStewards.closeElection(state3, 'arena', 20);
  assert(r5.success, 'tie election closes');
  assertEqual(r5.winner, 'adam', 'alphabetically first wins tie');

  // Double close fails
  var r6 = ZoneStewards.closeElection(state, 'nexus', 200);
  assert(!r6.success, 'second close of same election fails');
});

// ============================================================================
// SUITE 8: getSteward / getAllStewards
// ============================================================================

suite('getSteward and getAllStewards', function() {
  var state = freshState();

  // No steward yet
  var s1 = ZoneStewards.getSteward(state, 'nexus');
  assertNull(s1, 'no steward before election');

  // Elect in nexus
  electSteward(state, 'nexus', 'alice', 0);
  var s2 = ZoneStewards.getSteward(state, 'nexus');
  assertNotNull(s2, 'steward exists after election');
  assertEqual(s2.playerId, 'alice', 'correct steward player');
  assertEqual(s2.zone, 'nexus', 'steward has correct zone');
  assertNotNull(s2.electedTick, 'steward has electedTick');
  assertNotNull(s2.termEndTick, 'steward has termEndTick');
  assertEqual(s2.proposalCount, 0, 'proposalCount starts at 0');
  assertEqual(s2.approvals, 0, 'approvals starts at 0');
  assertEqual(s2.rejections, 0, 'rejections starts at 0');
  assertEqual(s2.disputesResolved, 0, 'disputesResolved starts at 0');

  // Still null for other zones
  assertNull(ZoneStewards.getSteward(state, 'gardens'), 'gardens has no steward');
  assertNull(ZoneStewards.getSteward(state, 'arena'), 'arena has no steward');

  // getAllStewards returns map
  var all = ZoneStewards.getAllStewards(state);
  assert(typeof all === 'object', 'getAllStewards returns object');
  assertEqual(Object.keys(all).length, 8, 'getAllStewards has 8 keys');
  assertEqual(all.nexus.playerId, 'alice', 'nexus steward in map');
  assertNull(all.gardens, 'gardens is null in map');
  assertNull(all.arena, 'arena is null in map');

  // Elect in a second zone
  electSteward(state, 'gardens', 'bob', 100);
  var all2 = ZoneStewards.getAllStewards(state);
  assertEqual(all2.gardens.playerId, 'bob', 'gardens steward added');
  assertEqual(all2.nexus.playerId, 'alice', 'nexus steward unchanged');
});

// ============================================================================
// SUITE 9: isElectionOpen
// ============================================================================

suite('isElectionOpen', function() {
  var state = freshState();
  assert(!ZoneStewards.isElectionOpen(state, 'nexus'), 'no election open initially');
  ZoneStewards.nominateSelf(state, 'alice', 'nexus', 0);
  assert(ZoneStewards.isElectionOpen(state, 'nexus'), 'election open after nomination');
  ZoneStewards.closeElection(state, 'nexus', 10);
  assert(!ZoneStewards.isElectionOpen(state, 'nexus'), 'election closed after closeElection');

  // Never opened for other zones
  assert(!ZoneStewards.isElectionOpen(state, 'wilds'), 'wilds never opened');
  assert(!ZoneStewards.isElectionOpen(state, 'gardens'), 'gardens never opened');
});

// ============================================================================
// SUITE 10: getTermRemaining
// ============================================================================

suite('getTermRemaining', function() {
  var TERM = ZoneStewards.TERM_LENGTH;
  var state = freshState();

  // No steward
  assertEqual(ZoneStewards.getTermRemaining(state, 'nexus', 0), 0, 'no steward = 0 remaining');

  // Elect at tick 100
  electSteward(state, 'nexus', 'alice', 100);
  var rem1 = ZoneStewards.getTermRemaining(state, 'nexus', 101);
  assertGreater(rem1, 0, 'term remaining > 0 after election');
  assert(rem1 <= TERM, 'term remaining <= TERM_LENGTH');

  // Exactly at election tick
  var rem2 = ZoneStewards.getTermRemaining(state, 'nexus', 101);
  assertGreater(rem2, 0, 'positive remaining at start of term');

  // After term end — should be 0
  var steward = ZoneStewards.getSteward(state, 'nexus');
  var termEnd = steward.termEndTick;
  var rem3 = ZoneStewards.getTermRemaining(state, 'nexus', termEnd + 100);
  assertEqual(rem3, 0, 'no remaining after term ends');

  // Exactly at term end
  var rem4 = ZoneStewards.getTermRemaining(state, 'nexus', termEnd);
  assertEqual(rem4, 0, 'no remaining at exact term end');
});

// ============================================================================
// SUITE 11: expireTerms
// ============================================================================

suite('expireTerms', function() {
  var TERM = ZoneStewards.TERM_LENGTH;
  var state = freshState();

  // Elect stewards in two zones at different ticks
  electSteward(state, 'nexus', 'alice', 0);
  electSteward(state, 'gardens', 'bob', 1000);

  // expire at tick where nexus term ends but gardens still active
  var nexusSteward = ZoneStewards.getSteward(state, 'nexus');
  var result = ZoneStewards.expireTerms(state, nexusSteward.termEndTick);
  assertArray(result.expired, 'expired is array');
  assert(result.expired.indexOf('nexus') !== -1, 'nexus expired');
  assert(result.expired.indexOf('gardens') === -1, 'gardens not expired yet');
  assertNull(ZoneStewards.getSteward(state, 'nexus'), 'nexus steward removed');
  assertNotNull(ZoneStewards.getSteward(state, 'gardens'), 'gardens steward still there');

  // expire everything
  var gardensSteward = ZoneStewards.getSteward(state, 'gardens');
  var result2 = ZoneStewards.expireTerms(state, gardensSteward.termEndTick);
  assert(result2.expired.indexOf('gardens') !== -1, 'gardens expired');
  assertNull(ZoneStewards.getSteward(state, 'gardens'), 'gardens steward removed');

  // No stewards to expire
  var result3 = ZoneStewards.expireTerms(state, 99999);
  assertEqual(result3.expired.length, 0, 'no expired when no stewards');
});

// ============================================================================
// SUITE 12: createProposal
// ============================================================================

suite('createProposal', function() {
  var state = freshState();
  electSteward(state, 'nexus', 'alice', 0);
  var steward = ZoneStewards.getSteward(state, 'nexus');

  // Valid proposal
  var r1 = ZoneStewards.createProposal(state, 'alice', 'nexus', 'zone_event', { name: 'Night Market' }, 50);
  assert(r1.success, 'steward can create proposal');
  assertNotNull(r1.proposal, 'proposal object returned');
  assertEqual(r1.proposal.stewardId, 'alice', 'proposal has stewardId');
  assertEqual(r1.proposal.zone, 'nexus', 'proposal has zone');
  assertEqual(r1.proposal.type, 'zone_event', 'proposal has type');
  assertEqual(r1.proposal.status, 'open', 'proposal starts open');
  assertEqual(r1.proposal.yesCount, 0, 'yesCount starts at 0');
  assertEqual(r1.proposal.noCount, 0, 'noCount starts at 0');
  assertEqual(r1.proposal.createdTick, 50, 'proposal has createdTick');

  // Proposal increments steward count
  var s = ZoneStewards.getSteward(state, 'nexus');
  assertEqual(s.proposalCount, 1, 'proposalCount incremented');

  // Non-steward cannot create proposal
  var r2 = ZoneStewards.createProposal(state, 'bob', 'nexus', 'festival', {}, 60);
  assert(!r2.success, 'non-steward cannot create proposal');
  assertEqual(r2.reason, 'not_steward', 'correct reason');

  // Invalid zone
  var r3 = ZoneStewards.createProposal(state, 'alice', 'nowhere', 'festival', {}, 70);
  assert(!r3.success, 'invalid zone fails');
  assertEqual(r3.reason, 'invalid_zone', 'correct reason');

  // Invalid proposal type
  var r4 = ZoneStewards.createProposal(state, 'alice', 'nexus', 'magic_spell', {}, 80);
  assert(!r4.success, 'invalid proposal type fails');
  assertEqual(r4.reason, 'invalid_type', 'correct reason');

  // No steward in zone
  var r5 = ZoneStewards.createProposal(state, 'alice', 'gardens', 'festival', {}, 90);
  assert(!r5.success, 'cannot create proposal in zone with no steward');
  assertEqual(r5.reason, 'not_steward', 'correct reason');

  // All 6 proposal types work
  var PTYPES = ['zone_event', 'anchor_approval', 'rule_change', 'resource_allocation', 'festival', 'maintenance'];
  for (var i = 0; i < PTYPES.length; i++) {
    var r = ZoneStewards.createProposal(state, 'alice', 'nexus', PTYPES[i], {}, 100 + i);
    assert(r.success, PTYPES[i] + ' proposal type is valid');
  }

  // Expired term
  var state2 = freshState();
  electSteward(state2, 'arena', 'carol', 0);
  var arena = ZoneStewards.getSteward(state2, 'arena');
  var r6 = ZoneStewards.createProposal(state2, 'carol', 'arena', 'maintenance', {}, arena.termEndTick + 1);
  assert(!r6.success, 'cannot create proposal after term expires');
  assertEqual(r6.reason, 'term_expired', 'correct reason');
});

// ============================================================================
// SUITE 13: voteOnProposal
// ============================================================================

suite('voteOnProposal', function() {
  var state = freshState();
  electSteward(state, 'nexus', 'alice', 0);
  var pr = ZoneStewards.createProposal(state, 'alice', 'nexus', 'festival', {}, 10);
  var propId = pr.proposal.id;

  // Valid yes vote
  var r1 = ZoneStewards.voteOnProposal(state, 'voter1', propId, 'yes', 20);
  assert(r1.success, 'yes vote succeeds');

  // Valid no vote
  var r2 = ZoneStewards.voteOnProposal(state, 'voter2', propId, 'no', 25);
  assert(r2.success, 'no vote succeeds');

  // Double vote
  var r3 = ZoneStewards.voteOnProposal(state, 'voter1', propId, 'yes', 30);
  assert(!r3.success, 'double vote fails');
  assertEqual(r3.reason, 'already_voted', 'correct reason');

  // Invalid vote value
  var r4 = ZoneStewards.voteOnProposal(state, 'voter3', propId, 'maybe', 35);
  assert(!r4.success, 'invalid vote value fails');
  assertEqual(r4.reason, 'invalid_vote', 'correct reason');

  // Non-existent proposal
  var r5 = ZoneStewards.voteOnProposal(state, 'voter4', 'bad_id', 'yes', 40);
  assert(!r5.success, 'vote on non-existent proposal fails');
  assertEqual(r5.reason, 'proposal_not_found', 'correct reason');

  // Check vote counts
  var proposals = ZoneStewards.getProposals(state, 'nexus', 'open');
  assertEqual(proposals[0].yesCount, 1, 'yesCount is 1');
  assertEqual(proposals[0].noCount, 1, 'noCount is 1');

  // Vote on closed proposal
  ZoneStewards.closeProposal(state, propId, 50);
  var r6 = ZoneStewards.voteOnProposal(state, 'voter5', propId, 'yes', 55);
  assert(!r6.success, 'vote on closed proposal fails');
  assertEqual(r6.reason, 'proposal_not_open', 'correct reason');
});

// ============================================================================
// SUITE 14: closeProposal
// ============================================================================

suite('closeProposal', function() {
  // Proposal that passes (3+ yes, more yes than no)
  var state = freshState();
  electSteward(state, 'nexus', 'alice', 0);
  var pr1 = ZoneStewards.createProposal(state, 'alice', 'nexus', 'zone_event', {}, 10);
  var id1 = pr1.proposal.id;
  ZoneStewards.voteOnProposal(state, 'v1', id1, 'yes', 20);
  ZoneStewards.voteOnProposal(state, 'v2', id1, 'yes', 21);
  ZoneStewards.voteOnProposal(state, 'v3', id1, 'yes', 22);
  var r1 = ZoneStewards.closeProposal(state, id1, 30);
  assert(r1.success, 'close succeeds');
  assert(r1.passed, 'proposal passed with 3 yes votes');
  assertEqual(r1.votes.yes, 3, 'yes count correct');
  assertEqual(r1.votes.no, 0, 'no count correct');

  // Steward approvals incremented
  var s = ZoneStewards.getSteward(state, 'nexus');
  assertEqual(s.approvals, 1, 'steward approvals incremented');
  assertEqual(s.rejections, 0, 'steward rejections unchanged');

  // Proposal that fails (not enough yes)
  var pr2 = ZoneStewards.createProposal(state, 'alice', 'nexus', 'maintenance', {}, 40);
  var id2 = pr2.proposal.id;
  ZoneStewards.voteOnProposal(state, 'v1', id2, 'yes', 50);
  ZoneStewards.voteOnProposal(state, 'v2', id2, 'no', 51);
  ZoneStewards.voteOnProposal(state, 'v3', id2, 'no', 52);
  var r2 = ZoneStewards.closeProposal(state, id2, 60);
  assert(r2.success, 'close succeeds');
  assert(!r2.passed, 'proposal fails with more no than yes');
  assertEqual(s.rejections, 1, 'steward rejections incremented');

  // Proposal fails — too few votes (below quorum)
  var pr3 = ZoneStewards.createProposal(state, 'alice', 'nexus', 'festival', {}, 70);
  var id3 = pr3.proposal.id;
  ZoneStewards.voteOnProposal(state, 'v1', id3, 'yes', 80);
  ZoneStewards.voteOnProposal(state, 'v2', id3, 'yes', 81);
  var r3 = ZoneStewards.closeProposal(state, id3, 90);
  assert(r3.success, 'close succeeds');
  assert(!r3.passed, 'proposal fails with only 2 yes votes (below quorum 3)');

  // Close non-existent
  var r4 = ZoneStewards.closeProposal(state, 'bad_id', 100);
  assert(!r4.success, 'close non-existent fails');
  assertEqual(r4.reason, 'proposal_not_found', 'correct reason');

  // Double close
  var r5 = ZoneStewards.closeProposal(state, id1, 110);
  assert(!r5.success, 'double close fails');
  assertEqual(r5.reason, 'proposal_not_open', 'correct reason');

  // Exactly quorum (3 yes) passes
  var state2 = freshState();
  electSteward(state2, 'wilds', 'bob', 0);
  var pr4 = ZoneStewards.createProposal(state2, 'bob', 'wilds', 'rule_change', {}, 5);
  var id4 = pr4.proposal.id;
  ZoneStewards.voteOnProposal(state2, 'x1', id4, 'yes', 10);
  ZoneStewards.voteOnProposal(state2, 'x2', id4, 'yes', 11);
  ZoneStewards.voteOnProposal(state2, 'x3', id4, 'yes', 12);
  var r6 = ZoneStewards.closeProposal(state2, id4, 20);
  assert(r6.passed, 'exactly 3 yes votes passes');
});

// ============================================================================
// SUITE 15: getProposals
// ============================================================================

suite('getProposals', function() {
  var state = freshState();
  electSteward(state, 'nexus', 'alice', 0);
  electSteward(state, 'gardens', 'bob', 5);

  // Create proposals in different zones
  var p1 = ZoneStewards.createProposal(state, 'alice', 'nexus', 'zone_event', {}, 10).proposal;
  var p2 = ZoneStewards.createProposal(state, 'alice', 'nexus', 'festival', {}, 20).proposal;
  var p3 = ZoneStewards.createProposal(state, 'bob', 'gardens', 'maintenance', {}, 30).proposal;

  // Get all for nexus
  var nexusAll = ZoneStewards.getProposals(state, 'nexus');
  assertEqual(nexusAll.length, 2, 'nexus has 2 proposals');

  // Get all for gardens
  var gardensAll = ZoneStewards.getProposals(state, 'gardens');
  assertEqual(gardensAll.length, 1, 'gardens has 1 proposal');

  // Get by status (open)
  var nexusOpen = ZoneStewards.getProposals(state, 'nexus', 'open');
  assertEqual(nexusOpen.length, 2, 'nexus has 2 open proposals');

  // Close one and filter
  ZoneStewards.voteOnProposal(state, 'v1', p1.id, 'yes', 50);
  ZoneStewards.voteOnProposal(state, 'v2', p1.id, 'yes', 51);
  ZoneStewards.voteOnProposal(state, 'v3', p1.id, 'yes', 52);
  ZoneStewards.closeProposal(state, p1.id, 60);

  var nexusOpen2 = ZoneStewards.getProposals(state, 'nexus', 'open');
  assertEqual(nexusOpen2.length, 1, 'nexus has 1 open proposal after close');

  var nexusPassed = ZoneStewards.getProposals(state, 'nexus', 'passed');
  assertEqual(nexusPassed.length, 1, 'nexus has 1 passed proposal');

  // No proposals in arena
  var arenaAll = ZoneStewards.getProposals(state, 'arena');
  assertEqual(arenaAll.length, 0, 'arena has 0 proposals');
});

// ============================================================================
// SUITE 16: fileDispute
// ============================================================================

suite('fileDispute', function() {
  var state = freshState();

  // Valid dispute
  var r1 = ZoneStewards.fileDispute(state, 'alice', 'bob', 'nexus', 'Bob griefed my build', 100);
  assert(r1.success, 'valid dispute succeeds');
  assertNotNull(r1.dispute, 'dispute object returned');
  assertEqual(r1.dispute.reporterId, 'alice', 'dispute has reporterId');
  assertEqual(r1.dispute.targetId, 'bob', 'dispute has targetId');
  assertEqual(r1.dispute.zone, 'nexus', 'dispute has zone');
  assertEqual(r1.dispute.status, 'open', 'dispute starts open');
  assertEqual(r1.dispute.filedTick, 100, 'dispute has filedTick');
  assertNull(r1.dispute.resolution, 'resolution starts null');
  assertNull(r1.dispute.resolvedBy, 'resolvedBy starts null');

  // Dispute against self
  var r2 = ZoneStewards.fileDispute(state, 'alice', 'alice', 'nexus', 'Self dispute', 110);
  assert(!r2.success, 'cannot dispute self');
  assertEqual(r2.reason, 'cannot_dispute_self', 'correct reason');

  // Invalid zone
  var r3 = ZoneStewards.fileDispute(state, 'alice', 'bob', 'nowhere', 'Bad zone', 120);
  assert(!r3.success, 'invalid zone fails');
  assertEqual(r3.reason, 'invalid_zone', 'correct reason');

  // Missing description
  var r4 = ZoneStewards.fileDispute(state, 'alice', 'bob', 'nexus', '', 130);
  assert(!r4.success, 'empty description fails');
  assertEqual(r4.reason, 'missing_description', 'correct reason');

  // Whitespace-only description
  var r5 = ZoneStewards.fileDispute(state, 'alice', 'bob', 'nexus', '   ', 140);
  assert(!r5.success, 'whitespace description fails');

  // Missing playerId
  var r6 = ZoneStewards.fileDispute(state, '', 'bob', 'nexus', 'desc', 150);
  assert(!r6.success, 'missing reporterId fails');

  var r7 = ZoneStewards.fileDispute(state, 'alice', '', 'nexus', 'desc', 160);
  assert(!r7.success, 'missing targetId fails');

  // Multiple disputes accumulate
  ZoneStewards.fileDispute(state, 'carol', 'dave', 'gardens', 'Dispute 2', 170);
  assertEqual(state.disputes.length, 2, '2 disputes total (valid ones only)');
});

// ============================================================================
// SUITE 17: resolveDispute
// ============================================================================

suite('resolveDispute', function() {
  var state = freshState();
  electSteward(state, 'nexus', 'alice', 0);

  var dr = ZoneStewards.fileDispute(state, 'bob', 'carol', 'nexus', 'Carol took my fish', 50);
  var dispId = dr.dispute.id;

  // Non-steward cannot resolve
  var r1 = ZoneStewards.resolveDispute(state, dispId, 'bob', 'Warning issued', 60);
  assert(!r1.success, 'non-steward cannot resolve');
  assertEqual(r1.reason, 'not_steward', 'correct reason');

  // Valid resolution by steward
  var r2 = ZoneStewards.resolveDispute(state, dispId, 'alice', 'Both warned. No further action.', 70);
  assert(r2.success, 'steward can resolve dispute');
  var d = state.disputes[0];
  assertEqual(d.status, 'resolved', 'dispute is resolved');
  assertEqual(d.resolution, 'Both warned. No further action.', 'resolution recorded');
  assertEqual(d.resolvedBy, 'alice', 'resolvedBy set');
  assertEqual(d.resolvedTick, 70, 'resolvedTick set');

  // Steward disputesResolved incremented
  var s = ZoneStewards.getSteward(state, 'nexus');
  assertEqual(s.disputesResolved, 1, 'disputesResolved incremented');

  // Cannot resolve again
  var r3 = ZoneStewards.resolveDispute(state, dispId, 'alice', 'Different resolution', 80);
  assert(!r3.success, 'cannot resolve already resolved dispute');
  assertEqual(r3.reason, 'dispute_not_open', 'correct reason');

  // Non-existent dispute
  var r4 = ZoneStewards.resolveDispute(state, 'bad_id', 'alice', 'resolution', 90);
  assert(!r4.success, 'non-existent dispute fails');
  assertEqual(r4.reason, 'dispute_not_found', 'correct reason');

  // Missing resolution text
  var dr2 = ZoneStewards.fileDispute(state, 'dave', 'eve', 'nexus', 'desc', 100);
  var r5 = ZoneStewards.resolveDispute(state, dr2.dispute.id, 'alice', '', 110);
  assert(!r5.success, 'empty resolution text fails');
  assertEqual(r5.reason, 'missing_resolution', 'correct reason');

  // Steward can only resolve disputes in their zone
  var state2 = freshState();
  electSteward(state2, 'nexus', 'alice', 0);
  electSteward(state2, 'gardens', 'bob', 5);
  var dr3 = ZoneStewards.fileDispute(state2, 'x', 'y', 'gardens', 'desc', 10);
  var r6 = ZoneStewards.resolveDispute(state2, dr3.dispute.id, 'alice', 'resolution', 20);
  assert(!r6.success, 'nexus steward cannot resolve gardens dispute');
  var r7 = ZoneStewards.resolveDispute(state2, dr3.dispute.id, 'bob', 'resolution', 20);
  assert(r7.success, 'gardens steward can resolve gardens dispute');
});

// ============================================================================
// SUITE 18: getDisputes
// ============================================================================

suite('getDisputes', function() {
  var state = freshState();
  electSteward(state, 'nexus', 'alice', 0);
  electSteward(state, 'arena', 'bob', 5);

  ZoneStewards.fileDispute(state, 'p1', 'p2', 'nexus', 'desc1', 10);
  var dr2 = ZoneStewards.fileDispute(state, 'p3', 'p4', 'nexus', 'desc2', 20);
  ZoneStewards.fileDispute(state, 'p5', 'p6', 'arena', 'desc3', 30);

  // All in nexus
  var nexusAll = ZoneStewards.getDisputes(state, 'nexus');
  assertEqual(nexusAll.length, 2, 'nexus has 2 disputes');

  // All in arena
  var arenaAll = ZoneStewards.getDisputes(state, 'arena');
  assertEqual(arenaAll.length, 1, 'arena has 1 dispute');

  // Open disputes
  var nexusOpen = ZoneStewards.getDisputes(state, 'nexus', 'open');
  assertEqual(nexusOpen.length, 2, '2 open disputes in nexus');

  // Resolve one
  ZoneStewards.resolveDispute(state, dr2.dispute.id, 'alice', 'Resolved', 50);
  var nexusOpen2 = ZoneStewards.getDisputes(state, 'nexus', 'open');
  assertEqual(nexusOpen2.length, 1, '1 open dispute after resolving one');

  var nexusResolved = ZoneStewards.getDisputes(state, 'nexus', 'resolved');
  assertEqual(nexusResolved.length, 1, '1 resolved dispute');

  // Zone with no disputes
  var gardensAll = ZoneStewards.getDisputes(state, 'gardens');
  assertEqual(gardensAll.length, 0, 'gardens has 0 disputes');
});

// ============================================================================
// SUITE 19: getStewardStats
// ============================================================================

suite('getStewardStats', function() {
  var state = freshState();

  // No steward
  var s1 = ZoneStewards.getStewardStats(state, 'nexus');
  assertNull(s1, 'null stats when no steward');

  electSteward(state, 'nexus', 'alice', 100);

  var s2 = ZoneStewards.getStewardStats(state, 'nexus');
  assertNotNull(s2, 'stats returned for zone with steward');
  assertEqual(s2.playerId, 'alice', 'stats has playerId');
  assertEqual(s2.zone, 'nexus', 'stats has zone');
  assertEqual(s2.proposalCount, 0, 'proposalCount starts at 0');
  assertEqual(s2.approvals, 0, 'approvals starts at 0');
  assertEqual(s2.rejections, 0, 'rejections starts at 0');
  assertEqual(s2.approvalRate, 0, 'approvalRate starts at 0');
  assertEqual(s2.disputesResolved, 0, 'disputesResolved starts at 0');

  // Create and pass a proposal
  var pr = ZoneStewards.createProposal(state, 'alice', 'nexus', 'festival', {}, 110);
  ZoneStewards.voteOnProposal(state, 'v1', pr.proposal.id, 'yes', 120);
  ZoneStewards.voteOnProposal(state, 'v2', pr.proposal.id, 'yes', 121);
  ZoneStewards.voteOnProposal(state, 'v3', pr.proposal.id, 'yes', 122);
  ZoneStewards.closeProposal(state, pr.proposal.id, 130);

  var s3 = ZoneStewards.getStewardStats(state, 'nexus');
  assertEqual(s3.proposalCount, 1, 'proposalCount incremented');
  assertEqual(s3.approvals, 1, 'approvals incremented');
  assertEqual(s3.approvalRate, 1, 'approvalRate is 1.0 after 1/1 approval');

  // Create and fail a proposal
  var pr2 = ZoneStewards.createProposal(state, 'alice', 'nexus', 'rule_change', {}, 140);
  ZoneStewards.closeProposal(state, pr2.proposal.id, 150); // 0 votes, fails
  var s4 = ZoneStewards.getStewardStats(state, 'nexus');
  assertEqual(s4.rejections, 1, 'rejections incremented');
  assert(s4.approvalRate > 0 && s4.approvalRate < 1, 'approvalRate between 0 and 1');

  // Resolve a dispute
  ZoneStewards.fileDispute(state, 'x', 'y', 'nexus', 'desc', 160);
  ZoneStewards.resolveDispute(state, state.disputes[0].id, 'alice', 'Settled', 170);
  var s5 = ZoneStewards.getStewardStats(state, 'nexus');
  assertEqual(s5.disputesResolved, 1, 'disputesResolved incremented');
});

// ============================================================================
// SUITE 20: getElectionHistory
// ============================================================================

suite('getElectionHistory', function() {
  var state = freshState();

  // No history
  var h1 = ZoneStewards.getElectionHistory(state, 'nexus');
  assertArray(h1, 'history is array');
  assertEqual(h1.length, 0, 'empty history initially');

  // First election
  ZoneStewards.nominateSelf(state, 'alice', 'nexus', 0);
  ZoneStewards.castElectionVote(state, 'v1', 'nexus', 'alice', 10);
  ZoneStewards.castElectionVote(state, 'v2', 'nexus', 'alice', 20);
  ZoneStewards.closeElection(state, 'nexus', 30);

  var h2 = ZoneStewards.getElectionHistory(state, 'nexus');
  assertEqual(h2.length, 1, '1 history entry after first election');
  assertEqual(h2[0].zone, 'nexus', 'history zone correct');
  assertEqual(h2[0].winner, 'alice', 'history winner correct');
  assertEqual(h2[0].voteCount, 2, 'history voteCount correct');
  assertArray(h2[0].candidates, 'history has candidates array');

  // Second election
  ZoneStewards.nominateSelf(state, 'bob', 'nexus', 5000);
  ZoneStewards.castElectionVote(state, 'v1', 'nexus', 'bob', 5010);
  ZoneStewards.castElectionVote(state, 'v2', 'nexus', 'bob', 5020);
  ZoneStewards.castElectionVote(state, 'v3', 'nexus', 'bob', 5030);
  ZoneStewards.closeElection(state, 'nexus', 5040);

  var h3 = ZoneStewards.getElectionHistory(state, 'nexus');
  assertEqual(h3.length, 2, '2 history entries after second election');

  // History for another zone is separate
  var h4 = ZoneStewards.getElectionHistory(state, 'gardens');
  assertEqual(h4.length, 0, 'gardens has empty history');

  // After an election in gardens it shows up there
  ZoneStewards.nominateSelf(state, 'carol', 'gardens', 0);
  ZoneStewards.closeElection(state, 'gardens', 10);
  var h5 = ZoneStewards.getElectionHistory(state, 'gardens');
  assertEqual(h5.length, 1, 'gardens has 1 history entry');
  assertEqual(h3.length, 2, 'nexus history unchanged');
});

// ============================================================================
// SUITE 21: End-to-End Governance Flow
// ============================================================================

suite('End-to-End Governance Flow', function() {
  var state = freshState();
  var TERM = ZoneStewards.TERM_LENGTH;

  // 1. Nomination phase
  var n1 = ZoneStewards.nominateSelf(state, 'alice', 'agora', 0);
  assert(n1.success, 'alice nominates');
  var n2 = ZoneStewards.nominateSelf(state, 'bob', 'agora', 10);
  assert(n2.success, 'bob nominates');
  assert(ZoneStewards.isElectionOpen(state, 'agora'), 'agora election open');

  // 2. Voting phase
  ZoneStewards.castElectionVote(state, 'citizen1', 'agora', 'alice', 50);
  ZoneStewards.castElectionVote(state, 'citizen2', 'agora', 'alice', 60);
  ZoneStewards.castElectionVote(state, 'citizen3', 'agora', 'bob', 70);
  ZoneStewards.castElectionVote(state, 'citizen4', 'agora', 'alice', 80);

  // 3. Close election
  var elec = ZoneStewards.closeElection(state, 'agora', 100);
  assert(elec.success, 'election closes');
  assertEqual(elec.winner, 'alice', 'alice wins 3-1');
  assertEqual(elec.voteCount, 3, 'alice got 3 votes');

  // 4. Check steward installed
  var steward = ZoneStewards.getSteward(state, 'agora');
  assertNotNull(steward, 'steward installed');
  assertEqual(steward.playerId, 'alice', 'alice is steward');
  assertGreater(steward.termEndTick, 100, 'term ends in future');

  // 5. Steward creates proposals
  var p1 = ZoneStewards.createProposal(state, 'alice', 'agora', 'festival', { name: 'Agora Gala' }, 150);
  assert(p1.success, 'steward creates festival proposal');
  var p2 = ZoneStewards.createProposal(state, 'alice', 'agora', 'rule_change', { rule: 'No PvP zone' }, 160);
  assert(p2.success, 'steward creates rule_change proposal');

  // 6. Citizens vote on proposal
  ZoneStewards.voteOnProposal(state, 'citizen1', p1.proposal.id, 'yes', 200);
  ZoneStewards.voteOnProposal(state, 'citizen2', p1.proposal.id, 'yes', 201);
  ZoneStewards.voteOnProposal(state, 'citizen3', p1.proposal.id, 'yes', 202);
  ZoneStewards.voteOnProposal(state, 'citizen4', p1.proposal.id, 'no', 203);
  var close1 = ZoneStewards.closeProposal(state, p1.proposal.id, 300);
  assert(close1.passed, 'festival proposal passes 3-1');

  // 7. File and resolve a dispute
  var dr = ZoneStewards.fileDispute(state, 'citizen3', 'citizen4', 'agora', 'Harassment at the market', 400);
  assert(dr.success, 'dispute filed');
  var res = ZoneStewards.resolveDispute(state, dr.dispute.id, 'alice', 'Warning to citizen4. No further incidents.', 450);
  assert(res.success, 'dispute resolved by steward');

  // 8. Stats reflect all activity
  var stats = ZoneStewards.getStewardStats(state, 'agora');
  assertEqual(stats.proposalCount, 2, 'proposalCount is 2');
  assertEqual(stats.approvals, 1, '1 approval');
  assertEqual(stats.disputesResolved, 1, '1 dispute resolved');

  // 9. Term expires
  var termEnd = steward.termEndTick;
  var expResult = ZoneStewards.expireTerms(state, termEnd);
  assert(expResult.expired.indexOf('agora') !== -1, 'agora expired');
  assertNull(ZoneStewards.getSteward(state, 'agora'), 'steward removed');

  // 10. New election cycle
  var n3 = ZoneStewards.nominateSelf(state, 'bob', 'agora', termEnd + 100);
  assert(n3.success, 'new election opens after term');
  var history = ZoneStewards.getElectionHistory(state, 'agora');
  assertEqual(history.length, 1, 'election history preserved');
});

// ============================================================================
// SUITE 22: Edge Cases & Robustness
// ============================================================================

suite('Edge Cases', function() {
  // All 8 zones can have simultaneous elections
  var state = freshState();
  var ZONES = ZoneStewards.ZONES;
  for (var i = 0; i < ZONES.length; i++) {
    var r = ZoneStewards.nominateSelf(state, 'player' + i, ZONES[i], i * 10);
    assert(r.success, ZONES[i] + ' can have independent election');
  }
  for (var j = 0; j < ZONES.length; j++) {
    assert(ZoneStewards.isElectionOpen(state, ZONES[j]), ZONES[j] + ' election open');
  }

  // Close all elections and elect stewards in all 8 zones
  for (var k = 0; k < ZONES.length; k++) {
    ZoneStewards.closeElection(state, ZONES[k], k * 10 + 5);
  }
  var all = ZoneStewards.getAllStewards(state);
  var stewardCount = 0;
  for (var z = 0; z < ZONES.length; z++) {
    if (all[ZONES[z]] !== null) stewardCount++;
  }
  assertEqual(stewardCount, 8, 'all 8 zones have stewards');

  // expireTerms with no expired stewards returns empty array
  var expNone = ZoneStewards.expireTerms(state, 0);
  assertEqual(expNone.expired.length, 0, 'no expiries at tick 0');

  // Multiple disputes can be filed in same zone
  var state2 = freshState();
  electSteward(state2, 'studio', 'alice', 0);
  for (var d = 0; d < 5; d++) {
    ZoneStewards.fileDispute(state2, 'p' + d, 'q' + d, 'studio', 'Issue ' + d, d * 10);
  }
  var allDisputes = ZoneStewards.getDisputes(state2, 'studio');
  assertEqual(allDisputes.length, 5, '5 disputes can be filed');

  // Proposal id uniqueness
  var state3 = freshState();
  electSteward(state3, 'commons', 'alice', 0);
  var ids = {};
  var dupFound = false;
  for (var p = 0; p < 10; p++) {
    var pr = ZoneStewards.createProposal(state3, 'alice', 'commons', 'maintenance', {}, p * 10);
    if (ids[pr.proposal.id]) dupFound = true;
    ids[pr.proposal.id] = true;
  }
  assert(!dupFound, 'proposal IDs are unique');

  // Dispute id uniqueness
  var state4 = freshState();
  var dids = {};
  var dDupFound = false;
  for (var dd = 0; dd < 10; dd++) {
    var dr = ZoneStewards.fileDispute(state4, 'a' + dd, 'b' + dd, 'nexus', 'desc', dd);
    if (dids[dr.dispute.id]) dDupFound = true;
    dids[dr.dispute.id] = true;
  }
  assert(!dDupFound, 'dispute IDs are unique');
});

// ============================================================================
// RESULTS
// ============================================================================

console.log('\n========================================');
console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
console.log('========================================');

if (failures.length > 0) {
  console.log('\nFailures:');
  for (var fi = 0; fi < failures.length; fi++) {
    console.log('  ' + failures[fi]);
  }
}

if (failed > 0) process.exit(1);
