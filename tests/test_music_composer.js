/**
 * tests/test_music_composer.js
 * 80+ tests for the MusicComposer module.
 */
'use strict';

const { test, suite, report, assert } = require('./test_runner');
const MC = require('../src/js/music_composer');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeComp(name, tempo, sig) {
  return MC.createComposition(name || 'Test', tempo || 120, sig || [4, 4]);
}

function makeTrack(comp, instr, name) {
  return MC.addTrack(comp, instr || 'piano', name || 'Lead');
}

// ---------------------------------------------------------------------------
// NOTE_FREQUENCIES
// ---------------------------------------------------------------------------
suite('NOTE_FREQUENCIES', function() {

  test('C4 is 261.63 Hz', function() {
    assert.strictEqual(MC.NOTE_FREQUENCIES['C4'], 261.63);
  });

  test('A4 is 440.00 Hz', function() {
    assert.strictEqual(MC.NOTE_FREQUENCIES['A4'], 440.00);
  });

  test('C3 is present (130.81)', function() {
    assert(MC.NOTE_FREQUENCIES['C3'] > 130 && MC.NOTE_FREQUENCIES['C3'] < 131);
  });

  test('C6 is present (1046.50)', function() {
    assert(MC.NOTE_FREQUENCIES['C6'] > 1046 && MC.NOTE_FREQUENCIES['C6'] < 1047);
  });

  test('Sharp notes are present (C#4)', function() {
    assert(MC.NOTE_FREQUENCIES['C#4'] > 277 && MC.NOTE_FREQUENCIES['C#4'] < 278);
  });

  test('All 12 chromatic notes exist in octave 4', function() {
    var names = ['C4','C#4','D4','D#4','E4','F4','F#4','G4','G#4','A4','A#4','B4'];
    names.forEach(function(n) {
      assert(MC.NOTE_FREQUENCIES[n] > 0, 'Missing ' + n);
    });
  });

  test('Flat alias Bb4 maps same as A#4', function() {
    assert.strictEqual(MC.NOTE_FREQUENCIES['Bb4'], MC.NOTE_FREQUENCIES['A#4']);
  });

  test('Flat alias Eb4 maps same as D#4', function() {
    assert.strictEqual(MC.NOTE_FREQUENCIES['Eb4'], MC.NOTE_FREQUENCIES['D#4']);
  });

  test('Frequencies increase from C3 to C6', function() {
    var prev = 0;
    var notes = ['C3','C4','C5','C6'];
    notes.forEach(function(n) {
      var freq = MC.NOTE_FREQUENCIES[n];
      assert(freq > prev, n + ' should be higher than previous');
      prev = freq;
    });
  });

});

// ---------------------------------------------------------------------------
// INSTRUMENTS
// ---------------------------------------------------------------------------
suite('INSTRUMENTS', function() {

  test('piano is defined', function() {
    assert(MC.INSTRUMENTS.piano, 'piano missing');
  });

  test('all 6 instruments present', function() {
    var keys = ['piano','strings','flute','drums','synth','bell'];
    keys.forEach(function(k) {
      assert(MC.INSTRUMENTS[k], 'Missing instrument: ' + k);
    });
  });

  test('each instrument has waveform', function() {
    Object.keys(MC.INSTRUMENTS).forEach(function(k) {
      assert(MC.INSTRUMENTS[k].waveform, k + ' missing waveform');
    });
  });

  test('each instrument has ADSR envelope fields', function() {
    Object.keys(MC.INSTRUMENTS).forEach(function(k) {
      var ins = MC.INSTRUMENTS[k];
      assert(typeof ins.attack   === 'number', k + ' missing attack');
      assert(typeof ins.decay    === 'number', k + ' missing decay');
      assert(typeof ins.sustain  === 'number', k + ' missing sustain');
      assert(typeof ins.release  === 'number', k + ' missing release');
    });
  });

  test('drums instrument uses noise waveform', function() {
    assert.strictEqual(MC.INSTRUMENTS.drums.waveform, 'noise');
  });

});

