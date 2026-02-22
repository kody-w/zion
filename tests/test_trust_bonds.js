/**
 * tests/test_trust_bonds.js
 * Comprehensive tests for the ZION Trust Bonds System
 * 140+ tests covering all exported functions, bond levels, gifts,
 * memories, gossip, betrayal, decay, and edge cases.
 *
 * Run with: node tests/test_trust_bonds.js
 */

'use strict';

var TB = require('../src/js/trust_bonds');

// ============================================================================
// MINIMAL TEST HARNESS
// ============================================================================

var passed = 0;
var failed = 0;
var failures = [];
var currentSuite = '';

function suite(name, fn) {
  currentSuite = name;
  console.log('\n' + name);
  fn();
}

function assert(condition, msg) {
  if (condition) {
    passed++;
    process.stdout.write('  ok - ' + msg + '\n');
  } else {
    failed++;
    var fullMsg = '[' + currentSuite + '] FAIL: ' + msg;
    failures.push(fullMsg);
    process.stdout.write('  FAIL - ' + msg + '\n');
  }
}

function assertEqual(a, b, msg) {
  assert(a === b, msg + ' (expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a) + ')');
}

function assertGte(a, b, msg) {
  assert(a >= b, msg + ' (expected >= ' + b + ', got ' + a + ')');
}

function assertLte(a, b, msg) {
  assert(a <= b, msg + ' (expected <= ' + b + ', got ' + a + ')');
}

// ============================================================================
// HELPERS
// ============================================================================

var npcSeq = 0;
var playerSeq = 0;

function uid() { return 'player' + (++playerSeq); }
function nid() { return 'npc' + (++npcSeq); }

function freshState() {
  return TB.createState();
}

// Quickly give a player many points with a npc by tick-spaced interactions
function buildBondTo(state, playerId, npcId, targetPoints) {
  var tick = 1000;
  while (true) {
    var bond = TB.getBondLevel(state, playerId, npcId);
    if (bond.points >= targetPoints) break;
    TB.interact(state, playerId, npcId, 'collaborated', tick);
    tick += 400; // well beyond cooldown
  }
}

// ============================================================================
// SUITE 1: MODULE EXPORTS
// ============================================================================

suite('Module exports', function() {

  assert(typeof TB === 'object', 'module exports an object');
  assert(Array.isArray(TB.BOND_LEVELS), 'BOND_LEVELS is an array');
  assert(Array.isArray(TB.GIFT_TYPES), 'GIFT_TYPES is an array');
  assert(Array.isArray(TB.ACTION_TYPES), 'ACTION_TYPES is an array');
  assert(typeof TB.createState === 'function', 'createState is a function');
  assert(typeof TB.interact === 'function', 'interact is a function');
  assert(typeof TB.giveGift === 'function', 'giveGift is a function');
  assert(typeof TB.getBondLevel === 'function', 'getBondLevel is a function');
  assert(typeof TB.getBondLevelName === 'function', 'getBondLevelName is a function');
  assert(typeof TB.getPlayerBonds === 'function', 'getPlayerBonds is a function');
  assert(typeof TB.getNpcBonds === 'function', 'getNpcBonds is a function');
  assert(typeof TB.getMemories === 'function', 'getMemories is a function');
  assert(typeof TB.addMemory === 'function', 'addMemory is a function');
  assert(typeof TB.getGossip === 'function', 'getGossip is a function');
  assert(typeof TB.generateGossip === 'function', 'generateGossip is a function');
  assert(typeof TB.betray === 'function', 'betray is a function');
  assert(typeof TB.applyDecay === 'function', 'applyDecay is a function');
  assert(typeof TB.getUnlocks === 'function', 'getUnlocks is a function');
  assert(typeof TB.getBondLeaderboard === 'function', 'getBondLeaderboard is a function');
  assert(typeof TB.getPlayerBondStats === 'function', 'getPlayerBondStats is a function');
  assert(typeof TB.getStrongestBonds === 'function', 'getStrongestBonds is a function');

});

// ============================================================================
// SUITE 2: BOND LEVELS INTEGRITY
// ============================================================================

suite('BOND_LEVELS integrity', function() {

  assertEqual(TB.BOND_LEVELS.length, 5, 'exactly 5 bond levels defined');

  var names = ['stranger', 'acquaintance', 'friend', 'confidant', 'soul_bonded'];
  for (var i = 0; i < names.length; i++) {
    assertEqual(TB.BOND_LEVELS[i].name, names[i], 'level ' + i + ' name is ' + names[i]);
  }

  // Check thresholds
  assertEqual(TB.BOND_LEVELS[0].minPoints, 0, 'stranger starts at 0');
  assertEqual(TB.BOND_LEVELS[1].minPoints, 25, 'acquaintance starts at 25');
  assertEqual(TB.BOND_LEVELS[2].minPoints, 100, 'friend starts at 100');
  assertEqual(TB.BOND_LEVELS[3].minPoints, 250, 'confidant starts at 250');
  assertEqual(TB.BOND_LEVELS[4].minPoints, 500, 'soul_bonded starts at 500');

  // All levels have required fields
  var fields = ['name', 'label', 'minPoints', 'maxPoints', 'color', 'description', 'dialoguePrefix', 'questAccess'];
  for (var j = 0; j < TB.BOND_LEVELS.length; j++) {
    var level = TB.BOND_LEVELS[j];
    for (var k = 0; k < fields.length; k++) {
      assert(fields[k] in level, 'level ' + level.name + ' has field ' + fields[k]);
    }
  }

  // questAccess: stranger and acquaintance are false, others true
  assertEqual(TB.BOND_LEVELS[0].questAccess, false, 'stranger has no quest access');
  assertEqual(TB.BOND_LEVELS[1].questAccess, false, 'acquaintance has no quest access');
  assertEqual(TB.BOND_LEVELS[2].questAccess, true, 'friend has quest access');
  assertEqual(TB.BOND_LEVELS[3].questAccess, true, 'confidant has quest access');
  assertEqual(TB.BOND_LEVELS[4].questAccess, true, 'soul_bonded has quest access');

});

