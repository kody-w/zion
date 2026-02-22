// test_radio_station.js — 120+ tests for RadioStation module
'use strict';
var RadioStation = require('../src/js/radio_station');

// ── Test runner ──────────────────────────────────────────────────────────────

var passed = 0;
var failed = 0;
var errors = [];

function assert(condition, msg) {
  if (!condition) {
    throw new Error(msg || 'Assertion failed');
  }
}

function assertEqual(a, b, msg) {
  if (a !== b) {
    throw new Error((msg || 'assertEqual') + ' — expected ' + JSON.stringify(b) + ' got ' + JSON.stringify(a));
  }
}

function test(name, fn) {
  try {
    fn();
    passed++;
    process.stdout.write('  PASS ' + name + '\n');
  } catch (e) {
    failed++;
    errors.push({ name: name, error: e });
    process.stdout.write('  FAIL ' + name + '\n    ' + e.message + '\n');
  }
}

function suite(name, fn) {
  console.log('\n' + name);
  fn();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeState() {
  return RadioStation.createState();
}

// Start a live broadcast and return {state, bc}
function goLive(zone, broadcasterId, type, title, duration, tick) {
  var state = makeState();
  var res = RadioStation.startBroadcast(state, broadcasterId || 'host1', zone || 'nexus', type || 'music', title || 'Test Show', 'desc', duration || 20, tick || 1000);
  return { state: state, result: res, bc: res.broadcast };
}

// ── BROADCAST_TYPES ───────────────────────────────────────────────────────────

suite('BROADCAST_TYPES — data structure', function() {
  test('getBroadcastTypes returns an array', function() {
    var types = RadioStation.getBroadcastTypes();
    assert(Array.isArray(types), 'should be array');
  });

  test('has exactly 6 broadcast types', function() {
    var types = RadioStation.getBroadcastTypes();
    assertEqual(types.length, 6, 'length');
  });

  test('each type has required fields: id, name, minDuration, maxDuration, sparkPerListener', function() {
    var types = RadioStation.getBroadcastTypes();
    var required = ['id', 'name', 'minDuration', 'maxDuration', 'sparkPerListener'];
    types.forEach(function(t) {
      required.forEach(function(field) {
        assert(t[field] !== undefined, 'type ' + t.id + ' missing field: ' + field);
      });
    });
  });

  test('music type has correct sparkPerListener=2', function() {
    var types = RadioStation.getBroadcastTypes();
    var music = null;
    for (var i = 0; i < types.length; i++) { if (types[i].id === 'music') { music = types[i]; break; } }
    assert(music !== null, 'music type exists');
    assertEqual(music.sparkPerListener, 2, 'music.sparkPerListener');
  });

  test('poetry type has sparkPerListener=3', function() {
    var types = RadioStation.getBroadcastTypes();
    var t = null;
    for (var i = 0; i < types.length; i++) { if (types[i].id === 'poetry') { t = types[i]; break; } }
    assert(t !== null, 'poetry type exists');
    assertEqual(t.sparkPerListener, 3, 'poetry.sparkPerListener');
  });

  test('interview type has sparkPerListener=4', function() {
    var types = RadioStation.getBroadcastTypes();
    var t = null;
    for (var i = 0; i < types.length; i++) { if (types[i].id === 'interview') { t = types[i]; break; } }
    assert(t !== null, 'interview type exists');
    assertEqual(t.sparkPerListener, 4, 'interview.sparkPerListener');
  });

  test('ambient type has maxDuration=300', function() {
    var types = RadioStation.getBroadcastTypes();
    var t = null;
    for (var i = 0; i < types.length; i++) { if (types[i].id === 'ambient') { t = types[i]; break; } }
    assert(t !== null, 'ambient type exists');
    assertEqual(t.maxDuration, 300, 'ambient.maxDuration');
  });

  test('getBroadcastTypes returns a copy (mutation-safe)', function() {
    var t1 = RadioStation.getBroadcastTypes();
    t1.push({ id: 'fake' });
    var t2 = RadioStation.getBroadcastTypes();
    assertEqual(t2.length, 6, 'should still be 6 after external mutation');
  });
});

// ── createState ───────────────────────────────────────────────────────────────

suite('createState — initial state', function() {
  test('returns object with stations property', function() {
    var state = makeState();
    assert(state && typeof state === 'object', 'state is object');
    assert(state.stations && typeof state.stations === 'object', 'state.stations exists');
  });

  test('creates exactly 8 zone stations', function() {
    var state = makeState();
    var count = Object.keys(state.stations).length;
    assertEqual(count, 8, 'station count');
  });

  test('all 8 zone names are present', function() {
    var state = makeState();
    var zones = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];
    zones.forEach(function(z) {
      assert(state.stations[z] !== undefined, 'zone ' + z + ' station missing');
    });
  });

  test('each station has id matching radio_{zone}', function() {
    var state = makeState();
    for (var z in state.stations) {
      assertEqual(state.stations[z].id, 'radio_' + z, 'station id for ' + z);
    }
  });

  test('each station starts with no current broadcast', function() {
    var state = makeState();
    for (var z in state.stations) {
      assert(state.stations[z].currentBroadcast === null, z + ' should have no current broadcast');
    }
  });

  test('each station starts with empty queue', function() {
    var state = makeState();
    for (var z in state.stations) {
      assert(Array.isArray(state.stations[z].queue), z + ' queue should be array');
      assertEqual(state.stations[z].queue.length, 0, z + ' queue empty');
    }
  });

  test('each station starts with empty listeners', function() {
    var state = makeState();
    for (var z in state.stations) {
      assert(Array.isArray(state.stations[z].listeners), z + ' listeners should be array');
      assertEqual(state.stations[z].listeners.length, 0, z + ' listeners empty');
    }
  });

  test('each station name follows {Zone} Radio pattern', function() {
    var state = makeState();
    var station = state.stations['nexus'];
    assertEqual(station.name, 'Nexus Radio', 'nexus station name');
  });

  test('broadcasts object starts empty', function() {
    var state = makeState();
    assert(state.broadcasts && typeof state.broadcasts === 'object', 'broadcasts property exists');
    assertEqual(Object.keys(state.broadcasts).length, 0, 'empty broadcasts');
  });
});

