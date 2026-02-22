/**
 * tests/test_spectator_system.js
 * Comprehensive tests for src/js/spectator_system.js
 * 135+ tests covering all exported functions, edge cases, rewards, reactions,
 * highlights, camera modes, lifecycle, and query utilities.
 *
 * Run with: node tests/test_spectator_system.js
 */

'use strict';

var SS = require('../src/js/spectator_system');

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

// ============================================================================
// HELPERS
// ============================================================================

function freshState() {
  return SS.createState();
}

// Register a single event and return { state, eventId }
function makeEvent(eventType, hostId, zone, tick) {
  var state = freshState();
  var eventId = 'test_evt_' + Math.random().toString(36).slice(2, 8);
  var startTick = (tick === undefined || tick === null) ? 100 : tick;
  var result = SS.registerEvent(state, eventId, eventType || 'arena_match', hostId || 'host1', zone || 'arena', startTick);
  return { state: state, eventId: eventId, result: result };
}

// Join N players as spectators
function joinN(state, eventId, players, startTick) {
  for (var i = 0; i < players.length; i++) {
    SS.joinSpectator(state, players[i], eventId, startTick || 100);
  }
}

// ============================================================================
// SECTION 1: Module Exports & Constants
// ============================================================================

suite('Module Exports & Constants', function() {
  assert(typeof SS === 'object', 'SpectatorSystem is an object');
  assert(Array.isArray(SS.EVENT_TYPES), 'EVENT_TYPES is an array');
  assert(Array.isArray(SS.CAMERA_MODES), 'CAMERA_MODES is an array');
  assert(Array.isArray(SS.CROWD_REACTIONS), 'CROWD_REACTIONS is an array');
  assert(typeof SS.createState === 'function', 'createState is a function');
  assert(typeof SS.registerEvent === 'function', 'registerEvent is a function');
  assert(typeof SS.endEvent === 'function', 'endEvent is a function');
  assert(typeof SS.joinSpectator === 'function', 'joinSpectator is a function');
  assert(typeof SS.leaveSpectator === 'function', 'leaveSpectator is a function');
  assert(typeof SS.setCameraMode === 'function', 'setCameraMode is a function');
  assert(typeof SS.sendReaction === 'function', 'sendReaction is a function');
  assert(typeof SS.addHighlight === 'function', 'addHighlight is a function');
  assert(typeof SS.getEvent === 'function', 'getEvent is a function');
  assert(typeof SS.getActiveEvents === 'function', 'getActiveEvents is a function');
  assert(typeof SS.getEventSpectators === 'function', 'getEventSpectators is a function');
  assert(typeof SS.getSpectatorCount === 'function', 'getSpectatorCount is a function');
  assert(typeof SS.getPlayerWatchHistory === 'function', 'getPlayerWatchHistory is a function');
  assert(typeof SS.getEventHighlights === 'function', 'getEventHighlights is a function');
  assert(typeof SS.getSpectatorRewards === 'function', 'getSpectatorRewards is a function');
  assert(typeof SS.getPopularEvents === 'function', 'getPopularEvents is a function');
  assert(typeof SS.getEventStats === 'function', 'getEventStats is a function');
  assert(typeof SS.REWARD_TICKS_PER_SPARK === 'number', 'REWARD_TICKS_PER_SPARK is a number');
  assertEqual(SS.REWARD_TICKS_PER_SPARK, 50, 'REWARD_TICKS_PER_SPARK is 50');
});

// ============================================================================
// SECTION 2: EVENT_TYPES definitions
// ============================================================================

suite('EVENT_TYPES definitions', function() {
  assertEqual(SS.EVENT_TYPES.length, 6, 'exactly 6 event types');

  var ids = SS.EVENT_TYPES.map(function(e) { return e.id; });
  assert(ids.indexOf('arena_match') !== -1, 'arena_match type exists');
  assert(ids.indexOf('card_tournament') !== -1, 'card_tournament type exists');
  assert(ids.indexOf('performance') !== -1, 'performance type exists');
  assert(ids.indexOf('festival') !== -1, 'festival type exists');
  assert(ids.indexOf('raid') !== -1, 'raid type exists');
  assert(ids.indexOf('dungeon_run') !== -1, 'dungeon_run type exists');

  // All event types have required fields
  for (var i = 0; i < SS.EVENT_TYPES.length; i++) {
    var et = SS.EVENT_TYPES[i];
    assert(typeof et.id === 'string' && et.id.length > 0, et.id + ' has valid id');
    assert(typeof et.name === 'string' && et.name.length > 0, et.id + ' has valid name');
    assert(typeof et.description === 'string' && et.description.length > 0, et.id + ' has description');
    assert(typeof et.maxSpectators === 'number' && et.maxSpectators > 0, et.id + ' has positive maxSpectators');
    assert(typeof et.minDuration === 'number' && et.minDuration > 0, et.id + ' has positive minDuration');
    assert(typeof et.zone === 'string', et.id + ' has a zone');
  }

  // Festival allows the most spectators
  var festival = SS.EVENT_TYPES.filter(function(e) { return e.id === 'festival'; })[0];
  assert(festival.maxSpectators >= 300, 'festival allows 300+ spectators');
});

// ============================================================================
// SECTION 3: CAMERA_MODES definitions
// ============================================================================

suite('CAMERA_MODES definitions', function() {
  assertEqual(SS.CAMERA_MODES.length, 4, 'exactly 4 camera modes');

  var modeIds = SS.CAMERA_MODES.map(function(m) { return m.id; });
  assert(modeIds.indexOf('follow_player') !== -1, 'follow_player mode exists');
  assert(modeIds.indexOf('free_roam') !== -1, 'free_roam mode exists');
  assert(modeIds.indexOf('overhead') !== -1, 'overhead mode exists');
  assert(modeIds.indexOf('cinematic') !== -1, 'cinematic mode exists');

  // All modes have required fields
  for (var i = 0; i < SS.CAMERA_MODES.length; i++) {
    var cm = SS.CAMERA_MODES[i];
    assert(typeof cm.id === 'string' && cm.id.length > 0, cm.id + ' has valid id');
    assert(typeof cm.name === 'string', cm.id + ' has name');
    assert(typeof cm.description === 'string', cm.id + ' has description');
    assert(Array.isArray(cm.available), cm.id + ' has available array');
    assert(cm.available.length > 0, cm.id + ' available list is non-empty');
  }

  // follow_player and cinematic are available for all event types
  var followPlayer = SS.CAMERA_MODES.filter(function(m) { return m.id === 'follow_player'; })[0];
  var cinematic = SS.CAMERA_MODES.filter(function(m) { return m.id === 'cinematic'; })[0];
  assert(followPlayer.available.length === 6, 'follow_player available for all 6 event types');
  assert(cinematic.available.length === 6, 'cinematic available for all 6 event types');
});

