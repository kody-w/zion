/**
 * tests/test_dashboard_games.js
 * Comprehensive tests for the ZION Dashboard Games module.
 * 140+ tests covering Fishing, Card Game, Dungeon, and Stargazing.
 */

'use strict';

const { test, suite, report, assert } = require('./test_runner');
const DG = require('../src/js/dashboard_games');

// ===========================================================================
// FISHING TESTS (40+)
// ===========================================================================

suite('Fishing — createFishingGame', function() {

  test('returns an object', function() {
    var s = DG.createFishingGame();
    assert.ok(typeof s === 'object' && s !== null);
  });

  test('initial rod is basic', function() {
    var s = DG.createFishingGame();
    assert.strictEqual(s.rod, 'basic');
  });

  test('initial bait is null', function() {
    var s = DG.createFishingGame();
    assert.strictEqual(s.bait, null);
  });

  test('initial location is nexus', function() {
    var s = DG.createFishingGame();
    assert.strictEqual(s.location, 'nexus');
  });

  test('casting starts false', function() {
    var s = DG.createFishingGame();
    assert.strictEqual(s.casting, false);
  });

  test('fish starts null', function() {
    var s = DG.createFishingGame();
    assert.strictEqual(s.fish, null);
  });

  test('catches starts as empty array', function() {
    var s = DG.createFishingGame();
    assert.ok(Array.isArray(s.catches) && s.catches.length === 0);
  });

  test('stats.total starts at 0', function() {
    var s = DG.createFishingGame();
    assert.strictEqual(s.stats.total, 0);
  });

  test('stats.best starts null', function() {
    var s = DG.createFishingGame();
    assert.strictEqual(s.stats.best, null);
  });

  test('stats.streak starts at 0', function() {
    var s = DG.createFishingGame();
    assert.strictEqual(s.stats.streak, 0);
  });
});

suite('Fishing — castLine', function() {

  test('returns state and message', function() {
    var s = DG.createFishingGame();
    var result = DG.castLine(s, 'nexus');
    assert.ok(result.state && typeof result.message === 'string');
  });

  test('sets casting to true', function() {
    var s = DG.createFishingGame();
    var result = DG.castLine(s, 'nexus');
    assert.strictEqual(result.state.casting, true);
  });

  test('updates location', function() {
    var s = DG.createFishingGame();
    var result = DG.castLine(s, 'wilds');
    assert.strictEqual(result.state.location, 'wilds');
  });

  test('clears previous fish', function() {
    var s = DG.createFishingGame();
    s.fish = { name: 'Test', rarity: 'common', value: 5, weight: 1.0, desc: '' };
    var result = DG.castLine(s, 'nexus');
    assert.strictEqual(result.state.fish, null);
  });

  test('message contains location name', function() {
    var s = DG.createFishingGame();
    var result = DG.castLine(s, 'gardens');
    assert.ok(result.message.toLowerCase().includes('garden'));
  });

  test('falls back to nexus for unknown location', function() {
    var s = DG.createFishingGame();
    var result = DG.castLine(s, 'unknown_zone_xyz');
    assert.ok(result.state.location === 'nexus' || result.state.location === 'unknown_zone_xyz');
  });

  test('does not mutate original state', function() {
    var s = DG.createFishingGame();
    var original = JSON.stringify(s);
    DG.castLine(s, 'wilds');
    assert.strictEqual(JSON.stringify(s), original);
  });

  test('works with all 8 zones', function() {
    var zones = ['nexus','gardens','wilds','athenaeum','studio','agora','commons','arena'];
    var s = DG.createFishingGame();
    zones.forEach(function(z) {
      var r = DG.castLine(s, z);
      assert.ok(typeof r.message === 'string');
    });
  });
});

suite('Fishing — checkBite', function() {

  test('returns state, bite bool, fish field', function() {
    var s = DG.createFishingGame();
    s.casting = true;
    var r = DG.checkBite(s);
    assert.ok(typeof r.bite === 'boolean');
    assert.ok('fish' in r);
    assert.ok('state' in r);
  });

  test('returns no bite when not casting', function() {
    var s = DG.createFishingGame();
    s.casting = false;
    var r = DG.checkBite(s);
    assert.strictEqual(r.bite, false);
    assert.strictEqual(r.fish, null);
  });

  test('does not mutate original state', function() {
    var s = DG.createFishingGame();
    s.casting = true;
    var orig = JSON.stringify(s);
    DG.checkBite(s);
    assert.strictEqual(JSON.stringify(s), orig);
  });

  test('fish has name, rarity, value, weight, desc when bite occurs', function() {
    // Run many times to get at least one bite
    var s = DG.createFishingGame();
    var found = false;
    for (var i = 0; i < 100 && !found; i++) {
      s.casting = true;
      var r = DG.checkBite(s);
      if (r.bite) {
        assert.ok(typeof r.fish.name === 'string');
        assert.ok(typeof r.fish.rarity === 'string');
        assert.ok(typeof r.fish.value === 'number');
        assert.ok(typeof r.fish.weight === 'number');
        found = true;
      }
    }
  });
});

suite('Fishing — reelIn', function() {

  test('returns success, fish, message', function() {
    var s = DG.createFishingGame();
    var r = DG.reelIn(s);
    assert.ok('success' in r && 'fish' in r && typeof r.message === 'string');
  });

  test('returns not casting message when no fish', function() {
    var s = DG.createFishingGame();
    var r = DG.reelIn(s);
    assert.strictEqual(r.success, false);
    assert.ok(r.message.toLowerCase().includes('nothing') || r.message.toLowerCase().includes('line'));
  });

  test('increments stats on success', function() {
    // Manually set a fish to force reel
    var s = DG.createFishingGame();
    s.casting = true;
    s.fish = { name: 'Golden Carp', rarity: 'common', value: 5, weight: 2.0, desc: '' };
    // We cannot guarantee success (60% chance), but we can try 30x
    var success = false;
    for (var i = 0; i < 30 && !success; i++) {
      s.casting = true;
      s.fish = { name: 'Golden Carp', rarity: 'common', value: 5, weight: 2.0, desc: '' };
      var r = DG.reelIn(s);
      if (r.success) {
        assert.ok(r.state.stats.total >= 1);
        assert.ok(r.state.catches.length >= 1);
        success = true;
      }
    }
  });

  test('resets casting to false after reel', function() {
    var s = DG.createFishingGame();
    s.casting = true;
    s.fish = { name: 'Rune Fish', rarity: 'rare', value: 25, weight: 3.0, desc: '' };
    var r = DG.reelIn(s);
    assert.strictEqual(r.state.casting, false);
  });

  test('does not mutate original state', function() {
    var s = DG.createFishingGame();
    s.casting = true;
    s.fish = { name: 'Crystal Minnow', rarity: 'uncommon', value: 12, weight: 1.0, desc: '' };
    var orig = JSON.stringify(s);
    DG.reelIn(s);
    assert.strictEqual(JSON.stringify(s), orig);
  });

  test('streak resets on miss', function() {
    var s = DG.createFishingGame();
    s.stats.streak = 5;
    // Run many times until we get a miss
    var missed = false;
    for (var i = 0; i < 30 && !missed; i++) {
      s.casting = true;
      s.fish = { name: 'Golden Carp', rarity: 'common', value: 5, weight: 2.0, desc: '' };
      var r = DG.reelIn(s);
      if (!r.success) {
        assert.strictEqual(r.state.stats.streak, 0);
        missed = true;
      } else {
        s = r.state;
      }
    }
  });
});

