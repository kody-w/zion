/**
 * Tests for src/js/narrative_threads.js
 * Run with: node tests/test_narrative_threads.js
 */

var NarrativeThreads = require('../src/js/narrative_threads');

var passed = 0;
var failed = 0;
var errors = [];

function assert(condition, msg) {
  if (condition) {
    passed++;
    process.stdout.write('  PASS: ' + msg + '\n');
  } else {
    failed++;
    errors.push(msg);
    process.stdout.write('  FAIL: ' + msg + '\n');
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

function assertIn(arr, item, msg) {
  assert(arr.indexOf(item) !== -1, msg + ' (' + JSON.stringify(item) + ' in array)');
}

function assertNotIn(arr, item, msg) {
  assert(arr.indexOf(item) === -1, msg + ' (' + JSON.stringify(item) + ' NOT in array)');
}

function makeState() {
  return {};
}

// Sequential player IDs
var playerSeq = 0;
function uid() {
  return 'player_' + (++playerSeq);
}

// ============================================================================
// SUITE 1: THREAD THEMES DATA INTEGRITY
// ============================================================================

console.log('\n== Suite 1: Thread Themes Data Integrity ==');

(function() {
  var themes = NarrativeThreads.getThemes();

  assert(Array.isArray(themes), 'getThemes returns array');
  assertEqual(themes.length, 10, 'Exactly 10 themes');

  var requiredFields = ['id', 'name', 'description', 'color'];
  themes.forEach(function(theme) {
    requiredFields.forEach(function(field) {
      assert(theme.hasOwnProperty(field), 'Theme ' + theme.id + ' has field: ' + field);
    });
  });

  // IDs are unique
  var ids = {};
  themes.forEach(function(theme) {
    assert(!ids[theme.id], 'Theme ID is unique: ' + theme.id);
    ids[theme.id] = true;
  });

  // Required theme IDs present
  var expectedIds = ['conflict', 'cooperation', 'mystery', 'discovery', 'growth',
                     'loss', 'celebration', 'journey', 'transformation', 'legacy'];
  expectedIds.forEach(function(eid) {
    assert(ids[eid] === true, 'Theme ID exists: ' + eid);
  });

  // Non-empty strings
  themes.forEach(function(theme) {
    assert(typeof theme.name === 'string' && theme.name.length > 0, 'Theme ' + theme.id + ' has non-empty name');
    assert(typeof theme.description === 'string' && theme.description.length > 0, 'Theme ' + theme.id + ' has non-empty description');
    assert(typeof theme.color === 'string' && theme.color.length > 0, 'Theme ' + theme.id + ' has non-empty color');
    assert(theme.color[0] === '#', 'Theme ' + theme.id + ' color starts with #');
  });
})();

// ============================================================================
// SUITE 2: TRIGGER TEMPLATES DATA INTEGRITY
// ============================================================================

console.log('\n== Suite 2: Trigger Templates Data Integrity ==');

(function() {
  var templates = NarrativeThreads.getTriggerTemplates();

  assert(Array.isArray(templates), 'getTriggerTemplates returns array');
  assertGTE(templates.length, 30, 'At least 30 trigger templates');

  var requiredFields = ['id', 'actionType', 'threadTheme', 'narrativeTemplate', 'followUpHooks'];
  templates.forEach(function(t) {
    requiredFields.forEach(function(field) {
      assert(t.hasOwnProperty(field), 'Template ' + t.id + ' has field: ' + field);
    });
  });

  // IDs are unique
  var ids = {};
  templates.forEach(function(t) {
    assert(!ids[t.id], 'Template ID is unique: ' + t.id);
    ids[t.id] = true;
  });

  // Valid theme refs
  var themeIds = {};
  NarrativeThreads.getThemes().forEach(function(th) { themeIds[th.id] = true; });

  templates.forEach(function(t) {
    assert(themeIds[t.threadTheme] === true, 'Template ' + t.id + ' has valid threadTheme: ' + t.threadTheme);
    assert(Array.isArray(t.followUpHooks), 'Template ' + t.id + ' followUpHooks is array');
    assertGTE(t.followUpHooks.length, 1, 'Template ' + t.id + ' has at least 1 followUpHook');
    assert(typeof t.narrativeTemplate === 'string' && t.narrativeTemplate.length > 0,
           'Template ' + t.id + ' has non-empty narrativeTemplate');
    assert(t.narrativeTemplate.indexOf('{playerName}') !== -1,
           'Template ' + t.id + ' narrativeTemplate contains {playerName}');
  });

  // Zone is null or valid zone string
  var validZones = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];
  templates.forEach(function(t) {
    assert(t.zone === null || validZones.indexOf(t.zone) !== -1,
           'Template ' + t.id + ' has valid zone: ' + t.zone);
  });
})();

// ============================================================================
// SUITE 3: TEMPLATE ZONE COVERAGE
// ============================================================================

console.log('\n== Suite 3: Template Zone Coverage ==');

(function() {
  var templates = NarrativeThreads.getTriggerTemplates();

  var zones = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];
  zones.forEach(function(zone) {
    var zoneTemplates = templates.filter(function(t) { return t.zone === zone; });
    assertGTE(zoneTemplates.length, 1, 'Zone ' + zone + ' has at least 1 template');
  });

  // Null zone templates (cross-zone) present
  var nullZone = templates.filter(function(t) { return t.zone === null; });
  assertGTE(nullZone.length, 3, 'At least 3 cross-zone (null) templates');
})();

// ============================================================================
// SUITE 4: createThread — basic flow
// ============================================================================

console.log('\n== Suite 4: createThread Basic Flow ==');

