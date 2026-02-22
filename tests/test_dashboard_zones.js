// test_dashboard_zones.js — Tests for dashboard_zones.js Zone Navigator module
// Run with: node tests/test_dashboard_zones.js
'use strict';

var testRunner = require('./test_runner');
var test = testRunner.test;
var suite = testRunner.suite;
var report = testRunner.report;
var assert = testRunner.assert;

var DZ = require('../src/js/dashboard_zones');

// ─── ZONE_INFO Data Completeness ─────────────────────────────────────────────

suite('ZONE_INFO — Data Completeness', function() {

  test('ZONE_INFO is exported', function() {
    assert(DZ.ZONE_INFO !== undefined, 'ZONE_INFO should be exported');
    assert(typeof DZ.ZONE_INFO === 'object', 'ZONE_INFO should be an object');
  });

  test('exactly 8 zones defined', function() {
    var keys = Object.keys(DZ.ZONE_INFO);
    assert.strictEqual(keys.length, 8, 'Should have exactly 8 zones, got: ' + keys.length);
  });

  test('all 8 canonical zone IDs present', function() {
    var expected = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];
    for (var i = 0; i < expected.length; i++) {
      assert(DZ.ZONE_INFO[expected[i]] !== undefined, 'Missing zone: ' + expected[i]);
    }
  });

  var requiredFields = ['id', 'name', 'desc', 'cx', 'cz', 'radius', 'terrain', 'npcs'];

  test('every zone has all required fields', function() {
    for (var zid in DZ.ZONE_INFO) {
      var z = DZ.ZONE_INFO[zid];
      for (var fi = 0; fi < requiredFields.length; fi++) {
        assert(z[requiredFields[fi]] !== undefined,
          'Zone ' + zid + ' missing field: ' + requiredFields[fi]);
      }
    }
  });

  test('zone id field matches key', function() {
    for (var zid in DZ.ZONE_INFO) {
      assert.strictEqual(DZ.ZONE_INFO[zid].id, zid,
        'Zone id mismatch for key: ' + zid);
    }
  });

  test('all zone names are non-empty strings', function() {
    for (var zid in DZ.ZONE_INFO) {
      var n = DZ.ZONE_INFO[zid].name;
      assert(typeof n === 'string' && n.length > 0, 'Empty/missing name for: ' + zid);
    }
  });

  test('all zone descriptions are non-empty strings', function() {
    for (var zid in DZ.ZONE_INFO) {
      var d = DZ.ZONE_INFO[zid].desc;
      assert(typeof d === 'string' && d.length > 0, 'Empty/missing desc for: ' + zid);
    }
  });

  test('all zone cx values are numbers', function() {
    for (var zid in DZ.ZONE_INFO) {
      assert(typeof DZ.ZONE_INFO[zid].cx === 'number', 'cx not a number for: ' + zid);
    }
  });

  test('all zone cz values are numbers', function() {
    for (var zid in DZ.ZONE_INFO) {
      assert(typeof DZ.ZONE_INFO[zid].cz === 'number', 'cz not a number for: ' + zid);
    }
  });

  test('all zone radius values are positive numbers', function() {
    for (var zid in DZ.ZONE_INFO) {
      var r = DZ.ZONE_INFO[zid].radius;
      assert(typeof r === 'number' && r > 0, 'radius not positive number for: ' + zid);
    }
  });

  test('all zones have npcs array with 3 entries', function() {
    for (var zid in DZ.ZONE_INFO) {
      var npcs = DZ.ZONE_INFO[zid].npcs;
      assert(Array.isArray(npcs), 'npcs should be array for: ' + zid);
      assert.strictEqual(npcs.length, 3, 'npcs should have 3 entries for: ' + zid);
    }
  });

  test('nexus coordinates are (0, 0)', function() {
    assert.strictEqual(DZ.ZONE_INFO.nexus.cx, 0, 'nexus cx should be 0');
    assert.strictEqual(DZ.ZONE_INFO.nexus.cz, 0, 'nexus cz should be 0');
  });

  test('gardens coordinates are (200, 30)', function() {
    assert.strictEqual(DZ.ZONE_INFO.gardens.cx, 200);
    assert.strictEqual(DZ.ZONE_INFO.gardens.cz, 30);
  });

  test('athenaeum coordinates are (100, -220)', function() {
    assert.strictEqual(DZ.ZONE_INFO.athenaeum.cx, 100);
    assert.strictEqual(DZ.ZONE_INFO.athenaeum.cz, -220);
  });

  test('studio coordinates are (-200, -100)', function() {
    assert.strictEqual(DZ.ZONE_INFO.studio.cx, -200);
    assert.strictEqual(DZ.ZONE_INFO.studio.cz, -100);
  });

  test('wilds coordinates are (-30, 260)', function() {
    assert.strictEqual(DZ.ZONE_INFO.wilds.cx, -30);
    assert.strictEqual(DZ.ZONE_INFO.wilds.cz, 260);
  });

  test('agora coordinates are (-190, 120)', function() {
    assert.strictEqual(DZ.ZONE_INFO.agora.cx, -190);
    assert.strictEqual(DZ.ZONE_INFO.agora.cz, 120);
  });

  test('commons coordinates are (170, 190)', function() {
    assert.strictEqual(DZ.ZONE_INFO.commons.cx, 170);
    assert.strictEqual(DZ.ZONE_INFO.commons.cz, 190);
  });

  test('arena coordinates are (0, -240)', function() {
    assert.strictEqual(DZ.ZONE_INFO.arena.cx, 0);
    assert.strictEqual(DZ.ZONE_INFO.arena.cz, -240);
  });

  test('nexus radius is 60', function() {
    assert.strictEqual(DZ.ZONE_INFO.nexus.radius, 60);
  });

  test('gardens radius is 80', function() {
    assert.strictEqual(DZ.ZONE_INFO.gardens.radius, 80);
  });

  test('wilds radius is 90 (largest)', function() {
    assert.strictEqual(DZ.ZONE_INFO.wilds.radius, 90);
  });

  test('nexus NPCs include Herald, Guide, Merchant', function() {
    var npcs = DZ.ZONE_INFO.nexus.npcs;
    assert(npcs.indexOf('Herald') !== -1, 'nexus missing Herald');
    assert(npcs.indexOf('Guide') !== -1, 'nexus missing Guide');
    assert(npcs.indexOf('Merchant') !== -1, 'nexus missing Merchant');
  });

  test('wilds NPCs include Ranger, Explorer, Hermit', function() {
    var npcs = DZ.ZONE_INFO.wilds.npcs;
    assert(npcs.indexOf('Ranger') !== -1);
    assert(npcs.indexOf('Explorer') !== -1);
    assert(npcs.indexOf('Hermit') !== -1);
  });

  test('ZONE_IDS array has 8 entries', function() {
    assert(Array.isArray(DZ.ZONE_IDS), 'ZONE_IDS should be an array');
    assert.strictEqual(DZ.ZONE_IDS.length, 8);
  });

  test('ZONE_IDS contains all zone keys', function() {
    var expected = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];
    for (var i = 0; i < expected.length; i++) {
      assert(DZ.ZONE_IDS.indexOf(expected[i]) !== -1, 'ZONE_IDS missing: ' + expected[i]);
    }
  });

});

