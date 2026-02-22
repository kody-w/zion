/**
 * tests/test_safety_moderation.js
 * Comprehensive tests for the ZION Safety Moderation module.
 * 200+ tests covering: constants, moderator management, incident reports,
 * warning ladder, mute system, suspension registry, appeal system,
 * accountability log, rate limiting, combined helpers, edge cases.
 *
 * Run with: node tests/test_safety_moderation.js
 */

'use strict';

var SM = require('../src/js/safety_moderation');

// ============================================================================
// TEST HARNESS
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
  assert(a === b, msg + ' (got ' + JSON.stringify(a) + ', expected ' + JSON.stringify(b) + ')');
}

function assertNotNull(val, msg) {
  assert(val !== null && val !== undefined, msg);
}

function assertNull(val, msg) {
  assert(val === null || val === undefined, msg);
}

function assertArray(val, msg) {
  assert(Array.isArray(val), msg + ' (expected array, got ' + typeof val + ')');
}

// ============================================================================
// HELPERS
// ============================================================================

var _pid = 0;
function uid() { return 'player_' + (++_pid); }

function freshMod() {
  SM.reset();
  var modId = uid();
  SM.registerModerator(modId, 'admin');
  return modId;
}

function freshSenior() {
  SM.reset();
  var modId = uid();
  SM.registerModerator(modId, 'senior_moderator');
  return modId;
}

function freshBasicMod() {
  SM.reset();
  var modId = uid();
  SM.registerModerator(modId, 'moderator');
  return modId;
}

function makeReport(reporterId, reportedId, cat, admin) {
  return SM.fileReport({
    reporterId:  reporterId,
    reportedId:  reportedId,
    category:    cat || 'harassment',
    description: 'Test incident description',
    evidence:    [{ type: 'chat_log', content: 'sample log' }]
  });
}

// ============================================================================
// SUITE 1: EXPORTS / CONSTANTS
// ============================================================================

suite('1. Exports and Constants', function() {
  SM.reset();

  assert(typeof SM.reset === 'function',                      'reset is exported');
  assert(typeof SM.registerModerator === 'function',          'registerModerator is exported');
  assert(typeof SM.removeModerator === 'function',            'removeModerator is exported');
  assert(typeof SM.isModerator === 'function',                'isModerator is exported');
  assert(typeof SM.getModeratorPermissions === 'function',    'getModeratorPermissions is exported');
  assert(typeof SM.hasPermission === 'function',              'hasPermission is exported');
  assert(typeof SM.fileReport === 'function',                 'fileReport is exported');
  assert(typeof SM.getIncident === 'function',                'getIncident is exported');
  assert(typeof SM.getIncidentsFor === 'function',            'getIncidentsFor is exported');
  assert(typeof SM.getIncidentsByReporter === 'function',     'getIncidentsByReporter is exported');
  assert(typeof SM.reviewIncident === 'function',             'reviewIncident is exported');
  assert(typeof SM.issueNextWarning === 'function',           'issueNextWarning is exported');
  assert(typeof SM.issueSpecificWarning === 'function',       'issueSpecificWarning is exported');
  assert(typeof SM.getWarnings === 'function',                'getWarnings is exported');
  assert(typeof SM.getCurrentStep === 'function',             'getCurrentStep is exported');
  assert(typeof SM.getNextLadderStep === 'function',          'getNextLadderStep is exported');
  assert(typeof SM.applyMute === 'function',                  'applyMute is exported');
  assert(typeof SM.liftMute === 'function',                   'liftMute is exported');
  assert(typeof SM.isMuted === 'function',                    'isMuted is exported');
  assert(typeof SM.getMute === 'function',                    'getMute is exported');
  assert(typeof SM.isInCooldown === 'function',               'isInCooldown is exported');
  assert(typeof SM.getCooldownRemaining === 'function',       'getCooldownRemaining is exported');
  assert(typeof SM.canChat === 'function',                    'canChat is exported');
  assert(typeof SM.applyTempSuspension === 'function',        'applyTempSuspension is exported');
  assert(typeof SM.applyPermanentSuspension === 'function',   'applyPermanentSuspension is exported');
  assert(typeof SM.liftSuspension === 'function',             'liftSuspension is exported');
  assert(typeof SM.isSuspended === 'function',                'isSuspended is exported');
  assert(typeof SM.getSuspension === 'function',              'getSuspension is exported');
  assert(typeof SM.getAllSuspensions === 'function',           'getAllSuspensions is exported');
  assert(typeof SM.fileAppeal === 'function',                 'fileAppeal is exported');
  assert(typeof SM.beginAppealReview === 'function',          'beginAppealReview is exported');
  assert(typeof SM.resolveAppeal === 'function',              'resolveAppeal is exported');
  assert(typeof SM.getAppeal === 'function',                  'getAppeal is exported');
  assert(typeof SM.getAppealsFor === 'function',              'getAppealsFor is exported');
  assert(typeof SM.getPendingAppeals === 'function',          'getPendingAppeals is exported');
  assert(typeof SM.expireStaleAppeals === 'function',         'expireStaleAppeals is exported');
  assert(typeof SM.getAccountabilityLog === 'function',       'getAccountabilityLog is exported');
  assert(typeof SM.getPlayerLog === 'function',               'getPlayerLog is exported');
  assert(typeof SM.getLogByAction === 'function',             'getLogByAction is exported');
  assert(typeof SM.getRecentLog === 'function',               'getRecentLog is exported');
  assert(typeof SM.recordMessage === 'function',              'recordMessage is exported');
  assert(typeof SM.getRateLimitState === 'function',          'getRateLimitState is exported');
  assert(typeof SM.resetRateLimit === 'function',             'resetRateLimit is exported');
  assert(typeof SM.isRateLimited === 'function',              'isRateLimited is exported');
  assert(typeof SM.getPlayerStatus === 'function',            'getPlayerStatus is exported');
  assert(typeof SM.assessPlayer === 'function',               'assessPlayer is exported');
  assert(typeof SM.mulberry32 === 'function',                 'mulberry32 is exported');

  // Constants
  assertArray(SM.LADDER_STEPS,         'LADDER_STEPS is array');
  assertEqual(SM.LADDER_STEPS.length, 5, 'LADDER_STEPS has 5 entries');
  assertEqual(SM.LADDER_STEPS[0], 'verbal_warning',    'step 0 = verbal_warning');
  assertEqual(SM.LADDER_STEPS[1], 'written_warning',   'step 1 = written_warning');
  assertEqual(SM.LADDER_STEPS[2], 'mute',              'step 2 = mute');
  assertEqual(SM.LADDER_STEPS[3], 'temp_suspend',      'step 3 = temp_suspend');
  assertEqual(SM.LADDER_STEPS[4], 'permanent_suspend', 'step 4 = permanent_suspend');

  assertArray(SM.INCIDENT_CATEGORIES, 'INCIDENT_CATEGORIES is array');
  assert(SM.INCIDENT_CATEGORIES.indexOf('harassment') !== -1, 'harassment category exists');
  assert(SM.INCIDENT_CATEGORIES.indexOf('spam')       !== -1, 'spam category exists');
  assert(SM.INCIDENT_CATEGORIES.indexOf('exploit')    !== -1, 'exploit category exists');
  assert(SM.INCIDENT_CATEGORIES.indexOf('grief')      !== -1, 'grief category exists');

  assertArray(SM.EVIDENCE_TYPES, 'EVIDENCE_TYPES is array');
  assert(SM.EVIDENCE_TYPES.indexOf('chat_log') !== -1, 'chat_log evidence type exists');

  assertArray(SM.LOG_ACTIONS, 'LOG_ACTIONS is array');
  assert(SM.LOG_ACTIONS.length > 0, 'LOG_ACTIONS non-empty');

  assertEqual(typeof SM.APPEAL_WINDOW_MS, 'number', 'APPEAL_WINDOW_MS is number');
  assertEqual(SM.APPEAL_WINDOW_MS, 7 * 24 * 60 * 60 * 1000, 'APPEAL_WINDOW_MS = 7 days');

  assertEqual(typeof SM.POST_MUTE_COOLDOWN_MS, 'number', 'POST_MUTE_COOLDOWN_MS is number');
  assertEqual(typeof SM.RATE_LIMIT_MAX_MESSAGES, 'number', 'RATE_LIMIT_MAX_MESSAGES is number');
  assertEqual(SM.RATE_LIMIT_MAX_MESSAGES, 30, 'rate limit max = 30');
  assertEqual(SM.RATE_LIMIT_FLOOD_MAX, 10,    'flood max = 10');

  assert(typeof SM.MODERATOR_ROLES === 'object', 'MODERATOR_ROLES is object');
  assert(SM.MODERATOR_ROLES.moderator       !== undefined, 'moderator role exists');
  assert(SM.MODERATOR_ROLES.senior_moderator !== undefined, 'senior_moderator role exists');
  assert(SM.MODERATOR_ROLES.admin           !== undefined, 'admin role exists');

  assert(typeof SM.TEMP_SUSPEND_DURATIONS === 'object', 'TEMP_SUSPEND_DURATIONS is object');
  assert(SM.TEMP_SUSPEND_DURATIONS.tier1 > 0, 'tier1 duration > 0');
  assert(SM.TEMP_SUSPEND_DURATIONS.tier4 > SM.TEMP_SUSPEND_DURATIONS.tier1, 'tier4 > tier1');

  assert(typeof SM.MUTE_DURATIONS === 'object', 'MUTE_DURATIONS is object');
  assert(SM.MUTE_DURATIONS.short < SM.MUTE_DURATIONS.long, 'short mute < long mute');
  assertEqual(SM.MUTE_DURATIONS.permanent, Infinity, 'permanent mute = Infinity');
});