(function() {
  var state = makeState();
  var pid = uid();

  var result = NarrativeThreads.createThread(state, pid, 'plant', 'gardens', { playerName: 'Alice', itemName: 'roses' }, 100);

  assert(result.success === true, 'createThread succeeds for valid inputs');
  assert(result.thread !== undefined, 'createThread returns thread object');
  assert(typeof result.thread.id === 'string', 'Thread has string id');
  assert(result.thread.id.indexOf('thread_') === 0, 'Thread id starts with thread_');
  assertEqual(result.thread.theme, 'growth', 'Thread theme is growth for plant in gardens');
  assertEqual(result.thread.status, 'open', 'New thread starts as open');
  assert(Array.isArray(result.thread.beats), 'Thread has beats array');
  assertEqual(result.thread.beats.length, 1, 'New thread starts with 1 beat');
  assert(result.thread.beats[0].text.indexOf('Alice') !== -1, 'First beat contains player name');
  assert(result.thread.beats[0].text.indexOf('roses') !== -1, 'First beat contains item name');
  assertIn(result.thread.participants, pid, 'Creator is participant');
  assert(Array.isArray(result.thread.hooks), 'Thread has hooks array');
  assertGTE(result.thread.hooks.length, 1, 'Thread has at least 1 hook');
  assert(Array.isArray(result.thread.linkedThreads), 'Thread has linkedThreads array');
  assertEqual(result.thread.linkedThreads.length, 0, 'New thread has no linked threads');
  assertEqual(result.thread.createdAt, 100, 'Thread createdAt equals currentTick');
  assertEqual(result.thread.originAction.playerId, pid, 'originAction.playerId correct');
  assertEqual(result.thread.originAction.actionType, 'plant', 'originAction.actionType correct');
  assertEqual(result.thread.originAction.zone, 'gardens', 'originAction.zone correct');
  assertEqual(result.thread.originAction.tick, 100, 'originAction.tick correct');
})();

// ============================================================================
// SUITE 5: createThread — state management
// ============================================================================

console.log('\n== Suite 5: createThread State Management ==');

(function() {
  var state = makeState();
  var pid = uid();

  assert(!state.narrativeThreads, 'State has no narrativeThreads before first createThread');

  NarrativeThreads.createThread(state, pid, 'plant', 'gardens', {}, 0);

  assert(Array.isArray(state.narrativeThreads), 'State.narrativeThreads created automatically');
  assertEqual(state.narrativeThreads.length, 1, 'One thread in state after createThread');

  NarrativeThreads.createThread(state, pid, 'teach', 'athenaeum', {}, 0);

  assertEqual(state.narrativeThreads.length, 2, 'Two threads after second createThread');
})();

// ============================================================================
// SUITE 6: createThread — error cases
// ============================================================================

console.log('\n== Suite 6: createThread Error Cases ==');

(function() {
  var state = makeState();

  var r1 = NarrativeThreads.createThread(state, '', 'plant', 'gardens', {}, 0);
  assertEqual(r1.success, false, 'createThread fails with empty playerId');

  var r2 = NarrativeThreads.createThread(state, null, 'plant', 'gardens', {}, 0);
  assertEqual(r2.success, false, 'createThread fails with null playerId');

  var r3 = NarrativeThreads.createThread(state, uid(), '', 'gardens', {}, 0);
  assertEqual(r3.success, false, 'createThread fails with empty actionType');

  var r4 = NarrativeThreads.createThread(state, uid(), 'unknown_action_xyz', 'nexus', {}, 0);
  assertEqual(r4.success, false, 'createThread fails when no matching template');
  assert(typeof r4.error === 'string', 'Error message returned when no template');
})();

// ============================================================================
// SUITE 7: createThread — narrative template formatting
// ============================================================================

console.log('\n== Suite 7: createThread Narrative Template Formatting ==');

(function() {
  var state = makeState();
  var pid = uid();

  // With context
  var r1 = NarrativeThreads.createThread(state, pid, 'craft', 'studio', { playerName: 'Bob', itemName: 'sculpture' }, 50);
  assert(r1.success === true, 'createThread with craft in studio succeeds');
  assert(r1.thread.beats[0].text.indexOf('Bob') !== -1, 'Beat text contains playerName Bob');
  assert(r1.thread.beats[0].text.indexOf('sculpture') !== -1, 'Beat text contains itemName sculpture');

  // Without context — fallback values used
  var state2 = makeState();
  var r2 = NarrativeThreads.createThread(state2, uid(), 'plant', 'gardens', {}, 0);
  assert(r2.success === true, 'createThread without context succeeds');
  assert(r2.thread.beats[0].text.indexOf('A traveler') !== -1, 'Fallback playerName used');

  // join in nexus
  var state3 = makeState();
  var r3 = NarrativeThreads.createThread(state3, uid(), 'join', 'nexus', { playerName: 'Carol' }, 200);
  assert(r3.success === true, 'createThread for arrival in nexus succeeds');
  assertEqual(r3.thread.theme, 'journey', 'Journey theme for arrival');
})();

// ============================================================================
// SUITE 8: addBeat — basic flow
// ============================================================================

console.log('\n== Suite 8: addBeat Basic Flow ==');

(function() {
  var state = makeState();
  var pid1 = uid();
  var pid2 = uid();

  var cr = NarrativeThreads.createThread(state, pid1, 'plant', 'gardens', { playerName: 'Alice' }, 10);
  var threadId = cr.thread.id;

  var r = NarrativeThreads.addBeat(state, pid2, threadId, 'I came to help tend the garden.', 'garden_tend', 'gardens', 20);

  assert(r.success === true, 'addBeat succeeds for valid inputs');
  assert(r.beat !== undefined, 'addBeat returns beat');
  assertEqual(r.beat.playerId, pid2, 'Beat has correct playerId');
  assertEqual(r.beat.text, 'I came to help tend the garden.', 'Beat has correct text');
  assertEqual(r.beat.tick, 20, 'Beat has correct tick');
  assertEqual(r.beat.zone, 'gardens', 'Beat has correct zone');
  assertEqual(r.beat.actionType, 'garden_tend', 'Beat has correct actionType');

  var thread = NarrativeThreads.getThreadById(state, threadId);
  assertEqual(thread.beats.length, 2, 'Thread now has 2 beats');
  assertIn(thread.participants, pid2, 'pid2 is now a participant');
})();

// ============================================================================
// SUITE 9: addBeat — thread status promotion
// ============================================================================

console.log('\n== Suite 9: addBeat Thread Status Promotion ==');

(function() {
  var state = makeState();
  var pid1 = uid();
  var pid2 = uid();
  var pid3 = uid();

  var cr = NarrativeThreads.createThread(state, pid1, 'plant', 'gardens', {}, 0);
  var threadId = cr.thread.id;

  // Thread starts open
  var thread = NarrativeThreads.getThreadById(state, threadId);
  assertEqual(thread.status, 'open', 'Thread starts as open');

  // First beat from same player — still open
  NarrativeThreads.addBeat(state, pid1, threadId, 'Another thought...', null, 'gardens', 5);
  assertEqual(thread.status, 'open', 'Thread stays open when same player adds beat');

  // Beat from different player — promotes to active
  NarrativeThreads.addBeat(state, pid2, threadId, 'I join this story!', null, 'nexus', 10);
  assertEqual(thread.status, 'active', 'Thread promoted to active when 2nd participant joins via beat');

  // Third player
  NarrativeThreads.addBeat(state, pid3, threadId, 'And I as well!', null, 'agora', 15);
  assertEqual(thread.participants.length, 3, 'Three participants after three players');
})();