// ============================================================================
// SECTION 4: CROWD_REACTIONS definitions
// ============================================================================

suite('CROWD_REACTIONS definitions', function() {
  assertEqual(SS.CROWD_REACTIONS.length, 4, 'exactly 4 crowd reactions');

  var reactionIds = SS.CROWD_REACTIONS.map(function(r) { return r.id; });
  assert(reactionIds.indexOf('cheer') !== -1, 'cheer reaction exists');
  assert(reactionIds.indexOf('gasp') !== -1, 'gasp reaction exists');
  assert(reactionIds.indexOf('applause') !== -1, 'applause reaction exists');
  assert(reactionIds.indexOf('boo') !== -1, 'boo reaction exists');

  // All reactions have cooldown
  for (var i = 0; i < SS.CROWD_REACTIONS.length; i++) {
    var r = SS.CROWD_REACTIONS[i];
    assert(typeof r.cooldown === 'number' && r.cooldown > 0, r.id + ' has positive cooldown');
    assert(typeof r.name === 'string', r.id + ' has name');
  }
});

// ============================================================================
// SECTION 5: createState
// ============================================================================

suite('createState', function() {
  var s = SS.createState();
  assert(typeof s === 'object', 'createState returns an object');
  assert(typeof s.events === 'object', 'state has events map');
  assert(typeof s.spectators === 'object', 'state has spectators map');
  assert(Array.isArray(s.highlights), 'state has highlights array');
  assert(Array.isArray(s.rewardLog), 'state has rewardLog array');
  assert(Array.isArray(s.spectatorLog), 'state has spectatorLog array');
  assertEqual(s.highlights.length, 0, 'highlights starts empty');
  assertEqual(s.rewardLog.length, 0, 'rewardLog starts empty');
  assertEqual(s.spectatorLog.length, 0, 'spectatorLog starts empty');
  assertEqual(Object.keys(s.events).length, 0, 'events map starts empty');
});

// ============================================================================
// SECTION 6: registerEvent
// ============================================================================

suite('registerEvent', function() {
  var state = freshState();
  var r = SS.registerEvent(state, 'evt_001', 'arena_match', 'host1', 'arena', 100);
  assert(r.success === true, 'registerEvent succeeds for valid input');
  assert(typeof r.event === 'object', 'registerEvent returns event object');
  assertEqual(r.event.id, 'evt_001', 'event.id matches provided id');
  assertEqual(r.event.type, 'arena_match', 'event.type matches provided type');
  assertEqual(r.event.hostId, 'host1', 'event.hostId matches provided hostId');
  assertEqual(r.event.zone, 'arena', 'event.zone matches provided zone');
  assertEqual(r.event.status, 'broadcasting', 'initial status is broadcasting');
  assertEqual(r.event.startTick, 100, 'event.startTick is 100');
  assert(r.event.endTick === null, 'event.endTick is null initially');

  // Event is stored in state
  assert(state.events['evt_001'] !== undefined, 'event stored in state.events');

  // Duplicate event ID fails
  var r2 = SS.registerEvent(state, 'evt_001', 'arena_match', 'host2', 'arena', 200);
  assert(r2.success === false, 'duplicate event ID fails');
  assert(typeof r2.reason === 'string', 'failure has reason string');

  // Unknown event type fails
  var r3 = SS.registerEvent(state, 'evt_002', 'unknown_type', 'host1', 'arena', 100);
  assert(r3.success === false, 'unknown event type fails');
  assert(typeof r3.reason === 'string', 'unknown type failure has reason');

  // Invalid eventId fails
  var r4 = SS.registerEvent(state, '', 'arena_match', 'host1', 'arena', 100);
  assert(r4.success === false, 'empty eventId fails');

  var r5 = SS.registerEvent(state, null, 'arena_match', 'host1', 'arena', 100);
  assert(r5.success === false, 'null eventId fails');

  // All 6 event types register successfully
  var types = ['arena_match', 'card_tournament', 'performance', 'festival', 'raid', 'dungeon_run'];
  for (var i = 0; i < types.length; i++) {
    var state2 = freshState();
    var rt = SS.registerEvent(state2, 'evt_type_' + i, types[i], 'host1', 'nexus', 0);
    assert(rt.success === true, types[i] + ' event registers successfully');
  }

  // Zone defaults to event type default if not provided
  var state3 = freshState();
  var r6 = SS.registerEvent(state3, 'evt_nozone', 'arena_match', 'host1', null, 0);
  assert(r6.success === true, 'registerEvent succeeds without explicit zone');
  assert(typeof r6.event.zone === 'string', 'event zone defaults to a string');

  // Invalid hostId fails
  var r7 = SS.registerEvent(state, 'evt_badhost', 'arena_match', '', 'arena', 100);
  assert(r7.success === false, 'empty hostId fails');
});

// ============================================================================
// SECTION 7: endEvent
// ============================================================================

suite('endEvent', function() {
  var m = makeEvent('arena_match', 'host1', 'arena', 100);
  var state = m.state;
  var eventId = m.eventId;

  // Add some spectators
  joinN(state, eventId, ['alice', 'bob', 'carol'], 100);

  var r = SS.endEvent(state, eventId, 200);
  assert(r.success === true, 'endEvent succeeds');
  assert(typeof r.peakSpectators === 'number', 'endEvent returns peakSpectators');
  assert(typeof r.totalWatchTime === 'number', 'endEvent returns totalWatchTime');
  assertEqual(state.events[eventId].status, 'ended', 'event status is ended');
  assert(state.events[eventId].endTick === 200, 'event endTick is 200');

  // After end, spectators are auto-removed
  assertEqual(SS.getSpectatorCount(state, eventId), 0, 'spectator count is 0 after end');

  // Cannot end an already-ended event
  var r2 = SS.endEvent(state, eventId, 300);
  assert(r2.success === false, 'cannot end event twice');

  // End non-existent event
  var r3 = SS.endEvent(freshState(), 'fake_evt', 100);
  assert(r3.success === false, 'endEvent fails for unknown event');

  // End event with no spectators
  var m2 = makeEvent('card_tournament', 'host2', 'agora', 50);
  var r4 = SS.endEvent(m2.state, m2.eventId, 150);
  assert(r4.success === true, 'endEvent with 0 spectators succeeds');
  assertEqual(r4.peakSpectators, 0, 'peakSpectators is 0 for empty event');
});

// ============================================================================
// SECTION 8: joinSpectator
// ============================================================================

