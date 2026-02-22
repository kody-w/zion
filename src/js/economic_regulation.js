/**
 * ZION Economic Regulation Module
 * Implements UBI, progressive income tax, wealth tax, and economic health metrics
 * per Constitution §6.4 (Progressive Taxation and Universal Basic Income).
 *
 * Window name: EconomicRegulation
 */

(function(exports) {
  'use strict';

  // ---------------------------------------------------------------------------
  // SEEDED PRNG — mulberry32
  // ---------------------------------------------------------------------------

  function mulberry32(seed) {
    return function() {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // ---------------------------------------------------------------------------
  // CONSTANTS (per §6.4)
  // ---------------------------------------------------------------------------

  var BALANCE_FLOOR = 10;           // minimum balance; taxes cannot push below this
  var UBI_MIN = 1;                  // minimum UBI per player per day
  var UBI_MAX = 50;                 // maximum UBI per player per day
  var INITIAL_TREASURY = 1000;      // treasury seeded at world start
  var WEALTH_TAX_THRESHOLD = 500;   // wealth above this is subject to 2% daily
  var WEALTH_TAX_RATE = 0.02;       // 2% on balance above threshold
  var NEW_PLAYER_EXEMPT_TICKS = 500; // first 500 ticks: tax-exempt

  // ---------------------------------------------------------------------------
  // TAX_BRACKETS — 5 progressive income tax brackets per §6.4
  //   Tax applies only to NEW earnings (not existing balance).
  //   Bracket is determined by the earner's current balance before earning.
  // ---------------------------------------------------------------------------

  var TAX_BRACKETS = [
    { min: 0,    max: 49,       rate: 0.00, label: '0%'  },  // 0-49 Spark: 0%
    { min: 50,   max: 199,      rate: 0.10, label: '10%' },  // 50-199: 10%
    { min: 200,  max: 499,      rate: 0.20, label: '20%' },  // 200-499: 20%
    { min: 500,  max: 999,      rate: 0.30, label: '30%' },  // 500-999: 30%
    { min: 1000, max: Infinity, rate: 0.40, label: '40%' }   // 1000+: 40% (max)
  ];

  // ---------------------------------------------------------------------------
  // STATE FACTORY
  // ---------------------------------------------------------------------------

  /**
   * Creates a fresh economic regulation state.
   * @returns {Object} state with treasury, players, taxLog, ubiLog, dailyStats
   */
  function createState() {
    return {
      treasury: INITIAL_TREASURY,
      players: {},
      taxLog: [],
      ubiLog: [],
      dailyStats: []
    };
  }

  // ---------------------------------------------------------------------------
  // PLAYER REGISTRATION
  // ---------------------------------------------------------------------------

  /**
   * Registers a player in the economic regulation system.
   * @param {Object} state
   * @param {string} playerId
   * @param {number} balance   starting balance
   * @param {number} currentTick
   * @returns {{ success: boolean, error?: string }}
   */
  function registerPlayer(state, playerId, balance, currentTick) {
    if (!playerId || typeof playerId !== 'string') {
      return { success: false, error: 'invalid playerId' };
    }
    if (state.players[playerId]) {
      return { success: false, error: 'player already registered' };
    }
    var startingBalance = (typeof balance === 'number' && balance >= 0) ? balance : 0;
    if (startingBalance < BALANCE_FLOOR) {
      startingBalance = BALANCE_FLOOR;
    }
    state.players[playerId] = {
      id: playerId,
      balance: startingBalance,
      joinTick: typeof currentTick === 'number' ? currentTick : 0,
      totalTaxPaid: 0,
      totalUBIReceived: 0,
      totalEarnings: 0,
      lastActiveDay: 0,
      taxHistory: [],
      ubiHistory: []
    };
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // TAX BRACKET LOOKUP
  // ---------------------------------------------------------------------------

  /**
   * Returns the tax bracket applicable for a given current balance.
   * Bracket is determined by the player's balance BEFORE earning.
   * @param {number} balance  player's current balance
   * @returns {{ min, max, rate, label, bracketIndex }}
   */
  function getTaxBracket(balance) {
    if (typeof balance !== 'number' || balance < 0) {
      balance = 0;
    }
    for (var i = 0; i < TAX_BRACKETS.length; i++) {
      var b = TAX_BRACKETS[i];
      if (balance >= b.min && balance <= b.max) {
        return {
          min: b.min,
          max: b.max,
          rate: b.rate,
          label: b.label,
          bracketIndex: i
        };
      }
    }
    // Fallback to highest bracket
    var last = TAX_BRACKETS[TAX_BRACKETS.length - 1];
    return {
      min: last.min,
      max: last.max,
      rate: last.rate,
      label: last.label,
      bracketIndex: TAX_BRACKETS.length - 1
    };
  }

  // ---------------------------------------------------------------------------
  // INCOME TAX PROCESSING
  // ---------------------------------------------------------------------------

  /**
   * Process income tax on earnings for a player.
   * Tax is calculated on earnings, rounded DOWN (player-favorable).
   * Tax-exempt players (joinTick within NEW_PLAYER_EXEMPT_TICKS) pay 0%.
   * @param {Object} state
   * @param {string} playerId
   * @param {number} earnings   gross earnings amount
   * @param {number} currentTick
   * @returns {{ success, taxAmount, bracket, netEarnings, exempt }}
   */
  function processIncomeTax(state, playerId, earnings, currentTick) {
    var player = state.players[playerId];
    if (!player) {
      return { success: false, error: 'player not found' };
    }
    if (typeof earnings !== 'number' || earnings < 0) {
      return { success: false, error: 'invalid earnings amount' };
    }
    if (earnings === 0) {
      return { success: true, taxAmount: 0, bracket: getTaxBracket(player.balance), netEarnings: 0, exempt: false };
    }

    var exempt = isExempt(state, playerId, currentTick);
    var bracket = getTaxBracket(player.balance);
    var taxAmount = exempt ? 0 : Math.floor(earnings * bracket.rate);
    var netEarnings = earnings - taxAmount;

    // Apply net earnings to player balance
    player.balance += netEarnings;
    player.totalEarnings += earnings;
    player.totalTaxPaid += taxAmount;

    // Credit treasury
    if (taxAmount > 0) {
      state.treasury += taxAmount;
      var logEntry = {
        tick: currentTick,
        playerId: playerId,
        type: 'income_tax',
        grossEarnings: earnings,
        taxAmount: taxAmount,
        netEarnings: netEarnings,
        rate: bracket.rate,
        bracketIndex: bracket.bracketIndex,
        balanceBefore: player.balance - netEarnings,
        exempt: false
      };
      state.taxLog.push(logEntry);
      player.taxHistory.push(logEntry);
    }

    return {
      success: true,
      taxAmount: taxAmount,
      bracket: bracket,
      netEarnings: netEarnings,
      exempt: exempt
    };
  }

  // ---------------------------------------------------------------------------
  // WEALTH TAX
  // ---------------------------------------------------------------------------

  /**
   * Apply daily wealth tax to all players with balance > WEALTH_TAX_THRESHOLD.
   * Wealth tax = floor(2% * (balance - 500)).
   * Balance never falls below BALANCE_FLOOR.
   * @param {Object} state
   * @param {number} currentTick
   * @returns {{ totalCollected, taxed: Array }}
   */
  function processWealthTax(state, currentTick) {
    var totalCollected = 0;
    var taxed = [];
    var tick = typeof currentTick === 'number' ? currentTick : 0;

    var playerIds = Object.keys(state.players);
    for (var i = 0; i < playerIds.length; i++) {
      var pid = playerIds[i];
      var player = state.players[pid];
      if (player.balance <= WEALTH_TAX_THRESHOLD) {
        continue;
      }
      var taxableAmount = player.balance - WEALTH_TAX_THRESHOLD;
      var taxAmount = Math.floor(taxableAmount * WEALTH_TAX_RATE);
      if (taxAmount <= 0) {
        continue;
      }

      // Enforce balance floor
      var effectiveTax = taxAmount;
      if (player.balance - effectiveTax < BALANCE_FLOOR) {
        effectiveTax = Math.max(0, player.balance - BALANCE_FLOOR);
      }
      if (effectiveTax <= 0) {
        continue;
      }

      var balanceBefore = player.balance;
      player.balance -= effectiveTax;
      player.totalTaxPaid += effectiveTax;
      state.treasury += effectiveTax;
      totalCollected += effectiveTax;

      var entry = {
        tick: tick,
        playerId: pid,
        type: 'wealth_tax',
        balanceBefore: balanceBefore,
        taxableAmount: taxableAmount,
        taxAmount: effectiveTax,
        balanceAfter: player.balance
      };
      state.taxLog.push(entry);
      player.taxHistory.push(entry);
      taxed.push({ playerId: pid, taxAmount: effectiveTax, balanceBefore: balanceBefore, balanceAfter: player.balance });
    }

    return { totalCollected: totalCollected, taxed: taxed };
  }

  // ---------------------------------------------------------------------------
  // UBI DISTRIBUTION
  // ---------------------------------------------------------------------------

  /**
   * Distribute UBI from treasury to all eligible players.
   * perPlayer = clamp(floor(treasury / count), UBI_MIN, UBI_MAX)
   * Players must be registered. All registered players are eligible.
   * @param {Object} state
   * @param {number} currentTick
   * @returns {{ totalDistributed, perPlayer, recipients }}
   */
  function distributeUBI(state, currentTick) {
    var tick = typeof currentTick === 'number' ? currentTick : 0;
    var playerIds = Object.keys(state.players);
    var count = playerIds.length;

    if (count === 0 || state.treasury <= 0) {
      return { totalDistributed: 0, perPlayer: 0, recipients: 0 };
    }

    var rawPerPlayer = Math.floor(state.treasury / count);
    var perPlayer = Math.max(UBI_MIN, Math.min(UBI_MAX, rawPerPlayer));

    // If treasury cannot fund even UBI_MIN for all, scale down
    if (perPlayer * count > state.treasury) {
      perPlayer = Math.floor(state.treasury / count);
    }
    if (perPlayer < 1) {
      return { totalDistributed: 0, perPlayer: 0, recipients: 0 };
    }

    var totalDistributed = 0;
    var recipients = 0;

    for (var i = 0; i < playerIds.length; i++) {
      var pid = playerIds[i];
      var player = state.players[pid];

      // Check treasury can still pay
      if (state.treasury < perPlayer) {
        break;
      }

      player.balance += perPlayer;
      player.totalUBIReceived += perPlayer;
      state.treasury -= perPlayer;
      totalDistributed += perPlayer;
      recipients++;

      var entry = {
        tick: tick,
        playerId: pid,
        type: 'ubi',
        amount: perPlayer,
        balanceAfter: player.balance
      };
      state.ubiLog.push(entry);
      player.ubiHistory.push(entry);
    }

    return { totalDistributed: totalDistributed, perPlayer: perPlayer, recipients: recipients };
  }

  // ---------------------------------------------------------------------------
  // EXEMPTION CHECK
  // ---------------------------------------------------------------------------

  /**
   * Check if a player is tax-exempt (new player within first 500 ticks).
   * @param {Object} state
   * @param {string} playerId
   * @param {number} currentTick
   * @returns {boolean}
   */
  function isExempt(state, playerId, currentTick) {
    var player = state.players[playerId];
    if (!player) return false;
    var tick = typeof currentTick === 'number' ? currentTick : 0;
    return (tick - player.joinTick) < NEW_PLAYER_EXEMPT_TICKS;
  }

  // ---------------------------------------------------------------------------
  // PLAYER TAX RECORD
  // ---------------------------------------------------------------------------

  /**
   * Get the full tax history for a player.
   * @param {Object} state
   * @param {string} playerId
   * @returns {{ playerId, taxHistory, ubiHistory, totalTaxPaid, totalUBIReceived } | null}
   */
  function getPlayerTaxRecord(state, playerId) {
    var player = state.players[playerId];
    if (!player) return null;
    return {
      playerId: playerId,
      balance: player.balance,
      totalTaxPaid: player.totalTaxPaid,
      totalUBIReceived: player.totalUBIReceived,
      totalEarnings: player.totalEarnings,
      taxHistory: player.taxHistory.slice(),
      ubiHistory: player.ubiHistory.slice(),
      joinTick: player.joinTick
    };
  }

  // ---------------------------------------------------------------------------
  // TREASURY QUERIES
  // ---------------------------------------------------------------------------

  /**
   * Get current treasury balance.
   * @param {Object} state
   * @returns {number}
   */
  function getTreasury(state) {
    return state.treasury;
  }

  /**
   * Estimate next UBI payout per player.
   * @param {Object} state
   * @returns {{ perPlayer, eligibleCount, totalEstimate }}
   */
  function getUBIEstimate(state) {
    var count = Object.keys(state.players).length;
    if (count === 0 || state.treasury <= 0) {
      return { perPlayer: 0, eligibleCount: count, totalEstimate: 0 };
    }
    var raw = Math.floor(state.treasury / count);
    var perPlayer = Math.max(UBI_MIN, Math.min(UBI_MAX, raw));
    if (perPlayer * count > state.treasury) {
      perPlayer = Math.floor(state.treasury / count);
    }
    if (perPlayer < 1) perPlayer = 0;
    return {
      perPlayer: perPlayer,
      eligibleCount: count,
      totalEstimate: perPlayer * count
    };
  }

  // ---------------------------------------------------------------------------
  // ECONOMIC HEALTH METRICS
  // ---------------------------------------------------------------------------

  /**
   * Calculate Gini coefficient (0 = perfect equality, 1 = maximum inequality).
   * Uses the standard definition over all player balances.
   * @param {Object} state
   * @returns {number} Gini coefficient in [0, 1]
   */
  function getGiniCoefficient(state) {
    var ids = Object.keys(state.players);
    if (ids.length === 0) return 0;
    var balances = [];
    for (var i = 0; i < ids.length; i++) {
      balances.push(Math.max(0, state.players[ids[i]].balance));
    }
    balances.sort(function(a, b) { return a - b; });
    var n = balances.length;
    var sum = 0;
    for (var j = 0; j < n; j++) {
      sum += balances[j];
    }
    if (sum === 0) return 0;
    var weightedSum = 0;
    for (var k = 0; k < n; k++) {
      weightedSum += (2 * (k + 1) - n - 1) * balances[k];
    }
    return weightedSum / (n * sum);
  }

  /**
   * Get the median player balance.
   * @param {Object} state
   * @returns {number}
   */
  function getMedianBalance(state) {
    var ids = Object.keys(state.players);
    if (ids.length === 0) return 0;
    var balances = [];
    for (var i = 0; i < ids.length; i++) {
      balances.push(state.players[ids[i]].balance);
    }
    balances.sort(function(a, b) { return a - b; });
    var mid = Math.floor(balances.length / 2);
    if (balances.length % 2 === 0) {
      return (balances[mid - 1] + balances[mid]) / 2;
    }
    return balances[mid];
  }

  /**
   * Get Spark circulation velocity: total taxes collected / total Spark in circulation.
   * Higher velocity indicates more active economic redistribution.
   * @param {Object} state
   * @returns {number}
   */
  function getCirculationVelocity(state) {
    var totalTax = 0;
    var totalBalance = 0;
    var ids = Object.keys(state.players);
    for (var i = 0; i < ids.length; i++) {
      var p = state.players[ids[i]];
      totalTax += p.totalTaxPaid;
      totalBalance += p.balance;
    }
    totalBalance += state.treasury;
    if (totalBalance === 0) return 0;
    return totalTax / totalBalance;
  }

  /**
   * Calculate a composite economic health score (0-100).
   * Factors: Gini (lower = healthier), treasury ratio, UBI coverage.
   * @param {Object} state
   * @returns {number} health score in [0, 100]
   */
  function getEconomicHealth(state) {
    var gini = getGiniCoefficient(state);
    var giniScore = (1 - gini) * 40; // max 40 points

    var ids = Object.keys(state.players);
    var count = ids.length;

    // Treasury health: treasury / (count * UBI_MAX) capped at 1
    var treasuryRatio = count > 0 ? Math.min(1, state.treasury / (count * UBI_MAX + 1)) : 0;
    var treasuryScore = treasuryRatio * 30; // max 30 points

    // Circulation velocity: higher is better (capped at 1)
    var velocity = Math.min(1, getCirculationVelocity(state));
    var velocityScore = velocity * 30; // max 30 points

    var health = Math.round(giniScore + treasuryScore + velocityScore);
    return Math.max(0, Math.min(100, health));
  }

  // ---------------------------------------------------------------------------
  // REPORTING
  // ---------------------------------------------------------------------------

  /**
   * Generate a daily economic report for a specific tick.
   * @param {Object} state
   * @param {number} tick
   * @returns {Object} daily report snapshot
   */
  function getDailyReport(state, tick) {
    var t = typeof tick === 'number' ? tick : 0;

    // Collect tick-specific logs
    var taxEntries = state.taxLog.filter(function(e) { return e.tick === t; });
    var ubiEntries = state.ubiLog.filter(function(e) { return e.tick === t; });

    var taxRevenue = 0;
    var wealthTaxRevenue = 0;
    for (var i = 0; i < taxEntries.length; i++) {
      taxRevenue += taxEntries[i].taxAmount;
      if (taxEntries[i].type === 'wealth_tax') wealthTaxRevenue += taxEntries[i].taxAmount;
    }
    var ubiDistributed = 0;
    var ubiRecipients = 0;
    for (var j = 0; j < ubiEntries.length; j++) {
      ubiDistributed += ubiEntries[j].amount;
      ubiRecipients++;
    }

    return {
      tick: t,
      treasury: state.treasury,
      playerCount: Object.keys(state.players).length,
      taxRevenue: taxRevenue,
      wealthTaxRevenue: wealthTaxRevenue,
      incomeTaxRevenue: taxRevenue - wealthTaxRevenue,
      ubiDistributed: ubiDistributed,
      ubiRecipients: ubiRecipients,
      medianBalance: getMedianBalance(state),
      giniCoefficient: getGiniCoefficient(state),
      circulationVelocity: getCirculationVelocity(state),
      economicHealth: getEconomicHealth(state)
    };
  }

  /**
   * Get a histogram of player balances grouped into buckets.
   * Buckets: 0-49, 50-199, 200-499, 500-999, 1000+
   * @param {Object} state
   * @returns {Array} array of { range, count, totalBalance }
   */
  function getWealthDistribution(state) {
    var buckets = [
      { range: '0-49',    min: 0,    max: 49,       count: 0, totalBalance: 0 },
      { range: '50-199',  min: 50,   max: 199,      count: 0, totalBalance: 0 },
      { range: '200-499', min: 200,  max: 499,      count: 0, totalBalance: 0 },
      { range: '500-999', min: 500,  max: 999,      count: 0, totalBalance: 0 },
      { range: '1000+',   min: 1000, max: Infinity, count: 0, totalBalance: 0 }
    ];

    var ids = Object.keys(state.players);
    for (var i = 0; i < ids.length; i++) {
      var bal = state.players[ids[i]].balance;
      for (var j = 0; j < buckets.length; j++) {
        if (bal >= buckets[j].min && bal <= buckets[j].max) {
          buckets[j].count++;
          buckets[j].totalBalance += bal;
          break;
        }
      }
    }
    return buckets;
  }

  /**
   * Get the top N tax payers by total tax paid.
   * @param {Object} state
   * @param {number} count
   * @returns {Array} sorted array of { playerId, totalTaxPaid, balance }
   */
  function getTopTaxPayers(state, count) {
    var n = typeof count === 'number' && count > 0 ? count : 10;
    var ids = Object.keys(state.players);
    var list = [];
    for (var i = 0; i < ids.length; i++) {
      var p = state.players[ids[i]];
      list.push({ playerId: ids[i], totalTaxPaid: p.totalTaxPaid, balance: p.balance });
    }
    list.sort(function(a, b) { return b.totalTaxPaid - a.totalTaxPaid; });
    return list.slice(0, n);
  }

  /**
   * Get total tax revenue collected in a tick range [startTick, endTick] inclusive.
   * @param {Object} state
   * @param {number} startTick
   * @param {number} endTick
   * @returns {number}
   */
  function getTaxRevenue(state, startTick, endTick) {
    var start = typeof startTick === 'number' ? startTick : 0;
    var end = typeof endTick === 'number' ? endTick : Infinity;
    var total = 0;
    for (var i = 0; i < state.taxLog.length; i++) {
      var e = state.taxLog[i];
      if (e.tick >= start && e.tick <= end) {
        total += e.taxAmount;
      }
    }
    return total;
  }

  // ---------------------------------------------------------------------------
  // DAILY PROCESSING
  // ---------------------------------------------------------------------------

  /**
   * Run all daily economic processing: wealth tax then UBI distribution.
   * Records a daily stats snapshot.
   * @param {Object} state
   * @param {number} currentTick
   * @returns {{ wealthTax, ubi, snapshot }}
   */
  function processDaily(state, currentTick) {
    var tick = typeof currentTick === 'number' ? currentTick : 0;

    var wealthTaxResult = processWealthTax(state, tick);
    var ubiResult = distributeUBI(state, tick);

    var snapshot = getDailyReport(state, tick);
    state.dailyStats.push(snapshot);

    return {
      wealthTax: wealthTaxResult,
      ubi: ubiResult,
      snapshot: snapshot
    };
  }

  // ---------------------------------------------------------------------------
  // EXPORTS
  // ---------------------------------------------------------------------------

  exports.TAX_BRACKETS = TAX_BRACKETS;
  exports.BALANCE_FLOOR = BALANCE_FLOOR;
  exports.UBI_MIN = UBI_MIN;
  exports.UBI_MAX = UBI_MAX;
  exports.WEALTH_TAX_THRESHOLD = WEALTH_TAX_THRESHOLD;
  exports.WEALTH_TAX_RATE = WEALTH_TAX_RATE;
  exports.NEW_PLAYER_EXEMPT_TICKS = NEW_PLAYER_EXEMPT_TICKS;
  exports.INITIAL_TREASURY = INITIAL_TREASURY;

  exports.createState = createState;
  exports.registerPlayer = registerPlayer;
  exports.processIncomeTax = processIncomeTax;
  exports.processWealthTax = processWealthTax;
  exports.distributeUBI = distributeUBI;
  exports.getTaxBracket = getTaxBracket;
  exports.getPlayerTaxRecord = getPlayerTaxRecord;
  exports.getTreasury = getTreasury;
  exports.getUBIEstimate = getUBIEstimate;
  exports.isExempt = isExempt;
  exports.getGiniCoefficient = getGiniCoefficient;
  exports.getMedianBalance = getMedianBalance;
  exports.getCirculationVelocity = getCirculationVelocity;
  exports.getEconomicHealth = getEconomicHealth;
  exports.getDailyReport = getDailyReport;
  exports.getWealthDistribution = getWealthDistribution;
  exports.getTopTaxPayers = getTopTaxPayers;
  exports.getTaxRevenue = getTaxRevenue;
  exports.processDaily = processDaily;

  exports._mulberry32 = mulberry32; // expose for tests

})(typeof module !== 'undefined' ? module.exports : (window.EconomicRegulation = {}));