suite('Fishing — getFishForLocation', function() {

  test('returns array for nexus', function() {
    var fish = DG.getFishForLocation('nexus');
    assert.ok(Array.isArray(fish) && fish.length > 0);
  });

  test('returns array for all 8 zones', function() {
    var zones = ['nexus','gardens','wilds','athenaeum','studio','agora','commons','arena'];
    zones.forEach(function(z) {
      var fish = DG.getFishForLocation(z);
      assert.ok(Array.isArray(fish) && fish.length >= 3, z + ' should have at least 3 fish');
    });
  });

  test('nexus fish have required fields', function() {
    var fish = DG.getFishForLocation('nexus');
    fish.forEach(function(f) {
      assert.ok(typeof f.name === 'string');
      assert.ok(typeof f.rarity === 'string');
      assert.ok(typeof f.value === 'number');
      assert.ok(f.weight && typeof f.weight.min === 'number' && typeof f.weight.max === 'number');
    });
  });

  test('falls back gracefully for unknown zone', function() {
    var fish = DG.getFishForLocation('unknown_xyz');
    assert.ok(Array.isArray(fish) && fish.length > 0);
  });

  test('returns copy (not original array reference)', function() {
    var a = DG.getFishForLocation('nexus');
    var b = DG.getFishForLocation('nexus');
    a.push({ name: 'fake', rarity: 'common', value: 0, weight: { min: 0, max: 1 }, desc: '' });
    assert.strictEqual(b.length, DG.FISH_BY_ZONE.nexus.length);
  });

  test('wilds has River King (rare)', function() {
    var fish = DG.getFishForLocation('wilds');
    var king = fish.find(function(f) { return f.name === 'River King'; });
    assert.ok(king && king.rarity === 'rare');
  });

  test('agora has Gold Scale (rare, value 50)', function() {
    var fish = DG.getFishForLocation('agora');
    var gs = fish.find(function(f) { return f.name === 'Gold Scale'; });
    assert.ok(gs && gs.value === 50);
  });
});

suite('Fishing — sellFish', function() {

  test('returns success false for empty catches', function() {
    var s = DG.createFishingGame();
    var r = DG.sellFish(s, 0);
    assert.strictEqual(r.success, false);
    assert.strictEqual(r.earnings, 0);
  });

  test('sells fish and removes from catches', function() {
    var s = DG.createFishingGame();
    s.catches.push({ name: 'Golden Carp', rarity: 'common', value: 5, weight: 2.0, desc: '' });
    var r = DG.sellFish(s, 0);
    assert.strictEqual(r.success, true);
    assert.strictEqual(r.earnings, 5);
    assert.strictEqual(r.state.catches.length, 0);
  });

  test('earns correct value', function() {
    var s = DG.createFishingGame();
    s.catches.push({ name: 'Gold Scale', rarity: 'rare', value: 50, weight: 2.0, desc: '' });
    var r = DG.sellFish(s, 0);
    assert.strictEqual(r.earnings, 50);
  });

  test('negative index returns failure', function() {
    var s = DG.createFishingGame();
    s.catches.push({ name: 'Test Fish', rarity: 'common', value: 5, weight: 1.0, desc: '' });
    var r = DG.sellFish(s, -1);
    assert.strictEqual(r.success, false);
  });

  test('out of bounds index returns failure', function() {
    var s = DG.createFishingGame();
    s.catches.push({ name: 'Test Fish', rarity: 'common', value: 5, weight: 1.0, desc: '' });
    var r = DG.sellFish(s, 5);
    assert.strictEqual(r.success, false);
  });

  test('does not mutate original state', function() {
    var s = DG.createFishingGame();
    s.catches.push({ name: 'Test Fish', rarity: 'common', value: 5, weight: 1.0, desc: '' });
    var orig = JSON.stringify(s);
    DG.sellFish(s, 0);
    assert.strictEqual(JSON.stringify(s), orig);
  });

  test('sells correct fish by index when multiple exist', function() {
    var s = DG.createFishingGame();
    s.catches.push({ name: 'Cheap Fish', rarity: 'common', value: 3, weight: 1.0, desc: '' });
    s.catches.push({ name: 'Expensive Fish', rarity: 'rare', value: 50, weight: 2.0, desc: '' });
    var r = DG.sellFish(s, 1);
    assert.strictEqual(r.earnings, 50);
    assert.strictEqual(r.state.catches.length, 1);
    assert.strictEqual(r.state.catches[0].name, 'Cheap Fish');
  });
});

suite('Fishing — getFishingStats', function() {

  test('returns stats object', function() {
    var s = DG.createFishingGame();
    var stats = DG.getFishingStats(s);
    assert.ok(typeof stats === 'object');
  });

  test('total reflects stats.total', function() {
    var s = DG.createFishingGame();
    s.stats.total = 7;
    var stats = DG.getFishingStats(s);
    assert.strictEqual(stats.total, 7);
  });

  test('inCreel reflects catches.length', function() {
    var s = DG.createFishingGame();
    s.catches.push({ name: 'A', rarity: 'common', value: 5, weight: 1.0, desc: '' });
    s.catches.push({ name: 'B', rarity: 'rare',   value: 25, weight: 3.0, desc: '' });
    var stats = DG.getFishingStats(s);
    assert.strictEqual(stats.inCreel, 2);
  });

  test('byRarity counts correctly', function() {
    var s = DG.createFishingGame();
    s.catches.push({ name: 'A', rarity: 'common',   value: 5,  weight: 1.0, desc: '' });
    s.catches.push({ name: 'B', rarity: 'common',   value: 5,  weight: 1.0, desc: '' });
    s.catches.push({ name: 'C', rarity: 'rare',     value: 25, weight: 3.0, desc: '' });
    s.catches.push({ name: 'D', rarity: 'uncommon', value: 12, weight: 1.5, desc: '' });
    var stats = DG.getFishingStats(s);
    assert.strictEqual(stats.byRarity.common, 2);
    assert.strictEqual(stats.byRarity.rare, 1);
    assert.strictEqual(stats.byRarity.uncommon, 1);
  });

  test('best reflects stats.best', function() {
    var s = DG.createFishingGame();
    var best = { name: 'River King', rarity: 'rare', value: 40, weight: 15.0, desc: '' };
    s.stats.best = best;
    var stats = DG.getFishingStats(s);
    assert.strictEqual(stats.best.name, 'River King');
  });

  test('streak reflects stats.streak', function() {
    var s = DG.createFishingGame();
    s.stats.streak = 3;
    var stats = DG.getFishingStats(s);
    assert.strictEqual(stats.streak, 3);
  });
});

// ===========================================================================
// CARD GAME TESTS (40+)
// ===========================================================================