// ============================================================================
// SUITE 10: addBeat — error cases
// ============================================================================

console.log('\n== Suite 10: addBeat Error Cases ==');

(function() {
  var state = makeState();
  var pid = uid();
  var cr = NarrativeThreads.createThread(state, pid, 'plant', 'gardens', {}, 0);
  var threadId = cr.thread.id;

  var r1 = NarrativeThreads.addBeat(state, '', threadId, 'text', null, null, 0);
  assertEqual(r1.success, false, 'addBeat fails with empty playerId');

  var r2 = NarrativeThreads.addBeat(state, pid, '', 'text', null, null, 0);
  assertEqual(r2.success, false, 'addBeat fails with empty threadId');

  var r3 = NarrativeThreads.addBeat(state, pid, threadId, '', null, null, 0);
  assertEqual(r3.success, false, 'addBeat fails with empty text');

  var r4 = NarrativeThreads.addBeat(state, pid, threadId, '   ', null, null, 0);
  assertEqual(r4.success, false, 'addBeat fails with whitespace-only text');

  var r5 = NarrativeThreads.addBeat(state, pid, 'thread_nonexistent', 'text', null, null, 0);
  assertEqual(r5.success, false, 'addBeat fails for nonexistent thread');

  // Cannot add beat to concluded thread
  var state2 = makeState();
  var pid2 = uid();
  var cr2 = NarrativeThreads.createThread(state2, pid2, 'plant', 'gardens', {}, 0);
  NarrativeThreads.concludeThread(state2, pid2, cr2.thread.id, 'The end.', 10);
  var r6 = NarrativeThreads.addBeat(state2, pid2, cr2.thread.id, 'Too late!', null, null, 20);
  assertEqual(r6.success, false, 'addBeat fails for concluded thread');
})();

// ============================================================================
// SUITE 11: pickUpThread — basic flow
// ============================================================================

console.log('\n== Suite 11: pickUpThread Basic Flow ==');

(function() {
  var state = makeState();
  var pid1 = uid();
  var pid2 = uid();

  var cr = NarrativeThreads.createThread(state, pid1, 'discover', 'wilds', {}, 0);
  var threadId = cr.thread.id;

  var r = NarrativeThreads.pickUpThread(state, pid2, threadId);
  assert(r.success === true, 'pickUpThread succeeds');
  assert(r.thread !== undefined, 'pickUpThread returns thread');
  assertIn(r.thread.participants, pid2, 'pid2 added to participants');
  assertEqual(r.thread.status, 'active', 'Thread promoted to active with 2 participants');
})();

// ============================================================================
// SUITE 12: pickUpThread — error cases
// ============================================================================

console.log('\n== Suite 12: pickUpThread Error Cases ==');

(function() {
  var state = makeState();
  var pid1 = uid();
  var pid2 = uid();

  var cr = NarrativeThreads.createThread(state, pid1, 'plant', 'gardens', {}, 0);
  var threadId = cr.thread.id;

  // Already a participant
  var r1 = NarrativeThreads.pickUpThread(state, pid1, threadId);
  assertEqual(r1.success, false, 'pickUpThread fails if already participant');

  // Nonexistent thread
  var r2 = NarrativeThreads.pickUpThread(state, pid2, 'thread_nonexistent');
  assertEqual(r2.success, false, 'pickUpThread fails for nonexistent thread');

  // Cannot pick up concluded thread
  var state2 = makeState();
  var p1 = uid();
  var p2 = uid();
  var p3 = uid();
  var cr2 = NarrativeThreads.createThread(state2, p1, 'plant', 'gardens', {}, 0);
  NarrativeThreads.pickUpThread(state2, p2, cr2.thread.id);
  NarrativeThreads.concludeThread(state2, p1, cr2.thread.id, 'done', 5);
  var r3 = NarrativeThreads.pickUpThread(state2, p3, cr2.thread.id);
  assertEqual(r3.success, false, 'pickUpThread fails for concluded thread');

  // Missing playerId
  var r4 = NarrativeThreads.pickUpThread(state, '', threadId);
  assertEqual(r4.success, false, 'pickUpThread fails with empty playerId');

  // Missing threadId
  var r5 = NarrativeThreads.pickUpThread(state, pid2, '');
  assertEqual(r5.success, false, 'pickUpThread fails with empty threadId');
})();

// ============================================================================
// SUITE 13: concludeThread — basic flow
// ============================================================================

console.log('\n== Suite 13: concludeThread Basic Flow ==');

(function() {
  var state = makeState();
  var pid1 = uid();
  var pid2 = uid();

  var cr = NarrativeThreads.createThread(state, pid1, 'plant', 'gardens', {}, 0);
  var threadId = cr.thread.id;
  NarrativeThreads.pickUpThread(state, pid2, threadId);

  var r = NarrativeThreads.concludeThread(state, pid1, threadId, 'The garden bloomed and fed all.', 50);

  assert(r.success === true, 'concludeThread succeeds');
  assert(r.thread !== undefined, 'concludeThread returns thread');
  assertEqual(r.thread.status, 'concluded', 'Thread status is concluded');
  assertEqual(r.thread.conclusion, 'The garden bloomed and fed all.', 'Thread conclusion text set');
  assertEqual(r.thread.concludedBy, pid1, 'concludedBy set to concluding player');
  assertEqual(r.thread.concludedAt, 50, 'concludedAt set to currentTick');
  assert(Array.isArray(r.participants), 'returns participants array');
  assertIn(r.participants, pid1, 'pid1 in returned participants');
  assertIn(r.participants, pid2, 'pid2 in returned participants');

  // Conclusion beat added
  var lastBeat = r.thread.beats[r.thread.beats.length - 1];
  assert(lastBeat.text.indexOf('CONCLUSION') !== -1, 'Conclusion beat added with CONCLUSION marker');
  assertEqual(lastBeat.actionType, 'conclude', 'Conclusion beat has actionType conclude');
})();

