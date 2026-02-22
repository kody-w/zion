/**
 * tests/test_card_game.js
 * Comprehensive tests for the ZION Trading Card Game system
 * 80+ tests covering all exported functions and edge cases
 */

'use strict';

const { test, suite, report, assert } = require('./test_runner');
const CardGame = require('../src/js/card_game');

// ============================================================================
// HELPERS
// ============================================================================

var playerSeq = 0;
function uid() { return 'tcg_player_' + (++playerSeq); }

/** Build a minimal valid deck (20 cards, no more than 3 copies of any card) */
function makeMinDeck(playerId) {
  var cards = [];
  // 8 fire creatures, 4 water creatures (element < 80%)
  for (var i = 0; i < 3; i++) cards.push('c_ember_sprite');
  for (var i = 0; i < 3; i++) cards.push('c_fire_wolf');
  for (var i = 0; i < 2; i++) cards.push('c_salamander_knight');
  // water
  for (var i = 0; i < 2; i++) cards.push('c_tide_caller');
  for (var i = 0; i < 2; i++) cards.push('c_frost_wisp');
  // spells
  for (var i = 0; i < 3; i++) cards.push('s_fireball');
  for (var i = 0; i < 3; i++) cards.push('s_lightning_bolt');
  for (var i = 0; i < 2; i++) cards.push('s_mending_waters');
  return CardGame.createDeck(playerId, 'Min Deck', cards);
}

/** Build a 30-card deck with a mix of card types */
function makeMedDeck(playerId) {
  var cards = [];
  // Creatures (15): mix of elements
  for (var i = 0; i < 3; i++) cards.push('c_fire_wolf');
  for (var i = 0; i < 3; i++) cards.push('c_tide_caller');
  for (var i = 0; i < 3; i++) cards.push('c_stone_golem');
  for (var i = 0; i < 3; i++) cards.push('c_wind_dancer');
  for (var i = 0; i < 3; i++) cards.push('c_spirit_guide');
  // Spells (10)
  for (var i = 0; i < 2; i++) cards.push('s_fireball');
  for (var i = 0; i < 2; i++) cards.push('s_lightning_bolt');
  for (var i = 0; i < 2; i++) cards.push('s_mending_waters');
  for (var i = 0; i < 2; i++) cards.push('s_gale_force');
  for (var i = 0; i < 2; i++) cards.push('s_frost_nova');
  // Traps (3)
  cards.push('tr_ambush');
  cards.push('tr_pit_trap');
  cards.push('tr_decoy');
  // Equipment (2)
  cards.push('e_flame_sword');
  cards.push('e_frost_shield');
  return CardGame.createDeck(playerId, 'Med Deck', cards);
}

// ============================================================================
// SUITE 1 — Card Catalog
// ============================================================================
suite('Card Catalog', function() {

  test('CARD_CATALOG is exported and is an object', function() {
    assert(typeof CardGame.CARD_CATALOG === 'object' && CardGame.CARD_CATALOG !== null,
      'CARD_CATALOG must be an object');
  });

  test('CARD_CATALOG has at least 60 cards', function() {
    var count = Object.keys(CardGame.CARD_CATALOG).length;
    assert(count >= 60, 'Expected >= 60 cards, got ' + count);
  });

  test('every card has required fields', function() {
    var required = ['id', 'name', 'type', 'rarity', 'cost', 'element', 'ability_text', 'art_description'];
    for (var id in CardGame.CARD_CATALOG) {
      var card = CardGame.CARD_CATALOG[id];
      for (var r = 0; r < required.length; r++) {
        var f = required[r];
        assert(card[f] !== undefined && card[f] !== null && card[f] !== '',
          'Card ' + id + ' missing field: ' + f);
      }
    }
  });

  test('every card id matches its catalog key', function() {
    for (var id in CardGame.CARD_CATALOG) {
      assert(CardGame.CARD_CATALOG[id].id === id,
        'Card id mismatch: key=' + id + ' card.id=' + CardGame.CARD_CATALOG[id].id);
    }
  });

  test('every card has valid rarity', function() {
    for (var id in CardGame.CARD_CATALOG) {
      var r = CardGame.CARD_CATALOG[id].rarity;
      assert(CardGame.RARITIES.indexOf(r) !== -1, 'Card ' + id + ' has invalid rarity: ' + r);
    }
  });

  test('every card has valid type', function() {
    for (var id in CardGame.CARD_CATALOG) {
      var t = CardGame.CARD_CATALOG[id].type;
      assert(CardGame.CARD_TYPES.indexOf(t) !== -1, 'Card ' + id + ' has invalid type: ' + t);
    }
  });

  test('every card has valid element', function() {
    for (var id in CardGame.CARD_CATALOG) {
      var e = CardGame.CARD_CATALOG[id].element;
      assert(CardGame.ELEMENTS.indexOf(e) !== -1, 'Card ' + id + ' has invalid element: ' + e);
    }
  });

  test('every card has non-negative cost', function() {
    for (var id in CardGame.CARD_CATALOG) {
      var c = CardGame.CARD_CATALOG[id].cost;
      assert(typeof c === 'number' && c >= 0, 'Card ' + id + ' has invalid cost: ' + c);
    }
  });

  test('at least 20 creature cards', function() {
    var creatures = CardGame.getCardsByType('creature');
    assert(creatures.length >= 20, 'Expected >= 20 creatures, got ' + creatures.length);
  });

  test('at least 15 spell cards', function() {
    var spells = CardGame.getCardsByType('spell');
    assert(spells.length >= 15, 'Expected >= 15 spells, got ' + spells.length);
  });

  test('at least 10 trap cards', function() {
    var traps = CardGame.getCardsByType('trap');
    assert(traps.length >= 10, 'Expected >= 10 traps, got ' + traps.length);
  });

  test('at least 10 equipment cards', function() {
    var equip = CardGame.getCardsByType('equipment');
    assert(equip.length >= 10, 'Expected >= 10 equipment, got ' + equip.length);
  });

  test('at least 5 legendary cards', function() {
    var legendaries = CardGame.getCardsByRarity('legendary');
    assert(legendaries.length >= 5, 'Expected >= 5 legendaries, got ' + legendaries.length);
  });

  test('creature cards have attack, defense, hp fields', function() {
    var creatures = CardGame.getCardsByType('creature');
    for (var i = 0; i < creatures.length; i++) {
      var c = creatures[i];
      assert(typeof c.attack === 'number', c.id + ' creature missing attack');
      assert(typeof c.defense === 'number', c.id + ' creature missing defense');
      assert(typeof c.hp === 'number' && c.hp > 0, c.id + ' creature missing valid hp');
    }
  });

  test('trap cards have trigger and effect fields', function() {
    var traps = CardGame.getCardsByType('trap');
    for (var i = 0; i < traps.length; i++) {
      var t = traps[i];
      assert(typeof t.trigger === 'string' && t.trigger.length > 0, t.id + ' trap missing trigger');
      assert(typeof t.effect === 'string' && t.effect.length > 0, t.id + ' trap missing effect');
    }
  });

  test('equipment cards have stat_boost field', function() {
    var equip = CardGame.getCardsByType('equipment');
    for (var i = 0; i < equip.length; i++) {
      var e = equip[i];
      assert(typeof e.stat_boost === 'object' && e.stat_boost !== null,
        e.id + ' equipment missing stat_boost');
    }
  });

  test('legendary cards are rarity legendary', function() {
    var legCards = CardGame.getCardsByType('legendary');
    for (var i = 0; i < legCards.length; i++) {
      assert(legCards[i].rarity === 'legendary',
        legCards[i].id + ' legendary type card must have legendary rarity');
    }
  });

});

