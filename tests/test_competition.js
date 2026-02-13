const { test, suite, report, assert } = require('./test_runner');
const Competition = require('../src/js/competition');

// Mock zone rules
const competitionZone = { pvp: true, building: false, harvesting: false, trading: false, competition: true, safe: false };
const safeZone = { pvp: false, building: true, harvesting: true, trading: true, competition: false, safe: true };

suite('Competition Module Tests', () => {

  test('handleChallenge succeeds in competition zone (pvp:true, competition:true)', () => {
    const msg = {
      from: 'alice',
      payload: {
        type: 'duel',
        to: 'bob',
        rules: { maxRounds: 3 }
      }
    };

    const state = {};
    const result = Competition.handleChallenge(msg, state, competitionZone);

    assert(result.success === true, 'Challenge should succeed in competition zone');
    assert(result.pendingChallenge !== undefined, 'Should return pending challenge');
    assert(result.pendingChallenge.challenger === 'alice', 'Challenger should be alice');
    assert(result.pendingChallenge.challenged === 'bob', 'Challenged should be bob');
    assert(result.pendingChallenge.type === 'duel', 'Type should be duel');
  });

  test('handleChallenge fails in non-competition zone', () => {
    const msg = {
      from: 'alice',
      payload: {
        type: 'duel',
        to: 'bob',
        rules: {}
      }
    };

    const state = {};
    const result = Competition.handleChallenge(msg, state, safeZone);

    assert(result.success === false, 'Challenge should fail in non-competition zone');
    assert(result.error.includes('not allowed'), 'Error should mention not allowed');
  });

  test('handleChallenge creates pending challenge', () => {
    const msg = {
      from: 'charlie',
      payload: {
        type: 'race',
        to: 'diana',
        rules: { distance: 100 }
      }
    };

    const state = {};
    const result = Competition.handleChallenge(msg, state, competitionZone);

    assert(result.success === true, 'Challenge should succeed');
    assert(result.pendingChallenge.id !== undefined, 'Challenge should have an ID');
    assert(result.pendingChallenge.ts !== undefined, 'Challenge should have timestamp');

    // Verify we can retrieve the pending challenge
    const pending = Competition.getPendingChallenges('diana');
    assert(pending.length > 0, 'Should have pending challenges for diana');
    assert(pending[0].challenger === 'charlie', 'Pending challenge should be from charlie');
  });

  test('handleAcceptChallenge creates active competition', () => {
    // First create a challenge
    const challengeMsg = {
      from: 'alice',
      payload: {
        type: 'puzzle_race',
        to: 'bob',
        rules: { difficulty: 'medium' }
      }
    };

    Competition.handleChallenge(challengeMsg, {}, competitionZone);

    // Now accept it
    const acceptMsg = {
      from: 'bob'
    };

    const state = { competitions: [] };
    const result = Competition.handleAcceptChallenge(acceptMsg, state);

    assert(result.success === true, 'Accept should succeed');
    assert(result.competition !== undefined, 'Should return competition');
    assert(result.competition.status === 'active', 'Competition should be active');
    assert(result.competition.players.includes('alice'), 'Alice should be in competition');
    assert(result.competition.players.includes('bob'), 'Bob should be in competition');
    assert(result.state.competitions.length === 1, 'Competition should be added to state');
  });

  test('handleAcceptChallenge fails if no pending challenge', () => {
    const msg = {
      from: 'unknown_player'
    };

    const state = { competitions: [] };
    const result = Competition.handleAcceptChallenge(msg, state);

    assert(result.success === false, 'Accept should fail with no pending challenge');
    assert(result.error.includes('No pending'), 'Error should mention no pending challenge');
  });

  test('handleForfeit ends competition, other player wins', () => {
    const state = {
      competitions: [{
        id: 'comp1',
        players: ['alice', 'bob'],
        type: 'duel',
        status: 'active',
        startedAt: Date.now()
      }]
    };

    const msg = {
      from: 'alice'
    };

    const result = Competition.handleForfeit(msg, state);

    assert(result.success === true, 'Forfeit should succeed');
    assert(result.winner === 'bob', 'Bob should win by forfeit');
    assert(result.competition.status === 'completed', 'Competition should be completed');
    assert(result.competition.forfeitedBy === 'alice', 'Should record who forfeited');
    assert(result.sparkAward !== undefined, 'Should award Spark to winner');
  });

  test('handleScore records result', () => {
    const state = {
      competitions: [{
        id: 'comp2',
        players: ['charlie', 'diana'],
        type: 'race',
        status: 'active',
        scores: {},
        startedAt: Date.now()
      }]
    };

    const msg1 = {
      from: 'charlie',
      payload: { score: 100 }
    };

    const result1 = Competition.handleScore(msg1, state);

    assert(result1.success === true, 'Score should be recorded');
    assert(result1.competition.scores.charlie === 100, 'Charlie score should be 100');
    assert(result1.winner === null, 'No winner yet (only one score)');

    // Record second score
    const msg2 = {
      from: 'diana',
      payload: { score: 150 }
    };

    const result2 = Competition.handleScore(msg2, state);

    assert(result2.success === true, 'Second score should be recorded');
    assert(result2.competition.scores.diana === 150, 'Diana score should be 150');
    assert(result2.winner === 'diana', 'Diana should win with higher score');
    assert(result2.competition.status === 'completed', 'Competition should be completed');
    assert(result2.sparkAward !== undefined, 'Winner should get Spark award');
  });

  test('Competition only between consenting players (both must explicitly participate)', () => {
    // Challenge requires both players to participate
    // First player creates challenge
    const challengeMsg = {
      from: 'alice',
      payload: {
        type: 'build_contest',
        to: 'bob',
        rules: { timeLimit: 600 }
      }
    };

    const result1 = Competition.handleChallenge(challengeMsg, {}, competitionZone);
    assert(result1.success === true, 'Challenge should be created');

    // Second player must explicitly accept
    const acceptMsg = {
      from: 'bob'
    };

    const state = { competitions: [] };
    const result2 = Competition.handleAcceptChallenge(acceptMsg, state);
    assert(result2.success === true, 'Both players must consent');

    // Verify both players are in the competition
    assert(result2.competition.players.includes('alice'), 'Alice consented by challenging');
    assert(result2.competition.players.includes('bob'), 'Bob consented by accepting');
  });
});

const success = report();
process.exit(success ? 0 : 1);
