// test_npc_memory.js — Tests for NpcMemory module
'use strict';

var testRunner = require('./test_runner');
var test = testRunner.test;
var suite = testRunner.suite;
var report = testRunner.report;
var assert = testRunner.assert;

var NpcMemory = require('../src/js/npc_memory');

// ============================================================================
// HELPERS
// ============================================================================

function freshState() {
  NpcMemory.resetAll();
}

// ============================================================================
// CONSTANTS TESTS
// ============================================================================

suite('RELATIONSHIP_TIERS', function() {

  test('exists and has all five tiers', function() {
    var tiers = NpcMemory.RELATIONSHIP_TIERS;
    assert.ok(tiers, 'RELATIONSHIP_TIERS should exist');
    assert.ok(tiers.stranger,     'Should have stranger tier');
    assert.ok(tiers.acquaintance, 'Should have acquaintance tier');
    assert.ok(tiers.friend,       'Should have friend tier');
    assert.ok(tiers.close_friend, 'Should have close_friend tier');
    assert.ok(tiers.best_friend,  'Should have best_friend tier');
  });

  test('stranger tier starts at min 0', function() {
    assert.strictEqual(NpcMemory.RELATIONSHIP_TIERS.stranger.min, 0);
  });

  test('acquaintance tier threshold is 10', function() {
    assert.strictEqual(NpcMemory.RELATIONSHIP_TIERS.acquaintance.min, 10);
  });

  test('friend tier threshold is 30', function() {
    assert.strictEqual(NpcMemory.RELATIONSHIP_TIERS.friend.min, 30);
  });

  test('close_friend tier threshold is 60', function() {
    assert.strictEqual(NpcMemory.RELATIONSHIP_TIERS.close_friend.min, 60);
  });

  test('best_friend tier threshold is 100', function() {
    assert.strictEqual(NpcMemory.RELATIONSHIP_TIERS.best_friend.min, 100);
  });

  test('each tier has a label string', function() {
    var tiers = NpcMemory.RELATIONSHIP_TIERS;
    Object.keys(tiers).forEach(function(key) {
      assert.ok(typeof tiers[key].label === 'string', 'Tier ' + key + ' should have label');
    });
  });

  test('each tier has a color string', function() {
    var tiers = NpcMemory.RELATIONSHIP_TIERS;
    Object.keys(tiers).forEach(function(key) {
      assert.ok(typeof tiers[key].color === 'string', 'Tier ' + key + ' should have color');
    });
  });
});

suite('OPINION_TYPES', function() {

  test('has likes, dislikes, neutral', function() {
    var ot = NpcMemory.OPINION_TYPES;
    assert.strictEqual(ot.likes,    'likes');
    assert.strictEqual(ot.dislikes, 'dislikes');
    assert.strictEqual(ot.neutral,  'neutral');
  });
});

suite('DECAY_RATE and memory limits', function() {

  test('DECAY_RATE is a positive number', function() {
    assert.ok(NpcMemory.DECAY_RATE > 0, 'DECAY_RATE should be positive');
  });

  test('MAX_GIFT_MEMORY is 50', function() {
    assert.strictEqual(NpcMemory.MAX_GIFT_MEMORY, 50);
  });

  test('INTERACTION_MEMORY_LIMIT is 100', function() {
    assert.strictEqual(NpcMemory.INTERACTION_MEMORY_LIMIT, 100);
  });
});

// ============================================================================
// initRelationship / getRelationship TESTS
// ============================================================================

suite('initRelationship', function() {

  test('creates relationship with friendship 0', function() {
    freshState();
    var rel = NpcMemory.initRelationship('player1', 'npc1');
    assert.strictEqual(rel.friendship, 0);
  });

  test('creates relationship with stranger tier', function() {
    freshState();
    var rel = NpcMemory.initRelationship('player1', 'npc1');
    assert.strictEqual(rel.tier, 'stranger');
  });

  test('does not reset existing relationship', function() {
    freshState();
    NpcMemory.initRelationship('player1', 'npc1');
    NpcMemory.adjustFriendship('player1', 'npc1', 15, 'test');
    NpcMemory.initRelationship('player1', 'npc1'); // second call
    var rel = NpcMemory.getRelationship('player1', 'npc1');
    assert.strictEqual(rel.friendship, 15, 'Second init should not reset friendship');
  });

  test('returns relationship object', function() {
    freshState();
    var rel = NpcMemory.initRelationship('player1', 'npc2');
    assert.ok(rel && typeof rel === 'object');
  });

  test('separate players have separate relationships', function() {
    freshState();
    NpcMemory.adjustFriendship('playerA', 'npc1', 20, 'test');
    NpcMemory.initRelationship('playerB', 'npc1');
    var relB = NpcMemory.getRelationship('playerB', 'npc1');
    assert.strictEqual(relB.friendship, 0);
  });
});

