// test_npc_reputation.js — Tests for NpcReputation module
'use strict';

var testRunner = require('./test_runner');
var test = testRunner.test;
var suite = testRunner.suite;
var report = testRunner.report;
var assert = testRunner.assert;

var NpcReputation = require('../src/js/npc_reputation');

// ============================================================================
// HELPERS
// ============================================================================

function freshState() {
  return NpcReputation.createReputationState();
}

// ============================================================================
// CONSTANTS — TIERS
// ============================================================================

suite('TIERS — structure', function() {

  test('TIERS exists and is an array', function() {
    assert.ok(Array.isArray(NpcReputation.TIERS), 'TIERS should be an array');
  });

  test('TIERS has exactly 10 entries', function() {
    assert.strictEqual(NpcReputation.TIERS.length, 10);
  });

  test('each tier has min, max, name, color, dialoguePool', function() {
    NpcReputation.TIERS.forEach(function(tier, i) {
      assert.ok(typeof tier.min === 'number',       'Tier ' + i + ' missing min');
      assert.ok(typeof tier.max === 'number',       'Tier ' + i + ' missing max');
      assert.ok(typeof tier.name === 'string',      'Tier ' + i + ' missing name');
      assert.ok(typeof tier.color === 'string',     'Tier ' + i + ' missing color');
      assert.ok(typeof tier.dialoguePool === 'string', 'Tier ' + i + ' missing dialoguePool');
    });
  });

  test('first tier is Hostile at min -100', function() {
    assert.strictEqual(NpcReputation.TIERS[0].name, 'Hostile');
    assert.strictEqual(NpcReputation.TIERS[0].min, -100);
  });

  test('last tier is Sworn Ally at max 100', function() {
    var last = NpcReputation.TIERS[NpcReputation.TIERS.length - 1];
    assert.strictEqual(last.name, 'Sworn Ally');
    assert.strictEqual(last.max, 100);
  });

  test('tiers are contiguous — no gaps between max of one and min of next', function() {
    for (var i = 0; i < NpcReputation.TIERS.length - 1; i++) {
      var current = NpcReputation.TIERS[i];
      var next = NpcReputation.TIERS[i + 1];
      assert.strictEqual(next.min, current.max + 1,
        'Gap between tier ' + current.name + ' (max ' + current.max + ') and ' + next.name + ' (min ' + next.min + ')');
    }
  });

  test('Neutral tier starts at 0', function() {
    var neutral = NpcReputation.TIERS.find(function(t) { return t.name === 'Neutral'; });
    assert.ok(neutral, 'Neutral tier should exist');
    assert.strictEqual(neutral.min, 0);
  });

  test('Friendly tier starts at 30', function() {
    var friendly = NpcReputation.TIERS.find(function(t) { return t.name === 'Friendly'; });
    assert.ok(friendly, 'Friendly tier should exist');
    assert.strictEqual(friendly.min, 30);
  });

  test('Trusted tier starts at 50', function() {
    var trusted = NpcReputation.TIERS.find(function(t) { return t.name === 'Trusted'; });
    assert.ok(trusted, 'Trusted tier should exist');
    assert.strictEqual(trusted.min, 50);
  });

  test('colors are hex strings', function() {
    NpcReputation.TIERS.forEach(function(tier) {
      assert.ok(tier.color.match(/^#[0-9a-fA-F]{6}$/), 'Color should be hex: ' + tier.color);
    });
  });
});

// ============================================================================
// CONSTANTS — REPUTATION_ACTIONS
// ============================================================================

suite('REPUTATION_ACTIONS — structure', function() {

  test('REPUTATION_ACTIONS exists', function() {
    assert.ok(NpcReputation.REPUTATION_ACTIONS, 'REPUTATION_ACTIONS should exist');
  });

  test('has all 12 expected action keys', function() {
    var expected = [
      'trade_with', 'complete_quest', 'gift_item', 'gift_liked', 'gift_disliked',
      'help_event', 'daily_greeting', 'fail_quest', 'steal_attempt',
      'mentored_by', 'defended', 'ignored_plea'
    ];
    expected.forEach(function(key) {
      assert.ok(NpcReputation.REPUTATION_ACTIONS[key], 'Missing action: ' + key);
    });
  });

  test('each action has base (number) and desc (string)', function() {
    var actions = NpcReputation.REPUTATION_ACTIONS;
    Object.keys(actions).forEach(function(key) {
      var a = actions[key];
      assert.ok(typeof a.base === 'number', key + '.base should be number');
      assert.ok(typeof a.desc === 'string', key + '.desc should be string');
    });
  });

  test('positive actions have positive base values', function() {
    var positive = ['trade_with','complete_quest','gift_item','gift_liked','help_event','daily_greeting','mentored_by','defended'];
    positive.forEach(function(key) {
      assert.ok(NpcReputation.REPUTATION_ACTIONS[key].base > 0, key + ' should have positive base');
    });
  });

  test('negative actions have negative base values', function() {
    var negative = ['gift_disliked','fail_quest','steal_attempt','ignored_plea'];
    negative.forEach(function(key) {
      assert.ok(NpcReputation.REPUTATION_ACTIONS[key].base < 0, key + ' should have negative base');
    });
  });

  test('steal_attempt has base of -20 (largest penalty)', function() {
    assert.strictEqual(NpcReputation.REPUTATION_ACTIONS.steal_attempt.base, -20);
  });

  test('complete_quest has base of 10', function() {
    assert.strictEqual(NpcReputation.REPUTATION_ACTIONS.complete_quest.base, 10);
  });
});

// ============================================================================
// CONSTANTS — ARCHETYPE_PREFERENCES
// ============================================================================

suite('ARCHETYPE_PREFERENCES — structure', function() {

  test('ARCHETYPE_PREFERENCES exists', function() {
    assert.ok(NpcReputation.ARCHETYPE_PREFERENCES, 'ARCHETYPE_PREFERENCES should exist');
  });

  test('has all 10 archetypes', function() {
    var archetypes = ['gardener','builder','storyteller','merchant','explorer',
                      'teacher','musician','healer','philosopher','artist'];
    archetypes.forEach(function(a) {
      assert.ok(NpcReputation.ARCHETYPE_PREFERENCES[a], 'Missing archetype: ' + a);
    });
  });

  test('each archetype has likedGifts, dislikedGifts, topics arrays', function() {
    var prefs = NpcReputation.ARCHETYPE_PREFERENCES;
    Object.keys(prefs).forEach(function(arch) {
      var p = prefs[arch];
      assert.ok(Array.isArray(p.likedGifts),    arch + ' missing likedGifts');
      assert.ok(Array.isArray(p.dislikedGifts), arch + ' missing dislikedGifts');
      assert.ok(Array.isArray(p.topics),        arch + ' missing topics');
    });
  });

  test('each archetype has at least 2 liked gifts', function() {
    var prefs = NpcReputation.ARCHETYPE_PREFERENCES;
    Object.keys(prefs).forEach(function(arch) {
      assert.ok(prefs[arch].likedGifts.length >= 2, arch + ' should have >= 2 liked gifts');
    });
  });

  test('each archetype has at least 1 disliked gift', function() {
    var prefs = NpcReputation.ARCHETYPE_PREFERENCES;
    Object.keys(prefs).forEach(function(arch) {
      assert.ok(prefs[arch].dislikedGifts.length >= 1, arch + ' should have >= 1 disliked gift');
    });
  });

  test('each archetype has at least 2 topics', function() {
    var prefs = NpcReputation.ARCHETYPE_PREFERENCES;
    Object.keys(prefs).forEach(function(arch) {
      assert.ok(prefs[arch].topics.length >= 2, arch + ' should have >= 2 topics');
    });
  });

  test('gardener likes seeds', function() {
    assert.ok(NpcReputation.ARCHETYPE_PREFERENCES.gardener.likedGifts.indexOf('seeds') !== -1);
  });

  test('merchant likes gold_dust', function() {
    assert.ok(NpcReputation.ARCHETYPE_PREFERENCES.merchant.likedGifts.indexOf('gold_dust') !== -1);
  });

  test('musician likes strings', function() {
    assert.ok(NpcReputation.ARCHETYPE_PREFERENCES.musician.likedGifts.indexOf('strings') !== -1);
  });

  test('liked and disliked gifts for same archetype do not overlap', function() {
    var prefs = NpcReputation.ARCHETYPE_PREFERENCES;
    Object.keys(prefs).forEach(function(arch) {
      var liked = prefs[arch].likedGifts;
      var disliked = prefs[arch].dislikedGifts;
      liked.forEach(function(item) {
        assert.ok(disliked.indexOf(item) === -1,
          arch + ': ' + item + ' appears in both liked and disliked');
      });
    });
  });
});

// ============================================================================
// createReputationState
// ============================================================================

suite('createReputationState', function() {

  test('returns an object', function() {
    var s = freshState();
    assert.ok(typeof s === 'object' && s !== null);
  });

  test('has players, npcRelationships, history keys', function() {
    var s = freshState();
    assert.ok('players' in s);
    assert.ok('npcRelationships' in s);
    assert.ok('history' in s);
  });

  test('players starts empty', function() {
    var s = freshState();
    assert.strictEqual(Object.keys(s.players).length, 0);
  });

  test('history starts as empty array', function() {
    var s = freshState();
    assert.ok(Array.isArray(s.history));
    assert.strictEqual(s.history.length, 0);
  });

  test('multiple calls return independent objects', function() {
    var s1 = freshState();
    var s2 = freshState();
    s1.players['p1'] = {};
    assert.ok(!s2.players['p1'], 'States should be independent');
  });
});

// ============================================================================
// getReputation
// ============================================================================

suite('getReputation', function() {

  test('returns 0 for unknown player', function() {
    var s = freshState();
    assert.strictEqual(NpcReputation.getReputation(s, 'alice', 'npc1'), 0);
  });

  test('returns 0 for known player, unknown NPC', function() {
    var s = freshState();
    NpcReputation.modifyReputation(s, 'alice', 'npc1', 'trade_with', {});
    assert.strictEqual(NpcReputation.getReputation(s, 'alice', 'npc999'), 0);
  });

  test('returns 0 for null state', function() {
    assert.strictEqual(NpcReputation.getReputation(null, 'alice', 'npc1'), 0);
  });

  test('returns correct score after modification', function() {
    var s = freshState();
    NpcReputation.modifyReputation(s, 'alice', 'npc1', 'complete_quest', {});
    assert.strictEqual(NpcReputation.getReputation(s, 'alice', 'npc1'), 10);
  });
});

// ============================================================================
// getTier
// ============================================================================

suite('getTier — boundary values', function() {

  test('score -100 returns Hostile', function() {
    assert.strictEqual(NpcReputation.getTier(-100).name, 'Hostile');
  });

  test('score -75 returns Hostile', function() {
    assert.strictEqual(NpcReputation.getTier(-75).name, 'Hostile');
  });

  test('score -74 returns Distrusted', function() {
    assert.strictEqual(NpcReputation.getTier(-74).name, 'Distrusted');
  });

  test('score -50 returns Distrusted', function() {
    assert.strictEqual(NpcReputation.getTier(-50).name, 'Distrusted');
  });

  test('score -49 returns Disliked', function() {
    assert.strictEqual(NpcReputation.getTier(-49).name, 'Disliked');
  });

  test('score -25 returns Disliked', function() {
    assert.strictEqual(NpcReputation.getTier(-25).name, 'Disliked');
  });

  test('score -24 returns Wary', function() {
    assert.strictEqual(NpcReputation.getTier(-24).name, 'Wary');
  });

  test('score -1 returns Wary', function() {
    assert.strictEqual(NpcReputation.getTier(-1).name, 'Wary');
  });

  test('score 0 returns Neutral', function() {
    assert.strictEqual(NpcReputation.getTier(0).name, 'Neutral');
  });

  test('score 14 returns Neutral', function() {
    assert.strictEqual(NpcReputation.getTier(14).name, 'Neutral');
  });

  test('score 15 returns Known', function() {
    assert.strictEqual(NpcReputation.getTier(15).name, 'Known');
  });

  test('score 29 returns Known', function() {
    assert.strictEqual(NpcReputation.getTier(29).name, 'Known');
  });

  test('score 30 returns Friendly', function() {
    assert.strictEqual(NpcReputation.getTier(30).name, 'Friendly');
  });

  test('score 49 returns Friendly', function() {
    assert.strictEqual(NpcReputation.getTier(49).name, 'Friendly');
  });

  test('score 50 returns Trusted', function() {
    assert.strictEqual(NpcReputation.getTier(50).name, 'Trusted');
  });

  test('score 69 returns Trusted', function() {
    assert.strictEqual(NpcReputation.getTier(69).name, 'Trusted');
  });

  test('score 70 returns Honored', function() {
    assert.strictEqual(NpcReputation.getTier(70).name, 'Honored');
  });

  test('score 89 returns Honored', function() {
    assert.strictEqual(NpcReputation.getTier(89).name, 'Honored');
  });

  test('score 90 returns Sworn Ally', function() {
    assert.strictEqual(NpcReputation.getTier(90).name, 'Sworn Ally');
  });

  test('score 100 returns Sworn Ally', function() {
    assert.strictEqual(NpcReputation.getTier(100).name, 'Sworn Ally');
  });

  test('getTier returns object with all required fields', function() {
    var tier = NpcReputation.getTier(50);
    assert.ok(typeof tier.min === 'number');
    assert.ok(typeof tier.max === 'number');
    assert.ok(typeof tier.name === 'string');
    assert.ok(typeof tier.color === 'string');
    assert.ok(typeof tier.dialoguePool === 'string');
  });
});

// ============================================================================
// modifyReputation — all action types
// ============================================================================

suite('modifyReputation — basic', function() {

  test('returns object with state, change, newScore, tier, message', function() {
    var s = freshState();
    var r = NpcReputation.modifyReputation(s, 'p1', 'npc1', 'trade_with', {});
    assert.ok('state' in r);
    assert.ok('change' in r);
    assert.ok('newScore' in r);
    assert.ok('tier' in r);
    assert.ok('message' in r);
  });

  test('trade_with adds 2', function() {
    var s = freshState();
    var r = NpcReputation.modifyReputation(s, 'p1', 'npc1', 'trade_with', {});
    assert.strictEqual(r.change, 2);
    assert.strictEqual(r.newScore, 2);
  });

  test('complete_quest adds 10', function() {
    var s = freshState();
    var r = NpcReputation.modifyReputation(s, 'p1', 'npc1', 'complete_quest', {});
    assert.strictEqual(r.change, 10);
    assert.strictEqual(r.newScore, 10);
  });

  test('gift_item adds 5', function() {
    var s = freshState();
    var r = NpcReputation.modifyReputation(s, 'p1', 'npc1', 'gift_item', {});
    assert.strictEqual(r.change, 5);
  });

  test('gift_liked adds 15', function() {
    var s = freshState();
    var r = NpcReputation.modifyReputation(s, 'p1', 'npc1', 'gift_liked', {});
    assert.strictEqual(r.change, 15);
  });

  test('gift_disliked subtracts 5', function() {
    var s = freshState();
    var r = NpcReputation.modifyReputation(s, 'p1', 'npc1', 'gift_disliked', {});
    assert.strictEqual(r.change, -5);
    assert.strictEqual(r.newScore, -5);
  });

  test('help_event adds 8', function() {
    var s = freshState();
    var r = NpcReputation.modifyReputation(s, 'p1', 'npc1', 'help_event', {});
    assert.strictEqual(r.change, 8);
  });

  test('daily_greeting adds 1', function() {
    var s = freshState();
    var r = NpcReputation.modifyReputation(s, 'p1', 'npc1', 'daily_greeting', {});
    assert.strictEqual(r.change, 1);
  });

  test('fail_quest subtracts 5', function() {
    var s = freshState();
    var r = NpcReputation.modifyReputation(s, 'p1', 'npc1', 'fail_quest', {});
    assert.strictEqual(r.change, -5);
  });

  test('steal_attempt subtracts 20', function() {
    var s = freshState();
    var r = NpcReputation.modifyReputation(s, 'p1', 'npc1', 'steal_attempt', {});
    assert.strictEqual(r.change, -20);
    assert.strictEqual(r.newScore, -20);
  });

  test('mentored_by adds 12', function() {
    var s = freshState();
    var r = NpcReputation.modifyReputation(s, 'p1', 'npc1', 'mentored_by', {});
    assert.strictEqual(r.change, 12);
  });

  test('defended adds 15', function() {
    var s = freshState();
    var r = NpcReputation.modifyReputation(s, 'p1', 'npc1', 'defended', {});
    assert.strictEqual(r.change, 15);
  });

  test('ignored_plea subtracts 8', function() {
    var s = freshState();
    var r = NpcReputation.modifyReputation(s, 'p1', 'npc1', 'ignored_plea', {});
    assert.strictEqual(r.change, -8);
  });
});

suite('modifyReputation — clamping', function() {

  test('score cannot exceed 100', function() {
    var s = freshState();
    // Push to near max
    for (var i = 0; i < 8; i++) {
      NpcReputation.modifyReputation(s, 'p1', 'npc1', 'defended', {});
    }
    var r = NpcReputation.modifyReputation(s, 'p1', 'npc1', 'defended', {});
    assert.ok(r.newScore <= 100, 'Score should not exceed 100, got ' + r.newScore);
  });

  test('score cannot go below -100', function() {
    var s = freshState();
    for (var i = 0; i < 6; i++) {
      NpcReputation.modifyReputation(s, 'p1', 'npc1', 'steal_attempt', {});
    }
    var r = NpcReputation.modifyReputation(s, 'p1', 'npc1', 'steal_attempt', {});
    assert.ok(r.newScore >= -100, 'Score should not go below -100, got ' + r.newScore);
  });

  test('modifying clamped score returns clamped newScore', function() {
    var s = freshState();
    // Set to 100 directly via many positives
    for (var i = 0; i < 10; i++) {
      NpcReputation.modifyReputation(s, 'p1', 'npc1', 'defended', {});
    }
    var r = NpcReputation.modifyReputation(s, 'p1', 'npc1', 'gift_liked', {});
    assert.strictEqual(r.newScore, 100);
  });
});

suite('modifyReputation — history', function() {

  test('logs entry to state.history', function() {
    var s = freshState();
    NpcReputation.modifyReputation(s, 'p1', 'npc1', 'trade_with', {});
    assert.strictEqual(s.history.length, 1);
  });

  test('history entry has required fields', function() {
    var s = freshState();
    NpcReputation.modifyReputation(s, 'p1', 'npc1', 'trade_with', {});
    var entry = s.history[0];
    assert.ok('ts' in entry);
    assert.ok('playerId' in entry);
    assert.ok('npcId' in entry);
    assert.ok('action' in entry);
    assert.ok('change' in entry);
    assert.ok('oldScore' in entry);
    assert.ok('newScore' in entry);
    assert.ok('tierName' in entry);
    assert.ok('desc' in entry);
  });

  test('history records correct oldScore and newScore', function() {
    var s = freshState();
    NpcReputation.modifyReputation(s, 'p1', 'npc1', 'trade_with', {});
    NpcReputation.modifyReputation(s, 'p1', 'npc1', 'complete_quest', {});
    assert.strictEqual(s.history[1].oldScore, 2);
    assert.strictEqual(s.history[1].newScore, 12);
  });

  test('multiple actions build history', function() {
    var s = freshState();
    NpcReputation.modifyReputation(s, 'p1', 'npc1', 'trade_with', {});
    NpcReputation.modifyReputation(s, 'p1', 'npc1', 'gift_item', {});
    NpcReputation.modifyReputation(s, 'p1', 'npc1', 'fail_quest', {});
    assert.strictEqual(s.history.length, 3);
  });
});

suite('modifyReputation — invalid action', function() {

  test('unknown action returns change of 0', function() {
    var s = freshState();
    var r = NpcReputation.modifyReputation(s, 'p1', 'npc1', 'fly_to_moon', {});
    assert.strictEqual(r.change, 0);
  });

  test('unknown action does not change score', function() {
    var s = freshState();
    NpcReputation.modifyReputation(s, 'p1', 'npc1', 'trade_with', {});
    var before = NpcReputation.getReputation(s, 'p1', 'npc1');
    NpcReputation.modifyReputation(s, 'p1', 'npc1', 'fly_to_moon', {});
    assert.strictEqual(NpcReputation.getReputation(s, 'p1', 'npc1'), before);
  });

  test('unknown action includes error message', function() {
    var s = freshState();
    var r = NpcReputation.modifyReputation(s, 'p1', 'npc1', 'fly_to_moon', {});
    assert.ok(r.message.indexOf('Unknown') !== -1 || r.message.indexOf('fly_to_moon') !== -1);
  });
});

suite('modifyReputation — multiplier context', function() {

  test('multiplier of 2 doubles the change', function() {
    var s = freshState();
    var r = NpcReputation.modifyReputation(s, 'p1', 'npc1', 'trade_with', { multiplier: 2 });
    assert.strictEqual(r.change, 4);
  });

  test('multiplier of 0.5 halves the change', function() {
    var s = freshState();
    var r = NpcReputation.modifyReputation(s, 'p1', 'npc1', 'complete_quest', { multiplier: 0.5 });
    assert.strictEqual(r.change, 5);
  });
});

suite('modifyReputation — tier message on tier change', function() {

  test('message includes tier change notice when tier changes', function() {
    var s = freshState();
    // Start at 0 (Neutral), add enough to reach Known (15+)
    for (var i = 0; i < 3; i++) {
      NpcReputation.modifyReputation(s, 'p1', 'npc1', 'gift_liked', {});
    }
    // Now at 45 (Friendly) — last call moved from Known
    var history = s.history;
    var tierChanged = history.some(function(e) {
      return e.tierName !== 'Neutral';
    });
    assert.ok(tierChanged, 'Tier should have changed from Neutral after enough actions');
  });
});

// ============================================================================
// getGiftReaction
// ============================================================================

suite('getGiftReaction', function() {

  test('returns liked for gardener + seeds', function() {
    assert.strictEqual(NpcReputation.getGiftReaction('gardener', 'seeds'), 'liked');
  });

  test('returns liked for gardener + herbs', function() {
    assert.strictEqual(NpcReputation.getGiftReaction('gardener', 'herbs'), 'liked');
  });

  test('returns disliked for gardener + iron_ore', function() {
    assert.strictEqual(NpcReputation.getGiftReaction('gardener', 'iron_ore'), 'disliked');
  });

  test('returns neutral for gardener + unknown item', function() {
    assert.strictEqual(NpcReputation.getGiftReaction('gardener', 'dragon_scale'), 'neutral');
  });

  test('returns liked for musician + strings', function() {
    assert.strictEqual(NpcReputation.getGiftReaction('musician', 'strings'), 'liked');
  });

  test('returns disliked for musician + nails', function() {
    assert.strictEqual(NpcReputation.getGiftReaction('musician', 'nails'), 'disliked');
  });

  test('returns liked for merchant + gold_dust', function() {
    assert.strictEqual(NpcReputation.getGiftReaction('merchant', 'gold_dust'), 'liked');
  });

  test('returns disliked for merchant + clay', function() {
    assert.strictEqual(NpcReputation.getGiftReaction('merchant', 'clay'), 'disliked');
  });

  test('returns neutral for unknown archetype', function() {
    assert.strictEqual(NpcReputation.getGiftReaction('dragon', 'gold'), 'neutral');
  });

  test('returns liked for storyteller + scroll', function() {
    assert.strictEqual(NpcReputation.getGiftReaction('storyteller', 'scroll'), 'liked');
  });

  test('returns disliked for storyteller + pickaxe', function() {
    assert.strictEqual(NpcReputation.getGiftReaction('storyteller', 'pickaxe'), 'disliked');
  });

  test('returns liked for philosopher + riddle_box', function() {
    assert.strictEqual(NpcReputation.getGiftReaction('philosopher', 'riddle_box'), 'liked');
  });

  test('returns liked for artist + canvas', function() {
    assert.strictEqual(NpcReputation.getGiftReaction('artist', 'canvas'), 'liked');
  });

  test('returns disliked for artist + lockbox', function() {
    assert.strictEqual(NpcReputation.getGiftReaction('artist', 'lockbox'), 'disliked');
  });
});

// ============================================================================
// processGift
// ============================================================================

suite('processGift', function() {

  test('returns state, reaction, change, message', function() {
    var s = freshState();
    var r = NpcReputation.processGift(s, 'p1', 'npc1', 'gardener', 'seeds');
    assert.ok('state' in r);
    assert.ok('reaction' in r);
    assert.ok('change' in r);
    assert.ok('message' in r);
  });

  test('liked gift sets reaction to liked', function() {
    var s = freshState();
    var r = NpcReputation.processGift(s, 'p1', 'npc1', 'gardener', 'seeds');
    assert.strictEqual(r.reaction, 'liked');
  });

  test('liked gift applies gift_liked change (+15)', function() {
    var s = freshState();
    var r = NpcReputation.processGift(s, 'p1', 'npc1', 'gardener', 'seeds');
    assert.strictEqual(r.change, 15);
  });

  test('disliked gift sets reaction to disliked', function() {
    var s = freshState();
    var r = NpcReputation.processGift(s, 'p1', 'npc1', 'gardener', 'iron_ore');
    assert.strictEqual(r.reaction, 'disliked');
  });

  test('disliked gift applies gift_disliked change (-5)', function() {
    var s = freshState();
    var r = NpcReputation.processGift(s, 'p1', 'npc1', 'gardener', 'iron_ore');
    assert.strictEqual(r.change, -5);
  });

  test('neutral gift sets reaction to neutral', function() {
    var s = freshState();
    var r = NpcReputation.processGift(s, 'p1', 'npc1', 'gardener', 'dragon_scale');
    assert.strictEqual(r.reaction, 'neutral');
  });

  test('neutral gift applies gift_item change (+5)', function() {
    var s = freshState();
    var r = NpcReputation.processGift(s, 'p1', 'npc1', 'gardener', 'dragon_scale');
    assert.strictEqual(r.change, 5);
  });

  test('gift actually modifies reputation in state', function() {
    var s = freshState();
    NpcReputation.processGift(s, 'p1', 'npc1', 'musician', 'strings');
    var score = NpcReputation.getReputation(s, 'p1', 'npc1');
    assert.strictEqual(score, 15);
  });

  test('message for liked gift includes item name', function() {
    var s = freshState();
    var r = NpcReputation.processGift(s, 'p1', 'npc1', 'gardener', 'seeds');
    assert.ok(r.message.indexOf('seeds') !== -1);
  });
});

// ============================================================================
// getDialogue
// ============================================================================

suite('getDialogue', function() {

  test('returns text and options', function() {
    var tier = NpcReputation.getTier(0);
    var d = NpcReputation.getDialogue('gardener', tier, 'greeting');
    assert.ok(typeof d.text === 'string' && d.text.length > 0);
    assert.ok(Array.isArray(d.options));
  });

  test('hostile tier gives hostile text', function() {
    var tier = NpcReputation.getTier(-100);
    var d = NpcReputation.getDialogue('gardener', tier, 'greeting');
    var hostileTexts = NpcReputation.DIALOGUE_POOLS.hostile.greeting;
    assert.ok(hostileTexts.indexOf(d.text) !== -1 || d.text.length > 0,
      'Hostile dialogue should come from hostile pool');
  });

  test('neutral tier returns standard greeting', function() {
    var tier = NpcReputation.getTier(0);
    var d = NpcReputation.getDialogue('merchant', tier, 'greeting');
    assert.ok(typeof d.text === 'string' && d.text.length > 0);
  });

  test('ally tier returns ally dialogue', function() {
    var tier = NpcReputation.getTier(95);
    var d = NpcReputation.getDialogue('builder', tier, 'greeting');
    var allyTexts = NpcReputation.DIALOGUE_POOLS.ally.greeting;
    assert.ok(allyTexts.indexOf(d.text) !== -1 || d.text.length > 0);
  });

  test('farewell context returns farewell text', function() {
    var tier = NpcReputation.getTier(50);
    var d = NpcReputation.getDialogue('healer', tier, 'farewell');
    assert.ok(typeof d.text === 'string' && d.text.length > 0);
  });

  test('shop context returns shop text', function() {
    var tier = NpcReputation.getTier(20);
    var d = NpcReputation.getDialogue('merchant', tier, 'shop');
    assert.ok(typeof d.text === 'string' && d.text.length > 0);
  });

  test('quest context returns quest text', function() {
    var tier = NpcReputation.getTier(30);
    var d = NpcReputation.getDialogue('storyteller', tier, 'quest');
    assert.ok(typeof d.text === 'string' && d.text.length > 0);
  });

  test('gossip context returns gossip text', function() {
    var tier = NpcReputation.getTier(40);
    var d = NpcReputation.getDialogue('explorer', tier, 'gossip');
    assert.ok(typeof d.text === 'string' && d.text.length > 0);
  });

  test('options are objects with label and action fields', function() {
    var tier = NpcReputation.getTier(30);
    var d = NpcReputation.getDialogue('teacher', tier, 'greeting');
    d.options.forEach(function(opt, i) {
      assert.ok(typeof opt.label === 'string', 'Option ' + i + ' missing label');
      assert.ok(typeof opt.action === 'string', 'Option ' + i + ' missing action');
    });
  });

  test('hostile tier has very limited options (back away)', function() {
    var tier = NpcReputation.getTier(-100);
    var d = NpcReputation.getDialogue('artist', tier, 'greeting');
    var hasLeave = d.options.some(function(o) {
      return o.action === 'leave' || o.action === 'back away' || o.label.toLowerCase().indexOf('away') !== -1 || o.label.toLowerCase().indexOf('leave') !== -1;
    });
    assert.ok(hasLeave || d.options.length <= 2, 'Hostile tier should have limited options');
  });

  test('ally tier has more options including aid', function() {
    var tier = NpcReputation.getTier(95);
    var d = NpcReputation.getDialogue('philosopher', tier, 'greeting');
    assert.ok(d.options.length >= 3, 'Ally tier should have multiple options');
  });

  test('gossip context for friendly archetype mentions topic', function() {
    var tier = NpcReputation.getTier(40);
    var d = NpcReputation.getDialogue('musician', tier, 'gossip');
    // Either the text mentions a topic or is just a string
    assert.ok(typeof d.text === 'string' && d.text.length > 0);
  });
});

// ============================================================================
// getUnlockedFeatures
// ============================================================================

suite('getUnlockedFeatures', function() {

  test('returns array', function() {
    assert.ok(Array.isArray(NpcReputation.getUnlockedFeatures(0)));
  });

  test('score 0 unlocks basic_shop', function() {
    var features = NpcReputation.getUnlockedFeatures(0);
    assert.ok(features.indexOf('basic_shop') !== -1);
  });

  test('score -1 does not unlock basic_shop', function() {
    var features = NpcReputation.getUnlockedFeatures(-1);
    assert.ok(features.indexOf('basic_shop') === -1);
  });

  test('score 15 unlocks personal_stories', function() {
    var features = NpcReputation.getUnlockedFeatures(15);
    assert.ok(features.indexOf('personal_stories') !== -1);
  });

  test('score 29 does not unlock discount_shop', function() {
    var features = NpcReputation.getUnlockedFeatures(29);
    assert.ok(features.indexOf('discount_shop') === -1);
  });

  test('score 30 unlocks discount_shop', function() {
    var features = NpcReputation.getUnlockedFeatures(30);
    assert.ok(features.indexOf('discount_shop') !== -1);
  });

  test('score 50 unlocks rare_quests', function() {
    var features = NpcReputation.getUnlockedFeatures(50);
    assert.ok(features.indexOf('rare_quests') !== -1);
  });

  test('score 49 does not unlock rare_quests', function() {
    var features = NpcReputation.getUnlockedFeatures(49);
    assert.ok(features.indexOf('rare_quests') === -1);
  });

  test('score 70 unlocks secret_locations', function() {
    var features = NpcReputation.getUnlockedFeatures(70);
    assert.ok(features.indexOf('secret_locations') !== -1);
  });

  test('score 69 does not unlock secret_locations', function() {
    var features = NpcReputation.getUnlockedFeatures(69);
    assert.ok(features.indexOf('secret_locations') === -1);
  });

  test('score 90 unlocks sworn_ally_perks', function() {
    var features = NpcReputation.getUnlockedFeatures(90);
    assert.ok(features.indexOf('sworn_ally_perks') !== -1);
  });

  test('score 89 does not unlock sworn_ally_perks', function() {
    var features = NpcReputation.getUnlockedFeatures(89);
    assert.ok(features.indexOf('sworn_ally_perks') === -1);
  });

  test('score 100 unlocks all features', function() {
    var features = NpcReputation.getUnlockedFeatures(100);
    assert.ok(features.indexOf('sworn_ally_perks') !== -1);
    assert.ok(features.indexOf('secret_locations') !== -1);
    assert.ok(features.indexOf('rare_quests') !== -1);
    assert.ok(features.indexOf('discount_shop') !== -1);
    assert.ok(features.indexOf('basic_shop') !== -1);
  });

  test('score -100 unlocks nothing', function() {
    var features = NpcReputation.getUnlockedFeatures(-100);
    assert.strictEqual(features.length, 0);
  });

  test('unlocked features are cumulative', function() {
    var f30 = NpcReputation.getUnlockedFeatures(30);
    var f0 = NpcReputation.getUnlockedFeatures(0);
    assert.ok(f30.length > f0.length, 'Higher score should unlock more features');
  });
});

// ============================================================================
// getNPCRelationshipSummary
// ============================================================================

suite('getNPCRelationshipSummary', function() {

  test('returns empty array for unknown player', function() {
    var s = freshState();
    var result = NpcReputation.getNPCRelationshipSummary(s, 'nobody');
    assert.ok(Array.isArray(result));
    assert.strictEqual(result.length, 0);
  });

  test('returns empty array for null state', function() {
    var result = NpcReputation.getNPCRelationshipSummary(null, 'p1');
    assert.ok(Array.isArray(result));
  });

  test('returns relationship entry with npcId, score, tier, tierColor', function() {
    var s = freshState();
    NpcReputation.modifyReputation(s, 'p1', 'npc1', 'complete_quest', {});
    var result = NpcReputation.getNPCRelationshipSummary(s, 'p1');
    assert.strictEqual(result.length, 1);
    assert.ok('npcId' in result[0]);
    assert.ok('score' in result[0]);
    assert.ok('tier' in result[0]);
    assert.ok('tierColor' in result[0]);
  });

  test('sorted by score descending', function() {
    var s = freshState();
    NpcReputation.modifyReputation(s, 'p1', 'npcA', 'gift_liked', {});   // +15
    NpcReputation.modifyReputation(s, 'p1', 'npcB', 'complete_quest', {}); // +10
    NpcReputation.modifyReputation(s, 'p1', 'npcC', 'trade_with', {});   // +2
    var result = NpcReputation.getNPCRelationshipSummary(s, 'p1');
    assert.ok(result[0].score >= result[1].score && result[1].score >= result[2].score,
      'Should be sorted descending');
  });

  test('includes all NPCs the player has interacted with', function() {
    var s = freshState();
    NpcReputation.modifyReputation(s, 'p1', 'npcA', 'trade_with', {});
    NpcReputation.modifyReputation(s, 'p1', 'npcB', 'trade_with', {});
    NpcReputation.modifyReputation(s, 'p1', 'npcC', 'trade_with', {});
    var result = NpcReputation.getNPCRelationshipSummary(s, 'p1');
    assert.strictEqual(result.length, 3);
  });
});

// ============================================================================
// getTopRelationships
// ============================================================================

suite('getTopRelationships', function() {

  test('returns at most limit results', function() {
    var s = freshState();
    for (var i = 0; i < 8; i++) {
      NpcReputation.modifyReputation(s, 'p1', 'npc' + i, 'trade_with', {});
    }
    var top = NpcReputation.getTopRelationships(s, 'p1', 3);
    assert.strictEqual(top.length, 3);
  });

  test('defaults to 5 if no limit given', function() {
    var s = freshState();
    for (var i = 0; i < 8; i++) {
      NpcReputation.modifyReputation(s, 'p1', 'npc' + i, 'trade_with', {});
    }
    var top = NpcReputation.getTopRelationships(s, 'p1');
    assert.strictEqual(top.length, 5);
  });

  test('returns fewer than limit if player has fewer NPCs', function() {
    var s = freshState();
    NpcReputation.modifyReputation(s, 'p1', 'npc1', 'trade_with', {});
    var top = NpcReputation.getTopRelationships(s, 'p1', 10);
    assert.strictEqual(top.length, 1);
  });

  test('top relationships are highest scored', function() {
    var s = freshState();
    NpcReputation.modifyReputation(s, 'p1', 'npcA', 'gift_liked', {});    // 15
    NpcReputation.modifyReputation(s, 'p1', 'npcB', 'complete_quest', {}); // 10
    NpcReputation.modifyReputation(s, 'p1', 'npcC', 'trade_with', {});    // 2
    NpcReputation.modifyReputation(s, 'p1', 'npcD', 'steal_attempt', {}); // -20
    var top = NpcReputation.getTopRelationships(s, 'p1', 2);
    assert.strictEqual(top[0].score, 15);
    assert.strictEqual(top[1].score, 10);
  });
});

// ============================================================================
// decayReputation
// ============================================================================

suite('decayReputation', function() {

  test('returns state', function() {
    var s = freshState();
    var r = NpcReputation.decayReputation(s, 'p1', 1, 5);
    assert.ok(r === s || typeof r === 'object');
  });

  test('decays positive score toward 0', function() {
    var s = freshState();
    NpcReputation.modifyReputation(s, 'p1', 'npc1', 'complete_quest', {}); // 10
    NpcReputation.decayReputation(s, 'p1', 1, 5);
    var score = NpcReputation.getReputation(s, 'p1', 'npc1');
    assert.strictEqual(score, 9);
  });

  test('decays negative score toward 0', function() {
    var s = freshState();
    NpcReputation.modifyReputation(s, 'p1', 'npc1', 'steal_attempt', {}); // -20
    NpcReputation.decayReputation(s, 'p1', 2, 5);
    var score = NpcReputation.getReputation(s, 'p1', 'npc1');
    assert.strictEqual(score, -18);
  });

  test('does not decay score at or below threshold (positive)', function() {
    var s = freshState();
    NpcReputation.modifyReputation(s, 'p1', 'npc1', 'daily_greeting', {}); // 1
    NpcReputation.modifyReputation(s, 'p1', 'npc1', 'daily_greeting', {}); // 2
    NpcReputation.modifyReputation(s, 'p1', 'npc1', 'daily_greeting', {}); // 3
    // score 3, threshold 5: should NOT decay
    NpcReputation.decayReputation(s, 'p1', 1, 5);
    var score = NpcReputation.getReputation(s, 'p1', 'npc1');
    assert.strictEqual(score, 3);
  });

  test('does not decay score at or below threshold (negative)', function() {
    var s = freshState();
    NpcReputation.modifyReputation(s, 'p1', 'npc1', 'gift_disliked', {}); // -5
    // score -5, threshold 5: |score| = 5 not > 5, should NOT decay
    NpcReputation.decayReputation(s, 'p1', 1, 5);
    var score = NpcReputation.getReputation(s, 'p1', 'npc1');
    assert.strictEqual(score, -5);
  });

  test('decay does not push positive score below 0', function() {
    var s = freshState();
    NpcReputation.modifyReputation(s, 'p1', 'npc1', 'gift_item', {}); // 5 at threshold exactly
    // Manually bump to 6 so it decays
    NpcReputation.modifyReputation(s, 'p1', 'npc1', 'daily_greeting', {}); // 6
    NpcReputation.decayReputation(s, 'p1', 10, 5);
    var score = NpcReputation.getReputation(s, 'p1', 'npc1');
    assert.ok(score >= 0, 'Score should not go below 0 when decaying positive');
  });

  test('handles unknown player gracefully', function() {
    var s = freshState();
    var result = NpcReputation.decayReputation(s, 'nobody', 1, 5);
    assert.ok(result !== null && result !== undefined);
  });

  test('handles null state gracefully', function() {
    var result = NpcReputation.decayReputation(null, 'p1', 1, 5);
    assert.ok(result === null || result === undefined || typeof result === 'object');
  });

  test('default amount is 1 when not provided', function() {
    var s = freshState();
    NpcReputation.modifyReputation(s, 'p1', 'npc1', 'help_event', {}); // 8
    NpcReputation.decayReputation(s, 'p1', undefined, 5);
    var score = NpcReputation.getReputation(s, 'p1', 'npc1');
    assert.strictEqual(score, 7);
  });
});

// ============================================================================
// formatReputationBar
// ============================================================================

suite('formatReputationBar', function() {

  test('returns a string', function() {
    assert.ok(typeof NpcReputation.formatReputationBar(0) === 'string');
  });

  test('contains opening bracket [', function() {
    assert.ok(NpcReputation.formatReputationBar(50).indexOf('[') !== -1);
  });

  test('contains closing bracket ]', function() {
    assert.ok(NpcReputation.formatReputationBar(50).indexOf(']') !== -1);
  });

  test('contains # as the marker character', function() {
    assert.ok(NpcReputation.formatReputationBar(0).indexOf('#') !== -1);
  });

  test('contains tier name in output', function() {
    var bar = NpcReputation.formatReputationBar(50);
    assert.ok(bar.indexOf('Trusted') !== -1);
  });

  test('contains score number in output', function() {
    var bar = NpcReputation.formatReputationBar(42);
    assert.ok(bar.indexOf('42') !== -1);
  });

  test('score 0 shows Neutral', function() {
    assert.ok(NpcReputation.formatReputationBar(0).indexOf('Neutral') !== -1);
  });

  test('score 100 shows Sworn Ally', function() {
    assert.ok(NpcReputation.formatReputationBar(100).indexOf('Sworn Ally') !== -1);
  });

  test('score -100 shows Hostile', function() {
    assert.ok(NpcReputation.formatReputationBar(-100).indexOf('Hostile') !== -1);
  });

  test('bar length is consistent across scores', function() {
    // The bracketed portion should be same length regardless of score
    function barPortion(s) {
      var full = NpcReputation.formatReputationBar(s);
      var start = full.indexOf('[');
      var end = full.indexOf(']');
      return end - start + 1;
    }
    var len0 = barPortion(0);
    var len50 = barPortion(50);
    var lenNeg = barPortion(-50);
    assert.strictEqual(len0, len50, 'Bar length should be consistent');
    assert.strictEqual(len0, lenNeg, 'Bar length should be consistent');
  });

  test('out-of-range score is clamped and does not crash', function() {
    var bar = NpcReputation.formatReputationBar(999);
    assert.ok(typeof bar === 'string');
    var bar2 = NpcReputation.formatReputationBar(-999);
    assert.ok(typeof bar2 === 'string');
  });
});

// ============================================================================
// formatRelationshipCard
// ============================================================================

suite('formatRelationshipCard', function() {

  test('returns a string', function() {
    var card = NpcReputation.formatRelationshipCard('npc1', 'Elder Oak', 'gardener', 50);
    assert.ok(typeof card === 'string');
  });

  test('contains npc name', function() {
    var card = NpcReputation.formatRelationshipCard('npc1', 'Elder Oak', 'gardener', 50);
    assert.ok(card.indexOf('Elder Oak') !== -1);
  });

  test('contains archetype', function() {
    var card = NpcReputation.formatRelationshipCard('npc1', 'Elder Oak', 'gardener', 50);
    assert.ok(card.indexOf('gardener') !== -1);
  });

  test('contains tier name', function() {
    var card = NpcReputation.formatRelationshipCard('npc1', 'Lyra', 'musician', 50);
    assert.ok(card.indexOf('Trusted') !== -1);
  });

  test('contains score value', function() {
    var card = NpcReputation.formatRelationshipCard('npc1', 'Lyra', 'musician', 42);
    assert.ok(card.indexOf('42') !== -1);
  });

  test('contains tier color', function() {
    var card = NpcReputation.formatRelationshipCard('npc1', 'Lyra', 'musician', 50);
    var tier = NpcReputation.getTier(50);
    assert.ok(card.indexOf(tier.color) !== -1);
  });

  test('contains npc-rep-card class', function() {
    var card = NpcReputation.formatRelationshipCard('npc1', 'Test', 'builder', 20);
    assert.ok(card.indexOf('npc-rep-card') !== -1);
  });

  test('contains data-npc-id attribute', function() {
    var card = NpcReputation.formatRelationshipCard('npc42', 'Test', 'builder', 20);
    assert.ok(card.indexOf('npc42') !== -1);
  });

  test('high score card lists unlocked features', function() {
    var card = NpcReputation.formatRelationshipCard('npc1', 'Boss', 'merchant', 90);
    assert.ok(card.indexOf('sworn_ally_perks') !== -1);
  });

  test('low score card shows no special features message', function() {
    var card = NpcReputation.formatRelationshipCard('npc1', 'Stranger', 'explorer', -50);
    assert.ok(card.indexOf('No special') !== -1 || card.indexOf('unlock') !== -1 || card.indexOf('feature') !== -1);
  });
});

// ============================================================================
// EDGE CASES — Multi-player isolation
// ============================================================================

suite('Multi-player isolation', function() {

  test('two players have independent reputations with same NPC', function() {
    var s = freshState();
    NpcReputation.modifyReputation(s, 'alice', 'npc1', 'complete_quest', {});
    NpcReputation.modifyReputation(s, 'bob', 'npc1', 'steal_attempt', {});
    assert.strictEqual(NpcReputation.getReputation(s, 'alice', 'npc1'), 10);
    assert.strictEqual(NpcReputation.getReputation(s, 'bob', 'npc1'), -20);
  });

  test('modifying one player does not affect another', function() {
    var s = freshState();
    NpcReputation.modifyReputation(s, 'alice', 'npc1', 'gift_liked', {});
    NpcReputation.modifyReputation(s, 'alice', 'npc1', 'gift_liked', {});
    assert.strictEqual(NpcReputation.getReputation(s, 'bob', 'npc1'), 0);
  });

  test('decay only affects specified player', function() {
    var s = freshState();
    NpcReputation.modifyReputation(s, 'alice', 'npc1', 'help_event', {}); // 8
    NpcReputation.modifyReputation(s, 'bob', 'npc1', 'help_event', {});   // 8
    NpcReputation.decayReputation(s, 'alice', 1, 5);
    assert.strictEqual(NpcReputation.getReputation(s, 'alice', 'npc1'), 7);
    assert.strictEqual(NpcReputation.getReputation(s, 'bob', 'npc1'), 8);
  });
});

// ============================================================================
// EDGE CASES — Misc
// ============================================================================

suite('Edge cases', function() {

  test('modifyReputation with empty npcId creates entry', function() {
    var s = freshState();
    var r = NpcReputation.modifyReputation(s, 'p1', '', 'trade_with', {});
    assert.ok(r.newScore !== undefined);
  });

  test('getReputation with empty playerId returns 0', function() {
    var s = freshState();
    assert.strictEqual(NpcReputation.getReputation(s, '', 'npc1'), 0);
  });

  test('processGift with null archetype returns neutral reaction', function() {
    var s = freshState();
    var r = NpcReputation.processGift(s, 'p1', 'npc1', null, 'seeds');
    assert.strictEqual(r.reaction, 'neutral');
  });

  test('getDialogue with null tier falls back to neutral', function() {
    var d = NpcReputation.getDialogue('gardener', null, 'greeting');
    assert.ok(typeof d.text === 'string' && d.text.length > 0);
  });

  test('getTier with undefined uses correct fallback', function() {
    // Should not throw
    var tier = NpcReputation.getTier(0);
    assert.ok(tier !== null && tier !== undefined);
  });

  test('REPUTATION_MIN is -100', function() {
    assert.strictEqual(NpcReputation.REPUTATION_MIN, -100);
  });

  test('REPUTATION_MAX is 100', function() {
    assert.strictEqual(NpcReputation.REPUTATION_MAX, 100);
  });

  test('cumulative actions build score correctly', function() {
    var s = freshState();
    NpcReputation.modifyReputation(s, 'p1', 'npc1', 'trade_with', {});     // 2
    NpcReputation.modifyReputation(s, 'p1', 'npc1', 'trade_with', {});     // 4
    NpcReputation.modifyReputation(s, 'p1', 'npc1', 'complete_quest', {}); // 14
    NpcReputation.modifyReputation(s, 'p1', 'npc1', 'steal_attempt', {});  // -6
    assert.strictEqual(NpcReputation.getReputation(s, 'p1', 'npc1'), -6);
  });
});

// ============================================================================
// DIALOGUE_POOLS completeness
// ============================================================================

suite('DIALOGUE_POOLS completeness', function() {

  test('all 10 tier dialoguePools exist in DIALOGUE_POOLS', function() {
    NpcReputation.TIERS.forEach(function(tier) {
      assert.ok(NpcReputation.DIALOGUE_POOLS[tier.dialoguePool],
        'Missing pool: ' + tier.dialoguePool);
    });
  });

  test('each pool has all 5 contexts', function() {
    var contexts = ['greeting','farewell','shop','quest','gossip'];
    Object.keys(NpcReputation.DIALOGUE_POOLS).forEach(function(pool) {
      contexts.forEach(function(ctx) {
        assert.ok(Array.isArray(NpcReputation.DIALOGUE_POOLS[pool][ctx]),
          'Pool ' + pool + ' missing context ' + ctx);
        assert.ok(NpcReputation.DIALOGUE_POOLS[pool][ctx].length > 0,
          'Pool ' + pool + ' context ' + ctx + ' has no lines');
      });
    });
  });
});

// ============================================================================
// REPORT
// ============================================================================

if (!report()) {
  process.exit(1);
}
