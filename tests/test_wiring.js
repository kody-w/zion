/**
 * tests/test_wiring.js
 * Comprehensive tests for the Wiring cross-system dispatch hub
 * 140+ tests covering all 16 dispatch functions, graceful degradation,
 * generic dispatcher, stats, and introspection utilities.
 */

var passed = 0;
var failed = 0;
var _suiteLabel = '';

function assert(condition, msg) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.log('FAIL [' + _suiteLabel + ']: ' + msg);
  }
}

function suite(label, fn) {
  _suiteLabel = label;
  fn();
}

// ---------------------------------------------------------------------------
// Load module
// ---------------------------------------------------------------------------

var Wiring = require('../src/js/wiring');

// ---------------------------------------------------------------------------
// Mock module factories
// ---------------------------------------------------------------------------

function makeMockProgression() {
  var calls = [];
  var mod = {
    _calls: calls,
    awardXP: function(state, playerId, skill, amount) {
      calls.push({ fn: 'awardXP', skill: skill, amount: amount });
      return { xp: amount, skill: skill };
    }
  };
  return mod;
}

function makeMockDailyChallenges() {
  var calls = [];
  var mod = {
    _calls: calls,
    updateProgress: function(state, playerId, type, data) {
      calls.push({ fn: 'updateProgress', type: type, data: data });
      return { updated: true };
    }
  };
  return mod;
}

function makeMockNpcMemory() {
  var calls = [];
  var mod = {
    _calls: calls,
    recordInteraction: function(state, playerId, npcId, type, data) {
      calls.push({ fn: 'recordInteraction', npcId: npcId, type: type, data: data });
      return { recorded: true };
    }
  };
  return mod;
}

function makeMockFastTravel() {
  var calls = [];
  var mod = {
    _calls: calls,
    unlockLocation: function(state, playerId, zone) {
      calls.push({ fn: 'unlockLocation', zone: zone });
      return { unlocked: zone };
    }
  };
  return mod;
}

function makeMockLoot() {
  var calls = [];
  var mod = {
    _calls: calls,
    rollLoot: function(state, tableKey, playerId) {
      calls.push({ fn: 'rollLoot', tableKey: tableKey });
      return [{ item: 'wood', qty: 1 }];
    }
  };
  return mod;
}

function makeMockNpcReputation() {
  var calls = [];
  var mod = {
    _calls: calls,
    applyAction: function(state, playerId, npcId, action, amount) {
      calls.push({ fn: 'applyAction', npcId: npcId, action: action, amount: amount });
      return { applied: true };
    }
  };
  return mod;
}

function makeMockGuildProgression() {
  var calls = [];
  var mod = {
    _calls: calls,
    trackMetric: function(state, playerId, metric, amount) {
      calls.push({ fn: 'trackMetric', metric: metric, amount: amount });
      return { tracked: true };
    }
  };
  return mod;
}

function makeMockPrestige() {
  var calls = [];
  var mod = {
    _calls: calls,
    checkEligibility: function(state, playerId) {
      calls.push({ fn: 'checkEligibility' });
      return { eligible: false };
    }
  };
  return mod;
}

function makeMockEventVoting() {
  var calls = [];
  var mod = {
    _calls: calls,
    castVote: function(state, playerId, eventId, optionId) {
      calls.push({ fn: 'castVote', eventId: eventId, optionId: optionId });
      return { cast: true };
    }
  };
  return mod;
}

function makeMockHousingSocial() {
  var calls = [];
  var mod = {
    _calls: calls,
    recordVisit: function(state, playerId, ownerId, houseId) {
      calls.push({ fn: 'recordVisit', ownerId: ownerId, houseId: houseId });
      return { visited: true };
    }
  };
  return mod;
}

function makeMockApprenticeship() {
  var calls = [];
  var mod = {
    _calls: calls,
    advanceLesson: function(state, playerId, teacherId, subject) {
      calls.push({ fn: 'advanceLesson', teacherId: teacherId, subject: subject });
      return { advanced: true };
    }
  };
  return mod;
}

function makeMockMentorshipMarket() {
  var calls = [];
  var mod = {
    _calls: calls,
    completeSession: function(state, playerId, teacherId, subject) {
      calls.push({ fn: 'completeSession', teacherId: teacherId, subject: subject });
      return { completed: true };
    }
  };
  return mod;
}

// Install all mocks into window globals
function installAllMocks() {
  global.Progression        = makeMockProgression();
  global.DailyChallenges    = makeMockDailyChallenges();
  global.NpcMemory          = makeMockNpcMemory();
  global.FastTravel         = makeMockFastTravel();
  global.Loot               = makeMockLoot();
  global.NpcReputation      = makeMockNpcReputation();
  global.GuildProgression   = makeMockGuildProgression();
  global.Prestige           = makeMockPrestige();
  global.EventVoting        = makeMockEventVoting();
  global.HousingSocial      = makeMockHousingSocial();
  global.Apprenticeship     = makeMockApprenticeship();
  global.MentorshipMarket   = makeMockMentorshipMarket();
}

// Remove all mocks from window globals
function removeAllMocks() {
  delete global.Progression;
  delete global.DailyChallenges;
  delete global.NpcMemory;
  delete global.FastTravel;
  delete global.Loot;
  delete global.NpcReputation;
  delete global.GuildProgression;
  delete global.Prestige;
  delete global.EventVoting;
  delete global.HousingSocial;
  delete global.Apprenticeship;
  delete global.MentorshipMarket;
}

var DUMMY_STATE  = { players: {}, economy: {} };
var DUMMY_PLAYER = 'player_test';

// ---------------------------------------------------------------------------
// SUITE 1: Module Exports
// ---------------------------------------------------------------------------

suite('Module Exports', function() {
  assert(typeof Wiring === 'object', 'Wiring should be an object');
  assert(typeof Wiring.init === 'function', 'init should be exported');
  assert(typeof Wiring.dispatch === 'function', 'dispatch should be exported');
  assert(typeof Wiring.getRegisteredEvents === 'function', 'getRegisteredEvents should be exported');
  assert(typeof Wiring.getEventHandlers === 'function', 'getEventHandlers should be exported');
  assert(typeof Wiring.getStats === 'function', 'getStats should be exported');
  assert(typeof Wiring.resetStats === 'function', 'resetStats should be exported');
  assert(typeof Wiring.onZoneChange === 'function', 'onZoneChange should be exported');
  assert(typeof Wiring.onHarvest === 'function', 'onHarvest should be exported');
  assert(typeof Wiring.onCraft === 'function', 'onCraft should be exported');
  assert(typeof Wiring.onFishCaught === 'function', 'onFishCaught should be exported');
  assert(typeof Wiring.onDungeonClear === 'function', 'onDungeonClear should be exported');
  assert(typeof Wiring.onNpcInteraction === 'function', 'onNpcInteraction should be exported');
  assert(typeof Wiring.onQuestComplete === 'function', 'onQuestComplete should be exported');
  assert(typeof Wiring.onCardGameWin === 'function', 'onCardGameWin should be exported');
  assert(typeof Wiring.onConstellationFound === 'function', 'onConstellationFound should be exported');
  assert(typeof Wiring.onTimeCapsuleBuried === 'function', 'onTimeCapsuleBuried should be exported');
  assert(typeof Wiring.onTimeCapsuleFound === 'function', 'onTimeCapsuleFound should be exported');
  assert(typeof Wiring.onTrade === 'function', 'onTrade should be exported');
  assert(typeof Wiring.onBuild === 'function', 'onBuild should be exported');
  assert(typeof Wiring.onVoteCast === 'function', 'onVoteCast should be exported');
  assert(typeof Wiring.onHousingVisit === 'function', 'onHousingVisit should be exported');
  assert(typeof Wiring.onMentorSession === 'function', 'onMentorSession should be exported');
  assert(Array.isArray(Wiring.MODULE_NAMES), 'MODULE_NAMES should be an array');
  assert(Wiring.MODULE_NAMES.length >= 8, 'MODULE_NAMES should list at least 8 modules');
});

