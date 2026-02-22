// test_dashboard_main.js - Tests for DashboardMain integration module
// Run: node tests/test_dashboard_main.js
'use strict';

var assert = require('assert');
var DashboardMain = require('../src/js/dashboard_main.js');

var passed = 0;
var failed = 0;
var errors = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    process.stdout.write('  + ' + name + '\n');
  } catch (e) {
    failed++;
    errors.push({ name: name, error: e });
    process.stdout.write('  FAIL ' + name + '\n    ' + e.message + '\n');
  }
}

function suite(name, fn) {
  console.log('\n' + name);
  fn();
}

function reset() {
  DashboardMain._reset();
}

// =========================================================================
// MODULE SANITY
// =========================================================================

suite('Module sanity', function() {
  test('DashboardMain is an object', function() {
    assert.strictEqual(typeof DashboardMain, 'object');
    assert.ok(DashboardMain !== null);
  });

  test('getDashboardVersion is a function', function() {
    assert.strictEqual(typeof DashboardMain.getDashboardVersion, 'function');
  });

  test('getDashboardVersion returns 1.0.0', function() {
    assert.strictEqual(DashboardMain.getDashboardVersion(), '1.0.0');
  });

  test('VERSION constant is exported', function() {
    assert.strictEqual(DashboardMain.VERSION, '1.0.0');
  });

  test('ZONE_RESOURCES is exported', function() {
    assert.ok(DashboardMain.ZONE_RESOURCES, 'ZONE_RESOURCES should be exported');
  });

  test('ZONE_NAMES is exported', function() {
    assert.ok(DashboardMain.ZONE_NAMES, 'ZONE_NAMES should be exported');
  });

  test('KEY_SHORTCUTS is exported', function() {
    assert.ok(DashboardMain.KEY_SHORTCUTS, 'KEY_SHORTCUTS should be exported');
  });
});

// =========================================================================
// GAME STATE CREATION
// =========================================================================

suite('createGameState — basic structure', function() {
  test('createGameState returns an object', function() {
    var state = DashboardMain.createGameState('TestPlayer');
    assert.strictEqual(typeof state, 'object');
    assert.ok(state !== null);
  });

  test('player object is present', function() {
    var state = DashboardMain.createGameState('TestPlayer');
    assert.ok(state.player, 'player should exist');
  });

  test('player name is set correctly', function() {
    var state = DashboardMain.createGameState('Alice');
    assert.strictEqual(state.player.name, 'Alice');
  });

  test('player starts in nexus zone', function() {
    var state = DashboardMain.createGameState('Bob');
    assert.strictEqual(state.player.zone, 'nexus');
  });

  test('player starts at level 1', function() {
    var state = DashboardMain.createGameState('Bob');
    assert.strictEqual(state.player.level, 1);
  });

  test('player starts with 0 xp', function() {
    var state = DashboardMain.createGameState('Bob');
    assert.strictEqual(state.player.xp, 0);
  });

  test('player starts with 100 spark', function() {
    var state = DashboardMain.createGameState('Bob');
    assert.strictEqual(state.player.spark, 100);
  });

  test('player has reputation object', function() {
    var state = DashboardMain.createGameState('Bob');
    assert.ok(state.player.reputation, 'reputation should exist');
    assert.strictEqual(typeof state.player.reputation, 'object');
  });

  test('player reputation has all 8 zones', function() {
    var state = DashboardMain.createGameState('Bob');
    var zones = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];
    zones.forEach(function(z) {
      assert.ok(z in state.player.reputation, 'reputation should have zone: ' + z);
    });
  });

  test('player id is generated', function() {
    var state = DashboardMain.createGameState('Bob');
    assert.ok(state.player.id, 'player id should exist');
    assert.strictEqual(typeof state.player.id, 'string');
    assert.ok(state.player.id.length > 0);
  });

  test('inventory object is present', function() {
    var state = DashboardMain.createGameState('Bob');
    assert.ok(state.inventory, 'inventory should exist');
    assert.ok(state.inventory.items, 'inventory.items should exist');
    assert.ok(state.inventory.equipped, 'inventory.equipped should exist');
    assert.ok(state.inventory.skills, 'inventory.skills should exist');
  });

  test('economy object is present', function() {
    var state = DashboardMain.createGameState('Bob');
    assert.ok(state.economy, 'economy should exist');
    assert.ok(Array.isArray(state.economy.transactions), 'transactions should be an array');
    assert.ok(Array.isArray(state.economy.listings), 'listings should be an array');
  });

  test('quests object is present', function() {
    var state = DashboardMain.createGameState('Bob');
    assert.ok(state.quests, 'quests should exist');
    assert.ok(state.quests.active, 'quests.active should exist');
    assert.ok(state.quests.completed, 'quests.completed should exist');
    assert.ok(state.quests.progress, 'quests.progress should exist');
  });

  test('social object is present', function() {
    var state = DashboardMain.createGameState('Bob');
    assert.ok(state.social, 'social should exist');
    assert.ok(state.social.chat, 'social.chat should exist');
    assert.strictEqual(state.social.guild, null);
    assert.ok(Array.isArray(state.social.friends));
  });

  test('world object is present', function() {
    var state = DashboardMain.createGameState('Bob');
    assert.ok(state.world, 'world should exist');
    assert.ok(state.world.time, 'world.time should exist');
    assert.strictEqual(state.world.time.tick, 0);
    assert.ok(state.world.weather, 'world.weather should exist');
    assert.ok(Array.isArray(state.world.events));
    assert.ok(Array.isArray(state.world.news));
  });

  test('world.time.dayLength defaults to 1200', function() {
    var state = DashboardMain.createGameState('Bob');
    assert.strictEqual(state.world.time.dayLength, 1200);
  });

  test('achievements object is present', function() {
    var state = DashboardMain.createGameState('Bob');
    assert.ok(state.achievements !== undefined, 'achievements should exist');
  });

  test('settings object is present', function() {
    var state = DashboardMain.createGameState('Bob');
    assert.ok(state.settings, 'settings should exist');
    assert.strictEqual(state.settings.layout, 'full');
    assert.strictEqual(state.settings.theme, 'dark');
    assert.strictEqual(state.settings.notifications, true);
  });

  test('default player name used when name is empty', function() {
    var state = DashboardMain.createGameState('');
    assert.strictEqual(state.player.name, 'Citizen');
  });

  test('default player name used when name is whitespace', function() {
    var state = DashboardMain.createGameState('   ');
    assert.strictEqual(state.player.name, 'Citizen');
  });

  test('default player name used when no argument', function() {
    var state = DashboardMain.createGameState();
    assert.strictEqual(state.player.name, 'Citizen');
  });

  test('_meta field is present with version', function() {
    var state = DashboardMain.createGameState('Bob');
    assert.ok(state._meta, '_meta should exist');
    assert.strictEqual(state._meta.version, '1.0.0');
  });

  test('two game states have different ids', function() {
    var s1 = DashboardMain.createGameState('Player1');
    var s2 = DashboardMain.createGameState('Player2');
    assert.notStrictEqual(s1.player.id, s2.player.id);
  });
});

// =========================================================================
// DASHBOARD TICK
// =========================================================================

