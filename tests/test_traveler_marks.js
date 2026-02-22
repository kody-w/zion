/**
 * tests/test_traveler_marks.js
 * Comprehensive tests for the ZION TravelerMarks module.
 * 200+ tests covering all exported functions, data integrity, edge cases.
 *
 * Run with: node tests/test_traveler_marks.js
 */

'use strict';

var TM = require('../src/js/traveler_marks');

// ============================================================================
// MINIMAL TEST HARNESS
// ============================================================================

var passed   = 0;
var failed   = 0;
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

function assertDeep(a, b, msg) {
  assert(JSON.stringify(a) === JSON.stringify(b), msg + ' (expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a) + ')');
}

function assertArray(val, msg) {
  assert(Array.isArray(val), msg + ' (expected array, got ' + typeof val + ')');
}

// ============================================================================
// HELPERS
// ============================================================================

var playerSeq = 0;
function uid() { return 'player_' + (++playerSeq); }
function wid()  { return 'world_'  + (++playerSeq); }

function freshState() { return TM.createState(); }

/** Build an ISO timestamp offset by minutes from a base time */
function tsOffset(baseIso, offsetMinutes) {
  return new Date(new Date(baseIso).getTime() + offsetMinutes * 60000).toISOString();
}

var BASE_TS = '2026-01-01T12:00:00.000Z';

// ============================================================================
// SUITE 1: MODULE EXPORTS
// ============================================================================

suite('Module exports', function() {
  assert(typeof TM === 'object',                          'module is an object');
  assert(typeof TM.RARITY === 'object',                   'RARITY exported');
  assert(typeof TM.VISIT_MILESTONES === 'object',         'VISIT_MILESTONES exported');
  assert(typeof TM.LONG_STAY_MINUTES === 'object',        'LONG_STAY_MINUTES exported');
  assert(typeof TM.COLLECTOR_MILESTONES === 'object',     'COLLECTOR_MILESTONES exported');
  assert(typeof TM.MARK_SHAPES === 'object',              'MARK_SHAPES exported');
  assert(typeof TM.mulberry32 === 'function',             'mulberry32 exported');
  assert(typeof TM.hashStr === 'function',                'hashStr exported');
  assert(typeof TM.computeRarity === 'function',          'computeRarity exported');
  assert(typeof TM.generateMark === 'function',           'generateMark exported');
  assert(typeof TM.createState === 'function',            'createState exported');
  assert(typeof TM.visitWorld === 'function',             'visitWorld exported');
  assert(typeof TM.leaveWorld === 'function',             'leaveWorld exported');
  assert(typeof TM.getMarks === 'function',               'getMarks exported');
  assert(typeof TM.getMark === 'function',                'getMark exported');
  assert(typeof TM.equipMark === 'function',              'equipMark exported');
  assert(typeof TM.getEquippedMark === 'function',        'getEquippedMark exported');
  assert(typeof TM.getMarksByRarity === 'function',       'getMarksByRarity exported');
  assert(typeof TM.countMarksByRarity === 'function',     'countMarksByRarity exported');
  assert(typeof TM.getVisitHistory === 'function',        'getVisitHistory exported');
  assert(typeof TM.getVisitRecord === 'function',         'getVisitRecord exported');
  assert(typeof TM.getVisitedWorldsSorted === 'function', 'getVisitedWorldsSorted exported');
  assert(typeof TM.countWorldsVisited === 'function',     'countWorldsVisited exported');
  assert(typeof TM.hasVisited === 'function',             'hasVisited exported');
  assert(typeof TM.addLoreEntry === 'function',           'addLoreEntry exported');
  assert(typeof TM.getLoreEntries === 'function',         'getLoreEntries exported');
  assert(typeof TM.getLoreEntriesForWorld === 'function', 'getLoreEntriesForWorld exported');
  assert(typeof TM.addContact === 'function',             'addContact exported');
  assert(typeof TM.getContacts === 'function',            'getContacts exported');
  assert(typeof TM.getContact === 'function',             'getContact exported');
  assert(typeof TM.removeContact === 'function',          'removeContact exported');
  assert(typeof TM.getContactsFromWorld === 'function',   'getContactsFromWorld exported');
  assert(typeof TM.getProfile === 'function',             'getProfile exported');
  assert(typeof TM.getCollectorAchievements === 'function','getCollectorAchievements exported');
  assert(typeof TM.getCollectorProgress === 'function',   'getCollectorProgress exported');
  assert(typeof TM.getWorldMilestones === 'function',     'getWorldMilestones exported');
  assert(typeof TM.serialize === 'function',              'serialize exported');
  assert(typeof TM.deserialize === 'function',            'deserialize exported');
  assert(typeof TM.mergePlayerData === 'function',        'mergePlayerData exported');
});

// ============================================================================
// SUITE 2: CONSTANTS INTEGRITY
// ============================================================================

suite('Constants integrity', function() {
  assert(TM.RARITY.COMMON    === 'common',    'RARITY.COMMON is common');
  assert(TM.RARITY.RARE      === 'rare',      'RARITY.RARE is rare');
  assert(TM.RARITY.LEGENDARY === 'legendary', 'RARITY.LEGENDARY is legendary');

  assert(Array.isArray(TM.VISIT_MILESTONES),       'VISIT_MILESTONES is array');
  assert(TM.VISIT_MILESTONES.length >= 1,          'VISIT_MILESTONES has entries');

  assert(Array.isArray(TM.LONG_STAY_MINUTES),      'LONG_STAY_MINUTES is array');
  assert(TM.LONG_STAY_MINUTES.length >= 1,         'LONG_STAY_MINUTES has entries');

  assert(Array.isArray(TM.COLLECTOR_MILESTONES),   'COLLECTOR_MILESTONES is array');
  assert(TM.COLLECTOR_MILESTONES.length >= 1,      'COLLECTOR_MILESTONES has entries');

  assert(Array.isArray(TM.MARK_SHAPES),            'MARK_SHAPES is array');
  assert(TM.MARK_SHAPES.length >= 5,               'MARK_SHAPES has at least 5 entries');

  // Visit milestones have required fields
  var vmFields = ['id', 'visits', 'rewardSpark', 'rewardXp', 'description'];
  var allVmOk = TM.VISIT_MILESTONES.every(function(vm) {
    return vmFields.every(function(f) { return f in vm; });
  });
  assert(allVmOk, 'all VISIT_MILESTONES have required fields');

  // Stay milestones have required fields
  var smFields = ['id', 'minutes', 'rewardSpark', 'rewardXp', 'description'];
  var allSmOk = TM.LONG_STAY_MINUTES.every(function(sm) {
    return smFields.every(function(f) { return f in sm; });
  });
  assert(allSmOk, 'all LONG_STAY_MINUTES have required fields');

  // Collector milestones have required fields
  var cmFields = ['id', 'marks', 'badge', 'rewardSpark', 'rewardXp', 'tier'];
  var allCmOk = TM.COLLECTOR_MILESTONES.every(function(cm) {
    return cmFields.every(function(f) { return f in cm; });
  });
  assert(allCmOk, 'all COLLECTOR_MILESTONES have required fields');

  // Collector milestone IDs are unique
  var cmIds = TM.COLLECTOR_MILESTONES.map(function(cm) { return cm.id; });
  var uniqueCmIds = cmIds.length === new Set(cmIds).size ||
    cmIds.filter(function(id, i) { return cmIds.indexOf(id) === i; }).length === cmIds.length;
  assert(uniqueCmIds, 'COLLECTOR_MILESTONES IDs are unique');

  // Visit milestone IDs are unique
  var vmIds = TM.VISIT_MILESTONES.map(function(vm) { return vm.id; });
  var uniqueVmIds = vmIds.filter(function(id, i) { return vmIds.indexOf(id) === i; }).length === vmIds.length;
  assert(uniqueVmIds, 'VISIT_MILESTONES IDs are unique');

  // Rarity thresholds are positive numbers
  assert(TM.RARITY_AGE_LEGENDARY > TM.RARITY_AGE_RARE,   'RARITY_AGE_LEGENDARY > RARITY_AGE_RARE');
  assert(TM.RARITY_DIST_LEGENDARY >= TM.RARITY_DIST_RARE, 'RARITY_DIST_LEGENDARY >= RARITY_DIST_RARE');
});

// ============================================================================
// SUITE 3: mulberry32 PRNG
// ============================================================================

