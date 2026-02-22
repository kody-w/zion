/**
 * tests/test_anchor_management.js
 * 140+ tests for the ZION Anchor Management System (anchor_management.js)
 *
 * Covers:
 *   - ANCHOR_TYPES definitions
 *   - createState shape
 *   - proposeAnchor validation and limits
 *   - approveAnchor lifecycle and zone capacity
 *   - rejectAnchor workflow
 *   - removeAnchor lifecycle
 *   - getAnchor
 *   - getAnchorsInZone
 *   - getAnchorsByType
 *   - getAnchorsByCreator
 *   - isWithinRange (haversine)
 *   - visitAnchor rewards and visit tracking
 *   - getVisitCount
 *   - getPlayerVisits
 *   - getPopularAnchors
 *   - getPendingProposals
 *   - getAnchorStats
 *   - getAnchorLog
 *   - getNearbyAnchors
 *   - mulberry32 PRNG
 *   - edge cases and error paths
 *
 * Run with: node tests/test_anchor_management.js
 */

'use strict';

var AM = require('../src/js/anchor_management');

// ============================================================================
// Minimal test harness (var-only, zero-dep)
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
  assert(
    a === b,
    msg + ' (expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a) + ')'
  );
}

// ============================================================================
// Helpers
// ============================================================================

/** Create a fresh state */
function freshState() {
  return AM.createState();
}

/**
 * Shortcut: propose + approve an anchor, returning the anchor object.
 * Uses tick 100 for proposal, 101 for approval.
 */
function makeActiveAnchor(state, opts) {
  opts = opts || {};
  var creatorId   = opts.creatorId   || 'alice';
  var type        = opts.type        || 'portal';
  var name        = opts.name        || 'Test Portal';
  var lat         = (opts.lat !== undefined) ? opts.lat : 40.7128;
  var lng         = (opts.lng !== undefined) ? opts.lng : -74.0060;
  var zone        = opts.zone        || 'nexus';
  var description = opts.description || 'A test portal anchor';
  var stewardId   = opts.stewardId   || 'steward1';

  var pr = AM.proposeAnchor(state, creatorId, type, name, lat, lng, zone, description, 100);
  if (!pr.success) return null;
  var ap = AM.approveAnchor(state, pr.proposal.id, stewardId, 101);
  if (!ap.success) return null;
  return ap.anchor;
}

// ============================================================================
// Suite: Constants
// ============================================================================

suite('ANCHOR_TYPES definitions', function() {

  assert(Array.isArray(AM.ANCHOR_TYPES), 'ANCHOR_TYPES is an array');
  assert(AM.ANCHOR_TYPES.length === 5, 'ANCHOR_TYPES has exactly 5 entries');

  var ids = AM.ANCHOR_TYPES.map(function(t) { return t.id; });

  assert(ids.indexOf('portal') !== -1, 'portal type exists');
  assert(ids.indexOf('resource_node') !== -1, 'resource_node type exists');
  assert(ids.indexOf('discovery_point') !== -1, 'discovery_point type exists');
  assert(ids.indexOf('garden') !== -1, 'garden type exists');
  assert(ids.indexOf('monument') !== -1, 'monument type exists');

  AM.ANCHOR_TYPES.forEach(function(t) {
    assert(typeof t.id === 'string' && t.id.length > 0, t.id + ' has string id');
    assert(typeof t.label === 'string' && t.label.length > 0, t.id + ' has string label');
    assert(typeof t.description === 'string' && t.description.length > 0, t.id + ' has description');
    assert(typeof t.rewardType === 'string' && t.rewardType.length > 0, t.id + ' has rewardType');
    assert(typeof t.visitReward === 'object' && t.visitReward !== null, t.id + ' has visitReward object');
    assert(typeof t.visitReward.sparks === 'number', t.id + ' visitReward.sparks is number');
    assert(typeof t.visitReward.xp === 'number', t.id + ' visitReward.xp is number');
    assert(t.visitReward.sparks > 0, t.id + ' visitReward.sparks > 0');
    assert(t.visitReward.xp > 0, t.id + ' visitReward.xp > 0');
  });

  assert(Array.isArray(AM.VALID_TYPE_IDS), 'VALID_TYPE_IDS is an array');
  assert(AM.VALID_TYPE_IDS.length === 5, 'VALID_TYPE_IDS has 5 entries');

  assert(Array.isArray(AM.VALID_ZONES), 'VALID_ZONES is an array');
  assert(AM.VALID_ZONES.length === 8, 'VALID_ZONES has 8 entries');
  assert(AM.VALID_ZONES.indexOf('nexus') !== -1, 'nexus in VALID_ZONES');
  assert(AM.VALID_ZONES.indexOf('gardens') !== -1, 'gardens in VALID_ZONES');
  assert(AM.VALID_ZONES.indexOf('athenaeum') !== -1, 'athenaeum in VALID_ZONES');
  assert(AM.VALID_ZONES.indexOf('arena') !== -1, 'arena in VALID_ZONES');

  assertEqual(AM.MAX_ANCHORS_PER_ZONE, 20, 'MAX_ANCHORS_PER_ZONE is 20');
  assertEqual(AM.MAX_PROPOSALS_PER_PLAYER, 5, 'MAX_PROPOSALS_PER_PLAYER is 5');
  assertEqual(AM.DEFAULT_GEOFENCE_RADIUS_M, 50, 'DEFAULT_GEOFENCE_RADIUS_M is 50');

});

// ============================================================================
// Suite: createState
// ============================================================================

suite('createState', function() {

  var s = AM.createState();

  assert(s !== null && typeof s === 'object', 'createState returns object');
  assert(typeof s.anchors === 'object' && s.anchors !== null, 'state has anchors dict');
  assert(Array.isArray(s.proposals), 'state has proposals array');
  assert(typeof s.visits === 'object' && s.visits !== null, 'state has visits dict');
  assert(Array.isArray(s.anchorLog), 'state has anchorLog array');
  assertEqual(Object.keys(s.anchors).length, 0, 'anchors starts empty');
  assertEqual(s.proposals.length, 0, 'proposals starts empty');
  assertEqual(s.anchorLog.length, 0, 'anchorLog starts empty');

  // Two fresh states are independent
  var s2 = AM.createState();
  s.proposals.push({ fake: true });
  assertEqual(s2.proposals.length, 0, 'states are independent (not shared reference)');

});

// ============================================================================
// Suite: proposeAnchor — valid proposals
// ============================================================================

