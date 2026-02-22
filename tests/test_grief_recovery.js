/**
 * tests/test_grief_recovery.js
 * Comprehensive tests for the ZION Grief Recovery System.
 * 125+ tests covering all exported functions, lifecycle states, edge cases.
 *
 * Run with: node tests/test_grief_recovery.js
 */

'use strict';

var GR = require('../src/js/grief_recovery');

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
// HELPERS
// ============================================================================

var playerSeq = 0;
function uid() { return 'player_' + (++playerSeq); }

function freshState() {
  return GR.createState();
}

// ============================================================================
// SUITE 1: MODULE EXPORTS
// ============================================================================

suite('Module exports', function() {

  assert(typeof GR === 'object', 'module exports an object');
  assert(Array.isArray(GR.GRIEF_TYPES), 'GRIEF_TYPES is an array');
  assert(Array.isArray(GR.ACHIEVEMENTS), 'ACHIEVEMENTS is an array');
  assert(typeof GR.createState === 'function', 'createState is a function');
  assert(typeof GR.fileReport === 'function', 'fileReport is a function');
  assert(typeof GR.investigateReport === 'function', 'investigateReport is a function');
  assert(typeof GR.resolveReport === 'function', 'resolveReport is a function');
  assert(typeof GR.dismissReport === 'function', 'dismissReport is a function');
  assert(typeof GR.getReport === 'function', 'getReport is a function');
  assert(typeof GR.getReportsByReporter === 'function', 'getReportsByReporter is a function');
  assert(typeof GR.getReportsByTarget === 'function', 'getReportsByTarget is a function');
  assert(typeof GR.getActiveReports === 'function', 'getActiveReports is a function');
  assert(typeof GR.purchaseInsurance === 'function', 'purchaseInsurance is a function');
  assert(typeof GR.claimInsurance === 'function', 'claimInsurance is a function');
  assert(typeof GR.getInsurance === 'function', 'getInsurance is a function');
  assert(typeof GR.isInsured === 'function', 'isInsured is a function');
  assert(typeof GR.orderRestitution === 'function', 'orderRestitution is a function');
  assert(typeof GR.payRestitution === 'function', 'payRestitution is a function');
  assert(typeof GR.getRestitutions === 'function', 'getRestitutions is a function');
  assert(typeof GR.callHotline === 'function', 'callHotline is a function');
  assert(typeof GR.checkAchievements === 'function', 'checkAchievements is a function');
  assert(typeof GR.joinSupportNetwork === 'function', 'joinSupportNetwork is a function');
  assert(typeof GR.getSupportMentors === 'function', 'getSupportMentors is a function');
  assert(typeof GR.getGriefStats === 'function', 'getGriefStats is a function');
  assert(typeof GR.getPlayerGriefRecord === 'function', 'getPlayerGriefRecord is a function');

});

// ============================================================================
// SUITE 2: GRIEF_TYPES data integrity
// ============================================================================

suite('GRIEF_TYPES data integrity', function() {

  assertEqual(GR.GRIEF_TYPES.length, 6, 'exactly 6 grief types defined');

  var requiredFields = ['id', 'name', 'description', 'severity', 'defaultLossMultiplier', 'rollbackEligible', 'maxLossValue'];
  var allHaveFields = true;
  for (var i = 0; i < GR.GRIEF_TYPES.length; i++) {
    var gt = GR.GRIEF_TYPES[i];
    for (var j = 0; j < requiredFields.length; j++) {
      if (!(requiredFields[j] in gt)) { allHaveFields = false; break; }
    }
    if (!allHaveFields) break;
  }
  assert(allHaveFields, 'all grief types have required fields');

  // Check IDs unique
  var ids = {};
  var uniqueIds = true;
  for (var k = 0; k < GR.GRIEF_TYPES.length; k++) {
    if (ids[GR.GRIEF_TYPES[k].id]) { uniqueIds = false; break; }
    ids[GR.GRIEF_TYPES[k].id] = true;
  }
  assert(uniqueIds, 'all grief type IDs are unique');

  // Check specific IDs exist
  var typeIds = GR.GRIEF_TYPES.map(function(t) { return t.id; });
  assert(typeIds.indexOf('structure_destroyed') !== -1, 'structure_destroyed type exists');
  assert(typeIds.indexOf('garden_trampled') !== -1, 'garden_trampled type exists');
  assert(typeIds.indexOf('items_stolen') !== -1, 'items_stolen type exists');
  assert(typeIds.indexOf('fraud') !== -1, 'fraud type exists');
  assert(typeIds.indexOf('harassment') !== -1, 'harassment type exists');
  assert(typeIds.indexOf('griefing_other') !== -1, 'griefing_other type exists');

  // rollbackEligible is boolean
  var rollbackBools = true;
  for (var r = 0; r < GR.GRIEF_TYPES.length; r++) {
    if (typeof GR.GRIEF_TYPES[r].rollbackEligible !== 'boolean') { rollbackBools = false; break; }
  }
  assert(rollbackBools, 'all rollbackEligible fields are booleans');

  // maxLossValue > 0
  var validMax = true;
  for (var m = 0; m < GR.GRIEF_TYPES.length; m++) {
    if (typeof GR.GRIEF_TYPES[m].maxLossValue !== 'number' || GR.GRIEF_TYPES[m].maxLossValue <= 0) {
      validMax = false; break;
    }
  }
  assert(validMax, 'all maxLossValue are positive numbers');

});

// ============================================================================
// SUITE 3: ACHIEVEMENTS data integrity
// ============================================================================

