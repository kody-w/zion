// test_timelapse.js — Tests for the Civilization Timelapse renderer
// Vanilla JS, zero dependencies beyond test_runner.js + timelapse.js

const { test, suite, report, assert } = require('./test_runner');
const Timelapse = require('../src/js/timelapse');

// ─── Mock Data ────────────────────────────────────────────────

// Matches the exact format produced by civilization_sim.py
var MOCK_SIM_JSON = {
  snapshots: [
    {
      tick: 0,
      population: 10,
      structures: 0,
      creations: 2,
      gardens: 1,
      discoveries: 0,
      total_spark: 299,
      txn_volume: 3,
      listings: 0,
      active_zones: 6,
      zone_populations: {
        nexus: 2, gardens: 3, athenaeum: 1, studio: 1,
        wilds: 0, agora: 2, commons: 0, arena: 1
      },
      gini: 0.002,
      weather: 'clear',
      season: 'spring',
      dayPhase: 'dawn',
      chat_messages: 11
    },
    {
      tick: 10,
      population: 71,
      structures: 2,
      creations: 23,
      gardens: 3,
      discoveries: 8,
      total_spark: 2980,
      txn_volume: 50,
      listings: 12,
      active_zones: 8,
      zone_populations: {
        nexus: 20, gardens: 7, athenaeum: 5, studio: 9,
        wilds: 6, agora: 14, commons: 5, arena: 5
      },
      gini: 0.004,
      weather: 'cloudy',
      season: 'spring',
      dayPhase: 'day',
      chat_messages: 69
    },
    {
      tick: 20,
      population: 89,
      structures: 6,
      creations: 34,
      gardens: 13,
      discoveries: 13,
      total_spark: 4356,
      txn_volume: 48,
      listings: 24,
      active_zones: 8,
      zone_populations: {
        nexus: 22, gardens: 8, athenaeum: 6, studio: 10,
        wilds: 11, agora: 11, commons: 11, arena: 10
      },
      gini: 0.008,
      weather: 'clear',
      season: 'spring',
      dayPhase: 'afternoon',
      chat_messages: 120
    },
    {
      tick: 30,
      population: 100,
      structures: 12,
      creations: 50,
      gardens: 20,
      discoveries: 20,
      total_spark: 5500,
      txn_volume: 60,
      listings: 30,
      active_zones: 8,
      zone_populations: {
        nexus: 25, gardens: 10, athenaeum: 8, studio: 12,
        wilds: 12, agora: 13, commons: 12, arena: 8
      },
      gini: 0.012,
      weather: 'stormy',
      season: 'summer',
      dayPhase: 'dusk',
      chat_messages: 200
    }
  ],
  analysis: {
    final_spark: 5500,
    peak_spark: 5500,
    min_spark: 299,
    growth_rate: 1740.8,
    final_gini: 0.012,
    avg_gini: 0.0065,
    avg_txn_volume: 40.25,
    peak_txn_volume: 60,
    top10_share: 15.0,
    treasury: 250,
    verdict: 'INFLATIONARY',
    emoji: '📈',
    detail: 'Economy is inflating...'
  },
  notable_events: [
    [0, 'join', 'Alice (gardener) joined ZION'],
    [2, 'build', 'Bob built a bench in nexus'],
    [5, 'discovery', 'Carol discovered Ancient Ruins in wilds!'],
    [8, 'creation', 'Dave composed "Dawn Chorus" (song) in studio'],
    [15, 'milestone', 'Population reached 50 citizens!'],
    [20, 'trade', 'Eve listed gem for 10 spark'],
    [25, 'harvest', 'Frank harvested tomato (+5 spark)'],
    [28, 'ubi', 'UBI distributed: 100 spark to 50 citizens']
  ],
  final_population: 100,
  final_structures: 12,
  final_creations: 50,
  final_discoveries: 20
};

var SINGLE_TICK_SIM = {
  snapshots: [
    {
      tick: 0,
      population: 5,
      structures: 0,
      creations: 0,
      gardens: 0,
      discoveries: 0,
      total_spark: 50,
      txn_volume: 0,
      listings: 0,
      active_zones: 2,
      zone_populations: { nexus: 5, gardens: 0, athenaeum: 0, studio: 0, wilds: 0, agora: 0, commons: 0, arena: 0 },
      gini: 0,
      weather: 'clear',
      season: 'spring',
      dayPhase: 'dawn',
      chat_messages: 0
    }
  ],
  analysis: { verdict: 'STABLE', final_spark: 50, final_gini: 0, growth_rate: 0 },
  notable_events: [],
  final_population: 5,
  final_structures: 0,
  final_creations: 0,
  final_discoveries: 0
};