// ---------------------------------------------------------------------------
// SCALES
// ---------------------------------------------------------------------------
suite('SCALES', function() {

  test('major scale has 7 intervals', function() {
    assert.strictEqual(MC.SCALES.major.length, 7);
  });

  test('pentatonic has 5 intervals', function() {
    assert.strictEqual(MC.SCALES.pentatonic.length, 5);
  });

  test('blues has 6 intervals', function() {
    assert.strictEqual(MC.SCALES.blues.length, 6);
  });

  test('all 6 scale types present', function() {
    var keys = ['major','minor','pentatonic','blues','dorian','mixolydian'];
    keys.forEach(function(k) {
      assert(MC.SCALES[k], 'Missing scale: ' + k);
    });
  });

  test('all scales start with 0 (root interval)', function() {
    Object.keys(MC.SCALES).forEach(function(k) {
      assert.strictEqual(MC.SCALES[k][0], 0, k + ' should start with 0');
    });
  });

});

// ---------------------------------------------------------------------------
// createComposition
// ---------------------------------------------------------------------------
suite('createComposition', function() {

  test('returns object with correct name', function() {
    var c = makeComp('Symphony No. 1');
    assert.strictEqual(c.name, 'Symphony No. 1');
  });

  test('sets tempo', function() {
    var c = makeComp('T', 140);
    assert.strictEqual(c.tempo, 140);
  });

  test('clamps tempo below 60 to 60', function() {
    var c = makeComp('T', 20);
    assert.strictEqual(c.tempo, 60);
  });

  test('clamps tempo above 240 to 240', function() {
    var c = makeComp('T', 999);
    assert.strictEqual(c.tempo, 240);
  });

  test('sets time signature', function() {
    var c = makeComp('T', 120, [3, 4]);
    assert.deepStrictEqual(c.timeSignature, [3, 4]);
  });

  test('defaults time signature to [4,4]', function() {
    var c = makeComp('T', 120, null);
    assert.deepStrictEqual(c.timeSignature, [4, 4]);
  });

  test('starts with empty tracks', function() {
    var c = makeComp();
    assert.strictEqual(c.tracks.length, 0);
  });

  test('has unique id', function() {
    var a = makeComp('A');
    var b = makeComp('B');
    assert.notStrictEqual(a.id, b.id);
  });

  test('has createdAt timestamp', function() {
    var c = makeComp();
    assert(typeof c.createdAt === 'number' && c.createdAt > 0);
  });

  test('defaults name to Untitled when omitted', function() {
    var c = MC.createComposition();
    assert.strictEqual(c.name, 'Untitled');
  });

});

// ---------------------------------------------------------------------------
// addTrack / removeTrack
// ---------------------------------------------------------------------------
suite('addTrack / removeTrack', function() {

  test('addTrack adds a track', function() {
    var c = makeComp();
    makeTrack(c, 'piano', 'Piano');
    assert.strictEqual(c.tracks.length, 1);
  });

  test('addTrack returns the track object', function() {
    var c = makeComp();
    var t = makeTrack(c, 'strings');
    assert(t && t.id, 'Expected track with id');
  });

  test('track has notes array', function() {
    var c = makeComp();
    var t = makeTrack(c, 'flute');
    assert(Array.isArray(t.notes));
  });

  test('track instrument set correctly', function() {
    var c = makeComp();
    var t = makeTrack(c, 'bell');
    assert.strictEqual(t.instrument, 'bell');
  });

  test('multiple tracks can be added', function() {
    var c = makeComp();
    makeTrack(c, 'piano');
    makeTrack(c, 'drums');
    makeTrack(c, 'strings');
    assert.strictEqual(c.tracks.length, 3);
  });

  test('removeTrack removes by id', function() {
    var c = makeComp();
    var t = makeTrack(c, 'piano');
    MC.removeTrack(c, t.id);
    assert.strictEqual(c.tracks.length, 0);
  });

  test('removeTrack returns true when found', function() {
    var c = makeComp();
    var t = makeTrack(c, 'piano');
    var result = MC.removeTrack(c, t.id);
    assert.strictEqual(result, true);
  });

  test('removeTrack returns false for unknown id', function() {
    var c = makeComp();
    var result = MC.removeTrack(c, 'nonexistent');
    assert.strictEqual(result, false);
  });

  test('track has volume 1.0 by default', function() {
    var c = makeComp();
    var t = makeTrack(c, 'piano');
    assert.strictEqual(t.volume, 1.0);
  });

  test('track is not muted by default', function() {
    var c = makeComp();
    var t = makeTrack(c, 'piano');
    assert.strictEqual(t.muted, false);
  });

});