suite('proposeAnchor — valid', function() {

  var s = freshState();
  var result = AM.proposeAnchor(s, 'alice', 'portal', 'Central Portal', 40.7128, -74.0060, 'nexus', 'A nexus portal', 1);

  assert(result.success === true, 'valid proposal succeeds');
  assert(result.proposal !== null && typeof result.proposal === 'object', 'proposal object returned');
  assert(result.reason === null, 'no reason string on success');
  assertEqual(result.proposal.status, 'proposed', 'proposal starts as proposed');
  assertEqual(result.proposal.creatorId, 'alice', 'creatorId is set');
  assertEqual(result.proposal.type, 'portal', 'type is set');
  assertEqual(result.proposal.name, 'Central Portal', 'name is set');
  assertEqual(result.proposal.zone, 'nexus', 'zone is set');
  assertEqual(result.proposal.lat, 40.7128, 'lat is set');
  assertEqual(result.proposal.lng, -74.0060, 'lng is set');
  assertEqual(result.proposal.proposedTick, 1, 'proposedTick recorded');
  assert(typeof result.proposal.id === 'string' && result.proposal.id.length > 0, 'proposal has id');
  assert(typeof result.proposal.geofenceRadius === 'number', 'proposal has geofenceRadius');

  // Added to state
  assertEqual(s.proposals.length, 1, 'proposal added to state');
  assertEqual(s.proposals[0].id, result.proposal.id, 'state proposal id matches');

  // Log entry created
  assert(s.anchorLog.length >= 1, 'log entry created');
  assertEqual(s.anchorLog[0].event, 'proposed', 'log event is proposed');
  assertEqual(s.anchorLog[0].actorId, 'alice', 'log actorId is alice');

});

suite('proposeAnchor — all valid types accepted', function() {

  AM.VALID_TYPE_IDS.forEach(function(typeId) {
    var s = freshState();
    var r = AM.proposeAnchor(s, 'bob', typeId, 'Test ' + typeId, 51.5074, -0.1278, 'gardens', 'desc', 10);
    assert(r.success === true, typeId + ' is a valid anchor type');
  });

});

suite('proposeAnchor — all valid zones accepted', function() {

  AM.VALID_ZONES.forEach(function(zone) {
    var s = freshState();
    var r = AM.proposeAnchor(s, 'carol', 'portal', 'Zone Portal', 48.8566, 2.3522, zone, 'desc', 5);
    assert(r.success === true, zone + ' is a valid zone for proposals');
  });

});

// ============================================================================
// Suite: proposeAnchor — validation failures
// ============================================================================

suite('proposeAnchor — invalid type', function() {

  var s = freshState();
  var r = AM.proposeAnchor(s, 'alice', 'secret_base', 'Bad Type', 40.7, -74.0, 'nexus', 'desc', 1);
  assert(r.success === false, 'invalid type is rejected');
  assert(typeof r.reason === 'string' && r.reason.length > 0, 'reason is provided');
  assertEqual(s.proposals.length, 0, 'nothing added to state on failure');

});

suite('proposeAnchor — invalid zone', function() {

  var s = freshState();
  var r = AM.proposeAnchor(s, 'alice', 'portal', 'Moon Portal', 40.7, -74.0, 'moon_base', 'desc', 1);
  assert(r.success === false, 'invalid zone is rejected');
  assert(typeof r.reason === 'string', 'reason is provided');

});

suite('proposeAnchor — bad GPS values', function() {

  var badCases = [
    { lat: 95,   lng: 0,    label: 'lat > 90' },
    { lat: -95,  lng: 0,    label: 'lat < -90' },
    { lat: 45,   lng: 200,  label: 'lng > 180' },
    { lat: 45,   lng: -200, label: 'lng < -180' },
    { lat: 'x',  lng: 0,    label: 'lat is string' },
    { lat: null, lng: 0,    label: 'lat is null' },
    { lat: 45,   lng: undefined, label: 'lng is undefined' }
  ];

  badCases.forEach(function(c) {
    var s = freshState();
    var r = AM.proposeAnchor(s, 'alice', 'portal', 'Bad GPS', c.lat, c.lng, 'nexus', 'desc', 1);
    assert(r.success === false, 'GPS failure: ' + c.label);
  });

});

suite('proposeAnchor — empty name or description', function() {

  var s = freshState();
  var r1 = AM.proposeAnchor(s, 'alice', 'portal', '', 40.7, -74.0, 'nexus', 'desc', 1);
  assert(r1.success === false, 'empty name is rejected');

  var r2 = AM.proposeAnchor(s, 'alice', 'portal', 'Name', 40.7, -74.0, 'nexus', '', 1);
  assert(r2.success === false, 'empty description is rejected');

  var r3 = AM.proposeAnchor(s, 'alice', 'portal', '   ', 40.7, -74.0, 'nexus', 'desc', 1);
  assert(r3.success === false, 'whitespace-only name is rejected');

});

suite('proposeAnchor — empty creatorId', function() {

  var s = freshState();
  var r = AM.proposeAnchor(s, '', 'portal', 'Name', 40.7, -74.0, 'nexus', 'desc', 1);
  assert(r.success === false, 'empty creatorId is rejected');

});

suite('proposeAnchor — player proposal limit (5)', function() {

  var s = freshState();
  // Propose 5 — should all succeed
  for (var i = 0; i < 5; i++) {
    var lat = 40.0 + (i * 0.01);
    var r = AM.proposeAnchor(s, 'dave', 'portal', 'Portal ' + i, lat, -74.0, 'nexus', 'desc', i);
    assert(r.success === true, 'proposal ' + (i + 1) + ' of 5 succeeds');
  }

  // 6th should fail
  var rFail = AM.proposeAnchor(s, 'dave', 'portal', 'Portal 6', 40.1, -74.0, 'nexus', 'desc', 10);
  assert(rFail.success === false, 'proposal 6 of 5 is rejected (limit reached)');
  assert(typeof rFail.reason === 'string', 'reason string provided on limit failure');

  // Different player can still propose
  var rOther = AM.proposeAnchor(s, 'eve', 'portal', 'Eve Portal', 40.2, -74.0, 'nexus', 'desc', 11);
  assert(rOther.success === true, 'other player is not affected by dave\'s limit');

});

suite('proposeAnchor — name is trimmed', function() {

  var s = freshState();
  var r = AM.proposeAnchor(s, 'alice', 'portal', '  Trimmed Name  ', 40.7, -74.0, 'nexus', 'desc', 1);
  assert(r.success === true, 'proposal with padded name succeeds');
  assertEqual(r.proposal.name, 'Trimmed Name', 'name is trimmed');

});

// ============================================================================
// Suite: approveAnchor
// ============================================================================