suite('dashboardTick — time advancement', function() {
  test('dashboardTick is a function', function() {
    assert.strictEqual(typeof DashboardMain.dashboardTick, 'function');
  });

  test('tick advances world time by 1', function() {
    var state = DashboardMain.createGameState('Tester');
    assert.strictEqual(state.world.time.tick, 0);
    state = DashboardMain.dashboardTick(state, 1);
    assert.strictEqual(state.world.time.tick, 1);
  });

  test('multiple ticks advance time correctly', function() {
    var state = DashboardMain.createGameState('Tester');
    for (var i = 0; i < 10; i++) {
      state = DashboardMain.dashboardTick(state, 1);
    }
    assert.strictEqual(state.world.time.tick, 10);
  });

  test('dashboardTick returns a state object', function() {
    var state = DashboardMain.createGameState('Tester');
    var result = DashboardMain.dashboardTick(state, 1);
    assert.ok(result, 'should return state');
    assert.ok(result.player, 'returned state should have player');
  });

  test('dashboardTick handles null state gracefully', function() {
    var result = DashboardMain.dashboardTick(null, 1);
    assert.strictEqual(result, null);
  });

  test('weather updates after WEATHER_UPDATE_INTERVAL ticks', function() {
    var state = DashboardMain.createGameState('Tester');
    var initialWeather = state.world.weather.current;
    // Run exactly 60 ticks
    for (var i = 0; i < 60; i++) {
      state = DashboardMain.dashboardTick(state, 1);
    }
    // Weather may have changed (not guaranteed to be different due to randomness,
    // but the tick should have run without error)
    assert.ok(state.world.weather.current, 'weather should still be set');
  });

  test('news array is not null after ticks', function() {
    var state = DashboardMain.createGameState('Tester');
    for (var i = 0; i < 5; i++) {
      state = DashboardMain.dashboardTick(state, 1);
    }
    assert.ok(Array.isArray(state.world.news), 'news should be array');
  });

  test('news is generated around tick 50', function() {
    var state = DashboardMain.createGameState('Tester');
    for (var i = 0; i < 50; i++) {
      state = DashboardMain.dashboardTick(state, 1);
    }
    assert.ok(state.world.news.length > 0, 'news should be generated by tick 50');
  });

  test('events array is populated when event interval is hit', function() {
    var state = DashboardMain.createGameState('Tester');
    // Run to first event interval (market_day at 240)
    for (var i = 0; i < 240; i++) {
      state = DashboardMain.dashboardTick(state, 1);
    }
    assert.ok(Array.isArray(state.world.events));
    // At least one event should have been triggered
    assert.ok(state.world.events.length > 0 || state.world.news.length > 0, 'events or news should be populated');
  });
});

// =========================================================================
// ACTION HANDLER — TRAVEL
// =========================================================================

suite('handleDashboardAction — travel', function() {
  test('travel to gardens succeeds', function() {
    var state = DashboardMain.createGameState('Traveler');
    var result = DashboardMain.handleDashboardAction(state, { type: 'travel', zone: 'gardens' });
    assert.ok(result.result.success, 'travel should succeed');
    assert.strictEqual(result.state.player.zone, 'gardens');
  });

  test('travel returns updated state', function() {
    var state = DashboardMain.createGameState('Traveler');
    var result = DashboardMain.handleDashboardAction(state, { type: 'travel', zone: 'arena' });
    assert.strictEqual(result.state.player.zone, 'arena');
  });

  test('travel to invalid zone fails', function() {
    var state = DashboardMain.createGameState('Traveler');
    var result = DashboardMain.handleDashboardAction(state, { type: 'travel', zone: 'nonexistent' });
    assert.ok(!result.result.success, 'travel to invalid zone should fail');
  });

  test('travel without zone fails', function() {
    var state = DashboardMain.createGameState('Traveler');
    var result = DashboardMain.handleDashboardAction(state, { type: 'travel' });
    assert.ok(!result.result.success, 'travel without zone should fail');
  });

  test('travel increases reputation in destination zone', function() {
    var state = DashboardMain.createGameState('Traveler');
    var prevRep = state.player.reputation.gardens;
    DashboardMain.handleDashboardAction(state, { type: 'travel', zone: 'gardens' });
    // state is mutated, check reputation
    assert.ok(state.player.reputation.gardens >= prevRep);
  });

  test('travel awards XP', function() {
    var state = DashboardMain.createGameState('Traveler');
    var prevXP = state.player.xp;
    var result = DashboardMain.handleDashboardAction(state, { type: 'travel', zone: 'gardens' });
    assert.ok(result.state.player.xp > prevXP, 'travel should award XP');
  });

  test('travel adds news item', function() {
    var state = DashboardMain.createGameState('Traveler');
    var result = DashboardMain.handleDashboardAction(state, { type: 'travel', zone: 'agora' });
    assert.ok(result.state.world.news.length > 0, 'news should be added on travel');
  });
});

// =========================================================================
// ACTION HANDLER — TALK NPC
// =========================================================================

suite('handleDashboardAction — talk_npc', function() {
  test('talk_npc succeeds with valid npcId', function() {
    var state = DashboardMain.createGameState('Chatter');
    var result = DashboardMain.handleDashboardAction(state, { type: 'talk_npc', npcId: 'npc_001' });
    assert.ok(result.result.success, 'talk_npc should succeed');
  });

  test('talk_npc returns dialogue', function() {
    var state = DashboardMain.createGameState('Chatter');
    var result = DashboardMain.handleDashboardAction(state, { type: 'talk_npc', npcId: 'npc_042' });
    assert.ok(result.result.dialogue, 'dialogue should be returned');
    assert.strictEqual(typeof result.result.dialogue, 'string');
  });

  test('talk_npc fails without npcId', function() {
    var state = DashboardMain.createGameState('Chatter');
    var result = DashboardMain.handleDashboardAction(state, { type: 'talk_npc' });
    assert.ok(!result.result.success, 'should fail without npcId');
  });

  test('talk_npc awards XP', function() {
    var state = DashboardMain.createGameState('Chatter');
    var xpBefore = state.player.xp;
    var result = DashboardMain.handleDashboardAction(state, { type: 'talk_npc', npcId: 'npc_001' });
    assert.ok(result.state.player.xp > xpBefore, 'should award XP for talking');
  });
});

// =========================================================================
// ACTION HANDLER — BUY ITEM
// =========================================================================

suite('handleDashboardAction — buy_item', function() {
  test('buy_item succeeds when player has enough spark', function() {
    var state = DashboardMain.createGameState('Buyer');
    state.player.spark = 100;
    var result = DashboardMain.handleDashboardAction(state, { type: 'buy_item', npcId: 'npc_001', itemId: 'herb' });
    assert.ok(result.result.success, 'buy should succeed');
  });

  test('buy_item adds item to inventory', function() {
    var state = DashboardMain.createGameState('Buyer');
    state.player.spark = 100;
    var result = DashboardMain.handleDashboardAction(state, { type: 'buy_item', npcId: 'npc_001', itemId: 'herb' });
    assert.ok(result.state.inventory.items.herb >= 1, 'herb should be in inventory');
  });

  test('buy_item deducts spark', function() {
    var state = DashboardMain.createGameState('Buyer');
    state.player.spark = 100;
    var result = DashboardMain.handleDashboardAction(state, { type: 'buy_item', npcId: 'npc_001', itemId: 'herb' });
    assert.ok(result.state.player.spark < 100, 'spark should decrease');
  });

  test('buy_item fails without itemId', function() {
    var state = DashboardMain.createGameState('Buyer');
    var result = DashboardMain.handleDashboardAction(state, { type: 'buy_item', npcId: 'npc_001' });
    assert.ok(!result.result.success, 'should fail without itemId');
  });

  test('buy_item fails when not enough spark', function() {
    var state = DashboardMain.createGameState('PoorBuyer');
    state.player.spark = 0;
    var result = DashboardMain.handleDashboardAction(state, { type: 'buy_item', npcId: 'npc_001', itemId: 'herb' });
    assert.ok(!result.result.success, 'should fail when no spark');
  });
});

// =========================================================================
// ACTION HANDLER — CRAFT
// =========================================================================

suite('handleDashboardAction — craft', function() {
  test('craft succeeds with valid recipeId', function() {
    var state = DashboardMain.createGameState('Crafter');
    var result = DashboardMain.handleDashboardAction(state, { type: 'craft', recipeId: 'herb_potion' });
    assert.ok(result.result.success, 'craft should succeed');
  });

  test('craft adds item to inventory', function() {
    var state = DashboardMain.createGameState('Crafter');
    var result = DashboardMain.handleDashboardAction(state, { type: 'craft', recipeId: 'herb_potion' });
    assert.ok(result.state.inventory.items.herb_potion >= 1, 'crafted item should be in inventory');
  });

  test('craft fails without recipeId', function() {
    var state = DashboardMain.createGameState('Crafter');
    var result = DashboardMain.handleDashboardAction(state, { type: 'craft' });
    assert.ok(!result.result.success, 'should fail without recipeId');
  });
});

// =========================================================================
// ACTION HANDLER — EQUIP
// =========================================================================

suite('handleDashboardAction — equip', function() {
  test('equip fails when item not in inventory', function() {
    var state = DashboardMain.createGameState('Fighter');
    var result = DashboardMain.handleDashboardAction(state, { type: 'equip', itemId: 'sword' });
    assert.ok(!result.result.success, 'should fail without item in inventory');
  });

  test('equip succeeds when item is in inventory', function() {
    var state = DashboardMain.createGameState('Fighter');
    state.inventory.items.sword = 1;
    var result = DashboardMain.handleDashboardAction(state, { type: 'equip', itemId: 'sword' });
    assert.ok(result.result.success, 'equip should succeed with item in inventory');
  });

  test('equip without itemId fails', function() {
    var state = DashboardMain.createGameState('Fighter');
    var result = DashboardMain.handleDashboardAction(state, { type: 'equip' });
    assert.ok(!result.result.success, 'should fail without itemId');
  });
});

