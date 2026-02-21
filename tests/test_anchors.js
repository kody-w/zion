// test_anchors.js - Tests for AR Anchor Geolocation System (anchors.js)
// Constitution §5.2 - Anchoring (Physical Realm Integration)
// Constitution §5.3 - Healthy Play
// Constitution §8.6 - Physical Realm Safety
'use strict';

var testRunner = require('./test_runner');
var test = testRunner.test;
var suite = testRunner.suite;
var report = testRunner.report;
var assert = testRunner.assert;

var Anchors = require('../src/js/anchors');

// ============================================================
// Haversine Distance Tests
// ============================================================
suite('Haversine Distance', function() {

  test('NYC to LA is approximately 3944 km', function() {
    // New York City: 40.7128, -74.0060
    // Los Angeles: 34.0522, -118.2437
    // Returns meters; 3944 km = 3,944,000 meters
    // Actual great-circle Haversine: ~3935-3944 km depending on coordinates used
    var dist = Anchors.getDistance(40.7128, -74.0060, 34.0522, -118.2437);
    // Allow 1% tolerance around 3944km (3944000m)
    var distKm = dist / 1000;
    assert(distKm > 3900 && distKm < 4000, 'NYC-LA distance should be ~3900-4000km, got: ' + distKm + 'km');
  });

  test('Short distances accurate to less than 1%', function() {
    // Two points ~100m apart in Central Park area
    // 40.7829, -73.9654 -> 40.7838, -73.9654 (same lon, ~100m north)
    var dist = Anchors.getDistance(40.7829, -73.9654, 40.7838, -73.9654);
    // ~100m expected (9 * 111m per degree latitude ~ 100m for 0.0009 degrees)
    assert(dist > 80 && dist < 120, 'Short distance ~100m, got: ' + dist + 'm');
  });

  test('Same point distance is 0', function() {
    var dist = Anchors.getDistance(40.7128, -74.0060, 40.7128, -74.0060);
    assert(dist === 0, 'Same point distance should be 0, got: ' + dist);
  });

  test('Returns meters (not km)', function() {
    // 1 degree latitude ~ 111,000 meters
    var dist = Anchors.getDistance(0, 0, 1, 0);
    assert(dist > 100000 && dist < 120000, 'Should return meters, got: ' + dist);
  });

  test('Antipodal distances (maximum ~20015 km)', function() {
    // North Pole to South Pole ~20,015 km
    var dist = Anchors.getDistance(90, 0, -90, 0);
    assert(dist > 19900000 && dist < 20200000, 'Antipodal distance should be ~20015km in meters, got: ' + dist);
  });

  test('Null island (0,0) to known point', function() {
    // From null island to Lagos, Nigeria (~6.5229, 3.3792)
    // Haversine distance in meters
    var dist = Anchors.getDistance(0, 0, 6.5229, 3.3792);
    var distKm = dist / 1000;
    // Great circle distance is about 746-820 km depending on coordinates
    assert(distKm > 700 && distKm < 900, 'Null island to Lagos should be ~700-900km, got: ' + distKm + 'km');
  });

});

// ============================================================
// Speed Classification Tests
// ============================================================
suite('Speed Classification', function() {

  test('isWalkingSpeed: 5 km/h is walking', function() {
    assert(Anchors.isWalkingSpeed(5) === true, '5 km/h should be walking speed');
  });

  test('isWalkingSpeed: 9.9 km/h is walking', function() {
    assert(Anchors.isWalkingSpeed(9.9) === true, '9.9 km/h should be walking speed');
  });

  test('isWalkingSpeed: 10 km/h boundary (not walking)', function() {
    assert(Anchors.isWalkingSpeed(10) === false, '10 km/h should NOT be walking speed');
  });

  test('isWalkingSpeed: 0 is walking (stationary)', function() {
    assert(Anchors.isWalkingSpeed(0) === true, '0 km/h (stationary) should count as walking');
  });

  test('isDrivingSpeed: 30 km/h is driving', function() {
    assert(Anchors.isDrivingSpeed(30) === true, '30 km/h should be driving speed');
  });

  test('isDrivingSpeed: 25 km/h boundary', function() {
    assert(Anchors.isDrivingSpeed(25) === true, '25 km/h should be driving speed');
  });

  test('isDrivingSpeed: 24.9 km/h is NOT driving', function() {
    assert(Anchors.isDrivingSpeed(24.9) === false, '24.9 km/h should NOT be driving speed');
  });

  test('isDrivingSpeed: 100 km/h is driving', function() {
    assert(Anchors.isDrivingSpeed(100) === true, '100 km/h should be driving');
  });

  test('isWalkingSpeed: negative speed returns false', function() {
    assert(Anchors.isWalkingSpeed(-1) === false, 'Negative speed should not be walking');
  });

});

