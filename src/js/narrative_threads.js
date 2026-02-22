/**
 * ZION MMO — Narrative Threads System
 * Cross-player storytelling: actions in one zone trigger narrative in another.
 * Threads auto-link via thematic hooks. Players weave threads together.
 * No project dependencies.
 */

(function(exports) {
  'use strict';

  // ---------------------------------------------------------------------------
  // THREAD THEMES — 10 thematic categories
  // ---------------------------------------------------------------------------

  var THREAD_THEMES = [
    { id: 'conflict',       name: 'Conflict',       description: 'Tension and resolution',               color: '#cc4444' },
    { id: 'cooperation',    name: 'Cooperation',    description: 'Working together toward a common goal', color: '#44aacc' },
    { id: 'mystery',        name: 'Mystery',        description: 'Unknown forces and hidden truths',      color: '#8844cc' },
    { id: 'discovery',      name: 'Discovery',      description: 'Finding the new and unexpected',        color: '#44cc88' },
    { id: 'growth',         name: 'Growth',         description: 'Personal and collective development',   color: '#88cc44' },
    { id: 'loss',           name: 'Loss',           description: 'Grief, change, and acceptance',         color: '#888888' },
    { id: 'celebration',    name: 'Celebration',    description: 'Joy, triumph, and shared happiness',    color: '#ccaa44' },
    { id: 'journey',        name: 'Journey',        description: 'Movement, adventure, and passage',      color: '#cc8844' },
    { id: 'transformation', name: 'Transformation', description: 'Deep change from one state to another', color: '#cc44aa' },
    { id: 'legacy',         name: 'Legacy',         description: 'What we leave behind for others',       color: '#4488cc' }
  ];

  // ---------------------------------------------------------------------------
  // TRIGGER TEMPLATES — 30+ action-to-thread triggers
  // ---------------------------------------------------------------------------

  var TRIGGER_TEMPLATES = [
    // Gardens — growth and cooperation themes
    {
      id: 'garden_planted',
      actionType: 'plant',
      zone: 'gardens',
      threadTheme: 'growth',
      narrativeTemplate: '{playerName} planted {itemName} in the Gardens, beginning a story of growth...',
      followUpHooks: ['tend_garden', 'share_harvest', 'teach_growing']
    },
    {
      id: 'garden_tended',
      actionType: 'garden_tend',
      zone: 'gardens',
      threadTheme: 'cooperation',
      narrativeTemplate: '{playerName} tended the communal garden, nurturing what others planted...',
      followUpHooks: ['share_harvest', 'invite_to_garden', 'teach_growing']
    },
    {
      id: 'garden_harvest',
      actionType: 'harvest',
      zone: 'gardens',
      threadTheme: 'celebration',
      narrativeTemplate: '{playerName} gathered the harvest in the Gardens, the fruits of patient labor...',
      followUpHooks: ['gift_food', 'share_feast', 'plant_anew']
    },

    // Athenaeum — discovery and legacy themes
    {
      id: 'knowledge_shared',
      actionType: 'teach',
      zone: 'athenaeum',
      threadTheme: 'legacy',
      narrativeTemplate: '{playerName} shared knowledge in the Athenaeum, adding to the living record...',
      followUpHooks: ['learn_more', 'spread_knowledge', 'mentor_student']
    },
    {
      id: 'lore_discovered',
      actionType: 'discover',
      zone: 'athenaeum',
      threadTheme: 'discovery',
      narrativeTemplate: '{playerName} uncovered a long-forgotten truth in the Athenaeum...',
      followUpHooks: ['share_discovery', 'investigate_further', 'teach_others']
    },
    {
      id: 'book_crafted',
      actionType: 'craft',
      zone: 'athenaeum',
      threadTheme: 'legacy',
      narrativeTemplate: '{playerName} crafted a tome of knowledge in the Athenaeum...',
      followUpHooks: ['gift_book', 'display_in_library', 'teach_from_book']
    },

    // Studio — transformation and creativity
    {
      id: 'artwork_created',
      actionType: 'craft',
      zone: 'studio',
      threadTheme: 'transformation',
      narrativeTemplate: '{playerName} created {itemName} in the Studio, reshaping raw material into meaning...',
      followUpHooks: ['display_artwork', 'gift_creation', 'inspire_others']
    },
    {
      id: 'song_composed',
      actionType: 'compose',
      zone: 'studio',
      threadTheme: 'journey',
      narrativeTemplate: '{playerName} composed a new song in the Studio, a melody seeking its audience...',
      followUpHooks: ['perform_song', 'teach_melody', 'share_composition']
    },
    {
      id: 'building_started',
      actionType: 'build',
      zone: 'studio',
      threadTheme: 'growth',
      narrativeTemplate: '{playerName} began building in the Studio, laying foundations for something new...',
      followUpHooks: ['collaborate_build', 'complete_structure', 'celebrate_construction']
    },

    // Wilds — discovery and mystery themes
    {
      id: 'wilderness_explored',
      actionType: 'discover',
      zone: 'wilds',
      threadTheme: 'discovery',
      narrativeTemplate: '{playerName} ventured deep into the Wilds and discovered something unexpected...',
      followUpHooks: ['map_discovery', 'guide_others', 'investigate_mystery']
    },
    {
      id: 'creature_encountered',
      actionType: 'discover',
      zone: 'wilds',
      threadTheme: 'mystery',
      narrativeTemplate: '{playerName} encountered a rare creature in the Wilds — an omen of things to come...',
      followUpHooks: ['study_creature', 'protect_habitat', 'report_sighting']
    },
    {
      id: 'ruin_found',
      actionType: 'discover',
      zone: 'wilds',
      threadTheme: 'legacy',
      narrativeTemplate: '{playerName} found ancient ruins in the Wilds, echoes of a civilization before ZION...',
      followUpHooks: ['excavate_ruin', 'document_finding', 'share_with_athenaeum']
    },

    // Agora — conflict and cooperation themes
    {
      id: 'debate_started',
      actionType: 'say',
      zone: 'agora',
      threadTheme: 'conflict',
      narrativeTemplate: '{playerName} sparked a lively debate in the Agora, voices rising and ideas clashing...',
      followUpHooks: ['join_debate', 'mediate_conflict', 'propose_resolution']
    },
    {
      id: 'trade_negotiated',
      actionType: 'trade_offer',
      zone: 'agora',
      threadTheme: 'cooperation',
      narrativeTemplate: '{playerName} opened trade negotiations in the Agora, seeking mutual benefit...',
      followUpHooks: ['counter_offer', 'broker_deal', 'celebrate_agreement']
    },
    {
      id: 'election_called',
      actionType: 'election_start',
      zone: 'agora',
      threadTheme: 'transformation',
      narrativeTemplate: '{playerName} called for an election in the Agora, the future of the zone hanging in the balance...',
      followUpHooks: ['campaign', 'vote', 'accept_outcome']
    },

    // Commons — cooperation and celebration
    {
      id: 'gift_given',
      actionType: 'gift',
      zone: 'commons',
      threadTheme: 'cooperation',
      narrativeTemplate: '{playerName} gave a generous gift in the Commons, strengthening the bonds of community...',
      followUpHooks: ['thank_giver', 'pay_it_forward', 'share_story']
    },
    {
      id: 'feast_prepared',
      actionType: 'craft',
      zone: 'commons',
      threadTheme: 'celebration',
      narrativeTemplate: '{playerName} prepared a communal feast in the Commons, drawing all nearby together...',
      followUpHooks: ['join_feast', 'contribute_food', 'tell_stories']
    },
    {
      id: 'commons_built',
      actionType: 'build',
      zone: 'commons',
      threadTheme: 'legacy',
      narrativeTemplate: '{playerName} built a new structure in the Commons, leaving a mark for future generations...',
      followUpHooks: ['dedicate_building', 'name_structure', 'share_vision']
    },

    // Arena — conflict and journey
    {
      id: 'challenge_issued',
      actionType: 'challenge',
      zone: 'arena',
      threadTheme: 'conflict',
      narrativeTemplate: '{playerName} issued a challenge in the Arena, honor and pride on the line...',
      followUpHooks: ['accept_challenge', 'witness_duel', 'honor_victor']
    },
    {
      id: 'tournament_victory',
      actionType: 'score',
      zone: 'arena',
      threadTheme: 'journey',
      narrativeTemplate: '{playerName} achieved a hard-won victory in the Arena, the culmination of long training...',
      followUpHooks: ['celebrate_victor', 'challenge_champion', 'learn_technique']
    },
    {
      id: 'rival_forgiven',
      actionType: 'gift',
      zone: 'arena',
      threadTheme: 'transformation',
      narrativeTemplate: '{playerName} offered peace to a rival in the Arena, transforming conflict into respect...',
      followUpHooks: ['accept_peace', 'train_together', 'share_rivalry_tale']
    },

    // Nexus — journey and legacy
    {
      id: 'arrival_announced',
      actionType: 'join',
      zone: 'nexus',
      threadTheme: 'journey',
      narrativeTemplate: '{playerName} arrived in the Nexus, beginning their journey in ZION...',
      followUpHooks: ['welcome_newcomer', 'guide_new_player', 'share_own_arrival']
    },
    {
      id: 'farewell_made',
      actionType: 'leave',
      zone: 'nexus',
      threadTheme: 'loss',
      narrativeTemplate: '{playerName} departed from the Nexus, leaving an absence felt by those who knew them...',
      followUpHooks: ['remember_player', 'honor_departure', 'continue_their_work']
    },
    {
      id: 'prophecy_shared',
      actionType: 'say',
      zone: 'nexus',
      threadTheme: 'mystery',
      narrativeTemplate: '{playerName} spoke a prophecy at the Nexus crossroads, words that lingered in the air...',
      followUpHooks: ['interpret_prophecy', 'seek_fulfillment', 'document_prophecy']
    },

    // Cross-zone — transformation and discovery
    {
      id: 'warp_discovered',
      actionType: 'warp',
      zone: null,
      threadTheme: 'discovery',
      narrativeTemplate: '{playerName} discovered a warp path connecting distant zones...',
      followUpHooks: ['map_warp', 'share_route', 'explore_destination']
    },
    {
      id: 'mentor_found',
      actionType: 'mentor_offer',
      zone: null,
      threadTheme: 'growth',
      narrativeTemplate: '{playerName} offered mentorship, opening a path of growth for another...',
      followUpHooks: ['accept_mentorship', 'complete_first_lesson', 'graduate_student']
    },
    {
      id: 'lost_and_found',
      actionType: 'discover',
      zone: null,
      threadTheme: 'loss',
      narrativeTemplate: '{playerName} found something lost — object, memory, or person — and the world felt smaller...',
      followUpHooks: ['return_lost_item', 'share_story', 'mark_the_place']
    },
    {
      id: 'alliance_formed',
      actionType: 'mentor_accept',
      zone: null,
      threadTheme: 'cooperation',
      narrativeTemplate: '{playerName} formed an alliance, two paths joining into one stronger road...',
      followUpHooks: ['act_together', 'celebrate_alliance', 'expand_alliance']
    },
    {
      id: 'secret_revealed',
      actionType: 'say',
      zone: null,
      threadTheme: 'mystery',
      narrativeTemplate: '{playerName} revealed a secret long kept, and the shape of the world shifted slightly...',
      followUpHooks: ['investigate_secret', 'keep_confidence', 'act_on_knowledge']
    },
    {
      id: 'legend_earned',
      actionType: 'score',
      zone: null,
      threadTheme: 'legacy',
      narrativeTemplate: '{playerName} achieved legendary status, their name becoming part of ZION\'s story...',
      followUpHooks: ['celebrate_legend', 'challenge_legend', 'learn_from_legend']
    }
  ];

  // ---------------------------------------------------------------------------
  // THREAD STATUS VALUES
  // ---------------------------------------------------------------------------

  var VALID_STATUSES = ['open', 'active', 'concluded', 'archived'];

  var VALID_ZONES = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];

  // ---------------------------------------------------------------------------
  // INTERNAL COUNTER
  // ---------------------------------------------------------------------------

  var _threadCounter = 0;

  function _nextThreadId() {
    _threadCounter++;
    return 'thread_' + _threadCounter;
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  function _getThemeById(themeId) {
    for (var i = 0; i < THREAD_THEMES.length; i++) {
      if (THREAD_THEMES[i].id === themeId) return THREAD_THEMES[i];
    }
    return null;
  }

  function _isValidTheme(themeId) {
    return _getThemeById(themeId) !== null;
  }

  function _ensureThreads(state) {
    if (!state.narrativeThreads) {
      state.narrativeThreads = [];
    }
  }

  function _formatNarrative(template, playerName, itemName) {
    var text = template;
    text = text.replace(/{playerName}/g, playerName || 'A traveler');
    text = text.replace(/{itemName}/g, itemName || 'something wondrous');
    return text;
  }

  function _findTemplate(actionType, zone) {
    var zoneMatch = null;
    var anyZoneMatch = null;

    for (var i = 0; i < TRIGGER_TEMPLATES.length; i++) {
      var t = TRIGGER_TEMPLATES[i];
      if (t.actionType === actionType) {
        if (t.zone === zone) {
          if (!zoneMatch) zoneMatch = t;
        } else if (t.zone === null) {
          if (!anyZoneMatch) anyZoneMatch = t;
        }
      }
    }

    return zoneMatch || anyZoneMatch || null;
  }

  // ---------------------------------------------------------------------------
  // PUBLIC API
  // ---------------------------------------------------------------------------

  /**
   * getThemes — return all 10 thread themes
   */
  function getThemes() {
    return THREAD_THEMES.slice();
  }

  /**
   * getTriggerTemplates — return all trigger templates
   */
  function getTriggerTemplates() {
    return TRIGGER_TEMPLATES.slice();
  }

  /**
   * createThread — auto-create thread from player action using trigger templates
   * @param {Object} state
   * @param {string} playerId
   * @param {string} actionType
   * @param {string} zone
   * @param {Object} context  — {playerName, itemName, ...}
   * @param {number} currentTick
   * @returns {Object} {success, thread?, error?}
   */
  function createThread(state, playerId, actionType, zone, context, currentTick) {
    if (!playerId) return { success: false, error: 'playerId required' };
    if (!actionType) return { success: false, error: 'actionType required' };

    _ensureThreads(state);

    var ctx = context || {};
    var tick = typeof currentTick === 'number' ? currentTick : 0;

    var template = _findTemplate(actionType, zone);
    if (!template) {
      return { success: false, error: 'No trigger template found for action: ' + actionType + ' in zone: ' + zone };
    }

    var narrative = _formatNarrative(template.narrativeTemplate, ctx.playerName, ctx.itemName);

    var thread = {
      id: _nextThreadId(),
      theme: template.threadTheme,
      status: 'open',
      originAction: {
        playerId: playerId,
        actionType: actionType,
        zone: zone || null,
        tick: tick
      },
      beats: [
        {
          playerId: playerId,
          text: narrative,
          tick: tick,
          zone: zone || null,
          actionType: actionType
        }
      ],
      participants: [playerId],
      hooks: template.followUpHooks.slice(),
      linkedThreads: [],
      templateId: template.id,
      createdAt: tick
    };

    state.narrativeThreads.push(thread);

    return { success: true, thread: thread };
  }

  /**
   * addBeat — add a story beat to a thread
   * @param {Object} state
   * @param {string} playerId
   * @param {string} threadId
   * @param {string} text
   * @param {string} actionType
   * @param {string} zone
   * @param {number} currentTick
   * @returns {Object} {success, beat?, error?}
   */
  function addBeat(state, playerId, threadId, text, actionType, zone, currentTick) {
    if (!playerId) return { success: false, error: 'playerId required' };
    if (!threadId) return { success: false, error: 'threadId required' };
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return { success: false, error: 'text required' };
    }

    _ensureThreads(state);

    var thread = getThreadById(state, threadId);
    if (!thread) return { success: false, error: 'Thread not found: ' + threadId };
    if (thread.status === 'concluded' || thread.status === 'archived') {
      return { success: false, error: 'Cannot add beat to ' + thread.status + ' thread' };
    }

    var tick = typeof currentTick === 'number' ? currentTick : 0;

    var beat = {
      playerId: playerId,
      text: text.trim(),
      tick: tick,
      zone: zone || null,
      actionType: actionType || null
    };

    thread.beats.push(beat);

    // Become participant if not already
    if (thread.participants.indexOf(playerId) === -1) {
      thread.participants.push(playerId);
    }

    // Promote to active if there are 2+ participants
    if (thread.status === 'open' && thread.participants.length >= 2) {
      thread.status = 'active';
    }

    return { success: true, beat: beat };
  }

  /**
   * pickUpThread — player joins an open thread
   * @param {Object} state
   * @param {string} playerId
   * @param {string} threadId
   * @returns {Object} {success, thread?, error?}
   */
  function pickUpThread(state, playerId, threadId) {
    if (!playerId) return { success: false, error: 'playerId required' };
    if (!threadId) return { success: false, error: 'threadId required' };

    _ensureThreads(state);

    var thread = getThreadById(state, threadId);
    if (!thread) return { success: false, error: 'Thread not found: ' + threadId };
    if (thread.status === 'concluded' || thread.status === 'archived') {
      return { success: false, error: 'Cannot pick up ' + thread.status + ' thread' };
    }

    if (thread.participants.indexOf(playerId) !== -1) {
      return { success: false, error: 'Player already in this thread' };
    }

    thread.participants.push(playerId);

    // Promote to active if there are 2+ participants
    if (thread.status === 'open' && thread.participants.length >= 2) {
      thread.status = 'active';
    }

    return { success: true, thread: thread };
  }

  /**
   * concludeThread — end a thread with a conclusion
   * @param {Object} state
   * @param {string} playerId
   * @param {string} threadId
   * @param {string} conclusion
   * @param {number} currentTick
   * @returns {Object} {success, thread?, participants?, error?}
   */
  function concludeThread(state, playerId, threadId, conclusion, currentTick) {
    if (!playerId) return { success: false, error: 'playerId required' };
    if (!threadId) return { success: false, error: 'threadId required' };
    if (!conclusion || typeof conclusion !== 'string' || conclusion.trim().length === 0) {
      return { success: false, error: 'conclusion text required' };
    }

    _ensureThreads(state);

    var thread = getThreadById(state, threadId);
    if (!thread) return { success: false, error: 'Thread not found: ' + threadId };
    if (thread.status === 'concluded' || thread.status === 'archived') {
      return { success: false, error: 'Thread is already ' + thread.status };
    }

    // Player must be a participant to conclude
    if (thread.participants.indexOf(playerId) === -1) {
      return { success: false, error: 'Only participants can conclude a thread' };
    }

    var tick = typeof currentTick === 'number' ? currentTick : 0;

    thread.status = 'concluded';
    thread.conclusion = conclusion.trim();
    thread.concludedBy = playerId;
    thread.concludedAt = tick;

    // Add conclusion beat
    thread.beats.push({
      playerId: playerId,
      text: '[CONCLUSION] ' + conclusion.trim(),
      tick: tick,
      zone: null,
      actionType: 'conclude'
    });

    return {
      success: true,
      thread: thread,
      participants: thread.participants.slice()
    };
  }

  /**
   * linkThreads — link two threads into a larger narrative arc
   * @param {Object} state
   * @param {string} threadIdA
   * @param {string} threadIdB
   * @returns {Object} {success, error?}
   */
  function linkThreads(state, threadIdA, threadIdB) {
    if (!threadIdA || !threadIdB) return { success: false, error: 'Both thread IDs required' };
    if (threadIdA === threadIdB) return { success: false, error: 'Cannot link thread to itself' };

    _ensureThreads(state);

    var threadA = getThreadById(state, threadIdA);
    var threadB = getThreadById(state, threadIdB);

    if (!threadA) return { success: false, error: 'Thread not found: ' + threadIdA };
    if (!threadB) return { success: false, error: 'Thread not found: ' + threadIdB };

    if (threadA.linkedThreads.indexOf(threadIdB) === -1) {
      threadA.linkedThreads.push(threadIdB);
    }
    if (threadB.linkedThreads.indexOf(threadIdA) === -1) {
      threadB.linkedThreads.push(threadIdA);
    }

    return { success: true };
  }

  /**
   * getThreadById — find a thread by its ID
   * @param {Object} state
   * @param {string} threadId
   * @returns {Object|null}
   */
  function getThreadById(state, threadId) {
    _ensureThreads(state);
    for (var i = 0; i < state.narrativeThreads.length; i++) {
      if (state.narrativeThreads[i].id === threadId) {
        return state.narrativeThreads[i];
      }
    }
    return null;
  }

  /**
   * getOpenThreads — get threads with status 'open' optionally filtered by zone
   * @param {Object} state
   * @param {string} [zone]  — optional zone filter
   * @returns {Array}
   */
  function getOpenThreads(state, zone) {
    _ensureThreads(state);
    var result = [];
    for (var i = 0; i < state.narrativeThreads.length; i++) {
      var t = state.narrativeThreads[i];
      if (t.status !== 'open') continue;
      if (zone) {
        if (t.originAction && t.originAction.zone === zone) {
          result.push(t);
        }
      } else {
        result.push(t);
      }
    }
    return result;
  }

  /**
   * getActiveThreads — get threads with status 'active' optionally filtered by player
   * @param {Object} state
   * @param {string} [playerId]  — optional player filter
   * @returns {Array}
   */
  function getActiveThreads(state, playerId) {
    _ensureThreads(state);
    var result = [];
    for (var i = 0; i < state.narrativeThreads.length; i++) {
      var t = state.narrativeThreads[i];
      if (t.status !== 'active') continue;
      if (playerId) {
        if (t.participants.indexOf(playerId) !== -1) {
          result.push(t);
        }
      } else {
        result.push(t);
      }
    }
    return result;
  }

  /**
   * getThreadsByTheme — get threads matching a given theme
   * @param {Object} state
   * @param {string} theme
   * @returns {Array}
   */
  function getThreadsByTheme(state, theme) {
    _ensureThreads(state);
    var result = [];
    for (var i = 0; i < state.narrativeThreads.length; i++) {
      if (state.narrativeThreads[i].theme === theme) {
        result.push(state.narrativeThreads[i]);
      }
    }
    return result;
  }

  /**
   * getPlayerThreads — get all threads a player participates in
   * @param {Object} state
   * @param {string} playerId
   * @returns {Array}
   */
  function getPlayerThreads(state, playerId) {
    _ensureThreads(state);
    if (!playerId) return [];
    var result = [];
    for (var i = 0; i < state.narrativeThreads.length; i++) {
      var t = state.narrativeThreads[i];
      if (t.participants.indexOf(playerId) !== -1) {
        result.push(t);
      }
    }
    return result;
  }

  /**
   * searchThreads — search threads by query string (searches beat text, theme, and template ID)
   * @param {Object} state
   * @param {string} query
   * @returns {Array}
   */
  function searchThreads(state, query) {
    _ensureThreads(state);
    if (!query || typeof query !== 'string') return [];

    var q = query.toLowerCase().trim();
    if (q.length === 0) return [];

    var result = [];
    for (var i = 0; i < state.narrativeThreads.length; i++) {
      var t = state.narrativeThreads[i];
      var matched = false;

      // Match theme
      if (t.theme && t.theme.toLowerCase().indexOf(q) !== -1) {
        matched = true;
      }

      // Match templateId
      if (!matched && t.templateId && t.templateId.toLowerCase().indexOf(q) !== -1) {
        matched = true;
      }

      // Match beats text
      if (!matched) {
        for (var j = 0; j < t.beats.length; j++) {
          if (t.beats[j].text && t.beats[j].text.toLowerCase().indexOf(q) !== -1) {
            matched = true;
            break;
          }
        }
      }

      // Match conclusion
      if (!matched && t.conclusion && t.conclusion.toLowerCase().indexOf(q) !== -1) {
        matched = true;
      }

      // Match zone
      if (!matched && t.originAction && t.originAction.zone &&
          t.originAction.zone.toLowerCase().indexOf(q) !== -1) {
        matched = true;
      }

      if (matched) result.push(t);
    }
    return result;
  }

  /**
   * getThreadHistory — return threads created between fromTick and toTick
   * @param {Object} state
   * @param {number} fromTick
   * @param {number} toTick
   * @returns {Array}
   */
  function getThreadHistory(state, fromTick, toTick) {
    _ensureThreads(state);
    var from = typeof fromTick === 'number' ? fromTick : 0;
    var to = typeof toTick === 'number' ? toTick : Infinity;
    var result = [];
    for (var i = 0; i < state.narrativeThreads.length; i++) {
      var t = state.narrativeThreads[i];
      var created = typeof t.createdAt === 'number' ? t.createdAt : 0;
      if (created >= from && created <= to) {
        result.push(t);
      }
    }
    return result;
  }

  /**
   * suggestThreads — find threads that match a player's current action context
   * Matches by actionType hooks or theme, excludes threads the player is already in
   * @param {Object} state
   * @param {string} playerId
   * @param {string} zone
   * @param {string} actionType
   * @returns {Array} threads sorted by relevance
   */
  function suggestThreads(state, playerId, zone, actionType) {
    _ensureThreads(state);

    var scored = [];

    for (var i = 0; i < state.narrativeThreads.length; i++) {
      var t = state.narrativeThreads[i];

      // Only suggest open or active threads
      if (t.status !== 'open' && t.status !== 'active') continue;

      // Don't suggest threads the player is already in
      if (t.participants.indexOf(playerId) !== -1) continue;

      var score = 0;

      // Check hooks
      if (actionType && t.hooks) {
        for (var j = 0; j < t.hooks.length; j++) {
          if (t.hooks[j].indexOf(actionType) !== -1 || actionType.indexOf(t.hooks[j]) !== -1) {
            score += 3;
            break;
          }
        }
      }

      // Zone match on origin
      if (zone && t.originAction && t.originAction.zone === zone) {
        score += 2;
      }

      // Theme affinity via template
      if (actionType) {
        var tpl = _findTemplate(actionType, zone);
        if (tpl && tpl.threadTheme === t.theme) {
          score += 2;
        }
      }

      // Open threads are slightly more suitable
      if (t.status === 'open') score += 1;

      if (score > 0) {
        scored.push({ thread: t, score: score });
      }
    }

    // Sort by score descending
    scored.sort(function(a, b) { return b.score - a.score; });

    var result = [];
    for (var k = 0; k < scored.length; k++) {
      result.push(scored[k].thread);
    }
    return result;
  }

  /**
   * getParticipantStats — threads participated in, beats contributed, threads concluded
   * @param {Object} state
   * @param {string} playerId
   * @returns {Object} {threadsParticipated, beatsContributed, threadsConcluded, threadsStarted}
   */
  function getParticipantStats(state, playerId) {
    _ensureThreads(state);

    var stats = {
      threadsParticipated: 0,
      beatsContributed: 0,
      threadsConcluded: 0,
      threadsStarted: 0
    };

    if (!playerId) return stats;

    for (var i = 0; i < state.narrativeThreads.length; i++) {
      var t = state.narrativeThreads[i];

      if (t.participants.indexOf(playerId) !== -1) {
        stats.threadsParticipated++;
      }

      // Count beats
      for (var j = 0; j < t.beats.length; j++) {
        if (t.beats[j].playerId === playerId) {
          stats.beatsContributed++;
        }
      }

      // Count conclusions
      if (t.concludedBy === playerId) {
        stats.threadsConcluded++;
      }

      // Count threads started
      if (t.originAction && t.originAction.playerId === playerId) {
        stats.threadsStarted++;
      }
    }

    return stats;
  }

  /**
   * getWorldNarrative — return most recent N narrative events across all threads
   * Returns beats sorted by tick descending for a "world story" feed
   * @param {Object} state
   * @param {number} count
   * @returns {Array} [{threadId, theme, beat}]
   */
  function getWorldNarrative(state, count) {
    _ensureThreads(state);

    var n = typeof count === 'number' && count > 0 ? count : 10;
    var events = [];

    for (var i = 0; i < state.narrativeThreads.length; i++) {
      var t = state.narrativeThreads[i];
      for (var j = 0; j < t.beats.length; j++) {
        events.push({
          threadId: t.id,
          theme: t.theme,
          status: t.status,
          beat: t.beats[j]
        });
      }
    }

    // Sort by tick descending (newest first)
    events.sort(function(a, b) {
      return (b.beat.tick || 0) - (a.beat.tick || 0);
    });

    return events.slice(0, n);
  }

  /**
   * archiveThread — move a thread to archived status
   * @param {Object} state
   * @param {string} threadId
   * @returns {Object} {success, thread?, error?}
   */
  function archiveThread(state, threadId) {
    if (!threadId) return { success: false, error: 'threadId required' };

    _ensureThreads(state);

    var thread = getThreadById(state, threadId);
    if (!thread) return { success: false, error: 'Thread not found: ' + threadId };
    if (thread.status === 'archived') {
      return { success: false, error: 'Thread is already archived' };
    }

    thread.status = 'archived';
    return { success: true, thread: thread };
  }

  /**
   * getNarrativeArc — follow linked threads to build a full arc
   * Returns the root thread + all reachable linked threads (BFS)
   * @param {Object} state
   * @param {string} threadId
   * @returns {Object} {rootThread, arc: [...threads], error?}
   */
  function getNarrativeArc(state, threadId) {
    if (!threadId) return { rootThread: null, arc: [], error: 'threadId required' };

    _ensureThreads(state);

    var root = getThreadById(state, threadId);
    if (!root) return { rootThread: null, arc: [], error: 'Thread not found: ' + threadId };

    // BFS traversal of linked threads
    var visited = {};
    var queue = [threadId];
    var arc = [];

    visited[threadId] = true;

    while (queue.length > 0) {
      var currentId = queue.shift();
      var current = getThreadById(state, currentId);
      if (!current) continue;

      arc.push(current);

      for (var i = 0; i < current.linkedThreads.length; i++) {
        var linkedId = current.linkedThreads[i];
        if (!visited[linkedId]) {
          visited[linkedId] = true;
          queue.push(linkedId);
        }
      }
    }

    return { rootThread: root, arc: arc };
  }

  // ---------------------------------------------------------------------------
  // EXPORTS
  // ---------------------------------------------------------------------------

  exports.getThemes = getThemes;
  exports.getTriggerTemplates = getTriggerTemplates;
  exports.createThread = createThread;
  exports.addBeat = addBeat;
  exports.pickUpThread = pickUpThread;
  exports.concludeThread = concludeThread;
  exports.linkThreads = linkThreads;
  exports.getThreadById = getThreadById;
  exports.getOpenThreads = getOpenThreads;
  exports.getActiveThreads = getActiveThreads;
  exports.getThreadsByTheme = getThreadsByTheme;
  exports.getPlayerThreads = getPlayerThreads;
  exports.searchThreads = searchThreads;
  exports.getThreadHistory = getThreadHistory;
  exports.suggestThreads = suggestThreads;
  exports.getParticipantStats = getParticipantStats;
  exports.getWorldNarrative = getWorldNarrative;
  exports.archiveThread = archiveThread;
  exports.getNarrativeArc = getNarrativeArc;

  // Expose constants for tests
  exports._THREAD_THEMES = THREAD_THEMES;
  exports._TRIGGER_TEMPLATES = TRIGGER_TEMPLATES;
  exports._VALID_STATUSES = VALID_STATUSES;
  exports._VALID_ZONES = VALID_ZONES;

})(typeof module !== 'undefined' ? module.exports : (window.NarrativeThreads = {}));
