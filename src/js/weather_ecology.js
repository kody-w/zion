// weather_ecology.js — Long-term ecological simulation for ZION MMO
// Tracks how weather, harvesting pressure, terraforming, and seasons affect
// biodiversity, resource regeneration, soil fertility, and creature populations
// across all 8 zones.
(function(exports) {
  'use strict';

  // ── Optional cross-module dependencies (guard pattern) ──────────────────────

  var WeatherFX = (typeof window !== 'undefined' && window.WeatherFX) || {};
  var WorldShaper = (typeof window !== 'undefined' && window.WorldShaper) || {};
  var CropRotation = (typeof window !== 'undefined' && window.CropRotation) || {};
  var Seasons = (typeof window !== 'undefined' && window.Seasons) || {};
  var WorldPersistence = (typeof window !== 'undefined' && window.WorldPersistence) || {};

  // ── Seeded PRNG (mulberry32) ─────────────────────────────────────────────────

  function mulberry32(seed) {
    return function() {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // Simple string hash for seed generation
  function strHash(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h;
  }

  // Clamp utility
  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  // ── ZONE DEFINITIONS ────────────────────────────────────────────────────────
  // 8 zones with baseline ecological characteristics

  var ZONE_IDS = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];

  var ZONE_ECOLOGY_DEFAULTS = {
    nexus: {
      baselineBiodiversity: 50,
      baselineCreatures: 40,
      dominantSpecies: ['sparrow', 'squirrel', 'rabbit'],
      terrainType: 'urban',
      harvestCapacity: 60,
      weatherSensitivity: 0.6,
      naturalRecoveryRate: 0.4
    },
    gardens: {
      baselineBiodiversity: 80,
      baselineCreatures: 90,
      dominantSpecies: ['butterfly', 'bee', 'hummingbird', 'deer', 'fox'],
      terrainType: 'cultivated',
      harvestCapacity: 120,
      weatherSensitivity: 0.8,
      naturalRecoveryRate: 0.7
    },
    athenaeum: {
      baselineBiodiversity: 65,
      baselineCreatures: 50,
      dominantSpecies: ['owl', 'moth', 'raven', 'bat'],
      terrainType: 'structured',
      harvestCapacity: 40,
      weatherSensitivity: 0.5,
      naturalRecoveryRate: 0.5
    },
    studio: {
      baselineBiodiversity: 45,
      baselineCreatures: 30,
      dominantSpecies: ['pigeon', 'mouse', 'sparrow'],
      terrainType: 'industrial',
      harvestCapacity: 30,
      weatherSensitivity: 0.4,
      naturalRecoveryRate: 0.3
    },
    wilds: {
      baselineBiodiversity: 95,
      baselineCreatures: 150,
      dominantSpecies: ['wolf', 'bear', 'eagle', 'deer', 'fox', 'rabbit', 'hawk'],
      terrainType: 'wilderness',
      harvestCapacity: 200,
      weatherSensitivity: 1.0,
      naturalRecoveryRate: 1.0
    },
    agora: {
      baselineBiodiversity: 55,
      baselineCreatures: 45,
      dominantSpecies: ['pigeon', 'sparrow', 'cat', 'rat'],
      terrainType: 'market',
      harvestCapacity: 50,
      weatherSensitivity: 0.5,
      naturalRecoveryRate: 0.35
    },
    commons: {
      baselineBiodiversity: 70,
      baselineCreatures: 70,
      dominantSpecies: ['rabbit', 'squirrel', 'duck', 'heron'],
      terrainType: 'parkland',
      harvestCapacity: 100,
      weatherSensitivity: 0.7,
      naturalRecoveryRate: 0.65
    },
    arena: {
      baselineBiodiversity: 40,
      baselineCreatures: 25,
      dominantSpecies: ['crow', 'rat', 'lizard'],
      terrainType: 'barren',
      harvestCapacity: 25,
      weatherSensitivity: 0.45,
      naturalRecoveryRate: 0.25
    }
  };

  // ── CREATURE SPECIES CATALOG ─────────────────────────────────────────────────

  var SPECIES_CATALOG = {
    // Herbivores
    rabbit:      { type: 'herbivore', basePop: 30, minViable: 5,  endangered: 8,  reproductionRate: 0.15, foodDemand: 1.0 },
    deer:        { type: 'herbivore', basePop: 15, minViable: 3,  endangered: 4,  reproductionRate: 0.08, foodDemand: 3.0 },
    squirrel:    { type: 'herbivore', basePop: 25, minViable: 5,  endangered: 7,  reproductionRate: 0.18, foodDemand: 0.8 },
    duck:        { type: 'waterfowl', basePop: 20, minViable: 4,  endangered: 5,  reproductionRate: 0.12, foodDemand: 1.2 },
    heron:       { type: 'waterfowl', basePop: 8,  minViable: 2,  endangered: 3,  reproductionRate: 0.06, foodDemand: 2.0 },
    // Pollinators
    butterfly:   { type: 'pollinator', basePop: 50, minViable: 10, endangered: 15, reproductionRate: 0.25, foodDemand: 0.3 },
    bee:         { type: 'pollinator', basePop: 80, minViable: 15, endangered: 20, reproductionRate: 0.30, foodDemand: 0.2 },
    hummingbird: { type: 'pollinator', basePop: 12, minViable: 3,  endangered: 4,  reproductionRate: 0.10, foodDemand: 0.6 },
    // Predators
    wolf:        { type: 'predator', basePop: 8,  minViable: 2,  endangered: 3,  reproductionRate: 0.05, foodDemand: 5.0 },
    bear:        { type: 'predator', basePop: 5,  minViable: 1,  endangered: 2,  reproductionRate: 0.04, foodDemand: 6.0 },
    fox:         { type: 'predator', basePop: 12, minViable: 3,  endangered: 4,  reproductionRate: 0.09, foodDemand: 2.5 },
    owl:         { type: 'predator', basePop: 10, minViable: 2,  endangered: 3,  reproductionRate: 0.07, foodDemand: 1.5 },
    hawk:        { type: 'predator', basePop: 8,  minViable: 2,  endangered: 3,  reproductionRate: 0.07, foodDemand: 2.0 },
    eagle:       { type: 'predator', basePop: 6,  minViable: 1,  endangered: 2,  reproductionRate: 0.05, foodDemand: 3.0 },
    // Urban
    sparrow:     { type: 'urban', basePop: 40, minViable: 8,  endangered: 10, reproductionRate: 0.20, foodDemand: 0.4 },
    pigeon:      { type: 'urban', basePop: 35, minViable: 7,  endangered: 9,  reproductionRate: 0.18, foodDemand: 0.5 },
    cat:         { type: 'urban', basePop: 15, minViable: 3,  endangered: 4,  reproductionRate: 0.10, foodDemand: 1.5 },
    rat:         { type: 'urban', basePop: 50, minViable: 10, endangered: 12, reproductionRate: 0.35, foodDemand: 0.6 },
    mouse:       { type: 'urban', basePop: 45, minViable: 9,  endangered: 11, reproductionRate: 0.30, foodDemand: 0.4 },
    // Nocturnal
    bat:         { type: 'nocturnal', basePop: 20, minViable: 4,  endangered: 6,  reproductionRate: 0.08, foodDemand: 0.8 },
    moth:        { type: 'nocturnal', basePop: 30, minViable: 6,  endangered: 8,  reproductionRate: 0.22, foodDemand: 0.3 },
    raven:       { type: 'nocturnal', basePop: 10, minViable: 2,  endangered: 3,  reproductionRate: 0.07, foodDemand: 1.8 },
    // Reptiles
    lizard:      { type: 'reptile', basePop: 18, minViable: 4,  endangered: 5,  reproductionRate: 0.12, foodDemand: 0.7 },
    // Other
    crow:        { type: 'scavenger', basePop: 22, minViable: 4,  endangered: 6,  reproductionRate: 0.14, foodDemand: 1.0 }
  };

  // ── WEATHER ECOLOGY IMPACT TABLE ─────────────────────────────────────────────
  // How each weather type cumulatively affects ecology

  var WEATHER_ECOLOGY_IMPACT = {
    clear: {
      biodiversityDelta: 0.5,
      soilMoistureDelta: -0.3,
      creatureActivityMod: 1.0,
      harvestCapacityMod: 1.0,
      pollinatorMod: 1.2,
      description: 'Ideal growing conditions'
    },
    rain: {
      biodiversityDelta: 0.8,
      soilMoistureDelta: 2.0,
      creatureActivityMod: 0.8,
      harvestCapacityMod: 1.15,
      pollinatorMod: 0.7,
      description: 'Gentle rain nourishes flora'
    },
    heavy_rain: {
      biodiversityDelta: -0.3,
      soilMoistureDelta: 4.0,
      creatureActivityMod: 0.5,
      harvestCapacityMod: 0.9,
      pollinatorMod: 0.3,
      description: 'Heavy rain stresses some species'
    },
    snow: {
      biodiversityDelta: -0.5,
      soilMoistureDelta: 1.0,
      creatureActivityMod: 0.6,
      harvestCapacityMod: 0.6,
      pollinatorMod: 0.1,
      description: 'Snow reduces surface activity'
    },
    blizzard: {
      biodiversityDelta: -2.0,
      soilMoistureDelta: 2.0,
      creatureActivityMod: 0.2,
      harvestCapacityMod: 0.3,
      pollinatorMod: 0.0,
      description: 'Blizzard severely stresses ecosystem'
    },
    fog: {
      biodiversityDelta: 0.2,
      soilMoistureDelta: 0.5,
      creatureActivityMod: 0.9,
      harvestCapacityMod: 0.95,
      pollinatorMod: 0.6,
      description: 'Fog muffles but does not harm'
    },
    thunderstorm: {
      biodiversityDelta: -1.5,
      soilMoistureDelta: 3.5,
      creatureActivityMod: 0.3,
      harvestCapacityMod: 0.75,
      pollinatorMod: 0.1,
      description: 'Storms disturb nesting and pollinators'
    },
    sandstorm: {
      biodiversityDelta: -3.0,
      soilMoistureDelta: -2.0,
      creatureActivityMod: 0.1,
      harvestCapacityMod: 0.5,
      pollinatorMod: 0.0,
      description: 'Sandstorm scours the landscape'
    },
    mist: {
      biodiversityDelta: 0.3,
      soilMoistureDelta: 0.4,
      creatureActivityMod: 0.85,
      harvestCapacityMod: 1.0,
      pollinatorMod: 0.8,
      description: 'Mist is gentle on ecology'
    }
  };

  // ── SEASON ECOLOGY MODIFIERS ─────────────────────────────────────────────────

  var SEASON_ECOLOGY_MODIFIERS = {
    spring: {
      biodiversityGrowthMod: 1.5,
      creatureReproductionMod: 1.8,
      harvestCapacityMod: 1.2,
      soilFertilityMod: 1.3,
      description: 'Spring brings renewal to all life'
    },
    summer: {
      biodiversityGrowthMod: 1.2,
      creatureReproductionMod: 1.2,
      harvestCapacityMod: 1.5,
      soilFertilityMod: 1.0,
      description: 'Summer sustains peak activity'
    },
    autumn: {
      biodiversityGrowthMod: 0.8,
      creatureReproductionMod: 0.7,
      harvestCapacityMod: 1.3,
      soilFertilityMod: 1.1,
      description: 'Autumn harvests enrich and slow'
    },
    winter: {
      biodiversityGrowthMod: 0.3,
      creatureReproductionMod: 0.2,
      harvestCapacityMod: 0.4,
      soilFertilityMod: 0.9,
      description: 'Winter dormancy slows all growth'
    }
  };

  // ── TERRAFORMING ECOLOGY IMPACT ───────────────────────────────────────────────

  var TERRAFORM_ECOLOGY_IMPACT = {
    // Positive actions
    plant_tree:      { biodiversityDelta: 2.0,  soilFertilityDelta: 1.5, radiusEffect: 15, category: 'restoration' },
    plant_flowers:   { biodiversityDelta: 1.5,  soilFertilityDelta: 0.8, radiusEffect: 10, category: 'restoration' },
    create_pond:     { biodiversityDelta: 3.0,  soilFertilityDelta: 2.0, radiusEffect: 20, category: 'restoration' },
    restore_habitat: { biodiversityDelta: 4.0,  soilFertilityDelta: 2.5, radiusEffect: 25, category: 'restoration' },
    compost:         { biodiversityDelta: 1.0,  soilFertilityDelta: 3.0, radiusEffect: 8,  category: 'restoration' },
    // Negative actions
    clear_land:      { biodiversityDelta: -3.0, soilFertilityDelta: -2.0, radiusEffect: 20, category: 'disruption' },
    mine_stone:      { biodiversityDelta: -2.0, soilFertilityDelta: -1.5, radiusEffect: 15, category: 'disruption' },
    build_structure: { biodiversityDelta: -1.5, soilFertilityDelta: -1.0, radiusEffect: 12, category: 'disruption' },
    dig_trench:      { biodiversityDelta: -1.0, soilFertilityDelta: -0.5, radiusEffect: 8,  category: 'disruption' },
    burn_area:       { biodiversityDelta: -5.0, soilFertilityDelta: -4.0, radiusEffect: 30, category: 'disruption' }
  };

  // ── CONSERVATION ACTION TYPES ─────────────────────────────────────────────────

  var CONSERVATION_ACTIONS = {
    replant:         { biodiversityBonus: 3.0, creatureBonus: 5,  soilFertilityBonus: 2.0, cost: 10 },
    seed_bomb:       { biodiversityBonus: 2.0, creatureBonus: 2,  soilFertilityBonus: 1.0, cost: 5  },
    wildlife_refuge: { biodiversityBonus: 5.0, creatureBonus: 15, soilFertilityBonus: 3.0, cost: 25 },
    pollinator_garden: { biodiversityBonus: 4.0, creatureBonus: 10, soilFertilityBonus: 2.5, cost: 15 },
    water_source:    { biodiversityBonus: 3.5, creatureBonus: 12, soilFertilityBonus: 1.5, cost: 20 },
    anti_poaching:   { biodiversityBonus: 1.0, creatureBonus: 8,  soilFertilityBonus: 0.5, cost: 8  },
    invasive_removal:{ biodiversityBonus: 2.5, creatureBonus: 6,  soilFertilityBonus: 1.5, cost: 12 }
  };

  // ── DROUGHT TRACKING ─────────────────────────────────────────────────────────

  var DROUGHT_THRESHOLD_DAYS = 10;     // Days without rain before drought begins
  var DROUGHT_BIODIVERSITY_PENALTY = 0.8; // Per tick during drought

  // ── MODULE STATE ─────────────────────────────────────────────────────────────

  var _state = null;

  function _defaultZoneEcology(zoneId) {
    var def = ZONE_ECOLOGY_DEFAULTS[zoneId] || ZONE_ECOLOGY_DEFAULTS['nexus'];
    var creatures = {};
    var species = def.dominantSpecies || [];
    // Scale initial population by zone's baselineCreatures distributed across species.
    // This ensures wilds (150 baseline) starts with more total creatures than studio (30).
    var baselineTotal = def.baselineCreatures || 50;
    var perSpeciesTarget = species.length > 0 ? baselineTotal / species.length : baselineTotal;
    for (var i = 0; i < species.length; i++) {
      var sp = species[i];
      var catalog = SPECIES_CATALOG[sp];
      if (catalog) {
        // Use the larger of catalog base or zone-proportional target
        var zoneScaled = Math.round(perSpeciesTarget * 0.9);
        creatures[sp] = Math.max(catalog.minViable + 1, zoneScaled);
      }
    }
    return {
      biodiversity: def.baselineBiodiversity,
      harvestPressure: 0,            // 0-100 accumulated pressure
      harvestCapacity: def.harvestCapacity,
      regenerationRate: 1.0,         // multiplier (1.0 = normal)
      soilFertility: 60,             // 0-100
      soilMoisture: 50,              // 0-100
      creatures: creatures,
      weatherHistory: [],            // last N weather events
      consecutiveDryDays: 0,
      droughtActive: false,
      conservationScore: 0,          // cumulative conservation actions
      terraformDelta: 0,             // net terraforming impact
      lastSeasonalUpdate: null,
      trendHistory: [],              // biodiversity readings over time
      alerts: [],                    // active conservation alerts
      totalHarvestEvents: 0,
      totalConservationActions: 0
    };
  }

  function _initState() {
    var zones = {};
    for (var i = 0; i < ZONE_IDS.length; i++) {
      zones[ZONE_IDS[i]] = _defaultZoneEcology(ZONE_IDS[i]);
    }
    return {
      zones: zones,
      globalWeatherStreak: { type: null, days: 0 },
      tick: 0,
      season: 'spring',
      worldConservationPoints: 0,
      endangeredAlerts: [],
      ecologyLog: []
    };
  }

  function _ensureState() {
    if (!_state) _state = _initState();
    return _state;
  }

  // ── CORE BIODIVERSITY CALCULATION ────────────────────────────────────────────

  /**
   * Compute live biodiversity score (0-100) for a zone.
   * Considers creature population richness, species diversity count, and soil health.
   * Zones with more species types score higher even at equal fill-rates.
   */
  function computeBiodiversity(zoneId) {
    var st = _ensureState();
    var z = st.zones[zoneId];
    if (!z) return 0;

    // Count species above viable threshold
    var speciesCount = 0;
    var totalPop = 0;
    var viableSpecies = 0;
    var keys = Object.keys(z.creatures);
    for (var i = 0; i < keys.length; i++) {
      var sp = keys[i];
      var pop = z.creatures[sp];
      var catalog = SPECIES_CATALOG[sp];
      if (pop > 0) {
        speciesCount++;
        totalPop += pop;
        if (catalog && pop >= catalog.minViable) viableSpecies++;
      }
    }

    // Species richness component (0-35): fraction of viable species out of total present
    var maxSpecies = ZONE_ECOLOGY_DEFAULTS[zoneId]
      ? ZONE_ECOLOGY_DEFAULTS[zoneId].dominantSpecies.length
      : 5;
    var richness = maxSpecies > 0 ? (viableSpecies / maxSpecies) * 35 : 17.5;

    // Species diversity bonus (0-15): absolute species count rewards zones with more types
    var GLOBAL_MAX_SPECIES = 10; // wilds has 7, most have 3-5
    var diversityBonus = Math.min(viableSpecies / GLOBAL_MAX_SPECIES, 1.0) * 15;

    // Soil component (0-30)
    var soilScore = (z.soilFertility * 0.6 + z.soilMoisture * 0.4) * 0.3;

    // Harvest pressure penalty (0-20 penalty)
    var pressurePenalty = (z.harvestPressure / 100) * 20;

    var score = richness + diversityBonus + soilScore - pressurePenalty + (z.conservationScore * 0.1);
    return clamp(score, 0, 100);
  }

  // ── RESOURCE REGENERATION ────────────────────────────────────────────────────

  /**
   * Apply harvest pressure to a zone.
   * @param {string} zoneId
   * @param {number} amount - harvest intensity (1-10)
   * @returns {object} {newPressure, regenMultiplier, warning}
   */
  function applyHarvestPressure(zoneId, amount) {
    var st = _ensureState();
    var z = st.zones[zoneId];
    if (!z) return { newPressure: 0, regenMultiplier: 1, warning: null };

    var pressure = clamp(amount || 1, 0.1, 10);
    z.harvestPressure = clamp(z.harvestPressure + pressure * 5, 0, 100);
    z.totalHarvestEvents++;

    // Regeneration rate decreases with pressure
    z.regenerationRate = clamp(1.0 - (z.harvestPressure / 100) * 0.8, 0.2, 1.0);

    // Reduce soil fertility slightly with heavy harvest
    if (z.harvestPressure > 60) {
      z.soilFertility = clamp(z.soilFertility - pressure * 0.5, 0, 100);
    }

    // Compute updated biodiversity
    z.biodiversity = computeBiodiversity(zoneId);

    var warning = null;
    if (z.harvestPressure >= 80) {
      warning = 'CRITICAL: ' + zoneId + ' is severely over-harvested. Biodiversity at risk.';
    } else if (z.harvestPressure >= 60) {
      warning = 'WARNING: ' + zoneId + ' harvest pressure is high.';
    }

    return {
      newPressure: z.harvestPressure,
      regenMultiplier: z.regenerationRate,
      warning: warning
    };
  }

  /**
   * Tick natural recovery — reduces harvest pressure and rebuilds biodiversity.
   * Called each game tick when zone is not being harvested.
   * @param {string} zoneId
   * @param {string} season
   */
  function tickRecovery(zoneId, season) {
    var st = _ensureState();
    var z = st.zones[zoneId];
    if (!z) return;

    var def = ZONE_ECOLOGY_DEFAULTS[zoneId] || {};
    var baseRecovery = def.naturalRecoveryRate || 0.5;
    var seasonMod = SEASON_ECOLOGY_MODIFIERS[season] || SEASON_ECOLOGY_MODIFIERS['spring'];

    // Reduce harvest pressure
    var pressureRecovery = baseRecovery * seasonMod.biodiversityGrowthMod * 2;
    z.harvestPressure = clamp(z.harvestPressure - pressureRecovery, 0, 100);

    // Restore soil moisture naturally
    if (!z.droughtActive) {
      z.soilMoisture = clamp(z.soilMoisture + 0.3, 0, 100);
    }

    // Update regeneration rate
    z.regenerationRate = clamp(1.0 - (z.harvestPressure / 100) * 0.8, 0.2, 1.0);

    // Slowly restore biodiversity when pressure is low
    if (z.harvestPressure < 30) {
      var def2 = ZONE_ECOLOGY_DEFAULTS[zoneId] || {};
      var target = def2.baselineBiodiversity || 60;
      if (z.biodiversity < target) {
        var growthRate = baseRecovery * seasonMod.biodiversityGrowthMod * 0.5;
        z.biodiversity = clamp(z.biodiversity + growthRate, 0, 100);
      }
    }

    // Refresh computed score
    z.biodiversity = clamp(computeBiodiversity(zoneId), z.biodiversity - 1, z.biodiversity + 1);
  }

  // ── CREATURE POPULATION MANAGEMENT ──────────────────────────────────────────

  /**
   * Update creature populations for a zone based on ecology health.
   * @param {string} zoneId
   * @param {string} season
   * @returns {object} populationChanges map
   */
  function updateCreaturePopulations(zoneId, season) {
    var st = _ensureState();
    var z = st.zones[zoneId];
    if (!z) return {};

    var seasonMod = SEASON_ECOLOGY_MODIFIERS[season] || SEASON_ECOLOGY_MODIFIERS['spring'];
    var ecoHealth = z.biodiversity / 100;
    var changes = {};
    var prng = mulberry32(strHash(zoneId + st.tick));

    var keys = Object.keys(z.creatures);
    for (var i = 0; i < keys.length; i++) {
      var sp = keys[i];
      var pop = z.creatures[sp];
      var catalog = SPECIES_CATALOG[sp];
      if (!catalog) continue;

      // Drought kills creatures faster
      var droughtPenalty = z.droughtActive ? 0.05 * catalog.foodDemand : 0;

      // Harvest pressure reduces habitat
      var habitatPressure = (z.harvestPressure / 100) * 0.1 * catalog.foodDemand;

      // Natural change
      var growthRate = catalog.reproductionRate * seasonMod.creatureReproductionMod * ecoHealth;
      var deathRate = 0.03 + habitatPressure + droughtPenalty;

      // Random variation
      var noise = (prng() - 0.5) * 0.04;
      var netChange = Math.round((growthRate - deathRate + noise) * pop);

      var newPop = clamp(pop + netChange, 0, catalog.basePop * 3);
      z.creatures[sp] = newPop;
      changes[sp] = newPop - pop;
    }

    return changes;
  }

  /**
   * Get creature count for a specific species in a zone.
   */
  function getCreatureCount(zoneId, species) {
    var st = _ensureState();
    var z = st.zones[zoneId];
    if (!z || !z.creatures) return 0;
    return z.creatures[species] || 0;
  }

  /**
   * Get total creature population across all species in a zone.
   */
  function getTotalCreaturePopulation(zoneId) {
    var st = _ensureState();
    var z = st.zones[zoneId];
    if (!z || !z.creatures) return 0;
    var total = 0;
    var keys = Object.keys(z.creatures);
    for (var i = 0; i < keys.length; i++) {
      total += z.creatures[keys[i]];
    }
    return total;
  }

  // ── WEATHER IMPACT ────────────────────────────────────────────────────────────

  /**
   * Apply a weather event to a zone's ecology.
   * @param {string} zoneId
   * @param {string} weatherType - from WEATHER_TYPES
   * @param {number} intensity - 0-1 (default 1.0)
   */
  function applyWeatherEvent(zoneId, weatherType, intensity) {
    var st = _ensureState();
    var z = st.zones[zoneId];
    if (!z) return { applied: false, reason: 'zone not found' };

    var impact = WEATHER_ECOLOGY_IMPACT[weatherType];
    if (!impact) return { applied: false, reason: 'unknown weather type' };

    var eff = intensity !== undefined ? clamp(intensity, 0, 2) : 1.0;
    var def = ZONE_ECOLOGY_DEFAULTS[zoneId] || {};
    var sensitivity = def.weatherSensitivity || 0.7;

    // Update soil moisture
    z.soilMoisture = clamp(z.soilMoisture + impact.soilMoistureDelta * eff, 0, 100);

    // Apply biodiversity delta
    var biodivChange = impact.biodiversityDelta * eff * sensitivity;
    z.biodiversity = clamp(z.biodiversity + biodivChange, 0, 100);

    // Track drought
    if (weatherType === 'clear' || weatherType === 'sandstorm') {
      z.consecutiveDryDays++;
    } else if (impact.soilMoistureDelta > 0) {
      z.consecutiveDryDays = 0;
      z.droughtActive = false;
    }

    if (z.consecutiveDryDays >= DROUGHT_THRESHOLD_DAYS) {
      z.droughtActive = true;
      z.biodiversity = clamp(z.biodiversity - DROUGHT_BIODIVERSITY_PENALTY, 0, 100);
    }

    // Store in weather history (max 30 entries)
    z.weatherHistory.push({ type: weatherType, intensity: eff, tick: st.tick });
    if (z.weatherHistory.length > 30) {
      z.weatherHistory.shift();
    }

    // Update harvest capacity modifier
    z.harvestCapacity = clamp(
      (def.harvestCapacity || 100) * impact.harvestCapacityMod,
      10,
      (def.harvestCapacity || 100) * 2
    );

    // Modify pollinator species population (butterflies, bees)
    if (impact.pollinatorMod < 1.0) {
      var pollinators = ['butterfly', 'bee', 'hummingbird', 'moth'];
      for (var i = 0; i < pollinators.length; i++) {
        var sp = pollinators[i];
        if (z.creatures[sp] !== undefined) {
          var reduction = Math.round(z.creatures[sp] * (1 - impact.pollinatorMod) * 0.1);
          z.creatures[sp] = clamp(z.creatures[sp] - reduction, 0, z.creatures[sp]);
        }
      }
    }

    return {
      applied: true,
      weatherType: weatherType,
      biodivChange: biodivChange,
      newBiodiversity: z.biodiversity,
      droughtActive: z.droughtActive,
      soilMoisture: z.soilMoisture
    };
  }

  /**
   * Apply cumulative weather streak effect (drought, flooding, etc.)
   * @param {string} zoneId
   * @returns {object} streak analysis result
   */
  function analyzeCumulativeWeather(zoneId) {
    var st = _ensureState();
    var z = st.zones[zoneId];
    if (!z) return { drought: false, flooding: false, streakDays: 0 };

    var history = z.weatherHistory;
    var dryCount = 0;
    var wetCount = 0;

    for (var i = history.length - 1; i >= 0; i--) {
      var t = history[i].type;
      if (t === 'clear' || t === 'sandstorm') {
        dryCount++;
      } else if (t === 'rain' || t === 'heavy_rain' || t === 'thunderstorm') {
        wetCount++;
      } else {
        break;
      }
    }

    var flooding = wetCount >= 7;
    var drought = dryCount >= DROUGHT_THRESHOLD_DAYS;

    return {
      drought: drought,
      flooding: flooding,
      dryStreak: dryCount,
      wetStreak: wetCount,
      droughtActive: z.droughtActive,
      consecutiveDryDays: z.consecutiveDryDays
    };
  }

  // ── TERRAFORMING EFFECTS ──────────────────────────────────────────────────────

  /**
   * Apply terraforming action to a zone's ecology.
   * @param {string} zoneId
   * @param {string} actionType - from TERRAFORM_ECOLOGY_IMPACT
   * @param {number} scale - 0.1-3.0 (default 1.0)
   */
  function applyTerraformingEffect(zoneId, actionType, scale) {
    var st = _ensureState();
    var z = st.zones[zoneId];
    if (!z) return { applied: false, reason: 'zone not found' };

    var impact = TERRAFORM_ECOLOGY_IMPACT[actionType];
    if (!impact) return { applied: false, reason: 'unknown action type' };

    var s = scale !== undefined ? clamp(scale, 0.1, 3.0) : 1.0;

    var biodivDelta = impact.biodiversityDelta * s;
    var soilDelta = impact.soilFertilityDelta * s;

    z.biodiversity = clamp(z.biodiversity + biodivDelta, 0, 100);
    z.soilFertility = clamp(z.soilFertility + soilDelta, 0, 100);
    z.terraformDelta += biodivDelta;

    // Restoration actions help creatures
    if (impact.category === 'restoration') {
      var keys = Object.keys(z.creatures);
      for (var i = 0; i < keys.length; i++) {
        var sp = keys[i];
        var catalog = SPECIES_CATALOG[sp];
        if (catalog) {
          var boost = Math.round(catalog.basePop * 0.05 * s);
          z.creatures[sp] = clamp(z.creatures[sp] + boost, 0, catalog.basePop * 3);
        }
      }
    }

    // Disruption actions harm creatures
    if (impact.category === 'disruption') {
      var keys2 = Object.keys(z.creatures);
      for (var j = 0; j < keys2.length; j++) {
        var sp2 = keys2[j];
        var catalog2 = SPECIES_CATALOG[sp2];
        if (catalog2) {
          var harm = Math.round(catalog2.basePop * 0.05 * s);
          z.creatures[sp2] = clamp(z.creatures[sp2] - harm, 0, catalog2.basePop * 3);
        }
      }
    }

    return {
      applied: true,
      actionType: actionType,
      category: impact.category,
      biodivDelta: biodivDelta,
      soilDelta: soilDelta,
      newBiodiversity: z.biodiversity,
      newSoilFertility: z.soilFertility
    };
  }

  // ── CONSERVATION MECHANICS ────────────────────────────────────────────────────

  /**
   * Perform a conservation action in a zone.
   * @param {string} zoneId
   * @param {string} actionType - from CONSERVATION_ACTIONS
   * @param {string} performedBy - player name
   */
  function performConservationAction(zoneId, actionType, performedBy) {
    var st = _ensureState();
    var z = st.zones[zoneId];
    if (!z) return { success: false, reason: 'zone not found' };

    var action = CONSERVATION_ACTIONS[actionType];
    if (!action) return { success: false, reason: 'unknown action type' };

    z.biodiversity = clamp(z.biodiversity + action.biodiversityBonus, 0, 100);
    z.soilFertility = clamp(z.soilFertility + action.soilFertilityBonus, 0, 100);
    z.conservationScore += action.biodiversityBonus;
    z.totalConservationActions++;
    st.worldConservationPoints += action.biodiversityBonus;

    // Boost creature populations
    var keys = Object.keys(z.creatures);
    for (var i = 0; i < keys.length; i++) {
      var sp = keys[i];
      var catalog = SPECIES_CATALOG[sp];
      if (catalog) {
        z.creatures[sp] = clamp(
          z.creatures[sp] + Math.round(action.creatureBonus * 0.3),
          0,
          catalog.basePop * 3
        );
      }
    }

    // Reduce harvest pressure slightly
    z.harvestPressure = clamp(z.harvestPressure - action.biodiversityBonus * 0.5, 0, 100);

    // Log conservation action
    st.ecologyLog.push({
      tick: st.tick,
      zone: zoneId,
      action: actionType,
      performer: performedBy || 'unknown',
      biodivGain: action.biodiversityBonus
    });
    if (st.ecologyLog.length > 100) st.ecologyLog.shift();

    return {
      success: true,
      actionType: actionType,
      zoneId: zoneId,
      biodiversityGain: action.biodiversityBonus,
      soilFertilityGain: action.soilFertilityBonus,
      creatureBonus: action.creatureBonus,
      newBiodiversity: z.biodiversity,
      conservationScore: z.conservationScore
    };
  }

  // ── SEASONAL CYCLE ────────────────────────────────────────────────────────────

  /**
   * Advance ecology by one seasonal tick.
   * @param {string} newSeason
   */
  function advanceSeason(newSeason) {
    var st = _ensureState();
    st.season = newSeason;
    var mod = SEASON_ECOLOGY_MODIFIERS[newSeason] || SEASON_ECOLOGY_MODIFIERS['spring'];

    for (var i = 0; i < ZONE_IDS.length; i++) {
      var zoneId = ZONE_IDS[i];
      var z = st.zones[zoneId];
      if (!z) continue;

      // Seasonal soil fertility change
      z.soilFertility = clamp(z.soilFertility * mod.soilFertilityMod, 0, 100);

      // Seasonal harvest capacity change
      var def = ZONE_ECOLOGY_DEFAULTS[zoneId] || {};
      z.harvestCapacity = clamp(
        (def.harvestCapacity || 100) * mod.harvestCapacityMod,
        5,
        (def.harvestCapacity || 100) * 2
      );

      z.lastSeasonalUpdate = newSeason;

      // Record biodiversity trend
      z.trendHistory.push({
        season: newSeason,
        tick: st.tick,
        biodiversity: z.biodiversity,
        harvestPressure: z.harvestPressure,
        creatureTotal: getTotalCreaturePopulation(zoneId)
      });
      if (z.trendHistory.length > 20) z.trendHistory.shift();
    }
  }

  // ── SOIL HEALTH INTEGRATION ───────────────────────────────────────────────────

  /**
   * Sync soil state from CropRotation module (if available).
   * @param {string} zoneId
   * @param {object} soilData - {nitrogen, phosphorus, potassium, moisture, organicMatter}
   */
  function syncSoilState(zoneId, soilData) {
    var st = _ensureState();
    var z = st.zones[zoneId];
    if (!z || !soilData) return false;

    // Average NPK for fertility proxy
    var npkAvg = ((soilData.nitrogen || 0) + (soilData.phosphorus || 0) + (soilData.potassium || 0)) / 3;
    var om = soilData.organicMatter || 0;

    z.soilFertility = clamp(npkAvg * 0.8 + om * 0.4, 0, 100);

    if (soilData.moisture !== undefined) {
      z.soilMoisture = clamp(soilData.moisture, 0, 100);
    }

    // High organic matter boosts biodiversity
    if (om > 60) {
      z.biodiversity = clamp(z.biodiversity + 0.5, 0, 100);
    }

    return true;
  }

  /**
   * Get soil health summary for a zone.
   */
  function getSoilHealth(zoneId) {
    var st = _ensureState();
    var z = st.zones[zoneId];
    if (!z) return null;

    var fertility = z.soilFertility;
    var moisture = z.soilMoisture;
    var compositeScore = fertility * 0.6 + moisture * 0.4;

    var grade;
    if (compositeScore >= 80) grade = 'excellent';
    else if (compositeScore >= 60) grade = 'good';
    else if (compositeScore >= 40) grade = 'fair';
    else if (compositeScore >= 20) grade = 'poor';
    else grade = 'critical';

    return {
      zoneId: zoneId,
      fertility: fertility,
      moisture: moisture,
      compositeScore: compositeScore,
      grade: grade,
      supportedYieldMod: clamp(compositeScore / 100, 0.1, 1.5)
    };
  }

  // ── ECOLOGY REPORTS ───────────────────────────────────────────────────────────

  /**
   * Generate a full ecology health report for a zone.
   * @param {string} zoneId
   * @returns {object} comprehensive ecology report
   */
  function getZoneEcologyReport(zoneId) {
    var st = _ensureState();
    var z = st.zones[zoneId];
    if (!z) return { error: 'Zone not found: ' + zoneId };

    var def = ZONE_ECOLOGY_DEFAULTS[zoneId] || {};

    // Biodiversity trend
    var trend = 'stable';
    if (z.trendHistory.length >= 2) {
      var latest = z.trendHistory[z.trendHistory.length - 1].biodiversity;
      var previous = z.trendHistory[z.trendHistory.length - 2].biodiversity;
      if (latest > previous + 2) trend = 'improving';
      else if (latest < previous - 2) trend = 'declining';
    }

    // Endangered species check
    var endangered = [];
    var keys = Object.keys(z.creatures);
    for (var i = 0; i < keys.length; i++) {
      var sp = keys[i];
      var pop = z.creatures[sp];
      var catalog = SPECIES_CATALOG[sp];
      if (catalog && pop > 0 && pop <= catalog.endangered) {
        endangered.push({ species: sp, population: pop, threshold: catalog.endangered });
      }
    }

    // Weather pattern summary
    var recentWeather = z.weatherHistory.slice(-7);
    var weatherSummary = {};
    for (var j = 0; j < recentWeather.length; j++) {
      var wt = recentWeather[j].type;
      weatherSummary[wt] = (weatherSummary[wt] || 0) + 1;
    }

    // Health grade
    var bio = z.biodiversity;
    var healthGrade;
    if (bio >= 80) healthGrade = 'thriving';
    else if (bio >= 60) healthGrade = 'healthy';
    else if (bio >= 40) healthGrade = 'stressed';
    else if (bio >= 20) healthGrade = 'degraded';
    else healthGrade = 'critical';

    return {
      zoneId: zoneId,
      biodiversity: z.biodiversity,
      healthGrade: healthGrade,
      trend: trend,
      harvestPressure: z.harvestPressure,
      harvestCapacity: z.harvestCapacity,
      regenerationRate: z.regenerationRate,
      soilFertility: z.soilFertility,
      soilMoisture: z.soilMoisture,
      droughtActive: z.droughtActive,
      consecutiveDryDays: z.consecutiveDryDays,
      creatureCount: getTotalCreaturePopulation(zoneId),
      speciesCount: keys.length,
      creatures: JSON.parse(JSON.stringify(z.creatures)),
      endangeredSpecies: endangered,
      conservationScore: z.conservationScore,
      totalHarvestEvents: z.totalHarvestEvents,
      totalConservationActions: z.totalConservationActions,
      weatherSummary: weatherSummary,
      recentTrend: z.trendHistory.slice(-5),
      alerts: z.alerts.slice(),
      terraformDelta: z.terraformDelta,
      terrainType: def.terrainType || 'unknown',
      dominantSpecies: def.dominantSpecies || []
    };
  }

  /**
   * Generate world ecology summary across all zones.
   */
  function getWorldEcologyReport() {
    var st = _ensureState();
    var reports = {};
    var totalBiodiversity = 0;
    var totalEndangered = 0;
    var criticalZones = [];
    var thrivingZones = [];

    for (var i = 0; i < ZONE_IDS.length; i++) {
      var zoneId = ZONE_IDS[i];
      var r = getZoneEcologyReport(zoneId);
      reports[zoneId] = r;
      totalBiodiversity += r.biodiversity;
      totalEndangered += r.endangeredSpecies.length;
      if (r.biodiversity < 30) criticalZones.push(zoneId);
      if (r.biodiversity >= 75) thrivingZones.push(zoneId);
    }

    return {
      tick: st.tick,
      season: st.season,
      averageBiodiversity: totalBiodiversity / ZONE_IDS.length,
      worldConservationPoints: st.worldConservationPoints,
      totalEndangeredCases: totalEndangered,
      criticalZones: criticalZones,
      thrivingZones: thrivingZones,
      zones: reports,
      ecologyLogSize: st.ecologyLog.length
    };
  }

  // ── ENDANGERED SPECIES SYSTEM ─────────────────────────────────────────────────

  /**
   * Check all zones for endangered species and fire alerts.
   * @returns {Array} list of endangered species alerts
   */
  function checkEndangeredSpecies() {
    var st = _ensureState();
    var alerts = [];
    st.endangeredAlerts = [];

    for (var i = 0; i < ZONE_IDS.length; i++) {
      var zoneId = ZONE_IDS[i];
      var z = st.zones[zoneId];
      if (!z) continue;

      var keys = Object.keys(z.creatures);
      for (var j = 0; j < keys.length; j++) {
        var sp = keys[j];
        var pop = z.creatures[sp];
        var catalog = SPECIES_CATALOG[sp];
        if (!catalog) continue;

        if (pop <= 0) {
          var alert = {
            severity: 'extinct',
            zone: zoneId,
            species: sp,
            population: 0,
            threshold: catalog.endangered,
            message: sp + ' has gone extinct in ' + zoneId + '!'
          };
          alerts.push(alert);
          st.endangeredAlerts.push(alert);
          z.alerts.push(alert.message);
        } else if (pop <= catalog.endangered) {
          var alert2 = {
            severity: pop <= catalog.minViable ? 'critical' : 'warning',
            zone: zoneId,
            species: sp,
            population: pop,
            threshold: catalog.endangered,
            message: sp + ' is endangered in ' + zoneId + ' (pop: ' + pop + ')'
          };
          alerts.push(alert2);
          st.endangeredAlerts.push(alert2);
        }
      }
    }

    return alerts;
  }

  /**
   * Get endangered species for a specific zone.
   */
  function getEndangeredInZone(zoneId) {
    var st = _ensureState();
    var z = st.zones[zoneId];
    if (!z) return [];

    var result = [];
    var keys = Object.keys(z.creatures);
    for (var i = 0; i < keys.length; i++) {
      var sp = keys[i];
      var pop = z.creatures[sp];
      var catalog = SPECIES_CATALOG[sp];
      if (catalog && pop <= catalog.endangered) {
        result.push({
          species: sp,
          population: pop,
          minViable: catalog.minViable,
          endangeredThreshold: catalog.endangered,
          type: catalog.type,
          isExtinct: pop <= 0,
          isCritical: pop <= catalog.minViable && pop > 0
        });
      }
    }
    return result;
  }

  // ── ECOLOGY TICK (MAIN SIMULATION STEP) ──────────────────────────────────────

  /**
   * Advance the full ecology simulation by one tick.
   * @param {object} options - {season, weather, harvestedZones}
   */
  function tick(options) {
    var st = _ensureState();
    st.tick++;

    var season = (options && options.season) || st.season || 'spring';
    var weather = (options && options.weather) || null;
    var harvestedZones = (options && options.harvestedZones) || [];

    for (var i = 0; i < ZONE_IDS.length; i++) {
      var zoneId = ZONE_IDS[i];
      var isHarvested = harvestedZones.indexOf(zoneId) !== -1;

      if (isHarvested) {
        applyHarvestPressure(zoneId, 1);
      } else {
        tickRecovery(zoneId, season);
      }

      if (weather) {
        applyWeatherEvent(zoneId, weather, 1.0);
      }

      updateCreaturePopulations(zoneId, season);
    }

    // Check for endangered species
    checkEndangeredSpecies();

    return {
      tick: st.tick,
      season: season,
      endangeredAlerts: st.endangeredAlerts.length
    };
  }

  // ── TREND FORECASTING ─────────────────────────────────────────────────────────

  /**
   * Forecast biodiversity trend for a zone based on history.
   * @param {string} zoneId
   * @param {number} horizonTicks - how many ticks ahead to predict
   */
  function forecastBiodiversity(zoneId, horizonTicks) {
    var st = _ensureState();
    var z = st.zones[zoneId];
    if (!z) return { error: 'Zone not found' };

    var history = z.trendHistory;
    if (history.length < 2) {
      return {
        zoneId: zoneId,
        currentBiodiversity: z.biodiversity,
        trend: 'insufficient_data',
        forecastedBiodiversity: z.biodiversity,
        confidence: 'low'
      };
    }

    // Simple linear regression on recent trend
    var n = Math.min(history.length, 5);
    var sum = 0;
    var count = 0;
    for (var i = history.length - n; i < history.length - 1; i++) {
      sum += history[i + 1].biodiversity - history[i].biodiversity;
      count++;
    }
    var avgDelta = count > 0 ? sum / count : 0;

    var horizon = horizonTicks || 5;
    var forecast = clamp(z.biodiversity + avgDelta * horizon, 0, 100);

    var trend;
    if (avgDelta > 1) trend = 'strongly_improving';
    else if (avgDelta > 0.2) trend = 'improving';
    else if (avgDelta < -1) trend = 'strongly_declining';
    else if (avgDelta < -0.2) trend = 'declining';
    else trend = 'stable';

    return {
      zoneId: zoneId,
      currentBiodiversity: z.biodiversity,
      avgDeltaPerTick: avgDelta,
      forecastedBiodiversity: forecast,
      forecastHorizon: horizon,
      trend: trend,
      confidence: history.length >= 5 ? 'high' : 'medium',
      harvestPressure: z.harvestPressure,
      droughtRisk: z.consecutiveDryDays > 7
    };
  }

  // ── ZONE COMPARISON ───────────────────────────────────────────────────────────

  /**
   * Compare ecology metrics across all zones, returning a ranked list.
   * @param {string} metric - 'biodiversity' | 'soilFertility' | 'creatureCount'
   */
  function compareZones(metric) {
    var validMetrics = { biodiversity: true, soilFertility: true, creatureCount: true, harvestPressure: true };
    if (!validMetrics[metric]) metric = 'biodiversity';

    var results = [];
    for (var i = 0; i < ZONE_IDS.length; i++) {
      var zoneId = ZONE_IDS[i];
      var st = _ensureState();
      var z = st.zones[zoneId];
      if (!z) continue;

      var value;
      if (metric === 'biodiversity') value = z.biodiversity;
      else if (metric === 'soilFertility') value = z.soilFertility;
      else if (metric === 'creatureCount') value = getTotalCreaturePopulation(zoneId);
      else if (metric === 'harvestPressure') value = z.harvestPressure;

      results.push({ zoneId: zoneId, value: value });
    }

    results.sort(function(a, b) {
      return metric === 'harvestPressure' ? b.value - a.value : b.value - a.value;
    });

    return { metric: metric, ranked: results };
  }

  // ── ECOLOGY EVENTS (story hooks) ─────────────────────────────────────────────

  var ECOLOGY_EVENTS = [
    {
      id: 'pollinator_collapse',
      trigger: function(z) { return (z.creatures.butterfly || 0) + (z.creatures.bee || 0) < 20; },
      message: 'Pollinator populations have collapsed! Plant life will suffer.',
      severity: 'critical',
      consequence: function(z) { z.harvestCapacity *= 0.6; }
    },
    {
      id: 'predator_takeover',
      trigger: function(z) {
        var predPop = (z.creatures.wolf || 0) + (z.creatures.bear || 0) + (z.creatures.fox || 0);
        var herbPop = (z.creatures.rabbit || 0) + (z.creatures.deer || 0);
        return predPop > herbPop * 2 && predPop > 20;
      },
      message: 'Predator numbers are overwhelming prey populations!',
      severity: 'warning',
      consequence: function(z) { z.biodiversity = clamp(z.biodiversity - 5, 0, 100); }
    },
    {
      id: 'drought_crisis',
      trigger: function(z) { return z.droughtActive && z.consecutiveDryDays > 20; },
      message: 'Severe drought is devastating the ecosystem!',
      severity: 'critical',
      consequence: function(z) {
        z.soilFertility = clamp(z.soilFertility - 10, 0, 100);
        z.biodiversity = clamp(z.biodiversity - 8, 0, 100);
      }
    },
    {
      id: 'over_harvest',
      trigger: function(z) { return z.harvestPressure >= 90; },
      message: 'Critical over-harvesting is collapsing the ecosystem!',
      severity: 'critical',
      consequence: function(z) { z.regenerationRate = clamp(z.regenerationRate - 0.1, 0.1, 1.0); }
    },
    {
      id: 'ecosystem_recovery',
      trigger: function(z) { return z.biodiversity >= 85 && z.harvestPressure < 10; },
      message: 'The ecosystem is flourishing! Conservation efforts are paying off.',
      severity: 'positive',
      consequence: function(z) {
        z.harvestCapacity = clamp(z.harvestCapacity * 1.1, 0, 500);
        z.soilFertility = clamp(z.soilFertility + 5, 0, 100);
      }
    }
  ];

  /**
   * Check and fire ecology events for all zones.
   * @returns {Array} list of triggered events
   */
  function checkEcologyEvents() {
    var st = _ensureState();
    var triggered = [];

    for (var i = 0; i < ZONE_IDS.length; i++) {
      var zoneId = ZONE_IDS[i];
      var z = st.zones[zoneId];
      if (!z) continue;

      for (var j = 0; j < ECOLOGY_EVENTS.length; j++) {
        var ev = ECOLOGY_EVENTS[j];
        if (ev.trigger(z)) {
          ev.consequence(z);
          triggered.push({
            eventId: ev.id,
            zone: zoneId,
            message: ev.message,
            severity: ev.severity,
            tick: st.tick
          });
        }
      }
    }

    return triggered;
  }

  // ── PUBLIC API ────────────────────────────────────────────────────────────────

  // Exposed constants
  exports.ZONE_IDS = ZONE_IDS;
  exports.ZONE_ECOLOGY_DEFAULTS = ZONE_ECOLOGY_DEFAULTS;
  exports.SPECIES_CATALOG = SPECIES_CATALOG;
  exports.WEATHER_ECOLOGY_IMPACT = WEATHER_ECOLOGY_IMPACT;
  exports.SEASON_ECOLOGY_MODIFIERS = SEASON_ECOLOGY_MODIFIERS;
  exports.TERRAFORM_ECOLOGY_IMPACT = TERRAFORM_ECOLOGY_IMPACT;
  exports.CONSERVATION_ACTIONS = CONSERVATION_ACTIONS;
  exports.ECOLOGY_EVENTS = ECOLOGY_EVENTS;
  exports.DROUGHT_THRESHOLD_DAYS = DROUGHT_THRESHOLD_DAYS;

  // Core simulation
  exports.tick = tick;
  exports.advanceSeason = advanceSeason;

  // Biodiversity
  exports.computeBiodiversity = computeBiodiversity;

  // Resource regeneration
  exports.applyHarvestPressure = applyHarvestPressure;
  exports.tickRecovery = tickRecovery;

  // Creatures
  exports.updateCreaturePopulations = updateCreaturePopulations;
  exports.getCreatureCount = getCreatureCount;
  exports.getTotalCreaturePopulation = getTotalCreaturePopulation;

  // Weather
  exports.applyWeatherEvent = applyWeatherEvent;
  exports.analyzeCumulativeWeather = analyzeCumulativeWeather;

  // Terraforming
  exports.applyTerraformingEffect = applyTerraformingEffect;

  // Conservation
  exports.performConservationAction = performConservationAction;

  // Soil
  exports.syncSoilState = syncSoilState;
  exports.getSoilHealth = getSoilHealth;

  // Reports & forecasting
  exports.getZoneEcologyReport = getZoneEcologyReport;
  exports.getWorldEcologyReport = getWorldEcologyReport;
  exports.forecastBiodiversity = forecastBiodiversity;
  exports.compareZones = compareZones;

  // Endangered species
  exports.checkEndangeredSpecies = checkEndangeredSpecies;
  exports.getEndangeredInZone = getEndangeredInZone;

  // Events
  exports.checkEcologyEvents = checkEcologyEvents;

  // Test helpers
  exports._reset = function() { _state = null; };
  exports._getState = function() { return _ensureState(); };
  exports._mulberry32 = mulberry32;
  exports._strHash = strHash;

})(typeof module !== 'undefined' ? module.exports : (window.WeatherEcology = {}));
