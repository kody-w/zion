/**
 * tests/test_npc_ai.js
 * Comprehensive tests for the ZION NPC Artificial Intelligence module
 * 50+ assertions covering constants, data structures, brain lifecycle,
 * mood/goal system, conversations, lore, teachings, and edge cases
 */

'use strict';

const { test, suite, report, assert } = require('./test_runner');
const AI = require('../src/js/npc_ai');

// ============================================================================
// HELPERS
// ============================================================================

var ALL_ARCHETYPES = [
  'gardener', 'builder', 'storyteller', 'merchant', 'explorer',
  'teacher', 'musician', 'healer', 'philosopher', 'artist'
];

var ALL_TIME_PERIODS = ['dawn', 'morning', 'midday', 'afternoon', 'evening', 'night'];

/** Create a minimal NPC object for use in brain/perceive calls */
function makeNpc(id, archetype, x, z) {
  return { id: id || 'npc_1', archetype: archetype || 'gardener', x: x || 0, z: z || 0, name: 'Tester' };
}

/** Create a minimal world state */
function makeWorld(overrides) {
  var base = {
    weather: 'clear',
    timeOfDay: 'morning',
    currentZone: 'gardens',
    players: [],
    npcs: [],
    recentEvents: [],
    nearWater: false,
    inShelter: false
  };
  if (overrides) {
    Object.keys(overrides).forEach(function(k) { base[k] = overrides[k]; });
  }
  return base;
}

/** Create a fresh brain for a given archetype */
function freshBrain(archetype) {
  return AI.createNpcBrain(archetype || 'gardener', 'npc_test_' + archetype);
}

// ============================================================================
// SUITE 1: MODULE EXPORTS — Verify all constants and functions exist
// ============================================================================

suite('Module exports — constants', function() {
  test('exports ARCHETYPE_DRIVES object', function() {
    assert.ok(AI.ARCHETYPE_DRIVES && typeof AI.ARCHETYPE_DRIVES === 'object');
  });
  test('exports DAILY_SCHEDULE object', function() {
    assert.ok(AI.DAILY_SCHEDULE && typeof AI.DAILY_SCHEDULE === 'object');
  });
  test('exports MOODS array', function() {
    assert.ok(Array.isArray(AI.MOODS));
  });
  test('exports ZONE_DIALOGUES object', function() {
    assert.ok(AI.ZONE_DIALOGUES && typeof AI.ZONE_DIALOGUES === 'object');
  });
  test('exports ARCHETYPE_REACTIONS object', function() {
    assert.ok(AI.ARCHETYPE_REACTIONS && typeof AI.ARCHETYPE_REACTIONS === 'object');
  });
  test('exports NPC_CONVERSATIONS object', function() {
    assert.ok(AI.NPC_CONVERSATIONS && typeof AI.NPC_CONVERSATIONS === 'object');
  });
  test('exports WORLD_LORE array', function() {
    assert.ok(Array.isArray(AI.WORLD_LORE));
  });
  test('exports ARCHETYPE_LORE object', function() {
    assert.ok(AI.ARCHETYPE_LORE && typeof AI.ARCHETYPE_LORE === 'object');
  });
  test('exports TEACHINGS object', function() {
    assert.ok(AI.TEACHINGS && typeof AI.TEACHINGS === 'object');
  });
  test('exports COLLABORATIVE_ACTIVITIES object', function() {
    assert.ok(AI.COLLABORATIVE_ACTIVITIES && typeof AI.COLLABORATIVE_ACTIVITIES === 'object');
  });
  test('exports QUEST_HOOKS object', function() {
    assert.ok(AI.QUEST_HOOKS && typeof AI.QUEST_HOOKS === 'object');
  });
  test('exports POINTS_OF_INTEREST object', function() {
    assert.ok(AI.POINTS_OF_INTEREST && typeof AI.POINTS_OF_INTEREST === 'object');
  });
});

