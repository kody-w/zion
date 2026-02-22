// music_composer.js
/**
 * ZION Music Composer — procedural sequencer / piano-roll
 * Vanilla JS, UMD pattern, var only (ES5-compatible)
 * No project dependencies — pure data & logic only.
 */
(function(exports) {
  'use strict';

  // ---------------------------------------------------------------------------
  // Note frequency table — C3 through C6, naturals + sharps
  // ---------------------------------------------------------------------------
  var NOTE_FREQUENCIES = {
    // Octave 3
    'C3':  130.81, 'C#3': 138.59, 'D3':  146.83, 'D#3': 155.56,
    'E3':  164.81, 'F3':  174.61, 'F#3': 185.00, 'G3':  196.00,
    'G#3': 207.65, 'A3':  220.00, 'A#3': 233.08, 'B3':  246.94,
    // Octave 4
    'C4':  261.63, 'C#4': 277.18, 'D4':  293.66, 'D#4': 311.13,
    'E4':  329.63, 'F4':  349.23, 'F#4': 369.99, 'G4':  392.00,
    'G#4': 415.30, 'A4':  440.00, 'A#4': 466.16, 'B4':  493.88,
    // Octave 5
    'C5':  523.25, 'C#5': 554.37, 'D5':  587.33, 'D#5': 622.25,
    'E5':  659.25, 'F5':  698.46, 'F#5': 739.99, 'G5':  783.99,
    'G#5': 830.61, 'A5':  880.00, 'A#5': 932.33, 'B5':  987.77,
    // Octave 6 (root only)
    'C6': 1046.50
  };

  // Flat aliases → map to their sharp equivalents
  var FLAT_ALIASES = {
    'Db3':'C#3','Eb3':'D#3','Fb3':'E3','Gb3':'F#3','Ab3':'G#3','Bb3':'A#3','Cb3':'B3',
    'Db4':'C#4','Eb4':'D#4','Fb4':'E4','Gb4':'F#4','Ab4':'G#4','Bb4':'A#4','Cb4':'B4',
    'Db5':'C#5','Eb5':'D#5','Fb5':'E5','Gb5':'F#5','Ab5':'G#5','Bb5':'A#5','Cb5':'B5'
  };

  // Merge flat aliases into NOTE_FREQUENCIES so callers can use either notation
  for (var flatKey in FLAT_ALIASES) {
    NOTE_FREQUENCIES[flatKey] = NOTE_FREQUENCIES[FLAT_ALIASES[flatKey]];
  }

  // ---------------------------------------------------------------------------
  // Instruments
  // ---------------------------------------------------------------------------
  var INSTRUMENTS = {
    piano:   { name: 'Piano',   type: 'keyboard', waveform: 'triangle', attack: 0.01, decay: 0.3,  sustain: 0.7, release: 0.5 },
    strings: { name: 'Strings', type: 'bowed',    waveform: 'sawtooth', attack: 0.15, decay: 0.1,  sustain: 0.8, release: 0.8 },
    flute:   { name: 'Flute',   type: 'wind',     waveform: 'sine',     attack: 0.05, decay: 0.1,  sustain: 0.9, release: 0.3 },
    drums:   { name: 'Drums',   type: 'percussive',waveform: 'noise',   attack: 0.001,decay: 0.2,  sustain: 0.0, release: 0.1 },
    synth:   { name: 'Synth',   type: 'electronic',waveform: 'square',  attack: 0.02, decay: 0.15, sustain: 0.6, release: 0.4 },
    bell:    { name: 'Bell',    type: 'metallic',  waveform: 'sine',    attack: 0.001,decay: 1.2,  sustain: 0.2, release: 2.0 }
  };

  // ---------------------------------------------------------------------------
  // Scales — intervals in semitones from root
  // ---------------------------------------------------------------------------
  var SCALES = {
    major:       [0, 2, 4, 5, 7, 9, 11],
    minor:       [0, 2, 3, 5, 7, 8, 10],
    pentatonic:  [0, 2, 4, 7, 9],
    blues:       [0, 3, 5, 6, 7, 10],
    dorian:      [0, 2, 3, 5, 7, 9, 10],
    mixolydian:  [0, 2, 4, 5, 7, 9, 10]
  };

  // Chromatic note names (sharps) — used for transposition arithmetic
  var CHROMATIC = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /**
   * Parse a note string like 'C#4' → { name:'C#', octave:4, semitone:0..11 }
   * Returns null for drum labels (e.g. 'kick', 'snare').
   */
  function parseNote(noteStr) {
    var m = noteStr.match(/^([A-G][#b]?)(\d)$/);
    if (!m) return null;
    var name = m[1];
    var octave = parseInt(m[2], 10);
    // Normalise flat → sharp
    var sharpName = name;
    var flatToSharp = { 'Db':'C#','Eb':'D#','Fb':'E','Gb':'F#','Ab':'G#','Bb':'A#','Cb':'B' };
    if (flatToSharp[name]) sharpName = flatToSharp[name];
    var semitone = CHROMATIC.indexOf(sharpName);
    if (semitone === -1) return null;
    return { name: sharpName, octave: octave, semitone: semitone };
  }

  /**
   * Reconstruct a note string from semitone + octave.
   */
  function buildNote(semitone, octave) {
    return CHROMATIC[semitone] + octave;
  }

  /**
   * Transpose a single note string by `semitones` steps.
   * Returns null if the resulting note is out of the C3-C6 range.
   */
  function transposeNote(noteStr, semitones) {
    var parsed = parseNote(noteStr);
    if (!parsed) return noteStr; // pass-through for drum labels
    var total = parsed.octave * 12 + parsed.semitone + semitones;
    var newOctave = Math.floor(total / 12);
    var newSemitone = ((total % 12) + 12) % 12;
    // Clamp to octave range 3–6
    if (newOctave < 3) { newOctave = 3; }
    if (newOctave > 6) { newOctave = 6; }
    return buildNote(newSemitone, newOctave);
  }

  /**
   * Simple seeded pseudo-random for deterministic generation.
   * Returns a float [0, 1).
   */
  function seededRand(seed) {
    var x = Math.sin(seed + 1) * 43758.5453123;
    return x - Math.floor(x);
  }

  // ---------------------------------------------------------------------------
  // Unique-ID counter
  // ---------------------------------------------------------------------------
  var _idCounter = 0;
  function nextId(prefix) {
    _idCounter += 1;
    return (prefix || 'id') + '_' + _idCounter;
  }

  // ---------------------------------------------------------------------------
  // Composition factory
  // ---------------------------------------------------------------------------

  /**
   * Create a new composition.
   * @param {string} name
   * @param {number} tempo — BPM, clamped to 60-240
   * @param {Array}  timeSignature — [beats, noteValue] e.g. [4, 4]
   * @returns {Object} composition
   */
  function createComposition(name, tempo, timeSignature) {
    var clampedTempo = Math.max(60, Math.min(240, tempo || 120));
    var sig = Array.isArray(timeSignature) && timeSignature.length === 2
      ? [timeSignature[0], timeSignature[1]]
      : [4, 4];

    return {
      id:            nextId('comp'),
      name:          name || 'Untitled',
      tempo:         clampedTempo,
      timeSignature: sig,
      tracks:        [],
      createdAt:     Date.now(),
      updatedAt:     Date.now()
    };
  }

  // ---------------------------------------------------------------------------
  // Track management
  // ---------------------------------------------------------------------------

  /**
   * Add a track to a composition.
   * @param {Object} composition
   * @param {string} instrumentKey — key from INSTRUMENTS
   * @param {string} trackName
   * @returns {Object} the new track
   */
  function addTrack(composition, instrumentKey, trackName) {
    if (!composition || !composition.tracks) {
      throw new Error('Invalid composition');
    }
    var instrument = INSTRUMENTS[instrumentKey] || INSTRUMENTS.piano;
    var track = {
      id:         nextId('track'),
      name:       trackName || instrument.name,
      instrument: instrumentKey || 'piano',
      volume:     1.0,
      muted:      false,
      notes:      []
    };
    composition.tracks.push(track);
    composition.updatedAt = Date.now();
    return track;
  }

  /**
   * Remove a track from a composition by track id.
   * @param {Object} composition
   * @param {string} trackId
   * @returns {boolean} true if removed
   */
  function removeTrack(composition, trackId) {
    if (!composition || !composition.tracks) return false;
    var before = composition.tracks.length;
    composition.tracks = composition.tracks.filter(function(t) {
      return t.id !== trackId;
    });
    var removed = composition.tracks.length < before;
    if (removed) composition.updatedAt = Date.now();
    return removed;
  }

  // ---------------------------------------------------------------------------
  // Note management
  // ---------------------------------------------------------------------------

  /**
   * Add a note to a track.
   * @param {Object} track
   * @param {string} pitch     — e.g. 'C4', 'kick'
   * @param {number} startBeat — beat position (0-indexed, fractions allowed)
   * @param {number} duration  — in beats
   * @param {number} velocity  — 0-127
   * @returns {Object} the new note
   */
  function addNote(track, pitch, startBeat, duration, velocity) {
    if (!track || !track.notes) {
      throw new Error('Invalid track');
    }
    var note = {
      id:        nextId('note'),
      pitch:     pitch || 'C4',
      startBeat: typeof startBeat === 'number' ? startBeat : 0,
      duration:  typeof duration  === 'number' ? Math.max(0.0625, duration) : 1,
      velocity:  Math.max(0, Math.min(127, typeof velocity === 'number' ? velocity : 100))
    };
    track.notes.push(note);
    return note;
  }

  /**
   * Remove a note from a track by note id.
   * @param {Object} track
   * @param {string} noteId
   * @returns {boolean}
   */
  function removeNote(track, noteId) {
    if (!track || !track.notes) return false;
    var before = track.notes.length;
    track.notes = track.notes.filter(function(n) { return n.id !== noteId; });
    return track.notes.length < before;
  }

  // ---------------------------------------------------------------------------
  // Tempo
  // ---------------------------------------------------------------------------

  /**
   * Set composition tempo, clamped to 60-240 BPM.
   * @param {Object} composition
   * @param {number} bpm
   * @returns {number} new tempo
   */
  function setTempo(composition, bpm) {
    if (!composition) throw new Error('Invalid composition');
    composition.tempo = Math.max(60, Math.min(240, bpm));
    composition.updatedAt = Date.now();
    return composition.tempo;
  }

  // ---------------------------------------------------------------------------
  // Transposition
  // ---------------------------------------------------------------------------

  /**
   * Transpose all non-drum notes in a track by a number of semitones.
   * @param {Object} track
   * @param {number} semitones — positive = up, negative = down
   * @returns {Object} track (mutated in place)
   */
  function transposeTrack(track, semitones) {
    if (!track || !track.notes) throw new Error('Invalid track');
    track.notes = track.notes.map(function(note) {
      var newNote = {};
      for (var k in note) newNote[k] = note[k];
      newNote.pitch = transposeNote(note.pitch, semitones);
      return newNote;
    });
    return track;
  }

  // ---------------------------------------------------------------------------
  // Quantization
  // ---------------------------------------------------------------------------

  /**
   * Snap note startBeats to a grid.
   * @param {Object} track
   * @param {string} grid — '1/4', '1/8', '1/16'
   * @returns {Object} track (mutated)
   */
  function quantizeNotes(track, grid) {
    if (!track || !track.notes) throw new Error('Invalid track');
    var gridMap = { '1/4': 1, '1/8': 0.5, '1/16': 0.25 };
    var step = gridMap[grid];
    if (!step) throw new Error('Invalid grid: ' + grid + '. Use 1/4, 1/8, or 1/16');
    track.notes = track.notes.map(function(note) {
      var newNote = {};
      for (var k in note) newNote[k] = note[k];
      newNote.startBeat = Math.round(note.startBeat / step) * step;
      return newNote;
    });
    return track;
  }

  // ---------------------------------------------------------------------------
  // Scale utilities
  // ---------------------------------------------------------------------------

  /**
   * Return all note names in a scale spanning C3-C6 for a given root + scale.
   * @param {string} root  — e.g. 'C', 'F#', 'Bb'
   * @param {string} scale — key from SCALES
   * @returns {string[]} note names
   */
  function getScaleNotes(root, scale) {
    var intervals = SCALES[scale];
    if (!intervals) throw new Error('Unknown scale: ' + scale);

    // Normalise flat root to sharp
    var flatToSharp = { 'Db':'C#','Eb':'D#','Fb':'E','Gb':'F#','Ab':'G#','Bb':'A#','Cb':'B' };
    var sharpRoot = flatToSharp[root] || root;
    var rootIndex = CHROMATIC.indexOf(sharpRoot);
    if (rootIndex === -1) throw new Error('Unknown root note: ' + root);

    var result = [];
    for (var octave = 3; octave <= 6; octave++) {
      for (var i = 0; i < intervals.length; i++) {
        var semitone = (rootIndex + intervals[i]) % 12;
        var extraOctave = Math.floor((rootIndex + intervals[i]) / 12);
        var noteOctave = octave + extraOctave;
        if (noteOctave > 6) continue;
        var noteStr = buildNote(semitone, noteOctave);
        if (NOTE_FREQUENCIES[noteStr]) {
          result.push(noteStr);
        }
      }
    }
    // Remove duplicates while preserving order
    var seen = {};
    var unique = [];
    for (var j = 0; j < result.length; j++) {
      if (!seen[result[j]]) {
        seen[result[j]] = true;
        unique.push(result[j]);
      }
    }
    return unique;
  }

  /**
   * Test whether a pitch belongs to a given scale/root combination.
   * Drum labels (no octave digit) always return false.
   * @param {string} pitch
   * @param {string} root
   * @param {string} scale
   * @returns {boolean}
   */
  function isInScale(pitch, root, scale) {
    try {
      var scaleNotes = getScaleNotes(root, scale);
      // Compare only the note name (without octave)
      var parsed = parseNote(pitch);
      if (!parsed) return false;
      var pitchClass = parsed.name; // e.g. 'C', 'C#'
      for (var i = 0; i < scaleNotes.length; i++) {
        var p = parseNote(scaleNotes[i]);
        if (p && p.name === pitchClass) return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Procedural generation
  // ---------------------------------------------------------------------------

  /**
   * Generate a melodic phrase.
   * @param {string} root
   * @param {string} scale
   * @param {number} bars      — number of bars
   * @param {number} [seed=1]
   * @returns {Array} array of note objects {pitch, startBeat, duration, velocity}
   */
  function generateMelody(root, scale, bars, seed) {
    var s = typeof seed === 'number' ? seed : 1;
    var scaleNotes = getScaleNotes(root, scale);
    // Prefer mid-register notes (octave 4-5)
    var midNotes = scaleNotes.filter(function(n) {
      var p = parseNote(n);
      return p && p.octave >= 4 && p.octave <= 5;
    });
    var pool = midNotes.length > 0 ? midNotes : scaleNotes;

    var notes = [];
    var beat = 0;
    var totalBeats = bars * 4; // assume 4/4
    var ri = 0;

    while (beat < totalBeats) {
      var durChoices = [0.5, 1, 1, 1, 2];
      var durIdx = Math.floor(seededRand(s + ri) * durChoices.length);
      var dur = durChoices[durIdx];
      if (beat + dur > totalBeats) dur = totalBeats - beat;
      if (dur <= 0) break;

      var pitchIdx = Math.floor(seededRand(s + ri + 100) * pool.length);
      var velocity = 70 + Math.floor(seededRand(s + ri + 200) * 40);
      var rest = seededRand(s + ri + 300) < 0.2; // 20% rest chance

      if (!rest) {
        notes.push({
          pitch:     pool[pitchIdx],
          startBeat: beat,
          duration:  dur,
          velocity:  velocity
        });
      }

      beat += dur;
      ri += 1;
    }
    return notes;
  }

  /**
   * Generate a bassline.
   * @param {string} root
   * @param {string} scale
   * @param {number} bars
   * @param {number} [seed=1]
   * @returns {Array}
   */
  function generateBassline(root, scale, bars, seed) {
    var s = typeof seed === 'number' ? seed : 1;
    var scaleNotes = getScaleNotes(root, scale);
    // Prefer low register (octave 3)
    var lowNotes = scaleNotes.filter(function(n) {
      var p = parseNote(n);
      return p && p.octave === 3;
    });
    var pool = lowNotes.length > 0 ? lowNotes : scaleNotes;

    var notes = [];
    var totalBeats = bars * 4;
    var beat = 0;
    var ri = 0;

    while (beat < totalBeats) {
      var dur = seededRand(s + ri + 50) < 0.6 ? 1 : 2;
      if (beat + dur > totalBeats) dur = totalBeats - beat;
      if (dur <= 0) break;

      var pitchIdx = Math.floor(seededRand(s + ri + 150) * pool.length);
      var velocity = 80 + Math.floor(seededRand(s + ri + 250) * 30);

      notes.push({
        pitch:     pool[pitchIdx],
        startBeat: beat,
        duration:  dur,
        velocity:  velocity
      });

      beat += dur;
      ri += 1;
    }
    return notes;
  }

  /**
   * Drum hit labels available.
   */
  var DRUM_HITS = ['kick', 'snare', 'hihat', 'open_hihat', 'clap', 'tom'];

  /**
   * Generate a drum pattern.
   * @param {number} bars
   * @param {string} style — 'basic', 'groove', 'sparse'
   * @param {number} [seed=1]
   * @returns {Array} array of {pitch:drumLabel, startBeat, duration, velocity}
   */
  function generateDrumPattern(bars, style, seed) {
    var s = typeof seed === 'number' ? seed : 1;
    var totalBeats = bars * 4;
    var notes = [];

    // Basic kick-snare pattern
    for (var bar = 0; bar < bars; bar++) {
      var offset = bar * 4;

      if (style === 'sparse') {
        // Kick on 1, snare on 3
        notes.push({ pitch: 'kick',  startBeat: offset + 0, duration: 0.25, velocity: 100 });
        notes.push({ pitch: 'snare', startBeat: offset + 2, duration: 0.25, velocity: 90  });
        // Occasional hihat
        if (seededRand(s + bar) > 0.5) {
          notes.push({ pitch: 'hihat', startBeat: offset + 1, duration: 0.25, velocity: 70 });
        }
      } else if (style === 'groove') {
        // Kick on 1 & 2.5, snare on 2 & 4
        notes.push({ pitch: 'kick',  startBeat: offset + 0,   duration: 0.25, velocity: 110 });
        notes.push({ pitch: 'kick',  startBeat: offset + 2.5, duration: 0.25, velocity: 90  });
        notes.push({ pitch: 'snare', startBeat: offset + 1,   duration: 0.25, velocity: 100 });
        notes.push({ pitch: 'snare', startBeat: offset + 3,   duration: 0.25, velocity: 95  });
        // 8th-note hihats
        for (var h = 0; h < 8; h++) {
          var vel = (h % 2 === 0) ? 75 : 55;
          notes.push({ pitch: 'hihat', startBeat: offset + h * 0.5, duration: 0.25, velocity: vel });
        }
      } else {
        // basic: kick 1 & 3, snare 2 & 4, hihats on every beat
        notes.push({ pitch: 'kick',  startBeat: offset + 0, duration: 0.25, velocity: 100 });
        notes.push({ pitch: 'kick',  startBeat: offset + 2, duration: 0.25, velocity: 100 });
        notes.push({ pitch: 'snare', startBeat: offset + 1, duration: 0.25, velocity: 90  });
        notes.push({ pitch: 'snare', startBeat: offset + 3, duration: 0.25, velocity: 90  });
        for (var hh = 0; hh < 8; hh++) {
          notes.push({ pitch: 'hihat', startBeat: offset + hh * 0.5, duration: 0.25, velocity: 65 });
        }
      }
    }
    return notes;
  }

  // ---------------------------------------------------------------------------
  // Duration & playback
  // ---------------------------------------------------------------------------

  /**
   * Return the duration of a composition in seconds.
   * @param {Object} composition
   * @returns {number} seconds
   */
  function getDuration(composition) {
    if (!composition || !composition.tracks) return 0;
    var bps = composition.tempo / 60;
    var maxBeat = 0;
    composition.tracks.forEach(function(track) {
      track.notes.forEach(function(note) {
        var end = note.startBeat + note.duration;
        if (end > maxBeat) maxBeat = end;
      });
    });
    return maxBeat / bps;
  }

  /**
   * Build a flat playback schedule sorted by time.
   * Each event: { timeSeconds, trackId, instrument, pitch, duration, velocity, frequency }
   * @param {Object} composition
   * @returns {Array}
   */
  function getPlaybackSchedule(composition) {
    if (!composition || !composition.tracks) return [];
    var bps = composition.tempo / 60;
    var events = [];

    composition.tracks.forEach(function(track) {
      if (track.muted) return;
      track.notes.forEach(function(note) {
        var freq = NOTE_FREQUENCIES[note.pitch] || null;
        events.push({
          timeSeconds:  note.startBeat / bps,
          durationSecs: note.duration  / bps,
          trackId:      track.id,
          instrument:   track.instrument,
          pitch:        note.pitch,
          velocity:     note.velocity,
          frequency:    freq
        });
      });
    });

    events.sort(function(a, b) { return a.timeSeconds - b.timeSeconds; });
    return events;
  }

  /**
   * Mix all tracks into a flat list of notes with absolute timing metadata.
   * Muted tracks are excluded.
   * @param {Object} composition
   * @returns {Array} mixed note objects
   */
  function mixTracks(composition) {
    if (!composition || !composition.tracks) return [];
    var mixed = [];
    var bps = composition.tempo / 60;

    composition.tracks.forEach(function(track) {
      if (track.muted) return;
      track.notes.forEach(function(note) {
        mixed.push({
          trackId:      track.id,
          trackName:    track.name,
          instrument:   track.instrument,
          volume:       track.volume,
          pitch:        note.pitch,
          startBeat:    note.startBeat,
          duration:     note.duration,
          velocity:     Math.round(note.velocity * track.volume),
          startSeconds: note.startBeat  / bps,
          endSeconds:   (note.startBeat + note.duration) / bps,
          frequency:    NOTE_FREQUENCIES[note.pitch] || null
        });
      });
    });

    mixed.sort(function(a, b) { return a.startBeat - b.startBeat; });
    return mixed;
  }

  /**
   * Return all notes whose startBeat falls within [start, end).
   * @param {Object} composition
   * @param {number} start — beat (inclusive)
   * @param {number} end   — beat (exclusive)
   * @returns {Array} { trackId, note }
   */
  function getNotesInRange(composition, start, end) {
    if (!composition || !composition.tracks) return [];
    var result = [];
    composition.tracks.forEach(function(track) {
      track.notes.forEach(function(note) {
        if (note.startBeat >= start && note.startBeat < end) {
          result.push({ trackId: track.id, note: note });
        }
      });
    });
    return result;
  }

  // ---------------------------------------------------------------------------
  // Export / Import
  // ---------------------------------------------------------------------------

  /**
   * Serialize a composition to a plain JSON-compatible object.
   * @param {Object} composition
   * @returns {Object}
   */
  function exportComposition(composition) {
    if (!composition) throw new Error('No composition to export');
    return JSON.parse(JSON.stringify({
      version:       1,
      id:            composition.id,
      name:          composition.name,
      tempo:         composition.tempo,
      timeSignature: composition.timeSignature,
      createdAt:     composition.createdAt,
      updatedAt:     composition.updatedAt,
      tracks:        composition.tracks
    }));
  }

  /**
   * Reconstruct a composition from a previously exported object.
   * Validates required fields; throws on malformed input.
   * @param {Object} data
   * @returns {Object} composition
   */
  function importComposition(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Import data must be an object');
    }
    if (data.version !== 1) {
      throw new Error('Unsupported composition version: ' + data.version);
    }
    if (typeof data.name !== 'string' || !data.name) {
      throw new Error('Composition must have a name');
    }
    if (typeof data.tempo !== 'number' || data.tempo < 60 || data.tempo > 240) {
      throw new Error('Tempo out of range (60-240): ' + data.tempo);
    }
    if (!Array.isArray(data.tracks)) {
      throw new Error('tracks must be an array');
    }

    var comp = {
      id:            data.id || nextId('comp'),
      name:          data.name,
      tempo:         data.tempo,
      timeSignature: Array.isArray(data.timeSignature) ? data.timeSignature : [4, 4],
      createdAt:     data.createdAt || Date.now(),
      updatedAt:     data.updatedAt || Date.now(),
      tracks:        []
    };

    data.tracks.forEach(function(t) {
      var track = {
        id:         t.id || nextId('track'),
        name:       t.name || 'Track',
        instrument: t.instrument || 'piano',
        volume:     typeof t.volume === 'number' ? t.volume : 1.0,
        muted:      !!t.muted,
        notes:      []
      };
      if (Array.isArray(t.notes)) {
        t.notes.forEach(function(n) {
          track.notes.push({
            id:        n.id || nextId('note'),
            pitch:     n.pitch || 'C4',
            startBeat: typeof n.startBeat === 'number' ? n.startBeat : 0,
            duration:  typeof n.duration  === 'number' ? n.duration  : 1,
            velocity:  typeof n.velocity  === 'number' ? n.velocity  : 100
          });
        });
      }
      comp.tracks.push(track);
    });

    return comp;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  exports.NOTE_FREQUENCIES    = NOTE_FREQUENCIES;
  exports.INSTRUMENTS         = INSTRUMENTS;
  exports.SCALES              = SCALES;
  exports.CHROMATIC           = CHROMATIC;
  exports.DRUM_HITS           = DRUM_HITS;

  exports.createComposition   = createComposition;
  exports.addTrack            = addTrack;
  exports.removeTrack         = removeTrack;
  exports.addNote             = addNote;
  exports.removeNote          = removeNote;
  exports.setTempo            = setTempo;
  exports.transposeTrack      = transposeTrack;
  exports.quantizeNotes       = quantizeNotes;
  exports.getScaleNotes       = getScaleNotes;
  exports.isInScale           = isInScale;
  exports.generateMelody      = generateMelody;
  exports.generateBassline    = generateBassline;
  exports.generateDrumPattern = generateDrumPattern;
  exports.getDuration         = getDuration;
  exports.getPlaybackSchedule = getPlaybackSchedule;
  exports.mixTracks           = mixTracks;
  exports.getNotesInRange     = getNotesInRange;
  exports.exportComposition   = exportComposition;
  exports.importComposition   = importComposition;

})(typeof module !== 'undefined' ? module.exports : (window.MusicComposer = {}));
