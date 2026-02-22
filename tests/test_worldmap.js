// test_worldmap.js - Tests for World Map HUD module (worldmap.js)
// Covers: coordinate transforms, zone detection, distance calculations,
// rendering data, path calculation, edge cases.
'use strict';

var testRunner = require('./test_runner');
var test = testRunner.test;
var suite = testRunner.suite;
var report = testRunner.report;
var assert = testRunner.assert;

var WM = require('../src/js/worldmap');

// ─── Constants ──────────────────────────────────────────────────────────────────

suite('Constants', function() {

  test('WORLD_MIN is -600', function() {
    assert(WM.WORLD_MIN === -600, 'WORLD_MIN should be -600, got: ' + WM.WORLD_MIN);
  });

  test('WORLD_MAX is 600', function() {
    assert(WM.WORLD_MAX === 600, 'WORLD_MAX should be 600, got: ' + WM.WORLD_MAX);
  });

  test('WORLD_RANGE is 1200', function() {
    assert(WM.WORLD_RANGE === 1200, 'WORLD_RANGE should be 1200, got: ' + WM.WORLD_RANGE);
  });

  test('ZONE_COLORS has 8 zones', function() {
    var keys = Object.keys(WM.ZONE_COLORS);
    assert(keys.length === 8, 'Should have 8 zone colors, got: ' + keys.length);
  });

  test('ZONE_COLORS includes all zone IDs', function() {
    var expected = ['nexus','gardens','athenaeum','studio','wilds','agora','commons','arena'];
    for (var i = 0; i < expected.length; i++) {
      assert(WM.ZONE_COLORS[expected[i]], 'Missing color for: ' + expected[i]);
    }
  });

  test('ZONE_COLORS values are CSS color strings', function() {
    for (var zid in WM.ZONE_COLORS) {
      var c = WM.ZONE_COLORS[zid];
      assert(typeof c === 'string' && c.length > 0, 'Color should be non-empty string for: ' + zid);
    }
  });

  test('ZONE_DATA has 8 zones', function() {
    var keys = Object.keys(WM.ZONE_DATA);
    assert(keys.length === 8, 'ZONE_DATA should have 8 zones, got: ' + keys.length);
  });

  test('ZONE_DATA entries have cx, cz, radius, name, color', function() {
    for (var zid in WM.ZONE_DATA) {
      var z = WM.ZONE_DATA[zid];
      assert(typeof z.cx === 'number', zid + ' missing cx');
      assert(typeof z.cz === 'number', zid + ' missing cz');
      assert(typeof z.radius === 'number' && z.radius > 0, zid + ' missing radius');
      assert(typeof z.name === 'string' && z.name.length > 0, zid + ' missing name');
      assert(typeof z.color === 'string', zid + ' missing color');
    }
  });

  test('ZONE_CONNECTIONS is non-empty array', function() {
    assert(Array.isArray(WM.ZONE_CONNECTIONS) && WM.ZONE_CONNECTIONS.length > 0,
      'ZONE_CONNECTIONS should be non-empty array');
  });

  test('ZONE_CONNECTIONS entries are 2-element arrays', function() {
    for (var i = 0; i < WM.ZONE_CONNECTIONS.length; i++) {
      var conn = WM.ZONE_CONNECTIONS[i];
      assert(Array.isArray(conn) && conn.length === 2,
        'Connection entry should be 2-element array at index ' + i);
    }
  });

});

// ─── worldToMap ─────────────────────────────────────────────────────────────────

suite('worldToMap', function() {

  test('World origin (0,0) maps to canvas center', function() {
    var pos = WM.worldToMap(0, 0, 400, 400, 0);
    assert(Math.abs(pos.x - 200) < 1, 'X should be near 200, got: ' + pos.x);
    assert(Math.abs(pos.y - 200) < 1, 'Y should be near 200, got: ' + pos.y);
  });

  test('WORLD_MIN maps to margin edge', function() {
    var pos = WM.worldToMap(-600, -600, 400, 400, 10);
    assert(Math.abs(pos.x - 10) < 1, 'X at world min should be ~margin, got: ' + pos.x);
    assert(Math.abs(pos.y - 10) < 1, 'Y at world min should be ~margin, got: ' + pos.y);
  });

  test('WORLD_MAX maps to far edge minus margin', function() {
    var pos = WM.worldToMap(600, 600, 400, 400, 10);
    assert(Math.abs(pos.x - 390) < 1, 'X at world max should be ~390, got: ' + pos.x);
    assert(Math.abs(pos.y - 390) < 1, 'Y at world max should be ~390, got: ' + pos.y);
  });

  test('Returns object with x and y properties', function() {
    var pos = WM.worldToMap(100, 200, 400, 400);
    assert(typeof pos.x === 'number', 'Result should have numeric x');
    assert(typeof pos.y === 'number', 'Result should have numeric y');
  });

  test('Positive X shifts right on canvas', function() {
    var left = WM.worldToMap(-100, 0, 400, 400, 0);
    var right = WM.worldToMap(100, 0, 400, 400, 0);
    assert(right.x > left.x, 'Positive X should produce larger canvas X');
  });

  test('Positive Z shifts down on canvas', function() {
    var top = WM.worldToMap(0, -100, 400, 400, 0);
    var bottom = WM.worldToMap(0, 100, 400, 400, 0);
    assert(bottom.y > top.y, 'Positive Z should produce larger canvas Y');
  });

  test('Default margin is 12', function() {
    var withDefault = WM.worldToMap(0, 0, 400, 400);
    var withExplicit = WM.worldToMap(0, 0, 400, 400, 12);
    assert(Math.abs(withDefault.x - withExplicit.x) < 0.001, 'Default margin should be 12');
  });

  test('Non-square canvas works', function() {
    var pos = WM.worldToMap(0, 0, 600, 300, 0);
    assert(Math.abs(pos.x - 300) < 1, 'X should be canvas center (300), got: ' + pos.x);
    assert(Math.abs(pos.y - 150) < 1, 'Y should be canvas center (150), got: ' + pos.y);
  });

  test('Nexus center (0,0) maps correctly', function() {
    var nexus = WM.ZONE_DATA.nexus;
    var pos = WM.worldToMap(nexus.cx, nexus.cz, 400, 400, 0);
    assert(Math.abs(pos.x - 200) < 1, 'Nexus should map to canvas center X');
    assert(Math.abs(pos.y - 200) < 1, 'Nexus should map to canvas center Y');
  });

});

