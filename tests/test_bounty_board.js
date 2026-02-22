/**
 * tests/test_bounty_board.js
 * 135+ tests for the ZION Bounty Board system.
 * Standalone runner — no external test framework required.
 * Run with: node tests/test_bounty_board.js
 */

'use strict';

var BountyBoard = require('../src/js/bounty_board');

var passed = 0;
var failed = 0;
var failures = [];

function assert(condition, msg) {
  if (!condition) {
    var err = new Error(msg || 'Assertion failed');
    throw err;
  }
}

function assertEqual(a, b, msg) {
  if (a !== b) {
    throw new Error((msg || 'Expected equality') + ': got ' + JSON.stringify(a) + ' !== ' + JSON.stringify(b));
  }
}

function assertNotEqual(a, b, msg) {
  if (a === b) {
    throw new Error((msg || 'Expected inequality') + ': both are ' + JSON.stringify(a));
  }
}

function assertNull(val, msg) {
  if (val !== null && val !== undefined) {
    throw new Error((msg || 'Expected null/undefined') + ': got ' + JSON.stringify(val));
  }
}

function assertNotNull(val, msg) {
  if (val === null || val === undefined) {
    throw new Error((msg || 'Expected non-null') + ': got ' + JSON.stringify(val));
  }
}

function assertGreater(a, b, msg) {
  if (!(a > b)) {
    throw new Error((msg || 'Expected ' + a + ' > ' + b) + ': got ' + JSON.stringify(a));
  }
}

function assertGTE(a, b, msg) {
  if (!(a >= b)) {
    throw new Error((msg || 'Expected ' + a + ' >= ' + b) + ': got ' + JSON.stringify(a));
  }
}

function assertArrayLength(arr, len, msg) {
  if (!Array.isArray(arr)) throw new Error((msg || 'Expected array') + ': got ' + typeof arr);
  if (arr.length !== len) {
    throw new Error((msg || 'Expected length ' + len) + ': got ' + arr.length);
  }
}

function test(name, fn) {
  try {
    fn();
    passed++;
    process.stdout.write('  PASS ' + name + '\n');
  } catch (e) {
    failed++;
    failures.push({ name: name, error: e.message });
    process.stdout.write('  FAIL ' + name + '\n       ' + e.message + '\n');
  }
}

