/**
 * tests/test_market_dynamics.js
 * 110+ tests for the Market Dynamics system (Agora zone dynamic pricing).
 *
 * Run: node tests/test_market_dynamics.js
 */
'use strict';

var MD = require('../src/js/market_dynamics');

// ---------------------------------------------------------------------------
// Minimal test harness (var-only, no const/let)
// ---------------------------------------------------------------------------
var passed = 0;
var failed = 0;
var failures = [];

function assert(condition, msg) {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(msg || 'assertion failed');
    console.log('  FAIL: ' + (msg || 'assertion failed'));
  }
}

function assertEqual(a, b, msg) {
  assert(a === b, (msg || 'assertEqual') + ' — expected ' + b + ', got ' + a);
}

function assertApprox(a, b, tolerance, msg) {
  var tol = tolerance || 0.001;
  assert(Math.abs(a - b) <= tol, (msg || 'assertApprox') + ' — expected ~' + b + ', got ' + a);
}

function assertDefined(val, msg) {
  assert(val !== undefined && val !== null, (msg || 'assertDefined') + ' — got ' + val);
}

function suite(name) {
  console.log('\n--- ' + name + ' ---');
}

function freshState() {
  return {};
}

function freshInitedState() {
  var s = freshState();
  MD.initMarket(s);
  return s;
}

// ---------------------------------------------------------------------------
// SUITE 1: Module Exports
// ---------------------------------------------------------------------------
suite('Module Exports');

assert(typeof MD === 'object', 'module exports object');
assert(typeof MD.initMarket === 'function', 'initMarket exported');
assert(typeof MD.recordTransaction === 'function', 'recordTransaction exported');
assert(typeof MD.updatePrices === 'function', 'updatePrices exported');
assert(typeof MD.getPrice === 'function', 'getPrice exported');
assert(typeof MD.getBuyPrice === 'function', 'getBuyPrice exported');
assert(typeof MD.getSellPrice === 'function', 'getSellPrice exported');
assert(typeof MD.getPriceTrend === 'function', 'getPriceTrend exported');
assert(typeof MD.getPriceHistory === 'function', 'getPriceHistory exported');
assert(typeof MD.getAllPrices === 'function', 'getAllPrices exported');
assert(typeof MD.getTopMovers === 'function', 'getTopMovers exported');
assert(typeof MD.getCategoryPrices === 'function', 'getCategoryPrices exported');
assert(typeof MD.spawnMerchant === 'function', 'spawnMerchant exported');
assert(typeof MD.getMerchants === 'function', 'getMerchants exported');
assert(typeof MD.buyFromMerchant === 'function', 'buyFromMerchant exported');
assert(typeof MD.getMarketStats === 'function', 'getMarketStats exported');
assert(typeof MD.applyEventEffect === 'function', 'applyEventEffect exported');
assert(typeof MD.getSupplyDemand === 'function', 'getSupplyDemand exported');
assert(typeof MD.predictPrice === 'function', 'predictPrice exported');
assert(Array.isArray(MD.MARKET_ITEMS), 'MARKET_ITEMS is array');
assert(Array.isArray(MD.MERCHANT_INVENTORY), 'MERCHANT_INVENTORY is array');
assertEqual(typeof MD.BUY_FEE_RATE, 'number', 'BUY_FEE_RATE is number');
assertEqual(typeof MD.SELL_RATE, 'number', 'SELL_RATE is number');
assertEqual(typeof MD.MERCHANT_TTL, 'number', 'MERCHANT_TTL is number');
assertEqual(typeof MD.HISTORY_WINDOW, 'number', 'HISTORY_WINDOW is number');

// ---------------------------------------------------------------------------
// SUITE 2: MARKET_ITEMS structure
// ---------------------------------------------------------------------------
suite('MARKET_ITEMS — catalog completeness');

assert(MD.MARKET_ITEMS.length >= 30, 'at least 30 market items');

var itemIds = {};
MD.MARKET_ITEMS.forEach(function(item) {
  assert(typeof item.id === 'string' && item.id.length > 0, 'item has string id: ' + item.id);
  assert(typeof item.name === 'string' && item.name.length > 0, 'item has string name: ' + item.id);
  assert(typeof item.category === 'string', 'item has category: ' + item.id);
  assert(typeof item.basePrice === 'number' && item.basePrice > 0, 'item has positive basePrice: ' + item.id);
  assert(typeof item.minPrice === 'number' && item.minPrice > 0, 'item has positive minPrice: ' + item.id);
  assert(typeof item.maxPrice === 'number' && item.maxPrice > 0, 'item has positive maxPrice: ' + item.id);
  assert(item.minPrice <= item.basePrice, 'minPrice <= basePrice for: ' + item.id);
  assert(item.basePrice <= item.maxPrice, 'basePrice <= maxPrice for: ' + item.id);
  assert(typeof item.volatility === 'number' && item.volatility >= 0 && item.volatility <= 1, 'volatility in [0,1]: ' + item.id);
  assert(typeof item.supply === 'number' && item.supply > 0, 'positive supply: ' + item.id);
  assert(typeof item.demandDecay === 'number' && item.demandDecay > 0, 'positive demandDecay: ' + item.id);
  assert(!itemIds[item.id], 'no duplicate item id: ' + item.id);
  itemIds[item.id] = true;
});

// Check categories are valid
var validCategories = ['materials', 'tools', 'weapons', 'armor', 'food', 'potions', 'decorations', 'rare'];
MD.MARKET_ITEMS.forEach(function(item) {
  assert(validCategories.indexOf(item.category) !== -1, 'valid category for: ' + item.id);
});

// Check specific items exist
var requiredItems = ['iron_ore', 'copper_ore', 'iron_sword', 'health_potion', 'bread_loaf', 'star_crystal', 'leather_vest', 'fishing_rod'];
requiredItems.forEach(function(id) {
  var found = MD.MARKET_ITEMS.filter(function(x) { return x.id === id; }).length > 0;
  assert(found, 'required item exists: ' + id);
});

