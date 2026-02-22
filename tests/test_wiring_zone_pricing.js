// Test: Zone pricing notifications wiring
// Verifies ZONE_PRICE_MODIFIERS accessible, advantage strings generated correctly

(function() {
  var passed = 0;
  var failed = 0;

  function assert(condition, msg) {
    if (condition) { passed++; }
    else { failed++; console.error('FAIL: ' + msg); }
  }

  // Load MarketDynamics module
  var MarketDynamics = require('../src/js/market_dynamics');

  // Test 1: ZONE_PRICE_MODIFIERS exists
  assert(MarketDynamics.ZONE_PRICE_MODIFIERS !== undefined, 'ZONE_PRICE_MODIFIERS is exported');
  assert(typeof MarketDynamics.ZONE_PRICE_MODIFIERS === 'object', 'ZONE_PRICE_MODIFIERS is an object');

  // Test 2: All 8 zones present
  var zones = ['gardens', 'wilds', 'agora', 'athenaeum', 'studio', 'nexus', 'commons', 'arena'];
  zones.forEach(function(zone) {
    assert(MarketDynamics.ZONE_PRICE_MODIFIERS[zone] !== undefined,
      'Zone ' + zone + ' has price modifiers');
  });

  // Test 3: Each zone has expected categories
  var expectedCats = ['materials', 'food', 'tools', 'potions', 'rare'];
  var gardenMods = MarketDynamics.ZONE_PRICE_MODIFIERS.gardens;
  expectedCats.forEach(function(cat) {
    assert(typeof gardenMods[cat] === 'number', 'gardens.' + cat + ' is a number');
    assert(gardenMods[cat] > 0, 'gardens.' + cat + ' is positive');
  });

  // Test 4: Advantage string generation (mirrors main.js logic)
  function generateAdvantages(zoneMods) {
    var advantages = [];
    for (var cat in zoneMods) {
      if (zoneMods[cat] <= 0.8) advantages.push(cat + ' -' + Math.round((1 - zoneMods[cat]) * 100) + '%');
      else if (zoneMods[cat] >= 1.2) advantages.push(cat + ' +' + Math.round((zoneMods[cat] - 1) * 100) + '%');
    }
    return advantages;
  }

  // Gardens should have food at 0.7 (-30%) and materials at 0.8 (-20%)
  var gardenAdvantages = generateAdvantages(gardenMods);
  assert(gardenAdvantages.length > 0, 'Gardens has price advantages');

  var hasFoodDiscount = gardenAdvantages.some(function(a) { return a.indexOf('food') >= 0 && a.indexOf('-') >= 0; });
  assert(hasFoodDiscount, 'Gardens shows food discount');

  var hasMaterialsDiscount = gardenAdvantages.some(function(a) { return a.indexOf('materials') >= 0 && a.indexOf('-') >= 0; });
  assert(hasMaterialsDiscount, 'Gardens shows materials discount');

  // Test 5: Wilds has its own advantages
  var wildsMods = MarketDynamics.ZONE_PRICE_MODIFIERS.wilds;
  var wildsAdvantages = generateAdvantages(wildsMods);
  assert(wildsAdvantages.length > 0, 'Wilds has price advantages');

  var hasMaterialsWilds = wildsAdvantages.some(function(a) { return a.indexOf('materials') >= 0; });
  assert(hasMaterialsWilds, 'Wilds shows materials advantage');

  // Test 6: Nexus is neutral (all 1.0) — no advantages
  var nexusMods = MarketDynamics.ZONE_PRICE_MODIFIERS.nexus;
  var nexusAdvantages = generateAdvantages(nexusMods);
  assert(nexusAdvantages.length === 0, 'Nexus has no price advantages (neutral zone)');

  // Test 7: Advantage string format is correct
  gardenAdvantages.forEach(function(adv) {
    assert(adv.indexOf('%') >= 0, 'Advantage string contains percentage: ' + adv);
    var hasSign = adv.indexOf('+') >= 0 || adv.indexOf('-') >= 0;
    assert(hasSign, 'Advantage string contains +/- sign: ' + adv);
  });

  // Test 8: Notification string formatting
  if (gardenAdvantages.length > 0) {
    var notifText = 'Market prices: ' + gardenAdvantages.join(', ');
    assert(notifText.indexOf('Market prices:') === 0, 'Notification starts with "Market prices:"');
    assert(notifText.length > 20, 'Notification has meaningful content');
  }

  // Test 9: Modifiers are within reasonable range (0.5 - 1.5)
  zones.forEach(function(zone) {
    var mods = MarketDynamics.ZONE_PRICE_MODIFIERS[zone];
    for (var cat in mods) {
      assert(mods[cat] >= 0.5, zone + '.' + cat + ' >= 0.5');
      assert(mods[cat] <= 1.5, zone + '.' + cat + ' <= 1.5');
    }
  });

  console.log('test_wiring_zone_pricing: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
})();