// ── startBroadcast ────────────────────────────────────────────────────────────

suite('startBroadcast — go live', function() {
  test('successful start returns success=true', function() {
    var r = goLive('nexus', 'host1', 'music', 'Jazz Night', 20, 1000);
    assert(r.result.success, 'should succeed');
  });

  test('returned broadcast has correct fields', function() {
    var r = goLive('nexus', 'host1', 'music', 'Jazz Night', 20, 1000);
    var bc = r.bc;
    assert(bc !== null, 'broadcast should not be null');
    assertEqual(bc.type, 'music', 'bc.type');
    assertEqual(bc.title, 'Jazz Night', 'bc.title');
    assertEqual(bc.broadcasterId, 'host1', 'bc.broadcasterId');
    assertEqual(bc.status, 'live', 'bc.status');
    assertEqual(bc.startTick, 1000, 'bc.startTick');
    assertEqual(bc.endTick, 1020, 'bc.endTick');
  });

  test('station currentBroadcast set after start', function() {
    var r = goLive('nexus');
    var station = RadioStation.getStation(r.state, 'nexus');
    assertEqual(station.currentBroadcast, r.bc.id, 'station.currentBroadcast');
  });

  test('station totalBroadcasts incremented', function() {
    var r = goLive('nexus');
    var station = RadioStation.getStation(r.state, 'nexus');
    assertEqual(station.totalBroadcasts, 1, 'totalBroadcasts after 1 start');
  });

  test('fails when station already broadcasting', function() {
    var r = goLive('nexus');
    var res2 = RadioStation.startBroadcast(r.state, 'host2', 'nexus', 'music', 'Show 2', '', 20, 1010);
    assert(!res2.success, 'should fail when already live');
    assert(res2.reason.length > 0, 'reason should be non-empty');
  });

  test('fails with unknown zone', function() {
    var state = makeState();
    var res = RadioStation.startBroadcast(state, 'host1', 'unknown_zone', 'music', 'Show', '', 20, 1000);
    assert(!res.success, 'should fail');
  });

  test('fails with unknown broadcast type', function() {
    var state = makeState();
    var res = RadioStation.startBroadcast(state, 'host1', 'nexus', 'disco', 'Show', '', 20, 1000);
    assert(!res.success, 'should fail');
  });

  test('fails when duration below minDuration', function() {
    var state = makeState();
    var res = RadioStation.startBroadcast(state, 'host1', 'nexus', 'music', 'Show', '', 2, 1000);
    assert(!res.success, 'should fail for duration below min');
  });

  test('fails when duration above maxDuration', function() {
    var state = makeState();
    var res = RadioStation.startBroadcast(state, 'host1', 'nexus', 'music', 'Show', '', 200, 1000);
    assert(!res.success, 'should fail for duration above max');
  });

  test('fails without broadcasterId', function() {
    var state = makeState();
    var res = RadioStation.startBroadcast(state, '', 'nexus', 'music', 'Show', '', 20, 1000);
    assert(!res.success, 'should fail without broadcasterId');
  });

  test('fails without title', function() {
    var state = makeState();
    var res = RadioStation.startBroadcast(state, 'host1', 'nexus', 'music', '', '', 20, 1000);
    assert(!res.success, 'should fail without title');
  });

  test('broadcast stored in state.broadcasts', function() {
    var r = goLive('nexus');
    assert(r.state.broadcasts[r.bc.id] !== undefined, 'broadcast in state.broadcasts');
  });

  test('different zones can broadcast simultaneously', function() {
    var state = makeState();
    var r1 = RadioStation.startBroadcast(state, 'host1', 'nexus', 'music', 'Show1', '', 20, 1000);
    var r2 = RadioStation.startBroadcast(state, 'host2', 'gardens', 'poetry', 'Poem', '', 10, 1000);
    assert(r1.success, 'nexus start');
    assert(r2.success, 'gardens start');
  });

  test('broadcast starts with empty listeners array', function() {
    var r = goLive('nexus');
    assert(Array.isArray(r.bc.listeners), 'listeners is array');
    assertEqual(r.bc.listeners.length, 0, 'starts empty');
  });

  test('broadcast starts with peakListeners=0', function() {
    var r = goLive('nexus');
    assertEqual(r.bc.peakListeners, 0, 'peakListeners starts at 0');
  });
});

// ── endBroadcast ──────────────────────────────────────────────────────────────

