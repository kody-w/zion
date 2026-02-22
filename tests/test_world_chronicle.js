/**
 * tests/test_world_chronicle.js
 * Comprehensive test suite for src/js/world_chronicle.js — ZION World Chronicle
 * Run with: node tests/test_world_chronicle.js
 * 200+ tests covering all features.
 */

'use strict';

var WC = require('../src/js/world_chronicle');

// ============================================================================
// TEST HARNESS
// ============================================================================

var passed = 0;
var failed = 0;
var failures = [];

function assert(condition, msg) {
  if (condition) {
    passed++;
    process.stdout.write('  ok - ' + msg + '\n');
  } else {
    failed++;
    failures.push(msg);
    process.stdout.write('  FAIL - ' + msg + '\n');
  }
}

function assertEqual(a, b, msg) {
  assert(a === b, msg + ' (expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a) + ')');
}

function assertGTE(a, b, msg) {
  assert(a >= b, msg + ' (' + a + ' >= ' + b + ')');
}

function assertLTE(a, b, msg) {
  assert(a <= b, msg + ' (' + a + ' <= ' + b + ')');
}

function assertNull(val, msg) {
  assert(val === null || val === undefined, msg + ' (expected null/undefined, got ' + JSON.stringify(val) + ')');
}

function assertNotNull(val, msg) {
  assert(val !== null && val !== undefined, msg + ' (value should exist)');
}

function assertArray(val, msg) {
  assert(Array.isArray(val), msg + ' (expected Array)');
}

function assertIn(arr, item, msg) {
  assert(arr.indexOf(item) !== -1, msg + ' (' + JSON.stringify(item) + ' should be in array)');
}

function assertNotIn(arr, item, msg) {
  assert(arr.indexOf(item) === -1, msg + ' (' + JSON.stringify(item) + ' should NOT be in array)');
}

function suite(name, fn) {
  process.stdout.write('\n=== ' + name + ' ===\n');
  fn();
}

// Helpers
var playerSeq = 0;
function uid() { return 'player_' + (++playerSeq); }

function fresh() {
  return WC.createChronicleState();
}

function addEntry(state, overrides) {
  var defaults = {
    type: 'social',
    title: 'Test Event',
    description: 'A test event description.',
    participants: [uid()],
    zone: 'nexus',
    metadata: { significance: 10 },
    timestamp: Date.now(),
    tags: ['test']
  };
  var opts = overrides || {};
  return WC.recordEvent(
    state,
    opts.type || defaults.type,
    opts.title || defaults.title,
    opts.description || defaults.description,
    opts.participants || defaults.participants,
    opts.zone !== undefined ? opts.zone : defaults.zone,
    opts.metadata !== undefined ? opts.metadata : defaults.metadata,
    opts.timestamp || defaults.timestamp,
    opts.tags || defaults.tags
  );
}

// ============================================================================
// SUITE 1: MODULE EXPORTS
// ============================================================================

suite('Module Exports', function() {
  assert(typeof WC.createChronicleState === 'function', 'createChronicleState is exported');
  assert(typeof WC.recordEvent === 'function', 'recordEvent is exported');
  assert(typeof WC.autoRecord === 'function', 'autoRecord is exported');
  assert(typeof WC.getChronicle === 'function', 'getChronicle is exported');
  assert(typeof WC.getChronicleByCategory === 'function', 'getChronicleByCategory is exported');
  assert(typeof WC.searchChronicle === 'function', 'searchChronicle is exported');
  assert(typeof WC.getTimeline === 'function', 'getTimeline is exported');
  assert(typeof WC.nominateHistoricMoment === 'function', 'nominateHistoricMoment is exported');
  assert(typeof WC.voteOnNomination === 'function', 'voteOnNomination is exported');
  assert(typeof WC.getNominations === 'function', 'getNominations is exported');
  assert(typeof WC.getHistoricMoments === 'function', 'getHistoricMoments is exported');
  assert(typeof WC.getNominationsForEntry === 'function', 'getNominationsForEntry is exported');
  assert(typeof WC.getPlayerHistory === 'function', 'getPlayerHistory is exported');
  assert(typeof WC.getPlayerStats === 'function', 'getPlayerStats is exported');
  assert(typeof WC.getCurrentEra === 'function', 'getCurrentEra is exported');
  assert(typeof WC.getEras === 'function', 'getEras is exported');
  assert(typeof WC.getEraEntries === 'function', 'getEraEntries is exported');
  assert(typeof WC.generateWeeklyDigest === 'function', 'generateWeeklyDigest is exported');
  assert(typeof WC.getWeeklyDigests === 'function', 'getWeeklyDigests is exported');
  assert(typeof WC.getWeeklyDigestByWeek === 'function', 'getWeeklyDigestByWeek is exported');
  assert(typeof WC.getStats === 'function', 'getStats is exported');
  assert(typeof WC.getEntry === 'function', 'getEntry is exported');
  assert(typeof WC.getRecentEntries === 'function', 'getRecentEntries is exported');
  assert(typeof WC.getZoneHistory === 'function', 'getZoneHistory is exported');
  assert(typeof WC.getTopEvents === 'function', 'getTopEvents is exported');
  assert(typeof WC.getSharedHistory === 'function', 'getSharedHistory is exported');
  assert(typeof WC.recordFirstBuild === 'function', 'recordFirstBuild is exported');
  assert(typeof WC.recordMajorAuction === 'function', 'recordMajorAuction is exported');
  assert(typeof WC.recordGuildWar === 'function', 'recordGuildWar is exported');
  assert(typeof WC.recordAmendment === 'function', 'recordAmendment is exported');
  assert(typeof WC.recordRaidKill === 'function', 'recordRaidKill is exported');
  assert(typeof WC.recordFederationConnection === 'function', 'recordFederationConnection is exported');
  assert(typeof WC.recordExplorationDiscovery === 'function', 'recordExplorationDiscovery is exported');
});

// ============================================================================
// SUITE 2: CONSTANTS
// ============================================================================

suite('Constants', function() {
  var cats = WC._EVENT_CATEGORIES;
  assertArray(cats, 'EVENT_CATEGORIES is an array');
  assertEqual(cats.length, 7, 'EVENT_CATEGORIES has 7 entries');
  assertIn(cats, 'construction', 'construction category exists');
  assertIn(cats, 'combat', 'combat category exists');
  assertIn(cats, 'economic', 'economic category exists');
  assertIn(cats, 'governance', 'governance category exists');
  assertIn(cats, 'social', 'social category exists');
  assertIn(cats, 'exploration', 'exploration category exists');
  assertIn(cats, 'federation', 'federation category exists');

  var zones = WC._ZONES_LIST;
  assertArray(zones, 'ZONES_LIST is an array');
  assertEqual(zones.length, 8, 'ZONES_LIST has 8 zones');
  assertIn(zones, 'nexus', 'nexus zone exists');
  assertIn(zones, 'gardens', 'gardens zone exists');
  assertIn(zones, 'arena', 'arena zone exists');

  var eras = WC._ERA_MILESTONES;
  assertArray(eras, 'ERA_MILESTONES is an array');
  assertGTE(eras.length, 5, 'ERA_MILESTONES has at least 5 entries');
  assert(eras[0].minEvents === 0, 'First era starts at 0');

  var thresholds = WC._SIGNIFICANCE_THRESHOLDS;
  assertNotNull(thresholds, 'SIGNIFICANCE_THRESHOLDS exists');
  assertNotNull(thresholds.construction, 'construction threshold exists');
  assertNotNull(thresholds.economic, 'economic threshold exists');

  assertEqual(typeof WC._HISTORIC_VOTE_THRESHOLD, 'number', 'HISTORIC_VOTE_THRESHOLD is a number');
  assertGTE(WC._HISTORIC_VOTE_THRESHOLD, 1, 'HISTORIC_VOTE_THRESHOLD >= 1');

  assertEqual(typeof WC._WEEKLY_DIGEST_SIZE, 'number', 'WEEKLY_DIGEST_SIZE is a number');
  assertGTE(WC._WEEKLY_DIGEST_SIZE, 1, 'WEEKLY_DIGEST_SIZE >= 1');

  assertEqual(typeof WC._PAGE_SIZE, 'number', 'PAGE_SIZE is a number');
  assertGTE(WC._PAGE_SIZE, 1, 'PAGE_SIZE >= 1');
});

// ============================================================================
// SUITE 3: createChronicleState
// ============================================================================