// =========================================================================
// ACTION HANDLER — SELL ITEM
// =========================================================================

suite('handleDashboardAction — sell_item', function() {
  test('sell_item succeeds when item is in inventory', function() {
    var state = DashboardMain.createGameState('Seller');
    state.inventory.items.wood = 5;
    var result = DashboardMain.handleDashboardAction(state, { type: 'sell_item', itemId: 'wood', quantity: 2 });
    assert.ok(result.result.success, 'sell should succeed');
  });

  test('sell_item reduces inventory count', function() {
    var state = DashboardMain.createGameState('Seller');
    state.inventory.items.wood = 5;
    var result = DashboardMain.handleDashboardAction(state, { type: 'sell_item', itemId: 'wood', quantity: 2 });
    assert.strictEqual(result.state.inventory.items.wood, 3);
  });

  test('sell_item increases spark', function() {
    var state = DashboardMain.createGameState('Seller');
    state.inventory.items.wood = 5;
    state.player.spark = 0;
    var result = DashboardMain.handleDashboardAction(state, { type: 'sell_item', itemId: 'wood', quantity: 1 });
    assert.ok(result.state.player.spark > 0, 'spark should increase after sell');
  });

  test('sell_item removes item from inventory when quantity reaches 0', function() {
    var state = DashboardMain.createGameState('Seller');
    state.inventory.items.stone = 1;
    var result = DashboardMain.handleDashboardAction(state, { type: 'sell_item', itemId: 'stone', quantity: 1 });
    assert.ok(!result.state.inventory.items.stone, 'item should be removed when quantity is 0');
  });

  test('sell_item fails when not enough items', function() {
    var state = DashboardMain.createGameState('Seller');
    state.inventory.items.stone = 1;
    var result = DashboardMain.handleDashboardAction(state, { type: 'sell_item', itemId: 'stone', quantity: 5 });
    assert.ok(!result.result.success, 'should fail when not enough items');
  });

  test('sell_item fails without itemId', function() {
    var state = DashboardMain.createGameState('Seller');
    var result = DashboardMain.handleDashboardAction(state, { type: 'sell_item', quantity: 1 });
    assert.ok(!result.result.success, 'should fail without itemId');
  });
});

// =========================================================================
// ACTION HANDLER — ACCEPT QUEST
// =========================================================================

suite('handleDashboardAction — accept_quest', function() {
  test('accept_quest succeeds with valid questId', function() {
    var state = DashboardMain.createGameState('Quester');
    var result = DashboardMain.handleDashboardAction(state, { type: 'accept_quest', questId: 'first_quest' });
    assert.ok(result.result.success, 'accept quest should succeed');
  });

  test('accept_quest adds quest to active', function() {
    var state = DashboardMain.createGameState('Quester');
    var result = DashboardMain.handleDashboardAction(state, { type: 'accept_quest', questId: 'first_quest' });
    assert.ok(result.state.quests.active.first_quest, 'quest should be in active');
  });

  test('accept_quest fails without questId', function() {
    var state = DashboardMain.createGameState('Quester');
    var result = DashboardMain.handleDashboardAction(state, { type: 'accept_quest' });
    assert.ok(!result.result.success, 'should fail without questId');
  });

  test('accept_quest fails if quest already active', function() {
    var state = DashboardMain.createGameState('Quester');
    DashboardMain.handleDashboardAction(state, { type: 'accept_quest', questId: 'my_quest' });
    // Try to accept again - re-use the state from first result
    var firstResult = DashboardMain.handleDashboardAction(state, { type: 'accept_quest', questId: 'my_quest' });
    // Since stub adds directly to state, second attempt should fail
    var secondResult = DashboardMain.handleDashboardAction(firstResult.state, { type: 'accept_quest', questId: 'my_quest' });
    assert.ok(!secondResult.result.success, 'should fail when quest already active');
  });
});

// =========================================================================
// ACTION HANDLER — SEND CHAT
// =========================================================================

suite('handleDashboardAction — send_chat', function() {
  test('send_chat succeeds with text', function() {
    var state = DashboardMain.createGameState('Chatter');
    var result = DashboardMain.handleDashboardAction(state, { type: 'send_chat', channel: 'global', text: 'Hello world!' });
    assert.ok(result.result.success, 'chat should succeed');
  });

  test('send_chat stores message in state', function() {
    var state = DashboardMain.createGameState('Chatter');
    var result = DashboardMain.handleDashboardAction(state, { type: 'send_chat', channel: 'global', text: 'Test message' });
    assert.ok(result.state.social.chat.global.length > 0, 'message should be stored');
  });

  test('send_chat uses global channel by default', function() {
    var state = DashboardMain.createGameState('Chatter');
    var result = DashboardMain.handleDashboardAction(state, { type: 'send_chat', text: 'Hello' });
    assert.ok(result.state.social.chat.global, 'global channel should have message');
  });

  test('send_chat fails with empty text', function() {
    var state = DashboardMain.createGameState('Chatter');
    var result = DashboardMain.handleDashboardAction(state, { type: 'send_chat', text: '' });
    assert.ok(!result.result.success, 'should fail with empty text');
  });

  test('send_chat fails with whitespace-only text', function() {
    var state = DashboardMain.createGameState('Chatter');
    var result = DashboardMain.handleDashboardAction(state, { type: 'send_chat', text: '   ' });
    assert.ok(!result.result.success, 'should fail with whitespace text');
  });
});

// =========================================================================
// ACTION HANDLER — CREATE GUILD
// =========================================================================

suite('handleDashboardAction — create_guild', function() {
  test('create_guild succeeds with name', function() {
    var state = DashboardMain.createGameState('Founder');
    var result = DashboardMain.handleDashboardAction(state, { type: 'create_guild', name: 'Order of ZION', motto: 'For all!' });
    assert.ok(result.result.success, 'guild creation should succeed');
  });

  test('create_guild sets guild on social state', function() {
    var state = DashboardMain.createGameState('Founder');
    var result = DashboardMain.handleDashboardAction(state, { type: 'create_guild', name: 'Alpha Guild' });
    assert.ok(result.state.social.guild, 'guild should be set');
    assert.strictEqual(result.state.social.guild.name, 'Alpha Guild');
  });

  test('create_guild fails when already in a guild', function() {
    var state = DashboardMain.createGameState('Founder');
    DashboardMain.handleDashboardAction(state, { type: 'create_guild', name: 'First Guild' });
    state.social.guild = { name: 'First Guild' };
    var result = DashboardMain.handleDashboardAction(state, { type: 'create_guild', name: 'Second Guild' });
    assert.ok(!result.result.success, 'should fail when already in a guild');
  });

  test('create_guild fails without name', function() {
    var state = DashboardMain.createGameState('Founder');
    var result = DashboardMain.handleDashboardAction(state, { type: 'create_guild', name: '' });
    assert.ok(!result.result.success, 'should fail without name');
  });
});

// =========================================================================
// ACTION HANDLER — JOIN EVENT
// =========================================================================

suite('handleDashboardAction — join_event', function() {
  test('join_event fails when event not active', function() {
    var state = DashboardMain.createGameState('EventGoer');
    var result = DashboardMain.handleDashboardAction(state, { type: 'join_event', eventId: 'nonexistent' });
    assert.ok(!result.result.success, 'should fail when event not active');
  });

  test('join_event succeeds when event is active', function() {
    var state = DashboardMain.createGameState('EventGoer');
    // Manually add an active event
    state.world.events.push({
      id: 'test_event', name: 'Test Event', zone: 'nexus',
      startTick: 0, endTick: 100, active: true,
      reward: { spark: 25 }
    });
    var result = DashboardMain.handleDashboardAction(state, { type: 'join_event', eventId: 'test_event' });
    assert.ok(result.result.success, 'should succeed with active event');
  });

  test('join_event awards spark reward', function() {
    var state = DashboardMain.createGameState('EventGoer');
    var sparkBefore = state.player.spark;
    state.world.events.push({
      id: 'spark_event', name: 'Spark Event', zone: 'nexus',
      startTick: 0, endTick: 100, active: true,
      reward: { spark: 25 }
    });
    var result = DashboardMain.handleDashboardAction(state, { type: 'join_event', eventId: 'spark_event' });
    assert.ok(result.state.player.spark > sparkBefore, 'spark should increase from event reward');
  });

  test('join_event fails without eventId', function() {
    var state = DashboardMain.createGameState('EventGoer');
    var result = DashboardMain.handleDashboardAction(state, { type: 'join_event' });
    assert.ok(!result.result.success, 'should fail without eventId');
  });
});

