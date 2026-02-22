/**
 * tests/test_market_signals.js
 * 125+ tests for src/js/market_signals.js
 *
 * Run with: node tests/test_market_signals.js
 */

'use strict';

var MS = require('../src/js/market_signals');

// ============================================================================
// TEST HARNESS
// ============================================================================

var passed = 0;
var failed = 0;
var failures = [];
var currentSuite = '';

function suite(name, fn) {
  currentSuite = name;
  console.log('\n' + name);
  fn();
}

function assert(condition, msg) {
  if (condition) {
    passed++;
    process.stdout.write('  ok - ' + msg + '\n');
  } else {
    failed++;
    var fullMsg = '[' + currentSuite + '] FAIL: ' + msg;
    failures.push(fullMsg);
    process.stdout.write('  FAIL - ' + msg + '\n');
  }
}

function assertEqual(a, b, msg) {
  assert(a === b, (msg || '') + ' (expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a) + ')');
}

function assertClose(a, b, tolerance, msg) {
  var diff = Math.abs(a - b);
  assert(diff <= tolerance, (msg || '') + ' (expected ' + b + ' +-' + tolerance + ', got ' + a + ')');
}

function assertArray(v, msg) {
  assert(Array.isArray(v), (msg || '') + ' (expected array, got ' + typeof v + ')');
}

function assertObject(v, msg) {
  assert(v !== null && typeof v === 'object' && !Array.isArray(v), (msg || '') + ' (expected object)');
}

// ============================================================================
// HELPERS
// ============================================================================

function freshState() {
  return MS.createState();
}

// Record several trades for an item in a zone
function seedTrades(state, itemId, zone, prices, isBuy) {
  for (var i = 0; i < prices.length; i++) {
    MS.recordTrade(state, itemId, zone, prices[i], 10, isBuy !== false, i + 1);
  }
}

// ============================================================================
// SUITE 1: MODULE EXPORTS
// ============================================================================

suite('Module exports', function() {
  assert(typeof MS === 'object', 'module exports an object');
  assert(Array.isArray(MS.TRACKED_ITEMS), 'TRACKED_ITEMS is an array');
  assert(typeof MS.createState === 'function', 'createState is a function');
  assert(typeof MS.recordTrade === 'function', 'recordTrade is a function');
  assert(typeof MS.getPriceHistory === 'function', 'getPriceHistory is a function');
  assert(typeof MS.getCurrentPrice === 'function', 'getCurrentPrice is a function');
  assert(typeof MS.getVolatilityIndex === 'function', 'getVolatilityIndex is a function');
  assert(typeof MS.getSentiment === 'function', 'getSentiment is a function');
  assert(typeof MS.getMovingAverage === 'function', 'getMovingAverage is a function');
  assert(typeof MS.setAlert === 'function', 'setAlert is a function');
  assert(typeof MS.removeAlert === 'function', 'removeAlert is a function');
  assert(typeof MS.checkAlerts === 'function', 'checkAlerts is a function');
  assert(typeof MS.getPlayerAlerts === 'function', 'getPlayerAlerts is a function');
  assert(typeof MS.getTrendReport === 'function', 'getTrendReport is a function');
  assert(typeof MS.findArbitrage === 'function', 'findArbitrage is a function');
  assert(typeof MS.getVolumeReport === 'function', 'getVolumeReport is a function');
  assert(typeof MS.getMarketOverview === 'function', 'getMarketOverview is a function');
  assert(typeof MS.getItemReport === 'function', 'getItemReport is a function');
  assert(typeof MS.getTopTraded === 'function', 'getTopTraded is a function');
  assert(typeof MS.getZoneMarketHealth === 'function', 'getZoneMarketHealth is a function');
  assert(typeof MS.getTradeLog === 'function', 'getTradeLog is a function');
  assert(typeof MS.mulberry32 === 'function', 'mulberry32 is a function');
});

// ============================================================================
// SUITE 2: TRACKED_ITEMS DATA INTEGRITY
// ============================================================================

suite('TRACKED_ITEMS data integrity', function() {
  assertEqual(MS.TRACKED_ITEMS.length, 25, '25 items tracked');

  var ids = {};
  var allHaveRequiredFields = true;
  var allPositiveBasePrices = true;

  for (var i = 0; i < MS.TRACKED_ITEMS.length; i++) {
    var item = MS.TRACKED_ITEMS[i];
    if (!item.id || !item.name || !item.category || !item.basePrice) {
      allHaveRequiredFields = false;
    }
    if (item.basePrice <= 0) allPositiveBasePrices = false;
    ids[item.id] = (ids[item.id] || 0) + 1;
  }
  assert(allHaveRequiredFields, 'all items have id, name, category, basePrice');
  assert(allPositiveBasePrices, 'all base prices are positive');

  var uniqueIds = true;
  for (var id in ids) {
    if (ids[id] > 1) { uniqueIds = false; break; }
  }
  assert(uniqueIds, 'all item IDs are unique');

  // Check known items
  var ironOre = MS.TRACKED_ITEMS.filter(function(i) { return i.id === 'iron_ore'; });
  assert(ironOre.length === 1, 'iron_ore exists');
  assertEqual(ironOre[0].basePrice, 10, 'iron_ore basePrice is 10');

  var dragonScale = MS.TRACKED_ITEMS.filter(function(i) { return i.id === 'dragon_scale'; });
  assert(dragonScale.length === 1, 'dragon_scale exists');
  assertEqual(dragonScale[0].basePrice, 200, 'dragon_scale basePrice is 200');

  // Categories present
  var categories = {};
  for (var j = 0; j < MS.TRACKED_ITEMS.length; j++) {
    categories[MS.TRACKED_ITEMS[j].category] = true;
  }
  assert(categories['materials'], 'materials category present');
  assert(categories['tools'], 'tools category present');
  assert(categories['weapons'], 'weapons category present');
  assert(categories['armor'], 'armor category present');
  assert(categories['food'], 'food category present');
  assert(categories['potions'], 'potions category present');
  assert(categories['decorations'], 'decorations category present');
  assert(categories['rare'], 'rare category present');
});

// ============================================================================
// SUITE 3: createState
// ============================================================================

