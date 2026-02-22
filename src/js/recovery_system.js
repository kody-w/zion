// recovery_system.js
/**
 * ZION Recovery System
 * Loss conditions (bankruptcy, homelessness, injury, disgrace) with phased
 * recovery mechanics: NPC aid, debt contracts, charity shelter, and apology
 * restitution cycles. Players receive catch-up bonuses during recovery.
 * No project dependencies.
 */

(function(exports) {
  'use strict';

  // =========================================================================
  // SEEDED PRNG — mulberry32
  // =========================================================================

  function createRng(seed) {
    var s = (seed >>> 0) || 0xDEADBEEF;
    return function() {
      s += 0x6D2B79F5;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) >>> 0;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashString(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function seedFrom(base, suffix) {
    return hashString(String(base) + '|' + String(suffix));
  }

  // =========================================================================
  // LOSS CONDITIONS — 4 conditions
  // =========================================================================

  var LOSS_CONDITIONS = [
    {
      id: 'bankruptcy',
      name: 'Bankruptcy',
      description: 'Spark balance has fallen to zero or below. The player cannot participate in the economy without aid.',
      triggerCheck: function(playerData) {
        return (playerData.spark !== undefined ? playerData.spark : 1) <= 0;
      },
      recoverySteps: [
        'Receive emergency Spark stipend from the Treasury',
        'Accept a debt contract with a sponsoring NPC',
        'Earn Spark through NPC-aided work at reduced prices',
        'Repay debt in installments over the recovery period',
        'Rebuild balance above the stability threshold (25 Spark)'
      ],
      duration: 500,       // ticks until fully restored
      npcAidRate: 0.50,    // 50% discount on NPC services
      severity: 'high'
    },
    {
      id: 'homelessness',
      name: 'Homelessness',
      description: 'Player has no valid housing. The Commons zone provides temporary charity shelter.',
      triggerCheck: function(playerData) {
        return !playerData.housing || !playerData.housing.active;
      },
      recoverySteps: [
        'Move into temporary charity shelter in the Commons zone',
        'Attend at least one community-building session',
        'Save enough Spark for a housing deposit',
        'Apply for subsidized housing through the Commons council',
        'Transition out of charity shelter into permanent housing'
      ],
      duration: 400,
      npcAidRate: 0.35,    // 35% discount
      severity: 'medium'
    },
    {
      id: 'injury',
      name: 'Injury',
      description: 'Player health has reached zero. Rest and NPC healer care are required before resuming activity.',
      triggerCheck: function(playerData) {
        return (playerData.health !== undefined ? playerData.health : 100) <= 0;
      },
      recoverySteps: [
        'Enter the Healing Sanctuary in the Gardens zone',
        'Receive first aid from a healer NPC at no cost',
        'Rest for the minimum recovery period (50 ticks)',
        'Complete a light rehabilitation quest',
        'Return to full health (100 HP) to exit recovery'
      ],
      duration: 300,
      npcAidRate: 0.60,    // 60% discount on healer services
      severity: 'medium'
    },
    {
      id: 'disgrace',
      name: 'Disgrace',
      description: 'Reputation has fallen below -50. The community demands apology and restitution before trust is restored.',
      triggerCheck: function(playerData) {
        return (playerData.reputation !== undefined ? playerData.reputation : 0) < -50;
      },
      recoverySteps: [
        'Attend a public hearing at the Agora',
        'Deliver a formal public apology message',
        'Complete at least three community service quests',
        'Offer restitution Spark to any players harmed',
        'Reach a reputation of at least 0 to exit recovery'
      ],
      duration: 600,
      npcAidRate: 0.20,    // 20% discount — NPCs are cautious
      severity: 'high'
    }
  ];

  // =========================================================================
  // RECOVERY PHASES
  // =========================================================================

  var RECOVERY_PHASES = [
    {
      id: 'emergency',
      name: 'Emergency',
      description: 'Immediate crisis response. Maximum NPC aid and recovery bonuses available.',
      tickStart: 0,
      tickEnd: 50,
      xpBonus: 2.0,        // 2x XP during emergency
      sparkBonus: 1.75,    // 1.75x Spark earning rate
      aidMultiplier: 1.0   // Full aid rate from NPC
    },
    {
      id: 'stabilization',
      name: 'Stabilization',
      description: 'Situation is stabilizing. Moderate bonuses as the player finds their footing.',
      tickStart: 50,
      tickEnd: 200,
      xpBonus: 1.5,
      sparkBonus: 1.40,
      aidMultiplier: 0.8
    },
    {
      id: 'recovery',
      name: 'Recovery',
      description: 'Active recovery in progress. Player is regaining resources and reputation.',
      tickStart: 200,
      tickEnd: 500,
      xpBonus: 1.25,
      sparkBonus: 1.20,
      aidMultiplier: 0.5
    },
    {
      id: 'restored',
      name: 'Restored',
      description: 'Player has recovered. Bonuses taper off as normal play resumes.',
      tickStart: 500,
      tickEnd: Infinity,
      xpBonus: 1.05,
      sparkBonus: 1.05,
      aidMultiplier: 0.25
    }
  ];

  // =========================================================================
  // STATE
  // =========================================================================

  /**
   * Create initial recovery system state.
   * @returns {{ players: Object, debts: Array, recoveryLog: Array }}
   */
  function createState() {
    return {
      players: {},    // keyed by playerId, holds active recovery records
      debts: [],      // all debt records across all players
      recoveryLog: [] // completed recovery history entries
    };
  }

  // =========================================================================
  // INTERNAL HELPERS
  // =========================================================================

  function getConditionById(conditionId) {
    for (var i = 0; i < LOSS_CONDITIONS.length; i++) {
      if (LOSS_CONDITIONS[i].id === conditionId) return LOSS_CONDITIONS[i];
    }
    return null;
  }

  function getPhaseForTick(elapsedTicks) {
    for (var i = 0; i < RECOVERY_PHASES.length; i++) {
      var phase = RECOVERY_PHASES[i];
      if (elapsedTicks >= phase.tickStart && elapsedTicks < phase.tickEnd) {
        return phase;
      }
    }
    return RECOVERY_PHASES[RECOVERY_PHASES.length - 1];
  }

  function ensurePlayer(state, playerId) {
    if (!state.players[playerId]) {
      state.players[playerId] = null; // not in recovery
    }
  }

  function generateId(prefix, seed) {
    var rng = createRng(seedFrom(prefix, seed));
    var hex = Math.floor(rng() * 0xFFFFFFFF).toString(16);
    return prefix + '_' + hex;
  }

  // =========================================================================
  // CORE API
  // =========================================================================

  /**
   * Check whether any loss condition is triggered for a player.
   * @param {Object} state
   * @param {string} playerId
   * @param {Object} playerData  — { spark, housing, health, reputation }
   * @returns {{ triggered: boolean, condition: Object|null, severity: string }}
   */
  function checkCondition(state, playerId, playerData) {
    for (var i = 0; i < LOSS_CONDITIONS.length; i++) {
      var cond = LOSS_CONDITIONS[i];
      if (cond.triggerCheck(playerData)) {
        return {
          triggered: true,
          condition: cond,
          severity: cond.severity
        };
      }
    }
    return { triggered: false, condition: null, severity: 'none' };
  }

  /**
   * Begin a recovery arc for a player.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} conditionId
   * @param {number} currentTick
   * @returns {{ success: boolean, phase: Object, aid: Object }}
   */
  function enterRecovery(state, playerId, conditionId, currentTick) {
    var cond = getConditionById(conditionId);
    if (!cond) {
      return { success: false, phase: null, aid: null };
    }

    var phase = getPhaseForTick(0); // always starts at emergency

    var record = {
      playerId: playerId,
      conditionId: conditionId,
      conditionName: cond.name,
      startTick: currentTick,
      elapsedTicks: 0,
      currentPhaseId: phase.id,
      apologies: [],           // disgrace condition uses this
      stepsCompleted: [],
      active: true
    };

    state.players[playerId] = record;

    var aid = {
      discountRate: cond.npcAidRate,
      description: 'NPC aid rate: ' + Math.round(cond.npcAidRate * 100) + '% discount on services',
      emergencyStipend: conditionId === 'bankruptcy' ? 10 : 0
    };

    return { success: true, phase: phase, aid: aid };
  }

  /**
   * Return the current recovery phase for a player.
   * @param {Object} state
   * @param {string} playerId
   * @returns {{ phase: Object|null, record: Object|null, elapsedTicks: number }}
   */
  function getRecoveryPhase(state, playerId) {
    var record = state.players[playerId];
    if (!record || !record.active) {
      return { phase: null, record: null, elapsedTicks: 0 };
    }
    var phase = getPhaseForTick(record.elapsedTicks);
    return { phase: phase, record: record, elapsedTicks: record.elapsedTicks };
  }

  /**
   * Update elapsed ticks and check if the phase should advance.
   * @param {Object} state
   * @param {string} playerId
   * @param {number} currentTick
   * @returns {{ advanced: boolean, newPhase: Object|null, bonuses: Object }}
   */
  function advanceRecovery(state, playerId, currentTick) {
    var record = state.players[playerId];
    if (!record || !record.active) {
      return { advanced: false, newPhase: null, bonuses: {} };
    }

    var prevPhaseId = record.currentPhaseId;
    record.elapsedTicks = currentTick - record.startTick;

    var newPhase = getPhaseForTick(record.elapsedTicks);
    var advanced = newPhase.id !== prevPhaseId;

    if (advanced) {
      record.currentPhaseId = newPhase.id;
    }

    var cond = getConditionById(record.conditionId);
    var aidMultiplier = newPhase.aidMultiplier;
    var baseAidRate = cond ? cond.npcAidRate : 0;

    var bonuses = {
      xpBonus: newPhase.xpBonus,
      sparkBonus: newPhase.sparkBonus,
      npcAidRate: baseAidRate * aidMultiplier,
      phase: newPhase.id
    };

    return { advanced: advanced, newPhase: newPhase, bonuses: bonuses };
  }

  /**
   * Mark recovery as complete and archive to recoveryLog.
   * @param {Object} state
   * @param {string} playerId
   * @param {number} currentTick
   * @returns {{ success: boolean, duration: number, sparkBonus: number }}
   */
  function completeRecovery(state, playerId, currentTick) {
    var record = state.players[playerId];
    if (!record || !record.active) {
      return { success: false, duration: 0, sparkBonus: 0 };
    }

    var duration = currentTick - record.startTick;
    var cond = getConditionById(record.conditionId);

    // Spark completion bonus: faster recovery = bigger bonus (max 100, min 10)
    var speedRatio = cond ? Math.max(0, 1 - duration / cond.duration) : 0;
    var sparkBonus = Math.round(10 + speedRatio * 90);

    var logEntry = {
      playerId: playerId,
      conditionId: record.conditionId,
      conditionName: record.conditionName,
      startTick: record.startTick,
      completedTick: currentTick,
      duration: duration,
      sparkBonus: sparkBonus,
      stepsCompleted: record.stepsCompleted.slice(),
      apologies: record.apologies.slice()
    };

    state.recoveryLog.push(logEntry);
    state.players[playerId] = { active: false }; // clear active record

    return { success: true, duration: duration, sparkBonus: sparkBonus };
  }

  // =========================================================================
  // DEBT SYSTEM
  // =========================================================================

  /**
   * Create a debt record between a player and an NPC.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} npcId
   * @param {number} amount
   * @param {string} reason
   * @returns {{ success: boolean, debtId: string, debt: Object }}
   */
  function createDebt(state, playerId, npcId, amount, reason) {
    if (amount <= 0) {
      return { success: false, debtId: null, debt: null };
    }

    var debtId = generateId('debt', playerId + npcId + amount + reason + Date.now());

    var debt = {
      id: debtId,
      playerId: playerId,
      npcId: npcId,
      originalAmount: amount,
      remainingAmount: amount,
      reason: reason || 'NPC emergency loan',
      createdTick: 0,
      payments: [],
      settled: false
    };

    state.debts.push(debt);

    return { success: true, debtId: debtId, debt: debt };
  }

  /**
   * Make a partial or full repayment on a debt.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} debtId
   * @param {number} amount
   * @returns {{ success: boolean, remaining: number, settled: boolean }}
   */
  function repayDebt(state, playerId, debtId, amount) {
    var debt = null;
    for (var i = 0; i < state.debts.length; i++) {
      if (state.debts[i].id === debtId && state.debts[i].playerId === playerId) {
        debt = state.debts[i];
        break;
      }
    }

    if (!debt || debt.settled) {
      return { success: false, remaining: 0, settled: false };
    }

    if (amount <= 0) {
      return { success: false, remaining: debt.remainingAmount, settled: false };
    }

    var payment = Math.min(amount, debt.remainingAmount);
    debt.remainingAmount -= payment;
    debt.payments.push({ amount: payment });

    if (debt.remainingAmount <= 0) {
      debt.remainingAmount = 0;
      debt.settled = true;
    }

    return { success: true, remaining: debt.remainingAmount, settled: debt.settled };
  }

  /**
   * List all active debts for a player.
   * @param {Object} state
   * @param {string} playerId
   * @returns {Array}
   */
  function getDebts(state, playerId) {
    var result = [];
    for (var i = 0; i < state.debts.length; i++) {
      if (state.debts[i].playerId === playerId && !state.debts[i].settled) {
        result.push(state.debts[i]);
      }
    }
    return result;
  }

  /**
   * Total Spark owed across all active debts for a player.
   * @param {Object} state
   * @param {string} playerId
   * @returns {number}
   */
  function getDebtTotal(state, playerId) {
    var total = 0;
    for (var i = 0; i < state.debts.length; i++) {
      var d = state.debts[i];
      if (d.playerId === playerId && !d.settled) {
        total += d.remainingAmount;
      }
    }
    return total;
  }

  // =========================================================================
  // DISGRACE MECHANICS
  // =========================================================================

  /**
   * Record a public apology for disgrace recovery. Each apology reduces
   * the effective disgrace penalty and marks a step toward restoration.
   * @param {Object} state
   * @param {string} playerId
   * @param {number} currentTick
   * @returns {{ success: boolean, apologyCount: number, reputationBonus: number }}
   */
  function publicApology(state, playerId, currentTick) {
    var record = state.players[playerId];
    if (!record || !record.active || record.conditionId !== 'disgrace') {
      return { success: false, apologyCount: 0, reputationBonus: 0 };
    }

    // Cooldown: at least 50 ticks between apologies
    var lastApology = record.apologies.length > 0
      ? record.apologies[record.apologies.length - 1]
      : null;

    if (lastApology && (currentTick - lastApology.tick) < 50) {
      return { success: false, apologyCount: record.apologies.length, reputationBonus: 0 };
    }

    // Diminishing returns: 1st=20, 2nd=15, 3rd=10, 4th+=5
    var apologyBonuses = [20, 15, 10];
    var idx = record.apologies.length;
    var bonus = idx < apologyBonuses.length ? apologyBonuses[idx] : 5;

    record.apologies.push({ tick: currentTick, bonus: bonus });

    if (record.stepsCompleted.indexOf('public_apology') === -1) {
      record.stepsCompleted.push('public_apology');
    }

    return {
      success: true,
      apologyCount: record.apologies.length,
      reputationBonus: bonus
    };
  }

  // =========================================================================
  // BONUS & AID QUERIES
  // =========================================================================

  /**
   * Get the current XP and Spark multipliers for a player in recovery.
   * @param {Object} state
   * @param {string} playerId
   * @returns {{ xpBonus: number, sparkBonus: number, phase: string|null }}
   */
  function getRecoveryBonus(state, playerId) {
    var record = state.players[playerId];
    if (!record || !record.active) {
      return { xpBonus: 1.0, sparkBonus: 1.0, phase: null };
    }
    var phase = getPhaseForTick(record.elapsedTicks);
    return {
      xpBonus: phase.xpBonus,
      sparkBonus: phase.sparkBonus,
      phase: phase.id
    };
  }

  /**
   * Get the effective NPC aid discount rate for a player.
   * Rate is scaled by the current phase's aidMultiplier.
   * @param {Object} state
   * @param {string} playerId
   * @returns {number}  value in [0, 1] — fraction of price saved
   */
  function getNpcAidRate(state, playerId) {
    var record = state.players[playerId];
    if (!record || !record.active) {
      return 0;
    }
    var cond = getConditionById(record.conditionId);
    if (!cond) return 0;

    var phase = getPhaseForTick(record.elapsedTicks);
    return Math.min(1, cond.npcAidRate * phase.aidMultiplier);
  }

  // =========================================================================
  // HISTORY & STATISTICS
  // =========================================================================

  /**
   * Retrieve the past recovery events for a player.
   * @param {Object} state
   * @param {string} playerId
   * @returns {Array}
   */
  function getRecoveryHistory(state, playerId) {
    var result = [];
    for (var i = 0; i < state.recoveryLog.length; i++) {
      if (state.recoveryLog[i].playerId === playerId) {
        result.push(state.recoveryLog[i]);
      }
    }
    return result;
  }

  /**
   * Aggregate statistics across all players and recovery events.
   * @param {Object} state
   * @returns {Object}
   */
  function getRecoveryStats(state) {
    var totalRecoveries = state.recoveryLog.length;
    var activeRecoveries = 0;
    var conditionCounts = {};
    var totalDuration = 0;
    var totalSparkBonuses = 0;
    var totalDebts = state.debts.length;
    var settledDebts = 0;

    // Active recoveries
    var playerIds = Object.keys(state.players);
    for (var i = 0; i < playerIds.length; i++) {
      var rec = state.players[playerIds[i]];
      if (rec && rec.active) {
        activeRecoveries++;
        conditionCounts[rec.conditionId] = (conditionCounts[rec.conditionId] || 0) + 1;
      }
    }

    // Completed recoveries
    for (var j = 0; j < state.recoveryLog.length; j++) {
      var entry = state.recoveryLog[j];
      totalDuration += entry.duration;
      totalSparkBonuses += entry.sparkBonus;
      conditionCounts[entry.conditionId] = (conditionCounts[entry.conditionId] || 0) + 1;
    }

    // Debt stats
    for (var k = 0; k < state.debts.length; k++) {
      if (state.debts[k].settled) settledDebts++;
    }

    return {
      totalRecoveries: totalRecoveries,
      activeRecoveries: activeRecoveries,
      averageDuration: totalRecoveries > 0 ? Math.round(totalDuration / totalRecoveries) : 0,
      totalSparkBonusesPaid: totalSparkBonuses,
      conditionBreakdown: conditionCounts,
      totalDebts: totalDebts,
      settledDebts: settledDebts,
      activeDebts: totalDebts - settledDebts
    };
  }

  /**
   * Check whether a player is currently in an active recovery arc.
   * @param {Object} state
   * @param {string} playerId
   * @returns {boolean}
   */
  function isInRecovery(state, playerId) {
    var record = state.players[playerId];
    return !!(record && record.active);
  }

  // =========================================================================
  // EXPORTS
  // =========================================================================

  exports.LOSS_CONDITIONS   = LOSS_CONDITIONS;
  exports.RECOVERY_PHASES   = RECOVERY_PHASES;
  exports.createState       = createState;
  exports.checkCondition    = checkCondition;
  exports.enterRecovery     = enterRecovery;
  exports.getRecoveryPhase  = getRecoveryPhase;
  exports.advanceRecovery   = advanceRecovery;
  exports.completeRecovery  = completeRecovery;
  exports.createDebt        = createDebt;
  exports.repayDebt         = repayDebt;
  exports.getDebts          = getDebts;
  exports.getDebtTotal      = getDebtTotal;
  exports.publicApology     = publicApology;
  exports.getRecoveryBonus  = getRecoveryBonus;
  exports.getNpcAidRate     = getNpcAidRate;
  exports.getRecoveryHistory = getRecoveryHistory;
  exports.getRecoveryStats  = getRecoveryStats;
  exports.isInRecovery      = isInRecovery;

})(typeof module !== 'undefined' ? module.exports : (window.RecoverySystem = {}));
