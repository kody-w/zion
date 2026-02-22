// battle_pass.js
/**
 * ZION Battle Pass System
 * Seasonal progression track with 40 tiers unlocked by XP from any activity.
 * Free and premium tracks with cosmetics, Spark, pets, and exclusive rewards.
 * Depends on: economy.js (Spark balance), state.js (player state)
 */

(function(exports) {
  'use strict';

  // =========================================================================
  // CONSTANTS
  // =========================================================================

  var VALID_REWARD_TYPES = [
    'spark', 'cosmetic', 'pet_skin', 'title', 'emote',
    'name_color', 'aura', 'xp_boost', 'craft_materials', 'loot_box'
  ];

  var TOTAL_TIERS = 40;

  // =========================================================================
  // SEASON DEFINITIONS
  // =========================================================================

  var SEASONS = {
    season_1_spring: {
      id: 'season_1_spring',
      name: 'Season 1: Awakening',
      theme: 'spring',
      startTick: 0,
      duration: 20160, // 4 weeks * 7 days * 720 ticks/day
      tiers: 40,
      xpPerTier: 50,
      premiumCost: 100 // Spark to unlock premium track
    },
    season_2_summer: {
      id: 'season_2_summer',
      name: 'Season 2: Blazing Skies',
      theme: 'summer',
      startTick: 20160,
      duration: 20160,
      tiers: 40,
      xpPerTier: 50,
      premiumCost: 100
    },
    season_3_autumn: {
      id: 'season_3_autumn',
      name: 'Season 3: Harvest Moon',
      theme: 'autumn',
      startTick: 40320,
      duration: 20160,
      tiers: 40,
      xpPerTier: 50,
      premiumCost: 100
    },
    season_4_winter: {
      id: 'season_4_winter',
      name: 'Season 4: Eternal Frost',
      theme: 'winter',
      startTick: 60480,
      duration: 20160,
      tiers: 40,
      xpPerTier: 50,
      premiumCost: 100
    }
  };

  // =========================================================================
  // TIER REWARDS
  // =========================================================================

  /**
   * Generates 40 tiers of free track rewards.
   * Pattern: Spark on odd tiers, XP boosts at 5/15/25/35, milestone cosmetics at 10/20/30/40
   */
  function buildFreeTrack() {
    var rewards = [];
    for (var i = 1; i <= 40; i++) {
      var reward;
      if (i === 10) {
        reward = { type: 'cosmetic', id: 'free_milestone_outfit', name: 'Milestone Outfit' };
      } else if (i === 20) {
        reward = { type: 'cosmetic', id: 'free_milestone_cloak', name: 'Milestone Cloak' };
      } else if (i === 30) {
        reward = { type: 'cosmetic', id: 'free_milestone_helm', name: 'Milestone Helm' };
      } else if (i === 40) {
        reward = { type: 'cosmetic', id: 'free_milestone_wings', name: 'Milestone Wings' };
      } else if (i === 5 || i === 15 || i === 25 || i === 35) {
        reward = { type: 'xp_boost', id: 'xp_boost_small', name: 'XP Boost (1.25x, 1hr)', multiplier: 1.25, duration: 720 };
      } else if (i % 2 === 1) {
        // Odd tiers (excluding milestone-adjacent handled above): Spark
        reward = { type: 'spark', amount: 10 + Math.floor(i / 10) * 5 };
      } else {
        // Even tiers: craft_materials
        reward = { type: 'craft_materials', id: 'bundle_basic', name: 'Basic Material Bundle', quantity: 5 };
      }
      rewards.push(reward);
    }
    return rewards;
  }

  /**
   * Generates 40 tiers of premium track rewards.
   * Richer: exclusive cosmetics every tier, titles at 10/20/30/40, aura at 25, pet_skin at 35, legendary at 40
   */
  function buildPremiumTrack() {
    var rewards = [];
    var cosmetics = [
      'spring_cap', 'flower_bracelet', 'vine_belt', 'petal_shoes', 'blossom_gloves',
      'dawn_scarf', 'morning_ring', 'dew_pendant', 'sunbeam_earrings', 'forest_crown',
      'meadow_cloak', 'leaf_pauldrons', 'stream_boots', 'pollen_mantle', 'bee_charm',
      'butterfly_wings', 'sky_sash', 'cloud_hood', 'rainbow_stole', 'garden_veil',
      'zephyr_coat', 'bloom_aegis', 'flora_gauntlets', 'terra_greaves', 'mossy_crown',
      'thorned_bracers', 'thornwood_belt', 'bark_cloak', 'root_boots', 'wildwood_mask',
      'gale_wings', 'twilight_cape', 'ember_sash', 'mist_veil', 'nature_amulet',
      'dusk_ring', 'starfall_pendant', 'comet_earrings', 'aurora_halo', 'genesis_suit'
    ];

    for (var i = 1; i <= 40; i++) {
      var reward;
      if (i === 40) {
        reward = { type: 'cosmetic', id: 'legendary_genesis_suit', name: 'Legendary Genesis Suit', rarity: 'legendary' };
      } else if (i === 35) {
        reward = { type: 'pet_skin', id: 'spring_spirit_pup', name: 'Spring Spirit Pup', rarity: 'exclusive' };
      } else if (i === 30) {
        reward = { type: 'title', id: 'title_champion_of_spring', name: 'Champion of Spring' };
      } else if (i === 25) {
        reward = { type: 'aura', id: 'aura_blooming_light', name: 'Blooming Light Aura', rarity: 'exclusive' };
      } else if (i === 20) {
        reward = { type: 'title', id: 'title_awakened_soul', name: 'Awakened Soul' };
      } else if (i === 10) {
        reward = { type: 'title', id: 'title_herald_of_spring', name: 'Herald of Spring' };
      } else {
        var idx = i - 1;
        var cosmeticId = cosmetics[idx] || ('cosmetic_tier_' + i);
        reward = {
          type: 'cosmetic',
          id: 'prem_' + cosmeticId,
          name: cosmeticId.split('_').map(function(w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ')
        };
      }
      rewards.push(reward);
    }
    return rewards;
  }

  var FREE_TRACK = buildFreeTrack();
  var PREMIUM_TRACK = buildPremiumTrack();

  /**
   * Build TIER_REWARDS: array of {tier, free, premium} for tiers 1-40
   */
  var TIER_REWARDS = (function() {
    var tiers = [];
    for (var i = 0; i < 40; i++) {
      tiers.push({
        tier: i + 1,
        free: FREE_TRACK[i],
        premium: PREMIUM_TRACK[i]
      });
    }
    return tiers;
  })();

  // =========================================================================
  // STATE HELPERS
  // =========================================================================

  function ensureSeasons(state) {
    if (!state.battlePass) {
      state.battlePass = {};
    }
    if (!state.battlePass.seasons) {
      state.battlePass.seasons = {};
    }
    if (!state.battlePass.players) {
      state.battlePass.players = {};
    }
    return state;
  }

  function ensurePlayerPass(state, playerId) {
    ensureSeasons(state);
    if (!state.battlePass.players[playerId]) {
      state.battlePass.players[playerId] = {};
    }
    return state;
  }

  function getSeasonDef(seasonId) {
    return SEASONS[seasonId] || null;
  }

  function getPlayerPassState(state, playerId, seasonId) {
    ensurePlayerPass(state, playerId);
    return state.battlePass.players[playerId][seasonId] || null;
  }

  function getSparkBalance(state, playerId) {
    if (state.players && state.players[playerId] && typeof state.players[playerId].spark === 'number') {
      return state.players[playerId].spark;
    }
    if (state.economy && state.economy.balances && typeof state.economy.balances[playerId] === 'number') {
      return state.economy.balances[playerId];
    }
    return 0;
  }

  function deductSpark(state, playerId, amount) {
    if (state.players && state.players[playerId] && typeof state.players[playerId].spark === 'number') {
      state.players[playerId].spark -= amount;
      return true;
    }
    if (state.economy && state.economy.balances && typeof state.economy.balances[playerId] === 'number') {
      state.economy.balances[playerId] -= amount;
      return true;
    }
    // Create player spark balance if missing
    if (!state.players) { state.players = {}; }
    if (!state.players[playerId]) { state.players[playerId] = { spark: 0 }; }
    state.players[playerId].spark -= amount;
    return true;
  }

  // =========================================================================
  // SEASON MANAGEMENT
  // =========================================================================

  /**
   * Initialize a new season in state.
   * @param {Object} state - World state
   * @param {string} seasonId - Season identifier
   * @returns {Object} Updated state
   */
  function initSeason(state, seasonId) {
    ensureSeasons(state);
    var def = getSeasonDef(seasonId);
    if (!def) {
      return state;
    }
    state.battlePass.seasons[seasonId] = {
      id: seasonId,
      name: def.name,
      theme: def.theme,
      startTick: def.startTick,
      duration: def.duration,
      tiers: def.tiers,
      xpPerTier: def.xpPerTier,
      premiumCost: def.premiumCost,
      active: true,
      ended: false
    };
    return state;
  }

  /**
   * Initialize player's battle pass for a season.
   * @param {Object} state - World state
   * @param {string} playerId - Player identifier
   * @param {string} seasonId - Season identifier
   * @returns {Object} Updated state
   */
  function initPlayerPass(state, playerId, seasonId) {
    ensurePlayerPass(state, playerId);
    if (!state.battlePass.players[playerId][seasonId]) {
      state.battlePass.players[playerId][seasonId] = {
        playerId: playerId,
        seasonId: seasonId,
        currentTier: 0,
        currentXP: 0,
        totalXPEarned: 0,
        hasPremium: false,
        claimedFree: [],
        claimedPremium: [],
        xpSources: {}
      };
    }
    return state;
  }

  // =========================================================================
  // XP AND TIER PROGRESSION
  // =========================================================================

  /**
   * Add XP to player's battle pass and check for tier advancement.
   * @param {Object} state - World state
   * @param {string} playerId - Player identifier
   * @param {number} amount - XP to add
   * @param {string} source - Source activity label
   * @returns {Object} {success, xpAdded, previousTier, currentTier, tiersGained, newRewards}
   */
  function addXP(state, playerId, amount, source) {
    ensurePlayerPass(state, playerId);

    // Find active season for player if no explicit season context
    // We need to find which season the player is in
    var playerSeasons = state.battlePass.players[playerId];
    var activeSeason = null;
    var activeSeasonId = null;
    for (var sid in playerSeasons) {
      var ps = playerSeasons[sid];
      if (ps && ps.seasonId) {
        var seasonState = state.battlePass.seasons && state.battlePass.seasons[sid];
        if (seasonState && !seasonState.ended) {
          activeSeason = ps;
          activeSeasonId = sid;
          break;
        }
      }
    }

    if (!activeSeason) {
      return { success: false, xpAdded: 0, previousTier: 0, currentTier: 0, tiersGained: 0, newRewards: [], reason: 'no_active_season' };
    }

    return addXPToSeason(state, playerId, activeSeasonId, amount, source);
  }

  /**
   * Add XP to a specific season's battle pass.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} seasonId
   * @param {number} amount
   * @param {string} source
   * @returns {Object}
   */
  function addXPToSeason(state, playerId, seasonId, amount, source) {
    ensurePlayerPass(state, playerId);

    var seasonState = state.battlePass.seasons && state.battlePass.seasons[seasonId];
    if (seasonState && seasonState.ended) {
      return { success: false, xpAdded: 0, previousTier: 0, currentTier: 0, tiersGained: 0, newRewards: [], reason: 'season_ended' };
    }

    var pass = state.battlePass.players[playerId][seasonId];
    if (!pass) {
      return { success: false, xpAdded: 0, previousTier: 0, currentTier: 0, tiersGained: 0, newRewards: [], reason: 'not_initialized' };
    }

    var def = getSeasonDef(seasonId) || (seasonState ? { xpPerTier: seasonState.xpPerTier, tiers: seasonState.tiers } : null);
    if (!def) {
      return { success: false, xpAdded: 0, previousTier: 0, currentTier: 0, tiersGained: 0, newRewards: [], reason: 'invalid_season' };
    }

    var xpPerTier = def.xpPerTier || 50;
    var maxTiers = def.tiers || 40;

    var previousTier = pass.currentTier;
    var xpAdded = Math.max(0, amount);

    pass.currentXP += xpAdded;
    pass.totalXPEarned += xpAdded;

    // Track source
    var src = source || 'unknown';
    if (!pass.xpSources[src]) {
      pass.xpSources[src] = 0;
    }
    pass.xpSources[src] += xpAdded;

    // Advance tiers
    var newRewards = [];
    while (pass.currentXP >= xpPerTier && pass.currentTier < maxTiers) {
      pass.currentXP -= xpPerTier;
      pass.currentTier += 1;
      // Record what rewards are now available at new tier
      var tierDef = TIER_REWARDS[pass.currentTier - 1];
      if (tierDef) {
        newRewards.push({ tier: pass.currentTier, free: tierDef.free, premium: tierDef.premium });
      }
    }

    // Cap XP at max tier reached
    if (pass.currentTier >= maxTiers) {
      pass.currentXP = 0;
    }

    return {
      success: true,
      xpAdded: xpAdded,
      previousTier: previousTier,
      currentTier: pass.currentTier,
      tiersGained: pass.currentTier - previousTier,
      newRewards: newRewards
    };
  }

  // =========================================================================
  // REWARD CLAIMING
  // =========================================================================

  /**
   * Claim a reward at a specific tier on a specific track.
   * @param {Object} state - World state
   * @param {string} playerId - Player identifier
   * @param {number} tier - Tier number (1-40)
   * @param {string} track - 'free' or 'premium'
   * @returns {Object} {success, reward, reason}
   */
  function claimReward(state, playerId, tier, track) {
    ensurePlayerPass(state, playerId);

    // Find which season this player has an active pass for
    var playerSeasons = state.battlePass.players[playerId];
    var pass = null;
    var seasonId = null;
    for (var sid in playerSeasons) {
      if (playerSeasons[sid] && playerSeasons[sid].seasonId) {
        pass = playerSeasons[sid];
        seasonId = sid;
        break;
      }
    }

    if (!pass) {
      return { success: false, reward: null, reason: 'no_pass_found' };
    }

    return claimRewardForSeason(state, playerId, seasonId, tier, track);
  }

  /**
   * Claim a reward for a specific season.
   */
  function claimRewardForSeason(state, playerId, seasonId, tier, track) {
    var pass = getPlayerPassState(state, playerId, seasonId);
    if (!pass) {
      return { success: false, reward: null, reason: 'not_initialized' };
    }

    if (tier < 1 || tier > TOTAL_TIERS) {
      return { success: false, reward: null, reason: 'invalid_tier' };
    }

    if (pass.currentTier < tier) {
      return { success: false, reward: null, reason: 'tier_not_reached' };
    }

    if (track !== 'free' && track !== 'premium') {
      return { success: false, reward: null, reason: 'invalid_track' };
    }

    if (track === 'premium' && !pass.hasPremium) {
      return { success: false, reward: null, reason: 'premium_not_purchased' };
    }

    var claimedList = track === 'free' ? pass.claimedFree : pass.claimedPremium;
    if (claimedList.indexOf(tier) !== -1) {
      return { success: false, reward: null, reason: 'already_claimed' };
    }

    var tierDef = TIER_REWARDS[tier - 1];
    if (!tierDef) {
      return { success: false, reward: null, reason: 'no_reward_defined' };
    }

    var reward = tierDef[track];
    claimedList.push(tier);

    return { success: true, reward: reward, reason: null };
  }

  /**
   * Claim all unclaimed rewards up to the player's current tier.
   * @param {Object} state - World state
   * @param {string} playerId - Player identifier
   * @returns {Object} {claimed: [{tier, track, reward}]}
   */
  function claimAllRewards(state, playerId) {
    ensurePlayerPass(state, playerId);

    var playerSeasons = state.battlePass.players[playerId];
    var pass = null;
    var seasonId = null;
    for (var sid in playerSeasons) {
      if (playerSeasons[sid] && playerSeasons[sid].seasonId) {
        pass = playerSeasons[sid];
        seasonId = sid;
        break;
      }
    }

    if (!pass) {
      return { claimed: [] };
    }

    var claimed = [];
    for (var t = 1; t <= pass.currentTier; t++) {
      // Claim free
      if (pass.claimedFree.indexOf(t) === -1) {
        var freeResult = claimRewardForSeason(state, playerId, seasonId, t, 'free');
        if (freeResult.success) {
          claimed.push({ tier: t, track: 'free', reward: freeResult.reward });
        }
      }
      // Claim premium if available
      if (pass.hasPremium && pass.claimedPremium.indexOf(t) === -1) {
        var premResult = claimRewardForSeason(state, playerId, seasonId, t, 'premium');
        if (premResult.success) {
          claimed.push({ tier: t, track: 'premium', reward: premResult.reward });
        }
      }
    }

    return { claimed: claimed };
  }

  // =========================================================================
  // PREMIUM PURCHASE
  // =========================================================================

  /**
   * Unlock premium track for the player. Deducts premiumCost Spark.
   * @param {Object} state - World state
   * @param {string} playerId - Player identifier
   * @param {string} seasonId - Season identifier
   * @returns {Object} {success, cost, reason}
   */
  function purchasePremium(state, playerId, seasonId) {
    ensurePlayerPass(state, playerId);

    var def = getSeasonDef(seasonId);
    var seasonState = state.battlePass.seasons && state.battlePass.seasons[seasonId];
    var cost = (def && def.premiumCost) || (seasonState && seasonState.premiumCost) || 100;

    var pass = getPlayerPassState(state, playerId, seasonId);
    if (!pass) {
      return { success: false, cost: cost, reason: 'not_initialized' };
    }

    if (pass.hasPremium) {
      return { success: false, cost: cost, reason: 'already_purchased' };
    }

    var balance = getSparkBalance(state, playerId);
    if (balance < cost) {
      return { success: false, cost: cost, reason: 'insufficient_spark' };
    }

    deductSpark(state, playerId, cost);
    pass.hasPremium = true;

    return { success: true, cost: cost, reason: null };
  }

  // =========================================================================
  // QUERY FUNCTIONS
  // =========================================================================

  /**
   * Return the player's current tier number.
   * @param {Object} state
   * @param {string} playerId
   * @returns {number}
   */
  function getCurrentTier(state, playerId) {
    ensurePlayerPass(state, playerId);
    var playerSeasons = state.battlePass.players[playerId];
    for (var sid in playerSeasons) {
      var p = playerSeasons[sid];
      if (p && typeof p.currentTier === 'number') {
        return p.currentTier;
      }
    }
    return 0;
  }

  /**
   * Return progress within the current tier.
   * @param {Object} state
   * @param {string} playerId
   * @returns {Object} {tier, xp, xpToNext, percent}
   */
  function getTierProgress(state, playerId) {
    ensurePlayerPass(state, playerId);
    var playerSeasons = state.battlePass.players[playerId];
    for (var sid in playerSeasons) {
      var p = playerSeasons[sid];
      if (p && p.seasonId) {
        var def = getSeasonDef(p.seasonId);
        var xpPerTier = (def && def.xpPerTier) || 50;
        var maxTiers = (def && def.tiers) || 40;
        var xpToNext = p.currentTier >= maxTiers ? 0 : xpPerTier;
        var xp = p.currentTier >= maxTiers ? 0 : p.currentXP;
        var percent = xpToNext > 0 ? Math.min(100, Math.floor((xp / xpToNext) * 100)) : 100;
        return {
          tier: p.currentTier,
          xp: xp,
          xpToNext: xpToNext,
          percent: percent
        };
      }
    }
    return { tier: 0, xp: 0, xpToNext: 50, percent: 0 };
  }

  /**
   * Return {free, premium} rewards for a given tier.
   * @param {string} seasonId - Currently unused; rewards are season-agnostic
   * @param {number} tier
   * @returns {Object} {free, premium}
   */
  function getRewards(seasonId, tier) {
    var tierDef = TIER_REWARDS[tier - 1];
    if (!tierDef) {
      return { free: null, premium: null };
    }
    return { free: tierDef.free, premium: tierDef.premium };
  }

  /**
   * Return all 40 tiers with their rewards.
   * @param {string} seasonId
   * @returns {Array} Array of {tier, free, premium}
   */
  function getAllTierRewards(seasonId) {
    return TIER_REWARDS.slice();
  }

  /**
   * Return list of unclaimed rewards (both tracks) up to the player's tier.
   * @param {Object} state
   * @param {string} playerId
   * @returns {Array} [{tier, track, reward}]
   */
  function getUnclaimedRewards(state, playerId) {
    ensurePlayerPass(state, playerId);
    var playerSeasons = state.battlePass.players[playerId];
    var pass = null;
    for (var sid in playerSeasons) {
      if (playerSeasons[sid] && playerSeasons[sid].seasonId) {
        pass = playerSeasons[sid];
        break;
      }
    }

    if (!pass) {
      return [];
    }

    var unclaimed = [];
    for (var t = 1; t <= pass.currentTier; t++) {
      if (pass.claimedFree.indexOf(t) === -1) {
        var tierDef = TIER_REWARDS[t - 1];
        if (tierDef && tierDef.free) {
          unclaimed.push({ tier: t, track: 'free', reward: tierDef.free });
        }
      }
      if (pass.hasPremium && pass.claimedPremium.indexOf(t) === -1) {
        var tierDefP = TIER_REWARDS[t - 1];
        if (tierDefP && tierDefP.premium) {
          unclaimed.push({ tier: t, track: 'premium', reward: tierDefP.premium });
        }
      }
    }
    return unclaimed;
  }

  /**
   * Return list of already claimed rewards.
   * @param {Object} state
   * @param {string} playerId
   * @returns {Array} [{tier, track, reward}]
   */
  function getClaimedRewards(state, playerId) {
    ensurePlayerPass(state, playerId);
    var playerSeasons = state.battlePass.players[playerId];
    var pass = null;
    for (var sid in playerSeasons) {
      if (playerSeasons[sid] && playerSeasons[sid].seasonId) {
        pass = playerSeasons[sid];
        break;
      }
    }

    if (!pass) {
      return [];
    }

    var claimed = [];
    for (var i = 0; i < pass.claimedFree.length; i++) {
      var t = pass.claimedFree[i];
      var tierDef = TIER_REWARDS[t - 1];
      if (tierDef) {
        claimed.push({ tier: t, track: 'free', reward: tierDef.free });
      }
    }
    for (var j = 0; j < pass.claimedPremium.length; j++) {
      var tp = pass.claimedPremium[j];
      var tierDefP = TIER_REWARDS[tp - 1];
      if (tierDefP) {
        claimed.push({ tier: tp, track: 'premium', reward: tierDefP.premium });
      }
    }
    return claimed;
  }

  /**
   * Return breakdown of XP by source.
   * @param {Object} state
   * @param {string} playerId
   * @returns {Object} {source: xp}
   */
  function getXPSources(state, playerId) {
    ensurePlayerPass(state, playerId);
    var playerSeasons = state.battlePass.players[playerId];
    for (var sid in playerSeasons) {
      var p = playerSeasons[sid];
      if (p && p.xpSources) {
        return p.xpSources;
      }
    }
    return {};
  }

  /**
   * Return season details.
   * @param {Object} state
   * @param {string} seasonId
   * @returns {Object} Season info
   */
  function getSeasonInfo(state, seasonId) {
    ensureSeasons(state);
    var def = getSeasonDef(seasonId);
    var seasonState = state.battlePass.seasons && state.battlePass.seasons[seasonId];
    if (!def && !seasonState) {
      return null;
    }
    return seasonState || def;
  }

  /**
   * Return ticks remaining in a season.
   * @param {Object} state
   * @param {string} seasonId
   * @param {number} currentTick
   * @returns {number} Ticks remaining (0 if ended)
   */
  function getSeasonTimeRemaining(state, seasonId, currentTick) {
    ensureSeasons(state);
    var seasonState = state.battlePass.seasons && state.battlePass.seasons[seasonId];
    var def = getSeasonDef(seasonId);
    var startTick = (seasonState && seasonState.startTick) || (def && def.startTick) || 0;
    var duration = (seasonState && seasonState.duration) || (def && def.duration) || 0;
    var endTick = startTick + duration;
    var remaining = endTick - currentTick;
    return remaining > 0 ? remaining : 0;
  }

  /**
   * Check if a season is still running.
   * @param {Object} state
   * @param {string} seasonId
   * @param {number} currentTick
   * @returns {boolean}
   */
  function isSeasonActive(state, seasonId, currentTick) {
    ensureSeasons(state);
    var seasonState = state.battlePass.seasons && state.battlePass.seasons[seasonId];
    if (seasonState && seasonState.ended) {
      return false;
    }
    var def = getSeasonDef(seasonId);
    var startTick = (seasonState && seasonState.startTick) || (def && def.startTick) || 0;
    var duration = (seasonState && seasonState.duration) || (def && def.duration) || 0;
    var endTick = startTick + duration;
    return currentTick >= startTick && currentTick < endTick;
  }

  /**
   * End a season, locking further XP gains. Unclaimed rewards remain available.
   * @param {Object} state
   * @param {string} seasonId
   * @returns {Object} {ended, playerStats: [{playerId, tier, totalXP}]}
   */
  function endSeason(state, seasonId) {
    ensureSeasons(state);
    var seasonState = state.battlePass.seasons && state.battlePass.seasons[seasonId];
    if (!seasonState) {
      return { ended: false, playerStats: [] };
    }

    seasonState.ended = true;
    seasonState.active = false;

    var playerStats = [];
    var players = state.battlePass.players || {};
    for (var pid in players) {
      var playerSeasons = players[pid];
      if (playerSeasons && playerSeasons[seasonId]) {
        var pass = playerSeasons[seasonId];
        playerStats.push({
          playerId: pid,
          tier: pass.currentTier,
          totalXP: pass.totalXPEarned
        });
      }
    }

    return { ended: true, playerStats: playerStats };
  }

  // =========================================================================
  // LEADERBOARD & STATS
  // =========================================================================

  /**
   * Return top players by tier then XP for a season.
   * @param {Object} state
   * @param {string} seasonId
   * @param {number} count - Number of entries to return
   * @returns {Array} [{rank, playerId, tier, totalXP}]
   */
  function getLeaderboard(state, seasonId, count) {
    ensureSeasons(state);
    var limit = count || 10;
    var players = state.battlePass.players || {};
    var entries = [];

    for (var pid in players) {
      var playerSeasons = players[pid];
      if (playerSeasons && playerSeasons[seasonId]) {
        var pass = playerSeasons[seasonId];
        entries.push({
          playerId: pid,
          tier: pass.currentTier,
          totalXP: pass.totalXPEarned
        });
      }
    }

    // Sort: higher tier first, then higher totalXP
    entries.sort(function(a, b) {
      if (b.tier !== a.tier) {
        return b.tier - a.tier;
      }
      return b.totalXP - a.totalXP;
    });

    // Assign ranks
    var result = [];
    for (var i = 0; i < Math.min(limit, entries.length); i++) {
      result.push({
        rank: i + 1,
        playerId: entries[i].playerId,
        tier: entries[i].tier,
        totalXP: entries[i].totalXP
      });
    }
    return result;
  }

  /**
   * Return completion statistics for a player.
   * @param {Object} state
   * @param {string} playerId
   * @returns {Object} {tiersCompleted, totalTiers, freeRewardsClaimed, premiumRewardsClaimed, percentComplete}
   */
  function getCompletionStats(state, playerId) {
    ensurePlayerPass(state, playerId);
    var playerSeasons = state.battlePass.players[playerId];
    var pass = null;
    for (var sid in playerSeasons) {
      if (playerSeasons[sid] && playerSeasons[sid].seasonId) {
        pass = playerSeasons[sid];
        break;
      }
    }

    if (!pass) {
      return {
        tiersCompleted: 0,
        totalTiers: TOTAL_TIERS,
        freeRewardsClaimed: 0,
        premiumRewardsClaimed: 0,
        percentComplete: 0
      };
    }

    var tiersCompleted = pass.currentTier;
    var freeRewardsClaimed = pass.claimedFree.length;
    var premiumRewardsClaimed = pass.claimedPremium.length;
    var percentComplete = Math.floor((tiersCompleted / TOTAL_TIERS) * 100);

    return {
      tiersCompleted: tiersCompleted,
      totalTiers: TOTAL_TIERS,
      freeRewardsClaimed: freeRewardsClaimed,
      premiumRewardsClaimed: premiumRewardsClaimed,
      percentComplete: percentComplete
    };
  }

  // =========================================================================
  // EXPORTS
  // =========================================================================

  exports.SEASONS = SEASONS;
  exports.TIER_REWARDS = TIER_REWARDS;
  exports.FREE_TRACK = FREE_TRACK;
  exports.PREMIUM_TRACK = PREMIUM_TRACK;
  exports.TOTAL_TIERS = TOTAL_TIERS;
  exports.VALID_REWARD_TYPES = VALID_REWARD_TYPES;

  exports.initSeason = initSeason;
  exports.initPlayerPass = initPlayerPass;
  exports.addXP = addXP;
  exports.addXPToSeason = addXPToSeason;
  exports.claimReward = claimReward;
  exports.claimRewardForSeason = claimRewardForSeason;
  exports.claimAllRewards = claimAllRewards;
  exports.purchasePremium = purchasePremium;
  exports.getCurrentTier = getCurrentTier;
  exports.getTierProgress = getTierProgress;
  exports.getRewards = getRewards;
  exports.getAllTierRewards = getAllTierRewards;
  exports.getUnclaimedRewards = getUnclaimedRewards;
  exports.getClaimedRewards = getClaimedRewards;
  exports.getXPSources = getXPSources;
  exports.getSeasonInfo = getSeasonInfo;
  exports.getSeasonTimeRemaining = getSeasonTimeRemaining;
  exports.isSeasonActive = isSeasonActive;
  exports.endSeason = endSeason;
  exports.getLeaderboard = getLeaderboard;
  exports.getCompletionStats = getCompletionStats;

})(typeof module !== 'undefined' ? module.exports : (window.BattlePass = {}));
