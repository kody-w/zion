// badges.js
/**
 * ZION Achievement Badges & Cosmetics System
 * Visual rewards for achievement unlocks — badges, nameplates, auras, trails
 */

(function(exports) {
  'use strict';

  // ========================================================================
  // BADGE CATALOG
  // ========================================================================
  // Each badge maps to an achievement from quests.js ACHIEVEMENTS
  // Rarities: common, uncommon, rare, epic, legendary
  // Categories: combat, exploration, social, economic, creative, mastery

  var BADGE_CATALOG = {

    // ---- EXPLORATION BADGES ----
    badge_first_steps: {
      id: 'badge_first_steps',
      name: 'First Steps',
      description: 'Entered ZION for the first time',
      icon: '👣',
      rarity: 'common',
      category: 'exploration',
      achievementId: 'first_steps',
      points: 1
    },
    badge_zone_hopper: {
      id: 'badge_zone_hopper',
      name: 'Zone Hopper',
      description: 'Visited 4 different zones of ZION',
      icon: '🚶',
      rarity: 'common',
      category: 'exploration',
      achievementId: 'zone_hopper',
      points: 1
    },
    badge_world_traveler: {
      id: 'badge_world_traveler',
      name: 'World Traveler',
      description: 'Explored all 8 zones of ZION',
      icon: '🌍',
      rarity: 'rare',
      category: 'exploration',
      achievementId: 'world_traveler',
      points: 5
    },
    badge_trailblazer: {
      id: 'badge_trailblazer',
      name: 'Trailblazer',
      description: 'Made 10 discoveries across ZION',
      icon: '🔍',
      rarity: 'uncommon',
      category: 'exploration',
      achievementId: 'trailblazer',
      points: 2
    },
    badge_cartographer: {
      id: 'badge_cartographer',
      name: 'Cartographer',
      description: 'Made 25 discoveries — a true mapmaker',
      icon: '🗺️',
      rarity: 'rare',
      category: 'exploration',
      achievementId: 'cartographer',
      points: 5
    },

    // ---- SOCIAL BADGES ----
    badge_friendly_face: {
      id: 'badge_friendly_face',
      name: 'Friendly Face',
      description: 'Talked to 10 citizens of ZION',
      icon: '😊',
      rarity: 'common',
      category: 'social',
      achievementId: 'friendly_face',
      points: 1
    },
    badge_social_butterfly: {
      id: 'badge_social_butterfly',
      name: 'Social Butterfly',
      description: 'Talked to 50 citizens — a beloved community member',
      icon: '🦋',
      rarity: 'uncommon',
      category: 'social',
      achievementId: 'social_butterfly',
      points: 2
    },
    badge_first_trade: {
      id: 'badge_first_trade',
      name: 'First Trade',
      description: 'Completed a trade with another citizen',
      icon: '🤝',
      rarity: 'common',
      category: 'social',
      achievementId: 'first_trade',
      points: 1
    },
    badge_merchant_prince: {
      id: 'badge_merchant_prince',
      name: 'Merchant Prince',
      description: 'Completed 25 trades — a pillar of commerce',
      icon: '👑',
      rarity: 'epic',
      category: 'social',
      achievementId: 'merchant_prince',
      points: 10
    },
    badge_gift_giver: {
      id: 'badge_gift_giver',
      name: 'Gift Giver',
      description: 'Gifted an item to a fellow citizen',
      icon: '🎁',
      rarity: 'common',
      category: 'social',
      achievementId: 'gift_giver',
      points: 1
    },
    badge_guild_founder: {
      id: 'badge_guild_founder',
      name: 'Guild Founder',
      description: 'Founded a guild in ZION',
      icon: '🏰',
      rarity: 'rare',
      category: 'social',
      achievementId: 'guild_founder',
      points: 5
    },
    badge_guild_member: {
      id: 'badge_guild_member',
      name: 'Guild Member',
      description: 'Joined a guild — strength in unity',
      icon: '🤜',
      rarity: 'common',
      category: 'social',
      achievementId: 'guild_member',
      points: 1
    },

    // ---- ECONOMIC BADGES ----
    badge_spark_saver: {
      id: 'badge_spark_saver',
      name: 'Spark Saver',
      description: 'Accumulated 100 Spark',
      icon: '✨',
      rarity: 'common',
      category: 'economic',
      achievementId: 'spark_saver',
      points: 1
    },
    badge_spark_hoarder: {
      id: 'badge_spark_hoarder',
      name: 'Spark Hoarder',
      description: 'Accumulated 500 Spark — a prosperous citizen',
      icon: '💰',
      rarity: 'uncommon',
      category: 'economic',
      achievementId: 'spark_hoarder',
      points: 2
    },
    badge_spark_magnate: {
      id: 'badge_spark_magnate',
      name: 'Spark Magnate',
      description: 'Accumulated 2000 Spark — an economic powerhouse',
      icon: '💎',
      rarity: 'epic',
      category: 'economic',
      achievementId: 'spark_magnate',
      points: 10
    },

    // ---- CREATIVE BADGES ----
    badge_first_craft: {
      id: 'badge_first_craft',
      name: 'First Craft',
      description: 'Crafted your first item',
      icon: '🔨',
      rarity: 'common',
      category: 'creative',
      achievementId: 'first_craft',
      points: 1
    },
    badge_apprentice_crafter: {
      id: 'badge_apprentice_crafter',
      name: 'Apprentice Crafter',
      description: 'Crafted 10 items — a skilled hand emerges',
      icon: '⚒️',
      rarity: 'uncommon',
      category: 'creative',
      achievementId: 'apprentice_crafter',
      points: 2
    },
    badge_master_crafter: {
      id: 'badge_master_crafter',
      name: 'Master Crafter',
      description: 'Crafted 50 items — the forge is your home',
      icon: '🛠️',
      rarity: 'rare',
      category: 'creative',
      achievementId: 'master_crafter',
      points: 5
    },
    badge_potion_brewer: {
      id: 'badge_potion_brewer',
      name: 'Potion Brewer',
      description: 'Brewed 10 potions — alchemy mastered',
      icon: '🧪',
      rarity: 'uncommon',
      category: 'creative',
      achievementId: 'potion_brewer',
      points: 2
    },
    badge_instrument_maker: {
      id: 'badge_instrument_maker',
      name: 'Instrument Maker',
      description: 'Crafted a musical instrument — music fills the air',
      icon: '🎵',
      rarity: 'uncommon',
      category: 'creative',
      achievementId: 'instrument_maker',
      points: 2
    },
    badge_first_build: {
      id: 'badge_first_build',
      name: 'First Build',
      description: 'Placed your first structure in ZION',
      icon: '🏗️',
      rarity: 'common',
      category: 'creative',
      achievementId: 'first_build',
      points: 1
    },
    badge_architect: {
      id: 'badge_architect',
      name: 'Architect',
      description: 'Placed 10 structures — shaping the world',
      icon: '🏛️',
      rarity: 'uncommon',
      category: 'creative',
      achievementId: 'architect',
      points: 2
    },
    badge_city_planner: {
      id: 'badge_city_planner',
      name: 'City Planner',
      description: 'Placed 50 structures — an urban visionary',
      icon: '🏙️',
      rarity: 'epic',
      category: 'creative',
      achievementId: 'city_planner',
      points: 10
    },
    badge_green_thumb: {
      id: 'badge_green_thumb',
      name: 'Green Thumb',
      description: 'Planted your first seed',
      icon: '🌱',
      rarity: 'common',
      category: 'creative',
      achievementId: 'green_thumb',
      points: 1
    },
    badge_gardener: {
      id: 'badge_gardener',
      name: 'Gardener',
      description: 'Harvested 20 plants — the Gardens bloom for you',
      icon: '🌻',
      rarity: 'uncommon',
      category: 'creative',
      achievementId: 'gardener',
      points: 2
    },
    badge_botanist: {
      id: 'badge_botanist',
      name: 'Botanist',
      description: 'Harvested 100 plants — ZION\'s foremost naturalist',
      icon: '🌿',
      rarity: 'rare',
      category: 'creative',
      achievementId: 'botanist',
      points: 5
    },
    badge_first_artwork: {
      id: 'badge_first_artwork',
      name: 'First Artwork',
      description: 'Created your first artwork',
      icon: '🎨',
      rarity: 'common',
      category: 'creative',
      achievementId: 'first_artwork',
      points: 1
    },
    badge_prolific_artist: {
      id: 'badge_prolific_artist',
      name: 'Prolific Artist',
      description: 'Created 10 artworks — a true visionary',
      icon: '🖼️',
      rarity: 'rare',
      category: 'creative',
      achievementId: 'prolific_artist',
      points: 5
    },

    // ---- COMBAT BADGES ----
    badge_first_challenge: {
      id: 'badge_first_challenge',
      name: 'First Challenge',
      description: 'Participated in your first competition',
      icon: '⚔️',
      rarity: 'common',
      category: 'combat',
      achievementId: 'first_challenge',
      points: 1
    },
    badge_champion: {
      id: 'badge_champion',
      name: 'Champion',
      description: 'Won 5 competitions — glory to the victor',
      icon: '🏆',
      rarity: 'epic',
      category: 'combat',
      achievementId: 'champion',
      points: 10
    },

    // ---- MASTERY BADGES ----
    badge_quest_starter: {
      id: 'badge_quest_starter',
      name: 'Quest Starter',
      description: 'Accepted your first quest',
      icon: '📋',
      rarity: 'common',
      category: 'mastery',
      achievementId: 'quest_starter',
      points: 1
    },
    badge_questmaster: {
      id: 'badge_questmaster',
      name: 'Questmaster',
      description: 'Completed 10 quests — a seasoned adventurer',
      icon: '📜',
      rarity: 'uncommon',
      category: 'mastery',
      achievementId: 'questmaster',
      points: 2
    },
    badge_completionist: {
      id: 'badge_completionist',
      name: 'Completionist',
      description: 'Completed 25 quests — nothing left undone',
      icon: '⭐',
      rarity: 'legendary',
      category: 'mastery',
      achievementId: 'completionist',
      points: 25
    },
    badge_chain_finisher: {
      id: 'badge_chain_finisher',
      name: 'Chain Finisher',
      description: 'Completed an entire quest chain',
      icon: '🔗',
      rarity: 'rare',
      category: 'mastery',
      achievementId: 'chain_finisher',
      points: 5
    },
    badge_sunwalker: {
      id: 'badge_sunwalker',
      name: 'Sunwalker',
      description: 'Reached the Sunwalker warmth tier — radiant and warm',
      icon: '☀️',
      rarity: 'legendary',
      category: 'mastery',
      achievementId: 'sunwalker',
      points: 25
    },
    badge_first_lesson: {
      id: 'badge_first_lesson',
      name: 'First Lesson',
      description: 'Completed a mentoring lesson',
      icon: '📚',
      rarity: 'common',
      category: 'mastery',
      achievementId: 'first_lesson',
      points: 1
    },
    badge_wise_mentor: {
      id: 'badge_wise_mentor',
      name: 'Wise Mentor',
      description: 'Mentored 5 players — wisdom shared is wisdom multiplied',
      icon: '🎓',
      rarity: 'epic',
      category: 'mastery',
      achievementId: 'wise_mentor',
      points: 10
    }
  };

  // ========================================================================
  // COSMETIC REWARDS
  // Keyed by badgeId → cosmetic data
  // Types: name_color, trail_effect, aura_effect
  // ========================================================================

  var COSMETIC_REWARDS = {
    // Exploration cosmetics
    badge_world_traveler: {
      type: 'name_color',
      value: '#4a90e2',
      label: 'Traveler Blue',
      description: 'Your name glows in explorer blue'
    },
    badge_cartographer: {
      type: 'trail_effect',
      value: 'map_dots',
      label: 'Cartographer Trail',
      description: 'Leave a trail of glowing map dots as you walk'
    },

    // Social cosmetics
    badge_merchant_prince: {
      type: 'name_color',
      value: '#f5a623',
      label: 'Merchant Gold',
      description: 'Your name shimmers in merchant gold'
    },
    badge_social_butterfly: {
      type: 'aura_effect',
      value: 'butterfly_wings',
      label: 'Butterfly Aura',
      description: 'Glowing butterfly wings flutter around you'
    },

    // Economic cosmetics
    badge_spark_magnate: {
      type: 'aura_effect',
      value: 'spark_aura',
      label: 'Spark Aura',
      description: 'Sparks swirl around your form'
    },
    badge_spark_hoarder: {
      type: 'trail_effect',
      value: 'coin_trail',
      label: 'Coin Trail',
      description: 'Leave a trail of gleaming coins'
    },

    // Creative cosmetics
    badge_master_crafter: {
      type: 'aura_effect',
      value: 'forge_glow',
      label: 'Forge Glow',
      description: 'An orange forge-light aura surrounds you'
    },
    badge_city_planner: {
      type: 'name_color',
      value: '#7ed321',
      label: 'Builder Green',
      description: 'Your name gleams in architect green'
    },
    badge_botanist: {
      type: 'trail_effect',
      value: 'petal_trail',
      label: 'Petal Trail',
      description: 'Flower petals drift behind you as you walk'
    },
    badge_prolific_artist: {
      type: 'aura_effect',
      value: 'paint_splash',
      label: 'Artist Aura',
      description: 'Colorful paint splashes swirl around you'
    },

    // Combat cosmetics
    badge_champion: {
      type: 'name_color',
      value: '#e74c3c',
      label: 'Champion Red',
      description: 'Your name blazes in champion crimson'
    },
    badge_first_challenge: {
      type: 'trail_effect',
      value: 'arena_sparks',
      label: 'Arena Sparks',
      description: 'Sparks fly from your footsteps'
    },

    // Mastery cosmetics
    badge_completionist: {
      type: 'aura_effect',
      value: 'star_burst',
      label: 'Star Burst Aura',
      description: 'Golden stars radiate from your body'
    },
    badge_sunwalker: {
      type: 'aura_effect',
      value: 'solar_halo',
      label: 'Solar Halo',
      description: 'A blazing solar halo crowns your head'
    },
    badge_wise_mentor: {
      type: 'name_color',
      value: '#9b59b6',
      label: 'Mentor Purple',
      description: 'Your name glows in wise mentor purple'
    },
    badge_questmaster: {
      type: 'trail_effect',
      value: 'scroll_trail',
      label: 'Scroll Trail',
      description: 'Ancient scrolls flutter in your wake'
    }
  };

  // ========================================================================
  // RARITY CONFIG
  // ========================================================================

  var RARITY_CONFIG = {
    common:    { color: '#9e9e9e', label: 'Common',    points: 1  },
    uncommon:  { color: '#4caf50', label: 'Uncommon',  points: 2  },
    rare:      { color: '#2196f3', label: 'Rare',      points: 5  },
    epic:      { color: '#9c27b0', label: 'Epic',      points: 10 },
    legendary: { color: '#ff9800', label: 'Legendary', points: 25 }
  };

  // ========================================================================
  // COLLECTOR TIERS
  // ========================================================================

  var COLLECTOR_TIERS = [
    { minPoints: 0,   level: 0, title: 'Newcomer',     color: '#9e9e9e' },
    { minPoints: 5,   level: 1, title: 'Collector',    color: '#4caf50' },
    { minPoints: 15,  level: 2, title: 'Enthusiast',   color: '#2196f3' },
    { minPoints: 35,  level: 3, title: 'Connoisseur',  color: '#9c27b0' },
    { minPoints: 75,  level: 4, title: 'Curator',      color: '#ff9800' },
    { minPoints: 150, level: 5, title: 'Archivist',    color: '#f44336' },
    { minPoints: 300, level: 6, title: 'Legendary Collector', color: '#ffd700' }
  ];

  // ========================================================================
  // PLAYER DISPLAY BADGE STORAGE (in-memory, per session)
  // ========================================================================

  var playerDisplayBadges = {}; // playerId -> badgeId

  // ========================================================================
  // PUBLIC API
  // ========================================================================

  /**
   * Get all badges earned by a player based on their unlocked achievements.
   * @param {string} playerId
   * @param {Array|Set} achievements - array of achievement IDs or Set of IDs
   * @returns {Array} earned badge objects (with unlocked: true)
   */
  function getBadgesForPlayer(playerId, achievements) {
    var unlockedSet;
    if (achievements instanceof Set) {
      unlockedSet = achievements;
    } else if (Array.isArray(achievements)) {
      unlockedSet = new Set(achievements);
    } else {
      unlockedSet = new Set();
    }

    var earned = [];
    for (var badgeId in BADGE_CATALOG) {
      var badge = BADGE_CATALOG[badgeId];
      if (unlockedSet.has(badge.achievementId)) {
        earned.push(_withMeta(badge, true));
      }
    }
    return earned;
  }

  /**
   * Get all unlocked badges from an achievement progress object.
   * @param {Object} achievementProgress - { unlocked: Set|Array, ... }
   * @returns {Array} unlocked badge objects
   */
  function getUnlockedBadges(achievementProgress) {
    var unlockedIds;
    if (!achievementProgress) {
      return [];
    }
    if (achievementProgress.unlocked instanceof Set) {
      unlockedIds = achievementProgress.unlocked;
    } else if (Array.isArray(achievementProgress.unlocked)) {
      unlockedIds = new Set(achievementProgress.unlocked);
    } else {
      unlockedIds = new Set();
    }

    var result = [];
    for (var badgeId in BADGE_CATALOG) {
      var badge = BADGE_CATALOG[badgeId];
      if (unlockedIds.has(badge.achievementId)) {
        result.push(_withMeta(badge, true));
      }
    }
    return result;
  }

  /**
   * Get all locked badges with progress percentage.
   * @param {Object} achievementProgress - { unlocked: Set|Array, counters: {} }
   * @returns {Array} locked badge objects with progressPct field
   */
  function getLockedBadges(achievementProgress) {
    var unlockedIds;
    if (!achievementProgress) {
      return Object.keys(BADGE_CATALOG).map(function(id) {
        return _withMeta(BADGE_CATALOG[id], false, 0);
      });
    }
    if (achievementProgress.unlocked instanceof Set) {
      unlockedIds = achievementProgress.unlocked;
    } else if (Array.isArray(achievementProgress.unlocked)) {
      unlockedIds = new Set(achievementProgress.unlocked);
    } else {
      unlockedIds = new Set();
    }

    var result = [];
    for (var badgeId in BADGE_CATALOG) {
      var badge = BADGE_CATALOG[badgeId];
      if (!unlockedIds.has(badge.achievementId)) {
        var pct = _computeProgress(badge.achievementId, achievementProgress.counters || {});
        result.push(_withMeta(badge, false, pct));
      }
    }
    return result;
  }

  /**
   * Filter badges by category.
   * @param {string} category - one of: combat, exploration, social, economic, creative, mastery
   * @returns {Array} badges in that category
   */
  function getBadgesByCategory(category) {
    var result = [];
    for (var badgeId in BADGE_CATALOG) {
      var badge = BADGE_CATALOG[badgeId];
      if (badge.category === category) {
        result.push(_withMeta(badge, false));
      }
    }
    return result;
  }

  /**
   * Filter badges by rarity.
   * @param {string} rarity - one of: common, uncommon, rare, epic, legendary
   * @returns {Array} badges of that rarity
   */
  function getBadgesByRarity(rarity) {
    var result = [];
    for (var badgeId in BADGE_CATALOG) {
      var badge = BADGE_CATALOG[badgeId];
      if (badge.rarity === rarity) {
        result.push(_withMeta(badge, false));
      }
    }
    return result;
  }

  /**
   * Get the player's selected showcase/display badge.
   * @param {string} playerId
   * @returns {Object|null} badge object or null if none selected
   */
  function getDisplayBadge(playerId) {
    var badgeId = playerDisplayBadges[playerId];
    if (!badgeId || !BADGE_CATALOG[badgeId]) {
      return null;
    }
    return _withMeta(BADGE_CATALOG[badgeId], true);
  }

  /**
   * Set player's showcase display badge.
   * @param {string} playerId
   * @param {string} badgeId - must be a valid badge id
   * @returns {Object} { success: boolean, message: string }
   */
  function setDisplayBadge(playerId, badgeId) {
    if (!badgeId) {
      delete playerDisplayBadges[playerId];
      return { success: true, message: 'Display badge cleared' };
    }
    if (!BADGE_CATALOG[badgeId]) {
      return { success: false, message: 'Unknown badge: ' + badgeId };
    }
    playerDisplayBadges[playerId] = badgeId;
    return { success: true, message: 'Display badge set to ' + BADGE_CATALOG[badgeId].name };
  }

  /**
   * Get nameplate decoration data for a player based on their badges.
   * @param {string} playerId
   * @param {Array} badges - array of earned badge objects
   * @returns {Object} decoration: { borderColor, glowColor, icon, title }
   */
  function getNameplateDecoration(playerId, badges) {
    if (!badges || badges.length === 0) {
      return { borderColor: '#9e9e9e', glowColor: null, icon: null, title: null };
    }

    // Find highest rarity badge
    var rarityOrder = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
    var topBadge = null;
    for (var ri = 0; ri < rarityOrder.length; ri++) {
      for (var bi = 0; bi < badges.length; bi++) {
        if (badges[bi].rarity === rarityOrder[ri]) {
          topBadge = badges[bi];
          break;
        }
      }
      if (topBadge) break;
    }

    // Check for display badge override
    var displayBadgeId = playerDisplayBadges[playerId];
    if (displayBadgeId && BADGE_CATALOG[displayBadgeId]) {
      topBadge = BADGE_CATALOG[displayBadgeId];
    }

    var rarityColor = getBadgeRarityColor(topBadge.rarity);

    return {
      borderColor: rarityColor,
      glowColor: topBadge.rarity === 'legendary' || topBadge.rarity === 'epic' ? rarityColor : null,
      icon: topBadge.icon,
      title: topBadge.name
    };
  }

  /**
   * Get the cosmetic reward for a specific badge.
   * @param {string} badgeId
   * @returns {Object|null} cosmetic object or null
   */
  function getCosmeticForBadge(badgeId) {
    return COSMETIC_REWARDS[badgeId] || null;
  }

  /**
   * Get all cosmetics unlocked by a player's badges.
   * @param {string} playerId
   * @param {Array} unlockedBadges - array of unlocked badge objects
   * @returns {Array} cosmetic objects with badgeId reference
   */
  function getPlayerCosmetics(playerId, unlockedBadges) {
    if (!unlockedBadges || unlockedBadges.length === 0) return [];
    var cosmetics = [];
    for (var i = 0; i < unlockedBadges.length; i++) {
      var badge = unlockedBadges[i];
      var cosmetic = COSMETIC_REWARDS[badge.id];
      if (cosmetic) {
        cosmetics.push({
          badgeId: badge.id,
          badgeName: badge.name,
          type: cosmetic.type,
          value: cosmetic.value,
          label: cosmetic.label,
          description: cosmetic.description
        });
      }
    }
    return cosmetics;
  }

  /**
   * Get the color string for a rarity tier.
   * @param {string} rarity
   * @returns {string} hex color
   */
  function getBadgeRarityColor(rarity) {
    var config = RARITY_CONFIG[rarity];
    return config ? config.color : '#9e9e9e';
  }

  /**
   * Format a badge for HUD display.
   * @param {Object} badge
   * @returns {string} formatted string
   */
  function formatBadgeDisplay(badge) {
    if (!badge) return '';
    var rarityConfig = RARITY_CONFIG[badge.rarity] || RARITY_CONFIG.common;
    return '[' + rarityConfig.label.toUpperCase() + '] ' + badge.icon + ' ' + badge.name + ' — ' + badge.description;
  }

  /**
   * Calculate total badge points from a list of badges.
   * @param {Array} badges - array of badge objects
   * @returns {number} total points
   */
  function getTotalBadgePoints(badges) {
    if (!badges || badges.length === 0) return 0;
    var total = 0;
    for (var i = 0; i < badges.length; i++) {
      var badge = badges[i];
      var rarity = badge.rarity || 'common';
      var config = RARITY_CONFIG[rarity];
      total += config ? config.points : 1;
    }
    return total;
  }

  /**
   * Get collector level/tier from total badge points.
   * @param {number} points
   * @returns {Object} { level, title, color, minPoints, nextThreshold }
   */
  function getCollectorLevel(points) {
    var tier = COLLECTOR_TIERS[0];
    for (var i = COLLECTOR_TIERS.length - 1; i >= 0; i--) {
      if (points >= COLLECTOR_TIERS[i].minPoints) {
        tier = COLLECTOR_TIERS[i];
        break;
      }
    }
    var nextTier = null;
    for (var j = 0; j < COLLECTOR_TIERS.length; j++) {
      if (COLLECTOR_TIERS[j].minPoints > points) {
        nextTier = COLLECTOR_TIERS[j];
        break;
      }
    }
    return {
      level: tier.level,
      title: tier.title,
      color: tier.color,
      minPoints: tier.minPoints,
      nextThreshold: nextTier ? nextTier.minPoints : null,
      pointsToNext: nextTier ? nextTier.minPoints - points : 0
    };
  }

  // ========================================================================
  // PRIVATE HELPERS
  // ========================================================================

  function _withMeta(badge, unlocked, progressPct) {
    return {
      id: badge.id,
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      rarity: badge.rarity,
      category: badge.category,
      achievementId: badge.achievementId,
      points: badge.points,
      unlocked: unlocked === true,
      progressPct: progressPct !== undefined ? progressPct : (unlocked ? 100 : 0)
    };
  }

  /**
   * Estimate progress percentage toward an achievement based on counters.
   * @param {string} achievementId
   * @param {Object} counters
   * @returns {number} 0-99 (never 100, that means unlocked)
   */
  function _computeProgress(achievementId, counters) {
    var pct = 0;
    switch (achievementId) {
      case 'zone_hopper':
        pct = Math.min(99, Math.round(((counters.zones_visited || 0) / 4) * 100));
        break;
      case 'world_traveler':
        pct = Math.min(99, Math.round(((counters.zones_visited || 0) / 8) * 100));
        break;
      case 'trailblazer':
        pct = Math.min(99, Math.round(((counters.discoveries_made || 0) / 10) * 100));
        break;
      case 'cartographer':
        pct = Math.min(99, Math.round(((counters.discoveries_made || 0) / 25) * 100));
        break;
      case 'friendly_face':
        pct = Math.min(99, Math.round(((counters.npcs_talked || 0) / 10) * 100));
        break;
      case 'social_butterfly':
        pct = Math.min(99, Math.round(((counters.npcs_talked || 0) / 50) * 100));
        break;
      case 'merchant_prince':
        pct = Math.min(99, Math.round(((counters.trades_completed || 0) / 25) * 100));
        break;
      case 'apprentice_crafter':
        pct = Math.min(99, Math.round(((counters.items_crafted || 0) / 10) * 100));
        break;
      case 'master_crafter':
        pct = Math.min(99, Math.round(((counters.items_crafted || 0) / 50) * 100));
        break;
      case 'potion_brewer':
        pct = Math.min(99, Math.round(((counters.potions_brewed || 0) / 10) * 100));
        break;
      case 'architect':
        pct = Math.min(99, Math.round(((counters.structures_placed || 0) / 10) * 100));
        break;
      case 'city_planner':
        pct = Math.min(99, Math.round(((counters.structures_placed || 0) / 50) * 100));
        break;
      case 'gardener':
        pct = Math.min(99, Math.round(((counters.plants_harvested || 0) / 20) * 100));
        break;
      case 'botanist':
        pct = Math.min(99, Math.round(((counters.plants_harvested || 0) / 100) * 100));
        break;
      case 'champion':
        pct = Math.min(99, Math.round(((counters.competitions_won || 0) / 5) * 100));
        break;
      case 'questmaster':
        pct = Math.min(99, Math.round(((counters.quests_completed || 0) / 10) * 100));
        break;
      case 'completionist':
        pct = Math.min(99, Math.round(((counters.quests_completed || 0) / 25) * 100));
        break;
      case 'prolific_artist':
        pct = Math.min(99, Math.round(((counters.artworks_created || 0) / 10) * 100));
        break;
      case 'wise_mentor':
        pct = Math.min(99, Math.round(((counters.players_mentored || 0) / 5) * 100));
        break;
      default:
        pct = 0;
        break;
    }
    return pct;
  }

  // ========================================================================
  // EXPORTS
  // ========================================================================

  exports.BADGE_CATALOG = BADGE_CATALOG;
  exports.COSMETIC_REWARDS = COSMETIC_REWARDS;
  exports.RARITY_CONFIG = RARITY_CONFIG;
  exports.COLLECTOR_TIERS = COLLECTOR_TIERS;
  exports.getBadgesForPlayer = getBadgesForPlayer;
  exports.getUnlockedBadges = getUnlockedBadges;
  exports.getLockedBadges = getLockedBadges;
  exports.getBadgesByCategory = getBadgesByCategory;
  exports.getBadgesByRarity = getBadgesByRarity;
  exports.getDisplayBadge = getDisplayBadge;
  exports.setDisplayBadge = setDisplayBadge;
  exports.getNameplateDecoration = getNameplateDecoration;
  exports.getCosmeticForBadge = getCosmeticForBadge;
  exports.getPlayerCosmetics = getPlayerCosmetics;
  exports.getBadgeRarityColor = getBadgeRarityColor;
  exports.formatBadgeDisplay = formatBadgeDisplay;
  exports.getTotalBadgePoints = getTotalBadgePoints;
  exports.getCollectorLevel = getCollectorLevel;

})(typeof module !== 'undefined' ? module.exports : (window.Badges = {}));