// ============================================================================
// SUITE 2 — Catalog Filters
// ============================================================================
suite('Catalog Filters', function() {

  test('getCardsByElement returns only cards of that element', function() {
    var fireCards = CardGame.getCardsByElement('fire');
    assert(fireCards.length > 0, 'No fire cards found');
    for (var i = 0; i < fireCards.length; i++) {
      assert(fireCards[i].element === 'fire', 'Non-fire card in fire results: ' + fireCards[i].id);
    }
  });

  test('getCardsByElement works for all 5 elements', function() {
    var elements = CardGame.ELEMENTS;
    for (var i = 0; i < elements.length; i++) {
      var cards = CardGame.getCardsByElement(elements[i]);
      assert(cards.length > 0, 'No cards found for element: ' + elements[i]);
    }
  });

  test('getCardsByType returns only cards of that type', function() {
    var spells = CardGame.getCardsByType('spell');
    for (var i = 0; i < spells.length; i++) {
      assert(spells[i].type === 'spell', 'Non-spell in spell results: ' + spells[i].id);
    }
  });

  test('getCardsByRarity returns only cards of that rarity', function() {
    var commons = CardGame.getCardsByRarity('common');
    assert(commons.length > 0, 'No common cards');
    for (var i = 0; i < commons.length; i++) {
      assert(commons[i].rarity === 'common', 'Non-common in common results');
    }
  });

  test('getCardsByElement with unknown element returns empty array', function() {
    var result = CardGame.getCardsByElement('dark');
    assert(Array.isArray(result) && result.length === 0, 'Expected empty array for unknown element');
  });

  test('getCardsByType with unknown type returns empty array', function() {
    var result = CardGame.getCardsByType('vehicle');
    assert(Array.isArray(result) && result.length === 0, 'Expected empty array for unknown type');
  });

});

// ============================================================================
// SUITE 3 — Deck Building
// ============================================================================
suite('Deck Building', function() {

  test('createDeck returns deck object with id, playerId, name, cards', function() {
    var p = uid();
    var deck = CardGame.createDeck(p, 'My Test Deck', ['c_fire_wolf', 'c_ember_sprite']);
    assert(typeof deck.id === 'string', 'Deck must have id');
    assert(deck.playerId === p, 'Deck must have correct playerId');
    assert(deck.name === 'My Test Deck', 'Deck must have correct name');
    assert(Array.isArray(deck.cards), 'Deck cards must be array');
    assert(deck.cards.length === 2, 'Deck must have 2 cards');
  });

  test('createDeck with empty cards returns empty deck', function() {
    var p = uid();
    var deck = CardGame.createDeck(p, 'Empty', []);
    assert(deck.cards.length === 0, 'Should have 0 cards');
  });

  test('createDeck defaults name if not provided', function() {
    var p = uid();
    var deck = CardGame.createDeck(p, null, []);
    assert(typeof deck.name === 'string' && deck.name.length > 0, 'Should have default name');
  });

  test('validateDeck valid deck returns valid:true', function() {
    var p = uid();
    var deck = makeMinDeck(p);
    var result = CardGame.validateDeck(deck);
    assert(result.valid === true, 'Valid deck should pass: ' + JSON.stringify(result.errors));
  });

  test('validateDeck deck under minimum returns valid:false', function() {
    var p = uid();
    var deck = CardGame.createDeck(p, 'Too Small', ['c_fire_wolf', 'c_ember_sprite']);
    var result = CardGame.validateDeck(deck);
    assert(result.valid === false, 'Under-minimum deck should fail');
    assert(result.errors.some(function(e) { return e.includes('minimum'); }),
      'Should mention minimum: ' + result.errors);
  });

  test('validateDeck deck over maximum returns valid:false', function() {
    var p = uid();
    var cards = [];
    for (var i = 0; i < 41; i++) cards.push('c_ember_sprite');
    var deck = CardGame.createDeck(p, 'Too Big', cards);
    var result = CardGame.validateDeck(deck);
    assert(result.valid === false, 'Over-maximum deck should fail');
    assert(result.errors.some(function(e) { return e.includes('maximum'); }),
      'Should mention maximum: ' + result.errors);
  });

  test('validateDeck too many copies fails', function() {
    var p = uid();
    var cards = [];
    // 4 copies of ember_sprite — over limit of 3
    for (var i = 0; i < 4; i++) cards.push('c_ember_sprite');
    // fill to 20
    for (var i = 0; i < 16; i++) cards.push('c_fire_wolf');
    var deck = CardGame.createDeck(p, 'Too Many', cards);
    var result = CardGame.validateDeck(deck);
    assert(result.valid === false, 'Too many copies should fail');
  });

  test('validateDeck max 1 copy of legendary', function() {
    var p = uid();
    var cards = [];
    cards.push('l_zion_avatar');
    cards.push('l_zion_avatar');  // 2 copies — should fail
    for (var i = 0; i < 18; i++) cards.push('c_ember_sprite');
    var deck = CardGame.createDeck(p, 'Two Legends', cards);
    var result = CardGame.validateDeck(deck);
    assert(result.valid === false, 'Two legendary copies should fail');
  });

  test('validateDeck element imbalance fails (>80% single element)', function() {
    var p = uid();
    var cards = [];
    // 18 fire creatures out of 18 total creatures = 100%
    for (var i = 0; i < 3; i++) cards.push('c_ember_sprite');
    for (var i = 0; i < 3; i++) cards.push('c_fire_wolf');
    for (var i = 0; i < 3; i++) cards.push('c_salamander_knight');
    for (var i = 0; i < 3; i++) cards.push('c_phoenix_fledgling');
    for (var i = 0; i < 3; i++) cards.push('c_magma_wyrm');
    for (var i = 0; i < 3; i++) cards.push('c_lava_titan');
    // No spells or other elements
    var deck = CardGame.createDeck(p, 'All Fire', cards);
    var result = CardGame.validateDeck(deck);
    assert(result.valid === false, 'All-fire creature deck should fail element balance');
  });

  test('validateDeck unknown card id returns error', function() {
    var p = uid();
    var cards = [];
    cards.push('nonexistent_card_xyz');
    for (var i = 0; i < 19; i++) cards.push('c_ember_sprite');
    var deck = CardGame.createDeck(p, 'Bad Card', cards);
    var result = CardGame.validateDeck(deck);
    assert(result.valid === false, 'Unknown card should fail');
  });

  test('validateDeck null/invalid input returns valid:false', function() {
    var result = CardGame.validateDeck(null);
    assert(result.valid === false, 'Null deck should fail');
  });

  test('validateDeck errors is always an array', function() {
    var result = CardGame.validateDeck(null);
    assert(Array.isArray(result.errors), 'Errors must be array');
  });

});

