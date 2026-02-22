// chat.js
/**
 * ZION MMO - Chat Channel Module
 *
 * Manages chat channels: global, zone, guild, whisper, system, trade.
 * Provides channel lifecycle, message history, unread tracking, muting,
 * search/filter, and formatting utilities.
 */

(function(exports) {
  'use strict';

  // ── Constants ─────────────────────────────────────────────────────────────

  var CHANNEL_TYPES = {
    GLOBAL:  'global',
    ZONE:    'zone',
    GUILD:   'guild',
    WHISPER: 'whisper',
    SYSTEM:  'system',
    TRADE:   'trade'
  };

  /** Color per channel type for UI rendering */
  var MESSAGE_COLORS = {
    global:  '#A8D8EA',   // soft blue
    zone:    '#B8F0B8',   // soft green
    guild:   '#FFD580',   // soft gold
    whisper: '#E8A0FF',   // soft purple
    system:  '#FF9999',   // soft red / system orange
    trade:   '#FFB347'    // warm orange
  };

  /** Badge icons per channel type */
  var CHANNEL_BADGES = {
    global:  '[G]',
    zone:    '[Z]',
    guild:   '[GU]',
    whisper: '[W]',
    system:  '[SYS]',
    trade:   '[T]'
  };

  /** Maximum messages stored per channel (configurable) */
  var maxHistoryPerChannel = 200;

  // ── Internal State ────────────────────────────────────────────────────────

  var channels = {};        // channelName -> channel object
  var activeChannel = null; // name of currently selected channel

  // ── Channel Object Factory ────────────────────────────────────────────────

  /**
   * Create a new channel instance.
   * @param {string} type    - One of CHANNEL_TYPES values
   * @param {string} name    - Unique channel identifier (e.g. 'global', 'zone_nexus')
   * @param {object} options - { displayName, targetPlayer, guildId, zoneName, persistent }
   * @returns {object} channel
   */
  function createChannel(type, name, options) {
    if (!type || !name) {
      return null;
    }

    var validTypes = Object.keys(CHANNEL_TYPES).map(function(k) { return CHANNEL_TYPES[k]; });
    if (validTypes.indexOf(type) === -1) {
      return null;
    }

    var opts = options || {};

    var channel = {
      type:         type,
      name:         name,
      displayName:  opts.displayName || name,
      targetPlayer: opts.targetPlayer || null,  // for whisper channels
      guildId:      opts.guildId || null,        // for guild channels
      zoneName:     opts.zoneName || null,        // for zone channels
      persistent:   opts.persistent !== undefined ? opts.persistent : true,
      muted:        false,
      messages:     [],
      unreadCount:  0,
      lastReadTs:   0,
      createdAt:    Date.now()
    };

    channels[name] = channel;
    return channel;
  }

  /**
   * Return the standard set of default channels.
   * @returns {Array} list of channel objects (created and registered)
   */
  function getDefaultChannels() {
    var defaults = [
      { type: CHANNEL_TYPES.GLOBAL,  name: 'global',  displayName: 'Global',   persistent: true },
      { type: CHANNEL_TYPES.SYSTEM,  name: 'system',  displayName: 'System',   persistent: true },
      { type: CHANNEL_TYPES.TRADE,   name: 'trade',   displayName: 'Trade',    persistent: true }
    ];

    var result = [];
    for (var i = 0; i < defaults.length; i++) {
      var d = defaults[i];
      // Return existing or create new
      var ch = channels[d.name] || createChannel(d.type, d.name, { displayName: d.displayName, persistent: d.persistent });
      result.push(ch);
    }
    return result;
  }

  // ── Message Operations ────────────────────────────────────────────────────

  /**
   * Add a message to a channel's history.
   * @param {string|object} channel - channel name or channel object
   * @param {object} message        - { sender, text, ts?, type?, badge?, meta? }
   * @returns {object|null} the stored message record, or null on failure
   */
  function addMessage(channel, message) {
    var ch = _resolveChannel(channel);
    if (!ch) return null;
    if (!message || typeof message !== 'object') return null;
    if (!message.sender || !message.text) return null;

    var record = {
      id:        _generateId(),
      sender:    message.sender,
      text:      String(message.text),
      ts:        message.ts || Date.now(),
      type:      message.type || ch.type,
      badge:     message.badge || CHANNEL_BADGES[ch.type] || '',
      meta:      message.meta || {}
    };

    ch.messages.push(record);

    // Enforce history limit
    if (ch.messages.length > maxHistoryPerChannel) {
      ch.messages = ch.messages.slice(ch.messages.length - maxHistoryPerChannel);
    }

    // Increment unread if channel is not active
    if (activeChannel !== ch.name) {
      ch.unreadCount++;
    }

    return record;
  }

  /**
   * Retrieve messages from a channel with optional pagination.
   * @param {string|object} channel - channel name or channel object
   * @param {number}        limit   - max messages to return (default all)
   * @param {number}        before  - return messages with ts < before (optional)
   * @returns {Array} array of message records (oldest first in the slice)
   */
  function getMessages(channel, limit, before) {
    var ch = _resolveChannel(channel);
    if (!ch) return [];

    var msgs = ch.messages.slice(); // shallow copy

    // Filter by `before` timestamp if provided
    if (typeof before === 'number') {
      msgs = msgs.filter(function(m) { return m.ts < before; });
    }

    // Apply limit (return last N = most recent)
    if (typeof limit === 'number' && limit > 0) {
      msgs = msgs.slice(-limit);
    }

    return msgs;
  }

  // ── Unread Tracking ───────────────────────────────────────────────────────

  /**
   * Get the unread message count for a channel.
   * @param {string|object} channel
   * @returns {number}
   */
  function getUnreadCount(channel) {
    var ch = _resolveChannel(channel);
    if (!ch) return 0;
    return ch.unreadCount;
  }

  /**
   * Mark a channel's messages as read (reset unread counter).
   * @param {string|object} channel
   */
  function markAsRead(channel) {
    var ch = _resolveChannel(channel);
    if (!ch) return;
    ch.unreadCount = 0;
    ch.lastReadTs = Date.now();
  }

  // ── Active Channel ────────────────────────────────────────────────────────

  /**
   * Switch the active channel, marking the new channel as read.
   * @param {string} channelName
   * @returns {object|null} the new active channel, or null if not found
   */
  function switchChannel(channelName) {
    if (!channels[channelName]) return null;
    activeChannel = channelName;
    markAsRead(channelName);
    return channels[channelName];
  }

  /**
   * Get the currently active channel object.
   * @returns {object|null}
   */
  function getActiveChannel() {
    if (!activeChannel || !channels[activeChannel]) return null;
    return channels[activeChannel];
  }

  // ── Formatting ────────────────────────────────────────────────────────────

  /**
   * Format a message record for display.
   * Produces: [HH:MM] [BADGE] sender: text
   * @param {object} msg - message record from addMessage
   * @returns {string} formatted string
   */
  function formatMessage(msg) {
    if (!msg || typeof msg !== 'object') return '';

    var time = _formatTime(msg.ts);
    var badge = msg.badge || '';
    var sender = msg.sender || 'unknown';
    var text = msg.text || '';

    var parts = [time];
    if (badge) parts.push(badge);
    parts.push(sender + ': ' + text);

    return parts.join(' ');
  }

  // ── Search / Filter ───────────────────────────────────────────────────────

  /**
   * Filter messages in a channel by a search query.
   * Matches against sender and text (case-insensitive).
   * @param {string|object} channel
   * @param {string}        query
   * @returns {Array} matching message records
   */
  function filterMessages(channel, query) {
    var ch = _resolveChannel(channel);
    if (!ch) return [];
    if (!query || typeof query !== 'string') return ch.messages.slice();

    var lq = query.toLowerCase();
    return ch.messages.filter(function(m) {
      return (m.sender && m.sender.toLowerCase().indexOf(lq) !== -1) ||
             (m.text   && m.text.toLowerCase().indexOf(lq)   !== -1);
    });
  }

  // ── Muting ────────────────────────────────────────────────────────────────

  /**
   * Mute a channel (addMessage still stores, but unread will not increment).
   * @param {string|object} channel
   */
  function muteChannel(channel) {
    var ch = _resolveChannel(channel);
    if (!ch) return;
    ch.muted = true;
  }

  /**
   * Unmute a channel.
   * @param {string|object} channel
   */
  function unmuteChannel(channel) {
    var ch = _resolveChannel(channel);
    if (!ch) return;
    ch.muted = false;
  }

  // ── Zone / Guild / Whisper Helpers ────────────────────────────────────────

  /**
   * Get (or create) the zone-specific channel for a zone name.
   * Channel name: 'zone_<zoneName>'
   * @param {string} zoneName - e.g. 'nexus', 'gardens'
   * @returns {object|null} channel
   */
  function getChannelForZone(zoneName) {
    if (!zoneName || typeof zoneName !== 'string') return null;
    var name = 'zone_' + zoneName;
    if (!channels[name]) {
      createChannel(CHANNEL_TYPES.ZONE, name, {
        displayName: zoneName.charAt(0).toUpperCase() + zoneName.slice(1),
        zoneName: zoneName
      });
    }
    return channels[name];
  }

  /**
   * Get (or create) the guild channel for a guild ID.
   * Channel name: 'guild_<guildId>'
   * @param {string} guildId
   * @returns {object|null} channel
   */
  function getGuildChannel(guildId) {
    if (!guildId || typeof guildId !== 'string') return null;
    var name = 'guild_' + guildId;
    if (!channels[name]) {
      createChannel(CHANNEL_TYPES.GUILD, name, {
        displayName: 'Guild',
        guildId: guildId
      });
    }
    return channels[name];
  }

  /**
   * Create (or retrieve) a DM whisper channel with a target player.
   * Channel name is sorted so alice<->bob and bob<->alice share the same channel.
   * @param {string} localPlayer  - the current player's ID
   * @param {string} targetPlayer - the target player's ID
   * @returns {object|null} channel
   */
  function createWhisperChannel(localPlayer, targetPlayer) {
    if (!localPlayer || !targetPlayer || typeof localPlayer !== 'string' || typeof targetPlayer !== 'string') {
      return null;
    }
    if (localPlayer === targetPlayer) return null;

    // Deterministic channel name regardless of who initiates
    var sorted = [localPlayer, targetPlayer].sort();
    var name = 'whisper_' + sorted[0] + '_' + sorted[1];

    if (!channels[name]) {
      createChannel(CHANNEL_TYPES.WHISPER, name, {
        displayName: targetPlayer,
        targetPlayer: targetPlayer
      });
    }
    return channels[name];
  }

  // ── Channel Retrieval Helpers ─────────────────────────────────────────────

  /**
   * Get a channel by name (returns null if not found).
   * @param {string} name
   * @returns {object|null}
   */
  function getChannel(name) {
    return channels[name] || null;
  }

  /**
   * Get all registered channels.
   * @returns {object} map of channelName -> channel
   */
  function getAllChannels() {
    return channels;
  }

  /**
   * Remove a channel (e.g. when a whisper session ends).
   * @param {string|object} channel
   * @returns {boolean} true if removed
   */
  function removeChannel(channel) {
    var ch = _resolveChannel(channel);
    if (!ch) return false;
    if (activeChannel === ch.name) {
      activeChannel = null;
    }
    delete channels[ch.name];
    return true;
  }

  /**
   * Reset all state (useful for testing).
   */
  function reset() {
    channels = {};
    activeChannel = null;
  }

  // ── Private Helpers ───────────────────────────────────────────────────────

  function _resolveChannel(channel) {
    if (!channel) return null;
    if (typeof channel === 'string') return channels[channel] || null;
    if (typeof channel === 'object' && channel.name) return channels[channel.name] || channel;
    return null;
  }

  function _generateId() {
    return 'msg_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
  }

  function _formatTime(ts) {
    var d = new Date(typeof ts === 'number' ? ts : Date.now());
    var hh = String(d.getHours()).padStart(2, '0');
    var mm = String(d.getMinutes()).padStart(2, '0');
    return '[' + hh + ':' + mm + ']';
  }

  // ── Public API ────────────────────────────────────────────────────────────

  exports.CHANNEL_TYPES        = CHANNEL_TYPES;
  exports.MESSAGE_COLORS       = MESSAGE_COLORS;
  exports.CHANNEL_BADGES       = CHANNEL_BADGES;
  exports.maxHistoryPerChannel = maxHistoryPerChannel;

  exports.createChannel        = createChannel;
  exports.getDefaultChannels   = getDefaultChannels;
  exports.addMessage           = addMessage;
  exports.getMessages          = getMessages;
  exports.getUnreadCount       = getUnreadCount;
  exports.markAsRead           = markAsRead;
  exports.switchChannel        = switchChannel;
  exports.getActiveChannel     = getActiveChannel;
  exports.formatMessage        = formatMessage;
  exports.filterMessages       = filterMessages;
  exports.muteChannel          = muteChannel;
  exports.unmuteChannel        = unmuteChannel;
  exports.getChannelForZone    = getChannelForZone;
  exports.getGuildChannel      = getGuildChannel;
  exports.createWhisperChannel = createWhisperChannel;
  exports.getChannel           = getChannel;
  exports.getAllChannels        = getAllChannels;
  exports.removeChannel        = removeChannel;
  exports.reset                = reset;

})(typeof module !== 'undefined' ? module.exports : (window.Chat = {}));