suite('getRelationship', function() {

  test('auto-initializes missing relationship', function() {
    freshState();
    var rel = NpcMemory.getRelationship('newPlayer', 'newNpc');
    assert.ok(rel, 'Should auto-init');
    assert.strictEqual(rel.friendship, 0);
  });

  test('returns stored friendship value', function() {
    freshState();
    NpcMemory.adjustFriendship('p1', 'n1', 25, 'chat');
    var rel = NpcMemory.getRelationship('p1', 'n1');
    assert.strictEqual(rel.friendship, 25);
  });

  test('has lastVisitDay field', function() {
    freshState();
    var rel = NpcMemory.getRelationship('p1', 'n1');
    assert.ok(typeof rel.lastVisitDay === 'number');
  });
});

// ============================================================================
// adjustFriendship TESTS
// ============================================================================

suite('adjustFriendship', function() {

  test('increases friendship by given amount', function() {
    freshState();
    NpcMemory.adjustFriendship('p1', 'npc1', 10, 'chat');
    var rel = NpcMemory.getRelationship('p1', 'npc1');
    assert.strictEqual(rel.friendship, 10);
  });

  test('decreases friendship by given amount', function() {
    freshState();
    NpcMemory.adjustFriendship('p1', 'npc1', 30, 'chat');
    NpcMemory.adjustFriendship('p1', 'npc1', -10, 'argument');
    var rel = NpcMemory.getRelationship('p1', 'npc1');
    assert.strictEqual(rel.friendship, 20);
  });

  test('does not go below 0', function() {
    freshState();
    NpcMemory.adjustFriendship('p1', 'npc1', -999, 'test');
    var rel = NpcMemory.getRelationship('p1', 'npc1');
    assert.strictEqual(rel.friendship, 0);
  });

  test('does not exceed 100', function() {
    freshState();
    NpcMemory.adjustFriendship('p1', 'npc1', 999, 'test');
    var rel = NpcMemory.getRelationship('p1', 'npc1');
    assert.strictEqual(rel.friendship, 100);
  });

  test('returns old and new friendship values', function() {
    freshState();
    var result = NpcMemory.adjustFriendship('p1', 'npc1', 15, 'wave');
    assert.strictEqual(result.oldFriendship, 0);
    assert.strictEqual(result.newFriendship, 15);
  });

  test('returns old and new tier', function() {
    freshState();
    var result = NpcMemory.adjustFriendship('p1', 'npc1', 15, 'wave');
    assert.strictEqual(result.oldTier, 'stranger');
    assert.strictEqual(result.newTier, 'acquaintance');
  });

  test('reports tierChanged correctly when tier changes', function() {
    freshState();
    var result = NpcMemory.adjustFriendship('p1', 'npc1', 10, 'test');
    assert.strictEqual(result.tierChanged, true);
  });

  test('reports tierChanged false when tier does not change', function() {
    freshState();
    NpcMemory.adjustFriendship('p1', 'npc1', 5, 'small');
    var result = NpcMemory.adjustFriendship('p1', 'npc1', 2, 'small');
    assert.strictEqual(result.tierChanged, false);
  });

  test('stores the reason', function() {
    freshState();
    var result = NpcMemory.adjustFriendship('p1', 'npc1', 5, 'gift_flowers');
    assert.strictEqual(result.reason, 'gift_flowers');
  });
});

// ============================================================================
// getTier TESTS
// ============================================================================

suite('getTier', function() {

  test('returns stranger at 0', function() {
    freshState();
    assert.strictEqual(NpcMemory.getTier('p1', 'n1'), 'stranger');
  });

  test('returns acquaintance at 10', function() {
    freshState();
    NpcMemory.adjustFriendship('p1', 'n1', 10, 't');
    assert.strictEqual(NpcMemory.getTier('p1', 'n1'), 'acquaintance');
  });

  test('returns friend at 30', function() {
    freshState();
    NpcMemory.adjustFriendship('p1', 'n1', 30, 't');
    assert.strictEqual(NpcMemory.getTier('p1', 'n1'), 'friend');
  });

  test('returns close_friend at 60', function() {
    freshState();
    NpcMemory.adjustFriendship('p1', 'n1', 60, 't');
    assert.strictEqual(NpcMemory.getTier('p1', 'n1'), 'close_friend');
  });

  test('returns best_friend at 100', function() {
    freshState();
    NpcMemory.adjustFriendship('p1', 'n1', 100, 't');
    assert.strictEqual(NpcMemory.getTier('p1', 'n1'), 'best_friend');
  });

  test('returns acquaintance at 29', function() {
    freshState();
    NpcMemory.adjustFriendship('p1', 'n1', 29, 't');
    assert.strictEqual(NpcMemory.getTier('p1', 'n1'), 'acquaintance');
  });

  test('returns friend at 59', function() {
    freshState();
    NpcMemory.adjustFriendship('p1', 'n1', 59, 't');
    assert.strictEqual(NpcMemory.getTier('p1', 'n1'), 'friend');
  });
});

// ============================================================================
// addGiftMemory / getGiftHistory TESTS
// ============================================================================