// ============================================================================
// SUITE 4 — Collection Management
// ============================================================================
suite('Collection Management', function() {

  test('getPlayerCollection returns empty object for new player', function() {
    var p = uid();
    var col = CardGame.getPlayerCollection(p);
    assert(typeof col === 'object' && Object.keys(col).length === 0,
      'New player collection should be empty');
  });

  test('addCardToCollection adds card and returns count', function() {
    var p = uid();
    var result = CardGame.addCardToCollection(p, 'c_fire_wolf');
    assert(result.success === true, 'Should succeed');
    assert(result.cardId === 'c_fire_wolf', 'Card id should match');
    assert(result.count === 1, 'Count should be 1');
  });

  test('addCardToCollection increments count on duplicate', function() {
    var p = uid();
    CardGame.addCardToCollection(p, 'c_fire_wolf');
    var result = CardGame.addCardToCollection(p, 'c_fire_wolf');
    assert(result.count === 2, 'Count should be 2 after second add');
  });

  test('getPlayerCollection reflects added cards', function() {
    var p = uid();
    CardGame.addCardToCollection(p, 'c_ember_sprite');
    CardGame.addCardToCollection(p, 'c_ember_sprite');
    CardGame.addCardToCollection(p, 's_fireball');
    var col = CardGame.getPlayerCollection(p);
    assert(col['c_ember_sprite'] === 2, 'Should have 2 ember sprites');
    assert(col['s_fireball'] === 1, 'Should have 1 fireball');
  });

  test('addCardToCollection with unknown cardId returns error', function() {
    var p = uid();
    var result = CardGame.addCardToCollection(p, 'nonexistent_xyz');
    assert(result.success === false, 'Should fail for unknown card');
    assert(typeof result.error === 'string', 'Should have error message');
  });

  test('addCardToCollection returns card definition', function() {
    var p = uid();
    var result = CardGame.addCardToCollection(p, 'c_fire_wolf');
    assert(result.card !== undefined, 'Should include card definition');
    assert(result.card.name === 'Fire Wolf', 'Card definition should be correct');
  });

  test('getPlayerCollection returns a copy not a reference', function() {
    var p = uid();
    CardGame.addCardToCollection(p, 'c_fire_wolf');
    var col1 = CardGame.getPlayerCollection(p);
    col1['c_fire_wolf'] = 999;
    var col2 = CardGame.getPlayerCollection(p);
    assert(col2['c_fire_wolf'] === 1, 'Modifying returned collection should not affect stored data');
  });

  test('generateCardFromAchievement returns card for known achievement', function() {
    var card = CardGame.generateCardFromAchievement('first_battle');
    assert(card !== null && typeof card === 'object', 'Should return card');
    assert(typeof card.id === 'string', 'Card should have id');
  });

  test('generateCardFromAchievement returns card for unknown achievement', function() {
    var card = CardGame.generateCardFromAchievement('totally_unknown_achievement_xyz');
    assert(card !== null && typeof card === 'object', 'Should return a default card');
  });

  test('generateCardFromAchievement legendary_win returns legendary card', function() {
    var card = CardGame.generateCardFromAchievement('legendary_win');
    assert(card !== null, 'Should return a card');
    assert(card.rarity === 'legendary' || card.type === 'legendary',
      'Should return legendary card for legendary_win');
  });

});

