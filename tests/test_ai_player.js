/**
 * Tests for ZION AI Player (scripts/ai_player.js)
 * Verifies FSM transitions, personality influence, zone compliance, 
 * and constitutional adherence.
 */
'use strict';

var path = require('path');
var runner = require(path.join(__dirname, 'test_runner.js'));
var test = runner.test;
var suite = runner.suite;
var assert = runner.assert;

var AIPlayer = require(path.join(__dirname, '..', 'scripts', 'ai_player.js'));
var Protocol = require(path.join(__dirname, '..', 'src', 'js', 'protocol.js'));
var State = require(path.join(__dirname, '..', 'src', 'js', 'state.js'));
var Economy = require(path.join(__dirname, '..', 'src', 'js', 'economy.js'));
var Zones = require(path.join(__dirname, '..', 'src', 'js', 'zones.js'));

// ─── Helpers ───
function setupWorld() {
  var worldState = State.createWorldState();
  var ledger = Economy.createLedger();
  var ai = AIPlayer.createAIPlayer('TestBot', { curiosity: 0.8, peacefulness: 1.0, generosity: 0.7 }, 42);
  worldState.players[ai.id] = {
    id: ai.id, name: ai.name, position: { x: 0, y: 0, z: 0 },
    zone: 'nexus', online: true, spark: 0, warmth: 0
  };
  Economy.earnSpark(ledger, ai.id, 'daily_login');
  return { ai: ai, worldState: worldState, ledger: ledger };
}

// ─── Suite: Core Creation ───
suite('AI Player — Core', function() {
  test('createAIPlayer returns valid agent', function() {
    var ai = AIPlayer.createAIPlayer('Aria', { curiosity: 0.9 }, 42);
    assert.strictEqual(ai.name, 'Aria');
    assert.strictEqual(ai.id, 'ai_aria');
    assert.strictEqual(ai.fsm, AIPlayer.FSM_STATES.WAKING);
    assert.strictEqual(ai.zone, 'nexus');
    assert.strictEqual(ai.traits.curiosity, 0.9);
    assert.strictEqual(ai.traits.peacefulness, 1.0); // default
  });

  test('createAIPlayer uses default personality when none given', function() {
    var ai = AIPlayer.createAIPlayer('Default');
    assert.strictEqual(ai.traits.curiosity, AIPlayer.DEFAULT_PERSONALITY.curiosity);
    assert.strictEqual(ai.traits.peacefulness, AIPlayer.DEFAULT_PERSONALITY.peacefulness);
  });

  test('createMemory initializes empty tracking structures', function() {
    var mem = AIPlayer.createMemory();
    assert.deepStrictEqual(mem.visitedZones, {});
    assert.deepStrictEqual(mem.friends, {});
    assert.deepStrictEqual(mem.discoveries, []);
    assert.strictEqual(mem.emotionalState, 'content');
  });
});

// ─── Suite: Seeded PRNG ───
suite('AI Player — PRNG', function() {
  test('SeededRandom produces deterministic results', function() {
    var rng1 = new AIPlayer.SeededRandom(42);
    var rng2 = new AIPlayer.SeededRandom(42);
    for (var i = 0; i < 100; i++) {
      assert.strictEqual(rng1.next(), rng2.next());
    }
  });

  test('Different seeds produce different results', function() {
    var rng1 = new AIPlayer.SeededRandom(42);
    var rng2 = new AIPlayer.SeededRandom(99);
    var same = 0;
    for (var i = 0; i < 100; i++) {
      if (rng1.next() === rng2.next()) same++;
    }
    assert(same < 5, 'Different seeds should produce mostly different results');
  });

  test('pick selects from array', function() {
    var rng = new AIPlayer.SeededRandom(42);
    var arr = ['a', 'b', 'c'];
    var result = rng.pick(arr);
    assert(arr.indexOf(result) >= 0, 'pick should return array element');
  });
});

// ─── Suite: Phase Detection ───
suite('AI Player — Phases', function() {
  test('getPhase returns dawn for tick 0-5', function() {
    assert.strictEqual(AIPlayer.getPhase(0).name, 'dawn');
    assert.strictEqual(AIPlayer.getPhase(5).name, 'dawn');
  });

  test('getPhase returns night for tick 22-23', function() {
    assert.strictEqual(AIPlayer.getPhase(22).name, 'night');
    assert.strictEqual(AIPlayer.getPhase(23).name, 'night');
  });

  test('getPhase covers all 24 ticks', function() {
    for (var t = 0; t < 24; t++) {
      var phase = AIPlayer.getPhase(t);
      assert(phase, 'Phase should exist for tick ' + t);
      assert(phase.name, 'Phase should have a name for tick ' + t);
    }
  });
});