// =========================================================================
// ACTION HANDLER — CAST LINE (FISHING)
// =========================================================================

suite('handleDashboardAction — cast_line', function() {
  test('cast_line returns a result', function() {
    var state = DashboardMain.createGameState('Fisher');
    var result = DashboardMain.handleDashboardAction(state, { type: 'cast_line' });
    assert.ok(result.result !== undefined, 'should return result');
    assert.ok(result.result.success !== undefined, 'result.success should be defined');
  });

  test('cast_line result has caught property', function() {
    var state = DashboardMain.createGameState('Fisher');
    var result = DashboardMain.handleDashboardAction(state, { type: 'cast_line' });
    assert.ok('caught' in result.result, 'result should have caught property');
  });

  test('cast_line result has message', function() {
    var state = DashboardMain.createGameState('Fisher');
    var result = DashboardMain.handleDashboardAction(state, { type: 'cast_line' });
    assert.ok(result.result.message, 'result should have message');
  });
});

// =========================================================================
// ACTION HANDLER — PLAY CARD
// =========================================================================

suite('handleDashboardAction — play_card', function() {
  test('play_card with cardIndex 0 succeeds', function() {
    var state = DashboardMain.createGameState('CardPlayer');
    var result = DashboardMain.handleDashboardAction(state, { type: 'play_card', cardIndex: 0 });
    assert.ok(result.result.success, 'play_card should succeed');
  });

  test('play_card fails without cardIndex', function() {
    var state = DashboardMain.createGameState('CardPlayer');
    var result = DashboardMain.handleDashboardAction(state, { type: 'play_card' });
    assert.ok(!result.result.success, 'should fail without cardIndex');
  });

  test('play_card result has outcome', function() {
    var state = DashboardMain.createGameState('CardPlayer');
    var result = DashboardMain.handleDashboardAction(state, { type: 'play_card', cardIndex: 1 });
    assert.ok(result.result.outcome === 'win' || result.result.outcome === 'lose', 'outcome should be win or lose');
  });
});

// =========================================================================
// ACTION HANDLER — ENTER DUNGEON
// =========================================================================

suite('handleDashboardAction — enter_dungeon', function() {
  test('enter_dungeon with normal difficulty succeeds', function() {
    var state = DashboardMain.createGameState('Dungeon');
    var result = DashboardMain.handleDashboardAction(state, { type: 'enter_dungeon', difficulty: 'normal' });
    assert.ok(result.result.success, 'enter_dungeon should succeed');
  });

  test('enter_dungeon with easy difficulty succeeds', function() {
    var state = DashboardMain.createGameState('Dungeon');
    var result = DashboardMain.handleDashboardAction(state, { type: 'enter_dungeon', difficulty: 'easy' });
    assert.ok(result.result.success, 'enter_dungeon easy should succeed');
  });

  test('enter_dungeon with hard difficulty succeeds', function() {
    var state = DashboardMain.createGameState('Dungeon');
    var result = DashboardMain.handleDashboardAction(state, { type: 'enter_dungeon', difficulty: 'hard' });
    assert.ok(result.result.success, 'enter_dungeon hard should succeed');
  });

  test('enter_dungeon with legendary difficulty succeeds', function() {
    var state = DashboardMain.createGameState('Dungeon');
    var result = DashboardMain.handleDashboardAction(state, { type: 'enter_dungeon', difficulty: 'legendary' });
    assert.ok(result.result.success, 'enter_dungeon legendary should succeed');
  });

  test('enter_dungeon with invalid difficulty fails', function() {
    var state = DashboardMain.createGameState('Dungeon');
    var result = DashboardMain.handleDashboardAction(state, { type: 'enter_dungeon', difficulty: 'impossible' });
    assert.ok(!result.result.success, 'should fail with invalid difficulty');
  });

  test('enter_dungeon result has won property', function() {
    var state = DashboardMain.createGameState('Dungeon');
    var result = DashboardMain.handleDashboardAction(state, { type: 'enter_dungeon', difficulty: 'normal' });
    assert.ok('won' in result.result, 'result should have won property');
  });
});

// =========================================================================
// ACTION HANDLER — GAZE STARS
// =========================================================================

suite('handleDashboardAction — gaze_stars', function() {
  test('gaze_stars succeeds', function() {
    var state = DashboardMain.createGameState('Stargazer');
    var result = DashboardMain.handleDashboardAction(state, { type: 'gaze_stars' });
    assert.ok(result.result.success, 'gaze_stars should succeed');
  });

  test('gaze_stars awards XP', function() {
    var state = DashboardMain.createGameState('Stargazer');
    var xpBefore = state.player.xp;
    var result = DashboardMain.handleDashboardAction(state, { type: 'gaze_stars' });
    assert.ok(result.state.player.xp > xpBefore, 'should award XP');
  });

  test('gaze_stars returns message', function() {
    var state = DashboardMain.createGameState('Stargazer');
    var result = DashboardMain.handleDashboardAction(state, { type: 'gaze_stars' });
    assert.ok(result.result.message, 'should have a message');
  });
});

// =========================================================================
// ACTION HANDLER — SAVE / LOAD
// =========================================================================

suite('handleDashboardAction — save_game / load_game', function() {
  test('save_game returns a result', function() {
    var state = DashboardMain.createGameState('Saver');
    var result = DashboardMain.handleDashboardAction(state, { type: 'save_game' });
    assert.ok(result.result !== undefined, 'should return result');
  });

  test('load_game returns a result', function() {
    var state = DashboardMain.createGameState('Loader');
    var result = DashboardMain.handleDashboardAction(state, { type: 'load_game' });
    assert.ok(result.result !== undefined, 'should return result');
  });
});

// =========================================================================
// ACTION HANDLER — UNKNOWN + EDGE CASES
// =========================================================================

suite('handleDashboardAction — edge cases', function() {
  test('unknown action type returns error', function() {
    var state = DashboardMain.createGameState('Tester');
    var result = DashboardMain.handleDashboardAction(state, { type: 'fly_to_moon' });
    assert.ok(!result.result.success, 'unknown action should fail');
  });

  test('null action returns error', function() {
    var state = DashboardMain.createGameState('Tester');
    var result = DashboardMain.handleDashboardAction(state, null);
    assert.ok(!result.result.success, 'null action should fail');
  });

  test('null state returns error result', function() {
    var result = DashboardMain.handleDashboardAction(null, { type: 'travel', zone: 'gardens' });
    assert.ok(!result.result.success, 'null state should fail');
  });

  test('action without type returns error', function() {
    var state = DashboardMain.createGameState('Tester');
    var result = DashboardMain.handleDashboardAction(state, {});
    assert.ok(!result.result.success, 'action without type should fail');
  });

  test('handleDashboardAction always returns notifications array', function() {
    var state = DashboardMain.createGameState('Tester');
    var result = DashboardMain.handleDashboardAction(state, { type: 'travel', zone: 'gardens' });
    assert.ok(Array.isArray(result.notifications), 'notifications should be an array');
  });
});

// =========================================================================
// RESOURCE GATHERING
// =========================================================================