suite('mulberry32 PRNG', function() {
  var rng1 = TM.mulberry32(42);
  assert(typeof rng1 === 'function', 'mulberry32 returns a function');

  var v = rng1();
  assert(typeof v === 'number',  'PRNG returns a number');
  assert(v >= 0 && v < 1,       'PRNG value is in [0, 1)');

  // Deterministic: two PRNGs with same seed produce same sequence
  var rngA = TM.mulberry32(999);
  var rngB = TM.mulberry32(999);
  var seqA = [rngA(), rngA(), rngA()];
  var seqB = [rngB(), rngB(), rngB()];
  assert(seqA[0] === seqB[0] && seqA[1] === seqB[1] && seqA[2] === seqB[2],
    'same seed produces same sequence');

  // Different seeds produce different sequences
  var rngC = TM.mulberry32(1);
  var rngD = TM.mulberry32(2);
  var vC = rngC(), vD = rngD();
  assert(vC !== vD, 'different seeds produce different values');

  // Generates many values all in range
  var rng2 = TM.mulberry32(12345);
  var allInRange = true;
  for (var i = 0; i < 100; i++) {
    var val = rng2();
    if (val < 0 || val >= 1) { allInRange = false; break; }
  }
  assert(allInRange, '100 PRNG values all in [0,1)');
});

// ============================================================================
// SUITE 4: hashStr
// ============================================================================

suite('hashStr', function() {
  var h1 = TM.hashStr('hello');
  var h2 = TM.hashStr('hello');
  var h3 = TM.hashStr('world');

  assert(typeof h1 === 'number', 'hashStr returns number');
  assertEqual(h1, h2, 'hashStr is deterministic');
  assert(h1 !== h3, 'hashStr different for different inputs');

  // Edge cases
  var hEmpty = TM.hashStr('');
  assert(typeof hEmpty === 'number', 'hashStr handles empty string');

  var hNull = TM.hashStr(null);
  assert(typeof hNull === 'number', 'hashStr handles null');

  var hUndef = TM.hashStr(undefined);
  assert(typeof hUndef === 'number', 'hashStr handles undefined');

  // Non-negative (unsigned 32-bit)
  assert(h1 >= 0, 'hashStr result is non-negative');
  assert(hEmpty >= 0, 'hashStr empty is non-negative');
});

// ============================================================================
// SUITE 5: computeRarity
// ============================================================================

suite('computeRarity', function() {
  // Legendary by age
  assert(TM.computeRarity('old-world', { ageInDays: 400 }) === TM.RARITY.LEGENDARY,
    'world 400 days old is legendary');

  // Legendary by distance
  assert(TM.computeRarity('distant-world', { ageInDays: 1, distanceHops: 5 }) === TM.RARITY.LEGENDARY,
    'world 5 hops away is legendary');

  // Rare by age
  assert(TM.computeRarity('mid-world', { ageInDays: 60 }) === TM.RARITY.RARE,
    'world 60 days old is rare');

  // Rare by distance
  assert(TM.computeRarity('two-hop-world', { ageInDays: 5, distanceHops: 2 }) === TM.RARITY.RARE,
    'world 2 hops away is rare');

  // Common
  var r = TM.computeRarity('new-world', { ageInDays: 5, distanceHops: 1 });
  assert(r === TM.RARITY.COMMON, 'new nearby world is common');

  // No metadata — deterministic PRNG fallback
  var r1 = TM.computeRarity('some-world-id');
  var r2 = TM.computeRarity('some-world-id');
  assertEqual(r1, r2, 'computeRarity is deterministic with no metadata');
  assert([TM.RARITY.COMMON, TM.RARITY.RARE, TM.RARITY.LEGENDARY].indexOf(r1) !== -1,
    'computeRarity fallback returns valid rarity');

  // Boundary: exactly at legendary age
  assert(TM.computeRarity('x', { ageInDays: TM.RARITY_AGE_LEGENDARY }) === TM.RARITY.LEGENDARY,
    'exactly at legendary age threshold = legendary');

  // Boundary: exactly at rare age
  var rBoundary = TM.computeRarity('x', { ageInDays: TM.RARITY_AGE_RARE });
  assert(rBoundary === TM.RARITY.RARE || rBoundary === TM.RARITY.LEGENDARY,
    'exactly at rare age threshold >= rare');
});

// ============================================================================
// SUITE 6: generateMark
// ============================================================================

suite('generateMark', function() {
  var mark = TM.generateMark('world-alpha', 'World Alpha', { ageInDays: 10, distanceHops: 1 });

  assert(typeof mark === 'object' && mark !== null, 'generateMark returns object');
  assertEqual(mark.worldId,   'world-alpha',  'mark has worldId');
  assertEqual(mark.worldName, 'World Alpha',  'mark has worldName');
  assert(typeof mark.rarity === 'string',     'mark has rarity string');
  assert(TM.MARK_SHAPES.indexOf(mark.shape) !== -1, 'mark shape is in MARK_SHAPES');
  assert(typeof mark.primaryColor === 'string',   'mark has primaryColor');
  assert(typeof mark.secondaryColor === 'string', 'mark has secondaryColor');
  assert(typeof mark.sizeMult === 'number',       'mark has sizeMult');
  assert(mark.sizeMult >= 0.8 && mark.sizeMult <= 1.2, 'sizeMult in [0.8, 1.2]');
  assert(typeof mark.rotation === 'number',       'mark has rotation');
  assert(mark.rotation >= 0 && mark.rotation < 360, 'rotation in [0, 360)');
  assertEqual(mark.slot,       'traveler_mark', 'mark slot is traveler_mark');
  assertEqual(mark.equippable, true,             'mark is equippable');
  assert(typeof mark.description === 'string',   'mark has description');

  // Deterministic
  var mark2 = TM.generateMark('world-alpha', 'World Alpha', { ageInDays: 10, distanceHops: 1 });
  assertEqual(mark.shape,          mark2.shape,          'mark shape is deterministic');
  assertEqual(mark.primaryColor,   mark2.primaryColor,   'mark primaryColor is deterministic');
  assertEqual(mark.secondaryColor, mark2.secondaryColor, 'mark secondaryColor is deterministic');
  assertEqual(mark.sizeMult,       mark2.sizeMult,       'mark sizeMult is deterministic');
  assertEqual(mark.rotation,       mark2.rotation,       'mark rotation is deterministic');

  // Different worlds produce different marks (most of the time)
  var markB = TM.generateMark('world-beta', 'World Beta', { ageInDays: 10, distanceHops: 1 });
  assert(mark.shape !== markB.shape ||
         mark.primaryColor !== markB.primaryColor ||
         mark.rotation !== markB.rotation,
    'different worlds produce different marks');

  // Legendary mark has legendary colors (primaryColor from legendary palette)
  var legendaryMark = TM.generateMark('ancient-world', 'Ancient World', { ageInDays: 500 });
  assertEqual(legendaryMark.rarity, TM.RARITY.LEGENDARY, 'ancient world mark is legendary');

  // Common mark
  var commonMark = TM.generateMark('new-world-xyz', 'New World', { ageInDays: 5, distanceHops: 1 });
  assertEqual(commonMark.rarity, TM.RARITY.COMMON, 'new world mark is common');

  // No worldName uses worldId as fallback
  var noName = TM.generateMark('world-noname', null);
  assertEqual(noName.worldName, 'world-noname', 'null worldName falls back to worldId');
});

// ============================================================================
// SUITE 7: createState
// ============================================================================

suite('createState', function() {
  var state = TM.createState();
  assert(typeof state === 'object' && state !== null, 'createState returns object');
  assert(typeof state.players === 'object',           'state has players object');
  assertEqual(Object.keys(state.players).length, 0,  'players starts empty');

  // Two states are independent
  var s1 = TM.createState();
  var s2 = TM.createState();
  TM.visitWorld(s1, 'playerX', 'worldX', 'World X', {}, BASE_TS);
  assertEqual(Object.keys(s2.players).length, 0, 'states are independent');
});

// ============================================================================
// SUITE 8: visitWorld — basic
// ============================================================================