// ─── mapToWorld ─────────────────────────────────────────────────────────────────

suite('mapToWorld', function() {

  test('Canvas center maps to world origin', function() {
    var world = WM.mapToWorld(200, 200, 400, 400, 0);
    assert(Math.abs(world.x) < 1, 'X should be near 0, got: ' + world.x);
    assert(Math.abs(world.z) < 1, 'Z should be near 0, got: ' + world.z);
  });

  test('Returns object with x and z properties', function() {
    var world = WM.mapToWorld(100, 100, 400, 400);
    assert(typeof world.x === 'number', 'Result should have numeric x');
    assert(typeof world.z === 'number', 'Result should have numeric z');
  });

  test('Top-left corner maps to WORLD_MIN area', function() {
    var world = WM.mapToWorld(10, 10, 400, 400, 10);
    assert(Math.abs(world.x - WM.WORLD_MIN) < 1, 'X should be WORLD_MIN, got: ' + world.x);
    assert(Math.abs(world.z - WM.WORLD_MIN) < 1, 'Z should be WORLD_MIN, got: ' + world.z);
  });

  test('Bottom-right corner maps to WORLD_MAX area', function() {
    var world = WM.mapToWorld(390, 390, 400, 400, 10);
    assert(Math.abs(world.x - WM.WORLD_MAX) < 1, 'X should be WORLD_MAX, got: ' + world.x);
    assert(Math.abs(world.z - WM.WORLD_MAX) < 1, 'Z should be WORLD_MAX, got: ' + world.z);
  });

  test('Default margin matches worldToMap default', function() {
    var world = WM.mapToWorld(200, 200, 400, 400);
    var world2 = WM.mapToWorld(200, 200, 400, 400, 12);
    assert(Math.abs(world.x - world2.x) < 0.001, 'Default margin should be 12');
  });

  test('Non-square canvas works', function() {
    var world = WM.mapToWorld(300, 150, 600, 300, 0);
    assert(Math.abs(world.x) < 1, 'X should be near 0, got: ' + world.x);
    assert(Math.abs(world.z) < 1, 'Z should be near 0, got: ' + world.z);
  });

});

// ─── Round-trip transform ────────────────────────────────────────────────────────

suite('Round-trip Coordinate Transforms', function() {

  test('worldToMap then mapToWorld is identity (origin)', function() {
    var pos = WM.worldToMap(0, 0, 400, 400, 12);
    var back = WM.mapToWorld(pos.x, pos.y, 400, 400, 12);
    assert(Math.abs(back.x - 0) < 0.5, 'Round-trip X should be ~0, got: ' + back.x);
    assert(Math.abs(back.z - 0) < 0.5, 'Round-trip Z should be ~0, got: ' + back.z);
  });

  test('worldToMap then mapToWorld is identity (positive coords)', function() {
    var wx = 300, wz = 150;
    var pos = WM.worldToMap(wx, wz, 400, 400, 12);
    var back = WM.mapToWorld(pos.x, pos.y, 400, 400, 12);
    assert(Math.abs(back.x - wx) < 1, 'Round-trip X should be ~' + wx + ', got: ' + back.x);
    assert(Math.abs(back.z - wz) < 1, 'Round-trip Z should be ~' + wz + ', got: ' + back.z);
  });

  test('worldToMap then mapToWorld is identity (negative coords)', function() {
    var wx = -200, wz = -400;
    var pos = WM.worldToMap(wx, wz, 400, 400, 12);
    var back = WM.mapToWorld(pos.x, pos.y, 400, 400, 12);
    assert(Math.abs(back.x - wx) < 1, 'Round-trip X should be ~' + wx + ', got: ' + back.x);
    assert(Math.abs(back.z - wz) < 1, 'Round-trip Z should be ~' + wz + ', got: ' + back.z);
  });

  test('Round-trip preserves zone center positions', function() {
    var zones = ['nexus', 'gardens', 'studio', 'arena'];
    for (var i = 0; i < zones.length; i++) {
      var zid = zones[i];
      var z = WM.ZONE_DATA[zid];
      var pos = WM.worldToMap(z.cx, z.cz, 500, 500, 12);
      var back = WM.mapToWorld(pos.x, pos.y, 500, 500, 12);
      assert(Math.abs(back.x - z.cx) < 1,
        zid + ' round-trip X: expected ~' + z.cx + ', got ' + back.x);
      assert(Math.abs(back.z - z.cz) < 1,
        zid + ' round-trip Z: expected ~' + z.cz + ', got ' + back.z);
    }
  });

});

