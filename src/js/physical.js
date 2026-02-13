(function(exports) {

  // Anchor types
  const ANCHOR_TYPES = [
    'zone_portal', 'resource_node', 'discovery_point',
    'gathering_spot', 'garden_plot'
  ];

  // Generate unique IDs
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  // Haversine distance calculation (returns km)
  function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const toRad = deg => deg * Math.PI / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  // Validate anchor location
  function validateAnchorLocation(lat, lon) {
    // Check valid range
    if (typeof lat !== 'number' || typeof lon !== 'number') {
      return {safe: false, reason: 'Invalid coordinate types'};
    }

    if (lat < -90 || lat > 90) {
      return {safe: false, reason: 'Latitude out of range (-90 to 90)'};
    }

    if (lon < -180 || lon > 180) {
      return {safe: false, reason: 'Longitude out of range (-180 to 180)'};
    }

    // Check not exactly (0,0) - null island
    if (lat === 0 && lon === 0) {
      return {safe: false, reason: 'Null Island coordinates not allowed'};
    }

    // Check not in ocean (basic check: reject if far from land)
    if (Math.abs(lat) > 85 && Math.abs(lon) > 170) {
      return {safe: false, reason: 'Location appears to be in remote ocean'};
    }

    return {safe: true};
  }

  // Create anchor
  function createAnchor(msg, state) {
    const lat = msg.payload.lat;
    const lon = msg.payload.lon;

    // Validate GPS coordinates
    if (lat === undefined || lon === undefined) {
      return {
        success: false,
        error: 'Missing GPS coordinates'
      };
    }

    const validation = validateAnchorLocation(lat, lon);
    if (!validation.safe) {
      return {
        success: false,
        error: validation.reason
      };
    }

    const anchorType = msg.payload.type || 'discovery_point';
    if (!ANCHOR_TYPES.includes(anchorType)) {
      return {
        success: false,
        error: 'Invalid anchor type'
      };
    }

    const anchor = {
      id: generateId(),
      type: anchorType,
      position: msg.payload.position || {x: 0, y: 0, z: 0},
      zone: msg.payload.zone || 'default',
      lat: lat,
      lon: lon,
      creator: msg.from,
      ts: Date.now(),
      status: 'pending'
    };

    // Initialize state.anchors if needed
    if (!state.anchors) {
      state.anchors = [];
    }

    state.anchors.push(anchor);

    return {
      success: true,
      state: state,
      anchor: anchor
    };
  }

  // Calculate warmth from GPS history
  function calculateWarmth(gpsHistory) {
    // Null-safe: return 0 if no history
    if (!gpsHistory || !Array.isArray(gpsHistory) || gpsHistory.length < 2) {
      return 0;
    }

    let totalKm = 0;
    const maxWalkingSpeed = 25; // km/h - filter out driving

    for (let i = 1; i < gpsHistory.length; i++) {
      const prev = gpsHistory[i - 1];
      const curr = gpsHistory[i];

      // Skip if missing data
      if (!prev.lat || !prev.lon || !curr.lat || !curr.lon || !prev.ts || !curr.ts) {
        continue;
      }

      const distance = haversineDistance(prev.lat, prev.lon, curr.lat, curr.lon);
      const timeHours = (curr.ts - prev.ts) / (1000 * 60 * 60);

      // Skip if time is zero or negative
      if (timeHours <= 0) {
        continue;
      }

      const speed = distance / timeHours;

      // Filter out driving speed
      if (speed <= maxWalkingSpeed) {
        totalKm += distance;
      }
    }

    // Return warmth capped at 100
    const warmth = Math.min(100, totalKm * 10);
    return warmth;
  }

  // Get warmth bonus multiplier
  function getWarmthBonus(warmth) {
    // Null-safe: if warmth is null/undefined, treat as 0
    if (typeof warmth !== 'number' || warmth < 0) {
      warmth = 0;
    }

    // Returns 1.0 + (warmth / 1000)
    // Max 1.1 at warmth=100 (10% bonus)
    return 1.0 + (warmth / 1000);
  }

  // Exports
  exports.ANCHOR_TYPES = ANCHOR_TYPES;
  exports.createAnchor = createAnchor;
  exports.validateAnchorLocation = validateAnchorLocation;
  exports.calculateWarmth = calculateWarmth;
  exports.getWarmthBonus = getWarmthBonus;
  exports.haversineDistance = haversineDistance;

})(typeof module !== 'undefined' ? module.exports : (window.Physical = {}));