suite('endBroadcast — end live broadcast', function() {
  test('successful end returns success=true', function() {
    var r = goLive('nexus', 'host1', 'music', 'Show', 20, 1000);
    var res = RadioStation.endBroadcast(r.state, r.bc.id, 1015);
    assert(res.success, 'should succeed');
  });

  test('broadcast status set to completed', function() {
    var r = goLive('nexus', 'host1', 'music', 'Show', 20, 1000);
    RadioStation.endBroadcast(r.state, r.bc.id, 1015);
    assertEqual(r.bc.status, 'completed', 'status after end');
  });

  test('station currentBroadcast cleared after end', function() {
    var r = goLive('nexus');
    RadioStation.endBroadcast(r.state, r.bc.id, 1010);
    var station = RadioStation.getStation(r.state, 'nexus');
    assert(station.currentBroadcast === null, 'currentBroadcast should be null after end');
  });

  test('returns sparkEarned >= 0', function() {
    var r = goLive('nexus');
    var res = RadioStation.endBroadcast(r.state, r.bc.id, 1020);
    assert(typeof res.sparkEarned === 'number', 'sparkEarned is number');
    assert(res.sparkEarned >= 0, 'sparkEarned >= 0');
  });

  test('returns peakListeners', function() {
    var r = goLive('nexus');
    var res = RadioStation.endBroadcast(r.state, r.bc.id, 1020);
    assert(typeof res.peakListeners === 'number', 'peakListeners is number');
  });

  test('fails ending non-existent broadcast', function() {
    var state = makeState();
    var res = RadioStation.endBroadcast(state, 'bc_9999', 1000);
    assert(!res.success, 'should fail');
  });

  test('fails ending already-completed broadcast', function() {
    var r = goLive('nexus');
    RadioStation.endBroadcast(r.state, r.bc.id, 1010);
    var res2 = RadioStation.endBroadcast(r.state, r.bc.id, 1020);
    assert(!res2.success, 'should fail on double end');
  });

  test('spark earned depends on listener count', function() {
    var r = goLive('nexus', 'host1', 'music', 'Show', 20, 1000);
    RadioStation.tunein(r.state, 'p1', 'nexus', 1000);
    RadioStation.tunein(r.state, 'p2', 'nexus', 1000);
    var res = RadioStation.endBroadcast(r.state, r.bc.id, 1010);
    assert(res.sparkEarned > 0, 'should earn Spark with 2 listeners');
  });

  test('broadcast added to station broadcastHistory', function() {
    var r = goLive('nexus');
    RadioStation.endBroadcast(r.state, r.bc.id, 1010);
    var station = RadioStation.getStation(r.state, 'nexus');
    assert(station.broadcastHistory.indexOf(r.bc.id) !== -1, 'in broadcastHistory');
  });

  test('station listeners cleared after end', function() {
    var r = goLive('nexus', 'host1', 'music', 'Show', 20, 1000);
    RadioStation.tunein(r.state, 'p1', 'nexus', 1000);
    RadioStation.endBroadcast(r.state, r.bc.id, 1010);
    var station = RadioStation.getStation(r.state, 'nexus');
    assertEqual(station.listeners.length, 0, 'listeners cleared after end');
  });

  test('station can start new broadcast after end', function() {
    var r = goLive('nexus', 'host1', 'music', 'Show 1', 20, 1000);
    RadioStation.endBroadcast(r.state, r.bc.id, 1010);
    var res2 = RadioStation.startBroadcast(r.state, 'host2', 'nexus', 'music', 'Show 2', '', 20, 1010);
    assert(res2.success, 'should be able to start new broadcast after end');
  });
});

// ── scheduleBroadcast ─────────────────────────────────────────────────────────

suite('scheduleBroadcast — future scheduling', function() {
  test('successful schedule returns success=true', function() {
    var state = makeState();
    var res = RadioStation.scheduleBroadcast(state, 'host1', 'nexus', 'music', 'Future Show', '', 20, 2000);
    assert(res.success, 'should succeed');
  });

  test('scheduled broadcast has status=scheduled', function() {
    var state = makeState();
    var res = RadioStation.scheduleBroadcast(state, 'host1', 'nexus', 'music', 'Future Show', '', 20, 2000);
    assertEqual(res.broadcast.status, 'scheduled', 'status should be scheduled');
  });

  test('scheduled broadcast added to station.schedule', function() {
    var state = makeState();
    var res = RadioStation.scheduleBroadcast(state, 'host1', 'nexus', 'music', 'Future Show', '', 20, 2000);
    var station = RadioStation.getStation(state, 'nexus');
    assert(station.schedule.indexOf(res.broadcast.id) !== -1, 'in station.schedule');
  });

  test('schedule sorted by startTick', function() {
    var state = makeState();
    RadioStation.scheduleBroadcast(state, 'host1', 'nexus', 'music', 'Show B', '', 20, 3000);
    RadioStation.scheduleBroadcast(state, 'host2', 'nexus', 'music', 'Show A', '', 20, 2000);
    var station = RadioStation.getStation(state, 'nexus');
    var ticks = station.schedule.map(function(id) { return state.broadcasts[id].startTick; });
    assert(ticks[0] <= ticks[1], 'schedule sorted ascending by startTick');
  });

  test('fails with unknown zone', function() {
    var state = makeState();
    var res = RadioStation.scheduleBroadcast(state, 'host1', 'badzone', 'music', 'Show', '', 20, 2000);
    assert(!res.success, 'should fail');
  });

  test('fails with invalid duration', function() {
    var state = makeState();
    var res = RadioStation.scheduleBroadcast(state, 'host1', 'nexus', 'music', 'Show', '', 1, 2000);
    assert(!res.success, 'should fail for bad duration');
  });

  test('fails without title', function() {
    var state = makeState();
    var res = RadioStation.scheduleBroadcast(state, 'host1', 'nexus', 'music', '', '', 20, 2000);
    assert(!res.success, 'should fail without title');
  });

  test('stored in state.broadcasts', function() {
    var state = makeState();
    var res = RadioStation.scheduleBroadcast(state, 'host1', 'nexus', 'music', 'Show', '', 20, 2000);
    assert(state.broadcasts[res.broadcast.id] !== undefined, 'in state.broadcasts');
  });
});

// ── cancelBroadcast ───────────────────────────────────────────────────────────

