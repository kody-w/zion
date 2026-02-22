// grief_recovery.js
/**
 * ZION Grief Recovery System
 * Support system for players who have suffered griefing or loss.
 * Covers reporting, investigation, rollback, restitution, insurance,
 * a comfort hotline, achievements, and a peer support network.
 */

(function(exports) {
  'use strict';

  // ---------------------------------------------------------------------------
  // SEEDED PRNG — mulberry32
  // ---------------------------------------------------------------------------

  function mulberry32(seed) {
    var s = seed >>> 0;
    return function() {
      s += 0x6D2B79F5;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------------------------------------------------------------------------
  // GRIEF TYPE DEFINITIONS — 6 types
  // ---------------------------------------------------------------------------

  var GRIEF_TYPES = [
    {
      id: 'structure_destroyed',
      name: 'Structure Destroyed',
      description: 'A player-built structure was destroyed by another player without consent',
      severity: 'high',
      defaultLossMultiplier: 1.0,
      rollbackEligible: true,
      maxLossValue: 50000
    },
    {
      id: 'garden_trampled',
      name: 'Garden Trampled',
      description: 'A cultivated garden was damaged or destroyed by another player',
      severity: 'medium',
      defaultLossMultiplier: 0.8,
      rollbackEligible: true,
      maxLossValue: 10000
    },
    {
      id: 'items_stolen',
      name: 'Items Stolen',
      description: 'Personal items or resources were taken without consent',
      severity: 'high',
      defaultLossMultiplier: 1.0,
      rollbackEligible: false,
      maxLossValue: 100000
    },
    {
      id: 'fraud',
      name: 'Fraud',
      description: 'Deceptive trade, false promises, or economic manipulation',
      severity: 'high',
      defaultLossMultiplier: 1.0,
      rollbackEligible: false,
      maxLossValue: 200000
    },
    {
      id: 'harassment',
      name: 'Harassment',
      description: 'Repeated unwanted interactions, threats, or targeted hostility',
      severity: 'critical',
      defaultLossMultiplier: 0.5,
      rollbackEligible: false,
      maxLossValue: 5000
    },
    {
      id: 'griefing_other',
      name: 'Other Griefing',
      description: 'Any other malicious player action causing significant distress or loss',
      severity: 'low',
      defaultLossMultiplier: 0.6,
      rollbackEligible: true,
      maxLossValue: 20000
    }
  ];

  // ---------------------------------------------------------------------------
  // REPORT LIFECYCLE STATUSES
  // ---------------------------------------------------------------------------

  var REPORT_STATUS = {
    FILED: 'filed',
    INVESTIGATING: 'investigating',
    EVIDENCE_REVIEWED: 'evidence_reviewed',
    RESOLVED: 'resolved',
    DISMISSED: 'dismissed'
  };

  // ---------------------------------------------------------------------------
  // INSURANCE CONSTANTS
  // ---------------------------------------------------------------------------

  var INSURANCE_RATE = 0.01;          // 1% of asset cost per 100 ticks
  var INSURANCE_PAYOUT_RATE = 0.80;   // 80% of loss value covered
  var INSURANCE_TICK_PERIOD = 100;    // ticks per premium period

  // ---------------------------------------------------------------------------
  // HOTLINE CONSTANTS
  // ---------------------------------------------------------------------------

  var HOTLINE_SPARK_AWARD = 10;
  var HOTLINE_COOLDOWN_TICKS = 200;   // cooldown between calls

  // ---------------------------------------------------------------------------
  // HOTLINE COMFORT MESSAGES
  // ---------------------------------------------------------------------------

  var HOTLINE_MESSAGES = [
    'I hear you. What happened to you was wrong, and your feelings are valid. ZION stands with you.',
    'Losing something you built takes real courage to face. But you are not alone in this world.',
    'Grief is the cost of caring. And you clearly cared deeply about what you created.',
    'Every setback is a chapter, not the whole story. What you build next will be even stronger.',
    'The community sees what happened. We are here to help you recover and rebuild.',
    'It is okay to feel hurt. Take the time you need. The world will still be here when you\'re ready.',
    'Your resilience is an inspiration. Others who have faced this have come through it, and so will you.',
    'Remember: the griever destroys. You create. That makes you stronger in the long run.',
    'One day at a time. One step at a time. We\'ll walk this path with you.',
    'You have friends here who want to see you thrive again. Don\'t be afraid to lean on them.'
  ];

  // ---------------------------------------------------------------------------
  // ACHIEVEMENTS — 5 grief-related achievements
  // ---------------------------------------------------------------------------

  var ACHIEVEMENTS = [
    {
      id: 'overcome_adversity',
      name: 'Overcome Adversity',
      description: 'Recover from a grief incident and continue playing',
      category: 'resilience',
      criteria: { type: 'counter', stat: 'grief_reports_resolved', target: 1 },
      reward: { spark: 50, xp: 100, badge: 'phoenix_rising' },
      tier: 1,
      hidden: false,
      prerequisite: null
    },
    {
      id: 'rebuild',
      name: 'Rebuild',
      description: 'Rebuild a destroyed structure or garden after a grief incident',
      category: 'resilience',
      criteria: { type: 'counter', stat: 'grief_rebuilds', target: 1 },
      reward: { spark: 75, xp: 150, badge: 'builder_reborn' },
      tier: 2,
      hidden: false,
      prerequisite: 'overcome_adversity'
    },
    {
      id: 'report_justice',
      name: 'Report Justice',
      description: 'Successfully file a grief report that leads to a resolved case',
      category: 'resilience',
      criteria: { type: 'counter', stat: 'grief_reports_won', target: 1 },
      reward: { spark: 100, xp: 200, badge: 'truth_seeker' },
      tier: 2,
      hidden: false,
      prerequisite: null
    },
    {
      id: 'insure_assets',
      name: 'Insure Assets',
      description: 'Purchase grief insurance for at least 3 different asset types',
      category: 'resilience',
      criteria: { type: 'counter', stat: 'insurance_policies_purchased', target: 3 },
      reward: { spark: 60, xp: 120, badge: 'prudent_builder' },
      tier: 1,
      hidden: false,
      prerequisite: null
    },
    {
      id: 'help_others',
      name: 'Help Others',
      description: 'Mentor at least 2 other players who have experienced grief',
      category: 'resilience',
      criteria: { type: 'counter', stat: 'grief_mentees', target: 2 },
      reward: { spark: 150, xp: 300, badge: 'compassionate_guide' },
      tier: 3,
      hidden: false,
      prerequisite: 'overcome_adversity'
    }
  ];

  // ---------------------------------------------------------------------------
  // INTERNAL COUNTERS
  // ---------------------------------------------------------------------------

  var reportCounter = 0;
  var policyCounter = 0;
  var restitutionCounter = 0;

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Generate a unique report ID.
   * @returns {string}
   */
  function nextReportId() {
    reportCounter++;
    return 'rpt_' + reportCounter;
  }

  /**
   * Generate a unique policy ID.
   * @returns {string}
   */
  function nextPolicyId() {
    policyCounter++;
    return 'pol_' + policyCounter;
  }

  /**
   * Generate a unique restitution order ID.
   * @returns {string}
   */
  function nextRestitutionId() {
    restitutionCounter++;
    return 'rst_' + restitutionCounter;
  }

  /**
   * Look up a grief type definition by id.
   * @param {string} typeId
   * @returns {object|null}
   */
  function findGriefType(typeId) {
    for (var i = 0; i < GRIEF_TYPES.length; i++) {
      if (GRIEF_TYPES[i].id === typeId) return GRIEF_TYPES[i];
    }
    return null;
  }

  /**
   * Look up a report by ID.
   * @param {object} state
   * @param {string} reportId
   * @returns {object|null}
   */
  function findReport(state, reportId) {
    if (!state || !state.reports) return null;
    for (var i = 0; i < state.reports.length; i++) {
      if (state.reports[i].id === reportId) return state.reports[i];
    }
    return null;
  }

  /**
   * Look up a policy by ID for a player.
   * @param {object} state
   * @param {string} playerId
   * @param {string} policyId
   * @returns {object|null}
   */
  function findPolicy(state, playerId, policyId) {
    if (!state || !state.insurance || !state.insurance[playerId]) return null;
    var policies = state.insurance[playerId];
    for (var i = 0; i < policies.length; i++) {
      if (policies[i].id === policyId) return policies[i];
    }
    return null;
  }

  /**
   * Look up a restitution order by ID.
   * @param {object} state
   * @param {string} orderId
   * @returns {object|null}
   */
  function findRestitution(state, orderId) {
    if (!state || !state.restitutions) return null;
    for (var i = 0; i < state.restitutions.length; i++) {
      if (state.restitutions[i].id === orderId) return state.restitutions[i];
    }
    return null;
  }

  /**
   * Get or initialize player grief stats.
   * @param {object} state
   * @param {string} playerId
   * @returns {object}
   */
  function getPlayerStats(state, playerId) {
    if (!state.achievements[playerId]) {
      state.achievements[playerId] = {
        unlocked: [],
        stats: {
          grief_reports_resolved: 0,
          grief_rebuilds: 0,
          grief_reports_won: 0,
          insurance_policies_purchased: 0,
          grief_mentees: 0
        }
      };
    }
    return state.achievements[playerId];
  }

  /**
   * Pick a comfort message using seeded PRNG.
   * @param {string} playerId
   * @param {number} currentTick
   * @returns {string}
   */
  function pickComfortMessage(playerId, currentTick) {
    var seed = 0;
    for (var i = 0; i < playerId.length; i++) {
      seed = (seed * 31 + playerId.charCodeAt(i)) >>> 0;
    }
    seed = (seed + currentTick) >>> 0;
    var rng = mulberry32(seed);
    var idx = Math.floor(rng() * HOTLINE_MESSAGES.length);
    return HOTLINE_MESSAGES[idx];
  }

  // ---------------------------------------------------------------------------
  // EXPORTED FUNCTIONS
  // ---------------------------------------------------------------------------

  /**
   * Create an initial grief recovery state object.
   * @returns {object}
   */
  function createState() {
    return {
      reports: [],
      insurance: {},
      restitutions: [],
      achievements: {},
      supportNetwork: [],
      griefLog: []
    };
  }

  /**
   * File a new grief report.
   * @param {object} state
   * @param {string} reporterId  — player filing the report
   * @param {string} griefType   — one of GRIEF_TYPES ids
   * @param {string} description — narrative description
   * @param {string} targetId    — alleged griefer player ID (or null)
   * @param {number} lossValue   — estimated loss in Spark
   * @param {number} currentTick
   * @returns {{success: boolean, report: object|null, comfortSpark: number}}
   */
  function fileReport(state, reporterId, griefType, description, targetId, lossValue, currentTick) {
    if (!state || !reporterId || !griefType || !description) {
      return { success: false, report: null, comfortSpark: 0, error: 'Missing required fields' };
    }

    var typeDef = findGriefType(griefType);
    if (!typeDef) {
      return { success: false, report: null, comfortSpark: 0, error: 'Unknown grief type: ' + griefType };
    }

    var safeLossValue = typeof lossValue === 'number' && lossValue > 0 ? lossValue : 0;
    if (safeLossValue > typeDef.maxLossValue) {
      safeLossValue = typeDef.maxLossValue;
    }

    var report = {
      id: nextReportId(),
      reporterId: reporterId,
      griefType: griefType,
      description: description,
      targetId: targetId || null,
      lossValue: safeLossValue,
      status: REPORT_STATUS.FILED,
      evidence: [],
      witnesses: [],
      filedAt: currentTick || 0,
      updatedAt: currentTick || 0,
      resolvedAt: null,
      guilty: null,
      rollbackApplied: false,
      restitutionOrderId: null,
      notes: []
    };

    state.reports.push(report);

    state.griefLog.push({
      tick: currentTick || 0,
      type: 'report_filed',
      reportId: report.id,
      reporterId: reporterId,
      griefType: griefType
    });

    return { success: true, report: report, comfortSpark: HOTLINE_SPARK_AWARD };
  }

  /**
   * Advance a report to investigating / evidence_reviewed stage.
   * @param {object} state
   * @param {string} reportId
   * @param {object} evidence  — { logs: [], witnesses: [] }
   * @param {number} currentTick
   * @returns {{success: boolean, status: string}}
   */
  function investigateReport(state, reportId, evidence, currentTick) {
    if (!state || !reportId) {
      return { success: false, status: null, error: 'Missing required fields' };
    }

    var report = findReport(state, reportId);
    if (!report) {
      return { success: false, status: null, error: 'Report not found: ' + reportId };
    }

    if (report.status === REPORT_STATUS.RESOLVED || report.status === REPORT_STATUS.DISMISSED) {
      return { success: false, status: report.status, error: 'Report already closed' };
    }

    // Advance status
    if (report.status === REPORT_STATUS.FILED) {
      report.status = REPORT_STATUS.INVESTIGATING;
    } else if (report.status === REPORT_STATUS.INVESTIGATING) {
      report.status = REPORT_STATUS.EVIDENCE_REVIEWED;
    }

    // Attach evidence
    if (evidence) {
      if (Array.isArray(evidence.logs)) {
        for (var i = 0; i < evidence.logs.length; i++) {
          report.evidence.push(evidence.logs[i]);
        }
      }
      if (Array.isArray(evidence.witnesses)) {
        for (var j = 0; j < evidence.witnesses.length; j++) {
          report.witnesses.push(evidence.witnesses[j]);
        }
      }
    }

    report.updatedAt = currentTick || 0;

    state.griefLog.push({
      tick: currentTick || 0,
      type: 'report_investigated',
      reportId: reportId,
      newStatus: report.status
    });

    return { success: true, status: report.status };
  }

  /**
   * Resolve a grief report with a guilt determination.
   * Optionally triggers rollback (if griefType supports it).
   * @param {object} state
   * @param {string} reportId
   * @param {boolean} guilty
   * @param {number} currentTick
   * @returns {{success: boolean, restitution: object|null, rollback: boolean}}
   */
  function resolveReport(state, reportId, guilty, currentTick) {
    if (!state || !reportId) {
      return { success: false, restitution: null, rollback: false, error: 'Missing required fields' };
    }

    var report = findReport(state, reportId);
    if (!report) {
      return { success: false, restitution: null, rollback: false, error: 'Report not found: ' + reportId };
    }

    if (report.status === REPORT_STATUS.RESOLVED || report.status === REPORT_STATUS.DISMISSED) {
      return { success: false, restitution: null, rollback: false, error: 'Report already closed' };
    }

    report.status = REPORT_STATUS.RESOLVED;
    report.guilty = guilty;
    report.resolvedAt = currentTick || 0;
    report.updatedAt = currentTick || 0;

    var restitution = null;
    var rollback = false;

    if (guilty) {
      // Update reporter stats
      var reporterStats = getPlayerStats(state, report.reporterId);
      reporterStats.stats.grief_reports_resolved++;
      reporterStats.stats.grief_reports_won++;

      // Create automatic restitution order if griefer identified
      if (report.targetId && report.lossValue > 0) {
        var order = {
          id: nextRestitutionId(),
          reportId: reportId,
          grieferId: report.targetId,
          victimId: report.reporterId,
          amount: report.lossValue,
          paid: 0,
          remaining: report.lossValue,
          status: 'pending',
          createdAt: currentTick || 0,
          updatedAt: currentTick || 0
        };
        state.restitutions.push(order);
        report.restitutionOrderId = order.id;
        restitution = order;
      }

      // Check rollback eligibility
      var typeDef = findGriefType(report.griefType);
      if (typeDef && typeDef.rollbackEligible) {
        report.rollbackApplied = true;
        rollback = true;
      }
    }

    state.griefLog.push({
      tick: currentTick || 0,
      type: 'report_resolved',
      reportId: reportId,
      guilty: guilty,
      rollback: rollback
    });

    return { success: true, restitution: restitution, rollback: rollback };
  }

  /**
   * Dismiss a grief report.
   * @param {object} state
   * @param {string} reportId
   * @param {string} reason
   * @param {number} currentTick
   * @returns {{success: boolean}}
   */
  function dismissReport(state, reportId, reason, currentTick) {
    if (!state || !reportId) {
      return { success: false, error: 'Missing required fields' };
    }

    var report = findReport(state, reportId);
    if (!report) {
      return { success: false, error: 'Report not found: ' + reportId };
    }

    if (report.status === REPORT_STATUS.RESOLVED || report.status === REPORT_STATUS.DISMISSED) {
      return { success: false, error: 'Report already closed' };
    }

    report.status = REPORT_STATUS.DISMISSED;
    report.resolvedAt = currentTick || 0;
    report.updatedAt = currentTick || 0;
    report.notes.push({ type: 'dismissal', reason: reason || 'No reason given', tick: currentTick || 0 });

    state.griefLog.push({
      tick: currentTick || 0,
      type: 'report_dismissed',
      reportId: reportId,
      reason: reason || 'No reason given'
    });

    return { success: true };
  }

  /**
   * Get a single report by ID.
   * @param {object} state
   * @param {string} reportId
   * @returns {object|null}
   */
  function getReport(state, reportId) {
    if (!state || !reportId) return null;
    return findReport(state, reportId);
  }

  /**
   * Get all reports filed by a specific player.
   * @param {object} state
   * @param {string} reporterId
   * @returns {Array}
   */
  function getReportsByReporter(state, reporterId) {
    if (!state || !reporterId || !state.reports) return [];
    var result = [];
    for (var i = 0; i < state.reports.length; i++) {
      if (state.reports[i].reporterId === reporterId) {
        result.push(state.reports[i]);
      }
    }
    return result;
  }

  /**
   * Get all reports filed against a specific player.
   * @param {object} state
   * @param {string} targetId
   * @returns {Array}
   */
  function getReportsByTarget(state, targetId) {
    if (!state || !targetId || !state.reports) return [];
    var result = [];
    for (var i = 0; i < state.reports.length; i++) {
      if (state.reports[i].targetId === targetId) {
        result.push(state.reports[i]);
      }
    }
    return result;
  }

  /**
   * Get all reports that are not yet resolved or dismissed.
   * @param {object} state
   * @returns {Array}
   */
  function getActiveReports(state) {
    if (!state || !state.reports) return [];
    var result = [];
    for (var i = 0; i < state.reports.length; i++) {
      var s = state.reports[i].status;
      if (s !== REPORT_STATUS.RESOLVED && s !== REPORT_STATUS.DISMISSED) {
        result.push(state.reports[i]);
      }
    }
    return result;
  }

  /**
   * Purchase grief insurance for a specific asset.
   * Cost = 1% of asset value (per 100 ticks).
   * @param {object} state
   * @param {string} playerId
   * @param {string} assetType
   * @param {number} assetValue
   * @param {number} currentTick
   * @returns {{success: boolean, policy: object|null, cost: number}}
   */
  function purchaseInsurance(state, playerId, assetType, assetValue, currentTick) {
    if (!state || !playerId || !assetType) {
      return { success: false, policy: null, cost: 0, error: 'Missing required fields' };
    }

    if (typeof assetValue !== 'number' || assetValue <= 0) {
      return { success: false, policy: null, cost: 0, error: 'Invalid asset value' };
    }

    if (!state.insurance[playerId]) {
      state.insurance[playerId] = [];
    }

    var cost = Math.ceil(assetValue * INSURANCE_RATE);

    var policy = {
      id: nextPolicyId(),
      playerId: playerId,
      assetType: assetType,
      assetValue: assetValue,
      cost: cost,
      payoutRate: INSURANCE_PAYOUT_RATE,
      status: 'active',
      purchasedAt: currentTick || 0,
      claimedAt: null,
      payout: 0
    };

    state.insurance[playerId].push(policy);

    // Track achievement stat
    var playerRecord = getPlayerStats(state, playerId);
    playerRecord.stats.insurance_policies_purchased++;

    state.griefLog.push({
      tick: currentTick || 0,
      type: 'insurance_purchased',
      playerId: playerId,
      policyId: policy.id,
      assetType: assetType,
      cost: cost
    });

    return { success: true, policy: policy, cost: cost };
  }

  /**
   * Claim an insurance policy after a loss.
   * Pays out 80% of the insured asset value.
   * @param {object} state
   * @param {string} playerId
   * @param {string} policyId
   * @param {number} currentTick
   * @returns {{success: boolean, payout: number}}
   */
  function claimInsurance(state, playerId, policyId, currentTick) {
    if (!state || !playerId || !policyId) {
      return { success: false, payout: 0, error: 'Missing required fields' };
    }

    var policy = findPolicy(state, playerId, policyId);
    if (!policy) {
      return { success: false, payout: 0, error: 'Policy not found: ' + policyId };
    }

    if (policy.status !== 'active') {
      return { success: false, payout: 0, error: 'Policy is not active (status: ' + policy.status + ')' };
    }

    var payout = Math.floor(policy.assetValue * policy.payoutRate);

    policy.status = 'claimed';
    policy.claimedAt = currentTick || 0;
    policy.payout = payout;

    state.griefLog.push({
      tick: currentTick || 0,
      type: 'insurance_claimed',
      playerId: playerId,
      policyId: policyId,
      payout: payout
    });

    return { success: true, payout: payout };
  }

  /**
   * Get all insurance policies for a player.
   * @param {object} state
   * @param {string} playerId
   * @returns {Array}
   */
  function getInsurance(state, playerId) {
    if (!state || !playerId || !state.insurance) return [];
    return state.insurance[playerId] || [];
  }

  /**
   * Check if a player has active insurance covering a given asset type.
   * @param {object} state
   * @param {string} playerId
   * @param {string} assetType
   * @returns {boolean}
   */
  function isInsured(state, playerId, assetType) {
    if (!state || !playerId || !assetType) return false;
    var policies = getInsurance(state, playerId);
    for (var i = 0; i < policies.length; i++) {
      if (policies[i].assetType === assetType && policies[i].status === 'active') {
        return true;
      }
    }
    return false;
  }

  /**
   * Create a manual restitution order for a confirmed griefer.
   * @param {object} state
   * @param {string} reportId
   * @param {string} grieferId
   * @param {number} amount
   * @param {number} currentTick
   * @returns {{success: boolean, order: object|null}}
   */
  function orderRestitution(state, reportId, grieferId, amount, currentTick) {
    if (!state || !reportId || !grieferId) {
      return { success: false, order: null, error: 'Missing required fields' };
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return { success: false, order: null, error: 'Invalid amount' };
    }

    var report = findReport(state, reportId);
    if (!report) {
      return { success: false, order: null, error: 'Report not found: ' + reportId };
    }

    var order = {
      id: nextRestitutionId(),
      reportId: reportId,
      grieferId: grieferId,
      victimId: report.reporterId,
      amount: amount,
      paid: 0,
      remaining: amount,
      status: 'pending',
      createdAt: currentTick || 0,
      updatedAt: currentTick || 0
    };

    state.restitutions.push(order);

    if (!report.restitutionOrderId) {
      report.restitutionOrderId = order.id;
    }

    state.griefLog.push({
      tick: currentTick || 0,
      type: 'restitution_ordered',
      orderId: order.id,
      grieferId: grieferId,
      amount: amount
    });

    return { success: true, order: order };
  }

  /**
   * Record a payment toward a restitution order.
   * @param {object} state
   * @param {string} orderId
   * @param {number} amount
   * @param {number} currentTick
   * @returns {{success: boolean, remaining: number}}
   */
  function payRestitution(state, orderId, amount, currentTick) {
    if (!state || !orderId) {
      return { success: false, remaining: 0, error: 'Missing required fields' };
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return { success: false, remaining: 0, error: 'Invalid payment amount' };
    }

    var order = findRestitution(state, orderId);
    if (!order) {
      return { success: false, remaining: 0, error: 'Restitution order not found: ' + orderId };
    }

    if (order.status === 'paid') {
      return { success: false, remaining: 0, error: 'Order already fully paid' };
    }

    var payment = Math.min(amount, order.remaining);
    order.paid += payment;
    order.remaining -= payment;
    order.updatedAt = currentTick || 0;

    if (order.remaining <= 0) {
      order.remaining = 0;
      order.status = 'paid';
    }

    state.griefLog.push({
      tick: currentTick || 0,
      type: 'restitution_paid',
      orderId: orderId,
      payment: payment,
      remaining: order.remaining
    });

    return { success: true, remaining: order.remaining };
  }

  /**
   * Get all restitution orders related to a player (as griefer or victim).
   * @param {object} state
   * @param {string} playerId
   * @returns {Array}
   */
  function getRestitutions(state, playerId) {
    if (!state || !playerId || !state.restitutions) return [];
    var result = [];
    for (var i = 0; i < state.restitutions.length; i++) {
      var r = state.restitutions[i];
      if (r.grieferId === playerId || r.victimId === playerId) {
        result.push(r);
      }
    }
    return result;
  }

  /**
   * Call the grief hotline for comfort.
   * Awards HOTLINE_SPARK_AWARD Spark on a cooldown.
   * @param {object} state
   * @param {string} playerId
   * @param {number} currentTick
   * @returns {{success: boolean, sparkAwarded: number, message: string}}
   */
  function callHotline(state, playerId, currentTick) {
    if (!state || !playerId) {
      return { success: false, sparkAwarded: 0, message: '', error: 'Missing required fields' };
    }

    var tick = currentTick || 0;

    // Find last hotline call for this player
    var lastCall = null;
    for (var i = state.griefLog.length - 1; i >= 0; i--) {
      var entry = state.griefLog[i];
      if (entry.type === 'hotline_call' && entry.playerId === playerId) {
        lastCall = entry;
        break;
      }
    }

    var onCooldown = lastCall && (tick - lastCall.tick < HOTLINE_COOLDOWN_TICKS);
    var sparkAwarded = onCooldown ? 0 : HOTLINE_SPARK_AWARD;

    var message = pickComfortMessage(playerId, tick);

    state.griefLog.push({
      tick: tick,
      type: 'hotline_call',
      playerId: playerId,
      sparkAwarded: sparkAwarded
    });

    return { success: true, sparkAwarded: sparkAwarded, message: message };
  }

  /**
   * Check and award grief-related achievements for a player.
   * @param {object} state
   * @param {string} playerId
   * @returns {Array} — newly earned achievements
   */
  function checkAchievements(state, playerId) {
    if (!state || !playerId) return [];

    var playerRecord = getPlayerStats(state, playerId);
    var newlyEarned = [];

    for (var i = 0; i < ACHIEVEMENTS.length; i++) {
      var ach = ACHIEVEMENTS[i];

      // Already unlocked?
      if (playerRecord.unlocked.indexOf(ach.id) !== -1) continue;

      // Prerequisite check
      if (ach.prerequisite && playerRecord.unlocked.indexOf(ach.prerequisite) === -1) continue;

      // Criteria check
      var earned = false;
      if (ach.criteria.type === 'counter') {
        var statVal = playerRecord.stats[ach.criteria.stat] || 0;
        earned = statVal >= ach.criteria.target;
      }

      if (earned) {
        playerRecord.unlocked.push(ach.id);
        newlyEarned.push({
          achievementId: ach.id,
          name: ach.name,
          reward: ach.reward,
          earnedBy: playerId
        });
      }
    }

    return newlyEarned;
  }

  /**
   * Join the support network as a mentor for grief victims.
   * Requires at least one resolved report as a victim.
   * @param {object} state
   * @param {string} playerId
   * @param {number} currentTick
   * @returns {{success: boolean}}
   */
  function joinSupportNetwork(state, playerId, currentTick) {
    if (!state || !playerId) {
      return { success: false, error: 'Missing required fields' };
    }

    // Check if already a member
    for (var i = 0; i < state.supportNetwork.length; i++) {
      if (state.supportNetwork[i].playerId === playerId) {
        return { success: false, error: 'Already in support network' };
      }
    }

    // Verify player has experienced grief (has at least one report as reporter)
    var playerReports = getReportsByReporter(state, playerId);
    var hasResolvedReport = false;
    for (var j = 0; j < playerReports.length; j++) {
      if (playerReports[j].status === REPORT_STATUS.RESOLVED) {
        hasResolvedReport = true;
        break;
      }
    }

    if (!hasResolvedReport) {
      return { success: false, error: 'Must have a resolved grief report to join the support network' };
    }

    state.supportNetwork.push({
      playerId: playerId,
      joinedAt: currentTick || 0,
      menteeCount: 0,
      active: true
    });

    state.griefLog.push({
      tick: currentTick || 0,
      type: 'support_network_joined',
      playerId: playerId
    });

    return { success: true };
  }

  /**
   * Get all active support mentors.
   * @param {object} state
   * @returns {Array}
   */
  function getSupportMentors(state) {
    if (!state || !state.supportNetwork) return [];
    var result = [];
    for (var i = 0; i < state.supportNetwork.length; i++) {
      if (state.supportNetwork[i].active) {
        result.push(state.supportNetwork[i]);
      }
    }
    return result;
  }

  /**
   * Get global grief statistics.
   * @param {object} state
   * @returns {object}
   */
  function getGriefStats(state) {
    if (!state) {
      return {
        totalReports: 0,
        openReports: 0,
        resolvedReports: 0,
        dismissedReports: 0,
        guiltyFindings: 0,
        totalLossValue: 0,
        totalRestitutionOrdered: 0,
        totalRestitutionPaid: 0,
        totalPolicies: 0,
        totalPayouts: 0,
        supportNetworkSize: 0,
        reportsByType: {}
      };
    }

    var stats = {
      totalReports: 0,
      openReports: 0,
      resolvedReports: 0,
      dismissedReports: 0,
      guiltyFindings: 0,
      totalLossValue: 0,
      totalRestitutionOrdered: 0,
      totalRestitutionPaid: 0,
      totalPolicies: 0,
      totalPayouts: 0,
      supportNetworkSize: 0,
      reportsByType: {}
    };

    for (var i = 0; i < (state.reports || []).length; i++) {
      var r = state.reports[i];
      stats.totalReports++;
      stats.totalLossValue += r.lossValue || 0;

      if (!stats.reportsByType[r.griefType]) stats.reportsByType[r.griefType] = 0;
      stats.reportsByType[r.griefType]++;

      if (r.status === REPORT_STATUS.RESOLVED) {
        stats.resolvedReports++;
        if (r.guilty) stats.guiltyFindings++;
      } else if (r.status === REPORT_STATUS.DISMISSED) {
        stats.dismissedReports++;
      } else {
        stats.openReports++;
      }
    }

    for (var j = 0; j < (state.restitutions || []).length; j++) {
      var rst = state.restitutions[j];
      stats.totalRestitutionOrdered += rst.amount || 0;
      stats.totalRestitutionPaid += rst.paid || 0;
    }

    var playerIds = Object.keys(state.insurance || {});
    for (var k = 0; k < playerIds.length; k++) {
      var policies = state.insurance[playerIds[k]];
      for (var m = 0; m < policies.length; m++) {
        stats.totalPolicies++;
        if (policies[m].status === 'claimed') {
          stats.totalPayouts += policies[m].payout || 0;
        }
      }
    }

    stats.supportNetworkSize = (state.supportNetwork || []).length;

    return stats;
  }

  /**
   * Get a player's complete grief history.
   * @param {object} state
   * @param {string} playerId
   * @returns {object}
   */
  function getPlayerGriefRecord(state, playerId) {
    if (!state || !playerId) {
      return {
        reportsFiledByPlayer: [],
        reportsAgainstPlayer: [],
        insurance: [],
        restitutions: [],
        supportNetworkMember: false,
        achievements: [],
        hotlineCalls: 0
      };
    }

    var reportsFiledByPlayer = getReportsByReporter(state, playerId);
    var reportsAgainstPlayer = getReportsByTarget(state, playerId);
    var insurance = getInsurance(state, playerId);
    var restitutions = getRestitutions(state, playerId);

    var supportNetworkMember = false;
    for (var i = 0; i < (state.supportNetwork || []).length; i++) {
      if (state.supportNetwork[i].playerId === playerId) {
        supportNetworkMember = true;
        break;
      }
    }

    var playerRecord = state.achievements[playerId] || { unlocked: [], stats: {} };

    var hotlineCalls = 0;
    for (var j = 0; j < (state.griefLog || []).length; j++) {
      if (state.griefLog[j].type === 'hotline_call' && state.griefLog[j].playerId === playerId) {
        hotlineCalls++;
      }
    }

    return {
      reportsFiledByPlayer: reportsFiledByPlayer,
      reportsAgainstPlayer: reportsAgainstPlayer,
      insurance: insurance,
      restitutions: restitutions,
      supportNetworkMember: supportNetworkMember,
      achievements: playerRecord.unlocked,
      hotlineCalls: hotlineCalls
    };
  }

  // ---------------------------------------------------------------------------
  // EXPORTS
  // ---------------------------------------------------------------------------

  exports.GRIEF_TYPES = GRIEF_TYPES;
  exports.ACHIEVEMENTS = ACHIEVEMENTS;
  exports.REPORT_STATUS = REPORT_STATUS;
  exports.INSURANCE_RATE = INSURANCE_RATE;
  exports.INSURANCE_PAYOUT_RATE = INSURANCE_PAYOUT_RATE;
  exports.HOTLINE_SPARK_AWARD = HOTLINE_SPARK_AWARD;

  exports.createState = createState;
  exports.fileReport = fileReport;
  exports.investigateReport = investigateReport;
  exports.resolveReport = resolveReport;
  exports.dismissReport = dismissReport;
  exports.getReport = getReport;
  exports.getReportsByReporter = getReportsByReporter;
  exports.getReportsByTarget = getReportsByTarget;
  exports.getActiveReports = getActiveReports;
  exports.purchaseInsurance = purchaseInsurance;
  exports.claimInsurance = claimInsurance;
  exports.getInsurance = getInsurance;
  exports.isInsured = isInsured;
  exports.orderRestitution = orderRestitution;
  exports.payRestitution = payRestitution;
  exports.getRestitutions = getRestitutions;
  exports.callHotline = callHotline;
  exports.checkAchievements = checkAchievements;
  exports.joinSupportNetwork = joinSupportNetwork;
  exports.getSupportMentors = getSupportMentors;
  exports.getGriefStats = getGriefStats;
  exports.getPlayerGriefRecord = getPlayerGriefRecord;

})(typeof module !== 'undefined' ? module.exports : (window.GriefRecovery = {}));