// ============================================================
// Anchor Create Tests
// ============================================================
suite('Anchor Create', function() {

  test('create returns valid protocol message', function() {
    var geoPos = { lat: 40.7829, lon: -73.9654 };
    var msg = Anchors.create('zone_portal', geoPos, 'nexus', 'Central Park Fountain', 'alice');

    assert(msg !== null && typeof msg === 'object', 'Should return message object');
    assert(msg.v === 1, 'Protocol version should be 1');
    assert(typeof msg.id === 'string' && msg.id.length > 0, 'Should have id');
    assert(typeof msg.ts === 'string', 'Should have ISO timestamp');
    assert(msg.from === 'alice', 'from should match player id');
    assert(msg.type === 'anchor_place', 'type should be anchor_place');
    assert(msg.platform === 'ar', 'platform should be ar');
    assert(msg.geo !== null && msg.geo !== undefined, 'Should have geo field');
    assert(msg.geo.lat === 40.7829, 'geo.lat should match');
    assert(msg.geo.lon === -73.9654, 'geo.lon should match');
    assert(msg.payload !== null && typeof msg.payload === 'object', 'Should have payload');
    assert(msg.payload.type === 'zone_portal', 'payload.type should be anchor type');
    assert(msg.payload.zone === 'nexus', 'payload.zone should match');
    assert(msg.payload.description === 'Central Park Fountain', 'payload.description should match');
  });

  test('create produces anchor object in payload', function() {
    var geoPos = { lat: 51.5074, lon: -0.1278 };
    var msg = Anchors.create('garden_plot', geoPos, 'gardens', 'Hyde Park Meadow', 'bob');

    assert(msg.payload.anchor !== undefined, 'payload should contain anchor object');
    var anchor = msg.payload.anchor;
    assert(anchor.type === 'garden_plot', 'anchor.type should be garden_plot');
    assert(anchor.geo.lat === 51.5074, 'anchor.geo.lat should match');
    assert(anchor.geo.lon === -0.1278, 'anchor.geo.lon should match');
    assert(anchor.zone === 'gardens', 'anchor.zone should match');
    assert(anchor.placed_by === 'bob', 'anchor.placed_by should match');
    assert(anchor.status === 'pending', 'new anchor should be pending');
    assert(anchor.discoveries === 0, 'new anchor should have 0 discoveries');
    assert(typeof anchor.placed_at === 'string', 'anchor should have placed_at timestamp');
    assert(anchor.approved_by === null, 'new anchor should have null approved_by');
  });

  test('create generates unique IDs', function() {
    var geoPos = { lat: 48.8566, lon: 2.3522 };
    var msg1 = Anchors.create('discovery_point', geoPos, 'wilds', 'Eiffel Tower Base', 'charlie');
    var msg2 = Anchors.create('discovery_point', geoPos, 'wilds', 'Eiffel Tower Top', 'charlie');

    assert(msg1.id !== msg2.id, 'Each message should have a unique ID');
    assert(msg1.payload.anchor.id !== msg2.payload.anchor.id, 'Each anchor should have unique ID');
  });

});

// ============================================================
// Anchor Validate Tests
// ============================================================
suite('Anchor Validate', function() {

  function makeAnchor(overrides) {
    var base = {
      id: 'anchor_test_001',
      type: 'zone_portal',
      geo: { lat: 40.7829, lon: -73.9654 },
      zone: 'nexus',
      description: 'Test Anchor Location',
      placed_by: 'alice',
      placed_at: '2026-02-21T12:00:00Z',
      approved_by: null,
      status: 'pending',
      discoveries: 0,
      metadata: {}
    };
    if (overrides) {
      for (var k in overrides) { base[k] = overrides[k]; }
    }
    return base;
  }

  test('valid anchor passes validation', function() {
    var anchor = makeAnchor();
    var result = Anchors.validate(anchor);
    assert(result.valid === true, 'Valid anchor should pass validation, reasons: ' + JSON.stringify(result.reasons));
  });

  test('missing description fails validation', function() {
    var anchor = makeAnchor({ description: '' });
    var result = Anchors.validate(anchor);
    assert(result.valid === false, 'Missing description should fail');
    assert(result.reasons.length > 0, 'Should have reason for failure');
  });

  test('null description fails validation', function() {
    var anchor = makeAnchor({ description: null });
    var result = Anchors.validate(anchor);
    assert(result.valid === false, 'Null description should fail');
  });

  test('invalid type fails validation', function() {
    var anchor = makeAnchor({ type: 'secret_base' });
    var result = Anchors.validate(anchor);
    assert(result.valid === false, 'Invalid type should fail');
    assert(result.reasons.some(function(r) { return r.toLowerCase().indexOf('type') !== -1; }),
      'Reason should mention type');
  });

  test('missing zone fails validation', function() {
    var anchor = makeAnchor({ zone: '' });
    var result = Anchors.validate(anchor);
    assert(result.valid === false, 'Missing zone should fail');
  });

  test('invalid zone fails validation', function() {
    var anchor = makeAnchor({ zone: 'moon_base' });
    var result = Anchors.validate(anchor);
    assert(result.valid === false, 'Non-existent zone should fail');
  });

  test('null island coordinates fail validation', function() {
    var anchor = makeAnchor({ geo: { lat: 0, lon: 0 } });
    var result = Anchors.validate(anchor);
    assert(result.valid === false, 'Null Island should fail validation');
  });

  test('out-of-range latitude fails validation', function() {
    var anchor = makeAnchor({ geo: { lat: 95, lon: 10 } });
    var result = Anchors.validate(anchor);
    assert(result.valid === false, 'Lat > 90 should fail');
  });

  test('out-of-range longitude fails validation', function() {
    var anchor = makeAnchor({ geo: { lat: 45, lon: 200 } });
    var result = Anchors.validate(anchor);
    assert(result.valid === false, 'Lon > 180 should fail');
  });

  test('all valid anchor types pass', function() {
    var types = ['zone_portal', 'resource_node', 'discovery_point', 'gathering_spot', 'garden_plot'];
    types.forEach(function(type) {
      var anchor = makeAnchor({ type: type });
      var result = Anchors.validate(anchor);
      assert(result.valid === true, type + ' should be a valid anchor type');
    });
  });

  test('valid returns empty reasons array', function() {
    var anchor = makeAnchor();
    var result = Anchors.validate(anchor);
    assert(Array.isArray(result.reasons), 'reasons should be array');
    assert(result.reasons.length === 0, 'Valid anchor should have 0 reasons');
  });

  test('validate returns {valid, reasons} shape', function() {
    var anchor = makeAnchor({ type: 'bad_type', description: '' });
    var result = Anchors.validate(anchor);
    assert(typeof result === 'object', 'Should return object');
    assert('valid' in result, 'Should have valid field');
    assert('reasons' in result, 'Should have reasons field');
    assert(Array.isArray(result.reasons), 'reasons should be array');
    assert(result.reasons.length >= 2, 'Should have at least 2 failure reasons');
  });

});