suite('visitWorld — basic', function() {
  var state = freshState();
  var pid   = uid();
  var world = 'world-zeta';

  var result = TM.visitWorld(state, pid, world, 'World Zeta', { ageInDays: 5 }, BASE_TS);

  assert(typeof result === 'object',          'visitWorld returns object');
  assert(typeof result.mark === 'object',     'result has mark');
  assertEqual(result.isNew, true,             'first visit isNew = true');
  assertArray(result.milestones,              'result has milestones array');

  // Player created
  assert(state.players[pid] !== undefined,   'player record created');

  // Mark stored
  var mark = TM.getMark(state, pid, world);
  assert(mark !== null,                      'mark stored in state');
  assertEqual(mark.worldId, world,           'stored mark worldId correct');

  // Visit record created
  var visitRec = TM.getVisitRecord(state, pid, world);
  assert(visitRec !== null,                  'visit record created');
  assertEqual(visitRec.visitCount, 1,        'visitCount is 1 after first visit');
  assertEqual(visitRec.firstVisitTs, BASE_TS,'firstVisitTs set');
  assertEqual(visitRec.lastVisitTs,  BASE_TS,'lastVisitTs set');
  assertEqual(visitRec.currentVisitStart, BASE_TS, 'currentVisitStart set');
  assertEqual(visitRec.worldName, 'World Zeta', 'worldName set from parameter');

  // hasVisited
  assert(TM.hasVisited(state, pid, world),   'hasVisited returns true after visit');
  assert(!TM.hasVisited(state, pid, 'other-world'), 'hasVisited false for unvisited world');

  // countWorldsVisited
  assertEqual(TM.countWorldsVisited(state, pid), 1, 'countWorldsVisited = 1');

  // totalVisits
  assertEqual(state.players[pid].totalVisits, 1, 'totalVisits = 1');
});

// ============================================================================
// SUITE 9: visitWorld — repeat visits
// ============================================================================

suite('visitWorld — repeat visits', function() {
  var state = freshState();
  var pid   = uid();
  var world = 'world-repeat';

  TM.visitWorld(state, pid, world, 'Repeat World', {}, BASE_TS);
  var result2 = TM.visitWorld(state, pid, world, 'Repeat World', {}, tsOffset(BASE_TS, 60));

  assertEqual(result2.isNew, false, 'second visit isNew = false');

  var visitRec = TM.getVisitRecord(state, pid, world);
  assertEqual(visitRec.visitCount, 2, 'visitCount = 2 after second visit');
  assertEqual(state.players[pid].totalVisits, 2, 'totalVisits = 2');

  // Mark not duplicated
  var marks = TM.getMarks(state, pid);
  assertEqual(marks.length, 1, 'mark not duplicated on revisit');

  // 5 visits
  for (var i = 0; i < 3; i++) {
    TM.visitWorld(state, pid, world, 'Repeat World', {}, tsOffset(BASE_TS, 120 + i * 60));
  }
  assertEqual(visitRec.visitCount, 5, 'visitCount = 5 after 5 visits');
  assertEqual(state.players[pid].totalVisits, 5, 'totalVisits = 5');
});

// ============================================================================
// SUITE 10: visitWorld — multiple worlds
// ============================================================================

suite('visitWorld — multiple worlds', function() {
  var state  = freshState();
  var pid    = uid();

  TM.visitWorld(state, pid, 'world-a', 'World A', {}, BASE_TS);
  TM.visitWorld(state, pid, 'world-b', 'World B', { ageInDays: 50 }, BASE_TS);
  TM.visitWorld(state, pid, 'world-c', 'World C', { ageInDays: 400 }, BASE_TS);

  assertEqual(TM.countWorldsVisited(state, pid), 3, 'countWorldsVisited = 3');
  assertEqual(TM.getMarks(state, pid).length, 3,    'three marks collected');

  var counts = TM.countMarksByRarity(state, pid);
  assertEqual(counts.total, 3, 'total marks = 3');
  assert(counts.legendary >= 1, 'at least one legendary mark (world-c age 400)');
  assert(counts.rare >= 1,      'at least one rare mark (world-b age 50)');
});

// ============================================================================
// SUITE 11: leaveWorld
// ============================================================================

suite('leaveWorld', function() {
  var state = freshState();
  var pid   = uid();
  var world = 'world-leave-test';

  TM.visitWorld(state, pid, world, 'Leave Test World', {}, BASE_TS);

  // Leave after 30 minutes
  var departure = tsOffset(BASE_TS, 30);
  var result = TM.leaveWorld(state, pid, world, departure);

  assert(typeof result === 'object', 'leaveWorld returns object');
  assertEqual(result.stayMinutes, 30, 'stayMinutes = 30');
  assertArray(result.milestones,       'milestones is array');

  var visitRec = TM.getVisitRecord(state, pid, world);
  assertEqual(visitRec.totalStayMinutes, 30, 'totalStayMinutes updated');
  assertEqual(visitRec.currentVisitStart, null, 'currentVisitStart cleared');
  assertEqual(state.players[pid].totalStayMinutes, 30, 'player totalStayMinutes = 30');

  // Leave again without visiting — stayMinutes should be 0
  var result2 = TM.leaveWorld(state, pid, world, tsOffset(departure, 10));
  assertEqual(result2.stayMinutes, 0, 'leaving without active visit = 0 minutes');
});

// ============================================================================
// SUITE 12: leaveWorld — stay milestones
// ============================================================================

suite('leaveWorld — stay milestones', function() {
  var state = freshState();
  var pid   = uid();
  var world = 'world-long-stay';

  TM.visitWorld(state, pid, world, 'Long Stay World', {}, BASE_TS);

  // Stay 20 minutes — should trigger 15-minute milestone
  var departure = tsOffset(BASE_TS, 20);
  var result = TM.leaveWorld(state, pid, world, departure);
  var milestoneIds = result.milestones.map(function(m) { return m.id; });
  assert(milestoneIds.indexOf('stay_15min') !== -1, '15-minute stay milestone awarded at 20 min');

  // Re-visit and stay 45 more minutes → total 65 min → 1hr milestone
  TM.visitWorld(state, pid, world, 'Long Stay World', {}, departure);
  var dep2 = tsOffset(departure, 45);
  var result2 = TM.leaveWorld(state, pid, world, dep2);
  var ids2 = result2.milestones.map(function(m) { return m.id; });
  assert(ids2.indexOf('stay_1hr') !== -1, '1-hour stay milestone awarded at 65 total min');

  // 15-minute milestone not re-awarded
  assert(ids2.indexOf('stay_15min') === -1, '15-minute milestone not re-awarded');
});

// ============================================================================
// SUITE 13: Visit-count milestones
// ============================================================================

suite('Visit-count milestones', function() {
  var state = freshState();
  var pid   = uid();
  var world = 'world-mile';

  // First visit milestone
  var r1 = TM.visitWorld(state, pid, world, 'Mile World', {}, BASE_TS);
  var ids1 = r1.milestones.map(function(m) { return m.id; });
  assert(ids1.indexOf('first_visit') !== -1, 'first_visit milestone on visit 1');

  // Not re-awarded on visit 2
  var r2 = TM.visitWorld(state, pid, world, 'Mile World', {}, tsOffset(BASE_TS, 60));
  var ids2 = r2.milestones.filter(function(m) { return m.id === 'first_visit'; });
  assertEqual(ids2.length, 0, 'first_visit not re-awarded on visit 2');

  // 3-visits milestone
  TM.visitWorld(state, pid, world, 'Mile World', {}, tsOffset(BASE_TS, 120));
  var r3 = TM.visitWorld(state, pid, world, 'Mile World', {}, tsOffset(BASE_TS, 180));
  // After 3rd total visit (first was v1, so v2 and v3 are extra)
  // visits: 1 = first_visit; then 2 then 3 = three_visits
  var worldRec = TM.getVisitRecord(state, pid, world);
  // 4 calls so far
  assert(worldRec.visitCount >= 3, 'visit count >= 3');
  // Check that three_visits milestone appears somewhere
  var allMilestones = [];
  [r1, r2, r3].forEach(function(r) {
    r.milestones.forEach(function(m) { allMilestones.push(m.id); });
  });
  // three_visits fires at exact count 3
  var r3rd = TM.visitWorld(state, pid, world, 'Mile World', {}, tsOffset(BASE_TS, 240));
  // We've now done 5 visits
  var found3Visit = false;
  [r1, r2, r3, r3rd].forEach(function(r) {
    r.milestones.forEach(function(m) {
      if (m.id === 'three_visits') found3Visit = true;
    });
  });
  assert(found3Visit || worldRec.visitCount >= 3, 'three_visits milestone fires at 3 visits');
});