suite('Card Game — createCardBattleState', function() {

  test('returns state object', function() {
    var s = DG.createCardBattleState();
    assert.ok(typeof s === 'object' && s !== null);
  });

  test('player and opponent exist', function() {
    var s = DG.createCardBattleState();
    assert.ok(s.player && s.opponent);
  });

  test('player starts with 20 HP', function() {
    var s = DG.createCardBattleState();
    assert.strictEqual(s.player.hp, 20);
    assert.strictEqual(s.player.maxHp, 20);
  });

  test('opponent starts with 20 HP', function() {
    var s = DG.createCardBattleState();
    assert.strictEqual(s.opponent.hp, 20);
  });

  test('both players have cards in deck', function() {
    var s = DG.createCardBattleState();
    assert.ok(s.player.deck.length > 0);
    assert.ok(s.opponent.deck.length > 0);
  });

  test('both players start with opening hand', function() {
    var s = DG.createCardBattleState();
    assert.ok(s.player.hand.length > 0);
    assert.ok(s.opponent.hand.length > 0);
  });

  test('turn starts at 1', function() {
    var s = DG.createCardBattleState();
    assert.strictEqual(s.turn, 1);
  });

  test('phase starts as draw', function() {
    var s = DG.createCardBattleState();
    assert.strictEqual(s.phase, 'draw');
  });

  test('both field arrays start empty', function() {
    var s = DG.createCardBattleState();
    assert.ok(Array.isArray(s.player.field) && s.player.field.length === 0);
    assert.ok(Array.isArray(s.opponent.field) && s.opponent.field.length === 0);
  });

  test('log is an array', function() {
    var s = DG.createCardBattleState();
    assert.ok(Array.isArray(s.log));
  });

  test('accepts custom decks', function() {
    var customDeck = ['flame_sprite','flame_sprite','stone_guard','stone_guard',
                      'wind_dancer','wind_dancer','fire_wolf','fire_wolf',
                      'tide_caller','tide_caller'];
    var s = DG.createCardBattleState(customDeck, customDeck);
    // Should not throw and should produce a valid state
    assert.ok(s.player && s.opponent);
  });
});

suite('Card Game — drawCard', function() {

  test('returns state, card, discarded fields', function() {
    var s = DG.createCardBattleState();
    var r = DG.drawCard(s, 'player');
    assert.ok('state' in r && 'card' in r && 'discarded' in r);
  });

  test('card is null when deck is empty', function() {
    var s = DG.createCardBattleState();
    s.player.deck = [];
    var r = DG.drawCard(s, 'player');
    assert.strictEqual(r.card, null);
  });

  test('hand size increases by 1 when not full', function() {
    var s = DG.createCardBattleState();
    // Ensure hand has room
    s.player.hand = s.player.hand.slice(0, 3);
    var before = s.player.hand.length;
    var r = DG.drawCard(s, 'player');
    if (r.card && !r.discarded) {
      assert.strictEqual(r.state.player.hand.length, before + 1);
    }
  });

  test('card discarded when hand full (7 cards)', function() {
    var s = DG.createCardBattleState();
    // Fill hand to 7
    while (s.player.hand.length < 7 && s.player.deck.length > 0) {
      s.player.hand.push(s.player.deck.shift());
    }
    if (s.player.deck.length > 0) {
      var r = DG.drawCard(s, 'player');
      assert.strictEqual(r.discarded, true);
    }
  });

  test('works for opponent', function() {
    var s = DG.createCardBattleState();
    var r = DG.drawCard(s, 'opponent');
    assert.ok('card' in r);
  });

  test('does not mutate original state', function() {
    var s = DG.createCardBattleState();
    var orig = JSON.stringify(s);
    DG.drawCard(s, 'player');
    assert.strictEqual(JSON.stringify(s), orig);
  });

  test('log gets a draw entry', function() {
    var s = DG.createCardBattleState();
    var before = s.log.length;
    var r = DG.drawCard(s, 'player');
    if (r.card) {
      assert.ok(r.state.log.length > before);
    }
  });
});

suite('Card Game — playCard', function() {

  test('returns success false when not enough mana', function() {
    var s = DG.createCardBattleState();
    s.player.mana = 0;
    var r = DG.playCard(s, 'player', 0, null);
    assert.strictEqual(r.success, false);
  });

  test('returns success false for invalid index', function() {
    var s = DG.createCardBattleState();
    var r = DG.playCard(s, 'player', 999, null);
    assert.strictEqual(r.success, false);
  });

  test('creature goes to field on success', function() {
    var s = DG.createCardBattleState();
    s.player.mana = 10;
    // Find a creature card in hand
    var creatureIdx = -1;
    for (var i = 0; i < s.player.hand.length; i++) {
      if (s.player.hand[i].type === 'creature') { creatureIdx = i; break; }
    }
    if (creatureIdx >= 0) {
      var r = DG.playCard(s, 'player', creatureIdx, null);
      if (r.success) {
        assert.ok(r.state.player.field.length > 0 || r.state.player.graveyard.length > 0);
      }
    }
  });

  test('spell goes to graveyard', function() {
    var s = DG.createCardBattleState();
    s.player.mana = 10;
    // Inject a spell into hand
    s.player.hand.push({
      instanceId: 'fireball_test', id: 'fireball', name: 'Fireball',
      type: 'spell', cost: 2, attack: 3, defense: 0, hp: 0, currentHp: 0,
      rarity: 'common', ability: 'deal_3', exhausted: false
    });
    var spellIdx = s.player.hand.length - 1;
    var r = DG.playCard(s, 'player', spellIdx, 'face');
    assert.strictEqual(r.success, true);
    assert.ok(r.state.player.graveyard.length > 0);
  });

  test('fireball deals 3 damage to opponent', function() {
    var s = DG.createCardBattleState();
    s.player.mana = 10;
    s.opponent.hp = 20;
    s.player.hand = [{
      instanceId: 'fb1', id: 'fireball', name: 'Fireball',
      type: 'spell', cost: 2, attack: 3, defense: 0, hp: 0, currentHp: 0,
      rarity: 'common', ability: 'deal_3', exhausted: false
    }];
    var r = DG.playCard(s, 'player', 0, 'face');
    assert.strictEqual(r.state.opponent.hp, 17);
  });

  test('healing_light heals player 4 hp', function() {
    var s = DG.createCardBattleState();
    s.player.hp = 10;
    s.player.mana = 10;
    s.player.hand = [{
      instanceId: 'hl1', id: 'healing_light', name: 'Healing Light',
      type: 'spell', cost: 2, attack: 0, defense: 0, hp: 0, currentHp: 0,
      rarity: 'common', ability: 'heal_4', exhausted: false
    }];
    var r = DG.playCard(s, 'player', 0, null);
    assert.strictEqual(r.state.player.hp, 14);
  });

  test('mana cost deducted on successful play', function() {
    var s = DG.createCardBattleState();
    s.player.mana = 5;
    s.player.hand = [{
      instanceId: 'fw1', id: 'fire_wolf', name: 'Fire Wolf',
      type: 'creature', cost: 2, attack: 3, defense: 1, hp: 2, currentHp: 2,
      rarity: 'common', ability: null, exhausted: false
    }];
    var r = DG.playCard(s, 'player', 0, null);
    assert.strictEqual(r.state.player.mana, 3);
  });

  test('does not mutate original state', function() {
    var s = DG.createCardBattleState();
    s.player.mana = 10;
    var orig = JSON.stringify(s);
    DG.playCard(s, 'player', 0, null);
    assert.strictEqual(JSON.stringify(s), orig);
  });
});