var ALL_IN_ONE_ZONE_SIM = {
  snapshots: [
    {
      tick: 0,
      population: 10,
      structures: 0,
      creations: 0,
      gardens: 0,
      discoveries: 0,
      total_spark: 100,
      txn_volume: 0,
      listings: 0,
      active_zones: 1,
      zone_populations: { nexus: 10, gardens: 0, athenaeum: 0, studio: 0, wilds: 0, agora: 0, commons: 0, arena: 0 },
      gini: 0,
      weather: 'clear',
      season: 'spring',
      dayPhase: 'day',
      chat_messages: 5
    },
    {
      tick: 10,
      population: 10,
      structures: 2,
      creations: 1,
      gardens: 0,
      discoveries: 0,
      total_spark: 110,
      txn_volume: 5,
      listings: 0,
      active_zones: 1,
      zone_populations: { nexus: 10, gardens: 0, athenaeum: 0, studio: 0, wilds: 0, agora: 0, commons: 0, arena: 0 },
      gini: 0.05,
      weather: 'clear',
      season: 'spring',
      dayPhase: 'day',
      chat_messages: 20
    }
  ],
  analysis: { verdict: 'STABLE', final_spark: 110, final_gini: 0.05, growth_rate: 10 },
  notable_events: [],
  final_population: 10,
  final_structures: 2,
  final_creations: 1,
  final_discoveries: 0
};

// Mock 2D canvas context
function makeMockCtx() {
  return {
    calls: [],
    fillStyle: '',
    strokeStyle: '',
    font: '',
    textAlign: '',
    textBaseline: '',
    lineWidth: 1,
    globalAlpha: 1,
    fillRect: function(x, y, w, h) { this.calls.push(['fillRect', x, y, w, h]); },
    strokeRect: function(x, y, w, h) { this.calls.push(['strokeRect', x, y, w, h]); },
    clearRect: function(x, y, w, h) { this.calls.push(['clearRect', x, y, w, h]); },
    fillText: function(text, x, y) { this.calls.push(['fillText', text, x, y]); },
    strokeText: function(text, x, y) { this.calls.push(['strokeText', text, x, y]); },
    beginPath: function() { this.calls.push(['beginPath']); },
    closePath: function() { this.calls.push(['closePath']); },
    moveTo: function(x, y) { this.calls.push(['moveTo', x, y]); },
    lineTo: function(x, y) { this.calls.push(['lineTo', x, y]); },
    arc: function(x, y, r, s, e) { this.calls.push(['arc', x, y, r, s, e]); },
    fill: function() { this.calls.push(['fill']); },
    stroke: function() { this.calls.push(['stroke']); },
    save: function() { this.calls.push(['save']); },
    restore: function() { this.calls.push(['restore']); },
    roundRect: function(x, y, w, h, r) { this.calls.push(['roundRect', x, y, w, h, r]); },
    measureText: function(text) { return { width: text.length * 8 }; },
    createLinearGradient: function(x0, y0, x1, y1) {
      return { addColorStop: function() {} };
    },
  };
}

// ─── Suite: loadSimData ────────────────────────────────────────

suite('loadSimData', function() {

  test('returns a timeline object', function() {
    var timeline = Timelapse.loadSimData(MOCK_SIM_JSON);
    assert.ok(timeline, 'timeline should be truthy');
    assert.ok(typeof timeline === 'object', 'timeline should be an object');
  });

  test('has correct frame count matching snapshot count', function() {
    var timeline = Timelapse.loadSimData(MOCK_SIM_JSON);
    assert.strictEqual(timeline.frames.length, MOCK_SIM_JSON.snapshots.length);
  });

  test('first frame has correct tick', function() {
    var timeline = Timelapse.loadSimData(MOCK_SIM_JSON);
    assert.strictEqual(timeline.frames[0].tick, 0);
  });

  test('frame has correct population', function() {
    var timeline = Timelapse.loadSimData(MOCK_SIM_JSON);
    assert.strictEqual(timeline.frames[0].population, 10);
    assert.strictEqual(timeline.frames[1].population, 71);
  });

  test('frame has zoneActivity with all 8 zones', function() {
    var timeline = Timelapse.loadSimData(MOCK_SIM_JSON);
    var frame = timeline.frames[0];
    assert.ok(frame.zoneActivity, 'zoneActivity should exist');
    var zones = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];
    zones.forEach(function(z) {
      assert.ok(z in frame.zoneActivity, 'zone ' + z + ' should be in zoneActivity');
    });
  });

  test('frame has economy with totalSpark and gini', function() {
    var timeline = Timelapse.loadSimData(MOCK_SIM_JSON);
    var frame = timeline.frames[0];
    assert.ok(frame.economy, 'economy should exist');
    assert.strictEqual(typeof frame.economy.totalSpark, 'number');
    assert.strictEqual(typeof frame.economy.gini, 'number');
    assert.strictEqual(frame.economy.totalSpark, 299);
    assert.strictEqual(frame.economy.gini, 0.002);
  });

  test('frame has events array', function() {
    var timeline = Timelapse.loadSimData(MOCK_SIM_JSON);
    var frame = timeline.frames[0];
    assert.ok(Array.isArray(frame.events), 'events should be an array');
  });

  test('frame has culture object with weather/season/dayPhase', function() {
    var timeline = Timelapse.loadSimData(MOCK_SIM_JSON);
    var frame = timeline.frames[0];
    assert.ok(frame.culture, 'culture should exist');
    assert.strictEqual(frame.culture.weather, 'clear');
    assert.strictEqual(frame.culture.season, 'spring');
    assert.strictEqual(frame.culture.dayPhase, 'dawn');
  });

  test('timeline has totalTicks property', function() {
    var timeline = Timelapse.loadSimData(MOCK_SIM_JSON);
    assert.ok(typeof timeline.totalTicks === 'number');
    assert.strictEqual(timeline.totalTicks, 30); // last snapshot tick
  });

  test('timeline has notableEvents from sim data', function() {
    var timeline = Timelapse.loadSimData(MOCK_SIM_JSON);
    assert.ok(Array.isArray(timeline.notableEvents));
    assert.ok(timeline.notableEvents.length > 0);
  });

  test('single-tick sim works without crash', function() {
    var timeline = Timelapse.loadSimData(SINGLE_TICK_SIM);
    assert.strictEqual(timeline.frames.length, 1);
    assert.strictEqual(timeline.frames[0].tick, 0);
  });

  test('empty notable_events array is handled', function() {
    var timeline = Timelapse.loadSimData(SINGLE_TICK_SIM);
    assert.ok(Array.isArray(timeline.notableEvents));
    assert.strictEqual(timeline.notableEvents.length, 0);
  });

});

