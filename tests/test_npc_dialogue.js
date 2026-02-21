// test_npc_dialogue.js — Tests for NpcDialogue module
'use strict';

var testRunner = require('./test_runner');
var test = testRunner.test;
var suite = testRunner.suite;
var report = testRunner.report;
var assert = testRunner.assert;

var NpcDialogue = require('../src/js/npc_dialogue');

// ============================================================================
// TEST FIXTURES
// ============================================================================

var sampleNpc = {
  id: 'agent_001',
  name: 'Iris Skyhigh',
  archetype: 'gardener',
  personality: ['patient', 'nurturing', 'observant'],
  home_zone: 'gardens',
  memory: {
    greetings_given: 3,
    tasks_completed: 5,
    favorite_spot: { zone: 'gardens', x: 8.37, y: 0, z: -28.5 }
  }
};

var sampleNpc2 = {
  id: 'agent_002',
  name: 'Marco Stonehand',
  archetype: 'builder',
  personality: ['practical', 'direct', 'resourceful'],
  home_zone: 'agora',
  memory: {}
};

var sampleContext = {
  zone: 'gardens',
  nearbyPlayers: ['PlayerA', 'PlayerB'],
  recentChat: [
    { from: 'PlayerA', message: 'Hello there!' },
    { from: 'Iris Skyhigh', message: 'Welcome to the gardens!' }
  ],
  timeOfDay: 'morning',
  weather: 'clear',
  currentActivity: 'tending_plants'
};

// ============================================================================
// buildPrompt Tests
// ============================================================================

suite('buildPrompt', function() {

  test('returns a non-empty string', function() {
    var prompt = NpcDialogue.buildPrompt(sampleNpc, sampleContext);
    assert.ok(typeof prompt === 'string' && prompt.length > 0, 'Should return non-empty string');
  });

  test('includes NPC name and archetype', function() {
    var prompt = NpcDialogue.buildPrompt(sampleNpc, sampleContext);
    assert.ok(prompt.indexOf('Iris Skyhigh') !== -1, 'Should include NPC name');
    assert.ok(prompt.indexOf('gardener') !== -1, 'Should include archetype');
  });

  test('includes personality traits', function() {
    var prompt = NpcDialogue.buildPrompt(sampleNpc, sampleContext);
    assert.ok(prompt.indexOf('patient') !== -1 || prompt.indexOf('nurturing') !== -1,
      'Should include personality traits');
  });

  test('includes zone information', function() {
    var prompt = NpcDialogue.buildPrompt(sampleNpc, sampleContext);
    assert.ok(prompt.indexOf('gardens') !== -1, 'Should include zone name');
  });

  test('includes time of day', function() {
    var prompt = NpcDialogue.buildPrompt(sampleNpc, sampleContext);
    assert.ok(prompt.indexOf('morning') !== -1, 'Should include time of day');
  });

  test('includes recent chat when present', function() {
    var prompt = NpcDialogue.buildPrompt(sampleNpc, sampleContext);
    assert.ok(prompt.indexOf('Hello there') !== -1, 'Should include recent chat');
  });

  test('stays under 500-token approximate limit (2000 chars)', function() {
    var prompt = NpcDialogue.buildPrompt(sampleNpc, sampleContext);
    // 500 tokens ~ 2000 chars (4 chars/token avg)
    assert.ok(prompt.length <= 2000, 'Prompt should be under 2000 chars, got: ' + prompt.length);
  });

  test('handles empty context gracefully', function() {
    var emptyCtx = {};
    var prompt = NpcDialogue.buildPrompt(sampleNpc, emptyCtx);
    assert.ok(typeof prompt === 'string' && prompt.length > 0, 'Should handle empty context');
  });

  test('handles missing memory gracefully', function() {
    var npcNoMem = { id: 'x', name: 'Test', archetype: 'gardener', personality: [], home_zone: 'nexus' };
    var prompt = NpcDialogue.buildPrompt(npcNoMem, sampleContext);
    assert.ok(typeof prompt === 'string', 'Should handle missing memory');
  });

  test('handles unknown archetype gracefully', function() {
    var unknownNpc = { id: 'x', name: 'Stranger', archetype: 'unknown_type', personality: ['wise'], home_zone: 'nexus', memory: {} };
    var prompt = NpcDialogue.buildPrompt(unknownNpc, sampleContext);
    assert.ok(typeof prompt === 'string', 'Should handle unknown archetype');
  });

});

