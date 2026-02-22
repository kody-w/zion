/**
 * tests/test_performance_stage.js
 * 200+ tests for the PerformanceStage module.
 *
 * Covers: constants, state, performer profiles, scheduling, set lists,
 * performance lifecycle, audience system, crowd reactions, Spark tipping,
 * performance ratings, encore mechanic, deterministic PRNG, and edge cases.
 */
'use strict';

var PS = require('../src/js/performance_stage');

// ---------------------------------------------------------------------------
// Simple test harness (var only, ES5-compatible)
// ---------------------------------------------------------------------------
var passed = 0;
var failed = 0;
var failMessages = [];

function assert(condition, msg) {
  if (condition) {
    passed++;
    process.stdout.write('  ok - ' + msg + '\n');
  } else {
    failed++;
    failMessages.push(msg);
    process.stdout.write('  FAIL - ' + msg + '\n');
  }
}

function assertEqual(a, b, msg) {
  var ok = a === b;
  if (!ok) {
    process.stdout.write('    Expected: ' + JSON.stringify(b) + ', Got: ' + JSON.stringify(a) + '\n');
  }
  assert(ok, msg);
}

function assertApprox(a, b, tolerance, msg) {
  var ok = Math.abs(a - b) <= tolerance;
  if (!ok) {
    process.stdout.write('    Expected ~' + b + ' (tol ' + tolerance + '), Got: ' + a + '\n');
  }
  assert(ok, msg);
}

function suite(name) {
  process.stdout.write('\n--- ' + name + ' ---\n');
}

// ---------------------------------------------------------------------------
// State factory
// ---------------------------------------------------------------------------
var _uid = 0;
function uid(prefix) { return (prefix || 'player') + '_' + (++_uid); }

function freshState() {
  return PS.createState();
}

// Helpers to create common objects
function makePerformer() { return uid('performer'); }
function makeAudience()  { return uid('audience'); }

function setupActivePerf(state, overrides) {
  var opts = overrides || {};
  var performerId = opts.performerId || makePerformer();
  var stageId     = opts.stageId    || 'main_stage';
  var perfType    = opts.perfType   || 'music';
  var title       = opts.title      || 'Test Concert';
  var result = PS.startPerformance(state, performerId, stageId, perfType, title);
  return { performerId: performerId, perfId: result.performance && result.performance.id, result: result };
}

function setupSlot(state, overrides) {
  var opts = overrides || {};
  var performerId  = opts.performerId  || makePerformer();
  var stageId      = opts.stageId      || 'main_stage';
  var perfType     = opts.perfType     || 'music';
  var startTime    = opts.startTime    || (Date.now() + 3600000); // 1h from now
  var durationSecs = opts.durationSecs || 3600;
  var title        = opts.title        || 'Test Show';
  return PS.bookSlot(state, performerId, stageId, perfType, startTime, durationSecs, title, 'desc');
}

function setupSetList(state, overrides) {
  var opts = overrides || {};
  var performerId = opts.performerId || makePerformer();
  var title       = opts.title       || 'My Set List';
  var perfType    = opts.perfType    || 'music';
  return PS.createSetList(state, performerId, title, perfType);
}

// ---------------------------------------------------------------------------
// SUITE: Constants & Exports
// ---------------------------------------------------------------------------
suite('Constants and Exports');

assert(typeof PS.PERFORMANCE_TYPES === 'object', 'PERFORMANCE_TYPES exported');
assert(typeof PS.STAGE_TYPES === 'object', 'STAGE_TYPES exported');
assert(Array.isArray(PS.REACTION_TYPES), 'REACTION_TYPES is array');
assert(typeof PS.REACTION_SENTIMENT === 'object', 'REACTION_SENTIMENT exported');
assert(typeof PS.ENCORE_THRESHOLD === 'number', 'ENCORE_THRESHOLD is number');
assertEqual(PS.ENCORE_THRESHOLD, 0.70, 'ENCORE_THRESHOLD is 0.70');
assert(PS.SPARK_PER_ATTENDEE_MIN === 5, 'SPARK_PER_ATTENDEE_MIN is 5');
assert(PS.SPARK_PER_ATTENDEE_MAX === 20, 'SPARK_PER_ATTENDEE_MAX is 20');
assert(PS.TIP_MIN === 1, 'TIP_MIN is 1');
assert(PS.TIP_MAX === 50, 'TIP_MAX is 50');
assert(PS.TIP_CAP_PER_PERFORMANCE === 100, 'TIP_CAP_PER_PERFORMANCE is 100');
assert(PS.MIN_SLOT_DURATION === 300, 'MIN_SLOT_DURATION is 300');
assert(PS.MAX_SLOT_DURATION === 7200, 'MAX_SLOT_DURATION is 7200');
assert(PS.MIN_RATING === 1, 'MIN_RATING is 1');
assert(PS.MAX_RATING === 5, 'MAX_RATING is 5');

// ---------------------------------------------------------------------------
// SUITE: PERFORMANCE_TYPES
// ---------------------------------------------------------------------------
suite('PERFORMANCE_TYPES');

assert(PS.PERFORMANCE_TYPES.music  !== undefined, 'music type defined');
assert(PS.PERFORMANCE_TYPES.story  !== undefined, 'story type defined');
assert(PS.PERFORMANCE_TYPES.art    !== undefined, 'art type defined');
assert(PS.PERFORMANCE_TYPES.dance  !== undefined, 'dance type defined');
assertEqual(Object.keys(PS.PERFORMANCE_TYPES).length, 4, 'exactly 4 performance types');

var types = ['music', 'story', 'art', 'dance'];
types.forEach(function(t) {
  var pt = PS.PERFORMANCE_TYPES[t];
  assert(pt.id === t, t + ' id matches key');
  assert(typeof pt.name === 'string' && pt.name.length > 0, t + ' has name');
  assert(typeof pt.maxSetItems === 'number' && pt.maxSetItems > 0, t + ' has maxSetItems');
  assert(typeof pt.minSetItems === 'number' && pt.minSetItems >= 1, t + ' has minSetItems >= 1');
});

assert(PS.PERFORMANCE_TYPES.music.maxSetItems >= 10, 'music allows 10+ set items');
assert(PS.PERFORMANCE_TYPES.art.maxSetItems >= 20, 'art allows 20+ set items');

// ---------------------------------------------------------------------------
// SUITE: STAGE_TYPES
// ---------------------------------------------------------------------------
suite('STAGE_TYPES');

assert(PS.STAGE_TYPES.main_stage    !== undefined, 'main_stage defined');
assert(PS.STAGE_TYPES.intimate_hall !== undefined, 'intimate_hall defined');
assert(PS.STAGE_TYPES.gallery_stage !== undefined, 'gallery_stage defined');
assert(PS.STAGE_TYPES.amphitheater  !== undefined, 'amphitheater defined');
assertEqual(Object.keys(PS.STAGE_TYPES).length, 4, 'exactly 4 stage types');

var stageKeys = ['main_stage', 'intimate_hall', 'gallery_stage', 'amphitheater'];
stageKeys.forEach(function(sk) {
  var st = PS.STAGE_TYPES[sk];
  assert(st.id === sk, sk + ' id matches key');
  assert(typeof st.name === 'string', sk + ' has name');
  assert(typeof st.maxAudience === 'number' && st.maxAudience > 0, sk + ' maxAudience > 0');
  assert(Array.isArray(st.allowedTypes) && st.allowedTypes.length > 0, sk + ' has allowedTypes');
  assert(typeof st.acousticBonus === 'number' && st.acousticBonus >= 1, sk + ' acousticBonus >= 1');
});

assert(PS.STAGE_TYPES.main_stage.maxAudience >= 100, 'main_stage fits 100+');
assert(PS.STAGE_TYPES.amphitheater.maxAudience >= 200, 'amphitheater fits 200+');
assert(PS.STAGE_TYPES.intimate_hall.maxAudience <= 100, 'intimate_hall is smaller');

// ---------------------------------------------------------------------------
// SUITE: REACTION_TYPES and REACTION_SENTIMENT
// ---------------------------------------------------------------------------
suite('REACTION_TYPES and REACTION_SENTIMENT');

assert(PS.REACTION_TYPES.length >= 4, 'at least 4 reaction types');
assert(PS.REACTION_TYPES.indexOf('cheer')   !== -1, 'cheer reaction exists');
assert(PS.REACTION_TYPES.indexOf('applaud') !== -1, 'applaud reaction exists');
assert(PS.REACTION_TYPES.indexOf('encore')  !== -1, 'encore reaction exists');

PS.REACTION_TYPES.forEach(function(rt) {
  assert(typeof PS.REACTION_SENTIMENT[rt] === 'number', rt + ' has sentiment value');
  assert(PS.REACTION_SENTIMENT[rt] >= 0 && PS.REACTION_SENTIMENT[rt] <= 1, rt + ' sentiment 0-1');
});

assert(PS.REACTION_SENTIMENT.cheer >= 0.8, 'cheer has high positive sentiment');
assert(PS.REACTION_SENTIMENT.encore >= 0.8, 'encore has high positive sentiment');

// ---------------------------------------------------------------------------
// SUITE: State Management
// ---------------------------------------------------------------------------
suite('State Management');

var s0 = PS.createState();
assert(Array.isArray(s0.performances), 'createState has performances array');
assert(Array.isArray(s0.scheduledSlots), 'createState has scheduledSlots array');
assert(typeof s0.setLists === 'object', 'createState has setLists object');
assert(typeof s0.performerProfiles === 'object', 'createState has performerProfiles');
assert(typeof s0.audienceRecords === 'object', 'createState has audienceRecords');
assert(typeof s0.reactions === 'object', 'createState has reactions');
assert(typeof s0.ratings === 'object', 'createState has ratings');
assert(typeof s0.tipLedger === 'object', 'createState has tipLedger');
assert(typeof s0.encoreRequests === 'object', 'createState has encoreRequests');

// ensureState on null doesn't throw
var nullSafe = false;
try { PS.ensureState(null); nullSafe = true; } catch(e) {}
assert(nullSafe, 'ensureState(null) is safe');

// ensureState on empty object fills collections
var bare = {};
PS.ensureState(bare);
assert(Array.isArray(bare.performances), 'ensureState fills performances');
assert(typeof bare.setLists === 'object', 'ensureState fills setLists');

// ---------------------------------------------------------------------------
// SUITE: Performer Profiles
// ---------------------------------------------------------------------------
suite('Performer Profiles');

var sP = freshState();
var pid1 = makePerformer();