// ============================================================================
// SUITE 3: GIFT TYPES INTEGRITY
// ============================================================================

suite('GIFT_TYPES integrity', function() {

  assertEqual(TB.GIFT_TYPES.length, 10, 'exactly 10 gift types defined');

  var archetypes = ['gardener', 'builder', 'storyteller', 'merchant', 'explorer',
                    'teacher', 'musician', 'healer', 'philosopher', 'artist'];

  for (var i = 0; i < TB.GIFT_TYPES.length; i++) {
    var gift = TB.GIFT_TYPES[i];
    assert(typeof gift.id === 'string' && gift.id.length > 0, 'gift ' + i + ' has id');
    assert(typeof gift.name === 'string' && gift.name.length > 0, 'gift ' + i + ' has name');
    assert(typeof gift.description === 'string', 'gift ' + i + ' has description');
    assert(typeof gift.basePoints === 'number' && gift.basePoints > 0, 'gift ' + i + ' has positive basePoints');
    assert(typeof gift.archetypeBonus === 'object', 'gift ' + i + ' has archetypeBonus object');

    // Each gift covers all 10 archetypes
    for (var j = 0; j < archetypes.length; j++) {
      assert(typeof gift.archetypeBonus[archetypes[j]] === 'number',
        'gift ' + gift.id + ' has bonus for archetype ' + archetypes[j]);
    }
  }

  // All gift IDs are unique
  var ids = {};
  var unique = true;
  for (var k = 0; k < TB.GIFT_TYPES.length; k++) {
    if (ids[TB.GIFT_TYPES[k].id]) { unique = false; break; }
    ids[TB.GIFT_TYPES[k].id] = true;
  }
  assert(unique, 'all gift IDs are unique');

});

// ============================================================================
// SUITE 4: ACTION TYPES INTEGRITY
// ============================================================================

suite('ACTION_TYPES integrity', function() {

  assertGte(TB.ACTION_TYPES.length, 5, 'at least 5 action types defined');

  for (var i = 0; i < TB.ACTION_TYPES.length; i++) {
    var action = TB.ACTION_TYPES[i];
    assert(typeof action.id === 'string' && action.id.length > 0, 'action ' + i + ' has id');
    assert(typeof action.label === 'string', 'action ' + i + ' has label');
    assert(typeof action.basePoints === 'number' && action.basePoints > 0, 'action ' + i + ' basePoints > 0');
    assert(typeof action.cooldownTicks === 'number' && action.cooldownTicks > 0, 'action ' + i + ' cooldownTicks > 0');
    assert(typeof action.description === 'string', 'action ' + i + ' has description');
  }

  // IDs unique
  var ids = {};
  var unique = true;
  for (var k = 0; k < TB.ACTION_TYPES.length; k++) {
    if (ids[TB.ACTION_TYPES[k].id]) { unique = false; break; }
    ids[TB.ACTION_TYPES[k].id] = true;
  }
  assert(unique, 'all action IDs are unique');

});

// ============================================================================
// SUITE 5: createState
// ============================================================================

suite('createState', function() {

  var s = TB.createState();
  assert(typeof s === 'object', 'returns object');
  assert(typeof s.bonds === 'object', 'has bonds object');
  assert(typeof s.memories === 'object', 'has memories object');
  assert(Array.isArray(s.gossip), 'has gossip array');
  assert(Array.isArray(s.bondLog), 'has bondLog array');
  assertEqual(s.gossip.length, 0, 'gossip starts empty');
  assertEqual(s.bondLog.length, 0, 'bondLog starts empty');
  assertEqual(Object.keys(s.bonds).length, 0, 'bonds starts empty');

  // Two states are independent
  var s2 = TB.createState();
  TB.interact(s, 'p1', 'npc1', 'conversation', 100);
  assertEqual(Object.keys(s2.bonds).length, 0, 'states are independent');

});

// ============================================================================
// SUITE 6: interact
// ============================================================================

suite('interact — basic', function() {

  var s = freshState();
  var p = uid();
  var n = nid();

  var res = TB.interact(s, p, n, 'conversation', 100);
  assert(res.success === true, 'first interaction succeeds');
  assert(typeof res.points === 'number' && res.points > 0, 'points gained > 0');
  assertEqual(res.newLevel, 'stranger', 'starts at stranger (3 pts)');

  // On-cooldown returns failure
  var res2 = TB.interact(s, p, n, 'conversation', 101);
  assert(res2.success === false, 'same action on cooldown fails');
  assertEqual(res2.reason, 'on_cooldown', 'reason is on_cooldown');
  assertEqual(res2.points, 0, 'no points gained on cooldown');

  // Different action works fine
  var res3 = TB.interact(s, p, n, 'shared_activity', 101);
  assert(res3.success === true, 'different action succeeds even on cooldown for other');

});