suite('addGiftMemory', function() {

  test('returns a reaction string', function() {
    freshState();
    var result = NpcMemory.addGiftMemory('p1', 'gardener_001', 'seeds', 'gardener');
    assert.ok(['love', 'like', 'neutral', 'dislike'].indexOf(result.reaction) !== -1);
  });

  test('seeds are loved by gardener', function() {
    freshState();
    var result = NpcMemory.addGiftMemory('p1', 'gardener_001', 'seeds', 'gardener');
    assert.strictEqual(result.reaction, 'love');
  });

  test('flowers are liked by gardener', function() {
    freshState();
    var result = NpcMemory.addGiftMemory('p1', 'gardener_001', 'flowers', 'gardener');
    assert.ok(result.reaction === 'love' || result.reaction === 'like',
      'flowers should be love or like for gardener');
  });

  test('axe is disliked by gardener', function() {
    freshState();
    var result = NpcMemory.addGiftMemory('p1', 'gardener_001', 'axe', 'gardener');
    assert.strictEqual(result.reaction, 'dislike');
  });

  test('friendshipDelta is positive for liked items', function() {
    freshState();
    var result = NpcMemory.addGiftMemory('p1', 'gardener_001', 'seeds', 'gardener');
    assert.ok(result.friendshipDelta > 0);
  });

  test('friendshipDelta is negative for disliked items', function() {
    freshState();
    var result = NpcMemory.addGiftMemory('p1', 'gardener_001', 'axe', 'gardener');
    assert.ok(result.friendshipDelta < 0);
  });

  test('gift is stored in gift history', function() {
    freshState();
    NpcMemory.addGiftMemory('p1', 'gardener_001', 'seeds', 'gardener');
    var history = NpcMemory.getGiftHistory('p1', 'gardener_001');
    assert.strictEqual(history.length, 1);
    assert.strictEqual(history[0].itemId, 'seeds');
  });

  test('multiple gifts are all stored', function() {
    freshState();
    NpcMemory.addGiftMemory('p1', 'gardener_001', 'seeds', 'gardener');
    NpcMemory.addGiftMemory('p1', 'gardener_001', 'flowers', 'gardener');
    NpcMemory.addGiftMemory('p1', 'gardener_001', 'herbs', 'gardener');
    var history = NpcMemory.getGiftHistory('p1', 'gardener_001');
    assert.strictEqual(history.length, 3);
  });

  test('book is loved by storyteller', function() {
    freshState();
    var result = NpcMemory.addGiftMemory('p1', 'storyteller_001', 'book', 'storyteller');
    assert.strictEqual(result.reaction, 'love');
  });

  test('instrument is loved by musician', function() {
    freshState();
    var result = NpcMemory.addGiftMemory('p1', 'musician_001', 'instrument', 'musician');
    assert.strictEqual(result.reaction, 'love');
  });

  test('gem is loved by merchant', function() {
    freshState();
    var result = NpcMemory.addGiftMemory('p1', 'merchant_001', 'gem', 'merchant');
    assert.strictEqual(result.reaction, 'love');
  });

  test('map is loved by explorer', function() {
    freshState();
    var result = NpcMemory.addGiftMemory('p1', 'explorer_001', 'map', 'explorer');
    assert.strictEqual(result.reaction, 'love');
  });

  test('herbs are loved by healer', function() {
    freshState();
    var result = NpcMemory.addGiftMemory('p1', 'healer_001', 'herbs', 'healer');
    assert.strictEqual(result.reaction, 'love');
  });

  test('gift memory trim stays under MAX_GIFT_MEMORY', function() {
    freshState();
    for (var i = 0; i < 60; i++) {
      NpcMemory.addGiftMemory('p1', 'npc1', 'coin', 'merchant');
    }
    var history = NpcMemory.getGiftHistory('p1', 'npc1');
    assert.ok(history.length <= NpcMemory.MAX_GIFT_MEMORY,
      'Gift history should not exceed MAX_GIFT_MEMORY');
  });

  test('gift adjusts actual friendship', function() {
    freshState();
    NpcMemory.addGiftMemory('p1', 'gardener_001', 'seeds', 'gardener');
    var rel = NpcMemory.getRelationship('p1', 'gardener_001');
    assert.ok(rel.friendship > 0, 'Friendship should increase from loved gift');
  });
});

suite('getGiftHistory', function() {

  test('returns empty array when no gifts given', function() {
    freshState();
    var history = NpcMemory.getGiftHistory('p1', 'npc1');
    assert.ok(Array.isArray(history));
    assert.strictEqual(history.length, 0);
  });

  test('each gift record has itemId, day, reaction, friendshipChange', function() {
    freshState();
    NpcMemory.addGiftMemory('p1', 'gardener_001', 'seeds', 'gardener');
    var history = NpcMemory.getGiftHistory('p1', 'gardener_001');
    var gift = history[0];
    assert.ok(gift.itemId     !== undefined);
    assert.ok(gift.day        !== undefined);
    assert.ok(gift.reaction   !== undefined);
    assert.ok(gift.friendshipChange !== undefined);
  });

  test('returns a copy, not a reference', function() {
    freshState();
    NpcMemory.addGiftMemory('p1', 'npc1', 'coin', 'merchant');
    var h1 = NpcMemory.getGiftHistory('p1', 'npc1');
    h1.push({ fake: true });
    var h2 = NpcMemory.getGiftHistory('p1', 'npc1');
    assert.strictEqual(h2.length, 1, 'Original should be unmodified');
  });
});

// ============================================================================
// getGiftReaction TESTS
// ============================================================================