suite('approveAnchor — happy path', function() {

  var s = freshState();
  var pr = AM.proposeAnchor(s, 'alice', 'portal', 'Gate A', 40.7128, -74.0060, 'nexus', 'desc', 10);
  var ap = AM.approveAnchor(s, pr.proposal.id, 'steward1', 20);

  assert(ap.success === true, 'approveAnchor succeeds');
  assert(ap.anchor !== null && typeof ap.anchor === 'object', 'anchor object returned');
  assert(ap.reason === null, 'no reason on success');

  var anchor = ap.anchor;
  assert(typeof anchor.id === 'string' && anchor.id.length > 0, 'anchor has id');
  assertEqual(anchor.type, 'portal', 'anchor type matches');
  assertEqual(anchor.zone, 'nexus', 'anchor zone matches');
  assertEqual(anchor.lat, 40.7128, 'anchor lat matches');
  assertEqual(anchor.lng, -74.0060, 'anchor lng matches');
  assertEqual(anchor.creatorId, 'alice', 'anchor creatorId matches');
  assertEqual(anchor.stewardId, 'steward1', 'anchor stewardId set');
  assertEqual(anchor.status, 'active', 'anchor status is active');
  assertEqual(anchor.visitCount, 0, 'new anchor has 0 visits');
  assertEqual(anchor.createdTick, 20, 'createdTick is approval tick');

  // Added to state
  assert(s.anchors[anchor.id] !== undefined, 'anchor added to state.anchors');

  // Proposal status updated
  assertEqual(s.proposals[0].status, 'approved', 'proposal status updated to approved');

  // Log entry
  var log = AM.getAnchorLog(s, anchor.id);
  assert(log.length >= 1, 'anchor has log entry');
  assertEqual(log[0].event, 'approved', 'log event is approved');

});

suite('approveAnchor — unknown proposalId', function() {

  var s = freshState();
  var ap = AM.approveAnchor(s, 'nonexistent_prop', 'steward1', 20);
  assert(ap.success === false, 'approving non-existent proposal fails');
  assert(typeof ap.reason === 'string', 'reason provided');

});

suite('approveAnchor — double-approve rejected', function() {

  var s = freshState();
  var pr = AM.proposeAnchor(s, 'alice', 'portal', 'Gate', 40.7, -74.0, 'nexus', 'desc', 10);
  AM.approveAnchor(s, pr.proposal.id, 'steward1', 20);

  // Try to approve again
  var ap2 = AM.approveAnchor(s, pr.proposal.id, 'steward1', 30);
  assert(ap2.success === false, 'double-approve is rejected');

});

suite('approveAnchor — zone capacity limit', function() {

  var s = freshState();
  // Fill zone to capacity (20 anchors)
  for (var i = 0; i < 20; i++) {
    var lat = 40.0 + (i * 0.001);
    var pr = AM.proposeAnchor(s, 'builder' + i, 'portal', 'Portal ' + i, lat, -74.0, 'nexus', 'desc', i);
    AM.approveAnchor(s, pr.proposal.id, 'steward1', i + 100);
  }

  // 21st anchor in same zone should fail approval
  var pr21 = AM.proposeAnchor(s, 'extra', 'portal', 'Extra Portal', 40.5, -74.0, 'nexus', 'desc', 200);
  var ap21 = AM.approveAnchor(s, pr21.proposal.id, 'steward1', 201);
  assert(ap21.success === false, 'zone capacity limit enforced at ' + AM.MAX_ANCHORS_PER_ZONE);
  assert(typeof ap21.reason === 'string', 'reason provided on capacity failure');

  // Different zone still has capacity
  var prDiff = AM.proposeAnchor(s, 'extra', 'portal', 'Arena Portal', 41.0, -74.0, 'arena', 'desc', 202);
  var apDiff = AM.approveAnchor(s, prDiff.proposal.id, 'steward1', 203);
  assert(apDiff.success === true, 'different zone can still accept anchors');

});

// ============================================================================
// Suite: rejectAnchor
// ============================================================================

suite('rejectAnchor — happy path', function() {

  var s = freshState();
  var pr = AM.proposeAnchor(s, 'alice', 'portal', 'Risky Spot', 40.7, -74.0, 'nexus', 'desc', 10);
  var rj = AM.rejectAnchor(s, pr.proposal.id, 'steward1', 'Private property', 20);

  assert(rj.success === true, 'rejectAnchor succeeds');
  assert(rj.reason === null, 'no reason returned on success');

  // Proposal status updated
  assertEqual(s.proposals[0].status, 'rejected', 'proposal status is rejected');
  assertEqual(s.proposals[0].rejectedBy, 'steward1', 'rejectedBy set');
  assertEqual(s.proposals[0].rejectReason, 'Private property', 'rejectReason stored');

  // Log entry
  var log = AM.getAnchorLog(s, pr.proposal.id);
  assert(log.length >= 1, 'rejection logged');
  assertEqual(log[log.length - 1].event, 'rejected', 'log event is rejected');

});

suite('rejectAnchor — non-existent proposal', function() {

  var s = freshState();
  var rj = AM.rejectAnchor(s, 'bad_id', 'steward1', 'reason', 10);
  assert(rj.success === false, 'rejecting non-existent proposal fails');

});

suite('rejectAnchor — already rejected proposal cannot be rejected again', function() {

  var s = freshState();
  var pr = AM.proposeAnchor(s, 'alice', 'portal', 'Bad Spot', 40.7, -74.0, 'nexus', 'desc', 1);
  AM.rejectAnchor(s, pr.proposal.id, 'steward1', 'reason', 2);
  var rj2 = AM.rejectAnchor(s, pr.proposal.id, 'steward2', 'another reason', 3);
  assert(rj2.success === false, 'double-reject is rejected');

});

suite('rejectAnchor — approved proposal cannot be rejected', function() {

  var s = freshState();
  var pr = AM.proposeAnchor(s, 'alice', 'portal', 'Good Spot', 40.7, -74.0, 'nexus', 'desc', 1);
  AM.approveAnchor(s, pr.proposal.id, 'steward1', 2);
  var rj = AM.rejectAnchor(s, pr.proposal.id, 'steward1', 'too late', 3);
  assert(rj.success === false, 'approved proposal cannot be rejected');

});

suite('rejectAnchor — default reason when not provided', function() {

  var s = freshState();
  var pr = AM.proposeAnchor(s, 'alice', 'portal', 'Spot', 40.7, -74.0, 'nexus', 'desc', 1);
  AM.rejectAnchor(s, pr.proposal.id, 'steward1', null, 2);
  assert(typeof s.proposals[0].rejectReason === 'string', 'rejectReason is always a string');
  assert(s.proposals[0].rejectReason.length > 0, 'default reason is non-empty');

});

// freed proposal slot: after rejection, the player can propose again
suite('rejectAnchor — rejected proposal does not consume proposal slot indefinitely', function() {

  var s = freshState();

  // Propose and immediately reject 5 proposals
  for (var i = 0; i < 5; i++) {
    var pr = AM.proposeAnchor(s, 'frank', 'portal', 'P' + i, 40.0 + i * 0.01, -74.0, 'nexus', 'desc', i);
    assert(pr.success === true, 'proposal ' + (i + 1) + ' created');
    AM.rejectAnchor(s, pr.proposal.id, 'steward1', 'bad location', i + 10);
  }

  // All 5 are now rejected — pending count should be 0, so player can propose again
  var prNew = AM.proposeAnchor(s, 'frank', 'portal', 'New Portal', 40.9, -74.0, 'nexus', 'desc', 100);
  assert(prNew.success === true, 'after rejection, player can propose again');

});