suite('createState', function() {
  var state = freshState();

  assertObject(state, 'createState returns an object');
  assertObject(state.priceHistory, 'priceHistory is an object');
  assertObject(state.volumes, 'volumes is an object');
  assertArray(state.alerts, 'alerts is an array');
  assertObject(state.sentiments, 'sentiments is an object');
  assertArray(state.tradeLog, 'tradeLog is an array');

  assertEqual(state.alerts.length, 0, 'alerts starts empty');
  assertEqual(state.tradeLog.length, 0, 'tradeLog starts empty');
  assertEqual(Object.keys(state.priceHistory).length, 0, 'priceHistory starts empty');
  assertEqual(Object.keys(state.volumes).length, 0, 'volumes starts empty');

  // Multiple calls return independent objects
  var s1 = freshState();
  var s2 = freshState();
  s1.tradeLog.push({ test: true });
  assertEqual(s2.tradeLog.length, 0, 'states are independent');
});

// ============================================================================
// SUITE 4: recordTrade
// ============================================================================

suite('recordTrade', function() {
  var state = freshState();

  var result = MS.recordTrade(state, 'iron_ore', 'nexus', 12, 5, true, 1);
  assertObject(result, 'returns object');
  assertEqual(result.success, true, 'valid trade returns success:true');
  assertArray(result.alerts, 'returns alerts array');

  // Price history populated
  var hist = MS.getPriceHistory(state, 'iron_ore', 'nexus', 30);
  assertEqual(hist.length, 1, 'one trade recorded in history');
  assertEqual(hist[0].price, 12, 'price recorded correctly');
  assertEqual(hist[0].volume, 5, 'volume recorded correctly');
  assertEqual(hist[0].tick, 1, 'tick recorded correctly');

  // Trade log populated
  assertEqual(state.tradeLog.length, 1, 'tradeLog has one entry');
  assertEqual(state.tradeLog[0].itemId, 'iron_ore', 'tradeLog itemId correct');
  assertEqual(state.tradeLog[0].zone, 'nexus', 'tradeLog zone correct');
  assertEqual(state.tradeLog[0].isBuy, true, 'tradeLog isBuy correct');

  // Invalid item
  var bad = MS.recordTrade(state, 'fake_item', 'nexus', 10, 1, true, 2);
  assertEqual(bad.success, false, 'invalid itemId returns success:false');

  // Invalid price
  var badPrice = MS.recordTrade(state, 'iron_ore', 'nexus', 0, 1, true, 2);
  assertEqual(badPrice.success, false, 'zero price returns success:false');

  // Invalid quantity
  var badQty = MS.recordTrade(state, 'iron_ore', 'nexus', 10, 0, true, 2);
  assertEqual(badQty.success, false, 'zero quantity returns success:false');

  // Buy vs sell volume
  var s2 = freshState();
  MS.recordTrade(s2, 'timber', 'agora', 7, 100, true, 1);
  MS.recordTrade(s2, 'timber', 'agora', 6, 50, false, 2);
  var vol = s2.volumes['timber:agora'];
  assertEqual(vol.buyVolume, 100, 'buyVolume tracked');
  assertEqual(vol.sellVolume, 50, 'sellVolume tracked');

  // Multiple trades same tick
  var s3 = freshState();
  MS.recordTrade(s3, 'iron_ore', 'nexus', 10, 1, true, 5);
  MS.recordTrade(s3, 'iron_ore', 'nexus', 11, 2, true, 5);
  var vol2 = s3.volumes['iron_ore:nexus'];
  assertEqual(vol2.ticks[5].buy, 3, 'volumes accumulate in same tick');
});

// ============================================================================
// SUITE 5: Rolling 30-tick history
// ============================================================================

suite('Rolling 30-tick history', function() {
  var state = freshState();

  // Record 35 trades — should only keep last 30
  for (var i = 1; i <= 35; i++) {
    MS.recordTrade(state, 'copper_ore', 'gardens', 8 + i, 1, true, i);
  }

  var hist = MS.getPriceHistory(state, 'copper_ore', 'gardens', 30);
  assertEqual(hist.length, 30, 'history capped at 30 entries');
  assertEqual(hist[0].price, 8 + 6, 'oldest entry is tick 6 (first 5 dropped)');
  assertEqual(hist[29].price, 8 + 35, 'newest entry is tick 35');

  // getPriceHistory with limit
  var limited = MS.getPriceHistory(state, 'copper_ore', 'gardens', 5);
  assertEqual(limited.length, 5, 'getPriceHistory respects ticks limit');
  assertEqual(limited[4].price, 8 + 35, 'last entry in limited is most recent');

  // No history returns empty array
  var empty = MS.getPriceHistory(freshState(), 'iron_ore', 'nexus', 10);
  assertEqual(empty.length, 0, 'no history returns empty array');
});

// ============================================================================
// SUITE 6: getCurrentPrice
// ============================================================================

suite('getCurrentPrice', function() {
  var state = freshState();

  // No trades: returns base price
  var baseVal = MS.getCurrentPrice(state, 'iron_ore', 'nexus');
  assertEqual(baseVal, 10, 'returns base price when no trades');

  // After one trade
  MS.recordTrade(state, 'iron_ore', 'nexus', 15, 1, true, 1);
  assertEqual(MS.getCurrentPrice(state, 'iron_ore', 'nexus'), 15, 'returns latest trade price');

  // After multiple trades
  MS.recordTrade(state, 'iron_ore', 'nexus', 20, 1, true, 2);
  MS.recordTrade(state, 'iron_ore', 'nexus', 18, 1, true, 3);
  assertEqual(MS.getCurrentPrice(state, 'iron_ore', 'nexus'), 18, 'returns most recent trade price');

  // Different zones are independent
  MS.recordTrade(state, 'iron_ore', 'agora', 25, 1, true, 1);
  assertEqual(MS.getCurrentPrice(state, 'iron_ore', 'agora'), 25, 'zone prices are independent');
  assertEqual(MS.getCurrentPrice(state, 'iron_ore', 'nexus'), 18, 'nexus price unchanged by agora trade');
});

// ============================================================================
// SUITE 7: getVolatilityIndex
// ============================================================================