suite('ACHIEVEMENTS data integrity', function() {

  assertEqual(GR.ACHIEVEMENTS.length, 5, 'exactly 5 achievements defined');

  var requiredFields = ['id', 'name', 'description', 'category', 'criteria', 'reward', 'tier', 'hidden', 'prerequisite'];
  var allHaveFields = true;
  for (var i = 0; i < GR.ACHIEVEMENTS.length; i++) {
    var ach = GR.ACHIEVEMENTS[i];
    for (var j = 0; j < requiredFields.length; j++) {
      if (!(requiredFields[j] in ach)) { allHaveFields = false; break; }
    }
    if (!allHaveFields) break;
  }
  assert(allHaveFields, 'all achievements have required fields');

  // Unique IDs
  var ids = {};
  var uniqueIds = true;
  for (var k = 0; k < GR.ACHIEVEMENTS.length; k++) {
    if (ids[GR.ACHIEVEMENTS[k].id]) { uniqueIds = false; break; }
    ids[GR.ACHIEVEMENTS[k].id] = true;
  }
  assert(uniqueIds, 'all achievement IDs are unique');

  // Specific achievement IDs
  var achIds = GR.ACHIEVEMENTS.map(function(a) { return a.id; });
  assert(achIds.indexOf('overcome_adversity') !== -1, 'overcome_adversity achievement exists');
  assert(achIds.indexOf('rebuild') !== -1, 'rebuild achievement exists');
  assert(achIds.indexOf('report_justice') !== -1, 'report_justice achievement exists');
  assert(achIds.indexOf('insure_assets') !== -1, 'insure_assets achievement exists');
  assert(achIds.indexOf('help_others') !== -1, 'help_others achievement exists');

  // hidden is boolean
  var hiddenBools = true;
  for (var h = 0; h < GR.ACHIEVEMENTS.length; h++) {
    if (typeof GR.ACHIEVEMENTS[h].hidden !== 'boolean') { hiddenBools = false; break; }
  }
  assert(hiddenBools, 'all hidden fields are booleans');

  // Rewards have spark, xp, badge
  var validRewards = true;
  for (var r = 0; r < GR.ACHIEVEMENTS.length; r++) {
    var rew = GR.ACHIEVEMENTS[r].reward;
    if (typeof rew.spark !== 'number' || rew.spark < 0) { validRewards = false; break; }
    if (typeof rew.xp !== 'number' || rew.xp < 0) { validRewards = false; break; }
    if (typeof rew.badge !== 'string') { validRewards = false; break; }
  }
  assert(validRewards, 'all achievement rewards have valid spark/xp/badge');

  // tier is number 1-5
  var validTiers = true;
  for (var t = 0; t < GR.ACHIEVEMENTS.length; t++) {
    var tier = GR.ACHIEVEMENTS[t].tier;
    if (typeof tier !== 'number' || tier < 1 || tier > 5) { validTiers = false; break; }
  }
  assert(validTiers, 'all tiers are integers 1-5');

});

// ============================================================================
// SUITE 4: createState
// ============================================================================

suite('createState', function() {

  var s = GR.createState();
  assert(typeof s === 'object', 'createState returns an object');
  assert(Array.isArray(s.reports), 'state.reports is an array');
  assert(typeof s.insurance === 'object', 'state.insurance is an object');
  assert(Array.isArray(s.restitutions), 'state.restitutions is an array');
  assert(typeof s.achievements === 'object', 'state.achievements is an object');
  assert(Array.isArray(s.supportNetwork), 'state.supportNetwork is an array');
  assert(Array.isArray(s.griefLog), 'state.griefLog is an array');

  assertEqual(s.reports.length, 0, 'reports starts empty');
  assertEqual(s.restitutions.length, 0, 'restitutions starts empty');
  assertEqual(s.supportNetwork.length, 0, 'supportNetwork starts empty');
  assertEqual(s.griefLog.length, 0, 'griefLog starts empty');

  // Each call returns independent state
  var s2 = GR.createState();
  s.reports.push({ id: 'test' });
  assertEqual(s2.reports.length, 0, 'states are independent (no shared reference)');

});

// ============================================================================
// SUITE 5: fileReport
// ============================================================================

suite('fileReport', function() {

  var s = freshState();
  var p = uid();

  var result = GR.fileReport(s, p, 'structure_destroyed', 'My house was blown up!', 'griefer1', 1000, 100);
  assert(result.success === true, 'fileReport succeeds with valid inputs');
  assert(result.report !== null, 'fileReport returns a report object');
  assertEqual(result.report.status, 'filed', 'new report starts in filed status');
  assertEqual(result.report.reporterId, p, 'reporterId is set correctly');
  assertEqual(result.report.griefType, 'structure_destroyed', 'griefType is set correctly');
  assertEqual(result.report.lossValue, 1000, 'lossValue is stored');
  assertEqual(result.comfortSpark, 10, 'comfortSpark of 10 awarded on file');

  // Report is added to state
  assertEqual(s.reports.length, 1, 'report added to state.reports');
  assertEqual(s.griefLog.length, 1, 'grief log entry added on file');

  // Report has an ID
  assert(typeof result.report.id === 'string' && result.report.id.length > 0, 'report has a non-empty id');

  // Multiple reports
  GR.fileReport(s, p, 'items_stolen', 'My tools were taken.', null, 500, 101);
  GR.fileReport(s, uid(), 'fraud', 'Fake trade.', 'scammer', 2000, 102);
  assertEqual(s.reports.length, 3, 'three reports tracked correctly');

  // Null state guard
  var bad1 = GR.fileReport(null, p, 'fraud', 'desc', null, 100, 1);
  assert(bad1.success === false, 'fileReport fails with null state');
  assert(bad1.report === null, 'null state returns null report');

  // Missing reporter
  var bad2 = GR.fileReport(freshState(), null, 'fraud', 'desc', null, 100, 1);
  assert(bad2.success === false, 'fileReport fails with null reporterId');

  // Missing griefType
  var bad3 = GR.fileReport(freshState(), p, null, 'desc', null, 100, 1);
  assert(bad3.success === false, 'fileReport fails with null griefType');

  // Invalid griefType
  var bad4 = GR.fileReport(freshState(), p, 'dragon_attack', 'desc', null, 100, 1);
  assert(bad4.success === false, 'fileReport fails with unknown grief type');

  // Missing description
  var bad5 = GR.fileReport(freshState(), p, 'fraud', null, null, 100, 1);
  assert(bad5.success === false, 'fileReport fails with null description');

  // Loss value capped at maxLossValue for type
  var s2 = freshState();
  var capped = GR.fileReport(s2, uid(), 'harassment', 'I was harassed', null, 999999, 1);
  assert(capped.success === true, 'capped lossValue still succeeds');
  assert(capped.report.lossValue <= 5000, 'harassment lossValue capped at 5000');

  // Zero / negative loss value treated as 0
  var s3 = freshState();
  var zeroLoss = GR.fileReport(s3, uid(), 'fraud', 'Desc', null, -100, 1);
  assert(zeroLoss.success === true, 'negative lossValue still files successfully');
  assertEqual(zeroLoss.report.lossValue, 0, 'negative lossValue stored as 0');

  // Report with null targetId
  var s4 = freshState();
  var noTarget = GR.fileReport(s4, uid(), 'griefing_other', 'Desc', null, 100, 1);
  assert(noTarget.success === true, 'fileReport with null targetId succeeds');
  assertEqual(noTarget.report.targetId, null, 'null targetId stored as null');

  // Tick stored correctly
  var s5 = freshState();
  var withTick = GR.fileReport(s5, uid(), 'fraud', 'Desc', null, 100, 999);
  assertEqual(withTick.report.filedAt, 999, 'filedAt stores currentTick correctly');

});

// ============================================================================
// SUITE 6: investigateReport
// ============================================================================