var profile1 = PS.getPerformerProfile(sP, pid1);
assert(profile1 !== null, 'getPerformerProfile returns profile');
assertEqual(profile1.performerId, pid1, 'profile has correct performerId');
assertEqual(profile1.totalShows, 0, 'new profile totalShows = 0');
assertEqual(profile1.totalTipsReceived, 0, 'new profile totalTips = 0');
assertEqual(profile1.ratingSum, 0, 'new profile ratingSum = 0');
assertEqual(profile1.ratingCount, 0, 'new profile ratingCount = 0');
assertEqual(profile1.encoresEarned, 0, 'new profile encoresEarned = 0');
assert(Array.isArray(profile1.performanceHistory), 'performanceHistory is array');
assertEqual(profile1.performanceHistory.length, 0, 'fresh performanceHistory empty');
assertEqual(profile1.reputation, 0, 'new profile reputation = 0');

// Same profile returned on second call
var profile1b = PS.getPerformerProfile(sP, pid1);
assertEqual(profile1b.performerId, pid1, 'same profile returned for same id');
assertEqual(sP.performerProfiles[pid1].totalShows, 0, 'profile stored in state');

// Average rating for performer with no shows
assertEqual(PS.getAverageRating(sP, pid1), 0, 'getAverageRating = 0 for no shows');

// ---------------------------------------------------------------------------
// SUITE: Slot Scheduling — bookSlot
// ---------------------------------------------------------------------------
suite('Slot Scheduling — bookSlot');

var sSl = freshState();
var slotPerformer = makePerformer();
var futureTime = Date.now() + 3600000;

// Valid booking
var slotResult = PS.bookSlot(sSl, slotPerformer, 'main_stage', 'music', futureTime, 3600, 'Great Show', 'desc');
assert(slotResult.success, 'bookSlot succeeds with valid params');
assert(slotResult.slot !== undefined, 'bookSlot returns slot');
assert(typeof slotResult.slot.id === 'string', 'slot has id');
assertEqual(slotResult.slot.performerId, slotPerformer, 'slot has correct performerId');
assertEqual(slotResult.slot.stageId, 'main_stage', 'slot has correct stageId');
assertEqual(slotResult.slot.perfType, 'music', 'slot has correct perfType');
assertEqual(slotResult.slot.title, 'Great Show', 'slot has correct title');
assertEqual(slotResult.slot.durationSecs, 3600, 'slot has correct duration');
assertEqual(slotResult.slot.status, 'scheduled', 'slot status is scheduled');
assert(typeof slotResult.slot.createdAt === 'number', 'slot has createdAt');

// Invalid performer
var inv1 = PS.bookSlot(sSl, '', 'main_stage', 'music', futureTime + 10000000, 3600, 'Title');
assert(!inv1.success, 'bookSlot fails with empty performerId');
assert(typeof inv1.reason === 'string', 'failure has reason');

// Invalid stage
var inv2 = PS.bookSlot(sSl, makePerformer(), 'bad_stage', 'music', futureTime + 10000000, 3600, 'Title');
assert(!inv2.success, 'bookSlot fails with unknown stage');

// Invalid type
var inv3 = PS.bookSlot(sSl, makePerformer(), 'main_stage', 'bad_type', futureTime + 10000000, 3600, 'Title');
assert(!inv3.success, 'bookSlot fails with unknown type');

// Wrong stage for type (intimate_hall doesn't support dance)
var inv4 = PS.bookSlot(sSl, makePerformer(), 'intimate_hall', 'dance', futureTime + 10000000, 3600, 'Title');
assert(!inv4.success, 'bookSlot fails when stage does not support type');

// Invalid title
var inv5 = PS.bookSlot(sSl, makePerformer(), 'main_stage', 'music', futureTime + 10000000, 3600, '');
assert(!inv5.success, 'bookSlot fails with empty title');

// Invalid start time
var inv6 = PS.bookSlot(sSl, makePerformer(), 'main_stage', 'music', -1, 3600, 'Title');
assert(!inv6.success, 'bookSlot fails with negative startTime');

// Duration too short
var inv7 = PS.bookSlot(sSl, makePerformer(), 'main_stage', 'music', futureTime + 10000000, 100, 'Title');
assert(!inv7.success, 'bookSlot fails with duration < MIN_SLOT_DURATION');

// Duration too long
var inv8 = PS.bookSlot(sSl, makePerformer(), 'main_stage', 'music', futureTime + 10000000, 99999, 'Title');
assert(!inv8.success, 'bookSlot fails with duration > MAX_SLOT_DURATION');

// Conflict check on same stage
var slotPerf2 = makePerformer();
var conflictTime = slotResult.slot.startTime + 1000; // overlapping
var conflict = PS.bookSlot(sSl, slotPerf2, 'main_stage', 'music', conflictTime, 3600, 'Conflict Show');
assert(!conflict.success, 'bookSlot fails on conflicting time slot');

// Non-conflicting slot on same stage (after first ends)
var after = slotResult.slot.startTime + slotResult.slot.durationSecs * 1000 + 60000;
var noConflict = PS.bookSlot(sSl, slotPerf2, 'main_stage', 'music', after, 3600, 'After Show');
assert(noConflict.success, 'bookSlot succeeds after first slot ends');

// Different stage same time — no conflict
var diffStage = PS.bookSlot(sSl, slotPerf2, 'amphitheater', 'music', futureTime, 3600, 'Parallel Show');
assert(diffStage.success, 'bookSlot succeeds on different stage same time');

// Slot in state
assertEqual(sSl.scheduledSlots.length >= 3, true, 'state.scheduledSlots has entries');

// ---------------------------------------------------------------------------
// SUITE: cancelSlot
// ---------------------------------------------------------------------------
suite('cancelSlot');

var sCan = freshState();
var canPerformer = makePerformer();
var slotForCancel = PS.bookSlot(sCan, canPerformer, 'main_stage', 'music', Date.now() + 3600000, 3600, 'Cancel Me');
var cancelSlotId = slotForCancel.slot.id;

// Wrong requester
var wrongCancel = PS.cancelSlot(sCan, cancelSlotId, makePerformer());
assert(!wrongCancel.success, 'cancelSlot fails for wrong requester');

// Correct requester
var okCancel = PS.cancelSlot(sCan, cancelSlotId, canPerformer);
assert(okCancel.success, 'cancelSlot succeeds for performer');
assertEqual(okCancel.slot.status, 'cancelled', 'slot status is cancelled');

// Double-cancel
var doubleCancel = PS.cancelSlot(sCan, cancelSlotId, canPerformer);
assert(!doubleCancel.success, 'double cancel fails');

// Non-existent slot
var noSlot = PS.cancelSlot(sCan, 'slot_9999', canPerformer);
assert(!noSlot.success, 'cancelSlot fails for non-existent slot');

// ---------------------------------------------------------------------------
// SUITE: getUpcomingSlots
// ---------------------------------------------------------------------------
suite('getUpcomingSlots');

var sGU = freshState();
var p_a = makePerformer();
var p_b = makePerformer();
var baseTime = Date.now() + 1000000;
PS.bookSlot(sGU, p_a, 'main_stage', 'music',  baseTime,          3600, 'Show A');
PS.bookSlot(sGU, p_b, 'amphitheater', 'dance', baseTime + 10000000, 3600, 'Show B');
PS.bookSlot(sGU, p_a, 'intimate_hall', 'story', baseTime + 20000000, 600, 'Story A');

var upcoming = PS.getUpcomingSlots(sGU);
assert(upcoming.length >= 3, 'getUpcomingSlots returns all future slots');

// Filter by stage
var mainOnly = PS.getUpcomingSlots(sGU, { stageId: 'main_stage' });
assert(mainOnly.every(function(s) { return s.stageId === 'main_stage'; }), 'stageId filter works');

// Filter by type
var danceOnly = PS.getUpcomingSlots(sGU, { perfType: 'dance' });
assert(danceOnly.every(function(s) { return s.perfType === 'dance'; }), 'perfType filter works');

// Filter by performer
var paSlots = PS.getUpcomingSlots(sGU, { performerId: p_a });
assertEqual(paSlots.length, 2, 'performer filter returns correct count');

// Results sorted by startTime
for (var si = 1; si < upcoming.length; si++) {
  assert(upcoming[si].startTime >= upcoming[si-1].startTime, 'slots sorted by startTime');
}

// Past slots not returned
var past = { status: 'scheduled', startTime: Date.now() - 1000, stageId: 'main_stage', perfType: 'music' };
sGU.scheduledSlots.push(past);
var upAfterPast = PS.getUpcomingSlots(sGU);
assert(!upAfterPast.some(function(sl) { return sl.startTime <= Date.now(); }), 'past slots excluded');

// ---------------------------------------------------------------------------
// SUITE: Set List — createSetList
// ---------------------------------------------------------------------------
suite('createSetList');

var sCSL = freshState();
var cslPerformer = makePerformer();

var sl1 = PS.createSetList(sCSL, cslPerformer, 'My Album', 'music');
assert(sl1.success, 'createSetList succeeds');
assert(sl1.setList !== undefined, 'createSetList returns setList');
assert(typeof sl1.setList.id === 'string', 'setList has id');
assertEqual(sl1.setList.performerId, cslPerformer, 'setList has correct performerId');
assertEqual(sl1.setList.title, 'My Album', 'setList has correct title');
assertEqual(sl1.setList.perfType, 'music', 'setList has correct perfType');
assert(Array.isArray(sl1.setList.items), 'setList.items is array');
assertEqual(sl1.setList.items.length, 0, 'fresh setList has 0 items');
assert(typeof sl1.setList.createdAt === 'number', 'setList has createdAt');

// Stored in state
assert(sCSL.setLists[sl1.setList.id] !== undefined, 'setList stored in state');

// Invalid performer
var inv_sl1 = PS.createSetList(sCSL, '', 'Title', 'music');
assert(!inv_sl1.success, 'createSetList fails with empty performerId');

// Invalid title
var inv_sl2 = PS.createSetList(sCSL, cslPerformer, '', 'music');
assert(!inv_sl2.success, 'createSetList fails with empty title');

// Invalid type
var inv_sl3 = PS.createSetList(sCSL, cslPerformer, 'Title', 'bad_type');
assert(!inv_sl3.success, 'createSetList fails with invalid perfType');

// ---------------------------------------------------------------------------
// SUITE: Set List — addSetItem
// ---------------------------------------------------------------------------
suite('addSetItem');

var sASI = freshState();
var asiPerformer = makePerformer();
var asiSL = PS.createSetList(sASI, asiPerformer, 'Set List', 'music').setList;

var item1 = PS.addSetItem(sASI, asiSL.id, 'Song 1', 'First song', 180);
assert(item1.success, 'addSetItem succeeds');
assert(item1.item !== undefined, 'addSetItem returns item');
assertEqual(item1.item.title, 'Song 1', 'item has correct title');
assertEqual(item1.item.estimatedDurationSecs, 180, 'item has correct duration');
assertEqual(item1.item.order, 0, 'first item order = 0');

