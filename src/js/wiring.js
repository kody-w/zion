/**
 * wiring.js — Cross-System Wiring Hub for ZION MMO
 *
 * Thin dispatch layer that receives game events and routes them to the correct
 * modules. Does NOT duplicate module logic — calls the right functions on the
 * right modules when events happen.
 *
 * Activates all post-WeatherFX modules that are otherwise dead code in bundle.
 * Constitution ref: §1 (Protocol is the only interface), §3 (participation)
 */

(function(exports) {
  'use strict';

  // ==========================================================================
  // MODULE REGISTRY
  // Names match window globals set by the UMD pattern in each module file
  // ==========================================================================

  var MODULE_NAMES = [
    'Progression',
    'DailyChallenges',
    'NpcMemory',
    'FastTravel',
    'Loot',
    'NpcReputation',
    'GuildProgression',
    'Prestige',
    'EventVoting',
    'HousingSocial',
    'Apprenticeship',
    'MentorshipMarket'
  ];

  // ==========================================================================
  // INTERNAL STATE
  // ==========================================================================

  var _handlers = {};
  var _stats = {};
  var _initialized = false;

  // ==========================================================================
  // MODULE RESOLUTION
  // ==========================================================================

  /**
   * Retrieve a module by name from window globals (browser) or global (Node.js).
   * Returns null if the module is not available.
   */
  function _getModule(name) {
    if (typeof window !== 'undefined' && window[name]) return window[name];
    if (typeof global !== 'undefined' && global[name]) return global[name];
    return null;
  }

  // ==========================================================================
  // SAFE CALL HELPER
  // ==========================================================================

  /**
   * Safely call fn(...args), returning the result or null on error.
   * Logs a console.warn when the call fails to aid debugging.
   */
  function _safeCall(moduleName, fnName, args) {
    var mod = _getModule(moduleName);
    if (!mod) return null;
    if (typeof mod[fnName] !== 'function') return null;
    try {
      return mod[fnName].apply(null, args);
    } catch (e) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[Wiring] ' + moduleName + '.' + fnName + ' threw: ' + e.message);
      }
      return null;
    }
  }

  // ==========================================================================
  // STATS HELPERS
  // ==========================================================================

  function _incrementStat(eventName) {
    if (!_stats[eventName]) _stats[eventName] = 0;
    _stats[eventName]++;
  }

  // ==========================================================================
  // EVENT HANDLER REGISTRATION
  // ==========================================================================

  function _registerHandler(eventName, description, fn) {
    if (!_handlers[eventName]) _handlers[eventName] = [];
    _handlers[eventName].push({ description: description, fn: fn });
  }

  // ==========================================================================
  // DISPATCH FUNCTIONS (16 events)
  // ==========================================================================

  /**
   * onZoneChange — player moved from one zone to another.
   *
   * @param {object} state      - World state
   * @param {string} playerId   - Player identifier
   * @param {string} fromZone   - Zone left
   * @param {string} toZone     - Zone entered
   * @returns {object} results  - { xpAwarded, lootResults, challengesUpdated, ... }
   */
  function onZoneChange(state, playerId, fromZone, toZone) {
    _incrementStat('onZoneChange');
    var xpAwarded = 0;
    var lootResults = [];
    var challengesUpdated = 0;

    // Award exploration XP
    var xpResult = _safeCall('Progression', 'awardXP', [state, playerId, 'exploration', 5]);
    if (xpResult !== null) xpAwarded += 5;

    // Update daily challenge progress
    var dcResult = _safeCall('DailyChallenges', 'updateProgress', [state, playerId, 'zone_visit', { zone: toZone }]);
    if (dcResult !== null) challengesUpdated++;

    // Record NPC memory interaction
    _safeCall('NpcMemory', 'recordInteraction', [state, playerId, null, 'zone_visit', { zone: toZone }]);

    // Unlock fast travel location
    _safeCall('FastTravel', 'unlockLocation', [state, playerId, toZone]);

    return {
      xpAwarded: xpAwarded,
      lootResults: lootResults,
      challengesUpdated: challengesUpdated,
      fromZone: fromZone,
      toZone: toZone
    };
  }

  /**
   * onHarvest — player gathered a resource.
   *
   * @param {object} state      - World state
   * @param {string} playerId   - Player identifier
   * @param {string} itemId     - Harvested item id
   * @param {string} zone       - Zone where harvested
   * @param {number} quantity   - Amount harvested
   * @returns {object} results
   */
  function onHarvest(state, playerId, itemId, zone, quantity) {
    _incrementStat('onHarvest');
    var xpAwarded = 0;
    var lootResults = [];
    var challengesUpdated = 0;

    var xpResult = _safeCall('Progression', 'awardXP', [state, playerId, 'gathering', 8]);
    if (xpResult !== null) xpAwarded += 8;

    var dcResult = _safeCall('DailyChallenges', 'updateProgress', [state, playerId, 'harvest', { item: itemId, qty: quantity }]);
    if (dcResult !== null) challengesUpdated++;

    var loot = _safeCall('Loot', 'rollLoot', [state, 'harvest_' + zone, playerId]);
    if (loot !== null) lootResults.push(loot);

    _safeCall('NpcReputation', 'applyAction', [state, playerId, zone, 'harvest', quantity]);

    _safeCall('GuildProgression', 'trackMetric', [state, playerId, 'harvests', quantity]);

    return {
      xpAwarded: xpAwarded,
      lootResults: lootResults,
      challengesUpdated: challengesUpdated,
      itemId: itemId,
      zone: zone,
      quantity: quantity
    };
  }

  /**
   * onCraft — player crafted an item.
   *
   * @param {object} state      - World state
   * @param {string} playerId   - Player identifier
   * @param {string} recipeId   - Recipe used
   * @param {*}      result     - Crafting result object
   * @returns {object} results
   */
  function onCraft(state, playerId, recipeId, result) {
    _incrementStat('onCraft');
    var xpAwarded = 0;
    var lootResults = [];
    var challengesUpdated = 0;

    var xpResult = _safeCall('Progression', 'awardXP', [state, playerId, 'crafting', 10]);
    if (xpResult !== null) xpAwarded += 10;

    var dcResult = _safeCall('DailyChallenges', 'updateProgress', [state, playerId, 'craft', { recipe: recipeId }]);
    if (dcResult !== null) challengesUpdated++;

    _safeCall('GuildProgression', 'trackMetric', [state, playerId, 'crafts', 1]);

    _safeCall('NpcReputation', 'applyAction', [state, playerId, null, 'craft', 1]);

    return {
      xpAwarded: xpAwarded,
      lootResults: lootResults,
      challengesUpdated: challengesUpdated,
      recipeId: recipeId
    };
  }

  /**
   * onFishCaught — player caught a fish.
   *
   * @param {object} state      - World state
   * @param {string} playerId   - Player identifier
   * @param {string} fishId     - Fish type id
   * @param {string} zone       - Zone where caught
   * @param {number} rarity     - Fish rarity (0=common, 1=uncommon, 2=rare, 3=legendary)
   * @returns {object} results
   */
  function onFishCaught(state, playerId, fishId, zone, rarity) {
    _incrementStat('onFishCaught');
    var xpAwarded = 0;
    var lootResults = [];
    var challengesUpdated = 0;
    var xpAmount = 6 + rarity * 4;

    var xpResult = _safeCall('Progression', 'awardXP', [state, playerId, 'fishing', xpAmount]);
    if (xpResult !== null) xpAwarded += xpAmount;

    var dcResult = _safeCall('DailyChallenges', 'updateProgress', [state, playerId, 'fish', { fish: fishId, rarity: rarity }]);
    if (dcResult !== null) challengesUpdated++;

    var loot = _safeCall('Loot', 'rollLoot', [state, 'fishing_' + rarity, playerId]);
    if (loot !== null) lootResults.push(loot);

    _safeCall('NpcReputation', 'applyAction', [state, playerId, zone, 'fish', 1]);

    return {
      xpAwarded: xpAwarded,
      lootResults: lootResults,
      challengesUpdated: challengesUpdated,
      fishId: fishId,
      zone: zone,
      rarity: rarity
    };
  }

  /**
   * onDungeonClear — player cleared a dungeon floor.
   *
   * @param {object} state      - World state
   * @param {string} playerId   - Player identifier
   * @param {string} dungeonId  - Dungeon identifier
   * @param {number} floor      - Floor number cleared
   * @param {number} timeMs     - Time taken in milliseconds
   * @returns {object} results
   */
  function onDungeonClear(state, playerId, dungeonId, floor, timeMs) {
    _incrementStat('onDungeonClear');
    var xpAwarded = 0;
    var lootResults = [];
    var challengesUpdated = 0;
    var xpAmount = 15 + floor * 5;

    var xpResult = _safeCall('Progression', 'awardXP', [state, playerId, 'combat', xpAmount]);
    if (xpResult !== null) xpAwarded += xpAmount;

    var dcResult = _safeCall('DailyChallenges', 'updateProgress', [state, playerId, 'dungeon', { dungeon: dungeonId, floor: floor }]);
    if (dcResult !== null) challengesUpdated++;

    var loot = _safeCall('Loot', 'rollLoot', [state, 'dungeon_' + dungeonId, playerId]);
    if (loot !== null) lootResults.push(loot);

    _safeCall('GuildProgression', 'trackMetric', [state, playerId, 'dungeon_clears', 1]);

    _safeCall('Prestige', 'checkEligibility', [state, playerId]);

    return {
      xpAwarded: xpAwarded,
      lootResults: lootResults,
      challengesUpdated: challengesUpdated,
      dungeonId: dungeonId,
      floor: floor,
      timeMs: timeMs
    };
  }

  /**
   * onNpcInteraction — player interacted with an NPC.
   *
   * @param {object} state            - World state
   * @param {string} playerId         - Player identifier
   * @param {string} npcId            - NPC identifier
   * @param {string} interactionType  - Type of interaction
   * @param {*}      data             - Additional data
   * @returns {object} results
   */
  function onNpcInteraction(state, playerId, npcId, interactionType, data) {
    _incrementStat('onNpcInteraction');
    var xpAwarded = 0;
    var lootResults = [];
    var challengesUpdated = 0;

    _safeCall('NpcMemory', 'recordInteraction', [state, playerId, npcId, interactionType, data]);

    _safeCall('NpcReputation', 'applyAction', [state, playerId, npcId, interactionType, 1]);

    var xpResult = _safeCall('Progression', 'awardXP', [state, playerId, 'social', 3]);
    if (xpResult !== null) xpAwarded += 3;

    var dcResult = _safeCall('DailyChallenges', 'updateProgress', [state, playerId, 'npc_talk', { npc: npcId }]);
    if (dcResult !== null) challengesUpdated++;

    return {
      xpAwarded: xpAwarded,
      lootResults: lootResults,
      challengesUpdated: challengesUpdated,
      npcId: npcId,
      interactionType: interactionType
    };
  }

  /**
   * onQuestComplete — player completed a quest.
   *
   * @param {object} state      - World state
   * @param {string} playerId   - Player identifier
   * @param {string} questId    - Quest identifier
   * @param {*}      rewards    - Reward data
   * @returns {object} results
   */
  function onQuestComplete(state, playerId, questId, rewards) {
    _incrementStat('onQuestComplete');
    var xpAwarded = 0;
    var lootResults = [];
    var challengesUpdated = 0;

    var xpResult = _safeCall('Progression', 'awardXP', [state, playerId, 'questing', 20]);
    if (xpResult !== null) xpAwarded += 20;

    var dcResult = _safeCall('DailyChallenges', 'updateProgress', [state, playerId, 'quest', { quest: questId }]);
    if (dcResult !== null) challengesUpdated++;

    _safeCall('Prestige', 'checkEligibility', [state, playerId]);

    _safeCall('GuildProgression', 'trackMetric', [state, playerId, 'quests', 1]);

    return {
      xpAwarded: xpAwarded,
      lootResults: lootResults,
      challengesUpdated: challengesUpdated,
      questId: questId
    };
  }

  /**
   * onCardGameWin — player won a card game.
   *
   * @param {object} state        - World state
   * @param {string} playerId     - Player identifier
   * @param {string} opponentId   - Opponent identifier
   * @param {string} deckType     - Deck archetype used
   * @returns {object} results
   */
  function onCardGameWin(state, playerId, opponentId, deckType) {
    _incrementStat('onCardGameWin');
    var xpAwarded = 0;
    var lootResults = [];
    var challengesUpdated = 0;

    var xpResult = _safeCall('Progression', 'awardXP', [state, playerId, 'social', 8]);
    if (xpResult !== null) xpAwarded += 8;

    var dcResult = _safeCall('DailyChallenges', 'updateProgress', [state, playerId, 'card_game', { opponent: opponentId }]);
    if (dcResult !== null) challengesUpdated++;

    var loot = _safeCall('Loot', 'rollLoot', [state, 'card_game_win', playerId]);
    if (loot !== null) lootResults.push(loot);

    return {
      xpAwarded: xpAwarded,
      lootResults: lootResults,
      challengesUpdated: challengesUpdated,
      opponentId: opponentId,
      deckType: deckType
    };
  }

  /**
   * onConstellationFound — player discovered a constellation.
   *
   * @param {object} state            - World state
   * @param {string} playerId         - Player identifier
   * @param {string} constellationId  - Constellation identifier
   * @returns {object} results
   */
  function onConstellationFound(state, playerId, constellationId) {
    _incrementStat('onConstellationFound');
    var xpAwarded = 0;
    var lootResults = [];
    var challengesUpdated = 0;

    var xpResult = _safeCall('Progression', 'awardXP', [state, playerId, 'exploration', 12]);
    if (xpResult !== null) xpAwarded += 12;

    var dcResult = _safeCall('DailyChallenges', 'updateProgress', [state, playerId, 'stargazing', { constellation: constellationId }]);
    if (dcResult !== null) challengesUpdated++;

    return {
      xpAwarded: xpAwarded,
      lootResults: lootResults,
      challengesUpdated: challengesUpdated,
      constellationId: constellationId
    };
  }

  /**
   * onTimeCapsuleBuried — player buried a time capsule.
   *
   * @param {object} state      - World state
   * @param {string} playerId   - Player identifier
   * @param {string} capsuleId  - Capsule identifier
   * @param {string} zone       - Zone where buried
   * @returns {object} results
   */
  function onTimeCapsuleBuried(state, playerId, capsuleId, zone) {
    _incrementStat('onTimeCapsuleBuried');
    var xpAwarded = 0;
    var lootResults = [];

    var xpResult = _safeCall('Progression', 'awardXP', [state, playerId, 'exploration', 7]);
    if (xpResult !== null) xpAwarded += 7;

    _safeCall('NpcMemory', 'recordInteraction', [state, playerId, null, 'time_capsule', { capsule: capsuleId, zone: zone }]);

    return {
      xpAwarded: xpAwarded,
      lootResults: lootResults,
      capsuleId: capsuleId,
      zone: zone
    };
  }

  /**
   * onTimeCapsuleFound — player found a buried time capsule.
   *
   * @param {object} state      - World state
   * @param {string} playerId   - Player identifier
   * @param {string} capsuleId  - Capsule identifier
   * @returns {object} results
   */
  function onTimeCapsuleFound(state, playerId, capsuleId) {
    _incrementStat('onTimeCapsuleFound');
    var xpAwarded = 0;
    var lootResults = [];

    var xpResult = _safeCall('Progression', 'awardXP', [state, playerId, 'exploration', 15]);
    if (xpResult !== null) xpAwarded += 15;

    var loot = _safeCall('Loot', 'rollLoot', [state, 'time_capsule', playerId]);
    if (loot !== null) lootResults.push(loot);

    return {
      xpAwarded: xpAwarded,
      lootResults: lootResults,
      capsuleId: capsuleId
    };
  }

  /**
   * onTrade — player completed a trade with another player.
   *
   * @param {object} state          - World state
   * @param {string} playerId       - Player identifier
   * @param {string} otherPlayerId  - Other player identifier
   * @param {Array}  items          - Items traded
   * @param {number} spark          - Spark amount exchanged
   * @returns {object} results
   */
  function onTrade(state, playerId, otherPlayerId, items, spark) {
    _incrementStat('onTrade');
    var xpAwarded = 0;
    var lootResults = [];
    var challengesUpdated = 0;

    var xpResult = _safeCall('Progression', 'awardXP', [state, playerId, 'trading', 5]);
    if (xpResult !== null) xpAwarded += 5;

    var dcResult = _safeCall('DailyChallenges', 'updateProgress', [state, playerId, 'trade', { partner: otherPlayerId }]);
    if (dcResult !== null) challengesUpdated++;

    _safeCall('GuildProgression', 'trackMetric', [state, playerId, 'trades', 1]);

    _safeCall('NpcReputation', 'applyAction', [state, playerId, null, 'trade', 1]);

    return {
      xpAwarded: xpAwarded,
      lootResults: lootResults,
      challengesUpdated: challengesUpdated,
      otherPlayerId: otherPlayerId,
      spark: spark
    };
  }

  /**
   * onBuild — player placed a structure.
   *
   * @param {object} state          - World state
   * @param {string} playerId       - Player identifier
   * @param {string} structureType  - Type of structure placed
   * @param {string} zone           - Zone where built
   * @returns {object} results
   */
  function onBuild(state, playerId, structureType, zone) {
    _incrementStat('onBuild');
    var xpAwarded = 0;
    var lootResults = [];
    var challengesUpdated = 0;

    var xpResult = _safeCall('Progression', 'awardXP', [state, playerId, 'building', 12]);
    if (xpResult !== null) xpAwarded += 12;

    var dcResult = _safeCall('DailyChallenges', 'updateProgress', [state, playerId, 'build', { structure: structureType }]);
    if (dcResult !== null) challengesUpdated++;

    _safeCall('GuildProgression', 'trackMetric', [state, playerId, 'builds', 1]);

    return {
      xpAwarded: xpAwarded,
      lootResults: lootResults,
      challengesUpdated: challengesUpdated,
      structureType: structureType,
      zone: zone
    };
  }

  /**
   * onVoteCast — player cast a vote in a community event.
   *
   * @param {object} state      - World state
   * @param {string} playerId   - Player identifier
   * @param {string} eventId    - Event being voted on
   * @param {string} optionId   - Option chosen
   * @returns {object} results
   */
  function onVoteCast(state, playerId, eventId, optionId) {
    _incrementStat('onVoteCast');
    var xpAwarded = 0;
    var lootResults = [];
    var challengesUpdated = 0;

    _safeCall('EventVoting', 'castVote', [state, playerId, eventId, optionId]);

    var xpResult = _safeCall('Progression', 'awardXP', [state, playerId, 'social', 3]);
    if (xpResult !== null) xpAwarded += 3;

    var dcResult = _safeCall('DailyChallenges', 'updateProgress', [state, playerId, 'vote', { event: eventId }]);
    if (dcResult !== null) challengesUpdated++;

    return {
      xpAwarded: xpAwarded,
      lootResults: lootResults,
      challengesUpdated: challengesUpdated,
      eventId: eventId,
      optionId: optionId
    };
  }

  /**
   * onHousingVisit — player visited another player's house.
   *
   * @param {object} state      - World state
   * @param {string} playerId   - Visiting player identifier
   * @param {string} ownerId    - House owner identifier
   * @param {string} houseId    - House identifier
   * @returns {object} results
   */
  function onHousingVisit(state, playerId, ownerId, houseId) {
    _incrementStat('onHousingVisit');
    var xpAwarded = 0;
    var lootResults = [];

    _safeCall('HousingSocial', 'recordVisit', [state, playerId, ownerId, houseId]);

    var xpResult = _safeCall('Progression', 'awardXP', [state, playerId, 'social', 2]);
    if (xpResult !== null) xpAwarded += 2;

    return {
      xpAwarded: xpAwarded,
      lootResults: lootResults,
      ownerId: ownerId,
      houseId: houseId
    };
  }

  /**
   * onMentorSession — player participated in a mentoring session.
   *
   * @param {object} state      - World state
   * @param {string} playerId   - Student player identifier
   * @param {string} teacherId  - Teacher player identifier
   * @param {string} subject    - Subject taught
   * @returns {object} results
   */
  function onMentorSession(state, playerId, teacherId, subject) {
    _incrementStat('onMentorSession');
    var xpAwarded = 0;
    var lootResults = [];

    _safeCall('Apprenticeship', 'advanceLesson', [state, playerId, teacherId, subject]);

    _safeCall('MentorshipMarket', 'completeSession', [state, playerId, teacherId, subject]);

    var xpResult = _safeCall('Progression', 'awardXP', [state, playerId, 'learning', 10]);
    if (xpResult !== null) xpAwarded += 10;

    return {
      xpAwarded: xpAwarded,
      lootResults: lootResults,
      teacherId: teacherId,
      subject: subject
    };
  }

  // ==========================================================================
  // INIT — Register all dispatch handlers
  // ==========================================================================

  function init() {
    _registerHandler('onZoneChange', 'Award exploration XP (5)', function(state, playerId, fromZone, toZone) {
      return onZoneChange(state, playerId, fromZone, toZone);
    });

    _registerHandler('onHarvest', 'Award gathering XP (8), roll harvest loot, track metrics', function(state, playerId, itemId, zone, quantity) {
      return onHarvest(state, playerId, itemId, zone, quantity);
    });

    _registerHandler('onCraft', 'Award crafting XP (10), update challenges', function(state, playerId, recipeId, result) {
      return onCraft(state, playerId, recipeId, result);
    });

    _registerHandler('onFishCaught', 'Award fishing XP (6+rarity*4), roll fishing loot', function(state, playerId, fishId, zone, rarity) {
      return onFishCaught(state, playerId, fishId, zone, rarity);
    });

    _registerHandler('onDungeonClear', 'Award combat XP (15+floor*5), roll dungeon loot, check prestige', function(state, playerId, dungeonId, floor, timeMs) {
      return onDungeonClear(state, playerId, dungeonId, floor, timeMs);
    });

    _registerHandler('onNpcInteraction', 'Record NPC memory, apply reputation, award social XP (3)', function(state, playerId, npcId, interactionType, data) {
      return onNpcInteraction(state, playerId, npcId, interactionType, data);
    });

    _registerHandler('onQuestComplete', 'Award questing XP (20), check prestige eligibility', function(state, playerId, questId, rewards) {
      return onQuestComplete(state, playerId, questId, rewards);
    });

    _registerHandler('onCardGameWin', 'Award social XP (8), roll card game loot', function(state, playerId, opponentId, deckType) {
      return onCardGameWin(state, playerId, opponentId, deckType);
    });

    _registerHandler('onConstellationFound', 'Award exploration XP (12), update stargazing challenge', function(state, playerId, constellationId) {
      return onConstellationFound(state, playerId, constellationId);
    });

    _registerHandler('onTimeCapsuleBuried', 'Award exploration XP (7), record NPC memory', function(state, playerId, capsuleId, zone) {
      return onTimeCapsuleBuried(state, playerId, capsuleId, zone);
    });

    _registerHandler('onTimeCapsuleFound', 'Award exploration XP (15), roll time capsule loot', function(state, playerId, capsuleId) {
      return onTimeCapsuleFound(state, playerId, capsuleId);
    });

    _registerHandler('onTrade', 'Award trading XP (5), track guild metrics', function(state, playerId, otherPlayerId, items, spark) {
      return onTrade(state, playerId, otherPlayerId, items, spark);
    });

    _registerHandler('onBuild', 'Award building XP (12), track guild builds', function(state, playerId, structureType, zone) {
      return onBuild(state, playerId, structureType, zone);
    });

    _registerHandler('onVoteCast', 'Cast vote via EventVoting, award social XP (3)', function(state, playerId, eventId, optionId) {
      return onVoteCast(state, playerId, eventId, optionId);
    });

    _registerHandler('onHousingVisit', 'Record house visit, award social XP (2)', function(state, playerId, ownerId, houseId) {
      return onHousingVisit(state, playerId, ownerId, houseId);
    });

    _registerHandler('onMentorSession', 'Advance apprenticeship lesson, complete mentorship market session, award learning XP (10)', function(state, playerId, teacherId, subject) {
      return onMentorSession(state, playerId, teacherId, subject);
    });

    _initialized = true;
    return exports;
  }

  // ==========================================================================
  // GENERIC DISPATCHER
  // ==========================================================================

  /**
   * dispatch — generic event dispatcher by event name.
   *
   * @param {string} eventName  - Name of the event (e.g. 'onZoneChange')
   * @param {object} state      - World state
   * @param {string} playerId   - Player identifier
   * @param {...*}   args       - Additional event arguments
   * @returns {object|null} results from the named handler, or null
   */
  function dispatch(eventName, state, playerId) {
    var extraArgs = Array.prototype.slice.call(arguments, 3);
    var fn = exports[eventName];
    if (typeof fn !== 'function') {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[Wiring] dispatch: unknown event "' + eventName + '"');
      }
      return null;
    }
    var callArgs = [state, playerId].concat(extraArgs);
    return fn.apply(null, callArgs);
  }

  // ==========================================================================
  // INTROSPECTION UTILITIES
  // ==========================================================================

  /**
   * getRegisteredEvents — return list of all registered event names.
   * @returns {Array.<string>}
   */
  function getRegisteredEvents() {
    return Object.keys(_handlers);
  }

  /**
   * getEventHandlers — return list of handler descriptions for an event.
   * @param {string} eventName
   * @returns {Array.<string>}
   */
  function getEventHandlers(eventName) {
    var list = _handlers[eventName];
    if (!list) return [];
    return list.map(function(h) { return h.description; });
  }

  /**
   * getStats — return dispatch count statistics.
   * @returns {object} map of eventName -> count
   */
  function getStats() {
    var copy = {};
    var keys = Object.keys(_stats);
    for (var i = 0; i < keys.length; i++) {
      copy[keys[i]] = _stats[keys[i]];
    }
    return copy;
  }

  /**
   * resetStats — zero out all dispatch counters (useful for testing).
   */
  function resetStats() {
    _stats = {};
  }

  // ==========================================================================
  // EXPORTS
  // ==========================================================================

  exports.MODULE_NAMES         = MODULE_NAMES;

  // Dispatch functions
  exports.onZoneChange         = onZoneChange;
  exports.onHarvest            = onHarvest;
  exports.onCraft              = onCraft;
  exports.onFishCaught         = onFishCaught;
  exports.onDungeonClear       = onDungeonClear;
  exports.onNpcInteraction     = onNpcInteraction;
  exports.onQuestComplete      = onQuestComplete;
  exports.onCardGameWin        = onCardGameWin;
  exports.onConstellationFound = onConstellationFound;
  exports.onTimeCapsuleBuried  = onTimeCapsuleBuried;
  exports.onTimeCapsuleFound   = onTimeCapsuleFound;
  exports.onTrade              = onTrade;
  exports.onBuild              = onBuild;
  exports.onVoteCast           = onVoteCast;
  exports.onHousingVisit       = onHousingVisit;
  exports.onMentorSession      = onMentorSession;

  // Registry / introspection
  exports.init                 = init;
  exports.dispatch             = dispatch;
  exports.getRegisteredEvents  = getRegisteredEvents;
  exports.getEventHandlers     = getEventHandlers;
  exports.getStats             = getStats;
  exports.resetStats           = resetStats;

  // Internal helpers exposed for testing
  exports._getModule           = _getModule;
  exports._safeCall            = _safeCall;

})(typeof module !== 'undefined' ? module.exports : (window.Wiring = {}));
