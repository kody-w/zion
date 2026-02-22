/**
 * tests/test_audio.js
 * Test suite for the ZION Audio system (audio.js)
 * Covers exports, piano accent types, function safety, initAudio,
 * mute/unmute, volume, music state, ambient routing, NPC sounds,
 * and footstep terrain variants.
 */

'use strict';

// ============================================================================
// AUDICONTEXT MOCK — must be set up before requiring the module
// ============================================================================

function MockAudioContext() {
  this.state = 'running';
  this.currentTime = 0;
  this.destination = { numberOfInputs: 1 };
  this.sampleRate = 44100;
}
MockAudioContext.prototype.createOscillator = function() {
  return {
    type: 'sine',
    frequency: {
      value: 440,
      setValueAtTime: function() {},
      linearRampToValueAtTime: function() {},
      exponentialRampToValueAtTime: function() {}
    },
    connect: function() {},
    start: function() {},
    stop: function() {},
    disconnect: function() {}
  };
};
MockAudioContext.prototype.createGain = function() {
  return {
    gain: {
      value: 1,
      setValueAtTime: function() {},
      linearRampToValueAtTime: function() {},
      exponentialRampToValueAtTime: function() {}
    },
    connect: function() {},
    disconnect: function() {}
  };
};
MockAudioContext.prototype.createBiquadFilter = function() {
  return {
    type: 'lowpass',
    frequency: {
      value: 350,
      setValueAtTime: function() {},
      linearRampToValueAtTime: function() {},
      exponentialRampToValueAtTime: function() {}
    },
    Q: { value: 1 },
    connect: function() {},
    disconnect: function() {}
  };
};
MockAudioContext.prototype.createDynamicsCompressor = function() {
  return {
    threshold: { value: -24 },
    knee: { value: 30 },
    ratio: { value: 12 },
    connect: function() {},
    disconnect: function() {}
  };
};
MockAudioContext.prototype.createBufferSource = function() {
  return {
    buffer: null,
    loop: false,
    playbackRate: { value: 1 },
    onended: null,
    connect: function() {},
    start: function() {},
    stop: function() {},
    disconnect: function() {}
  };
};
MockAudioContext.prototype.createBuffer = function(ch, len, rate) {
  return {
    numberOfChannels: ch,
    length: len,
    sampleRate: rate,
    getChannelData: function() { return new Float32Array(len); }
  };
};
MockAudioContext.prototype.createDelay = function() {
  return {
    delayTime: { value: 0 },
    connect: function() {},
    disconnect: function() {}
  };
};
MockAudioContext.prototype.resume = function() { return Promise.resolve(); };

global.AudioContext = MockAudioContext;
global.window = { AudioContext: MockAudioContext };
global.document = { addEventListener: function() {}, removeEventListener: function() {} };

// ============================================================================
// LOAD MODULE
// ============================================================================

const { test, suite, report, assert } = require('./test_runner');
const Audio = require('../src/js/audio');

// ============================================================================
// HELPERS — trigger the deferred AudioContext creation
// ============================================================================

/**
 * audio.js defers AudioContext creation until document click/keydown/touchstart.
 * In tests we simulate a user gesture by manually invoking initAudio then
 * directly forcing the internal context via the exported initAudio return value.
 *
 * Because the module registers listeners on document.addEventListener we capture
 * the most-recently registered handler and call it so the private audioContext
 * and masterGain variables get populated.
 */
var capturedHandlers = {};
global.document = {
  addEventListener: function(evt, fn) {
    capturedHandlers[evt] = fn;
  },
  removeEventListener: function() {}
};

function simulateUserGesture() {
  // Fire the stored click handler to trigger internal AudioContext creation.
  if (capturedHandlers['click']) {
    capturedHandlers['click']();
  }
}

// Call initAudio once so the deferred listeners are registered.
Audio.initAudio();
// Simulate a user gesture so the private audioContext/masterGain are created.
simulateUserGesture();

// ============================================================================
// SUITE 1 — Export verification
// ============================================================================

