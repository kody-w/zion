/**
 * tests/test_wiring.js
 * Comprehensive tests for the Wiring cross-system dispatch hub.
 * 80+ tests covering all 16 dispatch functions, graceful degradation,
 * generic dispatcher, stats, introspection utilities, and edge cases.
 */

'use strict';

// Wiring.js resolves modules through window/global globals; stub window first
global.window = {};

const { test, suite, report, assert } = require('./test_runner');
const Wiring = require('../src/js/wiring');

// ============================================================================
// MOCK FACTORIES
// ============================================================================

function makeMockProgression() {
  var calls = [];
  return {
    _calls: calls,
    awardXP: function(state, source, amount) {
      calls.push({ fn: 'awardXP', state: state, skill: source, amount: amount });
      return { state: state, xp: amount, skill: source };
    },
    createPlayerProgression: function(playerId) {
      return { playerId: playerId, totalXP: 0, level: 1, skillPoints: 0, skills: {}, xpHistory: [], perks: [] };
    }
  };
}

function makeMockDailyChallenges() {
  var calls = [];
  return {
    _calls: calls,
    updateProgress: function(state, playerId, type, data) {
      calls.push({ fn: 'updateProgress', type: type, data: data });
      return { updated: true };
    }
  };
}

function makeMockNpcMemory() {
  var calls = [];
  return {
    _calls: calls,
    recordInteraction: function(state, playerId, npcId, type, data) {
      calls.push({ fn: 'recordInteraction', npcId: npcId, type: type, data: data });
      return { recorded: true };
    }
  };
}

function makeMockFastTravel() {
  var calls = [];
  return {
    _calls: calls,
    unlockLocation: function(state, playerId, zone) {
      calls.push({ fn: 'unlockLocation', zone: zone });
      return { unlocked: zone };
    }
  };
}

function makeMockLoot() {
  var calls = [];
  return {
    _calls: calls,
    rollLoot: function(state, tableKey, playerId) {
      calls.push({ fn: 'rollLoot', tableKey: tableKey });
      return [{ item: 'wood', qty: 1 }];
    }
  };
}

function makeMockNpcReputation() {
  var calls = [];
  return {
    _calls: calls,
    applyAction: function(state, playerId, npcId, action, amount) {
      calls.push({ fn: 'applyAction', npcId: npcId, action: action, amount: amount });
      return { applied: true };
    }
  };
}

function makeMockGuildProgression() {
  var calls = [];
  return {
    _calls: calls,
    trackMetric: function(state, playerId, metric, amount) {
      calls.push({ fn: 'trackMetric', metric: metric, amount: amount });
      return { tracked: true };
    }
  };
}

function makeMockPrestige() {
  var calls = [];
  return {
    _calls: calls,
    checkEligibility: function(state, playerId) {
      calls.push({ fn: 'checkEligibility' });
      return { eligible: false };
    }
  };
}

function makeMockEventVoting() {
  var calls = [];
  return {
    _calls: calls,
    castVote: function(state, playerId, eventId, optionId) {
      calls.push({ fn: 'castVote', eventId: eventId, optionId: optionId });
      return { cast: true };
    }
  };
}

function makeMockHousingSocial() {
  var calls = [];
  return {
    _calls: calls,
    recordVisit: function(state, playerId, ownerId, houseId) {
      calls.push({ fn: 'recordVisit', ownerId: ownerId, houseId: houseId });
      return { visited: true };
    }
  };
}

function makeMockApprenticeship() {
  var calls = [];
  return {
    _calls: calls,
    advanceLesson: function(state, playerId, teacherId, subject) {
      calls.push({ fn: 'advanceLesson', teacherId: teacherId, subject: subject });
      return { advanced: true };
    }
  };
}

function makeMockMentorshipMarket() {
  var calls = [];
  return {
    _calls: calls,
    completeSession: function(state, playerId, teacherId, subject) {
      calls.push({ fn: 'completeSession', teacherId: teacherId, subject: subject });
      return { completed: true };
    }
  };
}

function installAllMocks() {
  global.Progression      = makeMockProgression();
  global.DailyChallenges  = makeMockDailyChallenges();
  global.NpcMemory        = makeMockNpcMemory();
  global.FastTravel       = makeMockFastTravel();
  global.Loot             = makeMockLoot();
  global.NpcReputation    = makeMockNpcReputation();
  global.GuildProgression = makeMockGuildProgression();
  global.Prestige         = makeMockPrestige();
  global.EventVoting      = makeMockEventVoting();
  global.HousingSocial    = makeMockHousingSocial();
  global.Apprenticeship   = makeMockApprenticeship();
  global.MentorshipMarket = makeMockMentorshipMarket();
}

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

var STATE  = { players: {}, economy: {} };
var PLAYER = 'player_test';

// ============================================================================
// SUITE 1: Export verification
// ============================================================================

suite('Export verification', function() {
  test('Wiring is an object', function() {
    assert.ok(Wiring && typeof Wiring === 'object');
  });
  test('MODULE_NAMES is an array', function() {
    assert.ok(Array.isArray(Wiring.MODULE_NAMES));
  });
  test('init is a function', function() {
    assert.strictEqual(typeof Wiring.init, 'function');
  });
  test('dispatch is a function', function() {
    assert.strictEqual(typeof Wiring.dispatch, 'function');
  });
  test('getRegisteredEvents is a function', function() {
    assert.strictEqual(typeof Wiring.getRegisteredEvents, 'function');
  });
  test('getEventHandlers is a function', function() {
    assert.strictEqual(typeof Wiring.getEventHandlers, 'function');
  });
  test('getStats is a function', function() {
    assert.strictEqual(typeof Wiring.getStats, 'function');
  });
  test('resetStats is a function', function() {
    assert.strictEqual(typeof Wiring.resetStats, 'function');
  });
  test('_getModule is a function', function() {
    assert.strictEqual(typeof Wiring._getModule, 'function');
  });
  test('_safeCall is a function', function() {
    assert.strictEqual(typeof Wiring._safeCall, 'function');
  });
  // 16 dispatch function exports
  test('onZoneChange is a function', function() {
    assert.strictEqual(typeof Wiring.onZoneChange, 'function');
  });
  test('onHarvest is a function', function() {
    assert.strictEqual(typeof Wiring.onHarvest, 'function');
  });
  test('onCraft is a function', function() {
    assert.strictEqual(typeof Wiring.onCraft, 'function');
  });
  test('onFishCaught is a function', function() {
    assert.strictEqual(typeof Wiring.onFishCaught, 'function');
  });
  test('onDungeonClear is a function', function() {
    assert.strictEqual(typeof Wiring.onDungeonClear, 'function');
  });
  test('onNpcInteraction is a function', function() {
    assert.strictEqual(typeof Wiring.onNpcInteraction, 'function');
  });
  test('onQuestComplete is a function', function() {
    assert.strictEqual(typeof Wiring.onQuestComplete, 'function');
  });
  test('onCardGameWin is a function', function() {
    assert.strictEqual(typeof Wiring.onCardGameWin, 'function');
  });
  test('onConstellationFound is a function', function() {
    assert.strictEqual(typeof Wiring.onConstellationFound, 'function');
  });
  test('onTimeCapsuleBuried is a function', function() {
    assert.strictEqual(typeof Wiring.onTimeCapsuleBuried, 'function');
  });
  test('onTimeCapsuleFound is a function', function() {
    assert.strictEqual(typeof Wiring.onTimeCapsuleFound, 'function');
  });
  test('onTrade is a function', function() {
    assert.strictEqual(typeof Wiring.onTrade, 'function');
  });
  test('onBuild is a function', function() {
    assert.strictEqual(typeof Wiring.onBuild, 'function');
  });
  test('onVoteCast is a function', function() {
    assert.strictEqual(typeof Wiring.onVoteCast, 'function');
  });
  test('onHousingVisit is a function', function() {
    assert.strictEqual(typeof Wiring.onHousingVisit, 'function');
  });
  test('onMentorSession is a function', function() {
    assert.strictEqual(typeof Wiring.onMentorSession, 'function');
  });
});

// ============================================================================
// SUITE 2: MODULE_NAMES array
// ============================================================================