// ---------------------------------------------------------------------------
// SUITE 3: MERCHANT_INVENTORY structure
// ---------------------------------------------------------------------------
suite('MERCHANT_INVENTORY — special items');

assert(MD.MERCHANT_INVENTORY.length === 10, 'exactly 10 merchant items');

MD.MERCHANT_INVENTORY.forEach(function(item) {
  assert(typeof item.id === 'string', 'merchant item has id: ' + JSON.stringify(item));
  assert(typeof item.name === 'string', 'merchant item has name: ' + item.id);
  assert(typeof item.basePrice === 'number' && item.basePrice > 0, 'merchant item has basePrice: ' + item.id);
  assert(item.minPrice <= item.basePrice, 'merchant minPrice <= basePrice: ' + item.id);
  assert(item.basePrice <= item.maxPrice, 'merchant basePrice <= maxPrice: ' + item.id);
});

// ---------------------------------------------------------------------------
// SUITE 4: initMarket
// ---------------------------------------------------------------------------
suite('initMarket');

(function() {
  var s = freshState();
  MD.initMarket(s);
  assert(s.market !== undefined, 'market object created');
  assert(typeof s.market.prices === 'object', 'prices object created');
  assert(typeof s.market.supply === 'object', 'supply object created');
  assert(typeof s.market.demand === 'object', 'demand object created');
  assert(typeof s.market.history === 'object', 'history object created');
  assert(Array.isArray(s.market.merchants), 'merchants array created');
  assertEqual(s.market.lastUpdate, 0, 'lastUpdate starts at 0');
})();

(function() {
  var s = freshState();
  MD.initMarket(s);
  // All items should have initial prices at basePrice
  MD.MARKET_ITEMS.forEach(function(item) {
    assertEqual(s.market.prices[item.id], item.basePrice, 'initial price = basePrice for ' + item.id);
    assertEqual(s.market.supply[item.id], item.supply, 'initial supply for ' + item.id);
    assert(Array.isArray(s.market.history[item.id]), 'history array for ' + item.id);
  });
})();

(function() {
  // initMarket is idempotent — calling twice should not reset prices
  var s = freshInitedState();
  s.market.prices['iron_ore'] = 999;
  MD.initMarket(s);
  assertEqual(s.market.prices['iron_ore'], 999, 'initMarket idempotent — does not reset existing prices');
})();

// ---------------------------------------------------------------------------
// SUITE 5: recordTransaction
// ---------------------------------------------------------------------------
suite('recordTransaction');

(function() {
  var s = freshInitedState();
  var supplyBefore = s.market.supply['iron_ore'];
  var demandBefore = s.market.demand['iron_ore'];
  MD.recordTransaction(s, 'iron_ore', 10, true); // buy
  assert(s.market.demand['iron_ore'] > demandBefore, 'buy increases demand');
  assert(s.market.supply['iron_ore'] < supplyBefore, 'buy decreases supply');
})();

(function() {
  var s = freshInitedState();
  var supplyBefore = s.market.supply['iron_ore'];
  var demandBefore = s.market.demand['iron_ore'];
  MD.recordTransaction(s, 'iron_ore', 10, false); // sell
  assert(s.market.supply['iron_ore'] > supplyBefore, 'sell increases supply');
  assert(s.market.demand['iron_ore'] < demandBefore, 'sell decreases demand');
})();

(function() {
  // Multiple transactions accumulate
  var s = freshInitedState();
  var supplyBefore = s.market.supply['timber'];
  MD.recordTransaction(s, 'timber', 5, true);
  MD.recordTransaction(s, 'timber', 5, true);
  MD.recordTransaction(s, 'timber', 5, true);
  assert(s.market.supply['timber'] < supplyBefore, 'multiple buys accumulate supply decrease');
})();

(function() {
  // Supply cannot go below 1
  var s = freshInitedState();
  for (var i = 0; i < 50; i++) {
    MD.recordTransaction(s, 'star_crystal', 20, true);
  }
  assert(s.market.supply['star_crystal'] >= 1, 'supply floor is 1');
})();

(function() {
  // Zero quantity has no effect
  var s = freshInitedState();
  var supplyBefore = s.market.supply['iron_ore'];
  MD.recordTransaction(s, 'iron_ore', 0, true);
  assertEqual(s.market.supply['iron_ore'], supplyBefore, 'zero quantity buy has no effect');
})();

(function() {
  // Unknown item is silently ignored
  var s = freshInitedState();
  assert(typeof MD.recordTransaction(s, 'nonexistent_item', 5, true) === 'object', 'unknown item returns state');
})();

(function() {
  // Returns the state object
  var s = freshInitedState();
  var ret = MD.recordTransaction(s, 'iron_ore', 1, true);
  assert(ret === s, 'recordTransaction returns state');
})();

// ---------------------------------------------------------------------------
// SUITE 6: updatePrices
// ---------------------------------------------------------------------------
suite('updatePrices');

(function() {
  // Prices stay within min/max after update
  var s = freshInitedState();
  MD.updatePrices(s, 1);
  MD.MARKET_ITEMS.forEach(function(item) {
    var price = s.market.prices[item.id];
    assert(price >= item.minPrice, item.id + ' price >= minPrice after update');
    assert(price <= item.maxPrice, item.id + ' price <= maxPrice after update');
  });
})();

(function() {
  // History grows after updates
  var s = freshInitedState();
  MD.updatePrices(s, 1);
  MD.updatePrices(s, 2);
  MD.updatePrices(s, 3);
  assert(s.market.history['iron_ore'].length === 3, 'history grows with each update');
})();