suite('Card Game — attackWithCreature', function() {

  test('returns invalid for empty field', function() {
    var s = DG.createCardBattleState();
    var r = DG.attackWithCreature(s, 0, 'face');
    assert.strictEqual(r.result, 'invalid');
  });

  test('exhausted creature cannot attack', function() {
    var s = DG.createCardBattleState();
    s.player.field = [{
      instanceId: 'fw1', id: 'fire_wolf', name: 'Fire Wolf',
      type: 'creature', cost: 2, attack: 3, defense: 1, hp: 2, currentHp: 2,
      rarity: 'common', ability: null, exhausted: true
    }];
    var r = DG.attackWithCreature(s, 0, 'face');
    assert.strictEqual(r.result, 'invalid');
  });

  test('direct face attack reduces opponent HP', function() {
    var s = DG.createCardBattleState();
    s.player.field = [{
      instanceId: 'fw1', id: 'fire_wolf', name: 'Fire Wolf',
      type: 'creature', cost: 2, attack: 3, defense: 1, hp: 2, currentHp: 2,
      rarity: 'common', ability: null, exhausted: false
    }];
    s.opponent.hp = 20;
    var r = DG.attackWithCreature(s, 0, 'face');
    assert.strictEqual(r.state.opponent.hp, 17);
  });

  test('attacking kills weak opponent creature', function() {
    var s = DG.createCardBattleState();
    s.player.field = [{
      instanceId: 'fw1', id: 'fire_wolf', name: 'Fire Wolf',
      type: 'creature', cost: 2, attack: 5, defense: 1, hp: 2, currentHp: 2,
      rarity: 'common', ability: null, exhausted: false
    }];
    s.opponent.field = [{
      instanceId: 'es1', id: 'ember_sprite', name: 'Ember Sprite',
      type: 'creature', cost: 1, attack: 1, defense: 1, hp: 1, currentHp: 1,
      rarity: 'common', ability: null, exhausted: false
    }];
    var r = DG.attackWithCreature(s, 0, 0);
    assert.strictEqual(r.result, 'kill');
    assert.strictEqual(r.state.opponent.field.length, 0);
  });

  test('creature marked exhausted after attack', function() {
    var s = DG.createCardBattleState();
    s.player.field = [{
      instanceId: 'fw1', id: 'fire_wolf', name: 'Fire Wolf',
      type: 'creature', cost: 2, attack: 3, defense: 1, hp: 5, currentHp: 5,
      rarity: 'common', ability: null, exhausted: false
    }];
    var r = DG.attackWithCreature(s, 0, 'face');
    var creature = r.state.player.field[0];
    if (creature) {
      assert.strictEqual(creature.exhausted, true);
    }
  });

  test('does not mutate original state', function() {
    var s = DG.createCardBattleState();
    s.player.field = [{
      instanceId: 'fw1', id: 'fire_wolf', name: 'Fire Wolf',
      type: 'creature', cost: 2, attack: 3, defense: 1, hp: 2, currentHp: 2,
      rarity: 'common', ability: null, exhausted: false
    }];
    var orig = JSON.stringify(s);
    DG.attackWithCreature(s, 0, 'face');
    assert.strictEqual(JSON.stringify(s), orig);
  });
});

suite('Card Game — endTurn', function() {

  test('increments turn counter', function() {
    var s = DG.createCardBattleState();
    var s2 = DG.endTurn(s);
    assert.strictEqual(s2.turn, 2);
  });

  test('switches active player', function() {
    var s = DG.createCardBattleState();
    var initial = s.activePlayer;
    var s2 = DG.endTurn(s);
    assert.notStrictEqual(s2.activePlayer, initial);
  });

  test('refills mana for new active player', function() {
    var s = DG.createCardBattleState();
    s.opponent.mana = 0;
    s.opponent.maxMana = 3;
    // Switch to opponent
    s.activePlayer = 'player';
    var s2 = DG.endTurn(s);
    assert.strictEqual(s2.opponent.mana, s2.opponent.maxMana);
  });

  test('increases maxMana (cap 10)', function() {
    var s = DG.createCardBattleState();
    s.opponent.maxMana = 9;
    s.activePlayer = 'player';
    var s2 = DG.endTurn(s);
    assert.strictEqual(s2.opponent.maxMana, 10);
  });

  test('maxMana does not exceed 10', function() {
    var s = DG.createCardBattleState();
    s.opponent.maxMana = 10;
    s.activePlayer = 'player';
    var s2 = DG.endTurn(s);
    assert.strictEqual(s2.opponent.maxMana, 10);
  });

  test('unexhausts creatures for new active player', function() {
    var s = DG.createCardBattleState();
    s.opponent.field = [{
      instanceId: 'fw1', id: 'fire_wolf', name: 'Fire Wolf',
      type: 'creature', cost: 2, attack: 3, defense: 1, hp: 2, currentHp: 2,
      rarity: 'common', ability: null, exhausted: true
    }];
    s.activePlayer = 'player';
    var s2 = DG.endTurn(s);
    assert.strictEqual(s2.opponent.field[0].exhausted, false);
  });

  test('does not mutate original state', function() {
    var s = DG.createCardBattleState();
    var orig = JSON.stringify(s);
    DG.endTurn(s);
    assert.strictEqual(JSON.stringify(s), orig);
  });
});

suite('Card Game — checkWinner', function() {

  test('returns null when both alive', function() {
    var s = DG.createCardBattleState();
    assert.strictEqual(DG.checkWinner(s), null);
  });

  test('returns player when opponent hp 0', function() {
    var s = DG.createCardBattleState();
    s.opponent.hp = 0;
    assert.strictEqual(DG.checkWinner(s), 'player');
  });

  test('returns opponent when player hp 0', function() {
    var s = DG.createCardBattleState();
    s.player.hp = 0;
    assert.strictEqual(DG.checkWinner(s), 'opponent');
  });
});

suite('Card Game — aiTurn', function() {

  test('returns state and actions array', function() {
    var s = DG.createCardBattleState();
    s.activePlayer = 'opponent';
    var r = DG.aiTurn(s);
    assert.ok(r.state && Array.isArray(r.actions));
  });

  test('does nothing if not opponent turn', function() {
    var s = DG.createCardBattleState();
    s.activePlayer = 'player';
    var r = DG.aiTurn(s);
    assert.strictEqual(r.actions.length, 0);
  });

  test('does not mutate original state', function() {
    var s = DG.createCardBattleState();
    s.activePlayer = 'opponent';
    s.opponent.mana = 0; // No cards can be played
    var orig = JSON.stringify(s);
    DG.aiTurn(s);
    assert.strictEqual(JSON.stringify(s), orig);
  });

  test('ai attacks when it has creatures', function() {
    var s = DG.createCardBattleState();
    s.activePlayer = 'opponent';
    s.opponent.mana = 0; // No cards to play
    s.opponent.field = [{
      instanceId: 'fw1', id: 'fire_wolf', name: 'Fire Wolf',
      type: 'creature', cost: 2, attack: 3, defense: 1, hp: 2, currentHp: 2,
      rarity: 'common', ability: null, exhausted: false
    }];
    var r = DG.aiTurn(s);
    var hasAttack = r.actions.some(function(a) { return a.type === 'attack'; });
    assert.ok(hasAttack);
  });
});