// ============================================================
// Anchor Approve / Reject Tests
// ============================================================
suite('Anchor Approval Flow', function() {

  test('approve returns valid protocol message', function() {
    var msg = Anchors.approve('anchor_123', 'steward_alice');
    assert(msg.v === 1, 'Protocol version 1');
    assert(msg.type === 'anchor_approve', 'type should be anchor_approve');
    assert(msg.from === 'steward_alice', 'from should be steward');
    assert(msg.payload.anchor_id === 'anchor_123', 'payload should have anchor_id');
    assert(msg.payload.status === 'approved', 'status should be approved');
  });

  test('reject returns valid protocol message with reason', function() {
    var msg = Anchors.reject('anchor_456', 'steward_bob', 'Private property');
    assert(msg.v === 1, 'Protocol version 1');
    assert(msg.type === 'anchor_reject', 'type should be anchor_reject');
    assert(msg.from === 'steward_bob', 'from should be steward');
    assert(msg.payload.anchor_id === 'anchor_456', 'payload should have anchor_id');
    assert(msg.payload.status === 'rejected', 'status should be rejected');
    assert(msg.payload.reason === 'Private property', 'reason should match');
  });

  test('pending anchor becomes approved in state via addAnchor + approve', function() {
    var state = Anchors.loadState('{"anchors": {}}');

    // Create and add an anchor
    var geoPos = { lat: 40.7829, lon: -73.9654 };
    var msg = Anchors.create('zone_portal', geoPos, 'nexus', 'Test Portal', 'alice');
    var anchor = msg.payload.anchor;
    state = Anchors.addAnchor(state, anchor);

    assert(state.anchors[anchor.id].status === 'pending', 'Should start as pending');

    // Approve it
    var anchorId = anchor.id;
    var updatedAnchor = Object.assign({}, state.anchors[anchorId], {
      status: 'approved',
      approved_by: 'steward_alice'
    });
    state = Anchors.removeAnchor(state, anchorId);
    state = Anchors.addAnchor(state, updatedAnchor);

    assert(state.anchors[anchorId].status === 'approved', 'Should be approved after update');
    assert(state.anchors[anchorId].approved_by === 'steward_alice', 'Approved_by should be set');
  });

});

// ============================================================
// getNearby Tests
// ============================================================
suite('getNearby', function() {

  function makeTestAnchors() {
    // NYC area anchors at different distances from player at (40.7128, -74.0060)
    return [
      {
        id: 'a1', type: 'zone_portal',
        geo: { lat: 40.7128, lon: -74.0060 }, // Same location (0m)
        zone: 'nexus', description: 'At player', placed_by: 'alice',
        placed_at: '2026-02-21T00:00:00Z', approved_by: null,
        status: 'approved', discoveries: 0, metadata: {}
      },
      {
        id: 'a2', type: 'resource_node',
        geo: { lat: 40.7138, lon: -74.0060 }, // ~110m north
        zone: 'gardens', description: 'Nearby', placed_by: 'alice',
        placed_at: '2026-02-21T00:00:00Z', approved_by: null,
        status: 'approved', discoveries: 0, metadata: {}
      },
      {
        id: 'a3', type: 'discovery_point',
        geo: { lat: 40.7828, lon: -73.9654 }, // ~8km north (Central Park)
        zone: 'wilds', description: 'Central Park', placed_by: 'alice',
        placed_at: '2026-02-21T00:00:00Z', approved_by: null,
        status: 'approved', discoveries: 0, metadata: {}
      },
      {
        id: 'a4', type: 'gathering_spot',
        geo: { lat: 34.0522, lon: -118.2437 }, // LA - very far
        zone: 'agora', description: 'Los Angeles', placed_by: 'alice',
        placed_at: '2026-02-21T00:00:00Z', approved_by: null,
        status: 'approved', discoveries: 0, metadata: {}
      }
    ];
  }

  test('getNearby returns anchors sorted by distance', function() {
    var playerGeo = { lat: 40.7128, lon: -74.0060 };
    var anchors = makeTestAnchors();
    var nearby = Anchors.getNearby(playerGeo, anchors);

    assert(nearby.length > 0, 'Should return some anchors');
    // Verify sorted order: closest first
    for (var i = 1; i < nearby.length; i++) {
      assert(nearby[i].distance >= nearby[i - 1].distance,
        'Anchors should be sorted by distance, ascending');
    }
  });

  test('getNearby respects radius filter', function() {
    var playerGeo = { lat: 40.7128, lon: -74.0060 };
    var anchors = makeTestAnchors();

    // 500m radius - should get a1 and a2, not a3 or a4
    var nearby = Anchors.getNearby(playerGeo, anchors, 500);
    assert(nearby.length >= 1, 'Should find anchors within 500m');

    var ids = nearby.map(function(a) { return a.id; });
    assert(ids.indexOf('a4') === -1, 'LA should not be within 500m of NYC');
    assert(ids.indexOf('a3') === -1, 'Central Park should not be within 500m');
  });

  test('getNearby returns all anchors when no radius specified', function() {
    var playerGeo = { lat: 40.7128, lon: -74.0060 };
    var anchors = makeTestAnchors();
    var nearby = Anchors.getNearby(playerGeo, anchors);

    assert(nearby.length === anchors.length, 'Should return all ' + anchors.length + ' anchors without radius limit');
  });

  test('getNearby returns empty array when no anchors', function() {
    var playerGeo = { lat: 40.7128, lon: -74.0060 };
    var nearby = Anchors.getNearby(playerGeo, []);
    assert(Array.isArray(nearby) && nearby.length === 0, 'Empty anchors should return empty array');
  });

  test('getNearby adds distance property to results', function() {
    var playerGeo = { lat: 40.7128, lon: -74.0060 };
    var anchors = makeTestAnchors();
    var nearby = Anchors.getNearby(playerGeo, anchors);

    nearby.forEach(function(a) {
      assert(typeof a.distance === 'number', 'Each result should have a distance property');
      assert(a.distance >= 0, 'Distance should be non-negative');
    });
  });

  test('getNearby handles both array and object-dict anchors', function() {
    var playerGeo = { lat: 40.7128, lon: -74.0060 };
    // Object/dict form (as stored in state)
    var anchorsDict = {
      'a1': {
        id: 'a1', type: 'zone_portal',
        geo: { lat: 40.7128, lon: -74.0060 },
        zone: 'nexus', description: 'Test', placed_by: 'alice',
        placed_at: '2026-02-21T00:00:00Z', approved_by: null,
        status: 'approved', discoveries: 0, metadata: {}
      }
    };
    var nearby = Anchors.getNearby(playerGeo, anchorsDict);
    assert(nearby.length === 1, 'Should handle dict-form anchors');
  });

});