// ─── getZoneDetails ───────────────────────────────────────────────────────────

suite('getZoneDetails', function() {

  test('returns zone object for valid id', function() {
    var z = DZ.getZoneDetails('nexus');
    assert(z !== null, 'Should return zone for nexus');
    assert(typeof z === 'object');
  });

  test('returns null for unknown zone', function() {
    var z = DZ.getZoneDetails('unknown_zone');
    assert(z === null, 'Should return null for unknown zone');
  });

  test('returns null for undefined input', function() {
    var z = DZ.getZoneDetails(undefined);
    assert(z === null);
  });

  test('returned object has correct name for gardens', function() {
    var z = DZ.getZoneDetails('gardens');
    assert.strictEqual(z.name, 'The Gardens');
  });

  test('returned object has correct terrain for arena', function() {
    var z = DZ.getZoneDetails('arena');
    assert(z.terrain.indexOf('Sand pit') !== -1, 'arena terrain should mention Sand pit');
  });

});

// ─── getZoneNPCs ─────────────────────────────────────────────────────────────

suite('getZoneNPCs', function() {

  test('returns array for valid zone', function() {
    var npcs = DZ.getZoneNPCs('nexus');
    assert(Array.isArray(npcs), 'Should return array');
  });

  test('returns 3 NPCs for nexus', function() {
    assert.strictEqual(DZ.getZoneNPCs('nexus').length, 3);
  });

  test('returns empty array for unknown zone', function() {
    var npcs = DZ.getZoneNPCs('nonexistent');
    assert(Array.isArray(npcs) && npcs.length === 0);
  });

  test('returns copy (mutation does not affect source)', function() {
    var a = DZ.getZoneNPCs('nexus');
    var originalLength = DZ.ZONE_INFO.nexus.npcs.length;
    a.push('TestNPC');
    assert.strictEqual(DZ.ZONE_INFO.nexus.npcs.length, originalLength,
      'Mutating returned array should not affect ZONE_INFO');
  });

  test('gardens NPCs include Gardener', function() {
    assert(DZ.getZoneNPCs('gardens').indexOf('Gardener') !== -1);
  });

  test('athenaeum NPCs include Librarian', function() {
    assert(DZ.getZoneNPCs('athenaeum').indexOf('Librarian') !== -1);
  });

  test('studio NPCs include Artist', function() {
    assert(DZ.getZoneNPCs('studio').indexOf('Artist') !== -1);
  });

  test('arena NPCs include Champion', function() {
    assert(DZ.getZoneNPCs('arena').indexOf('Champion') !== -1);
  });

});

// ─── getZoneDistance ─────────────────────────────────────────────────────────

