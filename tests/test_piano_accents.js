// test_piano_accents.js - Piano accent system (BotW-style environmental cues)
// Tests: export existence, accent definitions, note validation, volume routing
const { test, suite, report, assert } = require('./test_runner');
const path = require('path');

var Audio;
try {
  Audio = require(path.join(__dirname, '..', 'src', 'js', 'audio.js'));
} catch (e) {
  console.error('Failed to load audio.js:', e.message);
  process.exit(1);
}

// ─── Export existence ────────────────────────────────────────────────────────

suite('Piano Accent Exports', function() {
  test('Audio.playPianoAccent is exported as a function', function() {
    assert.strictEqual(typeof Audio.playPianoAccent, 'function',
      'playPianoAccent should be a function');
  });

  test('Audio.getPianoAccentTypes is exported as a function', function() {
    assert.strictEqual(typeof Audio.getPianoAccentTypes, 'function',
      'getPianoAccentTypes should be a function — used to validate accent types');
  });
});

// ─── Accent type definitions ─────────────────────────────────────────────────

suite('Piano Accent Types', function() {
  var types = Audio.getPianoAccentTypes ? Audio.getPianoAccentTypes() : {};

  var requiredTypes = [
    'dawn',            // morning transition — ascending bright arpeggio
    'dusk',            // evening transition — descending gentle notes
    'night',           // night falls — low mysterious tones
    'zone_discovery',  // entering a zone for the first time — flourish
    'quest_complete',  // turning in a quest — triumphant phrase
    'achievement',     // unlocking an achievement — playful ascending
    'morning'          // full morning — warm arpeggiated phrase
  ];

  requiredTypes.forEach(function(accentType) {
    test('Accent type "' + accentType + '" is defined', function() {
      assert.ok(types[accentType], 'Missing accent type: ' + accentType);
    });
  });

  // Each accent type must have a notes array with valid frequencies
  requiredTypes.forEach(function(accentType) {
    test('"' + accentType + '" has notes array with valid frequencies', function() {
      var accent = types[accentType];
      if (!accent) throw new Error('Accent type not found');
      assert.ok(Array.isArray(accent.notes), 'notes should be an array');
      assert.ok(accent.notes.length >= 2, 'needs at least 2 notes, got ' + accent.notes.length);
      accent.notes.forEach(function(note, i) {
        assert.ok(typeof note === 'number' && note > 0 && note < 10000,
          'Note ' + i + ' should be a positive frequency, got ' + note);
      });
    });
  });

  // Each accent must have timing parameters
  requiredTypes.forEach(function(accentType) {
    test('"' + accentType + '" has timing parameters', function() {
      var accent = types[accentType];
      if (!accent) throw new Error('Accent type not found');
      assert.ok(typeof accent.noteSpacing === 'number' && accent.noteSpacing > 0,
        'noteSpacing should be a positive number');
      assert.ok(typeof accent.noteDuration === 'number' && accent.noteDuration > 0,
        'noteDuration should be a positive number');
    });
  });

  // Each accent must specify a volume multiplier
  requiredTypes.forEach(function(accentType) {
    test('"' + accentType + '" has volume between 0 and 1', function() {
      var accent = types[accentType];
      if (!accent) throw new Error('Accent type not found');
      assert.ok(typeof accent.volume === 'number',
        'volume should be a number');
      assert.ok(accent.volume > 0 && accent.volume <= 1,
        'volume should be between 0 and 1, got ' + accent.volume);
    });
  });
});

// ─── Musical quality checks ──────────────────────────────────────────────────

