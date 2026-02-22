/**
 * tests/test_anchor_bridge.js
 * Tests for the AR anchor bridge modules: anchors.js and anchor_management.js
 * Covers: anchors.js TYPES, calculateWarmth, getWarmthBonus;
 *         anchor_management.js createState, ANCHOR_TYPES, proposeAnchor validation
 */
'use strict';

// ---------------------------------------------------------------------------
// Environment stubs — anchors.js may reference navigator / window
// ---------------------------------------------------------------------------

try {
  Object.defineProperty(global, 'navigator', {
    value: { geolocation: null, userAgent: 'node-test' },
    writable: true,
    configurable: true
  });
} catch (e) {
  // navigator already defined and non-configurable — leave as-is
}

global.window = {
  location: { hostname: 'localhost', href: 'http://localhost/' },
  addEventListener: function() {},
  removeEventListener: function() {}
};

// Suppress any module console noise
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

// ---------------------------------------------------------------------------
// Load modules
// ---------------------------------------------------------------------------

var Anchors = require('../src/js/anchors');
var AM      = require('../src/js/anchor_management');

// ---------------------------------------------------------------------------
// anchors.js — TYPES
// ---------------------------------------------------------------------------

suite('anchors.js — TYPES', function() {

  assert(typeof Anchors.TYPES === 'object' && Anchors.TYPES !== null, 'TYPES is exported');
  assert(typeof Anchors.VALID_TYPES === 'object', 'VALID_TYPES is exported');

  // TYPES should be a plain object with string values
  var keys = Object.keys(Anchors.TYPES);
  assert(keys.length > 0, 'TYPES has at least one key');

  // Each type value should be a non-empty string
  var allStrings = true;
  for (var i = 0; i < keys.length; i++) {
    if (typeof Anchors.TYPES[keys[i]] !== 'string' || Anchors.TYPES[keys[i]].length === 0) {
      allStrings = false;
    }
  }
  assert(allStrings, 'all TYPES values are non-empty strings');

  // VALID_TYPES is an array
  assert(Array.isArray(Anchors.VALID_TYPES), 'VALID_TYPES is an array');
  assert(Anchors.VALID_TYPES.length > 0, 'VALID_TYPES is non-empty');

});

// ---------------------------------------------------------------------------
// anchors.js — calculateWarmth
// ---------------------------------------------------------------------------

suite('anchors.js — calculateWarmth', function() {

  assert(typeof Anchors.calculateWarmth === 'function', 'calculateWarmth is exported');

  // Null / empty → 0
  var w0 = Anchors.calculateWarmth(null);
  assertEqual(w0, 0, 'calculateWarmth(null) returns 0');

  var w1 = Anchors.calculateWarmth([]);
  assertEqual(w1, 0, 'calculateWarmth([]) returns 0');

  var w2 = Anchors.calculateWarmth([{ lat: 0, lon: 0 }]);
  assertEqual(w2, 0, 'calculateWarmth with single point returns 0');

  // Two walking-speed points ~500m apart → warmth > 0
  // lat difference of ~0.005 degrees ≈ 555m
  var movement = [
    { lat: 40.0000, lon: -74.0000, speed: 5, ts: 0 },
    { lat: 40.0050, lon: -74.0000, speed: 5, ts: 30000 }
  ];
  var w3 = Anchors.calculateWarmth(movement);
  assert(typeof w3 === 'number', 'calculateWarmth returns a number');
  assert(w3 > 0, 'calculateWarmth returns > 0 for walking movement');

  // Return value is always a number
  assert(!isNaN(w3), 'calculateWarmth result is not NaN');

});

// ---------------------------------------------------------------------------
// anchors.js — getWarmthBonus
// ---------------------------------------------------------------------------

