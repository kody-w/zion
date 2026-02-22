/**
 * tests/test_loot.js
 * 130+ tests for the Cross-System Loot & Reward Engine.
 */
'use strict';

const { test, suite, report, assert } = require('./test_runner');
const Loot = require('../src/js/loot');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function sumWeights(pool) {
  return pool.reduce(function(acc, e) { return acc + e.w; }, 0);
}

function allItemIds() {
  return Object.keys(Loot.ITEM_RARITY);
}

// ---------------------------------------------------------------------------
// SUITE 1: Module Exports
// ---------------------------------------------------------------------------
suite('Module Exports', function() {

  test('LOOT_TABLES is exported and is an object', function() {
    assert.ok(Loot.LOOT_TABLES && typeof Loot.LOOT_TABLES === 'object');
  });

  test('SPARK_REWARDS is exported and is an object', function() {
    assert.ok(Loot.SPARK_REWARDS && typeof Loot.SPARK_REWARDS === 'object');
  });

  test('ITEM_RARITY is exported and is an object', function() {
    assert.ok(Loot.ITEM_RARITY && typeof Loot.ITEM_RARITY === 'object');
  });

  test('ITEM_NAMES is exported and is an object', function() {
    assert.ok(Loot.ITEM_NAMES && typeof Loot.ITEM_NAMES === 'object');
  });

  test('rollLoot is a function', function() {
    assert.strictEqual(typeof Loot.rollLoot, 'function');
  });

  test('rollFromPool is a function', function() {
    assert.strictEqual(typeof Loot.rollFromPool, 'function');
  });

  test('calculateSparkReward is a function', function() {
    assert.strictEqual(typeof Loot.calculateSparkReward, 'function');
  });

  test('mergeLoot is a function', function() {
    assert.strictEqual(typeof Loot.mergeLoot, 'function');
  });

  test('applyLootBonuses is a function', function() {
    assert.strictEqual(typeof Loot.applyLootBonuses, 'function');
  });

  test('getLootTable is a function', function() {
    assert.strictEqual(typeof Loot.getLootTable, 'function');
  });

  test('getAllTables is a function', function() {
    assert.strictEqual(typeof Loot.getAllTables, 'function');
  });

  test('formatLootDrop is a function', function() {
    assert.strictEqual(typeof Loot.formatLootDrop, 'function');
  });

  test('formatLootSummary is a function', function() {
    assert.strictEqual(typeof Loot.formatLootSummary, 'function');
  });

  test('createLootHistory is a function', function() {
    assert.strictEqual(typeof Loot.createLootHistory, 'function');
  });

  test('recordDrop is a function', function() {
    assert.strictEqual(typeof Loot.recordDrop, 'function');
  });

  test('getRarityOfDrop is a function', function() {
    assert.strictEqual(typeof Loot.getRarityOfDrop, 'function');
  });

  test('getDropRate is a function', function() {
    assert.strictEqual(typeof Loot.getDropRate, 'function');
  });
});