// ============================================================================
// SUITE 14: concludeThread — error cases
// ============================================================================

console.log('\n== Suite 14: concludeThread Error Cases ==');

(function() {
  var state = makeState();
  var pid1 = uid();
  var pid2 = uid();

  var cr = NarrativeThreads.createThread(state, pid1, 'plant', 'gardens', {}, 0);
  var threadId = cr.thread.id;

  // Non-participant cannot conclude
  var r1 = NarrativeThreads.concludeThread(state, pid2, threadId, 'done', 10);
  assertEqual(r1.success, false, 'Non-participant cannot conclude thread');

  // Empty conclusion
  var r2 = NarrativeThreads.concludeThread(state, pid1, threadId, '', 10);
  assertEqual(r2.success, false, 'Empty conclusion fails');

  // Missing threadId
  var r3 = NarrativeThreads.concludeThread(state, pid1, '', 'done', 10);
  assertEqual(r3.success, false, 'Missing threadId fails');

  // Cannot re-conclude
  NarrativeThreads.concludeThread(state, pid1, threadId, 'final conclusion', 10);
  var r4 = NarrativeThreads.concludeThread(state, pid1, threadId, 'another ending', 20);
  assertEqual(r4.success, false, 'Cannot re-conclude an already concluded thread');
})();

// ============================================================================
// SUITE 15: linkThreads
// ============================================================================

console.log('\n== Suite 15: linkThreads ==');

(function() {
  var state = makeState();
  var pid = uid();

  var r1 = NarrativeThreads.createThread(state, pid, 'plant', 'gardens', {}, 0);
  var r2 = NarrativeThreads.createThread(state, pid, 'teach', 'athenaeum', {}, 10);

  var idA = r1.thread.id;
  var idB = r2.thread.id;

  var link = NarrativeThreads.linkThreads(state, idA, idB);
  assert(link.success === true, 'linkThreads succeeds');

  var threadA = NarrativeThreads.getThreadById(state, idA);
  var threadB = NarrativeThreads.getThreadById(state, idB);

  assertIn(threadA.linkedThreads, idB, 'Thread A links to Thread B');
  assertIn(threadB.linkedThreads, idA, 'Thread B links to Thread A');

  // Linking again is idempotent
  NarrativeThreads.linkThreads(state, idA, idB);
  assertEqual(threadA.linkedThreads.length, 1, 'No duplicate link on re-link A->B');
  assertEqual(threadB.linkedThreads.length, 1, 'No duplicate link on re-link B->A');
})();

// ============================================================================
// SUITE 16: linkThreads — error cases
// ============================================================================

console.log('\n== Suite 16: linkThreads Error Cases ==');

(function() {
  var state = makeState();
  var pid = uid();
  var cr = NarrativeThreads.createThread(state, pid, 'plant', 'gardens', {}, 0);
  var threadId = cr.thread.id;

  // Self-link
  var r1 = NarrativeThreads.linkThreads(state, threadId, threadId);
  assertEqual(r1.success, false, 'Cannot link thread to itself');

  // Nonexistent thread
  var r2 = NarrativeThreads.linkThreads(state, threadId, 'thread_xyz');
  assertEqual(r2.success, false, 'Cannot link to nonexistent thread');

  var r3 = NarrativeThreads.linkThreads(state, 'thread_xyz', threadId);
  assertEqual(r3.success, false, 'Cannot link from nonexistent thread');

  // Missing IDs
  var r4 = NarrativeThreads.linkThreads(state, '', threadId);
  assertEqual(r4.success, false, 'Missing first threadId fails');

  var r5 = NarrativeThreads.linkThreads(state, threadId, '');
  assertEqual(r5.success, false, 'Missing second threadId fails');
})();

// ============================================================================
// SUITE 17: getOpenThreads
// ============================================================================

console.log('\n== Suite 17: getOpenThreads ==');

(function() {
  var state = makeState();
  var pid = uid();

  var r1 = NarrativeThreads.createThread(state, pid, 'plant', 'gardens', {}, 0);
  var r2 = NarrativeThreads.createThread(state, pid, 'teach', 'athenaeum', {}, 0);
  var r3 = NarrativeThreads.createThread(state, pid, 'craft', 'studio', {}, 0);

  // Make r3 active
  var p2 = uid();
  NarrativeThreads.pickUpThread(state, p2, r3.thread.id);

  var open = NarrativeThreads.getOpenThreads(state);
  assertEqual(open.length, 2, 'Two open threads (r1 and r2)');

  open.forEach(function(t) {
    assertEqual(t.status, 'open', 'getOpenThreads returns only open threads');
  });

  // With zone filter
  var openGardens = NarrativeThreads.getOpenThreads(state, 'gardens');
  assertEqual(openGardens.length, 1, 'One open thread in gardens');
  assertEqual(openGardens[0].originAction.zone, 'gardens', 'Filtered thread is in gardens');

  var openArena = NarrativeThreads.getOpenThreads(state, 'arena');
  assertEqual(openArena.length, 0, 'No open threads in arena');
})();

// ============================================================================
// SUITE 18: getActiveThreads
// ============================================================================

console.log('\n== Suite 18: getActiveThreads ==');

(function() {
  var state = makeState();
  var pid1 = uid();
  var pid2 = uid();
  var pid3 = uid();

  var r1 = NarrativeThreads.createThread(state, pid1, 'plant', 'gardens', {}, 0);
  var r2 = NarrativeThreads.createThread(state, pid2, 'teach', 'athenaeum', {}, 0);
  NarrativeThreads.pickUpThread(state, pid3, r1.thread.id); // makes r1 active
  NarrativeThreads.pickUpThread(state, pid1, r2.thread.id); // makes r2 active

  var active = NarrativeThreads.getActiveThreads(state);
  assertEqual(active.length, 2, 'Two active threads');
  active.forEach(function(t) {
    assertEqual(t.status, 'active', 'getActiveThreads returns only active threads');
  });

  // With player filter
  var pid1Active = NarrativeThreads.getActiveThreads(state, pid1);
  assertEqual(pid1Active.length, 2, 'pid1 is in 2 active threads');

  var pid2Active = NarrativeThreads.getActiveThreads(state, pid2);
  assertEqual(pid2Active.length, 1, 'pid2 is in 1 active thread');

  var pid3Active = NarrativeThreads.getActiveThreads(state, pid3);
  assertEqual(pid3Active.length, 1, 'pid3 is in 1 active thread');
})();

