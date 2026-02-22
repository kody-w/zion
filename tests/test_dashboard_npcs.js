/**
 * tests/test_dashboard_npcs.js
 * 120+ tests for the ZION Dashboard NPC Interaction system
 * Covers: NPC generation, zone filtering, archetype data, dialogue, shop,
 *         quests, friendship, search, card formatting, edge cases
 */

'use strict';

const { test, suite, report, assert } = require('./test_runner');
const D = require('../src/js/dashboard_npcs');

// =============================================================================
// HELPERS
// =============================================================================

var _playerCounter = 0;
function uid() { return 'test_player_' + (++_playerCounter) + '_' + Date.now(); }

function freshPlayer() { return uid(); }

// =============================================================================
// SUITE: MODULE SHAPE
// =============================================================================

suite('Module exports', function() {
  test('exports ARCHETYPES object', function() {
    assert.ok(D.ARCHETYPES && typeof D.ARCHETYPES === 'object');
  });
  test('exports ZONES array', function() {
    assert.ok(Array.isArray(D.ZONES));
  });
  test('exports NPC_NAMES array', function() {
    assert.ok(Array.isArray(D.NPC_NAMES));
  });
  test('exports ITEM_CATALOG object', function() {
    assert.ok(D.ITEM_CATALOG && typeof D.ITEM_CATALOG === 'object');
  });
  test('exports QUEST_CATALOG object', function() {
    assert.ok(D.QUEST_CATALOG && typeof D.QUEST_CATALOG === 'object');
  });
  test('exports createNPCPanel function', function() {
    assert.strictEqual(typeof D.createNPCPanel, 'function');
  });
  test('exports getNPCsInZone function', function() {
    assert.strictEqual(typeof D.getNPCsInZone, 'function');
  });
  test('exports getNPCById function', function() {
    assert.strictEqual(typeof D.getNPCById, 'function');
  });
  test('exports talkToNPC function', function() {
    assert.strictEqual(typeof D.talkToNPC, 'function');
  });
  test('exports getShopInventory function', function() {
    assert.strictEqual(typeof D.getShopInventory, 'function');
  });
  test('exports buyFromNPC function', function() {
    assert.strictEqual(typeof D.buyFromNPC, 'function');
  });
  test('exports getAvailableQuests function', function() {
    assert.strictEqual(typeof D.getAvailableQuests, 'function');
  });
  test('exports acceptQuestFromNPC function', function() {
    assert.strictEqual(typeof D.acceptQuestFromNPC, 'function');
  });
  test('exports updateFriendship function', function() {
    assert.strictEqual(typeof D.updateFriendship, 'function');
  });
  test('exports getFriendshipTier function', function() {
    assert.strictEqual(typeof D.getFriendshipTier, 'function');
  });
  test('exports getNPCMood function', function() {
    assert.strictEqual(typeof D.getNPCMood, 'function');
  });
  test('exports searchNPCs function', function() {
    assert.strictEqual(typeof D.searchNPCs, 'function');
  });
  test('exports formatNPCCard function', function() {
    assert.strictEqual(typeof D.formatNPCCard, 'function');
  });
  test('exports getDialogueOptions function', function() {
    assert.strictEqual(typeof D.getDialogueOptions, 'function');
  });
  test('exports processDialogueChoice function', function() {
    assert.strictEqual(typeof D.processDialogueChoice, 'function');
  });
});

// =============================================================================
// SUITE: ARCHETYPE DATA
// =============================================================================

suite('Archetype data completeness', function() {
  var archetypeKeys = [
    'gardener', 'builder', 'storyteller', 'merchant', 'explorer',
    'teacher', 'musician', 'healer', 'philosopher', 'artist'
  ];

  test('has exactly 10 archetypes', function() {
    assert.strictEqual(Object.keys(D.ARCHETYPES).length, 10);
  });

  archetypeKeys.forEach(function(key) {
    test('archetype ' + key + ' has role string', function() {
      assert.strictEqual(typeof D.ARCHETYPES[key].role, 'string');
      assert.ok(D.ARCHETYPES[key].role.length > 0);
    });
    test('archetype ' + key + ' has greeting string', function() {
      assert.strictEqual(typeof D.ARCHETYPES[key].greeting, 'string');
      assert.ok(D.ARCHETYPES[key].greeting.length > 0);
    });
    test('archetype ' + key + ' has shop array of 3 items', function() {
      assert.ok(Array.isArray(D.ARCHETYPES[key].shop));
      assert.strictEqual(D.ARCHETYPES[key].shop.length, 3);
    });
    test('archetype ' + key + ' has skills array of 2', function() {
      assert.ok(Array.isArray(D.ARCHETYPES[key].skills));
      assert.strictEqual(D.ARCHETYPES[key].skills.length, 2);
    });
    test('archetype ' + key + ' has quests array of 2', function() {
      assert.ok(Array.isArray(D.ARCHETYPES[key].quests));
      assert.strictEqual(D.ARCHETYPES[key].quests.length, 2);
    });
    test('archetype ' + key + ' shop items exist in ITEM_CATALOG', function() {
      D.ARCHETYPES[key].shop.forEach(function(itemId) {
        assert.ok(D.ITEM_CATALOG[itemId], 'Missing item: ' + itemId + ' for ' + key);
      });
    });
    test('archetype ' + key + ' quests exist in QUEST_CATALOG', function() {
      D.ARCHETYPES[key].quests.forEach(function(questId) {
        assert.ok(D.QUEST_CATALOG[questId], 'Missing quest: ' + questId + ' for ' + key);
      });
    });
  });

  test('merchant archetype has cheapest price multiplier', function() {
    assert.ok(D.ARCHETYPE_PRICE_MULTIPLIERS['merchant'] < 1.0);
  });
});