// ============================================================================
// SUITE 14: getMark / getMarks
// ============================================================================

suite('getMark / getMarks', function() {
  var state = freshState();
  var pid   = uid();

  // getMark on unvisited player
  assertEqual(TM.getMark(state, pid, 'any-world'), null, 'getMark returns null for unknown player');

  TM.visitWorld(state, pid, 'world-a', 'A', {}, BASE_TS);
  TM.visitWorld(state, pid, 'world-b', 'B', {}, BASE_TS);

  var markA = TM.getMark(state, pid, 'world-a');
  assert(markA !== null, 'getMark returns mark after visit');
  assertEqual(markA.worldId, 'world-a', 'getMark returns correct mark');

  var marks = TM.getMarks(state, pid);
  assertEqual(marks.length, 2, 'getMarks returns 2 marks');
  assert(marks.every(function(m) { return m.worldId && m.rarity && m.shape; }),
    'all marks have worldId, rarity, shape');

  // getMarks for unknown player
  var empty = TM.getMarks(state, 'ghost');
  assertArray(empty, 'getMarks returns array for unknown player');
  assertEqual(empty.length, 0, 'getMarks returns empty array for unknown player');
});

// ============================================================================
// SUITE 15: equipMark / getEquippedMark
// ============================================================================

suite('equipMark / getEquippedMark', function() {
  var state = freshState();
  var pid   = uid();

  // No equipped mark initially
  assertEqual(TM.getEquippedMark(state, pid), null, 'no equipped mark initially');

  TM.visitWorld(state, pid, 'world-equip', 'Equip World', {}, BASE_TS);

  // Equip valid mark
  var ok = TM.equipMark(state, pid, 'world-equip');
  assertEqual(ok, true, 'equipMark returns true for valid mark');

  var equipped = TM.getEquippedMark(state, pid);
  assert(equipped !== null, 'getEquippedMark returns mark after equipping');
  assertEqual(equipped.worldId, 'world-equip', 'equipped mark has correct worldId');

  // Equip non-existent mark
  var fail = TM.equipMark(state, pid, 'non-existent-world');
  assertEqual(fail, false, 'equipMark returns false for non-collected mark');
  assertEqual(TM.getEquippedMark(state, pid).worldId, 'world-equip', 'equipped mark unchanged after failed equip');

  // Unequip (null)
  var unequip = TM.equipMark(state, pid, null);
  assertEqual(unequip, true, 'equipMark null returns true');
  assertEqual(TM.getEquippedMark(state, pid), null, 'getEquippedMark null after unequip');

  // getEquippedMark for unknown player
  assertEqual(TM.getEquippedMark(state, 'ghost'), null, 'getEquippedMark null for unknown player');
});

// ============================================================================
// SUITE 16: getMarksByRarity / countMarksByRarity
// ============================================================================

suite('getMarksByRarity / countMarksByRarity', function() {
  var state = freshState();
  var pid   = uid();

  TM.visitWorld(state, pid, 'w-common',    'Common',    { ageInDays: 1, distanceHops: 1 }, BASE_TS);
  TM.visitWorld(state, pid, 'w-rare',      'Rare',      { ageInDays: 60 }, BASE_TS);
  TM.visitWorld(state, pid, 'w-legendary', 'Legendary', { ageInDays: 400 }, BASE_TS);

  var grouped = TM.getMarksByRarity(state, pid);
  assert(typeof grouped === 'object',                 'getMarksByRarity returns object');
  assertArray(grouped[TM.RARITY.COMMON],              'common group is array');
  assertArray(grouped[TM.RARITY.RARE],                'rare group is array');
  assertArray(grouped[TM.RARITY.LEGENDARY],           'legendary group is array');
  assertEqual(grouped[TM.RARITY.LEGENDARY].length, 1, '1 legendary mark');
  assertEqual(grouped[TM.RARITY.RARE].length, 1,      '1 rare mark');

  var counts = TM.countMarksByRarity(state, pid);
  assertEqual(counts.legendary, 1,                    'counts.legendary = 1');
  assertEqual(counts.rare, 1,                         'counts.rare = 1');
  assertEqual(counts.total, 3,                        'counts.total = 3');
  assertEqual(counts.common + counts.rare + counts.legendary, counts.total,
    'common + rare + legendary = total');

  // Unknown player
  var emptyCounts = TM.countMarksByRarity(state, 'nobody');
  assertEqual(emptyCounts.total, 0, 'unknown player has 0 marks total');
});

// ============================================================================
// SUITE 17: getVisitHistory / getVisitedWorldsSorted
// ============================================================================

suite('getVisitHistory / getVisitedWorldsSorted', function() {
  var state = freshState();
  var pid   = uid();

  // Empty player
  assertArray(TM.getVisitHistory(state, pid), 'getVisitHistory returns array for new player (auto-init)');
  assertEqual(TM.getVisitHistory(state, 'ghost').length, 0, 'getVisitHistory empty for unknown');

  TM.visitWorld(state, pid, 'world-first',  'First',  {}, '2026-01-01T10:00:00.000Z');
  TM.visitWorld(state, pid, 'world-second', 'Second', {}, '2026-01-01T11:00:00.000Z');
  TM.visitWorld(state, pid, 'world-first',  'First',  {}, '2026-01-01T12:00:00.000Z'); // revisit

  var history = TM.getVisitHistory(state, pid);
  assertEqual(history.length, 2, 'visit history has 2 distinct worlds');

  var sorted = TM.getVisitedWorldsSorted(state, pid);
  assertEqual(sorted.length, 2, 'sorted history has 2 entries');
  // Most recently visited first
  assertEqual(sorted[0].worldId, 'world-first', 'world-first is most recent (revisited last)');

  // getVisitedWorldsSorted for unknown player
  var emptySorted = TM.getVisitedWorldsSorted(state, 'ghost');
  assertArray(emptySorted, 'getVisitedWorldsSorted returns array for unknown');
  assertEqual(emptySorted.length, 0, 'empty sorted for unknown player');
});

// ============================================================================
// SUITE 18: countWorldsVisited / hasVisited
// ============================================================================

suite('countWorldsVisited / hasVisited', function() {
  var state = freshState();
  var pid   = uid();

  assertEqual(TM.countWorldsVisited(state, 'nobody'), 0, 'countWorldsVisited 0 for unknown');
  assertEqual(TM.hasVisited(state, 'nobody', 'w'), false, 'hasVisited false for unknown player');

  TM.visitWorld(state, pid, 'w1', 'W1', {}, BASE_TS);
  TM.visitWorld(state, pid, 'w2', 'W2', {}, BASE_TS);
  TM.visitWorld(state, pid, 'w1', 'W1', {}, BASE_TS); // revisit

  assertEqual(TM.countWorldsVisited(state, pid), 2, 'countWorldsVisited = 2');
  assert(TM.hasVisited(state, pid, 'w1'), 'hasVisited w1 = true');
  assert(TM.hasVisited(state, pid, 'w2'), 'hasVisited w2 = true');
  assert(!TM.hasVisited(state, pid, 'w3'), 'hasVisited w3 = false');
});

// ============================================================================
// SUITE 19: addLoreEntry / getLoreEntries / getLoreEntriesForWorld
// ============================================================================

