// constitution_amendments.js
/**
 * constitution_amendments.js — Constitutional Amendment Voting & Ratification for ZION
 *
 * Lifecycle: drafted → discussion (700 ticks) → voting (500 ticks) → ratified/rejected
 * Requires 3 sponsors (1 sponsor + 2 co-sponsors) to open discussion.
 * Simple majority with 10+ vote quorum to ratify.
 * Same section cannot be amended again for 2000 ticks after ratification.
 * Constitution version starts at v1.0 and increments on each ratification.
 *
 * Window name: ConstitutionAmendments
 */

(function(exports) {
  'use strict';

  // ==========================================================================
  // PRNG — mulberry32
  // ==========================================================================

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

  // ==========================================================================
  // CONSTANTS
  // ==========================================================================

  var DISCUSSION_PERIOD = 700;  // ticks
  var VOTING_PERIOD     = 500;  // ticks
  var VOTE_QUORUM       = 10;   // minimum votes required
  var SPONSOR_COUNT     = 3;    // 1 sponsor + 2 co-sponsors
  var SECTION_COOLDOWN  = 2000; // ticks before same section can be amended again

  var STATUS_DRAFTED    = 'drafted';
  var STATUS_DISCUSSION = 'discussion';
  var STATUS_VOTING     = 'voting';
  var STATUS_RATIFIED   = 'ratified';
  var STATUS_REJECTED   = 'rejected';

  // ==========================================================================
  // AMENDMENT CATEGORIES
  // ==========================================================================

  var CATEGORIES = [
    {
      id: 'governance',
      name: 'Governance',
      description: 'Amendments affecting decision-making processes, leadership, and administrative rules.',
      icon: 'gavel',
      color: '#4A90E2'
    },
    {
      id: 'economy',
      name: 'Economy',
      description: 'Amendments affecting trade, currency, taxes, resource distribution, and market rules.',
      icon: 'coins',
      color: '#F5A623'
    },
    {
      id: 'zones',
      name: 'Zones',
      description: 'Amendments affecting zone boundaries, zone rules, zone access, and territorial management.',
      icon: 'map',
      color: '#7ED321'
    },
    {
      id: 'rights',
      name: 'Rights',
      description: 'Amendments affecting player rights, protections, freedoms, and fundamental guarantees.',
      icon: 'shield',
      color: '#BD10E0'
    },
    {
      id: 'social',
      name: 'Social',
      description: 'Amendments affecting community interaction, guilds, communication, and cultural norms.',
      icon: 'people',
      color: '#E74C3C'
    },
    {
      id: 'technical',
      name: 'Technical',
      description: 'Amendments affecting protocol rules, data formats, API access, and system mechanics.',
      icon: 'code',
      color: '#1ABC9C'
    }
  ];

  var VALID_CATEGORIES = (function() {
    var map = {};
    for (var i = 0; i < CATEGORIES.length; i++) {
      map[CATEGORIES[i].id] = true;
    }
    return map;
  })();

  // ==========================================================================
  // ID GENERATION
  // ==========================================================================

  var _idCounter = 0;

  function generateAmendmentId(sponsorId, currentTick) {
    _idCounter++;
    return 'amend_' + (currentTick || 0) + '_' + (_idCounter) + '_' + (sponsorId || 'anon').slice(0, 6);
  }

  function generateCommentId(playerId, currentTick) {
    _idCounter++;
    return 'cmt_' + (currentTick || 0) + '_' + (_idCounter) + '_' + (playerId || 'anon').slice(0, 6);
  }

  // ==========================================================================
  // VERSION HELPERS
  // ==========================================================================

  function parseVersion(vStr) {
    var parts = vStr.split('.');
    return {
      major: parseInt(parts[0], 10) || 1,
      minor: parseInt(parts[1], 10) || 0
    };
  }

  function incrementVersion(vStr) {
    var v = parseVersion(vStr);
    v.minor += 1;
    if (v.minor >= 10) {
      v.major += 1;
      v.minor = 0;
    }
    return v.major + '.' + v.minor;
  }

  // ==========================================================================
  // STATE FACTORY
  // ==========================================================================

  /**
   * createState()
   * Returns a fresh state object for the ConstitutionAmendments module.
   *
   * Shape:
   *   amendments:    Array of amendment objects
   *   comments:      { [amendmentId]: Array of comment objects }
   *   votes:         { [amendmentId]: { [playerId]: 'yes'|'no'|'abstain' } }
   *   constitution:  { version: '1.0', sections: [], ratifiedAt: 0 }
   *   amendmentLog:  Array of log entries (ratified/rejected events)
   */
  function createState() {
    return {
      amendments:   [],
      comments:     {},
      votes:        {},
      constitution: {
        version:    '1.0',
        sections:   [],
        ratifiedAt: 0
      },
      amendmentLog: []
    };
  }

  // ==========================================================================
  // DRAFT AMENDMENT
  // ==========================================================================

  /**
   * draftAmendment(state, sponsorId, category, title, text, sections, currentTick)
   *
   * Creates a new amendment in 'drafted' status.
   * @param {object}   state       - Module state
   * @param {string}   sponsorId   - Player ID of the primary sponsor
   * @param {string}   category    - One of the 6 valid categories
   * @param {string}   title       - Short title for the amendment
   * @param {string}   text        - Full amendment text
   * @param {string[]} sections    - Constitution sections affected
   * @param {number}   currentTick - Current game tick
   * @returns {{ success: boolean, amendment?: object, error?: string }}
   */
  function draftAmendment(state, sponsorId, category, title, text, sections, currentTick) {
    if (!sponsorId || typeof sponsorId !== 'string' || sponsorId.trim() === '') {
      return { success: false, error: 'Invalid sponsor ID' };
    }
    if (!VALID_CATEGORIES[category]) {
      return { success: false, error: 'Invalid category: ' + category };
    }
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return { success: false, error: 'Title is required' };
    }
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return { success: false, error: 'Amendment text is required' };
    }
    if (!Array.isArray(sections) || sections.length === 0) {
      return { success: false, error: 'At least one section must be specified' };
    }

    // Check section cooldowns
    var tick = currentTick || 0;
    for (var i = 0; i < sections.length; i++) {
      var sec = sections[i];
      if (!canAmendSection(state, sec, tick).canAmend) {
        return { success: false, error: 'Section "' + sec + '" is under cooldown and cannot be amended yet' };
      }
    }

    var amendmentId = generateAmendmentId(sponsorId, tick);
    var amendment = {
      id:          amendmentId,
      category:    category,
      title:       title.trim(),
      text:        text.trim(),
      sections:    sections.slice(),
      status:      STATUS_DRAFTED,
      sponsors:    [sponsorId],
      draftedAt:   tick,
      discussionOpenedAt: null,
      votingOpenedAt:     null,
      closedAt:           null,
      version:     null   // assigned on ratification
    };

    state.amendments.push(amendment);
    state.comments[amendmentId] = [];
    state.votes[amendmentId]    = {};

    return { success: true, amendment: amendment };
  }

  // ==========================================================================
  // CO-SPONSOR
  // ==========================================================================

  /**
   * coSponsor(state, amendmentId, playerId, currentTick)
   *
   * Adds a co-sponsor to a drafted amendment.
   * A player cannot co-sponsor their own amendment (they are already sponsor).
   * @returns {{ success: boolean, sponsors?: string[], error?: string }}
   */
  function coSponsor(state, amendmentId, playerId, currentTick) {
    if (!playerId || typeof playerId !== 'string' || playerId.trim() === '') {
      return { success: false, error: 'Invalid player ID' };
    }

    var amendment = getAmendment(state, amendmentId);
    if (!amendment) {
      return { success: false, error: 'Amendment not found: ' + amendmentId };
    }
    if (amendment.status !== STATUS_DRAFTED) {
      return { success: false, error: 'Can only co-sponsor amendments in drafted status' };
    }
    if (amendment.sponsors.indexOf(playerId) !== -1) {
      return { success: false, error: 'Player is already a sponsor of this amendment' };
    }
    if (amendment.sponsors.length >= SPONSOR_COUNT) {
      return { success: false, error: 'Amendment already has the maximum number of sponsors' };
    }

    amendment.sponsors.push(playerId);
    return { success: true, sponsors: amendment.sponsors.slice() };
  }

  // ==========================================================================
  // OPEN DISCUSSION
  // ==========================================================================

  /**
   * openDiscussion(state, amendmentId, currentTick)
   *
   * Moves a drafted amendment into the discussion phase.
   * Requires SPONSOR_COUNT (3) sponsors before discussion can open.
   * @returns {{ success: boolean, error?: string }}
   */
  function openDiscussion(state, amendmentId, currentTick) {
    var amendment = getAmendment(state, amendmentId);
    if (!amendment) {
      return { success: false, error: 'Amendment not found: ' + amendmentId };
    }
    if (amendment.status !== STATUS_DRAFTED) {
      return { success: false, error: 'Amendment is not in drafted status' };
    }
    if (amendment.sponsors.length < SPONSOR_COUNT) {
      return {
        success: false,
        error: 'Need ' + SPONSOR_COUNT + ' sponsors to open discussion (have ' + amendment.sponsors.length + ')'
      };
    }

    amendment.status = STATUS_DISCUSSION;
    amendment.discussionOpenedAt = currentTick || 0;
    return { success: true };
  }

  // ==========================================================================
  // ADD COMMENT
  // ==========================================================================

  /**
   * addComment(state, amendmentId, playerId, text, currentTick)
   *
   * Adds a comment to an amendment's discussion thread.
   * Comments are allowed during discussion or voting phases.
   * @returns {{ success: boolean, comment?: object, error?: string }}
   */
  function addComment(state, amendmentId, playerId, text, currentTick) {
    if (!playerId || typeof playerId !== 'string' || playerId.trim() === '') {
      return { success: false, error: 'Invalid player ID' };
    }
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return { success: false, error: 'Comment text is required' };
    }

    var amendment = getAmendment(state, amendmentId);
    if (!amendment) {
      return { success: false, error: 'Amendment not found: ' + amendmentId };
    }
    if (amendment.status !== STATUS_DISCUSSION && amendment.status !== STATUS_VOTING) {
      return { success: false, error: 'Comments are only allowed during discussion or voting phases' };
    }

    var comment = {
      id:          generateCommentId(playerId, currentTick || 0),
      amendmentId: amendmentId,
      playerId:    playerId,
      text:        text.trim(),
      createdAt:   currentTick || 0
    };

    if (!state.comments[amendmentId]) {
      state.comments[amendmentId] = [];
    }
    state.comments[amendmentId].push(comment);

    return { success: true, comment: comment };
  }

  // ==========================================================================
  // GET COMMENTS
  // ==========================================================================

  /**
   * getComments(state, amendmentId)
   *
   * Returns all comments for an amendment.
   * @returns {object[]} Array of comment objects (empty if none or unknown ID)
   */
  function getComments(state, amendmentId) {
    return (state.comments[amendmentId] || []).slice();
  }

  // ==========================================================================
  // OPEN VOTING
  // ==========================================================================

  /**
   * openVoting(state, amendmentId, currentTick)
   *
   * Moves an amendment from discussion to voting phase.
   * Requires that the discussion period (DISCUSSION_PERIOD ticks) has elapsed.
   * @returns {{ success: boolean, error?: string }}
   */
  function openVoting(state, amendmentId, currentTick) {
    var amendment = getAmendment(state, amendmentId);
    if (!amendment) {
      return { success: false, error: 'Amendment not found: ' + amendmentId };
    }
    if (amendment.status !== STATUS_DISCUSSION) {
      return { success: false, error: 'Amendment is not in discussion status' };
    }

    var tick = currentTick || 0;
    var elapsed = tick - (amendment.discussionOpenedAt || 0);
    if (elapsed < DISCUSSION_PERIOD) {
      return {
        success: false,
        error: 'Discussion period not complete. ' + (DISCUSSION_PERIOD - elapsed) + ' ticks remaining'
      };
    }

    amendment.status = STATUS_VOTING;
    amendment.votingOpenedAt = tick;
    return { success: true };
  }

  // ==========================================================================
  // CAST VOTE
  // ==========================================================================

  /**
   * castVote(state, amendmentId, playerId, vote, currentTick)
   *
   * Records a player's vote on an amendment in voting phase.
   * @param {string} vote - 'yes', 'no', or 'abstain'
   * @returns {{ success: boolean, error?: string }}
   */
  function castVote(state, amendmentId, playerId, vote, currentTick) {
    if (!playerId || typeof playerId !== 'string' || playerId.trim() === '') {
      return { success: false, error: 'Invalid player ID' };
    }

    var validVotes = { yes: true, no: true, abstain: true };
    if (!validVotes[vote]) {
      return { success: false, error: 'Invalid vote value. Must be yes, no, or abstain' };
    }

    var amendment = getAmendment(state, amendmentId);
    if (!amendment) {
      return { success: false, error: 'Amendment not found: ' + amendmentId };
    }
    if (amendment.status !== STATUS_VOTING) {
      return { success: false, error: 'Amendment is not in voting phase' };
    }

    if (!state.votes[amendmentId]) {
      state.votes[amendmentId] = {};
    }
    state.votes[amendmentId][playerId] = vote;

    return { success: true };
  }

  // ==========================================================================
  // CLOSE VOTING
  // ==========================================================================

  /**
   * closeVoting(state, amendmentId, currentTick)
   *
   * Closes the voting phase and determines ratification or rejection.
   * Requires VOTING_PERIOD ticks to have elapsed.
   * Ratified if: total non-abstain votes >= VOTE_QUORUM AND yes > no.
   * On ratification: constitution version increments, sections get cooldown.
   *
   * @returns {{ success: boolean, ratified?: boolean, yesVotes?: number, noVotes?: number, abstainVotes?: number, error?: string }}
   */
  function closeVoting(state, amendmentId, currentTick) {
    var amendment = getAmendment(state, amendmentId);
    if (!amendment) {
      return { success: false, error: 'Amendment not found: ' + amendmentId };
    }
    if (amendment.status !== STATUS_VOTING) {
      return { success: false, error: 'Amendment is not in voting phase' };
    }

    var tick = currentTick || 0;
    var elapsed = tick - (amendment.votingOpenedAt || 0);
    if (elapsed < VOTING_PERIOD) {
      return {
        success: false,
        error: 'Voting period not complete. ' + (VOTING_PERIOD - elapsed) + ' ticks remaining'
      };
    }

    var voteRecord = state.votes[amendmentId] || {};
    var yesVotes     = 0;
    var noVotes      = 0;
    var abstainVotes = 0;
    var playerIds = Object.keys(voteRecord);

    for (var i = 0; i < playerIds.length; i++) {
      var v = voteRecord[playerIds[i]];
      if (v === 'yes')     yesVotes++;
      else if (v === 'no') noVotes++;
      else                 abstainVotes++;
    }

    var totalDecisive = yesVotes + noVotes;
    var ratified = (totalDecisive >= VOTE_QUORUM) && (yesVotes > noVotes);

    amendment.closedAt = tick;
    amendment.status   = ratified ? STATUS_RATIFIED : STATUS_REJECTED;

    if (ratified) {
      // Increment constitution version
      var newVersion = incrementVersion(state.constitution.version);
      state.constitution.version    = newVersion;
      state.constitution.ratifiedAt = tick;

      // Store version number on the amendment
      amendment.version = newVersion;

      // Apply section cooldowns: record the tick at which each section was last amended
      if (!state.constitution.sections) {
        state.constitution.sections = [];
      }
      for (var j = 0; j < amendment.sections.length; j++) {
        var sec = amendment.sections[j];
        var found = false;
        for (var k = 0; k < state.constitution.sections.length; k++) {
          if (state.constitution.sections[k].id === sec) {
            state.constitution.sections[k].lastAmendedAt = tick;
            found = true;
            break;
          }
        }
        if (!found) {
          state.constitution.sections.push({ id: sec, lastAmendedAt: tick });
        }
      }
    }

    // Append to amendment log
    state.amendmentLog.push({
      amendmentId: amendmentId,
      title:       amendment.title,
      category:    amendment.category,
      status:      amendment.status,
      ratified:    ratified,
      yesVotes:    yesVotes,
      noVotes:     noVotes,
      abstainVotes: abstainVotes,
      closedAt:    tick,
      version:     amendment.version || null
    });

    return {
      success:      true,
      ratified:     ratified,
      yesVotes:     yesVotes,
      noVotes:      noVotes,
      abstainVotes: abstainVotes
    };
  }

  // ==========================================================================
  // GET AMENDMENT
  // ==========================================================================

  /**
   * getAmendment(state, amendmentId)
   *
   * Returns the amendment object by ID, or null if not found.
   */
  function getAmendment(state, amendmentId) {
    for (var i = 0; i < state.amendments.length; i++) {
      if (state.amendments[i].id === amendmentId) {
        return state.amendments[i];
      }
    }
    return null;
  }

  // ==========================================================================
  // FILTER HELPERS
  // ==========================================================================

  /**
   * getAmendmentsByCategory(state, category)
   *
   * Returns all amendments in the given category.
   */
  function getAmendmentsByCategory(state, category) {
    var result = [];
    for (var i = 0; i < state.amendments.length; i++) {
      if (state.amendments[i].category === category) {
        result.push(state.amendments[i]);
      }
    }
    return result;
  }

  /**
   * getAmendmentsByStatus(state, status)
   *
   * Returns all amendments with the given status.
   */
  function getAmendmentsByStatus(state, status) {
    var result = [];
    for (var i = 0; i < state.amendments.length; i++) {
      if (state.amendments[i].status === status) {
        result.push(state.amendments[i]);
      }
    }
    return result;
  }

  /**
   * getActiveAmendments(state)
   *
   * Returns amendments currently in discussion or voting phases.
   */
  function getActiveAmendments(state) {
    var result = [];
    for (var i = 0; i < state.amendments.length; i++) {
      var s = state.amendments[i].status;
      if (s === STATUS_DISCUSSION || s === STATUS_VOTING) {
        result.push(state.amendments[i]);
      }
    }
    return result;
  }

  // ==========================================================================
  // CONSTITUTION VERSION
  // ==========================================================================

  /**
   * getConstitutionVersion(state)
   *
   * Returns the current constitution version info.
   * @returns {{ version: string, ratifiedAt: number, sectionCount: number }}
   */
  function getConstitutionVersion(state) {
    return {
      version:      state.constitution.version,
      ratifiedAt:   state.constitution.ratifiedAt,
      sectionCount: (state.constitution.sections || []).length
    };
  }

  // ==========================================================================
  // AMENDMENT HISTORY
  // ==========================================================================

  /**
   * getAmendmentHistory(state, count)
   *
   * Returns the most recent `count` log entries (ratified or rejected).
   * Ordered most-recent first.
   * @param {number} count - Maximum number of entries to return
   */
  function getAmendmentHistory(state, count) {
    var log = state.amendmentLog.slice().reverse();
    if (typeof count === 'number' && count > 0) {
      return log.slice(0, count);
    }
    return log;
  }

  // ==========================================================================
  // VOTE RESULTS
  // ==========================================================================

  /**
   * getVoteResults(state, amendmentId)
   *
   * Returns the vote breakdown for an amendment.
   * @returns {{ yesVotes: number, noVotes: number, abstainVotes: number, totalVotes: number, quorumMet: boolean }}
   */
  function getVoteResults(state, amendmentId) {
    var voteRecord = state.votes[amendmentId] || {};
    var yes     = 0;
    var no      = 0;
    var abstain = 0;
    var playerIds = Object.keys(voteRecord);

    for (var i = 0; i < playerIds.length; i++) {
      var v = voteRecord[playerIds[i]];
      if (v === 'yes')     yes++;
      else if (v === 'no') no++;
      else                 abstain++;
    }

    var total = yes + no + abstain;
    var decisive = yes + no;
    return {
      yesVotes:     yes,
      noVotes:      no,
      abstainVotes: abstain,
      totalVotes:   total,
      quorumMet:    decisive >= VOTE_QUORUM
    };
  }

  // ==========================================================================
  // SECTION COOLDOWN CHECK
  // ==========================================================================

  /**
   * canAmendSection(state, section, currentTick)
   *
   * Checks whether a constitution section is currently available for amendment.
   * @returns {{ canAmend: boolean, cooldownRemaining: number, lastAmendedAt: number|null }}
   */
  function canAmendSection(state, section, currentTick) {
    var tick = currentTick || 0;
    var sections = state.constitution.sections || [];

    for (var i = 0; i < sections.length; i++) {
      if (sections[i].id === section) {
        var lastAt = sections[i].lastAmendedAt || 0;
        var elapsed = tick - lastAt;
        if (elapsed < SECTION_COOLDOWN) {
          return {
            canAmend:          false,
            cooldownRemaining: SECTION_COOLDOWN - elapsed,
            lastAmendedAt:     lastAt
          };
        }
        return {
          canAmend:          true,
          cooldownRemaining: 0,
          lastAmendedAt:     lastAt
        };
      }
    }

    // Section not found in cooldown list — never amended, always available
    return {
      canAmend:          true,
      cooldownRemaining: 0,
      lastAmendedAt:     null
    };
  }

  // ==========================================================================
  // PLAYER AMENDMENTS
  // ==========================================================================

  /**
   * getPlayerAmendments(state, playerId)
   *
   * Returns all amendments where the player is a sponsor (primary or co-sponsor).
   */
  function getPlayerAmendments(state, playerId) {
    var result = [];
    for (var i = 0; i < state.amendments.length; i++) {
      var a = state.amendments[i];
      if (a.sponsors.indexOf(playerId) !== -1) {
        result.push(a);
      }
    }
    return result;
  }

  // ==========================================================================
  // AMENDMENT STATS
  // ==========================================================================

  /**
   * getAmendmentStats(state)
   *
   * Returns global statistics about the amendment system.
   * @returns {{ total, drafted, discussion, voting, ratified, rejected, byCategory, constitutionVersion, totalAmendmentsRatified }}
   */
  function getAmendmentStats(state) {
    var counts = {
      total:      0,
      drafted:    0,
      discussion: 0,
      voting:     0,
      ratified:   0,
      rejected:   0
    };
    var byCategory = {};
    for (var i = 0; i < CATEGORIES.length; i++) {
      byCategory[CATEGORIES[i].id] = 0;
    }

    for (var j = 0; j < state.amendments.length; j++) {
      var a = state.amendments[j];
      counts.total++;
      if (counts[a.status] !== undefined) counts[a.status]++;
      if (byCategory[a.category] !== undefined) byCategory[a.category]++;
    }

    return {
      total:                    counts.total,
      drafted:                  counts.drafted,
      discussion:               counts.discussion,
      voting:                   counts.voting,
      ratified:                 counts.ratified,
      rejected:                 counts.rejected,
      byCategory:               byCategory,
      constitutionVersion:      state.constitution.version,
      totalAmendmentsRatified:  counts.ratified
    };
  }

  // ==========================================================================
  // EXPORTS
  // ==========================================================================

  exports.CATEGORIES               = CATEGORIES;
  exports.DISCUSSION_PERIOD        = DISCUSSION_PERIOD;
  exports.VOTING_PERIOD            = VOTING_PERIOD;
  exports.VOTE_QUORUM              = VOTE_QUORUM;
  exports.SPONSOR_COUNT            = SPONSOR_COUNT;
  exports.SECTION_COOLDOWN         = SECTION_COOLDOWN;

  exports.createState              = createState;
  exports.draftAmendment           = draftAmendment;
  exports.coSponsor                = coSponsor;
  exports.openDiscussion           = openDiscussion;
  exports.addComment               = addComment;
  exports.getComments              = getComments;
  exports.openVoting               = openVoting;
  exports.castVote                 = castVote;
  exports.closeVoting              = closeVoting;
  exports.getAmendment             = getAmendment;
  exports.getAmendmentsByCategory  = getAmendmentsByCategory;
  exports.getAmendmentsByStatus    = getAmendmentsByStatus;
  exports.getActiveAmendments      = getActiveAmendments;
  exports.getConstitutionVersion   = getConstitutionVersion;
  exports.getAmendmentHistory      = getAmendmentHistory;
  exports.getVoteResults           = getVoteResults;
  exports.canAmendSection          = canAmendSection;
  exports.getPlayerAmendments      = getPlayerAmendments;
  exports.getAmendmentStats        = getAmendmentStats;

})(typeof module !== 'undefined' ? module.exports : (window.ConstitutionAmendments = {}));