suite('MODULE_NAMES array', function() {
  test('has at least 12 entries', function() {
    assert.ok(Wiring.MODULE_NAMES.length >= 12);
  });
  test('contains Progression', function() {
    assert.ok(Wiring.MODULE_NAMES.indexOf('Progression') !== -1);
  });
  test('contains DailyChallenges', function() {
    assert.ok(Wiring.MODULE_NAMES.indexOf('DailyChallenges') !== -1);
  });
  test('contains NpcMemory', function() {
    assert.ok(Wiring.MODULE_NAMES.indexOf('NpcMemory') !== -1);
  });
  test('contains FastTravel', function() {
    assert.ok(Wiring.MODULE_NAMES.indexOf('FastTravel') !== -1);
  });
  test('contains Loot', function() {
    assert.ok(Wiring.MODULE_NAMES.indexOf('Loot') !== -1);
  });
  test('contains NpcReputation', function() {
    assert.ok(Wiring.MODULE_NAMES.indexOf('NpcReputation') !== -1);
  });
  test('contains GuildProgression', function() {
    assert.ok(Wiring.MODULE_NAMES.indexOf('GuildProgression') !== -1);
  });
  test('contains Prestige', function() {
    assert.ok(Wiring.MODULE_NAMES.indexOf('Prestige') !== -1);
  });
  test('contains EventVoting', function() {
    assert.ok(Wiring.MODULE_NAMES.indexOf('EventVoting') !== -1);
  });
  test('contains HousingSocial', function() {
    assert.ok(Wiring.MODULE_NAMES.indexOf('HousingSocial') !== -1);
  });
  test('contains Apprenticeship', function() {
    assert.ok(Wiring.MODULE_NAMES.indexOf('Apprenticeship') !== -1);
  });
  test('contains MentorshipMarket', function() {
    assert.ok(Wiring.MODULE_NAMES.indexOf('MentorshipMarket') !== -1);
  });
  test('all entries are non-empty strings', function() {
    Wiring.MODULE_NAMES.forEach(function(name) {
      assert.strictEqual(typeof name, 'string');
      assert.ok(name.length > 0);
    });
  });
});

// ============================================================================
// SUITE 3: init and getRegisteredEvents
// ============================================================================

suite('init and getRegisteredEvents', function() {
  test('init does not throw', function() {
    assert.doesNotThrow(function() { Wiring.init(); });
  });
  test('init returns the Wiring exports object', function() {
    var ret = Wiring.init();
    assert.strictEqual(ret, Wiring);
  });
  test('getRegisteredEvents returns an array', function() {
    assert.ok(Array.isArray(Wiring.getRegisteredEvents()));
  });
  test('getRegisteredEvents lists at least 16 events', function() {
    assert.ok(Wiring.getRegisteredEvents().length >= 16);
  });
  test('onZoneChange is registered', function() {
    assert.ok(Wiring.getRegisteredEvents().indexOf('onZoneChange') !== -1);
  });
  test('onHarvest is registered', function() {
    assert.ok(Wiring.getRegisteredEvents().indexOf('onHarvest') !== -1);
  });
  test('onCraft is registered', function() {
    assert.ok(Wiring.getRegisteredEvents().indexOf('onCraft') !== -1);
  });
  test('onFishCaught is registered', function() {
    assert.ok(Wiring.getRegisteredEvents().indexOf('onFishCaught') !== -1);
  });
  test('onDungeonClear is registered', function() {
    assert.ok(Wiring.getRegisteredEvents().indexOf('onDungeonClear') !== -1);
  });
  test('onNpcInteraction is registered', function() {
    assert.ok(Wiring.getRegisteredEvents().indexOf('onNpcInteraction') !== -1);
  });
  test('onQuestComplete is registered', function() {
    assert.ok(Wiring.getRegisteredEvents().indexOf('onQuestComplete') !== -1);
  });
  test('onCardGameWin is registered', function() {
    assert.ok(Wiring.getRegisteredEvents().indexOf('onCardGameWin') !== -1);
  });
  test('onConstellationFound is registered', function() {
    assert.ok(Wiring.getRegisteredEvents().indexOf('onConstellationFound') !== -1);
  });
  test('onTimeCapsuleBuried is registered', function() {
    assert.ok(Wiring.getRegisteredEvents().indexOf('onTimeCapsuleBuried') !== -1);
  });
  test('onTimeCapsuleFound is registered', function() {
    assert.ok(Wiring.getRegisteredEvents().indexOf('onTimeCapsuleFound') !== -1);
  });
  test('onTrade is registered', function() {
    assert.ok(Wiring.getRegisteredEvents().indexOf('onTrade') !== -1);
  });
  test('onBuild is registered', function() {
    assert.ok(Wiring.getRegisteredEvents().indexOf('onBuild') !== -1);
  });
  test('onVoteCast is registered', function() {
    assert.ok(Wiring.getRegisteredEvents().indexOf('onVoteCast') !== -1);
  });
  test('onHousingVisit is registered', function() {
    assert.ok(Wiring.getRegisteredEvents().indexOf('onHousingVisit') !== -1);
  });
  test('onMentorSession is registered', function() {
    assert.ok(Wiring.getRegisteredEvents().indexOf('onMentorSession') !== -1);
  });
});

// ============================================================================
// SUITE 4: getEventHandlers
// ============================================================================

suite('getEventHandlers', function() {
  test('returns array for known event', function() {
    Wiring.init();
    assert.ok(Array.isArray(Wiring.getEventHandlers('onZoneChange')));
  });
  test('returns non-empty array for known event', function() {
    assert.ok(Wiring.getEventHandlers('onHarvest').length >= 1);
  });
  test('all descriptions are non-empty strings', function() {
    var events = Wiring.getRegisteredEvents();
    events.forEach(function(evName) {
      var descs = Wiring.getEventHandlers(evName);
      descs.forEach(function(d) {
        assert.strictEqual(typeof d, 'string');
        assert.ok(d.length > 0);
      });
    });
  });
  test('returns empty array for unknown event', function() {
    var arr = Wiring.getEventHandlers('nonExistentEvent');
    assert.ok(Array.isArray(arr));
    assert.strictEqual(arr.length, 0);
  });
  test('onZoneChange description mentions XP', function() {
    var descs = Wiring.getEventHandlers('onZoneChange');
    assert.ok(descs[0].toLowerCase().indexOf('xp') !== -1);
  });
});

// ============================================================================
// SUITE 5: onZoneChange
// ============================================================================

suite('onZoneChange — with mocks', function() {
  test('returns an object', function() {
    installAllMocks();
    Wiring.resetStats();
    var r = Wiring.onZoneChange(STATE, PLAYER, 'nexus', 'gardens');
    assert.ok(r && typeof r === 'object');
    removeAllMocks();
  });
  test('xpAwarded is 5', function() {
    installAllMocks();
    var r = Wiring.onZoneChange(STATE, PLAYER, 'nexus', 'gardens');
    assert.strictEqual(r.xpAwarded, 5);
    removeAllMocks();
  });
  test('fromZone is preserved in result', function() {
    installAllMocks();
    var r = Wiring.onZoneChange(STATE, PLAYER, 'nexus', 'gardens');
    assert.strictEqual(r.fromZone, 'nexus');
    removeAllMocks();
  });
  test('toZone is preserved in result', function() {
    installAllMocks();
    var r = Wiring.onZoneChange(STATE, PLAYER, 'nexus', 'gardens');
    assert.strictEqual(r.toZone, 'gardens');
    removeAllMocks();
  });
  test('lootResults is an array', function() {
    installAllMocks();
    var r = Wiring.onZoneChange(STATE, PLAYER, 'nexus', 'gardens');
    assert.ok(Array.isArray(r.lootResults));
    removeAllMocks();
  });
  test('Progression.awardXP called with exploration skill', function() {
    installAllMocks();
    Wiring.onZoneChange(STATE, PLAYER, 'nexus', 'gardens');
    assert.strictEqual(global.Progression._calls[0].skill, 'exploration');
    removeAllMocks();
  });
  test('Progression.awardXP called with amount 5', function() {
    installAllMocks();
    Wiring.onZoneChange(STATE, PLAYER, 'nexus', 'gardens');
    assert.strictEqual(global.Progression._calls[0].amount, 5);
    removeAllMocks();
  });
  test('DailyChallenges.updateProgress called with zone_visit', function() {
    installAllMocks();
    Wiring.onZoneChange(STATE, PLAYER, 'nexus', 'gardens');
    assert.strictEqual(global.DailyChallenges._calls[0].type, 'zone_visit');
    removeAllMocks();
  });
  test('DailyChallenges data includes toZone', function() {
    installAllMocks();
    Wiring.onZoneChange(STATE, PLAYER, 'nexus', 'gardens');
    assert.strictEqual(global.DailyChallenges._calls[0].data.zone, 'gardens');
    removeAllMocks();
  });
  test('NpcMemory.recordInteraction called with zone_visit type', function() {
    installAllMocks();
    Wiring.onZoneChange(STATE, PLAYER, 'nexus', 'gardens');
    assert.strictEqual(global.NpcMemory._calls[0].type, 'zone_visit');
    removeAllMocks();
  });
  test('FastTravel.unlockLocation called with toZone', function() {
    installAllMocks();
    Wiring.onZoneChange(STATE, PLAYER, 'nexus', 'gardens');
    assert.strictEqual(global.FastTravel._calls[0].zone, 'gardens');
    removeAllMocks();
  });
});