suite('interact — unknown action', function() {

  var s = freshState();
  var p = uid();
  var n = nid();

  var res = TB.interact(s, p, n, 'nonexistent_action', 100);
  assert(res.success === false, 'unknown action fails');
  assertEqual(res.reason, 'unknown_action', 'reason is unknown_action');
  assertEqual(res.points, 0, 'no points on unknown action');

});

suite('interact — level progression', function() {

  var s = freshState();
  var p = uid();
  var n = nid();

  // Build to acquaintance (25 pts)
  var tick = 1000;
  var levelChanged = false;
  while (TB.getBondLevel(s, p, n).points < 25) {
    var r = TB.interact(s, p, n, 'collaborated', tick);
    tick += 500;
    if (r.levelChanged) levelChanged = true;
  }
  assert(levelChanged, 'level change detected during progression to acquaintance');
  assertEqual(TB.getBondLevel(s, p, n).level, 'acquaintance', 'reached acquaintance');

});

suite('interact — bond log populated', function() {

  var s = freshState();
  var p = uid();
  var n = nid();

  TB.interact(s, p, n, 'conversation', 500);
  assert(s.bondLog.length > 0, 'bondLog receives entries');
  assertEqual(s.bondLog[0].playerId, p, 'log entry has correct playerId');
  assertEqual(s.bondLog[0].npcId, n, 'log entry has correct npcId');
  assert(typeof s.bondLog[0].tick === 'number', 'log entry has tick');
  assert(typeof s.bondLog[0].pointsGained === 'number', 'log entry has pointsGained');

});

suite('interact — cooldown resets after enough ticks', function() {

  var s = freshState();
  var p = uid();
  var n = nid();

  // conversation cooldown is 50 ticks
  var r1 = TB.interact(s, p, n, 'conversation', 100);
  assert(r1.success === true, 'first interaction ok');
  var r2 = TB.interact(s, p, n, 'conversation', 149); // 49 ticks later — still on cooldown
  assert(r2.success === false, 'still on cooldown at tick 149');
  var r3 = TB.interact(s, p, n, 'conversation', 151); // 51 ticks later — cooldown expired
  assert(r3.success === true, 'cooldown expired at tick 151');

});

// ============================================================================
// SUITE 7: getBondLevelName
// ============================================================================

suite('getBondLevelName', function() {

  assertEqual(TB.getBondLevelName(0), 'stranger', '0 pts = stranger');
  assertEqual(TB.getBondLevelName(10), 'stranger', '10 pts = stranger');
  assertEqual(TB.getBondLevelName(24), 'stranger', '24 pts = stranger');
  assertEqual(TB.getBondLevelName(25), 'acquaintance', '25 pts = acquaintance');
  assertEqual(TB.getBondLevelName(99), 'acquaintance', '99 pts = acquaintance');
  assertEqual(TB.getBondLevelName(100), 'friend', '100 pts = friend');
  assertEqual(TB.getBondLevelName(249), 'friend', '249 pts = friend');
  assertEqual(TB.getBondLevelName(250), 'confidant', '250 pts = confidant');
  assertEqual(TB.getBondLevelName(499), 'confidant', '499 pts = confidant');
  assertEqual(TB.getBondLevelName(500), 'soul_bonded', '500 pts = soul_bonded');
  assertEqual(TB.getBondLevelName(9999), 'soul_bonded', '9999 pts = soul_bonded');

});

// ============================================================================
// SUITE 8: getBondLevel
// ============================================================================

suite('getBondLevel', function() {

  var s = freshState();
  var p = uid();
  var n = nid();

  var info = TB.getBondLevel(s, p, n);
  assertEqual(info.level, 'stranger', 'fresh bond is stranger');
  assertEqual(info.points, 0, 'fresh bond has 0 points');
  assert(typeof info.nextThreshold === 'number', 'nextThreshold is number');
  assertEqual(info.nextThreshold, 25, 'nextThreshold from stranger is 25');
  assert(typeof info.progress === 'number', 'progress is a number');
  assert(info.progress >= 0 && info.progress <= 1, 'progress is 0-1');
  assertEqual(info.progress, 0, 'fresh bond has 0 progress');
  assert(typeof info.color === 'string', 'color is a string');
  assert(typeof info.description === 'string', 'description is a string');

  // After some interactions
  TB.interact(s, p, n, 'conversation', 100);
  var info2 = TB.getBondLevel(s, p, n);
  assert(info2.points > 0, 'points increased after interaction');
  assert(info2.progress > 0, 'progress > 0 after interaction');

  // At soul_bonded, nextThreshold is null
  var s2 = freshState();
  var p2 = uid();
  var n2 = nid();
  buildBondTo(s2, p2, n2, 500);
  var info3 = TB.getBondLevel(s2, p2, n2);
  assertEqual(info3.level, 'soul_bonded', 'reached soul_bonded');
  assertEqual(info3.nextThreshold, null, 'no next threshold at max level');
  assertEqual(info3.progress, 1, 'progress is 1 at max level');

});

// ============================================================================
// SUITE 9: giveGift
// ============================================================================