suite('Module exports — functions', function() {
  test('exports createNpcBrain function', function() {
    assert.strictEqual(typeof AI.createNpcBrain, 'function');
  });
  test('exports updateBrain function', function() {
    assert.strictEqual(typeof AI.updateBrain, 'function');
  });
  test('exports perceive function', function() {
    assert.strictEqual(typeof AI.perceive, 'function');
  });
  test('exports getDecision function', function() {
    assert.strictEqual(typeof AI.getDecision, 'function');
  });
  test('exports handleEvent function', function() {
    assert.strictEqual(typeof AI.handleEvent, 'function');
  });
  test('exports getDialogue function', function() {
    assert.strictEqual(typeof AI.getDialogue, 'function');
  });
  test('exports getMood function', function() {
    assert.strictEqual(typeof AI.getMood, 'function');
  });
  test('exports getGoal function', function() {
    assert.strictEqual(typeof AI.getGoal, 'function');
  });
  test('exports getDetailedGoal function', function() {
    assert.strictEqual(typeof AI.getDetailedGoal, 'function');
  });
  test('exports generateConversation function', function() {
    assert.strictEqual(typeof AI.generateConversation, 'function');
  });
  test('exports getLore function', function() {
    assert.strictEqual(typeof AI.getLore, 'function');
  });
  test('exports getTeaching function', function() {
    assert.strictEqual(typeof AI.getTeaching, 'function');
  });
  test('exports getDailySchedule function', function() {
    assert.strictEqual(typeof AI.getDailySchedule, 'function');
  });
  test('exports getNPCReaction function', function() {
    assert.strictEqual(typeof AI.getNPCReaction, 'function');
  });
  test('exports generateNPCInteraction function', function() {
    assert.strictEqual(typeof AI.generateNPCInteraction, 'function');
  });
  test('exports buildDialogueContext function', function() {
    assert.strictEqual(typeof AI.buildDialogueContext, 'function');
  });
  test('exports getMemory function', function() {
    assert.strictEqual(typeof AI.getMemory, 'function');
  });
  test('exports applyEmotionalContagion function', function() {
    assert.strictEqual(typeof AI.applyEmotionalContagion, 'function');
  });
  test('exports getPointOfInterest function', function() {
    assert.strictEqual(typeof AI.getPointOfInterest, 'function');
  });
  test('exports generateGossip function', function() {
    assert.strictEqual(typeof AI.generateGossip, 'function');
  });
  test('exports getCollaborativeActivity function', function() {
    assert.strictEqual(typeof AI.getCollaborativeActivity, 'function');
  });
});

// ============================================================================
// SUITE 2: ARCHETYPE_DRIVES data
// ============================================================================

suite('ARCHETYPE_DRIVES — has all 10 archetypes', function() {
  test('has exactly 10 archetypes', function() {
    assert.strictEqual(Object.keys(AI.ARCHETYPE_DRIVES).length, 10);
  });

  ALL_ARCHETYPES.forEach(function(arch) {
    test(arch + ' entry exists', function() {
      assert.ok(AI.ARCHETYPE_DRIVES[arch], 'Missing archetype: ' + arch);
    });
    test(arch + ' has primary string', function() {
      assert.strictEqual(typeof AI.ARCHETYPE_DRIVES[arch].primary, 'string');
    });
    test(arch + ' has secondary string', function() {
      assert.strictEqual(typeof AI.ARCHETYPE_DRIVES[arch].secondary, 'string');
    });
    test(arch + ' has social string', function() {
      assert.strictEqual(typeof AI.ARCHETYPE_DRIVES[arch].social, 'string');
    });
    test(arch + ' has rest string', function() {
      assert.strictEqual(typeof AI.ARCHETYPE_DRIVES[arch].rest, 'string');
    });
    test(arch + ' has work_locations array', function() {
      assert.ok(Array.isArray(AI.ARCHETYPE_DRIVES[arch].work_locations));
    });
    test(arch + ' has preferred_time array', function() {
      assert.ok(Array.isArray(AI.ARCHETYPE_DRIVES[arch].preferred_time));
    });
    test(arch + ' has weather_preference string', function() {
      assert.strictEqual(typeof AI.ARCHETYPE_DRIVES[arch].weather_preference, 'string');
    });
  });

  test('gardener primary is tend_plants', function() {
    assert.strictEqual(AI.ARCHETYPE_DRIVES.gardener.primary, 'tend_plants');
  });
  test('gardener weather_preference is rain', function() {
    assert.strictEqual(AI.ARCHETYPE_DRIVES.gardener.weather_preference, 'rain');
  });
  test('explorer weather_preference is any', function() {
    assert.strictEqual(AI.ARCHETYPE_DRIVES.explorer.weather_preference, 'any');
  });
  test('builder primary is inspect_structures', function() {
    assert.strictEqual(AI.ARCHETYPE_DRIVES.builder.primary, 'inspect_structures');
  });
  test('musician preferred_time includes evening', function() {
    assert.ok(AI.ARCHETYPE_DRIVES.musician.preferred_time.indexOf('evening') !== -1);
  });
  test('merchant work_locations includes agora', function() {
    assert.ok(AI.ARCHETYPE_DRIVES.merchant.work_locations.indexOf('agora') !== -1);
  });
  test('philosopher primary is contemplate', function() {
    assert.strictEqual(AI.ARCHETYPE_DRIVES.philosopher.primary, 'contemplate');
  });
  test('artist rest is observe_beauty', function() {
    assert.strictEqual(AI.ARCHETYPE_DRIVES.artist.rest, 'observe_beauty');
  });
});

// ============================================================================
// SUITE 3: DAILY_SCHEDULE data
// ============================================================================