var item2 = PS.addSetItem(sASI, asiSL.id, 'Song 2', 'Second', 200);
assert(item2.success, 'add second item succeeds');
assertEqual(item2.item.order, 1, 'second item order = 1');
assertEqual(sASI.setLists[asiSL.id].items.length, 2, 'state reflects 2 items');

// Empty title
var inv_asi1 = PS.addSetItem(sASI, asiSL.id, '', 'desc', 100);
assert(!inv_asi1.success, 'addSetItem fails with empty title');

// Invalid set list
var inv_asi2 = PS.addSetItem(sASI, 'bad_id', 'Song', 'desc', 100);
assert(!inv_asi2.success, 'addSetItem fails with invalid set list id');

// Negative duration clamped to 0
var item3 = PS.addSetItem(sASI, asiSL.id, 'Short', 'desc', -5);
assert(item3.success, 'addSetItem accepts negative duration (clamped to 0)');
assertEqual(item3.item.estimatedDurationSecs, 0, 'negative duration clamped to 0');

// Fill to max
var maxSL = PS.createSetList(sASI, asiPerformer, 'Full List', 'music').setList;
var maxItems = PS.PERFORMANCE_TYPES['music'].maxSetItems;
for (var mi = 0; mi < maxItems; mi++) {
  PS.addSetItem(sASI, maxSL.id, 'Item ' + mi, '', 60);
}
var overMax = PS.addSetItem(sASI, maxSL.id, 'Extra', '', 60);
assert(!overMax.success, 'addSetItem fails when set list is full');

// ---------------------------------------------------------------------------
// SUITE: Set List — removeSetItem
// ---------------------------------------------------------------------------
suite('removeSetItem');

var sRSI = freshState();
var rsiP = makePerformer();
var rsiSL = PS.createSetList(sRSI, rsiP, 'Remove Test', 'music').setList;
PS.addSetItem(sRSI, rsiSL.id, 'A', '', 60);
PS.addSetItem(sRSI, rsiSL.id, 'B', '', 60);
PS.addSetItem(sRSI, rsiSL.id, 'C', '', 60);

var removed = PS.removeSetItem(sRSI, rsiSL.id, 1);
assert(removed.success, 'removeSetItem succeeds');
assertEqual(removed.removed.title, 'B', 'correct item removed');
assertEqual(sRSI.setLists[rsiSL.id].items.length, 2, '2 items remain');
assertEqual(sRSI.setLists[rsiSL.id].items[0].order, 0, 'first item re-indexed to 0');
assertEqual(sRSI.setLists[rsiSL.id].items[1].order, 1, 'second item re-indexed to 1');

// Invalid index
var inv_rsi = PS.removeSetItem(sRSI, rsiSL.id, 99);
assert(!inv_rsi.success, 'removeSetItem fails with invalid index');

// Invalid set list
var inv_rsi2 = PS.removeSetItem(sRSI, 'bad', 0);
assert(!inv_rsi2.success, 'removeSetItem fails with bad setListId');

// ---------------------------------------------------------------------------
// SUITE: Set List — reorderSetItem
// ---------------------------------------------------------------------------
suite('reorderSetItem');

var sROSI = freshState();
var rosiP = makePerformer();
var rosiSL = PS.createSetList(sROSI, rosiP, 'Order Test', 'story').setList;
PS.addSetItem(sROSI, rosiSL.id, 'Chapter 1', '', 120);
PS.addSetItem(sROSI, rosiSL.id, 'Chapter 2', '', 120);
PS.addSetItem(sROSI, rosiSL.id, 'Chapter 3', '', 120);

var reorder = PS.reorderSetItem(sROSI, rosiSL.id, 0, 2);
assert(reorder.success, 'reorderSetItem succeeds');
assertEqual(sROSI.setLists[rosiSL.id].items[0].title, 'Chapter 2', 'after reorder: index 0 is Chapter 2');
assertEqual(sROSI.setLists[rosiSL.id].items[1].title, 'Chapter 3', 'after reorder: index 1 is Chapter 3');
assertEqual(sROSI.setLists[rosiSL.id].items[2].title, 'Chapter 1', 'after reorder: index 2 is Chapter 1');

// Same index is a no-op success
var noopReorder = PS.reorderSetItem(sROSI, rosiSL.id, 0, 0);
assert(noopReorder.success, 'reorderSetItem same index is no-op success');

// Invalid indices
var inv_ro = PS.reorderSetItem(sROSI, rosiSL.id, 0, 99);
assert(!inv_ro.success, 'reorderSetItem fails with out-of-bounds toIndex');

var inv_ro2 = PS.reorderSetItem(sROSI, rosiSL.id, -1, 0);
assert(!inv_ro2.success, 'reorderSetItem fails with negative fromIndex');

// Invalid set list
var inv_ro3 = PS.reorderSetItem(sROSI, 'bad', 0, 1);
assert(!inv_ro3.success, 'reorderSetItem fails with bad setListId');

// ---------------------------------------------------------------------------
// SUITE: getSetListDuration
// ---------------------------------------------------------------------------
suite('getSetListDuration');

var sGSLD = freshState();
var gsldP = makePerformer();
var gsldSL = PS.createSetList(sGSLD, gsldP, 'Duration Test', 'music').setList;
assertEqual(PS.getSetListDuration(sGSLD, gsldSL.id), 0, 'empty set list duration is 0');

PS.addSetItem(sGSLD, gsldSL.id, 'Song 1', '', 180);
PS.addSetItem(sGSLD, gsldSL.id, 'Song 2', '', 240);
PS.addSetItem(sGSLD, gsldSL.id, 'Song 3', '', 120);
assertEqual(PS.getSetListDuration(sGSLD, gsldSL.id), 540, 'total duration = 540s');

// Invalid set list
assertEqual(PS.getSetListDuration(sGSLD, 'bad'), 0, 'duration for invalid setListId = 0');

// ---------------------------------------------------------------------------
// SUITE: Performance Lifecycle — startPerformance
// ---------------------------------------------------------------------------
suite('startPerformance');

var sSP = freshState();
var spPerformer = makePerformer();

var sp1 = PS.startPerformance(sSP, spPerformer, 'main_stage', 'music', 'Opening Night');
assert(sp1.success, 'startPerformance succeeds');
assert(sp1.performance !== undefined, 'returns performance object');
assert(typeof sp1.performance.id === 'string', 'performance has id');
assertEqual(sp1.performance.performerId, spPerformer, 'performance has correct performerId');
assertEqual(sp1.performance.stageId, 'main_stage', 'performance has correct stageId');
assertEqual(sp1.performance.perfType, 'music', 'performance has correct perfType');
assertEqual(sp1.performance.title, 'Opening Night', 'performance has correct title');
assertEqual(sp1.performance.status, 'active', 'performance status is active');
assert(Array.isArray(sp1.performance.audienceIds), 'audienceIds is array');
assertEqual(sp1.performance.audienceIds.length, 0, 'audienceIds starts empty');
assert(typeof sp1.performance.startedAt === 'number', 'performance has startedAt');
assertEqual(sp1.performance.encorePlayed, false, 'encorePlayed starts false');
assertEqual(sp1.performance.totalTips, 0, 'totalTips starts 0');

// State tracking
assert(sSP.reactions[sp1.performance.id] !== undefined, 'reactions array created');
assert(sSP.ratings[sp1.performance.id] !== undefined, 'ratings object created');
assert(sSP.tipLedger[sp1.performance.id] !== undefined, 'tipLedger object created');
assert(sSP.encoreRequests[sp1.performance.id] !== undefined, 'encoreRequests object created');

// Invalid performer
var inv_sp1 = PS.startPerformance(sSP, '', 'main_stage', 'music', 'Show');
assert(!inv_sp1.success, 'startPerformance fails with empty performerId');

// Invalid stage
var inv_sp2 = PS.startPerformance(sSP, makePerformer(), 'bad_stage', 'music', 'Show');
assert(!inv_sp2.success, 'startPerformance fails with bad stageId');

// Invalid type
var inv_sp3 = PS.startPerformance(sSP, makePerformer(), 'main_stage', 'bad_type', 'Show');
assert(!inv_sp3.success, 'startPerformance fails with bad perfType');

// Stage + type mismatch
var inv_sp4 = PS.startPerformance(sSP, makePerformer(), 'intimate_hall', 'dance', 'Show');
assert(!inv_sp4.success, 'startPerformance fails for unsupported type on stage');

// Empty title
var inv_sp5 = PS.startPerformance(sSP, makePerformer(), 'main_stage', 'music', '');
assert(!inv_sp5.success, 'startPerformance fails with empty title');

// Performer already has active performance
var inv_sp6 = PS.startPerformance(sSP, spPerformer, 'amphitheater', 'music', 'Second Show');
assert(!inv_sp6.success, 'startPerformance fails if performer already active');

// Stage already occupied
var inv_sp7 = PS.startPerformance(sSP, makePerformer(), 'main_stage', 'music', 'Another Show');
assert(!inv_sp7.success, 'startPerformance fails if stage already occupied');

// Different stage is fine
var sp2 = PS.startPerformance(sSP, makePerformer(), 'amphitheater', 'music', 'Amphitheater Show');
assert(sp2.success, 'startPerformance succeeds on different stage');

// With set list
var slForPerf = freshState();
var slPerfP = makePerformer();
var theSL = PS.createSetList(slForPerf, slPerfP, 'Full Set', 'music');
PS.addSetItem(slForPerf, theSL.setList.id, 'Intro', '', 30);
var slPerf = PS.startPerformance(slForPerf, slPerfP, 'main_stage', 'music', 'Set List Show', theSL.setList.id);
assert(slPerf.success, 'startPerformance succeeds with valid setList');
assertEqual(slPerf.performance.setListId, theSL.setList.id, 'setListId attached');

// Set list belongs to different performer
var otherSlPerf = makePerformer();
var otherSlFail = PS.startPerformance(slForPerf, otherSlPerf, 'amphitheater', 'music', 'Steal Show', theSL.setList.id);
assert(!otherSlFail.success, 'startPerformance fails if setList belongs to different performer');

// ---------------------------------------------------------------------------
// SUITE: Performance Lifecycle — endPerformance
// ---------------------------------------------------------------------------
suite('endPerformance');

var sEP = freshState();
var epP = makePerformer();
var epStart = PS.startPerformance(sEP, epP, 'main_stage', 'music', 'End Test');
var epId = epStart.performance.id;

// Add some audience
var aud1 = makeAudience(), aud2 = makeAudience(), aud3 = makeAudience();
PS.joinAudience(sEP, epId, aud1);
PS.joinAudience(sEP, epId, aud2);
PS.joinAudience(sEP, epId, aud3);