suite('joinSpectator', function() {
  var m = makeEvent('arena_match', 'host1', 'arena', 0);
  var state = m.state;
  var eventId = m.eventId;

  var r = SS.joinSpectator(state, 'alice', eventId, 10);
  assert(r.success === true, 'joinSpectator succeeds for alice');
  assert(typeof r.cameraMode === 'string', 'joinSpectator returns cameraMode');
  assertEqual(r.cameraMode, 'follow_player', 'default cameraMode is follow_player');

  // Spectator count increases
  assertEqual(SS.getSpectatorCount(state, eventId), 1, 'spectator count is 1 after alice joins');

  // Join same event twice fails
  var r2 = SS.joinSpectator(state, 'alice', eventId, 10);
  assert(r2.success === false, 'cannot join same event twice');
  assert(typeof r2.reason === 'string', 'duplicate join has reason');

  // Bob joins
  var rb = SS.joinSpectator(state, 'bob', eventId, 15);
  assert(rb.success === true, 'bob joins successfully');
  assertEqual(SS.getSpectatorCount(state, eventId), 2, 'spectator count is 2 after bob joins');

  // Join non-existent event fails
  var r3 = SS.joinSpectator(state, 'carol', 'fake_evt', 10);
  assert(r3.success === false, 'join non-existent event fails');

  // Join ended event fails
  var m2 = makeEvent('festival', 'host2', 'commons', 0);
  SS.endEvent(m2.state, m2.eventId, 100);
  var r4 = SS.joinSpectator(m2.state, 'dave', m2.eventId, 150);
  assert(r4.success === false, 'cannot join ended event');

  // Invalid playerId fails
  var r5 = SS.joinSpectator(state, '', eventId, 10);
  assert(r5.success === false, 'empty playerId fails join');

  var r6 = SS.joinSpectator(state, null, eventId, 10);
  assert(r6.success === false, 'null playerId fails join');

  // Join logs to spectatorLog
  var logBefore = state.spectatorLog.length;
  SS.joinSpectator(state, 'carol', eventId, 20);
  assert(state.spectatorLog.length > logBefore, 'joinSpectator logs to spectatorLog');

  var lastLog = state.spectatorLog[state.spectatorLog.length - 1];
  assertEqual(lastLog.playerId, 'carol', 'spectatorLog records playerId');
  assertEqual(lastLog.eventId, eventId, 'spectatorLog records eventId');
  assertEqual(lastLog.action, 'join', 'spectatorLog records action=join');
  assertEqual(lastLog.tick, 20, 'spectatorLog records tick');
});

// ============================================================================
// SECTION 9: leaveSpectator
// ============================================================================

suite('leaveSpectator', function() {
  var m = makeEvent('raid', 'host1', 'wilds', 0);
  var state = m.state;
  var eventId = m.eventId;

  SS.joinSpectator(state, 'alice', eventId, 100);

  var r = SS.leaveSpectator(state, 'alice', eventId, 200);
  assert(r.success === true, 'leaveSpectator succeeds');
  assert(typeof r.watchTime === 'number', 'leaveSpectator returns watchTime');
  assertEqual(r.watchTime, 100, 'watchTime is 200-100=100 ticks');
  assert(typeof r.reward === 'number', 'leaveSpectator returns reward');

  // Spectator count decreases
  assertEqual(SS.getSpectatorCount(state, eventId), 0, 'spectator count is 0 after alice leaves');

  // Cannot leave twice
  var r2 = SS.leaveSpectator(state, 'alice', eventId, 250);
  assert(r2.success === false, 'cannot leave event twice');

  // Non-spectator cannot leave
  var r3 = SS.leaveSpectator(state, 'bob', eventId, 200);
  assert(r3.success === false, 'non-spectator cannot leave event');

  // Leave non-existent event fails
  var r4 = SS.leaveSpectator(state, 'alice', 'fake_evt', 200);
  assert(r4.success === false, 'leave non-existent event fails');

  // Invalid playerId fails
  var r5 = SS.leaveSpectator(state, '', eventId, 200);
  assert(r5.success === false, 'empty playerId fails leave');

  // leaveSpectator logs to spectatorLog
  var m2 = makeEvent('dungeon_run', 'host2', 'arena', 0);
  SS.joinSpectator(m2.state, 'dave', m2.eventId, 50);
  var logBefore = m2.state.spectatorLog.length;
  SS.leaveSpectator(m2.state, 'dave', m2.eventId, 100);
  assert(m2.state.spectatorLog.length > logBefore, 'leaveSpectator logs to spectatorLog');

  var lastLog = m2.state.spectatorLog[m2.state.spectatorLog.length - 1];
  assertEqual(lastLog.action, 'leave', 'spectatorLog records action=leave');
});

// ============================================================================
// SECTION 10: Spark Reward Calculation
// ============================================================================

suite('Spark Reward Calculation', function() {
  // 0 ticks -> 0 Spark
  var m = makeEvent('arena_match', 'host1', 'arena', 100);
  SS.joinSpectator(m.state, 'alice', m.eventId, 100);
  var r1 = SS.leaveSpectator(m.state, 'alice', m.eventId, 100);
  assertEqual(r1.watchTime, 0, 'zero watch time with instant leave');
  assertEqual(r1.reward, 0, '0 ticks -> 0 Spark');

  // 49 ticks -> 0 Spark (below threshold)
  var m2 = makeEvent('arena_match', 'host2', 'arena', 0);
  SS.joinSpectator(m2.state, 'bob', m2.eventId, 0);
  var r2 = SS.leaveSpectator(m2.state, 'bob', m2.eventId, 49);
  assertEqual(r2.watchTime, 49, 'watchTime is 49');
  assertEqual(r2.reward, 0, '49 ticks -> 0 Spark');

  // 50 ticks -> 1 Spark
  var m3 = makeEvent('arena_match', 'host3', 'arena', 0);
  SS.joinSpectator(m3.state, 'carol', m3.eventId, 0);
  var r3 = SS.leaveSpectator(m3.state, 'carol', m3.eventId, 50);
  assertEqual(r3.reward, 1, '50 ticks -> 1 Spark');

  // 100 ticks -> 2 Spark
  var m4 = makeEvent('performance', 'host4', 'studio', 0);
  SS.joinSpectator(m4.state, 'dave', m4.eventId, 0);
  var r4 = SS.leaveSpectator(m4.state, 'dave', m4.eventId, 100);
  assertEqual(r4.reward, 2, '100 ticks -> 2 Spark');

  // 250 ticks -> 5 Spark
  var m5 = makeEvent('festival', 'host5', 'commons', 0);
  SS.joinSpectator(m5.state, 'eve', m5.eventId, 0);
  var r5 = SS.leaveSpectator(m5.state, 'eve', m5.eventId, 250);
  assertEqual(r5.reward, 5, '250 ticks -> 5 Spark');

  // Reward is logged in rewardLog when spark > 0
  var m6 = makeEvent('raid', 'host6', 'wilds', 0);
  SS.joinSpectator(m6.state, 'frank', m6.eventId, 0);
  SS.leaveSpectator(m6.state, 'frank', m6.eventId, 100);
  assert(m6.state.rewardLog.length === 1, 'rewardLog has 1 entry after earning Spark');
  assertEqual(m6.state.rewardLog[0].playerId, 'frank', 'rewardLog entry has playerId');
  assertEqual(m6.state.rewardLog[0].spark, 2, 'rewardLog entry has spark=2');

  // No reward log entry when spark = 0
  var m7 = makeEvent('arena_match', 'host7', 'arena', 0);
  SS.joinSpectator(m7.state, 'grace', m7.eventId, 0);
  SS.leaveSpectator(m7.state, 'grace', m7.eventId, 10);
  assertEqual(m7.state.rewardLog.length, 0, 'no rewardLog entry for 0 Spark');
});