// ============================================================================
// Suite: removeAnchor
// ============================================================================

suite('removeAnchor — happy path', function() {

  var s = freshState();
  var anchor = makeActiveAnchor(s);
  assert(anchor !== null, 'anchor created');

  var rm = AM.removeAnchor(s, anchor.id, 'steward1', 'Unsafe location', 200);
  assert(rm.success === true, 'removeAnchor succeeds');
  assert(rm.reason === null, 'no reason on success');

  assertEqual(s.anchors[anchor.id].status, 'removed', 'anchor status set to removed');
  assertEqual(s.anchors[anchor.id].removedBy, 'steward1', 'removedBy recorded');
  assertEqual(s.anchors[anchor.id].removeReason, 'Unsafe location', 'removeReason stored');

  // Log entry
  var log = AM.getAnchorLog(s, anchor.id);
  var hasRemovedEvent = log.some(function(e) { return e.event === 'removed'; });
  assert(hasRemovedEvent, 'removed event in anchor log');

});

suite('removeAnchor — non-existent anchor', function() {

  var s = freshState();
  var rm = AM.removeAnchor(s, 'fake_anchor_id', 'steward1', 'reason', 10);
  assert(rm.success === false, 'removing non-existent anchor fails');
  assert(typeof rm.reason === 'string', 'reason provided');

});

suite('removeAnchor — already removed anchor', function() {

  var s = freshState();
  var anchor = makeActiveAnchor(s);
  AM.removeAnchor(s, anchor.id, 'steward1', 'first removal', 200);
  var rm2 = AM.removeAnchor(s, anchor.id, 'steward1', 'second removal', 201);
  assert(rm2.success === false, 'double-remove is rejected');

});

suite('removeAnchor — default reason', function() {

  var s = freshState();
  var anchor = makeActiveAnchor(s);
  AM.removeAnchor(s, anchor.id, 'steward1', undefined, 200);
  assert(typeof s.anchors[anchor.id].removeReason === 'string', 'removeReason always a string');

});

// ============================================================================
// Suite: getAnchor
// ============================================================================

suite('getAnchor', function() {

  var s = freshState();
  var anchor = makeActiveAnchor(s);

  var found = AM.getAnchor(s, anchor.id);
  assert(found !== null, 'getAnchor returns anchor by id');
  assertEqual(found.id, anchor.id, 'returned anchor id matches');

  var notFound = AM.getAnchor(s, 'does_not_exist');
  assert(notFound === null, 'getAnchor returns null for unknown id');

});

// ============================================================================
// Suite: getAnchorsInZone
// ============================================================================

suite('getAnchorsInZone', function() {

  var s = freshState();
  makeActiveAnchor(s, { zone: 'nexus', lat: 40.7,  name: 'N1', description: 'desc1' });
  makeActiveAnchor(s, { zone: 'nexus', lat: 40.8,  name: 'N2', description: 'desc2' });
  makeActiveAnchor(s, { zone: 'arena', lat: 40.9,  name: 'A1', description: 'desc3' });

  var nexusAnchors = AM.getAnchorsInZone(s, 'nexus');
  assertEqual(nexusAnchors.length, 2, 'getAnchorsInZone returns 2 nexus anchors');
  nexusAnchors.forEach(function(a) {
    assertEqual(a.zone, 'nexus', 'all returned anchors are in nexus');
  });

  var arenaAnchors = AM.getAnchorsInZone(s, 'arena');
  assertEqual(arenaAnchors.length, 1, 'getAnchorsInZone returns 1 arena anchor');

  var emptyZone = AM.getAnchorsInZone(s, 'wilds');
  assertEqual(emptyZone.length, 0, 'zone with no anchors returns empty array');

  // Removed anchors should not appear
  AM.removeAnchor(s, arenaAnchors[0].id, 'steward1', 'test', 999);
  var arenaAfterRemove = AM.getAnchorsInZone(s, 'arena');
  assertEqual(arenaAfterRemove.length, 0, 'removed anchors excluded from getAnchorsInZone');

});

// ============================================================================
// Suite: getAnchorsByType
// ============================================================================

suite('getAnchorsByType', function() {

  var s = freshState();
  makeActiveAnchor(s, { type: 'portal',         lat: 40.1, name: 'P1', description: 'desc' });
  makeActiveAnchor(s, { type: 'portal',         lat: 40.2, name: 'P2', description: 'desc' });
  makeActiveAnchor(s, { type: 'resource_node',  lat: 40.3, name: 'R1', description: 'desc' });
  makeActiveAnchor(s, { type: 'monument',       lat: 40.4, name: 'M1', description: 'desc' });

  var portals = AM.getAnchorsByType(s, 'portal');
  assertEqual(portals.length, 2, 'getAnchorsByType returns 2 portals');
  portals.forEach(function(a) { assertEqual(a.type, 'portal', 'type is portal'); });

  var resources = AM.getAnchorsByType(s, 'resource_node');
  assertEqual(resources.length, 1, 'getAnchorsByType returns 1 resource_node');

  var unknown = AM.getAnchorsByType(s, 'unknown_type');
  assertEqual(unknown.length, 0, 'unknown type returns empty array');

});

// ============================================================================
// Suite: getAnchorsByCreator
// ============================================================================

suite('getAnchorsByCreator', function() {

  var s = freshState();
  makeActiveAnchor(s, { creatorId: 'alice', lat: 40.1, name: 'A1', description: 'desc' });
  makeActiveAnchor(s, { creatorId: 'alice', lat: 40.2, name: 'A2', description: 'desc' });
  makeActiveAnchor(s, { creatorId: 'bob',   lat: 40.3, name: 'B1', description: 'desc' });

  var aliceAnchors = AM.getAnchorsByCreator(s, 'alice');
  assertEqual(aliceAnchors.length, 2, 'alice has 2 anchors');
  aliceAnchors.forEach(function(a) { assertEqual(a.creatorId, 'alice', 'creatorId is alice'); });

  var bobAnchors = AM.getAnchorsByCreator(s, 'bob');
  assertEqual(bobAnchors.length, 1, 'bob has 1 anchor');

  var noAnchors = AM.getAnchorsByCreator(s, 'eve');
  assertEqual(noAnchors.length, 0, 'eve has no anchors');

});

// ============================================================================
// Suite: isWithinRange (haversine)
// ============================================================================