// ============================================================================
// SUITE 5 — Battle Setup
// ============================================================================
suite('Battle Setup', function() {

  test('startBattle returns valid battle state', function() {
    var p1 = uid();
    var p2 = uid();
    var d1 = makeMinDeck(p1);
    var d2 = makeMinDeck(p2);
    var state = CardGame.startBattle(d1, d2);
    assert(typeof state === 'object', 'Battle state must be object');
    assert(typeof state.id === 'string', 'Battle must have id');
    assert(state.turn === 1, 'Should start on turn 1');
    assert(typeof state.activePlayer === 'string', 'Must have active player');
    assert(state.winner === null, 'Winner must be null at start');
  });

  test('startBattle creates player states for both players', function() {
    var p1 = uid();
    var p2 = uid();
    var state = CardGame.startBattle(makeMinDeck(p1), makeMinDeck(p2));
    assert(state.players[p1] !== undefined, 'Player 1 state must exist');
    assert(state.players[p2] !== undefined, 'Player 2 state must exist');
  });

  test('startBattle both players start with STARTING_HP', function() {
    var p1 = uid();
    var p2 = uid();
    var state = CardGame.startBattle(makeMinDeck(p1), makeMinDeck(p2));
    assert(state.players[p1].hp === CardGame.STARTING_HP,
      'P1 should start with ' + CardGame.STARTING_HP + ' HP');
    assert(state.players[p2].hp === CardGame.STARTING_HP,
      'P2 should start with ' + CardGame.STARTING_HP + ' HP');
  });

  test('startBattle both players have starting hand', function() {
    var p1 = uid();
    var p2 = uid();
    var state = CardGame.startBattle(makeMinDeck(p1), makeMinDeck(p2));
    assert(state.players[p1].hand.length === CardGame.STARTING_HAND,
      'P1 should have ' + CardGame.STARTING_HAND + ' cards in hand');
    assert(state.players[p2].hand.length === CardGame.STARTING_HAND,
      'P2 should have ' + CardGame.STARTING_HAND + ' cards in hand');
  });

  test('startBattle players have no creatures on field', function() {
    var p1 = uid();
    var p2 = uid();
    var state = CardGame.startBattle(makeMinDeck(p1), makeMinDeck(p2));
    assert(state.players[p1].field.length === 0, 'P1 field should be empty');
    assert(state.players[p2].field.length === 0, 'P2 field should be empty');
  });

  test('startBattle trap zones are initialized for both players', function() {
    var p1 = uid();
    var p2 = uid();
    var state = CardGame.startBattle(makeMinDeck(p1), makeMinDeck(p2));
    assert(Array.isArray(state.trapZone[p1]), 'P1 trap zone should be array');
    assert(Array.isArray(state.trapZone[p2]), 'P2 trap zone should be array');
  });

  test('startBattle log contains start event', function() {
    var p1 = uid();
    var p2 = uid();
    var state = CardGame.startBattle(makeMinDeck(p1), makeMinDeck(p2));
    assert(Array.isArray(state.log) && state.log.length > 0, 'Log should have at least 1 event');
  });

});

// ============================================================================
// SUITE 6 — Drawing Cards
// ============================================================================
suite('Drawing Cards', function() {

  test('drawCard succeeds and returns card info', function() {
    var p1 = uid();
    var p2 = uid();
    var state = CardGame.startBattle(makeMinDeck(p1), makeMedDeck(p2));
    var deckSizeBefore = state.players[p1].deck.length;
    var handSizeBefore = state.players[p1].hand.length;
    var result = CardGame.drawCard(state, p1);
    assert(result.success === true, 'Draw should succeed: ' + result.error);
    assert(state.players[p1].hand.length === handSizeBefore + 1, 'Hand should grow by 1');
    assert(state.players[p1].deck.length === deckSizeBefore - 1, 'Deck should shrink by 1');
  });

  test('drawCard returns the drawn card id and definition', function() {
    var p1 = uid();
    var p2 = uid();
    var state = CardGame.startBattle(makeMinDeck(p1), makeMedDeck(p2));
    var result = CardGame.drawCard(state, p1);
    assert(typeof result.cardId === 'string', 'Should return cardId');
    assert(typeof result.card === 'object', 'Should return card definition');
  });

  test('drawCard fails for unknown player', function() {
    var p1 = uid();
    var p2 = uid();
    var state = CardGame.startBattle(makeMinDeck(p1), makeMedDeck(p2));
    var result = CardGame.drawCard(state, 'nonexistent_player');
    assert(result.success === false, 'Should fail for unknown player');
  });

  test('drawCard causes fatigue on empty deck', function() {
    var p1 = uid();
    var p2 = uid();
    var state = CardGame.startBattle(makeMinDeck(p1), makeMinDeck(p2));
    // Empty the deck
    state.players[p1].deck = [];
    var hpBefore = state.players[p1].hp;
    CardGame.drawCard(state, p1);
    assert(state.players[p1].hp < hpBefore, 'Should take fatigue damage on empty deck draw');
  });

});

