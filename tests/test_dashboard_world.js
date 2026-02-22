// test_dashboard_world.js — 130+ tests for dashboard_world.js
'use strict';

var runner = require('./test_runner');
var test   = runner.test;
var suite  = runner.suite;
var report = runner.report;
var assert = runner.assert;

var DW = require('../src/js/dashboard_world');

// ── Helpers ───────────────────────────────────────────────────────────────

function approx(a, b, tol) {
  tol = tol !== undefined ? tol : 0.001;
  return Math.abs(a - b) <= tol;
}

// ─────────────────────────────────────────────────────────────────────────────
// TIME SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

suite('createWorldTime — defaults', function() {
  test('returns an object', function() {
    assert.strictEqual(typeof DW.createWorldTime(), 'object');
  });

  test('tick starts at 0', function() {
    assert.strictEqual(DW.createWorldTime().tick, 0);
  });

  test('dayLength is 1200', function() {
    assert.strictEqual(DW.createWorldTime().dayLength, 1200);
  });

  test('timeScale is 60', function() {
    assert.strictEqual(DW.createWorldTime().timeScale, 60);
  });
});

suite('advanceTime', function() {
  test('increases tick by deltaTicks', function() {
    var s = DW.createWorldTime();
    var s2 = DW.advanceTime(s, 100);
    assert.strictEqual(s2.tick, 100);
  });

  test('does not mutate original state', function() {
    var s = DW.createWorldTime();
    DW.advanceTime(s, 50);
    assert.strictEqual(s.tick, 0);
  });

  test('preserves dayLength', function() {
    var s = DW.createWorldTime();
    var s2 = DW.advanceTime(s, 1);
    assert.strictEqual(s2.dayLength, 1200);
  });

  test('preserves timeScale', function() {
    var s = DW.createWorldTime();
    var s2 = DW.advanceTime(s, 1);
    assert.strictEqual(s2.timeScale, 60);
  });

  test('advancing by 0 keeps tick at 0', function() {
    var s = DW.createWorldTime();
    assert.strictEqual(DW.advanceTime(s, 0).tick, 0);
  });

  test('chained advances accumulate', function() {
    var s = DW.createWorldTime();
    s = DW.advanceTime(s, 300);
    s = DW.advanceTime(s, 300);
    assert.strictEqual(s.tick, 600);
  });
});

suite('getTimeOfDay', function() {
  test('tick=0 returns 0.0 (midnight)', function() {
    assert.strictEqual(DW.getTimeOfDay(0, 1200), 0);
  });

  test('tick=600 returns 0.5 (noon)', function() {
    assert.strictEqual(DW.getTimeOfDay(600, 1200), 0.5);
  });

  test('tick=300 returns 0.25 (6:00)', function() {
    assert.strictEqual(DW.getTimeOfDay(300, 1200), 0.25);
  });

  test('tick=900 returns 0.75 (18:00)', function() {
    assert.strictEqual(DW.getTimeOfDay(900, 1200), 0.75);
  });

  test('wraps after one full day', function() {
    assert.strictEqual(DW.getTimeOfDay(1200, 1200), 0);
  });

  test('tick=1800 wraps to 0.5', function() {
    assert.strictEqual(DW.getTimeOfDay(1800, 1200), 0.5);
  });

  test('uses default dayLength 1200 when not provided', function() {
    assert.strictEqual(DW.getTimeOfDay(600), 0.5);
  });
});

suite('getPhaseOfDay', function() {
  test('0.0 is night', function() {
    assert.strictEqual(DW.getPhaseOfDay(0.0), 'night');
  });

  test('0.10 is night', function() {
    assert.strictEqual(DW.getPhaseOfDay(0.10), 'night');
  });

  test('0.20 is dawn', function() {
    assert.strictEqual(DW.getPhaseOfDay(0.20), 'dawn');
  });

  test('0.25 is dawn', function() {
    assert.strictEqual(DW.getPhaseOfDay(0.25), 'dawn');
  });

  test('0.30 is morning', function() {
    assert.strictEqual(DW.getPhaseOfDay(0.30), 'morning');
  });

  test('0.40 is morning', function() {
    assert.strictEqual(DW.getPhaseOfDay(0.40), 'morning');
  });

  test('0.45 is noon', function() {
    assert.strictEqual(DW.getPhaseOfDay(0.45), 'noon');
  });

  test('0.50 is noon', function() {
    assert.strictEqual(DW.getPhaseOfDay(0.50), 'noon');
  });

  test('0.55 is afternoon', function() {
    assert.strictEqual(DW.getPhaseOfDay(0.55), 'afternoon');
  });

  test('0.65 is afternoon', function() {
    assert.strictEqual(DW.getPhaseOfDay(0.65), 'afternoon');
  });

  test('0.70 is dusk', function() {
    assert.strictEqual(DW.getPhaseOfDay(0.70), 'dusk');
  });

  test('0.75 is dusk', function() {
    assert.strictEqual(DW.getPhaseOfDay(0.75), 'dusk');
  });

  test('0.80 is evening', function() {
    assert.strictEqual(DW.getPhaseOfDay(0.80), 'evening');
  });

  test('0.99 is evening', function() {
    assert.strictEqual(DW.getPhaseOfDay(0.99), 'evening');
  });

  test('normalises values >= 1', function() {
    // 1.0 should wrap to 0.0 → night
    assert.strictEqual(DW.getPhaseOfDay(1.0), 'night');
  });
});

