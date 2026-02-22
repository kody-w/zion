// bounty_board.js
/**
 * ZION Bounty Board — Async Conflict Resolution System
 * Players post bounties against rule-breakers; hunters gather evidence;
 * judge NPCs render verdicts; guilty parties pay restitution or face penalties.
 *
 * Bounty lifecycle: posted → accepted → investigating → evidence_submitted → judged → resolved/expired
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
  // BOUNTY TYPE DEFINITIONS
  // ---------------------------------------------------------------------------

  var BOUNTY_TYPES = [
    {
      id: 'locate_item',
      name: 'Locate Item',
      description: 'Find and recover a stolen or missing resource',
      postCost: 50,
      minReward: 100,
      maxReward: 2000,
      expiryTicks: 700,
      evidenceRequired: 2,
      judgeCount: 3,
      treasuryBonus: 0.2,
      penaltyMultiplier: 1.5,
      allowSelfTarget: false
    },
    {
      id: 'investigation',
      name: 'Investigation',
      description: 'Gather evidence to prove guilt of a rule-breaker',
      postCost: 75,
      minReward: 150,
      maxReward: 3000,
      expiryTicks: 700,
      evidenceRequired: 3,
      judgeCount: 3,
      treasuryBonus: 0.15,
      penaltyMultiplier: 2.0,
      allowSelfTarget: false
    },
    {
      id: 'restitution',
      name: 'Restitution',
      description: 'Force a player to repay damages or stolen goods',
      postCost: 100,
      minReward: 200,
      maxReward: 5000,
      expiryTicks: 700,
      evidenceRequired: 2,
      judgeCount: 3,
      treasuryBonus: 0.1,
      penaltyMultiplier: 2.5,
      allowSelfTarget: false
    },
    {
      id: 'apology',
      name: 'Public Apology',
      description: 'Require a player to issue a formal public statement of apology',
      postCost: 25,
      minReward: 50,
      maxReward: 500,
      expiryTicks: 700,
      evidenceRequired: 1,
      judgeCount: 3,
      treasuryBonus: 0.05,
      penaltyMultiplier: 1.0,
      allowSelfTarget: false
    },
    {
      id: 'challenge',
      name: 'Formal Challenge',
      description: 'Issue a formal duel challenge; target may opt in or forfeit',
      postCost: 50,
      minReward: 100,
      maxReward: 1000,
      expiryTicks: 700,
      evidenceRequired: 0,
      judgeCount: 1,
      treasuryBonus: 0.25,
      penaltyMultiplier: 1.2,
      allowSelfTarget: false
    }
  ];

  // ---------------------------------------------------------------------------
  // INTERNAL COUNTERS
  // ---------------------------------------------------------------------------

  var bountyCounter = 0;
  var evidenceCounter = 0;
  var verdictCounter = 0;

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Find a bounty type definition by id.
   * @param {string} typeId
   * @returns {object|null}
   */
  function findBountyType(typeId) {
    for (var i = 0; i < BOUNTY_TYPES.length; i++) {
      if (BOUNTY_TYPES[i].id === typeId) return BOUNTY_TYPES[i];
    }
    return null;
  }

  /**
   * Get a bounty object by id from state.
   * @param {object} state
   * @param {string} bountyId
   * @returns {object|null}
   */
  function getBountyById(state, bountyId) {
    for (var i = 0; i < state.bounties.length; i++) {
      if (state.bounties[i].id === bountyId) return state.bounties[i];
    }
    return null;
  }

  /**
   * Determine the next lifecycle status for a bounty.
   * @param {object} bounty
   * @param {object} typeDef
   * @returns {string}
   */
  function computeNextStatus(bounty, typeDef, evidenceList) {
    if (evidenceList.length >= typeDef.evidenceRequired) {
      return 'evidence_submitted';
    }
    if (bounty.hunterId) {
      return 'investigating';
    }
    return 'posted';
  }

  /**
   * Tally evidence: count clue/witness/log_entry types and
   * return a simple majority guilty/not-guilty assessment.
   * @param {Array} evidenceList
   * @param {number} seed
   * @returns {{guilty: boolean, confidence: number, votes: number}}
   */
  function tallyEvidence(evidenceList, seed) {
    var rand = mulberry32(seed || 1);
    var guiltyVotes = 0;
    var totalVotes = 0;

    for (var i = 0; i < evidenceList.length; i++) {
      var ev = evidenceList[i];
      var weight = 1;
      if (ev.type === 'witness') weight = 2;
      if (ev.type === 'log_entry') weight = 3;

      // Each evidence piece contributes weighted votes with slight random noise
      var noise = (rand() - 0.5) * 0.1;
      var guiltScore = Math.min(1, Math.max(0, (ev.guiltScore || 0.5) + noise));
      guiltyVotes += weight * guiltScore;
      totalVotes += weight;
    }

    if (totalVotes === 0) {
      return { guilty: false, confidence: 0, votes: 0 };
    }

    var ratio = guiltyVotes / totalVotes;
    return {
      guilty: ratio > 0.5,
      confidence: Math.round(ratio * 100) / 100,
      votes: totalVotes
    };
  }

  // ---------------------------------------------------------------------------
  // PUBLIC API
  // ---------------------------------------------------------------------------

  /**
   * Create a fresh bounty board state.
   * @returns {object}
   */
  function createState() {
    return {
      bounties: [],
      evidence: {},
      verdicts: [],
      hunterStats: {},
      bountyLog: []
    };
  }

  /**
   * Post a new bounty on the board.
   * @param {object} state        - Bounty board state (mutated)
   * @param {string} posterId     - Player posting the bounty
   * @param {string} targetId     - Player targeted by bounty
   * @param {string} bountyType   - One of BOUNTY_TYPES ids
   * @param {string} description  - Description of the grievance
   * @param {number} reward       - Reward offered (spark)
   * @param {number} currentTick  - Current game tick
   * @returns {{success: boolean, bounty?: object, cost?: number, error?: string}}
   */
  function postBounty(state, posterId, targetId, bountyType, description, reward, currentTick) {
    if (!posterId) return { success: false, error: 'posterId is required' };
    if (!targetId) return { success: false, error: 'targetId is required' };
    if (!bountyType) return { success: false, error: 'bountyType is required' };
    if (!description) return { success: false, error: 'description is required' };

    var typeDef = findBountyType(bountyType);
    if (!typeDef) return { success: false, error: 'Unknown bounty type: ' + bountyType };

    if (posterId === targetId && !typeDef.allowSelfTarget) {
      return { success: false, error: 'Cannot post a bounty against yourself' };
    }

    var rewardAmt = reward || 0;
    if (rewardAmt < typeDef.minReward) {
      return { success: false, error: 'Reward ' + rewardAmt + ' is below minimum ' + typeDef.minReward + ' for ' + bountyType };
    }
    if (rewardAmt > typeDef.maxReward) {
      return { success: false, error: 'Reward ' + rewardAmt + ' exceeds maximum ' + typeDef.maxReward + ' for ' + bountyType };
    }

    var bountyId = 'bounty_' + (++bountyCounter) + '_' + currentTick;
    var expiresAt = (currentTick || 0) + typeDef.expiryTicks;

    var bounty = {
      id: bountyId,
      type: bountyType,
      posterId: posterId,
      targetId: targetId,
      hunterId: null,
      description: description,
      reward: rewardAmt,
      cost: typeDef.postCost,
      status: 'posted',
      postedAt: currentTick || 0,
      acceptedAt: null,
      resolvedAt: null,
      expiresAt: expiresAt,
      verdictId: null,
      guilty: null,
      penalty: 0,
      treasuryBonus: Math.floor(rewardAmt * typeDef.treasuryBonus),
      cancelled: false
    };

    state.bounties.push(bounty);
    state.evidence[bountyId] = [];

    state.bountyLog.push({
      tick: currentTick || 0,
      event: 'posted',
      bountyId: bountyId,
      posterId: posterId,
      targetId: targetId,
      type: bountyType
    });

    return { success: true, bounty: bounty, cost: typeDef.postCost };
  }

  /**
   * Accept a bounty for hunting (investigating and gathering evidence).
   * @param {object} state
   * @param {string} bountyId
   * @param {string} hunterId    - Player accepting the bounty
   * @param {number} currentTick
   * @returns {{success: boolean, bounty?: object, error?: string}}
   */
  function acceptBounty(state, bountyId, hunterId, currentTick) {
    if (!bountyId) return { success: false, error: 'bountyId is required' };
    if (!hunterId) return { success: false, error: 'hunterId is required' };

    var bounty = getBountyById(state, bountyId);
    if (!bounty) return { success: false, error: 'Bounty not found: ' + bountyId };

    if (bounty.status !== 'posted') {
      return { success: false, error: 'Bounty is not in posted status (current: ' + bounty.status + ')' };
    }

    if (bounty.posterId === hunterId) {
      return { success: false, error: 'Poster cannot be their own hunter' };
    }

    if (bounty.targetId === hunterId) {
      return { success: false, error: 'Target cannot accept their own bounty' };
    }

    if (currentTick >= bounty.expiresAt) {
      return { success: false, error: 'Bounty has expired' };
    }

    bounty.hunterId = hunterId;
    bounty.status = 'investigating';
    bounty.acceptedAt = currentTick || 0;

    state.bountyLog.push({
      tick: currentTick || 0,
      event: 'accepted',
      bountyId: bountyId,
      hunterId: hunterId
    });

    return { success: true, bounty: bounty };
  }

  /**
   * Submit a piece of evidence for a bounty.
   * @param {object} state
   * @param {string} bountyId
   * @param {string} hunterId       - Player submitting the evidence
   * @param {string} evidenceType   - 'clue' | 'witness' | 'log_entry'
   * @param {string} description
   * @param {number} currentTick
   * @returns {{success: boolean, evidence?: object, error?: string}}
   */
  function submitEvidence(state, bountyId, hunterId, evidenceType, description, currentTick) {
    if (!bountyId) return { success: false, error: 'bountyId is required' };
    if (!hunterId) return { success: false, error: 'hunterId is required' };
    if (!evidenceType) return { success: false, error: 'evidenceType is required' };
    if (!description) return { success: false, error: 'description is required' };

    var validTypes = ['clue', 'witness', 'log_entry'];
    var typeIdx = -1;
    for (var vi = 0; vi < validTypes.length; vi++) {
      if (validTypes[vi] === evidenceType) { typeIdx = vi; break; }
    }
    if (typeIdx === -1) {
      return { success: false, error: 'Invalid evidence type: ' + evidenceType + '. Must be clue, witness, or log_entry' };
    }

    var bounty = getBountyById(state, bountyId);
    if (!bounty) return { success: false, error: 'Bounty not found: ' + bountyId };

    if (bounty.status === 'resolved' || bounty.status === 'expired') {
      return { success: false, error: 'Cannot submit evidence to a ' + bounty.status + ' bounty' };
    }

    if (bounty.status === 'judged') {
      return { success: false, error: 'Bounty is already judged' };
    }

    // Poster, hunter, or any participant can submit evidence
    // (hunters are primary, but witnesses can also submit)
    if (!state.evidence[bountyId]) {
      state.evidence[bountyId] = [];
    }

    // guilt score: log_entry=0.8, witness=0.65, clue=0.5 as defaults
    var defaultGuiltScore = evidenceType === 'log_entry' ? 0.8 :
                            evidenceType === 'witness' ? 0.65 : 0.5;

    var evidenceId = 'evidence_' + (++evidenceCounter) + '_' + currentTick;
    var evidence = {
      id: evidenceId,
      bountyId: bountyId,
      submittedBy: hunterId,
      type: evidenceType,
      description: description,
      guiltScore: defaultGuiltScore,
      submittedAt: currentTick || 0
    };

    state.evidence[bountyId].push(evidence);

    // Check if evidence threshold is now met
    var typeDef = findBountyType(bounty.type);
    if (typeDef && state.evidence[bountyId].length >= typeDef.evidenceRequired &&
        bounty.status === 'investigating') {
      bounty.status = 'evidence_submitted';
    }

    state.bountyLog.push({
      tick: currentTick || 0,
      event: 'evidence_submitted',
      bountyId: bountyId,
      evidenceId: evidenceId,
      hunterId: hunterId,
      evidenceType: evidenceType
    });

    return { success: true, evidence: evidence };
  }

  /**
   * Get all evidence for a bounty.
   * @param {object} state
   * @param {string} bountyId
   * @returns {Array}
   */
  function getEvidence(state, bountyId) {
    return (state.evidence && state.evidence[bountyId]) ? state.evidence[bountyId] : [];
  }

  /**
   * Request a verdict from the judge NPCs.
   * Majority evidence vote determines guilt.
   * @param {object} state
   * @param {string} bountyId
   * @param {number} currentTick
   * @returns {{success: boolean, verdict?: object, guilty?: boolean, confidence?: number, error?: string}}
   */
  function requestVerdict(state, bountyId, currentTick) {
    if (!bountyId) return { success: false, error: 'bountyId is required' };

    var bounty = getBountyById(state, bountyId);
    if (!bounty) return { success: false, error: 'Bounty not found: ' + bountyId };

    if (bounty.status !== 'evidence_submitted' && bounty.status !== 'investigating') {
      return { success: false, error: 'Bounty must be in investigating or evidence_submitted status (current: ' + bounty.status + ')' };
    }

    var typeDef = findBountyType(bounty.type);
    var evidenceList = state.evidence[bountyId] || [];

    // For challenge type, no evidence needed — verdict is always a draw/accept
    if (typeDef && typeDef.evidenceRequired === 0) {
      var challengeVerdictId = 'verdict_' + (++verdictCounter) + '_' + currentTick;
      var challengeVerdict = {
        id: challengeVerdictId,
        bountyId: bountyId,
        guilty: false,
        confidence: 1.0,
        evidenceCount: 0,
        judgedAt: currentTick || 0,
        judgeNpcs: ['judge_npc_1'],
        reasoning: 'Challenge bounty: target must opt-in or forfeit'
      };
      state.verdicts.push(challengeVerdict);
      bounty.status = 'judged';
      bounty.verdictId = challengeVerdictId;

      state.bountyLog.push({
        tick: currentTick || 0,
        event: 'judged',
        bountyId: bountyId,
        verdictId: challengeVerdictId,
        guilty: false
      });

      return { success: true, verdict: challengeVerdict, guilty: false, confidence: 1.0 };
    }

    if (evidenceList.length === 0) {
      return { success: false, error: 'No evidence submitted for this bounty' };
    }

    var seed = bountyId.length * 7 + (currentTick || 0);
    var tally = tallyEvidence(evidenceList, seed);

    var judgeCount = typeDef ? typeDef.judgeCount : 3;
    var judgeNpcs = [];
    for (var j = 0; j < judgeCount; j++) {
      judgeNpcs.push('judge_npc_' + (j + 1));
    }

    var verdictId = 'verdict_' + (++verdictCounter) + '_' + currentTick;
    var verdict = {
      id: verdictId,
      bountyId: bountyId,
      guilty: tally.guilty,
      confidence: tally.confidence,
      evidenceCount: evidenceList.length,
      judgedAt: currentTick || 0,
      judgeNpcs: judgeNpcs,
      reasoning: tally.guilty
        ? 'Evidence weight ' + Math.round(tally.confidence * 100) + '% indicates guilt'
        : 'Insufficient evidence (' + Math.round(tally.confidence * 100) + '%) to establish guilt'
    };

    state.verdicts.push(verdict);
    bounty.status = 'judged';
    bounty.verdictId = verdictId;

    state.bountyLog.push({
      tick: currentTick || 0,
      event: 'judged',
      bountyId: bountyId,
      verdictId: verdictId,
      guilty: tally.guilty
    });

    return { success: true, verdict: verdict, guilty: tally.guilty, confidence: tally.confidence };
  }

  /**
   * Apply a verdict and resolve the bounty.
   * Distributes reward to hunter, applies penalty to target if guilty.
   * @param {object} state
   * @param {string} bountyId
   * @param {boolean} guilty
   * @param {number} currentTick
   * @returns {{success: boolean, reward?: number, penalty?: number, bounty?: object, error?: string}}
   */
  function resolveVerdict(state, bountyId, guilty, currentTick) {
    if (!bountyId) return { success: false, error: 'bountyId is required' };
    if (typeof guilty !== 'boolean') return { success: false, error: 'guilty must be a boolean' };

    var bounty = getBountyById(state, bountyId);
    if (!bounty) return { success: false, error: 'Bounty not found: ' + bountyId };

    if (bounty.status !== 'judged') {
      return { success: false, error: 'Bounty must be judged before resolving (current: ' + bounty.status + ')' };
    }

    var typeDef = findBountyType(bounty.type);
    var penalty = 0;
    var hunterReward = 0;

    if (guilty) {
      penalty = Math.floor(bounty.reward * (typeDef ? typeDef.penaltyMultiplier : 1.5));
      hunterReward = bounty.reward + bounty.treasuryBonus;
    } else {
      // Partial reward for effort even when not guilty
      hunterReward = Math.floor(bounty.reward * 0.25);
    }

    bounty.status = 'resolved';
    bounty.guilty = guilty;
    bounty.penalty = penalty;
    bounty.resolvedAt = currentTick || 0;

    // Update hunter stats
    if (bounty.hunterId) {
      _updateHunterStats(state, bounty.hunterId, {
        completed: true,
        successful: guilty,
        reward: hunterReward,
        bountyType: bounty.type
      });
    }

    state.bountyLog.push({
      tick: currentTick || 0,
      event: 'resolved',
      bountyId: bountyId,
      guilty: guilty,
      reward: hunterReward,
      penalty: penalty,
      hunterId: bounty.hunterId,
      targetId: bounty.targetId
    });

    return { success: true, reward: hunterReward, penalty: penalty, bounty: bounty };
  }

  /**
   * Internal helper to update hunter stats.
   * @param {object} state
   * @param {string} hunterId
   * @param {object} result
   */
  function _updateHunterStats(state, hunterId, result) {
    if (!state.hunterStats[hunterId]) {
      state.hunterStats[hunterId] = {
        hunterId: hunterId,
        completed: 0,
        successful: 0,
        failed: 0,
        totalReward: 0,
        reputation: 0,
        byType: {}
      };
    }
    var stats = state.hunterStats[hunterId];
    if (result.completed) {
      stats.completed++;
      if (result.successful) {
        stats.successful++;
        stats.reputation += 10;
      } else {
        stats.failed++;
        stats.reputation += 2;
      }
      stats.totalReward += result.reward || 0;
    }
    if (result.bountyType) {
      if (!stats.byType[result.bountyType]) {
        stats.byType[result.bountyType] = { completed: 0, successful: 0 };
      }
      stats.byType[result.bountyType].completed++;
      if (result.successful) stats.byType[result.bountyType].successful++;
    }
  }

  /**
   * Expire bounties that have passed their expiryTicks without resolution.
   * @param {object} state
   * @param {number} currentTick
   * @returns {{expired: Array}}
   */
  function expireBounties(state, currentTick) {
    var expired = [];
    for (var i = 0; i < state.bounties.length; i++) {
      var bounty = state.bounties[i];
      var activeStatuses = ['posted', 'accepted', 'investigating', 'evidence_submitted'];
      var isActive = false;
      for (var a = 0; a < activeStatuses.length; a++) {
        if (bounty.status === activeStatuses[a]) { isActive = true; break; }
      }
      if (isActive && (currentTick || 0) >= bounty.expiresAt) {
        bounty.status = 'expired';
        bounty.resolvedAt = currentTick || 0;
        expired.push(bounty);

        state.bountyLog.push({
          tick: currentTick || 0,
          event: 'expired',
          bountyId: bounty.id,
          posterId: bounty.posterId,
          targetId: bounty.targetId
        });
      }
    }
    return { expired: expired };
  }

  /**
   * Get a bounty by its id.
   * @param {object} state
   * @param {string} bountyId
   * @returns {object|null}
   */
  function getBounty(state, bountyId) {
    return getBountyById(state, bountyId);
  }

  /**
   * Get all active bounties (not resolved or expired).
   * @param {object} state
   * @returns {Array}
   */
  function getActiveBounties(state) {
    var result = [];
    for (var i = 0; i < state.bounties.length; i++) {
      var b = state.bounties[i];
      if (b.status !== 'resolved' && b.status !== 'expired' && !b.cancelled) {
        result.push(b);
      }
    }
    return result;
  }

  /**
   * Get all bounties targeting a specific player.
   * @param {object} state
   * @param {string} targetId
   * @returns {Array}
   */
  function getBountiesByTarget(state, targetId) {
    var result = [];
    for (var i = 0; i < state.bounties.length; i++) {
      if (state.bounties[i].targetId === targetId) result.push(state.bounties[i]);
    }
    return result;
  }

  /**
   * Get all bounties currently being hunted by a specific hunter.
   * @param {object} state
   * @param {string} hunterId
   * @returns {Array}
   */
  function getBountiesByHunter(state, hunterId) {
    var result = [];
    for (var i = 0; i < state.bounties.length; i++) {
      if (state.bounties[i].hunterId === hunterId) result.push(state.bounties[i]);
    }
    return result;
  }

  /**
   * Get all bounties posted by a specific player.
   * @param {object} state
   * @param {string} posterId
   * @returns {Array}
   */
  function getBountiesByPoster(state, posterId) {
    var result = [];
    for (var i = 0; i < state.bounties.length; i++) {
      if (state.bounties[i].posterId === posterId) result.push(state.bounties[i]);
    }
    return result;
  }

  /**
   * Get reputation and completion stats for a hunter.
   * @param {object} state
   * @param {string} hunterId
   * @returns {object}
   */
  function getHunterStats(state, hunterId) {
    if (state.hunterStats[hunterId]) return state.hunterStats[hunterId];
    return {
      hunterId: hunterId,
      completed: 0,
      successful: 0,
      failed: 0,
      totalReward: 0,
      reputation: 0,
      byType: {}
    };
  }

  /**
   * Get the top bounty hunters by reputation.
   * @param {object} state
   * @param {number} count   - Number of hunters to return (default 10)
   * @returns {Array}
   */
  function getHunterLeaderboard(state, count) {
    var limit = count || 10;
    var hunters = [];
    var keys = Object.keys(state.hunterStats);
    for (var i = 0; i < keys.length; i++) {
      hunters.push(state.hunterStats[keys[i]]);
    }
    // Sort by reputation descending
    hunters.sort(function(a, b) {
      if (b.reputation !== a.reputation) return b.reputation - a.reputation;
      return b.successful - a.successful;
    });
    return hunters.slice(0, limit);
  }

  /**
   * Get recently resolved bounties.
   * @param {object} state
   * @param {number} count   - Number to return (default 20)
   * @returns {Array}
   */
  function getBountyHistory(state, count) {
    var limit = count || 20;
    var resolved = [];
    for (var i = 0; i < state.bounties.length; i++) {
      var b = state.bounties[i];
      if (b.status === 'resolved' || b.status === 'expired') {
        resolved.push(b);
      }
    }
    // Sort by resolvedAt descending (most recent first)
    resolved.sort(function(a, b) {
      return (b.resolvedAt || 0) - (a.resolvedAt || 0);
    });
    return resolved.slice(0, limit);
  }

  /**
   * Cancel a bounty (partial refund to poster).
   * Can only cancel own bounties that are still 'posted'.
   * @param {object} state
   * @param {string} bountyId
   * @param {string} posterId   - Must match bounty's posterId
   * @param {number} currentTick
   * @returns {{success: boolean, refund?: number, bounty?: object, error?: string}}
   */
  function cancelBounty(state, bountyId, posterId, currentTick) {
    if (!bountyId) return { success: false, error: 'bountyId is required' };
    if (!posterId) return { success: false, error: 'posterId is required' };

    var bounty = getBountyById(state, bountyId);
    if (!bounty) return { success: false, error: 'Bounty not found: ' + bountyId };

    if (bounty.posterId !== posterId) {
      return { success: false, error: 'Only the poster can cancel their own bounty' };
    }

    if (bounty.status !== 'posted') {
      return { success: false, error: 'Can only cancel a bounty in posted status (current: ' + bounty.status + ')' };
    }

    // 50% refund of reward; posting cost is non-refundable
    var refund = Math.floor(bounty.reward * 0.5);
    bounty.status = 'expired';
    bounty.cancelled = true;
    bounty.resolvedAt = currentTick || 0;

    state.bountyLog.push({
      tick: currentTick || 0,
      event: 'cancelled',
      bountyId: bountyId,
      posterId: posterId,
      refund: refund
    });

    return { success: true, refund: refund, bounty: bounty };
  }

  /**
   * Get global statistics for the bounty board.
   * @param {object} state
   * @returns {object}
   */
  function getBountyBoardStats(state) {
    var total = state.bounties.length;
    var active = 0;
    var resolved = 0;
    var expired = 0;
    var guiltyCount = 0;
    var totalRewardsIssued = 0;
    var totalPenaltiesIssued = 0;
    var byType = {};

    for (var i = 0; i < state.bounties.length; i++) {
      var b = state.bounties[i];
      if (b.status === 'resolved') {
        resolved++;
        if (b.guilty) {
          guiltyCount++;
          totalPenaltiesIssued += b.penalty || 0;
        }
        totalRewardsIssued += b.reward || 0;
      } else if (b.status === 'expired') {
        expired++;
      } else {
        active++;
      }

      if (!byType[b.type]) {
        byType[b.type] = { total: 0, resolved: 0, guilty: 0 };
      }
      byType[b.type].total++;
      if (b.status === 'resolved') byType[b.type].resolved++;
      if (b.guilty) byType[b.type].guilty++;
    }

    return {
      total: total,
      active: active,
      resolved: resolved,
      expired: expired,
      guiltyCount: guiltyCount,
      guiltRate: resolved > 0 ? Math.round((guiltyCount / resolved) * 100) / 100 : 0,
      totalRewardsIssued: totalRewardsIssued,
      totalPenaltiesIssued: totalPenaltiesIssued,
      totalHunters: Object.keys(state.hunterStats).length,
      byType: byType
    };
  }

  /**
   * Get the bounty record for a player — how many times targeted, cleared, found guilty.
   * @param {object} state
   * @param {string} playerId
   * @returns {object}
   */
  function getPlayerBountyRecord(state, playerId) {
    var timesTargeted = 0;
    var timesCleared = 0;
    var timesGuilty = 0;
    var timesPosted = 0;
    var activeAgainst = 0;

    for (var i = 0; i < state.bounties.length; i++) {
      var b = state.bounties[i];
      if (b.targetId === playerId) {
        timesTargeted++;
        if (b.status === 'resolved') {
          if (b.guilty) timesGuilty++;
          else timesCleared++;
        }
        if (b.status !== 'resolved' && b.status !== 'expired') {
          activeAgainst++;
        }
      }
      if (b.posterId === playerId) timesPosted++;
    }

    return {
      playerId: playerId,
      timesTargeted: timesTargeted,
      timesCleared: timesCleared,
      timesGuilty: timesGuilty,
      timesPosted: timesPosted,
      activeAgainst: activeAgainst,
      guiltRate: timesTargeted > 0 ? Math.round((timesGuilty / timesTargeted) * 100) / 100 : 0
    };
  }

  // ---------------------------------------------------------------------------
  // EXPORTS
  // ---------------------------------------------------------------------------

  exports.BOUNTY_TYPES = BOUNTY_TYPES;
  exports.createState = createState;
  exports.postBounty = postBounty;
  exports.acceptBounty = acceptBounty;
  exports.submitEvidence = submitEvidence;
  exports.getEvidence = getEvidence;
  exports.requestVerdict = requestVerdict;
  exports.resolveVerdict = resolveVerdict;
  exports.expireBounties = expireBounties;
  exports.getBounty = getBounty;
  exports.getActiveBounties = getActiveBounties;
  exports.getBountiesByTarget = getBountiesByTarget;
  exports.getBountiesByHunter = getBountiesByHunter;
  exports.getBountiesByPoster = getBountiesByPoster;
  exports.getHunterStats = getHunterStats;
  exports.getHunterLeaderboard = getHunterLeaderboard;
  exports.getBountyHistory = getBountyHistory;
  exports.cancelBounty = cancelBounty;
  exports.getBountyBoardStats = getBountyBoardStats;
  exports.getPlayerBountyRecord = getPlayerBountyRecord;

})(typeof module !== 'undefined' ? module.exports : (window.BountyBoard = {}));