suite('onZoneChange — no mocks', function() {
  test('does not throw when modules missing', function() {
    removeAllMocks();
    assert.doesNotThrow(function() {
      Wiring.onZoneChange(STATE, PLAYER, 'nexus', 'gardens');
    });
  });
  test('xpAwarded is 0 without Progression', function() {
    removeAllMocks();
    var r = Wiring.onZoneChange(STATE, PLAYER, 'nexus', 'gardens');
    assert.strictEqual(r.xpAwarded, 0);
  });
  test('challengesUpdated is 0 without DailyChallenges', function() {
    removeAllMocks();
    var r = Wiring.onZoneChange(STATE, PLAYER, 'nexus', 'gardens');
    assert.strictEqual(r.challengesUpdated, 0);
  });
  test('result still has correct zone fields', function() {
    removeAllMocks();
    var r = Wiring.onZoneChange(STATE, PLAYER, 'arena', 'wilds');
    assert.strictEqual(r.fromZone, 'arena');
    assert.strictEqual(r.toZone, 'wilds');
  });
});

// ============================================================================
// SUITE 6: onHarvest
// ============================================================================

suite('onHarvest — with mocks', function() {
  test('xpAwarded is 8', function() {
    installAllMocks();
    var r = Wiring.onHarvest(STATE, PLAYER, 'herbs', 'gardens', 3);
    assert.strictEqual(r.xpAwarded, 8);
    removeAllMocks();
  });
  test('itemId and zone and quantity preserved', function() {
    installAllMocks();
    var r = Wiring.onHarvest(STATE, PLAYER, 'herbs', 'gardens', 3);
    assert.strictEqual(r.itemId, 'herbs');
    assert.strictEqual(r.zone, 'gardens');
    assert.strictEqual(r.quantity, 3);
    removeAllMocks();
  });
  test('Progression called with gathering skill and amount 8', function() {
    installAllMocks();
    Wiring.onHarvest(STATE, PLAYER, 'herbs', 'gardens', 3);
    assert.strictEqual(global.Progression._calls[0].skill, 'gathering');
    assert.strictEqual(global.Progression._calls[0].amount, 8);
    removeAllMocks();
  });
  test('DailyChallenges called with harvest type and item data', function() {
    installAllMocks();
    Wiring.onHarvest(STATE, PLAYER, 'herbs', 'gardens', 3);
    assert.strictEqual(global.DailyChallenges._calls[0].type, 'harvest');
    assert.strictEqual(global.DailyChallenges._calls[0].data.item, 'herbs');
    assert.strictEqual(global.DailyChallenges._calls[0].data.qty, 3);
    removeAllMocks();
  });
  test('Loot rolled for harvest_<zone>', function() {
    installAllMocks();
    Wiring.onHarvest(STATE, PLAYER, 'herbs', 'gardens', 3);
    assert.strictEqual(global.Loot._calls[0].tableKey, 'harvest_gardens');
    removeAllMocks();
  });
  test('NpcReputation.applyAction called with harvest action', function() {
    installAllMocks();
    Wiring.onHarvest(STATE, PLAYER, 'herbs', 'gardens', 3);
    assert.strictEqual(global.NpcReputation._calls[0].action, 'harvest');
    removeAllMocks();
  });
  test('GuildProgression tracks harvests with quantity', function() {
    installAllMocks();
    Wiring.onHarvest(STATE, PLAYER, 'herbs', 'gardens', 3);
    assert.strictEqual(global.GuildProgression._calls[0].metric, 'harvests');
    assert.strictEqual(global.GuildProgression._calls[0].amount, 3);
    removeAllMocks();
  });
  test('lootResults has at least one entry', function() {
    installAllMocks();
    var r = Wiring.onHarvest(STATE, PLAYER, 'herbs', 'gardens', 3);
    assert.ok(r.lootResults.length >= 1);
    removeAllMocks();
  });
});

suite('onHarvest — no mocks', function() {
  test('does not throw', function() {
    removeAllMocks();
    assert.doesNotThrow(function() {
      Wiring.onHarvest(STATE, PLAYER, 'wood', 'wilds', 5);
    });
  });
  test('xpAwarded is 0 without Progression', function() {
    removeAllMocks();
    var r = Wiring.onHarvest(STATE, PLAYER, 'wood', 'wilds', 5);
    assert.strictEqual(r.xpAwarded, 0);
  });
  test('lootResults is empty without Loot', function() {
    removeAllMocks();
    var r = Wiring.onHarvest(STATE, PLAYER, 'wood', 'wilds', 5);
    assert.strictEqual(r.lootResults.length, 0);
  });
});

// ============================================================================
// SUITE 7: onCraft
// ============================================================================

suite('onCraft — with mocks', function() {
  test('xpAwarded is 10', function() {
    installAllMocks();
    var r = Wiring.onCraft(STATE, PLAYER, 'iron_sword', {});
    assert.strictEqual(r.xpAwarded, 10);
    removeAllMocks();
  });
  test('recipeId preserved in result', function() {
    installAllMocks();
    var r = Wiring.onCraft(STATE, PLAYER, 'iron_sword', {});
    assert.strictEqual(r.recipeId, 'iron_sword');
    removeAllMocks();
  });
  test('Progression called with crafting skill', function() {
    installAllMocks();
    Wiring.onCraft(STATE, PLAYER, 'iron_sword', {});
    assert.strictEqual(global.Progression._calls[0].skill, 'crafting');
    assert.strictEqual(global.Progression._calls[0].amount, 10);
    removeAllMocks();
  });
  test('DailyChallenges called with craft type and recipe', function() {
    installAllMocks();
    Wiring.onCraft(STATE, PLAYER, 'iron_sword', {});
    assert.strictEqual(global.DailyChallenges._calls[0].type, 'craft');
    assert.strictEqual(global.DailyChallenges._calls[0].data.recipe, 'iron_sword');
    removeAllMocks();
  });
  test('GuildProgression tracks crafts metric', function() {
    installAllMocks();
    Wiring.onCraft(STATE, PLAYER, 'iron_sword', {});
    assert.strictEqual(global.GuildProgression._calls[0].metric, 'crafts');
    removeAllMocks();
  });
  test('NpcReputation.applyAction called with craft action', function() {
    installAllMocks();
    Wiring.onCraft(STATE, PLAYER, 'iron_sword', {});
    assert.strictEqual(global.NpcReputation._calls[0].action, 'craft');
    removeAllMocks();
  });
});

suite('onCraft — no mocks', function() {
  test('does not throw', function() {
    removeAllMocks();
    assert.doesNotThrow(function() {
      Wiring.onCraft(STATE, PLAYER, 'potion', null);
    });
  });
  test('xpAwarded is 0 without Progression', function() {
    removeAllMocks();
    var r = Wiring.onCraft(STATE, PLAYER, 'potion', null);
    assert.strictEqual(r.xpAwarded, 0);
  });
});

// ============================================================================
// SUITE 8: onFishCaught — XP formula and mocks
// ============================================================================

suite('onFishCaught — XP formula', function() {
  test('rarity 0 yields 6 XP', function() {
    installAllMocks();
    var r = Wiring.onFishCaught(STATE, PLAYER, 'minnow', 'nexus', 0);
    assert.strictEqual(r.xpAwarded, 6);
    removeAllMocks();
  });
  test('rarity 1 yields 10 XP', function() {
    installAllMocks();
    var r = Wiring.onFishCaught(STATE, PLAYER, 'trout', 'nexus', 1);
    assert.strictEqual(r.xpAwarded, 10);
    removeAllMocks();
  });
  test('rarity 2 yields 14 XP', function() {
    installAllMocks();
    var r = Wiring.onFishCaught(STATE, PLAYER, 'bass', 'commons', 2);
    assert.strictEqual(r.xpAwarded, 14);
    removeAllMocks();
  });
  test('rarity 3 yields 18 XP', function() {
    installAllMocks();
    var r = Wiring.onFishCaught(STATE, PLAYER, 'dragon_fish', 'wilds', 3);
    assert.strictEqual(r.xpAwarded, 18);
    removeAllMocks();
  });
});

suite('onFishCaught — with mocks', function() {
  test('fishId and zone and rarity preserved', function() {
    installAllMocks();
    var r = Wiring.onFishCaught(STATE, PLAYER, 'bass', 'commons', 2);
    assert.strictEqual(r.fishId, 'bass');
    assert.strictEqual(r.zone, 'commons');
    assert.strictEqual(r.rarity, 2);
    removeAllMocks();
  });
  test('Progression called with fishing skill', function() {
    installAllMocks();
    Wiring.onFishCaught(STATE, PLAYER, 'bass', 'commons', 2);
    assert.strictEqual(global.Progression._calls[0].skill, 'fishing');
    removeAllMocks();
  });
  test('DailyChallenges called with fish type', function() {
    installAllMocks();
    Wiring.onFishCaught(STATE, PLAYER, 'bass', 'commons', 2);
    assert.strictEqual(global.DailyChallenges._calls[0].type, 'fish');
    assert.strictEqual(global.DailyChallenges._calls[0].data.rarity, 2);
    removeAllMocks();
  });
  test('Loot rolled for fishing_<rarity>', function() {
    installAllMocks();
    Wiring.onFishCaught(STATE, PLAYER, 'bass', 'commons', 2);
    assert.strictEqual(global.Loot._calls[0].tableKey, 'fishing_2');
    removeAllMocks();
  });
  test('NpcReputation action is fish', function() {
    installAllMocks();
    Wiring.onFishCaught(STATE, PLAYER, 'bass', 'commons', 2);
    assert.strictEqual(global.NpcReputation._calls[0].action, 'fish');
    removeAllMocks();
  });
});