(function() {
  // History caps at HISTORY_WINDOW
  var s = freshInitedState();
  for (var t = 1; t <= 120; t++) {
    MD.updatePrices(s, t);
  }
  assert(s.market.history['iron_ore'].length <= MD.HISTORY_WINDOW, 'history does not exceed HISTORY_WINDOW');
})();

(function() {
  // lastUpdate is set
  var s = freshInitedState();
  MD.updatePrices(s, 42);
  assertEqual(s.market.lastUpdate, 42, 'lastUpdate set after updatePrices');
})();

(function() {
  // Returns state
  var s = freshInitedState();
  var ret = MD.updatePrices(s, 1);
  assert(ret === s, 'updatePrices returns state');
})();

(function() {
  // High demand pushes price up
  var s = freshInitedState();
  var basePrice = s.market.prices['iron_ore'];
  // Simulate many buys to inflate demand
  for (var i = 0; i < 30; i++) {
    MD.recordTransaction(s, 'iron_ore', 10, true);
  }
  MD.updatePrices(s, 1);
  var newPrice = s.market.prices['iron_ore'];
  assert(newPrice > basePrice, 'high demand pushes price up (got ' + newPrice + ' vs base ' + basePrice + ')');
})();

(function() {
  // High supply pushes price down
  var s = freshInitedState();
  var basePrice = s.market.prices['iron_ore'];
  for (var i = 0; i < 30; i++) {
    MD.recordTransaction(s, 'iron_ore', 10, false);
  }
  MD.updatePrices(s, 1);
  var newPrice = s.market.prices['iron_ore'];
  assert(newPrice < basePrice, 'high supply pushes price down (got ' + newPrice + ' vs base ' + basePrice + ')');
})();

// ---------------------------------------------------------------------------
// SUITE 7: getPrice
// ---------------------------------------------------------------------------
suite('getPrice');

(function() {
  var s = freshInitedState();
  var price = MD.getPrice(s, 'iron_ore');
  assert(typeof price === 'number' && price > 0, 'getPrice returns positive number');
})();

(function() {
  // Returns basePrice for unknown item if not in market
  var price = MD.getPrice(freshState(), 'nonexistent_xyz');
  assert(price === null, 'getPrice returns null for completely unknown item');
})();

(function() {
  // Returns basePrice when market not initialized
  var price = MD.getPrice(freshState(), 'iron_ore');
  assert(price === 10, 'getPrice returns basePrice when market not inited');
})();

// ---------------------------------------------------------------------------
// SUITE 8: getBuyPrice & getSellPrice
// ---------------------------------------------------------------------------
suite('getBuyPrice and getSellPrice');

(function() {
  var s = freshInitedState();
  // iron_ore basePrice = 10
  var buy1 = MD.getBuyPrice(s, 'iron_ore', 1);
  // 10 * 1.05 = 10.5 -> ceil = 11
  assertEqual(buy1, 11, 'getBuyPrice for 1 iron_ore (fee=5%)');
})();

(function() {
  var s = freshInitedState();
  var buy10 = MD.getBuyPrice(s, 'iron_ore', 10);
  // 10 * 10 * 1.05 = 105
  assertEqual(buy10, 105, 'getBuyPrice for 10 iron_ore');
})();

(function() {
  var s = freshInitedState();
  var sell1 = MD.getSellPrice(s, 'iron_ore', 1);
  // 10 * 0.9 = 9
  assertEqual(sell1, 9, 'getSellPrice for 1 iron_ore (10% spread)');
})();

(function() {
  var s = freshInitedState();
  var sell10 = MD.getSellPrice(s, 'iron_ore', 10);
  // 10 * 10 * 0.9 = 90
  assertEqual(sell10, 90, 'getSellPrice for 10 iron_ore');
})();

(function() {
  // Buy price always > sell price (market spread)
  var s = freshInitedState();
  MD.MARKET_ITEMS.forEach(function(item) {
    var buy  = MD.getBuyPrice(s, item.id, 1);
    var sell = MD.getSellPrice(s, item.id, 1);
    assert(buy > sell, 'buy > sell for ' + item.id + ' (' + buy + ' vs ' + sell + ')');
  });
})();

(function() {
  // Fee is exactly 5% (ceil)
  var s = freshInitedState();
  // Set price to exactly 100
  s.market.prices['bread_loaf'] = 100;
  var buy = MD.getBuyPrice(s, 'bread_loaf', 1);
  // 100 * 1.05 = 105
  assertEqual(buy, 105, '5% fee on price 100 = 105');
})();

(function() {
  // Sell rate is exactly 90%
  var s = freshInitedState();
  s.market.prices['bread_loaf'] = 100;
  var sell = MD.getSellPrice(s, 'bread_loaf', 1);
  assertEqual(sell, 90, '90% sell rate on price 100 = 90');
})();

(function() {
  // BUY_FEE_RATE constant is 0.05
  assertApprox(MD.BUY_FEE_RATE, 0.05, 0.0001, 'BUY_FEE_RATE is 0.05');
})();

(function() {
  // SELL_RATE constant is 0.90
  assertApprox(MD.SELL_RATE, 0.90, 0.0001, 'SELL_RATE is 0.90');
})();

// ---------------------------------------------------------------------------
// SUITE 9: getPriceTrend
// ---------------------------------------------------------------------------
suite('getPriceTrend');

(function() {
  // Empty history returns stable
  var s = freshInitedState();
  var trend = MD.getPriceTrend(s, 'iron_ore', 10);
  assertEqual(trend, 'stable', 'empty history returns stable');
})();

(function() {
  // Steadily rising prices → rising
  var s = freshInitedState();
  s.market.history['iron_ore'] = [];
  for (var i = 1; i <= 12; i++) {
    s.market.history['iron_ore'].push({ tick: i, price: 10 + i * 2 });
  }
  var trend = MD.getPriceTrend(s, 'iron_ore', 12);
  assertEqual(trend, 'rising', 'steadily rising prices → rising');
})();