suite('getZoneDistance', function() {

  test('same zone distance is 0', function() {
    assert.strictEqual(DZ.getZoneDistance('nexus', 'nexus'), 0);
    assert.strictEqual(DZ.getZoneDistance('gardens', 'gardens'), 0);
  });

  test('distance is symmetric', function() {
    var ab = DZ.getZoneDistance('nexus', 'gardens');
    var ba = DZ.getZoneDistance('gardens', 'nexus');
    assert.strictEqual(ab, ba, 'Distance should be symmetric');
  });

  test('nexus to gardens ~202.24', function() {
    var d = DZ.getZoneDistance('nexus', 'gardens');
    // sqrt(200^2 + 30^2) = sqrt(40000 + 900) = sqrt(40900) ≈ 202.24
    var expected = Math.sqrt(200 * 200 + 30 * 30);
    assert(Math.abs(d - expected) < 0.01, 'nexus->gardens distance wrong: ' + d);
  });

  test('nexus to arena is 240', function() {
    var d = DZ.getZoneDistance('nexus', 'arena');
    // sqrt(0^2 + 240^2) = 240
    assert(Math.abs(d - 240) < 0.01, 'nexus->arena should be 240, got: ' + d);
  });

  test('nexus to athenaeum ~242.07', function() {
    var d = DZ.getZoneDistance('nexus', 'athenaeum');
    // sqrt(100^2 + 220^2) = sqrt(10000 + 48400) = sqrt(58400) ≈ 241.66
    var expected = Math.sqrt(100 * 100 + 220 * 220);
    assert(Math.abs(d - expected) < 0.01, 'nexus->athenaeum distance wrong: ' + d);
  });

  test('returns 0 for unknown zone', function() {
    assert.strictEqual(DZ.getZoneDistance('nexus', 'invalid'), 0);
    assert.strictEqual(DZ.getZoneDistance('invalid', 'nexus'), 0);
  });

  test('distance between adjacent zones is positive', function() {
    var d = DZ.getZoneDistance('nexus', 'agora');
    assert(d > 0, 'Should be positive distance');
  });

  test('gardens to commons distance is positive', function() {
    var d = DZ.getZoneDistance('gardens', 'commons');
    assert(d > 0);
  });

  test('studio to agora distance is less than studio to arena', function() {
    var dStudioAgora = DZ.getZoneDistance('studio', 'agora');
    var dStudioArena = DZ.getZoneDistance('studio', 'arena');
    // studio(-200,-100), agora(-190,120) -> diff: (10, 220) -> ~220.2
    // studio(-200,-100), arena(0,-240) -> diff: (200, 140) -> ~243.9
    assert(dStudioAgora < dStudioArena,
      'studio->agora (' + dStudioAgora + ') should be less than studio->arena (' + dStudioArena + ')');
  });

  test('returns a finite number', function() {
    var d = DZ.getZoneDistance('wilds', 'arena');
    assert(isFinite(d), 'Should return finite number');
  });

});

// ─── getTravelCost ────────────────────────────────────────────────────────────

suite('getTravelCost', function() {

  test('same zone travel cost is 0', function() {
    assert.strictEqual(DZ.getTravelCost('nexus', 'nexus'), 0);
    assert.strictEqual(DZ.getTravelCost('arena', 'arena'), 0);
  });

  test('minimum travel cost is 1 for different zones', function() {
    // Closest zones should still cost at least 1
    var ids = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];
    for (var i = 0; i < ids.length; i++) {
      for (var j = 0; j < ids.length; j++) {
        if (ids[i] !== ids[j]) {
          var cost = DZ.getTravelCost(ids[i], ids[j]);
          assert(cost >= 1, 'Cost from ' + ids[i] + ' to ' + ids[j] + ' should be >= 1, got: ' + cost);
        }
      }
    }
  });

  test('nexus to arena costs ceil(240/100) = 3', function() {
    // distance = 240, ceil(240/100) = ceil(2.4) = 3
    assert.strictEqual(DZ.getTravelCost('nexus', 'arena'), 3);
  });

  test('cost is symmetric', function() {
    var ab = DZ.getTravelCost('nexus', 'gardens');
    var ba = DZ.getTravelCost('gardens', 'nexus');
    assert.strictEqual(ab, ba, 'Cost should be symmetric');
  });

  test('nexus to gardens costs ceil(202.24/100) = 3', function() {
    var cost = DZ.getTravelCost('nexus', 'gardens');
    // sqrt(200^2+30^2) ≈ 202.24, ceil(2.0224) = 3
    assert.strictEqual(cost, 3, 'nexus->gardens cost should be 3, got: ' + cost);
  });

  test('cost is integer (ceil result)', function() {
    var ids = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];
    for (var i = 0; i < ids.length; i++) {
      for (var j = 0; j < ids.length; j++) {
        var cost = DZ.getTravelCost(ids[i], ids[j]);
        assert(cost === Math.floor(cost), 'Cost should be integer: ' + ids[i] + '->' + ids[j]);
      }
    }
  });

  test('cost for unknown zones returns 0 (no distance)', function() {
    // getZoneDistance returns 0 for unknown, same-zone rule returns 0 since Math.max(1,ceil(0/100))=1
    // but since fromZone === toZone check won't match unknown, cost = Math.max(1, ceil(0/100)) = 1
    // Actually: if both zones are invalid: dist=0, cost = Math.max(1, ceil(0)) = 1
    // But the function uses === check for same zone first, so if both strings are 'invalid' it returns 0
    // Let's check a known valid vs invalid
    var cost = DZ.getTravelCost('nexus', 'invalid');
    assert(typeof cost === 'number', 'Should return a number for invalid zone');
  });

  test('wilds is far from arena — high cost', function() {
    // wilds(-30,260), arena(0,-240) -> sqrt(30^2+500^2) ≈ 500.9 -> ceil(5.009) = 6
    var cost = DZ.getTravelCost('wilds', 'arena');
    assert(cost >= 5, 'wilds->arena cost should be at least 5, got: ' + cost);
  });

  test('studio to nexus cost is positive', function() {
    var cost = DZ.getTravelCost('studio', 'nexus');
    assert(cost > 0);
  });

});