// ============================================================================
// SECTION 11: setCameraMode
// ============================================================================

suite('setCameraMode', function() {
  var m = makeEvent('arena_match', 'host1', 'arena', 0);
  var state = m.state;
  var eventId = m.eventId;
  SS.joinSpectator(state, 'alice', eventId, 0);

  // Set to cinematic (available for arena_match)
  var r = SS.setCameraMode(state, 'alice', eventId, 'cinematic');
  assert(r.success === true, 'set to cinematic succeeds for arena_match');

  // Set to overhead (available for arena_match)
  var r2 = SS.setCameraMode(state, 'alice', eventId, 'overhead');
  assert(r2.success === true, 'set to overhead succeeds for arena_match');

  // Set to follow_player
  var r3 = SS.setCameraMode(state, 'alice', eventId, 'follow_player');
  assert(r3.success === true, 'set to follow_player succeeds');

  // Unknown mode fails
  var r4 = SS.setCameraMode(state, 'alice', eventId, 'unknown_mode');
  assert(r4.success === false, 'unknown camera mode fails');
  assert(typeof r4.reason === 'string', 'unknown mode has reason');

  // Non-spectator cannot set camera
  var r5 = SS.setCameraMode(state, 'bob', eventId, 'cinematic');
  assert(r5.success === false, 'non-spectator cannot set camera mode');

  // Non-existent event fails
  var r6 = SS.setCameraMode(state, 'alice', 'fake_evt', 'cinematic');
  assert(r6.success === false, 'setCameraMode fails for unknown event');

  // Camera mode not available for event type
  // free_roam is not available for arena_match
  var r7 = SS.setCameraMode(state, 'alice', eventId, 'free_roam');
  assert(r7.success === false, 'free_roam not available for arena_match');
  assert(typeof r7.reason === 'string', 'unavailable mode has reason');

  // free_roam IS available for festival
  var mf = makeEvent('festival', 'host2', 'commons', 0);
  SS.joinSpectator(mf.state, 'alice', mf.eventId, 0);
  var r8 = SS.setCameraMode(mf.state, 'alice', mf.eventId, 'free_roam');
  assert(r8.success === true, 'free_roam available for festival');

  // After leave, setCameraMode fails
  SS.leaveSpectator(state, 'alice', eventId, 50);
  var r9 = SS.setCameraMode(state, 'alice', eventId, 'cinematic');
  assert(r9.success === false, 'setCameraMode fails after leaving');
});

// ============================================================================
// SECTION 12: sendReaction
// ============================================================================

suite('sendReaction', function() {
  var m = makeEvent('arena_match', 'host1', 'arena', 0);
  var state = m.state;
  var eventId = m.eventId;
  SS.joinSpectator(state, 'alice', eventId, 0);

  // All 4 reactions succeed
  var reactions = ['cheer', 'gasp', 'applause', 'boo'];
  // Use different ticks to avoid cooldown interference
  var tick = 100;
  for (var i = 0; i < reactions.length; i++) {
    var r = SS.sendReaction(state, 'alice', eventId, reactions[i], tick);
    assert(r.success === true, reactions[i] + ' reaction succeeds');
    tick += 20;
  }

  // Reaction counts are tracked on event
  var ev = SS.getEvent(state, eventId);
  assert(ev.reactionCounts.cheer >= 1, 'cheer count tracked');
  assert(ev.reactionCounts.gasp >= 1, 'gasp count tracked');
  assert(ev.reactionCounts.applause >= 1, 'applause count tracked');
  assert(ev.reactionCounts.boo >= 1, 'boo count tracked');

  // Cooldown enforcement: cheer has cooldown 5; sending at same tick fails
  var m2 = makeEvent('festival', 'host2', 'commons', 0);
  SS.joinSpectator(m2.state, 'bob', m2.eventId, 0);
  SS.sendReaction(m2.state, 'bob', m2.eventId, 'cheer', 10);
  var rCool = SS.sendReaction(m2.state, 'bob', m2.eventId, 'cheer', 10);
  assert(rCool.success === false, 'cheer on cooldown fails at same tick');
  assert(typeof rCool.reason === 'string', 'cooldown failure has reason');

  // After cooldown expires, cheer succeeds again (cheer cooldown = 5)
  var rAfter = SS.sendReaction(m2.state, 'bob', m2.eventId, 'cheer', 15);
  assert(rAfter.success === true, 'cheer succeeds after cooldown expires');

  // Unknown reaction type fails
  var rBad = SS.sendReaction(state, 'alice', eventId, 'unknown_reaction', 200);
  assert(rBad.success === false, 'unknown reaction type fails');

  // Non-spectator cannot react
  var rNs = SS.sendReaction(state, 'carol', eventId, 'cheer', 300);
  assert(rNs.success === false, 'non-spectator cannot send reaction');

  // Reaction to non-existent event fails
  var rFake = SS.sendReaction(state, 'alice', 'fake_evt', 'cheer', 300);
  assert(rFake.success === false, 'reaction to non-existent event fails');

  // Reaction to ended event fails
  var m3 = makeEvent('performance', 'host3', 'studio', 0);
  SS.joinSpectator(m3.state, 'dave', m3.eventId, 0);
  SS.endEvent(m3.state, m3.eventId, 100);
  var rEnded = SS.sendReaction(m3.state, 'dave', m3.eventId, 'cheer', 150);
  assert(rEnded.success === false, 'reaction to ended event fails');
});