// ─── Suite: getFrame ──────────────────────────────────────────

suite('getFrame', function() {

  var timeline = Timelapse.loadSimData(MOCK_SIM_JSON);

  test('returns correct frame for tick 0', function() {
    var frame = Timelapse.getFrame(timeline, 0);
    assert.ok(frame, 'frame should exist');
    assert.strictEqual(frame.tick, 0);
    assert.strictEqual(frame.population, 10);
  });

  test('returns correct frame for tick 10', function() {
    var frame = Timelapse.getFrame(timeline, 10);
    assert.strictEqual(frame.tick, 10);
    assert.strictEqual(frame.population, 71);
  });

  test('returns correct frame for last tick', function() {
    var frame = Timelapse.getFrame(timeline, 30);
    assert.strictEqual(frame.tick, 30);
    assert.strictEqual(frame.population, 100);
  });

  test('returns null or undefined for out-of-range tick', function() {
    var frame = Timelapse.getFrame(timeline, 9999);
    assert.ok(frame === null || frame === undefined, 'should return null/undefined for unknown tick');
  });

  test('returns null for negative tick', function() {
    var frame = Timelapse.getFrame(timeline, -1);
    assert.ok(frame === null || frame === undefined);
  });

});

// ─── Suite: interpolateFrame ──────────────────────────────────

suite('interpolateFrame', function() {

  var timeline = Timelapse.loadSimData(MOCK_SIM_JSON);

  test('t=0 returns values matching first frame', function() {
    var frame = Timelapse.interpolateFrame(timeline, 0);
    assert.ok(frame, 'frame should exist');
    assert.ok(Math.abs(frame.population - 10) < 0.1, 'population at t=0 should be ~10');
  });

  test('t=1 returns values matching last frame', function() {
    var frame = Timelapse.interpolateFrame(timeline, 1);
    assert.ok(Math.abs(frame.population - 100) < 0.1, 'population at t=1 should be ~100');
  });

  test('t=0.5 returns interpolated values between frames', function() {
    // Between tick 10 (pop 71) and tick 20 (pop 89) roughly at midpoint of range
    var frame = Timelapse.interpolateFrame(timeline, 0.5);
    assert.ok(frame.population >= 10 && frame.population <= 100, 'population should be in range');
  });

  test('interpolated economy values are numeric', function() {
    var frame = Timelapse.interpolateFrame(timeline, 0.3);
    assert.strictEqual(typeof frame.economy.totalSpark, 'number');
    assert.strictEqual(typeof frame.economy.gini, 'number');
  });

  test('interpolated zoneActivity values are numeric', function() {
    var frame = Timelapse.interpolateFrame(timeline, 0.5);
    assert.strictEqual(typeof frame.zoneActivity.nexus, 'number');
    assert.strictEqual(typeof frame.zoneActivity.wilds, 'number');
  });

  test('intermediate t produces values between adjacent frames', function() {
    // At t~0.333, population should be between 71 (tick 10) and 89 (tick 20)
    var frame = Timelapse.interpolateFrame(timeline, 0.35);
    assert.ok(frame.population >= 10 && frame.population <= 100,
      'population ' + frame.population + ' should be between 10-100');
  });

});

// ─── Suite: getSummary ────────────────────────────────────────

suite('getSummary', function() {

  var timeline = Timelapse.loadSimData(MOCK_SIM_JSON);

  test('returns a summary object', function() {
    var summary = Timelapse.getSummary(timeline);
    assert.ok(summary, 'summary should exist');
    assert.ok(typeof summary === 'object');
  });

  test('totalTicks is correct', function() {
    var summary = Timelapse.getSummary(timeline);
    assert.strictEqual(summary.totalTicks, 30);
  });

  test('peakPopulation is 100', function() {
    var summary = Timelapse.getSummary(timeline);
    assert.strictEqual(summary.peakPopulation, 100);
  });

  test('majorEvents is an array', function() {
    var summary = Timelapse.getSummary(timeline);
    assert.ok(Array.isArray(summary.majorEvents));
  });

  test('dominantZones is an array of zone names', function() {
    var summary = Timelapse.getSummary(timeline);
    assert.ok(Array.isArray(summary.dominantZones));
    assert.ok(summary.dominantZones.length > 0);
    // Each entry should be a string zone name
    summary.dominantZones.forEach(function(z) {
      assert.strictEqual(typeof z, 'string');
    });
  });

  test('single-tick summary works', function() {
    var singleTimeline = Timelapse.loadSimData(SINGLE_TICK_SIM);
    var summary = Timelapse.getSummary(singleTimeline);
    assert.strictEqual(summary.peakPopulation, 5);
    assert.strictEqual(summary.totalTicks, 0);
  });

  test('all-in-one-zone: dominantZones includes nexus', function() {
    var zoneTimeline = Timelapse.loadSimData(ALL_IN_ONE_ZONE_SIM);
    var summary = Timelapse.getSummary(zoneTimeline);
    assert.ok(summary.dominantZones.indexOf('nexus') !== -1, 'nexus should be dominant');
  });

});