suite('anchors.js — getWarmthBonus', function() {

  assert(typeof Anchors.getWarmthBonus === 'function', 'getWarmthBonus is exported');

  // Returns an object with harvestMultiplier and discoveryMultiplier
  var bonus0 = Anchors.getWarmthBonus(0);
  assert(typeof bonus0 === 'object' && bonus0 !== null, 'getWarmthBonus returns an object');
  assert('harvestMultiplier' in bonus0, 'bonus has harvestMultiplier');
  assert('discoveryMultiplier' in bonus0, 'bonus has discoveryMultiplier');

  // At 0 warmth, multipliers should be 1.0 (no bonus)
  assertEqual(bonus0.harvestMultiplier, 1.0, 'harvestMultiplier is 1.0 at 0 warmth');
  assertEqual(bonus0.discoveryMultiplier, 1.0, 'discoveryMultiplier is 1.0 at 0 warmth');

  // At max warmth, multipliers should be > 1.0 but capped
  var bonusMax = Anchors.getWarmthBonus(999999);
  assert(bonusMax.harvestMultiplier > 1.0, 'harvestMultiplier > 1.0 at max warmth');
  assert(bonusMax.discoveryMultiplier > 1.0, 'discoveryMultiplier > 1.0 at max warmth');

  // Per Constitution §5.3: max harvest bonus ≤ 10%, max discovery ≤ 15%
  assert(bonusMax.harvestMultiplier <= 1.10 + 0.001, 'harvestMultiplier <= 1.10 (10% cap)');
  assert(bonusMax.discoveryMultiplier <= 1.15 + 0.001, 'discoveryMultiplier <= 1.15 (15% cap)');

  // Negative warmth → treated as 0
  var bonusNeg = Anchors.getWarmthBonus(-100);
  assertEqual(bonusNeg.harvestMultiplier, 1.0, 'negative warmth treated as 0 (harvest)');
  assertEqual(bonusNeg.discoveryMultiplier, 1.0, 'negative warmth treated as 0 (discovery)');

  // Intermediate warmth — multipliers should be between 1.0 and max
  var bonusMid = Anchors.getWarmthBonus(5);
  assert(bonusMid.harvestMultiplier >= 1.0 && bonusMid.harvestMultiplier <= 1.10 + 0.001, 'mid warmth harvest in range');
  assert(bonusMid.discoveryMultiplier >= 1.0 && bonusMid.discoveryMultiplier <= 1.15 + 0.001, 'mid warmth discovery in range');

});

// ---------------------------------------------------------------------------
// anchor_management.js — createState
// ---------------------------------------------------------------------------

suite('anchor_management.js — createState', function() {

  assert(typeof AM.createState === 'function', 'createState is exported');

  var state = AM.createState();
  assert(state !== null && typeof state === 'object', 'createState returns an object');

  // Check expected top-level fields
  assert('proposals' in state, 'state has proposals');
  assert('anchors' in state, 'state has anchors');
  assert('visits' in state, 'state has visits');
  assert('anchorLog' in state, 'state has anchorLog');

  // proposals and anchors should be objects or arrays
  assert(typeof state.proposals === 'object', 'proposals is an object');
  assert(typeof state.anchors === 'object', 'anchors is an object');

});

// ---------------------------------------------------------------------------
// anchor_management.js — ANCHOR_TYPES
// ---------------------------------------------------------------------------

suite('anchor_management.js — ANCHOR_TYPES', function() {

  assert(Array.isArray(AM.ANCHOR_TYPES), 'ANCHOR_TYPES is an array');
  assert(AM.ANCHOR_TYPES.length > 0, 'ANCHOR_TYPES is non-empty');

  var firstType = AM.ANCHOR_TYPES[0];
  assert(typeof firstType === 'object' && firstType !== null, 'first ANCHOR_TYPE is an object');
  assert('id' in firstType, 'ANCHOR_TYPE has id field');
  assert('label' in firstType, 'ANCHOR_TYPE has label field');
  assert(typeof firstType.id === 'string', 'ANCHOR_TYPE.id is a string');
  assert(firstType.id.length > 0, 'ANCHOR_TYPE.id is non-empty');

  // VALID_TYPE_IDS should be an array of strings
  assert(Array.isArray(AM.VALID_TYPE_IDS), 'VALID_TYPE_IDS is an array');
  assert(AM.VALID_TYPE_IDS.length > 0, 'VALID_TYPE_IDS is non-empty');
  assertEqual(AM.ANCHOR_TYPES.length, AM.VALID_TYPE_IDS.length, 'ANCHOR_TYPES and VALID_TYPE_IDS have the same length');

});

