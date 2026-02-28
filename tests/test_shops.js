// test_shops.js — Tests for shops, daily quests, and collection journal
const { test, suite, report, assert } = require('./test_runner');
const Shops = require('../src/js/shops');

// ============================================================================
// ZONE SHOPS
// ============================================================================

suite('Zone Shops', function() {
  test('All 8 zones have shops', function() {
    var zones = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];
    zones.forEach(function(z) {
      var shop = Shops.getShop(z);
      assert.ok(shop, z + ' should have a shop');
      assert.ok(shop.name, z + ' shop should have a name');
      assert.ok(shop.keeper, z + ' shop should have a keeper');
      assert.ok(shop.items.length >= 4, z + ' shop should have at least 4 items');
    });
  });

  test('getShop returns null for invalid zone', function() {
    assert.strictEqual(Shops.getShop('fake'), null);
  });

  test('All shop items have price, stock, desc', function() {
    Object.keys(Shops.ZONE_SHOPS).forEach(function(zone) {
      Shops.ZONE_SHOPS[zone].items.forEach(function(item) {
        assert.ok(item.id, zone + ' item missing id');
        assert.ok(item.price > 0, zone + ' ' + item.id + ' price must be > 0');
        assert.ok(item.stock >= 0, zone + ' ' + item.id + ' stock must be >= 0');
        assert.ok(item.desc, zone + ' ' + item.id + ' missing desc');
      });
    });
  });

  test('buyFromShop succeeds with enough Spark', function() {
    Shops.restockAllShops();
    var ledger = { balances: { p1: 100 } };
    var inv = { items: {} };
    var result = Shops.buyFromShop('nexus', 'herb_mint', ledger, 'p1', inv, 1);
    assert.ok(result.success, 'Should succeed');
    assert.strictEqual(result.cost, 5);
    assert.strictEqual(inv.items.herb_mint, 1);
    assert.strictEqual(ledger.balances.p1, 95);
  });

  test('buyFromShop fails with insufficient Spark', function() {
    Shops.restockAllShops();
    var ledger = { balances: { p1: 2 } };
    var inv = { items: {} };
    var result = Shops.buyFromShop('nexus', 'herb_mint', ledger, 'p1', inv, 1);
    assert.ok(!result.success);
    assert.ok(result.message.indexOf('Not enough Spark') !== -1);
  });

  test('buyFromShop reduces stock', function() {
    Shops.restockAllShops();
    var shop = Shops.getShop('nexus');
    var initialStock = shop.items[0].stock;
    var ledger = { balances: { p1: 1000 } };
    var inv = { items: {} };
    Shops.buyFromShop('nexus', shop.items[0].id, ledger, 'p1', inv, 2);
    assert.strictEqual(shop.items[0].stock, initialStock - 2);
  });

  test('buyFromShop fails when out of stock', function() {
    Shops.restockAllShops();
    var ledger = { balances: { p1: 10000 } };
    var inv = { items: {} };
    // Buy all stock
    var shop = Shops.getShop('arena');
    var item = shop.items[shop.items.length - 1]; // trophy, stock 1
    Shops.buyFromShop('arena', item.id, ledger, 'p1', inv, item.stock);
    var result = Shops.buyFromShop('arena', item.id, ledger, 'p1', inv, 1);
    assert.ok(!result.success);
    assert.ok(result.message.indexOf('stock') !== -1);
  });

  test('restockAllShops restores stock', function() {
    var ledger = { balances: { p1: 10000 } };
    var inv = { items: {} };
    Shops.buyFromShop('nexus', 'herb_mint', ledger, 'p1', inv, 5);
    Shops.restockAllShops();
    var shop = Shops.getShop('nexus');
    assert.strictEqual(shop.items[0].stock, 10);
  });

  test('Each zone has unique keeper name', function() {
    var keepers = {};
    Object.keys(Shops.ZONE_SHOPS).forEach(function(zone) {
      var keeper = Shops.ZONE_SHOPS[zone].keeper;
      assert.ok(!keepers[keeper], 'Duplicate keeper: ' + keeper);
      keepers[keeper] = true;
    });
  });
});

// ============================================================================
// DAILY QUESTS
// ============================================================================

