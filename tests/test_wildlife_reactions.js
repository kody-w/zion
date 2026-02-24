'use strict';

var runner = require('./test_runner');
var test   = runner.test;
var suite  = runner.suite;
var report = runner.report;
var assert = runner.assert;

global.THREE = undefined;
var W = require('../src/js/world.js');

suite('Wildlife Proximity Reactions', function() {
test('getWildlifeReaction is exported', function() {
  assert.strictEqual(typeof W.getWildlifeReaction, 'function', 'should export getWildlifeReaction');
});

test('butterfly flees when player is close', function() {
  var entity = { type: 'butterfly', position: { x: 0, z: 0 } };
  var playerClose = { x: 3, z: 3 };  // distance ~4.2 < 5
  var reaction = W.getWildlifeReaction(entity, playerClose, 'midday');
  assert.strictEqual(reaction, 'flee', 'butterfly should flee when player < 5 units');
});

test('butterfly is calm when player is far', function() {
  var entity = { type: 'butterfly', position: { x: 0, z: 0 } };
  var playerFar = { x: 10, z: 10 };  // distance ~14.1 > 5
  var reaction = W.getWildlifeReaction(entity, playerFar, 'midday');
  assert.strictEqual(reaction, 'idle', 'butterfly should be idle when player is far');
});

test('fish jumps at dawn', function() {
  var entity = { type: 'fish', position: { x: 0, z: 0 } };
  var playerFar = { x: 50, z: 50 };
  var reaction = W.getWildlifeReaction(entity, playerFar, 'dawn');
  assert.strictEqual(reaction, 'jump', 'fish should jump at dawn');
});

test('fish is calm at midday', function() {
  var entity = { type: 'fish', position: { x: 0, z: 0 } };
  var playerFar = { x: 50, z: 50 };
  var reaction = W.getWildlifeReaction(entity, playerFar, 'midday');
  assert.strictEqual(reaction, 'idle', 'fish should be idle at midday');
});

test('firefly clusters near garden center', function() {
  // Garden center assumed at (0,0), firefly at (2,2) = ~2.8 from center < 8
  var entity = { type: 'firefly', position: { x: 2, z: 2 }, nearGarden: true };
  var playerFar = { x: 50, z: 50 };
  var reaction = W.getWildlifeReaction(entity, playerFar, 'night');
  assert.strictEqual(reaction, 'cluster', 'firefly should cluster near gardens at night');
});

test('firefly is idle far from garden', function() {
  var entity = { type: 'firefly', position: { x: 2, z: 2 }, nearGarden: false };
  var playerFar = { x: 50, z: 50 };
  var reaction = W.getWildlifeReaction(entity, playerFar, 'night');
  assert.strictEqual(reaction, 'idle', 'firefly idle when not near garden');
});

test('unknown creature type returns idle', function() {
  var entity = { type: 'dragon', position: { x: 0, z: 0 } };
  var reaction = W.getWildlifeReaction(entity, { x: 1, z: 1 }, 'midday');
  assert.strictEqual(reaction, 'idle', 'unknown type → idle');
});

test('reaction is always a string', function() {
  var cases = [
    [{ type: 'butterfly', position: { x: 0, z: 0 } }, { x: 1, z: 0 }, 'dawn'],
    [{ type: 'fish', position: { x: 0, z: 0 } }, { x: 100, z: 100 }, 'night'],
    [{ type: 'firefly', position: { x: 0, z: 0 }, nearGarden: true }, { x: 0, z: 0 }, 'night']
  ];
  cases.forEach(function(c) {
    var r = W.getWildlifeReaction(c[0], c[1], c[2]);
    assert(typeof r === 'string', 'reaction must be string, got ' + typeof r);
  });
});
});

report();