// ============================================================================
// SUITE 2: MODERATOR MANAGEMENT
// ============================================================================

suite('2. Moderator Management', function() {
  SM.reset();
  var p1 = uid(), p2 = uid(), p3 = uid();

  // Register
  var r1 = SM.registerModerator(p1, 'moderator');
  assert(r1.ok, 'registerModerator returns ok for moderator');
  assertEqual(r1.role, 'moderator', 'role is moderator');

  var r2 = SM.registerModerator(p2, 'senior_moderator');
  assert(r2.ok, 'registerModerator returns ok for senior_moderator');

  var r3 = SM.registerModerator(p3, 'admin');
  assert(r3.ok, 'registerModerator returns ok for admin');

  // isModerator
  assert(SM.isModerator(p1), 'p1 is moderator');
  assert(SM.isModerator(p2), 'p2 is senior_moderator');
  assert(SM.isModerator(p3), 'p3 is admin');
  assert(!SM.isModerator(uid()), 'random player is not moderator');

  // getModeratorPermissions
  var perms1 = SM.getModeratorPermissions(p1);
  assertNotNull(perms1, 'perms returned for moderator');
  assert(perms1.canWarn,  'moderator canWarn');
  assert(perms1.canMute,  'moderator canMute');
  assert(!perms1.canSuspendTemp, 'moderator cannot temp suspend');
  assert(!perms1.canSuspendPerm, 'moderator cannot perm suspend');
  assert(perms1.canReviewAppeals, 'moderator canReviewAppeals');

  var perms2 = SM.getModeratorPermissions(p2);
  assertNotNull(perms2, 'perms returned for senior');
  assert(perms2.canSuspendTemp,  'senior can temp suspend');
  assert(!perms2.canSuspendPerm, 'senior cannot perm suspend');

  var perms3 = SM.getModeratorPermissions(p3);
  assertNotNull(perms3, 'perms returned for admin');
  assert(perms3.canSuspendPerm, 'admin can perm suspend');

  assertNull(SM.getModeratorPermissions(uid()), 'null perms for non-moderator');

  // hasPermission
  assert(SM.hasPermission(p3, 'canSuspendPerm'), 'admin hasPermission canSuspendPerm');
  assert(!SM.hasPermission(p1, 'canSuspendPerm'), 'basic mod lacks canSuspendPerm');
  assert(!SM.hasPermission(uid(), 'canWarn'), 'non-mod lacks permissions');

  // removeModerator
  SM.removeModerator(p1);
  assert(!SM.isModerator(p1), 'p1 no longer moderator after removal');

  // Error cases
  var badRole = SM.registerModerator(uid(), 'god');
  assert(!badRole.ok, 'unknown role rejected');
  assertNotNull(badRole.error, 'error message for unknown role');

  var badId = SM.registerModerator(null, 'admin');
  assert(!badId.ok, 'null player ID rejected');

  var emptyId = SM.registerModerator('', 'admin');
  assert(!emptyId.ok, 'empty player ID rejected');
});

// ============================================================================
// SUITE 3: INCIDENT REPORTS
// ============================================================================

suite('3. Incident Reports', function() {
  SM.reset();
  var reporter = uid();
  var reported = uid();

  // Valid report
  var r1 = SM.fileReport({
    reporterId:  reporter,
    reportedId:  reported,
    category:    'harassment',
    description: 'Player sent repeated unwanted messages',
    evidence:    [
      { type: 'chat_log', content: 'log text' },
      { type: 'screenshot', content: 'image_url' }
    ]
  });

  assert(r1.ok, 'fileReport returns ok');
  assertNotNull(r1.incident, 'incident object returned');
  assertEqual(r1.incident.reporterId, reporter, 'reporterId matches');
  assertEqual(r1.incident.reportedId, reported, 'reportedId matches');
  assertEqual(r1.incident.category, 'harassment', 'category matches');
  assertEqual(r1.incident.status, 'open', 'initial status is open');
  assertNull(r1.incident.resolution, 'resolution initially null');
  assertNull(r1.incident.reviewedBy, 'reviewedBy initially null');
  assertEqual(r1.incident.evidence.length, 2, 'evidence stored correctly');
  assertNotNull(r1.incident.id, 'incident has an ID');
  assertNotNull(r1.incident.ts, 'incident has a timestamp');

  // getIncident
  var fetched = SM.getIncident(r1.incident.id);
  assertNotNull(fetched, 'getIncident returns incident');
  assertEqual(fetched.id, r1.incident.id, 'fetched incident ID matches');

  // getIncidentsFor
  var list = SM.getIncidentsFor(reported);
  assertArray(list, 'getIncidentsFor returns array');
  assertEqual(list.length, 1, 'one incident for reported player');
  assertEqual(list[0].reportedId, reported, 'incident belongs to reported player');

  // getIncidentsByReporter
  var byReporter = SM.getIncidentsByReporter(reporter);
  assertArray(byReporter, 'getIncidentsByReporter returns array');
  assertEqual(byReporter.length, 1, 'one incident by reporter');

  // Multiple incidents
  var r2 = SM.fileReport({
    reporterId: uid(),
    reportedId: reported,
    category:   'spam',
    description: 'Flooding chat',
    evidence:   []
  });
  assertEqual(SM.getIncidentsFor(reported).length, 2, 'two incidents total');

  // getIncident for non-existent
  assertNull(SM.getIncident('nonexistent_id'), 'null for unknown incident');

  // reviewIncident
  var admin = uid();
  SM.registerModerator(admin, 'admin');
  var rv = SM.reviewIncident(r1.incident.id, admin, 'Confirmed harassment, warning issued', 'reviewed');
  assert(rv.ok, 'reviewIncident ok');
  assertEqual(rv.incident.status, 'reviewed', 'status updated to reviewed');
  assertEqual(rv.incident.reviewedBy, admin, 'reviewedBy set');
  assertNotNull(rv.incident.reviewedAt, 'reviewedAt set');

  // close incident
  var rc = SM.reviewIncident(r1.incident.id, admin, 'Case closed', 'closed');
  assert(rc.ok, 'reviewIncident closes ok');
  assertEqual(rc.incident.status, 'closed', 'status is closed');

  // Error cases
  var noDesc = SM.fileReport({ reporterId: reporter, reportedId: reported, category: 'spam', description: '', evidence: [] });
  assert(!noDesc.ok, 'empty description rejected');

  var selfReport = SM.fileReport({ reporterId: reporter, reportedId: reporter, category: 'spam', description: 'test', evidence: [] });
  assert(!selfReport.ok, 'self-report rejected');

  var badCat = SM.fileReport({ reporterId: reporter, reportedId: reported, category: 'vandalism', description: 'test', evidence: [] });
  assert(!badCat.ok, 'invalid category rejected');

  var noReporter = SM.fileReport({ reportedId: reported, category: 'spam', description: 'test', evidence: [] });
  assert(!noReporter.ok, 'missing reporterId rejected');

  var noReported = SM.fileReport({ reporterId: reporter, category: 'spam', description: 'test', evidence: [] });
  assert(!noReported.ok, 'missing reportedId rejected');

  var badEvidence = SM.fileReport({ reporterId: reporter, reportedId: reported, category: 'spam', description: 'test', evidence: [{ type: 'fake_type', content: 'x' }] });
  assert(!badEvidence.ok, 'invalid evidence type rejected');

  var notModReview = SM.reviewIncident(r1.incident.id, uid(), 'review', 'reviewed');
  assert(!notModReview.ok, 'non-moderator cannot review incidents');

  var badStatus = SM.reviewIncident(r1.incident.id, admin, 'review', 'invalid_status');
  assert(!badStatus.ok, 'invalid status rejected in reviewIncident');

  var notFoundReview = SM.reviewIncident('fake_id', admin, 'review', 'reviewed');
  assert(!notFoundReview.ok, 'review of non-existent incident rejected');

  // Log entry for report
  var log = SM.getLogByAction('report_filed');
  assert(log.length >= 2, 'report_filed entries in accountability log');
});