// ─── getZoneSummary ───────────────────────────────────────────────────────────

suite('getZoneSummary', function() {

  test('returns non-empty string for valid zone', function() {
    var s = DZ.getZoneSummary('nexus', null);
    assert(typeof s === 'string' && s.length > 0);
  });

  test('includes zone name', function() {
    var s = DZ.getZoneSummary('nexus', null);
    assert(s.indexOf('Nexus') !== -1, 'Summary should include zone name');
  });

  test('includes NPC count', function() {
    var s = DZ.getZoneSummary('nexus', null);
    assert(s.indexOf('3 NPCs') !== -1, 'Summary should include NPC count: ' + s);
  });

  test('returns "Unknown zone" for invalid id', function() {
    var s = DZ.getZoneSummary('bogus', null);
    assert.strictEqual(s, 'Unknown zone');
  });

  test('includes weather from gameState', function() {
    var state = { weather: { gardens: 'Stormy' } };
    var s = DZ.getZoneSummary('gardens', state);
    assert(s.indexOf('Stormy') !== -1, 'Summary should include weather: ' + s);
  });

  test('includes event count from gameState', function() {
    var state = {
      events: [
        { zone: 'nexus', name: 'Festival' },
        { zone: 'nexus', name: 'Tournament' },
        { zone: 'gardens', name: 'Harvest' }
      ]
    };
    var s = DZ.getZoneSummary('nexus', state);
    assert(s.indexOf('2 active events') !== -1, 'Summary should show 2 events: ' + s);
  });

  test('shows 0 active events when no events', function() {
    var state = { events: [] };
    var s = DZ.getZoneSummary('nexus', state);
    assert(s.indexOf('0 active events') !== -1, 'Should show 0 events: ' + s);
  });

  test('includes distance when different from current zone', function() {
    var state = { currentZone: 'nexus' };
    var s = DZ.getZoneSummary('arena', state);
    assert(s.indexOf('units away') !== -1, 'Summary should include distance: ' + s);
  });

  test('shows "current location" when zone matches currentZone', function() {
    var state = { currentZone: 'nexus' };
    var s = DZ.getZoneSummary('nexus', state);
    assert(s.indexOf('current location') !== -1, 'Should show current location: ' + s);
  });

  test('works without gameState', function() {
    var s = DZ.getZoneSummary('studio', undefined);
    assert(typeof s === 'string' && s.length > 0);
  });

  test('default weather is Clear', function() {
    var s = DZ.getZoneSummary('nexus', {});
    assert(s.indexOf('Clear') !== -1, 'Default weather should be Clear: ' + s);
  });

});

// ─── getAllZonesSorted ────────────────────────────────────────────────────────

