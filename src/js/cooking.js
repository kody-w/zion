// cooking.js — Cooking & Meal Buff System for ZION
// Transforms ingredients (fish, herbs, crops) into meals with buffs.
// Cross-system loop: fishing → cooking → buffs → better gathering.
(function(exports) {
  'use strict';

  // ── Seeded PRNG (mulberry32) ──────────────────────────────────────────────

  function mulberry32(seed) {
    return function() {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // ── INGREDIENTS ───────────────────────────────────────────────────────────

  var INGREDIENTS = [
    // Fish (from fishing.js)
    { id: 'trout',         name: 'Trout',          category: 'fish',       rarity: 1, zones: ['wilds', 'gardens'] },
    { id: 'bass',          name: 'Bass',            category: 'fish',       rarity: 1, zones: ['nexus', 'agora'] },
    { id: 'salmon',        name: 'Salmon',          category: 'fish',       rarity: 2, zones: ['wilds', 'commons'] },
    { id: 'catfish',       name: 'Catfish',         category: 'fish',       rarity: 1, zones: ['agora', 'nexus'] },
    { id: 'eel',           name: 'Eel',             category: 'fish',       rarity: 2, zones: ['wilds', 'agora', 'commons'] },
    { id: 'golden_carp',   name: 'Golden Carp',     category: 'fish',       rarity: 3, zones: ['gardens', 'commons'] },
    { id: 'phantom_pike',  name: 'Phantom Pike',    category: 'fish',       rarity: 4, zones: ['wilds'] },

    // Herbs
    { id: 'mint',          name: 'Mint',            category: 'herbs',      rarity: 0, zones: ['gardens', 'wilds'] },
    { id: 'sage',          name: 'Sage',            category: 'herbs',      rarity: 0, zones: ['gardens', 'agora'] },
    { id: 'rosemary',      name: 'Rosemary',        category: 'herbs',      rarity: 1, zones: ['gardens'] },
    { id: 'thyme',         name: 'Thyme',           category: 'herbs',      rarity: 0, zones: ['gardens', 'studio'] },
    { id: 'lavender',      name: 'Lavender',        category: 'herbs',      rarity: 1, zones: ['gardens', 'commons'] },
    { id: 'starbloom',     name: 'Starbloom',       category: 'herbs',      rarity: 3, zones: ['wilds', 'athenaeum'] },
    { id: 'moonpetal',     name: 'Moonpetal',       category: 'herbs',      rarity: 4, zones: ['wilds'] },

    // Vegetables
    { id: 'potato',        name: 'Potato',          category: 'vegetables', rarity: 0, zones: ['gardens', 'commons'] },
    { id: 'carrot',        name: 'Carrot',          category: 'vegetables', rarity: 0, zones: ['gardens', 'agora'] },
    { id: 'onion',         name: 'Onion',           category: 'vegetables', rarity: 0, zones: ['gardens'] },
    { id: 'mushroom',      name: 'Mushroom',        category: 'vegetables', rarity: 1, zones: ['wilds', 'studio'] },
    { id: 'pumpkin',       name: 'Pumpkin',         category: 'vegetables', rarity: 1, zones: ['gardens', 'commons'] },
    { id: 'corn',          name: 'Corn',            category: 'vegetables', rarity: 0, zones: ['gardens', 'agora'] },

    // Fruits
    { id: 'apple',         name: 'Apple',           category: 'fruits',     rarity: 0, zones: ['gardens', 'wilds'] },
    { id: 'berry',         name: 'Berry',           category: 'fruits',     rarity: 0, zones: ['wilds', 'gardens'] },
    { id: 'melon',         name: 'Melon',           category: 'fruits',     rarity: 1, zones: ['gardens', 'agora'] },
    { id: 'starfruit',     name: 'Starfruit',       category: 'fruits',     rarity: 3, zones: ['athenaeum', 'wilds'] },

    // Grains
    { id: 'wheat',         name: 'Wheat',           category: 'grains',     rarity: 0, zones: ['gardens', 'commons', 'agora'] },
    { id: 'rice',          name: 'Rice',            category: 'grains',     rarity: 0, zones: ['gardens', 'nexus'] },
    { id: 'barley',        name: 'Barley',          category: 'grains',     rarity: 0, zones: ['gardens', 'agora'] },

    // Spices
    { id: 'salt',          name: 'Salt',            category: 'spices',     rarity: 0, zones: ['nexus', 'agora'] },
    { id: 'pepper',        name: 'Pepper',          category: 'spices',     rarity: 1, zones: ['agora', 'studio'] },
    { id: 'cinnamon',      name: 'Cinnamon',        category: 'spices',     rarity: 1, zones: ['gardens', 'athenaeum'] },
    { id: 'saffron',       name: 'Saffron',         category: 'spices',     rarity: 3, zones: ['athenaeum', 'gardens'] },

    // Dairy
    { id: 'milk',          name: 'Milk',            category: 'dairy',      rarity: 0, zones: ['gardens', 'commons'] },
    { id: 'butter',        name: 'Butter',          category: 'dairy',      rarity: 0, zones: ['gardens', 'nexus'] },
    { id: 'cream',         name: 'Cream',           category: 'dairy',      rarity: 1, zones: ['gardens'] },

    // Special
    { id: 'honey',         name: 'Honey',           category: 'special',    rarity: 2, zones: ['gardens', 'wilds'] },
    { id: 'crystal_water', name: 'Crystal Water',   category: 'special',    rarity: 3, zones: ['athenaeum', 'wilds'] },
    { id: 'dragon_pepper', name: 'Dragon Pepper',   category: 'special',    rarity: 4, zones: ['arena', 'wilds'] }
  ];

  // Build ingredient lookup map
  var _ingredientMap = {};
  for (var _i = 0; _i < INGREDIENTS.length; _i++) {
    _ingredientMap[INGREDIENTS[_i].id] = INGREDIENTS[_i];
  }

  // ── RECIPES ───────────────────────────────────────────────────────────────

  var RECIPES = [
    // ── Simple ────────────────────────────────────────────────────────────────
    {
      id: 'grilled_trout',
      name: 'Grilled Trout',
      category: 'simple',
      ingredients: [{ id: 'trout', qty: 1 }, { id: 'salt', qty: 1 }],
      output: { id: 'grilled_trout_meal', name: 'Grilled Trout', qty: 1 },
      cookTime: 3000,
      buff: { type: 'xp_bonus', value: 0.1, duration: 300 },
      seasonalBonus: null,
      skillRequired: 0
    },
    {
      id: 'herb_salad',
      name: 'Herb Salad',
      category: 'simple',
      ingredients: [{ id: 'mint', qty: 2 }, { id: 'sage', qty: 1 }, { id: 'carrot', qty: 1 }],
      output: { id: 'herb_salad_meal', name: 'Herb Salad', qty: 1 },
      cookTime: 1500,
      buff: { type: 'health_regen', value: 0.05, duration: 180 },
      seasonalBonus: 'spring',
      skillRequired: 0
    },
    {
      id: 'roasted_potato',
      name: 'Roasted Potato',
      category: 'simple',
      ingredients: [{ id: 'potato', qty: 2 }, { id: 'salt', qty: 1 }],
      output: { id: 'roasted_potato_meal', name: 'Roasted Potato', qty: 1 },
      cookTime: 2000,
      buff: { type: 'warmth', value: 0.2, duration: 600 },
      seasonalBonus: 'autumn',
      skillRequired: 0
    },
    {
      id: 'pan_fried_bass',
      name: 'Pan Fried Bass',
      category: 'simple',
      ingredients: [{ id: 'bass', qty: 1 }, { id: 'butter', qty: 1 }, { id: 'salt', qty: 1 }],
      output: { id: 'pan_fried_bass_meal', name: 'Pan Fried Bass', qty: 1 },
      cookTime: 3500,
      buff: { type: 'harvest_yield', value: 0.1, duration: 240 },
      seasonalBonus: null,
      skillRequired: 0
    },
    {
      id: 'corn_porridge',
      name: 'Corn Porridge',
      category: 'simple',
      ingredients: [{ id: 'corn', qty: 2 }, { id: 'milk', qty: 1 }],
      output: { id: 'corn_porridge_meal', name: 'Corn Porridge', qty: 1 },
      cookTime: 2500,
      buff: { type: 'warmth', value: 0.15, duration: 480 },
      seasonalBonus: 'winter',
      skillRequired: 0
    },
    {
      id: 'apple_cider',
      name: 'Apple Cider',
      category: 'simple',
      ingredients: [{ id: 'apple', qty: 3 }],
      output: { id: 'apple_cider_meal', name: 'Apple Cider', qty: 1 },
      cookTime: 2000,
      buff: { type: 'social_charm', value: 0.1, duration: 300 },
      seasonalBonus: 'autumn',
      skillRequired: 0
    },

    // ── Intermediate ──────────────────────────────────────────────────────────
    {
      id: 'catfish_stew',
      name: 'Catfish Stew',
      category: 'intermediate',
      ingredients: [{ id: 'catfish', qty: 1 }, { id: 'potato', qty: 1 }, { id: 'onion', qty: 1 }, { id: 'thyme', qty: 1 }],
      output: { id: 'catfish_stew_meal', name: 'Catfish Stew', qty: 1 },
      cookTime: 5000,
      buff: { type: 'fishing_luck', value: 0.15, duration: 360 },
      seasonalBonus: null,
      skillRequired: 3
    },
    {
      id: 'mushroom_risotto',
      name: 'Mushroom Risotto',
      category: 'intermediate',
      ingredients: [{ id: 'mushroom', qty: 2 }, { id: 'rice', qty: 2 }, { id: 'cream', qty: 1 }],
      output: { id: 'mushroom_risotto_meal', name: 'Mushroom Risotto', qty: 1 },
      cookTime: 6000,
      buff: { type: 'craft_quality', value: 0.15, duration: 300 },
      seasonalBonus: 'autumn',
      skillRequired: 3
    },
    {
      id: 'herb_salmon',
      name: 'Herb-Crusted Salmon',
      category: 'intermediate',
      ingredients: [{ id: 'salmon', qty: 1 }, { id: 'rosemary', qty: 1 }, { id: 'thyme', qty: 1 }, { id: 'butter', qty: 1 }],
      output: { id: 'herb_salmon_meal', name: 'Herb-Crusted Salmon', qty: 1 },
      cookTime: 5500,
      buff: { type: 'xp_bonus', value: 0.2, duration: 480 },
      seasonalBonus: 'spring',
      skillRequired: 3
    },
    {
      id: 'berry_tart',
      name: 'Berry Tart',
      category: 'intermediate',
      ingredients: [{ id: 'berry', qty: 3 }, { id: 'wheat', qty: 2 }, { id: 'butter', qty: 1 }],
      output: { id: 'berry_tart_meal', name: 'Berry Tart', qty: 1 },
      cookTime: 7000,
      buff: { type: 'social_charm', value: 0.2, duration: 360 },
      seasonalBonus: 'summer',
      skillRequired: 3
    },
    {
      id: 'pumpkin_soup',
      name: 'Pumpkin Soup',
      category: 'intermediate',
      ingredients: [{ id: 'pumpkin', qty: 1 }, { id: 'cream', qty: 1 }, { id: 'cinnamon', qty: 1 }],
      output: { id: 'pumpkin_soup_meal', name: 'Pumpkin Soup', qty: 1 },
      cookTime: 5000,
      buff: { type: 'warmth', value: 0.3, duration: 720 },
      seasonalBonus: 'autumn',
      skillRequired: 3
    },
    {
      id: 'eel_kabob',
      name: 'Eel Kabob',
      category: 'intermediate',
      ingredients: [{ id: 'eel', qty: 1 }, { id: 'pepper', qty: 1 }, { id: 'onion', qty: 1 }],
      output: { id: 'eel_kabob_meal', name: 'Eel Kabob', qty: 1 },
      cookTime: 4500,
      buff: { type: 'speed', value: 0.1, duration: 300 },
      seasonalBonus: 'summer',
      skillRequired: 3
    },

    // ── Advanced ──────────────────────────────────────────────────────────────
    {
      id: 'lavender_honey_cake',
      name: 'Lavender Honey Cake',
      category: 'advanced',
      ingredients: [{ id: 'lavender', qty: 2 }, { id: 'honey', qty: 2 }, { id: 'wheat', qty: 2 }, { id: 'cream', qty: 1 }],
      output: { id: 'lavender_honey_cake_meal', name: 'Lavender Honey Cake', qty: 1 },
      cookTime: 10000,
      buff: { type: 'social_charm', value: 0.3, duration: 600 },
      seasonalBonus: 'spring',
      skillRequired: 6
    },
    {
      id: 'saffron_paella',
      name: 'Saffron Paella',
      category: 'advanced',
      ingredients: [{ id: 'rice', qty: 2 }, { id: 'saffron', qty: 1 }, { id: 'salmon', qty: 1 }, { id: 'pepper', qty: 1 }],
      output: { id: 'saffron_paella_meal', name: 'Saffron Paella', qty: 1 },
      cookTime: 12000,
      buff: { type: 'xp_bonus', value: 0.3, duration: 600 },
      seasonalBonus: null,
      skillRequired: 6
    },
    {
      id: 'starfruit_jam',
      name: 'Starfruit Jam',
      category: 'advanced',
      ingredients: [{ id: 'starfruit', qty: 2 }, { id: 'honey', qty: 1 }, { id: 'barley', qty: 1 }],
      output: { id: 'starfruit_jam_meal', name: 'Starfruit Jam', qty: 1 },
      cookTime: 9000,
      buff: { type: 'spark_bonus', value: 0.25, duration: 480 },
      seasonalBonus: 'summer',
      skillRequired: 6
    },
    {
      id: 'melon_sorbet',
      name: 'Melon Sorbet',
      category: 'advanced',
      ingredients: [{ id: 'melon', qty: 2 }, { id: 'crystal_water', qty: 1 }, { id: 'mint', qty: 1 }],
      output: { id: 'melon_sorbet_meal', name: 'Melon Sorbet', qty: 1 },
      cookTime: 8000,
      buff: { type: 'exploration_range', value: 0.2, duration: 600 },
      seasonalBonus: 'summer',
      skillRequired: 6
    },
    {
      id: 'golden_carp_bisque',
      name: 'Golden Carp Bisque',
      category: 'advanced',
      ingredients: [{ id: 'golden_carp', qty: 1 }, { id: 'cream', qty: 2 }, { id: 'saffron', qty: 1 }, { id: 'thyme', qty: 1 }],
      output: { id: 'golden_carp_bisque_meal', name: 'Golden Carp Bisque', qty: 1 },
      cookTime: 11000,
      buff: { type: 'fishing_luck', value: 0.3, duration: 600 },
      seasonalBonus: null,
      skillRequired: 6
    },

    // ── Master ────────────────────────────────────────────────────────────────
    {
      id: 'starbloom_tea',
      name: 'Starbloom Tea',
      category: 'master',
      ingredients: [{ id: 'starbloom', qty: 2 }, { id: 'crystal_water', qty: 2 }, { id: 'honey', qty: 1 }],
      output: { id: 'starbloom_tea_meal', name: 'Starbloom Tea', qty: 1 },
      cookTime: 15000,
      buff: { type: 'xp_bonus', value: 0.4, duration: 900 },
      seasonalBonus: 'autumn',
      skillRequired: 10
    },
    {
      id: 'moonpetal_elixir',
      name: 'Moonpetal Elixir',
      category: 'master',
      ingredients: [{ id: 'moonpetal', qty: 1 }, { id: 'crystal_water', qty: 2 }, { id: 'lavender', qty: 2 }],
      output: { id: 'moonpetal_elixir_meal', name: 'Moonpetal Elixir', qty: 1 },
      cookTime: 20000,
      buff: { type: 'health_regen', value: 0.4, duration: 1200 },
      seasonalBonus: 'winter',
      skillRequired: 10
    },
    {
      id: 'harvest_festival_pie',
      name: 'Harvest Festival Pie',
      category: 'master',
      ingredients: [{ id: 'pumpkin', qty: 2 }, { id: 'apple', qty: 2 }, { id: 'cinnamon', qty: 1 }, { id: 'cream', qty: 1 }, { id: 'wheat', qty: 2 }],
      output: { id: 'harvest_festival_pie_meal', name: 'Harvest Festival Pie', qty: 1 },
      cookTime: 18000,
      buff: { type: 'harvest_yield', value: 0.35, duration: 900 },
      seasonalBonus: 'autumn',
      skillRequired: 10
    },
    {
      id: 'barley_craft_brew',
      name: 'Barley Craft Brew',
      category: 'master',
      ingredients: [{ id: 'barley', qty: 3 }, { id: 'honey', qty: 2 }, { id: 'mint', qty: 1 }],
      output: { id: 'barley_craft_brew_meal', name: 'Barley Craft Brew', qty: 1 },
      cookTime: 16000,
      buff: { type: 'craft_quality', value: 0.35, duration: 720 },
      seasonalBonus: null,
      skillRequired: 10
    },
    {
      id: 'spiced_dragon_chili',
      name: 'Spiced Dragon Chili',
      category: 'master',
      ingredients: [{ id: 'dragon_pepper', qty: 1 }, { id: 'onion', qty: 2 }, { id: 'potato', qty: 2 }, { id: 'pepper', qty: 2 }],
      output: { id: 'spiced_dragon_chili_meal', name: 'Spiced Dragon Chili', qty: 1 },
      cookTime: 14000,
      buff: { type: 'speed', value: 0.3, duration: 600 },
      seasonalBonus: null,
      skillRequired: 10
    },

    // ── Legendary ──────────────────────────────────────────────────────────────
    {
      id: 'phantom_pike_feast',
      name: 'Phantom Pike Feast',
      category: 'legendary',
      ingredients: [{ id: 'phantom_pike', qty: 1 }, { id: 'saffron', qty: 2 }, { id: 'crystal_water', qty: 2 }, { id: 'moonpetal', qty: 1 }, { id: 'cream', qty: 2 }],
      output: { id: 'phantom_pike_feast_meal', name: 'Phantom Pike Feast', qty: 1 },
      cookTime: 30000,
      buff: { type: 'fishing_luck', value: 0.6, duration: 1800 },
      seasonalBonus: null,
      skillRequired: 15
    },
    {
      id: 'cosmic_celebration_cake',
      name: 'Cosmic Celebration Cake',
      category: 'legendary',
      ingredients: [{ id: 'starbloom', qty: 2 }, { id: 'moonpetal', qty: 1 }, { id: 'starfruit', qty: 2 }, { id: 'honey', qty: 2 }, { id: 'cream', qty: 2 }, { id: 'wheat', qty: 3 }],
      output: { id: 'cosmic_celebration_cake_meal', name: 'Cosmic Celebration Cake', qty: 1 },
      cookTime: 45000,
      buff: { type: 'spark_bonus', value: 0.6, duration: 1800 },
      seasonalBonus: 'winter',
      skillRequired: 15
    },
    {
      id: 'exploration_feast',
      name: 'Explorer\'s Grand Feast',
      category: 'legendary',
      ingredients: [{ id: 'dragon_pepper', qty: 1 }, { id: 'starfruit', qty: 2 }, { id: 'golden_carp', qty: 1 }, { id: 'crystal_water', qty: 3 }, { id: 'sage', qty: 2 }],
      output: { id: 'exploration_feast_meal', name: "Explorer's Grand Feast", qty: 1 },
      cookTime: 40000,
      buff: { type: 'exploration_range', value: 0.5, duration: 1800 },
      seasonalBonus: 'spring',
      skillRequired: 15
    }
  ];

  // Build recipe lookup map
  var _recipeMap = {};
  for (var _r = 0; _r < RECIPES.length; _r++) {
    _recipeMap[RECIPES[_r].id] = RECIPES[_r];
  }

  // ── MEAL_QUALITY ─────────────────────────────────────────────────────────

  var MEAL_QUALITY = {
    burnt:     { id: 'burnt',     min: 0,    max: 0.2,  buffScale: 0 },
    plain:     { id: 'plain',     min: 0.2,  max: 0.4,  buffScale: 0.5 },
    tasty:     { id: 'tasty',     min: 0.4,  max: 0.7,  buffScale: 1.0 },
    delicious: { id: 'delicious', min: 0.7,  max: 0.9,  buffScale: 1.5 },
    legendary: { id: 'legendary', min: 0.9,  max: 1.01, buffScale: 2.0 }
  };

  var QUALITY_TIERS = ['burnt', 'plain', 'tasty', 'delicious', 'legendary'];

  // ── COOKING LEVELS ────────────────────────────────────────────────────────

  var COOKING_LEVEL_THRESHOLDS = [0, 5, 15, 30, 50, 80, 120, 170, 230, 300, 380, 470, 570, 680, 800, 1000];

  // ── Internal helpers ──────────────────────────────────────────────────────

  function _getPlayerState(state, playerId) {
    if (!state || !state.players || !state.players[playerId]) {
      return null;
    }
    return state.players[playerId];
  }

  function _ensureInventory(player) {
    if (!player.inventory) {
      player.inventory = [];
    }
  }

  function _ensureActiveBuffs(player) {
    if (!player.activeBuffs) {
      player.activeBuffs = [];
    }
  }

  function _ensureCookingStats(player) {
    if (!player.cookingStats) {
      player.cookingStats = { mealsCooked: 0, totalMeals: {} };
    }
    if (!player.cookingStats.totalMeals) {
      player.cookingStats.totalMeals = {};
    }
  }

  function _countItem(player, itemId) {
    if (!player.inventory) { return 0; }
    var total = 0;
    for (var i = 0; i < player.inventory.length; i++) {
      if (player.inventory[i].id === itemId) {
        total += (player.inventory[i].qty || 1);
      }
    }
    return total;
  }

  function _removeItems(player, itemId, qty) {
    var remaining = qty;
    var i = 0;
    while (i < player.inventory.length && remaining > 0) {
      if (player.inventory[i].id === itemId) {
        var available = player.inventory[i].qty || 1;
        if (available <= remaining) {
          remaining -= available;
          player.inventory.splice(i, 1);
        } else {
          player.inventory[i].qty = available - remaining;
          remaining = 0;
          i++;
        }
      } else {
        i++;
      }
    }
  }

  function _addItem(player, item) {
    // Try to stack
    for (var i = 0; i < player.inventory.length; i++) {
      if (player.inventory[i].id === item.id && player.inventory[i].buff) {
        // Meals don't stack — they are unique instances with quality/buff
        break;
      }
      if (player.inventory[i].id === item.id && !item.buff) {
        player.inventory[i].qty = (player.inventory[i].qty || 1) + (item.qty || 1);
        return;
      }
    }
    player.inventory.push(item);
  }

  function _getQualityTier(qualityValue) {
    for (var t = QUALITY_TIERS.length - 1; t >= 0; t--) {
      var tier = MEAL_QUALITY[QUALITY_TIERS[t]];
      if (qualityValue >= tier.min) {
        return QUALITY_TIERS[t];
      }
    }
    return 'burnt';
  }

  function _computeQuality(seed, skillLevel, ingredients) {
    var rng = mulberry32(seed);
    var base = rng();
    // Skill bonus: +0.01 per level, capped at 0.3
    var skillBonus = Math.min(skillLevel * 0.02, 0.3);
    // Ingredient rarity bonus: average rarity of ingredients (0-4 scale → 0-0.2 bonus)
    var raritySum = 0;
    var count = 0;
    for (var i = 0; i < ingredients.length; i++) {
      var ingDef = _ingredientMap[ingredients[i].id];
      if (ingDef) {
        raritySum += (ingDef.rarity || 0);
        count++;
      }
    }
    var rarityBonus = count > 0 ? (raritySum / count) * 0.025 : 0;
    var quality = Math.min(1.0, base + skillBonus + rarityBonus);
    return quality;
  }

  function _scaleBuff(buff, qualityTier) {
    var tier = MEAL_QUALITY[qualityTier];
    if (!tier) { return null; }
    var scale = tier.buffScale;
    if (scale === 0) { return null; }
    return {
      type: buff.type,
      value: buff.value * scale,
      duration: buff.duration
    };
  }

  function _generateMealId(recipeId, playerId) {
    return 'meal_' + recipeId + '_' + playerId + '_' + Date.now();
  }

  // ── Core API ──────────────────────────────────────────────────────────────

  /**
   * Check if a player can cook a recipe.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} recipeId
   * @returns {{canCook: boolean, reason: string}}
   */
  function canCook(state, playerId, recipeId) {
    var player = _getPlayerState(state, playerId);
    if (!player) {
      return { canCook: false, reason: 'Player not found' };
    }
    var recipe = _recipeMap[recipeId];
    if (!recipe) {
      return { canCook: false, reason: 'Unknown recipe: ' + recipeId };
    }
    var cookingLevel = getCookingLevel(state, playerId);
    if (cookingLevel < recipe.skillRequired) {
      return { canCook: false, reason: 'Cooking level ' + recipe.skillRequired + ' required (current: ' + cookingLevel + ')' };
    }
    _ensureInventory(player);
    for (var i = 0; i < recipe.ingredients.length; i++) {
      var req = recipe.ingredients[i];
      var have = _countItem(player, req.id);
      if (have < req.qty) {
        return { canCook: false, reason: 'Missing ingredient: ' + req.id + ' (need ' + req.qty + ', have ' + have + ')' };
      }
    }
    return { canCook: true, reason: 'ok' };
  }

  /**
   * Cook a recipe.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} recipeId
   * @param {number} seed - for deterministic quality roll
   * @returns {{success: boolean, meal: Object|null, ingredientsUsed: Array, reason: string}}
   */
  function cook(state, playerId, recipeId, seed) {
    var check = canCook(state, playerId, recipeId);
    if (!check.canCook) {
      return { success: false, meal: null, ingredientsUsed: [], reason: check.reason };
    }
    var player = _getPlayerState(state, playerId);
    var recipe = _recipeMap[recipeId];
    var skillLevel = getCookingLevel(state, playerId);

    // Remove ingredients
    var ingredientsUsed = [];
    for (var i = 0; i < recipe.ingredients.length; i++) {
      var req = recipe.ingredients[i];
      _removeItems(player, req.id, req.qty);
      ingredientsUsed.push({ id: req.id, qty: req.qty });
    }

    // Roll quality
    var effectiveSeed = (seed !== undefined && seed !== null) ? seed : (Date.now() ^ (playerId.charCodeAt(0) || 0));
    var quality = _computeQuality(effectiveSeed, skillLevel, recipe.ingredients);
    var qualityTier = _getQualityTier(quality);

    // Scale buff
    var scaledBuff = _scaleBuff(recipe.buff, qualityTier);

    // Create meal
    var mealId = _generateMealId(recipeId, playerId);
    var meal = {
      id: mealId,
      recipeId: recipeId,
      name: recipe.output.name,
      quality: quality,
      qualityTier: qualityTier,
      buff: scaledBuff,
      eaten: false
    };

    // Add to inventory
    _ensureInventory(player);
    _addItem(player, meal);

    // Update cooking stats
    _ensureCookingStats(player);
    player.cookingStats.mealsCooked = (player.cookingStats.mealsCooked || 0) + 1;
    player.cookingStats.totalMeals[recipeId] = (player.cookingStats.totalMeals[recipeId] || 0) + 1;

    return { success: true, meal: meal, ingredientsUsed: ingredientsUsed, reason: 'ok' };
  }

  /**
   * Eat a meal from inventory.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} mealId - id of the specific meal instance in inventory
   * @param {number} [currentTick] - current game tick for buff expiry
   * @returns {{success: boolean, buffApplied: Object|null, reason: string}}
   */
  function eat(state, playerId, mealId, currentTick) {
    var player = _getPlayerState(state, playerId);
    if (!player) {
      return { success: false, buffApplied: null, reason: 'Player not found' };
    }
    _ensureInventory(player);
    // Find meal in inventory
    var mealIndex = -1;
    for (var i = 0; i < player.inventory.length; i++) {
      if (player.inventory[i].id === mealId) {
        mealIndex = i;
        break;
      }
    }
    if (mealIndex === -1) {
      return { success: false, buffApplied: null, reason: 'Meal not found in inventory: ' + mealId };
    }
    var meal = player.inventory[mealIndex];
    if (meal.eaten) {
      return { success: false, buffApplied: null, reason: 'Meal already eaten' };
    }
    // Remove meal from inventory
    player.inventory.splice(mealIndex, 1);
    // Apply buff if any
    var buffApplied = null;
    if (meal.buff) {
      var tick = (currentTick !== undefined && currentTick !== null) ? currentTick : 0;
      _ensureActiveBuffs(player);
      var activeBuff = {
        type: meal.buff.type,
        value: meal.buff.value,
        duration: meal.buff.duration,
        expiresAt: tick + meal.buff.duration,
        sourceRecipeId: meal.recipeId,
        sourceMealName: meal.name
      };
      player.activeBuffs.push(activeBuff);
      buffApplied = {
        type: activeBuff.type,
        value: activeBuff.value,
        duration: activeBuff.duration
      };
    }
    return { success: true, buffApplied: buffApplied, reason: 'ok' };
  }

  /**
   * Get active (non-expired) buffs for a player.
   * @param {Object} state
   * @param {string} playerId
   * @param {number} [currentTick]
   * @returns {Array}
   */
  function getActiveBuffs(state, playerId, currentTick) {
    var player = _getPlayerState(state, playerId);
    if (!player || !player.activeBuffs) { return []; }
    var tick = (currentTick !== undefined && currentTick !== null) ? currentTick : 0;
    var active = [];
    for (var i = 0; i < player.activeBuffs.length; i++) {
      if (player.activeBuffs[i].expiresAt > tick) {
        active.push(player.activeBuffs[i]);
      }
    }
    return active;
  }

  /**
   * Remove expired buffs from player state.
   * @param {Object} state
   * @param {string} playerId
   * @param {number} currentTick
   * @returns {Object} updated state
   */
  function updateBuffs(state, playerId, currentTick) {
    var player = _getPlayerState(state, playerId);
    if (!player || !player.activeBuffs) { return state; }
    var tick = (currentTick !== undefined && currentTick !== null) ? currentTick : 0;
    player.activeBuffs = player.activeBuffs.filter(function(b) {
      return b.expiresAt > tick;
    });
    return state;
  }

  /**
   * Get all recipes, optionally filtered by category.
   * @param {string} [category]
   * @returns {Array}
   */
  function getRecipes(category) {
    if (!category) { return RECIPES.slice(); }
    return RECIPES.filter(function(r) { return r.category === category; });
  }

  /**
   * Get recipe by id.
   * @param {string} recipeId
   * @returns {Object|null}
   */
  function getRecipeById(recipeId) {
    return _recipeMap[recipeId] || null;
  }

  /**
   * Get all recipes the player has ingredients for right now.
   * @param {Object} state
   * @param {string} playerId
   * @returns {Array}
   */
  function getCookableRecipes(state, playerId) {
    var player = _getPlayerState(state, playerId);
    if (!player) { return []; }
    var cookingLevel = getCookingLevel(state, playerId);
    var result = [];
    for (var i = 0; i < RECIPES.length; i++) {
      var recipe = RECIPES[i];
      if (cookingLevel < recipe.skillRequired) { continue; }
      var canMake = true;
      _ensureInventory(player);
      for (var j = 0; j < recipe.ingredients.length; j++) {
        var req = recipe.ingredients[j];
        if (_countItem(player, req.id) < req.qty) {
          canMake = false;
          break;
        }
      }
      if (canMake) { result.push(recipe); }
    }
    return result;
  }

  /**
   * Get missing ingredients for a recipe.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} recipeId
   * @returns {Array} list of {id, name, needed, have}
   */
  function getMissingIngredients(state, playerId, recipeId) {
    var recipe = _recipeMap[recipeId];
    if (!recipe) { return []; }
    var player = _getPlayerState(state, playerId);
    if (!player) {
      // All ingredients are missing
      return recipe.ingredients.map(function(req) {
        var ing = _ingredientMap[req.id];
        return { id: req.id, name: ing ? ing.name : req.id, needed: req.qty, have: 0 };
      });
    }
    _ensureInventory(player);
    var missing = [];
    for (var i = 0; i < recipe.ingredients.length; i++) {
      var req = recipe.ingredients[i];
      var have = _countItem(player, req.id);
      if (have < req.qty) {
        var ingDef = _ingredientMap[req.id];
        missing.push({ id: req.id, name: ingDef ? ingDef.name : req.id, needed: req.qty, have: have });
      }
    }
    return missing;
  }

  /**
   * Get all ingredient definitions.
   * @returns {Array}
   */
  function getIngredients() {
    return INGREDIENTS.slice();
  }

  /**
   * Get ingredient by id.
   * @param {string} id
   * @returns {Object|null}
   */
  function getIngredientById(id) {
    return _ingredientMap[id] || null;
  }

  /**
   * Get recipes that have a seasonal bonus matching the given season.
   * @param {string} season - 'spring', 'summer', 'autumn', 'winter'
   * @returns {Array}
   */
  function getSeasonalRecipes(season) {
    return RECIPES.filter(function(r) { return r.seasonalBonus === season; });
  }

  /**
   * Get cooking level from meals cooked count.
   * @param {Object} state
   * @param {string} playerId
   * @returns {number}
   */
  function getCookingLevel(state, playerId) {
    var player = _getPlayerState(state, playerId);
    if (!player) { return 0; }
    _ensureCookingStats(player);
    var mealsCooked = player.cookingStats.mealsCooked || 0;
    var level = 0;
    for (var i = COOKING_LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (mealsCooked >= COOKING_LEVEL_THRESHOLDS[i]) {
        level = i;
        break;
      }
    }
    return level;
  }

  /**
   * Gift a meal to another player (or NPC) for a reputation boost.
   * @param {Object} state
   * @param {string} fromId
   * @param {string} toId
   * @param {string} mealId
   * @returns {{success: boolean, reputationGain: number, reason: string}}
   */
  function giftMeal(state, fromId, toId, mealId) {
    var fromPlayer = _getPlayerState(state, fromId);
    if (!fromPlayer) {
      return { success: false, reputationGain: 0, reason: 'Sender not found' };
    }
    var toPlayer = _getPlayerState(state, toId);
    if (!toPlayer) {
      return { success: false, reputationGain: 0, reason: 'Recipient not found' };
    }
    _ensureInventory(fromPlayer);
    var mealIndex = -1;
    for (var i = 0; i < fromPlayer.inventory.length; i++) {
      if (fromPlayer.inventory[i].id === mealId) {
        mealIndex = i;
        break;
      }
    }
    if (mealIndex === -1) {
      return { success: false, reputationGain: 0, reason: 'Meal not found in sender inventory' };
    }
    var meal = fromPlayer.inventory[mealIndex];
    // Remove from sender
    fromPlayer.inventory.splice(mealIndex, 1);
    // Add to recipient
    _ensureInventory(toPlayer);
    _addItem(toPlayer, meal);
    // Calculate reputation gain based on quality tier and recipe category
    var qualityBonus = 1;
    if (meal.qualityTier === 'plain') { qualityBonus = 1; }
    else if (meal.qualityTier === 'tasty') { qualityBonus = 2; }
    else if (meal.qualityTier === 'delicious') { qualityBonus = 3; }
    else if (meal.qualityTier === 'legendary') { qualityBonus = 5; }
    var recipe = _recipeMap[meal.recipeId];
    var categoryBonus = 1;
    if (recipe) {
      if (recipe.category === 'intermediate') { categoryBonus = 2; }
      else if (recipe.category === 'advanced') { categoryBonus = 3; }
      else if (recipe.category === 'master') { categoryBonus = 4; }
      else if (recipe.category === 'legendary') { categoryBonus = 6; }
    }
    var reputationGain = qualityBonus * categoryBonus;
    // Apply reputation to sender
    if (!fromPlayer.reputation) { fromPlayer.reputation = {}; }
    fromPlayer.reputation[toId] = (fromPlayer.reputation[toId] || 0) + reputationGain;
    return { success: true, reputationGain: reputationGain, reason: 'ok' };
  }

  // ── Exports ───────────────────────────────────────────────────────────────

  exports.INGREDIENTS = INGREDIENTS;
  exports.RECIPES = RECIPES;
  exports.MEAL_QUALITY = MEAL_QUALITY;
  exports.QUALITY_TIERS = QUALITY_TIERS;
  exports.COOKING_LEVEL_THRESHOLDS = COOKING_LEVEL_THRESHOLDS;

  exports.cook = cook;
  exports.canCook = canCook;
  exports.eat = eat;
  exports.getActiveBuffs = getActiveBuffs;
  exports.updateBuffs = updateBuffs;
  exports.getRecipes = getRecipes;
  exports.getRecipeById = getRecipeById;
  exports.getCookableRecipes = getCookableRecipes;
  exports.getMissingIngredients = getMissingIngredients;
  exports.getIngredients = getIngredients;
  exports.getIngredientById = getIngredientById;
  exports.getSeasonalRecipes = getSeasonalRecipes;
  exports.getCookingLevel = getCookingLevel;
  exports.giftMeal = giftMeal;

  // Expose internal helpers for testing
  exports._mulberry32 = mulberry32;
  exports._getQualityTier = _getQualityTier;
  exports._scaleBuff = _scaleBuff;

})(typeof module !== 'undefined' ? module.exports : (window.Cooking = {}));