suite('cancelBroadcast', function() {
  test('cancel live broadcast succeeds for broadcaster', function() {
    var r = goLive('nexus', 'host1');
    var res = RadioStation.cancelBroadcast(r.state, 'host1', r.bc.id);
    assert(res.success, 'should succeed');
  });

  test('cancelled broadcast has status=cancelled', function() {
    var r = goLive('nexus', 'host1');
    RadioStation.cancelBroadcast(r.state, 'host1', r.bc.id);
    assertEqual(r.bc.status, 'cancelled', 'status should be cancelled');
  });

  test('cancel clears station currentBroadcast', function() {
    var r = goLive('nexus', 'host1');
    RadioStation.cancelBroadcast(r.state, 'host1', r.bc.id);
    var station = RadioStation.getStation(r.state, 'nexus');
    assert(station.currentBroadcast === null, 'currentBroadcast cleared');
  });

  test('cancel removes scheduled broadcast from station.schedule', function() {
    var state = makeState();
    var res = RadioStation.scheduleBroadcast(state, 'host1', 'nexus', 'music', 'Show', '', 20, 2000);
    RadioStation.cancelBroadcast(state, 'host1', res.broadcast.id);
    var station = RadioStation.getStation(state, 'nexus');
    assert(station.schedule.indexOf(res.broadcast.id) === -1, 'removed from schedule');
  });

  test('fails when non-broadcaster tries to cancel', function() {
    var r = goLive('nexus', 'host1');
    var res = RadioStation.cancelBroadcast(r.state, 'host2', r.bc.id);
    assert(!res.success, 'should fail for wrong broadcaster');
  });

  test('fails for non-existent broadcast', function() {
    var state = makeState();
    var res = RadioStation.cancelBroadcast(state, 'host1', 'bc_9999');
    assert(!res.success, 'should fail');
  });

  test('fails on already cancelled broadcast', function() {
    var r = goLive('nexus', 'host1');
    RadioStation.cancelBroadcast(r.state, 'host1', r.bc.id);
    var res2 = RadioStation.cancelBroadcast(r.state, 'host1', r.bc.id);
    assert(!res2.success, 'should fail on double cancel');
  });

  test('fails on completed broadcast', function() {
    var r = goLive('nexus', 'host1');
    RadioStation.endBroadcast(r.state, r.bc.id, 1010);
    var res = RadioStation.cancelBroadcast(r.state, 'host1', r.bc.id);
    assert(!res.success, 'should fail on completed');
  });
});

// ── tunein / tuneOut ──────────────────────────────────────────────────────────

suite('tunein — listener management', function() {
  test('tunein returns success=true when station is live', function() {
    var r = goLive('nexus');
    var res = RadioStation.tunein(r.state, 'p1', 'nexus', 1000);
    assert(res.success, 'should succeed');
  });

  test('tunein returns the current broadcast', function() {
    var r = goLive('nexus');
    var res = RadioStation.tunein(r.state, 'p1', 'nexus', 1000);
    assert(res.broadcast !== null, 'broadcast should not be null');
    assertEqual(res.broadcast.id, r.bc.id, 'broadcast id matches');
  });

  test('listener added to station.listeners', function() {
    var r = goLive('nexus');
    RadioStation.tunein(r.state, 'p1', 'nexus', 1000);
    var listeners = RadioStation.getListeners(r.state, 'nexus');
    assert(listeners.indexOf('p1') !== -1, 'p1 in listeners');
  });

  test('listener added to broadcast.listeners', function() {
    var r = goLive('nexus');
    RadioStation.tunein(r.state, 'p1', 'nexus', 1000);
    assert(r.bc.listeners.indexOf('p1') !== -1, 'p1 in bc.listeners');
  });

  test('peakListeners updated when listener joins', function() {
    var r = goLive('nexus');
    RadioStation.tunein(r.state, 'p1', 'nexus', 1000);
    RadioStation.tunein(r.state, 'p2', 'nexus', 1000);
    assert(r.bc.peakListeners >= 2, 'peakListeners >= 2');
  });

  test('tunein on empty station (no broadcast) still succeeds', function() {
    var state = makeState();
    var res = RadioStation.tunein(state, 'p1', 'nexus', 1000);
    assert(res.success, 'should succeed even with no broadcast');
    assert(res.broadcast === null, 'broadcast is null');
  });

  test('duplicate tunein does not add duplicate listener', function() {
    var r = goLive('nexus');
    RadioStation.tunein(r.state, 'p1', 'nexus', 1000);
    RadioStation.tunein(r.state, 'p1', 'nexus', 1001);
    var count = RadioStation.getListenerCount(r.state, 'nexus');
    assertEqual(count, 1, 'only 1 listener despite 2 tunein calls');
  });

  test('fails with unknown zone', function() {
    var state = makeState();
    var res = RadioStation.tunein(state, 'p1', 'badzone', 1000);
    assert(!res.success, 'should fail for bad zone');
  });

  test('multiple listeners tracked correctly', function() {
    var r = goLive('nexus');
    RadioStation.tunein(r.state, 'p1', 'nexus', 1000);
    RadioStation.tunein(r.state, 'p2', 'nexus', 1000);
    RadioStation.tunein(r.state, 'p3', 'nexus', 1000);
    assertEqual(RadioStation.getListenerCount(r.state, 'nexus'), 3, '3 listeners');
  });
});

