// test_elections.js — Zone Steward Election System Tests
// 70+ tests covering ELECTION_CONFIG, candidacy, voting, results, stewards, history, protocol integration
const { test, suite, report, assert } = require('./test_runner');
const Elections = require('../src/js/elections');

// ============================================================================
// HELPER: seed visits quickly
// ============================================================================
function seedVotes(zoneId, playerId, count) {
  Elections._seedVisit(zoneId, playerId, count, Date.now());
}

function makeElection(zoneId, candidates, opts) {
  opts = opts || {};
  // Seed visit counts for all candidates and for test voter
  candidates.forEach(function(pid) {
    seedVotes(zoneId, pid, 15);
  });
  return Elections.createElection(zoneId, candidates, opts);
}

// ============================================================================
suite('Elections — ELECTION_CONFIG constants', function() {

  test('ELECTION_CONFIG exists and is an object', function() {
    assert(typeof Elections.ELECTION_CONFIG === 'object', 'ELECTION_CONFIG should be an object');
    assert(Elections.ELECTION_CONFIG !== null, 'ELECTION_CONFIG should not be null');
  });

  test('termLengthMs is 7 days', function() {
    var sevenDays = 7 * 24 * 60 * 60 * 1000;
    assert.strictEqual(Elections.ELECTION_CONFIG.termLengthMs, sevenDays);
  });

  test('votingPeriodMs is 2 days', function() {
    var twoDays = 2 * 24 * 60 * 60 * 1000;
    assert.strictEqual(Elections.ELECTION_CONFIG.votingPeriodMs, twoDays);
  });

  test('minCandidates is at least 1', function() {
    assert(Elections.ELECTION_CONFIG.minCandidates >= 1, 'minCandidates should be >= 1');
  });

  test('maxStewardsPerZone exists and is positive', function() {
    assert(typeof Elections.ELECTION_CONFIG.maxStewardsPerZone === 'number', 'maxStewardsPerZone should be a number');
    assert(Elections.ELECTION_CONFIG.maxStewardsPerZone > 0, 'maxStewardsPerZone should be positive');
  });

  test('minVisitsToVote is defined and positive', function() {
    assert(typeof Elections.ELECTION_CONFIG.minVisitsToVote === 'number');
    assert(Elections.ELECTION_CONFIG.minVisitsToVote > 0);
  });

  test('minVisitsToRun >= minVisitsToVote', function() {
    assert(Elections.ELECTION_CONFIG.minVisitsToRun >= Elections.ELECTION_CONFIG.minVisitsToVote,
      'Running should require at least as many visits as voting');
  });

  test('reputationToRun is an array with valid tiers', function() {
    var tiers = Elections.ELECTION_CONFIG.reputationToRun;
    assert(Array.isArray(tiers), 'reputationToRun should be an array');
    assert(tiers.length > 0, 'should have at least one tier');
    assert(tiers.indexOf('Respected') !== -1, 'should include Respected');
  });

  test('historyLimit is a positive number', function() {
    assert(typeof Elections.ELECTION_CONFIG.historyLimit === 'number');
    assert(Elections.ELECTION_CONFIG.historyLimit > 0);
  });

});

// ============================================================================
suite('Elections — STEWARD_POWERS', function() {

  test('STEWARD_POWERS is an array', function() {
    assert(Array.isArray(Elections.STEWARD_POWERS), 'STEWARD_POWERS should be an array');
  });

  test('STEWARD_POWERS has at least 3 powers', function() {
    assert(Elections.STEWARD_POWERS.length >= 3, 'Should have at least 3 steward powers');
  });

  test('Each power has id, name, description, protocol', function() {
    Elections.STEWARD_POWERS.forEach(function(power) {
      assert(typeof power.id === 'string' && power.id.length > 0, 'power.id must be a non-empty string');
      assert(typeof power.name === 'string' && power.name.length > 0, 'power.name must be a non-empty string');
      assert(typeof power.description === 'string' && power.description.length > 0, 'power.description must be present');
      assert(typeof power.protocol === 'string' && power.protocol.length > 0, 'power.protocol must be present');
    });
  });

  test('getStewardPowers returns a copy of STEWARD_POWERS', function() {
    var powers = Elections.getStewardPowers();
    assert(Array.isArray(powers), 'getStewardPowers should return an array');
    assert.strictEqual(powers.length, Elections.STEWARD_POWERS.length);
  });

  test('getStewardPowers returns new array (not mutating original)', function() {
    var powers1 = Elections.getStewardPowers();
    var powers2 = Elections.getStewardPowers();
    powers1.push({ id: 'test', name: 'Test', description: 'Test', protocol: 'x' });
    assert.strictEqual(powers2.length, Elections.STEWARD_POWERS.length,
      'Mutating returned array should not affect STEWARD_POWERS');
  });

});