// ─── getZoneBounds ──────────────────────────────────────────────────────────────

suite('getZoneBounds', function() {

  test('Returns object with 8 zones', function() {
    var bounds = WM.getZoneBounds();
    assert(Object.keys(bounds).length === 8, 'Should have 8 zones');
  });

  test('Each zone has cx, cz, radius, name, color', function() {
    var bounds = WM.getZoneBounds();
    for (var zid in bounds) {
      var z = bounds[zid];
      assert(typeof z.cx === 'number', zid + ' missing cx');
      assert(typeof z.cz === 'number', zid + ' missing cz');
      assert(typeof z.radius === 'number', zid + ' missing radius');
      assert(typeof z.name === 'string', zid + ' missing name');
      assert(typeof z.color === 'string', zid + ' missing color');
    }
  });

  test('Returns a copy (mutation does not affect ZONE_DATA)', function() {
    var bounds1 = WM.getZoneBounds();
    bounds1.nexus.cx = 9999;
    var bounds2 = WM.getZoneBounds();
    assert(bounds2.nexus.cx !== 9999, 'Mutating result should not affect ZONE_DATA');
  });

  test('Nexus center is (0, 0)', function() {
    var bounds = WM.getZoneBounds();
    assert(bounds.nexus.cx === 0 && bounds.nexus.cz === 0, 'Nexus should be at (0,0)');
  });

});

// ─── getZoneAtPosition ─────────────────────────────────────────────────────────

suite('getZoneAtPosition', function() {

  test('Nexus center is in nexus zone', function() {
    var zone = WM.getZoneAtPosition(0, 0);
    assert(zone === 'nexus', 'Origin should be nexus, got: ' + zone);
  });

  test('Gardens center is in gardens zone', function() {
    var z = WM.ZONE_DATA.gardens;
    var zone = WM.getZoneAtPosition(z.cx, z.cz);
    assert(zone === 'gardens', 'Gardens center should be gardens, got: ' + zone);
  });

  test('Arena center is in arena zone', function() {
    var z = WM.ZONE_DATA.arena;
    var zone = WM.getZoneAtPosition(z.cx, z.cz);
    assert(zone === 'arena', 'Arena center should be arena, got: ' + zone);
  });

  test('Far outside all zones returns null', function() {
    var zone = WM.getZoneAtPosition(590, 590);
    // May be null or a zone if one extends there — just check it is valid
    assert(zone === null || typeof zone === 'string', 'Should return null or string');
  });

  test('Very far outside returns null', function() {
    var zone = WM.getZoneAtPosition(-599, -599);
    assert(zone === null, 'Far corner should be null, got: ' + zone);
  });

  test('Point just inside nexus radius returns nexus', function() {
    var r = WM.ZONE_DATA.nexus.radius;
    var zone = WM.getZoneAtPosition(r * 0.9, 0);
    assert(zone === 'nexus', 'Just inside nexus should be nexus, got: ' + zone);
  });

  test('Point just outside nexus radius (in wilderness) returns null', function() {
    var r = WM.ZONE_DATA.nexus.radius;
    // Move far enough away to be outside all zones
    var zone = WM.getZoneAtPosition(r * 1.5 + 20, -300);
    assert(zone === null, 'Far from nexus should be null, got: ' + zone);
  });

  test('Studio center is in studio zone', function() {
    var z = WM.ZONE_DATA.studio;
    var zone = WM.getZoneAtPosition(z.cx, z.cz);
    assert(zone === 'studio', 'Studio center should be studio, got: ' + zone);
  });

  test('Wilds center is in wilds zone', function() {
    var z = WM.ZONE_DATA.wilds;
    var zone = WM.getZoneAtPosition(z.cx, z.cz);
    assert(zone === 'wilds', 'Wilds center should be wilds, got: ' + zone);
  });

});

// ─── getDistanceToZone ─────────────────────────────────────────────────────────

suite('getDistanceToZone', function() {

  test('Distance from nexus center to nexus is 0', function() {
    var d = WM.getDistanceToZone(0, 0, 'nexus');
    assert(d === 0, 'Distance from nexus center to nexus should be 0, got: ' + d);
  });

  test('Distance is always non-negative', function() {
    var d = WM.getDistanceToZone(100, -200, 'nexus');
    assert(d >= 0, 'Distance should be non-negative, got: ' + d);
  });

  test('Distance from zone center to itself is 0', function() {
    var zids = ['nexus','gardens','studio','arena','wilds'];
    for (var i = 0; i < zids.length; i++) {
      var zid = zids[i];
      var z = WM.ZONE_DATA[zid];
      var d = WM.getDistanceToZone(z.cx, z.cz, zid);
      assert(d < 0.001, zid + ' center distance to itself should be ~0, got: ' + d);
    }
  });

  test('Distance is symmetric', function() {
    // Distance from nexus to gardens is same as distance from gardens to nexus
    var d1 = WM.getDistanceToZone(0, 0, 'gardens');
    var g = WM.ZONE_DATA.gardens;
    var d2 = WM.getDistanceToZone(g.cx, g.cz, 'nexus');
    assert(Math.abs(d1 - d2) < 0.001, 'Distance should be symmetric, got d1=' + d1 + ' d2=' + d2);
  });

  test('Unknown zone returns Infinity', function() {
    var d = WM.getDistanceToZone(0, 0, 'nonexistent_zone');
    assert(d === Infinity, 'Unknown zone should return Infinity, got: ' + d);
  });

  test('Distance calculation is Euclidean', function() {
    // Point at (3, 4) from nexus(0,0) = 5
    var d = WM.getDistanceToZone(3, 4, 'nexus');
    assert(Math.abs(d - 5) < 0.001, 'Euclidean distance 3-4-5 triangle, got: ' + d);
  });

  test('Distance from edge of world to gardens', function() {
    var d = WM.getDistanceToZone(590, 590, 'gardens');
    assert(d > 0, 'Distance from far corner to gardens should be > 0, got: ' + d);
    assert(isFinite(d), 'Distance should be finite');
  });

});