(function() {
  // Steadily falling prices → falling
  var s = freshInitedState();
  s.market.history['iron_ore'] = [];
  for (var i = 1; i <= 12; i++) {
    s.market.history['iron_ore'].push({ tick: i, price: 50 - i * 3 });
  }
  var trend = MD.getPriceTrend(s, 'iron_ore', 12);
  assertEqual(trend, 'falling', 'steadily falling prices → falling');
})();

(function() {
  // Flat prices → stable
  var s = freshInitedState();
  s.market.history['iron_ore'] = [];
  for (var i = 1; i <= 10; i++) {
    s.market.history['iron_ore'].push({ tick: i, price: 20 });
  }
  var trend = MD.getPriceTrend(s, 'iron_ore', 10);
  assertEqual(trend, 'stable', 'flat prices → stable');
})();

(function() {
  // Wildly oscillating prices (perfectly symmetric highs/lows) → volatile
  // Symmetry ensures no directional half-average bias, so std-dev catches it
  var s = freshInitedState();
  s.market.history['iron_ore'] = [];
  // Pattern: 5, 50, 5, 50, 5, 50, 5, 50, 5, 50  (but 5 starts each pair to keep halves equal)
  // Use pairs [5,50] repeated — first half [5,50,5,50,5], second half [50,5,50,5,50]
  // Instead use perfectly symmetric: [5,50,5,50,50,5,50,5] (8 entries, 4+4 balanced)
  var oscillating = [5, 50, 5, 50, 50, 5, 50, 5];
  for (var i = 0; i < oscillating.length; i++) {
    s.market.history['iron_ore'].push({ tick: i + 1, price: oscillating[i] });
  }
  var trend = MD.getPriceTrend(s, 'iron_ore', oscillating.length);
  assertEqual(trend, 'volatile', 'wildly oscillating prices (symmetric) → volatile');
})();

(function() {
  // Valid trend values
  var validTrends = ['rising', 'falling', 'stable', 'volatile'];
  var s = freshInitedState();
  for (var t = 1; t <= 20; t++) {
    MD.updatePrices(s, t);
  }
  MD.MARKET_ITEMS.forEach(function(item) {
    var trend = MD.getPriceTrend(s, item.id, 10);
    assert(validTrends.indexOf(trend) !== -1, 'trend is one of valid values for ' + item.id + ' (got ' + trend + ')');
  });
})();

// ---------------------------------------------------------------------------
// SUITE 10: getPriceHistory
// ---------------------------------------------------------------------------
suite('getPriceHistory');

(function() {
  // Returns empty array for no history
  var s = freshInitedState();
  var hist = MD.getPriceHistory(s, 'iron_ore', 10);
  assert(Array.isArray(hist), 'getPriceHistory returns array');
  assertEqual(hist.length, 0, 'empty history for fresh state');
})();

(function() {
  // Returns last N ticks
  var s = freshInitedState();
  for (var t = 1; t <= 20; t++) {
    MD.updatePrices(s, t);
  }
  var hist = MD.getPriceHistory(s, 'iron_ore', 5);
  assertEqual(hist.length, 5, 'returns last 5 ticks');
})();

(function() {
  // History entries have tick and price
  var s = freshInitedState();
  MD.updatePrices(s, 100);
  var hist = MD.getPriceHistory(s, 'iron_ore', 1);
  assertEqual(hist.length, 1, 'one history entry');
  assert(typeof hist[0].tick === 'number', 'history entry has tick');
  assert(typeof hist[0].price === 'number', 'history entry has price');
  assertEqual(hist[0].tick, 100, 'history entry tick = 100');
})();

(function() {
  // Rolling window caps at HISTORY_WINDOW
  var s = freshInitedState();
  for (var t = 1; t <= 150; t++) {
    MD.updatePrices(s, t);
  }
  var hist = MD.getPriceHistory(s, 'iron_ore', 200);
  assert(hist.length <= MD.HISTORY_WINDOW, 'history capped at HISTORY_WINDOW');
})();

// ---------------------------------------------------------------------------
// SUITE 11: getAllPrices
// ---------------------------------------------------------------------------
suite('getAllPrices');

(function() {
  var s = freshInitedState();
  var prices = MD.getAllPrices(s);
  assert(typeof prices === 'object', 'getAllPrices returns object');
  assertEqual(Object.keys(prices).length, MD.MARKET_ITEMS.length, 'all items have prices');
})();

(function() {
  // All prices are positive numbers
  var s = freshInitedState();
  MD.updatePrices(s, 1);
  var prices = MD.getAllPrices(s);
  Object.keys(prices).forEach(function(id) {
    assert(typeof prices[id] === 'number' && prices[id] > 0, 'positive price for ' + id);
  });
})();

// ---------------------------------------------------------------------------
// SUITE 12: getTopMovers
// ---------------------------------------------------------------------------
suite('getTopMovers');

(function() {
  // Returns array
  var s = freshInitedState();
  var movers = MD.getTopMovers(s, 5);
  assert(Array.isArray(movers), 'getTopMovers returns array');
})();

(function() {
  // Returns correct count
  var s = freshInitedState();
  // Populate history with variation
  for (var t = 1; t <= 15; t++) {
    if (t % 3 === 0) {
      MD.recordTransaction(s, 'iron_ore', 20, true);
    }
    MD.updatePrices(s, t);
  }
  var movers = MD.getTopMovers(s, 3);
  assert(movers.length <= 3, 'getTopMovers returns at most 3 items');
})();

(function() {
  // Movers have id, name, change, currentPrice fields
  var s = freshInitedState();
  for (var t = 1; t <= 10; t++) {
    MD.recordTransaction(s, 'star_crystal', 5, true);
    MD.updatePrices(s, t);
  }
  var movers = MD.getTopMovers(s, 5);
  if (movers.length > 0) {
    var m = movers[0];
    assert(typeof m.id === 'string', 'mover has id');
    assert(typeof m.name === 'string', 'mover has name');
    assert(typeof m.change === 'number', 'mover has change');
    assert(typeof m.currentPrice === 'number', 'mover has currentPrice');
  }
})();