// ============================================================================
// SUITE 19: getThreadById
// ============================================================================

console.log('\n== Suite 19: getThreadById ==');

(function() {
  var state = makeState();
  var pid = uid();

  var cr = NarrativeThreads.createThread(state, pid, 'plant', 'gardens', {}, 0);
  var threadId = cr.thread.id;

  var found = NarrativeThreads.getThreadById(state, threadId);
  assert(found !== null, 'getThreadById returns thread for valid ID');
  assertEqual(found.id, threadId, 'getThreadById returns correct thread');

  var missing = NarrativeThreads.getThreadById(state, 'thread_nonexistent');
  assert(missing === null, 'getThreadById returns null for unknown ID');

  // State without narrativeThreads
  var emptyState = {};
  var r = NarrativeThreads.getThreadById(emptyState, threadId);
  assert(r === null, 'getThreadById returns null on empty state');
})();

// ============================================================================
// SUITE 20: getThreadsByTheme
// ============================================================================

console.log('\n== Suite 20: getThreadsByTheme ==');

(function() {
  var state = makeState();
  var pid = uid();

  NarrativeThreads.createThread(state, pid, 'plant', 'gardens', {}, 0);  // growth
  NarrativeThreads.createThread(state, pid, 'teach', 'athenaeum', {}, 0); // legacy
  NarrativeThreads.createThread(state, pid, 'garden_tend', 'gardens', {}, 0); // cooperation

  var growthThreads = NarrativeThreads.getThreadsByTheme(state, 'growth');
  assertEqual(growthThreads.length, 1, 'One growth thread');
  assertEqual(growthThreads[0].theme, 'growth', 'Returned thread has growth theme');

  var legacyThreads = NarrativeThreads.getThreadsByTheme(state, 'legacy');
  assertEqual(legacyThreads.length, 1, 'One legacy thread');

  var missingTheme = NarrativeThreads.getThreadsByTheme(state, 'nonexistent_theme');
  assertEqual(missingTheme.length, 0, 'No threads for nonexistent theme');
})();

// ============================================================================
// SUITE 21: getPlayerThreads
// ============================================================================

console.log('\n== Suite 21: getPlayerThreads ==');

(function() {
  var state = makeState();
  var pid1 = uid();
  var pid2 = uid();

  var r1 = NarrativeThreads.createThread(state, pid1, 'plant', 'gardens', {}, 0);
  var r2 = NarrativeThreads.createThread(state, pid2, 'teach', 'athenaeum', {}, 0);
  NarrativeThreads.pickUpThread(state, pid1, r2.thread.id);

  var pid1Threads = NarrativeThreads.getPlayerThreads(state, pid1);
  assertEqual(pid1Threads.length, 2, 'pid1 is in 2 threads');

  var pid2Threads = NarrativeThreads.getPlayerThreads(state, pid2);
  assertEqual(pid2Threads.length, 1, 'pid2 is in 1 thread');

  var unknownThreads = NarrativeThreads.getPlayerThreads(state, uid());
  assertEqual(unknownThreads.length, 0, 'Unknown player has 0 threads');

  var emptyId = NarrativeThreads.getPlayerThreads(state, '');
  assertEqual(emptyId.length, 0, 'Empty playerId returns empty array');
})();

// ============================================================================
// SUITE 22: searchThreads
// ============================================================================

console.log('\n== Suite 22: searchThreads ==');

(function() {
  var state = makeState();
  var pid = uid();

  NarrativeThreads.createThread(state, pid, 'plant', 'gardens', { playerName: 'Alice', itemName: 'moonflower' }, 0);
  NarrativeThreads.createThread(state, pid, 'teach', 'athenaeum', { playerName: 'Bob' }, 0);
  NarrativeThreads.createThread(state, pid, 'discover', 'wilds', { playerName: 'Carol' }, 0);

  // Search by beat text content
  var moonSearch = NarrativeThreads.searchThreads(state, 'moonflower');
  assertEqual(moonSearch.length, 1, 'Search for moonflower finds 1 thread');

  // Search by theme
  var growthSearch = NarrativeThreads.searchThreads(state, 'growth');
  assertGTE(growthSearch.length, 1, 'Search for growth finds at least 1 thread');

  // Search by zone
  var wildSearch = NarrativeThreads.searchThreads(state, 'wilds');
  assertEqual(wildSearch.length, 1, 'Search for wilds finds 1 thread');

  // Empty query
  var emptySearch = NarrativeThreads.searchThreads(state, '');
  assertEqual(emptySearch.length, 0, 'Empty query returns empty array');

  // No match
  var noMatch = NarrativeThreads.searchThreads(state, 'xyzzy_nomatch_123');
  assertEqual(noMatch.length, 0, 'No match returns empty array');

  // Search by player name in beats
  var aliceSearch = NarrativeThreads.searchThreads(state, 'Alice');
  assertEqual(aliceSearch.length, 1, 'Search for Alice finds 1 thread');

  // Case-insensitive
  var lowSearch = NarrativeThreads.searchThreads(state, 'alice');
  assertEqual(lowSearch.length, 1, 'Case-insensitive search for alice finds 1 thread');
})();

// ============================================================================
// SUITE 23: getThreadHistory
// ============================================================================

console.log('\n== Suite 23: getThreadHistory ==');

(function() {
  var state = makeState();
  var pid = uid();

  NarrativeThreads.createThread(state, pid, 'plant', 'gardens', {}, 100);
  NarrativeThreads.createThread(state, pid, 'teach', 'athenaeum', {}, 200);
  NarrativeThreads.createThread(state, pid, 'discover', 'wilds', {}, 300);
  NarrativeThreads.createThread(state, pid, 'gift', 'commons', {}, 400);

  var all = NarrativeThreads.getThreadHistory(state, 0, 500);
  assertEqual(all.length, 4, 'getThreadHistory returns all 4 threads in range 0-500');

  var mid = NarrativeThreads.getThreadHistory(state, 150, 350);
  assertEqual(mid.length, 2, 'getThreadHistory returns 2 threads in range 150-350');

  var early = NarrativeThreads.getThreadHistory(state, 0, 100);
  assertEqual(early.length, 1, 'getThreadHistory returns 1 thread in range 0-100');

  var none = NarrativeThreads.getThreadHistory(state, 500, 600);
  assertEqual(none.length, 0, 'getThreadHistory returns empty for range with no threads');
})();