// Rate the performance
PS.ratePerformance(sEP, epId, aud1, 5);
PS.ratePerformance(sEP, epId, aud2, 4);

var endResult = PS.endPerformance(sEP, epId, epP);
assert(endResult.success, 'endPerformance succeeds');
assert(endResult.summary !== undefined, 'endPerformance returns summary');
assertEqual(endResult.summary.audienceCount, 3, 'summary audienceCount is 3');
assert(endResult.summary.avgRating > 0, 'summary avgRating > 0');
assert(endResult.summary.sparkEarned >= 0, 'summary sparkEarned >= 0');
assertEqual(endResult.summary.encorePlayed, false, 'encorePlayed false in summary');

// Performance status updated
var endedPerf = PS.findPerformance(sEP, epId);
assertEqual(endedPerf.status, 'completed', 'performance status is completed');
assert(endedPerf.endedAt !== null, 'performance has endedAt');

// Performer profile updated
var epProfile = PS.getPerformerProfile(sEP, epP);
assertEqual(epProfile.totalShows, 1, 'profile totalShows incremented');
assertEqual(epProfile.performanceHistory.length, 1, 'performanceHistory has 1 entry');

// Wrong performer
var inv_ep1 = PS.endPerformance(sEP, epId, makePerformer());
assert(!inv_ep1.success, 'endPerformance fails for wrong performer');

// Already ended
var inv_ep2 = PS.endPerformance(sEP, epId, epP);
assert(!inv_ep2.success, 'endPerformance fails for already-ended performance');

// Non-existent performance
var inv_ep3 = PS.endPerformance(sEP, 'perf_9999', epP);
assert(!inv_ep3.success, 'endPerformance fails for non-existent performance');

// ---------------------------------------------------------------------------
// SUITE: Spark Earnings Calculation
// ---------------------------------------------------------------------------
suite('Spark Earnings Calculation');

var sSpark = freshState();
var sparkP = makePerformer();
var sparkPerf = PS.startPerformance(sSpark, sparkP, 'main_stage', 'music', 'Spark Test');
var sparkPerfId = sparkPerf.performance.id;

// Add audience members and tips
for (var ai = 0; ai < 10; ai++) {
  var audMember = makeAudience();
  PS.joinAudience(sSpark, sparkPerfId, audMember);
  PS.ratePerformance(sSpark, sparkPerfId, audMember, 5);
}

var sparkEnd = PS.endPerformance(sSpark, sparkPerfId, sparkP);
assert(sparkEnd.summary.sparkEarned > 0, 'sparkEarned > 0 with audience');
assert(sparkEnd.summary.sparkEarned >= PS.SPARK_PER_ATTENDEE_MIN * 10, 'sparkEarned meets minimum per attendee');
assert(sparkEnd.summary.sparkEarned <= PS.SPARK_PER_ATTENDEE_MAX * 10 * 2, 'sparkEarned within reasonable maximum');

// No audience = 0 Spark from show (tips may still count)
var sSpark2 = freshState();
var sparkP2 = makePerformer();
var sparkPerf2 = PS.startPerformance(sSpark2, sparkP2, 'main_stage', 'music', 'Empty Show');
var sparkEnd2 = PS.endPerformance(sSpark2, sparkPerf2.performance.id, sparkP2);
assertEqual(sparkEnd2.summary.sparkEarned, 0, 'sparkEarned = 0 with no audience and no ratings');

// ---------------------------------------------------------------------------
// SUITE: cancelPerformance
// ---------------------------------------------------------------------------
suite('cancelPerformance');

var sCancelP = freshState();
var cancelPerfP = makePerformer();
var cancelPerfR = PS.startPerformance(sCancelP, cancelPerfP, 'main_stage', 'music', 'Cancel Test');
var cancelPerfId = cancelPerfR.performance.id;

// Wrong performer
var inv_cp1 = PS.cancelPerformance(sCancelP, cancelPerfId, makePerformer());
assert(!inv_cp1.success, 'cancelPerformance fails for wrong performer');

// Valid cancel
var okCancel2 = PS.cancelPerformance(sCancelP, cancelPerfId, cancelPerfP);
assert(okCancel2.success, 'cancelPerformance succeeds');
assertEqual(PS.findPerformance(sCancelP, cancelPerfId).status, 'cancelled', 'performance status = cancelled');

// Already cancelled
var inv_cp2 = PS.cancelPerformance(sCancelP, cancelPerfId, cancelPerfP);
assert(!inv_cp2.success, 'cancelPerformance fails on already-cancelled performance');

// Non-existent
var inv_cp3 = PS.cancelPerformance(sCancelP, 'perf_9999', cancelPerfP);
assert(!inv_cp3.success, 'cancelPerformance fails for non-existent performance');

// ---------------------------------------------------------------------------
// SUITE: Audience System — joinAudience
// ---------------------------------------------------------------------------
suite('Audience — joinAudience');

var sAud = freshState();
var audP = makePerformer();
var audPerf = PS.startPerformance(sAud, audP, 'main_stage', 'music', 'Audience Test');
var audPerfId = audPerf.performance.id;
var aud_a = makeAudience(), aud_b = makeAudience();

var join1 = PS.joinAudience(sAud, audPerfId, aud_a);
assert(join1.success, 'joinAudience succeeds');

var join2 = PS.joinAudience(sAud, audPerfId, aud_b);
assert(join2.success, 'second joinAudience succeeds');

// Verify audience size
assertEqual(PS.getAudienceCount(sAud, audPerfId), 2, 'audience count = 2');

// Performer cannot join own audience
var selfJoin = PS.joinAudience(sAud, audPerfId, audP);
assert(!selfJoin.success, 'performer cannot join own audience');

// Already in audience
var dupJoin = PS.joinAudience(sAud, audPerfId, aud_a);
assert(!dupJoin.success, 'cannot join audience twice');

// Non-existent performance
var badJoin = PS.joinAudience(sAud, 'perf_9999', aud_a);
assert(!badJoin.success, 'joinAudience fails for non-existent performance');

// Stage capacity
var fullSt = freshState();
var fullP = makePerformer();
var fullPerf = PS.startPerformance(fullSt, fullP, 'intimate_hall', 'story', 'Cozy Show');
var fullPerfId = fullPerf.performance.id;
var maxCap = PS.STAGE_TYPES['intimate_hall'].maxAudience;
for (var ci = 0; ci < maxCap; ci++) {
  PS.joinAudience(fullSt, fullPerfId, makeAudience());
}
var overCapacity = PS.joinAudience(fullSt, fullPerfId, makeAudience());
assert(!overCapacity.success, 'joinAudience fails when stage at capacity');

// Not active performance
var inactiveState = freshState();
var inactiveP = makePerformer();
var inactivePerf = PS.startPerformance(inactiveState, inactiveP, 'main_stage', 'music', 'Inactive');
PS.endPerformance(inactiveState, inactivePerf.performance.id, inactiveP);
var joinInactive = PS.joinAudience(inactiveState, inactivePerf.performance.id, makeAudience());
assert(!joinInactive.success, 'joinAudience fails for completed performance');

// ---------------------------------------------------------------------------
// SUITE: Audience — leaveAudience
// ---------------------------------------------------------------------------
suite('Audience — leaveAudience');

var sLeave = freshState();
var leaveP = makePerformer();
var leavePR = PS.startPerformance(sLeave, leaveP, 'main_stage', 'music', 'Leave Test');
var leavePerfId = leavePR.performance.id;
var leaveAud = makeAudience();
PS.joinAudience(sLeave, leavePerfId, leaveAud);

var leaveR = PS.leaveAudience(sLeave, leavePerfId, leaveAud);
assert(leaveR.success, 'leaveAudience succeeds');
assertEqual(PS.getAudienceCount(sLeave, leavePerfId), 0, 'audience count = 0 after leave');

// Not in audience
var notInAud = PS.leaveAudience(sLeave, leavePerfId, makeAudience());
assert(!notInAud.success, 'leaveAudience fails if not in audience');

// Non-existent performance
var badLeave = PS.leaveAudience(sLeave, 'perf_9999', leaveAud);
assert(!badLeave.success, 'leaveAudience fails for non-existent performance');

// ---------------------------------------------------------------------------
// SUITE: Audience — isInAudience
// ---------------------------------------------------------------------------
suite('isInAudience');

var sIsIn = freshState();
var isInP = makePerformer();
var isInPR = PS.startPerformance(sIsIn, isInP, 'main_stage', 'music', 'IsIn Test');
var isInPerfId = isInPR.performance.id;
var isInAud = makeAudience();

assert(!PS.isInAudience(sIsIn, isInAud), 'isInAudience false before joining');
PS.joinAudience(sIsIn, isInPerfId, isInAud);
assert(PS.isInAudience(sIsIn, isInAud), 'isInAudience true after joining');
PS.leaveAudience(sIsIn, isInPerfId, isInAud);
assert(!PS.isInAudience(sIsIn, isInAud), 'isInAudience false after leaving');

// ---------------------------------------------------------------------------
// SUITE: Crowd Reactions — sendReaction
// ---------------------------------------------------------------------------
suite('sendReaction');

var sRx = freshState();
var rxP = makePerformer();
var rxPR = PS.startPerformance(sRx, rxP, 'main_stage', 'music', 'Reaction Test');
var rxPerfId = rxPR.performance.id;
var rxAud1 = makeAudience(), rxAud2 = makeAudience();
PS.joinAudience(sRx, rxPerfId, rxAud1);
PS.joinAudience(sRx, rxPerfId, rxAud2);

var rx1 = PS.sendReaction(sRx, rxPerfId, rxAud1, 'cheer');
assert(rx1.success, 'sendReaction succeeds');
assert(rx1.reaction !== undefined, 'sendReaction returns reaction');
assertEqual(rx1.reaction.type, 'cheer', 'reaction has correct type');
assert(typeof rx1.reaction.sentiment === 'number', 'reaction has sentiment');
assert(typeof rx1.reaction.id === 'string', 'reaction has id');

// Multiple reactions from same person OK (no dedup for reactions)
var rx2 = PS.sendReaction(sRx, rxPerfId, rxAud1, 'applaud');
assert(rx2.success, 'second reaction from same person succeeds');

// Invalid reaction type
var inv_rx1 = PS.sendReaction(sRx, rxPerfId, rxAud1, 'bad_type');
assert(!inv_rx1.success, 'sendReaction fails with invalid type');

// Not in audience
var inv_rx2 = PS.sendReaction(sRx, rxPerfId, makeAudience(), 'cheer');
assert(!inv_rx2.success, 'sendReaction fails if not in audience');

// Non-existent performance
var inv_rx3 = PS.sendReaction(sRx, 'perf_9999', rxAud1, 'cheer');
assert(!inv_rx3.success, 'sendReaction fails for non-existent performance');