// ============================================================================
// SUITE 7 — Playing Cards
// ============================================================================
suite('Playing Cards', function() {

  test('playCard plays a creature to field', function() {
    var p1 = uid();
    var p2 = uid();
    var state = CardGame.startBattle(makeMinDeck(p1), makeMinDeck(p2));
    // Force a creature into p1's hand
    state.players[p1].hand = ['c_fire_wolf'];
    state.players[p1].mana = 10;
    var result = CardGame.playCard(state, p1, 'c_fire_wolf', null);
    assert(result.success === true, 'Should succeed: ' + result.error);
    assert(state.players[p1].field.length === 1, 'Field should have 1 creature');
  });

  test('playCard deducts mana cost', function() {
    var p1 = uid();
    var p2 = uid();
    var state = CardGame.startBattle(makeMinDeck(p1), makeMinDeck(p2));
    state.players[p1].hand = ['c_fire_wolf'];
    state.players[p1].mana = 5;
    var fireWolf = CardGame.CARD_CATALOG['c_fire_wolf'];
    CardGame.playCard(state, p1, 'c_fire_wolf', null);
    assert(state.players[p1].mana === 5 - fireWolf.cost,
      'Mana should be reduced by card cost');
  });

  test('playCard fails if not enough mana', function() {
    var p1 = uid();
    var p2 = uid();
    var state = CardGame.startBattle(makeMinDeck(p1), makeMinDeck(p2));
    state.players[p1].hand = ['c_lava_titan'];
    state.players[p1].mana = 1;  // titan costs 5
    var result = CardGame.playCard(state, p1, 'c_lava_titan', null);
    assert(result.success === false, 'Should fail with insufficient mana');
  });

  test('playCard fails if card not in hand', function() {
    var p1 = uid();
    var p2 = uid();
    var state = CardGame.startBattle(makeMinDeck(p1), makeMinDeck(p2));
    state.players[p1].hand = [];
    state.players[p1].mana = 10;
    var result = CardGame.playCard(state, p1, 'c_fire_wolf', null);
    assert(result.success === false, 'Should fail if card not in hand');
  });

  test('playCard fails when it is not your turn', function() {
    var p1 = uid();
    var p2 = uid();
    var state = CardGame.startBattle(makeMinDeck(p1), makeMinDeck(p2));
    state.players[p2].hand = ['c_fire_wolf'];
    state.players[p2].mana = 10;
    var result = CardGame.playCard(state, p2, 'c_fire_wolf', null);
    assert(result.success === false, 'Should fail when not active player');
  });

  test('playCard plays a spell and applies effect', function() {
    var p1 = uid();
    var p2 = uid();
    var state = CardGame.startBattle(makeMinDeck(p1), makeMinDeck(p2));
    state.players[p1].hand = ['s_fireball'];
    state.players[p1].mana = 10;
    var hpBefore = state.players[p2].hp;
    var result = CardGame.playCard(state, p1, 's_fireball', p2);
    assert(result.success === true, 'Spell should succeed: ' + result.error);
    assert(state.players[p2].hp < hpBefore, 'Fireball should damage opponent');
  });

  test('playCard plays a trap to trap zone', function() {
    var p1 = uid();
    var p2 = uid();
    var state = CardGame.startBattle(makeMinDeck(p1), makeMinDeck(p2));
    state.players[p1].hand = ['tr_ambush'];
    state.players[p1].mana = 10;
    var result = CardGame.playCard(state, p1, 'tr_ambush', null);
    assert(result.success === true, 'Trap play should succeed: ' + result.error);
    assert(state.trapZone[p1].length === 1, 'Trap should be in trap zone');
  });

  test('playCard field full prevents playing creature', function() {
    var p1 = uid();
    var p2 = uid();
    var state = CardGame.startBattle(makeMinDeck(p1), makeMinDeck(p2));
    state.players[p1].mana = 100;
    // Fill field to max
    for (var i = 0; i < CardGame.FIELD_MAX; i++) {
      state.players[p1].hand.push('c_ember_sprite');
      CardGame.playCard(state, p1, 'c_ember_sprite', null);
    }
    state.players[p1].hand.push('c_ember_sprite');
    var result = CardGame.playCard(state, p1, 'c_ember_sprite', null);
    assert(result.success === false, 'Should fail when field is full');
  });

  test('playCard fails when battle is over', function() {
    var p1 = uid();
    var p2 = uid();
    var state = CardGame.startBattle(makeMinDeck(p1), makeMinDeck(p2));
    state.winner = p1;
    state.players[p1].hand = ['c_fire_wolf'];
    var result = CardGame.playCard(state, p1, 'c_fire_wolf', null);
    assert(result.success === false, 'Should fail when battle is over');
  });

});

// ============================================================================
// SUITE 8 — Combat
// ============================================================================
suite('Combat', function() {

  function setupBattleWithCreatures() {
    var p1 = uid();
    var p2 = uid();
    var state = CardGame.startBattle(makeMinDeck(p1), makeMinDeck(p2));
    state.players[p1].mana = 100;
    state.players[p2].mana = 100;

    // Put fire wolf on p1 field
    state.players[p1].hand = ['c_fire_wolf'];
    CardGame.playCard(state, p1, 'c_fire_wolf', null);

    // Put stone golem on p2 field (but it's p2's turn after switching)
    var instance = {
      id: 'ci_test_golem_' + Date.now(),
      cardId: 'c_stone_golem',
      name: 'Stone Golem',
      ownerId: p2,
      attack: 2,
      defense: 5,
      currentHp: 5,
      maxHp: 5,
      ability: 'taunt',
      element: 'earth',
      rarity: 'common',
      type: 'creature',
      canAttack: true,
      isFrozen: false,
      isStunned: false,
      isTaunting: true,
      hasBarrier: false,
      hasEvasion: false,
      attackUsed: false
    };
    state.players[p2].field.push(instance);

    return { state: state, p1: p1, p2: p2 };
  }

  test('attackWithCreature attacks successfully', function() {
    var ctx = setupBattleWithCreatures();
    var attackerId = ctx.state.players[ctx.p1].field[0].id;
    var targetId = ctx.state.players[ctx.p2].field[0].id;
    var result = CardGame.attackWithCreature(ctx.state, attackerId, targetId);
    assert(result.success === true, 'Attack should succeed: ' + result.error);
  });

  test('attackWithCreature reduces defender HP', function() {
    var ctx = setupBattleWithCreatures();
    var attacker = ctx.state.players[ctx.p1].field[0];
    var defender = ctx.state.players[ctx.p2].field[0];
    var hpBefore = defender.currentHp;
    CardGame.attackWithCreature(ctx.state, attacker.id, defender.id);
    assert(defender.currentHp < hpBefore || defender.currentHp <= 0,
      'Defender HP should reduce after attack');
  });

  test('attackWithCreature fails when battle is over', function() {
    var ctx = setupBattleWithCreatures();
    ctx.state.winner = ctx.p1;
    var attackerId = ctx.state.players[ctx.p1].field[0].id;
    var targetId = ctx.state.players[ctx.p2].field[0].id;
    var result = CardGame.attackWithCreature(ctx.state, attackerId, targetId);
    assert(result.success === false, 'Should fail when battle over');
  });

  test('attackWithCreature fails for wrong player turn', function() {
    var ctx = setupBattleWithCreatures();
    // p2 tries to attack but it's p1's turn
    var golem = ctx.state.players[ctx.p2].field[0];
    golem.canAttack = true;
    var result = CardGame.attackWithCreature(ctx.state, golem.id, ctx.p1);
    assert(result.success === false, 'Should fail when not your turn');
  });

  test('attackWithCreature marks attacker as used', function() {
    var ctx = setupBattleWithCreatures();
    var attacker = ctx.state.players[ctx.p1].field[0];
    var defender = ctx.state.players[ctx.p2].field[0];
    CardGame.attackWithCreature(ctx.state, attacker.id, defender.id);
    assert(attacker.attackUsed === true, 'Attacker should be marked as used');
  });

  test('attackWithCreature attacker cannot attack twice', function() {
    var ctx = setupBattleWithCreatures();
    var attacker = ctx.state.players[ctx.p1].field[0];
    var defender = ctx.state.players[ctx.p2].field[0];
    CardGame.attackWithCreature(ctx.state, attacker.id, defender.id);
    var result = CardGame.attackWithCreature(ctx.state, attacker.id, defender.id);
    assert(result.success === false, 'Attacker should not be able to attack twice');
  });

  test('attackWithCreature fails for frozen creature', function() {
    var ctx = setupBattleWithCreatures();
    var attacker = ctx.state.players[ctx.p1].field[0];
    attacker.isFrozen = true;
    var defender = ctx.state.players[ctx.p2].field[0];
    var result = CardGame.attackWithCreature(ctx.state, attacker.id, defender.id);
    assert(result.success === false, 'Frozen creature cannot attack');
  });

  test('attackWithCreature taunt forces target selection', function() {
    var ctx = setupBattleWithCreatures();
    // p2 has a taunt creature — p1 cannot attack p2 player directly
    var attacker = ctx.state.players[ctx.p1].field[0];
    var result = CardGame.attackWithCreature(ctx.state, attacker.id, ctx.p2);
    assert(result.success === false, 'Should force taunt target');
  });

  test('attackWithCreature destroying creature adds to graveyard', function() {
    var ctx = setupBattleWithCreatures();
    // Make a weak creature on p2's field
    var weakCreature = {
      id: 'ci_weak_' + Date.now(),
      cardId: 'c_ghost_wisp',
      name: 'Ghost Wisp',
      ownerId: ctx.p2,
      attack: 1,
      defense: 0,
      currentHp: 1,
      maxHp: 1,
      ability: null,
      element: 'spirit',
      rarity: 'common',
      type: 'creature',
      canAttack: true,
      isFrozen: false,
      isStunned: false,
      isTaunting: false,
      hasBarrier: false,
      hasEvasion: false,
      attackUsed: false
    };
    // Remove taunt creature, add weak one
    ctx.state.players[ctx.p2].field = [weakCreature];
    var attacker = ctx.state.players[ctx.p1].field[0];
    CardGame.attackWithCreature(ctx.state, attacker.id, weakCreature.id);
    assert(ctx.state.graveyard[ctx.p2].length > 0, 'Destroyed creature should be in graveyard');
  });

  test('attackWithCreature can attack opponent player directly when no creatures', function() {
    var p1 = uid();
    var p2 = uid();
    var state = CardGame.startBattle(makeMinDeck(p1), makeMinDeck(p2));
    state.players[p1].mana = 10;
    state.players[p1].hand = ['c_fire_wolf'];
    CardGame.playCard(state, p1, 'c_fire_wolf', null);
    var attacker = state.players[p1].field[0];
    var hpBefore = state.players[p2].hp;
    var result = CardGame.attackWithCreature(state, attacker.id, p2);
    assert(result.success === true, 'Direct attack should succeed: ' + result.error);
    assert(state.players[p2].hp < hpBefore, 'Player HP should decrease');
  });

});