suite('investigateReport', function() {

  var s = freshState();
  var p = uid();
  var filed = GR.fileReport(s, p, 'structure_destroyed', 'desc', 'target1', 1000, 1);
  var reportId = filed.report.id;

  // Advance filed -> investigating
  var inv1 = GR.investigateReport(s, reportId, { logs: ['log1', 'log2'], witnesses: ['w1'] }, 2);
  assert(inv1.success === true, 'investigate transitions filed -> investigating');
  assertEqual(inv1.status, 'investigating', 'status is investigating after first call');

  var r = GR.getReport(s, reportId);
  assertEqual(r.status, 'investigating', 'state reflects investigating status');
  assertEqual(r.evidence.length, 2, 'evidence logs attached');
  assertEqual(r.witnesses.length, 1, 'witnesses attached');

  // Advance investigating -> evidence_reviewed
  var inv2 = GR.investigateReport(s, reportId, { logs: ['log3'], witnesses: [] }, 3);
  assert(inv2.success === true, 'investigate transitions investigating -> evidence_reviewed');
  assertEqual(inv2.status, 'evidence_reviewed', 'status is evidence_reviewed');

  // Can pass null evidence without crash
  var s2 = freshState();
  var f2 = GR.fileReport(s2, uid(), 'fraud', 'desc', null, 100, 1);
  var nullEv = GR.investigateReport(s2, f2.report.id, null, 2);
  assert(nullEv.success === true, 'investigateReport with null evidence does not crash');

  // Cannot investigate closed report
  var s3 = freshState();
  var f3 = GR.fileReport(s3, uid(), 'fraud', 'desc', null, 100, 1);
  GR.resolveReport(s3, f3.report.id, true, 2);
  var invClosed = GR.investigateReport(s3, f3.report.id, null, 3);
  assert(invClosed.success === false, 'cannot investigate a resolved report');

  // Null state guard
  var badNull = GR.investigateReport(null, 'rpt_1', null, 1);
  assert(badNull.success === false, 'investigateReport fails with null state');

  // Report not found
  var badId = GR.investigateReport(freshState(), 'rpt_nonexistent', null, 1);
  assert(badId.success === false, 'investigateReport fails with unknown reportId');

  // Grief log updated
  assert(s.griefLog.length >= 3, 'grief log entries added on investigation steps');

});

// ============================================================================
// SUITE 7: resolveReport
// ============================================================================

suite('resolveReport', function() {

  // Resolve guilty — with known target
  var s = freshState();
  var victim = uid(), griefer = uid();
  var f = GR.fileReport(s, victim, 'structure_destroyed', 'house destroyed', griefer, 2000, 1);
  var res = GR.resolveReport(s, f.report.id, true, 5);
  assert(res.success === true, 'resolveReport succeeds');
  assert(res.rollback === true, 'structure_destroyed with guilty gets rollback=true');
  assert(res.restitution !== null, 'restitution order created for guilty verdict');
  assertEqual(res.restitution.amount, 2000, 'restitution amount equals lossValue');
  assertEqual(res.restitution.grieferId, griefer, 'griefer ID on restitution order');

  var rep = GR.getReport(s, f.report.id);
  assertEqual(rep.status, 'resolved', 'report is now resolved');
  assert(rep.guilty === true, 'guilty flag set on report');
  assert(rep.rollbackApplied === true, 'rollbackApplied set on report');
  assertEqual(rep.restitutionOrderId, res.restitution.id, 'report references restitution order');

  // Resolve guilty — non-rollback type
  var s2 = freshState();
  var v2 = uid(), g2 = uid();
  var f2 = GR.fileReport(s2, v2, 'items_stolen', 'Tools stolen', g2, 1500, 1);
  var res2 = GR.resolveReport(s2, f2.report.id, true, 5);
  assert(res2.success === true, 'resolveReport items_stolen succeeds');
  assert(res2.rollback === false, 'items_stolen does NOT trigger rollback');
  assert(res2.restitution !== null, 'restitution still created for items_stolen');

  // Resolve not guilty
  var s3 = freshState();
  var v3 = uid(), g3 = uid();
  var f3 = GR.fileReport(s3, v3, 'fraud', 'Fake deal', g3, 500, 1);
  var res3 = GR.resolveReport(s3, f3.report.id, false, 5);
  assert(res3.success === true, 'resolveReport not-guilty succeeds');
  assert(res3.rollback === false, 'no rollback when not guilty');
  assert(res3.restitution === null, 'no restitution when not guilty');

  // Cannot resolve already closed report
  var s4 = freshState();
  var f4 = GR.fileReport(s4, uid(), 'fraud', 'Desc', null, 100, 1);
  GR.resolveReport(s4, f4.report.id, false, 2);
  var res4 = GR.resolveReport(s4, f4.report.id, true, 3);
  assert(res4.success === false, 'cannot resolve an already resolved report');

  // No restitution if no targetId
  var s5 = freshState();
  var f5 = GR.fileReport(s5, uid(), 'fraud', 'Desc', null, 1000, 1);
  var res5 = GR.resolveReport(s5, f5.report.id, true, 2);
  assert(res5.success === true, 'resolveReport guilty with no targetId succeeds');
  assert(res5.restitution === null, 'no restitution order if targetId is null');

  // Null guards
  var badNull = GR.resolveReport(null, 'rpt_1', true, 1);
  assert(badNull.success === false, 'resolveReport fails with null state');
  var badId = GR.resolveReport(freshState(), 'rpt_nonexistent', true, 1);
  assert(badId.success === false, 'resolveReport fails with unknown reportId');

});

// ============================================================================
// SUITE 8: dismissReport
// ============================================================================

suite('dismissReport', function() {

  var s = freshState();
  var p = uid();
  var f = GR.fileReport(s, p, 'fraud', 'Fake claim', null, 0, 1);
  var dis = GR.dismissReport(s, f.report.id, 'Insufficient evidence', 10);
  assert(dis.success === true, 'dismissReport succeeds');

  var rep = GR.getReport(s, f.report.id);
  assertEqual(rep.status, 'dismissed', 'report status is dismissed');
  assertEqual(rep.notes.length, 1, 'dismissal note added');
  assertEqual(rep.notes[0].reason, 'Insufficient evidence', 'dismissal reason stored');

  // Cannot dismiss again
  var dis2 = GR.dismissReport(s, f.report.id, 'Again', 11);
  assert(dis2.success === false, 'cannot dismiss an already closed report');

  // Cannot dismiss a resolved report
  var s2 = freshState();
  var f2 = GR.fileReport(s2, uid(), 'fraud', 'desc', null, 100, 1);
  GR.resolveReport(s2, f2.report.id, false, 2);
  var dis3 = GR.dismissReport(s2, f2.report.id, 'Too late', 3);
  assert(dis3.success === false, 'cannot dismiss a resolved report');

  // Null guards
  var badNull = GR.dismissReport(null, 'rpt_1', 'reason', 1);
  assert(badNull.success === false, 'dismissReport fails with null state');
  var badId = GR.dismissReport(freshState(), 'rpt_nonexistent', 'reason', 1);
  assert(badId.success === false, 'dismissReport fails with unknown reportId');

  // Dismiss with no reason
  var s3 = freshState();
  var f3 = GR.fileReport(s3, uid(), 'harassment', 'desc', null, 100, 1);
  var dis4 = GR.dismissReport(s3, f3.report.id, null, 5);
  assert(dis4.success === true, 'dismissReport with null reason still succeeds');

});

