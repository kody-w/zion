(function(exports) {
  'use strict';

  // ==========================================================================
  // ZONE SHOPS — Give Spark a purpose. Each zone sells unique items.
  // ==========================================================================

  var ZONE_SHOPS = {
    nexus: {
      name: 'Nexus General Store',
      keeper: 'The Keeper',
      items: [
        { id: 'herb_mint', price: 5, stock: 10, desc: 'Fresh mint herb' },
        { id: 'food_bread', price: 8, stock: 5, desc: 'Hearty bread' },
        { id: 'bait_worm', price: 3, stock: 20, desc: 'Fishing bait' },
        { id: 'item_scroll', price: 15, stock: 3, desc: 'Knowledge scroll' },
        { id: 'tool_map', price: 25, stock: 1, desc: 'Zone map — reveals resource nodes' }
      ]
    },
    gardens: {
      name: 'Green Thumb Nursery',
      keeper: 'Sage Thornberry',
      items: [
        { id: 'seed_wildflower', price: 8, stock: 10, desc: 'Grows into sellable flowers' },
        { id: 'seed_lotus', price: 30, stock: 2, desc: 'Rare lotus — high sell value' },
        { id: 'tool_watering_can', price: 40, stock: 1, desc: 'Waters 3 plants at once' },
        { id: 'fertilizer', price: 12, stock: 5, desc: 'Doubles next harvest yield' },
        { id: 'herb_ginseng', price: 20, stock: 3, desc: 'Rare herb for potions' }
      ]
    },
    athenaeum: {
      name: 'Scholar\'s Supplies',
      keeper: 'Librarian Owlsworth',
      items: [
        { id: 'item_book', price: 25, stock: 3, desc: 'Unlocks a random recipe' },
        { id: 'art_ink', price: 10, stock: 5, desc: 'For crafting scrolls' },
        { id: 'crystal_clear', price: 35, stock: 2, desc: 'Crafting component' },
        { id: 'potion_wisdom', price: 50, stock: 1, desc: '+50% XP for 10 minutes' },
        { id: 'item_scroll', price: 15, stock: 5, desc: 'Knowledge scroll' }
      ]
    },
    studio: {
      name: 'Artisan\'s Workshop',
      keeper: 'Maestro Palette',
      items: [
        { id: 'art_canvas', price: 15, stock: 5, desc: 'For creating art' },
        { id: 'art_clay', price: 8, stock: 8, desc: 'Sculpting material' },
        { id: 'cloth_silk', price: 25, stock: 3, desc: 'Fine crafting fabric' },
        { id: 'art_pigment', price: 5, stock: 10, desc: 'Color pigments' },
        { id: 'tool_chisel', price: 45, stock: 1, desc: '+25% craft quality' }
      ]
    },
    wilds: {
      name: 'Ranger\'s Outpost',
      keeper: 'Scout Ashwood',
      items: [
        { id: 'gear_rope', price: 10, stock: 5, desc: 'For exploring deeper' },
        { id: 'food_mushroom', price: 6, stock: 8, desc: 'Foraged mushroom' },
        { id: 'bait_cricket', price: 8, stock: 10, desc: 'Premium fishing bait' },
        { id: 'tool_compass', price: 35, stock: 1, desc: 'Shows rare resource direction' },
        { id: 'potion_energy', price: 30, stock: 2, desc: '+25% sprint duration' }
      ]
    },
    agora: {
      name: 'Grand Bazaar',
      keeper: 'Merchant Goldleaf',
      items: [
        { id: 'ingredient_flour', price: 4, stock: 15, desc: 'Baking ingredient' },
        { id: 'ingredient_egg', price: 3, stock: 15, desc: 'Cooking ingredient' },
        { id: 'food_honey', price: 12, stock: 5, desc: 'Sweet honey' },
        { id: 'metal_copper', price: 15, stock: 5, desc: 'Crafting metal' },
        { id: 'metal_silver', price: 40, stock: 2, desc: 'Precious crafting metal' }
      ]
    },
    commons: {
      name: 'Builder\'s Depot',
      keeper: 'Mason Ironwood',
      items: [
        { id: 'wood_oak', price: 6, stock: 10, desc: 'Sturdy building wood' },
        { id: 'stone_common', price: 5, stock: 10, desc: 'Building stone' },
        { id: 'stone_marble', price: 25, stock: 3, desc: 'Decorative marble' },
        { id: 'tool_hammer', price: 30, stock: 2, desc: 'Build structures faster' },
        { id: 'metal_copper', price: 15, stock: 5, desc: 'For fittings and fixtures' }
      ]
    },
    arena: {
      name: 'Champion\'s Armory',
      keeper: 'Warden Steelheart',
      items: [
        { id: 'metal_copper', price: 15, stock: 5, desc: 'For weapon crafting' },
        { id: 'stone_obsidian', price: 50, stock: 1, desc: 'Rare dark stone' },
        { id: 'food_bread', price: 8, stock: 5, desc: 'Battle rations' },
        { id: 'potion_healing', price: 20, stock: 3, desc: 'Restores warmth' },
        { id: 'item_trophy', price: 100, stock: 1, desc: 'Display in your home' }
      ]
    }
  };

  // ==========================================================================
  // DAILY QUESTS — Reason to come back tomorrow
  // ==========================================================================

  var DAILY_QUEST_TEMPLATES = [
    { id: 'harvest_daily', title: 'Daily Harvest', desc: 'Harvest {count} items in {zone}', type: 'harvest', count: [3, 5, 8], zones: ['gardens', 'wilds', 'commons'], reward: { spark: 25, xp: 15 } },
    { id: 'craft_daily', title: 'Daily Craft', desc: 'Craft {count} items', type: 'craft', count: [1, 2, 3], zones: null, reward: { spark: 30, xp: 20 } },
    { id: 'explore_daily', title: 'Daily Explorer', desc: 'Visit {count} different zones', type: 'visit_zones', count: [2, 3, 4], zones: null, reward: { spark: 20, xp: 12 } },
    { id: 'social_daily', title: 'Daily Social', desc: 'Talk to {count} NPCs', type: 'talk_npc', count: [3, 5, 7], zones: null, reward: { spark: 20, xp: 10 } },
    { id: 'fish_daily', title: 'Daily Catch', desc: 'Catch {count} fish in {zone}', type: 'fish', count: [2, 3, 5], zones: ['gardens', 'wilds', 'commons'], reward: { spark: 25, xp: 15 } },
    { id: 'trade_daily', title: 'Daily Merchant', desc: 'Buy {count} items from shops', type: 'shop_buy', count: [2, 3, 5], zones: null, reward: { spark: 15, xp: 10 } },
    { id: 'build_daily', title: 'Daily Builder', desc: 'Place {count} structures in Commons', type: 'build', count: [1, 2], zones: ['commons'], reward: { spark: 35, xp: 25 } },
    { id: 'walk_daily', title: 'Daily Wanderer', desc: 'Walk {count} meters', type: 'walk', count: [200, 500, 1000], zones: null, reward: { spark: 15, xp: 8 } }
  ];

  // Streak bonuses: consecutive daily completions multiply rewards
  var STREAK_MULTIPLIERS = [1.0, 1.1, 1.2, 1.3, 1.5, 1.5, 2.0]; // day 1-7

  /**
   * Generate daily quests for a given day (deterministic from date seed)
   * @param {string} dateStr - ISO date string (YYYY-MM-DD)
   * @returns {Array} 3 daily quests
   */
  function generateDailyQuests(dateStr) {
    // Deterministic seed from date so all players get same dailies
    var seed = 0;
    for (var i = 0; i < dateStr.length; i++) {
      seed = ((seed << 5) - seed) + dateStr.charCodeAt(i);
      seed = seed & seed; // Convert to 32-bit int
    }
    seed = Math.abs(seed);

    var quests = [];
    var usedTypes = {};

    for (var q = 0; q < 3; q++) {
      // Pick a template we haven't used yet
      var idx = (seed + q * 37) % DAILY_QUEST_TEMPLATES.length;
      var attempts = 0;
      while (usedTypes[DAILY_QUEST_TEMPLATES[idx].id] && attempts < DAILY_QUEST_TEMPLATES.length) {
        idx = (idx + 1) % DAILY_QUEST_TEMPLATES.length;
        attempts++;
      }
      var template = DAILY_QUEST_TEMPLATES[idx];
      usedTypes[template.id] = true;

      // Pick count and zone from template options
      var countIdx = (seed + q * 13) % template.count.length;
      var count = template.count[countIdx];
      var zone = null;
      if (template.zones && template.zones.length > 0) {
        var zoneIdx = (seed + q * 7) % template.zones.length;
        zone = template.zones[zoneIdx];
      }

      // Build quest description
      var desc = template.desc.replace('{count}', count);
      if (zone) {
        var zoneNames = { gardens: 'the Gardens', wilds: 'the Wilds', commons: 'the Commons' };
        desc = desc.replace('{zone}', zoneNames[zone] || zone);
      }

      quests.push({
        id: 'daily_' + dateStr + '_' + q,
        templateId: template.id,
        title: template.title,
        description: desc,
        type: template.type,
        target: count,
        progress: 0,
        zone: zone,
        reward: { spark: template.reward.spark, xp: template.reward.xp },
        completed: false,
        date: dateStr
      });
    }

    return quests;
  }

  /**
   * Track daily quest progress
   * @param {Array} dailyQuests - Current daily quests
   * @param {string} actionType - Action performed (harvest, craft, visit_zones, etc.)
   * @param {Object} context - {zone, count, item}
   * @returns {Array} Quests that were just completed
   */
  function trackDailyProgress(dailyQuests, actionType, context) {
    if (!dailyQuests || !Array.isArray(dailyQuests)) return [];

    var justCompleted = [];
    context = context || {};

    dailyQuests.forEach(function(quest) {
      if (quest.completed) return;
      if (quest.type !== actionType) return;

      // Check zone requirement
      if (quest.zone && context.zone && context.zone !== quest.zone) return;

      quest.progress += (context.count || 1);

      if (quest.progress >= quest.target) {
        quest.completed = true;
        quest.progress = quest.target;
        justCompleted.push(quest);
      }
    });

    return justCompleted;
  }

  /**
   * Get streak info for daily quest completion
   * @param {Object} playerData - {dailyStreak, lastDailyDate}
   * @param {string} todayStr - Today's date string
   * @returns {Object} {streak, multiplier, isNewDay}
   */
  function getDailyStreak(playerData, todayStr) {
    if (!playerData) return { streak: 0, multiplier: 1.0, isNewDay: true };

    var isNewDay = playerData.lastDailyDate !== todayStr;
    var streak = playerData.dailyStreak || 0;

    if (isNewDay) {
      // Check if consecutive (yesterday)
      var today = new Date(todayStr);
      var last = playerData.lastDailyDate ? new Date(playerData.lastDailyDate) : null;
      var diff = last ? Math.floor((today - last) / 86400000) : 999;

      if (diff === 1) {
        streak++;
      } else if (diff > 1) {
        streak = 0; // Streak broken
      }
    }

    var multIdx = Math.min(streak, STREAK_MULTIPLIERS.length - 1);
    return {
      streak: streak,
      multiplier: STREAK_MULTIPLIERS[multIdx],
      isNewDay: isNewDay
    };
  }

  // ==========================================================================
  // COLLECTION JOURNAL — Completionist drive
  // ==========================================================================

  var COLLECTION_CATEGORIES = {
    items_found: { name: 'Items Discovered', icon: '📦', total: 0 },
    recipes_learned: { name: 'Recipes Learned', icon: '📜', total: 0 },
    zones_visited: { name: 'Zones Explored', icon: '🗺️', total: 8 },
    npcs_befriended: { name: 'NPCs Befriended', icon: '🤝', total: 0 },
    fish_caught: { name: 'Fish Caught', icon: '🐟', total: 0 },
    quests_completed: { name: 'Quests Completed', icon: '⭐', total: 0 },
    buildings_placed: { name: 'Structures Built', icon: '🏠', total: 0 },
    daily_streaks: { name: 'Best Daily Streak', icon: '🔥', total: 7 }
  };

  /**
   * Create a new collection state
   */
  function createCollection() {
    return {
      items_found: {},      // itemId → true
      recipes_learned: {},   // recipeId → true
      zones_visited: {},     // zoneId → true
      npcs_befriended: {},   // npcId → true
      fish_caught: {},       // fishId → true
      quests_completed: {},  // questId → true
      buildings_placed: 0,
      daily_streaks: 0,
      totalDiscovered: 0
    };
  }

  /**
   * Record a discovery in the collection
   * @returns {Object|null} {category, id, isNew, totalInCategory, message} or null if not new
   */
  function recordDiscovery(collection, category, id) {
    if (!collection || !COLLECTION_CATEGORIES[category]) return null;

    if (category === 'buildings_placed' || category === 'daily_streaks') {
      var oldVal = collection[category] || 0;
      var newVal = typeof id === 'number' ? id : oldVal + 1;
      if (newVal <= oldVal) return null;
      collection[category] = newVal;
      collection.totalDiscovered++;
      return {
        category: category,
        id: newVal,
        isNew: true,
        totalInCategory: newVal,
        message: COLLECTION_CATEGORIES[category].icon + ' ' + COLLECTION_CATEGORIES[category].name + ': ' + newVal
      };
    }

    if (collection[category][id]) return null; // Already discovered

    collection[category][id] = true;
    collection.totalDiscovered++;

    var count = Object.keys(collection[category]).length;
    return {
      category: category,
      id: id,
      isNew: true,
      totalInCategory: count,
      message: COLLECTION_CATEGORIES[category].icon + ' New discovery! ' + COLLECTION_CATEGORIES[category].name + ': ' + count
    };
  }

  /**
   * Get collection summary for HUD display
   */
  function getCollectionSummary(collection) {
    if (!collection) return { categories: [], percent: 0 };

    var cats = [];
    var totalFound = 0;
    var totalPossible = 0;

    Object.keys(COLLECTION_CATEGORIES).forEach(function(key) {
      var cat = COLLECTION_CATEGORIES[key];
      var found = 0;

      if (key === 'buildings_placed' || key === 'daily_streaks') {
        found = collection[key] || 0;
      } else {
        found = collection[key] ? Object.keys(collection[key]).length : 0;
      }

      cats.push({
        id: key,
        name: cat.name,
        icon: cat.icon,
        found: found,
        total: cat.total || '∞'
      });

      totalFound += found;
      if (cat.total > 0) totalPossible += cat.total;
    });

    return {
      categories: cats,
      totalFound: totalFound,
      percent: totalPossible > 0 ? Math.round((totalFound / totalPossible) * 100) : 0
    };
  }

  // ==========================================================================
  // SHOP OPERATIONS
  // ==========================================================================

  /**
   * Get shop for a zone
   */
  function getShop(zoneId) {
    return ZONE_SHOPS[zoneId] || null;
  }

  /**
   * Buy item from shop
   * @param {string} zoneId - Zone of the shop
   * @param {string} itemId - Item to buy
   * @param {Object} ledger - Economy ledger
   * @param {string} playerId - Buyer
   * @param {Object} inventory - Player inventory
   * @param {number} count - How many to buy (default 1)
   * @returns {Object} {success, message, item, cost}
   */
  function buyFromShop(zoneId, itemId, ledger, playerId, inventory, count) {
    count = count || 1;
    var shop = ZONE_SHOPS[zoneId];
    if (!shop) return { success: false, message: 'No shop in this zone' };

    var shopItem = null;
    for (var i = 0; i < shop.items.length; i++) {
      if (shop.items[i].id === itemId) {
        shopItem = shop.items[i];
        break;
      }
    }

    if (!shopItem) return { success: false, message: 'Item not available' };
    if (shopItem.stock < count) return { success: false, message: 'Not enough stock' };

    var totalCost = shopItem.price * count;

    // Check balance
    if (!ledger || !ledger.balances) return { success: false, message: 'No wallet' };
    var balance = ledger.balances[playerId] || 0;
    if (balance < totalCost) return { success: false, message: 'Not enough Spark (' + totalCost + ' needed, you have ' + Math.floor(balance) + ')' };

    // Deduct Spark
    ledger.balances[playerId] -= totalCost;
    ledger.balances[playerId] = Math.max(0, ledger.balances[playerId]);

    // Add to inventory
    if (inventory && typeof inventory === 'object') {
      if (!inventory.items) inventory.items = {};
      inventory.items[itemId] = (inventory.items[itemId] || 0) + count;
    }

    // Reduce shop stock
    shopItem.stock -= count;

    return {
      success: true,
      message: 'Bought ' + count + 'x ' + itemId.replace(/_/g, ' ') + ' for ' + totalCost + ' Spark',
      item: itemId,
      cost: totalCost,
      newBalance: ledger.balances[playerId]
    };
  }

  /**
   * Restock shop (called on day change)
   */
  function restockShop(zoneId) {
    var template = ZONE_SHOPS[zoneId];
    if (!template) return;
    // Reset stock to defaults
    var defaults = {
      nexus: [10, 5, 20, 3, 1],
      gardens: [10, 2, 1, 5, 3],
      athenaeum: [3, 5, 2, 1, 5],
      studio: [5, 8, 3, 10, 1],
      wilds: [5, 8, 10, 1, 2],
      agora: [15, 15, 5, 5, 2],
      commons: [10, 10, 3, 2, 5],
      arena: [5, 1, 5, 3, 1]
    };
    var stocks = defaults[zoneId] || [];
    for (var i = 0; i < template.items.length && i < stocks.length; i++) {
      template.items[i].stock = stocks[i];
    }
  }

  /**
   * Restock all shops
   */
  function restockAllShops() {
    Object.keys(ZONE_SHOPS).forEach(restockShop);
  }

  // ==========================================================================
  // EXPORTS
  // ==========================================================================

  exports.ZONE_SHOPS = ZONE_SHOPS;
  exports.getShop = getShop;
  exports.buyFromShop = buyFromShop;
  exports.restockShop = restockShop;
  exports.restockAllShops = restockAllShops;

  exports.DAILY_QUEST_TEMPLATES = DAILY_QUEST_TEMPLATES;
  exports.generateDailyQuests = generateDailyQuests;
  exports.trackDailyProgress = trackDailyProgress;
  exports.getDailyStreak = getDailyStreak;
  exports.STREAK_MULTIPLIERS = STREAK_MULTIPLIERS;

  exports.COLLECTION_CATEGORIES = COLLECTION_CATEGORIES;
  exports.createCollection = createCollection;
  exports.recordDiscovery = recordDiscovery;
  exports.getCollectionSummary = getCollectionSummary;

})(typeof module !== 'undefined' ? module.exports : (window.Shops = {}));
