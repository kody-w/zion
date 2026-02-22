/**
 * test_spatial_grid_adaptive.js — Tests for adaptive spatial grid
 */

(function() {
  'use strict';

  var SpatialGrid;
  try { SpatialGrid = require('../src/js/spatial_grid'); } catch(e) { SpatialGrid = {}; }

  var passed = 0;
  var failed = 0;

  function assert(condition, msg) {
    if (condition) { passed++; }
    else { failed++; console.error('FAIL: ' + msg); }
  }

  // Test 1: createAdaptiveGrid returns proper structure
  var ag = SpatialGrid.createAdaptiveGrid(50);
  assert(ag !== null && ag !== undefined, 'createAdaptiveGrid should return object');
  assert(ag.count === 0, 'initial count should be 0');
  assert(ag.gridPopulated === false, 'grid should not be populated initially');

  // Test 2: Below threshold - insert and query via brute force
  SpatialGrid.adaptiveInsert(ag, 'a', 10, 10);
  SpatialGrid.adaptiveInsert(ag, 'b', 15, 15);
  SpatialGrid.adaptiveInsert(ag, 'c', 100, 100);
  assert(ag.count === 3, 'count should be 3 after 3 inserts');
  assert(ag.gridPopulated === false, 'grid should not be populated below threshold');

  var nearby = SpatialGrid.adaptiveQueryRadius(ag, 10, 10, 20);
  var nearbyIds = nearby.map(function(e) { return e.id; }).sort();
  assert(nearbyIds.length === 2, 'should find 2 entities near (10,10)');
  assert(nearbyIds.indexOf('a') >= 0, 'should find entity a');
  assert(nearbyIds.indexOf('b') >= 0, 'should find entity b');

  // Test 3: Update moves entity
  SpatialGrid.adaptiveUpdate(ag, 'c', 12, 12);
  nearby = SpatialGrid.adaptiveQueryRadius(ag, 10, 10, 20);
  var foundC = nearby.some(function(e) { return e.id === 'c'; });
  assert(foundC, 'entity c should be found after update to nearby position');

  // Test 4: Remove works
  SpatialGrid.adaptiveRemove(ag, 'c');
  assert(ag.count === 2, 'count should be 2 after remove');
  nearby = SpatialGrid.adaptiveQueryRadius(ag, 10, 10, 20);
  var stillHasC = nearby.some(function(e) { return e.id === 'c'; });
  assert(!stillHasC, 'entity c should not be found after remove');

  // Test 5: Clear empties everything
  SpatialGrid.adaptiveClear(ag);
  assert(ag.count === 0, 'count should be 0 after clear');
  nearby = SpatialGrid.adaptiveQueryRadius(ag, 10, 10, 1000);
  assert(nearby.length === 0, 'no entities after clear');

  // Test 6: Above threshold - grid gets populated
  var ag2 = SpatialGrid.createAdaptiveGrid(50);
  for (var i = 0; i < 200; i++) {
    SpatialGrid.adaptiveInsert(ag2, 'ent_' + i, i * 2, i * 2);
  }
  assert(ag2.gridPopulated === true, 'grid should be populated at threshold');
  assert(ag2.count === 200, 'count should be 200');

  // Test 7: Query above threshold returns correct results
  var nearOrigin = SpatialGrid.adaptiveQueryRadius(ag2, 0, 0, 15);
  assert(nearOrigin.length > 0, 'should find entities near origin above threshold');
  // ent_0 is at (0,0), ent_1 at (2,2), etc. Within radius 15: entities where dist <= 15
  // dist of ent_i = sqrt((2i)^2 + (2i)^2) = 2i*sqrt(2) ≈ 2.83i, so i <= 5 → 6 entities
  assert(nearOrigin.length >= 5, 'should find at least 5 entities within radius 15 of origin');

  // Test 8: Correctness - brute force and grid produce same results for same data
  var ag3 = SpatialGrid.createAdaptiveGrid(50);
  var bruteResults = [];
  for (var j = 0; j < 50; j++) {
    SpatialGrid.adaptiveInsert(ag3, 'test_' + j, j * 3, j * 3);
  }
  bruteResults = SpatialGrid.adaptiveQueryRadius(ag3, 50, 50, 30);
  // Now push past threshold
  for (var k = 50; k < 200; k++) {
    SpatialGrid.adaptiveInsert(ag3, 'test_' + k, k * 3, k * 3);
  }
  var gridResults = SpatialGrid.adaptiveQueryRadius(ag3, 50, 50, 30);
  // The first 50 entities should still be found by both methods
  var bruteIds = bruteResults.map(function(e) { return e.id; }).sort();
  var gridSubset = gridResults.filter(function(e) {
    return parseInt(e.id.split('_')[1]) < 50;
  }).map(function(e) { return e.id; }).sort();
  assert(JSON.stringify(bruteIds) === JSON.stringify(gridSubset),
    'brute-force and grid should agree on first 50 entities');

  // Test 9: ADAPTIVE_THRESHOLD is exported
  assert(SpatialGrid.ADAPTIVE_THRESHOLD === 200, 'ADAPTIVE_THRESHOLD should be 200');

  // Test 10: Performance - below 100 entities, adaptive query completes quickly
  var agPerf = SpatialGrid.createAdaptiveGrid(50);
  for (var p = 0; p < 50; p++) {
    SpatialGrid.adaptiveInsert(agPerf, 'perf_' + p, Math.random() * 500, Math.random() * 500);
  }
  var start = Date.now();
  for (var q = 0; q < 1000; q++) {
    SpatialGrid.adaptiveQueryRadius(agPerf, 250, 250, 100);
  }
  var elapsed = Date.now() - start;
  assert(elapsed < 500, '1000 brute-force queries on 50 entities should complete in < 500ms (took ' + elapsed + 'ms)');

  console.log('test_spatial_grid_adaptive: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
})();
