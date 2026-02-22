/**
 * ZION MMO - Safety Moderation Module
 *
 * Community safety engine per Constitution §7.3.
 * Harassment tracking, warning ladder, suspension registry with evidence,
 * 7-day appeal window, public accountability log, rate limiting.
 *
 * Window name: SafetyModeration
 */

(function(exports) {
  'use strict';

  // ============================================================================
  // DEPENDENCY GUARDS
  // ============================================================================

  var Protocol    = (typeof window !== 'undefined' && window.Protocol)      || {};
  var Social      = (typeof window !== 'undefined' && window.Social)        || {};
  var Profiles    = (typeof window !== 'undefined' && window.Profiles)      || {};
  var Notifications = (typeof window !== 'undefined' && window.Notifications) || {};

  // ============================================================================
  // SEEDED PRNG — mulberry32
  // ============================================================================

  function mulberry32(seed) {
    var s = seed >>> 0;
    return function() {
      s += 0x6D2B79F5;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ============================================================================
  // CONSTANTS
  // ============================================================================

  // Warning ladder steps (in order of severity)
  var LADDER_STEPS = [
    'verbal_warning',
    'written_warning',
    'mute',
    'temp_suspend',
    'permanent_suspend'
  ];

  // Incident categories per §7.3
  var INCIDENT_CATEGORIES = [
    'harassment',
    'spam',
    'exploit',
    'grief'
  ];

  // Moderator roles and their permissions
  var MODERATOR_ROLES = {
    moderator: {
      canWarn: true,
      canMute: true,
      canSuspendTemp: false,
      canSuspendPerm: false,
      canReviewAppeals: true,
      canViewPrivateLogs: true
    },
    senior_moderator: {
      canWarn: true,
      canMute: true,
      canSuspendTemp: true,
      canSuspendPerm: false,
      canReviewAppeals: true,
      canViewPrivateLogs: true
    },
    admin: {
      canWarn: true,
      canMute: true,
      canSuspendTemp: true,
      canSuspendPerm: true,
      canReviewAppeals: true,
      canViewPrivateLogs: true
    }
  };

  // Suspension durations in milliseconds
  var TEMP_SUSPEND_DURATIONS = {
    tier1: 24 * 60 * 60 * 1000,       // 1 day
    tier2: 3 * 24 * 60 * 60 * 1000,   // 3 days
    tier3: 7 * 24 * 60 * 60 * 1000,   // 7 days
    tier4: 30 * 24 * 60 * 60 * 1000   // 30 days
  };

  // Rate limiting config
  var RATE_LIMIT_WINDOW_MS    = 60 * 1000;  // 1 minute window
  var RATE_LIMIT_MAX_MESSAGES = 30;          // max messages per window
  var RATE_LIMIT_FLOOD_MAX    = 10;          // flood threshold (10 in 5 sec)
  var RATE_LIMIT_FLOOD_WINDOW = 5 * 1000;   // 5 second flood window

  // Appeal window per §7.3
  var APPEAL_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  // Mute durations
  var MUTE_DURATIONS = {
    short:   5  * 60 * 1000,   // 5 minutes
    medium:  30 * 60 * 1000,   // 30 minutes
    long:    60 * 60 * 1000,   // 1 hour
    day:     24 * 60 * 60 * 1000,
    permanent: Infinity
  };

  // Post-mute cooldown
  var POST_MUTE_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes cooldown after mute expires

  // Evidence types
  var EVIDENCE_TYPES = [
    'chat_log',
    'screenshot',
    'protocol_message',
    'witness_statement',
    'server_log',
    'other'
  ];

  // Appeal status values
  var APPEAL_STATUS = {
    pending:  'pending',
    reviewing: 'reviewing',
    upheld:   'upheld',    // suspension upheld, appeal denied
    reversed: 'reversed',  // suspension reversed, appeal granted
    expired:  'expired'    // appeal window closed without resolution
  };

  // Action types for accountability log
  var LOG_ACTIONS = [
    'report_filed',
    'verbal_warning_issued',
    'written_warning_issued',
    'mute_applied',
    'mute_lifted',
    'temp_suspend_applied',
    'temp_suspend_lifted',
    'permanent_suspend_applied',
    'appeal_filed',
    'appeal_reviewed',
    'appeal_resolved',
    'cooldown_applied',
    'rate_limit_triggered',
    'flood_detected'
  ];

  // ============================================================================
  // STATE STORES
  // ============================================================================

  var incidentStore     = {};  // incidentId -> incident object
  var warningStore      = {};  // playerId   -> array of warnings
  var muteStore         = {};  // playerId   -> mute object
  var suspensionStore   = {};  // playerId   -> suspension object
  var appealStore       = {};  // appealId   -> appeal object
  var accountabilityLog = [];  // array of log entries (ordered, append-only)
  var moderatorStore    = {};  // playerId   -> role string
  var rateLimitStore    = {};  // playerId   -> { count, windowStart, floodCount, floodStart }
  var cooldownStore     = {};  // playerId   -> { until: timestamp }

  // Monotonic counters for IDs
  var incidentCounter   = 0;
  var appealCounter     = 0;
  var logCounter        = 0;

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Generate a deterministic ID using mulberry32 seeded from counter + timestamp.
   * Falls back to Math.random() when called without a seed.
   */
  function generateId(prefix, counter) {
    var prng = mulberry32(counter + Date.now());
    var rand = Math.floor(prng() * 0xFFFFFF).toString(16).padStart ?
               Math.floor(prng() * 0xFFFFFF).toString(16) :
               Math.floor(prng() * 0xFFFFFF).toString(16);
    return prefix + '_' + counter + '_' + rand;
  }

  function nowMs() {
    return Date.now();
  }

  function isValidCategory(cat) {
    return INCIDENT_CATEGORIES.indexOf(cat) !== -1;
  }

  function isValidEvidenceType(type) {
    return EVIDENCE_TYPES.indexOf(type) !== -1;
  }

  function isValidLadderStep(step) {
    return LADDER_STEPS.indexOf(step) !== -1;
  }

  function getPlayerWarnings(playerId) {
    return warningStore[playerId] || [];
  }

  function getCurrentLadderPosition(playerId) {
    var warnings = getPlayerWarnings(playerId);
    if (warnings.length === 0) return -1;
    // Return highest severity position
    var maxPos = -1;
    for (var i = 0; i < warnings.length; i++) {
      var pos = LADDER_STEPS.indexOf(warnings[i].step);
      if (pos > maxPos) maxPos = pos;
    }
    return maxPos;
  }

  function getNextLadderStep(playerId) {
    var current = getCurrentLadderPosition(playerId);
    var next = current + 1;
    if (next >= LADDER_STEPS.length) return null; // already at top
    return LADDER_STEPS[next];
  }

  /**
   * Append entry to the public accountability log.
   */
  function appendLog(action, targetPlayer, actorId, details) {
    var entry = {
      id:           ++logCounter,
      action:       action,
      targetPlayer: targetPlayer,
      actorId:      actorId,
      details:      details || {},
      ts:           new Date().toISOString()
    };
    accountabilityLog.push(entry);
    return entry;
  }

  // ============================================================================
  // MODULE INIT / RESET
  // ============================================================================

  /**
   * Reset all state (used in tests and on world reset).
   */
  function reset() {
    incidentStore     = {};
    warningStore      = {};
    muteStore         = {};
    suspensionStore   = {};
    appealStore       = {};
    accountabilityLog = [];
    moderatorStore    = {};
    rateLimitStore    = {};
    cooldownStore     = {};
    incidentCounter   = 0;
    appealCounter     = 0;
    logCounter        = 0;
  }

  // ============================================================================
  // MODERATOR MANAGEMENT
  // ============================================================================

  /**
   * Register a player as a moderator.
   * @param {string} playerId
   * @param {string} role - 'moderator' | 'senior_moderator' | 'admin'
   * @returns {{ ok: boolean, error?: string }}
   */
  function registerModerator(playerId, role) {
    if (!playerId || typeof playerId !== 'string') {
      return { ok: false, error: 'Invalid player ID' };
    }
    if (!MODERATOR_ROLES[role]) {
      return { ok: false, error: 'Unknown moderator role: ' + role };
    }
    moderatorStore[playerId] = role;
    return { ok: true, role: role };
  }

  /**
   * Remove a moderator.
   * @param {string} playerId
   * @returns {{ ok: boolean }}
   */
  function removeModerator(playerId) {
    delete moderatorStore[playerId];
    return { ok: true };
  }

  /**
   * Check if a player is a moderator.
   * @param {string} playerId
   * @returns {boolean}
   */
  function isModerator(playerId) {
    return !!moderatorStore[playerId];
  }

  /**
   * Get moderator permissions for a player.
   * @param {string} playerId
   * @returns {Object|null} permissions object or null if not a moderator
   */
  function getModeratorPermissions(playerId) {
    var role = moderatorStore[playerId];
    if (!role) return null;
    return MODERATOR_ROLES[role];
  }

  /**
   * Check whether a moderator has a specific permission.
   * @param {string} moderatorId
   * @param {string} permission - e.g. 'canMute'
   * @returns {boolean}
   */
  function hasPermission(moderatorId, permission) {
    var perms = getModeratorPermissions(moderatorId);
    if (!perms) return false;
    return !!perms[permission];
  }

  // ============================================================================
  // INCIDENT REPORTS
  // ============================================================================

  /**
   * File an incident report.
   * @param {Object} opts
   * @param {string} opts.reporterId   - Player filing the report
   * @param {string} opts.reportedId   - Player being reported
   * @param {string} opts.category     - harassment|spam|exploit|grief
   * @param {string} opts.description  - Narrative description
   * @param {Array}  opts.evidence     - Array of { type, content } objects
   * @returns {{ ok: boolean, incident?: Object, error?: string }}
   */
  function fileReport(opts) {
    if (!opts || typeof opts !== 'object') {
      return { ok: false, error: 'Invalid options' };
    }
    var reporterId  = opts.reporterId;
    var reportedId  = opts.reportedId;
    var category    = opts.category;
    var description = opts.description;
    var evidence    = opts.evidence || [];

    if (!reporterId || typeof reporterId !== 'string') {
      return { ok: false, error: 'reporterId required' };
    }
    if (!reportedId || typeof reportedId !== 'string') {
      return { ok: false, error: 'reportedId required' };
    }
    if (reporterId === reportedId) {
      return { ok: false, error: 'Cannot report yourself' };
    }
    if (!isValidCategory(category)) {
      return { ok: false, error: 'Invalid category: ' + category };
    }
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return { ok: false, error: 'Description required' };
    }
    if (!Array.isArray(evidence)) {
      return { ok: false, error: 'evidence must be an array' };
    }

    // Validate each evidence item
    for (var e = 0; e < evidence.length; e++) {
      if (!evidence[e] || !isValidEvidenceType(evidence[e].type)) {
        return { ok: false, error: 'Invalid evidence type at index ' + e };
      }
    }

    var id = generateId('inc', ++incidentCounter);
    var incident = {
      id:          id,
      reporterId:  reporterId,
      reportedId:  reportedId,
      category:    category,
      description: description.trim(),
      evidence:    evidence.slice(),
      status:      'open',     // open | reviewed | closed
      resolution:  null,
      ts:          new Date().toISOString(),
      reviewedBy:  null,
      reviewedAt:  null
    };

    incidentStore[id] = incident;
    appendLog('report_filed', reportedId, reporterId, {
      incidentId: id,
      category:   category
    });

    return { ok: true, incident: incident };
  }

  /**
   * Get an incident by ID.
   * @param {string} incidentId
   * @returns {Object|null}
   */
  function getIncident(incidentId) {
    return incidentStore[incidentId] || null;
  }

  /**
   * List all incidents for a reported player.
   * @param {string} playerId
   * @returns {Array}
   */
  function getIncidentsFor(playerId) {
    var results = [];
    var keys = Object.keys(incidentStore);
    for (var i = 0; i < keys.length; i++) {
      if (incidentStore[keys[i]].reportedId === playerId) {
        results.push(incidentStore[keys[i]]);
      }
    }
    return results;
  }

  /**
   * List all incidents filed by a reporter.
   * @param {string} reporterId
   * @returns {Array}
   */
  function getIncidentsByReporter(reporterId) {
    var results = [];
    var keys = Object.keys(incidentStore);
    for (var i = 0; i < keys.length; i++) {
      if (incidentStore[keys[i]].reporterId === reporterId) {
        results.push(incidentStore[keys[i]]);
      }
    }
    return results;
  }

  /**
   * Review an incident (mark as reviewed/closed with resolution).
   * @param {string} incidentId
   * @param {string} moderatorId
   * @param {string} resolution - text resolution
   * @param {string} newStatus  - 'reviewed' | 'closed'
   * @returns {{ ok: boolean, incident?: Object, error?: string }}
   */
  function reviewIncident(incidentId, moderatorId, resolution, newStatus) {
    if (!isModerator(moderatorId)) {
      return { ok: false, error: 'Not a moderator' };
    }
    var incident = incidentStore[incidentId];
    if (!incident) {
      return { ok: false, error: 'Incident not found' };
    }
    if (newStatus !== 'reviewed' && newStatus !== 'closed') {
      return { ok: false, error: 'Invalid status: ' + newStatus };
    }
    incident.status     = newStatus;
    incident.resolution = resolution;
    incident.reviewedBy = moderatorId;
    incident.reviewedAt = new Date().toISOString();
    return { ok: true, incident: incident };
  }

  // ============================================================================
  // WARNING LADDER
  // ============================================================================

  /**
   * Issue the next step on the warning ladder to a player.
   * Automatically determines which step comes next.
   * @param {string} moderatorId
   * @param {string} targetId
   * @param {string} reason
   * @param {string} [incidentId] - optional linked incident
   * @returns {{ ok: boolean, warning?: Object, error?: string }}
   */
  function issueNextWarning(moderatorId, targetId, reason, incidentId) {
    if (!isModerator(moderatorId)) {
      return { ok: false, error: 'Not a moderator' };
    }
    var nextStep = getNextLadderStep(targetId);
    if (nextStep === null) {
      return { ok: false, error: 'Player is already at maximum sanction (permanent_suspend)' };
    }
    return issueSpecificWarning(moderatorId, targetId, nextStep, reason, incidentId);
  }

  /**
   * Issue a specific ladder step to a player.
   * Moderator permissions are checked against the step.
   * @param {string} moderatorId
   * @param {string} targetId
   * @param {string} step        - LADDER_STEPS value
   * @param {string} reason
   * @param {string} [incidentId]
   * @returns {{ ok: boolean, warning?: Object, error?: string }}
   */
  function issueSpecificWarning(moderatorId, targetId, step, reason, incidentId) {
    if (!isModerator(moderatorId)) {
      return { ok: false, error: 'Not a moderator' };
    }
    if (!isValidLadderStep(step)) {
      return { ok: false, error: 'Invalid ladder step: ' + step };
    }
    if (!targetId || typeof targetId !== 'string') {
      return { ok: false, error: 'Invalid target player ID' };
    }
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return { ok: false, error: 'Reason required' };
    }

    // Permission checks per step
    if ((step === 'temp_suspend') && !hasPermission(moderatorId, 'canSuspendTemp')) {
      return { ok: false, error: 'Insufficient permissions for temp_suspend' };
    }
    if ((step === 'permanent_suspend') && !hasPermission(moderatorId, 'canSuspendPerm')) {
      return { ok: false, error: 'Insufficient permissions for permanent_suspend' };
    }
    if ((step === 'mute') && !hasPermission(moderatorId, 'canMute')) {
      return { ok: false, error: 'Insufficient permissions for mute' };
    }
    if ((step === 'verbal_warning' || step === 'written_warning') && !hasPermission(moderatorId, 'canWarn')) {
      return { ok: false, error: 'Insufficient permissions for warning' };
    }

    var warning = {
      id:          generateId('warn', (warningStore[targetId] || []).length + 1),
      moderatorId: moderatorId,
      targetId:    targetId,
      step:        step,
      reason:      reason.trim(),
      incidentId:  incidentId || null,
      ts:          new Date().toISOString()
    };

    if (!warningStore[targetId]) warningStore[targetId] = [];
    warningStore[targetId].push(warning);

    var logAction = step + '_issued';
    if (step === 'verbal_warning')   logAction = 'verbal_warning_issued';
    if (step === 'written_warning')  logAction = 'written_warning_issued';
    if (step === 'mute')             logAction = 'mute_applied';
    if (step === 'temp_suspend')     logAction = 'temp_suspend_applied';
    if (step === 'permanent_suspend') logAction = 'permanent_suspend_applied';

    appendLog(logAction, targetId, moderatorId, {
      warningId:  warning.id,
      step:       step,
      reason:     reason.trim(),
      incidentId: incidentId || null
    });

    return { ok: true, warning: warning };
  }

  /**
   * Get warning history for a player.
   * @param {string} playerId
   * @returns {Array}
   */
  function getWarnings(playerId) {
    return (warningStore[playerId] || []).slice();
  }

  /**
   * Get the current ladder position label for a player.
   * @param {string} playerId
   * @returns {string|null} current step or null if no warnings
   */
  function getCurrentStep(playerId) {
    var pos = getCurrentLadderPosition(playerId);
    if (pos < 0) return null;
    return LADDER_STEPS[pos];
  }

  // ============================================================================
  // MUTE SYSTEM
  // ============================================================================

  /**
   * Apply a mute to a player.
   * @param {string} moderatorId
   * @param {string} targetId
   * @param {string} duration   - 'short'|'medium'|'long'|'day'|'permanent' or ms number
   * @param {string} reason
   * @param {string} [incidentId]
   * @returns {{ ok: boolean, mute?: Object, error?: string }}
   */
  function applyMute(moderatorId, targetId, duration, reason, incidentId) {
    if (!hasPermission(moderatorId, 'canMute')) {
      return { ok: false, error: 'Insufficient permissions for mute' };
    }
    if (!targetId || typeof targetId !== 'string') {
      return { ok: false, error: 'Invalid target player ID' };
    }
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return { ok: false, error: 'Reason required' };
    }

    var durationMs;
    if (typeof duration === 'number' && duration > 0) {
      durationMs = duration;
    } else if (typeof duration === 'string' && MUTE_DURATIONS[duration] !== undefined) {
      durationMs = MUTE_DURATIONS[duration];
    } else {
      return { ok: false, error: 'Invalid duration: ' + duration };
    }

    var startTs = nowMs();
    var endsAt  = durationMs === Infinity ? null : startTs + durationMs;

    var mute = {
      playerId:    targetId,
      moderatorId: moderatorId,
      durationMs:  durationMs,
      permanent:   durationMs === Infinity,
      startedAt:   new Date(startTs).toISOString(),
      endsAt:      endsAt ? new Date(endsAt).toISOString() : null,
      reason:      reason.trim(),
      incidentId:  incidentId || null,
      active:      true
    };

    muteStore[targetId] = mute;
    appendLog('mute_applied', targetId, moderatorId, {
      duration:   duration,
      permanent:  mute.permanent,
      reason:     reason.trim(),
      incidentId: incidentId || null
    });

    return { ok: true, mute: mute };
  }

  /**
   * Lift a mute manually.
   * @param {string} moderatorId
   * @param {string} targetId
   * @returns {{ ok: boolean, error?: string }}
   */
  function liftMute(moderatorId, targetId) {
    if (!hasPermission(moderatorId, 'canMute')) {
      return { ok: false, error: 'Insufficient permissions' };
    }
    var mute = muteStore[targetId];
    if (!mute) {
      return { ok: false, error: 'Player is not muted' };
    }
    mute.active = false;

    // Apply post-mute cooldown
    cooldownStore[targetId] = { until: nowMs() + POST_MUTE_COOLDOWN_MS };

    appendLog('mute_lifted', targetId, moderatorId, {});
    appendLog('cooldown_applied', targetId, moderatorId, {
      cooldownMs: POST_MUTE_COOLDOWN_MS
    });

    delete muteStore[targetId];
    return { ok: true };
  }

  /**
   * Check if a player is currently muted.
   * Auto-expires time-limited mutes.
   * @param {string} playerId
   * @returns {boolean}
   */
  function isMuted(playerId) {
    var mute = muteStore[playerId];
    if (!mute || !mute.active) return false;
    if (mute.permanent) return true;

    // Check expiry
    var endsAt = new Date(mute.endsAt).getTime();
    if (nowMs() >= endsAt) {
      // Auto-expire: apply cooldown
      mute.active = false;
      cooldownStore[playerId] = { until: nowMs() + POST_MUTE_COOLDOWN_MS };
      appendLog('mute_lifted', playerId, 'system', { reason: 'expired' });
      appendLog('cooldown_applied', playerId, 'system', { cooldownMs: POST_MUTE_COOLDOWN_MS });
      delete muteStore[playerId];
      return false;
    }
    return true;
  }

  /**
   * Get mute details for a player.
   * @param {string} playerId
   * @returns {Object|null}
   */
  function getMute(playerId) {
    return muteStore[playerId] || null;
  }

  /**
   * Check if a player is in post-mute cooldown.
   * @param {string} playerId
   * @returns {boolean}
   */
  function isInCooldown(playerId) {
    var cd = cooldownStore[playerId];
    if (!cd) return false;
    if (nowMs() >= cd.until) {
      delete cooldownStore[playerId];
      return false;
    }
    return true;
  }

  /**
   * Get remaining cooldown milliseconds (0 if not in cooldown).
   * @param {string} playerId
   * @returns {number}
   */
  function getCooldownRemaining(playerId) {
    var cd = cooldownStore[playerId];
    if (!cd) return 0;
    var remaining = cd.until - nowMs();
    if (remaining <= 0) {
      delete cooldownStore[playerId];
      return 0;
    }
    return remaining;
  }

  /**
   * Check if a player can send a chat message (not muted, not on cooldown).
   * @param {string} playerId
   * @returns {{ allowed: boolean, reason?: string }}
   */
  function canChat(playerId) {
    if (isSuspended(playerId)) {
      return { allowed: false, reason: 'suspended' };
    }
    if (isMuted(playerId)) {
      return { allowed: false, reason: 'muted' };
    }
    if (isInCooldown(playerId)) {
      var remaining = getCooldownRemaining(playerId);
      return { allowed: false, reason: 'cooldown', remainingMs: remaining };
    }
    return { allowed: true };
  }

  // ============================================================================
  // SUSPENSION REGISTRY
  // ============================================================================

  /**
   * Apply a temporary suspension.
   * @param {string} moderatorId
   * @param {string} targetId
   * @param {string} tier        - 'tier1'|'tier2'|'tier3'|'tier4' or custom ms number
   * @param {string} rationale
   * @param {Array}  evidence    - array of { type, content } objects
   * @param {string} [incidentId]
   * @returns {{ ok: boolean, suspension?: Object, error?: string }}
   */
  function applyTempSuspension(moderatorId, targetId, tier, rationale, evidence, incidentId) {
    if (!hasPermission(moderatorId, 'canSuspendTemp')) {
      return { ok: false, error: 'Insufficient permissions for temp suspension' };
    }
    if (!targetId || typeof targetId !== 'string') {
      return { ok: false, error: 'Invalid target player ID' };
    }
    if (!rationale || typeof rationale !== 'string' || rationale.trim().length === 0) {
      return { ok: false, error: 'Rationale required' };
    }
    if (!Array.isArray(evidence)) {
      return { ok: false, error: 'evidence must be an array' };
    }

    var durationMs;
    if (typeof tier === 'number' && tier > 0) {
      durationMs = tier;
    } else if (TEMP_SUSPEND_DURATIONS[tier] !== undefined) {
      durationMs = TEMP_SUSPEND_DURATIONS[tier];
    } else {
      return { ok: false, error: 'Invalid tier: ' + tier };
    }

    var startTs  = nowMs();
    var endsAt   = startTs + durationMs;
    var appealBy = startTs + APPEAL_WINDOW_MS;

    var suspension = {
      playerId:    targetId,
      moderatorId: moderatorId,
      type:        'temp',
      durationMs:  durationMs,
      startedAt:   new Date(startTs).toISOString(),
      endsAt:      new Date(endsAt).toISOString(),
      appealBy:    new Date(appealBy).toISOString(),
      rationale:   rationale.trim(),
      evidence:    evidence.slice(),
      incidentId:  incidentId || null,
      active:      true,
      lifted:      false
    };

    suspensionStore[targetId] = suspension;
    appendLog('temp_suspend_applied', targetId, moderatorId, {
      tier:       tier,
      durationMs: durationMs,
      rationale:  rationale.trim(),
      incidentId: incidentId || null
    });

    return { ok: true, suspension: suspension };
  }

  /**
   * Apply a permanent suspension (per §7.3 — documented with evidence).
   * @param {string} moderatorId
   * @param {string} targetId
   * @param {string} rationale
   * @param {Array}  evidence
   * @param {string} [incidentId]
   * @returns {{ ok: boolean, suspension?: Object, error?: string }}
   */
  function applyPermanentSuspension(moderatorId, targetId, rationale, evidence, incidentId) {
    if (!hasPermission(moderatorId, 'canSuspendPerm')) {
      return { ok: false, error: 'Insufficient permissions for permanent suspension' };
    }
    if (!targetId || typeof targetId !== 'string') {
      return { ok: false, error: 'Invalid target player ID' };
    }
    if (!rationale || typeof rationale !== 'string' || rationale.trim().length === 0) {
      return { ok: false, error: 'Rationale required' };
    }
    if (!Array.isArray(evidence)) {
      return { ok: false, error: 'evidence must be an array' };
    }

    var startTs  = nowMs();
    var appealBy = startTs + APPEAL_WINDOW_MS;

    var suspension = {
      playerId:    targetId,
      moderatorId: moderatorId,
      type:        'permanent',
      durationMs:  Infinity,
      startedAt:   new Date(startTs).toISOString(),
      endsAt:      null,
      appealBy:    new Date(appealBy).toISOString(),
      rationale:   rationale.trim(),
      evidence:    evidence.slice(),
      incidentId:  incidentId || null,
      active:      true,
      lifted:      false
    };

    suspensionStore[targetId] = suspension;
    appendLog('permanent_suspend_applied', targetId, moderatorId, {
      rationale:  rationale.trim(),
      incidentId: incidentId || null
    });

    return { ok: true, suspension: suspension };
  }

  /**
   * Lift a suspension manually.
   * @param {string} moderatorId
   * @param {string} targetId
   * @param {string} [reason]
   * @returns {{ ok: boolean, error?: string }}
   */
  function liftSuspension(moderatorId, targetId, reason) {
    if (!hasPermission(moderatorId, 'canSuspendTemp') && !hasPermission(moderatorId, 'canSuspendPerm')) {
      return { ok: false, error: 'Insufficient permissions' };
    }
    var suspension = suspensionStore[targetId];
    if (!suspension) {
      return { ok: false, error: 'No active suspension for player' };
    }
    if (!suspension.active) {
      return { ok: false, error: 'Suspension is not active' };
    }
    suspension.active = false;
    suspension.lifted = true;
    suspension.liftedBy = moderatorId;
    suspension.liftedAt = new Date().toISOString();
    suspension.liftReason = reason || '';

    var logAction = suspension.type === 'permanent' ? 'permanent_suspend_lifted' : 'temp_suspend_lifted';
    appendLog(logAction, targetId, moderatorId, { reason: reason || '' });

    return { ok: true };
  }

  /**
   * Check if a player is currently suspended.
   * Auto-expires temp suspensions.
   * @param {string} playerId
   * @returns {boolean}
   */
  function isSuspended(playerId) {
    var susp = suspensionStore[playerId];
    if (!susp || !susp.active) return false;
    if (susp.type === 'permanent') return true;

    // Check expiry
    var endsAt = new Date(susp.endsAt).getTime();
    if (nowMs() >= endsAt) {
      susp.active = false;
      appendLog('temp_suspend_lifted', playerId, 'system', { reason: 'expired' });
      return false;
    }
    return true;
  }

  /**
   * Get suspension details for a player.
   * @param {string} playerId
   * @returns {Object|null}
   */
  function getSuspension(playerId) {
    return suspensionStore[playerId] || null;
  }

  /**
   * Get all suspensions (for public registry).
   * @returns {Array}
   */
  function getAllSuspensions() {
    var result = [];
    var keys = Object.keys(suspensionStore);
    for (var i = 0; i < keys.length; i++) {
      result.push(suspensionStore[keys[i]]);
    }
    return result;
  }

  // ============================================================================
  // APPEAL SYSTEM (§7.3 — 7-day review window)
  // ============================================================================

  /**
   * File an appeal against a suspension.
   * @param {Object} opts
   * @param {string} opts.appellantId  - Player filing the appeal
   * @param {string} opts.groundsText  - Grounds for the appeal
   * @param {Array}  opts.evidence     - Supporting evidence
   * @returns {{ ok: boolean, appeal?: Object, error?: string }}
   */
  function fileAppeal(opts) {
    if (!opts || typeof opts !== 'object') {
      return { ok: false, error: 'Invalid options' };
    }
    var appellantId = opts.appellantId;
    var groundsText = opts.groundsText;
    var evidence    = opts.evidence || [];

    if (!appellantId || typeof appellantId !== 'string') {
      return { ok: false, error: 'appellantId required' };
    }
    if (!groundsText || typeof groundsText !== 'string' || groundsText.trim().length === 0) {
      return { ok: false, error: 'groundsText required' };
    }
    if (!Array.isArray(evidence)) {
      return { ok: false, error: 'evidence must be an array' };
    }

    var suspension = suspensionStore[appellantId];
    if (!suspension) {
      return { ok: false, error: 'No suspension on record for player' };
    }

    // Check appeal window
    var appealByTs = new Date(suspension.appealBy).getTime();
    if (nowMs() > appealByTs) {
      return { ok: false, error: 'Appeal window has expired (7-day limit per §7.3)' };
    }

    // Check for duplicate active appeal
    var existingKeys = Object.keys(appealStore);
    for (var i = 0; i < existingKeys.length; i++) {
      var existing = appealStore[existingKeys[i]];
      if (existing.appellantId === appellantId &&
          (existing.status === APPEAL_STATUS.pending || existing.status === APPEAL_STATUS.reviewing)) {
        return { ok: false, error: 'An active appeal already exists for this player' };
      }
    }

    var id = generateId('appeal', ++appealCounter);
    var now = nowMs();
    var appeal = {
      id:          id,
      appellantId: appellantId,
      groundsText: groundsText.trim(),
      evidence:    evidence.slice(),
      status:      APPEAL_STATUS.pending,
      filedAt:     new Date(now).toISOString(),
      dueBy:       new Date(now + APPEAL_WINDOW_MS).toISOString(),
      reviewedBy:  null,
      reviewedAt:  null,
      resolution:  null
    };

    appealStore[id] = appeal;
    appendLog('appeal_filed', appellantId, appellantId, {
      appealId: id
    });

    return { ok: true, appeal: appeal };
  }

  /**
   * Begin reviewing an appeal (moves status to 'reviewing').
   * @param {string} appealId
   * @param {string} moderatorId
   * @returns {{ ok: boolean, appeal?: Object, error?: string }}
   */
  function beginAppealReview(appealId, moderatorId) {
    if (!hasPermission(moderatorId, 'canReviewAppeals')) {
      return { ok: false, error: 'Insufficient permissions to review appeals' };
    }
    var appeal = appealStore[appealId];
    if (!appeal) {
      return { ok: false, error: 'Appeal not found' };
    }
    if (appeal.status !== APPEAL_STATUS.pending) {
      return { ok: false, error: 'Appeal is not in pending status' };
    }
    appeal.status     = APPEAL_STATUS.reviewing;
    appeal.reviewedBy = moderatorId;
    appendLog('appeal_reviewed', appeal.appellantId, moderatorId, { appealId: appealId });
    return { ok: true, appeal: appeal };
  }

  /**
   * Resolve an appeal.
   * @param {string} appealId
   * @param {string} moderatorId
   * @param {string} outcome     - 'upheld' | 'reversed'
   * @param {string} resolution  - explanation text
   * @returns {{ ok: boolean, appeal?: Object, error?: string }}
   */
  function resolveAppeal(appealId, moderatorId, outcome, resolution) {
    if (!hasPermission(moderatorId, 'canReviewAppeals')) {
      return { ok: false, error: 'Insufficient permissions to resolve appeals' };
    }
    var appeal = appealStore[appealId];
    if (!appeal) {
      return { ok: false, error: 'Appeal not found' };
    }
    if (appeal.status === APPEAL_STATUS.upheld || appeal.status === APPEAL_STATUS.reversed) {
      return { ok: false, error: 'Appeal is already resolved' };
    }
    if (outcome !== 'upheld' && outcome !== 'reversed') {
      return { ok: false, error: 'Invalid outcome: must be upheld or reversed' };
    }
    if (!resolution || typeof resolution !== 'string' || resolution.trim().length === 0) {
      return { ok: false, error: 'Resolution text required' };
    }

    appeal.status     = outcome;
    appeal.resolution = resolution.trim();
    appeal.reviewedBy = moderatorId;
    appeal.reviewedAt = new Date().toISOString();

    // If reversed, lift the suspension
    if (outcome === 'reversed') {
      var susp = suspensionStore[appeal.appellantId];
      if (susp && susp.active) {
        susp.active   = false;
        susp.lifted   = true;
        susp.liftedBy = moderatorId;
        susp.liftedAt = new Date().toISOString();
        susp.liftReason = 'Appeal reversed: ' + resolution.trim();
        var liftAction = susp.type === 'permanent' ? 'permanent_suspend_lifted' : 'temp_suspend_lifted';
        appendLog(liftAction, appeal.appellantId, moderatorId, { reason: 'appeal_reversed' });
      }
    }

    appendLog('appeal_resolved', appeal.appellantId, moderatorId, {
      appealId:  appealId,
      outcome:   outcome,
      resolution: resolution.trim()
    });

    return { ok: true, appeal: appeal };
  }

  /**
   * Get an appeal by ID.
   * @param {string} appealId
   * @returns {Object|null}
   */
  function getAppeal(appealId) {
    return appealStore[appealId] || null;
  }

  /**
   * Get all appeals for a player.
   * @param {string} playerId
   * @returns {Array}
   */
  function getAppealsFor(playerId) {
    var results = [];
    var keys = Object.keys(appealStore);
    for (var i = 0; i < keys.length; i++) {
      if (appealStore[keys[i]].appellantId === playerId) {
        results.push(appealStore[keys[i]]);
      }
    }
    return results;
  }

  /**
   * Get all pending appeals (for moderator queue).
   * @returns {Array}
   */
  function getPendingAppeals() {
    var results = [];
    var keys = Object.keys(appealStore);
    for (var i = 0; i < keys.length; i++) {
      var a = appealStore[keys[i]];
      if (a.status === APPEAL_STATUS.pending || a.status === APPEAL_STATUS.reviewing) {
        results.push(a);
      }
    }
    return results;
  }

  /**
   * Expire stale appeals that passed the review deadline.
   * @returns {number} number of appeals expired
   */
  function expireStaleAppeals() {
    var count = 0;
    var now = nowMs();
    var keys = Object.keys(appealStore);
    for (var i = 0; i < keys.length; i++) {
      var appeal = appealStore[keys[i]];
      if (appeal.status === APPEAL_STATUS.pending || appeal.status === APPEAL_STATUS.reviewing) {
        if (now > new Date(appeal.dueBy).getTime()) {
          appeal.status = APPEAL_STATUS.expired;
          count++;
          appendLog('appeal_resolved', appeal.appellantId, 'system', {
            appealId: appeal.id,
            outcome:  'expired'
          });
        }
      }
    }
    return count;
  }

  // ============================================================================
  // PUBLIC ACCOUNTABILITY LOG
  // ============================================================================

  /**
   * Get all entries in the public accountability log.
   * @returns {Array}
   */
  function getAccountabilityLog() {
    return accountabilityLog.slice();
  }

  /**
   * Get log entries for a specific player.
   * @param {string} playerId
   * @returns {Array}
   */
  function getPlayerLog(playerId) {
    var results = [];
    for (var i = 0; i < accountabilityLog.length; i++) {
      if (accountabilityLog[i].targetPlayer === playerId) {
        results.push(accountabilityLog[i]);
      }
    }
    return results;
  }

  /**
   * Get log entries filtered by action type.
   * @param {string} action
   * @returns {Array}
   */
  function getLogByAction(action) {
    var results = [];
    for (var i = 0; i < accountabilityLog.length; i++) {
      if (accountabilityLog[i].action === action) {
        results.push(accountabilityLog[i]);
      }
    }
    return results;
  }

  /**
   * Get the N most recent log entries.
   * @param {number} n
   * @returns {Array}
   */
  function getRecentLog(n) {
    return accountabilityLog.slice(-n);
  }

  // ============================================================================
  // RATE LIMITING
  // ============================================================================

  /**
   * Record a message send attempt for rate limiting.
   * @param {string} playerId
   * @param {number} [tsMs] - override timestamp (for testing)
   * @returns {{ allowed: boolean, reason?: string, resetIn?: number }}
   */
  function recordMessage(playerId, tsMs) {
    var now = tsMs !== undefined ? tsMs : nowMs();

    if (!rateLimitStore[playerId]) {
      rateLimitStore[playerId] = {
        count:       0,
        windowStart: now,
        floodCount:  0,
        floodStart:  now
      };
    }

    var rl = rateLimitStore[playerId];

    // Reset main window if expired
    if (now - rl.windowStart >= RATE_LIMIT_WINDOW_MS) {
      rl.count       = 0;
      rl.windowStart = now;
    }

    // Reset flood window if expired
    if (now - rl.floodStart >= RATE_LIMIT_FLOOD_WINDOW) {
      rl.floodCount = 0;
      rl.floodStart = now;
    }

    rl.count++;
    rl.floodCount++;

    // Check flood first (more urgent)
    if (rl.floodCount > RATE_LIMIT_FLOOD_MAX) {
      appendLog('flood_detected', playerId, 'system', {
        floodCount: rl.floodCount,
        windowMs:   RATE_LIMIT_FLOOD_WINDOW
      });
      return {
        allowed: false,
        reason:  'flood',
        resetIn: RATE_LIMIT_FLOOD_WINDOW - (now - rl.floodStart)
      };
    }

    // Check rate limit
    if (rl.count > RATE_LIMIT_MAX_MESSAGES) {
      appendLog('rate_limit_triggered', playerId, 'system', {
        count:    rl.count,
        windowMs: RATE_LIMIT_WINDOW_MS
      });
      return {
        allowed: false,
        reason:  'rate_limit',
        resetIn: RATE_LIMIT_WINDOW_MS - (now - rl.windowStart)
      };
    }

    return { allowed: true };
  }

  /**
   * Get current rate limit state for a player.
   * @param {string} playerId
   * @returns {Object}
   */
  function getRateLimitState(playerId) {
    var rl = rateLimitStore[playerId];
    if (!rl) {
      return { count: 0, floodCount: 0, windowStart: null, floodStart: null };
    }
    return {
      count:       rl.count,
      floodCount:  rl.floodCount,
      windowStart: rl.windowStart,
      floodStart:  rl.floodStart
    };
  }

  /**
   * Reset rate limit state for a player (admin action).
   * @param {string} playerId
   */
  function resetRateLimit(playerId) {
    delete rateLimitStore[playerId];
  }

  /**
   * Check if a player is currently rate limited (without recording a message).
   * @param {string} playerId
   * @param {number} [tsMs]
   * @returns {boolean}
   */
  function isRateLimited(playerId, tsMs) {
    var now = tsMs !== undefined ? tsMs : nowMs();
    var rl = rateLimitStore[playerId];
    if (!rl) return false;

    // Check if windows have expired
    if (now - rl.windowStart >= RATE_LIMIT_WINDOW_MS) return false;
    if (rl.count > RATE_LIMIT_MAX_MESSAGES) return true;

    return false;
  }

  // ============================================================================
  // CONVENIENCE / COMBINED CHECKS
  // ============================================================================

  /**
   * Full moderation status for a player.
   * @param {string} playerId
   * @returns {Object}
   */
  function getPlayerStatus(playerId) {
    return {
      playerId:    playerId,
      suspended:   isSuspended(playerId),
      muted:       isMuted(playerId),
      inCooldown:  isInCooldown(playerId),
      currentStep: getCurrentStep(playerId),
      warnings:    getWarnings(playerId).length,
      suspension:  getSuspension(playerId),
      mute:        getMute(playerId),
      canChat:     canChat(playerId)
    };
  }

  /**
   * Determine if a player needs moderation action based on incident history.
   * @param {string} playerId
   * @returns {{ needsAction: boolean, suggestedStep: string|null, incidentCount: number }}
   */
  function assessPlayer(playerId) {
    var incidents = getIncidentsFor(playerId);
    var open = 0;
    for (var i = 0; i < incidents.length; i++) {
      if (incidents[i].status === 'open') open++;
    }
    var suggested = null;
    if (open >= 5) suggested = getNextLadderStep(playerId) || 'permanent_suspend';
    else if (open >= 3) suggested = 'mute';
    else if (open >= 1) suggested = 'verbal_warning';

    return {
      needsAction:   open > 0,
      suggestedStep: suggested,
      incidentCount: incidents.length,
      openCount:     open
    };
  }

  // ============================================================================
  // EXPORTS
  // ============================================================================

  // Constants
  exports.LADDER_STEPS         = LADDER_STEPS;
  exports.INCIDENT_CATEGORIES  = INCIDENT_CATEGORIES;
  exports.MODERATOR_ROLES      = MODERATOR_ROLES;
  exports.TEMP_SUSPEND_DURATIONS = TEMP_SUSPEND_DURATIONS;
  exports.MUTE_DURATIONS       = MUTE_DURATIONS;
  exports.APPEAL_WINDOW_MS     = APPEAL_WINDOW_MS;
  exports.APPEAL_STATUS        = APPEAL_STATUS;
  exports.EVIDENCE_TYPES       = EVIDENCE_TYPES;
  exports.LOG_ACTIONS          = LOG_ACTIONS;
  exports.RATE_LIMIT_MAX_MESSAGES = RATE_LIMIT_MAX_MESSAGES;
  exports.RATE_LIMIT_WINDOW_MS = RATE_LIMIT_WINDOW_MS;
  exports.RATE_LIMIT_FLOOD_MAX = RATE_LIMIT_FLOOD_MAX;
  exports.RATE_LIMIT_FLOOD_WINDOW = RATE_LIMIT_FLOOD_WINDOW;
  exports.POST_MUTE_COOLDOWN_MS = POST_MUTE_COOLDOWN_MS;

  // Module init
  exports.reset = reset;

  // Moderator management
  exports.registerModerator       = registerModerator;
  exports.removeModerator         = removeModerator;
  exports.isModerator             = isModerator;
  exports.getModeratorPermissions = getModeratorPermissions;
  exports.hasPermission           = hasPermission;

  // Incident reports
  exports.fileReport              = fileReport;
  exports.getIncident             = getIncident;
  exports.getIncidentsFor         = getIncidentsFor;
  exports.getIncidentsByReporter  = getIncidentsByReporter;
  exports.reviewIncident          = reviewIncident;

  // Warning ladder
  exports.issueNextWarning        = issueNextWarning;
  exports.issueSpecificWarning    = issueSpecificWarning;
  exports.getWarnings             = getWarnings;
  exports.getCurrentStep          = getCurrentStep;
  exports.getNextLadderStep       = getNextLadderStep;

  // Mute system
  exports.applyMute               = applyMute;
  exports.liftMute                = liftMute;
  exports.isMuted                 = isMuted;
  exports.getMute                 = getMute;
  exports.isInCooldown            = isInCooldown;
  exports.getCooldownRemaining    = getCooldownRemaining;
  exports.canChat                 = canChat;

  // Suspension registry
  exports.applyTempSuspension     = applyTempSuspension;
  exports.applyPermanentSuspension = applyPermanentSuspension;
  exports.liftSuspension          = liftSuspension;
  exports.isSuspended             = isSuspended;
  exports.getSuspension           = getSuspension;
  exports.getAllSuspensions        = getAllSuspensions;

  // Appeal system
  exports.fileAppeal              = fileAppeal;
  exports.beginAppealReview       = beginAppealReview;
  exports.resolveAppeal           = resolveAppeal;
  exports.getAppeal               = getAppeal;
  exports.getAppealsFor           = getAppealsFor;
  exports.getPendingAppeals       = getPendingAppeals;
  exports.expireStaleAppeals      = expireStaleAppeals;

  // Accountability log
  exports.getAccountabilityLog    = getAccountabilityLog;
  exports.getPlayerLog            = getPlayerLog;
  exports.getLogByAction          = getLogByAction;
  exports.getRecentLog            = getRecentLog;

  // Rate limiting
  exports.recordMessage           = recordMessage;
  exports.getRateLimitState       = getRateLimitState;
  exports.resetRateLimit          = resetRateLimit;
  exports.isRateLimited           = isRateLimited;

  // Combined helpers
  exports.getPlayerStatus         = getPlayerStatus;
  exports.assessPlayer            = assessPlayer;

  // PRNG (exposed for testing)
  exports.mulberry32              = mulberry32;

})(typeof module !== 'undefined' ? module.exports : (window.SafetyModeration = {}));
