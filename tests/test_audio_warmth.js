// test_audio_warmth.js - Verify NO harsh/high frequencies in the audio system
// ZION audio should be warm, ambient, sub-600Hz — no cringe-inducing tones
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

console.log('\nAudio Warmth & Frequency Cap Tests');

// ── Oscillator frequency cap: 600Hz ──

test('no oscillator frequency assignment exceeds 600Hz', function() {
  // Match: frequency.value = N, frequency.setValueAtTime(N, ...),
  //        frequency.linearRampToValueAtTime(N, ...)
  //        frequency.exponentialRampToValueAtTime(N, ...)
  var freqPattern = /frequency\.(value\s*=\s*|setValueAtTime\s*\(\s*|linearRampToValueAtTime\s*\(\s*|exponentialRampToValueAtTime\s*\(\s*)([\d.]+)/g;
  var violations = [];
  var match;
  while ((match = freqPattern.exec(src)) !== null) {
    var val = parseFloat(match[2]);
    // Skip: LFO rates (< 50Hz are modulation oscillators), Q values (handled separately),
    // and filter frequency assignments (checked separately below)
    // We need to check if this is an oscillator frequency, not a filter frequency
    // Look back 200 chars for context
    var start = Math.max(0, match.index - 200);
    var context = src.substring(start, match.index);

    // Skip filter frequency assignments (filter.frequency, rf.frequency, etc.)
    // We only care about oscillator frequency being too high
    if (/[bB]iquad[Ff]ilter/.test(context.slice(-120))) continue;
    // Skip if this looks like a filter variable (ends with f, Filter, filt)
    var lastLine = context.split('\n').pop();
    if (/\b(filter|filt|[a-z]f|[a-z]Filter|melFilter|Filter|hp|bp|lp)\b/i.test(lastLine) &&
        /frequency/.test(lastLine)) continue;

    // Skip LFO modulation rates (typically < 30Hz)
    if (val < 30) continue;

    if (val > 600) {
      var lineNum = src.substring(0, match.index).split('\n').length;
      violations.push('line ' + lineNum + ': ' + val + 'Hz');
    }
  }
  assert(violations.length === 0,
    'Oscillator frequencies > 600Hz found:\n    ' + violations.join('\n    '));
});

// ── Filter cutoff cap: 600Hz ──

test('no filter cutoff exceeds 600Hz', function() {
  // Find all filter frequency assignments
  var lines = src.split('\n');
  var violations = [];
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    // Look for filter-related frequency assignments
    if (/(filter|filt|[a-z]f|hp|bp|lp|rf|sf|bf|cf|ff|tf|wf|mf|ef|chatf|pf)\.(frequency|frequency\.value)\s*=?\s*/.test(line) ||
        /Filter\.frequency/.test(line)) {
      var freqMatch = line.match(/frequency\.value\s*=\s*([\d.]+)/);
      if (freqMatch) {
        var freq = parseFloat(freqMatch[1]);
        if (freq > 600) {
          violations.push('line ' + (i + 1) + ': ' + freq + 'Hz (' + line.trim().substring(0, 80) + ')');
        }
      }
    }
  }
  assert(violations.length === 0,
    'Filter cutoffs > 600Hz found:\n    ' + violations.join('\n    '));
});

// ── SCALES frequency cap ──

test('all SCALES frequencies are below 400Hz for deep warmth', function() {
  var scaleStart = src.indexOf('var SCALES');
  var scaleEnd = src.indexOf('};', scaleStart) + 2;
  var scaleBlock = src.substring(scaleStart, scaleEnd);
  var freqPattern = /[\d]+\.[\d]+/g;
  var match;
  var violations = [];
  while ((match = freqPattern.exec(scaleBlock)) !== null) {
    var freq = parseFloat(match[0]);
    if (freq > 1 && freq > 400) {
      violations.push(freq + 'Hz');
    }
  }
  assert(violations.length === 0,
    'Scale frequencies > 400Hz: ' + violations.join(', '));
});

// ── PIANO_ACCENTS frequency cap ──

test('all PIANO_ACCENTS note frequencies are below 400Hz', function() {
  var accentStart = src.indexOf('var PIANO_ACCENTS');
  var accentEnd = src.indexOf('};', accentStart) + 2;
  var accentBlock = src.substring(accentStart, accentEnd);
  var freqPattern = /[\d]+\.[\d]+/g;
  var match;
  var violations = [];
  while ((match = freqPattern.exec(accentBlock)) !== null) {
    var freq = parseFloat(match[0]);
    if (freq > 1 && freq > 400) {
      violations.push(freq + 'Hz');
    }
  }
  assert(violations.length === 0,
    'Piano accent frequencies > 400Hz: ' + violations.join(', '));
});

// ── No sawtooth or square oscillators ──

test('no sawtooth oscillators (too harsh)', function() {
  var sawMatches = src.match(/type\s*=\s*['"]sawtooth['"]/g);
  assert(!sawMatches || sawMatches.length === 0,
    'Found ' + (sawMatches ? sawMatches.length : 0) + ' sawtooth oscillators — use sine or triangle only');
});

test('no square oscillators (too harsh)', function() {
  var sqMatches = src.match(/type\s*=\s*['"]square['"]/g);
  assert(!sqMatches || sqMatches.length === 0,
    'Found ' + (sqMatches ? sqMatches.length : 0) + ' square oscillators — use sine or triangle only');
});

// ── Warm noise: all continuous noise through sub-300Hz lowpass ──

test('wind layers use sub-300Hz lowpass', function() {
  var fnStart = src.indexOf('function windLayer');
  if (fnStart === -1) { assert(true); return; }
  var fnEnd = src.indexOf('\n  }', fnStart + 20);
  var fnBody = src.substring(fnStart, fnEnd);
  var filterMatch = fnBody.match(/frequency\.value\s*=\s*([\d]+)/);
  assert(filterMatch, 'windLayer should have a filter');
  var cutoff = parseInt(filterMatch[1]);
  assert(cutoff <= 300, 'Wind filter should be <= 300Hz for warmth, got ' + cutoff);
});

// ── Bird chirps should be mellow (below 400Hz) ──

test('bird/chirp layer frequencies stay below 500Hz', function() {
  var fnStart = src.indexOf('function chirpLayer');
  if (fnStart === -1) { assert(true); return; }
  var fnEnd = src.indexOf('\n  }', fnStart + 20);
  var fnBody = src.substring(fnStart, fnEnd);
  // Find all frequency literals in chirpLayer
  var freqs = [];
  var fMatch;
  var fPat = /([\d]+)/g;
  // Look for the minFreq/maxFreq parameters in calls
  // The key thing: no frequency > 500 in the chirp layer definition
  var violations = [];
  var lineFreqPat = /frequency[\s\S]*?([\d]{3,})/g;
  while ((fMatch = lineFreqPat.exec(fnBody)) !== null) {
    var f = parseInt(fMatch[1]);
    if (f > 500 && f < 44100) violations.push(f);
  }
  assert(violations.length === 0,
    'Chirp frequencies > 500Hz: ' + violations.join(', '));
});

// ── Overall vibe check ──

test('masterGain is set to 0.15 or lower', function() {
  var matches = src.match(/masterGain\.gain\.value\s*=\s*([\d.]+)/g);
  assert(matches && matches.length > 0, 'Should set masterGain');
  matches.forEach(function(m) {
    var val = parseFloat(m.split('=')[1]);
    assert(val <= 0.15, 'Master gain ' + val + ' should be <= 0.15');
  });
});

test('continuous noise gains are all <= 0.05', function() {
  var noiseGains = ['streamGain', 'breezeGain', 'windGain', 'crowdGain', 'chatterGain'];
  var gainPattern = /(\w+Gain)\.gain\.value\s*=\s*([\d.]+)/g;
  var match;
  var violations = [];
  while ((match = gainPattern.exec(src)) !== null) {
    var name = match[1];
    var val = parseFloat(match[2]);
    if (noiseGains.indexOf(name) !== -1 && val > 0.05) {
      violations.push(name + ' = ' + val);
    }
  }
  assert(violations.length === 0,
    'Continuous noise gains too high: ' + violations.join(', '));
});

// Report
console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