(function() {
  // Sorted by absolute change descending
  var s = freshInitedState();
  for (var t = 1; t <= 20; t++) {
    MD.recordTransaction(s, 'star_crystal', 15, true);
    MD.updatePrices(s, t);
  }
  var movers = MD.getTopMovers(s, MD.MARKET_ITEMS.length);
  for (var i = 1; i < movers.length; i++) {
    assert(
      Math.abs(movers[i - 1].change) >= Math.abs(movers[i].change),
      'movers sorted by absolute change descending'
    );
  }
})();

// ---------------------------------------------------------------------------
// SUITE 13: getCategoryPrices
// ---------------------------------------------------------------------------
suite('getCategoryPrices');

(function() {
  var s = freshInitedState();
  var foodPrices = MD.getCategoryPrices(s, 'food');
  var foodItems = MD.MARKET_ITEMS.filter(function(x) { return x.category === 'food'; });
  assertEqual(Object.keys(foodPrices).length, foodItems.length, 'food category count matches');
})();

(function() {
  var s = freshInitedState();
  var rarePrices = MD.getCategoryPrices(s, 'rare');
  var rareItems = MD.MARKET_ITEMS.filter(function(x) { return x.category === 'rare'; });
  assertEqual(Object.keys(rarePrices).length, rareItems.length, 'rare category count matches');
})();

(function() {
  // All valid categories return results
  var s = freshInitedState();
  var categories = ['materials', 'tools', 'weapons', 'armor', 'food', 'potions', 'decorations', 'rare'];
  categories.forEach(function(cat) {
    var prices = MD.getCategoryPrices(s, cat);
    assert(Object.keys(prices).length > 0, 'category ' + cat + ' has items');
  });
})();

(function() {
  // Unknown category returns empty object
  var s = freshInitedState();
  var prices = MD.getCategoryPrices(s, 'nonexistent_category');
  assertEqual(Object.keys(prices).length, 0, 'unknown category returns empty object');
})();

(function() {
  // Category prices match getAllPrices for same items
  var s = freshInitedState();
  MD.updatePrices(s, 1);
  var allPrices = MD.getAllPrices(s);
  var materialPrices = MD.getCategoryPrices(s, 'materials');
  Object.keys(materialPrices).forEach(function(id) {
    assertEqual(materialPrices[id], allPrices[id], 'category price matches allPrices for ' + id);
  });
})();

// ---------------------------------------------------------------------------
// SUITE 14: spawnMerchant
// ---------------------------------------------------------------------------
suite('spawnMerchant');

(function() {
  var s = freshInitedState();
  MD.spawnMerchant(s, 12345, 100);
  assertEqual(s.market.merchants.length, 1, 'merchant added to market');
})();

(function() {
  var s = freshInitedState();
  MD.spawnMerchant(s, 12345, 100);
  var m = s.market.merchants[0];
  assertDefined(m.id, 'merchant has id');
  assertDefined(m.name, 'merchant has name');
  assertEqual(m.zone, 'agora', 'merchant is in agora');
  assert(Array.isArray(m.inventory), 'merchant has inventory array');
  assert(m.inventory.length >= 3, 'merchant has at least 3 items');
  assert(typeof m.expiresAt === 'number', 'merchant has expiresAt');
  assertEqual(m.expiresAt, 200, 'merchant expiresAt = tick + TTL (100 + 100)');
  assertEqual(m.spawnedAt, 100, 'merchant spawnedAt = tick');
})();

(function() {
  // Merchant inventory items have required fields
  var s = freshInitedState();
  MD.spawnMerchant(s, 9999, 50);
  var m = s.market.merchants[0];
  m.inventory.forEach(function(item) {
    assert(typeof item.id === 'string', 'inventory item has id');
    assert(typeof item.name === 'string', 'inventory item has name');
    assert(typeof item.quantity === 'number' && item.quantity >= 1, 'inventory item has quantity >= 1');
    assert(typeof item.price === 'number' && item.price > 0, 'inventory item has positive price');
  });
})();

(function() {
  // Same seed produces same merchant
  var s1 = freshInitedState();
  var s2 = freshInitedState();
  MD.spawnMerchant(s1, 42, 10);
  MD.spawnMerchant(s2, 42, 10);
  assertEqual(s1.market.merchants[0].name, s2.market.merchants[0].name, 'same seed → same name');
  assertEqual(s1.market.merchants[0].inventory.length, s2.market.merchants[0].inventory.length, 'same seed → same inventory size');
})();

(function() {
  // Different seeds produce different merchants
  var s = freshInitedState();
  MD.spawnMerchant(s, 1, 10);
  MD.spawnMerchant(s, 2, 10);
  assertEqual(s.market.merchants.length, 2, 'two different merchants spawned');
  // They may differ in name or inventory
  assert(
    s.market.merchants[0].name !== s.market.merchants[1].name ||
    s.market.merchants[0].inventory.length !== s.market.merchants[1].inventory.length ||
    s.market.merchants[0].id !== s.market.merchants[1].id,
    'different seeds produce different merchants'
  );
})();

(function() {
  // Merchant inventory items are from MERCHANT_INVENTORY pool
  var s = freshInitedState();
  MD.spawnMerchant(s, 7777, 200);
  var m = s.market.merchants[0];
  var merchantIds = MD.MERCHANT_INVENTORY.map(function(x) { return x.id; });
  m.inventory.forEach(function(item) {
    assert(merchantIds.indexOf(item.id) !== -1, 'merchant item ' + item.id + ' is from MERCHANT_INVENTORY');
  });
})();