// ---------------------------------------------------------------------------
// SUITE 2: init() and getRegisteredEvents()
// ---------------------------------------------------------------------------

suite('init and getRegisteredEvents', function() {
  Wiring.init();
  var events = Wiring.getRegisteredEvents();

  assert(Array.isArray(events), 'getRegisteredEvents returns an array');
  assert(events.indexOf('onZoneChange') !== -1, 'onZoneChange is registered');
  assert(events.indexOf('onHarvest') !== -1, 'onHarvest is registered');
  assert(events.indexOf('onCraft') !== -1, 'onCraft is registered');
  assert(events.indexOf('onFishCaught') !== -1, 'onFishCaught is registered');
  assert(events.indexOf('onDungeonClear') !== -1, 'onDungeonClear is registered');
  assert(events.indexOf('onNpcInteraction') !== -1, 'onNpcInteraction is registered');
  assert(events.indexOf('onQuestComplete') !== -1, 'onQuestComplete is registered');
  assert(events.indexOf('onCardGameWin') !== -1, 'onCardGameWin is registered');
  assert(events.indexOf('onConstellationFound') !== -1, 'onConstellationFound is registered');
  assert(events.indexOf('onTimeCapsuleBuried') !== -1, 'onTimeCapsuleBuried is registered');
  assert(events.indexOf('onTimeCapsuleFound') !== -1, 'onTimeCapsuleFound is registered');
  assert(events.indexOf('onTrade') !== -1, 'onTrade is registered');
  assert(events.indexOf('onBuild') !== -1, 'onBuild is registered');
  assert(events.indexOf('onVoteCast') !== -1, 'onVoteCast is registered');
  assert(events.indexOf('onHousingVisit') !== -1, 'onHousingVisit is registered');
  assert(events.indexOf('onMentorSession') !== -1, 'onMentorSession is registered');
  assert(events.length >= 16, 'at least 16 events registered');

  var handlers = Wiring.getEventHandlers('onZoneChange');
  assert(Array.isArray(handlers), 'getEventHandlers returns array');
  assert(handlers.length >= 1, 'onZoneChange has at least one handler description');
  assert(typeof handlers[0] === 'string', 'handler descriptions are strings');

  var unknownHandlers = Wiring.getEventHandlers('doesNotExist');
  assert(Array.isArray(unknownHandlers), 'getEventHandlers returns array for unknown event');
  assert(unknownHandlers.length === 0, 'unknown event has no handlers');
});

// ---------------------------------------------------------------------------
// SUITE 3: onZoneChange — with all mocks
// ---------------------------------------------------------------------------

suite('onZoneChange with all mocks', function() {
  installAllMocks();
  Wiring.resetStats();

  var result = Wiring.onZoneChange(DUMMY_STATE, DUMMY_PLAYER, 'nexus', 'gardens');

  assert(typeof result === 'object', 'returns an object');
  assert(result.xpAwarded === 5, 'awards 5 exploration XP');
  assert(result.toZone === 'gardens', 'toZone is correct');
  assert(result.fromZone === 'nexus', 'fromZone is correct');
  assert(Array.isArray(result.lootResults), 'lootResults is an array');
  assert(typeof result.challengesUpdated === 'number', 'challengesUpdated is a number');

  assert(global.Progression._calls.length >= 1, 'Progression.awardXP was called');
  assert(global.Progression._calls[0].skill === 'exploration', 'awardXP called with exploration skill');
  assert(global.Progression._calls[0].amount === 5, 'awardXP called with amount 5');

  assert(global.DailyChallenges._calls.length >= 1, 'DailyChallenges.updateProgress was called');
  assert(global.DailyChallenges._calls[0].type === 'zone_visit', 'updateProgress type is zone_visit');
  assert(global.DailyChallenges._calls[0].data.zone === 'gardens', 'updateProgress data has toZone');

  assert(global.NpcMemory._calls.length >= 1, 'NpcMemory.recordInteraction was called');
  assert(global.NpcMemory._calls[0].type === 'zone_visit', 'recordInteraction type is zone_visit');

  assert(global.FastTravel._calls.length >= 1, 'FastTravel.unlockLocation was called');
  assert(global.FastTravel._calls[0].zone === 'gardens', 'unlockLocation called with toZone');

  removeAllMocks();
});

// ---------------------------------------------------------------------------
// SUITE 4: onZoneChange — no modules available
// ---------------------------------------------------------------------------

suite('onZoneChange with no mocks', function() {
  removeAllMocks();
  Wiring.resetStats();

  var threw = false;
  var result;
  try {
    result = Wiring.onZoneChange(DUMMY_STATE, DUMMY_PLAYER, 'nexus', 'gardens');
  } catch (e) {
    threw = true;
  }

  assert(!threw, 'onZoneChange does not throw when modules are missing');
  assert(typeof result === 'object', 'returns an object even with no modules');
  assert(result.xpAwarded === 0, 'xpAwarded is 0 when Progression unavailable');
  assert(result.challengesUpdated === 0, 'challengesUpdated is 0 when DailyChallenges unavailable');
});

// ---------------------------------------------------------------------------
// SUITE 5: onHarvest — with all mocks
// ---------------------------------------------------------------------------