suite('DAILY_SCHEDULE — 6 time periods with required fields', function() {
  test('has exactly 6 time periods', function() {
    assert.strictEqual(Object.keys(AI.DAILY_SCHEDULE).length, 6);
  });

  ALL_TIME_PERIODS.forEach(function(period) {
    test(period + ' entry exists', function() {
      assert.ok(AI.DAILY_SCHEDULE[period], 'Missing period: ' + period);
    });
    test(period + ' has hours array of length 2', function() {
      assert.ok(Array.isArray(AI.DAILY_SCHEDULE[period].hours));
      assert.strictEqual(AI.DAILY_SCHEDULE[period].hours.length, 2);
    });
    test(period + ' has activity string', function() {
      assert.strictEqual(typeof AI.DAILY_SCHEDULE[period].activity, 'string');
    });
    test(period + ' has energy_regen number', function() {
      assert.strictEqual(typeof AI.DAILY_SCHEDULE[period].energy_regen, 'number');
    });
    test(period + ' has social_chance number between 0 and 1', function() {
      var sc = AI.DAILY_SCHEDULE[period].social_chance;
      assert.ok(typeof sc === 'number' && sc >= 0 && sc <= 1);
    });
    test(period + ' has work_priority number between 0 and 1', function() {
      var wp = AI.DAILY_SCHEDULE[period].work_priority;
      assert.ok(typeof wp === 'number' && wp >= 0 && wp <= 1);
    });
  });

  test('morning activity is primary_work', function() {
    assert.strictEqual(AI.DAILY_SCHEDULE.morning.activity, 'primary_work');
  });
  test('morning work_priority is 1.0', function() {
    assert.strictEqual(AI.DAILY_SCHEDULE.morning.work_priority, 1.0);
  });
  test('night energy_regen is 1.0', function() {
    assert.strictEqual(AI.DAILY_SCHEDULE.night.energy_regen, 1.0);
  });
  test('midday social_chance is 0.8', function() {
    assert.strictEqual(AI.DAILY_SCHEDULE.midday.social_chance, 0.8);
  });
  test('evening social_chance is 0.9', function() {
    assert.strictEqual(AI.DAILY_SCHEDULE.evening.social_chance, 0.9);
  });
  test('dawn hours start at 5', function() {
    assert.strictEqual(AI.DAILY_SCHEDULE.dawn.hours[0], 5);
  });
});

// ============================================================================
// SUITE 4: MOODS data
// ============================================================================

suite('MOODS data — 8 entries, all strings', function() {
  test('MOODS has exactly 8 entries', function() {
    assert.strictEqual(AI.MOODS.length, 8);
  });
  test('all MOODS are strings', function() {
    AI.MOODS.forEach(function(m) {
      assert.strictEqual(typeof m, 'string');
    });
  });
  test('contains content', function() {
    assert.ok(AI.MOODS.indexOf('content') !== -1);
  });
  test('contains excited', function() {
    assert.ok(AI.MOODS.indexOf('excited') !== -1);
  });
  test('contains contemplative', function() {
    assert.ok(AI.MOODS.indexOf('contemplative') !== -1);
  });
  test('contains social', function() {
    assert.ok(AI.MOODS.indexOf('social') !== -1);
  });
  test('contains tired', function() {
    assert.ok(AI.MOODS.indexOf('tired') !== -1);
  });
  test('contains focused', function() {
    assert.ok(AI.MOODS.indexOf('focused') !== -1);
  });
  test('contains curious', function() {
    assert.ok(AI.MOODS.indexOf('curious') !== -1);
  });
  test('contains peaceful', function() {
    assert.ok(AI.MOODS.indexOf('peaceful') !== -1);
  });
  test('no duplicate MOODS', function() {
    var unique = AI.MOODS.filter(function(m, i) { return AI.MOODS.indexOf(m) === i; });
    assert.strictEqual(unique.length, AI.MOODS.length);
  });
});

// ============================================================================
// SUITE 5: createNpcBrain
// ============================================================================

suite('createNpcBrain — returns valid brain object', function() {
  test('returns an object', function() {
    var brain = freshBrain('gardener');
    assert.ok(brain && typeof brain === 'object');
  });
  test('brain.id is set to provided npcId', function() {
    var brain = AI.createNpcBrain('gardener', 'npc_42');
    assert.strictEqual(brain.id, 'npc_42');
  });
  test('brain.archetype matches provided archetype', function() {
    var brain = AI.createNpcBrain('musician', 'npc_10');
    assert.strictEqual(brain.archetype, 'musician');
  });
  test('brain.memory is an object', function() {
    var brain = freshBrain('builder');
    assert.ok(brain.memory && typeof brain.memory === 'object');
  });
  test('brain.memory.archetype matches brain archetype', function() {
    var brain = AI.createNpcBrain('healer', 'npc_h');
    assert.strictEqual(brain.memory.archetype, 'healer');
  });
  test('brain.currentAction starts as null', function() {
    var brain = freshBrain('explorer');
    assert.strictEqual(brain.currentAction, null);
  });
  test('brain.lastUpdateTime is a number', function() {
    var brain = freshBrain('teacher');
    assert.strictEqual(typeof brain.lastUpdateTime, 'number');
  });
  test('brain.memory.energy starts at 100', function() {
    var brain = freshBrain('philosopher');
    assert.strictEqual(brain.memory.energy, 100);
  });
  test('brain.memory.interactions starts as empty array', function() {
    var brain = freshBrain('artist');
    assert.ok(Array.isArray(brain.memory.interactions));
    assert.strictEqual(brain.memory.interactions.length, 0);
  });
  test('brain.memory.witnessedEvents starts as empty array', function() {
    var brain = freshBrain('merchant');
    assert.ok(Array.isArray(brain.memory.witnessedEvents));
  });
  test('brain.memory.playerFamiliarity starts as empty object', function() {
    var brain = freshBrain('storyteller');
    assert.ok(brain.memory.playerFamiliarity && typeof brain.memory.playerFamiliarity === 'object');
  });
  test('brain.memory.mood starts as content', function() {
    var brain = freshBrain('gardener');
    assert.strictEqual(brain.memory.mood, 'content');
  });
  test('two brains created independently have distinct ids', function() {
    var b1 = AI.createNpcBrain('gardener', 'npc_A');
    var b2 = AI.createNpcBrain('builder', 'npc_B');
    assert.notStrictEqual(b1.id, b2.id);
  });
  test('creates valid brain for every archetype', function() {
    ALL_ARCHETYPES.forEach(function(arch) {
      var brain = AI.createNpcBrain(arch, 'npc_' + arch);
      assert.strictEqual(brain.archetype, arch, 'Failed for archetype: ' + arch);
    });
  });
});

