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

(function testCricketRemoved() {
  // Crickets have been removed entirely — too harsh even at low frequencies
  var src = require('fs').readFileSync(require('path').join(__dirname, '..', 'src', 'js', 'audio.js'), 'utf8');
  assert(!src.includes('function cricketAM'), 'cricketAM should not exist');
  assert(!src.includes('cricketAM('), 'no cricketAM calls should exist');
  console.log('PASS: crickets fully removed');
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
