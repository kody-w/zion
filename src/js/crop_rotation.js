// crop_rotation.js — Agricultural depth for ZION
// Soil fertility cycles (N/P/K nutrients), seasonal crop planning,
// companion planting synergies, multi-season yield forecasting,
// and soil restoration mechanics.
(function(exports) {
  'use strict';

  // ── Optional cross-module dependencies (guard pattern) ────────────────────

  var Gardens  = (typeof window !== 'undefined' && window.Gardens)  || {};
  var Seasons  = (typeof window !== 'undefined' && window.Seasons)  || {};
  var Cooking  = (typeof window !== 'undefined' && window.Cooking)  || {};
  var WeatherFX = (typeof window !== 'undefined' && window.WeatherFX) || {};

  // ── Seeded PRNG (mulberry32) ───────────────────────────────────────────────

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

  // ── SEASON CONSTANTS ──────────────────────────────────────────────────────

  var SEASONS = ['spring', 'summer', 'autumn', 'winter'];

  var SEASON_INDEX = { spring: 0, summer: 1, autumn: 2, winter: 3 };

  // Advance season by N steps (wraps). Default is 1 step forward.
  function advanceSeason(season, steps) {
    var idx = SEASON_INDEX[season];
    if (idx === undefined) idx = 0;
    var n = (steps === undefined || steps === null) ? 1 : steps;
    return SEASONS[((idx + n) % 4 + 4) % 4];
  }

  // ── SOIL NUTRIENT DEFAULTS ────────────────────────────────────────────────

  var SOIL_MAX = 100;  // Maximum nutrient value per axis
  var SOIL_MIN = 0;

  var DEFAULT_SOIL = {
    nitrogen:    60,  // N — supports leafy growth
    phosphorus:  60,  // P — supports root & fruit development
    potassium:   60,  // K — supports overall plant health & disease resistance
    moisture:    50,  // % — affects growth rate
    organicMatter: 40 // % — baseline fertility buffer
  };

  // Soil health score (0-100) from N/P/K average
  function soilHealthScore(soil) {
    var avg = (soil.nitrogen + soil.phosphorus + soil.potassium) / 3;
    var om  = (soil.organicMatter || 0) * 0.2; // organic matter bonus up to 20
    return Math.min(100, Math.max(0, avg * 0.8 + om));
  }

  // Clamp a nutrient value
  function clampNutrient(v) {
    return Math.min(SOIL_MAX, Math.max(SOIL_MIN, v));
  }

  // ── CROP CATALOG (24 crops) ───────────────────────────────────────────────
  // Each crop: id, name, category, seasons[], npkDemand {N,P,K},
  //            npkFix (given back on harvest), baseYield, growthDays,
  //            value (per unit), description

  var CROP_CATALOG = [
    // ── Root Vegetables ──────────────────────────────────────────────────────
    {
      id: 'carrot',
      name: 'Carrot',
      category: 'root_vegetable',
      seasons: ['spring', 'autumn'],
      npkDemand: { N: 8,  P: 14, K: 10 },
      npkFix:    { N: 0,  P: 0,  K: 0  },
      baseYield: 6,
      growthDays: 70,
      value: 4,
      description: 'A crisp root vegetable. High phosphorus demand for strong roots.'
    },
    {
      id: 'potato',
      name: 'Potato',
      category: 'root_vegetable',
      seasons: ['spring', 'summer', 'autumn'],
      npkDemand: { N: 12, P: 10, K: 18 },
      npkFix:    { N: 0,  P: 0,  K: 0  },
      baseYield: 10,
      growthDays: 90,
      value: 3,
      description: 'Versatile staple crop. Heavy potassium feeder.'
    },
    {
      id: 'turnip',
      name: 'Turnip',
      category: 'root_vegetable',
      seasons: ['spring', 'autumn', 'winter'],
      npkDemand: { N: 6,  P: 8,  K: 8  },
      npkFix:    { N: 0,  P: 0,  K: 0  },
      baseYield: 8,
      growthDays: 50,
      value: 3,
      description: 'Hardy cold-season root. Tolerates frost.'
    },
    {
      id: 'beet',
      name: 'Beet',
      category: 'root_vegetable',
      seasons: ['spring', 'autumn'],
      npkDemand: { N: 6,  P: 10, K: 12 },
      npkFix:    { N: 0,  P: 0,  K: 0  },
      baseYield: 7,
      growthDays: 55,
      value: 4,
      description: 'Deep red root vegetable with earthy sweetness.'
    },

    // ── Leafy Greens ─────────────────────────────────────────────────────────
    {
      id: 'kale',
      name: 'Kale',
      category: 'leafy_green',
      seasons: ['spring', 'autumn', 'winter'],
      npkDemand: { N: 18, P: 6,  K: 10 },
      npkFix:    { N: 0,  P: 0,  K: 0  },
      baseYield: 9,
      growthDays: 60,
      value: 5,
      description: 'Nutritious leafy green. Heavy nitrogen feeder.'
    },
    {
      id: 'spinach',
      name: 'Spinach',
      category: 'leafy_green',
      seasons: ['spring', 'autumn'],
      npkDemand: { N: 14, P: 4,  K: 8  },
      npkFix:    { N: 0,  P: 0,  K: 0  },
      baseYield: 7,
      growthDays: 40,
      value: 4,
      description: 'Fast-growing leafy green. Good nitrogen demand.'
    },
    {
      id: 'lettuce',
      name: 'Lettuce',
      category: 'leafy_green',
      seasons: ['spring', 'summer', 'autumn'],
      npkDemand: { N: 10, P: 4,  K: 6  },
      npkFix:    { N: 0,  P: 0,  K: 0  },
      baseYield: 6,
      growthDays: 30,
      value: 3,
      description: 'Quick-harvest salad green. Moderate nutrient needs.'
    },

    // ── Grains & Grasses ─────────────────────────────────────────────────────
    {
      id: 'wheat',
      name: 'Wheat',
      category: 'grain',
      seasons: ['spring', 'summer'],
      npkDemand: { N: 16, P: 8,  K: 12 },
      npkFix:    { N: 0,  P: 0,  K: 0  },
      baseYield: 12,
      growthDays: 120,
      value: 2,
      description: 'Staple grain. High nitrogen demand.'
    },
    {
      id: 'barley',
      name: 'Barley',
      category: 'grain',
      seasons: ['spring', 'summer'],
      npkDemand: { N: 12, P: 6,  K: 10 },
      npkFix:    { N: 0,  P: 0,  K: 0  },
      baseYield: 10,
      growthDays: 90,
      value: 2,
      description: 'Versatile grain for brewing and baking.'
    },
    {
      id: 'corn',
      name: 'Corn',
      category: 'grain',
      seasons: ['summer'],
      npkDemand: { N: 20, P: 10, K: 14 },
      npkFix:    { N: 0,  P: 0,  K: 0  },
      baseYield: 8,
      growthDays: 100,
      value: 4,
      description: 'Heavy-feeding summer staple. Part of the classic Three Sisters.'
    },
    {
      id: 'rice',
      name: 'Rice',
      category: 'grain',
      seasons: ['summer'],
      npkDemand: { N: 14, P: 8,  K: 10 },
      npkFix:    { N: 0,  P: 0,  K: 0  },
      baseYield: 10,
      growthDays: 110,
      value: 3,
      description: 'Staple grain for paddy cultivation.'
    },

    // ── Legumes (nitrogen fixers) ─────────────────────────────────────────────
    {
      id: 'bean',
      name: 'Bean',
      category: 'legume',
      seasons: ['spring', 'summer'],
      npkDemand: { N: 4,  P: 6,  K: 8  },
      npkFix:    { N: 12, P: 2,  K: 0  },
      baseYield: 8,
      growthDays: 60,
      value: 5,
      description: 'Nitrogen-fixing legume. Enriches soil for future crops.'
    },
    {
      id: 'pea',
      name: 'Pea',
      category: 'legume',
      seasons: ['spring', 'autumn'],
      npkDemand: { N: 4,  P: 8,  K: 6  },
      npkFix:    { N: 10, P: 2,  K: 0  },
      baseYield: 7,
      growthDays: 60,
      value: 5,
      description: 'Cool-season legume. Fixes nitrogen and tolerates frost.'
    },
    {
      id: 'clover',
      name: 'Clover',
      category: 'legume',
      seasons: ['spring', 'summer', 'autumn'],
      npkDemand: { N: 0,  P: 4,  K: 4  },
      npkFix:    { N: 18, P: 4,  K: 0  },
      baseYield: 3,
      growthDays: 45,
      value: 2,
      description: 'Cover crop powerhouse. Fixes abundant nitrogen.'
    },

    // ── Fruiting Vegetables ───────────────────────────────────────────────────
    {
      id: 'tomato',
      name: 'Tomato',
      category: 'fruiting_vegetable',
      seasons: ['summer'],
      npkDemand: { N: 14, P: 12, K: 16 },
      npkFix:    { N: 0,  P: 0,  K: 0  },
      baseYield: 9,
      growthDays: 80,
      value: 6,
      description: 'Classic summer fruiting vegetable. Balanced high nutrient demand.'
    },
    {
      id: 'pumpkin',
      name: 'Pumpkin',
      category: 'fruiting_vegetable',
      seasons: ['summer', 'autumn'],
      npkDemand: { N: 12, P: 10, K: 14 },
      npkFix:    { N: 0,  P: 0,  K: 0  },
      baseYield: 5,
      growthDays: 100,
      value: 7,
      description: 'Large fruiting vine crop. Part of the Three Sisters.'
    },
    {
      id: 'cucumber',
      name: 'Cucumber',
      category: 'fruiting_vegetable',
      seasons: ['summer'],
      npkDemand: { N: 10, P: 8,  K: 12 },
      npkFix:    { N: 0,  P: 0,  K: 0  },
      baseYield: 10,
      growthDays: 55,
      value: 4,
      description: 'Prolific summer fruiting vine.'
    },
    {
      id: 'squash',
      name: 'Squash',
      category: 'fruiting_vegetable',
      seasons: ['summer', 'autumn'],
      npkDemand: { N: 10, P: 8,  K: 12 },
      npkFix:    { N: 0,  P: 0,  K: 0  },
      baseYield: 7,
      growthDays: 60,
      value: 5,
      description: 'Robust squash varieties for summer and autumn. Three Sisters companion.'
    },

    // ── Herbs ────────────────────────────────────────────────────────────────
    {
      id: 'mint',
      name: 'Mint',
      category: 'herb',
      seasons: ['spring', 'summer', 'autumn'],
      npkDemand: { N: 8,  P: 4,  K: 6  },
      npkFix:    { N: 0,  P: 0,  K: 0  },
      baseYield: 8,
      growthDays: 30,
      value: 6,
      description: 'Spreading herb with strong aromatic properties. Repels pests.'
    },
    {
      id: 'rosemary',
      name: 'Rosemary',
      category: 'herb',
      seasons: ['spring', 'summer', 'autumn'],
      npkDemand: { N: 6,  P: 6,  K: 6  },
      npkFix:    { N: 0,  P: 0,  K: 0  },
      baseYield: 6,
      growthDays: 90,
      value: 7,
      description: 'Woody perennial herb. Drought-tolerant.'
    },
    {
      id: 'basil',
      name: 'Basil',
      category: 'herb',
      seasons: ['summer'],
      npkDemand: { N: 10, P: 6,  K: 8  },
      npkFix:    { N: 0,  P: 0,  K: 0  },
      baseYield: 7,
      growthDays: 25,
      value: 7,
      description: 'Warm-season herb. Classic tomato companion.'
    },
    {
      id: 'lavender',
      name: 'Lavender',
      category: 'herb',
      seasons: ['spring', 'summer'],
      npkDemand: { N: 4,  P: 6,  K: 8  },
      npkFix:    { N: 0,  P: 0,  K: 0  },
      baseYield: 5,
      growthDays: 90,
      value: 9,
      description: 'Fragrant perennial. Attracts pollinators.'
    },

    // ── Cover Crops / Restoration ─────────────────────────────────────────────
    {
      id: 'mustard',
      name: 'Mustard',
      category: 'cover_crop',
      seasons: ['spring', 'autumn'],
      npkDemand: { N: 6,  P: 4,  K: 4  },
      npkFix:    { N: 0,  P: 6,  K: 4  },
      baseYield: 4,
      growthDays: 40,
      value: 3,
      description: 'Cover crop and biofumigant. Returns phosphorus to soil.'
    },
    {
      id: 'buckwheat',
      name: 'Buckwheat',
      category: 'cover_crop',
      seasons: ['summer'],
      npkDemand: { N: 4,  P: 6,  K: 4  },
      npkFix:    { N: 0,  P: 8,  K: 4  },
      baseYield: 5,
      growthDays: 35,
      value: 3,
      description: 'Fast-growing cover crop. Unlocks phosphorus in soil.'
    }
  ];

  // Build crop lookup map
  var _cropMap = {};
  for (var _ci = 0; _ci < CROP_CATALOG.length; _ci++) {
    _cropMap[CROP_CATALOG[_ci].id] = CROP_CATALOG[_ci];
  }

  // ── COMPANION PLANTING SYNERGIES ─────────────────────────────────────────
  // pairs: [cropA, cropB] — order-insensitive
  // bonus: multiplier added to yield (e.g. 0.15 = +15%)
  // description: why they work together

  var COMPANION_PAIRS = [
    // Classic Three Sisters
    { pair: ['corn', 'bean'],       bonus: 0.20, type: 'companion', description: 'Bean fixes nitrogen for corn' },
    { pair: ['corn', 'squash'],     bonus: 0.15, type: 'companion', description: 'Squash shades roots, retains moisture' },
    { pair: ['bean', 'squash'],     bonus: 0.12, type: 'companion', description: 'Bean feeds squash nitrogen' },
    // Three Sisters full triplet bonus (both pairs present gives extra)
    { pair: ['corn', 'pumpkin'],    bonus: 0.15, type: 'companion', description: 'Pumpkin ground cover keeps weeds at bay' },

    // Herb synergies
    { pair: ['mint', 'rosemary'],   bonus: 0.15, type: 'companion', description: 'Aromatic herbs repel aphids and beetles' },
    { pair: ['basil', 'tomato'],    bonus: 0.20, type: 'companion', description: 'Basil repels tomato hornworm, improves flavour' },
    { pair: ['lavender', 'carrot'], bonus: 0.12, type: 'companion', description: 'Lavender repels carrot fly' },
    { pair: ['mint', 'carrot'],     bonus: 0.10, type: 'companion', description: 'Mint deters carrot fly' },
    { pair: ['rosemary', 'bean'],   bonus: 0.10, type: 'companion', description: 'Rosemary deters bean beetle' },

    // Legume + grain synergies
    { pair: ['pea', 'wheat'],       bonus: 0.15, type: 'companion', description: 'Pea fixes nitrogen for wheat' },
    { pair: ['clover', 'barley'],   bonus: 0.18, type: 'companion', description: 'Clover enriches soil for barley' },
    { pair: ['bean', 'potato'],     bonus: 0.10, type: 'companion', description: 'Bean adds nitrogen to heavy potato feeder' },

    // Root synergies
    { pair: ['carrot', 'lettuce'],  bonus: 0.12, type: 'companion', description: 'Lettuce shades carrot to deter flies' },
    { pair: ['beet', 'kale'],       bonus: 0.10, type: 'companion', description: 'Beet and kale share similar needs without competing' },
    { pair: ['spinach', 'turnip'],  bonus: 0.10, type: 'companion', description: 'Spinach and turnip complement root zones' },

    // Cover crop boosts
    { pair: ['mustard', 'potato'],  bonus: 0.12, type: 'companion', description: 'Mustard suppresses potato nematodes' },
    { pair: ['buckwheat', 'corn'],  bonus: 0.10, type: 'companion', description: 'Buckwheat attracts predatory wasps for corn pest control' },

    // Antagonists — NEGATIVE combinations
    { pair: ['pea', 'onion'],       bonus: -0.20, type: 'antagonist', description: 'Onion family inhibits legume nodulation' },
    { pair: ['bean', 'onion'],      bonus: -0.20, type: 'antagonist', description: 'Onion suppresses bean nitrogen fixation' },
    { pair: ['tomato', 'beet'],     bonus: -0.15, type: 'antagonist', description: 'Beet stunts tomato root development' },
    { pair: ['potato', 'tomato'],   bonus: -0.25, type: 'antagonist', description: 'Share blight pathogens — high disease risk' },
    { pair: ['corn', 'tomato'],     bonus: -0.12, type: 'antagonist', description: 'Compete heavily for nitrogen and space' },
    { pair: ['fennel', 'tomato'],   bonus: -0.20, type: 'antagonist', description: 'Fennel is allelopathic to most plants' },
    { pair: ['kale', 'tomato'],     bonus: -0.10, type: 'antagonist', description: 'Kale and tomato compete for phosphorus' }
  ];

  // Build companion lookup (key: "cropA|cropB" alphabetically sorted)
  var _companionMap = {};
  for (var _pi = 0; _pi < COMPANION_PAIRS.length; _pi++) {
    var _cp = COMPANION_PAIRS[_pi];
    var _key = [_cp.pair[0], _cp.pair[1]].sort().join('|');
    _companionMap[_key] = _cp;
  }

  // Look up relationship between two crops
  function getCropRelationship(cropIdA, cropIdB) {
    var key = [cropIdA, cropIdB].sort().join('|');
    return _companionMap[key] || null;
  }

  // Get all companions/antagonists for a given crop
  function getRelationshipsForCrop(cropId) {
    var results = [];
    for (var k in _companionMap) {
      if (_companionMap[k].pair.indexOf(cropId) !== -1) {
        results.push(_companionMap[k]);
      }
    }
    return results;
  }

  // ── SOIL PLOT STATE ───────────────────────────────────────────────────────

  // Internal store: plotId -> { soil, history: [{season, year, cropId, yield}], fallowSeasons }
  var _plots = {};

  function getOrCreatePlot(plotId) {
    if (!_plots[plotId]) {
      _plots[plotId] = {
        id: plotId,
        soil: {
          nitrogen:      DEFAULT_SOIL.nitrogen,
          phosphorus:    DEFAULT_SOIL.phosphorus,
          potassium:     DEFAULT_SOIL.potassium,
          moisture:      DEFAULT_SOIL.moisture,
          organicMatter: DEFAULT_SOIL.organicMatter
        },
        history: [],      // [{season, year, cropId, yield, restored}]
        fallowSeasons: 0  // consecutive seasons without a planted crop
      };
    }
    return _plots[plotId];
  }

  // ── SOIL RESTORATION ─────────────────────────────────────────────────────

  var RESTORATION_METHODS = {
    compost: {
      id: 'compost',
      name: 'Compost',
      description: 'Add organic compost to restore all nutrients and organic matter.',
      cost: 10,
      effect: { N: 12, P: 8, K: 8, organicMatter: 15, moisture: 5 }
    },
    manure: {
      id: 'manure',
      name: 'Manure',
      description: 'Animal manure — rich in nitrogen.',
      cost: 6,
      effect: { N: 20, P: 5, K: 5, organicMatter: 10, moisture: 0 }
    },
    bone_meal: {
      id: 'bone_meal',
      name: 'Bone Meal',
      description: 'Ground bone — high phosphorus supplement.',
      cost: 8,
      effect: { N: 2, P: 18, K: 2, organicMatter: 0, moisture: 0 }
    },
    wood_ash: {
      id: 'wood_ash',
      name: 'Wood Ash',
      description: 'Potassium-rich ash raises K and adjusts pH.',
      cost: 4,
      effect: { N: 0, P: 4, K: 16, organicMatter: 2, moisture: 0 }
    },
    cover_crop_mulch: {
      id: 'cover_crop_mulch',
      name: 'Cover Crop Mulch',
      description: 'Turn under a cover crop to add organic matter.',
      cost: 5,
      effect: { N: 8, P: 6, K: 4, organicMatter: 20, moisture: 8 }
    },
    fallow: {
      id: 'fallow',
      name: 'Fallow Period',
      description: 'Leave the plot unplanted to recover naturally.',
      cost: 0,
      effect: { N: 6, P: 4, K: 4, organicMatter: 8, moisture: 4 }
    }
  };

  // Apply restoration to a plot's soil
  function applyRestoration(plotId, method) {
    var plot = getOrCreatePlot(plotId);
    var m = RESTORATION_METHODS[method];
    if (!m) {
      return { success: false, error: 'Unknown restoration method: ' + method };
    }
    var e = m.effect;
    plot.soil.nitrogen      = clampNutrient(plot.soil.nitrogen      + (e.N  || 0));
    plot.soil.phosphorus    = clampNutrient(plot.soil.phosphorus    + (e.P  || 0));
    plot.soil.potassium     = clampNutrient(plot.soil.potassium     + (e.K  || 0));
    plot.soil.organicMatter = clampNutrient(plot.soil.organicMatter + (e.organicMatter || 0));
    plot.soil.moisture      = clampNutrient(plot.soil.moisture      + (e.moisture || 0));
    plot.history.push({
      action: 'restore',
      method: method,
      season: null,
      year: null
    });
    if (method === 'fallow') {
      plot.fallowSeasons = (plot.fallowSeasons || 0) + 1;
    } else {
      plot.fallowSeasons = 0;
    }
    return { success: true, soil: getSoil(plotId), method: method };
  }

  // ── SEASONAL VALIDITY ─────────────────────────────────────────────────────

  // Can a crop be planted in a given season?
  function canPlantInSeason(cropId, season) {
    var crop = _cropMap[cropId];
    if (!crop) return false;
    return crop.seasons.indexOf(season) !== -1;
  }

  // Get all plantable crops for a given season
  function getCropsForSeason(season) {
    return CROP_CATALOG.filter(function(c) {
      return c.seasons.indexOf(season) !== -1;
    });
  }

  // ── YIELD CALCULATION ─────────────────────────────────────────────────────
  // Returns { yield, breakdown }

  function calculateYield(plotId, cropId, season, companions, opts) {
    var plot    = getOrCreatePlot(plotId);
    var crop    = _cropMap[cropId];
    var options = opts || {};

    if (!crop) {
      return { yield: 0, breakdown: { error: 'Unknown crop: ' + cropId } };
    }
    if (!canPlantInSeason(cropId, season)) {
      return { yield: 0, breakdown: { error: 'Crop ' + cropId + ' cannot be planted in ' + season } };
    }

    companions = companions || [];

    // 1. Base yield
    var base = crop.baseYield;
    var breakdown = { base: base };

    // 2. Soil health modifier (0.3 to 1.3 scale)
    var health = soilHealthScore(plot.soil) / 100; // 0-1
    // Scale so 0.6 health (average) = 1.0 multiplier, lower = penalty, higher = bonus
    var soilMod = 0.4 + health * 1.5;
    soilMod = Math.min(1.5, Math.max(0.3, soilMod));
    breakdown.soilMod = soilMod;

    // Check if soil has enough nutrients for this crop
    var nRatio = crop.npkDemand.N > 0 ? Math.min(1, plot.soil.nitrogen    / (crop.npkDemand.N * 1.5)) : 1;
    var pRatio = crop.npkDemand.P > 0 ? Math.min(1, plot.soil.phosphorus  / (crop.npkDemand.P * 1.5)) : 1;
    var kRatio = crop.npkDemand.K > 0 ? Math.min(1, plot.soil.potassium   / (crop.npkDemand.K * 1.5)) : 1;
    var npkMod = (nRatio + pRatio + kRatio) / 3;
    breakdown.npkMod = npkMod;

    // 3. Seasonal modifier
    var seasonMod = 1.0;
    // Crops grow best mid-season (summer bonus for summer crops, spring bonus for spring, etc.)
    if (season === 'summer' && crop.seasons.indexOf('summer') !== -1 &&
        crop.seasons.length === 1) {
      seasonMod = 1.15; // Summer-only crops get bonus in their peak season
    }
    if (season === 'winter') {
      seasonMod = 0.85; // Winter slight penalty
    }
    breakdown.seasonMod = seasonMod;

    // 4. Companion planting modifier
    var companionMod = 1.0;
    var companionDetails = [];
    for (var ci = 0; ci < companions.length; ci++) {
      var rel = getCropRelationship(cropId, companions[ci]);
      if (rel) {
        companionMod += rel.bonus;
        companionDetails.push({ crop: companions[ci], bonus: rel.bonus, type: rel.type });
      }
    }
    // Clamp companion modifier (don't go below 0.3 or above 2.0)
    companionMod = Math.min(2.0, Math.max(0.3, companionMod));
    breakdown.companionMod = companionMod;
    breakdown.companions   = companionDetails;

    // 5. Weather modifier (optional — from WeatherFX)
    var weatherMod = 1.0;
    if (options.weather && WeatherFX.getAmbientModifiers) {
      var wm = WeatherFX.getAmbientModifiers(options.weather);
      if (wm && wm.harvestYield) {
        weatherMod = wm.harvestYield;
      }
    } else if (options.weatherMod !== undefined) {
      weatherMod = options.weatherMod;
    }
    breakdown.weatherMod = weatherMod;

    // 6. Fallow bonus (consecutive fallow seasons before this planting)
    var fallowBonus = Math.min(0.3, (plot.fallowSeasons || 0) * 0.08);
    breakdown.fallowBonus = fallowBonus;

    // 7. Organic matter bonus
    var omBonus = (plot.soil.organicMatter / 100) * 0.3;
    breakdown.omBonus = omBonus;

    // 8. PRNG-based variance (deterministic by plotId + cropId + season)
    var seed = strHash(plotId + ':' + cropId + ':' + season);
    var rng  = mulberry32(seed);
    var variance = 0.9 + rng() * 0.2; // ±10% variance
    breakdown.variance = variance;

    // Final yield
    var finalYield = base * soilMod * npkMod * seasonMod * companionMod * weatherMod * (1 + fallowBonus + omBonus) * variance;
    finalYield = Math.max(0, Math.round(finalYield * 10) / 10);
    breakdown.final = finalYield;

    return { yield: finalYield, breakdown: breakdown };
  }

  // ── PLANTING & HARVEST ────────────────────────────────────────────────────

  // Plant a crop on a plot. Returns yield result immediately (simulate harvest).
  // After planting, nutrients are consumed; after harvest, fix nutrients returned.
  function plant(plotId, cropId, season, companions, opts) {
    var crop = _cropMap[cropId];
    if (!crop) {
      return { success: false, error: 'Unknown crop: ' + cropId };
    }
    if (!canPlantInSeason(cropId, season)) {
      return { success: false, error: 'Cannot plant ' + cropId + ' in ' + season };
    }

    var plot = getOrCreatePlot(plotId);
    var yieldResult = calculateYield(plotId, cropId, season, companions, opts);

    // Consume nutrients from soil
    plot.soil.nitrogen   = clampNutrient(plot.soil.nitrogen   - crop.npkDemand.N);
    plot.soil.phosphorus = clampNutrient(plot.soil.phosphorus - crop.npkDemand.P);
    plot.soil.potassium  = clampNutrient(plot.soil.potassium  - crop.npkDemand.K);

    // Return fixed nutrients (legumes)
    plot.soil.nitrogen   = clampNutrient(plot.soil.nitrogen   + (crop.npkFix.N || 0));
    plot.soil.phosphorus = clampNutrient(plot.soil.phosphorus + (crop.npkFix.P || 0));
    plot.soil.potassium  = clampNutrient(plot.soil.potassium  + (crop.npkFix.K || 0));

    // Slight organic matter increase from root decomposition
    plot.soil.organicMatter = clampNutrient(plot.soil.organicMatter + 2);

    // Reset fallow counter
    plot.fallowSeasons = 0;

    // Record history
    plot.history.push({
      action:     'plant',
      cropId:     cropId,
      season:     season,
      companions: companions || [],
      yield:      yieldResult.yield,
      soilAfter:  JSON.parse(JSON.stringify(plot.soil))
    });

    return {
      success:   true,
      yield:     yieldResult.yield,
      breakdown: yieldResult.breakdown,
      soil:      getSoil(plotId)
    };
  }

  // Apply fallow season (natural restoration)
  function applyFallow(plotId) {
    var plot = getOrCreatePlot(plotId);
    plot.fallowSeasons = (plot.fallowSeasons || 0) + 1;
    // Natural recovery
    plot.soil.nitrogen      = clampNutrient(plot.soil.nitrogen      + 4);
    plot.soil.phosphorus    = clampNutrient(plot.soil.phosphorus    + 3);
    plot.soil.potassium     = clampNutrient(plot.soil.potassium     + 3);
    plot.soil.organicMatter = clampNutrient(plot.soil.organicMatter + 5);
    plot.soil.moisture      = clampNutrient(plot.soil.moisture      + 3);
    plot.history.push({ action: 'fallow', fallowSeasons: plot.fallowSeasons });
    return { success: true, fallowSeasons: plot.fallowSeasons, soil: getSoil(plotId) };
  }

  // ── GETTERS ────────────────────────────────────────────────────────────────

  function getSoil(plotId) {
    var plot = getOrCreatePlot(plotId);
    return JSON.parse(JSON.stringify(plot.soil));
  }

  function getPlotHistory(plotId) {
    var plot = getOrCreatePlot(plotId);
    return plot.history.slice();
  }

  function getPlotInfo(plotId) {
    var plot = getOrCreatePlot(plotId);
    return {
      id:            plotId,
      soil:          JSON.parse(JSON.stringify(plot.soil)),
      soilHealth:    soilHealthScore(plot.soil),
      fallowSeasons: plot.fallowSeasons,
      historyLength: plot.history.length
    };
  }

  function getAllPlots() {
    var result = {};
    for (var id in _plots) {
      result[id] = getPlotInfo(id);
    }
    return result;
  }

  // ── MULTI-SEASON PLANNER ──────────────────────────────────────────────────
  // Plan a rotation over N seasons ahead; return projected yields per season.
  // cropPlan: [{cropId, companions?}] — one per season; null = fallow
  // options: { startSeason, restorations: [{season, method}] }

  function planRotation(plotId, cropPlan, opts) {
    var options      = opts || {};
    var startSeason  = options.startSeason || 'spring';
    var restorations = options.restorations || [];

    if (!Array.isArray(cropPlan)) {
      return { success: false, error: 'cropPlan must be an array' };
    }

    // Deep-copy current soil so planning doesn't mutate state
    var simSoil = JSON.parse(JSON.stringify(getOrCreatePlot(plotId).soil));
    var simFallow = getOrCreatePlot(plotId).fallowSeasons || 0;

    var plan     = [];
    var season   = startSeason;

    // Helper: apply nutrient consumption to simulated soil
    function simConsume(crop) {
      simSoil.nitrogen   = clampNutrient(simSoil.nitrogen   - crop.npkDemand.N + (crop.npkFix.N || 0));
      simSoil.phosphorus = clampNutrient(simSoil.phosphorus - crop.npkDemand.P + (crop.npkFix.P || 0));
      simSoil.potassium  = clampNutrient(simSoil.potassium  - crop.npkDemand.K + (crop.npkFix.K || 0));
      simSoil.organicMatter = clampNutrient(simSoil.organicMatter + 2);
      simFallow = 0;
    }

    function simFallow_step() {
      simSoil.nitrogen      = clampNutrient(simSoil.nitrogen      + 4);
      simSoil.phosphorus    = clampNutrient(simSoil.phosphorus    + 3);
      simSoil.potassium     = clampNutrient(simSoil.potassium     + 3);
      simSoil.organicMatter = clampNutrient(simSoil.organicMatter + 5);
      simSoil.moisture      = clampNutrient(simSoil.moisture      + 3);
      simFallow++;
    }

    function simRestore(method) {
      var m = RESTORATION_METHODS[method];
      if (!m) return;
      var e = m.effect;
      simSoil.nitrogen      = clampNutrient(simSoil.nitrogen      + (e.N  || 0));
      simSoil.phosphorus    = clampNutrient(simSoil.phosphorus    + (e.P  || 0));
      simSoil.potassium     = clampNutrient(simSoil.potassium     + (e.K  || 0));
      simSoil.organicMatter = clampNutrient(simSoil.organicMatter + (e.organicMatter || 0));
      simSoil.moisture      = clampNutrient(simSoil.moisture      + (e.moisture || 0));
    }

    for (var si = 0; si < cropPlan.length; si++) {
      var entry = cropPlan[si];

      // Apply any restorations scheduled for this season index
      for (var ri = 0; ri < restorations.length; ri++) {
        if (restorations[ri].seasonIndex === si) {
          simRestore(restorations[ri].method);
        }
      }

      if (!entry || entry.cropId === null || entry.cropId === undefined) {
        // Fallow
        simFallow_step();
        plan.push({
          seasonIndex: si,
          season:      season,
          action:      'fallow',
          cropId:      null,
          projectedYield: 0,
          soilAfter:   JSON.parse(JSON.stringify(simSoil))
        });
      } else {
        var crop = _cropMap[entry.cropId];
        if (!crop) {
          plan.push({
            seasonIndex:    si,
            season:         season,
            action:         'error',
            cropId:         entry.cropId,
            error:          'Unknown crop',
            projectedYield: 0,
            soilAfter:      JSON.parse(JSON.stringify(simSoil))
          });
        } else if (!canPlantInSeason(entry.cropId, season)) {
          plan.push({
            seasonIndex:    si,
            season:         season,
            action:         'invalid_season',
            cropId:         entry.cropId,
            error:          crop.name + ' cannot be planted in ' + season,
            projectedYield: 0,
            soilAfter:      JSON.parse(JSON.stringify(simSoil))
          });
        } else {
          // Simulate yield with current simulated soil
          // Build a temporary fake plotId to use with a fake plot
          var simPlotId = '__sim__' + plotId + '_' + si;
          _plots[simPlotId] = {
            id:            simPlotId,
            soil:          JSON.parse(JSON.stringify(simSoil)),
            history:       [],
            fallowSeasons: simFallow
          };
          var yieldResult = calculateYield(simPlotId, entry.cropId, season, entry.companions || [], options);
          // Clean up sim plot
          delete _plots[simPlotId];

          simConsume(crop);
          plan.push({
            seasonIndex:    si,
            season:         season,
            action:         'plant',
            cropId:         entry.cropId,
            cropName:       crop.name,
            companions:     entry.companions || [],
            projectedYield: yieldResult.yield,
            breakdown:      yieldResult.breakdown,
            soilAfter:      JSON.parse(JSON.stringify(simSoil))
          });
        }
      }

      season = advanceSeason(season);
    }

    // Summary stats
    var totalYield = 0;
    var validSteps = 0;
    for (var pi = 0; pi < plan.length; pi++) {
      if (plan[pi].action === 'plant') {
        totalYield += plan[pi].projectedYield;
        validSteps++;
      }
    }

    return {
      success:      true,
      plotId:       plotId,
      startSeason:  startSeason,
      steps:        plan,
      totalProjectedYield: totalYield,
      activePlantingSeasons: validSteps,
      finalSoil:    JSON.parse(JSON.stringify(simSoil))
    };
  }

  // ── SOIL ANALYSIS ─────────────────────────────────────────────────────────

  // Recommend restoration based on current soil deficit
  function recommendRestoration(plotId) {
    var soil = getSoil(plotId);
    var recs = [];

    if (soil.nitrogen < 30) {
      recs.push({ method: 'manure', reason: 'Low nitrogen (N=' + soil.nitrogen + ')', priority: 'high' });
    } else if (soil.nitrogen < 50) {
      recs.push({ method: 'compost', reason: 'Moderate nitrogen deficit', priority: 'medium' });
    }

    if (soil.phosphorus < 30) {
      recs.push({ method: 'bone_meal', reason: 'Low phosphorus (P=' + soil.phosphorus + ')', priority: 'high' });
    }

    if (soil.potassium < 30) {
      recs.push({ method: 'wood_ash', reason: 'Low potassium (K=' + soil.potassium + ')', priority: 'high' });
    }

    if (soil.organicMatter < 25) {
      recs.push({ method: 'cover_crop_mulch', reason: 'Low organic matter', priority: 'high' });
    }

    if (recs.length === 0) {
      recs.push({ method: 'fallow', reason: 'Soil is healthy — periodic rest recommended', priority: 'low' });
    }

    return recs;
  }

  // Get best crops to plant now given soil state and season
  function recommendCrops(plotId, season) {
    var soil = getSoil(plotId);
    var plantable = getCropsForSeason(season);

    var scored = plantable.map(function(crop) {
      var nRatio = crop.npkDemand.N > 0 ? Math.min(1, soil.nitrogen    / (crop.npkDemand.N * 1.5)) : 1;
      var pRatio = crop.npkDemand.P > 0 ? Math.min(1, soil.phosphorus  / (crop.npkDemand.P * 1.5)) : 1;
      var kRatio = crop.npkDemand.K > 0 ? Math.min(1, soil.potassium   / (crop.npkDemand.K * 1.5)) : 1;
      var nutrientScore = (nRatio + pRatio + kRatio) / 3;
      // Legumes get a bonus if nitrogen is low (they fix it)
      var legumeFix = (crop.category === 'legume' && soil.nitrogen < 40) ? 0.2 : 0;
      var score = nutrientScore + legumeFix;
      return { crop: crop, score: Math.min(1, score), nutrientScore: nutrientScore };
    });

    scored.sort(function(a, b) { return b.score - a.score; });

    return scored.map(function(entry) {
      return {
        cropId:      entry.crop.id,
        cropName:    entry.crop.name,
        category:    entry.crop.category,
        score:       Math.round(entry.score * 100) / 100,
        recommended: entry.score >= 0.7
      };
    });
  }

  // ── NUTRIENT HISTORY TREND ────────────────────────────────────────────────

  // Get a summary of soil changes over time from plot history
  function getSoilTrend(plotId) {
    var plot = getOrCreatePlot(plotId);
    var snapshots = [];
    for (var i = 0; i < plot.history.length; i++) {
      var h = plot.history[i];
      if (h.soilAfter) {
        snapshots.push({
          step:    i,
          action:  h.action,
          cropId:  h.cropId || null,
          soil:    h.soilAfter
        });
      }
    }
    return snapshots;
  }

  // ── COMPANION ANALYSIS ────────────────────────────────────────────────────

  // Given a list of crops in the same plot, return total companion bonus
  function analyzePlotCompanions(cropIds) {
    var details = [];
    var totalBonus = 0;
    for (var i = 0; i < cropIds.length; i++) {
      for (var j = i + 1; j < cropIds.length; j++) {
        var rel = getCropRelationship(cropIds[i], cropIds[j]);
        if (rel) {
          totalBonus += rel.bonus;
          details.push({
            cropA:       cropIds[i],
            cropB:       cropIds[j],
            bonus:       rel.bonus,
            type:        rel.type,
            description: rel.description
          });
        }
      }
    }
    return {
      totalBonus: Math.round(totalBonus * 100) / 100,
      pairs:      details,
      netPositive: totalBonus > 0
    };
  }

  // ── RESET (testing) ───────────────────────────────────────────────────────

  function _reset() {
    _plots = {};
  }

  // ── EXPORTS ───────────────────────────────────────────────────────────────

  exports.CROP_CATALOG          = CROP_CATALOG;
  exports.COMPANION_PAIRS       = COMPANION_PAIRS;
  exports.RESTORATION_METHODS   = RESTORATION_METHODS;
  exports.SEASONS               = SEASONS;
  exports.SOIL_MAX              = SOIL_MAX;
  exports.SOIL_MIN              = SOIL_MIN;
  exports.DEFAULT_SOIL          = DEFAULT_SOIL;

  exports.mulberry32            = mulberry32;
  exports.strHash               = strHash;
  exports.soilHealthScore       = soilHealthScore;
  exports.advanceSeason         = advanceSeason;

  exports.getCropRelationship   = getCropRelationship;
  exports.getRelationshipsForCrop = getRelationshipsForCrop;
  exports.canPlantInSeason      = canPlantInSeason;
  exports.getCropsForSeason     = getCropsForSeason;

  exports.getOrCreatePlot       = getOrCreatePlot;
  exports.getSoil               = getSoil;
  exports.getPlotHistory        = getPlotHistory;
  exports.getPlotInfo           = getPlotInfo;
  exports.getAllPlots            = getAllPlots;
  exports.getSoilTrend          = getSoilTrend;

  exports.plant                 = plant;
  exports.applyFallow           = applyFallow;
  exports.applyRestoration      = applyRestoration;
  exports.calculateYield        = calculateYield;

  exports.planRotation          = planRotation;
  exports.recommendRestoration  = recommendRestoration;
  exports.recommendCrops        = recommendCrops;
  exports.analyzePlotCompanions = analyzePlotCompanions;

  exports._reset                = _reset;

})(typeof module !== 'undefined' ? module.exports : (window.CropRotation = {}));