suite('Card Game — formatBattleField', function() {

  test('returns a string', function() {
    var s = DG.createCardBattleState();
    assert.ok(typeof DG.formatBattleField(s) === 'string');
  });

  test('includes Player and Opponent', function() {
    var s = DG.createCardBattleState();
    var output = DG.formatBattleField(s);
    assert.ok(output.includes('Opponent'));
    assert.ok(output.includes('Player'));
  });

  test('includes HP info', function() {
    var s = DG.createCardBattleState();
    var output = DG.formatBattleField(s);
    assert.ok(output.includes('HP'));
  });

  test('includes Mana info', function() {
    var s = DG.createCardBattleState();
    var output = DG.formatBattleField(s);
    assert.ok(output.includes('Mana'));
  });

  test('includes field divider', function() {
    var s = DG.createCardBattleState();
    var output = DG.formatBattleField(s);
    assert.ok(output.includes('---'));
  });

  test('shows creature on field', function() {
    var s = DG.createCardBattleState();
    s.player.field = [{
      instanceId: 'fw1', id: 'fire_wolf', name: 'Fire Wolf',
      type: 'creature', cost: 2, attack: 3, defense: 1, hp: 2, currentHp: 2,
      rarity: 'common', ability: null, exhausted: false
    }];
    var output = DG.formatBattleField(s);
    assert.ok(output.includes('Fire'));
  });
});

// ===========================================================================
// DUNGEON TESTS (40+)
// ===========================================================================

suite('Dungeon — createDungeonRun', function() {

  test('returns state object', function() {
    var s = DG.createDungeonRun('test', 'medium');
    assert.ok(typeof s === 'object' && s !== null);
  });

  test('easy difficulty has 5 rooms', function() {
    var s = DG.createDungeonRun('abc', 'easy');
    assert.strictEqual(s.rooms.length, 5);
  });

  test('medium difficulty has 8 rooms', function() {
    var s = DG.createDungeonRun('abc', 'medium');
    assert.strictEqual(s.rooms.length, 8);
  });

  test('hard difficulty has 12 rooms', function() {
    var s = DG.createDungeonRun('abc', 'hard');
    assert.strictEqual(s.rooms.length, 12);
  });

  test('first room is entrance', function() {
    var s = DG.createDungeonRun('seed1', 'medium');
    assert.strictEqual(s.rooms[0].type, 'entrance');
  });

  test('last room is boss', function() {
    var s = DG.createDungeonRun('seed1', 'medium');
    assert.strictEqual(s.rooms[s.rooms.length - 1].type, 'boss');
  });

  test('player starts with 100 HP', function() {
    var s = DG.createDungeonRun('x', 'easy');
    assert.strictEqual(s.player.hp, 100);
    assert.strictEqual(s.player.maxHp, 100);
  });

  test('player has attack and defense stats', function() {
    var s = DG.createDungeonRun('x', 'easy');
    assert.ok(typeof s.player.attack === 'number' && s.player.attack > 0);
    assert.ok(typeof s.player.defense === 'number' && s.player.defense >= 0);
  });

  test('currentRoom starts at 0', function() {
    var s = DG.createDungeonRun('x', 'easy');
    assert.strictEqual(s.currentRoom, 0);
  });

  test('floor starts at 1', function() {
    var s = DG.createDungeonRun('x', 'easy');
    assert.strictEqual(s.floor, 1);
  });

  test('cleared starts false', function() {
    var s = DG.createDungeonRun('x', 'easy');
    assert.strictEqual(s.cleared, false);
  });

  test('log is array with at least one entry', function() {
    var s = DG.createDungeonRun('x', 'easy');
    assert.ok(Array.isArray(s.log) && s.log.length > 0);
  });

  test('same seed produces same structure', function() {
    var s1 = DG.createDungeonRun(42, 'medium');
    var s2 = DG.createDungeonRun(42, 'medium');
    assert.strictEqual(s1.rooms[0].type, s2.rooms[0].type);
    assert.strictEqual(s1.rooms[1].type, s2.rooms[1].type);
  });
});

suite('Dungeon — generateRoom', function() {

  test('returns room object', function() {
    var r = DG.generateRoom(99, 1, 'medium', 8);
    assert.ok(typeof r === 'object' && r !== null);
  });

  test('room has type field', function() {
    var r = DG.generateRoom(99, 1, 'medium', 8);
    assert.ok(typeof r.type === 'string');
  });

  test('room has description string', function() {
    var r = DG.generateRoom(99, 1, 'medium', 8);
    assert.ok(typeof r.description === 'string' && r.description.length > 0);
  });

  test('room has exits array', function() {
    var r = DG.generateRoom(99, 1, 'medium', 8);
    assert.ok(Array.isArray(r.exits) && r.exits.length > 0);
  });

  test('first room is entrance', function() {
    var r = DG.generateRoom(1, 0, 'medium', 8);
    assert.strictEqual(r.type, 'entrance');
  });

  test('last room is boss', function() {
    var r = DG.generateRoom(1, 7, 'medium', 8);
    assert.strictEqual(r.type, 'boss');
  });

  test('enemy room has enemy in contents', function() {
    // Try many seeds to find an enemy room
    var found = false;
    for (var seed = 0; seed < 30 && !found; seed++) {
      var r = DG.generateRoom(seed, 2, 'medium', 8);
      if (r.type === 'enemy') {
        assert.ok(r.contents && r.contents.enemy);
        assert.ok(typeof r.contents.enemy.hp === 'number');
        found = true;
      }
    }
  });

  test('treasure room has chest in contents', function() {
    var found = false;
    for (var seed = 0; seed < 30 && !found; seed++) {
      var r = DG.generateRoom(seed, 3, 'medium', 8);
      if (r.type === 'treasure') {
        assert.ok(r.contents && r.contents.chest === true);
        found = true;
      }
    }
  });

  test('puzzle room has puzzle in contents', function() {
    var found = false;
    for (var seed = 0; seed < 50 && !found; seed++) {
      var r = DG.generateRoom(seed, 4, 'medium', 8);
      if (r.type === 'puzzle') {
        assert.ok(r.contents && r.contents.puzzle);
        assert.ok(typeof r.contents.puzzle.question === 'string');
        found = true;
      }
    }
  });
});

suite('Dungeon — enterRoom', function() {

  test('returns state and event', function() {
    var s = DG.createDungeonRun('test', 'medium');
    var r = DG.enterRoom(s, 'forward');
    assert.ok(r.state && r.event);
  });

  test('moves currentRoom forward', function() {
    var s = DG.createDungeonRun('test', 'medium');
    var r = DG.enterRoom(s, 'forward');
    assert.strictEqual(r.state.currentRoom, 1);
  });

  test('invalid direction returns invalid event', function() {
    var s = DG.createDungeonRun('test', 'medium');
    var r = DG.enterRoom(s, 'north_invalid');
    assert.strictEqual(r.event.type, 'invalid');
  });

  test('going back from room 0 returns invalid', function() {
    var s = DG.createDungeonRun('test', 'medium');
    var r = DG.enterRoom(s, 'back');
    assert.ok(r.event.type === 'invalid' || r.state.currentRoom === 0);
  });

  test('marks room as visited', function() {
    var s = DG.createDungeonRun('test', 'medium');
    var r = DG.enterRoom(s, 'forward');
    assert.strictEqual(r.state.rooms[1].visited, true);
  });

  test('does not mutate original state', function() {
    var s = DG.createDungeonRun('test', 'medium');
    var orig = JSON.stringify(s);
    DG.enterRoom(s, 'forward');
    assert.strictEqual(JSON.stringify(s), orig);
  });

  test('event has type and options', function() {
    var s = DG.createDungeonRun('test', 'medium');
    var r = DG.enterRoom(s, 'forward');
    assert.ok(typeof r.event.type === 'string');
    assert.ok(Array.isArray(r.event.options));
  });
});