suite('getGiftReaction', function() {

  test('returns neutral for unknown archetype', function() {
    var reaction = NpcMemory.getGiftReaction('unknown_npc', 'seeds');
    assert.strictEqual(reaction, 'neutral');
  });

  test('returns neutral for unknown item', function() {
    var reaction = NpcMemory.getGiftReaction('gardener_001', 'unicorn_dust', 'gardener');
    assert.strictEqual(reaction, 'neutral');
  });

  test('extracts archetype from npcId', function() {
    var reaction = NpcMemory.getGiftReaction('gardener_001', 'seeds');
    assert.ok(['love', 'like'].indexOf(reaction) !== -1,
      'Should extract gardener from id and give love/like for seeds');
  });

  test('returns dislike for axe given to gardener', function() {
    var reaction = NpcMemory.getGiftReaction('gardener_007', 'axe');
    assert.strictEqual(reaction, 'dislike');
  });

  test('archetype param overrides id detection', function() {
    var reaction = NpcMemory.getGiftReaction('npc_001', 'blueprint', 'builder');
    assert.ok(['love', 'like'].indexOf(reaction) !== -1);
  });
});

// ============================================================================
// addInteractionMemory / getInteractionHistory TESTS
// ============================================================================

suite('addInteractionMemory', function() {

  test('returns a memory record', function() {
    freshState();
    var mem = NpcMemory.addInteractionMemory('p1', 'npc1', 'greeting', {});
    assert.ok(mem && typeof mem === 'object');
  });

  test('memory has type, day, timestamp, friendshipDelta', function() {
    freshState();
    var mem = NpcMemory.addInteractionMemory('p1', 'npc1', 'conversation', { topic: 'weather' });
    assert.ok(mem.type      !== undefined);
    assert.ok(mem.day       !== undefined);
    assert.ok(mem.timestamp !== undefined);
    assert.ok(mem.friendshipDelta !== undefined);
  });

  test('greeting gives positive friendship delta', function() {
    freshState();
    var mem = NpcMemory.addInteractionMemory('p1', 'npc1', 'greeting');
    assert.ok(mem.friendshipDelta > 0);
  });

  test('rude interaction gives negative friendship delta', function() {
    freshState();
    NpcMemory.adjustFriendship('p1', 'npc1', 20, 'setup');
    var mem = NpcMemory.addInteractionMemory('p1', 'npc1', 'rude');
    assert.ok(mem.friendshipDelta < 0);
  });

  test('quest_complete gives higher delta than greeting', function() {
    freshState();
    var greeting = NpcMemory.addInteractionMemory('p1', 'npc1', 'greeting');
    var quest = NpcMemory.addInteractionMemory('p1', 'npc2', 'quest_complete');
    assert.ok(quest.friendshipDelta > greeting.friendshipDelta);
  });

  test('interaction is stored in history', function() {
    freshState();
    NpcMemory.addInteractionMemory('p1', 'npc1', 'trade', { item: 'seeds' });
    var history = NpcMemory.getInteractionHistory('p1', 'npc1');
    assert.strictEqual(history.length, 1);
  });

  test('history stays under INTERACTION_MEMORY_LIMIT', function() {
    freshState();
    for (var i = 0; i < 120; i++) {
      NpcMemory.addInteractionMemory('p1', 'npc1', 'greeting');
    }
    var history = NpcMemory.getInteractionHistory('p1', 'npc1');
    assert.ok(history.length <= NpcMemory.INTERACTION_MEMORY_LIMIT,
      'Should not exceed INTERACTION_MEMORY_LIMIT');
  });
});

suite('getInteractionHistory', function() {

  test('returns empty array when no interactions', function() {
    freshState();
    var history = NpcMemory.getInteractionHistory('p1', 'npc1');
    assert.ok(Array.isArray(history));
    assert.strictEqual(history.length, 0);
  });

  test('respects limit parameter', function() {
    freshState();
    for (var i = 0; i < 10; i++) {
      NpcMemory.addInteractionMemory('p1', 'npc1', 'greeting');
    }
    var history = NpcMemory.getInteractionHistory('p1', 'npc1', 3);
    assert.strictEqual(history.length, 3);
  });

  test('returns most recent interactions first', function() {
    freshState();
    NpcMemory.addInteractionMemory('p1', 'npc1', 'greeting', { order: 1 });
    NpcMemory.addInteractionMemory('p1', 'npc1', 'conversation', { order: 2 });
    var history = NpcMemory.getInteractionHistory('p1', 'npc1');
    assert.strictEqual(history[0].type, 'conversation', 'Most recent should be first');
    assert.strictEqual(history[1].type, 'greeting');
  });

  test('details are stored in memory', function() {
    freshState();
    NpcMemory.addInteractionMemory('p1', 'npc1', 'trade', { item: 'sword', price: 50 });
    var history = NpcMemory.getInteractionHistory('p1', 'npc1', 1);
    assert.strictEqual(history[0].details.item, 'sword');
    assert.strictEqual(history[0].details.price, 50);
  });
});

// ============================================================================
// getDialogueModifiers TESTS
// ============================================================================