suite('Daily Quests', function() {
  test('generateDailyQuests returns 3 quests', function() {
    var quests = Shops.generateDailyQuests('2026-02-28');
    assert.strictEqual(quests.length, 3);
  });

  test('Daily quests are deterministic (same date = same quests)', function() {
    var q1 = Shops.generateDailyQuests('2026-02-28');
    var q2 = Shops.generateDailyQuests('2026-02-28');
    assert.strictEqual(q1[0].title, q2[0].title);
    assert.strictEqual(q1[1].title, q2[1].title);
    assert.strictEqual(q1[2].title, q2[2].title);
  });

  test('Different dates give different quests', function() {
    var q1 = Shops.generateDailyQuests('2026-02-28');
    var q2 = Shops.generateDailyQuests('2026-03-01');
    // At least one should be different (statistically near certain)
    var allSame = q1[0].title === q2[0].title && q1[1].title === q2[1].title && q1[2].title === q2[2].title;
    assert.ok(!allSame, 'Different dates should generate different quests');
  });

  test('Each daily quest has required fields', function() {
    var quests = Shops.generateDailyQuests('2026-03-15');
    quests.forEach(function(q) {
      assert.ok(q.id, 'Missing id');
      assert.ok(q.title, 'Missing title');
      assert.ok(q.description, 'Missing description');
      assert.ok(q.type, 'Missing type');
      assert.ok(q.target > 0, 'Target must be > 0');
      assert.strictEqual(q.progress, 0);
      assert.strictEqual(q.completed, false);
      assert.ok(q.reward.spark > 0, 'Reward spark must be > 0');
    });
  });

  test('No duplicate quest types in same day', function() {
    // Test across 10 different dates
    for (var d = 1; d <= 10; d++) {
      var quests = Shops.generateDailyQuests('2026-03-' + (d < 10 ? '0' : '') + d);
      var types = {};
      quests.forEach(function(q) {
        assert.ok(!types[q.templateId], 'Duplicate type on day ' + d + ': ' + q.templateId);
        types[q.templateId] = true;
      });
    }
  });

  test('trackDailyProgress advances quest', function() {
    var quests = Shops.generateDailyQuests('2026-02-28');
    var target = quests[0];
    var completed = Shops.trackDailyProgress(quests, target.type, { zone: target.zone, count: 1 });
    assert.strictEqual(target.progress, 1);
  });

  test('trackDailyProgress completes quest at target', function() {
    var quests = [{ type: 'harvest', target: 3, progress: 2, completed: false, zone: null }];
    var completed = Shops.trackDailyProgress(quests, 'harvest', { count: 1 });
    assert.strictEqual(completed.length, 1);
    assert.ok(quests[0].completed);
  });

  test('trackDailyProgress ignores wrong zone', function() {
    var quests = [{ type: 'harvest', target: 3, progress: 0, completed: false, zone: 'gardens' }];
    Shops.trackDailyProgress(quests, 'harvest', { zone: 'wilds', count: 1 });
    assert.strictEqual(quests[0].progress, 0, 'Wrong zone should not advance');
  });

  test('Streak multiplier increases with consecutive days', function() {
    var info = Shops.getDailyStreak({ dailyStreak: 5, lastDailyDate: '2026-02-27' }, '2026-02-28');
    assert.ok(info.multiplier > 1.0, 'Streak should give bonus');
    assert.strictEqual(info.streak, 6);
  });

  test('Streak resets after missed day', function() {
    var info = Shops.getDailyStreak({ dailyStreak: 5, lastDailyDate: '2026-02-25' }, '2026-02-28');
    assert.strictEqual(info.streak, 0, 'Missed day should reset streak');
  });
});

// ============================================================================
// COLLECTION JOURNAL
// ============================================================================

suite('Collection Journal', function() {
  test('createCollection returns empty state', function() {
    var col = Shops.createCollection();
    assert.ok(col);
    assert.strictEqual(col.totalDiscovered, 0);
    assert.deepStrictEqual(col.items_found, {});
    assert.deepStrictEqual(col.zones_visited, {});
  });

  test('recordDiscovery tracks new item', function() {
    var col = Shops.createCollection();
    var result = Shops.recordDiscovery(col, 'items_found', 'herb_mint');
    assert.ok(result);
    assert.ok(result.isNew);
    assert.strictEqual(result.totalInCategory, 1);
    assert.strictEqual(col.totalDiscovered, 1);
  });

  test('recordDiscovery returns null for duplicate', function() {
    var col = Shops.createCollection();
    Shops.recordDiscovery(col, 'items_found', 'herb_mint');
    var result = Shops.recordDiscovery(col, 'items_found', 'herb_mint');
    assert.strictEqual(result, null);
    assert.strictEqual(col.totalDiscovered, 1); // Unchanged
  });

  test('recordDiscovery tracks zones', function() {
    var col = Shops.createCollection();
    Shops.recordDiscovery(col, 'zones_visited', 'nexus');
    Shops.recordDiscovery(col, 'zones_visited', 'gardens');
    assert.strictEqual(Object.keys(col.zones_visited).length, 2);
  });

  test('recordDiscovery tracks numeric categories', function() {
    var col = Shops.createCollection();
    var result = Shops.recordDiscovery(col, 'buildings_placed', 5);
    assert.ok(result);
    assert.strictEqual(col.buildings_placed, 5);
  });

  test('getCollectionSummary returns category stats', function() {
    var col = Shops.createCollection();
    Shops.recordDiscovery(col, 'items_found', 'herb_mint');
    Shops.recordDiscovery(col, 'zones_visited', 'nexus');
    Shops.recordDiscovery(col, 'zones_visited', 'gardens');
    var summary = Shops.getCollectionSummary(col);
    assert.ok(summary.categories.length > 0);
    assert.strictEqual(summary.totalFound, 3);
  });

  test('Collection tracks multiple categories independently', function() {
    var col = Shops.createCollection();
    Shops.recordDiscovery(col, 'items_found', 'herb_mint');
    Shops.recordDiscovery(col, 'fish_caught', 'fish_common');
    Shops.recordDiscovery(col, 'npcs_befriended', 'npc_1');
    assert.strictEqual(col.totalDiscovered, 3);
    assert.strictEqual(Object.keys(col.items_found).length, 1);
    assert.strictEqual(Object.keys(col.fish_caught).length, 1);
    assert.strictEqual(Object.keys(col.npcs_befriended).length, 1);
  });
});

report();