suite('Piano Accent Musical Properties', function() {
  var types = Audio.getPianoAccentTypes ? Audio.getPianoAccentTypes() : {};

  test('Dawn notes ascend (bright rising feel)', function() {
    var notes = types.dawn ? types.dawn.notes : [];
    if (notes.length < 2) throw new Error('Not enough notes');
    // At least the last note should be higher than the first (overall ascending)
    assert.ok(notes[notes.length - 1] > notes[0],
      'Dawn should ascend: first=' + notes[0] + ' last=' + notes[notes.length - 1]);
  });

  test('Dusk notes descend (gentle falling feel)', function() {
    var notes = types.dusk ? types.dusk.notes : [];
    if (notes.length < 2) throw new Error('Not enough notes');
    assert.ok(notes[notes.length - 1] < notes[0],
      'Dusk should descend: first=' + notes[0] + ' last=' + notes[notes.length - 1]);
  });

  test('Night notes are low register (below middle C = 261.63 Hz)', function() {
    var notes = types.night ? types.night.notes : [];
    if (notes.length < 2) throw new Error('Not enough notes');
    var avg = notes.reduce(function(s, n) { return s + n; }, 0) / notes.length;
    assert.ok(avg < 350,
      'Night average frequency should be low (< 350 Hz), got ' + avg.toFixed(1));
  });

  test('Zone discovery has at least 4 notes (flourish)', function() {
    var notes = types.zone_discovery ? types.zone_discovery.notes : [];
    assert.ok(notes.length >= 4,
      'Zone discovery should have at least 4 notes, got ' + notes.length);
  });

  test('Quest complete has at least 4 notes (triumphant phrase)', function() {
    var notes = types.quest_complete ? types.quest_complete.notes : [];
    assert.ok(notes.length >= 4,
      'Quest complete should have at least 4 notes, got ' + notes.length);
  });

  test('Achievement notes end higher than they start (ascending)', function() {
    var notes = types.achievement ? types.achievement.notes : [];
    if (notes.length < 2) throw new Error('Not enough notes');
    assert.ok(notes[notes.length - 1] > notes[0],
      'Achievement should end higher: first=' + notes[0] + ' last=' + notes[notes.length - 1]);
  });
});

// ─── Graceful degradation ────────────────────────────────────────────────────

suite('Piano Accent Graceful Degradation', function() {
  test('playPianoAccent does not throw without audio context', function() {
    // Audio context is null in Node — should return silently
    assert.doesNotThrow(function() {
      Audio.playPianoAccent('dawn');
    }, 'playPianoAccent should not throw when audioContext is null');
  });

  test('playPianoAccent does not throw for unknown type', function() {
    assert.doesNotThrow(function() {
      Audio.playPianoAccent('nonexistent_type');
    }, 'playPianoAccent should handle unknown types gracefully');
  });

  test('playPianoAccent does not throw with no arguments', function() {
    assert.doesNotThrow(function() {
      Audio.playPianoAccent();
    }, 'playPianoAccent should handle missing arguments');
  });
});

// ─── Wiring verification (main.js calls) ─────────────────────────────────────

suite('Piano Accent Wiring in main.js', function() {
  var fs = require('fs');
  var mainSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'js', 'main.js'), 'utf8');
  // Strip comments
  var clean = mainSrc.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

  var expectedWirings = [
    { trigger: 'dawn time change', pattern: /playPianoAccent\s*\(\s*['"]dawn['"]/ },
    { trigger: 'dusk time change', pattern: /playPianoAccent\s*\(\s*['"]dusk['"]/ },
    { trigger: 'night time change', pattern: /playPianoAccent\s*\(\s*['"]night['"]/ },
    { trigger: 'zone discovery', pattern: /playPianoAccent\s*\(\s*['"]zone_discovery['"]/ },
    { trigger: 'quest completion', pattern: /playPianoAccent\s*\(\s*['"]quest_complete['"]/ },
    { trigger: 'achievement unlock', pattern: /playPianoAccent\s*\(\s*['"]achievement['"]/ }
  ];

  expectedWirings.forEach(function(w) {
    test('main.js calls playPianoAccent for ' + w.trigger, function() {
      assert.ok(w.pattern.test(clean),
        'main.js should call Audio.playPianoAccent(\'' + w.trigger.split(' ')[0] + '\') for ' + w.trigger);
    });
  });
});

var success = report();
process.exit(success ? 0 : 1);