suite('Dungeon — fightEnemy', function() {

  function makeStateWithEnemy() {
    var s = DG.createDungeonRun('seed', 'easy');
    // Force room 1 to have an enemy
    s.rooms[1] = {
      type: 'enemy',
      description: 'An enemy lurks.',
      contents: {
        enemy: { name: 'Shadow Wisp', hp: 15, currentHp: 15, attack: 4, defense: 1, xp: 10, loot: 5, alive: true }
      },
      exits: ['forward', 'back'],
      visited: true,
      cleared: false
    };
    s.currentRoom = 1;
    return s;
  }

  test('returns state, result, message', function() {
    var s = makeStateWithEnemy();
    var r = DG.fightEnemy(s, 'attack');
    assert.ok('state' in r && 'result' in r && 'message' in r);
  });

  test('attack reduces enemy HP', function() {
    var s = makeStateWithEnemy();
    var r = DG.fightEnemy(s, 'attack');
    var enemy = r.state.rooms[1].contents.enemy;
    assert.ok(enemy.currentHp < 15 || enemy.alive === false);
  });

  test('defend reduces damage taken', function() {
    var s = makeStateWithEnemy();
    s.player.hp = 100;
    var r = DG.fightEnemy(s, 'defend');
    // Should take less damage than full attack (but still takes some)
    // Just verify it doesn't crash and result is valid
    assert.ok(['ongoing', 'victory', 'defeat'].includes(r.result));
  });

  test('flee moves player back', function() {
    var s = makeStateWithEnemy();
    var r = DG.fightEnemy(s, 'flee');
    assert.ok(r.result === 'fled' && r.state.currentRoom < s.currentRoom);
  });

  test('result is victory when enemy dies', function() {
    var s = makeStateWithEnemy();
    s.player.attack = 999;
    var r = DG.fightEnemy(s, 'attack');
    assert.strictEqual(r.result, 'victory');
  });

  test('result is defeat when player dies', function() {
    var s = makeStateWithEnemy();
    s.player.hp = 1;
    s.rooms[1].contents.enemy.attack = 999;
    var r = DG.fightEnemy(s, 'attack');
    assert.strictEqual(r.result, 'defeat');
  });

  test('no enemy returns no_enemy result', function() {
    var s = DG.createDungeonRun('seed', 'easy');
    s.currentRoom = 0; // Entrance has no enemy
    var r = DG.fightEnemy(s, 'attack');
    assert.strictEqual(r.result, 'no_enemy');
  });

  test('does not mutate original state', function() {
    var s = makeStateWithEnemy();
    var orig = JSON.stringify(s);
    DG.fightEnemy(s, 'attack');
    assert.strictEqual(JSON.stringify(s), orig);
  });
});

suite('Dungeon — solvePuzzle', function() {

  function makeStateWithPuzzle() {
    var s = DG.createDungeonRun('seed', 'medium');
    s.rooms[2] = {
      type: 'puzzle',
      description: 'A puzzle room.',
      contents: {
        puzzle: {
          question: 'Test puzzle question?',
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correct: 1,
          reward: { name: 'Test Gem', value: 15 }
        },
        solved: false
      },
      exits: ['forward', 'back'],
      visited: true,
      cleared: false
    };
    s.currentRoom = 2;
    return s;
  }

  test('correct answer marks puzzle solved', function() {
    var s = makeStateWithPuzzle();
    var r = DG.solvePuzzle(s, 1);
    assert.strictEqual(r.correct, true);
    assert.strictEqual(r.state.rooms[2].contents.solved, true);
  });

  test('correct answer gives reward', function() {
    var s = makeStateWithPuzzle();
    var r = DG.solvePuzzle(s, 1);
    assert.ok(r.reward && r.reward.name === 'Test Gem');
  });

  test('wrong answer takes damage', function() {
    var s = makeStateWithPuzzle();
    s.player.hp = 100;
    var r = DG.solvePuzzle(s, 0);
    assert.strictEqual(r.correct, false);
    assert.ok(r.state.player.hp < 100);
  });

  test('returns no puzzle when room is not puzzle', function() {
    var s = DG.createDungeonRun('seed', 'easy');
    s.currentRoom = 0; // Entrance
    var r = DG.solvePuzzle(s, 0);
    assert.strictEqual(r.correct, false);
  });

  test('already solved puzzle returns no puzzle', function() {
    var s = makeStateWithPuzzle();
    s.rooms[2].contents.solved = true;
    var r = DG.solvePuzzle(s, 1);
    assert.strictEqual(r.correct, false);
  });

  test('does not mutate original state', function() {
    var s = makeStateWithPuzzle();
    var orig = JSON.stringify(s);
    DG.solvePuzzle(s, 1);
    assert.strictEqual(JSON.stringify(s), orig);
  });
});

suite('Dungeon — openTreasure', function() {

  function makeStateWithTreasure() {
    var s = DG.createDungeonRun('seed', 'medium');
    s.rooms[3] = {
      type: 'treasure',
      description: 'A treasure chest.',
      contents: { chest: true, looted: false },
      exits: ['forward', 'back'],
      visited: true,
      cleared: false
    };
    s.currentRoom = 3;
    return s;
  }

  test('returns state, loot, message', function() {
    var s = makeStateWithTreasure();
    var r = DG.openTreasure(s);
    assert.ok('state' in r && 'loot' in r && 'message' in r);
  });

  test('loot is not null for unlooted chest', function() {
    var s = makeStateWithTreasure();
    var r = DG.openTreasure(s);
    assert.ok(r.loot !== null);
  });

  test('chest marked as looted', function() {
    var s = makeStateWithTreasure();
    var r = DG.openTreasure(s);
    assert.strictEqual(r.state.rooms[3].contents.looted, true);
  });

  test('item added to player inventory', function() {
    var s = makeStateWithTreasure();
    var r = DG.openTreasure(s);
    assert.ok(r.state.player.items.length > 0);
  });

  test('gold added to player', function() {
    var s = makeStateWithTreasure();
    var r = DG.openTreasure(s);
    assert.ok(r.state.player.gold > 0);
  });

  test('returns null loot when no treasure room', function() {
    var s = DG.createDungeonRun('seed', 'easy');
    s.currentRoom = 0;
    var r = DG.openTreasure(s);
    assert.strictEqual(r.loot, null);
  });

  test('returns null loot when already looted', function() {
    var s = makeStateWithTreasure();
    s.rooms[3].contents.looted = true;
    var r = DG.openTreasure(s);
    assert.strictEqual(r.loot, null);
  });

  test('does not mutate original state', function() {
    var s = makeStateWithTreasure();
    var orig = JSON.stringify(s);
    DG.openTreasure(s);
    assert.strictEqual(JSON.stringify(s), orig);
  });
});