suite('onFishCaught — no mocks', function() {
  test('does not throw', function() {
    removeAllMocks();
    assert.doesNotThrow(function() {
      Wiring.onFishCaught(STATE, PLAYER, 'carp', 'wilds', 1);
    });
  });
  test('xpAwarded is 0 without Progression', function() {
    removeAllMocks();
    var r = Wiring.onFishCaught(STATE, PLAYER, 'carp', 'wilds', 1);
    assert.strictEqual(r.xpAwarded, 0);
  });
  test('lootResults is empty without Loot', function() {
    removeAllMocks();
    var r = Wiring.onFishCaught(STATE, PLAYER, 'carp', 'wilds', 1);
    assert.strictEqual(r.lootResults.length, 0);
  });
});

// ============================================================================
// SUITE 9: onDungeonClear
// ============================================================================

suite('onDungeonClear — XP formula', function() {
  test('floor 0 yields 15 XP', function() {
    installAllMocks();
    var r = Wiring.onDungeonClear(STATE, PLAYER, 'd1', 0, 0);
    assert.strictEqual(r.xpAwarded, 15);
    removeAllMocks();
  });
  test('floor 1 yields 20 XP', function() {
    installAllMocks();
    var r = Wiring.onDungeonClear(STATE, PLAYER, 'd1', 1, 0);
    assert.strictEqual(r.xpAwarded, 20);
    removeAllMocks();
  });
  test('floor 3 yields 30 XP', function() {
    installAllMocks();
    var r = Wiring.onDungeonClear(STATE, PLAYER, 'crypt', 3, 120000);
    assert.strictEqual(r.xpAwarded, 30);
    removeAllMocks();
  });
  test('floor 5 yields 40 XP', function() {
    installAllMocks();
    var r = Wiring.onDungeonClear(STATE, PLAYER, 'd1', 5, 0);
    assert.strictEqual(r.xpAwarded, 40);
    removeAllMocks();
  });
});

suite('onDungeonClear — with mocks', function() {
  test('dungeonId and floor and timeMs preserved', function() {
    installAllMocks();
    var r = Wiring.onDungeonClear(STATE, PLAYER, 'crypt', 3, 120000);
    assert.strictEqual(r.dungeonId, 'crypt');
    assert.strictEqual(r.floor, 3);
    assert.strictEqual(r.timeMs, 120000);
    removeAllMocks();
  });
  test('Progression called with combat skill', function() {
    installAllMocks();
    Wiring.onDungeonClear(STATE, PLAYER, 'crypt', 3, 120000);
    assert.strictEqual(global.Progression._calls[0].skill, 'combat');
    removeAllMocks();
  });
  test('DailyChallenges called with dungeon type', function() {
    installAllMocks();
    Wiring.onDungeonClear(STATE, PLAYER, 'crypt', 3, 120000);
    assert.strictEqual(global.DailyChallenges._calls[0].type, 'dungeon');
    removeAllMocks();
  });
  test('Loot rolled for dungeon_<dungeonId>', function() {
    installAllMocks();
    Wiring.onDungeonClear(STATE, PLAYER, 'crypt', 3, 120000);
    assert.strictEqual(global.Loot._calls[0].tableKey, 'dungeon_crypt');
    removeAllMocks();
  });
  test('GuildProgression tracks dungeon_clears', function() {
    installAllMocks();
    Wiring.onDungeonClear(STATE, PLAYER, 'crypt', 3, 120000);
    assert.strictEqual(global.GuildProgression._calls[0].metric, 'dungeon_clears');
    removeAllMocks();
  });
  test('Prestige.checkEligibility called', function() {
    installAllMocks();
    Wiring.onDungeonClear(STATE, PLAYER, 'crypt', 3, 120000);
    assert.ok(global.Prestige._calls.length >= 1);
    removeAllMocks();
  });
});

suite('onDungeonClear — no mocks', function() {
  test('does not throw', function() {
    removeAllMocks();
    assert.doesNotThrow(function() {
      Wiring.onDungeonClear(STATE, PLAYER, 'ruins', 2, 60000);
    });
  });
  test('xpAwarded is 0 without Progression', function() {
    removeAllMocks();
    var r = Wiring.onDungeonClear(STATE, PLAYER, 'ruins', 2, 60000);
    assert.strictEqual(r.xpAwarded, 0);
  });
});

// ============================================================================
// SUITE 10: onNpcInteraction
// ============================================================================

suite('onNpcInteraction — with mocks', function() {
  test('xpAwarded is 3', function() {
    installAllMocks();
    var r = Wiring.onNpcInteraction(STATE, PLAYER, 'npc_elder', 'greet', {});
    assert.strictEqual(r.xpAwarded, 3);
    removeAllMocks();
  });
  test('npcId and interactionType preserved', function() {
    installAllMocks();
    var r = Wiring.onNpcInteraction(STATE, PLAYER, 'npc_elder', 'greet', {});
    assert.strictEqual(r.npcId, 'npc_elder');
    assert.strictEqual(r.interactionType, 'greet');
    removeAllMocks();
  });
  test('NpcMemory.recordInteraction called with correct npcId and type', function() {
    installAllMocks();
    Wiring.onNpcInteraction(STATE, PLAYER, 'npc_elder', 'greet', {});
    assert.strictEqual(global.NpcMemory._calls[0].npcId, 'npc_elder');
    assert.strictEqual(global.NpcMemory._calls[0].type, 'greet');
    removeAllMocks();
  });
  test('NpcReputation.applyAction called with correct npcId and action', function() {
    installAllMocks();
    Wiring.onNpcInteraction(STATE, PLAYER, 'npc_elder', 'greet', {});
    assert.strictEqual(global.NpcReputation._calls[0].npcId, 'npc_elder');
    assert.strictEqual(global.NpcReputation._calls[0].action, 'greet');
    removeAllMocks();
  });
  test('Progression called with social skill', function() {
    installAllMocks();
    Wiring.onNpcInteraction(STATE, PLAYER, 'npc_elder', 'greet', {});
    assert.strictEqual(global.Progression._calls[0].skill, 'social');
    removeAllMocks();
  });
  test('DailyChallenges called with npc_talk type', function() {
    installAllMocks();
    Wiring.onNpcInteraction(STATE, PLAYER, 'npc_elder', 'greet', {});
    assert.strictEqual(global.DailyChallenges._calls[0].type, 'npc_talk');
    assert.strictEqual(global.DailyChallenges._calls[0].data.npc, 'npc_elder');
    removeAllMocks();
  });
});

suite('onNpcInteraction — no mocks', function() {
  test('does not throw', function() {
    removeAllMocks();
    assert.doesNotThrow(function() {
      Wiring.onNpcInteraction(STATE, PLAYER, 'npc_guard', 'trade', {});
    });
  });
  test('xpAwarded is 0 without Progression', function() {
    removeAllMocks();
    var r = Wiring.onNpcInteraction(STATE, PLAYER, 'npc_guard', 'trade', {});
    assert.strictEqual(r.xpAwarded, 0);
  });
});

// ============================================================================
// SUITE 11: onQuestComplete
// ============================================================================

suite('onQuestComplete — with mocks', function() {
  test('xpAwarded is 20', function() {
    installAllMocks();
    var r = Wiring.onQuestComplete(STATE, PLAYER, 'quest_rescue', {});
    assert.strictEqual(r.xpAwarded, 20);
    removeAllMocks();
  });
  test('questId preserved', function() {
    installAllMocks();
    var r = Wiring.onQuestComplete(STATE, PLAYER, 'quest_rescue', {});
    assert.strictEqual(r.questId, 'quest_rescue');
    removeAllMocks();
  });
  test('Progression called with questing skill', function() {
    installAllMocks();
    Wiring.onQuestComplete(STATE, PLAYER, 'quest_rescue', {});
    assert.strictEqual(global.Progression._calls[0].skill, 'questing');
    removeAllMocks();
  });
  test('DailyChallenges called with quest type', function() {
    installAllMocks();
    Wiring.onQuestComplete(STATE, PLAYER, 'quest_rescue', {});
    assert.strictEqual(global.DailyChallenges._calls[0].type, 'quest');
    removeAllMocks();
  });
  test('Prestige.checkEligibility called', function() {
    installAllMocks();
    Wiring.onQuestComplete(STATE, PLAYER, 'quest_rescue', {});
    assert.ok(global.Prestige._calls.length >= 1);
    removeAllMocks();
  });
  test('GuildProgression tracks quests metric', function() {
    installAllMocks();
    Wiring.onQuestComplete(STATE, PLAYER, 'quest_rescue', {});
    assert.strictEqual(global.GuildProgression._calls[0].metric, 'quests');
    removeAllMocks();
  });
});