suite('giveGift — basic', function() {

  var s = freshState();
  var p = uid();
  var n = nid();

  var res = TB.giveGift(s, p, n, 'wildflower_bouquet', 1000, 'gardener');
  assert(res.success === true, 'valid gift succeeds');
  assert(typeof res.points === 'number' && res.points > 0, 'points gained from gift');
  assert(typeof res.reaction === 'string', 'reaction is a string');
  assert(typeof res.newLevel === 'string', 'newLevel is a string');

});

suite('giveGift — archetype bonus', function() {

  var s = freshState();
  var p = uid();

  // wildflower_bouquet gives bonus to gardener
  var n1 = nid();
  var res1 = TB.giveGift(s, p, n1, 'wildflower_bouquet', 1000, 'gardener');

  var s2 = freshState();
  var p2 = uid();
  var n2 = nid();
  var res2 = TB.giveGift(s2, p2, n2, 'wildflower_bouquet', 1000, 'builder');

  // gardener gets higher bonus for wildflowers
  assert(res1.points > res2.points, 'gardener gets more points for wildflower_bouquet than builder');

});

suite('giveGift — reaction tiers', function() {

  var s = freshState();
  var p = uid();

  // philosophical_tome to philosopher (archetypeBonus=35 → overjoyed)
  var n1 = nid();
  var r1 = TB.giveGift(s, p, n1, 'philosophical_tome', 1000, 'philosopher');
  assertEqual(r1.reaction, 'overjoyed', 'philosopher gets overjoyed for philosophical_tome');

  // wildflower_bouquet to builder (archetypeBonus=4 → polite)
  var n2 = nid();
  var r2 = TB.giveGift(s, p, n2, 'wildflower_bouquet', 1000, 'builder');
  assertEqual(r2.reaction, 'polite', 'builder gets polite reaction for wildflower_bouquet');

});

suite('giveGift — cooldown', function() {

  var s = freshState();
  var p = uid();
  var n = nid();

  TB.giveGift(s, p, n, 'gemstone', 1000, 'artist');
  var res = TB.giveGift(s, p, n, 'gemstone', 1050, 'artist'); // 50 ticks later < 200
  assert(res.success === false, 'gift on cooldown fails');
  assertEqual(res.reason, 'on_cooldown', 'reason is on_cooldown');

  // After 200 ticks it succeeds
  var res2 = TB.giveGift(s, p, n, 'gemstone', 1201, 'artist');
  assert(res2.success === true, 'gift succeeds after cooldown expires');

});

suite('giveGift — unknown gift', function() {

  var s = freshState();
  var p = uid();
  var n = nid();

  var res = TB.giveGift(s, p, n, 'magic_banana', 1000, 'gardener');
  assert(res.success === false, 'unknown gift fails');
  assertEqual(res.reason, 'unknown_gift', 'reason is unknown_gift');

});

suite('giveGift — builds bond level', function() {

  var s = freshState();
  var p = uid();
  var n = nid();

  // Give enough gifts to level up from stranger
  var tick = 1000;
  var bonded = false;
  for (var i = 0; i < 20; i++) {
    var gift = TB.GIFT_TYPES[i % TB.GIFT_TYPES.length];
    TB.giveGift(s, p, n, gift.id, tick, 'philosopher');
    tick += 300;
    if (TB.getBondLevel(s, p, n).level !== 'stranger') { bonded = true; break; }
  }
  assert(bonded, 'gifts build bond beyond stranger');

});

// ============================================================================
// SUITE 10: getPlayerBonds / getNpcBonds
// ============================================================================

suite('getPlayerBonds', function() {

  var s = freshState();
  var p = uid();

  var n1 = nid();
  var n2 = nid();
  var n3 = nid();

  TB.interact(s, p, n1, 'conversation', 100);
  TB.interact(s, p, n2, 'shared_activity', 200);

  var bonds = TB.getPlayerBonds(s, p);
  assertEqual(bonds.length, 2, 'player has 2 bonds');
  assert(bonds.every(function(b) { return b.npcId !== undefined; }), 'each bond has npcId');
  assert(bonds.every(function(b) { return typeof b.points === 'number'; }), 'each bond has points');
  assert(bonds.every(function(b) { return typeof b.level === 'string'; }), 'each bond has level');

  // n3 not yet interacted — not in list
  var has3 = bonds.some(function(b) { return b.npcId === n3; });
  assert(!has3, 'un-interacted NPC not in bonds list');

  // Another player's bonds should not appear
  var p2 = uid();
  TB.interact(s, p2, n1, 'conversation', 300);
  var p1bonds = TB.getPlayerBonds(s, p);
  assertEqual(p1bonds.length, 2, 'p1 still has 2 bonds after p2 interacts');

});

suite('getNpcBonds', function() {

  var s = freshState();
  var n = nid();
  var p1 = uid();
  var p2 = uid();
  var p3 = uid();

  TB.interact(s, p1, n, 'conversation', 100);
  TB.interact(s, p2, n, 'helped_task', 200);

  var bonds = TB.getNpcBonds(s, n);
  assertEqual(bonds.length, 2, 'NPC has 2 player bonds');
  assert(bonds.some(function(b) { return b.playerId === p1; }), 'p1 in NPC bonds');
  assert(bonds.some(function(b) { return b.playerId === p2; }), 'p2 in NPC bonds');
  assert(!bonds.some(function(b) { return b.playerId === p3; }), 'p3 not in NPC bonds');

});