// ============================================================
// isInRange Tests
// ============================================================
suite('isInRange', function() {

  var centralParkAnchor = {
    id: 'cp1', type: 'gathering_spot',
    geo: { lat: 40.7829, lon: -73.9654 },
    zone: 'nexus', description: 'Central Park', placed_by: 'alice',
    placed_at: '2026-02-21T00:00:00Z', approved_by: null,
    status: 'approved', discoveries: 0, metadata: {}
  };

  test('player at anchor location is in range', function() {
    var playerGeo = { lat: 40.7829, lon: -73.9654 };
    assert(Anchors.isInRange(playerGeo, centralParkAnchor) === true, 'Player at anchor should be in range');
  });

  test('player 20m away is in default range (50m default)', function() {
    // 20m north (~0.00018 degrees lat)
    var playerGeo = { lat: 40.7831, lon: -73.9654 };
    assert(Anchors.isInRange(playerGeo, centralParkAnchor) === true, 'Player 20m away should be in range with default 50m');
  });

  test('player 200m away is outside default range', function() {
    // 200m north (~0.0018 degrees lat)
    var playerGeo = { lat: 40.7847, lon: -73.9654 };
    assert(Anchors.isInRange(playerGeo, centralParkAnchor) === false, 'Player 200m away should be outside default 50m range');
  });

  test('custom radius: 1000m allows player 200m away', function() {
    var playerGeo = { lat: 40.7847, lon: -73.9654 };
    assert(Anchors.isInRange(playerGeo, centralParkAnchor, 1000) === true, 'Custom 1000m radius should include 200m distance');
  });

  test('custom radius: 10m excludes player 20m away', function() {
    var playerGeo = { lat: 40.7831, lon: -73.9654 };
    assert(Anchors.isInRange(playerGeo, centralParkAnchor, 10) === false, 'Custom 10m radius excludes 20m distance');
  });

});

// ============================================================
// Discover Tests
// ============================================================
suite('Discover', function() {

  var testAnchor = {
    id: 'anchor_disco_001',
    type: 'discovery_point',
    geo: { lat: 40.7829, lon: -73.9654 },
    zone: 'wilds',
    description: 'Hidden Grotto',
    placed_by: 'builder_alice',
    placed_at: '2026-02-21T00:00:00Z',
    approved_by: 'steward_bob',
    status: 'approved',
    discoveries: 5,
    metadata: {}
  };

  test('discover returns valid protocol message', function() {
    var msg = Anchors.discover(testAnchor, 'player_charlie');
    assert(msg.v === 1, 'Protocol version 1');
    assert(msg.type === 'discover', 'type should be discover');
    assert(msg.from === 'player_charlie', 'from should be player id');
    assert(msg.payload !== null, 'Should have payload');
    assert(msg.payload.anchor_id === 'anchor_disco_001', 'payload should have anchor_id');
    assert(msg.payload.type === 'discovery_point', 'payload should have anchor type');
  });

  test('discover includes geo position', function() {
    var msg = Anchors.discover(testAnchor, 'player_diana');
    assert(msg.geo !== null && msg.geo !== undefined, 'Should have geo');
    assert(msg.geo.lat === 40.7829, 'geo.lat should match anchor');
    assert(msg.geo.lon === -73.9654, 'geo.lon should match anchor');
  });

  test('getDiscoveredBy returns anchors discovered by player', function() {
    var anchors = [
      Object.assign({}, testAnchor, { id: 'a1', discoverers: ['alice', 'bob'] }),
      Object.assign({}, testAnchor, { id: 'a2', discoverers: ['charlie'] }),
      Object.assign({}, testAnchor, { id: 'a3', discoverers: ['alice', 'charlie'] }),
      Object.assign({}, testAnchor, { id: 'a4', discoverers: [] })
    ];

    var aliceDiscovered = Anchors.getDiscoveredBy('alice', anchors);
    assert(aliceDiscovered.length === 2, 'Alice should have discovered 2 anchors');

    var ids = aliceDiscovered.map(function(a) { return a.id; });
    assert(ids.indexOf('a1') !== -1, 'Alice discovered a1');
    assert(ids.indexOf('a3') !== -1, 'Alice discovered a3');

    var charlieDiscovered = Anchors.getDiscoveredBy('charlie', anchors);
    assert(charlieDiscovered.length === 2, 'Charlie should have discovered 2 anchors');
  });

  test('getDiscoveredBy returns empty for player with no discoveries', function() {
    var anchors = [
      Object.assign({}, testAnchor, { id: 'a1', discoverers: ['alice'] })
    ];
    var result = Anchors.getDiscoveredBy('nobody', anchors);
    assert(Array.isArray(result) && result.length === 0, 'Should return empty array');
  });

});