// =============================================================================
// SUITE: NPC GENERATION
// =============================================================================

suite('NPC generation', function() {
  test('generates exactly 100 NPCs', function() {
    var npcs = D._generateNPCs();
    assert.strictEqual(npcs.length, 100);
  });

  test('all NPCs have required fields', function() {
    var npcs = D._generateNPCs();
    npcs.forEach(function(npc) {
      assert.ok(npc.id,        'npc missing id');
      assert.ok(npc.name,      'npc missing name');
      assert.ok(npc.archetype, 'npc missing archetype');
      assert.ok(npc.zone,      'npc missing zone');
      assert.ok(typeof npc.mood === 'string', 'npc missing mood');
      assert.strictEqual(typeof npc.friendship, 'number', 'friendship must be number');
    });
  });

  test('all NPC ids are unique', function() {
    var npcs = D._generateNPCs();
    var ids = npcs.map(function(n) { return n.id; });
    var unique = new Set(ids);
    assert.strictEqual(unique.size, 100);
  });

  test('NPC ids follow npc_XXX pattern', function() {
    var npcs = D._generateNPCs();
    npcs.forEach(function(npc) {
      assert.ok(/^npc_\d{3}$/.test(npc.id), 'bad id: ' + npc.id);
    });
  });

  test('all NPC names come from NPC_NAMES list', function() {
    var npcs = D._generateNPCs();
    npcs.forEach(function(npc) {
      assert.ok(D.NPC_NAMES.indexOf(npc.name) >= 0, 'Name not in list: ' + npc.name);
    });
  });

  test('all NPC archetypes are valid', function() {
    var validArchetypes = Object.keys(D.ARCHETYPES);
    var npcs = D._generateNPCs();
    npcs.forEach(function(npc) {
      assert.ok(validArchetypes.indexOf(npc.archetype) >= 0, 'Invalid archetype: ' + npc.archetype);
    });
  });

  test('all NPC zones are valid', function() {
    var npcs = D._generateNPCs();
    npcs.forEach(function(npc) {
      assert.ok(D.ZONES.indexOf(npc.zone) >= 0, 'Invalid zone: ' + npc.zone);
    });
  });

  test('all 8 zones have NPCs', function() {
    var npcs = D._generateNPCs();
    D.ZONES.forEach(function(zone) {
      var count = npcs.filter(function(n) { return n.zone === zone; }).length;
      assert.ok(count > 0, 'Zone ' + zone + ' has no NPCs');
    });
  });

  test('zones have 12 or 13 NPCs each', function() {
    var npcs = D._generateNPCs();
    D.ZONES.forEach(function(zone) {
      var count = npcs.filter(function(n) { return n.zone === zone; }).length;
      assert.ok(count === 12 || count === 13, 'Zone ' + zone + ' has ' + count + ' NPCs');
    });
  });

  test('total NPCs across all zones equals 100', function() {
    var npcs = D._generateNPCs();
    var total = D.ZONES.reduce(function(sum, zone) {
      return sum + npcs.filter(function(n) { return n.zone === zone; }).length;
    }, 0);
    assert.strictEqual(total, 100);
  });

  test('all 10 archetypes are represented', function() {
    var npcs = D._generateNPCs();
    var archetypeKeys = Object.keys(D.ARCHETYPES);
    archetypeKeys.forEach(function(key) {
      var count = npcs.filter(function(n) { return n.archetype === key; }).length;
      assert.ok(count > 0, 'Archetype ' + key + ' not represented');
    });
  });

  test('NPC_NAMES list has 100 entries', function() {
    assert.strictEqual(D.NPC_NAMES.length, 100);
  });

  test('default friendship is 0', function() {
    var npcs = D._generateNPCs();
    npcs.forEach(function(npc) {
      assert.strictEqual(npc.friendship, 0);
    });
  });
});

// =============================================================================
// SUITE: ZONE FILTERING
// =============================================================================

suite('Zone filtering (getNPCsInZone)', function() {
  test('returns array for valid zone', function() {
    var result = D.getNPCsInZone('nexus');
    assert.ok(Array.isArray(result));
    assert.ok(result.length > 0);
  });

  test('returns empty array for unknown zone', function() {
    var result = D.getNPCsInZone('unknown_zone_xyz');
    assert.deepStrictEqual(result, []);
  });

  test('returns empty array for null zone', function() {
    var result = D.getNPCsInZone(null);
    assert.deepStrictEqual(result, []);
  });

  test('all returned NPCs belong to requested zone', function() {
    D.ZONES.forEach(function(zone) {
      var npcs = D.getNPCsInZone(zone);
      npcs.forEach(function(npc) {
        assert.strictEqual(npc.zone, zone);
      });
    });
  });

  test('each zone returns 12 or 13 NPCs', function() {
    D.ZONES.forEach(function(zone) {
      var count = D.getNPCsInZone(zone).length;
      assert.ok(count === 12 || count === 13, zone + ' has ' + count);
    });
  });

  test('sum across all zones equals 100', function() {
    var total = D.ZONES.reduce(function(sum, zone) {
      return sum + D.getNPCsInZone(zone).length;
    }, 0);
    assert.strictEqual(total, 100);
  });
});