(function() {
  // Returns state
  var s = freshInitedState();
  var ret = MD.spawnMerchant(s, 1, 1);
  assert(ret === s, 'spawnMerchant returns state');
})();

// ---------------------------------------------------------------------------
// SUITE 15: getMerchants
// ---------------------------------------------------------------------------
suite('getMerchants');

(function() {
  var s = freshInitedState();
  assertEqual(MD.getMerchants(s).length, 0, 'no merchants initially');
})();

(function() {
  var s = freshInitedState();
  MD.spawnMerchant(s, 1, 50);
  MD.spawnMerchant(s, 2, 60);
  assertEqual(MD.getMerchants(s).length, 2, 'getMerchants returns all spawned merchants');
})();

(function() {
  // getMerchants returns a copy (not direct reference)
  var s = freshInitedState();
  MD.spawnMerchant(s, 1, 1);
  var m = MD.getMerchants(s);
  m.push({ fake: true });
  assertEqual(s.market.merchants.length, 1, 'getMerchants returns copy, not reference');
})();

(function() {
  // getActiveMerchants filters expired
  var s = freshInitedState();
  MD.spawnMerchant(s, 1, 100); // expires at 200
  MD.spawnMerchant(s, 2, 50);  // expires at 150
  var active = MD.getActiveMerchants(s, 160); // tick=160: second expired, first still active
  assertEqual(active.length, 1, 'expired merchants filtered by getActiveMerchants');
})();

(function() {
  // Merchant TTL = 100
  assertEqual(MD.MERCHANT_TTL, 100, 'MERCHANT_TTL is 100');
})();

// ---------------------------------------------------------------------------
// SUITE 16: buyFromMerchant
// ---------------------------------------------------------------------------
suite('buyFromMerchant');

(function() {
  var s = freshInitedState();
  MD.spawnMerchant(s, 111, 10);
  var merchant = s.market.merchants[0];
  var item = merchant.inventory[0];
  var result = MD.buyFromMerchant(s, 'player1', merchant.id, item.id, 1);
  assert(result.success === true, 'buyFromMerchant succeeds for valid purchase');
  assert(typeof result.cost === 'number' && result.cost > 0, 'result has positive cost');
  assert(typeof result.item === 'object', 'result has item object');
  assertEqual(result.item.id, item.id, 'result item id matches');
  assertEqual(result.item.quantity, 1, 'result item quantity is 1');
})();

(function() {
  // Deducts from merchant inventory
  var s = freshInitedState();
  MD.spawnMerchant(s, 222, 10);
  var merchant = s.market.merchants[0];
  var item = merchant.inventory[0];
  var qtyBefore = item.quantity;
  MD.buyFromMerchant(s, 'player1', merchant.id, item.id, 1);
  assertEqual(item.quantity, qtyBefore - 1, 'merchant inventory decremented');
})();

(function() {
  // Cannot buy more than stock
  var s = freshInitedState();
  MD.spawnMerchant(s, 333, 10);
  var merchant = s.market.merchants[0];
  var item = merchant.inventory[0];
  item.quantity = 2;
  var result = MD.buyFromMerchant(s, 'player1', merchant.id, item.id, 99);
  assert(result.success === false, 'cannot buy more than stock');
  assertEqual(result.reason, 'insufficient_stock', 'reason is insufficient_stock');
})();

(function() {
  // Unknown merchant
  var s = freshInitedState();
  var result = MD.buyFromMerchant(s, 'player1', 'nonexistent_merchant', 'iron_ore', 1);
  assert(result.success === false, 'unknown merchant returns failure');
  assertEqual(result.reason, 'merchant_not_found', 'reason is merchant_not_found');
})();

(function() {
  // Item not in merchant inventory
  var s = freshInitedState();
  MD.spawnMerchant(s, 444, 10);
  var merchant = s.market.merchants[0];
  var result = MD.buyFromMerchant(s, 'player1', merchant.id, 'iron_ore', 1);
  assert(result.success === false, 'item not in merchant inventory fails');
  assertEqual(result.reason, 'item_not_in_inventory', 'reason is item_not_in_inventory');
})();

(function() {
  // Cost = price * quantity
  var s = freshInitedState();
  MD.spawnMerchant(s, 555, 10);
  var merchant = s.market.merchants[0];
  var item = merchant.inventory[0];
  item.quantity = 10;
  var result = MD.buyFromMerchant(s, 'player1', merchant.id, item.id, 3);
  if (result.success) {
    assertEqual(result.cost, item.price * 3, 'cost = price * quantity');
  }
})();

// ---------------------------------------------------------------------------
// SUITE 17: getMarketStats
// ---------------------------------------------------------------------------
suite('getMarketStats');

(function() {
  var s = freshInitedState();
  var stats = MD.getMarketStats(s);
  assert(typeof stats === 'object', 'getMarketStats returns object');
  assert(typeof stats.totalVolume === 'number', 'stats has totalVolume');
  assert(typeof stats.avgPriceLevel === 'number', 'stats has avgPriceLevel');
  assert(Array.isArray(stats.mostTraded), 'stats has mostTraded array');
})();

(function() {
  // avgPriceLevel starts near 1.0 (prices = basePrices)
  var s = freshInitedState();
  var stats = MD.getMarketStats(s);
  assertApprox(stats.avgPriceLevel, 1.0, 0.1, 'avgPriceLevel near 1.0 at init');
})();

(function() {
  // mostTraded returns up to 5 items
  var s = freshInitedState();
  var stats = MD.getMarketStats(s);
  assert(stats.mostTraded.length <= 5, 'mostTraded has at most 5 items');
})();