// ============================================================================
// SUITE 9: getReport
// ============================================================================

suite('getReport', function() {

  var s = freshState();
  var p = uid();
  var f = GR.fileReport(s, p, 'fraud', 'desc', null, 100, 1);
  var reportId = f.report.id;

  var r = GR.getReport(s, reportId);
  assert(r !== null, 'getReport returns the report object');
  assertEqual(r.id, reportId, 'returned report has correct id');

  // Not found
  var notFound = GR.getReport(s, 'rpt_99999');
  assert(notFound === null, 'getReport returns null for unknown reportId');

  // Null guards
  assert(GR.getReport(null, reportId) === null, 'getReport returns null for null state');
  assert(GR.getReport(s, null) === null, 'getReport returns null for null reportId');

});

// ============================================================================
// SUITE 10: getReportsByReporter / getReportsByTarget
// ============================================================================

suite('getReportsByReporter and getReportsByTarget', function() {

  var s = freshState();
  var p1 = uid(), p2 = uid(), p3 = uid();

  GR.fileReport(s, p1, 'fraud', 'D1', p2, 100, 1);
  GR.fileReport(s, p1, 'items_stolen', 'D2', p3, 200, 2);
  GR.fileReport(s, p2, 'harassment', 'D3', p1, 50, 3);
  GR.fileReport(s, p3, 'fraud', 'D4', p1, 300, 4);

  var byP1Reporter = GR.getReportsByReporter(s, p1);
  assertEqual(byP1Reporter.length, 2, 'p1 filed 2 reports');

  var byP2Reporter = GR.getReportsByReporter(s, p2);
  assertEqual(byP2Reporter.length, 1, 'p2 filed 1 report');

  var againstP1 = GR.getReportsByTarget(s, p1);
  assertEqual(againstP1.length, 2, '2 reports against p1');

  var againstP2 = GR.getReportsByTarget(s, p2);
  assertEqual(againstP2.length, 1, '1 report against p2');

  // Empty for unknown player
  var none = GR.getReportsByReporter(s, 'nobody');
  assert(Array.isArray(none) && none.length === 0, 'unknown reporter returns empty array');

  var noneTarget = GR.getReportsByTarget(s, 'nobody');
  assert(Array.isArray(noneTarget) && noneTarget.length === 0, 'unknown target returns empty array');

  // Null guards
  assert(Array.isArray(GR.getReportsByReporter(null, p1)), 'getReportsByReporter null state returns array');
  assert(Array.isArray(GR.getReportsByTarget(null, p1)), 'getReportsByTarget null state returns array');

});

// ============================================================================
// SUITE 11: getActiveReports
// ============================================================================

suite('getActiveReports', function() {

  var s = freshState();
  var p = uid();

  GR.fileReport(s, p, 'fraud', 'D1', null, 100, 1);
  GR.fileReport(s, p, 'items_stolen', 'D2', null, 200, 2);
  GR.fileReport(s, p, 'harassment', 'D3', null, 50, 3);

  assertEqual(GR.getActiveReports(s).length, 3, '3 active reports initially');

  GR.resolveReport(s, s.reports[0].id, false, 10);
  assertEqual(GR.getActiveReports(s).length, 2, '2 active after one resolved');

  GR.dismissReport(s, s.reports[1].id, 'No evidence', 11);
  assertEqual(GR.getActiveReports(s).length, 1, '1 active after one dismissed');

  // Null state
  var nullResult = GR.getActiveReports(null);
  assert(Array.isArray(nullResult) && nullResult.length === 0, 'getActiveReports null state returns []');

  // Empty state
  var emptyResult = GR.getActiveReports(freshState());
  assert(Array.isArray(emptyResult) && emptyResult.length === 0, 'getActiveReports empty state returns []');

});

// ============================================================================
// SUITE 12: purchaseInsurance
// ============================================================================

suite('purchaseInsurance', function() {

  var s = freshState();
  var p = uid();

  var result = GR.purchaseInsurance(s, p, 'structure', 10000, 1);
  assert(result.success === true, 'purchaseInsurance succeeds');
  assert(result.policy !== null, 'policy object returned');
  assertEqual(result.policy.assetType, 'structure', 'assetType stored correctly');
  assertEqual(result.policy.assetValue, 10000, 'assetValue stored correctly');
  assertEqual(result.policy.status, 'active', 'policy is active initially');
  assert(result.cost > 0, 'cost is positive');
  assertEqual(result.cost, 100, 'cost is 1% of 10000 = 100');
  assertEqual(result.policy.payoutRate, 0.8, 'payoutRate is 80%');

  // Multiple policies
  GR.purchaseInsurance(s, p, 'garden', 5000, 2);
  GR.purchaseInsurance(s, p, 'inventory', 2000, 3);
  var policies = GR.getInsurance(s, p);
  assertEqual(policies.length, 3, 'player has 3 policies');

  // Different players independent
  var p2 = uid();
  GR.purchaseInsurance(s, p2, 'structure', 1000, 5);
  var p2Policies = GR.getInsurance(s, p2);
  assertEqual(p2Policies.length, 1, 'p2 has 1 policy (independent of p)');

  // Invalid asset value
  var bad1 = GR.purchaseInsurance(s, p, 'structure', -100, 1);
  assert(bad1.success === false, 'purchaseInsurance fails with negative asset value');
  var bad2 = GR.purchaseInsurance(s, p, 'structure', 0, 1);
  assert(bad2.success === false, 'purchaseInsurance fails with zero asset value');

  // Null guards
  var badNull = GR.purchaseInsurance(null, p, 'structure', 1000, 1);
  assert(badNull.success === false, 'purchaseInsurance fails with null state');
  var badPlayer = GR.purchaseInsurance(s, null, 'structure', 1000, 1);
  assert(badPlayer.success === false, 'purchaseInsurance fails with null playerId');
  var badType = GR.purchaseInsurance(s, p, null, 1000, 1);
  assert(badType.success === false, 'purchaseInsurance fails with null assetType');

  // Policy ID is a string
  var result2 = GR.purchaseInsurance(freshState(), uid(), 'structure', 1000, 1);
  assert(typeof result2.policy.id === 'string' && result2.policy.id.length > 0, 'policy has a non-empty id');

});

// ============================================================================
// SUITE 13: claimInsurance
// ============================================================================

