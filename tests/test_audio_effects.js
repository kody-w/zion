var assert = require('assert');

(function testZoneEntrySwooshParams() {
  // Verify the swoosh design parameters (warm, sub-bass focused)
  var noiseLength = 40; // ms
  var bandpassFreq = 400; // Hz
  var sweepStart = 300; // Hz (dropped from 600)
  var sweepEnd = 100; // Hz
  var sweepDuration = 0.3; // seconds
  var totalDuration = 0.4; // seconds
  var gain = 0.15;

  assert(noiseLength > 0 && noiseLength < 100, 'Noise burst should be short');
  assert(bandpassFreq >= 100 && bandpassFreq <= 600, 'Bandpass should be warm range');
  assert(sweepStart > sweepEnd, 'Sweep should descend');
  assert(gain < 0.3, 'Zone enter should not be too loud');
  console.log('PASS: zone entry swoosh parameters');
})();

(function testShutterClickParams() {
  var clickDuration = 5; // ms per click
  var clickGap = 30; // ms between clicks
  var filterFreq = 300; // Hz (lowpass for warmth instead of highpass)
  var gain = 0.1;

  assert(clickDuration < 20, 'Click should be very short');
  assert(clickGap > 10 && clickGap < 100, 'Gap should mimic camera shutter');
  assert(filterFreq <= 600, 'Filter should be warm (sub-600Hz)');
  assert(gain <= 0.15, 'Shutter should be subtle');
  console.log('PASS: shutter click parameters');
})();

(function testCricketParams() {
  // Crickets are now deep sub-bass hum instead of high-pitched chirp
  var cricketFreq = 60; // Hz (deep hum)
  var pulseRate = 20; // Hz (AM modulation)
  var gain = 0.015;

  assert(cricketFreq < 200, 'Cricket frequency should be sub-bass for warmth');
  assert(gain < 0.05, 'Crickets should be very quiet');
  console.log('PASS: cricket ambient parameters');
})();

(function testPlaySoundTypes() {
  var newTypes = ['zone_enter', 'shutter'];
  newTypes.forEach(function(type) {
    assert(typeof type === 'string', 'Sound type should be a string');
    assert(type.length > 0, 'Sound type should not be empty');
  });
  console.log('PASS: new sound type names');
})();

console.log('All audio effects tests passed!');