(function() {
  // mostTraded items are valid item ids
  var s = freshInitedState();
  for (var i = 0; i < 10; i++) {
    MD.recordTransaction(s, 'iron_ore', 20, true);
    MD.recordTransaction(s, 'bread_loaf', 15, false);
  }
  var stats = MD.getMarketStats(s);
  var allIds = MD.MARKET_ITEMS.map(function(x) { return x.id; });
  stats.mostTraded.forEach(function(id) {
    assert(allIds.indexOf(id) !== -1, 'mostTraded item is valid id: ' + id);
  });
})();

// ---------------------------------------------------------------------------
// SUITE 18: applyEventEffect
// ---------------------------------------------------------------------------
suite('applyEventEffect');

(function() {
  // harvest_festival drops food prices
  var s = freshInitedState();
  var foodBefore = {};
  var foodItems = MD.MARKET_ITEMS.filter(function(x) { return x.category === 'food'; });
  foodItems.forEach(function(item) { foodBefore[item.id] = s.market.prices[item.id]; });

  MD.applyEventEffect(s, 'harvest_festival', 0.8);

  foodItems.forEach(function(item) {
    assert(s.market.prices[item.id] <= foodBefore[item.id], 'harvest_festival drops food price: ' + item.id);
  });
})();

(function() {
  // arms_tournament raises weapon prices
  var s = freshInitedState();
  var weaponsBefore = {};
  var weaponItems = MD.MARKET_ITEMS.filter(function(x) { return x.category === 'weapons'; });
  weaponItems.forEach(function(item) { weaponsBefore[item.id] = s.market.prices[item.id]; });

  MD.applyEventEffect(s, 'arms_tournament', 1.5);

  weaponItems.forEach(function(item) {
    assert(s.market.prices[item.id] >= weaponsBefore[item.id], 'arms_tournament raises weapon price: ' + item.id);
  });
})();

(function() {
  // Prices stay within min/max after event effect
  var s = freshInitedState();
  MD.applyEventEffect(s, 'dragon_sighting', 100);
  MD.MARKET_ITEMS.forEach(function(item) {
    assert(s.market.prices[item.id] <= item.maxPrice, 'event effect cannot exceed maxPrice: ' + item.id);
    assert(s.market.prices[item.id] >= item.minPrice, 'event effect cannot go below minPrice: ' + item.id);
  });
})();

(function() {
  // Prices stay within min/max with extreme drop
  var s = freshInitedState();
  MD.applyEventEffect(s, 'harvest_festival', 0.001);
  MD.MARKET_ITEMS.filter(function(x) { return x.category === 'food'; }).forEach(function(item) {
    assert(s.market.prices[item.id] >= item.minPrice, 'extreme drop clamped to minPrice: ' + item.id);
  });
})();

(function() {
  // Returns state
  var s = freshInitedState();
  var ret = MD.applyEventEffect(s, 'harvest_festival', 0.8);
  assert(ret === s, 'applyEventEffect returns state');
})();

(function() {
  // Event only affects its category, not others
  var s = freshInitedState();
  var materialsBefore = {};
  MD.MARKET_ITEMS.filter(function(x) { return x.category === 'materials'; }).forEach(function(item) {
    materialsBefore[item.id] = s.market.prices[item.id];
  });
  MD.applyEventEffect(s, 'harvest_festival', 0.5); // food only
  MD.MARKET_ITEMS.filter(function(x) { return x.category === 'materials'; }).forEach(function(item) {
    assertEqual(s.market.prices[item.id], materialsBefore[item.id], 'harvest_festival does not affect materials: ' + item.id);
  });
})();

// ---------------------------------------------------------------------------
// SUITE 19: getSupplyDemand
// ---------------------------------------------------------------------------
suite('getSupplyDemand');

(function() {
  var s = freshInitedState();
  var sd = MD.getSupplyDemand(s, 'iron_ore');
  assert(typeof sd === 'object', 'getSupplyDemand returns object');
  assert(typeof sd.supply === 'number', 'has supply');
  assert(typeof sd.demand === 'number', 'has demand');
  assert(typeof sd.ratio === 'number', 'has ratio');
})();

(function() {
  // Initial ratio is 1.0 (supply = demand at init)
  var s = freshInitedState();
  var sd = MD.getSupplyDemand(s, 'iron_ore');
  assertApprox(sd.ratio, 1.0, 0.001, 'initial supply/demand ratio is 1.0');
})();

(function() {
  // Buying increases ratio (demand > supply)
  var s = freshInitedState();
  for (var i = 0; i < 20; i++) {
    MD.recordTransaction(s, 'iron_ore', 10, true);
  }
  var sd = MD.getSupplyDemand(s, 'iron_ore');
  assert(sd.ratio > 1.0, 'buying increases demand/supply ratio (got ' + sd.ratio + ')');
})();

(function() {
  // Selling decreases ratio (supply > demand)
  var s = freshInitedState();
  for (var i = 0; i < 20; i++) {
    MD.recordTransaction(s, 'iron_ore', 10, false);
  }
  var sd = MD.getSupplyDemand(s, 'iron_ore');
  assert(sd.ratio < 1.0, 'selling decreases demand/supply ratio (got ' + sd.ratio + ')');
})();

(function() {
  // ratio = demand / supply
  var s = freshInitedState();
  MD.recordTransaction(s, 'timber', 10, true);
  var sd = MD.getSupplyDemand(s, 'timber');
  assertApprox(sd.ratio, sd.demand / sd.supply, 0.0001, 'ratio = demand / supply');
})();

(function() {
  // Unknown item returns null
  var s = freshInitedState();
  var sd = MD.getSupplyDemand(s, 'unknown_xyz');
  assert(sd === null, 'unknown item returns null from getSupplyDemand');
})();

// ---------------------------------------------------------------------------
// SUITE 20: predictPrice
// ---------------------------------------------------------------------------
suite('predictPrice');