// ============================================================================
suite('Elections — Visit Tracking & Eligibility', function() {

  test('recordVisit creates a visit record', function() {
    Elections._reset();
    Elections.recordVisit('nexus', 'player1');
    var record = Elections.getVisitRecord('nexus', 'player1');
    assert.strictEqual(record.count, 1, 'Should record 1 visit');
    assert(record.lastVisit > 0, 'lastVisit should be set');
  });

  test('recordVisit increments count on repeated visits', function() {
    Elections._reset();
    Elections.recordVisit('nexus', 'player1');
    Elections.recordVisit('nexus', 'player1');
    Elections.recordVisit('nexus', 'player1');
    var record = Elections.getVisitRecord('nexus', 'player1');
    assert.strictEqual(record.count, 3);
  });

  test('getVisitRecord returns zero counts for unknown player', function() {
    Elections._reset();
    var record = Elections.getVisitRecord('nexus', 'unknown_player');
    assert.strictEqual(record.count, 0);
    assert.strictEqual(record.lastVisit, 0);
  });

  test('Visits are tracked per zone independently', function() {
    Elections._reset();
    Elections.recordVisit('nexus', 'player1');
    Elections.recordVisit('gardens', 'player1');
    Elections.recordVisit('gardens', 'player1');
    assert.strictEqual(Elections.getVisitRecord('nexus', 'player1').count, 1);
    assert.strictEqual(Elections.getVisitRecord('gardens', 'player1').count, 2);
  });

  test('isEligibleVoter returns ineligible for no visits', function() {
    Elections._reset();
    var result = Elections.isEligibleVoter('newbie', 'nexus');
    assert.strictEqual(result.eligible, false);
  });

  test('isEligibleVoter returns eligible after enough visits', function() {
    Elections._reset();
    Elections._seedVisit('nexus', 'veteran', Elections.ELECTION_CONFIG.minVisitsToVote, Date.now());
    var result = Elections.isEligibleVoter('veteran', 'nexus');
    assert.strictEqual(result.eligible, true);
  });

  test('isEligibleVoter returns ineligible for invalid playerId', function() {
    Elections._reset();
    var result = Elections.isEligibleVoter(null, 'nexus');
    assert.strictEqual(result.eligible, false);
    assert(result.reason.length > 0);
  });

  test('isEligibleVoter returns ineligible for invalid zoneId', function() {
    Elections._reset();
    Elections._seedVisit('nexus', 'player1', 10, Date.now());
    var result = Elections.isEligibleVoter('player1', null);
    assert.strictEqual(result.eligible, false);
  });

  test('isEligibleCandidate returns ineligible for insufficient visits', function() {
    Elections._reset();
    Elections._seedVisit('nexus', 'player1', Elections.ELECTION_CONFIG.minVisitsToRun - 1, Date.now());
    var result = Elections.isEligibleCandidate('player1', 'nexus');
    assert.strictEqual(result.eligible, false);
  });

  test('isEligibleCandidate returns eligible with enough visits', function() {
    Elections._reset();
    Elections._seedVisit('nexus', 'player1', Elections.ELECTION_CONFIG.minVisitsToRun, Date.now());
    var result = Elections.isEligibleCandidate('player1', 'nexus');
    assert.strictEqual(result.eligible, true);
  });

  test('isEligibleCandidate respects reputation tier', function() {
    Elections._reset();
    Elections._seedVisit('nexus', 'player1', Elections.ELECTION_CONFIG.minVisitsToRun, Date.now());
    var result = Elections.isEligibleCandidate('player1', 'nexus', { reputationTier: 'Newcomer' });
    assert.strictEqual(result.eligible, false);
    assert(result.reason.indexOf('tier') !== -1 || result.reason.indexOf('reputation') !== -1 || result.reason.indexOf('Respected') !== -1);
  });

  test('isEligibleCandidate accepts Respected tier', function() {
    Elections._reset();
    Elections._seedVisit('nexus', 'player1', Elections.ELECTION_CONFIG.minVisitsToRun, Date.now());
    var result = Elections.isEligibleCandidate('player1', 'nexus', { reputationTier: 'Respected' });
    assert.strictEqual(result.eligible, true);
  });

  test('isEligibleCandidate accepts Elder tier', function() {
    Elections._reset();
    Elections._seedVisit('nexus', 'elder1', Elections.ELECTION_CONFIG.minVisitsToRun, Date.now());
    var result = Elections.isEligibleCandidate('elder1', 'nexus', { reputationTier: 'Elder' });
    assert.strictEqual(result.eligible, true);
  });

});