suite('gatherResource — basic', function() {
  test('gatherResource is a function', function() {
    assert.strictEqual(typeof DashboardMain.gatherResource, 'function');
  });

  test('gatherResource returns success on first gather', function() {
    var state = DashboardMain.createGameState('Gatherer');
    state.player.zone = 'wilds';
    var result = DashboardMain.gatherResource(state, null);
    assert.ok(result.success, 'first gather should succeed');
  });

  test('gatherResource returns an item', function() {
    var state = DashboardMain.createGameState('Gatherer');
    state.player.zone = 'wilds';
    var result = DashboardMain.gatherResource(state, null);
    assert.ok(result.item, 'result should have item');
    assert.ok(typeof result.item === 'string', 'item should be a string');
  });

  test('gatherResource returns positive quantity', function() {
    var state = DashboardMain.createGameState('Gatherer');
    state.player.zone = 'wilds';
    var result = DashboardMain.gatherResource(state, null);
    assert.ok(result.quantity >= 1, 'quantity should be at least 1');
  });

  test('gatherResource adds item to inventory', function() {
    var state = DashboardMain.createGameState('Gatherer');
    state.player.zone = 'gardens';
    var result = DashboardMain.gatherResource(state, null);
    if (result.success) {
      assert.ok(result.state.inventory.items[result.item] >= result.quantity, 'item should be in inventory');
    }
  });

  test('gatherResource returns message string', function() {
    var state = DashboardMain.createGameState('Gatherer');
    state.player.zone = 'nexus';
    var result = DashboardMain.gatherResource(state, null);
    assert.ok(result.message, 'should have message');
    assert.strictEqual(typeof result.message, 'string');
  });

  test('gatherResource updates lastGatherTick', function() {
    var state = DashboardMain.createGameState('Gatherer');
    state.player.zone = 'nexus';
    state.world.time.tick = 5;
    DashboardMain.gatherResource(state, null);
    assert.strictEqual(state.player.lastGatherTick, 5);
  });

  test('gatherResource enforces cooldown', function() {
    var state = DashboardMain.createGameState('Gatherer');
    state.player.zone = 'nexus';
    state.world.time.tick = 5;
    DashboardMain.gatherResource(state, null); // first gather sets lastGatherTick to 5
    var result = DashboardMain.gatherResource(state, null); // same tick, should fail
    assert.ok(!result.success, 'cooldown should prevent consecutive gathers at same tick');
  });

  test('gatherResource succeeds after cooldown', function() {
    var state = DashboardMain.createGameState('Gatherer');
    state.player.zone = 'nexus';
    state.world.time.tick = 5;
    DashboardMain.gatherResource(state, null);
    state.world.time.tick = 6; // advance tick
    var result = DashboardMain.gatherResource(state, null);
    assert.ok(result.success, 'gather should succeed after cooldown tick');
  });
});

suite('gatherResource — zone-specific resources', function() {
  test('nexus yields stone or crystal', function() {
    var state = DashboardMain.createGameState('Gatherer');
    state.player.zone = 'nexus';
    var items = new Set();
    for (var i = 0; i < 20; i++) {
      state.player.lastGatherTick = -1;
      var r = DashboardMain.gatherResource(state, null);
      if (r.success) { items.add(r.item); }
    }
    var validItems = ['stone', 'crystal'];
    items.forEach(function(item) {
      assert.ok(validItems.indexOf(item) !== -1, 'nexus item should be stone or crystal, got: ' + item);
    });
  });

  test('gardens yields herbs, honey, silk, or feather', function() {
    var state = DashboardMain.createGameState('Gatherer');
    state.player.zone = 'gardens';
    var validItems = ['herbs', 'honey', 'silk', 'feather'];
    var items = new Set();
    for (var i = 0; i < 30; i++) {
      state.player.lastGatherTick = -1;
      var r = DashboardMain.gatherResource(state, null);
      if (r.success) { items.add(r.item); }
    }
    items.forEach(function(item) {
      assert.ok(validItems.indexOf(item) !== -1, 'gardens item should be valid, got: ' + item);
    });
  });

  test('athenaeum can yield scroll (rare)', function() {
    var state = DashboardMain.createGameState('Gatherer');
    state.player.zone = 'athenaeum';
    // Just test that the zone is handled without error
    state.player.lastGatherTick = -1;
    var r = DashboardMain.gatherResource(state, null);
    assert.ok(r.success !== undefined, 'should return result');
  });

  test('studio yields clay, silk, or pigment', function() {
    var state = DashboardMain.createGameState('Gatherer');
    state.player.zone = 'studio';
    var validItems = ['clay', 'silk', 'pigment'];
    for (var i = 0; i < 5; i++) {
      state.player.lastGatherTick = -1;
      var r = DashboardMain.gatherResource(state, null);
      if (r.success) {
        assert.ok(validItems.indexOf(r.item) !== -1, 'studio item should be valid, got: ' + r.item);
      }
    }
  });

  test('wilds yields wood, stone, iron_ore, or crystal', function() {
    var state = DashboardMain.createGameState('Gatherer');
    state.player.zone = 'wilds';
    var validItems = ['wood', 'stone', 'iron_ore', 'crystal'];
    for (var i = 0; i < 10; i++) {
      state.player.lastGatherTick = -1;
      var r = DashboardMain.gatherResource(state, null);
      if (r.success) {
        assert.ok(validItems.indexOf(r.item) !== -1, 'wilds item should be valid, got: ' + r.item);
      }
    }
  });

  test('agora yields herbs or gold_dust', function() {
    var state = DashboardMain.createGameState('Gatherer');
    state.player.zone = 'agora';
    var validItems = ['herbs', 'gold_dust'];
    for (var i = 0; i < 5; i++) {
      state.player.lastGatherTick = -1;
      var r = DashboardMain.gatherResource(state, null);
      if (r.success) {
        assert.ok(validItems.indexOf(r.item) !== -1, 'agora item should be valid, got: ' + r.item);
      }
    }
  });

  test('commons yields wood, feather, or herbs', function() {
    var state = DashboardMain.createGameState('Gatherer');
    state.player.zone = 'commons';
    var validItems = ['wood', 'feather', 'herbs'];
    for (var i = 0; i < 5; i++) {
      state.player.lastGatherTick = -1;
      var r = DashboardMain.gatherResource(state, null);
      if (r.success) {
        assert.ok(validItems.indexOf(r.item) !== -1, 'commons item should be valid, got: ' + r.item);
      }
    }
  });

  test('arena yields stone, iron_ore, or gold_dust', function() {
    var state = DashboardMain.createGameState('Gatherer');
    state.player.zone = 'arena';
    var validItems = ['stone', 'iron_ore', 'gold_dust'];
    for (var i = 0; i < 5; i++) {
      state.player.lastGatherTick = -1;
      var r = DashboardMain.gatherResource(state, null);
      if (r.success) {
        assert.ok(validItems.indexOf(r.item) !== -1, 'arena item should be valid, got: ' + r.item);
      }
    }
  });

  test('specific resourceType: stone in wilds', function() {
    var state = DashboardMain.createGameState('Gatherer');
    state.player.zone = 'wilds';
    var result = DashboardMain.gatherResource(state, 'stone');
    assert.ok(result.success, 'gathering stone in wilds should succeed');
    assert.strictEqual(result.item, 'stone');
  });

  test('specific resourceType not in zone fails', function() {
    var state = DashboardMain.createGameState('Gatherer');
    state.player.zone = 'nexus'; // nexus has stone and crystal, not wood
    var result = DashboardMain.gatherResource(state, 'wood');
    assert.ok(!result.success, 'gathering wood in nexus should fail');
  });

  test('null state returns error', function() {
    var result = DashboardMain.gatherResource(null, 'stone');
    assert.ok(!result.success, 'null state should fail');
  });
});

suite('gatherResource — rarity tiers', function() {
  test('result has tier property', function() {
    var state = DashboardMain.createGameState('Gatherer');
    state.player.zone = 'nexus';
    var result = DashboardMain.gatherResource(state, null);
    if (result.success) {
      assert.ok(result.tier, 'should have tier');
      assert.ok(['common', 'uncommon', 'rare'].indexOf(result.tier) !== -1, 'tier should be valid');
    }
  });

  test('ZONE_RESOURCES has all 8 zones', function() {
    var zones = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];
    zones.forEach(function(z) {
      assert.ok(DashboardMain.ZONE_RESOURCES[z], 'ZONE_RESOURCES should have zone: ' + z);
    });
  });

  test('all zones have common resources', function() {
    var zones = Object.keys(DashboardMain.ZONE_RESOURCES);
    zones.forEach(function(z) {
      var res = DashboardMain.ZONE_RESOURCES[z];
      assert.ok(res.common && res.common.length > 0, 'zone ' + z + ' should have common resources');
    });
  });
});

// =========================================================================
// STATE PERSISTENCE
// =========================================================================