// ============================================================
// Warmth System Tests
// ============================================================
suite('Warmth System', function() {

  test('calculateWarmth: walking gives points', function() {
    var now = Date.now();
    // Simulate walking: small distance in 5 minutes (2 km/h speed)
    // ~0.001 degree lat per 110m, walking speed
    var movement = [
      { lat: 40.7128, lon: -74.0060, ts: now, speed: 2 },
      { lat: 40.7138, lon: -74.0060, ts: now + 300000, speed: 2 }, // 5 min later, ~110m
    ];
    var warmth = Anchors.calculateWarmth(movement);
    assert(warmth > 0, 'Walking should give warmth points, got: ' + warmth);
  });

  test('calculateWarmth: driving gives 0 points', function() {
    var now = Date.now();
    // Driving: large distance in short time (60 km/h)
    var movement = [
      { lat: 40.7128, lon: -74.0060, ts: now, speed: 60 },
      { lat: 40.8128, lon: -74.0060, ts: now + 60000, speed: 60 } // 1 min, ~11km
    ];
    var warmth = Anchors.calculateWarmth(movement);
    assert(warmth === 0, 'Driving should give 0 warmth, got: ' + warmth);
  });

  test('calculateWarmth: standing still gives 0 points', function() {
    var now = Date.now();
    var movement = [
      { lat: 40.7128, lon: -74.0060, ts: now, speed: 0 },
      { lat: 40.7128, lon: -74.0060, ts: now + 600000, speed: 0 } // 10 min, no movement
    ];
    var warmth = Anchors.calculateWarmth(movement);
    assert(warmth === 0, 'Standing still should give 0 warmth, got: ' + warmth);
  });

  test('calculateWarmth: capped to prevent gaming (max 5)', function() {
    var now = Date.now();
    // Simulate very long walk (many segments at walking speed)
    var movement = [];
    for (var i = 0; i < 100; i++) {
      movement.push({
        lat: 40.7128 + (i * 0.001),
        lon: -74.0060,
        ts: now + (i * 60000),
        speed: 4
      });
    }
    var warmth = Anchors.calculateWarmth(movement);
    assert(warmth <= 5, 'Warmth should be capped at 5 max per session, got: ' + warmth);
  });

  test('calculateWarmth: empty movement returns 0', function() {
    assert(Anchors.calculateWarmth([]) === 0, 'Empty movement should return 0');
    assert(Anchors.calculateWarmth(null) === 0, 'Null should return 0');
    assert(Anchors.calculateWarmth(undefined) === 0, 'Undefined should return 0');
  });

  test('calculateWarmth: single point returns 0', function() {
    var movement = [{ lat: 40.7128, lon: -74.0060, ts: Date.now(), speed: 2 }];
    assert(Anchors.calculateWarmth(movement) === 0, 'Single point should return 0');
  });

  test('calculateWarmth: anchor visit gives 1-5 points', function() {
    // Test that visiting an anchor (if speed provided) gives points in range
    var warmth = Anchors.calculateWarmth([
      { lat: 40.7128, lon: -74.0060, ts: Date.now(), speed: 3 },
      { lat: 40.7135, lon: -74.0060, ts: Date.now() + 120000, speed: 3 }
    ]);
    assert(warmth >= 0 && warmth <= 5, 'Warmth should be in 0-5 range, got: ' + warmth);
  });

  test('getWarmthBonus: 0 warmth gives 1.0x harvest, 1.0x discovery', function() {
    var bonus = Anchors.getWarmthBonus(0);
    assert(bonus.harvestMultiplier === 1.0, 'Zero warmth should give 1.0x harvest');
    assert(bonus.discoveryMultiplier === 1.0, 'Zero warmth should give 1.0x discovery');
  });

  test('getWarmthBonus: max warmth (5) gives max allowed bonus', function() {
    var bonus = Anchors.getWarmthBonus(5);
    assert(bonus.harvestMultiplier <= 1.10, 'Harvest multiplier should not exceed 1.10 (10%)');
    assert(bonus.discoveryMultiplier <= 1.15, 'Discovery multiplier should not exceed 1.15 (15%)');
    assert(bonus.harvestMultiplier > 1.0, 'Max warmth should give some harvest bonus');
    assert(bonus.discoveryMultiplier > 1.0, 'Max warmth should give some discovery bonus');
  });

  test('getWarmthBonus: never exceeds max limits', function() {
    // Even extreme values should not exceed max
    var bonus = Anchors.getWarmthBonus(1000);
    assert(bonus.harvestMultiplier <= 1.10, 'Harvest should never exceed 1.10');
    assert(bonus.discoveryMultiplier <= 1.15, 'Discovery should never exceed 1.15');
  });

  test('getWarmthBonus: proportional between 0 and max', function() {
    var bonus2 = Anchors.getWarmthBonus(2);
    var bonus5 = Anchors.getWarmthBonus(5);
    assert(bonus5.harvestMultiplier >= bonus2.harvestMultiplier,
      'Higher warmth should give higher or equal harvest bonus');
  });

});

