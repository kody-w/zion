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
  // state must be passed so the race record (with checkpoints and progress) can be looked up
  function checkRaceProgress(competitionId, playerId, position, state) {
    var CHECKPOINT_RADIUS = 5; // units — player must be within this distance to trigger a checkpoint

    // Guard: need state to look up the race
    if (!state || !state.competitions) {
      return { checkpointHit: false, finished: false, currentCheckpoint: 0, time: 0 };
    }

    // Find the race
    var race = null;
    for (var i = 0; i < state.competitions.length; i++) {
      if (state.competitions[i].id === competitionId && state.competitions[i].type === 'race') {
        race = state.competitions[i];
        break;
      }
    }

    if (!race) {
      return { checkpointHit: false, finished: false, currentCheckpoint: 0, time: 0 };
    }

    // Race must be active
    if (race.status !== 'active') {
      return { checkpointHit: false, finished: false, currentCheckpoint: 0, time: 0 };
    }

    // Player must be a participant
    if (race.participants.indexOf(playerId) === -1) {
      return { checkpointHit: false, finished: false, currentCheckpoint: 0, time: 0 };
    }

    // Ensure checkpoints array exists and is non-empty
    if (!race.checkpoints || race.checkpoints.length === 0) {
      return { checkpointHit: false, finished: false, currentCheckpoint: 0, time: 0 };
    }

    // Initialise player progress record if missing
    if (!race.progress) {
      race.progress = {};
    }
    if (!race.progress[playerId]) {
      race.progress[playerId] = {
        checkpointIndex: 0,  // next checkpoint the player needs to reach
        startTime: Date.now(),
        time: 0,
        finished: false
      };
    }

    var playerProgress = race.progress[playerId];

    // If this player already finished, nothing more to do
    if (playerProgress.finished) {
      return {
        checkpointHit: false,
        finished: true,
        currentCheckpoint: playerProgress.checkpointIndex,
        time: playerProgress.time
      };
    }

    // The next checkpoint the player must reach (sequential enforcement)
    var nextIndex = playerProgress.checkpointIndex;
    if (nextIndex >= race.checkpoints.length) {
      // Should not happen, but guard anyway
      return { checkpointHit: false, finished: false, currentCheckpoint: nextIndex, time: playerProgress.time };
    }

    var target = race.checkpoints[nextIndex];

    // Distance check (3-D Euclidean)
    var dx = position.x - target.x;
    var dy = position.y - target.y;
    var dz = position.z - target.z;
    var distSquared = dx * dx + dy * dy + dz * dz;

    if (distSquared > CHECKPOINT_RADIUS * CHECKPOINT_RADIUS) {
      // Not close enough to the next checkpoint yet
      return {
        checkpointHit: false,
        finished: false,
        currentCheckpoint: nextIndex,
        time: Date.now() - playerProgress.startTime
      };
    }

    // --- Checkpoint hit! ---
    playerProgress.checkpointIndex = nextIndex + 1;
    var elapsed = Date.now() - playerProgress.startTime;
    playerProgress.time = elapsed;

    var finished = false;
    if (playerProgress.checkpointIndex >= race.checkpoints.length) {
      // Player has cleared all checkpoints — race complete
      finished = true;
      playerProgress.finished = true;

      // Check if all participants have finished
      var allDone = true;
      for (var p = 0; p < race.participants.length; p++) {
        var pid = race.participants[p];
        if (!race.progress[pid] || !race.progress[pid].finished) {
          allDone = false;
          break;
        }
      }

      if (allDone) {
        race.status = 'completed';

        // Determine winner: finished participant with lowest time
        var bestTime = Infinity;
        var winner = null;
        for (var w = 0; w < race.participants.length; w++) {
          var wid = race.participants[w];
          if (race.progress[wid] && race.progress[wid].finished) {
            if (race.progress[wid].time < bestTime) {
              bestTime = race.progress[wid].time;
              winner = wid;
            }
          }
        }
        race.winner = winner;
        race.endedAt = Date.now();
      }
    }

    return {
      checkpointHit: true,
      finished: finished,
      currentCheckpoint: playerProgress.checkpointIndex,
      time: elapsed
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
