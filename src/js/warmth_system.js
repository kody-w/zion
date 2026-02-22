// warmth_system.js — GPS-based outdoor play tracking with gentle bonuses
(function(exports) {
  'use strict';

  // ─── CONSTANTS ────────────────────────────────────────────────────────────────

  var DAILY_WARMTH_CAP = 200;
  var DECAY_TICKS = 100;
  var DECAY_AMOUNT = 10;
  var MIN_WALKING_SPEED_KMH = 1.0;
  var MAX_WALKING_SPEED_KMH = 6.0;
  var METERS_PER_DEGREE_LAT = 111320;
  var TICKS_PER_DAY = 1440; // 1 tick = 1 minute, 1440 ticks = 1 day
  var STREAK_BONUS_PER_DAY = 5; // extra warmth per streak day
  var MAX_STREAK_BONUS = 50;

  // 5 warmth tiers: threshold is minimum points for this tier
  var WARMTH_TIERS = [
    {
      id: 'cold',
      name: 'Cold',
      minPoints: 0,
      maxPoints: 24,
      harvestBonus: 0,
      discoveryBonus: 0,
      sparkBonus: 0,
      description: 'Just getting started. Step outside!',
      color: '#8ab4d4'
    },
    {
      id: 'cool',
      name: 'Cool',
      minPoints: 25,
      maxPoints: 99,
      harvestBonus: 0.05,
      discoveryBonus: 0.05,
      sparkBonus: 0.05,
      description: 'Moving nicely. Keep walking!',
      color: '#72c8c8'
    },
    {
      id: 'warm',
      name: 'Warm',
      minPoints: 100,
      maxPoints: 249,
      harvestBonus: 0.10,
      discoveryBonus: 0.10,
      sparkBonus: 0.08,
      description: 'Warmth growing. You feel energized.',
      color: '#f0b060'
    },
    {
      id: 'heated',
      name: 'Heated',
      minPoints: 250,
      maxPoints: 499,
      harvestBonus: 0.20,
      discoveryBonus: 0.15,
      sparkBonus: 0.12,
      description: 'Glowing with outdoor energy!',
      color: '#e07830'
    },
    {
      id: 'radiant',
      name: 'Radiant',
      minPoints: 500,
      maxPoints: Infinity,
      harvestBonus: 0.25,
      discoveryBonus: 0.20,
      sparkBonus: 0.15,
      description: 'Radiant with the spirit of adventure!',
      color: '#ffd040'
    }
  ];

  // 8 zone badges — one per ZION zone
  var ZONE_BADGES = [
    {
      id: 'badge_nexus',
      zone: 'nexus',
      name: 'Nexus Walker',
      description: 'Walk outdoors near The Nexus zone',
      icon: 'star',
      requiredSteps: 500
    },
    {
      id: 'badge_gardens',
      zone: 'gardens',
      name: 'Garden Wanderer',
      description: 'Walk outdoors near The Gardens zone',
      icon: 'leaf',
      requiredSteps: 500
    },
    {
      id: 'badge_athenaeum',
      zone: 'athenaeum',
      name: 'Scholar Stroller',
      description: 'Walk outdoors near The Athenaeum zone',
      icon: 'book',
      requiredSteps: 500
    },
    {
      id: 'badge_studio',
      zone: 'studio',
      name: 'Studio Pacer',
      description: 'Walk outdoors near The Studio zone',
      icon: 'brush',
      requiredSteps: 500
    },
    {
      id: 'badge_wilds',
      zone: 'wilds',
      name: 'Wild Rover',
      description: 'Walk outdoors near The Wilds zone',
      icon: 'tree',
      requiredSteps: 750
    },
    {
      id: 'badge_agora',
      zone: 'agora',
      name: 'Agora Ambler',
      description: 'Walk outdoors near The Agora zone',
      icon: 'people',
      requiredSteps: 500
    },
    {
      id: 'badge_commons',
      zone: 'commons',
      name: 'Commons Cruiser',
      description: 'Walk outdoors near The Commons zone',
      icon: 'home',
      requiredSteps: 500
    },
    {
      id: 'badge_arena',
      zone: 'arena',
      name: 'Arena Athlete',
      description: 'Walk outdoors near The Arena zone',
      icon: 'shield',
      requiredSteps: 1000
    }
  ];

  // Seasonal warmth gain multipliers
  var SEASON_MULTIPLIERS = {
    winter: 1.5,
    spring: 1.0,
    summer: 0.8,
    autumn: 1.0
  };

  // ─── PRNG ─────────────────────────────────────────────────────────────────────

  function mulberry32(seed) {
    var s = seed >>> 0;
    return function() {
      s += 0x6D2B79F5;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ─── UTILITY FUNCTIONS ────────────────────────────────────────────────────────

  /**
   * Calculate distance between two GPS coordinates in meters using Haversine
   */
  function haversineDistance(lat1, lon1, lat2, lon2) {
    var R = 6371000; // Earth radius in meters
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLon = (lon2 - lon1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Get day key from tick (1440 ticks per day)
   */
  function getDayKey(tick) {
    return Math.floor(tick / TICKS_PER_DAY);
  }

  /**
   * Get the tier object for a given points total
   */
  function getTierForPoints(points) {
    var tier = WARMTH_TIERS[0];
    for (var i = 0; i < WARMTH_TIERS.length; i++) {
      if (points >= WARMTH_TIERS[i].minPoints) {
        tier = WARMTH_TIERS[i];
      }
    }
    return tier;
  }

  /**
   * Ensure player record exists in state
   */
  function ensurePlayer(state, playerId) {
    if (!state.players[playerId]) {
      state.players[playerId] = {
        playerId: playerId,
        warmthPoints: 0,
        lastMoveTick: -1,
        lastLat: null,
        lastLon: null,
        dailyWarmthEarned: {},   // dayKey -> points earned that day
        warmthHistory: [],        // recent events
        earnedBadges: {},         // zone -> true
        zoneSteps: {},            // zone -> step count
        streak: 0,                // consecutive days
        lastActiveDay: -1,        // day key of last active day
        loginDays: {},            // dayKey -> true
        totalWarmthEarned: 0
      };
    }
    return state.players[playerId];
  }

  // ─── STATE ────────────────────────────────────────────────────────────────────

  /**
   * Create initial warmth system state
   */
  function createState() {
    return {
      players: {},
      warmthLog: []
    };
  }

  // ─── CORE FUNCTIONS ───────────────────────────────────────────────────────────

  /**
   * Get seasonal warmth multiplier
   */
  function getSeasonMultiplier(season) {
    if (!season) return 1.0;
    return SEASON_MULTIPLIERS[season] !== undefined ? SEASON_MULTIPLIERS[season] : 1.0;
  }

  /**
   * Get tier name for a point total
   */
  function getTierName(points) {
    return getTierForPoints(points).name;
  }

  /**
   * Get warmth bonuses for a player
   */
  function getBonuses(state, playerId) {
    var player = ensurePlayer(state, playerId);
    var tier = getTierForPoints(player.warmthPoints);
    var streakMult = 1 + Math.min(player.streak * 0.02, 0.20); // up to +20% from streak
    return {
      harvestBonus: tier.harvestBonus * streakMult,
      discoveryBonus: tier.discoveryBonus * streakMult,
      sparkBonus: tier.sparkBonus * streakMult
    };
  }

  /**
   * Get remaining daily warmth capacity for a player
   */
  function getDailyWarmthRemaining(state, playerId, currentTick) {
    var player = ensurePlayer(state, playerId);
    var dayKey = getDayKey(currentTick);
    var earned = (player.dailyWarmthEarned[dayKey] || 0);
    return Math.max(0, DAILY_WARMTH_CAP - earned);
  }

  /**
   * Record a GPS movement for a player, awarding warmth if speed is in walking range
   * @returns {Object} {success, warmthGained, speed, tier}
   */
  function recordMovement(state, playerId, lat, lng, currentTick, season, zone) {
    var player = ensurePlayer(state, playerId);

    // If no prior position, just record and return
    if (player.lastLat === null || player.lastLon === null || player.lastMoveTick < 0) {
      player.lastLat = lat;
      player.lastLon = lng;
      player.lastMoveTick = currentTick;
      return { success: false, warmthGained: 0, speed: 0, tier: getTierForPoints(player.warmthPoints).id };
    }

    // Calculate time delta in hours
    var tickDelta = currentTick - player.lastMoveTick;
    if (tickDelta <= 0) {
      return { success: false, warmthGained: 0, speed: 0, tier: getTierForPoints(player.warmthPoints).id };
    }
    var hoursElapsed = tickDelta / 60; // 1 tick = 1 minute

    // Calculate distance in km
    var distanceMeters = haversineDistance(player.lastLat, player.lastLon, lat, lng);
    var distanceKm = distanceMeters / 1000;

    // Calculate speed in km/h
    var speed = hoursElapsed > 0 ? distanceKm / hoursElapsed : 0;

    // Update position and tick
    player.lastLat = lat;
    player.lastLon = lng;
    player.lastMoveTick = currentTick;

    // Check if speed is in walking range
    if (speed < MIN_WALKING_SPEED_KMH || speed > MAX_WALKING_SPEED_KMH) {
      return {
        success: false,
        warmthGained: 0,
        speed: speed,
        tier: getTierForPoints(player.warmthPoints).id,
        reason: speed < MIN_WALKING_SPEED_KMH ? 'too_slow' : 'too_fast'
      };
    }

    // Calculate base warmth gain proportional to distance (1 point per 100m of walking)
    var baseGain = Math.floor(distanceMeters / 100);
    if (baseGain < 1) baseGain = 1;

    // Apply seasonal multiplier
    var seasonMult = getSeasonMultiplier(season || 'spring');
    var scaledGain = Math.ceil(baseGain * seasonMult);

    // Apply streak bonus
    var streakBonus = Math.min(player.streak * STREAK_BONUS_PER_DAY, MAX_STREAK_BONUS);
    scaledGain += Math.floor(streakBonus * 0.1); // 10% of streak bonus added to each gain

    // Check daily cap
    var dayKey = getDayKey(currentTick);
    var alreadyEarned = player.dailyWarmthEarned[dayKey] || 0;
    var remaining = Math.max(0, DAILY_WARMTH_CAP - alreadyEarned);

    if (remaining <= 0) {
      return {
        success: false,
        warmthGained: 0,
        speed: speed,
        tier: getTierForPoints(player.warmthPoints).id,
        reason: 'daily_cap_reached'
      };
    }

    var actualGain = Math.min(scaledGain, remaining);

    // Apply warmth
    player.warmthPoints += actualGain;
    player.totalWarmthEarned += actualGain;
    player.dailyWarmthEarned[dayKey] = alreadyEarned + actualGain;

    // Track zone steps if zone provided
    if (zone) {
      player.zoneSteps[zone] = (player.zoneSteps[zone] || 0) + Math.floor(distanceMeters / 0.75); // ~0.75m per step
      checkAndAwardBadge(state, player, zone);
    }

    // Record history event
    var event = {
      tick: currentTick,
      type: 'movement',
      warmthGained: actualGain,
      speed: speed,
      distanceMeters: distanceMeters,
      zone: zone || null,
      season: season || null
    };
    player.warmthHistory.push(event);
    if (player.warmthHistory.length > 50) {
      player.warmthHistory.shift();
    }

    // Global log
    state.warmthLog.push({ playerId: playerId, tick: currentTick, warmthGained: actualGain });
    if (state.warmthLog.length > 200) {
      state.warmthLog.shift();
    }

    return {
      success: true,
      warmthGained: actualGain,
      speed: speed,
      tier: getTierForPoints(player.warmthPoints).id
    };
  }

  /**
   * Check if a zone badge should be awarded and award it
   */
  function checkAndAwardBadge(state, player, zone) {
    if (player.earnedBadges[zone]) return; // already earned

    var badge = null;
    for (var i = 0; i < ZONE_BADGES.length; i++) {
      if (ZONE_BADGES[i].zone === zone) {
        badge = ZONE_BADGES[i];
        break;
      }
    }
    if (!badge) return;

    var steps = player.zoneSteps[zone] || 0;
    if (steps >= badge.requiredSteps) {
      player.earnedBadges[zone] = true;
      var event = {
        tick: player.lastMoveTick,
        type: 'badge_earned',
        zone: zone,
        badgeId: badge.id,
        badgeName: badge.name
      };
      player.warmthHistory.push(event);
    }
  }

  /**
   * Get warmth info for a player
   */
  function getWarmth(state, playerId) {
    var player = ensurePlayer(state, playerId);
    var tier = getTierForPoints(player.warmthPoints);
    var bonuses = getBonuses(state, playerId);
    return {
      points: player.warmthPoints,
      tier: tier.id,
      tierName: tier.name,
      bonuses: bonuses,
      streak: player.streak
    };
  }

  /**
   * Apply decay to all inactive players
   * Loses DECAY_AMOUNT points per DECAY_TICKS ticks of inactivity
   */
  function applyDecay(state, currentTick) {
    var decayed = [];
    var playerIds = Object.keys(state.players);
    for (var i = 0; i < playerIds.length; i++) {
      var playerId = playerIds[i];
      var player = state.players[playerId];
      if (player.warmthPoints <= 0) continue;

      var inactiveTicks = (player.lastMoveTick >= 0)
        ? currentTick - player.lastMoveTick
        : currentTick;

      if (inactiveTicks >= DECAY_TICKS) {
        var decayCount = Math.floor(inactiveTicks / DECAY_TICKS);
        var decayAmount = decayCount * DECAY_AMOUNT;
        var oldPoints = player.warmthPoints;
        player.warmthPoints = Math.max(0, player.warmthPoints - decayAmount);
        if (player.warmthPoints < oldPoints) {
          decayed.push({
            playerId: playerId,
            oldPoints: oldPoints,
            newPoints: player.warmthPoints,
            decayAmount: oldPoints - player.warmthPoints
          });
        }
      }
    }
    return { decayed: decayed };
  }

  /**
   * Get earned zone badges for a player
   */
  function getWarmthBadges(state, playerId) {
    var player = ensurePlayer(state, playerId);
    var earned = [];
    for (var i = 0; i < ZONE_BADGES.length; i++) {
      var badge = ZONE_BADGES[i];
      if (player.earnedBadges[badge.zone]) {
        earned.push({
          badgeId: badge.id,
          zone: badge.zone,
          name: badge.name,
          description: badge.description,
          icon: badge.icon
        });
      }
    }
    return earned;
  }

  /**
   * Check if player has earned badge for a specific zone
   */
  function checkBadge(state, playerId, zone) {
    var player = ensurePlayer(state, playerId);
    return !!player.earnedBadges[zone];
  }

  /**
   * Get warmth leaderboard
   */
  function getWarmthLeaderboard(state, count) {
    var limit = (count !== undefined && count !== null) ? count : 10;
    var players = Object.values(state.players);
    players.sort(function(a, b) { return b.warmthPoints - a.warmthPoints; });
    return players.slice(0, limit).map(function(p, idx) {
      return {
        rank: idx + 1,
        playerId: p.playerId,
        warmthPoints: p.warmthPoints,
        tier: getTierForPoints(p.warmthPoints).id,
        tierName: getTierForPoints(p.warmthPoints).name,
        streak: p.streak
      };
    });
  }

  /**
   * Get current daily streak info for a player
   */
  function getStreak(state, playerId) {
    var player = ensurePlayer(state, playerId);
    return {
      streak: player.streak,
      lastActiveDay: player.lastActiveDay,
      streakBonus: Math.min(player.streak * STREAK_BONUS_PER_DAY, MAX_STREAK_BONUS)
    };
  }

  /**
   * Record a daily login/activity for streak tracking
   */
  function recordDailyLogin(state, playerId, currentTick) {
    var player = ensurePlayer(state, playerId);
    var dayKey = getDayKey(currentTick);

    if (player.loginDays[dayKey]) {
      // Already logged in today
      return { streak: player.streak, newDay: false };
    }

    player.loginDays[dayKey] = true;

    // Check if this is a consecutive day
    var yesterday = dayKey - 1;
    if (player.lastActiveDay === yesterday) {
      player.streak += 1;
    } else if (player.lastActiveDay < yesterday) {
      // Streak broken (or first login)
      player.streak = 1;
    }
    // If lastActiveDay === dayKey we already handled above

    player.lastActiveDay = dayKey;

    return { streak: player.streak, newDay: true };
  }

  /**
   * Get recent warmth history for a player
   */
  function getWarmthHistory(state, playerId, count) {
    var player = ensurePlayer(state, playerId);
    var limit = count || 10;
    var history = player.warmthHistory.slice();
    history.sort(function(a, b) { return b.tick - a.tick; });
    return history.slice(0, limit);
  }

  /**
   * Get comprehensive stats for a player
   */
  function getPlayerStats(state, playerId) {
    var player = ensurePlayer(state, playerId);
    var tier = getTierForPoints(player.warmthPoints);
    var bonuses = getBonuses(state, playerId);
    var badges = getWarmthBadges(state, playerId);
    return {
      playerId: playerId,
      warmthPoints: player.warmthPoints,
      tier: tier.id,
      tierName: tier.name,
      tierDescription: tier.description,
      bonuses: bonuses,
      streak: player.streak,
      totalWarmthEarned: player.totalWarmthEarned,
      badgesEarned: badges.length,
      badges: badges,
      zoneSteps: player.zoneSteps,
      historyCount: player.warmthHistory.length
    };
  }

  /**
   * Get aggregate warmth in a zone (sum of all players who have steps in that zone)
   */
  function getZoneWarmth(state, zone) {
    var total = 0;
    var playerCount = 0;
    var playerIds = Object.keys(state.players);
    for (var i = 0; i < playerIds.length; i++) {
      var player = state.players[playerIds[i]];
      if (player.zoneSteps && player.zoneSteps[zone]) {
        total += player.warmthPoints;
        playerCount++;
      }
    }
    return {
      zone: zone,
      totalWarmth: total,
      activePlayers: playerCount
    };
  }

  // ─── EXPORTS ──────────────────────────────────────────────────────────────────

  exports.WARMTH_TIERS = WARMTH_TIERS;
  exports.ZONE_BADGES = ZONE_BADGES;
  exports.SEASON_MULTIPLIERS = SEASON_MULTIPLIERS;
  exports.DAILY_WARMTH_CAP = DAILY_WARMTH_CAP;
  exports.DECAY_TICKS = DECAY_TICKS;
  exports.DECAY_AMOUNT = DECAY_AMOUNT;
  exports.MIN_WALKING_SPEED_KMH = MIN_WALKING_SPEED_KMH;
  exports.MAX_WALKING_SPEED_KMH = MAX_WALKING_SPEED_KMH;
  exports.TICKS_PER_DAY = TICKS_PER_DAY;
  exports.createState = createState;
  exports.recordMovement = recordMovement;
  exports.getWarmth = getWarmth;
  exports.getTierName = getTierName;
  exports.getBonuses = getBonuses;
  exports.applyDecay = applyDecay;
  exports.getWarmthBadges = getWarmthBadges;
  exports.checkBadge = checkBadge;
  exports.getWarmthLeaderboard = getWarmthLeaderboard;
  exports.getStreak = getStreak;
  exports.recordDailyLogin = recordDailyLogin;
  exports.getSeasonMultiplier = getSeasonMultiplier;
  exports.getWarmthHistory = getWarmthHistory;
  exports.getPlayerStats = getPlayerStats;
  exports.getDailyWarmthRemaining = getDailyWarmthRemaining;
  exports.getZoneWarmth = getZoneWarmth;
  exports.mulberry32 = mulberry32;
  exports.haversineDistance = haversineDistance;

})(typeof module !== 'undefined' ? module.exports : (window.WarmthSystem = {}));