suite('tuneOut — stop listening', function() {
  test('tuneOut succeeds for listening player', function() {
    var r = goLive('nexus');
    RadioStation.tunein(r.state, 'p1', 'nexus', 1000);
    var res = RadioStation.tuneOut(r.state, 'p1', 'nexus');
    assert(res.success, 'should succeed');
  });

  test('listener removed from station.listeners', function() {
    var r = goLive('nexus');
    RadioStation.tunein(r.state, 'p1', 'nexus', 1000);
    RadioStation.tuneOut(r.state, 'p1', 'nexus');
    var listeners = RadioStation.getListeners(r.state, 'nexus');
    assert(listeners.indexOf('p1') === -1, 'p1 removed');
  });

  test('listener removed from broadcast.listeners', function() {
    var r = goLive('nexus');
    RadioStation.tunein(r.state, 'p1', 'nexus', 1000);
    RadioStation.tuneOut(r.state, 'p1', 'nexus');
    assert(r.bc.listeners.indexOf('p1') === -1, 'p1 removed from bc.listeners');
  });

  test('fails when player is not listening', function() {
    var state = makeState();
    var res = RadioStation.tuneOut(state, 'p1', 'nexus');
    assert(!res.success, 'should fail');
  });

  test('fails with unknown zone', function() {
    var state = makeState();
    var res = RadioStation.tuneOut(state, 'p1', 'badzone');
    assert(!res.success, 'should fail for bad zone');
  });

  test('other listeners unaffected when one tunes out', function() {
    var r = goLive('nexus');
    RadioStation.tunein(r.state, 'p1', 'nexus', 1000);
    RadioStation.tunein(r.state, 'p2', 'nexus', 1000);
    RadioStation.tuneOut(r.state, 'p1', 'nexus');
    assertEqual(RadioStation.getListenerCount(r.state, 'nexus'), 1, 'p2 still listening');
  });
});

// ── getStation / getAllStations ────────────────────────────────────────────────

suite('getStation / getAllStations', function() {
  test('getStation returns station for valid zone', function() {
    var state = makeState();
    var station = RadioStation.getStation(state, 'nexus');
    assert(station !== null, 'should return station');
    assertEqual(station.zone, 'nexus', 'correct zone');
  });

  test('getStation returns null for unknown zone', function() {
    var state = makeState();
    var station = RadioStation.getStation(state, 'fakezone');
    assert(station === null, 'should return null');
  });

  test('getAllStations returns array of 8', function() {
    var state = makeState();
    var all = RadioStation.getAllStations(state);
    assert(Array.isArray(all), 'is array');
    assertEqual(all.length, 8, '8 stations');
  });

  test('getAllStations returns empty array for invalid state', function() {
    var all = RadioStation.getAllStations(null);
    assert(Array.isArray(all), 'is array');
    assertEqual(all.length, 0, 'empty for null state');
  });
});

// ── getCurrentBroadcast ───────────────────────────────────────────────────────

suite('getCurrentBroadcast', function() {
  test('returns null when no broadcast', function() {
    var state = makeState();
    assert(RadioStation.getCurrentBroadcast(state, 'nexus') === null, 'null with no broadcast');
  });

  test('returns broadcast when live', function() {
    var r = goLive('nexus');
    var bc = RadioStation.getCurrentBroadcast(r.state, 'nexus');
    assert(bc !== null, 'should return broadcast');
    assertEqual(bc.id, r.bc.id, 'correct broadcast');
  });

  test('returns null after broadcast ends', function() {
    var r = goLive('nexus');
    RadioStation.endBroadcast(r.state, r.bc.id, 1010);
    assert(RadioStation.getCurrentBroadcast(r.state, 'nexus') === null, 'null after end');
  });

  test('returns null for unknown zone', function() {
    var state = makeState();
    assert(RadioStation.getCurrentBroadcast(state, 'badzone') === null, 'null for bad zone');
  });
});

// ── getSchedule ───────────────────────────────────────────────────────────────

suite('getSchedule', function() {
  test('returns empty array when no scheduled broadcasts', function() {
    var state = makeState();
    var sched = RadioStation.getSchedule(state, 'nexus', 0, 9999);
    assert(Array.isArray(sched), 'is array');
    assertEqual(sched.length, 0, 'empty');
  });

  test('returns scheduled broadcasts in tick range', function() {
    var state = makeState();
    RadioStation.scheduleBroadcast(state, 'host1', 'nexus', 'music', 'Show A', '', 20, 2000);
    RadioStation.scheduleBroadcast(state, 'host1', 'nexus', 'music', 'Show B', '', 20, 3000);
    var sched = RadioStation.getSchedule(state, 'nexus', 1500, 2500);
    assertEqual(sched.length, 1, 'only Show A in range');
    assertEqual(sched[0].title, 'Show A', 'Show A returned');
  });

  test('filters out broadcasts outside range', function() {
    var state = makeState();
    RadioStation.scheduleBroadcast(state, 'host1', 'nexus', 'music', 'Show A', '', 20, 1000);
    RadioStation.scheduleBroadcast(state, 'host1', 'nexus', 'music', 'Show B', '', 20, 5000);
    var sched = RadioStation.getSchedule(state, 'nexus', 2000, 4000);
    assertEqual(sched.length, 0, 'none in range 2000-4000');
  });
});

// ── Queue ─────────────────────────────────────────────────────────────────────