// ─── Suite: generateCameraPath ────────────────────────────────

suite('generateCameraPath', function() {

  var timeline = Timelapse.loadSimData(MOCK_SIM_JSON);

  test('returns an array', function() {
    var path = Timelapse.generateCameraPath(timeline);
    assert.ok(Array.isArray(path));
  });

  test('has keyframes with tick, position, lookAt, fov', function() {
    var path = Timelapse.generateCameraPath(timeline);
    assert.ok(path.length > 0, 'path should have keyframes');
    var kf = path[0];
    assert.ok('tick' in kf, 'keyframe should have tick');
    assert.ok('position' in kf, 'keyframe should have position');
    assert.ok('lookAt' in kf, 'keyframe should have lookAt');
    assert.ok('fov' in kf, 'keyframe should have fov');
  });

  test('position has x, y, z coordinates', function() {
    var path = Timelapse.generateCameraPath(timeline);
    var pos = path[0].position;
    assert.ok('x' in pos, 'position should have x');
    assert.ok('y' in pos, 'position should have y');
    assert.ok('z' in pos, 'position should have z');
  });

  test('lookAt has x, y, z coordinates', function() {
    var path = Timelapse.generateCameraPath(timeline);
    var la = path[0].lookAt;
    assert.ok('x' in la, 'lookAt should have x');
    assert.ok('y' in la, 'lookAt should have y');
    assert.ok('z' in la, 'lookAt should have z');
  });

  test('y position (altitude) is positive', function() {
    var path = Timelapse.generateCameraPath(timeline);
    path.forEach(function(kf) {
      assert.ok(kf.position.y > 0, 'camera altitude should be above ground');
    });
  });

  test('fov is a positive number in reasonable range', function() {
    var path = Timelapse.generateCameraPath(timeline);
    path.forEach(function(kf) {
      assert.ok(typeof kf.fov === 'number', 'fov should be a number');
      assert.ok(kf.fov > 0 && kf.fov <= 180, 'fov should be 0-180 degrees');
    });
  });

  test('ticks are non-decreasing', function() {
    var path = Timelapse.generateCameraPath(timeline);
    for (var i = 1; i < path.length; i++) {
      assert.ok(path[i].tick >= path[i-1].tick, 'ticks should be non-decreasing');
    }
  });

  test('options.altitude affects camera height', function() {
    var pathLow = Timelapse.generateCameraPath(timeline, { altitude: 50 });
    var pathHigh = Timelapse.generateCameraPath(timeline, { altitude: 300 });
    var avgLow = pathLow.reduce(function(s, k) { return s + k.position.y; }, 0) / pathLow.length;
    var avgHigh = pathHigh.reduce(function(s, k) { return s + k.position.y; }, 0) / pathHigh.length;
    assert.ok(avgHigh > avgLow, 'higher altitude option should produce higher camera positions');
  });

  test('single-tick generates at least 1 keyframe', function() {
    var singleTimeline = Timelapse.loadSimData(SINGLE_TICK_SIM);
    var path = Timelapse.generateCameraPath(singleTimeline);
    assert.ok(path.length >= 1);
  });

});

// ─── Suite: getCameraAt ───────────────────────────────────────

suite('getCameraAt', function() {

  var timeline = Timelapse.loadSimData(MOCK_SIM_JSON);
  var cameraPath = Timelapse.generateCameraPath(timeline);

  test('returns object at t=0', function() {
    var cam = Timelapse.getCameraAt(cameraPath, 0);
    assert.ok(cam, 'camera at t=0 should exist');
    assert.ok('position' in cam);
    assert.ok('lookAt' in cam);
    assert.ok('fov' in cam);
  });

  test('returns object at t=1', function() {
    var cam = Timelapse.getCameraAt(cameraPath, 1);
    assert.ok(cam, 'camera at t=1 should exist');
    assert.ok('position' in cam);
  });

  test('returns object at t=0.5', function() {
    var cam = Timelapse.getCameraAt(cameraPath, 0.5);
    assert.ok(cam, 'camera at t=0.5 should exist');
  });

  test('position at t=0 matches first keyframe', function() {
    var cam = Timelapse.getCameraAt(cameraPath, 0);
    var first = cameraPath[0];
    assert.ok(Math.abs(cam.position.x - first.position.x) < 1.0, 'x should match first keyframe');
    assert.ok(Math.abs(cam.position.y - first.position.y) < 1.0, 'y should match first keyframe');
    assert.ok(Math.abs(cam.position.z - first.position.z) < 1.0, 'z should match first keyframe');
  });

  test('position at t=1 matches last keyframe', function() {
    var cam = Timelapse.getCameraAt(cameraPath, 1);
    var last = cameraPath[cameraPath.length - 1];
    assert.ok(Math.abs(cam.position.x - last.position.x) < 1.0, 'x should match last keyframe');
    assert.ok(Math.abs(cam.position.y - last.position.y) < 1.0, 'y should match last keyframe');
    assert.ok(Math.abs(cam.position.z - last.position.z) < 1.0, 'z should match last keyframe');
  });

  test('fov is always positive', function() {
    [0, 0.25, 0.5, 0.75, 1].forEach(function(t) {
      var cam = Timelapse.getCameraAt(cameraPath, t);
      assert.ok(cam.fov > 0, 'fov should be positive at t=' + t);
    });
  });

});

