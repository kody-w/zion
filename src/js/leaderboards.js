// leaderboards.js
/**
 * ZION Leaderboard System
 * Comprehensive rankings across all game dimensions: wealth, quests, exploration, guilds, reputation.
 * Works with existing data structures — no modifications to other modules.
 */

(function(exports) {
  'use strict';

  // =========================================================================
  // CONSTANTS
  // =========================================================================

  var CATEGORIES = {
    WEALTH: 'wealth',
    QUESTS: 'quests',
    EXPLORATION: 'exploration',
    GUILDS: 'guilds',
    REPUTATION: 'reputation',
    COMBINED: 'combined'
  };

  var TIME_PERIODS = {
    ALL_TIME: 'all_time',
    DAILY: 'daily',
    WEEKLY: 'weekly'
  };

  var DEFAULT_DISPLAY_COUNTS = [10, 25, 50];

  // Weights for combined score (must sum to 1.0)
  var COMBINED_WEIGHTS = {
    wealth: 0.25,
    quests: 0.25,
    exploration: 0.20,
    reputation: 0.20,
    guilds: 0.10
  };

  // Time boundaries in milliseconds
  var MS_PER_DAY = 86400000;
  var MS_PER_WEEK = 604800000;

  // Reputation tier numeric values for scoring
  var TIER_VALUES = {
    'Newcomer': 0,
    'Trusted': 100,
    'Respected': 500,
    'Honored': 1500,
    'Elder': 5000
  };

  // =========================================================================
  // INTERNAL HELPERS
  // =========================================================================

  /**
   * Get current timestamp — injectable for testing
   */
  var _nowFn = function() { return Date.now(); };

  function _setNowFn(fn) {
    _nowFn = fn;
  }

  function _now() {
    return _nowFn();
  }

  /**
   * Clamp a number to [min, max]
   */
  function _clamp(val, min, max) {
    if (val < min) return min;
    if (val > max) return max;
    return val;
  }

  /**
   * Safe integer — returns 0 for non-finite / NaN
   */
  function _safeInt(n) {
    if (typeof n !== 'number' || !isFinite(n) || isNaN(n)) return 0;
    return Math.floor(n);
  }

  /**
   * Build a time cutoff given a period string
   * @param {string} period - 'all_time' | 'daily' | 'weekly'
   * @returns {number} UNIX milliseconds cutoff (0 = no cutoff)
   */
  function _timeCutoff(period) {
    var now = _now();
    if (period === TIME_PERIODS.DAILY) return now - MS_PER_DAY;
    if (period === TIME_PERIODS.WEEKLY) return now - MS_PER_WEEK;
    return 0; // all_time — no cutoff
  }

  /**
   * Normalise an array of {id, score} objects to [0, 100] range.
   * Returns a new array with normalised scores added as normScore.
   */
  function _normalise(entries) {
    if (!entries || entries.length === 0) return [];
    var max = 0;
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].score > max) max = entries[i].score;
    }
    if (max === 0) {
      return entries.map(function(e) {
        return { id: e.id, score: e.score, normScore: 0 };
      });
    }
    return entries.map(function(e) {
      return { id: e.id, score: e.score, normScore: (e.score / max) * 100 };
    });
  }

  /**
   * Sort entries descending by score, attach rank property.
   * Ties receive the same rank; next rank skips accordingly.
   */
  function _rankEntries(entries) {
    if (!entries || entries.length === 0) return [];
    var sorted = entries.slice().sort(function(a, b) { return b.score - a.score; });
    var rank = 1;
    for (var i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i].score < sorted[i - 1].score) {
        rank = i + 1;
      }
      sorted[i].rank = rank;
    }
    return sorted;
  }

  /**
   * Validate an id string
   */
  function _validId(id) {
    return typeof id === 'string' && id.length > 0;
  }

  // =========================================================================
  // WEALTH RANKINGS
  // =========================================================================

  /**
   * Build wealth rankings from a ledger or balances object.
   *
   * Accepts either:
   *   - a full ledger: { balances: { playerId: number, ... }, transactions: [] }
   *   - a plain object map: { playerId: number, ... }
   *
   * System accounts (TREASURY, SYSTEM) are always excluded.
   *
   * @param {Object} economyData - Ledger or plain balance map
   * @param {Object} [options] - { period, excludeIds }
   * @returns {Array} Ranked entries: [{rank, id, name, score, label}]
   */
  function getWealthRankings(economyData, options) {
    options = options || {};
    var period = options.period || TIME_PERIODS.ALL_TIME;
    var exclude = options.excludeIds || [];
    var SYSTEM_IDS = ['TREASURY', 'SYSTEM'];

    if (!economyData) return [];

    // Resolve balance map
    var balances = economyData.balances || economyData;
    if (typeof balances !== 'object') return [];

    var entries = [];
    var keys = Object.keys(balances);
    for (var i = 0; i < keys.length; i++) {
      var pid = keys[i];
      if (SYSTEM_IDS.indexOf(pid) !== -1) continue;
      if (exclude.indexOf(pid) !== -1) continue;
      var balance = _safeInt(balances[pid]);
      if (balance < 0) balance = 0;
      entries.push({ id: pid, score: balance, name: pid, label: balance + ' Spark' });
    }

    // For time-period filtering, filter transactions if available
    if (period !== TIME_PERIODS.ALL_TIME && economyData.transactions) {
      var cutoff = _timeCutoff(period);
      var periodEarnings = {};
      var txns = economyData.transactions;
      for (var t = 0; t < txns.length; t++) {
        var tx = txns[t];
        if (tx.ts < cutoff) continue;
        if (tx.type !== 'earn') continue;
        if (SYSTEM_IDS.indexOf(tx.to) !== -1) continue;
        if (!periodEarnings[tx.to]) periodEarnings[tx.to] = 0;
        periodEarnings[tx.to] += _safeInt(tx.amount);
      }
      entries = [];
      var earnKeys = Object.keys(periodEarnings);
      for (var e = 0; e < earnKeys.length; e++) {
        var epid = earnKeys[e];
        if (exclude.indexOf(epid) !== -1) continue;
        var earned = periodEarnings[epid];
        entries.push({ id: epid, score: earned, name: epid, label: earned + ' Spark earned' });
      }
    }

    return _rankEntries(entries);
  }

  // =========================================================================
  // QUEST RANKINGS
  // =========================================================================

  /**
   * Build quest completion rankings.
   *
   * Accepts:
   *   - A map: { playerId: { turnedInQuests: [], completedQuests: [] } }
   *   - Or an array: [{ playerId, turnedInQuests: [], completedQuests: [] }]
   *
   * @param {Object|Array} questData
   * @param {Object} [options] - { period, completedOnly }
   * @returns {Array} Ranked entries
   */
  function getQuestRankings(questData, options) {
    options = options || {};

    if (!questData) return [];

    var entries = [];

    function _processPlayer(pid, pData) {
      if (!_validId(pid)) return;
      var turned = (pData.turnedInQuests || []).length;
      var completed = (pData.completedQuests || []).length;
      // Use max of the two — some implementations use one or the other
      var count = Math.max(turned, completed);
      entries.push({ id: pid, score: count, name: pid, label: count + ' quests' });
    }

    if (Array.isArray(questData)) {
      for (var i = 0; i < questData.length; i++) {
        var item = questData[i];
        _processPlayer(item.playerId || item.id, item);
      }
    } else if (typeof questData === 'object') {
      var keys = Object.keys(questData);
      for (var k = 0; k < keys.length; k++) {
        _processPlayer(keys[k], questData[keys[k]]);
      }
    }

    return _rankEntries(entries);
  }

  // =========================================================================
  // EXPLORATION RANKINGS
  // =========================================================================

  /**
   * Build exploration discovery rankings.
   *
   * Accepts:
   *   - An array of discovery objects: [{ discoverer, type, rarity, ts }]
   *   - Or a map: { playerId: [discoveries] }
   *
   * Scoring: 1 point per discovery + bonus for rarity
   *   rarity >= 0.9 (secret)  = 4 pts
   *   rarity >= 0.7 (artifact) = 3 pts
   *   rarity >= 0.5            = 2 pts
   *   rarity  < 0.5            = 1 pt
   *
   * @param {Array|Object} discoveryData
   * @param {Object} [options] - { period, rarityBonus }
   * @returns {Array} Ranked entries
   */
  function getExplorationRankings(discoveryData, options) {
    options = options || {};
    var period = options.period || TIME_PERIODS.ALL_TIME;
    var cutoff = _timeCutoff(period);
    var useRarityBonus = options.rarityBonus !== false; // default true

    if (!discoveryData) return [];

    var scores = {};

    function _addDiscovery(pid, discovery) {
      if (!_validId(pid)) return;
      // Time filter
      if (cutoff > 0 && discovery.ts && discovery.ts < cutoff) return;
      var rarity = typeof discovery.rarity === 'number' ? discovery.rarity : 0.3;
      var points = 1;
      if (useRarityBonus) {
        if (rarity >= 0.9) points = 4;
        else if (rarity >= 0.7) points = 3;
        else if (rarity >= 0.5) points = 2;
      }
      if (!scores[pid]) scores[pid] = 0;
      scores[pid] += points;
    }

    if (Array.isArray(discoveryData)) {
      for (var i = 0; i < discoveryData.length; i++) {
        var d = discoveryData[i];
        _addDiscovery(d.discoverer || d.playerId || d.id, d);
      }
    } else if (typeof discoveryData === 'object') {
      var keys = Object.keys(discoveryData);
      for (var k = 0; k < keys.length; k++) {
        var pid = keys[k];
        var dList = discoveryData[pid];
        if (Array.isArray(dList)) {
          for (var j = 0; j < dList.length; j++) {
            _addDiscovery(pid, dList[j]);
          }
        }
      }
    }

    var entries = [];
    var scoreKeys = Object.keys(scores);
    for (var s = 0; s < scoreKeys.length; s++) {
      var id = scoreKeys[s];
      var sc = scores[id];
      entries.push({ id: id, score: sc, name: id, label: sc + ' pts' });
    }

    return _rankEntries(entries);
  }

  // =========================================================================
  // GUILD RANKINGS
  // =========================================================================

  /**
   * Build guild rankings by XP/level.
   *
   * Accepts:
   *   - Array of guild objects: [{ id, name, xp, level, members, treasury }]
   *   - Or { guilds: [...] }
   *
   * Score = (level * 1000) + xp for stable ordering that respects level brackets
   *
   * @param {Array|Object} guildData
   * @param {Object} [options] - { metric: 'xp'|'members'|'treasury'|'composite' }
   * @returns {Array} Ranked guild entries
   */
  function getGuildRankings(guildData, options) {
    options = options || {};
    var metric = options.metric || 'composite';

    if (!guildData) return [];

    var guilds = Array.isArray(guildData) ? guildData : (guildData.guilds || []);
    if (!Array.isArray(guilds)) return [];

    var entries = [];
    for (var i = 0; i < guilds.length; i++) {
      var g = guilds[i];
      if (!g || !g.id) continue;
      var level = _safeInt(g.level) || 1;
      var xp = _safeInt(g.xp);
      var memberCount = Array.isArray(g.members) ? g.members.length : _safeInt(g.members);
      var treasury = _safeInt(g.treasury);

      var score;
      switch (metric) {
        case 'xp':
          score = xp;
          break;
        case 'members':
          score = memberCount;
          break;
        case 'treasury':
          score = treasury;
          break;
        default: // composite
          score = (level * 1000) + xp;
      }

      entries.push({
        id: g.id,
        score: score,
        name: g.name || g.id,
        tag: g.tag || '',
        level: level,
        xp: xp,
        memberCount: memberCount,
        label: 'Level ' + level + ' · ' + xp + ' XP'
      });
    }

    return _rankEntries(entries);
  }

  // =========================================================================
  // REPUTATION RANKINGS
  // =========================================================================

  /**
   * Build reputation rankings.
   *
   * Accepts:
   *   - A map: { playerId: { score, tier, history } }
   *   - Or an array: [{ id/playerId, score, tier }]
   *
   * @param {Object|Array} socialData
   * @param {Object} [options] - { period }
   * @returns {Array} Ranked entries
   */
  function getReputationRankings(socialData, options) {
    options = options || {};
    var period = options.period || TIME_PERIODS.ALL_TIME;
    var cutoff = _timeCutoff(period);

    if (!socialData) return [];

    var entries = [];

    function _processRep(pid, repData) {
      if (!_validId(pid)) return;
      var score;
      if (cutoff > 0 && repData.history) {
        // Sum reputation gains since cutoff
        score = 0;
        var hist = repData.history;
        for (var h = 0; h < hist.length; h++) {
          var entry = hist[h];
          if (entry.timestamp && entry.timestamp >= cutoff && entry.change > 0) {
            score += entry.change;
          }
        }
      } else {
        score = _safeInt(repData.score);
      }
      var tier = repData.tier || 'Newcomer';
      entries.push({
        id: pid,
        score: score,
        name: pid,
        tier: tier,
        label: tier + ' (' + score + ')'
      });
    }

    if (Array.isArray(socialData)) {
      for (var i = 0; i < socialData.length; i++) {
        var item = socialData[i];
        _processRep(item.playerId || item.id, item);
      }
    } else if (typeof socialData === 'object') {
      var keys = Object.keys(socialData);
      for (var k = 0; k < keys.length; k++) {
        _processRep(keys[k], socialData[keys[k]]);
      }
    }

    return _rankEntries(entries);
  }

  // =========================================================================
  // COMBINED / COMPOSITE RANKINGS
  // =========================================================================

  /**
   * Build a weighted composite ranking across all categories.
   *
   * @param {Object} data - { economy, quests, discoveries, guilds, reputation }
   * @param {Object} [options] - { period, weights }
   * @returns {Array} Ranked combined entries
   */
  function getCombinedRankings(data, options) {
    options = options || {};
    data = data || {};
    var period = options.period || TIME_PERIODS.ALL_TIME;
    var weights = options.weights || COMBINED_WEIGHTS;

    // Build individual rankings
    var wealthRaw = getWealthRankings(data.economy || {}, { period: period });
    var questsRaw = getQuestRankings(data.quests || {}, { period: period });
    var exploreRaw = getExplorationRankings(data.discoveries || [], { period: period });
    var repRaw = getReputationRankings(data.reputation || {}, { period: period });

    // Normalise each category
    var wealthNorm = _normalise(wealthRaw);
    var questsNorm = _normalise(questsRaw);
    var exploreNorm = _normalise(exploreRaw);
    var repNorm = _normalise(repRaw);

    // Collect all player IDs
    var allIds = {};
    function _addIds(arr) {
      for (var i = 0; i < arr.length; i++) allIds[arr[i].id] = true;
    }
    _addIds(wealthNorm);
    _addIds(questsNorm);
    _addIds(exploreNorm);
    _addIds(repNorm);

    // Build lookup maps
    function _buildMap(arr) {
      var m = {};
      for (var i = 0; i < arr.length; i++) m[arr[i].id] = arr[i].normScore || 0;
      return m;
    }

    var wMap = _buildMap(wealthNorm);
    var qMap = _buildMap(questsNorm);
    var eMap = _buildMap(exploreNorm);
    var rMap = _buildMap(repNorm);

    var w = {
      wealth: weights.wealth || COMBINED_WEIGHTS.wealth,
      quests: weights.quests || COMBINED_WEIGHTS.quests,
      exploration: weights.exploration || COMBINED_WEIGHTS.exploration,
      reputation: weights.reputation || COMBINED_WEIGHTS.reputation
    };

    var entries = [];
    var ids = Object.keys(allIds);
    for (var i = 0; i < ids.length; i++) {
      var pid = ids[i];
      var combined =
        (wMap[pid] || 0) * w.wealth +
        (qMap[pid] || 0) * w.quests +
        (eMap[pid] || 0) * w.exploration +
        (rMap[pid] || 0) * w.reputation;

      entries.push({
        id: pid,
        score: Math.round(combined * 10) / 10, // one decimal place
        name: pid,
        breakdown: {
          wealth: Math.round((wMap[pid] || 0) * 10) / 10,
          quests: Math.round((qMap[pid] || 0) * 10) / 10,
          exploration: Math.round((eMap[pid] || 0) * 10) / 10,
          reputation: Math.round((rMap[pid] || 0) * 10) / 10
        },
        label: Math.round(combined * 10) / 10 + ' pts'
      });
    }

    return _rankEntries(entries);
  }

  // =========================================================================
  // SINGLE PLAYER RANK LOOKUP
  // =========================================================================

  /**
   * Get a single player's rank in a given category.
   *
   * @param {string} playerId - The player ID to look up
   * @param {string} category - One of CATEGORIES values
   * @param {Object} data - Category-specific data (same as the ranking functions)
   * @param {Object} [options] - Passed through to ranking function
   * @returns {Object} { rank, score, total, label, category } or null if not found
   */
  function getPlayerRank(playerId, category, data, options) {
    if (!_validId(playerId)) return null;

    var rankings = [];

    switch (category) {
      case CATEGORIES.WEALTH:
        rankings = getWealthRankings(data, options);
        break;
      case CATEGORIES.QUESTS:
        rankings = getQuestRankings(data, options);
        break;
      case CATEGORIES.EXPLORATION:
        rankings = getExplorationRankings(data, options);
        break;
      case CATEGORIES.GUILDS:
        rankings = getGuildRankings(data, options);
        break;
      case CATEGORIES.REPUTATION:
        rankings = getReputationRankings(data, options);
        break;
      case CATEGORIES.COMBINED:
        rankings = getCombinedRankings(data, options);
        break;
      default:
        return null;
    }

    for (var i = 0; i < rankings.length; i++) {
      if (rankings[i].id === playerId) {
        return {
          rank: rankings[i].rank,
          score: rankings[i].score,
          total: rankings.length,
          label: rankings[i].label || '',
          category: category,
          entry: rankings[i]
        };
      }
    }

    // Player has no data in this category
    return {
      rank: null,
      score: 0,
      total: rankings.length,
      label: 'Unranked',
      category: category,
      entry: null
    };
  }

  // =========================================================================
  // FORMAT / DISPLAY
  // =========================================================================

  /**
   * Format a ranked array for display.
   *
   * @param {Array} rankings - Output of any ranking function
   * @param {Object} [options]
   *   - count {number} max entries to show (default 10)
   *   - highlightId {string} player ID to highlight
   *   - showBreakdown {boolean} include breakdown for combined (default false)
   *   - columns {Array} field names to include
   * @returns {Array} Formatted display rows
   */
  function formatLeaderboard(rankings, options) {
    options = options || {};
    var count = options.count || 10;
    var highlightId = options.highlightId || null;
    var showBreakdown = !!options.showBreakdown;

    if (!rankings || !Array.isArray(rankings)) return [];

    // Validate count against allowed sizes
    var allowed = options.allowedCounts || DEFAULT_DISPLAY_COUNTS;
    if (allowed.indexOf(count) === -1) {
      // Snap to nearest allowed value
      count = allowed.reduce(function(prev, curr) {
        return Math.abs(curr - count) < Math.abs(prev - count) ? curr : prev;
      }, allowed[0]);
    }

    var slice = rankings.slice(0, count);

    return slice.map(function(entry, idx) {
      var row = {
        rank: entry.rank,
        id: entry.id,
        name: entry.name || entry.id,
        score: entry.score,
        label: entry.label || String(entry.score),
        isHighlighted: highlightId ? entry.id === highlightId : false
      };

      // Optional extra fields
      if (entry.tier) row.tier = entry.tier;
      if (entry.tag) row.tag = entry.tag;
      if (entry.level !== undefined) row.level = entry.level;
      if (entry.memberCount !== undefined) row.memberCount = entry.memberCount;

      if (showBreakdown && entry.breakdown) {
        row.breakdown = entry.breakdown;
      }

      return row;
    });
  }

  // =========================================================================
  // TIME PERIOD HELPERS
  // =========================================================================

  /**
   * Get the label for a time period.
   * @param {string} period
   * @returns {string}
   */
  function getTimePeriodLabel(period) {
    switch (period) {
      case TIME_PERIODS.DAILY: return 'Today';
      case TIME_PERIODS.WEEKLY: return 'This Week';
      default: return 'All Time';
    }
  }

  /**
   * Get all available time periods.
   * @returns {Array} [{ id, label }]
   */
  function getTimePeriods() {
    return [
      { id: TIME_PERIODS.ALL_TIME, label: 'All Time' },
      { id: TIME_PERIODS.DAILY, label: 'Today' },
      { id: TIME_PERIODS.WEEKLY, label: 'This Week' }
    ];
  }

  // =========================================================================
  // FULL BOARD SNAPSHOT
  // =========================================================================

  /**
   * Build a complete leaderboard snapshot for all categories.
   *
   * @param {Object} gameData - { economy, quests, discoveries, guilds, reputation }
   * @param {Object} [options] - { period, count }
   * @returns {Object} { wealth, quests, exploration, guilds, reputation, combined, meta }
   */
  function buildSnapshot(gameData, options) {
    options = options || {};
    gameData = gameData || {};
    var period = options.period || TIME_PERIODS.ALL_TIME;
    var count = options.count || 10;
    var periodOpts = { period: period };

    var wealthRaw = getWealthRankings(gameData.economy || {}, periodOpts);
    var questsRaw = getQuestRankings(gameData.quests || {}, periodOpts);
    var exploreRaw = getExplorationRankings(gameData.discoveries || [], periodOpts);
    var guildsRaw = getGuildRankings(gameData.guilds || [], periodOpts);
    var repRaw = getReputationRankings(gameData.reputation || {}, periodOpts);
    var combinedRaw = getCombinedRankings(gameData, periodOpts);

    var fmtOpts = { count: count, allowedCounts: [count] };

    return {
      wealth: formatLeaderboard(wealthRaw, fmtOpts),
      quests: formatLeaderboard(questsRaw, fmtOpts),
      exploration: formatLeaderboard(exploreRaw, fmtOpts),
      guilds: formatLeaderboard(guildsRaw, fmtOpts),
      reputation: formatLeaderboard(repRaw, fmtOpts),
      combined: formatLeaderboard(combinedRaw, Object.assign({}, fmtOpts, { showBreakdown: true })),
      meta: {
        period: period,
        periodLabel: getTimePeriodLabel(period),
        count: count,
        generatedAt: _now()
      }
    };
  }

  // =========================================================================
  // EXPORTS
  // =========================================================================

  exports.CATEGORIES = CATEGORIES;
  exports.TIME_PERIODS = TIME_PERIODS;
  exports.COMBINED_WEIGHTS = COMBINED_WEIGHTS;

  exports.getWealthRankings = getWealthRankings;
  exports.getQuestRankings = getQuestRankings;
  exports.getExplorationRankings = getExplorationRankings;
  exports.getGuildRankings = getGuildRankings;
  exports.getReputationRankings = getReputationRankings;
  exports.getCombinedRankings = getCombinedRankings;

  exports.getPlayerRank = getPlayerRank;
  exports.formatLeaderboard = formatLeaderboard;

  exports.getTimePeriodLabel = getTimePeriodLabel;
  exports.getTimePeriods = getTimePeriods;
  exports.buildSnapshot = buildSnapshot;

  // Internal test helpers
  exports._rankEntries = _rankEntries;
  exports._normalise = _normalise;
  exports._timeCutoff = _timeCutoff;
  exports._setNowFn = _setNowFn;
  exports._clamp = _clamp;
  exports._safeInt = _safeInt;

})(typeof module !== 'undefined' ? module.exports : (window.Leaderboards = {}));