// ============================================================================
// SUITE 4: WARNING LADDER
// ============================================================================

suite('4. Warning Ladder', function() {
  SM.reset();
  var admin = uid();
  SM.registerModerator(admin, 'admin');
  var player = uid();

  // Initial state
  assertNull(SM.getCurrentStep(player), 'no current step initially');
  assertEqual(SM.getWarnings(player).length, 0, 'no warnings initially');
  assertEqual(SM.getNextLadderStep(player), 'verbal_warning', 'first step is verbal_warning');

  // Step 1: verbal_warning
  var w1 = SM.issueNextWarning(admin, player, 'Please stop spamming');
  assert(w1.ok, 'verbal_warning issued ok');
  assertNotNull(w1.warning, 'warning object returned');
  assertEqual(w1.warning.step, 'verbal_warning', 'step is verbal_warning');
  assertEqual(SM.getCurrentStep(player), 'verbal_warning', 'current step updated');
  assertEqual(SM.getWarnings(player).length, 1, 'one warning on record');
  assertEqual(SM.getNextLadderStep(player), 'written_warning', 'next step is written_warning');

  // Step 2: written_warning
  var w2 = SM.issueNextWarning(admin, player, 'Final written warning');
  assert(w2.ok, 'written_warning issued ok');
  assertEqual(w2.warning.step, 'written_warning', 'step is written_warning');
  assertEqual(SM.getNextLadderStep(player), 'mute', 'next step is mute');

  // Step 3: mute (via ladder)
  var w3 = SM.issueNextWarning(admin, player, 'Escalating to mute');
  assert(w3.ok, 'mute step issued ok');
  assertEqual(w3.warning.step, 'mute', 'step is mute');

  // Step 4: temp_suspend
  var w4 = SM.issueNextWarning(admin, player, 'Temp suspend');
  assert(w4.ok, 'temp_suspend step issued ok');
  assertEqual(w4.warning.step, 'temp_suspend', 'step is temp_suspend');

  // Step 5: permanent_suspend
  var w5 = SM.issueNextWarning(admin, player, 'Permanent suspend');
  assert(w5.ok, 'permanent_suspend issued ok');
  assertEqual(w5.warning.step, 'permanent_suspend', 'step is permanent_suspend');

  // At top — next should fail
  var topAttempt = SM.issueNextWarning(admin, player, 'beyond top');
  assert(!topAttempt.ok, 'issuing beyond top of ladder fails');
  assertNotNull(topAttempt.error, 'error message returned at top of ladder');

  // getWarnings returns copy
  var warnings = SM.getWarnings(player);
  assertEqual(warnings.length, 5, 'all 5 warnings recorded');

  // Warning has required fields
  var w = warnings[0];
  assertNotNull(w.id, 'warning has id');
  assertNotNull(w.ts, 'warning has timestamp');
  assertEqual(w.moderatorId, admin, 'warning has moderatorId');
  assertEqual(w.targetId, player, 'warning has targetId');
  assertNotNull(w.reason, 'warning has reason');

  // issueSpecificWarning directly
  SM.reset();
  SM.registerModerator(admin, 'admin');
  var p2 = uid();
  var ws = SM.issueSpecificWarning(admin, p2, 'written_warning', 'Direct written warning');
  assert(ws.ok, 'issueSpecificWarning works directly');
  assertEqual(ws.warning.step, 'written_warning', 'direct step is correct');

  // With linked incidentId
  var p3 = uid();
  SM.reset();
  SM.registerModerator(admin, 'admin');
  var inc = SM.fileReport({ reporterId: uid(), reportedId: p3, category: 'harassment', description: 'test', evidence: [] });
  var wi = SM.issueNextWarning(admin, p3, 'Linked warning', inc.incident.id);
  assert(wi.ok, 'warning with incidentId ok');
  assertEqual(wi.warning.incidentId, inc.incident.id, 'incidentId linked');

  // Permission checks for specific steps
  SM.reset();
  var basicMod = uid();
  SM.registerModerator(basicMod, 'moderator');
  var target = uid();
  var noPermTemp = SM.issueSpecificWarning(basicMod, target, 'temp_suspend', 'try temp suspend');
  assert(!noPermTemp.ok, 'basic mod cannot temp_suspend');

  var noPermPerm = SM.issueSpecificWarning(basicMod, target, 'permanent_suspend', 'try perm suspend');
  assert(!noPermPerm.ok, 'basic mod cannot permanent_suspend');

  var canWarn = SM.issueSpecificWarning(basicMod, target, 'verbal_warning', 'can warn');
  assert(canWarn.ok, 'basic mod can issue verbal_warning');

  var canWarnW = SM.issueSpecificWarning(basicMod, target, 'written_warning', 'can warn written');
  assert(canWarnW.ok, 'basic mod can issue written_warning');

  var canMute = SM.issueSpecificWarning(basicMod, target, 'mute', 'can mute');
  assert(canMute.ok, 'basic mod can issue mute step');

  // Error cases
  var noMod = SM.issueNextWarning(uid(), p2, 'reason');
  assert(!noMod.ok, 'non-moderator cannot issue warnings');

  var noReason = SM.issueNextWarning(admin, uid(), '');
  // re-register admin after reset
  SM.reset();
  SM.registerModerator(admin, 'admin');
  var noReason2 = SM.issueNextWarning(admin, uid(), '');
  assert(!noReason2.ok, 'empty reason rejected');

  var invalidStep = SM.issueSpecificWarning(admin, uid(), 'super_ban', 'reason');
  assert(!invalidStep.ok, 'invalid ladder step rejected');

  // Log entries
  SM.reset();
  SM.registerModerator(admin, 'admin');
  var logPlayer = uid();
  SM.issueNextWarning(admin, logPlayer, 'first warning');
  var logEntries = SM.getLogByAction('verbal_warning_issued');
  assert(logEntries.length >= 1, 'verbal_warning_issued in accountability log');
});

// ============================================================================
// SUITE 5: MUTE SYSTEM
// ============================================================================

suite('5. Mute System', function() {
  SM.reset();
  var admin = uid();
  SM.registerModerator(admin, 'admin');
  var player = uid();

  // applyMute — named duration
  var m1 = SM.applyMute(admin, player, 'short', 'Muted for spamming');
  assert(m1.ok, 'applyMute returns ok');
  assertNotNull(m1.mute, 'mute object returned');
  assertEqual(m1.mute.playerId, player, 'mute has correct playerId');
  assertEqual(m1.mute.moderatorId, admin, 'mute has moderatorId');
  assert(!m1.mute.permanent, 'short mute is not permanent');
  assertNotNull(m1.mute.endsAt, 'endsAt is set for non-permanent mute');
  assert(m1.mute.active, 'mute is active');
  assertEqual(m1.mute.reason, 'Muted for spamming', 'reason stored');

  // isMuted
  assert(SM.isMuted(player), 'player is muted after applyMute');

  // getMute
  var mute = SM.getMute(player);
  assertNotNull(mute, 'getMute returns mute object');
  assertEqual(mute.playerId, player, 'mute playerId correct');

  // canChat blocked by mute
  var chatCheck = SM.canChat(player);
  assert(!chatCheck.allowed, 'canChat returns not allowed when muted');
  assertEqual(chatCheck.reason, 'muted', 'reason is muted');

  // liftMute
  var lifted = SM.liftMute(admin, player);
  assert(lifted.ok, 'liftMute returns ok');
  assert(!SM.isMuted(player), 'player no longer muted after lift');
  assertNull(SM.getMute(player), 'getMute returns null after lift');

  // Post-mute cooldown
  assert(SM.isInCooldown(player), 'player in cooldown after mute lifted');
  var chatCooldown = SM.canChat(player);
  assert(!chatCooldown.allowed, 'canChat blocked during cooldown');
  assertEqual(chatCooldown.reason, 'cooldown', 'reason is cooldown');
  assert(chatCooldown.remainingMs > 0, 'remaining cooldown ms > 0');

  // getCooldownRemaining
  var remaining = SM.getCooldownRemaining(player);
  assert(remaining > 0, 'getCooldownRemaining > 0 during cooldown');

  // Permanent mute
  SM.reset();
  SM.registerModerator(admin, 'admin');
  var permPlayer = uid();
  var pm = SM.applyMute(admin, permPlayer, 'permanent', 'Permanent mute for hate speech');
  assert(pm.ok, 'permanent mute applied ok');
  assert(pm.mute.permanent, 'permanent mute flag set');
  assertNull(pm.mute.endsAt, 'permanent mute has no endsAt');
  assert(SM.isMuted(permPlayer), 'permanently muted player is muted');

  // Numeric duration mute
  SM.reset();
  SM.registerModerator(admin, 'admin');
  var numPlayer = uid();
  var numMute = SM.applyMute(admin, numPlayer, 120000, 'Custom 2-minute mute');
  assert(numMute.ok, 'numeric duration mute ok');
  assertEqual(numMute.mute.durationMs, 120000, 'numeric duration stored');

  // liftMute — non-existent
  var liftNone = SM.liftMute(admin, uid());
  assert(!liftNone.ok, 'lifting non-existent mute fails');

  // Permission checks
  SM.reset();
  var basicMod = uid();
  SM.registerModerator(basicMod, 'moderator');
  var target = uid();
  var muteByBasic = SM.applyMute(basicMod, target, 'short', 'reason');
  assert(muteByBasic.ok, 'basic mod can mute');

  // Non-moderator cannot mute
  SM.reset();
  var nonMod = uid();
  var target2 = uid();
  var noModMute = SM.applyMute(nonMod, target2, 'short', 'reason');
  assert(!noModMute.ok, 'non-moderator cannot mute');

  // Error cases
  SM.reset();
  SM.registerModerator(admin, 'admin');
  var errTarget = uid();
  var badDur = SM.applyMute(admin, errTarget, 'forever', 'bad duration');
  assert(!badDur.ok, 'invalid duration string rejected');

  var negDur = SM.applyMute(admin, errTarget, -1, 'negative duration');
  assert(!negDur.ok, 'negative duration rejected');

  var emptyReason = SM.applyMute(admin, errTarget, 'short', '');
  assert(!emptyReason.ok, 'empty reason rejected for mute');

  var badTarget = SM.applyMute(admin, null, 'short', 'reason');
  assert(!badTarget.ok, 'null target rejected for mute');

  // Log entries
  SM.reset();
  SM.registerModerator(admin, 'admin');
  var logPlayer = uid();
  SM.applyMute(admin, logPlayer, 'short', 'test');
  SM.liftMute(admin, logPlayer);
  assert(SM.getLogByAction('mute_applied').length >= 1, 'mute_applied in log');
  assert(SM.getLogByAction('mute_lifted').length >= 1, 'mute_lifted in log');
  assert(SM.getLogByAction('cooldown_applied').length >= 1, 'cooldown_applied in log');
});