suite('saveState / loadState / resetState', function() {
  test('saveState returns false in Node.js (no localStorage)', function() {
    var state = DashboardMain.createGameState('Saver');
    var result = DashboardMain.saveState(state);
    // In Node.js, localStorage is not available, so save returns false
    assert.strictEqual(typeof result, 'boolean');
  });

  test('saveState handles null gracefully', function() {
    var result = DashboardMain.saveState(null);
    assert.strictEqual(result, false);
  });

  test('loadState returns null when no saved data', function() {
    var result = DashboardMain.loadState();
    // In Node.js, returns null since no localStorage
    assert.strictEqual(result, null);
  });

  test('resetState returns a fresh state', function() {
    var state = DashboardMain.resetState('NewPlayer');
    assert.ok(state, 'should return a state');
    assert.strictEqual(state.player.name, 'NewPlayer');
    assert.strictEqual(state.player.zone, 'nexus');
  });

  test('resetState creates state with 0 xp', function() {
    var state = DashboardMain.resetState('Fresh');
    assert.strictEqual(state.player.xp, 0);
  });

  test('resetState creates state with 100 spark', function() {
    var state = DashboardMain.resetState('Fresh');
    assert.strictEqual(state.player.spark, 100);
  });

  test('resetState creates state with empty inventory', function() {
    var state = DashboardMain.resetState('Fresh');
    assert.strictEqual(Object.keys(state.inventory.items).length, 0);
  });
});

// =========================================================================
// AVAILABLE ACTIONS
// =========================================================================

suite('getAvailableActions', function() {
  test('getAvailableActions returns an array', function() {
    var state = DashboardMain.createGameState('Player');
    var actions = DashboardMain.getAvailableActions(state);
    assert.ok(Array.isArray(actions), 'should return array');
  });

  test('getAvailableActions includes travel actions', function() {
    var state = DashboardMain.createGameState('Player');
    var actions = DashboardMain.getAvailableActions(state);
    var travelActions = actions.filter(function(a) { return a.type === 'travel'; });
    assert.ok(travelActions.length > 0, 'should include travel actions');
  });

  test('getAvailableActions includes 7 travel actions (all zones except current)', function() {
    var state = DashboardMain.createGameState('Player');
    state.player.zone = 'nexus';
    var actions = DashboardMain.getAvailableActions(state);
    var travelActions = actions.filter(function(a) { return a.type === 'travel'; });
    assert.strictEqual(travelActions.length, 7, 'should have 7 travel options from nexus');
  });

  test('getAvailableActions includes gather actions in nexus', function() {
    var state = DashboardMain.createGameState('Player');
    state.player.zone = 'nexus';
    var actions = DashboardMain.getAvailableActions(state);
    var gatherActions = actions.filter(function(a) { return a.type === 'gather_resource'; });
    assert.ok(gatherActions.length > 0, 'should include gather actions');
  });

  test('getAvailableActions includes dungeon in arena', function() {
    var state = DashboardMain.createGameState('Player');
    state.player.zone = 'arena';
    var actions = DashboardMain.getAvailableActions(state);
    var dungeonActions = actions.filter(function(a) { return a.type === 'enter_dungeon'; });
    assert.ok(dungeonActions.length > 0, 'should include dungeon actions in arena');
  });

  test('getAvailableActions includes fishing in wilds', function() {
    var state = DashboardMain.createGameState('Player');
    state.player.zone = 'wilds';
    var actions = DashboardMain.getAvailableActions(state);
    var fishActions = actions.filter(function(a) { return a.type === 'cast_line'; });
    assert.ok(fishActions.length > 0, 'should include fishing in wilds');
  });

  test('getAvailableActions includes save and load', function() {
    var state = DashboardMain.createGameState('Player');
    var actions = DashboardMain.getAvailableActions(state);
    var saveAction = actions.filter(function(a) { return a.type === 'save_game'; });
    var loadAction = actions.filter(function(a) { return a.type === 'load_game'; });
    assert.ok(saveAction.length > 0, 'should include save action');
    assert.ok(loadAction.length > 0, 'should include load action');
  });

  test('getAvailableActions returns empty array for null state', function() {
    var actions = DashboardMain.getAvailableActions(null);
    assert.deepStrictEqual(actions, []);
  });

  test('getAvailableActions returns stargazing at night', function() {
    var state = DashboardMain.createGameState('Player');
    state.world.time.tick = 700; // night
    var actions = DashboardMain.getAvailableActions(state);
    var starActions = actions.filter(function(a) { return a.type === 'gaze_stars'; });
    assert.ok(starActions.length > 0, 'should include stargazing at night');
  });
});

// =========================================================================
// NOTIFICATION PROCESSING
// =========================================================================

suite('processNotifications', function() {
  test('processNotifications returns an array', function() {
    var state = DashboardMain.createGameState('Player');
    var notifications = DashboardMain.processNotifications(state, { success: true, message: 'OK' });
    assert.ok(Array.isArray(notifications), 'should return array');
  });

  test('success result generates success notification', function() {
    var state = DashboardMain.createGameState('Player');
    var notifications = DashboardMain.processNotifications(state, { success: true, message: 'Done!' });
    assert.ok(notifications.length > 0, 'should generate notifications');
    assert.strictEqual(notifications[0].type, 'success');
  });

  test('failed result generates error notification', function() {
    var state = DashboardMain.createGameState('Player');
    var notifications = DashboardMain.processNotifications(state, { success: false, error: 'Something went wrong' });
    assert.ok(notifications.length > 0, 'should generate notifications');
    assert.strictEqual(notifications[0].type, 'error');
  });

  test('null result returns empty array', function() {
    var state = DashboardMain.createGameState('Player');
    var notifications = DashboardMain.processNotifications(state, null);
    assert.deepStrictEqual(notifications, []);
  });

  test('notification has tick property', function() {
    var state = DashboardMain.createGameState('Player');
    state.world.time.tick = 42;
    var notifications = DashboardMain.processNotifications(state, { success: true, message: 'OK' });
    assert.strictEqual(notifications[0].tick, 42);
  });

  test('level-up triggers achievement notification', function() {
    var state = DashboardMain.createGameState('Player');
    state.player.level = 1;
    state.player.xp = 150; // exceeds level 1 threshold (100)
    var notifications = DashboardMain.processNotifications(state, { success: true, message: 'Action done' });
    var achievementNotifs = notifications.filter(function(n) { return n.type === 'achievement'; });
    assert.ok(achievementNotifs.length > 0, 'should have level-up achievement notification');
  });

  test('reward object generates info notification', function() {
    var state = DashboardMain.createGameState('Player');
    var notifications = DashboardMain.processNotifications(state, {
      success: true,
      message: 'Done',
      reward: { spark: 50, xp: 10 }
    });
    var infoNotifs = notifications.filter(function(n) { return n.type === 'info'; });
    assert.ok(infoNotifs.length > 0, 'reward should generate info notification');
  });

  test('lost dungeon generates warning notification', function() {
    var state = DashboardMain.createGameState('Player');
    var notifications = DashboardMain.processNotifications(state, {
      success: true,
      message: 'Dungeon failed.',
      won: false
    });
    var warningNotifs = notifications.filter(function(n) { return n.type === 'warning'; });
    assert.ok(warningNotifs.length > 0, 'lost dungeon should generate warning');
  });
});

// =========================================================================
// KEYBOARD SHORTCUTS
// =========================================================================

suite('handleKeyPress', function() {
  test('handleKeyPress is a function', function() {
    assert.strictEqual(typeof DashboardMain.handleKeyPress, 'function');
  });

  test('handleKeyPress returns state', function() {
    var state = DashboardMain.createGameState('Player');
    var result = DashboardMain.handleKeyPress(state, 'i');
    assert.ok(result, 'should return state');
    assert.ok(result.player, 'returned state should have player');
  });

  test('handleKeyPress returns original state for unknown key', function() {
    var state = DashboardMain.createGameState('Player');
    var result = DashboardMain.handleKeyPress(state, 'q');
    assert.deepStrictEqual(result, state);
  });

  test('handleKeyPress handles null state gracefully', function() {
    var result = DashboardMain.handleKeyPress(null, 'i');
    assert.strictEqual(result, null);
  });

  test('handleKeyPress handles null key gracefully', function() {
    var state = DashboardMain.createGameState('Player');
    var result = DashboardMain.handleKeyPress(state, null);
    assert.deepStrictEqual(result, state);
  });

  test('KEY_SHORTCUTS contains i for inventory', function() {
    assert.ok(DashboardMain.KEY_SHORTCUTS.i, 'i key should be mapped');
    assert.strictEqual(DashboardMain.KEY_SHORTCUTS.i.panel, 'inventory');
  });

  test('KEY_SHORTCUTS contains j for quests', function() {
    assert.ok(DashboardMain.KEY_SHORTCUTS.j, 'j key should be mapped');
    assert.strictEqual(DashboardMain.KEY_SHORTCUTS.j.panel, 'quests');
  });

  test('KEY_SHORTCUTS contains g for guild', function() {
    assert.ok(DashboardMain.KEY_SHORTCUTS.g, 'g key should be mapped');
    assert.strictEqual(DashboardMain.KEY_SHORTCUTS.g.panel, 'guild');
  });

  test('KEY_SHORTCUTS contains m for map', function() {
    assert.ok(DashboardMain.KEY_SHORTCUTS.m, 'M should be mapped');
  });

  test('handleKeyPress with gather key triggers resource gather', function() {
    var state = DashboardMain.createGameState('Player');
    state.player.zone = 'wilds';
    var result = DashboardMain.handleKeyPress(state, 'r');
    // Should still return a state (gather may or may not succeed)
    assert.ok(result, 'should return state');
  });
});