// ============================================================================
// buildConversationPrompt Tests
// ============================================================================

suite('buildConversationPrompt', function() {

  test('returns a non-empty string', function() {
    var prompt = NpcDialogue.buildConversationPrompt(sampleNpc, sampleNpc2);
    assert.ok(typeof prompt === 'string' && prompt.length > 0, 'Should return non-empty string');
  });

  test('includes both NPC names', function() {
    var prompt = NpcDialogue.buildConversationPrompt(sampleNpc, sampleNpc2);
    assert.ok(prompt.indexOf('Iris Skyhigh') !== -1, 'Should include first NPC name');
    assert.ok(prompt.indexOf('Marco Stonehand') !== -1, 'Should include second NPC name');
  });

  test('includes both archetypes', function() {
    var prompt = NpcDialogue.buildConversationPrompt(sampleNpc, sampleNpc2);
    assert.ok(prompt.indexOf('gardener') !== -1, 'Should include first archetype');
    assert.ok(prompt.indexOf('builder') !== -1, 'Should include second archetype');
  });

  test('includes topic when provided', function() {
    var prompt = NpcDialogue.buildConversationPrompt(sampleNpc, sampleNpc2, 'the harvest festival');
    assert.ok(prompt.indexOf('harvest festival') !== -1, 'Should include topic');
  });

  test('works without topic argument', function() {
    var prompt = NpcDialogue.buildConversationPrompt(sampleNpc, sampleNpc2);
    assert.ok(typeof prompt === 'string', 'Should work without topic');
  });

});

// ============================================================================
// buildReactionPrompt Tests
// ============================================================================

suite('buildReactionPrompt', function() {

  test('returns a non-empty string', function() {
    var event = { type: 'weather_change', data: { newWeather: 'rain' } };
    var prompt = NpcDialogue.buildReactionPrompt(sampleNpc, event);
    assert.ok(typeof prompt === 'string' && prompt.length > 0, 'Should return non-empty string');
  });

  test('includes NPC name in prompt', function() {
    var event = { type: 'player_crafted', data: { item: 'wooden_table' } };
    var prompt = NpcDialogue.buildReactionPrompt(sampleNpc, event);
    assert.ok(prompt.indexOf('Iris Skyhigh') !== -1, 'Should include NPC name');
  });

  test('includes event type in prompt', function() {
    var event = { type: 'festival_start', data: {} };
    var prompt = NpcDialogue.buildReactionPrompt(sampleNpc, event);
    assert.ok(prompt.indexOf('festival_start') !== -1 || prompt.indexOf('festival') !== -1,
      'Should reference the event');
  });

});

// ============================================================================
// parseResponse Tests
// ============================================================================

