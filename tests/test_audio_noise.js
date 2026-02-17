// test_audio_noise.js - Tests for white noise lifecycle, leak prevention, and volume levels
// Validates the audio system prevents orphaned noise sources
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

console.log('\nAudio Noise Lifecycle Tests');

// ── Global noise tracking ──

test('activeNoiseSources tracker exists', function() {
  assert(src.includes('activeNoiseSources'), 'Should declare activeNoiseSources array');
  assert(src.includes('var activeNoiseSources = []') || src.includes('let activeNoiseSources = []'),
    'Should initialize as empty array');
});

test('createWhiteNoise registers sources in activeNoiseSources', function() {
  assert(src.includes('activeNoiseSources.push'), 'Should push new sources to tracker');
});

test('createWhiteNoise sets onended to remove from tracker', function() {
  assert(src.includes('onended'), 'Should set onended handler for cleanup');
  // Verify the handler removes from activeNoiseSources
  var onendedIdx = src.indexOf('onended');
  var nearbyCode = src.substring(onendedIdx, onendedIdx + 200);
  assert(nearbyCode.includes('activeNoiseSources') && nearbyCode.includes('splice'),
    'onended should splice source from activeNoiseSources');
});

test('createWhiteNoise has auto-stop safety timeout', function() {
  // Find the createWhiteNoise function body
  var fnStart = src.indexOf('function createWhiteNoise');
  var fnEnd = src.indexOf('\n  }', fnStart + 50);
  var fnBody = src.substring(fnStart, fnEnd);
  assert(fnBody.includes('setTimeout'), 'Should have safety timeout');
  assert(fnBody.includes('.stop()'), 'Safety timeout should call stop()');
  assert(fnBody.includes('.disconnect()'), 'Safety timeout should call disconnect()');
});

test('createWhiteNoise accepts maxDuration parameter', function() {
  assert(src.includes('function createWhiteNoise(') && !src.includes('function createWhiteNoise()'),
    'Should accept a parameter (not zero-arg)');
});

// ── killAllNoiseSources ──

test('killAllNoiseSources function exists', function() {
  assert(src.includes('function killAllNoiseSources'), 'Should define killAllNoiseSources');
});

test('killAllNoiseSources stops and disconnects all sources', function() {
  var fnStart = src.indexOf('function killAllNoiseSources');
  var fnEnd = src.indexOf('\n  }', fnStart + 20);
  var fnBody = src.substring(fnStart, fnEnd);
  assert(fnBody.includes('.stop()'), 'Should stop sources');
  assert(fnBody.includes('.disconnect()'), 'Should disconnect sources');
  assert(fnBody.includes('activeNoiseSources'), 'Should reference the tracker');
});

test('killAllNoiseSources empties the tracker', function() {
  var fnStart = src.indexOf('function killAllNoiseSources');
  var fnEnd = src.indexOf('\n  }', fnStart + 20);
  var fnBody = src.substring(fnStart, fnEnd);
  assert(fnBody.includes('activeNoiseSources = []') || fnBody.includes('activeNoiseSources.length = 0'),
    'Should empty the tracker after stopping all');
});

// ── Stop functions call killAllNoiseSources ──

test('stopAmbient calls killAllNoiseSources', function() {
  var fnStart = src.indexOf('function stopAmbient()');
  var nextFn = src.indexOf('\n  function ', fnStart + 20);
  var fnBody = src.substring(fnStart, nextFn);
  assert(fnBody.includes('killAllNoiseSources'), 'stopAmbient should call killAllNoiseSources');
});

test('stopAll calls killAllNoiseSources', function() {
  var fnStart = src.indexOf('function stopAll()');
  var nextFn = src.indexOf('\n  function ', fnStart + 20);
  if (nextFn === -1) nextFn = fnStart + 500;
  var fnBody = src.substring(fnStart, nextFn);
  assert(fnBody.includes('killAllNoiseSources'), 'stopAll should call killAllNoiseSources');
});

test('stopZoneAmbient calls killAllNoiseSources', function() {
  var fnStart = src.indexOf('function stopZoneAmbient()');
  var nextFn = src.indexOf('\n  function ', fnStart + 20);
  var fnBody = src.substring(fnStart, nextFn);
  assert(fnBody.includes('killAllNoiseSources'), 'stopZoneAmbient should call killAllNoiseSources');
});

test('stopTimeAmbient calls killAllNoiseSources', function() {
  var fnStart = src.indexOf('function stopTimeAmbient()');
  var nextFn = src.indexOf('\n  function ', fnStart + 20);
  var fnBody = src.substring(fnStart, nextFn);
  assert(fnBody.includes('killAllNoiseSources'), 'stopTimeAmbient should call killAllNoiseSources');
});

