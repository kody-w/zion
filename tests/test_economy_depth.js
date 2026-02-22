/**
 * test_economy_depth.js — Tests for economy depth features
 */

(function() {
  'use strict';

  var MarketDynamics;
  try { MarketDynamics = require('../src/js/market_dynamics'); } catch(e) { MarketDynamics = {}; }
  var Economy;
  try { Economy = require('../src/js/economy'); } catch(e) { Economy = {}; }

  var passed = 0;
  var failed = 0;

  function assert(condition, msg) {
    if (condition) { passed++; }
    else { failed++; console.error('FAIL: ' + msg); }
  }

  // --- Crafted Item Pricing ---

  // Test 1: getCraftedItemPrice returns correct value for known recipe
  var state = {};
  MarketDynamics.initMarket(state);

  var recipe = {
    materials: [
      { id: 'iron_ore', quantity: 2 },
      { id: 'timber', quantity: 3 }
    ]
  };
  var craftPrice = MarketDynamics.getCraftedItemPrice(state, recipe);
  // iron_ore base=10, timber base=6 → (10*2 + 6*3) = 38 → 38 * 1.5 = 57
  assert(craftPrice === 57, 'getCraftedItemPrice should be 57 for iron_ore*2 + timber*3 (got ' + craftPrice + ')');

  // Test 2: getCraftedItemPrice handles unknown materials
  var unknownRecipe = {
    materials: [
      { id: 'mythril_ore', quantity: 1 },
      { id: 'iron_ore', quantity: 1 }
    ]
  };
  var unknownPrice = MarketDynamics.getCraftedItemPrice(state, unknownRecipe);
  // mythril_ore fallback=5, iron_ore=10 → (5 + 10) = 15 → 15 * 1.5 = 22.5 → ceil = 23
  assert(unknownPrice === 23, 'getCraftedItemPrice should be 23 with unknown material (got ' + unknownPrice + ')');

  // --- Zone Pricing ---

  // Test 3: getZonePrice applies modifiers correctly
  // Gardens: materials modifier = 0.8, iron_ore base price = 10
  var gardensPrice = MarketDynamics.getZonePrice(state, 'iron_ore', 'gardens');
  assert(gardensPrice === 8, 'iron_ore in gardens should be 8 (10 * 0.8) (got ' + gardensPrice + ')');

  // Test 4: getZonePrice returns base price for nexus (1.0 everywhere)
  var nexusPrice = MarketDynamics.getZonePrice(state, 'iron_ore', 'nexus');
  assert(nexusPrice === 10, 'iron_ore in nexus should be 10 (10 * 1.0) (got ' + nexusPrice + ')');

  // Test 5: getTradeRouteProfit shows profit for gardens->athenaeum materials
  var route = MarketDynamics.getTradeRouteProfit(state, 'iron_ore', 'gardens', 'athenaeum', 10);
  assert(route.profit > 0, 'gardens->athenaeum iron_ore should be profitable (profit: ' + route.profit + ')');

  // Test 6: getTradeRouteProfit for same zone (buy fee + sell discount = loss)
  var sameZone = MarketDynamics.getTradeRouteProfit(state, 'iron_ore', 'agora', 'agora', 10);
  assert(sameZone.profit < 0, 'same-zone trade should be a loss due to fees (profit: ' + sameZone.profit + ')');

  // Test 7: ZONE_PRICE_MODIFIERS keys match all 8 zones
  var zones = ['gardens', 'wilds', 'agora', 'athenaeum', 'studio', 'nexus', 'commons', 'arena'];
  for (var z = 0; z < zones.length; z++) {
    assert(MarketDynamics.ZONE_PRICE_MODIFIERS[zones[z]] !== undefined,
      'ZONE_PRICE_MODIFIERS should have ' + zones[z]);
  }

  // --- Economy Achievements ---

  // Test 8: ECONOMY_ACHIEVEMENTS has 5 entries
  assert(Array.isArray(Economy.ECONOMY_ACHIEVEMENTS), 'ECONOMY_ACHIEVEMENTS should be an array');
  assert(Economy.ECONOMY_ACHIEVEMENTS.length === 5, 'ECONOMY_ACHIEVEMENTS should have 5 entries (got ' + Economy.ECONOMY_ACHIEVEMENTS.length + ')');

  // Test 9: Each achievement has valid structure
  for (var a = 0; a < Economy.ECONOMY_ACHIEVEMENTS.length; a++) {
    var ach = Economy.ECONOMY_ACHIEVEMENTS[a];
    assert(ach.id && ach.name && ach.description, 'achievement ' + a + ' should have id, name, description');
    assert(typeof ach.threshold === 'number', 'achievement ' + a + ' should have numeric threshold');
    assert(typeof ach.reward === 'number', 'achievement ' + a + ' should have numeric reward');
  }

  // Test 10: checkEconomyAchievement returns achievement when met
  var ledger = {};
  var result = Economy.checkEconomyAchievement(ledger, 'player1', 'trade', { tradeCount: 1 });
  assert(result !== null, 'checkEconomyAchievement should return achievement for first trade');
  assert(result.id === 'first_trade', 'should be first_trade achievement (got ' + (result && result.id) + ')');

  // Test 11: checkEconomyAchievement returns null when not met
  var result2 = Economy.checkEconomyAchievement(ledger, 'player2', 'transaction', { transactionCount: 5 });
  assert(result2 === null, 'checkEconomyAchievement should return null for 5 transactions (need 10)');

  // Test 12: checkEconomyAchievement doesn't re-award
  var result3 = Economy.checkEconomyAchievement(ledger, 'player1', 'trade', { tradeCount: 1 });
  assert(result3 === null, 'checkEconomyAchievement should not re-award first_trade');

  // Test 13: balance_check achievement
  var ledger2 = {};
  var balResult = Economy.checkEconomyAchievement(ledger2, 'rich_player', 'balance_check', { balance: 1500 });
  assert(balResult !== null && balResult.id === 'spark_millionaire', 'should award spark_millionaire for 1500 balance');

  console.log('test_economy_depth: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
})();