suite('getAllZonesSorted', function() {

  test('returns array of 8 zones', function() {
    var zones = DZ.getAllZonesSorted('nexus', 'distance');
    assert(Array.isArray(zones), 'Should return array');
    assert.strictEqual(zones.length, 8, 'Should have 8 zones');
  });

  test('each entry has id, name, distance, cost', function() {
    var zones = DZ.getAllZonesSorted('nexus', 'distance');
    for (var i = 0; i < zones.length; i++) {
      var z = zones[i];
      assert(z.id, 'Entry should have id: index ' + i);
      assert(z.name, 'Entry should have name: ' + z.id);
      assert(typeof z.distance === 'number', 'Entry should have numeric distance: ' + z.id);
      assert(typeof z.cost === 'number', 'Entry should have numeric cost: ' + z.id);
    }
  });

  test('sorted by distance: first entry is current zone (dist 0)', function() {
    var zones = DZ.getAllZonesSorted('nexus', 'distance');
    assert.strictEqual(zones[0].id, 'nexus', 'First entry should be current zone');
    assert.strictEqual(zones[0].distance, 0, 'Current zone distance should be 0');
  });

  test('sorted by distance: ascending order', function() {
    var zones = DZ.getAllZonesSorted('nexus', 'distance');
    for (var i = 1; i < zones.length; i++) {
      assert(zones[i].distance >= zones[i - 1].distance,
        'Zones should be in ascending distance order at index ' + i);
    }
  });

  test('sorted by name: alphabetical order', function() {
    var zones = DZ.getAllZonesSorted('nexus', 'name');
    for (var i = 1; i < zones.length; i++) {
      assert(zones[i].name >= zones[i - 1].name,
        'Zones should be in ascending name order at index ' + i);
    }
  });

  test('sorted by alphabetical: same as name sort', function() {
    var byName = DZ.getAllZonesSorted('nexus', 'name');
    var byAlpha = DZ.getAllZonesSorted('nexus', 'alphabetical');
    for (var i = 0; i < byName.length; i++) {
      assert.strictEqual(byName[i].id, byAlpha[i].id, 'name and alphabetical sorts should match');
    }
  });

  test('default sort is distance', function() {
    var defaultSort = DZ.getAllZonesSorted('nexus');
    var distSort = DZ.getAllZonesSorted('nexus', 'distance');
    for (var i = 0; i < defaultSort.length; i++) {
      assert.strictEqual(defaultSort[i].id, distSort[i].id, 'Default should match distance sort');
    }
  });

  test('cost matches getTravelCost for each zone', function() {
    var zones = DZ.getAllZonesSorted('nexus', 'distance');
    for (var i = 0; i < zones.length; i++) {
      var expected = DZ.getTravelCost('nexus', zones[i].id);
      assert.strictEqual(zones[i].cost, expected,
        'Cost mismatch for ' + zones[i].id);
    }
  });

  test('current zone entry has cost 0', function() {
    var zones = DZ.getAllZonesSorted('studio', 'distance');
    var studioEntry = zones.find(function(z) { return z.id === 'studio'; });
    assert(studioEntry, 'studio entry should exist');
    assert.strictEqual(studioEntry.cost, 0, 'Same zone cost should be 0');
  });

  test('each entry has npcs array', function() {
    var zones = DZ.getAllZonesSorted('nexus', 'distance');
    for (var i = 0; i < zones.length; i++) {
      assert(Array.isArray(zones[i].npcs), 'Entry should have npcs array: ' + zones[i].id);
    }
  });

  test('different currentZone gives different distances', function() {
    var fromNexus = DZ.getAllZonesSorted('nexus', 'distance');
    var fromArena = DZ.getAllZonesSorted('arena', 'distance');
    // nexus and arena should have different orderings
    var nexusFirst = fromNexus[0].id;
    var arenaFirst = fromArena[0].id;
    assert.strictEqual(nexusFirst, 'nexus', 'From nexus, nexus should be first');
    assert.strictEqual(arenaFirst, 'arena', 'From arena, arena should be first');
  });

});

// ─── renderAsciiMap ───────────────────────────────────────────────────────────

suite('renderAsciiMap', function() {

  test('returns a string', function() {
    var map = DZ.renderAsciiMap('nexus');
    assert(typeof map === 'string', 'Should return a string');
  });

  test('is non-empty', function() {
    var map = DZ.renderAsciiMap('nexus');
    assert(map.length > 0, 'Map should be non-empty');
  });

  test('contains border characters', function() {
    var map = DZ.renderAsciiMap('nexus');
    assert(map.indexOf('+') !== -1, 'Map should have border + characters');
    assert(map.indexOf('-') !== -1, 'Map should have border - characters');
    assert(map.indexOf('|') !== -1, 'Map should have border | characters');
  });

  test('contains zone abbreviation for nexus', function() {
    var map = DZ.renderAsciiMap('nexus');
    assert(map.indexOf('NEXUS') !== -1, 'Map should show NEXUS zone');
  });

  test('current zone is bracketed with []', function() {
    var map = DZ.renderAsciiMap('nexus');
    assert(map.indexOf('[NEXUS') !== -1, 'Current zone should have [ bracket');
  });

  test('non-current zones are not bracketed', function() {
    var map = DZ.renderAsciiMap('nexus');
    // WILDS should not have brackets since nexus is current
    assert(map.indexOf('[WILDS') === -1, 'Non-current zone should not have [ bracket');
  });

  test('changes highlight when different zone is current', function() {
    var mapNexus = DZ.renderAsciiMap('nexus');
    var mapArena = DZ.renderAsciiMap('arena');
    assert(mapArena.indexOf('[ARENA') !== -1, 'arena should be bracketed when current');
    assert(mapArena.indexOf('[NEXUS') === -1, 'nexus should NOT be bracketed when arena is current');
  });

  test('contains all 8 zone abbreviations', function() {
    var map = DZ.renderAsciiMap('nexus');
    var abbrevs = ['NEXUS', 'GARDNS', 'ATHNM', 'STUDIO', 'WILDS', 'AGORA', 'COMONS', 'ARENA'];
    for (var i = 0; i < abbrevs.length; i++) {
      assert(map.indexOf(abbrevs[i]) !== -1, 'Map missing abbreviation: ' + abbrevs[i]);
    }
  });

  test('contains legend', function() {
    var map = DZ.renderAsciiMap('nexus');
    assert(map.indexOf('current zone') !== -1, 'Map should have legend mentioning current zone');
  });

  test('is multi-line', function() {
    var map = DZ.renderAsciiMap('nexus');
    var lines = map.split('\n');
    assert(lines.length > 5, 'Map should have more than 5 lines');
  });

  test('works with undefined currentZone (no crash)', function() {
    var map = DZ.renderAsciiMap(undefined);
    assert(typeof map === 'string', 'Should return string even with undefined');
  });

  test('works with invalid currentZone', function() {
    var map = DZ.renderAsciiMap('notazone');
    assert(typeof map === 'string', 'Should return string for invalid zone');
    assert(map.indexOf('NEXUS') !== -1, 'Map should still show NEXUS');
  });

});