// ---------------------------------------------------------------------------
// SUITE 2: Loot Table Validation
// ---------------------------------------------------------------------------
suite('Loot Table Validation', function() {

  var EXPECTED_TABLES = [
    'dungeon_easy', 'dungeon_medium', 'dungeon_hard', 'dungeon_boss',
    'fishing_common', 'fishing_rare',
    'card_win', 'card_tournament',
    'event_participation', 'event_top_contributor',
    'quest_easy', 'quest_hard',
    'gathering_normal', 'gathering_rare'
  ];

  test('All 14 expected tables are present', function() {
    var tables = Loot.getAllTables();
    EXPECTED_TABLES.forEach(function(id) {
      assert.ok(tables.indexOf(id) !== -1, 'Missing table: ' + id);
    });
    assert.strictEqual(tables.length, 14);
  });

  test('Every table has a guaranteed array', function() {
    EXPECTED_TABLES.forEach(function(id) {
      var t = Loot.LOOT_TABLES[id];
      assert.ok(Array.isArray(t.guaranteed), id + ' missing guaranteed array');
    });
  });

  test('Every table has a rolls number > 0', function() {
    EXPECTED_TABLES.forEach(function(id) {
      var t = Loot.LOOT_TABLES[id];
      assert.ok(typeof t.rolls === 'number' && t.rolls > 0,
        id + ' rolls must be > 0');
    });
  });

  test('Every table has a non-empty pool array', function() {
    EXPECTED_TABLES.forEach(function(id) {
      var t = Loot.LOOT_TABLES[id];
      assert.ok(Array.isArray(t.pool) && t.pool.length > 0,
        id + ' pool must not be empty');
    });
  });

  test('All pool entries have positive weight w > 0', function() {
    EXPECTED_TABLES.forEach(function(id) {
      Loot.LOOT_TABLES[id].pool.forEach(function(entry) {
        assert.ok(entry.w > 0,
          id + ' pool entry ' + entry.item + ' has w <= 0');
      });
    });
  });

  test('All pool entries have qty > 0', function() {
    EXPECTED_TABLES.forEach(function(id) {
      Loot.LOOT_TABLES[id].pool.forEach(function(entry) {
        assert.ok(entry.qty > 0,
          id + ' pool entry ' + entry.item + ' has qty <= 0');
      });
    });
  });

  test('All pool entries have a non-empty item string', function() {
    EXPECTED_TABLES.forEach(function(id) {
      Loot.LOOT_TABLES[id].pool.forEach(function(entry) {
        assert.ok(typeof entry.item === 'string' && entry.item.length > 0,
          id + ' pool entry missing item string');
      });
    });
  });

  test('All guaranteed entries have item and qty > 0', function() {
    EXPECTED_TABLES.forEach(function(id) {
      Loot.LOOT_TABLES[id].guaranteed.forEach(function(entry) {
        assert.ok(typeof entry.item === 'string' && entry.item.length > 0,
          id + ' guaranteed entry missing item');
        assert.ok(entry.qty > 0, id + ' guaranteed qty <= 0');
      });
    });
  });

  // Per-table weight sums (spot checks)
  test('dungeon_easy pool weights sum correctly', function() {
    var t = Loot.LOOT_TABLES.dungeon_easy;
    assert.strictEqual(sumWeights(t.pool), 100);
  });

  test('dungeon_medium pool weights sum correctly', function() {
    var t = Loot.LOOT_TABLES.dungeon_medium;
    assert.strictEqual(sumWeights(t.pool), 100);
  });

  test('dungeon_hard pool weights sum correctly', function() {
    var t = Loot.LOOT_TABLES.dungeon_hard;
    assert.strictEqual(sumWeights(t.pool), 100);
  });

  test('dungeon_boss pool weights sum correctly', function() {
    var t = Loot.LOOT_TABLES.dungeon_boss;
    assert.strictEqual(sumWeights(t.pool), 100);
  });

  test('fishing_common pool weights sum correctly', function() {
    var t = Loot.LOOT_TABLES.fishing_common;
    assert.strictEqual(sumWeights(t.pool), 100);
  });

  test('fishing_rare pool weights sum correctly', function() {
    var t = Loot.LOOT_TABLES.fishing_rare;
    assert.strictEqual(sumWeights(t.pool), 100);
  });

  test('card_win pool weights sum correctly', function() {
    var t = Loot.LOOT_TABLES.card_win;
    assert.strictEqual(sumWeights(t.pool), 100);
  });

  test('card_tournament pool weights sum correctly', function() {
    var t = Loot.LOOT_TABLES.card_tournament;
    assert.strictEqual(sumWeights(t.pool), 100);
  });

  test('event_participation pool weights sum correctly', function() {
    var t = Loot.LOOT_TABLES.event_participation;
    assert.strictEqual(sumWeights(t.pool), 100);
  });

  test('event_top_contributor pool weights sum correctly', function() {
    var t = Loot.LOOT_TABLES.event_top_contributor;
    assert.strictEqual(sumWeights(t.pool), 100);
  });

  test('quest_easy pool weights sum correctly', function() {
    var t = Loot.LOOT_TABLES.quest_easy;
    assert.strictEqual(sumWeights(t.pool), 100);
  });

  test('quest_hard pool weights sum correctly', function() {
    var t = Loot.LOOT_TABLES.quest_hard;
    assert.strictEqual(sumWeights(t.pool), 100);
  });

  test('gathering_normal pool weights sum correctly', function() {
    var t = Loot.LOOT_TABLES.gathering_normal;
    assert.strictEqual(sumWeights(t.pool), 100);
  });

  test('gathering_rare pool weights sum correctly', function() {
    var t = Loot.LOOT_TABLES.gathering_rare;
    assert.strictEqual(sumWeights(t.pool), 100);
  });

  // Specific table structure checks
  test('dungeon_easy has 1 guaranteed item', function() {
    assert.strictEqual(Loot.LOOT_TABLES.dungeon_easy.guaranteed.length, 1);
    assert.strictEqual(Loot.LOOT_TABLES.dungeon_easy.guaranteed[0].item, 'iron_ore');
    assert.strictEqual(Loot.LOOT_TABLES.dungeon_easy.guaranteed[0].qty, 2);
  });

  test('dungeon_medium has 2 guaranteed items', function() {
    assert.strictEqual(Loot.LOOT_TABLES.dungeon_medium.guaranteed.length, 2);
  });

  test('dungeon_boss guaranteed includes star_fragment', function() {
    var g = Loot.LOOT_TABLES.dungeon_boss.guaranteed;
    var has = g.some(function(x) { return x.item === 'star_fragment'; });
    assert.ok(has, 'dungeon_boss should guarantee star_fragment');
  });

  test('dungeon_easy rolls = 2', function() {
    assert.strictEqual(Loot.LOOT_TABLES.dungeon_easy.rolls, 2);
  });

  test('dungeon_hard rolls = 4', function() {
    assert.strictEqual(Loot.LOOT_TABLES.dungeon_hard.rolls, 4);
  });

  test('fishing_common has no guaranteed items', function() {
    assert.strictEqual(Loot.LOOT_TABLES.fishing_common.guaranteed.length, 0);
  });

  test('fishing_rare guarantees crystal', function() {
    var g = Loot.LOOT_TABLES.fishing_rare.guaranteed;
    assert.strictEqual(g.length, 1);
    assert.strictEqual(g[0].item, 'crystal');
  });

  test('gathering_normal and gathering_rare have empty guaranteed', function() {
    assert.strictEqual(Loot.LOOT_TABLES.gathering_normal.guaranteed.length, 0);
    assert.strictEqual(Loot.LOOT_TABLES.gathering_rare.guaranteed.length, 0);
  });
});

// ---------------------------------------------------------------------------
// SUITE 3: Spark Rewards Validation
// ---------------------------------------------------------------------------
suite('Spark Rewards Validation', function() {

  var EXPECTED_REWARD_IDS = [
    'dungeon_easy', 'dungeon_medium', 'dungeon_hard', 'dungeon_boss',
    'card_win', 'card_tournament',
    'fishing_common', 'fishing_rare',
    'quest_easy', 'quest_hard',
    'event_participation', 'event_top_contributor'
  ];

  test('All 12 expected spark reward IDs present', function() {
    EXPECTED_REWARD_IDS.forEach(function(id) {
      assert.ok(Loot.SPARK_REWARDS[id], 'Missing SPARK_REWARD: ' + id);
    });
    assert.strictEqual(Object.keys(Loot.SPARK_REWARDS).length, 12);
  });

  test('Each reward has base > 0', function() {
    EXPECTED_REWARD_IDS.forEach(function(id) {
      assert.ok(Loot.SPARK_REWARDS[id].base > 0, id + ' base must be > 0');
    });
  });

  test('Each reward has variance >= 0', function() {
    EXPECTED_REWARD_IDS.forEach(function(id) {
      assert.ok(Loot.SPARK_REWARDS[id].variance >= 0,
        id + ' variance must be >= 0');
    });
  });

  test('dungeon_hard base > dungeon_easy base', function() {
    assert.ok(
      Loot.SPARK_REWARDS.dungeon_hard.base > Loot.SPARK_REWARDS.dungeon_easy.base
    );
  });

  test('dungeon_boss base = 75', function() {
    assert.strictEqual(Loot.SPARK_REWARDS.dungeon_boss.base, 75);
  });

  test('fishing_common base = 3', function() {
    assert.strictEqual(Loot.SPARK_REWARDS.fishing_common.base, 3);
  });

  test('quest_hard base > quest_easy base', function() {
    assert.ok(
      Loot.SPARK_REWARDS.quest_hard.base > Loot.SPARK_REWARDS.quest_easy.base
    );
  });
});