suite('createChronicleState', function() {
  var s = fresh();
  assertNotNull(s, 'state is created');
  assertArray(s.entries, 'state.entries is an array');
  assertEqual(s.entries.length, 0, 'state.entries starts empty');
  assertArray(s.historicMoments, 'state.historicMoments is an array');
  assertEqual(s.historicMoments.length, 0, 'state.historicMoments starts empty');
  assert(typeof s.nominations === 'object', 'state.nominations is an object');
  assert(typeof s.playerInvolvement === 'object', 'state.playerInvolvement is an object');
  assertArray(s.weeklyDigests, 'state.weeklyDigests is an array');
  assertEqual(s.weeklyDigests.length, 0, 'state.weeklyDigests starts empty');
  assertEqual(s.entryCounter, 0, 'entryCounter starts at 0');

  // Two states are independent
  var s1 = fresh();
  var s2 = fresh();
  addEntry(s1);
  assertEqual(s2.entries.length, 0, 'states are independent');
});

// ============================================================================
// SUITE 4: recordEvent — Basic
// ============================================================================

suite('recordEvent — Basic', function() {
  var s = fresh();

  // Valid event
  var r = WC.recordEvent(s, 'social', 'A Gathering', 'Many citizens met.', ['p1'], 'nexus', { significance: 5 }, 1000, ['social']);
  assert(r.success, 'recordEvent succeeds');
  assertNotNull(r.entry, 'entry is returned');
  assertEqual(r.entry.type, 'social', 'entry.type is set');
  assertEqual(r.entry.category, 'social', 'entry.category is set');
  assertEqual(r.entry.title, 'A Gathering', 'entry.title is set');
  assertEqual(r.entry.description, 'Many citizens met.', 'entry.description is set');
  assertEqual(r.entry.zone, 'nexus', 'entry.zone is set');
  assertEqual(r.entry.timestamp, 1000, 'entry.timestamp is set');
  assertArray(r.entry.participants, 'entry.participants is array');
  assert(r.entry.participants.indexOf('p1') !== -1, 'participant p1 is recorded');
  assertEqual(r.entry.significance, 5, 'significance from metadata is set');
  assertNotNull(r.entry.id, 'entry has id');
  assert(r.entry.id.indexOf('entry_') === 0, 'id starts with entry_');
  assertNotNull(r.entry.era, 'entry has era');
  assertEqual(r.entry.isHistoricMoment, false, 'isHistoricMoment defaults to false');
  assertEqual(s.entries.length, 1, 'entry added to state');

  // Invalid category
  var r2 = WC.recordEvent(s, 'invalid_cat', 'Test', 'Desc', [], null, {}, 0, []);
  assert(!r2.success, 'invalid category fails');
  assertNotNull(r2.reason, 'reason provided for invalid category');

  // Missing title
  var r3 = WC.recordEvent(s, 'social', '', 'Desc', [], null, {}, 0, []);
  assert(!r3.success, 'empty title fails');

  // Missing description
  var r4 = WC.recordEvent(s, 'social', 'Title', '', [], null, {}, 0, []);
  assert(!r4.success, 'empty description fails');

  // Null participants — defaults to empty array
  var r5 = WC.recordEvent(s, 'social', 'Title', 'Desc', null, null, {}, 0, []);
  assert(r5.success, 'null participants is handled');
  assertArray(r5.entry.participants, 'participants defaults to array');

  // Invalid zone is stored as null
  var r6 = WC.recordEvent(s, 'social', 'Title', 'Desc', [], 'badzone', {}, 0, []);
  assert(r6.success, 'bad zone is accepted (zone stored as null)');
  assertNull(r6.entry.zone, 'invalid zone stored as null');

  // All categories work
  var cats = WC._EVENT_CATEGORIES;
  cats.forEach(function(cat) {
    var res = WC.recordEvent(fresh(), cat, 'T', 'D', [], null, {}, 0, []);
    assert(res.success, 'category ' + cat + ' accepted');
  });
});

// ============================================================================
// SUITE 5: recordEvent — Entry ID sequencing
// ============================================================================

suite('recordEvent — Entry ID sequencing', function() {
  var s = fresh();
  var ids = [];
  for (var i = 0; i < 5; i++) {
    var r = addEntry(s);
    ids.push(r.entry.id);
  }
  // All IDs unique
  var idSet = {};
  ids.forEach(function(id) { idSet[id] = true; });
  assertEqual(Object.keys(idSet).length, 5, 'all 5 entry IDs are unique');
  // Sequentially increasing
  for (var j = 0; j < ids.length; j++) {
    assert(ids[j].indexOf('entry_') === 0, 'id ' + j + ' has correct prefix');
  }
});

// ============================================================================
// SUITE 6: autoRecord
// ============================================================================

suite('autoRecord', function() {
  // economic threshold is 500
  var s = fresh();

  // Below threshold
  var r1 = WC.autoRecord(s, 'economic', 'Small Sale', 'Desc', [], 'nexus', { significance: 100 }, 0, []);
  assert(!r1.recorded, 'economic event below threshold is not recorded');
  assertEqual(s.entries.length, 0, 'no entry created for sub-threshold event');

  // Above threshold
  var r2 = WC.autoRecord(s, 'economic', 'Big Sale', 'Desc', [], 'nexus', { significance: 600 }, 0, []);
  assert(r2.recorded, 'economic event above threshold is recorded');
  assertEqual(s.entries.length, 1, 'entry created for above-threshold event');

  // Governance threshold is 0 — all governance events recorded
  var s2 = fresh();
  var r3 = WC.autoRecord(s2, 'governance', 'Vote', 'Desc', [], null, { significance: 0 }, 0, []);
  assert(r3.recorded, 'governance event always recorded');

  // Federation threshold is 1
  var s3 = fresh();
  var r4 = WC.autoRecord(s3, 'federation', 'Link', 'Desc', [], null, { significance: 1 }, 0, []);
  assert(r4.recorded, 'federation event at threshold 1 is recorded');

  // Invalid category
  var r5 = WC.autoRecord(fresh(), 'bogus', 'T', 'D', [], null, {}, 0, []);
  assert(!r5.recorded, 'invalid category not recorded in autoRecord');
});

// ============================================================================
// SUITE 7: getChronicle — Pagination
// ============================================================================

suite('getChronicle — Pagination', function() {
  var s = fresh();

  // Empty
  var empty = WC.getChronicle(s, 0);
  assertEqual(empty.totalEntries, 0, 'empty state has 0 entries');
  assertArray(empty.entries, 'empty result has entries array');
  assertEqual(empty.totalPages, 0, 'empty state has 0 total pages');

  // Add 25 entries
  for (var i = 0; i < 25; i++) {
    addEntry(s, { title: 'Event ' + i, description: 'Desc ' + i });
  }

  var page0 = WC.getChronicle(s, 0, 10);
  assertEqual(page0.totalEntries, 25, 'totalEntries is 25');
  assertEqual(page0.entries.length, 10, 'page 0 has 10 entries');
  assertEqual(page0.page, 0, 'page index is 0');
  assertEqual(page0.pageSize, 10, 'pageSize is 10');
  assertEqual(page0.totalPages, 3, 'totalPages is 3');

  var page1 = WC.getChronicle(s, 1, 10);
  assertEqual(page1.entries.length, 10, 'page 1 has 10 entries');
  assertEqual(page1.page, 1, 'page index is 1');

  var page2 = WC.getChronicle(s, 2, 10);
  assertEqual(page2.entries.length, 5, 'page 2 has 5 remaining entries');

  // Default page size
  var defaultPage = WC.getChronicle(s, 0);
  assertEqual(defaultPage.pageSize, WC._PAGE_SIZE, 'default page size matches constant');

  // No overlap between pages
  var ids0 = page0.entries.map(function(e) { return e.id; });
  var ids1 = page1.entries.map(function(e) { return e.id; });
  ids0.forEach(function(id) {
    assertNotIn(ids1, id, 'page 0 entry ' + id + ' not in page 1');
  });
});

// ============================================================================
// SUITE 8: getChronicleByCategory
// ============================================================================

suite('getChronicleByCategory', function() {
  var s = fresh();

  for (var i = 0; i < 5; i++) {
    addEntry(s, { type: 'combat', title: 'Battle ' + i, description: 'Fight ' + i });
  }
  for (var j = 0; j < 3; j++) {
    addEntry(s, { type: 'economic', title: 'Trade ' + j, description: 'Deal ' + j });
  }

  var combatResult = WC.getChronicleByCategory(s, 'combat', 0, 20);
  assertEqual(combatResult.totalEntries, 5, 'combat category has 5 entries');
  combatResult.entries.forEach(function(e) {
    assertEqual(e.category, 'combat', 'each entry is combat category');
  });

  var econResult = WC.getChronicleByCategory(s, 'economic', 0, 20);
  assertEqual(econResult.totalEntries, 3, 'economic category has 3 entries');

  // Invalid category
  var badResult = WC.getChronicleByCategory(s, 'invalid', 0, 20);
  assertEqual(badResult.totalEntries, 0, 'invalid category returns 0 entries');

  // Pagination within category
  var page0 = WC.getChronicleByCategory(s, 'combat', 0, 3);
  assertEqual(page0.entries.length, 3, 'category page 0 has 3 entries');
  assertEqual(page0.totalPages, 2, 'category has 2 pages');

  var page1 = WC.getChronicleByCategory(s, 'combat', 1, 3);
  assertEqual(page1.entries.length, 2, 'category page 1 has 2 entries');
});

