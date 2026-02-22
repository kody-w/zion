// time_capsules.js
/**
 * ZION Time Capsule System
 * Players bury messages and items for future players to discover.
 * Constitution §5.2 (Permanent Marks), §6.1 (Creative Works), §2.1 (Connection)
 */
(function(exports) {
  'use strict';

  // =========================================================================
  // CONSTANTS
  // =========================================================================

  /** Radius (world units) a player must be within to detect a buried capsule */
  var DISCOVERY_RADIUS = 20;

  /** Maximum capsules a single player may have buried at once */
  var MAX_CAPSULES_PER_PLAYER = 5;

  /** Maximum message length in characters */
  var MAX_MESSAGE_LENGTH = 500;

  /** Maximum hint length in characters */
  var MAX_HINT_LENGTH = 100;

  /** Types of time capsule, each with different capacity and thematic purpose */
  var CAPSULE_TYPES = {
    message: {
      id: 'message',
      name: 'Message Capsule',
      description: 'A simple capsule carrying a personal note to the future.',
      maxItems: 0,
      baseSparkCost: 5,
      canHaveItems: false
    },
    gift: {
      id: 'gift',
      name: 'Gift Capsule',
      description: 'A capsule bearing a single item alongside a heartfelt message.',
      maxItems: 1,
      baseSparkCost: 15,
      canHaveItems: true
    },
    legacy: {
      id: 'legacy',
      name: 'Legacy Capsule',
      description: 'A grand capsule carrying multiple treasures and a lasting message for posterity.',
      maxItems: 5,
      baseSparkCost: 50,
      canHaveItems: true
    },
    commemorative: {
      id: 'commemorative',
      name: 'Commemorative Capsule',
      description: 'A ceremonial capsule tied to a specific world event, sealing a moment in ZION history.',
      maxItems: 3,
      baseSparkCost: 30,
      canHaveItems: true,
      requiresEvent: true
    }
  };

  /**
   * Capsule materials — control minimum lock duration and whether capsule
   * degrades (expires) before being opened.
   *
   * minDays   : minimum days from burial before unlock is allowed
   * decayDays : days after burial when the capsule degrades (null = never)
   * sparkMulti: cost multiplier applied on top of the type's baseSparkCost
   * displayName
   */
  var CAPSULE_MATERIALS = {
    wooden: {
      id: 'wooden',
      displayName: 'Wooden',
      description: 'A simple wooden chest. Decays if left unopened too long.',
      minDays: 1,
      decayDays: 30,
      sparkMultiplier: 1
    },
    stone: {
      id: 'stone',
      displayName: 'Stone',
      description: 'A sturdy stone vault. Endures for a season before crumbling.',
      minDays: 7,
      decayDays: 180,
      sparkMultiplier: 2
    },
    crystal: {
      id: 'crystal',
      displayName: 'Crystal',
      description: 'A crystalline container that preserves its contents for years.',
      minDays: 30,
      decayDays: 365,
      sparkMultiplier: 4
    },
    eternal: {
      id: 'eternal',
      displayName: 'Eternal',
      description: 'An indestructible eternal vessel. Will never decay.',
      minDays: 365,
      decayDays: null,
      sparkMultiplier: 10
    }
  };

  // Status constants
  var STATUS_BURIED  = 'buried';   // locked — not yet ready to open
  var STATUS_READY   = 'ready';    // unlock date passed — awaiting discovery
  var STATUS_OPENED  = 'opened';   // has been opened by someone
  var STATUS_EXPIRED = 'expired';  // decayed before being opened

  // Profanity list (intentionally minimal — real deployment would use a
  // comprehensive list or external service)
  var BLOCKED_WORDS = [
    'fuck', 'shit', 'asshole', 'bitch', 'cunt', 'damn', 'bastard',
    'piss', 'cock', 'dick', 'pussy', 'whore', 'slut', 'nigger',
    'faggot', 'retard', 'nazi', 'kike', 'spic', 'chink'
  ];

  // =========================================================================
  // MODULE STATE (replaced wholesale via initCapsules / getCapsuleState)
  // =========================================================================

  var capsules = {};       // capsuleId → capsule object
  var capsuleCounter = 0;  // monotonic counter for ID generation

  // =========================================================================
  // UTILITY — private helpers
  // =========================================================================

  /**
   * Generate a unique capsule ID.
   * @returns {string}
   */
  function generateId() {
    capsuleCounter++;
    return 'cap_' + Date.now().toString(36) + '_' + capsuleCounter.toString(36);
  }

  /**
   * Return the current UTC timestamp in ms.
   * Exposed as a replaceable for testing.
   */
  function now() {
    return (exports._getNow && typeof exports._getNow === 'function')
      ? exports._getNow()
      : Date.now();
  }

  /**
   * Convert days to milliseconds.
   * @param {number} days
   * @returns {number}
   */
  function daysToMs(days) {
    return days * 24 * 60 * 60 * 1000;
  }

  /**
   * 2-D Euclidean distance (ignores Y axis).
   * @param {number} x1
   * @param {number} z1
   * @param {number} x2
   * @param {number} z2
   * @returns {number}
   */
  function distance2D(x1, z1, x2, z2) {
    var dx = x1 - x2;
    var dz = z1 - z2;
    return Math.sqrt(dx * dx + dz * dz);
  }

  /**
   * Count capsules buried by a player that have not yet been opened/expired.
   * @param {string} playerId
   * @returns {number}
   */
  function countActiveBurials(playerId) {
    var count = 0;
    var ids = Object.keys(capsules);
    for (var i = 0; i < ids.length; i++) {
      var c = capsules[ids[i]];
      if (c.buriedBy === playerId &&
          c.status !== STATUS_OPENED &&
          c.status !== STATUS_EXPIRED) {
        count++;
      }
    }
    return count;
  }

  /**
   * Determine a capsule's current computed status, accounting for decay.
   * Does NOT mutate the capsule object — call refreshStatus() to update it.
   * @param {object} capsule
   * @returns {string} one of the STATUS_* constants
   */
  function computeStatus(capsule) {
    if (capsule.status === STATUS_OPENED) return STATUS_OPENED;

    var ts = now();

    // Check decay first — expired trumps ready
    var material = CAPSULE_MATERIALS[capsule.material];
    if (material && material.decayDays !== null) {
      var decayAt = capsule.buriedAt + daysToMs(material.decayDays);
      if (ts >= decayAt) return STATUS_EXPIRED;
    }

    if (ts >= capsule.unlockAt) return STATUS_READY;

    return STATUS_BURIED;
  }

  /**
   * Refresh the stored status of a capsule in-place.
   * @param {object} capsule
   */
  function refreshStatus(capsule) {
    capsule.status = computeStatus(capsule);
  }

  // =========================================================================
  // MESSAGE SANITIZATION
  // =========================================================================

  /**
   * Sanitize a message string.
   * - Trims whitespace
   * - Enforces MAX_MESSAGE_LENGTH
   * - Blocks profanity
   * @param {string} message
   * @returns {{ ok: boolean, clean?: string, error?: string }}
   */
  function sanitizeMessage(message) {
    if (typeof message !== 'string') {
      return { ok: false, error: 'Message must be a string' };
    }

    var trimmed = message.trim();

    if (trimmed.length === 0) {
      return { ok: false, error: 'Message cannot be empty' };
    }

    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      return { ok: false, error: 'Message exceeds ' + MAX_MESSAGE_LENGTH + ' character limit' };
    }

    var lower = trimmed.toLowerCase();
    for (var i = 0; i < BLOCKED_WORDS.length; i++) {
      if (lower.indexOf(BLOCKED_WORDS[i]) !== -1) {
        return { ok: false, error: 'Message contains prohibited content' };
      }
    }

    return { ok: true, clean: trimmed };
  }

  /**
   * Sanitize a hint string (shorter limit, same profanity check).
   * @param {string} hint
   * @returns {{ ok: boolean, clean?: string, error?: string }}
   */
  function sanitizeHint(hint) {
    if (typeof hint !== 'string') {
      return { ok: false, error: 'Hint must be a string' };
    }

    var trimmed = hint.trim();

    if (trimmed.length > MAX_HINT_LENGTH) {
      return { ok: false, error: 'Hint exceeds ' + MAX_HINT_LENGTH + ' character limit' };
    }

    var lower = trimmed.toLowerCase();
    for (var i = 0; i < BLOCKED_WORDS.length; i++) {
      if (lower.indexOf(BLOCKED_WORDS[i]) !== -1) {
        return { ok: false, error: 'Hint contains prohibited content' };
      }
    }

    return { ok: true, clean: trimmed };
  }

  // =========================================================================
  // CORE API
  // =========================================================================

  /**
   * Bury a new time capsule in the world.
   *
   * @param {string} playerId      - The player burying the capsule
   * @param {{x:number,z:number}}  position   - World-space location
   * @param {string} type          - One of CAPSULE_TYPES keys
   * @param {string} material      - One of CAPSULE_MATERIALS keys
   * @param {object} contents      - { message?: string, items?: string[], hint?: string, eventId?: string }
   * @param {number} unlockDate    - Unix timestamp (ms) when the capsule may be opened
   * @returns {{ success: boolean, capsule?: object, error?: string }}
   */
  function buryCapsule(playerId, position, type, material, contents, unlockDate) {
    // --- Validate inputs ---
    if (!playerId || typeof playerId !== 'string') {
      return { success: false, error: 'Invalid playerId' };
    }
    if (!position || typeof position.x !== 'number' || typeof position.z !== 'number') {
      return { success: false, error: 'Invalid position: must have numeric x and z' };
    }
    if (!CAPSULE_TYPES[type]) {
      return { success: false, error: 'Invalid capsule type: ' + type };
    }
    if (!CAPSULE_MATERIALS[material]) {
      return { success: false, error: 'Invalid capsule material: ' + material };
    }

    var typeData     = CAPSULE_TYPES[type];
    var materialData = CAPSULE_MATERIALS[material];
    var ts           = now();

    // --- Enforce minimum unlock date based on material ---
    var minUnlock = ts + daysToMs(materialData.minDays);
    if (!unlockDate || typeof unlockDate !== 'number') {
      return { success: false, error: 'unlockDate must be a number (Unix ms timestamp)' };
    }
    if (unlockDate < minUnlock) {
      return {
        success: false,
        error: 'Unlock date must be at least ' + materialData.minDays + ' day(s) in the future for ' + materialData.displayName + ' material'
      };
    }

    // --- Check player burial cap ---
    if (countActiveBurials(playerId) >= MAX_CAPSULES_PER_PLAYER) {
      return {
        success: false,
        error: 'Player has reached the maximum of ' + MAX_CAPSULES_PER_PLAYER + ' active capsules'
      };
    }

    // --- Validate commemorative event link ---
    if (type === 'commemorative') {
      if (!contents || !contents.eventId) {
        return { success: false, error: 'Commemorative capsules require an eventId in contents' };
      }
    }

    // --- Sanitize message if provided ---
    var cleanMessage = '';
    if (contents && contents.message) {
      var msgResult = sanitizeMessage(contents.message);
      if (!msgResult.ok) return { success: false, error: msgResult.error };
      cleanMessage = msgResult.clean;
    }

    // --- Sanitize hint if provided ---
    var cleanHint = '';
    if (contents && contents.hint) {
      var hintResult = sanitizeHint(contents.hint);
      if (!hintResult.ok) return { success: false, error: hintResult.error };
      cleanHint = hintResult.clean;
    }

    // --- Validate items ---
    var items = [];
    if (contents && contents.items) {
      if (!Array.isArray(contents.items)) {
        return { success: false, error: 'contents.items must be an array' };
      }
      if (contents.items.length > typeData.maxItems) {
        return {
          success: false,
          error: type + ' capsules can hold at most ' + typeData.maxItems + ' item(s)'
        };
      }
      if (contents.items.length > 0 && !typeData.canHaveItems) {
        return { success: false, error: 'Message capsules cannot contain items' };
      }
      items = contents.items.slice();
    }

    // --- Build capsule object ---
    var id = generateId();
    var capsule = {
      id:         id,
      buriedBy:   playerId,
      position:   { x: position.x, z: position.z },
      type:       type,
      material:   material,
      message:    cleanMessage,
      hint:       cleanHint,
      items:      items,
      eventId:    (contents && contents.eventId) ? contents.eventId : null,
      buriedAt:   ts,
      unlockAt:   unlockDate,
      status:     STATUS_BURIED,
      openedBy:   null,
      openedAt:   null,
      zone:       (contents && contents.zone) ? contents.zone : null
    };

    capsules[id] = capsule;

    // Return a sanitized public copy (no internal message details)
    return {
      success: true,
      capsule: {
        id:        id,
        position:  { x: position.x, z: position.z },
        type:      type,
        material:  material,
        buriedAt:  ts,
        unlockAt:  unlockDate,
        status:    STATUS_BURIED,
        buriedBy:  playerId
      }
    };
  }

  /**
   * Attempt to dig up (open) a capsule.
   * Validates proximity, unlock date, and current status.
   *
   * @param {string} playerId
   * @param {string} capsuleId
   * @param {{x:number,z:number}} playerPosition - used for proximity check
   * @returns {{ success: boolean, contents?: object, error?: string }}
   */
  function digUpCapsule(playerId, capsuleId, playerPosition) {
    var capsule = capsules[capsuleId];
    if (!capsule) {
      return { success: false, error: 'Capsule not found' };
    }

    refreshStatus(capsule);

    if (capsule.status === STATUS_EXPIRED) {
      return { success: false, error: 'This capsule has decayed and can no longer be opened' };
    }
    if (capsule.status === STATUS_OPENED) {
      return { success: false, error: 'This capsule has already been opened' };
    }
    if (capsule.status === STATUS_BURIED) {
      return {
        success: false,
        error: 'This capsule is not ready yet. ' + formatTimeRemaining(getTimeRemaining(capsuleId))
      };
    }

    // Proximity check
    if (playerPosition) {
      var dist = distance2D(playerPosition.x, playerPosition.z, capsule.position.x, capsule.position.z);
      if (dist > DISCOVERY_RADIUS) {
        return {
          success: false,
          error: 'You must be within ' + DISCOVERY_RADIUS + ' units of the capsule to open it'
        };
      }
    }

    return openCapsule(capsuleId, playerId);
  }

  /**
   * Return the current status of a capsule.
   * @param {string} capsuleId
   * @returns {string|null} STATUS_* constant or null if not found
   */
  function getCapsuleStatus(capsuleId) {
    var capsule = capsules[capsuleId];
    if (!capsule) return null;
    refreshStatus(capsule);
    return capsule.status;
  }

  /**
   * Return all capsules within a horizontal radius of a position.
   * Only returns a sanitized marker (id, position, material, status).
   * Message/item contents are NOT revealed before opening.
   *
   * @param {number} x
   * @param {number} z
   * @param {number} radius  - search radius; defaults to DISCOVERY_RADIUS
   * @returns {Array<object>}
   */
  function getNearbyCapsules(x, z, radius) {
    if (typeof radius !== 'number' || radius <= 0) radius = DISCOVERY_RADIUS;

    var results = [];
    var ids = Object.keys(capsules);
    for (var i = 0; i < ids.length; i++) {
      var c = capsules[ids[i]];
      refreshStatus(c);
      if (c.status === STATUS_EXPIRED) continue;

      var dist = distance2D(x, z, c.position.x, c.position.z);
      if (dist <= radius) {
        results.push({
          id:       c.id,
          position: { x: c.position.x, z: c.position.z },
          material: c.material,
          type:     c.type,
          status:   c.status,
          distance: Math.round(dist * 100) / 100
        });
      }
    }
    return results;
  }

  /**
   * Return a vague hint about a capsule's contents without revealing them.
   * @param {string} capsuleId
   * @returns {{ success: boolean, hint?: string, error?: string }}
   */
  function getCapsuleHint(capsuleId) {
    var capsule = capsules[capsuleId];
    if (!capsule) return { success: false, error: 'Capsule not found' };

    refreshStatus(capsule);

    if (capsule.status === STATUS_EXPIRED) {
      return { success: false, error: 'This capsule has decayed' };
    }

    // Build hint from stored hint or auto-generate from type/material
    var hint = capsule.hint;
    if (!hint) {
      var typeData = CAPSULE_TYPES[capsule.type];
      var materialData = CAPSULE_MATERIALS[capsule.material];
      hint = 'A ' + materialData.displayName.toLowerCase() + ' ' +
             typeData.name.toLowerCase() + ' waits here';
      if (capsule.items && capsule.items.length > 0) {
        hint += ', bearing ' + capsule.items.length + ' item' + (capsule.items.length > 1 ? 's' : '');
      }
      if (capsule.message) {
        hint += ', sealed with words from ' + capsule.buriedBy;
      }
      hint += '.';
    }

    return { success: true, hint: hint };
  }

  /**
   * Open a capsule that is in READY status, marking it as opened and returning contents.
   * @param {string} capsuleId
   * @param {string} playerId
   * @returns {{ success: boolean, contents?: object, error?: string }}
   */
  function openCapsule(capsuleId, playerId) {
    var capsule = capsules[capsuleId];
    if (!capsule) return { success: false, error: 'Capsule not found' };

    refreshStatus(capsule);

    if (capsule.status === STATUS_EXPIRED) {
      return { success: false, error: 'This capsule has decayed and can no longer be opened' };
    }
    if (capsule.status === STATUS_OPENED) {
      return { success: false, error: 'This capsule has already been opened' };
    }
    if (capsule.status === STATUS_BURIED) {
      return { success: false, error: 'This capsule is not ready to be opened yet' };
    }

    // Mark as opened
    capsule.status  = STATUS_OPENED;
    capsule.openedBy = playerId;
    capsule.openedAt = now();

    return {
      success: true,
      contents: {
        message:  capsule.message,
        items:    capsule.items.slice(),
        buriedBy: capsule.buriedBy,
        buriedAt: capsule.buriedAt,
        type:     capsule.type,
        material: capsule.material,
        eventId:  capsule.eventId
      }
    };
  }

  /**
   * Return all capsules buried by a given player (including opened/expired).
   * @param {string} playerId
   * @returns {Array<object>}
   */
  function getPlayerBuriedCapsules(playerId) {
    var results = [];
    var ids = Object.keys(capsules);
    for (var i = 0; i < ids.length; i++) {
      var c = capsules[ids[i]];
      if (c.buriedBy === playerId) {
        refreshStatus(c);
        results.push({
          id:        c.id,
          position:  { x: c.position.x, z: c.position.z },
          type:      c.type,
          material:  c.material,
          status:    c.status,
          buriedBy:  c.buriedBy,
          buriedAt:  c.buriedAt,
          unlockAt:  c.unlockAt,
          openedBy:  c.openedBy,
          openedAt:  c.openedAt
        });
      }
    }
    return results;
  }

  /**
   * Return all capsules that a player has opened.
   * @param {string} playerId
   * @returns {Array<object>}
   */
  function getPlayerOpenedCapsules(playerId) {
    var results = [];
    var ids = Object.keys(capsules);
    for (var i = 0; i < ids.length; i++) {
      var c = capsules[ids[i]];
      if (c.openedBy === playerId) {
        results.push({
          id:        c.id,
          type:      c.type,
          material:  c.material,
          buriedBy:  c.buriedBy,
          buriedAt:  c.buriedAt,
          openedAt:  c.openedAt,
          message:   c.message,
          items:     c.items.slice()
        });
      }
    }
    return results;
  }

  /**
   * Return ms remaining until a capsule can be opened, or 0 if ready/opened.
   * @param {string} capsuleId
   * @returns {number} milliseconds, or -1 if capsule not found
   */
  function getTimeRemaining(capsuleId) {
    var capsule = capsules[capsuleId];
    if (!capsule) return -1;

    var ts = now();
    var remaining = capsule.unlockAt - ts;
    return remaining > 0 ? remaining : 0;
  }

  /**
   * Format a ms duration into a human-readable string.
   * @param {number} ms
   * @returns {string}
   */
  function formatTimeRemaining(ms) {
    if (ms <= 0) return 'Ready now';
    var seconds = Math.floor(ms / 1000);
    var minutes = Math.floor(seconds / 60);
    var hours   = Math.floor(minutes / 60);
    var days    = Math.floor(hours / 24);

    if (days > 0)    return days + ' day' + (days > 1 ? 's' : '') + ' remaining';
    if (hours > 0)   return hours + ' hour' + (hours > 1 ? 's' : '') + ' remaining';
    if (minutes > 0) return minutes + ' minute' + (minutes > 1 ? 's' : '') + ' remaining';
    return seconds + ' second' + (seconds > 1 ? 's' : '') + ' remaining';
  }

  /**
   * Add a single item to a NOT-YET-buried capsule (status must be buried, not opened).
   * The capsule must not yet be opened/expired and must have remaining capacity.
   *
   * @param {string} capsuleId
   * @param {string} ownerId   - must match capsule.buriedBy
   * @param {string} itemId
   * @returns {{ success: boolean, error?: string }}
   */
  function addItemToCapsule(capsuleId, ownerId, itemId) {
    var capsule = capsules[capsuleId];
    if (!capsule) return { success: false, error: 'Capsule not found' };

    if (capsule.buriedBy !== ownerId) {
      return { success: false, error: 'Only the capsule owner can add items' };
    }

    refreshStatus(capsule);

    if (capsule.status === STATUS_OPENED) {
      return { success: false, error: 'Cannot modify an opened capsule' };
    }
    if (capsule.status === STATUS_EXPIRED) {
      return { success: false, error: 'Cannot modify an expired capsule' };
    }

    var typeData = CAPSULE_TYPES[capsule.type];
    if (!typeData.canHaveItems) {
      return { success: false, error: 'This capsule type cannot hold items' };
    }
    if (capsule.items.length >= typeData.maxItems) {
      return {
        success: false,
        error: 'Capsule is at maximum capacity (' + typeData.maxItems + ' items)'
      };
    }

    if (!itemId || typeof itemId !== 'string') {
      return { success: false, error: 'Invalid itemId' };
    }

    capsule.items.push(itemId);
    return { success: true };
  }

  /**
   * Set or update the message in a capsule (owner only, not yet opened).
   * @param {string} capsuleId
   * @param {string} ownerId
   * @param {string} message
   * @returns {{ success: boolean, error?: string }}
   */
  function setMessage(capsuleId, ownerId, message) {
    var capsule = capsules[capsuleId];
    if (!capsule) return { success: false, error: 'Capsule not found' };

    if (capsule.buriedBy !== ownerId) {
      return { success: false, error: 'Only the capsule owner can set the message' };
    }

    refreshStatus(capsule);

    if (capsule.status === STATUS_OPENED) {
      return { success: false, error: 'Cannot modify an opened capsule' };
    }
    if (capsule.status === STATUS_EXPIRED) {
      return { success: false, error: 'Cannot modify an expired capsule' };
    }

    var result = sanitizeMessage(message);
    if (!result.ok) return { success: false, error: result.error };

    capsule.message = result.clean;
    return { success: true };
  }

  /**
   * Return all capsules located in a named zone.
   * Zone must be set in capsule.zone at burial time via contents.zone.
   * @param {string} zone
   * @returns {Array<object>} sanitized markers (no content)
   */
  function getCapsulesByZone(zone) {
    var results = [];
    var ids = Object.keys(capsules);
    for (var i = 0; i < ids.length; i++) {
      var c = capsules[ids[i]];
      if (c.zone === zone) {
        refreshStatus(c);
        results.push({
          id:       c.id,
          position: { x: c.position.x, z: c.position.z },
          type:     c.type,
          material: c.material,
          status:   c.status,
          buriedAt: c.buriedAt,
          unlockAt: c.unlockAt
        });
      }
    }
    return results;
  }

  /**
   * Return a world-news feed of recently opened capsules.
   * @param {number} limit - max entries to return (default 10)
   * @returns {Array<object>}
   */
  function getRecentlyOpened(limit) {
    if (typeof limit !== 'number' || limit <= 0) limit = 10;

    var opened = [];
    var ids = Object.keys(capsules);
    for (var i = 0; i < ids.length; i++) {
      var c = capsules[ids[i]];
      if (c.status === STATUS_OPENED && c.openedAt) {
        opened.push({
          id:        c.id,
          type:      c.type,
          material:  c.material,
          buriedBy:  c.buriedBy,
          openedBy:  c.openedBy,
          openedAt:  c.openedAt,
          zone:      c.zone,
          itemCount: c.items.length,
          hasMessage: c.message.length > 0
        });
      }
    }

    // Sort by openedAt descending (most recent first)
    opened.sort(function(a, b) { return b.openedAt - a.openedAt; });

    return opened.slice(0, limit);
  }

  /**
   * Calculate the Spark cost to bury a capsule.
   * Cost = type.baseSparkCost * material.sparkMultiplier
   *
   * @param {string} type
   * @param {string} material
   * @returns {number} Spark cost, or -1 if invalid type/material
   */
  function calculateBurialCost(type, material) {
    var typeData     = CAPSULE_TYPES[type];
    var materialData = CAPSULE_MATERIALS[material];
    if (!typeData || !materialData) return -1;
    return typeData.baseSparkCost * materialData.sparkMultiplier;
  }

  /**
   * Return the maximum number of items a capsule type can hold.
   * @param {string} type
   * @returns {number} or -1 if invalid type
   */
  function getCapsuleCapacity(type) {
    var typeData = CAPSULE_TYPES[type];
    if (!typeData) return -1;
    return typeData.maxItems;
  }

  /**
   * Check whether a capsule has decayed/expired.
   * @param {object} capsule - a capsule object (not an id)
   * @returns {boolean}
   */
  function isExpired(capsule) {
    if (!capsule) return false;
    var status = computeStatus(capsule);
    return status === STATUS_EXPIRED;
  }

  // =========================================================================
  // STATE PERSISTENCE HELPERS
  // =========================================================================

  /**
   * Load serialized capsule state (e.g. from JSON storage).
   * @param {object} data - { capsules: {}, capsuleCounter: number }
   */
  function initCapsules(data) {
    if (!data) return;
    capsules        = data.capsules || {};
    capsuleCounter  = data.capsuleCounter || 0;
  }

  /**
   * Return the full state for serialization.
   * @returns {object}
   */
  function getCapsuleState() {
    return {
      capsules:        capsules,
      capsuleCounter:  capsuleCounter
    };
  }

  /**
   * Reset all state (for testing).
   */
  function resetCapsules() {
    capsules        = {};
    capsuleCounter  = 0;
  }

  // =========================================================================
  // EXPORTS
  // =========================================================================

  exports.CAPSULE_TYPES        = CAPSULE_TYPES;
  exports.CAPSULE_MATERIALS    = CAPSULE_MATERIALS;
  exports.DISCOVERY_RADIUS     = DISCOVERY_RADIUS;
  exports.MAX_CAPSULES_PER_PLAYER = MAX_CAPSULES_PER_PLAYER;
  exports.MAX_MESSAGE_LENGTH   = MAX_MESSAGE_LENGTH;
  exports.STATUS_BURIED        = STATUS_BURIED;
  exports.STATUS_READY         = STATUS_READY;
  exports.STATUS_OPENED        = STATUS_OPENED;
  exports.STATUS_EXPIRED       = STATUS_EXPIRED;

  exports.buryCapsule          = buryCapsule;
  exports.digUpCapsule         = digUpCapsule;
  exports.getCapsuleStatus     = getCapsuleStatus;
  exports.getNearbyCapsules    = getNearbyCapsules;
  exports.getCapsuleHint       = getCapsuleHint;
  exports.openCapsule          = openCapsule;
  exports.getPlayerBuriedCapsules = getPlayerBuriedCapsules;
  exports.getPlayerOpenedCapsules = getPlayerOpenedCapsules;
  exports.getTimeRemaining     = getTimeRemaining;
  exports.formatTimeRemaining  = formatTimeRemaining;
  exports.addItemToCapsule     = addItemToCapsule;
  exports.setMessage           = setMessage;
  exports.getCapsulesByZone    = getCapsulesByZone;
  exports.getRecentlyOpened    = getRecentlyOpened;
  exports.calculateBurialCost  = calculateBurialCost;
  exports.getCapsuleCapacity   = getCapsuleCapacity;
  exports.isExpired            = isExpired;
  exports.sanitizeMessage      = sanitizeMessage;

  // Persistence
  exports.initCapsules         = initCapsules;
  exports.getCapsuleState      = getCapsuleState;
  exports.resetCapsules        = resetCapsules;

})(typeof module !== 'undefined' ? module.exports : (window.TimeCapsules = {}));
