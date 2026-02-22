// test_social_spaces.js — Comprehensive tests for the Social Spaces module
'use strict';

var SocialSpaces = require('../src/js/social_spaces');

// ─── Simple test harness (var only, ES5-compatible) ───────────────────────────

var passed = 0;
var failed = 0;
var failMessages = [];

function assert(condition, msg) {
  if (condition) {
    passed++;
    process.stdout.write('  PASS: ' + msg + '\n');
  } else {
    failed++;
    failMessages.push(msg);
    process.stdout.write('  FAIL: ' + msg + '\n');
  }
}

function assertEqual(a, b, msg) {
  var condition = a === b;
  if (!condition) {
    process.stdout.write('    Expected: ' + JSON.stringify(b) + ', Got: ' + JSON.stringify(a) + '\n');
  }
  assert(condition, msg);
}

function assertDeepEqual(a, b, msg) {
  var condition = JSON.stringify(a) === JSON.stringify(b);
  if (!condition) {
    process.stdout.write('    Expected: ' + JSON.stringify(b) + ', Got: ' + JSON.stringify(a) + '\n');
  }
  assert(condition, msg);
}

function suite(name) {
  process.stdout.write('\n--- ' + name + ' ---\n');
}

// ─── State factory: fresh state per test group ────────────────────────────────