suite('getDialogueModifiers', function() {

  test('returns an object with tier', function() {
    freshState();
    var mods = NpcMemory.getDialogueModifiers('p1', 'npc1');
    assert.ok(mods && typeof mods === 'object');
    assert.ok(mods.tier);
  });

  test('stranger has zero trade discount', function() {
    freshState();
    var mods = NpcMemory.getDialogueModifiers('p1', 'npc1');
    assert.strictEqual(mods.tradeDiscount, 0);
  });

  test('friend has positive trade discount', function() {
    freshState();
    NpcMemory.adjustFriendship('p1', 'npc1', 30, 't');
    var mods = NpcMemory.getDialogueModifiers('p1', 'npc1');
    assert.ok(mods.tradeDiscount > 0);
  });

  test('stranger cannot ask favors', function() {
    freshState();
    var mods = NpcMemory.getDialogueModifiers('p1', 'npc1');
    assert.strictEqual(mods.canAskFavors, false);
  });

  test('friend can ask favors', function() {
    freshState();
    NpcMemory.adjustFriendship('p1', 'npc1', 30, 't');
    var mods = NpcMemory.getDialogueModifiers('p1', 'npc1');
    assert.strictEqual(mods.canAskFavors, true);
  });

  test('stranger cannot discuss secrets', function() {
    freshState();
    var mods = NpcMemory.getDialogueModifiers('p1', 'npc1');
    assert.strictEqual(mods.canDiscussSecrets, false);
  });

  test('close_friend can discuss secrets', function() {
    freshState();
    NpcMemory.adjustFriendship('p1', 'npc1', 60, 't');
    var mods = NpcMemory.getDialogueModifiers('p1', 'npc1');
    assert.strictEqual(mods.canDiscussSecrets, true);
  });

  test('tone is formal for stranger', function() {
    freshState();
    var mods = NpcMemory.getDialogueModifiers('p1', 'npc1');
    assert.strictEqual(mods.tone, 'formal');
  });

  test('tone is warm for friend', function() {
    freshState();
    NpcMemory.adjustFriendship('p1', 'npc1', 35, 't');
    var mods = NpcMemory.getDialogueModifiers('p1', 'npc1');
    assert.strictEqual(mods.tone, 'warm');
  });

  test('tone is devoted for best_friend', function() {
    freshState();
    NpcMemory.adjustFriendship('p1', 'npc1', 100, 't');
    var mods = NpcMemory.getDialogueModifiers('p1', 'npc1');
    assert.strictEqual(mods.tone, 'devoted');
  });

  test('includes friendship numeric value', function() {
    freshState();
    NpcMemory.adjustFriendship('p1', 'npc1', 45, 't');
    var mods = NpcMemory.getDialogueModifiers('p1', 'npc1');
    assert.strictEqual(mods.friendship, 45);
  });
});

// ============================================================================
// getUnlockedDialogue TESTS
// ============================================================================

suite('getUnlockedDialogue', function() {

  test('returns an array', function() {
    freshState();
    var lines = NpcMemory.getUnlockedDialogue('p1', 'gardener_001', 'gardener');
    assert.ok(Array.isArray(lines));
  });

  test('returns at least one line for stranger', function() {
    freshState();
    var lines = NpcMemory.getUnlockedDialogue('p1', 'gardener_001', 'gardener');
    assert.ok(lines.length > 0);
  });

  test('friend tier has more lines than stranger', function() {
    freshState();
    var strangerLines = NpcMemory.getUnlockedDialogue('p1', 'gardener_001', 'gardener');
    NpcMemory.adjustFriendship('p1', 'gardener_001', 30, 't');
    var friendLines = NpcMemory.getUnlockedDialogue('p1', 'gardener_001', 'gardener');
    assert.ok(friendLines.length >= strangerLines.length);
  });

  test('best_friend has most lines', function() {
    freshState();
    var strangerLines = NpcMemory.getUnlockedDialogue('p1', 'gardener_001', 'gardener');
    NpcMemory.adjustFriendship('p1', 'gardener_001', 100, 't');
    var bestLines = NpcMemory.getUnlockedDialogue('p1', 'gardener_001', 'gardener');
    assert.ok(bestLines.length > strangerLines.length);
  });

  test('all lines are strings', function() {
    freshState();
    NpcMemory.adjustFriendship('p1', 'npc1', 30, 't');
    var lines = NpcMemory.getUnlockedDialogue('p1', 'npc1', 'builder');
    lines.forEach(function(line) {
      assert.ok(typeof line === 'string', 'Each line should be a string');
    });
  });

  test('works for each archetype', function() {
    var archetypes = ['gardener', 'builder', 'storyteller', 'merchant', 'explorer',
                      'teacher', 'musician', 'healer', 'philosopher', 'artist'];
    freshState();
    archetypes.forEach(function(arch) {
      var lines = NpcMemory.getUnlockedDialogue('p1', arch + '_001', arch);
      assert.ok(lines.length > 0, 'Should have lines for archetype: ' + arch);
    });
  });
});

// ============================================================================
// getOpinionOf TESTS
// ============================================================================