// ============================================================================
// SUITE 9 — Trap Activation
// ============================================================================
suite('Trap Activation', function() {

  test('activateTrap fails for unknown trap id', function() {
    var p1 = uid();
    var p2 = uid();
    var state = CardGame.startBattle(makeMinDeck(p1), makeMinDeck(p2));
    var result = CardGame.activateTrap(state, 'nonexistent_trap_id');
    assert(result.success === false, 'Should fail for unknown trap');
  });

  test('activateTrap activates counter_damage trap', function() {
    var p1 = uid();
    var p2 = uid();
    var state = CardGame.startBattle(makeMinDeck(p1), makeMinDeck(p2));
    state.players[p1].hand = ['tr_ambush'];
    state.players[p1].mana = 10;
    CardGame.playCard(state, p1, 'tr_ambush', null);
    var trapId = state.trapZone[p1][0].id;
    var hpBefore = state.players[p2].hp;
    var result = CardGame.activateTrap(state, trapId);
    assert(result.success === true, 'Trap activation should succeed');
    assert(state.players[p2].hp < hpBefore, 'Counter damage trap should damage opponent');
  });

  test('activateTrap removes trap from zone after use', function() {
    var p1 = uid();
    var p2 = uid();
    var state = CardGame.startBattle(makeMinDeck(p1), makeMinDeck(p2));
    state.players[p1].hand = ['tr_ambush'];
    state.players[p1].mana = 10;
    CardGame.playCard(state, p1, 'tr_ambush', null);
    var trapId = state.trapZone[p1][0].id;
    CardGame.activateTrap(state, trapId);
    assert(state.trapZone[p1].length === 0, 'Trap should be removed after activation');
  });

  test('activateTrap fails when battle is over', function() {
    var p1 = uid();
    var p2 = uid();
    var state = CardGame.startBattle(makeMinDeck(p1), makeMinDeck(p2));
    state.winner = p1;
    var result = CardGame.activateTrap(state, 'any_id');
    assert(result.success === false, 'Should fail when battle over');
  });

});

// ============================================================================
// SUITE 10 — Win Conditions
// ============================================================================
suite('Win Conditions', function() {

  test('checkWinCondition returns no winner at start', function() {
    var p1 = uid();
    var p2 = uid();
    var state = CardGame.startBattle(makeMinDeck(p1), makeMinDeck(p2));
    var result = CardGame.checkWinCondition(state);
    assert(result.gameOver === false, 'Should not be game over at start');
    assert(result.winner === null, 'Should not have winner at start');
  });

  test('checkWinCondition detects winner when HP reaches 0', function() {
    var p1 = uid();
    var p2 = uid();
    var state = CardGame.startBattle(makeMinDeck(p1), makeMinDeck(p2));
    state.players[p2].hp = 0;
    var result = CardGame.checkWinCondition(state);
    assert(result.gameOver === true, 'Should be game over when HP is 0');
    assert(result.winner === p1, 'P1 should win when P2 HP is 0');
  });

  test('checkWinCondition detects loser with negative HP', function() {
    var p1 = uid();
    var p2 = uid();
    var state = CardGame.startBattle(makeMinDeck(p1), makeMinDeck(p2));
    state.players[p1].hp = -5;
    var result = CardGame.checkWinCondition(state);
    assert(result.gameOver === true, 'Should be game over with negative HP');
    assert(result.winner === p2, 'P2 should win');
  });

  test('checkWinCondition detects deck out', function() {
    var p1 = uid();
    var p2 = uid();
    var state = CardGame.startBattle(makeMinDeck(p1), makeMinDeck(p2));
    state.players[p1].deck = [];
    state.players[p1].hand = [];
    var result = CardGame.checkWinCondition(state);
    assert(result.gameOver === true, 'Should be game over when decked out');
    assert(result.winner === p2, 'P2 should win by deck out');
  });

  test('checkWinCondition sets winner on battleState', function() {
    var p1 = uid();
    var p2 = uid();
    var state = CardGame.startBattle(makeMinDeck(p1), makeMinDeck(p2));
    state.players[p2].hp = 0;
    CardGame.checkWinCondition(state);
    assert(state.winner === p1, 'battleState.winner should be set');
  });

  test('checkWinCondition returns same winner if already set', function() {
    var p1 = uid();
    var p2 = uid();
    var state = CardGame.startBattle(makeMinDeck(p1), makeMinDeck(p2));
    state.winner = p1;
    state.winReason = 'test';
    var result = CardGame.checkWinCondition(state);
    assert(result.gameOver === true, 'Should remain game over');
    assert(result.winner === p1, 'Should return existing winner');
  });

});