function freshState() {
  return {
    gatherings: [],
    bulletins: [],
    gatheringHistory: {},
    hostStats: {}
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

var _uid = 0;
function uid(prefix) { return (prefix || 'player') + '_' + (++_uid); }

function makeGathering(state, overrides) {
  var opts = overrides || {};
  return SocialSpaces.createGathering(
    state,
    opts.hostId       || uid('host'),
    opts.type         || 'campfire',
    opts.zone         || 'wilds',
    opts.title        || 'Test Campfire',
    opts.description  || 'A test gathering',
    opts.startTick    !== undefined ? opts.startTick : 0,
    opts.duration     !== undefined ? opts.duration  : 120
  );
}

function makeBulletin(state, overrides) {
  var opts = overrides || {};
  return SocialSpaces.postBulletin(
    state,
    opts.playerId  || uid('author'),
    opts.zone      || 'nexus',
    opts.title     || 'Test Post',
    opts.content   || 'Some content here',
    opts.category  || 'announcement',
    opts.duration  !== undefined ? opts.duration : 1000
  );
}

// =============================================================================
// Suite 1: GATHERING_TYPES data structure
// =============================================================================
suite('GATHERING_TYPES — data structure');

(function() {
  var types = SocialSpaces.getGatheringTypes();

  assert(Array.isArray(types), 'getGatheringTypes returns an array');
  assertEqual(types.length, 8, 'There are exactly 8 gathering types');

  var requiredFields = ['id', 'name', 'description', 'maxAttendees',
    'sparkPerAttendee', 'attendeeReward', 'minDuration', 'maxDuration',
    'allowedZones', 'category'];

  types.forEach(function(t) {
    requiredFields.forEach(function(field) {
      assert(t[field] !== undefined, 'Type "' + t.id + '" has field: ' + field);
    });
    assert(Array.isArray(t.allowedZones), 'Type "' + t.id + '" allowedZones is an array');
    assert(t.allowedZones.length > 0, 'Type "' + t.id + '" allowedZones is not empty');
    assert(t.maxAttendees > 0, 'Type "' + t.id + '" maxAttendees > 0');
    assert(t.sparkPerAttendee > 0, 'Type "' + t.id + '" sparkPerAttendee > 0');
    assert(t.attendeeReward > 0, 'Type "' + t.id + '" attendeeReward > 0');
    assert(t.minDuration > 0, 'Type "' + t.id + '" minDuration > 0');
    assert(t.maxDuration >= t.minDuration, 'Type "' + t.id + '" maxDuration >= minDuration');
  });

  var ids = types.map(function(t) { return t.id; });
  var expectedIds = ['campfire', 'concert', 'feast', 'lecture', 'town_hall', 'market_fair', 'tournament_viewing', 'festival'];
  expectedIds.forEach(function(expectedId) {
    assert(ids.indexOf(expectedId) !== -1, 'Gathering type "' + expectedId + '" exists');
  });
})();

// campfire specifics
(function() {
  var campfire = SocialSpaces.getGatheringTypes().filter(function(t) { return t.id === 'campfire'; })[0];
  assertEqual(campfire.maxAttendees, 12, 'campfire maxAttendees is 12');
  assertEqual(campfire.sparkPerAttendee, 5, 'campfire sparkPerAttendee is 5');
  assertEqual(campfire.attendeeReward, 3, 'campfire attendeeReward is 3');
  assertEqual(campfire.minDuration, 60, 'campfire minDuration is 60');
  assertEqual(campfire.maxDuration, 600, 'campfire maxDuration is 600');
  assertEqual(campfire.category, 'social', 'campfire category is social');
  assert(campfire.allowedZones.indexOf('wilds') !== -1, 'campfire allowed in wilds');
  assert(campfire.allowedZones.indexOf('gardens') !== -1, 'campfire allowed in gardens');
  assert(campfire.allowedZones.indexOf('commons') !== -1, 'campfire allowed in commons');
})();

// lecture only in athenaeum
(function() {
  var lecture = SocialSpaces.getGatheringTypes().filter(function(t) { return t.id === 'lecture'; })[0];
  assertEqual(lecture.allowedZones.length, 1, 'lecture only allowed in one zone');
  assertEqual(lecture.allowedZones[0], 'athenaeum', 'lecture only allowed in athenaeum');
  assertEqual(lecture.category, 'education', 'lecture category is education');
})();

// festival allowed in all 8 zones
(function() {
  var festival = SocialSpaces.getGatheringTypes().filter(function(t) { return t.id === 'festival'; })[0];
  assertEqual(festival.allowedZones.length, 8, 'festival allowed in all 8 zones');
})();

// =============================================================================
// Suite 2: createGathering
// =============================================================================
suite('createGathering — success cases');

(function() {
  var state = freshState();
  var result = makeGathering(state);
  assert(result.success, 'createGathering succeeds');
  assert(result.gathering !== undefined, 'result has gathering object');
  assert(typeof result.gathering.id === 'string', 'gathering has string id');
  assert(result.gathering.id.indexOf('gathering_') === 0, 'gathering id prefixed "gathering_"');
  assert(Array.isArray(result.gathering.attendees), 'gathering.attendees is array');
  assert(result.gathering.attendees.length === 1, 'host is automatically an attendee');
  assertEqual(result.gathering.status, 'active', 'gathering with tick 0 starts active');
  assertEqual(result.gathering.sparkEarned.host, 0, 'sparkEarned.host starts at 0');
  assert(Array.isArray(result.gathering.activities), 'gathering.activities is array');
  assertEqual(state.gatherings.length, 1, 'gathering added to state');
})();

(function() {
  var state = freshState();
  var host = uid('host');
  var result = SocialSpaces.createGathering(state, host, 'campfire', 'wilds', 'Evening Fire', 'A nice fire', 500, 120);
  assert(result.success, 'createGathering with future startTick succeeds');
  assertEqual(result.gathering.status, 'scheduled', 'future startTick makes gathering scheduled');
  assertEqual(result.gathering.startTick, 500, 'startTick stored correctly');
  assertEqual(result.gathering.endTick, 620, 'endTick = startTick + duration');
})();

(function() {
  // Title trimming
  var state = freshState();
  var result = SocialSpaces.createGathering(state, uid('host'), 'campfire', 'wilds', '  Padded Title  ', '', 0, 120);
  assert(result.success, 'createGathering trims title whitespace');
  assertEqual(result.gathering.title, 'Padded Title', 'title is trimmed');
})();

suite('createGathering — validation failures');

(function() {
  var state = freshState();
  var r = SocialSpaces.createGathering(state, '', 'campfire', 'wilds', 'Title', '', 0, 120);
  assert(!r.success, 'fails with empty hostId');

  var r2 = SocialSpaces.createGathering(state, uid('host'), 'campfire', 'wilds', '', '', 0, 120);
  assert(!r2.success, 'fails with empty title');

  var r3 = SocialSpaces.createGathering(state, uid('host'), 'unknown_type', 'wilds', 'Title', '', 0, 120);
  assert(!r3.success, 'fails with unknown type');
  assert(typeof r3.reason === 'string', 'failure has reason string');

  var r4 = SocialSpaces.createGathering(state, uid('host'), 'campfire', 'atlantis', 'Title', '', 0, 120);
  assert(!r4.success, 'fails with invalid zone');

  var r5 = SocialSpaces.createGathering(state, uid('host'), 'lecture', 'wilds', 'Title', '', 0, 120);
  assert(!r5.success, 'fails when zone not allowed for type (lecture in wilds)');

  var r6 = SocialSpaces.createGathering(state, uid('host'), 'campfire', 'wilds', 'Title', '', 0, 10);
  assert(!r6.success, 'fails when duration < minDuration');

  var r7 = SocialSpaces.createGathering(state, uid('host'), 'campfire', 'wilds', 'Title', '', 0, 99999);
  assert(!r7.success, 'fails when duration > maxDuration');
})();

// =============================================================================
// Suite 3: joinGathering
// =============================================================================
suite('joinGathering — success and failure cases');

(function() {
  var state = freshState();
  var host = uid('host');
  var player = uid('player');
  var result = makeGathering(state, { hostId: host });
  var gId = result.gathering.id;

  var joinResult = SocialSpaces.joinGathering(state, player, gId);
  assert(joinResult.success, 'joinGathering succeeds for new player');
  assertEqual(state.gatherings[0].attendees.length, 2, 'attendee count is 2 after join');
  assert(state.gatherings[0].attendees.indexOf(player) !== -1, 'player is in attendees list');
})();

(function() {
  // Double-join attempt
  var state = freshState();
  var player = uid('player');
  var result = makeGathering(state);
  var gId = result.gathering.id;
  SocialSpaces.joinGathering(state, player, gId);
  var second = SocialSpaces.joinGathering(state, player, gId);
  assert(!second.success, 'double-join fails');
  assert(typeof second.reason === 'string', 'double-join has reason');
})();

(function() {
  // Host self-join attempt
  var state = freshState();
  var host = uid('host');
  var result = makeGathering(state, { hostId: host });
  var gId = result.gathering.id;
  var selfJoin = SocialSpaces.joinGathering(state, host, gId);
  assert(!selfJoin.success, 'host cannot join own gathering (already a member)');
})();

(function() {
  // Join non-existent gathering
  var state = freshState();
  var r = SocialSpaces.joinGathering(state, uid('player'), 'gathering_nonexistent');
  assert(!r.success, 'joining non-existent gathering fails');
})();

(function() {
  // Gathering is full
  var state = freshState();
  var host = uid('host');
  // Create a campfire (maxAttendees: 12)
  var result = makeGathering(state, { hostId: host });
  var gId = result.gathering.id;

  // Fill it up (host already in, need 11 more)
  for (var i = 0; i < 11; i++) {
    SocialSpaces.joinGathering(state, uid('filler'), gId);
  }
  assertEqual(state.gatherings[0].attendees.length, 12, 'gathering is full at 12');

  var overflow = SocialSpaces.joinGathering(state, uid('overflow'), gId);
  assert(!overflow.success, 'joining full gathering fails');
  assert(overflow.reason.indexOf('full') !== -1, 'reason mentions full');
})();

(function() {
  // Cannot join completed gathering
  var state = freshState();
  var result = makeGathering(state);
  var gId = result.gathering.id;
  SocialSpaces.endGathering(state, gId, 200);
  var r = SocialSpaces.joinGathering(state, uid('player'), gId);
  assert(!r.success, 'cannot join completed gathering');
})();

(function() {
  // Cannot join cancelled gathering
  var state = freshState();
  var host = uid('host');
  var result = makeGathering(state, { hostId: host });
  var gId = result.gathering.id;
  SocialSpaces.cancelGathering(state, host, gId);
  var r = SocialSpaces.joinGathering(state, uid('player'), gId);
  assert(!r.success, 'cannot join cancelled gathering');
})();

// =============================================================================
// Suite 4: leaveGathering
// =============================================================================
suite('leaveGathering — remove player from gathering');

(function() {
  var state = freshState();
  var player = uid('player');
  var result = makeGathering(state);
  var gId = result.gathering.id;
  SocialSpaces.joinGathering(state, player, gId);
  var leaveResult = SocialSpaces.leaveGathering(state, player, gId);
  assert(leaveResult.success, 'leaveGathering succeeds');
  assert(state.gatherings[0].attendees.indexOf(player) === -1, 'player removed from attendees');
})();

(function() {
  // Leave non-existent gathering
  var state = freshState();
  var r = SocialSpaces.leaveGathering(state, uid('player'), 'gathering_nonexistent');
  assert(!r.success, 'leaving non-existent gathering fails');
})();

(function() {
  // Leave gathering not attending
  var state = freshState();
  var result = makeGathering(state);
  var gId = result.gathering.id;
  var r = SocialSpaces.leaveGathering(state, uid('stranger'), gId);
  assert(!r.success, 'cannot leave gathering you did not join');
})();

// =============================================================================
// Suite 5: startGathering
// =============================================================================
suite('startGathering — transition scheduled to active');

(function() {
  var state = freshState();
  var result = makeGathering(state, { startTick: 500, duration: 200 });
  var gId = result.gathering.id;
  assertEqual(result.gathering.status, 'scheduled', 'gathering starts scheduled');

  var startResult = SocialSpaces.startGathering(state, gId, 510);
  assert(startResult.success, 'startGathering succeeds');
  assertEqual(state.gatherings[0].status, 'active', 'status transitions to active');
})();

(function() {
  // Cannot start an already-active gathering
  var state = freshState();
  var result = makeGathering(state, { startTick: 0, duration: 120 });
  var gId = result.gathering.id;
  var r = SocialSpaces.startGathering(state, gId, 10);
  assert(!r.success, 'cannot start an active gathering');
})();

(function() {
  // Non-existent gathering
  var state = freshState();
  var r = SocialSpaces.startGathering(state, 'gathering_nonexistent', 10);
  assert(!r.success, 'startGathering fails for non-existent gathering');
})();

// =============================================================================
// Suite 6: endGathering — reward distribution
// =============================================================================
suite('endGathering — Spark reward distribution');

(function() {
  // Empty gathering (host only)
  var state = freshState();
  var host = uid('host');
  var result = makeGathering(state, { hostId: host });
  var gId = result.gathering.id;
  var endResult = SocialSpaces.endGathering(state, gId, 200);
  assert(endResult.success, 'endGathering succeeds with host-only gathering');
  assertEqual(endResult.rewards.hostReward, 0, 'host earns 0 with no attendees');
  assertDeepEqual(endResult.rewards.attendeeRewards, {}, 'attendeeRewards is empty object');
  assertEqual(state.gatherings[0].status, 'completed', 'gathering marked completed');
})();

(function() {
  // One attendee
  var state = freshState();
  var host = uid('host');
  var attendee = uid('attendee');
  var result = makeGathering(state, { hostId: host, type: 'campfire' }); // sparkPerAttendee: 5, attendeeReward: 3
  var gId = result.gathering.id;
  SocialSpaces.joinGathering(state, attendee, gId);
  var endResult = SocialSpaces.endGathering(state, gId, 200);
  assert(endResult.success, 'endGathering succeeds with one attendee');
  assertEqual(endResult.rewards.hostReward, 5, 'host earns 5 spark (1 attendee * sparkPerAttendee=5)');
  assertEqual(endResult.rewards.attendeeRewards[attendee], 3, 'attendee earns 3 spark');
})();

(function() {
  // Three attendees — host reward scales
  var state = freshState();
  var host = uid('host');
  var a1 = uid('a');
  var a2 = uid('a');
  var a3 = uid('a');
  var result = makeGathering(state, { hostId: host, type: 'campfire' }); // sparkPerAttendee: 5
  var gId = result.gathering.id;
  SocialSpaces.joinGathering(state, a1, gId);
  SocialSpaces.joinGathering(state, a2, gId);
  SocialSpaces.joinGathering(state, a3, gId);
  var endResult = SocialSpaces.endGathering(state, gId, 200);
  assertEqual(endResult.rewards.hostReward, 15, 'host earns 15 (3 attendees * 5)');
  assertEqual(endResult.rewards.attendeeRewards[a1], 3, 'a1 earns 3');
  assertEqual(endResult.rewards.attendeeRewards[a2], 3, 'a2 earns 3');
  assertEqual(endResult.rewards.attendeeRewards[a3], 3, 'a3 earns 3');
})();

(function() {
  // Lecture type (sparkPerAttendee: 8, attendeeReward: 5)
  var state = freshState();
  var host = uid('host');
  var a1 = uid('a');
  var a2 = uid('a');
  var result = SocialSpaces.createGathering(state, host, 'lecture', 'athenaeum', 'Philosophy 101', '', 0, 120);
  var gId = result.gathering.id;
  SocialSpaces.joinGathering(state, a1, gId);
  SocialSpaces.joinGathering(state, a2, gId);
  var endResult = SocialSpaces.endGathering(state, gId, 200);
  assertEqual(endResult.rewards.hostReward, 16, 'lecture host earns 16 (2 attendees * 8)');
  assertEqual(endResult.rewards.attendeeRewards[a1], 5, 'lecture attendee earns 5');
})();

(function() {
  // Cannot end a cancelled gathering
  var state = freshState();
  var host = uid('host');
  var result = makeGathering(state, { hostId: host });
  var gId = result.gathering.id;
  SocialSpaces.cancelGathering(state, host, gId);
  var r = SocialSpaces.endGathering(state, gId, 200);
  assert(!r.success, 'cannot end a cancelled gathering');
})();

(function() {
  // Cannot end already-completed gathering
  var state = freshState();
  var result = makeGathering(state);
  var gId = result.gathering.id;
  SocialSpaces.endGathering(state, gId, 200);
  var r = SocialSpaces.endGathering(state, gId, 300);
  assert(!r.success, 'cannot end already-completed gathering');
})();

// =============================================================================
// Suite 7: cancelGathering
// =============================================================================
suite('cancelGathering — host-only cancellation');

(function() {
  var state = freshState();
  var host = uid('host');
  var result = makeGathering(state, { hostId: host });
  var gId = result.gathering.id;
  var cancelResult = SocialSpaces.cancelGathering(state, host, gId);
  assert(cancelResult.success, 'cancelGathering succeeds for host');
  assertEqual(state.gatherings[0].status, 'cancelled', 'gathering status is cancelled');
})();

(function() {
  // Non-host cannot cancel
  var state = freshState();
  var host = uid('host');
  var other = uid('other');
  var result = makeGathering(state, { hostId: host });
  var gId = result.gathering.id;
  var r = SocialSpaces.cancelGathering(state, other, gId);
  assert(!r.success, 'non-host cannot cancel gathering');
  assert(r.reason.indexOf('host') !== -1, 'reason mentions host');
})();

(function() {
  // Cannot cancel completed gathering
  var state = freshState();
  var host = uid('host');
  var result = makeGathering(state, { hostId: host });
  var gId = result.gathering.id;
  SocialSpaces.endGathering(state, gId, 200);
  var r = SocialSpaces.cancelGathering(state, host, gId);
  assert(!r.success, 'cannot cancel completed gathering');
})();

(function() {
  // Cannot cancel already-cancelled
  var state = freshState();
  var host = uid('host');
  var result = makeGathering(state, { hostId: host });
  var gId = result.gathering.id;
  SocialSpaces.cancelGathering(state, host, gId);
  var r = SocialSpaces.cancelGathering(state, host, gId);
  assert(!r.success, 'cannot cancel an already-cancelled gathering');
})();

(function() {
  // Non-existent gathering
  var state = freshState();
  var r = SocialSpaces.cancelGathering(state, uid('host'), 'gathering_nonexistent');
  assert(!r.success, 'cancel non-existent gathering fails');
})();

// =============================================================================
// Suite 8: getActiveGatherings / getScheduledGatherings
// =============================================================================
suite('getActiveGatherings and getScheduledGatherings — zone filtering');

(function() {
  var state = freshState();
  makeGathering(state, { zone: 'wilds', startTick: 0 });
  makeGathering(state, { zone: 'wilds', startTick: 0 });
  makeGathering(state, { zone: 'commons', startTick: 0 });

  var all = SocialSpaces.getActiveGatherings(state, null);
  assertEqual(all.length, 3, 'getActiveGatherings returns all active gatherings with null zone');

  var wilds = SocialSpaces.getActiveGatherings(state, 'wilds');
  assertEqual(wilds.length, 2, 'getActiveGatherings filters by zone wilds');

  var commons = SocialSpaces.getActiveGatherings(state, 'commons');
  assertEqual(commons.length, 1, 'getActiveGatherings filters by zone commons');

  var arena = SocialSpaces.getActiveGatherings(state, 'arena');
  assertEqual(arena.length, 0, 'getActiveGatherings returns empty for zone with no gatherings');
})();

(function() {
  var state = freshState();
  makeGathering(state, { startTick: 500 }); // scheduled
  makeGathering(state, { startTick: 600 }); // scheduled
  makeGathering(state, { startTick: 0 });   // active

  var scheduled = SocialSpaces.getScheduledGatherings(state, null);
  assertEqual(scheduled.length, 2, 'getScheduledGatherings returns only scheduled');

  var active = SocialSpaces.getActiveGatherings(state, null);
  assertEqual(active.length, 1, 'getActiveGatherings returns only active');
})();

(function() {
  // Completed gatherings are excluded
  var state = freshState();
  var result = makeGathering(state);
  SocialSpaces.endGathering(state, result.gathering.id, 200);
  var active = SocialSpaces.getActiveGatherings(state, null);
  assertEqual(active.length, 0, 'completed gatherings not in active list');
})();

// =============================================================================
// Suite 9: getGatheringById
// =============================================================================
suite('getGatheringById');

(function() {
  var state = freshState();
  var result = makeGathering(state, { title: 'Unique Gathering' });
  var gId = result.gathering.id;
  var found = SocialSpaces.getGatheringById(state, gId);
  assert(found !== null, 'getGatheringById finds existing gathering');
  assertEqual(found.title, 'Unique Gathering', 'getGatheringById returns correct gathering');

  var notFound = SocialSpaces.getGatheringById(state, 'gathering_nonexistent');
  assert(notFound === null, 'getGatheringById returns null for missing gathering');
})();

// =============================================================================
// Suite 10: addActivity
// =============================================================================
suite('addActivity — logging activities during gatherings');

(function() {
  var state = freshState();
  var host = uid('host');
  var result = makeGathering(state, { hostId: host });
  var gId = result.gathering.id;

  var actResult = SocialSpaces.addActivity(state, gId, host, 'tell_story', { title: 'The Lost City' });
  assert(actResult.success, 'addActivity succeeds for valid activity');
  assert(actResult.activity !== undefined, 'addActivity returns activity object');
  assertEqual(actResult.activity.activityType, 'tell_story', 'activity type stored correctly');
  assertEqual(state.gatherings[0].activities.length, 1, 'activity added to gathering');
})();

(function() {
  // All valid activity types
  var state = freshState();
  var host = uid('host');
  var result = makeGathering(state, { hostId: host });
  var gId = result.gathering.id;
  var validTypes = ['tell_story', 'play_music', 'share_meal', 'teach', 'toast'];
  validTypes.forEach(function(t) {
    var r = SocialSpaces.addActivity(state, gId, host, t, {});
    assert(r.success, 'activity type "' + t + '" is valid');
  });
})();

(function() {
  // Invalid activity type
  var state = freshState();
  var host = uid('host');
  var result = makeGathering(state, { hostId: host });
  var gId = result.gathering.id;
  var r = SocialSpaces.addActivity(state, gId, host, 'juggle', {});
  assert(!r.success, 'invalid activity type fails');
})();

(function() {
  // Non-attendee cannot add activity
  var state = freshState();
  var result = makeGathering(state);
  var gId = result.gathering.id;
  var r = SocialSpaces.addActivity(state, gId, uid('outsider'), 'tell_story', {});
  assert(!r.success, 'non-attendee cannot add activity');
})();

(function() {
  // Cannot add activity to non-active gathering
  var state = freshState();
  var host = uid('host');
  var result = makeGathering(state, { hostId: host });
  var gId = result.gathering.id;
  SocialSpaces.endGathering(state, gId, 200);
  var r = SocialSpaces.addActivity(state, gId, host, 'toast', {});
  assert(!r.success, 'cannot add activity to completed gathering');
})();

(function() {
  // Non-existent gathering
  var state = freshState();
  var r = SocialSpaces.addActivity(state, 'gathering_nonexistent', uid('player'), 'toast', {});
  assert(!r.success, 'addActivity fails for non-existent gathering');
})();

// =============================================================================
// Suite 11: getGatheringHistory
// =============================================================================
suite('getGatheringHistory — player attendance tracking');

(function() {
  var state = freshState();
  var host = uid('host');
  var a1 = uid('attendee');

  var result = makeGathering(state, { hostId: host });
  var gId = result.gathering.id;
  SocialSpaces.joinGathering(state, a1, gId);
  SocialSpaces.endGathering(state, gId, 200);

  var hostHistory = SocialSpaces.getGatheringHistory(state, host);
  assertEqual(hostHistory.length, 1, 'host has 1 gathering in history');
  assertEqual(hostHistory[0].role, 'host', 'host role recorded correctly');
  assertEqual(hostHistory[0].gatheringId, gId, 'correct gatheringId in history');

  var a1History = SocialSpaces.getGatheringHistory(state, a1);
  assertEqual(a1History.length, 1, 'attendee has 1 gathering in history');
  assertEqual(a1History[0].role, 'attendee', 'attendee role recorded correctly');
})();

(function() {
  // Empty history for new player
  var state = freshState();
  var history = SocialSpaces.getGatheringHistory(state, uid('newcomer'));
  assertDeepEqual(history, [], 'new player has empty history');
})();

(function() {
  // Multiple gatherings accumulate history
  var state = freshState();
  var player = uid('player');

  var r1 = makeGathering(state, { hostId: player });
  SocialSpaces.endGathering(state, r1.gathering.id, 100);

  var r2 = makeGathering(state, { zone: 'wilds' });
  SocialSpaces.joinGathering(state, player, r2.gathering.id);
  SocialSpaces.endGathering(state, r2.gathering.id, 200);

  var history = SocialSpaces.getGatheringHistory(state, player);
  assertEqual(history.length, 2, 'history has 2 entries after 2 gatherings');
})();

// =============================================================================
// Suite 12: getHostStats
// =============================================================================
suite('getHostStats — accumulates hosting statistics');

(function() {
  // Fresh player has zero stats
  var state = freshState();
  var stats = SocialSpaces.getHostStats(state, uid('newcomer'));
  assertEqual(stats.eventsHosted, 0, 'new host: eventsHosted is 0');
  assertEqual(stats.totalAttendees, 0, 'new host: totalAttendees is 0');
  assertEqual(stats.sparkEarned, 0, 'new host: sparkEarned is 0');
})();

(function() {
  var state = freshState();
  var host = uid('host');
  var a1 = uid('a');
  var a2 = uid('a');

  var r1 = makeGathering(state, { hostId: host, type: 'campfire' });
  SocialSpaces.joinGathering(state, a1, r1.gathering.id);
  SocialSpaces.joinGathering(state, a2, r1.gathering.id);
  SocialSpaces.endGathering(state, r1.gathering.id, 200);

  var stats = SocialSpaces.getHostStats(state, host);
  assertEqual(stats.eventsHosted, 1, 'eventsHosted increments to 1');
  assertEqual(stats.totalAttendees, 2, 'totalAttendees is 2');
  assertEqual(stats.sparkEarned, 10, 'sparkEarned is 10 (2 attendees * sparkPerAttendee=5)');
})();

(function() {
  // Stats accumulate across multiple events
  var state = freshState();
  var host = uid('host');

  var r1 = makeGathering(state, { hostId: host, type: 'campfire' });
  var a1 = uid('a');
  SocialSpaces.joinGathering(state, a1, r1.gathering.id);
  SocialSpaces.endGathering(state, r1.gathering.id, 100);

  var r2 = makeGathering(state, { hostId: host, type: 'campfire' });
  var a2 = uid('a');
  var a3 = uid('a');
  SocialSpaces.joinGathering(state, a2, r2.gathering.id);
  SocialSpaces.joinGathering(state, a3, r2.gathering.id);
  SocialSpaces.endGathering(state, r2.gathering.id, 200);

  var stats = SocialSpaces.getHostStats(state, host);
  assertEqual(stats.eventsHosted, 2, 'eventsHosted is 2 after 2 events');
  assertEqual(stats.totalAttendees, 3, 'totalAttendees is 3 (1+2)');
  assertEqual(stats.sparkEarned, 15, 'sparkEarned is 15 (5 + 10)');
})();

// =============================================================================
// Suite 13: postBulletin
// =============================================================================
suite('postBulletin — create bulletin board posts');

(function() {
  var state = freshState();
  var result = makeBulletin(state);
  assert(result.success, 'postBulletin succeeds');
  assert(result.post !== undefined, 'result has post object');
  assert(typeof result.post.id === 'string', 'post has string id');
  assert(result.post.id.indexOf('post_') === 0, 'post id prefixed "post_"');
  assertEqual(result.post.pinned, false, 'post starts unpinned');
  assertEqual(result.post.likes, 0, 'post starts with 0 likes');
  assertDeepEqual(result.post.replies, [], 'post starts with empty replies');
  assertDeepEqual(result.post.likedBy, [], 'post starts with empty likedBy');
  assertEqual(state.bulletins.length, 1, 'bulletin added to state');
})();

(function() {
  // Validation failures
  var state = freshState();

  var r1 = SocialSpaces.postBulletin(state, '', 'nexus', 'Title', 'Content', 'lfg', 1000);
  assert(!r1.success, 'fails with empty playerId');

  var r2 = SocialSpaces.postBulletin(state, uid('p'), 'nexus', '', 'Content', 'lfg', 1000);
  assert(!r2.success, 'fails with empty title');

  var r3 = SocialSpaces.postBulletin(state, uid('p'), 'nexus', 'Title', '', 'lfg', 1000);
  assert(!r3.success, 'fails with empty content');

  var r4 = SocialSpaces.postBulletin(state, uid('p'), 'atlantis', 'Title', 'Content', 'lfg', 1000);
  assert(!r4.success, 'fails with invalid zone');

  var r5 = SocialSpaces.postBulletin(state, uid('p'), 'nexus', 'Title', 'Content', 'gossip', 1000);
  assert(!r5.success, 'fails with invalid category');
})();

(function() {
  // All valid categories
  var state = freshState();
  var categories = ['lfg', 'announcement', 'trade', 'event', 'lore', 'art'];
  categories.forEach(function(cat) {
    var r = SocialSpaces.postBulletin(state, uid('p'), 'nexus', 'Title', 'Content', cat, 1000);
    assert(r.success, 'category "' + cat + '" is valid');
  });
})();

// =============================================================================
// Suite 14: getBulletins — zone and category filtering
// =============================================================================
suite('getBulletins — filtering and ordering');

(function() {
  var state = freshState();
  makeBulletin(state, { zone: 'nexus', category: 'lfg' });
  makeBulletin(state, { zone: 'nexus', category: 'announcement' });
  makeBulletin(state, { zone: 'agora', category: 'trade' });

  var nexus = SocialSpaces.getBulletins(state, 'nexus', null);
  assertEqual(nexus.length, 2, 'getBulletins returns 2 nexus posts');

  var agora = SocialSpaces.getBulletins(state, 'agora', null);
  assertEqual(agora.length, 1, 'getBulletins returns 1 agora post');

  var lfg = SocialSpaces.getBulletins(state, 'nexus', 'lfg');
  assertEqual(lfg.length, 1, 'getBulletins filters by category lfg');

  var trade = SocialSpaces.getBulletins(state, null, 'trade');
  assertEqual(trade.length, 1, 'getBulletins filters by trade with no zone filter');

  var all = SocialSpaces.getBulletins(state, null, null);
  assertEqual(all.length, 3, 'getBulletins returns all when zone and category are null');
})();

(function() {
  // Pinned posts appear first
  var state = freshState();
  var r1 = makeBulletin(state, { zone: 'nexus', category: 'lfg' });
  var r2 = makeBulletin(state, { zone: 'nexus', category: 'announcement' });
  SocialSpaces.pinBulletin(state, r2.post.id); // pin second post

  var bulletins = SocialSpaces.getBulletins(state, 'nexus', null);
  assertEqual(bulletins[0].id, r2.post.id, 'pinned post appears first');
})();

// =============================================================================
// Suite 15: replyToBulletin
// =============================================================================
suite('replyToBulletin — reply system');

(function() {
  var state = freshState();
  var result = makeBulletin(state);
  var postId = result.post.id;
  var player = uid('player');

  var replyResult = SocialSpaces.replyToBulletin(state, player, postId, 'Great idea!');
  assert(replyResult.success, 'replyToBulletin succeeds');
  assert(replyResult.reply !== undefined, 'result has reply object');
  assertEqual(replyResult.reply.authorId, player, 'reply authorId is correct');
  assertEqual(replyResult.reply.content, 'Great idea!', 'reply content stored');
  assertEqual(state.bulletins[0].replies.length, 1, 'reply added to post');
})();

(function() {
  // Multiple replies
  var state = freshState();
  var result = makeBulletin(state);
  var postId = result.post.id;
  SocialSpaces.replyToBulletin(state, uid('p'), postId, 'Reply 1');
  SocialSpaces.replyToBulletin(state, uid('p'), postId, 'Reply 2');
  SocialSpaces.replyToBulletin(state, uid('p'), postId, 'Reply 3');
  assertEqual(state.bulletins[0].replies.length, 3, 'three replies added');
})();

(function() {
  // Failures
  var state = freshState();
  var result = makeBulletin(state);
  var postId = result.post.id;

  var r1 = SocialSpaces.replyToBulletin(state, uid('p'), postId, '');
  assert(!r1.success, 'fails with empty content');

  var r2 = SocialSpaces.replyToBulletin(state, uid('p'), 'post_nonexistent', 'Content');
  assert(!r2.success, 'fails for non-existent post');
})();

// =============================================================================
// Suite 16: likeBulletin — one like per player
// =============================================================================
suite('likeBulletin — one like per player');

(function() {
  var state = freshState();
  var result = makeBulletin(state);
  var postId = result.post.id;
  var player = uid('player');

  var likeResult = SocialSpaces.likeBulletin(state, player, postId);
  assert(likeResult.success, 'likeBulletin succeeds');
  assertEqual(state.bulletins[0].likes, 1, 'likes incremented to 1');
  assert(state.bulletins[0].likedBy.indexOf(player) !== -1, 'player added to likedBy');
})();

(function() {
  // Double-like fails
  var state = freshState();
  var result = makeBulletin(state);
  var postId = result.post.id;
  var player = uid('player');
  SocialSpaces.likeBulletin(state, player, postId);
  var second = SocialSpaces.likeBulletin(state, player, postId);
  assert(!second.success, 'double-like fails');
  assertEqual(state.bulletins[0].likes, 1, 'likes stays at 1 after double-like attempt');
})();

(function() {
  // Multiple different players can like
  var state = freshState();
  var result = makeBulletin(state);
  var postId = result.post.id;
  SocialSpaces.likeBulletin(state, uid('p'), postId);
  SocialSpaces.likeBulletin(state, uid('p'), postId);
  SocialSpaces.likeBulletin(state, uid('p'), postId);
  assertEqual(state.bulletins[0].likes, 3, 'three different players can each like once');
})();

(function() {
  // Like non-existent post
  var state = freshState();
  var r = SocialSpaces.likeBulletin(state, uid('player'), 'post_nonexistent');
  assert(!r.success, 'liking non-existent post fails');
})();

// =============================================================================
// Suite 17: deleteBulletin
// =============================================================================
suite('deleteBulletin — author-only deletion');

(function() {
  var state = freshState();
  var author = uid('author');
  var result = SocialSpaces.postBulletin(state, author, 'nexus', 'My Post', 'Content', 'lfg', 1000);
  var postId = result.post.id;

  var deleteResult = SocialSpaces.deleteBulletin(state, author, postId);
  assert(deleteResult.success, 'deleteBulletin succeeds for author');
  assertEqual(state.bulletins.length, 0, 'post removed from state');
})();

(function() {
  // Non-author cannot delete
  var state = freshState();
  var author = uid('author');
  var other = uid('other');
  var result = SocialSpaces.postBulletin(state, author, 'nexus', 'My Post', 'Content', 'lfg', 1000);
  var postId = result.post.id;

  var r = SocialSpaces.deleteBulletin(state, other, postId);
  assert(!r.success, 'non-author cannot delete post');
  assertEqual(state.bulletins.length, 1, 'post still present after failed deletion');
})();

(function() {
  // Delete non-existent post
  var state = freshState();
  var r = SocialSpaces.deleteBulletin(state, uid('player'), 'post_nonexistent');
  assert(!r.success, 'deleting non-existent post fails');
})();

// =============================================================================
// Suite 18: pinBulletin
// =============================================================================
suite('pinBulletin — pin post to top');

(function() {
  var state = freshState();
  var result = makeBulletin(state);
  var postId = result.post.id;

  var pinResult = SocialSpaces.pinBulletin(state, postId);
  assert(pinResult.success, 'pinBulletin succeeds');
  assertEqual(state.bulletins[0].pinned, true, 'post is pinned');
})();

(function() {
  // Pin non-existent post
  var state = freshState();
  var r = SocialSpaces.pinBulletin(state, 'post_nonexistent');
  assert(!r.success, 'pinning non-existent post fails');
})();

// =============================================================================
// Suite 19: getPopularBulletins
// =============================================================================
suite('getPopularBulletins — sorted by likes');

(function() {
  var state = freshState();
  var r1 = makeBulletin(state, { zone: 'nexus' });
  var r2 = makeBulletin(state, { zone: 'nexus' });
  var r3 = makeBulletin(state, { zone: 'nexus' });

  // r2 gets 3 likes, r3 gets 1 like, r1 gets 0
  SocialSpaces.likeBulletin(state, uid('p'), r2.post.id);
  SocialSpaces.likeBulletin(state, uid('p'), r2.post.id);
  SocialSpaces.likeBulletin(state, uid('p'), r2.post.id);
  SocialSpaces.likeBulletin(state, uid('p'), r3.post.id);

  var popular = SocialSpaces.getPopularBulletins(state, 'nexus', 10);
  assertEqual(popular.length, 3, 'getPopularBulletins returns all 3 posts');
  assertEqual(popular[0].id, r2.post.id, 'most-liked post is first');
  assertEqual(popular[1].id, r3.post.id, 'second-most-liked is second');
  assertEqual(popular[2].id, r1.post.id, 'least-liked is last');
})();

(function() {
  // Count limit
  var state = freshState();
  for (var i = 0; i < 5; i++) {
    makeBulletin(state, { zone: 'nexus' });
  }
  var top3 = SocialSpaces.getPopularBulletins(state, 'nexus', 3);
  assertEqual(top3.length, 3, 'getPopularBulletins respects count limit');
})();

(function() {
  // Zone filtering
  var state = freshState();
  makeBulletin(state, { zone: 'nexus' });
  makeBulletin(state, { zone: 'nexus' });
  makeBulletin(state, { zone: 'agora' });

  var nexusPopular = SocialSpaces.getPopularBulletins(state, 'nexus', 10);
  assertEqual(nexusPopular.length, 2, 'getPopularBulletins filters by zone');
})();

// =============================================================================
// Suite 20: cleanExpiredBulletins
// =============================================================================
suite('cleanExpiredBulletins — remove expired posts');

(function() {
  var state = freshState();
  // Create posts with postedAt=0, expiresAt=0+duration
  var r1 = makeBulletin(state, { duration: 100 });  // expires at tick 100
  var r2 = makeBulletin(state, { duration: 500 });  // expires at tick 500
  var r3 = makeBulletin(state, { duration: 1000 }); // expires at tick 1000

  assertEqual(state.bulletins.length, 3, 'starting with 3 bulletins');

  var result = SocialSpaces.cleanExpiredBulletins(state, 200);
  assertEqual(result.removed, 1, 'cleanExpiredBulletins removed 1 post');
  assertEqual(state.bulletins.length, 2, '2 bulletins remain after cleaning at tick 200');
})();

(function() {
  var state = freshState();
  makeBulletin(state, { duration: 100 });
  makeBulletin(state, { duration: 200 });
  makeBulletin(state, { duration: 300 });

  var result = SocialSpaces.cleanExpiredBulletins(state, 1000);
  assertEqual(result.removed, 3, 'all 3 posts removed at tick 1000');
  assertEqual(state.bulletins.length, 0, 'no bulletins remain');
})();

(function() {
  // No expired posts
  var state = freshState();
  makeBulletin(state, { duration: 1000 });
  makeBulletin(state, { duration: 2000 });

  var result = SocialSpaces.cleanExpiredBulletins(state, 50);
  assertEqual(result.removed, 0, 'no posts removed when none expired');
  assertEqual(state.bulletins.length, 2, 'both bulletins remain');
})();

(function() {
  // Invalid currentTick
  var state = freshState();
  makeBulletin(state, { duration: 100 });
  var result = SocialSpaces.cleanExpiredBulletins(state, 'not_a_tick');
  assertEqual(result.removed, 0, 'no removal with invalid tick');
  assertEqual(state.bulletins.length, 1, 'post still present');
})();

// =============================================================================
// Suite 21: VALID_ZONES and VALID_BULLETIN_CATEGORIES exports
// =============================================================================
suite('Exported constants');

(function() {
  var zones = SocialSpaces.VALID_ZONES;
  assert(Array.isArray(zones), 'VALID_ZONES is exported as an array');
  assertEqual(zones.length, 8, 'VALID_ZONES has 8 zones');
  var expected = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];
  expected.forEach(function(z) {
    assert(zones.indexOf(z) !== -1, 'VALID_ZONES includes "' + z + '"');
  });
})();

(function() {
  var cats = SocialSpaces.VALID_BULLETIN_CATEGORIES;
  assert(Array.isArray(cats), 'VALID_BULLETIN_CATEGORIES is exported as an array');
  var expected = ['lfg', 'announcement', 'trade', 'event', 'lore', 'art'];
  expected.forEach(function(cat) {
    assert(cats.indexOf(cat) !== -1, 'VALID_BULLETIN_CATEGORIES includes "' + cat + '"');
  });
})();

(function() {
  var acts = SocialSpaces.VALID_ACTIVITIES;
  assert(Array.isArray(acts), 'VALID_ACTIVITIES is exported as an array');
  var expected = ['tell_story', 'play_music', 'share_meal', 'teach', 'toast'];
  expected.forEach(function(a) {
    assert(acts.indexOf(a) !== -1, 'VALID_ACTIVITIES includes "' + a + '"');
  });
})();

// =============================================================================
// Suite 22: Edge cases and robustness
// =============================================================================
suite('Edge cases and robustness');

(function() {
  // null state initialised gracefully
  var state = {};
  var result = SocialSpaces.createGathering(state, uid('host'), 'campfire', 'wilds', 'Test', '', 0, 120);
  assert(result.success, 'createGathering initialises missing state collections');
  assert(Array.isArray(state.gatherings), 'state.gatherings created');
  assert(Array.isArray(state.bulletins), 'state.bulletins created');
})();

(function() {
  // Multiple gatherings in same zone — each gets own id
  var state = freshState();
  var r1 = makeGathering(state, { zone: 'commons' });
  var r2 = makeGathering(state, { zone: 'commons' });
  assert(r1.gathering.id !== r2.gathering.id, 'each gathering gets unique id');
})();

(function() {
  // Multiple bulletin posts get unique ids
  var state = freshState();
  var r1 = makeBulletin(state);
  var r2 = makeBulletin(state);
  assert(r1.post.id !== r2.post.id, 'each bulletin post gets unique id');
})();

(function() {
  // getGatheringHistory with null playerId returns []
  var state = freshState();
  var history = SocialSpaces.getGatheringHistory(state, null);
  assertDeepEqual(history, [], 'getGatheringHistory(null) returns empty array');
})();

(function() {
  // getHostStats with null playerId returns zeros
  var state = freshState();
  var stats = SocialSpaces.getHostStats(state, null);
  assertEqual(stats.eventsHosted, 0, 'getHostStats(null) eventsHosted is 0');
})();

(function() {
  // sparkEarned in gathering object reflects endGathering results
  var state = freshState();
  var host = uid('host');
  var a1 = uid('a');
  var a2 = uid('a');
  var result = makeGathering(state, { hostId: host, type: 'campfire' });
  var gId = result.gathering.id;
  SocialSpaces.joinGathering(state, a1, gId);
  SocialSpaces.joinGathering(state, a2, gId);
  SocialSpaces.endGathering(state, gId, 200);
  var g = SocialSpaces.getGatheringById(state, gId);
  assertEqual(g.sparkEarned.host, 10, 'sparkEarned.host = 10 (2 attendees * 5)');
  assertEqual(g.sparkEarned.attendees[a1], 3, 'sparkEarned.attendees[a1] = 3');
  assertEqual(g.sparkEarned.attendees[a2], 3, 'sparkEarned.attendees[a2] = 3');
})();

(function() {
  // Concert in studio zone
  var state = freshState();
  var r = SocialSpaces.createGathering(state, uid('host'), 'concert', 'studio', 'Jazz Night', '', 0, 120);
  assert(r.success, 'concert in studio succeeds');
})();

(function() {
  // Concert in agora zone (not allowed)
  var state = freshState();
  var r = SocialSpaces.createGathering(state, uid('host'), 'concert', 'agora', 'Jazz Night', '', 0, 120);
  assert(!r.success, 'concert in agora fails (not allowed zone)');
})();

(function() {
  // town_hall in nexus or agora
  var state = freshState();
  var r1 = SocialSpaces.createGathering(state, uid('host'), 'town_hall', 'nexus', 'Governance', '', 0, 180);
  assert(r1.success, 'town_hall in nexus succeeds');
  var r2 = SocialSpaces.createGathering(state, uid('host'), 'town_hall', 'agora', 'Governance', '', 0, 180);
  assert(r2.success, 'town_hall in agora succeeds');
  var r3 = SocialSpaces.createGathering(state, uid('host'), 'town_hall', 'wilds', 'Governance', '', 0, 180);
  assert(!r3.success, 'town_hall in wilds fails');
})();

(function() {
  // tournament_viewing only in arena
  var state = freshState();
  var r1 = SocialSpaces.createGathering(state, uid('host'), 'tournament_viewing', 'arena', 'Big Match', '', 0, 120);
  assert(r1.success, 'tournament_viewing in arena succeeds');
  var r2 = SocialSpaces.createGathering(state, uid('host'), 'tournament_viewing', 'nexus', 'Big Match', '', 0, 120);
  assert(!r2.success, 'tournament_viewing in nexus fails');
})();

(function() {
  // market_fair only in agora
  var state = freshState();
  var r1 = SocialSpaces.createGathering(state, uid('host'), 'market_fair', 'agora', 'Bazaar', '', 0, 300);
  assert(r1.success, 'market_fair in agora succeeds');
  var r2 = SocialSpaces.createGathering(state, uid('host'), 'market_fair', 'nexus', 'Bazaar', '', 0, 300);
  assert(!r2.success, 'market_fair in nexus fails');
})();

(function() {
  // feast in gardens, commons, or agora
  var state = freshState();
  var r1 = SocialSpaces.createGathering(state, uid('host'), 'feast', 'gardens', 'Harvest Feast', '', 0, 180);
  assert(r1.success, 'feast in gardens succeeds');
  var r2 = SocialSpaces.createGathering(state, uid('host'), 'feast', 'commons', 'Harvest Feast', '', 0, 180);
  assert(r2.success, 'feast in commons succeeds');
  var r3 = SocialSpaces.createGathering(state, uid('host'), 'feast', 'agora', 'Harvest Feast', '', 0, 180);
  assert(r3.success, 'feast in agora succeeds');
  var r4 = SocialSpaces.createGathering(state, uid('host'), 'feast', 'arena', 'Harvest Feast', '', 0, 180);
  assert(!r4.success, 'feast in arena fails');
})();

// =============================================================================
// Report
// =============================================================================

process.stdout.write('\n========================================\n');
process.stdout.write('Total: ' + (passed + failed) + ' tests\n');
process.stdout.write('Passed: ' + passed + '\n');
process.stdout.write('Failed: ' + failed + '\n');

if (failMessages.length > 0) {
  process.stdout.write('\nFailed tests:\n');
  failMessages.forEach(function(msg) {
    process.stdout.write('  FAIL: ' + msg + '\n');
  });
}

process.exit(failed > 0 ? 1 : 0);