suite('getVolatilityIndex', function() {
  // Empty history = stable
  var s = freshState();
  var vi = MS.getVolatilityIndex(s, 'iron_ore', 'nexus');
  assertObject(vi, 'returns object');
  assertEqual(vi.label, 'stable', 'no history = stable');
  assertEqual(vi.index, 0, 'no history = index 0');

  // Stable prices (small change)
  var s2 = freshState();
  seedTrades(s2, 'iron_ore', 'nexus', [10, 10, 10, 10, 10, 10, 10, 10, 10, 10]);
  var vi2 = MS.getVolatilityIndex(s2, 'iron_ore', 'nexus');
  assertEqual(vi2.label, 'stable', 'constant prices = stable');

  // Rising prices (5-15% change)
  var s3 = freshState();
  seedTrades(s3, 'silver_ore', 'nexus', [25, 26, 27, 27.5, 28]);
  var vi3 = MS.getVolatilityIndex(s3, 'silver_ore', 'nexus');
  assert(vi3.label === 'stable' || vi3.label === 'rising', 'moderate change = stable or rising');

  // Volatile prices (15-30% change)
  var s4 = freshState();
  seedTrades(s4, 'star_crystal', 'nexus', [100, 120, 95, 125, 130]);
  var vi4 = MS.getVolatilityIndex(s4, 'star_crystal', 'nexus');
  assert(vi4.label === 'volatile' || vi4.label === 'extreme' || vi4.label === 'rising', 'large swings = volatile+');

  // Extreme prices (>30% change)
  var s5 = freshState();
  seedTrades(s5, 'dragon_scale', 'nexus', [200, 300, 150, 350, 100]);
  var vi5 = MS.getVolatilityIndex(s5, 'dragon_scale', 'nexus');
  assert(vi5.label === 'volatile' || vi5.label === 'extreme', 'extreme swings = volatile or extreme');
  assert(vi5.changePercent >= 0, 'changePercent is non-negative');
  assert(vi5.index >= 0, 'index is non-negative');

  // Label set membership
  var s6 = freshState();
  seedTrades(s6, 'iron_ore', 'agora', [10, 11, 12, 13, 14]);
  var vi6 = MS.getVolatilityIndex(s6, 'iron_ore', 'agora');
  var validLabels = ['stable', 'rising', 'volatile', 'extreme'];
  assert(validLabels.indexOf(vi6.label) !== -1, 'label is a valid volatility category');
});

// ============================================================================
// SUITE 8: getSentiment
// ============================================================================

suite('getSentiment', function() {
  // No data = neutral
  var s = freshState();
  var sent = MS.getSentiment(s, 'iron_ore');
  assertObject(sent, 'getSentiment returns object');
  assertEqual(sent.sentiment, 'neutral', 'no data = neutral');
  assertEqual(sent.confidence, 0, 'no data = zero confidence');
  assertEqual(sent.trend, 'flat', 'no data = flat trend');

  // Bullish: prices rising significantly
  var s2 = freshState();
  seedTrades(s2, 'iron_ore', 'nexus', [10, 11, 12, 13, 14, 15]);
  var sent2 = MS.getSentiment(s2, 'iron_ore');
  assertEqual(sent2.sentiment, 'bullish', 'rising prices = bullish');
  assertEqual(sent2.trend, 'rising', 'rising prices = rising trend');
  assert(sent2.confidence > 0, 'bullish has positive confidence');
  assert(sent2.confidence <= 1, 'confidence does not exceed 1');

  // Bearish: prices falling significantly
  var s3 = freshState();
  seedTrades(s3, 'iron_ore', 'nexus', [15, 13, 11, 9, 7]);
  var sent3 = MS.getSentiment(s3, 'iron_ore');
  assertEqual(sent3.sentiment, 'bearish', 'falling prices = bearish');
  assertEqual(sent3.trend, 'falling', 'falling prices = falling trend');
  assert(sent3.confidence > 0, 'bearish has positive confidence');

  // Valid sentiment values
  var validSentiments = ['bullish', 'bearish', 'neutral'];
  var validTrends = ['rising', 'falling', 'flat'];
  assert(validSentiments.indexOf(sent3.sentiment) !== -1, 'sentiment is valid value');
  assert(validTrends.indexOf(sent3.trend) !== -1, 'trend is valid value');
});

// ============================================================================
// SUITE 9: getMovingAverage
// ============================================================================

suite('getMovingAverage', function() {
  // No data = base price
  var s = freshState();
  var ma = MS.getMovingAverage(s, 'iron_ore', 'nexus', 5);
  assertEqual(ma, 10, 'no data returns base price');

  // 5-tick MA
  var s2 = freshState();
  seedTrades(s2, 'iron_ore', 'nexus', [10, 12, 14, 16, 18]);
  var ma5 = MS.getMovingAverage(s2, 'iron_ore', 'nexus', 5);
  assertEqual(ma5, 14, '5-tick MA = (10+12+14+16+18)/5 = 14');

  // 10-tick MA with only 5 data points uses all available
  var ma10 = MS.getMovingAverage(s2, 'iron_ore', 'nexus', 10);
  assertEqual(ma10, 14, '10-tick MA with 5 points still = 14');

  // 20-tick MA
  var s3 = freshState();
  var prices20 = [];
  for (var i = 0; i < 20; i++) prices20.push(10 + i);
  seedTrades(s3, 'iron_ore', 'nexus', prices20);
  var ma20 = MS.getMovingAverage(s3, 'iron_ore', 'nexus', 20);
  // Average of 10..29 = (10+29)*20/2 / 20 = 19.5
  assertEqual(ma20, 19.5, '20-tick MA computed correctly');

  // Single data point
  var s4 = freshState();
  MS.recordTrade(s4, 'iron_ore', 'nexus', 42, 1, true, 1);
  var maSingle = MS.getMovingAverage(s4, 'iron_ore', 'nexus', 5);
  assertEqual(maSingle, 42, 'single data point MA = that price');
});

// ============================================================================
// SUITE 10: setAlert / removeAlert / getPlayerAlerts
// ============================================================================

