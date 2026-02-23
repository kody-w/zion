// Test: TrustBonds wiring — interact, giveGift, getBondLevel, applyDecay, getPlayerBondStats
var TrustBonds = require('../src/js/trust_bonds.js');

var passed = 0;
var failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; }
  else { failed++; console.error('FAIL: ' + msg); }
}

// Create state
var state = TrustBonds.createState();
assert(state !== null && typeof state === 'object', 'createState returns object');

// interact: conversation builds bond
var result = TrustBonds.interact(state, 'player1', 'npc1', 'conversation', 100);
assert(result !== null && typeof result === 'object', 'interact returns result object');

// getBondLevel: bond should exist now
var level = TrustBonds.getBondLevel(state, 'player1', 'npc1');
assert(level !== undefined && level !== null, 'getBondLevel returns a value after interaction');

// giveGift: give a gift to NPC
var giftResult = TrustBonds.giveGift(state, 'player1', 'npc1', 'wildflower_bouquet', 200, 'gardener');
assert(giftResult !== null && typeof giftResult === 'object', 'giveGift returns result object');
assert(giftResult.success === true || giftResult.points !== undefined, 'giveGift has success or points');

// Multiple interactions to build bond
for (var i = 0; i < 10; i++) {
  TrustBonds.interact(state, 'player1', 'npc2', 'conversation', 300 + i);
}
var level2 = TrustBonds.getBondLevel(state, 'player1', 'npc2');
assert(level2 !== undefined, 'getBondLevel after multiple interactions returns value');

// applyDecay: should not throw
var decayResult = TrustBonds.applyDecay(state, 99999);
assert(true, 'applyDecay runs without error');

// getPlayerBondStats: returns stats object
var stats = TrustBonds.getPlayerBondStats(state, 'player1');
assert(stats !== null && typeof stats === 'object', 'getPlayerBondStats returns object');
assert(typeof stats.totalBonds === 'number', 'stats has totalBonds number');

// getBondLevelName: returns string
if (TrustBonds.getBondLevelName) {
  var levelName = TrustBonds.getBondLevelName(level);
  assert(typeof levelName === 'string', 'getBondLevelName returns string');
}

// getStrongestBonds: returns array
if (TrustBonds.getStrongestBonds) {
  var strongest = TrustBonds.getStrongestBonds(state, 'player1', 5);
  assert(Array.isArray(strongest), 'getStrongestBonds returns array');
}

console.log('test_wiring_trust_bonds: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