// Performer can react
var rxPerf = PS.sendReaction(sRx, rxPerfId, rxP, 'wow');
assert(rxPerf.success, 'performer can react to own performance');

// Reactions stored in state
var rxCount = sRx.reactions[rxPerfId].length;
assert(rxCount >= 3, 'reactions stored in state');

// ---------------------------------------------------------------------------
// SUITE: getCrowdMood
// ---------------------------------------------------------------------------
suite('getCrowdMood');

var sMood = freshState();
var moodP = makePerformer();
var moodPR = PS.startPerformance(sMood, moodP, 'main_stage', 'music', 'Mood Test');
var moodPerfId = moodPR.performance.id;
var moodAud1 = makeAudience(), moodAud2 = makeAudience();
PS.joinAudience(sMood, moodPerfId, moodAud1);
PS.joinAudience(sMood, moodPerfId, moodAud2);

// Neutral when no reactions
assertEqual(PS.getCrowdMood(sMood, moodPerfId), 0.5, 'crowd mood = 0.5 with no reactions');

// After positive reactions
PS.sendReaction(sMood, moodPerfId, moodAud1, 'cheer');  // sentiment = 1.0
PS.sendReaction(sMood, moodPerfId, moodAud2, 'cheer');  // sentiment = 1.0
var mood1 = PS.getCrowdMood(sMood, moodPerfId);
assert(mood1 > 0.5, 'crowd mood increases with positive reactions');
assert(mood1 <= 1.0, 'crowd mood <= 1.0');

// Non-existent
assert(typeof PS.getCrowdMood(sMood, 'bad') === 'number', 'getCrowdMood returns number for bad perfId');

// ---------------------------------------------------------------------------
// SUITE: getReactionCounts
// ---------------------------------------------------------------------------
suite('getReactionCounts');

var sCounts = freshState();
var countP = makePerformer();
var countPR = PS.startPerformance(sCounts, countP, 'main_stage', 'music', 'Count Test');
var countPerfId = countPR.performance.id;
var countAud = makeAudience();
PS.joinAudience(sCounts, countPerfId, countAud);

PS.sendReaction(sCounts, countPerfId, countAud, 'cheer');
PS.sendReaction(sCounts, countPerfId, countAud, 'cheer');
PS.sendReaction(sCounts, countPerfId, countAud, 'applaud');

var counts = PS.getReactionCounts(sCounts, countPerfId);
assertEqual(counts.cheer, 2, 'cheer count = 2');
assertEqual(counts.applaud, 1, 'applaud count = 1');
assertEqual(counts.encore, 0, 'encore count = 0');

// All reaction types present in counts
PS.REACTION_TYPES.forEach(function(rt) {
  assert(typeof counts[rt] === 'number', rt + ' present in counts');
});

// ---------------------------------------------------------------------------
// SUITE: Spark Tipping — tipPerformer
// ---------------------------------------------------------------------------
suite('Spark Tipping — tipPerformer');

var sTip = freshState();
var tipP = makePerformer();
var tipPR = PS.startPerformance(sTip, tipP, 'main_stage', 'music', 'Tip Test');
var tipPerfId = tipPR.performance.id;
var tipAud = makeAudience();
PS.joinAudience(sTip, tipPerfId, tipAud);

// Valid tip
var tip1 = PS.tipPerformer(sTip, tipPerfId, tipAud, 10);
assert(tip1.success, 'tipPerformer succeeds');
assertEqual(tip1.amount, 10, 'tip amount is 10');
assertEqual(PS.findPerformance(sTip, tipPerfId).totalTips, 10, 'totalTips updated');

// Check tip ledger
assertEqual(PS.getTipsByPlayer(sTip, tipPerfId, tipAud), 10, 'tipsByPlayer = 10');

// Not in audience
var nonAudTip = PS.tipPerformer(sTip, tipPerfId, makeAudience(), 5);
assert(!nonAudTip.success, 'tipPerformer fails if not in audience');

// Self-tip
var selfTip = PS.tipPerformer(sTip, tipPerfId, tipP, 5);
assert(!selfTip.success, 'performer cannot tip themselves');

// Below minimum
var belowMin = PS.tipPerformer(sTip, tipPerfId, tipAud, 0);
assert(!belowMin.success, 'tipPerformer fails with amount below TIP_MIN');

// Above maximum
var aboveMax = PS.tipPerformer(sTip, tipPerfId, tipAud, 51);
assert(!aboveMax.success, 'tipPerformer fails with amount above TIP_MAX');

// Cap per performance
var capAud = makeAudience();
PS.joinAudience(sTip, tipPerfId, capAud);
PS.tipPerformer(sTip, tipPerfId, capAud, 50); // 50
PS.tipPerformer(sTip, tipPerfId, capAud, 50); // 100 — at cap
var overCap = PS.tipPerformer(sTip, tipPerfId, capAud, 1);
assert(!overCap.success, 'tip cap per performance enforced');

// Floors non-integer amounts
var fracAud = makeAudience();
PS.joinAudience(sTip, tipPerfId, fracAud);
var fracTip = PS.tipPerformer(sTip, tipPerfId, fracAud, 5.9);
assert(fracTip.success, 'fractional tip accepted');
assertEqual(fracTip.amount, 5, 'fractional tip floored to 5');

// Non-existent performance
var badTip = PS.tipPerformer(sTip, 'perf_9999', tipAud, 5);
assert(!badTip.success, 'tipPerformer fails for non-existent performance');

// Inactive performance
var donePR = PS.startPerformance(sTip, makePerformer(), 'amphitheater', 'music', 'Done');
var doneAud = makeAudience();
PS.joinAudience(sTip, donePR.performance.id, doneAud);
PS.endPerformance(sTip, donePR.performance.id, donePR.performance.performerId);
var tipDone = PS.tipPerformer(sTip, donePR.performance.id, doneAud, 5);
assert(!tipDone.success, 'tipPerformer fails for completed performance');

// ---------------------------------------------------------------------------
// SUITE: Performance Rating — ratePerformance
// ---------------------------------------------------------------------------
suite('ratePerformance');

var sRate = freshState();
var rateP = makePerformer();
var ratePR = PS.startPerformance(sRate, rateP, 'main_stage', 'music', 'Rate Test');
var ratePerfId = ratePR.performance.id;
var rateAud1 = makeAudience(), rateAud2 = makeAudience();
PS.joinAudience(sRate, ratePerfId, rateAud1);
PS.joinAudience(sRate, ratePerfId, rateAud2);

// Valid rating
var r1 = PS.ratePerformance(sRate, ratePerfId, rateAud1, 5);
assert(r1.success, 'ratePerformance succeeds with 5 stars');

var r2 = PS.ratePerformance(sRate, ratePerfId, rateAud2, 3);
assert(r2.success, 'ratePerformance succeeds with 3 stars');

// Rating stored
assertEqual(sRate.ratings[ratePerfId][rateAud1], 5, 'rating stored for aud1');
assertEqual(sRate.ratings[ratePerfId][rateAud2], 3, 'rating stored for aud2');

// Average rating
var avg = PS.getPerformanceRating(sRate, ratePerfId);
assertApprox(avg, 4.0, 0.001, 'average rating = 4.0');

// Duplicate rating
var dup = PS.ratePerformance(sRate, ratePerfId, rateAud1, 1);
assert(!dup.success, 'duplicate rating fails');

// Out-of-range ratings
var inv_r1 = PS.ratePerformance(sRate, ratePerfId, makeAudience(), 0);
assert(!inv_r1.success, 'rating 0 fails');

var inv_r2 = PS.ratePerformance(sRate, ratePerfId, makeAudience(), 6);
assert(!inv_r2.success, 'rating 6 fails');

// Non-integer rating
var inv_r3 = PS.ratePerformance(sRate, ratePerfId, makeAudience(), 2.5);
assert(!inv_r3.success, 'non-integer rating fails');

// Not in audience
var notAudRating = PS.ratePerformance(sRate, ratePerfId, makeAudience(), 3);
assert(!notAudRating.success, 'non-audience member cannot rate');

// Cannot rate cancelled performance
var sRateCancel = freshState();
var cancelRP = makePerformer();
var cancelRPR = PS.startPerformance(sRateCancel, cancelRP, 'main_stage', 'music', 'Cancel Rate');
var cancelRAud = makeAudience();
PS.joinAudience(sRateCancel, cancelRPR.performance.id, cancelRAud);
PS.cancelPerformance(sRateCancel, cancelRPR.performance.id, cancelRP);
var rateCancel = PS.ratePerformance(sRateCancel, cancelRPR.performance.id, cancelRAud, 5);
assert(!rateCancel.success, 'cannot rate cancelled performance');

// Rate after performance ends (audience record check)
var sRatePost = freshState();
var ratePostP = makePerformer();
var ratePostPR = PS.startPerformance(sRatePost, ratePostP, 'main_stage', 'music', 'Post Rate');
var ratePostAud = makeAudience();
PS.joinAudience(sRatePost, ratePostPR.performance.id, ratePostAud);
PS.endPerformance(sRatePost, ratePostPR.performance.id, ratePostP);
// After end the player has joined record
var ratePost = PS.ratePerformance(sRatePost, ratePostPR.performance.id, ratePostAud, 4);
assert(ratePost.success, 'rating after performance ended succeeds if was in audience');

// getPerformanceRating = 0 for no ratings
var sRate0 = freshState();
var rate0P = makePerformer();
var rate0PR = PS.startPerformance(sRate0, rate0P, 'main_stage', 'music', 'No Rating');
assertEqual(PS.getPerformanceRating(sRate0, rate0PR.performance.id), 0, 'getPerformanceRating = 0 with no ratings');

// Non-existent performance
assertEqual(PS.getPerformanceRating(sRate0, 'bad'), 0, 'getPerformanceRating = 0 for bad id');

// ---------------------------------------------------------------------------
// SUITE: Encore Mechanic — requestEncore
// ---------------------------------------------------------------------------
suite('Encore Mechanic');

var sEnc = freshState();
var encP = makePerformer();
var encPR = PS.startPerformance(sEnc, encP, 'main_stage', 'music', 'Encore Test');
var encPerfId = encPR.performance.id;

// Add 10 audience members
var encAuds = [];
for (var ei = 0; ei < 10; ei++) {
  var ea = makeAudience();
  encAuds.push(ea);
  PS.joinAudience(sEnc, encPerfId, ea);
}

// 6 out of 10 request encore = 60% < threshold (70%)
for (var encI = 0; encI < 6; encI++) {
  var encReq = PS.requestEncore(sEnc, encPerfId, encAuds[encI]);
  assert(encReq.success, 'encore request ' + encI + ' succeeds');
  assertEqual(encReq.encoreTriggered, false, 'encore not triggered at ' + encI + '/10');
}