suite('onHarvest with all mocks', function() {
  installAllMocks();
  Wiring.resetStats();

  var result = Wiring.onHarvest(DUMMY_STATE, DUMMY_PLAYER, 'herbs', 'gardens', 3);

  assert(typeof result === 'object', 'returns an object');
  assert(result.xpAwarded === 8, 'awards 8 gathering XP');
  assert(result.itemId === 'herbs', 'itemId correct');
  assert(result.zone === 'gardens', 'zone correct');
  assert(result.quantity === 3, 'quantity correct');
  assert(result.lootResults.length >= 1, 'has loot results');

  assert(global.Progression._calls[0].skill === 'gathering', 'awardXP called with gathering');
  assert(global.Progression._calls[0].amount === 8, 'awardXP called with 8');
  assert(global.DailyChallenges._calls[0].type === 'harvest', 'updateProgress type is harvest');
  assert(global.DailyChallenges._calls[0].data.item === 'herbs', 'updateProgress data item correct');
  assert(global.DailyChallenges._calls[0].data.qty === 3, 'updateProgress data qty correct');
  assert(global.Loot._calls[0].tableKey === 'harvest_gardens', 'Loot rolled for harvest_gardens');
  assert(global.NpcReputation._calls[0].action === 'harvest', 'NpcReputation action is harvest');
  assert(global.GuildProgression._calls[0].metric === 'harvests', 'GuildProgression tracks harvests');
  assert(global.GuildProgression._calls[0].amount === 3, 'GuildProgression tracks quantity');

  removeAllMocks();
});

// ---------------------------------------------------------------------------
// SUITE 6: onHarvest — no modules
// ---------------------------------------------------------------------------

suite('onHarvest with no mocks', function() {
  removeAllMocks();

  var threw = false;
  var result;
  try {
    result = Wiring.onHarvest(DUMMY_STATE, DUMMY_PLAYER, 'wood', 'wilds', 5);
  } catch (e) {
    threw = true;
  }

  assert(!threw, 'onHarvest does not throw when modules missing');
  assert(result.xpAwarded === 0, 'xpAwarded 0 with no Progression');
  assert(result.lootResults.length === 0, 'no loot without Loot module');
});

// ---------------------------------------------------------------------------
// SUITE 7: onCraft — with all mocks
// ---------------------------------------------------------------------------

suite('onCraft with all mocks', function() {
  installAllMocks();
  Wiring.resetStats();

  var result = Wiring.onCraft(DUMMY_STATE, DUMMY_PLAYER, 'iron_sword', { name: 'Iron Sword' });

  assert(result.xpAwarded === 10, 'awards 10 crafting XP');
  assert(result.recipeId === 'iron_sword', 'recipeId correct');
  assert(global.Progression._calls[0].skill === 'crafting', 'awardXP crafting skill');
  assert(global.Progression._calls[0].amount === 10, 'awardXP 10');
  assert(global.DailyChallenges._calls[0].type === 'craft', 'updateProgress type craft');
  assert(global.DailyChallenges._calls[0].data.recipe === 'iron_sword', 'updateProgress recipe correct');
  assert(global.GuildProgression._calls[0].metric === 'crafts', 'GuildProgression crafts metric');
  assert(global.NpcReputation._calls[0].action === 'craft', 'NpcReputation craft action');

  removeAllMocks();
});

// ---------------------------------------------------------------------------
// SUITE 8: onCraft — no modules
// ---------------------------------------------------------------------------

suite('onCraft with no mocks', function() {
  removeAllMocks();

  var threw = false;
  var result;
  try {
    result = Wiring.onCraft(DUMMY_STATE, DUMMY_PLAYER, 'potion', null);
  } catch (e) {
    threw = true;
  }

  assert(!threw, 'onCraft does not throw when modules missing');
  assert(result.xpAwarded === 0, 'xpAwarded 0');
});

// ---------------------------------------------------------------------------
// SUITE 9: onFishCaught — XP formula and mocks
// ---------------------------------------------------------------------------

suite('onFishCaught with all mocks', function() {
  installAllMocks();
  Wiring.resetStats();

  var result = Wiring.onFishCaught(DUMMY_STATE, DUMMY_PLAYER, 'bass', 'commons', 2);

  assert(result.xpAwarded === 14, 'awards 6 + 2*4 = 14 XP for rarity 2');
  assert(result.fishId === 'bass', 'fishId correct');
  assert(result.zone === 'commons', 'zone correct');
  assert(result.rarity === 2, 'rarity correct');
  assert(global.Progression._calls[0].skill === 'fishing', 'awardXP fishing skill');
  assert(global.DailyChallenges._calls[0].type === 'fish', 'updateProgress type fish');
  assert(global.DailyChallenges._calls[0].data.fish === 'bass', 'data fish correct');
  assert(global.DailyChallenges._calls[0].data.rarity === 2, 'data rarity correct');
  assert(global.Loot._calls[0].tableKey === 'fishing_2', 'Loot table is fishing_2');
  assert(global.NpcReputation._calls[0].action === 'fish', 'NpcReputation fish action');

  removeAllMocks();
});

// ---------------------------------------------------------------------------
// SUITE 10: onFishCaught XP formulas per rarity level
// ---------------------------------------------------------------------------

suite('onFishCaught XP formulas', function() {
  installAllMocks();
  Wiring.resetStats();

  // rarity 0 → 6 + 0*4 = 6
  var r0 = Wiring.onFishCaught(DUMMY_STATE, DUMMY_PLAYER, 'minnow', 'nexus', 0);
  assert(r0.xpAwarded === 6, 'rarity 0 yields 6 XP');

  // rarity 1 → 6 + 1*4 = 10
  installAllMocks();
  var r1 = Wiring.onFishCaught(DUMMY_STATE, DUMMY_PLAYER, 'trout', 'nexus', 1);
  assert(r1.xpAwarded === 10, 'rarity 1 yields 10 XP');

  // rarity 3 → 6 + 3*4 = 18
  installAllMocks();
  var r3 = Wiring.onFishCaught(DUMMY_STATE, DUMMY_PLAYER, 'dragon_fish', 'wilds', 3);
  assert(r3.xpAwarded === 18, 'rarity 3 yields 18 XP');

  removeAllMocks();
});

// ---------------------------------------------------------------------------
// SUITE 11: onFishCaught — no modules
// ---------------------------------------------------------------------------

suite('onFishCaught with no mocks', function() {
  removeAllMocks();

  var threw = false;
  var result;
  try {
    result = Wiring.onFishCaught(DUMMY_STATE, DUMMY_PLAYER, 'carp', 'wilds', 1);
  } catch (e) {
    threw = true;
  }

  assert(!threw, 'onFishCaught does not throw');
  assert(result.xpAwarded === 0, 'xpAwarded 0');
  assert(result.lootResults.length === 0, 'no loot');
});

// ---------------------------------------------------------------------------
// SUITE 12: onDungeonClear — with all mocks
// ---------------------------------------------------------------------------

suite('onDungeonClear with all mocks', function() {
  installAllMocks();
  Wiring.resetStats();

  var result = Wiring.onDungeonClear(DUMMY_STATE, DUMMY_PLAYER, 'crypt', 3, 120000);

  assert(result.xpAwarded === 30, 'awards 15 + 3*5 = 30 XP for floor 3');
  assert(result.dungeonId === 'crypt', 'dungeonId correct');
  assert(result.floor === 3, 'floor correct');
  assert(result.timeMs === 120000, 'timeMs correct');
  assert(global.Progression._calls[0].skill === 'combat', 'awardXP combat skill');
  assert(global.DailyChallenges._calls[0].type === 'dungeon', 'updateProgress dungeon');
  assert(global.Loot._calls[0].tableKey === 'dungeon_crypt', 'Loot table dungeon_crypt');
  assert(global.GuildProgression._calls[0].metric === 'dungeon_clears', 'GuildProgression dungeon_clears');
  assert(global.Prestige._calls.length >= 1, 'Prestige.checkEligibility called');

  removeAllMocks();
});