suite('onQuestComplete — no mocks', function() {
  test('does not throw with null rewards', function() {
    removeAllMocks();
    assert.doesNotThrow(function() {
      Wiring.onQuestComplete(STATE, PLAYER, 'quest_explore', null);
    });
  });
  test('xpAwarded is 0 without Progression', function() {
    removeAllMocks();
    var r = Wiring.onQuestComplete(STATE, PLAYER, 'quest_explore', null);
    assert.strictEqual(r.xpAwarded, 0);
  });
});

// ============================================================================
// SUITE 12: onCardGameWin
// ============================================================================

suite('onCardGameWin — with mocks', function() {
  test('xpAwarded is 8', function() {
    installAllMocks();
    var r = Wiring.onCardGameWin(STATE, PLAYER, 'opp1', 'aggro');
    assert.strictEqual(r.xpAwarded, 8);
    removeAllMocks();
  });
  test('opponentId and deckType preserved', function() {
    installAllMocks();
    var r = Wiring.onCardGameWin(STATE, PLAYER, 'opp1', 'aggro');
    assert.strictEqual(r.opponentId, 'opp1');
    assert.strictEqual(r.deckType, 'aggro');
    removeAllMocks();
  });
  test('Progression called with social skill', function() {
    installAllMocks();
    Wiring.onCardGameWin(STATE, PLAYER, 'opp1', 'aggro');
    assert.strictEqual(global.Progression._calls[0].skill, 'social');
    removeAllMocks();
  });
  test('DailyChallenges called with card_game type', function() {
    installAllMocks();
    Wiring.onCardGameWin(STATE, PLAYER, 'opp1', 'aggro');
    assert.strictEqual(global.DailyChallenges._calls[0].type, 'card_game');
    assert.strictEqual(global.DailyChallenges._calls[0].data.opponent, 'opp1');
    removeAllMocks();
  });
  test('Loot rolled for card_game_win table', function() {
    installAllMocks();
    Wiring.onCardGameWin(STATE, PLAYER, 'opp1', 'aggro');
    assert.strictEqual(global.Loot._calls[0].tableKey, 'card_game_win');
    removeAllMocks();
  });
  test('lootResults has entries', function() {
    installAllMocks();
    var r = Wiring.onCardGameWin(STATE, PLAYER, 'opp1', 'aggro');
    assert.ok(r.lootResults.length >= 1);
    removeAllMocks();
  });
});

suite('onCardGameWin — no mocks', function() {
  test('does not throw', function() {
    removeAllMocks();
    assert.doesNotThrow(function() {
      Wiring.onCardGameWin(STATE, PLAYER, 'opp', 'control');
    });
  });
  test('xpAwarded is 0 without Progression', function() {
    removeAllMocks();
    var r = Wiring.onCardGameWin(STATE, PLAYER, 'opp', 'control');
    assert.strictEqual(r.xpAwarded, 0);
  });
});

// ============================================================================
// SUITE 13: onConstellationFound
// ============================================================================

suite('onConstellationFound — with mocks', function() {
  test('xpAwarded is 12', function() {
    installAllMocks();
    var r = Wiring.onConstellationFound(STATE, PLAYER, 'orion');
    assert.strictEqual(r.xpAwarded, 12);
    removeAllMocks();
  });
  test('constellationId preserved', function() {
    installAllMocks();
    var r = Wiring.onConstellationFound(STATE, PLAYER, 'orion');
    assert.strictEqual(r.constellationId, 'orion');
    removeAllMocks();
  });
  test('Progression called with exploration skill', function() {
    installAllMocks();
    Wiring.onConstellationFound(STATE, PLAYER, 'orion');
    assert.strictEqual(global.Progression._calls[0].skill, 'exploration');
    removeAllMocks();
  });
  test('DailyChallenges called with stargazing type and constellation', function() {
    installAllMocks();
    Wiring.onConstellationFound(STATE, PLAYER, 'orion');
    assert.strictEqual(global.DailyChallenges._calls[0].type, 'stargazing');
    assert.strictEqual(global.DailyChallenges._calls[0].data.constellation, 'orion');
    removeAllMocks();
  });
});

suite('onConstellationFound — no mocks', function() {
  test('does not throw', function() {
    removeAllMocks();
    assert.doesNotThrow(function() {
      Wiring.onConstellationFound(STATE, PLAYER, 'cassiopeia');
    });
  });
  test('xpAwarded is 0 without Progression', function() {
    removeAllMocks();
    var r = Wiring.onConstellationFound(STATE, PLAYER, 'cassiopeia');
    assert.strictEqual(r.xpAwarded, 0);
  });
});

// ============================================================================
// SUITE 14: onTimeCapsuleBuried
// ============================================================================

suite('onTimeCapsuleBuried — with mocks', function() {
  test('xpAwarded is 7', function() {
    installAllMocks();
    var r = Wiring.onTimeCapsuleBuried(STATE, PLAYER, 'cap_001', 'wilds');
    assert.strictEqual(r.xpAwarded, 7);
    removeAllMocks();
  });
  test('capsuleId and zone preserved', function() {
    installAllMocks();
    var r = Wiring.onTimeCapsuleBuried(STATE, PLAYER, 'cap_001', 'wilds');
    assert.strictEqual(r.capsuleId, 'cap_001');
    assert.strictEqual(r.zone, 'wilds');
    removeAllMocks();
  });
  test('Progression called with exploration skill', function() {
    installAllMocks();
    Wiring.onTimeCapsuleBuried(STATE, PLAYER, 'cap_001', 'wilds');
    assert.strictEqual(global.Progression._calls[0].skill, 'exploration');
    removeAllMocks();
  });
  test('NpcMemory.recordInteraction called with time_capsule type', function() {
    installAllMocks();
    Wiring.onTimeCapsuleBuried(STATE, PLAYER, 'cap_001', 'wilds');
    assert.strictEqual(global.NpcMemory._calls[0].type, 'time_capsule');
    removeAllMocks();
  });
  test('NpcMemory data contains capsule id and zone', function() {
    installAllMocks();
    Wiring.onTimeCapsuleBuried(STATE, PLAYER, 'cap_001', 'wilds');
    assert.strictEqual(global.NpcMemory._calls[0].data.capsule, 'cap_001');
    assert.strictEqual(global.NpcMemory._calls[0].data.zone, 'wilds');
    removeAllMocks();
  });
});

suite('onTimeCapsuleBuried — no mocks', function() {
  test('does not throw', function() {
    removeAllMocks();
    assert.doesNotThrow(function() {
      Wiring.onTimeCapsuleBuried(STATE, PLAYER, 'cap_x', 'arena');
    });
  });
  test('xpAwarded is 0 without Progression', function() {
    removeAllMocks();
    var r = Wiring.onTimeCapsuleBuried(STATE, PLAYER, 'cap_x', 'arena');
    assert.strictEqual(r.xpAwarded, 0);
  });
});

// ============================================================================
// SUITE 15: onTimeCapsuleFound
// ============================================================================

suite('onTimeCapsuleFound — with mocks', function() {
  test('xpAwarded is 15', function() {
    installAllMocks();
    var r = Wiring.onTimeCapsuleFound(STATE, PLAYER, 'cap_002');
    assert.strictEqual(r.xpAwarded, 15);
    removeAllMocks();
  });
  test('capsuleId preserved', function() {
    installAllMocks();
    var r = Wiring.onTimeCapsuleFound(STATE, PLAYER, 'cap_002');
    assert.strictEqual(r.capsuleId, 'cap_002');
    removeAllMocks();
  });
  test('Progression called with exploration skill', function() {
    installAllMocks();
    Wiring.onTimeCapsuleFound(STATE, PLAYER, 'cap_002');
    assert.strictEqual(global.Progression._calls[0].skill, 'exploration');
    removeAllMocks();
  });
  test('Loot rolled for time_capsule table', function() {
    installAllMocks();
    Wiring.onTimeCapsuleFound(STATE, PLAYER, 'cap_002');
    assert.strictEqual(global.Loot._calls[0].tableKey, 'time_capsule');
    removeAllMocks();
  });
  test('lootResults has entries', function() {
    installAllMocks();
    var r = Wiring.onTimeCapsuleFound(STATE, PLAYER, 'cap_002');
    assert.ok(r.lootResults.length >= 1);
    removeAllMocks();
  });
});

