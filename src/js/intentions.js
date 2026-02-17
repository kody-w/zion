/**
 * ZION MMO - Intention System Engine (Layer 2)
 *
 * Allows players (especially AI) to declare conditional rules that auto-execute.
 * Core mechanic for AI player viability in real-time gameplay.
 */

(function(exports) {
  'use strict';

  // Internal store: playerId -> intentions[]
  const intentionStore = new Map();

  // Consent-required action types (actions that need explicit permission)
  const CONSENT_REQUIRED_TYPES = new Set([
    'whisper',
    'challenge',
    'trade_offer',
    'mentor_offer'
  ]);

  const MAX_INTENTIONS_PER_PLAYER = 10;

  /**
   * Register a new intention for a player
   * @param {string} playerId - The player ID
   * @param {Object} intention - The intention object
   * @returns {Object} {success: boolean, error?: string}
   */
  function registerIntention(playerId, intention) {
    // Validate intention format
    if (!intention.id || typeof intention.id !== 'string') {
      return { success: false, error: 'Intention must have a valid id' };
    }

    if (!intention.trigger || typeof intention.trigger !== 'object') {
      return { success: false, error: 'Intention must have a trigger object' };
    }

    if (!intention.trigger.condition || typeof intention.trigger.condition !== 'string') {
      return { success: false, error: 'Trigger must have a condition string' };
    }

    if (!intention.trigger.params || typeof intention.trigger.params !== 'object') {
      return { success: false, error: 'Trigger must have a params object' };
    }

    if (!intention.action || typeof intention.action !== 'object') {
      return { success: false, error: 'Intention must have an action object' };
    }

    if (!intention.action.type || typeof intention.action.type !== 'string') {
      return { success: false, error: 'Action must have a type string' };
    }

    if (!intention.action.params || typeof intention.action.params !== 'object') {
      return { success: false, error: 'Action must have a params object' };
    }

    if (typeof intention.priority !== 'number') {
      return { success: false, error: 'Intention must have a numeric priority' };
    }

    if (typeof intention.ttl !== 'number') {
      return { success: false, error: 'Intention must have a numeric ttl' };
    }

    if (typeof intention.cooldown !== 'number') {
      return { success: false, error: 'Intention must have a numeric cooldown' };
    }

    if (typeof intention.max_fires !== 'number') {
      return { success: false, error: 'Intention must have a numeric max_fires' };
    }

    // Check max intentions limit
    const playerIntentions = intentionStore.get(playerId) || [];
    if (playerIntentions.length >= MAX_INTENTIONS_PER_PLAYER) {
      return { success: false, error: `Maximum ${MAX_INTENTIONS_PER_PLAYER} intentions per player exceeded` };
    }

    // Add internal tracking fields
    const intentionWithMeta = {
      ...intention,
      createdAt: Date.now(),
      lastFired: null,
      fireCount: 0
    };

    playerIntentions.push(intentionWithMeta);
    intentionStore.set(playerId, playerIntentions);

    return { success: true };
  }

  /**
   * Clear all intentions for a player
   * @param {string} playerId - The player ID
   */
  function clearIntentions(playerId) {
    intentionStore.delete(playerId);
  }

  /**
   * Get all intentions for a player (public - anyone can read)
   * @param {string} playerId - The player ID
   * @returns {Array} Array of intentions
   */
  function getIntentions(playerId) {
    return intentionStore.get(playerId) || [];
  }

  /**
   * Check if an intention has expired
   * @param {Object} intention - The intention object
   * @param {number} now - Current timestamp
   * @returns {boolean}
   */
  function isIntentionExpired(intention, now) {
    return (now - intention.createdAt) > (intention.ttl * 1000);
  }

  /**
   * Check if an intention can fire
   * @param {Object} intention - The intention object
   * @param {number} now - Current timestamp
   * @returns {boolean}
   */
  function canIntentionFire(intention, now) {
    // Check max fires limit
    if (intention.fireCount >= intention.max_fires) {
      return false;
    }

    // Check cooldown
    if (intention.lastFired !== null) {
      const timeSinceLastFire = now - intention.lastFired;
      if (timeSinceLastFire < (intention.cooldown * 1000)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Trigger evaluators
   */
  const triggerEvaluators = {
    /**
     * Check if a player is nearby
     */
    player_nearby: function(params, worldState, ownerId) {
      const owner = worldState.players.get(ownerId);
      if (!owner || !owner.position) return false;

      const distanceLimit = params.distance_lt || 10;
      const onlyUnknown = params.known === false;

      for (const [playerId, player] of worldState.players.entries()) {
        if (playerId === ownerId) continue;
        if (!player.position) continue;

        const distance = getDistance(owner.position, player.position);
        if (distance < distanceLimit) {
          // If we only want unknown players, check if this player is known
          if (onlyUnknown) {
            // Assume players are known if they're in the owner's known list
            const knownPlayers = owner.knownPlayers || new Set();
            if (!knownPlayers.has(playerId)) {
              return true;
            }
          } else {
            return true;
          }
        }
      }

      return false;
    },

    /**
     * Check if a player said a keyword nearby
     */
    player_say: function(params, worldState, ownerId) {
      const owner = worldState.players.get(ownerId);
      if (!owner || !owner.position) return false;

      const keyword = params.keyword;
      const distanceLimit = params.distance_lt || 20;
      const recentChats = worldState.recentChats || [];

      // Check recent chat messages
      for (const chat of recentChats) {
        if (chat.from === ownerId) continue;

        const speaker = worldState.players.get(chat.from);
        if (!speaker || !speaker.position) continue;

        const distance = getDistance(owner.position, speaker.position);
        if (distance < distanceLimit) {
          if (chat.message && chat.message.toLowerCase().includes(keyword.toLowerCase())) {
            return true;
          }
        }
      }

      return false;
    },

    /**
     * Timer trigger - fires every interval
     */
    timer: function(params, worldState, ownerId, intention, now) {
      const intervalMs = params.interval_seconds * 1000;

      // If never fired, fire immediately
      if (intention.lastFired === null) {
        return true;
      }

      // Check if enough time has passed
      return (now - intention.lastFired) >= intervalMs;
    },

    /**
     * Zone enter trigger
     */
    zone_enter: function(params, worldState, ownerId) {
      const owner = worldState.players.get(ownerId);
      if (!owner || !owner.position) return false;

      return owner.position.zone === params.zone_id;
    },

    /**
     * Garden needs attention trigger
     */
    garden_needs: function(params, worldState, ownerId) {
      const owner = worldState.players.get(ownerId);
      if (!owner || !owner.position) return false;

      const distanceLimit = params.distance_lt || 10;
      const gardens = worldState.gardens || [];

      for (const garden of gardens) {
        if (!garden.position) continue;

        const distance = getDistance(owner.position, garden.position);
        if (distance < distanceLimit) {
          // Check if garden needs attention
          if (garden.needsWater || garden.needsHarvest || garden.needsWeeding) {
            return true;
          }
        }
      }

      return false;
    },

    /**
     * Resource ready for harvest trigger
     */
    resource_ready: function(params, worldState, ownerId) {
      const owner = worldState.players.get(ownerId);
      if (!owner || !owner.position) return false;

      const distanceLimit = params.distance_lt || 10;
      const resources = worldState.resources || [];

      for (const resource of resources) {
        if (!resource.position) continue;
        if (!resource.harvestable) continue;

        const distance = getDistance(owner.position, resource.position);
        if (distance < distanceLimit) {
          return true;
        }
      }

      return false;
    },

    /**
     * Health below threshold trigger
     * Checks if the player's warmth (health proxy) is below a given percent threshold (0-100).
     * The liveState player object stores warmth as a 0-100 value.
     */
    health_below: function(params, worldState, ownerId) {
      var owner = worldState.players.get(ownerId);
      if (!owner) return false;

      var threshold = typeof params.threshold === 'number' ? params.threshold : 50;

      // warmth is the health proxy; default to 100 (full health) if not present
      var warmth = typeof owner.warmth === 'number' ? owner.warmth : 100;
      return warmth < threshold;
    },

    /**
     * Item nearby trigger
     * Checks if a specific item type exists near the player in worldState resources or structures.
     */
    item_nearby: function(params, worldState, ownerId) {
      var owner = worldState.players.get(ownerId);
      if (!owner || !owner.position) return false;

      var distanceLimit = params.distance_lt || 10;
      var targetItemType = params.item_type || '';

      // Check resource nodes (harvestable items in the world)
      var resources = worldState.resources || [];
      for (var i = 0; i < resources.length; i++) {
        var resource = resources[i];
        if (!resource.position) continue;
        // Match by type if specified; accept all types when item_type is empty
        if (targetItemType && resource.type !== targetItemType) continue;
        var dist = getDistance(owner.position, resource.position);
        if (dist < distanceLimit) {
          return true;
        }
      }

      // Also check placed structures (which may be craftable items left in the world)
      var structures = worldState.structures || {};
      var structureList = Array.isArray(structures) ? structures : Object.values(structures);
      for (var j = 0; j < structureList.length; j++) {
        var structure = structureList[j];
        if (!structure.position) continue;
        if (targetItemType && structure.art_type !== targetItemType && structure.type !== targetItemType) continue;
        var structDist = getDistance(owner.position, structure.position);
        if (structDist < distanceLimit) {
          return true;
        }
      }

      return false;
    },

    /**
     * Trade received trigger
     * Checks if the player has a pending trade offer directed at them.
     * Optionally filters by the item type offered in the trade.
     */
    trade_received: function(params, worldState, ownerId) {
      var filterItemType = params.item_type || null;
      var actions = worldState.actions || [];

      for (var i = 0; i < actions.length; i++) {
        var action = actions[i];
        // Must be a pending trade offer directed at this player
        if (action.type !== 'trade_offer') continue;
        if (action.status !== 'pending') continue;
        if (action.to !== ownerId) continue;

        // If no item type filter, any pending trade offer qualifies
        if (!filterItemType) return true;

        // Check if the offered items include the requested item type
        var offered = action.offered || [];
        for (var j = 0; j < offered.length; j++) {
          if (offered[j].type === filterItemType || offered[j].name === filterItemType) {
            return true;
          }
        }
      }

      return false;
    },

    /**
     * Weather change trigger
     * Checks if the current world weather matches the trigger's weather_type param.
     * worldState.world.weather values: 'clear', 'rain', 'storm', 'fog', 'snow'
     */
    weather_change: function(params, worldState, ownerId) {
      var world = worldState.world || {};
      var currentWeather = world.weather || 'clear';
      var targetWeather = params.weather_type || '';
      return currentWeather === targetWeather;
    },

    /**
     * Time of day trigger
     * Checks if the current world day phase matches the trigger's phase param.
     * worldState.world.dayPhase values: 'dawn', 'morning', 'midday', 'afternoon', 'evening', 'night'
     * The Constitution §4.5 lists: dawn / day / dusk / night.
     * We match loosely so 'day' matches 'morning', 'midday', or 'afternoon'.
     * 'dusk' matches 'evening'. Exact phase names also match directly.
     */
    time_of_day: function(params, worldState, ownerId) {
      var world = worldState.world || {};
      var currentPhase = world.dayPhase || 'day';
      var targetPhase = params.phase || '';

      // Direct match
      if (currentPhase === targetPhase) return true;

      // Loose grouping: 'day' matches morning/midday/afternoon
      if (targetPhase === 'day') {
        return currentPhase === 'morning' || currentPhase === 'midday' || currentPhase === 'afternoon';
      }

      // Loose grouping: 'dusk' matches evening
      if (targetPhase === 'dusk') {
        return currentPhase === 'evening';
      }

      return false;
    },

    /**
     * Ally nearby trigger
     * Checks if a guild member or group member is within distance of the player.
     * Params: group_id (guild/group id to match), distance_lt (max distance).
     * Players must have a guildId or groupId field matching params.group_id.
     */
    ally_nearby: function(params, worldState, ownerId) {
      var owner = worldState.players.get(ownerId);
      if (!owner || !owner.position) return false;

      var distanceLimit = params.distance_lt || 20;
      var groupId = params.group_id || null;

      for (var entry of worldState.players.entries()) {
        var playerId = entry[0];
        var player = entry[1];
        if (playerId === ownerId) continue;
        if (!player.position) continue;

        // Check if this player is in the same group/guild
        var playerGroupId = player.guildId || player.guild_id || player.groupId || player.group_id || null;

        // If a specific group is required, filter by it
        if (groupId && playerGroupId !== groupId) continue;

        // If no group filter but owner has a group, only match members of owner's group
        if (!groupId) {
          var ownerGroupId = owner.guildId || owner.guild_id || owner.groupId || owner.group_id || null;
          if (!ownerGroupId) continue; // no group to match against
          if (playerGroupId !== ownerGroupId) continue;
        }

        var dist = getDistance(owner.position, player.position);
        if (dist < distanceLimit) {
          return true;
        }
      }

      return false;
    }
  };

  /**
   * Calculate Euclidean distance between two 3D positions
   */
  function getDistance(posA, posB) {
    const dx = posB.x - posA.x;
    const dy = posB.y - posA.y;
    const dz = posB.z - posA.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Generate action message from intention
   */
  function generateActionMessage(intention, playerId, worldState) {
    const action = intention.action;
    const player = worldState.players.get(playerId);

    if (!player) return null;

    // Check if this action requires consent - if so, skip it
    if (CONSENT_REQUIRED_TYPES.has(action.type)) {
      return null;
    }

    // Base message structure
    const message = {
      type: action.type,
      from: playerId,
      payload: { ...action.params },
      position: player.position ? { ...player.position } : null
    };

    return message;
  }

  /**
   * Evaluate all triggers for a player and generate actions
   * @param {string} playerId - The player ID
   * @param {Object} worldState - Current world state
   * @param {number} deltaTime - Time since last evaluation (unused currently)
   * @returns {Array} Array of action messages to execute
   */
  function evaluateTriggers(playerId, worldState, deltaTime) {
    const intentions = intentionStore.get(playerId) || [];
    const now = Date.now();
    const actions = [];

    // Sort by priority (higher priority first)
    const sortedIntentions = [...intentions].sort((a, b) => b.priority - a.priority);

    for (const intention of sortedIntentions) {
      // Check if expired
      if (isIntentionExpired(intention, now)) {
        continue;
      }

      // Check if can fire
      if (!canIntentionFire(intention, now)) {
        continue;
      }

      // Evaluate trigger
      const triggerType = intention.trigger.condition;
      const evaluator = triggerEvaluators[triggerType];

      if (!evaluator) {
        // Stub for unknown triggers
        continue;
      }

      let triggered = false;
      try {
        triggered = evaluator(
          intention.trigger.params,
          worldState,
          playerId,
          intention,
          now
        );
      } catch (error) {
        // Silently skip failed evaluations
        continue;
      }

      if (triggered) {
        // Generate action message
        const actionMessage = generateActionMessage(intention, playerId, worldState);

        if (actionMessage) {
          actions.push(actionMessage);

          // Update firing metadata
          intention.lastFired = now;
          intention.fireCount++;
        }
      }
    }

    return actions;
  }

  // Export public API
  exports.registerIntention = registerIntention;
  exports.clearIntentions = clearIntentions;
  exports.getIntentions = getIntentions;
  exports.evaluateTriggers = evaluateTriggers;
  exports.isIntentionExpired = isIntentionExpired;
  exports.canIntentionFire = canIntentionFire;

})(typeof module !== 'undefined' ? module.exports : (window.Intentions = {}));