// ============================================================================
// SUITE 11: Memories
// ============================================================================

suite('addMemory and getMemories', function() {

  var s = freshState();
  var p = uid();
  var n = nid();

  // No memories yet
  var mems = TB.getMemories(s, p, n);
  assertEqual(mems.length, 0, 'no memories initially');

  // Add a memory manually
  TB.addMemory(s, p, n, { type: 'gift', label: 'gave flower', tick: 100 }, 100);
  var mems2 = TB.getMemories(s, p, n);
  assertEqual(mems2.length, 1, 'one memory after addMemory');
  assertEqual(mems2[0].type, 'gift', 'memory has correct type');

  // Interact also adds memories
  TB.interact(s, p, n, 'conversation', 200);
  var mems3 = TB.getMemories(s, p, n);
  assertEqual(mems3.length, 2, 'interact also stores memories');

});

suite('memories capped at 10', function() {

  var s = freshState();
  var p = uid();
  var n = nid();

  for (var i = 0; i < 15; i++) {
    TB.addMemory(s, p, n, { type: 'event', label: 'event ' + i, tick: i * 10 }, i * 10);
  }

  var mems = TB.getMemories(s, p, n);
  assertEqual(mems.length, 10, 'memories capped at 10');
  // Should be the last 10
  assertEqual(mems[0].label, 'event 5', 'oldest kept memory is event 5');
  assertEqual(mems[9].label, 'event 14', 'newest kept memory is event 14');

});

suite('memories from interactions are stored', function() {

  var s = freshState();
  var p = uid();
  var n = nid();

  TB.interact(s, p, n, 'shared_activity', 500);
  var mems = TB.getMemories(s, p, n);
  assert(mems.length > 0, 'interaction stores memory');
  assertEqual(mems[0].type, 'shared_activity', 'memory type matches action');

});

suite('gift memories recorded', function() {

  var s = freshState();
  var p = uid();
  var n = nid();

  TB.giveGift(s, p, n, 'gemstone', 1000, 'artist');
  var mems = TB.getMemories(s, p, n);
  assert(mems.length > 0, 'gift stores memory');
  assertEqual(mems[0].type, 'gift', 'gift memory has type gift');

});

// ============================================================================
// SUITE 12: Gossip
// ============================================================================

suite('getGossip returns empty initially', function() {

  var s = freshState();
  var n = nid();
  var gossip = TB.getGossip(s, n);
  assertEqual(gossip.length, 0, 'no gossip initially');

});

suite('generateGossip creates entries from bonds', function() {

  var s = freshState();
  var n = nid();
  var p1 = uid();
  var p2 = uid();

  TB.interact(s, p1, n, 'conversation', 100);
  TB.interact(s, p2, n, 'helped_task', 200);

  var generated = TB.generateGossip(s, n, 1000);
  assert(generated.length > 0, 'generates gossip entries');
  assert(generated.every(function(g) { return g.npcId === n; }), 'all gossip is from the NPC');
  assert(generated.every(function(g) { return typeof g.text === 'string'; }), 'gossip has text');
  assert(generated.every(function(g) { return typeof g.sentiment === 'string'; }), 'gossip has sentiment');

});

suite('gossip sentiment matches bond level', function() {

  var s = freshState();
  var n = nid();
  var p = uid();

  // Build high bond then generate
  buildBondTo(s, p, n, 250);
  var gen = TB.generateGossip(s, n, 9999);
  var myGossip = gen.filter(function(g) { return g.playerId === p; });
  assert(myGossip.length > 0, 'gossip generated for high-bond player');
  assertEqual(myGossip[0].sentiment, 'positive', 'high bond = positive sentiment');

});

suite('gossip stored in state', function() {

  var s = freshState();
  var n = nid();
  var p = uid();

  TB.interact(s, p, n, 'conversation', 100);
  TB.generateGossip(s, n, 500);

  var stored = TB.getGossip(s, n);
  assert(stored.length > 0, 'gossip stored in state after generateGossip');

});

suite('gossip replaces old entry for same pair', function() {

  var s = freshState();
  var n = nid();
  var p = uid();

  TB.interact(s, p, n, 'conversation', 100);
  TB.generateGossip(s, n, 500);
  var first = TB.getGossip(s, n);
  assertEqual(first.length, 1, 'one gossip entry');

  TB.generateGossip(s, n, 600);
  var second = TB.getGossip(s, n);
  assertEqual(second.length, 1, 'still one gossip entry after regenerate (replaced)');

});

// ============================================================================
// SUITE 13: Betray
// ============================================================================

suite('betray — basic', function() {

  var s = freshState();
  var p = uid();
  var n = nid();

  // Build bond first
  buildBondTo(s, p, n, 150); // friend level
  var before = TB.getBondLevel(s, p, n).points;

  var res = TB.betray(s, p, n, 'steal', 5000);
  assert(res.success === true, 'betray succeeds');
  assert(typeof res.pointsLost === 'number' && res.pointsLost > 0, 'points lost > 0');
  assert(typeof res.newLevel === 'string', 'newLevel is a string');
  assert(typeof res.description === 'string', 'description is a string');

  var after = TB.getBondLevel(s, p, n).points;
  assert(after < before, 'points decreased after betrayal');

});