suite('getOpinionOf', function() {

  test('gardener likes gardens zone', function() {
    var opinion = NpcMemory.getOpinionOf('gardener_001', 'gardens', 'gardener');
    assert.strictEqual(opinion, 'likes');
  });

  test('gardener dislikes deforestation', function() {
    var opinion = NpcMemory.getOpinionOf('gardener_001', 'deforestation', 'gardener');
    assert.strictEqual(opinion, 'dislikes');
  });

  test('merchant likes trade', function() {
    var opinion = NpcMemory.getOpinionOf('merchant_001', 'trade', 'merchant');
    assert.strictEqual(opinion, 'likes');
  });

  test('merchant dislikes theft', function() {
    var opinion = NpcMemory.getOpinionOf('merchant_001', 'theft', 'merchant');
    assert.strictEqual(opinion, 'dislikes');
  });

  test('musician likes studio', function() {
    var opinion = NpcMemory.getOpinionOf('musician_001', 'studio', 'musician');
    assert.strictEqual(opinion, 'likes');
  });

  test('unknown topic returns neutral', function() {
    var opinion = NpcMemory.getOpinionOf('gardener_001', 'totally_unknown_topic', 'gardener');
    assert.strictEqual(opinion, 'neutral');
  });

  test('unknown archetype returns neutral', function() {
    var opinion = NpcMemory.getOpinionOf('unknown_npc', 'gardens');
    assert.strictEqual(opinion, 'neutral');
  });

  test('returns valid OPINION_TYPE value', function() {
    var validValues = ['likes', 'dislikes', 'neutral'];
    var opinion = NpcMemory.getOpinionOf('explorer_001', 'wilds', 'explorer');
    assert.ok(validValues.indexOf(opinion) !== -1);
  });

  test('extracts archetype from npcId', function() {
    var opinion = NpcMemory.getOpinionOf('philosopher_007', 'wisdom');
    assert.strictEqual(opinion, 'likes');
  });
});

// ============================================================================
// getNPCMood TESTS
// ============================================================================

suite('getNPCMood', function() {

  test('returns neutral for empty interactions', function() {
    var mood = NpcMemory.getNPCMood('npc1', []);
    assert.strictEqual(mood, 'neutral');
  });

  test('returns neutral for null interactions', function() {
    var mood = NpcMemory.getNPCMood('npc1', null);
    assert.strictEqual(mood, 'neutral');
  });

  test('returns joyful for many positive recent interactions', function() {
    var today = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    var interactions = [];
    for (var i = 0; i < 5; i++) {
      interactions.push({ friendshipDelta: 3, day: today });
    }
    var mood = NpcMemory.getNPCMood('npc1', interactions);
    assert.strictEqual(mood, 'joyful');
  });

  test('returns grumpy for many negative recent interactions', function() {
    var today = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    var interactions = [];
    for (var i = 0; i < 3; i++) {
      interactions.push({ friendshipDelta: -4, day: today });
    }
    var mood = NpcMemory.getNPCMood('npc1', interactions);
    assert.ok(mood === 'grumpy' || mood === 'sad');
  });

  test('returns valid mood string', function() {
    var validMoods = ['joyful', 'content', 'neutral', 'grumpy', 'sad'];
    var today = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    var mood = NpcMemory.getNPCMood('npc1', [{ friendshipDelta: 2, day: today }]);
    assert.ok(validMoods.indexOf(mood) !== -1);
  });

  test('old interactions (more than 1 day ago) are ignored', function() {
    var oldDay = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) - 5;
    var interactions = [{ friendshipDelta: 20, day: oldDay }];
    var mood = NpcMemory.getNPCMood('npc1', interactions);
    assert.strictEqual(mood, 'neutral', 'Old interactions should not affect mood');
  });
});

// ============================================================================
// getClosestFriends TESTS
// ============================================================================

suite('getClosestFriends', function() {

  test('returns empty array when no relationships', function() {
    freshState();
    var friends = NpcMemory.getClosestFriends('newPlayer');
    assert.ok(Array.isArray(friends));
    assert.strictEqual(friends.length, 0);
  });

  test('returns NPCs sorted by friendship descending', function() {
    freshState();
    NpcMemory.adjustFriendship('p1', 'npc1', 10, 't');
    NpcMemory.adjustFriendship('p1', 'npc2', 50, 't');
    NpcMemory.adjustFriendship('p1', 'npc3', 30, 't');
    var friends = NpcMemory.getClosestFriends('p1');
    assert.strictEqual(friends[0].npcId, 'npc2');
    assert.strictEqual(friends[1].npcId, 'npc3');
    assert.strictEqual(friends[2].npcId, 'npc1');
  });

  test('respects limit parameter', function() {
    freshState();
    for (var i = 0; i < 10; i++) {
      NpcMemory.adjustFriendship('p1', 'npc' + i, i * 5, 't');
    }
    var friends = NpcMemory.getClosestFriends('p1', 3);
    assert.strictEqual(friends.length, 3);
  });

  test('each entry has npcId, friendship, tier', function() {
    freshState();
    NpcMemory.adjustFriendship('p1', 'npc1', 35, 't');
    var friends = NpcMemory.getClosestFriends('p1', 1);
    assert.ok(friends[0].npcId     !== undefined);
    assert.ok(friends[0].friendship !== undefined);
    assert.ok(friends[0].tier      !== undefined);
  });

  test('default limit is 5', function() {
    freshState();
    for (var i = 0; i < 10; i++) {
      NpcMemory.adjustFriendship('p1', 'npc' + i, (i + 1) * 5, 't');
    }
    var friends = NpcMemory.getClosestFriends('p1');
    assert.ok(friends.length <= 5);
  });
});

