// alchemy_lab.js — Cauldron-based Potion Brewing for ZION
// Reagent volatility, quality tiers, buff effects, transmutation, and volatile experiments.
// Constitution reference: Article III — crafting actions are core protocol messages.
(function(exports) {
  'use strict';

  // ── Optional dependency guards ────────────────────────────────────────────
  var Crafting = (typeof window !== 'undefined' && window.Crafting) || {};
  var Cooking = (typeof window !== 'undefined' && window.Cooking) || {};
  var SkillMastery = (typeof window !== 'undefined' && window.SkillMastery) || {};
  var Inventory = (typeof window !== 'undefined' && window.Inventory) || {};

  // ── Seeded PRNG (mulberry32) ──────────────────────────────────────────────

  function mulberry32(seed) {
    return function() {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // ── QUALITY TIERS ─────────────────────────────────────────────────────────

  var QUALITY_TIERS = {
    common:     { id: 'common',     label: 'Common',     min: 0.0,  max: 0.35, buffScale: 1.0,  color: '#9e9e9e' },
    fine:       { id: 'fine',       label: 'Fine',       min: 0.35, max: 0.65, buffScale: 1.4,  color: '#4caf50' },
    superior:   { id: 'superior',   label: 'Superior',   min: 0.65, max: 0.85, buffScale: 1.8,  color: '#2196f3' },
    masterwork: { id: 'masterwork', label: 'Masterwork', min: 0.85, max: 1.01, buffScale: 2.5,  color: '#9c27b0' }
  };

  var QUALITY_TIER_ORDER = ['common', 'fine', 'superior', 'masterwork'];

  // ── REAGENTS ──────────────────────────────────────────────────────────────
  // volatility: 0=stable, 1=mild, 2=moderate, 3=high, 4=extreme

  var REAGENTS = [
    // Herbs — stable
    { id: 'moonpetal',      name: 'Moonpetal',       category: 'herb',    volatility: 1, potency: 3, zones: ['wilds'] },
    { id: 'starbloom',      name: 'Starbloom',       category: 'herb',    volatility: 2, potency: 3, zones: ['wilds', 'athenaeum'] },
    { id: 'lavender',       name: 'Lavender',        category: 'herb',    volatility: 0, potency: 1, zones: ['gardens', 'commons'] },
    { id: 'sage',           name: 'Sage',            category: 'herb',    volatility: 0, potency: 1, zones: ['gardens', 'agora'] },
    { id: 'rosemary',       name: 'Rosemary',        category: 'herb',    volatility: 0, potency: 1, zones: ['gardens'] },
    { id: 'thyme',          name: 'Thyme',           category: 'herb',    volatility: 0, potency: 1, zones: ['gardens', 'studio'] },
    { id: 'mint',           name: 'Mint',            category: 'herb',    volatility: 0, potency: 1, zones: ['gardens', 'wilds'] },
    { id: 'nightshade',     name: 'Nightshade',      category: 'herb',    volatility: 3, potency: 4, zones: ['wilds', 'arena'] },
    { id: 'sunpetal',       name: 'Sunpetal',        category: 'herb',    volatility: 1, potency: 2, zones: ['gardens'] },
    { id: 'frostmoss',      name: 'Frostmoss',       category: 'herb',    volatility: 2, potency: 2, zones: ['wilds'] },
    // Minerals
    { id: 'sulfur',         name: 'Sulfur',          category: 'mineral', volatility: 3, potency: 2, zones: ['arena', 'wilds'] },
    { id: 'saltpeter',      name: 'Saltpeter',       category: 'mineral', volatility: 2, potency: 2, zones: ['nexus', 'arena'] },
    { id: 'iron_dust',      name: 'Iron Dust',       category: 'mineral', volatility: 1, potency: 1, zones: ['nexus', 'commons'] },
    { id: 'gold_powder',    name: 'Gold Powder',     category: 'mineral', volatility: 0, potency: 3, zones: ['athenaeum', 'nexus'] },
    { id: 'crystal_dust',   name: 'Crystal Dust',    category: 'mineral', volatility: 2, potency: 4, zones: ['athenaeum'] },
    { id: 'obsidian_shard', name: 'Obsidian Shard',  category: 'mineral', volatility: 3, potency: 3, zones: ['arena', 'wilds'] },
    { id: 'moonstone',      name: 'Moonstone',       category: 'mineral', volatility: 1, potency: 4, zones: ['wilds', 'athenaeum'] },
    // Liquids
    { id: 'crystal_water',  name: 'Crystal Water',   category: 'liquid',  volatility: 0, potency: 2, zones: ['athenaeum', 'wilds'] },
    { id: 'spring_water',   name: 'Spring Water',    category: 'liquid',  volatility: 0, potency: 1, zones: ['wilds', 'gardens'] },
    { id: 'essence_of_void',name: 'Essence of Void', category: 'liquid',  volatility: 4, potency: 5, zones: ['wilds'] },
    { id: 'dragon_ichor',   name: 'Dragon Ichor',    category: 'liquid',  volatility: 4, potency: 5, zones: ['arena'] },
    { id: 'forest_dew',     name: 'Forest Dew',      category: 'liquid',  volatility: 0, potency: 1, zones: ['wilds', 'gardens'] },
    { id: 'moonwater',      name: 'Moonwater',       category: 'liquid',  volatility: 1, potency: 3, zones: ['wilds'] },
    // Animal
    { id: 'spider_silk',    name: 'Spider Silk',     category: 'animal',  volatility: 1, potency: 2, zones: ['wilds'] },
    { id: 'firefly_dust',   name: 'Firefly Dust',    category: 'animal',  volatility: 2, potency: 2, zones: ['wilds', 'gardens'] },
    { id: 'phoenix_ash',    name: 'Phoenix Ash',     category: 'animal',  volatility: 3, potency: 5, zones: ['arena', 'wilds'] },
    { id: 'dragon_scale',   name: 'Dragon Scale',    category: 'animal',  volatility: 3, potency: 4, zones: ['arena'] },
    // Catalysts
    { id: 'philosophers_salt',  name: "Philosopher's Salt",  category: 'catalyst', volatility: 0, potency: 3, zones: ['athenaeum'] },
    { id: 'arcane_catalyst',    name: 'Arcane Catalyst',     category: 'catalyst', volatility: 1, potency: 4, zones: ['athenaeum', 'nexus'] },
    { id: 'void_crystal',       name: 'Void Crystal',        category: 'catalyst', volatility: 4, potency: 5, zones: ['wilds'] }
  ];

  // Build reagent lookup map
  var _reagentMap = {};
  for (var _ri = 0; _ri < REAGENTS.length; _ri++) {
    _reagentMap[REAGENTS[_ri].id] = REAGENTS[_ri];
  }

  // ── LAB STATIONS ──────────────────────────────────────────────────────────

  var LAB_STATIONS = {
    basic_cauldron:      { id: 'basic_cauldron',      name: 'Basic Cauldron',      tier: 1, categories: ['healing', 'utility'], successBonus: 0 },
    alchemists_bench:    { id: 'alchemists_bench',    name: "Alchemist's Bench",   tier: 2, categories: ['healing', 'utility', 'combat', 'enhancement'], successBonus: 0.05 },
    grand_cauldron:      { id: 'grand_cauldron',      name: 'Grand Cauldron',      tier: 3, categories: ['healing', 'utility', 'combat', 'enhancement', 'transmutation'], successBonus: 0.10 },
    arcane_distillery:   { id: 'arcane_distillery',   name: 'Arcane Distillery',   tier: 4, categories: ['healing', 'utility', 'combat', 'enhancement', 'transmutation', 'legendary'], successBonus: 0.15 },
    void_crucible:       { id: 'void_crucible',       name: 'Void Crucible',        tier: 5, categories: ['healing', 'utility', 'combat', 'enhancement', 'transmutation', 'legendary', 'void'], successBonus: 0.20 }
  };

  // ── POTION RECIPES ────────────────────────────────────────────────────────
  // 15+ recipes across categories
  // brewTime in ms, skillRequired = alchemy level

  var RECIPES = [
    // ── Healing ────────────────────────────────────────────────────────────
    {
      id: 'minor_healing_potion',
      name: 'Minor Healing Potion',
      category: 'healing',
      station: 'basic_cauldron',
      reagents: [{ id: 'lavender', qty: 2 }, { id: 'spring_water', qty: 1 }],
      output: { id: 'minor_healing_potion', name: 'Minor Healing Potion', qty: 1 },
      brewTime: 3000,
      buff: { type: 'health_regen', value: 0.10, duration: 120 },
      skillRequired: 0,
      baseSuccessRate: 0.90,
      xpReward: 5
    },
    {
      id: 'healing_potion',
      name: 'Healing Potion',
      category: 'healing',
      station: 'alchemists_bench',
      reagents: [{ id: 'lavender', qty: 2 }, { id: 'sunpetal', qty: 1 }, { id: 'crystal_water', qty: 1 }],
      output: { id: 'healing_potion', name: 'Healing Potion', qty: 1 },
      brewTime: 5000,
      buff: { type: 'health_regen', value: 0.25, duration: 240 },
      skillRequired: 2,
      baseSuccessRate: 0.80,
      xpReward: 12
    },
    {
      id: 'greater_healing_potion',
      name: 'Greater Healing Potion',
      category: 'healing',
      station: 'grand_cauldron',
      reagents: [{ id: 'moonpetal', qty: 1 }, { id: 'sunpetal', qty: 2 }, { id: 'crystal_water', qty: 2 }, { id: 'gold_powder', qty: 1 }],
      output: { id: 'greater_healing_potion', name: 'Greater Healing Potion', qty: 1 },
      brewTime: 9000,
      buff: { type: 'health_regen', value: 0.50, duration: 360 },
      skillRequired: 5,
      baseSuccessRate: 0.70,
      xpReward: 25
    },
    {
      id: 'rejuvenation_elixir',
      name: 'Rejuvenation Elixir',
      category: 'healing',
      station: 'arcane_distillery',
      reagents: [{ id: 'moonpetal', qty: 2 }, { id: 'phoenix_ash', qty: 1 }, { id: 'moonwater', qty: 2 }],
      output: { id: 'rejuvenation_elixir', name: 'Rejuvenation Elixir', qty: 1 },
      brewTime: 14000,
      buff: { type: 'health_regen', value: 0.80, duration: 600 },
      skillRequired: 8,
      baseSuccessRate: 0.60,
      xpReward: 40
    },

    // ── Utility ────────────────────────────────────────────────────────────
    {
      id: 'swiftness_potion',
      name: 'Swiftness Potion',
      category: 'utility',
      station: 'basic_cauldron',
      reagents: [{ id: 'mint', qty: 2 }, { id: 'firefly_dust', qty: 1 }],
      output: { id: 'swiftness_potion', name: 'Swiftness Potion', qty: 1 },
      brewTime: 3500,
      buff: { type: 'speed', value: 0.20, duration: 180 },
      skillRequired: 0,
      baseSuccessRate: 0.85,
      xpReward: 6
    },
    {
      id: 'harvester_brew',
      name: "Harvester's Brew",
      category: 'utility',
      station: 'alchemists_bench',
      reagents: [{ id: 'sage', qty: 2 }, { id: 'thyme', qty: 1 }, { id: 'iron_dust', qty: 1 }],
      output: { id: 'harvester_brew', name: "Harvester's Brew", qty: 1 },
      brewTime: 5000,
      buff: { type: 'harvest_yield', value: 0.25, duration: 300 },
      skillRequired: 2,
      baseSuccessRate: 0.80,
      xpReward: 12
    },
    {
      id: 'craftsmans_elixir',
      name: "Craftsman's Elixir",
      category: 'utility',
      station: 'alchemists_bench',
      reagents: [{ id: 'rosemary', qty: 2 }, { id: 'gold_powder', qty: 1 }, { id: 'crystal_water', qty: 1 }],
      output: { id: 'craftsmans_elixir', name: "Craftsman's Elixir", qty: 1 },
      brewTime: 6000,
      buff: { type: 'craft_quality', value: 0.20, duration: 300 },
      skillRequired: 3,
      baseSuccessRate: 0.78,
      xpReward: 15
    },
    {
      id: 'explorers_tonic',
      name: "Explorer's Tonic",
      category: 'utility',
      station: 'alchemists_bench',
      reagents: [{ id: 'frostmoss', qty: 1 }, { id: 'forest_dew', qty: 2 }, { id: 'sunpetal', qty: 1 }],
      output: { id: 'explorers_tonic', name: "Explorer's Tonic", qty: 1 },
      brewTime: 5500,
      buff: { type: 'exploration_range', value: 0.25, duration: 360 },
      skillRequired: 2,
      baseSuccessRate: 0.82,
      xpReward: 11
    },

    // ── Combat ─────────────────────────────────────────────────────────────
    {
      id: 'strength_tincture',
      name: 'Strength Tincture',
      category: 'combat',
      station: 'alchemists_bench',
      reagents: [{ id: 'dragon_scale', qty: 1 }, { id: 'sulfur', qty: 1 }, { id: 'spring_water', qty: 2 }],
      output: { id: 'strength_tincture', name: 'Strength Tincture', qty: 1 },
      brewTime: 7000,
      buff: { type: 'strength', value: 0.30, duration: 240 },
      skillRequired: 4,
      baseSuccessRate: 0.72,
      xpReward: 20
    },
    {
      id: 'berserker_draught',
      name: 'Berserker Draught',
      category: 'combat',
      station: 'grand_cauldron',
      reagents: [{ id: 'dragon_scale', qty: 2 }, { id: 'nightshade', qty: 1 }, { id: 'dragon_ichor', qty: 1 }],
      output: { id: 'berserker_draught', name: 'Berserker Draught', qty: 1 },
      brewTime: 10000,
      buff: { type: 'strength', value: 0.60, duration: 180 },
      skillRequired: 6,
      baseSuccessRate: 0.62,
      xpReward: 30
    },

    // ── Enhancement ────────────────────────────────────────────────────────
    {
      id: 'wisdom_potion',
      name: 'Wisdom Potion',
      category: 'enhancement',
      station: 'grand_cauldron',
      reagents: [{ id: 'starbloom', qty: 1 }, { id: 'moonstone', qty: 1 }, { id: 'crystal_water', qty: 2 }],
      output: { id: 'wisdom_potion', name: 'Wisdom Potion', qty: 1 },
      brewTime: 9000,
      buff: { type: 'xp_bonus', value: 0.30, duration: 480 },
      skillRequired: 5,
      baseSuccessRate: 0.68,
      xpReward: 25
    },
    {
      id: 'arcane_amplifier',
      name: 'Arcane Amplifier',
      category: 'enhancement',
      station: 'arcane_distillery',
      reagents: [{ id: 'crystal_dust', qty: 2 }, { id: 'arcane_catalyst', qty: 1 }, { id: 'moonwater', qty: 1 }],
      output: { id: 'arcane_amplifier', name: 'Arcane Amplifier', qty: 1 },
      brewTime: 12000,
      buff: { type: 'xp_bonus', value: 0.50, duration: 600 },
      skillRequired: 7,
      baseSuccessRate: 0.60,
      xpReward: 35
    },
    {
      id: 'social_elixir',
      name: 'Social Elixir',
      category: 'enhancement',
      station: 'alchemists_bench',
      reagents: [{ id: 'lavender', qty: 2 }, { id: 'moonpetal', qty: 1 }, { id: 'forest_dew', qty: 2 }],
      output: { id: 'social_elixir', name: 'Social Elixir', qty: 1 },
      brewTime: 6000,
      buff: { type: 'social_charm', value: 0.30, duration: 360 },
      skillRequired: 3,
      baseSuccessRate: 0.78,
      xpReward: 15
    },

    // ── Transmutation ──────────────────────────────────────────────────────
    {
      id: 'stone_to_iron_tincture',
      name: 'Stone-to-Iron Tincture',
      category: 'transmutation',
      station: 'grand_cauldron',
      reagents: [{ id: 'philosophers_salt', qty: 1 }, { id: 'sulfur', qty: 2 }, { id: 'crystal_water', qty: 2 }],
      output: { id: 'stone_to_iron_tincture', name: 'Stone-to-Iron Tincture', qty: 1 },
      brewTime: 11000,
      buff: null,
      transmutation: { from: 'stone', to: 'iron_ore', lossRate: 0.3 },
      skillRequired: 5,
      baseSuccessRate: 0.68,
      xpReward: 28
    },
    {
      id: 'iron_to_gold_tincture',
      name: 'Iron-to-Gold Tincture',
      category: 'transmutation',
      station: 'arcane_distillery',
      reagents: [{ id: 'philosophers_salt', qty: 2 }, { id: 'gold_powder', qty: 1 }, { id: 'arcane_catalyst', qty: 1 }],
      output: { id: 'iron_to_gold_tincture', name: 'Iron-to-Gold Tincture', qty: 1 },
      brewTime: 16000,
      buff: null,
      transmutation: { from: 'iron_ore', to: 'gold_ore', lossRate: 0.5 },
      skillRequired: 8,
      baseSuccessRate: 0.55,
      xpReward: 45
    },

    // ── Legendary ──────────────────────────────────────────────────────────
    {
      id: 'elixir_of_life',
      name: 'Elixir of Life',
      category: 'legendary',
      station: 'arcane_distillery',
      reagents: [{ id: 'moonpetal', qty: 2 }, { id: 'phoenix_ash', qty: 1 }, { id: 'moonstone', qty: 2 }, { id: 'essence_of_void', qty: 1 }],
      output: { id: 'elixir_of_life', name: 'Elixir of Life', qty: 1 },
      brewTime: 20000,
      buff: { type: 'health_regen', value: 1.0, duration: 900 },
      skillRequired: 10,
      baseSuccessRate: 0.50,
      xpReward: 60
    },
    {
      id: 'void_essence_potion',
      name: 'Void Essence Potion',
      category: 'void',
      station: 'void_crucible',
      reagents: [{ id: 'void_crystal', qty: 1 }, { id: 'essence_of_void', qty: 2 }, { id: 'obsidian_shard', qty: 2 }],
      output: { id: 'void_essence_potion', name: 'Void Essence Potion', qty: 1 },
      brewTime: 25000,
      buff: { type: 'all_stats', value: 0.40, duration: 600 },
      skillRequired: 12,
      baseSuccessRate: 0.40,
      xpReward: 80
    }
  ];

  // Build recipe lookup map
  var _recipeMap = {};
  for (var _rrr = 0; _rrr < RECIPES.length; _rrr++) {
    _recipeMap[RECIPES[_rrr].id] = RECIPES[_rrr];
  }

  // ── TRANSMUTATION RULES ───────────────────────────────────────────────────
  // Direct material conversions (without a recipe potion, just using tincture items)

  var TRANSMUTATION_RULES = [
    { from: 'stone',    to: 'iron_ore',   lossRate: 0.30, tinctureId: 'stone_to_iron_tincture' },
    { from: 'iron_ore', to: 'gold_ore',   lossRate: 0.50, tinctureId: 'iron_to_gold_tincture' },
    { from: 'copper_ore', to: 'silver_ore', lossRate: 0.40, tinctureId: null },
    { from: 'wood',     to: 'fiber',      lossRate: 0.20, tinctureId: null }
  ];

  var _transmutationMap = {};
  for (var _ti = 0; _ti < TRANSMUTATION_RULES.length; _ti++) {
    _transmutationMap[TRANSMUTATION_RULES[_ti].from] = TRANSMUTATION_RULES[_ti];
  }

  // ── ALCHEMY LEVEL THRESHOLDS ──────────────────────────────────────────────

  var ALCHEMY_LEVEL_THRESHOLDS = [0, 10, 30, 60, 100, 150, 210, 280, 360, 450, 550, 660, 780, 910, 1050, 1200];

  // ── BREW OUTCOMES ─────────────────────────────────────────────────────────

  var BREW_OUTCOMES = {
    success:   'success',
    failure:   'failure',
    explosion: 'explosion'
  };

  // ── CATALYST DEFINITIONS ──────────────────────────────────────────────────

  var CATALYSTS = {
    philosophers_salt: { id: 'philosophers_salt', successBonus: 0.10, qualityBonus: 0.05, explosionReduction: 0.05 },
    arcane_catalyst:   { id: 'arcane_catalyst',   successBonus: 0.15, qualityBonus: 0.10, explosionReduction: 0.08 },
    void_crystal:      { id: 'void_crystal',       successBonus: 0.20, qualityBonus: 0.15, explosionReduction: -0.05 }
  };

  // ── DISCOVERY COMBINATIONS ────────────────────────────────────────────────
  // Unknown combos that can be discovered by experimentation

  var DISCOVERY_COMBINATIONS = [
    {
      id: 'discovery_swift_growth',
      reagents: ['sunpetal', 'forest_dew', 'thyme'],
      result: { id: 'swift_growth_tonic', name: 'Swift Growth Tonic', buff: { type: 'xp_bonus', value: 0.15, duration: 300 } }
    },
    {
      id: 'discovery_shadow_blend',
      reagents: ['nightshade', 'obsidian_shard', 'moonwater'],
      result: { id: 'shadow_blend_tonic', name: 'Shadow Blend Tonic', buff: { type: 'stealth', value: 0.40, duration: 180 } }
    },
    {
      id: 'discovery_fire_ward',
      reagents: ['frostmoss', 'iron_dust', 'saltpeter'],
      result: { id: 'fire_ward_tonic', name: 'Fire Ward Tonic', buff: { type: 'fire_resist', value: 0.50, duration: 240 } }
    },
    {
      id: 'discovery_void_sight',
      reagents: ['void_crystal', 'moonstone', 'essence_of_void'],
      result: { id: 'void_sight_tonic', name: 'Void Sight Tonic', buff: { type: 'detection_range', value: 0.60, duration: 300 } }
    }
  ];

  // ── INTERNAL HELPERS ──────────────────────────────────────────────────────

  function _getPlayerState(state, playerId) {
    if (!state || !state.players || !state.players[playerId]) { return null; }
    return state.players[playerId];
  }

  function _ensureInventory(player) {
    if (!player.inventory) { player.inventory = []; }
  }

  function _ensureActiveBuffs(player) {
    if (!player.activeBuffs) { player.activeBuffs = []; }
  }

  function _ensureAlchemyStats(player) {
    if (!player.alchemyStats) {
      player.alchemyStats = {
        potionsBrewed: 0,
        explosions: 0,
        failures: 0,
        discoveries: [],
        transmutations: 0,
        xpEarned: 0
      };
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
    // Potions do not stack (each has its own quality/buff)
    if (item.quality !== undefined || item.buff) {
      player.inventory.push(item);
      return;
    }
    // Raw materials stack
    for (var i = 0; i < player.inventory.length; i++) {
      if (player.inventory[i].id === item.id && player.inventory[i].quality === undefined) {
        player.inventory[i].qty = (player.inventory[i].qty || 1) + (item.qty || 1);
        return;
      }
    }
    player.inventory.push(item);
  }

  function _getQualityTier(qualityValue) {
    for (var t = QUALITY_TIER_ORDER.length - 1; t >= 0; t--) {
      var tier = QUALITY_TIERS[QUALITY_TIER_ORDER[t]];
      if (qualityValue >= tier.min) {
        return QUALITY_TIER_ORDER[t];
      }
    }
    return 'common';
  }

  function _computeVolatility(reagents) {
    var total = 0;
    var count = 0;
    for (var i = 0; i < reagents.length; i++) {
      var rDef = _reagentMap[reagents[i].id];
      if (rDef) {
        total += rDef.volatility;
        count++;
      }
    }
    return count > 0 ? total / count : 0;
  }

  function _computePotency(reagents) {
    var total = 0;
    var count = 0;
    for (var i = 0; i < reagents.length; i++) {
      var rDef = _reagentMap[reagents[i].id];
      if (rDef) {
        total += rDef.potency;
        count++;
      }
    }
    return count > 0 ? total / count : 1;
  }

  /**
   * Compute brew outcome probabilities.
   * Returns { successRate, failureRate, explosionRate }.
   */
  function _computeOutcomeProbabilities(recipe, alchemyLevel, stationId, catalystId) {
    var station = LAB_STATIONS[stationId] || LAB_STATIONS['basic_cauldron'];
    var volatility = _computeVolatility(recipe.reagents);

    // Base success rate from recipe
    var successRate = recipe.baseSuccessRate;

    // Station bonus
    successRate += station.successBonus;

    // Skill bonus: +0.02 per alchemy level, capped at +0.3
    var skillBonus = Math.min(alchemyLevel * 0.02, 0.30);
    successRate += skillBonus;

    // Catalyst bonus
    var explosionReduction = 0;
    if (catalystId && CATALYSTS[catalystId]) {
      var cat = CATALYSTS[catalystId];
      successRate += cat.successBonus;
      explosionReduction = cat.explosionReduction;
    }

    // Volatility penalty: high volatility reduces success
    var volatilityPenalty = volatility * 0.05;
    successRate -= volatilityPenalty;

    // Clamp success rate
    successRate = Math.max(0.05, Math.min(0.99, successRate));

    // Failure vs explosion split on the remaining probability
    var remainingRate = 1.0 - successRate;
    // Explosion chance scales with volatility: avg volatility 0→0%, 4→40%
    var explosionChance = Math.max(0, (volatility / 4) * 0.40 - explosionReduction);
    var explosionRate = Math.min(remainingRate, remainingRate * explosionChance);
    var failureRate = remainingRate - explosionRate;

    return {
      successRate: successRate,
      failureRate: failureRate,
      explosionRate: explosionRate
    };
  }

  /**
   * Roll the outcome (success/failure/explosion) using seeded PRNG.
   */
  function _rollOutcome(probs, rng) {
    var roll = rng();
    if (roll < probs.successRate) { return BREW_OUTCOMES.success; }
    if (roll < probs.successRate + probs.failureRate) { return BREW_OUTCOMES.failure; }
    return BREW_OUTCOMES.explosion;
  }

  /**
   * Compute quality of a successfully brewed potion.
   */
  function _computeQuality(seed, alchemyLevel, reagents, catalystId) {
    var rng = mulberry32(seed);
    var base = rng();

    // Skill bonus: up to +0.25
    var skillBonus = Math.min(alchemyLevel * 0.02, 0.25);

    // Potency bonus: reagent potency average → +0-0.15
    var potency = _computePotency(reagents);
    var potencyBonus = (potency / 5) * 0.15;

    // Catalyst quality bonus
    var catalystBonus = 0;
    if (catalystId && CATALYSTS[catalystId]) {
      catalystBonus = CATALYSTS[catalystId].qualityBonus;
    }

    var quality = Math.min(1.0, base + skillBonus + potencyBonus + catalystBonus);
    return quality;
  }

  function _scaleBuff(buff, qualityTier) {
    var tier = QUALITY_TIERS[qualityTier];
    if (!tier || !buff) { return null; }
    return {
      type: buff.type,
      value: Math.round(buff.value * tier.buffScale * 1000) / 1000,
      duration: Math.round(buff.duration * tier.buffScale)
    };
  }

  function _getAlchemyLevel(player) {
    _ensureAlchemyStats(player);
    var xp = player.alchemyStats.xpEarned || 0;
    var level = 0;
    for (var i = ALCHEMY_LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (xp >= ALCHEMY_LEVEL_THRESHOLDS[i]) {
        level = i;
        break;
      }
    }
    return level;
  }

  function _canUseStation(stationId, recipeCategory) {
    var station = LAB_STATIONS[stationId];
    if (!station) { return false; }
    for (var i = 0; i < station.categories.length; i++) {
      if (station.categories[i] === recipeCategory) { return true; }
    }
    return false;
  }

  // Sort reagent ids for canonical comparison
  function _sortedReagentIds(reagentList) {
    var ids = [];
    for (var i = 0; i < reagentList.length; i++) {
      ids.push(reagentList[i].id);
    }
    ids.sort();
    return ids.join(',');
  }

  function _checkDiscovery(reagentList) {
    var key = _sortedReagentIds(reagentList);
    for (var i = 0; i < DISCOVERY_COMBINATIONS.length; i++) {
      var combo = DISCOVERY_COMBINATIONS[i];
      var comboKey = combo.reagents.slice().sort().join(',');
      if (key === comboKey) {
        return combo;
      }
    }
    return null;
  }

  // ── PUBLIC API ────────────────────────────────────────────────────────────

  /**
   * Get the alchemy level of a player.
   * @param {Object} state
   * @param {string} playerId
   * @returns {number}
   */
  function getAlchemyLevel(state, playerId) {
    var player = _getPlayerState(state, playerId);
    if (!player) { return 0; }
    return _getAlchemyLevel(player);
  }

  /**
   * Get all recipes, optionally filtered by category.
   * @param {string} [category]
   * @returns {Array}
   */
  function getRecipes(category) {
    if (!category) { return RECIPES.slice(); }
    var result = [];
    for (var i = 0; i < RECIPES.length; i++) {
      if (RECIPES[i].category === category) { result.push(RECIPES[i]); }
    }
    return result;
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
   * Get all reagent definitions.
   * @returns {Array}
   */
  function getReagents() {
    return REAGENTS.slice();
  }

  /**
   * Get reagent by id.
   * @param {string} id
   * @returns {Object|null}
   */
  function getReagentById(id) {
    return _reagentMap[id] || null;
  }

  /**
   * Get all lab station definitions.
   * @returns {Object}
   */
  function getLabStations() {
    return LAB_STATIONS;
  }

  /**
   * Check if a player can brew a recipe.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} recipeId
   * @param {string} [stationId]
   * @returns {{ canBrew: boolean, reason: string }}
   */
  function canBrew(state, playerId, recipeId, stationId) {
    var player = _getPlayerState(state, playerId);
    if (!player) {
      return { canBrew: false, reason: 'Player not found' };
    }
    var recipe = _recipeMap[recipeId];
    if (!recipe) {
      return { canBrew: false, reason: 'Unknown recipe: ' + recipeId };
    }

    // Station check
    var effectiveStation = stationId || recipe.station;
    if (!_canUseStation(effectiveStation, recipe.category)) {
      return { canBrew: false, reason: 'Station "' + effectiveStation + '" cannot brew category "' + recipe.category + '"' };
    }

    // Alchemy level check
    var alchemyLevel = _getAlchemyLevel(player);
    if (alchemyLevel < recipe.skillRequired) {
      return { canBrew: false, reason: 'Alchemy level ' + recipe.skillRequired + ' required (current: ' + alchemyLevel + ')' };
    }

    // Reagent check
    _ensureInventory(player);
    for (var i = 0; i < recipe.reagents.length; i++) {
      var req = recipe.reagents[i];
      var have = _countItem(player, req.id);
      if (have < req.qty) {
        return { canBrew: false, reason: 'Missing reagent: ' + req.id + ' (need ' + req.qty + ', have ' + have + ')' };
      }
    }

    return { canBrew: true, reason: 'ok' };
  }

  /**
   * Brew a potion.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} recipeId
   * @param {number} [seed] - PRNG seed for deterministic outcome
   * @param {string} [stationId] - override station
   * @param {string} [catalystId] - optional catalyst to improve outcome
   * @returns {{ success: boolean, outcome: string, potion: Object|null, reason: string, xpAwarded: number }}
   */
  function brew(state, playerId, recipeId, seed, stationId, catalystId) {
    var check = canBrew(state, playerId, recipeId, stationId);
    if (!check.canBrew) {
      return { success: false, outcome: 'blocked', potion: null, reason: check.reason, xpAwarded: 0 };
    }

    var player = _getPlayerState(state, playerId);
    var recipe = _recipeMap[recipeId];
    var effectiveStation = stationId || recipe.station;
    var alchemyLevel = _getAlchemyLevel(player);

    // Consume reagents
    _ensureInventory(player);
    for (var i = 0; i < recipe.reagents.length; i++) {
      var req = recipe.reagents[i];
      _removeItems(player, req.id, req.qty);
    }

    // Consume catalyst if provided (1 unit)
    if (catalystId && _countItem(player, catalystId) > 0) {
      _removeItems(player, catalystId, 1);
    } else {
      catalystId = null; // no catalyst available
    }

    // Roll outcome
    var effectiveSeed = (seed !== undefined && seed !== null) ? seed : (Date.now() ^ (playerId.charCodeAt(0) || 0));
    var rng = mulberry32(effectiveSeed);
    var probs = _computeOutcomeProbabilities(recipe, alchemyLevel, effectiveStation, catalystId);
    var outcome = _rollOutcome(probs, rng);

    _ensureAlchemyStats(player);

    // Handle explosion
    if (outcome === BREW_OUTCOMES.explosion) {
      player.alchemyStats.explosions = (player.alchemyStats.explosions || 0) + 1;
      // Partial XP for the attempt
      var partialXp = Math.floor(recipe.xpReward * 0.25);
      player.alchemyStats.xpEarned = (player.alchemyStats.xpEarned || 0) + partialXp;
      return {
        success: false,
        outcome: BREW_OUTCOMES.explosion,
        potion: null,
        reason: 'The cauldron exploded! Reagents destroyed.',
        xpAwarded: partialXp
      };
    }

    // Handle failure
    if (outcome === BREW_OUTCOMES.failure) {
      player.alchemyStats.failures = (player.alchemyStats.failures || 0) + 1;
      var failXp = Math.floor(recipe.xpReward * 0.50);
      player.alchemyStats.xpEarned = (player.alchemyStats.xpEarned || 0) + failXp;
      return {
        success: false,
        outcome: BREW_OUTCOMES.failure,
        potion: null,
        reason: 'The brew failed. The mixture collapsed.',
        xpAwarded: failXp
      };
    }

    // Success — compute quality
    var qualityValue = _computeQuality(effectiveSeed + 1, alchemyLevel, recipe.reagents, catalystId);
    var qualityTier = _getQualityTier(qualityValue);
    var scaledBuff = recipe.buff ? _scaleBuff(recipe.buff, qualityTier) : null;

    var potion = {
      id: 'potion_' + recipeId + '_' + playerId + '_' + Date.now(),
      recipeId: recipeId,
      name: QUALITY_TIERS[qualityTier].label + ' ' + recipe.output.name,
      quality: qualityValue,
      qualityTier: qualityTier,
      buff: scaledBuff,
      transmutation: recipe.transmutation || null,
      consumed: false
    };

    _addItem(player, potion);
    player.alchemyStats.potionsBrewed = (player.alchemyStats.potionsBrewed || 0) + 1;
    player.alchemyStats.xpEarned = (player.alchemyStats.xpEarned || 0) + recipe.xpReward;

    return {
      success: true,
      outcome: BREW_OUTCOMES.success,
      potion: potion,
      reason: 'ok',
      xpAwarded: recipe.xpReward
    };
  }

  /**
   * Drink a potion from inventory.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} potionId - specific instance id in inventory
   * @param {number} [currentTick]
   * @returns {{ success: boolean, buffApplied: Object|null, reason: string }}
   */
  function drinkPotion(state, playerId, potionId, currentTick) {
    var player = _getPlayerState(state, playerId);
    if (!player) {
      return { success: false, buffApplied: null, reason: 'Player not found' };
    }
    _ensureInventory(player);

    var potionIndex = -1;
    for (var i = 0; i < player.inventory.length; i++) {
      if (player.inventory[i].id === potionId) {
        potionIndex = i;
        break;
      }
    }
    if (potionIndex === -1) {
      return { success: false, buffApplied: null, reason: 'Potion not found in inventory: ' + potionId };
    }

    var potion = player.inventory[potionIndex];
    if (potion.consumed) {
      return { success: false, buffApplied: null, reason: 'Potion already consumed' };
    }

    // Remove from inventory
    player.inventory.splice(potionIndex, 1);

    // Apply buff if any
    var buffApplied = null;
    if (potion.buff) {
      var tick = (currentTick !== undefined && currentTick !== null) ? currentTick : 0;
      _ensureActiveBuffs(player);
      var activeBuff = {
        type: potion.buff.type,
        value: potion.buff.value,
        duration: potion.buff.duration,
        expiresAt: tick + potion.buff.duration,
        sourceRecipeId: potion.recipeId,
        sourcePotionName: potion.name
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
   * Get active (non-expired) alchemy buffs for a player.
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
   * Perform transmutation using a tincture potion.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} potionId - transmutation tincture instance id
   * @param {string} sourceItemId - material to transform
   * @param {number} qty - quantity to transmute
   * @returns {{ success: boolean, produced: number, consumed: number, reason: string }}
   */
  function transmute(state, playerId, potionId, sourceItemId, qty) {
    var player = _getPlayerState(state, playerId);
    if (!player) {
      return { success: false, produced: 0, consumed: 0, reason: 'Player not found' };
    }
    _ensureInventory(player);

    // Find tincture potion
    var potionIndex = -1;
    for (var i = 0; i < player.inventory.length; i++) {
      if (player.inventory[i].id === potionId && player.inventory[i].transmutation) {
        potionIndex = i;
        break;
      }
    }
    if (potionIndex === -1) {
      return { success: false, produced: 0, consumed: 0, reason: 'Transmutation tincture not found: ' + potionId };
    }

    var potion = player.inventory[potionIndex];
    var txRule = potion.transmutation;

    // Validate source matches tincture
    if (txRule.from !== sourceItemId) {
      return { success: false, produced: 0, consumed: 0, reason: 'Tincture transmutes ' + txRule.from + ', not ' + sourceItemId };
    }

    // Check qty available
    var have = _countItem(player, sourceItemId);
    if (have < qty) {
      return { success: false, produced: 0, consumed: 0, reason: 'Need ' + qty + ' of ' + sourceItemId + ', have ' + have };
    }

    // Consume tincture
    player.inventory.splice(potionIndex, 1);

    // Consume source materials
    _removeItems(player, sourceItemId, qty);

    // Apply loss rate and produce output
    var produced = Math.max(1, Math.floor(qty * (1 - txRule.lossRate)));
    _addItem(player, { id: txRule.to, qty: produced });

    _ensureAlchemyStats(player);
    player.alchemyStats.transmutations = (player.alchemyStats.transmutations || 0) + 1;

    return { success: true, produced: produced, consumed: qty, reason: 'ok' };
  }

  /**
   * Experiment with an unknown combination of reagents.
   * May discover a new recipe or produce a failure/explosion.
   * @param {Object} state
   * @param {string} playerId
   * @param {Array} reagentList - [{id, qty}]
   * @param {number} [seed]
   * @returns {{ success: boolean, discovered: Object|null, outcome: string, reason: string }}
   */
  function experiment(state, playerId, reagentList, seed) {
    var player = _getPlayerState(state, playerId);
    if (!player) {
      return { success: false, discovered: null, outcome: 'blocked', reason: 'Player not found' };
    }
    if (!reagentList || reagentList.length < 2) {
      return { success: false, discovered: null, outcome: 'blocked', reason: 'Need at least 2 reagents to experiment' };
    }

    _ensureInventory(player);

    // Check reagent availability
    for (var i = 0; i < reagentList.length; i++) {
      var req = reagentList[i];
      var have = _countItem(player, req.id);
      if (have < (req.qty || 1)) {
        return { success: false, discovered: null, outcome: 'blocked', reason: 'Missing reagent: ' + req.id };
      }
    }

    // Compute volatility for experiment
    var volatility = _computeVolatility(reagentList);
    var effectiveSeed = (seed !== undefined && seed !== null) ? seed : (Date.now() ^ 0xDEAD);
    var rng = mulberry32(effectiveSeed);
    var alchemyLevel = _getAlchemyLevel(player);

    // Consume reagents
    for (var j = 0; j < reagentList.length; j++) {
      _removeItems(player, reagentList[j].id, reagentList[j].qty || 1);
    }

    // Explosion check: high volatility raises explosion chance
    var explosionChance = (volatility / 4) * 0.50;
    var roll = rng();
    if (roll < explosionChance) {
      _ensureAlchemyStats(player);
      player.alchemyStats.explosions = (player.alchemyStats.explosions || 0) + 1;
      return { success: false, discovered: null, outcome: BREW_OUTCOMES.explosion, reason: 'Volatile reagents exploded!' };
    }

    // Check for a discovery
    var discovery = _checkDiscovery(reagentList);
    if (discovery) {
      _ensureAlchemyStats(player);
      // Add to discoveries if not already known
      var alreadyKnown = false;
      for (var k = 0; k < player.alchemyStats.discoveries.length; k++) {
        if (player.alchemyStats.discoveries[k] === discovery.id) {
          alreadyKnown = true;
          break;
        }
      }
      if (!alreadyKnown) {
        player.alchemyStats.discoveries.push(discovery.id);
      }

      // Add the discovered tonic to inventory
      var qualityValue = 0.5 + (alchemyLevel * 0.02);
      qualityValue = Math.min(1.0, qualityValue);
      var qualityTier = _getQualityTier(qualityValue);
      var scaledBuff = discovery.result.buff ? _scaleBuff(discovery.result.buff, qualityTier) : null;
      var discoverPotion = {
        id: 'potion_discovery_' + discovery.id + '_' + Date.now(),
        recipeId: discovery.id,
        name: discovery.result.name,
        quality: qualityValue,
        qualityTier: qualityTier,
        buff: scaledBuff,
        consumed: false
      };
      _addItem(player, discoverPotion);

      return {
        success: true,
        discovered: discovery,
        outcome: BREW_OUTCOMES.success,
        reason: 'You discovered: ' + discovery.result.name
      };
    }

    // No discovery — just a failed experiment
    _ensureAlchemyStats(player);
    player.alchemyStats.failures = (player.alchemyStats.failures || 0) + 1;
    return { success: false, discovered: null, outcome: BREW_OUTCOMES.failure, reason: 'The mixture produced nothing useful.' };
  }

  /**
   * Get outcome probabilities for a brew attempt (for UI display).
   * @param {string} recipeId
   * @param {number} alchemyLevel
   * @param {string} [stationId]
   * @param {string} [catalystId]
   * @returns {{ successRate: number, failureRate: number, explosionRate: number }}
   */
  function getBrewProbabilities(recipeId, alchemyLevel, stationId, catalystId) {
    var recipe = _recipeMap[recipeId];
    if (!recipe) { return { successRate: 0, failureRate: 0, explosionRate: 0 }; }
    var effectiveStation = stationId || recipe.station;
    return _computeOutcomeProbabilities(recipe, alchemyLevel, effectiveStation, catalystId);
  }

  /**
   * Get recipes available at a specific station.
   * @param {string} stationId
   * @returns {Array}
   */
  function getRecipesForStation(stationId) {
    var station = LAB_STATIONS[stationId];
    if (!station) { return []; }
    var result = [];
    for (var i = 0; i < RECIPES.length; i++) {
      var recipe = RECIPES[i];
      var stationOk = false;
      for (var j = 0; j < station.categories.length; j++) {
        if (station.categories[j] === recipe.category) { stationOk = true; break; }
      }
      if (stationOk) { result.push(recipe); }
    }
    return result;
  }

  /**
   * Get all recipes a player can currently brew (has reagents + level).
   * @param {Object} state
   * @param {string} playerId
   * @param {string} [stationId]
   * @returns {Array}
   */
  function getBrewableRecipes(state, playerId, stationId) {
    var player = _getPlayerState(state, playerId);
    if (!player) { return []; }
    var result = [];
    for (var i = 0; i < RECIPES.length; i++) {
      var check = canBrew(state, playerId, RECIPES[i].id, stationId);
      if (check.canBrew) { result.push(RECIPES[i]); }
    }
    return result;
  }

  /**
   * Get missing reagents for a recipe.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} recipeId
   * @returns {Array} [{id, name, needed, have}]
   */
  function getMissingReagents(state, playerId, recipeId) {
    var recipe = _recipeMap[recipeId];
    if (!recipe) { return []; }
    var player = _getPlayerState(state, playerId);
    var missing = [];
    for (var i = 0; i < recipe.reagents.length; i++) {
      var req = recipe.reagents[i];
      var have = player ? _countItem(player, req.id) : 0;
      if (have < req.qty) {
        var rDef = _reagentMap[req.id];
        missing.push({ id: req.id, name: rDef ? rDef.name : req.id, needed: req.qty, have: have });
      }
    }
    return missing;
  }

  /**
   * Get alchemy statistics for a player.
   * @param {Object} state
   * @param {string} playerId
   * @returns {Object}
   */
  function getAlchemyStats(state, playerId) {
    var player = _getPlayerState(state, playerId);
    if (!player) { return null; }
    _ensureAlchemyStats(player);
    return player.alchemyStats;
  }

  /**
   * Direct transmutation by material type (without tincture — requires high alchemy level).
   * Uses the reagent's transmutation rules directly.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} fromItemId
   * @param {number} qty
   * @param {number} [seed]
   * @returns {{ success: boolean, produced: number, toItemId: string|null, reason: string }}
   */
  function directTransmute(state, playerId, fromItemId, qty, seed) {
    var player = _getPlayerState(state, playerId);
    if (!player) {
      return { success: false, produced: 0, toItemId: null, reason: 'Player not found' };
    }

    var rule = _transmutationMap[fromItemId];
    if (!rule) {
      return { success: false, produced: 0, toItemId: null, reason: 'No transmutation rule for: ' + fromItemId };
    }

    // High alchemy level required for direct transmutation (level 8+)
    var alchemyLevel = _getAlchemyLevel(player);
    if (alchemyLevel < 8) {
      return { success: false, produced: 0, toItemId: null, reason: 'Alchemy level 8 required for direct transmutation (current: ' + alchemyLevel + ')' };
    }

    _ensureInventory(player);
    var have = _countItem(player, fromItemId);
    if (have < qty) {
      return { success: false, produced: 0, toItemId: null, reason: 'Need ' + qty + ' of ' + fromItemId + ', have ' + have };
    }

    // Roll for success (80% base for direct transmutation)
    var effectiveSeed = (seed !== undefined && seed !== null) ? seed : Date.now();
    var rng = mulberry32(effectiveSeed);
    var roll = rng();
    var successChance = 0.80 + (alchemyLevel - 8) * 0.02;
    successChance = Math.min(0.98, successChance);

    if (roll >= successChance) {
      // Failure — materials lost
      _removeItems(player, fromItemId, qty);
      _ensureAlchemyStats(player);
      player.alchemyStats.failures = (player.alchemyStats.failures || 0) + 1;
      return { success: false, produced: 0, toItemId: null, reason: 'Direct transmutation failed; materials lost.' };
    }

    // Success
    _removeItems(player, fromItemId, qty);
    var produced = Math.max(1, Math.floor(qty * (1 - rule.lossRate)));
    _addItem(player, { id: rule.to, qty: produced });

    _ensureAlchemyStats(player);
    player.alchemyStats.transmutations = (player.alchemyStats.transmutations || 0) + 1;

    return { success: true, produced: produced, toItemId: rule.to, reason: 'ok' };
  }

  /**
   * Get known discoveries for a player.
   * @param {Object} state
   * @param {string} playerId
   * @returns {Array} discovery ids
   */
  function getDiscoveries(state, playerId) {
    var player = _getPlayerState(state, playerId);
    if (!player) { return []; }
    _ensureAlchemyStats(player);
    return player.alchemyStats.discoveries.slice();
  }

  /**
   * Get all possible discovery combinations (for hinting UI).
   * @returns {Array}
   */
  function getDiscoveryCombinations() {
    return DISCOVERY_COMBINATIONS.slice();
  }

  /**
   * Get catalyst definitions.
   * @returns {Object}
   */
  function getCatalysts() {
    return CATALYSTS;
  }

  /**
   * Get transmutation rules.
   * @returns {Array}
   */
  function getTransmutationRules() {
    return TRANSMUTATION_RULES.slice();
  }

  // ── EXPORTS ───────────────────────────────────────────────────────────────

  exports.REAGENTS = REAGENTS;
  exports.RECIPES = RECIPES;
  exports.QUALITY_TIERS = QUALITY_TIERS;
  exports.QUALITY_TIER_ORDER = QUALITY_TIER_ORDER;
  exports.LAB_STATIONS = LAB_STATIONS;
  exports.CATALYSTS = CATALYSTS;
  exports.TRANSMUTATION_RULES = TRANSMUTATION_RULES;
  exports.DISCOVERY_COMBINATIONS = DISCOVERY_COMBINATIONS;
  exports.ALCHEMY_LEVEL_THRESHOLDS = ALCHEMY_LEVEL_THRESHOLDS;
  exports.BREW_OUTCOMES = BREW_OUTCOMES;

  exports.brew = brew;
  exports.canBrew = canBrew;
  exports.drinkPotion = drinkPotion;
  exports.getActiveBuffs = getActiveBuffs;
  exports.updateBuffs = updateBuffs;
  exports.transmute = transmute;
  exports.directTransmute = directTransmute;
  exports.experiment = experiment;
  exports.getAlchemyLevel = getAlchemyLevel;
  exports.getRecipes = getRecipes;
  exports.getRecipeById = getRecipeById;
  exports.getReagents = getReagents;
  exports.getReagentById = getReagentById;
  exports.getLabStations = getLabStations;
  exports.getRecipesForStation = getRecipesForStation;
  exports.getBrewableRecipes = getBrewableRecipes;
  exports.getBrewProbabilities = getBrewProbabilities;
  exports.getMissingReagents = getMissingReagents;
  exports.getAlchemyStats = getAlchemyStats;
  exports.getDiscoveries = getDiscoveries;
  exports.getDiscoveryCombinations = getDiscoveryCombinations;
  exports.getCatalysts = getCatalysts;
  exports.getTransmutationRules = getTransmutationRules;

  // Internal helpers exposed for testing
  exports._mulberry32 = mulberry32;
  exports._getQualityTier = _getQualityTier;
  exports._scaleBuff = _scaleBuff;
  exports._computeVolatility = _computeVolatility;
  exports._computePotency = _computePotency;
  exports._computeOutcomeProbabilities = _computeOutcomeProbabilities;
  exports._checkDiscovery = _checkDiscovery;

})(typeof module !== 'undefined' ? module.exports : (window.AlchemyLab = {}));