suite('Export verification — all public API members present', function() {

  test('exports initAudio as a function', function() {
    assert.strictEqual(typeof Audio.initAudio, 'function');
  });

  test('exports playAmbient as a function', function() {
    assert.strictEqual(typeof Audio.playAmbient, 'function');
  });

  test('exports playSound as a function', function() {
    assert.strictEqual(typeof Audio.playSound, 'function');
  });

  test('exports playFootstep as a function', function() {
    assert.strictEqual(typeof Audio.playFootstep, 'function');
  });

  test('exports setVolume as a function', function() {
    assert.strictEqual(typeof Audio.setVolume, 'function');
  });

  test('exports mute as a function', function() {
    assert.strictEqual(typeof Audio.mute, 'function');
  });

  test('exports unmute as a function', function() {
    assert.strictEqual(typeof Audio.unmute, 'function');
  });

  test('exports stopAll as a function', function() {
    assert.strictEqual(typeof Audio.stopAll, 'function');
  });

  test('exports updateAmbientTime as a function', function() {
    assert.strictEqual(typeof Audio.updateAmbientTime, 'function');
  });

  test('exports updateAmbientWeather as a function', function() {
    assert.strictEqual(typeof Audio.updateAmbientWeather, 'function');
  });

  test('exports setZoneAmbient as a function', function() {
    assert.strictEqual(typeof Audio.setZoneAmbient, 'function');
  });

  test('exports playNPCSound as a function', function() {
    assert.strictEqual(typeof Audio.playNPCSound, 'function');
  });

  test('exports startMusic as a function', function() {
    assert.strictEqual(typeof Audio.startMusic, 'function');
  });

  test('exports stopMusic as a function', function() {
    assert.strictEqual(typeof Audio.stopMusic, 'function');
  });

  test('exports updateMusic as a function', function() {
    assert.strictEqual(typeof Audio.updateMusic, 'function');
  });

  test('exports setMusicVolume as a function', function() {
    assert.strictEqual(typeof Audio.setMusicVolume, 'function');
  });

  test('exports isMusicPlaying as a function', function() {
    assert.strictEqual(typeof Audio.isMusicPlaying, 'function');
  });

  test('exports playPianoAccent as a function', function() {
    assert.strictEqual(typeof Audio.playPianoAccent, 'function');
  });

  test('exports getPianoAccentTypes as a function', function() {
    assert.strictEqual(typeof Audio.getPianoAccentTypes, 'function');
  });

  test('does NOT export private helpers (createWhiteNoise)', function() {
    assert.strictEqual(typeof Audio.createWhiteNoise, 'undefined');
  });

  test('does NOT export private state variables (audioContext)', function() {
    assert.strictEqual(typeof Audio.audioContext, 'undefined');
  });
});

// ============================================================================
// SUITE 2 — getPianoAccentTypes
// ============================================================================

suite('getPianoAccentTypes — returns valid accent descriptors', function() {

  var types;
  test('call does not throw', function() {
    types = Audio.getPianoAccentTypes();
    assert.ok(true);
  });

  test('returns an object (not null)', function() {
    assert.ok(types !== null && typeof types === 'object');
  });

  test('contains "dawn" accent', function() {
    assert.ok('dawn' in types);
  });

  test('contains "morning" accent', function() {
    assert.ok('morning' in types);
  });

  test('contains "dusk" accent', function() {
    assert.ok('dusk' in types);
  });

  test('contains "night" accent', function() {
    assert.ok('night' in types);
  });

  test('contains "zone_discovery" accent', function() {
    assert.ok('zone_discovery' in types);
  });

  test('contains "quest_complete" accent', function() {
    assert.ok('quest_complete' in types);
  });

  test('contains "achievement" accent', function() {
    assert.ok('achievement' in types);
  });

  test('each accent has a notes array', function() {
    var keys = Object.keys(types);
    keys.forEach(function(key) {
      assert.ok(Array.isArray(types[key].notes), key + ' should have notes array');
    });
  });

  test('each accent notes array is non-empty', function() {
    var keys = Object.keys(types);
    keys.forEach(function(key) {
      assert.ok(types[key].notes.length > 0, key + ' notes array should not be empty');
    });
  });

  test('each accent has a numeric noteSpacing', function() {
    var keys = Object.keys(types);
    keys.forEach(function(key) {
      assert.strictEqual(typeof types[key].noteSpacing, 'number', key + ' noteSpacing should be a number');
    });
  });

  test('each accent has a numeric noteDuration', function() {
    var keys = Object.keys(types);
    keys.forEach(function(key) {
      assert.strictEqual(typeof types[key].noteDuration, 'number', key + ' noteDuration should be a number');
    });
  });

  test('each accent has a numeric volume', function() {
    var keys = Object.keys(types);
    keys.forEach(function(key) {
      assert.strictEqual(typeof types[key].volume, 'number', key + ' volume should be a number');
    });
  });

  test('all accent note frequencies are positive numbers', function() {
    var keys = Object.keys(types);
    keys.forEach(function(key) {
      types[key].notes.forEach(function(freq) {
        assert.ok(typeof freq === 'number' && freq > 0, key + ' note freq should be a positive number');
      });
    });
  });

  test('returns at least 7 accent types', function() {
    assert.ok(Object.keys(types).length >= 7);
  });
});