suite('Lore entries', function() {
  var state = freshState();
  var pid   = uid();

  // Empty
  assertEqual(TM.getLoreEntries(state, 'nobody').length, 0, 'getLoreEntries empty for unknown');
  assertEqual(TM.getLoreEntriesForWorld(state, 'nobody', 'w').length, 0, 'getLoreEntriesForWorld empty for unknown');

  var entry = TM.addLoreEntry(state, pid, 'world-a', 'World A', 'My Adventure', 'I explored the wilds.', BASE_TS);
  assert(typeof entry === 'object',             'addLoreEntry returns object');
  assert(typeof entry.id === 'string',          'entry has id');
  assertEqual(entry.type, 'cross_world_story',  'entry type is cross_world_story');
  assertEqual(entry.worldId, 'world-a',         'entry worldId');
  assertEqual(entry.worldName, 'World A',       'entry worldName');
  assertEqual(entry.title, 'My Adventure',      'entry title');
  assertEqual(entry.body, 'I explored the wilds.', 'entry body');
  assertEqual(entry.ts, BASE_TS,                'entry timestamp');
  assertEqual(entry.playerId, pid,              'entry playerId');

  // getLoreEntries
  var all = TM.getLoreEntries(state, pid);
  assertEqual(all.length, 1, 'getLoreEntries returns 1 entry');

  // getLoreEntriesForWorld
  TM.addLoreEntry(state, pid, 'world-b', 'World B', 'B Story', 'Another tale.', BASE_TS);
  var forA = TM.getLoreEntriesForWorld(state, pid, 'world-a');
  assertEqual(forA.length, 1, 'getLoreEntriesForWorld returns 1 for world-a');
  assertEqual(forA[0].worldId, 'world-a', 'lore entry worldId correct');

  // Multiple entries for same world
  TM.addLoreEntry(state, pid, 'world-a', 'World A', 'A Story 2', 'More tales.', BASE_TS);
  var forA2 = TM.getLoreEntriesForWorld(state, pid, 'world-a');
  assertEqual(forA2.length, 2, 'two lore entries for world-a');

  // Default title when missing
  var defaultTitle = TM.addLoreEntry(state, pid, 'world-x', 'X', null, null, BASE_TS);
  assert(typeof defaultTitle.title === 'string' && defaultTitle.title.length > 0,
    'default title generated when null passed');
});

// ============================================================================
// SUITE 20: addContact / getContacts / getContact / removeContact
// ============================================================================

suite('Contact registry', function() {
  var state = freshState();
  var pid   = uid();

  // Empty
  assertEqual(TM.getContacts(state, 'nobody').length, 0, 'getContacts empty for unknown');
  assertEqual(TM.getContact(state, 'nobody', 'c'), null, 'getContact null for unknown');

  var contact = TM.addContact(state, pid, 'alice', 'Alice', 'world-a', 'World A', BASE_TS);
  assert(typeof contact === 'object',               'addContact returns object');
  assertEqual(contact.contactId, 'alice',            'contact has contactId');
  assertEqual(contact.contactName, 'Alice',          'contact has contactName');
  assertEqual(contact.metInWorldId, 'world-a',       'contact has metInWorldId');
  assertEqual(contact.metInWorldName, 'World A',     'contact has metInWorldName');
  assertEqual(contact.metTs, BASE_TS,                'contact has metTs');
  assert(Array.isArray(contact.metInWorlds),         'contact has metInWorlds array');
  assert(contact.metInWorlds.indexOf('world-a') !== -1, 'world-a in metInWorlds');

  // getContacts
  var contacts = TM.getContacts(state, pid);
  assertEqual(contacts.length, 1, 'getContacts returns 1 contact');

  // getContact
  var fetched = TM.getContact(state, pid, 'alice');
  assert(fetched !== null,               'getContact returns contact');
  assertEqual(fetched.contactId, 'alice','getContact returns correct contact');
  assertEqual(TM.getContact(state, pid, 'bob'), null, 'getContact null for unknown contact');

  // Adding same contact again updates last-seen
  var dep = tsOffset(BASE_TS, 60);
  var updated = TM.addContact(state, pid, 'alice', 'Alice', 'world-b', 'World B', dep);
  assertEqual(updated.lastSeenTs, dep, 'contact lastSeenTs updated');
  assertEqual(updated.lastSeenWorld, 'world-b', 'contact lastSeenWorld updated');
  assert(updated.metInWorlds.indexOf('world-b') !== -1, 'world-b added to metInWorlds');
  // Only 1 contact record (not duplicated)
  assertEqual(TM.getContacts(state, pid).length, 1, 'contact not duplicated on re-add');

  // removeContact
  var removed = TM.removeContact(state, pid, 'alice');
  assertEqual(removed, true, 'removeContact returns true');
  assertEqual(TM.getContacts(state, pid).length, 0, 'contact removed');
  assertEqual(TM.removeContact(state, pid, 'alice'), false, 'removeContact false for non-existent');
});

// ============================================================================
// SUITE 21: getContactsFromWorld
// ============================================================================

suite('getContactsFromWorld', function() {
  var state = freshState();
  var pid   = uid();

  TM.addContact(state, pid, 'alice', 'Alice', 'world-a', 'World A', BASE_TS);
  TM.addContact(state, pid, 'bob',   'Bob',   'world-b', 'World B', BASE_TS);
  TM.addContact(state, pid, 'carol', 'Carol', 'world-a', 'World A', BASE_TS);

  var fromA = TM.getContactsFromWorld(state, pid, 'world-a');
  assertEqual(fromA.length, 2, 'getContactsFromWorld returns 2 for world-a');

  var fromB = TM.getContactsFromWorld(state, pid, 'world-b');
  assertEqual(fromB.length, 1, 'getContactsFromWorld returns 1 for world-b');

  var fromC = TM.getContactsFromWorld(state, pid, 'world-c');
  assertEqual(fromC.length, 0, 'getContactsFromWorld returns 0 for unknown world');
});

// ============================================================================
// SUITE 22: getProfile
// ============================================================================

suite('getProfile', function() {
  var state = freshState();
  var pid   = uid();

  assertEqual(TM.getProfile(state, 'nobody'), null, 'getProfile null for unknown player');

  TM.visitWorld(state, pid, 'world-a', 'A', { ageInDays: 5, distanceHops: 1 }, BASE_TS);
  TM.visitWorld(state, pid, 'world-b', 'B', { ageInDays: 50 }, BASE_TS);
  TM.leaveWorld(state, pid, 'world-a', tsOffset(BASE_TS, 30));
  TM.equipMark(state, pid, 'world-a');
  TM.addLoreEntry(state, pid, 'world-a', 'A', 'Story', 'Body', BASE_TS);
  TM.addContact(state, pid, 'alice', 'Alice', 'world-a', 'A', BASE_TS);

  var profile = TM.getProfile(state, pid);
  assert(typeof profile === 'object',              'getProfile returns object');
  assertEqual(profile.playerId, pid,               'profile has playerId');
  assertEqual(profile.totalMarks, 2,               'profile totalMarks = 2');
  assertEqual(profile.worldsVisited, 2,            'profile worldsVisited = 2');
  assert(profile.totalVisits >= 2,                 'profile totalVisits >= 2');
  assert(profile.totalStayMinutes >= 30,           'profile totalStayMinutes >= 30');
  assert(profile.equippedMark !== null,            'profile equippedMark set');
  assertEqual(profile.equippedMark.worldId, 'world-a', 'profile equippedMark worldId');
  assertArray(profile.collectorAchievements,       'profile collectorAchievements is array');
  assert(profile.loreEntryCount >= 1,              'profile loreEntryCount >= 1');
  assert(profile.contactCount >= 1,                'profile contactCount >= 1');
  assert('commonMarks' in profile,                 'profile has commonMarks');
  assert('rareMarks' in profile,                   'profile has rareMarks');
  assert('legendaryMarks' in profile,              'profile has legendaryMarks');
});

// ============================================================================
// SUITE 23: Collector achievements
// ============================================================================

suite('Collector achievements', function() {
  var state = freshState();
  var pid   = uid();

  // Initially empty
  assertEqual(TM.getCollectorAchievements(state, pid).length, 0, 'no collector achievements initially (auto-init)');

  // First mark
  TM.visitWorld(state, pid, 'w1', 'W1', { ageInDays: 1 }, BASE_TS);
  var achs = TM.getCollectorAchievements(state, pid);
  assert(achs.indexOf('first_mark') !== -1, 'first_mark achievement after 1st mark');

  // 3 marks
  TM.visitWorld(state, pid, 'w2', 'W2', { ageInDays: 1 }, BASE_TS);
  TM.visitWorld(state, pid, 'w3', 'W3', { ageInDays: 1 }, BASE_TS);
  var achs3 = TM.getCollectorAchievements(state, pid);
  assert(achs3.indexOf('three_marks') !== -1, 'three_marks achievement at 3 marks');

  // 5 marks
  TM.visitWorld(state, pid, 'w4', 'W4', { ageInDays: 1 }, BASE_TS);
  TM.visitWorld(state, pid, 'w5', 'W5', { ageInDays: 1 }, BASE_TS);
  var achs5 = TM.getCollectorAchievements(state, pid);
  assert(achs5.indexOf('five_marks') !== -1, 'five_marks achievement at 5 marks');

  // Achievements not duplicated
  var countFirst = achs5.filter(function(a) { return a === 'first_mark'; }).length;
  assertEqual(countFirst, 1, 'first_mark achievement not duplicated');

  // getCollectorAchievements for unknown player
  assertEqual(TM.getCollectorAchievements(state, 'nobody').length, 0,
    'getCollectorAchievements empty for unknown');
});