// ============================================================================
suite('Elections — createElection', function() {

  test('createElection returns success with valid inputs', function() {
    Elections._reset();
    seedVotes('nexus', 'alice', 15);
    var result = Elections.createElection('nexus', ['alice']);
    assert.strictEqual(result.success, true, 'Should succeed: ' + (result.error || ''));
    assert(result.election, 'Should have election object');
  });

  test('createElection assigns correct zoneId', function() {
    Elections._reset();
    seedVotes('gardens', 'bob', 15);
    var result = Elections.createElection('gardens', ['bob']);
    assert.strictEqual(result.election.zoneId, 'gardens');
  });

  test('createElection sets status to active', function() {
    Elections._reset();
    seedVotes('nexus', 'carol', 15);
    var result = Elections.createElection('nexus', ['carol']);
    assert.strictEqual(result.election.status, 'active');
  });

  test('createElection sets endTime correctly', function() {
    Elections._reset();
    seedVotes('nexus', 'dave', 15);
    var now = Date.now();
    var result = Elections.createElection('nexus', ['dave'], { now: now });
    var expected = now + Elections.ELECTION_CONFIG.votingPeriodMs;
    assert.strictEqual(result.election.endTime, expected);
  });

  test('createElection generates unique IDs', function() {
    Elections._reset();
    seedVotes('nexus', 'alice', 15);
    seedVotes('gardens', 'bob', 15);
    var r1 = Elections.createElection('nexus', ['alice'], { now: 1000 });
    var r2 = Elections.createElection('gardens', ['bob'], { now: 2000 });
    assert(r1.election.id !== r2.election.id, 'Election IDs should be unique');
  });

  test('createElection returns error for empty zone', function() {
    Elections._reset();
    var result = Elections.createElection('', ['alice']);
    assert.strictEqual(result.success, false);
    assert(result.error.length > 0);
  });

  test('createElection returns error for null zone', function() {
    Elections._reset();
    var result = Elections.createElection(null, ['alice']);
    assert.strictEqual(result.success, false);
  });

  test('createElection returns error for empty candidates array', function() {
    Elections._reset();
    var result = Elections.createElection('nexus', []);
    assert.strictEqual(result.success, false);
    assert(result.error.length > 0);
  });

  test('createElection returns error for non-array candidates', function() {
    Elections._reset();
    var result = Elections.createElection('nexus', 'alice');
    assert.strictEqual(result.success, false);
  });

  test('createElection deduplicates candidates', function() {
    Elections._reset();
    seedVotes('nexus', 'alice', 15);
    var result = Elections.createElection('nexus', ['alice', 'alice', 'alice']);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.election.candidates.length, 1);
  });

  test('createElection initializes candidate vote counts to 0', function() {
    Elections._reset();
    seedVotes('nexus', 'alice', 15);
    seedVotes('nexus', 'bob', 15);
    var result = Elections.createElection('nexus', ['alice', 'bob']);
    result.election.candidates.forEach(function(c) {
      assert.strictEqual(c.votes, 0);
      assert(Array.isArray(c.voters));
      assert.strictEqual(c.voters.length, 0);
    });
  });

  test('createElection fails if active election already exists for zone', function() {
    Elections._reset();
    seedVotes('nexus', 'alice', 15);
    Elections.createElection('nexus', ['alice'], { now: 1000 });
    var result = Elections.createElection('nexus', ['alice'], { now: 2000 });
    assert.strictEqual(result.success, false);
    assert(result.error.indexOf('already') !== -1 || result.error.indexOf('active') !== -1);
  });

  test('createElection records startedBy if provided', function() {
    Elections._reset();
    seedVotes('nexus', 'alice', 15);
    var result = Elections.createElection('nexus', ['alice'], { startedBy: 'alice' });
    assert.strictEqual(result.election.startedBy, 'alice');
  });

  test('createElection totalVotes starts at 0', function() {
    Elections._reset();
    seedVotes('nexus', 'alice', 15);
    var result = Elections.createElection('nexus', ['alice']);
    assert.strictEqual(result.election.totalVotes, 0);
  });

});