suite('claimInsurance', function() {

  var s = freshState();
  var p = uid();
  var ins = GR.purchaseInsurance(s, p, 'structure', 10000, 1);
  var policyId = ins.policy.id;

  var claim = GR.claimInsurance(s, p, policyId, 50);
  assert(claim.success === true, 'claimInsurance succeeds');
  assertEqual(claim.payout, 8000, 'payout is 80% of 10000 = 8000');

  var policies = GR.getInsurance(s, p);
  assertEqual(policies[0].status, 'claimed', 'policy status is claimed after claim');
  assertEqual(policies[0].payout, 8000, 'payout stored on policy');

  // Cannot claim twice
  var claim2 = GR.claimInsurance(s, p, policyId, 51);
  assert(claim2.success === false, 'cannot claim an already claimed policy');

  // Null guards
  var badNull = GR.claimInsurance(null, p, policyId, 1);
  assert(badNull.success === false, 'claimInsurance fails with null state');
  var badPlayer = GR.claimInsurance(s, null, policyId, 1);
  assert(badPlayer.success === false, 'claimInsurance fails with null playerId');
  var badPolicy = GR.claimInsurance(s, p, null, 1);
  assert(badPolicy.success === false, 'claimInsurance fails with null policyId');

  // Policy not found
  var badId = GR.claimInsurance(s, p, 'pol_99999', 1);
  assert(badId.success === false, 'claimInsurance fails with unknown policyId');

  // Payout rounds down
  var s2 = freshState();
  var p2 = uid();
  var ins2 = GR.purchaseInsurance(s2, p2, 'garden', 101, 1);
  var claim3 = GR.claimInsurance(s2, p2, ins2.policy.id, 5);
  assert(claim3.success === true, 'claim on odd asset value succeeds');
  assertEqual(claim3.payout, 80, 'payout rounds down (101 * 0.8 = 80.8 -> 80)');

});

// ============================================================================
// SUITE 14: getInsurance / isInsured
// ============================================================================

suite('getInsurance and isInsured', function() {

  var s = freshState();
  var p = uid();

  // No insurance yet
  assert(Array.isArray(GR.getInsurance(s, p)) && GR.getInsurance(s, p).length === 0, 'getInsurance empty for new player');
  assert(GR.isInsured(s, p, 'structure') === false, 'isInsured false with no policies');

  GR.purchaseInsurance(s, p, 'structure', 5000, 1);
  assert(GR.isInsured(s, p, 'structure') === true, 'isInsured true after purchasing structure insurance');
  assert(GR.isInsured(s, p, 'garden') === false, 'isInsured false for uncovered asset type');

  // Claimed policy no longer active
  var policyId = GR.getInsurance(s, p)[0].id;
  GR.claimInsurance(s, p, policyId, 5);
  assert(GR.isInsured(s, p, 'structure') === false, 'isInsured false after policy is claimed');

  // Null guards
  assert(GR.getInsurance(null, p).length === 0, 'getInsurance null state returns []');
  assert(GR.isInsured(null, p, 'structure') === false, 'isInsured null state returns false');
  assert(GR.isInsured(s, null, 'structure') === false, 'isInsured null playerId returns false');
  assert(GR.isInsured(s, p, null) === false, 'isInsured null assetType returns false');

});

// ============================================================================
// SUITE 15: orderRestitution
// ============================================================================

suite('orderRestitution', function() {

  var s = freshState();
  var victim = uid(), griefer = uid();
  var f = GR.fileReport(s, victim, 'fraud', 'Scam', griefer, 3000, 1);

  var order = GR.orderRestitution(s, f.report.id, griefer, 3000, 2);
  assert(order.success === true, 'orderRestitution succeeds');
  assert(order.order !== null, 'order object returned');
  assertEqual(order.order.amount, 3000, 'order amount stored correctly');
  assertEqual(order.order.grieferId, griefer, 'grieferId stored');
  assertEqual(order.order.victimId, victim, 'victimId set from report');
  assertEqual(order.order.status, 'pending', 'order status is pending');
  assertEqual(order.order.remaining, 3000, 'remaining equals full amount');
  assertEqual(order.order.paid, 0, 'paid starts at 0');
  assertEqual(s.restitutions.length, 1, 'restitution added to state');

  // Null guards
  var badNull = GR.orderRestitution(null, f.report.id, griefer, 100, 1);
  assert(badNull.success === false, 'orderRestitution fails with null state');
  var badReport = GR.orderRestitution(s, null, griefer, 100, 1);
  assert(badReport.success === false, 'orderRestitution fails with null reportId');
  var badGriefer = GR.orderRestitution(s, f.report.id, null, 100, 1);
  assert(badGriefer.success === false, 'orderRestitution fails with null grieferId');

  // Invalid amount
  var badAmt = GR.orderRestitution(s, f.report.id, griefer, -50, 1);
  assert(badAmt.success === false, 'orderRestitution fails with negative amount');
  var zeroAmt = GR.orderRestitution(s, f.report.id, griefer, 0, 1);
  assert(zeroAmt.success === false, 'orderRestitution fails with zero amount');

  // Unknown report
  var badId = GR.orderRestitution(s, 'rpt_99999', griefer, 100, 1);
  assert(badId.success === false, 'orderRestitution fails with unknown reportId');

});

// ============================================================================
// SUITE 16: payRestitution
// ============================================================================

suite('payRestitution', function() {

  var s = freshState();
  var victim = uid(), griefer = uid();
  var f = GR.fileReport(s, victim, 'fraud', 'Scam', griefer, 1000, 1);
  var ord = GR.orderRestitution(s, f.report.id, griefer, 1000, 2);
  var orderId = ord.order.id;

  // Partial payment
  var pay1 = GR.payRestitution(s, orderId, 400, 3);
  assert(pay1.success === true, 'partial payment succeeds');
  assertEqual(pay1.remaining, 600, 'remaining is 600 after 400 paid');

  // Another partial payment
  var pay2 = GR.payRestitution(s, orderId, 300, 4);
  assert(pay2.success === true, 'second payment succeeds');
  assertEqual(pay2.remaining, 300, 'remaining is 300 after second payment');

  // Full payment
  var pay3 = GR.payRestitution(s, orderId, 300, 5);
  assert(pay3.success === true, 'final payment succeeds');
  assertEqual(pay3.remaining, 0, 'remaining is 0 after full payment');
  assertEqual(s.restitutions[0].status, 'paid', 'order status is paid when fully settled');

  // Cannot pay again
  var pay4 = GR.payRestitution(s, orderId, 100, 6);
  assert(pay4.success === false, 'cannot pay an already paid order');

  // Overpayment capped to remaining
  var s2 = freshState();
  var v2 = uid(), g2 = uid();
  var f2 = GR.fileReport(s2, v2, 'items_stolen', 'Theft', g2, 500, 1);
  var ord2 = GR.orderRestitution(s2, f2.report.id, g2, 500, 2);
  var overpay = GR.payRestitution(s2, ord2.order.id, 99999, 3);
  assert(overpay.success === true, 'overpayment succeeds (capped to remaining)');
  assertEqual(overpay.remaining, 0, 'remaining is 0 after overpayment');
  assertEqual(s2.restitutions[0].paid, 500, 'paid stored as original amount, not overpay');

  // Null guards
  var badNull = GR.payRestitution(null, orderId, 100, 1);
  assert(badNull.success === false, 'payRestitution fails with null state');
  var badId = GR.payRestitution(s, null, 100, 1);
  assert(badId.success === false, 'payRestitution fails with null orderId');

  // Invalid amount
  var badAmt = GR.payRestitution(s, orderId, -50, 1);
  assert(badAmt.success === false, 'payRestitution fails with negative amount');

  // Unknown order
  var badOrd = GR.payRestitution(s, 'rst_99999', 100, 1);
  assert(badOrd.success === false, 'payRestitution fails with unknown orderId');

});