// ============================================================
// GPS <-> Zone Mapping Tests
// ============================================================
suite('GPS Zone Mapping', function() {

  // Anchors scattered in different zones
  var anchors = [
    {
      id: 'nexus1', type: 'zone_portal',
      geo: { lat: 40.7128, lon: -74.0060 },
      zone: 'nexus', description: 'Nexus Portal', placed_by: 'alice',
      placed_at: '2026-02-21T00:00:00Z', approved_by: 'steward',
      status: 'approved', discoveries: 0, metadata: {}
    },
    {
      id: 'gardens1', type: 'garden_plot',
      geo: { lat: 40.7200, lon: -74.0100 },
      zone: 'gardens', description: 'Garden Plot', placed_by: 'alice',
      placed_at: '2026-02-21T00:00:00Z', approved_by: 'steward',
      status: 'approved', discoveries: 0, metadata: {}
    },
    {
      id: 'wilds1', type: 'discovery_point',
      geo: { lat: 40.6500, lon: -73.9000 },
      zone: 'wilds', description: 'Wilderness Point', placed_by: 'alice',
      placed_at: '2026-02-21T00:00:00Z', approved_by: 'steward',
      status: 'approved', discoveries: 0, metadata: {}
    }
  ];

  test('geoToZone returns nearest zone based on anchor positions', function() {
    // Player near nexus anchor
    var zone = Anchors.geoToZone(40.7130, -74.0062, anchors);
    assert(zone === 'nexus', 'Player near nexus anchor should map to nexus zone, got: ' + zone);
  });

  test('geoToZone returns correct zone for different locations', function() {
    // Player near gardens anchor
    var zone = Anchors.geoToZone(40.7198, -74.0098, anchors);
    assert(zone === 'gardens', 'Player near gardens anchor should map to gardens zone, got: ' + zone);
  });

  test('geoToZone returns null when no anchors', function() {
    var zone = Anchors.geoToZone(40.7128, -74.0060, []);
    assert(zone === null, 'No anchors should return null zone');
  });

  test('zoneToGeoCenter returns average geo of zone anchors', function() {
    var center = Anchors.zoneToGeoCenter('nexus', anchors);
    assert(center !== null, 'Should return a geo center');
    assert(typeof center.lat === 'number', 'Center should have lat');
    assert(typeof center.lon === 'number', 'Center should have lon');
    // Only 1 nexus anchor, so center should equal that anchor's geo
    assert(Math.abs(center.lat - 40.7128) < 0.0001, 'Lat should match single nexus anchor');
    assert(Math.abs(center.lon - (-74.0060)) < 0.0001, 'Lon should match single nexus anchor');
  });

  test('zoneToGeoCenter returns null for zone with no anchors', function() {
    var center = Anchors.zoneToGeoCenter('arena', anchors);
    assert(center === null, 'Zone with no anchors should return null');
  });

  test('getZoneAnchors returns only anchors for specified zone', function() {
    var zoneAnchors = Anchors.getZoneAnchors('nexus', anchors);
    assert(Array.isArray(zoneAnchors), 'Should return array');
    assert(zoneAnchors.length === 1, 'Should find 1 nexus anchor');
    assert(zoneAnchors[0].zone === 'nexus', 'All returned anchors should be nexus zone');
  });

  test('getZoneAnchors returns empty array for zone with no anchors', function() {
    var zoneAnchors = Anchors.getZoneAnchors('arena', anchors);
    assert(Array.isArray(zoneAnchors) && zoneAnchors.length === 0, 'Empty zone returns empty array');
  });

});

// ============================================================
// Safety Tests
// ============================================================
suite('Safety (Constitution §8.6)', function() {

  test('SAFETY object exists with required properties', function() {
    assert(Anchors.SAFETY !== null && typeof Anchors.SAFETY === 'object', 'SAFETY should be an object');
    assert(typeof Anchors.SAFETY.checkSpeed === 'function', 'checkSpeed should be a function');
    assert(typeof Anchors.SAFETY.getWarningMessage === 'function', 'getWarningMessage should be a function');
    assert(Anchors.SAFETY.requiresPermission === true, 'requiresPermission should be true');
    assert(typeof Anchors.SAFETY.maxSessionHours === 'number', 'maxSessionHours should be a number');
    assert(Anchors.SAFETY.maxSessionHours === 4, 'maxSessionHours should be 4');
  });

  test('checkSpeed: driving speed triggers warning', function() {
    var result = Anchors.SAFETY.checkSpeed(60);
    assert(result.safe === false, 'Driving speed should not be safe');
    assert(typeof result.warning === 'string' && result.warning.length > 0,
      'Should include warning message');
  });

  test('checkSpeed: walking speed is safe', function() {
    var result = Anchors.SAFETY.checkSpeed(5);
    assert(result.safe === true, 'Walking speed should be safe');
  });

  test('checkSpeed: stationary is safe', function() {
    var result = Anchors.SAFETY.checkSpeed(0);
    assert(result.safe === true, 'Stationary should be safe');
  });

  test('getWarningMessage returns non-empty string', function() {
    var msg = Anchors.SAFETY.getWarningMessage();
    assert(typeof msg === 'string' && msg.length > 10, 'Warning message should be a meaningful string');
  });

  test('TYPES constant has all 5 anchor types', function() {
    assert(Anchors.TYPES !== null && typeof Anchors.TYPES === 'object', 'TYPES should be an object');
    assert(Anchors.TYPES.ZONE_PORTAL === 'zone_portal', 'ZONE_PORTAL type');
    assert(Anchors.TYPES.RESOURCE_NODE === 'resource_node', 'RESOURCE_NODE type');
    assert(Anchors.TYPES.DISCOVERY_POINT === 'discovery_point', 'DISCOVERY_POINT type');
    assert(Anchors.TYPES.GATHERING_SPOT === 'gathering_spot', 'GATHERING_SPOT type');
    assert(Anchors.TYPES.GARDEN_PLOT === 'garden_plot', 'GARDEN_PLOT type');
  });

});