// ============================================================================
// getFriendshipBonuses TESTS
// ============================================================================

suite('getFriendshipBonuses', function() {

  test('returns object for stranger', function() {
    var bonuses = NpcMemory.getFriendshipBonuses('stranger');
    assert.ok(bonuses && typeof bonuses === 'object');
  });

  test('stranger has 0 trade discount', function() {
    var bonuses = NpcMemory.getFriendshipBonuses('stranger');
    assert.strictEqual(bonuses.trade_discount, 0);
  });

  test('best_friend has highest trade discount', function() {
    var stranger = NpcMemory.getFriendshipBonuses('stranger');
    var best = NpcMemory.getFriendshipBonuses('best_friend');
    assert.ok(best.trade_discount > stranger.trade_discount);
  });

  test('friend unlocks quest_hints', function() {
    var bonuses = NpcMemory.getFriendshipBonuses('friend');
    assert.strictEqual(bonuses.quest_hints, true);
  });

  test('stranger does not have quest_hints', function() {
    var bonuses = NpcMemory.getFriendshipBonuses('stranger');
    assert.strictEqual(bonuses.quest_hints, false);
  });

  test('close_friend unlocks crafting_help', function() {
    var bonuses = NpcMemory.getFriendshipBonuses('close_friend');
    assert.strictEqual(bonuses.crafting_help, true);
  });

  test('close_friend unlocks special_inventory', function() {
    var bonuses = NpcMemory.getFriendshipBonuses('close_friend');
    assert.strictEqual(bonuses.special_inventory, true);
  });

  test('best_friend has exclusive_quests', function() {
    var bonuses = NpcMemory.getFriendshipBonuses('best_friend');
    assert.strictEqual(bonuses.exclusive_quests, true);
  });

  test('unknown tier falls back to stranger bonuses', function() {
    var bonuses = NpcMemory.getFriendshipBonuses('nonexistent_tier');
    assert.ok(bonuses && typeof bonuses === 'object');
    assert.strictEqual(bonuses.trade_discount, 0);
  });
});

// ============================================================================
// decayRelationships TESTS
// ============================================================================

suite('decayRelationships', function() {

  test('does not decay within grace period', function() {
    freshState();
    NpcMemory.adjustFriendship('p1', 'npc1', 50, 'init');
    NpcMemory.decayRelationships('p1', 2); // under DECAY_GRACE_DAYS=3
    var rel = NpcMemory.getRelationship('p1', 'npc1');
    assert.strictEqual(rel.friendship, 50, 'Should not decay within grace period');
  });

  test('decays friendship after grace period', function() {
    freshState();
    NpcMemory.adjustFriendship('p1', 'npc1', 50, 'init');
    NpcMemory.decayRelationships('p1', 10); // 10 days >> 3 day grace
    var rel = NpcMemory.getRelationship('p1', 'npc1');
    assert.ok(rel.friendship < 50, 'Friendship should have decayed');
  });

  test('friendship does not go below 0 from decay', function() {
    freshState();
    NpcMemory.adjustFriendship('p1', 'npc1', 5, 'init');
    NpcMemory.decayRelationships('p1', 100);
    var rel = NpcMemory.getRelationship('p1', 'npc1');
    assert.ok(rel.friendship >= 0, 'Friendship should not go below 0');
  });

  test('decay updates tier when it drops', function() {
    freshState();
    NpcMemory.adjustFriendship('p1', 'npc1', 30, 'init');
    NpcMemory.decayRelationships('p1', 50);
    var rel = NpcMemory.getRelationship('p1', 'npc1');
    assert.ok(rel.tier, 'Tier should still be set after decay');
  });

  test('only decays player relationships, not other players', function() {
    freshState();
    NpcMemory.adjustFriendship('p1', 'npc1', 50, 'init');
    NpcMemory.adjustFriendship('p2', 'npc1', 50, 'init');
    NpcMemory.decayRelationships('p1', 20);
    var relP2 = NpcMemory.getRelationship('p2', 'npc1');
    assert.strictEqual(relP2.friendship, 50, 'Other player relationships should not decay');
  });
});

// ============================================================================
// exportPlayerData / importPlayerData TESTS
// ============================================================================