// ============================================================================
// SUITE 6: SUSPENSION REGISTRY
// ============================================================================

suite('6. Suspension Registry', function() {
  // --- Temp suspension ---
  SM.reset();
  var admin = uid();
  SM.registerModerator(admin, 'admin');
  var player = uid();

  var ts1 = SM.applyTempSuspension(
    admin, player, 'tier1', 'First suspension',
    [{ type: 'chat_log', content: 'evidence text' }]
  );
  assert(ts1.ok, 'applyTempSuspension returns ok');
  assertNotNull(ts1.suspension, 'suspension object returned');
  assertEqual(ts1.suspension.playerId, player, 'suspension has correct playerId');
  assertEqual(ts1.suspension.type, 'temp', 'suspension type is temp');
  assertEqual(ts1.suspension.durationMs, SM.TEMP_SUSPEND_DURATIONS.tier1, 'tier1 duration correct');
  assertNotNull(ts1.suspension.endsAt, 'endsAt set');
  assertNotNull(ts1.suspension.appealBy, 'appealBy set');
  assert(ts1.suspension.active, 'suspension is active');
  assert(!ts1.suspension.lifted, 'suspension is not lifted initially');
  assertEqual(ts1.suspension.evidence.length, 1, 'evidence stored');

  // isSuspended
  assert(SM.isSuspended(player), 'player is suspended');

  // getSuspension
  var susp = SM.getSuspension(player);
  assertNotNull(susp, 'getSuspension returns object');
  assertEqual(susp.type, 'temp', 'getSuspension returns temp suspension');

  // canChat blocked by suspension
  var chatCheck = SM.canChat(player);
  assert(!chatCheck.allowed, 'canChat blocked when suspended');
  assertEqual(chatCheck.reason, 'suspended', 'reason is suspended');

  // liftSuspension
  var liftResult = SM.liftSuspension(admin, player, 'Overturned on review');
  assert(liftResult.ok, 'liftSuspension ok');
  assert(!SM.isSuspended(player), 'player no longer suspended after lift');

  // getAllSuspensions
  var allSusps = SM.getAllSuspensions();
  assertArray(allSusps, 'getAllSuspensions returns array');
  assert(allSusps.length >= 1, 'at least one suspension in registry');

  // --- Permanent suspension ---
  SM.reset();
  SM.registerModerator(admin, 'admin');
  var permPlayer = uid();
  var ps = SM.applyPermanentSuspension(
    admin, permPlayer, 'Severe harassment per §7.3',
    [{ type: 'server_log', content: 'server logs' }]
  );
  assert(ps.ok, 'applyPermanentSuspension ok');
  assertEqual(ps.suspension.type, 'permanent', 'suspension type is permanent');
  assertNull(ps.suspension.endsAt, 'permanent suspension has no endsAt');
  assertEqual(ps.suspension.durationMs, Infinity, 'permanent has Infinity durationMs');
  assert(SM.isSuspended(permPlayer), 'permanently suspended player is suspended');

  // Appeal window check
  assertNotNull(ps.suspension.appealBy, 'permanent suspension has appealBy date (§7.3)');
  var appealByDate = new Date(ps.suspension.appealBy).getTime();
  assert(appealByDate > Date.now(), 'appealBy is in the future');
  var sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  assert(Math.abs(appealByDate - Date.now() - sevenDaysMs) < 5000, 'appealBy is ~7 days from now (§7.3)');

  // liftSuspension on permanent
  var liftPerm = SM.liftSuspension(admin, permPlayer, 'Reversal');
  assert(liftPerm.ok, 'liftSuspension works on permanent suspension');
  assert(!SM.isSuspended(permPlayer), 'player no longer suspended');

  // Permission checks
  SM.reset();
  var seniorMod = uid();
  SM.registerModerator(seniorMod, 'senior_moderator');
  var target = uid();

  var seniorTemp = SM.applyTempSuspension(seniorMod, target, 'tier1', 'senior can temp suspend', []);
  assert(seniorTemp.ok, 'senior_moderator can temp suspend');

  var seniorPerm = SM.applyPermanentSuspension(seniorMod, target, 'senior tries perm suspend', []);
  assert(!seniorPerm.ok, 'senior_moderator cannot perm suspend');

  SM.reset();
  var basicMod = uid();
  SM.registerModerator(basicMod, 'moderator');
  var target2 = uid();
  var basicTemp = SM.applyTempSuspension(basicMod, target2, 'tier1', 'basic mod tries temp suspend', []);
  assert(!basicTemp.ok, 'basic mod cannot temp suspend');

  // Error cases
  SM.reset();
  SM.registerModerator(admin, 'admin');
  var errTarget = uid();
  var badTier = SM.applyTempSuspension(admin, errTarget, 'tier99', 'bad tier', []);
  assert(!badTier.ok, 'invalid tier rejected');

  var noRationale = SM.applyTempSuspension(admin, errTarget, 'tier1', '', []);
  assert(!noRationale.ok, 'empty rationale rejected for temp suspend');

  var permNoRationale = SM.applyPermanentSuspension(admin, errTarget, '', []);
  assert(!permNoRationale.ok, 'empty rationale rejected for perm suspend');

  var noEvidArray = SM.applyTempSuspension(admin, errTarget, 'tier1', 'rationale', 'not-array');
  assert(!noEvidArray.ok, 'non-array evidence rejected');

  var noPermLift = SM.liftSuspension(basicMod, errTarget);
  assert(!noPermLift.ok, 'basic mod cannot lift suspensions');

  var liftNone = SM.liftSuspension(admin, uid());
  assert(!liftNone.ok, 'lifting non-existent suspension fails');

  // Numeric tier
  SM.reset();
  SM.registerModerator(admin, 'admin');
  var numTarget = uid();
  var numSusp = SM.applyTempSuspension(admin, numTarget, 86400000, 'numeric 1-day suspension', []);
  assert(numSusp.ok, 'numeric duration temp suspension ok');
  assertEqual(numSusp.suspension.durationMs, 86400000, 'numeric duration stored correctly');

  // Log entries
  SM.reset();
  SM.registerModerator(admin, 'admin');
  var logPlayer = uid();
  SM.applyTempSuspension(admin, logPlayer, 'tier1', 'test', []);
  SM.liftSuspension(admin, logPlayer, 'test lift');
  assert(SM.getLogByAction('temp_suspend_applied').length >= 1, 'temp_suspend_applied in log');
  assert(SM.getLogByAction('temp_suspend_lifted').length >= 1, 'temp_suspend_lifted in log');
});