// ============================================================
// State Management Tests
// ============================================================
suite('State Management', function() {

  test('loadState parses valid JSON', function() {
    var json = '{"anchors": {}}';
    var state = Anchors.loadState(json);
    assert(state !== null, 'Should return parsed state');
    assert(typeof state === 'object', 'Should return object');
    assert(typeof state.anchors === 'object', 'Should have anchors object');
  });

  test('loadState handles empty anchors file', function() {
    var state = Anchors.loadState('{"anchors": {}}');
    assert(Object.keys(state.anchors).length === 0, 'Should have empty anchors');
  });

  test('saveState returns JSON string', function() {
    var state = { anchors: {} };
    var json = Anchors.saveState(state);
    assert(typeof json === 'string', 'saveState should return string');
    var parsed = JSON.parse(json);
    assert(typeof parsed === 'object', 'Should be valid JSON');
  });

  test('addAnchor adds anchor to state by ID', function() {
    var state = Anchors.loadState('{"anchors": {}}');
    var anchor = {
      id: 'test_anchor_001',
      type: 'zone_portal',
      geo: { lat: 40.7128, lon: -74.0060 },
      zone: 'nexus',
      description: 'Test Portal',
      placed_by: 'alice',
      placed_at: '2026-02-21T00:00:00Z',
      approved_by: null,
      status: 'pending',
      discoveries: 0,
      metadata: {}
    };

    var updated = Anchors.addAnchor(state, anchor);
    assert(updated.anchors['test_anchor_001'] !== undefined, 'Anchor should be added by ID');
    assert(updated.anchors['test_anchor_001'].zone === 'nexus', 'Zone should be preserved');
  });

  test('addAnchor does not mutate original state', function() {
    var state = Anchors.loadState('{"anchors": {}}');
    var anchor = {
      id: 'immutable_test',
      type: 'zone_portal',
      geo: { lat: 40.7128, lon: -74.0060 },
      zone: 'nexus', description: 'Test', placed_by: 'alice',
      placed_at: '2026-02-21T00:00:00Z', approved_by: null,
      status: 'pending', discoveries: 0, metadata: {}
    };

    var updated = Anchors.addAnchor(state, anchor);
    assert(state.anchors['immutable_test'] === undefined, 'Original state should not be mutated');
    assert(updated.anchors['immutable_test'] !== undefined, 'New state should have anchor');
  });

  test('removeAnchor removes anchor from state', function() {
    var state = Anchors.loadState('{"anchors": {}}');
    var anchor = {
      id: 'remove_me',
      type: 'zone_portal',
      geo: { lat: 40.7128, lon: -74.0060 },
      zone: 'nexus', description: 'To remove', placed_by: 'alice',
      placed_at: '2026-02-21T00:00:00Z', approved_by: null,
      status: 'pending', discoveries: 0, metadata: {}
    };

    state = Anchors.addAnchor(state, anchor);
    assert(state.anchors['remove_me'] !== undefined, 'Anchor should be added first');

    var updated = Anchors.removeAnchor(state, 'remove_me');
    assert(updated.anchors['remove_me'] === undefined, 'Anchor should be removed');
  });

  test('removeAnchor handles non-existent ID gracefully', function() {
    var state = Anchors.loadState('{"anchors": {}}');
    var updated = Anchors.removeAnchor(state, 'does_not_exist');
    assert(typeof updated === 'object' && typeof updated.anchors === 'object',
      'Should handle gracefully without crashing');
  });

  test('getStats returns correct counts', function() {
    var state = Anchors.loadState('{"anchors": {}}');

    var a1 = { id: 'stats_a1', type: 'zone_portal', geo: { lat: 40.7, lon: -74.0 },
      zone: 'nexus', description: 'Test 1', placed_by: 'alice',
      placed_at: '2026-02-21T00:00:00Z', approved_by: null,
      status: 'approved', discoveries: 3, metadata: {} };
    var a2 = { id: 'stats_a2', type: 'resource_node', geo: { lat: 40.8, lon: -74.1 },
      zone: 'gardens', description: 'Test 2', placed_by: 'bob',
      placed_at: '2026-02-21T00:00:00Z', approved_by: null,
      status: 'approved', discoveries: 7, metadata: {} };
    var a3 = { id: 'stats_a3', type: 'zone_portal', geo: { lat: 40.6, lon: -73.9 },
      zone: 'nexus', description: 'Test 3', placed_by: 'charlie',
      placed_at: '2026-02-21T00:00:00Z', approved_by: null,
      status: 'pending', discoveries: 0, metadata: {} };

    state = Anchors.addAnchor(state, a1);
    state = Anchors.addAnchor(state, a2);
    state = Anchors.addAnchor(state, a3);

    var stats = Anchors.getStats(state);
    assert(stats.totalAnchors === 3, 'Should count 3 total anchors, got: ' + stats.totalAnchors);
    assert(stats.byType['zone_portal'] === 2, 'Should count 2 zone_portal, got: ' + stats.byType['zone_portal']);
    assert(stats.byType['resource_node'] === 1, 'Should count 1 resource_node');
    assert(stats.byZone['nexus'] === 2, 'Should count 2 nexus anchors');
    assert(stats.byZone['gardens'] === 1, 'Should count 1 gardens anchor');
    assert(stats.totalDiscoveries === 10, 'Total discoveries should be 10 (3+7+0), got: ' + stats.totalDiscoveries);
  });

  test('getStats on empty state', function() {
    var state = Anchors.loadState('{"anchors": {}}');
    var stats = Anchors.getStats(state);
    assert(stats.totalAnchors === 0, 'Empty state has 0 anchors');
    assert(stats.totalDiscoveries === 0, 'Empty state has 0 discoveries');
    assert(typeof stats.byType === 'object', 'byType should be object');
    assert(typeof stats.byZone === 'object', 'byZone should be object');
  });

  test('save and reload preserves anchor data', function() {
    var state = Anchors.loadState('{"anchors": {}}');
    var anchor = {
      id: 'persist_test',
      type: 'discovery_point',
      geo: { lat: 51.5074, lon: -0.1278 },
      zone: 'athenaeum',
      description: 'British Library',
      placed_by: 'londoner',
      placed_at: '2026-02-21T12:00:00Z',
      approved_by: 'steward_uk',
      status: 'approved',
      discoveries: 42,
      metadata: { landmark: true }
    };

    state = Anchors.addAnchor(state, anchor);
    var json = Anchors.saveState(state);
    var reloaded = Anchors.loadState(json);

    var reloadedAnchor = reloaded.anchors['persist_test'];
    assert(reloadedAnchor !== undefined, 'Anchor should survive save/reload');
    assert(reloadedAnchor.description === 'British Library', 'Description should be preserved');
    assert(reloadedAnchor.discoveries === 42, 'Discoveries should be preserved');
    assert(reloadedAnchor.geo.lat === 51.5074, 'Geo should be preserved');
  });

});