// ============================================================================
suite('Elections — castVote', function() {

  test('castVote succeeds for eligible voter', function() {
    Elections._reset();
    seedVotes('nexus', 'alice', 15);
    seedVotes('nexus', 'voter1', Elections.ELECTION_CONFIG.minVisitsToVote);
    var elec = Elections.createElection('nexus', ['alice']);
    var result = Elections.castVote(elec.election.id, 'voter1', 'alice');
    assert.strictEqual(result.success, true, 'Vote should succeed: ' + (result.error || ''));
  });

  test('castVote increments candidate vote count', function() {
    Elections._reset();
    seedVotes('nexus', 'alice', 15);
    seedVotes('nexus', 'voter1', Elections.ELECTION_CONFIG.minVisitsToVote);
    var elec = Elections.createElection('nexus', ['alice']);
    Elections.castVote(elec.election.id, 'voter1', 'alice');
    assert.strictEqual(elec.election.candidates[0].votes, 1);
  });

  test('castVote increments totalVotes', function() {
    Elections._reset();
    seedVotes('nexus', 'alice', 15);
    seedVotes('nexus', 'voter1', Elections.ELECTION_CONFIG.minVisitsToVote);
    seedVotes('nexus', 'voter2', Elections.ELECTION_CONFIG.minVisitsToVote);
    var elec = Elections.createElection('nexus', ['alice']);
    Elections.castVote(elec.election.id, 'voter1', 'alice');
    Elections.castVote(elec.election.id, 'voter2', 'alice');
    assert.strictEqual(elec.election.totalVotes, 2);
  });

  test('castVote rejects duplicate vote from same voter', function() {
    Elections._reset();
    seedVotes('nexus', 'alice', 15);
    seedVotes('nexus', 'voter1', Elections.ELECTION_CONFIG.minVisitsToVote);
    var elec = Elections.createElection('nexus', ['alice']);
    Elections.castVote(elec.election.id, 'voter1', 'alice');
    var result = Elections.castVote(elec.election.id, 'voter1', 'alice');
    assert.strictEqual(result.success, false);
    assert(result.error.indexOf('already') !== -1 || result.error.indexOf('voted') !== -1);
  });

  test('castVote rejects ineligible voter', function() {
    Elections._reset();
    seedVotes('nexus', 'alice', 15);
    // newbie has 0 visits
    var elec = Elections.createElection('nexus', ['alice']);
    var result = Elections.castVote(elec.election.id, 'newbie', 'alice');
    assert.strictEqual(result.success, false);
  });

  test('castVote rejects unknown election', function() {
    Elections._reset();
    var result = Elections.castVote('nonexistent_id', 'voter1', 'alice');
    assert.strictEqual(result.success, false);
    assert(result.error.indexOf('not found') !== -1 || result.error.indexOf('Election') !== -1);
  });

  test('castVote rejects unknown candidate', function() {
    Elections._reset();
    seedVotes('nexus', 'alice', 15);
    seedVotes('nexus', 'voter1', Elections.ELECTION_CONFIG.minVisitsToVote);
    var elec = Elections.createElection('nexus', ['alice']);
    var result = Elections.castVote(elec.election.id, 'voter1', 'totally_unknown');
    assert.strictEqual(result.success, false);
    assert(result.error.indexOf('Candidate') !== -1 || result.error.indexOf('not found') !== -1);
  });

  test('castVote rejects vote on ended election', function() {
    Elections._reset();
    seedVotes('nexus', 'alice', 15);
    seedVotes('nexus', 'voter1', Elections.ELECTION_CONFIG.minVisitsToVote);
    var pastNow = Date.now() - Elections.ELECTION_CONFIG.votingPeriodMs - 1000;
    var elec = Elections.createElection('nexus', ['alice'], { now: pastNow });
    var result = Elections.castVote(elec.election.id, 'voter1', 'alice');
    assert.strictEqual(result.success, false);
  });

  test('multiple voters can vote for different candidates', function() {
    Elections._reset();
    seedVotes('nexus', 'alice', 15);
    seedVotes('nexus', 'bob', 15);
    seedVotes('nexus', 'voter1', Elections.ELECTION_CONFIG.minVisitsToVote);
    seedVotes('nexus', 'voter2', Elections.ELECTION_CONFIG.minVisitsToVote);
    seedVotes('nexus', 'voter3', Elections.ELECTION_CONFIG.minVisitsToVote);
    var elec = Elections.createElection('nexus', ['alice', 'bob']);
    Elections.castVote(elec.election.id, 'voter1', 'alice');
    Elections.castVote(elec.election.id, 'voter2', 'alice');
    Elections.castVote(elec.election.id, 'voter3', 'bob');
    assert.strictEqual(elec.election.totalVotes, 3);
    var alice = elec.election.candidates.find(function(c) { return c.playerId === 'alice'; });
    var bob = elec.election.candidates.find(function(c) { return c.playerId === 'bob'; });
    assert.strictEqual(alice.votes, 2);
    assert.strictEqual(bob.votes, 1);
  });

});

// ============================================================================
suite('Elections — getElectionResults', function() {

  test('getElectionResults returns winner for single candidate', function() {
    Elections._reset();
    seedVotes('nexus', 'alice', 15);
    seedVotes('nexus', 'voter1', Elections.ELECTION_CONFIG.minVisitsToVote);
    var elec = Elections.createElection('nexus', ['alice']);
    Elections.castVote(elec.election.id, 'voter1', 'alice');
    var results = Elections.getElectionResults(elec.election);
    assert.strictEqual(results.winner, 'alice');
  });

  test('getElectionResults correctly ranks candidates', function() {
    Elections._reset();
    seedVotes('nexus', 'alice', 15);
    seedVotes('nexus', 'bob', 15);
    seedVotes('nexus', 'voter1', Elections.ELECTION_CONFIG.minVisitsToVote);
    seedVotes('nexus', 'voter2', Elections.ELECTION_CONFIG.minVisitsToVote);
    seedVotes('nexus', 'voter3', Elections.ELECTION_CONFIG.minVisitsToVote);
    var elec = Elections.createElection('nexus', ['alice', 'bob']);
    Elections.castVote(elec.election.id, 'voter1', 'bob');
    Elections.castVote(elec.election.id, 'voter2', 'bob');
    Elections.castVote(elec.election.id, 'voter3', 'alice');
    var results = Elections.getElectionResults(elec.election);
    assert.strictEqual(results.winner, 'bob');
    assert.strictEqual(results.ranked[0].playerId, 'bob');
    assert.strictEqual(results.ranked[1].playerId, 'alice');
  });

  test('getElectionResults returns null winner with no votes', function() {
    Elections._reset();
    seedVotes('nexus', 'alice', 15);
    var elec = Elections.createElection('nexus', ['alice']);
    var results = Elections.getElectionResults(elec.election);
    assert.strictEqual(results.winner, null);
  });

  test('getElectionResults computes vote percentages', function() {
    Elections._reset();
    seedVotes('nexus', 'alice', 15);
    seedVotes('nexus', 'bob', 15);
    seedVotes('nexus', 'voter1', Elections.ELECTION_CONFIG.minVisitsToVote);
    seedVotes('nexus', 'voter2', Elections.ELECTION_CONFIG.minVisitsToVote);
    var elec = Elections.createElection('nexus', ['alice', 'bob']);
    Elections.castVote(elec.election.id, 'voter1', 'alice');
    Elections.castVote(elec.election.id, 'voter2', 'bob');
    var results = Elections.getElectionResults(elec.election);
    results.ranked.forEach(function(r) {
      assert.strictEqual(r.percentage, 50);
    });
  });

  test('getElectionResults handles null election gracefully', function() {
    var results = Elections.getElectionResults(null);
    assert.strictEqual(results.winner, null);
    assert(Array.isArray(results.ranked));
    assert.strictEqual(results.totalVotes, 0);
  });

  test('getElectionResults totalVotes matches election.totalVotes', function() {
    Elections._reset();
    seedVotes('nexus', 'alice', 15);
    seedVotes('nexus', 'voter1', Elections.ELECTION_CONFIG.minVisitsToVote);
    seedVotes('nexus', 'voter2', Elections.ELECTION_CONFIG.minVisitsToVote);
    var elec = Elections.createElection('nexus', ['alice']);
    Elections.castVote(elec.election.id, 'voter1', 'alice');
    Elections.castVote(elec.election.id, 'voter2', 'alice');
    var results = Elections.getElectionResults(elec.election);
    assert.strictEqual(results.totalVotes, 2);
  });

});