suite('setAlert / removeAlert / getPlayerAlerts', function() {
  var s = freshState();

  // Set an above alert
  var r1 = MS.setAlert(s, 'alice', 'iron_ore', 20, 'above', 'nexus');
  assertObject(r1, 'setAlert returns object');
  assertEqual(r1.success, true, 'valid setAlert returns success:true');
  assert(typeof r1.alertId === 'string', 'alertId is a string');
  assert(r1.alertId.length > 0, 'alertId is non-empty');

  // Set a below alert
  var r2 = MS.setAlert(s, 'alice', 'iron_ore', 5, 'below', 'nexus');
  assertEqual(r2.success, true, 'below alert set successfully');
  assert(r2.alertId !== r1.alertId, 'alert IDs are unique');

  // State has 2 alerts
  assertEqual(s.alerts.length, 2, 'two alerts in state');

  // getPlayerAlerts
  var aliceAlerts = MS.getPlayerAlerts(s, 'alice');
  assertEqual(aliceAlerts.length, 2, 'alice has 2 alerts');

  // Another player has 0
  var bobAlerts = MS.getPlayerAlerts(s, 'bob');
  assertEqual(bobAlerts.length, 0, 'bob has 0 alerts');

  // Invalid item
  var bad = MS.setAlert(s, 'alice', 'fake_item', 10, 'above', 'nexus');
  assertEqual(bad.success, false, 'invalid item returns success:false');
  assert(!bad.alertId || bad.alertId === null, 'invalid alert has null alertId');

  // Invalid direction
  var badDir = MS.setAlert(s, 'alice', 'iron_ore', 10, 'sideways', 'nexus');
  assertEqual(badDir.success, false, 'invalid direction returns success:false');

  // Invalid price
  var badPrice = MS.setAlert(s, 'alice', 'iron_ore', 0, 'above', 'nexus');
  assertEqual(badPrice.success, false, 'zero target price returns success:false');

  // removeAlert
  var rem = MS.removeAlert(s, r1.alertId);
  assertEqual(rem.success, true, 'removeAlert returns success:true');
  assertEqual(s.alerts.length, 1, 'alert removed from state');

  // Remove non-existent alert
  var remBad = MS.removeAlert(s, 'fake_alert_id');
  assertEqual(remBad.success, false, 'removing non-existent alert returns success:false');

  // Alert for different zone
  var s2 = freshState();
  MS.setAlert(s2, 'bob', 'silver_ore', 30, 'above', 'agora');
  var bobAlerts2 = MS.getPlayerAlerts(s2, 'bob');
  assertEqual(bobAlerts2[0].zone, 'agora', 'alert zone stored correctly');
  assertEqual(bobAlerts2[0].targetPrice, 30, 'targetPrice stored correctly');
  assertEqual(bobAlerts2[0].direction, 'above', 'direction stored correctly');
});

// ============================================================================
// SUITE 11: checkAlerts
// ============================================================================

suite('checkAlerts', function() {
  // Alert not triggered
  var s = freshState();
  MS.setAlert(s, 'alice', 'iron_ore', 20, 'above', 'nexus');
  MS.recordTrade(s, 'iron_ore', 'nexus', 15, 1, true, 1);
  var check1 = MS.checkAlerts(s, 1);
  assertObject(check1, 'checkAlerts returns object');
  assertArray(check1.triggered, 'triggered is an array');
  assertEqual(check1.triggered.length, 0, 'alert not triggered when price below target');
  assertEqual(s.alerts.length, 1, 'unTriggered alert remains');

  // Alert triggered (above): set alert AFTER trade so recordTrade doesn't consume it
  var s2 = freshState();
  MS.recordTrade(s2, 'iron_ore', 'nexus', 20, 1, true, 2);  // price is now 20
  var alertResult = MS.setAlert(s2, 'bob', 'iron_ore', 15, 'above', 'nexus');  // target 15, current 20 → should trigger
  var check2 = MS.checkAlerts(s2, 2);
  assertEqual(check2.triggered.length, 1, 'above alert triggered when price exceeds target');
  assertEqual(check2.triggered[0].playerId, 'bob', 'triggered contains correct playerId');
  assertEqual(check2.triggered[0].itemId, 'iron_ore', 'triggered contains correct itemId');
  assertEqual(check2.triggered[0].alertId, alertResult.alertId, 'triggered contains correct alertId');
  assert(check2.triggered[0].price >= 15, 'triggered price is at or above target');
  assertEqual(s2.alerts.length, 0, 'triggered alert is removed from state');

  // Alert triggered (below): set alert AFTER trade
  var s3 = freshState();
  MS.recordTrade(s3, 'iron_ore', 'nexus', 5, 1, false, 1);  // price is now 5
  MS.setAlert(s3, 'carol', 'iron_ore', 8, 'below', 'nexus');  // target 8, current 5 → triggers
  var check3 = MS.checkAlerts(s3, 1);
  assertEqual(check3.triggered.length, 1, 'below alert triggered when price drops below target');
  assertEqual(check3.triggered[0].playerId, 'carol', 'triggered below alert correct player');

  // Alert exactly at target price: set alert AFTER trade
  var s4 = freshState();
  MS.recordTrade(s4, 'iron_ore', 'nexus', 12, 1, true, 1);  // price is now 12
  MS.setAlert(s4, 'dave', 'iron_ore', 12, 'above', 'nexus');  // target 12, current 12 → triggers (>=)
  var check4 = MS.checkAlerts(s4, 1);
  assertEqual(check4.triggered.length, 1, 'alert triggers when price exactly equals target');

  // Alert without zone checks all zones: set alert AFTER trade
  var s5 = freshState();
  MS.recordTrade(s5, 'iron_ore', 'wilds', 30, 1, true, 1);  // price in wilds = 30
  MS.setAlert(s5, 'eve', 'iron_ore', 25, 'above', null);  // no zone, target 25; wilds=30 → triggers
  var check5 = MS.checkAlerts(s5, 1);
  assertEqual(check5.triggered.length, 1, 'no-zone alert triggered by any zone price');

  // recordTrade auto-checks alerts and returns triggered
  var s6 = freshState();
  MS.setAlert(s6, 'frank', 'copper_ore', 12, 'above', 'nexus');
  var tradeResult = MS.recordTrade(s6, 'copper_ore', 'nexus', 15, 1, true, 1);
  assertEqual(tradeResult.alerts.length, 1, 'recordTrade returns triggered alerts');
  assertEqual(tradeResult.alerts[0].playerId, 'frank', 'alert from recordTrade has correct player');
});