// ============================================================================
// SUITE 9: getTimeline
// ============================================================================

suite('getTimeline', function() {
  var s = fresh();
  var now = 1000;
  addEntry(s, { type: 'combat', zone: 'arena', timestamp: 1500 });
  addEntry(s, { type: 'social', zone: 'nexus', timestamp: 500 });
  addEntry(s, { type: 'combat', zone: 'arena', timestamp: 1000 });
  addEntry(s, { type: 'economic', zone: 'agora', timestamp: 800 });

  // All entries sorted ascending
  var all = WC.getTimeline(s, null);
  assertEqual(all.length, 4, 'getTimeline returns all entries');
  assert(all[0].timestamp <= all[1].timestamp, 'timeline is sorted ascending (0,1)');
  assert(all[1].timestamp <= all[2].timestamp, 'timeline is sorted ascending (1,2)');
  assert(all[2].timestamp <= all[3].timestamp, 'timeline is sorted ascending (2,3)');

  // Filter by category
  var combatTimeline = WC.getTimeline(s, { category: 'combat' });
  assertEqual(combatTimeline.length, 2, 'combat timeline has 2 entries');
  combatTimeline.forEach(function(e) { assertEqual(e.category, 'combat', 'timeline entry is combat'); });

  // Filter by zone
  var arenaTimeline = WC.getTimeline(s, { zone: 'arena' });
  assertEqual(arenaTimeline.length, 2, 'arena timeline has 2 entries');

  // Filter by fromTs
  var fromFilter = WC.getTimeline(s, { fromTs: 900 });
  assertEqual(fromFilter.length, 2, 'fromTs=900 returns 2 entries (1000, 1500)');

  // Filter by toTs
  var toFilter = WC.getTimeline(s, { toTs: 900 });
  assertEqual(toFilter.length, 2, 'toTs=900 returns 2 entries (500, 800)');

  // Combined filter
  var combined = WC.getTimeline(s, { fromTs: 600, toTs: 1100 });
  assertEqual(combined.length, 2, 'combined time range returns 2 entries');

  // Category + time range
  var narrowed = WC.getTimeline(s, { category: 'combat', fromTs: 1200 });
  assertEqual(narrowed.length, 1, 'category+time filter returns 1 entry');
  assertEqual(narrowed[0].timestamp, 1500, 'correct entry returned');
});

// ============================================================================
// SUITE 10: searchChronicle
// ============================================================================

suite('searchChronicle', function() {
  var s = fresh();
  WC.recordEvent(s, 'construction', 'First Tower Built', 'A great tower rises in nexus.', ['alice'], 'nexus', { significance: 200 }, 1000, ['tower', 'first']);
  WC.recordEvent(s, 'combat', 'The Battle of Arena', 'Warriors clash.', ['alice', 'bob'], 'arena', { significance: 100 }, 2000, ['battle', 'arena']);
  WC.recordEvent(s, 'economic', 'Dragon Sword Auction', 'Rare blade sold for 1000 Spark.', ['carol'], 'agora', { significance: 1000 }, 3000, ['auction', 'sword']);
  WC.recordEvent(s, 'governance', 'Amendment VII Passed', 'New law enacted.', ['alice', 'bob', 'carol'], null, { significance: 500 }, 4000, ['amendment', 'governance']);

  // Keyword search
  var kwTower = WC.searchChronicle(s, { keyword: 'tower' });
  assertEqual(kwTower.length, 1, 'keyword "tower" finds 1 entry');
  assertEqual(kwTower[0].title, 'First Tower Built', 'correct entry found by keyword');

  var kwBattle = WC.searchChronicle(s, { keyword: 'battle' });
  assertEqual(kwBattle.length, 1, 'keyword "battle" finds 1 entry');

  var kwAlice = WC.searchChronicle(s, { keyword: 'nexus' });
  assertEqual(kwAlice.length, 1, 'keyword "nexus" (zone) finds 1 entry');

  // Keyword in description
  var kwRare = WC.searchChronicle(s, { keyword: 'rare' });
  assertEqual(kwRare.length, 1, 'keyword "rare" found in description');

  // Keyword in tags
  var kwFirst = WC.searchChronicle(s, { keyword: 'first' });
  assertEqual(kwFirst.length, 1, 'keyword "first" found in tags');

  // Category filter
  var govSearch = WC.searchChronicle(s, { category: 'governance' });
  assertEqual(govSearch.length, 1, 'category governance finds 1 entry');

  // Zone filter
  var arenaSearch = WC.searchChronicle(s, { zone: 'arena' });
  assertEqual(arenaSearch.length, 1, 'zone arena finds 1 entry');

  // Participant filter
  var aliceSearch = WC.searchChronicle(s, { participant: 'alice' });
  assertEqual(aliceSearch.length, 3, 'alice is in 3 entries');

  var carolSearch = WC.searchChronicle(s, { participant: 'carol' });
  assertEqual(carolSearch.length, 2, 'carol is in 2 entries');

  // Date range
  var dateRange = WC.searchChronicle(s, { fromTs: 1500, toTs: 3500 });
  assertEqual(dateRange.length, 2, 'date range 1500-3500 finds 2 entries');

  // Combined keyword + category (keyword "tower" is in construction entry title)
  var combined = WC.searchChronicle(s, { keyword: 'tower', participant: 'alice', category: 'construction' });
  assertEqual(combined.length, 1, 'combined search finds 1 entry');

  // No match
  var noMatch = WC.searchChronicle(s, { keyword: 'xyznotfound' });
  assertEqual(noMatch.length, 0, 'no match returns empty array');

  // Null query
  var nullResult = WC.searchChronicle(s, null);
  assertEqual(nullResult.length, 0, 'null query returns empty array');

  // Results sorted descending by timestamp
  var allResults = WC.searchChronicle(s, { keyword: 'alice' });
  for (var i = 0; i < allResults.length - 1; i++) {
    assert(allResults[i].timestamp >= allResults[i + 1].timestamp, 'results sorted descending by timestamp');
  }

  // Case-insensitive keyword
  var upper = WC.searchChronicle(s, { keyword: 'TOWER' });
  assertEqual(upper.length, 1, 'keyword search is case-insensitive');
});

// ============================================================================
// SUITE 11: nominateHistoricMoment
// ============================================================================

suite('nominateHistoricMoment', function() {
  var s = fresh();
  var r = addEntry(s);
  var entryId = r.entry.id;
  var p1 = uid();

  // Valid nomination
  var nomResult = WC.nominateHistoricMoment(s, p1, entryId, 'This event changed ZION forever.');
  assert(nomResult.success, 'nomination succeeds');
  assertNotNull(nomResult.nomination, 'nomination object returned');
  assertEqual(nomResult.nomination.entryId, entryId, 'nomination entryId is correct');
  assertEqual(nomResult.nomination.nominatorId, p1, 'nomination nominatorId is correct');
  assertEqual(nomResult.nomination.nominationText, 'This event changed ZION forever.', 'nominationText is set');
  assertEqual(nomResult.nomination.status, 'pending', 'nomination status starts pending');
  assertEqual(nomResult.nomination.voteCount, 0, 'nomination starts with 0 votes');
  assertArray(nomResult.nomination.votes, 'nomination.votes is an array');

  // Duplicate nomination by same player for same entry
  var dup = WC.nominateHistoricMoment(s, p1, entryId, 'Again!');
  assert(!dup.success, 'duplicate nomination by same player fails');

  // Different player can nominate same entry
  var p2 = uid();
  var nom2 = WC.nominateHistoricMoment(s, p2, entryId, 'Also important!');
  assert(nom2.success, 'different player can nominate same entry');

  // Nomination for non-existent entry
  var bad = WC.nominateHistoricMoment(s, uid(), 'entry_9999', 'text');
  assert(!bad.success, 'nomination for non-existent entry fails');

  // Missing playerId
  var missingPlayer = WC.nominateHistoricMoment(s, null, entryId, 'text');
  assert(!missingPlayer.success, 'nomination without playerId fails');

  // Missing entryId
  var missingEntry = WC.nominateHistoricMoment(s, uid(), null, 'text');
  assert(!missingEntry.success, 'nomination without entryId fails');

  // Missing nominationText
  var missingText = WC.nominateHistoricMoment(s, uid(), entryId, '');
  assert(!missingText.success, 'nomination with empty text fails');

  // Player involvement tracking
  var pInv = s.playerInvolvement[p1];
  assertNotNull(pInv, 'player involvement is tracked');
  assert(pInv.nominationIds.indexOf(nomResult.nomination.id) !== -1, 'nomination ID recorded in player involvement');
});

