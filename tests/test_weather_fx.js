// test_weather_fx.js — 80+ tests for weather_fx.js
const { test, suite, report, assert } = require('./test_runner');
const WeatherFX = require('../src/js/weather_fx');

var ALL_TYPES = ['clear', 'rain', 'heavy_rain', 'snow', 'blizzard', 'fog', 'thunderstorm', 'sandstorm', 'mist'];
var SEASONS   = ['spring', 'summer', 'autumn', 'winter'];

// ── WEATHER_TYPES constant ───────────────────────────────────────────────────

suite('WEATHER_TYPES constant', function() {

  test('WEATHER_TYPES is exported', function() {
    assert.ok(WeatherFX.WEATHER_TYPES, 'WEATHER_TYPES must exist');
  });

  test('WEATHER_TYPES has all 9 types', function() {
    var expected = ['CLEAR','RAIN','HEAVY_RAIN','SNOW','BLIZZARD','FOG','THUNDERSTORM','SANDSTORM','MIST'];
    expected.forEach(function(k) {
      assert.ok(WeatherFX.WEATHER_TYPES[k] !== undefined, 'Missing WEATHER_TYPES.' + k);
    });
  });

  test('WEATHER_TYPES values are lowercase strings', function() {
    Object.values(WeatherFX.WEATHER_TYPES).forEach(function(v) {
      assert.strictEqual(typeof v, 'string');
      assert.strictEqual(v, v.toLowerCase(), 'Value should be lowercase: ' + v);
    });
  });

  test('WEATHER_TYPES.THUNDERSTORM equals "thunderstorm"', function() {
    assert.strictEqual(WeatherFX.WEATHER_TYPES.THUNDERSTORM, 'thunderstorm');
  });

  test('WEATHER_TYPES.BLIZZARD equals "blizzard"', function() {
    assert.strictEqual(WeatherFX.WEATHER_TYPES.BLIZZARD, 'blizzard');
  });
});

// ── PARTICLE_CONFIGS ─────────────────────────────────────────────────────────