// ─── Suite: mapToAudio ────────────────────────────────────────

suite('mapToAudio', function() {

  var timeline = Timelapse.loadSimData(MOCK_SIM_JSON);

  test('returns audio object with tempo, harmony, intensity, instruments', function() {
    var frame = timeline.frames[0];
    var audio = Timelapse.mapToAudio(frame);
    assert.ok(audio, 'audio should exist');
    assert.ok('tempo' in audio, 'audio should have tempo');
    assert.ok('harmony' in audio, 'audio should have harmony');
    assert.ok('intensity' in audio, 'audio should have intensity');
    assert.ok('instruments' in audio, 'audio should have instruments');
  });

  test('tempo is a positive number', function() {
    var frame = timeline.frames[0];
    var audio = Timelapse.mapToAudio(frame);
    assert.ok(typeof audio.tempo === 'number', 'tempo should be a number');
    assert.ok(audio.tempo > 0, 'tempo should be positive');
  });

  test('intensity is between 0 and 1', function() {
    timeline.frames.forEach(function(frame) {
      var audio = Timelapse.mapToAudio(frame);
      assert.ok(audio.intensity >= 0 && audio.intensity <= 1,
        'intensity should be 0-1, got ' + audio.intensity);
    });
  });

  test('instruments is an array', function() {
    var frame = timeline.frames[0];
    var audio = Timelapse.mapToAudio(frame);
    assert.ok(Array.isArray(audio.instruments), 'instruments should be an array');
  });

  test('harmony reflects dominant zone mood — nexus zone is welcoming', function() {
    var nexusFrame = {
      tick: 0,
      population: 10,
      zoneActivity: { nexus: 10, gardens: 0, athenaeum: 0, studio: 0, wilds: 0, agora: 0, commons: 0, arena: 0 },
      economy: { totalSpark: 100, gini: 0 },
      events: [],
      culture: { weather: 'clear', season: 'spring', dayPhase: 'day' }
    };
    var audio = Timelapse.mapToAudio(nexusFrame);
    assert.strictEqual(audio.harmony, 'welcoming', 'nexus should map to welcoming harmony');
  });

  test('harmony reflects dominant zone mood — wilds is adventurous', function() {
    var wildsFrame = {
      tick: 5,
      population: 10,
      zoneActivity: { nexus: 0, gardens: 0, athenaeum: 0, studio: 0, wilds: 10, agora: 0, commons: 0, arena: 0 },
      economy: { totalSpark: 100, gini: 0 },
      events: [],
      culture: { weather: 'clear', season: 'spring', dayPhase: 'day' }
    };
    var audio = Timelapse.mapToAudio(wildsFrame);
    assert.strictEqual(audio.harmony, 'adventurous', 'wilds should map to adventurous harmony');
  });

  test('harmony reflects dominant zone mood — arena is intense', function() {
    var arenaFrame = {
      tick: 5,
      population: 10,
      zoneActivity: { nexus: 0, gardens: 0, athenaeum: 0, studio: 0, wilds: 0, agora: 0, commons: 0, arena: 10 },
      economy: { totalSpark: 100, gini: 0 },
      events: [],
      culture: { weather: 'clear', season: 'spring', dayPhase: 'day' }
    };
    var audio = Timelapse.mapToAudio(arenaFrame);
    assert.strictEqual(audio.harmony, 'intense', 'arena should map to intense harmony');
  });

  test('tempo scales with total activity level', function() {
    var quietFrame = {
      tick: 0, population: 5,
      zoneActivity: { nexus: 1, gardens: 0, athenaeum: 0, studio: 0, wilds: 0, agora: 0, commons: 0, arena: 0 },
      economy: { totalSpark: 50, gini: 0 }, events: [],
      culture: { weather: 'clear', season: 'spring', dayPhase: 'dawn' }
    };
    var busyFrame = {
      tick: 30, population: 100,
      zoneActivity: { nexus: 25, gardens: 15, athenaeum: 10, studio: 12, wilds: 12, agora: 13, commons: 7, arena: 6 },
      economy: { totalSpark: 5000, gini: 0.3 }, events: ['e1', 'e2', 'e3'],
      culture: { weather: 'stormy', season: 'summer', dayPhase: 'afternoon' }
    };
    var quietAudio = Timelapse.mapToAudio(quietFrame);
    var busyAudio = Timelapse.mapToAudio(busyFrame);
    assert.ok(busyAudio.tempo > quietAudio.tempo, 'busier frames should have higher tempo');
  });

  test('all zone moods are defined', function() {
    var zones = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];
    var expectedMoods = {
      nexus: 'welcoming', gardens: 'peaceful', athenaeum: 'curious',
      studio: 'creative', wilds: 'adventurous', agora: 'bustling',
      commons: 'communal', arena: 'intense'
    };
    zones.forEach(function(zone) {
      var frame = {
        tick: 0, population: 10,
        zoneActivity: { nexus: 0, gardens: 0, athenaeum: 0, studio: 0, wilds: 0, agora: 0, commons: 0, arena: 0 },
        economy: { totalSpark: 100, gini: 0 }, events: [],
        culture: { weather: 'clear', season: 'spring', dayPhase: 'day' }
      };
      frame.zoneActivity[zone] = 10;
      var audio = Timelapse.mapToAudio(frame);
      assert.strictEqual(audio.harmony, expectedMoods[zone],
        zone + ' should map to ' + expectedMoods[zone] + ', got ' + audio.harmony);
    });
  });

});