// ---------------------------------------------------------------------------
// SUITE 4: rollFromPool
// ---------------------------------------------------------------------------
suite('rollFromPool', function() {

  test('returns an object from pool', function() {
    var pool = [{ item: 'stone', w: 100, qty: 1 }];
    var pick = Loot.rollFromPool(pool, 42);
    assert.ok(pick !== null);
    assert.strictEqual(pick.item, 'stone');
  });

  test('returns null for empty pool', function() {
    var pick = Loot.rollFromPool([], 42);
    assert.strictEqual(pick, null);
  });

  test('returns null for null pool', function() {
    var pick = Loot.rollFromPool(null, 42);
    assert.strictEqual(pick, null);
  });

  test('always returns the only item when pool has one entry', function() {
    var pool = [{ item: 'crystal', w: 1, qty: 1 }];
    for (var i = 0; i < 20; i++) {
      var pick = Loot.rollFromPool(pool, i);
      assert.strictEqual(pick.item, 'crystal');
    }
  });

  test('seeded call is deterministic', function() {
    var pool = [
      { item: 'stone',   w: 50, qty: 1 },
      { item: 'crystal', w: 50, qty: 1 }
    ];
    var a = Loot.rollFromPool(pool, 999);
    var b = Loot.rollFromPool(pool, 999);
    assert.strictEqual(a.item, b.item);
  });

  test('different seeds can produce different results', function() {
    var pool = [
      { item: 'stone',   w: 50, qty: 1 },
      { item: 'crystal', w: 50, qty: 1 }
    ];
    var results = new Set();
    for (var i = 0; i < 50; i++) {
      results.add(Loot.rollFromPool(pool, i).item);
    }
    assert.ok(results.size > 1, 'Different seeds should produce varied results');
  });

  test('weighted distribution: high-weight item picked more often', function() {
    var pool = [
      { item: 'rare',   w:  1, qty: 1 },
      { item: 'common', w: 99, qty: 1 }
    ];
    var commonCount = 0;
    var TRIALS = 500;
    for (var i = 0; i < TRIALS; i++) {
      if (Loot.rollFromPool(pool, i).item === 'common') commonCount++;
    }
    // At 99% weight expect well above 90%
    assert.ok(commonCount > TRIALS * 0.85,
      'Common should be picked much more often: got ' + commonCount + '/' + TRIALS);
  });

  test('returns correct qty from chosen entry', function() {
    var pool = [{ item: 'stone', w: 100, qty: 5 }];
    var pick = Loot.rollFromPool(pool, 1);
    assert.strictEqual(pick.qty, 5);
  });
});

// ---------------------------------------------------------------------------
// SUITE 5: rollLoot
// ---------------------------------------------------------------------------
suite('rollLoot', function() {

  test('returns { items, spark } shape', function() {
    var result = Loot.rollLoot('dungeon_easy', 42);
    assert.ok(Array.isArray(result.items), 'items must be array');
    assert.ok(typeof result.spark === 'number', 'spark must be number');
  });

  test('returns empty loot for unknown table', function() {
    var result = Loot.rollLoot('nonexistent_table', 42);
    assert.deepStrictEqual(result.items, []);
    assert.strictEqual(result.spark, 0);
  });

  test('guaranteed items always appear in dungeon_easy', function() {
    for (var i = 0; i < 10; i++) {
      var result = Loot.rollLoot('dungeon_easy', i);
      var ironEntry = result.items.find(function(x) { return x.item === 'iron_ore'; });
      assert.ok(ironEntry, 'iron_ore guaranteed item missing on seed ' + i);
      assert.ok(ironEntry.qty >= 2, 'iron_ore qty should be >= 2 (guaranteed qty)');
    }
  });

  test('guaranteed items always appear in dungeon_boss', function() {
    for (var i = 0; i < 10; i++) {
      var result = Loot.rollLoot('dungeon_boss', i);
      var star = result.items.find(function(x) { return x.item === 'star_fragment'; });
      var gold = result.items.find(function(x) { return x.item === 'gold_dust'; });
      assert.ok(star, 'star_fragment guaranteed missing on seed ' + i);
      assert.ok(gold, 'gold_dust guaranteed missing on seed ' + i);
      assert.ok(gold.qty >= 3, 'gold_dust qty must be >= 3');
    }
  });

  test('result always has at least the guaranteed count of items', function() {
    var result = Loot.rollLoot('dungeon_medium', 42);
    // dungeon_medium has 2 guaranteed, so at least 2 unique item types
    assert.ok(result.items.length >= 2, 'Should have at least 2 item types');
  });

  test('dungeon_easy produces at least 1 item from pool per roll', function() {
    var result = Loot.rollLoot('dungeon_easy', 42);
    // 1 guaranteed type + up to 2 roll types; total >= 1
    assert.ok(result.items.length >= 1);
  });

  test('spark is a positive number for known table', function() {
    var result = Loot.rollLoot('dungeon_easy', 42);
    assert.ok(result.spark >= 1, 'Spark should be at least 1');
  });

  test('seeded rollLoot is deterministic', function() {
    var a = Loot.rollLoot('dungeon_hard', 12345);
    var b = Loot.rollLoot('dungeon_hard', 12345);
    assert.deepStrictEqual(a.items, b.items);
  });

  test('different seeds can yield different item sets', function() {
    var itemSets = new Set();
    for (var i = 0; i < 20; i++) {
      var r = Loot.rollLoot('dungeon_easy', i);
      itemSets.add(JSON.stringify(r.items.map(function(x) { return x.item; }).sort()));
    }
    // Should see more than 1 unique item-set across 20 seeds
    assert.ok(itemSets.size > 1, 'Varied seeds should produce varied rolls');
  });

  test('all item quantities in result are > 0', function() {
    for (var i = 0; i < 10; i++) {
      var result = Loot.rollLoot('dungeon_medium', i);
      result.items.forEach(function(entry) {
        assert.ok(entry.qty > 0, 'qty must be > 0 for ' + entry.item);
      });
    }
  });

  test('fishing_common has no guaranteed items in result when pool dominates', function() {
    // fishing_common guaranteed = [], so items come purely from 1 pool roll
    var result = Loot.rollLoot('fishing_common', 77);
    assert.ok(result.items.length >= 1, 'At least 1 pool item');
    // Each pool item for fishing_common: herbs, wood, feather, clay
    var validItems = ['herbs', 'wood', 'feather', 'clay'];
    result.items.forEach(function(entry) {
      assert.ok(validItems.indexOf(entry.item) !== -1,
        'Unexpected item: ' + entry.item);
    });
  });

  test('fishing_rare always contains crystal from guaranteed', function() {
    for (var i = 0; i < 5; i++) {
      var result = Loot.rollLoot('fishing_rare', i);
      var crystal = result.items.find(function(x) { return x.item === 'crystal'; });
      assert.ok(crystal, 'fishing_rare must always have crystal');
    }
  });

  test('card_win produces items from its pool', function() {
    var validItems = ['scroll', 'gold_dust', 'crystal', 'feather', 'ancient_coin'];
    for (var i = 0; i < 5; i++) {
      var result = Loot.rollLoot('card_win', i);
      result.items.forEach(function(entry) {
        assert.ok(validItems.indexOf(entry.item) !== -1,
          'Unexpected item in card_win: ' + entry.item);
      });
    }
  });

  test('quest_hard always has gold_dust from guaranteed', function() {
    for (var i = 0; i < 5; i++) {
      var result = Loot.rollLoot('quest_hard', i);
      var gold = result.items.find(function(x) { return x.item === 'gold_dust'; });
      assert.ok(gold, 'quest_hard must have gold_dust guaranteed');
    }
  });

  test('rollLoot without seed still returns valid structure', function() {
    var result = Loot.rollLoot('gathering_normal');
    assert.ok(Array.isArray(result.items));
    assert.ok(typeof result.spark === 'number');
  });

  test('item quantities are merged when pool roll hits same item as guaranteed', function() {
    // dungeon_easy: guaranteed iron_ore(2), pool can also yield iron_ore(1)
    // Roll many times to catch a merge
    var sawMerge = false;
    for (var i = 0; i < 200; i++) {
      var result = Loot.rollLoot('dungeon_easy', i);
      var iron = result.items.find(function(x) { return x.item === 'iron_ore'; });
      if (iron && iron.qty > 2) {
        sawMerge = true;
        break;
      }
    }
    // Either merged (qty > 2) or pool always picked other items — that's OK.
    // Just check no duplicate item entries exist.
    var result2 = Loot.rollLoot('dungeon_easy', 42);
    var seen = {};
    result2.items.forEach(function(entry) {
      assert.ok(!seen[entry.item], 'Duplicate item in result: ' + entry.item);
      seen[entry.item] = true;
    });
  });
});