suite('betray — points cannot go below 0', function() {

  var s = freshState();
  var p = uid();
  var n = nid();

  // Attack with only 5 points (attack = 120 points lost)
  TB.interact(s, p, n, 'conversation', 100);
  var res = TB.betray(s, p, n, 'attack', 200);
  assert(res.success === true, 'betrayal succeeds even with low points');
  assertEqual(TB.getBondLevel(s, p, n).points, 0, 'points clamped to 0, not negative');

});

suite('betray — unknown type', function() {

  var s = freshState();
  var p = uid();
  var n = nid();

  var res = TB.betray(s, p, n, 'nonexistent', 100);
  assert(res.success === false, 'unknown betrayal type fails');
  assertEqual(res.reason, 'unknown_betrayal', 'reason is unknown_betrayal');

});

suite('betray — records memory', function() {

  var s = freshState();
  var p = uid();
  var n = nid();

  buildBondTo(s, p, n, 100);
  TB.betray(s, p, n, 'broke_promise', 5000);

  var mems = TB.getMemories(s, p, n);
  var betrayalMem = mems.filter(function(m) { return m.type === 'betrayal'; });
  assert(betrayalMem.length > 0, 'betrayal records memory');

});

suite('betray — all betrayal types work', function() {

  var types = ['steal', 'attack', 'ignore_crisis', 'spread_rumour', 'broke_promise'];
  for (var i = 0; i < types.length; i++) {
    var s = freshState();
    var p = uid();
    var n = nid();
    buildBondTo(s, p, n, 200);
    var res = TB.betray(s, p, n, types[i], 5000 + i * 100);
    assert(res.success === true, 'betrayal type ' + types[i] + ' succeeds');
    assert(res.pointsLost > 0, 'betrayal type ' + types[i] + ' loses points');
  }

});

// ============================================================================
// SUITE 14: applyDecay
// ============================================================================

suite('applyDecay — no decay if no ticks passed', function() {

  var s = freshState();
  var p = uid();
  var n = nid();

  TB.interact(s, p, n, 'conversation', 100);
  var before = TB.getBondLevel(s, p, n).points;

  var result = TB.applyDecay(s, 100); // same tick as last interact
  var after = TB.getBondLevel(s, p, n).points;
  assertEqual(before, after, 'no decay at same tick');
  assertEqual(result.decayed.length, 0, 'no decayed entries');

});

suite('applyDecay — 1 point per 200 ticks', function() {

  var s = freshState();
  var p = uid();
  var n = nid();

  TB.interact(s, p, n, 'conversation', 100);
  var before = TB.getBondLevel(s, p, n).points;

  // 400 ticks later = 2 decay units
  var result = TB.applyDecay(s, 500);
  var after = TB.getBondLevel(s, p, n).points;
  assertEqual(after, before - 2, 'decayed by 2 points after 400 ticks');
  assertEqual(result.decayed.length, 1, 'one decayed entry');
  assertEqual(result.decayed[0].playerId, p, 'decayed entry has correct playerId');
  assertEqual(result.decayed[0].npcId, n, 'decayed entry has correct npcId');
  assertEqual(result.decayed[0].lost, 2, 'decayed entry records 2 lost');

});

suite('applyDecay — cannot decay below 0', function() {

  var s = freshState();
  var p = uid();
  var n = nid();

  TB.interact(s, p, n, 'conversation', 100); // 3 pts
  TB.applyDecay(s, 5000); // massive gap
  assertEqual(TB.getBondLevel(s, p, n).points, 0, 'decay never goes below 0');

});

suite('applyDecay — no decay if lastInteractTick is -1', function() {

  var s = freshState();
  var p = uid();
  var n = nid();

  // getBondLevel creates bond entry with lastInteractTick = -1
  TB.getBondLevel(s, p, n);
  var result = TB.applyDecay(s, 10000);
  assertEqual(result.decayed.length, 0, 'no decay for never-interacted bond');

});

suite('applyDecay — multiple bonds decay independently', function() {

  var s = freshState();
  var p = uid();
  var n1 = nid();
  var n2 = nid();

  TB.interact(s, p, n1, 'helped_task', 100); // 12 pts
  TB.interact(s, p, n2, 'collaborated', 100); // 20 pts

  var result = TB.applyDecay(s, 700); // 600 ticks = 3 decay units each
  assertEqual(result.decayed.length, 2, 'both bonds decayed');

});

// ============================================================================
// SUITE 15: getUnlocks
// ============================================================================

suite('getUnlocks — stranger has no dialogue', function() {

  var s = freshState();
  var p = uid();
  var n = nid();

  var unlocks = TB.getUnlocks(s, p, n);
  var dialogues = unlocks.filter(function(u) { return u.type === 'dialogue'; });
  assertEqual(dialogues.length, 0, 'stranger has no dialogue unlocks');

});

suite('getUnlocks — acquaintance unlocks dialogue', function() {

  var s = freshState();
  var p = uid();
  var n = nid();

  buildBondTo(s, p, n, 25); // acquaintance
  var unlocks = TB.getUnlocks(s, p, n);
  var dialogues = unlocks.filter(function(u) { return u.type === 'dialogue'; });
  assert(dialogues.length > 0, 'acquaintance has dialogue unlocks');

});