// =============================================================================
// SUITE: GET NPC BY ID
// =============================================================================

suite('getNPCById', function() {
  test('returns NPC for valid id', function() {
    var npc = D.getNPCById('npc_001');
    assert.ok(npc);
    assert.strictEqual(npc.id, 'npc_001');
  });

  test('returns NPC for npc_100', function() {
    var npc = D.getNPCById('npc_100');
    assert.ok(npc);
    assert.strictEqual(npc.id, 'npc_100');
  });

  test('returns null for unknown id', function() {
    var npc = D.getNPCById('npc_999');
    assert.strictEqual(npc, null);
  });

  test('returns null for empty string', function() {
    var npc = D.getNPCById('');
    assert.strictEqual(npc, null);
  });

  test('returns null for null', function() {
    var npc = D.getNPCById(null);
    assert.strictEqual(npc, null);
  });

  test('returned NPC has all required fields', function() {
    var npc = D.getNPCById('npc_050');
    assert.ok(npc.id);
    assert.ok(npc.name);
    assert.ok(npc.archetype);
    assert.ok(npc.zone);
  });
});

// =============================================================================
// SUITE: FRIENDSHIP
// =============================================================================

suite('updateFriendship', function() {
  test('starts at 0 for new player/npc pair', function() {
    var player = freshPlayer();
    assert.strictEqual(D._getFriendship('npc_001', player), 0);
  });

  test('increases friendship by given amount', function() {
    var player = freshPlayer();
    var newLevel = D.updateFriendship('npc_001', player, 20);
    assert.strictEqual(newLevel, 20);
  });

  test('multiple increments accumulate', function() {
    var player = freshPlayer();
    D.updateFriendship('npc_001', player, 10);
    D.updateFriendship('npc_001', player, 15);
    var level = D.updateFriendship('npc_001', player, 5);
    assert.strictEqual(level, 30);
  });

  test('clamps maximum at 100', function() {
    var player = freshPlayer();
    var level = D.updateFriendship('npc_001', player, 200);
    assert.strictEqual(level, 100);
  });

  test('clamps minimum at 0', function() {
    var player = freshPlayer();
    var level = D.updateFriendship('npc_001', player, -50);
    assert.strictEqual(level, 0);
  });

  test('can decrease friendship', function() {
    var player = freshPlayer();
    D.updateFriendship('npc_001', player, 50);
    var level = D.updateFriendship('npc_001', player, -20);
    assert.strictEqual(level, 30);
  });

  test('different NPCs have independent friendship for same player', function() {
    var player = freshPlayer();
    D.updateFriendship('npc_001', player, 40);
    D.updateFriendship('npc_002', player, 70);
    assert.strictEqual(D._getFriendship('npc_001', player), 40);
    assert.strictEqual(D._getFriendship('npc_002', player), 70);
  });

  test('same NPC has independent friendship for different players', function() {
    var p1 = freshPlayer();
    var p2 = freshPlayer();
    D.updateFriendship('npc_005', p1, 30);
    D.updateFriendship('npc_005', p2, 70);
    assert.strictEqual(D._getFriendship('npc_005', p1), 30);
    assert.strictEqual(D._getFriendship('npc_005', p2), 70);
  });
});

suite('getFriendshipTier', function() {
  test('0 is stranger', function() {
    assert.strictEqual(D.getFriendshipTier(0), 'stranger');
  });
  test('19 is stranger', function() {
    assert.strictEqual(D.getFriendshipTier(19), 'stranger');
  });
  test('20 is acquaintance', function() {
    assert.strictEqual(D.getFriendshipTier(20), 'acquaintance');
  });
  test('49 is acquaintance', function() {
    assert.strictEqual(D.getFriendshipTier(49), 'acquaintance');
  });
  test('50 is friend', function() {
    assert.strictEqual(D.getFriendshipTier(50), 'friend');
  });
  test('79 is friend', function() {
    assert.strictEqual(D.getFriendshipTier(79), 'friend');
  });
  test('80 is confidant', function() {
    assert.strictEqual(D.getFriendshipTier(80), 'confidant');
  });
  test('100 is confidant', function() {
    assert.strictEqual(D.getFriendshipTier(100), 'confidant');
  });
  test('negative value is stranger', function() {
    assert.strictEqual(D.getFriendshipTier(-10), 'stranger');
  });
  test('above 100 is confidant', function() {
    assert.strictEqual(D.getFriendshipTier(150), 'confidant');
  });
});

// =============================================================================
// SUITE: NPC MOOD
// =============================================================================