// ============================================================================
suite('Elections — finalizeElection', function() {

  test('finalizeElection fails before voting period ends', function() {
    Elections._reset();
    seedVotes('nexus', 'alice', 15);
    var elec = Elections.createElection('nexus', ['alice'], { now: Date.now() });
    var result = Elections.finalizeElection(elec.election.id);
    assert.strictEqual(result.success, false);
    assert(result.error.indexOf('not ended') !== -1 || result.error.indexOf('period') !== -1 || result.error.indexOf('yet') !== -1);
  });

  test('finalizeElection succeeds after voting period', function() {
    Elections._reset();
    var pastNow = Date.now() - Elections.ELECTION_CONFIG.votingPeriodMs - 5000;
    seedVotes('nexus', 'alice', 15);
    var elec = Elections.createElection('nexus', ['alice'], { now: pastNow });
    var result = Elections.finalizeElection(elec.election.id, { now: Date.now() });
    assert.strictEqual(result.success, true, 'Should finalize: ' + (result.error || ''));
  });

  test('finalizeElection sets election status to finalized', function() {
    Elections._reset();
    var pastNow = Date.now() - Elections.ELECTION_CONFIG.votingPeriodMs - 5000;
    seedVotes('nexus', 'alice', 15);
    var elec = Elections.createElection('nexus', ['alice'], { now: pastNow });
    Elections.finalizeElection(elec.election.id, { now: Date.now() });
    assert.strictEqual(elec.election.status, 'finalized');
  });

  test('finalizeElection installs winner as steward', function() {
    Elections._reset();
    var pastNow = Date.now() - Elections.ELECTION_CONFIG.votingPeriodMs - 5000;
    seedVotes('nexus', 'alice', 15);
    seedVotes('nexus', 'voter1', Elections.ELECTION_CONFIG.minVisitsToVote);
    var elec = Elections.createElection('nexus', ['alice'], { now: pastNow });
    Elections.castVote(elec.election.id, 'voter1', 'alice', { now: pastNow + 100 });
    Elections.finalizeElection(elec.election.id, { now: Date.now() });
    var stewards = Elections.getZoneStewards('nexus');
    assert(stewards.length > 0, 'Should have at least 1 steward');
    assert.strictEqual(stewards[0].playerId, 'alice');
  });

  test('finalizeElection returns stewards array', function() {
    Elections._reset();
    var pastNow = Date.now() - Elections.ELECTION_CONFIG.votingPeriodMs - 5000;
    seedVotes('nexus', 'alice', 15);
    var elec = Elections.createElection('nexus', ['alice'], { now: pastNow });
    var result = Elections.finalizeElection(elec.election.id, { now: Date.now() });
    assert(Array.isArray(result.stewards), 'Should return stewards array');
  });

  test('finalizeElection fails for unknown election', function() {
    Elections._reset();
    var result = Elections.finalizeElection('nonexistent_election');
    assert.strictEqual(result.success, false);
  });

  test('finalizeElection fails if already finalized', function() {
    Elections._reset();
    var pastNow = Date.now() - Elections.ELECTION_CONFIG.votingPeriodMs - 5000;
    seedVotes('nexus', 'alice', 15);
    var elec = Elections.createElection('nexus', ['alice'], { now: pastNow });
    Elections.finalizeElection(elec.election.id, { now: Date.now() });
    var result = Elections.finalizeElection(elec.election.id, { now: Date.now() });
    assert.strictEqual(result.success, false);
  });

  test('finalizeElection records election in history', function() {
    Elections._reset();
    var pastNow = Date.now() - Elections.ELECTION_CONFIG.votingPeriodMs - 5000;
    seedVotes('nexus', 'alice', 15);
    var elec = Elections.createElection('nexus', ['alice'], { now: pastNow });
    Elections.finalizeElection(elec.election.id, { now: Date.now() });
    var history = Elections.getElectionHistory('nexus');
    assert(history.length > 0, 'History should be recorded');
  });

  test('finalizeElection steward termEnds is 7 days after finalization', function() {
    Elections._reset();
    var pastNow = Date.now() - Elections.ELECTION_CONFIG.votingPeriodMs - 5000;
    seedVotes('nexus', 'alice', 15);
    var elec = Elections.createElection('nexus', ['alice'], { now: pastNow });
    var finalizeNow = Date.now();
    Elections.finalizeElection(elec.election.id, { now: finalizeNow });
    var stewards = Elections.getZoneStewards('nexus');
    var expectedTermEnd = finalizeNow + Elections.ELECTION_CONFIG.termLengthMs;
    assert.strictEqual(stewards[0].termEnds, expectedTermEnd);
  });

});

