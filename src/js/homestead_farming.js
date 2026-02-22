// homestead_farming.js — Homestead Farming & Animal Pen System for ZION
// Attaches productive farm plots to player housing: animal pens (chickens, goats,
// bees, rabbits, cows), timer-based produce, seasonal yield multipliers, and
// direct cooking ingredient supply.
(function(exports) {
  'use strict';

  // ── Dependency guards ────────────────────────────────────────────────────────
  var Housing  = (typeof window !== 'undefined' && window.Housing)  || {};
  var Gardens  = (typeof window !== 'undefined' && window.Gardens)  || {};
  var Cooking  = (typeof window !== 'undefined' && window.Cooking)  || {};
  var Seasons  = (typeof window !== 'undefined' && window.Seasons)  || {};
  var Inventory = (typeof window !== 'undefined' && window.Inventory) || {};

  // ── Seeded PRNG (mulberry32) ─────────────────────────────────────────────────
  function mulberry32(seed) {
    return function() {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // ── CONSTANTS ────────────────────────────────────────────────────────────────

  var MAX_PENS_PER_GARDEN_ROOM = 3;
  var MAX_ANIMALS_PER_PEN      = 5;
  var FEED_HUNGER_RESTORE      = 40;   // hunger units restored per feed
  var FEED_HAPPINESS_BONUS     = 10;   // happiness boost per feed
  var NEGLECT_HEALTH_DECAY     = 2;    // health lost per neglect tick
  var NEGLECT_HAPPINESS_DECAY  = 3;    // happiness lost per neglect tick
  var UPGRADE_CARE_THRESHOLD   = 100;  // care points needed to level up quality
  var PEN_BUILD_COST           = 20;   // spark cost to build a pen
  var ANIMAL_ACQUIRE_COST      = 15;   // spark cost to acquire an animal

  // Production timer intervals in milliseconds
  var PRODUCTION_INTERVALS = {
    chicken:  8  * 60 * 1000,   //  8 min
    bee:      30 * 60 * 1000,   // 30 min
    goat:     15 * 60 * 1000,   // 15 min
    rabbit:   20 * 60 * 1000,   // 20 min
    cow:      12 * 60 * 1000    // 12 min
  };

  // ── ANIMAL CATALOG ────────────────────────────────────────────────────────────

  var ANIMAL_TYPES = {
    chicken: {
      id:          'chicken',
      name:        'Chicken',
      icon:        'chicken',
      description: 'Friendly birds that produce eggs daily. Easy to care for.',
      produces:    [
        { item: 'egg',           qty: { min: 1, max: 3 }, intervalMs: PRODUCTION_INTERVALS.chicken }
      ],
      feedItem:    'grain',
      careLevel:   'easy',
      baseHealth:  100,
      baseHappiness: 80,
      qualityTiers: ['common', 'well_bred', 'prize', 'legendary'],
      zones:       ['gardens', 'commons', 'wilds']
    },
    goat: {
      id:          'goat',
      name:        'Goat',
      icon:        'goat',
      description: 'Hardy animals that produce milk for butter and cheese.',
      produces:    [
        { item: 'milk',          qty: { min: 1, max: 2 }, intervalMs: PRODUCTION_INTERVALS.goat },
        { item: 'goat_cheese',   qty: { min: 0, max: 1 }, intervalMs: PRODUCTION_INTERVALS.goat * 2, chance: 0.3 }
      ],
      feedItem:    'hay',
      careLevel:   'moderate',
      baseHealth:  100,
      baseHappiness: 70,
      qualityTiers: ['common', 'well_bred', 'prize', 'legendary'],
      zones:       ['gardens', 'wilds', 'commons']
    },
    bee: {
      id:          'bee',
      name:        'Bee Colony',
      icon:        'bee',
      description: 'Industrious colonies that produce honey and beeswax.',
      produces:    [
        { item: 'honey',         qty: { min: 1, max: 3 }, intervalMs: PRODUCTION_INTERVALS.bee },
        { item: 'beeswax',       qty: { min: 0, max: 1 }, intervalMs: PRODUCTION_INTERVALS.bee * 1.5, chance: 0.4 },
        { item: 'royal_jelly',   qty: { min: 0, max: 1 }, intervalMs: PRODUCTION_INTERVALS.bee * 4,   chance: 0.1 }
      ],
      feedItem:    'flower',
      careLevel:   'easy',
      baseHealth:  100,
      baseHappiness: 90,
      qualityTiers: ['common', 'thriving', 'golden', 'legendary'],
      zones:       ['gardens', 'wilds', 'athenaeum']
    },
    rabbit: {
      id:          'rabbit',
      name:        'Rabbit',
      icon:        'rabbit',
      description: 'Gentle creatures that produce soft fur and are beloved by visitors.',
      produces:    [
        { item: 'rabbit_fur',    qty: { min: 1, max: 2 }, intervalMs: PRODUCTION_INTERVALS.rabbit },
        { item: 'rabbit_foot',   qty: { min: 0, max: 1 }, intervalMs: PRODUCTION_INTERVALS.rabbit * 3, chance: 0.15 }
      ],
      feedItem:    'carrot',
      careLevel:   'easy',
      baseHealth:  100,
      baseHappiness: 85,
      qualityTiers: ['common', 'well_bred', 'prize', 'legendary'],
      zones:       ['gardens', 'wilds', 'commons']
    },
    cow: {
      id:          'cow',
      name:        'Cow',
      icon:        'cow',
      description: 'Gentle giants that produce rich milk and leather.',
      produces:    [
        { item: 'milk',          qty: { min: 2, max: 4 }, intervalMs: PRODUCTION_INTERVALS.cow },
        { item: 'cream',         qty: { min: 0, max: 1 }, intervalMs: PRODUCTION_INTERVALS.cow * 2, chance: 0.5 },
        { item: 'leather',       qty: { min: 0, max: 1 }, intervalMs: PRODUCTION_INTERVALS.cow * 6, chance: 0.2 }
      ],
      feedItem:    'hay',
      careLevel:   'intensive',
      baseHealth:  100,
      baseHappiness: 70,
      qualityTiers: ['common', 'well_bred', 'prize', 'legendary'],
      zones:       ['gardens', 'commons']
    }
  };

  // ── PRODUCE CATALOG (links to cooking ingredients) ────────────────────────────

  var PRODUCE_CATALOG = {
    egg:          { id: 'egg',         name: 'Egg',           category: 'dairy',      cookingId: 'egg',         baseValue: 3  },
    milk:         { id: 'milk',        name: 'Milk',          category: 'dairy',      cookingId: 'milk',        baseValue: 4  },
    honey:        { id: 'honey',       name: 'Honey',         category: 'special',    cookingId: 'honey',       baseValue: 8  },
    goat_cheese:  { id: 'goat_cheese', name: 'Goat Cheese',   category: 'dairy',      cookingId: 'cream',       baseValue: 10 },
    beeswax:      { id: 'beeswax',     name: 'Beeswax',       category: 'crafting',   cookingId: null,          baseValue: 6  },
    royal_jelly:  { id: 'royal_jelly', name: 'Royal Jelly',   category: 'special',    cookingId: null,          baseValue: 25 },
    rabbit_fur:   { id: 'rabbit_fur',  name: 'Rabbit Fur',    category: 'crafting',   cookingId: null,          baseValue: 7  },
    rabbit_foot:  { id: 'rabbit_foot', name: 'Rabbit\'s Foot',category: 'special',    cookingId: null,          baseValue: 20 },
    cream:        { id: 'cream',       name: 'Cream',         category: 'dairy',      cookingId: 'cream',       baseValue: 6  },
    leather:      { id: 'leather',     name: 'Leather',       category: 'crafting',   cookingId: null,          baseValue: 12 }
  };

  // ── FEED CATALOG ────────────────────────────────────────────────────────────

  var FEED_TYPES = {
    grain: {
      id:           'grain',
      name:         'Grain',
      hungerRestore: 40,
      happinessBonus: 8,
      qualityBonus:  0
    },
    hay: {
      id:           'hay',
      name:         'Hay',
      hungerRestore: 35,
      happinessBonus: 5,
      qualityBonus:  0
    },
    flower: {
      id:           'flower',
      name:         'Fresh Flowers',
      hungerRestore: 30,
      happinessBonus: 15,
      qualityBonus:  1
    },
    carrot: {
      id:           'carrot',
      name:         'Carrot',
      hungerRestore: 45,
      happinessBonus: 12,
      qualityBonus:  0
    },
    premium_feed: {
      id:           'premium_feed',
      name:         'Premium Feed',
      hungerRestore: 60,
      happinessBonus: 20,
      qualityBonus:  2
    },
    magic_herbs: {
      id:           'magic_herbs',
      name:         'Magic Herbs',
      hungerRestore: 50,
      happinessBonus: 25,
      qualityBonus:  3
    }
  };

  // ── SEASONAL MULTIPLIERS ─────────────────────────────────────────────────────

  var SEASONAL_MULTIPLIERS = {
    spring: {
      chicken:  1.3,  // more eggs in spring
      goat:     1.1,
      bee:      1.5,  // bees love spring
      rabbit:   1.4,  // rabbits multiply in spring
      cow:      1.1
    },
    summer: {
      chicken:  1.1,
      goat:     0.9,  // heat slows goats
      bee:      1.3,
      rabbit:   1.1,
      cow:      0.9
    },
    autumn: {
      chicken:  1.0,
      goat:     1.3,  // harvest season, well-fed goats
      bee:      0.8,  // bees slow down
      rabbit:   0.9,
      cow:      1.2   // autumn grass is rich
    },
    winter: {
      chicken:  0.7,  // cold slows production
      goat:     0.8,
      bee:      0.3,  // bees hibernate mostly
      rabbit:   0.8,
      cow:      0.9
    }
  };

  // ── QUALITY TIERS ────────────────────────────────────────────────────────────

  var QUALITY_TIERS = {
    common:     { id: 'common',     name: 'Common',     yieldMult: 1.0, valueMult: 1.0,  careThreshold: 0    },
    well_bred:  { id: 'well_bred',  name: 'Well-Bred',  yieldMult: 1.2, valueMult: 1.3,  careThreshold: 100  },
    thriving:   { id: 'thriving',   name: 'Thriving',   yieldMult: 1.2, valueMult: 1.3,  careThreshold: 100  },
    golden:     { id: 'golden',     name: 'Golden',     yieldMult: 1.5, valueMult: 1.6,  careThreshold: 250  },
    prize:      { id: 'prize',      name: 'Prize',      yieldMult: 1.5, valueMult: 1.6,  careThreshold: 250  },
    legendary:  { id: 'legendary',  name: 'Legendary',  yieldMult: 2.0, valueMult: 2.5,  careThreshold: 500  }
  };

  // ── HEALTH STATES ────────────────────────────────────────────────────────────

  var HEALTH_STATES = {
    thriving:  { id: 'thriving',  minHealth: 85, yieldMult: 1.2, description: 'Thriving with excellent care' },
    healthy:   { id: 'healthy',   minHealth: 65, yieldMult: 1.0, description: 'Healthy and content'          },
    stressed:  { id: 'stressed',  minHealth: 40, yieldMult: 0.7, description: 'Stressed and under-nourished' },
    sick:      { id: 'sick',      minHealth: 20, yieldMult: 0.4, description: 'Sick and needs attention'     },
    critical:  { id: 'critical',  minHealth: 0,  yieldMult: 0.1, description: 'Critical — immediate care!'  }
};

  // ── MODULE STATE ─────────────────────────────────────────────────────────────

  var _pens       = {};  // penId -> pen object
  var _animals    = {};  // animalId -> animal object
  var _nextPenId  = 1;
  var _nextAnimalId = 1;

  // ── ID GENERATORS ────────────────────────────────────────────────────────────

  function _genPenId()    { return 'pen_'    + (_nextPenId++);    }
  function _genAnimalId() { return 'animal_' + (_nextAnimalId++); }

  // ── INTERNAL HELPERS ─────────────────────────────────────────────────────────

  /**
   * Get the current season name (spring/summer/autumn/winter).
   * Delegates to Seasons module if available; falls back to date-based calc.
   */
  function _getCurrentSeason() {
    if (Seasons && typeof Seasons.getCurrentSeason === 'function') {
      var s = Seasons.getCurrentSeason();
      if (s && s.id) return s.id;
    }
    var month = new Date().getMonth(); // 0-11
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  }

  /**
   * Get the seasonal yield multiplier for an animal type in the given season.
   */
  function getSeasonalMultiplier(animalType, season) {
    var seasonKey = season || _getCurrentSeason();
    var table = SEASONAL_MULTIPLIERS[seasonKey];
    if (!table) return 1.0;
    return table[animalType] !== undefined ? table[animalType] : 1.0;
  }

  /**
   * Derive health state from a numeric health value (0-100).
   */
  function getHealthState(health) {
    if (health >= HEALTH_STATES.thriving.minHealth)  return HEALTH_STATES.thriving;
    if (health >= HEALTH_STATES.healthy.minHealth)   return HEALTH_STATES.healthy;
    if (health >= HEALTH_STATES.stressed.minHealth)  return HEALTH_STATES.stressed;
    if (health >= HEALTH_STATES.sick.minHealth)      return HEALTH_STATES.sick;
    return HEALTH_STATES.critical;
  }

  /**
   * Derive quality tier object for an animal.
   */
  function getQualityTier(animalType, qualityKey) {
    return QUALITY_TIERS[qualityKey] || QUALITY_TIERS.common;
  }

  /**
   * Clamp value between min and max.
   */
  function _clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  /**
   * Compute produce quantity using seeded PRNG.
   * Incorporates health, quality, and season multipliers.
   */
  function _computeYield(produceEntry, animal, season, rng) {
    var animalType = ANIMAL_TYPES[animal.type];
    if (!animalType) return 0;

    var healthState   = getHealthState(animal.health);
    var qualityTier   = getQualityTier(animal.type, animal.quality);
    var seasonMult    = getSeasonalMultiplier(animal.type, season);

    var baseMin = produceEntry.qty.min;
    var baseMax = produceEntry.qty.max;
    var rawQty  = baseMin + rng() * (baseMax - baseMin);

    var finalQty = rawQty * healthState.yieldMult * qualityTier.yieldMult * seasonMult;
    return Math.max(0, Math.round(finalQty));
  }

  /**
   * Check if a timed production entry is ready.
   */
  function _isReady(lastProducedAt, intervalMs) {
    return (Date.now() - lastProducedAt) >= intervalMs;
  }

  /**
   * Compute produce quality label based on animal stats.
   */
  function computeProduceQuality(animal) {
    var healthState = getHealthState(animal.health);
    var qualityTier = getQualityTier(animal.type, animal.quality);

    var score = (animal.health / 100) * 0.5 + (animal.happiness / 100) * 0.3 + (qualityTier.yieldMult - 1.0) * 0.2;
    if (score >= 0.85) return 'exceptional';
    if (score >= 0.65) return 'fine';
    if (score >= 0.45) return 'normal';
    if (score >= 0.25) return 'poor';
    return 'spoiled';
  }

  /**
   * Get the next quality tier id for an animal type.
   */
  function _nextQualityTier(animalType, currentQuality) {
    var typeData = ANIMAL_TYPES[animalType];
    if (!typeData) return currentQuality;
    var tiers = typeData.qualityTiers;
    var idx   = tiers.indexOf(currentQuality);
    if (idx === -1 || idx === tiers.length - 1) return currentQuality;
    return tiers[idx + 1];
  }

  // ── PEN MANAGEMENT ───────────────────────────────────────────────────────────

  /**
   * Build a new animal pen attached to a garden room.
   * @param {string} playerId
   * @param {string} roomId  - id of a 'garden' room in the player's house
   * @param {string} label   - display label for the pen
   * @param {function} [spendFn] - optional spendFn(playerId, amount) -> {success,error}
   * @returns {{ success: boolean, pen?: object, error?: string }}
   */
  function buildPen(playerId, roomId, label, spendFn) {
    if (!playerId) return { success: false, error: 'Missing playerId' };
    if (!roomId)   return { success: false, error: 'Missing roomId' };

    // Count existing pens for this room
    var roomPens = [];
    for (var pid in _pens) {
      if (_pens[pid].ownerId === playerId && _pens[pid].roomId === roomId) {
        roomPens.push(_pens[pid]);
      }
    }
    if (roomPens.length >= MAX_PENS_PER_GARDEN_ROOM) {
      return { success: false, error: 'Maximum pens per garden room reached (' + MAX_PENS_PER_GARDEN_ROOM + ')' };
    }

    if (typeof spendFn === 'function') {
      var result = spendFn(playerId, PEN_BUILD_COST);
      if (!result.success) return { success: false, error: result.error || 'Insufficient funds' };
    }

    var pen = {
      id:          _genPenId(),
      ownerId:     playerId,
      roomId:      roomId,
      label:       label || 'Animal Pen',
      animalIds:   [],
      builtAt:     Date.now()
    };

    _pens[pen.id] = pen;
    return { success: true, pen: pen };
  }

  /**
   * Get a pen by id.
   * @param {string} penId
   * @returns {object|null}
   */
  function getPen(penId) {
    return _pens[penId] || null;
  }

  /**
   * Get all pens owned by a player.
   * @param {string} playerId
   * @returns {object[]}
   */
  function getPlayerPens(playerId) {
    var result = [];
    for (var id in _pens) {
      if (_pens[id].ownerId === playerId) result.push(_pens[id]);
    }
    return result;
  }

  /**
   * Remove a pen (animals must be relocated first).
   * @param {string} penId
   * @returns {{ success: boolean, error?: string }}
   */
  function removePen(penId) {
    var pen = _pens[penId];
    if (!pen) return { success: false, error: 'Pen not found' };
    if (pen.animalIds.length > 0) return { success: false, error: 'Pen has animals — relocate them first' };
    delete _pens[penId];
    return { success: true };
  }

  // ── ANIMAL MANAGEMENT ────────────────────────────────────────────────────────

  /**
   * Acquire an animal and place it in a pen.
   * @param {string} playerId
   * @param {string} penId
   * @param {string} animalType - key from ANIMAL_TYPES
   * @param {string} [name]     - optional display name
   * @param {function} [spendFn]
   * @returns {{ success: boolean, animal?: object, error?: string }}
   */
  function acquireAnimal(playerId, penId, animalType, name, spendFn) {
    if (!playerId)  return { success: false, error: 'Missing playerId' };
    if (!penId)     return { success: false, error: 'Missing penId' };
    if (!ANIMAL_TYPES[animalType]) return { success: false, error: 'Unknown animal type: ' + animalType };

    var pen = _pens[penId];
    if (!pen) return { success: false, error: 'Pen not found' };
    if (pen.ownerId !== playerId) return { success: false, error: 'You do not own this pen' };
    if (pen.animalIds.length >= MAX_ANIMALS_PER_PEN) {
      return { success: false, error: 'Pen is full (' + MAX_ANIMALS_PER_PEN + ' animals max)' };
    }

    if (typeof spendFn === 'function') {
      var res = spendFn(playerId, ANIMAL_ACQUIRE_COST);
      if (!res.success) return { success: false, error: res.error || 'Insufficient funds' };
    }

    var typeData = ANIMAL_TYPES[animalType];
    var now = Date.now();

    // Build initial production tracker
    var production = {};
    for (var p = 0; p < typeData.produces.length; p++) {
      var entry = typeData.produces[p];
      production[entry.item] = {
        item:           entry.item,
        lastProducedAt: now - entry.intervalMs, // ready immediately
        pending:        0
      };
    }

    var animal = {
      id:           _genAnimalId(),
      penId:        penId,
      type:         animalType,
      name:         name || typeData.name,
      health:       typeData.baseHealth,
      happiness:    typeData.baseHappiness,
      hunger:       0,            // 0=full, 100=starving
      quality:      typeData.qualityTiers[0],
      carePoints:   0,            // accumulate toward quality upgrade
      production:   production,
      acquiredAt:   now,
      lastFedAt:    now,
      lastCaredAt:  now,
      notes:        []
    };

    _animals[animal.id] = animal;
    pen.animalIds.push(animal.id);
    return { success: true, animal: animal };
  }

  /**
   * Get an animal by id.
   * @param {string} animalId
   * @returns {object|null}
   */
  function getAnimal(animalId) {
    return _animals[animalId] || null;
  }

  /**
   * Get all animals in a pen.
   * @param {string} penId
   * @returns {object[]}
   */
  function getPenAnimals(penId) {
    var pen = _pens[penId];
    if (!pen) return [];
    return pen.animalIds.map(function(id) { return _animals[id]; }).filter(Boolean);
  }

  /**
   * Release (remove) an animal from a pen.
   * @param {string} animalId
   * @returns {{ success: boolean, error?: string }}
   */
  function releaseAnimal(animalId) {
    var animal = _animals[animalId];
    if (!animal) return { success: false, error: 'Animal not found' };

    var pen = _pens[animal.penId];
    if (pen) {
      pen.animalIds = pen.animalIds.filter(function(id) { return id !== animalId; });
    }
    delete _animals[animalId];
    return { success: true };
  }

  // ── FEEDING & CARE ───────────────────────────────────────────────────────────

  /**
   * Feed an animal with a specific feed type.
   * @param {string} animalId
   * @param {string} feedType - key from FEED_TYPES
   * @returns {{ success: boolean, animal?: object, error?: string }}
   */
  function feedAnimal(animalId, feedType) {
    var animal = _animals[animalId];
    if (!animal) return { success: false, error: 'Animal not found' };

    var feed = FEED_TYPES[feedType];
    if (!feed) return { success: false, error: 'Unknown feed type: ' + feedType };

    animal.hunger    = _clamp(animal.hunger - feed.hungerRestore, 0, 100);
    animal.happiness = _clamp(animal.happiness + feed.happinessBonus, 0, 100);
    animal.health    = _clamp(animal.health + Math.round(feed.hungerRestore * 0.1), 0, 100);
    animal.carePoints += feed.qualityBonus + 1;
    animal.lastFedAt = Date.now();

    // Check for quality upgrade
    _checkQualityUpgrade(animal);

    return { success: true, animal: animal };
  }

  /**
   * Pet / interact with an animal to boost happiness and care points.
   * @param {string} animalId
   * @returns {{ success: boolean, animal?: object, error?: string }}
   */
  function careForAnimal(animalId) {
    var animal = _animals[animalId];
    if (!animal) return { success: false, error: 'Animal not found' };

    animal.happiness  = _clamp(animal.happiness + FEED_HAPPINESS_BONUS, 0, 100);
    animal.carePoints += 2;
    animal.lastCaredAt = Date.now();

    _checkQualityUpgrade(animal);

    return { success: true, animal: animal };
  }

  /**
   * Check and apply quality upgrade if care threshold is reached.
   */
  function _checkQualityUpgrade(animal) {
    var typeData = ANIMAL_TYPES[animal.type];
    if (!typeData) return;

    var currentIdx  = typeData.qualityTiers.indexOf(animal.quality);
    var nextTier    = typeData.qualityTiers[currentIdx + 1];
    if (!nextTier) return; // already at max

    var tierData = QUALITY_TIERS[nextTier];
    if (!tierData) return;

    if (animal.carePoints >= tierData.careThreshold) {
      animal.quality    = nextTier;
      animal.carePoints = 0;
      animal.notes.push({ ts: Date.now(), msg: 'Quality upgraded to ' + nextTier });
    }
  }

  /**
   * Apply neglect tick — called when time passes without care.
   * Reduces hunger, health, and happiness.
   * @param {string} animalId
   * @param {number} elapsedMs
   * @returns {object} updated animal
   */
  function applyNeglect(animalId, elapsedMs) {
    var animal = _animals[animalId];
    if (!animal) return null;

    var hoursElapsed = elapsedMs / 3600000;
    var hungerIncrease    = Math.round(hoursElapsed * 20);   // +20 hunger/hr
    var healthDecay       = Math.round(hoursElapsed * NEGLECT_HEALTH_DECAY);
    var happinessDecay    = Math.round(hoursElapsed * NEGLECT_HAPPINESS_DECAY);

    animal.hunger    = _clamp(animal.hunger + hungerIncrease, 0, 100);
    animal.health    = _clamp(animal.health - (animal.hunger > 60 ? healthDecay : 0), 0, 100);
    animal.happiness = _clamp(animal.happiness - happinessDecay, 0, 100);

    return animal;
  }

  // ── PRODUCTION & HARVEST ─────────────────────────────────────────────────────

  /**
   * Tick production for a single animal — accumulate pending produce.
   * @param {string} animalId
   * @param {string} [season]
   * @returns {{ produced: object[] }}  array of { item, qty, quality }
   */
  function tickProduction(animalId, season) {
    var animal = _animals[animalId];
    if (!animal) return { produced: [] };

    var typeData = ANIMAL_TYPES[animal.type];
    if (!typeData) return { produced: [] };

    var currentSeason = season || _getCurrentSeason();
    var rng           = mulberry32(Date.now() ^ (animal.id.charCodeAt(7) || 0));
    var produced      = [];

    for (var p = 0; p < typeData.produces.length; p++) {
      var entry   = typeData.produces[p];
      var tracker = animal.production[entry.item];
      if (!tracker) continue;

      if (!_isReady(tracker.lastProducedAt, entry.intervalMs)) continue;

      // Check random chance for chance-based items
      if (entry.chance !== undefined && rng() > entry.chance) {
        tracker.lastProducedAt = Date.now();
        continue;
      }

      var qty = _computeYield(entry, animal, currentSeason, rng);
      if (qty > 0) {
        var quality = computeProduceQuality(animal);
        tracker.pending        += qty;
        tracker.lastProducedAt  = Date.now();
        produced.push({ item: entry.item, qty: qty, quality: quality });
      }
    }

    return { produced: produced };
  }

  /**
   * Collect (harvest) all pending produce from a single animal.
   * Returns items suitable for adding to cooking/inventory systems.
   * @param {string} animalId
   * @returns {{ success: boolean, items: object[], error?: string }}
   */
  function collectProduce(animalId) {
    var animal = _animals[animalId];
    if (!animal) return { success: false, items: [], error: 'Animal not found' };

    var typeData = ANIMAL_TYPES[animal.type];
    if (!typeData) return { success: false, items: [], error: 'Unknown animal type' };

    var items = [];
    for (var itemKey in animal.production) {
      var tracker = animal.production[itemKey];
      if (tracker.pending > 0) {
        var quality = computeProduceQuality(animal);
        var produceInfo = PRODUCE_CATALOG[itemKey];
        items.push({
          id:          itemKey,
          name:        produceInfo ? produceInfo.name : itemKey,
          qty:         tracker.pending,
          quality:     quality,
          cookingId:   produceInfo ? produceInfo.cookingId : null,
          baseValue:   produceInfo ? produceInfo.baseValue : 1,
          category:    produceInfo ? produceInfo.category : 'misc',
          source:      'homestead',
          animalId:    animalId,
          animalName:  animal.name
        });
        tracker.pending = 0;
      }
    }

    return { success: true, items: items };
  }

  /**
   * Collect all pending produce from every animal in a pen.
   * @param {string} penId
   * @returns {{ success: boolean, items: object[], error?: string }}
   */
  function harvestPen(penId) {
    var pen = _pens[penId];
    if (!pen) return { success: false, items: [], error: 'Pen not found' };

    var allItems = [];
    for (var i = 0; i < pen.animalIds.length; i++) {
      var result = collectProduce(pen.animalIds[i]);
      if (result.success) {
        for (var j = 0; j < result.items.length; j++) {
          allItems.push(result.items[j]);
        }
      }
    }

    return { success: true, items: allItems };
  }

  /**
   * Tick production for ALL animals in ALL pens owned by a player.
   * Call this periodically (e.g., on login or every game tick).
   * @param {string} playerId
   * @param {string} [season]
   * @returns {{ ticked: number, produced: object[] }}
   */
  function tickPlayerFarm(playerId, season) {
    var currentSeason = season || _getCurrentSeason();
    var allProduced   = [];
    var ticked        = 0;

    for (var pid in _pens) {
      var pen = _pens[pid];
      if (pen.ownerId !== playerId) continue;

      for (var i = 0; i < pen.animalIds.length; i++) {
        var result = tickProduction(pen.animalIds[i], currentSeason);
        ticked++;
        for (var j = 0; j < result.produced.length; j++) {
          allProduced.push(result.produced[j]);
        }
      }
    }

    return { ticked: ticked, produced: allProduced };
  }

  // ── COOKING INTEGRATION ──────────────────────────────────────────────────────

  /**
   * Get the cooking ingredient id for a produce item.
   * Allows seamless supply to the cooking system.
   * @param {string} produceId
   * @returns {string|null}
   */
  function getCookingIngredientId(produceId) {
    var entry = PRODUCE_CATALOG[produceId];
    return entry ? entry.cookingId : null;
  }

  /**
   * Build a cooking ingredient list from collected farm items.
   * Maps homestead produce to cooking ingredient format.
   * @param {object[]} farmItems - output from collectProduce / harvestPen
   * @returns {object[]} array of { id, qty, quality, source }
   */
  function farmItemsToCookingIngredients(farmItems) {
    var result = [];
    for (var i = 0; i < farmItems.length; i++) {
      var item = farmItems[i];
      if (item.cookingId) {
        result.push({
          id:      item.cookingId,
          qty:     item.qty,
          quality: item.quality,
          source:  'homestead'
        });
      }
    }
    return result;
  }

  // ── FARM SUMMARY ────────────────────────────────────────────────────────────

  /**
   * Get a summary of a player's entire farm.
   * @param {string} playerId
   * @returns {object}
   */
  function getFarmSummary(playerId) {
    var pens = getPlayerPens(playerId);
    var totalAnimals = 0;
    var animalBreakdown = {};
    var healthBreakdown = { thriving: 0, healthy: 0, stressed: 0, sick: 0, critical: 0 };
    var pendingProduce  = {};

    for (var i = 0; i < pens.length; i++) {
      var pen = pens[i];
      for (var j = 0; j < pen.animalIds.length; j++) {
        var animal = _animals[pen.animalIds[j]];
        if (!animal) continue;

        totalAnimals++;
        animalBreakdown[animal.type] = (animalBreakdown[animal.type] || 0) + 1;

        var hs = getHealthState(animal.health);
        healthBreakdown[hs.id] = (healthBreakdown[hs.id] || 0) + 1;

        for (var itemKey in animal.production) {
          var pending = animal.production[itemKey].pending;
          if (pending > 0) {
            pendingProduce[itemKey] = (pendingProduce[itemKey] || 0) + pending;
          }
        }
      }
    }

    return {
      playerId:        playerId,
      totalPens:       pens.length,
      totalAnimals:    totalAnimals,
      animalBreakdown: animalBreakdown,
      healthBreakdown: healthBreakdown,
      pendingProduce:  pendingProduce
    };
  }

  /**
   * Get a per-animal status report.
   * @param {string} animalId
   * @returns {object|null}
   */
  function getAnimalStatus(animalId) {
    var animal = _animals[animalId];
    if (!animal) return null;

    var healthState  = getHealthState(animal.health);
    var qualityTier  = QUALITY_TIERS[animal.quality] || QUALITY_TIERS.common;
    var typeData     = ANIMAL_TYPES[animal.type];
    var season       = _getCurrentSeason();
    var seasonMult   = getSeasonalMultiplier(animal.type, season);

    // Build ready-to-collect overview
    var readyItems = [];
    for (var itemKey in animal.production) {
      var tracker = animal.production[itemKey];
      if (tracker.pending > 0) readyItems.push({ item: itemKey, qty: tracker.pending });
    }

    return {
      id:           animal.id,
      type:         animal.type,
      name:         animal.name,
      health:       animal.health,
      happiness:    animal.happiness,
      hunger:       animal.hunger,
      quality:      animal.quality,
      carePoints:   animal.carePoints,
      healthState:  healthState.id,
      qualityTier:  qualityTier.id,
      season:       season,
      seasonMult:   seasonMult,
      produceQuality: computeProduceQuality(animal),
      readyItems:   readyItems,
      feedItem:     typeData ? typeData.feedItem : null,
      needsFeeding: animal.hunger > 50,
      needsCare:    animal.happiness < 40
    };
  }

  // ── RESET (for tests) ────────────────────────────────────────────────────────

  function _reset() {
    _pens        = {};
    _animals     = {};
    _nextPenId   = 1;
    _nextAnimalId = 1;
  }

  // ── EXPORTS ──────────────────────────────────────────────────────────────────

  exports.ANIMAL_TYPES          = ANIMAL_TYPES;
  exports.PRODUCE_CATALOG       = PRODUCE_CATALOG;
  exports.FEED_TYPES            = FEED_TYPES;
  exports.SEASONAL_MULTIPLIERS  = SEASONAL_MULTIPLIERS;
  exports.QUALITY_TIERS         = QUALITY_TIERS;
  exports.HEALTH_STATES         = HEALTH_STATES;

  exports.MAX_PENS_PER_GARDEN_ROOM = MAX_PENS_PER_GARDEN_ROOM;
  exports.MAX_ANIMALS_PER_PEN      = MAX_ANIMALS_PER_PEN;
  exports.PEN_BUILD_COST           = PEN_BUILD_COST;
  exports.ANIMAL_ACQUIRE_COST      = ANIMAL_ACQUIRE_COST;
  exports.PRODUCTION_INTERVALS     = PRODUCTION_INTERVALS;
  exports.UPGRADE_CARE_THRESHOLD   = UPGRADE_CARE_THRESHOLD;

  exports.buildPen               = buildPen;
  exports.getPen                 = getPen;
  exports.getPlayerPens          = getPlayerPens;
  exports.removePen              = removePen;

  exports.acquireAnimal          = acquireAnimal;
  exports.getAnimal              = getAnimal;
  exports.getPenAnimals          = getPenAnimals;
  exports.releaseAnimal          = releaseAnimal;

  exports.feedAnimal             = feedAnimal;
  exports.careForAnimal          = careForAnimal;
  exports.applyNeglect           = applyNeglect;

  exports.tickProduction         = tickProduction;
  exports.collectProduce         = collectProduce;
  exports.harvestPen             = harvestPen;
  exports.tickPlayerFarm         = tickPlayerFarm;

  exports.getSeasonalMultiplier  = getSeasonalMultiplier;
  exports.getHealthState         = getHealthState;
  exports.getQualityTier         = getQualityTier;
  exports.computeProduceQuality  = computeProduceQuality;

  exports.getCookingIngredientId          = getCookingIngredientId;
  exports.farmItemsToCookingIngredients   = farmItemsToCookingIngredients;

  exports.getFarmSummary         = getFarmSummary;
  exports.getAnimalStatus        = getAnimalStatus;

  exports._reset                 = _reset;
  exports.mulberry32             = mulberry32;

})(typeof module !== 'undefined' ? module.exports : (window.HomesteadFarming = {}));