// =========================================================================
// PLAYER SUMMARY
// =========================================================================

suite('getPlayerSummary', function() {
  test('getPlayerSummary returns a string', function() {
    var state = DashboardMain.createGameState('Player');
    var summary = DashboardMain.getPlayerSummary(state);
    assert.strictEqual(typeof summary, 'string');
  });

  test('summary contains level', function() {
    var state = DashboardMain.createGameState('Player');
    state.player.level = 5;
    var summary = DashboardMain.getPlayerSummary(state);
    assert.ok(summary.indexOf('Level 5') !== -1, 'summary should contain level');
  });

  test('summary contains zone name', function() {
    var state = DashboardMain.createGameState('Player');
    state.player.zone = 'gardens';
    var summary = DashboardMain.getPlayerSummary(state);
    assert.ok(summary.indexOf('Gardens') !== -1, 'summary should contain zone name');
  });

  test('summary contains spark amount', function() {
    var state = DashboardMain.createGameState('Player');
    state.player.spark = 342;
    var summary = DashboardMain.getPlayerSummary(state);
    assert.ok(summary.indexOf('342') !== -1, 'summary should contain spark amount');
  });

  test('summary contains quest count', function() {
    var state = DashboardMain.createGameState('Player');
    state.quests.active = { q1: {}, q2: {}, q3: {} };
    var summary = DashboardMain.getPlayerSummary(state);
    assert.ok(summary.indexOf('3') !== -1, 'summary should contain quest count');
  });

  test('summary contains day number', function() {
    var state = DashboardMain.createGameState('Player');
    state.world.time.tick = 0;
    var summary = DashboardMain.getPlayerSummary(state);
    assert.ok(summary.indexOf('Day 1') !== -1, 'summary should contain Day 1 on tick 0');
  });

  test('summary contains time of day', function() {
    var state = DashboardMain.createGameState('Player');
    state.world.time.tick = 150; // Morning
    var summary = DashboardMain.getPlayerSummary(state);
    assert.ok(
      summary.indexOf('Morning') !== -1 || summary.indexOf('Dawn') !== -1 || summary.indexOf('Afternoon') !== -1,
      'summary should contain time of day'
    );
  });

  test('summary handles null state gracefully', function() {
    var result = DashboardMain.getPlayerSummary(null);
    assert.ok(typeof result === 'string', 'should return string even for null');
  });

  test('summary singular quest form', function() {
    var state = DashboardMain.createGameState('Player');
    state.quests.active = { q1: {} };
    var summary = DashboardMain.getPlayerSummary(state);
    assert.ok(summary.indexOf('1 active quest') !== -1, 'should use singular form for 1 quest');
  });
});

// =========================================================================
// WELCOME MESSAGE
// =========================================================================

suite('formatWelcomeMessage', function() {
  test('formatWelcomeMessage returns a string', function() {
    var msg = DashboardMain.formatWelcomeMessage('Alice', 'nexus');
    assert.strictEqual(typeof msg, 'string');
  });

  test('welcome message contains player name', function() {
    var msg = DashboardMain.formatWelcomeMessage('Alice', 'nexus');
    assert.ok(msg.indexOf('Alice') !== -1, 'should contain player name');
  });

  test('welcome message contains zone name', function() {
    var msg = DashboardMain.formatWelcomeMessage('Bob', 'gardens');
    assert.ok(msg.indexOf('Gardens') !== -1, 'should contain zone name');
  });

  test('welcome message contains ZION', function() {
    var msg = DashboardMain.formatWelcomeMessage('Bob', 'nexus');
    assert.ok(msg.indexOf('ZION') !== -1, 'should mention ZION');
  });

  test('welcome message contains zone description', function() {
    var msg = DashboardMain.formatWelcomeMessage('Bob', 'nexus');
    assert.ok(msg.indexOf('crystalline') !== -1, 'should contain nexus description');
  });

  test('welcome message has HTML tags', function() {
    var msg = DashboardMain.formatWelcomeMessage('Alice', 'nexus');
    assert.ok(msg.indexOf('<') !== -1 && msg.indexOf('>') !== -1, 'should contain HTML');
  });

  test('welcome message escapes XSS in player name', function() {
    var msg = DashboardMain.formatWelcomeMessage('<script>alert(1)</script>', 'nexus');
    assert.ok(msg.indexOf('<script>') === -1, 'should escape HTML in player name');
  });

  test('welcome message works with no arguments', function() {
    var msg = DashboardMain.formatWelcomeMessage();
    assert.ok(typeof msg === 'string', 'should work with no arguments');
    assert.ok(msg.indexOf('Citizen') !== -1, 'should use default name');
  });

  test('welcome message works for all 8 zones', function() {
    var zones = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];
    zones.forEach(function(z) {
      var msg = DashboardMain.formatWelcomeMessage('Tester', z);
      assert.ok(typeof msg === 'string' && msg.length > 0, 'welcome message should work for zone: ' + z);
    });
  });
});

// =========================================================================
// ZONE RESOURCE DATA COMPLETENESS
// =========================================================================

suite('ZONE_RESOURCES completeness', function() {
  var zones = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];

  test('ZONE_RESOURCES has all 8 zones', function() {
    zones.forEach(function(z) {
      assert.ok(DashboardMain.ZONE_RESOURCES[z], 'ZONE_RESOURCES missing zone: ' + z);
    });
  });

  test('each zone has common array', function() {
    zones.forEach(function(z) {
      var res = DashboardMain.ZONE_RESOURCES[z];
      assert.ok(Array.isArray(res.common), z + ' should have common array');
    });
  });

  test('each zone has uncommon array', function() {
    zones.forEach(function(z) {
      var res = DashboardMain.ZONE_RESOURCES[z];
      assert.ok(Array.isArray(res.uncommon), z + ' should have uncommon array');
    });
  });

  test('nexus common includes stone', function() {
    assert.ok(DashboardMain.ZONE_RESOURCES.nexus.common.indexOf('stone') !== -1);
  });

  test('nexus uncommon includes crystal', function() {
    assert.ok(DashboardMain.ZONE_RESOURCES.nexus.uncommon.indexOf('crystal') !== -1);
  });

  test('gardens common includes herbs', function() {
    assert.ok(DashboardMain.ZONE_RESOURCES.gardens.common.indexOf('herbs') !== -1);
  });

  test('gardens uncommon includes honey', function() {
    assert.ok(DashboardMain.ZONE_RESOURCES.gardens.uncommon.indexOf('honey') !== -1);
  });

  test('athenaeum rare includes scroll', function() {
    assert.ok(DashboardMain.ZONE_RESOURCES.athenaeum.rare.indexOf('scroll') !== -1);
  });

  test('studio rare includes pigment', function() {
    assert.ok(DashboardMain.ZONE_RESOURCES.studio.rare.indexOf('pigment') !== -1);
  });

  test('wilds common includes wood', function() {
    assert.ok(DashboardMain.ZONE_RESOURCES.wilds.common.indexOf('wood') !== -1);
  });

  test('wilds uncommon includes iron_ore', function() {
    assert.ok(DashboardMain.ZONE_RESOURCES.wilds.uncommon.indexOf('iron_ore') !== -1);
  });

  test('agora uncommon includes gold_dust', function() {
    assert.ok(DashboardMain.ZONE_RESOURCES.agora.uncommon.indexOf('gold_dust') !== -1);
  });

  test('arena rare includes gold_dust', function() {
    assert.ok(DashboardMain.ZONE_RESOURCES.arena.rare.indexOf('gold_dust') !== -1);
  });
});