test('stopWeatherAmbient calls killAllNoiseSources', function() {
  var fnStart = src.indexOf('function stopWeatherAmbient()');
  var nextFn = src.indexOf('\n  function ', fnStart + 20);
  var fnBody = src.substring(fnStart, nextFn);
  assert(fnBody.includes('killAllNoiseSources'), 'stopWeatherAmbient should call killAllNoiseSources');
});

// ── Crossfade fix ──

test('setZoneAmbient stops old nodes immediately during crossfade', function() {
  var fnStart = src.indexOf('function setZoneAmbient(');
  var fnEnd = src.indexOf('\n  function ', fnStart + 20);
  var fnBody = src.substring(fnStart, fnEnd);
  // The old approach deferred cleanup to a 3.1s setTimeout.
  // The fix should stop oscillators/nodes immediately (not only in the setTimeout).
  // Check that stop() is called on old ambient's nodes BEFORE the setTimeout
  var setTimeoutIdx = fnBody.indexOf('setTimeout');
  var beforeTimeout = fnBody.substring(0, setTimeoutIdx > 0 ? setTimeoutIdx : fnBody.length);
  assert(
    beforeTimeout.includes('.stop()') || beforeTimeout.includes('killAllNoiseSources'),
    'Should stop old nodes immediately, not defer to setTimeout'
  );
});

// ── SFX noise bursts should use short durations ──

test('SFX noise callers pass short maxDuration to createWhiteNoise', function() {
  // Functions that use white noise for short bursts should pass a duration
  // Check rustle functions, footsteps, item pickup, etc.
  // They should call createWhiteNoise(N) where N is small, not createWhiteNoise()
  var sfxCallers = ['rustle', 'Footstep', 'pickup', 'portal', 'swoosh'];
  var shortDurationCount = 0;
  
  // Count calls with a numeric argument vs bare calls
  var bareCallCount = 0;
  var argCallCount = 0;
  var lines = src.split('\n');
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (line.includes('createWhiteNoise(') && !line.includes('function createWhiteNoise')) {
      if (line.includes('createWhiteNoise()')) {
        // Bare call — only OK in long-running ambient layers
        bareCallCount++;
      } else {
        argCallCount++;
      }
    }
  }
  // At least some SFX callers should pass a duration
  assert(argCallCount > 0, 'Some callers should pass maxDuration to createWhiteNoise');
});

// ── Volume levels (from previous fix) ──

test('master volume is 0.15 or lower', function() {
  var matches = src.match(/masterGain\.gain\.value\s*=\s*([\d.]+)/g);
  assert(matches && matches.length > 0, 'Should set masterGain');
  matches.forEach(function(m) {
    var val = parseFloat(m.split('=')[1]);
    assert(val <= 0.15, 'Master gain ' + val + ' should be <= 0.15');
  });
});

test('no SFX gain exceeds 0.08', function() {
  // Extract all gain.value assignments
  var gainPattern = /(\w+Gain)\.gain\.value\s*=\s*([\d.]+)/g;
  var match;
  var violations = [];
  while ((match = gainPattern.exec(src)) !== null) {
    var name = match[1];
    var val = parseFloat(match[2]);
    // Skip: masterGain, lfoGain (frequency mod), streamLfoGain (filter mod), echoDelayGain (feedback)
    // Also skip vibrato gains (frequency modulation, not volume) and wobble gains
    if (name === 'masterGain') continue;
    if (name.toLowerCase().includes('lfo')) continue;
    if (name.toLowerCase().includes('vibrato')) continue;
    if (name === 'echoDelayGain') continue;
    if (name === 'wobbleGain') continue;
    if (name === 'cricket1Gain' || name === 'cricket2Gain') continue; // AM modulation depth
    if (val > 0.08) {
      violations.push(name + ' = ' + val);
    }
  }
  assert(violations.length === 0, 'Gains too high: ' + violations.join(', '));
});

test('piano accent volumes are all 0.06 or lower', function() {
  // Only check volumes inside the PIANO_ACCENTS definition
  var accentStart = src.indexOf('var PIANO_ACCENTS');
  var accentEnd = src.indexOf('};', accentStart) + 2;
  var accentBlock = src.substring(accentStart, accentEnd);
  var volumePattern = /volume:\s*([\d.]+)/g;
  var match;
  while ((match = volumePattern.exec(accentBlock)) !== null) {
    var val = parseFloat(match[1]);
    assert(val <= 0.06, 'Piano accent volume ' + val + ' should be <= 0.06');
  }
});

// Report
console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