// ============================================================================
// SUITE 17: getRestitutions
// ============================================================================

suite('getRestitutions', function() {

  var s = freshState();
  var v1 = uid(), g1 = uid(), v2 = uid();

  var f1 = GR.fileReport(s, v1, 'fraud', 'D1', g1, 1000, 1);
  GR.orderRestitution(s, f1.report.id, g1, 1000, 2);

  var f2 = GR.fileReport(s, v2, 'items_stolen', 'D2', g1, 500, 3);
  GR.orderRestitution(s, f2.report.id, g1, 500, 4);

  // g1 owes restitution on 2 orders
  var g1Rst = GR.getRestitutions(s, g1);
  assertEqual(g1Rst.length, 2, 'griefer g1 has 2 restitution orders');

  // v1 is victim on 1 order
  var v1Rst = GR.getRestitutions(s, v1);
  assertEqual(v1Rst.length, 1, 'victim v1 has 1 restitution entry');

  // Unknown player
  var none = GR.getRestitutions(s, 'nobody');
  assert(Array.isArray(none) && none.length === 0, 'unknown player returns empty array');

  // Null guards
  assert(Array.isArray(GR.getRestitutions(null, g1)), 'getRestitutions null state returns array');

});

// ============================================================================
// SUITE 18: callHotline
// ============================================================================

suite('callHotline', function() {

  var s = freshState();
  var p = uid();

  var call1 = GR.callHotline(s, p, 100);
  assert(call1.success === true, 'callHotline succeeds');
  assertEqual(call1.sparkAwarded, 10, 'first call awards 10 Spark');
  assert(typeof call1.message === 'string' && call1.message.length > 0, 'comfort message returned');

  // Second call within cooldown — no spark
  var call2 = GR.callHotline(s, p, 150);
  assert(call2.success === true, 'second call within cooldown still returns success');
  assertEqual(call2.sparkAwarded, 0, 'no spark within cooldown period (200 ticks)');

  // Call after cooldown expires (must be 200+ ticks after the LAST call in the log)
  // last call was at tick 150, so cooldown expires at 150+200=350; test at 400
  var call3 = GR.callHotline(s, p, 400);
  assert(call3.success === true, 'call after cooldown succeeds');
  assertEqual(call3.sparkAwarded, 10, 'spark awarded again after cooldown');

  // Different players independent cooldowns
  var p2 = uid();
  var s2 = freshState();
  GR.callHotline(s2, p, 100);
  var p2call = GR.callHotline(s2, p2, 100);
  assertEqual(p2call.sparkAwarded, 10, 'different player not on cooldown');

  // Message is deterministic for same player + tick
  var s3 = freshState();
  var p3 = uid();
  var c3a = GR.callHotline(s3, p3, 500);
  var s4 = freshState();
  var c3b = GR.callHotline(s4, p3, 500);
  assertEqual(c3a.message, c3b.message, 'same player + tick gives same comfort message');

  // Null guards
  var badNull = GR.callHotline(null, p, 1);
  assert(badNull.success === false, 'callHotline fails with null state');
  var badPlayer = GR.callHotline(freshState(), null, 1);
  assert(badPlayer.success === false, 'callHotline fails with null playerId');

  // Log entries created
  assert(s.griefLog.filter(function(e){ return e.type === 'hotline_call'; }).length >= 3,
    'hotline_call entries added to grief log');

});

// ============================================================================
// SUITE 19: checkAchievements
// ============================================================================

suite('checkAchievements', function() {

  // overcome_adversity — requires grief_reports_resolved >= 1
  var s = freshState();
  var p = uid();
  var victim = uid(), griefer = uid();
  GR.fileReport(s, p, 'structure_destroyed', 'Desc', griefer, 1000, 1);
  GR.resolveReport(s, s.reports[0].id, true, 2);

  var earned = GR.checkAchievements(s, p);
  var ids = earned.map(function(e) { return e.achievementId; });
  assert(ids.indexOf('overcome_adversity') !== -1, 'overcome_adversity earned after resolved report');
  assert(ids.indexOf('report_justice') !== -1, 'report_justice earned after winning a case');

  // No double-unlock
  var earned2 = GR.checkAchievements(s, p);
  assert(earned2.length === 0 || earned2.filter(function(e){ return e.achievementId === 'overcome_adversity'; }).length === 0,
    'overcome_adversity not double-unlocked');

  // insure_assets — requires insurance_policies_purchased >= 3
  var s2 = freshState();
  var p2 = uid();
  GR.purchaseInsurance(s2, p2, 'structure', 1000, 1);
  var e2a = GR.checkAchievements(s2, p2);
  var ids2a = e2a.map(function(e){ return e.achievementId; });
  assert(ids2a.indexOf('insure_assets') === -1, 'insure_assets not earned with only 1 policy');

  GR.purchaseInsurance(s2, p2, 'garden', 500, 2);
  GR.purchaseInsurance(s2, p2, 'inventory', 200, 3);
  var e2b = GR.checkAchievements(s2, p2);
  var ids2b = e2b.map(function(e){ return e.achievementId; });
  assert(ids2b.indexOf('insure_assets') !== -1, 'insure_assets earned after 3 policies');

  // Prerequisite: rebuild requires overcome_adversity
  var s3 = freshState();
  var p3 = uid();
  // Manually set rebuild stat without overcome_adversity — rebuild should be blocked
  var pr = s3.achievements[p3] = { unlocked: [], stats: { grief_reports_resolved: 0, grief_rebuilds: 1, grief_reports_won: 0, insurance_policies_purchased: 0, grief_mentees: 0 } };
  var e3 = GR.checkAchievements(s3, p3);
  var ids3 = e3.map(function(e){ return e.achievementId; });
  assert(ids3.indexOf('rebuild') === -1, 'rebuild blocked by prerequisite overcome_adversity');

  // Unlock prerequisite stat — both overcome_adversity and rebuild earn in the same call
  // because checkAchievements processes them sequentially (overcome_adversity first, then rebuild)
  pr.stats.grief_reports_resolved = 1;
  var e4 = GR.checkAchievements(s3, p3);
  var ids4 = e4.map(function(e){ return e.achievementId; });
  assert(ids4.indexOf('overcome_adversity') !== -1, 'overcome_adversity earned when prereq stat reached');
  assert(ids4.indexOf('rebuild') !== -1, 'rebuild earned in same pass (prereq unlocked sequentially in same call)');

  // Null guards
  var nullResult = GR.checkAchievements(null, p);
  assert(Array.isArray(nullResult) && nullResult.length === 0, 'checkAchievements null state returns []');
  var nullPlayer = GR.checkAchievements(freshState(), null);
  assert(Array.isArray(nullPlayer) && nullPlayer.length === 0, 'checkAchievements null playerId returns []');

  // Returns array always
  var s5 = freshState();
  var e5 = GR.checkAchievements(s5, uid());
  assert(Array.isArray(e5), 'checkAchievements always returns an array');

});