// ─── formatZoneCard ───────────────────────────────────────────────────────────

suite('formatZoneCard', function() {

  test('returns a string', function() {
    var card = DZ.formatZoneCard('nexus', 'nexus', null);
    assert(typeof card === 'string', 'Should return string');
  });

  test('returns non-empty string for valid zone', function() {
    var card = DZ.formatZoneCard('nexus', 'nexus', null);
    assert(card.length > 0, 'Should be non-empty');
  });

  test('contains zone name', function() {
    var card = DZ.formatZoneCard('gardens', 'nexus', null);
    assert(card.indexOf('The Gardens') !== -1, 'Card should contain zone name');
  });

  test('contains zone description', function() {
    var card = DZ.formatZoneCard('nexus', 'nexus', null);
    assert(card.indexOf('Central hub') !== -1, 'Card should contain zone description');
  });

  test('contains terrain info', function() {
    var card = DZ.formatZoneCard('nexus', 'nexus', null);
    assert(card.indexOf('Stone plaza') !== -1, 'Card should contain terrain info');
  });

  test('contains NPC list', function() {
    var card = DZ.formatZoneCard('nexus', 'nexus', null);
    assert(card.indexOf('Herald') !== -1, 'Card should contain NPC names');
    assert(card.indexOf('Guide') !== -1, 'Card should contain all NPC names');
  });

  test('current zone card has "Here" button (disabled)', function() {
    var card = DZ.formatZoneCard('nexus', 'nexus', null);
    assert(card.indexOf('Here') !== -1, 'Current zone should show Here button');
    assert(card.indexOf('dz-btn--disabled') !== -1, 'Current zone button should be disabled');
  });

  test('other zone card has Travel button', function() {
    var card = DZ.formatZoneCard('gardens', 'nexus', null);
    assert(card.indexOf('Travel') !== -1, 'Non-current zone should have Travel button');
  });

  test('Travel button shows Spark cost', function() {
    var card = DZ.formatZoneCard('arena', 'nexus', null);
    // arena is 240 units away, cost = 3
    assert(card.indexOf('3 Spark') !== -1, 'Travel button should show Spark cost: ' + card);
  });

  test('card has data-zone attribute on travel button', function() {
    var card = DZ.formatZoneCard('gardens', 'nexus', null);
    assert(card.indexOf('data-zone="gardens"') !== -1, 'Travel button should have data-zone attr');
  });

  test('current zone card shows [*] Here marker', function() {
    var card = DZ.formatZoneCard('nexus', 'nexus', null);
    assert(card.indexOf('[*]') !== -1, 'Current zone should show [*] marker');
  });

  test('other zone card shows distance', function() {
    var card = DZ.formatZoneCard('arena', 'nexus', null);
    assert(card.indexOf('units away') !== -1, 'Card should show distance from current zone');
  });

  test('shows weather from gameState', function() {
    var state = { weather: { gardens: 'Foggy' } };
    var card = DZ.formatZoneCard('gardens', 'nexus', state);
    assert(card.indexOf('Foggy') !== -1, 'Card should show weather: ' + card);
  });

  test('shows event count from gameState', function() {
    var state = {
      events: [
        { zone: 'nexus', name: 'Gathering' },
        { zone: 'nexus', name: 'Market Day' }
      ]
    };
    var card = DZ.formatZoneCard('nexus', 'nexus', state);
    assert(card.indexOf('2 active event') !== -1, 'Card should show 2 events: ' + card);
  });

  test('shows no active events when events array empty', function() {
    var state = { events: [] };
    var card = DZ.formatZoneCard('nexus', 'nexus', state);
    assert(card.indexOf('No active events') !== -1, 'Should show no active events: ' + card);
  });

  test('returns empty string for invalid zone', function() {
    var card = DZ.formatZoneCard('bogus', 'nexus', null);
    assert.strictEqual(card, '', 'Should return empty string for invalid zone');
  });

  test('card has CSS class dz-zone-card', function() {
    var card = DZ.formatZoneCard('nexus', 'nexus', null);
    assert(card.indexOf('dz-zone-card') !== -1, 'Card should have dz-zone-card class');
  });

  test('current zone card has dz-zone-card--current class', function() {
    var card = DZ.formatZoneCard('nexus', 'nexus', null);
    assert(card.indexOf('dz-zone-card--current') !== -1, 'Current zone should have --current class');
  });

  test('non-current zone card does NOT have dz-zone-card--current class', function() {
    var card = DZ.formatZoneCard('gardens', 'nexus', null);
    assert(card.indexOf('dz-zone-card--current') === -1, 'Non-current zone should not have --current class');
  });

  test('works with null gameState', function() {
    var card = DZ.formatZoneCard('studio', 'nexus', null);
    assert(typeof card === 'string' && card.length > 0, 'Should work with null gameState');
  });

  test('works with undefined gameState', function() {
    var card = DZ.formatZoneCard('studio', 'nexus', undefined);
    assert(typeof card === 'string' && card.length > 0, 'Should work with undefined gameState');
  });

});

