// dashboard_social.js
/**
 * dashboard_social.js - Social Hub panel for ZION dashboard mode
 *
 * Provides chat, guild management, player profiles, and leaderboards
 * as a self-contained UI panel for the dashboard (UI-only) mode.
 *
 * UMD module: window.DashboardSocial (browser) or module.exports (Node.js)
 * ES5 compatible - uses var declarations
 */
(function(exports) {
  'use strict';

  // ─── Constants ────────────────────────────────────────────────────────────

  var MAX_MESSAGES_PER_CHANNEL = 200;
  var DEFAULT_MESSAGE_LIMIT = 50;
  var DEFAULT_LEADERBOARD_LIMIT = 10;
  var MAX_LEADERBOARD_ENTRIES = 100;
  var MAX_GUILD_MEMBERS = 50;
  var MAX_GUILD_NAME_LENGTH = 30;
  var MAX_GUILD_MOTTO_LENGTH = 100;
  var MAX_PLAYER_LEVEL = 50;

  var CHANNEL_TYPES = ['global', 'zone', 'guild', 'whisper'];

  var MESSAGE_TYPES = {
    CHAT: 'chat',
    SYSTEM: 'system',
    EMOTE: 'emote',
    TRADE: 'trade'
  };

  var LEADERBOARD_CATEGORIES = [
    'spark',
    'quests',
    'reputation',
    'crafting',
    'exploration',
    'fishing',
    'cards',
    'dungeons',
    'social'
  ];

  var COLORS = {
    bg: '#0A0E1A',
    bgPanel: '#111827',
    bgHeader: '#0D1321',
    bgTab: '#161F2E',
    bgTabActive: '#1E2D44',
    border: '#1E3A5F',
    borderHighlight: '#2A5285',
    accent: '#DAA520',
    accentHover: '#F0B830',
    text: '#E8E0D8',
    textMuted: '#8A9AB0',
    textDim: '#4A5A70',
    system: '#DAA520',
    whisper: '#C77DFF',
    emote: '#A8D8EA',
    trade: '#FFB347',
    gold: '#FFD700',
    silver: '#C0C0C0',
    bronze: '#CD7F32',
    profileBg: '#0D1321',
    profileBorder: '#DAA520'
  };

  var RANK_BADGES = {
    1: { label: '[1st]', color: '#FFD700' },
    2: { label: '[2nd]', color: '#C0C0C0' },
    3: { label: '[3rd]', color: '#CD7F32' }
  };

  var PLAYER_TITLES = {
    newcomer: 'Newcomer',
    citizen: 'Citizen',
    veteran: 'Veteran',
    elder: 'Elder',
    master: 'Master',
    legend: 'Legend'
  };

  // ─── Utility Helpers ──────────────────────────────────────────────────────

  function _escapeHtml(str) {
    if (typeof str !== 'string') { return String(str); }
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function _formatTimestamp(ts) {
    var d = new Date(ts);
    var h = d.getHours();
    var m = d.getMinutes();
    var hh = h < 10 ? '0' + h : String(h);
    var mm = m < 10 ? '0' + m : String(m);
    return hh + ':' + mm;
  }

  function _now() {
    return Date.now();
  }

  function _createElement(tag, attrs, innerHTML) {
    if (typeof document === 'undefined') { return null; }
    var el = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, k)) {
          if (k === 'style') {
            el.style.cssText = attrs[k];
          } else if (k === 'className') {
            el.className = attrs[k];
          } else {
            el.setAttribute(k, attrs[k]);
          }
        }
      }
    }
    if (innerHTML !== undefined) {
      el.innerHTML = innerHTML;
    }
    return el;
  }

  // ─── Chat System ──────────────────────────────────────────────────────────

  /**
   * Create initial chat state.
   * @returns {object} Chat state with channels, activeChannel, unread
   */
  function createChatState() {
    return {
      channels: {
        global: [],
        zone: [],
        guild: [],
        whisper: {}
      },
      activeChannel: 'global',
      unread: {
        global: 0,
        zone: 0,
        guild: 0,
        whisper: 0
      }
    };
  }

  /**
   * Add a message to a channel.
   * @param {object} state - Chat state
   * @param {string} channel - Channel name ('global', 'zone', 'guild', or whisper key)
   * @param {object} message - { from, text, timestamp, type }
   * @returns {object} Updated state
   */
  function addMessage(state, channel, message) {
    if (!state || !channel || !message) { return state; }

    var msg = {
      from: message.from || 'Unknown',
      text: message.text || '',
      timestamp: message.timestamp || _now(),
      type: message.type || MESSAGE_TYPES.CHAT
    };

    var newState = {
      channels: {
        global: state.channels.global ? state.channels.global.slice() : [],
        zone: state.channels.zone ? state.channels.zone.slice() : [],
        guild: state.channels.guild ? state.channels.guild.slice() : [],
        whisper: {}
      },
      activeChannel: state.activeChannel,
      unread: {
        global: state.unread.global || 0,
        zone: state.unread.zone || 0,
        guild: state.unread.guild || 0,
        whisper: state.unread.whisper || 0
      }
    };

    // Copy whisper channels
    if (state.channels.whisper) {
      for (var wk in state.channels.whisper) {
        if (Object.prototype.hasOwnProperty.call(state.channels.whisper, wk)) {
          newState.channels.whisper[wk] = state.channels.whisper[wk].slice();
        }
      }
    }

    // Determine target array
    if (channel === 'global' || channel === 'zone' || channel === 'guild') {
      newState.channels[channel].push(msg);
      // Cap at max
      if (newState.channels[channel].length > MAX_MESSAGES_PER_CHANNEL) {
        newState.channels[channel] = newState.channels[channel].slice(
          newState.channels[channel].length - MAX_MESSAGES_PER_CHANNEL
        );
      }
      // Track unread if not active channel
      if (newState.activeChannel !== channel) {
        newState.unread[channel] = (newState.unread[channel] || 0) + 1;
      }
    } else {
      // Whisper channel
      if (!newState.channels.whisper[channel]) {
        newState.channels.whisper[channel] = [];
      }
      newState.channels.whisper[channel].push(msg);
      // Cap at max
      if (newState.channels.whisper[channel].length > MAX_MESSAGES_PER_CHANNEL) {
        newState.channels.whisper[channel] = newState.channels.whisper[channel].slice(
          newState.channels.whisper[channel].length - MAX_MESSAGES_PER_CHANNEL
        );
      }
      // Track unread if not active whisper channel
      if (newState.activeChannel !== channel) {
        newState.unread.whisper = (newState.unread.whisper || 0) + 1;
      }
    }

    return newState;
  }

  /**
   * Get the last N messages from a channel.
   * @param {object} state - Chat state
   * @param {string} channel - Channel name
   * @param {number} [limit] - Max messages to return (default 50)
   * @returns {Array} Array of messages
   */
  function getMessages(state, channel, limit) {
    if (!state || !channel) { return []; }
    var n = (limit !== undefined && limit !== null) ? limit : DEFAULT_MESSAGE_LIMIT;

    if (channel === 'global' || channel === 'zone' || channel === 'guild') {
      var arr = state.channels[channel] || [];
      return arr.slice(Math.max(0, arr.length - n));
    }
    // Whisper
    var whispers = (state.channels.whisper || {});
    var wArr = whispers[channel] || [];
    return wArr.slice(Math.max(0, wArr.length - n));
  }

  /**
   * Switch active channel and clear unread for new channel.
   * @param {object} state - Chat state
   * @param {string} channel - Channel to switch to
   * @returns {object} Updated state
   */
  function switchChannel(state, channel) {
    if (!state || !channel) { return state; }

    var newState = {
      channels: state.channels,
      activeChannel: channel,
      unread: {
        global: state.unread.global || 0,
        zone: state.unread.zone || 0,
        guild: state.unread.guild || 0,
        whisper: state.unread.whisper || 0
      }
    };

    // Clear unread for the new channel
    if (channel === 'global' || channel === 'zone' || channel === 'guild') {
      newState.unread[channel] = 0;
    } else {
      // Whisper channel - clear whisper unread
      newState.unread.whisper = 0;
    }

    return newState;
  }

  /**
   * Get unread count for a channel.
   * @param {object} state - Chat state
   * @param {string} channel - Channel name
   * @returns {number} Unread count
   */
  function getUnreadCount(state, channel) {
    if (!state || !channel) { return 0; }
    if (channel === 'global' || channel === 'zone' || channel === 'guild') {
      return state.unread[channel] || 0;
    }
    return state.unread.whisper || 0;
  }

  /**
   * Send a private whisper message.
   * @param {object} state - Chat state
   * @param {string} fromId - Sender player ID
   * @param {string} toId - Recipient player ID
   * @param {string} text - Message text
   * @returns {object} Updated state
   */
  function sendWhisper(state, fromId, toId, text) {
    if (!state || !fromId || !toId || !text) { return state; }

    // Whisper channel key is based on the two participants (sorted for consistency)
    var channelKey = [fromId, toId].sort().join(':');

    var msg = {
      from: fromId,
      text: text,
      timestamp: _now(),
      type: MESSAGE_TYPES.CHAT
    };

    return addMessage(state, channelKey, msg);
  }

  /**
   * Format a chat message as HTML.
   * @param {object} msg - Message object { from, text, timestamp, type }
   * @returns {string} HTML string
   */
  function formatMessage(msg) {
    if (!msg) { return ''; }

    var ts = _formatTimestamp(msg.timestamp || 0);
    var from = _escapeHtml(msg.from || 'Unknown');
    var text = _escapeHtml(msg.text || '');
    var type = msg.type || MESSAGE_TYPES.CHAT;

    var tsHtml = '<span style="color:' + COLORS.textMuted + ';font-size:11px;">[' + ts + ']</span>';

    if (type === MESSAGE_TYPES.SYSTEM) {
      return '<div style="color:' + COLORS.system + ';padding:2px 0;">' +
        tsHtml + ' <em>' + text + '</em></div>';
    }

    if (type === MESSAGE_TYPES.EMOTE) {
      return '<div style="color:' + COLORS.emote + ';font-style:italic;padding:2px 0;">' +
        tsHtml + ' * ' + from + ' ' + text + '</div>';
    }

    if (type === MESSAGE_TYPES.TRADE) {
      return '<div style="color:' + COLORS.trade + ';padding:2px 0;">' +
        tsHtml + ' <strong>' + from + '</strong>: ' + text + '</div>';
    }

    // Check if it's a whisper by looking for the whisper color hint in context
    // We determine whisper by the channel, but formatMessage only gets the msg.
    // Use a custom attribute if provided
    if (msg._whisper) {
      return '<div style="color:' + COLORS.whisper + ';padding:2px 0;">' +
        tsHtml + ' <strong>' + from + '</strong>: ' + text + '</div>';
    }

    // Default chat
    return '<div style="color:' + COLORS.text + ';padding:2px 0;">' +
      tsHtml + ' <strong>' + from + '</strong>: ' + text + '</div>';
  }

  // ─── Guild System ─────────────────────────────────────────────────────────

  /**
   * Create initial guild state.
   * @returns {object} Guild state
   */
  function createGuildState() {
    return {
      guilds: [],
      playerGuild: {},
      invites: []
    };
  }

  /**
   * Create a new guild.
   * @param {object} state - Guild state
   * @param {string} name - Guild name (max 30 chars)
   * @param {string} leaderId - Leader player ID
   * @param {string} motto - Guild motto (max 100 chars)
   * @returns {{ success: boolean, state: object, guild?: object, error?: string }}
   */
  function createGuild(state, name, leaderId, motto) {
    if (!state || !name || !leaderId) {
      return { success: false, error: 'Missing required parameters', state: state };
    }

    if (name.length > MAX_GUILD_NAME_LENGTH) {
      return { success: false, error: 'Guild name too long (max ' + MAX_GUILD_NAME_LENGTH + ' chars)', state: state };
    }

    if (motto && motto.length > MAX_GUILD_MOTTO_LENGTH) {
      return { success: false, error: 'Guild motto too long (max ' + MAX_GUILD_MOTTO_LENGTH + ' chars)', state: state };
    }

    // Check for duplicate name
    var existing = state.guilds.filter(function(g) {
      return g.name.toLowerCase() === name.toLowerCase();
    });
    if (existing.length > 0) {
      return { success: false, error: 'Guild name already taken', state: state };
    }

    // Check if player is already in a guild
    if (state.playerGuild[leaderId]) {
      return { success: false, error: 'Player is already in a guild', state: state };
    }

    var guild = {
      id: 'guild_' + _now() + '_' + Math.floor(Math.random() * 10000),
      name: name,
      motto: motto || '',
      leaderId: leaderId,
      members: [{ playerId: leaderId, role: 'leader', joinedAt: _now() }],
      createdAt: _now(),
      level: 1,
      color: COLORS.accent
    };

    var newGuilds = state.guilds.slice();
    newGuilds.push(guild);

    var newPlayerGuild = {};
    for (var pk in state.playerGuild) {
      if (Object.prototype.hasOwnProperty.call(state.playerGuild, pk)) {
        newPlayerGuild[pk] = state.playerGuild[pk];
      }
    }
    newPlayerGuild[leaderId] = guild.id;

    return {
      success: true,
      state: {
        guilds: newGuilds,
        playerGuild: newPlayerGuild,
        invites: state.invites ? state.invites.slice() : []
      },
      guild: guild
    };
  }

  /**
   * Join an existing guild.
   * @param {object} state - Guild state
   * @param {string} guildId - Guild ID
   * @param {string} playerId - Player ID
   * @returns {{ success: boolean, state: object, error?: string }}
   */
  function joinGuild(state, guildId, playerId) {
    if (!state || !guildId || !playerId) {
      return { success: false, error: 'Missing required parameters', state: state };
    }

    var guildIndex = -1;
    for (var i = 0; i < state.guilds.length; i++) {
      if (state.guilds[i].id === guildId) {
        guildIndex = i;
        break;
      }
    }

    if (guildIndex === -1) {
      return { success: false, error: 'Guild not found', state: state };
    }

    var guild = state.guilds[guildIndex];

    // Check max members
    if (guild.members.length >= MAX_GUILD_MEMBERS) {
      return { success: false, error: 'Guild is full (max ' + MAX_GUILD_MEMBERS + ' members)', state: state };
    }

    // Check if already a member
    var alreadyMember = guild.members.filter(function(m) {
      return m.playerId === playerId;
    }).length > 0;
    if (alreadyMember) {
      return { success: false, error: 'Player is already a member', state: state };
    }

    // Check if in another guild
    if (state.playerGuild[playerId]) {
      return { success: false, error: 'Player is already in a guild', state: state };
    }

    var newMember = { playerId: playerId, role: 'member', joinedAt: _now() };
    var newGuilds = state.guilds.map(function(g, idx) {
      if (idx === guildIndex) {
        return {
          id: g.id,
          name: g.name,
          motto: g.motto,
          leaderId: g.leaderId,
          members: g.members.concat([newMember]),
          createdAt: g.createdAt,
          level: g.level,
          color: g.color
        };
      }
      return g;
    });

    var newPlayerGuild = {};
    for (var pk in state.playerGuild) {
      if (Object.prototype.hasOwnProperty.call(state.playerGuild, pk)) {
        newPlayerGuild[pk] = state.playerGuild[pk];
      }
    }
    newPlayerGuild[playerId] = guildId;

    return {
      success: true,
      state: {
        guilds: newGuilds,
        playerGuild: newPlayerGuild,
        invites: state.invites ? state.invites.slice() : []
      }
    };
  }

  /**
   * Leave a guild.
   * @param {object} state - Guild state
   * @param {string} guildId - Guild ID
   * @param {string} playerId - Player ID
   * @returns {{ success: boolean, state: object, message?: string, error?: string }}
   */
  function leaveGuild(state, guildId, playerId) {
    if (!state || !guildId || !playerId) {
      return { success: false, error: 'Missing required parameters', state: state };
    }

    var guildIndex = -1;
    for (var i = 0; i < state.guilds.length; i++) {
      if (state.guilds[i].id === guildId) {
        guildIndex = i;
        break;
      }
    }

    if (guildIndex === -1) {
      return { success: false, error: 'Guild not found', state: state };
    }

    var guild = state.guilds[guildIndex];

    // Check membership
    var isMember = guild.members.filter(function(m) {
      return m.playerId === playerId;
    }).length > 0;
    if (!isMember) {
      return { success: false, error: 'Player is not a member of this guild', state: state };
    }

    // Leader cannot leave without transferring
    if (guild.leaderId === playerId) {
      return { success: false, error: 'Leader must transfer leadership before leaving', state: state, message: 'Leader must transfer leadership before leaving' };
    }

    var newMembers = guild.members.filter(function(m) {
      return m.playerId !== playerId;
    });

    var newGuilds = state.guilds.map(function(g, idx) {
      if (idx === guildIndex) {
        return {
          id: g.id,
          name: g.name,
          motto: g.motto,
          leaderId: g.leaderId,
          members: newMembers,
          createdAt: g.createdAt,
          level: g.level,
          color: g.color
        };
      }
      return g;
    });

    var newPlayerGuild = {};
    for (var pk in state.playerGuild) {
      if (Object.prototype.hasOwnProperty.call(state.playerGuild, pk)) {
        if (pk !== playerId) {
          newPlayerGuild[pk] = state.playerGuild[pk];
        }
      }
    }

    return {
      success: true,
      state: {
        guilds: newGuilds,
        playerGuild: newPlayerGuild,
        invites: state.invites ? state.invites.slice() : []
      },
      message: 'Left guild successfully'
    };
  }

  /**
   * Invite a player to a guild.
   * @param {object} state - Guild state
   * @param {string} guildId - Guild ID
   * @param {string} inviterId - ID of the player sending the invite
   * @param {string} inviteeId - ID of the player being invited
   * @returns {{ success: boolean, state: object, invite?: object, error?: string }}
   */
  function inviteToGuild(state, guildId, inviterId, inviteeId) {
    if (!state || !guildId || !inviterId || !inviteeId) {
      return { success: false, error: 'Missing required parameters', state: state };
    }

    // Cannot invite yourself
    if (inviterId === inviteeId) {
      return { success: false, error: 'Cannot invite yourself', state: state };
    }

    var guild = null;
    for (var i = 0; i < state.guilds.length; i++) {
      if (state.guilds[i].id === guildId) {
        guild = state.guilds[i];
        break;
      }
    }

    if (!guild) {
      return { success: false, error: 'Guild not found', state: state };
    }

    // Check inviter is a member
    var inviterMember = guild.members.filter(function(m) {
      return m.playerId === inviterId;
    }).length > 0;
    if (!inviterMember) {
      return { success: false, error: 'Inviter is not a member of this guild', state: state };
    }

    // Check if invitee is already a member
    var alreadyMember = guild.members.filter(function(m) {
      return m.playerId === inviteeId;
    }).length > 0;
    if (alreadyMember) {
      return { success: false, error: 'Player is already a member', state: state };
    }

    // Check if guild is full
    if (guild.members.length >= MAX_GUILD_MEMBERS) {
      return { success: false, error: 'Guild is full', state: state };
    }

    // Check for duplicate invite
    var existingInvite = (state.invites || []).filter(function(inv) {
      return inv.guildId === guildId && inv.inviteeId === inviteeId;
    }).length > 0;
    if (existingInvite) {
      return { success: false, error: 'Invite already pending', state: state };
    }

    var invite = {
      id: 'inv_' + _now() + '_' + Math.floor(Math.random() * 10000),
      guildId: guildId,
      guildName: guild.name,
      inviterId: inviterId,
      inviteeId: inviteeId,
      createdAt: _now()
    };

    var newInvites = (state.invites ? state.invites.slice() : []);
    newInvites.push(invite);

    return {
      success: true,
      state: {
        guilds: state.guilds,
        playerGuild: state.playerGuild,
        invites: newInvites
      },
      invite: invite
    };
  }

  /**
   * Get guild info by ID.
   * @param {object} state - Guild state
   * @param {string} guildId - Guild ID
   * @returns {object|null} Guild details or null
   */
  function getGuildInfo(state, guildId) {
    if (!state || !guildId) { return null; }
    for (var i = 0; i < state.guilds.length; i++) {
      if (state.guilds[i].id === guildId) {
        var g = state.guilds[i];
        return {
          id: g.id,
          name: g.name,
          motto: g.motto || '',
          leader: g.leaderId,
          members: g.members,
          createdAt: g.createdAt,
          level: g.level || 1,
          color: g.color || COLORS.accent
        };
      }
    }
    return null;
  }

  /**
   * Get guild member list.
   * @param {object} state - Guild state
   * @param {string} guildId - Guild ID
   * @returns {Array} Member list with roles
   */
  function getGuildMembers(state, guildId) {
    var info = getGuildInfo(state, guildId);
    if (!info) { return []; }
    return info.members.slice();
  }

  /**
   * Format a guild info card as HTML.
   * @param {object} guild - Guild object
   * @param {boolean} isOwn - Whether this is the player's own guild
   * @returns {string} HTML string
   */
  function formatGuildCard(guild, isOwn) {
    if (!guild) { return '<div style="color:' + COLORS.textMuted + '">No guild data</div>'; }

    var name = _escapeHtml(guild.name || '');
    var motto = _escapeHtml(guild.motto || '');
    var level = guild.level || 1;
    var memberCount = guild.members ? guild.members.length : 0;
    var color = guild.color || COLORS.accent;
    var ownBadge = isOwn ? ' <span style="color:' + COLORS.accent + ';font-size:11px;">[Your Guild]</span>' : '';

    var html = '<div style="background:' + COLORS.profileBg + ';border:1px solid ' + color + ';' +
      'border-radius:4px;padding:10px;margin:4px 0;">';
    html += '<div style="color:' + color + ';font-weight:bold;font-size:14px;">' + name + ownBadge + '</div>';
    if (motto) {
      html += '<div style="color:' + COLORS.textMuted + ';font-style:italic;font-size:12px;margin:2px 0;">' + motto + '</div>';
    }
    html += '<div style="color:' + COLORS.text + ';font-size:12px;margin-top:4px;">';
    html += 'Level ' + level + ' &bull; ' + memberCount + '/' + MAX_GUILD_MEMBERS + ' members';
    html += '</div>';
    html += '</div>';

    return html;
  }

  // ─── Player Profiles ──────────────────────────────────────────────────────

  /**
   * Create a player profile object.
   * @param {string} playerId - Player ID
   * @param {object} data - Profile data
   * @returns {object} Player profile
   */
  function createPlayerProfile(playerId, data) {
    if (!playerId) { return null; }
    var d = data || {};
    return {
      id: playerId,
      name: d.name || playerId,
      title: d.title || 'Newcomer',
      level: d.level || 1,
      zone: d.zone || 'nexus',
      spark: d.spark || 0,
      questsCompleted: d.questsCompleted || 0,
      joinDate: d.joinDate || _now(),
      playtime: d.playtime || 0,
      reputation: d.reputation || 0
    };
  }

  /**
   * Calculate player level from XP.
   * Formula: floor(sqrt(xp / 50)) + 1, max level 50
   * @param {number} xp - Experience points
   * @returns {number} Player level (1 - 50)
   */
  function getPlayerLevel(xp) {
    if (!xp || xp < 0) { return 1; }
    var level = Math.floor(Math.sqrt(xp / 50)) + 1;
    return Math.min(level, MAX_PLAYER_LEVEL);
  }

  /**
   * Get player title based on level and achievements.
   * @param {number} level - Player level
   * @param {Array} [achievements] - Optional achievements array
   * @returns {string} Player title
   */
  function getPlayerTitle(level, achievements) {
    if (!level || level < 1) { return PLAYER_TITLES.newcomer; }
    if (level <= 5) { return PLAYER_TITLES.newcomer; }
    if (level <= 10) { return PLAYER_TITLES.citizen; }
    if (level <= 20) { return PLAYER_TITLES.veteran; }
    if (level <= 30) { return PLAYER_TITLES.elder; }
    if (level <= 40) { return PLAYER_TITLES.master; }
    return PLAYER_TITLES.legend;
  }

  /**
   * Format a player profile card as HTML.
   * @param {object} profile - Player profile object
   * @returns {string} HTML string
   */
  function formatProfileCard(profile) {
    if (!profile) { return '<div style="color:' + COLORS.textMuted + '">No profile data</div>'; }

    var name = _escapeHtml(profile.name || profile.id || 'Unknown');
    var title = _escapeHtml(profile.title || 'Newcomer');
    var level = profile.level || 1;
    var zone = _escapeHtml(profile.zone || 'nexus');
    var spark = profile.spark || 0;
    var quests = profile.questsCompleted || 0;
    var rep = profile.reputation || 0;

    var html = '<div style="background:' + COLORS.profileBg + ';border:1px solid ' + COLORS.profileBorder + ';' +
      'border-radius:4px;padding:12px;margin:4px 0;">';

    html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;">';
    html += '<div>';
    html += '<div style="color:' + COLORS.accent + ';font-weight:bold;font-size:15px;">' + name + '</div>';
    html += '<div style="color:' + COLORS.textMuted + ';font-size:12px;">' + title + ' &bull; Level ' + level + '</div>';
    html += '</div>';
    html += '<div style="color:' + COLORS.textDim + ';font-size:11px;text-align:right;">Zone: ' + zone + '</div>';
    html += '</div>';

    html += '<div style="margin-top:8px;display:flex;gap:12px;flex-wrap:wrap;">';
    html += '<span style="color:' + COLORS.text + ';font-size:12px;">Spark: <strong style="color:' + COLORS.gold + ';">' + spark + '</strong></span>';
    html += '<span style="color:' + COLORS.text + ';font-size:12px;">Quests: <strong>' + quests + '</strong></span>';
    html += '<span style="color:' + COLORS.text + ';font-size:12px;">Rep: <strong>' + rep + '</strong></span>';
    html += '</div>';

    html += '</div>';

    return html;
  }

  /**
   * Search players by name, title, or zone.
   * @param {Array} profiles - Array of player profiles
   * @param {string} query - Search query
   * @returns {Array} Matching profiles
   */
  function searchPlayers(profiles, query) {
    if (!profiles || !query) { return profiles || []; }
    var q = query.toLowerCase();
    return profiles.filter(function(p) {
      if (!p) { return false; }
      if (p.name && p.name.toLowerCase().indexOf(q) !== -1) { return true; }
      if (p.title && p.title.toLowerCase().indexOf(q) !== -1) { return true; }
      if (p.zone && p.zone.toLowerCase().indexOf(q) !== -1) { return true; }
      return false;
    });
  }

  // ─── Leaderboard System ───────────────────────────────────────────────────

  /**
   * Create initial leaderboard state.
   * @returns {object} Leaderboard state
   */
  function createLeaderboardState() {
    return {
      categories: {},
      lastUpdated: 0
    };
  }

  /**
   * Update leaderboard for a category.
   * @param {object} state - Leaderboard state
   * @param {string} category - Category name
   * @param {Array} entries - [{ playerId, name, score }]
   * @returns {object} Updated state
   */
  function updateLeaderboard(state, category, entries) {
    if (!state || !category || !entries) { return state; }

    var sorted = entries.slice().sort(function(a, b) {
      return (b.score || 0) - (a.score || 0);
    });

    var top = sorted.slice(0, MAX_LEADERBOARD_ENTRIES);

    var newCategories = {};
    for (var k in state.categories) {
      if (Object.prototype.hasOwnProperty.call(state.categories, k)) {
        newCategories[k] = state.categories[k];
      }
    }
    newCategories[category] = top;

    return {
      categories: newCategories,
      lastUpdated: _now()
    };
  }

  /**
   * Get top N entries for a leaderboard category.
   * @param {object} state - Leaderboard state
   * @param {string} category - Category name
   * @param {number} [limit] - Max entries (default 10)
   * @returns {Array} Top entries
   */
  function getLeaderboard(state, category, limit) {
    if (!state || !category) { return []; }
    var n = (limit !== undefined && limit !== null) ? limit : DEFAULT_LEADERBOARD_LIMIT;
    var entries = (state.categories[category] || []);
    return entries.slice(0, n);
  }

  /**
   * Get a player's rank in a category.
   * @param {object} state - Leaderboard state
   * @param {string} category - Category name
   * @param {string} playerId - Player ID
   * @returns {{ rank: number, score: number, total: number } | null}
   */
  function getPlayerRank(state, category, playerId) {
    if (!state || !category || !playerId) { return null; }
    var entries = state.categories[category] || [];
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].playerId === playerId) {
        return {
          rank: i + 1,
          score: entries[i].score || 0,
          total: entries.length
        };
      }
    }
    return null;
  }

  /**
   * Format a leaderboard as an HTML table.
   * @param {Array} entries - Leaderboard entries
   * @param {string} category - Category name
   * @param {object|null} playerRank - Player's rank info { rank, score }
   * @returns {string} HTML string
   */
  function formatLeaderboardTable(entries, category, playerRank) {
    if (!entries || entries.length === 0) {
      return '<div style="color:' + COLORS.textMuted + ';padding:8px;">No entries yet</div>';
    }

    var categoryLabel = _escapeHtml(category || 'Score');
    var html = '<table style="width:100%;border-collapse:collapse;font-size:12px;">';
    html += '<thead>';
    html += '<tr style="color:' + COLORS.textMuted + ';border-bottom:1px solid ' + COLORS.border + ';">';
    html += '<th style="text-align:left;padding:4px 6px;width:50px;">Rank</th>';
    html += '<th style="text-align:left;padding:4px 6px;">Player</th>';
    html += '<th style="text-align:right;padding:4px 6px;">' + categoryLabel + '</th>';
    html += '</tr>';
    html += '</thead>';
    html += '<tbody>';

    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      var rank = i + 1;
      var isCurrentPlayer = playerRank && entry.playerId &&
        playerRank.playerId && entry.playerId === playerRank.playerId;
      var rowBg = isCurrentPlayer ? 'background:' + COLORS.bgTabActive + ';' : '';

      var rankDisplay;
      if (RANK_BADGES[rank]) {
        var badge = RANK_BADGES[rank];
        rankDisplay = '<span style="color:' + badge.color + ';font-weight:bold;">' + badge.label + '</span>';
      } else {
        rankDisplay = '<span style="color:' + COLORS.textMuted + ';">#' + rank + '</span>';
      }

      html += '<tr style="border-bottom:1px solid ' + COLORS.bgTab + ';' + rowBg + '">';
      html += '<td style="padding:4px 6px;">' + rankDisplay + '</td>';
      html += '<td style="padding:4px 6px;color:' + COLORS.text + ';">' + _escapeHtml(entry.name || entry.playerId || 'Unknown') + '</td>';
      html += '<td style="padding:4px 6px;text-align:right;color:' + COLORS.accent + ';font-weight:bold;">' + (entry.score || 0) + '</td>';
      html += '</tr>';
    }

    html += '</tbody>';
    html += '</table>';

    return html;
  }

  // ─── Panel Builder ────────────────────────────────────────────────────────

  var PANEL_STYLE = [
    'background:' + COLORS.bgPanel,
    'border:1px solid ' + COLORS.border,
    'border-radius:4px',
    'display:flex',
    'flex-direction:column',
    'overflow:hidden',
    'min-height:300px',
    'max-height:600px',
    'font-family:monospace',
    'font-size:13px',
    'color:' + COLORS.text
  ].join(';');

  var TAB_BASE_STYLE = [
    'padding:6px 14px',
    'cursor:pointer',
    'border:none',
    'background:' + COLORS.bgTab,
    'color:' + COLORS.textMuted,
    'font-size:12px',
    'font-family:monospace',
    'border-right:1px solid ' + COLORS.border
  ].join(';');

  var TAB_ACTIVE_STYLE = TAB_BASE_STYLE + ';background:' + COLORS.bgTabActive + ';color:' + COLORS.accent + ';font-weight:bold;';

  var INPUT_STYLE = [
    'background:' + COLORS.bg,
    'border:1px solid ' + COLORS.border,
    'color:' + COLORS.text,
    'padding:4px 8px',
    'font-family:monospace',
    'font-size:12px',
    'border-radius:3px',
    'flex:1'
  ].join(';');

  var BUTTON_STYLE = [
    'background:' + COLORS.bgTabActive,
    'border:1px solid ' + COLORS.borderHighlight,
    'color:' + COLORS.accent,
    'padding:4px 10px',
    'cursor:pointer',
    'font-family:monospace',
    'font-size:12px',
    'border-radius:3px'
  ].join(';');

  /**
   * Build the Chat tab content element.
   * @param {object} chatState - Chat state
   * @returns {Element|object} DOM element or mock for Node.js
   */
  function _buildChatTab(chatState) {
    if (typeof document === 'undefined') {
      return { _type: 'chat-tab', chatState: chatState };
    }

    var state = chatState || createChatState();
    var wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;height:100%;';

    // Channel selector
    var channels = document.createElement('div');
    channels.style.cssText = 'display:flex;border-bottom:1px solid ' + COLORS.border + ';';

    var channelList = ['global', 'zone', 'guild', 'whisper'];
    var activeTab = state.activeChannel;
    channelList.forEach(function(ch) {
      var btn = document.createElement('button');
      btn.textContent = ch;
      btn.style.cssText = ch === activeTab ? TAB_ACTIVE_STYLE : TAB_BASE_STYLE;
      btn.setAttribute('data-channel', ch);
      channels.appendChild(btn);
    });
    wrap.appendChild(channels);

    // Message history
    var history = document.createElement('div');
    history.style.cssText = 'flex:1;overflow-y:auto;padding:8px;min-height:180px;';
    var msgs = getMessages(state, state.activeChannel, 50);
    var histHtml = '';
    msgs.forEach(function(m) { histHtml += formatMessage(m); });
    history.innerHTML = histHtml;
    wrap.appendChild(history);

    // Input area
    var inputArea = document.createElement('div');
    inputArea.style.cssText = 'display:flex;gap:6px;padding:8px;border-top:1px solid ' + COLORS.border + ';';

    var input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Type a message...';
    input.style.cssText = INPUT_STYLE;

    var sendBtn = document.createElement('button');
    sendBtn.textContent = 'Send';
    sendBtn.style.cssText = BUTTON_STYLE;

    inputArea.appendChild(input);
    inputArea.appendChild(sendBtn);
    wrap.appendChild(inputArea);

    return wrap;
  }

  /**
   * Build the Guild tab content element.
   * @param {object} guildState - Guild state
   * @param {string} playerId - Current player ID
   * @returns {Element|object} DOM element or mock
   */
  function _buildGuildTab(guildState, playerId) {
    if (typeof document === 'undefined') {
      return { _type: 'guild-tab', guildState: guildState, playerId: playerId };
    }

    var state = guildState || createGuildState();
    var wrap = document.createElement('div');
    wrap.style.cssText = 'padding:10px;overflow-y:auto;height:100%;';

    var myGuildId = playerId && state.playerGuild ? state.playerGuild[playerId] : null;

    if (myGuildId) {
      // Show guild info
      var info = getGuildInfo(state, myGuildId);
      if (info) {
        var guildCard = document.createElement('div');
        guildCard.innerHTML = formatGuildCard(info, true);
        wrap.appendChild(guildCard);

        // Member list
        var membersTitle = document.createElement('div');
        membersTitle.style.cssText = 'color:' + COLORS.textMuted + ';font-size:11px;margin:8px 0 4px;';
        membersTitle.textContent = 'Members (' + info.members.length + '/' + MAX_GUILD_MEMBERS + ')';
        wrap.appendChild(membersTitle);

        var membersList = document.createElement('div');
        info.members.forEach(function(m) {
          var row = document.createElement('div');
          row.style.cssText = 'padding:3px 0;color:' + COLORS.text + ';font-size:12px;';
          var roleColor = m.role === 'leader' ? COLORS.accent : COLORS.textMuted;
          row.innerHTML = '<span style="color:' + roleColor + ';">[' + (m.role || 'member') + ']</span> ' +
            _escapeHtml(m.playerId);
          membersList.appendChild(row);
        });
        wrap.appendChild(membersList);

        // Invite form
        var inviteSection = document.createElement('div');
        inviteSection.style.cssText = 'margin-top:12px;border-top:1px solid ' + COLORS.border + ';padding-top:10px;';

        var inviteTitle = document.createElement('div');
        inviteTitle.style.cssText = 'color:' + COLORS.textMuted + ';font-size:11px;margin-bottom:6px;';
        inviteTitle.textContent = 'Invite Player';
        inviteSection.appendChild(inviteTitle);

        var inviteRow = document.createElement('div');
        inviteRow.style.cssText = 'display:flex;gap:6px;';

        var inviteInput = document.createElement('input');
        inviteInput.type = 'text';
        inviteInput.placeholder = 'Player name...';
        inviteInput.style.cssText = INPUT_STYLE;

        var inviteBtn = document.createElement('button');
        inviteBtn.textContent = 'Invite';
        inviteBtn.style.cssText = BUTTON_STYLE;

        inviteRow.appendChild(inviteInput);
        inviteRow.appendChild(inviteBtn);
        inviteSection.appendChild(inviteRow);
        wrap.appendChild(inviteSection);
      }
    } else {
      // Show create guild form
      var noGuildMsg = document.createElement('div');
      noGuildMsg.style.cssText = 'color:' + COLORS.textMuted + ';margin-bottom:12px;';
      noGuildMsg.textContent = 'You are not in a guild.';
      wrap.appendChild(noGuildMsg);

      var createSection = document.createElement('div');
      createSection.style.cssText = 'background:' + COLORS.profileBg + ';border:1px solid ' + COLORS.border + ';border-radius:4px;padding:12px;';

      var createTitle = document.createElement('div');
      createTitle.style.cssText = 'color:' + COLORS.accent + ';font-weight:bold;margin-bottom:8px;';
      createTitle.textContent = 'Create a Guild';
      createSection.appendChild(createTitle);

      var nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.placeholder = 'Guild name (max 30 chars)...';
      nameInput.style.cssText = INPUT_STYLE + ';display:block;width:100%;margin-bottom:6px;box-sizing:border-box;';
      createSection.appendChild(nameInput);

      var mottoInput = document.createElement('input');
      mottoInput.type = 'text';
      mottoInput.placeholder = 'Guild motto (max 100 chars)...';
      mottoInput.style.cssText = INPUT_STYLE + ';display:block;width:100%;margin-bottom:8px;box-sizing:border-box;';
      createSection.appendChild(mottoInput);

      var createBtn = document.createElement('button');
      createBtn.textContent = 'Create Guild';
      createBtn.style.cssText = BUTTON_STYLE;
      createSection.appendChild(createBtn);

      wrap.appendChild(createSection);
    }

    return wrap;
  }

  /**
   * Build the Players tab content element.
   * @param {Array} profiles - Player profiles
   * @param {string} [currentPlayerId] - Current player ID for context
   * @returns {Element|object} DOM element or mock
   */
  function _buildPlayersTab(profiles, currentPlayerId) {
    if (typeof document === 'undefined') {
      return { _type: 'players-tab', profiles: profiles };
    }

    var wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;height:100%;';

    // Search bar
    var searchRow = document.createElement('div');
    searchRow.style.cssText = 'display:flex;gap:6px;padding:8px;border-bottom:1px solid ' + COLORS.border + ';';

    var searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search players...';
    searchInput.style.cssText = INPUT_STYLE;

    searchRow.appendChild(searchInput);
    wrap.appendChild(searchRow);

    // Player list
    var list = document.createElement('div');
    list.style.cssText = 'flex:1;overflow-y:auto;padding:8px;';

    var displayProfiles = profiles || [];
    if (displayProfiles.length === 0) {
      list.innerHTML = '<div style="color:' + COLORS.textMuted + ';padding:8px;">No players nearby</div>';
    } else {
      displayProfiles.forEach(function(profile) {
        var card = document.createElement('div');
        card.style.cssText = 'margin-bottom:8px;';
        card.innerHTML = formatProfileCard(profile);

        // Action buttons
        var actions = document.createElement('div');
        actions.style.cssText = 'display:flex;gap:6px;margin-top:4px;';

        var tradeBtn = document.createElement('button');
        tradeBtn.textContent = 'Trade';
        tradeBtn.style.cssText = BUTTON_STYLE;

        var msgBtn = document.createElement('button');
        msgBtn.textContent = 'Message';
        msgBtn.style.cssText = BUTTON_STYLE;

        actions.appendChild(tradeBtn);
        actions.appendChild(msgBtn);
        card.appendChild(actions);

        list.appendChild(card);
      });
    }

    wrap.appendChild(list);
    return wrap;
  }

  /**
   * Build the Leaderboards tab content element.
   * @param {object} lbState - Leaderboard state
   * @param {string} [playerId] - Current player ID
   * @returns {Element|object} DOM element or mock
   */
  function _buildLeaderboardsTab(lbState, playerId) {
    if (typeof document === 'undefined') {
      return { _type: 'leaderboards-tab', lbState: lbState };
    }

    var state = lbState || createLeaderboardState();
    var wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;height:100%;';

    // Category tabs
    var catTabs = document.createElement('div');
    catTabs.style.cssText = 'display:flex;flex-wrap:wrap;border-bottom:1px solid ' + COLORS.border + ';padding:4px;gap:2px;';

    var activeCategory = LEADERBOARD_CATEGORIES[0];
    LEADERBOARD_CATEGORIES.forEach(function(cat) {
      var btn = document.createElement('button');
      btn.textContent = cat;
      btn.style.cssText = cat === activeCategory ? TAB_ACTIVE_STYLE : TAB_BASE_STYLE;
      btn.setAttribute('data-category', cat);
      catTabs.appendChild(btn);
    });
    wrap.appendChild(catTabs);

    // Leaderboard content
    var content = document.createElement('div');
    content.style.cssText = 'flex:1;overflow-y:auto;padding:10px;';

    var entries = getLeaderboard(state, activeCategory, 10);
    var playerRank = playerId ? getPlayerRank(state, activeCategory, playerId) : null;
    content.innerHTML = formatLeaderboardTable(entries, activeCategory, playerRank);
    wrap.appendChild(content);

    return wrap;
  }

  /**
   * Create the main Social Hub panel DOM element.
   * @param {object} [opts] - Options { chatState, guildState, profiles, lbState, playerId }
   * @returns {Element|object} DOM element or mock
   */
  function createSocialPanel(opts) {
    var options = opts || {};
    var chatState = options.chatState || createChatState();
    var guildState = options.guildState || createGuildState();
    var profiles = options.profiles || [];
    var lbState = options.lbState || createLeaderboardState();
    var playerId = options.playerId || null;

    if (typeof document === 'undefined') {
      // Return mock object for Node.js
      return {
        _type: 'social-panel',
        _panelId: 'social-hub',
        tabs: ['Chat', 'Guild', 'Players', 'Leaderboards'],
        chatState: chatState,
        guildState: guildState,
        profiles: profiles,
        lbState: lbState
      };
    }

    var panel = document.createElement('div');
    panel.style.cssText = PANEL_STYLE;
    panel.id = 'social-hub-panel';

    // Panel header
    var header = document.createElement('div');
    header.style.cssText = [
      'background:' + COLORS.bgHeader,
      'border-bottom:1px solid ' + COLORS.border,
      'padding:8px 12px',
      'display:flex',
      'align-items:center',
      'justify-content:space-between'
    ].join(';');

    var title = document.createElement('span');
    title.style.cssText = 'color:' + COLORS.accent + ';font-weight:bold;font-size:13px;';
    title.textContent = '[S] Social Hub';
    header.appendChild(title);
    panel.appendChild(header);

    // Tab bar
    var tabBar = document.createElement('div');
    tabBar.style.cssText = 'display:flex;border-bottom:1px solid ' + COLORS.border + ';';

    var tabs = ['Chat', 'Guild', 'Players', 'Leaderboards'];
    var activeTab = 'Chat';

    tabs.forEach(function(tab) {
      var btn = document.createElement('button');
      btn.textContent = tab;
      btn.style.cssText = tab === activeTab ? TAB_ACTIVE_STYLE : TAB_BASE_STYLE;
      btn.setAttribute('data-tab', tab);
      tabBar.appendChild(btn);
    });

    panel.appendChild(tabBar);

    // Tab content area
    var contentArea = document.createElement('div');
    contentArea.style.cssText = 'flex:1;overflow:hidden;';

    // Build initial tab content (Chat)
    var chatContent = _buildChatTab(chatState);
    if (chatContent) { contentArea.appendChild(chatContent); }

    panel.appendChild(contentArea);

    // Wire tab switching
    var tabButtons = tabBar.querySelectorAll('[data-tab]');
    tabButtons.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var tabName = btn.getAttribute('data-tab');

        // Update tab styles
        tabButtons.forEach(function(b) {
          b.style.cssText = b === btn ? TAB_ACTIVE_STYLE : TAB_BASE_STYLE;
        });

        // Replace content
        contentArea.innerHTML = '';
        var newContent = null;
        if (tabName === 'Chat') {
          newContent = _buildChatTab(chatState);
        } else if (tabName === 'Guild') {
          newContent = _buildGuildTab(guildState, playerId);
        } else if (tabName === 'Players') {
          newContent = _buildPlayersTab(profiles, playerId);
        } else if (tabName === 'Leaderboards') {
          newContent = _buildLeaderboardsTab(lbState, playerId);
        }
        if (newContent) { contentArea.appendChild(newContent); }
      });
    });

    return panel;
  }

  // ─── Exports ──────────────────────────────────────────────────────────────

  exports.createSocialPanel = createSocialPanel;

  // Chat
  exports.createChatState = createChatState;
  exports.addMessage = addMessage;
  exports.getMessages = getMessages;
  exports.switchChannel = switchChannel;
  exports.getUnreadCount = getUnreadCount;
  exports.sendWhisper = sendWhisper;
  exports.formatMessage = formatMessage;

  // Guild
  exports.createGuildState = createGuildState;
  exports.createGuild = createGuild;
  exports.joinGuild = joinGuild;
  exports.leaveGuild = leaveGuild;
  exports.inviteToGuild = inviteToGuild;
  exports.getGuildInfo = getGuildInfo;
  exports.getGuildMembers = getGuildMembers;
  exports.formatGuildCard = formatGuildCard;

  // Players
  exports.createPlayerProfile = createPlayerProfile;
  exports.getPlayerLevel = getPlayerLevel;
  exports.getPlayerTitle = getPlayerTitle;
  exports.formatProfileCard = formatProfileCard;
  exports.searchPlayers = searchPlayers;

  // Leaderboards
  exports.createLeaderboardState = createLeaderboardState;
  exports.updateLeaderboard = updateLeaderboard;
  exports.getLeaderboard = getLeaderboard;
  exports.getPlayerRank = getPlayerRank;
  exports.formatLeaderboardTable = formatLeaderboardTable;

  // Constants (for testing)
  exports.MAX_MESSAGES_PER_CHANNEL = MAX_MESSAGES_PER_CHANNEL;
  exports.MAX_GUILD_MEMBERS = MAX_GUILD_MEMBERS;
  exports.MAX_GUILD_NAME_LENGTH = MAX_GUILD_NAME_LENGTH;
  exports.MAX_GUILD_MOTTO_LENGTH = MAX_GUILD_MOTTO_LENGTH;
  exports.MAX_PLAYER_LEVEL = MAX_PLAYER_LEVEL;
  exports.MAX_LEADERBOARD_ENTRIES = MAX_LEADERBOARD_ENTRIES;
  exports.LEADERBOARD_CATEGORIES = LEADERBOARD_CATEGORIES;

})(typeof module !== 'undefined' ? module.exports : (window.DashboardSocial = {}));