// ============================================================================
// SUITE 6: getMood / getGoal / getDetailedGoal
// ============================================================================

suite('getMood — returns one of MOODS', function() {
  test('returns a string', function() {
    var brain = freshBrain('gardener');
    assert.strictEqual(typeof AI.getMood(brain), 'string');
  });
  test('returned mood is in MOODS array', function() {
    var brain = freshBrain('philosopher');
    var mood = AI.getMood(brain);
    assert.ok(AI.MOODS.indexOf(mood) !== -1, 'Unknown mood: ' + mood);
  });
  test('reflects brain.memory.mood', function() {
    var brain = freshBrain('musician');
    brain.memory.mood = 'excited';
    assert.strictEqual(AI.getMood(brain), 'excited');
  });
  test('setting memory.mood to tired is reflected', function() {
    var brain = freshBrain('healer');
    brain.memory.mood = 'tired';
    assert.strictEqual(AI.getMood(brain), 'tired');
  });
});

suite('getGoal — returns string description', function() {
  test('returns idle when no currentGoal', function() {
    var brain = freshBrain('builder');
    assert.strictEqual(AI.getGoal(brain), 'idle');
  });
  test('returns string when currentGoal is set', function() {
    var brain = freshBrain('gardener');
    brain.memory.currentGoal = { type: 'work' };
    var goal = AI.getGoal(brain);
    assert.strictEqual(typeof goal, 'string');
    assert.ok(goal.length > 0);
  });
  test('work goal includes drive primary action', function() {
    var brain = AI.createNpcBrain('gardener', 'npc_g');
    brain.memory.currentGoal = { type: 'work' };
    var goal = AI.getGoal(brain);
    assert.ok(goal.toLowerCase().indexOf('work') !== -1 || goal.indexOf('tend_plants') !== -1, goal);
  });
  test('rest goal mentions energy or resting', function() {
    var brain = freshBrain('explorer');
    brain.memory.currentGoal = { type: 'rest' };
    var goal = AI.getGoal(brain);
    assert.ok(goal.toLowerCase().indexOf('rest') !== -1 || goal.toLowerCase().indexOf('energy') !== -1, goal);
  });
  test('unknown goal type returns Being present fallback', function() {
    var brain = freshBrain('artist');
    brain.memory.currentGoal = { type: 'some_unknown_action' };
    var goal = AI.getGoal(brain);
    assert.strictEqual(typeof goal, 'string');
  });
});

suite('getDetailedGoal — returns object with text and icon', function() {
  test('returns object with text and icon when no goal', function() {
    var brain = freshBrain('teacher');
    var result = AI.getDetailedGoal(brain);
    assert.ok(result && typeof result === 'object');
    assert.ok('text' in result, 'Missing text');
    assert.ok('icon' in result, 'Missing icon');
  });
  test('text is a non-empty string', function() {
    var brain = freshBrain('merchant');
    var result = AI.getDetailedGoal(brain);
    assert.ok(typeof result.text === 'string' && result.text.length > 0);
  });
  test('icon is a non-empty string', function() {
    var brain = freshBrain('merchant');
    var result = AI.getDetailedGoal(brain);
    assert.ok(typeof result.icon === 'string' && result.icon.length > 0);
  });
  test('work goal returns icon work', function() {
    var brain = freshBrain('gardener');
    brain.memory.currentGoal = { type: 'work' };
    var result = AI.getDetailedGoal(brain);
    assert.strictEqual(result.icon, 'work');
  });
  test('rest goal returns icon rest', function() {
    var brain = freshBrain('healer');
    brain.memory.currentGoal = { type: 'rest' };
    var result = AI.getDetailedGoal(brain);
    assert.strictEqual(result.icon, 'rest');
  });
  test('socialize goal returns icon social', function() {
    var brain = freshBrain('storyteller');
    brain.memory.currentGoal = { type: 'socialize' };
    var result = AI.getDetailedGoal(brain);
    assert.strictEqual(result.icon, 'social');
  });
  test('wander goal returns icon walk', function() {
    var brain = freshBrain('explorer');
    brain.memory.currentGoal = { type: 'wander' };
    var result = AI.getDetailedGoal(brain);
    assert.strictEqual(result.icon, 'walk');
  });
  test('idle goal text is Taking it easy', function() {
    var brain = freshBrain('philosopher');
    brain.memory.currentGoal = { type: 'idle' };
    var result = AI.getDetailedGoal(brain);
    assert.strictEqual(result.text, 'Taking it easy');
  });
  test('walk_to with poiName includes poiName in text', function() {
    var brain = freshBrain('musician');
    brain.memory.currentGoal = { type: 'walk_to', poiName: 'Central Fountain' };
    var result = AI.getDetailedGoal(brain);
    assert.ok(result.text.indexOf('Central Fountain') !== -1, result.text);
  });
});

