/**
 * ZION MMO - Social Module (Layer 3)
 *
 * Handles chat, emotes, and consent tracking for player interactions.
 */

(function(exports) {
  'use strict';

  // Internal stores
  const consentStore = new Map(); // "${fromId}:${toId}:${type}" -> boolean
  const rateLimitStore = new Map(); // playerId -> {count, windowStart}

  // Constants
  const RATE_LIMIT_MAX = 30; // messages per window
  const RATE_LIMIT_WINDOW = 60000; // 60 seconds in milliseconds
  const SAY_DISTANCE = 20;
  const EMOTE_DISTANCE = 30;

  /**
   * Calculate Euclidean distance between two 3D positions
   */
  function getDistance(posA, posB) {
    if (!posA || !posB) return Infinity;

    const dx = posB.x - posA.x;
    const dy = posB.y - posA.y;
    const dz = posB.z - posA.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Get all players within a certain distance
   * @param {Object} position - The center position {x, y, z, zone}
   * @param {Object} state - World state with players map
   * @param {number} maxDistance - Maximum distance
   * @returns {Array} Array of player IDs
   */
  function getNearbyPlayers(position, state, maxDistance) {
    const nearby = [];

    if (!position || !state.players) return nearby;

    for (const [playerId, player] of state.players.entries()) {
      if (!player.position) continue;

      // Must be in same zone
      if (player.position.zone !== position.zone) continue;

      const distance = getDistance(position, player.position);
      if (distance <= maxDistance) {
        nearby.push(playerId);
      }
    }

    return nearby;
  }

  /**
   * Check rate limit for a player
   * @param {string} playerId - The player ID
   * @param {number} now - Current timestamp
   * @returns {Object} {allowed: boolean, retryAfter?: number}
   */
  function checkRateLimit(playerId, now) {
    const limit = rateLimitStore.get(playerId);

    if (!limit) {
      // First message, create new window
      rateLimitStore.set(playerId, {
        count: 1,
        windowStart: now
      });
      return { allowed: true };
    }

    const windowAge = now - limit.windowStart;

    if (windowAge >= RATE_LIMIT_WINDOW) {
      // Window expired, start new window
      rateLimitStore.set(playerId, {
        count: 1,
        windowStart: now
      });
      return { allowed: true };
    }

    // Within current window
    if (limit.count >= RATE_LIMIT_MAX) {
      const retryAfter = RATE_LIMIT_WINDOW - windowAge;
      return { allowed: false, retryAfter };
    }

    // Increment count
    limit.count++;
    return { allowed: true };
  }

  /**
   * Handle say message (nearby players within 20 units)
   * @param {Object} msg - The message object {from, payload, position}
   * @param {Object} state - World state
   * @returns {Object} {recipients: Array}
   */
  function handleSay(msg, state) {
    if (!msg.from || !msg.position || !state.players) {
      return { recipients: [] };
    }

    const sender = state.players.get(msg.from);
    if (!sender || !sender.position) {
      return { recipients: [] };
    }

    const recipients = getNearbyPlayers(sender.position, state, SAY_DISTANCE);

    // Remove sender from recipients
    const filteredRecipients = recipients.filter(id => id !== msg.from);

    return { recipients: filteredRecipients };
  }

  /**
   * Handle shout message (all players in same zone)
   * @param {Object} msg - The message object {from, payload, position}
   * @param {Object} state - World state
   * @returns {Object} {recipients: Array}
   */
  function handleShout(msg, state) {
    if (!msg.from || !state.players) {
      return { recipients: [] };
    }

    const sender = state.players.get(msg.from);
    if (!sender || !sender.position) {
      return { recipients: [] };
    }

    const recipients = [];
    const senderZone = sender.position.zone;

    for (const [playerId, player] of state.players.entries()) {
      if (playerId === msg.from) continue;
      if (!player.position) continue;

      if (player.position.zone === senderZone) {
        recipients.push(playerId);
      }
    }

    return { recipients };
  }

  /**
   * Handle whisper message (requires consent)
   * @param {Object} msg - The message object {from, to, payload}
   * @param {Object} state - World state
   * @returns {Object} {success: boolean, error?: string}
   */
  function handleWhisper(msg, state) {
    if (!msg.from || !msg.to) {
      return { success: false, error: 'Whisper requires from and to fields' };
    }

    // Check consent
    if (!hasConsent(msg.from, msg.to, 'whisper')) {
      return { success: false, error: 'Whisper requires consent from recipient' };
    }

    return { success: true };
  }

  /**
   * Handle emote message (nearby players within 30 units)
   * @param {Object} msg - The message object {from, payload, position}
   * @param {Object} state - World state
   * @returns {Object} {recipients: Array}
   */
  function handleEmote(msg, state) {
    if (!msg.from || !msg.position || !state.players) {
      return { recipients: [] };
    }

    const sender = state.players.get(msg.from);
    if (!sender || !sender.position) {
      return { recipients: [] };
    }

    const recipients = getNearbyPlayers(sender.position, state, EMOTE_DISTANCE);

    // Remove sender from recipients
    const filteredRecipients = recipients.filter(id => id !== msg.from);

    return { recipients: filteredRecipients };
  }

  /**
   * Grant consent for an interaction type
   * @param {string} fromId - The player initiating the action
   * @param {string} toId - The player receiving the action
   * @param {string} type - The action type (e.g., 'whisper', 'trade_offer')
   */
  function grantConsent(fromId, toId, type) {
    const key = `${fromId}:${toId}:${type}`;
    consentStore.set(key, true);
  }

  /**
   * Revoke consent for an interaction type
   * @param {string} fromId - The player initiating the action
   * @param {string} toId - The player receiving the action
   * @param {string} type - The action type
   */
  function revokeConsent(fromId, toId, type) {
    const key = `${fromId}:${toId}:${type}`;
    consentStore.delete(key);
  }

  /**
   * Check if consent exists for an interaction type
   * @param {string} fromId - The player initiating the action
   * @param {string} toId - The player receiving the action
   * @param {string} type - The action type
   * @returns {boolean}
   */
  function hasConsent(fromId, toId, type) {
    const key = `${fromId}:${toId}:${type}`;
    return consentStore.get(key) === true;
  }

  // Export public API
  exports.handleSay = handleSay;
  exports.handleShout = handleShout;
  exports.handleWhisper = handleWhisper;
  exports.handleEmote = handleEmote;
  exports.grantConsent = grantConsent;
  exports.revokeConsent = revokeConsent;
  exports.hasConsent = hasConsent;
  exports.checkRateLimit = checkRateLimit;
  exports.getDistance = getDistance;
  exports.getNearbyPlayers = getNearbyPlayers;

})(typeof module !== 'undefined' ? module.exports : (window.Social = {}));
