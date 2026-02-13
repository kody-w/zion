(function(exports) {
  'use strict';

  // Guild/Association system for ZION MMO
  // Implements community formation per ZION Constitution §2.3 and §5.4

  // State storage
  var guilds = [];
  var invites = [];
  var guildMessages = [];
  var nextGuildId = 1;
  var nextInviteId = 1;
  var nextMessageId = 1;

  // Guild level thresholds
  var LEVEL_THRESHOLDS = [
    { level: 1, xp: 0, maxMembers: 20 },
    { level: 2, xp: 500, maxMembers: 30 },
    { level: 3, xp: 1500, maxMembers: 40 },
    { level: 4, xp: 3000, maxMembers: 50 },
    { level: 5, xp: 6000, maxMembers: 60 }
  ];

  // Constants
  var GUILD_CREATION_COST = 100;
  var INVITE_EXPIRY_MS = 3600000; // 1 hour

  /**
   * Initialize guilds system with saved data
   * @param {object} existingData - Previously saved guild data
   */
  function initGuilds(existingData) {
    if (!existingData) return;

    guilds = existingData.guilds || [];
    invites = existingData.invites || [];
    guildMessages = existingData.guildMessages || [];
    nextGuildId = existingData.nextGuildId || 1;
    nextInviteId = existingData.nextInviteId || 1;
    nextMessageId = existingData.nextMessageId || 1;

    console.log('Guilds initialized:', guilds.length, 'guilds');
  }

  /**
   * Get guilds state for saving
   * @returns {object} - Serializable guild state
   */
  function getGuildsState() {
    return {
      guilds: guilds,
      invites: invites,
      guildMessages: guildMessages,
      nextGuildId: nextGuildId,
      nextInviteId: nextInviteId,
      nextMessageId: nextMessageId
    };
  }

  /**
   * Create a new guild
   * @param {string} playerId - Founder player ID
   * @param {string} name - Guild name
   * @param {string} tag - Guild tag (3-5 chars)
   * @param {string} type - Guild type: 'guild'|'garden'|'studio'|'community'
   * @param {string} description - Guild description
   * @returns {object} - { success: boolean, guild?: object, error?: string }
   */
  function createGuild(playerId, name, tag, type, description) {
    // Validate parameters
    if (!playerId || !name || !tag || !type) {
      return { success: false, error: 'Missing required parameters' };
    }

    if (tag.length < 3 || tag.length > 5) {
      return { success: false, error: 'Tag must be 3-5 characters' };
    }

    if (['guild', 'garden', 'studio', 'community'].indexOf(type) === -1) {
      return { success: false, error: 'Invalid guild type' };
    }

    // Check if player already in a guild
    var existingGuild = getPlayerGuild(playerId);
    if (existingGuild) {
      return { success: false, error: 'Already in a guild' };
    }

    // Check if guild name or tag already exists
    var nameExists = guilds.some(function(g) { return g.name === name; });
    var tagExists = guilds.some(function(g) { return g.tag === tag; });

    if (nameExists) {
      return { success: false, error: 'Guild name already taken' };
    }

    if (tagExists) {
      return { success: false, error: 'Guild tag already taken' };
    }

    // Create guild
    var guild = {
      id: 'guild_' + (nextGuildId++),
      name: name,
      tag: tag,
      description: description || '',
      founder: playerId,
      leaders: [playerId],
      members: [{
        playerId: playerId,
        role: 'leader',
        joinedAt: Date.now()
      }],
      createdAt: Date.now(),
      zone: 'nexus', // Default home zone
      type: type,
      banner: {
        primaryColor: '#FFD700',
        secondaryColor: '#4A4A4A',
        icon: 'star'
      },
      treasury: 0,
      level: 1,
      xp: 0,
      maxMembers: 20,
      settings: {
        open: true,
        minLevel: 0
      },
      activities: []
    };

    guilds.push(guild);

    // Log activity
    addActivity(guild.id, playerId + ' founded the ' + type);

    return {
      success: true,
      guild: guild,
      cost: GUILD_CREATION_COST
    };
  }

  /**
   * Disband a guild
   * @param {string} guildId - Guild ID
   * @param {string} playerId - Player ID (must be founder)
   * @returns {object} - { success: boolean, error?: string }
   */
  function disbandGuild(guildId, playerId) {
    var guild = getGuild(guildId);
    if (!guild) {
      return { success: false, error: 'Guild not found' };
    }

    if (guild.founder !== playerId) {
      return { success: false, error: 'Only founder can disband guild' };
    }

    // Remove guild
    guilds = guilds.filter(function(g) { return g.id !== guildId; });

    // Remove invites
    invites = invites.filter(function(i) { return i.guildId !== guildId; });

    // Remove messages
    guildMessages = guildMessages.filter(function(m) { return m.guildId !== guildId; });

    return { success: true };
  }

  /**
   * Invite player to guild
   * @param {string} guildId - Guild ID
   * @param {string} inviterId - Inviter player ID
   * @param {string} targetId - Target player ID
   * @returns {object} - { success: boolean, invite?: object, error?: string }
   */
  function inviteToGuild(guildId, inviterId, targetId) {
    var guild = getGuild(guildId);
    if (!guild) {
      return { success: false, error: 'Guild not found' };
    }

    // Check inviter has permission
    var inviterMember = guild.members.find(function(m) { return m.playerId === inviterId; });
    if (!inviterMember || (inviterMember.role !== 'leader' && inviterMember.role !== 'officer')) {
      return { success: false, error: 'No permission to invite' };
    }

    // Check target not already in guild
    var targetInGuild = guild.members.some(function(m) { return m.playerId === targetId; });
    if (targetInGuild) {
      return { success: false, error: 'Player already in guild' };
    }

    // Check target not in another guild
    var targetGuild = getPlayerGuild(targetId);
    if (targetGuild) {
      return { success: false, error: 'Player already in another guild' };
    }

    // Check guild not full
    if (guild.members.length >= guild.maxMembers) {
      return { success: false, error: 'Guild is full' };
    }

    // Check if invite already exists
    var existingInvite = invites.find(function(i) {
      return i.guildId === guildId && i.targetId === targetId && i.status === 'pending';
    });

    if (existingInvite) {
      return { success: false, error: 'Invite already sent' };
    }

    // Create invite
    var invite = {
      id: 'invite_' + (nextInviteId++),
      guildId: guildId,
      guildName: guild.name,
      guildTag: guild.tag,
      inviterId: inviterId,
      targetId: targetId,
      status: 'pending',
      createdAt: Date.now(),
      expiresAt: Date.now() + INVITE_EXPIRY_MS
    };

    invites.push(invite);

    return { success: true, invite: invite };
  }

  /**
   * Accept guild invite
   * @param {string} inviteId - Invite ID
   * @param {string} playerId - Player ID
   * @returns {object} - { success: boolean, guild?: object, error?: string }
   */
  function acceptInvite(inviteId, playerId) {
    var invite = invites.find(function(i) { return i.id === inviteId; });
    if (!invite) {
      return { success: false, error: 'Invite not found' };
    }

    if (invite.targetId !== playerId) {
      return { success: false, error: 'Invite not for this player' };
    }

    if (invite.status !== 'pending') {
      return { success: false, error: 'Invite already responded to' };
    }

    if (Date.now() > invite.expiresAt) {
      invite.status = 'expired';
      return { success: false, error: 'Invite expired' };
    }

    var guild = getGuild(invite.guildId);
    if (!guild) {
      return { success: false, error: 'Guild no longer exists' };
    }

    // Check player not in another guild
    var playerGuild = getPlayerGuild(playerId);
    if (playerGuild) {
      return { success: false, error: 'Already in a guild' };
    }

    // Check guild not full
    if (guild.members.length >= guild.maxMembers) {
      return { success: false, error: 'Guild is full' };
    }

    // Add member
    guild.members.push({
      playerId: playerId,
      role: 'member',
      joinedAt: Date.now()
    });

    invite.status = 'accepted';

    // Log activity
    addActivity(guild.id, playerId + ' joined the guild');

    return { success: true, guild: guild };
  }

  /**
   * Decline guild invite
   * @param {string} inviteId - Invite ID
   * @param {string} playerId - Player ID
   * @returns {object} - { success: boolean, error?: string }
   */
  function declineInvite(inviteId, playerId) {
    var invite = invites.find(function(i) { return i.id === inviteId; });
    if (!invite) {
      return { success: false, error: 'Invite not found' };
    }

    if (invite.targetId !== playerId) {
      return { success: false, error: 'Invite not for this player' };
    }

    if (invite.status !== 'pending') {
      return { success: false, error: 'Invite already responded to' };
    }

    invite.status = 'declined';

    return { success: true };
  }

  /**
   * Leave guild
   * @param {string} guildId - Guild ID
   * @param {string} playerId - Player ID
   * @returns {object} - { success: boolean, error?: string }
   */
  function leaveGuild(guildId, playerId) {
    var guild = getGuild(guildId);
    if (!guild) {
      return { success: false, error: 'Guild not found' };
    }

    var memberIndex = guild.members.findIndex(function(m) { return m.playerId === playerId; });
    if (memberIndex === -1) {
      return { success: false, error: 'Not a member of this guild' };
    }

    // Founder cannot leave (must disband)
    if (guild.founder === playerId) {
      return { success: false, error: 'Founder must disband guild instead' };
    }

    // Remove member
    guild.members.splice(memberIndex, 1);

    // Remove from leaders if applicable
    guild.leaders = guild.leaders.filter(function(id) { return id !== playerId; });

    // Log activity
    addActivity(guild.id, playerId + ' left the guild');

    return { success: true };
  }

  /**
   * Kick member from guild
   * @param {string} guildId - Guild ID
   * @param {string} kickerId - Kicker player ID
   * @param {string} targetId - Target player ID
   * @returns {object} - { success: boolean, error?: string }
   */
  function kickMember(guildId, kickerId, targetId) {
    var guild = getGuild(guildId);
    if (!guild) {
      return { success: false, error: 'Guild not found' };
    }

    // Check kicker has permission
    var kickerMember = guild.members.find(function(m) { return m.playerId === kickerId; });
    if (!kickerMember || (kickerMember.role !== 'leader' && kickerMember.role !== 'officer')) {
      return { success: false, error: 'No permission to kick' };
    }

    // Cannot kick founder
    if (guild.founder === targetId) {
      return { success: false, error: 'Cannot kick founder' };
    }

    // Cannot kick self
    if (kickerId === targetId) {
      return { success: false, error: 'Cannot kick yourself' };
    }

    var targetMember = guild.members.find(function(m) { return m.playerId === targetId; });
    if (!targetMember) {
      return { success: false, error: 'Player not in guild' };
    }

    // Officers cannot kick other officers or leaders
    if (kickerMember.role === 'officer' && (targetMember.role === 'officer' || targetMember.role === 'leader')) {
      return { success: false, error: 'Insufficient permission' };
    }

    // Remove member
    guild.members = guild.members.filter(function(m) { return m.playerId !== targetId; });

    // Remove from leaders if applicable
    guild.leaders = guild.leaders.filter(function(id) { return id !== targetId; });

    // Log activity
    addActivity(guild.id, targetId + ' was kicked from guild');

    return { success: true };
  }

  /**
   * Promote/demote member
   * @param {string} guildId - Guild ID
   * @param {string} promoterId - Promoter player ID
   * @param {string} targetId - Target player ID
   * @param {string} newRole - New role: 'leader'|'officer'|'member'
   * @returns {object} - { success: boolean, error?: string }
   */
  function promoteRole(guildId, promoterId, targetId, newRole) {
    var guild = getGuild(guildId);
    if (!guild) {
      return { success: false, error: 'Guild not found' };
    }

    if (['leader', 'officer', 'member'].indexOf(newRole) === -1) {
      return { success: false, error: 'Invalid role' };
    }

    // Only leaders can promote
    var promoterMember = guild.members.find(function(m) { return m.playerId === promoterId; });
    if (!promoterMember || promoterMember.role !== 'leader') {
      return { success: false, error: 'Only leaders can promote' };
    }

    // Cannot change founder's role
    if (guild.founder === targetId && newRole !== 'leader') {
      return { success: false, error: 'Cannot demote founder' };
    }

    var targetMember = guild.members.find(function(m) { return m.playerId === targetId; });
    if (!targetMember) {
      return { success: false, error: 'Player not in guild' };
    }

    var oldRole = targetMember.role;
    targetMember.role = newRole;

    // Update leaders array
    if (newRole === 'leader' && guild.leaders.indexOf(targetId) === -1) {
      guild.leaders.push(targetId);
    } else if (newRole !== 'leader' && guild.leaders.indexOf(targetId) !== -1) {
      guild.leaders = guild.leaders.filter(function(id) { return id !== targetId; });
    }

    // Log activity
    addActivity(guild.id, targetId + ' promoted from ' + oldRole + ' to ' + newRole);

    return { success: true };
  }

  /**
   * Get guild by ID
   * @param {string} guildId - Guild ID
   * @returns {object|null} - Guild data or null
   */
  function getGuild(guildId) {
    return guilds.find(function(g) { return g.id === guildId; }) || null;
  }

  /**
   * Get player's guild
   * @param {string} playerId - Player ID
   * @returns {object|null} - Guild data or null
   */
  function getPlayerGuild(playerId) {
    return guilds.find(function(g) {
      return g.members.some(function(m) { return m.playerId === playerId; });
    }) || null;
  }

  /**
   * Get guild members with details
   * @param {string} guildId - Guild ID
   * @returns {array} - Array of member objects
   */
  function getGuildMembers(guildId) {
    var guild = getGuild(guildId);
    if (!guild) return [];

    return guild.members.map(function(m) {
      return {
        playerId: m.playerId,
        role: m.role,
        joinedAt: m.joinedAt,
        online: false // Would be populated by game state
      };
    });
  }

  /**
   * Search guilds by name
   * @param {string} query - Search query
   * @returns {array} - Matching guilds
   */
  function searchGuilds(query) {
    var lowerQuery = query.toLowerCase();
    return guilds.filter(function(g) {
      return g.name.toLowerCase().indexOf(lowerQuery) !== -1 ||
             g.tag.toLowerCase().indexOf(lowerQuery) !== -1;
    });
  }

  /**
   * Get guilds by type
   * @param {string} type - Guild type
   * @returns {array} - Guilds of that type
   */
  function getGuildsByType(type) {
    return guilds.filter(function(g) { return g.type === type; });
  }

  /**
   * Deposit to guild treasury
   * @param {string} guildId - Guild ID
   * @param {string} playerId - Player ID
   * @param {number} amount - Amount to deposit
   * @returns {object} - { success: boolean, error?: string }
   */
  function depositToTreasury(guildId, playerId, amount) {
    var guild = getGuild(guildId);
    if (!guild) {
      return { success: false, error: 'Guild not found' };
    }

    var member = guild.members.find(function(m) { return m.playerId === playerId; });
    if (!member) {
      return { success: false, error: 'Not a member of this guild' };
    }

    if (amount <= 0) {
      return { success: false, error: 'Invalid amount' };
    }

    guild.treasury += amount;

    // Log activity
    addActivity(guild.id, playerId + ' deposited ' + amount + ' Spark to treasury');

    return { success: true };
  }

  /**
   * Withdraw from guild treasury
   * @param {string} guildId - Guild ID
   * @param {string} playerId - Player ID (must be leader)
   * @param {number} amount - Amount to withdraw
   * @returns {object} - { success: boolean, error?: string }
   */
  function withdrawFromTreasury(guildId, playerId, amount) {
    var guild = getGuild(guildId);
    if (!guild) {
      return { success: false, error: 'Guild not found' };
    }

    var member = guild.members.find(function(m) { return m.playerId === playerId; });
    if (!member || member.role !== 'leader') {
      return { success: false, error: 'Only leaders can withdraw' };
    }

    if (amount <= 0) {
      return { success: false, error: 'Invalid amount' };
    }

    if (guild.treasury < amount) {
      return { success: false, error: 'Insufficient treasury funds' };
    }

    guild.treasury -= amount;

    // Log activity
    addActivity(guild.id, playerId + ' withdrew ' + amount + ' Spark from treasury');

    return { success: true };
  }

  /**
   * Add XP to guild
   * @param {string} guildId - Guild ID
   * @param {number} amount - XP amount
   * @param {string} activity - Activity description
   * @returns {object} - { success: boolean, leveledUp: boolean, newLevel?: number }
   */
  function addGuildXP(guildId, amount, activity) {
    var guild = getGuild(guildId);
    if (!guild) {
      return { success: false, leveledUp: false };
    }

    guild.xp += amount;

    // Check for level up
    var newLevel = calculateLevel(guild.xp);
    var leveledUp = newLevel > guild.level;

    if (leveledUp) {
      guild.level = newLevel;
      var threshold = LEVEL_THRESHOLDS.find(function(t) { return t.level === newLevel; });
      if (threshold) {
        guild.maxMembers = threshold.maxMembers;
      }

      // Log activity
      addActivity(guild.id, 'Guild reached level ' + newLevel + '!');
    }

    // Log XP activity
    if (activity) {
      addActivity(guild.id, activity + ' (+' + amount + ' XP)');
    }

    return {
      success: true,
      leveledUp: leveledUp,
      newLevel: leveledUp ? newLevel : undefined
    };
  }

  /**
   * Calculate guild level from XP
   * @param {number} xp - Total XP
   * @returns {number} - Guild level
   */
  function calculateLevel(xp) {
    for (var i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (xp >= LEVEL_THRESHOLDS[i].xp) {
        return LEVEL_THRESHOLDS[i].level;
      }
    }
    return 1;
  }

  /**
   * Get guild leaderboard
   * @returns {array} - Top guilds sorted by XP
   */
  function getGuildLeaderboard() {
    return guilds
      .slice()
      .sort(function(a, b) { return b.xp - a.xp; })
      .slice(0, 10)
      .map(function(g) {
        return {
          id: g.id,
          name: g.name,
          tag: g.tag,
          type: g.type,
          level: g.level,
          xp: g.xp,
          memberCount: g.members.length
        };
      });
  }

  /**
   * Set guild banner
   * @param {string} guildId - Guild ID
   * @param {string} playerId - Player ID (must be leader)
   * @param {object} banner - Banner config { primaryColor, secondaryColor, icon }
   * @returns {object} - { success: boolean, error?: string }
   */
  function setGuildBanner(guildId, playerId, banner) {
    var guild = getGuild(guildId);
    if (!guild) {
      return { success: false, error: 'Guild not found' };
    }

    var member = guild.members.find(function(m) { return m.playerId === playerId; });
    if (!member || member.role !== 'leader') {
      return { success: false, error: 'Only leaders can change banner' };
    }

    guild.banner = banner;

    // Log activity
    addActivity(guild.id, 'Guild banner updated');

    return { success: true };
  }

  /**
   * Get guild activities
   * @param {string} guildId - Guild ID
   * @param {number} limit - Max number of activities
   * @returns {array} - Activity log
   */
  function getGuildActivities(guildId, limit) {
    var guild = getGuild(guildId);
    if (!guild) return [];

    var activities = guild.activities.slice();
    if (limit) {
      activities = activities.slice(-limit);
    }

    return activities.reverse(); // Most recent first
  }

  /**
   * Send guild message
   * @param {string} guildId - Guild ID
   * @param {string} playerId - Sender player ID
   * @param {string} text - Message text
   * @returns {object} - { success: boolean, message?: object, error?: string }
   */
  function sendGuildMessage(guildId, playerId, text) {
    var guild = getGuild(guildId);
    if (!guild) {
      return { success: false, error: 'Guild not found' };
    }

    var member = guild.members.find(function(m) { return m.playerId === playerId; });
    if (!member) {
      return { success: false, error: 'Not a member of this guild' };
    }

    var message = {
      id: 'msg_' + (nextMessageId++),
      guildId: guildId,
      playerId: playerId,
      text: text,
      timestamp: Date.now()
    };

    guildMessages.push(message);

    return { success: true, message: message };
  }

  /**
   * Get guild messages
   * @param {string} guildId - Guild ID
   * @param {number} limit - Max number of messages
   * @returns {array} - Messages
   */
  function getGuildMessages(guildId, limit) {
    var messages = guildMessages.filter(function(m) { return m.guildId === guildId; });

    if (limit) {
      messages = messages.slice(-limit);
    }

    return messages;
  }

  /**
   * Add activity to guild log
   * @param {string} guildId - Guild ID
   * @param {string} activity - Activity description
   */
  function addActivity(guildId, activity) {
    var guild = getGuild(guildId);
    if (!guild) return;

    guild.activities.push({
      timestamp: Date.now(),
      text: activity
    });

    // Keep only last 50 activities
    if (guild.activities.length > 50) {
      guild.activities = guild.activities.slice(-50);
    }
  }

  /**
   * Get pending invites for player
   * @param {string} playerId - Player ID
   * @returns {array} - Pending invites
   */
  function getPendingInvites(playerId) {
    return invites.filter(function(i) {
      return i.targetId === playerId &&
             i.status === 'pending' &&
             Date.now() <= i.expiresAt;
    });
  }

  /**
   * Update guild settings
   * @param {string} guildId - Guild ID
   * @param {string} playerId - Player ID (must be leader)
   * @param {object} settings - Settings to update
   * @returns {object} - { success: boolean, error?: string }
   */
  function updateGuildSettings(guildId, playerId, settings) {
    var guild = getGuild(guildId);
    if (!guild) {
      return { success: false, error: 'Guild not found' };
    }

    var member = guild.members.find(function(m) { return m.playerId === playerId; });
    if (!member || member.role !== 'leader') {
      return { success: false, error: 'Only leaders can update settings' };
    }

    // Update allowed settings
    if (settings.hasOwnProperty('open')) {
      guild.settings.open = settings.open;
    }
    if (settings.hasOwnProperty('minLevel')) {
      guild.settings.minLevel = settings.minLevel;
    }

    return { success: true };
  }

  // Export public API
  exports.initGuilds = initGuilds;
  exports.getGuildsState = getGuildsState;
  exports.createGuild = createGuild;
  exports.disbandGuild = disbandGuild;
  exports.inviteToGuild = inviteToGuild;
  exports.acceptInvite = acceptInvite;
  exports.declineInvite = declineInvite;
  exports.leaveGuild = leaveGuild;
  exports.kickMember = kickMember;
  exports.promoteRole = promoteRole;
  exports.getGuild = getGuild;
  exports.getPlayerGuild = getPlayerGuild;
  exports.getGuildMembers = getGuildMembers;
  exports.searchGuilds = searchGuilds;
  exports.getGuildsByType = getGuildsByType;
  exports.depositToTreasury = depositToTreasury;
  exports.withdrawFromTreasury = withdrawFromTreasury;
  exports.addGuildXP = addGuildXP;
  exports.getGuildLeaderboard = getGuildLeaderboard;
  exports.setGuildBanner = setGuildBanner;
  exports.getGuildActivities = getGuildActivities;
  exports.sendGuildMessage = sendGuildMessage;
  exports.getGuildMessages = getGuildMessages;
  exports.getPendingInvites = getPendingInvites;
  exports.updateGuildSettings = updateGuildSettings;

})(typeof module !== 'undefined' ? module.exports : (window.Guilds = {}));