suite('getUnlocks — friend has quest access', function() {

  var s = freshState();
  var p = uid();
  var n = nid();

  buildBondTo(s, p, n, 100); // friend
  var unlocks = TB.getUnlocks(s, p, n);
  var questAccess = unlocks.filter(function(u) { return u.type === 'quest_access'; });
  assert(questAccess.length > 0, 'friend level grants quest access unlock');

});

suite('getUnlocks — soul_bonded has most unlocks', function() {

  var s = freshState();
  var p = uid();
  var n = nid();

  buildBondTo(s, p, n, 500); // soul_bonded

  var unlocksSoul = TB.getUnlocks(s, p, n);

  var s2 = freshState();
  var p2 = uid();
  var n2 = nid();
  buildBondTo(s2, p2, n2, 100); // friend
  var unlocksFriend = TB.getUnlocks(s2, p2, n2);

  assert(unlocksSoul.length > unlocksFriend.length, 'soul_bonded has more unlocks than friend');

});

suite('getUnlocks — all unlocks have required fields', function() {

  var s = freshState();
  var p = uid();
  var n = nid();

  buildBondTo(s, p, n, 500);
  var unlocks = TB.getUnlocks(s, p, n);
  assert(unlocks.length > 0, 'has unlocks at soul_bonded');
  for (var i = 0; i < unlocks.length; i++) {
    assert(typeof unlocks[i].type === 'string', 'unlock ' + i + ' has type');
    assert(typeof unlocks[i].id === 'string', 'unlock ' + i + ' has id');
    assert(typeof unlocks[i].level === 'string', 'unlock ' + i + ' has level');
  }

});

// ============================================================================
// SUITE 16: getBondLeaderboard
// ============================================================================

suite('getBondLeaderboard', function() {

  var s = freshState();
  var n = nid();
  var players = [uid(), uid(), uid(), uid(), uid()];

  // Give different amounts of bond to each player
  var tick = 1000;
  for (var i = 0; i < players.length; i++) {
    for (var j = 0; j <= i; j++) {
      TB.interact(s, players[i], n, 'collaborated', tick);
      tick += 500;
    }
  }

  var board = TB.getBondLeaderboard(s, n, 3);
  assertEqual(board.length, 3, 'leaderboard respects count parameter');

  // Should be sorted descending by points
  for (var k = 0; k < board.length - 1; k++) {
    assert(board[k].points >= board[k + 1].points, 'leaderboard is sorted descending');
  }

  // Top player should have most points
  assertEqual(board[0].playerId, players[4], 'player with most interactions is #1');

});

suite('getBondLeaderboard — defaults to 10', function() {

  var s = freshState();
  var n = nid();
  for (var i = 0; i < 15; i++) {
    var p = uid();
    TB.interact(s, p, n, 'conversation', 100 + i * 200);
  }
  var board = TB.getBondLeaderboard(s, n);
  assertLte(board.length, 10, 'default leaderboard is at most 10 entries');

});

// ============================================================================
// SUITE 17: getPlayerBondStats
// ============================================================================

suite('getPlayerBondStats', function() {

  var s = freshState();
  var p = uid();

  var stats = TB.getPlayerBondStats(s, p);
  assertEqual(stats.totalBonds, 0, 'starts with 0 bonds');
  assertEqual(stats.totalPoints, 0, 'starts with 0 total points');
  assertEqual(stats.averagePoints, 0, 'starts with 0 average points');
  assert(stats.topNpc === null, 'no top NPC initially');

  var n1 = nid();
  var n2 = nid();
  TB.interact(s, p, n1, 'conversation', 100);
  TB.interact(s, p, n2, 'collaborated', 200);

  var stats2 = TB.getPlayerBondStats(s, p);
  assertEqual(stats2.totalBonds, 2, 'has 2 bonds');
  assert(stats2.totalPoints > 0, 'total points > 0');
  assert(stats2.averagePoints > 0, 'average points > 0');
  assert(stats2.topNpc !== null, 'has a top NPC');
  assert(typeof stats2.levelCounts === 'object', 'has levelCounts object');
  assert(typeof stats2.levelCounts.stranger === 'number', 'levelCounts has stranger');
  assert(typeof stats2.levelCounts.acquaintance === 'number', 'levelCounts has acquaintance');
  assert(typeof stats2.levelCounts.friend === 'number', 'levelCounts has friend');
  assert(typeof stats2.levelCounts.confidant === 'number', 'levelCounts has confidant');
  assert(typeof stats2.levelCounts.soul_bonded === 'number', 'levelCounts has soul_bonded');

});

suite('getPlayerBondStats — levelCounts are accurate', function() {

  var s = freshState();
  var p = uid();

  // Create bonds at different levels
  var nFriend = nid();
  buildBondTo(s, p, nFriend, 100); // friend

  var nStranger = nid();
  TB.interact(s, p, nStranger, 'conversation', 9999); // 3 pts = stranger

  var stats = TB.getPlayerBondStats(s, p);
  assertEqual(stats.levelCounts.friend, 1, 'one friend bond');
  assertEqual(stats.levelCounts.stranger, 1, 'one stranger bond');

});

// ============================================================================
// SUITE 18: getStrongestBonds
// ============================================================================