// 7th request (70%) triggers encore
var encTrigger = PS.requestEncore(sEnc, encPerfId, encAuds[6]);
assert(encTrigger.success, '7th encore request succeeds');
assert(encTrigger.encoreTriggered, 'encore triggered at 70%');
assertEqual(PS.findPerformance(sEnc, encPerfId).status, 'encore', 'performance in encore status');
assert(PS.findPerformance(sEnc, encPerfId).encorePlayed, 'encorePlayed = true');

// voteRatio
assert(encTrigger.voteRatio >= 0.7, 'voteRatio >= 0.70');

// Cannot request twice from same player
var dupEnc = PS.requestEncore(sEnc, encPerfId, encAuds[0]);
assert(!dupEnc.success, 'duplicate encore request fails');

// Not in audience
var notAudEnc = PS.requestEncore(sEnc, encPerfId, makeAudience());
assert(!notAudEnc.success, 'non-audience member cannot request encore');

// After encore triggered, further requests fail (encorePlayed = true)
var afterEnc = PS.requestEncore(sEnc, encPerfId, encAuds[7]);
assert(!afterEnc.success, 'encore request fails after encore already played');

// endEncore
var endEncR = PS.endEncore(sEnc, encPerfId, encP);
assert(endEncR.success, 'endEncore succeeds');
assertEqual(PS.findPerformance(sEnc, encPerfId).status, 'active', 'status returns to active after endEncore');

// endEncore wrong performer
var encWrongP = PS.endEncore(sEnc, encPerfId, makePerformer());
assert(!encWrongP.success, 'endEncore fails for wrong performer');

// Encore non-existent performance
var badEncore = PS.requestEncore(sEnc, 'perf_9999', encAuds[0]);
assert(!badEncore.success, 'requestEncore fails for non-existent performance');

// getEncoreVoteRatio
var encRatio = PS.getEncoreVoteRatio(sEnc, encPerfId);
assert(typeof encRatio === 'number', 'getEncoreVoteRatio returns number');
assert(encRatio >= 0 && encRatio <= 1, 'encoreVoteRatio in [0,1]');

// Encore Spark bonus in summary
var sEncBonus = freshState();
var encBonusP = makePerformer();
var encBonusPR = PS.startPerformance(sEncBonus, encBonusP, 'main_stage', 'music', 'Bonus Encore');
var encBonusPerfId = encBonusPR.performance.id;
// Manually trigger encore
PS.findPerformance(sEncBonus, encBonusPerfId).encorePlayed = true;
PS.findPerformance(sEncBonus, encBonusPerfId).status = 'encore';
// Add audience to get Spark
for (var abi = 0; abi < 5; abi++) {
  var abAud = makeAudience();
  PS.joinAudience(sEncBonus, encBonusPerfId, abAud);
  PS.ratePerformance(sEncBonus, encBonusPerfId, abAud, 4);
}
var encBonusEnd = PS.endPerformance(sEncBonus, encBonusPerfId, encBonusP);
assert(encBonusEnd.summary.encorePlayed, 'encore reflected in summary');
assert(encBonusEnd.summary.sparkEarned > 0, 'spark earned includes encore bonus');

// ---------------------------------------------------------------------------
// SUITE: Set List — advanceSetList
// ---------------------------------------------------------------------------
suite('Set List Progress');

var sAdv = freshState();
var advP = makePerformer();
var advSL = PS.createSetList(sAdv, advP, 'Full Album', 'music');
PS.addSetItem(sAdv, advSL.setList.id, 'Track 1', '', 200);
PS.addSetItem(sAdv, advSL.setList.id, 'Track 2', '', 220);
PS.addSetItem(sAdv, advSL.setList.id, 'Track 3', '', 180);
var advPR = PS.startPerformance(sAdv, advP, 'main_stage', 'music', 'Album Show', advSL.setList.id);
var advPerfId = advPR.performance.id;

// getCurrentSetItem — first item
var firstItem = PS.getCurrentSetItem(sAdv, advPerfId);
assert(firstItem !== null, 'getCurrentSetItem returns first item');
assertEqual(firstItem.title, 'Track 1', 'first item is Track 1');

// Advance
var adv1 = PS.advanceSetList(sAdv, advPerfId, advP);
assert(adv1.success, 'advanceSetList succeeds');
assertEqual(adv1.finished, false, 'not finished after first advance');
assertEqual(adv1.currentItem.title, 'Track 2', 'current item is Track 2');

var adv2 = PS.advanceSetList(sAdv, advPerfId, advP);
assert(adv2.success, 'second advance succeeds');
assertEqual(adv2.currentItem.title, 'Track 3', 'current item is Track 3');

// Finished
var adv3 = PS.advanceSetList(sAdv, advPerfId, advP);
assert(adv3.success, 'final advance succeeds');
assert(adv3.finished, 'finished = true at end of set');

// Wrong performer
var advWrong = PS.advanceSetList(sAdv, advPerfId, makePerformer());
assert(!advWrong.success, 'advanceSetList fails for wrong performer');

// No set list
var noSLState = freshState();
var noSLP = makePerformer();
var noSLPR = PS.startPerformance(noSLState, noSLP, 'main_stage', 'music', 'No SetList');
var advNoSL = PS.advanceSetList(noSLState, noSLPR.performance.id, noSLP);
assert(!advNoSL.success, 'advanceSetList fails with no set list');

// getCurrentSetItem with no set list
assertEqual(PS.getCurrentSetItem(noSLState, noSLPR.performance.id), null, 'getCurrentSetItem = null with no set list');

// Non-existent performance
var advBad = PS.advanceSetList(sAdv, 'perf_9999', advP);
assert(!advBad.success, 'advanceSetList fails for non-existent performance');

// ---------------------------------------------------------------------------
// SUITE: Queries — getActivePerformances
// ---------------------------------------------------------------------------
suite('Queries — getActivePerformances');

var sGAP = freshState();
var gap1 = PS.startPerformance(sGAP, makePerformer(), 'main_stage', 'music', 'Show 1');
var gap2 = PS.startPerformance(sGAP, makePerformer(), 'amphitheater', 'dance', 'Show 2');

var active = PS.getActivePerformances(sGAP);
assertEqual(active.length, 2, 'getActivePerformances returns 2 active');

// End one
PS.endPerformance(sGAP, gap1.performance.id, gap1.performance.performerId);
var activeAfter = PS.getActivePerformances(sGAP);
assertEqual(activeAfter.length, 1, 'getActivePerformances returns 1 after end');

// Encore counted as active
PS.findPerformance(sGAP, gap2.performance.id).status = 'encore';
var activeWithEncore = PS.getActivePerformances(sGAP);
assertEqual(activeWithEncore.length, 1, 'encore performance counted as active');

// ---------------------------------------------------------------------------
// SUITE: Queries — getPerformerHistory
// ---------------------------------------------------------------------------
suite('Queries — getPerformerHistory');

var sGPH = freshState();
var gphP = makePerformer();

// No history
assertEqual(PS.getPerformerHistory(sGPH, gphP).length, 0, 'empty history for new performer');

// Run two performances
var gph1 = PS.startPerformance(sGPH, gphP, 'main_stage', 'music', 'Show 1');
PS.endPerformance(sGPH, gph1.performance.id, gphP);

var gph2 = PS.startPerformance(sGPH, gphP, 'amphitheater', 'music', 'Show 2');
PS.endPerformance(sGPH, gph2.performance.id, gphP);

var history = PS.getPerformerHistory(sGPH, gphP);
assertEqual(history.length, 2, 'history has 2 entries');
assert(history[0].perfId === gph1.performance.id, 'history[0] is first show');
assert(history[1].perfId === gph2.performance.id, 'history[1] is second show');

// History is a copy (mutation doesn't affect state)
history.push({ fake: true });
assertEqual(PS.getPerformerHistory(sGPH, gphP).length, 2, 'history is a safe copy');

// ---------------------------------------------------------------------------
// SUITE: Queries — getTopPerformances
// ---------------------------------------------------------------------------
suite('Queries — getTopPerformances');

var sGTP = freshState();

// Setup 3 performances with different ratings
function setupRatedPerf(state, rating) {
  var p = makePerformer();
  var pr = PS.startPerformance(state, p, 'main_stage', 'music', 'Rated Show');
  var a = makeAudience();
  PS.joinAudience(state, pr.performance.id, a);
  PS.ratePerformance(state, pr.performance.id, a, rating);
  PS.endPerformance(state, pr.performance.id, p);
  return pr.performance;
}

var top1 = setupRatedPerf(sGTP, 5);
var top3 = setupRatedPerf(sGTP, 3);
// Need a new performer for each (can't reuse stage)
var sGTP2 = freshState();
var top2 = setupRatedPerf(sGTP2, 4);

// Top performances from sGTP (has 2)
var tops = PS.getTopPerformances(sGTP, 10);
assert(tops.length >= 1, 'getTopPerformances returns results');
// Sorted by rating
for (var ti = 1; ti < tops.length; ti++) {
  var prevRating = tops[ti-1].ratingSum / tops[ti-1].ratingCount;
  var currRating = tops[ti].ratingSum / tops[ti].ratingCount;
  assert(prevRating >= currRating, 'top performances sorted by rating desc');
}

// Default limit 10
var topsDef = PS.getTopPerformances(sGTP);
assert(Array.isArray(topsDef), 'getTopPerformances returns array');

// Excludes performances with no ratings
var noRatingPerf = PS.startPerformance(sGTP, makePerformer(), 'amphitheater', 'dance', 'Unrated');
PS.endPerformance(sGTP, noRatingPerf.performance.id, noRatingPerf.performance.performerId);
var topsFiltered = PS.getTopPerformances(sGTP, 10);
assert(!topsFiltered.some(function(t) { return t.ratingCount === 0; }), 'unrated performances excluded');

// ---------------------------------------------------------------------------
// SUITE: Queries — getPerformerLeaderboard
// ---------------------------------------------------------------------------
suite('Queries — getPerformerLeaderboard');

var sGPL = freshState();
var gplP1 = makePerformer(), gplP2 = makePerformer();

// Give p1 a high rating
var gpl1 = PS.startPerformance(sGPL, gplP1, 'main_stage', 'music', 'High Rated');
var gplA1 = makeAudience();
PS.joinAudience(sGPL, gpl1.performance.id, gplA1);
PS.ratePerformance(sGPL, gpl1.performance.id, gplA1, 5);
PS.endPerformance(sGPL, gpl1.performance.id, gplP1);

// Give p2 a low rating
var gpl2 = PS.startPerformance(sGPL, gplP2, 'amphitheater', 'music', 'Low Rated');
var gplA2 = makeAudience();
PS.joinAudience(sGPL, gpl2.performance.id, gplA2);
PS.ratePerformance(sGPL, gpl2.performance.id, gplA2, 2);
PS.endPerformance(sGPL, gpl2.performance.id, gplP2);