(function() {
  // Returns a number for valid item
  var s = freshInitedState();
  for (var t = 1; t <= 15; t++) {
    MD.updatePrices(s, t);
  }
  var pred = MD.predictPrice(s, 'iron_ore', 5);
  assert(typeof pred === 'number', 'predictPrice returns number');
  assert(pred > 0, 'predictPrice returns positive number');
})();

(function() {
  // Predicted price is within item bounds
  var s = freshInitedState();
  for (var t = 1; t <= 20; t++) {
    MD.recordTransaction(s, 'iron_ore', 5, true);
    MD.updatePrices(s, t);
  }
  var ironItem = MD.MARKET_ITEMS.filter(function(x) { return x.id === 'iron_ore'; })[0];
  var pred = MD.predictPrice(s, 'iron_ore', 10);
  assert(pred >= ironItem.minPrice, 'predicted price >= minPrice');
  assert(pred <= ironItem.maxPrice, 'predicted price <= maxPrice');
})();

(function() {
  // Rising trend → prediction > current (or at least not below)
  var s = freshInitedState();
  s.market.history['iron_ore'] = [];
  for (var i = 1; i <= 12; i++) {
    s.market.history['iron_ore'].push({ tick: i, price: 10 + i * 2 });
    s.market.prices['iron_ore'] = 10 + i * 2;
  }
  var current = MD.getPrice(s, 'iron_ore');
  var pred = MD.predictPrice(s, 'iron_ore', 3);
  assert(pred >= current, 'rising trend prediction >= current price (pred=' + pred + ', current=' + current + ')');
})();

(function() {
  // Falling trend → prediction <= current
  var s = freshInitedState();
  s.market.history['iron_ore'] = [];
  for (var i = 1; i <= 12; i++) {
    s.market.history['iron_ore'].push({ tick: i, price: 50 - i * 2 });
    s.market.prices['iron_ore'] = 50 - i * 2;
  }
  var current = MD.getPrice(s, 'iron_ore');
  var pred = MD.predictPrice(s, 'iron_ore', 3);
  assert(pred <= current, 'falling trend prediction <= current price (pred=' + pred + ', current=' + current + ')');
})();

(function() {
  // Unknown item returns null
  var pred = MD.predictPrice(freshInitedState(), 'totally_unknown_item', 5);
  assert(pred === null, 'predictPrice returns null for unknown item');
})();

// ---------------------------------------------------------------------------
// SUITE 21: Edge Cases
// ---------------------------------------------------------------------------
suite('Edge Cases');

(function() {
  // initMarket on state that already has market does not wipe data
  var s = freshState();
  s.market = { prices: { iron_ore: 999 }, supply: {}, demand: {}, history: {}, merchants: [], lastUpdate: 0 };
  MD.initMarket(s);
  assertEqual(s.market.prices['iron_ore'], 999, 'initMarket does not overwrite existing price');
})();

(function() {
  // updatePrices on uninited state auto-inits
  var s = freshState();
  MD.updatePrices(s, 1);
  assert(s.market !== undefined, 'updatePrices auto-inits market');
})();

(function() {
  // recordTransaction on uninited state auto-inits
  var s = freshState();
  MD.recordTransaction(s, 'iron_ore', 1, true);
  assert(s.market !== undefined, 'recordTransaction auto-inits market');
})();

(function() {
  // getTopMovers on state with no history returns empty
  var s = freshInitedState();
  var movers = MD.getTopMovers(s, 5);
  assert(Array.isArray(movers), 'getTopMovers returns array with no history');
})();

(function() {
  // Multiple category events stack correctly
  var s = freshInitedState();
  MD.applyEventEffect(s, 'harvest_festival', 0.8);
  MD.applyEventEffect(s, 'harvest_festival', 0.8);
  var foodItems = MD.MARKET_ITEMS.filter(function(x) { return x.category === 'food'; });
  foodItems.forEach(function(item) {
    assert(s.market.prices[item.id] >= item.minPrice, 'stacked events still clamp to minPrice: ' + item.id);
  });
})();

(function() {
  // spawnMerchant on uninited state auto-inits
  var s = freshState();
  MD.spawnMerchant(s, 42, 1);
  assert(s.market !== undefined, 'spawnMerchant auto-inits market');
})();

(function() {
  // buyFromMerchant with market not initialized
  var s = freshState();
  var result = MD.buyFromMerchant(s, 'player', 'some_id', 'item', 1);
  assert(result.success === false, 'buyFromMerchant fails gracefully without market');
})();

(function() {
  // getMarketStats on uninited state
  var s = freshState();
  var stats = MD.getMarketStats(s);
  assert(typeof stats === 'object', 'getMarketStats handles uninited state');
  assertEqual(stats.totalVolume, 0, 'totalVolume 0 for uninited state');
})();

(function() {
  // Price history tick values are ordered
  var s = freshInitedState();
  for (var t = 10; t <= 20; t++) {
    MD.updatePrices(s, t);
  }
  var hist = MD.getPriceHistory(s, 'iron_ore', 20);
  for (var i = 1; i < hist.length; i++) {
    assert(hist[i].tick >= hist[i - 1].tick, 'history ticks are non-decreasing');
  }
})();

(function() {
  // getAllPrices returns fresh copy each call
  var s = freshInitedState();
  var p1 = MD.getAllPrices(s);
  p1['iron_ore'] = 9999;
  var p2 = MD.getAllPrices(s);
  assert(p2['iron_ore'] !== 9999, 'getAllPrices returns copy, not reference');
})();

// ---------------------------------------------------------------------------
// Final Report
// ---------------------------------------------------------------------------
console.log('\n============================');
console.log('Market Dynamics Test Results');
console.log('============================');
console.log('Passed: ' + passed);
console.log('Failed: ' + failed);
if (failures.length > 0) {
  console.log('\nFailures:');
  failures.forEach(function(f, i) { console.log('  ' + (i + 1) + '. ' + f); });
}
console.log('');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('All ' + passed + ' tests passed.');
  process.exit(0);
}