// ============================================================================
// SUITE 12: voteOnNomination — Basic
// ============================================================================

suite('voteOnNomination — Basic', function() {
  var s = fresh();
  var r = addEntry(s);
  var entryId = r.entry.id;
  var nominator = uid();
  var n = WC.nominateHistoricMoment(s, nominator, entryId, 'Historic!');
  var nomId = n.nomination.id;

  // First vote
  var v1 = WC.voteOnNomination(s, uid(), nomId);
  assert(v1.success, 'first vote succeeds');
  assertEqual(v1.voteCount, 1, 'voteCount is 1 after first vote');
  assert(!v1.preserved, 'not yet preserved after 1 vote');

  // Second vote
  var v2 = WC.voteOnNomination(s, uid(), nomId);
  assertEqual(v2.voteCount, 2, 'voteCount is 2 after second vote');

  // Duplicate vote by same player
  var voter = uid();
  WC.voteOnNomination(s, voter, nomId);
  var dupVote = WC.voteOnNomination(s, voter, nomId);
  assert(!dupVote.success, 'duplicate vote by same player fails');

  // Vote on non-existent nomination
  var badVote = WC.voteOnNomination(s, uid(), 'nomination_9999');
  assert(!badVote.success, 'vote on non-existent nomination fails');

  // Missing playerId
  var missingPid = WC.voteOnNomination(s, null, nomId);
  assert(!missingPid.success, 'vote without playerId fails');
});

// ============================================================================
// SUITE 13: voteOnNomination — Preservation threshold
// ============================================================================

suite('voteOnNomination — Preservation threshold', function() {
  var threshold = WC._HISTORIC_VOTE_THRESHOLD;
  var s = fresh();
  var r = addEntry(s);
  var entryId = r.entry.id;
  var n = WC.nominateHistoricMoment(s, uid(), entryId, 'Worth preserving!');
  var nomId = n.nomination.id;

  // Cast exactly threshold votes
  var lastResult;
  for (var i = 0; i < threshold; i++) {
    lastResult = WC.voteOnNomination(s, uid(), nomId);
  }
  assert(lastResult.preserved, 'nomination preserved after reaching threshold');
  assertEqual(lastResult.voteCount, threshold, 'voteCount equals threshold');

  // Nomination status should be approved
  var nominations = WC.getNominations(s, 'approved');
  assertEqual(nominations.length, 1, 'one approved nomination');
  assertEqual(nominations[0].id, nomId, 'correct nomination approved');

  // Entry should be marked as historic moment
  var entry = WC.getEntry(s, entryId);
  assertEqual(entry.isHistoricMoment, true, 'entry marked as historic moment');

  // Historic moments list should have the entry
  var hm = WC.getHistoricMoments(s);
  assertEqual(hm.length, 1, 'one historic moment preserved');
  assertEqual(hm[0].entryId, entryId, 'historic moment has correct entryId');

  // Cannot vote on already-approved nomination
  var lateVote = WC.voteOnNomination(s, uid(), nomId);
  assert(!lateVote.success, 'cannot vote on already-approved nomination');

  // Cannot nominate already-historic entry
  var reNominate = WC.nominateHistoricMoment(s, uid(), entryId, 'Nominate again');
  assert(!reNominate.success, 'cannot nominate already-historic entry');
});

// ============================================================================
// SUITE 14: getNominations and getNominationsForEntry
// ============================================================================

suite('getNominations and getNominationsForEntry', function() {
  var s = fresh();
  var r1 = addEntry(s);
  var r2 = addEntry(s);
  var p1 = uid();
  var p2 = uid();
  var p3 = uid();

  WC.nominateHistoricMoment(s, p1, r1.entry.id, 'Entry 1 nomination');
  WC.nominateHistoricMoment(s, p2, r2.entry.id, 'Entry 2 nomination');
  WC.nominateHistoricMoment(s, p3, r1.entry.id, 'Entry 1 nomination by p3');

  // All nominations
  var all = WC.getNominations(s);
  assertEqual(all.length, 3, 'getNominations returns all 3 nominations');

  // By status pending
  var pending = WC.getNominations(s, 'pending');
  assertEqual(pending.length, 3, 'all 3 nominations are pending');

  // For specific entry
  var forEntry1 = WC.getNominationsForEntry(s, r1.entry.id);
  assertEqual(forEntry1.length, 2, 'entry 1 has 2 nominations');

  var forEntry2 = WC.getNominationsForEntry(s, r2.entry.id);
  assertEqual(forEntry2.length, 1, 'entry 2 has 1 nomination');

  // Approve one nomination
  var threshold = WC._HISTORIC_VOTE_THRESHOLD;
  var noms = WC.getNominations(s, 'pending');
  var nomId = noms[0].id;
  for (var i = 0; i < threshold; i++) {
    WC.voteOnNomination(s, uid(), nomId);
  }

  var approved = WC.getNominations(s, 'approved');
  assertEqual(approved.length, 1, '1 nomination approved');

  var stillPending = WC.getNominations(s, 'pending');
  assertEqual(stillPending.length, 2, '2 nominations still pending');
});

// ============================================================================
// SUITE 15: getHistoricMoments
// ============================================================================

suite('getHistoricMoments', function() {
  var s = fresh();

  // No historic moments initially
  var none = WC.getHistoricMoments(s);
  assertArray(none, 'getHistoricMoments returns array');
  assertEqual(none.length, 0, 'no historic moments initially');

  // Create and approve two historic moments
  var r1 = addEntry(s);
  var r2 = addEntry(s);
  var threshold = WC._HISTORIC_VOTE_THRESHOLD;

  var n1 = WC.nominateHistoricMoment(s, uid(), r1.entry.id, 'First historic');
  var n2 = WC.nominateHistoricMoment(s, uid(), r2.entry.id, 'Second historic');

  for (var i = 0; i < threshold; i++) {
    WC.voteOnNomination(s, uid(), n1.nomination.id);
    WC.voteOnNomination(s, uid(), n2.nomination.id);
  }

  var moments = WC.getHistoricMoments(s);
  assertEqual(moments.length, 2, 'two historic moments preserved');

  var fields = ['nominationId', 'entryId', 'nominationText', 'nominatorId', 'finalVoteCount', 'preservedAt'];
  fields.forEach(function(f) {
    assertNotNull(moments[0][f], 'historic moment has field: ' + f);
  });

  assertEqual(moments[0].finalVoteCount, threshold, 'finalVoteCount equals threshold');
});

// ============================================================================
// SUITE 16: getPlayerHistory and getPlayerStats
// ============================================================================

suite('getPlayerHistory and getPlayerStats', function() {
  var s = fresh();
  var alice = 'alice_' + uid();
  var bob = 'bob_' + uid();

  WC.recordEvent(s, 'construction', 'Tower A', 'Desc', [alice], 'nexus', { significance: 10 }, 100, []);
  WC.recordEvent(s, 'combat', 'Fight B', 'Desc', [alice, bob], 'arena', { significance: 20 }, 200, []);
  WC.recordEvent(s, 'social', 'Meet C', 'Desc', [alice], 'commons', { significance: 5 }, 300, []);
  WC.recordEvent(s, 'economic', 'Trade D', 'Desc', [bob], 'agora', { significance: 600 }, 400, []);

  // Alice history
  var aliceHistory = WC.getPlayerHistory(s, alice);
  assertEqual(aliceHistory.length, 3, 'alice has 3 events');
  aliceHistory.forEach(function(e) {
    assert(e.participants.indexOf(alice) !== -1, 'each entry has alice as participant');
  });

  // Sorted by timestamp descending
  for (var i = 0; i < aliceHistory.length - 1; i++) {
    assert(aliceHistory[i].timestamp >= aliceHistory[i + 1].timestamp, 'history sorted descending');
  }

  // Bob history
  var bobHistory = WC.getPlayerHistory(s, bob);
  assertEqual(bobHistory.length, 2, 'bob has 2 events');

  // Unknown player
  var unknownHistory = WC.getPlayerHistory(s, 'unknown_player_xyz');
  assertArray(unknownHistory, 'unknown player returns empty array');
  assertEqual(unknownHistory.length, 0, 'unknown player has 0 events');

  // Player stats
  var aliceStats = WC.getPlayerStats(s, alice);
  assertEqual(aliceStats.playerId, alice, 'stats.playerId is correct');
  assertEqual(aliceStats.totalEvents, 3, 'alice stats total is 3');
  assertNotNull(aliceStats.categories, 'stats has categories');
  assertEqual(aliceStats.categories.construction, 1, 'alice has 1 construction event');
  assertEqual(aliceStats.categories.combat, 1, 'alice has 1 combat event');
  assertNotNull(aliceStats.zones, 'stats has zones');
  assertEqual(aliceStats.zones.nexus, 1, 'alice has 1 nexus event');

  // Stats with nominations and votes
  var r = addEntry(s);
  WC.nominateHistoricMoment(s, alice, r.entry.id, 'Nominate');
  WC.voteOnNomination(s, alice, WC.getNominations(s)[0].id);

  var aliceStats2 = WC.getPlayerStats(s, alice);
  assertEqual(aliceStats2.nominationsMade, 1, 'alice made 1 nomination');
  assertEqual(aliceStats2.votesGiven, 1, 'alice gave 1 vote');
});

