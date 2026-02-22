// dashboard_games.js
/**
 * ZION Dashboard Games Module
 * Mini-games panel for UI-only (dashboard) mode.
 * Provides text-based Fishing, Card Game, Dungeon, and Stargazing.
 * No project dependencies — pure logic + DOM helpers.
 */
(function(exports) {
  'use strict';

  // ===========================================================================
  // SEEDED RNG (mulberry32)
  // ===========================================================================

  function createRng(seed) {
    var s = (seed >>> 0) || 1;
    return function() {
      s += 0x6D2B79F5;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) >>> 0;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function rngInt(rng, min, max) {
    return min + Math.floor(rng() * (max - min + 1));
  }

  function rngPick(rng, arr) {
    return arr[Math.floor(rng() * arr.length)];
  }

  function rngShuffle(rng, arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function hashString(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  // ===========================================================================
  // FISHING SYSTEM
  // ===========================================================================

  // Fish data by zone
  var FISH_BY_ZONE = {
    nexus: [
      { name: 'Golden Carp',    rarity: 'common',   value: 5,  weight: { min: 1,   max: 3   }, desc: 'Glimmers in the central fountain' },
      { name: 'Rune Fish',      rarity: 'rare',     value: 25, weight: { min: 2,   max: 5   }, desc: 'Covered in ancient symbols' },
      { name: 'Crystal Minnow', rarity: 'uncommon', value: 12, weight: { min: 0.5, max: 1.5 }, desc: 'Translucent and delicate' }
    ],
    gardens: [
      { name: 'Lily Trout',  rarity: 'common',   value: 4,  weight: { min: 1, max: 4 }, desc: 'Feeds among the lily pads' },
      { name: 'Honey Bass',  rarity: 'uncommon', value: 15, weight: { min: 2, max: 6 }, desc: 'Sweet-scented scales' },
      { name: 'Bloom Fish',  rarity: 'rare',     value: 30, weight: { min: 1, max: 3 }, desc: 'Petals grow on its fins' },
      { name: 'Garden Eel',  rarity: 'common',   value: 6,  weight: { min: 3, max: 8 }, desc: 'Burrows in garden soil' }
    ],
    wilds: [
      { name: 'Shadow Catfish', rarity: 'uncommon', value: 10, weight: { min: 5,  max: 15 }, desc: 'Lurks in murky depths' },
      { name: 'River King',     rarity: 'rare',     value: 40, weight: { min: 10, max: 25 }, desc: 'Largest fish in ZION' },
      { name: 'Cave Blindfish', rarity: 'rare',     value: 35, weight: { min: 1,  max: 3  }, desc: 'Has no eyes, senses vibrations' },
      { name: 'Wild Salmon',    rarity: 'common',   value: 8,  weight: { min: 3,  max: 7  }, desc: 'Swims upstream in autumn' }
    ],
    athenaeum: [
      { name: 'Scholar Fish', rarity: 'uncommon', value: 14, weight: { min: 1,   max: 4 }, desc: 'Seems unusually intelligent' },
      { name: 'Ink Squid',    rarity: 'rare',     value: 28, weight: { min: 2,   max: 5 }, desc: 'Leaves trails of text in water' },
      { name: 'Page Turner',  rarity: 'common',   value: 5,  weight: { min: 0.5, max: 2 }, desc: 'Thin and flat like a page' }
    ],
    studio: [
      { name: 'Paint Splash', rarity: 'uncommon', value: 11, weight: { min: 1, max: 3 }, desc: 'Changes color constantly' },
      { name: 'Clay Crab',    rarity: 'common',   value: 4,  weight: { min: 2, max: 4 }, desc: 'Sculpts tiny castles' },
      { name: 'Melody Eel',   rarity: 'rare',     value: 32, weight: { min: 3, max: 6 }, desc: 'Hums when caught' }
    ],
    agora: [
      { name: 'Merchant Minnow', rarity: 'common',   value: 3,  weight: { min: 0.5, max: 1 }, desc: 'Always travels in schools' },
      { name: 'Gold Scale',      rarity: 'rare',     value: 50, weight: { min: 1,   max: 3 }, desc: 'Scales are actual gold' },
      { name: 'Debate Fish',     rarity: 'uncommon', value: 9,  weight: { min: 2,   max: 4 }, desc: 'Makes argumentative sounds' }
    ],
    commons: [
      { name: 'Festival Fish',  rarity: 'uncommon', value: 13, weight: { min: 2, max: 5  }, desc: 'Appears during celebrations' },
      { name: 'Campfire Cod',   rarity: 'common',   value: 6,  weight: { min: 3, max: 7  }, desc: 'Best served smoked' },
      { name: 'Story Sturgeon', rarity: 'rare',     value: 38, weight: { min: 8, max: 20 }, desc: 'Ancient and wise' }
    ],
    arena: [
      { name: 'Battle Bass',  rarity: 'uncommon', value: 16, weight: { min: 4, max: 10 }, desc: 'Fights back hard' },
      { name: 'Trophy Fish',  rarity: 'rare',     value: 45, weight: { min: 5, max: 15 }, desc: 'Legendary catch' },
      { name: 'Sand Shark',   rarity: 'uncommon', value: 20, weight: { min: 6, max: 12 }, desc: 'Burrows in arena sand' }
    ]
  };

  // Rod tiers with bonuses
  var ROD_TIERS = {
    basic:    { tier: 0, biteBonus: 0,    reelBonus: 0,    label: 'Basic Rod' },
    wooden:   { tier: 1, biteBonus: 0.05, reelBonus: 0.05, label: 'Wooden Rod' },
    bamboo:   { tier: 2, biteBonus: 0.10, reelBonus: 0.10, label: 'Bamboo Rod' },
    carbon:   { tier: 3, biteBonus: 0.15, reelBonus: 0.15, label: 'Carbon Rod' },
    legendary:{ tier: 4, biteBonus: 0.20, reelBonus: 0.25, label: 'Legendary Rod' }
  };

  /**
   * Create initial fishing state.
   * @returns {object} fishing state
   */
  function createFishingGame() {
    return {
      rod: 'basic',
      bait: null,
      location: 'nexus',
      casting: false,
      fish: null,
      catches: [],
      stats: { total: 0, best: null, streak: 0 }
    };
  }

  /**
   * Cast fishing line at a location.
   * @param {object} state - fishing state
   * @param {string} location - zone name
   * @returns {{ state: object, message: string }}
   */
  function castLine(state, location) {
    var newState = _cloneState(state);
    var loc = (location && FISH_BY_ZONE[location]) ? location : (newState.location || 'nexus');
    newState.location = loc;
    newState.casting = true;
    newState.fish = null;
    var locLabels = {
      nexus: 'Nexus pond',
      gardens: 'Gardens stream',
      wilds: 'Wilds river',
      athenaeum: 'Athenaeum pool',
      studio: 'Studio canal',
      agora: 'Agora channel',
      commons: 'Commons lake',
      arena: 'Arena waterway'
    };
    var label = locLabels[loc] || (loc + ' waters');
    return {
      state: newState,
      message: 'You cast your line into the ' + label + '...'
    };
  }

  /**
   * Check if a fish has bitten.
   * @param {object} state - fishing state
   * @returns {{ state: object, bite: boolean, fish: object|null }}
   */
  function checkBite(state) {
    var newState = _cloneState(state);
    if (!newState.casting) {
      return { state: newState, bite: false, fish: null };
    }
    var rodInfo = ROD_TIERS[newState.rod] || ROD_TIERS.basic;
    var biteChance = 0.30 + (rodInfo.tier * 0.10) + (newState.bait ? 0.15 : 0);
    var rng = createRng(hashString(newState.location + Date.now()));
    var roll = rng();
    if (roll > biteChance) {
      return { state: newState, bite: false, fish: null };
    }
    // Pick a fish weighted by rarity
    var pool = getFishForLocation(newState.location);
    var fish = _pickWeightedFish(rng, pool);
    if (!fish) {
      return { state: newState, bite: false, fish: null };
    }
    // Assign random weight in range
    var weight = _randomInRange(rng, fish.weight.min, fish.weight.max);
    var caughtFish = _assignFishWeight(fish, weight);
    newState.fish = caughtFish;
    return { state: newState, bite: true, fish: caughtFish };
  }

  /**
   * Attempt to reel in a bitten fish.
   * @param {object} state - fishing state
   * @returns {{ state: object, success: boolean, fish: object|null, message: string }}
   */
  function reelIn(state) {
    var newState = _cloneState(state);
    if (!newState.casting || !newState.fish) {
      newState.casting = false;
      return { state: newState, success: false, fish: null, message: 'Nothing on the line.' };
    }
    var rodInfo = ROD_TIERS[newState.rod] || ROD_TIERS.basic;
    var successChance = 0.60 + (rodInfo.tier * 0.05);
    var rng = createRng(hashString(newState.fish.name + Date.now()));
    var caught = rng() <= successChance;
    var fish = newState.fish;
    newState.fish = null;
    newState.casting = false;
    if (caught) {
      newState.catches.push(fish);
      newState.stats.total += 1;
      newState.stats.streak += 1;
      if (!newState.stats.best || fish.value > newState.stats.best.value) {
        newState.stats.best = fish;
      }
      return {
        state: newState,
        success: true,
        fish: fish,
        message: 'You caught a ' + fish.name + '! (' + fish.weight.toFixed(1) + ' lbs, ' + fish.rarity + ')'
      };
    } else {
      newState.stats.streak = 0;
      return {
        state: newState,
        success: false,
        fish: null,
        message: 'The ' + fish.name + ' got away!'
      };
    }
  }

  /**
   * Get fish available at a location.
   * @param {string} location
   * @returns {Array} array of fish data objects
   */
  function getFishForLocation(location) {
    return (FISH_BY_ZONE[location] || FISH_BY_ZONE.nexus).slice();
  }

  /**
   * Sell a caught fish for Spark.
   * @param {object} state - fishing state
   * @param {number} fishIndex - index in catches array
   * @param {object} [economy] - optional economy object (unused in dashboard mode)
   * @param {string} [playerId] - optional player id
   * @returns {{ success: boolean, state: object, earnings: number, message: string }}
   */
  function sellFish(state, fishIndex, economy, playerId) {
    var newState = _cloneState(state);
    if (fishIndex < 0 || fishIndex >= newState.catches.length) {
      return { success: false, state: newState, earnings: 0, message: 'No fish at that index.' };
    }
    var fish = newState.catches[fishIndex];
    newState.catches.splice(fishIndex, 1);
    return {
      success: true,
      state: newState,
      earnings: fish.value,
      message: 'Sold ' + fish.name + ' for ' + fish.value + ' Spark.'
    };
  }

  /**
   * Get fishing stats summary.
   * @param {object} state - fishing state
   * @returns {object} stats summary
   */
  function getFishingStats(state) {
    var byRarity = { common: 0, uncommon: 0, rare: 0, legendary: 0 };
    for (var i = 0; i < state.catches.length; i++) {
      var r = state.catches[i].rarity || 'common';
      if (byRarity[r] !== undefined) byRarity[r]++;
      else byRarity[r] = 1;
    }
    return {
      total: state.stats.total,
      best: state.stats.best,
      streak: state.stats.streak,
      inCreel: state.catches.length,
      byRarity: byRarity
    };
  }

  // --- Fishing helpers ---

  function _pickWeightedFish(rng, pool) {
    if (!pool || !pool.length) return null;
    var weights = { common: 100, uncommon: 40, rare: 15, legendary: 5 };
    var totalWeight = 0;
    for (var i = 0; i < pool.length; i++) {
      totalWeight += (weights[pool[i].rarity] || 50);
    }
    var roll = rng() * totalWeight;
    var cumulative = 0;
    for (var j = 0; j < pool.length; j++) {
      cumulative += (weights[pool[j].rarity] || 50);
      if (roll <= cumulative) return pool[j];
    }
    return pool[pool.length - 1];
  }

  function _randomInRange(rng, min, max) {
    return min + rng() * (max - min);
  }

  function _assignFishWeight(fish, weight) {
    return {
      name: fish.name,
      rarity: fish.rarity,
      value: fish.value,
      weight: weight,
      desc: fish.desc
    };
  }

  function _cloneState(state) {
    return JSON.parse(JSON.stringify(state));
  }

  // ===========================================================================
  // CARD GAME (Text-Based Battles)
  // ===========================================================================

  var CARD_HAND_MAX = 7;
  var CARD_FIELD_MAX = 5;
  var CARD_STARTING_HP = 20;

  // Full card catalog used for starter decks
  var CARD_CATALOG_SIMPLE = {
    // Creatures
    'flame_sprite':    { id: 'flame_sprite',    name: 'Flame Sprite',    type: 'creature', cost: 1, attack: 2, defense: 1, hp: 1, rarity: 'common',   ability: null },
    'stone_guard':     { id: 'stone_guard',     name: 'Stone Guard',     type: 'creature', cost: 2, attack: 1, defense: 4, hp: 3, rarity: 'common',   ability: null },
    'wind_dancer':     { id: 'wind_dancer',     name: 'Wind Dancer',     type: 'creature', cost: 2, attack: 3, defense: 1, hp: 2, rarity: 'common',   ability: 'swift' },
    'tide_caller':     { id: 'tide_caller',     name: 'Tide Caller',     type: 'creature', cost: 3, attack: 2, defense: 3, hp: 4, rarity: 'uncommon', ability: null },
    'fire_wolf':       { id: 'fire_wolf',       name: 'Fire Wolf',       type: 'creature', cost: 2, attack: 3, defense: 1, hp: 2, rarity: 'common',   ability: null },
    'crystal_golem':   { id: 'crystal_golem',   name: 'Crystal Golem',   type: 'creature', cost: 4, attack: 3, defense: 5, hp: 5, rarity: 'uncommon', ability: null },
    'shadow_runner':   { id: 'shadow_runner',   name: 'Shadow Runner',   type: 'creature', cost: 1, attack: 2, defense: 0, hp: 1, rarity: 'common',   ability: 'swift' },
    'spirit_guide':    { id: 'spirit_guide',    name: 'Spirit Guide',    type: 'creature', cost: 3, attack: 1, defense: 2, hp: 3, rarity: 'uncommon', ability: 'heal_ally' },
    'nexus_warden':    { id: 'nexus_warden',    name: 'Nexus Warden',    type: 'creature', cost: 5, attack: 4, defense: 4, hp: 6, rarity: 'rare',     ability: 'taunt' },
    'ember_sprite':    { id: 'ember_sprite',    name: 'Ember Sprite',    type: 'creature', cost: 1, attack: 1, defense: 1, hp: 1, rarity: 'common',   ability: null },
    // Spells
    'fireball':        { id: 'fireball',        name: 'Fireball',        type: 'spell',    cost: 2, attack: 3, defense: 0, hp: 0, rarity: 'common',   ability: 'deal_3' },
    'healing_light':   { id: 'healing_light',   name: 'Healing Light',   type: 'spell',    cost: 2, attack: 0, defense: 0, hp: 0, rarity: 'common',   ability: 'heal_4' },
    'lightning_bolt':  { id: 'lightning_bolt',  name: 'Lightning Bolt',  type: 'spell',    cost: 3, attack: 4, defense: 0, hp: 0, rarity: 'uncommon', ability: 'deal_4' },
    'frost_nova':      { id: 'frost_nova',      name: 'Frost Nova',      type: 'spell',    cost: 2, attack: 0, defense: 0, hp: 0, rarity: 'common',   ability: 'freeze_all' },
    'power_surge':     { id: 'power_surge',     name: 'Power Surge',     type: 'spell',    cost: 1, attack: 2, defense: 0, hp: 0, rarity: 'common',   ability: 'deal_2' }
  };

  // Starter decks (20 cards each)
  var STARTER_DECK_PLAYER = [
    'flame_sprite', 'flame_sprite', 'stone_guard', 'stone_guard',
    'wind_dancer', 'wind_dancer', 'fire_wolf', 'fire_wolf',
    'tide_caller', 'tide_caller', 'spirit_guide', 'spirit_guide',
    'crystal_golem', 'nexus_warden',
    'fireball', 'fireball', 'healing_light', 'healing_light',
    'lightning_bolt', 'frost_nova'
  ];

  var STARTER_DECK_OPPONENT = [
    'shadow_runner', 'shadow_runner', 'shadow_runner',
    'ember_sprite', 'ember_sprite', 'ember_sprite',
    'fire_wolf', 'fire_wolf', 'fire_wolf',
    'wind_dancer', 'wind_dancer',
    'stone_guard', 'stone_guard',
    'tide_caller', 'crystal_golem',
    'fireball', 'fireball', 'lightning_bolt',
    'power_surge', 'power_surge'
  ];

  function _makeCardInstance(cardId, instanceId) {
    var def = CARD_CATALOG_SIMPLE[cardId];
    if (!def) return null;
    return {
      instanceId: instanceId || cardId + '_' + Math.floor(Math.random() * 99999),
      id: def.id,
      name: def.name,
      type: def.type,
      cost: def.cost,
      attack: def.attack,
      defense: def.defense,
      hp: def.hp,
      currentHp: def.hp,
      rarity: def.rarity,
      ability: def.ability,
      exhausted: false
    };
  }

  function _buildDeckFromIds(cardIds) {
    var deck = [];
    for (var i = 0; i < cardIds.length; i++) {
      var card = _makeCardInstance(cardIds[i], cardIds[i] + '_' + i);
      if (card) deck.push(card);
    }
    return deck;
  }

  function _shuffleDeck(deck) {
    var a = deck.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function _makeSide(deckIds) {
    var deck = _shuffleDeck(_buildDeckFromIds(deckIds));
    var hand = deck.splice(0, 4); // Draw opening hand
    return {
      hp: CARD_STARTING_HP,
      maxHp: CARD_STARTING_HP,
      mana: 1,
      maxMana: 1,
      hand: hand,
      deck: deck,
      graveyard: [],
      field: []
    };
  }

  /**
   * Create a new card battle state.
   * @param {Array} [playerDeck] - optional array of card IDs
   * @param {Array} [opponentDeck] - optional array of card IDs
   * @returns {object} battle state
   */
  function createCardBattleState(playerDeck, opponentDeck) {
    var pDeck = (playerDeck && playerDeck.length >= 10) ? playerDeck : STARTER_DECK_PLAYER;
    var oDeck = (opponentDeck && opponentDeck.length >= 10) ? opponentDeck : STARTER_DECK_OPPONENT;
    return {
      player: _makeSide(pDeck),
      opponent: _makeSide(oDeck),
      turn: 1,
      activePlayer: 'player',
      phase: 'draw',
      log: []
    };
  }

  /**
   * Draw a card from deck to hand.
   * @param {object} state - battle state
   * @param {string} who - 'player' or 'opponent'
   * @returns {{ state: object, card: object|null, discarded: boolean }}
   */
  function drawCard(state, who) {
    var newState = _cloneBattleState(state);
    var side = newState[who];
    if (!side || !side.deck.length) {
      return { state: newState, card: null, discarded: false };
    }
    var card = side.deck.shift();
    var discarded = false;
    if (side.hand.length >= CARD_HAND_MAX) {
      side.graveyard.push(card);
      discarded = true;
      newState.log.push(who + ' discarded ' + card.name + ' (hand full)');
    } else {
      side.hand.push(card);
      newState.log.push(who + ' drew ' + card.name);
    }
    return { state: newState, card: card, discarded: discarded };
  }

  /**
   * Play a card from hand.
   * @param {object} state - battle state
   * @param {string} who - 'player' or 'opponent'
   * @param {number} handIndex - index in hand array
   * @param {string|number} [target] - target identifier for spells
   * @returns {{ state: object, success: boolean, message: string }}
   */
  function playCard(state, who, handIndex, target) {
    var newState = _cloneBattleState(state);
    var side = newState[who];
    var other = who === 'player' ? newState.opponent : newState.player;
    if (!side) return { state: newState, success: false, message: 'Invalid player.' };
    if (handIndex < 0 || handIndex >= side.hand.length) {
      return { state: newState, success: false, message: 'No card at that position.' };
    }
    var card = side.hand[handIndex];
    if (card.cost > side.mana) {
      return { state: newState, success: false, message: 'Not enough mana. Need ' + card.cost + ', have ' + side.mana + '.' };
    }
    side.mana -= card.cost;
    side.hand.splice(handIndex, 1);

    var msg = '';
    if (card.type === 'creature') {
      if (side.field.length >= CARD_FIELD_MAX) {
        side.graveyard.push(card);
        msg = 'Field full — ' + card.name + ' discarded.';
      } else {
        card.exhausted = true; // Summoning sickness
        side.field.push(card);
        msg = who + ' played creature: ' + card.name + ' (' + card.attack + '/' + card.currentHp + ')';
        // Apply enter effects
        if (card.ability === 'ignite' || card.ability === 'deal_1') {
          other.hp -= 1;
          msg += '. Ignite: dealt 1 damage to opponent.';
        }
      }
    } else if (card.type === 'spell') {
      side.graveyard.push(card);
      msg = who + ' cast spell: ' + card.name + '.';
      // Apply spell effects
      if (card.ability === 'deal_2') { other.hp -= 2; msg += ' Dealt 2 damage.'; }
      else if (card.ability === 'deal_3') { other.hp -= 3; msg += ' Dealt 3 damage.'; }
      else if (card.ability === 'deal_4') { other.hp -= 4; msg += ' Dealt 4 damage.'; }
      else if (card.ability === 'heal_4') { side.hp = Math.min(side.maxHp, side.hp + 4); msg += ' Healed 4 HP.'; }
      else if (card.ability === 'freeze_all') {
        for (var fi = 0; fi < other.field.length; fi++) { other.field[fi].exhausted = true; }
        msg += ' Froze all opponent creatures.';
      }
    } else {
      side.graveyard.push(card);
      msg = who + ' played ' + card.type + ': ' + card.name + '.';
    }

    newState.log.push(msg);
    // Clamp HP
    other.hp = Math.max(0, other.hp);
    return { state: newState, success: true, message: msg };
  }

  /**
   * Attack with a creature.
   * @param {object} state - battle state
   * @param {number} attackerIndex - index in active player's field
   * @param {number|string} targetIndex - index in opponent's field, or 'player'/'opponent' for direct
   * @returns {{ state: object, result: string, damage: number, message: string }}
   */
  function attackWithCreature(state, attackerIndex, targetIndex) {
    var newState = _cloneBattleState(state);
    var activeSide = newState[newState.activePlayer];
    var otherKey = newState.activePlayer === 'player' ? 'opponent' : 'player';
    var otherSide = newState[otherKey];

    if (!activeSide || attackerIndex < 0 || attackerIndex >= activeSide.field.length) {
      return { state: newState, result: 'invalid', damage: 0, message: 'Invalid attacker.' };
    }
    var attacker = activeSide.field[attackerIndex];
    if (attacker.exhausted) {
      return { state: newState, result: 'invalid', damage: 0, message: attacker.name + ' is exhausted.' };
    }

    attacker.exhausted = true;
    var msg = '';
    var result = 'survive';
    var damage = attacker.attack;

    // Direct attack on opponent
    if (targetIndex === 'face' || targetIndex === otherKey || typeof targetIndex !== 'number' || targetIndex < 0 || targetIndex >= otherSide.field.length) {
      otherSide.hp = Math.max(0, otherSide.hp - damage);
      msg = attacker.name + ' attacks ' + otherKey + ' for ' + damage + ' damage!';
      result = otherSide.hp <= 0 ? 'kill' : 'survive';
    } else {
      // Attack a creature
      var defender = otherSide.field[targetIndex];
      defender.currentHp -= damage;
      // Counter-attack
      var counterDamage = Math.max(0, defender.attack - attacker.defense);
      attacker.currentHp -= counterDamage;

      if (defender.currentHp <= 0) {
        otherSide.graveyard.push(otherSide.field.splice(targetIndex, 1)[0]);
        result = 'kill';
        msg = attacker.name + ' killed ' + defender.name + '!';
      } else {
        result = 'survive';
        msg = attacker.name + ' hit ' + defender.name + ' for ' + damage + ' damage. It survives with ' + defender.currentHp + ' HP.';
      }
      if (attacker.currentHp <= 0) {
        activeSide.graveyard.push(activeSide.field.splice(attackerIndex, 1)[0]);
        result = 'blocked';
        msg += ' ' + attacker.name + ' was destroyed in return.';
      }
    }

    // Clamp HP
    otherSide.hp = Math.max(0, otherSide.hp);
    activeSide.hp = Math.max(0, activeSide.hp);
    newState.log.push(msg);
    return { state: newState, result: result, damage: damage, message: msg };
  }

  /**
   * End current player's turn.
   * @param {object} state - battle state
   * @returns {object} new state
   */
  function endTurn(state) {
    var newState = _cloneBattleState(state);
    newState.turn += 1;
    // Switch active player
    newState.activePlayer = newState.activePlayer === 'player' ? 'opponent' : 'player';
    var nextSide = newState[newState.activePlayer];
    // Increase max mana (cap 10), refill mana
    nextSide.maxMana = Math.min(10, nextSide.maxMana + 1);
    nextSide.mana = nextSide.maxMana;
    // Unexhaust creatures
    for (var i = 0; i < nextSide.field.length; i++) {
      nextSide.field[i].exhausted = false;
    }
    newState.phase = 'draw';
    newState.log.push('Turn ' + newState.turn + ': ' + newState.activePlayer + "'s turn.");
    return newState;
  }

  /**
   * Check if there is a winner.
   * @param {object} state - battle state
   * @returns {null|'player'|'opponent'}
   */
  function checkWinner(state) {
    if (state.opponent.hp <= 0) return 'player';
    if (state.player.hp <= 0) return 'opponent';
    return null;
  }

  /**
   * Run the AI's turn.
   * @param {object} state - battle state
   * @returns {{ state: object, actions: Array }}
   */
  function aiTurn(state) {
    var newState = _cloneBattleState(state);
    var actions = [];

    // Ensure it's the opponent's turn
    if (newState.activePlayer !== 'opponent') {
      return { state: newState, actions: actions };
    }

    var ai = newState.opponent;

    // 1. Play highest cost affordable card(s)
    var maxPlays = 5;
    for (var pass = 0; pass < maxPlays; pass++) {
      var bestIdx = -1;
      var bestCost = -1;
      for (var i = 0; i < ai.hand.length; i++) {
        if (ai.hand[i].cost <= ai.mana && ai.hand[i].cost > bestCost) {
          bestCost = ai.hand[i].cost;
          bestIdx = i;
        }
      }
      if (bestIdx === -1) break;
      var playResult = playCard(newState, 'opponent', bestIdx, 'face');
      newState = playResult.state;
      actions.push({ type: 'play', detail: playResult.message });
      ai = newState.opponent; // Refresh reference
    }

    // 2. Attack with all non-exhausted creatures
    for (var a = 0; a < 10; a++) {
      var opField = newState.opponent.field;
      var attackerIdx = -1;
      for (var k = 0; k < opField.length; k++) {
        if (!opField[k].exhausted) { attackerIdx = k; break; }
      }
      if (attackerIdx === -1) break;

      var playerField = newState.player.field;
      var targetIdx;
      if (playerField.length > 0) {
        // Attack weakest player creature
        var weakest = 0;
        for (var w = 1; w < playerField.length; w++) {
          if (playerField[w].currentHp < playerField[weakest].currentHp) weakest = w;
        }
        targetIdx = weakest;
      } else {
        targetIdx = 'face';
      }

      var atkResult = attackWithCreature(newState, attackerIdx, targetIdx);
      newState = atkResult.state;
      actions.push({ type: 'attack', detail: atkResult.message });
    }

    return { state: newState, actions: actions };
  }

  /**
   * Format battle field as ASCII art.
   * @param {object} state - battle state
   * @returns {string} ASCII display
   */
  function formatBattleField(state) {
    var lines = [];
    var opp = state.opponent;
    var pl = state.player;

    lines.push('Opponent: HP ' + opp.hp + '/' + opp.maxHp + ' | Mana ' + opp.mana + '/' + opp.maxMana + ' | Hand: ' + opp.hand.length + ' cards');

    var oppRow = '';
    for (var oi = 0; oi < opp.field.length; oi++) {
      var oc = opp.field[oi];
      oppRow += '[' + oc.name.substring(0, 8) + ' (' + oc.attack + '/' + oc.currentHp + ')' + (oc.exhausted ? '*' : '') + '] ';
    }
    lines.push(oppRow || '  (no creatures)');
    lines.push('--- field divider ---');

    var plRow = '';
    for (var pi = 0; pi < pl.field.length; pi++) {
      var pc = pl.field[pi];
      plRow += '[' + pc.name.substring(0, 8) + ' (' + pc.attack + '/' + pc.currentHp + ')' + (pc.exhausted ? '*' : '') + '] ';
    }
    lines.push(plRow || '  (no creatures)');
    lines.push('Player: HP ' + pl.hp + '/' + pl.maxHp + ' | Mana ' + pl.mana + '/' + pl.maxMana + ' | Hand: ' + pl.hand.length + ' cards');

    return lines.join('\n');
  }

  function _cloneBattleState(state) {
    return JSON.parse(JSON.stringify(state));
  }

  // ===========================================================================
  // DUNGEON (Text-Based Roguelike)
  // ===========================================================================

  var DUNGEON_DIFFICULTIES = {
    easy:   { rooms: 5,  enemyScale: 0.8, lootScale: 0.8  },
    medium: { rooms: 8,  enemyScale: 1.0, lootScale: 1.0  },
    hard:   { rooms: 12, enemyScale: 1.4, lootScale: 1.3  }
  };

  var ROOM_TYPE_POOL = ['empty', 'enemy', 'treasure', 'puzzle', 'trap', 'rest', 'shop', 'boss'];

  var DUNGEON_ENEMIES = [
    { name: 'Shadow Wisp',    hp: 15, attack: 4,  defense: 1, xp: 10, loot: 5  },
    { name: 'Stone Crawler',  hp: 20, attack: 3,  defense: 3, xp: 12, loot: 8  },
    { name: 'Flame Imp',      hp: 12, attack: 6,  defense: 0, xp: 15, loot: 10 },
    { name: 'Void Stalker',   hp: 25, attack: 5,  defense: 2, xp: 18, loot: 12 },
    { name: 'Crystal Golem',  hp: 40, attack: 6,  defense: 6, xp: 30, loot: 20 },
    { name: 'Nexus Guardian', hp: 60, attack: 10, defense: 8, xp: 50, loot: 40 }
  ];

  var DUNGEON_ITEMS = [
    { name: 'Health Potion',  type: 'consumable', effect: 'heal_25',   value: 10 },
    { name: 'Attack Shard',   type: 'equipment',  effect: 'attack_+3', value: 15 },
    { name: 'Shield Rune',    type: 'equipment',  effect: 'defense_+2',value: 12 },
    { name: 'Spark Coin',     type: 'currency',   effect: 'gold_10',   value: 10 },
    { name: 'Magic Scroll',   type: 'consumable', effect: 'deal_20',   value: 20 },
    { name: 'Lucky Charm',    type: 'passive',    effect: 'luck_+10',  value: 25 }
  ];

  var DUNGEON_PUZZLES = [
    {
      question: 'Three torches lit. Middle must stay unlit. Which sequence opens the door?',
      options: ['Left, Right, Left', 'Right, Left, Right', 'Left, Left, Right', 'None — extinguish all'],
      correct: 1,
      reward: { name: 'Puzzle Gem', value: 20 }
    },
    {
      question: 'The symbol appears: circle, triangle, circle, triangle, circle, ?',
      options: ['Circle', 'Triangle', 'Square', 'Diamond'],
      correct: 1,
      reward: { name: 'Pattern Crystal', value: 15 }
    },
    {
      question: 'I speak without a mouth. I hear without ears. I have no body, but I come alive with wind. What am I?',
      options: ['A shadow', 'An echo', 'A ghost', 'A dream'],
      correct: 1,
      reward: { name: 'Echo Stone', value: 18 }
    },
    {
      question: 'Four pressure plates. Step only on the ones that sum to 10: Plates are 3, 7, 4, 6.',
      options: ['3 and 7', '4 and 6', '3 and 7 and nothing else', '7 only'],
      correct: 0,
      reward: { name: 'Weight Rune', value: 12 }
    }
  ];

  /**
   * Create a new dungeon run.
   * @param {number|string} seed - seed for generation
   * @param {string} difficulty - 'easy', 'medium', or 'hard'
   * @returns {object} dungeon state
   */
  function createDungeonRun(seed, difficulty) {
    var diff = DUNGEON_DIFFICULTIES[difficulty] || DUNGEON_DIFFICULTIES.medium;
    var rng = createRng(typeof seed === 'string' ? hashString(seed) : (seed >>> 0));
    var numRooms = diff.rooms;
    var rooms = [];
    for (var i = 0; i < numRooms; i++) {
      rooms.push(generateRoom(rng, i, difficulty, numRooms));
    }
    // First room is always entrance, last is boss
    rooms[0].type = 'entrance';
    rooms[0].description = 'You stand at the dungeon entrance. Torches flicker on damp stone walls.';
    rooms[0].contents = null;
    rooms[numRooms - 1].type = 'boss';
    rooms[numRooms - 1].description = 'A massive chamber. Something powerful stirs in the darkness.';
    rooms[numRooms - 1].contents = {
      enemy: _scaleEnemy(DUNGEON_ENEMIES[DUNGEON_ENEMIES.length - 1], diff.enemyScale)
    };

    return {
      rooms: rooms,
      currentRoom: 0,
      player: { hp: 100, maxHp: 100, attack: 10, defense: 5, items: [], xp: 0, gold: 0 },
      floor: 1,
      cleared: false,
      log: ['You enter the dungeon. Stay alert.'],
      seed: seed,
      difficulty: difficulty
    };
  }

  /**
   * Generate a single room.
   * @param {function|number} seedOrRng - rng function or seed
   * @param {number} index - room index
   * @param {string} difficulty
   * @param {number} [total] - total rooms
   * @returns {object} room
   */
  function generateRoom(seedOrRng, index, difficulty, total) {
    var rng = typeof seedOrRng === 'function' ? seedOrRng : createRng(typeof seedOrRng === 'string' ? hashString(seedOrRng) : (seedOrRng >>> 0));
    var diff = DUNGEON_DIFFICULTIES[difficulty] || DUNGEON_DIFFICULTIES.medium;
    var numRooms = total || diff.rooms;

    // Pick room type based on position
    var typePool;
    if (index === 0) {
      typePool = ['entrance'];
    } else if (index === numRooms - 1) {
      typePool = ['boss'];
    } else if (index % 4 === 2) {
      typePool = ['rest', 'shop'];
    } else {
      typePool = ['enemy', 'enemy', 'enemy', 'treasure', 'puzzle', 'trap', 'empty'];
    }
    var type = rngPick(rng, typePool);

    var desc = _roomDescription(type, rng);
    var contents = _roomContents(type, rng, diff);
    var exits = _roomExits(index, numRooms, rng);

    return {
      type: type,
      description: desc,
      contents: contents,
      exits: exits,
      visited: false,
      cleared: false
    };
  }

  function _roomDescription(type, rng) {
    var descs = {
      entrance: ['The dungeon entrance. Cold air drifts inward.'],
      empty:    ['A dusty corridor. Nothing stirs.', 'An empty chamber. Old bones litter the floor.', 'A quiet alcove with faded murals.'],
      enemy:    ['Shadows move in the corners. You are not alone.', 'A growl echoes from the darkness.', 'Glowing eyes appear in the gloom.'],
      treasure: ['A stone chest sits in the center of the room.', 'Glittering objects catch the torchlight.', 'You find a locked coffer on a pedestal.'],
      puzzle:   ['Strange mechanisms cover the walls.', 'Inscriptions glow faintly on the floor.', 'Levers and symbols challenge your mind.'],
      trap:     ['The floor feels unsteady.', 'You hear a faint clicking as you enter.', 'Pressure plates dot the stone floor.'],
      rest:     ['A campfire burns low. Someone was here recently.', 'A peaceful alcove with a bedroll.'],
      shop:     ['A hooded merchant sits behind a makeshift counter.', 'A wandering trader eyes you with interest.'],
      boss:     ['The chamber shakes. A colossal shadow rises.']
    };
    var pool = descs[type] || descs.empty;
    return rngPick(rng, pool);
  }

  function _roomContents(type, rng, diff) {
    if (type === 'enemy') {
      var enemyPool = DUNGEON_ENEMIES.slice(0, DUNGEON_ENEMIES.length - 1);
      var enemy = _scaleEnemy(rngPick(rng, enemyPool), diff.enemyScale);
      return { enemy: enemy };
    }
    if (type === 'treasure') {
      return { chest: true, looted: false };
    }
    if (type === 'puzzle') {
      var puzzle = DUNGEON_PUZZLES[Math.floor(rng() * DUNGEON_PUZZLES.length)];
      return { puzzle: JSON.parse(JSON.stringify(puzzle)), solved: false };
    }
    if (type === 'trap') {
      return { damage: rngInt(rng, 5, 20), triggered: false };
    }
    if (type === 'rest') {
      return { rested: false };
    }
    if (type === 'shop') {
      var shopItems = [];
      for (var i = 0; i < 3; i++) {
        shopItems.push(JSON.parse(JSON.stringify(rngPick(rng, DUNGEON_ITEMS))));
      }
      return { items: shopItems };
    }
    return null;
  }

  function _roomExits(index, total, rng) {
    var exits = ['forward'];
    if (index > 0) exits.push('back');
    if (index < total - 1 && rng() > 0.5) exits.push('side');
    return exits;
  }

  function _scaleEnemy(enemy, scale) {
    return {
      name: enemy.name,
      hp: Math.ceil(enemy.hp * scale),
      currentHp: Math.ceil(enemy.hp * scale),
      attack: Math.ceil(enemy.attack * scale),
      defense: Math.ceil(enemy.defense * scale),
      xp: enemy.xp,
      loot: enemy.loot,
      alive: true
    };
  }

  /**
   * Enter a room by direction.
   * @param {object} state - dungeon state
   * @param {string} direction - 'forward', 'back', 'side'
   * @returns {{ state: object, event: object }}
   */
  function enterRoom(state, direction) {
    var newState = _cloneDungeonState(state);
    var currentRoom = newState.rooms[newState.currentRoom];
    var newRoomIndex = newState.currentRoom;

    if (direction === 'forward' && newState.currentRoom < newState.rooms.length - 1) {
      newRoomIndex = newState.currentRoom + 1;
    } else if (direction === 'back' && newState.currentRoom > 0) {
      newRoomIndex = newState.currentRoom - 1;
    } else if (direction === 'side') {
      // Side room: stays on same floor level, try adjacent
      newRoomIndex = Math.min(newState.currentRoom + 1, newState.rooms.length - 1);
    } else {
      return {
        state: newState,
        event: { type: 'invalid', description: 'You cannot go that way.', options: [] }
      };
    }

    newState.currentRoom = newRoomIndex;
    var room = newState.rooms[newRoomIndex];
    room.visited = true;

    var event = _triggerRoomEvent(newState, newRoomIndex);
    newState.log.push(room.description);
    return { state: newState, event: event };
  }

  function _triggerRoomEvent(state, roomIndex) {
    var room = state.rooms[roomIndex];
    if (room.type === 'entrance') {
      return { type: 'entrance', description: room.description, options: ['[Forward] Move deeper', '[Inspect] Look around'] };
    }
    if (room.type === 'empty') {
      room.cleared = true;
      return { type: 'empty', description: room.description, options: ['[Forward] Move on', '[Back] Return'] };
    }
    if (room.type === 'enemy' && room.contents && room.contents.enemy && room.contents.enemy.alive) {
      return {
        type: 'enemy',
        description: room.description + ' A ' + room.contents.enemy.name + ' blocks your path!',
        options: ['[Attack] Fight the enemy', '[Defend] Guard yourself', '[Flee] Run back']
      };
    }
    if (room.type === 'treasure' && room.contents && !room.contents.looted) {
      return {
        type: 'treasure',
        description: room.description,
        options: ['[Open] Open the chest', '[Inspect] Look for traps first', '[Leave] Move on']
      };
    }
    if (room.type === 'puzzle' && room.contents && !room.contents.solved) {
      var puzzle = room.contents.puzzle;
      var opts = puzzle.options.map(function(o, i) { return '[' + (i + 1) + '] ' + o; });
      return {
        type: 'puzzle',
        description: room.description + '\n' + puzzle.question,
        options: opts
      };
    }
    if (room.type === 'trap' && room.contents && !room.contents.triggered) {
      return {
        type: 'trap',
        description: room.description,
        options: ['[Proceed] Walk through carefully', '[Back] Return cautiously']
      };
    }
    if (room.type === 'rest' && room.contents && !room.contents.rested) {
      return {
        type: 'rest',
        description: room.description,
        options: ['[Rest] Rest here (+30% HP)', '[Continue] Keep moving']
      };
    }
    if (room.type === 'shop' && room.contents) {
      var shopOpts = room.contents.items.map(function(it, i) {
        return '[Buy ' + (i + 1) + '] ' + it.name + ' (' + it.value + ' Spark)';
      });
      shopOpts.push('[Leave] Exit shop');
      return {
        type: 'shop',
        description: room.description,
        options: shopOpts
      };
    }
    if (room.type === 'boss' && room.contents && room.contents.enemy && room.contents.enemy.alive) {
      return {
        type: 'boss',
        description: room.description,
        options: ['[Attack] Challenge the boss', '[Flee] Run away']
      };
    }
    // Room already cleared
    room.cleared = true;
    return { type: 'cleared', description: 'The room is clear.', options: ['[Forward] Move on', '[Back] Return'] };
  }

  /**
   * Fight an enemy.
   * @param {object} state - dungeon state
   * @param {string} action - 'attack', 'defend', 'flee'
   * @returns {{ state: object, result: string, message: string }}
   */
  function fightEnemy(state, action) {
    var newState = _cloneDungeonState(state);
    var room = newState.rooms[newState.currentRoom];
    if (!room || !room.contents || !room.contents.enemy || !room.contents.enemy.alive) {
      return { state: newState, result: 'no_enemy', message: 'There is no enemy here.' };
    }

    var player = newState.player;
    var enemy = room.contents.enemy;
    var msg = '';
    var result = 'ongoing';

    if (action === 'flee') {
      if (newState.currentRoom > 0) {
        newState.currentRoom -= 1;
        msg = 'You fled back to the previous room!';
        result = 'fled';
      } else {
        msg = 'Nowhere to flee!';
        result = 'ongoing';
      }
      newState.log.push(msg);
      return { state: newState, result: result, message: msg };
    }

    // Player attacks enemy
    var playerDamage = Math.max(1, player.attack - enemy.defense);
    if (action === 'defend') {
      playerDamage = Math.max(1, Math.floor(playerDamage * 0.5));
    }
    enemy.currentHp -= playerDamage;
    msg += 'You deal ' + playerDamage + ' damage to ' + enemy.name + '. ';

    if (enemy.currentHp <= 0) {
      enemy.alive = false;
      enemy.currentHp = 0;
      room.cleared = true;
      player.xp += enemy.xp;
      player.gold += enemy.loot;
      msg += enemy.name + ' defeated! Gained ' + enemy.xp + ' XP and ' + enemy.loot + ' gold.';
      result = 'victory';
    } else {
      // Enemy attacks player
      var enemyDamage = Math.max(1, enemy.attack - (action === 'defend' ? player.defense * 2 : player.defense));
      player.hp -= enemyDamage;
      msg += enemy.name + ' hits you for ' + enemyDamage + ' damage. ';
      if (player.hp <= 0) {
        player.hp = 0;
        msg += 'You have been defeated!';
        result = 'defeat';
      } else {
        msg += 'You have ' + player.hp + ' HP remaining. Enemy has ' + enemy.currentHp + ' HP.';
      }
    }

    newState.log.push(msg);
    return { state: newState, result: result, message: msg };
  }

  /**
   * Attempt to solve a puzzle.
   * @param {object} state - dungeon state
   * @param {number} answer - option index (0-based)
   * @returns {{ state: object, correct: boolean, reward: object|null, message: string }}
   */
  function solvePuzzle(state, answer) {
    var newState = _cloneDungeonState(state);
    var room = newState.rooms[newState.currentRoom];
    if (!room || room.type !== 'puzzle' || !room.contents || room.contents.solved) {
      return { state: newState, correct: false, reward: null, message: 'No unsolved puzzle here.' };
    }

    var puzzle = room.contents.puzzle;
    var correct = answer === puzzle.correct;
    var msg = '';
    var reward = null;

    if (correct) {
      room.contents.solved = true;
      room.cleared = true;
      reward = puzzle.reward;
      newState.player.items.push(reward);
      msg = 'Correct! The door opens. You receive: ' + reward.name + ' (value: ' + reward.value + ')';
    } else {
      // Wrong answer — take damage
      var penalty = 10;
      newState.player.hp = Math.max(0, newState.player.hp - penalty);
      msg = 'Wrong answer. A trap triggers and deals ' + penalty + ' damage. You have ' + newState.player.hp + ' HP.';
    }

    newState.log.push(msg);
    return { state: newState, correct: correct, reward: reward, message: msg };
  }

  /**
   * Open a treasure chest.
   * @param {object} state - dungeon state
   * @returns {{ state: object, loot: object|null, message: string }}
   */
  function openTreasure(state) {
    var newState = _cloneDungeonState(state);
    var room = newState.rooms[newState.currentRoom];
    if (!room || room.type !== 'treasure' || !room.contents || room.contents.looted) {
      return { state: newState, loot: null, message: 'Nothing to open here.' };
    }

    room.contents.looted = true;
    room.cleared = true;

    // Pick random loot
    var rng = createRng(hashString(newState.seed + ':' + newState.currentRoom));
    var item = JSON.parse(JSON.stringify(rngPick(rng, DUNGEON_ITEMS)));
    newState.player.items.push(item);

    // Also give some gold
    var gold = rngInt(rng, 5, 25);
    newState.player.gold += gold;

    var msg = 'You open the chest and find: ' + item.name + ' and ' + gold + ' gold!';
    newState.log.push(msg);
    return { state: newState, loot: item, message: msg };
  }

  /**
   * Rest at a campfire.
   * @param {object} state - dungeon state
   * @returns {{ state: object, healed: number, message: string }}
   */
  function restAtCamp(state) {
    var newState = _cloneDungeonState(state);
    var room = newState.rooms[newState.currentRoom];
    if (!room || room.type !== 'rest' || !room.contents) {
      return { state: newState, healed: 0, message: 'No place to rest here.' };
    }
    if (room.contents.rested) {
      return { state: newState, healed: 0, message: 'You have already rested here.' };
    }

    var healAmount = Math.floor(newState.player.maxHp * 0.3);
    newState.player.hp = Math.min(newState.player.maxHp, newState.player.hp + healAmount);
    room.contents.rested = true;
    room.cleared = true;

    var msg = 'You rest by the fire and recover ' + healAmount + ' HP. HP: ' + newState.player.hp + '/' + newState.player.maxHp;
    newState.log.push(msg);
    return { state: newState, healed: healAmount, message: msg };
  }

  /**
   * Format dungeon view as ASCII art.
   * @param {object} state - dungeon state
   * @returns {string} ASCII display
   */
  function formatDungeonView(state) {
    var lines = [];
    var rooms = state.rooms;
    var current = state.currentRoom;
    var cols = 3;
    var rows = Math.ceil(rooms.length / cols);

    // Build grid
    for (var r = 0; r < rows; r++) {
      lines.push('+' + new Array(cols).join('---+---+') + '---+');
      var row = '|';
      for (var c = 0; c < cols; c++) {
        var idx = r * cols + c;
        if (idx >= rooms.length) {
          row += '   |';
        } else {
          var room = rooms[idx];
          var sym = _roomSymbol(room, idx === current);
          row += ' ' + sym + ' |';
        }
      }
      lines.push(row);
    }
    lines.push('+' + new Array(cols).join('---+---+') + '---+');

    // Player stats
    var player = state.player;
    var hpBar = _hpBar(player.hp, player.maxHp, 10);
    lines.push('HP: [' + hpBar + '] ' + player.hp + '/' + player.maxHp + '  ATK: ' + player.attack + '  DEF: ' + player.defense);

    var currentRoomObj = rooms[current];
    var roomLabel = currentRoomObj ? currentRoomObj.type : 'unknown';
    lines.push('Room: ' + roomLabel + '  |  Floor ' + state.floor + '  |  ' + _countCleared(rooms) + '/' + rooms.length + ' rooms cleared');

    return lines.join('\n');
  }

  function _roomSymbol(room, isCurrent) {
    if (isCurrent) return '@';
    if (!room.visited) return '?';
    var syms = { entrance: 'S', empty: '.', enemy: 'E', treasure: 'T', puzzle: 'P', trap: '!', rest: 'R', shop: '$', boss: 'B' };
    return syms[room.type] || '.';
  }

  function _hpBar(hp, maxHp, width) {
    var filled = Math.round((hp / maxHp) * width);
    filled = Math.max(0, Math.min(filled, width));
    var bar = '';
    for (var i = 0; i < filled; i++) bar += '#';
    for (var j = filled; j < width; j++) bar += '-';
    return bar;
  }

  function _countCleared(rooms) {
    var count = 0;
    for (var i = 0; i < rooms.length; i++) {
      if (rooms[i].cleared) count++;
    }
    return count;
  }

  function _cloneDungeonState(state) {
    return JSON.parse(JSON.stringify(state));
  }

  // ===========================================================================
  // STARGAZING
  // ===========================================================================

  var CONSTELLATIONS = [
    {
      id: 'nexus_crown',
      name: 'The Nexus Crown',
      stars: 5,
      seasons: ['spring', 'summer', 'winter'],
      timeRange: [20, 4],
      lore: 'Seven founders of ZION who united the zones. Brightest in the winter sky.',
      ascii: ' * * *\n  ***\n   *'
    },
    {
      id: 'wanderers_path',
      name: 'The Wanderer\'s Path',
      stars: 4,
      seasons: ['autumn', 'winter', 'spring'],
      timeRange: [21, 5],
      lore: 'Marks the route taken by the first explorers. A guide for those who travel by night.',
      ascii: '*\n *\n  *\n   *'
    },
    {
      id: 'flame_serpent',
      name: 'The Flame Serpent',
      stars: 7,
      seasons: ['summer', 'spring'],
      timeRange: [22, 3],
      lore: 'Said to have breathed the first fires of the Studio. Artists invoke it for inspiration.',
      ascii: '  *\n * *\n*   *\n * *'
    },
    {
      id: 'water_bearer',
      name: 'The Water Bearer',
      stars: 6,
      seasons: ['winter', 'autumn'],
      timeRange: [19, 2],
      lore: 'Pours celestial streams into the Gardens. Gardeners plant by its light.',
      ascii: '*   *\n * *\n  *  \n * *'
    },
    {
      id: 'great_library',
      name: 'The Great Library',
      stars: 8,
      seasons: ['autumn', 'winter', 'spring', 'summer'],
      timeRange: [20, 6],
      lore: 'Always visible. Represents the eternal accumulation of knowledge at the Athenaeum.',
      ascii: '* * * *\n* * * *'
    },
    {
      id: 'silver_arena',
      name: 'The Silver Arena',
      stars: 5,
      seasons: ['summer', 'autumn'],
      timeRange: [21, 4],
      lore: 'Champions who fell in glorious battle. Their spirits watch each new contest.',
      ascii: ' * *\n*   *\n * *'
    },
    {
      id: 'root_network',
      name: 'The Root Network',
      stars: 9,
      seasons: ['spring', 'winter'],
      timeRange: [23, 5],
      lore: 'Represents the underground pathways connecting all zones beneath the surface.',
      ascii: '  *  *\n * * *\n*   *'
    },
    {
      id: 'twin_moons',
      name: 'The Twin Moons',
      stars: 2,
      seasons: ['spring', 'summer', 'autumn', 'winter'],
      timeRange: [18, 6],
      lore: 'Two moons of ZION — Lumen and Umbra. Represent balance between light and shadow.',
      ascii: '*  *'
    }
  ];

  var CELESTIAL_EVENTS = [
    { id: 'meteor_shower',   name: 'Meteor Shower',   desc: 'Streaks of light cross the sky. Wishes made now are said to come true.',      chance: 0.10 },
    { id: 'lunar_eclipse',   name: 'Lunar Eclipse',   desc: 'Umbra passes before Lumen. A rare and auspicious alignment.',                  chance: 0.05 },
    { id: 'aurora',          name: 'Aurora Nexus',    desc: 'Ribbons of color dance across the horizon. A gift from the zone spirits.',     chance: 0.08 },
    { id: 'comet_passage',   name: 'Comet Passage',   desc: 'A brilliant comet trails across the sky. Occurs once every hundred years.', chance: 0.03 },
    { id: 'alignment',       name: 'Grand Alignment', desc: 'All major constellations align. Sages say destiny is written on such nights.', chance: 0.02 }
  ];

  /**
   * Create stargazing state.
   * @param {number} timeOfDay - hour (0-23)
   * @param {string} season - 'spring', 'summer', 'autumn', 'winter'
   * @returns {object} stargazing state
   */
  function createStargazingState(timeOfDay, season) {
    var visible = getVisibleConstellations(timeOfDay, season);
    return {
      visible: visible,
      identified: [],
      zodiac: _getZodiac(timeOfDay),
      event: null,
      timeOfDay: timeOfDay,
      season: season
    };
  }

  /**
   * Get constellations visible at given time and season.
   * @param {number} timeOfDay - hour (0-23)
   * @param {string} season
   * @returns {Array} visible constellations
   */
  function getVisibleConstellations(timeOfDay, season) {
    // Night hours only
    var isNight = timeOfDay >= 18 || timeOfDay <= 6;
    if (!isNight) return [];

    var visible = [];
    for (var i = 0; i < CONSTELLATIONS.length; i++) {
      var c = CONSTELLATIONS[i];
      if (c.seasons.indexOf(season) === -1) continue;
      // Check time range (wraps midnight)
      var start = c.timeRange[0];
      var end = c.timeRange[1];
      var inRange = false;
      if (start > end) {
        // Wraps midnight
        inRange = timeOfDay >= start || timeOfDay <= end;
      } else {
        inRange = timeOfDay >= start && timeOfDay <= end;
      }
      if (inRange) visible.push(c.id);
    }
    return visible;
  }

  /**
   * Identify a constellation.
   * @param {object} state - stargazing state
   * @param {string} constellationId
   * @returns {{ state: object, success: boolean, constellation: object|null, lore: string }}
   */
  function identifyConstellation(state, constellationId) {
    var newState = JSON.parse(JSON.stringify(state));
    if (newState.visible.indexOf(constellationId) === -1) {
      return { state: newState, success: false, constellation: null, lore: 'That constellation is not visible right now.' };
    }
    if (newState.identified.indexOf(constellationId) !== -1) {
      var known = _findConstellation(constellationId);
      return { state: newState, success: false, constellation: known, lore: 'You have already identified ' + (known ? known.name : constellationId) + '.' };
    }
    var constellation = _findConstellation(constellationId);
    if (!constellation) {
      return { state: newState, success: false, constellation: null, lore: 'Unknown constellation.' };
    }
    newState.identified.push(constellationId);
    return {
      state: newState,
      success: true,
      constellation: constellation,
      lore: constellation.lore
    };
  }

  /**
   * Check for a celestial event.
   * @param {number} timeOfDay - hour
   * @param {number} dayOfYear - day of year (1-365)
   * @returns {object|null} celestial event or null
   */
  function checkCelestialEvent(timeOfDay, dayOfYear) {
    // Only at night
    var isNight = timeOfDay >= 20 || timeOfDay <= 4;
    if (!isNight) return null;

    // Use day of year as seed for determinism
    var rng = createRng(hashString('celestial:' + dayOfYear));
    for (var i = 0; i < CELESTIAL_EVENTS.length; i++) {
      var ev = CELESTIAL_EVENTS[i];
      if (rng() < ev.chance) {
        return { id: ev.id, name: ev.name, desc: ev.desc };
      }
    }
    return null;
  }

  /**
   * Format night sky as ASCII star map.
   * @param {object} state - stargazing state
   * @returns {string} ASCII display
   */
  function formatNightSky(state) {
    var lines = [];
    lines.push('=== Night Sky ===');
    lines.push('Season: ' + state.season + '  |  Time: ' + state.timeOfDay + ':00');

    if (state.visible.length === 0) {
      lines.push('The sky is too bright to see stars. Come back at night.');
      return lines.join('\n');
    }

    lines.push('');
    lines.push('Visible constellations:');

    for (var i = 0; i < state.visible.length; i++) {
      var cid = state.visible[i];
      var constellation = _findConstellation(cid);
      if (!constellation) continue;
      var isIdentified = state.identified.indexOf(cid) !== -1;
      if (isIdentified) {
        lines.push('  [Identified] ' + constellation.name);
        lines.push(constellation.ascii.split('\n').map(function(l) { return '    ' + l; }).join('\n'));
      } else {
        lines.push('  [Unknown]    ???  (' + constellation.stars + ' stars)');
        // Show dots for unidentified
        var dots = '';
        for (var s = 0; s < constellation.stars; s++) dots += '. ';
        lines.push('    ' + dots.trim());
      }
    }

    if (state.event) {
      lines.push('');
      lines.push('** ' + state.event.name + ' **');
      lines.push(state.event.desc);
    }

    return lines.join('\n');
  }

  function _findConstellation(id) {
    for (var i = 0; i < CONSTELLATIONS.length; i++) {
      if (CONSTELLATIONS[i].id === id) return CONSTELLATIONS[i];
    }
    return null;
  }

  function _getZodiac(timeOfDay) {
    var hour = timeOfDay % 24;
    var zodiacSigns = ['Root Network', 'Water Bearer', 'Flame Serpent', 'Nexus Crown',
                       'Silver Arena', 'Great Library', 'Wanderer\'s Path', 'Twin Moons'];
    return zodiacSigns[Math.floor(hour / 3) % zodiacSigns.length];
  }

  // ===========================================================================
  // PANEL BUILDER (DOM — only runs in browser)
  // ===========================================================================

  /**
   * Create the main games panel DOM element.
   * @returns {Element} panel element
   */
  function createGamesPanel() {
    if (typeof document === 'undefined') return null;

    var panel = document.createElement('div');
    panel.className = 'dg-panel';
    panel.style.cssText = 'font-family: monospace; background: #0a0a1a; color: #ccc; padding: 10px; border: 1px solid #333; min-height: 400px;';

    // Tab bar
    var tabs = ['Fishing', 'Card Game', 'Dungeon', 'Stargazing'];
    var tabBar = document.createElement('div');
    tabBar.style.cssText = 'display: flex; gap: 4px; margin-bottom: 10px; border-bottom: 1px solid #333; padding-bottom: 6px;';

    var contentArea = document.createElement('div');
    contentArea.style.cssText = 'min-height: 300px;';

    var activeTab = 0;

    tabs.forEach(function(tabName, idx) {
      var btn = document.createElement('button');
      btn.textContent = tabName;
      btn.style.cssText = 'background: #111; color: #aaa; border: 1px solid #444; padding: 4px 10px; cursor: pointer; font-family: monospace;';
      btn.addEventListener('click', function() {
        activeTab = idx;
        renderTab(contentArea, idx);
        Array.from(tabBar.children).forEach(function(b, bi) {
          b.style.background = bi === idx ? '#222' : '#111';
          b.style.color = bi === idx ? '#fff' : '#aaa';
        });
      });
      if (idx === 0) {
        btn.style.background = '#222';
        btn.style.color = '#fff';
      }
      tabBar.appendChild(btn);
    });

    panel.appendChild(tabBar);
    panel.appendChild(contentArea);

    // Render initial tab
    renderTab(contentArea, 0);

    return panel;
  }

  function renderTab(container, tabIndex) {
    container.innerHTML = '';
    var pre = document.createElement('pre');
    pre.style.cssText = 'margin: 0; color: #ccc; font-size: 12px; white-space: pre-wrap;';

    if (tabIndex === 0) {
      // Fishing
      var fishState = createFishingGame();
      var cast = castLine(fishState, 'nexus');
      pre.textContent = 'FISHING\n\n' + cast.message + '\n\n' +
        'Fish available at nexus:\n' +
        getFishForLocation('nexus').map(function(f) {
          return '  ' + f.name + ' [' + f.rarity + '] — ' + f.desc;
        }).join('\n') +
        '\n\n[Cast] [Reel In] [Check Bite] [View Catches] [Sell]';
    } else if (tabIndex === 1) {
      // Card Game
      var bState = createCardBattleState();
      pre.textContent = 'CARD GAME BATTLE\n\n' + formatBattleField(bState) + '\n\n[Draw] [Play Card] [Attack] [End Turn]';
    } else if (tabIndex === 2) {
      // Dungeon
      var dState = createDungeonRun('default', 'medium');
      pre.textContent = 'DUNGEON EXPLORER\n\n' + formatDungeonView(dState) + '\n\n[Forward] [Back] [Attack] [Use Item]';
    } else if (tabIndex === 3) {
      // Stargazing
      var sgState = createStargazingState(22, 'winter');
      pre.textContent = 'STARGAZING\n\n' + formatNightSky(sgState) + '\n\n[Identify] [Check Events]';
    }

    container.appendChild(pre);
  }

  // ===========================================================================
  // EXPORTS
  // ===========================================================================

  // Fishing
  exports.createFishingGame = createFishingGame;
  exports.castLine = castLine;
  exports.checkBite = checkBite;
  exports.reelIn = reelIn;
  exports.getFishForLocation = getFishForLocation;
  exports.sellFish = sellFish;
  exports.getFishingStats = getFishingStats;
  exports.FISH_BY_ZONE = FISH_BY_ZONE;

  // Card Game
  exports.createCardBattleState = createCardBattleState;
  exports.drawCard = drawCard;
  exports.playCard = playCard;
  exports.attackWithCreature = attackWithCreature;
  exports.endTurn = endTurn;
  exports.checkWinner = checkWinner;
  exports.aiTurn = aiTurn;
  exports.formatBattleField = formatBattleField;
  exports.CARD_CATALOG_SIMPLE = CARD_CATALOG_SIMPLE;

  // Dungeon
  exports.createDungeonRun = createDungeonRun;
  exports.generateRoom = generateRoom;
  exports.enterRoom = enterRoom;
  exports.fightEnemy = fightEnemy;
  exports.solvePuzzle = solvePuzzle;
  exports.openTreasure = openTreasure;
  exports.restAtCamp = restAtCamp;
  exports.formatDungeonView = formatDungeonView;

  // Stargazing
  exports.createStargazingState = createStargazingState;
  exports.getVisibleConstellations = getVisibleConstellations;
  exports.identifyConstellation = identifyConstellation;
  exports.checkCelestialEvent = checkCelestialEvent;
  exports.formatNightSky = formatNightSky;
  exports.CONSTELLATIONS = CONSTELLATIONS;

  // Panel (browser only)
  exports.createGamesPanel = createGamesPanel;

})(typeof module !== 'undefined' ? module.exports : (window.DashboardGames = {}));