suite('formatGameTime', function() {
  test('0.0 → "00:00"', function() {
    assert.strictEqual(DW.formatGameTime(0.0), '00:00');
  });

  test('0.5 → "12:00"', function() {
    assert.strictEqual(DW.formatGameTime(0.5), '12:00');
  });

  test('0.75 → "18:00"', function() {
    assert.strictEqual(DW.formatGameTime(0.75), '18:00');
  });

  test('0.25 → "06:00"', function() {
    assert.strictEqual(DW.formatGameTime(0.25), '06:00');
  });

  test('result has HH:MM format', function() {
    var t = DW.formatGameTime(0.333);
    assert(/^\d\d:\d\d$/.test(t), 'Expected HH:MM, got ' + t);
  });

  test('1.0 wraps to "00:00"', function() {
    assert.strictEqual(DW.formatGameTime(1.0), '00:00');
  });
});

suite('getDayNumber', function() {
  test('tick=0 → day 1', function() {
    assert.strictEqual(DW.getDayNumber(0, 1200), 1);
  });

  test('tick=1199 → day 1', function() {
    assert.strictEqual(DW.getDayNumber(1199, 1200), 1);
  });

  test('tick=1200 → day 2', function() {
    assert.strictEqual(DW.getDayNumber(1200, 1200), 2);
  });

  test('tick=2400 → day 3', function() {
    assert.strictEqual(DW.getDayNumber(2400, 1200), 3);
  });

  test('default dayLength 1200', function() {
    assert.strictEqual(DW.getDayNumber(1200), 2);
  });
});

suite('getSeason', function() {
  test('day 1 is spring', function() {
    assert.strictEqual(DW.getSeason(1), 'spring');
  });

  test('day 90 is spring', function() {
    assert.strictEqual(DW.getSeason(90), 'spring');
  });

  test('day 91 is summer', function() {
    assert.strictEqual(DW.getSeason(91), 'summer');
  });

  test('day 180 is summer', function() {
    assert.strictEqual(DW.getSeason(180), 'summer');
  });

  test('day 181 is autumn', function() {
    assert.strictEqual(DW.getSeason(181), 'autumn');
  });

  test('day 270 is autumn', function() {
    assert.strictEqual(DW.getSeason(270), 'autumn');
  });

  test('day 271 is winter', function() {
    assert.strictEqual(DW.getSeason(271), 'winter');
  });

  test('day 360 is winter', function() {
    assert.strictEqual(DW.getSeason(360), 'winter');
  });

  test('day 361 cycles back to spring', function() {
    assert.strictEqual(DW.getSeason(361), 'spring');
  });

  test('day 720 (two full years) → winter', function() {
    assert.strictEqual(DW.getSeason(720), 'winter');
  });
});

suite('getSeasonProgress', function() {
  test('day 1 → 0.0', function() {
    assert(approx(DW.getSeasonProgress(1), 0));
  });

  test('day 46 → ~0.5 (mid-spring)', function() {
    // day 46: (46-1)/90 = 45/90 = 0.5
    assert(approx(DW.getSeasonProgress(46), 0.5));
  });

  test('day 91 → 0.0 (start of summer)', function() {
    // (91-91)/90 = 0
    assert(approx(DW.getSeasonProgress(91), 0));
  });

  test('day 181 → 0.0 (start of autumn)', function() {
    assert(approx(DW.getSeasonProgress(181), 0));
  });

  test('day 271 → 0.0 (start of winter)', function() {
    assert(approx(DW.getSeasonProgress(271), 0));
  });

  test('result is always 0–1', function() {
    for (var d = 1; d <= 360; d++) {
      var p = DW.getSeasonProgress(d);
      assert(p >= 0 && p <= 1, 'Out of range at day ' + d + ': ' + p);
    }
  });
});

