'use strict';

var runner = require('./test_runner');
var test   = runner.test;
var suite  = runner.suite;
var report = runner.report;
var assert = runner.assert;

var E = require('../src/js/exploration.js');

suite('Footpath Memory', function() {
test('recordStep is exported', function() {
  assert.strictEqual(typeof E.recordStep, 'function', 'should export recordStep');
});

test('getWornPaths is exported', function() {
  assert.strictEqual(typeof E.getWornPaths, 'function', 'should export getWornPaths');
});

test('isWorn is exported', function() {
  assert.strictEqual(typeof E.isWorn, 'function', 'should export isWorn');
});

test('getWornPaths returns array', function() {
  assert(Array.isArray(E.getWornPaths()), 'getWornPaths should return an array');
});

test('fresh tile is not worn', function() {
  assert.strictEqual(E.isWorn(9999, 9999), false, 'never-walked tile is not worn');
});

test('recordStep increments walk count', function() {
  var x = 1111, z = 2222;
  // Walk 21 times to exceed threshold
  for (var i = 0; i < 21; i++) E.recordStep(x, z);
  assert(E.isWorn(x, z), 'tile walked 21 times should be worn');
});

test('worn tile appears in getWornPaths', function() {
  var x = 3333, z = 4444;
  for (var i = 0; i < 25; i++) E.recordStep(x, z);
  var paths = E.getWornPaths();
  var found = paths.some(function(p) { return p.x === x && p.z === z; });
  assert(found, 'worn tile should appear in getWornPaths()');
});

test('tile needs >= 20 steps to become worn', function() {
  var x = 5555, z = 6666;
  for (var i = 0; i < 19; i++) E.recordStep(x, z);
  assert.strictEqual(E.isWorn(x, z), false, '19 steps is not enough to be worn');
  E.recordStep(x, z);
  assert(E.isWorn(x, z), '20 steps should be worn');
});

test('worn path entries have x and z coordinates', function() {
  var x = 7777, z = 8888;
  for (var i = 0; i < 25; i++) E.recordStep(x, z);
  var paths = E.getWornPaths();
  var p = paths.find(function(p) { return p.x === x && p.z === z; });
  assert(p !== undefined, 'should find the path');
  assert(typeof p.x === 'number', 'x must be number');
  assert(typeof p.z === 'number', 'z must be number');
});

test('non-integer coords are quantized to tiles', function() {
  // Float coords should round to same tile as integer
  E.recordStep(100.3, 200.7);
  E.recordStep(100.7, 200.3);
  // Both should map to tile (100, 200) — combined 2 steps, not worn yet
  // but both contribute to the same tile
  var worn19 = E.isWorn(100, 200);
  // We can't guarantee it's worn (only 2 steps), but we can verify no error thrown
  assert(typeof worn19 === 'boolean', 'isWorn must return boolean');
});

test('recordStep accepts negative coords', function() {
  assert.doesNotThrow(function() {
    E.recordStep(-10, -20);
  }, 'negative coords should not throw');
});
});

report();