suite('isWithinRange', function() {

  // Same point is always within any positive radius
  assert(AM.isWithinRange(40.7128, -74.0060, 40.7128, -74.0060, 0) === true, 'same point is within 0m');
  assert(AM.isWithinRange(40.7128, -74.0060, 40.7128, -74.0060, 50) === true, 'same point is within 50m');

  // Two points ~110m apart: within 150m, not within 50m
  assert(AM.isWithinRange(40.7128, -74.0060, 40.7138, -74.0060, 150) === true, '~110m apart is within 150m');
  assert(AM.isWithinRange(40.7128, -74.0060, 40.7138, -74.0060, 50) === false, '~110m apart is outside 50m');

  // NYC to LA: definitely not within 1000m
  assert(AM.isWithinRange(40.7128, -74.0060, 34.0522, -118.2437, 1000) === false, 'NYC to LA not within 1000m');
  assert(AM.isWithinRange(40.7128, -74.0060, 34.0522, -118.2437, 4000000) === true, 'NYC to LA within 4000km');

  // Default radius (50m)
  assert(AM.isWithinRange(40.7128, -74.0060, 40.7128, -74.0060) === true, 'same point within default radius');

  // Player ~40m north (~0.00036 degrees lat) — well within 50m
  assert(AM.isWithinRange(40.7128, -74.0060, 40.71316, -74.0060, 50) === true, 'player ~40m away is within 50m');
  assert(AM.isWithinRange(40.7128, -74.0060, 40.7155, -74.0060, 50) === false, 'player 300m away is outside 50m');

  // London to Paris: not within 1000m
  assert(AM.isWithinRange(51.5074, -0.1278, 48.8566, 2.3522, 1000) === false, 'London to Paris not within 1000m');

});

suite('haversineDistance — accuracy', function() {

  // NYC to LA ~3940km
  var nycToLa = AM.haversineDistance(40.7128, -74.0060, 34.0522, -118.2437);
  assert(nycToLa / 1000 > 3900 && nycToLa / 1000 < 4000, 'NYC to LA ~3900-4000km, got: ' + (nycToLa/1000).toFixed(0));

  // Same point = 0
  var same = AM.haversineDistance(48.8566, 2.3522, 48.8566, 2.3522);
  assertEqual(same, 0, 'same point distance is 0');

  // 1 degree latitude ≈ 111km
  var oneDeg = AM.haversineDistance(0, 0, 1, 0);
  assert(oneDeg > 100000 && oneDeg < 120000, '1 degree latitude ≈ 111km');

});

// ============================================================================
// Suite: visitAnchor
// ============================================================================

suite('visitAnchor — happy path', function() {

  var s = freshState();
  var anchor = makeActiveAnchor(s, { type: 'portal' });

  var visit = AM.visitAnchor(s, 'player1', anchor.id, 500);
  assert(visit.success === true, 'visitAnchor succeeds');
  assert(visit.reward !== null && typeof visit.reward === 'object', 'reward object returned');
  assert(typeof visit.reward.sparks === 'number' && visit.reward.sparks > 0, 'reward has sparks > 0');
  assert(typeof visit.reward.xp === 'number' && visit.reward.xp > 0, 'reward has xp > 0');
  assert(typeof visit.reward.rewardType === 'string', 'reward has rewardType');
  assert(visit.reason === null, 'no reason on success');

  // Visit count incremented
  assertEqual(AM.getVisitCount(s, anchor.id), 1, 'visitCount is 1 after first visit');

  // Player visits recorded
  var playerVisits = AM.getPlayerVisits(s, 'player1');
  assertEqual(playerVisits.length, 1, 'player has 1 visit recorded');
  assertEqual(playerVisits[0].anchorId, anchor.id, 'visit record has correct anchorId');
  assertEqual(playerVisits[0].tick, 500, 'visit record has correct tick');

  // Log entry
  var log = AM.getAnchorLog(s, anchor.id);
  var hasVisitEvent = log.some(function(e) { return e.event === 'visited'; });
  assert(hasVisitEvent, 'visited event in anchor log');

});

suite('visitAnchor — all anchor types grant appropriate rewards', function() {

  AM.ANCHOR_TYPES.forEach(function(typeDef) {
    var s = freshState();
    var anchor = makeActiveAnchor(s, { type: typeDef.id, lat: 40.0 + Math.random() * 0.1, name: typeDef.label, description: 'desc' });
    if (!anchor) return;
    var visit = AM.visitAnchor(s, 'testplayer', anchor.id, 100);
    assert(visit.success === true, typeDef.id + ' visit succeeds');
    assertEqual(visit.reward.sparks, typeDef.visitReward.sparks, typeDef.id + ' grants correct sparks');
    assertEqual(visit.reward.xp, typeDef.visitReward.xp, typeDef.id + ' grants correct xp');
    assertEqual(visit.reward.rewardType, typeDef.rewardType, typeDef.id + ' has correct rewardType');
  });

});

suite('visitAnchor — multiple players', function() {

  var s = freshState();
  var anchor = makeActiveAnchor(s);

  AM.visitAnchor(s, 'player1', anchor.id, 100);
  AM.visitAnchor(s, 'player2', anchor.id, 200);
  AM.visitAnchor(s, 'player3', anchor.id, 300);

  assertEqual(AM.getVisitCount(s, anchor.id), 3, 'visitCount is 3 after 3 visits');
  assertEqual(AM.getPlayerVisits(s, 'player1').length, 1, 'player1 has 1 visit');
  assertEqual(AM.getPlayerVisits(s, 'player2').length, 1, 'player2 has 1 visit');

});

suite('visitAnchor — same player multiple visits', function() {

  var s = freshState();
  var anchor = makeActiveAnchor(s);

  AM.visitAnchor(s, 'player1', anchor.id, 100);
  AM.visitAnchor(s, 'player1', anchor.id, 200);

  assertEqual(AM.getVisitCount(s, anchor.id), 2, 'visitCount is 2 for 2 visits from same player');
  assertEqual(AM.getPlayerVisits(s, 'player1').length, 2, 'player1 has 2 visit records');

});

suite('visitAnchor — non-existent anchor', function() {

  var s = freshState();
  var visit = AM.visitAnchor(s, 'player1', 'no_such_anchor', 100);
  assert(visit.success === false, 'visiting non-existent anchor fails');
  assert(typeof visit.reason === 'string', 'reason provided');

});

suite('visitAnchor — removed anchor cannot be visited', function() {

  var s = freshState();
  var anchor = makeActiveAnchor(s);
  AM.removeAnchor(s, anchor.id, 'steward1', 'test', 200);

  var visit = AM.visitAnchor(s, 'player1', anchor.id, 300);
  assert(visit.success === false, 'removed anchor cannot be visited');

});

// ============================================================================
// Suite: getVisitCount
// ============================================================================