suite('addToQueue / getQueue', function() {
  test('addToQueue succeeds for valid input', function() {
    var state = makeState();
    var res = RadioStation.addToQueue(state, 'host1', 'nexus', 'music', 'Queued Show', '', 30);
    assert(res.success, 'should succeed');
  });

  test('queue entry has required fields', function() {
    var state = makeState();
    var res = RadioStation.addToQueue(state, 'host1', 'nexus', 'music', 'Queued Show', 'desc', 30);
    var entry = res.entry;
    assert(entry !== null, 'entry not null');
    assertEqual(entry.broadcasterId, 'host1', 'broadcasterId');
    assertEqual(entry.title, 'Queued Show', 'title');
    assertEqual(entry.type, 'music', 'type');
    assertEqual(entry.duration, 30, 'duration');
  });

  test('getQueue returns the queue array', function() {
    var state = makeState();
    RadioStation.addToQueue(state, 'host1', 'nexus', 'music', 'Show 1', '', 30);
    RadioStation.addToQueue(state, 'host2', 'nexus', 'poetry', 'Poem 1', '', 10);
    var queue = RadioStation.getQueue(state, 'nexus');
    assertEqual(queue.length, 2, '2 items in queue');
  });

  test('getQueue returns empty for zone with no queue', function() {
    var state = makeState();
    var queue = RadioStation.getQueue(state, 'wilds');
    assertEqual(queue.length, 0, 'empty queue');
  });

  test('addToQueue fails with invalid duration', function() {
    var state = makeState();
    var res = RadioStation.addToQueue(state, 'host1', 'nexus', 'music', 'Show', '', 1);
    assert(!res.success, 'should fail');
  });

  test('addToQueue fails with unknown zone', function() {
    var state = makeState();
    var res = RadioStation.addToQueue(state, 'host1', 'badzone', 'music', 'Show', '', 30);
    assert(!res.success, 'should fail for bad zone');
  });

  test('addToQueue fails without title', function() {
    var state = makeState();
    var res = RadioStation.addToQueue(state, 'host1', 'nexus', 'music', '', '', 30);
    assert(!res.success, 'should fail without title');
  });
});

// ── Listener counts ───────────────────────────────────────────────────────────

suite('getListeners / getListenerCount', function() {
  test('getListeners returns copy of listeners array', function() {
    var r = goLive('nexus');
    RadioStation.tunein(r.state, 'p1', 'nexus', 1000);
    var listeners = RadioStation.getListeners(r.state, 'nexus');
    assert(Array.isArray(listeners), 'is array');
    assertEqual(listeners.length, 1, '1 listener');
  });

  test('getListenerCount matches listeners array length', function() {
    var r = goLive('nexus');
    RadioStation.tunein(r.state, 'p1', 'nexus', 1000);
    RadioStation.tunein(r.state, 'p2', 'nexus', 1000);
    assertEqual(RadioStation.getListenerCount(r.state, 'nexus'), 2, '2 listeners');
  });

  test('getListenerCount returns 0 for zone with no listeners', function() {
    var state = makeState();
    assertEqual(RadioStation.getListenerCount(state, 'nexus'), 0, '0 listeners');
  });

  test('getListeners returns empty for unknown zone', function() {
    var state = makeState();
    var l = RadioStation.getListeners(state, 'badzone');
    assert(Array.isArray(l), 'is array');
    assertEqual(l.length, 0, 'empty for bad zone');
  });
});

// ── getBroadcastHistory ───────────────────────────────────────────────────────

suite('getBroadcastHistory', function() {
  test('returns empty array before any broadcasts', function() {
    var state = makeState();
    var h = RadioStation.getBroadcastHistory(state, 'nexus', 10);
    assert(Array.isArray(h), 'is array');
    assertEqual(h.length, 0, 'empty initially');
  });

  test('completed broadcasts appear in history', function() {
    var r = goLive('nexus');
    RadioStation.endBroadcast(r.state, r.bc.id, 1010);
    var h = RadioStation.getBroadcastHistory(r.state, 'nexus', 10);
    assertEqual(h.length, 1, '1 in history');
    assertEqual(h[0].id, r.bc.id, 'correct broadcast in history');
  });

  test('history respects count limit', function() {
    var state = makeState();
    // Start and end 5 broadcasts
    for (var i = 0; i < 5; i++) {
      var res = RadioStation.startBroadcast(state, 'host', 'nexus', 'music', 'Show' + i, '', 20, 1000 + i * 100);
      if (res.success) {
        RadioStation.endBroadcast(state, res.broadcast.id, 1010 + i * 100);
      }
    }
    var h = RadioStation.getBroadcastHistory(state, 'nexus', 3);
    assert(h.length <= 3, 'at most 3 results');
  });

  test('returns empty for unknown zone', function() {
    var state = makeState();
    var h = RadioStation.getBroadcastHistory(state, 'badzone', 10);
    assertEqual(h.length, 0, 'empty for bad zone');
  });
});

// ── getPlayerBroadcasts ───────────────────────────────────────────────────────

suite('getPlayerBroadcasts', function() {
  test('returns broadcasts by a specific player', function() {
    var state = makeState();
    RadioStation.startBroadcast(state, 'host1', 'nexus', 'music', 'Show1', '', 20, 1000);
    RadioStation.startBroadcast(state, 'host2', 'gardens', 'poetry', 'Poem1', '', 10, 1000);
    var broadcasts = RadioStation.getPlayerBroadcasts(state, 'host1');
    assertEqual(broadcasts.length, 1, 'host1 has 1 broadcast');
    assertEqual(broadcasts[0].broadcasterId, 'host1', 'correct broadcaster');
  });

  test('returns empty for player with no broadcasts', function() {
    var state = makeState();
    var broadcasts = RadioStation.getPlayerBroadcasts(state, 'nobody');
    assertEqual(broadcasts.length, 0, 'no broadcasts');
  });

  test('returns all broadcasts across all zones for a player', function() {
    var state = makeState();
    RadioStation.startBroadcast(state, 'host1', 'nexus', 'music', 'Show1', '', 20, 1000);
    // End first broadcast before starting next on nexus (can't have 2 live at same time on same station)
    var bc1 = RadioStation.getCurrentBroadcast(state, 'nexus');
    RadioStation.endBroadcast(state, bc1.id, 1010);
    RadioStation.startBroadcast(state, 'host1', 'nexus', 'poetry', 'Poem1', '', 10, 1010);
    var broadcasts = RadioStation.getPlayerBroadcasts(state, 'host1');
    assertEqual(broadcasts.length, 2, 'host1 has 2 broadcasts');
  });
});