suite('getNPCMood', function() {
  var validMoods = ['happy', 'neutral', 'busy', 'thoughtful'];

  test('returns a valid mood for morning', function() {
    var mood = D.getNPCMood('npc_001', 'morning');
    assert.ok(validMoods.indexOf(mood) >= 0, 'Invalid mood: ' + mood);
  });

  test('returns a valid mood for afternoon', function() {
    var mood = D.getNPCMood('npc_001', 'afternoon');
    assert.ok(validMoods.indexOf(mood) >= 0);
  });

  test('returns a valid mood for evening', function() {
    var mood = D.getNPCMood('npc_001', 'evening');
    assert.ok(validMoods.indexOf(mood) >= 0);
  });

  test('returns a valid mood for night', function() {
    var mood = D.getNPCMood('npc_001', 'night');
    assert.ok(validMoods.indexOf(mood) >= 0);
  });

  test('unknown NPC returns neutral', function() {
    var mood = D.getNPCMood('npc_999', 'morning');
    assert.strictEqual(mood, 'neutral');
  });

  test('invalid timeOfDay falls back gracefully', function() {
    var mood = D.getNPCMood('npc_001', 'lunchtime');
    assert.ok(validMoods.indexOf(mood) >= 0);
  });

  test('philosopher is thoughtful in morning', function() {
    // npc with philosopher archetype - find one
    var npcs = D._generateNPCs().filter(function(n) { return n.archetype === 'philosopher'; });
    assert.ok(npcs.length > 0, 'no philosopher NPC found');
    var mood = D.getNPCMood(npcs[0].id, 'morning');
    assert.strictEqual(mood, 'thoughtful');
  });

  test('musician is happy in evening', function() {
    var npcs = D._generateNPCs().filter(function(n) { return n.archetype === 'musician'; });
    assert.ok(npcs.length > 0);
    var mood = D.getNPCMood(npcs[0].id, 'evening');
    assert.strictEqual(mood, 'happy');
  });

  test('gardener is happy in morning', function() {
    var npcs = D._generateNPCs().filter(function(n) { return n.archetype === 'gardener'; });
    assert.ok(npcs.length > 0);
    var mood = D.getNPCMood(npcs[0].id, 'morning');
    assert.strictEqual(mood, 'happy');
  });
});

// =============================================================================
// SUITE: DIALOGUE (talkToNPC)
// =============================================================================

suite('talkToNPC', function() {
  test('returns dialogue object with speaker, text, options', function() {
    var player = freshPlayer();
    var result = D.talkToNPC('npc_001', player);
    assert.ok(result.speaker);
    assert.ok(result.text);
    assert.ok(Array.isArray(result.options));
  });

  test('speaker matches NPC name', function() {
    var player = freshPlayer();
    var npc = D.getNPCById('npc_001');
    var result = D.talkToNPC('npc_001', player);
    assert.strictEqual(result.speaker, npc.name);
  });

  test('options contain Talk, Shop, Quest, Goodbye', function() {
    var player = freshPlayer();
    var result = D.talkToNPC('npc_001', player);
    var actions = result.options.map(function(o) { return o.action; });
    assert.ok(actions.indexOf('gossip') >= 0);
    assert.ok(actions.indexOf('shop') >= 0);
    assert.ok(actions.indexOf('quest') >= 0);
    assert.ok(actions.indexOf('farewell') >= 0);
  });

  test('first visit includes archetype greeting', function() {
    var player = freshPlayer();
    var npc = D.getNPCById('npc_001');
    var archGreeting = D.ARCHETYPES[npc.archetype].greeting;
    var result = D.talkToNPC('npc_001', player);
    assert.ok(result.text.indexOf(archGreeting) >= 0, 'First visit should include archetype greeting');
  });

  test('unknown NPC returns system message', function() {
    var player = freshPlayer();
    var result = D.talkToNPC('npc_999', player);
    assert.strictEqual(result.speaker, 'System');
    assert.deepStrictEqual(result.options, []);
  });

  test('friendship increases after talking', function() {
    var player = freshPlayer();
    D.talkToNPC('npc_002', player);
    var friendship = D._getFriendship('npc_002', player);
    assert.ok(friendship > 0, 'Friendship should increase after talking');
  });

  test('returns string text', function() {
    var player = freshPlayer();
    var result = D.talkToNPC('npc_001', player);
    assert.strictEqual(typeof result.text, 'string');
    assert.ok(result.text.length > 0);
  });

  test('text differs for stranger vs confidant', function() {
    var p1 = freshPlayer();
    var p2 = freshPlayer();
    // Make p2 a confidant
    D.updateFriendship('npc_003', p2, 90);
    var strangerResult = D.talkToNPC('npc_003', p1);
    var confidantResult = D.talkToNPC('npc_003', p2);
    assert.notStrictEqual(strangerResult.text, confidantResult.text);
  });
});

// =============================================================================
// SUITE: DIALOGUE OPTIONS
// =============================================================================