// ============================================================================
// SUITE 17: Era System
// ============================================================================

suite('Era System — getCurrentEra', function() {
  var s = fresh();

  // Dawn Age at 0 events
  var era0 = WC.getCurrentEra(s);
  assertNotNull(era0, 'getCurrentEra returns era');
  assertEqual(era0.name, 'The Dawn Age', 'starts in Dawn Age');
  assertNotNull(era0.description, 'era has description');

  // Add enough events to advance eras
  var eras = WC._ERA_MILESTONES;
  if (eras.length > 1) {
    var target = eras[1].minEvents;
    for (var i = 0; i < target; i++) {
      addEntry(s);
    }
    var era1 = WC.getCurrentEra(s);
    assertEqual(era1.name, eras[1].name, 'era advances after ' + target + ' events');
  }
});

suite('Era System — getEras', function() {
  var s = fresh();
  var allEras = WC.getEras(s);
  assertArray(allEras, 'getEras returns array');
  assertGTE(allEras.length, 5, 'at least 5 eras');

  // One era should be active
  var activeEras = allEras.filter(function(e) { return e.isActive; });
  assertEqual(activeEras.length, 1, 'exactly one era is active');
  assertEqual(activeEras[0].name, 'The Dawn Age', 'Dawn Age is active initially');

  // First era fields
  var first = allEras[0];
  assertNotNull(first.name, 'era has name');
  assertNotNull(first.description, 'era has description');
  assertEqual(typeof first.minEvents, 'number', 'era has minEvents');
  assertEqual(typeof first.entryCount, 'number', 'era has entryCount');
  assertEqual(typeof first.isActive, 'boolean', 'era has isActive');
  assertEqual(typeof first.isPast, 'boolean', 'era has isPast');
  assertEqual(typeof first.isFuture, 'boolean', 'era has isFuture');

  // Add events to move to next era
  if (WC._ERA_MILESTONES.length > 1) {
    var target = WC._ERA_MILESTONES[1].minEvents;
    for (var i = s.entries.length; i < target; i++) {
      addEntry(s);
    }
    var updatedEras = WC.getEras(s);
    var newActiveEras = updatedEras.filter(function(e) { return e.isActive; });
    assertEqual(newActiveEras.length, 1, 'still exactly one active era after advancement');
    var pastEras = updatedEras.filter(function(e) { return e.isPast; });
    assertGTE(pastEras.length, 1, 'at least one past era after advancement');
  }
});

suite('Era System — getEraEntries', function() {
  var s = fresh();

  // Add entries in Dawn Age
  addEntry(s);
  addEntry(s);

  var dawnEntries = WC.getEraEntries(s, 'The Dawn Age');
  assertArray(dawnEntries, 'getEraEntries returns array');
  assertEqual(dawnEntries.length, 2, '2 entries in Dawn Age');
  dawnEntries.forEach(function(e) {
    assertEqual(e.era, 'The Dawn Age', 'each entry is in Dawn Age');
  });

  // Non-existent era
  var noEra = WC.getEraEntries(s, 'The Fake Age');
  assertEqual(noEra.length, 0, 'unknown era returns empty array');
});

// ============================================================================
// SUITE 18: Weekly Digest
// ============================================================================

suite('Weekly Digest — generateWeeklyDigest', function() {
  var s = fresh();

  // Add several events in two week ranges
  WC.recordEvent(s, 'construction', 'Tower', 'Desc', ['p1'], 'nexus', { significance: 200 }, 100, []);
  WC.recordEvent(s, 'combat', 'Battle', 'Desc', ['p1', 'p2'], 'arena', { significance: 100 }, 200, []);
  WC.recordEvent(s, 'social', 'Gathering', 'Desc', ['p2', 'p3'], 'commons', { significance: 50 }, 300, []);
  WC.recordEvent(s, 'economic', 'Trade', 'Desc', ['p1'], 'agora', { significance: 600 }, 400, []);
  WC.recordEvent(s, 'federation', 'Link', 'Desc', ['p4'], null, { significance: 1000 }, 500, []);
  // Out-of-range event
  WC.recordEvent(s, 'exploration', 'Discovery', 'Desc', ['p5'], 'wilds', { significance: 50 }, 9999, []);

  var result = WC.generateWeeklyDigest(s, '2026-W08', 12345, 50, 600);
  assert(result.success, 'digest generated successfully');
  assertNotNull(result.digest, 'digest object returned');
  assertEqual(result.digest.weekId, '2026-W08', 'digest has correct weekId');
  assertEqual(result.digest.totalEvents, 5, 'digest covers 5 events in range');
  assertArray(result.digest.selectedEvents, 'digest has selectedEvents array');
  assertLTE(result.digest.selectedEvents.length, WC._WEEKLY_DIGEST_SIZE, 'selectedEvents within limit');
  assertNotNull(result.digest.standoutEvent, 'digest has standoutEvent');
  assertNotNull(result.digest.topParticipant, 'digest has topParticipant');
  assertNotNull(result.digest.categoryBreakdown, 'digest has categoryBreakdown');
  assertNotNull(result.digest.era, 'digest has era');
  assertNotNull(result.digest.generatedAt, 'digest has generatedAt');

  // Standout event should be highest significance
  assertEqual(result.digest.standoutEvent.significance, 1000, 'standoutEvent has highest significance');

  // Top participant — p1 appears in 3 events
  assertEqual(result.digest.topParticipant, 'p1', 'topParticipant is p1 (3 events)');

  // Category breakdown
  var breakdown = result.digest.categoryBreakdown;
  assertEqual(breakdown.construction, 1, 'construction: 1');
  assertEqual(breakdown.combat, 1, 'combat: 1');
  assertEqual(breakdown.social, 1, 'social: 1');
  assertEqual(breakdown.economic, 1, 'economic: 1');
  assertEqual(breakdown.federation, 1, 'federation: 1');

  // Missing weekId
  var noId = WC.generateWeeklyDigest(s, null, 0, 0, 9999);
  assert(!noId.success, 'missing weekId fails');

  // Idempotent — same weekId returns same digest
  var again = WC.generateWeeklyDigest(s, '2026-W08', 12345, 50, 600);
  assert(again.success, 'second call with same weekId succeeds');
  assertEqual(again.digest.id, result.digest.id, 'same digest returned for same weekId');
});

suite('Weekly Digest — Determinism', function() {
  // Same seed should produce same selected events
  var s1 = fresh();
  var s2 = fresh();

  for (var i = 0; i < 15; i++) {
    var ts = i * 100;
    var sig = (i + 1) * 10;
    WC.recordEvent(s1, 'social', 'Event ' + i, 'Desc ' + i, ['p1'], 'nexus', { significance: sig }, ts, []);
    WC.recordEvent(s2, 'social', 'Event ' + i, 'Desc ' + i, ['p1'], 'nexus', { significance: sig }, ts, []);
  }

  var d1 = WC.generateWeeklyDigest(s1, 'week-A', 42, 0, 9999);
  var d2 = WC.generateWeeklyDigest(s2, 'week-A', 42, 0, 9999);

  var ids1 = d1.digest.selectedEvents.map(function(e) { return e.id; }).sort();
  var ids2 = d2.digest.selectedEvents.map(function(e) { return e.id; }).sort();

  assertEqual(JSON.stringify(ids1), JSON.stringify(ids2), 'same seed produces same selected events');
});