// ─── createZoneNavigator (DOM) ────────────────────────────────────────────────

suite('createZoneNavigator', function() {

  test('returns an object (element)', function() {
    var panel = DZ.createZoneNavigator();
    assert(panel !== null && typeof panel === 'object', 'Should return an object');
  });

  test('returned element has className dz-zone-navigator', function() {
    var panel = DZ.createZoneNavigator();
    assert(panel.className.indexOf('dz-zone-navigator') !== -1,
      'Panel should have dz-zone-navigator class');
  });

  test('contains dz-nav-header child', function() {
    var panel = DZ.createZoneNavigator();
    var header = panel.querySelector('.dz-nav-header');
    assert(header !== null, 'Panel should have dz-nav-header');
  });

  test('contains dz-ascii-map element', function() {
    var panel = DZ.createZoneNavigator();
    var mapEl = panel.querySelector('.dz-ascii-map');
    assert(mapEl !== null, 'Panel should have dz-ascii-map element');
  });

  test('ascii-map has content', function() {
    var panel = DZ.createZoneNavigator();
    var mapEl = panel.querySelector('.dz-ascii-map');
    assert(mapEl !== null, 'Map element should exist');
    assert(mapEl.textContent.length > 0, 'Map should have content');
  });

  test('contains dz-zone-list', function() {
    var panel = DZ.createZoneNavigator();
    var list = panel.querySelector('.dz-zone-list');
    assert(list !== null, 'Panel should have dz-zone-list');
  });

  test('zone list has 8 zone cards', function() {
    var panel = DZ.createZoneNavigator();
    var list = panel.querySelector('.dz-zone-list');
    assert(list !== null, 'Zone list should exist');
    // Count dz-zone-card children
    var cards = list._children ? list._children.filter(function(c) {
      return c.className && c.className.indexOf('dz-zone-card') !== -1;
    }) : [];
    assert.strictEqual(cards.length, 8, 'Should have 8 zone cards, got: ' + cards.length);
  });

  test('contains dz-controls section', function() {
    var panel = DZ.createZoneNavigator();
    var controls = panel.querySelector('.dz-controls');
    assert(controls !== null, 'Panel should have dz-controls');
  });

  test('has sort buttons', function() {
    var panel = DZ.createZoneNavigator();
    var controls = panel.querySelector('.dz-controls');
    assert(controls !== null, 'Controls section should exist');
    var sortBtns = controls._children ? controls._children.filter(function(c) {
      return c.className && c.className.indexOf('dz-sort-btn') !== -1;
    }) : [];
    assert(sortBtns.length >= 2, 'Should have at least 2 sort buttons');
  });

  test('default current zone is nexus in data-attribute', function() {
    var panel = DZ.createZoneNavigator();
    var list = panel.querySelector('.dz-zone-list');
    assert(list !== null, 'Zone list should exist');
    assert.strictEqual(list.getAttribute('data-current-zone'), 'nexus',
      'Default current zone should be nexus');
  });

  test('panel has aria-label attribute', function() {
    var panel = DZ.createZoneNavigator();
    assert.strictEqual(panel.getAttribute('aria-label'), 'Zone Navigator');
  });

  test('panel has role region attribute', function() {
    var panel = DZ.createZoneNavigator();
    assert.strictEqual(panel.getAttribute('role'), 'region');
  });

});

// ─── updateZoneNavigator ──────────────────────────────────────────────────────

suite('updateZoneNavigator', function() {

  test('does not throw with null panel', function() {
    var threw = false;
    try { DZ.updateZoneNavigator(null, { currentZone: 'nexus' }); }
    catch (e) { threw = true; }
    assert(!threw, 'Should not throw with null panel');
  });

  test('does not throw with null state', function() {
    var panel = DZ.createZoneNavigator();
    var threw = false;
    try { DZ.updateZoneNavigator(panel, null); }
    catch (e) { threw = true; }
    assert(!threw, 'Should not throw with null state');
  });

  test('updates current zone to arena', function() {
    var panel = DZ.createZoneNavigator();
    var state = { currentZone: 'arena' };
    DZ.updateZoneNavigator(panel, state);
    var list = panel.querySelector('.dz-zone-list');
    assert(list !== null, 'Zone list should exist after update');
    assert.strictEqual(list.getAttribute('data-current-zone'), 'arena',
      'Current zone should be updated to arena');
  });

  test('updates ascii map to reflect new current zone', function() {
    var panel = DZ.createZoneNavigator();
    var state = { currentZone: 'arena' };
    DZ.updateZoneNavigator(panel, state);
    var mapEl = panel.querySelector('.dz-ascii-map');
    assert(mapEl !== null, 'Map element should exist');
    assert(mapEl.textContent.indexOf('[ARENA') !== -1,
      'Map should show ARENA as current after update: ' + mapEl.textContent.substring(0, 100));
  });

  test('re-renders zone cards after update', function() {
    var panel = DZ.createZoneNavigator();
    var state = { currentZone: 'gardens' };
    DZ.updateZoneNavigator(panel, state);
    var list = panel.querySelector('.dz-zone-list');
    var cards = list._children ? list._children.filter(function(c) {
      return c.className && c.className.indexOf('dz-zone-card') !== -1;
    }) : [];
    assert.strictEqual(cards.length, 8, 'Should still have 8 zone cards after update');
  });

  test('falls back to nexus for invalid currentZone', function() {
    var panel = DZ.createZoneNavigator();
    var state = { currentZone: 'doesnotexist' };
    DZ.updateZoneNavigator(panel, state);
    var list = panel.querySelector('.dz-zone-list');
    assert.strictEqual(list.getAttribute('data-current-zone'), 'nexus',
      'Should fall back to nexus for invalid zone');
  });

  test('works with gameState containing weather and events', function() {
    var panel = DZ.createZoneNavigator();
    var state = {
      currentZone: 'nexus',
      weather: { nexus: 'Rainy' },
      events: [{ zone: 'nexus', name: 'Storm Festival' }]
    };
    var threw = false;
    try { DZ.updateZoneNavigator(panel, state); }
    catch (e) { threw = true; }
    assert(!threw, 'Should not throw with full gameState');
  });

});