// ---------------------------------------------------------------------------
// SUITE 13: onDungeonClear XP formula per floor
// ---------------------------------------------------------------------------

suite('onDungeonClear XP formulas', function() {
  installAllMocks();

  var f1 = Wiring.onDungeonClear(DUMMY_STATE, DUMMY_PLAYER, 'd1', 1, 0);
  assert(f1.xpAwarded === 20, 'floor 1 yields 15+5=20 XP');

  installAllMocks();
  var f5 = Wiring.onDungeonClear(DUMMY_STATE, DUMMY_PLAYER, 'd1', 5, 0);
  assert(f5.xpAwarded === 40, 'floor 5 yields 15+25=40 XP');

  installAllMocks();
  var f0 = Wiring.onDungeonClear(DUMMY_STATE, DUMMY_PLAYER, 'd1', 0, 0);
  assert(f0.xpAwarded === 15, 'floor 0 yields 15+0=15 XP');

  removeAllMocks();
});

// ---------------------------------------------------------------------------
// SUITE 14: onDungeonClear — no modules
// ---------------------------------------------------------------------------

suite('onDungeonClear with no mocks', function() {
  removeAllMocks();

  var threw = false;
  var result;
  try {
    result = Wiring.onDungeonClear(DUMMY_STATE, DUMMY_PLAYER, 'ruins', 2, 60000);
  } catch (e) {
    threw = true;
  }

  assert(!threw, 'onDungeonClear does not throw');
  assert(result.xpAwarded === 0, 'xpAwarded 0');
});

// ---------------------------------------------------------------------------
// SUITE 15: onNpcInteraction — with all mocks
// ---------------------------------------------------------------------------

suite('onNpcInteraction with all mocks', function() {
  installAllMocks();
  Wiring.resetStats();

  var result = Wiring.onNpcInteraction(DUMMY_STATE, DUMMY_PLAYER, 'npc_elder', 'greet', { greeting: 'hello' });

  assert(result.xpAwarded === 3, 'awards 3 social XP');
  assert(result.npcId === 'npc_elder', 'npcId correct');
  assert(result.interactionType === 'greet', 'interactionType correct');
  assert(global.NpcMemory._calls.length >= 1, 'NpcMemory.recordInteraction called');
  assert(global.NpcMemory._calls[0].npcId === 'npc_elder', 'recordInteraction npcId correct');
  assert(global.NpcMemory._calls[0].type === 'greet', 'recordInteraction type correct');
  assert(global.NpcReputation._calls.length >= 1, 'NpcReputation.applyAction called');
  assert(global.NpcReputation._calls[0].npcId === 'npc_elder', 'applyAction npcId correct');
  assert(global.NpcReputation._calls[0].action === 'greet', 'applyAction action correct');
  assert(global.DailyChallenges._calls[0].type === 'npc_talk', 'updateProgress npc_talk');
  assert(global.DailyChallenges._calls[0].data.npc === 'npc_elder', 'updateProgress npc correct');

  removeAllMocks();
});

// ---------------------------------------------------------------------------
// SUITE 16: onNpcInteraction — no modules
// ---------------------------------------------------------------------------

suite('onNpcInteraction with no mocks', function() {
  removeAllMocks();

  var threw = false;
  var result;
  try {
    result = Wiring.onNpcInteraction(DUMMY_STATE, DUMMY_PLAYER, 'npc_guard', 'trade', {});
  } catch (e) {
    threw = true;
  }

  assert(!threw, 'onNpcInteraction does not throw');
  assert(result.xpAwarded === 0, 'xpAwarded 0');
});

// ---------------------------------------------------------------------------
// SUITE 17: onQuestComplete — with all mocks
// ---------------------------------------------------------------------------

suite('onQuestComplete with all mocks', function() {
  installAllMocks();
  Wiring.resetStats();

  var result = Wiring.onQuestComplete(DUMMY_STATE, DUMMY_PLAYER, 'quest_rescue', { spark: 50 });

  assert(result.xpAwarded === 20, 'awards 20 questing XP');
  assert(result.questId === 'quest_rescue', 'questId correct');
  assert(global.Progression._calls[0].skill === 'questing', 'awardXP questing skill');
  assert(global.DailyChallenges._calls[0].type === 'quest', 'updateProgress quest');
  assert(global.Prestige._calls.length >= 1, 'Prestige.checkEligibility called');
  assert(global.GuildProgression._calls[0].metric === 'quests', 'GuildProgression quests');

  removeAllMocks();
});

// ---------------------------------------------------------------------------
// SUITE 18: onQuestComplete — no modules
// ---------------------------------------------------------------------------

suite('onQuestComplete with no mocks', function() {
  removeAllMocks();

  var threw = false;
  var result;
  try {
    result = Wiring.onQuestComplete(DUMMY_STATE, DUMMY_PLAYER, 'quest_explore', null);
  } catch (e) {
    threw = true;
  }

  assert(!threw, 'onQuestComplete does not throw');
  assert(result.xpAwarded === 0, 'xpAwarded 0');
});

// ---------------------------------------------------------------------------
// SUITE 19: onCardGameWin — with all mocks
// ---------------------------------------------------------------------------

suite('onCardGameWin with all mocks', function() {
  installAllMocks();
  Wiring.resetStats();

  var result = Wiring.onCardGameWin(DUMMY_STATE, DUMMY_PLAYER, 'player_opponent', 'aggro');

  assert(result.xpAwarded === 8, 'awards 8 social XP');
  assert(result.opponentId === 'player_opponent', 'opponentId correct');
  assert(result.deckType === 'aggro', 'deckType correct');
  assert(global.Progression._calls[0].skill === 'social', 'awardXP social skill');
  assert(global.DailyChallenges._calls[0].type === 'card_game', 'updateProgress card_game');
  assert(global.DailyChallenges._calls[0].data.opponent === 'player_opponent', 'opponent in data');
  assert(global.Loot._calls[0].tableKey === 'card_game_win', 'Loot table card_game_win');
  assert(result.lootResults.length >= 1, 'has loot results');

  removeAllMocks();
});

// ---------------------------------------------------------------------------
// SUITE 20: onCardGameWin — no modules
// ---------------------------------------------------------------------------

suite('onCardGameWin with no mocks', function() {
  removeAllMocks();

  var threw = false;
  var result;
  try {
    result = Wiring.onCardGameWin(DUMMY_STATE, DUMMY_PLAYER, 'opp', 'control');
  } catch (e) {
    threw = true;
  }

  assert(!threw, 'onCardGameWin does not throw');
  assert(result.xpAwarded === 0, 'xpAwarded 0');
});

