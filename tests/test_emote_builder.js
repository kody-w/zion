/**
 * tests/test_emote_builder.js
 * Comprehensive tests for the ZION Emote Builder module.
 * 200+ tests covering all exported functions, features, edge cases.
 *
 * Run with: node tests/test_emote_builder.js
 */

'use strict';

var EB = require('../src/js/emote_builder');

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

function assertDeep(a, b, msg) {
  assert(JSON.stringify(a) === JSON.stringify(b), msg);
}

// ============================================================================
// TEST HELPERS
// ============================================================================

var _playerSeq = 0;
function uid() { return 'player_' + (++_playerSeq); }

function freshLib() {
  return EB.createLibrary();
}

/** Build a minimal valid frame array */
function oneFrame(poseId, dur) {
  return [{ poseId: poseId || 'wave', duration: dur || 500 }];
}

function twoFrames() {
  return [
    { poseId: 'wave', duration: 500 },
    { poseId: 'bow',  duration: 600 }
  ];
}

/** Create an emote and assert success */
function makeEmote(lib, creator, name, category, frames) {
  creator  = creator  || uid();
  name     = name     || ('TestEmote_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6));
  category = category || 'greeting';
  frames   = frames   || oneFrame();
  return EB.createEmote(lib, creator, name, category, frames);
}

// ============================================================================
// SUITE 1: MODULE EXPORTS
// ============================================================================

suite('Module exports — shape', function() {

  assert(typeof EB === 'object', 'module exports an object');

  // Constants
  assert(typeof EB.ROYALTY_RATE === 'number',          'ROYALTY_RATE is a number');
  assert(typeof EB.MAX_FRAMES === 'number',             'MAX_FRAMES is a number');
  assert(typeof EB.MIN_FRAMES === 'number',             'MIN_FRAMES is a number');
  assert(typeof EB.MAX_NAME_LENGTH === 'number',        'MAX_NAME_LENGTH is a number');
  assert(typeof EB.MIN_NAME_LENGTH === 'number',        'MIN_NAME_LENGTH is a number');
  assert(typeof EB.MIN_FRAME_DURATION_MS === 'number',  'MIN_FRAME_DURATION_MS is a number');
  assert(typeof EB.MAX_FRAME_DURATION_MS === 'number',  'MAX_FRAME_DURATION_MS is a number');
  assert(typeof EB.DEFAULT_FRAME_DURATION === 'number', 'DEFAULT_FRAME_DURATION is a number');
  assert(typeof EB.FEATURED_COUNT === 'number',         'FEATURED_COUNT is a number');

  // Arrays
  assert(Array.isArray(EB.POSE_FRAMES),      'POSE_FRAMES is an array');
  assert(Array.isArray(EB.EMOTE_CATEGORIES), 'EMOTE_CATEGORIES is an array');
  assert(Array.isArray(EB.DEFAULT_EMOTES),   'DEFAULT_EMOTES is an array');

  // Functions
  assert(typeof EB.createLibrary      === 'function', 'createLibrary is a function');
  assert(typeof EB.createEmote        === 'function', 'createEmote is a function');
  assert(typeof EB.useEmote           === 'function', 'useEmote is a function');
  assert(typeof EB.rateEmote          === 'function', 'rateEmote is a function');
  assert(typeof EB.getEmote           === 'function', 'getEmote is a function');
  assert(typeof EB.deleteEmote        === 'function', 'deleteEmote is a function');
  assert(typeof EB.searchEmotes       === 'function', 'searchEmotes is a function');
  assert(typeof EB.getEmotesByCategory === 'function','getEmotesByCategory is a function');
  assert(typeof EB.getCreatorEmotes   === 'function', 'getCreatorEmotes is a function');
  assert(typeof EB.getCreatorRoyalties === 'function','getCreatorRoyalties is a function');
  assert(typeof EB.getCreatorProfile  === 'function', 'getCreatorProfile is a function');
  assert(typeof EB.refreshFeatured    === 'function', 'refreshFeatured is a function');
  assert(typeof EB.getFeatured        === 'function', 'getFeatured is a function');
  assert(typeof EB.getUsageCount      === 'function', 'getUsageCount is a function');
  assert(typeof EB.getAvgRating       === 'function', 'getAvgRating is a function');
  assert(typeof EB.getRatingCount     === 'function', 'getRatingCount is a function');
  assert(typeof EB.getUserRating      === 'function', 'getUserRating is a function');
  assert(typeof EB.validateFrames     === 'function', 'validateFrames is a function');
  assert(typeof EB.validateName       === 'function', 'validateName is a function');
  assert(typeof EB.getEmoteDuration   === 'function', 'getEmoteDuration is a function');
  assert(typeof EB.getDefaultEmotes   === 'function', 'getDefaultEmotes is a function');
  assert(typeof EB.getEmoteRoyalties  === 'function', 'getEmoteRoyalties is a function');
  assert(typeof EB.previewFrames      === 'function', 'previewFrames is a function');
  assert(typeof EB.getPoseFrames      === 'function', 'getPoseFrames is a function');
  assert(typeof EB.getPoseFrame       === 'function', 'getPoseFrame is a function');
  assert(typeof EB.getCategories      === 'function', 'getCategories is a function');
  assert(typeof EB.getTopByUsage      === 'function', 'getTopByUsage is a function');
  assert(typeof EB.getTopByRating     === 'function', 'getTopByRating is a function');
  assert(typeof EB.getNewest          === 'function', 'getNewest is a function');

});

// ============================================================================
// SUITE 2: CONSTANTS INTEGRITY
// ============================================================================

suite('Constants integrity', function() {

  assertEqual(EB.ROYALTY_RATE, 100, 'royalty rate is 100 uses per Spark');
  assert(EB.MAX_FRAMES >= 8,             'MAX_FRAMES allows at least 8 frames');
  assert(EB.MIN_FRAMES >= 1,             'MIN_FRAMES is at least 1');
  assert(EB.MIN_NAME_LENGTH >= 3,        'MIN_NAME_LENGTH at least 3');
  assert(EB.MAX_NAME_LENGTH <= 64,       'MAX_NAME_LENGTH reasonable cap');
  assert(EB.MIN_FRAME_DURATION_MS >= 50, 'MIN_FRAME_DURATION_MS at least 50ms');
  assert(EB.MAX_FRAME_DURATION_MS >= 1000, 'MAX_FRAME_DURATION_MS at least 1 second');
  assert(EB.DEFAULT_FRAME_DURATION >= EB.MIN_FRAME_DURATION_MS, 'default duration inside valid range');
  assert(EB.DEFAULT_FRAME_DURATION <= EB.MAX_FRAME_DURATION_MS, 'default duration inside valid range (upper)');
  assert(EB.FEATURED_COUNT >= 1,         'FEATURED_COUNT at least 1');
  assert(EB.EMOTE_CATEGORIES.length >= 4,'at least 4 emote categories');

});

// ============================================================================
// SUITE 3: POSE FRAMES DATABASE
// ============================================================================

suite('Pose frames database', function() {

  assert(EB.POSE_FRAMES.length >= 10, 'at least 10 pose frames defined (got ' + EB.POSE_FRAMES.length + ')');

  // Required fields
  var requiredFields = ['id', 'label', 'category', 'description'];
  var allHaveFields = true;
  for (var i = 0; i < EB.POSE_FRAMES.length; i++) {
    var pf = EB.POSE_FRAMES[i];
    for (var j = 0; j < requiredFields.length; j++) {
      if (!(requiredFields[j] in pf)) { allHaveFields = false; break; }
    }
    if (!allHaveFields) break;
  }
  assert(allHaveFields, 'all pose frames have required fields (id, label, category, description)');

  // Unique IDs
  var ids = {};
  var uniqueIds = true;
  for (var k = 0; k < EB.POSE_FRAMES.length; k++) {
    if (ids[EB.POSE_FRAMES[k].id]) { uniqueIds = false; break; }
    ids[EB.POSE_FRAMES[k].id] = true;
  }
  assert(uniqueIds, 'all pose frame IDs are unique');

  // Categories are valid
  var validCats = true;
  var catSet = {};
  for (var c = 0; c < EB.EMOTE_CATEGORIES.length; c++) catSet[EB.EMOTE_CATEGORIES[c]] = true;
  for (var p = 0; p < EB.POSE_FRAMES.length; p++) {
    if (!catSet[EB.POSE_FRAMES[p].category]) { validCats = false; break; }
  }
  assert(validCats, 'all pose frame categories are valid emote categories');

  // getPoseFrames returns copy
  var pf1 = EB.getPoseFrames();
  var pf2 = EB.getPoseFrames();
  assert(pf1 !== pf2, 'getPoseFrames returns new array each call');
  assertEqual(pf1.length, EB.POSE_FRAMES.length, 'getPoseFrames returns all frames');

  // getPoseFrame by ID
  assert(EB.getPoseFrame('wave') !== null, 'getPoseFrame returns wave frame');
  assert(EB.getPoseFrame('bow')  !== null, 'getPoseFrame returns bow frame');
  assert(EB.getPoseFrame('spin') !== null, 'getPoseFrame returns spin frame');
  assert(EB.getPoseFrame('nonexistent') === null, 'getPoseFrame returns null for unknown ID');

  // Wave frame properties
  var waveFrame = EB.getPoseFrame('wave');
  assertEqual(waveFrame.id, 'wave', 'wave frame has correct id');
  assert(typeof waveFrame.label === 'string', 'wave frame has label string');
  assert(typeof waveFrame.description === 'string', 'wave frame has description');

});

// ============================================================================
// SUITE 4: EMOTE CATEGORIES
// ============================================================================

suite('Emote categories', function() {

  var cats = EB.getCategories();
  assert(Array.isArray(cats), 'getCategories returns array');
  assert(cats.length >= 4,   'at least 4 categories returned');

  // Must include key categories
  assert(cats.indexOf('greeting')    !== -1, 'includes greeting category');
  assert(cats.indexOf('celebration') !== -1, 'includes celebration category');
  assert(cats.indexOf('dance')       !== -1, 'includes dance category');
  assert(cats.indexOf('expression')  !== -1, 'includes expression category');

  // Returns a copy
  var cats2 = EB.getCategories();
  assert(cats !== cats2, 'getCategories returns new array each time');

});

// ============================================================================
// SUITE 5: createLibrary
// ============================================================================

suite('createLibrary', function() {

  var lib = EB.createLibrary();
  assert(typeof lib === 'object', 'returns an object');
  assert(Array.isArray(lib.emotes), 'lib.emotes is an array');
  assert(typeof lib.ratings === 'object', 'lib.ratings is an object');
  assert(typeof lib.usageCounts === 'object', 'lib.usageCounts is an object');
  assert(typeof lib.royalties === 'object',   'lib.royalties is an object');
  assert(Array.isArray(lib.featured), 'lib.featured is an array');
  assertEqual(lib.emotes.length, 0, 'starts with zero custom emotes');
  assertEqual(lib.featured.length, 0, 'starts with empty featured list');

  // Two libraries are independent
  var lib2 = EB.createLibrary();
  assert(lib !== lib2, 'each call returns a distinct library');

});

// ============================================================================
// SUITE 6: DEFAULT EMOTES
// ============================================================================

suite('Default emotes', function() {

  var defaults = EB.getDefaultEmotes();
  assert(Array.isArray(defaults), 'getDefaultEmotes returns array');
  assert(defaults.length >= 3, 'at least 3 default emotes');

  var requiredFields = ['id', 'name', 'creatorId', 'category', 'frames', 'isDefault'];
  var allHaveFields = true;
  for (var i = 0; i < defaults.length; i++) {
    var e = defaults[i];
    for (var j = 0; j < requiredFields.length; j++) {
      if (!(requiredFields[j] in e)) { allHaveFields = false; break; }
    }
    if (!allHaveFields) break;
  }
  assert(allHaveFields, 'all default emotes have required fields');

  // All marked isDefault
  var allDefault = true;
  for (var k = 0; k < defaults.length; k++) {
    if (defaults[k].isDefault !== true) { allDefault = false; break; }
  }
  assert(allDefault, 'all returned defaults have isDefault === true');

  // Creator is SYSTEM
  var allSystem = true;
  for (var s = 0; s < defaults.length; s++) {
    if (defaults[s].creatorId !== 'SYSTEM') { allSystem = false; break; }
  }
  assert(allSystem, 'all default emotes have creatorId SYSTEM');

  // Unique IDs
  var ids = {};
  var uniqueIds = true;
  for (var d = 0; d < defaults.length; d++) {
    if (ids[defaults[d].id]) { uniqueIds = false; break; }
    ids[defaults[d].id] = true;
  }
  assert(uniqueIds, 'default emote IDs are unique');

  // Each has at least one frame
  var hasFrames = true;
  for (var f = 0; f < defaults.length; f++) {
    if (!Array.isArray(defaults[f].frames) || defaults[f].frames.length < 1) { hasFrames = false; break; }
  }
  assert(hasFrames, 'all default emotes have at least one frame');

  // totalDuration is computed
  var hasDuration = true;
  for (var td = 0; td < defaults.length; td++) {
    if (typeof defaults[td].totalDuration !== 'number' || defaults[td].totalDuration < 1) { hasDuration = false; break; }
  }
  assert(hasDuration, 'all default emotes have positive totalDuration');

});

// ============================================================================
// SUITE 7: createEmote — SUCCESS PATHS
// ============================================================================

suite('createEmote — success paths', function() {

  var lib     = freshLib();
  var creator = uid();
  var res     = EB.createEmote(lib, creator, 'Happy Wave', 'greeting', oneFrame('wave'));

  assert(res.ok === true, 'returns ok:true on success');
  assert(res.error === null, 'error is null on success');
  assert(res.emote !== null, 'emote object returned');
  assert(typeof res.emote.id === 'string', 'emote has string id');
  assertEqual(res.emote.name, 'Happy Wave', 'emote name matches');
  assertEqual(res.emote.creatorId, creator, 'emote creatorId matches');
  assertEqual(res.emote.category, 'greeting', 'emote category matches');
  assert(Array.isArray(res.emote.frames), 'emote has frames array');
  assertEqual(res.emote.frames.length, 1, 'emote has one frame');
  assertEqual(res.emote.isDefault, false, 'custom emote not marked default');
  assert(typeof res.emote.createdAt === 'number', 'emote has createdAt timestamp');
  assert(res.emote.usageCount === 0, 'new emote starts with 0 uses');
  assert(res.emote.royaltiesPaid === 0, 'new emote starts with 0 royalties');

  // Library updated
  assertEqual(lib.emotes.length, 1, 'emote added to library');
  assert(typeof lib.ratings[res.emote.id] === 'object', 'rating map initialized');
  assert(typeof lib.usageCounts[res.emote.id] === 'number', 'usageCount initialized');
  assert(typeof lib.royalties[res.emote.id] === 'number', 'royalties initialized');

  // Multi-frame emote
  var lib2  = freshLib();
  var res2  = EB.createEmote(lib2, uid(), 'Dance Combo', 'dance', twoFrames());
  assert(res2.ok, 'multi-frame emote created');
  assertEqual(res2.emote.frames.length, 2, 'two frames stored');
  assert(res2.emote.totalDuration === 1100, 'total duration computed correctly (500+600)');

  // Max frames
  var maxFrames = [];
  for (var i = 0; i < EB.MAX_FRAMES; i++) maxFrames.push({ poseId: 'wave', duration: 200 });
  var lib3  = freshLib();
  var res3  = EB.createEmote(lib3, uid(), 'Max Frames Emote', 'custom', maxFrames);
  assert(res3.ok, 'emote with MAX_FRAMES frames created');

  // Name trimmed
  var lib4  = freshLib();
  var res4  = EB.createEmote(lib4, uid(), '  Trimmed Name  ', 'expression', oneFrame());
  assert(res4.ok, 'emote with padded name created');
  assertEqual(res4.emote.name, 'Trimmed Name', 'name is trimmed in stored emote');

  // All valid categories
  var categories = EB.getCategories();
  for (var c = 0; c < categories.length; c++) {
    var lc = freshLib();
    var rc = EB.createEmote(lc, uid(), 'Emote Cat ' + c, categories[c], oneFrame());
    assert(rc.ok, 'category ' + categories[c] + ' accepted');
  }

  // Default frame duration applied when missing
  var lib5 = freshLib();
  var res5 = EB.createEmote(lib5, uid(), 'No Duration Emote', 'greeting', [{ poseId: 'wave' }]);
  assert(res5.ok, 'frame without explicit duration accepted');
  assertEqual(res5.emote.frames[0].duration, EB.DEFAULT_FRAME_DURATION, 'default duration applied to frame');

});

// ============================================================================
// SUITE 8: createEmote — VALIDATION FAILURES
// ============================================================================

suite('createEmote — validation failures', function() {

  var lib = freshLib();

  // Invalid creator
  var r1 = EB.createEmote(lib, null, 'Valid Name', 'greeting', oneFrame());
  assert(!r1.ok, 'null creator rejected');
  assertEqual(r1.error, 'invalid_creator', 'error is invalid_creator');

  var r2 = EB.createEmote(lib, '', 'Valid Name', 'greeting', oneFrame());
  assert(!r2.ok, 'empty creator rejected');

  var r3 = EB.createEmote(lib, 123, 'Valid Name', 'greeting', oneFrame());
  assert(!r3.ok, 'numeric creator rejected');

  // Name too short
  var r4 = EB.createEmote(lib, uid(), 'AB', 'greeting', oneFrame());
  assert(!r4.ok, 'name shorter than MIN_NAME_LENGTH rejected');
  assertEqual(r4.error, 'invalid_name', 'error is invalid_name for short name');

  // Name too long
  var longName = 'A'.repeat(EB.MAX_NAME_LENGTH + 1);
  var r5 = EB.createEmote(lib, uid(), longName, 'greeting', oneFrame());
  assert(!r5.ok, 'name longer than MAX_NAME_LENGTH rejected');

  // Profanity
  var r6 = EB.createEmote(lib, uid(), 'The Kill Dance', 'greeting', oneFrame());
  assert(!r6.ok, 'name with profanity rejected');

  // Name with only numbers/symbols
  var r7 = EB.createEmote(lib, uid(), '123', 'greeting', oneFrame());
  assert(!r7.ok, 'name with no letters rejected');

  // Invalid category
  var r8 = EB.createEmote(lib, uid(), 'Good Name', 'invalid_cat', oneFrame());
  assert(!r8.ok, 'invalid category rejected');
  assertEqual(r8.error, 'invalid_category', 'error is invalid_category');

  // Empty frames array
  var r9 = EB.createEmote(lib, uid(), 'Good Name', 'greeting', []);
  assert(!r9.ok, 'empty frames array rejected');
  assertEqual(r9.error, 'invalid_frames', 'error is invalid_frames for empty array');

  // Too many frames
  var tooMany = [];
  for (var i = 0; i < EB.MAX_FRAMES + 1; i++) tooMany.push({ poseId: 'wave', duration: 200 });
  var r10 = EB.createEmote(lib, uid(), 'Too Many', 'greeting', tooMany);
  assert(!r10.ok, 'more than MAX_FRAMES frames rejected');

  // Invalid poseId
  var r11 = EB.createEmote(lib, uid(), 'Bad Pose', 'greeting', [{ poseId: 'nonexistent_pose', duration: 500 }]);
  assert(!r11.ok, 'unknown poseId rejected');

  // Duration out of range (too low)
  var r12 = EB.createEmote(lib, uid(), 'Fast Emote', 'greeting', [{ poseId: 'wave', duration: 1 }]);
  assert(!r12.ok, 'duration below MIN_FRAME_DURATION_MS rejected');

  // Duration out of range (too high)
  var r13 = EB.createEmote(lib, uid(), 'Slow Emote', 'greeting', [{ poseId: 'wave', duration: 999999 }]);
  assert(!r13.ok, 'duration above MAX_FRAME_DURATION_MS rejected');

  // Non-array frames
  var r14 = EB.createEmote(lib, uid(), 'Bad Frames', 'greeting', 'not an array');
  assert(!r14.ok, 'non-array frames rejected');

  // Null frame within array
  var r15 = EB.createEmote(lib, uid(), 'Null Frame', 'greeting', [null]);
  assert(!r15.ok, 'null frame in array rejected');

  // Name uniqueness
  var lib2    = freshLib();
  var creator = uid();
  EB.createEmote(lib2, creator, 'Unique Name', 'greeting', oneFrame());
  var r16 = EB.createEmote(lib2, uid(), 'Unique Name', 'greeting', oneFrame());
  assert(!r16.ok, 'duplicate name rejected');
  assertEqual(r16.error, 'name_taken', 'error is name_taken for duplicate');

  // Name uniqueness is case-insensitive
  var lib3 = freshLib();
  EB.createEmote(lib3, uid(), 'Fancy Wave', 'greeting', oneFrame());
  var r17 = EB.createEmote(lib3, uid(), 'fancy wave', 'greeting', oneFrame());
  assert(!r17.ok, 'case-insensitive duplicate name rejected');

});

// ============================================================================
// SUITE 9: getEmote
// ============================================================================

suite('getEmote', function() {

  var lib     = freshLib();
  var creator = uid();
  var res     = EB.createEmote(lib, creator, 'Lookup Test', 'greeting', oneFrame());
  var emoteId = res.emote.id;

  var found = EB.getEmote(lib, emoteId);
  assert(found !== null, 'finds a custom emote by ID');
  assertEqual(found.id, emoteId, 'returned emote has correct ID');

  // Default emote lookup
  var defaults = EB.getDefaultEmotes();
  var defId    = defaults[0].id;
  var foundDef = EB.getEmote(lib, defId);
  assert(foundDef !== null, 'finds a default emote by ID');
  assertEqual(foundDef.id, defId, 'returned default emote has correct ID');

  // Not found
  var notFound = EB.getEmote(lib, 'emote_does_not_exist_xyz');
  assert(notFound === null, 'returns null for unknown emote ID');

  // Invalid ID
  var badId = EB.getEmote(lib, null);
  assert(badId === null, 'returns null for null ID');

});

// ============================================================================
// SUITE 10: useEmote — USAGE COUNTING
// ============================================================================

suite('useEmote — usage counting', function() {

  var lib     = freshLib();
  var creator = uid();
  var user    = uid();
  var res     = EB.createEmote(lib, creator, 'Use Me', 'celebration', oneFrame());
  var emoteId = res.emote.id;

  // First use
  var u1 = EB.useEmote(lib, emoteId, user);
  assert(u1.ok, 'first use succeeds');
  assert(u1.error === null, 'no error on first use');
  assertEqual(EB.getUsageCount(lib, emoteId), 1, 'usage count is 1 after first use');

  // Second use
  EB.useEmote(lib, emoteId, user);
  assertEqual(EB.getUsageCount(lib, emoteId), 2, 'usage count is 2 after second use');

  // Multiple users
  var u2 = uid();
  EB.useEmote(lib, emoteId, u2);
  assertEqual(EB.getUsageCount(lib, emoteId), 3, 'usage count increments with different user');

  // Use a default emote
  var defEmote = EB.getDefaultEmotes()[0];
  var ud = EB.useEmote(lib, defEmote.id, user);
  assert(ud.ok, 'can use default emote');
  assertEqual(EB.getUsageCount(lib, defEmote.id), 1, 'default emote usage tracked');

});

// ============================================================================
// SUITE 11: useEmote — ERROR CASES
// ============================================================================

suite('useEmote — error cases', function() {

  var lib = freshLib();

  var r1 = EB.useEmote(lib, null, uid());
  assert(!r1.ok, 'null emoteId rejected');
  assertEqual(r1.error, 'invalid_emote_id', 'error is invalid_emote_id');

  var r2 = EB.useEmote(lib, 'some_id', null);
  assert(!r2.ok, 'null userId rejected');
  assertEqual(r2.error, 'invalid_user_id', 'error is invalid_user_id');

  var r3 = EB.useEmote(lib, 'emote_nonexistent_xyz', uid());
  assert(!r3.ok, 'unknown emote rejected');
  assertEqual(r3.error, 'emote_not_found', 'error is emote_not_found');

  var r4 = EB.useEmote(lib, '', uid());
  assert(!r4.ok, 'empty emoteId rejected');

  var r5 = EB.useEmote(lib, 'valid_id', '');
  assert(!r5.ok, 'empty userId rejected');

});

// ============================================================================
// SUITE 12: SPARK ROYALTIES
// ============================================================================

suite('Spark royalties', function() {

  var lib     = freshLib();
  var creator = uid();
  var user    = uid();
  var res     = EB.createEmote(lib, creator, 'Royalty Track', 'dance', oneFrame());
  var emoteId = res.emote.id;
  var RATE    = EB.ROYALTY_RATE;

  // No royalty in first RATE-1 uses (uses 1 through RATE-1)
  for (var i = 0; i < RATE - 1; i++) {
    var early = EB.useEmote(lib, emoteId, user);
    // None of these should trigger royalty
  }
  assertEqual(EB.getEmoteRoyalties(lib, emoteId), 0, 'no royalty before ROYALTY_RATE uses');
  assertEqual(EB.getUsageCount(lib, emoteId), RATE - 1, 'usage count is RATE-1 after RATE-1 uses');

  // Use number RATE — triggers royalty
  var atThreshold = EB.useEmote(lib, emoteId, user);
  assert(atThreshold.royaltyPaid, 'royalty paid at ROYALTY_RATE uses');
  assertEqual(atThreshold.royaltyAmount, 1, 'royalty amount is 1 Spark');
  assertEqual(EB.getEmoteRoyalties(lib, emoteId), 1, 'library royalty record incremented to 1');

  // Uses RATE+1 through RATE*2-1 — no royalty
  for (var j = RATE + 1; j < RATE * 2; j++) {
    var mid = EB.useEmote(lib, emoteId, user);
    assert(!mid.royaltyPaid, 'no royalty between thresholds at use ' + j);
  }

  // Use number RATE*2 — triggers second royalty
  var second = EB.useEmote(lib, emoteId, user);
  assert(second.royaltyPaid, 'royalty paid at second ROYALTY_RATE threshold');
  assertEqual(EB.getEmoteRoyalties(lib, emoteId), 2, 'cumulative royalties is 2');

  // No royalty for default/SYSTEM emotes
  var lib2   = freshLib();
  var defId  = EB.getDefaultEmotes()[0].id;
  for (var k = 0; k <= RATE; k++) EB.useEmote(lib2, defId, uid());
  assertEqual(EB.getEmoteRoyalties(lib2, defId), 0, 'no royalties for default SYSTEM emotes');

  // Creator using own emote does not earn royalty
  var lib3    = freshLib();
  var creator3 = uid();
  var res3    = EB.createEmote(lib3, creator3, 'Self Use Emote', 'dance', oneFrame());
  for (var l = 0; l <= RATE; l++) EB.useEmote(lib3, res3.emote.id, creator3);
  assertEqual(EB.getEmoteRoyalties(lib3, res3.emote.id), 0, 'no royalties when creator uses own emote');

  // getCreatorRoyalties sums across emotes
  var lib4    = freshLib();
  var creator4 = uid();
  var re1     = EB.createEmote(lib4, creator4, 'Emote Alpha', 'dance', oneFrame());
  var re2     = EB.createEmote(lib4, creator4, 'Emote Beta',  'dance', oneFrame());
  var user4   = uid();
  for (var m = 0; m < RATE; m++) EB.useEmote(lib4, re1.emote.id, user4);
  for (var n = 0; n < RATE; n++) EB.useEmote(lib4, re2.emote.id, user4);
  // Each emote hit threshold once = 1 royalty each
  var total4 = EB.getCreatorRoyalties(lib4, creator4);
  assertEqual(total4, 2, 'getCreatorRoyalties sums 2 royalties across 2 emotes');

});

// ============================================================================
// SUITE 13: rateEmote — SUCCESS PATHS
// ============================================================================

suite('rateEmote — success paths', function() {

  var lib     = freshLib();
  var creator = uid();
  var rater   = uid();
  var res     = EB.createEmote(lib, creator, 'Rate Me', 'expression', oneFrame());
  var emoteId = res.emote.id;

  // Rate 1–5
  for (var stars = 1; stars <= 5; stars++) {
    var r = uid();
    var rv = EB.rateEmote(lib, emoteId, r, stars);
    assert(rv.ok, 'rating ' + stars + ' stars succeeds');
    assert(rv.error === null, 'no error for ' + stars + ' star rating');
    assert(typeof rv.avgRating === 'number', 'avgRating is a number');
    assert(typeof rv.ratingCount === 'number', 'ratingCount is a number');
  }

  // Single user rating
  var lib2  = freshLib();
  var res2  = EB.createEmote(lib2, uid(), 'Solo Rate', 'greeting', oneFrame());
  var eId2  = res2.emote.id;
  var r2    = EB.rateEmote(lib2, eId2, rater, 4);
  assertEqual(r2.avgRating, 4, 'avg rating is 4 after single 4-star rating');
  assertEqual(r2.ratingCount, 1, 'rating count is 1 after first rating');

  // Multiple users — check average
  var lib3   = freshLib();
  var res3   = EB.createEmote(lib3, uid(), 'Multi Rate', 'greeting', oneFrame());
  var eId3   = res3.emote.id;
  EB.rateEmote(lib3, eId3, uid(), 4);
  EB.rateEmote(lib3, eId3, uid(), 2);
  var r3avg = EB.getAvgRating(lib3, eId3);
  assertEqual(r3avg, 3, 'average of 4 and 2 is 3');
  assertEqual(EB.getRatingCount(lib3, eId3), 2, 'rating count is 2');

  // User re-rates — updates, doesn't add extra
  var lib4   = freshLib();
  var res4   = EB.createEmote(lib4, uid(), 'Rerate Test', 'greeting', oneFrame());
  var eId4   = res4.emote.id;
  var rater4 = uid();
  EB.rateEmote(lib4, eId4, rater4, 2);
  EB.rateEmote(lib4, eId4, rater4, 5);
  assertEqual(EB.getRatingCount(lib4, eId4), 1, 'rerate replaces existing rating (count stays 1)');
  assertEqual(EB.getAvgRating(lib4, eId4), 5, 'rerate updates to new value');

  // getUserRating
  var lib5    = freshLib();
  var res5    = EB.createEmote(lib5, uid(), 'Get User Rating', 'greeting', oneFrame());
  var eId5    = res5.emote.id;
  var rater5  = uid();
  assert(EB.getUserRating(lib5, eId5, rater5) === null, 'getUserRating returns null before rating');
  EB.rateEmote(lib5, eId5, rater5, 3);
  assertEqual(EB.getUserRating(lib5, eId5, rater5), 3, 'getUserRating returns 3 after 3-star rating');

  // Rate default emote
  var lib6  = freshLib();
  var defId = EB.getDefaultEmotes()[0].id;
  var r6    = EB.rateEmote(lib6, defId, uid(), 5);
  assert(r6.ok, 'can rate a default emote');

});

// ============================================================================
// SUITE 14: rateEmote — VALIDATION FAILURES
// ============================================================================

suite('rateEmote — validation failures', function() {

  var lib     = freshLib();
  var creator = uid();
  var res     = EB.createEmote(lib, creator, 'Rate Validation', 'expression', oneFrame());
  var emoteId = res.emote.id;

  var r1 = EB.rateEmote(lib, null, uid(), 3);
  assert(!r1.ok, 'null emoteId rejected');
  assertEqual(r1.error, 'invalid_emote_id', 'error is invalid_emote_id');

  var r2 = EB.rateEmote(lib, emoteId, null, 3);
  assert(!r2.ok, 'null userId rejected');
  assertEqual(r2.error, 'invalid_user_id', 'error is invalid_user_id');

  var r3 = EB.rateEmote(lib, emoteId, uid(), 0);
  assert(!r3.ok, '0 stars rejected');
  assertEqual(r3.error, 'invalid_rating', 'error is invalid_rating for 0');

  var r4 = EB.rateEmote(lib, emoteId, uid(), 6);
  assert(!r4.ok, '6 stars rejected');

  var r5 = EB.rateEmote(lib, emoteId, uid(), -1);
  assert(!r5.ok, '-1 stars rejected');

  var r6 = EB.rateEmote(lib, emoteId, uid(), 'five');
  assert(!r6.ok, 'string rating rejected');

  var r7 = EB.rateEmote(lib, 'emote_nonexistent_xyz', uid(), 3);
  assert(!r7.ok, 'unknown emote rejected');
  assertEqual(r7.error, 'emote_not_found', 'error is emote_not_found');

});

// ============================================================================
// SUITE 15: deleteEmote
// ============================================================================

suite('deleteEmote', function() {

  // Happy path
  var lib     = freshLib();
  var creator = uid();
  var res     = EB.createEmote(lib, creator, 'Delete Me', 'greeting', oneFrame());
  var emoteId = res.emote.id;

  assertEqual(lib.emotes.length, 1, 'one emote before delete');
  var del = EB.deleteEmote(lib, emoteId, creator);
  assert(del.ok, 'delete by creator succeeds');
  assert(del.error === null, 'no error on delete');
  assertEqual(lib.emotes.length, 0, 'emote removed from library');
  assert(lib.ratings[emoteId] === undefined,     'rating record cleaned up');
  assert(lib.usageCounts[emoteId] === undefined, 'usageCount record cleaned up');
  assert(lib.royalties[emoteId] === undefined,   'royalties record cleaned up');

  // Cannot delete as wrong user
  var lib2    = freshLib();
  var creator2 = uid();
  var other   = uid();
  var res2    = EB.createEmote(lib2, creator2, 'Not Yours', 'greeting', oneFrame());
  var del2    = EB.deleteEmote(lib2, res2.emote.id, other);
  assert(!del2.ok, 'delete by non-creator rejected');
  assertEqual(del2.error, 'permission_denied', 'error is permission_denied');
  assertEqual(lib2.emotes.length, 1, 'emote still in library after failed delete');

  // Cannot delete default
  var lib3   = freshLib();
  var defId  = EB.getDefaultEmotes()[0].id;
  var del3   = EB.deleteEmote(lib3, defId, 'SYSTEM');
  assert(!del3.ok, 'cannot delete default emote');
  assertEqual(del3.error, 'cannot_delete_default', 'error is cannot_delete_default');

  // Null emoteId
  var lib4 = freshLib();
  var del4 = EB.deleteEmote(lib4, null, uid());
  assert(!del4.ok, 'null emoteId rejected');

  // Unknown emote
  var lib5 = freshLib();
  var del5 = EB.deleteEmote(lib5, 'emote_nonexistent_xyz', uid());
  assert(!del5.ok, 'unknown emote rejected');
  assertEqual(del5.error, 'emote_not_found', 'error is emote_not_found');

  // Deleted emote removed from featured
  var lib6    = freshLib();
  var creator6 = uid();
  var res6    = EB.createEmote(lib6, creator6, 'Featured Delete', 'dance', oneFrame());
  lib6.featured.push(res6.emote.id);
  EB.deleteEmote(lib6, res6.emote.id, creator6);
  assert(lib6.featured.indexOf(res6.emote.id) === -1, 'deleted emote removed from featured list');

});

// ============================================================================
// SUITE 16: searchEmotes
// ============================================================================

suite('searchEmotes', function() {

  var lib = freshLib();
  var c1  = uid();
  var c2  = uid();
  EB.createEmote(lib, c1, 'Moonwalk Special',  'dance',       [{ poseId: 'moonwalk', duration: 700 }]);
  EB.createEmote(lib, c1, 'Happy Greeting',    'greeting',    oneFrame('wave'));
  EB.createEmote(lib, c2, 'Shrug Expression',  'expression',  oneFrame('shrug'));
  EB.createEmote(lib, c2, 'Victory Jump',      'celebration', oneFrame('jump'));

  // Search all (includes defaults)
  var all = EB.searchEmotes(lib, {});
  assert(all.length >= 4, 'search with no filter returns all custom + default emotes');

  // Category filter
  var dances = EB.searchEmotes(lib, { category: 'dance' });
  var allDance = true;
  for (var i = 0; i < dances.length; i++) {
    if (dances[i].category !== 'dance') { allDance = false; break; }
  }
  assert(allDance, 'category filter returns only dance emotes');

  // Query filter
  var greets = EB.searchEmotes(lib, { query: 'greeting' });
  var hasGreet = false;
  for (var j = 0; j < greets.length; j++) {
    if (greets[j].name.toLowerCase().indexOf('greeting') !== -1) { hasGreet = true; break; }
  }
  assert(hasGreet, 'query filter returns matching name emotes');

  // No results
  var none = EB.searchEmotes(lib, { query: 'xyzzy_no_match_for_sure' });
  assertEqual(none.length, 0, 'query with no match returns empty array');

  // Sort by uses
  var lib2 = freshLib();
  var r2a = EB.createEmote(lib2, uid(), 'Popular Emote',  'dance', oneFrame());
  var r2b = EB.createEmote(lib2, uid(), 'Unknown Emote',  'dance', oneFrame());
  for (var k = 0; k < 5; k++) EB.useEmote(lib2, r2a.emote.id, uid());
  var byUses = EB.searchEmotes(lib2, { category: 'dance', sortBy: 'uses' });
  assert(byUses[0].usageCount >= byUses[byUses.length - 1].usageCount, 'sortBy uses returns descending order');

  // Sort by newest
  var lib3 = freshLib();
  EB.createEmote(lib3, uid(), 'Older Emote',  'greeting', oneFrame());
  EB.createEmote(lib3, uid(), 'Newer Emote',  'greeting', oneFrame());
  var byNewest = EB.searchEmotes(lib3, { category: 'greeting', sortBy: 'newest' });
  assert(byNewest[0].createdAt >= byNewest[byNewest.length - 1].createdAt, 'sortBy newest returns descending order');

  // Limit
  var lib4 = freshLib();
  for (var l = 0; l < 5; l++) EB.createEmote(lib4, uid(), 'Emote Limit ' + l, 'greeting', oneFrame());
  var limited = EB.searchEmotes(lib4, { limit: 3 });
  assert(limited.length <= 3, 'limit parameter caps results');

  // Results include avgRating and usageCount fields
  var results = EB.searchEmotes(lib, {});
  var hasFields = true;
  for (var m = 0; m < results.length; m++) {
    if (typeof results[m].avgRating !== 'number')  { hasFields = false; break; }
    if (typeof results[m].usageCount !== 'number') { hasFields = false; break; }
    if (typeof results[m].id !== 'string')         { hasFields = false; break; }
    if (typeof results[m].name !== 'string')       { hasFields = false; break; }
  }
  assert(hasFields, 'search results have avgRating, usageCount, id, name fields');

  // Sort by rating
  var lib5 = freshLib();
  var r5a = EB.createEmote(lib5, uid(), 'High Rated Emote', 'dance', oneFrame());
  var r5b = EB.createEmote(lib5, uid(), 'Low Rated Emote',  'dance', oneFrame());
  EB.rateEmote(lib5, r5a.emote.id, uid(), 5);
  EB.rateEmote(lib5, r5b.emote.id, uid(), 1);
  var byRating = EB.searchEmotes(lib5, { category: 'dance', sortBy: 'rating' });
  assert(byRating[0].avgRating >= byRating[byRating.length - 1].avgRating, 'sortBy rating returns descending order');

});

// ============================================================================
// SUITE 17: getEmotesByCategory
// ============================================================================

suite('getEmotesByCategory', function() {

  var lib = freshLib();
  EB.createEmote(lib, uid(), 'Dance One', 'dance', oneFrame('spin'));
  EB.createEmote(lib, uid(), 'Dance Two', 'dance', oneFrame('twirl'));
  EB.createEmote(lib, uid(), 'Greet One', 'greeting', oneFrame('wave'));

  var dances = EB.getEmotesByCategory(lib, 'dance');
  assert(dances.length >= 2, 'at least 2 dance emotes returned');
  var allDance = true;
  for (var i = 0; i < dances.length; i++) {
    if (dances[i].category !== 'dance') { allDance = false; break; }
  }
  assert(allDance, 'all returned emotes are dance category');

  var greets = EB.getEmotesByCategory(lib, 'greeting');
  assert(greets.length >= 1, 'at least 1 greeting emote returned');

  // Invalid category
  var invalid = EB.getEmotesByCategory(lib, 'invalid_cat_xyz');
  assertEqual(invalid.length, 0, 'invalid category returns empty array');

  // Custom category
  var custom = EB.getEmotesByCategory(lib, 'custom');
  assert(Array.isArray(custom), 'custom category returns array');

  // Results are enriched with avgRating
  var hasRating = true;
  for (var j = 0; j < dances.length; j++) {
    if (typeof dances[j].avgRating !== 'number') { hasRating = false; break; }
  }
  assert(hasRating, 'category results include avgRating');

});

// ============================================================================
// SUITE 18: getCreatorEmotes and getCreatorProfile
// ============================================================================

suite('getCreatorEmotes and getCreatorProfile', function() {

  var lib     = freshLib();
  var creator = uid();
  var other   = uid();

  EB.createEmote(lib, creator, 'My Emote One',   'greeting',   oneFrame());
  EB.createEmote(lib, creator, 'My Emote Two',   'dance',      oneFrame());
  EB.createEmote(lib, other,   'Other Emote One', 'expression', oneFrame());

  var myEmotes = EB.getCreatorEmotes(lib, creator);
  assertEqual(myEmotes.length, 2, 'getCreatorEmotes returns 2 for creator');

  var otherEmotes = EB.getCreatorEmotes(lib, other);
  assertEqual(otherEmotes.length, 1, 'getCreatorEmotes returns 1 for other');

  // All belong to creator
  var allMine = true;
  for (var i = 0; i < myEmotes.length; i++) {
    if (myEmotes[i].creatorId !== creator) { allMine = false; break; }
  }
  assert(allMine, 'all returned emotes belong to creator');

  // Empty creator
  var nobody = EB.getCreatorEmotes(lib, 'nobody_xyz');
  assertEqual(nobody.length, 0, 'unknown creator returns empty array');

  // Null creator
  var nullCreator = EB.getCreatorEmotes(lib, null);
  assertEqual(nullCreator.length, 0, 'null creator returns empty array');

  // Creator profile
  var user = uid();
  for (var j = 0; j < 10; j++) EB.useEmote(lib, myEmotes[0].id, user);
  for (var k = 0; k < 5; k++)  EB.useEmote(lib, myEmotes[1].id, user);

  var profile = EB.getCreatorProfile(lib, creator);
  assert(typeof profile === 'object', 'getCreatorProfile returns object');
  assertEqual(profile.creatorId, creator, 'profile has correct creatorId');
  assertEqual(profile.emoteCount, 2, 'profile shows 2 emotes');
  assertEqual(profile.totalUses, 15, 'profile totalUses sums across emotes (10 + 5)');
  assert(typeof profile.totalRoyalties === 'number', 'profile has totalRoyalties');
  // Top emote is the one with more uses
  assert(profile.topEmote !== null, 'profile has topEmote');
  assertEqual(profile.topEmote.usageCount, 10, 'topEmote is the most-used one');

  // Profile for unknown creator
  var emptyProfile = EB.getCreatorProfile(lib, 'nobody_xyz');
  assertEqual(emptyProfile.emoteCount, 0, 'unknown creator profile has 0 emotes');
  assertEqual(emptyProfile.totalUses, 0, 'unknown creator profile has 0 uses');
  assert(emptyProfile.topEmote === null, 'unknown creator profile topEmote is null');

});

// ============================================================================
// SUITE 19: refreshFeatured and getFeatured
// ============================================================================

suite('refreshFeatured and getFeatured', function() {

  var lib = freshLib();
  // Create several emotes and rate/use them
  var creators = [uid(), uid(), uid()];
  var emoteIds = [];
  for (var i = 0; i < 8; i++) {
    var r = EB.createEmote(lib, creators[i % 3], 'Featured Emote ' + i, 'dance', oneFrame());
    emoteIds.push(r.emote.id);
  }

  // Rate and use some
  var user = uid();
  EB.rateEmote(lib, emoteIds[0], uid(), 5);
  EB.rateEmote(lib, emoteIds[0], uid(), 5);
  EB.rateEmote(lib, emoteIds[1], uid(), 4);
  for (var j = 0; j < 50; j++) EB.useEmote(lib, emoteIds[2], user);

  var featured = EB.refreshFeatured(lib, 42);
  assert(Array.isArray(featured), 'refreshFeatured returns array');
  assert(featured.length <= EB.FEATURED_COUNT, 'featured list does not exceed FEATURED_COUNT');
  assert(featured.length >= 1, 'featured list has at least 1 entry');
  // All are strings
  var allStrings = true;
  for (var k = 0; k < featured.length; k++) {
    if (typeof featured[k] !== 'string') { allStrings = false; break; }
  }
  assert(allStrings, 'featured list contains only strings (IDs)');
  // Updated library
  assertEqual(lib.featured.length, featured.length, 'lib.featured updated');

  // getFeatured returns enriched objects
  var featuredFull = EB.getFeatured(lib);
  assert(Array.isArray(featuredFull), 'getFeatured returns array');
  assert(featuredFull.length <= EB.FEATURED_COUNT, 'getFeatured length matches');
  if (featuredFull.length > 0) {
    var fe = featuredFull[0];
    assert(typeof fe.id === 'string',    'featured emote has id');
    assert(typeof fe.name === 'string',  'featured emote has name');
    assert(typeof fe.avgRating === 'number', 'featured emote has avgRating');
  }

  // Determinism — same seed same result
  var lib2 = freshLib();
  EB.createEmote(lib2, uid(), 'Det Emote Alpha', 'dance', oneFrame());
  EB.createEmote(lib2, uid(), 'Det Emote Beta',  'dance', oneFrame());
  var feat1 = EB.refreshFeatured(lib2, 99);
  var feat2 = EB.refreshFeatured(lib2, 99);
  assertDeep(feat1, feat2, 'same seed yields same featured list');

  // Empty library still works
  var lib3 = freshLib();
  var emptyFeat = EB.refreshFeatured(lib3, 0);
  assert(Array.isArray(emptyFeat), 'refreshFeatured on empty lib returns array');

  // getFeatured on empty library
  var lib4 = freshLib();
  var emptyGetFeat = EB.getFeatured(lib4);
  assert(Array.isArray(emptyGetFeat), 'getFeatured on empty lib returns array');
  assertEqual(emptyGetFeat.length, 0, 'getFeatured on empty lib returns empty array');

});

// ============================================================================
// SUITE 20: validateFrames
// ============================================================================

suite('validateFrames', function() {

  // Valid single frame
  var v1 = EB.validateFrames([{ poseId: 'wave', duration: 500 }]);
  assert(v1.valid, 'single valid frame passes');
  assert(v1.error === null, 'no error for valid frame');

  // Valid multi-frame
  var v2 = EB.validateFrames(twoFrames());
  assert(v2.valid, 'two valid frames pass');

  // Max frames
  var maxF = [];
  for (var i = 0; i < EB.MAX_FRAMES; i++) maxF.push({ poseId: 'wave', duration: 200 });
  var v3 = EB.validateFrames(maxF);
  assert(v3.valid, 'MAX_FRAMES frames pass');

  // Too few frames
  var v4 = EB.validateFrames([]);
  assert(!v4.valid, 'empty frames array fails');
  assertEqual(v4.error, 'too_few_frames', 'error is too_few_frames');

  // Too many frames
  var tooMany = [];
  for (var j = 0; j < EB.MAX_FRAMES + 1; j++) tooMany.push({ poseId: 'wave', duration: 200 });
  var v5 = EB.validateFrames(tooMany);
  assert(!v5.valid, 'too many frames fail');
  assertEqual(v5.error, 'too_many_frames', 'error is too_many_frames');

  // Not an array
  var v6 = EB.validateFrames('not an array');
  assert(!v6.valid, 'non-array fails');
  assertEqual(v6.error, 'frames_must_be_array', 'error is frames_must_be_array');

  // Unknown poseId
  var v7 = EB.validateFrames([{ poseId: 'unknown_xyz', duration: 500 }]);
  assert(!v7.valid, 'unknown poseId fails');

  // Duration too low
  var v8 = EB.validateFrames([{ poseId: 'wave', duration: 1 }]);
  assert(!v8.valid, 'duration too low fails');

  // Duration too high
  var v9 = EB.validateFrames([{ poseId: 'wave', duration: 999999 }]);
  assert(!v9.valid, 'duration too high fails');

  // No duration (missing) — should be valid (defaults applied)
  var v10 = EB.validateFrames([{ poseId: 'wave' }]);
  assert(v10.valid, 'frame without explicit duration is valid');

});

// ============================================================================
// SUITE 21: validateName
// ============================================================================

suite('validateName', function() {

  // Valid names
  var good = ['Dance Combo', 'WaveHello', 'My Custom Emote', 'Happy123', 'abc'];
  for (var g = 0; g < good.length; g++) {
    var vg = EB.validateName(good[g]);
    assert(vg.valid, '"' + good[g] + '" is a valid name');
    assert(vg.error === null, 'no error for valid name: ' + good[g]);
  }

  // Too short
  var v1 = EB.validateName('AB');
  assert(!v1.valid, 'two-char name fails');
  assertEqual(v1.error, 'name_too_short', 'error is name_too_short');

  // Too long
  var v2 = EB.validateName('A'.repeat(EB.MAX_NAME_LENGTH + 1));
  assert(!v2.valid, 'too-long name fails');
  assertEqual(v2.error, 'name_too_long', 'error is name_too_long');

  // Profanity
  var v3 = EB.validateName('kill move');
  assert(!v3.valid, 'profane name fails');
  assertEqual(v3.error, 'name_contains_profanity', 'error is name_contains_profanity');

  // No letters
  var v4 = EB.validateName('12345');
  assert(!v4.valid, 'all-number name fails');
  assertEqual(v4.error, 'name_needs_letter', 'error is name_needs_letter');

  // Non-string
  var v5 = EB.validateName(null);
  assert(!v5.valid, 'null name fails');
  assertEqual(v5.error, 'name_must_be_string', 'error is name_must_be_string');

  var v6 = EB.validateName(42);
  assert(!v6.valid, 'numeric name fails');

  // Exact min length
  var minName = 'Abc';
  var vMin = EB.validateName(minName);
  assert(vMin.valid, 'exactly MIN_NAME_LENGTH chars is valid');

  // Exact max length
  var maxName = 'A'.repeat(EB.MAX_NAME_LENGTH - 1) + 'z';
  var vMax = EB.validateName(maxName);
  assert(vMax.valid, 'exactly MAX_NAME_LENGTH chars is valid');

});

// ============================================================================
// SUITE 22: getEmoteDuration
// ============================================================================

suite('getEmoteDuration', function() {

  var lib   = freshLib();
  var frames = [
    { poseId: 'wave', duration: 300 },
    { poseId: 'bow',  duration: 700 }
  ];
  var res   = EB.createEmote(lib, uid(), 'Duration Test', 'greeting', frames);
  var eId   = res.emote.id;

  assertEqual(EB.getEmoteDuration(lib, eId), 1000, 'total duration is 300 + 700 = 1000ms');

  // Single frame
  var lib2 = freshLib();
  var res2 = EB.createEmote(lib2, uid(), 'Single Frame Duration', 'greeting', [{ poseId: 'jump', duration: 500 }]);
  assertEqual(EB.getEmoteDuration(lib2, res2.emote.id), 500, 'single frame duration is 500ms');

  // Default emote duration
  var defEmote = EB.getDefaultEmotes()[0];
  var defDur   = EB.getEmoteDuration(lib, defEmote.id);
  assert(defDur > 0, 'default emote has positive duration');

  // Unknown emote
  assertEqual(EB.getEmoteDuration(lib, 'emote_unknown_xyz'), 0, 'unknown emote returns 0 duration');

});

// ============================================================================
// SUITE 23: previewFrames
// ============================================================================

suite('previewFrames', function() {

  var frames = [
    { poseId: 'wave', duration: 400 },
    { poseId: 'spin', duration: 600 }
  ];
  var preview = EB.previewFrames(frames);
  assert(Array.isArray(preview), 'previewFrames returns array');
  assertEqual(preview.length, 2, 'preview has same length as frames');

  // First frame
  var f0 = preview[0];
  assertEqual(f0.index, 0, 'first frame has index 0');
  assertEqual(f0.poseId, 'wave', 'first frame has correct poseId');
  assertEqual(f0.duration, 400, 'first frame has correct duration');
  assert(f0.pose !== null, 'first frame has pose metadata');
  assert(f0.valid, 'first frame is valid');

  // Second frame
  var f1 = preview[1];
  assertEqual(f1.index, 1, 'second frame has index 1');
  assertEqual(f1.poseId, 'spin', 'second frame poseId is spin');

  // Unknown poseId
  var badPreview = EB.previewFrames([{ poseId: 'nonexistent_xyz', duration: 500 }]);
  assertEqual(badPreview.length, 1, 'bad frame preview has 1 entry');
  assert(!badPreview[0].valid, 'invalid pose marked as valid:false');
  assert(badPreview[0].pose === null, 'invalid pose has null pose metadata');

  // Missing duration defaults
  var noD = EB.previewFrames([{ poseId: 'wave' }]);
  assertEqual(noD[0].duration, EB.DEFAULT_FRAME_DURATION, 'missing duration defaults');

  // Non-array
  var nonArr = EB.previewFrames('bad');
  assert(Array.isArray(nonArr) && nonArr.length === 0, 'non-array returns empty array');

  // Empty array
  var empty = EB.previewFrames([]);
  assertEqual(empty.length, 0, 'empty frames array returns empty preview');

});

// ============================================================================
// SUITE 24: getUsageCount, getAvgRating, getRatingCount, getUserRating
// ============================================================================

suite('Stat query functions', function() {

  var lib = freshLib();
  var res = EB.createEmote(lib, uid(), 'Query Stats', 'dance', oneFrame());
  var eId = res.emote.id;

  // Usage count starts at 0
  assertEqual(EB.getUsageCount(lib, eId), 0, 'usage count starts at 0');

  // After uses
  EB.useEmote(lib, eId, uid());
  EB.useEmote(lib, eId, uid());
  assertEqual(EB.getUsageCount(lib, eId), 2, 'usage count is 2 after 2 uses');

  // Avg rating starts at 0
  assertEqual(EB.getAvgRating(lib, eId), 0, 'avg rating starts at 0 (no ratings)');

  // Rating count starts at 0
  assertEqual(EB.getRatingCount(lib, eId), 0, 'rating count starts at 0');

  // After ratings
  EB.rateEmote(lib, eId, uid(), 4);
  EB.rateEmote(lib, eId, uid(), 2);
  assertEqual(EB.getAvgRating(lib, eId), 3, 'avg rating is 3 after ratings of 4 and 2');
  assertEqual(EB.getRatingCount(lib, eId), 2, 'rating count is 2');

  // getUserRating
  var user = uid();
  assert(EB.getUserRating(lib, eId, user) === null, 'getUserRating is null before rating');
  EB.rateEmote(lib, eId, user, 5);
  assertEqual(EB.getUserRating(lib, eId, user), 5, 'getUserRating returns 5 after rating');

  // Unknown emote
  assertEqual(EB.getUsageCount(lib, 'emote_xyz_none'), 0, 'usage count 0 for unknown emote');
  assertEqual(EB.getAvgRating(lib, 'emote_xyz_none'), 0, 'avg rating 0 for unknown emote');
  assertEqual(EB.getRatingCount(lib, 'emote_xyz_none'), 0, 'rating count 0 for unknown emote');
  assert(EB.getUserRating(lib, 'emote_xyz_none', uid()) === null, 'getUserRating null for unknown emote');

});

// ============================================================================
// SUITE 25: getTopByUsage, getTopByRating, getNewest
// ============================================================================

suite('Convenience sorting functions', function() {

  var lib  = freshLib();
  var user = uid();
  var r1 = EB.createEmote(lib, uid(), 'Top Usage One',  'dance', oneFrame());
  var r2 = EB.createEmote(lib, uid(), 'Top Usage Two',  'dance', oneFrame());
  var r3 = EB.createEmote(lib, uid(), 'Top Usage Three','dance', oneFrame());

  for (var i = 0; i < 10; i++) EB.useEmote(lib, r1.emote.id, user);
  for (var j = 0; j < 5;  j++) EB.useEmote(lib, r2.emote.id, user);
  for (var k = 0; k < 2;  k++) EB.useEmote(lib, r3.emote.id, user);

  var topUsage = EB.getTopByUsage(lib, 3);
  assert(Array.isArray(topUsage), 'getTopByUsage returns array');
  assert(topUsage.length <= 3, 'getTopByUsage respects limit');
  if (topUsage.length >= 2) {
    assert(topUsage[0].usageCount >= topUsage[1].usageCount, 'getTopByUsage is descending by usage');
  }

  // By rating
  EB.rateEmote(lib, r1.emote.id, uid(), 5);
  EB.rateEmote(lib, r2.emote.id, uid(), 3);
  var topRating = EB.getTopByRating(lib, 3);
  assert(Array.isArray(topRating), 'getTopByRating returns array');
  if (topRating.length >= 2) {
    assert(topRating[0].avgRating >= topRating[1].avgRating, 'getTopByRating is descending by rating');
  }

  // Newest
  var newest = EB.getNewest(lib, 3);
  assert(Array.isArray(newest), 'getNewest returns array');
  if (newest.length >= 2) {
    assert(newest[0].createdAt >= newest[1].createdAt, 'getNewest is descending by createdAt');
  }

  // Default limit of 10
  var lib2 = freshLib();
  for (var l = 0; l < 15; l++) EB.createEmote(lib2, uid(), 'Bulk Emote ' + l, 'dance', oneFrame());
  var topDefault = EB.getTopByUsage(lib2);
  assert(topDefault.length <= 10, 'getTopByUsage default limit is 10');

});

// ============================================================================
// SUITE 26: getEmoteRoyalties and getCreatorRoyalties
// ============================================================================

suite('Royalty query functions', function() {

  var lib     = freshLib();
  var creator = uid();
  var user    = uid();
  var res1    = EB.createEmote(lib, creator, 'Royalty Emote A', 'dance', oneFrame());
  var res2    = EB.createEmote(lib, creator, 'Royalty Emote B', 'dance', oneFrame());

  // No royalties yet
  assertEqual(EB.getEmoteRoyalties(lib, res1.emote.id), 0, 'royalties start at 0');
  assertEqual(EB.getCreatorRoyalties(lib, creator), 0, 'creator royalties start at 0');

  // Trigger first threshold on emote A
  for (var i = 0; i < EB.ROYALTY_RATE; i++) EB.useEmote(lib, res1.emote.id, user);
  assertEqual(EB.getEmoteRoyalties(lib, res1.emote.id), 1, 'emote A has 1 royalty after ROYALTY_RATE uses');

  // Trigger first threshold on emote B
  for (var j = 0; j < EB.ROYALTY_RATE; j++) EB.useEmote(lib, res2.emote.id, user);
  assertEqual(EB.getEmoteRoyalties(lib, res2.emote.id), 1, 'emote B has 1 royalty after ROYALTY_RATE uses');

  assertEqual(EB.getCreatorRoyalties(lib, creator), 2, 'creator total royalties is 2 (1 per emote)');

  // Unknown emote royalties
  assertEqual(EB.getEmoteRoyalties(lib, 'emote_xyz_none'), 0, 'unknown emote royalties is 0');

  // Unknown creator royalties
  assertEqual(EB.getCreatorRoyalties(lib, 'nobody_xyz'), 0, 'unknown creator royalties is 0');

});

// ============================================================================
// SUITE 27: GUARD PATTERNS AND EDGE CASES
// ============================================================================

suite('Guard patterns and edge cases', function() {

  // null library passed to functions
  var r1 = EB.searchEmotes(null, {});
  assert(Array.isArray(r1), 'searchEmotes handles null lib');

  var r2 = EB.getEmotesByCategory(null, 'dance');
  assert(Array.isArray(r2), 'getEmotesByCategory handles null lib');

  var r3 = EB.getCreatorEmotes(null, uid());
  assert(Array.isArray(r3), 'getCreatorEmotes handles null lib');

  var r4 = EB.refreshFeatured(null, 1);
  assert(Array.isArray(r4), 'refreshFeatured handles null lib');

  var r5 = EB.getFeatured(null);
  assert(Array.isArray(r5), 'getFeatured handles null lib');

  var r6 = EB.getCreatorRoyalties(null, uid());
  assertEqual(r6, 0, 'getCreatorRoyalties handles null lib');

  var r7 = EB.getUsageCount(null, 'some_id');
  assertEqual(r7, 0, 'getUsageCount handles null lib');

  var r8 = EB.getAvgRating(null, 'some_id');
  assertEqual(r8, 0, 'getAvgRating handles null lib');

  var r9 = EB.getRatingCount(null, 'some_id');
  assertEqual(r9, 0, 'getRatingCount handles null lib');

  var r10 = EB.getEmoteDuration(null, 'some_id');
  assertEqual(r10, 0, 'getEmoteDuration handles null lib');

  var r11 = EB.getEmoteRoyalties(null, 'some_id');
  assertEqual(r11, 0, 'getEmoteRoyalties handles null lib');

  // createEmote with null lib creates a new lib internally
  var r12 = EB.createEmote(null, uid(), 'Null Lib Emote', 'greeting', oneFrame());
  // Should either succeed gracefully or return an error, not throw
  assert(typeof r12 === 'object', 'createEmote with null lib returns object (no crash)');

  // rateEmote with float star values (rounded to int)
  var lib = freshLib();
  var res = EB.createEmote(lib, uid(), 'Float Rating', 'dance', oneFrame());
  var rf  = EB.rateEmote(lib, res.emote.id, uid(), 3.7);
  assert(rf.ok, 'float star value accepted (rounds to 4)');
  assertEqual(EB.getUserRating(lib, res.emote.id, Object.keys(lib.ratings[res.emote.id])[0]), 4, 'float rating rounded to nearest int');

  // getCreatorProfile with null creator
  var libp = freshLib();
  var prof = EB.getCreatorProfile(libp, null);
  assert(typeof prof === 'object', 'getCreatorProfile with null creator returns object');

  // deleteEmote null requester
  var libd = freshLib();
  var resd = EB.createEmote(libd, uid(), 'Delete Null', 'dance', oneFrame());
  var deln = EB.deleteEmote(libd, resd.emote.id, null);
  assert(!deln.ok, 'deleteEmote with null requester rejected');

});

// ============================================================================
// SUITE 28: INTEGRATION — FULL EMOTE LIFECYCLE
// ============================================================================

suite('Integration — full emote lifecycle', function() {

  var lib      = freshLib();
  var creator  = uid();
  var user1    = uid();
  var user2    = uid();
  var user3    = uid();

  // 1. Create emote
  var created = EB.createEmote(lib, creator, 'Lifecycle Emote', 'celebration', twoFrames());
  assert(created.ok, 'emote created');
  var emoteId = created.emote.id;

  // 2. Multiple users rate it
  EB.rateEmote(lib, emoteId, user1, 5);
  EB.rateEmote(lib, emoteId, user2, 4);
  EB.rateEmote(lib, emoteId, user3, 3);
  assertEqual(EB.getRatingCount(lib, emoteId), 3, 'three ratings registered');
  var avg = EB.getAvgRating(lib, emoteId);
  assert(Math.abs(avg - (5+4+3)/3) < 0.001, 'average rating is correct (4.0)');

  // 3. Many uses — cross royalty threshold twice
  var RATE = EB.ROYALTY_RATE;
  for (var i = 0; i < RATE * 2; i++) EB.useEmote(lib, emoteId, user1);
  assertEqual(EB.getUsageCount(lib, emoteId), RATE * 2, 'usage count = RATE * 2');
  assertEqual(EB.getEmoteRoyalties(lib, emoteId), 2, 'two royalty payments made');

  // 4. Featured refresh
  EB.refreshFeatured(lib, 77);
  var featuredList = EB.getFeatured(lib);
  var inFeatured = false;
  for (var j = 0; j < featuredList.length; j++) {
    if (featuredList[j].id === emoteId) { inFeatured = true; break; }
  }
  // High-rated, high-use emote should appear in featured
  assert(inFeatured, 'high-rated high-use emote appears in featured');

  // 5. Search finds it
  var found = EB.searchEmotes(lib, { query: 'Lifecycle' });
  assert(found.length >= 1, 'search finds emote by name query');
  assertEqual(found[0].id, emoteId, 'search result is correct emote');

  // 6. Creator profile reflects activity
  var profile = EB.getCreatorProfile(lib, creator);
  assertEqual(profile.emoteCount, 1, 'creator has 1 emote');
  assertEqual(profile.totalUses, RATE * 2, 'creator total uses correct');
  assertEqual(profile.totalRoyalties, 2, 'creator total royalties is 2');

  // 7. Delete emote
  var del = EB.deleteEmote(lib, emoteId, creator);
  assert(del.ok, 'creator can delete own emote');
  assert(EB.getEmote(lib, emoteId) === null, 'emote no longer found after delete');

  // 8. Creator profile after delete
  var profileAfter = EB.getCreatorProfile(lib, creator);
  assertEqual(profileAfter.emoteCount, 0, 'creator profile updated after delete');

});

// ============================================================================
// SUITE 29: MULTIPLE EMOTES — LIBRARY SCALE
// ============================================================================

suite('Library scale — multiple emotes', function() {

  var lib = freshLib();
  var creator = uid();

  // Create 10 emotes across all categories
  var cats = EB.getCategories();
  var emoteIds = [];
  for (var i = 0; i < 10; i++) {
    var cat = cats[i % cats.length];
    var res = EB.createEmote(lib, creator, 'Scale Emote ' + i, cat, oneFrame());
    assert(res.ok, 'scale emote ' + i + ' created');
    emoteIds.push(res.emote.id);
  }
  assertEqual(lib.emotes.length, 10, '10 emotes in library');

  // All IDs are unique
  var seen = {};
  var allUnique = true;
  for (var j = 0; j < emoteIds.length; j++) {
    if (seen[emoteIds[j]]) { allUnique = false; break; }
    seen[emoteIds[j]] = true;
  }
  assert(allUnique, 'all 10 emote IDs are unique');

  // getCreatorEmotes returns all 10
  var myEmotes = EB.getCreatorEmotes(lib, creator);
  assertEqual(myEmotes.length, 10, 'getCreatorEmotes returns all 10 for creator');

  // Search returns all
  var all = EB.searchEmotes(lib, { query: 'Scale Emote' });
  assertEqual(all.length, 10, 'search returns all 10 scale emotes');

  // Delete all
  for (var k = 0; k < emoteIds.length; k++) {
    var d = EB.deleteEmote(lib, emoteIds[k], creator);
    assert(d.ok, 'delete scale emote ' + k);
  }
  assertEqual(lib.emotes.length, 0, 'all emotes deleted from library');

});

// ============================================================================
// FINAL REPORT
// ============================================================================

console.log('\n' + '='.repeat(60));
console.log('Emote Builder Test Results');
console.log('='.repeat(60));
console.log(passed + ' passed, ' + failed + ' failed');

if (failures.length > 0) {
  console.log('\nFailed tests:');
  for (var fi = 0; fi < failures.length; fi++) {
    console.log('  ' + failures[fi]);
  }
}

if (failed > 0) process.exit(1);