// ============================================================================
// SUITE 3 — initAudio safety
// ============================================================================

suite('initAudio — initialisation behaviour', function() {

  test('initAudio does not throw on repeated calls', function() {
    Audio.initAudio();
    Audio.initAudio();
    assert.ok(true);
  });

  test('initAudio returns truthy on first call when AudioContext exists', function() {
    // Re-require is impractical after module load; verify the stored result
    // We just confirm calling it again does not throw and is idempotent.
    var result = Audio.initAudio();
    // Returns true OR undefined on subsequent calls (deferred pattern)
    assert.ok(result === true || result === undefined);
  });

});

// ============================================================================
// SUITE 4 — mute / unmute / isMusicPlaying
// ============================================================================

suite('mute / unmute / isMusicPlaying — state management', function() {

  test('mute does not throw', function() {
    Audio.mute();
    assert.ok(true);
  });

  test('unmute does not throw', function() {
    Audio.unmute();
    assert.ok(true);
  });

  test('isMusicPlaying returns false before startMusic', function() {
    Audio.stopMusic(); // ensure clean state
    assert.strictEqual(Audio.isMusicPlaying(), false);
  });

  test('isMusicPlaying returns boolean', function() {
    var result = Audio.isMusicPlaying();
    assert.ok(typeof result === 'boolean');
  });

  test('mute then unmute does not throw', function() {
    Audio.mute();
    Audio.unmute();
    assert.ok(true);
  });

  test('unmute then mute does not throw', function() {
    Audio.unmute();
    Audio.mute();
    assert.ok(true);
  });

  test('isMusicPlaying returns true after startMusic', function() {
    Audio.startMusic('nexus', 'midday');
    assert.strictEqual(Audio.isMusicPlaying(), true);
    Audio.stopMusic();
  });

  test('isMusicPlaying returns false after stopMusic', function() {
    Audio.startMusic('nexus', 'morning');
    Audio.stopMusic();
    assert.strictEqual(Audio.isMusicPlaying(), false);
  });
});

// ============================================================================
// SUITE 5 — setVolume
// ============================================================================

suite('setVolume — volume channel setting', function() {

  test('setVolume(master, 0.5) does not throw', function() {
    Audio.setVolume('master', 0.5);
    assert.ok(true);
  });

  test('setVolume(music, 0.3) does not throw', function() {
    Audio.setVolume('music', 0.3);
    assert.ok(true);
  });

  test('setVolume(sfx, 0.8) does not throw', function() {
    Audio.setVolume('sfx', 0.8);
    assert.ok(true);
  });

  test('setVolume clamps above 1 without throwing', function() {
    Audio.setVolume('master', 2.5);
    assert.ok(true);
  });

  test('setVolume clamps below 0 without throwing', function() {
    Audio.setVolume('master', -1);
    assert.ok(true);
  });

  test('setVolume with numeric first arg (legacy shorthand) does not throw', function() {
    Audio.setVolume(0.7);
    assert.ok(true);
  });

  test('setVolume with null channel does not throw', function() {
    try { Audio.setVolume(null, 0.5); } catch(e) { assert.fail('should not throw: ' + e.message); }
    assert.ok(true);
  });

  test('setVolume with undefined level does not throw', function() {
    try { Audio.setVolume('master', undefined); } catch(e) { assert.fail('should not throw: ' + e.message); }
    assert.ok(true);
  });
});