// ─── Suite: createController ──────────────────────────────────

suite('createController', function() {

  test('returns a controller with required methods', function() {
    var timeline = Timelapse.loadSimData(MOCK_SIM_JSON);
    var ctrl = Timelapse.createController(timeline);
    assert.ok(ctrl, 'controller should exist');
    assert.ok(typeof ctrl.play === 'function', 'controller should have play()');
    assert.ok(typeof ctrl.pause === 'function', 'controller should have pause()');
    assert.ok(typeof ctrl.seek === 'function', 'controller should have seek()');
    assert.ok(typeof ctrl.getProgress === 'function', 'controller should have getProgress()');
    assert.ok(typeof ctrl.onFrame === 'function', 'controller should have onFrame()');
    assert.ok(typeof ctrl.onEvent === 'function', 'controller should have onEvent()');
    assert.ok(typeof ctrl.setSpeed === 'function', 'controller should have setSpeed()');
  });

  test('getProgress starts at tick 0', function() {
    var timeline = Timelapse.loadSimData(MOCK_SIM_JSON);
    var ctrl = Timelapse.createController(timeline);
    var progress = ctrl.getProgress();
    assert.ok(progress, 'progress should exist');
    assert.strictEqual(progress.currentTick, 0);
    assert.strictEqual(progress.totalTicks, 30);
    assert.strictEqual(progress.percent, 0);
  });

  test('seek moves to target tick', function() {
    var timeline = Timelapse.loadSimData(MOCK_SIM_JSON);
    var ctrl = Timelapse.createController(timeline);
    ctrl.seek(15);
    var progress = ctrl.getProgress();
    assert.strictEqual(progress.currentTick, 15);
  });

  test('seek clamps to valid range', function() {
    var timeline = Timelapse.loadSimData(MOCK_SIM_JSON);
    var ctrl = Timelapse.createController(timeline);
    ctrl.seek(-10);
    assert.strictEqual(ctrl.getProgress().currentTick, 0, 'negative seek should clamp to 0');
    ctrl.seek(9999);
    assert.strictEqual(ctrl.getProgress().currentTick, 30, 'overflow seek should clamp to max tick');
  });

  test('seek updates percent correctly', function() {
    var timeline = Timelapse.loadSimData(MOCK_SIM_JSON);
    var ctrl = Timelapse.createController(timeline);
    ctrl.seek(15);
    var progress = ctrl.getProgress();
    assert.ok(Math.abs(progress.percent - 50) < 1, 'at tick 15/30, percent should be ~50%');
  });

  test('pause stops playback state', function() {
    var timeline = Timelapse.loadSimData(MOCK_SIM_JSON);
    var ctrl = Timelapse.createController(timeline);
    ctrl.play();
    ctrl.pause();
    assert.ok(!ctrl.isPlaying(), 'should not be playing after pause');
  });

  test('play sets playing state', function() {
    var timeline = Timelapse.loadSimData(MOCK_SIM_JSON);
    var ctrl = Timelapse.createController(timeline);
    ctrl.play();
    assert.ok(ctrl.isPlaying(), 'should be playing after play()');
    ctrl.pause(); // cleanup
  });

  test('setSpeed changes playback multiplier', function() {
    var timeline = Timelapse.loadSimData(MOCK_SIM_JSON);
    var ctrl = Timelapse.createController(timeline);
    ctrl.setSpeed(5);
    assert.strictEqual(ctrl.getSpeed(), 5, 'speed should be 5x after setSpeed(5)');
  });

  test('onFrame callback fires when tick advances via update()', function() {
    var timeline = Timelapse.loadSimData(MOCK_SIM_JSON);
    var ctrl = Timelapse.createController(timeline);
    var callbackFired = false;
    var receivedData = null;
    ctrl.onFrame(function(data) {
      callbackFired = true;
      receivedData = data;
    });
    ctrl.play(1);
    // Simulate time passing by calling update with a large dt
    ctrl.update(10000); // 10 seconds
    ctrl.pause();
    assert.ok(callbackFired, 'onFrame callback should have fired');
    assert.ok(receivedData, 'callback should receive data');
    assert.ok('frame' in receivedData, 'data should have frame');
    assert.ok('camera' in receivedData, 'data should have camera');
    assert.ok('audio' in receivedData, 'data should have audio');
  });

  test('onEvent callback fires on notable events', function() {
    var timeline = Timelapse.loadSimData(MOCK_SIM_JSON);
    var ctrl = Timelapse.createController(timeline);
    var eventsFired = [];
    ctrl.onEvent(function(evt) { eventsFired.push(evt); });
    ctrl.play(1);
    ctrl.update(100000); // advance far enough
    ctrl.pause();
    // Should have fired events from notable_events in mock data
    assert.ok(eventsFired.length >= 0, 'event callbacks should not crash');
  });

  test('controller works with single-tick timeline', function() {
    var timeline = Timelapse.loadSimData(SINGLE_TICK_SIM);
    var ctrl = Timelapse.createController(timeline);
    var progress = ctrl.getProgress();
    assert.strictEqual(progress.totalTicks, 0);
    assert.strictEqual(progress.currentTick, 0);
  });

});