// ---------------------------------------------------------------------------
// SUITE 21: onConstellationFound — with all mocks
// ---------------------------------------------------------------------------

suite('onConstellationFound with all mocks', function() {
  installAllMocks();
  Wiring.resetStats();

  var result = Wiring.onConstellationFound(DUMMY_STATE, DUMMY_PLAYER, 'orion');

  assert(result.xpAwarded === 12, 'awards 12 exploration XP');
  assert(result.constellationId === 'orion', 'constellationId correct');
  assert(global.Progression._calls[0].skill === 'exploration', 'awardXP exploration skill');
  assert(global.DailyChallenges._calls[0].type === 'stargazing', 'updateProgress stargazing');
  assert(global.DailyChallenges._calls[0].data.constellation === 'orion', 'constellation in data');

  removeAllMocks();
});

// ---------------------------------------------------------------------------
// SUITE 22: onConstellationFound — no modules
// ---------------------------------------------------------------------------

suite('onConstellationFound with no mocks', function() {
  removeAllMocks();

  var threw = false;
  var result;
  try {
    result = Wiring.onConstellationFound(DUMMY_STATE, DUMMY_PLAYER, 'cassiopeia');
  } catch (e) {
    threw = true;
  }

  assert(!threw, 'onConstellationFound does not throw');
  assert(result.xpAwarded === 0, 'xpAwarded 0');
});

// ---------------------------------------------------------------------------
// SUITE 23: onTimeCapsuleBuried — with all mocks
// ---------------------------------------------------------------------------

suite('onTimeCapsuleBuried with all mocks', function() {
  installAllMocks();
  Wiring.resetStats();

  var result = Wiring.onTimeCapsuleBuried(DUMMY_STATE, DUMMY_PLAYER, 'capsule_001', 'wilds');

  assert(result.xpAwarded === 7, 'awards 7 exploration XP');
  assert(result.capsuleId === 'capsule_001', 'capsuleId correct');
  assert(result.zone === 'wilds', 'zone correct');
  assert(global.Progression._calls[0].skill === 'exploration', 'awardXP exploration');
  assert(global.NpcMemory._calls.length >= 1, 'NpcMemory.recordInteraction called');
  assert(global.NpcMemory._calls[0].type === 'time_capsule', 'recordInteraction type time_capsule');
  assert(global.NpcMemory._calls[0].data.capsule === 'capsule_001', 'capsule id in data');
  assert(global.NpcMemory._calls[0].data.zone === 'wilds', 'zone in data');

  removeAllMocks();
});

// ---------------------------------------------------------------------------
// SUITE 24: onTimeCapsuleBuried — no modules
// ---------------------------------------------------------------------------

suite('onTimeCapsuleBuried with no mocks', function() {
  removeAllMocks();

  var threw = false;
  var result;
  try {
    result = Wiring.onTimeCapsuleBuried(DUMMY_STATE, DUMMY_PLAYER, 'cap_x', 'arena');
  } catch (e) {
    threw = true;
  }

  assert(!threw, 'onTimeCapsuleBuried does not throw');
  assert(result.xpAwarded === 0, 'xpAwarded 0');
});

// ---------------------------------------------------------------------------
// SUITE 25: onTimeCapsuleFound — with all mocks
// ---------------------------------------------------------------------------

suite('onTimeCapsuleFound with all mocks', function() {
  installAllMocks();
  Wiring.resetStats();

  var result = Wiring.onTimeCapsuleFound(DUMMY_STATE, DUMMY_PLAYER, 'capsule_002');

  assert(result.xpAwarded === 15, 'awards 15 exploration XP');
  assert(result.capsuleId === 'capsule_002', 'capsuleId correct');
  assert(global.Progression._calls[0].skill === 'exploration', 'awardXP exploration');
  assert(global.Loot._calls[0].tableKey === 'time_capsule', 'Loot table time_capsule');
  assert(result.lootResults.length >= 1, 'has loot results');

  removeAllMocks();
});

// ---------------------------------------------------------------------------
// SUITE 26: onTimeCapsuleFound — no modules
// ---------------------------------------------------------------------------

suite('onTimeCapsuleFound with no mocks', function() {
  removeAllMocks();

  var threw = false;
  var result;
  try {
    result = Wiring.onTimeCapsuleFound(DUMMY_STATE, DUMMY_PLAYER, 'cap_y');
  } catch (e) {
    threw = true;
  }

  assert(!threw, 'onTimeCapsuleFound does not throw');
  assert(result.xpAwarded === 0, 'xpAwarded 0');
  assert(result.lootResults.length === 0, 'no loot');
});

// ---------------------------------------------------------------------------
// SUITE 27: onTrade — with all mocks
// ---------------------------------------------------------------------------

suite('onTrade with all mocks', function() {
  installAllMocks();
  Wiring.resetStats();

  var result = Wiring.onTrade(DUMMY_STATE, DUMMY_PLAYER, 'player_b', ['wood'], 100);

  assert(result.xpAwarded === 5, 'awards 5 trading XP');
  assert(result.otherPlayerId === 'player_b', 'otherPlayerId correct');
  assert(result.spark === 100, 'spark correct');
  assert(global.Progression._calls[0].skill === 'trading', 'awardXP trading skill');
  assert(global.DailyChallenges._calls[0].type === 'trade', 'updateProgress trade');
  assert(global.DailyChallenges._calls[0].data.partner === 'player_b', 'partner in data');
  assert(global.GuildProgression._calls[0].metric === 'trades', 'GuildProgression trades');
  assert(global.NpcReputation._calls[0].action === 'trade', 'NpcReputation trade action');

  removeAllMocks();
});

// ---------------------------------------------------------------------------
// SUITE 28: onTrade — no modules
// ---------------------------------------------------------------------------

suite('onTrade with no mocks', function() {
  removeAllMocks();

  var threw = false;
  var result;
  try {
    result = Wiring.onTrade(DUMMY_STATE, DUMMY_PLAYER, 'player_c', [], 0);
  } catch (e) {
    threw = true;
  }

  assert(!threw, 'onTrade does not throw');
  assert(result.xpAwarded === 0, 'xpAwarded 0');
});

// ---------------------------------------------------------------------------
// SUITE 29: onBuild — with all mocks
// ---------------------------------------------------------------------------

suite('onBuild with all mocks', function() {
  installAllMocks();
  Wiring.resetStats();

  var result = Wiring.onBuild(DUMMY_STATE, DUMMY_PLAYER, 'watchtower', 'wilds');

  assert(result.xpAwarded === 12, 'awards 12 building XP');
  assert(result.structureType === 'watchtower', 'structureType correct');
  assert(result.zone === 'wilds', 'zone correct');
  assert(global.Progression._calls[0].skill === 'building', 'awardXP building skill');
  assert(global.DailyChallenges._calls[0].type === 'build', 'updateProgress build');
  assert(global.DailyChallenges._calls[0].data.structure === 'watchtower', 'structure in data');
  assert(global.GuildProgression._calls[0].metric === 'builds', 'GuildProgression builds');

  removeAllMocks();
});

