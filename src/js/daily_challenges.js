/**
 * ZION Daily & Weekly Challenge System
 * Streaks, escalating rewards, and seasonal themed challenges
 * Layer: after economy.js (uses spark/xp reward shapes)
 */

(function(exports) {
  'use strict';

  // ============================================================================
  // CHALLENGE POOL — 30 challenges across 5 categories
  // ============================================================================

  var CHALLENGE_POOL = [
    // --- Gathering (6) ---
    {
      id: 'gather_5_wood',
      title: 'Lumberjack',
      desc: 'Gather 5 wood',
      target: 5,
      type: 'gather',
      resource: 'wood',
      zone: null,
      category: 'gathering',
      reward: { spark: 10, xp: 15 }
    },
    {
      id: 'gather_5_herbs',
      title: 'Herb Picker',
      desc: 'Gather 5 herbs',
      target: 5,
      type: 'gather',
      resource: 'herbs',
      zone: 'gardens',
      category: 'gathering',
      reward: { spark: 10, xp: 15 }
    },
    {
      id: 'gather_3_iron',
      title: 'Miner',
      desc: 'Gather 3 iron ore',
      target: 3,
      type: 'gather',
      resource: 'iron_ore',
      zone: 'wilds',
      category: 'gathering',
      reward: { spark: 15, xp: 20 }
    },
    {
      id: 'gather_10_any',
      title: 'Resource Rush',
      desc: 'Gather 10 resources of any type',
      target: 10,
      type: 'gather',
      resource: null,
      zone: null,
      category: 'gathering',
      reward: { spark: 20, xp: 25 }
    },
    {
      id: 'gather_crystal',
      title: 'Crystal Hunter',
      desc: 'Find 1 crystal',
      target: 1,
      type: 'gather',
      resource: 'crystal',
      zone: null,
      category: 'gathering',
      reward: { spark: 25, xp: 30 }
    },
    {
      id: 'gather_3_zones',
      title: 'Zone Forager',
      desc: 'Gather in 3 different zones',
      target: 3,
      type: 'gather_zones',
      resource: null,
      zone: null,
      category: 'gathering',
      reward: { spark: 20, xp: 25 }
    },

    // --- Social (6) ---
    {
      id: 'chat_10',
      title: 'Chatterbox',
      desc: 'Send 10 chat messages',
      target: 10,
      type: 'chat',
      zone: null,
      category: 'social',
      reward: { spark: 8, xp: 10 }
    },
    {
      id: 'trade_1',
      title: 'Fair Exchange',
      desc: 'Complete 1 trade',
      target: 1,
      type: 'trade',
      zone: null,
      category: 'social',
      reward: { spark: 15, xp: 20 }
    },
    {
      id: 'greet_3_npcs',
      title: 'Friendly Face',
      desc: 'Greet 3 different NPCs',
      target: 3,
      type: 'greet_npc',
      zone: null,
      category: 'social',
      reward: { spark: 10, xp: 15 }
    },
    {
      id: 'gift_npc',
      title: 'Gift Giver',
      desc: 'Give a gift to any NPC',
      target: 1,
      type: 'gift',
      zone: null,
      category: 'social',
      reward: { spark: 12, xp: 15 }
    },
    {
      id: 'guild_chat_5',
      title: 'Team Player',
      desc: 'Send 5 guild chat messages',
      target: 5,
      type: 'guild_chat',
      zone: null,
      category: 'social',
      reward: { spark: 10, xp: 12 }
    },
    {
      id: 'visit_player',
      title: 'House Guest',
      desc: "Visit another player's house",
      target: 1,
      type: 'visit_house',
      zone: null,
      category: 'social',
      reward: { spark: 12, xp: 15 }
    },

    // --- Exploration (6) ---
    {
      id: 'visit_3_zones',
      title: 'Wanderer',
      desc: 'Visit 3 different zones',
      target: 3,
      type: 'visit_zone',
      zone: null,
      category: 'exploration',
      reward: { spark: 12, xp: 18 }
    },
    {
      id: 'walk_500',
      title: 'Long Walk',
      desc: 'Walk 500 distance units',
      target: 500,
      type: 'distance',
      zone: null,
      category: 'exploration',
      reward: { spark: 10, xp: 15 }
    },
    {
      id: 'discover_1',
      title: 'Discovery',
      desc: 'Find 1 hidden discovery',
      target: 1,
      type: 'discover',
      zone: null,
      category: 'exploration',
      reward: { spark: 20, xp: 25 }
    },
    {
      id: 'night_explore',
      title: 'Night Owl',
      desc: 'Explore during nighttime',
      target: 1,
      type: 'night_action',
      zone: null,
      category: 'exploration',
      reward: { spark: 15, xp: 20 }
    },
    {
      id: 'fast_travel_2',
      title: 'Teleporter',
      desc: 'Fast travel 2 times',
      target: 2,
      type: 'fast_travel',
      zone: null,
      category: 'exploration',
      reward: { spark: 8, xp: 10 }
    },
    {
      id: 'map_check',
      title: 'Cartographer',
      desc: 'Open the world map',
      target: 1,
      type: 'open_map',
      zone: null,
      category: 'exploration',
      reward: { spark: 5, xp: 8 }
    },

    // --- Crafting (6) ---
    {
      id: 'craft_3',
      title: 'Busy Hands',
      desc: 'Craft 3 items',
      target: 3,
      type: 'craft',
      zone: null,
      category: 'crafting',
      reward: { spark: 15, xp: 20 }
    },
    {
      id: 'craft_tool',
      title: 'Tool Maker',
      desc: 'Craft any tool',
      target: 1,
      type: 'craft_category',
      category_filter: 'tool',
      zone: null,
      category: 'crafting',
      reward: { spark: 20, xp: 25 }
    },
    {
      id: 'sell_5_market',
      title: 'Market Seller',
      desc: 'List 5 items on the market',
      target: 5,
      type: 'market_list',
      zone: null,
      category: 'crafting',
      reward: { spark: 15, xp: 18 }
    },
    {
      id: 'buy_3_market',
      title: 'Shopping Spree',
      desc: 'Buy 3 items from market',
      target: 3,
      type: 'market_buy',
      zone: null,
      category: 'crafting',
      reward: { spark: 12, xp: 15 }
    },
    {
      id: 'equip_item',
      title: 'Gear Up',
      desc: 'Equip an item',
      target: 1,
      type: 'equip',
      zone: null,
      category: 'crafting',
      reward: { spark: 8, xp: 10 }
    },
    {
      id: 'cook_food',
      title: 'Chef',
      desc: 'Cook 2 food items',
      target: 2,
      type: 'craft_category',
      category_filter: 'consumable',
      zone: null,
      category: 'crafting',
      reward: { spark: 12, xp: 15 }
    },

    // --- Mini-games (6) ---
    {
      id: 'catch_3_fish',
      title: 'Angler',
      desc: 'Catch 3 fish',
      target: 3,
      type: 'catch_fish',
      zone: null,
      category: 'minigame',
      reward: { spark: 12, xp: 15 }
    },
    {
      id: 'card_battle',
      title: 'Card Duel',
      desc: 'Play 1 card battle',
      target: 1,
      type: 'card_battle',
      zone: null,
      category: 'minigame',
      reward: { spark: 15, xp: 20 }
    },
    {
      id: 'dungeon_room_5',
      title: 'Dungeon Diver',
      desc: 'Clear 5 dungeon rooms',
      target: 5,
      type: 'dungeon_rooms',
      zone: null,
      category: 'minigame',
      reward: { spark: 18, xp: 22 }
    },
    {
      id: 'identify_star',
      title: 'Stargazer',
      desc: 'Identify 1 constellation',
      target: 1,
      type: 'identify_star',
      zone: null,
      category: 'minigame',
      reward: { spark: 12, xp: 15 }
    },
    {
      id: 'bury_capsule',
      title: 'Time Traveler',
      desc: 'Bury a time capsule',
      target: 1,
      type: 'bury_capsule',
      zone: null,
      category: 'minigame',
      reward: { spark: 10, xp: 12 }
    },
    {
      id: 'compose_song',
      title: 'Composer',
      desc: 'Create a music composition',
      target: 1,
      type: 'compose',
      zone: null,
      category: 'minigame',
      reward: { spark: 15, xp: 18 }
    }
  ];

  // ============================================================================
  // SEASONAL CHALLENGE TEMPLATES
  // ============================================================================

  var SEASONAL_CHALLENGES = {
    spring: {
      id: 'seasonal_spring',
      title: 'Bloom Seeker',
      desc: 'Gather 10 spring flowers during the Bloom Festival',
      target: 10,
      type: 'gather',
      resource: 'spring_flower',
      zone: 'gardens',
      category: 'seasonal',
      season: 'spring',
      reward: { spark: 40, xp: 50, item: 'petal_crown' }
    },
    summer: {
      id: 'seasonal_summer',
      title: 'Sun Chaser',
      desc: 'Explore all 8 zones during the Sun Festival',
      target: 8,
      type: 'visit_zone',
      resource: null,
      zone: null,
      category: 'seasonal',
      season: 'summer',
      reward: { spark: 50, xp: 60, item: 'sunstone_charm' }
    },
    autumn: {
      id: 'seasonal_autumn',
      title: 'Harvest Master',
      desc: 'Craft 5 items from harvested resources during Harvest Festival',
      target: 5,
      type: 'craft',
      resource: null,
      zone: null,
      category: 'seasonal',
      season: 'autumn',
      reward: { spark: 45, xp: 55, item: 'amber_pendant' }
    },
    winter: {
      id: 'seasonal_winter',
      title: 'Hearth Keeper',
      desc: 'Trade gifts with 5 players during the Frost Festival',
      target: 5,
      type: 'gift',
      resource: null,
      zone: null,
      category: 'seasonal',
      season: 'winter',
      reward: { spark: 45, xp: 55, item: 'snowflake_crystal' }
    }
  };

  // ============================================================================
  // STREAK MULTIPLIERS
  // ============================================================================

  var STREAK_TIERS = [
    { minDays: 30, multiplier: 3.0 },
    { minDays: 14, multiplier: 2.0 },
    { minDays: 7,  multiplier: 1.5 },
    { minDays: 1,  multiplier: 1.0 }
  ];

  // Weekly meta-quest threshold
  var WEEKLY_META_THRESHOLD = 5;

  // ============================================================================
  // SEEDED RANDOM UTILITY
  // ============================================================================

  /**
   * Simple seeded pseudo-random number generator (Mulberry32).
   * @param {number} seed
   * @returns {function} A function that returns a float in [0, 1) each call.
   */
  function makeSeededRandom(seed) {
    var s = seed >>> 0;
    return function() {
      s += 0x6D2B79F5;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) >>> 0;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Fisher-Yates shuffle using a provided random function.
   * Returns a new shuffled array (does not mutate original).
   * @param {Array} arr
   * @param {function} rng  - function returning float in [0,1)
   * @returns {Array}
   */
  function seededShuffle(arr, rng) {
    var result = arr.slice();
    for (var i = result.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = result[i];
      result[i] = result[j];
      result[j] = tmp;
    }
    return result;
  }

  // ============================================================================
  // STATE FACTORY
  // ============================================================================

  /**
   * Creates a fresh daily challenge state object.
   * @returns {Object}
   */
  function createDailyState() {
    return {
      activeChallenges: [],   // Array of { ...challengeDef, progress: 0, completed: false }
      completedToday: [],     // Array of challenge IDs completed this day
      streak: 0,              // Consecutive days with at least 1 completion
      lastCompletionDay: 0,   // dayNumber of the last recorded completion
      weeklyProgress: 0,      // Dailies completed this week (0-7)
      weeklyCompleted: false, // Whether the weekly meta-quest reward was claimed
      history: [],            // Array of { day, challengeId, reward, streakAtTime }
      totalCompleted: 0       // Lifetime total of completed challenges
    };
  }

  // ============================================================================
  // CHALLENGE GENERATION
  // ============================================================================

  /**
   * Generate a seeded, deduplicated set of daily challenges for a given day.
   * Yesterday's challenges are excluded where possible.
   *
   * @param {number} dayNumber  - The game day number (integer, 1-based)
   * @param {number} [count=3] - How many challenges to return
   * @param {string[]} [excludeIds=[]] - Challenge IDs to exclude (yesterday's)
   * @returns {Array} Array of challenge objects each with progress: 0, completed: false
   */
  function generateDailyChallenges(dayNumber, count, excludeIds) {
    count = (typeof count === 'number' && count > 0) ? count : 3;
    excludeIds = Array.isArray(excludeIds) ? excludeIds : [];

    var rng = makeSeededRandom(dayNumber * 1000003 + 7);
    var shuffled = seededShuffle(CHALLENGE_POOL, rng);

    // Prefer challenges not in yesterday's set
    var preferred = shuffled.filter(function(c) {
      return excludeIds.indexOf(c.id) === -1;
    });
    var fallback = shuffled.filter(function(c) {
      return excludeIds.indexOf(c.id) !== -1;
    });

    // Fill from preferred first, then fallback if needed
    var pool = preferred.concat(fallback);
    var selected = pool.slice(0, count);

    return selected.map(function(c) {
      return copyChallenge(c, 0, false);
    });
  }

  /**
   * Return a shallow copy of a challenge definition with runtime fields added.
   * @param {Object} def  - Challenge definition from CHALLENGE_POOL
   * @param {number} progress
   * @param {boolean} completed
   * @returns {Object}
   */
  function copyChallenge(def, progress, completed) {
    var obj = {};
    var keys = Object.keys(def);
    for (var i = 0; i < keys.length; i++) {
      obj[keys[i]] = def[keys[i]];
    }
    obj.progress = progress;
    obj.completed = completed;
    return obj;
  }

  // ============================================================================
  // STREAK HELPERS
  // ============================================================================

  /**
   * Returns the streak multiplier for a given streak count.
   * @param {number} streak
   * @returns {number}
   */
  function getStreakMultiplier(streak) {
    for (var i = 0; i < STREAK_TIERS.length; i++) {
      if (streak >= STREAK_TIERS[i].minDays) {
        return STREAK_TIERS[i].multiplier;
      }
    }
    return 1.0;
  }

  /**
   * Returns the current streak from state.
   * @param {Object} state
   * @returns {number}
   */
  function getStreak(state) {
    return state.streak || 0;
  }

  // ============================================================================
  // REWARD CALCULATION
  // ============================================================================

  /**
   * Apply streak multiplier to a reward object.
   * Returns a new reward object — does not mutate input.
   * @param {Object} baseReward  - { spark, xp, [item] }
   * @param {number} multiplier
   * @returns {Object}
   */
  function applyStreakMultiplier(baseReward, multiplier) {
    var result = {};
    result.spark = Math.round(baseReward.spark * multiplier);
    result.xp = Math.round(baseReward.xp * multiplier);
    if (baseReward.item) {
      result.item = baseReward.item;
    }
    return result;
  }

  // ============================================================================
  // PROGRESS & COMPLETION
  // ============================================================================

  /**
   * Update progress on a specific challenge by ID.
   * Auto-completes if target is reached.
   * Mutates the provided state (creates a new state copy, does not mutate in place).
   *
   * @param {Object} state        - Daily challenge state
   * @param {string} challengeId  - The challenge to advance
   * @param {number} [amount=1]   - How much progress to add
   * @returns {{ state, completed, reward, streakBonus, message }}
   */
  function updateProgress(state, challengeId, amount) {
    amount = (typeof amount === 'number') ? amount : 1;

    // Deep-copy the active challenges array to avoid mutations
    var newState = shallowCopyState(state);
    var challenge = findActive(newState, challengeId);

    if (!challenge) {
      return {
        state: newState,
        completed: false,
        reward: null,
        streakBonus: false,
        message: 'Challenge not found or not active'
      };
    }

    if (challenge.completed) {
      return {
        state: newState,
        completed: false,
        reward: null,
        streakBonus: false,
        message: 'Challenge already completed'
      };
    }

    challenge.progress = Math.min(challenge.progress + amount, challenge.target);

    if (challenge.progress >= challenge.target) {
      return completeChallenge(newState, challengeId);
    }

    return {
      state: newState,
      completed: false,
      reward: null,
      streakBonus: false,
      message: challenge.progress + ' / ' + challenge.target
    };
  }

  /**
   * Mark a challenge as complete, award rewards, update streak.
   * @param {Object} state
   * @param {string} challengeId
   * @returns {{ state, reward, message }}
   */
  function completeChallenge(state, challengeId) {
    var newState = shallowCopyState(state);
    var challenge = findActive(newState, challengeId);

    if (!challenge) {
      return {
        state: newState,
        completed: false,
        reward: null,
        streakBonus: false,
        message: 'Challenge not found'
      };
    }

    if (challenge.completed) {
      return {
        state: newState,
        completed: false,
        reward: null,
        streakBonus: false,
        message: 'Challenge already completed'
      };
    }

    // Mark complete
    challenge.completed = true;
    challenge.progress = challenge.target;

    if (newState.completedToday.indexOf(challengeId) === -1) {
      newState.completedToday = newState.completedToday.concat([challengeId]);
    }

    // --- Streak update ---
    // Streak increments when we complete a challenge on a new day.
    // The day tracking is done by the caller through resetDaily / dayNumber context.
    // Here we just bump streak if this is the first completion today (completedToday.length === 1).
    var isFirstToday = newState.completedToday.length === 1;
    var streakBonusGranted = false;
    if (isFirstToday) {
      newState.streak = (newState.streak || 0) + 1;
      streakBonusGranted = true;
    }

    // Weekly progress
    newState.weeklyProgress = (newState.weeklyProgress || 0) + 1;

    // Lifetime counter
    newState.totalCompleted = (newState.totalCompleted || 0) + 1;

    // Reward with streak multiplier
    var multiplier = getStreakMultiplier(newState.streak);
    var baseReward = challenge.reward;
    var finalReward = applyStreakMultiplier(baseReward, multiplier);

    // Record history
    var historyEntry = {
      challengeId: challengeId,
      reward: finalReward,
      streakAtTime: newState.streak,
      multiplier: multiplier
    };
    newState.history = newState.history.concat([historyEntry]);

    // Check weekly meta
    var weeklyResult = checkWeeklyMeta(newState);
    var weeklyMsg = '';
    if (weeklyResult.justCompleted) {
      newState.weeklyCompleted = true;
      weeklyMsg = ' Weekly meta-quest complete! Bonus reward unlocked.';
    }

    return {
      state: newState,
      completed: true,
      reward: finalReward,
      streakBonus: streakBonusGranted,
      message: '"' + challenge.title + '" complete! +' + finalReward.spark + ' Spark, +' + finalReward.xp + ' XP' + weeklyMsg
    };
  }

  // ============================================================================
  // ACCESSORS
  // ============================================================================

  /**
   * Returns the active challenges (with progress) from state.
   * @param {Object} state
   * @returns {Array}
   */
  function getActiveChallenges(state) {
    return state.activeChallenges || [];
  }

  /**
   * Check if the weekly meta-quest was just completed (crossed the threshold).
   * @param {Object} state
   * @returns {{ complete: boolean, justCompleted: boolean, progress: number, target: number }}
   */
  function checkWeeklyMeta(state) {
    var progress = state.weeklyProgress || 0;
    var wasComplete = state.weeklyCompleted || false;
    var nowComplete = progress >= WEEKLY_META_THRESHOLD;
    return {
      complete: nowComplete,
      justCompleted: nowComplete && !wasComplete,
      progress: progress,
      target: WEEKLY_META_THRESHOLD
    };
  }

  /**
   * Returns the weekly bonus reward object.
   * @returns {Object}
   */
  function getWeeklyReward() {
    var rareItems = [
      'enchanted_scroll',
      'moonstone_gem',
      'phoenix_feather',
      'dragon_scale',
      'void_shard',
      'aurora_crystal',
      'ancient_coin',
      'star_fragment'
    ];
    // Deterministic "random" for stability: pick based on current week epoch
    var weekIndex = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000)) % rareItems.length;
    return {
      spark: 100,
      xp: 150,
      item: rareItems[weekIndex]
    };
  }

  /**
   * Reset state for a new day, preserving streak if days are consecutive.
   * "Consecutive" means lastCompletionDay === newDayNumber - 1.
   *
   * @param {Object} state
   * @param {number} newDayNumber
   * @param {number} [count=3] - How many new challenges to generate
   * @returns {Object} New state for the new day
   */
  function resetDaily(state, newDayNumber, count) {
    count = (typeof count === 'number' && count > 0) ? count : 3;

    var newState = shallowCopyState(state);

    // Determine streak continuity
    var lastDay = newState.lastCompletionDay || 0;
    var hadCompletionYesterday = newState.completedToday.length > 0;

    // If the player completed something yesterday and we're exactly 1 day later, keep streak.
    // Otherwise if they missed a day, reset streak.
    if (hadCompletionYesterday) {
      newState.lastCompletionDay = lastDay; // will be set properly below
    }

    // Check if streak should be preserved
    var shouldPreserveStreak = (lastDay > 0) && (newDayNumber === lastDay + 1) && (newState.completedToday.length > 0);

    if (!shouldPreserveStreak && newState.completedToday.length === 0 && lastDay > 0) {
      // Missed a day — reset streak
      newState.streak = 0;
    }
    // (If shouldPreserveStreak, streak was already incremented during completeChallenge)

    // Get yesterday's IDs to avoid repeats
    var yesterdayIds = newState.activeChallenges.map(function(c) { return c.id; });

    // Update day tracking
    if (hadCompletionYesterday) {
      newState.lastCompletionDay = lastDay; // record what day we just finished
    }

    // Reset weekly if a full week has passed (every 7 days)
    // Week boundary: check if newDayNumber starts a new 7-day block
    var oldWeekBlock = Math.floor((lastDay - 1) / 7);
    var newWeekBlock = Math.floor((newDayNumber - 1) / 7);
    if (newWeekBlock > oldWeekBlock) {
      newState.weeklyProgress = 0;
      newState.weeklyCompleted = false;
    }

    // Generate new challenges
    newState.activeChallenges = generateDailyChallenges(newDayNumber, count, yesterdayIds);
    newState.completedToday = [];

    return newState;
  }

  /**
   * Get a challenge definition by ID.
   * @param {string} challengeId
   * @returns {Object|null}
   */
  function getChallengeById(challengeId) {
    for (var i = 0; i < CHALLENGE_POOL.length; i++) {
      if (CHALLENGE_POOL[i].id === challengeId) {
        return CHALLENGE_POOL[i];
      }
    }
    // Also check seasonal
    var seasons = Object.keys(SEASONAL_CHALLENGES);
    for (var j = 0; j < seasons.length; j++) {
      if (SEASONAL_CHALLENGES[seasons[j]].id === challengeId) {
        return SEASONAL_CHALLENGES[seasons[j]];
      }
    }
    return null;
  }

  /**
   * Get recent completion history.
   * @param {Object} state
   * @param {number} [limit=10]
   * @returns {Array}
   */
  function getCompletionHistory(state, limit) {
    limit = (typeof limit === 'number' && limit > 0) ? limit : 10;
    var history = state.history || [];
    return history.slice(-limit);
  }

  /**
   * Get the seasonal bonus challenge for the current season and day.
   * @param {string} season  - 'spring' | 'summer' | 'autumn' | 'winter'
   * @param {number} dayNumber
   * @returns {Object|null}
   */
  function getSeasonalChallenge(season, dayNumber) {
    var def = SEASONAL_CHALLENGES[season];
    if (!def) return null;

    var copy = copyChallenge(def, 0, false);
    // Vary the description slightly based on dayNumber to give uniqueness
    copy.dayNumber = dayNumber;
    return copy;
  }

  // ============================================================================
  // FORMATTING
  // ============================================================================

  /**
   * Render an HTML card for a challenge.
   * @param {Object} challenge    - challenge object (with progress and completed fields)
   * @param {number} [progress]   - override progress value (optional)
   * @param {number} [streakMultiplier=1]
   * @returns {string} HTML string
   */
  function formatChallengeCard(challenge, progress, streakMultiplier) {
    if (typeof progress !== 'number') progress = challenge.progress || 0;
    streakMultiplier = (typeof streakMultiplier === 'number') ? streakMultiplier : 1;

    var pct = Math.min(100, Math.round((progress / challenge.target) * 100));
    var isComplete = challenge.completed || progress >= challenge.target;
    var bonusSpark = Math.round(challenge.reward.spark * streakMultiplier);
    var bonusXp = Math.round(challenge.reward.xp * streakMultiplier);
    var completedClass = isComplete ? ' challenge-complete' : '';
    var checkmark = isComplete ? '<span class="challenge-check">&#x2713;</span>' : '';

    var categoryColors = {
      gathering: '#7db37d',
      social: '#6fa8dc',
      exploration: '#e8b860',
      crafting: '#d4a040',
      minigame: '#b87dc0',
      seasonal: '#ff8c42'
    };
    var catColor = categoryColors[challenge.category] || '#aaa';

    return '<div class="challenge-card' + completedClass + '" data-id="' + challenge.id + '">' +
      '<div class="challenge-category-bar" style="background:' + catColor + '"></div>' +
      '<div class="challenge-header">' +
        checkmark +
        '<span class="challenge-title">' + challenge.title + '</span>' +
        '<span class="challenge-category">' + (challenge.category || '') + '</span>' +
      '</div>' +
      '<p class="challenge-desc">' + challenge.desc + '</p>' +
      '<div class="challenge-progress-bar">' +
        '<div class="challenge-progress-fill" style="width:' + pct + '%"></div>' +
      '</div>' +
      '<div class="challenge-progress-text">' + progress + ' / ' + challenge.target + '</div>' +
      '<div class="challenge-reward">' +
        '<span class="challenge-spark">+' + bonusSpark + ' Spark</span>' +
        '<span class="challenge-xp">+' + bonusXp + ' XP</span>' +
        (streakMultiplier > 1 ? '<span class="challenge-multiplier">x' + streakMultiplier.toFixed(1) + '</span>' : '') +
      '</div>' +
    '</div>';
  }

  /**
   * Render an HTML streak display.
   * @param {number} streak
   * @returns {string} HTML string
   */
  function formatStreakDisplay(streak) {
    streak = streak || 0;
    var multiplier = getStreakMultiplier(streak);
    var fireEmoji = streak >= 30 ? '&#x1F525;&#x1F525;&#x1F525;' :
                    streak >= 14 ? '&#x1F525;&#x1F525;' :
                    streak >= 7  ? '&#x1F525;' : '';
    var tierLabel = streak >= 30 ? ' (3x Rewards!)' :
                    streak >= 14 ? ' (2x Rewards!)' :
                    streak >= 7  ? ' (1.5x Rewards!)' : '';

    return '<div class="streak-display">' +
      '<span class="streak-fire">' + fireEmoji + '</span>' +
      '<span class="streak-count">' + streak + '</span>' +
      '<span class="streak-label"> day streak' + tierLabel + '</span>' +
      '<div class="streak-multiplier-badge">x' + multiplier.toFixed(1) + '</div>' +
    '</div>';
  }

  // ============================================================================
  // INTERNAL HELPERS
  // ============================================================================

  /**
   * Shallow-copy the top-level state plus deep-copy activeChallenges and arrays.
   * @param {Object} state
   * @returns {Object}
   */
  function shallowCopyState(state) {
    var s = {};
    var keys = Object.keys(state);
    for (var i = 0; i < keys.length; i++) {
      s[keys[i]] = state[keys[i]];
    }
    // Deep copy mutable arrays
    s.activeChallenges = (state.activeChallenges || []).map(function(c) {
      return copyChallenge(c, c.progress, c.completed);
    });
    s.completedToday = (state.completedToday || []).slice();
    s.history = (state.history || []).slice();
    return s;
  }

  /**
   * Find a challenge in state.activeChallenges by ID (returns reference into copy).
   * @param {Object} state
   * @param {string} challengeId
   * @returns {Object|null}
   */
  function findActive(state, challengeId) {
    var challenges = state.activeChallenges || [];
    for (var i = 0; i < challenges.length; i++) {
      if (challenges[i].id === challengeId) {
        return challenges[i];
      }
    }
    return null;
  }

  // ============================================================================
  // EXPORTS
  // ============================================================================

  exports.CHALLENGE_POOL         = CHALLENGE_POOL;
  exports.SEASONAL_CHALLENGES    = SEASONAL_CHALLENGES;
  exports.STREAK_TIERS           = STREAK_TIERS;
  exports.WEEKLY_META_THRESHOLD  = WEEKLY_META_THRESHOLD;

  exports.createDailyState       = createDailyState;
  exports.generateDailyChallenges = generateDailyChallenges;
  exports.updateProgress         = updateProgress;
  exports.completeChallenge      = completeChallenge;
  exports.getActiveChallenges    = getActiveChallenges;
  exports.getStreak              = getStreak;
  exports.getStreakMultiplier    = getStreakMultiplier;
  exports.checkWeeklyMeta        = checkWeeklyMeta;
  exports.getWeeklyReward        = getWeeklyReward;
  exports.resetDaily             = resetDaily;
  exports.getChallengeById       = getChallengeById;
  exports.formatChallengeCard    = formatChallengeCard;
  exports.formatStreakDisplay    = formatStreakDisplay;
  exports.getCompletionHistory   = getCompletionHistory;
  exports.getSeasonalChallenge   = getSeasonalChallenge;

})(typeof module !== 'undefined' ? module.exports : (window.DailyChallenges = {}));