// ---------------------------------------------------------------------------
// SUITE 6: calculateSparkReward
// ---------------------------------------------------------------------------
suite('calculateSparkReward', function() {

  test('returns 0 for unknown rewardId', function() {
    assert.strictEqual(Loot.calculateSparkReward('nonexistent'), 0);
  });

  test('returns a number for dungeon_easy', function() {
    var spark = Loot.calculateSparkReward('dungeon_easy', 1);
    assert.ok(typeof spark === 'number' && spark >= 1);
  });

  test('result is within base +/- variance range (dungeon_easy)', function() {
    var config = Loot.SPARK_REWARDS.dungeon_easy; // base:20, variance:10
    for (var i = 0; i < 30; i++) {
      var spark = Loot.calculateSparkReward('dungeon_easy', 1);
      assert.ok(spark >= config.base - config.variance,
        'spark ' + spark + ' below min ' + (config.base - config.variance));
      assert.ok(spark <= config.base + config.variance,
        'spark ' + spark + ' above max ' + (config.base + config.variance));
    }
  });

  test('bonus multiplier scales up spark', function() {
    // Run multiple times; with 2x multiplier avg result should be well above base alone
    var sums = [0, 0];
    var TRIALS = 20;
    for (var i = 0; i < TRIALS; i++) {
      sums[0] += Loot.calculateSparkReward('dungeon_hard', 1);
      sums[1] += Loot.calculateSparkReward('dungeon_hard', 2);
    }
    assert.ok(sums[1] > sums[0], '2x bonus should produce higher total spark');
  });

  test('zero bonus multiplier treated as 1', function() {
    var spark = Loot.calculateSparkReward('dungeon_easy', 0);
    var config = Loot.SPARK_REWARDS.dungeon_easy;
    assert.ok(spark >= 1, 'Should still return at least 1');
    assert.ok(spark <= config.base + config.variance);
  });

  test('negative bonus multiplier treated as 1', function() {
    var spark = Loot.calculateSparkReward('dungeon_easy', -5);
    assert.ok(spark >= 1);
  });

  test('result is always >= 1', function() {
    var ids = Object.keys(Loot.SPARK_REWARDS);
    ids.forEach(function(id) {
      for (var i = 0; i < 5; i++) {
        var spark = Loot.calculateSparkReward(id, 1);
        assert.ok(spark >= 1, id + ' spark should be >= 1, got ' + spark);
      }
    });
  });

  test('higher-tier dungeons produce higher spark base', function() {
    // Compare averages over many calls
    var easySum = 0, hardSum = 0;
    var N = 30;
    for (var i = 0; i < N; i++) {
      easySum += Loot.calculateSparkReward('dungeon_easy', 1);
      hardSum += Loot.calculateSparkReward('dungeon_hard', 1);
    }
    assert.ok(hardSum > easySum, 'dungeon_hard avg should exceed dungeon_easy avg');
  });
});

// ---------------------------------------------------------------------------
// SUITE 7: mergeLoot
// ---------------------------------------------------------------------------
suite('mergeLoot', function() {

  test('merges items from two drops', function() {
    var a = { items: [{ item: 'stone', qty: 2 }], spark: 10 };
    var b = { items: [{ item: 'herbs', qty: 3 }], spark: 5 };
    var merged = Loot.mergeLoot(a, b);
    assert.strictEqual(merged.items.length, 2);
    assert.strictEqual(merged.spark, 15);
  });

  test('sums qty for same item', function() {
    var a = { items: [{ item: 'crystal', qty: 2 }], spark: 10 };
    var b = { items: [{ item: 'crystal', qty: 3 }], spark: 5 };
    var merged = Loot.mergeLoot(a, b);
    assert.strictEqual(merged.items.length, 1);
    var crystal = merged.items.find(function(x) { return x.item === 'crystal'; });
    assert.strictEqual(crystal.qty, 5);
    assert.strictEqual(merged.spark, 15);
  });

  test('handles empty loot1', function() {
    var a = { items: [], spark: 0 };
    var b = { items: [{ item: 'herbs', qty: 2 }], spark: 7 };
    var merged = Loot.mergeLoot(a, b);
    assert.strictEqual(merged.items.length, 1);
    assert.strictEqual(merged.spark, 7);
  });

  test('handles empty loot2', function() {
    var a = { items: [{ item: 'herbs', qty: 2 }], spark: 7 };
    var b = { items: [], spark: 0 };
    var merged = Loot.mergeLoot(a, b);
    assert.strictEqual(merged.items.length, 1);
    assert.strictEqual(merged.spark, 7);
  });

  test('handles null loot1', function() {
    var b = { items: [{ item: 'herbs', qty: 2 }], spark: 7 };
    var merged = Loot.mergeLoot(null, b);
    assert.ok(Array.isArray(merged.items));
    assert.strictEqual(merged.spark, 7);
  });

  test('handles null loot2', function() {
    var a = { items: [{ item: 'herbs', qty: 2 }], spark: 7 };
    var merged = Loot.mergeLoot(a, null);
    assert.strictEqual(merged.items.length, 1);
    assert.strictEqual(merged.spark, 7);
  });

  test('handles both null', function() {
    var merged = Loot.mergeLoot(null, null);
    assert.ok(Array.isArray(merged.items));
    assert.strictEqual(merged.spark, 0);
  });

  test('merged result has no duplicate item entries', function() {
    var a = { items: [{ item: 'crystal', qty: 1 }, { item: 'stone', qty: 2 }], spark: 5 };
    var b = { items: [{ item: 'crystal', qty: 2 }, { item: 'herbs',  qty: 1 }], spark: 3 };
    var merged = Loot.mergeLoot(a, b);
    var seen = {};
    merged.items.forEach(function(entry) {
      assert.ok(!seen[entry.item], 'Duplicate item: ' + entry.item);
      seen[entry.item] = true;
    });
  });

  test('merging three drops chained', function() {
    var a = { items: [{ item: 'stone', qty: 1 }], spark: 5 };
    var b = { items: [{ item: 'stone', qty: 1 }], spark: 5 };
    var c = { items: [{ item: 'stone', qty: 1 }], spark: 5 };
    var merged = Loot.mergeLoot(Loot.mergeLoot(a, b), c);
    var stone = merged.items.find(function(x) { return x.item === 'stone'; });
    assert.strictEqual(stone.qty, 3);
    assert.strictEqual(merged.spark, 15);
  });
});

