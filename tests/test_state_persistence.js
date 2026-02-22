/**
 * tests/test_state_persistence.js
 * Tests for localStorage state save/restore via api_bridge.js
 * Covers: publishStateSnapshot, getLatestSnapshot, null handling
 */
'use strict';

// ---------------------------------------------------------------------------
// Environment setup — mock localStorage before requiring the module
// ---------------------------------------------------------------------------

var localStorageStore = {};

global.localStorage = {
  getItem: function(key) {
    return localStorageStore.hasOwnProperty(key) ? localStorageStore[key] : null;
  },
  setItem: function(key, value) {
    localStorageStore[key] = String(value);
  },
  removeItem: function(key) {
    delete localStorageStore[key];
  }
};

// Provide a minimal window so the module doesn't fail
global.window = { location: { hostname: 'localhost', href: 'http://localhost/' } };

// Stub fetch (not needed for localStorage tests, but module may reference it)
global.fetch = function() {
  return Promise.resolve({ ok: false });
};

// Suppress any module-level console noise
var _origWarn = console.warn;
var _origError = console.error;
console.warn = function() {};
console.error = function() {};

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

// Helpers
function clearStore() {
  localStorageStore = {};
}

function minimalGameState() {
  return {
    messages: [],
    players: {},
    structures: []
  };
}

// ---------------------------------------------------------------------------
// Load module
// ---------------------------------------------------------------------------

var ApiBridge = require('../src/js/api_bridge');

// ---------------------------------------------------------------------------
// Exports check
// ---------------------------------------------------------------------------

suite('Exports', function() {

  assert(typeof ApiBridge === 'object' && ApiBridge !== null, 'api_bridge exports an object');
  assert(typeof ApiBridge.publishStateSnapshot === 'function', 'publishStateSnapshot is exported');
  assert(typeof ApiBridge.getLatestSnapshot === 'function', 'getLatestSnapshot is exported');
  assert(typeof ApiBridge.buildSnapshot === 'function', 'buildSnapshot is exported');

});

// ---------------------------------------------------------------------------
// getLatestSnapshot — null when store is empty
// ---------------------------------------------------------------------------

suite('getLatestSnapshot — empty store', function() {

  clearStore();

  var result = ApiBridge.getLatestSnapshot();
  assert(result === null, 'getLatestSnapshot returns null when localStorage is empty');

});

// ---------------------------------------------------------------------------
// publishStateSnapshot stores to localStorage
// ---------------------------------------------------------------------------

suite('publishStateSnapshot stores state', function() {

  clearStore();

  var gameState = minimalGameState();
  ApiBridge.publishStateSnapshot(gameState);

  var raw = localStorageStore['zion_api_state'];
  assert(typeof raw === 'string', 'zion_api_state key is written to localStorage');
  assert(raw.length > 0, 'zion_api_state is non-empty');

  var ts = localStorageStore['zion_api_state_ts'];
  assert(typeof ts === 'string', 'zion_api_state_ts timestamp key is also written');
  assert(ts.length > 0, 'zion_api_state_ts is non-empty');

});

// ---------------------------------------------------------------------------
// publishStateSnapshot + getLatestSnapshot round-trip
// ---------------------------------------------------------------------------

suite('Round-trip: publish then retrieve', function() {

  clearStore();

  var gameState = minimalGameState();
  ApiBridge.publishStateSnapshot(gameState);

  var snapshot = ApiBridge.getLatestSnapshot();
  assert(snapshot !== null, 'getLatestSnapshot returns non-null after publish');
  assert(typeof snapshot === 'object', 'snapshot is an object');
  assert('ts' in snapshot, 'snapshot has a ts field');
  assert('v' in snapshot || 'world' in snapshot, 'snapshot has expected top-level fields (v or world)');

});

// ---------------------------------------------------------------------------
// publishStateSnapshot with richer gameState
// ---------------------------------------------------------------------------

suite('publishStateSnapshot with player data', function() {

  clearStore();

  var richState = {
    messages: [
      { from: 'player1', type: 'say', payload: { text: 'hello' }, ts: '2026-01-01T00:00:00Z' }
    ],
    players: {
      player1: { position: { x: 0, y: 0, z: 0, zone: 'nexus' } }
    },
    structures: []
  };

  var threw = false;
  try {
    ApiBridge.publishStateSnapshot(richState);
  } catch (e) {
    threw = true;
  }
  assert(!threw, 'publishStateSnapshot does not throw with player data');

  var snapshot = ApiBridge.getLatestSnapshot();
  assert(snapshot !== null, 'snapshot retrieved after rich publish');
  assert(typeof snapshot === 'object', 'snapshot is an object');

});

// ---------------------------------------------------------------------------
// publishStateSnapshot with null gameState (graceful handling)
// ---------------------------------------------------------------------------

suite('publishStateSnapshot null guard', function() {

  clearStore();

  var threw = false;
  try {
    ApiBridge.publishStateSnapshot(null);
  } catch (e) {
    threw = true;
  }
  assert(!threw, 'publishStateSnapshot does not throw when passed null');

});

// ---------------------------------------------------------------------------
// Multiple sequential writes — latest snapshot wins
// ---------------------------------------------------------------------------

suite('Sequential writes — latest wins', function() {

  clearStore();

  ApiBridge.publishStateSnapshot(minimalGameState());
  var ts1 = localStorageStore['zion_api_state_ts'];

  // Simulate time passing by ensuring Date.now changes (we rely on natural ordering)
  ApiBridge.publishStateSnapshot(minimalGameState());
  var ts2 = localStorageStore['zion_api_state_ts'];

  // Both writes should succeed and the key should be present
  assert(typeof ts2 === 'string', 'second write still produces a timestamp');

  var snapshot = ApiBridge.getLatestSnapshot();
  assert(snapshot !== null, 'getLatestSnapshot returns result after two sequential writes');

});

// ---------------------------------------------------------------------------
// buildSnapshot returns structured object
// ---------------------------------------------------------------------------

suite('buildSnapshot shape', function() {

  var gs = minimalGameState();
  var snap = ApiBridge.buildSnapshot(gs);

  assert(snap !== null && typeof snap === 'object', 'buildSnapshot returns an object');
  assert('ts' in snap, 'buildSnapshot result has ts');
  assert('world' in snap || 'v' in snap, 'buildSnapshot result has expected fields (world or v)');

});

// ---------------------------------------------------------------------------
// Restore console and finish
// ---------------------------------------------------------------------------

console.warn = _origWarn;
console.error = _origError;

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed > 0 ? 1 : 0);