// ============================================================================
// SUITE 20: joinSupportNetwork / getSupportMentors
// ============================================================================

suite('joinSupportNetwork and getSupportMentors', function() {

  var s = freshState();
  var victim = uid(), griefer = uid();

  // File and resolve a report as victim
  GR.fileReport(s, victim, 'fraud', 'Scam', griefer, 500, 1);
  GR.resolveReport(s, s.reports[0].id, true, 2);

  var join = GR.joinSupportNetwork(s, victim, 10);
  assert(join.success === true, 'joinSupportNetwork succeeds after resolved report');

  var mentors = GR.getSupportMentors(s);
  assertEqual(mentors.length, 1, '1 mentor in support network');
  assertEqual(mentors[0].playerId, victim, 'mentor is the victim player');
  assert(mentors[0].active === true, 'mentor is active');

  // Cannot join twice
  var join2 = GR.joinSupportNetwork(s, victim, 11);
  assert(join2.success === false, 'cannot join support network twice');

  // Cannot join without a resolved grief report
  var newPlayer = uid();
  var join3 = GR.joinSupportNetwork(s, newPlayer, 12);
  assert(join3.success === false, 'cannot join without any resolved reports');

  // Multiple mentors
  var v2 = uid();
  GR.fileReport(s, v2, 'items_stolen', 'Theft', null, 200, 5);
  GR.resolveReport(s, s.reports[1].id, true, 6);
  GR.joinSupportNetwork(s, v2, 15);
  assertEqual(GR.getSupportMentors(s).length, 2, 'two mentors in support network');

  // Null guards
  var badNull = GR.joinSupportNetwork(null, victim, 1);
  assert(badNull.success === false, 'joinSupportNetwork fails with null state');
  var badPlayer = GR.joinSupportNetwork(s, null, 1);
  assert(badPlayer.success === false, 'joinSupportNetwork fails with null playerId');

  // getSupportMentors null state
  var nullMentors = GR.getSupportMentors(null);
  assert(Array.isArray(nullMentors) && nullMentors.length === 0, 'getSupportMentors null state returns []');

});

// ============================================================================
// SUITE 21: getGriefStats
// ============================================================================

suite('getGriefStats', function() {

  var s = freshState();
  var p1 = uid(), p2 = uid(), p3 = uid();

  // File some reports
  GR.fileReport(s, p1, 'fraud', 'D1', p2, 1000, 1);
  GR.fileReport(s, p2, 'items_stolen', 'D2', p3, 500, 2);
  GR.fileReport(s, p3, 'structure_destroyed', 'D3', p1, 2000, 3);

  // Resolve two
  GR.resolveReport(s, s.reports[0].id, true, 5);
  GR.resolveReport(s, s.reports[1].id, false, 6);
  // Third stays open

  var stats = GR.getGriefStats(s);
  assertEqual(stats.totalReports, 3, 'totalReports is 3');
  assertEqual(stats.resolvedReports, 2, 'resolvedReports is 2');
  assertEqual(stats.openReports, 1, 'openReports is 1');
  assertEqual(stats.guiltyFindings, 1, 'guiltyFindings is 1');
  assertEqual(stats.totalLossValue, 3500, 'totalLossValue sums all reports');

  // Insurance stats
  GR.purchaseInsurance(s, p1, 'structure', 10000, 1);
  var pol = GR.getInsurance(s, p1)[0];
  GR.claimInsurance(s, p1, pol.id, 50);
  var stats2 = GR.getGriefStats(s);
  assertEqual(stats2.totalPolicies, 1, 'totalPolicies counted');
  assertEqual(stats2.totalPayouts, 8000, 'totalPayouts counted after claim');

  // Restitution stats
  var ordRes = GR.orderRestitution(s, s.reports[0].id, p2, 1000, 10);
  GR.payRestitution(s, ordRes.order.id, 400, 11);
  var stats3 = GR.getGriefStats(s);
  assertEqual(stats3.totalRestitutionOrdered, 2000, 'totalRestitutionOrdered includes both auto+manual orders');
  assertEqual(stats3.totalRestitutionPaid, 400, 'totalRestitutionPaid is 400');

  // Support network
  assertEqual(stats3.supportNetworkSize, 0, 'supportNetworkSize is 0');

  // Null state returns zeros
  var nullStats = GR.getGriefStats(null);
  assertEqual(nullStats.totalReports, 0, 'null state stats have 0 total reports');
  assert(typeof nullStats.reportsByType === 'object', 'null state returns reportsByType object');

  // reportsByType breakdown
  assert(typeof stats3.reportsByType === 'object', 'reportsByType is an object');
  assertEqual(stats3.reportsByType['fraud'], 1, 'reportsByType tracks fraud correctly');

});

// ============================================================================
// SUITE 22: getPlayerGriefRecord
// ============================================================================