// ============================================================================
suite('Elections — getCurrentStewards & getZoneStewards', function() {

  test('getCurrentStewards returns empty object with no stewards', function() {
    Elections._reset();
    var stewards = Elections.getCurrentStewards();
    assert(typeof stewards === 'object', 'Should return an object');
  });

  test('getCurrentStewards returns active stewards', function() {
    Elections._reset();
    Elections._insertSteward('nexus', {
      playerId: 'alice', zoneId: 'nexus', electionId: 'e1',
      votes: 5, electedAt: Date.now(), termEnds: Date.now() + 1000000
    });
    var stewards = Elections.getCurrentStewards();
    assert(stewards.nexus, 'Should have nexus stewards');
    assert.strictEqual(stewards.nexus[0].playerId, 'alice');
  });

  test('getCurrentStewards filters out expired stewards', function() {
    Elections._reset();
    Elections._insertSteward('nexus', {
      playerId: 'expired_steward', zoneId: 'nexus', electionId: 'e1',
      votes: 3, electedAt: 0, termEnds: 1 // expired long ago
    });
    var stewards = Elections.getCurrentStewards();
    assert(!stewards.nexus || stewards.nexus.length === 0, 'Expired stewards should not appear');
  });

  test('getZoneStewards returns stewards for specific zone', function() {
    Elections._reset();
    Elections._insertSteward('gardens', {
      playerId: 'gardener', zoneId: 'gardens', electionId: 'e2',
      votes: 8, electedAt: Date.now(), termEnds: Date.now() + 1000000
    });
    var stewards = Elections.getZoneStewards('gardens');
    assert.strictEqual(stewards.length, 1);
    assert.strictEqual(stewards[0].playerId, 'gardener');
  });

  test('getZoneStewards returns empty array for zone with no stewards', function() {
    Elections._reset();
    var stewards = Elections.getZoneStewards('arena');
    assert(Array.isArray(stewards));
    assert.strictEqual(stewards.length, 0);
  });

  test('isSteward returns true for active steward', function() {
    Elections._reset();
    Elections._insertSteward('nexus', {
      playerId: 'alice', zoneId: 'nexus', electionId: 'e1',
      votes: 5, electedAt: Date.now(), termEnds: Date.now() + 1000000
    });
    assert.strictEqual(Elections.isSteward('alice', 'nexus'), true);
  });

  test('isSteward returns false for non-steward', function() {
    Elections._reset();
    assert.strictEqual(Elections.isSteward('random_player', 'nexus'), false);
  });

  test('isSteward returns false for expired steward', function() {
    Elections._reset();
    Elections._insertSteward('nexus', {
      playerId: 'alice', zoneId: 'nexus', electionId: 'e1',
      votes: 5, electedAt: 0, termEnds: 1
    });
    assert.strictEqual(Elections.isSteward('alice', 'nexus'), false);
  });

});

// ============================================================================
suite('Elections — getActiveElections', function() {

  test('getActiveElections returns empty array with no elections', function() {
    Elections._reset();
    var active = Elections.getActiveElections();
    assert(Array.isArray(active));
    assert.strictEqual(active.length, 0);
  });

  test('getActiveElections returns active elections', function() {
    Elections._reset();
    seedVotes('nexus', 'alice', 15);
    Elections.createElection('nexus', ['alice']);
    var active = Elections.getActiveElections();
    assert.strictEqual(active.length, 1);
    assert.strictEqual(active[0].zoneId, 'nexus');
  });

  test('getActiveElections excludes ended elections', function() {
    Elections._reset();
    seedVotes('nexus', 'alice', 15);
    var pastNow = Date.now() - Elections.ELECTION_CONFIG.votingPeriodMs - 5000;
    Elections.createElection('nexus', ['alice'], { now: pastNow });
    var active = Elections.getActiveElections();
    assert.strictEqual(active.length, 0);
  });

  test('getActiveElections can show elections from multiple zones', function() {
    Elections._reset();
    seedVotes('nexus', 'alice', 15);
    seedVotes('gardens', 'bob', 15);
    Elections.createElection('nexus', ['alice'], { now: Date.now() });
    Elections.createElection('gardens', ['bob'], { now: Date.now() + 1 });
    var active = Elections.getActiveElections();
    assert.strictEqual(active.length, 2);
  });

});