// ---------------------------------------------------------------------------
// anchor_management.js — proposeAnchor input validation
// ---------------------------------------------------------------------------

suite('anchor_management.js — proposeAnchor validates inputs', function() {

  assert(typeof AM.proposeAnchor === 'function', 'proposeAnchor is exported');

  var state = AM.createState();
  var validType = AM.VALID_TYPE_IDS[0];
  var validZone = AM.VALID_ZONES[0];

  // Missing creatorId
  var r1 = AM.proposeAnchor(state, '', validType, 'My Anchor', 40.0, -74.0, validZone, 'A test anchor', 1);
  assert(r1.success === false, 'rejects missing creatorId');

  // Invalid type
  var r2 = AM.proposeAnchor(state, 'player1', 'invalid_type_xyz', 'My Anchor', 40.0, -74.0, validZone, 'A test anchor', 1);
  assert(r2.success === false, 'rejects invalid anchor type');

  // Invalid zone
  var r3 = AM.proposeAnchor(state, 'player1', validType, 'My Anchor', 40.0, -74.0, 'invalid_zone_xyz', 'A test anchor', 1);
  assert(r3.success === false, 'rejects invalid zone');

  // Missing name
  var r4 = AM.proposeAnchor(state, 'player1', validType, '', 40.0, -74.0, validZone, 'A test anchor', 1);
  assert(r4.success === false, 'rejects empty name');

  // Missing description
  var r5 = AM.proposeAnchor(state, 'player1', validType, 'My Anchor', 40.0, -74.0, validZone, '', 1);
  assert(r5.success === false, 'rejects empty description');

  // Invalid GPS — lat out of range
  var r6 = AM.proposeAnchor(state, 'player1', validType, 'My Anchor', 999.0, -74.0, validZone, 'A test anchor', 1);
  assert(r6.success === false, 'rejects out-of-range latitude');

  // Valid proposal
  var r7 = AM.proposeAnchor(state, 'player1', validType, 'My Anchor', 40.0, -74.0, validZone, 'A test anchor', 1);
  assert(r7.success === true, 'valid proposal is accepted');
  assert(r7.proposal !== null, 'proposal object is returned');
  assert(typeof r7.proposal.id === 'string', 'proposal.id is a string');
  assertEqual(r7.proposal.zone, validZone, 'proposal.zone matches');
  assertEqual(r7.proposal.type, validType, 'proposal.type matches');
  assertEqual(r7.proposal.creatorId, 'player1', 'proposal.creatorId matches');

});

suite('anchor_management.js — proposeAnchor enforces per-player limit', function() {

  var state = AM.createState();
  var validType = AM.VALID_TYPE_IDS[0];
  var validZone = AM.VALID_ZONES[0];
  var limit = AM.MAX_PROPOSALS_PER_PLAYER;

  assert(typeof limit === 'number', 'MAX_PROPOSALS_PER_PLAYER is a number');
  assert(limit > 0, 'MAX_PROPOSALS_PER_PLAYER > 0');

  // Fill up to limit — use different GPS coords so GPS validation isn't confused
  var i;
  for (i = 0; i < limit; i++) {
    AM.proposeAnchor(state, 'player_limit', validType, 'Anchor ' + i, 40.0 + i * 0.001, -74.0, validZone, 'Description ' + i, i);
  }

  // One more should fail
  var rOver = AM.proposeAnchor(state, 'player_limit', validType, 'Anchor over', 41.0, -74.0, validZone, 'Over the limit', limit + 1);
  assert(rOver.success === false, 'exceeding per-player proposal limit is rejected');

});

// ---------------------------------------------------------------------------
// Restore console and finish
// ---------------------------------------------------------------------------

console.warn = _origWarn;
console.error = _origError;

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed > 0 ? 1 : 0);