function suite(name) {
  process.stdout.write('\n--- ' + name + ' ---\n');
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function makeState() {
  return BountyBoard.createState();
}

/**
 * Post a locate_item bounty with default valid params.
 */
function postLocate(state, posterId, targetId, tick) {
  return BountyBoard.postBounty(
    state,
    posterId || 'poster1',
    targetId || 'target1',
    'locate_item',
    'My iron ore was stolen',
    200,
    tick || 100
  );
}

/**
 * Post an investigation bounty.
 */
function postInvestigation(state, posterId, targetId, tick) {
  return BountyBoard.postBounty(
    state,
    posterId || 'poster1',
    targetId || 'target1',
    'investigation',
    'Suspected rule-breaking in the agora',
    300,
    tick || 100
  );
}

/**
 * Build a fully resolved bounty (guilty) and return {state, bounty, verdict}.
 */
function buildResolvedBounty(guilty) {
  var state = makeState();
  var r = postLocate(state, 'poster1', 'target1', 100);
  var bountyId = r.bounty.id;

  BountyBoard.acceptBounty(state, bountyId, 'hunter1', 110);

  // Submit enough evidence
  BountyBoard.submitEvidence(state, bountyId, 'hunter1', 'clue', 'Found tracks', 120);
  BountyBoard.submitEvidence(state, bountyId, 'hunter1', 'witness', 'Witness saw target', 125);

  // Manually set evidence guilt score so verdict is predictable
  state.evidence[bountyId][0].guiltScore = guilty ? 0.9 : 0.1;
  state.evidence[bountyId][1].guiltScore = guilty ? 0.9 : 0.1;

  var vr = BountyBoard.requestVerdict(state, bountyId, 200);
  var rr = BountyBoard.resolveVerdict(state, bountyId, vr.guilty, 210);

  return { state: state, bounty: r.bounty, verdict: vr.verdict, resolveResult: rr };
}

// ===========================================================================
// SUITE 1: BOUNTY_TYPES
// ===========================================================================
suite('BOUNTY_TYPES constants');

test('BOUNTY_TYPES is an array', function() {
  assert(Array.isArray(BountyBoard.BOUNTY_TYPES), 'BOUNTY_TYPES is an array');
});

test('BOUNTY_TYPES has exactly 5 types', function() {
  assertArrayLength(BountyBoard.BOUNTY_TYPES, 5, 'BOUNTY_TYPES has 5 entries');
});

test('all 5 type ids are present', function() {
  var ids = BountyBoard.BOUNTY_TYPES.map(function(t) { return t.id; });
  var expected = ['locate_item', 'investigation', 'restitution', 'apology', 'challenge'];
  for (var i = 0; i < expected.length; i++) {
    assert(ids.indexOf(expected[i]) !== -1, 'Has type: ' + expected[i]);
  }
});

test('each type has required fields', function() {
  var required = ['id', 'name', 'description', 'postCost', 'minReward', 'maxReward',
                  'expiryTicks', 'evidenceRequired', 'judgeCount', 'treasuryBonus',
                  'penaltyMultiplier', 'allowSelfTarget'];
  for (var i = 0; i < BountyBoard.BOUNTY_TYPES.length; i++) {
    var t = BountyBoard.BOUNTY_TYPES[i];
    for (var f = 0; f < required.length; f++) {
      assert(t[required[f]] !== undefined, t.id + ' has field: ' + required[f]);
    }
  }
});

test('postCost is a positive number for all types', function() {
  for (var i = 0; i < BountyBoard.BOUNTY_TYPES.length; i++) {
    assertGreater(BountyBoard.BOUNTY_TYPES[i].postCost, 0, BountyBoard.BOUNTY_TYPES[i].id + ' postCost > 0');
  }
});

test('minReward < maxReward for all types', function() {
  for (var i = 0; i < BountyBoard.BOUNTY_TYPES.length; i++) {
    var t = BountyBoard.BOUNTY_TYPES[i];
    assert(t.minReward < t.maxReward, t.id + ' minReward < maxReward');
  }
});

test('expiryTicks is 700 for all types', function() {
  for (var i = 0; i < BountyBoard.BOUNTY_TYPES.length; i++) {
    assertEqual(BountyBoard.BOUNTY_TYPES[i].expiryTicks, 700, BountyBoard.BOUNTY_TYPES[i].id + ' expiryTicks is 700');
  }
});

test('allowSelfTarget is false for all types', function() {
  for (var i = 0; i < BountyBoard.BOUNTY_TYPES.length; i++) {
    assertEqual(BountyBoard.BOUNTY_TYPES[i].allowSelfTarget, false, BountyBoard.BOUNTY_TYPES[i].id + ' allowSelfTarget is false');
  }
});

test('challenge type has evidenceRequired 0', function() {
  var challenge = null;
  for (var i = 0; i < BountyBoard.BOUNTY_TYPES.length; i++) {
    if (BountyBoard.BOUNTY_TYPES[i].id === 'challenge') { challenge = BountyBoard.BOUNTY_TYPES[i]; break; }
  }
  assertNotNull(challenge, 'challenge type found');
  assertEqual(challenge.evidenceRequired, 0, 'challenge evidenceRequired is 0');
});

test('investigation has evidenceRequired 3', function() {
  var inv = null;
  for (var i = 0; i < BountyBoard.BOUNTY_TYPES.length; i++) {
    if (BountyBoard.BOUNTY_TYPES[i].id === 'investigation') { inv = BountyBoard.BOUNTY_TYPES[i]; break; }
  }
  assertNotNull(inv, 'investigation type found');
  assertEqual(inv.evidenceRequired, 3, 'investigation evidenceRequired is 3');
});

// ===========================================================================
// SUITE 2: createState
// ===========================================================================
suite('createState');

test('createState returns object with correct keys', function() {
  var state = makeState();
  assert(Array.isArray(state.bounties), 'bounties is array');
  assert(typeof state.evidence === 'object', 'evidence is object');
  assert(Array.isArray(state.verdicts), 'verdicts is array');
  assert(typeof state.hunterStats === 'object', 'hunterStats is object');
  assert(Array.isArray(state.bountyLog), 'bountyLog is array');
});

test('createState returns empty collections', function() {
  var state = makeState();
  assertArrayLength(state.bounties, 0, 'bounties starts empty');
  assertArrayLength(state.verdicts, 0, 'verdicts starts empty');
  assertArrayLength(state.bountyLog, 0, 'bountyLog starts empty');
  assertEqual(Object.keys(state.evidence).length, 0, 'evidence starts empty');
  assertEqual(Object.keys(state.hunterStats).length, 0, 'hunterStats starts empty');
});

test('createState returns independent state objects', function() {
  var s1 = makeState();
  var s2 = makeState();
  postLocate(s1, 'p1', 'p2', 1);
  assertArrayLength(s1.bounties, 1, 's1 has 1 bounty');
  assertArrayLength(s2.bounties, 0, 's2 still empty');
});

// ===========================================================================
// SUITE 3: postBounty
// ===========================================================================
suite('postBounty');

test('postBounty returns success with valid params', function() {
  var state = makeState();
  var r = postLocate(state, 'poster1', 'target1', 100);
  assert(r.success, 'postBounty returns success');
  assertNotNull(r.bounty, 'bounty is returned');
  assertNotNull(r.cost, 'cost is returned');
});

test('returned bounty has correct fields', function() {
  var state = makeState();
  var r = postLocate(state, 'poster1', 'target1', 100);
  var b = r.bounty;
  assertEqual(b.type, 'locate_item', 'type is locate_item');
  assertEqual(b.posterId, 'poster1', 'posterId correct');
  assertEqual(b.targetId, 'target1', 'targetId correct');
  assertEqual(b.status, 'posted', 'status is posted');
  assertEqual(b.reward, 200, 'reward correct');
  assertEqual(b.postedAt, 100, 'postedAt is tick');
  assertNull(b.hunterId, 'hunterId is null initially');
  assertNull(b.acceptedAt, 'acceptedAt is null initially');
  assertNull(b.resolvedAt, 'resolvedAt is null initially');
});

test('postBounty assigns expiresAt = tick + 700', function() {
  var state = makeState();
  var r = postLocate(state, 'p', 't', 50);
  assertEqual(r.bounty.expiresAt, 750, 'expiresAt = 50 + 700');
});

test('bounty is stored in state.bounties', function() {
  var state = makeState();
  var r = postLocate(state, 'p', 't', 1);
  assertArrayLength(state.bounties, 1, '1 bounty in state');
  assertEqual(state.bounties[0].id, r.bounty.id, 'stored bounty id matches');
});

test('evidence array created for new bounty', function() {
  var state = makeState();
  var r = postLocate(state, 'p', 't', 1);
  assert(Array.isArray(state.evidence[r.bounty.id]), 'evidence array created');
  assertArrayLength(state.evidence[r.bounty.id], 0, 'evidence starts empty');
});

test('log entry added on postBounty', function() {
  var state = makeState();
  postLocate(state, 'p', 't', 42);
  assertArrayLength(state.bountyLog, 1, 'log has 1 entry');
  assertEqual(state.bountyLog[0].event, 'posted', 'log event is posted');
  assertEqual(state.bountyLog[0].tick, 42, 'log tick correct');
});

test('multiple bounties get unique ids', function() {
  var state = makeState();
  var r1 = postLocate(state, 'p1', 't1', 1);
  var r2 = postLocate(state, 'p2', 't2', 2);
  assertNotEqual(r1.bounty.id, r2.bounty.id, 'unique ids');
});

test('postBounty fails without posterId', function() {
  var state = makeState();
  var r = BountyBoard.postBounty(state, null, 't', 'locate_item', 'desc', 200, 1);
  assert(!r.success, 'fails without posterId');
  assertNotNull(r.error, 'has error message');
});

test('postBounty fails without targetId', function() {
  var state = makeState();
  var r = BountyBoard.postBounty(state, 'p', null, 'locate_item', 'desc', 200, 1);
  assert(!r.success, 'fails without targetId');
});

test('postBounty fails without bountyType', function() {
  var state = makeState();
  var r = BountyBoard.postBounty(state, 'p', 't', null, 'desc', 200, 1);
  assert(!r.success, 'fails without bountyType');
});

test('postBounty fails without description', function() {
  var state = makeState();
  var r = BountyBoard.postBounty(state, 'p', 't', 'locate_item', null, 200, 1);
  assert(!r.success, 'fails without description');
});

test('postBounty fails with unknown bountyType', function() {
  var state = makeState();
  var r = BountyBoard.postBounty(state, 'p', 't', 'dragon_hunt', 'desc', 200, 1);
  assert(!r.success, 'fails with unknown type');
  assertNotNull(r.error, 'has error');
});

test('postBounty fails when poster === target', function() {
  var state = makeState();
  var r = BountyBoard.postBounty(state, 'alice', 'alice', 'locate_item', 'desc', 200, 1);
  assert(!r.success, 'cannot target yourself');
});

test('postBounty fails when reward below minimum', function() {
  var state = makeState();
  var r = BountyBoard.postBounty(state, 'p', 't', 'locate_item', 'desc', 10, 1);
  assert(!r.success, 'fails below minimum reward');
});

test('postBounty fails when reward above maximum', function() {
  var state = makeState();
  var r = BountyBoard.postBounty(state, 'p', 't', 'locate_item', 'desc', 99999, 1);
  assert(!r.success, 'fails above maximum reward');
});

test('postBounty cost matches type postCost', function() {
  var state = makeState();
  var r = postLocate(state, 'p', 't', 1);
  var typeDef = null;
  for (var i = 0; i < BountyBoard.BOUNTY_TYPES.length; i++) {
    if (BountyBoard.BOUNTY_TYPES[i].id === 'locate_item') { typeDef = BountyBoard.BOUNTY_TYPES[i]; break; }
  }
  assertEqual(r.cost, typeDef.postCost, 'cost matches type postCost');
});

test('postBounty treasuryBonus computed correctly', function() {
  var state = makeState();
  var r = postLocate(state, 'p', 't', 1); // reward=200, treasuryBonus=0.2
  assertEqual(r.bounty.treasuryBonus, 40, 'treasuryBonus = 200 * 0.2 = 40');
});

test('all 5 bounty types can be posted', function() {
  var state = makeState();
  var types = ['locate_item', 'investigation', 'restitution', 'apology', 'challenge'];
  var rewards = { locate_item: 200, investigation: 300, restitution: 500, apology: 100, challenge: 200 };
  for (var i = 0; i < types.length; i++) {
    var r = BountyBoard.postBounty(state, 'p', 't', types[i], 'desc', rewards[types[i]], i + 1);
    assert(r.success, types[i] + ' can be posted');
  }
});

// ===========================================================================
// SUITE 4: acceptBounty
// ===========================================================================
suite('acceptBounty');

test('acceptBounty returns success with valid params', function() {
  var state = makeState();
  var r = postLocate(state, 'poster1', 'target1', 100);
  var a = BountyBoard.acceptBounty(state, r.bounty.id, 'hunter1', 110);
  assert(a.success, 'acceptBounty returns success');
  assertNotNull(a.bounty, 'bounty returned');
});

test('bounty status becomes investigating after accept', function() {
  var state = makeState();
  var r = postLocate(state, 'p', 't', 100);
  BountyBoard.acceptBounty(state, r.bounty.id, 'hunter1', 110);
  assertEqual(r.bounty.status, 'investigating', 'status is investigating');
});

test('bounty hunterId set after accept', function() {
  var state = makeState();
  var r = postLocate(state, 'p', 't', 100);
  BountyBoard.acceptBounty(state, r.bounty.id, 'hunter1', 110);
  assertEqual(r.bounty.hunterId, 'hunter1', 'hunterId set');
});

test('bounty acceptedAt set to currentTick', function() {
  var state = makeState();
  var r = postLocate(state, 'p', 't', 100);
  BountyBoard.acceptBounty(state, r.bounty.id, 'hunter1', 115);
  assertEqual(r.bounty.acceptedAt, 115, 'acceptedAt set to 115');
});

test('log entry added on acceptBounty', function() {
  var state = makeState();
  var r = postLocate(state, 'p', 't', 100);
  BountyBoard.acceptBounty(state, r.bounty.id, 'hunter1', 110);
  assertEqual(state.bountyLog.length, 2, 'log has 2 entries');
  assertEqual(state.bountyLog[1].event, 'accepted', 'log event is accepted');
});

test('acceptBounty fails without bountyId', function() {
  var state = makeState();
  var r = BountyBoard.acceptBounty(state, null, 'hunter1', 100);
  assert(!r.success, 'fails without bountyId');
});

test('acceptBounty fails without hunterId', function() {
  var state = makeState();
  var r = postLocate(state, 'p', 't', 100);
  var a = BountyBoard.acceptBounty(state, r.bounty.id, null, 110);
  assert(!a.success, 'fails without hunterId');
});

test('acceptBounty fails with unknown bountyId', function() {
  var state = makeState();
  var r = BountyBoard.acceptBounty(state, 'bounty_fake_999', 'hunter1', 100);
  assert(!r.success, 'fails with unknown bountyId');
});

test('acceptBounty fails if bounty not in posted status', function() {
  var state = makeState();
  var r = postLocate(state, 'p', 't', 100);
  BountyBoard.acceptBounty(state, r.bounty.id, 'hunter1', 110);
  // Try to accept again
  var a2 = BountyBoard.acceptBounty(state, r.bounty.id, 'hunter2', 120);
  assert(!a2.success, 'cannot accept a bounty already accepted');
});

test('poster cannot be their own hunter', function() {
  var state = makeState();
  var r = postLocate(state, 'poster1', 'target1', 100);
  var a = BountyBoard.acceptBounty(state, r.bounty.id, 'poster1', 110);
  assert(!a.success, 'poster cannot be own hunter');
});

test('target cannot accept their own bounty', function() {
  var state = makeState();
  var r = postLocate(state, 'poster1', 'target1', 100);
  var a = BountyBoard.acceptBounty(state, r.bounty.id, 'target1', 110);
  assert(!a.success, 'target cannot accept own bounty');
});

test('acceptBounty fails if bounty expired', function() {
  var state = makeState();
  var r = postLocate(state, 'p', 't', 100); // expires at 800
  var a = BountyBoard.acceptBounty(state, r.bounty.id, 'hunter1', 900);
  assert(!a.success, 'fails if bounty expired');
});

// ===========================================================================
// SUITE 5: submitEvidence
// ===========================================================================
suite('submitEvidence');

test('submitEvidence returns success with valid params', function() {
  var state = makeState();
  var r = postLocate(state, 'p', 't', 100);
  BountyBoard.acceptBounty(state, r.bounty.id, 'hunter1', 110);
  var ev = BountyBoard.submitEvidence(state, r.bounty.id, 'hunter1', 'clue', 'Found tracks', 120);
  assert(ev.success, 'submitEvidence returns success');
  assertNotNull(ev.evidence, 'evidence returned');
});

test('evidence has correct fields', function() {
  var state = makeState();
  var r = postLocate(state, 'p', 't', 100);
  BountyBoard.acceptBounty(state, r.bounty.id, 'hunter1', 110);
  var ev = BountyBoard.submitEvidence(state, r.bounty.id, 'hunter1', 'clue', 'Found tracks', 120);
  assertEqual(ev.evidence.bountyId, r.bounty.id, 'bountyId correct');
  assertEqual(ev.evidence.submittedBy, 'hunter1', 'submittedBy correct');
  assertEqual(ev.evidence.type, 'clue', 'type correct');
  assertEqual(ev.evidence.description, 'Found tracks', 'description correct');
  assertEqual(ev.evidence.submittedAt, 120, 'submittedAt correct');
  assertNotNull(ev.evidence.id, 'id exists');
});

test('evidence is stored in state.evidence', function() {
  var state = makeState();
  var r = postLocate(state, 'p', 't', 100);
  BountyBoard.acceptBounty(state, r.bounty.id, 'hunter1', 110);
  BountyBoard.submitEvidence(state, r.bounty.id, 'hunter1', 'clue', 'desc', 120);
  assertArrayLength(state.evidence[r.bounty.id], 1, '1 piece of evidence stored');
});

test('all 3 evidence types accepted', function() {
  var state = makeState();
  var r = postInvestigation(state, 'p', 't', 100); // needs 3 evidence
  BountyBoard.acceptBounty(state, r.bounty.id, 'hunter1', 110);
  var types = ['clue', 'witness', 'log_entry'];
  for (var i = 0; i < types.length; i++) {
    var ev = BountyBoard.submitEvidence(state, r.bounty.id, 'hunter1', types[i], 'desc ' + i, 120 + i);
    assert(ev.success, types[i] + ' evidence type accepted');
  }
});

test('evidence status advances to evidence_submitted when threshold met', function() {
  var state = makeState();
  var r = postLocate(state, 'p', 't', 100); // needs 2 evidence
  BountyBoard.acceptBounty(state, r.bounty.id, 'hunter1', 110);
  BountyBoard.submitEvidence(state, r.bounty.id, 'hunter1', 'clue', 'first', 120);
  assertEqual(r.bounty.status, 'investigating', 'still investigating after 1 evidence');
  BountyBoard.submitEvidence(state, r.bounty.id, 'hunter1', 'witness', 'second', 125);
  assertEqual(r.bounty.status, 'evidence_submitted', 'status becomes evidence_submitted after 2 evidence');
});

test('submitEvidence fails without bountyId', function() {
  var state = makeState();
  var r = BountyBoard.submitEvidence(state, null, 'h', 'clue', 'desc', 1);
  assert(!r.success, 'fails without bountyId');
});

test('submitEvidence fails without hunterId', function() {
  var state = makeState();
  var r = postLocate(state, 'p', 't', 100);
  var ev = BountyBoard.submitEvidence(state, r.bounty.id, null, 'clue', 'desc', 110);
  assert(!ev.success, 'fails without hunterId');
});

test('submitEvidence fails without evidenceType', function() {
  var state = makeState();
  var r = postLocate(state, 'p', 't', 100);
  BountyBoard.acceptBounty(state, r.bounty.id, 'h', 110);
  var ev = BountyBoard.submitEvidence(state, r.bounty.id, 'h', null, 'desc', 120);
  assert(!ev.success, 'fails without evidenceType');
});

test('submitEvidence fails without description', function() {
  var state = makeState();
  var r = postLocate(state, 'p', 't', 100);
  BountyBoard.acceptBounty(state, r.bounty.id, 'h', 110);
  var ev = BountyBoard.submitEvidence(state, r.bounty.id, 'h', 'clue', null, 120);
  assert(!ev.success, 'fails without description');
});

test('submitEvidence fails with invalid type', function() {
  var state = makeState();
  var r = postLocate(state, 'p', 't', 100);
  BountyBoard.acceptBounty(state, r.bounty.id, 'h', 110);
  var ev = BountyBoard.submitEvidence(state, r.bounty.id, 'h', 'rumor', 'desc', 120);
  assert(!ev.success, 'fails with invalid evidence type');
});

test('submitEvidence fails with unknown bountyId', function() {
  var state = makeState();
  var ev = BountyBoard.submitEvidence(state, 'bounty_fake_999', 'h', 'clue', 'desc', 1);
  assert(!ev.success, 'fails with unknown bountyId');
});

test('submitEvidence fails if bounty is resolved', function() {
  var obj = buildResolvedBounty(true);
  var ev = BountyBoard.submitEvidence(obj.state, obj.bounty.id, 'h', 'clue', 'late', 999);
  assert(!ev.success, 'cannot submit evidence to resolved bounty');
});

test('log entry added for each evidence submission', function() {
  var state = makeState();
  var r = postLocate(state, 'p', 't', 100);
  BountyBoard.acceptBounty(state, r.bounty.id, 'h', 110);
  BountyBoard.submitEvidence(state, r.bounty.id, 'h', 'clue', 'desc', 120);
  assertEqual(state.bountyLog.length, 3, 'log has 3 entries: post + accept + evidence');
});

test('evidence ids are unique', function() {
  var state = makeState();
  var r = postInvestigation(state, 'p', 't', 100); // needs 3 evidence
  BountyBoard.acceptBounty(state, r.bounty.id, 'h', 110);
  var ev1 = BountyBoard.submitEvidence(state, r.bounty.id, 'h', 'clue', 'a', 120);
  var ev2 = BountyBoard.submitEvidence(state, r.bounty.id, 'h', 'witness', 'b', 121);
  assertNotEqual(ev1.evidence.id, ev2.evidence.id, 'evidence ids are unique');
});

// ===========================================================================
// SUITE 6: getEvidence
// ===========================================================================
suite('getEvidence');

test('getEvidence returns all evidence for a bounty', function() {
  var state = makeState();
  var r = postLocate(state, 'p', 't', 100);
  BountyBoard.acceptBounty(state, r.bounty.id, 'h', 110);
  BountyBoard.submitEvidence(state, r.bounty.id, 'h', 'clue', 'a', 120);
  BountyBoard.submitEvidence(state, r.bounty.id, 'h', 'witness', 'b', 125);
  var evList = BountyBoard.getEvidence(state, r.bounty.id);
  assertArrayLength(evList, 2, '2 pieces of evidence returned');
});

test('getEvidence returns empty array for unknown bounty', function() {
  var state = makeState();
  var evList = BountyBoard.getEvidence(state, 'bounty_fake');
  assert(Array.isArray(evList), 'returns array');
  assertArrayLength(evList, 0, 'returns empty array');
});

test('getEvidence returns empty array for bounty with no evidence', function() {
  var state = makeState();
  var r = postLocate(state, 'p', 't', 100);
  var evList = BountyBoard.getEvidence(state, r.bounty.id);
  assertArrayLength(evList, 0, 'empty for fresh bounty');
});

// ===========================================================================
// SUITE 7: requestVerdict
// ===========================================================================
suite('requestVerdict');

test('requestVerdict returns success with evidence', function() {
  var state = makeState();
  var r = postLocate(state, 'p', 't', 100);
  BountyBoard.acceptBounty(state, r.bounty.id, 'h', 110);
  BountyBoard.submitEvidence(state, r.bounty.id, 'h', 'clue', 'a', 120);
  BountyBoard.submitEvidence(state, r.bounty.id, 'h', 'witness', 'b', 125);
  var v = BountyBoard.requestVerdict(state, r.bounty.id, 200);
  assert(v.success, 'requestVerdict returns success');
  assertNotNull(v.verdict, 'verdict returned');
  assert(typeof v.guilty === 'boolean', 'guilty is boolean');
  assert(typeof v.confidence === 'number', 'confidence is number');
});

test('verdict is stored in state.verdicts', function() {
  var state = makeState();
  var r = postLocate(state, 'p', 't', 100);
  BountyBoard.acceptBounty(state, r.bounty.id, 'h', 110);
  BountyBoard.submitEvidence(state, r.bounty.id, 'h', 'clue', 'a', 120);
  BountyBoard.submitEvidence(state, r.bounty.id, 'h', 'witness', 'b', 125);
  BountyBoard.requestVerdict(state, r.bounty.id, 200);
  assertArrayLength(state.verdicts, 1, '1 verdict stored');
});

test('bounty status is judged after verdict', function() {
  var state = makeState();
  var r = postLocate(state, 'p', 't', 100);
  BountyBoard.acceptBounty(state, r.bounty.id, 'h', 110);
  BountyBoard.submitEvidence(state, r.bounty.id, 'h', 'clue', 'a', 120);
  BountyBoard.submitEvidence(state, r.bounty.id, 'h', 'witness', 'b', 125);
  BountyBoard.requestVerdict(state, r.bounty.id, 200);
  assertEqual(r.bounty.status, 'judged', 'status is judged');
});

test('bounty verdictId set after verdict', function() {
  var state = makeState();
  var r = postLocate(state, 'p', 't', 100);
  BountyBoard.acceptBounty(state, r.bounty.id, 'h', 110);
  BountyBoard.submitEvidence(state, r.bounty.id, 'h', 'clue', 'a', 120);
  BountyBoard.submitEvidence(state, r.bounty.id, 'h', 'witness', 'b', 125);
  var v = BountyBoard.requestVerdict(state, r.bounty.id, 200);
  assertEqual(r.bounty.verdictId, v.verdict.id, 'verdictId matches');
});

test('verdict has judgeNpcs array', function() {
  var state = makeState();
  var r = postLocate(state, 'p', 't', 100);
  BountyBoard.acceptBounty(state, r.bounty.id, 'h', 110);
  BountyBoard.submitEvidence(state, r.bounty.id, 'h', 'clue', 'a', 120);
  BountyBoard.submitEvidence(state, r.bounty.id, 'h', 'witness', 'b', 125);
  var v = BountyBoard.requestVerdict(state, r.bounty.id, 200);
  assert(Array.isArray(v.verdict.judgeNpcs), 'judgeNpcs is array');
  assertGreater(v.verdict.judgeNpcs.length, 0, 'at least one judge npc');
});

test('challenge bounty verdict succeeds with no evidence', function() {
  var state = makeState();
  var r = BountyBoard.postBounty(state, 'p', 't', 'challenge', 'I challenge you', 200, 100);
  BountyBoard.acceptBounty(state, r.bounty.id, 'h', 110);
  var v = BountyBoard.requestVerdict(state, r.bounty.id, 200);
  assert(v.success, 'challenge verdict succeeds');
  assertEqual(v.guilty, false, 'challenge guilty is false (opt-in)');
});

test('requestVerdict fails without bountyId', function() {
  var state = makeState();
  var v = BountyBoard.requestVerdict(state, null, 100);
  assert(!v.success, 'fails without bountyId');
});

test('requestVerdict fails with unknown bountyId', function() {
  var state = makeState();
  var v = BountyBoard.requestVerdict(state, 'bounty_fake', 100);
  assert(!v.success, 'fails with unknown bountyId');
});

test('requestVerdict fails if bounty in posted status', function() {
  var state = makeState();
  var r = postLocate(state, 'p', 't', 100);
  var v = BountyBoard.requestVerdict(state, r.bounty.id, 200);
  assert(!v.success, 'fails if bounty in posted status');
});

test('requestVerdict fails if no evidence and evidenceRequired > 0', function() {
  var state = makeState();
  var r = postLocate(state, 'p', 't', 100);
  BountyBoard.acceptBounty(state, r.bounty.id, 'h', 110);
  var v = BountyBoard.requestVerdict(state, r.bounty.id, 200);
  assert(!v.success, 'fails with no evidence');
});

test('high guilt score evidence results in guilty verdict', function() {
  var state = makeState();
  var r = postLocate(state, 'p', 't', 100);
  BountyBoard.acceptBounty(state, r.bounty.id, 'h', 110);
  BountyBoard.submitEvidence(state, r.bounty.id, 'h', 'log_entry', 'server log shows theft', 120);
  BountyBoard.submitEvidence(state, r.bounty.id, 'h', 'log_entry', 'confirmed duplicate', 121);
  // log_entry has guiltScore 0.8 by default — should return guilty
  var v = BountyBoard.requestVerdict(state, r.bounty.id, 200);
  assert(v.success, 'verdict succeeds');
  assertEqual(v.guilty, true, 'high guilt score = guilty verdict');
});

test('log entry added on requestVerdict', function() {
  var state = makeState();
  var r = postLocate(state, 'p', 't', 100);
  BountyBoard.acceptBounty(state, r.bounty.id, 'h', 110);
  BountyBoard.submitEvidence(state, r.bounty.id, 'h', 'clue', 'a', 120);
  BountyBoard.submitEvidence(state, r.bounty.id, 'h', 'witness', 'b', 125);
  BountyBoard.requestVerdict(state, r.bounty.id, 200);
  var logEntry = state.bountyLog[state.bountyLog.length - 1];
  assertEqual(logEntry.event, 'judged', 'log event is judged');
});

// ===========================================================================
// SUITE 8: resolveVerdict
// ===========================================================================
suite('resolveVerdict');

test('resolveVerdict returns success when guilty', function() {
  var obj = buildResolvedBounty(true);
  assert(obj.resolveResult.success, 'resolveVerdict success');
  assertGreater(obj.resolveResult.reward, 0, 'reward > 0 when guilty');
  assertGreater(obj.resolveResult.penalty, 0, 'penalty > 0 when guilty');
});

test('resolveVerdict returns partial reward when not guilty', function() {
  var obj = buildResolvedBounty(false);
  assert(obj.resolveResult.success, 'resolveVerdict success');
  assertGreater(obj.resolveResult.reward, 0, 'partial reward even when not guilty');
});

test('bounty status is resolved after resolveVerdict', function() {
  var obj = buildResolvedBounty(true);
  var bounty = BountyBoard.getBounty(obj.state, obj.bounty.id);
  assertEqual(bounty.status, 'resolved', 'status is resolved');
});

test('bounty guilty field set after resolve', function() {
  var obj = buildResolvedBounty(true);
  var bounty = BountyBoard.getBounty(obj.state, obj.bounty.id);
  assertEqual(bounty.guilty, true, 'guilty field set to true');
});

test('bounty resolvedAt set', function() {
  var obj = buildResolvedBounty(true);
  var bounty = BountyBoard.getBounty(obj.state, obj.bounty.id);
  assertEqual(bounty.resolvedAt, 210, 'resolvedAt is 210');
});

test('resolveVerdict fails without bountyId', function() {
  var state = makeState();
  var r = BountyBoard.resolveVerdict(state, null, true, 100);
  assert(!r.success, 'fails without bountyId');
});

test('resolveVerdict fails if guilty is not boolean', function() {
  var state = makeState();
  var r = postLocate(state, 'p', 't', 100);
  var res = BountyBoard.resolveVerdict(state, r.bounty.id, 'yes', 200);
  assert(!res.success, 'fails when guilty is not boolean');
});

test('resolveVerdict fails if bounty not judged', function() {
  var state = makeState();
  var r = postLocate(state, 'p', 't', 100);
  var res = BountyBoard.resolveVerdict(state, r.bounty.id, true, 200);
  assert(!res.success, 'fails if not judged');
});

test('resolveVerdict fails with unknown bountyId', function() {
  var state = makeState();
  var res = BountyBoard.resolveVerdict(state, 'bounty_fake', true, 100);
  assert(!res.success, 'fails with unknown bountyId');
});

test('hunter stats updated on resolveVerdict', function() {
  var obj = buildResolvedBounty(true);
  var stats = BountyBoard.getHunterStats(obj.state, 'hunter1');
  assertEqual(stats.completed, 1, 'hunter completed 1');
  assertEqual(stats.successful, 1, 'hunter successful 1');
});

test('log entry added on resolveVerdict', function() {
  var obj = buildResolvedBounty(true);
  var lastLog = obj.state.bountyLog[obj.state.bountyLog.length - 1];
  assertEqual(lastLog.event, 'resolved', 'log event is resolved');
});

// ===========================================================================
// SUITE 9: expireBounties
// ===========================================================================
suite('expireBounties');

test('expireBounties returns expired array', function() {
  var state = makeState();
  postLocate(state, 'p', 't', 100); // expires at 800
  var result = BountyBoard.expireBounties(state, 900);
  assert(Array.isArray(result.expired), 'expired is array');
  assertArrayLength(result.expired, 1, '1 bounty expired');
});

test('expired bounty status is expired', function() {
  var state = makeState();
  var r = postLocate(state, 'p', 't', 100);
  BountyBoard.expireBounties(state, 900);
  assertEqual(r.bounty.status, 'expired', 'status is expired');
});

test('expireBounties does not expire resolved bounties', function() {
  var obj = buildResolvedBounty(true);
  var result = BountyBoard.expireBounties(obj.state, 99999);
  // The resolved bounty should not appear in expired list again
  var found = false;
  for (var i = 0; i < result.expired.length; i++) {
    if (result.expired[i].id === obj.bounty.id) { found = true; break; }
  }
  assert(!found, 'resolved bounty not re-expired');
});

test('expireBounties does not expire bounties before expiresAt', function() {
  var state = makeState();
  postLocate(state, 'p', 't', 100); // expires at 800
  var result = BountyBoard.expireBounties(state, 799);
  assertArrayLength(result.expired, 0, 'no expiry before expiresAt');
});

test('expireBounties returns empty when nothing to expire', function() {
  var state = makeState();
  var result = BountyBoard.expireBounties(state, 9999);
  assertArrayLength(result.expired, 0, 'empty when no bounties');
});

test('expireBounties adds log entry for each expired bounty', function() {
  var state = makeState();
  postLocate(state, 'p1', 't1', 100);
  postLocate(state, 'p2', 't2', 200);
  var logBefore = state.bountyLog.length;
  BountyBoard.expireBounties(state, 1000);
  assertEqual(state.bountyLog.length, logBefore + 2, '2 log entries added');
});

test('investigating bounty can also expire', function() {
  var state = makeState();
  var r = postLocate(state, 'p', 't', 100);
  BountyBoard.acceptBounty(state, r.bounty.id, 'h', 110);
  // Now in investigating — still should expire
  var result = BountyBoard.expireBounties(state, 900);
  assertArrayLength(result.expired, 1, 'investigating bounty can expire');
});

test('expireBounties sets resolvedAt for expired bounties', function() {
  var state = makeState();
  var r = postLocate(state, 'p', 't', 100);
  BountyBoard.expireBounties(state, 900);
  assertEqual(r.bounty.resolvedAt, 900, 'resolvedAt set to 900');
});

// ===========================================================================
// SUITE 10: getBounty
// ===========================================================================
suite('getBounty');

test('getBounty returns the correct bounty', function() {
  var state = makeState();
  var r = postLocate(state, 'p', 't', 100);
  var b = BountyBoard.getBounty(state, r.bounty.id);
  assertNotNull(b, 'bounty found');
  assertEqual(b.id, r.bounty.id, 'correct id returned');
});

test('getBounty returns null for unknown id', function() {
  var state = makeState();
  var b = BountyBoard.getBounty(state, 'bounty_fake');
  assertNull(b, 'returns null for unknown id');
});

// ===========================================================================
// SUITE 11: getActiveBounties
// ===========================================================================
suite('getActiveBounties');

test('getActiveBounties returns all non-resolved bounties', function() {
  var state = makeState();
  postLocate(state, 'p1', 't1', 100);
  postLocate(state, 'p2', 't2', 110);
  var active = BountyBoard.getActiveBounties(state);
  assertArrayLength(active, 2, '2 active bounties');
});

test('getActiveBounties excludes resolved bounties', function() {
  var obj = buildResolvedBounty(true);
  postLocate(obj.state, 'p2', 't2', 300);
  var active = BountyBoard.getActiveBounties(obj.state);
  assertArrayLength(active, 1, 'only 1 active bounty (resolved excluded)');
});

test('getActiveBounties excludes expired bounties', function() {
  var state = makeState();
  postLocate(state, 'p', 't', 100);
  BountyBoard.expireBounties(state, 900);
  var active = BountyBoard.getActiveBounties(state);
  assertArrayLength(active, 0, 'expired bounties excluded');
});

test('getActiveBounties returns empty when none active', function() {
  var state = makeState();
  var active = BountyBoard.getActiveBounties(state);
  assertArrayLength(active, 0, 'empty when no bounties');
});

// ===========================================================================
// SUITE 12: getBountiesByTarget / getBountiesByHunter / getBountiesByPoster
// ===========================================================================
suite('getBountiesByTarget / getBountiesByHunter / getBountiesByPoster');

test('getBountiesByTarget returns bounties for that target', function() {
  var state = makeState();
  postLocate(state, 'p1', 'villain', 100);
  postLocate(state, 'p2', 'villain', 110);
  postLocate(state, 'p3', 'innocent', 120);
  var targeting = BountyBoard.getBountiesByTarget(state, 'villain');
  assertArrayLength(targeting, 2, '2 bounties targeting villain');
});

test('getBountiesByTarget returns empty for unknown target', function() {
  var state = makeState();
  postLocate(state, 'p', 't', 100);
  var result = BountyBoard.getBountiesByTarget(state, 'nobody');
  assertArrayLength(result, 0, 'empty for unknown target');
});

test('getBountiesByHunter returns bounties for that hunter', function() {
  var state = makeState();
  var r1 = postLocate(state, 'p1', 't1', 100);
  var r2 = postLocate(state, 'p2', 't2', 110);
  BountyBoard.acceptBounty(state, r1.bounty.id, 'hunter1', 120);
  BountyBoard.acceptBounty(state, r2.bounty.id, 'hunter2', 130);
  var h1Bounties = BountyBoard.getBountiesByHunter(state, 'hunter1');
  assertArrayLength(h1Bounties, 1, 'hunter1 has 1 bounty');
  assertEqual(h1Bounties[0].id, r1.bounty.id, 'correct bounty returned');
});

test('getBountiesByHunter returns empty when no bounties accepted', function() {
  var state = makeState();
  postLocate(state, 'p', 't', 100);
  var result = BountyBoard.getBountiesByHunter(state, 'unlucky_hunter');
  assertArrayLength(result, 0, 'empty for hunter with no bounties');
});

test('getBountiesByPoster returns bounties by that poster', function() {
  var state = makeState();
  postLocate(state, 'poster1', 't1', 100);
  postLocate(state, 'poster1', 't2', 110);
  postLocate(state, 'poster2', 't3', 120);
  var postedBy1 = BountyBoard.getBountiesByPoster(state, 'poster1');
  assertArrayLength(postedBy1, 2, 'poster1 has 2 bounties');
});

test('getBountiesByPoster returns empty for unknown poster', function() {
  var state = makeState();
  var result = BountyBoard.getBountiesByPoster(state, 'ghost');
  assertArrayLength(result, 0, 'empty for unknown poster');
});

// ===========================================================================
// SUITE 13: getHunterStats
// ===========================================================================
suite('getHunterStats');

test('getHunterStats returns zero stats for unknown hunter', function() {
  var state = makeState();
  var stats = BountyBoard.getHunterStats(state, 'nobody');
  assertEqual(stats.completed, 0, 'completed is 0');
  assertEqual(stats.successful, 0, 'successful is 0');
  assertEqual(stats.failed, 0, 'failed is 0');
  assertEqual(stats.totalReward, 0, 'totalReward is 0');
  assertEqual(stats.reputation, 0, 'reputation is 0');
});

test('getHunterStats accumulates successful completions', function() {
  var obj = buildResolvedBounty(true);
  var stats = BountyBoard.getHunterStats(obj.state, 'hunter1');
  assertEqual(stats.completed, 1, 'completed = 1');
  assertEqual(stats.successful, 1, 'successful = 1');
  assertGreater(stats.reputation, 0, 'reputation increased');
  assertGreater(stats.totalReward, 0, 'totalReward > 0');
});

test('getHunterStats tracks unsuccessful completions', function() {
  var obj = buildResolvedBounty(false);
  var stats = BountyBoard.getHunterStats(obj.state, 'hunter1');
  assertEqual(stats.completed, 1, 'completed = 1');
  assertEqual(stats.failed, 1, 'failed = 1');
  assertGreater(stats.reputation, 0, 'still gets some reputation for effort');
});

test('getHunterStats tracks byType breakdown', function() {
  var obj = buildResolvedBounty(true);
  var stats = BountyBoard.getHunterStats(obj.state, 'hunter1');
  assertNotNull(stats.byType['locate_item'], 'byType has locate_item');
  assertEqual(stats.byType['locate_item'].completed, 1, 'byType completed is 1');
});

// ===========================================================================
// SUITE 14: getHunterLeaderboard
// ===========================================================================
suite('getHunterLeaderboard');

test('getHunterLeaderboard returns sorted hunters', function() {
  var state = makeState();

  // Create multiple resolved bounties for different hunters
  var r1 = postLocate(state, 'p1', 't1', 100);
  BountyBoard.acceptBounty(state, r1.bounty.id, 'hunter_a', 110);
  state.evidence[r1.bounty.id].push({ type: 'log_entry', guiltScore: 0.9, description: 'x' });
  state.evidence[r1.bounty.id].push({ type: 'log_entry', guiltScore: 0.9, description: 'y' });
  r1.bounty.status = 'evidence_submitted';
  BountyBoard.requestVerdict(state, r1.bounty.id, 200);
  BountyBoard.resolveVerdict(state, r1.bounty.id, true, 210);

  var r2 = postLocate(state, 'p2', 't2', 300);
  BountyBoard.acceptBounty(state, r2.bounty.id, 'hunter_b', 310);
  state.evidence[r2.bounty.id].push({ type: 'clue', guiltScore: 0.1, description: 'a' });
  state.evidence[r2.bounty.id].push({ type: 'clue', guiltScore: 0.1, description: 'b' });
  r2.bounty.status = 'evidence_submitted';
  BountyBoard.requestVerdict(state, r2.bounty.id, 400);
  BountyBoard.resolveVerdict(state, r2.bounty.id, false, 410);

  var lb = BountyBoard.getHunterLeaderboard(state, 10);
  assert(Array.isArray(lb), 'returns array');
  assertGTE(lb.length, 1, 'at least 1 hunter in leaderboard');
  // hunter_a should rank higher (successful = guilty)
  assertEqual(lb[0].hunterId, 'hunter_a', 'hunter_a ranks first');
});

test('getHunterLeaderboard respects count param', function() {
  var state = makeState();
  // Populate 5 hunters
  for (var i = 0; i < 5; i++) {
    var r = postLocate(state, 'poster' + i, 'target' + i, 100 + i * 50);
    BountyBoard.acceptBounty(state, r.bounty.id, 'hunter' + i, 110 + i * 50);
    state.evidence[r.bounty.id].push({ type: 'log_entry', guiltScore: 0.9, description: 'x' });
    state.evidence[r.bounty.id].push({ type: 'log_entry', guiltScore: 0.9, description: 'y' });
    r.bounty.status = 'evidence_submitted';
    BountyBoard.requestVerdict(state, r.bounty.id, 200 + i * 50);
    BountyBoard.resolveVerdict(state, r.bounty.id, true, 210 + i * 50);
  }
  var lb3 = BountyBoard.getHunterLeaderboard(state, 3);
  assertArrayLength(lb3, 3, 'leaderboard respects count=3');
});

test('getHunterLeaderboard returns empty when no hunters', function() {
  var state = makeState();
  var lb = BountyBoard.getHunterLeaderboard(state, 10);
  assertArrayLength(lb, 0, 'empty leaderboard when no hunters');
});

// ===========================================================================
// SUITE 15: getBountyHistory
// ===========================================================================
suite('getBountyHistory');

test('getBountyHistory returns resolved and expired bounties', function() {
  var obj = buildResolvedBounty(true);
  var history = BountyBoard.getBountyHistory(obj.state, 20);
  assert(Array.isArray(history), 'history is array');
  assertArrayLength(history, 1, '1 resolved bounty in history');
});

test('getBountyHistory sorts by resolvedAt descending', function() {
  var state = makeState();
  var r1 = postLocate(state, 'p1', 't1', 100);
  BountyBoard.expireBounties(state, 900); // r1 expires at 900

  var r2 = postLocate(state, 'p2', 't2', 200);
  BountyBoard.expireBounties(state, 1000); // r2 expires at 1000

  var history = BountyBoard.getBountyHistory(state, 20);
  assertArrayLength(history, 2, '2 in history');
  // Most recently resolved first
  assertGTE(history[0].resolvedAt, history[1].resolvedAt, 'sorted by resolvedAt desc');
});

test('getBountyHistory respects count param', function() {
  var state = makeState();
  for (var i = 0; i < 5; i++) {
    postLocate(state, 'p' + i, 't' + i, 100 + i);
  }
  BountyBoard.expireBounties(state, 9000);
  var history = BountyBoard.getBountyHistory(state, 3);
  assertArrayLength(history, 3, 'history respects count=3');
});

test('getBountyHistory excludes active bounties', function() {
  var state = makeState();
  postLocate(state, 'p', 't', 100);
  var history = BountyBoard.getBountyHistory(state, 20);
  assertArrayLength(history, 0, 'active bounties excluded from history');
});

// ===========================================================================
// SUITE 16: cancelBounty
// ===========================================================================
suite('cancelBounty');

test('cancelBounty returns success for poster', function() {
  var state = makeState();
  var r = postLocate(state, 'poster1', 't', 100);
  var c = BountyBoard.cancelBounty(state, r.bounty.id, 'poster1', 150);
  assert(c.success, 'cancelBounty returns success');
  assertNotNull(c.refund, 'refund returned');
});

test('cancelled bounty status is expired', function() {
  var state = makeState();
  var r = postLocate(state, 'poster1', 't', 100);
  BountyBoard.cancelBounty(state, r.bounty.id, 'poster1', 150);
  assertEqual(r.bounty.status, 'expired', 'status is expired after cancel');
});

test('cancelled bounty flag is set', function() {
  var state = makeState();
  var r = postLocate(state, 'poster1', 't', 100);
  BountyBoard.cancelBounty(state, r.bounty.id, 'poster1', 150);
  assertEqual(r.bounty.cancelled, true, 'cancelled flag is true');
});

test('refund is 50% of reward', function() {
  var state = makeState();
  var r = postLocate(state, 'poster1', 't', 100); // reward = 200
  var c = BountyBoard.cancelBounty(state, r.bounty.id, 'poster1', 150);
  assertEqual(c.refund, 100, 'refund is 50% of 200 = 100');
});

test('cancelBounty fails without bountyId', function() {
  var state = makeState();
  var c = BountyBoard.cancelBounty(state, null, 'p', 100);
  assert(!c.success, 'fails without bountyId');
});

test('cancelBounty fails without posterId', function() {
  var state = makeState();
  var r = postLocate(state, 'p', 't', 100);
  var c = BountyBoard.cancelBounty(state, r.bounty.id, null, 150);
  assert(!c.success, 'fails without posterId');
});

test('cancelBounty fails if wrong poster', function() {
  var state = makeState();
  var r = postLocate(state, 'poster1', 't', 100);
  var c = BountyBoard.cancelBounty(state, r.bounty.id, 'impostor', 150);
  assert(!c.success, 'fails if wrong poster');
});

test('cancelBounty fails if bounty already accepted', function() {
  var state = makeState();
  var r = postLocate(state, 'poster1', 't', 100);
  BountyBoard.acceptBounty(state, r.bounty.id, 'hunter1', 110);
  var c = BountyBoard.cancelBounty(state, r.bounty.id, 'poster1', 150);
  assert(!c.success, 'cannot cancel after acceptance');
});

test('cancelBounty fails with unknown bountyId', function() {
  var state = makeState();
  var c = BountyBoard.cancelBounty(state, 'bounty_fake', 'p', 100);
  assert(!c.success, 'fails with unknown bountyId');
});

test('log entry added on cancelBounty', function() {
  var state = makeState();
  var r = postLocate(state, 'poster1', 't', 100);
  BountyBoard.cancelBounty(state, r.bounty.id, 'poster1', 150);
  var lastLog = state.bountyLog[state.bountyLog.length - 1];
  assertEqual(lastLog.event, 'cancelled', 'log event is cancelled');
});

// ===========================================================================
// SUITE 17: getBountyBoardStats
// ===========================================================================
suite('getBountyBoardStats');

test('getBountyBoardStats returns correct structure', function() {
  var state = makeState();
  var stats = BountyBoard.getBountyBoardStats(state);
  assert(typeof stats.total === 'number', 'total is number');
  assert(typeof stats.active === 'number', 'active is number');
  assert(typeof stats.resolved === 'number', 'resolved is number');
  assert(typeof stats.expired === 'number', 'expired is number');
  assert(typeof stats.guiltyCount === 'number', 'guiltyCount is number');
  assert(typeof stats.guiltRate === 'number', 'guiltRate is number');
  assert(typeof stats.totalRewardsIssued === 'number', 'totalRewardsIssued is number');
  assert(typeof stats.totalPenaltiesIssued === 'number', 'totalPenaltiesIssued is number');
  assert(typeof stats.totalHunters === 'number', 'totalHunters is number');
  assert(typeof stats.byType === 'object', 'byType is object');
});

test('getBountyBoardStats counts total bounties', function() {
  var state = makeState();
  postLocate(state, 'p1', 't1', 100);
  postLocate(state, 'p2', 't2', 110);
  var stats = BountyBoard.getBountyBoardStats(state);
  assertEqual(stats.total, 2, 'total is 2');
});

test('getBountyBoardStats counts active vs resolved', function() {
  var obj = buildResolvedBounty(true);
  postLocate(obj.state, 'p2', 't2', 300);
  var stats = BountyBoard.getBountyBoardStats(obj.state);
  assertEqual(stats.total, 2, 'total 2');
  assertEqual(stats.resolved, 1, 'resolved 1');
  assertEqual(stats.active, 1, 'active 1');
});

test('getBountyBoardStats computes guiltRate', function() {
  var obj = buildResolvedBounty(true);
  var stats = BountyBoard.getBountyBoardStats(obj.state);
  assertEqual(stats.guiltyCount, 1, 'guiltyCount is 1');
  assertEqual(stats.guiltRate, 1, 'guiltRate is 1.0 when all guilty');
});

test('getBountyBoardStats returns guiltRate 0 when empty', function() {
  var state = makeState();
  var stats = BountyBoard.getBountyBoardStats(state);
  assertEqual(stats.guiltRate, 0, 'guiltRate is 0 when no bounties');
});

test('getBountyBoardStats tracks byType', function() {
  var state = makeState();
  postLocate(state, 'p1', 't1', 100);
  postLocate(state, 'p2', 't2', 110);
  postInvestigation(state, 'p3', 't3', 120);
  var stats = BountyBoard.getBountyBoardStats(state);
  assertEqual(stats.byType['locate_item'].total, 2, 'byType locate_item total 2');
  assertEqual(stats.byType['investigation'].total, 1, 'byType investigation total 1');
});

// ===========================================================================
// SUITE 18: getPlayerBountyRecord
// ===========================================================================
suite('getPlayerBountyRecord');

test('getPlayerBountyRecord returns correct structure', function() {
  var state = makeState();
  var record = BountyBoard.getPlayerBountyRecord(state, 'anyone');
  assert(typeof record.playerId === 'string', 'playerId is string');
  assert(typeof record.timesTargeted === 'number', 'timesTargeted is number');
  assert(typeof record.timesCleared === 'number', 'timesCleared is number');
  assert(typeof record.timesGuilty === 'number', 'timesGuilty is number');
  assert(typeof record.timesPosted === 'number', 'timesPosted is number');
  assert(typeof record.activeAgainst === 'number', 'activeAgainst is number');
  assert(typeof record.guiltRate === 'number', 'guiltRate is number');
});

test('getPlayerBountyRecord counts times targeted', function() {
  var state = makeState();
  postLocate(state, 'p1', 'villain', 100);
  postLocate(state, 'p2', 'villain', 110);
  var record = BountyBoard.getPlayerBountyRecord(state, 'villain');
  assertEqual(record.timesTargeted, 2, 'timesTargeted is 2');
});

test('getPlayerBountyRecord counts timesPosted', function() {
  var state = makeState();
  postLocate(state, 'poster1', 't1', 100);
  postLocate(state, 'poster1', 't2', 110);
  var record = BountyBoard.getPlayerBountyRecord(state, 'poster1');
  assertEqual(record.timesPosted, 2, 'timesPosted is 2');
});

test('getPlayerBountyRecord counts guilty verdicts', function() {
  var obj = buildResolvedBounty(true);
  var record = BountyBoard.getPlayerBountyRecord(obj.state, 'target1');
  assertEqual(record.timesTargeted, 1, 'timesTargeted 1');
  assertEqual(record.timesGuilty, 1, 'timesGuilty 1');
  assertEqual(record.timesCleared, 0, 'timesCleared 0');
});

test('getPlayerBountyRecord counts cleared verdicts', function() {
  var obj = buildResolvedBounty(false);
  var record = BountyBoard.getPlayerBountyRecord(obj.state, 'target1');
  assertEqual(record.timesCleared, 1, 'timesCleared 1');
  assertEqual(record.timesGuilty, 0, 'timesGuilty 0');
});

test('getPlayerBountyRecord counts active bounties against player', function() {
  var state = makeState();
  postLocate(state, 'p1', 'villain', 100);
  postLocate(state, 'p2', 'villain', 110);
  var record = BountyBoard.getPlayerBountyRecord(state, 'villain');
  assertEqual(record.activeAgainst, 2, 'activeAgainst is 2');
});

test('getPlayerBountyRecord computes guiltRate', function() {
  var obj = buildResolvedBounty(true);
  var record = BountyBoard.getPlayerBountyRecord(obj.state, 'target1');
  assertEqual(record.guiltRate, 1, 'guiltRate is 1.0 when always guilty');
});

test('getPlayerBountyRecord returns zeros for unknown player', function() {
  var state = makeState();
  var record = BountyBoard.getPlayerBountyRecord(state, 'nobody');
  assertEqual(record.timesTargeted, 0, 'timesTargeted 0');
  assertEqual(record.timesGuilty, 0, 'timesGuilty 0');
  assertEqual(record.guiltRate, 0, 'guiltRate 0');
});

// ===========================================================================
// FINAL REPORT
// ===========================================================================

process.stdout.write('\n===========================================\n');
process.stdout.write('RESULTS: ' + passed + ' passed, ' + failed + ' failed\n');
if (failures.length > 0) {
  process.stdout.write('\nFailed tests:\n');
  for (var f = 0; f < failures.length; f++) {
    process.stdout.write('  - ' + failures[f].name + '\n    ' + failures[f].error + '\n');
  }
  process.exit(1);
} else {
  process.stdout.write('All tests passed!\n');
  process.exit(0);
}