suite('getVisitCount', function() {

  var s = freshState();
  var anchor = makeActiveAnchor(s);

  assertEqual(AM.getVisitCount(s, anchor.id), 0, 'initial visit count is 0');
  AM.visitAnchor(s, 'p1', anchor.id, 100);
  assertEqual(AM.getVisitCount(s, anchor.id), 1, 'visit count is 1 after one visit');
  AM.visitAnchor(s, 'p2', anchor.id, 200);
  assertEqual(AM.getVisitCount(s, anchor.id), 2, 'visit count is 2 after two visits');

  // Unknown anchor
  assertEqual(AM.getVisitCount(s, 'ghost_id'), 0, 'getVisitCount returns 0 for unknown anchor');

});

// ============================================================================
// Suite: getPlayerVisits
// ============================================================================

suite('getPlayerVisits', function() {

  var s = freshState();
  var a1 = makeActiveAnchor(s, { lat: 40.1, name: 'Anchor1', description: 'd' });
  var a2 = makeActiveAnchor(s, { lat: 40.2, name: 'Anchor2', description: 'd' });

  assertEqual(AM.getPlayerVisits(s, 'nobody').length, 0, 'player with no visits returns empty array');

  AM.visitAnchor(s, 'alice', a1.id, 100);
  AM.visitAnchor(s, 'alice', a2.id, 200);

  var aliceVisits = AM.getPlayerVisits(s, 'alice');
  assertEqual(aliceVisits.length, 2, 'alice has 2 visits');
  var visitedIds = aliceVisits.map(function(v) { return v.anchorId; });
  assert(visitedIds.indexOf(a1.id) !== -1, 'alice visited a1');
  assert(visitedIds.indexOf(a2.id) !== -1, 'alice visited a2');

});

// ============================================================================
// Suite: getPopularAnchors
// ============================================================================

suite('getPopularAnchors', function() {

  var s = freshState();
  var a1 = makeActiveAnchor(s, { lat: 40.1, name: 'A1', description: 'd' });
  var a2 = makeActiveAnchor(s, { lat: 40.2, name: 'A2', description: 'd' });
  var a3 = makeActiveAnchor(s, { lat: 40.3, name: 'A3', description: 'd' });

  // Visit counts: a2=5, a1=3, a3=1
  for (var i = 0; i < 5; i++) AM.visitAnchor(s, 'p' + i, a2.id, 100 + i);
  for (var j = 0; j < 3; j++) AM.visitAnchor(s, 'q' + j, a1.id, 200 + j);
  AM.visitAnchor(s, 'r0', a3.id, 300);

  var top2 = AM.getPopularAnchors(s, 2);
  assertEqual(top2.length, 2, 'getPopularAnchors(2) returns 2 anchors');
  assertEqual(top2[0].id, a2.id, 'most popular anchor first');
  assertEqual(top2[0].visitCount, 5, 'most popular has 5 visits');
  assertEqual(top2[1].id, a1.id, 'second most popular second');

  var top10 = AM.getPopularAnchors(s, 10);
  assertEqual(top10.length, 3, 'asking for more than available returns all');

  // Removed anchors should not appear
  AM.removeAnchor(s, a2.id, 'steward1', 'test', 999);
  var topAfterRemove = AM.getPopularAnchors(s, 3);
  var topIds = topAfterRemove.map(function(a) { return a.id; });
  assert(topIds.indexOf(a2.id) === -1, 'removed anchor excluded from popular list');

});

suite('getPopularAnchors — empty state', function() {

  var s = freshState();
  var top = AM.getPopularAnchors(s, 5);
  assert(Array.isArray(top) && top.length === 0, 'empty state returns empty array');

});

// ============================================================================
// Suite: getPendingProposals
// ============================================================================

suite('getPendingProposals', function() {

  var s = freshState();
  var pr1 = AM.proposeAnchor(s, 'alice', 'portal',  'P1', 40.1, -74.0, 'nexus',  'desc', 1);
  var pr2 = AM.proposeAnchor(s, 'bob',   'garden',  'G1', 40.2, -74.0, 'nexus',  'desc', 2);
  var pr3 = AM.proposeAnchor(s, 'carol', 'monument','M1', 40.3, -74.0, 'arena',  'desc', 3);

  var allPending = AM.getPendingProposals(s);
  assertEqual(allPending.length, 3, 'getPendingProposals returns all 3 pending proposals');

  var nexusPending = AM.getPendingProposals(s, 'nexus');
  assertEqual(nexusPending.length, 2, 'nexus zone has 2 pending proposals');

  var arenaPending = AM.getPendingProposals(s, 'arena');
  assertEqual(arenaPending.length, 1, 'arena zone has 1 pending proposal');

  var wildsPending = AM.getPendingProposals(s, 'wilds');
  assertEqual(wildsPending.length, 0, 'wilds zone has 0 pending proposals');

  // After approval, proposal removed from pending
  AM.approveAnchor(s, pr1.proposal.id, 'steward1', 10);
  var allPendingAfter = AM.getPendingProposals(s);
  assertEqual(allPendingAfter.length, 2, 'only 2 pending after 1 approval');

  // After rejection
  AM.rejectAnchor(s, pr2.proposal.id, 'steward1', 'reason', 11);
  var allPendingAfterRej = AM.getPendingProposals(s);
  assertEqual(allPendingAfterRej.length, 1, 'only 1 pending after rejection');

});

// ============================================================================
// Suite: getAnchorStats
// ============================================================================

suite('getAnchorStats', function() {

  var s = freshState();

  // Add a proposal (pending)
  AM.proposeAnchor(s, 'dave', 'portal', 'Pending P', 40.9, -74.0, 'nexus', 'desc', 1);

  var a1 = makeActiveAnchor(s, { type: 'portal',        zone: 'nexus', lat: 40.1, name: 'P1', description: 'd' });
  var a2 = makeActiveAnchor(s, { type: 'resource_node', zone: 'nexus', lat: 40.2, name: 'R1', description: 'd' });
  var a3 = makeActiveAnchor(s, { type: 'portal',        zone: 'arena', lat: 40.3, name: 'P2', description: 'd' });

  AM.visitAnchor(s, 'p1', a1.id, 100);
  AM.visitAnchor(s, 'p2', a1.id, 200);
  AM.visitAnchor(s, 'p3', a2.id, 300);

  var nexusStats = AM.getAnchorStats(s, 'nexus');
  assertEqual(nexusStats.totalAnchors, 2, 'nexus has 2 active anchors');
  assertEqual(nexusStats.byType['portal'], 1, 'nexus has 1 portal');
  assertEqual(nexusStats.byType['resource_node'], 1, 'nexus has 1 resource_node');
  assertEqual(nexusStats.totalVisits, 3, 'nexus total visits is 3');
  assertEqual(nexusStats.pendingProposals, 1, 'nexus has 1 pending proposal');

  var arenaStats = AM.getAnchorStats(s, 'arena');
  assertEqual(arenaStats.totalAnchors, 1, 'arena has 1 active anchor');
  assertEqual(arenaStats.totalVisits, 0, 'arena has 0 visits');

  var allStats = AM.getAnchorStats(s);
  assertEqual(allStats.totalAnchors, 3, 'all zones: 3 active anchors total');
  assertEqual(allStats.totalVisits, 3, 'all zones: 3 visits total');

});