// ---------------------------------------------------------------------------
// addNote / removeNote
// ---------------------------------------------------------------------------
suite('addNote / removeNote', function() {

  test('addNote adds a note', function() {
    var c = makeComp();
    var t = makeTrack(c, 'piano');
    MC.addNote(t, 'C4', 0, 1, 100);
    assert.strictEqual(t.notes.length, 1);
  });

  test('addNote returns note object', function() {
    var c = makeComp();
    var t = makeTrack(c, 'piano');
    var n = MC.addNote(t, 'E4', 0, 1, 80);
    assert(n && n.id, 'Expected note with id');
  });

  test('note pitch is set correctly', function() {
    var c = makeComp();
    var t = makeTrack(c, 'piano');
    var n = MC.addNote(t, 'G4', 2, 0.5, 90);
    assert.strictEqual(n.pitch, 'G4');
  });

  test('note startBeat is set', function() {
    var c = makeComp();
    var t = makeTrack(c, 'piano');
    var n = MC.addNote(t, 'C4', 3.5, 1, 100);
    assert.strictEqual(n.startBeat, 3.5);
  });

  test('note duration is set', function() {
    var c = makeComp();
    var t = makeTrack(c, 'piano');
    var n = MC.addNote(t, 'C4', 0, 2, 100);
    assert.strictEqual(n.duration, 2);
  });

  test('note velocity clamped to 0-127', function() {
    var c = makeComp();
    var t = makeTrack(c, 'piano');
    var n1 = MC.addNote(t, 'C4', 0, 1, 200);
    var n2 = MC.addNote(t, 'C4', 1, 1, -5);
    assert.strictEqual(n1.velocity, 127);
    assert.strictEqual(n2.velocity, 0);
  });

  test('removeNote removes by id', function() {
    var c = makeComp();
    var t = makeTrack(c, 'piano');
    var n = MC.addNote(t, 'C4', 0, 1, 100);
    MC.removeNote(t, n.id);
    assert.strictEqual(t.notes.length, 0);
  });

  test('removeNote returns true when found', function() {
    var c = makeComp();
    var t = makeTrack(c, 'piano');
    var n = MC.addNote(t, 'C4', 0, 1, 100);
    assert.strictEqual(MC.removeNote(t, n.id), true);
  });

  test('removeNote returns false for unknown id', function() {
    var c = makeComp();
    var t = makeTrack(c, 'piano');
    assert.strictEqual(MC.removeNote(t, 'bogus'), false);
  });

  test('multiple notes can be added', function() {
    var c = makeComp();
    var t = makeTrack(c, 'piano');
    MC.addNote(t, 'C4', 0, 1, 100);
    MC.addNote(t, 'E4', 1, 1, 100);
    MC.addNote(t, 'G4', 2, 1, 100);
    assert.strictEqual(t.notes.length, 3);
  });

});

// ---------------------------------------------------------------------------
// setTempo
// ---------------------------------------------------------------------------
suite('setTempo', function() {

  test('sets valid tempo', function() {
    var c = makeComp('T', 120);
    MC.setTempo(c, 160);
    assert.strictEqual(c.tempo, 160);
  });

  test('clamps to 60 minimum', function() {
    var c = makeComp();
    MC.setTempo(c, 10);
    assert.strictEqual(c.tempo, 60);
  });

  test('clamps to 240 maximum', function() {
    var c = makeComp();
    MC.setTempo(c, 500);
    assert.strictEqual(c.tempo, 240);
  });

  test('returns new tempo', function() {
    var c = makeComp();
    var result = MC.setTempo(c, 180);
    assert.strictEqual(result, 180);
  });

  test('updates updatedAt', function() {
    var c = makeComp();
    var before = c.updatedAt;
    MC.setTempo(c, 90);
    assert(c.updatedAt >= before);
  });

});