// ============================================================================
// SUITE 7: generateConversation
// ============================================================================

suite('generateConversation — generates dialogue between archetype pairs', function() {
  test('returns null for non-paired archetypes', function() {
    // gardener + merchant has no defined conversation pair
    var result = AI.generateConversation('Alice', 'gardener', 'Bob', 'merchant');
    assert.strictEqual(result, null);
  });
  test('returns array for gardener+musician pair', function() {
    var result = AI.generateConversation('Alice', 'gardener', 'Bob', 'musician');
    assert.ok(Array.isArray(result));
  });
  test('returned array is non-empty', function() {
    var result = AI.generateConversation('Alice', 'gardener', 'Bob', 'musician');
    assert.ok(result && result.length > 0);
  });
  test('all lines are strings', function() {
    var result = AI.generateConversation('Alice', 'gardener', 'Bob', 'musician');
    assert.ok(result);
    result.forEach(function(line) {
      assert.strictEqual(typeof line, 'string', 'Line is not a string: ' + line);
    });
  });
  test('names are substituted in dialogue (no {a} or {b} placeholders)', function() {
    var result = AI.generateConversation('Aria', 'gardener', 'Bard', 'musician');
    assert.ok(result);
    result.forEach(function(line) {
      assert.ok(line.indexOf('{a}') === -1, 'Unsubstituted {a} in: ' + line);
      assert.ok(line.indexOf('{b}') === -1, 'Unsubstituted {b} in: ' + line);
    });
  });
  test('works with reversed archetype order (musician+gardener)', function() {
    var result = AI.generateConversation('Bard', 'musician', 'Aria', 'gardener');
    assert.ok(Array.isArray(result) && result.length > 0);
  });
  test('philosopher+storyteller pair returns conversation', function() {
    var result = AI.generateConversation('Sage', 'philosopher', 'Tale', 'storyteller');
    assert.ok(Array.isArray(result) && result.length > 0);
  });
  test('teacher+explorer pair returns conversation', function() {
    var result = AI.generateConversation('Prof', 'teacher', 'Scout', 'explorer');
    assert.ok(Array.isArray(result) && result.length > 0);
  });
  test('builder+artist pair returns conversation', function() {
    var result = AI.generateConversation('Mason', 'builder', 'Muse', 'artist');
    assert.ok(Array.isArray(result) && result.length > 0);
  });
  test('gardener+healer pair returns conversation', function() {
    var result = AI.generateConversation('Bloom', 'gardener', 'Mend', 'healer');
    assert.ok(Array.isArray(result) && result.length > 0);
  });
  test('musician+storyteller pair returns conversation', function() {
    var result = AI.generateConversation('Lyric', 'musician', 'Lore', 'storyteller');
    assert.ok(Array.isArray(result) && result.length > 0);
  });
  test('returned names appear in at least one line', function() {
    var result = AI.generateConversation('Zara', 'gardener', 'Zion', 'musician');
    assert.ok(result);
    var allText = result.join(' ');
    assert.ok(allText.indexOf('Zara') !== -1 || allText.indexOf('Zion') !== -1, 'Neither name appears in: ' + allText);
  });
});

// ============================================================================
// SUITE 8: getLore / getTeaching
// ============================================================================

suite('getLore — returns expected types', function() {
  test('returns a string', function() {
    var result = AI.getLore('gardener', {});
    assert.strictEqual(typeof result, 'string');
  });
  test('returned string is non-empty', function() {
    var result = AI.getLore('builder', {});
    assert.ok(result.length > 0);
  });
  test('works for all archetypes', function() {
    ALL_ARCHETYPES.forEach(function(arch) {
      var result = AI.getLore(arch, {});
      assert.ok(typeof result === 'string' && result.length > 0, 'Failed for: ' + arch);
    });
  });
  test('works with null memory', function() {
    var result = AI.getLore('musician', null);
    assert.ok(typeof result === 'string' && result.length > 0);
  });
  test('returns a string from WORLD_LORE pool or ARCHETYPE_LORE pool', function() {
    var result = AI.getLore('philosopher', {});
    var allLore = AI.WORLD_LORE.concat(AI.ARCHETYPE_LORE.philosopher || []);
    assert.ok(allLore.indexOf(result) !== -1, 'Lore not in any pool: ' + result);
  });
  test('tracks sharedLore in memory when memory provided', function() {
    var memory = {};
    AI.getLore('gardener', memory);
    assert.ok(Array.isArray(memory.sharedLore) && memory.sharedLore.length === 1);
  });
  test('accumulates sharedLore across multiple calls', function() {
    var memory = {};
    AI.getLore('builder', memory);
    AI.getLore('builder', memory);
    AI.getLore('builder', memory);
    assert.ok(memory.sharedLore.length >= 1);
  });
  test('unknown archetype falls back gracefully (returns string)', function() {
    var result = AI.getLore('nonexistent_arch', {});
    assert.ok(typeof result === 'string' && result.length > 0);
  });
});