// ── getBroadcasterStats ───────────────────────────────────────────────────────

suite('getBroadcasterStats', function() {
  test('returns stats object with required fields', function() {
    var state = makeState();
    var stats = RadioStation.getBroadcasterStats(state, 'nobody');
    assert(typeof stats.totalBroadcasts === 'number', 'totalBroadcasts');
    assert(typeof stats.totalListeners === 'number', 'totalListeners');
    assert(typeof stats.totalSparkEarned === 'number', 'totalSparkEarned');
    assert(typeof stats.avgAudience === 'number', 'avgAudience');
  });

  test('totalBroadcasts counts all broadcasts by player', function() {
    var state = makeState();
    var res = RadioStation.startBroadcast(state, 'host1', 'nexus', 'music', 'Show1', '', 20, 1000);
    var stats = RadioStation.getBroadcasterStats(state, 'host1');
    assertEqual(stats.totalBroadcasts, 1, '1 broadcast');
  });

  test('totalSparkEarned sums Spark from completed broadcasts', function() {
    var r = goLive('nexus', 'host1', 'music', 'Show', 20, 1000);
    RadioStation.tunein(r.state, 'p1', 'nexus', 1000);
    RadioStation.endBroadcast(r.state, r.bc.id, 1010);
    var stats = RadioStation.getBroadcasterStats(r.state, 'host1');
    assert(stats.totalSparkEarned > 0, 'should have earned Spark');
  });

  test('returns zero stats for player with no broadcasts', function() {
    var state = makeState();
    var stats = RadioStation.getBroadcasterStats(state, 'nobody');
    assertEqual(stats.totalBroadcasts, 0, '0 broadcasts');
    assertEqual(stats.totalSparkEarned, 0, '0 spark');
  });
});

// ── getPopularStations ────────────────────────────────────────────────────────

suite('getPopularStations', function() {
  test('returns array of all 8 stations', function() {
    var state = makeState();
    var stations = RadioStation.getPopularStations(state);
    assertEqual(stations.length, 8, '8 stations');
  });

  test('sorted by totalListenerTicks descending', function() {
    var state = makeState();
    // Give nexus some listener ticks via updateListenerRewards
    var res = RadioStation.startBroadcast(state, 'host1', 'nexus', 'music', 'Show', '', 20, 1000);
    RadioStation.tunein(state, 'p1', 'nexus', 1000);
    RadioStation.updateListenerRewards(state, 'nexus', 1001);
    RadioStation.updateListenerRewards(state, 'nexus', 1002);
    var stations = RadioStation.getPopularStations(state);
    // nexus should be first since others have 0 ticks
    assertEqual(stations[0].zone, 'nexus', 'nexus should be most popular');
  });
});

// ── getTopBroadcasters ────────────────────────────────────────────────────────

suite('getTopBroadcasters', function() {
  test('returns array', function() {
    var state = makeState();
    var top = RadioStation.getTopBroadcasters(state, 5);
    assert(Array.isArray(top), 'is array');
  });

  test('returns at most count entries', function() {
    var state = makeState();
    RadioStation.startBroadcast(state, 'host1', 'nexus', 'music', 'Show1', '', 20, 1000);
    RadioStation.endBroadcast(state, RadioStation.getCurrentBroadcast(state, 'nexus').id, 1010);
    var top = RadioStation.getTopBroadcasters(state, 1);
    assert(top.length <= 1, 'at most 1');
  });

  test('each entry has required fields', function() {
    var state = makeState();
    RadioStation.startBroadcast(state, 'host1', 'nexus', 'music', 'Show1', '', 20, 1000);
    var top = RadioStation.getTopBroadcasters(state, 10);
    if (top.length > 0) {
      var entry = top[0];
      assert(entry.playerId !== undefined, 'playerId');
      assert(typeof entry.totalBroadcasts === 'number', 'totalBroadcasts');
      assert(typeof entry.totalSparkEarned === 'number', 'totalSparkEarned');
    }
  });

  test('sorted by totalSparkEarned descending', function() {
    var state = makeState();
    // host1 earns more spark (interview = 4 per listener vs music = 2)
    var r1 = RadioStation.startBroadcast(state, 'host1', 'nexus', 'interview', 'Big Show', '', 15, 1000);
    RadioStation.tunein(state, 'p1', 'nexus', 1000);
    RadioStation.tunein(state, 'p2', 'nexus', 1000);
    RadioStation.endBroadcast(state, r1.broadcast.id, 1010);
    var r2 = RadioStation.startBroadcast(state, 'host2', 'nexus', 'news', 'Quick News', '', 5, 1020);
    RadioStation.endBroadcast(state, r2.broadcast.id, 1025);
    var top = RadioStation.getTopBroadcasters(state, 5);
    if (top.length >= 2) {
      assert(top[0].totalSparkEarned >= top[1].totalSparkEarned, 'sorted descending');
    }
  });
});

// ── updateListenerRewards ─────────────────────────────────────────────────────