// ---------------------------------------------------------------------------
// SUITE 30: onBuild — no modules
// ---------------------------------------------------------------------------

suite('onBuild with no mocks', function() {
  removeAllMocks();

  var threw = false;
  var result;
  try {
    result = Wiring.onBuild(DUMMY_STATE, DUMMY_PLAYER, 'house', 'nexus');
  } catch (e) {
    threw = true;
  }

  assert(!threw, 'onBuild does not throw');
  assert(result.xpAwarded === 0, 'xpAwarded 0');
});

// ---------------------------------------------------------------------------
// SUITE 31: onVoteCast — with all mocks
// ---------------------------------------------------------------------------

suite('onVoteCast with all mocks', function() {
  installAllMocks();
  Wiring.resetStats();

  var result = Wiring.onVoteCast(DUMMY_STATE, DUMMY_PLAYER, 'harvest_festival', 'feast');

  assert(result.xpAwarded === 3, 'awards 3 social XP');
  assert(result.eventId === 'harvest_festival', 'eventId correct');
  assert(result.optionId === 'feast', 'optionId correct');
  assert(global.EventVoting._calls.length >= 1, 'EventVoting.castVote called');
  assert(global.EventVoting._calls[0].eventId === 'harvest_festival', 'castVote eventId correct');
  assert(global.EventVoting._calls[0].optionId === 'feast', 'castVote optionId correct');
  assert(global.Progression._calls[0].skill === 'social', 'awardXP social');
  assert(global.DailyChallenges._calls[0].type === 'vote', 'updateProgress vote');
  assert(global.DailyChallenges._calls[0].data.event === 'harvest_festival', 'event in data');

  removeAllMocks();
});

// ---------------------------------------------------------------------------
// SUITE 32: onVoteCast — no modules
// ---------------------------------------------------------------------------

suite('onVoteCast with no mocks', function() {
  removeAllMocks();

  var threw = false;
  var result;
  try {
    result = Wiring.onVoteCast(DUMMY_STATE, DUMMY_PLAYER, 'storm_event', 'shelter');
  } catch (e) {
    threw = true;
  }

  assert(!threw, 'onVoteCast does not throw');
  assert(result.xpAwarded === 0, 'xpAwarded 0');
});

// ---------------------------------------------------------------------------
// SUITE 33: onHousingVisit — with all mocks
// ---------------------------------------------------------------------------

suite('onHousingVisit with all mocks', function() {
  installAllMocks();
  Wiring.resetStats();

  var result = Wiring.onHousingVisit(DUMMY_STATE, DUMMY_PLAYER, 'owner_alice', 'house_001');

  assert(result.xpAwarded === 2, 'awards 2 social XP');
  assert(result.ownerId === 'owner_alice', 'ownerId correct');
  assert(result.houseId === 'house_001', 'houseId correct');
  assert(global.HousingSocial._calls.length >= 1, 'HousingSocial.recordVisit called');
  assert(global.HousingSocial._calls[0].ownerId === 'owner_alice', 'recordVisit ownerId correct');
  assert(global.HousingSocial._calls[0].houseId === 'house_001', 'recordVisit houseId correct');
  assert(global.Progression._calls[0].skill === 'social', 'awardXP social');

  removeAllMocks();
});

// ---------------------------------------------------------------------------
// SUITE 34: onHousingVisit — no modules
// ---------------------------------------------------------------------------

suite('onHousingVisit with no mocks', function() {
  removeAllMocks();

  var threw = false;
  var result;
  try {
    result = Wiring.onHousingVisit(DUMMY_STATE, DUMMY_PLAYER, 'owner_bob', 'house_002');
  } catch (e) {
    threw = true;
  }

  assert(!threw, 'onHousingVisit does not throw');
  assert(result.xpAwarded === 0, 'xpAwarded 0');
});

// ---------------------------------------------------------------------------
// SUITE 35: onMentorSession — with all mocks
// ---------------------------------------------------------------------------

suite('onMentorSession with all mocks', function() {
  installAllMocks();
  Wiring.resetStats();

  var result = Wiring.onMentorSession(DUMMY_STATE, DUMMY_PLAYER, 'teacher_guild', 'smithing');

  assert(result.xpAwarded === 10, 'awards 10 learning XP');
  assert(result.teacherId === 'teacher_guild', 'teacherId correct');
  assert(result.subject === 'smithing', 'subject correct');
  assert(global.Apprenticeship._calls.length >= 1, 'Apprenticeship.advanceLesson called');
  assert(global.Apprenticeship._calls[0].teacherId === 'teacher_guild', 'advanceLesson teacherId');
  assert(global.Apprenticeship._calls[0].subject === 'smithing', 'advanceLesson subject');
  assert(global.MentorshipMarket._calls.length >= 1, 'MentorshipMarket.completeSession called');
  assert(global.MentorshipMarket._calls[0].teacherId === 'teacher_guild', 'completeSession teacherId');
  assert(global.MentorshipMarket._calls[0].subject === 'smithing', 'completeSession subject');
  assert(global.Progression._calls[0].skill === 'learning', 'awardXP learning skill');

  removeAllMocks();
});

// ---------------------------------------------------------------------------
// SUITE 36: onMentorSession — no modules
// ---------------------------------------------------------------------------

suite('onMentorSession with no mocks', function() {
  removeAllMocks();

  var threw = false;
  var result;
  try {
    result = Wiring.onMentorSession(DUMMY_STATE, DUMMY_PLAYER, 'teacher_x', 'fishing');
  } catch (e) {
    threw = true;
  }

  assert(!threw, 'onMentorSession does not throw');
  assert(result.xpAwarded === 0, 'xpAwarded 0');
});

// ---------------------------------------------------------------------------
// SUITE 37: dispatch() generic dispatcher
// ---------------------------------------------------------------------------

suite('dispatch generic dispatcher', function() {
  installAllMocks();
  Wiring.resetStats();

  var result = Wiring.dispatch('onZoneChange', DUMMY_STATE, DUMMY_PLAYER, 'nexus', 'studio');
  assert(typeof result === 'object', 'dispatch returns object');
  assert(result.xpAwarded === 5, 'dispatch onZoneChange returns correct XP');
  assert(result.toZone === 'studio', 'dispatch passes args correctly');

  var result2 = Wiring.dispatch('onHarvest', DUMMY_STATE, DUMMY_PLAYER, 'herbs', 'gardens', 2);
  assert(result2.xpAwarded === 8, 'dispatch onHarvest returns correct XP');

  var result3 = Wiring.dispatch('onCraft', DUMMY_STATE, DUMMY_PLAYER, 'bread', null);
  assert(result3.xpAwarded === 10, 'dispatch onCraft returns correct XP');

  removeAllMocks();
});