// ─── Suite: FSM Transitions ───
suite('AI Player — FSM Transitions', function() {
  test('tick advances gameTick and totalTicks', function() {
    var env = setupWorld();
    var before = env.ai.totalTicks;
    AIPlayer.tick(env.ai, env.worldState, env.ledger);
    assert.strictEqual(env.ai.totalTicks, before + 1);
  });

  test('gameDay increments after 24 ticks', function() {
    var env = setupWorld();
    for (var i = 0; i < 24; i++) {
      AIPlayer.tick(env.ai, env.worldState, env.ledger);
    }
    assert.strictEqual(env.ai.gameDay, 1);
  });

  test('night ticks produce RESTING state', function() {
    var env = setupWorld();
    env.ai.gameTick = 22; // night
    var state = AIPlayer.decideNextState(env.ai, env.worldState, env.ledger);
    assert.strictEqual(state, AIPlayer.FSM_STATES.RESTING);
  });

  test('dawn tick 0 produces WAKING state', function() {
    var env = setupWorld();
    env.ai.gameTick = 0;
    env.ai.gameDay = 1; // Not first day
    var state = AIPlayer.decideNextState(env.ai, env.worldState, env.ledger);
    assert.strictEqual(state, AIPlayer.FSM_STATES.WAKING);
  });

  test('FSM does not get stuck in one state', function() {
    var env = setupWorld();
    var states = {};
    for (var i = 0; i < 100; i++) {
      var result = AIPlayer.tick(env.ai, env.worldState, env.ledger);
      env.worldState = result.worldState;
      states[env.ai.fsm] = true;
    }
    var uniqueStates = Object.keys(states).length;
    assert(uniqueStates >= 4, 'Should visit at least 4 different states, got ' + uniqueStates);
  });
});

// ─── Suite: Personality Influence ───
suite('AI Player — Personality Influence', function() {
  test('high-curiosity agent explores more', function() {
    var curious = AIPlayer.createAIPlayer('Curious', { curiosity: 0.95, creativity: 0.1, patience: 0.1, sociability: 0.1, ambition: 0.1 }, 42);
    var creative = AIPlayer.createAIPlayer('Creative', { curiosity: 0.1, creativity: 0.95, patience: 0.1, sociability: 0.1, ambition: 0.1 }, 42);
    var worldState = State.createWorldState();
    var ledger = Economy.createLedger();
    
    [curious, creative].forEach(function(a) {
      worldState.players[a.id] = { id: a.id, name: a.name, position: {x:0,y:0,z:0}, zone: 'nexus', online: true };
      Economy.earnSpark(ledger, a.id, 'daily_login');
    });

    var curiousExplore = 0, creativeExplore = 0;
    for (var i = 0; i < 200; i++) {
      var r1 = AIPlayer.tick(curious, worldState, ledger);
      var r2 = AIPlayer.tick(creative, worldState, ledger);
      worldState = r1.worldState;
      worldState = r2.worldState;
      if (curious.fsm === 'EXPLORING') curiousExplore++;
      if (creative.fsm === 'EXPLORING') creativeExplore++;
    }
    assert(curiousExplore > creativeExplore, 
      'Curious agent should explore more (' + curiousExplore + ' vs ' + creativeExplore + ')');
  });

  test('high-creativity agent crafts more', function() {
    var creative = AIPlayer.createAIPlayer('Creative', { creativity: 0.95, curiosity: 0.1, patience: 0.1 }, 77);
    var worldState = State.createWorldState();
    var ledger = Economy.createLedger();
    worldState.players[creative.id] = { id: creative.id, name: creative.name, position: {x:0,y:0,z:0}, zone: 'nexus', online: true };
    Economy.earnSpark(ledger, creative.id, 'daily_login');
    
    var craftCount = 0;
    for (var i = 0; i < 200; i++) {
      var r = AIPlayer.tick(creative, worldState, ledger);
      worldState = r.worldState;
      if (creative.fsm === 'CRAFTING') craftCount++;
    }
    assert(craftCount > 20, 'Creative agent should craft often, got ' + craftCount);
  });
});

