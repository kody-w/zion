/**
 * tests/test_intentions_wiring.js
 * Tests for the intention evaluation pipeline in intentions.js
 * Covers: registerIntention, evaluateTriggers, fireCount, cooldown, TTL, max_fires
 */
'use strict';

// ---------------------------------------------------------------------------
// Minimal test harness
// ---------------------------------------------------------------------------

var passed = 0;
var failed = 0;
var currentSuite = '';

function suite(name, fn) {
  currentSuite = name;
  console.log('\n' + name);
  fn();
}

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log('  PASS: ' + msg);
  } else {
    failed++;
    console.log('  FAIL: ' + msg);
  }
}

function assertEqual(a, b, msg) {
  assert(a === b, msg + ' (expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a) + ')');
}

// ---------------------------------------------------------------------------
// Load module
// ---------------------------------------------------------------------------

var Intentions = require('../src/js/intentions');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

var _intentionIdCounter = 0;
function freshTimerIntention(overrides) {
  _intentionIdCounter++;
  var base = {
    id: 'test-intention-' + _intentionIdCounter,
    trigger: {
      condition: 'timer',
      params: { interval_seconds: 0 }   // interval 0 → always ready
    },
    action: {
      type: 'emote',
      params: { text: 'waves' }
    },
    priority: 5,
    ttl: 9999,
    cooldown: 0,
    max_fires: 99
  };
  if (overrides) {
    for (var k in overrides) {
      if (overrides.hasOwnProperty(k)) {
        base[k] = overrides[k];
      }
    }
  }
  return base;
}

