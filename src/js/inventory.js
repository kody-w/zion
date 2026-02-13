/**
 * ZION Inventory & Crafting System
 * Manages player inventory, item stacks, crafting recipes, and resource harvesting
 */

(function(exports) {
  'use strict';

  // ========================================================================
  // ITEM CATALOG - All available items in the game
  // ========================================================================

  const ITEM_CATALOG = {
    // Seeds
    seed_wildflower: {
      id: 'seed_wildflower',
      name: 'Wildflower Seeds',
      type: 'seeds',
      icon: '🌱',
      description: 'Seeds that grow into colorful wildflowers',
      stackable: true,
      maxStack: 99,
      rarity: 'common'
    },
    seed_lotus: {
      id: 'seed_lotus',
      name: 'Lotus Seeds',
      type: 'seeds',
      icon: '🪷',
      description: 'Rare seeds that bloom into mystical lotus flowers',
      stackable: true,
      maxStack: 99,
      rarity: 'rare'
    },
    seed_tree: {
      id: 'seed_tree',
      name: 'Tree Seeds',
      type: 'seeds',
      icon: '🌰',
      description: 'Seeds for planting new trees',
      stackable: true,
      maxStack: 99,
      rarity: 'common'
    },

    // Flowers
    flower_rose: {
      id: 'flower_rose',
      name: 'Rose',
      type: 'flowers',
      icon: '🌹',
      description: 'A beautiful red rose',
      stackable: true,
      maxStack: 50,
      rarity: 'uncommon'
    },
    flower_sunflower: {
      id: 'flower_sunflower',
      name: 'Sunflower',
      type: 'flowers',
      icon: '🌻',
      description: 'A bright yellow sunflower',
      stackable: true,
      maxStack: 50,
      rarity: 'common'
    },
    flower_lotus: {
      id: 'flower_lotus',
      name: 'Lotus Flower',
      type: 'flowers',
      icon: '🪷',
      description: 'A mystical lotus flower',
      stackable: true,
      maxStack: 50,
      rarity: 'rare'
    },
    flower_tulip: {
      id: 'flower_tulip',
      name: 'Tulip',
      type: 'flowers',
      icon: '🌷',
      description: 'A delicate tulip',
      stackable: true,
      maxStack: 50,
      rarity: 'common'
    },
    flower_cherry: {
      id: 'flower_cherry',
      name: 'Cherry Blossom',
      type: 'flowers',
      icon: '🌸',
      description: 'A gentle cherry blossom',
      stackable: true,
      maxStack: 50,
      rarity: 'uncommon'
    },

    // Wood
    wood_oak: {
      id: 'wood_oak',
      name: 'Oak Wood',
      type: 'wood',
      icon: '🪵',
      description: 'Sturdy oak wood for building',
      stackable: true,
      maxStack: 99,
      rarity: 'common'
    },
    wood_pine: {
      id: 'wood_pine',
      name: 'Pine Wood',
      type: 'wood',
      icon: '🌲',
      description: 'Light pine wood',
      stackable: true,
      maxStack: 99,
      rarity: 'common'
    },
    wood_mystical: {
      id: 'wood_mystical',
      name: 'Mystical Wood',
      type: 'wood',
      icon: '✨',
      description: 'Rare wood imbued with energy',
      stackable: true,
      maxStack: 50,
      rarity: 'rare'
    },

    // Stone
    stone_common: {
      id: 'stone_common',
      name: 'Stone',
      type: 'stone',
      icon: '🪨',
      description: 'Common building stone',
      stackable: true,
      maxStack: 99,
      rarity: 'common'
    },
    stone_marble: {
      id: 'stone_marble',
      name: 'Marble',
      type: 'stone',
      icon: '⬜',
      description: 'Polished marble for fine construction',
      stackable: true,
      maxStack: 99,
      rarity: 'uncommon'
    },
    stone_obsidian: {
      id: 'stone_obsidian',
      name: 'Obsidian',
      type: 'stone',
      icon: '⬛',
      description: 'Dark volcanic glass',
      stackable: true,
      maxStack: 50,
      rarity: 'rare'
    },

    // Crystal
    crystal_clear: {
      id: 'crystal_clear',
      name: 'Clear Crystal',
      type: 'crystal',
      icon: '💎',
      description: 'A pristine clear crystal',
      stackable: true,
      maxStack: 50,
      rarity: 'uncommon'
    },
    crystal_amethyst: {
      id: 'crystal_amethyst',
      name: 'Amethyst',
      type: 'crystal',
      icon: '💜',
      description: 'A purple amethyst crystal',
      stackable: true,
      maxStack: 50,
      rarity: 'rare'
    },
    crystal_emerald: {
      id: 'crystal_emerald',
      name: 'Emerald',
      type: 'crystal',
      icon: '💚',
      description: 'A vibrant green emerald',
      stackable: true,
      maxStack: 30,
      rarity: 'legendary'
    },

    // Herbs
    herb_mint: {
      id: 'herb_mint',
      name: 'Mint',
      type: 'herbs',
      icon: '🌿',
      description: 'Refreshing mint leaves',
      stackable: true,
      maxStack: 99,
      rarity: 'common'
    },
    herb_sage: {
      id: 'herb_sage',
      name: 'Sage',
      type: 'herbs',
      icon: '🍃',
      description: 'Aromatic sage for wisdom',
      stackable: true,
      maxStack: 99,
      rarity: 'uncommon'
    },
    herb_ginseng: {
      id: 'herb_ginseng',
      name: 'Ginseng',
      type: 'herbs',
      icon: '🌱',
      description: 'Rare medicinal root',
      stackable: true,
      maxStack: 50,
      rarity: 'rare'
    },
    herb_lavender: {
      id: 'herb_lavender',
      name: 'Lavender',
      type: 'herbs',
      icon: '🪻',
      description: 'Calming lavender flowers',
      stackable: true,
      maxStack: 99,
      rarity: 'common'
    },

    // Food
    food_bread: {
      id: 'food_bread',
      name: 'Bread',
      type: 'food',
      icon: '🍞',
      description: 'Fresh baked bread',
      stackable: true,
      maxStack: 20,
      rarity: 'common'
    },
    food_honey: {
      id: 'food_honey',
      name: 'Honey',
      type: 'food',
      icon: '🍯',
      description: 'Sweet golden honey',
      stackable: true,
      maxStack: 20,
      rarity: 'uncommon'
    },
    food_mushroom: {
      id: 'food_mushroom',
      name: 'Mushroom',
      type: 'food',
      icon: '🍄',
      description: 'Edible forest mushroom',
      stackable: true,
      maxStack: 50,
      rarity: 'common'
    },
    food_berry: {
      id: 'food_berry',
      name: 'Berries',
      type: 'food',
      icon: '🫐',
      description: 'Sweet wild berries',
      stackable: true,
      maxStack: 50,
      rarity: 'common'
    },

    // Tools
    tool_pickaxe: {
      id: 'tool_pickaxe',
      name: 'Pickaxe',
      type: 'tools',
      icon: '⛏️',
      description: 'For mining stone and crystals',
      stackable: false,
      maxStack: 1,
      rarity: 'uncommon'
    },
    tool_axe: {
      id: 'tool_axe',
      name: 'Axe',
      type: 'tools',
      icon: '🪓',
      description: 'For chopping wood',
      stackable: false,
      maxStack: 1,
      rarity: 'uncommon'
    },
    tool_shovel: {
      id: 'tool_shovel',
      name: 'Shovel',
      type: 'tools',
      icon: '🏗️',
      description: 'For digging and planting',
      stackable: false,
      maxStack: 1,
      rarity: 'uncommon'
    },
    tool_hammer: {
      id: 'tool_hammer',
      name: 'Hammer',
      type: 'tools',
      icon: '🔨',
      description: 'For crafting and building',
      stackable: false,
      maxStack: 1,
      rarity: 'uncommon'
    },

    // Crafted Items
    item_workbench: {
      id: 'item_workbench',
      name: 'Workbench',
      type: 'crafted_items',
      icon: '🛠️',
      description: 'Essential crafting station',
      stackable: false,
      maxStack: 1,
      rarity: 'uncommon'
    },
    item_fountain: {
      id: 'item_fountain',
      name: 'Fountain',
      type: 'crafted_items',
      icon: '⛲',
      description: 'Decorative water fountain',
      stackable: false,
      maxStack: 1,
      rarity: 'rare'
    },
    item_lantern: {
      id: 'item_lantern',
      name: 'Lantern',
      type: 'crafted_items',
      icon: '🏮',
      description: 'Provides light in darkness',
      stackable: true,
      maxStack: 10,
      rarity: 'uncommon'
    },
    item_statue: {
      id: 'item_statue',
      name: 'Crystal Statue',
      type: 'crafted_items',
      icon: '🗿',
      description: 'A magnificent crystal statue',
      stackable: false,
      maxStack: 1,
      rarity: 'legendary'
    },

    // Potions
    potion_healing: {
      id: 'potion_healing',
      name: 'Healing Potion',
      type: 'potions',
      icon: '🧪',
      description: 'Restores health and warmth',
      stackable: true,
      maxStack: 20,
      rarity: 'uncommon'
    },
    potion_energy: {
      id: 'potion_energy',
      name: 'Energy Potion',
      type: 'potions',
      icon: '⚡',
      description: 'Boosts movement speed',
      stackable: true,
      maxStack: 20,
      rarity: 'uncommon'
    },
    potion_wisdom: {
      id: 'potion_wisdom',
      name: 'Wisdom Potion',
      type: 'potions',
      icon: '🔮',
      description: 'Enhances learning and insight',
      stackable: true,
      maxStack: 20,
      rarity: 'rare'
    },

    // Knowledge Items (Athenaeum)
    item_scroll: {
      id: 'item_scroll',
      name: 'Ancient Scroll',
      type: 'knowledge',
      icon: '📜',
      description: 'Contains ancient wisdom',
      stackable: true,
      maxStack: 50,
      rarity: 'uncommon'
    },
    item_book: {
      id: 'item_book',
      name: 'Knowledge Book',
      type: 'knowledge',
      icon: '📖',
      description: 'A book of collected knowledge',
      stackable: true,
      maxStack: 20,
      rarity: 'rare'
    },

    // Arena Trophies
    item_trophy: {
      id: 'item_trophy',
      name: 'Trophy',
      type: 'trophies',
      icon: '🏆',
      description: 'A mark of victory',
      stackable: true,
      maxStack: 10,
      rarity: 'rare'
    },

    // === MUSICAL INSTRUMENTS (Studio) ===
    instrument_flute: {
      id: 'instrument_flute',
      name: 'Wooden Flute',
      type: 'instruments',
      icon: '🪈',
      description: 'A hand-carved wooden flute',
      stackable: false,
      maxStack: 1,
      rarity: 'uncommon'
    },
    instrument_drum: {
      id: 'instrument_drum',
      name: 'Hand Drum',
      type: 'instruments',
      icon: '🥁',
      description: 'A resonant hand drum for rhythm',
      stackable: false,
      maxStack: 1,
      rarity: 'uncommon'
    },
    instrument_harp: {
      id: 'instrument_harp',
      name: 'Crystal Harp',
      type: 'instruments',
      icon: '🎵',
      description: 'A harp strung with crystal fibers',
      stackable: false,
      maxStack: 1,
      rarity: 'rare'
    },
    instrument_bell: {
      id: 'instrument_bell',
      name: 'Harmony Bell',
      type: 'instruments',
      icon: '🔔',
      description: 'Rings with perfect pitch',
      stackable: false,
      maxStack: 1,
      rarity: 'rare'
    },

    // === ART SUPPLIES (Studio) ===
    art_pigment: {
      id: 'art_pigment',
      name: 'Pigment',
      type: 'art_supplies',
      icon: '🎨',
      description: 'Colorful pigment for painting',
      stackable: true,
      maxStack: 50,
      rarity: 'common'
    },
    art_canvas: {
      id: 'art_canvas',
      name: 'Canvas',
      type: 'art_supplies',
      icon: '🖼️',
      description: 'Stretched canvas for artwork',
      stackable: true,
      maxStack: 20,
      rarity: 'common'
    },
    art_clay: {
      id: 'art_clay',
      name: 'Sculpting Clay',
      type: 'art_supplies',
      icon: '🏺',
      description: 'Soft clay for sculpting',
      stackable: true,
      maxStack: 50,
      rarity: 'common'
    },
    art_ink: {
      id: 'art_ink',
      name: 'Luminous Ink',
      type: 'art_supplies',
      icon: '✒️',
      description: 'Ink that faintly glows in darkness',
      stackable: true,
      maxStack: 30,
      rarity: 'uncommon'
    },

    // === EXPLORATION GEAR ===
    gear_compass: {
      id: 'gear_compass',
      name: 'Explorer Compass',
      type: 'gear',
      icon: '🧭',
      description: 'Points toward undiscovered locations',
      stackable: false,
      maxStack: 1,
      rarity: 'uncommon'
    },
    gear_map: {
      id: 'gear_map',
      name: 'Zone Map',
      type: 'gear',
      icon: '🗺️',
      description: 'Reveals hidden paths in a zone',
      stackable: true,
      maxStack: 8,
      rarity: 'uncommon'
    },
    gear_spyglass: {
      id: 'gear_spyglass',
      name: 'Spyglass',
      type: 'gear',
      icon: '🔭',
      description: 'See farther into the distance',
      stackable: false,
      maxStack: 1,
      rarity: 'rare'
    },
    gear_rope: {
      id: 'gear_rope',
      name: 'Climbing Rope',
      type: 'gear',
      icon: '🪢',
      description: 'Reach high places safely',
      stackable: true,
      maxStack: 10,
      rarity: 'common'
    },

    // === FOOD (expanded) ===
    food_pie: {
      id: 'food_pie',
      name: 'Fruit Pie',
      type: 'food',
      icon: '🥧',
      description: 'A warm pie made with fresh berries',
      stackable: true,
      maxStack: 10,
      rarity: 'uncommon'
    },
    food_stew: {
      id: 'food_stew',
      name: 'Herb Stew',
      type: 'food',
      icon: '🍲',
      description: 'Hearty stew with healing herbs',
      stackable: true,
      maxStack: 10,
      rarity: 'uncommon'
    },
    food_tea: {
      id: 'food_tea',
      name: 'Calming Tea',
      type: 'food',
      icon: '🍵',
      description: 'Brewed with lavender and mint',
      stackable: true,
      maxStack: 20,
      rarity: 'common'
    },
    food_cake: {
      id: 'food_cake',
      name: 'Celebration Cake',
      type: 'food',
      icon: '🎂',
      description: 'A cake for special occasions',
      stackable: true,
      maxStack: 5,
      rarity: 'rare'
    },

    // === DECORATIVE ITEMS ===
    decor_wreath: {
      id: 'decor_wreath',
      name: 'Flower Wreath',
      type: 'decorations',
      icon: '💐',
      description: 'A woven wreath of wildflowers',
      stackable: true,
      maxStack: 10,
      rarity: 'uncommon'
    },
    decor_banner: {
      id: 'decor_banner',
      name: 'Woven Banner',
      type: 'decorations',
      icon: '🏳️',
      description: 'A decorative banner for buildings',
      stackable: true,
      maxStack: 10,
      rarity: 'uncommon'
    },
    decor_windchime: {
      id: 'decor_windchime',
      name: 'Wind Chime',
      type: 'decorations',
      icon: '🎐',
      description: 'Tinkles gently in the breeze',
      stackable: true,
      maxStack: 5,
      rarity: 'uncommon'
    },
    decor_mosaic: {
      id: 'decor_mosaic',
      name: 'Crystal Mosaic',
      type: 'decorations',
      icon: '🪟',
      description: 'A stunning crystal mosaic tile',
      stackable: true,
      maxStack: 20,
      rarity: 'rare'
    },

    // === RARE COLLECTIBLES ===
    rare_feather: {
      id: 'rare_feather',
      name: 'Phoenix Feather',
      type: 'collectibles',
      icon: '🪶',
      description: 'A feather that radiates gentle warmth',
      stackable: true,
      maxStack: 10,
      rarity: 'legendary'
    },
    rare_pearl: {
      id: 'rare_pearl',
      name: 'Moon Pearl',
      type: 'collectibles',
      icon: '🌕',
      description: 'Glows softly under moonlight',
      stackable: true,
      maxStack: 5,
      rarity: 'legendary'
    },
    rare_fossil: {
      id: 'rare_fossil',
      name: 'Ancient Fossil',
      type: 'collectibles',
      icon: '🦴',
      description: 'A fossilized remnant from before ZION',
      stackable: true,
      maxStack: 10,
      rarity: 'rare'
    },
    rare_starfragment: {
      id: 'rare_starfragment',
      name: 'Star Fragment',
      type: 'collectibles',
      icon: '⭐',
      description: 'A piece of fallen starlight',
      stackable: true,
      maxStack: 5,
      rarity: 'legendary'
    },

    // === CLOTH & FIBER ===
    cloth_silk: {
      id: 'cloth_silk',
      name: 'Silk Thread',
      type: 'cloth',
      icon: '🧵',
      description: 'Fine silk for weaving',
      stackable: true,
      maxStack: 99,
      rarity: 'uncommon'
    },
    cloth_wool: {
      id: 'cloth_wool',
      name: 'Wool',
      type: 'cloth',
      icon: '🧶',
      description: 'Soft wool for crafting',
      stackable: true,
      maxStack: 99,
      rarity: 'common'
    },

    // === METAL ===
    metal_copper: {
      id: 'metal_copper',
      name: 'Copper Ore',
      type: 'metal',
      icon: '🟤',
      description: 'Raw copper for smelting',
      stackable: true,
      maxStack: 99,
      rarity: 'common'
    },
    metal_silver: {
      id: 'metal_silver',
      name: 'Silver Ingot',
      type: 'metal',
      icon: '⬜',
      description: 'Refined silver for fine crafting',
      stackable: true,
      maxStack: 50,
      rarity: 'uncommon'
    },
    metal_gold: {
      id: 'metal_gold',
      name: 'Gold Nugget',
      type: 'metal',
      icon: '🟡',
      description: 'A nugget of pure gold',
      stackable: true,
      maxStack: 30,
      rarity: 'rare'
    }
  };

  // ========================================================================
  // CRAFTING RECIPES
  // ========================================================================

  const RECIPES = [
    // Basic Tools
    {
      id: 'craft_pickaxe',
      name: 'Craft Pickaxe',
      output: { itemId: 'tool_pickaxe', count: 1 },
      requirements: [
        { itemId: 'wood_oak', count: 3 },
        { itemId: 'stone_common', count: 5 }
      ],
      sparkReward: 15
    },
    {
      id: 'craft_axe',
      name: 'Craft Axe',
      output: { itemId: 'tool_axe', count: 1 },
      requirements: [
        { itemId: 'wood_oak', count: 3 },
        { itemId: 'stone_common', count: 4 }
      ],
      sparkReward: 15
    },
    {
      id: 'craft_shovel',
      name: 'Craft Shovel',
      output: { itemId: 'tool_shovel', count: 1 },
      requirements: [
        { itemId: 'wood_oak', count: 2 },
        { itemId: 'stone_common', count: 3 }
      ],
      sparkReward: 12
    },
    {
      id: 'craft_hammer',
      name: 'Craft Hammer',
      output: { itemId: 'tool_hammer', count: 1 },
      requirements: [
        { itemId: 'wood_oak', count: 2 },
        { itemId: 'stone_common', count: 6 }
      ],
      sparkReward: 15
    },

    // Crafting Stations
    {
      id: 'craft_workbench',
      name: 'Craft Workbench',
      output: { itemId: 'item_workbench', count: 1 },
      requirements: [
        { itemId: 'wood_oak', count: 8 },
        { itemId: 'stone_common', count: 4 }
      ],
      sparkReward: 25
    },

    // Decorations
    {
      id: 'craft_fountain',
      name: 'Craft Fountain',
      output: { itemId: 'item_fountain', count: 1 },
      requirements: [
        { itemId: 'stone_marble', count: 12 },
        { itemId: 'crystal_clear', count: 3 }
      ],
      sparkReward: 40
    },
    {
      id: 'craft_lantern',
      name: 'Craft Lantern',
      output: { itemId: 'item_lantern', count: 1 },
      requirements: [
        { itemId: 'wood_oak', count: 2 },
        { itemId: 'crystal_clear', count: 1 }
      ],
      sparkReward: 10
    },
    {
      id: 'craft_statue',
      name: 'Craft Crystal Statue',
      output: { itemId: 'item_statue', count: 1 },
      requirements: [
        { itemId: 'stone_marble', count: 10 },
        { itemId: 'crystal_amethyst', count: 5 },
        { itemId: 'crystal_emerald', count: 2 }
      ],
      sparkReward: 100
    },

    // Potions
    {
      id: 'craft_healing_potion',
      name: 'Brew Healing Potion',
      output: { itemId: 'potion_healing', count: 1 },
      requirements: [
        { itemId: 'herb_mint', count: 3 },
        { itemId: 'crystal_clear', count: 1 }
      ],
      sparkReward: 20
    },
    {
      id: 'craft_energy_potion',
      name: 'Brew Energy Potion',
      output: { itemId: 'potion_energy', count: 1 },
      requirements: [
        { itemId: 'herb_lavender', count: 2 },
        { itemId: 'food_honey', count: 1 }
      ],
      sparkReward: 20
    },
    {
      id: 'craft_wisdom_potion',
      name: 'Brew Wisdom Potion',
      output: { itemId: 'potion_wisdom', count: 1 },
      requirements: [
        { itemId: 'herb_sage', count: 3 },
        { itemId: 'herb_ginseng', count: 2 },
        { itemId: 'crystal_amethyst', count: 1 }
      ],
      sparkReward: 35
    },

    // Food Crafting
    {
      id: 'craft_bread',
      name: 'Bake Bread',
      output: { itemId: 'food_bread', count: 2 },
      requirements: [
        { itemId: 'seed_wildflower', count: 10 }
      ],
      sparkReward: 8
    },

    // Advanced Materials
    {
      id: 'refine_marble',
      name: 'Refine Marble',
      output: { itemId: 'stone_marble', count: 2 },
      requirements: [
        { itemId: 'stone_common', count: 5 }
      ],
      sparkReward: 10
    },
    {
      id: 'craft_mystical_wood',
      name: 'Infuse Mystical Wood',
      output: { itemId: 'wood_mystical', count: 1 },
      requirements: [
        { itemId: 'wood_oak', count: 5 },
        { itemId: 'crystal_clear', count: 2 }
      ],
      sparkReward: 30
    },

    // Knowledge Crafting
    {
      id: 'craft_book',
      name: 'Bind Knowledge Book',
      output: { itemId: 'item_book', count: 1 },
      requirements: [
        { itemId: 'item_scroll', count: 5 },
        { itemId: 'wood_oak', count: 2 }
      ],
      sparkReward: 25
    },

    // Planting
    {
      id: 'plant_lotus',
      name: 'Plant Lotus Seeds',
      output: { itemId: 'flower_lotus', count: 1 },
      requirements: [
        { itemId: 'seed_lotus', count: 3 }
      ],
      sparkReward: 15
    },
    {
      id: 'plant_flowers',
      name: 'Plant Wildflowers',
      output: { itemId: 'flower_sunflower', count: 3 },
      requirements: [
        { itemId: 'seed_wildflower', count: 5 }
      ],
      sparkReward: 8
    },

    // Musical Instruments
    {
      id: 'craft_flute',
      name: 'Carve Wooden Flute',
      output: { itemId: 'instrument_flute', count: 1 },
      requirements: [
        { itemId: 'wood_oak', count: 4 },
        { itemId: 'herb_sage', count: 2 }
      ],
      sparkReward: 20
    },
    {
      id: 'craft_drum',
      name: 'Build Hand Drum',
      output: { itemId: 'instrument_drum', count: 1 },
      requirements: [
        { itemId: 'wood_oak', count: 3 },
        { itemId: 'cloth_wool', count: 4 }
      ],
      sparkReward: 20
    },
    {
      id: 'craft_harp',
      name: 'String Crystal Harp',
      output: { itemId: 'instrument_harp', count: 1 },
      requirements: [
        { itemId: 'wood_mystical', count: 3 },
        { itemId: 'crystal_clear', count: 4 },
        { itemId: 'cloth_silk', count: 6 }
      ],
      sparkReward: 50
    },
    {
      id: 'craft_bell',
      name: 'Cast Harmony Bell',
      output: { itemId: 'instrument_bell', count: 1 },
      requirements: [
        { itemId: 'metal_copper', count: 8 },
        { itemId: 'metal_silver', count: 3 },
        { itemId: 'crystal_clear', count: 2 }
      ],
      sparkReward: 45
    },

    // Art Supplies crafting
    {
      id: 'craft_pigment',
      name: 'Grind Pigment',
      output: { itemId: 'art_pigment', count: 5 },
      requirements: [
        { itemId: 'flower_rose', count: 2 },
        { itemId: 'flower_tulip', count: 2 },
        { itemId: 'stone_common', count: 1 }
      ],
      sparkReward: 8
    },
    {
      id: 'craft_canvas',
      name: 'Stretch Canvas',
      output: { itemId: 'art_canvas', count: 2 },
      requirements: [
        { itemId: 'cloth_wool', count: 4 },
        { itemId: 'wood_oak', count: 2 }
      ],
      sparkReward: 12
    },
    {
      id: 'craft_ink',
      name: 'Brew Luminous Ink',
      output: { itemId: 'art_ink', count: 3 },
      requirements: [
        { itemId: 'crystal_clear', count: 1 },
        { itemId: 'herb_sage', count: 3 },
        { itemId: 'food_berry', count: 5 }
      ],
      sparkReward: 18
    },

    // Exploration Gear
    {
      id: 'craft_compass',
      name: 'Craft Explorer Compass',
      output: { itemId: 'gear_compass', count: 1 },
      requirements: [
        { itemId: 'metal_copper', count: 5 },
        { itemId: 'crystal_clear', count: 2 },
        { itemId: 'metal_silver', count: 1 }
      ],
      sparkReward: 30
    },
    {
      id: 'craft_spyglass',
      name: 'Craft Spyglass',
      output: { itemId: 'gear_spyglass', count: 1 },
      requirements: [
        { itemId: 'metal_copper', count: 6 },
        { itemId: 'crystal_clear', count: 3 },
        { itemId: 'metal_silver', count: 2 }
      ],
      sparkReward: 40
    },
    {
      id: 'craft_rope',
      name: 'Braid Climbing Rope',
      output: { itemId: 'gear_rope', count: 2 },
      requirements: [
        { itemId: 'cloth_wool', count: 6 }
      ],
      sparkReward: 10
    },
    {
      id: 'craft_map',
      name: 'Draw Zone Map',
      output: { itemId: 'gear_map', count: 1 },
      requirements: [
        { itemId: 'art_ink', count: 2 },
        { itemId: 'art_canvas', count: 1 }
      ],
      sparkReward: 15
    },

    // Advanced Food
    {
      id: 'cook_pie',
      name: 'Bake Fruit Pie',
      output: { itemId: 'food_pie', count: 1 },
      requirements: [
        { itemId: 'food_berry', count: 8 },
        { itemId: 'food_honey', count: 1 },
        { itemId: 'seed_wildflower', count: 5 }
      ],
      sparkReward: 18
    },
    {
      id: 'cook_stew',
      name: 'Cook Herb Stew',
      output: { itemId: 'food_stew', count: 1 },
      requirements: [
        { itemId: 'herb_mint', count: 2 },
        { itemId: 'herb_sage', count: 2 },
        { itemId: 'food_mushroom', count: 3 }
      ],
      sparkReward: 15
    },
    {
      id: 'brew_tea',
      name: 'Brew Calming Tea',
      output: { itemId: 'food_tea', count: 3 },
      requirements: [
        { itemId: 'herb_lavender', count: 3 },
        { itemId: 'herb_mint', count: 2 }
      ],
      sparkReward: 10
    },
    {
      id: 'bake_cake',
      name: 'Bake Celebration Cake',
      output: { itemId: 'food_cake', count: 1 },
      requirements: [
        { itemId: 'food_honey', count: 3 },
        { itemId: 'food_berry', count: 5 },
        { itemId: 'food_bread', count: 2 },
        { itemId: 'flower_cherry', count: 2 }
      ],
      sparkReward: 35
    },

    // Decorative Items
    {
      id: 'craft_wreath',
      name: 'Weave Flower Wreath',
      output: { itemId: 'decor_wreath', count: 1 },
      requirements: [
        { itemId: 'flower_rose', count: 3 },
        { itemId: 'flower_tulip', count: 3 },
        { itemId: 'flower_cherry', count: 2 }
      ],
      sparkReward: 15
    },
    {
      id: 'craft_banner',
      name: 'Weave Banner',
      output: { itemId: 'decor_banner', count: 1 },
      requirements: [
        { itemId: 'cloth_silk', count: 5 },
        { itemId: 'art_pigment', count: 3 },
        { itemId: 'wood_oak', count: 2 }
      ],
      sparkReward: 20
    },
    {
      id: 'craft_windchime',
      name: 'Craft Wind Chime',
      output: { itemId: 'decor_windchime', count: 1 },
      requirements: [
        { itemId: 'metal_copper', count: 4 },
        { itemId: 'metal_silver', count: 2 },
        { itemId: 'crystal_clear', count: 1 }
      ],
      sparkReward: 25
    },
    {
      id: 'craft_mosaic',
      name: 'Craft Crystal Mosaic',
      output: { itemId: 'decor_mosaic', count: 1 },
      requirements: [
        { itemId: 'crystal_clear', count: 2 },
        { itemId: 'crystal_amethyst', count: 1 },
        { itemId: 'stone_marble', count: 3 }
      ],
      sparkReward: 30
    },

    // Metal Refining
    {
      id: 'smelt_silver',
      name: 'Smelt Silver',
      output: { itemId: 'metal_silver', count: 2 },
      requirements: [
        { itemId: 'metal_copper', count: 6 },
        { itemId: 'crystal_clear', count: 1 }
      ],
      sparkReward: 15
    },
    {
      id: 'refine_gold',
      name: 'Refine Gold',
      output: { itemId: 'metal_gold', count: 1 },
      requirements: [
        { itemId: 'metal_silver', count: 4 },
        { itemId: 'crystal_amethyst', count: 1 }
      ],
      sparkReward: 25
    },

    // Cloth crafting
    {
      id: 'spin_silk',
      name: 'Spin Silk Thread',
      output: { itemId: 'cloth_silk', count: 3 },
      requirements: [
        { itemId: 'cloth_wool', count: 5 },
        { itemId: 'herb_lavender', count: 2 }
      ],
      sparkReward: 12
    }
  ];

  // ========================================================================
  // ZONE LOOT TABLES - What resources can be harvested in each zone
  // ========================================================================

  const ZONE_LOOT_TABLES = {
    nexus: {
      common: ['stone_common', 'herb_mint', 'cloth_wool'],
      uncommon: ['crystal_clear', 'metal_copper'],
      rare: ['item_scroll']
    },
    gardens: {
      common: ['seed_wildflower', 'herb_mint', 'herb_lavender', 'food_berry', 'cloth_wool'],
      uncommon: ['flower_rose', 'flower_tulip', 'flower_cherry', 'herb_sage', 'food_honey'],
      rare: ['seed_lotus', 'herb_ginseng', 'flower_lotus', 'rare_feather']
    },
    athenaeum: {
      common: ['item_scroll', 'stone_common', 'herb_sage'],
      uncommon: ['crystal_clear', 'art_ink', 'cloth_silk'],
      rare: ['crystal_amethyst', 'item_book', 'rare_fossil']
    },
    studio: {
      common: ['art_pigment', 'art_clay', 'cloth_wool', 'wood_oak'],
      uncommon: ['art_canvas', 'art_ink', 'cloth_silk', 'metal_copper'],
      rare: ['crystal_clear', 'metal_silver', 'rare_pearl']
    },
    wilds: {
      common: ['wood_oak', 'wood_pine', 'stone_common', 'food_mushroom', 'food_berry', 'gear_rope'],
      uncommon: ['herb_ginseng', 'stone_marble', 'metal_copper', 'rare_fossil'],
      rare: ['wood_mystical', 'stone_obsidian', 'crystal_emerald', 'rare_starfragment']
    },
    agora: {
      common: ['cloth_wool', 'food_bread', 'metal_copper'],
      uncommon: ['cloth_silk', 'metal_silver', 'food_honey'],
      rare: ['metal_gold', 'rare_pearl']
    },
    commons: {
      common: ['wood_oak', 'stone_common', 'cloth_wool', 'seed_wildflower'],
      uncommon: ['stone_marble', 'metal_copper', 'flower_sunflower'],
      rare: ['crystal_clear', 'metal_silver']
    },
    arena: {
      common: ['stone_common', 'metal_copper', 'food_mushroom'],
      uncommon: ['stone_marble', 'metal_silver', 'crystal_clear'],
      rare: ['stone_obsidian', 'metal_gold', 'item_trophy']
    }
  };

  /**
   * Roll a harvest drop from a zone's loot table
   * @param {string} zoneId - The zone to harvest in
   * @param {number} luck - Luck factor 0-1 (affects rarity chance)
   * @returns {Object} {itemId: string, count: number, rarity: string}
   */
  function rollHarvestDrop(zoneId, luck) {
    luck = typeof luck === 'number' ? Math.max(0, Math.min(1, luck)) : 0.3;
    var table = ZONE_LOOT_TABLES[zoneId] || ZONE_LOOT_TABLES.nexus;

    // Determine rarity: common 60%, uncommon 30%, rare 10% (shifted by luck)
    var roll = Math.random();
    var rareChance = 0.05 + luck * 0.15;   // 5-20%
    var uncommonChance = 0.25 + luck * 0.1; // 25-35%

    var rarity, pool;
    if (roll < rareChance && table.rare && table.rare.length > 0) {
      rarity = 'rare';
      pool = table.rare;
    } else if (roll < rareChance + uncommonChance && table.uncommon && table.uncommon.length > 0) {
      rarity = 'uncommon';
      pool = table.uncommon;
    } else {
      rarity = 'common';
      pool = table.common;
    }

    var itemId = pool[Math.floor(Math.random() * pool.length)];
    var count = rarity === 'rare' ? 1 : rarity === 'uncommon' ? Math.floor(Math.random() * 2) + 1 : Math.floor(Math.random() * 3) + 1;

    return { itemId: itemId, count: count, rarity: rarity };
  }

  // ========================================================================
  // PLAYER INVENTORY MANAGEMENT
  // ========================================================================

  /**
   * Create a new inventory for a player
   * @returns {Object} Inventory with 20 slots
   */
  function createInventory() {
    return {
      slots: new Array(20).fill(null),
      quickBar: [0, 1, 2, 3, 4] // Indices of slots shown in quick bar
    };
  }

  /**
   * Add item to inventory
   * @param {Object} inventory - Player inventory
   * @param {string} itemId - Item ID from catalog
   * @param {number} count - How many to add
   * @returns {Object} {success: boolean, added: number, message: string}
   */
  function addItem(inventory, itemId, count = 1) {
    const itemData = ITEM_CATALOG[itemId];
    if (!itemData) {
      return { success: false, added: 0, message: 'Unknown item' };
    }

    let remaining = count;

    // If stackable, try to add to existing stacks first
    if (itemData.stackable) {
      for (let i = 0; i < inventory.slots.length; i++) {
        const slot = inventory.slots[i];
        if (slot && slot.itemId === itemId) {
          const canAdd = Math.min(remaining, itemData.maxStack - slot.count);
          slot.count += canAdd;
          remaining -= canAdd;
          if (remaining <= 0) {
            return { success: true, added: count, message: `Added ${count} ${itemData.name}` };
          }
        }
      }
    }

    // Add to empty slots
    for (let i = 0; i < inventory.slots.length; i++) {
      if (inventory.slots[i] === null) {
        const stackSize = itemData.stackable ? Math.min(remaining, itemData.maxStack) : 1;
        inventory.slots[i] = {
          itemId: itemId,
          count: stackSize
        };
        remaining -= stackSize;
        if (remaining <= 0) {
          return { success: true, added: count, message: `Added ${count} ${itemData.name}` };
        }
      }
    }

    // Inventory full
    const added = count - remaining;
    if (added > 0) {
      return { success: true, added: added, message: `Added ${added} ${itemData.name} (inventory full)` };
    }
    return { success: false, added: 0, message: 'Inventory full' };
  }

  /**
   * Remove item from inventory
   * @param {Object} inventory - Player inventory
   * @param {string} itemId - Item ID
   * @param {number} count - How many to remove
   * @returns {Object} {success: boolean, removed: number}
   */
  function removeItem(inventory, itemId, count = 1) {
    let remaining = count;

    for (let i = 0; i < inventory.slots.length; i++) {
      const slot = inventory.slots[i];
      if (slot && slot.itemId === itemId) {
        const removeCount = Math.min(remaining, slot.count);
        slot.count -= removeCount;
        remaining -= removeCount;

        if (slot.count <= 0) {
          inventory.slots[i] = null;
        }

        if (remaining <= 0) {
          return { success: true, removed: count };
        }
      }
    }

    const removed = count - remaining;
    return { success: removed > 0, removed: removed };
  }

  /**
   * Check if player has item
   * @param {Object} inventory - Player inventory
   * @param {string} itemId - Item ID
   * @param {number} count - Required count
   * @returns {boolean}
   */
  function hasItem(inventory, itemId, count = 1) {
    return getItemCount(inventory, itemId) >= count;
  }

  /**
   * Get total count of an item
   * @param {Object} inventory - Player inventory
   * @param {string} itemId - Item ID
   * @returns {number} Total count
   */
  function getItemCount(inventory, itemId) {
    let total = 0;
    for (const slot of inventory.slots) {
      if (slot && slot.itemId === itemId) {
        total += slot.count;
      }
    }
    return total;
  }

  /**
   * Get inventory as readable array
   * @param {Object} inventory - Player inventory
   * @returns {Array} Array of {itemId, name, icon, count, rarity}
   */
  function getInventory(inventory) {
    return inventory.slots.map(slot => {
      if (!slot) return null;
      const itemData = ITEM_CATALOG[slot.itemId];
      return {
        itemId: slot.itemId,
        name: itemData.name,
        icon: itemData.icon,
        description: itemData.description,
        count: slot.count,
        rarity: itemData.rarity,
        type: itemData.type
      };
    });
  }

  /**
   * Check if recipe can be crafted
   * @param {Object} inventory - Player inventory
   * @param {Object} recipe - Recipe object
   * @returns {boolean}
   */
  function canCraft(inventory, recipe) {
    for (const req of recipe.requirements) {
      if (!hasItem(inventory, req.itemId, req.count)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Craft an item from recipe
   * @param {Object} inventory - Player inventory
   * @param {string} recipeId - Recipe ID
   * @returns {Object} {success: boolean, output?: Object, sparkEarned?: number, message: string}
   */
  function craftItem(inventory, recipeId) {
    const recipe = RECIPES.find(r => r.id === recipeId);
    if (!recipe) {
      return { success: false, message: 'Unknown recipe' };
    }

    if (!canCraft(inventory, recipe)) {
      return { success: false, message: 'Missing required materials' };
    }

    // Remove requirements
    for (const req of recipe.requirements) {
      removeItem(inventory, req.itemId, req.count);
    }

    // Add output
    const result = addItem(inventory, recipe.output.itemId, recipe.output.count);

    if (result.success) {
      return {
        success: true,
        output: recipe.output,
        sparkEarned: recipe.sparkReward,
        message: `Crafted ${recipe.name}!`
      };
    } else {
      // Rare case: crafted but couldn't add to inventory
      return {
        success: false,
        message: 'Crafted but inventory full (materials consumed!)'
      };
    }
  }

  /**
   * Get all available recipes (that player can craft right now)
   * @param {Object} inventory - Player inventory
   * @returns {Array} Array of craftable recipes
   */
  function getAvailableRecipes(inventory) {
    return RECIPES.filter(recipe => canCraft(inventory, recipe));
  }

  /**
   * Get all recipes (whether craftable or not)
   * @returns {Array} All recipes
   */
  function getAllRecipes() {
    return RECIPES;
  }

  /**
   * Get item data from catalog
   * @param {string} itemId - Item ID
   * @returns {Object|null} Item data or null
   */
  function getItemData(itemId) {
    return ITEM_CATALOG[itemId] || null;
  }

  // ========================================================================
  // INVENTORY UTILITIES
  // ========================================================================

  var RARITY_ORDER = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };

  function getInventoryStats(inventory) {
    if (!inventory || !inventory.items) return { totalItems: 0, uniqueItems: 0, totalValue: 0 };

    var totalItems = 0;
    var uniqueItems = 0;
    var byRarity = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 };
    var byType = {};

    for (var i = 0; i < inventory.items.length; i++) {
      var slot = inventory.items[i];
      if (slot && slot.id) {
        uniqueItems++;
        totalItems += slot.count || 1;
        var data = ITEM_CATALOG[slot.id];
        if (data) {
          var rarity = data.rarity || 'common';
          byRarity[rarity] = (byRarity[rarity] || 0) + (slot.count || 1);
          var type = data.type || 'misc';
          byType[type] = (byType[type] || 0) + (slot.count || 1);
        }
      }
    }

    return {
      totalItems: totalItems,
      uniqueItems: uniqueItems,
      byRarity: byRarity,
      byType: byType,
      slotsUsed: uniqueItems,
      slotsTotal: inventory.maxSlots || 20
    };
  }

  function sortInventory(inventory, sortBy) {
    if (!inventory || !inventory.items) return;
    sortBy = sortBy || 'type';

    // Separate items from empty slots
    var items = inventory.items.filter(function(s) { return s && s.id; });
    var emptyCount = inventory.items.length - items.length;

    items.sort(function(a, b) {
      var dataA = ITEM_CATALOG[a.id] || {};
      var dataB = ITEM_CATALOG[b.id] || {};

      if (sortBy === 'rarity') {
        var ra = RARITY_ORDER[dataA.rarity || 'common'] || 0;
        var rb = RARITY_ORDER[dataB.rarity || 'common'] || 0;
        if (ra !== rb) return rb - ra; // Higher rarity first
      } else if (sortBy === 'type') {
        if (dataA.type !== dataB.type) return (dataA.type || '').localeCompare(dataB.type || '');
      } else if (sortBy === 'name') {
        return (dataA.name || '').localeCompare(dataB.name || '');
      }

      return (dataA.name || '').localeCompare(dataB.name || '');
    });

    // Rebuild with empty slots at end
    inventory.items = items;
    for (var e = 0; e < emptyCount; e++) {
      inventory.items.push(null);
    }
  }

  function searchInventory(inventory, query) {
    if (!inventory || !inventory.items || !query) return [];
    query = query.toLowerCase();

    var results = [];
    for (var i = 0; i < inventory.items.length; i++) {
      var slot = inventory.items[i];
      if (slot && slot.id) {
        var data = ITEM_CATALOG[slot.id] || {};
        if ((data.name || '').toLowerCase().indexOf(query) !== -1 ||
            (data.description || '').toLowerCase().indexOf(query) !== -1 ||
            (data.type || '').toLowerCase().indexOf(query) !== -1) {
          results.push({ slotIndex: i, item: slot, data: data });
        }
      }
    }
    return results;
  }

  // Export public API
  exports.ITEM_CATALOG = ITEM_CATALOG;
  exports.RECIPES = RECIPES;
  exports.createInventory = createInventory;
  exports.addItem = addItem;
  exports.removeItem = removeItem;
  exports.hasItem = hasItem;
  exports.getItemCount = getItemCount;
  exports.getInventory = getInventory;
  exports.canCraft = canCraft;
  exports.craftItem = craftItem;
  exports.getAvailableRecipes = getAvailableRecipes;
  exports.getAllRecipes = getAllRecipes;
  exports.getItemData = getItemData;
  exports.getInventoryStats = getInventoryStats;
  exports.sortInventory = sortInventory;
  exports.searchInventory = searchInventory;
  exports.ZONE_LOOT_TABLES = ZONE_LOOT_TABLES;
  exports.rollHarvestDrop = rollHarvestDrop;

})(typeof module !== 'undefined' ? module.exports : (window.Inventory = {}));