suite('getPlayerGriefRecord', function() {

  var s = freshState();
  var victim = uid(), griefer = uid();

  GR.fileReport(s, victim, 'fraud', 'Scam', griefer, 1000, 1);
  GR.fileReport(s, victim, 'items_stolen', 'Theft', null, 200, 2);
  GR.fileReport(s, griefer, 'harassment', 'Harass', victim, 50, 3);

  GR.resolveReport(s, s.reports[0].id, true, 5);
  GR.purchaseInsurance(s, victim, 'structure', 5000, 6);
  GR.callHotline(s, victim, 10);
  GR.callHotline(s, victim, 300);

  GR.joinSupportNetwork(s, victim, 20);

  var record = GR.getPlayerGriefRecord(s, victim);
  assertEqual(record.reportsFiledByPlayer.length, 2, 'victim filed 2 reports');
  assertEqual(record.reportsAgainstPlayer.length, 1, 'victim targeted in 1 report');
  assertEqual(record.insurance.length, 1, 'victim has 1 insurance policy');
  assert(record.supportNetworkMember === true, 'victim is a support network member');
  assertEqual(record.hotlineCalls, 2, 'victim called hotline twice');
  assert(Array.isArray(record.achievements), 'achievements is an array');
  assert(Array.isArray(record.restitutions), 'restitutions is an array');

  // Griefer record
  var grieferRecord = GR.getPlayerGriefRecord(s, griefer);
  assertEqual(grieferRecord.reportsFiledByPlayer.length, 1, 'griefer filed 1 report');
  assertEqual(grieferRecord.reportsAgainstPlayer.length, 1, 'griefer targeted in 1 report');

  // Unknown player
  var unknownRecord = GR.getPlayerGriefRecord(s, 'nobody');
  assertEqual(unknownRecord.reportsFiledByPlayer.length, 0, 'unknown player has no filed reports');
  assertEqual(unknownRecord.hotlineCalls, 0, 'unknown player has 0 hotline calls');

  // Null guards
  var nullRecord = GR.getPlayerGriefRecord(null, victim);
  assert(Array.isArray(nullRecord.reportsFiledByPlayer), 'null state returns array for reportsFiledByPlayer');
  var nullPlayer = GR.getPlayerGriefRecord(s, null);
  assert(Array.isArray(nullPlayer.reportsFiledByPlayer), 'null player returns array for reportsFiledByPlayer');

});

// ============================================================================
// SUITE 23: CONSTANTS
// ============================================================================

suite('Constants', function() {

  assertEqual(GR.INSURANCE_RATE, 0.01, 'INSURANCE_RATE is 1%');
  assertEqual(GR.INSURANCE_PAYOUT_RATE, 0.80, 'INSURANCE_PAYOUT_RATE is 80%');
  assertEqual(GR.HOTLINE_SPARK_AWARD, 10, 'HOTLINE_SPARK_AWARD is 10');

});

// ============================================================================
// SUITE 24: Full workflow integration
// ============================================================================

suite('Full workflow integration', function() {

  var s = freshState();
  var victim = uid(), griefer = uid();

  // Victim purchases insurance
  GR.purchaseInsurance(s, victim, 'structure', 20000, 0);
  assert(GR.isInsured(s, victim, 'structure') === true, 'victim is insured');

  // Griefing occurs — victim files report
  var filed = GR.fileReport(s, victim, 'structure_destroyed', 'My tower was griefed!', griefer, 15000, 100);
  assert(filed.success === true, 'report filed');

  // Victim claims insurance immediately
  var policyId = GR.getInsurance(s, victim)[0].id;
  var claim = GR.claimInsurance(s, victim, policyId, 101);
  assert(claim.success === true, 'victim claims insurance');
  assertEqual(claim.payout, 16000, 'victim receives 80% of 20000 = 16000');

  // Investigation proceeds
  GR.investigateReport(s, filed.report.id, { logs: ['server_log_1'], witnesses: ['witness_a'] }, 110);
  GR.investigateReport(s, filed.report.id, { logs: ['server_log_2'], witnesses: [] }, 120);

  var report = GR.getReport(s, filed.report.id);
  assertEqual(report.status, 'evidence_reviewed', 'report advances to evidence_reviewed');
  assertEqual(report.evidence.length, 2, 'evidence logs attached');

  // Verdict: guilty
  var verdict = GR.resolveReport(s, filed.report.id, true, 130);
  assert(verdict.success === true, 'verdict rendered');
  assert(verdict.rollback === true, 'structure_destroyed triggers rollback');
  assert(verdict.restitution !== null, 'restitution order issued');

  // Griefer pays restitution
  var payRes = GR.payRestitution(s, verdict.restitution.id, 7500, 150);
  assert(payRes.success === true, 'partial restitution payment');
  assertEqual(payRes.remaining, 7500, 'still 7500 remaining');

  // Victim earns achievements
  var achievements = GR.checkAchievements(s, victim);
  var achIds = achievements.map(function(a){ return a.achievementId; });
  assert(achIds.indexOf('overcome_adversity') !== -1, 'victim earns overcome_adversity');
  assert(achIds.indexOf('report_justice') !== -1, 'victim earns report_justice');

  // Victim joins support network
  var joinResult = GR.joinSupportNetwork(s, victim, 200);
  assert(joinResult.success === true, 'victim joins support network');

  // Victim calls hotline
  var hotline = GR.callHotline(s, victim, 300);
  assert(hotline.success === true, 'victim calls hotline');
  assert(typeof hotline.message === 'string', 'comfort message returned');

  // Check final stats
  var stats = GR.getGriefStats(s);
  assertEqual(stats.totalReports, 1, 'one total report');
  assertEqual(stats.resolvedReports, 1, 'one resolved');
  assertEqual(stats.guiltyFindings, 1, 'one guilty finding');
  assertEqual(stats.supportNetworkSize, 1, 'one support network member');
  assertEqual(stats.totalPayouts, 16000, 'insurance payout counted');

  // Full record
  var record = GR.getPlayerGriefRecord(s, victim);
  assertEqual(record.reportsFiledByPlayer.length, 1, 'victim filed one report');
  assert(record.supportNetworkMember === true, 'victim is in support network');
  assert(record.achievements.indexOf('overcome_adversity') !== -1, 'overcome_adversity in record');

});

// ============================================================================
// SUITE 25: Report ID uniqueness
// ============================================================================

suite('ID uniqueness', function() {

  var s = freshState();
  var p = uid();

  for (var i = 0; i < 10; i++) {
    GR.fileReport(s, p, 'fraud', 'D' + i, null, 100, i);
  }
  var ids = s.reports.map(function(r){ return r.id; });
  var unique = {};
  var allUnique = true;
  for (var j = 0; j < ids.length; j++) {
    if (unique[ids[j]]) { allUnique = false; break; }
    unique[ids[j]] = true;
  }
  assert(allUnique, '10 reports all have unique IDs');

  var s2 = freshState();
  GR.fileReport(s2, p, 'fraud', 'Desc', uid(), 100, 1);
  GR.resolveReport(s2, s2.reports[0].id, true, 2);
  GR.orderRestitution(s2, s2.reports[0].id, uid(), 100, 3);
  var rstIds = s2.restitutions.map(function(r){ return r.id; });
  var uniqueRst = {};
  var allUniqueRst = true;
  for (var k = 0; k < rstIds.length; k++) {
    if (uniqueRst[rstIds[k]]) { allUniqueRst = false; break; }
    uniqueRst[rstIds[k]] = true;
  }
  assert(allUniqueRst, 'restitution order IDs are unique');

});

// ============================================================================
// RESULTS
// ============================================================================

console.log('\n============================================================');
console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
if (failures.length > 0) {
  console.log('\nFailures:');
  for (var i = 0; i < failures.length; i++) {
    console.log('  ' + failures[i]);
  }
  process.exit(1);
} else {
  console.log('All tests passed!');
  process.exit(0);
}