suite('updateListenerRewards', function() {
  test('returns {awarded, totalAwarded} object', function() {
    var state = makeState();
    var res = RadioStation.updateListenerRewards(state, 'nexus', 1000);
    assert(Array.isArray(res.awarded), 'awarded is array');
    assert(typeof res.totalAwarded === 'number', 'totalAwarded is number');
  });

  test('awards 1 Spark per listener at tick divisible by 10', function() {
    var r = goLive('nexus', 'host1', 'music', 'Show', 50, 1000);
    RadioStation.tunein(r.state, 'p1', 'nexus', 1000);
    RadioStation.tunein(r.state, 'p2', 'nexus', 1000);
    var res = RadioStation.updateListenerRewards(r.state, 'nexus', 1010);
    assertEqual(res.awarded.length, 2, '2 players awarded');
    assertEqual(res.totalAwarded, 2, 'totalAwarded = 2');
  });

  test('no award when tick not divisible by 10', function() {
    var r = goLive('nexus', 'host1', 'music', 'Show', 50, 1000);
    RadioStation.tunein(r.state, 'p1', 'nexus', 1000);
    var res = RadioStation.updateListenerRewards(r.state, 'nexus', 1005);
    assertEqual(res.awarded.length, 0, 'no awards at tick 1005');
    assertEqual(res.totalAwarded, 0, 'totalAwarded = 0');
  });

  test('no award when no listeners', function() {
    var r = goLive('nexus', 'host1', 'music', 'Show', 50, 1000);
    var res = RadioStation.updateListenerRewards(r.state, 'nexus', 1010);
    assertEqual(res.awarded.length, 0, 'no listeners = no awards');
  });

  test('no award when no active broadcast', function() {
    var state = makeState();
    var res = RadioStation.updateListenerRewards(state, 'nexus', 1010);
    assertEqual(res.awarded.length, 0, 'no broadcast = no awards');
  });

  test('station totalListenerTicks incremented each call with listeners', function() {
    var r = goLive('nexus', 'host1', 'music', 'Show', 50, 1000);
    RadioStation.tunein(r.state, 'p1', 'nexus', 1000);
    RadioStation.updateListenerRewards(r.state, 'nexus', 1001);
    RadioStation.updateListenerRewards(r.state, 'nexus', 1002);
    var station = RadioStation.getStation(r.state, 'nexus');
    assertEqual(station.totalListenerTicks, 2, 'totalListenerTicks = 2');
  });

  test('returns empty for unknown zone', function() {
    var state = makeState();
    var res = RadioStation.updateListenerRewards(state, 'badzone', 1000);
    assertEqual(res.awarded.length, 0, 'empty for bad zone');
  });
});

// ── Cross-system integration ───────────────────────────────────────────────────

suite('Integration — full broadcast lifecycle', function() {
  test('broadcast lifecycle: start → tunein → updateRewards → end', function() {
    var state = makeState();
    // Start broadcast
    var r = RadioStation.startBroadcast(state, 'dj1', 'nexus', 'music', 'Friday Night Mix', 'Deep house', 30, 2000);
    assert(r.success, 'start succeeded');
    // Listeners tune in
    RadioStation.tunein(state, 'fan1', 'nexus', 2000);
    RadioStation.tunein(state, 'fan2', 'nexus', 2001);
    RadioStation.tunein(state, 'fan3', 'nexus', 2002);
    assertEqual(RadioStation.getListenerCount(state, 'nexus'), 3, '3 listeners');
    // Rewards at tick 10
    var rewards = RadioStation.updateListenerRewards(state, 'nexus', 2010);
    assertEqual(rewards.awarded.length, 3, '3 rewards');
    // End broadcast
    var end = RadioStation.endBroadcast(state, r.broadcast.id, 2030);
    assert(end.success, 'end succeeded');
    assert(end.sparkEarned > 0, 'spark earned');
    // Station is now free
    assert(RadioStation.getCurrentBroadcast(state, 'nexus') === null, 'station free');
  });

  test('different zone stations are independent', function() {
    var state = makeState();
    // Broadcast on nexus
    var r1 = RadioStation.startBroadcast(state, 'dj1', 'nexus', 'music', 'Show A', '', 20, 1000);
    // Broadcast on gardens
    var r2 = RadioStation.startBroadcast(state, 'dj2', 'gardens', 'poetry', 'Poem B', '', 10, 1000);
    assert(r1.success, 'nexus started');
    assert(r2.success, 'gardens started');
    // End nexus does not affect gardens
    RadioStation.endBroadcast(state, r1.broadcast.id, 1010);
    assert(RadioStation.getCurrentBroadcast(state, 'gardens') !== null, 'gardens still live');
  });

  test('broadcaster stats accumulate across broadcasts', function() {
    var state = makeState();
    var r1 = RadioStation.startBroadcast(state, 'dj1', 'nexus', 'music', 'Show 1', '', 20, 1000);
    RadioStation.tunein(state, 'fan1', 'nexus', 1000);
    RadioStation.endBroadcast(state, r1.broadcast.id, 1010);

    var r2 = RadioStation.startBroadcast(state, 'dj1', 'nexus', 'poetry', 'Show 2', '', 10, 1020);
    RadioStation.tunein(state, 'fan1', 'nexus', 1020);
    RadioStation.tunein(state, 'fan2', 'nexus', 1020);
    RadioStation.endBroadcast(state, r2.broadcast.id, 1030);

    var stats = RadioStation.getBroadcasterStats(state, 'dj1');
    assertEqual(stats.totalBroadcasts, 2, '2 total broadcasts');
    assert(stats.totalSparkEarned > 0, 'has spark earned');
  });
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('\n─────────────────────────────────');
console.log('Total: ' + (passed + failed) + ' | Passed: ' + passed + ' | Failed: ' + failed);

if (errors.length > 0) {
  console.log('\nFailed tests:');
  errors.forEach(function(e) {
    console.log('  FAIL: ' + e.name);
    console.log('    ' + e.error.message);
  });
}

if (failed > 0) {
  process.exit(1);
}
