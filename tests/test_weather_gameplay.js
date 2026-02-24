'use strict';

var runner = require('./test_runner');
var test   = runner.test;
var suite  = runner.suite;
var report = runner.report;
var assert = runner.assert;

global.THREE = undefined;
var W = require('../src/js/world.js');

suite('Weather Gameplay Modifiers', function() {
test('getWeatherModifiers is exported', function() {
  assert.strictEqual(typeof W.getWeatherModifiers, 'function', 'should export getWeatherModifiers');
});

test('clear weather has no modifiers', function() {
  var m = W.getWeatherModifiers('clear');
  assert.strictEqual(m.yieldMultiplier, 1.0, 'clear: yield x1');
  assert.strictEqual(m.visibilityPenalty, 0, 'clear: no visibility penalty');
  assert.strictEqual(m.movementMultiplier, 1.0, 'clear: movement x1');
});

test('rain boosts garden yield', function() {
  var m = W.getWeatherModifiers('rain');
  assert(m.yieldMultiplier >= 1.5, 'rain: yield >= 1.5x (got ' + m.yieldMultiplier + ')');
});

test('storm reduces visibility', function() {
  var m = W.getWeatherModifiers('storm');
  assert(m.visibilityPenalty >= 0.4, 'storm: fog density penalty >= 0.4 (got ' + m.visibilityPenalty + ')');
});

test('snow slows movement', function() {
  var m = W.getWeatherModifiers('snow');
  assert(m.movementMultiplier <= 0.75, 'snow: movement <= 0.75 (got ' + m.movementMultiplier + ')');
});

test('fog has mild visibility penalty', function() {
  var m = W.getWeatherModifiers('fog');
  assert(m.visibilityPenalty > 0, 'fog should have some visibility penalty');
});

test('modifiers object always has all three keys', function() {
  ['clear', 'rain', 'storm', 'snow', 'fog', 'cloudy'].forEach(function(w) {
    var m = W.getWeatherModifiers(w);
    assert(typeof m.yieldMultiplier === 'number', w + ': yieldMultiplier must be number');
    assert(typeof m.visibilityPenalty === 'number', w + ': visibilityPenalty must be number');
    assert(typeof m.movementMultiplier === 'number', w + ': movementMultiplier must be number');
  });
});

test('unknown weather type returns neutral modifiers', function() {
  var m = W.getWeatherModifiers('hailstorm_of_darkness');
  assert.strictEqual(m.yieldMultiplier, 1.0);
  assert.strictEqual(m.visibilityPenalty, 0);
  assert.strictEqual(m.movementMultiplier, 1.0);
});

test('all multiplier values are in sane range', function() {
  ['clear', 'rain', 'storm', 'snow', 'fog', 'cloudy'].forEach(function(w) {
    var m = W.getWeatherModifiers(w);
    assert(m.yieldMultiplier >= 0.5 && m.yieldMultiplier <= 3.0, w + ': yield in range');
    assert(m.movementMultiplier >= 0.25 && m.movementMultiplier <= 1.5, w + ': movement in range');
    assert(m.visibilityPenalty >= 0 && m.visibilityPenalty <= 1.0, w + ': visibility in range');
  });
});
});

report();