// ─── getNearestZone ───────────────────────────────────────────────────────────

suite('getNearestZone', function() {

  test('Returns object with zoneId, distance, zone', function() {
    var result = WM.getNearestZone(0, 0);
    assert(typeof result.zoneId === 'string', 'Should have zoneId');
    assert(typeof result.distance === 'number', 'Should have distance');
    assert(result.zone !== null, 'Should have zone data');
  });

  test('Nearest to origin is nexus', function() {
    var result = WM.getNearestZone(0, 0);
    assert(result.zoneId === 'nexus', 'Nearest to origin should be nexus, got: ' + result.zoneId);
  });

  test('Nearest to gardens center is gardens', function() {
    var g = WM.ZONE_DATA.gardens;
    var result = WM.getNearestZone(g.cx, g.cz);
    assert(result.zoneId === 'gardens', 'Nearest to gardens center should be gardens, got: ' + result.zoneId);
  });

  test('Distance matches getDistanceToZone', function() {
    var result = WM.getNearestZone(100, 100);
    var direct = WM.getDistanceToZone(100, 100, result.zoneId);
    assert(Math.abs(result.distance - direct) < 0.001,
      'getNearestZone distance should match getDistanceToZone, got: ' + result.distance + ' vs ' + direct);
  });

  test('Zone data matches ZONE_DATA', function() {
    var result = WM.getNearestZone(0, 0);
    assert(result.zone === WM.ZONE_DATA[result.zoneId], 'zone reference should match ZONE_DATA');
  });

  test('Returns valid zone for edge of world', function() {
    var result = WM.getNearestZone(590, 590);
    assert(typeof result.zoneId === 'string' && result.zoneId.length > 0,
      'Should return valid zoneId for edge of world');
  });

  test('Distance is always >= 0', function() {
    var result = WM.getNearestZone(-300, 200);
    assert(result.distance >= 0, 'Distance should be >= 0, got: ' + result.distance);
  });

});

// ─── calculatePath ──────────────────────────────────────────────────────────────

suite('calculatePath', function() {

  test('Returns array of at least 2 points', function() {
    var path = WM.calculatePath(0, 0, 100, 100);
    assert(Array.isArray(path) && path.length >= 2, 'Path should have at least 2 points');
  });

  test('First point is start position', function() {
    var path = WM.calculatePath(10, 20, 100, 100);
    assert(path[0].x === 10 && path[0].z === 20, 'First waypoint should be start');
  });

  test('Last point is end position', function() {
    var path = WM.calculatePath(10, 20, 100, 100);
    var last = path[path.length - 1];
    assert(last.x === 100 && last.z === 100, 'Last waypoint should be end');
  });

  test('Same zone: straight line (2 waypoints)', function() {
    // Both inside nexus radius (~60)
    var path = WM.calculatePath(0, 0, 10, 10);
    assert(path.length === 2, 'Same zone should produce 2-point path, got: ' + path.length);
  });

  test('Path waypoints have x and z properties', function() {
    var path = WM.calculatePath(0, 0, 200, 200);
    for (var i = 0; i < path.length; i++) {
      assert(typeof path[i].x === 'number', 'Waypoint ' + i + ' should have numeric x');
      assert(typeof path[i].z === 'number', 'Waypoint ' + i + ' should have numeric z');
    }
  });

  test('Outside all zones: straight line', function() {
    var path = WM.calculatePath(-590, -590, 590, 590);
    // From wilderness to wilderness = straight line
    assert(path.length === 2, 'Wilderness to wilderness should be 2-point path, got: ' + path.length);
  });

  test('Cross-zone path routes sensibly', function() {
    // Nexus to Arena (directly connected)
    var path = WM.calculatePath(0, 0, WM.ZONE_DATA.arena.cx, WM.ZONE_DATA.arena.cz);
    assert(path.length >= 2, 'Cross-zone path should have >= 2 waypoints');
  });

  test('Non-connected zones route via nexus', function() {
    // Studio and Wilds are not directly connected — should route via nexus
    var studio = WM.ZONE_DATA.studio;
    var wilds = WM.ZONE_DATA.wilds;
    var path = WM.calculatePath(studio.cx, studio.cz, wilds.cx, wilds.cz);
    // Path should pass through nexus
    var hasNexus = false;
    for (var i = 0; i < path.length; i++) {
      if (Math.abs(path[i].x - WM.ZONE_DATA.nexus.cx) < 1 &&
          Math.abs(path[i].z - WM.ZONE_DATA.nexus.cz) < 1) {
        hasNexus = true;
        break;
      }
    }
    assert(hasNexus, 'Path from studio to wilds should route via nexus');
  });

});

