/**
 * tests/test_steward_election_ui.js
 * Tests for zone steward election logic in zone_stewards.js
 * Covers: createState, nominateSelf, castElectionVote, closeElection,
 *         QUORUM requirement, createProposal steward guard
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

var ZS = require('../src/js/zone_stewards');

// ---------------------------------------------------------------------------
// Helper: fresh state shortcut
// ---------------------------------------------------------------------------

function fresh() {
  return ZS.createState();
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

suite('Exports', function() {

  assert(typeof ZS.createState === 'function', 'createState is exported');
  assert(typeof ZS.nominateSelf === 'function', 'nominateSelf is exported');
  assert(typeof ZS.castElectionVote === 'function', 'castElectionVote is exported');
  assert(typeof ZS.closeElection === 'function', 'closeElection is exported');
  assert(typeof ZS.createProposal === 'function', 'createProposal is exported');
  assert(typeof ZS.getSteward === 'function', 'getSteward is exported');
  assert(Array.isArray(ZS.ZONES), 'ZONES is an exported array');
  assert(typeof ZS.QUORUM === 'number', 'QUORUM is an exported number');

});

// ---------------------------------------------------------------------------
// createState
// ---------------------------------------------------------------------------

suite('createState', function() {

  var state = fresh();

  assert(state !== null && typeof state === 'object', 'createState returns an object');
  assert(typeof state.elections === 'object', 'state.elections is an object');
  assert(typeof state.stewards === 'object', 'state.stewards is an object');
  assert(Array.isArray(state.proposals), 'state.proposals is an array');
  assert(Array.isArray(state.disputes), 'state.disputes is an array');
  assert(Array.isArray(state.electionLog), 'state.electionLog is an array');

});

// ---------------------------------------------------------------------------
// nominateSelf — opens election
// ---------------------------------------------------------------------------

suite('nominateSelf — opens election', function() {

  var state = fresh();
  var tick = 0;

  // Invalid zone
  var r0 = ZS.nominateSelf(state, 'alice', 'invalid_zone', tick);
  assert(r0.success === false, 'rejects invalid zone');
  assertEqual(r0.reason, 'invalid_zone', 'reason is invalid_zone');

  // Valid nomination
  var r1 = ZS.nominateSelf(state, 'alice', 'nexus', tick);
  assert(r1.success === true, 'nominateSelf succeeds for valid zone');
  assert(r1.nomination !== null, 'nomination object is returned');
  assertEqual(r1.nomination.playerId, 'alice', 'nomination.playerId is alice');
  assertEqual(r1.nomination.zone, 'nexus', 'nomination.zone is nexus');

  // Election should now be open
  var election = state.elections['nexus'];
  assert(election !== undefined, 'elections.nexus is initialised');
  assert(election.open === true, 'election is open after nomination');
  assert(election.candidates['alice'] !== undefined, 'alice is a candidate');

});

suite('nominateSelf — prevents duplicate nomination', function() {

  var state = fresh();
  ZS.nominateSelf(state, 'alice', 'nexus', 0);
  var r = ZS.nominateSelf(state, 'alice', 'nexus', 1);
  assert(r.success === false, 'duplicate nomination is rejected');
  assertEqual(r.reason, 'already_nominated', 'reason is already_nominated');

});

// ---------------------------------------------------------------------------
// castElectionVote
// ---------------------------------------------------------------------------

suite('castElectionVote — records vote', function() {

  var state = fresh();
  ZS.nominateSelf(state, 'alice', 'nexus', 0);

  var vr = ZS.castElectionVote(state, 'voter1', 'nexus', 'alice', 1);
  assert(vr.success === true, 'castElectionVote succeeds');
  assertEqual(state.elections['nexus'].votes['voter1'], 'alice', 'vote is recorded');

  // Cannot vote twice
  var vr2 = ZS.castElectionVote(state, 'voter1', 'nexus', 'alice', 2);
  assert(vr2.success === false, 'duplicate vote is rejected');
  assertEqual(vr2.reason, 'already_voted', 'reason is already_voted');

});

suite('castElectionVote — requires open election', function() {

  var state = fresh();
  // No election open yet
  var r = ZS.castElectionVote(state, 'voter1', 'nexus', 'alice', 0);
  assert(r.success === false, 'vote fails when no election is open');
  assertEqual(r.reason, 'no_open_election', 'reason is no_open_election');

});

suite('castElectionVote — candidate must exist', function() {

  var state = fresh();
  ZS.nominateSelf(state, 'alice', 'nexus', 0);
  var r = ZS.castElectionVote(state, 'voter1', 'nexus', 'bob', 1); // bob not nominated
  assert(r.success === false, 'vote for unknown candidate fails');
  assertEqual(r.reason, 'candidate_not_found', 'reason is candidate_not_found');

});

// ---------------------------------------------------------------------------
// closeElection — elects winner
// ---------------------------------------------------------------------------

suite('closeElection — elects candidate with most votes', function() {

  var state = fresh();
  var tick = 0;

  ZS.nominateSelf(state, 'alice', 'nexus', tick);
  ZS.nominateSelf(state, 'bob', 'nexus', tick);

  ZS.castElectionVote(state, 'voter1', 'nexus', 'alice', tick + 1);
  ZS.castElectionVote(state, 'voter2', 'nexus', 'alice', tick + 1);
  ZS.castElectionVote(state, 'voter3', 'nexus', 'bob', tick + 1);

  var result = ZS.closeElection(state, 'nexus', tick + 2);
  assert(result.success === true, 'closeElection succeeds');
  assertEqual(result.winner, 'alice', 'alice wins with most votes');
  assert(result.voteCount >= 2, 'alice has at least 2 votes');

  // Steward should be installed
  var steward = ZS.getSteward(state, 'nexus');
  assert(steward !== null, 'steward is installed after election');
  assertEqual(steward.playerId, 'alice', 'steward is alice');

  // electionLog updated
  assert(state.electionLog.length === 1, 'election log has one entry');
  assertEqual(state.electionLog[0].winner, 'alice', 'log records alice as winner');

});

suite('closeElection — no open election returns failure', function() {

  var state = fresh();
  var r = ZS.closeElection(state, 'nexus', 100);
  assert(r.success === false, 'closeElection fails when no election is open');

});

// ---------------------------------------------------------------------------
// QUORUM requirement
// ---------------------------------------------------------------------------

suite('QUORUM — constant is >= 3', function() {

  // QUORUM must be at least 3 per the specification
  assert(ZS.QUORUM >= 3, 'QUORUM is at least 3 (got ' + ZS.QUORUM + ')');

});

suite('QUORUM — election can close with fewer votes (winner still set)', function() {

  // The current closeElection implementation elects whoever has most votes
  // regardless of QUORUM; QUORUM is enforced at the proposal level.
  // This test documents that behaviour explicitly.
  var state = fresh();
  ZS.nominateSelf(state, 'alice', 'gardens', 0);
  ZS.castElectionVote(state, 'v1', 'gardens', 'alice', 1);
  // Only 1 vote — below QUORUM but closeElection still processes it
  var r = ZS.closeElection(state, 'gardens', 2);
  assert(r.success === true, 'closeElection runs even with fewer votes than QUORUM');
  assert(r.winner !== undefined, 'winner field is present');

});

// ---------------------------------------------------------------------------
// createProposal — only by steward
// ---------------------------------------------------------------------------

suite('createProposal — only steward may create', function() {

  var state = fresh();
  var tick = 0;

  // Setup: elect alice as steward
  ZS.nominateSelf(state, 'alice', 'agora', tick);
  ZS.castElectionVote(state, 'v1', 'agora', 'alice', tick + 1);
  ZS.castElectionVote(state, 'v2', 'agora', 'alice', tick + 1);
  ZS.castElectionVote(state, 'v3', 'agora', 'alice', tick + 1);
  ZS.closeElection(state, 'agora', tick + 2);

  var steward = ZS.getSteward(state, 'agora');
  assert(steward !== null, 'alice is steward');

  // Non-steward attempt
  var r1 = ZS.createProposal(state, 'bob', 'agora', 'zone_event', { event: 'festival' }, tick + 3);
  assert(r1.success === false, 'non-steward cannot create proposal');
  assertEqual(r1.reason, 'not_steward', 'reason is not_steward');

  // Steward attempt
  var r2 = ZS.createProposal(state, 'alice', 'agora', 'zone_event', { event: 'festival' }, tick + 3);
  assert(r2.success === true, 'steward can create proposal');
  assert(r2.proposal !== null, 'proposal object is returned');
  assertEqual(r2.proposal.zone, 'agora', 'proposal.zone is agora');
  assertEqual(r2.proposal.type, 'zone_event', 'proposal.type is zone_event');
  assertEqual(r2.proposal.status, 'open', 'proposal.status is open');

  assert(state.proposals.length === 1, 'proposals array has one entry');

});

suite('createProposal — invalid type rejected', function() {

  var state = fresh();
  ZS.nominateSelf(state, 'alice', 'arena', 0);
  ZS.castElectionVote(state, 'v1', 'arena', 'alice', 1);
  ZS.castElectionVote(state, 'v2', 'arena', 'alice', 1);
  ZS.castElectionVote(state, 'v3', 'arena', 'alice', 1);
  ZS.closeElection(state, 'arena', 2);

  var r = ZS.createProposal(state, 'alice', 'arena', 'invalid_type', {}, 3);
  assert(r.success === false, 'invalid proposal type is rejected');
  assertEqual(r.reason, 'invalid_type', 'reason is invalid_type');

});

// ---------------------------------------------------------------------------

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed > 0 ? 1 : 0);