// ============================================================================
// SUITE 12: getTrendReport
// ============================================================================

suite('getTrendReport', function() {
  var s = freshState();

  var report = MS.getTrendReport(s, 'nexus');
  assertObject(report, 'returns object');
  assertArray(report.gainers, 'gainers is array');
  assertArray(report.losers, 'losers is array');
  assertArray(report.shortages, 'shortages is array');

  // Gainers not exceed 5
  assert(report.gainers.length <= 5, 'gainers limited to 5');
  assert(report.losers.length <= 5, 'losers limited to 5');

  // Gainers are sorted descending
  var gainersSorted = true;
  for (var i = 0; i < report.gainers.length - 1; i++) {
    if (report.gainers[i].changePercent < report.gainers[i + 1].changePercent) {
      gainersSorted = false;
      break;
    }
  }
  assert(gainersSorted, 'gainers sorted descending by changePercent');

  // Losers sorted ascending
  var losersSorted = true;
  for (var j = 0; j < report.losers.length - 1; j++) {
    if (report.losers[j].changePercent > report.losers[j + 1].changePercent) {
      losersSorted = false;
      break;
    }
  }
  assert(losersSorted, 'losers sorted ascending by changePercent');

  // Shortage detection
  var s2 = freshState();
  // More buys than sells = shortage
  MS.recordTrade(s2, 'herb_bundle', 'nexus', 12, 100, true, 1);  // buy
  MS.recordTrade(s2, 'herb_bundle', 'nexus', 12, 20, false, 2);  // sell (less)
  var report2 = MS.getTrendReport(s2, 'nexus');
  var herbShortage = report2.shortages.filter(function(x) { return x.itemId === 'herb_bundle'; });
  assertEqual(herbShortage.length, 1, 'herb_bundle flagged as shortage when buys > sells');

  // Gainers contain itemId and name
  if (report.gainers.length > 0) {
    assert(typeof report.gainers[0].itemId === 'string', 'gainer has itemId');
    assert(typeof report.gainers[0].name === 'string', 'gainer has name');
    assert(typeof report.gainers[0].changePercent === 'number', 'gainer has changePercent');
    assert(typeof report.gainers[0].currentPrice === 'number', 'gainer has currentPrice');
  }
});

// ============================================================================
// SUITE 13: findArbitrage
// ============================================================================

suite('findArbitrage', function() {
  var s = freshState();
  var arb = MS.findArbitrage(s);
  assertArray(arb, 'findArbitrage returns array');

  // No trades = no arbitrage (all zones have same base price)
  // (Some items may show no arb since all zones return basePrice)
  assertEqual(arb.length, 0, 'no trades = no arbitrage opportunities');

  // Create price differential > 5%
  var s2 = freshState();
  MS.recordTrade(s2, 'iron_ore', 'nexus', 10, 1, false, 1);   // cheapest zone
  MS.recordTrade(s2, 'iron_ore', 'agora', 20, 1, true, 1);    // most expensive zone (100% diff)
  var arb2 = MS.findArbitrage(s2);
  assert(arb2.length >= 1, 'price differential creates arbitrage');

  var opp = arb2[0];
  assert(typeof opp.itemId === 'string', 'arbitrage has itemId');
  assert(typeof opp.buyZone === 'string', 'arbitrage has buyZone');
  assert(typeof opp.sellZone === 'string', 'arbitrage has sellZone');
  assert(typeof opp.profit === 'number', 'arbitrage has profit');
  assert(typeof opp.profitPercent === 'number', 'arbitrage has profitPercent');
  assert(opp.profit > 0, 'arbitrage profit is positive');
  assert(opp.profitPercent > 5, 'arbitrage profitPercent > 5%');
  assert(opp.buyZone !== opp.sellZone, 'buy and sell zones are different');
  assertEqual(opp.itemId, 'iron_ore', 'correct item identified for arbitrage');

  // Sorted descending by profitPercent
  var s3 = freshState();
  MS.recordTrade(s3, 'iron_ore', 'nexus', 10, 1, false, 1);
  MS.recordTrade(s3, 'iron_ore', 'agora', 20, 1, true, 1);
  MS.recordTrade(s3, 'copper_ore', 'nexus', 8, 1, false, 1);
  MS.recordTrade(s3, 'copper_ore', 'studio', 24, 1, true, 1);  // 200% profit
  var arb3 = MS.findArbitrage(s3);
  if (arb3.length >= 2) {
    assert(arb3[0].profitPercent >= arb3[1].profitPercent, 'arbitrage sorted by profitPercent desc');
  }
});

// ============================================================================
// SUITE 14: getVolumeReport
// ============================================================================

suite('getVolumeReport', function() {
  var s = freshState();
  var report = MS.getVolumeReport(s, 'nexus', 10);
  assertArray(report, 'returns array');
  assertEqual(report.length, 25, 'one entry per tracked item');

  // Each entry has required fields
  var r = report[0];
  assert(typeof r.itemId === 'string', 'entry has itemId');
  assert(typeof r.name === 'string', 'entry has name');
  assert(typeof r.buyVolume === 'number', 'entry has buyVolume');
  assert(typeof r.sellVolume === 'number', 'entry has sellVolume');
  assert(typeof r.netVolume === 'number', 'entry has netVolume');

  // Zero volumes for untouched item
  var ironEntry = report.filter(function(e) { return e.itemId === 'iron_ore'; })[0];
  assertEqual(ironEntry.buyVolume, 0, 'untouched item has 0 buyVolume');
  assertEqual(ironEntry.sellVolume, 0, 'untouched item has 0 sellVolume');

  // After trades
  var s2 = freshState();
  MS.recordTrade(s2, 'iron_ore', 'nexus', 10, 50, true, 1);
  MS.recordTrade(s2, 'iron_ore', 'nexus', 10, 30, false, 1);
  var report2 = MS.getVolumeReport(s2, 'nexus', 10);
  var ironEntry2 = report2.filter(function(e) { return e.itemId === 'iron_ore'; })[0];
  assertEqual(ironEntry2.buyVolume, 50, 'buy volume tracked correctly');
  assertEqual(ironEntry2.sellVolume, 30, 'sell volume tracked correctly');
  assertEqual(ironEntry2.netVolume, 20, 'net volume = buy - sell');

  // Tick-limited report
  var s3 = freshState();
  MS.recordTrade(s3, 'iron_ore', 'nexus', 10, 100, true, 1);  // tick 1
  MS.recordTrade(s3, 'iron_ore', 'nexus', 10, 100, true, 2);  // tick 2
  MS.recordTrade(s3, 'iron_ore', 'nexus', 10, 100, true, 3);  // tick 3
  // Only ask for last 1 tick (tick 3)
  var report3 = MS.getVolumeReport(s3, 'nexus', 1);
  var ironEntry3 = report3.filter(function(e) { return e.itemId === 'iron_ore'; })[0];
  assertEqual(ironEntry3.buyVolume, 100, 'tick-limited report uses only recent ticks');
});

