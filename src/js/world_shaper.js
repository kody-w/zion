/**
 * ZION World Shaper System
 * Players permanently modify terrain and zones through actions.
 * All changes stored as diffs for full audit trail.
 */

(function(exports) {
  'use strict';

  // ============================================================================
  // PRNG — mulberry32
  // ============================================================================

  function mulberry32(seed) {
    var s = seed >>> 0;
    return function() {
      s += 0x6D2B79F5;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ============================================================================
  // CONSTANTS
  // ============================================================================

  var TERRAIN_TYPES = [
    'grass',
    'dirt',
    'stone',
    'sand',
    'water',
    'snow',
    'forest',
    'urban'
  ];

  var RESOURCE_TYPES = [
    { id: 'iron_ore',      label: 'Iron Ore',       regenRate: 0.05, maxAmount: 100, zone: 'wilds' },
    { id: 'copper_ore',    label: 'Copper Ore',      regenRate: 0.06, maxAmount: 80,  zone: 'wilds' },
    { id: 'crystal',       label: 'Crystal',         regenRate: 0.02, maxAmount: 50,  zone: 'athenaeum' },
    { id: 'ancient_wood',  label: 'Ancient Wood',    regenRate: 0.03, maxAmount: 60,  zone: 'wilds' },
    { id: 'wild_herb',     label: 'Wild Herb',       regenRate: 0.10, maxAmount: 120, zone: 'gardens' },
    { id: 'rare_flower',   label: 'Rare Flower',     regenRate: 0.04, maxAmount: 40,  zone: 'gardens' },
    { id: 'river_clay',    label: 'River Clay',      regenRate: 0.08, maxAmount: 90,  zone: 'commons' },
    { id: 'sand_glass',    label: 'Sand Glass',      regenRate: 0.07, maxAmount: 70,  zone: 'arena' },
    { id: 'moonstone',     label: 'Moonstone',       regenRate: 0.01, maxAmount: 30,  zone: 'nexus' },
    { id: 'spark_shard',   label: 'Spark Shard',     regenRate: 0.02, maxAmount: 40,  zone: 'nexus' },
    { id: 'pine_resin',    label: 'Pine Resin',      regenRate: 0.09, maxAmount: 100, zone: 'wilds' },
    { id: 'market_cloth',  label: 'Market Cloth',    regenRate: 0.12, maxAmount: 150, zone: 'agora' },
    { id: 'silk_thread',   label: 'Silk Thread',     regenRate: 0.06, maxAmount: 60,  zone: 'studio' },
    { id: 'pigment_dust',  label: 'Pigment Dust',    regenRate: 0.08, maxAmount: 80,  zone: 'studio' },
    { id: 'golden_grain',  label: 'Golden Grain',    regenRate: 0.15, maxAmount: 200, zone: 'gardens' },
    { id: 'blue_salt',     label: 'Blue Salt',       regenRate: 0.07, maxAmount: 75,  zone: 'arena' },
    { id: 'lore_fragment', label: 'Lore Fragment',   regenRate: 0.03, maxAmount: 35,  zone: 'athenaeum' },
    { id: 'void_dust',     label: 'Void Dust',       regenRate: 0.01, maxAmount: 20,  zone: 'nexus' },
    { id: 'common_stone',  label: 'Common Stone',    regenRate: 0.20, maxAmount: 300, zone: 'commons' },
    { id: 'ember_coal',    label: 'Ember Coal',      regenRate: 0.04, maxAmount: 60,  zone: 'arena' }
  ];

  // Cost table: base Spark cost per terrain operation
  var EDIT_COSTS = {
    flatten:   10,
    raise:     15,
    lower:     15,
    terraform: 25
  };

  // Area multiplier for larger edits (radius 1 = x1, radius 5 = x5)
  var AREA_COST_MULTIPLIER = 5;

  // Zone daily edit capacity
  var ZONE_DAILY_CAPACITY = 200;

  // Ticks per in-game day
  var TICKS_PER_DAY = 24;

  // Weather types with base probabilities
  var WEATHER_TYPES = ['clear', 'cloudy', 'rain', 'storm', 'snow', 'fog', 'wind'];

  // Base weather probabilities (must sum to 1)
  var BASE_WEATHER_PROBS = {
    clear:  0.30,
    cloudy: 0.25,
    rain:   0.20,
    storm:  0.10,
    snow:   0.05,
    fog:    0.07,
    wind:   0.03
  };

  // Aesthetic score thresholds
  var AESTHETIC_THRESHOLDS = {
    barren:   { harvest: 30, plant: 0,  build: 0  },
    green:    { harvest: 0,  plant: 30, build: 0  },
    urban:    { harvest: 0,  plant: 0,  build: 30 },
    balanced: { harvest: 5,  plant: 5,  build: 5  }
  };

  // Zone list used throughout
  var ZONES = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];

  // ============================================================================
  // STATE FACTORY
  // ============================================================================

  function createState() {
    var resources = {};
    var aesthetics = {};
    var weatherVotes = {};

    // Initialise resources from RESOURCE_TYPES
    for (var i = 0; i < RESOURCE_TYPES.length; i++) {
      var rt = RESOURCE_TYPES[i];
      var key = rt.id + ':' + rt.zone;
      resources[key] = {
        resourceId: rt.id,
        zone: rt.zone,
        amount: rt.maxAmount,
        maxAmount: rt.maxAmount,
        lastRegenTick: 0
      };
    }

    // Initialise aesthetics per zone
    for (var z = 0; z < ZONES.length; z++) {
      var zone = ZONES[z];
      aesthetics[zone] = {
        harvestCount: 0,
        plantCount: 0,
        buildCount: 0,
        type: 'balanced',
        score: 0,
        lastUpdatedTick: 0
      };
      weatherVotes[zone] = {};
    }

    return {
      edits:        [],
      resources:    resources,
      weatherVotes: weatherVotes,
      aesthetics:   aesthetics,
      diffLog:      []
    };
  }

  // ============================================================================
  // TERRAIN EDIT
  // ============================================================================

  function editTerrain(state, playerId, x, z, fromType, toType, currentTick) {
    // Validate types
    if (TERRAIN_TYPES.indexOf(fromType) === -1) {
      return { success: false, cost: 0, diff: null, error: 'invalid fromType: ' + fromType };
    }
    if (TERRAIN_TYPES.indexOf(toType) === -1) {
      return { success: false, cost: 0, diff: null, error: 'invalid toType: ' + toType };
    }
    if (fromType === toType) {
      return { success: false, cost: 0, diff: null, error: 'fromType and toType are the same' };
    }
    if (!playerId) {
      return { success: false, cost: 0, diff: null, error: 'playerId required' };
    }

    // Determine zone from coordinates (simple grid-based assignment)
    var zone = _coordToZone(x, z);

    // Check zone daily capacity
    var remaining = getZoneCapacity(state, zone, currentTick);
    if (remaining <= 0) {
      return { success: false, cost: 0, diff: null, error: 'zone edit capacity reached for today' };
    }

    // Compute cost — terraform is more expensive
    var op = (fromType !== toType) ? 'terraform' : 'flatten';
    // Map specific actions by type change
    if (toType === 'urban' || fromType === 'urban') {
      op = 'terraform';
    } else if (fromType === 'water' || toType === 'water') {
      op = 'lower';
    } else {
      op = 'terraform';
    }

    var baseCost = EDIT_COSTS[op] || EDIT_COSTS['terraform'];
    var cost = baseCost;

    var diff = {
      id: _genId(playerId, currentTick, x, z),
      playerId: playerId,
      x: x,
      z: z,
      fromType: fromType,
      toType: toType,
      op: op,
      cost: cost,
      zone: zone,
      tick: currentTick
    };

    state.edits.push(diff);
    state.diffLog.push(diff);

    // Update aesthetic counters
    _updateAestheticCounters(state, zone, fromType, toType, currentTick);

    return { success: true, cost: cost, diff: diff };
  }

  function _genId(playerId, tick, x, z) {
    return playerId + '_' + tick + '_' + x + '_' + z + '_' + Math.floor(Math.random() * 9999);
  }

  function _coordToZone(x, z) {
    // Simple zone mapping based on coordinate ranges (mirrors ZION architecture)
    if (Math.abs(x) < 80 && Math.abs(z) < 80)       return 'nexus';
    if (x > 120 && z > 10)                           return 'gardens';
    if (x > 50 && z < -170)                          return 'athenaeum';
    if (x < -130 && z < -50)                         return 'studio';
    if (x < 0 && z > 180)                            return 'wilds';
    if (x < -120 && z > 70)                          return 'agora';
    if (x > 100 && z > 130)                          return 'commons';
    if (Math.abs(x) < 60 && z < -180)                return 'arena';
    return 'nexus'; // fallback
  }

  function _updateAestheticCounters(state, zone, fromType, toType, currentTick) {
    if (!state.aesthetics[zone]) {
      state.aesthetics[zone] = { harvestCount: 0, plantCount: 0, buildCount: 0, type: 'balanced', score: 0, lastUpdatedTick: 0 };
    }
    var aes = state.aesthetics[zone];

    // Classify each edit into exactly one aesthetic category (most specific wins)
    if (toType === 'urban') {
      // Building always counts as build regardless of source type
      aes.buildCount++;
    } else if (toType === 'forest' || toType === 'grass') {
      // Planting / reforestation
      aes.plantCount++;
    } else if (fromType === 'forest' || fromType === 'grass') {
      // Removing natural terrain without replacing with nature = harvest / clearing
      aes.harvestCount++;
    }
    aes.lastUpdatedTick = currentTick;
  }

  // ============================================================================
  // GET TERRAIN AT COORDINATE
  // ============================================================================

  function getTerrainAt(state, x, z) {
    // Walk edits in reverse to find latest applied diff
    for (var i = state.edits.length - 1; i >= 0; i--) {
      var edit = state.edits[i];
      if (edit.x === x && edit.z === z) {
        return edit.toType;
      }
    }
    // Default terrain based on coordinate zone
    return _defaultTerrain(_coordToZone(x, z));
  }

  function _defaultTerrain(zone) {
    var defaults = {
      nexus:      'stone',
      gardens:    'grass',
      athenaeum:  'stone',
      studio:     'dirt',
      wilds:      'forest',
      agora:      'grass',
      commons:    'grass',
      arena:      'sand'
    };
    return defaults[zone] || 'grass';
  }

  // ============================================================================
  // WEATHER VOTING
  // ============================================================================

  function voteWeather(state, playerId, zone, weatherType, currentTick) {
    if (ZONES.indexOf(zone) === -1) {
      return { success: false, currentProbabilities: null, error: 'invalid zone' };
    }
    if (WEATHER_TYPES.indexOf(weatherType) === -1) {
      return { success: false, currentProbabilities: null, error: 'invalid weatherType' };
    }
    if (!playerId) {
      return { success: false, currentProbabilities: null, error: 'playerId required' };
    }

    if (!state.weatherVotes[zone]) {
      state.weatherVotes[zone] = {};
    }

    // Record or overwrite the player's vote
    state.weatherVotes[zone][playerId] = {
      weatherType: weatherType,
      tick: currentTick
    };

    return { success: true, currentProbabilities: getWeatherProbability(state, zone) };
  }

  function getWeatherProbability(state, zone) {
    var probs = {};
    var i;

    // Start from base
    for (i = 0; i < WEATHER_TYPES.length; i++) {
      probs[WEATHER_TYPES[i]] = BASE_WEATHER_PROBS[WEATHER_TYPES[i]] || 0;
    }

    var zoneVotes = state.weatherVotes[zone];
    if (!zoneVotes) return probs;

    var voteList = Object.keys(zoneVotes);
    if (voteList.length === 0) return probs;

    // Count votes per weather type
    var voteCounts = {};
    for (i = 0; i < WEATHER_TYPES.length; i++) {
      voteCounts[WEATHER_TYPES[i]] = 0;
    }
    for (i = 0; i < voteList.length; i++) {
      var wt = zoneVotes[voteList[i]].weatherType;
      if (voteCounts[wt] !== undefined) voteCounts[wt]++;
    }

    var totalVotes = voteList.length;

    // Blend: 60% base + 40% votes
    var result = {};
    var sum = 0;
    for (i = 0; i < WEATHER_TYPES.length; i++) {
      var wType = WEATHER_TYPES[i];
      var voteShare = totalVotes > 0 ? voteCounts[wType] / totalVotes : 0;
      result[wType] = probs[wType] * 0.6 + voteShare * 0.4;
      sum += result[wType];
    }

    // Normalise to sum to 1
    if (sum > 0) {
      for (i = 0; i < WEATHER_TYPES.length; i++) {
        result[WEATHER_TYPES[i]] = result[WEATHER_TYPES[i]] / sum;
      }
    }

    return result;
  }

  // ============================================================================
  // RESOURCE SYSTEM
  // ============================================================================

  function _resourceKey(resourceId, zone) {
    return resourceId + ':' + zone;
  }

  function _initResourceIfMissing(state, resourceId, zone) {
    var key = _resourceKey(resourceId, zone);
    if (!state.resources[key]) {
      // Find resource definition
      var rt = null;
      for (var i = 0; i < RESOURCE_TYPES.length; i++) {
        if (RESOURCE_TYPES[i].id === resourceId) { rt = RESOURCE_TYPES[i]; break; }
      }
      var maxAmount = rt ? rt.maxAmount : 100;
      state.resources[key] = {
        resourceId: resourceId,
        zone: zone,
        amount: maxAmount,
        maxAmount: maxAmount,
        lastRegenTick: 0
      };
    }
    return state.resources[key];
  }

  function harvestResource(state, playerId, resourceId, zone, amount, currentTick) {
    if (!playerId) {
      return { success: false, harvested: 0, remaining: 0, error: 'playerId required' };
    }
    if (ZONES.indexOf(zone) === -1) {
      return { success: false, harvested: 0, remaining: 0, error: 'invalid zone' };
    }

    var validResource = false;
    for (var i = 0; i < RESOURCE_TYPES.length; i++) {
      if (RESOURCE_TYPES[i].id === resourceId) { validResource = true; break; }
    }
    if (!validResource) {
      return { success: false, harvested: 0, remaining: 0, error: 'unknown resourceId' };
    }

    if (!amount || amount <= 0) {
      return { success: false, harvested: 0, remaining: 0, error: 'amount must be positive' };
    }

    var res = _initResourceIfMissing(state, resourceId, zone);

    if (res.amount <= 0) {
      return { success: false, harvested: 0, remaining: 0, error: 'resource depleted' };
    }

    var actualHarvest = Math.min(amount, res.amount);
    res.amount -= actualHarvest;

    // Update aesthetic counter for harvest
    if (!state.aesthetics[zone]) {
      state.aesthetics[zone] = { harvestCount: 0, plantCount: 0, buildCount: 0, type: 'balanced', score: 0, lastUpdatedTick: 0 };
    }
    state.aesthetics[zone].harvestCount++;

    // Record in edit/diff log
    var diff = {
      id: _genId(playerId, currentTick, 0, 0),
      type: 'harvest',
      playerId: playerId,
      resourceId: resourceId,
      zone: zone,
      amount: actualHarvest,
      tick: currentTick
    };
    state.diffLog.push(diff);

    return { success: true, harvested: actualHarvest, remaining: res.amount };
  }

  function regenerateResources(state, currentTick) {
    var regenerated = [];

    for (var key in state.resources) {
      if (!state.resources.hasOwnProperty(key)) continue;
      var res = state.resources[key];

      // Find regen rate
      var regenRate = 0.05; // default
      for (var i = 0; i < RESOURCE_TYPES.length; i++) {
        if (RESOURCE_TYPES[i].id === res.resourceId) {
          regenRate = RESOURCE_TYPES[i].regenRate;
          break;
        }
      }

      if (res.amount < res.maxAmount) {
        var ticksSinceLast = currentTick - res.lastRegenTick;
        if (ticksSinceLast <= 0) ticksSinceLast = 1;
        var regenAmount = Math.floor(res.maxAmount * regenRate * ticksSinceLast);
        if (regenAmount > 0) {
          var oldAmount = res.amount;
          res.amount = Math.min(res.maxAmount, res.amount + regenAmount);
          var actualRegen = res.amount - oldAmount;
          if (actualRegen > 0) {
            res.lastRegenTick = currentTick;
            regenerated.push({
              resourceId: res.resourceId,
              zone: res.zone,
              amount: actualRegen
            });
          }
        }
      }
    }

    return { regenerated: regenerated };
  }

  function getResourceLevel(state, resourceId, zone) {
    var key = _resourceKey(resourceId, zone);
    if (!state.resources[key]) return 0;
    return state.resources[key].amount;
  }

  // ============================================================================
  // ZONE AESTHETICS
  // ============================================================================

  function getZoneAesthetic(state, zone) {
    if (!state.aesthetics[zone]) {
      return { type: 'balanced', score: 0 };
    }
    return {
      type: state.aesthetics[zone].type,
      score: state.aesthetics[zone].score
    };
  }

  function updateAesthetic(state, zone, currentTick) {
    if (ZONES.indexOf(zone) === -1) return;

    if (!state.aesthetics[zone]) {
      state.aesthetics[zone] = { harvestCount: 0, plantCount: 0, buildCount: 0, type: 'balanced', score: 0, lastUpdatedTick: 0 };
    }

    var aes = state.aesthetics[zone];
    var h = aes.harvestCount;
    var p = aes.plantCount;
    var b = aes.buildCount;
    var total = h + p + b;

    var type = 'balanced';
    var score = 0;

    if (total === 0) {
      type = 'balanced';
      score = 0;
    } else if (h > p && h > b && h >= 30) {
      type = 'barren';
      score = Math.min(100, Math.floor((h / total) * 100));
    } else if (p > h && p > b && p >= 30) {
      type = 'green';
      score = Math.min(100, Math.floor((p / total) * 100));
    } else if (b > h && b > p && b >= 30) {
      type = 'urban';
      score = Math.min(100, Math.floor((b / total) * 100));
    } else if (h >= 30) {
      type = 'barren';
      score = Math.min(100, Math.floor((h / total) * 100));
    } else if (p >= 30) {
      type = 'green';
      score = Math.min(100, Math.floor((p / total) * 100));
    } else if (b >= 30) {
      type = 'urban';
      score = Math.min(100, Math.floor((b / total) * 100));
    } else {
      type = 'balanced';
      score = Math.max(h, p, b);
    }

    aes.type = type;
    aes.score = score;
    aes.lastUpdatedTick = currentTick;
  }

  // ============================================================================
  // HISTORY & AUDIT
  // ============================================================================

  function getEditHistory(state, zone, count) {
    var result = [];
    // Walk backwards through edits
    for (var i = state.edits.length - 1; i >= 0; i--) {
      if (state.edits[i].zone === zone) {
        result.push(state.edits[i]);
        if (count && result.length >= count) break;
      }
    }
    return result;
  }

  function getPlayerEdits(state, playerId) {
    var result = [];
    for (var i = 0; i < state.edits.length; i++) {
      if (state.edits[i].playerId === playerId) {
        result.push(state.edits[i]);
      }
    }
    return result;
  }

  function getDiffLog(state, startTick, endTick) {
    var result = [];
    for (var i = 0; i < state.diffLog.length; i++) {
      var entry = state.diffLog[i];
      if (entry.tick >= startTick && entry.tick <= endTick) {
        result.push(entry);
      }
    }
    return result;
  }

  // ============================================================================
  // ZONE CAPACITY
  // ============================================================================

  function getZoneCapacity(state, zone, currentTick) {
    // Day number based on tick
    var dayNumber = Math.floor(currentTick / TICKS_PER_DAY);
    var dayStart = dayNumber * TICKS_PER_DAY;
    var dayEnd = dayStart + TICKS_PER_DAY - 1;

    var editsToday = 0;
    for (var i = 0; i < state.edits.length; i++) {
      var edit = state.edits[i];
      if (edit.zone === zone && edit.tick >= dayStart && edit.tick <= dayEnd) {
        editsToday++;
      }
    }

    return Math.max(0, ZONE_DAILY_CAPACITY - editsToday);
  }

  // ============================================================================
  // RESOURCE MAP
  // ============================================================================

  function getResourceMap(state, zone) {
    var result = {};
    for (var key in state.resources) {
      if (!state.resources.hasOwnProperty(key)) continue;
      var res = state.resources[key];
      if (res.zone === zone) {
        result[res.resourceId] = {
          amount: res.amount,
          maxAmount: res.maxAmount,
          depleted: res.amount <= 0
        };
      }
    }
    return result;
  }

  // ============================================================================
  // TOP SHAPERS
  // ============================================================================

  function getTopShapers(state, count) {
    // Count edits per player
    var playerCounts = {};
    for (var i = 0; i < state.edits.length; i++) {
      var pid = state.edits[i].playerId;
      playerCounts[pid] = (playerCounts[pid] || 0) + 1;
    }

    var list = [];
    for (var p in playerCounts) {
      if (playerCounts.hasOwnProperty(p)) {
        list.push({ playerId: p, editCount: playerCounts[p] });
      }
    }

    list.sort(function(a, b) { return b.editCount - a.editCount; });

    if (count && count > 0) {
      list = list.slice(0, count);
    }

    return list;
  }

  // ============================================================================
  // EXPORTS
  // ============================================================================

  exports.TERRAIN_TYPES     = TERRAIN_TYPES;
  exports.RESOURCE_TYPES    = RESOURCE_TYPES;
  exports.EDIT_COSTS        = EDIT_COSTS;
  exports.WEATHER_TYPES     = WEATHER_TYPES;
  exports.ZONES             = ZONES;
  exports.ZONE_DAILY_CAPACITY = ZONE_DAILY_CAPACITY;
  exports.TICKS_PER_DAY     = TICKS_PER_DAY;

  exports.createState           = createState;
  exports.editTerrain           = editTerrain;
  exports.getTerrainAt          = getTerrainAt;
  exports.voteWeather           = voteWeather;
  exports.getWeatherProbability = getWeatherProbability;
  exports.harvestResource       = harvestResource;
  exports.regenerateResources   = regenerateResources;
  exports.getResourceLevel      = getResourceLevel;
  exports.getZoneAesthetic      = getZoneAesthetic;
  exports.updateAesthetic       = updateAesthetic;
  exports.getEditHistory        = getEditHistory;
  exports.getPlayerEdits        = getPlayerEdits;
  exports.getDiffLog            = getDiffLog;
  exports.getZoneCapacity       = getZoneCapacity;
  exports.getResourceMap        = getResourceMap;
  exports.getTopShapers         = getTopShapers;

  // expose PRNG for tests
  exports.mulberry32 = mulberry32;

})(typeof module !== 'undefined' ? module.exports : (window.WorldShaper = {}));