// ---------------------------------------------------------------------------
// transposeTrack
// ---------------------------------------------------------------------------
suite('transposeTrack', function() {

  test('transpose up 1 semitone (C4 -> C#4)', function() {
    var c = makeComp();
    var t = makeTrack(c, 'piano');
    MC.addNote(t, 'C4', 0, 1, 100);
    MC.transposeTrack(t, 1);
    assert.strictEqual(t.notes[0].pitch, 'C#4');
  });

  test('transpose down 2 semitones (E4 -> D4)', function() {
    var c = makeComp();
    var t = makeTrack(c, 'piano');
    MC.addNote(t, 'E4', 0, 1, 100);
    MC.transposeTrack(t, -2);
    assert.strictEqual(t.notes[0].pitch, 'D4');
  });

  test('transpose up 12 semitones (octave up: C4 -> C5)', function() {
    var c = makeComp();
    var t = makeTrack(c, 'piano');
    MC.addNote(t, 'C4', 0, 1, 100);
    MC.transposeTrack(t, 12);
    assert.strictEqual(t.notes[0].pitch, 'C5');
  });

  test('transpose down 12 semitones (octave down: C5 -> C4)', function() {
    var c = makeComp();
    var t = makeTrack(c, 'piano');
    MC.addNote(t, 'C5', 0, 1, 100);
    MC.transposeTrack(t, -12);
    assert.strictEqual(t.notes[0].pitch, 'C4');
  });

  test('drum labels pass through unchanged', function() {
    var c = makeComp();
    var t = makeTrack(c, 'drums');
    MC.addNote(t, 'kick', 0, 0.25, 100);
    MC.transposeTrack(t, 5);
    assert.strictEqual(t.notes[0].pitch, 'kick');
  });

  test('multiple notes all transposed', function() {
    var c = makeComp();
    var t = makeTrack(c, 'piano');
    MC.addNote(t, 'C4', 0, 1, 100);
    MC.addNote(t, 'E4', 1, 1, 100);
    MC.addNote(t, 'G4', 2, 1, 100);
    MC.transposeTrack(t, 2);
    assert.strictEqual(t.notes[0].pitch, 'D4');
    assert.strictEqual(t.notes[1].pitch, 'F#4');
    assert.strictEqual(t.notes[2].pitch, 'A4');
  });

  test('returns the track object', function() {
    var c = makeComp();
    var t = makeTrack(c, 'piano');
    var result = MC.transposeTrack(t, 0);
    assert.strictEqual(result, t);
  });

});

// ---------------------------------------------------------------------------
// quantizeNotes
// ---------------------------------------------------------------------------
suite('quantizeNotes', function() {

  test('quantize to 1/4 — already on grid stays same', function() {
    var c = makeComp();
    var t = makeTrack(c, 'piano');
    MC.addNote(t, 'C4', 2, 1, 100);
    MC.quantizeNotes(t, '1/4');
    assert.strictEqual(t.notes[0].startBeat, 2);
  });

  test('quantize to 1/4 — off-grid snaps to nearest', function() {
    var c = makeComp();
    var t = makeTrack(c, 'piano');
    MC.addNote(t, 'C4', 0.3, 1, 100);   // nearest 1/4 = 0
    MC.quantizeNotes(t, '1/4');
    assert.strictEqual(t.notes[0].startBeat, 0);
  });

  test('quantize to 1/8 — 0.6 snaps to 0.5', function() {
    var c = makeComp();
    var t = makeTrack(c, 'piano');
    MC.addNote(t, 'C4', 0.6, 1, 100);
    MC.quantizeNotes(t, '1/8');
    assert.strictEqual(t.notes[0].startBeat, 0.5);
  });

  test('quantize to 1/16 — 0.1 snaps to 0', function() {
    var c = makeComp();
    var t = makeTrack(c, 'piano');
    MC.addNote(t, 'C4', 0.1, 1, 100);
    MC.quantizeNotes(t, '1/16');
    assert.strictEqual(t.notes[0].startBeat, 0);
  });

  test('quantize to 1/16 — 0.2 snaps to 0.25', function() {
    var c = makeComp();
    var t = makeTrack(c, 'piano');
    MC.addNote(t, 'C4', 0.2, 1, 100);
    MC.quantizeNotes(t, '1/16');
    assert.strictEqual(t.notes[0].startBeat, 0.25);
  });

  test('throws on unknown grid', function() {
    var c = makeComp();
    var t = makeTrack(c, 'piano');
    MC.addNote(t, 'C4', 0, 1, 100);
    assert.throws(function() { MC.quantizeNotes(t, '1/32'); });
  });

  test('returns track object', function() {
    var c = makeComp();
    var t = makeTrack(c, 'piano');
    var result = MC.quantizeNotes(t, '1/4');
    assert.strictEqual(result, t);
  });

});

