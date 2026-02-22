// loot.js
/**
 * ZION Cross-System Loot & Reward Engine
 * Unified item reward pipeline for dungeons, fishing, card games, events, quests.
 * No project dependencies.
 */

(function(exports) {
  'use strict';

  // ---------------------------------------------------------------------------
  // Seeded pseudo-random number generator (mulberry32)
  // ---------------------------------------------------------------------------

  function createRng(seed) {
    var s = (seed >>> 0) || 0xDEADBEEF;
    return function() {
      s += 0x6D2B79F5;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) >>> 0;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashString(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function seedFrom(base, suffix) {
    return hashString(String(base) + '|' + String(suffix));
  }

  // ---------------------------------------------------------------------------
  // Loot Tables
  // ---------------------------------------------------------------------------

  var LOOT_TABLES = {
    dungeon_easy: {
      guaranteed: [{ item: 'iron_ore', qty: 2 }],
      rolls: 2,
      pool: [
        { item: 'stone',        w: 30, qty: 3 },
        { item: 'herbs',        w: 25, qty: 2 },
        { item: 'iron_ore',     w: 20, qty: 1 },
        { item: 'crystal',      w: 10, qty: 1 },
        { item: 'scroll',       w: 10, qty: 1 },
        { item: 'ancient_coin', w:  5, qty: 1 }
      ]
    },
    dungeon_medium: {
      guaranteed: [
        { item: 'iron_ore', qty: 3 },
        { item: 'crystal',  qty: 1 }
      ],
      rolls: 3,
      pool: [
        { item: 'crystal',      w: 25, qty: 1 },
        { item: 'gold_dust',    w: 20, qty: 1 },
        { item: 'iron_ore',     w: 15, qty: 2 },
        { item: 'scroll',       w: 15, qty: 2 },
        { item: 'fossil',       w: 10, qty: 1 },
        { item: 'star_fragment',w:  5, qty: 1 },
        { item: 'ancient_coin', w: 10, qty: 1 }
      ]
    },
    dungeon_hard: {
      guaranteed: [
        { item: 'crystal',   qty: 2 },
        { item: 'gold_dust', qty: 2 }
      ],
      rolls: 4,
      pool: [
        { item: 'star_fragment', w: 15, qty: 1 },
        { item: 'crystal',       w: 20, qty: 2 },
        { item: 'gold_dust',     w: 20, qty: 2 },
        { item: 'fossil',        w: 15, qty: 1 },
        { item: 'ancient_coin',  w: 15, qty: 1 },
        { item: 'scroll',        w: 10, qty: 2 },
        { item: 'elixir',        w:  5, qty: 1 }
      ]
    },
    dungeon_boss: {
      guaranteed: [
        { item: 'star_fragment', qty: 1 },
        { item: 'gold_dust',     qty: 3 }
      ],
      rolls: 2,
      pool: [
        { item: 'star_fragment', w: 30, qty: 1 },
        { item: 'crystal',       w: 25, qty: 2 },
        { item: 'ancient_coin',  w: 20, qty: 2 },
        { item: 'elixir',        w: 15, qty: 1 },
        { item: 'fossil',        w: 10, qty: 1 }
      ]
    },
    fishing_common: {
      guaranteed: [],
      rolls: 1,
      pool: [
        { item: 'herbs',   w: 40, qty: 1 },
        { item: 'wood',    w: 30, qty: 1 },
        { item: 'feather', w: 20, qty: 1 },
        { item: 'clay',    w: 10, qty: 1 }
      ]
    },
    fishing_rare: {
      guaranteed: [{ item: 'crystal', qty: 1 }],
      rolls: 1,
      pool: [
        { item: 'gold_dust',     w: 30, qty: 1 },
        { item: 'ancient_coin',  w: 25, qty: 1 },
        { item: 'star_fragment', w: 10, qty: 1 },
        { item: 'fossil',        w: 20, qty: 1 },
        { item: 'scroll',        w: 15, qty: 1 }
      ]
    },
    card_win: {
      guaranteed: [],
      rolls: 1,
      pool: [
        { item: 'scroll',       w: 30, qty: 1 },
        { item: 'gold_dust',    w: 25, qty: 1 },
        { item: 'crystal',      w: 20, qty: 1 },
        { item: 'feather',      w: 15, qty: 2 },
        { item: 'ancient_coin', w: 10, qty: 1 }
      ]
    },
    card_tournament: {
      guaranteed: [{ item: 'gold_dust', qty: 2 }],
      rolls: 2,
      pool: [
        { item: 'crystal',       w: 25, qty: 1 },
        { item: 'star_fragment', w: 15, qty: 1 },
        { item: 'ancient_coin',  w: 20, qty: 1 },
        { item: 'scroll',        w: 20, qty: 2 },
        { item: 'fossil',        w: 10, qty: 1 },
        { item: 'elixir',        w: 10, qty: 1 }
      ]
    },
    event_participation: {
      guaranteed: [],
      rolls: 1,
      pool: [
        { item: 'herbs',     w: 25, qty: 2 },
        { item: 'honey',     w: 20, qty: 1 },
        { item: 'silk',      w: 20, qty: 1 },
        { item: 'feather',   w: 15, qty: 2 },
        { item: 'clay',      w: 10, qty: 2 },
        { item: 'gold_dust', w: 10, qty: 1 }
      ]
    },
    event_top_contributor: {
      guaranteed: [{ item: 'star_fragment', qty: 1 }],
      rolls: 2,
      pool: [
        { item: 'crystal',      w: 25, qty: 2 },
        { item: 'gold_dust',    w: 25, qty: 2 },
        { item: 'ancient_coin', w: 20, qty: 1 },
        { item: 'fossil',       w: 15, qty: 1 },
        { item: 'elixir',       w: 15, qty: 1 }
      ]
    },
    quest_easy: {
      guaranteed: [],
      rolls: 1,
      pool: [
        { item: 'herbs',   w: 30, qty: 2 },
        { item: 'wood',    w: 25, qty: 3 },
        { item: 'stone',   w: 25, qty: 3 },
        { item: 'feather', w: 15, qty: 1 },
        { item: 'honey',   w:  5, qty: 1 }
      ]
    },
    quest_hard: {
      guaranteed: [{ item: 'gold_dust', qty: 1 }],
      rolls: 2,
      pool: [
        { item: 'crystal',       w: 25, qty: 1 },
        { item: 'iron_ore',      w: 20, qty: 2 },
        { item: 'scroll',        w: 20, qty: 1 },
        { item: 'ancient_coin',  w: 15, qty: 1 },
        { item: 'fossil',        w: 10, qty: 1 },
        { item: 'star_fragment', w: 10, qty: 1 }
      ]
    },
    gathering_normal: {
      guaranteed: [],
      rolls: 1,
      pool: [
        { item: 'herbs',   w: 25, qty: 1 },
        { item: 'wood',    w: 25, qty: 1 },
        { item: 'stone',   w: 25, qty: 1 },
        { item: 'clay',    w: 15, qty: 1 },
        { item: 'feather', w: 10, qty: 1 }
      ]
    },
    gathering_rare: {
      guaranteed: [],
      rolls: 1,
      pool: [
        { item: 'iron_ore',  w: 30, qty: 1 },
        { item: 'crystal',   w: 20, qty: 1 },
        { item: 'gold_dust', w: 15, qty: 1 },
        { item: 'honey',     w: 20, qty: 1 },
        { item: 'silk',      w: 15, qty: 1 }
      ]
    }
  };

  // ---------------------------------------------------------------------------
  // Spark Rewards
  // ---------------------------------------------------------------------------

  var SPARK_REWARDS = {
    dungeon_easy:            { base: 20,  variance: 10 },
    dungeon_medium:          { base: 50,  variance: 20 },
    dungeon_hard:            { base: 100, variance: 30 },
    dungeon_boss:            { base: 75,  variance: 25 },
    card_win:                { base: 10,  variance:  5 },
    card_tournament:         { base: 50,  variance: 20 },
    fishing_common:          { base:  3,  variance:  2 },
    fishing_rare:            { base: 15,  variance: 10 },
    quest_easy:              { base: 15,  variance:  5 },
    quest_hard:              { base: 50,  variance: 15 },
    event_participation:     { base: 10,  variance:  5 },
    event_top_contributor:   { base: 40,  variance: 15 }
  };

  // ---------------------------------------------------------------------------
  // Item rarity classification (used for getRarityOfDrop)
  // ---------------------------------------------------------------------------

  var ITEM_RARITY = {
    // Common items
    stone:        'common',
    herbs:        'common',
    wood:         'common',
    feather:      'common',
    clay:         'common',
    honey:        'common',
    // Uncommon items
    iron_ore:     'uncommon',
    silk:         'uncommon',
    // Rare items
    crystal:      'rare',
    gold_dust:    'rare',
    scroll:       'rare',
    fossil:       'rare',
    ancient_coin: 'rare',
    // Epic items
    star_fragment:'epic',
    elixir:       'epic'
  };

  // Rarity rank for comparison (higher = better)
  var RARITY_RANK = {
    common:   0,
    uncommon: 1,
    rare:     2,
    epic:     3
  };

  // ---------------------------------------------------------------------------
  // Core: weighted random selection from pool
  // ---------------------------------------------------------------------------

  /**
   * Single weighted random pick from a pool entry array.
   * Each entry must have { w } (weight). Returns the chosen entry.
   * @param {Array}  pool  - Array of { item, w, qty }
   * @param {number} seed  - Optional numeric seed; uses Math.random when absent
   * @returns {Object} The chosen pool entry
   */
  function rollFromPool(pool, seed) {
    if (!pool || pool.length === 0) return null;

    var rng = (seed !== undefined && seed !== null)
      ? createRng(typeof seed === 'string' ? hashString(seed) : (seed >>> 0))
      : function() { return Math.random(); };

    var totalWeight = 0;
    for (var i = 0; i < pool.length; i++) {
      totalWeight += pool[i].w;
    }

    var roll = rng() * totalWeight;
    var cumulative = 0;
    for (var j = 0; j < pool.length; j++) {
      cumulative += pool[j].w;
      if (roll < cumulative) {
        return pool[j];
      }
    }
    // Fallback to last entry (floating point edge case)
    return pool[pool.length - 1];
  }

  // ---------------------------------------------------------------------------
  // Core: roll a full loot table
  // ---------------------------------------------------------------------------

  /**
   * Roll loot from a named table using optional seed for determinism.
   * Returns guaranteed items plus `table.rolls` random picks from pool.
   * @param {string} tableId - Key in LOOT_TABLES
   * @param {number} [seed]  - Optional seed for deterministic results
   * @returns {{ items: Array<{item:string, qty:number}>, spark: number }}
   */
  function rollLoot(tableId, seed) {
    var table = LOOT_TABLES[tableId];
    if (!table) {
      return { items: [], spark: 0 };
    }

    // Accumulate items keyed by item id for merging duplicates
    var accumulated = {};

    // Add guaranteed items
    for (var g = 0; g < table.guaranteed.length; g++) {
      var gItem = table.guaranteed[g];
      if (accumulated[gItem.item] === undefined) {
        accumulated[gItem.item] = 0;
      }
      accumulated[gItem.item] += gItem.qty;
    }

    // Perform random rolls from pool
    if (table.pool && table.pool.length > 0) {
      for (var r = 0; r < table.rolls; r++) {
        var rollSeed = (seed !== undefined && seed !== null)
          ? seedFrom(seed, tableId + '_roll_' + r)
          : undefined;
        var pick = rollFromPool(table.pool, rollSeed);
        if (pick) {
          if (accumulated[pick.item] === undefined) {
            accumulated[pick.item] = 0;
          }
          accumulated[pick.item] += pick.qty;
        }
      }
    }

    // Convert accumulated map to item array
    var items = [];
    var keys = Object.keys(accumulated);
    for (var k = 0; k < keys.length; k++) {
      items.push({ item: keys[k], qty: accumulated[keys[k]] });
    }

    // Calculate spark reward (use tableId as rewardId when available)
    var spark = calculateSparkReward(tableId, 1);

    return { items: items, spark: spark };
  }

  // ---------------------------------------------------------------------------
  // Spark reward calculation
  // ---------------------------------------------------------------------------

  /**
   * Calculate a Spark reward with variance for a given activity.
   * @param {string} rewardId         - Key in SPARK_REWARDS
   * @param {number} bonusMultiplier  - e.g. 1.5 for 50% bonus; default 1
   * @returns {number} Spark amount (integer)
   */
  function calculateSparkReward(rewardId, bonusMultiplier) {
    var config = SPARK_REWARDS[rewardId];
    if (!config) return 0;

    var multiplier = (typeof bonusMultiplier === 'number' && bonusMultiplier > 0)
      ? bonusMultiplier : 1;

    // Apply variance: base +/- (variance * random [-1, 1])
    var varianceOffset = Math.floor((Math.random() * 2 - 1) * config.variance);
    var raw = config.base + varianceOffset;

    // Clamp to at least 1
    var result = Math.max(1, Math.round(raw * multiplier));
    return result;
  }

  // ---------------------------------------------------------------------------
  // Loot merging
  // ---------------------------------------------------------------------------

  /**
   * Combine two loot result objects, summing item quantities and spark.
   * @param {{ items: Array, spark: number }} loot1
   * @param {{ items: Array, spark: number }} loot2
   * @returns {{ items: Array<{item:string, qty:number}>, spark: number }}
   */
  function mergeLoot(loot1, loot2) {
    var accumulated = {};

    function absorb(loot) {
      if (!loot || !loot.items) return;
      for (var i = 0; i < loot.items.length; i++) {
        var entry = loot.items[i];
        if (accumulated[entry.item] === undefined) {
          accumulated[entry.item] = 0;
        }
        accumulated[entry.item] += entry.qty;
      }
    }

    absorb(loot1);
    absorb(loot2);

    var items = [];
    var keys = Object.keys(accumulated);
    for (var k = 0; k < keys.length; k++) {
      items.push({ item: keys[k], qty: accumulated[keys[k]] });
    }

    var spark = ((loot1 && loot1.spark) || 0) + ((loot2 && loot2.spark) || 0);

    return { items: items, spark: spark };
  }

  // ---------------------------------------------------------------------------
  // Bonus application
  // ---------------------------------------------------------------------------

  /**
   * Apply multiplier bonuses to a loot result.
   * Supported bonus keys:
   *   double_loot:    qty multiplier of 2
   *   triple_loot:    qty multiplier of 3
   *   spark_bonus:    spark multiplier (value = the multiplier, e.g. 1.5)
   *   item_multiplier: qty multiplier (value = the multiplier)
   *
   * @param {{ items: Array, spark: number }} loot
   * @param {Object} bonuses - e.g. { double_loot: true, spark_bonus: 1.5 }
   * @returns {{ items: Array<{item:string, qty:number}>, spark: number }}
   */
  function applyLootBonuses(loot, bonuses) {
    if (!loot) return { items: [], spark: 0 };
    if (!bonuses) return loot;

    var qtyMultiplier = 1;
    var sparkMultiplier = 1;

    if (bonuses.double_loot) {
      qtyMultiplier *= 2;
    }
    if (bonuses.triple_loot) {
      qtyMultiplier *= 3;
    }
    if (bonuses.item_multiplier && typeof bonuses.item_multiplier === 'number') {
      qtyMultiplier *= bonuses.item_multiplier;
    }
    if (bonuses.spark_bonus && typeof bonuses.spark_bonus === 'number') {
      sparkMultiplier *= bonuses.spark_bonus;
    }

    var newItems = [];
    for (var i = 0; i < loot.items.length; i++) {
      newItems.push({
        item: loot.items[i].item,
        qty:  Math.round(loot.items[i].qty * qtyMultiplier)
      });
    }

    return {
      items: newItems,
      spark: Math.round(loot.spark * sparkMultiplier)
    };
  }

  // ---------------------------------------------------------------------------
  // Table accessors
  // ---------------------------------------------------------------------------

  /**
   * Return a deep copy of a loot table by ID.
   * @param {string} tableId
   * @returns {Object|null}
   */
  function getLootTable(tableId) {
    var table = LOOT_TABLES[tableId];
    if (!table) return null;
    return JSON.parse(JSON.stringify(table));
  }

  /**
   * Return all table IDs as an array.
   * @returns {Array<string>}
   */
  function getAllTables() {
    return Object.keys(LOOT_TABLES);
  }

  // ---------------------------------------------------------------------------
  // Drop rate calculation
  // ---------------------------------------------------------------------------

  /**
   * Calculate the probability (0–1) of receiving at least one of an item
   * from a given table, accounting for guaranteed items and pool rolls.
   * @param {string} tableId
   * @param {string} itemId
   * @returns {number} probability 0–1
   */
  function getDropRate(tableId, itemId) {
    var table = LOOT_TABLES[tableId];
    if (!table) return 0;

    // Check guaranteed
    for (var g = 0; g < table.guaranteed.length; g++) {
      if (table.guaranteed[g].item === itemId) {
        return 1; // Always drops
      }
    }

    if (!table.pool || table.pool.length === 0) return 0;

    // Compute per-roll probability
    var totalWeight = 0;
    var itemWeight = 0;
    for (var i = 0; i < table.pool.length; i++) {
      totalWeight += table.pool[i].w;
      if (table.pool[i].item === itemId) {
        itemWeight += table.pool[i].w;
      }
    }

    if (totalWeight === 0) return 0;

    var probPerRoll = itemWeight / totalWeight;
    // P(at least one in N rolls) = 1 - (1 - p)^N
    var probNone = Math.pow(1 - probPerRoll, table.rolls);
    return 1 - probNone;
  }

  // ---------------------------------------------------------------------------
  // Rarity classification
  // ---------------------------------------------------------------------------

  /**
   * Determine the overall rarity of a drop based on highest-rarity item.
   * @param {{ items: Array<{item:string, qty:number}> }} loot
   * @returns {'common'|'uncommon'|'rare'|'epic'}
   */
  function getRarityOfDrop(loot) {
    if (!loot || !loot.items || loot.items.length === 0) return 'common';

    var highestRank = 0;
    var highestLabel = 'common';

    for (var i = 0; i < loot.items.length; i++) {
      var rarity = ITEM_RARITY[loot.items[i].item] || 'common';
      var rank = RARITY_RANK[rarity] || 0;
      if (rank > highestRank) {
        highestRank = rank;
        highestLabel = rarity;
      }
    }

    return highestLabel;
  }

  // ---------------------------------------------------------------------------
  // Loot history
  // ---------------------------------------------------------------------------

  /**
   * Create a new empty loot history object.
   * @returns {{ drops: Array, totalItems: Object, totalSpark: number }}
   */
  function createLootHistory() {
    return {
      drops: [],
      totalItems: {},
      totalSpark: 0
    };
  }

  /**
   * Record a loot drop into a history object (mutates history in place).
   * @param {Object} history  - Created by createLootHistory
   * @param {string} tableId  - Which table was rolled
   * @param {{ items: Array, spark: number }} loot - The drop result
   */
  function recordDrop(history, tableId, loot) {
    if (!history || !loot) return;

    var entry = {
      tableId: tableId,
      items: loot.items ? loot.items.slice() : [],
      spark: loot.spark || 0,
      timestamp: Date.now()
    };

    history.drops.push(entry);
    history.totalSpark += entry.spark;

    for (var i = 0; i < entry.items.length; i++) {
      var it = entry.items[i];
      if (history.totalItems[it.item] === undefined) {
        history.totalItems[it.item] = 0;
      }
      history.totalItems[it.item] += it.qty;
    }
  }

  // ---------------------------------------------------------------------------
  // Formatting helpers
  // ---------------------------------------------------------------------------

  // Human-readable item names
  var ITEM_NAMES = {
    stone:        'Stone',
    herbs:        'Herbs',
    wood:         'Wood',
    feather:      'Feather',
    clay:         'Clay',
    honey:        'Honey',
    iron_ore:     'Iron Ore',
    silk:         'Silk',
    crystal:      'Crystal',
    gold_dust:    'Gold Dust',
    scroll:       'Scroll',
    fossil:       'Fossil',
    ancient_coin: 'Ancient Coin',
    star_fragment:'Star Fragment',
    elixir:       'Elixir'
  };

  // CSS class per rarity
  var RARITY_CSS = {
    common:   'loot-common',
    uncommon: 'loot-uncommon',
    rare:     'loot-rare',
    epic:     'loot-epic'
  };

  /**
   * Format a loot drop into an HTML string for display.
   * @param {{ items: Array<{item:string, qty:number}>, spark: number }} loot
   * @returns {string} HTML
   */
  function formatLootDrop(loot) {
    if (!loot || (!loot.items.length && !loot.spark)) {
      return '<div class="loot-drop loot-empty">No loot</div>';
    }

    var html = '<div class="loot-drop">';

    for (var i = 0; i < loot.items.length; i++) {
      var entry = loot.items[i];
      var name = ITEM_NAMES[entry.item] || entry.item;
      var rarity = ITEM_RARITY[entry.item] || 'common';
      var cssClass = RARITY_CSS[rarity] || 'loot-common';
      html += '<span class="loot-item ' + cssClass + '">'
        + entry.qty + 'x ' + name
        + '</span>';
    }

    if (loot.spark) {
      html += '<span class="loot-spark">+' + loot.spark + ' Spark</span>';
    }

    html += '</div>';
    return html;
  }

  /**
   * Format a summary of loot history statistics.
   * @param {Array<{ items: Array, spark: number, tableId: string }>} lootHistory
   *        Can be raw array of drops OR a history object (has .drops property)
   * @returns {string} HTML summary
   */
  function formatLootSummary(lootHistory) {
    // Accept either raw array or history object
    var drops = Array.isArray(lootHistory) ? lootHistory
      : (lootHistory && lootHistory.drops ? lootHistory.drops : []);

    if (!drops || drops.length === 0) {
      return '<div class="loot-summary loot-empty">No loot history</div>';
    }

    var totalSpark = 0;
    var totalItems = {};
    var dropCount = drops.length;

    for (var d = 0; d < drops.length; d++) {
      var drop = drops[d];
      totalSpark += drop.spark || 0;
      var items = drop.items || [];
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (totalItems[it.item] === undefined) totalItems[it.item] = 0;
        totalItems[it.item] += it.qty;
      }
    }

    var html = '<div class="loot-summary">';
    html += '<div class="loot-summary-header">';
    html += '<span class="loot-drop-count">' + dropCount + ' drops</span>';
    html += '<span class="loot-total-spark">Total Spark: ' + totalSpark + '</span>';
    html += '</div>';

    html += '<ul class="loot-item-list">';
    var itemKeys = Object.keys(totalItems);
    for (var k = 0; k < itemKeys.length; k++) {
      var id = itemKeys[k];
      var name = ITEM_NAMES[id] || id;
      var rarity = ITEM_RARITY[id] || 'common';
      var cssClass = RARITY_CSS[rarity] || 'loot-common';
      html += '<li class="' + cssClass + '">' + name + ': ' + totalItems[id] + '</li>';
    }
    html += '</ul></div>';

    return html;
  }

  // ---------------------------------------------------------------------------
  // Exports
  // ---------------------------------------------------------------------------

  exports.LOOT_TABLES    = LOOT_TABLES;
  exports.SPARK_REWARDS  = SPARK_REWARDS;
  exports.ITEM_RARITY    = ITEM_RARITY;
  exports.ITEM_NAMES     = ITEM_NAMES;

  exports.rollLoot               = rollLoot;
  exports.rollFromPool           = rollFromPool;
  exports.calculateSparkReward   = calculateSparkReward;
  exports.mergeLoot              = mergeLoot;
  exports.applyLootBonuses       = applyLootBonuses;
  exports.getLootTable           = getLootTable;
  exports.getAllTables            = getAllTables;
  exports.formatLootDrop         = formatLootDrop;
  exports.formatLootSummary      = formatLootSummary;
  exports.createLootHistory      = createLootHistory;
  exports.recordDrop             = recordDrop;
  exports.getRarityOfDrop        = getRarityOfDrop;
  exports.getDropRate            = getDropRate;

  // Internal helpers exposed for testing
  exports._createRng   = createRng;
  exports._hashString  = hashString;
  exports._seedFrom    = seedFrom;

})(typeof module !== 'undefined' ? module.exports : (window.Loot = {}));