// ============================================================================
// SUITE 11 — getBattleState (visibility)
// ============================================================================
suite('getBattleState visibility', function() {

  test('getBattleState returns visible state object', function() {
    var p1 = uid();
    var p2 = uid();
    var state = CardGame.startBattle(makeMinDeck(p1), makeMinDeck(p2));
    var visible = CardGame.getBattleState(state, p1);
    assert(typeof visible === 'object', 'Should return object');
    assert(visible.players !== undefined, 'Should have players');
  });

  test('getBattleState shows own hand to requesting player', function() {
    var p1 = uid();
    var p2 = uid();
    var state = CardGame.startBattle(makeMinDeck(p1), makeMinDeck(p2));
    var visible = CardGame.getBattleState(state, p1);
    assert(Array.isArray(visible.players[p1].hand), 'P1 should see own hand');
    assert(visible.players[p1].hand.length === CardGame.STARTING_HAND,
      'P1 hand should have ' + CardGame.STARTING_HAND + ' cards');
  });

  test('getBattleState hides opponent hand', function() {
    var p1 = uid();
    var p2 = uid();
    var state = CardGame.startBattle(makeMinDeck(p1), makeMinDeck(p2));
    var visible = CardGame.getBattleState(state, p1);
    assert(visible.players[p2].hand === null, 'Opponent hand should be null (hidden)');
  });

  test('getBattleState shows opponent hand size', function() {
    var p1 = uid();
    var p2 = uid();
    var state = CardGame.startBattle(makeMinDeck(p1), makeMinDeck(p2));
    var visible = CardGame.getBattleState(state, p1);
    assert(typeof visible.players[p2].handSize === 'number',
      'Should show opponent hand size');
    assert(visible.players[p2].handSize === CardGame.STARTING_HAND,
      'Opponent hand size should be correct');
  });

  test('getBattleState shows both player HP', function() {
    var p1 = uid();
    var p2 = uid();
    var state = CardGame.startBattle(makeMinDeck(p1), makeMinDeck(p2));
    var visible = CardGame.getBattleState(state, p1);
    assert(visible.players[p1].hp === CardGame.STARTING_HP, 'P1 HP should be visible');
    assert(visible.players[p2].hp === CardGame.STARTING_HP, 'P2 HP should be visible');
  });

  test('getBattleState shows both fields', function() {
    var p1 = uid();
    var p2 = uid();
    var state = CardGame.startBattle(makeMinDeck(p1), makeMinDeck(p2));
    var visible = CardGame.getBattleState(state, p1);
    assert(Array.isArray(visible.players[p1].field), 'P1 field should be visible');
    assert(Array.isArray(visible.players[p2].field), 'P2 field should be visible');
  });

  test('getBattleState shows own trap zone', function() {
    var p1 = uid();
    var p2 = uid();
    var state = CardGame.startBattle(makeMinDeck(p1), makeMinDeck(p2));
    var visible = CardGame.getBattleState(state, p1);
    assert(Array.isArray(visible.trapZones[p1]), 'Own trap zone should be array');
  });

  test('getBattleState hides opponent trap zone details', function() {
    var p1 = uid();
    var p2 = uid();
    var state = CardGame.startBattle(makeMinDeck(p1), makeMinDeck(p2));
    var visible = CardGame.getBattleState(state, p1);
    assert(!Array.isArray(visible.trapZones[p2]), 'Opponent trap zone should be hidden (count only)');
    assert(typeof visible.trapZones[p2].count === 'number', 'Should show trap count');
  });

  test('getBattleState includes recent log entries', function() {
    var p1 = uid();
    var p2 = uid();
    var state = CardGame.startBattle(makeMinDeck(p1), makeMinDeck(p2));
    var visible = CardGame.getBattleState(state, p1);
    assert(Array.isArray(visible.log), 'Log should be array');
  });

});