suite('getAnchorStats — empty state', function() {

  var s = freshState();
  var stats = AM.getAnchorStats(s);
  assertEqual(stats.totalAnchors, 0, 'empty state has 0 anchors');
  assertEqual(stats.totalVisits, 0, 'empty state has 0 visits');
  assertEqual(stats.pendingProposals, 0, 'empty state has 0 pending proposals');
  assert(typeof stats.byType === 'object', 'byType is object');

});

// ============================================================================
// Suite: getAnchorLog
// ============================================================================

suite('getAnchorLog', function() {

  var s = freshState();
  var pr = AM.proposeAnchor(s, 'alice', 'portal', 'Gate', 40.7, -74.0, 'nexus', 'desc', 10);
  var ap = AM.approveAnchor(s, pr.proposal.id, 'steward1', 20);
  var anchor = ap.anchor;

  AM.visitAnchor(s, 'p1', anchor.id, 30);
  AM.visitAnchor(s, 'p2', anchor.id, 40);
  AM.removeAnchor(s, anchor.id, 'steward1', 'test', 50);

  var log = AM.getAnchorLog(s, anchor.id);
  assert(Array.isArray(log), 'getAnchorLog returns array');
  assert(log.length >= 3, 'log has at least 3 entries (approve, 2 visits, remove)');

  var events = log.map(function(e) { return e.event; });
  assert(events.indexOf('approved') !== -1, 'log contains approved event');
  assert(events.indexOf('visited') !== -1, 'log contains visited event');
  assert(events.indexOf('removed') !== -1, 'log contains removed event');

  log.forEach(function(entry) {
    assert(typeof entry.event === 'string', 'each log entry has event string');
    assert(typeof entry.actorId === 'string', 'each log entry has actorId');
    assert(typeof entry.tick === 'number', 'each log entry has tick');
    assertEqual(entry.anchorId, anchor.id, 'each log entry has correct anchorId');
  });

  // Unknown anchor returns empty array
  var emptyLog = AM.getAnchorLog(s, 'ghost');
  assertEqual(emptyLog.length, 0, 'unknown anchor returns empty log');

  // Proposal log (uses proposalId as anchorId in log)
  var proposalLog = AM.getAnchorLog(s, pr.proposal.id);
  assert(proposalLog.length >= 1, 'proposal has its own log entries (proposed event)');

});

// ============================================================================
// Suite: getNearbyAnchors
// ============================================================================

suite('getNearbyAnchors', function() {

  var s = freshState();

  // Add anchors at known distances from reference point (40.7128, -74.0060)
  var ref = { lat: 40.7128, lng: -74.0060 };
  var a1 = makeActiveAnchor(s, { lat: 40.7128, lng: -74.0060, name: 'At origin',     description: 'd' }); // 0m
  var a2 = makeActiveAnchor(s, { lat: 40.7138, lng: -74.0060, name: '~110m north',   description: 'd' }); // ~110m
  var a3 = makeActiveAnchor(s, { lat: 40.7828, lng: -73.9654, name: '~8km away',     description: 'd' }); // ~8km
  var a4 = makeActiveAnchor(s, { lat: 34.0522, lng: -118.2437, name: 'Los Angeles',  description: 'd' }); // ~3940km

  // Within 150m: should get a1 and a2 only
  var nearby150 = AM.getNearbyAnchors(s, ref.lat, ref.lng, 150);
  assert(nearby150.length >= 1, 'at least 1 anchor within 150m');
  var ids150 = nearby150.map(function(a) { return a.id; });
  assert(ids150.indexOf(a1.id) !== -1, 'origin anchor is within 150m');
  assert(ids150.indexOf(a2.id) !== -1, '~110m anchor is within 150m');
  assert(ids150.indexOf(a3.id) === -1, '8km anchor is outside 150m');
  assert(ids150.indexOf(a4.id) === -1, 'LA anchor is outside 150m');

  // Results sorted by distance
  for (var i = 1; i < nearby150.length; i++) {
    assert(nearby150[i].distance >= nearby150[i - 1].distance, 'results sorted by distance ascending');
  }

  // Each result has distance property
  nearby150.forEach(function(a) {
    assert(typeof a.distance === 'number', 'distance property is number');
    assert(a.distance >= 0, 'distance is non-negative');
  });

  // Very large radius gets all anchors
  var allNearby = AM.getNearbyAnchors(s, ref.lat, ref.lng, 5000000);
  assertEqual(allNearby.length, 4, 'very large radius returns all 4 anchors');

  // Zero radius — only the exact same point
  var zeroRange = AM.getNearbyAnchors(s, ref.lat, ref.lng, 0);
  assert(zeroRange.length >= 1, 'origin anchor is at distance 0');

  // Default radius (50m) — should get the anchor at same position
  var defaultRange = AM.getNearbyAnchors(s, ref.lat, ref.lng);
  assert(defaultRange.length >= 1, 'default radius returns at least origin anchor');

  // Empty state
  var s2 = freshState();
  var emptyNearby = AM.getNearbyAnchors(s2, ref.lat, ref.lng, 1000);
  assertEqual(emptyNearby.length, 0, 'empty state returns empty array');

  // Removed anchors excluded
  AM.removeAnchor(s, a1.id, 'steward1', 'test', 999);
  var nearbyAfterRemove = AM.getNearbyAnchors(s, ref.lat, ref.lng, 150);
  var idsAfterRemove = nearbyAfterRemove.map(function(a) { return a.id; });
  assert(idsAfterRemove.indexOf(a1.id) === -1, 'removed anchor excluded from getNearbyAnchors');

});

// ============================================================================
// Suite: mulberry32 PRNG
// ============================================================================

