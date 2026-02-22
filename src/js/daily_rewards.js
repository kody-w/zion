/**
 * ZION Daily Login Rewards System
 * Tracks consecutive login streaks and awards escalating rewards
 * Depends on: economy.js (Spark), inventory.js (items)
 */

(function(exports) {
  'use strict';

  // =========================================================================
  // CONSTANTS
  // =========================================================================

  var GRACE_PERIOD_HOURS = 36;

  // 7-day reward calendar — cycles every 7 days
  var REWARD_CALENDAR = [
    {
      day: 1,
      label: 'Day 1',
      type: 'spark',
      spark: 5,
      item: null,
      description: '5 Spark to start your journey'
    },
    {
      day: 2,
      label: 'Day 2',
      type: 'item',
      spark: 0,
      item: { id: 'seed_wildflower', count: 3 },
      description: '3 Wildflower Seeds'
    },
    {
      day: 3,
      label: 'Day 3',
      type: 'spark',
      spark: 10,
      item: null,
      description: '10 Spark'
    },
    {
      day: 4,
      label: 'Day 4',
      type: 'item',
      spark: 0,
      item: { id: 'wood_oak', count: 5 },
      description: '5 Oak Wood (crafting material)'
    },
    {
      day: 5,
      label: 'Day 5',
      type: 'spark',
      spark: 15,
      item: null,
      description: '15 Spark'
    },
    {
      day: 6,
      label: 'Day 6',
      type: 'rare_chance',
      spark: 5,
      item: { id: 'crystal_amethyst', count: 1 },
      rareChance: 0.25,
      rareFallbackItem: { id: 'stone_marble', count: 2 },
      description: '5 Spark + chance at Amethyst'
    },
    {
      day: 7,
      label: 'Day 7 (Weekly Bonus)',
      type: 'jackpot',
      spark: 25,
      item: { id: 'potion_wisdom', count: 1 },
      description: '25 Spark + Wisdom Potion'
    }
  ];

  // Streak bonus multipliers applied to Spark rewards
  var STREAK_BONUSES = [
    { minStreak: 30, multiplier: 3.0,  label: 'Legendary Streak' },
    { minStreak: 14, multiplier: 2.5,  label: 'Epic Streak' },
    { minStreak: 7,  multiplier: 2.0,  label: 'Great Streak' },
    { minStreak: 3,  multiplier: 1.5,  label: 'Good Streak' },
    { minStreak: 1,  multiplier: 1.0,  label: 'Active' }
  ];

  // =========================================================================
  // HELPERS
  // =========================================================================

  /**
   * Returns start-of-day timestamp (midnight UTC) for a given timestamp.
   * @param {number} ts - Unix timestamp in milliseconds
   * @returns {number} Midnight UTC timestamp in ms
   */
  function dayStart(ts) {
    var d = new Date(ts);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }

  /**
   * Returns the number of whole days between two timestamps (a - b).
   * @param {number} tsA
   * @param {number} tsB
   * @returns {number}
   */
  function daysDiff(tsA, tsB) {
    var msPerDay = 24 * 60 * 60 * 1000;
    return Math.floor((dayStart(tsA) - dayStart(tsB)) / msPerDay);
  }

  /**
   * Initialise player daily-reward state if missing.
   * @param {Object} playerData
   * @returns {Object} Mutated playerData with dailyRewards initialised
   */
  function ensureState(playerData) {
    if (!playerData.dailyRewards) {
      playerData.dailyRewards = {
        streak: 0,
        lastClaimTs: null,
        history: [],
        lifetimeSpark: 0,
        lifetimeItems: []
      };
    }
    return playerData;
  }

  // =========================================================================
  // STREAK
  // =========================================================================

  /**
   * Returns the current consecutive login streak for a player.
   * Automatically resets the streak if the grace period has passed.
   * @param {Object} playerData
   * @returns {number}
   */
  function getStreak(playerData) {
    ensureState(playerData);
    var dr = playerData.dailyRewards;
    if (dr.lastClaimTs === null) {
      return 0;
    }
    var now = Date.now();
    var gracePeriodMs = GRACE_PERIOD_HOURS * 60 * 60 * 1000;
    var elapsed = now - dr.lastClaimTs;
    // If more than grace period has passed since last claim, streak is broken
    if (elapsed > gracePeriodMs) {
      return 0;
    }
    return dr.streak;
  }

  /**
   * Returns the streak bonus descriptor for a given streak count.
   * @param {number} streak
   * @returns {Object} {multiplier, label}
   */
  function getStreakBonus(streak) {
    for (var i = 0; i < STREAK_BONUSES.length; i++) {
      if (streak >= STREAK_BONUSES[i].minStreak) {
        return {
          multiplier: STREAK_BONUSES[i].multiplier,
          label: STREAK_BONUSES[i].label
        };
      }
    }
    return { multiplier: 1.0, label: 'No Streak' };
  }

  /**
   * Applies streak multiplier to a base Spark amount, rounding down.
   * @param {number} baseReward - Base Spark amount
   * @param {number} streak     - Current streak
   * @returns {number}
   */
  function calculateStreakReward(baseReward, streak) {
    var bonus = getStreakBonus(streak);
    return Math.floor(baseReward * bonus.multiplier);
  }

  /**
   * Resets a player's streak immediately (called when grace period is missed).
   * @param {Object} playerData
   * @returns {Object} Mutated playerData
   */
  function resetStreak(playerData) {
    ensureState(playerData);
    playerData.dailyRewards.streak = 0;
    return playerData;
  }

  // =========================================================================
  // CALENDAR
  // =========================================================================

  /**
   * Returns the reward descriptor for a given day number (1-indexed, cycles).
   * @param {number} dayNumber - 1-based day number (wraps every 7 days)
   * @returns {Object} Reward descriptor from REWARD_CALENDAR
   */
  function getDailyReward(dayNumber) {
    var index = ((dayNumber - 1) % 7 + 7) % 7;
    return REWARD_CALENDAR[index];
  }

  /**
   * Returns the next reward the player will receive (tomorrow's reward).
   * @param {Object} playerData
   * @returns {Object} Reward descriptor
   */
  function getNextReward(playerData) {
    ensureState(playerData);
    var dr = playerData.dailyRewards;
    var currentStreak = getStreak(playerData);
    // Next claim will be on streak + 1 if they haven't broken streak, else day 1
    var nextDay = currentStreak + 1;
    return getDailyReward(nextDay);
  }

  /**
   * Returns a 7-element calendar view showing which days are claimed/upcoming.
   * @param {Object} playerData
   * @returns {Array} Array of {day, label, description, type, claimed, current, upcoming}
   */
  function getCalendarView(playerData) {
    ensureState(playerData);
    var currentStreak = getStreak(playerData);
    var canClaimNow = canClaim(null, playerData);

    var result = [];
    for (var i = 0; i < 7; i++) {
      var dayNum = i + 1;
      var reward = REWARD_CALENDAR[i];
      var claimed = dayNum <= currentStreak;
      // If player can claim today, mark the next day as "current"
      var current = canClaimNow && dayNum === (currentStreak + 1);
      // If player already claimed today, mark today's day as current (not future)
      if (!canClaimNow && dayNum === currentStreak) {
        current = true;
        claimed = false; // just claimed
      }
      result.push({
        day: dayNum,
        label: reward.label,
        description: reward.description,
        type: reward.type,
        spark: reward.spark,
        item: reward.item,
        claimed: claimed,
        current: current,
        upcoming: !claimed && !current
      });
    }
    return result;
  }

  // =========================================================================
  // CLAIM VALIDATION
  // =========================================================================

  /**
   * Returns true if the player can claim their daily reward right now.
   * @param {string|null} playerId - Unused; kept for API consistency
   * @param {Object} playerData
   * @returns {boolean}
   */
  function canClaim(playerId, playerData) {
    ensureState(playerData);
    var dr = playerData.dailyRewards;
    if (dr.lastClaimTs === null) {
      return true;
    }
    var now = Date.now();
    var diff = daysDiff(now, dr.lastClaimTs);
    return diff >= 1;
  }

  // =========================================================================
  // CLAIM
  // =========================================================================

  /**
   * Claims today's daily reward for a player.
   * @param {string} playerId
   * @param {Object} playerData
   * @param {Object} [options]  - {now: number} override for testing
   * @returns {Object} {success, reward, streakBonus, newStreak, message}
   */
  function claimDailyReward(playerId, playerData, options) {
    ensureState(playerData);
    var dr = playerData.dailyRewards;
    var now = (options && options.now) ? options.now : Date.now();

    // Check if can claim
    if (dr.lastClaimTs !== null) {
      var diff = daysDiff(now, dr.lastClaimTs);
      if (diff < 1) {
        return {
          success: false,
          message: 'Already claimed today',
          nextClaimTs: dayStart(dr.lastClaimTs) + 24 * 60 * 60 * 1000
        };
      }
    }

    // Determine if streak continues or resets
    var gracePeriodMs = GRACE_PERIOD_HOURS * 60 * 60 * 1000;
    var streakContinues = (dr.lastClaimTs === null) ? false :
                          (now - dr.lastClaimTs) <= gracePeriodMs;

    var newStreak;
    if (dr.lastClaimTs === null) {
      newStreak = 1;
    } else if (streakContinues) {
      newStreak = dr.streak + 1;
    } else {
      // Grace period passed — reset to 1
      newStreak = 1;
    }

    // Get reward for this streak day (cycles every 7)
    var reward = getDailyReward(newStreak);

    // Calculate streak-boosted Spark
    var baseSpark = reward.spark || 0;
    var boostedSpark = calculateStreakReward(baseSpark, newStreak);
    var streakBonus = getStreakBonus(newStreak);

    // Resolve item for rare_chance type
    var awardedItem = null;
    if (reward.type === 'rare_chance') {
      var roll = Math.random();
      awardedItem = (roll < reward.rareChance) ? reward.item : reward.rareFallbackItem;
    } else {
      awardedItem = reward.item;
    }

    // Build claim record
    var claimRecord = {
      ts: now,
      day: newStreak,
      calendarDay: ((newStreak - 1) % 7) + 1,
      spark: boostedSpark,
      baseSpark: baseSpark,
      item: awardedItem,
      streakMultiplier: streakBonus.multiplier,
      streakLabel: streakBonus.label
    };

    // Update player state
    dr.streak = newStreak;
    dr.lastClaimTs = now;
    dr.history.push(claimRecord);
    dr.lifetimeSpark += boostedSpark;
    if (awardedItem) {
      dr.lifetimeItems.push({ ts: now, item: awardedItem });
    }

    return {
      success: true,
      reward: {
        spark: boostedSpark,
        baseSpark: baseSpark,
        item: awardedItem,
        description: reward.description
      },
      streakBonus: streakBonus,
      newStreak: newStreak,
      message: 'Reward claimed!'
    };
  }

  // =========================================================================
  // HISTORY
  // =========================================================================

  /**
   * Returns recent claim history for a player.
   * @param {Object} playerData
   * @param {number} [limit=10] - Max records to return
   * @returns {Array} Most recent claims first
   */
  function getRewardHistory(playerData, limit) {
    ensureState(playerData);
    var history = playerData.dailyRewards.history;
    var n = (limit === undefined || limit === null) ? 10 : limit;
    var start = Math.max(0, history.length - n);
    return history.slice(start).reverse();
  }

  /**
   * Returns lifetime reward totals for a player.
   * @param {Object} playerData
   * @returns {Object} {totalSpark, totalItemCount, totalClaims, items}
   */
  function getLifetimeRewards(playerData) {
    ensureState(playerData);
    var dr = playerData.dailyRewards;
    return {
      totalSpark: dr.lifetimeSpark,
      totalItemCount: dr.lifetimeItems.length,
      totalClaims: dr.history.length,
      items: dr.lifetimeItems.slice()
    };
  }

  // =========================================================================
  // FORMATTING
  // =========================================================================

  /**
   * Formats a reward descriptor into a human-readable string.
   * @param {Object} reward - Reward descriptor or claim record
   * @returns {string}
   */
  function formatReward(reward) {
    var parts = [];
    if (reward.spark && reward.spark > 0) {
      parts.push(reward.spark + ' Spark');
    }
    if (reward.baseSpark && reward.baseSpark > 0 && reward.spark !== reward.baseSpark) {
      parts.push(reward.spark + ' Spark (x' + reward.streakMultiplier + ' streak bonus)');
      // Remove the plain spark entry added above
      parts.shift();
    }
    if (reward.item) {
      var itemStr = reward.item.id;
      if (reward.item.count && reward.item.count > 1) {
        itemStr = reward.item.count + 'x ' + reward.item.id;
      }
      parts.push(itemStr);
    }
    if (reward.description && parts.length === 0) {
      return reward.description;
    }
    return parts.length > 0 ? parts.join(' + ') : 'No reward';
  }

  // =========================================================================
  // EXPORTS
  // =========================================================================

  exports.REWARD_CALENDAR = REWARD_CALENDAR;
  exports.STREAK_BONUSES = STREAK_BONUSES;
  exports.GRACE_PERIOD_HOURS = GRACE_PERIOD_HOURS;

  exports.claimDailyReward = claimDailyReward;
  exports.getDailyReward = getDailyReward;
  exports.getStreak = getStreak;
  exports.getStreakBonus = getStreakBonus;
  exports.canClaim = canClaim;
  exports.getNextReward = getNextReward;
  exports.getRewardHistory = getRewardHistory;
  exports.calculateStreakReward = calculateStreakReward;
  exports.resetStreak = resetStreak;
  exports.getCalendarView = getCalendarView;
  exports.formatReward = formatReward;
  exports.getLifetimeRewards = getLifetimeRewards;

  // Expose helpers for testing
  exports._dayStart = dayStart;
  exports._daysDiff = daysDiff;

})(typeof module !== 'undefined' ? module.exports : (window.DailyRewards = {}));