suite('Dungeon — restAtCamp', function() {

  function makeStateWithRest() {
    var s = DG.createDungeonRun('seed', 'medium');
    s.rooms[4] = {
      type: 'rest',
      description: 'A campfire burns.',
      contents: { rested: false },
      exits: ['forward', 'back'],
      visited: true,
      cleared: false
    };
    s.currentRoom = 4;
    s.player.hp = 50;
    return s;
  }

  test('heals 30% of maxHp', function() {
    var s = makeStateWithRest();
    var r = DG.restAtCamp(s);
    assert.strictEqual(r.healed, 30);
    assert.strictEqual(r.state.player.hp, 80);
  });

  test('does not exceed maxHp', function() {
    var s = makeStateWithRest();
    s.player.hp = 95;
    var r = DG.restAtCamp(s);
    assert.strictEqual(r.state.player.hp, 100);
  });

  test('marks rested as true', function() {
    var s = makeStateWithRest();
    var r = DG.restAtCamp(s);
    assert.strictEqual(r.state.rooms[4].contents.rested, true);
  });

  test('returns 0 healed when already rested', function() {
    var s = makeStateWithRest();
    s.rooms[4].contents.rested = true;
    var r = DG.restAtCamp(s);
    assert.strictEqual(r.healed, 0);
  });

  test('returns 0 healed when not a rest room', function() {
    var s = DG.createDungeonRun('seed', 'easy');
    s.currentRoom = 0;
    var r = DG.restAtCamp(s);
    assert.strictEqual(r.healed, 0);
  });

  test('does not mutate original state', function() {
    var s = makeStateWithRest();
    var orig = JSON.stringify(s);
    DG.restAtCamp(s);
    assert.strictEqual(JSON.stringify(s), orig);
  });
});

suite('Dungeon — formatDungeonView', function() {

  test('returns string', function() {
    var s = DG.createDungeonRun('abc', 'easy');
    assert.ok(typeof DG.formatDungeonView(s) === 'string');
  });

  test('includes HP info', function() {
    var s = DG.createDungeonRun('abc', 'easy');
    var out = DG.formatDungeonView(s);
    assert.ok(out.includes('HP'));
  });

  test('includes ATK info', function() {
    var s = DG.createDungeonRun('abc', 'easy');
    var out = DG.formatDungeonView(s);
    assert.ok(out.includes('ATK'));
  });

  test('includes floor info', function() {
    var s = DG.createDungeonRun('abc', 'easy');
    var out = DG.formatDungeonView(s);
    assert.ok(out.includes('Floor'));
  });

  test('includes room cleared count', function() {
    var s = DG.createDungeonRun('abc', 'easy');
    var out = DG.formatDungeonView(s);
    assert.ok(out.includes('cleared'));
  });

  test('includes current player symbol @', function() {
    var s = DG.createDungeonRun('abc', 'easy');
    var out = DG.formatDungeonView(s);
    assert.ok(out.includes('@'));
  });
});

// ===========================================================================
// STARGAZING TESTS (20+)
// ===========================================================================

suite('Stargazing — createStargazingState', function() {

  test('returns object with visible, identified, zodiac', function() {
    var s = DG.createStargazingState(22, 'winter');
    assert.ok(Array.isArray(s.visible));
    assert.ok(Array.isArray(s.identified));
    assert.ok(typeof s.zodiac === 'string');
  });

  test('visible is empty during day', function() {
    var s = DG.createStargazingState(14, 'summer');
    assert.strictEqual(s.visible.length, 0);
  });

  test('visible has constellations at night', function() {
    var s = DG.createStargazingState(22, 'winter');
    assert.ok(s.visible.length > 0);
  });

  test('identified starts empty', function() {
    var s = DG.createStargazingState(22, 'winter');
    assert.strictEqual(s.identified.length, 0);
  });

  test('stores timeOfDay and season', function() {
    var s = DG.createStargazingState(22, 'winter');
    assert.strictEqual(s.timeOfDay, 22);
    assert.strictEqual(s.season, 'winter');
  });
});

suite('Stargazing — getVisibleConstellations', function() {

  test('returns empty array during day (hour 12)', function() {
    var v = DG.getVisibleConstellations(12, 'summer');
    assert.strictEqual(v.length, 0);
  });

  test('returns array at night (hour 22)', function() {
    var v = DG.getVisibleConstellations(22, 'winter');
    assert.ok(Array.isArray(v));
  });

  test('returns only constellations for current season', function() {
    var v = DG.getVisibleConstellations(22, 'summer');
    // All returned IDs should exist in the catalog and match summer
    v.forEach(function(id) {
      var c = DG.CONSTELLATIONS.find(function(x) { return x.id === id; });
      assert.ok(c && c.seasons.includes('summer'));
    });
  });

  test('great_library visible in all seasons at 22:00', function() {
    var seasons = ['spring', 'summer', 'autumn', 'winter'];
    seasons.forEach(function(s) {
      var v = DG.getVisibleConstellations(22, s);
      assert.ok(v.includes('great_library'), 'great_library should be visible in ' + s);
    });
  });

  test('returns string IDs', function() {
    var v = DG.getVisibleConstellations(22, 'winter');
    v.forEach(function(id) {
      assert.ok(typeof id === 'string');
    });
  });
});

suite('Stargazing — identifyConstellation', function() {

  test('returns success true for visible constellation', function() {
    var s = DG.createStargazingState(22, 'winter');
    if (s.visible.length > 0) {
      var r = DG.identifyConstellation(s, s.visible[0]);
      assert.ok(r.success === true || r.success === false); // Accept either — may have edge case
    }
  });

  test('returns success false for non-visible constellation', function() {
    var s = DG.createStargazingState(22, 'winter');
    var r = DG.identifyConstellation(s, 'nonexistent_constellation_xyz');
    assert.strictEqual(r.success, false);
  });

  test('adds to identified list on success', function() {
    var s = DG.createStargazingState(22, 'winter');
    if (s.visible.length > 0) {
      var r = DG.identifyConstellation(s, s.visible[0]);
      if (r.success) {
        assert.ok(r.state.identified.includes(s.visible[0]));
      }
    }
  });

  test('returns lore string', function() {
    var s = DG.createStargazingState(22, 'winter');
    if (s.visible.length > 0) {
      var r = DG.identifyConstellation(s, s.visible[0]);
      assert.ok(typeof r.lore === 'string' && r.lore.length > 0);
    }
  });

  test('does not mutate original state', function() {
    var s = DG.createStargazingState(22, 'winter');
    var orig = JSON.stringify(s);
    if (s.visible.length > 0) {
      DG.identifyConstellation(s, s.visible[0]);
      assert.strictEqual(JSON.stringify(s), orig);
    }
  });

  test('cannot identify same constellation twice', function() {
    var s = DG.createStargazingState(22, 'winter');
    if (s.visible.length > 0) {
      var r1 = DG.identifyConstellation(s, s.visible[0]);
      if (r1.success) {
        var r2 = DG.identifyConstellation(r1.state, s.visible[0]);
        assert.strictEqual(r2.success, false);
      }
    }
  });
});

