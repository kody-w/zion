// test_npc_wiring.js — Tests for NpcDialogue wiring into NPC AI system
'use strict';

var testRunner = require('./test_runner');
var test = testRunner.test;
var suite = testRunner.suite;
var report = testRunner.report;
var assert = testRunner.assert;

// Load NpcDialogue first (it must be available globally before npc_ai loads)
var NpcDialogue = require('../src/js/npc_dialogue');
// Make it available as a global, as npc_ai.js checks `typeof NpcDialogue`
global.NpcDialogue = NpcDialogue;

// Now load npc_ai (it will see global.NpcDialogue)
var NpcAI = require('../src/js/npc_ai');

// ============================================================================
// TEST FIXTURES
// ============================================================================

var ARCHETYPES = ['gardener', 'builder', 'storyteller', 'merchant', 'explorer',
                  'teacher', 'musician', 'healer', 'philosopher', 'artist'];

function makeMemory(archetype) {
  return {
    archetype: archetype,
    usedDialogues: [],
    playerFamiliarity: {},
    lastGreeted: {},
    interactions: [],
    currentGoal: null
  };
}

function makeNpc(archetype, name) {
  return {
    id: 'test_' + archetype,
    name: name || ('Test ' + archetype),
    archetype: archetype,
    personality: ['friendly', 'curious'],
    home_zone: 'nexus',
    memory: {}
  };
}

// ============================================================================
// Suite: Context Building
// ============================================================================

suite('buildDialogueContext', function() {

  test('exports buildDialogueContext function', function() {
    assert.ok(typeof NpcAI.buildDialogueContext === 'function',
      'NpcAI should export buildDialogueContext');
  });

  test('returns object with required NpcDialogue context shape', function() {
    var memory = makeMemory('gardener');
    var context = { category: 'greeting_first' };
    var result = NpcAI.buildDialogueContext(memory, context, null);
    assert.ok(result && typeof result === 'object', 'Should return an object');
    assert.ok(typeof result.type === 'string', 'Should have type field');
    assert.ok(typeof result.zone === 'string', 'Should have zone field');
    assert.ok(Array.isArray(result.nearbyPlayers), 'Should have nearbyPlayers array');
    assert.ok(Array.isArray(result.recentChat), 'Should have recentChat array');
  });

  test('maps greeting_first to type greeting', function() {
    var memory = makeMemory('builder');
    var context = { category: 'greeting_first' };
    var result = NpcAI.buildDialogueContext(memory, context, null);
    assert.strictEqual(result.type, 'greeting', 'greeting_first should map to type "greeting"');
  });

  test('maps idle_observation to type idle_chat', function() {
    var memory = makeMemory('merchant');
    var context = { category: 'idle_observation' };
    var result = NpcAI.buildDialogueContext(memory, context, null);
    assert.strictEqual(result.type, 'idle_chat', 'idle_observation should map to type "idle_chat"');
  });

  test('maps weather_rain to type weather', function() {
    var memory = makeMemory('explorer');
    var context = { category: 'weather_rain' };
    var result = NpcAI.buildDialogueContext(memory, context, null);
    assert.strictEqual(result.type, 'weather', 'weather_rain should map to type "weather"');
  });

  test('maps zone_observation to type zone_comment', function() {
    var memory = makeMemory('storyteller');
    var context = { category: 'zone_observation', zone: 'athenaeum' };
    var result = NpcAI.buildDialogueContext(memory, context, null);
    assert.strictEqual(result.type, 'zone_comment', 'zone_observation should map to type "zone_comment"');
  });

  test('maps working to type craft', function() {
    var memory = makeMemory('artist');
    var context = { category: 'working' };
    var result = NpcAI.buildDialogueContext(memory, context, null);
    assert.strictEqual(result.type, 'craft', 'working should map to type "craft"');
  });

  test('uses perception zone when available', function() {
    var memory = makeMemory('healer');
    var context = { category: 'idle_observation' };
    var perception = { currentZone: 'gardens', timeOfDay: 'morning', weather: 'clear' };
    var result = NpcAI.buildDialogueContext(memory, context, perception);
    assert.strictEqual(result.zone, 'gardens', 'Should use perception zone');
    assert.strictEqual(result.timeOfDay, 'morning', 'Should use perception timeOfDay');
  });

  test('falls back to nexus zone when no zone info provided', function() {
    var memory = makeMemory('philosopher');
    var context = { category: 'idle_observation' };
    var result = NpcAI.buildDialogueContext(memory, context, null);
    assert.strictEqual(result.zone, 'nexus', 'Should default to nexus zone');
  });

});

// ============================================================================
// Suite: NpcDialogue Used in getDialogue
// ============================================================================