// ---------------------------------------------------------------------------
// SUITE 38: dispatch() with unknown event
// ---------------------------------------------------------------------------

suite('dispatch with unknown event', function() {
  var threw = false;
  var result;
  try {
    result = Wiring.dispatch('onSomeUnknownEvent', DUMMY_STATE, DUMMY_PLAYER);
  } catch (e) {
    threw = true;
  }

  assert(!threw, 'dispatch with unknown event does not throw');
  assert(result === null, 'dispatch returns null for unknown event');
});

// ---------------------------------------------------------------------------
// SUITE 39: getStats() tracks dispatch counts
// ---------------------------------------------------------------------------

suite('getStats tracks dispatch counts', function() {
  installAllMocks();
  Wiring.resetStats();

  Wiring.onZoneChange(DUMMY_STATE, DUMMY_PLAYER, 'nexus', 'gardens');
  Wiring.onZoneChange(DUMMY_STATE, DUMMY_PLAYER, 'gardens', 'wilds');
  Wiring.onHarvest(DUMMY_STATE, DUMMY_PLAYER, 'wood', 'wilds', 1);

  var stats = Wiring.getStats();
  assert(typeof stats === 'object', 'getStats returns object');
  assert(stats.onZoneChange === 2, 'onZoneChange counted 2 dispatches');
  assert(stats.onHarvest === 1, 'onHarvest counted 1 dispatch');

  removeAllMocks();
});

// ---------------------------------------------------------------------------
// SUITE 40: resetStats() zeroes counters
// ---------------------------------------------------------------------------

suite('resetStats zeroes counters', function() {
  installAllMocks();

  Wiring.onZoneChange(DUMMY_STATE, DUMMY_PLAYER, 'nexus', 'gardens');
  Wiring.onHarvest(DUMMY_STATE, DUMMY_PLAYER, 'wood', 'wilds', 1);
  Wiring.resetStats();

  var stats = Wiring.getStats();
  assert(Object.keys(stats).length === 0, 'stats is empty after reset');

  removeAllMocks();
});

// ---------------------------------------------------------------------------
// SUITE 41: stats accumulate across multiple dispatches
// ---------------------------------------------------------------------------

suite('stats accumulate correctly', function() {
  installAllMocks();
  Wiring.resetStats();

  for (var i = 0; i < 5; i++) {
    Wiring.onCraft(DUMMY_STATE, DUMMY_PLAYER, 'recipe_x', null);
    installAllMocks(); // reset mocks between calls
  }
  installAllMocks();

  var stats = Wiring.getStats();
  assert(stats.onCraft === 5, 'onCraft counted 5 dispatches');

  Wiring.onQuestComplete(DUMMY_STATE, DUMMY_PLAYER, 'q1', null);
  installAllMocks();
  Wiring.onQuestComplete(DUMMY_STATE, DUMMY_PLAYER, 'q2', null);

  stats = Wiring.getStats();
  assert(stats.onQuestComplete === 2, 'onQuestComplete counted 2 dispatches');
  assert(stats.onCraft === 5, 'onCraft still 5 after quest dispatches');

  removeAllMocks();
});

// ---------------------------------------------------------------------------
// SUITE 42: partial modules — only Progression available
// ---------------------------------------------------------------------------

suite('partial mocks — only Progression', function() {
  removeAllMocks();
  global.Progression = makeMockProgression();

  var threw = false;
  var result;
  try {
    result = Wiring.onHarvest(DUMMY_STATE, DUMMY_PLAYER, 'herbs', 'gardens', 2);
  } catch (e) {
    threw = true;
  }

  assert(!threw, 'onHarvest does not throw with partial mocks');
  assert(result.xpAwarded === 8, 'xpAwarded 8 with Progression only');
  assert(result.lootResults.length === 0, 'no loot without Loot module');
  assert(result.challengesUpdated === 0, 'no challenges without DailyChallenges');

  delete global.Progression;
});

// ---------------------------------------------------------------------------
// SUITE 43: partial mocks — only Loot available
// ---------------------------------------------------------------------------

suite('partial mocks — only Loot', function() {
  removeAllMocks();
  global.Loot = makeMockLoot();

  var threw = false;
  var result;
  try {
    result = Wiring.onFishCaught(DUMMY_STATE, DUMMY_PLAYER, 'trout', 'nexus', 1);
  } catch (e) {
    threw = true;
  }

  assert(!threw, 'onFishCaught does not throw with only Loot');
  assert(result.xpAwarded === 0, 'xpAwarded 0 without Progression');
  assert(result.lootResults.length >= 1, 'has loot when Loot available');

  delete global.Loot;
});

// ---------------------------------------------------------------------------
// SUITE 44: throwing module does not crash dispatch
// ---------------------------------------------------------------------------

suite('throwing module does not crash dispatch', function() {
  removeAllMocks();
  global.Progression = {
    awardXP: function() { throw new Error('Simulated module failure'); }
  };

  var threw = false;
  var result;
  try {
    result = Wiring.onZoneChange(DUMMY_STATE, DUMMY_PLAYER, 'nexus', 'gardens');
  } catch (e) {
    threw = true;
  }

  assert(!threw, 'dispatch does not propagate module errors');
  assert(typeof result === 'object', 'result is still returned despite error');
  assert(result.xpAwarded === 0, 'xpAwarded 0 when module throws');

  delete global.Progression;
});

// ---------------------------------------------------------------------------
// SUITE 45: _getModule returns null when module absent
// ---------------------------------------------------------------------------

suite('_getModule returns null when absent', function() {
  removeAllMocks();

  var mod = Wiring._getModule('SomeMissingModule');
  assert(mod === null, '_getModule returns null for missing module');
});

// ---------------------------------------------------------------------------
// SUITE 46: _getModule returns module when present
// ---------------------------------------------------------------------------

suite('_getModule returns module when present', function() {
  var fake = { test: true };
  global.FakeTestModule = fake;

  var mod = Wiring._getModule('FakeTestModule');
  assert(mod !== null, '_getModule returns module object');
  assert(mod.test === true, '_getModule returns the correct module');

  delete global.FakeTestModule;
});

// ---------------------------------------------------------------------------
// SUITE 47: _safeCall returns null when module missing
// ---------------------------------------------------------------------------

suite('_safeCall returns null when module missing', function() {
  removeAllMocks();

  var result = Wiring._safeCall('MissingMod', 'someFunc', []);
  assert(result === null, '_safeCall returns null for missing module');
});

// ---------------------------------------------------------------------------
// SUITE 48: _safeCall returns null when function missing on module
// ---------------------------------------------------------------------------

suite('_safeCall returns null when function missing on module', function() {
  global.PartialMod = { someOtherFn: function() { return 1; } };

  var result = Wiring._safeCall('PartialMod', 'nonExistentFn', []);
  assert(result === null, '_safeCall returns null for missing function');

  delete global.PartialMod;
});