// ============================================================================
// SUITE 24: suggestThreads
// ============================================================================

console.log('\n== Suite 24: suggestThreads ==');

(function() {
  var state = makeState();
  var pid1 = uid();
  var pid2 = uid();

  // Create threads with follow-up hooks
  var cr1 = NarrativeThreads.createThread(state, pid1, 'plant', 'gardens', {}, 0);  // hooks include tend_garden
  var cr2 = NarrativeThreads.createThread(state, pid1, 'teach', 'athenaeum', {}, 0); // hooks include learn_more

  // Suggest for pid2 who is going to plant in gardens
  var suggestions = NarrativeThreads.suggestThreads(state, pid2, 'gardens', 'plant');

  assert(Array.isArray(suggestions), 'suggestThreads returns array');
  assertGTE(suggestions.length, 1, 'suggestThreads returns at least 1 suggestion for gardens/plant');

  // Suggestions exclude threads pid2 is already in
  NarrativeThreads.pickUpThread(state, pid2, cr1.thread.id);
  var suggAfterJoin = NarrativeThreads.suggestThreads(state, pid2, 'gardens', 'plant');
  var threadIds = suggAfterJoin.map(function(t) { return t.id; });
  assertNotIn(threadIds, cr1.thread.id, 'Already-joined thread not suggested');

  // No suggestions for concluded threads
  NarrativeThreads.concludeThread(state, pid1, cr2.thread.id, 'Concluded.', 10);
  var suggNoConc = NarrativeThreads.suggestThreads(state, pid2, 'athenaeum', 'teach');
  var concIds = suggNoConc.map(function(t) { return t.id; });
  assertNotIn(concIds, cr2.thread.id, 'Concluded thread not suggested');
})();

// ============================================================================
// SUITE 25: getParticipantStats
// ============================================================================

console.log('\n== Suite 25: getParticipantStats ==');

(function() {
  var state = makeState();
  var pid1 = uid();
  var pid2 = uid();

  // pid1 creates 2 threads
  var r1 = NarrativeThreads.createThread(state, pid1, 'plant', 'gardens', {}, 0);
  var r2 = NarrativeThreads.createThread(state, pid1, 'teach', 'athenaeum', {}, 0);

  // pid2 joins r1, adds a beat
  NarrativeThreads.pickUpThread(state, pid2, r1.thread.id);
  NarrativeThreads.addBeat(state, pid2, r1.thread.id, 'I help!', null, 'gardens', 5);

  // pid1 concludes r1
  NarrativeThreads.concludeThread(state, pid1, r1.thread.id, 'Done.', 10);

  var pid1Stats = NarrativeThreads.getParticipantStats(state, pid1);
  assertEqual(pid1Stats.threadsParticipated, 2, 'pid1 participated in 2 threads');
  assertGTE(pid1Stats.beatsContributed, 2, 'pid1 contributed at least 2 beats (origin beats)');
  assertEqual(pid1Stats.threadsConcluded, 1, 'pid1 concluded 1 thread');
  assertEqual(pid1Stats.threadsStarted, 2, 'pid1 started 2 threads');

  var pid2Stats = NarrativeThreads.getParticipantStats(state, pid2);
  assertEqual(pid2Stats.threadsParticipated, 1, 'pid2 participated in 1 thread');
  assertEqual(pid2Stats.beatsContributed, 1, 'pid2 contributed 1 beat');
  assertEqual(pid2Stats.threadsConcluded, 0, 'pid2 concluded 0 threads');
  assertEqual(pid2Stats.threadsStarted, 0, 'pid2 started 0 threads');

  // Unknown player
  var unknown = NarrativeThreads.getParticipantStats(state, uid());
  assertEqual(unknown.threadsParticipated, 0, 'Unknown player: 0 participated');
  assertEqual(unknown.beatsContributed, 0, 'Unknown player: 0 beats');
  assertEqual(unknown.threadsConcluded, 0, 'Unknown player: 0 concluded');
  assertEqual(unknown.threadsStarted, 0, 'Unknown player: 0 started');

  // Empty playerId
  var emptyStats = NarrativeThreads.getParticipantStats(state, '');
  assertEqual(emptyStats.threadsParticipated, 0, 'Empty playerId returns zero stats');
})();

// ============================================================================
// SUITE 26: getWorldNarrative
// ============================================================================

console.log('\n== Suite 26: getWorldNarrative ==');

(function() {
  var state = makeState();
  var pid = uid();
  var pid2 = uid();

  NarrativeThreads.createThread(state, pid, 'plant', 'gardens', {}, 10);
  NarrativeThreads.createThread(state, pid, 'teach', 'athenaeum', {}, 20);
  var r3 = NarrativeThreads.createThread(state, pid, 'discover', 'wilds', {}, 30);
  NarrativeThreads.addBeat(state, pid2, r3.thread.id, 'Fascinating!', null, 'wilds', 35);

  var feed = NarrativeThreads.getWorldNarrative(state, 3);
  assert(Array.isArray(feed), 'getWorldNarrative returns array');
  assertLTE(feed.length, 3, 'getWorldNarrative respects count limit');

  feed.forEach(function(event) {
    assert(event.threadId !== undefined, 'World narrative event has threadId');
    assert(event.theme !== undefined, 'World narrative event has theme');
    assert(event.beat !== undefined, 'World narrative event has beat');
    assert(event.beat.tick !== undefined, 'Beat has tick');
  });

  // Sorted newest first
  if (feed.length >= 2) {
    for (var i = 0; i < feed.length - 1; i++) {
      assert(feed[i].beat.tick >= feed[i + 1].beat.tick, 'World narrative sorted newest first');
    }
  }

  // Default count
  var allState = makeState();
  var allPid = uid();
  for (var j = 0; j < 15; j++) {
    NarrativeThreads.createThread(allState, allPid, 'plant', 'gardens', {}, j);
  }
  var defaultFeed = NarrativeThreads.getWorldNarrative(allState);
  assertLTE(defaultFeed.length, 10, 'Default count is 10');
})();

// ============================================================================
// SUITE 27: archiveThread
// ============================================================================

console.log('\n== Suite 27: archiveThread ==');