// ============================================================================
// SUITE 15: getMarketOverview
// ============================================================================

suite('getMarketOverview', function() {
  var s = freshState();
  var overview = MS.getMarketOverview(s);
  assertObject(overview, 'returns object');
  assertEqual(overview.totalTrades, 0, 'empty state has 0 trades');
  assertEqual(overview.totalVolume, 0, 'empty state has 0 volume');
  assertEqual(overview.totalValue, 0, 'empty state has 0 value');
  assertEqual(overview.activeAlerts, 0, 'empty state has 0 alerts');
  assertEqual(overview.trackedMarkets, 0, 'empty state has 0 tracked markets');

  // After some trades
  var s2 = freshState();
  MS.recordTrade(s2, 'iron_ore', 'nexus', 10, 5, true, 1);
  MS.recordTrade(s2, 'copper_ore', 'agora', 8, 10, false, 2);
  MS.setAlert(s2, 'alice', 'iron_ore', 20, 'above', 'nexus');

  var ov2 = MS.getMarketOverview(s2);
  assertEqual(ov2.totalTrades, 2, 'totalTrades counts all trades');
  assertEqual(ov2.totalVolume, 15, 'totalVolume = 5 + 10');
  assertEqual(ov2.totalValue, 130, 'totalValue = 10*5 + 8*10');
  assertClose(ov2.avgPrice, 130 / 15, 0.001, 'avgPrice = totalValue / totalVolume');
  assertEqual(ov2.activeAlerts, 1, 'activeAlerts counts alerts');
  assertEqual(ov2.trackedMarkets, 2, 'trackedMarkets = 2 distinct item:zone pairs');

  // Sentiment counts
  assert(typeof ov2.bullishItems === 'number', 'bullishItems is number');
  assert(typeof ov2.bearishItems === 'number', 'bearishItems is number');
  assert(typeof ov2.neutralItems === 'number', 'neutralItems is number');
  assert(ov2.bullishItems >= 0, 'bullishItems >= 0');
  assert(ov2.bearishItems >= 0, 'bearishItems >= 0');
});

// ============================================================================
// SUITE 16: getItemReport
// ============================================================================

suite('getItemReport', function() {
  // Invalid item
  var s = freshState();
  var bad = MS.getItemReport(s, 'fake_item');
  assertEqual(bad, null, 'invalid item returns null');

  // Valid item
  var s2 = freshState();
  MS.recordTrade(s2, 'iron_ore', 'nexus', 12, 10, true, 1);
  MS.recordTrade(s2, 'iron_ore', 'agora', 15, 5, false, 1);

  var report = MS.getItemReport(s2, 'iron_ore');
  assertObject(report, 'returns object for valid item');
  assertEqual(report.itemId, 'iron_ore', 'itemId correct');
  assertEqual(report.name, 'Iron Ore', 'name correct');
  assertEqual(report.category, 'materials', 'category correct');
  assertEqual(report.basePrice, 10, 'basePrice correct');
  assertObject(report.sentiment, 'sentiment is object');
  assertArray(report.zones, 'zones is array');
  assertEqual(report.zones.length, 8, 'report has data for all 8 zones');

  // Zone data shape
  var nexusZone = report.zones.filter(function(z) { return z.zone === 'nexus'; })[0];
  assertObject(nexusZone, 'nexus zone data present');
  assertEqual(nexusZone.currentPrice, 12, 'nexus currentPrice correct');
  assertEqual(nexusZone.basePrice, 10, 'nexus basePrice correct');
  assert(typeof nexusZone.changePercent === 'number', 'changePercent is number');
  assertObject(nexusZone.volatility, 'volatility object present');
  assert(typeof nexusZone.ma5 === 'number', 'ma5 is number');
  assert(typeof nexusZone.ma10 === 'number', 'ma10 is number');
  assert(typeof nexusZone.ma20 === 'number', 'ma20 is number');
  assert(typeof nexusZone.buyVolume === 'number', 'buyVolume is number');
  assert(typeof nexusZone.sellVolume === 'number', 'sellVolume is number');
  assert(typeof nexusZone.historyLength === 'number', 'historyLength is number');
});

// ============================================================================
// SUITE 17: getTopTraded
// ============================================================================

suite('getTopTraded', function() {
  var s = freshState();
  var top = MS.getTopTraded(s, 'nexus', 5);
  assertArray(top, 'returns array');
  assertEqual(top.length, 5, 'returns requested count');

  // All volumes 0 when no trades
  for (var i = 0; i < top.length; i++) {
    assertEqual(top[i].totalVolume, 0, 'no trades = 0 volume for ' + top[i].itemId);
  }

  // After trades
  var s2 = freshState();
  MS.recordTrade(s2, 'iron_ore', 'nexus', 10, 1000, true, 1);
  MS.recordTrade(s2, 'copper_ore', 'nexus', 8, 500, true, 1);
  MS.recordTrade(s2, 'timber', 'nexus', 6, 200, false, 1);

  var top2 = MS.getTopTraded(s2, 'nexus', 3);
  assertEqual(top2[0].itemId, 'iron_ore', 'iron_ore is most traded');
  assertEqual(top2[0].totalVolume, 1000, 'iron_ore volume = 1000');
  assertEqual(top2[1].itemId, 'copper_ore', 'copper_ore is second');
  assertEqual(top2[2].itemId, 'timber', 'timber is third');

  // Sorted descending by totalVolume
  assert(top2[0].totalVolume >= top2[1].totalVolume, 'sorted descending (0 vs 1)');
  assert(top2[1].totalVolume >= top2[2].totalVolume, 'sorted descending (1 vs 2)');

  // Entry shape
  assert(typeof top2[0].itemId === 'string', 'entry has itemId');
  assert(typeof top2[0].name === 'string', 'entry has name');
  assert(typeof top2[0].totalVolume === 'number', 'entry has totalVolume');

  // Default count
  var topDefault = MS.getTopTraded(s2, 'nexus', 5);
  assert(topDefault.length <= 25, 'default respects total items');
});

