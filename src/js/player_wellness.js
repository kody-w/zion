/**
 * player_wellness.js
 * ZION Player Wellness System
 * Play time tracking, healthy break suggestions, rest bonuses, and wellness scoring.
 * Per the Constitution: all messaging is friendly and non-punitive.
 */

(function(exports) {
  'use strict';

  // ============================================================================
  // SEEDED PRNG — mulberry32
  // ============================================================================

  function mulberry32(seed) {
    var s = seed >>> 0;
    return function() {
      s += 0x6D2B79F5;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ============================================================================
  // CONSTANTS
  // ============================================================================

  var TICKS_PER_MINUTE = 60;

  // Break thresholds — friendly, encouraging, never punitive
  var BREAK_THRESHOLDS = [
    {
      id: 'gentle',
      label: 'Gentle',
      minutes: 120,
      ticks: 7200,
      message: 'You\'ve been adventuring for 2 hours — a short stretch would feel wonderful!',
      sparkPenalty: 0
    },
    {
      id: 'moderate',
      label: 'Moderate',
      minutes: 180,
      ticks: 10800,
      message: 'Three hours of heroics! Your real-world self deserves a refreshing break.',
      sparkPenalty: 0
    },
    {
      id: 'strong',
      label: 'Strong',
      minutes: 240,
      ticks: 14400,
      message: 'Four hours of ZION! Time to hydrate and rest your eyes — the world will be here when you return.',
      sparkPenalty: 0
    },
    {
      id: 'urgent',
      label: 'Urgent',
      minutes: 300,
      ticks: 18000,
      message: 'You\'ve journeyed for 5 hours! Your wellbeing matters most — please take a meaningful rest. ZION will remember your progress.',
      sparkPenalty: 0
    }
  ];

  // Rest bonuses for taking breaks
  var REST_BONUSES = [
    {
      id: 'short_rest',
      label: 'Short Rest',
      minBreakMinutes: 30,
      minBreakTicks: 1800,
      sparkMultiplier: 1.10,
      description: '+10% Spark for resting 30 minutes'
    },
    {
      id: 'full_rest',
      label: 'Full Rest',
      minBreakMinutes: 60,
      minBreakTicks: 3600,
      sparkMultiplier: 1.25,
      description: '+25% Spark for resting 60 minutes'
    }
  ];

  // Activity types for variety tracking
  var ACTIVITY_TYPES = [
    'fishing', 'crafting', 'trading', 'building', 'exploring',
    'questing', 'socializing', 'gardening', 'combat', 'dungeons',
    'mentoring', 'cooking', 'constellation', 'time_capsule', 'card_game'
  ];

  // ============================================================================
  // STATE FACTORY
  // ============================================================================

  function createState() {
    return {
      sessions: {},     // playerId -> { current, history[] }
      habits: {},       // playerId -> { dailyTotals, weeklyTotals, breakCount, longestSession }
      journal: [],      // global wellness journal (shared narrative)
      wellnessScores: {}, // playerId -> { score, lastCalculated }
      activityLog: {}   // playerId -> { types: {}, lastActivity }
    };
  }

  // ============================================================================
  // INTERNAL HELPERS
  // ============================================================================

  function ensurePlayer(state, playerId) {
    if (!state.sessions[playerId]) {
      state.sessions[playerId] = { current: null, history: [] };
    }
    if (!state.habits[playerId]) {
      state.habits[playerId] = {
        dailyTotals: {},
        weeklyTotals: {},
        breakCount: 0,
        longestSession: 0,
        breakHistory: []
      };
    }
    if (!state.activityLog[playerId]) {
      state.activityLog[playerId] = { types: {}, lastActivity: null };
    }
    if (!state.wellnessScores[playerId]) {
      state.wellnessScores[playerId] = { score: 50, lastCalculated: 0 };
    }
  }

  function tickToDay(tick) {
    // Each in-game day = 1440 ticks (24 min * 60 ticks)
    return Math.floor(tick / 1440);
  }

  function tickToWeek(tick) {
    return Math.floor(tick / (1440 * 7));
  }

  function generateSessionId(playerId, tick) {
    var rng = mulberry32((playerId.length * 997 + tick) >>> 0);
    var r = Math.floor(rng() * 0xFFFFFF);
    return playerId + '_sess_' + tick + '_' + r.toString(16);
  }

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  function startSession(state, playerId, currentTick) {
    if (!state || !playerId) return { success: false, reason: 'invalid_args' };
    ensurePlayer(state, playerId);

    var playerSessions = state.sessions[playerId];

    // Close any existing open session first
    if (playerSessions.current && !playerSessions.current.ended) {
      playerSessions.current.ended = true;
      playerSessions.current.endTick = currentTick;
      playerSessions.current.duration = currentTick - playerSessions.current.startTick;
      playerSessions.history.push(playerSessions.current);
      playerSessions.current = null;
    }

    var sessionId = generateSessionId(playerId, currentTick);
    playerSessions.current = {
      sessionId: sessionId,
      startTick: currentTick,
      endTick: null,
      duration: 0,
      ended: false,
      awayMode: false,
      awayStartTick: null,
      totalAwayTicks: 0,
      breaks: [],
      activitiesUsed: {},
      thresholdsTriggered: [],
      lastThresholdCheck: currentTick
    };

    return { success: true, sessionId: sessionId };
  }

  function endSession(state, playerId, currentTick) {
    if (!state || !playerId) return { success: false, reason: 'invalid_args' };
    ensurePlayer(state, playerId);

    var playerSessions = state.sessions[playerId];
    if (!playerSessions.current || playerSessions.current.ended) {
      return { success: false, reason: 'no_active_session' };
    }

    var sess = playerSessions.current;
    sess.ended = true;
    sess.endTick = currentTick;
    sess.duration = currentTick - sess.startTick;

    // Update longest session
    var habits = state.habits[playerId];
    if (sess.duration > habits.longestSession) {
      habits.longestSession = sess.duration;
    }

    // Update daily totals — record on the day the session started
    var day = tickToDay(sess.startTick);
    var dayKey = 'day_' + day;
    habits.dailyTotals[dayKey] = (habits.dailyTotals[dayKey] || 0) + sess.duration;

    // Update weekly totals — record on the week the session started
    var week = tickToWeek(sess.startTick);
    var weekKey = 'week_' + week;
    habits.weeklyTotals[weekKey] = (habits.weeklyTotals[weekKey] || 0) + sess.duration;

    // Move to history
    playerSessions.history.push(sess);
    playerSessions.current = null;

    // Generate break suggestion if played long
    var breakSuggestion = null;
    var durationMins = Math.floor(sess.duration / TICKS_PER_MINUTE);
    if (durationMins >= 60) {
      breakSuggestion = 'You played for ' + durationMins + ' minutes. A restful break will earn you a Spark bonus on your next session!';
    }

    // Auto journal entry
    var entry = {
      playerId: playerId,
      tick: currentTick,
      day: tickToDay(sess.startTick),
      type: 'session_end',
      durationTicks: sess.duration,
      durationMinutes: durationMins,
      activitiesUsed: Object.keys(sess.activitiesUsed).length,
      message: 'Completed a ' + durationMins + '-minute adventure across ZION.'
    };
    state.journal.push(entry);

    return {
      success: true,
      sessionId: sess.sessionId,
      duration: sess.duration,
      durationMinutes: durationMins,
      breakSuggestion: breakSuggestion
    };
  }

  // ============================================================================
  // BREAK THRESHOLD CHECKING
  // ============================================================================

  function checkBreakThreshold(state, playerId, currentTick) {
    if (!state || !playerId) return null;
    ensurePlayer(state, playerId);

    var playerSessions = state.sessions[playerId];
    if (!playerSessions.current || playerSessions.current.ended) return null;

    var sess = playerSessions.current;
    var elapsed = currentTick - sess.startTick - sess.totalAwayTicks;
    var triggered = null;

    for (var i = BREAK_THRESHOLDS.length - 1; i >= 0; i--) {
      var threshold = BREAK_THRESHOLDS[i];
      if (elapsed >= threshold.ticks) {
        // Only trigger each threshold once per session
        if (sess.thresholdsTriggered.indexOf(threshold.id) === -1) {
          sess.thresholdsTriggered.push(threshold.id);
          triggered = {
            threshold: threshold.id,
            label: threshold.label,
            message: threshold.message,
            elapsed: elapsed,
            elapsedMinutes: Math.floor(elapsed / TICKS_PER_MINUTE)
          };
        }
        break;
      }
    }

    return triggered;
  }

  // ============================================================================
  // AWAY MODE
  // ============================================================================

  function enterAwayMode(state, playerId, currentTick) {
    if (!state || !playerId) return { success: false, reason: 'invalid_args' };
    ensurePlayer(state, playerId);

    var playerSessions = state.sessions[playerId];
    if (!playerSessions.current || playerSessions.current.ended) {
      return { success: false, reason: 'no_active_session' };
    }

    var sess = playerSessions.current;
    if (sess.awayMode) {
      return { success: false, reason: 'already_away' };
    }

    sess.awayMode = true;
    sess.awayStartTick = currentTick;

    return { success: true };
  }

  function exitAwayMode(state, playerId, currentTick) {
    if (!state || !playerId) return { success: false, reason: 'invalid_args' };
    ensurePlayer(state, playerId);

    var playerSessions = state.sessions[playerId];
    if (!playerSessions.current || playerSessions.current.ended) {
      return { success: false, reason: 'no_active_session' };
    }

    var sess = playerSessions.current;
    if (!sess.awayMode) {
      return { success: false, reason: 'not_away' };
    }

    var awayDuration = currentTick - sess.awayStartTick;
    sess.totalAwayTicks += awayDuration;
    sess.awayMode = false;

    // Record break
    var breakRecord = {
      startTick: sess.awayStartTick,
      endTick: currentTick,
      durationTicks: awayDuration,
      durationMinutes: Math.floor(awayDuration / TICKS_PER_MINUTE)
    };
    sess.breaks.push(breakRecord);
    sess.awayStartTick = null;

    // Increment break count in habits
    var habits = state.habits[playerId];
    habits.breakCount += 1;
    habits.breakHistory.push(breakRecord);

    // Determine rest bonus
    var restBonus = null;
    for (var i = REST_BONUSES.length - 1; i >= 0; i--) {
      if (awayDuration >= REST_BONUSES[i].minBreakTicks) {
        restBonus = REST_BONUSES[i];
        break;
      }
    }

    // Store rest bonus on session
    if (restBonus) {
      sess.currentRestBonus = restBonus.sparkMultiplier;
      sess.currentRestBonusId = restBonus.id;
    } else {
      sess.currentRestBonus = 1.0;
      sess.currentRestBonusId = null;
    }

    return {
      success: true,
      awayDuration: awayDuration,
      awayMinutes: Math.floor(awayDuration / TICKS_PER_MINUTE),
      restBonus: restBonus ? { id: restBonus.id, multiplier: restBonus.sparkMultiplier, label: restBonus.label } : null
    };
  }

  // ============================================================================
  // ACTIVITY TRACKING
  // ============================================================================

  function logActivity(state, playerId, activityType, currentTick) {
    if (!state || !playerId || !activityType) return { success: false, reason: 'invalid_args' };
    ensurePlayer(state, playerId);

    var log = state.activityLog[playerId];
    log.types[activityType] = (log.types[activityType] || 0) + 1;
    log.lastActivity = currentTick;

    // Also track in current session
    var playerSessions = state.sessions[playerId];
    if (playerSessions.current && !playerSessions.current.ended) {
      var sess = playerSessions.current;
      sess.activitiesUsed[activityType] = (sess.activitiesUsed[activityType] || 0) + 1;
    }

    return { success: true, activityType: activityType, totalCount: log.types[activityType] };
  }

  // ============================================================================
  // SESSION INFO
  // ============================================================================

  function getSessionInfo(state, playerId) {
    if (!state || !playerId) return null;
    ensurePlayer(state, playerId);

    var playerSessions = state.sessions[playerId];
    var sess = playerSessions.current;

    if (!sess || sess.ended) {
      return { active: false, sessionId: null, startTick: null, duration: 0, awayMode: false };
    }

    return {
      active: true,
      sessionId: sess.sessionId,
      startTick: sess.startTick,
      duration: sess.duration,
      awayMode: sess.awayMode,
      awayStartTick: sess.awayStartTick,
      totalAwayTicks: sess.totalAwayTicks,
      breaksCount: sess.breaks.length,
      activitiesUsed: Object.keys(sess.activitiesUsed).length,
      thresholdsTriggered: sess.thresholdsTriggered.slice()
    };
  }

  // ============================================================================
  // PLAY HABITS
  // ============================================================================

  function getPlayHabits(state, playerId) {
    if (!state || !playerId) return null;
    ensurePlayer(state, playerId);

    var habits = state.habits[playerId];
    var playerSessions = state.sessions[playerId];
    var history = playerSessions.history;

    // Daily average across all days recorded
    var dayKeys = Object.keys(habits.dailyTotals);
    var totalTicks = 0;
    for (var i = 0; i < dayKeys.length; i++) {
      totalTicks += habits.dailyTotals[dayKeys[i]];
    }
    var dailyAvgTicks = dayKeys.length > 0 ? Math.floor(totalTicks / dayKeys.length) : 0;
    var dailyAvgMinutes = Math.floor(dailyAvgTicks / TICKS_PER_MINUTE);

    // Weekly total (most recent week)
    var weekKeys = Object.keys(habits.weeklyTotals);
    var weeklyTotalTicks = 0;
    if (weekKeys.length > 0) {
      weekKeys.sort();
      weeklyTotalTicks = habits.weeklyTotals[weekKeys[weekKeys.length - 1]];
    }
    var weeklyTotalMinutes = Math.floor(weeklyTotalTicks / TICKS_PER_MINUTE);

    return {
      dailyAverageTicks: dailyAvgTicks,
      dailyAverageMinutes: dailyAvgMinutes,
      weeklyTotalTicks: weeklyTotalTicks,
      weeklyTotalMinutes: weeklyTotalMinutes,
      longestSessionTicks: habits.longestSession,
      longestSessionMinutes: Math.floor(habits.longestSession / TICKS_PER_MINUTE),
      breakCount: habits.breakCount,
      totalSessions: history.length,
      daysActive: dayKeys.length
    };
  }

  // ============================================================================
  // WELLNESS SCORE
  // ============================================================================

  function getWellnessScore(state, playerId) {
    if (!state || !playerId) return 0;
    ensurePlayer(state, playerId);

    var habits = state.habits[playerId];
    var playerSessions = state.sessions[playerId];
    var history = playerSessions.history;

    if (history.length === 0) return 50; // baseline

    var score = 50;

    // Break frequency bonus (up to +20)
    var breakRate = habits.breakCount / Math.max(history.length, 1);
    if (breakRate >= 2) score += 20;
    else if (breakRate >= 1) score += 12;
    else if (breakRate >= 0.5) score += 6;

    // Activity variety bonus (up to +15)
    var log = state.activityLog[playerId];
    var varietyCount = Object.keys(log.types).length;
    if (varietyCount >= 8) score += 15;
    else if (varietyCount >= 5) score += 10;
    else if (varietyCount >= 3) score += 5;

    // Session length penalty — very long sessions reduce wellness (but kindly capped)
    var avgDurationTicks = 0;
    if (history.length > 0) {
      var totalDur = 0;
      for (var i = 0; i < history.length; i++) totalDur += history[i].duration;
      avgDurationTicks = totalDur / history.length;
    }
    var avgDurationMins = Math.floor(avgDurationTicks / TICKS_PER_MINUTE);
    if (avgDurationMins > 240) score -= 15;
    else if (avgDurationMins > 180) score -= 8;
    else if (avgDurationMins > 120) score -= 3;

    // Streak consistency bonus (playing regularly, up to +15)
    var dayKeys = Object.keys(habits.dailyTotals);
    if (dayKeys.length >= 7) score += 15;
    else if (dayKeys.length >= 4) score += 8;
    else if (dayKeys.length >= 2) score += 3;

    // Clamp to 0-100
    if (score < 0) score = 0;
    if (score > 100) score = 100;

    state.wellnessScores[playerId].score = score;
    state.wellnessScores[playerId].lastCalculated = Date.now ? Date.now() : 0;

    return score;
  }

  // ============================================================================
  // BREAK HISTORY
  // ============================================================================

  function getBreakHistory(state, playerId) {
    if (!state || !playerId) return [];
    ensurePlayer(state, playerId);

    var habits = state.habits[playerId];
    return habits.breakHistory.slice();
  }

  // ============================================================================
  // WELLNESS JOURNAL
  // ============================================================================

  function getWellnessJournal(state, playerId, count) {
    if (!state || !playerId) return [];
    var n = (typeof count === 'number' && count > 0) ? count : 10;

    var entries = state.journal.filter(function(e) {
      return e.playerId === playerId;
    });

    // Return most recent n entries
    return entries.slice(-n);
  }

  function addJournalEntry(state, playerId, entry, currentTick) {
    if (!state || !playerId || !entry) return { success: false, reason: 'invalid_args' };
    ensurePlayer(state, playerId);

    var journalEntry = {
      playerId: playerId,
      tick: currentTick || 0,
      day: tickToDay(currentTick || 0),
      type: 'manual',
      message: typeof entry === 'string' ? entry : (entry.message || ''),
      data: typeof entry === 'object' ? entry : null
    };

    state.journal.push(journalEntry);
    return { success: true, entryIndex: state.journal.length - 1 };
  }

  // ============================================================================
  // ACTIVITY VARIETY
  // ============================================================================

  function getActivityVariety(state, playerId) {
    if (!state || !playerId) return { types: [], count: 0, sessionTypes: [] };
    ensurePlayer(state, playerId);

    var log = state.activityLog[playerId];
    var allTypes = Object.keys(log.types);

    var playerSessions = state.sessions[playerId];
    var sessionTypes = [];
    if (playerSessions.current && !playerSessions.current.ended) {
      sessionTypes = Object.keys(playerSessions.current.activitiesUsed);
    }

    return {
      types: allTypes,
      count: allTypes.length,
      sessionTypes: sessionTypes,
      sessionCount: sessionTypes.length,
      activityCounts: JSON.parse(JSON.stringify(log.types))
    };
  }

  // ============================================================================
  // REST BONUS
  // ============================================================================

  function getRestBonus(state, playerId) {
    if (!state || !playerId) return 1.0;
    ensurePlayer(state, playerId);

    var playerSessions = state.sessions[playerId];
    var sess = playerSessions.current;
    if (!sess || sess.ended) return 1.0;

    return sess.currentRestBonus || 1.0;
  }

  // ============================================================================
  // SESSION HISTORY
  // ============================================================================

  function getSessionHistory(state, playerId, count) {
    if (!state || !playerId) return [];
    ensurePlayer(state, playerId);

    var n = (typeof count === 'number' && count > 0) ? count : 10;
    var history = state.sessions[playerId].history;
    return history.slice(-n);
  }

  // ============================================================================
  // DAILY STATS
  // ============================================================================

  function getDailyStats(state, playerId, day) {
    if (!state || !playerId) return null;
    ensurePlayer(state, playerId);

    var habits = state.habits[playerId];
    var dayKey = 'day_' + day;
    var ticks = habits.dailyTotals[dayKey] || 0;

    // Count sessions on this day
    var history = state.sessions[playerId].history;
    var daySessions = [];
    for (var i = 0; i < history.length; i++) {
      if (tickToDay(history[i].startTick) === day) {
        daySessions.push(history[i]);
      }
    }

    // Count breaks on this day
    var dayBreaks = [];
    var allBreaks = habits.breakHistory;
    for (var j = 0; j < allBreaks.length; j++) {
      if (tickToDay(allBreaks[j].startTick) === day) {
        dayBreaks.push(allBreaks[j]);
      }
    }

    return {
      day: day,
      dayKey: dayKey,
      totalTicks: ticks,
      totalMinutes: Math.floor(ticks / TICKS_PER_MINUTE),
      sessionCount: daySessions.length,
      breakCount: dayBreaks.length,
      sessions: daySessions,
      breaks: dayBreaks
    };
  }

  // ============================================================================
  // WELLNESS LEADERBOARD
  // ============================================================================

  function getWellnessLeaderboard(state, count) {
    if (!state) return [];
    var n = (typeof count === 'number' && count > 0) ? count : 10;

    var playerIds = Object.keys(state.wellnessScores);
    var entries = [];

    for (var i = 0; i < playerIds.length; i++) {
      var pid = playerIds[i];
      var score = getWellnessScore(state, pid);
      entries.push({ playerId: pid, score: score });
    }

    entries.sort(function(a, b) { return b.score - a.score; });
    return entries.slice(0, n);
  }

  // ============================================================================
  // EXPORTS
  // ============================================================================

  exports.BREAK_THRESHOLDS = BREAK_THRESHOLDS;
  exports.REST_BONUSES = REST_BONUSES;
  exports.ACTIVITY_TYPES = ACTIVITY_TYPES;
  exports.TICKS_PER_MINUTE = TICKS_PER_MINUTE;
  exports.createState = createState;
  exports.startSession = startSession;
  exports.endSession = endSession;
  exports.checkBreakThreshold = checkBreakThreshold;
  exports.enterAwayMode = enterAwayMode;
  exports.exitAwayMode = exitAwayMode;
  exports.logActivity = logActivity;
  exports.getSessionInfo = getSessionInfo;
  exports.getPlayHabits = getPlayHabits;
  exports.getWellnessScore = getWellnessScore;
  exports.getBreakHistory = getBreakHistory;
  exports.getWellnessJournal = getWellnessJournal;
  exports.addJournalEntry = addJournalEntry;
  exports.getActivityVariety = getActivityVariety;
  exports.getRestBonus = getRestBonus;
  exports.getSessionHistory = getSessionHistory;
  exports.getDailyStats = getDailyStats;
  exports.getWellnessLeaderboard = getWellnessLeaderboard;

})(typeof module !== 'undefined' ? module.exports : (window.PlayerWellness = {}));