// ============================================================================
suite('Elections — getElectionHistory', function() {

  test('getElectionHistory returns empty array with no history', function() {
    Elections._reset();
    var history = Elections.getElectionHistory('nexus');
    assert(Array.isArray(history));
    assert.strictEqual(history.length, 0);
  });

  test('getElectionHistory records after finalization', function() {
    Elections._reset();
    var pastNow = Date.now() - Elections.ELECTION_CONFIG.votingPeriodMs - 5000;
    seedVotes('nexus', 'alice', 15);
    var elec = Elections.createElection('nexus', ['alice'], { now: pastNow });
    Elections.finalizeElection(elec.election.id, { now: Date.now() });
    var history = Elections.getElectionHistory('nexus');
    assert.strictEqual(history.length, 1);
  });

  test('getElectionHistory is newest-first', function() {
    Elections._reset();
    var t1 = Date.now() - Elections.ELECTION_CONFIG.votingPeriodMs * 3;
    var t2 = Date.now() - Elections.ELECTION_CONFIG.votingPeriodMs - 5000;
    seedVotes('nexus', 'alice', 15);
    seedVotes('nexus', 'bob', 15);
    var e1 = Elections.createElection('nexus', ['alice'], { now: t1 });
    Elections.finalizeElection(e1.election.id, { now: t1 + Elections.ELECTION_CONFIG.votingPeriodMs + 1000 });
    var e2 = Elections.createElection('nexus', ['bob'], { now: t2 });
    Elections.finalizeElection(e2.election.id, { now: Date.now() });
    var history = Elections.getElectionHistory('nexus');
    assert.strictEqual(history.length, 2);
    // Newest should be first
    assert(history[0].finalizedAt >= history[1].finalizedAt, 'History should be newest-first');
  });

  test('getElectionHistory returns a copy (not mutation)', function() {
    Elections._reset();
    var pastNow = Date.now() - Elections.ELECTION_CONFIG.votingPeriodMs - 5000;
    seedVotes('nexus', 'alice', 15);
    var elec = Elections.createElection('nexus', ['alice'], { now: pastNow });
    Elections.finalizeElection(elec.election.id, { now: Date.now() });
    var history1 = Elections.getElectionHistory('nexus');
    history1.push({ fake: true });
    var history2 = Elections.getElectionHistory('nexus');
    assert.strictEqual(history2.length, 1, 'Mutating returned history should not affect store');
  });

});

// ============================================================================
suite('Elections — calculateTermRemaining', function() {

  test('calculateTermRemaining returns expired for past termEnds', function() {
    var steward = { termEnds: Date.now() - 10000 };
    var result = Elections.calculateTermRemaining(steward);
    assert.strictEqual(result.expired, true);
    assert.strictEqual(result.days, 0);
    assert.strictEqual(result.hours, 0);
  });

  test('calculateTermRemaining returns correct days for future termEnds', function() {
    var threeDays = 3 * 24 * 60 * 60 * 1000;
    var steward = { termEnds: Date.now() + threeDays };
    var result = Elections.calculateTermRemaining(steward);
    assert.strictEqual(result.expired, false);
    assert.strictEqual(result.days, 3);
  });

  test('calculateTermRemaining handles null steward', function() {
    var result = Elections.calculateTermRemaining(null);
    assert.strictEqual(result.expired, true);
  });

  test('calculateTermRemaining returns non-negative totalMs', function() {
    var steward = { termEnds: Date.now() + 5000 };
    var result = Elections.calculateTermRemaining(steward);
    assert(result.totalMs > 0);
  });

  test('calculateTermRemaining hours computation is correct', function() {
    var twelveHours = 12 * 60 * 60 * 1000;
    var steward = { termEnds: Date.now() + twelveHours + 60000 }; // +1 minute buffer
    var result = Elections.calculateTermRemaining(steward);
    assert.strictEqual(result.days, 0);
    assert.strictEqual(result.hours, 12);
  });

});

// ============================================================================
suite('Elections — formatElectionCard', function() {

  test('formatElectionCard returns null for null input', function() {
    var card = Elections.formatElectionCard(null);
    assert.strictEqual(card, null);
  });

  test('formatElectionCard returns object with expected fields', function() {
    Elections._reset();
    seedVotes('nexus', 'alice', 15);
    var elec = Elections.createElection('nexus', ['alice']);
    var card = Elections.formatElectionCard(elec.election);
    assert(typeof card === 'object' && card !== null);
    assert(typeof card.id === 'string');
    assert(typeof card.zoneId === 'string');
    assert(typeof card.timeLeft === 'string');
    assert(typeof card.totalVotes === 'number');
    assert(Array.isArray(card.candidates));
  });

  test('formatElectionCard timeLeft shows hours remaining for active election', function() {
    Elections._reset();
    seedVotes('nexus', 'alice', 15);
    var elec = Elections.createElection('nexus', ['alice']);
    var card = Elections.formatElectionCard(elec.election);
    assert(card.timeLeft.indexOf('remaining') !== -1 || card.timeLeft.indexOf('h') !== -1,
      'Should show remaining time: ' + card.timeLeft);
  });

  test('formatElectionCard candidates match election candidates', function() {
    Elections._reset();
    seedVotes('nexus', 'alice', 15);
    seedVotes('nexus', 'bob', 15);
    var elec = Elections.createElection('nexus', ['alice', 'bob']);
    var card = Elections.formatElectionCard(elec.election);
    assert.strictEqual(card.candidates.length, 2);
  });

  test('formatElectionCard includes startTime and endTime as strings', function() {
    Elections._reset();
    seedVotes('nexus', 'alice', 15);
    var elec = Elections.createElection('nexus', ['alice']);
    var card = Elections.formatElectionCard(elec.election);
    assert(typeof card.startTime === 'string');
    assert(typeof card.endTime === 'string');
  });

});