// ============================================================================
// SUITE 18: getZoneMarketHealth
// ============================================================================

suite('getZoneMarketHealth', function() {
  var s = freshState();
  var health = MS.getZoneMarketHealth(s, 'nexus');
  assert(typeof health === 'number', 'returns a number');
  assert(health >= 0, 'health >= 0');
  assert(health <= 100, 'health <= 100');
  assert(Number.isInteger(health), 'health is an integer');

  // Empty market has some base health
  assert(health >= 0, 'empty market health is valid');

  // Active market has health
  var s2 = freshState();
  for (var i = 0; i < MS.TRACKED_ITEMS.length; i++) {
    var item = MS.TRACKED_ITEMS[i];
    MS.recordTrade(s2, item.id, 'nexus', item.basePrice, 50, true, 1);
    MS.recordTrade(s2, item.id, 'nexus', item.basePrice, 50, false, 2);
  }
  var health2 = MS.getZoneMarketHealth(s2, 'nexus');
  assert(health2 > health, 'active balanced market is healthier than empty');
  assert(health2 <= 100, 'health does not exceed 100');
});

// ============================================================================
// SUITE 19: getTradeLog
// ============================================================================

suite('getTradeLog', function() {
  var s = freshState();

  // Empty log
  var log0 = MS.getTradeLog(s, 'iron_ore', 10);
  assertArray(log0, 'returns array');
  assertEqual(log0.length, 0, 'empty log returns empty array');

  // Multiple trades
  MS.recordTrade(s, 'iron_ore', 'nexus', 10, 1, true, 1);
  MS.recordTrade(s, 'iron_ore', 'nexus', 11, 2, false, 2);
  MS.recordTrade(s, 'copper_ore', 'nexus', 8, 3, true, 3);

  // Filtered by item
  var ironLog = MS.getTradeLog(s, 'iron_ore', 10);
  assertEqual(ironLog.length, 2, 'item filter returns correct count');
  for (var i = 0; i < ironLog.length; i++) {
    assertEqual(ironLog[i].itemId, 'iron_ore', 'all filtered entries are iron_ore');
  }

  // Most recent first
  assertEqual(ironLog[0].tick, 2, 'first entry is most recent (tick 2)');
  assertEqual(ironLog[1].tick, 1, 'second entry is older (tick 1)');

  // Count limit
  var limited = MS.getTradeLog(s, null, 2);
  assertEqual(limited.length, 2, 'count limit respected');

  // All items when itemId is null
  var allLog = MS.getTradeLog(s, null, 100);
  assertEqual(allLog.length, 3, 'null itemId returns all trades');

  // Trade shape
  var trade = ironLog[0];
  assert(typeof trade.itemId === 'string', 'trade has itemId');
  assert(typeof trade.zone === 'string', 'trade has zone');
  assert(typeof trade.price === 'number', 'trade has price');
  assert(typeof trade.quantity === 'number', 'trade has quantity');
  assert(typeof trade.isBuy === 'boolean', 'trade has isBuy');
  assert(typeof trade.tick === 'number', 'trade has tick');
});

// ============================================================================
// SUITE 20: mulberry32 PRNG
// ============================================================================

suite('mulberry32 PRNG', function() {
  var rng1 = MS.mulberry32(42);
  var rng2 = MS.mulberry32(42);

  // Deterministic
  var a = rng1();
  var b = rng2();
  assertEqual(a, b, 'same seed produces same first value');

  // Produces numbers in [0, 1)
  assert(a >= 0, 'output >= 0');
  assert(a < 1, 'output < 1');

  // Different seeds produce different sequences
  var rng3 = MS.mulberry32(99);
  var c = rng3();
  assert(c !== a, 'different seeds produce different values');

  // Stateful: sequential calls differ
  var v1 = rng1();
  var v2 = rng1();
  assert(v1 !== v2, 'sequential calls produce different values');

  // 100 values all in [0,1)
  var rng4 = MS.mulberry32(12345);
  var allInRange = true;
  for (var i = 0; i < 100; i++) {
    var val = rng4();
    if (val < 0 || val >= 1) { allInRange = false; break; }
  }
  assert(allInRange, '100 values all in [0, 1)');
});

// ============================================================================
// SUITE 21: Integration — full market cycle
// ============================================================================