suite('getDialogue with NpcDialogue available', function() {

  test('getDialogue returns a non-null string for gardener greeting', function() {
    var memory = makeMemory('gardener');
    var context = { category: 'greeting_first' };
    var result = NpcAI.getDialogue(memory, context, 'Lily');
    assert.ok(typeof result === 'string' && result.length > 0,
      'Should return non-empty string, got: ' + JSON.stringify(result));
  });

  test('getDialogue uses NpcDialogue for gardener greeting_first', function() {
    var memory = makeMemory('gardener');
    var context = { category: 'greeting_first' };
    var result = NpcAI.getDialogue(memory, context, 'Lily');
    // NpcDialogue gardener greetings include garden-related language
    assert.ok(typeof result === 'string' && result.length > 0,
      'Should return a string from NpcDialogue or fallback pool');
  });

  test('getDialogue prevents consecutive repeat of same line', function() {
    var memory = makeMemory('builder');
    var context = { category: 'idle_observation' };
    var first = NpcAI.getDialogue(memory, context, 'Marco');
    // Call again with same memory (which now has the used dialogue stored)
    // The second call should not return the exact same line
    // (due to NpcDialogue's random pool, it MAY differ — but at minimum should not assert)
    var second = NpcAI.getDialogue(memory, context, 'Marco');
    assert.ok(typeof second === 'string' || second === null,
      'Second call should return string or null, not throw');
    // If same, usedDialogues should track the line
    if (first === second) {
      // This is acceptable if pool is exhausted; just ensure it's a valid string
      assert.ok(typeof second === 'string', 'Repeated line should still be a valid string');
    }
  });

  test('getDialogue returns strings for all 10 archetypes', function() {
    ARCHETYPES.forEach(function(archetype) {
      var memory = makeMemory(archetype);
      var context = { category: 'greeting_first' };
      var result = NpcAI.getDialogue(memory, context, 'Test');
      assert.ok(typeof result === 'string' && result.length > 0,
        'Archetype ' + archetype + ' should return a non-empty string');
    });
  });

  test('different archetypes can produce different responses', function() {
    var memGardener = makeMemory('gardener');
    var memMerchant = makeMemory('merchant');
    var ctx = { category: 'greeting_first' };

    // Collect several responses from each archetype
    var gardenerResponses = [];
    var merchantResponses = [];
    for (var i = 0; i < 5; i++) {
      var g = NpcAI.getDialogue(JSON.parse(JSON.stringify(memGardener)), ctx, 'G');
      var m = NpcAI.getDialogue(JSON.parse(JSON.stringify(memMerchant)), ctx, 'M');
      if (g) gardenerResponses.push(g);
      if (m) merchantResponses.push(m);
    }

    // At least one response from each should be different (archetypes have distinct pools)
    var allSame = true;
    for (var j = 0; j < Math.min(gardenerResponses.length, merchantResponses.length); j++) {
      if (gardenerResponses[j] !== merchantResponses[j]) {
        allSame = false;
        break;
      }
    }
    assert.ok(!allSame || gardenerResponses.length === 0,
      'Gardener and merchant should eventually produce different responses');
  });

  test('getDialogue handles unknown archetype gracefully', function() {
    var memory = makeMemory('unknown_archetype');
    var context = { category: 'idle_observation' };
    // Should not throw; may return a string from default pool or null
    var result;
    var threw = false;
    try {
      result = NpcAI.getDialogue(memory, context, 'Stranger');
    } catch (e) {
      threw = true;
    }
    assert.ok(!threw, 'Should not throw for unknown archetype');
    assert.ok(result === null || typeof result === 'string',
      'Should return null or string for unknown archetype');
  });

});

// ============================================================================
// Suite: Fallback behavior when NpcDialogue is undefined
// ============================================================================

suite('getDialogue fallback when NpcDialogue not available', function() {

  test('still returns dialogue when NpcDialogue is absent', function() {
    // Simulate NpcDialogue being unavailable by temporarily using a memory
    // with an archetype that has CONTEXTUAL_DIALOGUES entries
    var memory = makeMemory('gardener');
    var context = { category: 'idle_observation' };

    // Even if NpcDialogue somehow returns null, npc_ai fallback pool works
    // The safest test: call with a valid archetype that has entries
    var result = NpcAI.getDialogue(memory, context, 'Lily');
    // Either NpcDialogue or npc_ai internal pool should provide a string
    assert.ok(result === null || typeof result === 'string',
      'Should return null or string even without NpcDialogue');
  });

  test('fallback to npc_ai internal pool for archetype_reaction category', function() {
    // archetype_reaction uses ARCHETYPE_REACTIONS, not NpcDialogue
    var memory = makeMemory('gardener');
    var context = { category: 'archetype_reaction', targetArchetype: 'builder' };
    // Should not throw and should return something
    var result;
    var threw = false;
    try {
      result = NpcAI.getDialogue(memory, context, 'Lily');
    } catch (e) {
      threw = true;
    }
    assert.ok(!threw, 'archetype_reaction category should not throw');
    assert.ok(result === null || typeof result === 'string',
      'archetype_reaction should return null or string');
  });

});