// ============================================================================
suite('Elections — Protocol message integration', function() {

  test('applyElectionStart creates election for zone', function() {
    Elections._reset();
    seedVotes('nexus', 'alice', 15);
    var msg = { from: 'alice', payload: { zone: 'nexus' } };
    var result = Elections.applyElectionStart(msg);
    assert.strictEqual(result.success, true, result.error);
    assert(result.election, 'Should return election object');
    assert.strictEqual(result.election.zoneId, 'nexus');
  });

  test('applyElectionStart fails without zone in payload', function() {
    Elections._reset();
    var msg = { from: 'alice', payload: {} };
    var result = Elections.applyElectionStart(msg);
    assert.strictEqual(result.success, false);
  });

  test('applyElectionStart records startedBy from msg.from', function() {
    Elections._reset();
    seedVotes('gardens', 'bob', 15);
    var msg = { from: 'bob', payload: { zone: 'gardens' } };
    var result = Elections.applyElectionStart(msg);
    assert.strictEqual(result.election.startedBy, 'bob');
  });

  test('applyElectionVote casts vote correctly', function() {
    Elections._reset();
    seedVotes('nexus', 'alice', 15);
    seedVotes('nexus', 'voter1', Elections.ELECTION_CONFIG.minVisitsToVote);
    var startMsg = { from: 'alice', payload: { zone: 'nexus' } };
    var startResult = Elections.applyElectionStart(startMsg);
    var voteMsg = { from: 'voter1', payload: { electionId: startResult.election.id, candidate: 'alice' } };
    var voteResult = Elections.applyElectionVote(voteMsg);
    assert.strictEqual(voteResult.success, true, voteResult.error);
  });

  test('applyElectionVote fails without electionId', function() {
    Elections._reset();
    var msg = { from: 'voter1', payload: { candidate: 'alice' } };
    var result = Elections.applyElectionVote(msg);
    assert.strictEqual(result.success, false);
  });

  test('applyElectionVote fails without candidate', function() {
    Elections._reset();
    var msg = { from: 'voter1', payload: { electionId: 'e1' } };
    var result = Elections.applyElectionVote(msg);
    assert.strictEqual(result.success, false);
  });

  test('applyElectionFinalize finalizes election', function() {
    Elections._reset();
    var pastNow = Date.now() - Elections.ELECTION_CONFIG.votingPeriodMs - 5000;
    seedVotes('nexus', 'alice', 15);
    var startMsg = { from: 'alice', payload: { zone: 'nexus' } };
    var startResult = Elections.applyElectionStart(startMsg, { now: pastNow });
    var finalizeMsg = { from: 'alice', payload: { electionId: startResult.election.id } };
    var finalResult = Elections.applyElectionFinalize(finalizeMsg, { now: Date.now() });
    assert.strictEqual(finalResult.success, true, finalResult.error);
    assert(Array.isArray(finalResult.stewards));
  });

  test('applyElectionFinalize fails without electionId', function() {
    Elections._reset();
    var msg = { from: 'alice', payload: {} };
    var result = Elections.applyElectionFinalize(msg);
    assert.strictEqual(result.success, false);
  });

});

// ============================================================================
suite('Elections — declareCandidacy', function() {

  test('declareCandidacy adds candidate to active election', function() {
    Elections._reset();
    seedVotes('nexus', 'alice', 15);
    var elec = Elections.createElection('nexus', ['alice']);
    var result = Elections.declareCandidacy(elec.election.id, 'newcandidate');
    assert.strictEqual(result.success, true, result.error);
    var found = elec.election.candidates.find(function(c) { return c.playerId === 'newcandidate'; });
    assert(found, 'New candidate should be in candidates list');
  });

  test('declareCandidacy fails for already-listed candidate', function() {
    Elections._reset();
    seedVotes('nexus', 'alice', 15);
    var elec = Elections.createElection('nexus', ['alice']);
    var result = Elections.declareCandidacy(elec.election.id, 'alice');
    assert.strictEqual(result.success, false);
    assert(result.error.indexOf('already') !== -1 || result.error.indexOf('candidate') !== -1);
  });

  test('declareCandidacy fails for unknown election', function() {
    Elections._reset();
    var result = Elections.declareCandidacy('nonexistent', 'bob');
    assert.strictEqual(result.success, false);
  });

});

// ============================================================================
suite('Elections — _reset helper', function() {

  test('_reset clears all stored elections', function() {
    Elections._reset();
    seedVotes('nexus', 'alice', 15);
    Elections.createElection('nexus', ['alice']);
    Elections._reset();
    assert.strictEqual(Elections.getActiveElections().length, 0);
  });

  test('_reset clears steward store', function() {
    Elections._reset();
    Elections._insertSteward('nexus', {
      playerId: 'alice', zoneId: 'nexus', electionId: 'e1',
      votes: 5, electedAt: Date.now(), termEnds: Date.now() + 1000000
    });
    Elections._reset();
    assert.strictEqual(Elections.getZoneStewards('nexus').length, 0);
  });

  test('_reset clears election history', function() {
    Elections._reset();
    var pastNow = Date.now() - Elections.ELECTION_CONFIG.votingPeriodMs - 5000;
    seedVotes('nexus', 'alice', 15);
    var elec = Elections.createElection('nexus', ['alice'], { now: pastNow });
    Elections.finalizeElection(elec.election.id, { now: Date.now() });
    Elections._reset();
    assert.strictEqual(Elections.getElectionHistory('nexus').length, 0);
  });

});

const success = report();
process.exit(success ? 0 : 1);