suite('mulberry32 PRNG', function() {

  var rng = AM.mulberry32(12345);

  assert(typeof rng === 'function', 'mulberry32 returns a function');

  var v1 = rng();
  assert(typeof v1 === 'number', 'PRNG produces numbers');
  assert(v1 >= 0 && v1 < 1, 'PRNG output in [0, 1)');

  var v2 = rng();
  assert(v1 !== v2, 'successive calls produce different values');

  // Same seed produces same sequence
  var rng2 = AM.mulberry32(12345);
  var seq1 = [AM.mulberry32(999)(), AM.mulberry32(999)(), AM.mulberry32(999)()];
  var seq2 = [AM.mulberry32(999)(), AM.mulberry32(999)(), AM.mulberry32(999)()];
  // Compare first values (they reset each time)
  assertEqual(seq1[0], seq2[0], 'same seed gives same first value');

  // Different seeds give different values
  var rngA = AM.mulberry32(1);
  var rngB = AM.mulberry32(2);
  assert(rngA() !== rngB(), 'different seeds give different values');

  // Generates many values without error
  var rng3 = AM.mulberry32(42);
  var ok = true;
  for (var i = 0; i < 100; i++) {
    var v = rng3();
    if (v < 0 || v >= 1) { ok = false; break; }
  }
  assert(ok, '100 PRNG values all in [0, 1)');

});

// ============================================================================
// Suite: Full lifecycle integration
// ============================================================================

suite('Full lifecycle: propose → approve → visit → remove', function() {

  var s = freshState();

  // 1. Propose
  var pr = AM.proposeAnchor(s, 'alice', 'discovery_point', 'Hidden Library', 51.5074, -0.1278, 'athenaeum', 'A lore site', 100);
  assert(pr.success === true, 'step 1: proposal succeeds');
  assertEqual(AM.getPendingProposals(s).length, 1, 'step 1: 1 pending proposal');

  // 2. Approve
  var ap = AM.approveAnchor(s, pr.proposal.id, 'steward_uk', 110);
  assert(ap.success === true, 'step 2: approval succeeds');
  assertEqual(AM.getPendingProposals(s).length, 0, 'step 2: 0 pending proposals after approval');

  var anchor = ap.anchor;
  assertEqual(AM.getAnchorsInZone(s, 'athenaeum').length, 1, 'step 2: anchor visible in zone');

  // 3. Multiple players visit
  for (var i = 0; i < 7; i++) {
    var v = AM.visitAnchor(s, 'player' + i, anchor.id, 200 + i);
    assert(v.success === true, 'step 3: player ' + i + ' visit succeeds');
  }
  assertEqual(AM.getVisitCount(s, anchor.id), 7, 'step 3: 7 total visits');

  // 4. Stats
  var stats = AM.getAnchorStats(s, 'athenaeum');
  assertEqual(stats.totalAnchors, 1, 'step 4: 1 anchor in athenaeum');
  assertEqual(stats.totalVisits, 7, 'step 4: 7 visits in athenaeum');

  // 5. Popular
  var popular = AM.getPopularAnchors(s, 5);
  assertEqual(popular[0].id, anchor.id, 'step 5: our anchor is most popular');

  // 6. Remove
  var rm = AM.removeAnchor(s, anchor.id, 'steward_uk', 'Site closed', 500);
  assert(rm.success === true, 'step 6: removal succeeds');
  assertEqual(AM.getAnchorsInZone(s, 'athenaeum').length, 0, 'step 6: no anchors in zone after removal');
  var visitAfterRemove = AM.visitAnchor(s, 'latePlayer', anchor.id, 600);
  assert(visitAfterRemove.success === false, 'step 6: visiting removed anchor fails');

  // 7. Full log
  var log = AM.getAnchorLog(s, anchor.id);
  var events = log.map(function(e) { return e.event; });
  assert(events.indexOf('approved') !== -1, 'step 7: log has approved');
  assert(events.indexOf('visited') !== -1, 'step 7: log has visited');
  assert(events.indexOf('removed') !== -1, 'step 7: log has removed');

});

suite('Full lifecycle: propose → reject → re-propose → approve', function() {

  var s = freshState();

  var pr1 = AM.proposeAnchor(s, 'bob', 'monument', 'Old Bridge', 48.8566, 2.3522, 'commons', 'old bridge desc', 10);
  assert(pr1.success === true, 'first proposal succeeds');

  var rj = AM.rejectAnchor(s, pr1.proposal.id, 'steward2', 'Not historically significant', 20);
  assert(rj.success === true, 'rejection succeeds');

  var pr2 = AM.proposeAnchor(s, 'bob', 'monument', 'New Bridge', 48.8570, 2.3530, 'commons', 'improved desc', 30);
  assert(pr2.success === true, 're-proposal after rejection succeeds');

  var ap = AM.approveAnchor(s, pr2.proposal.id, 'steward2', 40);
  assert(ap.success === true, 'approval of re-proposal succeeds');
  assertEqual(ap.anchor.name, 'New Bridge', 'approved anchor has correct name');

});

// ============================================================================
// Suite: Edge cases
// ============================================================================

suite('Edge cases', function() {

  // getAnchorsInZone on empty state
  var s = freshState();
  var empty = AM.getAnchorsInZone(s, 'nexus');
  assertEqual(empty.length, 0, 'getAnchorsInZone on empty state returns []');

  // getAnchorsByType on empty state
  var emptyType = AM.getAnchorsByType(s, 'portal');
  assertEqual(emptyType.length, 0, 'getAnchorsByType on empty state returns []');

  // getAnchorsByCreator on empty state
  var emptyCreator = AM.getAnchorsByCreator(s, 'nobody');
  assertEqual(emptyCreator.length, 0, 'getAnchorsByCreator on empty state returns []');

  // getPopularAnchors with count=0 still valid
  var top0 = AM.getPopularAnchors(s, 0);
  assert(Array.isArray(top0), 'getPopularAnchors(0) returns array');

  // getPlayerVisits for player with no visits
  var noVisits = AM.getPlayerVisits(s, 'unknown_player');
  assert(Array.isArray(noVisits) && noVisits.length === 0, 'unknown player has empty visits array');

  // isWithinRange with very small radius
  assert(AM.isWithinRange(0, 0, 0, 0, 0.001) === true, 'identical coords within tiny radius');

  // visitAnchor returns null reward for unknown type (defensive)
  var s2 = freshState();
  var a = makeActiveAnchor(s2);
  // Manually corrupt type
  s2.anchors[a.id].type = 'unknown_type_xyz';
  var v = AM.visitAnchor(s2, 'player1', a.id, 100);
  assert(v.success === true, 'visit with unknown type still succeeds with fallback reward');
  assert(typeof v.reward.sparks === 'number', 'fallback reward has sparks');

  // Multiple states do not interfere
  var sA = freshState();
  var sB = freshState();
  makeActiveAnchor(sA, { lat: 40.1, name: 'OnlyInA', description: 'd' });
  assertEqual(Object.keys(sB.anchors).length, 0, 'state B unaffected by state A mutations');

});

// ============================================================================
// Final report
// ============================================================================

console.log('\n--- Results ---');
console.log(passed + ' passed, ' + failed + ' failed');

if (failures.length > 0) {
  console.log('\nFailures:');
  failures.forEach(function(f) { console.log('  ' + f); });
}

process.exit(failed === 0 ? 0 : 1);