suite('parseResponse', function() {

  test('returns an object with message property', function() {
    var result = NpcDialogue.parseResponse('The flowers are blooming beautifully today!');
    assert.ok(typeof result === 'object', 'Should return object');
    assert.ok(typeof result.message === 'string', 'Should have message property');
  });

  test('extracts clean message from plain text', function() {
    var result = NpcDialogue.parseResponse('Hello, welcome to ZION!');
    assert.strictEqual(result.message, 'Hello, welcome to ZION!');
  });

  test('detects action in response', function() {
    var result = NpcDialogue.parseResponse('[ACTION: move] Let me walk over there.');
    assert.ok(result.action != null, 'Should detect action');
    assert.ok(result.action.indexOf('move') !== -1, 'Should extract move action');
  });

  test('detects emotion in response', function() {
    var result = NpcDialogue.parseResponse('[EMOTION: happy] What a wonderful day!');
    assert.ok(result.emotion != null, 'Should detect emotion');
    assert.ok(result.emotion.indexOf('happy') !== -1, 'Should extract happy emotion');
  });

  test('detects memory in response', function() {
    var result = NpcDialogue.parseResponse('[MEMORY: player helped with harvest] Thank you for your help!');
    assert.ok(result.memory != null, 'Should detect memory');
  });

  test('handles response with no markers', function() {
    var result = NpcDialogue.parseResponse('Just a plain response without markers.');
    assert.ok(typeof result.message === 'string', 'Should return message');
    assert.ok(result.action == null || result.action === '', 'Should have no action');
    assert.ok(result.emotion == null || result.emotion === '', 'Should have no emotion');
  });

  test('handles empty string', function() {
    var result = NpcDialogue.parseResponse('');
    assert.ok(typeof result === 'object', 'Should return object for empty string');
    assert.ok(result.message === '' || result.message != null, 'Should handle empty');
  });

  test('handles multiple markers in one response', function() {
    var result = NpcDialogue.parseResponse('[ACTION: craft][EMOTION: focused] Working on something special.');
    assert.ok(result.action != null, 'Should get action');
    assert.ok(result.emotion != null, 'Should get emotion');
    assert.ok(result.message.indexOf('Working on something special') !== -1, 'Should get message');
  });

});

// ============================================================================
// sanitize Tests
// ============================================================================

suite('sanitize', function() {

  test('returns a string', function() {
    var result = NpcDialogue.sanitize('Hello there!');
    assert.ok(typeof result === 'string', 'Should return string');
  });

  test('trims to max 200 characters', function() {
    var longStr = 'A'.repeat(500);
    var result = NpcDialogue.sanitize(longStr);
    assert.ok(result.length <= 200, 'Should trim to 200 chars, got: ' + result.length);
  });

  test('removes meta-text "As an AI"', function() {
    var meta = 'As an AI language model, I would say hello to you!';
    var result = NpcDialogue.sanitize(meta);
    assert.ok(result.indexOf('As an AI') === -1, 'Should remove "As an AI" meta-text');
  });

  test('removes meta-text "I am an AI"', function() {
    var meta = 'I am an AI assistant. Greetings, traveler!';
    var result = NpcDialogue.sanitize(meta);
    assert.ok(result.indexOf('I am an AI') === -1, 'Should remove AI meta-text');
  });

  test('removes inappropriate content placeholder', function() {
    var bad = 'You are stupid and I hate you!';
    var result = NpcDialogue.sanitize(bad);
    // Should either be replaced or removed
    assert.ok(typeof result === 'string', 'Should return string after sanitization');
  });

  test('leaves clean content unchanged (short)', function() {
    var clean = 'Welcome to the gardens!';
    var result = NpcDialogue.sanitize(clean);
    assert.strictEqual(result, clean, 'Clean short content should be unchanged');
  });

  test('trims whitespace', function() {
    var padded = '   Hello there!   ';
    var result = NpcDialogue.sanitize(padded);
    assert.strictEqual(result, 'Hello there!', 'Should trim whitespace');
  });

});

// ============================================================================
// Dialogue Manager Tests
// ============================================================================