suite('Weekly Digest — getWeeklyDigests and getWeeklyDigestByWeek', function() {
  var s = fresh();
  addEntry(s);

  WC.generateWeeklyDigest(s, '2026-W01', 1, 0, 99999);
  WC.generateWeeklyDigest(s, '2026-W02', 2, 0, 99999);

  var all = WC.getWeeklyDigests(s);
  assertArray(all, 'getWeeklyDigests returns array');
  assertEqual(all.length, 2, 'two digests stored');

  var w1 = WC.getWeeklyDigestByWeek(s, '2026-W01');
  assertNotNull(w1, 'week W01 digest found');
  assertEqual(w1.weekId, '2026-W01', 'correct week returned');

  var missing = WC.getWeeklyDigestByWeek(s, '2026-W99');
  assertNull(missing, 'missing week returns null');
});

// ============================================================================
// SUITE 19: Convenience Recorders
// ============================================================================

suite('Convenience Recorders — recordFirstBuild', function() {
  var s = fresh();
  var r = WC.recordFirstBuild(s, 'alice', 'keep', 'nexus', 5000);
  assert(r.success, 'recordFirstBuild succeeds');
  assertEqual(r.entry.category, 'construction', 'category is construction');
  assertEqual(r.entry.zone, 'nexus', 'zone is nexus');
  assert(r.entry.participants.indexOf('alice') !== -1, 'player alice is participant');
  assertEqual(r.entry.metadata.isFirst, true, 'isFirst flag set');
  assertEqual(r.entry.metadata.structureType, 'keep', 'structureType is keep');
  assertGTE(r.entry.significance, 1, 'significance is set');
  assertIn(r.entry.tags, 'first', 'tag "first" is present');
  assertIn(r.entry.tags, 'build', 'tag "build" is present');
});

suite('Convenience Recorders — recordMajorAuction', function() {
  var s = fresh();
  var r = WC.recordMajorAuction(s, ['alice', 'bob', 'carol'], 'Dragon Blade', 2000, 'agora', 6000);
  assert(r.success, 'recordMajorAuction succeeds');
  assertEqual(r.entry.category, 'economic', 'category is economic');
  assertEqual(r.entry.participants.length, 3, 'all bidders in participants');
  assertEqual(r.entry.metadata.finalValue, 2000, 'finalValue is set');
  assertEqual(r.entry.metadata.itemName, 'Dragon Blade', 'itemName is set');
  assertIn(r.entry.tags, 'auction', 'auction tag present');
});

suite('Convenience Recorders — recordGuildWar', function() {
  var s = fresh();
  var participants = ['p1', 'p2', 'p3', 'p4'];
  var r = WC.recordGuildWar(s, 'Shadow Guild', 'Light Guild', 'Shadow Guild', participants, 'arena', 7000);
  assert(r.success, 'recordGuildWar succeeds');
  assertEqual(r.entry.category, 'combat', 'category is combat');
  assertEqual(r.entry.participants.length, 4, 'all participants recorded');
  assertEqual(r.entry.metadata.guild1, 'Shadow Guild', 'guild1 is set');
  assertEqual(r.entry.metadata.guild2, 'Light Guild', 'guild2 is set');
  assertEqual(r.entry.metadata.winner, 'Shadow Guild', 'winner is set');
  assertIn(r.entry.tags, 'war', 'war tag present');
  assertIn(r.entry.tags, 'guild', 'guild tag present');
});

suite('Convenience Recorders — recordAmendment', function() {
  var s = fresh();
  var r = WC.recordAmendment(s, 'alice', 'Amendment XII', 'passed', ['alice', 'bob'], 8000);
  assert(r.success, 'recordAmendment succeeds');
  assertEqual(r.entry.category, 'governance', 'category is governance');
  assertNull(r.entry.zone, 'zone is null for governance');
  assertEqual(r.entry.metadata.result, 'passed', 'result is set');
  assertIn(r.entry.tags, 'amendment', 'amendment tag present');
  assertGTE(r.entry.significance, 100, 'governance event has high significance');
});

suite('Convenience Recorders — recordRaidKill', function() {
  var s = fresh();
  var raiders = ['p1', 'p2', 'p3', 'p4', 'p5'];
  var r = WC.recordRaidKill(s, 'Shadow Dungeon', 'The Shadow Lord', raiders, 'wilds', 9000);
  assert(r.success, 'recordRaidKill succeeds');
  assertEqual(r.entry.category, 'combat', 'category is combat');
  assertEqual(r.entry.participants.length, 5, 'all raiders recorded');
  assertEqual(r.entry.metadata.bossName, 'The Shadow Lord', 'bossName is set');
  assertEqual(r.entry.metadata.raidName, 'Shadow Dungeon', 'raidName is set');
  assertIn(r.entry.tags, 'raid', 'raid tag present');
  assertIn(r.entry.tags, 'boss', 'boss tag present');
});

suite('Convenience Recorders — recordFederationConnection', function() {
  var s = fresh();
  var r = WC.recordFederationConnection(s, 'ZION-Prime', 'ZION-Alpha', 'alice', 10000);
  assert(r.success, 'recordFederationConnection succeeds');
  assertEqual(r.entry.category, 'federation', 'category is federation');
  assertNull(r.entry.zone, 'zone is null for federation');
  assertEqual(r.entry.metadata.server1, 'ZION-Prime', 'server1 is set');
  assertEqual(r.entry.metadata.server2, 'ZION-Alpha', 'server2 is set');
  assertIn(r.entry.tags, 'federation', 'federation tag present');
  assertGTE(r.entry.significance, 500, 'federation has high significance');

  // No initiator
  var r2 = WC.recordFederationConnection(s, 'ZION-Beta', 'ZION-Gamma', null, 11000);
  assert(r2.success, 'federation connection without initiator succeeds');
  assertArray(r2.entry.participants, 'participants is array');
  assertEqual(r2.entry.participants.length, 0, 'no participants when no initiator');
});

suite('Convenience Recorders — recordExplorationDiscovery', function() {
  var s = fresh();
  var r = WC.recordExplorationDiscovery(s, 'alice', 'The Crystal Caves', 'wilds', 12000);
  assert(r.success, 'recordExplorationDiscovery succeeds');
  assertEqual(r.entry.category, 'exploration', 'category is exploration');
  assertEqual(r.entry.zone, 'wilds', 'zone is wilds');
  assert(r.entry.participants.indexOf('alice') !== -1, 'alice is participant');
  assertEqual(r.entry.metadata.discoveryName, 'The Crystal Caves', 'discoveryName is set');
  assertIn(r.entry.tags, 'exploration', 'exploration tag present');
  assertIn(r.entry.tags, 'discovery', 'discovery tag present');
});

// ============================================================================
// SUITE 20: getEntry
// ============================================================================

suite('getEntry', function() {
  var s = fresh();
  var r = addEntry(s);
  var id = r.entry.id;

  var found = WC.getEntry(s, id);
  assertNotNull(found, 'getEntry finds existing entry');
  assertEqual(found.id, id, 'correct entry returned');

  var notFound = WC.getEntry(s, 'entry_9999');
  assertNull(notFound, 'getEntry returns null for non-existent id');
});

// ============================================================================
// SUITE 21: getRecentEntries
// ============================================================================

suite('getRecentEntries', function() {
  var s = fresh();

  for (var i = 0; i < 15; i++) {
    addEntry(s, { timestamp: i * 100 });
  }

  var recent5 = WC.getRecentEntries(s, 5);
  assertArray(recent5, 'getRecentEntries returns array');
  assertEqual(recent5.length, 5, 'returns 5 entries');

  // Should be sorted descending by timestamp
  for (var j = 0; j < recent5.length - 1; j++) {
    assert(recent5[j].timestamp >= recent5[j + 1].timestamp, 'sorted descending by timestamp');
  }

  // Default count
  var defaultRecent = WC.getRecentEntries(s);
  assertEqual(defaultRecent.length, 10, 'default returns 10 entries');

  // Count larger than available
  var allRecent = WC.getRecentEntries(s, 100);
  assertEqual(allRecent.length, 15, 'count > total returns all entries');
});

// ============================================================================
// SUITE 22: getZoneHistory
// ============================================================================

suite('getZoneHistory', function() {
  var s = fresh();
  WC.recordEvent(s, 'construction', 'Tower A', 'D', ['p1'], 'nexus', {}, 100, []);
  WC.recordEvent(s, 'combat', 'Fight', 'D', ['p1'], 'arena', {}, 200, []);
  WC.recordEvent(s, 'social', 'Meet', 'D', ['p1'], 'nexus', {}, 300, []);

  var nexusHistory = WC.getZoneHistory(s, 'nexus');
  assertArray(nexusHistory, 'getZoneHistory returns array');
  assertEqual(nexusHistory.length, 2, 'nexus has 2 entries');
  nexusHistory.forEach(function(e) {
    assertEqual(e.zone, 'nexus', 'each entry is in nexus');
  });

  // Sorted descending
  assert(nexusHistory[0].timestamp >= nexusHistory[1].timestamp, 'zone history sorted descending');

  // No events in zone
  var emptyZone = WC.getZoneHistory(s, 'wilds');
  assertEqual(emptyZone.length, 0, 'no events in wilds');
});

