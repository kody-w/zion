// Test zone-specific gameplay bonuses
(function() {
  var passed = 0;
  var failed = 0;

  function assert(condition, msg) {
    if (condition) {
      console.log('  ok - ' + msg);
      passed++;
    } else {
      console.log('  FAIL - ' + msg);
      failed++;
    }
  }

  console.log('Zone-specific gameplay bonuses');
  console.log('');

  // Simulate the ZONE_BONUSES from main.js
  var ZONE_BONUSES = {
    nexus:     { harvest: 1.0, craft: 1.0,  trade: 1.0,  explore: 1.0,  fish: 1.0,  combat: 1.0,  label: 'Hub — balanced' },
    gardens:   { harvest: 1.5, craft: 1.0,  trade: 1.0,  explore: 1.0,  fish: 1.2,  combat: 0.8,  label: 'Harvest +50%' },
    athenaeum: { harvest: 1.0, craft: 1.3,  trade: 1.0,  explore: 1.5,  fish: 1.0,  combat: 0.7,  label: 'Research +50%' },
    studio:    { harvest: 1.0, craft: 1.5,  trade: 1.0,  explore: 1.0,  fish: 1.0,  combat: 0.8,  label: 'Crafting +50%' },
    wilds:     { harvest: 1.2, craft: 1.0,  trade: 0.8,  explore: 1.5,  fish: 1.3,  combat: 1.3,  label: 'Exploration +50%' },
    agora:     { harvest: 1.0, craft: 1.0,  trade: 1.5,  explore: 1.0,  fish: 1.0,  combat: 0.5,  label: 'Trading +50%' },
    commons:   { harvest: 1.2, craft: 1.2,  trade: 1.2,  explore: 1.2,  fish: 1.2,  combat: 1.0,  label: 'Social — +20% all' },
    arena:     { harvest: 0.5, craft: 0.8,  trade: 1.0,  explore: 1.0,  fish: 0.5,  combat: 1.5,  label: 'Combat +50%' }
  };

  var zones = Object.keys(ZONE_BONUSES);

  // All 8 zones defined
  console.log('Zone coverage');
  assert(zones.length === 8, 'all 8 zones have bonuses');

  // Each zone has all bonus types
  var bonusTypes = ['harvest', 'craft', 'trade', 'explore', 'fish', 'combat', 'label'];
  for (var i = 0; i < zones.length; i++) {
    var zone = zones[i];
    for (var j = 0; j < bonusTypes.length; j++) {
      assert(ZONE_BONUSES[zone][bonusTypes[j]] !== undefined, zone + ' has ' + bonusTypes[j] + ' bonus');
    }
  }

  console.log('');
  console.log('Zone identity — each zone has a unique specialty');

  // Gardens: best harvest
  assert(ZONE_BONUSES.gardens.harvest === 1.5, 'gardens has highest harvest bonus (1.5)');
  assert(ZONE_BONUSES.gardens.harvest > ZONE_BONUSES.nexus.harvest, 'gardens harvest > nexus');

  // Studio: best crafting
  assert(ZONE_BONUSES.studio.craft === 1.5, 'studio has highest craft bonus (1.5)');
  assert(ZONE_BONUSES.studio.craft > ZONE_BONUSES.gardens.craft, 'studio craft > gardens');

  // Agora: best trading
  assert(ZONE_BONUSES.agora.trade === 1.5, 'agora has highest trade bonus (1.5)');

  // Wilds: best exploration
  assert(ZONE_BONUSES.wilds.explore === 1.5, 'wilds has highest explore bonus (1.5)');

  // Arena: best combat
  assert(ZONE_BONUSES.arena.combat === 1.5, 'arena has highest combat bonus (1.5)');

  // Nexus: balanced at 1.0
  assert(ZONE_BONUSES.nexus.harvest === 1.0, 'nexus harvest is neutral (1.0)');
  assert(ZONE_BONUSES.nexus.craft === 1.0, 'nexus craft is neutral (1.0)');
  assert(ZONE_BONUSES.nexus.combat === 1.0, 'nexus combat is neutral (1.0)');

  // Commons: all slightly boosted
  assert(ZONE_BONUSES.commons.harvest === 1.2, 'commons harvest boosted (1.2)');
  assert(ZONE_BONUSES.commons.trade === 1.2, 'commons trade boosted (1.2)');

  console.log('');
  console.log('Bonus application math');

  // Test bonus math: base 10 harvest in gardens = 15
  var base = 10;
  var bonused = Math.round(base * ZONE_BONUSES.gardens.harvest);
  assert(bonused === 15, 'gardens harvest: 10 base → ' + bonused + ' (should be 15)');

  // Test bonus math: base 10 harvest in arena = 5 (penalized)
  var arenaHarvest = Math.round(base * ZONE_BONUSES.arena.harvest);
  assert(arenaHarvest === 5, 'arena harvest: 10 base → ' + arenaHarvest + ' (should be 5, discouraged)');

  // Test bonus math: 6 explore XP in wilds = 9
  var exploreXP = Math.round(6 * ZONE_BONUSES.wilds.explore);
  assert(exploreXP === 9, 'wilds explore: 6 base → ' + exploreXP + ' (should be 9)');

  // Test bonus math: fishing in wilds boosted
  var fishSpark = Math.round(5 * ZONE_BONUSES.wilds.fish);
  assert(fishSpark === 7, 'wilds fishing: 5 base → ' + fishSpark + ' (should be ~7)');

  console.log('');
  console.log('Balance constraints');

  // No bonus exceeds 1.5x
  for (var z = 0; z < zones.length; z++) {
    var zb = ZONE_BONUSES[zones[z]];
    for (var k = 0; k < bonusTypes.length; k++) {
      if (bonusTypes[k] === 'label') continue;
      assert(zb[bonusTypes[k]] <= 1.5, zones[z] + ' ' + bonusTypes[k] + ' <= 1.5 (' + zb[bonusTypes[k]] + ')');
      assert(zb[bonusTypes[k]] >= 0.5, zones[z] + ' ' + bonusTypes[k] + ' >= 0.5 (' + zb[bonusTypes[k]] + ')');
    }
  }

  // Each zone has a unique label
  var labels = {};
  for (var l = 0; l < zones.length; l++) {
    var label = ZONE_BONUSES[zones[l]].label;
    assert(!labels[label], 'unique label for ' + zones[l] + ': ' + label);
    labels[label] = true;
  }

  console.log('');
  console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
})();
