// Test: Adaptive spatial grid wiring
// Verifies adaptive grid functions used when available, fallback to original grid

(function() {
  var passed = 0;
  var failed = 0;

  function assert(condition, msg) {
    if (condition) { passed++; }
    else { failed++; console.error('FAIL: ' + msg); }
  }

  // Load SpatialGrid module
  var SpatialGrid = require('../src/js/spatial_grid');

  // Test 1: Adaptive grid functions exist
  assert(typeof SpatialGrid.createAdaptiveGrid === 'function', 'createAdaptiveGrid is exported');
  assert(typeof SpatialGrid.adaptiveInsert === 'function', 'adaptiveInsert is exported');
  assert(typeof SpatialGrid.adaptiveQueryRadius === 'function', 'adaptiveQueryRadius is exported');

  // Test 2: Original grid functions still exist (fallback)
  assert(typeof SpatialGrid.createGrid === 'function', 'createGrid still exported');
  assert(typeof SpatialGrid.insert === 'function', 'insert still exported');
  assert(typeof SpatialGrid.queryRadius === 'function', 'queryRadius still exported');

  // Test 3: Create adaptive grid
  var ag = SpatialGrid.createAdaptiveGrid(25);
  assert(ag !== null && ag !== undefined, 'Adaptive grid created');
  assert(typeof ag === 'object', 'Adaptive grid is an object');
  assert(ag.grid !== undefined, 'Adaptive grid has inner grid');

  // Test 4: Insert into adaptive grid
  SpatialGrid.adaptiveInsert(ag, 'npc1', 10, 20);
  SpatialGrid.adaptiveInsert(ag, 'npc2', 15, 25);
  SpatialGrid.adaptiveInsert(ag, 'npc3', 100, 200);
  assert(ag.count === 3, 'Adaptive grid tracks entity count');

  // Test 5: Query radius returns nearby entities
  var nearby = SpatialGrid.adaptiveQueryRadius(ag, 12, 22, 30);
  assert(Array.isArray(nearby), 'adaptiveQueryRadius returns array');
  assert(nearby.length >= 2, 'Found at least 2 nearby entities');

  // Test 6: Far entities not returned
  var farQuery = SpatialGrid.adaptiveQueryRadius(ag, 500, 500, 10);
  assert(farQuery.length === 0, 'No results for distant query');

  // Test 7: Adaptive grid handles many inserts (transitions to grid-backed)
  var bigGrid = SpatialGrid.createAdaptiveGrid(25);
  for (var i = 0; i < 100; i++) {
    SpatialGrid.adaptiveInsert(bigGrid, 'npc_' + i, i * 5, i * 3);
  }
  assert(bigGrid.count === 100, 'Big grid has 100 entities');
  var bigQuery = SpatialGrid.adaptiveQueryRadius(bigGrid, 50, 30, 50);
  assert(bigQuery.length > 0, 'Big grid query returns results');

  // Test 8: Fallback path — original grid still works
  var origGrid = SpatialGrid.createGrid(25);
  SpatialGrid.insert(origGrid, 'a', 10, 10);
  SpatialGrid.insert(origGrid, 'b', 12, 12);
  var origResults = SpatialGrid.queryRadius(origGrid, 11, 11, 20);
  assert(origResults.length === 2, 'Original grid query works as fallback');

  // Test 9: Wiring pattern works — adaptive preferred, fallback available
  var SpatialGridRef = SpatialGrid;
  var useAdaptiveGrid = SpatialGridRef && SpatialGridRef.createAdaptiveGrid;
  assert(!!useAdaptiveGrid, 'useAdaptiveGrid flag is truthy when adaptive available');

  var npcGrid;
  if (useAdaptiveGrid) {
    npcGrid = SpatialGridRef.createAdaptiveGrid(25);
    SpatialGridRef.adaptiveInsert(npcGrid, 'test', 0, 0);
  } else {
    npcGrid = SpatialGridRef.createGrid(25);
    SpatialGridRef.insert(npcGrid, 'test', 0, 0);
  }
  assert(npcGrid !== null, 'Grid created via wiring pattern');

  var queryFn = useAdaptiveGrid
    ? SpatialGridRef.adaptiveQueryRadius
    : SpatialGridRef.queryRadius;
  var results = queryFn(npcGrid, 0, 0, 50);
  assert(results.length >= 1, 'Query via wiring pattern returns results');

  // Test 10: Fallback when adaptive is not available
  var LimitedGrid = { createGrid: SpatialGrid.createGrid, insert: SpatialGrid.insert, queryRadius: SpatialGrid.queryRadius };
  var useAdaptive2 = LimitedGrid && LimitedGrid.createAdaptiveGrid;
  assert(!useAdaptive2, 'useAdaptiveGrid is falsy when adaptive not available');

  var fallbackGrid;
  if (useAdaptive2) {
    fallbackGrid = LimitedGrid.createAdaptiveGrid(25);
  } else {
    fallbackGrid = LimitedGrid.createGrid(25);
    LimitedGrid.insert(fallbackGrid, 'fb', 5, 5);
  }
  var fbResults = LimitedGrid.queryRadius(fallbackGrid, 5, 5, 20);
  assert(fbResults.length === 1, 'Fallback to original grid works');

  console.log('test_wiring_adaptive_grid: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
})();