suite('getDialogueOptions', function() {
  test('returns array for valid NPC', function() {
    var result = D.getDialogueOptions('npc_001', 'player', 'greeting');
    assert.ok(Array.isArray(result));
  });

  test('returns empty array for unknown NPC', function() {
    var result = D.getDialogueOptions('npc_999', 'player', 'greeting');
    assert.deepStrictEqual(result, []);
  });

  test('farewell context returns back option', function() {
    var result = D.getDialogueOptions('npc_001', 'player', 'farewell');
    var actions = result.map(function(o) { return o.action; });
    assert.ok(actions.indexOf('greeting') >= 0);
  });

  test('gossip context includes farewell option', function() {
    var result = D.getDialogueOptions('npc_001', 'player', 'gossip');
    var actions = result.map(function(o) { return o.action; });
    assert.ok(actions.indexOf('farewell') >= 0);
  });

  test('shop context does not include shop option', function() {
    var result = D.getDialogueOptions('npc_001', 'player', 'shop');
    var actions = result.map(function(o) { return o.action; });
    assert.ok(actions.indexOf('shop') < 0);
  });

  test('quest context does not include quest option', function() {
    var result = D.getDialogueOptions('npc_001', 'player', 'quest');
    var actions = result.map(function(o) { return o.action; });
    assert.ok(actions.indexOf('quest') < 0);
  });

  test('each option has label and action', function() {
    var result = D.getDialogueOptions('npc_001', 'player', 'greeting');
    result.forEach(function(opt) {
      assert.ok(typeof opt.label === 'string');
      assert.ok(typeof opt.action === 'string');
    });
  });
});

// =============================================================================
// SUITE: PROCESS DIALOGUE CHOICE
// =============================================================================

suite('processDialogueChoice', function() {
  test('gossip returns text from NPC', function() {
    var player = freshPlayer();
    var result = D.processDialogueChoice('npc_001', player, 'gossip');
    assert.ok(result.text.length > 0);
  });

  test('gossip speaker matches NPC name', function() {
    var npc = D.getNPCById('npc_001');
    var result = D.processDialogueChoice('npc_001', freshPlayer(), 'gossip');
    assert.strictEqual(result.speaker, npc.name);
  });

  test('gossip effect includes friendship delta', function() {
    var player = freshPlayer();
    var result = D.processDialogueChoice('npc_001', player, 'gossip');
    assert.ok(result.effect !== null);
    assert.strictEqual(result.effect.type, 'friendship');
    assert.ok(typeof result.effect.delta === 'number');
  });

  test('farewell returns farewell text', function() {
    var player = freshPlayer();
    var result = D.processDialogueChoice('npc_001', player, 'farewell');
    assert.ok(result.text.length > 0);
    assert.deepStrictEqual(result.options, []);
  });

  test('farewell effect is null', function() {
    var player = freshPlayer();
    var result = D.processDialogueChoice('npc_001', player, 'farewell');
    assert.strictEqual(result.effect, null);
  });

  test('shop choice opens shop effect', function() {
    var player = freshPlayer();
    var result = D.processDialogueChoice('npc_001', player, 'shop');
    assert.ok(result.effect !== null);
    assert.strictEqual(result.effect.type, 'open_shop');
  });

  test('quest choice opens quests effect', function() {
    var player = freshPlayer();
    var result = D.processDialogueChoice('npc_001', player, 'quest');
    assert.ok(result.effect !== null);
    assert.strictEqual(result.effect.type, 'open_quests');
  });

  test('unknown NPC returns error message', function() {
    var result = D.processDialogueChoice('npc_999', 'player', 'gossip');
    assert.ok(result.text.length > 0);
  });

  test('greeting choice re-runs talkToNPC', function() {
    var player = freshPlayer();
    var result = D.processDialogueChoice('npc_001', player, 'greeting');
    assert.ok(Array.isArray(result.options));
    assert.ok(result.options.length > 0);
  });
});

// =============================================================================
// SUITE: SHOP INVENTORY
// =============================================================================

suite('getShopInventory', function() {
  test('returns array of items', function() {
    var items = D.getShopInventory('npc_001');
    assert.ok(Array.isArray(items));
    assert.ok(items.length > 0);
  });

  test('each item has id, name, price, description, stock', function() {
    var items = D.getShopInventory('npc_001');
    items.forEach(function(item) {
      assert.ok(item.id,                 'missing id');
      assert.ok(item.name,               'missing name');
      assert.ok(typeof item.price === 'number', 'price must be number');
      assert.ok(item.description,        'missing description');
      assert.ok(typeof item.stock === 'number', 'stock must be number');
    });
  });

  test('returns 3 items matching archetype shop list', function() {
    // All archetypes have 3 shop items
    D._getAllNPCs().slice(0, 10).forEach(function(npc) {
      var items = D.getShopInventory(npc.id);
      assert.strictEqual(items.length, 3, npc.id + ' should have 3 shop items');
    });
  });

  test('prices are positive integers', function() {
    var items = D.getShopInventory('npc_001');
    items.forEach(function(item) {
      assert.ok(item.price > 0);
      assert.strictEqual(item.price, Math.round(item.price));
    });
  });

  test('merchant prices are lower than philosopher prices for same item category', function() {
    // Find a merchant NPC
    var merchantNPC = D._getAllNPCs().filter(function(n) { return n.archetype === 'merchant'; })[0];
    var philNPC     = D._getAllNPCs().filter(function(n) { return n.archetype === 'philosopher'; })[0];
    // Compare raw multipliers
    assert.ok(
      D.ARCHETYPE_PRICE_MULTIPLIERS['merchant'] < D.ARCHETYPE_PRICE_MULTIPLIERS['philosopher']
    );
  });

  test('returns empty array for unknown NPC', function() {
    var items = D.getShopInventory('npc_999');
    assert.deepStrictEqual(items, []);
  });

  test('stock value is at least 1', function() {
    var items = D.getShopInventory('npc_001');
    items.forEach(function(item) {
      assert.ok(item.stock >= 1);
    });
  });
});