suite('onTimeCapsuleFound — no mocks', function() {
  test('does not throw', function() {
    removeAllMocks();
    assert.doesNotThrow(function() {
      Wiring.onTimeCapsuleFound(STATE, PLAYER, 'cap_y');
    });
  });
  test('xpAwarded is 0 without Progression', function() {
    removeAllMocks();
    var r = Wiring.onTimeCapsuleFound(STATE, PLAYER, 'cap_y');
    assert.strictEqual(r.xpAwarded, 0);
  });
  test('lootResults is empty without Loot', function() {
    removeAllMocks();
    var r = Wiring.onTimeCapsuleFound(STATE, PLAYER, 'cap_y');
    assert.strictEqual(r.lootResults.length, 0);
  });
});

// ============================================================================
// SUITE 16: onTrade
// ============================================================================

suite('onTrade — with mocks', function() {
  test('xpAwarded is 5', function() {
    installAllMocks();
    var r = Wiring.onTrade(STATE, PLAYER, 'player_b', ['wood'], 100);
    assert.strictEqual(r.xpAwarded, 5);
    removeAllMocks();
  });
  test('otherPlayerId and spark preserved', function() {
    installAllMocks();
    var r = Wiring.onTrade(STATE, PLAYER, 'player_b', ['wood'], 100);
    assert.strictEqual(r.otherPlayerId, 'player_b');
    assert.strictEqual(r.spark, 100);
    removeAllMocks();
  });
  test('Progression called with trading skill', function() {
    installAllMocks();
    Wiring.onTrade(STATE, PLAYER, 'player_b', ['wood'], 100);
    assert.strictEqual(global.Progression._calls[0].skill, 'trading');
    removeAllMocks();
  });
  test('DailyChallenges called with trade type and partner', function() {
    installAllMocks();
    Wiring.onTrade(STATE, PLAYER, 'player_b', ['wood'], 100);
    assert.strictEqual(global.DailyChallenges._calls[0].type, 'trade');
    assert.strictEqual(global.DailyChallenges._calls[0].data.partner, 'player_b');
    removeAllMocks();
  });
  test('GuildProgression tracks trades metric', function() {
    installAllMocks();
    Wiring.onTrade(STATE, PLAYER, 'player_b', ['wood'], 100);
    assert.strictEqual(global.GuildProgression._calls[0].metric, 'trades');
    removeAllMocks();
  });
  test('NpcReputation action is trade', function() {
    installAllMocks();
    Wiring.onTrade(STATE, PLAYER, 'player_b', ['wood'], 100);
    assert.strictEqual(global.NpcReputation._calls[0].action, 'trade');
    removeAllMocks();
  });
});

suite('onTrade — no mocks', function() {
  test('does not throw', function() {
    removeAllMocks();
    assert.doesNotThrow(function() {
      Wiring.onTrade(STATE, PLAYER, 'player_c', [], 0);
    });
  });
  test('xpAwarded is 0 without Progression', function() {
    removeAllMocks();
    var r = Wiring.onTrade(STATE, PLAYER, 'player_c', [], 0);
    assert.strictEqual(r.xpAwarded, 0);
  });
});

// ============================================================================
// SUITE 17: onBuild
// ============================================================================

suite('onBuild — with mocks', function() {
  test('xpAwarded is 12', function() {
    installAllMocks();
    var r = Wiring.onBuild(STATE, PLAYER, 'watchtower', 'wilds');
    assert.strictEqual(r.xpAwarded, 12);
    removeAllMocks();
  });
  test('structureType and zone preserved', function() {
    installAllMocks();
    var r = Wiring.onBuild(STATE, PLAYER, 'watchtower', 'wilds');
    assert.strictEqual(r.structureType, 'watchtower');
    assert.strictEqual(r.zone, 'wilds');
    removeAllMocks();
  });
  test('Progression called with building skill', function() {
    installAllMocks();
    Wiring.onBuild(STATE, PLAYER, 'watchtower', 'wilds');
    assert.strictEqual(global.Progression._calls[0].skill, 'building');
    removeAllMocks();
  });
  test('DailyChallenges called with build type and structure', function() {
    installAllMocks();
    Wiring.onBuild(STATE, PLAYER, 'watchtower', 'wilds');
    assert.strictEqual(global.DailyChallenges._calls[0].type, 'build');
    assert.strictEqual(global.DailyChallenges._calls[0].data.structure, 'watchtower');
    removeAllMocks();
  });
  test('GuildProgression tracks builds metric', function() {
    installAllMocks();
    Wiring.onBuild(STATE, PLAYER, 'watchtower', 'wilds');
    assert.strictEqual(global.GuildProgression._calls[0].metric, 'builds');
    removeAllMocks();
  });
});

suite('onBuild — no mocks', function() {
  test('does not throw', function() {
    removeAllMocks();
    assert.doesNotThrow(function() {
      Wiring.onBuild(STATE, PLAYER, 'house', 'nexus');
    });
  });
  test('xpAwarded is 0 without Progression', function() {
    removeAllMocks();
    var r = Wiring.onBuild(STATE, PLAYER, 'house', 'nexus');
    assert.strictEqual(r.xpAwarded, 0);
  });
});

// ============================================================================
// SUITE 18: onVoteCast
// ============================================================================

suite('onVoteCast — with mocks', function() {
  test('xpAwarded is 3', function() {
    installAllMocks();
    var r = Wiring.onVoteCast(STATE, PLAYER, 'harvest_festival', 'feast');
    assert.strictEqual(r.xpAwarded, 3);
    removeAllMocks();
  });
  test('eventId and optionId preserved', function() {
    installAllMocks();
    var r = Wiring.onVoteCast(STATE, PLAYER, 'harvest_festival', 'feast');
    assert.strictEqual(r.eventId, 'harvest_festival');
    assert.strictEqual(r.optionId, 'feast');
    removeAllMocks();
  });
  test('EventVoting.castVote called with eventId and optionId', function() {
    installAllMocks();
    Wiring.onVoteCast(STATE, PLAYER, 'harvest_festival', 'feast');
    assert.strictEqual(global.EventVoting._calls[0].eventId, 'harvest_festival');
    assert.strictEqual(global.EventVoting._calls[0].optionId, 'feast');
    removeAllMocks();
  });
  test('Progression called with social skill', function() {
    installAllMocks();
    Wiring.onVoteCast(STATE, PLAYER, 'harvest_festival', 'feast');
    assert.strictEqual(global.Progression._calls[0].skill, 'social');
    removeAllMocks();
  });
  test('DailyChallenges called with vote type', function() {
    installAllMocks();
    Wiring.onVoteCast(STATE, PLAYER, 'harvest_festival', 'feast');
    assert.strictEqual(global.DailyChallenges._calls[0].type, 'vote');
    assert.strictEqual(global.DailyChallenges._calls[0].data.event, 'harvest_festival');
    removeAllMocks();
  });
});

suite('onVoteCast — no mocks', function() {
  test('does not throw', function() {
    removeAllMocks();
    assert.doesNotThrow(function() {
      Wiring.onVoteCast(STATE, PLAYER, 'storm_event', 'shelter');
    });
  });
  test('xpAwarded is 0 without Progression', function() {
    removeAllMocks();
    var r = Wiring.onVoteCast(STATE, PLAYER, 'storm_event', 'shelter');
    assert.strictEqual(r.xpAwarded, 0);
  });
});

// ============================================================================
// SUITE 19: onHousingVisit
// ============================================================================

suite('onHousingVisit — with mocks', function() {
  test('xpAwarded is 2', function() {
    installAllMocks();
    var r = Wiring.onHousingVisit(STATE, PLAYER, 'owner_alice', 'house_001');
    assert.strictEqual(r.xpAwarded, 2);
    removeAllMocks();
  });
  test('ownerId and houseId preserved', function() {
    installAllMocks();
    var r = Wiring.onHousingVisit(STATE, PLAYER, 'owner_alice', 'house_001');
    assert.strictEqual(r.ownerId, 'owner_alice');
    assert.strictEqual(r.houseId, 'house_001');
    removeAllMocks();
  });
  test('HousingSocial.recordVisit called with ownerId and houseId', function() {
    installAllMocks();
    Wiring.onHousingVisit(STATE, PLAYER, 'owner_alice', 'house_001');
    assert.strictEqual(global.HousingSocial._calls[0].ownerId, 'owner_alice');
    assert.strictEqual(global.HousingSocial._calls[0].houseId, 'house_001');
    removeAllMocks();
  });
  test('Progression called with social skill', function() {
    installAllMocks();
    Wiring.onHousingVisit(STATE, PLAYER, 'owner_alice', 'house_001');
    assert.strictEqual(global.Progression._calls[0].skill, 'social');
    removeAllMocks();
  });
});