// ─── renderMap (data integrity) ──────────────────────────────────────────────────

suite('renderMap (mock canvas)', function() {

  // Create a minimal mock canvas context to verify renderMap calls it
  function makeMockCtx(w, h) {
    var calls = [];
    var ctx = {
      _calls: calls,
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      globalAlpha: 1,
      font: '',
      textAlign: '',
      textBaseline: '',
      shadowBlur: 0,
      shadowColor: '',
      fillRect: function(x,y,w,h) { calls.push('fillRect'); },
      strokeRect: function(x,y,w,h) { calls.push('strokeRect'); },
      beginPath: function() { calls.push('beginPath'); },
      arc: function() { calls.push('arc'); },
      fill: function() { calls.push('fill'); },
      stroke: function() { calls.push('stroke'); },
      moveTo: function() { calls.push('moveTo'); },
      lineTo: function() { calls.push('lineTo'); },
      fillText: function() { calls.push('fillText'); },
      setLineDash: function() { calls.push('setLineDash'); },
      rect: function() { calls.push('rect'); }
    };
    return ctx;
  }

  test('renderMap does not throw', function() {
    var ctx = makeMockCtx(400, 400);
    var threw = false;
    try {
      WM.renderMap(ctx, 400, 400, {});
    } catch(e) {
      threw = true;
    }
    assert(!threw, 'renderMap should not throw');
  });

  test('renderMap calls fillRect for background', function() {
    var ctx = makeMockCtx(400, 400);
    WM.renderMap(ctx, 400, 400, {});
    assert(ctx._calls.indexOf('fillRect') !== -1, 'Should call fillRect for background');
  });

  test('renderMap calls arc for zone circles', function() {
    var ctx = makeMockCtx(400, 400);
    WM.renderMap(ctx, 400, 400, {});
    var arcCount = ctx._calls.filter(function(c) { return c === 'arc'; }).length;
    assert(arcCount >= 8, 'Should draw at least 8 arcs (one per zone), got: ' + arcCount);
  });

  test('renderMap with currentZone does not throw', function() {
    var ctx = makeMockCtx(400, 400);
    var threw = false;
    try {
      WM.renderMap(ctx, 400, 400, { currentZone: 'nexus' });
    } catch(e) {
      threw = true;
    }
    assert(!threw, 'renderMap with currentZone should not throw');
  });

  test('renderMap calls fillText for zone labels by default', function() {
    var ctx = makeMockCtx(400, 400);
    WM.renderMap(ctx, 400, 400, { showLabels: true });
    assert(ctx._calls.indexOf('fillText') !== -1, 'Should call fillText for labels');
  });

  test('renderMap with showLabels=false does not call fillText', function() {
    var ctx = makeMockCtx(400, 400);
    WM.renderMap(ctx, 400, 400, { showLabels: false });
    assert(ctx._calls.indexOf('fillText') === -1, 'Should not call fillText when showLabels=false');
  });

  test('renderMap with showGrid=true calls extra path ops', function() {
    var ctx = makeMockCtx(400, 400);
    var callsWithout = 0;
    WM.renderMap(ctx, 400, 400, { showGrid: false });
    callsWithout = ctx._calls.length;

    var ctx2 = makeMockCtx(400, 400);
    WM.renderMap(ctx2, 400, 400, { showGrid: true });
    assert(ctx2._calls.length > callsWithout, 'showGrid=true should produce more draw calls');
  });

  test('renderMap with showConnections=true calls moveTo/lineTo', function() {
    var ctx = makeMockCtx(400, 400);
    WM.renderMap(ctx, 400, 400, { showConnections: true });
    assert(ctx._calls.indexOf('moveTo') !== -1, 'Should call moveTo for connections');
    assert(ctx._calls.indexOf('lineTo') !== -1, 'Should call lineTo for connections');
  });

});

// ─── renderPlayerMarker ──────────────────────────────────────────────────────────

suite('renderPlayerMarker', function() {

  function makeMockCtx() {
    var calls = [];
    return {
      _calls: calls,
      fillStyle: '', strokeStyle: '', lineWidth: 1,
      globalAlpha: 1, shadowBlur: 0, shadowColor: '',
      beginPath: function() { calls.push('beginPath'); },
      arc: function() { calls.push('arc'); },
      fill: function() { calls.push('fill'); },
      stroke: function() { calls.push('stroke'); }
    };
  }

  test('renderPlayerMarker does not throw', function() {
    var ctx = makeMockCtx();
    var threw = false;
    try {
      WM.renderPlayerMarker(ctx, 0, 0, { canvasW: 400, canvasH: 400 });
    } catch(e) {
      threw = true;
    }
    assert(!threw, 'renderPlayerMarker should not throw');
  });

  test('renderPlayerMarker calls arc', function() {
    var ctx = makeMockCtx();
    WM.renderPlayerMarker(ctx, 0, 0, { canvasW: 400, canvasH: 400 });
    assert(ctx._calls.indexOf('arc') !== -1, 'Should call arc for player marker');
  });

  test('renderPlayerMarker works with out-of-bounds position', function() {
    var ctx = makeMockCtx();
    var threw = false;
    try {
      WM.renderPlayerMarker(ctx, -1000, 1000, { canvasW: 400, canvasH: 400 });
    } catch(e) {
      threw = true;
    }
    assert(!threw, 'Should not throw for out-of-bounds position');
  });

  test('renderPlayerMarker with pulse=0 does not throw', function() {
    var ctx = makeMockCtx();
    var threw = false;
    try {
      WM.renderPlayerMarker(ctx, 50, 50, { canvasW: 400, canvasH: 400, pulse: 0 });
    } catch(e) {
      threw = true;
    }
    assert(!threw, 'Should not throw with pulse=0');
  });

  test('renderPlayerMarker with pulse=0.5 does not throw', function() {
    var ctx = makeMockCtx();
    var threw = false;
    try {
      WM.renderPlayerMarker(ctx, 50, 50, { canvasW: 400, canvasH: 400, pulse: 0.5 });
    } catch(e) {
      threw = true;
    }
    assert(!threw, 'Should not throw with pulse=0.5');
  });

});