var leaderboard = PS.getPerformerLeaderboard(sGPL, 10);
assert(Array.isArray(leaderboard), 'getPerformerLeaderboard returns array');
assert(leaderboard.length >= 2, 'leaderboard has entries');

// Should be sorted by avgRating
if (leaderboard.length >= 2) {
  assert(leaderboard[0].avgRating >= leaderboard[1].avgRating, 'leaderboard sorted by avgRating');
}

// Entry has required fields
var entry = leaderboard[0];
assert(typeof entry.performerId === 'string', 'leaderboard entry has performerId');
assert(typeof entry.avgRating === 'number', 'leaderboard entry has avgRating');
assert(typeof entry.totalShows === 'number', 'leaderboard entry has totalShows');
assert(typeof entry.totalTips === 'number', 'leaderboard entry has totalTips');
assert(typeof entry.encoresEarned === 'number', 'leaderboard entry has encoresEarned');

// Limit works
var topOne = PS.getPerformerLeaderboard(sGPL, 1);
assertEqual(topOne.length, 1, 'leaderboard limit = 1 respected');

// ---------------------------------------------------------------------------
// SUITE: Queries — getPerformancesByType
// ---------------------------------------------------------------------------
suite('Queries — getPerformancesByType');

var sGPBT = freshState();
var gbtp1 = makePerformer(), gbtp2 = makePerformer(), gbtp3 = makePerformer();
PS.startPerformance(sGPBT, gbtp1, 'main_stage', 'music', 'Music 1');
PS.startPerformance(sGPBT, gbtp2, 'gallery_stage', 'art', 'Art 1');
PS.startPerformance(sGPBT, gbtp3, 'amphitheater', 'dance', 'Dance 1');

var musicPerfs = PS.getPerformancesByType(sGPBT, 'music');
assertEqual(musicPerfs.length, 1, 'getPerformancesByType returns 1 music');
assert(musicPerfs[0].perfType === 'music', 'music performance type correct');

var artPerfs = PS.getPerformancesByType(sGPBT, 'art');
assertEqual(artPerfs.length, 1, 'getPerformancesByType returns 1 art');

var storyPerfs = PS.getPerformancesByType(sGPBT, 'story');
assertEqual(storyPerfs.length, 0, 'getPerformancesByType returns 0 story (none added)');

// ---------------------------------------------------------------------------
// SUITE: Queries — getPerformancesByStage
// ---------------------------------------------------------------------------
suite('Queries — getPerformancesByStage');

var sGPBS = freshState();
var gbsp1 = makePerformer(), gbsp2 = makePerformer();
PS.startPerformance(sGPBS, gbsp1, 'main_stage', 'music', 'Main Show');
PS.startPerformance(sGPBS, gbsp2, 'amphitheater', 'dance', 'Amphitheater Show');

var mainShows = PS.getPerformancesByStage(sGPBS, 'main_stage');
assertEqual(mainShows.length, 1, 'getPerformancesByStage returns 1 for main_stage');
assertEqual(mainShows[0].stageId, 'main_stage', 'correct stageId in result');

var amphiShows = PS.getPerformancesByStage(sGPBS, 'amphitheater');
assertEqual(amphiShows.length, 1, 'getPerformancesByStage returns 1 for amphitheater');

var galleryShows = PS.getPerformancesByStage(sGPBS, 'gallery_stage');
assertEqual(galleryShows.length, 0, 'getPerformancesByStage returns 0 for unused stage');

// ---------------------------------------------------------------------------
// SUITE: computePerformanceScore
// ---------------------------------------------------------------------------
suite('computePerformanceScore');

var sScore = freshState();
var scoreP = makePerformer();
var scorePR = PS.startPerformance(sScore, scoreP, 'main_stage', 'music', 'Score Test');
var scorePerfId = scorePR.performance.id;

// Empty performance: neutral crowd mood, no rating, no audience
var emptyScore = PS.computePerformanceScore(sScore, scorePerfId);
assert(typeof emptyScore === 'number', 'computePerformanceScore returns number');
assert(emptyScore >= 0 && emptyScore <= 100, 'score in [0, 100]');

// Add audience
var scoreAud1 = makeAudience(), scoreAud2 = makeAudience();
PS.joinAudience(sScore, scorePerfId, scoreAud1);
PS.joinAudience(sScore, scorePerfId, scoreAud2);

// High crowd mood + high rating = high score
PS.sendReaction(sScore, scorePerfId, scoreAud1, 'cheer');
PS.sendReaction(sScore, scorePerfId, scoreAud2, 'encore');
PS.ratePerformance(sScore, scorePerfId, scoreAud1, 5);

var highScore = PS.computePerformanceScore(sScore, scorePerfId);
assert(highScore > emptyScore, 'score increases with positive reactions and ratings');

// Non-existent performance
assertEqual(PS.computePerformanceScore(sScore, 'bad'), 0, 'computePerformanceScore = 0 for bad perfId');

// ---------------------------------------------------------------------------
// SUITE: Deterministic PRNG — mulberry32
// ---------------------------------------------------------------------------
suite('mulberry32 PRNG');

var prng1 = PS.mulberry32(42);
var prng2 = PS.mulberry32(42);

// Deterministic
var v1a = prng1();
var v1b = prng2();
assertEqual(v1a, v1b, 'mulberry32 same seed produces same first value');

var v2a = prng1();
var v2b = prng2();
assertEqual(v2a, v2b, 'mulberry32 same seed produces same second value');

// Values in [0, 1)
var prng3 = PS.mulberry32(12345);
for (var ri2 = 0; ri2 < 20; ri2++) {
  var rv = prng3();
  assert(rv >= 0 && rv < 1, 'mulberry32 value in [0,1) at step ' + ri2);
}

// Different seeds produce different results
var prng4 = PS.mulberry32(1);
var prng5 = PS.mulberry32(2);
var diff = false;
for (var di = 0; di < 5; di++) {
  if (prng4() !== prng5()) { diff = true; break; }
}
assert(diff, 'different seeds produce different values');

// ---------------------------------------------------------------------------
// SUITE: generateNpcReaction
// ---------------------------------------------------------------------------
suite('generateNpcReaction');

var npcRx = PS.generateNpcReaction('perf_1', 'npc_a', 100);
assert(PS.REACTION_TYPES.indexOf(npcRx) !== -1, 'generateNpcReaction returns valid reaction type');

// Deterministic
var npcRx2 = PS.generateNpcReaction('perf_1', 'npc_a', 100);
assertEqual(npcRx, npcRx2, 'generateNpcReaction is deterministic');

// Different npc gets different or same (just must be valid)
var npcRx3 = PS.generateNpcReaction('perf_1', 'npc_b', 100);
assert(PS.REACTION_TYPES.indexOf(npcRx3) !== -1, 'generateNpcReaction for npc_b returns valid type');

// Works without seed
var npcRxNoSeed = PS.generateNpcReaction('perf_1', 'npc_c');
assert(PS.REACTION_TYPES.indexOf(npcRxNoSeed) !== -1, 'generateNpcReaction works without seed');

// ---------------------------------------------------------------------------
// SUITE: generateNpcRating
// ---------------------------------------------------------------------------
suite('generateNpcRating');

var npcRating1 = PS.generateNpcRating('perf_1', 'npc_a', 0.8, 999);
assert(typeof npcRating1 === 'number', 'generateNpcRating returns number');
assert(npcRating1 >= 1 && npcRating1 <= 5, 'npcRating in [1,5]');
assert(Number.isInteger(npcRating1), 'npcRating is integer');

// Deterministic
var npcRating2 = PS.generateNpcRating('perf_1', 'npc_a', 0.8, 999);
assertEqual(npcRating1, npcRating2, 'generateNpcRating is deterministic');

// High crowd mood = higher ratings on average (test with many seeds)
var highMoodTotal = 0, lowMoodTotal = 0;
for (var npcI = 0; npcI < 50; npcI++) {
  highMoodTotal += PS.generateNpcRating('perf_x', 'npc_' + npcI, 1.0, npcI * 13);
  lowMoodTotal  += PS.generateNpcRating('perf_x', 'npc_' + npcI, 0.0, npcI * 13);
}
assert(highMoodTotal >= lowMoodTotal, 'high crowd mood leads to higher average NPC ratings');

// ---------------------------------------------------------------------------
// SUITE: findSlot helper
// ---------------------------------------------------------------------------
suite('findSlot helper');

var sFindSlot = freshState();
var fsP = makePerformer();
var fsSlot = PS.bookSlot(sFindSlot, fsP, 'main_stage', 'music', Date.now() + 3600000, 3600, 'Findable');
var foundSlot = PS.findSlot(sFindSlot, fsSlot.slot.id);
assert(foundSlot !== null, 'findSlot returns slot by id');
assertEqual(foundSlot.id, fsSlot.slot.id, 'found slot has correct id');

// Not found
var notFound = PS.findSlot(sFindSlot, 'slot_99999');
assertEqual(notFound, null, 'findSlot returns null for unknown id');

// ---------------------------------------------------------------------------
// SUITE: findPerformance helper
// ---------------------------------------------------------------------------
suite('findPerformance helper');

var sFindP = freshState();
var fpPerf = PS.startPerformance(sFindP, makePerformer(), 'main_stage', 'music', 'Findable');
var found = PS.findPerformance(sFindP, fpPerf.performance.id);
assert(found !== null, 'findPerformance returns performance by id');
assertEqual(found.id, fpPerf.performance.id, 'found performance has correct id');

var notFoundP = PS.findPerformance(sFindP, 'perf_99999');
assertEqual(notFoundP, null, 'findPerformance returns null for unknown id');

// ---------------------------------------------------------------------------
// SUITE: Edge Cases
// ---------------------------------------------------------------------------
suite('Edge Cases');

// bookSlot: null performer
var nullSlot = PS.bookSlot(freshState(), null, 'main_stage', 'music', Date.now() + 3600000, 3600, 'T');
assert(!nullSlot.success, 'bookSlot fails with null performerId');

// startPerformance: null performer
var nullStart = PS.startPerformance(freshState(), null, 'main_stage', 'music', 'T');
assert(!nullStart.success, 'startPerformance fails with null performerId');

// joinAudience: null playerId
var sEdge = freshState();
var edgeP = makePerformer();
var edgePR = PS.startPerformance(sEdge, edgeP, 'main_stage', 'music', 'Edge');
// No crash on null player (should fail gracefully)
var nullJoin = PS.joinAudience(sEdge, edgePR.performance.id, null);
assert(typeof nullJoin.success === 'boolean', 'joinAudience handles null playerId gracefully');