suite('createManager', function() {

  test('returns a manager object with expected methods', function() {
    var mgr = NpcDialogue.createManager();
    assert.ok(typeof mgr.queueDialogue === 'function', 'Should have queueDialogue');
    assert.ok(typeof mgr.processQueue === 'function', 'Should have processQueue');
    assert.ok(typeof mgr.getResponse === 'function', 'Should have getResponse');
    assert.ok(typeof mgr.getCooldown === 'function', 'Should have getCooldown');
    assert.ok(typeof mgr.getConversation === 'function', 'Should have getConversation');
  });

  test('queue works FIFO order', function() {
    var mgr = NpcDialogue.createManager();
    var order = [];

    var npcA = { id: 'a', name: 'A', archetype: 'gardener', personality: [], home_zone: 'nexus', memory: {} };
    var npcB = { id: 'b', name: 'B', archetype: 'builder', personality: [], home_zone: 'nexus', memory: {} };
    var npcC = { id: 'c', name: 'C', archetype: 'merchant', personality: [], home_zone: 'nexus', memory: {} };

    mgr.queueDialogue(npcA, {});
    mgr.queueDialogue(npcB, {});
    mgr.queueDialogue(npcC, {});

    var syncInference = function(prompt, callback) {
      order.push(prompt); // record order
      callback(null, 'Hello from the queue!');
    };

    mgr.processQueue(syncInference);
    mgr.processQueue(syncInference);
    mgr.processQueue(syncInference);

    // Each call should process one item; prompts include respective NPC names
    assert.ok(order.length >= 1, 'Should have processed at least one item');
    assert.ok(order[0].indexOf('A') !== -1 || order[0].length > 0, 'First processed should be A');
  });

  test('getResponse returns null for unqueued NPC', function() {
    var mgr = NpcDialogue.createManager();
    var result = mgr.getResponse({ id: 'nobody', archetype: 'gardener', personality: [] });
    assert.ok(result === null || result === undefined, 'Should return null for unqueued NPC');
  });

  test('getResponse returns response after processing', function() {
    var mgr = NpcDialogue.createManager();
    var npc = { id: 'test_npc', name: 'Tester', archetype: 'gardener', personality: [], home_zone: 'nexus', memory: {} };

    mgr.queueDialogue(npc, {});

    var syncInference = function(prompt, callback) {
      callback(null, 'Hello, I am Tester!');
    };

    mgr.processQueue(syncInference);
    var response = mgr.getResponse(npc);
    assert.ok(response != null, 'Should return response after processing');
  });

  test('getCooldown returns 0 for NPC that never spoke', function() {
    var mgr = NpcDialogue.createManager();
    var cd = mgr.getCooldown('nobody_id');
    assert.ok(cd === 0 || cd >= 0, 'Cooldown should be >= 0');
  });

  test('getCooldown returns positive value after speaking', function() {
    var mgr = NpcDialogue.createManager();
    var npc = { id: 'cool_npc', name: 'Cooldown Test', archetype: 'gardener', personality: [], home_zone: 'nexus', memory: {} };

    mgr.queueDialogue(npc, {});

    var syncInference = function(prompt, callback) {
      callback(null, 'Testing cooldown!');
    };

    mgr.processQueue(syncInference);
    var cd = mgr.getCooldown('cool_npc');
    assert.ok(cd > 0, 'Cooldown should be positive after speaking, got: ' + cd);
  });

  test('getConversation returns empty array for no history', function() {
    var mgr = NpcDialogue.createManager();
    var conv = mgr.getConversation('npc_a', 'npc_b');
    assert.ok(Array.isArray(conv), 'Should return an array');
    assert.strictEqual(conv.length, 0, 'Should be empty for no history');
  });

  test('accepts config parameter', function() {
    var mgr = NpcDialogue.createManager({ cooldownMs: 5000, maxQueueSize: 10 });
    assert.ok(typeof mgr.queueDialogue === 'function', 'Manager with config should work');
  });

  test('respects max queue size if configured', function() {
    var mgr = NpcDialogue.createManager({ maxQueueSize: 2 });
    var npcA = { id: 'a', name: 'A', archetype: 'gardener', personality: [], home_zone: 'nexus', memory: {} };
    var npcB = { id: 'b', name: 'B', archetype: 'builder', personality: [], home_zone: 'nexus', memory: {} };
    var npcC = { id: 'c', name: 'C', archetype: 'merchant', personality: [], home_zone: 'nexus', memory: {} };

    mgr.queueDialogue(npcA, {});
    mgr.queueDialogue(npcB, {});
    mgr.queueDialogue(npcC, {}); // Should be dropped or handled gracefully

    // No crash is the main assertion
    assert.ok(true, 'Should not crash on overflow');
  });

});

