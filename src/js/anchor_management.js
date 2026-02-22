// anchor_management.js
/**
 * anchor_management.js
 * ZION Real-World Anchor Management System
 * Bridges the Physical Realm and the Digital Realm per Constitution §5.2 (Anchoring).
 *
 * Anchor lifecycle: proposed → approved → active → expired/removed
 * Five anchor types: portal, resource_node, discovery_point, garden, monument
 * GPS validation via haversine, steward approval workflow, capacity limits.
 */

(function(exports) {
  'use strict';

  // ============================================================
  // Seeded PRNG — mulberry32
  // ============================================================

  function mulberry32(seed) {
    return function() {
      seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ============================================================
  // Constants
  // ============================================================

  var EARTH_RADIUS_M = 6371000;
  var DEFAULT_GEOFENCE_RADIUS_M = 50;
  var MAX_ANCHORS_PER_ZONE = 20;
  var MAX_PROPOSALS_PER_PLAYER = 5;
  var ANCHOR_EXPIRY_TICKS = 10000;   // ticks until anchor expires if not visited

  /**
   * Five anchor type definitions (Constitution §5.2).
   * Each type has: id, label, description, rewardType, visitReward.
   */
  var ANCHOR_TYPES = [
    {
      id: 'portal',
      label: 'Portal',
      description: 'A fast-travel waypoint linking a physical location to a ZION zone entry.',
      rewardType: 'fast_travel',
      visitReward: { sparks: 5, xp: 20 }
    },
    {
      id: 'resource_node',
      label: 'Resource Node',
      description: 'A gathering point where real-world presence unlocks harvestable resources.',
      rewardType: 'harvest',
      visitReward: { sparks: 8, xp: 15 }
    },
    {
      id: 'discovery_point',
      label: 'Discovery Point',
      description: 'A lore site revealing stories, secrets, or hidden items when visited in person.',
      rewardType: 'lore',
      visitReward: { sparks: 10, xp: 25 }
    },
    {
      id: 'garden',
      label: 'Garden',
      description: 'A planting site where citizens grow crops tied to a real-world garden location.',
      rewardType: 'grow',
      visitReward: { sparks: 6, xp: 18 }
    },
    {
      id: 'monument',
      label: 'Monument',
      description: 'A landmark anchor commemorating a place of significance in the community.',
      rewardType: 'prestige',
      visitReward: { sparks: 12, xp: 30 }
    }
  ];

  var VALID_TYPE_IDS = (function() {
    var ids = [];
    for (var i = 0; i < ANCHOR_TYPES.length; i++) {
      ids.push(ANCHOR_TYPES[i].id);
    }
    return ids;
  }());

  var VALID_ZONES = [
    'nexus', 'gardens', 'athenaeum', 'studio',
    'wilds', 'agora', 'commons', 'arena'
  ];

  // Anchor lifecycle statuses
  var STATUS_PROPOSED = 'proposed';
  var STATUS_APPROVED = 'approved';
  var STATUS_ACTIVE   = 'active';
  var STATUS_EXPIRED  = 'expired';
  var STATUS_REMOVED  = 'removed';
  var STATUS_REJECTED = 'rejected';

  // ============================================================
  // Utility Helpers
  // ============================================================

  function generateId(prefix) {
    var p = prefix || 'anchor';
    return p + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  }

  function toRad(deg) {
    return deg * Math.PI / 180;
  }

  /**
   * Haversine distance between two GPS points.
   * @param {number} lat1
   * @param {number} lng1
   * @param {number} lat2
   * @param {number} lng2
   * @returns {number} distance in meters
   */
  function haversineDistance(lat1, lng1, lat2, lng2) {
    var dLat = toRad(lat2 - lat1);
    var dLng = toRad(lng2 - lng1);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_M * c;
  }

  /**
   * Validates GPS coordinates.
   * Returns null if valid, or an error string if invalid.
   */
  function validateGps(lat, lng) {
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return 'lat and lng must be numbers';
    }
    if (lat < -90 || lat > 90) {
      return 'lat out of range (-90 to 90)';
    }
    if (lng < -180 || lng > 180) {
      return 'lng out of range (-180 to 180)';
    }
    return null;
  }

  /**
   * Counts proposals in pending/proposed state by a given creator in the state.
   */
  function countPendingProposalsByCreator(state, creatorId) {
    var count = 0;
    for (var i = 0; i < state.proposals.length; i++) {
      var p = state.proposals[i];
      if (p.creatorId === creatorId &&
          (p.status === STATUS_PROPOSED)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Counts active anchors in a given zone.
   */
  function countActiveAnchorsInZone(state, zone) {
    var count = 0;
    for (var id in state.anchors) {
      if (!Object.prototype.hasOwnProperty.call(state.anchors, id)) continue;
      var a = state.anchors[id];
      if (a.zone === zone && (a.status === STATUS_ACTIVE || a.status === STATUS_APPROVED)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Appends a log entry to state.anchorLog for a specific anchor.
   * Mutates state.anchorLog in place (state is the canonical mutable store).
   */
  function appendLog(state, anchorId, event, actorId, details, currentTick) {
    state.anchorLog.push({
      anchorId: anchorId,
      event: event,
      actorId: actorId,
      details: details || null,
      tick: currentTick || 0
    });
  }

  // ============================================================
  // createState
  // ============================================================

  /**
   * Returns a fresh anchor management state object.
   * anchors   — dict keyed by anchorId
   * proposals — array of proposal objects
   * visits    — dict keyed by playerId → array of {anchorId, tick}
   * anchorLog — flat array of log events
   */
  function createState() {
    return {
      anchors: {},
      proposals: [],
      visits: {},
      anchorLog: []
    };
  }

  // ============================================================
  // proposeAnchor
  // ============================================================

  /**
   * Propose a new anchor for steward review.
   * Lifecycle starts at STATUS_PROPOSED.
   *
   * Checks:
   *   - valid type
   *   - valid zone
   *   - valid GPS
   *   - player proposal limit (MAX_PROPOSALS_PER_PLAYER pending proposals)
   *
   * @param {Object} state
   * @param {string} creatorId
   * @param {string} type        one of VALID_TYPE_IDS
   * @param {string} name
   * @param {number} lat
   * @param {number} lng
   * @param {string} zone
   * @param {string} description
   * @param {number} currentTick
   * @returns {{success: boolean, proposal: Object|null, reason: string|null}}
   */
  function proposeAnchor(state, creatorId, type, name, lat, lng, zone, description, currentTick) {
    var tick = currentTick || 0;

    // Validate type
    if (VALID_TYPE_IDS.indexOf(type) === -1) {
      return { success: false, proposal: null, reason: 'Invalid anchor type: ' + type };
    }

    // Validate zone
    if (VALID_ZONES.indexOf(zone) === -1) {
      return { success: false, proposal: null, reason: 'Invalid zone: ' + zone };
    }

    // Validate GPS
    var gpsError = validateGps(lat, lng);
    if (gpsError) {
      return { success: false, proposal: null, reason: 'GPS error: ' + gpsError };
    }

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return { success: false, proposal: null, reason: 'Anchor name is required' };
    }

    // Validate description
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return { success: false, proposal: null, reason: 'Anchor description is required' };
    }

    // Validate creatorId
    if (!creatorId || typeof creatorId !== 'string' || creatorId.trim().length === 0) {
      return { success: false, proposal: null, reason: 'creatorId is required' };
    }

    // Player proposal limit
    var pendingCount = countPendingProposalsByCreator(state, creatorId);
    if (pendingCount >= MAX_PROPOSALS_PER_PLAYER) {
      return {
        success: false,
        proposal: null,
        reason: 'Player has reached the maximum of ' + MAX_PROPOSALS_PER_PLAYER + ' pending proposals'
      };
    }

    var proposalId = generateId('prop');
    var proposal = {
      id: proposalId,
      type: type,
      name: name.trim(),
      lat: lat,
      lng: lng,
      zone: zone,
      description: description.trim(),
      creatorId: creatorId,
      status: STATUS_PROPOSED,
      proposedTick: tick,
      loreText: '',
      geofenceRadius: DEFAULT_GEOFENCE_RADIUS_M
    };

    state.proposals.push(proposal);
    appendLog(state, proposalId, 'proposed', creatorId, { name: name, zone: zone, type: type }, tick);

    return { success: true, proposal: proposal, reason: null };
  }

  // ============================================================
  // approveAnchor
  // ============================================================

  /**
   * Steward approves a proposal, creating an active anchor.
   * Checks zone capacity before approving.
   *
   * @param {Object} state
   * @param {string} proposalId
   * @param {string} stewardId
   * @param {number} currentTick
   * @returns {{success: boolean, anchor: Object|null, reason: string|null}}
   */
  function approveAnchor(state, proposalId, stewardId, currentTick) {
    var tick = currentTick || 0;

    // Find proposal
    var proposal = null;
    for (var i = 0; i < state.proposals.length; i++) {
      if (state.proposals[i].id === proposalId) {
        proposal = state.proposals[i];
        break;
      }
    }

    if (!proposal) {
      return { success: false, anchor: null, reason: 'Proposal not found: ' + proposalId };
    }

    if (proposal.status !== STATUS_PROPOSED) {
      return {
        success: false,
        anchor: null,
        reason: 'Proposal is not in proposed status (current: ' + proposal.status + ')'
      };
    }

    // Zone capacity check
    var zoneCount = countActiveAnchorsInZone(state, proposal.zone);
    if (zoneCount >= MAX_ANCHORS_PER_ZONE) {
      return {
        success: false,
        anchor: null,
        reason: 'Zone ' + proposal.zone + ' has reached maximum anchor capacity (' + MAX_ANCHORS_PER_ZONE + ')'
      };
    }

    // Create anchor
    var anchorId = generateId('anc');
    var anchor = {
      id: anchorId,
      proposalId: proposalId,
      type: proposal.type,
      name: proposal.name,
      lat: proposal.lat,
      lng: proposal.lng,
      zone: proposal.zone,
      description: proposal.description,
      loreText: proposal.loreText || '',
      creatorId: proposal.creatorId,
      stewardId: stewardId,
      status: STATUS_ACTIVE,
      geofenceRadius: proposal.geofenceRadius,
      createdTick: tick,
      expiryTick: tick + ANCHOR_EXPIRY_TICKS,
      visitCount: 0
    };

    state.anchors[anchorId] = anchor;
    proposal.status = STATUS_APPROVED;

    appendLog(state, anchorId, 'approved', stewardId, { proposalId: proposalId, zone: anchor.zone }, tick);

    return { success: true, anchor: anchor, reason: null };
  }

  // ============================================================
  // rejectAnchor
  // ============================================================

  /**
   * Steward rejects a proposal.
   *
   * @param {Object} state
   * @param {string} proposalId
   * @param {string} stewardId
   * @param {string} reason
   * @param {number} currentTick
   * @returns {{success: boolean, reason: string|null}}
   */
  function rejectAnchor(state, proposalId, stewardId, reason, currentTick) {
    var tick = currentTick || 0;

    var proposal = null;
    for (var i = 0; i < state.proposals.length; i++) {
      if (state.proposals[i].id === proposalId) {
        proposal = state.proposals[i];
        break;
      }
    }

    if (!proposal) {
      return { success: false, reason: 'Proposal not found: ' + proposalId };
    }

    if (proposal.status !== STATUS_PROPOSED) {
      return {
        success: false,
        reason: 'Proposal is not in proposed status (current: ' + proposal.status + ')'
      };
    }

    proposal.status = STATUS_REJECTED;
    proposal.rejectedBy = stewardId;
    proposal.rejectReason = reason || 'No reason given';
    proposal.rejectedTick = tick;

    appendLog(state, proposalId, 'rejected', stewardId, { reason: proposal.rejectReason }, tick);

    return { success: true, reason: null };
  }

  // ============================================================
  // removeAnchor
  // ============================================================

  /**
   * Remove an active anchor (by steward or system expiry).
   *
   * @param {Object} state
   * @param {string} anchorId
   * @param {string} removerId
   * @param {string} reason
   * @param {number} currentTick
   * @returns {{success: boolean, reason: string|null}}
   */
  function removeAnchor(state, anchorId, removerId, reason, currentTick) {
    var tick = currentTick || 0;

    var anchor = state.anchors[anchorId];
    if (!anchor) {
      return { success: false, reason: 'Anchor not found: ' + anchorId };
    }

    if (anchor.status === STATUS_REMOVED || anchor.status === STATUS_EXPIRED) {
      return { success: false, reason: 'Anchor is already ' + anchor.status };
    }

    anchor.status = STATUS_REMOVED;
    anchor.removedBy = removerId;
    anchor.removeReason = reason || 'No reason given';
    anchor.removedTick = tick;

    appendLog(state, anchorId, 'removed', removerId, { reason: anchor.removeReason }, tick);

    return { success: true, reason: null };
  }

  // ============================================================
  // getAnchor
  // ============================================================

  /**
   * Get an anchor by ID.
   * @param {Object} state
   * @param {string} anchorId
   * @returns {Object|null}
   */
  function getAnchor(state, anchorId) {
    return state.anchors[anchorId] || null;
  }

  // ============================================================
  // getAnchorsInZone
  // ============================================================

  /**
   * Returns all active anchors in a given zone.
   * @param {Object} state
   * @param {string} zone
   * @returns {Array}
   */
  function getAnchorsInZone(state, zone) {
    var results = [];
    for (var id in state.anchors) {
      if (!Object.prototype.hasOwnProperty.call(state.anchors, id)) continue;
      var a = state.anchors[id];
      if (a.zone === zone && (a.status === STATUS_ACTIVE || a.status === STATUS_APPROVED)) {
        results.push(a);
      }
    }
    return results;
  }

  // ============================================================
  // getAnchorsByType
  // ============================================================

  /**
   * Returns all active anchors of a given type.
   * @param {Object} state
   * @param {string} type
   * @returns {Array}
   */
  function getAnchorsByType(state, type) {
    var results = [];
    for (var id in state.anchors) {
      if (!Object.prototype.hasOwnProperty.call(state.anchors, id)) continue;
      var a = state.anchors[id];
      if (a.type === type && (a.status === STATUS_ACTIVE || a.status === STATUS_APPROVED)) {
        results.push(a);
      }
    }
    return results;
  }

  // ============================================================
  // getAnchorsByCreator
  // ============================================================

  /**
   * Returns all anchors created by a given player (any status).
   * @param {Object} state
   * @param {string} creatorId
   * @returns {Array}
   */
  function getAnchorsByCreator(state, creatorId) {
    var results = [];
    for (var id in state.anchors) {
      if (!Object.prototype.hasOwnProperty.call(state.anchors, id)) continue;
      var a = state.anchors[id];
      if (a.creatorId === creatorId) {
        results.push(a);
      }
    }
    return results;
  }

  // ============================================================
  // isWithinRange
  // ============================================================

  /**
   * Returns true if (lat2, lng2) is within radiusMeters of (lat1, lng1).
   * Uses haversine formula.
   *
   * @param {number} lat1
   * @param {number} lng1
   * @param {number} lat2
   * @param {number} lng2
   * @param {number} radiusMeters
   * @returns {boolean}
   */
  function isWithinRange(lat1, lng1, lat2, lng2, radiusMeters) {
    var radius = (typeof radiusMeters === 'number') ? radiusMeters : DEFAULT_GEOFENCE_RADIUS_M;
    var dist = haversineDistance(lat1, lng1, lat2, lng2);
    return dist <= radius;
  }

  // ============================================================
  // visitAnchor
  // ============================================================

  /**
   * Record a player visit to an anchor.
   * Player must be within the anchor's geofence (isWithinRange check skipped here —
   * the caller is responsible for proximity validation).
   * Grants a visit reward based on anchor type.
   *
   * @param {Object} state
   * @param {string} playerId
   * @param {string} anchorId
   * @param {number} currentTick
   * @returns {{success: boolean, reward: Object|null, reason: string|null}}
   */
  function visitAnchor(state, playerId, anchorId, currentTick) {
    var tick = currentTick || 0;

    var anchor = state.anchors[anchorId];
    if (!anchor) {
      return { success: false, reward: null, reason: 'Anchor not found: ' + anchorId };
    }

    if (anchor.status !== STATUS_ACTIVE && anchor.status !== STATUS_APPROVED) {
      return { success: false, reward: null, reason: 'Anchor is not active (status: ' + anchor.status + ')' };
    }

    // Find type definition for reward
    var typeDef = null;
    for (var i = 0; i < ANCHOR_TYPES.length; i++) {
      if (ANCHOR_TYPES[i].id === anchor.type) {
        typeDef = ANCHOR_TYPES[i];
        break;
      }
    }

    var reward = typeDef ? {
      sparks: typeDef.visitReward.sparks,
      xp: typeDef.visitReward.xp,
      rewardType: typeDef.rewardType
    } : { sparks: 5, xp: 10, rewardType: 'visit' };

    // Update anchor visit count
    anchor.visitCount = (anchor.visitCount || 0) + 1;

    // Update visits registry
    if (!state.visits[playerId]) {
      state.visits[playerId] = [];
    }
    state.visits[playerId].push({ anchorId: anchorId, tick: tick });

    appendLog(state, anchorId, 'visited', playerId, { reward: reward }, tick);

    return { success: true, reward: reward, reason: null };
  }

  // ============================================================
  // getVisitCount
  // ============================================================

  /**
   * Returns total visit count for an anchor.
   * @param {Object} state
   * @param {string} anchorId
   * @returns {number}
   */
  function getVisitCount(state, anchorId) {
    var anchor = state.anchors[anchorId];
    if (!anchor) return 0;
    return anchor.visitCount || 0;
  }

  // ============================================================
  // getPlayerVisits
  // ============================================================

  /**
   * Returns all anchors visited by a player (as an array of visit records).
   * @param {Object} state
   * @param {string} playerId
   * @returns {Array} array of {anchorId, tick}
   */
  function getPlayerVisits(state, playerId) {
    return state.visits[playerId] || [];
  }

  // ============================================================
  // getPopularAnchors
  // ============================================================

  /**
   * Returns the top N most-visited active anchors.
   * @param {Object} state
   * @param {number} count
   * @returns {Array}
   */
  function getPopularAnchors(state, count) {
    var n = (typeof count === 'number' && count > 0) ? count : 5;
    var all = [];
    for (var id in state.anchors) {
      if (!Object.prototype.hasOwnProperty.call(state.anchors, id)) continue;
      var a = state.anchors[id];
      if (a.status === STATUS_ACTIVE || a.status === STATUS_APPROVED) {
        all.push(a);
      }
    }
    all.sort(function(a, b) {
      return (b.visitCount || 0) - (a.visitCount || 0);
    });
    return all.slice(0, n);
  }

  // ============================================================
  // getPendingProposals
  // ============================================================

  /**
   * Returns all pending proposals, optionally filtered by zone.
   * @param {Object} state
   * @param {string} [zone] optional zone filter
   * @returns {Array}
   */
  function getPendingProposals(state, zone) {
    var results = [];
    for (var i = 0; i < state.proposals.length; i++) {
      var p = state.proposals[i];
      if (p.status === STATUS_PROPOSED) {
        if (!zone || p.zone === zone) {
          results.push(p);
        }
      }
    }
    return results;
  }

  // ============================================================
  // getAnchorStats
  // ============================================================

  /**
   * Returns aggregate statistics for a zone (or all zones if zone is null/undefined).
   * @param {Object} state
   * @param {string} [zone] optional zone filter
   * @returns {{totalAnchors: number, byType: Object, totalVisits: number, pendingProposals: number}}
   */
  function getAnchorStats(state, zone) {
    var totalAnchors = 0;
    var byType = {};
    var totalVisits = 0;

    for (var id in state.anchors) {
      if (!Object.prototype.hasOwnProperty.call(state.anchors, id)) continue;
      var a = state.anchors[id];

      // Filter by zone if provided
      if (zone && a.zone !== zone) continue;

      // Only count active anchors in stats
      if (a.status !== STATUS_ACTIVE && a.status !== STATUS_APPROVED) continue;

      totalAnchors++;
      byType[a.type] = (byType[a.type] || 0) + 1;
      totalVisits += (a.visitCount || 0);
    }

    var pendingProposals = getPendingProposals(state, zone).length;

    return {
      totalAnchors: totalAnchors,
      byType: byType,
      totalVisits: totalVisits,
      pendingProposals: pendingProposals
    };
  }

  // ============================================================
  // getAnchorLog
  // ============================================================

  /**
   * Returns all log entries for a specific anchor ID.
   * @param {Object} state
   * @param {string} anchorId
   * @returns {Array}
   */
  function getAnchorLog(state, anchorId) {
    var results = [];
    for (var i = 0; i < state.anchorLog.length; i++) {
      if (state.anchorLog[i].anchorId === anchorId) {
        results.push(state.anchorLog[i]);
      }
    }
    return results;
  }

  // ============================================================
  // getNearbyAnchors
  // ============================================================

  /**
   * Returns all active anchors within radiusMeters of (lat, lng),
   * sorted by distance ascending, each with a 'distance' property added.
   *
   * @param {Object} state
   * @param {number} lat
   * @param {number} lng
   * @param {number} radiusMeters
   * @returns {Array}
   */
  function getNearbyAnchors(state, lat, lng, radiusMeters) {
    var radius = (typeof radiusMeters === 'number') ? radiusMeters : DEFAULT_GEOFENCE_RADIUS_M;
    var results = [];

    for (var id in state.anchors) {
      if (!Object.prototype.hasOwnProperty.call(state.anchors, id)) continue;
      var a = state.anchors[id];

      if (a.status !== STATUS_ACTIVE && a.status !== STATUS_APPROVED) continue;

      var dist = haversineDistance(lat, lng, a.lat, a.lng);
      if (dist <= radius) {
        // shallow copy + distance
        var copy = {};
        for (var k in a) {
          if (Object.prototype.hasOwnProperty.call(a, k)) copy[k] = a[k];
        }
        copy.distance = dist;
        results.push(copy);
      }
    }

    results.sort(function(a, b) { return a.distance - b.distance; });
    return results;
  }

  // ============================================================
  // Exports
  // ============================================================

  exports.ANCHOR_TYPES              = ANCHOR_TYPES;
  exports.VALID_TYPE_IDS            = VALID_TYPE_IDS;
  exports.VALID_ZONES               = VALID_ZONES;
  exports.MAX_ANCHORS_PER_ZONE      = MAX_ANCHORS_PER_ZONE;
  exports.MAX_PROPOSALS_PER_PLAYER  = MAX_PROPOSALS_PER_PLAYER;
  exports.DEFAULT_GEOFENCE_RADIUS_M = DEFAULT_GEOFENCE_RADIUS_M;

  exports.createState          = createState;
  exports.proposeAnchor        = proposeAnchor;
  exports.approveAnchor        = approveAnchor;
  exports.rejectAnchor         = rejectAnchor;
  exports.removeAnchor         = removeAnchor;
  exports.getAnchor            = getAnchor;
  exports.getAnchorsInZone     = getAnchorsInZone;
  exports.getAnchorsByType     = getAnchorsByType;
  exports.getAnchorsByCreator  = getAnchorsByCreator;
  exports.isWithinRange        = isWithinRange;
  exports.visitAnchor          = visitAnchor;
  exports.getVisitCount        = getVisitCount;
  exports.getPlayerVisits      = getPlayerVisits;
  exports.getPopularAnchors    = getPopularAnchors;
  exports.getPendingProposals  = getPendingProposals;
  exports.getAnchorStats       = getAnchorStats;
  exports.getAnchorLog         = getAnchorLog;
  exports.getNearbyAnchors     = getNearbyAnchors;

  // Internal utilities exposed for testing
  exports.haversineDistance    = haversineDistance;
  exports.mulberry32           = mulberry32;

})(typeof module !== 'undefined' ? module.exports : (window.AnchorManagement = {}));
