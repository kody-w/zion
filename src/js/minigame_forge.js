/**
 * ZION Minigame Forge — Player-created minigames with a simple rule engine
 * Players design games with conditions/objectives, publish them, others play and rate them.
 */

(function(exports) {
  'use strict';

  // ─── Rule primitives ────────────────────────────────────────────────────────

  var RULE_TYPES = [
    {id: 'collect',     name: 'Collect Items',  params: {itemType: 'string', count: 'number'}},
    {id: 'reach_zone',  name: 'Reach Zone',     params: {zone: 'string', timeLimit: 'number'}},
    {id: 'craft_item',  name: 'Craft Item',     params: {recipeId: 'string', count: 'number'}},
    {id: 'catch_fish',  name: 'Catch Fish',     params: {fishType: 'string', count: 'number'}},
    {id: 'defeat_boss', name: 'Defeat Boss',    params: {bossId: 'string'}},
    {id: 'trade_items', name: 'Trade Items',    params: {itemType: 'string', count: 'number'}},
    {id: 'visit_zones', name: 'Visit Zones',    params: {zoneCount: 'number', timeLimit: 'number'}},
    {id: 'solve_puzzle', name: 'Solve Puzzle',  params: {puzzleType: 'string'}},
    {id: 'cook_meal',   name: 'Cook Meal',      params: {quality: 'string', count: 'number'}},
    {id: 'score_points', name: 'Score Points',  params: {target: 'number'}}
  ];

  var VALID_DIFFICULTIES = ['easy', 'medium', 'hard', 'extreme'];
  var VALID_STATUSES = ['draft', 'published', 'archived'];

  // ─── ID counter ─────────────────────────────────────────────────────────────

  var _gameCounter = 0;
  var _sessionCounter = 0;

  function _newGameId() {
    _gameCounter++;
    return 'game_' + _gameCounter;
  }

  function _newSessionId() {
    _sessionCounter++;
    return 'session_' + _sessionCounter;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  function _getRuleType(typeId) {
    for (var i = 0; i < RULE_TYPES.length; i++) {
      if (RULE_TYPES[i].id === typeId) return RULE_TYPES[i];
    }
    return null;
  }

  function _ensureForge(state) {
    if (!state.forge) {
      state.forge = {
        games: [],
        sessions: [],
        ratings: []
      };
    }
    if (!state.forge.games) state.forge.games = [];
    if (!state.forge.sessions) state.forge.sessions = [];
    if (!state.forge.ratings) state.forge.ratings = [];
  }

  function _findGame(state, gameId) {
    var games = state.forge.games;
    for (var i = 0; i < games.length; i++) {
      if (games[i].id === gameId) return games[i];
    }
    return null;
  }

  function _findSession(state, sessionId) {
    var sessions = state.forge.sessions;
    for (var i = 0; i < sessions.length; i++) {
      if (sessions[i].id === sessionId) return sessions[i];
    }
    return null;
  }

  function _calcAvgRating(ratings) {
    if (!ratings || ratings.length === 0) return 0;
    var sum = 0;
    for (var i = 0; i < ratings.length; i++) sum += ratings[i].rating;
    return Math.round((sum / ratings.length) * 10) / 10;
  }

  // ─── Core API ────────────────────────────────────────────────────────────────

  /**
   * Create a new minigame definition (starts as draft).
   */
  function createGame(state, creatorId, title, description, rules, timeLimit, zone, difficulty, tags, currentTick) {
    _ensureForge(state);

    if (!creatorId || !title) {
      return {success: false, error: 'creatorId and title are required'};
    }

    if (!rules || !Array.isArray(rules) || rules.length === 0) {
      return {success: false, error: 'rules must be a non-empty array'};
    }

    var validation = validateRules(rules);
    if (!validation.valid) {
      return {success: false, error: validation.error};
    }

    if (difficulty && VALID_DIFFICULTIES.indexOf(difficulty) === -1) {
      return {success: false, error: 'Invalid difficulty: ' + difficulty};
    }

    var game = {
      id: _newGameId(),
      creatorId: creatorId,
      title: title,
      description: description || '',
      rules: rules,
      timeLimit: (typeof timeLimit === 'number') ? timeLimit : 0,
      zone: zone || null,
      reward: {spark: 10, xp: 20},
      difficulty: difficulty || 'easy',
      tags: Array.isArray(tags) ? tags.slice() : [],
      status: 'draft',
      plays: 0,
      ratings: [],
      avgRating: 0,
      forkedFrom: null,
      createdAt: currentTick || 0
    };

    state.forge.games.push(game);
    return {success: true, game: game};
  }

  /**
   * Publish a draft game (only creator can publish).
   */
  function publishGame(state, creatorId, gameId) {
    _ensureForge(state);
    var game = _findGame(state, gameId);
    if (!game) return {success: false, error: 'Game not found'};
    if (game.creatorId !== creatorId) return {success: false, error: 'Only creator can publish'};
    if (game.status === 'archived') return {success: false, error: 'Cannot publish archived game'};
    game.status = 'published';
    return {success: true, game: game};
  }

  /**
   * Archive a game (only creator can archive).
   */
  function archiveGame(state, creatorId, gameId) {
    _ensureForge(state);
    var game = _findGame(state, gameId);
    if (!game) return {success: false, error: 'Game not found'};
    if (game.creatorId !== creatorId) return {success: false, error: 'Only creator can archive'};
    game.status = 'archived';
    return {success: true, game: game};
  }

  /**
   * Fork (clone) a published game, creating a new draft owned by playerId.
   */
  function forkGame(state, playerId, gameId, newTitle, currentTick) {
    _ensureForge(state);
    var original = _findGame(state, gameId);
    if (!original) return {success: false, error: 'Game not found'};
    if (original.status !== 'published') return {success: false, error: 'Can only fork published games'};

    var forked = {
      id: _newGameId(),
      creatorId: playerId,
      title: newTitle || ('Fork of ' + original.title),
      description: original.description,
      rules: original.rules.map(function(r) {
        return {type: r.type, params: Object.assign ? Object.assign({}, r.params) : _shallowCopy(r.params)};
      }),
      timeLimit: original.timeLimit,
      zone: original.zone,
      reward: {spark: original.reward.spark, xp: original.reward.xp},
      difficulty: original.difficulty,
      tags: original.tags.slice(),
      status: 'draft',
      plays: 0,
      ratings: [],
      avgRating: 0,
      forkedFrom: original.id,
      createdAt: currentTick || 0
    };

    state.forge.games.push(forked);
    return {success: true, game: forked};
  }

  function _shallowCopy(obj) {
    var copy = {};
    for (var k in obj) {
      if (obj.hasOwnProperty(k)) copy[k] = obj[k];
    }
    return copy;
  }

  /**
   * Start a play session for a published game.
   */
  function startPlay(state, playerId, gameId, currentTick) {
    _ensureForge(state);
    var game = _findGame(state, gameId);
    if (!game) return {success: false, error: 'Game not found'};
    if (game.status !== 'published') return {success: false, error: 'Can only play published games'};

    var progress = game.rules.map(function(rule, idx) {
      var target = 1;
      var p = rule.params || {};
      if (typeof p.count === 'number') target = p.count;
      else if (typeof p.zoneCount === 'number') target = p.zoneCount;
      else if (typeof p.target === 'number') target = p.target;
      return {ruleIndex: idx, current: 0, target: target};
    });

    var session = {
      id: _newSessionId(),
      gameId: gameId,
      playerId: playerId,
      status: 'active',
      startTick: currentTick || 0,
      endTick: null,
      progress: progress,
      score: 0
    };

    state.forge.sessions.push(session);
    game.plays++;

    return {success: true, session: session};
  }

  /**
   * Increment progress for a specific rule in an active session.
   */
  function updateProgress(state, sessionId, ruleIndex, increment) {
    _ensureForge(state);
    var session = _findSession(state, sessionId);
    if (!session) return {success: false, error: 'Session not found'};
    if (session.status !== 'active') return {success: false, error: 'Session is not active'};
    if (ruleIndex < 0 || ruleIndex >= session.progress.length) {
      return {success: false, error: 'Invalid ruleIndex'};
    }

    var prog = session.progress[ruleIndex];
    prog.current = Math.min(prog.current + (increment || 1), prog.target);

    return {success: true, progress: prog};
  }

  /**
   * Check if all rules are satisfied and the time limit has not been exceeded.
   * Returns {complete, timedOut}.
   */
  function checkCompletion(state, sessionId, currentTick) {
    _ensureForge(state);
    var session = _findSession(state, sessionId);
    if (!session) return {success: false, error: 'Session not found'};
    if (session.status !== 'active') return {success: false, error: 'Session is not active'};

    var game = _findGame(state, session.gameId);

    // Check time limit
    if (game && game.timeLimit > 0) {
      var elapsed = (currentTick || 0) - session.startTick;
      if (elapsed > game.timeLimit) {
        return {success: true, complete: false, timedOut: true};
      }
    }

    // Check all rules satisfied
    var allDone = true;
    for (var i = 0; i < session.progress.length; i++) {
      if (session.progress[i].current < session.progress[i].target) {
        allDone = false;
        break;
      }
    }

    return {success: true, complete: allDone, timedOut: false};
  }

  /**
   * Complete a play session and award rewards.
   */
  function completePlay(state, sessionId, currentTick) {
    _ensureForge(state);
    var session = _findSession(state, sessionId);
    if (!session) return {success: false, error: 'Session not found'};
    if (session.status !== 'active') return {success: false, error: 'Session is not active'};

    var game = _findGame(state, session.gameId);
    var elapsed = (currentTick || 0) - session.startTick;

    session.status = 'completed';
    session.endTick = currentTick || 0;

    // Score: base reward, penalised by time taken (faster = higher score)
    var baseScore = game ? (game.reward.spark + game.reward.xp) : 30;
    session.score = Math.max(1, baseScore - Math.floor(elapsed / 10));

    var reward = game ? {spark: game.reward.spark, xp: game.reward.xp} : {spark: 10, xp: 20};
    return {success: true, session: session, reward: reward, score: session.score, elapsed: elapsed};
  }

  /**
   * Fail an active session.
   */
  function failPlay(state, sessionId, reason) {
    _ensureForge(state);
    var session = _findSession(state, sessionId);
    if (!session) return {success: false, error: 'Session not found'};
    if (session.status !== 'active') return {success: false, error: 'Session is not active'};

    session.status = 'failed';
    session.failReason = reason || 'unknown';

    return {success: true, session: session};
  }

  /**
   * Rate a published game (1–5 stars with optional text review).
   * Each player can only rate once; subsequent calls update existing rating.
   */
  function rateGame(state, playerId, gameId, rating, review) {
    _ensureForge(state);
    var game = _findGame(state, gameId);
    if (!game) return {success: false, error: 'Game not found'};
    if (game.status !== 'published') return {success: false, error: 'Can only rate published games'};
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return {success: false, error: 'Rating must be a number between 1 and 5'};
    }

    // Update or insert
    var existing = null;
    for (var i = 0; i < game.ratings.length; i++) {
      if (game.ratings[i].playerId === playerId) {
        existing = game.ratings[i];
        break;
      }
    }

    if (existing) {
      existing.rating = rating;
      existing.review = review || '';
    } else {
      game.ratings.push({playerId: playerId, rating: rating, review: review || ''});
    }

    game.avgRating = _calcAvgRating(game.ratings);
    return {success: true, avgRating: game.avgRating};
  }

  /**
   * Get a game by ID.
   */
  function getGame(state, gameId) {
    _ensureForge(state);
    return _findGame(state, gameId) || null;
  }

  /**
   * Get all published games, optionally filtered by zone, difficulty, and/or tags.
   */
  function getPublishedGames(state, zone, difficulty, tags) {
    _ensureForge(state);
    var games = state.forge.games;
    var result = [];
    for (var i = 0; i < games.length; i++) {
      var g = games[i];
      if (g.status !== 'published') continue;
      if (zone && g.zone !== zone) continue;
      if (difficulty && g.difficulty !== difficulty) continue;
      if (tags && tags.length > 0) {
        var hasAll = true;
        for (var t = 0; t < tags.length; t++) {
          if (g.tags.indexOf(tags[t]) === -1) { hasAll = false; break; }
        }
        if (!hasAll) continue;
      }
      result.push(g);
    }
    return result;
  }

  /**
   * Get all games created by a specific player.
   */
  function getPlayerGames(state, playerId) {
    _ensureForge(state);
    var games = state.forge.games;
    var result = [];
    for (var i = 0; i < games.length; i++) {
      if (games[i].creatorId === playerId) result.push(games[i]);
    }
    return result;
  }

  /**
   * Get the top N games by play count.
   */
  function getPopularGames(state, count) {
    _ensureForge(state);
    var n = count || 10;
    var published = getPublishedGames(state);
    published.sort(function(a, b) { return b.plays - a.plays; });
    return published.slice(0, n);
  }

  /**
   * Get the top N games by average rating.
   */
  function getTopRatedGames(state, count) {
    _ensureForge(state);
    var n = count || 10;
    var published = getPublishedGames(state);
    published.sort(function(a, b) { return b.avgRating - a.avgRating; });
    return published.slice(0, n);
  }

  /**
   * Get the N most recently created published games.
   */
  function getRecentGames(state, count) {
    _ensureForge(state);
    var n = count || 10;
    var published = getPublishedGames(state);
    published.sort(function(a, b) { return b.createdAt - a.createdAt; });
    return published.slice(0, n);
  }

  /**
   * Get all completed/failed/abandoned sessions for a player.
   */
  function getPlayHistory(state, playerId) {
    _ensureForge(state);
    var sessions = state.forge.sessions;
    var result = [];
    for (var i = 0; i < sessions.length; i++) {
      if (sessions[i].playerId === playerId) result.push(sessions[i]);
    }
    return result;
  }

  /**
   * Get the fastest completed sessions for a game (leaderboard).
   */
  function getGameLeaderboard(state, gameId, count) {
    _ensureForge(state);
    var n = count || 10;
    var sessions = state.forge.sessions;
    var completed = [];
    for (var i = 0; i < sessions.length; i++) {
      var s = sessions[i];
      if (s.gameId === gameId && s.status === 'completed' && s.endTick !== null) {
        completed.push(s);
      }
    }
    // Sort by elapsed time ascending (fastest first)
    completed.sort(function(a, b) {
      var aTime = a.endTick - a.startTick;
      var bTime = b.endTick - b.startTick;
      return aTime - bTime;
    });
    return completed.slice(0, n).map(function(s, rank) {
      return {
        rank: rank + 1,
        playerId: s.playerId,
        sessionId: s.id,
        score: s.score,
        elapsed: s.endTick - s.startTick
      };
    });
  }

  /**
   * Return all rule type definitions.
   */
  function getRuleTypes() {
    return RULE_TYPES.slice();
  }

  /**
   * Validate an array of rule objects.
   * Returns {valid: bool, error: string|null}.
   */
  function validateRules(rules) {
    if (!Array.isArray(rules)) return {valid: false, error: 'rules must be an array'};
    if (rules.length === 0) return {valid: false, error: 'rules must not be empty'};

    for (var i = 0; i < rules.length; i++) {
      var rule = rules[i];
      if (!rule || typeof rule.type !== 'string') {
        return {valid: false, error: 'Rule at index ' + i + ' must have a type string'};
      }
      var ruleType = _getRuleType(rule.type);
      if (!ruleType) {
        return {valid: false, error: 'Unknown rule type: ' + rule.type};
      }
      if (!rule.params || typeof rule.params !== 'object') {
        return {valid: false, error: 'Rule at index ' + i + ' must have a params object'};
      }
      // Check params match expected types
      var expectedParams = ruleType.params;
      for (var paramName in expectedParams) {
        if (!expectedParams.hasOwnProperty(paramName)) continue;
        var expectedType = expectedParams[paramName];
        var actualValue = rule.params[paramName];
        if (actualValue === undefined || actualValue === null) {
          return {valid: false, error: 'Rule "' + rule.type + '" missing param: ' + paramName};
        }
        if (typeof actualValue !== expectedType) {
          return {
            valid: false,
            error: 'Rule "' + rule.type + '" param "' + paramName + '" must be ' + expectedType +
              ', got ' + typeof actualValue
          };
        }
      }
    }

    return {valid: true, error: null};
  }

  /**
   * Get aggregate stats for a specific game.
   */
  function getGameStats(state, gameId) {
    _ensureForge(state);
    var game = _findGame(state, gameId);
    if (!game) return null;

    var sessions = state.forge.sessions;
    var completedSessions = [];
    var failedCount = 0;
    var totalCount = 0;

    for (var i = 0; i < sessions.length; i++) {
      var s = sessions[i];
      if (s.gameId !== gameId) continue;
      totalCount++;
      if (s.status === 'completed') completedSessions.push(s);
      else if (s.status === 'failed') failedCount++;
    }

    var completionRate = totalCount > 0 ? Math.round((completedSessions.length / totalCount) * 100) / 100 : 0;

    var totalElapsed = 0;
    for (var j = 0; j < completedSessions.length; j++) {
      totalElapsed += completedSessions[j].endTick - completedSessions[j].startTick;
    }
    var avgTime = completedSessions.length > 0 ? Math.round(totalElapsed / completedSessions.length) : 0;

    // Rating distribution
    var ratingDist = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
    for (var k = 0; k < game.ratings.length; k++) {
      var r = game.ratings[k].rating;
      if (ratingDist.hasOwnProperty(r)) ratingDist[r]++;
    }

    return {
      gameId: gameId,
      plays: game.plays,
      completions: completedSessions.length,
      failures: failedCount,
      completionRate: completionRate,
      avgTime: avgTime,
      ratingCount: game.ratings.length,
      avgRating: game.avgRating,
      ratingDistribution: ratingDist
    };
  }

  /**
   * Get aggregate stats across all games in the forge.
   */
  function getForgeStats(state) {
    _ensureForge(state);
    var games = state.forge.games;
    var sessions = state.forge.sessions;

    var totalGames = games.length;
    var publishedGames = 0;
    var totalPlays = 0;
    var creatorPlayCounts = {};

    for (var i = 0; i < games.length; i++) {
      var g = games[i];
      if (g.status === 'published') publishedGames++;
      totalPlays += g.plays;

      if (!creatorPlayCounts[g.creatorId]) creatorPlayCounts[g.creatorId] = 0;
      creatorPlayCounts[g.creatorId] += g.plays;
    }

    // Find most popular creator
    var mostPopularCreator = null;
    var mostPopularCount = -1;
    for (var creatorId in creatorPlayCounts) {
      if (!creatorPlayCounts.hasOwnProperty(creatorId)) continue;
      if (creatorPlayCounts[creatorId] > mostPopularCount) {
        mostPopularCount = creatorPlayCounts[creatorId];
        mostPopularCreator = creatorId;
      }
    }

    return {
      totalGames: totalGames,
      publishedGames: publishedGames,
      totalPlays: totalPlays,
      totalSessions: sessions.length,
      mostPopularCreator: mostPopularCreator,
      mostPopularCreatorPlays: mostPopularCount === -1 ? 0 : mostPopularCount
    };
  }

  // ─── Reset helper (for testing) ─────────────────────────────────────────────

  function _reset() {
    _gameCounter = 0;
    _sessionCounter = 0;
  }

  // ─── Exports ─────────────────────────────────────────────────────────────────

  exports.RULE_TYPES = RULE_TYPES;
  exports.createGame = createGame;
  exports.publishGame = publishGame;
  exports.archiveGame = archiveGame;
  exports.forkGame = forkGame;
  exports.startPlay = startPlay;
  exports.updateProgress = updateProgress;
  exports.checkCompletion = checkCompletion;
  exports.completePlay = completePlay;
  exports.failPlay = failPlay;
  exports.rateGame = rateGame;
  exports.getGame = getGame;
  exports.getPublishedGames = getPublishedGames;
  exports.getPlayerGames = getPlayerGames;
  exports.getPopularGames = getPopularGames;
  exports.getTopRatedGames = getTopRatedGames;
  exports.getRecentGames = getRecentGames;
  exports.getPlayHistory = getPlayHistory;
  exports.getGameLeaderboard = getGameLeaderboard;
  exports.getRuleTypes = getRuleTypes;
  exports.validateRules = validateRules;
  exports.getGameStats = getGameStats;
  exports.getForgeStats = getForgeStats;
  exports._reset = _reset;

})(typeof module !== 'undefined' ? module.exports : (window.MinigameForge = {}));
