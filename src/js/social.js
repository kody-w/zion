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
  const reputationStore = new Map(); // playerId -> {score, tier, history}
  const harassmentStore = new Map(); // "${fromId}:${toId}" -> {declineCount, lastDecline}

  // Constants
  const RATE_LIMIT_MAX = 30; // messages per window
  const RATE_LIMIT_WINDOW = 60000; // 60 seconds in milliseconds
  const SAY_DISTANCE = 20;
  const EMOTE_DISTANCE = 30;

  // Reputation constants
  const REPUTATION_TIERS = [
    { name: 'Newcomer', minScore: 0, maxScore: 99 },
    { name: 'Trusted', minScore: 100, maxScore: 499 },
    { name: 'Respected', minScore: 500, maxScore: 1499 },
    { name: 'Honored', minScore: 1500, maxScore: 4999 },
    { name: 'Elder', minScore: 5000, maxScore: Infinity }
  ];

  const REPUTATION_GAINS = {
    helping: 10,
    teaching: 15,
    trading: 5,
    gifting: 8,
    guild_contribution: 12,
    mentoring: 20,
    zone_steward_action: 5
  };

  const REPUTATION_LOSSES = {
    harassment: -25,
    griefing_report: -50,
    steward_violation: -30
  };

  const HARASSMENT_THRESHOLD = 3; // Declined interactions before harassment flag
  const HARASSMENT_WINDOW = 600000; // 10 minutes

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

  /**
   * Add a chat message to state
   */
  function addMessage(state, message) {
    if (!state || !message) return;
    if (!state.chat) state.chat = { messages: [] };
    if (!state.chat.messages) state.chat.messages = [];
    state.chat.messages.push({
      user: message.user,
      text: message.text,
      timestamp: message.timestamp || new Date().toISOString()
    });
    // Keep last 100 messages
    if (state.chat.messages.length > 100) {
      state.chat.messages = state.chat.messages.slice(-100);
    }
  }

  /**
   * Get recent chat messages from state
   */
  function getRecentMessages(state, count) {
    if (!state || !state.chat || !state.chat.messages) return [];
    count = count || 50;
    return state.chat.messages.slice(-count);
  }

  /**
   * Initialize reputation for a player
   * @param {string} playerId - The player ID
   */
  function initReputation(playerId) {
    if (!reputationStore.has(playerId)) {
      reputationStore.set(playerId, {
        score: 0,
        tier: 'Newcomer',
        history: [],
        restrictions: {
          tradeBanned: false,
          zoneMuted: new Set(),
          zoneBanned: new Set()
        }
      });
    }
  }

  /**
   * Get player reputation
   * @param {string} playerId - The player ID
   * @returns {Object} Reputation data
   */
  function getReputation(playerId) {
    initReputation(playerId);
    return reputationStore.get(playerId);
  }

  /**
   * Calculate tier from score
   * @param {number} score - Reputation score
   * @returns {string} Tier name
   */
  function calculateTier(score) {
    for (const tier of REPUTATION_TIERS) {
      if (score >= tier.minScore && score <= tier.maxScore) {
        return tier.name;
      }
    }
    return 'Newcomer';
  }

  /**
   * Adjust player reputation
   * @param {string} playerId - The player ID
   * @param {string} action - Action type (e.g., 'helping', 'harassment')
   * @param {Object} details - Additional details about the action
   */
  function adjustReputation(playerId, action, details) {
    initReputation(playerId);
    const rep = reputationStore.get(playerId);

    const change = REPUTATION_GAINS[action] || REPUTATION_LOSSES[action] || 0;
    const oldScore = rep.score;
    const oldTier = rep.tier;

    rep.score = Math.max(0, rep.score + change);
    rep.tier = calculateTier(rep.score);

    rep.history.push({
      action,
      change,
      oldScore,
      newScore: rep.score,
      timestamp: Date.now(),
      details: details || {}
    });

    // Keep last 100 history entries
    if (rep.history.length > 100) {
      rep.history = rep.history.slice(-100);
    }

    // Check for tier change
    const tierChanged = oldTier !== rep.tier;

    return {
      score: rep.score,
      tier: rep.tier,
      change,
      tierChanged,
      oldTier
    };
  }

  /**
   * Record a declined interaction for harassment detection
   * @param {string} fromId - The player initiating the action
   * @param {string} toId - The player declining the action
   * @param {string} type - The interaction type
   */
  function recordDecline(fromId, toId, type) {
    const key = `${fromId}:${toId}`;
    const now = Date.now();

    if (!harassmentStore.has(key)) {
      harassmentStore.set(key, {
        declineCount: 0,
        lastDecline: 0,
        type: type
      });
    }

    const record = harassmentStore.get(key);

    // Reset if outside harassment window
    if (now - record.lastDecline > HARASSMENT_WINDOW) {
      record.declineCount = 0;
    }

    record.declineCount++;
    record.lastDecline = now;
    record.type = type;

    // Check if harassment threshold reached
    if (record.declineCount >= HARASSMENT_THRESHOLD) {
      adjustReputation(fromId, 'harassment', {
        targetPlayer: toId,
        interactionType: type,
        declineCount: record.declineCount
      });

      // Reset counter after penalty applied
      record.declineCount = 0;

      return true; // Harassment detected
    }

    return false;
  }

  /**
   * Apply reputation restrictions
   * @param {string} playerId - The player ID
   */
  function applyReputationRestrictions(playerId) {
    const rep = getReputation(playerId);

    // Low reputation consequences
    if (rep.score < 0) {
      rep.restrictions.tradeBanned = true;
    } else if (rep.score < 50) {
      // Restrictions lifted but monitored
      rep.restrictions.tradeBanned = false;
    }
  }

  /**
   * Check if player can perform action based on reputation
   * @param {string} playerId - The player ID
   * @param {string} action - Action type
   * @param {string} zone - Zone ID (optional)
   * @returns {Object} {allowed: boolean, reason?: string}
   */
  function checkReputationPermission(playerId, action, zone) {
    const rep = getReputation(playerId);

    if (action === 'trade' && rep.restrictions.tradeBanned) {
      return { allowed: false, reason: 'Trade restricted due to low reputation' };
    }

    if (zone && rep.restrictions.zoneMuted.has(zone) && (action === 'say' || action === 'shout')) {
      return { allowed: false, reason: 'You are muted in this zone' };
    }

    if (zone && rep.restrictions.zoneBanned.has(zone)) {
      return { allowed: false, reason: 'You are temporarily banned from this zone' };
    }

    // Check minimum tier for zone steward candidacy
    if (action === 'run_for_steward' && rep.tier !== 'Respected' && rep.tier !== 'Honored' && rep.tier !== 'Elder') {
      return { allowed: false, reason: 'Must be Respected tier or higher to run for zone steward' };
    }

    return { allowed: true };
  }

  /**
   * Mute player in zone
   * @param {string} playerId - The player ID
   * @param {string} zone - Zone ID
   * @param {number} duration - Duration in milliseconds (0 for permanent)
   */
  function muteInZone(playerId, zone, duration) {
    const rep = getReputation(playerId);
    rep.restrictions.zoneMuted.add(zone);

    if (duration > 0) {
      setTimeout(() => {
        rep.restrictions.zoneMuted.delete(zone);
      }, duration);
    }
  }

  /**
   * Ban player from zone
   * @param {string} playerId - The player ID
   * @param {string} zone - Zone ID
   * @param {number} duration - Duration in milliseconds
   */
  function banFromZone(playerId, zone, duration) {
    const rep = getReputation(playerId);
    rep.restrictions.zoneBanned.add(zone);

    setTimeout(() => {
      rep.restrictions.zoneBanned.delete(zone);
    }, duration);
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
  exports.addMessage = addMessage;
  exports.getRecentMessages = getRecentMessages;

  // Reputation API
  exports.initReputation = initReputation;
  exports.getReputation = getReputation;
  exports.adjustReputation = adjustReputation;
  exports.recordDecline = recordDecline;
  exports.checkReputationPermission = checkReputationPermission;
  exports.muteInZone = muteInZone;
  exports.banFromZone = banFromZone;
  exports.REPUTATION_TIERS = REPUTATION_TIERS;

})(typeof module !== 'undefined' ? module.exports : (window.Social = {}));
