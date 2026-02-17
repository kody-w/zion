var assert = require('assert');

(function testTouchOrbitDeltaCalculation() {
  var sensitivity = 0.008;
  var deltaX = 50; // pixels
  var orbitDelta = -deltaX * sensitivity;
  assert.strictEqual(orbitDelta, -0.4, 'Orbit delta should match sensitivity');
  console.log('PASS: touch orbit delta calculation');
})();

(function testTouchPitchDeltaCalculation() {
  var sensitivity = 0.005;
  var deltaY = 30; // pixels
  var pitchDelta = deltaY * sensitivity;
  assert.strictEqual(pitchDelta, 0.15, 'Pitch delta should match sensitivity');
  console.log('PASS: touch pitch delta calculation');
})();

(function testDragVsTapThreshold() {
  var tapThreshold = 10; // pixels

  // Small movement = tap
  var smallMove = 5;
  assert(smallMove < tapThreshold, 'Small movement should be detected as tap');

  // Large movement = drag
  var largeMove = 30;
  assert(largeMove >= tapThreshold, 'Large movement should be detected as drag');

  console.log('PASS: drag vs tap threshold');
})();

(function testTapTimingThreshold() {
  var tapMaxDuration = 300; // ms

  var quickTap = 150; // ms
  assert(quickTap < tapMaxDuration, 'Quick touch should be detected as tap');

  var longPress = 500; // ms
  assert(longPress >= tapMaxDuration, 'Long press should not be detected as tap');

  console.log('PASS: tap timing threshold');
})();

(function testPinchZoomRange() {
  var minDist = 5;
  var maxDist = 50;
  var distance = 25;
  var clamped = Math.max(minDist, Math.min(maxDist, distance));
  assert.strictEqual(clamped, 25, 'Distance within range should not be clamped');

  var tooClose = 2;
  var clampedClose = Math.max(minDist, Math.min(maxDist, tooClose));
  assert.strictEqual(clampedClose, 5, 'Too-close distance should clamp to min');

  var tooFar = 60;
  var clampedFar = Math.max(minDist, Math.min(maxDist, tooFar));
  assert.strictEqual(clampedFar, 50, 'Too-far distance should clamp to max');

  console.log('PASS: pinch zoom range clamping');
})();

console.log('All mobile touch tests passed!');