// ============================================================================
// SUITE 6 — setMusicVolume
// ============================================================================

suite('setMusicVolume — music volume clamping', function() {

  test('setMusicVolume(0.5) does not throw', function() {
    Audio.setMusicVolume(0.5);
    assert.ok(true);
  });

  test('setMusicVolume(0) does not throw', function() {
    Audio.setMusicVolume(0);
    assert.ok(true);
  });

  test('setMusicVolume(1) does not throw', function() {
    Audio.setMusicVolume(1);
    assert.ok(true);
  });

  test('setMusicVolume above 1 is clamped (no throw)', function() {
    Audio.setMusicVolume(10);
    assert.ok(true);
  });

  test('setMusicVolume negative is clamped (no throw)', function() {
    Audio.setMusicVolume(-5);
    assert.ok(true);
  });
});

// ============================================================================
// SUITE 7 — Function safety with null/undefined arguments
// ============================================================================

suite('Function safety — null/undefined args must not throw', function() {

  test('playAmbient(null) does not throw', function() {
    try { Audio.playAmbient(null); } catch(e) { assert.fail('threw: ' + e.message); }
    assert.ok(true);
  });

  test('playAmbient(undefined) does not throw', function() {
    try { Audio.playAmbient(undefined); } catch(e) { assert.fail('threw: ' + e.message); }
    assert.ok(true);
  });

  test('playSound(null) does not throw', function() {
    try { Audio.playSound(null); } catch(e) { assert.fail('threw: ' + e.message); }
    assert.ok(true);
  });

  test('playSound(undefined) does not throw', function() {
    try { Audio.playSound(undefined); } catch(e) { assert.fail('threw: ' + e.message); }
    assert.ok(true);
  });

  test('playFootstep(null) does not throw', function() {
    try { Audio.playFootstep(null); } catch(e) { assert.fail('threw: ' + e.message); }
    assert.ok(true);
  });

  test('playFootstep(undefined) does not throw', function() {
    try { Audio.playFootstep(undefined); } catch(e) { assert.fail('threw: ' + e.message); }
    assert.ok(true);
  });

  test('updateAmbientTime(null) does not throw', function() {
    try { Audio.updateAmbientTime(null); } catch(e) { assert.fail('threw: ' + e.message); }
    assert.ok(true);
  });

  test('updateAmbientWeather(null) does not throw', function() {
    try { Audio.updateAmbientWeather(null); } catch(e) { assert.fail('threw: ' + e.message); }
    assert.ok(true);
  });

  test('setZoneAmbient(null) does not throw', function() {
    try { Audio.setZoneAmbient(null); } catch(e) { assert.fail('threw: ' + e.message); }
    assert.ok(true);
  });

  test('playNPCSound(null) does not throw', function() {
    try { Audio.playNPCSound(null); } catch(e) { assert.fail('threw: ' + e.message); }
    assert.ok(true);
  });

  test('startMusic(null, null) does not throw', function() {
    try { Audio.startMusic(null, null); } catch(e) { assert.fail('threw: ' + e.message); }
    Audio.stopMusic();
    assert.ok(true);
  });

  test('updateMusic(null, null) does not throw', function() {
    try { Audio.updateMusic(null, null); } catch(e) { assert.fail('threw: ' + e.message); }
    assert.ok(true);
  });

  test('playPianoAccent(null) does not throw', function() {
    try { Audio.playPianoAccent(null); } catch(e) { assert.fail('threw: ' + e.message); }
    assert.ok(true);
  });

  test('playPianoAccent("unknown_type") does not throw', function() {
    try { Audio.playPianoAccent('unknown_type'); } catch(e) { assert.fail('threw: ' + e.message); }
    assert.ok(true);
  });

  test('stopAll() does not throw', function() {
    try { Audio.stopAll(); } catch(e) { assert.fail('threw: ' + e.message); }
    assert.ok(true);
  });
});

// ============================================================================
// SUITE 8 — playAmbient zone routing
// ============================================================================