// ============================================================================
// SUITE 7: APPEAL SYSTEM (§7.3 — 7-day window)
// ============================================================================

suite('7. Appeal System', function() {
  SM.reset();
  var admin = uid();
  SM.registerModerator(admin, 'admin');
  var player = uid();

  // Player needs a suspension first
  SM.applyTempSuspension(admin, player, 'tier1', 'Test suspension', []);

  // fileAppeal
  var a1 = SM.fileAppeal({
    appellantId: player,
    groundsText: 'I was not spamming, those were legitimate messages',
    evidence:    [{ type: 'chat_log', content: 'my side of the story' }]
  });
  assert(a1.ok, 'fileAppeal returns ok');
  assertNotNull(a1.appeal, 'appeal object returned');
  assertEqual(a1.appeal.appellantId, player, 'appellantId matches');
  assertEqual(a1.appeal.status, 'pending', 'initial appeal status is pending');
  assertNotNull(a1.appeal.id, 'appeal has id');
  assertNotNull(a1.appeal.filedAt, 'appeal has filedAt');
  assertNotNull(a1.appeal.dueBy, 'appeal has dueBy (7-day window)');
  assertEqual(a1.appeal.evidence.length, 1, 'evidence stored in appeal');
  assertNull(a1.appeal.reviewedBy, 'reviewedBy initially null');
  assertNull(a1.appeal.reviewedAt, 'reviewedAt initially null');
  assertNull(a1.appeal.resolution, 'resolution initially null');

  // Duplicate appeal rejected
  var dup = SM.fileAppeal({
    appellantId: player,
    groundsText: 'Duplicate appeal',
    evidence:    []
  });
  assert(!dup.ok, 'duplicate active appeal rejected');

  // getAppeal
  var fetched = SM.getAppeal(a1.appeal.id);
  assertNotNull(fetched, 'getAppeal returns appeal');
  assertEqual(fetched.id, a1.appeal.id, 'fetched appeal ID matches');

  // getAppealsFor
  var playerAppeals = SM.getAppealsFor(player);
  assertArray(playerAppeals, 'getAppealsFor returns array');
  assertEqual(playerAppeals.length, 1, 'one appeal for player');

  // getPendingAppeals
  var pending = SM.getPendingAppeals();
  assertArray(pending, 'getPendingAppeals returns array');
  assertEqual(pending.length, 1, 'one pending appeal');

  // beginAppealReview
  var begin = SM.beginAppealReview(a1.appeal.id, admin);
  assert(begin.ok, 'beginAppealReview returns ok');
  assertEqual(begin.appeal.status, 'reviewing', 'status moved to reviewing');
  assertEqual(begin.appeal.reviewedBy, admin, 'reviewedBy set');

  // Cannot begin review of non-pending appeal
  var beginAgain = SM.beginAppealReview(a1.appeal.id, admin);
  assert(!beginAgain.ok, 'cannot begin review of non-pending appeal');

  // Still in pending appeals list (reviewing = still pending)
  assertEqual(SM.getPendingAppeals().length, 1, 'reviewing appeal still in pending list');

  // resolveAppeal — upheld (suspension kept)
  var resolveUp = SM.resolveAppeal(a1.appeal.id, admin, 'upheld', 'Evidence confirms violation');
  assert(resolveUp.ok, 'resolveAppeal upheld ok');
  assertEqual(resolveUp.appeal.status, 'upheld', 'appeal status is upheld');
  assertEqual(resolveUp.appeal.resolution, 'Evidence confirms violation', 'resolution stored');
  assertNotNull(resolveUp.appeal.reviewedAt, 'reviewedAt set on resolution');

  // Suspension remains active after upheld
  assert(SM.isSuspended(player), 'suspension still active after upheld appeal');

  // Cannot resolve already-resolved appeal
  var resolveAgain = SM.resolveAppeal(a1.appeal.id, admin, 'reversed', 'retry');
  assert(!resolveAgain.ok, 'cannot resolve already-resolved appeal');

  // --- Appeal reversed: suspension lifted ---
  SM.reset();
  SM.registerModerator(admin, 'admin');
  var player2 = uid();
  SM.applyTempSuspension(admin, player2, 'tier1', 'Test', []);
  var a2 = SM.fileAppeal({ appellantId: player2, groundsText: 'Wrongful suspension', evidence: [] });
  var beginR = SM.beginAppealReview(a2.appeal.id, admin);
  assert(beginR.ok, 'begin review ok');
  var resolveRev = SM.resolveAppeal(a2.appeal.id, admin, 'reversed', 'Insufficient evidence, suspension lifted');
  assert(resolveRev.ok, 'resolveAppeal reversed ok');
  assertEqual(resolveRev.appeal.status, 'reversed', 'appeal status is reversed');
  assert(!SM.isSuspended(player2), 'suspension lifted when appeal reversed');

  // Appeal with no suspension
  SM.reset();
  SM.registerModerator(admin, 'admin');
  var noSuspPlayer = uid();
  var noSuspAppeal = SM.fileAppeal({ appellantId: noSuspPlayer, groundsText: 'appeal', evidence: [] });
  assert(!noSuspAppeal.ok, 'cannot appeal without a suspension on record');

  // expireStaleAppeals
  SM.reset();
  SM.registerModerator(admin, 'admin');
  var stalePlayer = uid();
  SM.applyTempSuspension(admin, stalePlayer, 'tier1', 'test', []);
  var staleAppeal = SM.fileAppeal({ appellantId: stalePlayer, groundsText: 'stale', evidence: [] });
  // Manually set dueBy to past
  var fetAp = SM.getAppeal(staleAppeal.appeal.id);
  fetAp.dueBy = new Date(Date.now() - 1000).toISOString();
  var expCount = SM.expireStaleAppeals();
  assertEqual(expCount, 1, 'expireStaleAppeals returns count of expired appeals');
  var expiredAppeal = SM.getAppeal(staleAppeal.appeal.id);
  assertEqual(expiredAppeal.status, 'expired', 'expired appeal has status expired');

  // Error cases
  SM.reset();
  SM.registerModerator(admin, 'admin');
  var errPlayer = uid();
  SM.applyTempSuspension(admin, errPlayer, 'tier1', 'test', []);

  var noGrounds = SM.fileAppeal({ appellantId: errPlayer, groundsText: '', evidence: [] });
  assert(!noGrounds.ok, 'empty groundsText rejected');

  var noId = SM.fileAppeal({ groundsText: 'text', evidence: [] });
  assert(!noId.ok, 'missing appellantId rejected');

  var badEvid = SM.fileAppeal({ appellantId: errPlayer, groundsText: 'text', evidence: 'not-array' });
  assert(!badEvid.ok, 'non-array evidence rejected in appeal');

  var badOutcome = SM.resolveAppeal('nonexistent', admin, 'upheld', 'text');
  assert(!badOutcome.ok, 'resolving non-existent appeal fails');

  var badOutcomeVal = SM.resolveAppeal(SM.fileAppeal({ appellantId: errPlayer, groundsText: 'retry', evidence: [] }).appeal.id, admin, 'partial', 'text');
  // Note: above will fail because duplicate if appeal already open - skip exact check, just verify bad outcome
  // (errPlayer already has one appeal at this point, which may or may not be open)
  // Test specifically with a fresh player
  SM.reset();
  SM.registerModerator(admin, 'admin');
  var freshP = uid();
  SM.applyTempSuspension(admin, freshP, 'tier1', 'test', []);
  var freshA = SM.fileAppeal({ appellantId: freshP, groundsText: 'test', evidence: [] });
  var badOut = SM.resolveAppeal(freshA.appeal.id, admin, 'partial', 'text');
  assert(!badOut.ok, 'invalid outcome value rejected');

  // No permission to review
  SM.reset();
  var nonMod = uid();
  SM.registerModerator(admin, 'admin');
  var freshP2 = uid();
  SM.applyTempSuspension(admin, freshP2, 'tier1', 'test', []);
  var freshA2 = SM.fileAppeal({ appellantId: freshP2, groundsText: 'test', evidence: [] });
  var noPermReview = SM.beginAppealReview(freshA2.appeal.id, nonMod);
  assert(!noPermReview.ok, 'non-moderator cannot begin appeal review');

  var noPermResolve = SM.resolveAppeal(freshA2.appeal.id, nonMod, 'upheld', 'text');
  assert(!noPermResolve.ok, 'non-moderator cannot resolve appeal');

  // Log entries — resolve an appeal so appeal_resolved is logged, then check
  SM.beginAppealReview(freshA2.appeal.id, admin);
  SM.resolveAppeal(freshA2.appeal.id, admin, 'upheld', 'Final determination');
  assert(SM.getLogByAction('appeal_filed').length >= 1,    'appeal_filed in log');
  assert(SM.getLogByAction('appeal_resolved').length >= 1, 'appeal_resolved in log');
});