(function() {
  var state = makeState();
  var pid = uid();

  var cr = NarrativeThreads.createThread(state, pid, 'plant', 'gardens', {}, 0);
  var threadId = cr.thread.id;

  var r = NarrativeThreads.archiveThread(state, threadId);
  assert(r.success === true, 'archiveThread succeeds');
  assertEqual(r.thread.status, 'archived', 'Thread status is archived');

  // Cannot archive again
  var r2 = NarrativeThreads.archiveThread(state, threadId);
  assertEqual(r2.success, false, 'Cannot archive already archived thread');

  // Missing threadId
  var r3 = NarrativeThreads.archiveThread(state, '');
  assertEqual(r3.success, false, 'archiveThread fails with empty threadId');

  // Nonexistent
  var r4 = NarrativeThreads.archiveThread(state, 'thread_nonexistent');
  assertEqual(r4.success, false, 'archiveThread fails for nonexistent thread');

  // Archived threads cannot have beats added
  var state2 = makeState();
  var p1 = uid();
  var cr2 = NarrativeThreads.createThread(state2, p1, 'plant', 'gardens', {}, 0);
  NarrativeThreads.archiveThread(state2, cr2.thread.id);
  var beatR = NarrativeThreads.addBeat(state2, p1, cr2.thread.id, 'late addition', null, null, 5);
  assertEqual(beatR.success, false, 'Cannot add beat to archived thread');
})();

// ============================================================================
// SUITE 28: getNarrativeArc
// ============================================================================

console.log('\n== Suite 28: getNarrativeArc ==');

(function() {
  var state = makeState();
  var pid = uid();

  var r1 = NarrativeThreads.createThread(state, pid, 'plant', 'gardens', {}, 0);
  var r2 = NarrativeThreads.createThread(state, pid, 'teach', 'athenaeum', {}, 0);
  var r3 = NarrativeThreads.createThread(state, pid, 'discover', 'wilds', {}, 0);

  NarrativeThreads.linkThreads(state, r1.thread.id, r2.thread.id);
  NarrativeThreads.linkThreads(state, r2.thread.id, r3.thread.id);

  var arc = NarrativeThreads.getNarrativeArc(state, r1.thread.id);

  assert(arc.rootThread !== null, 'getNarrativeArc returns rootThread');
  assertEqual(arc.rootThread.id, r1.thread.id, 'rootThread is the starting thread');
  assert(Array.isArray(arc.arc), 'getNarrativeArc returns arc array');
  assertEqual(arc.arc.length, 3, 'Arc includes all 3 linked threads');

  var arcIds = arc.arc.map(function(t) { return t.id; });
  assertIn(arcIds, r1.thread.id, 'Arc includes r1');
  assertIn(arcIds, r2.thread.id, 'Arc includes r2');
  assertIn(arcIds, r3.thread.id, 'Arc includes r3');
})();

// ============================================================================
// SUITE 29: getNarrativeArc — error and edge cases
// ============================================================================

console.log('\n== Suite 29: getNarrativeArc Edge Cases ==');

(function() {
  var state = makeState();
  var pid = uid();

  // Single thread, no links
  var cr = NarrativeThreads.createThread(state, pid, 'plant', 'gardens', {}, 0);
  var solo = NarrativeThreads.getNarrativeArc(state, cr.thread.id);
  assertEqual(solo.arc.length, 1, 'Solo thread arc has length 1');

  // Nonexistent thread
  var missing = NarrativeThreads.getNarrativeArc(state, 'thread_xyz');
  assert(missing.rootThread === null, 'getNarrativeArc returns null rootThread for nonexistent');
  assertEqual(missing.arc.length, 0, 'getNarrativeArc returns empty arc for nonexistent');
  assert(typeof missing.error === 'string', 'Error message returned for nonexistent thread');

  // Missing threadId
  var noId = NarrativeThreads.getNarrativeArc(state, '');
  assert(noId.rootThread === null, 'getNarrativeArc with empty threadId returns null');
  assert(typeof noId.error === 'string', 'Error message returned for empty threadId');

  // No infinite loop on circular links (BFS deduplication)
  var state2 = makeState();
  var p2 = uid();
  var c1 = NarrativeThreads.createThread(state2, p2, 'plant', 'gardens', {}, 0);
  var c2 = NarrativeThreads.createThread(state2, p2, 'teach', 'athenaeum', {}, 0);
  NarrativeThreads.linkThreads(state2, c1.thread.id, c2.thread.id);
  // linkThreads already creates bidirectional links — BFS must not loop
  var circArc = NarrativeThreads.getNarrativeArc(state2, c1.thread.id);
  assertEqual(circArc.arc.length, 2, 'Circular link arc handled correctly (no infinite loop)');
})();

// ============================================================================
// SUITE 30: FULL NARRATIVE WORKFLOW
// ============================================================================

console.log('\n== Suite 30: Full Narrative Workflow ==');

(function() {
  var state = makeState();
  var alice = uid();
  var bob = uid();
  var carol = uid();

  // Alice starts a thread by planting in gardens
  var cr = NarrativeThreads.createThread(state, alice, 'plant', 'gardens',
    { playerName: 'Alice', itemName: 'moon lilies' }, 100);
  assert(cr.success, 'Alice creates garden thread');
  var threadId = cr.thread.id;

  // Bob picks up the thread
  NarrativeThreads.pickUpThread(state, bob, threadId);
  var thread = NarrativeThreads.getThreadById(state, threadId);
  assertEqual(thread.status, 'active', 'Thread active after Bob joins');

  // Carol adds a beat
  NarrativeThreads.addBeat(state, carol, threadId, 'I watered the moon lilies at dusk.', 'garden_tend', 'gardens', 150);
  assertIn(thread.participants, carol, 'Carol is now participant');

  // Bob adds a beat
  NarrativeThreads.addBeat(state, bob, threadId, 'And I built a small fence to protect them.', 'build', 'gardens', 160);

  // Alice concludes
  var conc = NarrativeThreads.concludeThread(state, alice, threadId, 'The moon lilies bloomed and were shared with all of ZION.', 200);
  assertEqual(conc.success, true, 'Alice concludes the thread');
  assertEqual(thread.status, 'concluded', 'Thread is concluded');

  // Stats check
  var aliceStats = NarrativeThreads.getParticipantStats(state, alice);
  assertEqual(aliceStats.threadsConcluded, 1, 'Alice has 1 concluded thread');
  assertEqual(aliceStats.threadsStarted, 1, 'Alice started 1 thread');

  // Archive
  var arch = NarrativeThreads.archiveThread(state, threadId);
  assertEqual(arch.success, true, 'Thread archived');
  assertEqual(thread.status, 'archived', 'Thread status is archived');
})();