// tipPerformer: non-finite amount
var sEdgeTip = freshState();
var edgeTipP = makePerformer();
var edgeTipPR = PS.startPerformance(sEdgeTip, edgeTipP, 'main_stage', 'music', 'Edge Tip');
var edgeTipAud = makeAudience();
PS.joinAudience(sEdgeTip, edgeTipPR.performance.id, edgeTipAud);
var nanTip = PS.tipPerformer(sEdgeTip, edgeTipPR.performance.id, edgeTipAud, NaN);
assert(!nanTip.success, 'tipPerformer fails with NaN amount');

var infTip = PS.tipPerformer(sEdgeTip, edgeTipPR.performance.id, edgeTipAud, Infinity);
assert(!infTip.success, 'tipPerformer fails with Infinity amount');

// ratePerformance: non-integer
var sEdgeRate = freshState();
var edgeRateP = makePerformer();
var edgeRatePR = PS.startPerformance(sEdgeRate, edgeRateP, 'main_stage', 'music', 'Edge Rate');
var edgeRateAud = makeAudience();
PS.joinAudience(sEdgeRate, edgeRatePR.performance.id, edgeRateAud);
var floatRate = PS.ratePerformance(sEdgeRate, edgeRatePR.performance.id, edgeRateAud, 3.7);
assert(!floatRate.success, 'ratePerformance fails with float rating');

// bookSlot: whitespace title trimmed to empty
var sEdgeSlot = freshState();
var wsSlot = PS.bookSlot(sEdgeSlot, makePerformer(), 'main_stage', 'music', Date.now() + 3600000, 3600, '   ');
assert(!wsSlot.success, 'bookSlot fails with whitespace-only title');

// startPerformance: whitespace title trimmed to empty
var wsStart = PS.startPerformance(sEdgeSlot, makePerformer(), 'main_stage', 'music', '   ');
assert(!wsStart.success, 'startPerformance fails with whitespace-only title');

// Title trimming
var trimSlot = PS.bookSlot(sEdgeSlot, makePerformer(), 'main_stage', 'music', Date.now() + 5000000, 3600, '  Trimmed  ');
assert(trimSlot.success, 'bookSlot accepts title with surrounding spaces');
assertEqual(trimSlot.slot.title, 'Trimmed', 'slot title is trimmed');

// createSetList: whitespace title
var wsSetList = PS.createSetList(sEdgeSlot, makePerformer(), '   ', 'music');
assert(!wsSetList.success, 'createSetList fails with whitespace title');

// getAudienceCount for non-existent performance
assertEqual(PS.getAudienceCount(freshState(), 'perf_99999'), 0, 'getAudienceCount = 0 for bad id');

// getCrowdMood for non-existent performance
assert(typeof PS.getCrowdMood(freshState(), 'perf_99999') === 'number', 'getCrowdMood handles bad perfId');

// getEncoreVoteRatio for empty audience
var sEdgeEnc = freshState();
var edgeEncP = makePerformer();
var edgeEncPR = PS.startPerformance(sEdgeEnc, edgeEncP, 'main_stage', 'music', 'Empty Encore');
assertEqual(PS.getEncoreVoteRatio(sEdgeEnc, edgeEncPR.performance.id), 0, 'encoreVoteRatio = 0 with no audience');

// Profile reputation updated after rated shows
var sProfileRep = freshState();
var repP = makePerformer();
var repPR = PS.startPerformance(sProfileRep, repP, 'main_stage', 'music', 'Rep Show');
var repAud = makeAudience();
PS.joinAudience(sProfileRep, repPR.performance.id, repAud);
PS.ratePerformance(sProfileRep, repPR.performance.id, repAud, 4);
PS.endPerformance(sProfileRep, repPR.performance.id, repP);
var repProfile = PS.getPerformerProfile(sProfileRep, repP);
assertEqual(repProfile.reputation, 4, 'performer reputation updated to 4 after show');

// Cancel slot when active fails
var sCancelActive = freshState();
var caP = makePerformer();
var caSlot = PS.bookSlot(sCancelActive, caP, 'main_stage', 'music', Date.now() + 5000000, 3600, 'Active Show');
// Manually set to active
caSlot.slot.status = 'active';
var caCancelActive = PS.cancelSlot(sCancelActive, caSlot.slot.id, caP);
assert(!caCancelActive.success, 'cannot cancel active slot');

// endEncore for performance that is not in encore
var sEndEnc2 = freshState();
var endEncP2 = makePerformer();
var endEncPR2 = PS.startPerformance(sEndEnc2, endEncP2, 'main_stage', 'music', 'No Encore');
var endEncR2 = PS.endEncore(sEndEnc2, endEncPR2.performance.id, endEncP2);
assert(!endEncR2.success, 'endEncore fails if not in encore phase');

// ---------------------------------------------------------------------------
// SUITE: Integration — Full Performance Flow
// ---------------------------------------------------------------------------
suite('Integration — Full Performance Flow');

var sInt = freshState();
var intPerformer = makePerformer();

// 1. Performer creates a set list
var intSL = PS.createSetList(sInt, intPerformer, 'Greatest Hits', 'music');
PS.addSetItem(sInt, intSL.setList.id, 'Opening Anthem', 'The big opener', 300);
PS.addSetItem(sInt, intSL.setList.id, 'Ballad', 'A touching ballad', 240);
PS.addSetItem(sInt, intSL.setList.id, 'Dance Number', 'Get on your feet', 200);
assert(intSL.success, 'INT: set list created');
assertEqual(sInt.setLists[intSL.setList.id].items.length, 3, 'INT: 3 items in set list');
assertEqual(PS.getSetListDuration(sInt, intSL.setList.id), 740, 'INT: total duration 740s');

// 2. Book a slot
var intSlot = PS.bookSlot(sInt, intPerformer, 'main_stage', 'music', Date.now() + 3600000, 7200, 'Greatest Hits Tour', 'The big show');
assert(intSlot.success, 'INT: slot booked');

// 3. Start the performance
var intPerf = PS.startPerformance(sInt, intPerformer, 'main_stage', 'music', 'Greatest Hits Tour', intSL.setList.id, intSlot.slot.id);
assert(intPerf.success, 'INT: performance started');
var intPerfId = intPerf.performance.id;
assertEqual(intSlot.slot.status, 'active', 'INT: slot status = active after start');

// 4. Audience joins
var intAuds = [];
for (var iai = 0; iai < 8; iai++) {
  var intA = makeAudience();
  intAuds.push(intA);
  var joinR = PS.joinAudience(sInt, intPerfId, intA);
  assert(joinR.success, 'INT: audience member ' + iai + ' joined');
}
assertEqual(PS.getAudienceCount(sInt, intPerfId), 8, 'INT: 8 audience members');

// 5. Perform first set item, reactions
PS.sendReaction(sInt, intPerfId, intAuds[0], 'cheer');
PS.sendReaction(sInt, intPerfId, intAuds[1], 'applaud');
PS.sendReaction(sInt, intPerfId, intAuds[2], 'wow');

var intMood = PS.getCrowdMood(sInt, intPerfId);
assert(intMood > 0, 'INT: crowd mood > 0 with reactions');

// 6. Tips
PS.tipPerformer(sInt, intPerfId, intAuds[0], 20);
PS.tipPerformer(sInt, intPerfId, intAuds[1], 10);
assertEqual(PS.findPerformance(sInt, intPerfId).totalTips, 30, 'INT: total tips = 30');

// 7. Advance set list
var intAdv1 = PS.advanceSetList(sInt, intPerfId, intPerformer);
assertEqual(intAdv1.currentItem.title, 'Ballad', 'INT: advanced to Ballad');

var intAdv2 = PS.advanceSetList(sInt, intPerfId, intPerformer);
assertEqual(intAdv2.currentItem.title, 'Dance Number', 'INT: advanced to Dance Number');

// 8. Encore requests — 6 of 8 = 75% > 70%
for (var encJ = 0; encJ < 5; encJ++) {
  PS.requestEncore(sInt, intPerfId, intAuds[encJ]);
}
var encTrig = PS.requestEncore(sInt, intPerfId, intAuds[5]);
assert(encTrig.encoreTriggered, 'INT: encore triggered at 6/8 = 75%');
assertEqual(PS.findPerformance(sInt, intPerfId).status, 'encore', 'INT: performance in encore');

// 9. Ratings from audience
var rateCount = 0;
for (var rj = 0; rj < 8; rj++) {
  var rr = PS.ratePerformance(sInt, intPerfId, intAuds[rj], rj < 4 ? 5 : 4);
  if (rr.success) rateCount++;
}
assert(rateCount === 8, 'INT: all 8 audience members rated');

// 10. End performance
var intEnd = PS.endPerformance(sInt, intPerfId, intPerformer);
assert(intEnd.success, 'INT: performance ended');
assertEqual(intEnd.summary.audienceCount, 8, 'INT: summary shows 8 audience');
assert(intEnd.summary.avgRating > 4, 'INT: avg rating > 4');
assert(intEnd.summary.sparkEarned > 0, 'INT: spark earned > 0');
assert(intEnd.summary.encorePlayed, 'INT: encore reflected in summary');
assert(intEnd.summary.totalTips, 'INT: tips reflected in summary');
assertEqual(intEnd.summary.totalTips, 30, 'INT: tips = 30');

// 11. Verify performer profile
var intProfile = PS.getPerformerProfile(sInt, intPerformer);
assertEqual(intProfile.totalShows, 1, 'INT: profile shows 1 show');
assertEqual(intProfile.totalTipsReceived, 30, 'INT: profile shows 30 tips');
assertEqual(intProfile.encoresEarned, 1, 'INT: profile shows 1 encore');
assert(intProfile.reputation > 4, 'INT: performer reputation > 4');
assertEqual(intProfile.performanceHistory.length, 1, 'INT: history has 1 entry');

// 12. Slot marked completed
assertEqual(intSlot.slot.status, 'completed', 'INT: slot status = completed');

// 13. Appears in top performances
var intTops = PS.getTopPerformances(sInt, 5);
assert(intTops.length > 0, 'INT: appears in top performances');

// 14. Appears in leaderboard
var intBoard = PS.getPerformerLeaderboard(sInt, 5);
assertEqual(intBoard.length, 1, 'INT: 1 performer in leaderboard');
assertEqual(intBoard[0].performerId, intPerformer, 'INT: correct performer in leaderboard');

// ---------------------------------------------------------------------------
// Final Results
// ---------------------------------------------------------------------------
process.stdout.write('\n========================================\n');
process.stdout.write(passed + ' passed, ' + failed + ' failed\n');
process.stdout.write('========================================\n');

if (failMessages.length > 0) {
  process.stdout.write('\nFailed tests:\n');
  failMessages.forEach(function(m) {
    process.stdout.write('  - ' + m + '\n');
  });
}

if (failed > 0) process.exit(1);
