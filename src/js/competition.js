(function(exports) {

  // Competition types
  const COMPETITION_TYPES = ['duel', 'race', 'puzzle_race', 'build_contest', 'music_battle'];

  // Pending challenges store
  const pendingChallenges = {};

  // Spark awards by competition type
  const SPARK_AWARDS = {
    duel: 50,
    race: 30,
    puzzle_race: 40,
    build_contest: 100,
    music_battle: 60
  };

  // Generate unique IDs
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  // Handle challenge creation
  function handleChallenge(msg, state, zoneRules) {
    if (!zoneRules.competition || !zoneRules.pvp) {
      return {
        success: false,
        error: 'Competition not allowed in this zone'
      };
    }

    const challengeType = msg.payload.type;
    if (!COMPETITION_TYPES.includes(challengeType)) {
      return {
        success: false,
        error: 'Invalid competition type'
      };
    }

    const challengeId = generateId();
    const challenge = {
      id: challengeId,
      challenger: msg.from,
      challenged: msg.payload.to,
      type: challengeType,
      rules: msg.payload.rules || {},
      ts: Date.now()
    };

    pendingChallenges[challengeId] = challenge;

    return {
      success: true,
      pendingChallenge: challenge
    };
  }

  // Handle challenge acceptance
  function handleAcceptChallenge(msg, state) {
    const playerId = msg.from;

    // Find pending challenge targeting this player
    let foundChallenge = null;
    let challengeId = null;

    for (const [id, challenge] of Object.entries(pendingChallenges)) {
      if (challenge.challenged === playerId) {
        foundChallenge = challenge;
        challengeId = id;
        break;
      }
    }

    if (!foundChallenge) {
      return {
        success: false,
        error: 'No pending challenge found'
      };
    }

    // Create active competition
    const competition = {
      id: generateId(),
      players: [foundChallenge.challenger, foundChallenge.challenged],
      type: foundChallenge.type,
      rules: foundChallenge.rules,
      startedAt: Date.now(),
      scores: {},
      status: 'active'
    };

    // Initialize state.competitions if needed
    if (!state.competitions) {
      state.competitions = [];
    }

    state.competitions.push(competition);

    // Remove from pending challenges
    delete pendingChallenges[challengeId];

    return {
      success: true,
      competition: competition,
      state: state
    };
  }

  // Handle forfeit
  function handleForfeit(msg, state) {
    if (!state.competitions || state.competitions.length === 0) {
      return {
        success: false,
        error: 'No active competitions found'
      };
    }

    const playerId = msg.from;

    // Find active competition involving this player
    const competitionIndex = state.competitions.findIndex(comp =>
      comp.status === 'active' && comp.players.includes(playerId)
    );

    if (competitionIndex === -1) {
      return {
        success: false,
        error: 'No active competition found for this player'
      };
    }

    const competition = state.competitions[competitionIndex];

    // Determine winner (the other player)
    const winner = competition.players.find(p => p !== playerId);

    // Update competition status
    competition.status = 'completed';
    competition.winner = winner;
    competition.endedAt = Date.now();
    competition.forfeitedBy = playerId;

    // Calculate Spark award
    const sparkAward = SPARK_AWARDS[competition.type] || 20;

    return {
      success: true,
      state: state,
      winner: winner,
      sparkAward: sparkAward,
      competition: competition
    };
  }

  // Handle score submission
  function handleScore(msg, state) {
    if (!state.competitions || state.competitions.length === 0) {
      return {
        success: false,
        error: 'No active competitions found'
      };
    }

    const playerId = msg.from;
    const score = msg.payload.score;

    // Find active competition involving this player
    const competitionIndex = state.competitions.findIndex(comp =>
      comp.status === 'active' && comp.players.includes(playerId)
    );

    if (competitionIndex === -1) {
      return {
        success: false,
        error: 'No active competition found for this player'
      };
    }

    const competition = state.competitions[competitionIndex];

    // Record score
    competition.scores[playerId] = score;

    // Check if both players have scored
    const allScored = competition.players.every(p =>
      competition.scores.hasOwnProperty(p)
    );

    let sparkAward = null;
    let winner = null;

    if (allScored) {
      // Determine winner (highest score)
      const scores = competition.players.map(p => ({
        player: p,
        score: competition.scores[p]
      }));

      scores.sort((a, b) => b.score - a.score);
      winner = scores[0].player;

      // Update competition status
      competition.status = 'completed';
      competition.winner = winner;
      competition.endedAt = Date.now();

      // Calculate Spark award
      sparkAward = SPARK_AWARDS[competition.type] || 20;
    }

    return {
      success: true,
      state: state,
      competition: competition,
      winner: winner,
      sparkAward: sparkAward
    };
  }

  // Get pending challenges for a player
  function getPendingChallenges(playerId) {
    return Object.values(pendingChallenges).filter(c =>
      c.challenged === playerId || c.challenger === playerId
    );
  }

  // Exports
  exports.COMPETITION_TYPES = COMPETITION_TYPES;
  exports.SPARK_AWARDS = SPARK_AWARDS;
  exports.handleChallenge = handleChallenge;
  exports.handleAcceptChallenge = handleAcceptChallenge;
  exports.handleForfeit = handleForfeit;
  exports.handleScore = handleScore;
  exports.getPendingChallenges = getPendingChallenges;

})(typeof module !== 'undefined' ? module.exports : (window.Competition = {}));