// ============================================================================
// SUITE 23: getTopEvents
// ============================================================================

suite('getTopEvents', function() {
  var s = fresh();
  WC.recordEvent(s, 'social', 'Small', 'D', [], null, { significance: 1 }, 100, []);
  WC.recordEvent(s, 'economic', 'Medium', 'D', [], null, { significance: 500 }, 200, []);
  WC.recordEvent(s, 'federation', 'Big', 'D', [], null, { significance: 1000 }, 300, []);

  var top2 = WC.getTopEvents(s, 2);
  assertEqual(top2.length, 2, 'getTopEvents returns 2');
  assertEqual(top2[0].significance, 1000, 'highest significance first');
  assertEqual(top2[1].significance, 500, 'second highest next');

  // Default count
  var defaultTop = WC.getTopEvents(s);
  assertEqual(defaultTop.length, 3, 'default returns all (up to 10)');

  // Count > available
  var allTop = WC.getTopEvents(s, 100);
  assertEqual(allTop.length, 3, 'count > total returns all');
});

// ============================================================================
// SUITE 24: getSharedHistory
// ============================================================================

suite('getSharedHistory', function() {
  var s = fresh();
  WC.recordEvent(s, 'social', 'Alice only', 'D', ['alice'], 'nexus', {}, 100, []);
  WC.recordEvent(s, 'social', 'Alice+Bob', 'D', ['alice', 'bob'], 'nexus', {}, 200, []);
  WC.recordEvent(s, 'social', 'Alice+Bob+Carol', 'D', ['alice', 'bob', 'carol'], 'nexus', {}, 300, []);
  WC.recordEvent(s, 'social', 'Bob+Carol', 'D', ['bob', 'carol'], 'nexus', {}, 400, []);

  var aliceBob = WC.getSharedHistory(s, ['alice', 'bob']);
  assertEqual(aliceBob.length, 2, 'alice+bob share 2 events');

  var aliceBobCarol = WC.getSharedHistory(s, ['alice', 'bob', 'carol']);
  assertEqual(aliceBobCarol.length, 1, 'alice+bob+carol share 1 event');

  // Single player
  var aliceOnly = WC.getSharedHistory(s, ['alice']);
  assertEqual(aliceOnly.length, 3, 'single player returns their events');

  // Unknown player
  var noShared = WC.getSharedHistory(s, ['alice', 'unknown_player_xyz']);
  assertEqual(noShared.length, 0, 'no shared events with unknown player');

  // Empty playerIds
  var empty = WC.getSharedHistory(s, []);
  assertArray(empty, 'empty playerIds returns array');

  // Sorted descending
  for (var i = 0; i < aliceBob.length - 1; i++) {
    assert(aliceBob[i].timestamp >= aliceBob[i + 1].timestamp, 'shared history sorted descending');
  }
});

// ============================================================================
// SUITE 25: getStats
// ============================================================================

suite('getStats', function() {
  var s = fresh();

  var emptyStats = WC.getStats(s);
  assertEqual(emptyStats.totalEntries, 0, 'empty state has 0 entries');
  assertEqual(emptyStats.historicMomentsCount, 0, 'no historic moments initially');
  assertEqual(emptyStats.totalPlayersInvolved, 0, 'no players initially');
  assertEqual(emptyStats.pendingNominations, 0, 'no pending nominations');
  assertEqual(emptyStats.approvedNominations, 0, 'no approved nominations');
  assertNotNull(emptyStats.categoryCounts, 'categoryCounts exists');
  assertNotNull(emptyStats.zoneCounts, 'zoneCounts exists');
  assertNotNull(emptyStats.currentEra, 'currentEra exists');

  // Add some events
  WC.recordEvent(s, 'construction', 'T', 'D', ['p1', 'p2'], 'nexus', { significance: 100 }, 100, []);
  WC.recordEvent(s, 'combat', 'T', 'D', ['p3'], 'arena', { significance: 50 }, 200, []);
  WC.recordEvent(s, 'construction', 'T', 'D', ['p1'], 'nexus', { significance: 100 }, 300, []);

  var stats = WC.getStats(s);
  assertEqual(stats.totalEntries, 3, 'totalEntries is 3');
  assertEqual(stats.categoryCounts.construction, 2, 'construction count is 2');
  assertEqual(stats.categoryCounts.combat, 1, 'combat count is 1');
  assertEqual(stats.zoneCounts.nexus, 2, 'nexus zone count is 2');
  assertEqual(stats.zoneCounts.arena, 1, 'arena zone count is 1');
  assertEqual(stats.totalPlayersInvolved, 3, '3 players involved');
  assertEqual(stats.totalSignificance, 250, 'totalSignificance is 250');

  // Nominate and approve
  var r = addEntry(s);
  var n = WC.nominateHistoricMoment(s, 'p1', r.entry.id, 'Historic!');
  var stats2 = WC.getStats(s);
  assertEqual(stats2.pendingNominations, 1, '1 pending nomination');

  var threshold = WC._HISTORIC_VOTE_THRESHOLD;
  for (var i = 0; i < threshold; i++) {
    WC.voteOnNomination(s, uid(), n.nomination.id);
  }

  var stats3 = WC.getStats(s);
  assertEqual(stats3.historicMomentsCount, 1, '1 historic moment after approval');
  assertEqual(stats3.approvedNominations, 1, '1 approved nomination');
  assertEqual(stats3.pendingNominations, 0, '0 pending after approval');
});

// ============================================================================
// SUITE 26: mulberry32 PRNG
// ============================================================================

suite('mulberry32 PRNG', function() {
  var prng = WC._mulberry32;
  assert(typeof prng === 'function', 'mulberry32 is exported');

  var rng = prng(42);
  assert(typeof rng === 'function', 'mulberry32 returns a function');

  var v1 = rng();
  assert(v1 >= 0 && v1 < 1, 'PRNG value is in [0, 1)');

  // Determinism — same seed same sequence
  var rng2 = prng(42);
  assertEqual(rng2(), v1, 'same seed produces same first value');

  // Different seeds produce different values
  var rngA = prng(1);
  var rngB = prng(2);
  var vA = rngA();
  var vB = rngB();
  assert(vA !== vB, 'different seeds produce different values');

  // Produces many values without error
  var rng3 = prng(999);
  for (var i = 0; i < 100; i++) {
    var v = rng3();
    assert(v >= 0 && v < 1, 'PRNG value ' + i + ' is in [0, 1)');
  }
});

// ============================================================================
// SUITE 27: hashString
// ============================================================================

suite('hashString', function() {
  var hash = WC._hashString;
  assert(typeof hash === 'function', 'hashString is exported');

  var h1 = hash('hello');
  assertEqual(typeof h1, 'number', 'hashString returns a number');
  assertGTE(h1, 0, 'hash is non-negative');

  // Deterministic
  assertEqual(hash('hello'), hash('hello'), 'same input same hash');

  // Different inputs different hashes
  assert(hash('hello') !== hash('world'), 'different inputs different hashes');

  // Empty string
  var h0 = hash('');
  assertEqual(typeof h0, 'number', 'empty string hash is a number');
});

// ============================================================================
// SUITE 28: Player involvement cross-checks
// ============================================================================

suite('Player involvement tracking', function() {
  var s = fresh();
  var alice = 'alice_' + uid();

  // Add entries with alice
  var r1 = WC.recordEvent(s, 'social', 'T', 'D', [alice], 'nexus', {}, 100, []);
  var r2 = WC.recordEvent(s, 'combat', 'T', 'D', [alice], 'arena', {}, 200, []);

  // Alice should appear in playerInvolvement
  assertNotNull(s.playerInvolvement[alice], 'alice is in playerInvolvement');
  assertEqual(s.playerInvolvement[alice].entryIds.length, 2, 'alice has 2 entry IDs');
  assertIn(s.playerInvolvement[alice].entryIds, r1.entry.id, 'entry 1 in alice involvement');
  assertIn(s.playerInvolvement[alice].entryIds, r2.entry.id, 'entry 2 in alice involvement');

  // Nominate
  WC.nominateHistoricMoment(s, alice, r1.entry.id, 'Historic!');
  assertEqual(s.playerInvolvement[alice].nominationIds.length, 1, 'alice has 1 nomination ID');

  // Vote
  var nomId = s.playerInvolvement[alice].nominationIds[0];
  var bob = 'bob_' + uid();
  WC.voteOnNomination(s, bob, nomId);
  assertNotNull(s.playerInvolvement[bob], 'bob is in playerInvolvement after voting');
  assertIn(s.playerInvolvement[bob].votedNominations, nomId, 'bob voted nomination tracked');
});

