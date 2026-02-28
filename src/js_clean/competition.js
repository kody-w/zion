(function(exports) {
  'use strict';

  // Store pending challenges: { challenged_player: [challenge, ...] }
  var _pendingChallenges = {};

  function handleChallenge(msg, state, zoneRules) {
    if (!zoneRules || !zoneRules.competition) {
      return { success: false, error: 'Competitions are not allowed in this zone' };
    }

    var challenge = {
      id: 'chal_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6),
      challenger: msg.from,
      challenged: msg.payload.to,
      type: msg.payload.type,
      rules: msg.payload.rules || {},
      ts: Date.now()
    };

    var target = msg.payload.to;
    if (!_pendingChallenges[target]) {
      _pendingChallenges[target] = [];
    }
    _pendingChallenges[target].push(challenge);

    return { success: true, pendingChallenge: challenge };
  }

  function getPendingChallenges(playerId) {
    return _pendingChallenges[playerId] || [];
  }

  // §3.3 — Both players must consent (challenger by issuing, challenged by accepting)
  function handleAcceptChallenge(msg, state) {
    var playerId = msg.from;
    var pending = _pendingChallenges[playerId];

    if (!pending || pending.length === 0) {
      return { success: false, error: 'No pending challenge found' };
    }

    // Accept the most recent challenge
    var challenge = pending.pop();

    var competition = {
      id: 'comp_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6),
      players: [challenge.challenger, challenge.challenged],
      type: challenge.type,
      rules: challenge.rules,
      status: 'active',
      scores: {},
      startedAt: Date.now()
    };

    var newState = {
      competitions: (state.competitions || []).concat([competition])
    };

    return { success: true, competition: competition, state: newState };
  }

  function handleForfeit(msg, state) {
    var playerId = msg.from;
    var competitions = state.competitions || [];

    // Find active competition with this player
    var comp = null;
    for (var i = 0; i < competitions.length; i++) {
      if (competitions[i].status === 'active' && competitions[i].players.indexOf(playerId) !== -1) {
        comp = competitions[i];
        break;
      }
    }

    if (!comp) {
      return { success: false, error: 'No active competition found' };
    }

    // Other player wins
    var winner = null;
    for (var j = 0; j < comp.players.length; j++) {
      if (comp.players[j] !== playerId) {
        winner = comp.players[j];
        break;
      }
    }

    comp.status = 'completed';
    comp.forfeitedBy = playerId;
    comp.winner = winner;
    comp.completedAt = Date.now();

    // §6.2 — Winner gets Spark award (10-100 range)
    var sparkAward = Math.floor(10 + Math.random() * 90);

    return { success: true, winner: winner, competition: comp, sparkAward: sparkAward };
  }

  function handleScore(msg, state) {
    var playerId = msg.from;
    var score = msg.payload.score;
    var competitions = state.competitions || [];

    // Find active competition
    var comp = null;
    for (var i = 0; i < competitions.length; i++) {
      if (competitions[i].status === 'active' && competitions[i].players.indexOf(playerId) !== -1) {
        comp = competitions[i];
        break;
      }
    }

    if (!comp) {
      return { success: false, error: 'No active competition found' };
    }

    comp.scores[playerId] = score;

    // Check if all players have scored
    var allScored = true;
    var winner = null;
    var highScore = -Infinity;

    for (var j = 0; j < comp.players.length; j++) {
      var pid = comp.players[j];
      if (comp.scores[pid] === undefined) {
        allScored = false;
        break;
      }
      if (comp.scores[pid] > highScore) {
        highScore = comp.scores[pid];
        winner = pid;
      }
    }

    if (allScored) {
      comp.status = 'completed';
      comp.winner = winner;
      comp.completedAt = Date.now();

      var sparkAward = Math.floor(10 + Math.random() * 90);
      return { success: true, competition: comp, winner: winner, sparkAward: sparkAward };
    }

    return { success: true, competition: comp, winner: null };
  }

  exports.Competition = {
    handleChallenge: handleChallenge,
    handleAcceptChallenge: handleAcceptChallenge,
    handleForfeit: handleForfeit,
    handleScore: handleScore,
    getPendingChallenges: getPendingChallenges
  };

  if (typeof module !== 'undefined') {
    module.exports = exports.Competition;
  }
})(typeof module !== 'undefined' ? module.exports : (window.ZION = window.ZION || {}));