suite('onHousingVisit — no mocks', function() {
  test('does not throw', function() {
    removeAllMocks();
    assert.doesNotThrow(function() {
      Wiring.onHousingVisit(STATE, PLAYER, 'owner_bob', 'house_002');
    });
  });
  test('xpAwarded is 0 without Progression', function() {
    removeAllMocks();
    var r = Wiring.onHousingVisit(STATE, PLAYER, 'owner_bob', 'house_002');
    assert.strictEqual(r.xpAwarded, 0);
  });
});

// ============================================================================
// SUITE 20: onMentorSession
// ============================================================================

suite('onMentorSession — with mocks', function() {
  test('xpAwarded is 10', function() {
    installAllMocks();
    var r = Wiring.onMentorSession(STATE, PLAYER, 'teacher_guild', 'smithing');
    assert.strictEqual(r.xpAwarded, 10);
    removeAllMocks();
  });
  test('teacherId and subject preserved', function() {
    installAllMocks();
    var r = Wiring.onMentorSession(STATE, PLAYER, 'teacher_guild', 'smithing');
    assert.strictEqual(r.teacherId, 'teacher_guild');
    assert.strictEqual(r.subject, 'smithing');
    removeAllMocks();
  });
  test('Apprenticeship.advanceLesson called with teacherId and subject', function() {
    installAllMocks();
    Wiring.onMentorSession(STATE, PLAYER, 'teacher_guild', 'smithing');
    assert.strictEqual(global.Apprenticeship._calls[0].teacherId, 'teacher_guild');
    assert.strictEqual(global.Apprenticeship._calls[0].subject, 'smithing');
    removeAllMocks();
  });
  test('MentorshipMarket.completeSession called with teacherId and subject', function() {
    installAllMocks();
    Wiring.onMentorSession(STATE, PLAYER, 'teacher_guild', 'smithing');
    assert.strictEqual(global.MentorshipMarket._calls[0].teacherId, 'teacher_guild');
    assert.strictEqual(global.MentorshipMarket._calls[0].subject, 'smithing');
    removeAllMocks();
  });
  test('Progression called with learning skill', function() {
    installAllMocks();
    Wiring.onMentorSession(STATE, PLAYER, 'teacher_guild', 'smithing');
    assert.strictEqual(global.Progression._calls[0].skill, 'learning');
    removeAllMocks();
  });
});

suite('onMentorSession — no mocks', function() {
  test('does not throw', function() {
    removeAllMocks();
    assert.doesNotThrow(function() {
      Wiring.onMentorSession(STATE, PLAYER, 'teacher_x', 'fishing');
    });
  });
  test('xpAwarded is 0 without Progression', function() {
    removeAllMocks();
    var r = Wiring.onMentorSession(STATE, PLAYER, 'teacher_x', 'fishing');
    assert.strictEqual(r.xpAwarded, 0);
  });
});

// ============================================================================
// SUITE 21: dispatch generic dispatcher
// ============================================================================

suite('dispatch — known events', function() {
  test('dispatch onZoneChange returns correct XP', function() {
    installAllMocks();
    var r = Wiring.dispatch('onZoneChange', STATE, PLAYER, 'nexus', 'studio');
    assert.strictEqual(r.xpAwarded, 5);
    removeAllMocks();
  });
  test('dispatch passes toZone correctly', function() {
    installAllMocks();
    var r = Wiring.dispatch('onZoneChange', STATE, PLAYER, 'nexus', 'studio');
    assert.strictEqual(r.toZone, 'studio');
    removeAllMocks();
  });
  test('dispatch onHarvest returns correct XP', function() {
    installAllMocks();
    var r = Wiring.dispatch('onHarvest', STATE, PLAYER, 'herbs', 'gardens', 2);
    assert.strictEqual(r.xpAwarded, 8);
    removeAllMocks();
  });
  test('dispatch onCraft returns correct XP', function() {
    installAllMocks();
    var r = Wiring.dispatch('onCraft', STATE, PLAYER, 'bread', null);
    assert.strictEqual(r.xpAwarded, 10);
    removeAllMocks();
  });
  test('dispatch onQuestComplete returns correct XP', function() {
    installAllMocks();
    var r = Wiring.dispatch('onQuestComplete', STATE, PLAYER, 'q1', null);
    assert.strictEqual(r.xpAwarded, 20);
    removeAllMocks();
  });
  test('dispatch returns object for valid event', function() {
    installAllMocks();
    var r = Wiring.dispatch('onBuild', STATE, PLAYER, 'tower', 'wilds');
    assert.ok(r && typeof r === 'object');
    removeAllMocks();
  });
});

suite('dispatch — unknown event', function() {
  test('does not throw for unknown event', function() {
    assert.doesNotThrow(function() {
      Wiring.dispatch('onSomeUnknownEvent', STATE, PLAYER);
    });
  });
  test('returns null for unknown event', function() {
    var r = Wiring.dispatch('onSomeUnknownEvent', STATE, PLAYER);
    assert.strictEqual(r, null);
  });
  test('returns null for empty string event name', function() {
    var r = Wiring.dispatch('', STATE, PLAYER);
    assert.strictEqual(r, null);
  });
});

// ============================================================================
// SUITE 22: getStats and resetStats
// ============================================================================

suite('getStats', function() {
  test('getStats returns an object', function() {
    var s = Wiring.getStats();
    assert.ok(s && typeof s === 'object');
  });
  test('getStats tracks onZoneChange count', function() {
    installAllMocks();
    Wiring.resetStats();
    Wiring.onZoneChange(STATE, PLAYER, 'nexus', 'gardens');
    Wiring.onZoneChange(STATE, PLAYER, 'gardens', 'wilds');
    var s = Wiring.getStats();
    assert.strictEqual(s.onZoneChange, 2);
    removeAllMocks();
  });
  test('getStats tracks onHarvest count', function() {
    installAllMocks();
    Wiring.resetStats();
    Wiring.onHarvest(STATE, PLAYER, 'wood', 'wilds', 1);
    var s = Wiring.getStats();
    assert.strictEqual(s.onHarvest, 1);
    removeAllMocks();
  });
  test('getStats accumulates across multiple event types', function() {
    installAllMocks();
    Wiring.resetStats();
    Wiring.onZoneChange(STATE, PLAYER, 'a', 'b');
    installAllMocks();
    Wiring.onCraft(STATE, PLAYER, 'sword', null);
    installAllMocks();
    Wiring.onCraft(STATE, PLAYER, 'shield', null);
    var s = Wiring.getStats();
    assert.strictEqual(s.onZoneChange, 1);
    assert.strictEqual(s.onCraft, 2);
    removeAllMocks();
  });
  test('getStats returns a copy, not the internal object', function() {
    installAllMocks();
    Wiring.resetStats();
    Wiring.onBuild(STATE, PLAYER, 'tower', 'nexus');
    var s1 = Wiring.getStats();
    s1.onBuild = 999;
    var s2 = Wiring.getStats();
    assert.strictEqual(s2.onBuild, 1);
    removeAllMocks();
  });
  test('stat counts survive repeated calls to same dispatcher', function() {
    installAllMocks();
    Wiring.resetStats();
    for (var i = 0; i < 5; i++) {
      Wiring.onConstellationFound(STATE, PLAYER, 'orion');
      installAllMocks();
    }
    var s = Wiring.getStats();
    assert.strictEqual(s.onConstellationFound, 5);
    removeAllMocks();
  });
});

suite('resetStats', function() {
  test('resetStats empties the stats object', function() {
    installAllMocks();
    Wiring.onZoneChange(STATE, PLAYER, 'nexus', 'gardens');
    Wiring.resetStats();
    var s = Wiring.getStats();
    assert.strictEqual(Object.keys(s).length, 0);
    removeAllMocks();
  });
  test('resetStats allows counts to restart from zero', function() {
    installAllMocks();
    Wiring.onHarvest(STATE, PLAYER, 'wood', 'wilds', 1);
    Wiring.resetStats();
    installAllMocks();
    Wiring.onHarvest(STATE, PLAYER, 'wood', 'wilds', 1);
    var s = Wiring.getStats();
    assert.strictEqual(s.onHarvest, 1);
    removeAllMocks();
  });
});

// ============================================================================
// SUITE 23: _getModule
// ============================================================================

suite('_getModule', function() {
  test('returns null when module absent from global', function() {
    removeAllMocks();
    var m = Wiring._getModule('SomeMissingModule');
    assert.strictEqual(m, null);
  });
  test('returns module when present in global', function() {
    var fake = { isTest: true };
    global.FakeTestModule = fake;
    var m = Wiring._getModule('FakeTestModule');
    assert.ok(m !== null);
    assert.strictEqual(m.isTest, true);
    delete global.FakeTestModule;
  });
  test('returns correct module reference', function() {
    var obj = { id: 42 };
    global.SpecificMod = obj;
    var m = Wiring._getModule('SpecificMod');
    assert.strictEqual(m, obj);
    delete global.SpecificMod;
  });
  test('returns null for empty string name', function() {
    var m = Wiring._getModule('');
    assert.strictEqual(m, null);
  });
});