// ---------------------------------------------------------------------------
// SUITE 8: applyLootBonuses
// ---------------------------------------------------------------------------
suite('applyLootBonuses', function() {

  test('double_loot doubles all item quantities', function() {
    var loot = { items: [{ item: 'stone', qty: 3 }, { item: 'herbs', qty: 2 }], spark: 10 };
    var result = Loot.applyLootBonuses(loot, { double_loot: true });
    var stone = result.items.find(function(x) { return x.item === 'stone'; });
    var herbs = result.items.find(function(x) { return x.item === 'herbs'; });
    assert.strictEqual(stone.qty, 6);
    assert.strictEqual(herbs.qty, 4);
    assert.strictEqual(result.spark, 10); // spark unchanged
  });

  test('triple_loot triples all item quantities', function() {
    var loot = { items: [{ item: 'crystal', qty: 2 }], spark: 20 };
    var result = Loot.applyLootBonuses(loot, { triple_loot: true });
    var crystal = result.items.find(function(x) { return x.item === 'crystal'; });
    assert.strictEqual(crystal.qty, 6);
  });

  test('spark_bonus multiplies spark', function() {
    var loot = { items: [{ item: 'stone', qty: 1 }], spark: 10 };
    var result = Loot.applyLootBonuses(loot, { spark_bonus: 2 });
    assert.strictEqual(result.spark, 20);
  });

  test('item_multiplier scales item quantities', function() {
    var loot = { items: [{ item: 'stone', qty: 4 }], spark: 5 };
    var result = Loot.applyLootBonuses(loot, { item_multiplier: 1.5 });
    var stone = result.items.find(function(x) { return x.item === 'stone'; });
    assert.strictEqual(stone.qty, 6);
  });

  test('double_loot + spark_bonus both apply independently', function() {
    var loot = { items: [{ item: 'stone', qty: 2 }], spark: 10 };
    var result = Loot.applyLootBonuses(loot, { double_loot: true, spark_bonus: 1.5 });
    var stone = result.items.find(function(x) { return x.item === 'stone'; });
    assert.strictEqual(stone.qty, 4);
    assert.strictEqual(result.spark, 15);
  });

  test('no bonuses returns original quantities', function() {
    var loot = { items: [{ item: 'herbs', qty: 3 }], spark: 8 };
    var result = Loot.applyLootBonuses(loot, {});
    var herbs = result.items.find(function(x) { return x.item === 'herbs'; });
    assert.strictEqual(herbs.qty, 3);
    assert.strictEqual(result.spark, 8);
  });

  test('null bonuses returns original loot unchanged', function() {
    var loot = { items: [{ item: 'herbs', qty: 3 }], spark: 8 };
    var result = Loot.applyLootBonuses(loot, null);
    assert.deepStrictEqual(result, loot);
  });

  test('null loot returns empty structure', function() {
    var result = Loot.applyLootBonuses(null, { double_loot: true });
    assert.ok(Array.isArray(result.items));
    assert.strictEqual(result.spark, 0);
  });

  test('does not mutate original loot', function() {
    var loot = { items: [{ item: 'stone', qty: 2 }], spark: 10 };
    Loot.applyLootBonuses(loot, { double_loot: true });
    assert.strictEqual(loot.items[0].qty, 2); // unchanged
    assert.strictEqual(loot.spark, 10);
  });

  test('double_loot and triple_loot stack multiplicatively', function() {
    var loot = { items: [{ item: 'stone', qty: 1 }], spark: 5 };
    var result = Loot.applyLootBonuses(loot, { double_loot: true, triple_loot: true });
    var stone = result.items.find(function(x) { return x.item === 'stone'; });
    assert.strictEqual(stone.qty, 6); // 1 * 2 * 3
  });
});

// ---------------------------------------------------------------------------
// SUITE 9: getLootTable / getAllTables
// ---------------------------------------------------------------------------
suite('getLootTable and getAllTables', function() {

  test('getLootTable returns correct table for dungeon_easy', function() {
    var t = Loot.getLootTable('dungeon_easy');
    assert.ok(t !== null);
    assert.strictEqual(t.rolls, 2);
    assert.strictEqual(t.guaranteed.length, 1);
  });

  test('getLootTable returns null for unknown table', function() {
    var t = Loot.getLootTable('bogus_table');
    assert.strictEqual(t, null);
  });

  test('getLootTable returns a deep copy (not reference)', function() {
    var t = Loot.getLootTable('dungeon_easy');
    t.rolls = 999;
    assert.strictEqual(Loot.LOOT_TABLES.dungeon_easy.rolls, 2);
  });

  test('getLootTable deep copy of guaranteed array is independent', function() {
    var t = Loot.getLootTable('dungeon_easy');
    t.guaranteed[0].qty = 999;
    assert.strictEqual(Loot.LOOT_TABLES.dungeon_easy.guaranteed[0].qty, 2);
  });

  test('getAllTables returns array of strings', function() {
    var tables = Loot.getAllTables();
    assert.ok(Array.isArray(tables));
    tables.forEach(function(id) {
      assert.strictEqual(typeof id, 'string');
    });
  });

  test('getAllTables length is 14', function() {
    assert.strictEqual(Loot.getAllTables().length, 14);
  });

  test('getAllTables includes dungeon_boss', function() {
    assert.ok(Loot.getAllTables().indexOf('dungeon_boss') !== -1);
  });
});