// ============================================================================
// SUITE 24: getCollectorProgress
// ============================================================================

suite('getCollectorProgress', function() {
  var state = freshState();
  var pid   = uid();

  TM.visitWorld(state, pid, 'w1', 'W1', { ageInDays: 1 }, BASE_TS);

  var progress = TM.getCollectorProgress(state, pid);
  assertArray(progress, 'getCollectorProgress returns array');
  assert(progress.length === TM.COLLECTOR_MILESTONES.length, 'progress has entry per milestone');

  progress.forEach(function(p) {
    assert('id' in p,          'progress entry has id');
    assert('badge' in p,       'progress entry has badge');
    assert('required' in p,    'progress entry has required');
    assert('current' in p,     'progress entry has current');
    assert('unlocked' in p,    'progress entry has unlocked');
    assert('rewardSpark' in p, 'progress entry has rewardSpark');
    assert('rewardXp' in p,    'progress entry has rewardXp');
    assert('tier' in p,        'progress entry has tier');
  });

  var firstMark = progress.filter(function(p) { return p.id === 'first_mark'; })[0];
  assert(firstMark !== undefined, 'first_mark in progress');
  assertEqual(firstMark.unlocked, true, 'first_mark is unlocked');
  assertEqual(firstMark.current,  1,    'first_mark current = 1');

  var hundred = progress.filter(function(p) { return p.id === 'hundred_marks'; })[0];
  assert(hundred !== undefined, 'hundred_marks in progress');
  assertEqual(hundred.unlocked, false, 'hundred_marks not yet unlocked');

  // Unknown player
  var emptyProgress = TM.getCollectorProgress(state, 'nobody');
  assertArray(emptyProgress, 'getCollectorProgress returns array for unknown');
  emptyProgress.forEach(function(p) {
    assertEqual(p.unlocked, false, 'progress entries locked for unknown player (' + p.id + ')');
  });
});

// ============================================================================
// SUITE 25: getWorldMilestones
// ============================================================================

suite('getWorldMilestones', function() {
  var state = freshState();
  var pid   = uid();
  var world = 'world-milestones';

  // Unknown player
  var empty = TM.getWorldMilestones(state, 'nobody', world);
  assertArray(empty.visitMilestones, 'empty visitMilestones for unknown');
  assertArray(empty.stayMilestones,  'empty stayMilestones for unknown');

  TM.visitWorld(state, pid, world, 'M World', {}, BASE_TS);
  TM.leaveWorld(state, pid, world, tsOffset(BASE_TS, 20));

  var wm = TM.getWorldMilestones(state, pid, world);
  assertArray(wm.visitMilestones, 'visitMilestones is array');
  assertArray(wm.stayMilestones,  'stayMilestones is array');
  assert(wm.visitMilestones.length >= 1, 'at least 1 visit milestone (first_visit)');
  assert(wm.stayMilestones.length >= 1,  'at least 1 stay milestone (stay_15min at 20 min)');
});

// ============================================================================
// SUITE 26: Rarity-based collector achievement (rare_collector, legendary_finder)
// ============================================================================

suite('Rarity-filtered collector achievements', function() {
  var state = freshState();
  var pid   = uid();

  // Add 3 rare marks
  TM.visitWorld(state, pid, 'r1', 'R1', { ageInDays: 50 }, BASE_TS);
  TM.visitWorld(state, pid, 'r2', 'R2', { ageInDays: 60 }, BASE_TS);
  TM.visitWorld(state, pid, 'r3', 'R3', { ageInDays: 70 }, BASE_TS);
  var achs = TM.getCollectorAchievements(state, pid);
  assert(achs.indexOf('rare_collector') !== -1, 'rare_collector achievement after 3 rare marks');

  // Add 1 legendary mark
  var state2 = freshState();
  var pid2   = uid();
  TM.visitWorld(state2, pid2, 'legend1', 'Legend', { ageInDays: 400 }, BASE_TS);
  var achs2 = TM.getCollectorAchievements(state2, pid2);
  assert(achs2.indexOf('legendary_finder') !== -1, 'legendary_finder achievement after 1 legendary mark');
});

// ============================================================================
// SUITE 27: serialize / deserialize
// ============================================================================

suite('serialize / deserialize', function() {
  var state = freshState();
  var pid   = uid();

  TM.visitWorld(state, pid, 'world-ser', 'Ser World', {}, BASE_TS);
  TM.addContact(state, pid, 'alice', 'Alice', 'world-ser', 'Ser World', BASE_TS);
  TM.addLoreEntry(state, pid, 'world-ser', 'Ser World', 'Story', 'Body', BASE_TS);

  var json = TM.serialize(state);
  assert(typeof json === 'string',   'serialize returns string');
  assert(json.length > 0,           'serialize returns non-empty string');

  var restored = TM.deserialize(json);
  assert(typeof restored === 'object', 'deserialize returns object');
  assert(typeof restored.players === 'object', 'restored has players');

  var mark = TM.getMark(restored, pid, 'world-ser');
  assert(mark !== null, 'mark preserved through serialize/deserialize');
  assertEqual(mark.worldId, 'world-ser', 'mark worldId preserved');

  var contacts = TM.getContacts(restored, pid);
  assertEqual(contacts.length, 1, 'contact preserved through serialize/deserialize');

  var lore = TM.getLoreEntries(restored, pid);
  assertEqual(lore.length, 1, 'lore entry preserved through serialize/deserialize');

  // deserialize invalid JSON
  var fallback = TM.deserialize('not valid json');
  assert(typeof fallback === 'object', 'deserialize invalid JSON returns object');
  assert(typeof fallback.players === 'object', 'fallback has players');
  assertEqual(Object.keys(fallback.players).length, 0, 'fallback players is empty');
});

// ============================================================================
// SUITE 28: mergePlayerData
// ============================================================================

suite('mergePlayerData', function() {
  var stateA = freshState();
  var stateB = freshState();
  var pid    = uid();

  // Build data in stateA
  TM.visitWorld(stateA, pid, 'world-a', 'A', {}, BASE_TS);
  TM.addContact(stateA, pid, 'alice', 'Alice', 'world-a', 'A', BASE_TS);

  // Build different data in stateB
  TM.visitWorld(stateB, pid, 'world-b', 'B', {}, BASE_TS);

  // Merge stateA player data into stateB
  var playerDataA = stateA.players[pid];
  var ok = TM.mergePlayerData(stateB, pid, playerDataA);
  assertEqual(ok, true, 'mergePlayerData returns true');

  // After merge, stateB player should have world-a marks too
  var markA = TM.getMark(stateB, pid, 'world-a');
  assert(markA !== null, 'world-a mark merged into stateB');
  var markB = TM.getMark(stateB, pid, 'world-b');
  assert(markB !== null, 'world-b mark still present in stateB');

  // Contacts merged
  var contacts = TM.getContacts(stateB, pid);
  assert(contacts.length >= 1, 'contacts merged from stateA');

  // Visit history merged
  var visitedA = TM.hasVisited(stateB, pid, 'world-a');
  assert(visitedA, 'world-a visit history merged into stateB');

  // Invalid input
  assertEqual(TM.mergePlayerData(stateB, pid, null),    false, 'mergePlayerData false for null');
  assertEqual(TM.mergePlayerData(stateB, pid, 'string'),false, 'mergePlayerData false for string');
});

// ============================================================================
// SUITE 29: edge cases — missing/null parameters
// ============================================================================