// ============================================================================
// SUITE 31: MULTI-THREAD ARC NARRATIVE
// ============================================================================

console.log('\n== Suite 31: Multi-Thread Arc Narrative ==');

(function() {
  var state = makeState();
  var pid = uid();
  var pid2 = uid();

  // Create a chain of related threads
  var t1 = NarrativeThreads.createThread(state, pid, 'join', 'nexus', { playerName: 'Wanderer' }, 1);
  var t2 = NarrativeThreads.createThread(state, pid, 'discover', 'wilds', { playerName: 'Wanderer' }, 50);
  var t3 = NarrativeThreads.createThread(state, pid, 'teach', 'athenaeum', { playerName: 'Wanderer' }, 100);

  NarrativeThreads.linkThreads(state, t1.thread.id, t2.thread.id);
  NarrativeThreads.linkThreads(state, t2.thread.id, t3.thread.id);

  var arc = NarrativeThreads.getNarrativeArc(state, t1.thread.id);
  assertEqual(arc.arc.length, 3, 'Full arc has 3 threads');

  // World narrative shows most recent events
  NarrativeThreads.addBeat(state, pid2, t3.thread.id, 'The knowledge was shared far and wide.', null, 'athenaeum', 120);

  var world = NarrativeThreads.getWorldNarrative(state, 5);
  assertGTE(world.length, 1, 'World narrative has events');

  // Search the arc
  var search = NarrativeThreads.searchThreads(state, 'Wanderer');
  assertGTE(search.length, 3, 'Searching for Wanderer finds all 3 threads');
})();

// ============================================================================
// SUITE 32: EXPOSE CONSTANTS
// ============================================================================

console.log('\n== Suite 32: Exposed Constants ==');

(function() {
  assert(Array.isArray(NarrativeThreads._THREAD_THEMES), '_THREAD_THEMES is exposed');
  assert(Array.isArray(NarrativeThreads._TRIGGER_TEMPLATES), '_TRIGGER_TEMPLATES is exposed');
  assert(Array.isArray(NarrativeThreads._VALID_STATUSES), '_VALID_STATUSES is exposed');
  assert(Array.isArray(NarrativeThreads._VALID_ZONES), '_VALID_ZONES is exposed');

  assertEqual(NarrativeThreads._THREAD_THEMES.length, 10, '_THREAD_THEMES has 10 entries');
  assertGTE(NarrativeThreads._TRIGGER_TEMPLATES.length, 30, '_TRIGGER_TEMPLATES has 30+ entries');

  var statuses = NarrativeThreads._VALID_STATUSES;
  assertIn(statuses, 'open', 'VALID_STATUSES contains open');
  assertIn(statuses, 'active', 'VALID_STATUSES contains active');
  assertIn(statuses, 'concluded', 'VALID_STATUSES contains concluded');
  assertIn(statuses, 'archived', 'VALID_STATUSES contains archived');
})();

// ============================================================================
// SUITE 33: THREAD ID UNIQUENESS ACROSS STATE
// ============================================================================

console.log('\n== Suite 33: Thread ID Uniqueness ==');

(function() {
  var state = makeState();
  var pid = uid();
  var ids = {};

  // Create many threads
  var actions = [
    ['plant', 'gardens'], ['teach', 'athenaeum'], ['craft', 'studio'],
    ['discover', 'wilds'], ['say', 'agora'], ['gift', 'commons'],
    ['challenge', 'arena'], ['join', 'nexus'], ['harvest', 'gardens'],
    ['build', 'commons']
  ];

  actions.forEach(function(pair) {
    var r = NarrativeThreads.createThread(state, pid, pair[0], pair[1], {}, 0);
    if (r.success) {
      assert(!ids[r.thread.id], 'Thread ID is unique: ' + r.thread.id);
      ids[r.thread.id] = true;
    }
  });

  assertGTE(Object.keys(ids).length, 5, 'Created at least 5 unique thread IDs');
})();

// ============================================================================
// SUITE 34: THREAD BEAT TEXT TRIMMING
// ============================================================================

console.log('\n== Suite 34: Beat Text Trimming ==');

(function() {
  var state = makeState();
  var pid = uid();
  var pid2 = uid();

  var cr = NarrativeThreads.createThread(state, pid, 'plant', 'gardens', {}, 0);
  NarrativeThreads.pickUpThread(state, pid2, cr.thread.id);

  // Padded text gets trimmed
  var r = NarrativeThreads.addBeat(state, pid2, cr.thread.id, '  hello world  ', null, null, 5);
  assertEqual(r.success, true, 'addBeat with padded text succeeds');
  assertEqual(r.beat.text, 'hello world', 'Beat text is trimmed');
})();

// ============================================================================
// SUITE 35: PARTICIPANT DEDUPLICATION
// ============================================================================

console.log('\n== Suite 35: Participant Deduplication ==');

(function() {
  var state = makeState();
  var pid = uid();
  var pid2 = uid();

  var cr = NarrativeThreads.createThread(state, pid, 'plant', 'gardens', {}, 0);
  NarrativeThreads.addBeat(state, pid2, cr.thread.id, 'First beat!', null, null, 1);
  NarrativeThreads.addBeat(state, pid2, cr.thread.id, 'Second beat!', null, null, 2);
  NarrativeThreads.addBeat(state, pid2, cr.thread.id, 'Third beat!', null, null, 3);

  var thread = NarrativeThreads.getThreadById(state, cr.thread.id);
  assertEqual(thread.participants.length, 2, 'Participants are deduplicated even after multiple beats');
  assertEqual(thread.beats.length, 4, 'All beats are recorded (1 origin + 3 added)');
})();

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n' + '='.repeat(50));
console.log('Total: ' + (passed + failed) + ' | Passed: ' + passed + ' | Failed: ' + failed);

if (errors.length > 0) {
  console.log('\nFailed tests:');
  errors.forEach(function(e) {
    console.log('  - ' + e);
  });
}

if (failed === 0) {
  console.log('\nAll tests passed!');
  process.exit(0);
} else {
  console.log('\nSome tests failed!');
  process.exit(1);
}