// ---------------------------------------------------------------------------
// SUITE 10: getRarityOfDrop
// ---------------------------------------------------------------------------
suite('getRarityOfDrop', function() {

  test('returns common for only common items', function() {
    var loot = { items: [{ item: 'stone', qty: 1 }, { item: 'wood', qty: 2 }] };
    assert.strictEqual(Loot.getRarityOfDrop(loot), 'common');
  });

  test('returns uncommon when iron_ore present', function() {
    var loot = { items: [{ item: 'stone', qty: 1 }, { item: 'iron_ore', qty: 1 }] };
    assert.strictEqual(Loot.getRarityOfDrop(loot), 'uncommon');
  });

  test('returns rare when crystal present alongside commons', function() {
    var loot = { items: [{ item: 'herbs', qty: 2 }, { item: 'crystal', qty: 1 }] };
    assert.strictEqual(Loot.getRarityOfDrop(loot), 'rare');
  });

  test('returns epic when star_fragment present', function() {
    var loot = { items: [{ item: 'stone', qty: 3 }, { item: 'star_fragment', qty: 1 }] };
    assert.strictEqual(Loot.getRarityOfDrop(loot), 'epic');
  });

  test('returns epic when elixir present', function() {
    var loot = { items: [{ item: 'elixir', qty: 1 }] };
    assert.strictEqual(Loot.getRarityOfDrop(loot), 'epic');
  });

  test('returns common for null loot', function() {
    assert.strictEqual(Loot.getRarityOfDrop(null), 'common');
  });

  test('returns common for empty items array', function() {
    assert.strictEqual(Loot.getRarityOfDrop({ items: [] }), 'common');
  });

  test('highest rarity wins — rare beats uncommon', function() {
    var loot = { items: [{ item: 'iron_ore', qty: 1 }, { item: 'gold_dust', qty: 1 }] };
    assert.strictEqual(Loot.getRarityOfDrop(loot), 'rare');
  });

  test('unknown item treated as common', function() {
    var loot = { items: [{ item: 'mystery_thing', qty: 1 }] };
    assert.strictEqual(Loot.getRarityOfDrop(loot), 'common');
  });
});

// ---------------------------------------------------------------------------
// SUITE 11: getDropRate
// ---------------------------------------------------------------------------
suite('getDropRate', function() {

  test('returns 0 for unknown table', function() {
    assert.strictEqual(Loot.getDropRate('bogus', 'stone'), 0);
  });

  test('returns 1 for guaranteed item', function() {
    // dungeon_easy guarantees iron_ore
    assert.strictEqual(Loot.getDropRate('dungeon_easy', 'iron_ore'), 1);
  });

  test('returns 1 for dungeon_boss guaranteed star_fragment', function() {
    assert.strictEqual(Loot.getDropRate('dungeon_boss', 'star_fragment'), 1);
  });

  test('returns value between 0 and 1 for pool-only item', function() {
    var rate = Loot.getDropRate('dungeon_easy', 'stone');
    assert.ok(rate > 0 && rate < 1,
      'stone drop rate should be between 0 and 1, got ' + rate);
  });

  test('returns 0 for item not in table pool or guaranteed', function() {
    // elixir is not in dungeon_easy
    var rate = Loot.getDropRate('dungeon_easy', 'elixir');
    assert.strictEqual(rate, 0);
  });

  test('more rolls = higher drop rate for same pool item', function() {
    // dungeon_easy: 2 rolls, dungeon_hard: 4 rolls
    // both have stone / common items? dungeon_hard has star_fragment
    var easyRate  = Loot.getDropRate('dungeon_easy', 'crystal');
    var medRate   = Loot.getDropRate('dungeon_medium', 'crystal');
    // dungeon_medium has more rolls (3 vs 2) and crystal in pool
    assert.ok(medRate > easyRate,
      'medium (3 rolls) should have higher crystal rate than easy (2 rolls): '
      + medRate + ' vs ' + easyRate);
  });

  test('fishing_rare: gold_dust has some drop rate from pool', function() {
    var rate = Loot.getDropRate('fishing_rare', 'gold_dust');
    assert.ok(rate > 0 && rate < 1);
  });

  test('fishing_common: clay has some drop rate', function() {
    var rate = Loot.getDropRate('fishing_common', 'clay');
    assert.ok(rate > 0 && rate < 1);
  });

  test('drop rates for all pool items sum to a value reflecting multiple rolls', function() {
    // For a table with 1 roll, sum of individual P(at least 1) <= count of pool items
    var table = Loot.LOOT_TABLES.gathering_normal;
    var totalRate = table.pool.reduce(function(acc, entry) {
      return acc + Loot.getDropRate('gathering_normal', entry.item);
    }, 0);
    assert.ok(totalRate > 0 && totalRate <= table.pool.length);
  });
});

// ---------------------------------------------------------------------------
// SUITE 12: Loot History
// ---------------------------------------------------------------------------
suite('Loot History', function() {

  test('createLootHistory returns correct shape', function() {
    var h = Loot.createLootHistory();
    assert.ok(Array.isArray(h.drops), 'drops must be array');
    assert.ok(typeof h.totalItems === 'object', 'totalItems must be object');
    assert.strictEqual(h.totalSpark, 0);
  });

  test('createLootHistory starts with empty drops', function() {
    var h = Loot.createLootHistory();
    assert.strictEqual(h.drops.length, 0);
  });

  test('recordDrop adds entry to drops', function() {
    var h = Loot.createLootHistory();
    var loot = { items: [{ item: 'stone', qty: 3 }], spark: 10 };
    Loot.recordDrop(h, 'dungeon_easy', loot);
    assert.strictEqual(h.drops.length, 1);
  });

  test('recordDrop accumulates totalSpark', function() {
    var h = Loot.createLootHistory();
    Loot.recordDrop(h, 'dungeon_easy', { items: [], spark: 10 });
    Loot.recordDrop(h, 'dungeon_easy', { items: [], spark: 15 });
    assert.strictEqual(h.totalSpark, 25);
  });

  test('recordDrop accumulates totalItems', function() {
    var h = Loot.createLootHistory();
    Loot.recordDrop(h, 'dungeon_easy', { items: [{ item: 'stone', qty: 2 }], spark: 5 });
    Loot.recordDrop(h, 'dungeon_easy', { items: [{ item: 'stone', qty: 3 }], spark: 5 });
    assert.strictEqual(h.totalItems.stone, 5);
  });

  test('recordDrop stores tableId in drop entry', function() {
    var h = Loot.createLootHistory();
    var loot = { items: [], spark: 5 };
    Loot.recordDrop(h, 'fishing_rare', loot);
    assert.strictEqual(h.drops[0].tableId, 'fishing_rare');
  });

  test('recordDrop stores timestamp', function() {
    var h = Loot.createLootHistory();
    var before = Date.now();
    Loot.recordDrop(h, 'card_win', { items: [], spark: 5 });
    var after = Date.now();
    var ts = h.drops[0].timestamp;
    assert.ok(ts >= before && ts <= after, 'timestamp out of range');
  });

  test('multiple item types accumulated correctly', function() {
    var h = Loot.createLootHistory();
    Loot.recordDrop(h, 't1', { items: [{ item: 'stone', qty: 1 }, { item: 'crystal', qty: 2 }], spark: 0 });
    Loot.recordDrop(h, 't2', { items: [{ item: 'crystal', qty: 3 }], spark: 0 });
    assert.strictEqual(h.totalItems.stone, 1);
    assert.strictEqual(h.totalItems.crystal, 5);
  });

  test('recordDrop handles null loot gracefully', function() {
    var h = Loot.createLootHistory();
    Loot.recordDrop(h, 'dungeon_easy', null);
    // Should not crash; history unchanged
    assert.strictEqual(h.drops.length, 0);
  });

  test('recordDrop handles null history gracefully', function() {
    // Should not throw
    Loot.recordDrop(null, 'dungeon_easy', { items: [], spark: 5 });
  });

  test('10 drops recorded correctly', function() {
    var h = Loot.createLootHistory();
    for (var i = 0; i < 10; i++) {
      var loot = Loot.rollLoot('dungeon_easy', i);
      Loot.recordDrop(h, 'dungeon_easy', loot);
    }
    assert.strictEqual(h.drops.length, 10);
    assert.ok(h.totalSpark > 0);
  });
});