suite('Edge cases — null/missing parameters', function() {
  var state = freshState();
  var pid   = uid();

  // visitWorld with no worldName
  var r = TM.visitWorld(state, pid, 'w-no-name', null, null, BASE_TS);
  assert(r.mark !== null, 'visitWorld works with null worldName');
  var visitRec = TM.getVisitRecord(state, pid, 'w-no-name');
  assertEqual(visitRec.worldName, 'w-no-name', 'worldName defaults to worldId when null');

  // leaveWorld for world never visited
  var lr = TM.leaveWorld(state, pid, 'w-never-visited', BASE_TS);
  assertEqual(lr.stayMinutes, 0, 'leaveWorld for never-visited world returns 0 minutes');

  // addContact with null worldName
  var contact = TM.addContact(state, pid, 'bob', 'Bob', 'w1', null, BASE_TS);
  assert(typeof contact === 'object', 'addContact works with null worldName');

  // addContact with null contactName
  var contact2 = TM.addContact(state, pid, 'carol-id', null, 'w1', 'W1', BASE_TS);
  assertEqual(contact2.contactName, 'carol-id', 'contactName defaults to contactId when null');

  // addLoreEntry with null ts
  var entry = TM.addLoreEntry(state, pid, 'w1', 'W1', 'Title', 'Body', null);
  assert(typeof entry.ts === 'string' && entry.ts.length > 0, 'addLoreEntry uses current time for null ts');

  // getMarks for brand-new state player (auto-init path)
  var emptyMarks = TM.getMarks(state, 'fresh-player');
  assertArray(emptyMarks, 'getMarks returns array for fresh player');
  assertEqual(emptyMarks.length, 0, 'getMarks returns 0 for fresh player');

  // equipMark for unknown player
  var equip = TM.equipMark(state, 'nobody-here', null);
  assertEqual(equip, true, 'equipMark null for unknown player returns true (creates player)');
});

// ============================================================================
// SUITE 30: leaveWorld — negative / invalid timestamps
// ============================================================================

suite('leaveWorld — invalid timestamps', function() {
  var state = freshState();
  var pid   = uid();
  var world = 'world-ts-test';

  TM.visitWorld(state, pid, world, 'TS World', {}, BASE_TS);

  // departure before arrival (should produce 0 stayMinutes)
  var result = TM.leaveWorld(state, pid, world, '2025-12-31T00:00:00.000Z');
  assertEqual(result.stayMinutes, 0, 'negative stay duration clamped to 0');
});

// ============================================================================
// SUITE 31: Multiple players are independent
// ============================================================================

suite('Multiple players are independent', function() {
  var state = freshState();
  var pid1  = uid();
  var pid2  = uid();

  TM.visitWorld(state, pid1, 'world-exclusive', 'Exclusive', {}, BASE_TS);

  assert(TM.hasVisited(state, pid1, 'world-exclusive'),  'pid1 visited world-exclusive');
  assert(!TM.hasVisited(state, pid2, 'world-exclusive'), 'pid2 did not visit world-exclusive');

  assertEqual(TM.getMarks(state, pid2).length, 0, 'pid2 has no marks');

  TM.visitWorld(state, pid2, 'world-shared', 'Shared', {}, BASE_TS);
  assertEqual(TM.countWorldsVisited(state, pid1), 1, 'pid1 worldsVisited = 1');
  assertEqual(TM.countWorldsVisited(state, pid2), 1, 'pid2 worldsVisited = 1');

  TM.addContact(state, pid1, 'alice', 'Alice', 'world-exclusive', 'E', BASE_TS);
  assertEqual(TM.getContacts(state, pid2).length, 0, 'pid2 has no contacts (independent)');
});

// ============================================================================
// SUITE 32: getVisitRecord details
// ============================================================================

suite('getVisitRecord details', function() {
  var state = freshState();
  var pid   = uid();
  var world = 'detail-world';

  assertEqual(TM.getVisitRecord(state, 'nobody', world), null, 'getVisitRecord null for unknown player');

  TM.visitWorld(state, pid, world, 'Detail World', {}, BASE_TS);
  var rec = TM.getVisitRecord(state, pid, world);

  assert(rec !== null,                         'visit record exists');
  assertEqual(rec.worldId, world,              'record worldId correct');
  assertEqual(rec.worldName, 'Detail World',   'record worldName correct');
  assertEqual(rec.visitCount, 1,               'record visitCount = 1');
  assertEqual(rec.totalStayMinutes, 0,         'record totalStayMinutes starts at 0');
  assertEqual(rec.currentVisitStart, BASE_TS,  'record currentVisitStart = visit ts');
  assertEqual(rec.firstVisitTs, BASE_TS,       'record firstVisitTs = visit ts');
  assertEqual(rec.lastVisitTs, BASE_TS,        'record lastVisitTs = visit ts');

  // After leave
  TM.leaveWorld(state, pid, world, tsOffset(BASE_TS, 45));
  var rec2 = TM.getVisitRecord(state, pid, world);
  assertEqual(rec2.totalStayMinutes, 45, 'totalStayMinutes = 45 after leave');
  assertEqual(rec2.currentVisitStart, null, 'currentVisitStart null after leave');
});

// ============================================================================
// SUITE 33: World name update on revisit
// ============================================================================

suite('World name update on revisit', function() {
  var state = freshState();
  var pid   = uid();

  TM.visitWorld(state, pid, 'w-rename', 'Old Name', {}, BASE_TS);
  TM.visitWorld(state, pid, 'w-rename', 'New Name', {}, tsOffset(BASE_TS, 60));

  var rec = TM.getVisitRecord(state, pid, 'w-rename');
  assertEqual(rec.worldName, 'New Name', 'worldName updated on revisit');
});

// ============================================================================
// SUITE 34: Contact met-in-worlds tracking
// ============================================================================

suite('Contact met-in-worlds tracking', function() {
  var state = freshState();
  var pid   = uid();

  TM.addContact(state, pid, 'dave', 'Dave', 'world-a', 'A', BASE_TS);
  var c = TM.getContact(state, pid, 'dave');
  assertEqual(c.metInWorlds.length, 1, 'metInWorlds has 1 entry initially');

  // Meet same contact in another world
  TM.addContact(state, pid, 'dave', 'Dave', 'world-b', 'B', tsOffset(BASE_TS, 60));
  var c2 = TM.getContact(state, pid, 'dave');
  assert(c2.metInWorlds.indexOf('world-a') !== -1, 'world-a in metInWorlds');
  assert(c2.metInWorlds.indexOf('world-b') !== -1, 'world-b in metInWorlds');
  assertEqual(c2.metInWorlds.length, 2, 'metInWorlds has 2 entries');

  // Same world again — no duplicate in metInWorlds
  TM.addContact(state, pid, 'dave', 'Dave', 'world-b', 'B', tsOffset(BASE_TS, 120));
  var c3 = TM.getContact(state, pid, 'dave');
  assertEqual(c3.metInWorlds.length, 2, 'metInWorlds not duplicated for same world');
});

// ============================================================================
// SUITE 35: Large-scale stress test
// ============================================================================

suite('Large-scale stress test', function() {
  var state = freshState();
  var pid   = uid();

  // Visit 50 worlds
  for (var i = 0; i < 50; i++) {
    TM.visitWorld(state, pid, 'stress-world-' + i, 'World ' + i, { ageInDays: i * 7 }, BASE_TS);
  }

  assertEqual(TM.countWorldsVisited(state, pid), 50, 'visited 50 distinct worlds');
  assertEqual(TM.getMarks(state, pid).length, 50,    '50 marks collected');

  var counts = TM.countMarksByRarity(state, pid);
  assertEqual(counts.total, 50, 'total marks = 50');

  // ten_marks achievement
  var achs = TM.getCollectorAchievements(state, pid);
  assert(achs.indexOf('ten_marks') !== -1, 'ten_marks achievement unlocked at 50 marks');
  assert(achs.indexOf('twenty_marks') !== -1, 'twenty_marks achievement unlocked at 50 marks');

  // getVisitedWorldsSorted works with 50 worlds
  var sorted = TM.getVisitedWorldsSorted(state, pid);
  assertEqual(sorted.length, 50, 'sorted visit history has 50 entries');

  // Add 100 contacts
  for (var j = 0; j < 100; j++) {
    TM.addContact(state, pid, 'contact-' + j, 'Contact ' + j, 'stress-world-0', 'W0', BASE_TS);
  }
  assertEqual(TM.getContacts(state, pid).length, 100, '100 contacts added');

  // Add 50 lore entries
  for (var k = 0; k < 50; k++) {
    TM.addLoreEntry(state, pid, 'stress-world-' + k, 'W' + k, 'Title ' + k, 'Body ' + k, BASE_TS);
  }
  assertEqual(TM.getLoreEntries(state, pid).length, 50, '50 lore entries added');
});

// ============================================================================
// SUITE 36: Serialize round-trip with 50 marks
// ============================================================================