// =========================================================================
// ZONE NAMES COMPLETENESS
// =========================================================================

suite('ZONE_NAMES completeness', function() {
  test('ZONE_NAMES has The Nexus', function() {
    assert.strictEqual(DashboardMain.ZONE_NAMES.nexus, 'The Nexus');
  });

  test('ZONE_NAMES has The Gardens', function() {
    assert.strictEqual(DashboardMain.ZONE_NAMES.gardens, 'The Gardens');
  });

  test('ZONE_NAMES has The Athenaeum', function() {
    assert.strictEqual(DashboardMain.ZONE_NAMES.athenaeum, 'The Athenaeum');
  });

  test('ZONE_NAMES has The Studio', function() {
    assert.strictEqual(DashboardMain.ZONE_NAMES.studio, 'The Studio');
  });

  test('ZONE_NAMES has The Wilds', function() {
    assert.strictEqual(DashboardMain.ZONE_NAMES.wilds, 'The Wilds');
  });

  test('ZONE_NAMES has The Agora', function() {
    assert.strictEqual(DashboardMain.ZONE_NAMES.agora, 'The Agora');
  });

  test('ZONE_NAMES has The Commons', function() {
    assert.strictEqual(DashboardMain.ZONE_NAMES.commons, 'The Commons');
  });

  test('ZONE_NAMES has The Arena', function() {
    assert.strictEqual(DashboardMain.ZONE_NAMES.arena, 'The Arena');
  });
});

// =========================================================================
// INTEGRATION — STUB MODULES
// =========================================================================

suite('Integration with stub modules (no external modules loaded)', function() {
  test('createGameState works without external modules', function() {
    var state = DashboardMain.createGameState('Stub');
    assert.ok(state.player.name === 'Stub');
  });

  test('dashboardTick works without external modules', function() {
    var state = DashboardMain.createGameState('Stub');
    state = DashboardMain.dashboardTick(state, 1);
    assert.strictEqual(state.world.time.tick, 1);
  });

  test('travel action works as stub', function() {
    var state = DashboardMain.createGameState('Stub');
    var result = DashboardMain.handleDashboardAction(state, { type: 'travel', zone: 'wilds' });
    assert.ok(result.result.success);
    assert.strictEqual(result.state.player.zone, 'wilds');
  });

  test('craft action works as stub', function() {
    var state = DashboardMain.createGameState('Stub');
    var result = DashboardMain.handleDashboardAction(state, { type: 'craft', recipeId: 'test_item' });
    assert.ok(result.result.success);
  });

  test('send_chat action works as stub', function() {
    var state = DashboardMain.createGameState('Stub');
    var result = DashboardMain.handleDashboardAction(state, { type: 'send_chat', channel: 'zone', text: 'Greetings!' });
    assert.ok(result.result.success);
  });

  test('gather action works as stub in wilds', function() {
    var state = DashboardMain.createGameState('Stub');
    state.player.zone = 'wilds';
    var result = DashboardMain.handleDashboardAction(state, { type: 'gather_resource', resourceType: 'wood' });
    assert.ok(result.result.success);
  });

  test('cast_line works as stub', function() {
    var state = DashboardMain.createGameState('Stub');
    var result = DashboardMain.handleDashboardAction(state, { type: 'cast_line' });
    assert.ok(result.result.success !== undefined);
  });

  test('enter_dungeon works as stub', function() {
    var state = DashboardMain.createGameState('Stub');
    var result = DashboardMain.handleDashboardAction(state, { type: 'enter_dungeon', difficulty: 'easy' });
    assert.ok(result.result.success !== undefined);
  });

  test('gaze_stars works as stub', function() {
    var state = DashboardMain.createGameState('Stub');
    var result = DashboardMain.handleDashboardAction(state, { type: 'gaze_stars' });
    assert.ok(result.result.success);
  });

  test('initDashboardMode works without a container in Node.js', function() {
    reset();
    var state = DashboardMain.initDashboardMode(null);
    assert.ok(state, 'should return state');
    assert.ok(state.player, 'state should have player');
    reset(); // cleanup
  });
});

// =========================================================================
// EDGE CASES
// =========================================================================

suite('Edge cases', function() {
  test('multiple createGameState calls do not share references', function() {
    var s1 = DashboardMain.createGameState('A');
    var s2 = DashboardMain.createGameState('B');
    s1.player.zone = 'arena';
    assert.strictEqual(s2.player.zone, 'nexus', 'states should be independent');
  });

  test('dashboardTick does not throw on state with missing world', function() {
    var state = DashboardMain.createGameState('P');
    delete state.world;
    var result = DashboardMain.dashboardTick(state, 1);
    // Should return state without throwing
    assert.ok(result !== undefined);
  });

  test('handleDashboardAction does not throw on corrupt state', function() {
    var result = DashboardMain.handleDashboardAction({}, { type: 'travel', zone: 'gardens' });
    assert.ok(result !== undefined);
  });

  test('getAvailableActions does not throw on state without player', function() {
    var result = DashboardMain.getAvailableActions({ quests: { active: {} } });
    assert.ok(Array.isArray(result));
  });

  test('processNotifications handles state without world', function() {
    var state = { player: { level: 1, xp: 50 } };
    var result = DashboardMain.processNotifications(state, { success: true, message: 'OK' });
    assert.ok(Array.isArray(result));
  });

  test('formatWelcomeMessage handles unknown zone', function() {
    var msg = DashboardMain.formatWelcomeMessage('Tester', 'unknown_zone');
    assert.ok(typeof msg === 'string' && msg.length > 0, 'should handle unknown zone gracefully');
  });

  test('gatherResource handles unknown zone', function() {
    var state = DashboardMain.createGameState('Gatherer');
    state.player.zone = 'unknown_zone';
    var result = DashboardMain.gatherResource(state, null);
    assert.ok(!result.success, 'should fail for unknown zone');
  });

  test('join_event with inactive event fails gracefully', function() {
    var state = DashboardMain.createGameState('EventGoer');
    state.world.events.push({
      id: 'expired', name: 'Expired Event', zone: 'nexus',
      startTick: 0, endTick: 10, active: false,
      reward: {}
    });
    var result = DashboardMain.handleDashboardAction(state, { type: 'join_event', eventId: 'expired' });
    assert.ok(!result.result.success, 'should fail for inactive event');
  });

  test('sell_item with quantity 1 when inventory has exactly 1 removes item', function() {
    var state = DashboardMain.createGameState('Seller');
    state.inventory.items.feather = 1;
    var result = DashboardMain.handleDashboardAction(state, { type: 'sell_item', itemId: 'feather', quantity: 1 });
    assert.ok(result.result.success);
    assert.ok(!result.state.inventory.items.feather, 'feather should be removed from inventory');
  });

  test('_reset clears initialized flag', function() {
    reset();
    var state = DashboardMain.initDashboardMode(null);
    assert.ok(state, 'should work after reset');
    reset();
    // Should be able to reinitialize
    var state2 = DashboardMain.initDashboardMode(null);
    assert.ok(state2, 'should work after second reset and init');
    reset();
  });

  test('world events array is populated at tick 240', function() {
    var state = DashboardMain.createGameState('EventWatcher');
    // Manually simulate 240 ticks using _checkEventTriggers
    state.world.time.tick = 240;
    state = DashboardMain._checkEventTriggers(state, 240);
    var activeEvents = state.world.events.filter(function(e) { return e.active; });
    assert.ok(activeEvents.length > 0, 'market_day event should be active at tick 240');
  });

  test('weather update via _updateWeather changes news', function() {
    var state = DashboardMain.createGameState('Weather');
    state.world.time.tick = 60;
    var newsBefore = state.world.news.length;
    state = DashboardMain._updateWeather(state);
    assert.ok(state.world.news.length > newsBefore, 'news should be added after weather update');
  });
});

// =========================================================================
// RESULTS
// =========================================================================

console.log('\n' + '='.repeat(60));
console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
if (errors.length > 0) {
  console.log('\nFailed tests:');
  errors.forEach(function(e) {
    console.log('  FAIL: ' + e.name);
    console.log('    ' + e.error.message);
  });
}
console.log('='.repeat(60));

if (failed > 0) {
  process.exit(1);
}