// =============================================================================
// SUITE: BUY FROM NPC
// =============================================================================

suite('buyFromNPC', function() {
  test('succeeds without economy object (no balance check)', function() {
    var player = freshPlayer();
    var npc = D.getNPCById('npc_001');
    var itemId = D.ARCHETYPES[npc.archetype].shop[0];
    var result = D.buyFromNPC('npc_001', itemId, player);
    assert.ok(result.success);
  });

  test('returns success message with item name', function() {
    var player = freshPlayer();
    var npc = D.getNPCById('npc_001');
    var itemId = D.ARCHETYPES[npc.archetype].shop[0];
    var result = D.buyFromNPC('npc_001', itemId, player);
    assert.ok(typeof result.message === 'string');
    assert.ok(result.item !== null);
  });

  test('returns cost that matches shop inventory price', function() {
    var player = freshPlayer();
    var npc = D.getNPCById('npc_001');
    var itemId = D.ARCHETYPES[npc.archetype].shop[0];
    var shopItems = D.getShopInventory('npc_001');
    var expectedPrice = shopItems.find(function(i) { return i.id === itemId; }).price;
    var result = D.buyFromNPC('npc_001', itemId, player);
    assert.strictEqual(result.cost, expectedPrice);
  });

  test('fails for unknown NPC', function() {
    var result = D.buyFromNPC('npc_999', 'seeds', freshPlayer());
    assert.strictEqual(result.success, false);
  });

  test('fails for item not in NPC shop', function() {
    var player = freshPlayer();
    // npc_001 is a gardener; try to buy 'compass' (explorer item)
    var result = D.buyFromNPC('npc_001', 'compass', player);
    assert.strictEqual(result.success, false);
  });

  test('fails when economy balance is insufficient', function() {
    var player = freshPlayer();
    var npc = D.getNPCById('npc_001');
    var itemId = D.ARCHETYPES[npc.archetype].shop[0];
    var mockEconomy = {
      getBalance: function() { return 0; },
      deduct: function() {}
    };
    var result = D.buyFromNPC('npc_001', itemId, player, mockEconomy);
    assert.strictEqual(result.success, false);
  });

  test('succeeds when economy balance is sufficient', function() {
    var player = freshPlayer();
    var npc = D.getNPCById('npc_001');
    var itemId = D.ARCHETYPES[npc.archetype].shop[0];
    var mockEconomy = {
      getBalance: function() { return 9999; },
      deduct: function() {}
    };
    var result = D.buyFromNPC('npc_001', itemId, player, mockEconomy);
    assert.ok(result.success);
  });

  test('increases friendship after purchase', function() {
    var player = freshPlayer();
    var npc = D.getNPCById('npc_001');
    var itemId = D.ARCHETYPES[npc.archetype].shop[0];
    var before = D._getFriendship('npc_001', player);
    D.buyFromNPC('npc_001', itemId, player);
    var after = D._getFriendship('npc_001', player);
    assert.ok(after > before);
  });
});

// =============================================================================
// SUITE: QUESTS
// =============================================================================

suite('getAvailableQuests', function() {
  test('returns array of quest objects', function() {
    var player = freshPlayer();
    var quests = D.getAvailableQuests('npc_001', player);
    assert.ok(Array.isArray(quests));
  });

  test('each quest has questId, title, description, reward, requirements', function() {
    var player = freshPlayer();
    var quests = D.getAvailableQuests('npc_001', player);
    quests.forEach(function(q) {
      assert.ok(q.questId,      'missing questId');
      assert.ok(q.title,        'missing title');
      assert.ok(q.description,  'missing description');
      assert.ok(q.reward,       'missing reward');
      assert.ok(q.requirements, 'missing requirements');
    });
  });

  test('returns up to 2 quests per NPC (matching archetype quests list)', function() {
    var player = freshPlayer();
    var quests = D.getAvailableQuests('npc_001', player);
    assert.ok(quests.length <= 2);
  });

  test('returns empty array for unknown NPC', function() {
    var quests = D.getAvailableQuests('npc_999', freshPlayer());
    assert.deepStrictEqual(quests, []);
  });

  test('rewards have spark amount', function() {
    var player = freshPlayer();
    var quests = D.getAvailableQuests('npc_001', player);
    quests.forEach(function(q) {
      assert.ok(typeof q.reward.spark === 'number');
      assert.ok(q.reward.spark > 0);
    });
  });
});

