// event_voting.js — Participatory Event Voting System for ZION
// Players vote on event outcomes; collective choices shape the world.
// Depends on: protocol.js (optional), zones.js (optional)
(function(exports) {
  'use strict';

  // ========================================================================
  // VOTEABLE EVENT CATALOG
  // ========================================================================

  var VOTEABLE_EVENTS = {

    harvest_festival: {
      id: 'harvest_festival',
      title: 'Harvest Festival',
      zone: 'gardens',
      description: 'The gardens overflow with produce. How shall we celebrate?',
      options: [
        {
          id: 'feast',
          label: 'Grand Feast',
          desc: 'Cook a community meal. +20% cooking XP for 24h',
          effect: { bonus: 'cooking_xp', multiplier: 1.2, duration: 86400 }
        },
        {
          id: 'market',
          label: 'Harvest Market',
          desc: 'Sell surplus at special prices. +15% trade profits for 24h',
          effect: { bonus: 'trade_profit', multiplier: 1.15, duration: 86400 }
        },
        {
          id: 'preserve',
          label: 'Preserve for Winter',
          desc: 'Store food. All players get 5 bread',
          effect: { bonus: 'give_item', item: 'bread', qty: 5 }
        }
      ]
    },

    storm_approaching: {
      id: 'storm_approaching',
      title: 'Storm Approaching',
      zone: 'wilds',
      description: 'Dark clouds gather over the Wilds. What do we do?',
      options: [
        {
          id: 'shelter',
          label: 'Build Shelter',
          desc: 'Protect the zone. +10% building XP for 24h',
          effect: { bonus: 'building_xp', multiplier: 1.1, duration: 86400 }
        },
        {
          id: 'brave',
          label: 'Brave the Storm',
          desc: 'Hunt for rare storm creatures. Rare loot drops for 12h',
          effect: { bonus: 'rare_loot', multiplier: 2.0, duration: 43200 }
        },
        {
          id: 'evacuate',
          label: 'Evacuate to Nexus',
          desc: 'Safety first. All players in Wilds get 20 Spark',
          effect: { bonus: 'give_spark', amount: 20, zone: 'wilds' }
        }
      ]
    },

    merchant_caravan: {
      id: 'merchant_caravan',
      title: 'Merchant Caravan Arrives',
      zone: 'agora',
      description: 'A mysterious caravan has arrived at the Agora with exotic goods.',
      options: [
        {
          id: 'trade',
          label: 'Open Trade',
          desc: 'Access rare items. Exotic shop opens for 24h',
          effect: { bonus: 'exotic_shop', duration: 86400 }
        },
        {
          id: 'tax',
          label: 'Tax the Merchants',
          desc: 'Charge entry fee. 50 Spark to treasury',
          effect: { bonus: 'treasury', amount: 50 }
        },
        {
          id: 'welcome',
          label: 'Welcome Feast',
          desc: 'Befriend merchants. Permanent 5% discount',
          effect: { bonus: 'permanent_discount', amount: 0.05 }
        }
      ]
    },

    aurora_borealis: {
      id: 'aurora_borealis',
      title: 'Aurora Borealis',
      zone: null,
      description: 'The sky shimmers with magical light. A rare celestial event!',
      options: [
        {
          id: 'stargaze',
          label: 'Mass Stargazing',
          desc: 'Community stargazing. +50% stargazing XP for 12h',
          effect: { bonus: 'stargazing_xp', multiplier: 1.5, duration: 43200 }
        },
        {
          id: 'harvest',
          label: 'Harvest Star Dust',
          desc: 'Collect fragments. Each player gets 1 star_fragment',
          effect: { bonus: 'give_item', item: 'star_fragment', qty: 1 }
        },
        {
          id: 'ceremony',
          label: 'Light Ceremony',
          desc: 'Hold a ceremony. +25% all XP for 6h',
          effect: { bonus: 'all_xp', multiplier: 1.25, duration: 21600 }
        }
      ]
    },

    arena_tournament: {
      id: 'arena_tournament',
      title: 'Grand Tournament',
      zone: 'arena',
      description: 'The Arena is hosting a grand tournament. What format?',
      options: [
        {
          id: 'combat',
          label: 'Combat Tournament',
          desc: 'Dungeon speed-run competition. Top 3 get prizes',
          effect: { bonus: 'tournament', type: 'dungeon', prizes: [100, 50, 25] }
        },
        {
          id: 'cards',
          label: 'Card Championship',
          desc: 'Card game bracket. Top 3 get prizes',
          effect: { bonus: 'tournament', type: 'cards', prizes: [100, 50, 25] }
        },
        {
          id: 'fishing',
          label: 'Fishing Derby',
          desc: 'Biggest catch wins. Top 3 get prizes',
          effect: { bonus: 'tournament', type: 'fishing', prizes: [100, 50, 25] }
        }
      ]
    },

    knowledge_symposium: {
      id: 'knowledge_symposium',
      title: 'Knowledge Symposium',
      zone: 'athenaeum',
      description: 'Scholars have gathered for a symposium. What topic?',
      options: [
        {
          id: 'history',
          label: 'Ancient History',
          desc: 'Learn about ZION origins. Unlock lore entries',
          effect: { bonus: 'lore_unlock', count: 3 }
        },
        {
          id: 'science',
          label: 'Natural Science',
          desc: '+20% gathering efficiency for 24h',
          effect: { bonus: 'gather_efficiency', multiplier: 1.2, duration: 86400 }
        },
        {
          id: 'philosophy',
          label: 'Philosophy Debate',
          desc: '+15% reputation gains for 24h',
          effect: { bonus: 'reputation_gain', multiplier: 1.15, duration: 86400 }
        }
      ]
    },

    art_exhibition: {
      id: 'art_exhibition',
      title: 'Art Exhibition',
      zone: 'studio',
      description: 'The Studio is hosting an exhibition. What theme?',
      options: [
        {
          id: 'paintings',
          label: 'Landscape Paintings',
          desc: 'Inspire exploration. +10% exploration XP for 24h',
          effect: { bonus: 'exploration_xp', multiplier: 1.1, duration: 86400 }
        },
        {
          id: 'sculptures',
          label: 'Sculpture Garden',
          desc: 'Inspire building. +10% crafting XP for 24h',
          effect: { bonus: 'crafting_xp', multiplier: 1.1, duration: 86400 }
        },
        {
          id: 'music',
          label: 'Musical Performance',
          desc: 'Inspire composition. +10% music XP for 24h',
          effect: { bonus: 'music_xp', multiplier: 1.1, duration: 86400 }
        }
      ]
    },

    migration_season: {
      id: 'migration_season',
      title: 'Great Migration',
      zone: 'wilds',
      description: 'Rare creatures are migrating through the Wilds!',
      options: [
        {
          id: 'observe',
          label: 'Observe Wildlife',
          desc: 'Study creatures. New discovery entries unlock',
          effect: { bonus: 'discoveries', count: 5 }
        },
        {
          id: 'hunt',
          label: 'Ethical Harvest',
          desc: 'Gather materials. Everyone gets 3 silk + 3 feather',
          effect: { bonus: 'give_items', items: [{item: 'silk', qty: 3}, {item: 'feather', qty: 3}] }
        },
        {
          id: 'protect',
          label: 'Protect the Path',
          desc: 'Guard migration route. +50 reputation with Wilds NPCs',
          effect: { bonus: 'zone_reputation', zone: 'wilds', amount: 50 }
        }
      ]
    },

    full_moon: {
      id: 'full_moon',
      title: 'Full Moon Night',
      zone: null,
      description: 'The full moon rises. Strange things happen in the moonlight...',
      options: [
        {
          id: 'fish',
          label: 'Moonlit Fishing',
          desc: 'Rare fish appear. +100% rare fish chance for 12h',
          effect: { bonus: 'rare_fish', multiplier: 2.0, duration: 43200 }
        },
        {
          id: 'garden',
          label: 'Moon Garden',
          desc: 'Plant moonflowers. +30% farming XP for 12h',
          effect: { bonus: 'farming_xp', multiplier: 1.3, duration: 43200 }
        },
        {
          id: 'dungeon',
          label: 'Moonlit Dungeon',
          desc: 'Special dungeon opens. +50% dungeon loot for 12h',
          effect: { bonus: 'dungeon_loot', multiplier: 1.5, duration: 43200 }
        }
      ]
    },

    founders_day: {
      id: 'founders_day',
      title: 'Founders Day',
      zone: 'nexus',
      description: 'Celebrating the founding of ZION. How shall we honor the occasion?',
      options: [
        {
          id: 'monument',
          label: 'Build Monument',
          desc: 'Permanent monument in Nexus. +10 all zone reputations',
          effect: { bonus: 'all_reputation', amount: 10 }
        },
        {
          id: 'distribute',
          label: 'Wealth Distribution',
          desc: 'Treasury shares wealth. 50 Spark to all players',
          effect: { bonus: 'give_spark', amount: 50 }
        },
        {
          id: 'party',
          label: 'Grand Celebration',
          desc: 'Party in Nexus! +25% all XP for 24h',
          effect: { bonus: 'all_xp', multiplier: 1.25, duration: 86400 }
        }
      ]
    }

  };

  // ========================================================================
  // VOTING CONSTANTS
  // ========================================================================

  var VOTING_PERIOD_TICKS = 300;    // 5 minutes at 1 tick/sec
  var EVENT_STATUS_VOTING  = 'voting';
  var EVENT_STATUS_CLOSED  = 'closed';

  // ========================================================================
  // STATE FACTORY
  // ========================================================================

  /**
   * createEventVotingState()
   * Returns the fresh root state object for this module.
   */
  function createEventVotingState() {
    return {
      activeEvents:   [],   // array of live event-instance objects
      votingHistory:  [],   // array of closed event summaries
      activeEffects:  [],   // array of currently applied effect objects
      nextEventId:    1
    };
  }

  // ========================================================================
  // INTERNAL HELPERS
  // ========================================================================

  function _findEvent(state, eventInstanceId) {
    for (var i = 0; i < state.activeEvents.length; i++) {
      if (state.activeEvents[i].instanceId === eventInstanceId) {
        return state.activeEvents[i];
      }
    }
    return null;
  }

  function _findOption(eventDef, optionId) {
    for (var i = 0; i < eventDef.options.length; i++) {
      if (eventDef.options[i].id === optionId) {
        return eventDef.options[i];
      }
    }
    return null;
  }

  /**
   * Determine the winning option from a tally.
   * Ties are broken by the option that appears first in the catalog definition.
   * @param {Object} tally   — { optionId: count, ... }
   * @param {Array}  options — ordered option list from catalog
   * @returns {String|null} winning optionId
   */
  function _resolveWinner(tally, options) {
    var maxVotes = -1;
    var winner   = null;
    for (var i = 0; i < options.length; i++) {
      var optId = options[i].id;
      var count = tally[optId] || 0;
      if (count > maxVotes) {
        maxVotes = count;
        winner   = optId;
      }
      // strict >, so first option wins ties (earlier index = first in catalog)
    }
    return winner;
  }

  // ========================================================================
  // CORE FUNCTIONS
  // ========================================================================

  /**
   * startEvent(state, eventId, startTime)
   * Create a new voteable event instance from the catalog.
   * @param {Object} state
   * @param {String} eventId    — key in VOTEABLE_EVENTS
   * @param {Number} startTime  — tick or timestamp at which the event starts
   * @returns {{ state, event } | { state, error }}
   */
  function startEvent(state, eventId, startTime) {
    var catalog = VOTEABLE_EVENTS[eventId];
    if (!catalog) {
      return { state: state, error: 'Unknown event: ' + eventId };
    }

    var instanceId = state.nextEventId;
    state = Object.assign({}, state, { nextEventId: state.nextEventId + 1 });

    var event = {
      instanceId:   instanceId,
      eventId:      eventId,
      title:        catalog.title,
      zone:         catalog.zone,
      description:  catalog.description,
      options:      catalog.options,   // reference to catalog options (read-only)
      status:       EVENT_STATUS_VOTING,
      startTime:    startTime,
      closedTime:   null,
      votes:        {},                // { playerId: optionId }
      winner:       null,
      appliedEffect: null
    };

    var newActive = state.activeEvents.slice();
    newActive.push(event);
    state = Object.assign({}, state, { activeEvents: newActive });

    return { state: state, event: event };
  }

  /**
   * castVote(state, eventInstanceId, playerId, optionId)
   * Record a player's vote. One vote per player per event.
   * @returns {{ state, success, message }}
   */
  function castVote(state, eventInstanceId, playerId, optionId) {
    var event = _findEvent(state, eventInstanceId);
    if (!event) {
      return { state: state, success: false, message: 'Event not found: ' + eventInstanceId };
    }
    if (event.status !== EVENT_STATUS_VOTING) {
      return { state: state, success: false, message: 'Voting is closed for this event.' };
    }
    if (event.votes[playerId] !== undefined) {
      return { state: state, success: false, message: 'Player has already voted. Use changeVote to update.' };
    }
    var option = _findOption({ options: event.options }, optionId);
    if (!option) {
      return { state: state, success: false, message: 'Invalid option: ' + optionId };
    }

    // Mutate a fresh copy of the event's votes
    var newVotes = Object.assign({}, event.votes);
    newVotes[playerId] = optionId;

    var updatedEvent = Object.assign({}, event, { votes: newVotes });
    var newActive = state.activeEvents.map(function(e) {
      return e.instanceId === eventInstanceId ? updatedEvent : e;
    });
    state = Object.assign({}, state, { activeEvents: newActive });

    return { state: state, success: true, message: 'Vote cast for "' + option.label + '".' };
  }

  /**
   * changeVote(state, eventInstanceId, playerId, newOptionId)
   * Change an existing vote during the voting period.
   * @returns {{ state, success, message }}
   */
  function changeVote(state, eventInstanceId, playerId, newOptionId) {
    var event = _findEvent(state, eventInstanceId);
    if (!event) {
      return { state: state, success: false, message: 'Event not found: ' + eventInstanceId };
    }
    if (event.status !== EVENT_STATUS_VOTING) {
      return { state: state, success: false, message: 'Voting is closed for this event.' };
    }
    if (event.votes[playerId] === undefined) {
      return { state: state, success: false, message: 'No existing vote found. Use castVote first.' };
    }
    var option = _findOption({ options: event.options }, newOptionId);
    if (!option) {
      return { state: state, success: false, message: 'Invalid option: ' + newOptionId };
    }
    if (event.votes[playerId] === newOptionId) {
      return { state: state, success: false, message: 'Vote unchanged; already voting for "' + option.label + '".' };
    }

    var newVotes = Object.assign({}, event.votes);
    newVotes[playerId] = newOptionId;

    var updatedEvent = Object.assign({}, event, { votes: newVotes });
    var newActive = state.activeEvents.map(function(e) {
      return e.instanceId === eventInstanceId ? updatedEvent : e;
    });
    state = Object.assign({}, state, { activeEvents: newActive });

    return { state: state, success: true, message: 'Vote changed to "' + option.label + '".' };
  }

  /**
   * getVoteTally(state, eventInstanceId)
   * Returns a tally object { optionId: count, ... } for all options.
   */
  function getVoteTally(state, eventInstanceId) {
    var event = _findEvent(state, eventInstanceId);
    if (!event) { return null; }

    var tally = {};
    // Initialize all options to 0
    for (var i = 0; i < event.options.length; i++) {
      tally[event.options[i].id] = 0;
    }
    // Count votes
    var playerIds = Object.keys(event.votes);
    for (var j = 0; j < playerIds.length; j++) {
      var chosen = event.votes[playerIds[j]];
      if (tally[chosen] !== undefined) {
        tally[chosen]++;
      }
    }
    return tally;
  }

  /**
   * closeVoting(state, eventInstanceId, currentTime)
   * End voting, determine winner (most votes; ties to first option), apply effect.
   * @returns {{ state, winner, effect, message } | { state, error }}
   */
  function closeVoting(state, eventInstanceId, currentTime) {
    var event = _findEvent(state, eventInstanceId);
    if (!event) {
      return { state: state, error: 'Event not found: ' + eventInstanceId };
    }
    if (event.status === EVENT_STATUS_CLOSED) {
      return { state: state, error: 'Voting already closed for event ' + eventInstanceId };
    }

    var tally    = getVoteTally(state, eventInstanceId);
    var winnerId = _resolveWinner(tally, event.options);
    var winOption = _findOption({ options: event.options }, winnerId);

    // Build applied effect (copy of catalog effect, plus metadata)
    var appliedEffect = null;
    if (winOption) {
      appliedEffect = Object.assign({}, winOption.effect, {
        eventInstanceId: eventInstanceId,
        eventId:         event.eventId,
        optionId:        winnerId,
        optionLabel:     winOption.label,
        appliedAt:       currentTime,
        // activeUntil is set only for timed effects
        activeUntil: winOption.effect.duration
          ? currentTime + winOption.effect.duration
          : null
      });
    }

    // Update the event record
    var updatedEvent = Object.assign({}, event, {
      status:        EVENT_STATUS_CLOSED,
      closedTime:    currentTime,
      winner:        winnerId,
      appliedEffect: appliedEffect
    });

    // Remove from activeEvents
    var newActive = state.activeEvents.filter(function(e) {
      return e.instanceId !== eventInstanceId;
    });

    // Add a history summary
    var summary = {
      instanceId:    eventInstanceId,
      eventId:       event.eventId,
      title:         event.title,
      winner:        winnerId,
      winnerLabel:   winOption ? winOption.label : null,
      tally:         tally,
      totalVotes:    Object.keys(event.votes).length,
      startTime:     event.startTime,
      closedTime:    currentTime,
      appliedEffect: appliedEffect
    };
    var newHistory = state.votingHistory.slice();
    newHistory.unshift(summary);

    // Add to activeEffects if timed (or immediate effects that are trackable)
    var newEffects = state.activeEffects.slice();
    if (appliedEffect) {
      newEffects.push(appliedEffect);
    }

    state = Object.assign({}, state, {
      activeEvents:  newActive,
      votingHistory: newHistory,
      activeEffects: newEffects
    });

    var message = winOption
      ? '"' + winOption.label + '" won with ' + (tally[winnerId] || 0) + ' votes!'
      : 'No votes cast; no effect applied.';

    return {
      state:   state,
      winner:  winnerId,
      effect:  appliedEffect,
      message: message
    };
  }

  /**
   * getActiveEffects(state, currentTime)
   * Returns effects that are currently active (timed or permanent).
   * A permanent effect (activeUntil === null) is always considered active.
   */
  function getActiveEffects(state, currentTime) {
    return state.activeEffects.filter(function(eff) {
      if (eff.activeUntil === null) { return true; }   // permanent
      return eff.activeUntil > currentTime;
    });
  }

  /**
   * isEffectActive(state, effectType, currentTime)
   * Returns true if an effect of the given bonus type is currently active.
   */
  function isEffectActive(state, effectType, currentTime) {
    var active = getActiveEffects(state, currentTime);
    for (var i = 0; i < active.length; i++) {
      if (active[i].bonus === effectType) { return true; }
    }
    return false;
  }

  /**
   * getEffectMultiplier(state, effectType, currentTime)
   * Returns the highest multiplier for an active effect of the given type.
   * Returns 1.0 if no matching effect is active.
   */
  function getEffectMultiplier(state, effectType, currentTime) {
    var active = getActiveEffects(state, currentTime);
    var best   = 1.0;
    for (var i = 0; i < active.length; i++) {
      if (active[i].bonus === effectType && active[i].multiplier !== undefined) {
        if (active[i].multiplier > best) {
          best = active[i].multiplier;
        }
      }
    }
    return best;
  }

  /**
   * getEventHistory(state, limit)
   * Returns recent closed-event summaries (most recent first).
   */
  function getEventHistory(state, limit) {
    var history = state.votingHistory;
    if (limit !== undefined && limit > 0) {
      return history.slice(0, limit);
    }
    return history.slice();
  }

  /**
   * getUpcomingEvents(state)
   * Returns events currently in the voting phase.
   */
  function getUpcomingEvents(state) {
    return state.activeEvents.filter(function(e) {
      return e.status === EVENT_STATUS_VOTING;
    });
  }

  // ========================================================================
  // FORMATTING HELPERS
  // ========================================================================

  /**
   * formatEventCard(event, tally, timeRemaining)
   * Returns an HTML string for an event card with vote counts and a timer.
   *
   * @param {Object} event          — event instance object
   * @param {Object} tally          — { optionId: count }
   * @param {Number} timeRemaining  — ticks or seconds remaining (shown as-is)
   * @returns {String} HTML
   */
  function formatEventCard(event, tally, timeRemaining) {
    if (!event) { return '<div class="event-card event-card--empty">No event data.</div>'; }

    tally = tally || {};
    var totalVotes = 0;
    var optionIds = Object.keys(tally);
    for (var i = 0; i < optionIds.length; i++) {
      totalVotes += tally[optionIds[i]];
    }

    var zoneLabel = event.zone ? (' &bull; ' + event.zone.charAt(0).toUpperCase() + event.zone.slice(1)) : '';
    var statusBadge = event.status === EVENT_STATUS_VOTING
      ? '<span class="event-badge event-badge--voting">Voting Open</span>'
      : '<span class="event-badge event-badge--closed">Closed</span>';

    var timerHtml = (timeRemaining !== undefined && event.status === EVENT_STATUS_VOTING)
      ? '<div class="event-timer">Time remaining: <strong>' + timeRemaining + '</strong> ticks</div>'
      : '';

    var optionsHtml = '';
    for (var j = 0; j < event.options.length; j++) {
      var opt    = event.options[j];
      var votes  = tally[opt.id] || 0;
      optionsHtml += formatVoteBar(opt.label, votes, totalVotes);
    }

    var winnerHtml = '';
    if (event.status === EVENT_STATUS_CLOSED && event.winner) {
      var winOpt = _findOption({ options: event.options }, event.winner);
      winnerHtml = winOpt
        ? '<div class="event-winner">Winner: <strong>' + winOpt.label + '</strong></div>'
        : '';
    }

    return (
      '<div class="event-card" data-event-id="' + event.eventId + '" data-instance-id="' + event.instanceId + '">' +
        '<div class="event-card__header">' +
          '<span class="event-card__title">' + event.title + '</span>' +
          zoneLabel +
          statusBadge +
        '</div>' +
        '<div class="event-card__description">' + event.description + '</div>' +
        '<div class="event-card__options">' + optionsHtml + '</div>' +
        timerHtml +
        winnerHtml +
        '<div class="event-card__total">Total votes: ' + totalVotes + '</div>' +
      '</div>'
    );
  }

  /**
   * formatVoteBar(optionLabel, votes, totalVotes)
   * Returns an HTML string showing an ASCII-style vote bar.
   *
   * @param {String} optionLabel
   * @param {Number} votes
   * @param {Number} totalVotes
   * @returns {String} HTML
   */
  function formatVoteBar(optionLabel, votes, totalVotes) {
    var BAR_WIDTH   = 20;
    var pct         = totalVotes > 0 ? (votes / totalVotes) : 0;
    var filled      = Math.round(pct * BAR_WIDTH);
    var empty       = BAR_WIDTH - filled;
    var bar         = '';
    for (var i = 0; i < filled; i++) { bar += '#'; }
    for (var j = 0; j < empty;  j++) { bar += '-'; }
    var pctLabel    = Math.round(pct * 100) + '%';

    return (
      '<div class="vote-bar">' +
        '<span class="vote-bar__label">' + optionLabel + '</span>' +
        '<code class="vote-bar__bar">[' + bar + ']</code>' +
        '<span class="vote-bar__pct">' + pctLabel + '</span>' +
        '<span class="vote-bar__count">(' + votes + ')</span>' +
      '</div>'
    );
  }

  /**
   * formatActiveEffects(effects)
   * Returns HTML listing the currently active bonuses.
   *
   * @param {Array} effects — array of effect objects (from getActiveEffects)
   * @returns {String} HTML
   */
  function formatActiveEffects(effects) {
    if (!effects || effects.length === 0) {
      return '<div class="active-effects active-effects--empty">No active event bonuses.</div>';
    }

    var rows = '';
    for (var i = 0; i < effects.length; i++) {
      var eff = effects[i];
      var bonusLabel = eff.bonus.replace(/_/g, ' ');
      var multiplierStr = eff.multiplier !== undefined
        ? ('x' + eff.multiplier.toFixed(2))
        : '';
      var amountStr = eff.amount !== undefined
        ? ('+' + eff.amount)
        : '';
      var valueStr  = multiplierStr || amountStr || '';
      var expiryStr = eff.activeUntil
        ? 'Expires at ' + eff.activeUntil
        : 'Permanent';
      rows += (
        '<div class="active-effect">' +
          '<span class="active-effect__source">' + (eff.optionLabel || eff.optionId || 'Event') + '</span>' +
          '<span class="active-effect__bonus">' + bonusLabel + '</span>' +
          (valueStr ? '<span class="active-effect__value">' + valueStr + '</span>' : '') +
          '<span class="active-effect__expiry">' + expiryStr + '</span>' +
        '</div>'
      );
    }

    return '<div class="active-effects">' + rows + '</div>';
  }

  // ========================================================================
  // EXPORTS
  // ========================================================================

  exports.VOTEABLE_EVENTS       = VOTEABLE_EVENTS;
  exports.VOTING_PERIOD_TICKS   = VOTING_PERIOD_TICKS;
  exports.EVENT_STATUS_VOTING   = EVENT_STATUS_VOTING;
  exports.EVENT_STATUS_CLOSED   = EVENT_STATUS_CLOSED;

  exports.createEventVotingState = createEventVotingState;
  exports.startEvent             = startEvent;
  exports.castVote               = castVote;
  exports.changeVote             = changeVote;
  exports.getVoteTally           = getVoteTally;
  exports.closeVoting            = closeVoting;
  exports.getActiveEffects       = getActiveEffects;
  exports.isEffectActive         = isEffectActive;
  exports.getEffectMultiplier    = getEffectMultiplier;
  exports.getEventHistory        = getEventHistory;
  exports.getUpcomingEvents      = getUpcomingEvents;
  exports.formatEventCard        = formatEventCard;
  exports.formatVoteBar          = formatVoteBar;
  exports.formatActiveEffects    = formatActiveEffects;

})(typeof module !== 'undefined' ? module.exports : (window.EventVoting = {}));