suite('getStrongestBonds', function() {

  var s = freshState();
  var p = uid();

  var n1 = nid();
  var n2 = nid();
  var n3 = nid();

  buildBondTo(s, p, n1, 100); // friend
  buildBondTo(s, p, n2, 250); // confidant
  buildBondTo(s, p, n3, 30);  // acquaintance

  var strongest = TB.getStrongestBonds(s, p, 2);
  assertEqual(strongest.length, 2, 'returns requested count');
  assert(strongest[0].points >= strongest[1].points, 'sorted by points descending');
  assertEqual(strongest[0].npcId, n2, 'confidant is #1 strongest bond');

});

suite('getStrongestBonds — default count is 5', function() {

  var s = freshState();
  var p = uid();

  for (var i = 0; i < 8; i++) {
    var n = nid();
    TB.interact(s, p, n, 'conversation', 100 + i * 200);
  }

  var strongest = TB.getStrongestBonds(s, p);
  assertLte(strongest.length, 5, 'default getStrongestBonds returns at most 5');

});

// ============================================================================
// SUITE 19: Cross-player independence
// ============================================================================

suite('Cross-player independence', function() {

  var s = freshState();
  var n = nid();
  var p1 = uid();
  var p2 = uid();

  buildBondTo(s, p1, n, 200);
  // p2 has no interactions
  assertEqual(TB.getBondLevel(s, p2, n).points, 0, 'p2 bond unaffected by p1');

  // Betray by p1 does not affect p2
  TB.betray(s, p1, n, 'steal', 9999);
  assertEqual(TB.getBondLevel(s, p2, n).points, 0, 'p2 bond unaffected by p1 betrayal');

});

// ============================================================================
// SUITE 20: Full workflow integration
// ============================================================================

suite('Full workflow: friendship arc', function() {

  var s = freshState();
  var p = uid();
  var n = nid();

  // Start as stranger
  assertEqual(TB.getBondLevel(s, p, n).level, 'stranger', 'starts as stranger');

  // Interact to acquaintance
  var tick = 1000;
  while (TB.getBondLevel(s, p, n).points < 25) {
    TB.interact(s, p, n, 'collaborated', tick);
    tick += 500;
  }
  assertEqual(TB.getBondLevel(s, p, n).level, 'acquaintance', 'reached acquaintance');

  // Give gifts to reach friend
  while (TB.getBondLevel(s, p, n).points < 100) {
    TB.giveGift(s, p, n, 'gemstone', tick, 'artist');
    tick += 300;
  }
  assertEqual(TB.getBondLevel(s, p, n).level, 'friend', 'reached friend with gifts');

  // Memories should be accumulating; add extras to hit the cap
  for (var mi = 0; mi < 12; mi++) {
    TB.addMemory(s, p, n, { type: 'extra', label: 'extra ' + mi, tick: tick + mi }, tick + mi);
  }
  var mems = TB.getMemories(s, p, n);
  assertEqual(mems.length, 10, 'memories capped at 10');

  // Unlocks exist at friend level
  var unlocks = TB.getUnlocks(s, p, n);
  assert(unlocks.length > 0, 'friend level has unlocks');

  // Now betray
  var before = TB.getBondLevel(s, p, n).points;
  TB.betray(s, p, n, 'spread_rumour', tick);
  assert(TB.getBondLevel(s, p, n).points < before, 'betrayal reduces bond');

  // Generate gossip
  var gossip = TB.generateGossip(s, n, tick);
  assert(gossip.length > 0, 'gossip generated');

  // Apply decay
  var decayResult = TB.applyDecay(s, tick + 1000);
  assert(Array.isArray(decayResult.decayed), 'decay returns array');

  // Stats
  var stats = TB.getPlayerBondStats(s, p);
  assertEqual(stats.totalBonds, 1, 'one bond in stats');

  // Leaderboard
  var board = TB.getBondLeaderboard(s, n, 5);
  assertEqual(board.length, 1, 'one player in leaderboard');
  assertEqual(board[0].playerId, p, 'correct player in leaderboard');

});

suite('Full workflow: multi-player ecosystem', function() {

  var s = freshState();
  var n = nid();
  var players = [uid(), uid(), uid()];

  // Each player builds a different bond level
  var tick = 1000;
  buildBondTo(s, players[0], n, 500); // soul_bonded
  tick += 2000;
  buildBondTo(s, players[1], n, 100); // friend
  tick += 1000;
  TB.interact(s, players[2], n, 'conversation', tick); // stranger

  var board = TB.getBondLeaderboard(s, n, 10);
  assertEqual(board.length, 3, 'three players in leaderboard');
  assertEqual(board[0].playerId, players[0], 'soul_bonded player is #1');

  var gossip = TB.generateGossip(s, n, tick + 500);
  assertEqual(gossip.length, 3, 'gossip for all three players');

  var positiveGossip = gossip.filter(function(g) { return g.sentiment === 'positive'; });
  assert(positiveGossip.length >= 1, 'at least some positive gossip');

});

// ============================================================================
// FINAL REPORT
// ============================================================================

console.log('\n============================================================');
console.log('Trust Bonds Test Results');
console.log('============================================================');
console.log('Passed: ' + passed);
console.log('Failed: ' + failed);
console.log('Total:  ' + (passed + failed));

if (failures.length > 0) {
  console.log('\nFailures:');
  for (var fi = 0; fi < failures.length; fi++) {
    console.log('  ' + failures[fi]);
  }
}

console.log('============================================================');
process.exit(failed > 0 ? 1 : 0);
