/**
 * ZION Crafting System
 * Handles recipes, material combination, quality rolls, and the `craft` protocol message.
 * Constitution reference: Article III — the craft action is a core protocol message type.
 */

(function(exports) {
  'use strict';

  // ---------------------------------------------------------------------------
  // Optional dependency guards (modules loaded before this in bundle order)
  // ---------------------------------------------------------------------------
  var _Progression = (typeof Progression !== 'undefined') ? Progression : null;
  var _Inventory   = (typeof Inventory   !== 'undefined') ? Inventory   : null;

  // ---------------------------------------------------------------------------
  // QUALITY TIERS
  // ---------------------------------------------------------------------------

  var QUALITY_TIERS = {
    poor:       { min: 0.0,  max: 0.3,  label: 'Poor',       color: '#9e9e9e' },
    common:     { min: 0.3,  max: 0.6,  label: 'Common',     color: '#ffffff' },
    fine:       { min: 0.6,  max: 0.8,  label: 'Fine',       color: '#4caf50' },
    superior:   { min: 0.8,  max: 0.95, label: 'Superior',   color: '#2196f3' },
    masterwork: { min: 0.95, max: 1.0,  label: 'Masterwork', color: '#9c27b0' }
  };

  // Ordered list for iteration (ascending quality)
  var QUALITY_TIER_ORDER = ['poor', 'common', 'fine', 'superior', 'masterwork'];

  // ---------------------------------------------------------------------------
  // MATERIALS — raw material definitions
  // ---------------------------------------------------------------------------

  var MATERIALS = {
    iron_ore:     { id: 'iron_ore',     name: 'Iron Ore',       type: 'ore',     rarity: 'common'   },
    copper_ore:   { id: 'copper_ore',   name: 'Copper Ore',     type: 'ore',     rarity: 'common'   },
    gold_ore:     { id: 'gold_ore',     name: 'Gold Ore',       type: 'ore',     rarity: 'uncommon' },
    wood:         { id: 'wood',         name: 'Wood',           type: 'wood',    rarity: 'common'   },
    stone:        { id: 'stone',        name: 'Stone',          type: 'stone',   rarity: 'common'   },
    clay:         { id: 'clay',         name: 'Clay',           type: 'mineral', rarity: 'common'   },
    leather:      { id: 'leather',      name: 'Leather',        type: 'organic', rarity: 'common'   },
    fabric:       { id: 'fabric',       name: 'Fabric',         type: 'textile', rarity: 'common'   },
    herbs:        { id: 'herbs',        name: 'Herbs',          type: 'organic', rarity: 'common'   },
    crystal:      { id: 'crystal',      name: 'Crystal',        type: 'gem',     rarity: 'rare'     },
    bone:         { id: 'bone',         name: 'Bone',           type: 'organic', rarity: 'uncommon' },
    feather:      { id: 'feather',      name: 'Feather',        type: 'organic', rarity: 'common'   },
    shell:        { id: 'shell',        name: 'Shell',          type: 'organic', rarity: 'uncommon' },
    sand:         { id: 'sand',         name: 'Sand',           type: 'mineral', rarity: 'common'   },
    glass:        { id: 'glass',        name: 'Glass',          type: 'refined', rarity: 'uncommon' },
    dye_red:      { id: 'dye_red',      name: 'Red Dye',        type: 'dye',     rarity: 'common'   },
    dye_blue:     { id: 'dye_blue',     name: 'Blue Dye',       type: 'dye',     rarity: 'common'   },
    dye_green:    { id: 'dye_green',    name: 'Green Dye',      type: 'dye',     rarity: 'common'   },
    gem_ruby:     { id: 'gem_ruby',     name: 'Ruby',           type: 'gem',     rarity: 'rare'     },
    gem_sapphire: { id: 'gem_sapphire', name: 'Sapphire',       type: 'gem',     rarity: 'rare'     },
    coal:         { id: 'coal',         name: 'Coal',           type: 'mineral', rarity: 'common'   },
    fiber:        { id: 'fiber',        name: 'Plant Fiber',    type: 'organic', rarity: 'common'   }
  };

  // ---------------------------------------------------------------------------
  // RECIPES — 30+ crafting recipes across 8 categories
  // ---------------------------------------------------------------------------

  var RECIPES = [
    // ---- TOOLS (6 recipes) --------------------------------------------------
    {
      id: 'stone_pickaxe',
      name: 'Stone Pickaxe',
      category: 'tools',
      materials: [{ itemId: 'stone', qty: 3 }, { itemId: 'wood', qty: 2 }],
      output: { itemId: 'stone_pickaxe', qty: 1 },
      skillRequired: 'crafting',
      levelRequired: 1,
      xpReward: 8,
      craftTime: 3000,
      zone: null,
      quality: { min: 0.4, max: 1.2 }
    },
    {
      id: 'iron_pickaxe',
      name: 'Iron Pickaxe',
      category: 'tools',
      materials: [{ itemId: 'iron_ore', qty: 3 }, { itemId: 'wood', qty: 2 }],
      output: { itemId: 'iron_pickaxe', qty: 1 },
      skillRequired: 'crafting',
      levelRequired: 3,
      xpReward: 18,
      craftTime: 5000,
      zone: null,
      quality: { min: 0.5, max: 1.4 }
    },
    {
      id: 'copper_axe',
      name: 'Copper Axe',
      category: 'tools',
      materials: [{ itemId: 'copper_ore', qty: 3 }, { itemId: 'wood', qty: 2 }],
      output: { itemId: 'copper_axe', qty: 1 },
      skillRequired: 'crafting',
      levelRequired: 2,
      xpReward: 12,
      craftTime: 4000,
      zone: null,
      quality: { min: 0.45, max: 1.3 }
    },
    {
      id: 'iron_shovel',
      name: 'Iron Shovel',
      category: 'tools',
      materials: [{ itemId: 'iron_ore', qty: 2 }, { itemId: 'wood', qty: 2 }],
      output: { itemId: 'iron_shovel', qty: 1 },
      skillRequired: 'crafting',
      levelRequired: 2,
      xpReward: 10,
      craftTime: 4000,
      zone: null,
      quality: { min: 0.45, max: 1.3 }
    },
    {
      id: 'iron_hammer',
      name: 'Iron Hammer',
      category: 'tools',
      materials: [{ itemId: 'iron_ore', qty: 4 }, { itemId: 'wood', qty: 1 }],
      output: { itemId: 'iron_hammer', qty: 1 },
      skillRequired: 'crafting',
      levelRequired: 3,
      xpReward: 14,
      craftTime: 5000,
      zone: null,
      quality: { min: 0.5, max: 1.4 }
    },
    {
      id: 'gold_chisel',
      name: 'Gold Chisel',
      category: 'tools',
      materials: [{ itemId: 'gold_ore', qty: 2 }, { itemId: 'wood', qty: 1 }],
      output: { itemId: 'gold_chisel', qty: 1 },
      skillRequired: 'crafting',
      levelRequired: 5,
      xpReward: 25,
      craftTime: 7000,
      zone: 'studio',
      quality: { min: 0.6, max: 1.5 }
    },

    // ---- WEAPONS (5 recipes) ------------------------------------------------
    {
      id: 'wooden_staff',
      name: 'Wooden Staff',
      category: 'weapons',
      materials: [{ itemId: 'wood', qty: 3 }],
      output: { itemId: 'wooden_staff', qty: 1 },
      skillRequired: 'crafting',
      levelRequired: 1,
      xpReward: 8,
      craftTime: 3000,
      zone: 'arena',
      quality: { min: 0.3, max: 1.1 }
    },
    {
      id: 'iron_sword',
      name: 'Iron Sword',
      category: 'weapons',
      materials: [{ itemId: 'iron_ore', qty: 3 }, { itemId: 'wood', qty: 1 }],
      output: { itemId: 'iron_sword', qty: 1 },
      skillRequired: 'crafting',
      levelRequired: 2,
      xpReward: 15,
      craftTime: 5000,
      zone: 'arena',
      quality: { min: 0.5, max: 1.5 }
    },
    {
      id: 'copper_dagger',
      name: 'Copper Dagger',
      category: 'weapons',
      materials: [{ itemId: 'copper_ore', qty: 2 }, { itemId: 'leather', qty: 1 }],
      output: { itemId: 'copper_dagger', qty: 1 },
      skillRequired: 'crafting',
      levelRequired: 1,
      xpReward: 10,
      craftTime: 3500,
      zone: 'arena',
      quality: { min: 0.4, max: 1.3 }
    },
    {
      id: 'bone_spear',
      name: 'Bone Spear',
      category: 'weapons',
      materials: [{ itemId: 'bone', qty: 3 }, { itemId: 'wood', qty: 2 }],
      output: { itemId: 'bone_spear', qty: 1 },
      skillRequired: 'crafting',
      levelRequired: 2,
      xpReward: 12,
      craftTime: 4500,
      zone: null,
      quality: { min: 0.4, max: 1.2 }
    },
    {
      id: 'crystal_wand',
      name: 'Crystal Wand',
      category: 'weapons',
      materials: [{ itemId: 'crystal', qty: 2 }, { itemId: 'wood', qty: 1 }, { itemId: 'gold_ore', qty: 1 }],
      output: { itemId: 'crystal_wand', qty: 1 },
      skillRequired: 'crafting',
      levelRequired: 6,
      xpReward: 35,
      craftTime: 8000,
      zone: 'athenaeum',
      quality: { min: 0.65, max: 1.5 }
    },

    // ---- ARMOR (4 recipes) --------------------------------------------------
    {
      id: 'leather_vest',
      name: 'Leather Vest',
      category: 'armor',
      materials: [{ itemId: 'leather', qty: 4 }, { itemId: 'fabric', qty: 2 }],
      output: { itemId: 'leather_vest', qty: 1 },
      skillRequired: 'crafting',
      levelRequired: 2,
      xpReward: 14,
      craftTime: 5000,
      zone: null,
      quality: { min: 0.45, max: 1.3 }
    },
    {
      id: 'iron_chestplate',
      name: 'Iron Chestplate',
      category: 'armor',
      materials: [{ itemId: 'iron_ore', qty: 5 }, { itemId: 'leather', qty: 2 }],
      output: { itemId: 'iron_chestplate', qty: 1 },
      skillRequired: 'crafting',
      levelRequired: 4,
      xpReward: 22,
      craftTime: 7000,
      zone: null,
      quality: { min: 0.5, max: 1.45 }
    },
    {
      id: 'fabric_robe',
      name: 'Fabric Robe',
      category: 'armor',
      materials: [{ itemId: 'fabric', qty: 5 }, { itemId: 'dye_blue', qty: 1 }],
      output: { itemId: 'fabric_robe', qty: 1 },
      skillRequired: 'crafting',
      levelRequired: 2,
      xpReward: 12,
      craftTime: 4000,
      zone: 'studio',
      quality: { min: 0.4, max: 1.3 }
    },
    {
      id: 'shell_shield',
      name: 'Shell Shield',
      category: 'armor',
      materials: [{ itemId: 'shell', qty: 4 }, { itemId: 'wood', qty: 2 }, { itemId: 'leather', qty: 1 }],
      output: { itemId: 'shell_shield', qty: 1 },
      skillRequired: 'crafting',
      levelRequired: 3,
      xpReward: 18,
      craftTime: 6000,
      zone: null,
      quality: { min: 0.5, max: 1.4 }
    },

    // ---- FURNITURE (4 recipes) ----------------------------------------------
    {
      id: 'wooden_table',
      name: 'Wooden Table',
      category: 'furniture',
      materials: [{ itemId: 'wood', qty: 5 }, { itemId: 'stone', qty: 2 }],
      output: { itemId: 'wooden_table', qty: 1 },
      skillRequired: 'crafting',
      levelRequired: 1,
      xpReward: 10,
      craftTime: 4000,
      zone: null,
      quality: { min: 0.35, max: 1.2 }
    },
    {
      id: 'stone_bench',
      name: 'Stone Bench',
      category: 'furniture',
      materials: [{ itemId: 'stone', qty: 6 }],
      output: { itemId: 'stone_bench', qty: 1 },
      skillRequired: 'crafting',
      levelRequired: 1,
      xpReward: 8,
      craftTime: 4000,
      zone: null,
      quality: { min: 0.35, max: 1.1 }
    },
    {
      id: 'clay_pot',
      name: 'Clay Pot',
      category: 'furniture',
      materials: [{ itemId: 'clay', qty: 3 }],
      output: { itemId: 'clay_pot', qty: 1 },
      skillRequired: 'crafting',
      levelRequired: 1,
      xpReward: 6,
      craftTime: 2500,
      zone: 'studio',
      quality: { min: 0.3, max: 1.1 }
    },
    {
      id: 'crystal_lamp',
      name: 'Crystal Lamp',
      category: 'furniture',
      materials: [{ itemId: 'crystal', qty: 1 }, { itemId: 'gold_ore', qty: 1 }, { itemId: 'glass', qty: 2 }],
      output: { itemId: 'crystal_lamp', qty: 1 },
      skillRequired: 'crafting',
      levelRequired: 5,
      xpReward: 30,
      craftTime: 7000,
      zone: null,
      quality: { min: 0.6, max: 1.5 }
    },

    // ---- POTIONS (4 recipes) ------------------------------------------------
    {
      id: 'healing_potion',
      name: 'Healing Potion',
      category: 'potions',
      materials: [{ itemId: 'herbs', qty: 3 }, { itemId: 'glass', qty: 1 }],
      output: { itemId: 'healing_potion', qty: 1 },
      skillRequired: 'crafting',
      levelRequired: 1,
      xpReward: 8,
      craftTime: 3000,
      zone: 'gardens',
      quality: { min: 0.4, max: 1.3 }
    },
    {
      id: 'energy_potion',
      name: 'Energy Potion',
      category: 'potions',
      materials: [{ itemId: 'herbs', qty: 2 }, { itemId: 'crystal', qty: 1 }, { itemId: 'glass', qty: 1 }],
      output: { itemId: 'energy_potion', qty: 1 },
      skillRequired: 'crafting',
      levelRequired: 3,
      xpReward: 18,
      craftTime: 5000,
      zone: null,
      quality: { min: 0.5, max: 1.4 }
    },
    {
      id: 'wisdom_potion',
      name: 'Wisdom Potion',
      category: 'potions',
      materials: [{ itemId: 'herbs', qty: 4 }, { itemId: 'gem_sapphire', qty: 1 }, { itemId: 'glass', qty: 1 }],
      output: { itemId: 'wisdom_potion', qty: 1 },
      skillRequired: 'crafting',
      levelRequired: 5,
      xpReward: 28,
      craftTime: 7000,
      zone: 'athenaeum',
      quality: { min: 0.6, max: 1.5 }
    },
    {
      id: 'strength_brew',
      name: 'Strength Brew',
      category: 'potions',
      materials: [{ itemId: 'herbs', qty: 2 }, { itemId: 'bone', qty: 1 }, { itemId: 'glass', qty: 1 }],
      output: { itemId: 'strength_brew', qty: 1 },
      skillRequired: 'crafting',
      levelRequired: 2,
      xpReward: 12,
      craftTime: 4000,
      zone: null,
      quality: { min: 0.45, max: 1.3 }
    },

    // ---- FOOD_PREP (4 recipes) ----------------------------------------------
    {
      id: 'herb_bread',
      name: 'Herb Bread',
      category: 'food_prep',
      materials: [{ itemId: 'fiber', qty: 3 }, { itemId: 'herbs', qty: 2 }],
      output: { itemId: 'herb_bread', qty: 2 },
      skillRequired: 'crafting',
      levelRequired: 1,
      xpReward: 6,
      craftTime: 2500,
      zone: null,
      quality: { min: 0.3, max: 1.1 }
    },
    {
      id: 'roasted_grain',
      name: 'Roasted Grain',
      category: 'food_prep',
      materials: [{ itemId: 'fiber', qty: 4 }, { itemId: 'coal', qty: 1 }],
      output: { itemId: 'roasted_grain', qty: 3 },
      skillRequired: 'crafting',
      levelRequired: 1,
      xpReward: 5,
      craftTime: 2000,
      zone: null,
      quality: { min: 0.3, max: 1.0 }
    },
    {
      id: 'crystal_tea',
      name: 'Crystal Tea',
      category: 'food_prep',
      materials: [{ itemId: 'herbs', qty: 3 }, { itemId: 'crystal', qty: 1 }, { itemId: 'glass', qty: 1 }],
      output: { itemId: 'crystal_tea', qty: 1 },
      skillRequired: 'crafting',
      levelRequired: 4,
      xpReward: 20,
      craftTime: 5000,
      zone: 'gardens',
      quality: { min: 0.55, max: 1.45 }
    },
    {
      id: 'gem_candy',
      name: 'Gem Candy',
      category: 'food_prep',
      materials: [{ itemId: 'gem_ruby', qty: 1 }, { itemId: 'herbs', qty: 2 }, { itemId: 'sand', qty: 1 }],
      output: { itemId: 'gem_candy', qty: 2 },
      skillRequired: 'crafting',
      levelRequired: 3,
      xpReward: 16,
      craftTime: 4500,
      zone: null,
      quality: { min: 0.5, max: 1.4 }
    },

    // ---- DECORATIONS (4 recipes) --------------------------------------------
    {
      id: 'feather_banner',
      name: 'Feather Banner',
      category: 'decorations',
      materials: [{ itemId: 'feather', qty: 5 }, { itemId: 'wood', qty: 2 }, { itemId: 'dye_red', qty: 1 }],
      output: { itemId: 'feather_banner', qty: 1 },
      skillRequired: 'crafting',
      levelRequired: 2,
      xpReward: 12,
      craftTime: 4000,
      zone: 'studio',
      quality: { min: 0.4, max: 1.3 }
    },
    {
      id: 'shell_mosaic',
      name: 'Shell Mosaic',
      category: 'decorations',
      materials: [{ itemId: 'shell', qty: 6 }, { itemId: 'clay', qty: 2 }],
      output: { itemId: 'shell_mosaic', qty: 1 },
      skillRequired: 'crafting',
      levelRequired: 2,
      xpReward: 14,
      craftTime: 5000,
      zone: 'studio',
      quality: { min: 0.45, max: 1.35 }
    },
    {
      id: 'gem_mosaic',
      name: 'Gem Mosaic',
      category: 'decorations',
      materials: [{ itemId: 'gem_ruby', qty: 1 }, { itemId: 'gem_sapphire', qty: 1 }, { itemId: 'clay', qty: 3 }],
      output: { itemId: 'gem_mosaic', qty: 1 },
      skillRequired: 'crafting',
      levelRequired: 5,
      xpReward: 30,
      craftTime: 8000,
      zone: 'studio',
      quality: { min: 0.65, max: 1.5 }
    },
    {
      id: 'sand_sculpture',
      name: 'Sand Sculpture',
      category: 'decorations',
      materials: [{ itemId: 'sand', qty: 8 }, { itemId: 'glass', qty: 1 }],
      output: { itemId: 'sand_sculpture', qty: 1 },
      skillRequired: 'crafting',
      levelRequired: 3,
      xpReward: 16,
      craftTime: 5500,
      zone: null,
      quality: { min: 0.5, max: 1.4 }
    },

    // ---- INSTRUMENTS (4 recipes) --------------------------------------------
    {
      id: 'bone_flute',
      name: 'Bone Flute',
      category: 'instruments',
      materials: [{ itemId: 'bone', qty: 2 }, { itemId: 'leather', qty: 1 }],
      output: { itemId: 'bone_flute', qty: 1 },
      skillRequired: 'crafting',
      levelRequired: 2,
      xpReward: 14,
      craftTime: 5000,
      zone: 'studio',
      quality: { min: 0.4, max: 1.3 }
    },
    {
      id: 'wood_drum',
      name: 'Wood Drum',
      category: 'instruments',
      materials: [{ itemId: 'wood', qty: 4 }, { itemId: 'leather', qty: 2 }],
      output: { itemId: 'wood_drum', qty: 1 },
      skillRequired: 'crafting',
      levelRequired: 2,
      xpReward: 15,
      craftTime: 5000,
      zone: 'studio',
      quality: { min: 0.4, max: 1.3 }
    },
    {
      id: 'crystal_harp',
      name: 'Crystal Harp',
      category: 'instruments',
      materials: [{ itemId: 'crystal', qty: 3 }, { itemId: 'gold_ore', qty: 1 }, { itemId: 'wood', qty: 2 }],
      output: { itemId: 'crystal_harp', qty: 1 },
      skillRequired: 'crafting',
      levelRequired: 7,
      xpReward: 40,
      craftTime: 10000,
      zone: 'studio',
      quality: { min: 0.7, max: 1.5 }
    },
    {
      id: 'copper_bell',
      name: 'Copper Bell',
      category: 'instruments',
      materials: [{ itemId: 'copper_ore', qty: 3 }, { itemId: 'leather', qty: 1 }],
      output: { itemId: 'copper_bell', qty: 1 },
      skillRequired: 'crafting',
      levelRequired: 3,
      xpReward: 18,
      craftTime: 6000,
      zone: 'studio',
      quality: { min: 0.5, max: 1.4 }
    }
  ];

  // ---------------------------------------------------------------------------
  // SEEDED PRNG — mulberry32
  // ---------------------------------------------------------------------------

  function mulberry32(seed) {
    return function() {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // ---------------------------------------------------------------------------
  // INTERNAL HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Build a lookup map from the RECIPES array: recipeId -> recipe object.
   * @returns {Object}
   */
  function _buildRecipeMap() {
    var map = {};
    for (var i = 0; i < RECIPES.length; i++) {
      map[RECIPES[i].id] = RECIPES[i];
    }
    return map;
  }

  var _RECIPE_MAP = _buildRecipeMap();

  /**
   * Get the quantity of an item in a player's inventory.
   * Inventory state is expected at state.players[playerId].inventory.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} itemId
   * @returns {number}
   */
  function _getItemCount(state, playerId, itemId) {
    if (!state || !state.players || !state.players[playerId]) return 0;
    var inv = state.players[playerId].inventory;
    if (!inv) return 0;
    // Support both array-of-slots and flat object formats
    if (Array.isArray(inv)) {
      var total = 0;
      for (var i = 0; i < inv.length; i++) {
        if (inv[i] && inv[i].itemId === itemId) {
          var slotCount = inv[i].qty !== undefined ? inv[i].qty
                        : inv[i].quantity !== undefined ? inv[i].quantity
                        : 1;
          total += slotCount;
        }
      }
      return total;
    }
    // Object map format: { itemId: qty }
    return inv[itemId] || 0;
  }

  /**
   * Remove a quantity of an item from the player's inventory (mutates state).
   * @param {Object} state
   * @param {string} playerId
   * @param {string} itemId
   * @param {number} qty
   */
  function _removeItem(state, playerId, itemId, qty) {
    var inv = state.players[playerId].inventory;
    if (Array.isArray(inv)) {
      var remaining = qty;
      for (var i = 0; i < inv.length && remaining > 0; i++) {
        if (inv[i] && inv[i].itemId === itemId) {
          var slotQty = inv[i].qty || inv[i].quantity || 1;
          if (slotQty <= remaining) {
            remaining -= slotQty;
            inv[i] = null;
          } else {
            if (inv[i].qty !== undefined) inv[i].qty -= remaining;
            else if (inv[i].quantity !== undefined) inv[i].quantity -= remaining;
            remaining = 0;
          }
        }
      }
      // Compact nulls
      state.players[playerId].inventory = inv.filter(function(s) { return s !== null; });
    } else {
      inv[itemId] = (inv[itemId] || 0) - qty;
      if (inv[itemId] <= 0) delete inv[itemId];
    }
  }

  /**
   * Add an item to the player's inventory (mutates state).
   * @param {Object} state
   * @param {string} playerId
   * @param {string} itemId
   * @param {number} qty
   * @param {Object} [meta]  extra fields (quality, qualityTier, craftedAt, etc.)
   */
  function _addItem(state, playerId, itemId, qty, meta) {
    var inv = state.players[playerId].inventory;
    if (Array.isArray(inv)) {
      var slot = { itemId: itemId, qty: qty };
      if (meta) {
        slot.quality     = meta.quality;
        slot.qualityTier = meta.qualityTier;
        slot.craftedAt   = meta.craftedAt;
        slot.craftedBy   = meta.craftedBy;
      }
      inv.push(slot);
    } else {
      // Object format does not store per-item quality metadata but still adds qty
      inv[itemId] = (inv[itemId] || 0) + qty;
    }
  }

  /**
   * Get the player's crafting skill level (0-5) using Progression if available.
   * @param {Object} state
   * @param {string} playerId
   * @returns {number}
   */
  function _getCraftingSkillLevel(state, playerId) {
    if (_Progression && state.progressions && state.progressions[playerId]) {
      return _Progression.getSkillTier(state.progressions[playerId], 'crafting');
    }
    // Fallback: read from state.players[playerId].craftingLevel
    if (state.players && state.players[playerId]) {
      return state.players[playerId].craftingLevel || 0;
    }
    return 0;
  }

  /**
   * Get player's general level for recipe level-gating.
   * @param {Object} state
   * @param {string} playerId
   * @returns {number}
   */
  function _getPlayerLevel(state, playerId) {
    if (_Progression && state.progressions && state.progressions[playerId]) {
      return _Progression.getLevel(state.progressions[playerId].totalXP || 0);
    }
    if (state.players && state.players[playerId]) {
      return state.players[playerId].level || 1;
    }
    return 1;
  }

  /**
   * Award XP to a player after crafting.
   * @param {Object} state
   * @param {string} playerId
   * @param {number} xpAmount
   * @returns {number} xp actually awarded
   */
  function _awardXP(state, playerId, xpAmount) {
    if (_Progression && state.progressions && state.progressions[playerId]) {
      var result = _Progression.awardXP(state.progressions[playerId], 'crafting', xpAmount);
      state.progressions[playerId] = result.state;
      return xpAmount;
    }
    // Fallback: store raw XP in state.players[playerId].xp
    if (state.players && state.players[playerId]) {
      state.players[playerId].xp = (state.players[playerId].xp || 0) + xpAmount;
    }
    return xpAmount;
  }

  /**
   * Check whether a player has a named perk (crafting tree).
   * @param {Object} state
   * @param {string} playerId
   * @param {string} perkId
   * @returns {boolean}
   */
  function _hasPerk(state, playerId, perkId) {
    if (_Progression && state.progressions && state.progressions[playerId]) {
      return _Progression.hasPerks(state.progressions[playerId], perkId);
    }
    var p = state.players && state.players[playerId];
    return !!(p && p.perks && p.perks.indexOf(perkId) !== -1);
  }

  /**
   * Get player zone.
   * @param {Object} state
   * @param {string} playerId
   * @returns {string|null}
   */
  function _getPlayerZone(state, playerId) {
    if (!state.players || !state.players[playerId]) return null;
    return state.players[playerId].zone || null;
  }

  // ---------------------------------------------------------------------------
  // PUBLIC API
  // ---------------------------------------------------------------------------

  /**
   * Get all recipe objects, optionally filtered by category.
   * @param {string} [category]
   * @returns {Array}
   */
  function getRecipes(category) {
    if (!category) return RECIPES.slice();
    var result = [];
    for (var i = 0; i < RECIPES.length; i++) {
      if (RECIPES[i].category === category) result.push(RECIPES[i]);
    }
    return result;
  }

  /**
   * Get a single recipe by id.
   * @param {string} recipeId
   * @returns {Object|null}
   */
  function getRecipeById(recipeId) {
    return _RECIPE_MAP[recipeId] || null;
  }

  /**
   * Get all unique recipe categories.
   * @returns {string[]}
   */
  function getCategories() {
    var seen = {};
    var cats = [];
    for (var i = 0; i < RECIPES.length; i++) {
      var cat = RECIPES[i].category;
      if (!seen[cat]) { seen[cat] = true; cats.push(cat); }
    }
    return cats;
  }

  /**
   * Get the quality tier name for a numeric quality value.
   * @param {number} value  0.0–1.0+
   * @returns {string}  one of QUALITY_TIER_ORDER
   */
  function getQualityTier(value) {
    // Clamp masterwork check: anything >= 0.95 is masterwork
    for (var i = QUALITY_TIER_ORDER.length - 1; i >= 0; i--) {
      var key = QUALITY_TIER_ORDER[i];
      if (value >= QUALITY_TIERS[key].min) return key;
    }
    return 'poor';
  }

  /**
   * Get materials needed for a recipe.
   * @param {string} recipeId
   * @returns {Array} [{itemId, qty, name}]
   */
  function getMaterialsNeeded(recipeId) {
    var recipe = _RECIPE_MAP[recipeId];
    if (!recipe) return [];
    return recipe.materials.map(function(m) {
      var mat = MATERIALS[m.itemId];
      return {
        itemId: m.itemId,
        qty: m.qty,
        name: mat ? mat.name : m.itemId
      };
    });
  }

  /**
   * Get materials the player is missing for a recipe.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} recipeId
   * @returns {Array} [{itemId, qty, name, have, need}]
   */
  function getMissingMaterials(state, playerId, recipeId) {
    var recipe = _RECIPE_MAP[recipeId];
    if (!recipe) return [];
    var missing = [];
    for (var i = 0; i < recipe.materials.length; i++) {
      var m = recipe.materials[i];
      var have = _getItemCount(state, playerId, m.itemId);
      if (have < m.qty) {
        var mat = MATERIALS[m.itemId];
        missing.push({
          itemId: m.itemId,
          need: m.qty,
          have: have,
          name: mat ? mat.name : m.itemId
        });
      }
    }
    return missing;
  }

  /**
   * Check if a player can craft a given recipe.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} recipeId
   * @returns {{ canCraft: boolean, reason: string }}
   */
  function canCraft(state, playerId, recipeId) {
    var recipe = _RECIPE_MAP[recipeId];
    if (!recipe) {
      return { canCraft: false, reason: 'Recipe not found: ' + recipeId };
    }

    // Zone requirement
    if (recipe.zone !== null) {
      var playerZone = _getPlayerZone(state, playerId);
      if (playerZone !== recipe.zone) {
        return {
          canCraft: false,
          reason: 'Must be in zone "' + recipe.zone + '" to craft ' + recipe.name
        };
      }
    }

    // Level requirement
    var playerLevel = _getPlayerLevel(state, playerId);
    if (playerLevel < recipe.levelRequired) {
      return {
        canCraft: false,
        reason: 'Level ' + recipe.levelRequired + ' required (you are level ' + playerLevel + ')'
      };
    }

    // Material check
    for (var i = 0; i < recipe.materials.length; i++) {
      var m = recipe.materials[i];
      var have = _getItemCount(state, playerId, m.itemId);
      if (have < m.qty) {
        var mat = MATERIALS[m.itemId];
        var matName = mat ? mat.name : m.itemId;
        return {
          canCraft: false,
          reason: 'Missing material: ' + matName + ' (need ' + m.qty + ', have ' + have + ')'
        };
      }
    }

    return { canCraft: true, reason: 'OK' };
  }

  /**
   * Get skill bonus to quality range based on crafting skill tier.
   * Tier 0 → +0, Tier 1 → +0.02, ..., Tier 5 → +0.10
   * @param {Object} state
   * @param {string} playerId
   * @returns {number}  additive bonus to quality roll
   */
  function getSkillBonus(state, playerId) {
    var tier = _getCraftingSkillLevel(state, playerId);
    return tier * 0.02;
  }

  /**
   * Execute a crafting action.
   * @param {Object} state     — world state (mutated in place)
   * @param {string} playerId
   * @param {string} recipeId
   * @param {number} [seed]   — PRNG seed for deterministic quality roll
   * @returns {{ success: boolean, item?: Object, materialsUsed?: Array, xpAwarded?: number, reason?: string }}
   */
  function craft(state, playerId, recipeId, seed) {
    var check = canCraft(state, playerId, recipeId);
    if (!check.canCraft) {
      return { success: false, reason: check.reason };
    }

    var recipe = _RECIPE_MAP[recipeId];

    // Ensure player exists in state
    if (!state.players[playerId]) {
      return { success: false, reason: 'Player not found: ' + playerId };
    }

    // Remove materials
    var materialsUsed = [];
    for (var i = 0; i < recipe.materials.length; i++) {
      var m = recipe.materials[i];
      _removeItem(state, playerId, m.itemId, m.qty);
      materialsUsed.push({ itemId: m.itemId, qty: m.qty });
    }

    // Roll quality
    var prng = mulberry32(seed !== undefined ? seed : Date.now());
    var roll = prng();
    var qMin = recipe.quality.min;
    var qMax = recipe.quality.max;

    // Skill bonus widens effective max
    var skillBonus = getSkillBonus(state, playerId);
    qMax = Math.min(qMax + skillBonus, 1.5);

    // craft_quality perk: +10% to quality roll
    if (_hasPerk(state, playerId, 'craft_quality')) {
      roll = Math.min(roll + 0.10, 1.0);
    }

    // masterwork_chance perk: 10% chance to guarantee masterwork floor
    if (_hasPerk(state, playerId, 'masterwork_chance') && prng() < 0.10) {
      roll = Math.max(roll, 0.95);
    }

    var rawQuality = qMin + roll * (qMax - qMin);
    // Normalize quality to 0.0–1.0 for tier lookup
    var normalizedQuality = Math.max(0, Math.min(rawQuality, 1.0));
    var tierName = getQualityTier(normalizedQuality);
    var tierInfo = QUALITY_TIERS[tierName];

    var craftedItem = {
      id:          recipe.output.itemId,
      name:        recipe.name + ' (' + tierInfo.label + ')',
      quality:     normalizedQuality,
      qualityTier: tierName,
      craftedAt:   Date.now(),
      craftedBy:   playerId,
      qty:         recipe.output.qty
    };

    // Add to inventory
    _addItem(state, playerId, recipe.output.itemId, recipe.output.qty, craftedItem);

    // Record crafting history
    if (!state.players[playerId].craftingHistory) {
      state.players[playerId].craftingHistory = [];
    }
    state.players[playerId].craftingHistory.push({
      recipeId:    recipeId,
      itemId:      recipe.output.itemId,
      quality:     normalizedQuality,
      qualityTier: tierName,
      timestamp:   Date.now()
    });

    // Award XP
    var xpAwarded = _awardXP(state, playerId, recipe.xpReward);

    return {
      success:       true,
      item:          craftedItem,
      materialsUsed: materialsUsed,
      xpAwarded:     xpAwarded
    };
  }

  /**
   * Get recipes the player can currently craft (has materials + meets level).
   * @param {Object} state
   * @param {string} playerId
   * @returns {Array} of recipe objects
   */
  function getCraftableRecipes(state, playerId) {
    var result = [];
    for (var i = 0; i < RECIPES.length; i++) {
      var check = canCraft(state, playerId, RECIPES[i].id);
      if (check.canCraft) result.push(RECIPES[i]);
    }
    return result;
  }

  /**
   * Get the crafting history for a player.
   * @param {Object} state
   * @param {string} playerId
   * @returns {Array}
   */
  function getCraftingHistory(state, playerId) {
    if (!state.players || !state.players[playerId]) return [];
    return state.players[playerId].craftingHistory || [];
  }

  /**
   * Salvage a crafted item: remove one from inventory, return ~50% of materials.
   * Identifies item by itemId; removes the first matching slot.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} itemId
   * @returns {{ success: boolean, recovered?: Array, reason?: string }}
   */
  function salvage(state, playerId, itemId) {
    if (!state.players || !state.players[playerId]) {
      return { success: false, reason: 'Player not found: ' + playerId };
    }

    // Find the recipe that produces this item
    var recipe = null;
    for (var i = 0; i < RECIPES.length; i++) {
      if (RECIPES[i].output.itemId === itemId) {
        recipe = RECIPES[i];
        break;
      }
    }
    if (!recipe) {
      return { success: false, reason: 'No recipe found for item: ' + itemId };
    }

    // Verify player has the item
    var have = _getItemCount(state, playerId, itemId);
    if (have < 1) {
      return { success: false, reason: 'Player does not have item: ' + itemId };
    }

    // Remove 1 of the item
    _removeItem(state, playerId, itemId, 1);

    // Return ~50% of each material (round down, minimum 1 if original >= 2)
    var recovered = [];
    for (var j = 0; j < recipe.materials.length; j++) {
      var m = recipe.materials[j];
      var returnQty = Math.max(1, Math.floor(m.qty * 0.5));
      _addItem(state, playerId, m.itemId, returnQty);
      recovered.push({ itemId: m.itemId, qty: returnQty });
    }

    return { success: true, recovered: recovered };
  }

  /**
   * Craft multiple copies of the same recipe.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} recipeId
   * @param {number} count
   * @param {number} [seed]
   * @returns {Array} array of individual craft results
   */
  function batchCraft(state, playerId, recipeId, count, seed) {
    var results = [];
    var prng = mulberry32(seed !== undefined ? seed : Date.now());
    for (var i = 0; i < count; i++) {
      // Use successive outputs from the shared prng as per-item seeds
      var itemSeed = Math.floor(prng() * 0x7fffffff);
      var result = craft(state, playerId, recipeId, itemSeed);
      results.push(result);
      if (!result.success) break; // stop if we run out of materials
    }
    return results;
  }

  /**
   * Process a `craft` protocol message.
   * Message payload: { recipeId: string, seed?: number }
   * @param {Object} state
   * @param {Object} message   — protocol message { from, payload }
   * @returns {Object}  craft result
   */
  function applyMessage(state, message) {
    if (!message || message.type !== 'craft') {
      return { success: false, reason: 'Not a craft message' };
    }
    var payload = message.payload || {};
    return craft(state, message.from, payload.recipeId, payload.seed);
  }

  // ---------------------------------------------------------------------------
  // EXPORTS
  // ---------------------------------------------------------------------------

  exports.RECIPES       = RECIPES;
  exports.MATERIALS     = MATERIALS;
  exports.QUALITY_TIERS = QUALITY_TIERS;

  exports.getRecipes           = getRecipes;
  exports.getRecipeById        = getRecipeById;
  exports.getCategories        = getCategories;
  exports.getQualityTier       = getQualityTier;
  exports.getMaterialsNeeded   = getMaterialsNeeded;
  exports.getMissingMaterials  = getMissingMaterials;
  exports.canCraft             = canCraft;
  exports.craft                = craft;
  exports.getCraftableRecipes  = getCraftableRecipes;
  exports.getCraftingHistory   = getCraftingHistory;
  exports.salvage              = salvage;
  exports.batchCraft           = batchCraft;
  exports.getSkillBonus        = getSkillBonus;
  exports.applyMessage         = applyMessage;

  // Expose mulberry32 for external testing
  exports.mulberry32 = mulberry32;

})(typeof module !== 'undefined' ? module.exports : (window.Crafting = {}));