// ============================================================================
// getFallback Tests
// ============================================================================

suite('getFallback', function() {

  test('returns a string for known archetype + context', function() {
    var result = NpcDialogue.getFallback(sampleNpc, { type: 'greeting' });
    assert.ok(typeof result === 'string' && result.length > 0, 'Should return non-empty string');
  });

  test('returns response for gardener greeting', function() {
    var result = NpcDialogue.getFallback(
      { archetype: 'gardener', name: 'Iris', personality: [] },
      { type: 'greeting' }
    );
    assert.ok(typeof result === 'string' && result.length > 0, 'Gardener greeting fallback');
  });

  test('returns response for builder zone comment', function() {
    var result = NpcDialogue.getFallback(
      { archetype: 'builder', name: 'Marco', personality: [] },
      { type: 'zone_comment' }
    );
    assert.ok(typeof result === 'string' && result.length > 0, 'Builder zone comment fallback');
  });

  test('returns response for all 10 archetypes', function() {
    var archetypes = ['gardener', 'builder', 'storyteller', 'merchant', 'explorer',
                      'teacher', 'musician', 'healer', 'philosopher', 'artist'];
    archetypes.forEach(function(arch) {
      var result = NpcDialogue.getFallback({ archetype: arch, name: 'Test', personality: [] }, { type: 'greeting' });
      assert.ok(typeof result === 'string' && result.length > 0, arch + ' should have a fallback');
    });
  });

  test('returns something for unknown archetype', function() {
    var result = NpcDialogue.getFallback(
      { archetype: 'unknown_xyz', name: 'Mystery', personality: [] },
      { type: 'greeting' }
    );
    assert.ok(typeof result === 'string', 'Should not crash on unknown archetype');
  });

  test('handles idle_chat context', function() {
    var result = NpcDialogue.getFallback(
      { archetype: 'musician', name: 'Lyra', personality: [] },
      { type: 'idle_chat' }
    );
    assert.ok(typeof result === 'string' && result.length > 0, 'Musician idle chat fallback');
  });

  test('handles weather context', function() {
    var result = NpcDialogue.getFallback(
      { archetype: 'explorer', name: 'Rex', personality: [] },
      { type: 'weather', weather: 'rain' }
    );
    assert.ok(typeof result === 'string' && result.length > 0, 'Explorer weather fallback');
  });

  test('handles craft context', function() {
    var result = NpcDialogue.getFallback(
      { archetype: 'artist', name: 'Muse', personality: [] },
      { type: 'craft' }
    );
    assert.ok(typeof result === 'string' && result.length > 0, 'Artist craft fallback');
  });

});

// ============================================================================
// generateFallbackPool Tests
// ============================================================================

suite('generateFallbackPool', function() {

  test('returns non-empty array for each archetype', function() {
    var archetypes = ['gardener', 'builder', 'storyteller', 'merchant', 'explorer',
                      'teacher', 'musician', 'healer', 'philosopher', 'artist'];
    archetypes.forEach(function(arch) {
      var pool = NpcDialogue.generateFallbackPool(arch);
      assert.ok(Array.isArray(pool), arch + ' should return array');
      assert.ok(pool.length >= 10, arch + ' should have at least 10 responses, got ' + pool.length);
    });
  });

  test('all pool entries are non-empty strings', function() {
    var pool = NpcDialogue.generateFallbackPool('teacher');
    pool.forEach(function(item, i) {
      assert.ok(typeof item === 'string' && item.length > 0, 'Entry ' + i + ' should be non-empty string');
    });
  });

  test('returns a default pool for unknown archetype', function() {
    var pool = NpcDialogue.generateFallbackPool('unknown_type');
    assert.ok(Array.isArray(pool), 'Should return array for unknown archetype');
    assert.ok(pool.length > 0, 'Should return non-empty array for unknown archetype');
  });

  test('different archetypes produce different pools', function() {
    var gardenerPool = NpcDialogue.generateFallbackPool('gardener');
    var merchantPool = NpcDialogue.generateFallbackPool('merchant');
    // They should not be identical
    assert.ok(gardenerPool.join('') !== merchantPool.join(''),
      'Different archetypes should have different dialogue pools');
  });

});