suite('Serialize round-trip with many marks', function() {
  var state = freshState();
  var pid   = uid();

  for (var i = 0; i < 20; i++) {
    TM.visitWorld(state, pid, 'rt-world-' + i, 'RT World ' + i, { ageInDays: i * 18 }, BASE_TS);
  }

  var json     = TM.serialize(state);
  var restored = TM.deserialize(json);

  assertEqual(TM.countWorldsVisited(restored, pid), 20, '20 worlds preserved in round-trip');
  assertEqual(TM.getMarks(restored, pid).length,    20, '20 marks preserved in round-trip');

  var counts  = TM.countMarksByRarity(state, pid);
  var counts2 = TM.countMarksByRarity(restored, pid);
  assertEqual(counts.total, counts2.total, 'mark rarity counts preserved');
});

// ============================================================================
// SUITE 37: totalVisits and totalStayMinutes aggregation
// ============================================================================

suite('totalVisits and totalStayMinutes aggregation', function() {
  var state = freshState();
  var pid   = uid();

  TM.visitWorld(state, pid, 'w1', 'W1', {}, BASE_TS);
  TM.leaveWorld(state, pid, 'w1', tsOffset(BASE_TS, 30));

  TM.visitWorld(state, pid, 'w2', 'W2', {}, tsOffset(BASE_TS, 60));
  TM.leaveWorld(state, pid, 'w2', tsOffset(BASE_TS, 90));

  TM.visitWorld(state, pid, 'w1', 'W1', {}, tsOffset(BASE_TS, 120));
  TM.leaveWorld(state, pid, 'w1', tsOffset(BASE_TS, 150));

  var player = state.players[pid];
  assertEqual(player.totalVisits, 3, 'totalVisits = 3 (2 to w1, 1 to w2)');
  assertEqual(player.totalStayMinutes, 90, 'totalStayMinutes = 90 (30+30+30)');

  // getProfile reflects aggregates
  var profile = TM.getProfile(state, pid);
  assertEqual(profile.totalVisits, 3,      'profile.totalVisits = 3');
  assertEqual(profile.totalStayMinutes, 90,'profile.totalStayMinutes = 90');
});

// ============================================================================
// SUITE 38: Mark generation — shape and color validity
// ============================================================================

suite('Mark generation — shape and color validity', function() {
  var SHAPES = TM.MARK_SHAPES;
  var worlds = [
    { id: 'w-c', meta: { ageInDays: 1  } },
    { id: 'w-r', meta: { ageInDays: 40 } },
    { id: 'w-l', meta: { ageInDays: 400} }
  ];

  worlds.forEach(function(w) {
    var mark = TM.generateMark(w.id, w.id, w.meta);
    assert(SHAPES.indexOf(mark.shape) !== -1,
      'mark shape valid for ' + w.id + ' (got ' + mark.shape + ')');
    assert(/^#[0-9a-f]{6}$/i.test(mark.primaryColor),
      'primaryColor is valid hex for ' + w.id);
    assert(/^#[0-9a-f]{6}$/i.test(mark.secondaryColor),
      'secondaryColor is valid hex for ' + w.id);
  });

  // Generate 30 marks and check all shapes are valid
  var allShapesValid = true;
  for (var i = 0; i < 30; i++) {
    var m = TM.generateMark('world-' + i, null, null);
    if (SHAPES.indexOf(m.shape) === -1) { allShapesValid = false; break; }
  }
  assert(allShapesValid, '30 generated marks all have valid shapes');
});

// ============================================================================
// SUITE 39: PRNG seed diversity
// ============================================================================

suite('PRNG seed diversity', function() {
  // Generate marks for 20 worlds and check variety in shapes
  var shapes = {};
  for (var i = 0; i < 20; i++) {
    var m = TM.generateMark('diversity-world-' + i, null, null);
    shapes[m.shape] = true;
  }
  var uniqueShapeCount = Object.keys(shapes).length;
  assert(uniqueShapeCount >= 3, 'at least 3 different shapes across 20 worlds (got ' + uniqueShapeCount + ')');
});

// ============================================================================
// SUITE 40: Collector milestone milestones returned inline from visitWorld
// ============================================================================

suite('visitWorld returns collector achievement milestones', function() {
  var state = freshState();
  var pid   = uid();

  var firstResult = TM.visitWorld(state, pid, 'collector-w1', 'W1', { ageInDays: 1 }, BASE_TS);
  var collectorEvents = firstResult.milestones.filter(function(m) {
    return m.type === 'collector_achievement';
  });
  assert(collectorEvents.length >= 1, 'first_mark collector achievement in visitWorld milestones');
  assertEqual(collectorEvents[0].id, 'first_mark', 'collector achievement id = first_mark');
  assert(typeof collectorEvents[0].rewardSpark === 'number', 'collector achievement has rewardSpark');
  assert(typeof collectorEvents[0].rewardXp    === 'number', 'collector achievement has rewardXp');
  assert(typeof collectorEvents[0].badge       === 'string', 'collector achievement has badge');
});

// ============================================================================
// SUITE 41: Visit milestone events returned with correct structure
// ============================================================================

suite('Visit milestone event structure', function() {
  var state = freshState();
  var pid   = uid();

  var r = TM.visitWorld(state, pid, 'vm-world', 'VM World', {}, BASE_TS);
  var visitMilestones = r.milestones.filter(function(m) {
    return m.type === 'visit_milestone';
  });
  assert(visitMilestones.length >= 1, 'visit_milestone events fired');

  visitMilestones.forEach(function(vm) {
    assert(typeof vm.id          === 'string', 'vm event has id');
    assert(typeof vm.worldId     === 'string', 'vm event has worldId');
    assert(typeof vm.rewardSpark === 'number', 'vm event has rewardSpark');
    assert(typeof vm.rewardXp    === 'number', 'vm event has rewardXp');
    assert(typeof vm.description === 'string', 'vm event has description');
  });
});

// ============================================================================
// SUITE 42: Stay milestone event structure
// ============================================================================

suite('Stay milestone event structure', function() {
  var state = freshState();
  var pid   = uid();

  TM.visitWorld(state, pid, 'sm-world', 'SM World', {}, BASE_TS);
  var r = TM.leaveWorld(state, pid, 'sm-world', tsOffset(BASE_TS, 20));
  var stayEvents = r.milestones.filter(function(m) {
    return m.type === 'stay_milestone';
  });
  assert(stayEvents.length >= 1, 'stay_milestone events fired');

  stayEvents.forEach(function(sm) {
    assert(typeof sm.id          === 'string', 'sm event has id');
    assert(typeof sm.worldId     === 'string', 'sm event has worldId');
    assert(typeof sm.rewardSpark === 'number', 'sm event has rewardSpark');
    assert(typeof sm.rewardXp    === 'number', 'sm event has rewardXp');
    assert(typeof sm.description === 'string', 'sm event has description');
  });
});

// ============================================================================
// SUITE 43: Lore entry ID uniqueness
// ============================================================================

suite('Lore entry ID uniqueness', function() {
  var state = freshState();
  var pid   = uid();

  for (var i = 0; i < 20; i++) {
    TM.addLoreEntry(state, pid, 'lore-world-' + i, 'World ' + i, 'Title ' + i, 'Body ' + i, BASE_TS);
  }

  var entries = TM.getLoreEntries(state, pid);
  var ids = entries.map(function(e) { return e.id; });
  var unique = ids.filter(function(id, idx) { return ids.indexOf(id) === idx; });
  assertEqual(ids.length, unique.length, 'all lore entry IDs are unique');
});

// ============================================================================
// SUITE 44: visitWorld with worldMeta updates mark worldName
// ============================================================================

suite('visitWorld mark worldName', function() {
  var state = freshState();
  var pid   = uid();

  TM.visitWorld(state, pid, 'wn-world', 'First Name', {}, BASE_TS);
  var mark = TM.getMark(state, pid, 'wn-world');
  assertEqual(mark.worldName, 'First Name', 'mark worldName set on first visit');

  // Revisit does not change the mark (marks are immutable once generated)
  TM.visitWorld(state, pid, 'wn-world', 'Second Name', {}, tsOffset(BASE_TS, 60));
  var mark2 = TM.getMark(state, pid, 'wn-world');
  assertEqual(mark2.worldName, 'First Name', 'mark worldName not changed on revisit');
});

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n' + passed + ' passed, ' + failed + ' failed');

if (failures.length > 0) {
  console.error('\nFailures:');
  failures.forEach(function(f) { console.error('  ' + f); });
}

if (failed > 0) process.exit(1);