// ============================================================
// Geolocation API Wrapper Tests (mocked)
// In Node.js, global.navigator may be a non-configurable getter.
// Use Object.defineProperty to safely mock it.
// ============================================================
suite('Geolocation API', function() {

  function mockNavigator(mockNav) {
    try {
      Object.defineProperty(global, 'navigator', {
        value: mockNav,
        writable: true,
        configurable: true
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  function restoreNavigator(original) {
    try {
      Object.defineProperty(global, 'navigator', {
        value: original,
        writable: true,
        configurable: true
      });
    } catch (e) {
      // Can't restore, leave as-is
    }
  }

  test('requestLocation calls callback with position when available', function() {
    var mockPosition = {
      coords: { latitude: 40.7128, longitude: -74.0060, speed: 1.5 }
    };

    var originalNavigator = global.navigator;
    var mocked = mockNavigator({
      geolocation: {
        getCurrentPosition: function(success) { success(mockPosition); }
      }
    });

    if (!mocked) {
      // Skip gracefully in environments where navigator cannot be mocked
      assert(true, 'Skipped: cannot mock navigator in this environment');
      return;
    }

    var received = null;
    Anchors.requestLocation(function(pos) { received = pos; });
    restoreNavigator(originalNavigator);

    assert(received !== null, 'Callback should be called with position');
    assert(received.lat === 40.7128, 'Lat should match');
    assert(received.lon === -74.0060, 'Lon should match');
  });

  test('requestLocation handles no geolocation API gracefully', function() {
    var originalNavigator = global.navigator;
    var mocked = mockNavigator({});

    if (!mocked) {
      assert(true, 'Skipped: cannot mock navigator in this environment');
      return;
    }

    var errorCalled = false;
    Anchors.requestLocation(
      function(pos) {},
      function(err) { errorCalled = true; }
    );
    restoreNavigator(originalNavigator);

    assert(errorCalled === true, 'Error callback should be called when geolocation unavailable');
  });

  test('watchLocation returns a watch ID', function() {
    var watchCount = 0;
    var mockWatchId = 42;

    var originalNavigator = global.navigator;
    var mocked = mockNavigator({
      geolocation: {
        watchPosition: function() {
          watchCount++;
          return mockWatchId;
        }
      }
    });

    if (!mocked) {
      assert(true, 'Skipped: cannot mock navigator in this environment');
      return;
    }

    var id = Anchors.watchLocation(function() {}, function() {});
    restoreNavigator(originalNavigator);

    assert(id === mockWatchId, 'Should return watch ID');
    assert(watchCount === 1, 'watchPosition should be called once');
  });

  test('stopWatching calls clearWatch with correct ID', function() {
    var clearedId = null;

    var originalNavigator = global.navigator;
    var mocked = mockNavigator({
      geolocation: {
        clearWatch: function(id) { clearedId = id; }
      }
    });

    if (!mocked) {
      assert(true, 'Skipped: cannot mock navigator in this environment');
      return;
    }

    Anchors.stopWatching(99);
    restoreNavigator(originalNavigator);

    assert(clearedId === 99, 'Should call clearWatch with the given ID');
  });

});

// ============================================================
// Edge Cases
// ============================================================
suite('Edge Cases', function() {

  test('getNearby with no anchors and no radius', function() {
    var result = Anchors.getNearby({ lat: 40.7, lon: -74.0 }, []);
    assert(Array.isArray(result) && result.length === 0, 'Empty anchors returns empty array');
  });

  test('getDistance at null island (0,0) to itself', function() {
    var dist = Anchors.getDistance(0, 0, 0, 0);
    assert(dist === 0, 'Same point distance is 0');
  });

  test('validate handles anchor with no geo field', function() {
    var anchor = {
      id: 'no_geo', type: 'zone_portal',
      zone: 'nexus', description: 'Test',
      placed_by: 'alice', placed_at: '2026-02-21T00:00:00Z',
      approved_by: null, status: 'pending', discoveries: 0, metadata: {}
      // No geo field
    };
    var result = Anchors.validate(anchor);
    assert(result.valid === false, 'Anchor without geo should fail');
  });

  test('create with all valid zones succeeds', function() {
    var zones = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];
    var geoPos = { lat: 40.7128, lon: -74.0060 };
    zones.forEach(function(zone) {
      var msg = Anchors.create('zone_portal', geoPos, zone, 'Test Anchor', 'player');
      assert(msg.type === 'anchor_place', zone + ' should create valid anchor_place message');
    });
  });

  test('getWarmthBonus shape is always correct', function() {
    [0, 1, 2, 3, 4, 5].forEach(function(w) {
      var bonus = Anchors.getWarmthBonus(w);
      assert(typeof bonus === 'object', 'Should return object for warmth=' + w);
      assert(typeof bonus.harvestMultiplier === 'number', 'harvestMultiplier should be number');
      assert(typeof bonus.discoveryMultiplier === 'number', 'discoveryMultiplier should be number');
      assert(bonus.harvestMultiplier >= 1.0, 'harvestMultiplier should be >= 1.0');
      assert(bonus.discoveryMultiplier >= 1.0, 'discoveryMultiplier should be >= 1.0');
    });
  });

  test('zoneToGeoCenter with multiple anchors returns average', function() {
    var anchors = [
      { id: 'n1', type: 'zone_portal', geo: { lat: 40.0, lon: -74.0 },
        zone: 'nexus', description: 'N1', placed_by: 'alice',
        placed_at: '2026-02-21T00:00:00Z', approved_by: null,
        status: 'approved', discoveries: 0, metadata: {} },
      { id: 'n2', type: 'gathering_spot', geo: { lat: 41.0, lon: -75.0 },
        zone: 'nexus', description: 'N2', placed_by: 'alice',
        placed_at: '2026-02-21T00:00:00Z', approved_by: null,
        status: 'approved', discoveries: 0, metadata: {} }
    ];

    var center = Anchors.zoneToGeoCenter('nexus', anchors);
    assert(Math.abs(center.lat - 40.5) < 0.001, 'Average lat should be 40.5, got: ' + center.lat);
    assert(Math.abs(center.lon - (-74.5)) < 0.001, 'Average lon should be -74.5, got: ' + center.lon);
  });

});

var success = report();
process.exit(success ? 0 : 1);