// ============================================================================
// SECTION 13: addHighlight
// ============================================================================

suite('addHighlight', function() {
  var m = makeEvent('raid', 'host1', 'wilds', 0);
  var state = m.state;
  var eventId = m.eventId;
  SS.joinSpectator(state, 'alice', eventId, 0);

  var r = SS.addHighlight(state, 'alice', eventId, 'Boss entered phase 2!', 100);
  assert(r.success === true, 'addHighlight succeeds');
  assert(typeof r.highlight === 'object', 'addHighlight returns highlight object');
  assert(typeof r.highlight.id === 'string', 'highlight has id');
  assertEqual(r.highlight.eventId, eventId, 'highlight.eventId matches');
  assertEqual(r.highlight.playerId, 'alice', 'highlight.playerId matches');
  assertEqual(r.highlight.description, 'Boss entered phase 2!', 'highlight.description matches');
  assertEqual(r.highlight.tick, 100, 'highlight.tick is 100');

  // Highlight is stored globally and on event
  assert(state.highlights.length === 1, 'global highlights has 1 entry');
  assert(SS.getEventHighlights(state, eventId).length === 1, 'event highlights has 1 entry');

  // Multiple highlights from same player
  SS.addHighlight(state, 'alice', eventId, 'Epic dodge!', 150);
  SS.addHighlight(state, 'alice', eventId, 'Triple kill!', 200);
  assert(state.highlights.length === 3, 'global highlights has 3 entries');

  // Empty description fails
  var rEmpty = SS.addHighlight(state, 'alice', eventId, '', 250);
  assert(rEmpty.success === false, 'empty description fails');
  assert(typeof rEmpty.reason === 'string', 'empty description has reason');

  // Whitespace-only description fails
  var rWs = SS.addHighlight(state, 'alice', eventId, '   ', 250);
  assert(rWs.success === false, 'whitespace-only description fails');

  // Non-spectator cannot add highlight
  var rNs = SS.addHighlight(state, 'bob', eventId, 'Should fail', 260);
  assert(rNs.success === false, 'non-spectator cannot add highlight');

  // Highlight on non-existent event fails
  var rFake = SS.addHighlight(state, 'alice', 'fake_evt', 'test', 300);
  assert(rFake.success === false, 'highlight on non-existent event fails');

  // Highlight on ended event fails
  var m2 = makeEvent('dungeon_run', 'host2', 'arena', 0);
  SS.joinSpectator(m2.state, 'carol', m2.eventId, 0);
  SS.endEvent(m2.state, m2.eventId, 100);
  var rEnded = SS.addHighlight(m2.state, 'carol', m2.eventId, 'Late highlight', 150);
  assert(rEnded.success === false, 'highlight on ended event fails');

  // Highlight IDs are unique
  var m3 = makeEvent('festival', 'host3', 'commons', 0);
  SS.joinSpectator(m3.state, 'dave', m3.eventId, 0);
  var h1 = SS.addHighlight(m3.state, 'dave', m3.eventId, 'First', 10);
  var h2 = SS.addHighlight(m3.state, 'dave', m3.eventId, 'Second', 20);
  assert(h1.highlight.id !== h2.highlight.id, 'highlight IDs are unique');
});

// ============================================================================
// SECTION 14: getEvent
// ============================================================================

suite('getEvent', function() {
  var m = makeEvent('card_tournament', 'host1', 'agora', 50);
  SS.joinSpectator(m.state, 'alice', m.eventId, 50);
  SS.joinSpectator(m.state, 'bob', m.eventId, 50);

  var ev = SS.getEvent(m.state, m.eventId);
  assert(ev !== null, 'getEvent returns non-null for existing event');
  assertEqual(ev.id, m.eventId, 'getEvent.id matches');
  assertEqual(ev.type, 'card_tournament', 'getEvent.type matches');
  assertEqual(ev.hostId, 'host1', 'getEvent.hostId matches');
  assertEqual(ev.status, 'broadcasting', 'getEvent.status is broadcasting');
  assertEqual(ev.spectatorCount, 2, 'getEvent.spectatorCount is 2');
  assert(typeof ev.peakSpectators === 'number', 'getEvent.peakSpectators is a number');
  assert(typeof ev.totalWatchTicks === 'number', 'getEvent.totalWatchTicks is a number');
  assert(typeof ev.reactionCounts === 'object', 'getEvent.reactionCounts is an object');
  assert(Array.isArray(ev.highlights), 'getEvent.highlights is an array');

  // Non-existent event returns null
  var evNull = SS.getEvent(freshState(), 'fake_evt');
  assert(evNull === null, 'getEvent returns null for non-existent event');

  // After end, status reflects
  SS.endEvent(m.state, m.eventId, 200);
  var evEnded = SS.getEvent(m.state, m.eventId);
  assertEqual(evEnded.status, 'ended', 'getEvent.status is ended after endEvent');
  assertEqual(evEnded.spectatorCount, 0, 'getEvent.spectatorCount is 0 after end');
});

// ============================================================================
// SECTION 15: getActiveEvents
// ============================================================================

suite('getActiveEvents', function() {
  var state = freshState();

  // Empty state
  var active0 = SS.getActiveEvents(state);
  assert(Array.isArray(active0), 'getActiveEvents returns array');
  assertEqual(active0.length, 0, 'no active events initially');

  // Register 3 events
  SS.registerEvent(state, 'e1', 'arena_match', 'h1', 'arena', 100);
  SS.registerEvent(state, 'e2', 'festival', 'h2', 'commons', 100);
  SS.registerEvent(state, 'e3', 'raid', 'h3', 'wilds', 100);

  var active3 = SS.getActiveEvents(state);
  assertEqual(active3.length, 3, '3 active events after registering 3');

  // End one event
  SS.endEvent(state, 'e1', 200);
  var active2 = SS.getActiveEvents(state);
  assertEqual(active2.length, 2, '2 active events after ending 1');

  // All returned events have spectatorCount field
  for (var i = 0; i < active2.length; i++) {
    assert(typeof active2[i].spectatorCount === 'number', 'active event has spectatorCount');
  }
});

// ============================================================================
// SECTION 16: getEventSpectators
// ============================================================================