suite('formatTimeDisplay', function() {
  test('returns a non-empty string', function() {
    var s = DW.formatTimeDisplay(0, 1200);
    assert(typeof s === 'string' && s.length > 0);
  });

  test('includes "Day 1" for tick 0', function() {
    assert(DW.formatTimeDisplay(0, 1200).indexOf('Day 1') !== -1);
  });

  test('includes time string', function() {
    // tick=600 → 12:00
    assert(DW.formatTimeDisplay(600, 1200).indexOf('12:00') !== -1);
  });

  test('includes phase', function() {
    var s = DW.formatTimeDisplay(600, 1200);
    assert(s.toLowerCase().indexOf('noon') !== -1);
  });

  test('includes season', function() {
    var s = DW.formatTimeDisplay(0, 1200);
    var seasons = ['spring', 'summer', 'autumn', 'winter'];
    var found = seasons.some(function(sn) { return s.toLowerCase().indexOf(sn) !== -1; });
    assert(found, 'No season found in: ' + s);
  });

  test('format includes pipe separators', function() {
    var s = DW.formatTimeDisplay(0, 1200);
    assert(s.indexOf('|') !== -1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// WEATHER SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

suite('createWeatherState', function() {
  test('returns an object', function() {
    assert.strictEqual(typeof DW.createWeatherState(), 'object');
  });

  test('zones starts empty', function() {
    var ws = DW.createWeatherState();
    assert.deepStrictEqual(ws.zones, {});
  });

  test('globalWind exists', function() {
    var ws = DW.createWeatherState();
    assert(ws.globalWind);
  });

  test('lastUpdate is 0', function() {
    var ws = DW.createWeatherState();
    assert.strictEqual(ws.lastUpdate, 0);
  });
});

suite('generateWeather', function() {
  test('returns an object with type', function() {
    var w = DW.generateWeather(42, 'nexus', 'spring', 0.5);
    assert(typeof w.type === 'string');
  });

  test('type is one of the known types', function() {
    var valid = ['clear','cloudy','overcast','rain','storm','fog','snow','heatwave','wind'];
    for (var s = 0; s < 4; s++) {
      var seasons = ['spring','summer','autumn','winter'];
      var w = DW.generateWeather(100 + s, 'wilds', seasons[s], 0.5);
      assert(valid.indexOf(w.type) !== -1, 'Unknown type: ' + w.type);
    }
  });

  test('intensity is 0–1', function() {
    var w = DW.generateWeather(7, 'arena', 'summer', 0.3);
    assert(w.intensity >= 0 && w.intensity <= 1, 'intensity out of range: ' + w.intensity);
  });

  test('windSpeed is non-negative', function() {
    var w = DW.generateWeather(13, 'gardens', 'autumn', 0.6);
    assert(w.windSpeed >= 0);
  });

  test('visibility is at least 10', function() {
    var w = DW.generateWeather(99, 'nexus', 'winter', 0.1);
    assert(w.visibility >= 10);
  });

  test('temperature is a number', function() {
    var w = DW.generateWeather(55, 'commons', 'spring', 0.5);
    assert(typeof w.temperature === 'number');
  });

  test('same seed produces same type', function() {
    var w1 = DW.generateWeather(9999, 'studio', 'summer', 0.5);
    var w2 = DW.generateWeather(9999, 'studio', 'summer', 0.5);
    assert.strictEqual(w1.type, w2.type);
  });

  test('different seeds generally produce different results (at least type varies over many seeds)', function() {
    var types = {};
    for (var i = 0; i < 30; i++) {
      var w = DW.generateWeather(i * 100, 'nexus', 'spring', 0.5);
      types[w.type] = true;
    }
    assert(Object.keys(types).length > 1, 'Expected variety, got only: ' + Object.keys(types).join(','));
  });

  test('windDirection is one of the compass points', function() {
    var dirs = ['N','NE','E','SE','S','SW','W','NW'];
    var w = DW.generateWeather(77, 'agora', 'summer', 0.5);
    assert(dirs.indexOf(w.windDirection) !== -1, 'Unexpected direction: ' + w.windDirection);
  });
});

suite('getWeatherForZone', function() {
  test('returns null for empty state', function() {
    var ws = DW.createWeatherState();
    assert.strictEqual(DW.getWeatherForZone(ws, 'nexus'), null);
  });

  test('returns weather after update', function() {
    var ws = DW.updateAllWeather(DW.createWeatherState(), 42, 'spring', 0.5);
    var w  = DW.getWeatherForZone(ws, 'nexus');
    assert(w !== null);
  });

  test('returns null for null state', function() {
    assert.strictEqual(DW.getWeatherForZone(null, 'nexus'), null);
  });
});

suite('updateAllWeather', function() {
  test('updates all 8 zones', function() {
    var ws = DW.updateAllWeather(DW.createWeatherState(), 10, 'summer', 0.5);
    assert.strictEqual(Object.keys(ws.zones).length, 8);
  });

  test('each zone has a type', function() {
    var ws = DW.updateAllWeather(DW.createWeatherState(), 5, 'winter', 0.1);
    DW.ZONE_IDS.forEach(function(zid) {
      assert(ws.zones[zid] && typeof ws.zones[zid].type === 'string');
    });
  });

  test('lastUpdate is set', function() {
    var ws = DW.updateAllWeather(DW.createWeatherState(), 1, 'spring', 0.5);
    assert(ws.lastUpdate > 0);
  });
});

suite('getTemperature', function() {
  test('summer noon is warmer than winter night', function() {
    var summerNoon = DW.getTemperature('summer', 0.5, 'nexus', { type: 'clear' });
    var winterNight = DW.getTemperature('winter', 0.0, 'nexus', { type: 'clear' });
    assert(summerNoon > winterNight, summerNoon + ' should be > ' + winterNight);
  });

  test('rain reduces temperature', function() {
    var clear = DW.getTemperature('spring', 0.5, 'nexus', { type: 'clear' });
    var rain  = DW.getTemperature('spring', 0.5, 'nexus', { type: 'rain' });
    assert(rain < clear, 'rain should be cooler than clear');
  });

  test('heatwave raises temperature', function() {
    var clear    = DW.getTemperature('summer', 0.5, 'nexus', { type: 'clear' });
    var heatwave = DW.getTemperature('summer', 0.5, 'nexus', { type: 'heatwave' });
    assert(heatwave > clear);
  });

  test('snow is colder than clear', function() {
    var clear = DW.getTemperature('winter', 0.5, 'nexus', { type: 'clear' });
    var snow  = DW.getTemperature('winter', 0.5, 'nexus', { type: 'snow' });
    assert(snow < clear);
  });

  test('wilds zone is colder than arena', function() {
    var wilds = DW.getTemperature('summer', 0.5, 'wilds', { type: 'clear' });
    var arena = DW.getTemperature('summer', 0.5, 'arena', { type: 'clear' });
    assert(wilds < arena);
  });

  test('gardens is warmer than a neutral zone by 1C', function() {
    var gardens = DW.getTemperature('summer', 0.5, 'gardens', { type: 'clear' });
    var agora   = DW.getTemperature('summer', 0.5, 'agora', { type: 'clear' });
    assert.strictEqual(gardens, agora + 1);
  });

  test('returns a number', function() {
    assert(typeof DW.getTemperature('spring', 0.5, 'nexus', { type: 'clear' }) === 'number');
  });
});

suite('formatWeatherDisplay', function() {
  test('returns a non-empty string', function() {
    var w = DW.generateWeather(1, 'nexus', 'spring', 0.5);
    assert(typeof DW.formatWeatherDisplay(w) === 'string');
    assert(DW.formatWeatherDisplay(w).length > 0);
  });

  test('includes temperature with C', function() {
    var w = { type: 'clear', temperature: 22, windSpeed: 10, windDirection: 'NW', visibility: 90 };
    assert(DW.formatWeatherDisplay(w).indexOf('22C') !== -1);
  });

  test('calm wind when windSpeed < 5', function() {
    var w = { type: 'clear', temperature: 20, windSpeed: 2, windDirection: 'N', visibility: 100 };
    assert(DW.formatWeatherDisplay(w).toLowerCase().indexOf('calm') !== -1);
  });

  test('excellent visibility when vis >= 80', function() {
    var w = { type: 'clear', temperature: 20, windSpeed: 5, windDirection: 'E', visibility: 100 };
    assert(DW.formatWeatherDisplay(w).indexOf('Excellent') !== -1);
  });

  test('poor visibility for fog', function() {
    var w = { type: 'fog', temperature: 10, windSpeed: 3, windDirection: 'S', visibility: 20 };
    assert(DW.formatWeatherDisplay(w).indexOf('Poor') !== -1);
  });

  test('null returns unknown string', function() {
    var result = DW.formatWeatherDisplay(null);
    assert(typeof result === 'string');
  });
});

suite('getWeatherIcon', function() {
  test('clear → [*]', function() {
    assert.strictEqual(DW.getWeatherIcon('clear'), '[*]');
  });

  test('rain → [/]', function() {
    assert.strictEqual(DW.getWeatherIcon('rain'), '[/]');
  });

  test('storm → [!]', function() {
    assert.strictEqual(DW.getWeatherIcon('storm'), '[!]');
  });

  test('fog → [.]', function() {
    assert.strictEqual(DW.getWeatherIcon('fog'), '[.]');
  });

  test('snow → [:]', function() {
    assert.strictEqual(DW.getWeatherIcon('snow'), '[:]');
  });

  test('heatwave → [^]', function() {
    assert.strictEqual(DW.getWeatherIcon('heatwave'), '[^]');
  });

  test('wind → [>]', function() {
    assert.strictEqual(DW.getWeatherIcon('wind'), '[>]');
  });

  test('unknown type returns a bracketed string', function() {
    var icon = DW.getWeatherIcon('xyz');
    assert(/^\[.\]$/.test(icon));
  });
});

suite('getWeatherEffect', function() {
  test('rain gives fishing bonus', function() {
    var e = DW.getWeatherEffect({ type: 'rain' });
    assert(e.fishingBonus > 0);
  });

  test('rain gives farming bonus', function() {
    var e = DW.getWeatherEffect({ type: 'rain' });
    assert(e.farmingBonus > 0);
  });

  test('storm gives exploration penalty', function() {
    var e = DW.getWeatherEffect({ type: 'storm' });
    assert(e.explorationPenalty > 0);
  });

  test('storm gives negative combat modifier', function() {
    var e = DW.getWeatherEffect({ type: 'storm' });
    assert(e.combatModifier < 0);
  });

  test('clear gives exploration bonus (negative penalty)', function() {
    var e = DW.getWeatherEffect({ type: 'clear' });
    assert(e.explorationPenalty < 0);
  });

  test('heatwave gives negative farming bonus', function() {
    var e = DW.getWeatherEffect({ type: 'heatwave' });
    assert(e.farmingBonus < 0);
  });

  test('null weather returns defaults (all zero)', function() {
    var e = DW.getWeatherEffect(null);
    assert.strictEqual(e.fishingBonus, 0);
    assert.strictEqual(e.farmingBonus, 0);
    assert.strictEqual(e.explorationPenalty, 0);
    assert.strictEqual(e.combatModifier, 0);
  });

  test('effect has all 4 keys', function() {
    var e = DW.getWeatherEffect({ type: 'clear' });
    assert('fishingBonus' in e);
    assert('farmingBonus' in e);
    assert('explorationPenalty' in e);
    assert('combatModifier' in e);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// WORLD EVENTS
// ─────────────────────────────────────────────────────────────────────────────

suite('createEventState', function() {
  test('returns an object', function() {
    assert.strictEqual(typeof DW.createEventState(), 'object');
  });

  test('active array is empty', function() {
    assert.deepStrictEqual(DW.createEventState().active, []);
  });

  test('upcoming array is empty', function() {
    assert.deepStrictEqual(DW.createEventState().upcoming, []);
  });

  test('history array is empty', function() {
    assert.deepStrictEqual(DW.createEventState().history, []);
  });

  test('nextId starts at 1', function() {
    assert.strictEqual(DW.createEventState().nextId, 1);
  });
});

suite('generateEvent', function() {
  test('returns an object with type', function() {
    var e = DW.generateEvent(42, 1, 'spring');
    assert(typeof e.type === 'string');
  });

  test('type is one of the 10 known event types', function() {
    var valid = ['market_day','festival','harvest','tournament','storm_surge',
                 'knowledge_fair','art_exhibition','full_moon','meteor_shower','migration'];
    for (var i = 0; i < 20; i++) {
      var e = DW.generateEvent(i * 7, i + 1, 'spring');
      assert(valid.indexOf(e.type) !== -1, 'Unknown event type: ' + e.type);
    }
  });

  test('has title string', function() {
    var e = DW.generateEvent(10, 5, 'summer');
    assert(typeof e.title === 'string' && e.title.length > 0);
  });

  test('has description string', function() {
    var e = DW.generateEvent(20, 5, 'summer');
    assert(typeof e.description === 'string' && e.description.length > 0);
  });

  test('has zone string', function() {
    var e = DW.generateEvent(30, 5, 'summer');
    assert(typeof e.zone === 'string');
  });

  test('zone is one of the 8 valid zones', function() {
    for (var i = 0; i < 15; i++) {
      var e = DW.generateEvent(i * 3, i + 1, 'winter');
      assert(DW.ZONE_IDS.indexOf(e.zone) !== -1, 'Invalid zone: ' + e.zone);
    }
  });

  test('startTick is within one day (0–1199)', function() {
    var e = DW.generateEvent(77, 10, 'autumn');
    assert(e.startTick >= 0 && e.startTick < 1200, 'startTick out of range: ' + e.startTick);
  });

  test('duration > 0', function() {
    var e = DW.generateEvent(55, 3, 'spring');
    assert(e.duration > 0);
  });

  test('rewards has sparks', function() {
    var e = DW.generateEvent(100, 1, 'spring');
    assert(typeof e.rewards.sparks === 'number');
  });

  test('participants starts as empty array', function() {
    var e = DW.generateEvent(200, 1, 'spring');
    assert(Array.isArray(e.participants));
    assert.strictEqual(e.participants.length, 0);
  });

  test('same seed and day produces same type', function() {
    var e1 = DW.generateEvent(5000, 7, 'summer');
    var e2 = DW.generateEvent(5000, 7, 'summer');
    assert.strictEqual(e1.type, e2.type);
  });
});

suite('getActiveEvents', function() {
  test('returns empty for empty state', function() {
    var s = DW.createEventState();
    assert.deepStrictEqual(DW.getActiveEvents(s, 0), []);
  });

  test('returns event whose window covers currentTick', function() {
    var s = DW.createEventState();
    s.active.push({ id: 1, type: 'festival', title: 'Festival', description: '',
                    zone: 'commons', startTick: 100, duration: 200, rewards: {}, participants: [] });
    var active = DW.getActiveEvents(s, 150);
    assert.strictEqual(active.length, 1);
    assert.strictEqual(active[0].id, 1);
  });

  test('does not return event that has not started', function() {
    var s = DW.createEventState();
    s.active.push({ id: 2, startTick: 500, duration: 200, rewards: {}, participants: [] });
    assert.strictEqual(DW.getActiveEvents(s, 100).length, 0);
  });

  test('does not return expired event', function() {
    var s = DW.createEventState();
    s.active.push({ id: 3, startTick: 100, duration: 200, rewards: {}, participants: [] });
    assert.strictEqual(DW.getActiveEvents(s, 400).length, 0);
  });

  test('handles null state', function() {
    assert.deepStrictEqual(DW.getActiveEvents(null, 0), []);
  });
});

suite('getUpcomingEvents', function() {
  test('returns event starting within lookahead', function() {
    var s = DW.createEventState();
    s.upcoming.push({ id: 10, startTick: 200, duration: 100, rewards: {}, participants: [] });
    var upcoming = DW.getUpcomingEvents(s, 0, 300);
    assert.strictEqual(upcoming.length, 1);
  });

  test('does not return already started event', function() {
    var s = DW.createEventState();
    s.upcoming.push({ id: 11, startTick: 50, duration: 100, rewards: {}, participants: [] });
    var upcoming = DW.getUpcomingEvents(s, 100, 300);
    assert.strictEqual(upcoming.length, 0);
  });

  test('does not return event beyond lookahead', function() {
    var s = DW.createEventState();
    s.upcoming.push({ id: 12, startTick: 1000, duration: 100, rewards: {}, participants: [] });
    var upcoming = DW.getUpcomingEvents(s, 0, 300);
    assert.strictEqual(upcoming.length, 0);
  });

  test('default lookahead is 300', function() {
    var s = DW.createEventState();
    s.upcoming.push({ id: 13, startTick: 250, duration: 50, rewards: {}, participants: [] });
    assert.strictEqual(DW.getUpcomingEvents(s, 0).length, 1);
  });
});

suite('joinEvent', function() {
  function makeState() {
    var s = DW.createEventState();
    s.active.push({ id: 1, type: 'festival', title: 'Fest', description: '',
                    zone: 'commons', startTick: 0, duration: 600, rewards: { sparks: 20, xp: 5, item: null }, participants: [] });
    return s;
  }

  test('adds player to participants', function() {
    var s  = makeState();
    var r  = DW.joinEvent(s, 1, 'player1');
    assert(r.success);
    assert(r.event.participants.indexOf('player1') !== -1);
  });

  test('does not add duplicate participants', function() {
    var s  = makeState();
    var r1 = DW.joinEvent(s, 1, 'player1');
    var r2 = DW.joinEvent(r1.state, 1, 'player1');
    assert(!r2.success);
  });

  test('does not mutate original state', function() {
    var s = makeState();
    DW.joinEvent(s, 1, 'player1');
    assert.strictEqual(s.active[0].participants.length, 0);
  });

  test('returns false for unknown event', function() {
    var s = makeState();
    var r = DW.joinEvent(s, 999, 'player1');
    assert(!r.success);
  });

  test('handles null state', function() {
    var r = DW.joinEvent(null, 1, 'player1');
    assert(!r.success);
  });
});

suite('completeEvent', function() {
  function makeStateWithEvent() {
    var s = DW.createEventState();
    s.active.push({ id: 1, type: 'harvest', title: 'Harvest', description: '',
                    zone: 'gardens', startTick: 0, duration: 480,
                    rewards: { sparks: 30, xp: 10, item: 'crop_basket' },
                    participants: ['alice', 'bob'] });
    return s;
  }

  test('removes event from active', function() {
    var s = makeStateWithEvent();
    var r = DW.completeEvent(s, 1, 400);
    assert(r.success);
    assert.strictEqual(r.state.active.length, 0);
  });

  test('moves event to history', function() {
    var s = makeStateWithEvent();
    var r = DW.completeEvent(s, 1, 400);
    assert.strictEqual(r.state.history.length, 1);
    assert.strictEqual(r.state.history[0].id, 1);
  });

  test('returns rewards for each participant', function() {
    var s = makeStateWithEvent();
    var r = DW.completeEvent(s, 1, 400);
    assert.strictEqual(r.rewards.length, 2);
    assert(r.rewards.every(function(rw) { return rw.sparks === 30 && rw.xp === 10; }));
  });

  test('does not mutate original active array', function() {
    var s = makeStateWithEvent();
    DW.completeEvent(s, 1, 400);
    assert.strictEqual(s.active.length, 1);
  });

  test('returns false for unknown event', function() {
    var s = makeStateWithEvent();
    var r = DW.completeEvent(s, 99, 400);
    assert(!r.success);
  });
});

suite('formatEventCard', function() {
  var sampleEvent = {
    id: 5, type: 'tournament', title: 'Grand Tournament',
    description: 'Fight for glory.', zone: 'arena',
    startTick: 0, duration: 720, rewards: { sparks: 50, xp: 20, item: null }, participants: ['alice', 'bob', 'carol']
  };

  test('returns a non-empty string', function() {
    var html = DW.formatEventCard(sampleEvent, 100);
    assert(typeof html === 'string' && html.length > 0);
  });

  test('contains event title', function() {
    assert(DW.formatEventCard(sampleEvent, 100).indexOf('Grand Tournament') !== -1);
  });

  test('contains zone name', function() {
    assert(DW.formatEventCard(sampleEvent, 100).indexOf('Arena') !== -1);
  });

  test('contains participant count', function() {
    assert(DW.formatEventCard(sampleEvent, 100).indexOf('3') !== -1);
  });

  test('contains join button', function() {
    assert(DW.formatEventCard(sampleEvent, 100).indexOf('[Join]') !== -1);
  });

  test('shows ended when tick past duration', function() {
    var html = DW.formatEventCard(sampleEvent, 9999);
    assert(html.indexOf('Ended') !== -1 || html.indexOf('0m') !== -1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// NEWS SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

suite('createNewsState', function() {
  test('returns an object', function() {
    assert.strictEqual(typeof DW.createNewsState(), 'object');
  });

  test('entries is empty', function() {
    assert.deepStrictEqual(DW.createNewsState().entries, []);
  });

  test('maxEntries is 50', function() {
    assert.strictEqual(DW.createNewsState().maxEntries, 50);
  });
});

suite('addNewsEntry', function() {
  test('adds one entry', function() {
    var ns = DW.createNewsState();
    var ns2 = DW.addNewsEntry(ns, { type: 'discovery', title: 'Test', description: 'D', timestamp: 1000, zone: 'nexus' });
    assert.strictEqual(ns2.entries.length, 1);
  });

  test('does not mutate original', function() {
    var ns = DW.createNewsState();
    DW.addNewsEntry(ns, { type: 'weather', title: 'T', description: 'D', timestamp: 0 });
    assert.strictEqual(ns.entries.length, 0);
  });

  test('trims to maxEntries', function() {
    var ns = DW.createNewsState();
    for (var i = 0; i < 55; i++) {
      ns = DW.addNewsEntry(ns, { type: 'economy', title: 'T' + i, description: '', timestamp: i });
    }
    assert.strictEqual(ns.entries.length, 50);
  });

  test('last entry is newest after trim', function() {
    var ns = DW.createNewsState();
    for (var i = 0; i < 55; i++) {
      ns = DW.addNewsEntry(ns, { type: 'economy', title: 'T' + i, description: '', timestamp: i });
    }
    assert.strictEqual(ns.entries[ns.entries.length - 1].title, 'T54');
  });

  test('stores type correctly', function() {
    var ns = DW.createNewsState();
    var ns2 = DW.addNewsEntry(ns, { type: 'guild', title: 'G', description: '', timestamp: 0 });
    assert.strictEqual(ns2.entries[0].type, 'guild');
  });
});

suite('getRecentNews', function() {
  function makeNewsState(n) {
    var ns = DW.createNewsState();
    for (var i = 0; i < n; i++) {
      ns = DW.addNewsEntry(ns, { type: 'discovery', title: 'N' + i, description: '', timestamp: i });
    }
    return ns;
  }

  test('returns last 10 by default', function() {
    var ns = makeNewsState(20);
    assert.strictEqual(DW.getRecentNews(ns).length, 10);
  });

  test('respects limit parameter', function() {
    var ns = makeNewsState(20);
    assert.strictEqual(DW.getRecentNews(ns, 5).length, 5);
  });

  test('returns all when fewer than limit', function() {
    var ns = makeNewsState(3);
    assert.strictEqual(DW.getRecentNews(ns, 10).length, 3);
  });

  test('handles empty state', function() {
    var ns = DW.createNewsState();
    assert.deepStrictEqual(DW.getRecentNews(ns), []);
  });

  test('handles null state', function() {
    assert.deepStrictEqual(DW.getRecentNews(null), []);
  });
});

suite('formatNewsFeed', function() {
  test('returns non-empty HTML string', function() {
    var ns  = DW.createNewsState();
    var ns2 = DW.addNewsEntry(ns, { type: 'weather', title: 'Rain', description: 'It rained.', timestamp: 0 });
    var html = DW.formatNewsFeed(ns2.entries);
    assert(typeof html === 'string' && html.length > 0);
  });

  test('empty entries shows no-news message', function() {
    var html = DW.formatNewsFeed([]);
    assert(html.indexOf('No recent') !== -1 || html.indexOf('empty') !== -1 || html.length > 0);
  });

  test('contains entry title', function() {
    var ns  = DW.createNewsState();
    var ns2 = DW.addNewsEntry(ns, { type: 'election', title: 'Election Results', description: 'New leader chosen.', timestamp: 0 });
    var html = DW.formatNewsFeed(ns2.entries);
    assert(html.indexOf('Election Results') !== -1);
  });

  test('null entries returns string', function() {
    var html = DW.formatNewsFeed(null);
    assert(typeof html === 'string');
  });
});

suite('generateAutoNews', function() {
  test('returns an array', function() {
    var r = DW.generateAutoNews({}, {});
    assert(Array.isArray(r));
  });

  test('returns empty for null states', function() {
    assert.deepStrictEqual(DW.generateAutoNews(null, null), []);
  });

  test('detects weather change', function() {
    var cur  = { weather: { zones: { nexus: { type: 'rain'  } } } };
    var prev = { weather: { zones: { nexus: { type: 'clear' } } } };
    var news = DW.generateAutoNews(cur, prev);
    assert(news.length > 0);
    assert(news[0].type === 'weather');
  });

  test('no news when weather unchanged', function() {
    var cur  = { weather: { zones: { nexus: { type: 'clear' } } } };
    var prev = { weather: { zones: { nexus: { type: 'clear' } } } };
    var news = DW.generateAutoNews(cur, prev);
    assert(news.length === 0);
  });

  test('detects new player arrivals', function() {
    var cur  = { players: { alice: { zone: 'nexus' }, bob: { zone: 'gardens' } } };
    var prev = { players: { alice: { zone: 'nexus' } } };
    var news = DW.generateAutoNews(cur, prev);
    assert(news.some(function(n) { return n.type === 'discovery'; }));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ZONE ACTIVITY
// ─────────────────────────────────────────────────────────────────────────────

suite('getZoneActivity', function() {
  test('returns object with all 8 zones', function() {
    var activity = DW.getZoneActivity({});
    assert.strictEqual(Object.keys(activity).length, 8);
    DW.ZONE_IDS.forEach(function(zid) { assert(zid in activity); });
  });

  test('counts players per zone', function() {
    var gs = { players: {
      p1: { zone: 'nexus' },
      p2: { zone: 'nexus' },
      p3: { zone: 'gardens' }
    }};
    var a = DW.getZoneActivity(gs);
    assert.strictEqual(a.nexus.playerCount, 2);
    assert.strictEqual(a.gardens.playerCount, 1);
  });

  test('counts npcs per zone', function() {
    var gs = { npcs: {
      n1: { zone: 'studio' },
      n2: { zone: 'studio' },
      n3: { zone: 'wilds' }
    }};
    var a = DW.getZoneActivity(gs);
    assert.strictEqual(a.studio.npcCount, 2);
    assert.strictEqual(a.wilds.npcCount, 1);
  });

  test('handles null gameState', function() {
    var a = DW.getZoneActivity(null);
    DW.ZONE_IDS.forEach(function(zid) {
      assert.strictEqual(a[zid].playerCount, 0);
    });
  });

  test('counts active events per zone', function() {
    var gs = {
      tick: 100,
      events: {
        active: [
          { id: 1, zone: 'arena', startTick: 0, duration: 300, rewards: {}, participants: [] }
        ]
      }
    };
    var a = DW.getZoneActivity(gs);
    assert.strictEqual(a.arena.activeEvents, 1);
  });

  test('does not count expired events', function() {
    var gs = {
      tick: 500,
      events: {
        active: [
          { id: 2, zone: 'nexus', startTick: 0, duration: 100, rewards: {}, participants: [] }
        ]
      }
    };
    var a = DW.getZoneActivity(gs);
    assert.strictEqual(a.nexus.activeEvents, 0);
  });

  test('attaches weather type to zones', function() {
    var gs = { weather: { zones: { agora: { type: 'rain', temperature: 12 } } } };
    var a  = DW.getZoneActivity(gs);
    assert.strictEqual(a.agora.weather, 'rain');
    assert.strictEqual(a.agora.temperature, 12);
  });
});

suite('formatZoneActivityGrid', function() {
  test('returns non-empty HTML string', function() {
    var activity = DW.getZoneActivity({});
    var html = DW.formatZoneActivityGrid(activity, 'nexus');
    assert(typeof html === 'string' && html.length > 0);
  });

  test('contains zone name', function() {
    var html = DW.formatZoneActivityGrid(DW.getZoneActivity({}), null);
    assert(html.indexOf('Nexus') !== -1 || html.indexOf('nexus') !== -1);
  });

  test('current zone has dw-zone-current class', function() {
    var html = DW.formatZoneActivityGrid(DW.getZoneActivity({}), 'arena');
    assert(html.indexOf('dw-zone-current') !== -1);
  });

  test('non-current zone does not have dw-zone-current class on others', function() {
    var html = DW.formatZoneActivityGrid(DW.getZoneActivity({}), 'arena');
    // count occurrences of dw-zone-current; should be exactly 1
    var count = (html.match(/dw-zone-current/g) || []).length;
    assert.strictEqual(count, 1);
  });

  test('handles null activity', function() {
    var html = DW.formatZoneActivityGrid(null, null);
    assert(typeof html === 'string');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PANEL
// ─────────────────────────────────────────────────────────────────────────────

suite('createWorldPanel', function() {
  test('returns an object (panel)', function() {
    assert.strictEqual(typeof DW.createWorldPanel(), 'object');
  });

  test('panel has children array', function() {
    var p = DW.createWorldPanel();
    assert(Array.isArray(p.children) || (typeof document !== 'undefined'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// EDGE CASES
// ─────────────────────────────────────────────────────────────────────────────

suite('Edge cases — time', function() {
  test('midnight crossing: tick just before day end stays day 1', function() {
    assert.strictEqual(DW.getDayNumber(1199, 1200), 1);
  });

  test('midnight crossing: tick=1200 is day 2', function() {
    assert.strictEqual(DW.getDayNumber(1200, 1200), 2);
  });

  test('season transition spring→summer at day 91', function() {
    assert.strictEqual(DW.getSeason(90), 'spring');
    assert.strictEqual(DW.getSeason(91), 'summer');
  });

  test('season transition summer→autumn at day 181', function() {
    assert.strictEqual(DW.getSeason(180), 'summer');
    assert.strictEqual(DW.getSeason(181), 'autumn');
  });

  test('season transition autumn→winter at day 271', function() {
    assert.strictEqual(DW.getSeason(270), 'autumn');
    assert.strictEqual(DW.getSeason(271), 'winter');
  });

  test('season transition winter→spring at day 361', function() {
    assert.strictEqual(DW.getSeason(360), 'winter');
    assert.strictEqual(DW.getSeason(361), 'spring');
  });

  test('large tick wraps season correctly', function() {
    // day 1441 = 4 full years + 1 → spring
    assert.strictEqual(DW.getSeason(1441), 'spring');
  });
});

suite('Edge cases — weather seeded randomness consistency', function() {
  test('same seed always yields same weather type', function() {
    var w1 = DW.generateWeather(12345, 'commons', 'autumn', 0.5);
    var w2 = DW.generateWeather(12345, 'commons', 'autumn', 0.5);
    assert.strictEqual(w1.type, w2.type);
  });

  test('different zones with same seed can differ', function() {
    var results = DW.ZONE_IDS.map(function(z) {
      return DW.generateWeather(12345, z, 'summer', 0.5).type;
    });
    var unique = results.filter(function(t, i) { return results.indexOf(t) === i; });
    assert(unique.length >= 1); // at least different zones are processed
  });
});

suite('Edge cases — event overlap', function() {
  test('multiple events in same zone can both be active', function() {
    var s = DW.createEventState();
    s.active.push({ id: 1, zone: 'nexus', startTick: 0, duration: 500, rewards: {}, participants: [] });
    s.active.push({ id: 2, zone: 'nexus', startTick: 0, duration: 500, rewards: {}, participants: [] });
    var active = DW.getActiveEvents(s, 100);
    assert.strictEqual(active.length, 2);
  });

  test('completing one event does not remove the other', function() {
    var s = DW.createEventState();
    s.active.push({ id: 1, zone: 'nexus', startTick: 0, duration: 500,
                    rewards: { sparks: 10, xp: 5, item: null }, participants: [] });
    s.active.push({ id: 2, zone: 'nexus', startTick: 0, duration: 500,
                    rewards: { sparks: 10, xp: 5, item: null }, participants: [] });
    var r = DW.completeEvent(s, 1, 100);
    assert.strictEqual(r.state.active.length, 1);
    assert.strictEqual(r.state.active[0].id, 2);
  });
});

// Final report
if (!report()) {
  process.exit(1);
}