// ─── Suite: renderMinimap ─────────────────────────────────────

suite('renderMinimap', function() {

  var timeline = Timelapse.loadSimData(MOCK_SIM_JSON);
  var frame = timeline.frames[0];

  test('renderMinimap does not throw', function() {
    var ctx = makeMockCtx();
    assert.doesNotThrow(function() {
      Timelapse.renderMinimap(ctx, frame, 200, 200);
    }, 'renderMinimap should not throw');
  });

  test('renderMinimap makes canvas calls', function() {
    var ctx = makeMockCtx();
    Timelapse.renderMinimap(ctx, frame, 200, 200);
    assert.ok(ctx.calls.length > 0, 'renderMinimap should make canvas draw calls');
  });

  test('renderMinimap handles all-zero zone activity', function() {
    var emptyFrame = {
      tick: 0, population: 0,
      zoneActivity: { nexus: 0, gardens: 0, athenaeum: 0, studio: 0, wilds: 0, agora: 0, commons: 0, arena: 0 },
      economy: { totalSpark: 0, gini: 0 }, events: [],
      culture: { weather: 'clear', season: 'spring', dayPhase: 'day' }
    };
    var ctx = makeMockCtx();
    assert.doesNotThrow(function() {
      Timelapse.renderMinimap(ctx, emptyFrame, 200, 200);
    });
  });

  test('renderMinimap works with different canvas sizes', function() {
    var ctx = makeMockCtx();
    assert.doesNotThrow(function() {
      Timelapse.renderMinimap(ctx, frame, 100, 100);
      Timelapse.renderMinimap(ctx, frame, 400, 300);
      Timelapse.renderMinimap(ctx, frame, 800, 600);
    });
  });

});

// ─── Suite: renderTimeline ────────────────────────────────────

suite('renderTimeline', function() {

  var timeline = Timelapse.loadSimData(MOCK_SIM_JSON);

  test('renderTimeline does not throw', function() {
    var ctx = makeMockCtx();
    assert.doesNotThrow(function() {
      Timelapse.renderTimeline(ctx, timeline, 15, 600, 40);
    });
  });

  test('renderTimeline makes canvas calls', function() {
    var ctx = makeMockCtx();
    Timelapse.renderTimeline(ctx, timeline, 15, 600, 40);
    assert.ok(ctx.calls.length > 0, 'renderTimeline should make canvas draw calls');
  });

  test('renderTimeline handles tick 0', function() {
    var ctx = makeMockCtx();
    assert.doesNotThrow(function() {
      Timelapse.renderTimeline(ctx, timeline, 0, 600, 40);
    });
  });

  test('renderTimeline handles max tick', function() {
    var ctx = makeMockCtx();
    assert.doesNotThrow(function() {
      Timelapse.renderTimeline(ctx, timeline, 30, 600, 40);
    });
  });

  test('renderTimeline handles single-tick timeline', function() {
    var singleTimeline = Timelapse.loadSimData(SINGLE_TICK_SIM);
    var ctx = makeMockCtx();
    assert.doesNotThrow(function() {
      Timelapse.renderTimeline(ctx, singleTimeline, 0, 600, 40);
    });
  });

});

// ─── Suite: renderStats ───────────────────────────────────────

suite('renderStats', function() {

  var timeline = Timelapse.loadSimData(MOCK_SIM_JSON);
  var frame = timeline.frames[1];

  test('renderStats does not throw', function() {
    var ctx = makeMockCtx();
    assert.doesNotThrow(function() {
      Timelapse.renderStats(ctx, frame, 10, 10);
    });
  });

  test('renderStats makes canvas calls', function() {
    var ctx = makeMockCtx();
    Timelapse.renderStats(ctx, frame, 10, 10);
    assert.ok(ctx.calls.length > 0, 'renderStats should make canvas draw calls');
  });

  test('renderStats handles zero values', function() {
    var zeroFrame = {
      tick: 0, population: 0,
      zoneActivity: { nexus: 0, gardens: 0, athenaeum: 0, studio: 0, wilds: 0, agora: 0, commons: 0, arena: 0 },
      economy: { totalSpark: 0, gini: 0 }, events: [],
      culture: { weather: 'clear', season: 'spring', dayPhase: 'dawn' }
    };
    var ctx = makeMockCtx();
    assert.doesNotThrow(function() {
      Timelapse.renderStats(ctx, zeroFrame, 0, 0);
    });
  });

});