suite('getEventSpectators', function() {
  var m = makeEvent('performance', 'host1', 'studio', 0);
  SS.joinSpectator(m.state, 'alice', m.eventId, 10);
  SS.joinSpectator(m.state, 'bob', m.eventId, 10);
  SS.joinSpectator(m.state, 'carol', m.eventId, 10);

  var specs = SS.getEventSpectators(m.state, m.eventId);
  assert(Array.isArray(specs), 'getEventSpectators returns array');
  assertEqual(specs.length, 3, 'getEventSpectators returns 3');
  assert(specs.indexOf('alice') !== -1, 'alice in spectators');
  assert(specs.indexOf('bob') !== -1, 'bob in spectators');
  assert(specs.indexOf('carol') !== -1, 'carol in spectators');

  // Returns defensive copy (mutation doesn't affect internal state)
  specs.push('injected');
  assertEqual(SS.getSpectatorCount(m.state, m.eventId), 3, 'getEventSpectators is defensive copy');

  // Non-existent event returns empty array
  var specs2 = SS.getEventSpectators(freshState(), 'fake_evt');
  assert(Array.isArray(specs2) && specs2.length === 0, 'getEventSpectators returns [] for unknown event');

  // After leave, spectator removed
  SS.leaveSpectator(m.state, 'bob', m.eventId, 50);
  var specs3 = SS.getEventSpectators(m.state, m.eventId);
  assertEqual(specs3.length, 2, 'spectator removed after leave');
  assert(specs3.indexOf('bob') === -1, 'bob no longer in spectators');
});

// ============================================================================
// SECTION 17: getSpectatorCount
// ============================================================================

suite('getSpectatorCount', function() {
  var m = makeEvent('arena_match', 'host1', 'arena', 0);
  assertEqual(SS.getSpectatorCount(m.state, m.eventId), 0, 'initial count is 0');

  SS.joinSpectator(m.state, 'alice', m.eventId, 10);
  assertEqual(SS.getSpectatorCount(m.state, m.eventId), 1, 'count is 1 after alice joins');

  SS.joinSpectator(m.state, 'bob', m.eventId, 10);
  assertEqual(SS.getSpectatorCount(m.state, m.eventId), 2, 'count is 2 after bob joins');

  SS.leaveSpectator(m.state, 'alice', m.eventId, 50);
  assertEqual(SS.getSpectatorCount(m.state, m.eventId), 1, 'count is 1 after alice leaves');

  // Non-existent event returns 0
  assertEqual(SS.getSpectatorCount(freshState(), 'fake'), 0, 'count 0 for unknown event');
});

// ============================================================================
// SECTION 18: Peak Spectator Tracking
// ============================================================================

suite('Peak Spectator Tracking', function() {
  var m = makeEvent('festival', 'host1', 'commons', 0);
  var state = m.state;
  var eventId = m.eventId;

  // Join 5 spectators
  joinN(state, eventId, ['p1', 'p2', 'p3', 'p4', 'p5'], 10);
  var ev = state.events[eventId];
  assertEqual(ev.peakSpectators, 5, 'peak is 5 when all are watching');

  // Some leave - peak should not drop
  SS.leaveSpectator(state, 'p1', eventId, 50);
  SS.leaveSpectator(state, 'p2', eventId, 60);
  assertEqual(ev.peakSpectators, 5, 'peak stays at 5 after some leave');

  // New joins don't exceed peak
  SS.joinSpectator(state, 'p6', eventId, 70);
  assertEqual(ev.peakSpectators, 5, 'peak stays at 5 when only 4 watching');

  // Add 3 more to exceed previous peak
  SS.joinSpectator(state, 'p7', eventId, 80);
  SS.joinSpectator(state, 'p8', eventId, 90);
  SS.joinSpectator(state, 'p9', eventId, 100);
  // Now 3+4 = p3,p4,p5,p6,p7,p8,p9 = 7
  assert(ev.peakSpectators >= 7, 'peak updates to 7 when 7 are watching');

  // endEvent returns peak
  var r = SS.endEvent(state, eventId, 200);
  assert(r.peakSpectators >= 7, 'endEvent peakSpectators reflects max');
});

// ============================================================================
// SECTION 19: getPlayerWatchHistory
// ============================================================================

suite('getPlayerWatchHistory', function() {
  var state = freshState();

  // Register 2 events
  SS.registerEvent(state, 'e1', 'arena_match', 'h1', 'arena', 0);
  SS.registerEvent(state, 'e2', 'festival', 'h2', 'commons', 0);

  // Alice watches both events
  SS.joinSpectator(state, 'alice', 'e1', 10);
  SS.leaveSpectator(state, 'alice', 'e1', 110);

  SS.joinSpectator(state, 'alice', 'e2', 200);
  SS.leaveSpectator(state, 'alice', 'e2', 350);

  var history = SS.getPlayerWatchHistory(state, 'alice');
  assert(Array.isArray(history), 'getPlayerWatchHistory returns array');
  assertEqual(history.length, 2, 'alice has 2 watch history entries');

  // Each entry has required fields
  for (var i = 0; i < history.length; i++) {
    var h = history[i];
    assert(typeof h.eventId === 'string', 'history entry has eventId');
    assert(typeof h.eventType === 'string', 'history entry has eventType');
    assert(typeof h.joinTick === 'number', 'history entry has joinTick');
    assert(typeof h.leaveTick === 'number', 'history entry has leaveTick');
    assert(typeof h.watchTicks === 'number', 'history entry has watchTicks');
  }

  // Check correct watch times
  var e1hist = history.filter(function(h) { return h.eventId === 'e1'; })[0];
  assertEqual(e1hist.watchTicks, 100, 'e1 watch time is 100 ticks');

  var e2hist = history.filter(function(h) { return h.eventId === 'e2'; })[0];
  assertEqual(e2hist.watchTicks, 150, 'e2 watch time is 150 ticks');

  // Player with no history
  var noHistory = SS.getPlayerWatchHistory(state, 'unknown_player');
  assert(Array.isArray(noHistory) && noHistory.length === 0, 'no history for unknown player');

  // Bob only watched e1
  SS.joinSpectator(state, 'bob', 'e1', 50);
  SS.leaveSpectator(state, 'bob', 'e1', 75);
  var bobHistory = SS.getPlayerWatchHistory(state, 'bob');
  assertEqual(bobHistory.length, 1, 'bob has 1 history entry');
  assertEqual(bobHistory[0].eventId, 'e1', 'bob history entry is for e1');
});

// ============================================================================
// SECTION 20: getEventHighlights
// ============================================================================