// ---------------------------------------------------------------------------
// SUITE 49: result objects have correct shape per event
// ---------------------------------------------------------------------------

suite('result object shapes', function() {
  installAllMocks();
  Wiring.resetStats();

  var zc = Wiring.onZoneChange(DUMMY_STATE, DUMMY_PLAYER, 'a', 'b');
  assert('xpAwarded' in zc, 'onZoneChange result has xpAwarded');
  assert('lootResults' in zc, 'onZoneChange result has lootResults');
  assert('challengesUpdated' in zc, 'onZoneChange result has challengesUpdated');
  assert('fromZone' in zc, 'onZoneChange result has fromZone');
  assert('toZone' in zc, 'onZoneChange result has toZone');

  installAllMocks();
  var hv = Wiring.onHarvest(DUMMY_STATE, DUMMY_PLAYER, 'item', 'zone', 1);
  assert('itemId' in hv, 'onHarvest result has itemId');
  assert('zone' in hv, 'onHarvest result has zone');
  assert('quantity' in hv, 'onHarvest result has quantity');

  installAllMocks();
  var dc = Wiring.onDungeonClear(DUMMY_STATE, DUMMY_PLAYER, 'dng', 2, 0);
  assert('dungeonId' in dc, 'onDungeonClear result has dungeonId');
  assert('floor' in dc, 'onDungeonClear result has floor');
  assert('timeMs' in dc, 'onDungeonClear result has timeMs');

  installAllMocks();
  var tc = Wiring.onTimeCapsuleBuried(DUMMY_STATE, DUMMY_PLAYER, 'cap', 'nexus');
  assert('capsuleId' in tc, 'onTimeCapsuleBuried result has capsuleId');
  assert('zone' in tc, 'onTimeCapsuleBuried result has zone');

  installAllMocks();
  var ms = Wiring.onMentorSession(DUMMY_STATE, DUMMY_PLAYER, 'teacher', 'topic');
  assert('teacherId' in ms, 'onMentorSession result has teacherId');
  assert('subject' in ms, 'onMentorSession result has subject');

  removeAllMocks();
});

// ---------------------------------------------------------------------------
// SUITE 50: dispatch passes state correctly
// ---------------------------------------------------------------------------

suite('state passed correctly through dispatch', function() {
  var capturedState = null;
  global.Progression = {
    awardXP: function(state, playerId, skill, amount) {
      capturedState = state;
      return { xp: amount };
    }
  };

  var customState = { players: { alice: {} }, economy: { spark: 99 } };
  Wiring.onZoneChange(customState, 'alice', 'nexus', 'gardens');

  assert(capturedState === customState, 'state reference passed through to module calls');

  delete global.Progression;
});

// ---------------------------------------------------------------------------
// SUITE 51: init() returns Wiring ref
// ---------------------------------------------------------------------------

suite('init returns Wiring reference', function() {
  var result = Wiring.init();
  assert(result === Wiring, 'init() returns the Wiring exports object');
});

// ---------------------------------------------------------------------------
// SUITE 52: MODULE_NAMES completeness
// ---------------------------------------------------------------------------

suite('MODULE_NAMES completeness', function() {
  var names = Wiring.MODULE_NAMES;
  assert(names.indexOf('Progression') !== -1, 'MODULE_NAMES includes Progression');
  assert(names.indexOf('DailyChallenges') !== -1, 'MODULE_NAMES includes DailyChallenges');
  assert(names.indexOf('NpcMemory') !== -1, 'MODULE_NAMES includes NpcMemory');
  assert(names.indexOf('FastTravel') !== -1, 'MODULE_NAMES includes FastTravel');
  assert(names.indexOf('Loot') !== -1, 'MODULE_NAMES includes Loot');
  assert(names.indexOf('NpcReputation') !== -1, 'MODULE_NAMES includes NpcReputation');
  assert(names.indexOf('GuildProgression') !== -1, 'MODULE_NAMES includes GuildProgression');
  assert(names.indexOf('Prestige') !== -1, 'MODULE_NAMES includes Prestige');
  assert(names.indexOf('EventVoting') !== -1, 'MODULE_NAMES includes EventVoting');
  assert(names.indexOf('HousingSocial') !== -1, 'MODULE_NAMES includes HousingSocial');
  assert(names.indexOf('Apprenticeship') !== -1, 'MODULE_NAMES includes Apprenticeship');
  assert(names.indexOf('MentorshipMarket') !== -1, 'MODULE_NAMES includes MentorshipMarket');
});

// ---------------------------------------------------------------------------
// SUITE 53: getEventHandlers descriptions are strings
// ---------------------------------------------------------------------------

suite('getEventHandlers descriptions are strings', function() {
  Wiring.init();
  var allEvents = Wiring.getRegisteredEvents();
  allEvents.forEach(function(eventName) {
    var handlers = Wiring.getEventHandlers(eventName);
    handlers.forEach(function(desc) {
      assert(typeof desc === 'string', 'handler description for ' + eventName + ' is a string');
      assert(desc.length > 0, 'handler description for ' + eventName + ' is not empty');
    });
  });
});

// ---------------------------------------------------------------------------
// SUITE 54: No mutation of state between calls
// ---------------------------------------------------------------------------

suite('state not mutated across calls', function() {
  installAllMocks();
  var state = { players: {}, economy: {}, _marker: 'original' };

  Wiring.onZoneChange(state, DUMMY_PLAYER, 'nexus', 'gardens');
  installAllMocks();
  Wiring.onHarvest(state, DUMMY_PLAYER, 'wood', 'wilds', 1);
  installAllMocks();
  Wiring.onCraft(state, DUMMY_PLAYER, 'recipe_1', null);

  assert(state._marker === 'original', 'state._marker not modified by dispatch calls');
  assert(Object.keys(state).length === 3, 'no extra keys added to state');

  removeAllMocks();
});

// ---------------------------------------------------------------------------
// SUITE 55: Multiple players on same state
// ---------------------------------------------------------------------------

suite('multiple players dispatched independently', function() {
  installAllMocks();
  Wiring.resetStats();

  var r1 = Wiring.onZoneChange(DUMMY_STATE, 'player_alice', 'nexus', 'gardens');
  installAllMocks();
  var r2 = Wiring.onZoneChange(DUMMY_STATE, 'player_bob', 'nexus', 'arena');

  assert(r1.xpAwarded === 5, 'alice gets 5 XP');
  assert(r2.xpAwarded === 5, 'bob gets 5 XP');
  assert(r1.toZone === 'gardens', 'alice toZone gardens');
  assert(r2.toZone === 'arena', 'bob toZone arena');

  removeAllMocks();
});

// ---------------------------------------------------------------------------
// FINAL REPORT
// ---------------------------------------------------------------------------

console.log('\n--- test_wiring.js ---');
console.log(passed + ' passed, ' + failed + ' failed');
if (failed > 0) {
  process.exit(1);
}