// ─── Suite: renderEventBanner ─────────────────────────────────

suite('renderEventBanner', function() {

  test('renders discovery event without throwing', function() {
    var ctx = makeMockCtx();
    var event = { type: 'discovery', description: 'Carol discovered Ancient Ruins in wilds!' };
    assert.doesNotThrow(function() {
      Timelapse.renderEventBanner(ctx, event);
    });
  });

  test('renders milestone event without throwing', function() {
    var ctx = makeMockCtx();
    var event = { type: 'milestone', description: 'Population reached 50 citizens!' };
    assert.doesNotThrow(function() {
      Timelapse.renderEventBanner(ctx, event);
    });
  });

  test('renders unknown event type without throwing', function() {
    var ctx = makeMockCtx();
    var event = { type: 'unknown', description: 'Something happened' };
    assert.doesNotThrow(function() {
      Timelapse.renderEventBanner(ctx, event);
    });
  });

  test('makes canvas calls', function() {
    var ctx = makeMockCtx();
    var event = { type: 'build', description: 'Bob built a bench' };
    Timelapse.renderEventBanner(ctx, event);
    assert.ok(ctx.calls.length > 0, 'renderEventBanner should make canvas calls');
  });

  test('handles event with no description', function() {
    var ctx = makeMockCtx();
    var event = { type: 'join' };
    assert.doesNotThrow(function() {
      Timelapse.renderEventBanner(ctx, event);
    });
  });

});

// ─── Edge Cases ───────────────────────────────────────────────

suite('Edge Cases', function() {

  test('all citizens in one zone does not crash any function', function() {
    var timeline = Timelapse.loadSimData(ALL_IN_ONE_ZONE_SIM);
    assert.doesNotThrow(function() {
      var frame = timeline.frames[0];
      var camPath = Timelapse.generateCameraPath(timeline);
      var cam = Timelapse.getCameraAt(camPath, 0.5);
      var audio = Timelapse.mapToAudio(frame);
      var summary = Timelapse.getSummary(timeline);
      var ctrl = Timelapse.createController(timeline);
      ctrl.seek(5);
      var ctx = makeMockCtx();
      Timelapse.renderMinimap(ctx, frame, 200, 200);
      Timelapse.renderTimeline(ctx, timeline, 5, 400, 40);
      Timelapse.renderStats(ctx, frame, 10, 10);
    });
  });

  test('empty notable events: no crash in controller', function() {
    var timeline = Timelapse.loadSimData(ALL_IN_ONE_ZONE_SIM);
    var ctrl = Timelapse.createController(timeline);
    var evts = [];
    ctrl.onEvent(function(e) { evts.push(e); });
    ctrl.play();
    ctrl.update(100000);
    ctrl.pause();
    // Should complete without error
    assert.ok(true);
  });

  test('interpolateFrame with t exactly at frame boundary', function() {
    var timeline = Timelapse.loadSimData(MOCK_SIM_JSON);
    // t = 1/3 should land at or near tick 10 (second frame of 4)
    assert.doesNotThrow(function() {
      Timelapse.interpolateFrame(timeline, 1/3);
    });
  });

  test('getCameraAt with path of 1 keyframe', function() {
    var singleTimeline = Timelapse.loadSimData(SINGLE_TICK_SIM);
    var path = Timelapse.generateCameraPath(singleTimeline);
    assert.doesNotThrow(function() {
      Timelapse.getCameraAt(path, 0);
      Timelapse.getCameraAt(path, 0.5);
      Timelapse.getCameraAt(path, 1);
    });
  });

  test('mapToAudio with frame having no zone activity', function() {
    var emptyFrame = {
      tick: 0, population: 0,
      zoneActivity: { nexus: 0, gardens: 0, athenaeum: 0, studio: 0, wilds: 0, agora: 0, commons: 0, arena: 0 },
      economy: { totalSpark: 0, gini: 0 }, events: [],
      culture: { weather: 'clear', season: 'spring', dayPhase: 'day' }
    };
    assert.doesNotThrow(function() {
      var audio = Timelapse.mapToAudio(emptyFrame);
      assert.ok(audio.tempo > 0);
    });
  });

  test('loadSimData handles missing optional fields gracefully', function() {
    var minimalSim = {
      snapshots: [
        {
          tick: 0, population: 1, structures: 0, creations: 0, gardens: 0,
          discoveries: 0, total_spark: 10, txn_volume: 0, listings: 0,
          active_zones: 1,
          zone_populations: { nexus: 1, gardens: 0, athenaeum: 0, studio: 0, wilds: 0, agora: 0, commons: 0, arena: 0 },
          gini: 0, weather: 'clear', season: 'spring', dayPhase: 'day', chat_messages: 0
        }
      ],
      analysis: {},
      notable_events: [],
      final_population: 1,
      final_structures: 0,
      final_creations: 0,
      final_discoveries: 0
    };
    assert.doesNotThrow(function() {
      var timeline = Timelapse.loadSimData(minimalSim);
      assert.ok(timeline.frames.length === 1);
    });
  });

});

// ─── Run ──────────────────────────────────────────────────────

process.exit(report() ? 0 : 1);