// ============================================================================
// SUITE 12 — Turn Processing
// ============================================================================
suite('Turn Processing', function() {

  test('processTurn advances turn counter', function() {
    var p1 = uid();
    var p2 = uid();
    var state = CardGame.startBattle(makeMinDeck(p1), makeMinDeck(p2));
    var turnBefore = state.turn;
    CardGame.processTurn(state, []);
    assert(state.turn > turnBefore, 'Turn should advance');
  });

  test('processTurn switches active player', function() {
    var p1 = uid();
    var p2 = uid();
    var state = CardGame.startBattle(makeMinDeck(p1), makeMinDeck(p2));
    var activeBefore = state.activePlayer;
    CardGame.processTurn(state, []);
    assert(state.activePlayer !== activeBefore, 'Active player should switch');
  });

  test('processTurn replenishes mana', function() {
    var p1 = uid();
    var p2 = uid();
    var state = CardGame.startBattle(makeMinDeck(p1), makeMinDeck(p2));
    state.players[p1].mana = 0;
    CardGame.processTurn(state, []);
    // After turn processes, the NEW active player (p2) should have mana
    assert(state.players[p2].mana > 0, 'Active player mana should be replenished');
  });

  test('processTurn draws a card for active player', function() {
    var p1 = uid();
    var p2 = uid();
    var state = CardGame.startBattle(makeMinDeck(p1), makeMinDeck(p2));
    // p1 is active player
    var handBefore = state.players[p1].hand.length;
    CardGame.processTurn(state, []);
    // p1 drew a card during the turn
    // After playing no cards, hand size should be at least equal or +1
    // (draw happens at turn start)
    assert(state.players[p1].deck.length < (CardGame.DECK_MIN - CardGame.STARTING_HAND),
      'Deck should have reduced by draw');
  });

  test('processTurn fails when battle is over', function() {
    var p1 = uid();
    var p2 = uid();
    var state = CardGame.startBattle(makeMinDeck(p1), makeMinDeck(p2));
    state.winner = p1;
    var result = CardGame.processTurn(state, []);
    assert(result.success === false, 'Should fail when battle over');
  });

  test('processTurn processes play_card actions', function() {
    var p1 = uid();
    var p2 = uid();
    var state = CardGame.startBattle(makeMinDeck(p1), makeMinDeck(p2));
    state.players[p1].hand = ['c_ember_sprite'];
    state.players[p1].mana = 10;
    // Prevent drawing on empty deck
    state.players[p1].deck = ['c_fire_wolf', 'c_fire_wolf'];
    var result = CardGame.processTurn(state, [
      { type: 'play_card', cardId: 'c_ember_sprite' }
    ]);
    assert(result.success === true, 'Turn should succeed');
    assert(result.results.length >= 1, 'Should have action results');
  });

  test('processTurn resets frozen status on active player creatures', function() {
    var p1 = uid();
    var p2 = uid();
    var state = CardGame.startBattle(makeMinDeck(p1), makeMinDeck(p2));
    // Add a frozen creature to p1's field
    var frozenCreature = {
      id: 'ci_frozen_test',
      cardId: 'c_fire_wolf',
      name: 'Fire Wolf',
      ownerId: p1,
      attack: 3,
      defense: 1,
      currentHp: 2,
      maxHp: 2,
      ability: null,
      element: 'fire',
      rarity: 'common',
      type: 'creature',
      canAttack: false,
      isFrozen: true,
      isStunned: false,
      isTaunting: false,
      hasBarrier: false,
      hasEvasion: false,
      attackUsed: true
    };
    state.players[p1].field = [frozenCreature];
    state.players[p1].deck = ['c_ember_sprite', 'c_ember_sprite'];
    CardGame.processTurn(state, []);
    // After turn, p2 is active; next turn p1 plays again
    // This test checks that freeze is cleared on turn start for that player
    assert(frozenCreature.isFrozen === false, 'Frozen status should be cleared on turn start');
  });

});

// ============================================================================
// SUITE 13 — Deck Strength
// ============================================================================
suite('Deck Strength', function() {

  test('calculateDeckStrength returns object with score and breakdown', function() {
    var p = uid();
    var deck = makeMedDeck(p);
    var result = CardGame.calculateDeckStrength(deck);
    assert(typeof result.score === 'number', 'Should have numeric score');
    assert(typeof result.breakdown === 'object', 'Should have breakdown');
  });

  test('calculateDeckStrength score > 0 for valid deck', function() {
    var p = uid();
    var deck = makeMedDeck(p);
    var result = CardGame.calculateDeckStrength(deck);
    assert(result.score > 0, 'Score should be positive');
  });

  test('calculateDeckStrength legendary deck scores higher', function() {
    var p = uid();
    var commons = CardGame.createDeck(p, 'Commons', [
      'c_ember_sprite','c_ember_sprite','c_ember_sprite',
      'c_fire_wolf','c_fire_wolf','c_fire_wolf',
      'c_tide_caller','c_tide_caller','c_tide_caller',
      'c_frost_wisp','c_frost_wisp','c_frost_wisp',
      'c_ghost_wisp','c_ghost_wisp','c_ghost_wisp',
      's_fireball','s_fireball','s_fireball',
      's_lightning_bolt','s_lightning_bolt'
    ]);
    var withLegendary = CardGame.createDeck(p, 'With Legendary', [
      'c_ember_sprite','c_ember_sprite','c_ember_sprite',
      'c_fire_wolf','c_fire_wolf','c_fire_wolf',
      'c_tide_caller','c_tide_caller','c_tide_caller',
      'c_frost_wisp','c_frost_wisp','c_frost_wisp',
      'c_ghost_wisp','c_ghost_wisp','c_ghost_wisp',
      's_fireball','s_fireball','s_fireball',
      's_lightning_bolt',
      'l_zion_avatar'
    ]);
    var commonsResult = CardGame.calculateDeckStrength(commons);
    var legendResult = CardGame.calculateDeckStrength(withLegendary);
    assert(legendResult.score > commonsResult.score,
      'Deck with legendary should score higher: ' + legendResult.score + ' vs ' + commonsResult.score);
  });

  test('calculateDeckStrength breakdown has byRarity', function() {
    var p = uid();
    var deck = makeMedDeck(p);
    var result = CardGame.calculateDeckStrength(deck);
    assert(typeof result.breakdown.byRarity === 'object', 'Should have byRarity breakdown');
  });

  test('calculateDeckStrength breakdown has byElement', function() {
    var p = uid();
    var deck = makeMedDeck(p);
    var result = CardGame.calculateDeckStrength(deck);
    assert(typeof result.breakdown.byElement === 'object', 'Should have byElement breakdown');
  });

  test('calculateDeckStrength handles null deck', function() {
    var result = CardGame.calculateDeckStrength(null);
    assert(result.score === 0, 'Null deck should return score 0');
  });

  test('calculateDeckStrength includes avgCost', function() {
    var p = uid();
    var deck = makeMedDeck(p);
    var result = CardGame.calculateDeckStrength(deck);
    assert(typeof result.breakdown.avgCost === 'number', 'Should include avgCost');
    assert(result.breakdown.avgCost > 0, 'avgCost should be positive');
  });

});

// ============================================================================
// FINAL REPORT
// ============================================================================
var passed = report();
process.exit(passed ? 0 : 1);
