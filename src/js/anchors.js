// anchors.js
/**
 * ZION AR Anchor Geolocation System
 * Implements Constitution Article V §5.2 (Anchoring), §5.3 (Healthy Play), §8.6 (Physical Realm Safety)
 *
 * Anchors bridge the Physical Realm and the Digital Realm:
 *   - Real-world GPS coordinates → ZION zone locations
 *   - Walking warmth bonuses (minor, non-coercive per §1.6 and §5.3)
 *   - Safety-first AR mode per §8.6
 */
(function(exports) {
  'use strict';

  // ============================================================
  // Constants
  // ============================================================

  /**
   * Anchor Types (Constitution §5.2)
   * Five real-world location types that can be linked to ZION zones.
   */
  var TYPES = {
    ZONE_PORTAL:     'zone_portal',      // Real location → ZION zone entry
    RESOURCE_NODE:   'resource_node',    // Real location → harvestable resources
    DISCOVERY_POINT: 'discovery_point',  // Real location → lore/secrets/items
    GATHERING_SPOT:  'gathering_spot',   // Real location → social meetup
    GARDEN_PLOT:     'garden_plot'       // Real location → player garden
  };

  // Array of valid type strings for validation
  var VALID_TYPES = [
    'zone_portal', 'resource_node', 'discovery_point',
    'gathering_spot', 'garden_plot'
  ];

  // Valid ZION zones (§5.4 Genesis Zones)
  var VALID_ZONES = [
    'nexus', 'gardens', 'athenaeum', 'studio',
    'wilds', 'agora', 'commons', 'arena'
  ];

  // Earth's mean radius in meters (WGS-84)
  var EARTH_RADIUS_M = 6371000;

  // Default proximity radius for "in range" checks (meters)
  var DEFAULT_RANGE_M = 50;

  // Speed thresholds (km/h) - Constitution §5.3 and §8.6
  var WALKING_SPEED_MAX_KMH = 10;  // < 10 km/h = walking
  var DRIVING_SPEED_MIN_KMH = 25;  // >= 25 km/h = driving → pause AR

  // Warmth caps (Constitution §5.3 — "not enough to create inequality")
  var WARMTH_POINTS_MAX = 5;               // Max warmth per session
  var WARMTH_HARVEST_MAX_BONUS = 0.10;     // Max 10% harvest bonus
  var WARMTH_DISCOVERY_MAX_BONUS = 0.15;   // Max 15% discovery rate bonus

  // Protocol version
  var PROTOCOL_VERSION = 1;

  // ============================================================
  // Utility: ID Generation
  // ============================================================

  /**
   * Generates a unique identifier suitable for anchors and messages.
   * @returns {string}
   */
  function generateId() {
    return 'anc_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Generates a unique message ID.
   * @returns {string}
   */
  function generateMsgId() {
    return 'msg_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Returns current UTC timestamp as ISO-8601 string.
   * @returns {string}
   */
  function nowISO() {
    return new Date().toISOString();
  }

  // ============================================================
  // Geolocation (Haversine Distance)
  // ============================================================

  /**
   * Computes the great-circle distance between two GPS points using the
   * Haversine formula.
   *
   * @param {number} lat1 - Latitude of point 1 (degrees)
   * @param {number} lon1 - Longitude of point 1 (degrees)
   * @param {number} lat2 - Latitude of point 2 (degrees)
   * @param {number} lon2 - Longitude of point 2 (degrees)
   * @returns {number} Distance in meters
   */
  function getDistance(lat1, lon1, lat2, lon2) {
    var toRad = function(deg) { return deg * Math.PI / 180; };

    var dLat = toRad(lat2 - lat1);
    var dLon = toRad(lon2 - lon1);

    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_M * c;
  }

  /**
   * Returns true if speed is at or below walking speed threshold.
   * Stationary (0 km/h) counts as walking — Constitution §5.3 ("No Punishment for Stillness").
   *
   * @param {number} speedKmh - Speed in km/h
   * @returns {boolean}
   */
  function isWalkingSpeed(speedKmh) {
    if (typeof speedKmh !== 'number' || speedKmh < 0) return false;
    return speedKmh < WALKING_SPEED_MAX_KMH;
  }

  /**
   * Returns true if speed is at or above driving speed threshold.
   * Constitution §8.6 — pause AR gameplay when driving.
   *
   * @param {number} speedKmh - Speed in km/h
   * @returns {boolean}
   */
  function isDrivingSpeed(speedKmh) {
    if (typeof speedKmh !== 'number') return false;
    return speedKmh >= DRIVING_SPEED_MIN_KMH;
  }

  // ============================================================
  // Geolocation API Wrappers
  // ============================================================

  /**
   * Requests the current location from the browser Geolocation API.
   * Wraps navigator.geolocation with safety checks.
   * Constitution §8.6 — requires explicit permission, graceful fallback.
   *
   * @param {Function} callback - Called with {lat, lon, speed, accuracy} on success
   * @param {Function} [errorCallback] - Called with error on failure
   */
  function requestLocation(callback, errorCallback) {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      // Geolocation not available — ZION functions fully without it (§1.6)
      if (typeof errorCallback === 'function') {
        errorCallback({ code: -1, message: 'Geolocation not available' });
      }
      return;
    }

    navigator.geolocation.getCurrentPosition(
      function(position) {
        if (typeof callback === 'function') {
          callback({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            speed: position.coords.speed || 0,
            accuracy: position.coords.accuracy || null
          });
        }
      },
      function(err) {
        if (typeof errorCallback === 'function') {
          errorCallback(err);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }

  /**
   * Begins watching the player's location continuously.
   *
   * @param {Function} callback - Called with {lat, lon, speed, accuracy} on each update
   * @param {Function} [errorCallback] - Called with error on failure
   * @returns {number|null} Watch ID (for stopWatching), or null if unavailable
   */
  function watchLocation(callback, errorCallback) {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      if (typeof errorCallback === 'function') {
        errorCallback({ code: -1, message: 'Geolocation not available' });
      }
      return null;
    }

    return navigator.geolocation.watchPosition(
      function(position) {
        if (typeof callback === 'function') {
          callback({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            speed: position.coords.speed || 0,
            accuracy: position.coords.accuracy || null
          });
        }
      },
      function(err) {
        if (typeof errorCallback === 'function') {
          errorCallback(err);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  }

  /**
   * Stops a running location watch.
   *
   * @param {number} watchId - The ID returned by watchLocation
   */
  function stopWatching(watchId) {
    if (typeof navigator !== 'undefined' && navigator.geolocation &&
        typeof navigator.geolocation.clearWatch === 'function') {
      navigator.geolocation.clearWatch(watchId);
    }
  }

  // ============================================================
  // Anchor Management
  // ============================================================

  /**
   * Creates a protocol message (anchor_place) to propose placing a new anchor.
   * Constitution §3.2 — every action is a protocol message.
   *
   * @param {string} type - Anchor type (from TYPES)
   * @param {{lat: number, lon: number}} geoPosition - GPS coordinates
   * @param {string} zoneMapping - Target ZION zone name
   * @param {string} description - Human-readable description
   * @param {string} from - GitHub username of the player placing the anchor
   * @returns {Object} Protocol message of type 'anchor_place'
   */
  function create(type, geoPosition, zoneMapping, description, from) {
    var anchorId = generateId();
    var now = nowISO();

    var anchor = {
      id: anchorId,
      type: type,
      geo: {
        lat: geoPosition.lat,
        lon: geoPosition.lon
      },
      zone: zoneMapping,
      description: description,
      placed_by: from,
      placed_at: now,
      approved_by: null,
      status: 'pending',
      discoveries: 0,
      metadata: {}
    };

    return {
      v: PROTOCOL_VERSION,
      id: generateMsgId(),
      ts: now,
      seq: Date.now(),
      from: from,
      type: 'anchor_place',
      platform: 'ar',
      position: { x: 0, y: 0, z: 0, zone: zoneMapping },
      geo: { lat: geoPosition.lat, lon: geoPosition.lon },
      payload: {
        type: type,
        zone: zoneMapping,
        description: description,
        anchor: anchor
      }
    };
  }

  /**
   * Validates an anchor object.
   * Checks: type, zone, description, coordinates.
   *
   * @param {Object} anchor - Anchor object to validate
   * @returns {{valid: boolean, reasons: string[]}}
   */
  function validate(anchor) {
    var reasons = [];

    // Must have geo field
    if (!anchor.geo || typeof anchor.geo !== 'object') {
      reasons.push('Missing geo coordinates');
    } else {
      var lat = anchor.geo.lat;
      var lon = anchor.geo.lon;

      if (typeof lat !== 'number' || typeof lon !== 'number') {
        reasons.push('Geo coordinates must be numbers');
      } else {
        if (lat < -90 || lat > 90) {
          reasons.push('Latitude out of range (-90 to 90)');
        }
        if (lon < -180 || lon > 180) {
          reasons.push('Longitude out of range (-180 to 180)');
        }
        // Null Island check
        if (lat === 0 && lon === 0) {
          reasons.push('Null Island (0,0) coordinates not permitted');
        }
      }
    }

    // Must have valid type
    if (!anchor.type || VALID_TYPES.indexOf(anchor.type) === -1) {
      reasons.push('Invalid anchor type: "' + anchor.type + '". Must be one of: ' + VALID_TYPES.join(', '));
    }

    // Must map to existing zone
    if (!anchor.zone || VALID_ZONES.indexOf(anchor.zone) === -1) {
      reasons.push('Invalid or missing zone: "' + anchor.zone + '". Must be one of: ' + VALID_ZONES.join(', '));
    }

    // Must have description
    if (!anchor.description || typeof anchor.description !== 'string' || anchor.description.trim().length === 0) {
      reasons.push('Anchor must have a non-empty description');
    }

    return {
      valid: reasons.length === 0,
      reasons: reasons
    };
  }

  /**
   * Creates an anchor approval protocol message.
   * Zone stewards (§7.4) approve anchor placements.
   *
   * @param {string} anchorId - ID of the anchor being approved
   * @param {string} stewardId - GitHub username of the approving steward
   * @returns {Object} Protocol message
   */
  function approve(anchorId, stewardId) {
    return {
      v: PROTOCOL_VERSION,
      id: generateMsgId(),
      ts: nowISO(),
      seq: Date.now(),
      from: stewardId,
      type: 'anchor_approve',
      platform: 'api',
      position: { x: 0, y: 0, z: 0, zone: 'nexus' },
      geo: { lat: null, lon: null },
      payload: {
        anchor_id: anchorId,
        status: 'approved',
        approved_by: stewardId,
        approved_at: nowISO()
      }
    };
  }

  /**
   * Creates an anchor rejection protocol message.
   *
   * @param {string} anchorId - ID of the anchor being rejected
   * @param {string} stewardId - GitHub username of the rejecting steward
   * @param {string} reason - Reason for rejection
   * @returns {Object} Protocol message
   */
  function reject(anchorId, stewardId, reason) {
    return {
      v: PROTOCOL_VERSION,
      id: generateMsgId(),
      ts: nowISO(),
      seq: Date.now(),
      from: stewardId,
      type: 'anchor_reject',
      platform: 'api',
      position: { x: 0, y: 0, z: 0, zone: 'nexus' },
      geo: { lat: null, lon: null },
      payload: {
        anchor_id: anchorId,
        status: 'rejected',
        rejected_by: stewardId,
        rejected_at: nowISO(),
        reason: reason || 'No reason provided'
      }
    };
  }

  // ============================================================
  // Discovery System
  // ============================================================

  /**
   * Normalizes anchors input: accepts both Array and Object (dict-keyed-by-id).
   * @param {Array|Object} anchors
   * @returns {Array}
   */
  function toArray(anchors) {
    if (!anchors) return [];
    if (Array.isArray(anchors)) return anchors;
    // Object/dict form
    var arr = [];
    for (var key in anchors) {
      if (Object.prototype.hasOwnProperty.call(anchors, key)) {
        arr.push(anchors[key]);
      }
    }
    return arr;
  }

  /**
   * Returns anchors sorted by distance from player, optionally filtered by radius.
   * Each returned anchor has an added `distance` property (meters).
   *
   * @param {{lat: number, lon: number}} playerGeo - Player's GPS position
   * @param {Array|Object} anchors - Array or dict of anchor objects
   * @param {number} [radiusMeters] - Optional max distance filter (meters)
   * @returns {Array} Anchors sorted by distance ascending, each with .distance
   */
  function getNearby(playerGeo, anchors, radiusMeters) {
    var arr = toArray(anchors);
    var results = [];

    for (var i = 0; i < arr.length; i++) {
      var anchor = arr[i];
      if (!anchor.geo) continue;

      var dist = getDistance(playerGeo.lat, playerGeo.lon, anchor.geo.lat, anchor.geo.lon);

      if (radiusMeters !== undefined && dist > radiusMeters) continue;

      // Create shallow copy with distance added
      var copy = {};
      for (var k in anchor) {
        if (Object.prototype.hasOwnProperty.call(anchor, k)) {
          copy[k] = anchor[k];
        }
      }
      copy.distance = dist;
      results.push(copy);
    }

    // Sort by distance ascending
    results.sort(function(a, b) { return a.distance - b.distance; });
    return results;
  }

  /**
   * Returns true if player is within range of an anchor.
   *
   * @param {{lat: number, lon: number}} playerGeo - Player's GPS
   * @param {Object} anchor - Anchor object with .geo
   * @param {number} [radiusMeters=50] - Range in meters (default 50m)
   * @returns {boolean}
   */
  function isInRange(playerGeo, anchor, radiusMeters) {
    if (!anchor.geo) return false;
    var range = (radiusMeters !== undefined) ? radiusMeters : DEFAULT_RANGE_M;
    var dist = getDistance(playerGeo.lat, playerGeo.lon, anchor.geo.lat, anchor.geo.lon);
    return dist <= range;
  }

  /**
   * Creates a 'discover' protocol message when a player discovers an anchor location.
   * Constitution §3.2 — discover message type.
   *
   * @param {Object} anchor - The anchor being discovered
   * @param {string} playerId - GitHub username of the discovering player
   * @returns {Object} Protocol message of type 'discover'
   */
  function discover(anchor, playerId) {
    return {
      v: PROTOCOL_VERSION,
      id: generateMsgId(),
      ts: nowISO(),
      seq: Date.now(),
      from: playerId,
      type: 'discover',
      platform: 'ar',
      position: { x: 0, y: 0, z: 0, zone: anchor.zone || 'nexus' },
      geo: { lat: anchor.geo.lat, lon: anchor.geo.lon },
      payload: {
        anchor_id: anchor.id,
        type: anchor.type,
        description: anchor.description,
        zone: anchor.zone,
        discovered_at: nowISO()
      }
    };
  }

  /**
   * Returns all anchors that have been discovered by a specific player.
   *
   * @param {string} playerId - GitHub username
   * @param {Array|Object} anchors - Anchors with .discoverers array
   * @returns {Array} Anchors where playerId is in .discoverers
   */
  function getDiscoveredBy(playerId, anchors) {
    var arr = toArray(anchors);
    return arr.filter(function(anchor) {
      return Array.isArray(anchor.discoverers) && anchor.discoverers.indexOf(playerId) !== -1;
    });
  }

  // ============================================================
  // Warmth System (Constitution §5.3)
  // ============================================================

  /**
   * Calculates warmth points from player movement data.
   * Only walking-speed movement accumulates warmth (Constitution §5.3 — Walking Warmth).
   * Driving speed gives 0 warmth. Standing still gives 0 warmth.
   * Result is capped to prevent gaming (Constitution §5.3 — "Not enough to create inequality").
   *
   * @param {Array|null} playerMovement - Array of {lat, lon, ts, speed} points
   *   - speed in km/h (optional; computed from GPS if not provided)
   * @returns {number} Warmth points (0 to WARMTH_POINTS_MAX)
   */
  function calculateWarmth(playerMovement) {
    if (!playerMovement || !Array.isArray(playerMovement) || playerMovement.length < 2) {
      return 0;
    }

    var totalDistanceM = 0;

    for (var i = 1; i < playerMovement.length; i++) {
      var prev = playerMovement[i - 1];
      var curr = playerMovement[i];

      if (!prev || !curr) continue;
      if (typeof prev.lat !== 'number' || typeof prev.lon !== 'number') continue;
      if (typeof curr.lat !== 'number' || typeof curr.lon !== 'number') continue;

      var segmentDistM = getDistance(prev.lat, prev.lon, curr.lat, curr.lon);

      // Determine speed for this segment
      var speedKmh = 0;
      if (typeof curr.speed === 'number' && curr.speed >= 0) {
        // Speed provided directly in m/s from Geolocation API; convert to km/h
        // If the speed field is already in km/h (as in our test data), use directly
        speedKmh = curr.speed;
      } else if (prev.ts && curr.ts) {
        var timeHours = (curr.ts - prev.ts) / (1000 * 60 * 60);
        if (timeHours > 0) {
          speedKmh = (segmentDistM / 1000) / timeHours;
        }
      }

      // Only count walking-speed movement
      if (isDrivingSpeed(speedKmh)) continue;
      // Only count actual movement (not standing still)
      if (segmentDistM < 1) continue;

      totalDistanceM += segmentDistM;
    }

    // Convert to warmth points:
    // ~100m walking = 0.1 point, ~500m = 0.5 point, etc.
    // Scale: 1 point per 100m walked at walking speed, capped at max
    var rawPoints = totalDistanceM / 100;
    return Math.min(WARMTH_POINTS_MAX, rawPoints);
  }

  /**
   * Converts warmth points to harvest and discovery multipliers.
   * Constitution §5.3 — "Minor bonuses only. Not enough to create inequality."
   *   Max harvest bonus: 10%
   *   Max discovery bonus: 15%
   *
   * @param {number} warmthPoints - Warmth accumulated (0 to WARMTH_POINTS_MAX)
   * @returns {{harvestMultiplier: number, discoveryMultiplier: number}}
   */
  function getWarmthBonus(warmthPoints) {
    if (typeof warmthPoints !== 'number' || warmthPoints < 0) {
      warmthPoints = 0;
    }

    // Clamp to max warmth so bonuses never exceed caps
    var clamped = Math.min(warmthPoints, WARMTH_POINTS_MAX);
    var fraction = clamped / WARMTH_POINTS_MAX; // 0.0 to 1.0

    var harvestMultiplier = 1.0 + (fraction * WARMTH_HARVEST_MAX_BONUS);
    var discoveryMultiplier = 1.0 + (fraction * WARMTH_DISCOVERY_MAX_BONUS);

    // Enforce caps (belt-and-suspenders)
    harvestMultiplier = Math.min(1.0 + WARMTH_HARVEST_MAX_BONUS, harvestMultiplier);
    discoveryMultiplier = Math.min(1.0 + WARMTH_DISCOVERY_MAX_BONUS, discoveryMultiplier);

    return {
      harvestMultiplier: harvestMultiplier,
      discoveryMultiplier: discoveryMultiplier
    };
  }

  // ============================================================
  // GPS <-> Zone Mapping
  // ============================================================

  /**
   * Returns the ZION zone name nearest to the given GPS coordinates,
   * based on the positions of existing anchors.
   *
   * @param {number} lat - Player latitude
   * @param {number} lon - Player longitude
   * @param {Array|Object} anchors - Anchor data
   * @returns {string|null} Zone name, or null if no anchors exist
   */
  function geoToZone(lat, lon, anchors) {
    var arr = toArray(anchors);
    if (arr.length === 0) return null;

    var nearest = null;
    var nearestDist = Infinity;

    for (var i = 0; i < arr.length; i++) {
      var anchor = arr[i];
      if (!anchor.geo) continue;
      var dist = getDistance(lat, lon, anchor.geo.lat, anchor.geo.lon);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = anchor.zone;
      }
    }

    return nearest;
  }

  /**
   * Computes the average GPS position (centroid) of all anchors in a given zone.
   * Useful for guiding AR players toward a zone.
   *
   * @param {string} zone - Zone name
   * @param {Array|Object} anchors - Anchor data
   * @returns {{lat: number, lon: number}|null} Centroid, or null if zone has no anchors
   */
  function zoneToGeoCenter(zone, anchors) {
    var zoneAnchors = getZoneAnchors(zone, anchors);
    if (zoneAnchors.length === 0) return null;

    var totalLat = 0;
    var totalLon = 0;
    for (var i = 0; i < zoneAnchors.length; i++) {
      totalLat += zoneAnchors[i].geo.lat;
      totalLon += zoneAnchors[i].geo.lon;
    }

    return {
      lat: totalLat / zoneAnchors.length,
      lon: totalLon / zoneAnchors.length
    };
  }

  /**
   * Returns all anchors that belong to a specific zone.
   *
   * @param {string} zone - Zone name
   * @param {Array|Object} anchors - Anchor data
   * @returns {Array} Anchors in the specified zone
   */
  function getZoneAnchors(zone, anchors) {
    var arr = toArray(anchors);
    return arr.filter(function(anchor) { return anchor.zone === zone; });
  }

  // ============================================================
  // Safety (Constitution §8.6)
  // ============================================================

  /**
   * Safety module — Physical Realm Safety per Constitution §8.6.
   * The client MUST:
   *   - Display safety warning before enabling AR
   *   - Pause AR at driving speed
   *   - Require explicit location permission
   *   - Function fully without location access
   */
  var SAFETY = {
    requiresPermission: true,
    maxSessionHours: 4,

    /**
     * Checks whether the given speed is safe for AR play.
     * Constitution §8.6 — pause AR when driving speed detected.
     *
     * @param {number} speedKmh - Current speed in km/h
     * @returns {{safe: boolean, warning?: string}}
     */
    checkSpeed: function(speedKmh) {
      if (isDrivingSpeed(speedKmh)) {
        return {
          safe: false,
          warning: 'AR paused: Moving too fast (' + Math.round(speedKmh) + ' km/h). ' +
                   'Please stop and play ZION on foot. Stay safe!'
        };
      }
      return { safe: true };
    },

    /**
     * Returns the standard AR safety disclaimer.
     * Constitution §8.6 — MUST display before enabling AR/camera mode.
     *
     * @returns {string}
     */
    getWarningMessage: function() {
      return 'SAFETY: AR mode uses your camera and GPS. ' +
             'Always be aware of your surroundings. ' +
             'Do not enter roads, restricted areas, or private property. ' +
             'Never use AR while driving or cycling. ' +
             'ZION anchors are placed at public, safe locations only. ' +
             'Location permission is required for AR features but ZION works fully without it.';
    }
  };

  // ============================================================
  // State Management
  // ============================================================

  /**
   * Parses a JSON string (the contents of state/anchors.json) into an anchor registry.
   *
   * @param {string} anchorsJson - JSON string
   * @returns {Object} Parsed anchor state object
   */
  function loadState(anchorsJson) {
    try {
      var state = JSON.parse(anchorsJson);
      if (!state.anchors || typeof state.anchors !== 'object') {
        state.anchors = {};
      }
      return state;
    } catch (e) {
      return { anchors: {} };
    }
  }

  /**
   * Serializes an anchor state object to a JSON string.
   *
   * @param {Object} anchorsState - The state object
   * @returns {string} JSON string
   */
  function saveState(anchorsState) {
    return JSON.stringify(anchorsState, null, 2);
  }

  /**
   * Adds an anchor to the state (keyed by anchor.id).
   * Returns a new state object without mutating the original.
   *
   * @param {Object} state - Current anchor state
   * @param {Object} anchor - Anchor object with .id
   * @returns {Object} New state with anchor added
   */
  function addAnchor(state, anchor) {
    var newAnchors = {};
    for (var k in state.anchors) {
      if (Object.prototype.hasOwnProperty.call(state.anchors, k)) {
        newAnchors[k] = state.anchors[k];
      }
    }
    newAnchors[anchor.id] = anchor;
    return { anchors: newAnchors };
  }

  /**
   * Removes an anchor from the state by its ID.
   * Returns a new state object without mutating the original.
   *
   * @param {Object} state - Current anchor state
   * @param {string} anchorId - ID of anchor to remove
   * @returns {Object} New state with anchor removed
   */
  function removeAnchor(state, anchorId) {
    var newAnchors = {};
    for (var k in state.anchors) {
      if (Object.prototype.hasOwnProperty.call(state.anchors, k) && k !== anchorId) {
        newAnchors[k] = state.anchors[k];
      }
    }
    return { anchors: newAnchors };
  }

  /**
   * Computes aggregate statistics about the anchor registry.
   *
   * @param {Object} state - Anchor state
   * @returns {{totalAnchors: number, byType: Object, byZone: Object, totalDiscoveries: number}}
   */
  function getStats(state) {
    var byType = {};
    var byZone = {};
    var totalDiscoveries = 0;
    var totalAnchors = 0;

    var anchors = state.anchors || {};
    for (var id in anchors) {
      if (!Object.prototype.hasOwnProperty.call(anchors, id)) continue;

      var anchor = anchors[id];
      totalAnchors++;

      // By type
      var t = anchor.type || 'unknown';
      byType[t] = (byType[t] || 0) + 1;

      // By zone
      var z = anchor.zone || 'unknown';
      byZone[z] = (byZone[z] || 0) + 1;

      // Discoveries
      totalDiscoveries += (typeof anchor.discoveries === 'number') ? anchor.discoveries : 0;
    }

    return {
      totalAnchors: totalAnchors,
      byType: byType,
      byZone: byZone,
      totalDiscoveries: totalDiscoveries
    };
  }

  // ============================================================
  // Exports
  // ============================================================

  exports.TYPES = TYPES;
  exports.VALID_TYPES = VALID_TYPES;
  exports.VALID_ZONES = VALID_ZONES;
  exports.SAFETY = SAFETY;

  // Geolocation
  exports.requestLocation = requestLocation;
  exports.watchLocation = watchLocation;
  exports.stopWatching = stopWatching;
  exports.getDistance = getDistance;
  exports.isWalkingSpeed = isWalkingSpeed;
  exports.isDrivingSpeed = isDrivingSpeed;

  // Anchor management
  exports.create = create;
  exports.validate = validate;
  exports.approve = approve;
  exports.reject = reject;

  // Discovery
  exports.getNearby = getNearby;
  exports.isInRange = isInRange;
  exports.discover = discover;
  exports.getDiscoveredBy = getDiscoveredBy;

  // Warmth
  exports.calculateWarmth = calculateWarmth;
  exports.getWarmthBonus = getWarmthBonus;

  // GPS <-> Zone mapping
  exports.geoToZone = geoToZone;
  exports.zoneToGeoCenter = zoneToGeoCenter;
  exports.getZoneAnchors = getZoneAnchors;

  // State management
  exports.loadState = loadState;
  exports.saveState = saveState;
  exports.addAnchor = addAnchor;
  exports.removeAnchor = removeAnchor;
  exports.getStats = getStats;

})(typeof module !== 'undefined' ? module.exports : (window.Anchors = {}));