suite('acceptQuestFromNPC', function() {
  test('successfully accepts a valid quest', function() {
    var player = freshPlayer();
    var npc = D.getNPCById('npc_001');
    var questId = D.ARCHETYPES[npc.archetype].quests[0];
    var result = D.acceptQuestFromNPC('npc_001', questId, player);
    assert.ok(result.success);
    assert.ok(result.quest);
  });

  test('returns quest object on success', function() {
    var player = freshPlayer();
    var npc = D.getNPCById('npc_001');
    var questId = D.ARCHETYPES[npc.archetype].quests[0];
    var result = D.acceptQuestFromNPC('npc_001', questId, player);
    assert.strictEqual(result.quest.questId, questId);
  });

  test('fails for unknown NPC', function() {
    var result = D.acceptQuestFromNPC('npc_999', 'plant_10_seeds', freshPlayer());
    assert.strictEqual(result.success, false);
  });

  test('fails for quest not offered by this NPC', function() {
    var player = freshPlayer();
    // npc_001 is gardener; try healer quest
    var result = D.acceptQuestFromNPC('npc_001', 'heal_5_citizens', player);
    assert.strictEqual(result.success, false);
  });

  test('cannot accept same quest twice', function() {
    var player = freshPlayer();
    var npc = D.getNPCById('npc_001');
    var questId = D.ARCHETYPES[npc.archetype].quests[0];
    D.acceptQuestFromNPC('npc_001', questId, player);
    var second = D.acceptQuestFromNPC('npc_001', questId, player);
    assert.strictEqual(second.success, false);
  });

  test('quest no longer appears in available quests after acceptance', function() {
    var player = freshPlayer();
    var npc = D.getNPCById('npc_001');
    var questId = D.ARCHETYPES[npc.archetype].quests[0];
    D.acceptQuestFromNPC('npc_001', questId, player);
    var available = D.getAvailableQuests('npc_001', player);
    var ids = available.map(function(q) { return q.questId; });
    assert.ok(ids.indexOf(questId) < 0);
  });

  test('increases friendship on quest acceptance', function() {
    var player = freshPlayer();
    var npc = D.getNPCById('npc_001');
    var questId = D.ARCHETYPES[npc.archetype].quests[1];
    var before = D._getFriendship('npc_001', player);
    D.acceptQuestFromNPC('npc_001', questId, player);
    var after = D._getFriendship('npc_001', player);
    assert.ok(after > before);
  });
});

// =============================================================================
// SUITE: SEARCH NPCS
// =============================================================================

suite('searchNPCs', function() {
  test('returns array', function() {
    var result = D.searchNPCs('Aelara');
    assert.ok(Array.isArray(result));
  });

  test('finds NPC by exact name', function() {
    var result = D.searchNPCs('Aelara');
    assert.ok(result.some(function(n) { return n.name === 'Aelara'; }));
  });

  test('finds NPC by partial name (case insensitive)', function() {
    var result = D.searchNPCs('aelara');
    assert.ok(result.some(function(n) { return n.name === 'Aelara'; }));
  });

  test('finds NPCs by zone name', function() {
    var result = D.searchNPCs('nexus');
    assert.ok(result.length > 0);
    result.forEach(function(n) {
      assert.strictEqual(n.zone, 'nexus');
    });
  });

  test('finds NPCs by archetype role', function() {
    var result = D.searchNPCs('gardener');
    assert.ok(result.length > 0);
    result.forEach(function(n) {
      assert.strictEqual(n.archetype, 'gardener');
    });
  });

  test('finds NPCs by role display name', function() {
    var result = D.searchNPCs('Merchant');
    assert.ok(result.length > 0);
    result.forEach(function(n) {
      assert.strictEqual(n.archetype, 'merchant');
    });
  });

  test('returns empty array for no match', function() {
    var result = D.searchNPCs('zzznomatchxxx');
    assert.deepStrictEqual(result, []);
  });

  test('returns empty array for empty string', function() {
    var result = D.searchNPCs('');
    assert.deepStrictEqual(result, []);
  });

  test('returns empty array for null', function() {
    var result = D.searchNPCs(null);
    assert.deepStrictEqual(result, []);
  });

  test('returns empty array for non-string', function() {
    var result = D.searchNPCs(42);
    assert.deepStrictEqual(result, []);
  });
});

// =============================================================================
// SUITE: FORMAT NPC CARD
// =============================================================================

suite('formatNPCCard', function() {
  test('returns a string', function() {
    var npc = D.getNPCById('npc_001');
    var html = D.formatNPCCard(npc, 0);
    assert.strictEqual(typeof html, 'string');
    assert.ok(html.length > 0);
  });

  test('contains npc name', function() {
    var npc = D.getNPCById('npc_001');
    var html = D.formatNPCCard(npc, 0);
    assert.ok(html.indexOf(npc.name) >= 0);
  });

  test('contains role', function() {
    var npc = D.getNPCById('npc_001');
    var archData = D.ARCHETYPES[npc.archetype];
    var html = D.formatNPCCard(npc, 0);
    assert.ok(html.indexOf(archData.role) >= 0);
  });

  test('contains zone', function() {
    var npc = D.getNPCById('npc_001');
    var html = D.formatNPCCard(npc, 0);
    assert.ok(html.indexOf(npc.zone) >= 0);
  });

  test('contains friendship bar', function() {
    var npc = D.getNPCById('npc_001');
    var html = D.formatNPCCard(npc, 40);
    assert.ok(html.indexOf('40%') >= 0);
  });

  test('contains [>] Talk button', function() {
    var npc = D.getNPCById('npc_001');
    var html = D.formatNPCCard(npc, 0);
    assert.ok(html.indexOf('[>] Talk') >= 0);
  });

  test('contains [$] Shop button', function() {
    var npc = D.getNPCById('npc_001');
    var html = D.formatNPCCard(npc, 0);
    assert.ok(html.indexOf('[$] Shop') >= 0);
  });

  test('contains [!] Quest button', function() {
    var npc = D.getNPCById('npc_001');
    var html = D.formatNPCCard(npc, 0);
    assert.ok(html.indexOf('[!] Quest') >= 0);
  });

  test('contains mood indicator', function() {
    var npc = D.getNPCById('npc_001');
    var html = D.formatNPCCard(npc, 0);
    assert.ok(html.indexOf('[~]') >= 0);
  });

  test('contains friendship tier label', function() {
    var npc = D.getNPCById('npc_001');
    var html = D.formatNPCCard(npc, 0);
    assert.ok(html.indexOf('stranger') >= 0);
  });

  test('shows confidant at friendship 80', function() {
    var npc = D.getNPCById('npc_001');
    var html = D.formatNPCCard(npc, 80);
    assert.ok(html.indexOf('confidant') >= 0);
  });

  test('handles null npc gracefully', function() {
    var html = D.formatNPCCard(null, 0);
    assert.strictEqual(typeof html, 'string');
    assert.ok(html.length > 0);
  });
});