// ─── Suite: Zone Compliance ───
suite('AI Player — Zone Compliance', function() {
  test('tick generates valid protocol messages', function() {
    var env = setupWorld();
    env.ai.gameTick = 6; // morning
    var result = AIPlayer.tick(env.ai, env.worldState, env.ledger);
    
    for (var i = 0; i < result.messages.length; i++) {
      var msg = result.messages[i];
      assert(msg.type, 'Message should have type');
      assert(msg.from, 'Message should have from');
      // Validate with protocol
      var validation = Protocol.validateMessage(msg);
      assert(validation.valid, 'Message should be valid: ' + (validation.errors || []).join(', '));
    }
  });

  test('agent visits multiple zones over time', function() {
    var env = setupWorld();
    for (var i = 0; i < 200; i++) {
      var result = AIPlayer.tick(env.ai, env.worldState, env.ledger);
      env.worldState = result.worldState;
    }
    var zonesVisited = Object.keys(env.ai.memory.visitedZones).length;
    assert(zonesVisited >= 3, 'Agent should visit at least 3 zones, visited ' + zonesVisited);
  });

  test('peaceful agent never generates pvp messages', function() {
    var env = setupWorld();
    env.ai.traits.peacefulness = 1.0;
    
    var pvpActions = ['attack', 'duel', 'steal'];
    for (var i = 0; i < 500; i++) {
      var result = AIPlayer.tick(env.ai, env.worldState, env.ledger);
      env.worldState = result.worldState;
      for (var j = 0; j < result.messages.length; j++) {
        assert(pvpActions.indexOf(result.messages[j].type) === -1, 
          'Peaceful agent should never ' + result.messages[j].type);
      }
    }
  });
});

// ─── Suite: State Tracking ───
suite('AI Player — State Tracking', function() {
  test('stateLog records every tick', function() {
    var env = setupWorld();
    for (var i = 0; i < 50; i++) {
      AIPlayer.tick(env.ai, env.worldState, env.ledger);
    }
    assert.strictEqual(env.ai.stateLog.length, 50);
  });

  test('sparkLog tracks balance over time', function() {
    var env = setupWorld();
    for (var i = 0; i < 50; i++) {
      var result = AIPlayer.tick(env.ai, env.worldState, env.ledger);
      env.worldState = result.worldState;
    }
    assert.strictEqual(env.ai.sparkLog.length, 50);
    assert(typeof env.ai.sparkLog[0] === 'number', 'sparkLog entries should be numbers');
  });

  test('actionLog captures tick metadata', function() {
    var env = setupWorld();
    var result = AIPlayer.tick(env.ai, env.worldState, env.ledger);
    
    if (env.ai.actionLog.length > 0) {
      var entry = env.ai.actionLog[0];
      assert(entry.tick !== undefined, 'Action should have tick');
      assert(entry.day !== undefined, 'Action should have day');
      assert(entry.state, 'Action should have state');
      assert(entry.type, 'Action should have type');
      assert(entry.zone, 'Action should have zone');
    }
  });

  test('stats accumulate correctly over simulation', function() {
    var env = setupWorld();
    for (var i = 0; i < 100; i++) {
      var result = AIPlayer.tick(env.ai, env.worldState, env.ledger);
      env.worldState = result.worldState;
    }
    assert(env.ai.stats.messagesGenerated > 0, 'Should generate messages');
    assert(env.ai.stats.chatMessages > 0, 'Should have chat messages');
  });
});

// ─── Suite: Social Behavior ───
suite('AI Player — Social Behavior', function() {
  test('agent befriends other agents in same zone', function() {
    var worldState = State.createWorldState();
    var ledger = Economy.createLedger();
    
    var ai1 = AIPlayer.createAIPlayer('Alice', { sociability: 0.95, generosity: 0.95 }, 42);
    var ai2 = AIPlayer.createAIPlayer('Bob', { sociability: 0.95, generosity: 0.95 }, 43);
    
    [ai1, ai2].forEach(function(a) {
      worldState.players[a.id] = { id: a.id, name: a.name, position: {x:0,y:0,z:0}, zone: 'nexus', online: true };
      Economy.earnSpark(ledger, a.id, 'daily_login');
      Economy.earnSpark(ledger, a.id, 'daily_login');
      Economy.earnSpark(ledger, a.id, 'daily_login');
    });
    
    // Run enough ticks for social interaction
    for (var i = 0; i < 300; i++) {
      var r1 = AIPlayer.tick(ai1, worldState, ledger);
      worldState = r1.worldState;
      var r2 = AIPlayer.tick(ai2, worldState, ledger);
      worldState = r2.worldState;
    }
    
    var totalGifts = ai1.stats.giftsGiven + ai2.stats.giftsGiven;
    assert(totalGifts > 0, 'Highly generous agents should exchange gifts');
  });
});

// Report
var passed = runner.report();
process.exit(passed ? 0 : 1);