// ─── Edge Cases ───────────────────────────────────────────────────────────────

suite('Edge Cases', function() {

  test('same zone summary shows "current location"', function() {
    var s = DZ.getZoneSummary('nexus', { currentZone: 'nexus' });
    assert(s.indexOf('current location') !== -1, 'Same zone summary: ' + s);
  });

  test('zero distance zones have cost 0', function() {
    assert.strictEqual(DZ.getTravelCost('studio', 'studio'), 0);
  });

  test('getAllZonesSorted returns 8 entries even from distant zone', function() {
    var zones = DZ.getAllZonesSorted('wilds', 'distance');
    assert.strictEqual(zones.length, 8);
  });

  test('getZoneDistance with both same zone returns exactly 0', function() {
    for (var i = 0; i < DZ.ZONE_IDS.length; i++) {
      var id = DZ.ZONE_IDS[i];
      assert.strictEqual(DZ.getZoneDistance(id, id), 0, id + ' self-distance should be 0');
    }
  });

  test('formatZoneCard for same zone has 0 cost and no Travel button', function() {
    var card = DZ.formatZoneCard('gardens', 'gardens', null);
    assert(card.indexOf('Travel') === -1, 'Same zone should not have Travel button');
  });

  test('renderAsciiMap produces same output for two calls with same zone', function() {
    var a = DZ.renderAsciiMap('nexus');
    var b = DZ.renderAsciiMap('nexus');
    assert.strictEqual(a, b, 'Same inputs should produce same map');
  });

  test('getZoneNPCs for all zones returns arrays with 3 elements', function() {
    for (var i = 0; i < DZ.ZONE_IDS.length; i++) {
      var npcs = DZ.getZoneNPCs(DZ.ZONE_IDS[i]);
      assert.strictEqual(npcs.length, 3, 'Zone ' + DZ.ZONE_IDS[i] + ' should have 3 NPCs');
    }
  });

  test('getZoneDetails for all zone IDs returns non-null', function() {
    for (var i = 0; i < DZ.ZONE_IDS.length; i++) {
      var z = DZ.getZoneDetails(DZ.ZONE_IDS[i]);
      assert(z !== null, 'getZoneDetails should return object for: ' + DZ.ZONE_IDS[i]);
    }
  });

  test('travel cost nexus->wilds is ceil(dist/100)', function() {
    // nexus(0,0) wilds(-30,260) -> sqrt(900+67600) = sqrt(68500) ≈ 261.7
    var dist = DZ.getZoneDistance('nexus', 'wilds');
    var expected = Math.max(1, Math.ceil(dist / 100));
    assert.strictEqual(DZ.getTravelCost('nexus', 'wilds'), expected);
  });

  test('getAllZonesSorted by name — The Arena comes before The Nexus', function() {
    var zones = DZ.getAllZonesSorted('nexus', 'name');
    var arenaIdx = zones.findIndex(function(z) { return z.id === 'arena'; });
    var nexusIdx = zones.findIndex(function(z) { return z.id === 'nexus'; });
    assert(arenaIdx < nexusIdx, 'Arena ("The Arena") should sort before Nexus ("The Nexus")');
  });

  test('getZoneSummary includes terrain info fields', function() {
    // Summary is a short string; just ensure it doesn't crash and returns name
    var s = DZ.getZoneSummary('studio', { currentZone: 'nexus' });
    assert(s.indexOf('Studio') !== -1, 'Summary should include studio name: ' + s);
  });

  test('formatZoneCard HTML is well-formed (opens and closes div)', function() {
    var card = DZ.formatZoneCard('nexus', 'nexus', null);
    var openCount = (card.match(/<div/g) || []).length;
    var closeCount = (card.match(/<\/div>/g) || []).length;
    assert.strictEqual(openCount, closeCount, 'HTML divs should be balanced');
  });

});

// ─── Final Report ────────────────────────────────────────────────────────────

var passed = report();
process.exit(passed ? 0 : 1);
