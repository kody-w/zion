// world_events.js — Living World Events System for ZION
// Spontaneous events that affect all players and shape the world
(function(exports) {
  'use strict';

  // ── Constants ──────────────────────────────────────────────────────────────

  var MAX_CONCURRENT_EVENTS = 3;
  var EVENT_COOLDOWN_HOURS = 4;
  var EVENT_COOLDOWN_MS = EVENT_COOLDOWN_HOURS * 60 * 60 * 1000;

  // Event categories
  var CATEGORY_CELESTIAL = 'celestial';
  var CATEGORY_NATURE    = 'nature';
  var CATEGORY_SOCIAL    = 'social';
  var CATEGORY_MYSTERY   = 'mystery';

  // ── EVENT_CATALOG ──────────────────────────────────────────────────────────
  // 15 events across 4 categories

  var EVENT_CATALOG = {

    // ── Celestial ─────────────────────────────────────────────────────────

    meteor_shower: {
      id: 'meteor_shower',
      category: CATEGORY_CELESTIAL,
      name: 'Meteor Shower',
      description: 'Streaks of light rain across the sky as meteors burn through the atmosphere. Some fragments may land in the world.',
      durationMinutes: 30,
      minParticipants: 1,
      maxParticipants: 100,
      zones: ['nexus', 'wilds', 'gardens', 'commons', 'agora', 'arena', 'athenaeum', 'studio'],
      effects: [
        { type: 'visual', value: 'meteor_trails' },
        { type: 'item_drop', value: 'meteor_fragment', chance: 0.15 },
        { type: 'spark_bonus', value: 10 }
      ],
      rewards: {
        participation: { sparks: 15, item: 'stardust' },
        completion: { sparks: 30, item: 'meteor_fragment', badge: 'stargazer' }
      },
      contributionGoal: 50,
      contributionUnit: 'observations',
      rarity: 0.4,
      cooldownHours: 6,
      announceMessage: 'A meteor shower blazes across the sky! Look up and make a wish.'
    },

    aurora: {
      id: 'aurora',
      category: CATEGORY_CELESTIAL,
      name: 'Aurora Borealis',
      description: 'The sky erupts in waves of colour — green, violet, and gold — as the aurora dances overhead.',
      durationMinutes: 45,
      minParticipants: 1,
      maxParticipants: 100,
      zones: ['nexus', 'wilds', 'gardens', 'commons', 'agora', 'arena', 'athenaeum', 'studio'],
      effects: [
        { type: 'visual', value: 'aurora_sky' },
        { type: 'inspiration_boost', value: 0.25 },
        { type: 'craft_bonus', value: 1.2 }
      ],
      rewards: {
        participation: { sparks: 20 },
        completion: { sparks: 40, badge: 'aurora_witness' }
      },
      contributionGoal: 30,
      contributionUnit: 'paintings',
      rarity: 0.25,
      cooldownHours: 12,
      announceMessage: 'The aurora lights up the heavens! Artists, philosophers — this moment is yours.'
    },

    solar_eclipse: {
      id: 'solar_eclipse',
      category: CATEGORY_CELESTIAL,
      name: 'Solar Eclipse',
      description: 'The moon passes before the sun, casting the world into eerie twilight. Ancient powers stir.',
      durationMinutes: 20,
      minParticipants: 1,
      maxParticipants: 100,
      zones: ['nexus', 'wilds', 'gardens', 'commons', 'agora', 'arena', 'athenaeum', 'studio'],
      effects: [
        { type: 'visual', value: 'eclipse_sky' },
        { type: 'mystery_amplify', value: 2.0 },
        { type: 'creature_spawn_boost', value: 1.5 }
      ],
      rewards: {
        participation: { sparks: 25 },
        completion: { sparks: 50, item: 'eclipse_shard', badge: 'eclipse_seeker' }
      },
      contributionGoal: 20,
      contributionUnit: 'rituals',
      rarity: 0.15,
      cooldownHours: 48,
      announceMessage: 'Darkness falls as the eclipse begins. The veil between worlds thins...'
    },

    blood_moon: {
      id: 'blood_moon',
      category: CATEGORY_CELESTIAL,
      name: 'Blood Moon',
      description: 'The full moon turns a deep crimson red, empowering the wild and awakening ancient threats.',
      durationMinutes: 60,
      minParticipants: 2,
      maxParticipants: 50,
      zones: ['wilds', 'arena', 'nexus', 'commons'],
      effects: [
        { type: 'visual', value: 'blood_moon_sky' },
        { type: 'creature_power', value: 2.0 },
        { type: 'pvp_enabled', value: true },
        { type: 'loot_multiplier', value: 2.0 }
      ],
      rewards: {
        participation: { sparks: 30 },
        completion: { sparks: 75, item: 'blood_crystal', badge: 'blood_moon_survivor' }
      },
      contributionGoal: 100,
      contributionUnit: 'combat_victories',
      rarity: 0.2,
      cooldownHours: 24,
      announceMessage: 'The Blood Moon rises! Warriors, prepare — the wild creatures are empowered!'
    },

    // ── Nature ────────────────────────────────────────────────────────────

    wild_bloom: {
      id: 'wild_bloom',
      category: CATEGORY_NATURE,
      name: 'Wild Bloom',
      description: 'Rare and magical flowers burst into bloom across the Gardens and Wilds, yielding extraordinary materials.',
      durationMinutes: 40,
      minParticipants: 1,
      maxParticipants: 40,
      zones: ['gardens', 'wilds', 'commons'],
      effects: [
        { type: 'visual', value: 'bloom_particles' },
        { type: 'harvest_yield', value: 2.0 },
        { type: 'rare_item_chance', value: 0.3 }
      ],
      rewards: {
        participation: { sparks: 15, item: 'rare_bloom' },
        completion: { sparks: 35, item: 'bloom_essence', badge: 'bloom_harvester' }
      },
      contributionGoal: 60,
      contributionUnit: 'flowers_harvested',
      rarity: 0.35,
      cooldownHours: 8,
      announceMessage: 'Wild blooms erupt across the land! Rare flowers appear — harvest before they fade!'
    },

    creature_migration: {
      id: 'creature_migration',
      category: CATEGORY_NATURE,
      name: 'Creature Migration',
      description: 'Great herds of creatures cross the land, following ancient paths. Witness the spectacle or guide them safely.',
      durationMinutes: 50,
      minParticipants: 2,
      maxParticipants: 60,
      zones: ['wilds', 'commons', 'gardens', 'nexus'],
      effects: [
        { type: 'creature_spawn', value: 'migration_herd' },
        { type: 'pathfinding_boost', value: 1.5 },
        { type: 'exploration_xp', value: 2.0 }
      ],
      rewards: {
        participation: { sparks: 20 },
        completion: { sparks: 45, item: 'migration_feather', badge: 'herd_guide' }
      },
      contributionGoal: 80,
      contributionUnit: 'creatures_guided',
      rarity: 0.3,
      cooldownHours: 10,
      announceMessage: 'A great migration begins! Herds of creatures cross the land — guide or follow them!'
    },

    great_storm: {
      id: 'great_storm',
      category: CATEGORY_NATURE,
      name: 'The Great Storm',
      description: 'A massive storm sweeps across the world, bringing danger but also raw elemental power. Brave the tempest for great reward.',
      durationMinutes: 35,
      minParticipants: 3,
      maxParticipants: 30,
      zones: ['wilds', 'nexus', 'commons', 'agora', 'gardens'],
      effects: [
        { type: 'visual', value: 'storm_sky' },
        { type: 'movement_penalty', value: 0.7 },
        { type: 'elemental_power', value: 3.0 },
        { type: 'lightning_hazard', value: true }
      ],
      rewards: {
        participation: { sparks: 25 },
        completion: { sparks: 60, item: 'storm_crystal', badge: 'storm_survivor' }
      },
      contributionGoal: 40,
      contributionUnit: 'lightning_rods_placed',
      rarity: 0.25,
      cooldownHours: 16,
      announceMessage: 'A great storm is coming! Seek shelter or brave the tempest for elemental rewards!'
    },

    earthquake: {
      id: 'earthquake',
      category: CATEGORY_NATURE,
      name: 'Earthquake',
      description: 'The earth shakes violently, opening fissures and revealing hidden underground chambers.',
      durationMinutes: 15,
      minParticipants: 1,
      maxParticipants: 80,
      zones: ['nexus', 'wilds', 'commons', 'agora', 'arena', 'gardens', 'athenaeum', 'studio'],
      effects: [
        { type: 'visual', value: 'ground_shake' },
        { type: 'terrain_change', value: 'fissures' },
        { type: 'reveal_hidden', value: true },
        { type: 'building_damage', value: 0.1 }
      ],
      rewards: {
        participation: { sparks: 20 },
        completion: { sparks: 40, item: 'geo_crystal', badge: 'earth_shaker' }
      },
      contributionGoal: 30,
      contributionUnit: 'fissures_explored',
      rarity: 0.2,
      cooldownHours: 20,
      announceMessage: 'The earth trembles! An earthquake strikes — explore newly opened fissures for hidden treasures!'
    },

    // ── Social ────────────────────────────────────────────────────────────

    festival: {
      id: 'festival',
      category: CATEGORY_SOCIAL,
      name: 'Grand Festival',
      description: 'Citizens of ZION gather for a grand festival of music, art, and celebration. All are welcome!',
      durationMinutes: 90,
      minParticipants: 5,
      maxParticipants: 100,
      zones: ['nexus', 'agora', 'commons', 'studio'],
      effects: [
        { type: 'happiness_boost', value: 2.0 },
        { type: 'social_xp', value: 2.0 },
        { type: 'craft_bonus', value: 1.5 },
        { type: 'music_performance', value: true }
      ],
      rewards: {
        participation: { sparks: 20, item: 'festival_token' },
        completion: { sparks: 50, item: 'festival_crown', badge: 'festival_spirit' }
      },
      contributionGoal: 200,
      contributionUnit: 'performances',
      rarity: 0.45,
      cooldownHours: 24,
      announceMessage: 'The Grand Festival begins! Come celebrate, perform, and share joy with all of ZION!'
    },

    market_day: {
      id: 'market_day',
      category: CATEGORY_SOCIAL,
      name: 'Market Day',
      description: 'A special market day with reduced fees, bonus trades, and rare goods available from travelling merchants.',
      durationMinutes: 120,
      minParticipants: 3,
      maxParticipants: 80,
      zones: ['nexus', 'agora', 'commons'],
      effects: [
        { type: 'market_fee_discount', value: 0.5 },
        { type: 'rare_goods_available', value: true },
        { type: 'trade_xp', value: 2.0 }
      ],
      rewards: {
        participation: { sparks: 10 },
        completion: { sparks: 30, badge: 'market_maven' }
      },
      contributionGoal: 150,
      contributionUnit: 'trades_completed',
      rarity: 0.5,
      cooldownHours: 12,
      announceMessage: 'Market Day is here! Reduced fees, rare goods, and travelling merchants await. Trade well!'
    },

    tournament: {
      id: 'tournament',
      category: CATEGORY_SOCIAL,
      name: 'Grand Tournament',
      description: 'Champions compete for glory and prizes in the Grand Tournament. Spectators cheer, competitors clash!',
      durationMinutes: 75,
      minParticipants: 4,
      maxParticipants: 64,
      zones: ['arena', 'nexus'],
      effects: [
        { type: 'pvp_enabled', value: true },
        { type: 'combat_xp', value: 3.0 },
        { type: 'spectator_rewards', value: true },
        { type: 'tournament_bracket', value: true }
      ],
      rewards: {
        participation: { sparks: 25 },
        completion: { sparks: 100, item: 'champion_trophy', badge: 'tournament_champion' }
      },
      contributionGoal: 100,
      contributionUnit: 'victories',
      rarity: 0.3,
      cooldownHours: 24,
      announceMessage: 'The Grand Tournament begins! Champions enter the arena — may the best warrior prevail!'
    },

    storytelling_circle: {
      id: 'storytelling_circle',
      category: CATEGORY_SOCIAL,
      name: 'Storytelling Circle',
      description: 'Citizens gather round to share stories, legends, and myths. Each tale woven enriches the lore of ZION.',
      durationMinutes: 60,
      minParticipants: 2,
      maxParticipants: 40,
      zones: ['athenaeum', 'nexus', 'commons', 'agora'],
      effects: [
        { type: 'lore_generation', value: true },
        { type: 'social_xp', value: 3.0 },
        { type: 'wisdom_boost', value: 1.5 }
      ],
      rewards: {
        participation: { sparks: 15, item: 'tale_scroll' },
        completion: { sparks: 35, badge: 'lore_keeper' }
      },
      contributionGoal: 20,
      contributionUnit: 'stories_told',
      rarity: 0.4,
      cooldownHours: 8,
      announceMessage: 'A storytelling circle forms! Share your tales and earn wisdom. All voices are welcome.'
    },

    // ── Mystery ───────────────────────────────────────────────────────────

    ancient_ruins_appear: {
      id: 'ancient_ruins_appear',
      category: CATEGORY_MYSTERY,
      name: 'Ancient Ruins Appear',
      description: 'Mysterious ruins rise from the earth, revealing lost knowledge and forgotten artefacts from a civilisation long gone.',
      durationMinutes: 60,
      minParticipants: 2,
      maxParticipants: 30,
      zones: ['wilds', 'commons', 'nexus', 'gardens'],
      effects: [
        { type: 'terrain_change', value: 'ruins_appear' },
        { type: 'lore_unlock', value: true },
        { type: 'exploration_xp', value: 3.0 },
        { type: 'artefact_spawn', value: true }
      ],
      rewards: {
        participation: { sparks: 30 },
        completion: { sparks: 70, item: 'ancient_artefact', badge: 'ruin_delver' }
      },
      contributionGoal: 50,
      contributionUnit: 'ruins_explored',
      rarity: 0.2,
      cooldownHours: 24,
      announceMessage: 'Ancient ruins have appeared! Something has emerged from beneath the earth — explore before they vanish!'
    },

    treasure_hunt: {
      id: 'treasure_hunt',
      category: CATEGORY_MYSTERY,
      name: 'Treasure Hunt',
      description: 'Cryptic clues are scattered across ZION. Solve the riddles, follow the trail, and claim the legendary treasure.',
      durationMinutes: 90,
      minParticipants: 1,
      maxParticipants: 50,
      zones: ['nexus', 'wilds', 'gardens', 'commons', 'agora', 'arena', 'athenaeum', 'studio'],
      effects: [
        { type: 'clue_spawn', value: true },
        { type: 'exploration_xp', value: 2.5 },
        { type: 'puzzle_xp', value: 2.0 }
      ],
      rewards: {
        participation: { sparks: 20 },
        completion: { sparks: 120, item: 'legendary_treasure', badge: 'treasure_hunter' }
      },
      contributionGoal: 10,
      contributionUnit: 'clues_solved',
      rarity: 0.3,
      cooldownHours: 16,
      announceMessage: 'A treasure hunt begins! Cryptic clues await — follow the trail to legendary riches!'
    },

    rift_surge: {
      id: 'rift_surge',
      category: CATEGORY_MYSTERY,
      name: 'Rift Surge',
      description: 'A powerful surge of energy tears rifts in the fabric of reality. Strange entities emerge. Close the rifts or face the consequences.',
      durationMinutes: 45,
      minParticipants: 3,
      maxParticipants: 40,
      zones: ['nexus', 'wilds', 'arena', 'commons', 'agora'],
      effects: [
        { type: 'rift_spawn', value: true },
        { type: 'entity_spawn', value: 'rift_creatures' },
        { type: 'magic_amplify', value: 3.0 },
        { type: 'reality_distortion', value: true }
      ],
      rewards: {
        participation: { sparks: 35 },
        completion: { sparks: 80, item: 'rift_shard', badge: 'rift_closer' }
      },
      contributionGoal: 30,
      contributionUnit: 'rifts_closed',
      rarity: 0.15,
      cooldownHours: 20,
      announceMessage: 'A rift surge tears open the sky! Close the rifts before ZION is overwhelmed by strange entities!'
    }
  };

  // ── State Management ────────────────────────────────────────────────────────

  /**
   * Creates a fresh events state container
   * @returns {Object} events state
   */
  function createEventsState() {
    return {
      activeEvents: [],        // currently running events
      eventHistory: [],        // completed/expired events
      participants: {},        // eventId -> Set/Array of participantIds
      contributions: {},       // eventId -> { userId: amount }
      cooldowns: {},           // eventId -> timestamp when cooldown expires
      upcomingEvents: [],      // scheduled future events
      eventCounter: 0          // monotonic id counter
    };
  }

  // ── Internal Helpers ────────────────────────────────────────────────────────

  /**
   * Simple seeded pseudo-random (LCG) — deterministic from seed
   * Returns a value in [0, 1)
   */
  function seededRand(seed) {
    var s = (seed ^ 0xdeadbeef) >>> 0;
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b) >>> 0;
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b) >>> 0;
    s = (s ^ (s >>> 16)) >>> 0;
    return s / 0x100000000;
  }

  /**
   * Generates a unique event instance id
   */
  function nextEventId(state) {
    state.eventCounter += 1;
    return 'evt_' + state.eventCounter;
  }

  /**
   * Returns current timestamp (ms). Injectable for tests.
   */
  var _getNow = function() { return Date.now(); };

  function setNowFn(fn) {
    _getNow = fn;
  }

  function getNow() {
    return _getNow();
  }

  // ── Core Event Lifecycle ────────────────────────────────────────────────────

  /**
   * Creates a new event instance (not yet started)
   * @param {Object} state - events state
   * @param {string} eventTypeId - key in EVENT_CATALOG
   * @param {Object} [options] - { zone, startTime }
   * @returns {Object|null} event instance or null if unknown type
   */
  function createEvent(state, eventTypeId, options) {
    var template = EVENT_CATALOG[eventTypeId];
    if (!template) { return null; }

    options = options || {};

    var now = getNow();
    var startTime = options.startTime !== undefined ? options.startTime : now;
    var zone = options.zone || template.zones[0];

    var instance = {
      instanceId: nextEventId(state),
      typeId: eventTypeId,
      category: template.category,
      name: template.name,
      description: template.description,
      zone: zone,
      startTime: startTime,
      endTime: startTime + template.durationMinutes * 60 * 1000,
      durationMinutes: template.durationMinutes,
      status: 'pending',        // pending | active | completed | expired
      effects: template.effects.slice(),
      rewards: template.rewards,
      contributionGoal: template.contributionGoal,
      contributionUnit: template.contributionUnit,
      minParticipants: template.minParticipants,
      maxParticipants: template.maxParticipants,
      totalContributions: 0,
      completed: false,
      announceMessage: template.announceMessage
    };

    return instance;
  }

  /**
   * Starts an event (adds to active list)
   * @param {Object} state - events state
   * @param {Object} eventInstance - created via createEvent
   * @returns {{ success: boolean, reason?: string, event?: Object }}
   */
  function startEvent(state, eventInstance) {
    if (!eventInstance) {
      return { success: false, reason: 'invalid_event' };
    }

    var active = state.activeEvents;

    // Cap concurrent events
    if (active.length >= MAX_CONCURRENT_EVENTS) {
      return { success: false, reason: 'max_concurrent_events_reached' };
    }

    // Check cooldown
    var cooldownExpiry = state.cooldowns[eventInstance.typeId];
    var now = getNow();
    if (cooldownExpiry && now < cooldownExpiry) {
      return { success: false, reason: 'event_on_cooldown', cooldownExpiry: cooldownExpiry };
    }

    // Duplicate active event of same type?
    for (var i = 0; i < active.length; i++) {
      if (active[i].typeId === eventInstance.typeId) {
        return { success: false, reason: 'event_already_active' };
      }
    }

    eventInstance.status = 'active';
    eventInstance.startTime = now;

    var template = EVENT_CATALOG[eventInstance.typeId];
    eventInstance.endTime = now + (template ? template.durationMinutes * 60 * 1000 : eventInstance.durationMinutes * 60 * 1000);

    active.push(eventInstance);

    // Initialise participant and contribution tracking
    state.participants[eventInstance.instanceId] = [];
    state.contributions[eventInstance.instanceId] = {};

    return { success: true, event: eventInstance };
  }

  /**
   * Ends an event — marks it completed or expired and moves to history
   * @param {Object} state - events state
   * @param {string} instanceId - event instance id
   * @param {Object} [options] - { reason: 'completed'|'expired'|'cancelled' }
   * @returns {{ success: boolean, event?: Object }}
   */
  function endEvent(state, instanceId, options) {
    options = options || {};
    var reason = options.reason || 'completed';

    var idx = -1;
    for (var i = 0; i < state.activeEvents.length; i++) {
      if (state.activeEvents[i].instanceId === instanceId) {
        idx = i;
        break;
      }
    }

    if (idx === -1) {
      return { success: false, reason: 'event_not_found' };
    }

    var ev = state.activeEvents[idx];
    ev.status = reason;
    ev.completed = (reason === 'completed');
    ev.endedAt = getNow();

    // Set cooldown
    var template = EVENT_CATALOG[ev.typeId];
    var cooldownHours = template ? template.cooldownHours : EVENT_COOLDOWN_HOURS;
    state.cooldowns[ev.typeId] = getNow() + cooldownHours * 60 * 60 * 1000;

    // Move to history
    state.activeEvents.splice(idx, 1);
    state.eventHistory.push(ev);

    return { success: true, event: ev };
  }

  // ── Query Functions ─────────────────────────────────────────────────────────

  /**
   * Returns all currently active events (cleans up expired ones first)
   * @param {Object} state - events state
   * @returns {Array} active event instances
   */
  function getActiveEvents(state) {
    var now = getNow();
    // Auto-expire events past their endTime
    var toExpire = [];
    for (var i = 0; i < state.activeEvents.length; i++) {
      if (state.activeEvents[i].endTime <= now) {
        toExpire.push(state.activeEvents[i].instanceId);
      }
    }
    for (var j = 0; j < toExpire.length; j++) {
      endEvent(state, toExpire[j], { reason: 'expired' });
    }
    return state.activeEvents.slice();
  }

  /**
   * Returns upcoming (scheduled pending) events
   * @param {Object} state - events state
   * @returns {Array} upcoming event instances
   */
  function getUpcomingEvents(state) {
    return state.upcomingEvents.slice();
  }

  /**
   * Returns events active in a specific zone
   * @param {Object} state - events state
   * @param {string} zone - zone id
   * @returns {Array} active event instances in that zone
   */
  function getEventsByZone(state, zone) {
    var active = getActiveEvents(state);
    var result = [];
    for (var i = 0; i < active.length; i++) {
      if (active[i].zone === zone) {
        result.push(active[i]);
      }
    }
    return result;
  }

  /**
   * Returns event history (all ended events)
   * @param {Object} state - events state
   * @param {Object} [filter] - { category, typeId, limit }
   * @returns {Array} historical events
   */
  function getEventHistory(state, filter) {
    filter = filter || {};
    var history = state.eventHistory.slice();

    if (filter.category) {
      var cat = filter.category;
      history = history.filter(function(e) { return e.category === cat; });
    }
    if (filter.typeId) {
      var tid = filter.typeId;
      history = history.filter(function(e) { return e.typeId === tid; });
    }
    if (filter.limit && filter.limit > 0) {
      history = history.slice(-filter.limit);
    }

    return history;
  }

  // ── Participant Management ──────────────────────────────────────────────────

  /**
   * Adds a player to an active event
   * @param {Object} state - events state
   * @param {string} instanceId - event instance id
   * @param {string} userId - player id
   * @returns {{ success: boolean, reason?: string }}
   */
  function joinEvent(state, instanceId, userId) {
    var ev = null;
    for (var i = 0; i < state.activeEvents.length; i++) {
      if (state.activeEvents[i].instanceId === instanceId) {
        ev = state.activeEvents[i];
        break;
      }
    }

    if (!ev) { return { success: false, reason: 'event_not_found' }; }
    if (ev.status !== 'active') { return { success: false, reason: 'event_not_active' }; }

    var participants = state.participants[instanceId];
    if (!participants) {
      state.participants[instanceId] = [];
      participants = state.participants[instanceId];
    }

    // Already joined?
    if (participants.indexOf(userId) !== -1) {
      return { success: false, reason: 'already_joined' };
    }

    // Max participants?
    if (participants.length >= ev.maxParticipants) {
      return { success: false, reason: 'event_full' };
    }

    participants.push(userId);
    return { success: true };
  }

  /**
   * Removes a player from an active event
   * @param {Object} state - events state
   * @param {string} instanceId - event instance id
   * @param {string} userId - player id
   * @returns {{ success: boolean, reason?: string }}
   */
  function leaveEvent(state, instanceId, userId) {
    var participants = state.participants[instanceId];
    if (!participants) { return { success: false, reason: 'event_not_found' }; }

    var idx = participants.indexOf(userId);
    if (idx === -1) { return { success: false, reason: 'not_joined' }; }

    participants.splice(idx, 1);
    return { success: true };
  }

  /**
   * Returns the list of participants for an event
   * @param {Object} state - events state
   * @param {string} instanceId - event instance id
   * @returns {Array} participant user ids
   */
  function getParticipants(state, instanceId) {
    return (state.participants[instanceId] || []).slice();
  }

  // ── Rewards & Progress ──────────────────────────────────────────────────────

  /**
   * Returns the reward structure for an event type or instance
   * @param {string} eventTypeId - key in EVENT_CATALOG
   * @param {string} [tier] - 'participation' | 'completion' (default: both)
   * @returns {Object|null} rewards object
   */
  function getEventRewards(eventTypeId, tier) {
    var template = EVENT_CATALOG[eventTypeId];
    if (!template) { return null; }

    if (tier) {
      return template.rewards[tier] || null;
    }
    return template.rewards;
  }

  /**
   * Returns progress of an event towards its contribution goal
   * @param {Object} state - events state
   * @param {string} instanceId - event instance id
   * @returns {{ current: number, goal: number, percent: number }|null}
   */
  function getEventProgress(state, instanceId) {
    var ev = null;
    // Check active
    for (var i = 0; i < state.activeEvents.length; i++) {
      if (state.activeEvents[i].instanceId === instanceId) {
        ev = state.activeEvents[i];
        break;
      }
    }
    // Check history if not found in active
    if (!ev) {
      for (var j = 0; j < state.eventHistory.length; j++) {
        if (state.eventHistory[j].instanceId === instanceId) {
          ev = state.eventHistory[j];
          break;
        }
      }
    }

    if (!ev) { return null; }

    var current = ev.totalContributions || 0;
    var goal = ev.contributionGoal || 1;
    var percent = Math.min(100, Math.round((current / goal) * 100));

    return { current: current, goal: goal, percent: percent };
  }

  // ── Contributions ───────────────────────────────────────────────────────────

  /**
   * Records a player's contribution to an event
   * @param {Object} state - events state
   * @param {string} instanceId - event instance id
   * @param {string} userId - contributing player id
   * @param {number} amount - contribution amount
   * @returns {{ success: boolean, goalReached?: boolean, reason?: string }}
   */
  function contributeToEvent(state, instanceId, userId, amount) {
    if (typeof amount !== 'number' || amount <= 0) {
      return { success: false, reason: 'invalid_amount' };
    }

    var ev = null;
    for (var i = 0; i < state.activeEvents.length; i++) {
      if (state.activeEvents[i].instanceId === instanceId) {
        ev = state.activeEvents[i];
        break;
      }
    }

    if (!ev) { return { success: false, reason: 'event_not_found' }; }
    if (ev.status !== 'active') { return { success: false, reason: 'event_not_active' }; }

    // Ensure participant
    var participants = state.participants[instanceId];
    if (!participants) { state.participants[instanceId] = []; participants = state.participants[instanceId]; }
    if (participants.indexOf(userId) === -1) {
      // Auto-join if not at capacity
      if (participants.length < ev.maxParticipants) {
        participants.push(userId);
      } else {
        return { success: false, reason: 'event_full' };
      }
    }

    // Record contribution
    var contribs = state.contributions[instanceId];
    if (!contribs) { state.contributions[instanceId] = {}; contribs = state.contributions[instanceId]; }
    contribs[userId] = (contribs[userId] || 0) + amount;

    ev.totalContributions = (ev.totalContributions || 0) + amount;

    var goalReached = ev.totalContributions >= ev.contributionGoal;

    return { success: true, goalReached: goalReached, total: ev.totalContributions };
  }

  // ── Effects ────────────────────────────────────────────────────────────────

  /**
   * Returns effects for a given event type
   * @param {string} eventTypeId - key in EVENT_CATALOG
   * @returns {Array|null} array of effect objects
   */
  function getEventEffects(eventTypeId) {
    var template = EVENT_CATALOG[eventTypeId];
    if (!template) { return null; }
    return template.effects.slice();
  }

  // ── Scheduling ─────────────────────────────────────────────────────────────

  /**
   * Deterministically schedules the next random event based on world time and seed.
   * Returns an event type id and zone.
   * @param {number} worldTime - current world time ms
   * @param {number} seed - deterministic seed
   * @param {Object} [state] - events state (to check cooldowns)
   * @returns {{ typeId: string, zone: string, scheduledTime: number }|null}
   */
  function scheduleRandomEvent(worldTime, seed, state) {
    var keys = Object.keys(EVENT_CATALOG);

    // Build a weighted list factoring in rarity
    var eligible = [];
    for (var i = 0; i < keys.length; i++) {
      var typeId = keys[i];
      var template = EVENT_CATALOG[typeId];

      // Check cooldown if state provided
      if (state && state.cooldowns) {
        var cooldownExpiry = state.cooldowns[typeId];
        if (cooldownExpiry && worldTime < cooldownExpiry) {
          continue; // on cooldown, skip
        }
        // Skip already active
        var isActive = false;
        for (var a = 0; a < state.activeEvents.length; a++) {
          if (state.activeEvents[a].typeId === typeId) {
            isActive = true;
            break;
          }
        }
        if (isActive) { continue; }
      }

      eligible.push({ typeId: typeId, rarity: template.rarity });
    }

    if (eligible.length === 0) { return null; }

    // Weighted random selection using seed
    var totalWeight = 0;
    for (var w = 0; w < eligible.length; w++) {
      totalWeight += eligible[w].rarity;
    }

    var randVal = seededRand(seed + worldTime) * totalWeight;
    var selected = eligible[eligible.length - 1]; // fallback
    var cumulative = 0;
    for (var s = 0; s < eligible.length; s++) {
      cumulative += eligible[s].rarity;
      if (randVal <= cumulative) {
        selected = eligible[s];
        break;
      }
    }

    var template = EVENT_CATALOG[selected.typeId];

    // Deterministically pick zone
    var zoneIdx = Math.floor(seededRand(seed + worldTime + 1) * template.zones.length);
    var zone = template.zones[zoneIdx];

    // Schedule in next 10-30 mins (deterministic)
    var delayMinutes = 10 + Math.floor(seededRand(seed + worldTime + 2) * 20);
    var scheduledTime = worldTime + delayMinutes * 60 * 1000;

    return {
      typeId: selected.typeId,
      zone: zone,
      scheduledTime: scheduledTime
    };
  }

  // ── Formatting ──────────────────────────────────────────────────────────────

  /**
   * Formats a human-readable announcement message for an event
   * @param {Object|string} eventOrTypeId - event instance or type id string
   * @returns {string} announcement text
   */
  function formatEventAnnouncement(eventOrTypeId) {
    if (!eventOrTypeId) { return ''; }

    // If it's an object (event instance), use its stored message or look up template
    if (typeof eventOrTypeId === 'object') {
      var ev = eventOrTypeId;
      var template = EVENT_CATALOG[ev.typeId];
      var msg = (ev.announceMessage || (template && template.announceMessage) || ev.name || '');
      return '[EVENT] ' + msg + ' [Zone: ' + (ev.zone || 'all') + ']';
    }

    // If it's a string type id
    var tmpl = EVENT_CATALOG[eventOrTypeId];
    if (!tmpl) { return '[EVENT] Unknown event'; }
    return '[EVENT] ' + tmpl.announceMessage;
  }

  // ── Exports ─────────────────────────────────────────────────────────────────

  exports.EVENT_CATALOG = EVENT_CATALOG;
  exports.MAX_CONCURRENT_EVENTS = MAX_CONCURRENT_EVENTS;
  exports.EVENT_COOLDOWN_HOURS = EVENT_COOLDOWN_HOURS;

  exports.createEventsState = createEventsState;
  exports.createEvent = createEvent;
  exports.startEvent = startEvent;
  exports.endEvent = endEvent;

  exports.getActiveEvents = getActiveEvents;
  exports.getUpcomingEvents = getUpcomingEvents;
  exports.getEventsByZone = getEventsByZone;
  exports.getEventHistory = getEventHistory;

  exports.joinEvent = joinEvent;
  exports.leaveEvent = leaveEvent;
  exports.getParticipants = getParticipants;

  exports.getEventRewards = getEventRewards;
  exports.getEventProgress = getEventProgress;
  exports.contributeToEvent = contributeToEvent;
  exports.getEventEffects = getEventEffects;

  exports.scheduleRandomEvent = scheduleRandomEvent;
  exports.formatEventAnnouncement = formatEventAnnouncement;

  exports.setNowFn = setNowFn;
  exports.CATEGORY_CELESTIAL = CATEGORY_CELESTIAL;
  exports.CATEGORY_NATURE = CATEGORY_NATURE;
  exports.CATEGORY_SOCIAL = CATEGORY_SOCIAL;
  exports.CATEGORY_MYSTERY = CATEGORY_MYSTERY;

})(typeof module !== 'undefined' ? module.exports : (window.WorldEvents = {}));