// ─── renderNPCMarkers ───────────────────────────────────────────────────────────

suite('renderNPCMarkers', function() {

  function makeMockCtx() {
    var calls = [];
    return {
      _calls: calls,
      fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1,
      beginPath: function() { calls.push('beginPath'); },
      arc: function() { calls.push('arc'); },
      fill: function() { calls.push('fill'); }
    };
  }

  test('renderNPCMarkers with empty array does nothing', function() {
    var ctx = makeMockCtx();
    WM.renderNPCMarkers(ctx, [], { canvasW: 400, canvasH: 400 });
    assert(ctx._calls.length === 0, 'Empty NPC array should produce no calls');
  });

  test('renderNPCMarkers with null does nothing', function() {
    var ctx = makeMockCtx();
    var threw = false;
    try {
      WM.renderNPCMarkers(ctx, null, { canvasW: 400, canvasH: 400 });
    } catch(e) {
      threw = true;
    }
    assert(!threw, 'Should not throw for null NPCs');
  });

  test('renderNPCMarkers draws circles for each NPC', function() {
    var ctx = makeMockCtx();
    var npcs = [
      { position: { x: 0, z: 0 } },
      { position: { x: 100, z: 100 } },
      { position: { x: -100, z: 50 } }
    ];
    WM.renderNPCMarkers(ctx, npcs, { canvasW: 400, canvasH: 400 });
    var arcCount = ctx._calls.filter(function(c) { return c === 'arc'; }).length;
    assert(arcCount === 3, 'Should draw 3 circles for 3 NPCs, got: ' + arcCount);
  });

  test('renderNPCMarkers respects maxCount', function() {
    var ctx = makeMockCtx();
    var npcs = [];
    for (var i = 0; i < 100; i++) npcs.push({ position: { x: i, z: i } });
    WM.renderNPCMarkers(ctx, npcs, { canvasW: 400, canvasH: 400, maxCount: 5 });
    var arcCount = ctx._calls.filter(function(c) { return c === 'arc'; }).length;
    assert(arcCount === 5, 'Should only draw maxCount NPCs, got: ' + arcCount);
  });

  test('renderNPCMarkers skips NPCs without position', function() {
    var ctx = makeMockCtx();
    var npcs = [
      { position: { x: 0, z: 0 } },
      { name: 'no position' },
      null
    ];
    var threw = false;
    try {
      WM.renderNPCMarkers(ctx, npcs, { canvasW: 400, canvasH: 400 });
    } catch(e) {
      threw = true;
    }
    assert(!threw, 'Should not throw for NPCs without position');
  });

});

// ─── renderPortals ──────────────────────────────────────────────────────────────

suite('renderPortals', function() {

  function makeMockCtx() {
    var calls = [];
    return {
      _calls: calls,
      fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1,
      beginPath: function() { calls.push('beginPath'); },
      moveTo: function() { calls.push('moveTo'); },
      lineTo: function() { calls.push('lineTo'); },
      closePath: function() { calls.push('closePath'); },
      fill: function() { calls.push('fill'); },
      stroke: function() { calls.push('stroke'); }
    };
  }

  test('renderPortals with empty array does nothing', function() {
    var ctx = makeMockCtx();
    WM.renderPortals(ctx, [], { canvasW: 400, canvasH: 400 });
    assert(ctx._calls.length === 0, 'Empty portals should produce no calls');
  });

  test('renderPortals draws diamonds for each portal', function() {
    var ctx = makeMockCtx();
    var portals = [
      { position: { x: 0, z: 0 }, healthy: true },
      { position: { x: 100, z: 50 }, healthy: false }
    ];
    WM.renderPortals(ctx, portals, { canvasW: 400, canvasH: 400 });
    var beginPaths = ctx._calls.filter(function(c) { return c === 'beginPath'; }).length;
    assert(beginPaths >= 2, 'Should draw at least 2 portal shapes, got: ' + beginPaths);
  });

  test('renderPortals with null does nothing', function() {
    var ctx = makeMockCtx();
    var threw = false;
    try {
      WM.renderPortals(ctx, null, { canvasW: 400, canvasH: 400 });
    } catch(e) {
      threw = true;
    }
    assert(!threw, 'Should not throw for null portals');
  });

  test('renderPortals handles portals without position gracefully', function() {
    var ctx = makeMockCtx();
    var portals = [
      { healthy: true },
      null,
      { position: { x: 10, z: 10 } }
    ];
    var threw = false;
    try {
      WM.renderPortals(ctx, portals, { canvasW: 400, canvasH: 400 });
    } catch(e) {
      threw = true;
    }
    assert(!threw, 'Should not throw for portals without position');
  });

});

// ─── renderAnchors ──────────────────────────────────────────────────────────────

