// test_no_crickets_birds.js - Verify no cricket or bird sounds in audio system
// These were too harsh even at low frequencies — removed entirely
var assert = require('assert');
var fs = require('fs');
var path = require('path');

var src = fs.readFileSync(path.join(__dirname, '..', 'src', 'js', 'audio.js'), 'utf8');

var passed = 0;
var failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    process.stdout.write('  \u2713 ' + name + '\n');
  } catch (e) {
    failed++;
    process.stdout.write('  \u2717 ' + name + ': ' + e.message + '\n');
  }
}

console.log('\nNo Crickets/Birds Tests');

test('no chirpLayer function definition', function() {
  assert(!src.includes('function chirpLayer'), 'chirpLayer should be removed');
});

test('no chirpLayer calls', function() {
  assert(!src.includes('chirpLayer('), 'no calls to chirpLayer');
});

test('no cricketAM function definition', function() {
  assert(!src.includes('function cricketAM'), 'cricketAM should be removed');
});

test('no cricketAM calls', function() {
  assert(!src.includes('cricketAM('), 'no calls to cricketAM');
});

test('no inline bird function in gardens ambient', function() {
  assert(!src.includes('function bird()'), 'no inline bird() function');
});

test('no inline cricket oscillators in gardens ambient', function() {
  // Check there are no variables named cric/cam for cricket
  var cricPattern = /\bcric\b.*frequency/;
  assert(!cricPattern.test(src), 'no cricket oscillator references');
});

test('TOD_AMBIENTS still exists and has all 6 time periods', function() {
  assert(src.includes('var TOD_AMBIENTS'), 'TOD_AMBIENTS should exist');
  ['dawn', 'morning', 'midday', 'afternoon', 'evening', 'night'].forEach(function(t) {
    assert(src.includes(t + ':'), t + ' period should still exist in TOD_AMBIENTS');
  });
});

test('windLayer still used in time-of-day ambients', function() {
  assert(src.includes('windLayer(s,'), 'windLayer should still be used');
});

test('hootLayer still used in evening/night', function() {
  assert(src.includes('hootLayer(s,'), 'hootLayer (owl) should still be used');
});

test('rustleLayer still used', function() {
  assert(src.includes('rustleLayer(s,'), 'rustleLayer should still be used');
});

// Report
console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