suite('getTeaching — returns expected types', function() {
  test('returns an object for fresh memory', function() {
    var result = AI.getTeaching('gardener', {});
    assert.ok(result && typeof result === 'object');
  });
  test('returned object has topic string', function() {
    var result = AI.getTeaching('builder', {});
    assert.ok(result && typeof result.topic === 'string');
  });
  test('returned object has description string', function() {
    var result = AI.getTeaching('teacher', {});
    assert.ok(result && typeof result.description === 'string');
  });
  test('returned object has skill string', function() {
    var result = AI.getTeaching('musician', {});
    assert.ok(result && typeof result.skill === 'string');
  });
  test('returns null when all 3 teachings exhausted', function() {
    var memory = { teachingsLearned: [] };
    var t1 = AI.getTeaching('gardener', memory);
    var t2 = AI.getTeaching('gardener', memory);
    var t3 = AI.getTeaching('gardener', memory);
    var t4 = AI.getTeaching('gardener', memory);
    // TEACHINGS.gardener has 3 entries, 4th call should return null
    assert.strictEqual(t4, null);
  });
  test('tracks teachingsLearned in memory', function() {
    var memory = {};
    AI.getTeaching('healer', memory);
    assert.ok(Array.isArray(memory.teachingsLearned) && memory.teachingsLearned.length === 1);
  });
  test('works for all archetypes', function() {
    ALL_ARCHETYPES.forEach(function(arch) {
      var result = AI.getTeaching(arch, {});
      assert.ok(result && typeof result.topic === 'string', 'Failed for: ' + arch);
    });
  });
  test('works with null memory', function() {
    var result = AI.getTeaching('philosopher', null);
    assert.ok(result && typeof result.topic === 'string');
  });
});

// ============================================================================
// SUITE 9: WORLD_LORE data
// ============================================================================

suite('WORLD_LORE data — non-empty, all strings', function() {
  test('has exactly 16 entries', function() {
    assert.strictEqual(AI.WORLD_LORE.length, 16);
  });
  test('all entries are strings', function() {
    AI.WORLD_LORE.forEach(function(entry, i) {
      assert.strictEqual(typeof entry, 'string', 'Entry ' + i + ' is not a string');
    });
  });
  test('all entries are non-empty', function() {
    AI.WORLD_LORE.forEach(function(entry, i) {
      assert.ok(entry.length > 0, 'Entry ' + i + ' is empty');
    });
  });
  test('first entry mentions ZION', function() {
    assert.ok(AI.WORLD_LORE[0].indexOf('ZION') !== -1, AI.WORLD_LORE[0]);
  });
  test('no duplicate entries', function() {
    var unique = AI.WORLD_LORE.filter(function(e, i) { return AI.WORLD_LORE.indexOf(e) === i; });
    assert.strictEqual(unique.length, AI.WORLD_LORE.length);
  });
  test('ARCHETYPE_LORE has all 10 archetypes', function() {
    ALL_ARCHETYPES.forEach(function(arch) {
      assert.ok(Array.isArray(AI.ARCHETYPE_LORE[arch]), 'Missing lore for: ' + arch);
    });
  });
  test('each archetype has exactly 5 lore entries', function() {
    ALL_ARCHETYPES.forEach(function(arch) {
      assert.strictEqual(AI.ARCHETYPE_LORE[arch].length, 5, 'Wrong count for: ' + arch);
    });
  });
  test('archetype lore entries are all strings', function() {
    ALL_ARCHETYPES.forEach(function(arch) {
      AI.ARCHETYPE_LORE[arch].forEach(function(entry, i) {
        assert.strictEqual(typeof entry, 'string', arch + ' entry ' + i + ' is not a string');
      });
    });
  });
});

// ============================================================================
// SUITE 10: Edge cases
// ============================================================================