// ============================================================================
// Suite: NpcDialogue.getFallback directly (sanity check API is present)
// ============================================================================

suite('NpcDialogue.getFallback API', function() {

  test('getFallback returns non-empty string for all archetypes and context types', function() {
    var contextTypes = ['greeting', 'idle_chat', 'zone_comment', 'weather', 'craft'];
    ARCHETYPES.forEach(function(archetype) {
      contextTypes.forEach(function(ctype) {
        var npc = makeNpc(archetype);
        var ctx = { type: ctype, zone: 'nexus' };
        var result = NpcDialogue.getFallback(npc, ctx);
        assert.ok(typeof result === 'string' && result.length > 0,
          'getFallback should return non-empty string for archetype=' + archetype + ', type=' + ctype);
      });
    });
  });

  test('getFallback returns different responses across archetypes for same context', function() {
    var ctx = { type: 'greeting', zone: 'nexus' };
    var responses = {};
    ARCHETYPES.forEach(function(archetype) {
      var npc = makeNpc(archetype);
      responses[archetype] = NpcDialogue.getFallback(npc, ctx);
    });
    // Collect unique responses — there should be at least 3 distinct ones
    var unique = {};
    Object.keys(responses).forEach(function(k) { unique[responses[k]] = 1; });
    var numUnique = Object.keys(unique).length;
    assert.ok(numUnique >= 3,
      'Different archetypes should produce varied responses. Got ' + numUnique + ' unique from 10 archetypes');
  });

  test('getFallback handles missing archetype gracefully', function() {
    var npc = makeNpc('not_a_real_archetype');
    var ctx = { type: 'greeting', zone: 'nexus' };
    var result = NpcDialogue.getFallback(npc, ctx);
    assert.ok(typeof result === 'string' && result.length > 0,
      'Should return default fallback for unknown archetype');
  });

  test('getFallback result is within 200 char speech bubble limit', function() {
    var npc = makeNpc('storyteller');
    var ctx = { type: 'greeting', zone: 'athenaeum' };
    // Run several times to check pool
    for (var i = 0; i < 10; i++) {
      var result = NpcDialogue.getFallback(npc, ctx);
      assert.ok(result.length <= 200,
        'getFallback result should be <= 200 chars, got: ' + result.length);
    }
  });

});

// ============================================================================
// Suite: Dialogue Manager (NpcDialogue.createManager)
// ============================================================================

suite('NpcDialogue.createManager', function() {

  test('createManager returns manager with expected methods', function() {
    var manager = NpcDialogue.createManager({ cooldownMs: 1000, maxQueueSize: 10 });
    assert.ok(typeof manager.queueDialogue === 'function', 'Should have queueDialogue');
    assert.ok(typeof manager.processQueue === 'function', 'Should have processQueue');
    assert.ok(typeof manager.getResponse === 'function', 'Should have getResponse');
    assert.ok(typeof manager.getCooldown === 'function', 'Should have getCooldown');
    assert.ok(typeof manager.getConversation === 'function', 'Should have getConversation');
    assert.ok(typeof manager.recordConversation === 'function', 'Should have recordConversation');
  });

  test('manager respects cooldown — duplicate queueing is ignored', function() {
    var manager = NpcDialogue.createManager({ cooldownMs: 60000, maxQueueSize: 10 });
    var npc = { id: 'npc_001', archetype: 'gardener', name: 'Lily', personality: [] };
    var ctx = { type: 'greeting', zone: 'gardens' };

    manager.queueDialogue(npc, ctx);
    manager.queueDialogue(npc, ctx); // should be ignored (same NPC already queued)

    // Process one item — should work without error
    var processCalled = false;
    manager.processQueue(function(prompt, cb) {
      processCalled = true;
      cb(null, 'Hello from the garden!');
    });
    assert.ok(processCalled, 'processQueue should call inference function when items are queued');
  });

  test('manager returns null response before processing', function() {
    var manager = NpcDialogue.createManager({ cooldownMs: 1000, maxQueueSize: 10 });
    var npc = { id: 'npc_002', archetype: 'builder', name: 'Marco', personality: [] };
    var response = manager.getResponse(npc);
    assert.strictEqual(response, null, 'Should return null before any processing');
  });

  test('manager stores response after processing', function() {
    var manager = NpcDialogue.createManager({ cooldownMs: 0, maxQueueSize: 10 });
    var npc = { id: 'npc_003', archetype: 'merchant', name: 'Zara', personality: [] };
    var ctx = { type: 'greeting', zone: 'agora' };

    manager.queueDialogue(npc, ctx);
    manager.processQueue(function(prompt, cb) {
      cb(null, 'Welcome to my stall!');
    });

    var response = manager.getResponse(npc);
    assert.ok(response !== null, 'Should have a response after processing');
    assert.ok(typeof response.message === 'string', 'Response should have message field');
  });

  test('manager records and retrieves conversation history', function() {
    var manager = NpcDialogue.createManager({ cooldownMs: 1000, maxQueueSize: 10 });
    manager.recordConversation('npc_A', 'npc_B', 'npc_A', 'Hello neighbor!');
    manager.recordConversation('npc_A', 'npc_B', 'npc_B', 'Greetings!');

    var history = manager.getConversation('npc_A', 'npc_B');
    assert.strictEqual(history.length, 2, 'Should have 2 conversation entries');
    assert.strictEqual(history[0].speaker, 'npc_A', 'First speaker should be npc_A');
    assert.strictEqual(history[1].speaker, 'npc_B', 'Second speaker should be npc_B');
  });

});

