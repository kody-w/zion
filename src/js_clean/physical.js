(function(exports) {
  'use strict';

  // §5.2 — Anchor types from the Constitution
  var ANCHOR_TYPES = ['zone_portal', 'resource_node', 'discovery_point', 'gathering_spot', 'garden_plot'];

  // §8.6 — Physical Realm Safety: validate locations
  function validateAnchorLocation(lat, lon) {
    if (lat === null || lat === undefined || lon === null || lon === undefined) {
      return { safe: false, reason: 'Invalid coordinates' };
    }

    // Null Island rejection
    if (lat === 0 && lon === 0) {
      return { safe: false, reason: 'Null Island (0,0) is not a valid location' };
    }

    // Range checks
    if (lat < -90 || lat > 90) {
      return { safe: false, reason: 'Latitude out of range (-90 to 90)' };
    }

    if (lon < -180 || lon > 180) {
      return { safe: false, reason: 'Longitude out of range (-180 to 180)' };
    }

    return { safe: true };
  }

  function createAnchor(msg, state) {
    var payload = msg.payload;
    var lat = payload.lat;
    var lon = payload.lon;

    var validation = validateAnchorLocation(lat, lon);
    if (!validation.safe) {
      return { success: false, error: validation.reason };
    }

    if (ANCHOR_TYPES.indexOf(payload.type) === -1) {
      return { success: false, error: 'Invalid anchor type: ' + payload.type };
    }

    var anchor = {
      id: 'anchor_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6),
      lat: lat,
      lon: lon,
      type: payload.type,
      position: payload.position || { x: 0, y: 0, z: 0 },
      zone: payload.zone || 'nexus',
      creator: msg.from,
      createdAt: Date.now(),
      approved: false // Requires steward approval per §7.4
    };

    var newAnchors = (state.anchors || []).concat([anchor]);

    return { success: true, anchor: anchor, state: { anchors: newAnchors } };
  }

  // §5.3 — Walking Warmth: gentle bonus for physical movement
  // Haversine distance between two GPS points in meters
  function _haversine(lat1, lon1, lat2, lon2) {
    var R = 6371000; // Earth radius in meters
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLon = (lon2 - lon1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  var MAX_WALKING_SPEED = 2.5; // m/s (~9 km/h, brisk walk/slow jog)
  var WARMTH_CAP = 100;

  function calculateWarmth(gpsHistory) {
    if (!gpsHistory || !Array.isArray(gpsHistory) || gpsHistory.length < 2) {
      return 0;
    }

    var warmth = 0;

    for (var i = 1; i < gpsHistory.length; i++) {
      var prev = gpsHistory[i - 1];
      var curr = gpsHistory[i];

      // Null-safe
      if (!prev.lat || !prev.lon || !curr.lat || !curr.lon) continue;
      if (!prev.ts || !curr.ts) continue;

      var dist = _haversine(prev.lat, prev.lon, curr.lat, curr.lon);
      var timeDelta = (curr.ts - prev.ts) / 1000; // seconds

      if (timeDelta <= 0) continue;

      var speed = dist / timeDelta; // m/s

      // §8.6 — Pause AR gameplay at driving speed; only count walking
      if (speed <= MAX_WALKING_SPEED && speed > 0.05) {
        // 1 warmth per ~10m walked
        warmth += dist / 10;
      }
    }

    // Cap at 100
    return Math.min(Math.ceil(warmth), WARMTH_CAP);
  }

  // §5.3 — Warmth is a "gentle bonus" — max 10% boost
  function getWarmthBonus(warmth) {
    if (!warmth) return 1.0;
    return 1.0 + (warmth / 1000);
  }

  exports.Physical = {
    ANCHOR_TYPES: ANCHOR_TYPES,
    createAnchor: createAnchor,
    validateAnchorLocation: validateAnchorLocation,
    calculateWarmth: calculateWarmth,
    getWarmthBonus: getWarmthBonus
  };

  if (typeof module !== 'undefined') {
    module.exports = exports.Physical;
  }
})(typeof module !== 'undefined' ? module.exports : (window.ZION = window.ZION || {}));
