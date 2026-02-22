// dashboard_inventory.js
/**
 * ZION Dashboard — Inventory & Crafting Panel
 *
 * Provides a UI-only inventory panel for dashboard (text-based) mode.
 * Manages item catalog, crafting recipes, equipment, and inventory state.
 *
 * UMD pattern — works in browser (window.DashboardInventory) and Node.js.
 * ES5 compatible — uses var declarations throughout.
 */
(function(exports) {
  'use strict';

  // ---------------------------------------------------------------------------
  // Item Catalog
  // ---------------------------------------------------------------------------

  var ITEM_CATALOG = {
    // Resources
    wood: {
      name: 'Wood',
      category: 'resource',
      rarity: 'common',
      value: 2,
      desc: 'Sturdy timber from the Wilds'
    },
    stone: {
      name: 'Stone',
      category: 'resource',
      rarity: 'common',
      value: 3,
      desc: 'Quarried from the mountains'
    },
    iron_ore: {
      name: 'Iron Ore',
      category: 'resource',
      rarity: 'uncommon',
      value: 8,
      desc: 'Raw metal waiting to be smelted'
    },
    crystal: {
      name: 'Crystal',
      category: 'resource',
      rarity: 'rare',
      value: 25,
      desc: 'Glowing shard from deep caves'
    },
    herbs: {
      name: 'Herbs',
      category: 'resource',
      rarity: 'common',
      value: 4,
      desc: 'Medicinal plants from the Gardens'
    },
    silk: {
      name: 'Silk',
      category: 'resource',
      rarity: 'uncommon',
      value: 12,
      desc: 'Fine thread from garden spiders'
    },
    clay: {
      name: 'Clay',
      category: 'resource',
      rarity: 'common',
      value: 2,
      desc: 'Moldable earth from riverbeds'
    },
    gold_dust: {
      name: 'Gold Dust',
      category: 'resource',
      rarity: 'rare',
      value: 30,
      desc: 'Precious metal particles'
    },
    feather: {
      name: 'Feather',
      category: 'resource',
      rarity: 'common',
      value: 1,
      desc: 'Light plume from birds'
    },
    honey: {
      name: 'Honey',
      category: 'resource',
      rarity: 'uncommon',
      value: 6,
      desc: 'Sweet nectar from garden bees'
    },

    // Tools
    pickaxe: {
      name: 'Pickaxe',
      category: 'tool',
      rarity: 'common',
      value: 15,
      desc: 'For mining stone and ore'
    },
    axe: {
      name: 'Axe',
      category: 'tool',
      rarity: 'common',
      value: 12,
      desc: 'For chopping wood'
    },
    fishing_rod: {
      name: 'Fishing Rod',
      category: 'tool',
      rarity: 'common',
      value: 10,
      desc: 'Basic rod for catching fish'
    },
    compass: {
      name: 'Compass',
      category: 'tool',
      rarity: 'uncommon',
      value: 20,
      desc: 'Points toward discoveries'
    },
    telescope: {
      name: 'Telescope',
      category: 'tool',
      rarity: 'rare',
      value: 50,
      desc: 'See constellations clearly'
    },

    // Consumables
    bread: {
      name: 'Bread',
      category: 'consumable',
      rarity: 'common',
      value: 3,
      desc: 'Restores a bit of energy'
    },
    potion: {
      name: 'Potion',
      category: 'consumable',
      rarity: 'uncommon',
      value: 15,
      desc: 'Restores energy fully'
    },
    elixir: {
      name: 'Elixir',
      category: 'consumable',
      rarity: 'rare',
      value: 40,
      desc: 'Grants temporary bonus'
    },
    scroll: {
      name: 'Scroll',
      category: 'consumable',
      rarity: 'uncommon',
      value: 10,
      desc: 'Contains ancient knowledge'
    },

    // Crafted items
    iron_bar: {
      name: 'Iron Bar',
      category: 'crafted',
      rarity: 'uncommon',
      value: 20,
      desc: 'Smelted iron ingot'
    },
    plank: {
      name: 'Plank',
      category: 'crafted',
      rarity: 'common',
      value: 5,
      desc: 'Processed lumber'
    },
    brick: {
      name: 'Brick',
      category: 'crafted',
      rarity: 'common',
      value: 6,
      desc: 'Fired clay block'
    },
    rope: {
      name: 'Rope',
      category: 'crafted',
      rarity: 'common',
      value: 8,
      desc: 'Woven silk fibers'
    },
    candle: {
      name: 'Candle',
      category: 'crafted',
      rarity: 'common',
      value: 4,
      desc: 'Wax and wick for light'
    },
    glass: {
      name: 'Glass',
      category: 'crafted',
      rarity: 'uncommon',
      value: 12,
      desc: 'Clear pane of glass'
    },

    // Equipment
    leather_armor: {
      name: 'Leather Armor',
      category: 'equipment',
      rarity: 'uncommon',
      value: 30,
      desc: 'Basic protection',
      slot: 'body',
      stats: { defense: 5 }
    },
    iron_sword: {
      name: 'Iron Sword',
      category: 'equipment',
      rarity: 'uncommon',
      value: 35,
      desc: 'A sturdy blade',
      slot: 'weapon',
      stats: { attack: 8 }
    },
    gold_ring: {
      name: 'Gold Ring',
      category: 'equipment',
      rarity: 'rare',
      value: 60,
      desc: 'Ornate jewelry',
      slot: 'accessory',
      stats: { luck: 5 }
    },
    crystal_staff: {
      name: 'Crystal Staff',
      category: 'equipment',
      rarity: 'epic',
      value: 100,
      desc: 'Channels energy',
      slot: 'weapon',
      stats: { attack: 15, magic: 20 }
    },
    iron_helm: {
      name: 'Iron Helm',
      category: 'equipment',
      rarity: 'uncommon',
      value: 25,
      desc: 'A solid iron helmet',
      slot: 'head',
      stats: { defense: 3 }
    },
    silver_amulet: {
      name: 'Silver Amulet',
      category: 'equipment',
      rarity: 'rare',
      value: 55,
      desc: 'A gleaming amulet',
      slot: 'accessory',
      stats: { magic: 8, luck: 3 }
    },

    // Collectibles
    ancient_coin: {
      name: 'Ancient Coin',
      category: 'collectible',
      rarity: 'rare',
      value: 50,
      desc: 'From a forgotten era'
    },
    fossil: {
      name: 'Fossil',
      category: 'collectible',
      rarity: 'rare',
      value: 45,
      desc: 'Preserved in stone'
    },
    star_fragment: {
      name: 'Star Fragment',
      category: 'collectible',
      rarity: 'legendary',
      value: 200,
      desc: 'Fell from the sky'
    },
    rare_gem: {
      name: 'Rare Gem',
      category: 'collectible',
      rarity: 'epic',
      value: 120,
      desc: 'A gemstone of unusual brilliance'
    },
    portrait: {
      name: 'Portrait',
      category: 'collectible',
      rarity: 'uncommon',
      value: 35,
      desc: 'A painted portrait of a ZION citizen'
    },
    rune_stone: {
      name: 'Rune Stone',
      category: 'collectible',
      rarity: 'rare',
      value: 70,
      desc: 'Ancient stone covered in runes'
    },

    // Extra resources
    charcoal: {
      name: 'Charcoal',
      category: 'resource',
      rarity: 'common',
      value: 3,
      desc: 'Burned wood residue'
    },
    sand: {
      name: 'Sand',
      category: 'resource',
      rarity: 'common',
      value: 1,
      desc: 'Fine grains from the shore'
    },
    mushroom: {
      name: 'Mushroom',
      category: 'resource',
      rarity: 'common',
      value: 2,
      desc: 'Foraged from the forest floor'
    },
    fiber: {
      name: 'Fiber',
      category: 'resource',
      rarity: 'common',
      value: 2,
      desc: 'Plant fiber for weaving'
    },
    resin: {
      name: 'Resin',
      category: 'resource',
      rarity: 'uncommon',
      value: 7,
      desc: 'Sticky sap from ancient trees'
    },

    // Extra crafted
    torch: {
      name: 'Torch',
      category: 'crafted',
      rarity: 'common',
      value: 5,
      desc: 'Lights the way in dark places'
    },
    net: {
      name: 'Net',
      category: 'crafted',
      rarity: 'common',
      value: 9,
      desc: 'Woven fiber for catching creatures'
    },
    bowl: {
      name: 'Bowl',
      category: 'crafted',
      rarity: 'common',
      value: 4,
      desc: 'A clay vessel for food'
    },
    ink: {
      name: 'Ink',
      category: 'crafted',
      rarity: 'uncommon',
      value: 10,
      desc: 'Dark ink for writing'
    },
    dye: {
      name: 'Dye',
      category: 'crafted',
      rarity: 'common',
      value: 6,
      desc: 'Colorful dye made from herbs'
    },

    // Extra consumables
    stew: {
      name: 'Stew',
      category: 'consumable',
      rarity: 'common',
      value: 8,
      desc: 'Hearty meal that restores energy'
    },
    tea: {
      name: 'Tea',
      category: 'consumable',
      rarity: 'common',
      value: 5,
      desc: 'Calming herbal tea'
    },
    antidote: {
      name: 'Antidote',
      category: 'consumable',
      rarity: 'uncommon',
      value: 18,
      desc: 'Cures ailments and poison'
    },

    // Additional resources
    coal: {
      name: 'Coal',
      category: 'resource',
      rarity: 'common',
      value: 4,
      desc: 'Fuel for furnaces and forges'
    },
    sulfur: {
      name: 'Sulfur',
      category: 'resource',
      rarity: 'uncommon',
      value: 9,
      desc: 'Yellow mineral with explosive potential'
    },
    salt: {
      name: 'Salt',
      category: 'resource',
      rarity: 'common',
      value: 2,
      desc: 'Harvested from coastal shores'
    },

    // Additional crafted items
    wire: {
      name: 'Wire',
      category: 'crafted',
      rarity: 'uncommon',
      value: 11,
      desc: 'Thin drawn iron strand'
    },
    barrel: {
      name: 'Barrel',
      category: 'crafted',
      rarity: 'common',
      value: 7,
      desc: 'Wooden cask for storage'
    },
    lantern: {
      name: 'Lantern',
      category: 'crafted',
      rarity: 'uncommon',
      value: 14,
      desc: 'Glass lantern that holds candlelight'
    },

    // Additional collectibles
    carved_idol: {
      name: 'Carved Idol',
      category: 'collectible',
      rarity: 'epic',
      value: 130,
      desc: 'A small figure carved from an unknown material'
    },
    map_fragment: {
      name: 'Map Fragment',
      category: 'collectible',
      rarity: 'rare',
      value: 65,
      desc: 'A piece of an ancient map of ZION'
    },
    void_shard: {
      name: 'Void Shard',
      category: 'collectible',
      rarity: 'legendary',
      value: 250,
      desc: 'A fragment of pure darkness from beyond the rift'
    },
    pressed_flower: {
      name: 'Pressed Flower',
      category: 'collectible',
      rarity: 'uncommon',
      value: 28,
      desc: 'A rare bloom preserved between pages'
    }
  };

  // ---------------------------------------------------------------------------
  // Crafting Recipes
  // ---------------------------------------------------------------------------

  var RECIPES = [
    {
      id: 'plank',
      name: 'Plank',
      inputs: [{ item: 'wood', count: 2 }],
      output: { item: 'plank', count: 2 },
      skill: 'crafting',
      level: 0
    },
    {
      id: 'brick',
      name: 'Brick',
      inputs: [{ item: 'clay', count: 3 }],
      output: { item: 'brick', count: 2 },
      skill: 'crafting',
      level: 0
    },
    {
      id: 'iron_bar',
      name: 'Iron Bar',
      inputs: [{ item: 'iron_ore', count: 2 }, { item: 'wood', count: 1 }],
      output: { item: 'iron_bar', count: 1 },
      skill: 'smithing',
      level: 1
    },
    {
      id: 'rope',
      name: 'Rope',
      inputs: [{ item: 'silk', count: 3 }],
      output: { item: 'rope', count: 1 },
      skill: 'crafting',
      level: 0
    },
    {
      id: 'bread',
      name: 'Bread',
      inputs: [{ item: 'herbs', count: 2 }],
      output: { item: 'bread', count: 3 },
      skill: 'cooking',
      level: 0
    },
    {
      id: 'candle',
      name: 'Candle',
      inputs: [{ item: 'honey', count: 1 }, { item: 'silk', count: 1 }],
      output: { item: 'candle', count: 2 },
      skill: 'crafting',
      level: 0
    },
    {
      id: 'potion',
      name: 'Potion',
      inputs: [{ item: 'herbs', count: 3 }, { item: 'crystal', count: 1 }],
      output: { item: 'potion', count: 1 },
      skill: 'alchemy',
      level: 2
    },
    {
      id: 'glass',
      name: 'Glass',
      inputs: [{ item: 'stone', count: 2 }, { item: 'gold_dust', count: 1 }],
      output: { item: 'glass', count: 1 },
      skill: 'crafting',
      level: 1
    },
    {
      id: 'pickaxe',
      name: 'Pickaxe',
      inputs: [{ item: 'iron_bar', count: 2 }, { item: 'plank', count: 1 }],
      output: { item: 'pickaxe', count: 1 },
      skill: 'smithing',
      level: 2
    },
    {
      id: 'axe',
      name: 'Axe',
      inputs: [{ item: 'iron_bar', count: 1 }, { item: 'plank', count: 2 }],
      output: { item: 'axe', count: 1 },
      skill: 'smithing',
      level: 1
    },
    {
      id: 'fishing_rod',
      name: 'Fishing Rod',
      inputs: [{ item: 'plank', count: 2 }, { item: 'rope', count: 1 }],
      output: { item: 'fishing_rod', count: 1 },
      skill: 'crafting',
      level: 1
    },
    {
      id: 'compass',
      name: 'Compass',
      inputs: [
        { item: 'iron_bar', count: 1 },
        { item: 'glass', count: 1 },
        { item: 'gold_dust', count: 1 }
      ],
      output: { item: 'compass', count: 1 },
      skill: 'engineering',
      level: 3
    },
    {
      id: 'leather_armor',
      name: 'Leather Armor',
      inputs: [{ item: 'silk', count: 5 }, { item: 'iron_bar', count: 2 }],
      output: { item: 'leather_armor', count: 1 },
      skill: 'tailoring',
      level: 2
    },
    {
      id: 'iron_sword',
      name: 'Iron Sword',
      inputs: [{ item: 'iron_bar', count: 3 }, { item: 'plank', count: 1 }],
      output: { item: 'iron_sword', count: 1 },
      skill: 'smithing',
      level: 3
    },
    {
      id: 'telescope',
      name: 'Telescope',
      inputs: [
        { item: 'glass', count: 2 },
        { item: 'iron_bar', count: 1 },
        { item: 'gold_dust', count: 1 }
      ],
      output: { item: 'telescope', count: 1 },
      skill: 'engineering',
      level: 4
    },
    {
      id: 'gold_ring',
      name: 'Gold Ring',
      inputs: [{ item: 'gold_dust', count: 5 }],
      output: { item: 'gold_ring', count: 1 },
      skill: 'smithing',
      level: 3
    },
    {
      id: 'elixir',
      name: 'Elixir',
      inputs: [{ item: 'potion', count: 2 }, { item: 'star_fragment', count: 1 }],
      output: { item: 'elixir', count: 1 },
      skill: 'alchemy',
      level: 5
    },
    {
      id: 'crystal_staff',
      name: 'Crystal Staff',
      inputs: [
        { item: 'crystal', count: 3 },
        { item: 'plank', count: 1 },
        { item: 'gold_dust', count: 2 }
      ],
      output: { item: 'crystal_staff', count: 1 },
      skill: 'enchanting',
      level: 5
    },
    {
      id: 'scroll',
      name: 'Scroll',
      inputs: [{ item: 'feather', count: 2 }, { item: 'silk', count: 1 }],
      output: { item: 'scroll', count: 2 },
      skill: 'scribing',
      level: 1
    },
    {
      id: 'torch',
      name: 'Torch',
      inputs: [{ item: 'wood', count: 1 }, { item: 'honey', count: 1 }],
      output: { item: 'torch', count: 2 },
      skill: 'crafting',
      level: 0
    },
    {
      id: 'net',
      name: 'Net',
      inputs: [{ item: 'fiber', count: 4 }, { item: 'rope', count: 1 }],
      output: { item: 'net', count: 1 },
      skill: 'crafting',
      level: 1
    },
    {
      id: 'bowl',
      name: 'Bowl',
      inputs: [{ item: 'clay', count: 2 }],
      output: { item: 'bowl', count: 1 },
      skill: 'crafting',
      level: 0
    },
    {
      id: 'stew',
      name: 'Stew',
      inputs: [{ item: 'mushroom', count: 2 }, { item: 'herbs', count: 1 }],
      output: { item: 'stew', count: 1 },
      skill: 'cooking',
      level: 1
    },
    {
      id: 'tea',
      name: 'Tea',
      inputs: [{ item: 'herbs', count: 1 }],
      output: { item: 'tea', count: 2 },
      skill: 'cooking',
      level: 0
    },
    {
      id: 'ink',
      name: 'Ink',
      inputs: [{ item: 'mushroom', count: 1 }, { item: 'resin', count: 1 }],
      output: { item: 'ink', count: 2 },
      skill: 'scribing',
      level: 0
    },
    {
      id: 'dye',
      name: 'Dye',
      inputs: [{ item: 'herbs', count: 2 }, { item: 'crystal', count: 1 }],
      output: { item: 'dye', count: 3 },
      skill: 'crafting',
      level: 1
    }
  ];

  // ---------------------------------------------------------------------------
  // Rarity and Symbol Helpers
  // ---------------------------------------------------------------------------

  /**
   * Get the display color for a rarity level.
   * @param {string} rarity
   * @returns {string} CSS color string
   */
  function getRarityColor(rarity) {
    var colors = {
      common:    '#cccccc',
      uncommon:  '#2ecc71',
      rare:      '#3498db',
      epic:      '#9b59b6',
      legendary: '#f39c12'
    };
    return colors[rarity] || '#cccccc';
  }

  /**
   * Get the text symbol for an item category.
   * @param {string} category
   * @returns {string}
   */
  function getItemSymbol(category) {
    var symbols = {
      resource:   '[R]',
      tool:       '[T]',
      consumable: '[C]',
      crafted:    '[+]',
      equipment:  '[E]',
      collectible:'[*]'
    };
    return symbols[category] || '[?]';
  }

  // ---------------------------------------------------------------------------
  // Item Lookup
  // ---------------------------------------------------------------------------

  /**
   * Returns the full ITEM_CATALOG.
   * @returns {Object}
   */
  function getItemCatalog() {
    return ITEM_CATALOG;
  }

  /**
   * Get item details from the catalog by ID.
   * @param {string} itemId
   * @returns {Object|null}
   */
  function getItemInfo(itemId) {
    return ITEM_CATALOG[itemId] || null;
  }

  // ---------------------------------------------------------------------------
  // Recipe Lookup
  // ---------------------------------------------------------------------------

  /**
   * Returns all crafting recipes.
   * @returns {Array}
   */
  function getRecipes() {
    return RECIPES;
  }

  /**
   * Get a specific recipe by ID.
   * @param {string} recipeId
   * @returns {Object|null}
   */
  function getRecipeById(recipeId) {
    for (var i = 0; i < RECIPES.length; i++) {
      if (RECIPES[i].id === recipeId) return RECIPES[i];
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Inventory State Management
  // ---------------------------------------------------------------------------

  /**
   * Create a fresh inventory state.
   * @returns {Object}
   */
  function createInventoryState() {
    return {
      items: {},
      equipped: {
        head:      null,
        body:      null,
        weapon:    null,
        accessory: null
      },
      skills: {}
    };
  }

  /**
   * Add items to inventory. Returns updated state (mutates in place).
   * @param {Object} state
   * @param {string} itemId
   * @param {number} count
   * @returns {Object}
   */
  function addItemToInventory(state, itemId, count) {
    if (!ITEM_CATALOG[itemId]) return state;
    var qty = count > 0 ? count : 0;
    if (qty === 0) return state;
    state.items[itemId] = (state.items[itemId] || 0) + qty;
    return state;
  }

  /**
   * Remove items from inventory.
   * @param {Object} state
   * @param {string} itemId
   * @param {number} count
   * @returns {{ success: boolean, state: Object, message: string }}
   */
  function removeItemFromInventory(state, itemId, count) {
    var have = state.items[itemId] || 0;
    if (have < count) {
      return {
        success: false,
        state: state,
        message: 'Not enough ' + (ITEM_CATALOG[itemId] ? ITEM_CATALOG[itemId].name : itemId) + ' (have ' + have + ', need ' + count + ')'
      };
    }
    state.items[itemId] = have - count;
    if (state.items[itemId] === 0) {
      delete state.items[itemId];
    }
    return { success: true, state: state, message: 'Removed ' + count + 'x ' + itemId };
  }

  // ---------------------------------------------------------------------------
  // Equipment System
  // ---------------------------------------------------------------------------

  /**
   * Equip an item to its designated slot.
   * @param {Object} state
   * @param {string} itemId
   * @returns {{ success: boolean, state: Object, previousItem: string|null, message: string }}
   */
  function equipItem(state, itemId) {
    var itemInfo = ITEM_CATALOG[itemId];
    if (!itemInfo) {
      return { success: false, state: state, previousItem: null, message: 'Unknown item: ' + itemId };
    }
    if (itemInfo.category !== 'equipment') {
      return { success: false, state: state, previousItem: null, message: itemInfo.name + ' is not equippable' };
    }
    if (!state.items[itemId] || state.items[itemId] < 1) {
      return { success: false, state: state, previousItem: null, message: 'You do not have ' + itemInfo.name + ' in your inventory' };
    }

    var slot = itemInfo.slot;
    if (!slot || !(slot in state.equipped)) {
      return { success: false, state: state, previousItem: null, message: 'No valid slot for ' + itemInfo.name };
    }

    var previousItem = state.equipped[slot];

    // Remove from inventory
    state.items[itemId] -= 1;
    if (state.items[itemId] === 0) delete state.items[itemId];

    // If something was equipped in that slot, return it to inventory
    if (previousItem) {
      state.items[previousItem] = (state.items[previousItem] || 0) + 1;
    }

    state.equipped[slot] = itemId;

    return {
      success: true,
      state: state,
      previousItem: previousItem,
      message: 'Equipped ' + itemInfo.name + (previousItem ? ' (replaced ' + previousItem + ')' : '')
    };
  }

  /**
   * Unequip an item from a slot.
   * @param {Object} state
   * @param {string} slot
   * @returns {{ success: boolean, state: Object, item: string|null, message: string }}
   */
  function unequipItem(state, slot) {
    if (!(slot in state.equipped)) {
      return { success: false, state: state, item: null, message: 'Invalid slot: ' + slot };
    }
    var itemId = state.equipped[slot];
    if (!itemId) {
      return { success: false, state: state, item: null, message: 'Nothing equipped in ' + slot };
    }
    state.equipped[slot] = null;
    state.items[itemId] = (state.items[itemId] || 0) + 1;
    return {
      success: true,
      state: state,
      item: itemId,
      message: 'Unequipped ' + (ITEM_CATALOG[itemId] ? ITEM_CATALOG[itemId].name : itemId)
    };
  }

  /**
   * Get aggregate stats from all equipped items.
   * @param {Object} equipped - The equipped object from inventory state
   * @returns {Object} - Merged stats object
   */
  function getEquipmentStats(equipped) {
    var stats = {};
    var slots = Object.keys(equipped);
    for (var i = 0; i < slots.length; i++) {
      var itemId = equipped[slots[i]];
      if (!itemId) continue;
      var itemInfo = ITEM_CATALOG[itemId];
      if (!itemInfo || !itemInfo.stats) continue;
      var statKeys = Object.keys(itemInfo.stats);
      for (var j = 0; j < statKeys.length; j++) {
        var key = statKeys[j];
        stats[key] = (stats[key] || 0) + itemInfo.stats[key];
      }
    }
    return stats;
  }

  // ---------------------------------------------------------------------------
  // Crafting Logic
  // ---------------------------------------------------------------------------

  /**
   * Check if a recipe can be crafted given current inventory and skills.
   * @param {string} recipeId
   * @param {Object} inventory - map of itemId → quantity
   * @param {Object} skills - map of skillName → level
   * @returns {{ craftable: boolean, missing: Array, skillRequired: Object|null }}
   */
  function canCraft(recipeId, inventory, skills) {
    var recipe = getRecipeById(recipeId);
    if (!recipe) {
      return { craftable: false, missing: [], skillRequired: null };
    }

    var missing = [];
    for (var i = 0; i < recipe.inputs.length; i++) {
      var input = recipe.inputs[i];
      var have = (inventory && inventory[input.item]) ? inventory[input.item] : 0;
      if (have < input.count) {
        missing.push({ item: input.item, need: input.count, have: have });
      }
    }

    var skillRequired = null;
    var playerLevel = (skills && skills[recipe.skill]) ? skills[recipe.skill] : 0;
    if (playerLevel < recipe.level) {
      skillRequired = { skill: recipe.skill, level: recipe.level, playerLevel: playerLevel };
    }

    return {
      craftable: missing.length === 0 && skillRequired === null,
      missing: missing,
      skillRequired: skillRequired
    };
  }

  /**
   * Attempt to craft an item. Consumes inputs and produces output.
   * @param {string} recipeId
   * @param {Object} inventory - map of itemId → quantity (mutated)
   * @param {Object} skills - map of skillName → level
   * @returns {{ success: boolean, item: string|null, quantity: number, message: string }}
   */
  function craftItem(recipeId, inventory, skills) {
    var check = canCraft(recipeId, inventory, skills);
    if (!check.craftable) {
      if (check.skillRequired) {
        return {
          success: false,
          item: null,
          quantity: 0,
          message: 'Requires ' + check.skillRequired.skill + ' level ' + check.skillRequired.level + ' (you have ' + check.skillRequired.playerLevel + ')'
        };
      }
      var missingText = check.missing.map(function(m) {
        return m.item + ' (have ' + m.have + ', need ' + m.need + ')';
      }).join(', ');
      return {
        success: false,
        item: null,
        quantity: 0,
        message: 'Missing materials: ' + missingText
      };
    }

    var recipe = getRecipeById(recipeId);

    // Consume inputs
    for (var i = 0; i < recipe.inputs.length; i++) {
      var input = recipe.inputs[i];
      inventory[input.item] -= input.count;
      if (inventory[input.item] === 0) delete inventory[input.item];
    }

    // Produce output
    var outputItem = recipe.output.item;
    var outputCount = recipe.output.count;
    inventory[outputItem] = (inventory[outputItem] || 0) + outputCount;

    var itemInfo = ITEM_CATALOG[outputItem];
    var itemName = itemInfo ? itemInfo.name : outputItem;

    return {
      success: true,
      item: outputItem,
      quantity: outputCount,
      message: 'Crafted ' + outputCount + 'x ' + itemName
    };
  }

  // ---------------------------------------------------------------------------
  // Filtering and Sorting
  // ---------------------------------------------------------------------------

  /**
   * Filter inventory items by category.
   * @param {Object} inventory - map of itemId → quantity
   * @param {string} category - 'all' or a category name
   * @returns {Array} - array of { id, quantity, info } objects
   */
  function getItemsByCategory(inventory, category) {
    var result = [];
    var keys = Object.keys(inventory || {});
    for (var i = 0; i < keys.length; i++) {
      var id = keys[i];
      var info = ITEM_CATALOG[id];
      if (!info) continue;
      if (category === 'all' || !category || info.category === category) {
        result.push({ id: id, quantity: inventory[id], info: info });
      }
    }
    return result;
  }

  // Rarity order for sorting
  var RARITY_ORDER = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };

  /**
   * Sort an array of { id, quantity, info } items.
   * @param {Array} items
   * @param {string} sortBy - 'name', 'value', 'rarity', 'quantity'
   * @returns {Array}
   */
  function sortItems(items, sortBy) {
    var sorted = items.slice();
    sorted.sort(function(a, b) {
      switch (sortBy) {
        case 'name':
          return a.info.name.localeCompare(b.info.name);
        case 'value':
          return b.info.value - a.info.value;
        case 'rarity':
          return (RARITY_ORDER[b.info.rarity] || 0) - (RARITY_ORDER[a.info.rarity] || 0);
        case 'quantity':
          return b.quantity - a.quantity;
        default:
          return 0;
      }
    });
    return sorted;
  }

  // ---------------------------------------------------------------------------
  // Value Calculation
  // ---------------------------------------------------------------------------

  /**
   * Calculate total value of all items in inventory.
   * @param {Object} inventory - map of itemId → quantity
   * @returns {number}
   */
  function calculateInventoryValue(inventory) {
    var total = 0;
    var keys = Object.keys(inventory || {});
    for (var i = 0; i < keys.length; i++) {
      var id = keys[i];
      var info = ITEM_CATALOG[id];
      if (!info) continue;
      total += info.value * inventory[id];
    }
    return total;
  }

  // ---------------------------------------------------------------------------
  // HTML Formatting
  // ---------------------------------------------------------------------------

  /**
   * Format an item slot for the grid view.
   * @param {string} itemId
   * @param {number} quantity
   * @param {boolean} selected
   * @returns {string} HTML string
   */
  function formatItemSlot(itemId, quantity, selected) {
    var info = ITEM_CATALOG[itemId];
    if (!info) return '<div class="inv-slot inv-slot--empty"></div>';

    var rarityColor = getRarityColor(info.rarity);
    var symbol = getItemSymbol(info.category);
    var border = selected ? '2px solid #f0c040' : '2px solid ' + rarityColor;
    var selectedClass = selected ? ' inv-slot--selected' : '';

    return '<div class="inv-slot' + selectedClass + '" data-item="' + itemId + '" style="border:' + border + ';padding:4px;display:inline-block;text-align:center;min-width:60px;background:#1a1a2e;">' +
      '<div class="inv-slot__symbol" style="font-size:1.2em;color:' + rarityColor + ';">' + symbol + '</div>' +
      '<div class="inv-slot__name" style="font-size:0.75em;color:#ccc;">' + info.name + '</div>' +
      '<div class="inv-slot__qty" style="font-size:0.7em;color:#aaa;">x' + quantity + '</div>' +
    '</div>';
  }

  /**
   * Format a recipe card for the crafting view.
   * @param {Object} recipe
   * @param {Object} inventory - map of itemId → quantity
   * @param {Object} skills - map of skillName → level
   * @returns {string} HTML string
   */
  function formatRecipeCard(recipe, inventory, skills) {
    var check = canCraft(recipe.id, inventory, skills);
    var outputInfo = ITEM_CATALOG[recipe.output.item];
    var outputName = outputInfo ? outputInfo.name : recipe.output.item;
    var outputSymbol = outputInfo ? getItemSymbol(outputInfo.category) : '[?]';
    var outputColor = outputInfo ? getRarityColor(outputInfo.rarity) : '#cccccc';
    var craftableClass = check.craftable ? 'craftable' : 'not-craftable';
    var btnDisabled = check.craftable ? '' : ' disabled';

    var inputsHtml = '';
    for (var i = 0; i < recipe.inputs.length; i++) {
      var input = recipe.inputs[i];
      var have = (inventory && inventory[input.item]) ? inventory[input.item] : 0;
      var enoughColor = have >= input.count ? '#2ecc71' : '#e74c3c';
      var inputInfo = ITEM_CATALOG[input.item];
      var inputName = inputInfo ? inputInfo.name : input.item;
      inputsHtml += '<span class="recipe-input" style="color:' + enoughColor + ';">' +
        inputName + ' (' + have + '/' + input.count + ')' +
      '</span> ';
    }

    var skillHtml = '';
    if (recipe.level > 0) {
      var playerSkillLevel = (skills && skills[recipe.skill]) ? skills[recipe.skill] : 0;
      var skillColor = playerSkillLevel >= recipe.level ? '#2ecc71' : '#e74c3c';
      skillHtml = '<div class="recipe-skill" style="font-size:0.75em;color:' + skillColor + ';">' +
        recipe.skill + ' lv.' + recipe.level + ' (you: ' + playerSkillLevel + ')' +
      '</div>';
    }

    return '<div class="recipe-card ' + craftableClass + '" data-recipe="' + recipe.id + '" style="border:1px solid #333;padding:6px;margin-bottom:4px;background:#111;">' +
      '<div class="recipe-output" style="font-weight:bold;color:' + outputColor + ';">' +
        outputSymbol + ' ' + outputName + ' x' + recipe.output.count +
      '</div>' +
      '<div class="recipe-inputs" style="font-size:0.8em;margin-top:4px;">' + inputsHtml + '</div>' +
      skillHtml +
      '<button class="recipe-craft-btn" data-recipe="' + recipe.id + '"' + btnDisabled + ' style="margin-top:4px;">[Craft]</button>' +
    '</div>';
  }

  // ---------------------------------------------------------------------------
  // Panel DOM Creation
  // ---------------------------------------------------------------------------

  /**
   * Create the full inventory panel DOM element.
   * Works in browser only; returns null in Node.js.
   * @returns {HTMLElement|null}
   */
  function createInventoryPanel() {
    if (typeof document === 'undefined') return null;

    var panel = document.createElement('div');
    panel.className = 'dashboard-inventory-panel';
    panel.style.cssText = 'font-family:monospace;background:#0a0a14;color:#ccc;padding:12px;height:100%;overflow:auto;';

    panel.innerHTML =
      '<div class="inv-header" style="font-size:1.1em;font-weight:bold;color:#f0c040;margin-bottom:8px;">Inventory &amp; Crafting</div>' +
      '<div class="inv-tabs" style="display:flex;gap:4px;margin-bottom:8px;">' +
        '<button class="inv-tab inv-tab--active" data-tab="items" style="background:#222;border:1px solid #f0c040;color:#f0c040;padding:4px 10px;cursor:pointer;">[Items]</button>' +
        '<button class="inv-tab" data-tab="crafting" style="background:#111;border:1px solid #555;color:#aaa;padding:4px 10px;cursor:pointer;">[Crafting]</button>' +
        '<button class="inv-tab" data-tab="equipment" style="background:#111;border:1px solid #555;color:#aaa;padding:4px 10px;cursor:pointer;">[Equipment]</button>' +
      '</div>' +
      '<div class="inv-tab-content" id="inv-tab-items">' +
        '<div class="inv-filters" style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px;">' +
          '<button class="inv-filter inv-filter--active" data-filter="all">All</button>' +
          '<button class="inv-filter" data-filter="resource">Resources</button>' +
          '<button class="inv-filter" data-filter="tool">Tools</button>' +
          '<button class="inv-filter" data-filter="consumable">Consumables</button>' +
          '<button class="inv-filter" data-filter="crafted">Crafted</button>' +
          '<button class="inv-filter" data-filter="equipment">Equipment</button>' +
          '<button class="inv-filter" data-filter="collectible">Collectibles</button>' +
        '</div>' +
        '<div class="inv-sort" style="margin-bottom:8px;">' +
          'Sort: ' +
          '<button class="inv-sort-btn" data-sort="name">Name</button>' +
          '<button class="inv-sort-btn" data-sort="value">Value</button>' +
          '<button class="inv-sort-btn" data-sort="rarity">Rarity</button>' +
          '<button class="inv-sort-btn" data-sort="quantity">Quantity</button>' +
        '</div>' +
        '<div class="inv-grid" style="display:flex;flex-wrap:wrap;gap:4px;">' +
          '<div class="inv-empty" style="color:#555;font-size:0.85em;">No items. Explore ZION to gather resources.</div>' +
        '</div>' +
      '</div>' +
      '<div class="inv-tab-content" id="inv-tab-crafting" style="display:none;">' +
        '<div class="inv-recipes">' +
          '<div class="inv-empty" style="color:#555;font-size:0.85em;">Gather materials to unlock crafting.</div>' +
        '</div>' +
      '</div>' +
      '<div class="inv-tab-content" id="inv-tab-equipment" style="display:none;">' +
        '<div class="inv-equipment-slots" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
          '<div class="equip-slot" data-slot="head" style="border:1px solid #333;padding:6px;background:#111;">' +
            '<div style="color:#888;font-size:0.75em;">HEAD</div><div class="equip-item" style="color:#555;">-- empty --</div>' +
          '</div>' +
          '<div class="equip-slot" data-slot="body" style="border:1px solid #333;padding:6px;background:#111;">' +
            '<div style="color:#888;font-size:0.75em;">BODY</div><div class="equip-item" style="color:#555;">-- empty --</div>' +
          '</div>' +
          '<div class="equip-slot" data-slot="weapon" style="border:1px solid #333;padding:6px;background:#111;">' +
            '<div style="color:#888;font-size:0.75em;">WEAPON</div><div class="equip-item" style="color:#555;">-- empty --</div>' +
          '</div>' +
          '<div class="equip-slot" data-slot="accessory" style="border:1px solid #333;padding:6px;background:#111;">' +
            '<div style="color:#888;font-size:0.75em;">ACCESSORY</div><div class="equip-item" style="color:#555;">-- empty --</div>' +
          '</div>' +
        '</div>' +
        '<div class="equip-stats" style="margin-top:8px;border:1px solid #333;padding:6px;background:#111;">' +
          '<div style="color:#f0c040;font-size:0.85em;margin-bottom:4px;">STATS</div>' +
          '<div class="equip-stats-content" style="color:#aaa;font-size:0.8em;">No equipment worn.</div>' +
        '</div>' +
      '</div>';

    _wireTabSwitching(panel);

    return panel;
  }

  /**
   * Wire tab switching logic on the panel.
   * @param {HTMLElement} panel
   */
  function _wireTabSwitching(panel) {
    var tabs = panel.querySelectorAll('.inv-tab');
    for (var i = 0; i < tabs.length; i++) {
      (function(tab) {
        tab.addEventListener('click', function() {
          var targetTab = tab.getAttribute('data-tab');
          // Update tab button styles
          var allTabs = panel.querySelectorAll('.inv-tab');
          for (var j = 0; j < allTabs.length; j++) {
            allTabs[j].style.background = '#111';
            allTabs[j].style.borderColor = '#555';
            allTabs[j].style.color = '#aaa';
            allTabs[j].classList.remove('inv-tab--active');
          }
          tab.style.background = '#222';
          tab.style.borderColor = '#f0c040';
          tab.style.color = '#f0c040';
          tab.classList.add('inv-tab--active');

          // Show/hide content panels
          var contents = panel.querySelectorAll('.inv-tab-content');
          for (var k = 0; k < contents.length; k++) {
            contents[k].style.display = 'none';
          }
          var target = panel.querySelector('#inv-tab-' + targetTab);
          if (target) target.style.display = 'block';
        });
      })(tabs[i]);
    }
  }

  // ---------------------------------------------------------------------------
  // Exports
  // ---------------------------------------------------------------------------

  exports.ITEM_CATALOG              = ITEM_CATALOG;
  exports.RECIPES                   = RECIPES;

  exports.createInventoryPanel      = createInventoryPanel;
  exports.getItemCatalog            = getItemCatalog;
  exports.getItemInfo               = getItemInfo;
  exports.getRecipes                = getRecipes;
  exports.getRecipeById             = getRecipeById;
  exports.canCraft                  = canCraft;
  exports.craftItem                 = craftItem;
  exports.formatItemSlot            = formatItemSlot;
  exports.formatRecipeCard          = formatRecipeCard;
  exports.getItemsByCategory        = getItemsByCategory;
  exports.sortItems                 = sortItems;
  exports.getRarityColor            = getRarityColor;
  exports.getItemSymbol             = getItemSymbol;
  exports.calculateInventoryValue   = calculateInventoryValue;
  exports.getEquipmentStats         = getEquipmentStats;
  exports.createInventoryState      = createInventoryState;
  exports.addItemToInventory        = addItemToInventory;
  exports.removeItemFromInventory   = removeItemFromInventory;
  exports.equipItem                 = equipItem;
  exports.unequipItem               = unequipItem;

})(typeof module !== 'undefined' ? module.exports : (window.DashboardInventory = {}));