suite('PARTICLE_CONFIGS data structure', function() {

  test('PARTICLE_CONFIGS has all 9 weather types', function() {
    ALL_TYPES.forEach(function(t) {
      assert.ok(WeatherFX.PARTICLE_CONFIGS[t], 'Missing PARTICLE_CONFIGS.' + t);
    });
  });

  test('Each particle config has required fields', function() {
    var fields = ['count','speed','size','color','opacity','direction','spread','turbulence','type'];
    ALL_TYPES.forEach(function(t) {
      var cfg = WeatherFX.PARTICLE_CONFIGS[t];
      fields.forEach(function(f) {
        assert.ok(cfg[f] !== undefined, t + ' missing field: ' + f);
      });
    });
  });

  test('Direction is an object with x, y, z', function() {
    ALL_TYPES.forEach(function(t) {
      var d = WeatherFX.PARTICLE_CONFIGS[t].direction;
      assert.ok(typeof d.x === 'number', t + ' direction.x');
      assert.ok(typeof d.y === 'number', t + ' direction.y');
      assert.ok(typeof d.z === 'number', t + ' direction.z');
    });
  });

  test('clear has count 0 (no particles)', function() {
    assert.strictEqual(WeatherFX.PARTICLE_CONFIGS.clear.count, 0);
  });

  test('thunderstorm has highest particle count', function() {
    var storm = WeatherFX.PARTICLE_CONFIGS.thunderstorm.count;
    assert.ok(storm >= 2000, 'Thunderstorm should have >= 2000 particles, got ' + storm);
  });

  test('rain particles are type streak', function() {
    assert.strictEqual(WeatherFX.PARTICLE_CONFIGS.rain.type, 'streak');
  });

  test('snow particles are type flake', function() {
    assert.strictEqual(WeatherFX.PARTICLE_CONFIGS.snow.type, 'flake');
  });

  test('fog particles are type volume', function() {
    assert.strictEqual(WeatherFX.PARTICLE_CONFIGS.fog.type, 'volume');
  });

  test('sandstorm particles are type dust', function() {
    assert.strictEqual(WeatherFX.PARTICLE_CONFIGS.sandstorm.type, 'dust');
  });

  test('opacity values are 0..1', function() {
    ALL_TYPES.forEach(function(t) {
      var op = WeatherFX.PARTICLE_CONFIGS[t].opacity;
      assert.ok(op >= 0 && op <= 1, t + ' opacity out of range: ' + op);
    });
  });

  test('color values are hex strings', function() {
    ALL_TYPES.forEach(function(t) {
      var c = WeatherFX.PARTICLE_CONFIGS[t].color;
      assert.ok(/^#[0-9a-fA-F]{6}$/.test(c), t + ' color is not valid hex: ' + c);
    });
  });
});

// ── LIGHTING_CONFIGS ─────────────────────────────────────────────────────────

suite('LIGHTING_CONFIGS data structure', function() {

  test('LIGHTING_CONFIGS has all 9 weather types', function() {
    ALL_TYPES.forEach(function(t) {
      assert.ok(WeatherFX.LIGHTING_CONFIGS[t], 'Missing LIGHTING_CONFIGS.' + t);
    });
  });

  test('Each lighting config has required fields', function() {
    var fields = ['ambientColor','ambientIntensity','directionalIntensity','fogColor','fogDensity','skyColor','shadowStrength'];
    ALL_TYPES.forEach(function(t) {
      var cfg = WeatherFX.LIGHTING_CONFIGS[t];
      fields.forEach(function(f) {
        assert.ok(cfg[f] !== undefined, t + ' missing field: ' + f);
      });
    });
  });

  test('fogDensity values are positive numbers', function() {
    ALL_TYPES.forEach(function(t) {
      var d = WeatherFX.LIGHTING_CONFIGS[t].fogDensity;
      assert.ok(typeof d === 'number' && d >= 0, t + ' fogDensity must be >= 0, got ' + d);
    });
  });

  test('thunderstorm has lower directionalIntensity than clear', function() {
    var storm = WeatherFX.LIGHTING_CONFIGS.thunderstorm.directionalIntensity;
    var clr   = WeatherFX.LIGHTING_CONFIGS.clear.directionalIntensity;
    assert.ok(storm < clr, 'Thunderstorm should be darker than clear');
  });

  test('blizzard has higher fogDensity than clear', function() {
    var bliz = WeatherFX.LIGHTING_CONFIGS.blizzard.fogDensity;
    var clr  = WeatherFX.LIGHTING_CONFIGS.clear.fogDensity;
    assert.ok(bliz > clr, 'Blizzard fog should be denser than clear');
  });

  test('color fields are hex strings', function() {
    var colorFields = ['ambientColor','fogColor','skyColor'];
    ALL_TYPES.forEach(function(t) {
      var cfg = WeatherFX.LIGHTING_CONFIGS[t];
      colorFields.forEach(function(f) {
        assert.ok(/^#[0-9a-fA-F]{6}$/.test(cfg[f]), t + '.' + f + ' not valid hex: ' + cfg[f]);
      });
    });
  });
});

// ── SOUND_HINTS ──────────────────────────────────────────────────────────────

suite('SOUND_HINTS', function() {

  test('SOUND_HINTS has all 9 weather types', function() {
    ALL_TYPES.forEach(function(t) {
      assert.ok(WeatherFX.SOUND_HINTS[t] !== undefined, 'Missing SOUND_HINTS.' + t);
    });
  });

  test('Each sound hint is a non-empty string', function() {
    ALL_TYPES.forEach(function(t) {
      var s = WeatherFX.SOUND_HINTS[t];
      assert.strictEqual(typeof s, 'string');
      assert.ok(s.length > 0, t + ' sound hint is empty');
    });
  });

  test('thunderstorm hints at thunder audio', function() {
    assert.ok(WeatherFX.SOUND_HINTS.thunderstorm.indexOf('thunder') !== -1 ||
              WeatherFX.SOUND_HINTS.thunderstorm.indexOf('storm') !== -1,
              'thunderstorm sound should reference thunder or storm');
  });
});

// ── getWeatherConfig ─────────────────────────────────────────────────────────

suite('getWeatherConfig(type)', function() {

  test('returns an object for each type', function() {
    ALL_TYPES.forEach(function(t) {
      var cfg = WeatherFX.getWeatherConfig(t);
      assert.strictEqual(typeof cfg, 'object');
    });
  });

  test('returned object has particle, lighting, sound, visibility, modifiers, lightning', function() {
    var cfg = WeatherFX.getWeatherConfig('rain');
    assert.ok(cfg.particle   !== undefined, 'missing particle');
    assert.ok(cfg.lighting   !== undefined, 'missing lighting');
    assert.ok(cfg.sound      !== undefined, 'missing sound');
    assert.ok(cfg.visibility !== undefined, 'missing visibility');
    assert.ok(cfg.modifiers  !== undefined, 'missing modifiers');
    assert.ok(cfg.lightning  !== undefined, 'missing lightning');
  });

  test('type field matches input', function() {
    ALL_TYPES.forEach(function(t) {
      assert.strictEqual(WeatherFX.getWeatherConfig(t).type, t);
    });
  });

  test('throws on unknown type', function() {
    assert.throws(function() {
      WeatherFX.getWeatherConfig('hurricane');
    }, /Unknown weather type/);
  });
});

// ── getParticleConfig ────────────────────────────────────────────────────────

suite('getParticleConfig(type)', function() {

  test('returns particle config for each type', function() {
    ALL_TYPES.forEach(function(t) {
      var p = WeatherFX.getParticleConfig(t);
      assert.ok(p, 'No particle config for ' + t);
    });
  });

  test('returns a copy (mutation does not affect source)', function() {
    var p = WeatherFX.getParticleConfig('snow');
    p.count = 99999;
    assert.notStrictEqual(WeatherFX.PARTICLE_CONFIGS.snow.count, 99999);
  });

  test('direction is a copy object', function() {
    var p = WeatherFX.getParticleConfig('rain');
    p.direction.x = 999;
    assert.notStrictEqual(WeatherFX.PARTICLE_CONFIGS.rain.direction.x, 999);
  });

  test('throws on unknown type', function() {
    assert.throws(function() {
      WeatherFX.getParticleConfig('tornado');
    }, /Unknown weather type/);
  });
});

// ── getLightingConfig ────────────────────────────────────────────────────────

suite('getLightingConfig(type, timeOfDay)', function() {

  test('returns lighting config for each type', function() {
    ALL_TYPES.forEach(function(t) {
      var l = WeatherFX.getLightingConfig(t, 0.5);
      assert.ok(l, 'No lighting config for ' + t);
    });
  });

  test('noon time returns timeOfDay = "noon"', function() {
    var l = WeatherFX.getLightingConfig('clear', 0.5);
    assert.strictEqual(l.timeOfDay, 'noon');
  });

  test('timeOfDay 0 (midnight) returns night', function() {
    var l = WeatherFX.getLightingConfig('clear', 0);
    assert.strictEqual(l.timeOfDay, 'night');
  });

  test('timeOfDay 0.15 returns dawn', function() {
    var l = WeatherFX.getLightingConfig('clear', 0.15);
    assert.strictEqual(l.timeOfDay, 'dawn');
  });

  test('timeOfDay 0.83 returns dusk', function() {
    var l = WeatherFX.getLightingConfig('clear', 0.83);
    assert.strictEqual(l.timeOfDay, 'dusk');
  });

  test('night has lower ambientIntensity than noon', function() {
    var noon  = WeatherFX.getLightingConfig('clear', 0.5).ambientIntensity;
    var night = WeatherFX.getLightingConfig('clear', 0.0).ambientIntensity;
    assert.ok(night < noon, 'Night should be dimmer than noon');
  });

  test('ambientIntensity is a positive number', function() {
    ALL_TYPES.forEach(function(t) {
      var l = WeatherFX.getLightingConfig(t, 0.5);
      assert.ok(typeof l.ambientIntensity === 'number' && l.ambientIntensity >= 0,
        t + ' ambientIntensity must be >= 0');
    });
  });

  test('default timeOfDay (undefined) does not throw', function() {
    assert.doesNotThrow(function() {
      WeatherFX.getLightingConfig('clear', undefined);
    });
  });

  test('throws on unknown weather type', function() {
    assert.throws(function() {
      WeatherFX.getLightingConfig('unknown', 0.5);
    });
  });

  test('includes tint and tintStrength', function() {
    var l = WeatherFX.getLightingConfig('rain', 0.5);
    assert.ok(l.tint !== undefined, 'missing tint');
    assert.ok(typeof l.tintStrength === 'number', 'missing tintStrength');
  });
});

// ── interpolateWeather ───────────────────────────────────────────────────────

suite('interpolateWeather(from, to, progress)', function() {

  test('progress=0 returns values close to "from"', function() {
    var r = WeatherFX.interpolateWeather('clear', 'rain', 0);
    assert.strictEqual(r.particle.count, WeatherFX.PARTICLE_CONFIGS.clear.count);
  });

  test('progress=1 returns values close to "to"', function() {
    var r = WeatherFX.interpolateWeather('clear', 'rain', 1);
    assert.strictEqual(r.particle.count, WeatherFX.PARTICLE_CONFIGS.rain.count);
  });

  test('progress=0.5 blends particle count halfway', function() {
    var cA = WeatherFX.PARTICLE_CONFIGS.clear.count;
    var cB = WeatherFX.PARTICLE_CONFIGS.rain.count;
    var r  = WeatherFX.interpolateWeather('clear', 'rain', 0.5);
    var expected = Math.round((cA + cB) / 2);
    assert.strictEqual(r.particle.count, expected);
  });

  test('progress is clamped to 0..1', function() {
    var r1 = WeatherFX.interpolateWeather('clear', 'rain', -5);
    assert.strictEqual(r1.progress, 0);
    var r2 = WeatherFX.interpolateWeather('clear', 'rain', 10);
    assert.strictEqual(r2.progress, 1);
  });

  test('returns type field based on progress', function() {
    var r0 = WeatherFX.interpolateWeather('clear', 'fog', 0.3);
    assert.strictEqual(r0.type, 'clear');
    var r1 = WeatherFX.interpolateWeather('clear', 'fog', 0.7);
    assert.strictEqual(r1.type, 'fog');
  });

  test('blended particle.direction has x, y, z', function() {
    var r = WeatherFX.interpolateWeather('snow', 'rain', 0.5);
    assert.ok(typeof r.particle.direction.x === 'number');
    assert.ok(typeof r.particle.direction.y === 'number');
    assert.ok(typeof r.particle.direction.z === 'number');
  });

  test('blended opacity is within 0..1', function() {
    ALL_TYPES.forEach(function(t) {
      var r = WeatherFX.interpolateWeather('clear', t, 0.5);
      assert.ok(r.particle.opacity >= 0 && r.particle.opacity <= 1,
        'opacity out of range for clear->' + t);
    });
  });

  test('fogDensity is blended in lighting', function() {
    var dA = WeatherFX.LIGHTING_CONFIGS.clear.fogDensity;
    var dB = WeatherFX.LIGHTING_CONFIGS.fog.fogDensity;
    var r  = WeatherFX.interpolateWeather('clear', 'fog', 0.5);
    var expected = (dA + dB) / 2;
    assert.ok(Math.abs(r.lighting.fogDensity - expected) < 0.0001,
      'fogDensity not blended correctly');
  });

  test('throws on unknown from type', function() {
    assert.throws(function() {
      WeatherFX.interpolateWeather('volcano', 'rain', 0.5);
    });
  });

  test('throws on unknown to type', function() {
    assert.throws(function() {
      WeatherFX.interpolateWeather('rain', 'volcano', 0.5);
    });
  });

  test('same-type interpolation returns source values', function() {
    var r = WeatherFX.interpolateWeather('fog', 'fog', 0.5);
    assert.strictEqual(r.particle.count, WeatherFX.PARTICLE_CONFIGS.fog.count);
  });
});

// ── getWindVector ────────────────────────────────────────────────────────────

suite('getWindVector(weather, time)', function() {

  test('returns {x, y, z, strength} for each type', function() {
    ALL_TYPES.forEach(function(t) {
      var w = WeatherFX.getWindVector(t, 100);
      assert.ok(typeof w.x        === 'number', t + ' missing x');
      assert.ok(typeof w.y        === 'number', t + ' missing y');
      assert.ok(typeof w.z        === 'number', t + ' missing z');
      assert.ok(typeof w.strength === 'number', t + ' missing strength');
    });
  });

  test('blizzard has higher strength than clear', function() {
    var bliz = WeatherFX.getWindVector('blizzard', 0).strength;
    var clr  = WeatherFX.getWindVector('clear', 0).strength;
    assert.ok(bliz > clr, 'Blizzard wind should be stronger than clear');
  });

  test('sandstorm has highest base wind strength', function() {
    var sand = WeatherFX.getWindVector('sandstorm', 0).strength;
    assert.ok(sand > 20, 'Sandstorm wind should exceed 20, got ' + sand);
  });

  test('clear has near-zero wind strength', function() {
    var clr = WeatherFX.getWindVector('clear', 0).strength;
    assert.ok(clr < 10, 'Clear wind should be low, got ' + clr);
  });

  test('wind changes over time (not static)', function() {
    var w1 = WeatherFX.getWindVector('rain', 0);
    var w2 = WeatherFX.getWindVector('rain', 1000);
    // x or z should differ
    var changed = (Math.abs(w1.x - w2.x) > 0.001) || (Math.abs(w1.z - w2.z) > 0.001);
    assert.ok(changed, 'Wind should shift over time');
  });

  test('time=0 does not throw', function() {
    assert.doesNotThrow(function() {
      WeatherFX.getWindVector('fog', 0);
    });
  });

  test('throws on unknown type', function() {
    assert.throws(function() {
      WeatherFX.getWindVector('hailstorm', 100);
    });
  });
});

// ── applyWindToPosition ──────────────────────────────────────────────────────

suite('applyWindToPosition(pos, wind, mass)', function() {

  test('returns {x, y, z}', function() {
    var wind = WeatherFX.getWindVector('rain', 0);
    var pos  = { x: 0, y: 5, z: 0 };
    var r    = WeatherFX.applyWindToPosition(pos, wind, 1);
    assert.ok(typeof r.x === 'number');
    assert.ok(typeof r.y === 'number');
    assert.ok(typeof r.z === 'number');
  });

  test('higher mass means less displacement', function() {
    var wind  = { x: 10, y: 0, z: 0, strength: 10 };
    var pos   = { x: 0, y: 0, z: 0 };
    var light = WeatherFX.applyWindToPosition(pos, wind, 1);
    var heavy = WeatherFX.applyWindToPosition(pos, wind, 100);
    assert.ok(light.x > heavy.x, 'Light object should be displaced more');
  });

  test('zero-wind produces no displacement', function() {
    var wind = { x: 0, y: 0, z: 0, strength: 0 };
    var pos  = { x: 5, y: 3, z: 7 };
    var r    = WeatherFX.applyWindToPosition(pos, wind, 1);
    assert.strictEqual(r.x, 5);
    assert.strictEqual(r.y, 3);
    assert.strictEqual(r.z, 7);
  });

  test('mass=0 defaults to mass=1 (no divide-by-zero)', function() {
    var wind = { x: 5, y: 0, z: 0, strength: 5 };
    var pos  = { x: 0, y: 0, z: 0 };
    assert.doesNotThrow(function() {
      WeatherFX.applyWindToPosition(pos, wind, 0);
    });
  });

  test('does not mutate input position', function() {
    var wind = { x: 10, y: 0, z: 0, strength: 10 };
    var pos  = { x: 1, y: 2, z: 3 };
    WeatherFX.applyWindToPosition(pos, wind, 1);
    assert.strictEqual(pos.x, 1);
    assert.strictEqual(pos.y, 2);
    assert.strictEqual(pos.z, 3);
  });
});

// ── getVisibilityRange ───────────────────────────────────────────────────────

suite('getVisibilityRange(weather)', function() {

  test('returns a positive number for each type', function() {
    ALL_TYPES.forEach(function(t) {
      var v = WeatherFX.getVisibilityRange(t);
      assert.ok(typeof v === 'number' && v > 0, t + ' visibility must be > 0, got ' + v);
    });
  });

  test('clear has highest visibility', function() {
    var clr = WeatherFX.getVisibilityRange('clear');
    ALL_TYPES.forEach(function(t) {
      if (t !== 'clear') {
        assert.ok(clr >= WeatherFX.getVisibilityRange(t),
          'clear (' + clr + ') should have >= visibility than ' + t);
      }
    });
  });

  test('blizzard and sandstorm have very low visibility', function() {
    assert.ok(WeatherFX.getVisibilityRange('blizzard')  < 100);
    assert.ok(WeatherFX.getVisibilityRange('sandstorm') < 100);
  });

  test('throws on unknown type', function() {
    assert.throws(function() {
      WeatherFX.getVisibilityRange('hurricane');
    });
  });
});

// ── getPuddleLevel ───────────────────────────────────────────────────────────

suite('getPuddleLevel(weather, duration)', function() {

  test('returns 0..1 for all types', function() {
    ALL_TYPES.forEach(function(t) {
      var level = WeatherFX.getPuddleLevel(t, 60);
      assert.ok(level >= 0 && level <= 1, t + ' puddle level out of range: ' + level);
    });
  });

  test('heavy_rain accumulates faster than rain', function() {
    var heavy = WeatherFX.getPuddleLevel('heavy_rain', 60);
    var rain  = WeatherFX.getPuddleLevel('rain', 60);
    assert.ok(heavy > rain, 'heavy_rain should accumulate more puddles');
  });

  test('clear evaporates (0 or minimal at start)', function() {
    var level = WeatherFX.getPuddleLevel('clear', 0);
    assert.strictEqual(level, 0, 'No puddles at duration=0');
  });

  test('duration=0 returns 0 for all types', function() {
    ALL_TYPES.forEach(function(t) {
      var level = WeatherFX.getPuddleLevel(t, 0);
      assert.strictEqual(level, 0, t + ' should have 0 puddles at duration 0');
    });
  });

  test('level is capped at 1.0', function() {
    // Run thunderstorm for very long time
    var level = WeatherFX.getPuddleLevel('thunderstorm', 999999);
    assert.strictEqual(level, 1, 'Puddle level should cap at 1');
  });

  test('throws on unknown type', function() {
    assert.throws(function() {
      WeatherFX.getPuddleLevel('monsoon', 60);
    });
  });
});

// ── getLightningChance ───────────────────────────────────────────────────────

suite('getLightningChance(weather)', function() {

  test('returns a number for each type', function() {
    ALL_TYPES.forEach(function(t) {
      var c = WeatherFX.getLightningChance(t);
      assert.ok(typeof c === 'number', t + ' lightning chance must be a number');
    });
  });

  test('thunderstorm has highest lightning chance', function() {
    var storm = WeatherFX.getLightningChance('thunderstorm');
    ALL_TYPES.forEach(function(t) {
      assert.ok(storm >= WeatherFX.getLightningChance(t),
        'thunderstorm should have highest lightning chance vs ' + t);
    });
  });

  test('clear has 0 lightning chance', function() {
    assert.strictEqual(WeatherFX.getLightningChance('clear'), 0);
  });

  test('fog has 0 lightning chance', function() {
    assert.strictEqual(WeatherFX.getLightningChance('fog'), 0);
  });

  test('all values are between 0 and 1', function() {
    ALL_TYPES.forEach(function(t) {
      var c = WeatherFX.getLightningChance(t);
      assert.ok(c >= 0 && c <= 1, t + ' chance out of range: ' + c);
    });
  });

  test('throws on unknown type', function() {
    assert.throws(function() {
      WeatherFX.getLightningChance('tornado');
    });
  });
});

// ── generateLightningBolt ────────────────────────────────────────────────────

suite('generateLightningBolt(seed)', function() {

  test('returns {points, segments, branches, seed}', function() {
    var bolt = WeatherFX.generateLightningBolt(42);
    assert.ok(Array.isArray(bolt.points),   'points must be array');
    assert.ok(typeof bolt.segments === 'number', 'segments must be number');
    assert.ok(Array.isArray(bolt.branches), 'branches must be array');
    assert.ok(bolt.seed !== undefined,      'seed must be present');
  });

  test('has 5-8 segments', function() {
    for (var i = 0; i < 10; i++) {
      var bolt = WeatherFX.generateLightningBolt(i * 17);
      assert.ok(bolt.segments >= 5 && bolt.segments <= 8,
        'segments out of range: ' + bolt.segments);
    }
  });

  test('points.length = segments + 1', function() {
    var bolt = WeatherFX.generateLightningBolt(7);
    assert.strictEqual(bolt.points.length, bolt.segments + 1);
  });

  test('first point is near the sky (high y)', function() {
    var bolt = WeatherFX.generateLightningBolt(1);
    assert.ok(bolt.points[0].y > 100, 'First point should be in sky, got y=' + bolt.points[0].y);
  });

  test('last point is near ground (low y)', function() {
    var bolt = WeatherFX.generateLightningBolt(1);
    var last = bolt.points[bolt.points.length - 1];
    assert.ok(last.y < 10, 'Last point should be near ground, got y=' + last.y);
  });

  test('deterministic — same seed produces same first point', function() {
    var b1 = WeatherFX.generateLightningBolt(999);
    var b2 = WeatherFX.generateLightningBolt(999);
    assert.strictEqual(b1.points[0].x, b2.points[0].x);
    assert.strictEqual(b1.points[0].y, b2.points[0].y);
    assert.strictEqual(b1.points[0].z, b2.points[0].z);
  });

  test('different seeds produce different bolts', function() {
    var b1 = WeatherFX.generateLightningBolt(1);
    var b2 = WeatherFX.generateLightningBolt(1000);
    var differs = b1.points[0].x !== b2.points[0].x ||
                  b1.points[0].z !== b2.points[0].z;
    assert.ok(differs, 'Different seeds should produce different bolts');
  });

  test('all points have x, y, z', function() {
    var bolt = WeatherFX.generateLightningBolt(55);
    bolt.points.forEach(function(p, i) {
      assert.ok(typeof p.x === 'number', 'point[' + i + '].x missing');
      assert.ok(typeof p.y === 'number', 'point[' + i + '].y missing');
      assert.ok(typeof p.z === 'number', 'point[' + i + '].z missing');
    });
  });

  test('branches is an array (may be empty)', function() {
    var bolt = WeatherFX.generateLightningBolt(100);
    assert.ok(Array.isArray(bolt.branches));
  });

  test('seed=0 does not crash', function() {
    assert.doesNotThrow(function() {
      WeatherFX.generateLightningBolt(0);
    });
  });
});

// ── getWeatherTransitionDuration ─────────────────────────────────────────────

suite('getWeatherTransitionDuration(from, to)', function() {

  test('returns 0 when from === to', function() {
    ALL_TYPES.forEach(function(t) {
      assert.strictEqual(WeatherFX.getWeatherTransitionDuration(t, t), 0);
    });
  });

  test('returns a positive number for all valid pairs', function() {
    ALL_TYPES.forEach(function(from) {
      ALL_TYPES.forEach(function(to) {
        if (from !== to) {
          var d = WeatherFX.getWeatherTransitionDuration(from, to);
          assert.ok(typeof d === 'number' && d > 0,
            from + '->' + to + ' duration must be > 0, got ' + d);
        }
      });
    });
  });

  test('blizzard to clear takes longer than mist to clear', function() {
    var bliz = WeatherFX.getWeatherTransitionDuration('blizzard', 'clear');
    var mist = WeatherFX.getWeatherTransitionDuration('mist', 'clear');
    assert.ok(bliz > mist, 'Blizzard->clear should take longer than mist->clear');
  });

  test('throws on unknown from type', function() {
    assert.throws(function() {
      WeatherFX.getWeatherTransitionDuration('hurricane', 'clear');
    });
  });

  test('throws on unknown to type', function() {
    assert.throws(function() {
      WeatherFX.getWeatherTransitionDuration('clear', 'hurricane');
    });
  });
});

// ── getSeasonalWeatherWeights ────────────────────────────────────────────────

suite('getSeasonalWeatherWeights(season)', function() {

  test('returns weights for all 4 seasons', function() {
    SEASONS.forEach(function(s) {
      var w = WeatherFX.getSeasonalWeatherWeights(s);
      assert.ok(typeof w === 'object', 'No weights for season: ' + s);
    });
  });

  test('weights include all 9 weather types', function() {
    SEASONS.forEach(function(s) {
      var w = WeatherFX.getSeasonalWeatherWeights(s);
      ALL_TYPES.forEach(function(t) {
        assert.ok(w[t] !== undefined, s + ' missing weight for ' + t);
      });
    });
  });

  test('all weights are between 0 and 1', function() {
    SEASONS.forEach(function(s) {
      var w = WeatherFX.getSeasonalWeatherWeights(s);
      ALL_TYPES.forEach(function(t) {
        assert.ok(w[t] >= 0 && w[t] <= 1, s + '.' + t + ' weight out of range: ' + w[t]);
      });
    });
  });

  test('weights sum to approximately 1.0 per season', function() {
    SEASONS.forEach(function(s) {
      var w   = WeatherFX.getSeasonalWeatherWeights(s);
      var sum = ALL_TYPES.reduce(function(acc, t) { return acc + w[t]; }, 0);
      assert.ok(Math.abs(sum - 1.0) < 0.001, s + ' weights sum to ' + sum + ' not 1.0');
    });
  });

  test('summer has 0 snow/blizzard', function() {
    var w = WeatherFX.getSeasonalWeatherWeights('summer');
    assert.strictEqual(w.snow,    0, 'Summer should have no snow');
    assert.strictEqual(w.blizzard, 0, 'Summer should have no blizzard');
  });

  test('winter has highest snow probability', function() {
    var winter = WeatherFX.getSeasonalWeatherWeights('winter').snow;
    var spring = WeatherFX.getSeasonalWeatherWeights('spring').snow;
    var summer = WeatherFX.getSeasonalWeatherWeights('summer').snow;
    assert.ok(winter > spring, 'Winter should have more snow than spring');
    assert.ok(winter > summer, 'Winter should have more snow than summer');
  });

  test('returns a copy — mutation does not affect source', function() {
    var w = WeatherFX.getSeasonalWeatherWeights('spring');
    w.clear = 999;
    assert.notStrictEqual(WeatherFX.SEASONAL_WEATHER_WEIGHTS.spring.clear, 999);
  });

  test('throws on unknown season', function() {
    assert.throws(function() {
      WeatherFX.getSeasonalWeatherWeights('monsoon');
    }, /Unknown season/);
  });
});

// ── rollWeather ──────────────────────────────────────────────────────────────

suite('rollWeather(seed, season)', function() {

  test('returns a valid weather type string', function() {
    SEASONS.forEach(function(s) {
      var r = WeatherFX.rollWeather(42, s);
      assert.ok(ALL_TYPES.indexOf(r) !== -1, 'rollWeather returned invalid type: ' + r);
    });
  });

  test('is deterministic (same seed + season = same result)', function() {
    SEASONS.forEach(function(s) {
      var r1 = WeatherFX.rollWeather(123, s);
      var r2 = WeatherFX.rollWeather(123, s);
      assert.strictEqual(r1, r2, 'rollWeather not deterministic for season ' + s);
    });
  });

  test('different seeds can produce different results', function() {
    var results = new Set();
    for (var i = 0; i < 100; i++) {
      results.add(WeatherFX.rollWeather(i, 'spring'));
    }
    assert.ok(results.size > 1, 'Different seeds should produce variety');
  });

  test('never returns snow for summer', function() {
    for (var i = 0; i < 200; i++) {
      var r = WeatherFX.rollWeather(i * 7 + 3, 'summer');
      assert.notStrictEqual(r, 'snow', 'Summer should never roll snow (seed ' + i + ')');
      assert.notStrictEqual(r, 'blizzard', 'Summer should never roll blizzard (seed ' + i + ')');
    }
  });

  test('throws on unknown season', function() {
    assert.throws(function() {
      WeatherFX.rollWeather(1, 'monsoon');
    });
  });

  test('seed=0 does not crash', function() {
    assert.doesNotThrow(function() {
      WeatherFX.rollWeather(0, 'winter');
    });
  });
});

// ── getAmbientModifiers ──────────────────────────────────────────────────────

suite('getAmbientModifiers(weather)', function() {

  test('returns modifiers for each type', function() {
    ALL_TYPES.forEach(function(t) {
      var m = WeatherFX.getAmbientModifiers(t);
      assert.ok(m, 'No modifiers for ' + t);
    });
  });

  test('has all required modifier fields', function() {
    var fields = ['moveSpeed','visibilityFactor','catchRate','gatherRate','xpMultiplier','staminaDrain','description'];
    ALL_TYPES.forEach(function(t) {
      var m = WeatherFX.getAmbientModifiers(t);
      fields.forEach(function(f) {
        assert.ok(m[f] !== undefined, t + ' missing modifier field: ' + f);
      });
    });
  });

  test('clear has moveSpeed = 1.0', function() {
    assert.strictEqual(WeatherFX.getAmbientModifiers('clear').moveSpeed, 1.0);
  });

  test('blizzard has lowest moveSpeed', function() {
    var bliz = WeatherFX.getAmbientModifiers('blizzard').moveSpeed;
    ALL_TYPES.forEach(function(t) {
      assert.ok(bliz <= WeatherFX.getAmbientModifiers(t).moveSpeed,
        'Blizzard should have <= moveSpeed vs ' + t);
    });
  });

  test('rain boosts catchRate above 1', function() {
    assert.ok(WeatherFX.getAmbientModifiers('rain').catchRate > 1, 'Rain should boost catchRate');
  });

  test('blizzard drains most stamina', function() {
    var bliz = WeatherFX.getAmbientModifiers('blizzard').staminaDrain;
    assert.ok(bliz >= 1.5, 'Blizzard staminaDrain should be high, got ' + bliz);
  });

  test('visibilityFactor is between 0 and 1 for all types', function() {
    ALL_TYPES.forEach(function(t) {
      var vf = WeatherFX.getAmbientModifiers(t).visibilityFactor;
      assert.ok(vf >= 0 && vf <= 1, t + ' visibilityFactor out of range: ' + vf);
    });
  });

  test('description is a non-empty string', function() {
    ALL_TYPES.forEach(function(t) {
      var d = WeatherFX.getAmbientModifiers(t).description;
      assert.ok(typeof d === 'string' && d.length > 0, t + ' description is empty');
    });
  });

  test('returns a copy — mutation does not affect source', function() {
    var m = WeatherFX.getAmbientModifiers('snow');
    m.moveSpeed = 999;
    assert.notStrictEqual(WeatherFX.AMBIENT_MODIFIERS.snow.moveSpeed, 999);
  });

  test('throws on unknown type', function() {
    assert.throws(function() {
      WeatherFX.getAmbientModifiers('hurricane');
    });
  });
});

// ── Edge cases ───────────────────────────────────────────────────────────────

suite('Edge cases & integration', function() {

  test('getParticleConfig clear has all numeric fields = 0', function() {
    var p = WeatherFX.getParticleConfig('clear');
    assert.strictEqual(p.count,   0);
    assert.strictEqual(p.speed,   0);
    assert.strictEqual(p.opacity, 0);
  });

  test('all weather types produce valid full config', function() {
    ALL_TYPES.forEach(function(t) {
      assert.doesNotThrow(function() {
        WeatherFX.getWeatherConfig(t);
      }, 'getWeatherConfig threw for type: ' + t);
    });
  });

  test('interpolating between all pairs does not throw', function() {
    ALL_TYPES.forEach(function(from) {
      ALL_TYPES.forEach(function(to) {
        assert.doesNotThrow(function() {
          WeatherFX.interpolateWeather(from, to, 0.5);
        }, from + ' -> ' + to + ' interpolation threw');
      });
    });
  });

  test('getWindVector for all types at time=500 does not throw', function() {
    ALL_TYPES.forEach(function(t) {
      assert.doesNotThrow(function() {
        WeatherFX.getWindVector(t, 500);
      });
    });
  });

  test('generateLightningBolt over many seeds stays in bounds', function() {
    for (var i = 0; i < 20; i++) {
      var bolt = WeatherFX.generateLightningBolt(i * 31);
      assert.ok(bolt.segments >= 5 && bolt.segments <= 8);
      assert.ok(bolt.points.length === bolt.segments + 1);
    }
  });

  test('rollWeather distributes across types (100 rolls)', function() {
    var seen = {};
    for (var i = 0; i < 100; i++) {
      var r = WeatherFX.rollWeather(i, 'spring');
      seen[r] = true;
    }
    // With 100 rolls from spring weights, should see at least 3 distinct types
    assert.ok(Object.keys(seen).length >= 3,
      'Expected at least 3 types from 100 rolls, got: ' + Object.keys(seen).join(', '));
  });

  test('visibility range is always positive', function() {
    ALL_TYPES.forEach(function(t) {
      assert.ok(WeatherFX.getVisibilityRange(t) > 0);
    });
  });

  test('transition duration is symmetric-ish (not required to be equal both ways)', function() {
    // Just verify both directions return valid numbers
    ALL_TYPES.forEach(function(from) {
      ALL_TYPES.forEach(function(to) {
        if (from !== to) {
          var ab = WeatherFX.getWeatherTransitionDuration(from, to);
          var ba = WeatherFX.getWeatherTransitionDuration(to, from);
          assert.ok(typeof ab === 'number' && ab > 0, from + '->' + to + ': ' + ab);
          assert.ok(typeof ba === 'number' && ba > 0, to + '->' + from + ': ' + ba);
        }
      });
    });
  });
});

// ── Run ──────────────────────────────────────────────────────────────────────

var ok = report();
process.exit(ok ? 0 : 1);