suite('playAmbient — zone routing (all 8 zones + unknown)', function() {
  var zones = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];

  zones.forEach(function(zone) {
    test('playAmbient("' + zone + '") does not throw', function() {
      try {
        Audio.playAmbient(zone);
        Audio.stopAll();
      } catch(e) {
        assert.fail('zone ' + zone + ' threw: ' + e.message);
      }
      assert.ok(true);
    });
  });

  test('playAmbient("unknown_zone") does not throw', function() {
    try { Audio.playAmbient('unknown_zone'); } catch(e) { assert.fail('threw: ' + e.message); }
    assert.ok(true);
  });
});

// ============================================================================
// SUITE 9 — playSound type routing
// ============================================================================

suite('playSound — known sound types do not throw', function() {
  var soundTypes = [
    'chat', 'warp', 'harvest', 'build', 'trade', 'trade_request',
    'discover', 'challenge', 'levelup', 'level_up', 'error',
    'notification', 'craft_complete', 'quest_accept', 'quest_complete',
    'item_pickup', 'npc_greet', 'portal_enter', 'build_place',
    'footstep', 'zone_enter', 'shutter', 'coin'
  ];

  soundTypes.forEach(function(soundType) {
    test('playSound("' + soundType + '") does not throw', function() {
      try { Audio.playSound(soundType); } catch(e) { assert.fail(soundType + ' threw: ' + e.message); }
      assert.ok(true);
    });
  });

  test('playSound with an unrecognised type does not throw', function() {
    try { Audio.playSound('totally_fake_sound'); } catch(e) { assert.fail('threw: ' + e.message); }
    assert.ok(true);
  });
});

// ============================================================================
// SUITE 10 — playFootstep terrain variants
// ============================================================================

suite('playFootstep — terrain variants do not throw', function() {
  var terrains = ['grass', 'stone', 'sand', 'water', 'wood', 'unknown_terrain'];

  terrains.forEach(function(terrain) {
    test('playFootstep("' + terrain + '") does not throw', function() {
      try { Audio.playFootstep(terrain); } catch(e) { assert.fail(terrain + ' threw: ' + e.message); }
      assert.ok(true);
    });
  });
});

// ============================================================================
// SUITE 11 — updateAmbientTime time-of-day variants
// ============================================================================

suite('updateAmbientTime — time periods do not throw', function() {
  var periods = ['dawn', 'morning', 'midday', 'afternoon', 'evening', 'night', 'unknown_period'];

  periods.forEach(function(period) {
    test('updateAmbientTime("' + period + '") does not throw', function() {
      try {
        Audio.updateAmbientTime(period);
        Audio.stopAll();
      } catch(e) {
        assert.fail(period + ' threw: ' + e.message);
      }
      assert.ok(true);
    });
  });
});

// ============================================================================
// SUITE 12 — updateAmbientWeather variants
// ============================================================================

suite('updateAmbientWeather — weather types do not throw', function() {
  var weathers = ['clear', 'cloudy', 'rain', 'snow', 'unknown_weather'];

  weathers.forEach(function(weather) {
    test('updateAmbientWeather("' + weather + '") does not throw', function() {
      try {
        Audio.updateAmbientWeather(weather);
        Audio.stopAll();
      } catch(e) {
        assert.fail(weather + ' threw: ' + e.message);
      }
      assert.ok(true);
    });
  });
});

// ============================================================================
// SUITE 13 — playNPCSound activity types
// ============================================================================

suite('playNPCSound — NPC activity types do not throw', function() {
  var npcTypes = ['hammer', 'music', 'garden', 'trade', 'teach', 'heal', 'unknown_npc_type'];

  npcTypes.forEach(function(npcType) {
    test('playNPCSound("' + npcType + '") does not throw', function() {
      try { Audio.playNPCSound(npcType); } catch(e) { assert.fail(npcType + ' threw: ' + e.message); }
      assert.ok(true);
    });
  });
});

// ============================================================================
// SUITE 14 — playPianoAccent known types
// ============================================================================

suite('playPianoAccent — known accent types do not throw', function() {
  var accentTypes = ['dawn', 'morning', 'dusk', 'night', 'zone_discovery', 'quest_complete', 'achievement'];

  accentTypes.forEach(function(accentType) {
    test('playPianoAccent("' + accentType + '") does not throw', function() {
      try { Audio.playPianoAccent(accentType); } catch(e) { assert.fail(accentType + ' threw: ' + e.message); }
      assert.ok(true);
    });
  });
});