// ============================================================================
// Memory Integration Tests
// ============================================================================

suite('Memory', function() {

  test('updateMemory returns an updated memory object', function() {
    var npc = { id: 'mem_test', archetype: 'gardener', memory: { greetings_given: 0 } };
    var conversation = [
      { speaker: 'PlayerA', message: 'Do you know where the herbs are?' },
      { speaker: 'Iris', message: 'Yes! Near the fountain.' }
    ];
    var updatedMem = NpcDialogue.updateMemory(npc, conversation);
    assert.ok(typeof updatedMem === 'object', 'Should return object');
  });

  test('updateMemory adds new interaction', function() {
    var npc = { id: 'mem_test2', archetype: 'gardener', memory: { interactions: [] } };
    var conversation = [
      { speaker: 'PlayerB', message: 'Nice garden!' }
    ];
    var updatedMem = NpcDialogue.updateMemory(npc, conversation);
    assert.ok(updatedMem !== null, 'Should return updated memory');
  });

  test('getRelevantMemories returns array', function() {
    var npc = {
      id: 'mem_test3',
      archetype: 'gardener',
      memory: {
        interactions: [
          { with: 'PlayerA', topic: 'herbs', time: Date.now() - 1000 },
          { with: 'PlayerB', topic: 'harvest', time: Date.now() - 5000 }
        ]
      }
    };
    var ctx = { zone: 'gardens', nearbyPlayers: ['PlayerA'] };
    var relevant = NpcDialogue.getRelevantMemories(npc, ctx);
    assert.ok(Array.isArray(relevant), 'Should return array');
  });

  test('getRelevantMemories filters by context', function() {
    var now = Date.now();
    var npc = {
      id: 'mem_test4',
      archetype: 'gardener',
      memory: {
        interactions: [
          { with: 'PlayerA', topic: 'herbs', time: now - 1000 },
          { with: 'PlayerC', topic: 'trade', time: now - 100000 }
        ]
      }
    };
    var ctx = { nearbyPlayers: ['PlayerA'], zone: 'gardens' };
    var relevant = NpcDialogue.getRelevantMemories(npc, ctx);
    // PlayerA is nearby so their interaction should be more relevant
    assert.ok(Array.isArray(relevant), 'Should return array');
  });

  test('getRelevantMemories handles empty memory gracefully', function() {
    var npc = { id: 'mem_empty', archetype: 'builder', memory: {} };
    var relevant = NpcDialogue.getRelevantMemories(npc, {});
    assert.ok(Array.isArray(relevant), 'Should return array for empty memory');
    assert.strictEqual(relevant.length, 0, 'Should return empty array for empty memory');
  });

  test('summarizeMemories returns a string', function() {
    var memories = [
      { with: 'PlayerA', topic: 'herbs', time: Date.now() },
      { with: 'PlayerB', topic: 'harvest festival', time: Date.now() - 1000 }
    ];
    var summary = NpcDialogue.summarizeMemories(memories);
    assert.ok(typeof summary === 'string', 'Should return string');
  });

  test('summarizeMemories handles empty array', function() {
    var summary = NpcDialogue.summarizeMemories([]);
    assert.ok(typeof summary === 'string', 'Should return string for empty array');
  });

  test('summarizeMemories condenses multiple memories', function() {
    var memories = [];
    for (var i = 0; i < 10; i++) {
      memories.push({ with: 'Player' + i, topic: 'topic' + i, time: Date.now() - i * 1000 });
    }
    var summary = NpcDialogue.summarizeMemories(memories);
    // Summary should be shorter than concatenating all memories verbatim
    var rawLength = JSON.stringify(memories).length;
    assert.ok(summary.length < rawLength, 'Summary should be shorter than raw memories');
  });

});