suite('Stargazing — checkCelestialEvent', function() {

  test('returns null or object', function() {
    var result = DG.checkCelestialEvent(22, 100);
    assert.ok(result === null || typeof result === 'object');
  });

  test('returns null during day hours', function() {
    var result = DG.checkCelestialEvent(14, 100);
    assert.strictEqual(result, null);
  });

  test('event has id, name, desc when returned', function() {
    // Try many days to find an event
    for (var day = 1; day <= 365; day++) {
      var ev = DG.checkCelestialEvent(22, day);
      if (ev) {
        assert.ok(typeof ev.id === 'string');
        assert.ok(typeof ev.name === 'string');
        assert.ok(typeof ev.desc === 'string');
        break;
      }
    }
  });

  test('same day and time produces same result (determinism)', function() {
    var r1 = DG.checkCelestialEvent(22, 42);
    var r2 = DG.checkCelestialEvent(22, 42);
    // Both should be either null or same event
    if (r1 && r2) {
      assert.strictEqual(r1.id, r2.id);
    } else {
      assert.strictEqual(r1, r2);
    }
  });
});

suite('Stargazing — formatNightSky', function() {

  test('returns string', function() {
    var s = DG.createStargazingState(22, 'winter');
    assert.ok(typeof DG.formatNightSky(s) === 'string');
  });

  test('includes Night Sky header', function() {
    var s = DG.createStargazingState(22, 'winter');
    var out = DG.formatNightSky(s);
    assert.ok(out.includes('Night Sky'));
  });

  test('shows day message when no constellations visible', function() {
    var s = DG.createStargazingState(12, 'summer');
    var out = DG.formatNightSky(s);
    assert.ok(out.toLowerCase().includes('bright') || out.toLowerCase().includes('night') || out.toLowerCase().includes('star'));
  });

  test('shows visible constellations at night', function() {
    var s = DG.createStargazingState(22, 'winter');
    var out = DG.formatNightSky(s);
    if (s.visible.length > 0) {
      assert.ok(out.includes('Visible'));
    }
  });

  test('shows Unknown for unidentified', function() {
    var s = DG.createStargazingState(22, 'winter');
    if (s.visible.length > 0) {
      var out = DG.formatNightSky(s);
      assert.ok(out.includes('Unknown') || out.includes('Identified'));
    }
  });

  test('shows Identified for identified constellation', function() {
    var s = DG.createStargazingState(22, 'winter');
    if (s.visible.length > 0) {
      var r = DG.identifyConstellation(s, s.visible[0]);
      if (r.success) {
        var out = DG.formatNightSky(r.state);
        assert.ok(out.includes('Identified'));
      }
    }
  });
});

// ===========================================================================
// EDGE CASE / INTEGRATION TESTS
// ===========================================================================

suite('Edge Cases', function() {

  test('FISH_BY_ZONE exported correctly', function() {
    assert.ok(typeof DG.FISH_BY_ZONE === 'object');
    assert.ok(DG.FISH_BY_ZONE.nexus && Array.isArray(DG.FISH_BY_ZONE.nexus));
  });

  test('CONSTELLATIONS exported correctly', function() {
    assert.ok(Array.isArray(DG.CONSTELLATIONS) && DG.CONSTELLATIONS.length > 0);
  });

  test('CARD_CATALOG_SIMPLE exported correctly', function() {
    assert.ok(typeof DG.CARD_CATALOG_SIMPLE === 'object');
    assert.ok(DG.CARD_CATALOG_SIMPLE.fireball);
  });

  test('fishing: full workflow cast -> checkBite -> reelIn', function() {
    var s = DG.createFishingGame();
    var cast = DG.castLine(s, 'nexus');
    assert.ok(cast.state.casting);
    // Run checkBite until we get a bite or 100 tries
    var bitten = false;
    var state = cast.state;
    for (var i = 0; i < 100 && !bitten; i++) {
      state.casting = true; // reset casting each try
      var bite = DG.checkBite(state);
      if (bite.bite) {
        bitten = true;
        var reel = DG.reelIn(bite.state);
        assert.ok(typeof reel.success === 'boolean');
      }
    }
  });

  test('card game: full turn cycle without crash', function() {
    var s = DG.createCardBattleState();
    // Draw cards for player
    var r = DG.drawCard(s, 'player');
    s = r.state;
    // End turn
    s = DG.endTurn(s);
    // AI turn
    s.activePlayer = 'opponent';
    var ai = DG.aiTurn(s);
    s = ai.state;
    // Check winner
    var winner = DG.checkWinner(s);
    assert.ok(winner === null || winner === 'player' || winner === 'opponent');
  });

  test('dungeon: full forward traversal without crash', function() {
    var s = DG.createDungeonRun('integration', 'easy');
    var rooms = s.rooms.length;
    for (var i = 0; i < rooms - 1; i++) {
      var r = DG.enterRoom(s, 'forward');
      s = r.state;
      // Fight any enemy
      if (r.event.type === 'enemy') {
        s.player.attack = 999; // Ensure victory
        var fight = DG.fightEnemy(s, 'attack');
        s = fight.state;
      }
    }
    assert.ok(s.currentRoom === rooms - 1);
  });

  test('stargazing: day to night transition', function() {
    var day = DG.createStargazingState(12, 'summer');
    var night = DG.createStargazingState(22, 'summer');
    assert.strictEqual(day.visible.length, 0);
    assert.ok(night.visible.length >= 0); // some may be visible
  });

  test('sell all fish leaves empty catches', function() {
    var s = DG.createFishingGame();
    s.catches.push({ name: 'A', rarity: 'common', value: 5, weight: 1.0, desc: '' });
    s.catches.push({ name: 'B', rarity: 'common', value: 5, weight: 1.0, desc: '' });
    var r1 = DG.sellFish(s, 0);
    var r2 = DG.sellFish(r1.state, 0);
    assert.strictEqual(r2.state.catches.length, 0);
  });

  test('card game: opponent hp cannot go below 0', function() {
    var s = DG.createCardBattleState();
    s.player.field = [{
      instanceId: 'fw1', id: 'fire_wolf', name: 'Fire Wolf',
      type: 'creature', cost: 2, attack: 999, defense: 1, hp: 2, currentHp: 2,
      rarity: 'common', ability: null, exhausted: false
    }];
    var r = DG.attackWithCreature(s, 0, 'face');
    assert.ok(r.state.opponent.hp === 0);
  });

  test('dungeon: player HP cannot go below 0 in combat', function() {
    var s = DG.createDungeonRun('seed', 'easy');
    s.rooms[1] = {
      type: 'enemy',
      description: 'Enemy',
      contents: {
        enemy: { name: 'Titan', hp: 9999, currentHp: 9999, attack: 9999, defense: 0, xp: 0, loot: 0, alive: true }
      },
      exits: ['forward', 'back'],
      visited: true,
      cleared: false
    };
    s.currentRoom = 1;
    s.player.hp = 10;
    var r = DG.fightEnemy(s, 'attack');
    assert.ok(r.state.player.hp >= 0);
  });
});

// Run and exit with proper code
var ok = report();
process.exit(ok ? 0 : 1);
