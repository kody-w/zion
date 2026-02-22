// zone_stewards.js
/**
 * ZION Zone Stewards
 * Democratic governance for each of the 8 zones.
 * Citizens nominate themselves, vote in elections, and elected stewards
 * propose events, approve anchors, set rules, and mediate disputes.
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
  // CONSTANTS
  // ---------------------------------------------------------------------------

  var ZONES = [
    'nexus',
    'gardens',
    'athenaeum',
    'studio',
    'wilds',
    'agora',
    'commons',
    'arena'
  ];

  var ELECTION_WINDOW = 500;   // ticks for voting phase
  var TERM_LENGTH = 3000;      // ticks a steward serves
  var QUORUM = 3;              // minimum votes for a proposal to pass

  var PROPOSAL_TYPES = [
    {
      id: 'zone_event',
      name: 'Zone Event',
      description: 'Propose a special event to be held in the zone.',
      requiresSteward: true
    },
    {
      id: 'anchor_approval',
      name: 'Anchor Approval',
      description: 'Approve or deny a player anchor placement in the zone.',
      requiresSteward: true
    },
    {
      id: 'rule_change',
      name: 'Rule Change',
      description: 'Propose a change to zone rules and behaviour guidelines.',
      requiresSteward: true
    },
    {
      id: 'resource_allocation',
      name: 'Resource Allocation',
      description: 'Allocate shared zone resources among citizens.',
      requiresSteward: true
    },
    {
      id: 'festival',
      name: 'Festival',
      description: 'Organise a community festival open to all zones.',
      requiresSteward: true
    },
    {
      id: 'maintenance',
      name: 'Maintenance',
      description: 'Schedule zone maintenance to repair or improve infrastructure.',
      requiresSteward: true
    }
  ];

  // ---------------------------------------------------------------------------
  // ID GENERATOR
  // ---------------------------------------------------------------------------

  var _idCounter = 0;
  function genId(prefix) {
    _idCounter++;
    return (prefix || 'id') + '_' + Date.now() + '_' + _idCounter;
  }

  // ---------------------------------------------------------------------------
  // STATE FACTORY
  // ---------------------------------------------------------------------------

  function createState() {
    return {
      elections: {},   // zone -> { candidates: {}, votes: {}, openTick: N, closeTick: N, open: bool }
      stewards: {},    // zone -> { playerId, electedTick, termEndTick, approvals, rejections, proposalCount, disputesResolved }
      proposals: [],   // array of proposal objects
      disputes: [],    // array of dispute objects
      electionLog: []  // array of past election results
    };
  }

  // ---------------------------------------------------------------------------
  // ELECTION HELPERS
  // ---------------------------------------------------------------------------

  function _ensureElection(state, zone) {
    if (!state.elections[zone]) {
      state.elections[zone] = {
        candidates: {},
        votes: {},
        openTick: null,
        closeTick: null,
        open: false
      };
    }
    return state.elections[zone];
  }

  // ---------------------------------------------------------------------------
  // NOMINATION
  // ---------------------------------------------------------------------------

  /**
   * nominateSelf(state, playerId, zone, currentTick)
   * A player nominates themselves for steward of the given zone.
   * Opens election window if none is currently open.
   * Returns { success: bool, nomination: obj|null, reason: string|undefined }
   */
  function nominateSelf(state, playerId, zone, currentTick) {
    if (ZONES.indexOf(zone) === -1) {
      return { success: false, nomination: null, reason: 'invalid_zone' };
    }
    if (!playerId) {
      return { success: false, nomination: null, reason: 'invalid_player' };
    }

    var election = _ensureElection(state, zone);

    // If an election is open but its window has expired, close it first
    if (election.open && currentTick >= election.closeTick) {
      closeElection(state, zone, currentTick);
    }

    // Open a new election if none is active
    if (!election.open) {
      election.openTick = currentTick;
      election.closeTick = currentTick + ELECTION_WINDOW;
      election.open = true;
      election.candidates = {};
      election.votes = {};
    }

    // Already nominated?
    if (election.candidates[playerId]) {
      return { success: false, nomination: null, reason: 'already_nominated' };
    }

    var nomination = {
      playerId: playerId,
      zone: zone,
      nominatedTick: currentTick
    };
    election.candidates[playerId] = nomination;

    return { success: true, nomination: nomination };
  }

  // ---------------------------------------------------------------------------
  // VOTING
  // ---------------------------------------------------------------------------

  /**
   * castElectionVote(state, playerId, zone, candidateId, currentTick)
   * Cast a vote for a candidate in the zone election.
   * Returns { success: bool, reason: string|undefined }
   */
  function castElectionVote(state, playerId, zone, candidateId, currentTick) {
    if (ZONES.indexOf(zone) === -1) {
      return { success: false, reason: 'invalid_zone' };
    }

    var election = state.elections[zone];
    if (!election || !election.open) {
      return { success: false, reason: 'no_open_election' };
    }
    if (currentTick >= election.closeTick) {
      return { success: false, reason: 'election_closed' };
    }
    if (!election.candidates[candidateId]) {
      return { success: false, reason: 'candidate_not_found' };
    }
    if (election.votes[playerId]) {
      return { success: false, reason: 'already_voted' };
    }

    election.votes[playerId] = candidateId;
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // CLOSE ELECTION
  // ---------------------------------------------------------------------------

  /**
   * closeElection(state, zone, currentTick)
   * Tally votes and elect a steward.
   * Returns { success: bool, winner: string|null, voteCount: number }
   */
  function closeElection(state, zone, currentTick) {
    if (ZONES.indexOf(zone) === -1) {
      return { success: false, winner: null, voteCount: 0, reason: 'invalid_zone' };
    }

    var election = state.elections[zone];
    if (!election || !election.open) {
      return { success: false, winner: null, voteCount: 0, reason: 'no_open_election' };
    }

    // Tally
    var tally = {};
    var votePlayerIds = Object.keys(election.votes);
    for (var i = 0; i < votePlayerIds.length; i++) {
      var voter = votePlayerIds[i];
      var candidate = election.votes[voter];
      if (!tally[candidate]) tally[candidate] = 0;
      tally[candidate]++;
    }

    // Find winner (most votes; ties broken by candidate order / alphabetical)
    var winner = null;
    var maxVotes = -1;
    var candidateIds = Object.keys(election.candidates).sort();
    for (var j = 0; j < candidateIds.length; j++) {
      var cid = candidateIds[j];
      var count = tally[cid] || 0;
      if (count > maxVotes) {
        maxVotes = count;
        winner = cid;
      }
    }

    // If no candidates at all
    var winnerVoteCount = winner ? (tally[winner] || 0) : 0;

    // Record in log
    var logEntry = {
      zone: zone,
      winner: winner,
      voteCount: winnerVoteCount,
      totalVotes: votePlayerIds.length,
      candidates: Object.keys(election.candidates),
      closedTick: currentTick
    };
    state.electionLog.push(logEntry);

    // Install steward if there was at least one candidate
    if (winner) {
      state.stewards[zone] = {
        playerId: winner,
        zone: zone,
        electedTick: currentTick,
        termEndTick: currentTick + TERM_LENGTH,
        approvals: 0,
        rejections: 0,
        proposalCount: 0,
        disputesResolved: 0
      };
    }

    // Reset election
    election.open = false;
    election.candidates = {};
    election.votes = {};

    return { success: true, winner: winner, voteCount: winnerVoteCount };
  }

  // ---------------------------------------------------------------------------
  // STEWARD QUERIES
  // ---------------------------------------------------------------------------

  /**
   * getSteward(state, zone) — returns steward object or null
   */
  function getSteward(state, zone) {
    return state.stewards[zone] || null;
  }

  /**
   * getAllStewards(state) — returns map { zone: steward }
   */
  function getAllStewards(state) {
    var result = {};
    for (var i = 0; i < ZONES.length; i++) {
      result[ZONES[i]] = state.stewards[ZONES[i]] || null;
    }
    return result;
  }

  /**
   * isElectionOpen(state, zone) — boolean
   */
  function isElectionOpen(state, zone) {
    var election = state.elections[zone];
    return !!(election && election.open);
  }

  /**
   * getTermRemaining(state, zone, currentTick) — ticks remaining in steward term (0 if none)
   */
  function getTermRemaining(state, zone, currentTick) {
    var steward = state.stewards[zone];
    if (!steward) return 0;
    var remaining = steward.termEndTick - currentTick;
    return remaining > 0 ? remaining : 0;
  }

  /**
   * expireTerms(state, currentTick) — remove stewards whose terms have ended
   * Returns { expired: [zone, ...] }
   */
  function expireTerms(state, currentTick) {
    var expired = [];
    for (var i = 0; i < ZONES.length; i++) {
      var zone = ZONES[i];
      var steward = state.stewards[zone];
      if (steward && currentTick >= steward.termEndTick) {
        expired.push(zone);
        delete state.stewards[zone];
      }
    }
    return { expired: expired };
  }

  // ---------------------------------------------------------------------------
  // PROPOSALS
  // ---------------------------------------------------------------------------

  /**
   * createProposal(state, stewardId, zone, type, details, currentTick)
   * Only the current zone steward may create proposals.
   * Returns { success: bool, proposal: obj|null, reason: string|undefined }
   */
  function createProposal(state, stewardId, zone, type, details, currentTick) {
    if (ZONES.indexOf(zone) === -1) {
      return { success: false, proposal: null, reason: 'invalid_zone' };
    }

    // Validate proposal type
    var typeIds = PROPOSAL_TYPES.map(function(p) { return p.id; });
    if (typeIds.indexOf(type) === -1) {
      return { success: false, proposal: null, reason: 'invalid_type' };
    }

    // Must be current steward
    var steward = state.stewards[zone];
    if (!steward || steward.playerId !== stewardId) {
      return { success: false, proposal: null, reason: 'not_steward' };
    }

    // Check term still valid
    if (currentTick >= steward.termEndTick) {
      return { success: false, proposal: null, reason: 'term_expired' };
    }

    var proposal = {
      id: genId('prop'),
      stewardId: stewardId,
      zone: zone,
      type: type,
      details: details || {},
      status: 'open',
      createdTick: currentTick,
      votes: {},       // playerId -> 'yes' | 'no'
      yesCount: 0,
      noCount: 0
    };

    state.proposals.push(proposal);
    steward.proposalCount++;

    return { success: true, proposal: proposal };
  }

  /**
   * voteOnProposal(state, playerId, proposalId, vote, currentTick)
   * vote must be 'yes' or 'no'.
   * Returns { success: bool, reason: string|undefined }
   */
  function voteOnProposal(state, playerId, proposalId, vote, currentTick) {
    if (vote !== 'yes' && vote !== 'no') {
      return { success: false, reason: 'invalid_vote' };
    }

    var proposal = null;
    for (var i = 0; i < state.proposals.length; i++) {
      if (state.proposals[i].id === proposalId) {
        proposal = state.proposals[i];
        break;
      }
    }

    if (!proposal) {
      return { success: false, reason: 'proposal_not_found' };
    }
    if (proposal.status !== 'open') {
      return { success: false, reason: 'proposal_not_open' };
    }
    if (proposal.votes[playerId]) {
      return { success: false, reason: 'already_voted' };
    }

    proposal.votes[playerId] = vote;
    if (vote === 'yes') {
      proposal.yesCount++;
    } else {
      proposal.noCount++;
    }

    return { success: true };
  }

  /**
   * closeProposal(state, proposalId, currentTick)
   * Close and tally. Passes if yesCount >= QUORUM and yesCount > noCount.
   * Returns { success: bool, passed: bool, votes: { yes: N, no: N } }
   */
  function closeProposal(state, proposalId, currentTick) {
    var proposal = null;
    for (var i = 0; i < state.proposals.length; i++) {
      if (state.proposals[i].id === proposalId) {
        proposal = state.proposals[i];
        break;
      }
    }

    if (!proposal) {
      return { success: false, passed: false, votes: { yes: 0, no: 0 }, reason: 'proposal_not_found' };
    }
    if (proposal.status !== 'open') {
      return { success: false, passed: false, votes: { yes: proposal.yesCount, no: proposal.noCount }, reason: 'proposal_not_open' };
    }

    var passed = proposal.yesCount >= QUORUM && proposal.yesCount > proposal.noCount;
    proposal.status = passed ? 'passed' : 'rejected';
    proposal.closedTick = currentTick;

    // Update steward stats
    var steward = state.stewards[proposal.zone];
    if (steward && steward.playerId === proposal.stewardId) {
      if (passed) {
        steward.approvals++;
      } else {
        steward.rejections++;
      }
    }

    return { success: true, passed: passed, votes: { yes: proposal.yesCount, no: proposal.noCount } };
  }

  /**
   * getProposals(state, zone, status)
   * Returns proposals for zone filtered by status (optional).
   */
  function getProposals(state, zone, status) {
    var result = [];
    for (var i = 0; i < state.proposals.length; i++) {
      var p = state.proposals[i];
      if (p.zone !== zone) continue;
      if (status && p.status !== status) continue;
      result.push(p);
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // DISPUTES
  // ---------------------------------------------------------------------------

  /**
   * fileDispute(state, reporterId, targetId, zone, description, currentTick)
   * Returns { success: bool, dispute: obj|null, reason: string|undefined }
   */
  function fileDispute(state, reporterId, targetId, zone, description, currentTick) {
    if (ZONES.indexOf(zone) === -1) {
      return { success: false, dispute: null, reason: 'invalid_zone' };
    }
    if (!reporterId || !targetId) {
      return { success: false, dispute: null, reason: 'invalid_players' };
    }
    if (reporterId === targetId) {
      return { success: false, dispute: null, reason: 'cannot_dispute_self' };
    }
    if (!description || !description.trim()) {
      return { success: false, dispute: null, reason: 'missing_description' };
    }

    var dispute = {
      id: genId('disp'),
      reporterId: reporterId,
      targetId: targetId,
      zone: zone,
      description: description,
      status: 'open',
      filedTick: currentTick,
      resolution: null,
      resolvedBy: null,
      resolvedTick: null
    };

    state.disputes.push(dispute);
    return { success: true, dispute: dispute };
  }

  /**
   * resolveDispute(state, disputeId, stewardId, resolution, currentTick)
   * Only the zone's current steward may resolve disputes in their zone.
   * Returns { success: bool, reason: string|undefined }
   */
  function resolveDispute(state, disputeId, stewardId, resolution, currentTick) {
    var dispute = null;
    for (var i = 0; i < state.disputes.length; i++) {
      if (state.disputes[i].id === disputeId) {
        dispute = state.disputes[i];
        break;
      }
    }

    if (!dispute) {
      return { success: false, reason: 'dispute_not_found' };
    }
    if (dispute.status !== 'open') {
      return { success: false, reason: 'dispute_not_open' };
    }
    if (!resolution || !resolution.trim()) {
      return { success: false, reason: 'missing_resolution' };
    }

    // Validate steward for that zone
    var steward = state.stewards[dispute.zone];
    if (!steward || steward.playerId !== stewardId) {
      return { success: false, reason: 'not_steward' };
    }

    dispute.status = 'resolved';
    dispute.resolution = resolution;
    dispute.resolvedBy = stewardId;
    dispute.resolvedTick = currentTick;

    steward.disputesResolved++;

    return { success: true };
  }

  /**
   * getDisputes(state, zone, status)
   * Returns disputes for zone filtered by status (optional).
   */
  function getDisputes(state, zone, status) {
    var result = [];
    for (var i = 0; i < state.disputes.length; i++) {
      var d = state.disputes[i];
      if (d.zone !== zone) continue;
      if (status && d.status !== status) continue;
      result.push(d);
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // STEWARD STATS / DASHBOARD
  // ---------------------------------------------------------------------------

  /**
   * getStewardStats(state, zone)
   * Returns steward performance stats or null if no steward.
   */
  function getStewardStats(state, zone) {
    var steward = state.stewards[zone];
    if (!steward) return null;

    var total = steward.approvals + steward.rejections;
    var approvalRate = total > 0 ? steward.approvals / total : 0;

    return {
      playerId: steward.playerId,
      zone: zone,
      electedTick: steward.electedTick,
      termEndTick: steward.termEndTick,
      proposalCount: steward.proposalCount,
      approvals: steward.approvals,
      rejections: steward.rejections,
      approvalRate: approvalRate,
      disputesResolved: steward.disputesResolved
    };
  }

  /**
   * getElectionHistory(state, zone)
   * Returns past election log entries for a zone.
   */
  function getElectionHistory(state, zone) {
    var result = [];
    for (var i = 0; i < state.electionLog.length; i++) {
      if (state.electionLog[i].zone === zone) {
        result.push(state.electionLog[i]);
      }
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // EXPORTS
  // ---------------------------------------------------------------------------

  exports.ZONES = ZONES;
  exports.PROPOSAL_TYPES = PROPOSAL_TYPES;
  exports.ELECTION_WINDOW = ELECTION_WINDOW;
  exports.TERM_LENGTH = TERM_LENGTH;
  exports.QUORUM = QUORUM;

  exports.createState = createState;
  exports.nominateSelf = nominateSelf;
  exports.castElectionVote = castElectionVote;
  exports.closeElection = closeElection;
  exports.getSteward = getSteward;
  exports.getAllStewards = getAllStewards;
  exports.createProposal = createProposal;
  exports.voteOnProposal = voteOnProposal;
  exports.closeProposal = closeProposal;
  exports.getProposals = getProposals;
  exports.fileDispute = fileDispute;
  exports.resolveDispute = resolveDispute;
  exports.getDisputes = getDisputes;
  exports.getStewardStats = getStewardStats;
  exports.getElectionHistory = getElectionHistory;
  exports.isElectionOpen = isElectionOpen;
  exports.getTermRemaining = getTermRemaining;
  exports.expireTerms = expireTerms;

})(typeof module !== 'undefined' ? module.exports : (window.ZoneStewards = {}));