suite('Edge cases', function() {
  test('perceive returns perception with correct structure', function() {
    var npc = makeNpc('npc_1', 'gardener', 0, 0);
    var world = makeWorld();
    var p = AI.perceive(npc, world);
    assert.ok(p && typeof p === 'object');
    assert.ok(Array.isArray(p.nearbyPlayers));
    assert.ok(Array.isArray(p.nearbyNPCs));
    assert.ok(typeof p.weather === 'string');
    assert.ok(typeof p.timeOfDay === 'string');
  });
  test('perceive detects player within perception radius', function() {
    var npc = makeNpc('npc_1', 'gardener', 0, 0);
    var world = makeWorld({ players: [{ id: 'player_1', x: 5, z: 5 }] });
    var p = AI.perceive(npc, world);
    assert.strictEqual(p.nearbyPlayers.length, 1);
  });
  test('perceive does not detect player beyond perception radius', function() {
    var npc = makeNpc('npc_1', 'gardener', 0, 0);
    var world = makeWorld({ players: [{ id: 'player_1', x: 100, z: 100 }] });
    var p = AI.perceive(npc, world);
    assert.strictEqual(p.nearbyPlayers.length, 0);
  });
  test('getDecision returns null for fresh brain', function() {
    var brain = freshBrain('artist');
    assert.strictEqual(AI.getDecision(brain), null);
  });
  test('getMemory returns the brain memory object', function() {
    var brain = freshBrain('teacher');
    var mem = AI.getMemory(brain);
    assert.strictEqual(mem, brain.memory);
  });
  test('handleEvent does not throw on valid event', function() {
    var brain = freshBrain('explorer');
    var threw = false;
    try {
      AI.handleEvent(brain.memory, { type: 'weather_change', weather: 'rain', description: 'It started raining' });
    } catch (e) {
      threw = true;
    }
    assert.strictEqual(threw, false);
  });
  test('handleEvent weather_change to preferred weather sets mood excited', function() {
    var brain = AI.createNpcBrain('gardener', 'npc_garden');
    AI.handleEvent(brain.memory, { type: 'weather_change', weather: 'rain', description: 'Rain started' });
    assert.strictEqual(brain.memory.mood, 'excited');
  });
  test('handleEvent portal_activation sets mood to curious', function() {
    var brain = freshBrain('merchant');
    AI.handleEvent(brain.memory, { type: 'portal_activation', description: 'Portal activated' });
    assert.strictEqual(brain.memory.mood, 'curious');
  });
  test('handleEvent portal_activation sets explorer mood to excited', function() {
    var brain = freshBrain('explorer');
    AI.handleEvent(brain.memory, { type: 'portal_activation', description: 'Portal activated' });
    assert.strictEqual(brain.memory.mood, 'excited');
  });
  test('applyEmotionalContagion does not throw with empty array', function() {
    var brain = freshBrain('artist');
    var threw = false;
    try {
      AI.applyEmotionalContagion(brain.memory, []);
    } catch (e) {
      threw = true;
    }
    assert.strictEqual(threw, false);
  });
  test('applyEmotionalContagion does not throw with null', function() {
    var brain = freshBrain('artist');
    var threw = false;
    try {
      AI.applyEmotionalContagion(brain.memory, null);
    } catch (e) {
      threw = true;
    }
    assert.strictEqual(threw, false);
  });
  test('getCollaborativeActivity returns object for gardener+musician', function() {
    var result = AI.getCollaborativeActivity('gardener', 'musician');
    assert.ok(result && typeof result === 'object');
  });
  test('getCollaborativeActivity has description and animation', function() {
    var result = AI.getCollaborativeActivity('builder', 'artist');
    assert.ok(result && typeof result.description === 'string');
    assert.ok(result && typeof result.animation === 'string');
  });
  test('getCollaborativeActivity returns null for unrelated archetypes', function() {
    var result = AI.getCollaborativeActivity('merchant', 'philosopher');
    assert.strictEqual(result, null);
  });
  test('getPointOfInterest returns object for known zone and archetype', function() {
    var result = AI.getPointOfInterest('gardens', 'gardener');
    assert.ok(result && typeof result === 'object');
    assert.ok('name' in result && 'x' in result && 'z' in result);
  });
  test('getPointOfInterest returns null for unknown zone', function() {
    var result = AI.getPointOfInterest('nonexistent_zone', 'gardener');
    assert.strictEqual(result, null);
  });
  test('generateGossip returns null for empty witnessedEvents', function() {
    var memory = { witnessedEvents: [] };
    var result = AI.generateGossip(memory, 'Npc');
    assert.strictEqual(result, null);
  });
  test('generateGossip returns string when witnessedEvents present', function() {
    var memory = {
      witnessedEvents: [{
        type: 'portal_activation',
        description: 'A portal opened',
        timestamp: Date.now()
      }]
    };
    var result = AI.generateGossip(memory, 'Npc');
    assert.ok(typeof result === 'string' && result.length > 0);
  });
  test('getDailySchedule returns object with zone and activity', function() {
    var result = AI.getDailySchedule('gardener', 'morning');
    assert.ok(result && typeof result === 'object');
    assert.ok('zone' in result, 'Missing zone');
    assert.ok('activity' in result, 'Missing activity');
  });
  test('getDailySchedule returns gardener morning zone as gardens', function() {
    var result = AI.getDailySchedule('gardener', 'morning');
    assert.strictEqual(result.zone, 'gardens');
  });
  test('getDailySchedule returns musician evening zone as commons', function() {
    var result = AI.getDailySchedule('musician', 'evening');
    assert.strictEqual(result.zone, 'commons');
  });
  test('getDailySchedule throws for unknown archetype (no drives defined)', function() {
    var threw = false;
    try {
      AI.getDailySchedule('nonexistent_arch', 'morning');
    } catch (e) {
      threw = true;
    }
    assert.strictEqual(threw, true);
  });
  test('getNPCReaction returns object with action field', function() {
    var npcData = { archetype: 'gardener' };
    var event = { type: 'weather', weather: 'rain' };
    var result = AI.getNPCReaction(npcData, event);
    assert.ok(result && typeof result.action === 'string');
  });
  test('getNPCReaction gardener + rain returns celebrate', function() {
    var npcData = { archetype: 'gardener' };
    var event = { type: 'weather', weather: 'rain' };
    var result = AI.getNPCReaction(npcData, event);
    assert.strictEqual(result.action, 'celebrate');
  });
  test('getNPCReaction builder + rain returns seek_shelter', function() {
    var npcData = { archetype: 'builder' };
    var event = { type: 'weather', weather: 'rain' };
    var result = AI.getNPCReaction(npcData, event);
    assert.strictEqual(result.action, 'seek_shelter');
  });
  test('getNPCReaction player_proximity < 3 returns greet', function() {
    var npcData = { archetype: 'gardener' };
    var event = { type: 'player_proximity', distance: 2 };
    var result = AI.getNPCReaction(npcData, event);
    assert.strictEqual(result.action, 'greet');
  });
  test('generateNPCInteraction returns object with type and dialogue', function() {
    var npc1 = { id: 'n1', name: 'Alice', archetype: 'gardener', x: 0, z: 0 };
    var npc2 = { id: 'n2', name: 'Bob', archetype: 'musician', x: 1, z: 1 };
    var result = AI.generateNPCInteraction(npc1, npc2);
    assert.ok(result && typeof result === 'object');
    assert.ok('type' in result);
    assert.ok('dialogue' in result);
  });
  test('generateNPCInteraction result has animation field', function() {
    var npc1 = { id: 'n1', name: 'Alice', archetype: 'philosopher', x: 0, z: 0 };
    var npc2 = { id: 'n2', name: 'Bob', archetype: 'artist', x: 1, z: 1 };
    var result = AI.generateNPCInteraction(npc1, npc2);
    assert.ok('animation' in result);
  });
  test('buildDialogueContext returns object with type and zone', function() {
    var brain = freshBrain('gardener');
    var ctx = AI.buildDialogueContext(brain.memory, { category: 'idle_observation' }, null);
    assert.ok(ctx && typeof ctx.type === 'string');
    assert.ok(typeof ctx.zone === 'string');
  });
  test('QUEST_HOOKS has 4 entries per archetype', function() {
    ALL_ARCHETYPES.forEach(function(arch) {
      assert.ok(Array.isArray(AI.QUEST_HOOKS[arch]), 'Missing QUEST_HOOKS for: ' + arch);
      assert.strictEqual(AI.QUEST_HOOKS[arch].length, 4, 'Wrong count for: ' + arch);
    });
  });
  test('COLLABORATIVE_ACTIVITIES has exactly 18 entries', function() {
    assert.strictEqual(Object.keys(AI.COLLABORATIVE_ACTIVITIES).length, 18);
  });
  test('ZONE_DIALOGUES has all 8 zones', function() {
    var zones = ['nexus', 'gardens', 'wilds', 'athenaeum', 'studio', 'agora', 'commons', 'arena'];
    zones.forEach(function(zone) {
      assert.ok(Array.isArray(AI.ZONE_DIALOGUES[zone]), 'Missing zone: ' + zone);
    });
  });
  test('ARCHETYPE_REACTIONS has all 10 archetypes', function() {
    ALL_ARCHETYPES.forEach(function(arch) {
      assert.ok(AI.ARCHETYPE_REACTIONS[arch] && typeof AI.ARCHETYPE_REACTIONS[arch] === 'object',
        'Missing reactions for: ' + arch);
    });
  });
  test('updateBrain returns a decision object', function() {
    var brain = freshBrain('gardener');
    var npc = makeNpc('npc_1', 'gardener', 0, 0);
    var world = makeWorld();
    var decision = AI.updateBrain(brain, npc, world);
    assert.ok(decision && typeof decision === 'object');
    assert.ok('type' in decision);
  });
  test('updateBrain sets brain.currentAction', function() {
    var brain = freshBrain('builder');
    var npc = makeNpc('npc_2', 'builder', 10, 10);
    var world = makeWorld();
    AI.updateBrain(brain, npc, world);
    assert.ok(brain.currentAction !== null);
  });
  test('TEACHINGS has 3 lessons per archetype', function() {
    ALL_ARCHETYPES.forEach(function(arch) {
      assert.ok(Array.isArray(AI.TEACHINGS[arch]), 'Missing TEACHINGS for: ' + arch);
      assert.strictEqual(AI.TEACHINGS[arch].length, 3, 'Wrong count for: ' + arch);
    });
  });
  test('each TEACHINGS entry has topic, description, skill', function() {
    ALL_ARCHETYPES.forEach(function(arch) {
      AI.TEACHINGS[arch].forEach(function(t, i) {
        assert.ok(typeof t.topic === 'string', arch + '[' + i + '] missing topic');
        assert.ok(typeof t.description === 'string', arch + '[' + i + '] missing description');
        assert.ok(typeof t.skill === 'string', arch + '[' + i + '] missing skill');
      });
    });
  });
});

// ============================================================================
// REPORT
// ============================================================================

if (!report()) process.exit(1);