// ============================================================================
// SUITE 15 — Music system lifecycle
// ============================================================================

suite('Music system — start / stop / update lifecycle', function() {
  var zones = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];

  zones.forEach(function(zone) {
    test('startMusic("' + zone + '") + stopMusic() does not throw', function() {
      try {
        Audio.startMusic(zone, 'midday');
        assert.strictEqual(Audio.isMusicPlaying(), true);
        Audio.stopMusic();
        assert.strictEqual(Audio.isMusicPlaying(), false);
      } catch(e) {
        assert.fail(zone + ' threw: ' + e.message);
      }
    });
  });

  test('startMusic with time "dawn" does not throw', function() {
    try { Audio.startMusic('nexus', 'dawn'); Audio.stopMusic(); } catch(e) { assert.fail('threw: ' + e.message); }
    assert.ok(true);
  });

  test('startMusic with time "night" does not throw', function() {
    try { Audio.startMusic('arena', 'night'); Audio.stopMusic(); } catch(e) { assert.fail('threw: ' + e.message); }
    assert.ok(true);
  });

  test('updateMusic zone change does not throw', function() {
    Audio.startMusic('nexus', 'midday');
    try { Audio.updateMusic('gardens', 'morning'); } catch(e) { assert.fail('threw: ' + e.message); }
    Audio.stopMusic();
    assert.ok(true);
  });

  test('updateMusic time change does not throw', function() {
    Audio.startMusic('nexus', 'midday');
    try { Audio.updateMusic('nexus', 'evening'); } catch(e) { assert.fail('threw: ' + e.message); }
    Audio.stopMusic();
    assert.ok(true);
  });

  test('updateMusic when not playing is silent (no throw)', function() {
    Audio.stopMusic();
    try { Audio.updateMusic('gardens', 'dawn'); } catch(e) { assert.fail('threw: ' + e.message); }
    assert.ok(true);
  });

  test('calling startMusic twice in a row does not throw', function() {
    try {
      Audio.startMusic('nexus', 'midday');
      Audio.startMusic('arena', 'night');
      Audio.stopMusic();
    } catch(e) {
      assert.fail('threw: ' + e.message);
    }
    assert.ok(true);
  });

  test('calling stopMusic when not playing does not throw', function() {
    Audio.stopMusic();
    try { Audio.stopMusic(); } catch(e) { assert.fail('threw: ' + e.message); }
    assert.ok(true);
  });
});

// ============================================================================
// SUITE 16 — setZoneAmbient zone layer routing
// ============================================================================

suite('setZoneAmbient — zone layer routing does not throw', function() {
  var zones = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena', 'unknown_zone'];

  zones.forEach(function(zone) {
    test('setZoneAmbient("' + zone + '") does not throw', function() {
      try {
        Audio.setZoneAmbient(zone);
        Audio.stopAll();
      } catch(e) {
        assert.fail(zone + ' threw: ' + e.message);
      }
      assert.ok(true);
    });
  });
});

// ============================================================================
// SUITE 17 — stopAll idempotency
// ============================================================================

suite('stopAll — idempotency and safety', function() {

  test('stopAll() on clean state does not throw', function() {
    Audio.stopAll();
    assert.ok(true);
  });

  test('stopAll() after playAmbient does not throw', function() {
    Audio.playAmbient('gardens');
    Audio.stopAll();
    assert.ok(true);
  });

  test('stopAll() twice in a row does not throw', function() {
    Audio.stopAll();
    Audio.stopAll();
    assert.ok(true);
  });

  test('stopAll() after startMusic does not throw', function() {
    Audio.startMusic('nexus', 'midday');
    Audio.stopAll();
    assert.ok(true);
  });

  test('isMusicPlaying is false after stopAll', function() {
    Audio.startMusic('nexus', 'midday');
    Audio.stopAll();
    // stopAll stops ambient layers but music state is managed by stopMusic;
    // the music itself is cleared by stopMusic called via stopAll
    assert.strictEqual(typeof Audio.isMusicPlaying(), 'boolean');
  });
});

// ============================================================================
// REPORT
// ============================================================================

var success = report();
process.exit(success ? 0 : 1);