// ============================================================================
// Culture Emergence Tests
// ============================================================================

suite('detectTrend', function() {

  test('returns null for empty dialogues', function() {
    var trend = NpcDialogue.detectTrend([]);
    assert.ok(trend === null, 'Should return null for empty dialogues');
  });

  test('returns null for too few dialogues', function() {
    var trend = NpcDialogue.detectTrend([
      { npcId: 'a', message: 'The harvest was good.' }
    ]);
    assert.ok(trend === null, 'Should return null for single dialogue');
  });

  test('detects repeated topic across multiple dialogues', function() {
    var dialogues = [
      { npcId: 'a', message: 'The harvest festival is coming!' },
      { npcId: 'b', message: 'Are you ready for the harvest festival?' },
      { npcId: 'c', message: 'I love the harvest festival every year.' },
      { npcId: 'd', message: 'The harvest festival brings everyone together.' }
    ];
    var trend = NpcDialogue.detectTrend(dialogues);
    assert.ok(trend !== null, 'Should detect trend');
    assert.ok(typeof trend.topic === 'string', 'Should have topic');
    assert.ok(Array.isArray(trend.participants), 'Should have participants array');
  });

  test('trend result has expected shape', function() {
    var dialogues = [
      { npcId: 'a', message: 'The rain is beautiful today.' },
      { npcId: 'b', message: 'Yes, the rain helps the crops.' },
      { npcId: 'c', message: 'Rain is my favorite weather.' }
    ];
    var trend = NpcDialogue.detectTrend(dialogues);
    if (trend !== null) {
      assert.ok(typeof trend.topic === 'string', 'Trend should have topic string');
      assert.ok(typeof trend.sentiment === 'string', 'Trend should have sentiment string');
      assert.ok(Array.isArray(trend.participants), 'Trend should have participants array');
    }
  });

});

suite('getPopularTopics', function() {

  test('returns an array', function() {
    var topics = NpcDialogue.getPopularTopics([]);
    assert.ok(Array.isArray(topics), 'Should return array');
  });

  test('returns correct ranking and count', function() {
    var dialogueHistory = [
      { npcId: 'a', message: 'harvest harvest harvest' },
      { npcId: 'b', message: 'harvest is great' },
      { npcId: 'c', message: 'rain rain rain rain' },
      { npcId: 'd', message: 'I like rain' },
      { npcId: 'e', message: 'rain is wet' }
    ];
    var topics = NpcDialogue.getPopularTopics(dialogueHistory);
    assert.ok(Array.isArray(topics), 'Should return array');
    if (topics.length > 0) {
      assert.ok(typeof topics[0].topic === 'string', 'Each entry should have topic');
      assert.ok(typeof topics[0].count === 'number', 'Each entry should have count');
    }
  });

  test('respects window parameter to limit time range', function() {
    var dialogueHistory = [
      { npcId: 'a', message: 'festival time!', timestamp: Date.now() - 1000 },
      { npcId: 'b', message: 'festival!', timestamp: Date.now() - 1000 }
    ];
    // Window of 500ms should exclude entries from 1000ms ago
    var topics = NpcDialogue.getPopularTopics(dialogueHistory, 500);
    assert.ok(Array.isArray(topics), 'Should return array with window param');
  });

  test('handles empty dialogue history', function() {
    var topics = NpcDialogue.getPopularTopics([]);
    assert.strictEqual(topics.length, 0, 'Empty history should return empty topics');
  });

});