// ============================================================================
// SUITE 8: PUBLIC ACCOUNTABILITY LOG
// ============================================================================

suite('8. Public Accountability Log', function() {
  SM.reset();
  var admin = uid();
  SM.registerModerator(admin, 'admin');

  var p1 = uid(), p2 = uid();

  // File a report and issue a warning
  SM.fileReport({ reporterId: uid(), reportedId: p1, category: 'spam', description: 'spam', evidence: [] });
  SM.issueNextWarning(admin, p1, 'first warning');
  SM.applyMute(admin, p2, 'short', 'mute p2');

  // getAccountabilityLog
  var fullLog = SM.getAccountabilityLog();
  assertArray(fullLog, 'getAccountabilityLog returns array');
  assert(fullLog.length > 0, 'accountability log has entries');

  // Each entry has required fields
  var entry = fullLog[0];
  assert(typeof entry.id === 'number', 'log entry has numeric id');
  assertNotNull(entry.action, 'log entry has action');
  assertNotNull(entry.ts, 'log entry has timestamp');
  assertNotNull(entry.targetPlayer, 'log entry has targetPlayer');
  assertNotNull(entry.actorId, 'log entry has actorId');
  assert(typeof entry.details === 'object', 'log entry has details object');

  // Log is append-only (order preserved)
  for (var i = 1; i < fullLog.length; i++) {
    assert(fullLog[i].id > fullLog[i-1].id, 'log entries are in ascending ID order');
  }

  // getPlayerLog
  var p1Log = SM.getPlayerLog(p1);
  assertArray(p1Log, 'getPlayerLog returns array');
  assert(p1Log.length > 0, 'p1 has log entries');
  for (var j = 0; j < p1Log.length; j++) {
    assertEqual(p1Log[j].targetPlayer, p1, 'all p1 log entries target p1');
  }

  var p2Log = SM.getPlayerLog(p2);
  assert(p2Log.length > 0, 'p2 has log entries (mute)');

  // Empty log for player with no actions
  var noActionPlayer = uid();
  var noLog = SM.getPlayerLog(noActionPlayer);
  assertArray(noLog, 'getPlayerLog returns array for untouched player');
  assertEqual(noLog.length, 0, 'empty log for untouched player');

  // getLogByAction
  var warnings = SM.getLogByAction('verbal_warning_issued');
  assertArray(warnings, 'getLogByAction returns array');
  for (var k = 0; k < warnings.length; k++) {
    assertEqual(warnings[k].action, 'verbal_warning_issued', 'all entries match action filter');
  }

  // getLogByAction for non-existent action
  var nothing = SM.getLogByAction('nonexistent_action');
  assertArray(nothing, 'getLogByAction returns empty array for unknown action');
  assertEqual(nothing.length, 0, 'no entries for unknown action');

  // getRecentLog
  var recent5 = SM.getRecentLog(5);
  assertArray(recent5, 'getRecentLog returns array');
  assert(recent5.length <= 5, 'getRecentLog returns at most 5 entries');

  var recent1 = SM.getRecentLog(1);
  assertEqual(recent1.length, 1, 'getRecentLog(1) returns 1 entry');
  assertEqual(recent1[0].id, fullLog[fullLog.length - 1].id, 'getRecentLog(1) returns most recent');

  // getAccountabilityLog returns a copy
  var logCopy = SM.getAccountabilityLog();
  logCopy.push({ fake: true });
  assertEqual(SM.getAccountabilityLog().length, logCopy.length - 1, 'modifying copy does not affect original');

  // report_filed appears in log
  assert(SM.getLogByAction('report_filed').length >= 1, 'report_filed action in log');

  // mute_applied appears in log
  assert(SM.getLogByAction('mute_applied').length >= 1, 'mute_applied action in log');

  // verbal_warning_issued appears in log
  assert(SM.getLogByAction('verbal_warning_issued').length >= 1, 'verbal_warning_issued action in log');
});

// ============================================================================
// SUITE 9: RATE LIMITING
// ============================================================================

suite('9. Rate Limiting', function() {
  SM.reset();
  var player = uid();
  // Rate limit config: max 30 messages per 60s window, flood: 10 messages per 5s.
  // Use step=1900ms: 30 messages span 57s (within 60s window), and in any 5s
  // window at this pace only ~2-3 messages land (well under flood threshold of 10).
  var baseTime = 1700000000000;
  var normalStep = 1900; // ms between messages for normal rate-limit testing

  // First 30 messages should be allowed
  for (var i = 0; i < 30; i++) {
    var r = SM.recordMessage(player, baseTime + i * normalStep);
    assert(r.allowed, 'message ' + (i+1) + ' within limit is allowed');
  }

  // 31st message (still within the 60s window, at ~56.9s) should be rate limited
  // 30 * 1900 = 57000ms, which is < 60000ms so window has NOT reset
  var rl31 = SM.recordMessage(player, baseTime + 30 * normalStep - 500);
  assert(!rl31.allowed, '31st message is rate limited');
  assertEqual(rl31.reason, 'rate_limit', 'reason is rate_limit');
  assert(typeof rl31.resetIn === 'number', 'resetIn is a number');
  assert(rl31.resetIn > 0, 'resetIn > 0');

  // After window passes, messages allowed again
  var afterWindow = baseTime + SM.RATE_LIMIT_WINDOW_MS + 1000;
  var fresh = SM.recordMessage(player, afterWindow);
  assert(fresh.allowed, 'message allowed after window reset');

  // getRateLimitState
  var state = SM.getRateLimitState(player);
  assertNotNull(state, 'getRateLimitState returns state');
  assert(typeof state.count === 'number', 'state.count is number');
  assert(typeof state.floodCount === 'number', 'state.floodCount is number');

  // Unknown player state
  var unknownState = SM.getRateLimitState(uid());
  assertEqual(unknownState.count, 0, 'unknown player has count 0');
  assertNull(unknownState.windowStart, 'unknown player has null windowStart');

  // resetRateLimit
  SM.resetRateLimit(player);
  var afterReset = SM.getRateLimitState(player);
  assertEqual(afterReset.count, 0, 'count is 0 after resetRateLimit');

  // isRateLimited — fill up a separate player's window
  var p2 = uid();
  var p2Base = 5000000000000;
  for (var j = 0; j <= 30; j++) {
    SM.recordMessage(p2, p2Base + j * normalStep);
  }
  // Check rate limit is active within the window (30*1900 - 500 = 56500ms from start)
  assert(SM.isRateLimited(p2, p2Base + 30 * normalStep - 500), 'isRateLimited returns true when over limit');
  assert(!SM.isRateLimited(uid(), p2Base), 'isRateLimited returns false for fresh player');
  assert(!SM.isRateLimited(p2, p2Base + SM.RATE_LIMIT_WINDOW_MS + 1000), 'isRateLimited false after window expires');

  // Flood detection: send messages rapidly (>10 in 5 seconds)
  var p3 = uid();
  var floodBase = 2000000000000;
  var floodAllowed = 0;
  var floodBlocked = 0;
  // Send 12 messages 400ms apart (12 messages in 4.8 seconds — exceeds flood_max of 10)
  for (var k = 0; k < 12; k++) {
    var fr = SM.recordMessage(p3, floodBase + k * 400);
    if (fr.allowed) floodAllowed++;
    else floodBlocked++;
  }
  assert(floodBlocked > 0, 'flood detection triggered for rapid messages');

  // Flood log entry
  var floodLogs = SM.getLogByAction('flood_detected');
  assert(floodLogs.length > 0, 'flood_detected appears in accountability log');

  // Rate limit log entry — trigger it explicitly with normal step timing
  var p5 = uid();
  var p5Base = 6000000000000;
  for (var n = 0; n <= 31; n++) {
    SM.recordMessage(p5, p5Base + n * normalStep);
  }
  var rlLogs = SM.getLogByAction('rate_limit_triggered');
  assert(rlLogs.length > 0, 'rate_limit_triggered appears in accountability log');

  // flood reason
  var p4 = uid();
  var floodBase2 = 3000000000000;
  var floodRes = null;
  for (var m = 0; m <= SM.RATE_LIMIT_FLOOD_MAX; m++) {
    floodRes = SM.recordMessage(p4, floodBase2 + m * 400); // 400ms apart, 11 messages in 4s
  }
  if (floodRes && !floodRes.allowed) {
    assertEqual(floodRes.reason, 'flood', 'flood reason reported correctly');
  }
});

// ============================================================================
// SUITE 10: COMBINED HELPERS
// ============================================================================