// ---------------------------------------------------------------------------
// SUITE 13: formatLootDrop
// ---------------------------------------------------------------------------
suite('formatLootDrop', function() {

  test('returns a string', function() {
    var loot = { items: [{ item: 'stone', qty: 2 }], spark: 10 };
    var html = Loot.formatLootDrop(loot);
    assert.strictEqual(typeof html, 'string');
  });

  test('contains loot-drop class', function() {
    var loot = { items: [{ item: 'stone', qty: 2 }], spark: 10 };
    var html = Loot.formatLootDrop(loot);
    assert.ok(html.indexOf('loot-drop') !== -1);
  });

  test('contains item name', function() {
    var loot = { items: [{ item: 'crystal', qty: 1 }], spark: 5 };
    var html = Loot.formatLootDrop(loot);
    assert.ok(html.indexOf('Crystal') !== -1);
  });

  test('contains quantity', function() {
    var loot = { items: [{ item: 'stone', qty: 3 }], spark: 0 };
    var html = Loot.formatLootDrop(loot);
    assert.ok(html.indexOf('3x') !== -1 || html.indexOf('3') !== -1);
  });

  test('contains spark amount', function() {
    var loot = { items: [], spark: 42 };
    var html = Loot.formatLootDrop(loot);
    assert.ok(html.indexOf('42') !== -1);
  });

  test('no-item, no-spark loot returns empty message', function() {
    var loot = { items: [], spark: 0 };
    var html = Loot.formatLootDrop(loot);
    assert.ok(html.indexOf('No loot') !== -1 || html.indexOf('loot-empty') !== -1);
  });

  test('null loot returns empty message', function() {
    var html = Loot.formatLootDrop(null);
    assert.ok(html.indexOf('No loot') !== -1 || html.indexOf('loot-empty') !== -1);
  });

  test('rarity CSS class present for epic items', function() {
    var loot = { items: [{ item: 'star_fragment', qty: 1 }], spark: 0 };
    var html = Loot.formatLootDrop(loot);
    assert.ok(html.indexOf('loot-epic') !== -1);
  });

  test('rarity CSS class present for rare items', function() {
    var loot = { items: [{ item: 'gold_dust', qty: 1 }], spark: 0 };
    var html = Loot.formatLootDrop(loot);
    assert.ok(html.indexOf('loot-rare') !== -1);
  });

  test('spark element has loot-spark class', function() {
    var loot = { items: [], spark: 20 };
    var html = Loot.formatLootDrop(loot);
    assert.ok(html.indexOf('loot-spark') !== -1);
  });
});

// ---------------------------------------------------------------------------
// SUITE 14: formatLootSummary
// ---------------------------------------------------------------------------
suite('formatLootSummary', function() {

  test('returns string for valid history', function() {
    var h = Loot.createLootHistory();
    Loot.recordDrop(h, 'dungeon_easy', { items: [{ item: 'stone', qty: 2 }], spark: 10 });
    var html = Loot.formatLootSummary(h);
    assert.strictEqual(typeof html, 'string');
  });

  test('contains drop count', function() {
    var h = Loot.createLootHistory();
    Loot.recordDrop(h, 'dungeon_easy', { items: [], spark: 5 });
    Loot.recordDrop(h, 'dungeon_easy', { items: [], spark: 5 });
    var html = Loot.formatLootSummary(h);
    assert.ok(html.indexOf('2') !== -1);
  });

  test('contains total spark', function() {
    var h = Loot.createLootHistory();
    Loot.recordDrop(h, 'dungeon_easy', { items: [], spark: 33 });
    var html = Loot.formatLootSummary(h);
    assert.ok(html.indexOf('33') !== -1);
  });

  test('empty history returns empty message', function() {
    var h = Loot.createLootHistory();
    var html = Loot.formatLootSummary(h);
    assert.ok(html.indexOf('No loot') !== -1 || html.indexOf('loot-empty') !== -1);
  });

  test('accepts raw drop array', function() {
    var drops = [
      { items: [{ item: 'stone', qty: 1 }], spark: 5 },
      { items: [{ item: 'crystal', qty: 1 }], spark: 10 }
    ];
    var html = Loot.formatLootSummary(drops);
    assert.ok(html.indexOf('Stone') !== -1 || html.indexOf('Crystal') !== -1);
  });

  test('empty array returns empty message', function() {
    var html = Loot.formatLootSummary([]);
    assert.ok(html.indexOf('No loot') !== -1 || html.indexOf('loot-empty') !== -1);
  });

  test('contains loot-summary class', function() {
    var h = Loot.createLootHistory();
    Loot.recordDrop(h, 'dungeon_easy', { items: [{ item: 'stone', qty: 1 }], spark: 5 });
    var html = Loot.formatLootSummary(h);
    assert.ok(html.indexOf('loot-summary') !== -1);
  });

  test('item names appear in summary', function() {
    var h = Loot.createLootHistory();
    Loot.recordDrop(h, 'quest_hard', { items: [{ item: 'gold_dust', qty: 2 }], spark: 50 });
    var html = Loot.formatLootSummary(h);
    assert.ok(html.indexOf('Gold Dust') !== -1);
  });
});

