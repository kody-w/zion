// prestige.js
/**
 * ZION Prestige / Ascension System
 * Endgame progression: reset skills, keep cosmetics, earn permanent bonuses
 */

(function(exports) {
  'use strict';

  // ========================================================================
  // PRESTIGE TIERS
  // ========================================================================

  var PRESTIGE_TIERS = [
    { level: 0, name: 'Citizen',      color: '#cccccc', sparkBonus: 0,    title: '' },
    { level: 1, name: 'Ascended',     color: '#87CEEB', sparkBonus: 0.05, title: 'the Ascended' },
    { level: 2, name: 'Enlightened',  color: '#4CAF50', sparkBonus: 0.10, title: 'the Enlightened' },
    { level: 3, name: 'Transcendent', color: '#9C27B0', sparkBonus: 0.15, title: 'the Transcendent' },
    { level: 4, name: 'Mythic',       color: '#FF9800', sparkBonus: 0.20, title: 'the Mythic' },
    { level: 5, name: 'Legendary',    color: '#FFD700', sparkBonus: 0.25, title: 'the Legendary' },
    { level: 6, name: 'Eternal',      color: '#FF4081', sparkBonus: 0.30, title: 'the Eternal' }
  ];

  // ========================================================================
  // PRESTIGE REWARDS
  // ========================================================================

  var PRESTIGE_REWARDS = {
    1: {
      cosmetics: ['golden_aura'],
      perks: ['spark_bonus_5'],
      title: 'the Ascended'
    },
    2: {
      cosmetics: ['silver_trail', 'emerald_glow'],
      perks: ['xp_bonus_5', 'spark_bonus_10'],
      title: 'the Enlightened'
    },
    3: {
      cosmetics: ['purple_flames', 'mystic_particles'],
      perks: ['craft_bonus_5', 'gather_bonus_5', 'spark_bonus_15'],
      title: 'the Transcendent'
    },
    4: {
      cosmetics: ['phoenix_wings', 'amber_halo'],
      perks: ['trade_bonus_10', 'fast_travel_discount', 'spark_bonus_20'],
      title: 'the Mythic'
    },
    5: {
      cosmetics: ['star_crown', 'golden_footsteps', 'legendary_glow'],
      perks: ['double_daily_rewards', 'rare_loot_bonus', 'spark_bonus_25'],
      title: 'the Legendary'
    },
    6: {
      cosmetics: ['eternal_flames', 'cosmic_aura', 'timeline_shimmer', 'divine_particles'],
      perks: ['triple_daily_rewards', 'master_all_perks', 'spark_bonus_30', 'instant_travel'],
      title: 'the Eternal'
    }
  };

  // ========================================================================
  // PERK DESCRIPTIONS
  // ========================================================================

  var PERK_DESCRIPTIONS = {
    spark_bonus_5:          { label: '+5% Spark Earning',         type: 'spark',   value: 0.05 },
    spark_bonus_10:         { label: '+10% Spark Earning',        type: 'spark',   value: 0.10 },
    spark_bonus_15:         { label: '+15% Spark Earning',        type: 'spark',   value: 0.15 },
    spark_bonus_20:         { label: '+20% Spark Earning',        type: 'spark',   value: 0.20 },
    spark_bonus_25:         { label: '+25% Spark Earning',        type: 'spark',   value: 0.25 },
    spark_bonus_30:         { label: '+30% Spark Earning',        type: 'spark',   value: 0.30 },
    xp_bonus_5:             { label: '+5% XP Gain',              type: 'xp',      value: 0.05 },
    craft_bonus_5:          { label: '+5% Crafting Quality',     type: 'craft',   value: 0.05 },
    gather_bonus_5:         { label: '+5% Gathering Yield',      type: 'gather',  value: 0.05 },
    trade_bonus_10:         { label: '+10% Trade Value',         type: 'trade',   value: 0.10 },
    fast_travel_discount:   { label: '20% Fast Travel Discount', type: 'travel',  value: 0.20 },
    double_daily_rewards:   { label: 'Double Daily Rewards',     type: 'daily',   value: 2.0  },
    rare_loot_bonus:        { label: '+15% Rare Loot Chance',    type: 'loot',    value: 0.15 },
    triple_daily_rewards:   { label: 'Triple Daily Rewards',     type: 'daily',   value: 3.0  },
    master_all_perks:       { label: 'All Perk Bonuses Active',  type: 'master',  value: 1.0  },
    instant_travel:         { label: 'Instant Zone Travel',      type: 'travel',  value: 1.0  }
  };

  // ========================================================================
  // ASCENSION CONSTANTS
  // ========================================================================

  var ASCENSION_REQUIRED_LEVEL     = 50;
  var ASCENSION_REQUIRED_QUESTS    = 10;
  var ASCENSION_REQUIRED_ZONES     = 8;
  var ASCENSION_SPARK_COST         = 500;
  var MAX_PRESTIGE_LEVEL           = 6;

  // ASCII badges indexed by prestige level (0–6)
  var PRESTIGE_BADGES = [
    '[~]',   // Citizen
    '[*]',   // Ascended
    '[**]',  // Enlightened
    '[***]', // Transcendent
    '[M]',   // Mythic
    '[L]',   // Legendary
    '[E]'    // Eternal
  ];

  // ========================================================================
  // STATE FACTORY
  // ========================================================================

  /**
   * Creates a fresh prestige state for a new player.
   * @returns {Object}
   */
  function createPrestigeState() {
    return {
      level: 0,
      totalAscensions: 0,
      history: [],
      cosmetics: [],
      perks: [],
      unlockedTitles: []
    };
  }

  // ========================================================================
  // ELIGIBILITY
  // ========================================================================

  /**
   * Checks whether a player meets all requirements to ascend.
   * @param {Object} prestigeState
   * @param {number} playerLevel
   * @param {number} questsCompleted
   * @param {number} zonesVisited
   * @param {number} spark
   * @returns {{ eligible: boolean, missing: string[] }}
   */
  function canAscend(prestigeState, playerLevel, questsCompleted, zonesVisited, spark) {
    var missing = [];

    if (playerLevel < ASCENSION_REQUIRED_LEVEL) {
      missing.push('Must be level ' + ASCENSION_REQUIRED_LEVEL + ' (currently ' + playerLevel + ')');
    }
    if (questsCompleted < ASCENSION_REQUIRED_QUESTS) {
      missing.push('Must complete ' + ASCENSION_REQUIRED_QUESTS + ' quests (' + questsCompleted + ' completed)');
    }
    if (zonesVisited < ASCENSION_REQUIRED_ZONES) {
      missing.push('Must visit all ' + ASCENSION_REQUIRED_ZONES + ' zones (' + zonesVisited + ' visited)');
    }
    if (spark < ASCENSION_SPARK_COST) {
      missing.push('Must have ' + ASCENSION_SPARK_COST + ' Spark (' + spark + ' available)');
    }
    if (prestigeState.level >= MAX_PRESTIGE_LEVEL) {
      missing.push('Already at maximum prestige level (' + MAX_PRESTIGE_LEVEL + ')');
    }

    return {
      eligible: missing.length === 0,
      missing: missing
    };
  }

  // ========================================================================
  // ASCENSION
  // ========================================================================

  /**
   * Performs the ascension ritual.
   * Increments prestige level, unlocks rewards, resets progression.
   * @param {Object} prestigeState  - current prestige state (mutated in place)
   * @param {Object} playerData     - { level, xp, skillPoints, skillTree, spark, ... }
   * @returns {{ state, newPrestigeLevel, rewards, sparkCost, message }}
   */
  function ascend(prestigeState, playerData) {
    var currentLevel = prestigeState.level;
    var newPrestigeLevel = currentLevel + 1;

    // Guard: already at cap
    if (currentLevel >= MAX_PRESTIGE_LEVEL) {
      return {
        state: prestigeState,
        newPrestigeLevel: currentLevel,
        rewards: null,
        sparkCost: 0,
        message: 'You have already reached the pinnacle of ascension.'
      };
    }

    var rewards = PRESTIGE_REWARDS[newPrestigeLevel];
    var tier    = PRESTIGE_TIERS[newPrestigeLevel];

    // Add cosmetics (avoid duplicates)
    var cos = rewards.cosmetics;
    for (var ci = 0; ci < cos.length; ci++) {
      if (prestigeState.cosmetics.indexOf(cos[ci]) === -1) {
        prestigeState.cosmetics.push(cos[ci]);
      }
    }

    // Add perks (avoid duplicates)
    var perks = rewards.perks;
    for (var pi = 0; pi < perks.length; pi++) {
      if (prestigeState.perks.indexOf(perks[pi]) === -1) {
        prestigeState.perks.push(perks[pi]);
      }
    }

    // Unlock title
    if (prestigeState.unlockedTitles.indexOf(tier.title) === -1 && tier.title) {
      prestigeState.unlockedTitles.push(tier.title);
    }

    // Record history entry
    var historyEntry = {
      ascensionNumber: newPrestigeLevel,
      ts: Date.now(),
      fromLevel: playerData.level || 1,
      sparkSpent: ASCENSION_SPARK_COST,
      rewardsUnlocked: {
        cosmetics: cos.slice(),
        perks: perks.slice(),
        title: tier.title
      }
    };
    prestigeState.history.push(historyEntry);

    // Update prestige level and ascension count
    prestigeState.level = newPrestigeLevel;
    prestigeState.totalAscensions = newPrestigeLevel;

    // Reset player progression
    playerData.level      = 1;
    playerData.xp         = 0;
    playerData.skillPoints = 0;
    playerData.skillTree  = {};
    if (typeof playerData.spark === 'number') {
      playerData.spark -= ASCENSION_SPARK_COST;
    }

    var tierName = tier.name;
    var message = 'You have ascended to ' + tierName + '! Your journey begins anew with ' +
      'new powers and eternal recognition.';

    return {
      state: prestigeState,
      newPrestigeLevel: newPrestigeLevel,
      rewards: rewards,
      sparkCost: ASCENSION_SPARK_COST,
      message: message
    };
  }

  // ========================================================================
  // GETTERS
  // ========================================================================

  /**
   * Returns the tier object for the given prestige level.
   * @param {number} level
   * @returns {Object}
   */
  function getPrestigeTier(level) {
    var idx = Math.max(0, Math.min(level, PRESTIGE_TIERS.length - 1));
    return PRESTIGE_TIERS[idx];
  }

  /**
   * Returns the rewards for a specific prestige level (1–6).
   * Returns null for level 0 (no rewards yet).
   * @param {number} level
   * @returns {Object|null}
   */
  function getPrestigeRewards(level) {
    return PRESTIGE_REWARDS[level] || null;
  }

  /**
   * Returns cumulative cosmetics and perks across all unlocked prestige levels.
   * @param {Object} prestigeState
   * @returns {{ cosmetics: string[], perks: string[], titles: string[] }}
   */
  function getAllUnlockedRewards(prestigeState) {
    var cosmetics = [];
    var perks = [];
    var titles = [];

    for (var lvl = 1; lvl <= prestigeState.level; lvl++) {
      var rewards = PRESTIGE_REWARDS[lvl];
      if (!rewards) continue;

      for (var ci = 0; ci < rewards.cosmetics.length; ci++) {
        if (cosmetics.indexOf(rewards.cosmetics[ci]) === -1) {
          cosmetics.push(rewards.cosmetics[ci]);
        }
      }
      for (var pi = 0; pi < rewards.perks.length; pi++) {
        if (perks.indexOf(rewards.perks[pi]) === -1) {
          perks.push(rewards.perks[pi]);
        }
      }
      var tier = PRESTIGE_TIERS[lvl];
      if (tier && tier.title && titles.indexOf(tier.title) === -1) {
        titles.push(tier.title);
      }
    }

    return { cosmetics: cosmetics, perks: perks, titles: titles };
  }

  /**
   * Returns the Spark earning multiplier bonus for the given prestige level.
   * @param {number} level
   * @returns {number}
   */
  function getSparkBonus(level) {
    var tier = getPrestigeTier(level);
    return tier.sparkBonus;
  }

  /**
   * Returns the display title for the given prestige level.
   * @param {number} level
   * @returns {string}
   */
  function getPrestigeTitle(level) {
    var tier = getPrestigeTier(level);
    return tier.title;
  }

  /**
   * Returns the hex color for the given prestige level.
   * @param {number} level
   * @returns {string}
   */
  function getPrestigeColor(level) {
    var tier = getPrestigeTier(level);
    return tier.color;
  }

  /**
   * Returns an ASCII badge string for the given prestige level.
   * @param {number} level
   * @returns {string}
   */
  function getPrestigeBadge(level) {
    var idx = Math.max(0, Math.min(level, PRESTIGE_BADGES.length - 1));
    return PRESTIGE_BADGES[idx];
  }

  /**
   * Returns the full ascension history array from state.
   * @param {Object} state
   * @returns {Array}
   */
  function getAscensionHistory(state) {
    return state.history || [];
  }

  /**
   * Returns the total number of playthroughs (ascensions + 1 for current run).
   * @param {Object} state
   * @returns {number}
   */
  function getTotalPlaythroughs(state) {
    return (state.totalAscensions || 0) + 1;
  }

  /**
   * Checks whether a specific cosmetic has been unlocked.
   * @param {Object} state
   * @param {string} cosmeticId
   * @returns {boolean}
   */
  function hasCosmetic(state, cosmeticId) {
    return state.cosmetics.indexOf(cosmeticId) !== -1;
  }

  /**
   * Checks whether a specific perk has been unlocked.
   * @param {Object} state
   * @param {string} perkId
   * @returns {boolean}
   */
  function hasPerk(state, perkId) {
    return state.perks.indexOf(perkId) !== -1;
  }

  /**
   * Returns all active perks with their descriptions.
   * @param {Object} state
   * @returns {Array<{ id: string, label: string, type: string, value: number }>}
   */
  function getActivePerks(state) {
    var result = [];
    for (var pi = 0; pi < state.perks.length; pi++) {
      var perkId = state.perks[pi];
      var desc = PERK_DESCRIPTIONS[perkId];
      if (desc) {
        result.push({
          id: perkId,
          label: desc.label,
          type: desc.type,
          value: desc.value
        });
      } else {
        result.push({ id: perkId, label: perkId, type: 'unknown', value: 0 });
      }
    }
    return result;
  }

  /**
   * Applies prestige bonuses to a base value for a specific action type.
   * Supported actions: 'spark', 'xp', 'craft', 'gather', 'trade', 'travel', 'daily', 'loot'
   * @param {Object} state
   * @param {string} action
   * @param {number} baseValue
   * @returns {number}
   */
  function applyPrestigeBonus(state, action, baseValue) {
    var multiplier = 1.0;
    var hasMasterPerk = state.perks.indexOf('master_all_perks') !== -1;

    for (var pi = 0; pi < state.perks.length; pi++) {
      var perkId = state.perks[pi];
      var desc = PERK_DESCRIPTIONS[perkId];
      if (!desc) continue;

      // Master perk applies all perk types
      if (hasMasterPerk || desc.type === action) {
        if (desc.type === 'spark' && action === 'spark') {
          multiplier += desc.value;
        } else if (desc.type === 'xp' && action === 'xp') {
          multiplier += desc.value;
        } else if (desc.type === 'craft' && action === 'craft') {
          multiplier += desc.value;
        } else if (desc.type === 'gather' && action === 'gather') {
          multiplier += desc.value;
        } else if (desc.type === 'trade' && action === 'trade') {
          multiplier += desc.value;
        } else if (desc.type === 'loot' && action === 'loot') {
          multiplier += desc.value;
        } else if (desc.type === 'daily' && action === 'daily') {
          // daily is multiplicative (double/triple), use max instead of stack
          if (desc.value > multiplier) {
            multiplier = desc.value;
          }
        } else if (desc.type === 'travel' && action === 'travel') {
          if (desc.value !== 1.0) {
            multiplier *= (1.0 - desc.value);
          } else {
            multiplier = 0; // instant travel = 0 cost
          }
        }
      }
    }

    // For travel action, multiplier is a cost multiplier (reduction)
    if (action === 'travel') {
      return Math.max(0, Math.floor(baseValue * multiplier));
    }

    return Math.floor(baseValue * multiplier);
  }

  // ========================================================================
  // FORMATTING
  // ========================================================================

  /**
   * Returns an HTML string showing the prestige overview card.
   * @param {Object} state
   * @returns {string}
   */
  function formatPrestigeCard(state) {
    var tier   = getPrestigeTier(state.level);
    var badge  = getPrestigeBadge(state.level);
    var title  = tier.title ? (' &mdash; ' + tier.title) : '';
    var color  = tier.color;
    var perks  = getActivePerks(state);
    var allRew = getAllUnlockedRewards(state);

    var html = '<div class="prestige-card" style="border-color:' + color + '">';
    html += '<div class="prestige-header" style="color:' + color + '">';
    html += '<span class="prestige-badge">' + badge + '</span> ';
    html += '<span class="prestige-name">' + tier.name + '</span>';
    html += '<span class="prestige-title">' + title + '</span>';
    html += '</div>';

    html += '<div class="prestige-stats">';
    html += '<span>Prestige Level: <strong>' + state.level + '</strong></span> | ';
    html += '<span>Ascensions: <strong>' + state.totalAscensions + '</strong></span> | ';
    html += '<span>Spark Bonus: <strong>+' + (tier.sparkBonus * 100).toFixed(0) + '%</strong></span>';
    html += '</div>';

    if (allRew.cosmetics.length > 0) {
      html += '<div class="prestige-cosmetics">';
      html += '<strong>Cosmetics:</strong> ' + allRew.cosmetics.join(', ');
      html += '</div>';
    }

    if (perks.length > 0) {
      html += '<div class="prestige-perks"><strong>Active Perks:</strong><ul>';
      for (var i = 0; i < perks.length; i++) {
        html += '<li>' + perks[i].label + '</li>';
      }
      html += '</ul></div>';
    }

    html += '</div>';
    return html;
  }

  /**
   * Returns an HTML checklist showing ascension requirements and whether they are met.
   * @param {number} playerLevel
   * @param {number} questsCompleted
   * @param {number} zonesVisited
   * @param {number} spark
   * @returns {string}
   */
  function formatAscensionRequirements(playerLevel, questsCompleted, zonesVisited, spark) {
    function row(label, met) {
      var icon  = met ? '&#10003;' : '&#10007;';
      var color = met ? '#4CAF50' : '#f44336';
      return '<li style="color:' + color + '">' + icon + ' ' + label + '</li>';
    }

    var html = '<div class="ascension-requirements">';
    html += '<h3>Ascension Requirements</h3>';
    html += '<ul>';
    html += row('Level ' + ASCENSION_REQUIRED_LEVEL + ' (current: ' + playerLevel + ')',
                playerLevel >= ASCENSION_REQUIRED_LEVEL);
    html += row(ASCENSION_REQUIRED_QUESTS + ' quests completed (' + questsCompleted + ')',
                questsCompleted >= ASCENSION_REQUIRED_QUESTS);
    html += row('All ' + ASCENSION_REQUIRED_ZONES + ' zones visited (' + zonesVisited + ')',
                zonesVisited >= ASCENSION_REQUIRED_ZONES);
    html += row(ASCENSION_SPARK_COST + ' Spark (have: ' + spark + ')',
                spark >= ASCENSION_SPARK_COST);
    html += '</ul>';
    html += '</div>';
    return html;
  }

  /**
   * Returns a styled HTML badge for the given prestige level.
   * @param {number} level
   * @returns {string}
   */
  function formatPrestigeBadge(level) {
    var tier  = getPrestigeTier(level);
    var badge = getPrestigeBadge(level);
    return '<span class="prestige-badge-pill" style="background:' + tier.color +
      ';color:#000;padding:2px 8px;border-radius:12px;font-weight:bold;">' +
      badge + ' ' + tier.name + '</span>';
  }

  // ========================================================================
  // LEADERBOARD
  // ========================================================================

  /**
   * Returns a leaderboard entry object for a given player.
   * @param {Object} state
   * @param {string} playerName
   * @returns {{ name: string, prestigeLevel: number, totalAscensions: number, title: string }}
   */
  function getLeaderboardEntry(state, playerName) {
    return {
      name: playerName,
      prestigeLevel: state.level,
      totalAscensions: state.totalAscensions,
      title: getPrestigeTitle(state.level)
    };
  }

  // ========================================================================
  // EXPORTS
  // ========================================================================

  exports.PRESTIGE_TIERS          = PRESTIGE_TIERS;
  exports.PRESTIGE_REWARDS        = PRESTIGE_REWARDS;
  exports.PERK_DESCRIPTIONS       = PERK_DESCRIPTIONS;
  exports.ASCENSION_REQUIRED_LEVEL  = ASCENSION_REQUIRED_LEVEL;
  exports.ASCENSION_REQUIRED_QUESTS = ASCENSION_REQUIRED_QUESTS;
  exports.ASCENSION_REQUIRED_ZONES  = ASCENSION_REQUIRED_ZONES;
  exports.ASCENSION_SPARK_COST    = ASCENSION_SPARK_COST;
  exports.MAX_PRESTIGE_LEVEL      = MAX_PRESTIGE_LEVEL;

  exports.createPrestigeState        = createPrestigeState;
  exports.canAscend                  = canAscend;
  exports.ascend                     = ascend;
  exports.getPrestigeTier            = getPrestigeTier;
  exports.getPrestigeRewards         = getPrestigeRewards;
  exports.getAllUnlockedRewards       = getAllUnlockedRewards;
  exports.getSparkBonus              = getSparkBonus;
  exports.getPrestigeTitle           = getPrestigeTitle;
  exports.getPrestigeColor           = getPrestigeColor;
  exports.getPrestigeBadge           = getPrestigeBadge;
  exports.getAscensionHistory        = getAscensionHistory;
  exports.getTotalPlaythroughs       = getTotalPlaythroughs;
  exports.hasCosmetic                = hasCosmetic;
  exports.hasPerk                    = hasPerk;
  exports.getActivePerks             = getActivePerks;
  exports.applyPrestigeBonus         = applyPrestigeBonus;
  exports.formatPrestigeCard         = formatPrestigeCard;
  exports.formatAscensionRequirements = formatAscensionRequirements;
  exports.formatPrestigeBadge        = formatPrestigeBadge;
  exports.getLeaderboardEntry        = getLeaderboardEntry;

})(typeof module !== 'undefined' ? module.exports : (window.Prestige = {}));