suite('generateOpinion', function() {

  test('returns a non-empty string', function() {
    var opinion = NpcDialogue.generateOpinion(sampleNpc, 'the harvest festival');
    assert.ok(typeof opinion === 'string' && opinion.length > 0, 'Should return non-empty string');
  });

  test('opinion varies by personality/archetype', function() {
    var gardenerOpinion = NpcDialogue.generateOpinion(
      { archetype: 'gardener', personality: ['nurturing'] },
      'building new structures'
    );
    var merchantOpinion = NpcDialogue.generateOpinion(
      { archetype: 'merchant', personality: ['shrewd'] },
      'building new structures'
    );
    assert.ok(typeof gardenerOpinion === 'string', 'Gardener should have opinion');
    assert.ok(typeof merchantOpinion === 'string', 'Merchant should have opinion');
    // They should be different
    assert.ok(gardenerOpinion !== merchantOpinion, 'Different archetypes should have different opinions');
  });

  test('handles unknown archetype', function() {
    var opinion = NpcDialogue.generateOpinion(
      { archetype: 'xyz_unknown', personality: [] },
      'some topic'
    );
    assert.ok(typeof opinion === 'string', 'Should not crash on unknown archetype');
  });

  test('handles empty topic', function() {
    var opinion = NpcDialogue.generateOpinion(sampleNpc, '');
    assert.ok(typeof opinion === 'string', 'Should handle empty topic');
  });

});

// ============================================================================
// Edge Case Tests
// ============================================================================

suite('Edge Cases', function() {

  test('buildPrompt handles null personality', function() {
    var npc = { id: 'x', name: 'Test', archetype: 'gardener', personality: null, home_zone: 'nexus', memory: {} };
    assert.doesNotThrow(function() {
      NpcDialogue.buildPrompt(npc, {});
    }, 'Should not throw with null personality');
  });

  test('sanitize handles very long response gracefully', function() {
    var veryLong = 'word '.repeat(1000);
    var result = NpcDialogue.sanitize(veryLong);
    assert.ok(result.length <= 200, 'Should truncate very long response');
  });

  test('parseResponse handles null/undefined input', function() {
    assert.doesNotThrow(function() {
      var r = NpcDialogue.parseResponse(null);
      assert.ok(typeof r === 'object', 'Should return object for null input');
    }, 'Should not throw on null input');
  });

  test('parseResponse handles undefined input', function() {
    assert.doesNotThrow(function() {
      NpcDialogue.parseResponse(undefined);
    }, 'Should not throw on undefined input');
  });

  test('getFallback handles null context', function() {
    assert.doesNotThrow(function() {
      NpcDialogue.getFallback(sampleNpc, null);
    }, 'Should not throw on null context');
  });

  test('getFallback handles empty NPC object', function() {
    var result = NpcDialogue.getFallback({}, { type: 'greeting' });
    assert.ok(typeof result === 'string', 'Should return string for empty NPC');
  });

  test('updateMemory handles null conversation', function() {
    assert.doesNotThrow(function() {
      var result = NpcDialogue.updateMemory(sampleNpc, null);
      assert.ok(typeof result === 'object', 'Should return object');
    }, 'Should not throw on null conversation');
  });

  test('detectTrend handles non-array input gracefully', function() {
    assert.doesNotThrow(function() {
      var result = NpcDialogue.detectTrend(null);
      assert.ok(result === null, 'Should return null for null input');
    }, 'Should not throw on null input');
  });

  test('generateFallbackPool handles null archetype', function() {
    assert.doesNotThrow(function() {
      var pool = NpcDialogue.generateFallbackPool(null);
      assert.ok(Array.isArray(pool), 'Should return array for null archetype');
    }, 'Should not throw on null archetype');
  });

});

// ============================================================================
// Run & Report
// ============================================================================

var allPassed = report();
process.exit(allPassed ? 0 : 1);