suite('exportPlayerData / importPlayerData', function() {

  test('export returns serializable object', function() {
    freshState();
    NpcMemory.adjustFriendship('p1', 'npc1', 25, 'init');
    var data = NpcMemory.exportPlayerData('p1');
    assert.ok(data && typeof data === 'object');
    assert.ok(data.relationships !== undefined);
    assert.ok(data.giftHistory !== undefined);
    assert.ok(data.interactionHistory !== undefined);
  });

  test('exported data can be JSON serialized', function() {
    freshState();
    NpcMemory.adjustFriendship('p1', 'npc1', 25, 'init');
    var data = NpcMemory.exportPlayerData('p1');
    var json = JSON.stringify(data);
    assert.ok(typeof json === 'string');
  });

  test('import restores relationship', function() {
    freshState();
    NpcMemory.adjustFriendship('p1', 'npc1', 40, 'init');
    NpcMemory.addGiftMemory('p1', 'npc1', 'seeds', 'gardener');
    var data = NpcMemory.exportPlayerData('p1');

    NpcMemory.resetAll();
    NpcMemory.importPlayerData('p1', data);
    var rel = NpcMemory.getRelationship('p1', 'npc1');
    assert.ok(rel.friendship > 0, 'Friendship should be restored after import');
  });

  test('import restores gift history', function() {
    freshState();
    NpcMemory.addGiftMemory('p1', 'gardener_001', 'seeds', 'gardener');
    var data = NpcMemory.exportPlayerData('p1');

    NpcMemory.resetAll();
    NpcMemory.importPlayerData('p1', data);
    var history = NpcMemory.getGiftHistory('p1', 'gardener_001');
    assert.strictEqual(history.length, 1);
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

suite('Integration: full relationship journey', function() {

  test('player reaches best_friend through interactions and gifts', function() {
    freshState();
    // Simulate a progression
    NpcMemory.addInteractionMemory('player1', 'gardener_001', 'greeting');       // +1
    NpcMemory.addInteractionMemory('player1', 'gardener_001', 'conversation');   // +2
    NpcMemory.addGiftMemory('player1', 'gardener_001', 'seeds', 'gardener');     // +20 (love)
    NpcMemory.addInteractionMemory('player1', 'gardener_001', 'quest_complete'); // +5
    NpcMemory.adjustFriendship('player1', 'gardener_001', 40, 'extra');          // +40
    NpcMemory.adjustFriendship('player1', 'gardener_001', 40, 'extra2');         // more

    var tier = NpcMemory.getTier('player1', 'gardener_001');
    assert.ok(
      tier === 'close_friend' || tier === 'best_friend',
      'Should reach at least close_friend. Got: ' + tier
    );
  });

  test('dialogue changes as friendship grows', function() {
    freshState();
    var strangerMods = NpcMemory.getDialogueModifiers('player1', 'npc1');
    NpcMemory.adjustFriendship('player1', 'npc1', 100, 'test');
    var bestFriendMods = NpcMemory.getDialogueModifiers('player1', 'npc1');

    assert.ok(bestFriendMods.tradeDiscount > strangerMods.tradeDiscount);
    assert.ok(bestFriendMods.canAskFavors === true);
    assert.ok(strangerMods.canAskFavors === false);
  });

  test('different players have independent friendship with same NPC', function() {
    freshState();
    NpcMemory.adjustFriendship('alice', 'npc1', 80, 'test');
    NpcMemory.adjustFriendship('bob',   'npc1', 5,  'test');

    assert.strictEqual(NpcMemory.getTier('alice', 'npc1'), 'close_friend');
    assert.strictEqual(NpcMemory.getTier('bob',   'npc1'), 'stranger');
  });

  test('getClosestFriends reflects gift and interaction history', function() {
    freshState();
    NpcMemory.addGiftMemory('p1', 'gardener_001', 'seeds', 'gardener');    // +20
    NpcMemory.addGiftMemory('p1', 'musician_001', 'coin', 'musician');     // +3 neutral
    NpcMemory.addInteractionMemory('p1', 'gardener_001', 'quest_complete'); // +5

    var friends = NpcMemory.getClosestFriends('p1', 2);
    assert.strictEqual(friends[0].npcId, 'gardener_001', 'Gardener should be closer friend');
  });

  test('NPC opinions affect dialogue choices', function() {
    var gardenerLikesGardens = NpcMemory.getOpinionOf('gardener_001', 'gardens', 'gardener');
    var gardenerDislikesAxe  = NpcMemory.getOpinionOf('gardener_001', 'deforestation', 'gardener');

    assert.strictEqual(gardenerLikesGardens, 'likes');
    assert.strictEqual(gardenerDislikesAxe, 'dislikes');
  });
});

// ============================================================================
// ARCHETYPE_PREFERENCES coverage
// ============================================================================

suite('ARCHETYPE_PREFERENCES completeness', function() {

  var archetypes = ['gardener', 'builder', 'storyteller', 'merchant', 'explorer',
                    'teacher', 'musician', 'healer', 'philosopher', 'artist'];

  archetypes.forEach(function(arch) {
    test(arch + ' has items and topics preferences', function() {
      var prefs = NpcMemory.ARCHETYPE_PREFERENCES[arch];
      assert.ok(prefs,              arch + ' should exist in ARCHETYPE_PREFERENCES');
      assert.ok(prefs.items,        arch + ' should have items preferences');
      assert.ok(prefs.topics,       arch + ' should have topics preferences');
      assert.ok(prefs.items.likes,  arch + ' items should have likes');
      assert.ok(prefs.items.dislikes, arch + ' items should have dislikes');
      assert.ok(prefs.topics.likes, arch + ' topics should have likes');
    });
  });
});

// ============================================================================
// REPORT
// ============================================================================

var ok = report();
process.exit(ok ? 0 : 1);