// ============================================================================
// SUITE 24: _safeCall
// ============================================================================

suite('_safeCall', function() {
  test('returns null when module is absent', function() {
    removeAllMocks();
    var r = Wiring._safeCall('MissingMod', 'someFunc', []);
    assert.strictEqual(r, null);
  });
  test('returns null when function is missing on module', function() {
    global.PartialMod = { otherFn: function() { return 1; } };
    var r = Wiring._safeCall('PartialMod', 'nonExistentFn', []);
    assert.strictEqual(r, null);
    delete global.PartialMod;
  });
  test('returns function result when module and function exist', function() {
    global.WorkingMod = { fn: function() { return 99; } };
    var r = Wiring._safeCall('WorkingMod', 'fn', []);
    assert.strictEqual(r, 99);
    delete global.WorkingMod;
  });
  test('passes args to module function', function() {
    var received = null;
    global.ArgMod = { fn: function(a, b) { received = [a, b]; return 1; } };
    Wiring._safeCall('ArgMod', 'fn', ['hello', 42]);
    assert.strictEqual(received[0], 'hello');
    assert.strictEqual(received[1], 42);
    delete global.ArgMod;
  });
  test('returns null (not throw) when module function throws', function() {
    global.ThrowMod = { fn: function() { throw new Error('boom'); } };
    assert.doesNotThrow(function() {
      var r = Wiring._safeCall('ThrowMod', 'fn', []);
      assert.strictEqual(r, null);
    });
    delete global.ThrowMod;
  });
  test('module property that is not a function returns null', function() {
    global.NotFnMod = { fn: 'not a function' };
    var r = Wiring._safeCall('NotFnMod', 'fn', []);
    assert.strictEqual(r, null);
    delete global.NotFnMod;
  });
});

// ============================================================================
// SUITE 25: Graceful degradation — partial modules
// ============================================================================

suite('Graceful degradation', function() {
  test('only Progression: onHarvest awards XP but no loot', function() {
    removeAllMocks();
    global.Progression = makeMockProgression();
    var r = Wiring.onHarvest(STATE, PLAYER, 'herbs', 'gardens', 2);
    assert.strictEqual(r.xpAwarded, 8);
    assert.strictEqual(r.lootResults.length, 0);
    assert.strictEqual(r.challengesUpdated, 0);
    delete global.Progression;
  });
  test('only Loot: onFishCaught has loot but no XP', function() {
    removeAllMocks();
    global.Loot = makeMockLoot();
    var r = Wiring.onFishCaught(STATE, PLAYER, 'trout', 'nexus', 1);
    assert.strictEqual(r.xpAwarded, 0);
    assert.ok(r.lootResults.length >= 1);
    delete global.Loot;
  });
  test('throwing Progression module does not crash dispatch', function() {
    removeAllMocks();
    global.Progression = { awardXP: function() { throw new Error('module failure'); } };
    assert.doesNotThrow(function() {
      Wiring.onZoneChange(STATE, PLAYER, 'nexus', 'gardens');
    });
    delete global.Progression;
  });
  test('throwing module yields xpAwarded 0', function() {
    removeAllMocks();
    global.Progression = { awardXP: function() { throw new Error('module failure'); } };
    var r = Wiring.onZoneChange(STATE, PLAYER, 'nexus', 'gardens');
    assert.strictEqual(r.xpAwarded, 0);
    delete global.Progression;
  });
  test('module with wrong function signature still does not throw', function() {
    removeAllMocks();
    global.DailyChallenges = { updateProgress: 'not_a_function' };
    assert.doesNotThrow(function() {
      Wiring.onCraft(STATE, PLAYER, 'potion', null);
    });
    delete global.DailyChallenges;
  });
});

// ============================================================================
// SUITE 26: Result object shapes
// ============================================================================

suite('Result object shapes', function() {
  test('onZoneChange result has all expected keys', function() {
    removeAllMocks();
    var r = Wiring.onZoneChange(STATE, PLAYER, 'a', 'b');
    assert.ok('xpAwarded' in r);
    assert.ok('lootResults' in r);
    assert.ok('challengesUpdated' in r);
    assert.ok('fromZone' in r);
    assert.ok('toZone' in r);
  });
  test('onHarvest result has itemId, zone, quantity keys', function() {
    removeAllMocks();
    var r = Wiring.onHarvest(STATE, PLAYER, 'item', 'zone', 1);
    assert.ok('itemId' in r);
    assert.ok('zone' in r);
    assert.ok('quantity' in r);
  });
  test('onDungeonClear result has dungeonId, floor, timeMs keys', function() {
    removeAllMocks();
    var r = Wiring.onDungeonClear(STATE, PLAYER, 'dng', 2, 0);
    assert.ok('dungeonId' in r);
    assert.ok('floor' in r);
    assert.ok('timeMs' in r);
  });
  test('onTimeCapsuleBuried result has capsuleId and zone keys', function() {
    removeAllMocks();
    var r = Wiring.onTimeCapsuleBuried(STATE, PLAYER, 'cap', 'nexus');
    assert.ok('capsuleId' in r);
    assert.ok('zone' in r);
  });
  test('onTimeCapsuleFound result has capsuleId key', function() {
    removeAllMocks();
    var r = Wiring.onTimeCapsuleFound(STATE, PLAYER, 'cap');
    assert.ok('capsuleId' in r);
  });
  test('onMentorSession result has teacherId and subject keys', function() {
    removeAllMocks();
    var r = Wiring.onMentorSession(STATE, PLAYER, 'teacher', 'topic');
    assert.ok('teacherId' in r);
    assert.ok('subject' in r);
  });
  test('onTrade result has otherPlayerId and spark keys', function() {
    removeAllMocks();
    var r = Wiring.onTrade(STATE, PLAYER, 'p2', [], 50);
    assert.ok('otherPlayerId' in r);
    assert.ok('spark' in r);
  });
  test('onCardGameWin result has opponentId and deckType keys', function() {
    removeAllMocks();
    var r = Wiring.onCardGameWin(STATE, PLAYER, 'opp', 'control');
    assert.ok('opponentId' in r);
    assert.ok('deckType' in r);
  });
  test('onVoteCast result has eventId and optionId keys', function() {
    removeAllMocks();
    var r = Wiring.onVoteCast(STATE, PLAYER, 'ev1', 'opt_a');
    assert.ok('eventId' in r);
    assert.ok('optionId' in r);
  });
  test('onHousingVisit result has ownerId and houseId keys', function() {
    removeAllMocks();
    var r = Wiring.onHousingVisit(STATE, PLAYER, 'owner', 'house');
    assert.ok('ownerId' in r);
    assert.ok('houseId' in r);
  });
});

// ============================================================================
// SUITE 27: State not mutated, multiple players
// ============================================================================

suite('State and player isolation', function() {
  test('state is not mutated by dispatch calls (except progression)', function() {
    installAllMocks();
    var state = { players: {}, economy: {}, _marker: 'original' };
    Wiring.onZoneChange(state, PLAYER, 'nexus', 'gardens');
    installAllMocks();
    Wiring.onHarvest(state, PLAYER, 'wood', 'wilds', 1);
    assert.strictEqual(state._marker, 'original');
    // _getPlayerProgression may add a progression key to state
    assert.ok(Object.keys(state).length >= 3, 'state has at least original keys');
    removeAllMocks();
  });
  test('state reference is passed through to module calls', function() {
    var capturedState = null;
    global.Progression = {
      awardXP: function(s) { capturedState = s; return { xp: 5 }; },
      createPlayerProgression: function(id) {
        return { playerId: id, totalXP: 0, level: 1, skillPoints: 0, skills: {}, xpHistory: [], perks: [] };
      }
    };
    var customState = { players: { alice: {} }, economy: { spark: 99 } };
    Wiring.onZoneChange(customState, 'alice', 'nexus', 'gardens');
    // _getPlayerProgression creates a progression state from the world state
    // so capturedState is the player's progression object, not the world state
    assert.ok(capturedState !== null, 'progression state was passed to awardXP');
    assert.strictEqual(capturedState.playerId, 'alice');
    delete global.Progression;
  });
  test('two players receive independent results', function() {
    installAllMocks();
    Wiring.resetStats();
    var r1 = Wiring.onZoneChange(STATE, 'alice', 'nexus', 'gardens');
    installAllMocks();
    var r2 = Wiring.onZoneChange(STATE, 'bob', 'nexus', 'arena');
    assert.strictEqual(r1.xpAwarded, 5);
    assert.strictEqual(r2.xpAwarded, 5);
    assert.strictEqual(r1.toZone, 'gardens');
    assert.strictEqual(r2.toZone, 'arena');
    removeAllMocks();
  });
});

// ============================================================================
// FINAL REPORT
// ============================================================================

var success = report();
process.exit(success ? 0 : 1);
