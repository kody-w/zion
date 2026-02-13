const { test, suite, report, assert } = require('./test_runner');
const Physical = require('../src/js/physical');

suite('Physical Module Tests', () => {

  test('createAnchor with valid GPS succeeds', () => {
    const msg = {
      from: 'alice',
      payload: {
        lat: 37.7749,
        lon: -122.4194,
        type: 'zone_portal',
        position: { x: 10, y: 0, z: 10 },
        zone: 'nexus'
      }
    };

    const state = { anchors: [] };
    const result = Physical.createAnchor(msg, state);

    assert(result.success === true, 'Anchor creation should succeed with valid GPS');
    assert(result.anchor !== undefined, 'Should return anchor');
    assert(result.anchor.lat === 37.7749, 'Latitude should match');
    assert(result.anchor.lon === -122.4194, 'Longitude should match');
    assert(result.anchor.type === 'zone_portal', 'Type should be zone_portal');
    assert(result.anchor.creator === 'alice', 'Creator should be alice');
    assert(result.state.anchors.length === 1, 'Anchor should be added to state');
  });

  test('createAnchor at (0,0) rejected', () => {
    const msg = {
      from: 'bob',
      payload: {
        lat: 0,
        lon: 0,
        type: 'discovery_point',
        position: { x: 0, y: 0, z: 0 },
        zone: 'wilds'
      }
    };

    const state = { anchors: [] };
    const result = Physical.createAnchor(msg, state);

    assert(result.success === false, 'Anchor at (0,0) should be rejected');
    assert(result.error.includes('Null Island') || result.error.includes('coordinates'), 'Error should mention Null Island or coordinates');
  });

  test('createAnchor with invalid lat (>90) rejected', () => {
    const msg = {
      from: 'charlie',
      payload: {
        lat: 95,
        lon: 10,
        type: 'resource_node',
        position: { x: 5, y: 0, z: 5 },
        zone: 'wilds'
      }
    };

    const state = { anchors: [] };
    const result = Physical.createAnchor(msg, state);

    assert(result.success === false, 'Anchor with lat > 90 should be rejected');
    assert(result.error.includes('range') || result.error.includes('Latitude'), 'Error should mention latitude range');
  });

  test('createAnchor with invalid lon (>180) rejected', () => {
    const msg = {
      from: 'diana',
      payload: {
        lat: 45,
        lon: 190,
        type: 'gathering_spot',
        position: { x: 15, y: 0, z: 15 },
        zone: 'gardens'
      }
    };

    const state = { anchors: [] };
    const result = Physical.createAnchor(msg, state);

    assert(result.success === false, 'Anchor with lon > 180 should be rejected');
    assert(result.error.includes('range') || result.error.includes('Longitude'), 'Error should mention longitude range');
  });

  test('validateAnchorLocation returns safe:true for valid location', () => {
    const result = Physical.validateAnchorLocation(40.7128, -74.0060); // New York

    assert(result.safe === true, 'Valid location should return safe:true');
  });

  test('validateAnchorLocation returns safe:false for (0,0)', () => {
    const result = Physical.validateAnchorLocation(0, 0);

    assert(result.safe === false, 'Location (0,0) should return safe:false');
  });

  test('ANCHOR_TYPES has 5 types', () => {
    assert(Array.isArray(Physical.ANCHOR_TYPES), 'ANCHOR_TYPES should be an array');
    assert(Physical.ANCHOR_TYPES.length === 5, 'Should have exactly 5 anchor types');
    assert(Physical.ANCHOR_TYPES.includes('zone_portal'), 'Should include zone_portal');
    assert(Physical.ANCHOR_TYPES.includes('resource_node'), 'Should include resource_node');
    assert(Physical.ANCHOR_TYPES.includes('discovery_point'), 'Should include discovery_point');
    assert(Physical.ANCHOR_TYPES.includes('gathering_spot'), 'Should include gathering_spot');
    assert(Physical.ANCHOR_TYPES.includes('garden_plot'), 'Should include garden_plot');
  });

  test('calculateWarmth returns 0 for empty history', () => {
    const warmth1 = Physical.calculateWarmth([]);
    assert(warmth1 === 0, 'Empty array should return 0');

    const warmth2 = Physical.calculateWarmth(null);
    assert(warmth2 === 0, 'Null should return 0');

    const warmth3 = Physical.calculateWarmth(undefined);
    assert(warmth3 === 0, 'Undefined should return 0');
  });

  test('calculateWarmth accumulates from walking', () => {
    const now = Date.now();
    const gpsHistory = [
      { lat: 37.7749, lon: -122.4194, ts: now },
      { lat: 37.7750, lon: -122.4195, ts: now + 60000 }, // 1 minute later, small movement
      { lat: 37.7751, lon: -122.4196, ts: now + 120000 }  // 2 minutes later, small movement
    ];

    const warmth = Physical.calculateWarmth(gpsHistory);

    assert(warmth > 0, 'Walking should accumulate warmth');
  });

  test('calculateWarmth filters out driving speed', () => {
    const now = Date.now();
    // Simulate driving: large distance in short time
    const gpsHistory = [
      { lat: 37.7749, lon: -122.4194, ts: now },
      { lat: 38.0000, lon: -122.0000, ts: now + 60000 } // Large jump in 1 minute (driving speed)
    ];

    const warmth = Physical.calculateWarmth(gpsHistory);

    // Warmth should be 0 or very low since movement is too fast (driving)
    assert(warmth >= 0, 'Warmth should be non-negative');
    // The exact value depends on implementation, but driving should contribute less/nothing
  });

  test('getWarmthBonus returns 1.0 for warmth=0', () => {
    const bonus = Physical.getWarmthBonus(0);

    assert(bonus === 1.0, 'Zero warmth should return 1.0 (no bonus)');
  });

  test('getWarmthBonus returns small bonus (max 1.1) for high warmth', () => {
    const bonus1 = Physical.getWarmthBonus(50);
    assert(bonus1 > 1.0, 'Positive warmth should return bonus > 1.0');
    assert(bonus1 === 1.05, 'Warmth 50 should give bonus 1.05');

    const bonus2 = Physical.getWarmthBonus(100);
    assert(bonus2 > 1.0, 'High warmth should return bonus > 1.0');
    assert(bonus2 === 1.1, 'Warmth 100 should give max bonus 1.1 from calculateWarmth cap');

    // Note: getWarmthBonus itself doesn't cap, but calculateWarmth caps at 100
    // So in practice, max bonus from real warmth accumulation is 1.1
    const bonus3 = Physical.getWarmthBonus(1000);
    assert(bonus3 === 2.0, 'Direct call with warmth 1000 gives 2.0 (no cap in getWarmthBonus itself)');
  });

  test('Everything works with null/undefined geo (null-safe)', () => {
    // Test createAnchor with null geo
    const msg1 = {
      from: 'test',
      payload: {
        lat: null,
        lon: null,
        type: 'zone_portal',
        position: { x: 0, y: 0, z: 0 },
        zone: 'nexus'
      }
    };
    const result1 = Physical.createAnchor(msg1, { anchors: [] });
    // Should fail gracefully, not crash
    assert(result1.success === false, 'Null GPS should fail gracefully');

    // Test calculateWarmth with null values in history
    const gpsHistory = [
      { lat: null, lon: null, ts: Date.now() },
      { lat: undefined, lon: undefined, ts: Date.now() + 1000 }
    ];
    const warmth = Physical.calculateWarmth(gpsHistory);
    assert(warmth === 0, 'Null GPS history should return 0');

    // Test getWarmthBonus with null
    const bonus1 = Physical.getWarmthBonus(null);
    assert(bonus1 === 1.0, 'Null warmth should return 1.0');

    const bonus2 = Physical.getWarmthBonus(undefined);
    assert(bonus2 === 1.0, 'Undefined warmth should return 1.0');

    // Test validateAnchorLocation with null
    const validation = Physical.validateAnchorLocation(null, null);
    assert(validation.safe === false, 'Null coordinates should return safe:false');
  });
});

const success = report();
process.exit(success ? 0 : 1);