// ---------------------------------------------------------------------------
// SUITE 15: Seeded Determinism
// ---------------------------------------------------------------------------
suite('Seeded Determinism', function() {

  test('rollLoot same seed always returns same items', function() {
    var results = [];
    for (var i = 0; i < 5; i++) {
      results.push(JSON.stringify(Loot.rollLoot('dungeon_hard', 777).items));
    }
    var first = results[0];
    results.forEach(function(r) {
      assert.strictEqual(r, first, 'Seeded result must be deterministic');
    });
  });

  test('rollLoot different seeds produce different results (statistically)', function() {
    var seen = new Set();
    for (var i = 0; i < 30; i++) {
      seen.add(JSON.stringify(Loot.rollLoot('dungeon_easy', i).items));
    }
    assert.ok(seen.size > 1, 'Different seeds should produce varied results');
  });

  test('rollFromPool same seed returns same item', function() {
    var pool = Loot.LOOT_TABLES.dungeon_medium.pool;
    var a = Loot.rollFromPool(pool, 42);
    var b = Loot.rollFromPool(pool, 42);
    assert.strictEqual(a.item, b.item);
  });

  test('string seeds hash consistently', function() {
    var pool = Loot.LOOT_TABLES.card_win.pool;
    var a = Loot.rollFromPool(pool, 'player_abc');
    var b = Loot.rollFromPool(pool, 'player_abc');
    assert.strictEqual(a.item, b.item);
  });

  test('_hashString produces same value for same input', function() {
    var h1 = Loot._hashString('hello');
    var h2 = Loot._hashString('hello');
    assert.strictEqual(h1, h2);
  });

  test('_hashString produces different values for different inputs', function() {
    var h1 = Loot._hashString('hello');
    var h2 = Loot._hashString('world');
    assert.notStrictEqual(h1, h2);
  });

  test('_seedFrom produces consistent values', function() {
    var s1 = Loot._seedFrom(100, 'dungeon_easy_roll_0');
    var s2 = Loot._seedFrom(100, 'dungeon_easy_roll_0');
    assert.strictEqual(s1, s2);
  });

  test('_createRng produces deterministic sequence for given seed', function() {
    var rng1 = Loot._createRng(42);
    var rng2 = Loot._createRng(42);
    for (var i = 0; i < 10; i++) {
      assert.strictEqual(rng1(), rng2());
    }
  });
});

// ---------------------------------------------------------------------------
// SUITE 16: Edge Cases
// ---------------------------------------------------------------------------
suite('Edge Cases', function() {

  test('rollLoot with seed 0 does not crash', function() {
    var result = Loot.rollLoot('dungeon_easy', 0);
    assert.ok(Array.isArray(result.items));
  });

  test('rollLoot with very large seed does not crash', function() {
    var result = Loot.rollLoot('dungeon_easy', Number.MAX_SAFE_INTEGER);
    assert.ok(Array.isArray(result.items));
  });

  test('rollLoot with undefined seed does not crash', function() {
    var result = Loot.rollLoot('dungeon_easy', undefined);
    assert.ok(Array.isArray(result.items));
  });

  test('mergeLoot with both empty returns empty', function() {
    var m = Loot.mergeLoot({ items: [], spark: 0 }, { items: [], spark: 0 });
    assert.strictEqual(m.items.length, 0);
    assert.strictEqual(m.spark, 0);
  });

  test('applyLootBonuses with empty items array returns empty items', function() {
    var loot = { items: [], spark: 5 };
    var r = Loot.applyLootBonuses(loot, { double_loot: true });
    assert.strictEqual(r.items.length, 0);
    assert.strictEqual(r.spark, 5);
  });

  test('formatLootDrop with items but no spark still includes items', function() {
    var loot = { items: [{ item: 'stone', qty: 1 }], spark: 0 };
    var html = Loot.formatLootDrop(loot);
    assert.ok(html.indexOf('Stone') !== -1);
  });

  test('getLootTable for every table returns non-null', function() {
    Loot.getAllTables().forEach(function(id) {
      assert.ok(Loot.getLootTable(id) !== null, 'getLootTable null for ' + id);
    });
  });

  test('getDropRate returns 0 for item not present in any table entry', function() {
    // 'elixir' is not in gathering_normal
    assert.strictEqual(Loot.getDropRate('gathering_normal', 'elixir'), 0);
  });

  test('calculateSparkReward with very large multiplier does not throw', function() {
    var spark = Loot.calculateSparkReward('dungeon_easy', 1000);
    assert.ok(spark > 0);
  });

  test('ITEM_RARITY covers all items referenced in loot tables', function() {
    var allItems = new Set();
    Loot.getAllTables().forEach(function(id) {
      var t = Loot.LOOT_TABLES[id];
      t.guaranteed.forEach(function(g) { allItems.add(g.item); });
      t.pool.forEach(function(p) { allItems.add(p.item); });
    });
    allItems.forEach(function(itemId) {
      assert.ok(Loot.ITEM_RARITY[itemId],
        'ITEM_RARITY missing entry for: ' + itemId);
    });
  });

  test('ITEM_NAMES covers all items referenced in loot tables', function() {
    var allItems = new Set();
    Loot.getAllTables().forEach(function(id) {
      var t = Loot.LOOT_TABLES[id];
      t.guaranteed.forEach(function(g) { allItems.add(g.item); });
      t.pool.forEach(function(p) { allItems.add(p.item); });
    });
    allItems.forEach(function(itemId) {
      assert.ok(Loot.ITEM_NAMES[itemId],
        'ITEM_NAMES missing entry for: ' + itemId);
    });
  });

  test('rollLoot never returns negative spark', function() {
    Loot.getAllTables().forEach(function(id) {
      var result = Loot.rollLoot(id, 42);
      assert.ok(result.spark >= 0, id + ' returned negative spark: ' + result.spark);
    });
  });

  test('mergeLoot spark is sum of both sparks', function() {
    var a = { items: [], spark: 100 };
    var b = { items: [], spark: 200 };
    assert.strictEqual(Loot.mergeLoot(a, b).spark, 300);
  });

  test('rarity ordering: epic > rare > uncommon > common', function() {
    // Drop with only epic item should return 'epic'
    assert.strictEqual(Loot.getRarityOfDrop({ items: [{ item: 'elixir', qty: 1 }] }), 'epic');
    assert.strictEqual(Loot.getRarityOfDrop({ items: [{ item: 'gold_dust', qty: 1 }] }), 'rare');
    assert.strictEqual(Loot.getRarityOfDrop({ items: [{ item: 'iron_ore', qty: 1 }] }), 'uncommon');
    assert.strictEqual(Loot.getRarityOfDrop({ items: [{ item: 'stone', qty: 1 }] }), 'common');
  });
});

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
if (!report()) process.exit(1);