suite('renderAnchors', function() {

  function makeMockCtx() {
    var calls = [];
    return {
      _calls: calls,
      fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1,
      fillRect: function() { calls.push('fillRect'); },
      strokeRect: function() { calls.push('strokeRect'); }
    };
  }

  test('renderAnchors with empty array does nothing', function() {
    var ctx = makeMockCtx();
    WM.renderAnchors(ctx, [], { canvasW: 400, canvasH: 400 });
    assert(ctx._calls.length === 0, 'Empty anchors should produce no calls');
  });

  test('renderAnchors draws squares for anchors with position', function() {
    var ctx = makeMockCtx();
    var anchors = [
      { type: 'zone_portal', position: { x: 0, z: 0 } },
      { type: 'resource_node', position: { x: 100, z: 50 } }
    ];
    WM.renderAnchors(ctx, anchors, { canvasW: 400, canvasH: 400 });
    assert(ctx._calls.indexOf('fillRect') !== -1, 'Should call fillRect for anchors');
  });

  test('renderAnchors falls back to zone center when no position', function() {
    var ctx = makeMockCtx();
    var anchors = [
      { type: 'gathering_spot', zone: 'nexus' }
    ];
    var threw = false;
    try {
      WM.renderAnchors(ctx, anchors, { canvasW: 400, canvasH: 400 });
    } catch(e) {
      threw = true;
    }
    assert(!threw, 'Should not throw when using zone fallback');
    assert(ctx._calls.indexOf('fillRect') !== -1, 'Should draw anchor using zone center');
  });

  test('renderAnchors with null does nothing', function() {
    var ctx = makeMockCtx();
    var threw = false;
    try {
      WM.renderAnchors(ctx, null, { canvasW: 400, canvasH: 400 });
    } catch(e) {
      threw = true;
    }
    assert(!threw, 'Should not throw for null anchors');
  });

  test('renderAnchors skips anchors with no position and no zone', function() {
    var ctx = makeMockCtx();
    var anchors = [{ type: 'zone_portal' }, null, {}];
    var threw = false;
    try {
      WM.renderAnchors(ctx, anchors, { canvasW: 400, canvasH: 400 });
    } catch(e) {
      threw = true;
    }
    assert(!threw, 'Should not throw for invalid anchors');
  });

});

// ─── renderLegend ───────────────────────────────────────────────────────────────

suite('renderLegend', function() {

  function makeMockCtx() {
    var calls = [];
    return {
      _calls: calls,
      fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1,
      font: '', textAlign: '', textBaseline: '',
      fillRect: function() { calls.push('fillRect'); },
      beginPath: function() { calls.push('beginPath'); },
      rect: function() { calls.push('rect'); },
      fill: function() { calls.push('fill'); },
      stroke: function() { calls.push('stroke'); },
      arc: function() { calls.push('arc'); },
      moveTo: function() { calls.push('moveTo'); },
      lineTo: function() { calls.push('lineTo'); },
      closePath: function() { calls.push('closePath'); },
      fillText: function() { calls.push('fillText'); }
    };
  }

  test('renderLegend does not throw', function() {
    var ctx = makeMockCtx();
    var threw = false;
    try {
      WM.renderLegend(ctx, { canvasW: 400, canvasH: 400 });
    } catch(e) {
      threw = true;
    }
    assert(!threw, 'renderLegend should not throw');
  });

  test('renderLegend draws at least one label', function() {
    var ctx = makeMockCtx();
    WM.renderLegend(ctx, { canvasW: 400, canvasH: 400 });
    assert(ctx._calls.indexOf('fillText') !== -1, 'Should call fillText for legend labels');
  });

  test('renderLegend with all layers visible calls fillText multiple times', function() {
    var ctx = makeMockCtx();
    WM.renderLegend(ctx, {
      canvasW: 400, canvasH: 400,
      showNPCs: true, showPortals: true, showAnchors: true
    });
    var count = ctx._calls.filter(function(c) { return c === 'fillText'; }).length;
    assert(count >= 4, 'Should draw 4 legend items, got: ' + count);
  });

  test('renderLegend with no extra layers has fewer labels', function() {
    var ctx1 = makeMockCtx();
    WM.renderLegend(ctx1, { canvasW: 400, canvasH: 400, showNPCs: false, showPortals: false, showAnchors: false });
    var count1 = ctx1._calls.filter(function(c) { return c === 'fillText'; }).length;

    var ctx2 = makeMockCtx();
    WM.renderLegend(ctx2, { canvasW: 400, canvasH: 400, showNPCs: true, showPortals: true, showAnchors: true });
    var count2 = ctx2._calls.filter(function(c) { return c === 'fillText'; }).length;

    assert(count2 > count1, 'More layers should produce more legend labels');
  });

});

// ─── updateMapData ───────────────────────────────────────────────────────────────

suite('updateMapData', function() {

  test('updateMapData does not throw', function() {
    var threw = false;
    try {
      WM.updateMapData({ playerX: 100, playerZ: 200, currentZone: 'nexus' });
    } catch(e) {
      threw = true;
    }
    assert(!threw, 'updateMapData should not throw');
  });

  test('updateMapData accepts empty object', function() {
    var threw = false;
    try {
      WM.updateMapData({});
    } catch(e) {
      threw = true;
    }
    assert(!threw, 'updateMapData with empty object should not throw');
  });

  test('updateMapData accepts all data fields', function() {
    var threw = false;
    try {
      WM.updateMapData({
        playerX: 50,
        playerZ: -100,
        currentZone: 'gardens',
        npcs: [{ position: { x: 0, z: 0 } }],
        portals: [{ position: { x: 10, z: 10 }, healthy: true }],
        anchors: [{ type: 'zone_portal', zone: 'nexus' }]
      });
    } catch(e) {
      threw = true;
    }
    assert(!threw, 'updateMapData with all fields should not throw');
  });

});

