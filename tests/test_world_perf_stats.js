/**
 * test_world_perf_stats.js — Tests for getPerformanceStats fix and TTL cache
 */

(function() {
  'use strict';

  var World;
  try { World = require('../src/js/world'); } catch(e) { World = {}; }

  var passed = 0;
  var failed = 0;

  function assert(condition, msg) {
    if (condition) { passed++; }
    else { failed++; console.error('FAIL: ' + msg); }
  }

  // Test 1: getPerformanceStats returns object with all expected fields
  var stats = World.getPerformanceStats ? World.getPerformanceStats() : null;
  assert(stats !== null && stats !== undefined, 'getPerformanceStats should return an object');
  if (stats) {
    assert('totalObjects' in stats, 'stats should have totalObjects');
    assert('visibleObjects' in stats, 'stats should have visibleObjects');
    assert('activeAnimations' in stats, 'stats should have activeAnimations');
    assert('loadedChunks' in stats, 'stats should have loadedChunks');
    assert('estimatedTriangles' in stats, 'stats should have estimatedTriangles');
  }

  // Test 2: Without scene context, object/triangle counts are 0
  if (stats) {
    assert(stats.totalObjects === 0, 'totalObjects should be 0 without scene context');
    assert(stats.estimatedTriangles === 0, 'estimatedTriangles should be 0 without scene context');
  }

  // Test 3: setPerformanceSceneContext is exported
  assert(typeof World.setPerformanceSceneContext === 'function', 'setPerformanceSceneContext should be exported as function');

  // Test 4: setPerformanceSceneContext does not throw
  var didNotThrow = true;
  try {
    if (World.setPerformanceSceneContext) {
      World.setPerformanceSceneContext(null);
    }
  } catch(e) {
    didNotThrow = false;
  }
  assert(didNotThrow, 'setPerformanceSceneContext(null) should not throw');

  console.log('test_world_perf_stats: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
})();