suite('getEventHighlights', function() {
  var m = makeEvent('raid', 'host1', 'wilds', 0);
  SS.joinSpectator(m.state, 'alice', m.eventId, 0);
  SS.joinSpectator(m.state, 'bob', m.eventId, 0);

  SS.addHighlight(m.state, 'alice', m.eventId, 'Phase 1 clear!', 100);
  SS.addHighlight(m.state, 'bob', m.eventId, 'Bob got the loot!', 150);
  SS.addHighlight(m.state, 'alice', m.eventId, 'Final boss down!', 300);

  var highlights = SS.getEventHighlights(m.state, m.eventId);
  assert(Array.isArray(highlights), 'getEventHighlights returns array');
  assertEqual(highlights.length, 3, 'getEventHighlights returns 3 highlights');

  // All highlights have correct eventId
  for (var i = 0; i < highlights.length; i++) {
    assertEqual(highlights[i].eventId, m.eventId, 'highlight eventId matches');
  }

  // Defensive copy
  highlights.push({ fake: true });
  assertEqual(SS.getEventHighlights(m.state, m.eventId).length, 3, 'getEventHighlights is defensive copy');

  // Non-existent event
  var noHl = SS.getEventHighlights(freshState(), 'fake_evt');
  assert(Array.isArray(noHl) && noHl.length === 0, 'highlights [] for unknown event');
});

// ============================================================================
// SECTION 21: getSpectatorRewards
// ============================================================================

suite('getSpectatorRewards', function() {
  var state = freshState();
  SS.registerEvent(state, 'e1', 'arena_match', 'h1', 'arena', 0);
  SS.registerEvent(state, 'e2', 'festival', 'h2', 'commons', 0);

  SS.joinSpectator(state, 'alice', 'e1', 0);
  SS.leaveSpectator(state, 'alice', 'e1', 100); // 100 ticks = 2 Spark

  SS.joinSpectator(state, 'alice', 'e2', 200);
  SS.leaveSpectator(state, 'alice', 'e2', 450); // 250 ticks = 5 Spark

  var rewards = SS.getSpectatorRewards(state, 'alice');
  assert(typeof rewards === 'object', 'getSpectatorRewards returns object');
  assertEqual(rewards.playerId, 'alice', 'rewards.playerId is alice');
  assert(typeof rewards.totalSpark === 'number', 'rewards.totalSpark is a number');
  assertEqual(rewards.totalSpark, 7, 'alice total spark is 2+5=7');
  assert(Array.isArray(rewards.rewardLog), 'rewards.rewardLog is array');
  assertEqual(rewards.rewardLog.length, 2, 'alice has 2 reward log entries');

  // Bob earned nothing
  var bobRewards = SS.getSpectatorRewards(state, 'bob');
  assertEqual(bobRewards.totalSpark, 0, 'bob has 0 totalSpark');
  assertEqual(bobRewards.rewardLog.length, 0, 'bob has empty rewardLog');

  // Unknown player
  var unkRewards = SS.getSpectatorRewards(state, 'unknown_xyz');
  assertEqual(unkRewards.totalSpark, 0, 'unknown player has 0 totalSpark');
});

// ============================================================================
// SECTION 22: getPopularEvents
// ============================================================================

suite('getPopularEvents', function() {
  var state = freshState();

  // Register 3 events
  SS.registerEvent(state, 'big', 'festival', 'h1', 'commons', 0);
  SS.registerEvent(state, 'mid', 'arena_match', 'h2', 'arena', 0);
  SS.registerEvent(state, 'small', 'raid', 'h3', 'wilds', 0);

  // big: 5 spectators, mid: 2, small: 1
  joinN(state, 'big', ['p1','p2','p3','p4','p5'], 10);
  joinN(state, 'mid', ['p1','p2'], 10);
  joinN(state, 'small', ['p1'], 10);

  var popular = SS.getPopularEvents(state, 10);
  assert(Array.isArray(popular), 'getPopularEvents returns array');
  assertEqual(popular.length, 3, 'getPopularEvents returns all 3 events');

  // Should be sorted by peakSpectators desc
  assert(popular[0].peakSpectators >= popular[1].peakSpectators, 'sorted by peakSpectators desc');
  assert(popular[1].peakSpectators >= popular[2].peakSpectators, 'sorted desc for all entries');
  assertEqual(popular[0].id, 'big', 'most popular is big event');

  // Count parameter limits results
  var top1 = SS.getPopularEvents(state, 1);
  assertEqual(top1.length, 1, 'count=1 returns 1 event');
  assertEqual(top1[0].id, 'big', 'top 1 is big');

  var top2 = SS.getPopularEvents(state, 2);
  assertEqual(top2.length, 2, 'count=2 returns 2 events');

  // Each entry has required fields
  for (var i = 0; i < popular.length; i++) {
    assert(typeof popular[i].id === 'string', 'entry has id');
    assert(typeof popular[i].type === 'string', 'entry has type');
    assert(typeof popular[i].peakSpectators === 'number', 'entry has peakSpectators');
    assert(typeof popular[i].totalWatchTicks === 'number', 'entry has totalWatchTicks');
    assert(typeof popular[i].status === 'string', 'entry has status');
  }

  // Empty state
  var empty = SS.getPopularEvents(freshState(), 5);
  assert(Array.isArray(empty) && empty.length === 0, 'getPopularEvents empty for empty state');

  // count=0 returns all
  var all = SS.getPopularEvents(state, 0);
  assertEqual(all.length, 3, 'count=0 returns all events');
});

// ============================================================================
// SECTION 23: getEventStats
// ============================================================================