suite('10. Combined Helpers', function() {
  SM.reset();
  var admin = uid();
  SM.registerModerator(admin, 'admin');
  var player = uid();

  // getPlayerStatus — clean player
  var status = SM.getPlayerStatus(player);
  assertNotNull(status, 'getPlayerStatus returns object');
  assertEqual(status.playerId, player, 'status has correct playerId');
  assert(!status.suspended, 'clean player not suspended');
  assert(!status.muted, 'clean player not muted');
  assert(!status.inCooldown, 'clean player not in cooldown');
  assertNull(status.currentStep, 'clean player has no current step');
  assertEqual(status.warnings, 0, 'clean player has 0 warnings');
  assertNull(status.suspension, 'clean player has no suspension');
  assertNull(status.mute, 'clean player has no mute');
  assert(status.canChat.allowed, 'clean player can chat');

  // getPlayerStatus — muted player
  SM.applyMute(admin, player, 'short', 'test mute');
  var mutedStatus = SM.getPlayerStatus(player);
  assert(mutedStatus.muted, 'muted player shows muted=true in status');
  assert(!mutedStatus.canChat.allowed, 'muted player cannot chat in status');

  // getPlayerStatus — suspended player
  SM.reset();
  SM.registerModerator(admin, 'admin');
  var suspPlayer = uid();
  SM.applyTempSuspension(admin, suspPlayer, 'tier1', 'test', []);
  var suspStatus = SM.getPlayerStatus(suspPlayer);
  assert(suspStatus.suspended, 'suspended player shows suspended=true in status');
  assertNotNull(suspStatus.suspension, 'suspended player has suspension object in status');
  assert(!suspStatus.canChat.allowed, 'suspended player cannot chat in status');

  // assessPlayer — clean
  SM.reset();
  var p2 = uid();
  var assess = SM.assessPlayer(p2);
  assertNotNull(assess, 'assessPlayer returns object');
  assert(!assess.needsAction, 'clean player does not need action');
  assertNull(assess.suggestedStep, 'clean player has no suggested step');
  assertEqual(assess.incidentCount, 0, 'clean player has 0 incidents');
  assertEqual(assess.openCount, 0, 'clean player has 0 open incidents');

  // assessPlayer — 1 open incident
  SM.fileReport({ reporterId: uid(), reportedId: p2, category: 'harassment', description: 'test', evidence: [] });
  var assess1 = SM.assessPlayer(p2);
  assert(assess1.needsAction, 'player with open incident needs action');
  assertEqual(assess1.suggestedStep, 'verbal_warning', '1 open incident suggests verbal_warning');

  // assessPlayer — 3 open incidents
  SM.fileReport({ reporterId: uid(), reportedId: p2, category: 'spam', description: 'test2', evidence: [] });
  SM.fileReport({ reporterId: uid(), reportedId: p2, category: 'grief', description: 'test3', evidence: [] });
  var assess3 = SM.assessPlayer(p2);
  assertEqual(assess3.openCount, 3, 'assess3 has 3 open incidents');
  assertEqual(assess3.suggestedStep, 'mute', '3 open incidents suggests mute');

  // assessPlayer — 5+ open incidents
  SM.fileReport({ reporterId: uid(), reportedId: p2, category: 'exploit', description: 'test4', evidence: [] });
  SM.fileReport({ reporterId: uid(), reportedId: p2, category: 'harassment', description: 'test5', evidence: [] });
  var assess5 = SM.assessPlayer(p2);
  assert(assess5.openCount >= 5, '5 open incidents counted');
  assertNotNull(assess5.suggestedStep, '5+ incidents has a suggested step');

  // canChat — multiple block conditions
  SM.reset();
  SM.registerModerator(admin, 'admin');
  var chatPlayer = uid();

  // Suspended blocks chat
  SM.applyTempSuspension(admin, chatPlayer, 'tier1', 'test', []);
  var chatSusp = SM.canChat(chatPlayer);
  assert(!chatSusp.allowed, 'suspended player cannot chat');
  assertEqual(chatSusp.reason, 'suspended', 'reason is suspended');

  // Muted blocks chat (after lifting suspension)
  SM.liftSuspension(admin, chatPlayer, 'lifting for mute test');
  SM.applyMute(admin, chatPlayer, 'short', 'test mute');
  var chatMuted = SM.canChat(chatPlayer);
  assert(!chatMuted.allowed, 'muted player cannot chat');
  assertEqual(chatMuted.reason, 'muted', 'reason is muted');

  // Clean player can chat
  var cleanPlayer = uid();
  var chatClean = SM.canChat(cleanPlayer);
  assert(chatClean.allowed, 'clean player can chat');
});

// ============================================================================
// SUITE 11: PRNG
// ============================================================================

suite('11. mulberry32 PRNG', function() {
  var prng1 = SM.mulberry32(42);
  var prng2 = SM.mulberry32(42);

  // Deterministic
  var vals1 = [], vals2 = [];
  for (var i = 0; i < 10; i++) {
    vals1.push(prng1());
    vals2.push(prng2());
  }
  for (var j = 0; j < 10; j++) {
    assertEqual(vals1[j], vals2[j], 'prng deterministic at step ' + j);
  }

  // Different seeds produce different sequences
  var prng3 = SM.mulberry32(99);
  var firstVal3 = prng3();
  var prng4 = SM.mulberry32(42);
  var firstVal4 = prng4();
  assert(firstVal3 !== firstVal4, 'different seeds produce different values');

  // Values are in [0, 1)
  var prng5 = SM.mulberry32(12345);
  for (var k = 0; k < 20; k++) {
    var v = prng5();
    assert(v >= 0 && v < 1, 'prng value ' + k + ' in [0,1)');
  }
});

// ============================================================================
// SUITE 12: FULL MODERATION WORKFLOW
// ============================================================================

suite('12. Full Moderation Workflow', function() {
  SM.reset();
  var admin = uid();
  SM.registerModerator(admin, 'admin');

  var offender = uid();
  var reporter1 = uid();
  var reporter2 = uid();

  // Step 1: Multiple reports filed
  var r1 = SM.fileReport({
    reporterId:  reporter1,
    reportedId:  offender,
    category:    'harassment',
    description: 'Kept sending repeated whispers after I declined',
    evidence:    [{ type: 'chat_log', content: 'whisper log 1' }]
  });
  var r2 = SM.fileReport({
    reporterId:  reporter2,
    reportedId:  offender,
    category:    'harassment',
    description: 'Same player following and harassing me',
    evidence:    [{ type: 'screenshot', content: 'screenshot_url' }]
  });

  assertEqual(SM.getIncidentsFor(offender).length, 2, 'two reports on record');

  // Step 2: Moderator reviews incident and issues verbal warning
  SM.reviewIncident(r1.incident.id, admin, 'Confirmed harassment pattern', 'reviewed');
  var w1 = SM.issueNextWarning(admin, offender, 'Please stop sending unwanted messages', r1.incident.id);
  assert(w1.ok, 'verbal warning issued after review');
  assertEqual(SM.getCurrentStep(offender), 'verbal_warning', 'offender at verbal_warning');

  // Step 3: Offender continues — written warning
  var r3 = SM.fileReport({
    reporterId:  reporter1,
    reportedId:  offender,
    category:    'harassment',
    description: 'Still doing it',
    evidence:    []
  });
  var w2 = SM.issueNextWarning(admin, offender, 'Written warning: continued harassment', r3.incident.id);
  assert(w2.ok, 'written warning issued');
  assertEqual(SM.getCurrentStep(offender), 'written_warning', 'offender at written_warning');

  // Step 4: Mute applied
  var muteResult = SM.applyMute(admin, offender, 'long', 'Muted per written warning escalation', r3.incident.id);
  assert(muteResult.ok, 'mute applied');
  assert(SM.isMuted(offender), 'offender is muted');

  // Step 5: Check canChat
  var chatCheck = SM.canChat(offender);
  assert(!chatCheck.allowed, 'offender cannot chat while muted');

  // Step 6: Mute lifted, cooldown in place
  SM.liftMute(admin, offender, r3.incident.id);
  assert(!SM.isMuted(offender), 'mute lifted');
  assert(SM.isInCooldown(offender), 'cooldown in effect after mute lifted');

  // Step 7: Continued violations → temp suspension
  var senior = uid();
  SM.registerModerator(senior, 'senior_moderator');
  var r4 = SM.fileReport({
    reporterId:  reporter2,
    reportedId:  offender,
    category:    'harassment',
    description: 'Fourth incident, continuing to harass',
    evidence:    [{ type: 'server_log', content: 'server log data' }]
  });
  var susp = SM.applyTempSuspension(
    senior, offender, 'tier2',
    'Pattern of repeated harassment per §7.3 — temp suspension',
    [{ type: 'server_log', content: 'evidence1' }],
    r4.incident.id
  );
  assert(susp.ok, 'temp suspension applied by senior mod');
  assert(SM.isSuspended(offender), 'offender is suspended');

  // Step 8: Offender files appeal
  var appeal = SM.fileAppeal({
    appellantId: offender,
    groundsText: 'I was defending myself from griefing, the reporters are biased',
    evidence:    [{ type: 'witness_statement', content: 'witness says...' }]
  });
  assert(appeal.ok, 'appeal filed successfully');
  assertEqual(SM.getPendingAppeals().length, 1, 'one pending appeal');

  // Step 9: Moderator reviews appeal
  var begin = SM.beginAppealReview(appeal.appeal.id, admin);
  assert(begin.ok, 'appeal review begun');

  // Step 10: Appeal upheld (suspension stands)
  var resolve = SM.resolveAppeal(appeal.appeal.id, admin, 'upheld', 'Multiple corroborating reports confirm harassment pattern');
  assert(resolve.ok, 'appeal resolved');
  assertEqual(resolve.appeal.status, 'upheld', 'appeal upheld');
  assert(SM.isSuspended(offender), 'suspension still active after upheld appeal');

  // Verify full accountability log has all action types
  var fullLog = SM.getAccountabilityLog();
  assert(fullLog.length >= 8, 'accountability log has all workflow actions (found ' + fullLog.length + ')');

  var actions = fullLog.map(function(e) { return e.action; });
  assert(actions.indexOf('report_filed') !== -1, 'report_filed in workflow log');
  assert(actions.indexOf('verbal_warning_issued') !== -1, 'verbal_warning in workflow log');
  assert(actions.indexOf('written_warning_issued') !== -1, 'written_warning in workflow log');
  assert(actions.indexOf('mute_applied') !== -1, 'mute_applied in workflow log');
  assert(actions.indexOf('mute_lifted') !== -1, 'mute_lifted in workflow log');
  assert(actions.indexOf('cooldown_applied') !== -1, 'cooldown_applied in workflow log');
  assert(actions.indexOf('temp_suspend_applied') !== -1, 'temp_suspend_applied in workflow log');
  assert(actions.indexOf('appeal_filed') !== -1, 'appeal_filed in workflow log');
  assert(actions.indexOf('appeal_reviewed') !== -1, 'appeal_reviewed in workflow log');
  assert(actions.indexOf('appeal_resolved') !== -1, 'appeal_resolved in workflow log');
});