function mockWorldState(playerObj) {
  return {
    players: playerObj || {},
    recentChats: [],
    world: { dayPhase: 'day', weather: 'clear' },
    gardens: [],
    resources: [],
    structures: [],
    actions: []
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

suite('Exports', function() {

  assert(typeof Intentions.registerIntention === 'function', 'registerIntention is exported');
  assert(typeof Intentions.evaluateTriggers === 'function', 'evaluateTriggers is exported');
  assert(typeof Intentions.getIntentions === 'function', 'getIntentions is exported');
  assert(typeof Intentions.clearIntentions === 'function', 'clearIntentions is exported');
  assert(typeof Intentions.isIntentionExpired === 'function', 'isIntentionExpired is exported');
  assert(typeof Intentions.canIntentionFire === 'function', 'canIntentionFire is exported');

});

// ---------------------------------------------------------------------------
// registerIntention
// ---------------------------------------------------------------------------

suite('registerIntention — validation', function() {

  // Missing id
  var r1 = Intentions.registerIntention('p1', { trigger: { condition: 'timer', params: {} }, action: { type: 'emote', params: {} }, priority: 1, ttl: 100, cooldown: 0, max_fires: 1 });
  assert(r1.success === false, 'rejects intention without id');

  // Valid intention
  var r2 = Intentions.registerIntention('p_valid', freshTimerIntention());
  assert(r2.success === true, 'accepts valid timer intention');

  // Cleanup
  Intentions.clearIntentions('p_valid');
  Intentions.clearIntentions('p1');

});

suite('registerIntention — stores intention', function() {

  var playerId = 'player_store_test';
  Intentions.clearIntentions(playerId);

  var intention = freshTimerIntention();
  var result = Intentions.registerIntention(playerId, intention);
  assert(result.success === true, 'registration succeeds');

  var stored = Intentions.getIntentions(playerId);
  assertEqual(stored.length, 1, 'one intention stored after registration');
  assertEqual(stored[0].id, intention.id, 'stored intention has correct id');

  Intentions.clearIntentions(playerId);

});

// ---------------------------------------------------------------------------
// evaluateTriggers — timer fires actions
// ---------------------------------------------------------------------------

suite('evaluateTriggers — timer fires actions', function() {

  var playerId = 'player_timer_test';
  Intentions.clearIntentions(playerId);

  var playerObj = {};
  playerObj[playerId] = { position: { x: 0, y: 0, z: 0, zone: 'nexus' } };
  var ws = mockWorldState(playerObj);

  var intention = freshTimerIntention();
  Intentions.registerIntention(playerId, intention);

  var actions = Intentions.evaluateTriggers(playerId, ws, 0);
  assert(Array.isArray(actions), 'evaluateTriggers returns an array');
  assert(actions.length >= 1, 'timer intention fires at least one action on first call');

  var action = actions[0];
  assert(typeof action === 'object', 'action is an object');
  assertEqual(action.type, 'emote', 'action type is "emote"');
  assertEqual(action.from, playerId, 'action.from matches playerId');

  Intentions.clearIntentions(playerId);

});

// ---------------------------------------------------------------------------
// fireCount increments
// ---------------------------------------------------------------------------

suite('evaluateTriggers — fireCount increments', function() {

  var playerId = 'player_firecount';
  Intentions.clearIntentions(playerId);

  var playerObj = {};
  playerObj[playerId] = { position: { x: 0, y: 0, z: 0, zone: 'nexus' } };
  var ws = mockWorldState(playerObj);

  // Cooldown = 0 so it can fire multiple times immediately
  var intention = freshTimerIntention({ cooldown: 0, max_fires: 10 });
  Intentions.registerIntention(playerId, intention);

  // Fire once
  Intentions.evaluateTriggers(playerId, ws, 0);

  var stored1 = Intentions.getIntentions(playerId);
  assert(stored1.length > 0, 'intention still in store');
  assert(stored1[0].fireCount >= 1, 'fireCount >= 1 after first evaluation');

  // Fire again (timer interval=0 so eligible again immediately)
  Intentions.evaluateTriggers(playerId, ws, 0);
  var stored2 = Intentions.getIntentions(playerId);
  assert(stored2[0].fireCount >= 2, 'fireCount >= 2 after second evaluation');

  Intentions.clearIntentions(playerId);

});

// ---------------------------------------------------------------------------
// Cooldown prevents immediate re-fire
// ---------------------------------------------------------------------------

suite('evaluateTriggers — cooldown blocks re-fire', function() {

  var playerId = 'player_cooldown';
  Intentions.clearIntentions(playerId);

  var playerObj = {};
  playerObj[playerId] = { position: { x: 0, y: 0, z: 0, zone: 'nexus' } };
  var ws = mockWorldState(playerObj);

  // High cooldown (9999 seconds) — should only fire once
  var intention = freshTimerIntention({ cooldown: 9999, max_fires: 10 });
  Intentions.registerIntention(playerId, intention);

  var actions1 = Intentions.evaluateTriggers(playerId, ws, 0);
  assert(actions1.length >= 1, 'fires on first call');

  var actions2 = Intentions.evaluateTriggers(playerId, ws, 0);
  assertEqual(actions2.length, 0, 'cooldown prevents firing again immediately');

  Intentions.clearIntentions(playerId);

});

// ---------------------------------------------------------------------------
// max_fires limit
// ---------------------------------------------------------------------------

suite('evaluateTriggers — max_fires limit respected', function() {

  var playerId = 'player_maxfires';
  Intentions.clearIntentions(playerId);

  var playerObj = {};
  playerObj[playerId] = { position: { x: 0, y: 0, z: 0, zone: 'nexus' } };
  var ws = mockWorldState(playerObj);

  // max_fires = 1, cooldown = 0, interval = 0
  var intention = freshTimerIntention({ cooldown: 0, max_fires: 1 });
  Intentions.registerIntention(playerId, intention);

  var actions1 = Intentions.evaluateTriggers(playerId, ws, 0);
  assert(actions1.length === 1, 'fires once when max_fires=1');

  var actions2 = Intentions.evaluateTriggers(playerId, ws, 0);
  assertEqual(actions2.length, 0, 'does not fire again after max_fires reached');

  Intentions.clearIntentions(playerId);

});

// ---------------------------------------------------------------------------
// TTL expiry
// ---------------------------------------------------------------------------

suite('evaluateTriggers — TTL expiry skips intention', function() {

  var playerId = 'player_ttl';
  Intentions.clearIntentions(playerId);

  var playerObj = {};
  playerObj[playerId] = { position: { x: 0, y: 0, z: 0, zone: 'nexus' } };
  var ws = mockWorldState(playerObj);

  // Register with very short TTL (0 seconds = already expired instantly)
  var intention = freshTimerIntention({ ttl: 0, cooldown: 0, max_fires: 10 });
  Intentions.registerIntention(playerId, intention);

  // Manually backdate createdAt to ensure it's already expired
  var stored = Intentions.getIntentions(playerId);
  if (stored.length > 0) {
    stored[0].createdAt = Date.now() - 1000; // 1 second in the past, ttl=0 means it expires immediately
  }

  var actions = Intentions.evaluateTriggers(playerId, ws, 0);
  assertEqual(actions.length, 0, 'expired intention (TTL=0) produces no actions');

  // isIntentionExpired helper
  var expiredIntention = { createdAt: Date.now() - 5000, ttl: 1 }; // ttl 1 second, 5 seconds old
  assert(Intentions.isIntentionExpired(expiredIntention, Date.now()) === true, 'isIntentionExpired returns true for old intention');

  var freshIntention = { createdAt: Date.now(), ttl: 9999 };
  assert(Intentions.isIntentionExpired(freshIntention, Date.now()) === false, 'isIntentionExpired returns false for fresh intention');

  Intentions.clearIntentions(playerId);

});

// ---------------------------------------------------------------------------
// canIntentionFire helper
// ---------------------------------------------------------------------------

suite('canIntentionFire helper', function() {

  var now = Date.now();

  // Not hit max_fires, never fired, cooldown=0 → can fire
  var i1 = { fireCount: 0, max_fires: 5, lastFired: null, cooldown: 0 };
  assert(Intentions.canIntentionFire(i1, now) === true, 'can fire: fresh with cooldown=0');

  // Hit max_fires → cannot fire
  var i2 = { fireCount: 5, max_fires: 5, lastFired: null, cooldown: 0 };
  assert(Intentions.canIntentionFire(i2, now) === false, 'cannot fire: max_fires reached');

  // Cooldown not elapsed → cannot fire
  var i3 = { fireCount: 1, max_fires: 10, lastFired: now - 100, cooldown: 10 }; // 10s cooldown, only 100ms elapsed
  assert(Intentions.canIntentionFire(i3, now) === false, 'cannot fire: cooldown not elapsed');

  // Cooldown elapsed → can fire
  var i4 = { fireCount: 1, max_fires: 10, lastFired: now - 20000, cooldown: 10 }; // 10s cooldown, 20s elapsed
  assert(Intentions.canIntentionFire(i4, now) === true, 'can fire: cooldown elapsed');

});

// ---------------------------------------------------------------------------

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed > 0 ? 1 : 0);
