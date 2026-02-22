const { test, suite, report, assert } = require('./test_runner');
const SpatialGrid = require('../src/js/spatial_grid');

suite('SpatialGrid Tests', () => {

  test('createGrid returns valid grid object', () => {
    const grid = SpatialGrid.createGrid(50);
    assert.strictEqual(grid.cellSize, 50);
    assert.ok(grid.cells);
    assert.ok(grid.entityCell);
  });

  test('createGrid uses default cellSize when none provided', () => {
    const grid = SpatialGrid.createGrid();
    assert.strictEqual(grid.cellSize, 50);
  });

  test('insert and queryRadius finds entity in range', () => {
    const grid = SpatialGrid.createGrid(50);
    SpatialGrid.insert(grid, 'a', 10, 20);
    const results = SpatialGrid.queryRadius(grid, 10, 20, 5);
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].id, 'a');
    assert.strictEqual(results[0].dist, 0);
  });

  test('queryRadius excludes entity out of range', () => {
    const grid = SpatialGrid.createGrid(50);
    SpatialGrid.insert(grid, 'a', 0, 0);
    SpatialGrid.insert(grid, 'b', 200, 200);
    const results = SpatialGrid.queryRadius(grid, 0, 0, 25);
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].id, 'a');
  });

  test('update moves entity to new cell', () => {
    const grid = SpatialGrid.createGrid(50);
    SpatialGrid.insert(grid, 'a', 10, 10);
    SpatialGrid.update(grid, 'a', 300, 300);
    const oldResults = SpatialGrid.queryRadius(grid, 10, 10, 5);
    assert.strictEqual(oldResults.length, 0);
    const newResults = SpatialGrid.queryRadius(grid, 300, 300, 5);
    assert.strictEqual(newResults.length, 1);
    assert.strictEqual(newResults[0].id, 'a');
  });

  test('update within same cell preserves entity', () => {
    const grid = SpatialGrid.createGrid(50);
    SpatialGrid.insert(grid, 'a', 10, 10);
    SpatialGrid.update(grid, 'a', 12, 12);
    const results = SpatialGrid.queryRadius(grid, 12, 12, 5);
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].x, 12);
    assert.strictEqual(results[0].z, 12);
  });

  test('remove makes entity unfindable', () => {
    const grid = SpatialGrid.createGrid(50);
    SpatialGrid.insert(grid, 'a', 10, 10);
    SpatialGrid.remove(grid, 'a');
    const results = SpatialGrid.queryRadius(grid, 10, 10, 100);
    assert.strictEqual(results.length, 0);
  });

  test('remove nonexistent entity does not throw', () => {
    const grid = SpatialGrid.createGrid(50);
    SpatialGrid.remove(grid, 'nonexistent');
    // Should not throw
    assert.ok(true);
  });

  test('clear empties entire grid', () => {
    const grid = SpatialGrid.createGrid(50);
    for (let i = 0; i < 100; i++) {
      SpatialGrid.insert(grid, 'e' + i, i * 10, i * 10);
    }
    SpatialGrid.clear(grid);
    const results = SpatialGrid.queryRadius(grid, 500, 500, 10000);
    assert.strictEqual(results.length, 0);
    assert.strictEqual(Object.keys(grid.cells).length, 0);
    assert.strictEqual(Object.keys(grid.entityCell).length, 0);
  });

  test('stress: 10000 entities insert + query', () => {
    const grid = SpatialGrid.createGrid(50);
    for (let i = 0; i < 10000; i++) {
      SpatialGrid.insert(grid, 'e' + i, Math.random() * 1200 - 600, Math.random() * 1200 - 600);
    }
    const start = Date.now();
    const results = SpatialGrid.queryRadius(grid, 0, 0, 50);
    const elapsed = Date.now() - start;
    assert.ok(results.length >= 0);
    assert.ok(elapsed < 100, 'Query of 10000 entities should be under 100ms, got ' + elapsed + 'ms');
  });

  test('edge: entities at cell boundaries found correctly', () => {
    const grid = SpatialGrid.createGrid(50);
    // Place entity exactly on cell boundary
    SpatialGrid.insert(grid, 'a', 50, 50);
    SpatialGrid.insert(grid, 'b', 49.9, 49.9);
    // Query from just inside the boundary
    const results = SpatialGrid.queryRadius(grid, 50, 50, 1);
    assert.ok(results.some(r => r.id === 'a'));
    assert.ok(results.some(r => r.id === 'b'));
  });

  test('edge: negative coordinates handled', () => {
    const grid = SpatialGrid.createGrid(50);
    SpatialGrid.insert(grid, 'a', -100, -200);
    SpatialGrid.insert(grid, 'b', -105, -195);
    const results = SpatialGrid.queryRadius(grid, -100, -200, 25);
    assert.strictEqual(results.length, 2);
  });

  test('edge: zero-radius query returns only exact matches', () => {
    const grid = SpatialGrid.createGrid(50);
    SpatialGrid.insert(grid, 'a', 10, 10);
    SpatialGrid.insert(grid, 'b', 10.1, 10.1);
    const results = SpatialGrid.queryRadius(grid, 10, 10, 0);
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].id, 'a');
  });

  test('queryRadius returns correct distances', () => {
    const grid = SpatialGrid.createGrid(50);
    SpatialGrid.insert(grid, 'a', 0, 0);
    SpatialGrid.insert(grid, 'b', 3, 4);
    const results = SpatialGrid.queryRadius(grid, 0, 0, 10);
    const bResult = results.find(r => r.id === 'b');
    assert.ok(bResult);
    assert.ok(Math.abs(bResult.dist - 5) < 0.001, 'Distance should be 5, got ' + bResult.dist);
  });

  test('multiple entities in same cell', () => {
    const grid = SpatialGrid.createGrid(50);
    SpatialGrid.insert(grid, 'a', 10, 10);
    SpatialGrid.insert(grid, 'b', 11, 11);
    SpatialGrid.insert(grid, 'c', 12, 12);
    const results = SpatialGrid.queryRadius(grid, 10, 10, 25);
    assert.strictEqual(results.length, 3);
  });

});

report();
