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

  // Spectator tracking
  var spectators = {}; // competitionId → [playerIds]

  // Join as spectator
  function joinAsSpectator(competitionId, playerId, state) {
    if (!state.competitions || state.competitions.length === 0) {
      return { success: false, error: 'No competitions found' };
    }

    var competition = state.competitions.find(function(c) {
      return c.id === competitionId;
    });

    if (!competition) {
      return { success: false, error: 'Competition not found' };
    }

    if (competition.status !== 'active') {
      return { success: false, error: 'Competition is not active' };
    }

    if (!spectators[competitionId]) {
      spectators[competitionId] = [];
    }

    if (spectators[competitionId].indexOf(playerId) === -1) {
      spectators[competitionId].push(playerId);
    }

    return { success: true, competition: competition };
  }

  // Leave spectator
  function leaveSpectator(competitionId, playerId) {
    if (!spectators[competitionId]) return;

    var index = spectators[competitionId].indexOf(playerId);
    if (index !== -1) {
      spectators[competitionId].splice(index, 1);
    }

    // Clean up empty spectator lists
    if (spectators[competitionId].length === 0) {
      delete spectators[competitionId];
    }
  }

  // Get spectators
  function getSpectators(competitionId) {
    return spectators[competitionId] || [];
  }

  // Get active competitions
  function getActiveCompetitions(state) {
    if (!state.competitions || state.competitions.length === 0) {
      return [];
    }

    return state.competitions
      .filter(function(c) { return c.status === 'active'; })
      .map(function(c) {
        return {
          id: c.id,
          type: c.type,
          players: c.players,
          startedAt: c.startedAt,
          spectatorCount: spectators[c.id] ? spectators[c.id].length : 0
        };
      });
  }

  // Broadcast to spectators
  function broadcastToSpectators(competitionId, eventType, data) {
    var spectatorList = spectators[competitionId] || [];

    return {
      type: 'spectator_event',
      competitionId: competitionId,
      eventType: eventType,
      data: data,
      spectators: spectatorList,
      timestamp: Date.now()
    };
  }

  // Get competition leaderboard
  function getCompetitionLeaderboard(state) {
    if (!state.competitions || state.competitions.length === 0) {
      return [];
    }

    var playerStats = {};

    state.competitions
      .filter(function(c) { return c.status === 'completed'; })
      .forEach(function(comp) {
        comp.players.forEach(function(playerId) {
          if (!playerStats[playerId]) {
            playerStats[playerId] = { playerId: playerId, wins: 0, losses: 0, total: 0 };
          }

          if (comp.winner === playerId) {
            playerStats[playerId].wins++;
          } else {
            playerStats[playerId].losses++;
          }
          playerStats[playerId].total++;
        });
      });

    return Object.values(playerStats).sort(function(a, b) {
      return b.wins - a.wins;
    });
  }

  // Race Competition Type
  function createRace(organizerId, checkpoints, zone, state) {
    var raceId = generateId();
    var race = {
      id: raceId,
      type: 'race',
      organizer: organizerId,
      checkpoints: checkpoints,
      zone: zone,
      participants: [],
      progress: {}, // playerId → { checkpointIndex, time }
      status: 'waiting',
      createdAt: Date.now()
    };

    if (!state.competitions) {
      state.competitions = [];
    }

    state.competitions.push(race);

    return {
      success: true,
      race: race,
      state: state
    };
  }

  // Check race progress
  function checkRaceProgress(competitionId, playerId, position) {
    // This function would be called in the game loop to check if player reached a checkpoint
    // Returns updated progress information

    return {
      checkpointHit: false,
      finished: false,
      currentCheckpoint: 0,
      time: 0
    };
  }

  // Get race standings
  function getRaceStandings(competitionId, state) {
    if (!state.competitions) {
      return [];
    }

    var race = state.competitions.find(function(c) {
      return c.id === competitionId && c.type === 'race';
    });

    if (!race || !race.progress) {
      return [];
    }

    var standings = Object.keys(race.progress).map(function(playerId) {
      var progress = race.progress[playerId];
      return {
        playerId: playerId,
        checkpointIndex: progress.checkpointIndex || 0,
        time: progress.time || 0,
        finished: progress.finished || false
      };
    });

    // Sort by checkpoint progress (descending) then by time (ascending)
    standings.sort(function(a, b) {
      if (a.finished && !b.finished) return -1;
      if (!a.finished && b.finished) return 1;
      if (a.checkpointIndex !== b.checkpointIndex) {
        return b.checkpointIndex - a.checkpointIndex;
      }
      return a.time - b.time;
    });

    return standings;
  }

  // Exports
  exports.COMPETITION_TYPES = COMPETITION_TYPES;
  exports.SPARK_AWARDS = SPARK_AWARDS;
  exports.handleChallenge = handleChallenge;
  exports.handleAcceptChallenge = handleAcceptChallenge;
  exports.handleForfeit = handleForfeit;
  exports.handleScore = handleScore;
  exports.getPendingChallenges = getPendingChallenges;
  exports.joinAsSpectator = joinAsSpectator;
  exports.leaveSpectator = leaveSpectator;
  exports.getSpectators = getSpectators;
  exports.getActiveCompetitions = getActiveCompetitions;
  exports.broadcastToSpectators = broadcastToSpectators;
  exports.getCompetitionLeaderboard = getCompetitionLeaderboard;
  exports.createRace = createRace;
  exports.checkRaceProgress = checkRaceProgress;
  exports.getRaceStandings = getRaceStandings;

})(typeof module !== 'undefined' ? module.exports : (window.Competition = {}));
