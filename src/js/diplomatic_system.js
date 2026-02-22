// diplomatic_system.js
(function(exports) {
  'use strict';

  // Diplomatic System — Guild Treaties, Embargoes, Ambassadors for ZION MMO
  // Guilds negotiate treaties, declare embargoes, appoint ambassadors, and
  // attend multi-guild conferences.

  // ---------------------------------------------------------------------------
  // MULBERRY32 SEEDED PRNG
  // ---------------------------------------------------------------------------

  function mulberry32(seed) {
    var t = (seed + 0x6D2B79F5) | 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // ---------------------------------------------------------------------------
  // CONSTANTS
  // ---------------------------------------------------------------------------

  var COOLING_OFF_TICKS    = 700;  // 7-day cooling period = 700 ticks
  var INCIDENT_PENALTY     = 10;   // standing points lost per incident
  var MAX_STANDING         = 100;
  var MIN_STANDING         = -100;
  var TREATY_COUNTER_INIT  = 1;
  var EMBARGO_COUNTER_INIT = 1;
  var INCIDENT_COUNTER_INIT = 1;
  var CONF_COUNTER_INIT    = 1;

  // ---------------------------------------------------------------------------
  // TREATY TYPES — 6 definitions
  // ---------------------------------------------------------------------------

  var TREATY_TYPES = [
    {
      id: 'trade_alliance',
      name: 'Trade Alliance',
      description: 'Reduced market fees (5%) for guild members trading with each other.',
      benefit: { type: 'fee_reduction', value: 0.05 },
      defaultDuration: 7000,   // 70 in-game days
      minTerms: ['fee_reduction']
    },
    {
      id: 'military_pact',
      name: 'Military Pact',
      description: 'Shared war buffs (+10% attack/defense) when guilds fight the same enemy.',
      benefit: { type: 'war_buff', value: 0.10 },
      defaultDuration: 3000,
      minTerms: ['shared_buffs']
    },
    {
      id: 'non_aggression',
      name: 'Non-Aggression Pact',
      description: 'Neither guild may declare war on the other. Raid cooldown reduced by 20%.',
      benefit: { type: 'raid_cooldown_reduction', value: 0.20 },
      defaultDuration: 5000,
      minTerms: ['no_war']
    },
    {
      id: 'cultural_exchange',
      name: 'Cultural Exchange',
      description: 'Guilds share crafting recipes and cultural achievements.',
      benefit: { type: 'shared_recipes', value: true },
      defaultDuration: 10000,
      minTerms: ['recipe_share']
    },
    {
      id: 'resource_sharing',
      name: 'Resource Sharing',
      description: 'Shared access to resource nodes in each other\'s territories.',
      benefit: { type: 'shared_nodes', value: true },
      defaultDuration: 4000,
      minTerms: ['node_access']
    },
    {
      id: 'mutual_defense',
      name: 'Mutual Defense',
      description: 'Auto-aid triggered when either guild is attacked — allied forces join.',
      benefit: { type: 'auto_aid', value: true },
      defaultDuration: 3500,
      minTerms: ['auto_aid']
    }
  ];

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  function getTreatyTypeDef(typeId) {
    for (var i = 0; i < TREATY_TYPES.length; i++) {
      if (TREATY_TYPES[i].id === typeId) return TREATY_TYPES[i];
    }
    return null;
  }

  function findTreaty(state, treatyId) {
    for (var i = 0; i < state.treaties.length; i++) {
      if (state.treaties[i].id === treatyId) return state.treaties[i];
    }
    return null;
  }

  function findEmbargo(state, embargoId) {
    for (var i = 0; i < state.embargoes.length; i++) {
      if (state.embargoes[i].id === embargoId) return state.embargoes[i];
    }
    return null;
  }

  function makeTreatyId(state) {
    var id = 'treaty_' + state._treatyCounter;
    state._treatyCounter++;
    return id;
  }

  function makeEmbargoId(state) {
    var id = 'embargo_' + state._embargoCounter;
    state._embargoCounter++;
    return id;
  }

  function makeIncidentId(state) {
    var id = 'incident_' + state._incidentCounter;
    state._incidentCounter++;
    return id;
  }

  function makeConfId(state) {
    var id = 'conf_' + state._confCounter;
    state._confCounter++;
    return id;
  }

  // Standing key for a guild pair (canonical order)
  function standingKey(guildId1, guildId2) {
    if (guildId1 < guildId2) {
      return guildId1 + '|' + guildId2;
    }
    return guildId2 + '|' + guildId1;
  }

  function getStanding(state, guildId1, guildId2) {
    var key = standingKey(guildId1, guildId2);
    if (!state._standings) state._standings = {};
    if (typeof state._standings[key] === 'undefined') {
      state._standings[key] = 0;
    }
    return state._standings[key];
  }

  function adjustStanding(state, guildId1, guildId2, delta) {
    var key = standingKey(guildId1, guildId2);
    if (!state._standings) state._standings = {};
    var current = typeof state._standings[key] !== 'undefined' ? state._standings[key] : 0;
    var next = current + delta;
    if (next > MAX_STANDING) next = MAX_STANDING;
    if (next < MIN_STANDING) next = MIN_STANDING;
    state._standings[key] = next;
    // Log the change
    state.standingLog.push({
      guildId1: guildId1,
      guildId2: guildId2,
      delta: delta,
      result: next,
      key: key
    });
    return next;
  }

  function ensureState(state) {
    if (!state.treaties)     state.treaties     = [];
    if (!state.embargoes)    state.embargoes     = [];
    if (!state.ambassadors)  state.ambassadors   = {};
    if (!state.incidents)    state.incidents     = [];
    if (!state.conferences)  state.conferences   = [];
    if (!state.standingLog)  state.standingLog   = [];
    if (!state._standings)   state._standings    = {};
    if (!state._treatyCounter)  state._treatyCounter  = TREATY_COUNTER_INIT;
    if (!state._embargoCounter) state._embargoCounter = EMBARGO_COUNTER_INIT;
    if (!state._incidentCounter) state._incidentCounter = INCIDENT_COUNTER_INIT;
    if (!state._confCounter)    state._confCounter    = CONF_COUNTER_INIT;
  }

  // ---------------------------------------------------------------------------
  // createState
  // ---------------------------------------------------------------------------

  function createState() {
    return {
      treaties:     [],
      embargoes:    [],
      ambassadors:  {},
      incidents:    [],
      conferences:  [],
      standingLog:  [],
      _standings:   {},
      _treatyCounter:  TREATY_COUNTER_INIT,
      _embargoCounter: EMBARGO_COUNTER_INIT,
      _incidentCounter: INCIDENT_COUNTER_INIT,
      _confCounter:    CONF_COUNTER_INIT
    };
  }

  // ---------------------------------------------------------------------------
  // proposeTreaty
  // ---------------------------------------------------------------------------

  /**
   * Propose a new treaty from fromGuildId to toGuildId.
   * @param {object} state
   * @param {string} fromGuildId
   * @param {string} toGuildId
   * @param {string} treatyType   — one of the 6 treaty type ids
   * @param {object} terms        — arbitrary terms object
   * @param {number} currentTick
   * @returns {{ success: boolean, treaty?: object, reason?: string }}
   */
  function proposeTreaty(state, fromGuildId, toGuildId, treatyType, terms, currentTick) {
    ensureState(state);

    if (!fromGuildId || !toGuildId) {
      return { success: false, reason: 'fromGuildId and toGuildId are required' };
    }
    if (fromGuildId === toGuildId) {
      return { success: false, reason: 'Cannot propose treaty with own guild' };
    }

    var typeDef = getTreatyTypeDef(treatyType);
    if (!typeDef) {
      return { success: false, reason: 'Unknown treaty type: ' + treatyType };
    }

    // Check for existing pending/active treaty of same type between same guilds
    for (var i = 0; i < state.treaties.length; i++) {
      var t = state.treaties[i];
      var sameParties = (
        (t.fromGuildId === fromGuildId && t.toGuildId === toGuildId) ||
        (t.fromGuildId === toGuildId   && t.toGuildId === fromGuildId)
      );
      if (sameParties && t.type === treatyType &&
          (t.status === 'proposed' || t.status === 'pending' || t.status === 'active')) {
        return { success: false, reason: 'A treaty of this type already exists or is pending between these guilds' };
      }
    }

    var id = makeTreatyId(state);
    var duration = (terms && terms.duration) ? terms.duration : typeDef.defaultDuration;
    var treaty = {
      id: id,
      fromGuildId: fromGuildId,
      toGuildId: toGuildId,
      type: treatyType,
      terms: terms || {},
      status: 'proposed',
      proposedAt: currentTick,
      acceptedAt: null,
      expiresAt: null,
      terminatedAt: null,
      coolingOffEnd: null,
      duration: duration,
      benefit: typeDef.benefit
    };

    state.treaties.push(treaty);

    // Proposing a treaty improves standing slightly
    adjustStanding(state, fromGuildId, toGuildId, 2);

    return { success: true, treaty: treaty };
  }

  // ---------------------------------------------------------------------------
  // acceptTreaty
  // ---------------------------------------------------------------------------

  /**
   * The receiving guild accepts a proposed treaty.
   * @param {object} state
   * @param {string} treatyId
   * @param {string} guildId   — must be toGuildId
   * @param {number} currentTick
   * @returns {{ success: boolean, treaty?: object, benefits?: object, reason?: string }}
   */
  function acceptTreaty(state, treatyId, guildId, currentTick) {
    ensureState(state);

    var treaty = findTreaty(state, treatyId);
    if (!treaty) {
      return { success: false, reason: 'Treaty not found: ' + treatyId };
    }
    if (treaty.status !== 'proposed' && treaty.status !== 'pending') {
      return { success: false, reason: 'Treaty cannot be accepted in status: ' + treaty.status };
    }
    if (treaty.toGuildId !== guildId) {
      return { success: false, reason: 'Only the recipient guild can accept this treaty' };
    }

    treaty.status    = 'active';
    treaty.acceptedAt = currentTick;
    treaty.expiresAt  = currentTick + treaty.duration;

    // Accepting a treaty significantly improves standing
    adjustStanding(state, treaty.fromGuildId, treaty.toGuildId, 15);

    var typeDef = getTreatyTypeDef(treaty.type);
    var benefits = typeDef ? typeDef.benefit : treaty.benefit;

    return { success: true, treaty: treaty, benefits: benefits };
  }

  // ---------------------------------------------------------------------------
  // rejectTreaty
  // ---------------------------------------------------------------------------

  /**
   * Reject a proposed treaty.
   * @param {object} state
   * @param {string} treatyId
   * @param {string} guildId
   * @param {number} currentTick
   * @returns {{ success: boolean, reason?: string }}
   */
  function rejectTreaty(state, treatyId, guildId, currentTick) {
    ensureState(state);

    var treaty = findTreaty(state, treatyId);
    if (!treaty) {
      return { success: false, reason: 'Treaty not found: ' + treatyId };
    }
    if (treaty.status !== 'proposed' && treaty.status !== 'pending') {
      return { success: false, reason: 'Treaty cannot be rejected in status: ' + treaty.status };
    }
    if (treaty.toGuildId !== guildId && treaty.fromGuildId !== guildId) {
      return { success: false, reason: 'Guild is not a party to this treaty' };
    }

    treaty.status = 'rejected';
    treaty.terminatedAt = currentTick;

    // Rejection slightly hurts standing
    adjustStanding(state, treaty.fromGuildId, treaty.toGuildId, -5);

    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // terminateTreaty
  // ---------------------------------------------------------------------------

  /**
   * Terminate an active treaty. Starts 700-tick cooling-off period.
   * @param {object} state
   * @param {string} treatyId
   * @param {string} guildId   — must be a party to the treaty
   * @param {number} currentTick
   * @returns {{ success: boolean, cooldownEnd?: number, reason?: string }}
   */
  function terminateTreaty(state, treatyId, guildId, currentTick) {
    ensureState(state);

    var treaty = findTreaty(state, treatyId);
    if (!treaty) {
      return { success: false, reason: 'Treaty not found: ' + treatyId };
    }
    if (treaty.status !== 'active') {
      return { success: false, reason: 'Only active treaties can be terminated (status: ' + treaty.status + ')' };
    }
    if (treaty.fromGuildId !== guildId && treaty.toGuildId !== guildId) {
      return { success: false, reason: 'Guild is not a party to this treaty' };
    }

    var cooldownEnd = currentTick + COOLING_OFF_TICKS;
    treaty.status        = 'terminated';
    treaty.terminatedAt  = currentTick;
    treaty.coolingOffEnd = cooldownEnd;

    // Terminating a treaty damages standing
    adjustStanding(state, treaty.fromGuildId, treaty.toGuildId, -10);

    return { success: true, cooldownEnd: cooldownEnd };
  }

  // ---------------------------------------------------------------------------
  // getTreaty
  // ---------------------------------------------------------------------------

  function getTreaty(state, treatyId) {
    ensureState(state);
    return findTreaty(state, treatyId) || null;
  }

  // ---------------------------------------------------------------------------
  // getGuildTreaties
  // ---------------------------------------------------------------------------

  function getGuildTreaties(state, guildId) {
    ensureState(state);
    var result = [];
    for (var i = 0; i < state.treaties.length; i++) {
      var t = state.treaties[i];
      if (t.fromGuildId === guildId || t.toGuildId === guildId) {
        result.push(t);
      }
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // getActiveTreaties
  // ---------------------------------------------------------------------------

  function getActiveTreaties(state, guildId1, guildId2) {
    ensureState(state);
    var result = [];
    for (var i = 0; i < state.treaties.length; i++) {
      var t = state.treaties[i];
      if (t.status !== 'active') continue;
      var involves1 = (t.fromGuildId === guildId1 || t.toGuildId === guildId1);
      var involves2 = (t.fromGuildId === guildId2 || t.toGuildId === guildId2);
      if (involves1 && involves2) {
        result.push(t);
      }
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // declareEmbargo
  // ---------------------------------------------------------------------------

  /**
   * Guild fromGuildId blocks all trade with toGuildId.
   * @param {object} state
   * @param {string} fromGuildId
   * @param {string} toGuildId
   * @param {string} reason
   * @param {number} currentTick
   * @returns {{ success: boolean, embargo?: object, reason?: string }}
   */
  function declareEmbargo(state, fromGuildId, toGuildId, reason, currentTick) {
    ensureState(state);

    if (!fromGuildId || !toGuildId) {
      return { success: false, reason: 'fromGuildId and toGuildId are required' };
    }
    if (fromGuildId === toGuildId) {
      return { success: false, reason: 'Cannot embargo own guild' };
    }

    // Check for existing active embargo in the same direction
    for (var i = 0; i < state.embargoes.length; i++) {
      var e = state.embargoes[i];
      if (e.fromGuildId === fromGuildId && e.toGuildId === toGuildId && e.active) {
        return { success: false, reason: 'Active embargo already exists against this guild' };
      }
    }

    var id = makeEmbargoId(state);
    var embargo = {
      id: id,
      fromGuildId: fromGuildId,
      toGuildId: toGuildId,
      reason: reason || '',
      declaredAt: currentTick,
      active: true,
      liftedAt: null
    };

    state.embargoes.push(embargo);

    // Embargoes hurt standing
    adjustStanding(state, fromGuildId, toGuildId, -15);

    return { success: true, embargo: embargo };
  }

  // ---------------------------------------------------------------------------
  // liftEmbargo
  // ---------------------------------------------------------------------------

  /**
   * Lift an active embargo.
   * @param {object} state
   * @param {string} embargoId
   * @param {number} currentTick
   * @returns {{ success: boolean, reason?: string }}
   */
  function liftEmbargo(state, embargoId, currentTick) {
    ensureState(state);

    var embargo = findEmbargo(state, embargoId);
    if (!embargo) {
      return { success: false, reason: 'Embargo not found: ' + embargoId };
    }
    if (!embargo.active) {
      return { success: false, reason: 'Embargo is already lifted' };
    }

    embargo.active   = false;
    embargo.liftedAt = currentTick;

    // Lifting an embargo slightly improves standing
    adjustStanding(state, embargo.fromGuildId, embargo.toGuildId, 5);

    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // getEmbargoes
  // ---------------------------------------------------------------------------

  /**
   * Return all active embargoes involving guildId (either direction).
   */
  function getEmbargoes(state, guildId) {
    ensureState(state);
    var result = [];
    for (var i = 0; i < state.embargoes.length; i++) {
      var e = state.embargoes[i];
      if (!e.active) continue;
      if (e.fromGuildId === guildId || e.toGuildId === guildId) {
        result.push(e);
      }
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // isEmbargoed
  // ---------------------------------------------------------------------------

  /**
   * Returns true if trade is blocked between guildId1 and guildId2 (either direction).
   */
  function isEmbargoed(state, guildId1, guildId2) {
    ensureState(state);
    for (var i = 0; i < state.embargoes.length; i++) {
      var e = state.embargoes[i];
      if (!e.active) continue;
      if (
        (e.fromGuildId === guildId1 && e.toGuildId === guildId2) ||
        (e.fromGuildId === guildId2 && e.toGuildId === guildId1)
      ) {
        return true;
      }
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // appointAmbassador
  // ---------------------------------------------------------------------------

  /**
   * Appoint a player as the ambassador for a guild.
   * @param {object} state
   * @param {string} guildId
   * @param {string} playerId
   * @param {number} currentTick
   * @returns {{ success: boolean, reason?: string }}
   */
  function appointAmbassador(state, guildId, playerId, currentTick) {
    ensureState(state);

    if (!guildId) {
      return { success: false, reason: 'guildId is required' };
    }
    if (!playerId) {
      return { success: false, reason: 'playerId is required' };
    }

    state.ambassadors[guildId] = {
      guildId: guildId,
      playerId: playerId,
      appointedAt: currentTick,
      active: true
    };

    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // getAmbassador
  // ---------------------------------------------------------------------------

  function getAmbassador(state, guildId) {
    ensureState(state);
    return state.ambassadors[guildId] || null;
  }

  // ---------------------------------------------------------------------------
  // reportIncident
  // ---------------------------------------------------------------------------

  /**
   * Report a treaty violation. Applies reputation penalty and records incident.
   * @param {object} state
   * @param {string} guildId         — reporting guild
   * @param {string} treatyId        — treaty that was violated
   * @param {string} description
   * @param {number} currentTick
   * @returns {{ success: boolean, incident?: object, penalty?: number, reason?: string }}
   */
  function reportIncident(state, guildId, treatyId, description, currentTick) {
    ensureState(state);

    var treaty = findTreaty(state, treatyId);
    if (!treaty) {
      return { success: false, reason: 'Treaty not found: ' + treatyId };
    }

    // Determine the violating guild (the other party)
    var violatorId;
    if (treaty.fromGuildId === guildId) {
      violatorId = treaty.toGuildId;
    } else if (treaty.toGuildId === guildId) {
      violatorId = treaty.fromGuildId;
    } else {
      return { success: false, reason: 'Guild is not a party to this treaty' };
    }

    var id = makeIncidentId(state);
    var incident = {
      id: id,
      reportingGuildId: guildId,
      violatorGuildId: violatorId,
      treatyId: treatyId,
      description: description || '',
      reportedAt: currentTick,
      penalty: INCIDENT_PENALTY,
      resolved: false
    };

    state.incidents.push(incident);

    // Violation damages standing between the two guilds
    adjustStanding(state, guildId, violatorId, -INCIDENT_PENALTY);

    return { success: true, incident: incident, penalty: INCIDENT_PENALTY };
  }

  // ---------------------------------------------------------------------------
  // getIncidents
  // ---------------------------------------------------------------------------

  /**
   * Return all incidents involving guildId (as reporter or violator).
   */
  function getIncidents(state, guildId) {
    ensureState(state);
    var result = [];
    for (var i = 0; i < state.incidents.length; i++) {
      var inc = state.incidents[i];
      if (inc.reportingGuildId === guildId || inc.violatorGuildId === guildId) {
        result.push(inc);
      }
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // getDiplomaticStanding
  // ---------------------------------------------------------------------------

  /**
   * Returns numeric standing between two guilds (-100 to +100).
   */
  function getDiplomaticStanding(state, guildId1, guildId2) {
    ensureState(state);
    return getStanding(state, guildId1, guildId2);
  }

  // ---------------------------------------------------------------------------
  // scheduleConference
  // ---------------------------------------------------------------------------

  /**
   * Schedule a multi-guild diplomatic conference.
   * @param {object} state
   * @param {Array}  guildIds    — participating guild ids
   * @param {string} topic
   * @param {number} startTick
   * @returns {{ success: boolean, conference?: object, reason?: string }}
   */
  function scheduleConference(state, guildIds, topic, startTick) {
    ensureState(state);

    if (!Array.isArray(guildIds) || guildIds.length < 2) {
      return { success: false, reason: 'At least 2 guilds required for a conference' };
    }
    if (!topic || typeof topic !== 'string') {
      return { success: false, reason: 'Conference topic is required' };
    }
    if (typeof startTick !== 'number' || startTick < 0) {
      return { success: false, reason: 'startTick must be a non-negative number' };
    }

    var id = makeConfId(state);
    var conference = {
      id: id,
      guildIds: guildIds.slice(),
      topic: topic,
      startTick: startTick,
      status: 'scheduled',
      outcomes: [],
      scheduledAt: startTick
    };

    state.conferences.push(conference);

    return { success: true, conference: conference };
  }

  // ---------------------------------------------------------------------------
  // getConferences
  // ---------------------------------------------------------------------------

  function getConferences(state) {
    ensureState(state);
    return state.conferences.slice();
  }

  // ---------------------------------------------------------------------------
  // getTreatyBenefits
  // ---------------------------------------------------------------------------

  /**
   * Return all active treaty benefits for a guild, merged by type.
   * @param {object} state
   * @param {string} guildId
   * @returns {Array} of { treatyId, type, otherGuildId, benefit }
   */
  function getTreatyBenefits(state, guildId) {
    ensureState(state);
    var benefits = [];
    for (var i = 0; i < state.treaties.length; i++) {
      var t = state.treaties[i];
      if (t.status !== 'active') continue;
      if (t.fromGuildId !== guildId && t.toGuildId !== guildId) continue;
      var otherGuildId = (t.fromGuildId === guildId) ? t.toGuildId : t.fromGuildId;
      var typeDef = getTreatyTypeDef(t.type);
      benefits.push({
        treatyId: t.id,
        type: t.type,
        otherGuildId: otherGuildId,
        benefit: typeDef ? typeDef.benefit : t.benefit
      });
    }
    return benefits;
  }

  // ---------------------------------------------------------------------------
  // expireTreaties
  // ---------------------------------------------------------------------------

  /**
   * Expire all treaties whose expiresAt <= currentTick.
   * @param {object} state
   * @param {number} currentTick
   * @returns {{ expired: Array }}
   */
  function expireTreaties(state, currentTick) {
    ensureState(state);
    var expired = [];
    for (var i = 0; i < state.treaties.length; i++) {
      var t = state.treaties[i];
      if (t.status === 'active' && t.expiresAt !== null && t.expiresAt <= currentTick) {
        t.status = 'expired';
        expired.push(t);
        // Expiry has a small negative effect on standing
        adjustStanding(state, t.fromGuildId, t.toGuildId, -3);
      }
    }
    return { expired: expired };
  }

  // ---------------------------------------------------------------------------
  // EXPORTS
  // ---------------------------------------------------------------------------

  exports.TREATY_TYPES          = TREATY_TYPES;
  exports.COOLING_OFF_TICKS     = COOLING_OFF_TICKS;

  exports.createState           = createState;
  exports.proposeTreaty         = proposeTreaty;
  exports.acceptTreaty          = acceptTreaty;
  exports.rejectTreaty          = rejectTreaty;
  exports.terminateTreaty       = terminateTreaty;
  exports.getTreaty             = getTreaty;
  exports.getGuildTreaties      = getGuildTreaties;
  exports.getActiveTreaties     = getActiveTreaties;
  exports.declareEmbargo        = declareEmbargo;
  exports.liftEmbargo           = liftEmbargo;
  exports.getEmbargoes          = getEmbargoes;
  exports.isEmbargoed           = isEmbargoed;
  exports.appointAmbassador     = appointAmbassador;
  exports.getAmbassador         = getAmbassador;
  exports.reportIncident        = reportIncident;
  exports.getIncidents          = getIncidents;
  exports.getDiplomaticStanding = getDiplomaticStanding;
  exports.scheduleConference    = scheduleConference;
  exports.getConferences        = getConferences;
  exports.getTreatyBenefits     = getTreatyBenefits;
  exports.expireTreaties        = expireTreaties;

})(typeof module !== 'undefined' ? module.exports : (window.DiplomaticSystem = {}));