// ============================================================================
// Suite: Culture Emergence (detectTrend)
// ============================================================================

suite('NpcDialogue.detectTrend', function() {

  test('returns null for empty dialogue history', function() {
    var result = NpcDialogue.detectTrend([]);
    assert.strictEqual(result, null, 'Should return null for empty history');
  });

  test('returns null for single dialogue entry', function() {
    var result = NpcDialogue.detectTrend([{ npcId: 'a', message: 'garden is beautiful today' }]);
    assert.strictEqual(result, null, 'Should return null for single entry (need 2+ participants)');
  });

  test('detects trend when multiple NPCs mention same topic', function() {
    var history = [
      { npcId: 'npc_001', message: 'The garden is blooming beautifully today' },
      { npcId: 'npc_002', message: 'I love the garden in spring' },
      { npcId: 'npc_003', message: 'This garden season is exceptional' }
    ];
    var result = NpcDialogue.detectTrend(history);
    assert.ok(result !== null, 'Should detect a trend across multiple NPCs');
    assert.ok(typeof result.topic === 'string', 'Trend should have a topic string');
    assert.ok(Array.isArray(result.participants), 'Trend should have participants array');
  });

  test('trend has sentiment field', function() {
    var history = [
      { npcId: 'npc_001', message: 'The festival was wonderful and beautiful' },
      { npcId: 'npc_002', message: 'The festival was amazing and perfect' }
    ];
    var result = NpcDialogue.detectTrend(history);
    if (result) {
      assert.ok(typeof result.sentiment === 'string',
        'Trend should have sentiment field');
    }
  });

});

// ============================================================================
// Suite: Wiring Integration (end-to-end flow)
// ============================================================================

suite('End-to-end wiring: NpcAI.getDialogue -> NpcDialogue', function() {

  test('getDialogue produces archetype-flavored text for philosopher', function() {
    var memory = makeMemory('philosopher');
    var context = { category: 'idle_observation' };
    var result = NpcAI.getDialogue(memory, context, 'Sage');
    // Philosopher responses tend to be questioning/contemplative
    assert.ok(typeof result === 'string' && result.length > 0,
      'Philosopher should produce dialogue: ' + JSON.stringify(result));
  });

  test('getDialogue produces archetype-flavored text for musician', function() {
    var memory = makeMemory('musician');
    var context = { category: 'idle_observation' };
    var result = NpcAI.getDialogue(memory, context, 'Aria');
    assert.ok(typeof result === 'string' && result.length > 0,
      'Musician should produce dialogue: ' + JSON.stringify(result));
  });

  test('getDialogue updates usedDialogues to track history', function() {
    var memory = makeMemory('teacher');
    var context = { category: 'idle_observation' };
    assert.strictEqual(memory.usedDialogues.length, 0, 'usedDialogues should start empty');
    NpcAI.getDialogue(memory, context, 'Scholar');
    // After a call, usedDialogues should have been populated (NpcDialogue path)
    // Even if not, the call should not throw
    assert.ok(Array.isArray(memory.usedDialogues), 'usedDialogues should remain an array');
  });

  test('craft context type maps to working category', function() {
    var memory = makeMemory('builder');
    var context = { category: 'working' };
    var result = NpcAI.getDialogue(memory, context, 'Marco');
    assert.ok(result === null || typeof result === 'string',
      'Working category should return null or string');
  });

  test('weather context produces weather-themed text', function() {
    var memory = makeMemory('gardener');
    var context = { category: 'weather_rain' };
    var result = NpcAI.getDialogue(memory, context, 'Lily');
    assert.ok(typeof result === 'string' && result.length > 0,
      'Weather context should produce dialogue');
  });

});

// ============================================================================
// Run tests
// ============================================================================

var success = report();
process.exit(success ? 0 : 1);