suite('getEventStats', function() {
  var m = makeEvent('raid', 'host1', 'wilds', 0);
  var state = m.state;
  var eventId = m.eventId;

  SS.joinSpectator(state, 'alice', eventId, 0);
  SS.joinSpectator(state, 'bob', eventId, 0);
  SS.joinSpectator(state, 'carol', eventId, 0);

  SS.sendReaction(state, 'alice', eventId, 'cheer', 10);
  SS.addHighlight(state, 'alice', eventId, 'Boss appeared!', 50);

  SS.leaveSpectator(state, 'alice', eventId, 100);  // 100 ticks = 2 Spark
  SS.leaveSpectator(state, 'bob', eventId, 200);    // 200 ticks = 4 Spark

  var stats = SS.getEventStats(state, eventId);
  assert(stats !== null, 'getEventStats returns non-null for existing event');
  assertEqual(stats.eventId, eventId, 'stats.eventId matches');
  assertEqual(stats.type, 'raid', 'stats.type is raid');
  assertEqual(stats.hostId, 'host1', 'stats.hostId matches');
  assertEqual(stats.status, 'broadcasting', 'stats.status is broadcasting');
  assertEqual(stats.startTick, 0, 'stats.startTick is 0');
  assert(stats.endTick === null, 'stats.endTick is null before end');
  assertEqual(stats.currentSpectators, 1, 'stats.currentSpectators is 1 (carol still watching)');
  assertEqual(stats.peakSpectators, 3, 'stats.peakSpectators is 3');
  assert(typeof stats.totalWatchTicks === 'number', 'stats.totalWatchTicks is a number');
  assert(typeof stats.avgWatchTime === 'number', 'stats.avgWatchTime is a number');
  assert(typeof stats.totalUniqueSpectators === 'number', 'stats.totalUniqueSpectators is a number');
  assert(typeof stats.totalSparkDistributed === 'number', 'stats.totalSparkDistributed is a number');
  assertEqual(stats.totalSparkDistributed, 6, 'totalSparkDistributed is 2+4=6 Spark');
  assertEqual(stats.highlightCount, 1, 'stats.highlightCount is 1');
  assert(typeof stats.reactionCounts === 'object', 'stats.reactionCounts is an object');
  assert(Array.isArray(stats.watchHistory), 'stats.watchHistory is an array');

  // After end, stats reflect final state
  SS.endEvent(state, eventId, 300);
  var statsEnd = SS.getEventStats(state, eventId);
  assertEqual(statsEnd.status, 'ended', 'stats.status is ended after end');
  assertEqual(statsEnd.endTick, 300, 'stats.endTick is 300');

  // Non-existent event returns null
  var statsNull = SS.getEventStats(freshState(), 'fake_evt');
  assert(statsNull === null, 'getEventStats returns null for unknown event');

  // avgWatchTime calculation
  // alice: 100 ticks, bob: 200 ticks, carol will leave at 300 (100 ticks via endEvent)
  // watchHistory has alice(100) + bob(200) + carol(300-0=300) = 3 entries, avg = (100+200+300)/3 = 200
  var statsAfter = SS.getEventStats(state, eventId);
  assert(statsAfter.avgWatchTime > 0, 'avgWatchTime is positive after watchers leave');
});

// ============================================================================
// SECTION 24: Multi-event Lifecycle
// ============================================================================

suite('Multi-event Lifecycle', function() {
  var state = freshState();

  // Register multiple event types
  var types = ['arena_match', 'card_tournament', 'performance', 'festival', 'raid', 'dungeon_run'];
  for (var i = 0; i < types.length; i++) {
    var eid = 'evt_multi_' + i;
    var r = SS.registerEvent(state, eid, types[i], 'host' + i, 'zone' + i, i * 10);
    assert(r.success === true, 'registered event type: ' + types[i]);
  }

  assertEqual(SS.getActiveEvents(state).length, 6, 'all 6 events active');

  // End all events
  for (var j = 0; j < types.length; j++) {
    SS.endEvent(state, 'evt_multi_' + j, 1000);
  }
  assertEqual(SS.getActiveEvents(state).length, 0, 'no active events after all ended');

  // Player watches multiple events simultaneously
  var state2 = freshState();
  SS.registerEvent(state2, 'ea', 'arena_match', 'ha', 'arena', 0);
  SS.registerEvent(state2, 'ef', 'festival', 'hf', 'commons', 0);

  var rA = SS.joinSpectator(state2, 'alice', 'ea', 10);
  var rF = SS.joinSpectator(state2, 'alice', 'ef', 10);
  assert(rA.success === true, 'alice can join arena_match');
  assert(rF.success === true, 'alice can join festival simultaneously');

  assertEqual(SS.getSpectatorCount(state2, 'ea'), 1, 'ea has 1 spectator');
  assertEqual(SS.getSpectatorCount(state2, 'ef'), 1, 'ef has 1 spectator');

  SS.leaveSpectator(state2, 'alice', 'ea', 100);
  SS.leaveSpectator(state2, 'alice', 'ef', 100);

  var aliceHistory = SS.getPlayerWatchHistory(state2, 'alice');
  assertEqual(aliceHistory.length, 2, 'alice history has 2 events watched');
});

// ============================================================================
// SECTION 25: Spectator Capacity Limit
// ============================================================================

suite('Spectator Capacity Limit', function() {
  // arena_match has maxSpectators=200, use a small limit by creating a
  // performance event and filling it with raid (maxSpectators=100)
  var state = freshState();
  // raid maxSpectators = 100; we'll test with a festival which is 500
  // Instead just verify the capacity enforcement is checked
  var m = makeEvent('raid', 'host1', 'wilds', 0);

  // Fill up to capacity (100 for raid)
  var players = [];
  for (var i = 0; i < 100; i++) {
    players.push('spectator_' + i);
  }
  joinN(m.state, m.eventId, players, 10);

  assertEqual(SS.getSpectatorCount(m.state, m.eventId), 100, 'raid filled to 100 spectators');

  // One more should fail
  var rOver = SS.joinSpectator(m.state, 'overflow_player', m.eventId, 10);
  assert(rOver.success === false, 'over-capacity join fails');
  assert(typeof rOver.reason === 'string', 'over-capacity has reason');

  // After one leaves, new can join
  SS.leaveSpectator(m.state, 'spectator_0', m.eventId, 50);
  var rNew = SS.joinSpectator(m.state, 'new_player', m.eventId, 60);
  assert(rNew.success === true, 'new player can join after one leaves');
});

// ============================================================================
// SECTION 26: Total Watch Ticks Accumulation
// ============================================================================

suite('Total Watch Ticks Accumulation', function() {
  var m = makeEvent('arena_match', 'host1', 'arena', 0);
  var state = m.state;
  var eventId = m.eventId;

  SS.joinSpectator(state, 'alice', eventId, 0);
  SS.joinSpectator(state, 'bob', eventId, 0);

  SS.leaveSpectator(state, 'alice', eventId, 100); // +100
  SS.leaveSpectator(state, 'bob', eventId, 200);   // +200

  var ev = state.events[eventId];
  assertEqual(ev.totalWatchTicks, 300, 'totalWatchTicks is 100+200=300');

  // endEvent forces remaining spectators to leave, accumulating their time
  SS.joinSpectator(state, 'carol', eventId, 200);
  SS.endEvent(state, eventId, 400); // carol was watching 200 ticks

  assertEqual(ev.totalWatchTicks, 500, 'totalWatchTicks is 300+200=500 after endEvent');
});

// ============================================================================
// RESULTS SUMMARY
// ============================================================================

console.log('\n========================================');
console.log('Spectator System Test Results');
console.log('========================================');
console.log('Total:  ' + (passed + failed));
console.log('Passed: ' + passed);
console.log('Failed: ' + failed);
console.log('========================================');

if (failures.length > 0) {
  console.log('\nFailures:');
  for (var fi = 0; fi < failures.length; fi++) {
    console.log('  ' + failures[fi]);
  }
}

if (failed > 0) {
  process.exit(1);
} else {
  console.log('All tests passed!');
  process.exit(0);
}
