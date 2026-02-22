(function(exports) {
  'use strict';

  // ============================================================================
  // GUILD PROGRESSION SYSTEM — ZION MMO
  // Implements collective goals, treasury, ranks, and weekly challenges
  // Constitution ref: §2.3 (community formation) and §5.4 (collective action)
  // ============================================================================

  // Guild levels 1-10: level N requires N*500 total guild XP
  // Level 1 = 500, Level 2 = 1000, ... but level 1 is the founding level (0 XP)
  // XP thresholds: level N requires N*500 cumulative XP to REACH that level
  // Level 1 is free (0 XP), Level 2 requires 500 XP, Level 3 requires 1000 XP, etc.

  var MAX_GUILD_LEVEL = 10;

  // Perk definitions per level
  var LEVEL_PERKS = {
    1:  { id: 'founded',        name: 'Founded',               desc: 'Basic guild established in ZION' },
    2:  { id: 'guild_banner',   name: 'Guild Banner',          desc: 'Display a custom guild banner' },
    3:  { id: 'trade_discount', name: 'Trade Discount',        desc: '+5% trade discount for all members' },
    4:  { id: 'garden_plot',    name: 'Shared Garden Plot',    desc: 'Collective garden for all members' },
    5:  { id: 'guild_hall',     name: 'Guild Hall',            desc: 'Physical guild hall structure in world' },
    6:  { id: 'xp_bonus',       name: 'XP Bonus',              desc: '+10% XP bonus for all members' },
    7:  { id: 'guild_vault',    name: 'Guild Vault',           desc: 'Shared storage vault with 20 slots' },
    8:  { id: 'fast_travel',    name: 'Guild Fast Travel',     desc: 'Free fast travel between member locations' },
    9:  { id: 'spark_bonus',    name: 'Spark Bonus',           desc: '+15% Spark bonus for all members' },
    10: { id: 'legendary',      name: 'Legendary Status',      desc: 'Custom zone marker and legendary title' }
  };

  // Rank definitions: name -> { level, permissions }
  // level used to compare rank authority (higher = more authority)
  var RANK_DEFINITIONS = {
    leader:  { level: 4, permissions: ['all', 'invite', 'kick', 'treasury', 'rank', 'chat'] },
    officer: { level: 3, permissions: ['invite', 'kick', 'treasury', 'chat'] },
    veteran: { level: 2, permissions: ['invite', 'chat'] },
    member:  { level: 1, permissions: ['chat'] },
    recruit: { level: 0, permissions: ['chat'] }
  };

  // Valid ranks in ascending order of authority
  var RANK_ORDER = ['recruit', 'member', 'veteran', 'officer', 'leader'];

  // Days threshold for automatic rank labels
  var VETERAN_DAYS = 30;
  var RECRUIT_DAYS = 7;

  // Weekly challenges cycling pool (5 total)
  var WEEKLY_CHALLENGES = [
    {
      id: 'gather_rush',
      title: 'Gathering Rush',
      desc: 'Guild members gather 500 total resources',
      target: 500,
      metric: 'resources_gathered',
      reward: { guildXP: 200, spark: 100 }
    },
    {
      id: 'dungeon_sweep',
      title: 'Dungeon Sweep',
      desc: 'Guild members clear 10 dungeons total',
      target: 10,
      metric: 'dungeons_cleared',
      reward: { guildXP: 300, spark: 200 }
    },
    {
      id: 'trade_bonanza',
      title: 'Trade Bonanza',
      desc: 'Guild members complete 25 trades',
      target: 25,
      metric: 'trades_completed',
      reward: { guildXP: 250, spark: 150 }
    },
    {
      id: 'fish_feast',
      title: 'Fish Feast',
      desc: 'Guild members catch 100 fish',
      target: 100,
      metric: 'fish_caught',
      reward: { guildXP: 200, spark: 120 }
    },
    {
      id: 'social_surge',
      title: 'Social Surge',
      desc: 'Guild members send 200 chat messages',
      target: 200,
      metric: 'messages_sent',
      reward: { guildXP: 150, spark: 80 }
    }
  ];

  // Vault max slots at level 7+
  var VAULT_MAX_SLOTS = 20;

  // ============================================================================
  // HELPER UTILITIES
  // ============================================================================

  function cloneState(state) {
    return JSON.parse(JSON.stringify(state));
  }

  function nowMs() {
    return Date.now();
  }

  function daysElapsed(joinedMs) {
    return (nowMs() - joinedMs) / (1000 * 60 * 60 * 24);
  }

  // ============================================================================
  // XP AND LEVELING
  // ============================================================================

  /**
   * Get XP required to REACH a given level (cumulative from 0).
   * Level 1 = 0 XP (founding), Level 2 = 500, Level 3 = 1000, ...
   * Formula: level N requires (N-1) * 500 total XP
   * @param {number} level - Guild level (1-10)
   * @returns {number} Total XP needed to reach this level
   */
  function getXPForLevel(level) {
    if (level <= 1) return 0;
    if (level > MAX_GUILD_LEVEL) return (MAX_GUILD_LEVEL - 1) * 500;
    return (level - 1) * 500;
  }

  /**
   * Compute current guild level from total accumulated XP.
   * @param {number} guildXP - Total guild XP
   * @returns {number} Current guild level (1-10)
   */
  function getGuildLevel(guildXP) {
    var level = 1;
    for (var l = MAX_GUILD_LEVEL; l >= 1; l--) {
      if (guildXP >= getXPForLevel(l)) {
        level = l;
        break;
      }
    }
    return level;
  }

  /**
   * Get XP remaining to next level.
   * @param {object} state - Guild state
   * @returns {number} XP needed for next level, or 0 if at max
   */
  function getXPToNextLevel(state) {
    var currentLevel = state.level;
    if (currentLevel >= MAX_GUILD_LEVEL) return 0;
    var nextLevelXP = getXPForLevel(currentLevel + 1);
    return Math.max(0, nextLevelXP - state.guildXP);
  }

  /**
   * Return all perks unlocked at or below the given level.
   * @param {number} level - Guild level
   * @returns {Array} Array of perk objects
   */
  function getGuildPerks(level) {
    var perks = [];
    for (var l = 1; l <= level && l <= MAX_GUILD_LEVEL; l++) {
      if (LEVEL_PERKS[l]) {
        perks.push(LEVEL_PERKS[l]);
      }
    }
    return perks;
  }

  // ============================================================================
  // GUILD CREATION
  // ============================================================================

  /**
   * Create a new guild progression state.
   * @param {string} guildId - Unique guild ID
   * @param {string} name - Guild display name
   * @param {string} leaderId - Founding leader player ID
   * @returns {object} Full guild state
   */
  function createGuildProgression(guildId, name, leaderId) {
    var now = nowMs();
    var members = {};
    members[leaderId] = {
      rank: 'leader',
      joined: now,
      contributed: 0,
      displayName: leaderId
    };

    var state = {
      id: guildId,
      name: name,
      leaderId: leaderId,
      level: 1,
      guildXP: 0,
      treasury: 0,
      members: members,
      vault: [],
      challenges: {
        weekNumber: null,
        challengeId: null,
        progress: 0,
        completed: false,
        rewardClaimed: false
      },
      log: [],
      perks: getGuildPerks(1)
    };

    // Record founding event
    state.log.push({
      type: 'founded',
      ts: now,
      by: leaderId,
      message: name + ' was founded by ' + leaderId
    });

    return state;
  }

  // ============================================================================
  // XP AND LEVELING OPERATIONS
  // ============================================================================

  /**
   * Add XP to guild and process any level-ups.
   * @param {object} state - Guild state
   * @param {number} amount - XP to add
   * @param {string} source - Description of XP source
   * @returns {{ state, leveled, newLevel, perkUnlocked, message }}
   */
  function addGuildXP(state, amount, source) {
    state = cloneState(state);
    var oldLevel = state.level;
    state.guildXP += amount;

    var newLevel = getGuildLevel(state.guildXP);
    var leveled = newLevel > oldLevel;
    var perkUnlocked = null;

    if (leveled) {
      state.level = newLevel;
      perkUnlocked = LEVEL_PERKS[newLevel] || null;
      state.perks = getGuildPerks(newLevel);
      state.log.push({
        type: 'level_up',
        ts: nowMs(),
        oldLevel: oldLevel,
        newLevel: newLevel,
        perk: perkUnlocked ? perkUnlocked.name : null,
        message: state.name + ' reached Level ' + newLevel + '! Perk unlocked: ' + (perkUnlocked ? perkUnlocked.name : 'none')
      });
    }

    state.log.push({
      type: 'xp_gained',
      ts: nowMs(),
      amount: amount,
      source: source || 'activity',
      total: state.guildXP,
      message: '+' + amount + ' Guild XP from ' + (source || 'activity')
    });

    var message = leveled
      ? state.name + ' leveled up to ' + newLevel + '! ' + (perkUnlocked ? perkUnlocked.name + ' unlocked.' : '')
      : 'Guild gained ' + amount + ' XP. (' + getXPToNextLevel(state) + ' XP to next level)';

    return {
      state: state,
      leveled: leveled,
      newLevel: newLevel,
      perkUnlocked: perkUnlocked,
      message: message
    };
  }

  // ============================================================================
  // TREASURY OPERATIONS
  // ============================================================================

  /**
   * Contribute Spark to the guild treasury.
   * @param {object} state - Guild state
   * @param {string} playerId - Contributing player ID
   * @param {number} amount - Spark amount to contribute
   * @returns {{ state, success, newTreasury, message }}
   */
  function contributeSpark(state, playerId, amount) {
    state = cloneState(state);

    if (!state.members[playerId]) {
      return { state: state, success: false, newTreasury: state.treasury, message: 'Player is not a guild member.' };
    }
    if (typeof amount !== 'number' || amount <= 0) {
      return { state: state, success: false, newTreasury: state.treasury, message: 'Contribution amount must be a positive number.' };
    }

    state.treasury += amount;
    state.members[playerId].contributed = (state.members[playerId].contributed || 0) + amount;

    state.log.push({
      type: 'treasury_deposit',
      ts: nowMs(),
      by: playerId,
      amount: amount,
      balance: state.treasury,
      message: playerId + ' contributed ' + amount + ' Spark to the treasury. Balance: ' + state.treasury
    });

    return {
      state: state,
      success: true,
      newTreasury: state.treasury,
      message: playerId + ' contributed ' + amount + ' Spark. Treasury: ' + state.treasury + ' Spark.'
    };
  }

  /**
   * Withdraw Spark from the guild treasury (leader/officer only).
   * @param {object} state - Guild state
   * @param {string} playerId - Requesting player ID
   * @param {number} amount - Spark amount to withdraw
   * @param {string} reason - Stated reason for withdrawal
   * @returns {{ state, success, message }}
   */
  function withdrawSpark(state, playerId, amount, reason) {
    state = cloneState(state);

    if (!state.members[playerId]) {
      return { state: state, success: false, message: 'Player is not a guild member.' };
    }
    if (!hasPermission(state, playerId, 'treasury')) {
      return { state: state, success: false, message: 'Insufficient rank. Only leaders and officers can withdraw from the treasury.' };
    }
    if (typeof amount !== 'number' || amount <= 0) {
      return { state: state, success: false, message: 'Withdrawal amount must be a positive number.' };
    }
    if (amount > state.treasury) {
      return { state: state, success: false, message: 'Insufficient funds. Treasury has ' + state.treasury + ' Spark, requested ' + amount + '.' };
    }

    state.treasury -= amount;

    state.log.push({
      type: 'treasury_withdrawal',
      ts: nowMs(),
      by: playerId,
      amount: amount,
      reason: reason || 'unspecified',
      balance: state.treasury,
      message: playerId + ' withdrew ' + amount + ' Spark from treasury. Reason: ' + (reason || 'unspecified') + '. Balance: ' + state.treasury
    });

    return {
      state: state,
      success: true,
      message: playerId + ' withdrew ' + amount + ' Spark. Remaining treasury: ' + state.treasury + ' Spark.'
    };
  }

  /**
   * Get recent treasury transactions.
   * @param {object} state - Guild state
   * @param {number} limit - Max entries to return (default 20)
   * @returns {Array} Array of treasury log entries
   */
  function getTreasuryLog(state, limit) {
    var n = limit || 20;
    var entries = state.log.filter(function(e) {
      return e.type === 'treasury_deposit' || e.type === 'treasury_withdrawal';
    });
    return entries.slice(-n);
  }

  // ============================================================================
  // RANK MANAGEMENT
  // ============================================================================

  /**
   * Get current rank for a player.
   * @param {object} state - Guild state
   * @param {string} playerId - Player ID
   * @returns {string} Rank name, or 'non-member' if not in guild
   */
  function getRank(state, playerId) {
    if (!state.members[playerId]) return 'non-member';
    return state.members[playerId].rank;
  }

  /**
   * Check whether a player has a specific permission.
   * @param {object} state - Guild state
   * @param {string} playerId - Player ID
   * @param {string} permission - Permission to check
   * @returns {boolean}
   */
  function hasPermission(state, playerId, permission) {
    var rank = getRank(state, playerId);
    if (rank === 'non-member') return false;
    var def = RANK_DEFINITIONS[rank];
    if (!def) return false;
    if (def.permissions.indexOf('all') !== -1) return true;
    return def.permissions.indexOf(permission) !== -1;
  }

  /**
   * Set a member's rank.
   * @param {object} state - Guild state
   * @param {string} setterId - Player making the change
   * @param {string} targetId - Player whose rank changes
   * @param {string} newRank - New rank to assign
   * @returns {{ state, success, message }}
   */
  function setRank(state, setterId, targetId, newRank) {
    state = cloneState(state);

    if (!state.members[setterId]) {
      return { state: state, success: false, message: 'Setter is not a guild member.' };
    }
    if (!state.members[targetId]) {
      return { state: state, success: false, message: 'Target player is not a guild member.' };
    }
    if (RANK_ORDER.indexOf(newRank) === -1) {
      return { state: state, success: false, message: 'Invalid rank: ' + newRank + '. Valid ranks: ' + RANK_ORDER.join(', ') };
    }

    // Cannot set to or from 'leader' unless you ARE the leader
    if (newRank === 'leader') {
      if (getRank(state, setterId) !== 'leader') {
        return { state: state, success: false, message: 'Only the leader can transfer leadership.' };
      }
      // Transfer leadership: demote old leader to officer
      state.members[setterId].rank = 'officer';
      state.leaderId = targetId;
    }

    // Cannot demote/change someone of equal or higher rank (unless you're leader)
    var setterRankLevel = RANK_DEFINITIONS[getRank(state, setterId)] ? RANK_DEFINITIONS[getRank(state, setterId)].level : -1;
    var targetCurrentRankLevel = RANK_DEFINITIONS[getRank(state, targetId)] ? RANK_DEFINITIONS[getRank(state, targetId)].level : -1;

    if (getRank(state, setterId) !== 'leader' && newRank !== 'leader') {
      // Officers can invite/kick members below officer rank
      if (!hasPermission(state, setterId, 'rank')) {
        // Officers can set member/recruit ranks (below themselves)
        if (!hasPermission(state, setterId, 'kick')) {
          return { state: state, success: false, message: 'Insufficient permissions to change ranks.' };
        }
        // Officer can only manage ranks below officer level
        var newRankLevel = RANK_DEFINITIONS[newRank] ? RANK_DEFINITIONS[newRank].level : -1;
        if (newRankLevel >= setterRankLevel) {
          return { state: state, success: false, message: 'Cannot promote to a rank equal to or higher than your own.' };
        }
        if (targetCurrentRankLevel >= setterRankLevel) {
          return { state: state, success: false, message: 'Cannot change the rank of someone of equal or higher rank.' };
        }
      }
    }

    var oldRank = state.members[targetId].rank;
    state.members[targetId].rank = newRank;

    state.log.push({
      type: 'rank_change',
      ts: nowMs(),
      by: setterId,
      target: targetId,
      oldRank: oldRank,
      newRank: newRank,
      message: setterId + ' changed ' + targetId + "'s rank from " + oldRank + ' to ' + newRank
    });

    return {
      state: state,
      success: true,
      message: targetId + "'s rank changed from " + oldRank + ' to ' + newRank + '.'
    };
  }

  // ============================================================================
  // MEMBER MANAGEMENT
  // ============================================================================

  /**
   * Get sorted member list with rank and stats.
   * Sort order: by rank level descending, then by join date ascending.
   * @param {object} state - Guild state
   * @returns {Array} Sorted array of member info objects
   */
  function getMemberList(state) {
    var now = nowMs();
    var members = [];

    for (var pid in state.members) {
      if (!state.members.hasOwnProperty(pid)) continue;
      var m = state.members[pid];
      var daysIn = (now - m.joined) / (1000 * 60 * 60 * 24);
      var rankDef = RANK_DEFINITIONS[m.rank] || RANK_DEFINITIONS['recruit'];
      members.push({
        id: pid,
        rank: m.rank,
        rankLevel: rankDef.level,
        joined: m.joined,
        daysInGuild: Math.floor(daysIn),
        contributed: m.contributed || 0,
        displayName: m.displayName || pid
      });
    }

    // Sort: rank level descending, then join date ascending (older first)
    members.sort(function(a, b) {
      if (b.rankLevel !== a.rankLevel) return b.rankLevel - a.rankLevel;
      return a.joined - b.joined;
    });

    return members;
  }

  // ============================================================================
  // WEEKLY CHALLENGES
  // ============================================================================

  /**
   * Get the weekly challenge for a given week number (cycles through 5).
   * @param {number} weekNumber - ISO week number or arbitrary counter
   * @returns {object} Challenge definition
   */
  function getWeeklyChallenge(weekNumber) {
    var idx = ((weekNumber % WEEKLY_CHALLENGES.length) + WEEKLY_CHALLENGES.length) % WEEKLY_CHALLENGES.length;
    return WEEKLY_CHALLENGES[idx];
  }

  /**
   * Update progress toward the current weekly challenge.
   * Initializes the challenge for the week if not already set.
   * @param {object} state - Guild state
   * @param {string} metric - Metric key (e.g. 'resources_gathered')
   * @param {number} amount - Amount to add to progress
   * @returns {{ state, progress, completed, reward }}
   */
  function updateChallengeProgress(state, metric, amount) {
    state = cloneState(state);

    // Determine current week number (ISO week)
    var now = new Date();
    var startOfYear = new Date(now.getFullYear(), 0, 1);
    var weekNumber = Math.floor((now - startOfYear) / (7 * 24 * 60 * 60 * 1000));

    // Initialize challenge tracking if new week or not set
    if (state.challenges.weekNumber !== weekNumber) {
      var challenge = getWeeklyChallenge(weekNumber);
      state.challenges = {
        weekNumber: weekNumber,
        challengeId: challenge.id,
        progress: 0,
        completed: false,
        rewardClaimed: false
      };
    }

    var challenge = getWeeklyChallenge(weekNumber);

    // Only update if metric matches current challenge
    if (challenge.metric !== metric) {
      return {
        state: state,
        progress: state.challenges.progress,
        completed: state.challenges.completed,
        reward: null
      };
    }

    // Already completed
    if (state.challenges.completed) {
      return {
        state: state,
        progress: state.challenges.progress,
        completed: true,
        reward: null
      };
    }

    state.challenges.progress += amount;

    var completed = false;
    var reward = null;

    if (state.challenges.progress >= challenge.target) {
      state.challenges.progress = challenge.target;
      state.challenges.completed = true;
      completed = true;
      reward = challenge.reward;

      // Award guild XP automatically
      var xpResult = addGuildXP(state, reward.guildXP, 'weekly challenge: ' + challenge.title);
      state = xpResult.state;

      state.log.push({
        type: 'challenge_completed',
        ts: nowMs(),
        challengeId: challenge.id,
        challengeTitle: challenge.title,
        reward: reward,
        message: 'Weekly challenge "' + challenge.title + '" completed! Reward: ' + reward.guildXP + ' Guild XP + ' + reward.spark + ' Spark for members'
      });
    }

    return {
      state: state,
      progress: state.challenges.progress,
      completed: completed,
      reward: reward
    };
  }

  /**
   * Get current weekly challenge with progress info.
   * @param {object} state - Guild state
   * @returns {object} Challenge with progress fields
   */
  function getChallengeProgress(state) {
    var now = new Date();
    var startOfYear = new Date(now.getFullYear(), 0, 1);
    var weekNumber = Math.floor((now - startOfYear) / (7 * 24 * 60 * 60 * 1000));

    var challenge = getWeeklyChallenge(weekNumber);
    var isCurrentWeek = state.challenges.weekNumber === weekNumber;

    return {
      weekNumber: weekNumber,
      challenge: challenge,
      progress: isCurrentWeek ? state.challenges.progress : 0,
      completed: isCurrentWeek ? state.challenges.completed : false,
      percentComplete: isCurrentWeek ? Math.min(100, Math.floor((state.challenges.progress / challenge.target) * 100)) : 0,
      rewardClaimed: isCurrentWeek ? state.challenges.rewardClaimed : false
    };
  }

  // ============================================================================
  // VAULT OPERATIONS
  // ============================================================================

  /**
   * Add items to the shared guild vault.
   * Requires guild level 7+ (vault perk).
   * @param {object} state - Guild state
   * @param {string} playerId - Player adding items
   * @param {string} itemId - Item identifier
   * @param {number} qty - Quantity to add
   * @returns {{ state, success, message }}
   */
  function addToVault(state, playerId, itemId, qty) {
    state = cloneState(state);

    if (!state.members[playerId]) {
      return { state: state, success: false, message: 'Player is not a guild member.' };
    }
    if (state.level < 7) {
      return { state: state, success: false, message: 'Guild Vault requires guild level 7. Current level: ' + state.level };
    }
    if (typeof qty !== 'number' || qty <= 0) {
      return { state: state, success: false, message: 'Quantity must be a positive number.' };
    }

    // Check if item already in vault
    var existingSlot = null;
    for (var i = 0; i < state.vault.length; i++) {
      if (state.vault[i].itemId === itemId) {
        existingSlot = i;
        break;
      }
    }

    if (existingSlot !== null) {
      state.vault[existingSlot].qty += qty;
    } else {
      if (state.vault.length >= VAULT_MAX_SLOTS) {
        return { state: state, success: false, message: 'Guild vault is full (' + VAULT_MAX_SLOTS + ' slots).' };
      }
      state.vault.push({ itemId: itemId, qty: qty, addedBy: playerId, ts: nowMs() });
    }

    state.log.push({
      type: 'vault_deposit',
      ts: nowMs(),
      by: playerId,
      itemId: itemId,
      qty: qty,
      message: playerId + ' added ' + qty + 'x ' + itemId + ' to the guild vault'
    });

    return {
      state: state,
      success: true,
      message: playerId + ' added ' + qty + 'x ' + itemId + ' to the vault.'
    };
  }

  /**
   * Take items from the shared guild vault.
   * Requires member rank or above (not recruit).
   * @param {object} state - Guild state
   * @param {string} playerId - Player taking items
   * @param {string} itemId - Item identifier
   * @param {number} qty - Quantity to take
   * @returns {{ state, success, message }}
   */
  function takeFromVault(state, playerId, itemId, qty) {
    state = cloneState(state);

    if (!state.members[playerId]) {
      return { state: state, success: false, message: 'Player is not a guild member.' };
    }
    if (state.level < 7) {
      return { state: state, success: false, message: 'Guild Vault requires guild level 7. Current level: ' + state.level };
    }

    // Recruits cannot take from vault
    var rank = getRank(state, playerId);
    if (rank === 'recruit') {
      return { state: state, success: false, message: 'Recruits cannot take from the guild vault.' };
    }

    if (typeof qty !== 'number' || qty <= 0) {
      return { state: state, success: false, message: 'Quantity must be a positive number.' };
    }

    var slotIndex = null;
    for (var i = 0; i < state.vault.length; i++) {
      if (state.vault[i].itemId === itemId) {
        slotIndex = i;
        break;
      }
    }

    if (slotIndex === null) {
      return { state: state, success: false, message: 'Item "' + itemId + '" not found in vault.' };
    }

    if (state.vault[slotIndex].qty < qty) {
      return { state: state, success: false, message: 'Insufficient quantity. Vault has ' + state.vault[slotIndex].qty + 'x ' + itemId + ', requested ' + qty + '.' };
    }

    state.vault[slotIndex].qty -= qty;
    if (state.vault[slotIndex].qty === 0) {
      state.vault.splice(slotIndex, 1);
    }

    state.log.push({
      type: 'vault_withdrawal',
      ts: nowMs(),
      by: playerId,
      itemId: itemId,
      qty: qty,
      message: playerId + ' took ' + qty + 'x ' + itemId + ' from the guild vault'
    });

    return {
      state: state,
      success: true,
      message: playerId + ' took ' + qty + 'x ' + itemId + ' from the vault.'
    };
  }

  // ============================================================================
  // GUILD SUMMARY AND DISPLAY
  // ============================================================================

  /**
   * Return a comprehensive guild overview object.
   * @param {object} state - Guild state
   * @returns {object} Formatted guild summary
   */
  function getGuildSummary(state) {
    var memberCount = Object.keys(state.members).length;
    var challengeInfo = getChallengeProgress(state);
    var xpToNext = getXPToNextLevel(state);
    var nextLevelXP = state.level < MAX_GUILD_LEVEL ? getXPForLevel(state.level + 1) : null;

    return {
      id: state.id,
      name: state.name,
      level: state.level,
      guildXP: state.guildXP,
      xpToNextLevel: xpToNext,
      nextLevelAt: nextLevelXP,
      treasury: state.treasury,
      memberCount: memberCount,
      vaultSlots: state.vault.length,
      vaultMaxSlots: VAULT_MAX_SLOTS,
      perks: state.perks,
      currentChallenge: challengeInfo,
      recentActivity: state.log.slice(-5)
    };
  }

  /**
   * Generate an ASCII/HTML guild banner.
   * @param {object} state - Guild state
   * @returns {string} Banner text
   */
  function formatGuildBanner(state) {
    var memberCount = Object.keys(state.members).length;
    var stars = '';
    for (var i = 0; i < state.level; i++) stars += '*';
    var maxLen = 36;
    var namePad = state.name.length < maxLen ? Math.floor((maxLen - state.name.length) / 2) : 0;
    var nameSpace = '';
    for (var j = 0; j < namePad; j++) nameSpace += ' ';

    var banner = [
      '+--------------------------------------+',
      '|   ~~~ ZION GUILD REGISTRY ~~~        |',
      '+--------------------------------------+',
      '| ' + nameSpace + state.name + nameSpace + ' |',
      '| Level ' + state.level + ' Guild  [' + stars + ']' + new Array(Math.max(1, maxLen - 15 - state.level.toString().length - stars.length)).join(' ') + '|',
      '| Members: ' + memberCount + new Array(Math.max(1, maxLen - 9 - memberCount.toString().length)).join(' ') + '|',
      '| Treasury: ' + state.treasury + ' Spark' + new Array(Math.max(1, maxLen - 16 - state.treasury.toString().length)).join(' ') + '|',
      '| Guild XP: ' + state.guildXP + new Array(Math.max(1, maxLen - 11 - state.guildXP.toString().length)).join(' ') + '|',
      '+--------------------------------------+'
    ].join('\n');

    return banner;
  }

  // ============================================================================
  // EXPORTS
  // ============================================================================

  exports.WEEKLY_CHALLENGES = WEEKLY_CHALLENGES;
  exports.LEVEL_PERKS = LEVEL_PERKS;
  exports.RANK_DEFINITIONS = RANK_DEFINITIONS;
  exports.RANK_ORDER = RANK_ORDER;
  exports.MAX_GUILD_LEVEL = MAX_GUILD_LEVEL;
  exports.VAULT_MAX_SLOTS = VAULT_MAX_SLOTS;

  exports.createGuildProgression = createGuildProgression;
  exports.addGuildXP = addGuildXP;
  exports.getGuildLevel = getGuildLevel;
  exports.getXPForLevel = getXPForLevel;
  exports.getXPToNextLevel = getXPToNextLevel;
  exports.getGuildPerks = getGuildPerks;

  exports.contributeSpark = contributeSpark;
  exports.withdrawSpark = withdrawSpark;
  exports.getTreasuryLog = getTreasuryLog;

  exports.getRank = getRank;
  exports.hasPermission = hasPermission;
  exports.setRank = setRank;

  exports.getMemberList = getMemberList;

  exports.getWeeklyChallenge = getWeeklyChallenge;
  exports.updateChallengeProgress = updateChallengeProgress;
  exports.getChallengeProgress = getChallengeProgress;

  exports.addToVault = addToVault;
  exports.takeFromVault = takeFromVault;

  exports.getGuildSummary = getGuildSummary;
  exports.formatGuildBanner = formatGuildBanner;

})(typeof module !== 'undefined' ? module.exports : (window.GuildProgression = {}));