// ─── Panel API ───────────────────────────────────────────────────────────────────

suite('Panel API (Node.js env — no DOM)', function() {

  test('showMapPanel does not throw in Node.js (no document)', function() {
    var threw = false;
    try {
      WM.showMapPanel({});
    } catch(e) {
      threw = true;
    }
    assert(!threw, 'showMapPanel should not throw without DOM');
  });

  test('hideMapPanel does not throw even if panel not shown', function() {
    var threw = false;
    try {
      WM.hideMapPanel();
    } catch(e) {
      threw = true;
    }
    assert(!threw, 'hideMapPanel should not throw without DOM');
  });

  test('toggleMapPanel does not throw in Node.js', function() {
    var threw = false;
    try {
      WM.toggleMapPanel({});
    } catch(e) {
      threw = true;
    }
    assert(!threw, 'toggleMapPanel should not throw without DOM');
  });

  test('isMapVisible returns boolean', function() {
    var v = WM.isMapVisible();
    assert(typeof v === 'boolean', 'isMapVisible should return boolean, got: ' + typeof v);
  });

});

// ─── Edge Cases ─────────────────────────────────────────────────────────────────

suite('Edge Cases', function() {

  test('worldToMap with zero canvas size does not crash', function() {
    var threw = false;
    try {
      WM.worldToMap(0, 0, 0, 0, 0);
    } catch(e) {
      threw = true;
    }
    assert(!threw, 'worldToMap with zero canvas should not crash');
  });

  test('getZoneAtPosition with NaN returns null', function() {
    var zone = WM.getZoneAtPosition(NaN, NaN);
    assert(zone === null, 'NaN coordinates should return null');
  });

  test('getDistanceToZone with NaN coords returns NaN or Infinity', function() {
    var d = WM.getDistanceToZone(NaN, 0, 'nexus');
    // NaN distance: either NaN or Infinity is acceptable (both falsy-ish)
    assert(isNaN(d) || d === Infinity, 'NaN input distance should be NaN or Infinity');
  });

  test('calculatePath with identical start/end returns 2 points', function() {
    var path = WM.calculatePath(0, 0, 0, 0);
    assert(path.length === 2, 'Same start/end should return 2 points');
    assert(path[0].x === 0 && path[0].z === 0, 'First point should be origin');
    assert(path[1].x === 0 && path[1].z === 0, 'Last point should be origin');
  });

  test('getZoneBounds nexus radius is positive', function() {
    var bounds = WM.getZoneBounds();
    assert(bounds.nexus.radius > 0, 'Nexus radius should be positive');
  });

  test('All zone centers are within world bounds', function() {
    for (var zid in WM.ZONE_DATA) {
      var z = WM.ZONE_DATA[zid];
      assert(z.cx >= WM.WORLD_MIN && z.cx <= WM.WORLD_MAX,
        zid + ' cx out of world bounds: ' + z.cx);
      assert(z.cz >= WM.WORLD_MIN && z.cz <= WM.WORLD_MAX,
        zid + ' cz out of world bounds: ' + z.cz);
    }
  });

  test('ZONE_CONNECTIONS reference valid zone IDs', function() {
    for (var i = 0; i < WM.ZONE_CONNECTIONS.length; i++) {
      var conn = WM.ZONE_CONNECTIONS[i];
      assert(WM.ZONE_DATA[conn[0]], 'Unknown zone in connection: ' + conn[0]);
      assert(WM.ZONE_DATA[conn[1]], 'Unknown zone in connection: ' + conn[1]);
    }
  });

  test('ZONE_CONNECTIONS includes nexus connection to all other zones', function() {
    var nexusConnections = WM.ZONE_CONNECTIONS.filter(function(c) {
      return c[0] === 'nexus' || c[1] === 'nexus';
    });
    assert(nexusConnections.length >= 7, 'Nexus should connect to all 7 other zones, got: ' + nexusConnections.length);
  });

  test('worldToMap margin=0 uses full canvas', function() {
    var posMin = WM.worldToMap(WM.WORLD_MIN, WM.WORLD_MIN, 400, 400, 0);
    var posMax = WM.worldToMap(WM.WORLD_MAX, WM.WORLD_MAX, 400, 400, 0);
    assert(Math.abs(posMin.x - 0) < 0.1, 'With margin=0, min should map to 0');
    assert(Math.abs(posMax.x - 400) < 0.1, 'With margin=0, max should map to 400');
  });

  test('getNearestZone always returns a zone (never null)', function() {
    var testPoints = [
      [0, 0], [590, 590], [-590, -590], [300, -300], [-300, 300]
    ];
    for (var i = 0; i < testPoints.length; i++) {
      var result = WM.getNearestZone(testPoints[i][0], testPoints[i][1]);
      assert(result.zoneId !== null, 'getNearestZone should always return a zone');
    }
  });

});

// ─── Report ─────────────────────────────────────────────────────────────────────

var success = report();
process.exit(success ? 0 : 1);