// ---------------------------------------------------------------------------
// getScaleNotes
// ---------------------------------------------------------------------------
suite('getScaleNotes', function() {

  test('C major returns C notes across octaves', function() {
    var notes = MC.getScaleNotes('C', 'major');
    assert(notes.indexOf('C4') !== -1, 'C4 in C major');
    assert(notes.indexOf('E4') !== -1, 'E4 in C major');
    assert(notes.indexOf('G4') !== -1, 'G4 in C major');
  });

  test('C major does not include C#', function() {
    var notes = MC.getScaleNotes('C', 'major');
    assert(notes.indexOf('C#4') === -1, 'C#4 not in C major');
  });

  test('returns array', function() {
    assert(Array.isArray(MC.getScaleNotes('C', 'major')));
  });

  test('C pentatonic returns 5 note-classes', function() {
    var notes = MC.getScaleNotes('C', 'pentatonic');
    // 5 unique pitch-classes across all valid octaves
    var classes = {};
    notes.forEach(function(n) { var m = n.match(/^([A-G][#b]?)/); if (m) classes[m[1]] = 1; });
    assert.strictEqual(Object.keys(classes).length, 5);
  });

  test('all notes in range are known frequencies', function() {
    var notes = MC.getScaleNotes('G', 'minor');
    notes.forEach(function(n) {
      assert(MC.NOTE_FREQUENCIES[n] > 0, 'No frequency for ' + n);
    });
  });

  test('throws on unknown scale', function() {
    assert.throws(function() { MC.getScaleNotes('C', 'bebop'); });
  });

  test('throws on unknown root', function() {
    assert.throws(function() { MC.getScaleNotes('X', 'major'); });
  });

  test('Bb major uses flat root correctly', function() {
    var notes = MC.getScaleNotes('Bb', 'major');
    assert(Array.isArray(notes) && notes.length > 0);
  });

});

// ---------------------------------------------------------------------------
// isInScale
// ---------------------------------------------------------------------------
suite('isInScale', function() {

  test('C4 is in C major', function() {
    assert.strictEqual(MC.isInScale('C4', 'C', 'major'), true);
  });

  test('C#4 is NOT in C major', function() {
    assert.strictEqual(MC.isInScale('C#4', 'C', 'major'), false);
  });

  test('A4 is in C major', function() {
    assert.strictEqual(MC.isInScale('A4', 'C', 'major'), true);
  });

  test('Bb4 is in C minor', function() {
    assert.strictEqual(MC.isInScale('A#4', 'C', 'minor'), true);
  });

  test('drum label returns false', function() {
    assert.strictEqual(MC.isInScale('kick', 'C', 'major'), false);
  });

  test('G4 is in G pentatonic', function() {
    assert.strictEqual(MC.isInScale('G4', 'G', 'pentatonic'), true);
  });

});

// ---------------------------------------------------------------------------
// generateMelody
// ---------------------------------------------------------------------------
suite('generateMelody', function() {

  test('returns array', function() {
    var notes = MC.generateMelody('C', 'major', 2);
    assert(Array.isArray(notes));
  });

  test('notes have pitch, startBeat, duration, velocity', function() {
    var notes = MC.generateMelody('C', 'major', 1);
    notes.forEach(function(n) {
      assert(n.pitch,     'missing pitch');
      assert(typeof n.startBeat  === 'number', 'missing startBeat');
      assert(typeof n.duration   === 'number', 'missing duration');
      assert(typeof n.velocity   === 'number', 'missing velocity');
    });
  });

  test('generated notes stay within 4/4 bar boundary', function() {
    var bars = 2;
    var notes = MC.generateMelody('C', 'major', bars);
    notes.forEach(function(n) {
      assert(n.startBeat + n.duration <= bars * 4 + 0.001);
    });
  });

  test('deterministic with same seed', function() {
    var a = MC.generateMelody('C', 'major', 2, 42);
    var b = MC.generateMelody('C', 'major', 2, 42);
    assert.deepStrictEqual(a, b);
  });

  test('different seeds produce different output', function() {
    var a = MC.generateMelody('C', 'major', 4, 1);
    var b = MC.generateMelody('C', 'major', 4, 99);
    var same = JSON.stringify(a) === JSON.stringify(b);
    assert(!same, 'Different seeds should differ');
  });

  test('all pitches are valid note strings or rests', function() {
    var notes = MC.generateMelody('G', 'minor', 2, 7);
    notes.forEach(function(n) {
      assert(MC.NOTE_FREQUENCIES[n.pitch] > 0, 'Unknown pitch: ' + n.pitch);
    });
  });

});

// ---------------------------------------------------------------------------
// generateBassline
// ---------------------------------------------------------------------------
suite('generateBassline', function() {

  test('returns array', function() {
    assert(Array.isArray(MC.generateBassline('C', 'major', 2)));
  });

  test('notes have expected shape', function() {
    MC.generateBassline('C', 'major', 1).forEach(function(n) {
      assert(n.pitch && typeof n.startBeat === 'number' && typeof n.duration === 'number');
    });
  });

  test('stays within bars boundary', function() {
    var bars = 2;
    MC.generateBassline('C', 'major', bars).forEach(function(n) {
      assert(n.startBeat + n.duration <= bars * 4 + 0.001);
    });
  });

  test('deterministic with seed', function() {
    var a = MC.generateBassline('F', 'minor', 2, 5);
    var b = MC.generateBassline('F', 'minor', 2, 5);
    assert.deepStrictEqual(a, b);
  });

  test('prefers low octave notes (octave 3)', function() {
    var notes = MC.generateBassline('C', 'major', 4, 1);
    var lowCount = notes.filter(function(n) {
      var m = n.pitch.match(/(\d)$/);
      return m && parseInt(m[1]) <= 4;
    }).length;
    assert(lowCount > 0, 'Expected some low-octave notes');
  });

});

// ---------------------------------------------------------------------------
// generateDrumPattern
// ---------------------------------------------------------------------------
suite('generateDrumPattern', function() {

  test('returns array', function() {
    assert(Array.isArray(MC.generateDrumPattern(2, 'basic')));
  });

  test('basic pattern has kick and snare', function() {
    var notes = MC.generateDrumPattern(1, 'basic');
    var kicks  = notes.filter(function(n) { return n.pitch === 'kick'; });
    var snares = notes.filter(function(n) { return n.pitch === 'snare'; });
    assert(kicks.length > 0,  'No kick in basic pattern');
    assert(snares.length > 0, 'No snare in basic pattern');
  });

  test('groove pattern has kick and snare', function() {
    var notes = MC.generateDrumPattern(1, 'groove');
    assert(notes.some(function(n) { return n.pitch === 'kick'; }));
    assert(notes.some(function(n) { return n.pitch === 'snare'; }));
  });

  test('sparse pattern has kick and snare', function() {
    var notes = MC.generateDrumPattern(1, 'sparse');
    assert(notes.some(function(n) { return n.pitch === 'kick'; }));
    assert(notes.some(function(n) { return n.pitch === 'snare'; }));
  });

  test('all drum notes have duration and velocity', function() {
    MC.generateDrumPattern(2, 'basic').forEach(function(n) {
      assert(typeof n.duration  === 'number');
      assert(typeof n.velocity  === 'number');
    });
  });

  test('4-bar pattern has more notes than 1-bar', function() {
    var one  = MC.generateDrumPattern(1, 'basic').length;
    var four = MC.generateDrumPattern(4, 'basic').length;
    assert(four > one, '4 bars should have more notes');
  });

});

// ---------------------------------------------------------------------------
// getDuration
// ---------------------------------------------------------------------------
suite('getDuration', function() {

  test('empty composition returns 0', function() {
    var c = makeComp();
    assert.strictEqual(MC.getDuration(c), 0);
  });

  test('single note duration calculation', function() {
    var c = makeComp('T', 120);
    var t = makeTrack(c, 'piano');
    MC.addNote(t, 'C4', 0, 4, 100);  // 4 beats @ 120 BPM = 2 s
    var dur = MC.getDuration(c);
    assert(Math.abs(dur - 2.0) < 0.001, 'Expected 2s, got ' + dur);
  });

  test('tempo affects duration', function() {
    var c60  = MC.createComposition('A',  60);
    var c120 = MC.createComposition('B', 120);
    var t60  = MC.addTrack(c60,  'piano');
    var t120 = MC.addTrack(c120, 'piano');
    MC.addNote(t60,  'C4', 0, 4, 100);
    MC.addNote(t120, 'C4', 0, 4, 100);
    var dur60  = MC.getDuration(c60);
    var dur120 = MC.getDuration(c120);
    assert(Math.abs(dur60 - 4.0)  < 0.001, '60 BPM 4 beats = 4s');
    assert(Math.abs(dur120 - 2.0) < 0.001, '120 BPM 4 beats = 2s');
  });

  test('muted tracks still contribute to duration', function() {
    var c = makeComp('T', 120);
    var t = makeTrack(c, 'piano');
    t.muted = true;
    MC.addNote(t, 'C4', 0, 8, 100);
    var dur = MC.getDuration(c);
    assert(dur > 0);
  });

});

// ---------------------------------------------------------------------------
// getPlaybackSchedule
// ---------------------------------------------------------------------------
suite('getPlaybackSchedule', function() {

  test('returns array', function() {
    var c = makeComp();
    assert(Array.isArray(MC.getPlaybackSchedule(c)));
  });

  test('events include timeSeconds field', function() {
    var c = makeComp('T', 120);
    var t = makeTrack(c, 'piano');
    MC.addNote(t, 'C4', 0, 1, 100);
    var events = MC.getPlaybackSchedule(c);
    assert(typeof events[0].timeSeconds === 'number');
  });

  test('sorted by timeSeconds', function() {
    var c = makeComp('T', 120);
    var t = makeTrack(c, 'piano');
    MC.addNote(t, 'C4', 4, 1, 100);
    MC.addNote(t, 'E4', 0, 1, 100);
    var events = MC.getPlaybackSchedule(c);
    assert(events[0].timeSeconds <= events[1].timeSeconds);
  });

  test('muted tracks excluded', function() {
    var c = makeComp('T', 120);
    var t = makeTrack(c, 'piano');
    t.muted = true;
    MC.addNote(t, 'C4', 0, 1, 100);
    var events = MC.getPlaybackSchedule(c);
    assert.strictEqual(events.length, 0);
  });

  test('event has frequency for known pitches', function() {
    var c = makeComp('T', 120);
    var t = makeTrack(c, 'piano');
    MC.addNote(t, 'A4', 0, 1, 100);
    var events = MC.getPlaybackSchedule(c);
    assert.strictEqual(events[0].frequency, 440.00);
  });

  test('event frequency is null for drum labels', function() {
    var c = makeComp('T', 120);
    var t = makeTrack(c, 'drums');
    MC.addNote(t, 'kick', 0, 0.25, 100);
    var events = MC.getPlaybackSchedule(c);
    assert.strictEqual(events[0].frequency, null);
  });

  test('event includes instrument field', function() {
    var c = makeComp('T', 120);
    var t = makeTrack(c, 'strings');
    MC.addNote(t, 'C4', 0, 1, 100);
    var events = MC.getPlaybackSchedule(c);
    assert.strictEqual(events[0].instrument, 'strings');
  });

});

// ---------------------------------------------------------------------------
// mixTracks
// ---------------------------------------------------------------------------
suite('mixTracks', function() {

  test('returns array', function() {
    assert(Array.isArray(MC.mixTracks(makeComp())));
  });

  test('muted tracks excluded', function() {
    var c = makeComp('T', 120);
    var t = makeTrack(c, 'piano');
    t.muted = true;
    MC.addNote(t, 'C4', 0, 1, 100);
    assert.strictEqual(MC.mixTracks(c).length, 0);
  });

  test('track volume scales velocity', function() {
    var c = makeComp('T', 120);
    var t = makeTrack(c, 'piano');
    t.volume = 0.5;
    MC.addNote(t, 'C4', 0, 1, 100);
    var mixed = MC.mixTracks(c);
    assert.strictEqual(mixed[0].velocity, 50);
  });

  test('mixed notes sorted by startBeat', function() {
    var c = makeComp('T', 120);
    var t = makeTrack(c, 'piano');
    MC.addNote(t, 'E4', 2, 1, 100);
    MC.addNote(t, 'C4', 0, 1, 100);
    var mixed = MC.mixTracks(c);
    assert(mixed[0].startBeat <= mixed[1].startBeat);
  });

  test('mixed items include startSeconds', function() {
    var c = makeComp('T', 120);
    var t = makeTrack(c, 'piano');
    MC.addNote(t, 'C4', 2, 1, 100);  // beat 2 @ 120 BPM = 1 s
    var mixed = MC.mixTracks(c);
    assert(Math.abs(mixed[0].startSeconds - 1.0) < 0.001);
  });

  test('multiple tracks both appear in mix', function() {
    var c = makeComp('T', 120);
    var t1 = makeTrack(c, 'piano');
    var t2 = makeTrack(c, 'strings');
    MC.addNote(t1, 'C4', 0, 1, 100);
    MC.addNote(t2, 'G4', 1, 1, 100);
    var mixed = MC.mixTracks(c);
    assert.strictEqual(mixed.length, 2);
  });

});

// ---------------------------------------------------------------------------
// getNotesInRange
// ---------------------------------------------------------------------------
suite('getNotesInRange', function() {

  test('returns array', function() {
    assert(Array.isArray(MC.getNotesInRange(makeComp(), 0, 4)));
  });

  test('returns notes starting within range', function() {
    var c = makeComp();
    var t = makeTrack(c, 'piano');
    MC.addNote(t, 'C4', 1, 1, 100);
    MC.addNote(t, 'E4', 5, 1, 100);
    var r = MC.getNotesInRange(c, 0, 4);
    assert.strictEqual(r.length, 1);
    assert.strictEqual(r[0].note.pitch, 'C4');
  });

  test('start is inclusive', function() {
    var c = makeComp();
    var t = makeTrack(c, 'piano');
    MC.addNote(t, 'C4', 0, 1, 100);
    var r = MC.getNotesInRange(c, 0, 4);
    assert.strictEqual(r.length, 1);
  });

  test('end is exclusive', function() {
    var c = makeComp();
    var t = makeTrack(c, 'piano');
    MC.addNote(t, 'C4', 4, 1, 100);
    var r = MC.getNotesInRange(c, 0, 4);
    assert.strictEqual(r.length, 0);
  });

  test('result includes trackId', function() {
    var c = makeComp();
    var t = makeTrack(c, 'piano');
    MC.addNote(t, 'C4', 0, 1, 100);
    var r = MC.getNotesInRange(c, 0, 4);
    assert.strictEqual(r[0].trackId, t.id);
  });

  test('empty composition returns empty array', function() {
    var c = makeComp();
    assert.strictEqual(MC.getNotesInRange(c, 0, 8).length, 0);
  });

});

// ---------------------------------------------------------------------------
// exportComposition / importComposition
// ---------------------------------------------------------------------------
suite('exportComposition / importComposition', function() {

  test('export returns plain object', function() {
    var c = makeComp('Export Test', 120);
    var exp = MC.exportComposition(c);
    assert(typeof exp === 'object');
  });

  test('exported object has version 1', function() {
    var exp = MC.exportComposition(makeComp());
    assert.strictEqual(exp.version, 1);
  });

  test('exported name matches', function() {
    var c = makeComp('My Song');
    var exp = MC.exportComposition(c);
    assert.strictEqual(exp.name, 'My Song');
  });

  test('exported tempo matches', function() {
    var c = makeComp('T', 150);
    var exp = MC.exportComposition(c);
    assert.strictEqual(exp.tempo, 150);
  });

  test('exported tracks are serialized', function() {
    var c = makeComp();
    makeTrack(c, 'piano');
    var exp = MC.exportComposition(c);
    assert(Array.isArray(exp.tracks) && exp.tracks.length === 1);
  });

  test('round-trip preserves notes', function() {
    var c = makeComp('RT', 120);
    var t = makeTrack(c, 'piano');
    MC.addNote(t, 'C4', 0, 1, 100);
    var exp = MC.exportComposition(c);
    var imp = MC.importComposition(exp);
    assert.strictEqual(imp.tracks[0].notes[0].pitch, 'C4');
  });

  test('importComposition restores tempo', function() {
    var c   = makeComp('T', 130);
    var exp = MC.exportComposition(c);
    var imp = MC.importComposition(exp);
    assert.strictEqual(imp.tempo, 130);
  });

  test('importComposition throws on missing name', function() {
    var data = { version: 1, tempo: 120, tracks: [] };
    assert.throws(function() { MC.importComposition(data); });
  });

  test('importComposition throws on tempo out of range', function() {
    var data = { version: 1, name: 'T', tempo: 300, tracks: [] };
    assert.throws(function() { MC.importComposition(data); });
  });

  test('importComposition throws on wrong version', function() {
    var data = { version: 2, name: 'T', tempo: 120, tracks: [] };
    assert.throws(function() { MC.importComposition(data); });
  });

  test('importComposition throws on non-object', function() {
    assert.throws(function() { MC.importComposition('bad'); });
  });

  test('export produces JSON-safe output', function() {
    var c   = makeComp('J', 120);
    var exp = MC.exportComposition(c);
    var str = JSON.stringify(exp);
    var parsed = JSON.parse(str);
    assert.strictEqual(parsed.name, 'J');
  });

});

// ---------------------------------------------------------------------------
// Final report
// ---------------------------------------------------------------------------
if (!report()) process.exit(1);