// ============================================================================
// SUITE 13: EDGE CASES AND BOUNDARY CONDITIONS
// ============================================================================

suite('13. Edge Cases', function() {
  SM.reset();
  var admin = uid();
  SM.registerModerator(admin, 'admin');

  // reset() clears all state
  var p1 = uid();
  SM.issueNextWarning(admin, p1, 'test');
  SM.reset();
  // admin is no longer registered after reset
  SM.registerModerator(admin, 'admin');
  assertEqual(SM.getWarnings(p1).length, 0, 'warnings cleared after reset');
  assertNull(SM.getCurrentStep(p1), 'current step null after reset');
  assertEqual(SM.getAccountabilityLog().length, 0, 'accountability log cleared after reset');

  // getIncident for unknown ID
  assertNull(SM.getIncident('xyz_999'), 'null for unknown incident ID');

  // getAppeal for unknown ID
  assertNull(SM.getAppeal('xyz_999'), 'null for unknown appeal ID');

  // getSuspension for non-suspended player
  assertNull(SM.getSuspension(uid()), 'null for non-suspended player');

  // getMute for non-muted player
  assertNull(SM.getMute(uid()), 'null for non-muted player');

  // isInCooldown for fresh player
  assert(!SM.isInCooldown(uid()), 'false for fresh player cooldown check');

  // getCooldownRemaining for fresh player
  assertEqual(SM.getCooldownRemaining(uid()), 0, '0 remaining for fresh player');

  // isMuted for fresh player
  assert(!SM.isMuted(uid()), 'false for fresh player mute check');

  // isSuspended for fresh player
  assert(!SM.isSuspended(uid()), 'false for fresh player suspension check');

  // getIncidentsFor with no incidents
  var emptyIncidents = SM.getIncidentsFor(uid());
  assertArray(emptyIncidents, 'getIncidentsFor returns array for player with no incidents');
  assertEqual(emptyIncidents.length, 0, 'empty array for player with no incidents');

  // getWarnings returns copy
  SM.reset();
  SM.registerModerator(admin, 'admin');
  var copyPlayer = uid();
  SM.issueNextWarning(admin, copyPlayer, 'test');
  var copy1 = SM.getWarnings(copyPlayer);
  copy1.push({ fake: true });
  assertEqual(SM.getWarnings(copyPlayer).length, 1, 'getWarnings returns copy (modification does not affect store)');

  // getAllSuspensions returns array
  SM.reset();
  SM.registerModerator(admin, 'admin');
  var allSusps = SM.getAllSuspensions();
  assertArray(allSusps, 'getAllSuspensions returns array even when empty');
  assertEqual(allSusps.length, 0, 'empty when no suspensions');

  // getPendingAppeals empty
  var pending = SM.getPendingAppeals();
  assertArray(pending, 'getPendingAppeals returns array when empty');
  assertEqual(pending.length, 0, 'empty pending appeals list');

  // expireStaleAppeals with no stale appeals
  var expired = SM.expireStaleAppeals();
  assertEqual(expired, 0, 'expireStaleAppeals returns 0 with no stale appeals');

  // canChat for fresh (clean) player
  var freshCanChat = SM.canChat(uid());
  assert(freshCanChat.allowed, 'fresh player can always chat');

  // Multiple moderator registrations (overwrite)
  SM.reset();
  var modId = uid();
  SM.registerModerator(modId, 'moderator');
  assert(!SM.hasPermission(modId, 'canSuspendTemp'), 'basic mod cannot temp suspend initially');
  SM.registerModerator(modId, 'admin');  // promote
  assert(SM.hasPermission(modId, 'canSuspendTemp'), 'promoted to admin can temp suspend');

  // fileReport with evidence array is stored as separate copy
  SM.reset();
  SM.registerModerator(admin, 'admin');
  var ev = [{ type: 'chat_log', content: 'original' }];
  var repResult = SM.fileReport({ reporterId: uid(), reportedId: uid(), category: 'spam', description: 'test', evidence: ev });
  ev.push({ type: 'screenshot', content: 'added after' });
  assertEqual(repResult.incident.evidence.length, 1, 'evidence stored as copy (not reference)');

  // Suspension liftedBy and liftedAt set correctly
  SM.reset();
  SM.registerModerator(admin, 'admin');
  var liftPlayer = uid();
  SM.applyTempSuspension(admin, liftPlayer, 'tier1', 'test', []);
  SM.liftSuspension(admin, liftPlayer, 'early lift reason');
  var liftedSusp = SM.getSuspension(liftPlayer);
  assertNotNull(liftedSusp, 'suspension record persists after lift');
  assertEqual(liftedSusp.liftedBy, admin, 'liftedBy set after lift');
  assertNotNull(liftedSusp.liftedAt, 'liftedAt set after lift');
  assertEqual(liftedSusp.liftReason, 'early lift reason', 'liftReason stored');
  assert(liftedSusp.lifted, 'lifted flag set to true');
  assert(!liftedSusp.active, 'active flag set to false');

  // Cannot lift suspension twice
  var doubleLift = SM.liftSuspension(admin, liftPlayer, 'try again');
  assert(!doubleLift.ok, 'cannot lift an already-lifted suspension');

  // Rate limit state for fresh player
  var rlState = SM.getRateLimitState(uid());
  assertEqual(rlState.count, 0, 'fresh player rate limit count is 0');
  assertEqual(rlState.floodCount, 0, 'fresh player flood count is 0');

  // Accountability log IDs are monotonically increasing
  SM.reset();
  SM.registerModerator(admin, 'admin');
  var logP = uid();
  SM.fileReport({ reporterId: uid(), reportedId: logP, category: 'spam', description: 'test1', evidence: [] });
  SM.fileReport({ reporterId: uid(), reportedId: logP, category: 'spam', description: 'test2', evidence: [] });
  SM.issueNextWarning(admin, logP, 'warning1');
  var monLog = SM.getAccountabilityLog();
  for (var mi = 1; mi < monLog.length; mi++) {
    assert(monLog[mi].id > monLog[mi-1].id, 'log ID ' + monLog[mi].id + ' > ' + monLog[mi-1].id);
  }
});

// ============================================================================
// FINAL RESULTS
// ============================================================================

console.log('\n========================================');
console.log(passed + ' passed, ' + failed + ' failed');
console.log('========================================');

if (failures.length > 0) {
  console.log('\nFailures:');
  failures.forEach(function(f) { console.log('  ' + f); });
}

if (failed > 0) process.exit(1);