suite('Integration — full market cycle', function() {
  var state = freshState();

  // Simulate 20 ticks of trading across multiple zones
  var rng = MS.mulberry32(777);
  var items = ['iron_ore', 'copper_ore', 'silver_ore', 'timber', 'health_potion'];
  var zones = ['nexus', 'agora', 'gardens'];

  for (var tick = 1; tick <= 20; tick++) {
    for (var z = 0; z < zones.length; z++) {
      for (var item = 0; item < items.length; item++) {
        var prng = MS.TRACKED_ITEMS.filter(function(i) { return i.id === items[item]; })[0].basePrice;
        var price = Math.round(prng * (0.8 + rng() * 0.4));
        var qty = Math.ceil(rng() * 20);
        var isBuy = rng() > 0.5;
        MS.recordTrade(state, items[item], zones[z], price, qty, isBuy, tick);
      }
    }
  }

  // All items have history
  for (var i = 0; i < items.length; i++) {
    for (var j = 0; j < zones.length; j++) {
      var hist = MS.getPriceHistory(state, items[i], zones[j], 30);
      assert(hist.length > 0, items[i] + ' in ' + zones[j] + ' has price history');
    }
  }

  // Market overview has trades
  var overview = MS.getMarketOverview(state);
  assert(overview.totalTrades > 0, 'integration: totalTrades > 0');
  assert(overview.totalVolume > 0, 'integration: totalVolume > 0');

  // Trend report works
  var trend = MS.getTrendReport(state, 'nexus');
  assertEqual(trend.gainers.length, 5, 'integration: 5 gainers in trend report');

  // Top traded works
  var top = MS.getTopTraded(state, 'nexus', 5);
  assertEqual(top.length, 5, 'integration: getTopTraded returns 5');
  assert(top[0].totalVolume >= top[4].totalVolume, 'integration: top traded sorted correctly');

  // Arbitrage detection
  var arb = MS.findArbitrage(state);
  assert(Array.isArray(arb), 'integration: findArbitrage returns array');

  // Health scores are valid
  for (var k = 0; k < zones.length; k++) {
    var health = MS.getZoneMarketHealth(state, zones[k]);
    assert(health >= 0 && health <= 100, 'integration: health in [0,100] for ' + zones[k]);
  }

  // Alert workflow
  MS.setAlert(state, 'player1', 'iron_ore', 1, 'above', 'nexus');  // very low target = should trigger
  var alertCheck = MS.checkAlerts(state, 20);
  assertEqual(alertCheck.triggered.length, 1, 'integration: low above-alert triggered');
  assertEqual(state.alerts.length, 0, 'integration: triggered alert removed');

  // Item report is complete
  var report = MS.getItemReport(state, 'iron_ore');
  assertObject(report, 'integration: getItemReport returns object');
  assertEqual(report.zones.length, 8, 'integration: item report has all 8 zones');
});

// ============================================================================
// SUITE 22: Edge cases
// ============================================================================

suite('Edge cases', function() {
  // Negative price
  var s = freshState();
  var negPrice = MS.recordTrade(s, 'iron_ore', 'nexus', -5, 1, true, 1);
  assertEqual(negPrice.success, false, 'negative price rejected');

  // Very large price
  var bigPrice = MS.recordTrade(s, 'dragon_scale', 'nexus', 999999, 1, true, 1);
  assertEqual(bigPrice.success, true, 'very large price accepted');

  // Very large quantity
  var bigQty = MS.recordTrade(s, 'iron_ore', 'nexus', 10, 1000000, true, 1);
  assertEqual(bigQty.success, true, 'very large quantity accepted');

  // Trade in all 8 zones
  var s2 = freshState();
  var allZones = MS.ZONES;
  for (var z = 0; z < allZones.length; z++) {
    var res = MS.recordTrade(s2, 'iron_ore', allZones[z], 10 + z, 1, true, 1);
    assertEqual(res.success, true, 'trade succeeds in zone: ' + allZones[z]);
  }

  // getMovingAverage with window larger than history
  var s3 = freshState();
  MS.recordTrade(s3, 'iron_ore', 'nexus', 12, 1, true, 1);
  var ma = MS.getMovingAverage(s3, 'iron_ore', 'nexus', 20);
  assertEqual(ma, 12, 'MA with window larger than history uses available data');

  // Multiple alerts same player and item
  var s4 = freshState();
  var a1 = MS.setAlert(s4, 'alice', 'iron_ore', 15, 'above', 'nexus');
  var a2 = MS.setAlert(s4, 'alice', 'iron_ore', 5, 'below', 'nexus');
  var a3 = MS.setAlert(s4, 'alice', 'iron_ore', 20, 'above', 'agora');
  assert(a1.alertId !== a2.alertId, 'multiple alerts have unique IDs (1 vs 2)');
  assert(a2.alertId !== a3.alertId, 'multiple alerts have unique IDs (2 vs 3)');
  assertEqual(MS.getPlayerAlerts(s4, 'alice').length, 3, '3 alerts for alice');

  // Remove all alerts
  MS.removeAlert(s4, a1.alertId);
  MS.removeAlert(s4, a2.alertId);
  MS.removeAlert(s4, a3.alertId);
  assertEqual(MS.getPlayerAlerts(s4, 'alice').length, 0, 'all alerts removed');

  // getTrendReport on zone with no trades
  var s5 = freshState();
  var trend = MS.getTrendReport(s5, 'wilds');
  assert(trend.gainers.length <= 5, 'trend report with no trades returns <= 5 gainers');
  assertEqual(trend.shortages.length, 0, 'no shortages when no trades');

  // getTopTraded with count > items
  var s6 = freshState();
  var top = MS.getTopTraded(s6, 'nexus', 100);
  assertEqual(top.length, 25, 'getTopTraded clamps to total item count');

  // Sentiment updates after each trade
  var s7 = freshState();
  MS.recordTrade(s7, 'iron_ore', 'nexus', 10, 1, true, 1);
  var sent1 = MS.getSentiment(s7, 'iron_ore');
  MS.recordTrade(s7, 'iron_ore', 'nexus', 20, 1, true, 2);
  var sent2 = MS.getSentiment(s7, 'iron_ore');
  // Both should be valid objects
  assertObject(sent1, 'sentiment after 1 trade is object');
  assertObject(sent2, 'sentiment after 2 trades is object');

  // getVolumeReport with null ticks returns totals
  var s8 = freshState();
  MS.recordTrade(s8, 'iron_ore', 'nexus', 10, 50, true, 1);
  MS.recordTrade(s8, 'iron_ore', 'nexus', 10, 30, false, 2);
  var volReport = MS.getVolumeReport(s8, 'nexus', null);
  var ironVol = volReport.filter(function(e) { return e.itemId === 'iron_ore'; })[0];
  assertEqual(ironVol.buyVolume, 50, 'null ticks returns all-time buy volume');
  assertEqual(ironVol.sellVolume, 30, 'null ticks returns all-time sell volume');
});

// ============================================================================
// FINAL SUMMARY
// ============================================================================

console.log('\n============================================================');
console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
if (failures.length > 0) {
  console.log('\nFailures:');
  for (var f = 0; f < failures.length; f++) {
    console.log('  ' + failures[f]);
  }
}
console.log('============================================================');

process.exit(failed > 0 ? 1 : 0);