// ============================================================================
// SUITE 29: Multi-entry Era tagging
// ============================================================================

suite('Era tagging on entries', function() {
  var s = fresh();

  // First entry is in Dawn Age
  var r1 = addEntry(s);
  assertEqual(r1.entry.era, 'The Dawn Age', 'first entry is in Dawn Age');

  // Add entries to reach Age of Building (50)
  var target = WC._ERA_MILESTONES[1] ? WC._ERA_MILESTONES[1].minEvents : 50;
  while (s.entries.length < target) {
    addEntry(s);
  }

  // Next entry should be in new era
  var rNext = addEntry(s);
  assert(rNext.entry.era !== 'The Dawn Age', 'entry after milestone is in new era');
  assertEqual(rNext.entry.era, WC._ERA_MILESTONES[1].name, 'entry in correct next era');
});

// ============================================================================
// SUITE 30: Edge Cases and Robustness
// ============================================================================

suite('Edge Cases', function() {
  var s = fresh();

  // getChronicle with page 0 and large pageSize
  for (var i = 0; i < 5; i++) { addEntry(s); }
  var large = WC.getChronicle(s, 0, 1000);
  assertEqual(large.entries.length, 5, 'large pageSize returns all entries');
  assertEqual(large.totalPages, 1, 'one page for small number of entries');

  // searchChronicle with all filters null
  var allSearch = WC.searchChronicle(s, {});
  assertEqual(allSearch.length, 5, 'empty query returns all entries');

  // getZoneHistory for null zone
  var nullZone = WC.getZoneHistory(s, null);
  assertArray(nullZone, 'null zone returns empty array');

  // getTimeline with empty filter object
  var emptyFilter = WC.getTimeline(s, {});
  assertEqual(emptyFilter.length, 5, 'empty filter returns all entries');

  // getTimeline with no filter (null)
  var nullFilter = WC.getTimeline(s, null);
  assertEqual(nullFilter.length, 5, 'null filter returns all entries');

  // generateWeeklyDigest with no events in range
  var emptyDigest = WC.generateWeeklyDigest(s, 'week-empty', 0, 99999, 199999);
  assert(emptyDigest.success, 'digest for empty range succeeds');
  assertEqual(emptyDigest.digest.totalEvents, 0, 'digest has 0 events in empty range');
  assertNull(emptyDigest.digest.standoutEvent, 'no standout event in empty range');
  assertNull(emptyDigest.digest.topParticipant, 'no top participant in empty range');

  // recordEvent with undefined metadata — significance defaults to 1
  var noMeta = WC.recordEvent(fresh(), 'social', 'T', 'D', [], null, {}, 0, []);
  assert(noMeta.success, 'empty metadata object is accepted');
  assertEqual(noMeta.entry.significance, 1, 'significance defaults to 1');

  // recordEvent with no tags
  var noTags = WC.recordEvent(fresh(), 'social', 'T', 'D', [], null, {}, 0, null);
  assert(noTags.success, 'null tags is handled');
  assertArray(noTags.entry.tags, 'tags defaults to array');
});

// ============================================================================
// SUITE 31: Full end-to-end workflow
// ============================================================================

suite('Full Workflow', function() {
  var s = fresh();

  // Build a world history
  WC.recordFirstBuild(s, 'alice', 'keep', 'nexus', 100);
  WC.recordMajorAuction(s, ['alice', 'bob'], 'Dragon Sword', 1500, 'agora', 200);
  WC.recordGuildWar(s, 'Steel Wolves', 'Fire Hawks', 'Steel Wolves', ['alice', 'bob', 'carol', 'dave'], 'arena', 300);
  WC.recordAmendment(s, 'alice', 'Amendment I', 'passed', ['alice', 'bob', 'carol'], 400);
  WC.recordRaidKill(s, 'Dragon Lair', 'Ancient Dragon', ['alice', 'bob', 'carol', 'dave', 'eve'], 'wilds', 500);
  WC.recordFederationConnection(s, 'ZION-Primary', 'ZION-Mirror', 'alice', 600);
  WC.recordExplorationDiscovery(s, 'eve', 'The Hidden Valley', 'wilds', 700);

  assertEqual(s.entries.length, 7, '7 events recorded');

  // Verify all categories
  var stats = WC.getStats(s);
  assertEqual(stats.categoryCounts.construction, 1, 'one construction event');
  assertEqual(stats.categoryCounts.economic, 1, 'one economic event');
  assertEqual(stats.categoryCounts.combat, 2, 'two combat events');
  assertEqual(stats.categoryCounts.governance, 1, 'one governance event');
  assertEqual(stats.categoryCounts.federation, 1, 'one federation event');
  assertEqual(stats.categoryCounts.exploration, 1, 'one exploration event');

  // Nominate and vote on raid kill
  var raidEntry = WC.searchChronicle(s, { keyword: 'Ancient Dragon' })[0];
  assertNotNull(raidEntry, 'raid entry found');

  var nom = WC.nominateHistoricMoment(s, 'alice', raidEntry.id, 'The greatest raid in history!');
  assert(nom.success, 'nomination succeeds');

  var threshold = WC._HISTORIC_VOTE_THRESHOLD;
  for (var i = 0; i < threshold; i++) {
    WC.voteOnNomination(s, uid(), nom.nomination.id);
  }

  var hm = WC.getHistoricMoments(s);
  assertEqual(hm.length, 1, 'one historic moment preserved');
  assertEqual(hm[0].entryId, raidEntry.id, 'correct entry preserved as historic moment');

  // Weekly digest
  var digest = WC.generateWeeklyDigest(s, '2026-W01', 99, 50, 750);
  assert(digest.success, 'weekly digest generated');
  assertEqual(digest.digest.totalEvents, 7, 'digest covers all 7 events');
  assertLTE(digest.digest.selectedEvents.length, WC._WEEKLY_DIGEST_SIZE, 'selected within limit');

  // Alice is most involved player
  var aliceStats = WC.getPlayerStats(s, 'alice');
  assertGTE(aliceStats.totalEvents, 4, 'alice involved in 4+ events');

  // Search finds historic moments
  var aliceSearch = WC.searchChronicle(s, { participant: 'alice' });
  assertGTE(aliceSearch.length, 4, 'search finds alice in 4+ events');

  // Era check
  var currentEra = WC.getCurrentEra(s);
  assertEqual(currentEra.name, 'The Dawn Age', 'still in Dawn Age with 7 events');
});

// ============================================================================
// SUITE 32: Category breakdown in digest
// ============================================================================

suite('Digest Category Breakdown', function() {
  var s = fresh();
  var cats = WC._EVENT_CATEGORIES;

  // Add one event per category
  cats.forEach(function(cat, idx) {
    WC.recordEvent(s, cat, cat + ' event', 'Desc', ['p1'], null, { significance: 10 }, idx * 100, []);
  });

  var digest = WC.generateWeeklyDigest(s, 'test-week', 42, 0, 9999);
  var breakdown = digest.digest.categoryBreakdown;

  cats.forEach(function(cat) {
    assertEqual(breakdown[cat], 1, 'breakdown has 1 for category: ' + cat);
  });
});

// ============================================================================
// SUITE 33: Historic moments in weekly digest
// ============================================================================

suite('Historic Moments in Weekly Digest', function() {
  var s = fresh();
  var r = addEntry(s, { timestamp: 500 });

  // Make it a historic moment
  var n = WC.nominateHistoricMoment(s, uid(), r.entry.id, 'Truly historic!');
  var threshold = WC._HISTORIC_VOTE_THRESHOLD;
  for (var i = 0; i < threshold; i++) {
    WC.voteOnNomination(s, uid(), n.nomination.id);
  }

  var digest = WC.generateWeeklyDigest(s, 'hm-week', 99, 0, 9999);
  assert(digest.success, 'digest generated');
  assertArray(digest.digest.historicMomentsThisWeek, 'historicMomentsThisWeek is array');
  assertEqual(digest.digest.historicMomentsThisWeek.length, 1, 'one historic moment in digest');

  // Historic moment outside week range not included
  var digest2 = WC.generateWeeklyDigest(s, 'hm-week-2', 99, 1000, 9999);
  assertEqual(digest2.digest.historicMomentsThisWeek.length, 0, 'historic moment outside range not in digest');
});

// ============================================================================
// SUMMARY
// ============================================================================

process.stdout.write('\n' + passed + ' passed, ' + failed + ' failed\n');

if (failed > 0) {
  process.stdout.write('\nFailed tests:\n');
  failures.forEach(function(f) {
    process.stdout.write('  - ' + f + '\n');
  });
  process.exit(1);
}