// =============================================================================
// SUITE: FRIENDSHIP BAR
// =============================================================================

suite('_friendshipBar', function() {
  test('0% has 10 dashes', function() {
    var bar = D._friendshipBar(0);
    assert.ok(bar.indexOf('----------') >= 0);
    assert.ok(bar.indexOf('0%') >= 0);
  });

  test('100% has 10 hashes', function() {
    var bar = D._friendshipBar(100);
    assert.ok(bar.indexOf('##########') >= 0);
    assert.ok(bar.indexOf('100%') >= 0);
  });

  test('50% has 5 hashes and 5 dashes', function() {
    var bar = D._friendshipBar(50);
    assert.ok(bar.indexOf('#####-----') >= 0);
    assert.ok(bar.indexOf('50%') >= 0);
  });

  test('format starts with [ and ends with ]', function() {
    var bar = D._friendshipBar(30);
    assert.ok(bar[0] === '[');
    // find the closing ]
    assert.ok(bar.indexOf(']') > 0);
  });

  test('clamped below 0', function() {
    var bar = D._friendshipBar(-50);
    assert.ok(bar.indexOf('0%') >= 0);
  });

  test('clamped above 100', function() {
    var bar = D._friendshipBar(150);
    assert.ok(bar.indexOf('100%') >= 0);
  });
});

// =============================================================================
// SUITE: ZONES LIST
// =============================================================================

suite('ZONES constant', function() {
  test('has 8 zones', function() {
    assert.strictEqual(D.ZONES.length, 8);
  });

  test('contains nexus', function() {
    assert.ok(D.ZONES.indexOf('nexus') >= 0);
  });

  test('contains all expected zones', function() {
    var expected = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];
    expected.forEach(function(z) {
      assert.ok(D.ZONES.indexOf(z) >= 0, 'Missing zone: ' + z);
    });
  });
});

// =============================================================================
// SUITE: ITEM CATALOG
// =============================================================================

suite('ITEM_CATALOG completeness', function() {
  test('has at least 30 items (3 per archetype)', function() {
    assert.ok(Object.keys(D.ITEM_CATALOG).length >= 30);
  });

  test('each item has name, basePrice, description', function() {
    Object.keys(D.ITEM_CATALOG).forEach(function(itemId) {
      var item = D.ITEM_CATALOG[itemId];
      assert.ok(item.name,                        itemId + ' missing name');
      assert.ok(typeof item.basePrice === 'number', itemId + ' basePrice must be number');
      assert.ok(item.basePrice > 0,               itemId + ' basePrice must be > 0');
      assert.ok(item.description,                  itemId + ' missing description');
    });
  });
});

// =============================================================================
// SUITE: QUEST CATALOG
// =============================================================================

suite('QUEST_CATALOG completeness', function() {
  test('has at least 20 quests (2 per archetype)', function() {
    assert.ok(Object.keys(D.QUEST_CATALOG).length >= 20);
  });

  test('each quest has required fields', function() {
    Object.keys(D.QUEST_CATALOG).forEach(function(questId) {
      var q = D.QUEST_CATALOG[questId];
      assert.ok(q.questId,      questId + ' missing questId');
      assert.ok(q.title,        questId + ' missing title');
      assert.ok(q.description,  questId + ' missing description');
      assert.ok(q.reward,       questId + ' missing reward');
      assert.ok(q.requirements, questId + ' missing requirements');
    });
  });

  test('all quests have positive spark reward', function() {
    Object.keys(D.QUEST_CATALOG).forEach(function(questId) {
      var q = D.QUEST_CATALOG[questId];
      assert.ok(typeof q.reward.spark === 'number' && q.reward.spark > 0);
    });
  });
});

// =============================================================================
// SUITE: createNPCPanel (non-DOM environment)
// =============================================================================

suite('createNPCPanel (Node environment guard)', function() {
  test('returns an object when no DOM', function() {
    var result = D.createNPCPanel();
    assert.ok(result !== null);
    assert.strictEqual(typeof result, 'object');
  });

  test('returned object has type npc-panel', function() {
    var result = D.createNPCPanel();
    assert.strictEqual(result.type, 'npc-panel');
  });

  test('returned object has rendered false', function() {
    var result = D.createNPCPanel();
    assert.strictEqual(result.rendered, false);
  });
});

// =============================================================================
// REPORT
// =============================================================================

var ok = report();
process.exit(ok ? 0 : 1);
