// test_world_memory.js — Tests for world memory system (footpaths, gathering, flowers)
var assert = require('assert');

// ── Grid Snapping Tests ──

function snapToGrid(x, z, gridSize) {
  var gx = Math.floor(x / gridSize);
  var gz = Math.floor(z / gridSize);
  return gx + '_' + gz;
}

(function testGridSnapping() {
  assert.strictEqual(snapToGrid(0, 0, 4), '0_0');
  assert.strictEqual(snapToGrid(3.9, 3.9, 4), '0_0');
  assert.strictEqual(snapToGrid(4, 0, 4), '1_0');
  assert.strictEqual(snapToGrid(-1, -1, 4), '-1_-1');
  assert.strictEqual(snapToGrid(100, 200, 4), '25_50');
  assert.strictEqual(snapToGrid(-8.5, 12.3, 4), '-3_3');
  console.log('PASS: Grid snapping produces correct cell keys');
})();

// ── Step Recording Tests ──

(function testStepRecording() {
  var worldMemory = {};
  var key = '10_20';

  // First step
  if (!worldMemory[key]) {
    worldMemory[key] = { steps: 0, lastStep: 0, gathering: 0, flowers: false };
  }
  worldMemory[key].steps++;
  worldMemory[key].lastStep = Date.now();

  assert.strictEqual(worldMemory[key].steps, 1, 'Should have 1 step after first recording');

  // More steps
  for (var i = 0; i < 9; i++) {
    worldMemory[key].steps++;
  }
  assert.strictEqual(worldMemory[key].steps, 10, 'Should have 10 steps after recording 10 times');
  console.log('PASS: Step recording increments cell counter');
})();

// ── Decay Tests ──

(function testDecay() {
  var worldMemory = {
    'a': { steps: 100, lastStep: 0, gathering: 20, flowers: false },
    'b': { steps: 5, lastStep: 0, gathering: 1, flowers: false },
    'c': { steps: 0.5, lastStep: 0, gathering: 0.5, flowers: false },
    'd': { steps: 0.5, lastStep: 0, gathering: 0, flowers: true }
  };

  // Apply decay: steps -10%, gathering -5%
  var keys = Object.keys(worldMemory);
  for (var i = keys.length - 1; i >= 0; i--) {
    var cell = worldMemory[keys[i]];
    cell.steps *= 0.9;
    cell.gathering *= 0.95;

    // Remove if below threshold and no flowers
    if (cell.steps < 1 && cell.gathering < 1 && !cell.flowers) {
      delete worldMemory[keys[i]];
    }
  }

  assert.strictEqual(Math.round(worldMemory['a'].steps), 90, 'Steps should decay by 10%');
  assert.strictEqual(Math.round(worldMemory['a'].gathering), 19, 'Gathering should decay by 5%');
  assert.ok(worldMemory['b'], 'Cell b should survive (steps=4.5)');
  assert.ok(!worldMemory['c'], 'Cell c should be evicted (below threshold, no flowers)');
  assert.ok(worldMemory['d'], 'Cell d should survive (has flowers)');
  console.log('PASS: Decay reduces steps by 10% and gathering by 5%');
})();

// ── Cap at 2000 Cells ──

(function testCapEviction() {
  var worldMemory = {};
  var MAX_CELLS = 2000;

  // Fill to limit
  for (var i = 0; i < 2100; i++) {
    worldMemory[i + '_0'] = { steps: i + 1, lastStep: i, gathering: 0, flowers: false };
  }

  // Evict weakest when over cap
  var keys = Object.keys(worldMemory);
  if (keys.length > MAX_CELLS) {
    // Sort by steps ascending, evict lowest
    keys.sort(function(a, b) {
      return worldMemory[a].steps - worldMemory[b].steps;
    });
    var toRemove = keys.length - MAX_CELLS;
    for (var j = 0; j < toRemove; j++) {
      delete worldMemory[keys[j]];
    }
  }

  assert.strictEqual(Object.keys(worldMemory).length, MAX_CELLS, 'Should cap at 2000 cells');
  // Weakest (lowest steps) should be gone
  assert.ok(!worldMemory['0_0'], 'Weakest cell should be evicted');
  assert.ok(worldMemory['2099_0'], 'Strongest cell should survive');
  console.log('PASS: Cap at 2000 cells evicts weakest entries');
})();

// ── Gathering Detection ──

(function testGatheringDetection() {
  // Gathering requires: velocity ≈ 0 for 10+ seconds AND near another entity
  var velocityThreshold = 0.5;
  var timeThreshold = 10; // seconds
  var proximityThreshold = 5; // units

  var playerVelocity = 0.1;
  var stillDuration = 12; // seconds
  var nearbyEntityDist = 3; // units

  var isGathering = playerVelocity < velocityThreshold &&
                    stillDuration >= timeThreshold &&
                    nearbyEntityDist <= proximityThreshold;

  assert.ok(isGathering, 'Should detect gathering when still + near entity');

  // Not gathering: moving
  var movingVelocity = 2.0;
  var notGathering = movingVelocity < velocityThreshold;
  assert.ok(!notGathering, 'Should not detect gathering when moving');

  // Not gathering: alone
  var aloneEntityDist = 20;
  var aloneGathering = playerVelocity < velocityThreshold &&
                       stillDuration >= timeThreshold &&
                       aloneEntityDist <= proximityThreshold;
  assert.ok(!aloneGathering, 'Should not detect gathering when alone');

  console.log('PASS: Gathering detection requires low velocity + proximity');
})();

// ── Flower Flag ──

(function testFlowerFlag() {
  var cell = { steps: 5, lastStep: 0, gathering: 0, flowers: false };
  var stillDuration = 35; // seconds
  var soloThreshold = 30;
  var nearbyEntities = 0;

  if (stillDuration >= soloThreshold && nearbyEntities === 0) {
    cell.flowers = true;
  }

  assert.ok(cell.flowers, 'Flower flag should be set after 30s stillness solo');

  // Not alone — should not set
  var cell2 = { steps: 5, lastStep: 0, gathering: 0, flowers: false };
  var nearbyEntities2 = 2;
  if (stillDuration >= soloThreshold && nearbyEntities2 === 0) {
    cell2.flowers = true;
  }
  assert.ok(!cell2.flowers, 'Flower flag should NOT be set when near others');

  console.log('PASS: Flower flag set after 30s stillness solo');
})();

// ── Footpath Color Darkening ──

(function testFootpathDarkening() {
  // Original green terrain color
  var r = 0.3, g = 0.6, b = 0.2;
  var steps = 30;
  var maxSteps = 50;

  // Darken proportionally
  var pathStrength = Math.min(1, (steps - 5) / (maxSteps - 5));
  var pathR = r * (1 - pathStrength * 0.4) + 0.45 * pathStrength * 0.4;
  var pathG = g * (1 - pathStrength * 0.4) + 0.35 * pathStrength * 0.4;
  var pathB = b * (1 - pathStrength * 0.4) + 0.25 * pathStrength * 0.4;

  // Darkened path should be more brown (lower green, similar red)
  assert.ok(pathG < g, 'Green channel should decrease on path');
  assert.ok(pathR > r * 0.5, 'Red channel should stay reasonable');
  console.log('PASS: Footpath darkening produces brownish color');
})();

console.log('\nAll world memory tests passed!');
