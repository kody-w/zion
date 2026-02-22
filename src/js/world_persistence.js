/**
 * ZION World Persistence System
 * Manages structure upkeep, garden growth, time capsule timers, and world-diff generation.
 * Makes the world feel alive over days and weeks.
 */

(function(exports) {
  'use strict';

  // ---------------------------------------------------------------------------
  // STRUCTURE TYPES — 12 buildable structures
  // ---------------------------------------------------------------------------

  var STRUCTURE_TYPES = {
    wooden_cabin: {
      id: 'wooden_cabin',
      name: 'Wooden Cabin',
      category: 'housing',
      buildCost: 100,
      dailyUpkeep: 1,
      maxHealth: 100,
      decayRate: 5,
      repairCost: 2,
      maxPerZone: 5,
      allowedZones: ['nexus', 'gardens', 'commons', 'wilds']
    },
    stone_house: {
      id: 'stone_house',
      name: 'Stone House',
      category: 'housing',
      buildCost: 200,
      dailyUpkeep: 2,
      maxHealth: 150,
      decayRate: 4,
      repairCost: 3,
      maxPerZone: 5,
      allowedZones: ['nexus', 'gardens', 'commons', 'wilds', 'agora']
    },
    market_stall: {
      id: 'market_stall',
      name: 'Market Stall',
      category: 'commercial',
      buildCost: 80,
      dailyUpkeep: 1,
      maxHealth: 80,
      decayRate: 6,
      repairCost: 2,
      maxPerZone: 10,
      allowedZones: ['nexus', 'agora', 'commons']
    },
    workshop: {
      id: 'workshop',
      name: 'Workshop',
      category: 'functional',
      buildCost: 150,
      dailyUpkeep: 2,
      maxHealth: 120,
      decayRate: 5,
      repairCost: 3,
      maxPerZone: 4,
      allowedZones: ['nexus', 'agora', 'commons', 'studio']
    },
    garden_plot: {
      id: 'garden_plot',
      name: 'Garden Plot',
      category: 'functional',
      buildCost: 50,
      dailyUpkeep: 0,
      maxHealth: 100,
      decayRate: 0,
      repairCost: 1,
      maxPerZone: 20,
      allowedZones: ['gardens', 'commons', 'wilds']
    },
    watchtower: {
      id: 'watchtower',
      name: 'Watchtower',
      category: 'functional',
      buildCost: 120,
      dailyUpkeep: 1,
      maxHealth: 130,
      decayRate: 3,
      repairCost: 2,
      maxPerZone: 3,
      allowedZones: ['nexus', 'wilds', 'commons', 'arena']
    },
    bridge: {
      id: 'bridge',
      name: 'Bridge',
      category: 'functional',
      buildCost: 180,
      dailyUpkeep: 1,
      maxHealth: 200,
      decayRate: 2,
      repairCost: 2,
      maxPerZone: 5,
      allowedZones: ['nexus', 'gardens', 'wilds', 'commons', 'agora', 'studio', 'athenaeum', 'arena']
    },
    fountain: {
      id: 'fountain',
      name: 'Fountain',
      category: 'decorative',
      buildCost: 150,
      dailyUpkeep: 1,
      maxHealth: 100,
      decayRate: 4,
      repairCost: 2,
      maxPerZone: 3,
      allowedZones: ['nexus', 'gardens', 'agora', 'commons', 'athenaeum']
    },
    statue: {
      id: 'statue',
      name: 'Statue',
      category: 'monument',
      buildCost: 300,
      dailyUpkeep: 1,
      maxHealth: 200,
      decayRate: 2,
      repairCost: 3,
      maxPerZone: 3,
      allowedZones: ['nexus', 'agora', 'commons', 'athenaeum', 'arena']
    },
    shrine: {
      id: 'shrine',
      name: 'Shrine',
      category: 'monument',
      buildCost: 250,
      dailyUpkeep: 1,
      maxHealth: 150,
      decayRate: 3,
      repairCost: 3,
      maxPerZone: 2,
      allowedZones: ['gardens', 'wilds', 'athenaeum', 'studio']
    },
    lighthouse: {
      id: 'lighthouse',
      name: 'Lighthouse',
      category: 'functional',
      buildCost: 400,
      dailyUpkeep: 3,
      maxHealth: 250,
      decayRate: 3,
      repairCost: 4,
      maxPerZone: 1,
      allowedZones: ['nexus', 'wilds', 'commons']
    },
    amphitheater: {
      id: 'amphitheater',
      name: 'Amphitheater',
      category: 'commercial',
      buildCost: 500,
      dailyUpkeep: 3,
      maxHealth: 300,
      decayRate: 2,
      repairCost: 5,
      maxPerZone: 1,
      allowedZones: ['nexus', 'agora', 'studio', 'arena']
    }
  };

  // ---------------------------------------------------------------------------
  // GARDEN CROPS — 10 crop types
  // ---------------------------------------------------------------------------

  var GARDEN_CROPS = {
    wheat: {
      id: 'wheat',
      name: 'Wheat',
      growthStages: 4,
      ticksPerStage: 100,
      season: 'summer',
      offSeasonPenalty: 0.5,
      yield: { itemId: 'wheat', minQty: 2, maxQty: 5 },
      waterNeeded: true
    },
    sunflower: {
      id: 'sunflower',
      name: 'Sunflower',
      growthStages: 4,
      ticksPerStage: 120,
      season: 'summer',
      offSeasonPenalty: 0.5,
      yield: { itemId: 'sunflower', minQty: 1, maxQty: 3 },
      waterNeeded: true
    },
    herbs: {
      id: 'herbs',
      name: 'Herbs',
      growthStages: 3,
      ticksPerStage: 80,
      season: 'spring',
      offSeasonPenalty: 0.6,
      yield: { itemId: 'herbs', minQty: 3, maxQty: 7 },
      waterNeeded: true
    },
    mushroom: {
      id: 'mushroom',
      name: 'Mushroom',
      growthStages: 3,
      ticksPerStage: 60,
      season: 'autumn',
      offSeasonPenalty: 0.4,
      yield: { itemId: 'mushroom', minQty: 2, maxQty: 6 },
      waterNeeded: false
    },
    crystal_bloom: {
      id: 'crystal_bloom',
      name: 'Crystal Bloom',
      growthStages: 5,
      ticksPerStage: 200,
      season: 'winter',
      offSeasonPenalty: 0.3,
      yield: { itemId: 'crystal', minQty: 1, maxQty: 2 },
      waterNeeded: false
    },
    oak_sapling: {
      id: 'oak_sapling',
      name: 'Oak Sapling',
      growthStages: 5,
      ticksPerStage: 300,
      season: 'spring',
      offSeasonPenalty: 0.5,
      yield: { itemId: 'wood', minQty: 5, maxQty: 12 },
      waterNeeded: true
    },
    starfruit: {
      id: 'starfruit',
      name: 'Starfruit',
      growthStages: 4,
      ticksPerStage: 150,
      season: 'summer',
      offSeasonPenalty: 0.7,
      yield: { itemId: 'starfruit', minQty: 1, maxQty: 4 },
      waterNeeded: true
    },
    fireblossom: {
      id: 'fireblossom',
      name: 'Fireblossom',
      growthStages: 4,
      ticksPerStage: 180,
      season: 'summer',
      offSeasonPenalty: 0.8,
      yield: { itemId: 'fireblossom', minQty: 1, maxQty: 3 },
      waterNeeded: false
    },
    frost_lily: {
      id: 'frost_lily',
      name: 'Frost Lily',
      growthStages: 3,
      ticksPerStage: 90,
      season: 'winter',
      offSeasonPenalty: 0.9,
      yield: { itemId: 'frost_lily', minQty: 2, maxQty: 4 },
      waterNeeded: false
    },
    moonvine: {
      id: 'moonvine',
      name: 'Moonvine',
      growthStages: 4,
      ticksPerStage: 160,
      season: 'autumn',
      offSeasonPenalty: 0.6,
      yield: { itemId: 'moonvine', minQty: 2, maxQty: 5 },
      waterNeeded: true
    }
  };

  // ---------------------------------------------------------------------------
  // INTERNAL COUNTERS
  // ---------------------------------------------------------------------------

  var _structureCounter = 0;
  var _gardenCounter = 0;

  // ---------------------------------------------------------------------------
  // SEEDED PRNG
  // ---------------------------------------------------------------------------

  function mulberry32(seed) {
    return function() {
      seed |= 0;
      seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // ---------------------------------------------------------------------------
  // STATE FACTORY
  // ---------------------------------------------------------------------------

  /**
   * Create a fresh world persistence state object.
   * All functions accept this state as their first argument.
   */
  function createState() {
    return {
      structures: {},    // structureId -> STRUCTURE_STATE
      gardens: {},       // gardenId -> GARDEN_STATE
      timeCapsules: {},  // capsuleId -> {capsuleId, buryTick, unlockDelay, unlocksAt, buriedBy, zone, unlocked}
      events: []         // array of {tick, type, data} for world-diff
    };
  }

  // ---------------------------------------------------------------------------
  // HELPER: get or init player balance
  // ---------------------------------------------------------------------------

  function _getBalance(state, playerId) {
    if (!state.ledger) return 0;
    return state.ledger.balances[playerId] || 0;
  }

  function _deductBalance(state, playerId, amount) {
    if (!state.ledger) return false;
    if ((state.ledger.balances[playerId] || 0) < amount) return false;
    state.ledger.balances[playerId] = (state.ledger.balances[playerId] || 0) - amount;
    return true;
  }

  function _addBalance(state, playerId, amount) {
    if (!state.ledger) return;
    state.ledger.balances[playerId] = (state.ledger.balances[playerId] || 0) + amount;
  }

  function _hasFunds(state, playerId, amount) {
    if (!state.ledger) return false;
    return (state.ledger.balances[playerId] || 0) >= amount;
  }

  // ---------------------------------------------------------------------------
  // STRUCTURE FUNCTIONS
  // ---------------------------------------------------------------------------

  /**
   * Place a new structure. Deducts build cost from player's ledger.
   * Returns {success, structure, reason}
   */
  function placeStructure(state, playerId, structureType, zone, position) {
    if (!state || !playerId) {
      return { success: false, reason: 'Invalid state or playerId' };
    }
    var typeDef = STRUCTURE_TYPES[structureType];
    if (!typeDef) {
      return { success: false, reason: 'Unknown structure type: ' + structureType };
    }
    if (!zone) {
      return { success: false, reason: 'Zone is required' };
    }
    if (typeDef.allowedZones.indexOf(zone) === -1) {
      return { success: false, reason: 'Structure type ' + structureType + ' not allowed in zone ' + zone };
    }
    if (!position || typeof position.x !== 'number' || typeof position.z !== 'number') {
      return { success: false, reason: 'Invalid position: must have numeric x and z' };
    }

    // Check zone limit
    var zoneCount = 0;
    var ids = Object.keys(state.structures);
    for (var i = 0; i < ids.length; i++) {
      var s = state.structures[ids[i]];
      if (s.type === structureType && s.zone === zone && s.status !== 'demolished') {
        zoneCount++;
      }
    }
    if (zoneCount >= typeDef.maxPerZone) {
      return { success: false, reason: 'Zone limit reached for ' + structureType + ' in ' + zone + ' (max ' + typeDef.maxPerZone + ')' };
    }

    // Check funds
    if (!_hasFunds(state, playerId, typeDef.buildCost)) {
      return { success: false, reason: 'Insufficient Spark: need ' + typeDef.buildCost };
    }

    _deductBalance(state, playerId, typeDef.buildCost);

    var structureId = 'struct_' + (++_structureCounter) + '_' + Date.now();
    var structure = {
      id: structureId,
      type: structureType,
      ownerId: playerId,
      zone: zone,
      position: { x: position.x, z: position.z },
      health: typeDef.maxHealth,
      builtAt: state.currentTick || 0,
      lastUpkeep: state.currentTick || 0,
      lastRepair: null,
      status: 'active'
    };

    state.structures[structureId] = structure;
    _recordEvent(state, state.currentTick || 0, 'structure_built', { structureId: structureId, type: structureType, zone: zone, ownerId: playerId });

    return { success: true, structure: structure };
  }

  /**
   * Pay upkeep for a single structure.
   * Returns {success, cost, newHealth}
   */
  function payUpkeep(state, structureId, currentTick) {
    var s = state.structures[structureId];
    if (!s) {
      return { success: false, reason: 'Structure not found: ' + structureId };
    }
    if (s.status === 'demolished') {
      return { success: false, reason: 'Structure is demolished' };
    }
    var typeDef = STRUCTURE_TYPES[s.type];
    var cost = typeDef.dailyUpkeep;

    if (!_hasFunds(state, s.ownerId, cost)) {
      return { success: false, cost: cost, reason: 'Insufficient Spark for upkeep' };
    }

    _deductBalance(state, s.ownerId, cost);
    s.lastUpkeep = currentTick;

    return { success: true, cost: cost, newHealth: s.health };
  }

  /**
   * Pay upkeep for ALL of a player's structures.
   * Returns {totalCost, structures: [{id, cost, status}]}
   */
  function payAllUpkeep(state, playerId, currentTick) {
    var totalCost = 0;
    var results = [];
    var ids = Object.keys(state.structures);
    for (var i = 0; i < ids.length; i++) {
      var s = state.structures[ids[i]];
      if (s.ownerId !== playerId || s.status === 'demolished') continue;
      var typeDef = STRUCTURE_TYPES[s.type];
      var cost = typeDef.dailyUpkeep;
      totalCost += cost;
      var res = payUpkeep(state, s.id, currentTick);
      results.push({ id: s.id, cost: cost, status: res.success ? 'paid' : 'failed' });
    }
    return { totalCost: totalCost, structures: results };
  }

  /**
   * Check ALL structures for missed upkeep and apply decay.
   * A structure is considered to have missed upkeep if (currentTick - lastUpkeep) >= UPKEEP_INTERVAL (default 100 ticks).
   * Returns {decayed: [{id, healthLost, newHealth, status}]}
   */
  var UPKEEP_INTERVAL = 100;

  function checkDecay(state, currentTick) {
    var decayed = [];
    var ids = Object.keys(state.structures);
    for (var i = 0; i < ids.length; i++) {
      var s = state.structures[ids[i]];
      if (s.status === 'demolished' || s.status === 'ruined') continue;

      var typeDef = STRUCTURE_TYPES[s.type];
      if (typeDef.decayRate === 0) continue;

      var ticksSinceUpkeep = currentTick - s.lastUpkeep;
      if (ticksSinceUpkeep < UPKEEP_INTERVAL) continue;

      // Missed upkeep intervals
      var missedIntervals = Math.floor(ticksSinceUpkeep / UPKEEP_INTERVAL);
      var healthLost = missedIntervals * typeDef.decayRate;
      if (healthLost <= 0) continue;

      s.health = Math.max(0, s.health - healthLost);

      var prevStatus = s.status;
      if (s.health <= 0) {
        s.health = 0;
        s.status = 'ruined';
        _recordEvent(state, currentTick, 'structure_ruined', { structureId: s.id, type: s.type, zone: s.zone });
      } else if (s.health < 30) {
        s.status = 'decaying';
      }

      decayed.push({
        id: s.id,
        healthLost: healthLost,
        newHealth: s.health,
        status: s.status
      });
    }
    return { decayed: decayed };
  }

  /**
   * Repair a structure. Costs Spark (repairCost per 10 health).
   * Returns {success, cost, newHealth}
   */
  function repairStructure(state, playerId, structureId, amount) {
    var s = state.structures[structureId];
    if (!s) {
      return { success: false, reason: 'Structure not found: ' + structureId };
    }
    if (s.ownerId !== playerId) {
      return { success: false, reason: 'Only the owner can repair this structure' };
    }
    if (s.status === 'demolished') {
      return { success: false, reason: 'Cannot repair a demolished structure' };
    }

    var typeDef = STRUCTURE_TYPES[s.type];
    var maxHealth = typeDef.maxHealth;

    if (s.health >= maxHealth) {
      return { success: true, cost: 0, newHealth: s.health, reason: 'Already at max health' };
    }

    var repairAmount = Math.min(amount, maxHealth - s.health);
    var units = Math.ceil(repairAmount / 10);
    var cost = units * typeDef.repairCost;

    if (!_hasFunds(state, playerId, cost)) {
      return { success: false, reason: 'Insufficient Spark: need ' + cost };
    }

    _deductBalance(state, playerId, cost);
    s.health = Math.min(maxHealth, s.health + repairAmount);
    s.lastRepair = state.currentTick || 0;

    if (s.health >= 30 && s.status === 'decaying') {
      s.status = 'active';
    } else if (s.health > 0 && s.status === 'ruined') {
      s.status = 'active';
    }

    return { success: true, cost: cost, newHealth: s.health };
  }

  /**
   * Demolish a structure. Returns 50% of build cost.
   * Returns {success, refund}
   */
  function demolishStructure(state, playerId, structureId) {
    var s = state.structures[structureId];
    if (!s) {
      return { success: false, reason: 'Structure not found: ' + structureId };
    }
    if (s.ownerId !== playerId) {
      return { success: false, reason: 'Only the owner can demolish this structure' };
    }
    if (s.status === 'demolished') {
      return { success: false, reason: 'Structure is already demolished' };
    }

    var typeDef = STRUCTURE_TYPES[s.type];
    var refund = Math.floor(typeDef.buildCost * 0.5);

    s.status = 'demolished';
    _addBalance(state, playerId, refund);
    _recordEvent(state, state.currentTick || 0, 'structure_demolished', { structureId: s.id, type: s.type, zone: s.zone });

    return { success: true, refund: refund };
  }

  /**
   * Get all structures in a zone (non-demolished).
   */
  function getStructures(state, zone) {
    var result = [];
    var ids = Object.keys(state.structures);
    for (var i = 0; i < ids.length; i++) {
      var s = state.structures[ids[i]];
      if (s.zone === zone && s.status !== 'demolished') {
        result.push(s);
      }
    }
    return result;
  }

  /**
   * Get all structures owned by a player (non-demolished).
   */
  function getPlayerStructures(state, playerId) {
    var result = [];
    var ids = Object.keys(state.structures);
    for (var i = 0; i < ids.length; i++) {
      var s = state.structures[ids[i]];
      if (s.ownerId === playerId && s.status !== 'demolished') {
        result.push(s);
      }
    }
    return result;
  }

  /**
   * Get a single structure by ID.
   */
  function getStructureById(state, structureId) {
    return state.structures[structureId] || null;
  }

  /**
   * Get total upkeep due for a player since lastUpkeep, in whole intervals.
   * Returns total Spark cost due.
   */
  function getUpkeepDue(state, playerId, currentTick) {
    var total = 0;
    var ids = Object.keys(state.structures);
    for (var i = 0; i < ids.length; i++) {
      var s = state.structures[ids[i]];
      if (s.ownerId !== playerId || s.status === 'demolished') continue;
      var typeDef = STRUCTURE_TYPES[s.type];
      if (typeDef.dailyUpkeep === 0) continue;
      var ticksSince = currentTick - s.lastUpkeep;
      var intervals = Math.floor(ticksSince / UPKEEP_INTERVAL);
      total += intervals * typeDef.dailyUpkeep;
    }
    return total;
  }

  // ---------------------------------------------------------------------------
  // GARDEN FUNCTIONS
  // ---------------------------------------------------------------------------

  /**
   * Plant a crop in a garden plot structure.
   * Returns {success, garden}
   */
  function plantCrop(state, playerId, gardenId, cropId, currentTick, season) {
    var g = state.gardens[gardenId];
    if (!g) {
      return { success: false, reason: 'Garden not found: ' + gardenId };
    }
    if (g.ownerId !== playerId) {
      return { success: false, reason: 'Only the owner can plant in this garden' };
    }
    var cropDef = GARDEN_CROPS[cropId];
    if (!cropDef) {
      return { success: false, reason: 'Unknown crop: ' + cropId };
    }
    if (g.crop !== null) {
      return { success: false, reason: 'Garden already has a crop planted' };
    }

    g.crop = cropId;
    g.stage = 0;
    g.plantedAt = currentTick;
    g.lastWatered = currentTick;
    g.lastStageAdvance = currentTick;
    g.season = season || 'summer';
    g.quality = 1.0;
    g.harvestReady = false;

    return { success: true, garden: g };
  }

  /**
   * Water a garden plot. Resets waterNeeded timer and may improve quality.
   * Returns {success, quality}
   */
  function waterGarden(state, gardenId, currentTick) {
    var g = state.gardens[gardenId];
    if (!g) {
      return { success: false, reason: 'Garden not found: ' + gardenId };
    }
    if (g.crop === null) {
      return { success: false, reason: 'No crop planted in this garden' };
    }
    var cropDef = GARDEN_CROPS[g.crop];
    if (!cropDef.waterNeeded) {
      // Watering a crop that doesn't need it is harmless but noted
      return { success: true, quality: g.quality, note: 'This crop does not need water' };
    }

    g.lastWatered = currentTick;
    // Watering in time (before 50 ticks overdue) gives small quality boost
    g.quality = Math.min(1.0, g.quality + 0.05);

    return { success: true, quality: g.quality };
  }

  /**
   * Advance all gardens' growth based on elapsed ticks and season.
   * Returns {advanced: [{gardenId, newStage, readyToHarvest}]}
   */
  function advanceGrowth(state, currentTick, season) {
    var advanced = [];
    var ids = Object.keys(state.gardens);
    for (var i = 0; i < ids.length; i++) {
      var g = state.gardens[ids[i]];
      if (g.crop === null || g.harvestReady) continue;

      var cropDef = GARDEN_CROPS[g.crop];
      var maxStage = cropDef.growthStages - 1; // 0-indexed, final = growthStages-1
      if (g.stage >= maxStage) {
        g.harvestReady = true;
        advanced.push({ gardenId: g.id, newStage: g.stage, readyToHarvest: true });
        continue;
      }

      // Season modifier
      var isOptimalSeason = (g.season === season || season === g.season);
      var speedMult = isOptimalSeason ? 1.0 : cropDef.offSeasonPenalty;

      // Water penalty: if water needed and overdue (>50 ticks), slow growth
      var waterPenalty = 1.0;
      if (cropDef.waterNeeded) {
        var ticksSinceWater = currentTick - g.lastWatered;
        if (ticksSinceWater > 50) {
          waterPenalty = 0.5;
          g.quality = Math.max(0.1, g.quality - 0.02);
        }
      }

      var effectiveTicks = (currentTick - g.lastStageAdvance) * speedMult * waterPenalty;

      if (effectiveTicks >= cropDef.ticksPerStage) {
        g.stage = Math.min(maxStage, g.stage + 1);
        g.lastStageAdvance = currentTick;

        var readyNow = (g.stage >= maxStage);
        if (readyNow) {
          g.harvestReady = true;
          _recordEvent(state, currentTick, 'crop_ready', { gardenId: g.id, crop: g.crop, ownerId: g.ownerId });
        }

        advanced.push({ gardenId: g.id, newStage: g.stage, readyToHarvest: readyNow });
      }
    }
    return { advanced: advanced };
  }

  /**
   * Harvest a ready crop. Uses seeded yield roll.
   * Returns {success, items: [{itemId, qty}], quality}
   */
  function harvestCrop(state, playerId, gardenId, seed) {
    var g = state.gardens[gardenId];
    if (!g) {
      return { success: false, reason: 'Garden not found: ' + gardenId };
    }
    if (g.ownerId !== playerId) {
      return { success: false, reason: 'Only the owner can harvest this garden' };
    }
    if (g.crop === null) {
      return { success: false, reason: 'No crop planted in this garden' };
    }
    var cropDef = GARDEN_CROPS[g.crop];
    var maxStage = cropDef.growthStages - 1;
    if (g.stage < maxStage && !g.harvestReady) {
      return { success: false, reason: 'Crop is not ready to harvest yet (stage ' + g.stage + '/' + maxStage + ')' };
    }

    var rng = mulberry32(seed || (gardenId.charCodeAt(0) * 1000 + g.plantedAt));
    var yieldDef = cropDef.yield;
    var range = yieldDef.maxQty - yieldDef.minQty;
    var baseQty = yieldDef.minQty + Math.floor(rng() * (range + 1));
    var finalQty = Math.max(1, Math.round(baseQty * g.quality));

    var items = [{ itemId: yieldDef.itemId, qty: finalQty }];
    var harvestQuality = g.quality;

    _recordEvent(state, state.currentTick || 0, 'crop_harvested', { gardenId: g.id, crop: g.crop, qty: finalQty, ownerId: playerId });

    // Reset garden
    g.crop = null;
    g.stage = 0;
    g.plantedAt = null;
    g.lastWatered = null;
    g.lastStageAdvance = null;
    g.season = null;
    g.quality = 1.0;
    g.harvestReady = false;

    return { success: true, items: items, quality: harvestQuality };
  }

  /**
   * Create a garden state entry for a garden_plot structure.
   * Internal helper called when a garden_plot structure is placed.
   * Returns {success, garden}
   */
  function createGardenState(state, playerId, zone, position) {
    var gardenId = 'garden_' + (++_gardenCounter) + '_' + Date.now();
    var garden = {
      id: gardenId,
      ownerId: playerId,
      zone: zone,
      crop: null,
      stage: 0,
      plantedAt: null,
      lastWatered: null,
      lastStageAdvance: null,
      season: null,
      quality: 1.0,
      harvestReady: false,
      position: position ? { x: position.x, z: position.z } : null
    };
    state.gardens[gardenId] = garden;
    return { success: true, garden: garden };
  }

  /**
   * Get garden state.
   */
  function getGardenState(state, gardenId) {
    return state.gardens[gardenId] || null;
  }

  /**
   * Get all gardens for a player.
   */
  function getPlayerGardens(state, playerId) {
    var result = [];
    var ids = Object.keys(state.gardens);
    for (var i = 0; i < ids.length; i++) {
      var g = state.gardens[ids[i]];
      if (g.ownerId === playerId) {
        result.push(g);
      }
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // TIME CAPSULE FUNCTIONS
  // ---------------------------------------------------------------------------

  /**
   * Register a time capsule with an unlock timer.
   * Returns {success, unlocksAt}
   */
  function registerTimeCapsule(state, capsuleId, buryTick, unlockDelay, options) {
    if (!capsuleId) {
      return { success: false, reason: 'capsuleId is required' };
    }
    if (typeof buryTick !== 'number') {
      return { success: false, reason: 'buryTick must be a number' };
    }
    if (typeof unlockDelay !== 'number' || unlockDelay < 0) {
      return { success: false, reason: 'unlockDelay must be a non-negative number' };
    }

    options = options || {};
    var unlocksAt = buryTick + unlockDelay;

    state.timeCapsules[capsuleId] = {
      capsuleId: capsuleId,
      buryTick: buryTick,
      unlockDelay: unlockDelay,
      unlocksAt: unlocksAt,
      buriedBy: options.buriedBy || null,
      zone: options.zone || null,
      unlocked: false
    };

    return { success: true, unlocksAt: unlocksAt };
  }

  /**
   * Check for newly unlockable capsules.
   * Returns {unlocked: [{capsuleId, buriedBy, zone}]}
   */
  function checkTimeCapsules(state, currentTick) {
    var unlocked = [];
    var ids = Object.keys(state.timeCapsules);
    for (var i = 0; i < ids.length; i++) {
      var cap = state.timeCapsules[ids[i]];
      if (!cap.unlocked && currentTick >= cap.unlocksAt) {
        cap.unlocked = true;
        unlocked.push({
          capsuleId: cap.capsuleId,
          buriedBy: cap.buriedBy,
          zone: cap.zone
        });
        _recordEvent(state, currentTick, 'capsule_unlocked', { capsuleId: cap.capsuleId, buriedBy: cap.buriedBy });
      }
    }
    return { unlocked: unlocked };
  }

  // ---------------------------------------------------------------------------
  // WORLD DIFF & STATS
  // ---------------------------------------------------------------------------

  function _recordEvent(state, tick, type, data) {
    state.events.push({ tick: tick, type: type, data: data || {} });
  }

  /**
   * Generate a diff of world changes in a tick range.
   * Returns {structuresBuilt, structuresDecayed, cropsHarvested, capsulesUnlocked, ...}
   */
  function generateWorldDiff(state, fromTick, toTick) {
    var structuresBuilt = 0;
    var structuresDecayed = 0;
    var structuresRuined = 0;
    var structuresDemolished = 0;
    var cropsHarvested = 0;
    var cropsReady = 0;
    var capsulesUnlocked = 0;

    for (var i = 0; i < state.events.length; i++) {
      var ev = state.events[i];
      if (ev.tick < fromTick || ev.tick > toTick) continue;

      if (ev.type === 'structure_built') structuresBuilt++;
      else if (ev.type === 'structure_ruined') structuresRuined++;
      else if (ev.type === 'structure_demolished') structuresDemolished++;
      else if (ev.type === 'crop_harvested') cropsHarvested++;
      else if (ev.type === 'crop_ready') cropsReady++;
      else if (ev.type === 'capsule_unlocked') capsulesUnlocked++;
    }

    // Approximate decayed from structure checks
    var structureIds = Object.keys(state.structures);
    for (var j = 0; j < structureIds.length; j++) {
      var s = state.structures[structureIds[j]];
      if (s.status === 'decaying' || s.status === 'ruined') {
        structuresDecayed++;
      }
    }

    return {
      fromTick: fromTick,
      toTick: toTick,
      structuresBuilt: structuresBuilt,
      structuresDecayed: structuresDecayed,
      structuresRuined: structuresRuined,
      structuresDemolished: structuresDemolished,
      cropsHarvested: cropsHarvested,
      cropsReady: cropsReady,
      capsulesUnlocked: capsulesUnlocked
    };
  }

  /**
   * Return world stats: total structures, active gardens, pending capsules.
   */
  function getWorldStats(state) {
    var totalStructures = 0;
    var activeStructures = 0;
    var decayingStructures = 0;
    var ruinedStructures = 0;

    var structureIds = Object.keys(state.structures);
    for (var i = 0; i < structureIds.length; i++) {
      var s = state.structures[structureIds[i]];
      if (s.status !== 'demolished') {
        totalStructures++;
        if (s.status === 'active') activeStructures++;
        else if (s.status === 'decaying') decayingStructures++;
        else if (s.status === 'ruined') ruinedStructures++;
      }
    }

    var activeGardens = 0;
    var gardenIds = Object.keys(state.gardens);
    for (var j = 0; j < gardenIds.length; j++) {
      var g = state.gardens[gardenIds[j]];
      if (g.crop !== null) activeGardens++;
    }

    var pendingCapsules = 0;
    var capsuleIds = Object.keys(state.timeCapsules);
    for (var k = 0; k < capsuleIds.length; k++) {
      if (!state.timeCapsules[capsuleIds[k]].unlocked) pendingCapsules++;
    }

    return {
      totalStructures: totalStructures,
      activeStructures: activeStructures,
      decayingStructures: decayingStructures,
      ruinedStructures: ruinedStructures,
      activeGardens: activeGardens,
      totalGardens: gardenIds.length,
      pendingCapsules: pendingCapsules,
      totalCapsules: capsuleIds.length
    };
  }

  // ---------------------------------------------------------------------------
  // EXPORTS
  // ---------------------------------------------------------------------------

  exports.STRUCTURE_TYPES = STRUCTURE_TYPES;
  exports.GARDEN_CROPS = GARDEN_CROPS;
  exports.UPKEEP_INTERVAL = UPKEEP_INTERVAL;

  exports.createState = createState;
  exports.createGardenState = createGardenState;
  exports.mulberry32 = mulberry32;

  // Structure
  exports.placeStructure = placeStructure;
  exports.payUpkeep = payUpkeep;
  exports.payAllUpkeep = payAllUpkeep;
  exports.checkDecay = checkDecay;
  exports.repairStructure = repairStructure;
  exports.demolishStructure = demolishStructure;
  exports.getStructures = getStructures;
  exports.getPlayerStructures = getPlayerStructures;
  exports.getStructureById = getStructureById;
  exports.getUpkeepDue = getUpkeepDue;

  // Garden
  exports.plantCrop = plantCrop;
  exports.waterGarden = waterGarden;
  exports.advanceGrowth = advanceGrowth;
  exports.harvestCrop = harvestCrop;
  exports.getGardenState = getGardenState;
  exports.getPlayerGardens = getPlayerGardens;

  // Time capsules
  exports.registerTimeCapsule = registerTimeCapsule;
  exports.checkTimeCapsules = checkTimeCapsules;

  // World diff & stats
  exports.generateWorldDiff = generateWorldDiff;
  exports.getWorldStats = getWorldStats;

})(typeof module !== 'undefined' ? module.exports : (window.WorldPersistence = {}));
