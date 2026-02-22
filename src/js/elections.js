// elections.js — Zone Steward Election System for ZION
// Depends on: protocol.js, zones.js
(function(exports) {
  'use strict';

  // ========================================================================
  // ELECTION CONFIG
  // ========================================================================

  var ELECTION_CONFIG = {
    termLengthMs: 7 * 24 * 60 * 60 * 1000,       // 7 days in milliseconds
    votingPeriodMs: 2 * 24 * 60 * 60 * 1000,      // 2 days voting window
    minCandidates: 1,                               // Minimum candidates to hold election
    maxStewardsPerZone: 3,                          // Top N winners become stewards
    minVisitsToVote: 5,                             // Visits needed to vote
    minVisitsToRun: 10,                             // Visits needed to run as candidate
    visitWindowMs: 30 * 24 * 60 * 60 * 1000,       // 30-day window for visit counts
    reputationToRun: ['Respected', 'Honored', 'Elder'],  // Tiers eligible to run
    historyLimit: 20                                // Max election history per zone
  };

  // ========================================================================
  // STEWARD POWERS
  // ========================================================================

  var STEWARD_POWERS = [
    {
      id: 'set_welcome',
      name: 'Set Welcome Message',
      description: 'Display a custom greeting to players entering the zone.',
      protocol: 'steward_set_welcome'
    },
    {
      id: 'set_policy',
      name: 'Set Zone Policy',
      description: 'Toggle zone policies like chat moderation and building approval.',
      protocol: 'steward_set_policy'
    },
    {
      id: 'moderate',
      name: 'Moderate Citizens',
      description: 'Warn or mute players who violate zone norms.',
      protocol: 'steward_moderate'
    },
    {
      id: 'schedule_event',
      name: 'Schedule Events',
      description: 'Add events to the zone calendar visible to all visitors.',
      protocol: 'steward_set_policy'
    },
    {
      id: 'pin_announcement',
      name: 'Pin Announcement',
      description: 'Pin a message at the top of zone chat for all to see.',
      protocol: 'steward_set_welcome'
    }
  ];

  // ========================================================================
  // INTERNAL STORAGE
  // ========================================================================

  // electionStore: electionId -> election object
  var electionStore = {};

  // stewardStore: zoneId -> steward object { playerId, electedAt, termEnds, votes, electionId }
  var stewardStore = {};

  // historyStore: zoneId -> array of past election summaries (capped at historyLimit)
  var historyStore = {};

  // visitStore: "zoneId:playerId" -> { count, lastVisit }
  var visitStore = {};

  // candidateDeclarations: "electionId:playerId" -> declared timestamp
  var candidateDeclarations = {};

  // ========================================================================
  // VISIT / ELIGIBILITY TRACKING
  // ========================================================================

  /**
   * Record a zone visit for a player (used for eligibility)
   * @param {string} zoneId
   * @param {string} playerId
   */
  function recordVisit(zoneId, playerId) {
    var key = zoneId + ':' + playerId;
    if (!visitStore[key]) {
      visitStore[key] = { count: 0, lastVisit: 0 };
    }
    visitStore[key].count++;
    visitStore[key].lastVisit = Date.now();
  }

  /**
   * Get visit record for a player in a zone
   * @param {string} zoneId
   * @param {string} playerId
   * @returns {{ count: number, lastVisit: number }}
   */
  function getVisitRecord(zoneId, playerId) {
    var key = zoneId + ':' + playerId;
    return visitStore[key] || { count: 0, lastVisit: 0 };
  }

  /**
   * Check if player meets visit threshold for a given minimum
   * @param {string} zoneId
   * @param {string} playerId
   * @param {number} minVisits
   * @returns {boolean}
   */
  function meetsVisitThreshold(zoneId, playerId, minVisits) {
    var record = getVisitRecord(zoneId, playerId);
    var now = Date.now();
    var withinWindow = (now - record.lastVisit) < ELECTION_CONFIG.visitWindowMs;
    return record.count >= minVisits && withinWindow;
  }

  /**
   * Check if player is eligible to run as candidate in a zone election
   * @param {string} playerId
   * @param {string} zoneId
   * @param {object} [playerData] - Optional object with { reputation } for tier check
   * @returns {{ eligible: boolean, reason: string }}
   */
  function isEligibleCandidate(playerId, zoneId, playerData) {
    if (!playerId || typeof playerId !== 'string') {
      return { eligible: false, reason: 'Invalid player ID' };
    }
    if (!zoneId || typeof zoneId !== 'string') {
      return { eligible: false, reason: 'Invalid zone ID' };
    }

    // Check zone exists
    var Zones = typeof window !== 'undefined' ? window.Zones : null;
    try { Zones = Zones || require('./zones'); } catch(e) {}
    if (Zones && !Zones.zoneExists(zoneId)) {
      return { eligible: false, reason: 'Zone does not exist' };
    }

    // Check visit count
    if (!meetsVisitThreshold(zoneId, playerId, ELECTION_CONFIG.minVisitsToRun)) {
      var record = getVisitRecord(zoneId, playerId);
      return {
        eligible: false,
        reason: 'Must visit this zone at least ' + ELECTION_CONFIG.minVisitsToRun +
          ' times within the last 30 days (current: ' + record.count + ')'
      };
    }

    // Check reputation tier if playerData provided
    if (playerData && playerData.reputationTier) {
      var tiers = ELECTION_CONFIG.reputationToRun;
      if (tiers.indexOf(playerData.reputationTier) === -1) {
        return {
          eligible: false,
          reason: 'Must have Respected, Honored, or Elder reputation tier to run'
        };
      }
    }

    return { eligible: true, reason: 'Eligible to run' };
  }

  /**
   * Check if player is eligible to vote in a zone election
   * @param {string} playerId
   * @param {string} zoneId
   * @returns {{ eligible: boolean, reason: string }}
   */
  function isEligibleVoter(playerId, zoneId) {
    if (!playerId || typeof playerId !== 'string') {
      return { eligible: false, reason: 'Invalid player ID' };
    }
    if (!zoneId || typeof zoneId !== 'string') {
      return { eligible: false, reason: 'Invalid zone ID' };
    }

    // Check zone exists
    var Zones = typeof window !== 'undefined' ? window.Zones : null;
    try { Zones = Zones || require('./zones'); } catch(e) {}
    if (Zones && !Zones.zoneExists(zoneId)) {
      return { eligible: false, reason: 'Zone does not exist' };
    }

    if (!meetsVisitThreshold(zoneId, playerId, ELECTION_CONFIG.minVisitsToVote)) {
      var record = getVisitRecord(zoneId, playerId);
      return {
        eligible: false,
        reason: 'Must visit this zone at least ' + ELECTION_CONFIG.minVisitsToVote +
          ' times within the last 30 days (current: ' + record.count + ')'
      };
    }

    return { eligible: true, reason: 'Eligible to vote' };
  }

  // ========================================================================
  // ELECTION LIFECYCLE
  // ========================================================================

  /**
   * Create a new election for a zone
   * @param {string} zoneId
   * @param {string[]} candidates - Array of player IDs
   * @param {object} [opts] - Optional: { startedBy, now }
   * @returns {{ success: boolean, election?: object, error?: string }}
   */
  function createElection(zoneId, candidates, opts) {
    opts = opts || {};
    var now = opts.now !== undefined ? opts.now : Date.now();

    if (!zoneId || typeof zoneId !== 'string') {
      return { success: false, error: 'Invalid zone ID' };
    }

    // Check for already-active election
    var existing = getActiveElectionForZone(zoneId, now);
    if (existing) {
      return { success: false, error: 'An election is already active for this zone' };
    }

    if (!Array.isArray(candidates)) {
      return { success: false, error: 'Candidates must be an array' };
    }

    if (candidates.length < ELECTION_CONFIG.minCandidates) {
      return {
        success: false,
        error: 'Need at least ' + ELECTION_CONFIG.minCandidates + ' candidate(s) to start election'
      };
    }

    // Deduplicate candidates
    var seen = {};
    var uniqueCandidates = [];
    for (var i = 0; i < candidates.length; i++) {
      var cid = candidates[i];
      if (cid && typeof cid === 'string' && !seen[cid]) {
        seen[cid] = true;
        uniqueCandidates.push(cid);
      }
    }

    var electionId = 'election_' + zoneId + '_' + now;
    var election = {
      id: electionId,
      zoneId: zoneId,
      startedBy: opts.startedBy || null,
      candidates: uniqueCandidates.map(function(pid) {
        return { playerId: pid, votes: 0, voters: [] };
      }),
      startTime: now,
      endTime: now + ELECTION_CONFIG.votingPeriodMs,
      status: 'active',
      totalVotes: 0
    };

    electionStore[electionId] = election;
    return { success: true, election: election };
  }

  /**
   * Declare candidacy in an active election
   * @param {string} electionId
   * @param {string} playerId
   * @returns {{ success: boolean, error?: string }}
   */
  function declareCandidacy(electionId, playerId) {
    var election = electionStore[electionId];
    if (!election) {
      return { success: false, error: 'Election not found' };
    }
    if (election.status !== 'active') {
      return { success: false, error: 'Election is not active' };
    }
    var now = Date.now();
    if (now > election.endTime) {
      return { success: false, error: 'Voting period has ended' };
    }

    // Check not already a candidate
    for (var i = 0; i < election.candidates.length; i++) {
      if (election.candidates[i].playerId === playerId) {
        return { success: false, error: 'Already a candidate in this election' };
      }
    }

    election.candidates.push({ playerId: playerId, votes: 0, voters: [] });
    candidateDeclarations[electionId + ':' + playerId] = now;
    return { success: true };
  }

  /**
   * Cast a vote in an election
   * @param {string} electionId
   * @param {string} voterId
   * @param {string} candidateId
   * @param {object} [opts] - Optional: { now }
   * @returns {{ success: boolean, error?: string }}
   */
  function castVote(electionId, voterId, candidateId, opts) {
    opts = opts || {};
    var now = opts.now !== undefined ? opts.now : Date.now();

    var election = electionStore[electionId];
    if (!election) {
      return { success: false, error: 'Election not found' };
    }
    if (election.status !== 'active') {
      return { success: false, error: 'Election is not active' };
    }
    if (now > election.endTime) {
      election.status = 'ended';
      return { success: false, error: 'Voting period has ended' };
    }

    // Check voter eligibility
    var eligibility = isEligibleVoter(voterId, election.zoneId);
    if (!eligibility.eligible) {
      return { success: false, error: eligibility.reason };
    }

    // Check voter hasn't already voted
    var alreadyVoted = false;
    for (var i = 0; i < election.candidates.length; i++) {
      if (election.candidates[i].voters.indexOf(voterId) !== -1) {
        alreadyVoted = true;
        break;
      }
    }
    if (alreadyVoted) {
      return { success: false, error: 'You have already voted in this election' };
    }

    // Find candidate
    var candidate = null;
    for (var j = 0; j < election.candidates.length; j++) {
      if (election.candidates[j].playerId === candidateId) {
        candidate = election.candidates[j];
        break;
      }
    }
    if (!candidate) {
      return { success: false, error: 'Candidate not found in this election' };
    }

    candidate.votes++;
    candidate.voters.push(voterId);
    election.totalVotes++;
    return { success: true };
  }

  /**
   * Get election results (tally votes, determine winner(s))
   * @param {object} election - Election object
   * @returns {{ winner: string|null, ranked: Array, totalVotes: number }}
   */
  function getElectionResults(election) {
    if (!election || !election.candidates) {
      return { winner: null, ranked: [], totalVotes: 0 };
    }

    var sorted = election.candidates.slice().sort(function(a, b) {
      return b.votes - a.votes;
    });

    var winner = sorted.length > 0 && sorted[0].votes > 0 ? sorted[0].playerId : null;

    return {
      winner: winner,
      ranked: sorted.map(function(c) {
        return {
          playerId: c.playerId,
          votes: c.votes,
          percentage: election.totalVotes > 0
            ? Math.round((c.votes / election.totalVotes) * 100)
            : 0
        };
      }),
      totalVotes: election.totalVotes
    };
  }

  /**
   * Finalize an election — mark complete and promote winners to stewards
   * @param {string} electionId
   * @param {object} [opts] - Optional: { now }
   * @returns {{ success: boolean, stewards?: Array, error?: string }}
   */
  function finalizeElection(electionId, opts) {
    opts = opts || {};
    var now = opts.now !== undefined ? opts.now : Date.now();

    var election = electionStore[electionId];
    if (!election) {
      return { success: false, error: 'Election not found' };
    }
    if (election.status === 'finalized') {
      return { success: false, error: 'Election already finalized' };
    }
    if (election.status !== 'active' && election.status !== 'ended') {
      return { success: false, error: 'Election cannot be finalized' };
    }
    if (now < election.endTime) {
      return { success: false, error: 'Election voting period has not ended yet' };
    }

    election.status = 'finalized';
    election.finalizedAt = now;

    var results = getElectionResults(election);
    var winners = results.ranked.slice(0, ELECTION_CONFIG.maxStewardsPerZone);

    // Install stewards for zone
    var zoneId = election.zoneId;
    if (!stewardStore[zoneId]) {
      stewardStore[zoneId] = [];
    }

    var newStewards = winners.map(function(w) {
      return {
        playerId: w.playerId,
        zoneId: zoneId,
        electionId: electionId,
        votes: w.votes,
        electedAt: now,
        termEnds: now + ELECTION_CONFIG.termLengthMs
      };
    });

    stewardStore[zoneId] = newStewards;

    // Record in history
    if (!historyStore[zoneId]) {
      historyStore[zoneId] = [];
    }
    historyStore[zoneId].unshift({
      electionId: electionId,
      zoneId: zoneId,
      startTime: election.startTime,
      endTime: election.endTime,
      finalizedAt: now,
      totalVotes: election.totalVotes,
      winner: results.winner,
      ranked: results.ranked
    });

    // Cap history
    if (historyStore[zoneId].length > ELECTION_CONFIG.historyLimit) {
      historyStore[zoneId] = historyStore[zoneId].slice(0, ELECTION_CONFIG.historyLimit);
    }

    return { success: true, stewards: newStewards, results: results };
  }

  // ========================================================================
  // QUERY FUNCTIONS
  // ========================================================================

  /**
   * Get the currently active election for a specific zone (internal helper)
   * @param {string} zoneId
   * @param {number} [now]
   * @returns {object|null}
   */
  function getActiveElectionForZone(zoneId, now) {
    now = now !== undefined ? now : Date.now();
    var keys = Object.keys(electionStore);
    for (var i = 0; i < keys.length; i++) {
      var e = electionStore[keys[i]];
      if (e.zoneId === zoneId && e.status === 'active' && e.endTime > now) {
        return e;
      }
    }
    return null;
  }

  /**
   * Get all currently active elections across all zones
   * @returns {Array} Array of active election objects
   */
  function getActiveElections() {
    var now = Date.now();
    var active = [];
    var keys = Object.keys(electionStore);
    for (var i = 0; i < keys.length; i++) {
      var e = electionStore[keys[i]];
      if (e.status === 'active' && e.endTime > now) {
        active.push(e);
      }
    }
    return active;
  }

  /**
   * Get map of zone -> current steward(s)
   * @returns {object} { zoneId: stewardObject[] }
   */
  function getCurrentStewards() {
    var now = Date.now();
    var result = {};
    var zones = Object.keys(stewardStore);
    for (var i = 0; i < zones.length; i++) {
      var zoneId = zones[i];
      var active = stewardStore[zoneId].filter(function(s) {
        return s.termEnds > now;
      });
      if (active.length > 0) {
        result[zoneId] = active;
      }
    }
    return result;
  }

  /**
   * Get stewards for a specific zone
   * @param {string} zoneId
   * @returns {Array} Active steward objects
   */
  function getZoneStewards(zoneId) {
    var now = Date.now();
    var stewards = stewardStore[zoneId] || [];
    return stewards.filter(function(s) { return s.termEnds > now; });
  }

  /**
   * Check if a player is a steward of a zone
   * @param {string} playerId
   * @param {string} zoneId
   * @returns {boolean}
   */
  function isSteward(playerId, zoneId) {
    var stewards = getZoneStewards(zoneId);
    for (var i = 0; i < stewards.length; i++) {
      if (stewards[i].playerId === playerId) return true;
    }
    return false;
  }

  /**
   * Get steward powers list
   * @returns {Array} STEWARD_POWERS array
   */
  function getStewardPowers() {
    return STEWARD_POWERS.slice();
  }

  /**
   * Get election history for a zone
   * @param {string} zoneId
   * @returns {Array} Past election summaries (newest first)
   */
  function getElectionHistory(zoneId) {
    return (historyStore[zoneId] || []).slice();
  }

  /**
   * Calculate days/hours remaining in a steward's term
   * @param {object} steward - Steward object with termEnds timestamp
   * @returns {{ days: number, hours: number, totalMs: number, expired: boolean }}
   */
  function calculateTermRemaining(steward) {
    if (!steward || typeof steward.termEnds !== 'number') {
      return { days: 0, hours: 0, totalMs: 0, expired: true };
    }
    var now = Date.now();
    var remaining = steward.termEnds - now;
    if (remaining <= 0) {
      return { days: 0, hours: 0, totalMs: 0, expired: true };
    }
    var days = Math.floor(remaining / 86400000);
    var hours = Math.floor((remaining % 86400000) / 3600000);
    return { days: days, hours: hours, totalMs: remaining, expired: false };
  }

  /**
   * Format an election for display in the HUD
   * @param {object} election
   * @returns {object} Display-ready election card data
   */
  function formatElectionCard(election) {
    if (!election) return null;

    var now = Date.now();
    var msLeft = election.endTime - now;
    var hoursLeft = Math.max(0, Math.floor(msLeft / 3600000));
    var minutesLeft = Math.max(0, Math.floor((msLeft % 3600000) / 60000));

    var results = getElectionResults(election);

    return {
      id: election.id,
      zoneId: election.zoneId,
      status: election.status,
      timeLeft: msLeft > 0 ? (hoursLeft + 'h ' + minutesLeft + 'm remaining') : 'Voting ended',
      hoursLeft: hoursLeft,
      totalVotes: election.totalVotes,
      candidates: results.ranked,
      winner: results.winner,
      startTime: new Date(election.startTime).toLocaleDateString(),
      endTime: new Date(election.endTime).toLocaleDateString()
    };
  }

  // ========================================================================
  // STATE INTEGRATION (apply protocol messages to elections state)
  // ========================================================================

  /**
   * Apply an election_start protocol message
   * @param {object} msg - Protocol message { from, payload: { zone } }
   * @param {object} [opts] - Optional: { now }
   * @returns {{ success: boolean, election?: object, error?: string }}
   */
  function applyElectionStart(msg, opts) {
    opts = opts || {};
    var now = opts.now !== undefined ? opts.now : Date.now();
    var zoneId = msg.payload && msg.payload.zone ? msg.payload.zone : null;
    if (!zoneId) {
      return { success: false, error: 'Missing zone in payload' };
    }
    return createElection(zoneId, [msg.from], { startedBy: msg.from, now: now });
  }

  /**
   * Apply an election_vote protocol message
   * @param {object} msg - Protocol message { from, payload: { electionId, candidate } }
   * @param {object} [opts] - Optional: { now }
   * @returns {{ success: boolean, error?: string }}
   */
  function applyElectionVote(msg, opts) {
    opts = opts || {};
    var now = opts.now !== undefined ? opts.now : Date.now();
    var electionId = msg.payload && msg.payload.electionId ? msg.payload.electionId : null;
    var candidate = msg.payload && msg.payload.candidate ? msg.payload.candidate : null;
    if (!electionId || !candidate) {
      return { success: false, error: 'Missing electionId or candidate in payload' };
    }
    return castVote(electionId, msg.from, candidate, { now: now });
  }

  /**
   * Apply an election_finalize protocol message
   * @param {object} msg - Protocol message { from, payload: { electionId } }
   * @param {object} [opts] - Optional: { now }
   * @returns {{ success: boolean, stewards?: Array, error?: string }}
   */
  function applyElectionFinalize(msg, opts) {
    opts = opts || {};
    var now = opts.now !== undefined ? opts.now : Date.now();
    var electionId = msg.payload && msg.payload.electionId ? msg.payload.electionId : null;
    if (!electionId) {
      return { success: false, error: 'Missing electionId in payload' };
    }
    return finalizeElection(electionId, { now: now });
  }

  // ========================================================================
  // TEST HELPERS (for unit tests only)
  // ========================================================================

  /**
   * Reset all internal state (for testing)
   */
  function _reset() {
    electionStore = {};
    stewardStore = {};
    historyStore = {};
    visitStore = {};
    candidateDeclarations = {};
  }

  /**
   * Seed visit count for testing
   * @param {string} zoneId
   * @param {string} playerId
   * @param {number} count
   * @param {number} [lastVisit]
   */
  function _seedVisit(zoneId, playerId, count, lastVisit) {
    var key = zoneId + ':' + playerId;
    visitStore[key] = {
      count: count,
      lastVisit: lastVisit !== undefined ? lastVisit : Date.now()
    };
  }

  /**
   * Directly insert an election (for testing finalization)
   * @param {object} election
   */
  function _insertElection(election) {
    electionStore[election.id] = election;
  }

  /**
   * Directly insert a steward (for testing)
   * @param {string} zoneId
   * @param {object} steward
   */
  function _insertSteward(zoneId, steward) {
    if (!stewardStore[zoneId]) stewardStore[zoneId] = [];
    stewardStore[zoneId].push(steward);
  }

  // ========================================================================
  // EXPORTS
  // ========================================================================

  exports.ELECTION_CONFIG = ELECTION_CONFIG;
  exports.STEWARD_POWERS = STEWARD_POWERS;

  exports.recordVisit = recordVisit;
  exports.getVisitRecord = getVisitRecord;
  exports.isEligibleCandidate = isEligibleCandidate;
  exports.isEligibleVoter = isEligibleVoter;

  exports.createElection = createElection;
  exports.declareCandidacy = declareCandidacy;
  exports.castVote = castVote;
  exports.getElectionResults = getElectionResults;
  exports.finalizeElection = finalizeElection;

  exports.getActiveElections = getActiveElections;
  exports.getCurrentStewards = getCurrentStewards;
  exports.getZoneStewards = getZoneStewards;
  exports.isSteward = isSteward;
  exports.getStewardPowers = getStewardPowers;
  exports.getElectionHistory = getElectionHistory;
  exports.calculateTermRemaining = calculateTermRemaining;
  exports.formatElectionCard = formatElectionCard;

  exports.applyElectionStart = applyElectionStart;
  exports.applyElectionVote = applyElectionVote;
  exports.applyElectionFinalize = applyElectionFinalize;

  // Test helpers (underscore prefix convention)
  exports._reset = _reset;
  exports._seedVisit = _seedVisit;
  exports._insertElection = _insertElection;
  exports._insertSteward = _insertSteward;

})(typeof module !== 'undefined' ? module.exports : (window.Elections = {}));
