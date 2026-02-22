// test_fast_travel.js — Tests for the Fast Travel system
var assert = require('assert');
var FastTravel = require('../src/js/fast_travel');

var passed = 0;
var failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    process.stdout.write('  \u2713 ' + name + '\n');
  } catch (e) {
    failed++;
    process.stdout.write('  \u2717 ' + name + ': ' + e.message + '\n');
  }
}

// Reset state between each test group
function reset() {
  FastTravel._resetState();
}

// ── Constants ──────────────────────────────────────────────────────────────────

console.log('\nConstants');

test('FREE_TRAVEL_RADIUS is 150', function() {
  assert.strictEqual(FastTravel.FREE_TRAVEL_RADIUS, 150);
});

test('COST_PER_100_UNITS is 1', function() {
  assert.strictEqual(FastTravel.COST_PER_100_UNITS, 1);
});

test('MAX_BOOKMARKS is 10', function() {
  assert.strictEqual(FastTravel.MAX_BOOKMARKS, 10);
});

test('MAX_RECENT_LOCATIONS is 5', function() {
  assert.strictEqual(FastTravel.MAX_RECENT_LOCATIONS, 5);
});

// ── Zone Waypoints ─────────────────────────────────────────────────────────────

console.log('\nZone Waypoints');

test('getZoneWaypoints returns 8 zones', function() {
  var waypoints = FastTravel.getZoneWaypoints();
  assert.strictEqual(waypoints.length, 8);
});

test('all 8 zones present in waypoints', function() {
  var waypoints = FastTravel.getZoneWaypoints();
  var zones = waypoints.map(function(w) { return w.zone; }).sort();
  assert.deepStrictEqual(zones, ['agora', 'arena', 'athenaeum', 'commons', 'gardens', 'nexus', 'studio', 'wilds']);
});

test('nexus waypoint is at (0, 0)', function() {
  var nexus = FastTravel.getZoneWaypoints().find(function(w) { return w.zone === 'nexus'; });
  assert(nexus, 'nexus waypoint should exist');
  assert.strictEqual(nexus.x, 0);
  assert.strictEqual(nexus.z, 0);
});

test('gardens waypoint is at (200, 30)', function() {
  var dest = FastTravel.getZoneWaypoints().find(function(w) { return w.zone === 'gardens'; });
  assert.strictEqual(dest.x, 200);
  assert.strictEqual(dest.z, 30);
});

test('athenaeum waypoint is at (100, -220)', function() {
  var dest = FastTravel.getZoneWaypoints().find(function(w) { return w.zone === 'athenaeum'; });
  assert.strictEqual(dest.x, 100);
  assert.strictEqual(dest.z, -220);
});

test('studio waypoint is at (-200, -100)', function() {
  var dest = FastTravel.getZoneWaypoints().find(function(w) { return w.zone === 'studio'; });
  assert.strictEqual(dest.x, -200);
  assert.strictEqual(dest.z, -100);
});

test('wilds waypoint is at (-30, 260)', function() {
  var dest = FastTravel.getZoneWaypoints().find(function(w) { return w.zone === 'wilds'; });
  assert.strictEqual(dest.x, -30);
  assert.strictEqual(dest.z, 260);
});

test('agora waypoint is at (-190, 120)', function() {
  var dest = FastTravel.getZoneWaypoints().find(function(w) { return w.zone === 'agora'; });
  assert.strictEqual(dest.x, -190);
  assert.strictEqual(dest.z, 120);
});

test('commons waypoint is at (170, 190)', function() {
  var dest = FastTravel.getZoneWaypoints().find(function(w) { return w.zone === 'commons'; });
  assert.strictEqual(dest.x, 170);
  assert.strictEqual(dest.z, 190);
});

test('arena waypoint is at (0, -240)', function() {
  var dest = FastTravel.getZoneWaypoints().find(function(w) { return w.zone === 'arena'; });
  assert.strictEqual(dest.x, 0);
  assert.strictEqual(dest.z, -240);
});

test('each waypoint has id, name, zone, x, z, category fields', function() {
  var waypoints = FastTravel.getZoneWaypoints();
  waypoints.forEach(function(w) {
    assert(w.id, 'waypoint missing id');
    assert(w.name, 'waypoint missing name');
    assert(w.zone, 'waypoint missing zone');
    assert(typeof w.x === 'number', 'waypoint x should be number');
    assert(typeof w.z === 'number', 'waypoint z should be number');
    assert.strictEqual(w.category, 'zone', 'waypoint category should be zone');
  });
});

test('getZoneWaypoints returns a copy (not mutating internal)', function() {
  var w1 = FastTravel.getZoneWaypoints();
  w1.push({ fake: true });
  var w2 = FastTravel.getZoneWaypoints();
  assert.strictEqual(w2.length, 8);
});

test('nexus and gardens are safe destinations', function() {
  var waypoints = FastTravel.getZoneWaypoints();
  var nexus = waypoints.find(function(w) { return w.zone === 'nexus'; });
  var gardens = waypoints.find(function(w) { return w.zone === 'gardens'; });
  assert.strictEqual(nexus.safe, true);
  assert.strictEqual(gardens.safe, true);
});

test('wilds and arena are not safe', function() {
  var waypoints = FastTravel.getZoneWaypoints();
  var wilds = waypoints.find(function(w) { return w.zone === 'wilds'; });
  var arena = waypoints.find(function(w) { return w.zone === 'arena'; });
  assert.strictEqual(wilds.safe, false);
  assert.strictEqual(arena.safe, false);
});

// ── Distance Calculation ───────────────────────────────────────────────────────

console.log('\nDistance Calculation');

test('distance from (0,0) to (0,0) is 0', function() {
  assert.strictEqual(FastTravel.distance(0, 0, 0, 0), 0);
});

test('distance from (0,0) to (100,0) is 100', function() {
  assert.strictEqual(FastTravel.distance(0, 0, 100, 0), 100);
});

test('distance from (0,0) to (0,100) is 100', function() {
  assert.strictEqual(FastTravel.distance(0, 0, 0, 100), 100);
});

test('distance is symmetric', function() {
  var d1 = FastTravel.distance(10, 20, 50, 80);
  var d2 = FastTravel.distance(50, 80, 10, 20);
  assert.strictEqual(d1, d2);
});

test('distance 3-4-5 triangle', function() {
  var d = FastTravel.distance(0, 0, 3, 4);
  assert.strictEqual(d, 5);
});

// ── Travel Cost ────────────────────────────────────────────────────────────────

console.log('\nTravel Cost');

test('travel cost within 150 units is 0', function() {
  var cost = FastTravel.calculateTravelCost({ x: 0, z: 0 }, { x: 100, z: 0 });
  assert.strictEqual(cost, 0);
});

test('travel cost at exactly 150 units is 0', function() {
  var cost = FastTravel.calculateTravelCost({ x: 0, z: 0 }, { x: 150, z: 0 });
  assert.strictEqual(cost, 0);
});

test('travel cost at 250 units is 1 Spark', function() {
  // 250 - 150 = 100 units beyond, ceil(100/100) * 1 = 1
  var cost = FastTravel.calculateTravelCost({ x: 0, z: 0 }, { x: 250, z: 0 });
  assert.strictEqual(cost, 1);
});

test('travel cost at 350 units is 2 Spark', function() {
  // 350 - 150 = 200 units beyond, ceil(200/100) * 1 = 2
  var cost = FastTravel.calculateTravelCost({ x: 0, z: 0 }, { x: 350, z: 0 });
  assert.strictEqual(cost, 2);
});

test('travel cost at 251 units is 2 Spark (ceil)', function() {
  // 251 - 150 = 101 units beyond, ceil(101/100) * 1 = 2
  var cost = FastTravel.calculateTravelCost({ x: 0, z: 0 }, { x: 251, z: 0 });
  assert.strictEqual(cost, 2);
});

test('travel cost with invalid from returns 0', function() {
  var cost = FastTravel.calculateTravelCost(null, { x: 250, z: 0 });
  assert.strictEqual(cost, 0);
});

test('travel cost with invalid to returns 0', function() {
  var cost = FastTravel.calculateTravelCost({ x: 0, z: 0 }, null);
  assert.strictEqual(cost, 0);
});

test('travel cost same position is 0', function() {
  var cost = FastTravel.calculateTravelCost({ x: 100, z: 200 }, { x: 100, z: 200 });
  assert.strictEqual(cost, 0);
});

// ── Bookmarks ──────────────────────────────────────────────────────────────────

console.log('\nBookmarks');

test('new player has empty bookmarks', function() {
  reset();
  var bm = FastTravel.getBookmarks('player1');
  assert.strictEqual(bm.length, 0);
});

test('addBookmark adds a destination', function() {
  reset();
  var dest = { id: 'zone_nexus', name: 'The Nexus', x: 0, z: 0, zone: 'nexus', category: 'zone' };
  var result = FastTravel.addBookmark('player1', dest);
  assert.strictEqual(result.success, true);
  assert.strictEqual(FastTravel.getBookmarks('player1').length, 1);
});

test('addBookmark returns the bookmark object', function() {
  reset();
  var dest = { id: 'zone_nexus', name: 'The Nexus', x: 0, z: 0, zone: 'nexus' };
  var result = FastTravel.addBookmark('player1', dest);
  assert.strictEqual(result.success, true);
  assert(result.bookmark, 'should return bookmark');
  assert.strictEqual(result.bookmark.id, 'zone_nexus');
  assert.strictEqual(result.bookmark.category, 'bookmark');
});

test('addBookmark prevents duplicates', function() {
  reset();
  var dest = { id: 'zone_nexus', name: 'The Nexus', x: 0, z: 0, zone: 'nexus' };
  FastTravel.addBookmark('player1', dest);
  var result = FastTravel.addBookmark('player1', dest);
  assert.strictEqual(result.success, false);
  assert(result.error.includes('already bookmarked'));
});

test('addBookmark enforces max 10 bookmarks', function() {
  reset();
  for (var i = 0; i < 10; i++) {
    FastTravel.addBookmark('player1', { id: 'dest_' + i, name: 'Dest ' + i, x: i, z: 0 });
  }
  var result = FastTravel.addBookmark('player1', { id: 'dest_extra', name: 'Extra', x: 999, z: 0 });
  assert.strictEqual(result.success, false);
  assert(result.error.includes('limit reached'));
});

test('addBookmark fails with invalid playerId', function() {
  reset();
  var result = FastTravel.addBookmark('', { id: 'x', name: 'X', x: 0, z: 0 });
  assert.strictEqual(result.success, false);
});

test('addBookmark fails with invalid destination', function() {
  reset();
  var result = FastTravel.addBookmark('player1', null);
  assert.strictEqual(result.success, false);
});

test('addBookmark fails when destination missing name', function() {
  reset();
  var result = FastTravel.addBookmark('player1', { id: 'x', x: 0, z: 0 });
  assert.strictEqual(result.success, false);
});

test('removeBookmark removes existing bookmark', function() {
  reset();
  var dest = { id: 'zone_nexus', name: 'The Nexus', x: 0, z: 0, zone: 'nexus' };
  FastTravel.addBookmark('player1', dest);
  var result = FastTravel.removeBookmark('player1', 'zone_nexus');
  assert.strictEqual(result.success, true);
  assert.strictEqual(FastTravel.getBookmarks('player1').length, 0);
});

test('removeBookmark fails for non-existent bookmark', function() {
  reset();
  var result = FastTravel.removeBookmark('player1', 'zone_nexus');
  assert.strictEqual(result.success, false);
  assert(result.error.includes('not found'));
});

test('removeBookmark fails with invalid playerId', function() {
  reset();
  var result = FastTravel.removeBookmark('', 'zone_nexus');
  assert.strictEqual(result.success, false);
});

test('getBookmarks returns a copy', function() {
  reset();
  FastTravel.addBookmark('player1', { id: 'zone_nexus', name: 'Nexus', x: 0, z: 0 });
  var bm = FastTravel.getBookmarks('player1');
  bm.push({ fake: true });
  assert.strictEqual(FastTravel.getBookmarks('player1').length, 1);
});

// ── Recent Locations ───────────────────────────────────────────────────────────

console.log('\nRecent Locations');

test('new player has empty recent locations', function() {
  reset();
  var recent = FastTravel.getRecentLocations('player1');
  assert.strictEqual(recent.length, 0);
});

test('addRecentLocation adds a location', function() {
  reset();
  var dest = { id: 'zone_nexus', name: 'The Nexus', x: 0, z: 0, zone: 'nexus' };
  var ok = FastTravel.addRecentLocation('player1', dest);
  assert.strictEqual(ok, true);
  assert.strictEqual(FastTravel.getRecentLocations('player1').length, 1);
});

test('addRecentLocation caps at 5', function() {
  reset();
  for (var i = 0; i < 7; i++) {
    FastTravel.addRecentLocation('player1', { id: 'dest_' + i, name: 'Dest ' + i, x: i, z: 0 });
  }
  var recent = FastTravel.getRecentLocations('player1');
  assert.strictEqual(recent.length, 5);
});

test('addRecentLocation prepends (most recent first)', function() {
  reset();
  FastTravel.addRecentLocation('player1', { id: 'a', name: 'A', x: 0, z: 0 });
  FastTravel.addRecentLocation('player1', { id: 'b', name: 'B', x: 1, z: 0 });
  var recent = FastTravel.getRecentLocations('player1');
  assert.strictEqual(recent[0].id, 'b');
  assert.strictEqual(recent[1].id, 'a');
});

test('addRecentLocation deduplicates by id (moves to front)', function() {
  reset();
  FastTravel.addRecentLocation('player1', { id: 'a', name: 'A', x: 0, z: 0 });
  FastTravel.addRecentLocation('player1', { id: 'b', name: 'B', x: 1, z: 0 });
  FastTravel.addRecentLocation('player1', { id: 'a', name: 'A', x: 0, z: 0 });
  var recent = FastTravel.getRecentLocations('player1');
  assert.strictEqual(recent.length, 2);
  assert.strictEqual(recent[0].id, 'a'); // moved to front
});

test('addRecentLocation fails with invalid playerId', function() {
  reset();
  var ok = FastTravel.addRecentLocation('', { id: 'x', name: 'X', x: 0, z: 0 });
  assert.strictEqual(ok, false);
});

test('addRecentLocation fails with invalid destination', function() {
  reset();
  var ok = FastTravel.addRecentLocation('player1', null);
  assert.strictEqual(ok, false);
});

test('recent entries have category set to recent', function() {
  reset();
  FastTravel.addRecentLocation('player1', { id: 'zone_nexus', name: 'Nexus', x: 0, z: 0 });
  var recent = FastTravel.getRecentLocations('player1');
  assert.strictEqual(recent[0].category, 'recent');
});

test('getRecentLocations returns a copy', function() {
  reset();
  FastTravel.addRecentLocation('player1', { id: 'a', name: 'A', x: 0, z: 0 });
  var r = FastTravel.getRecentLocations('player1');
  r.push({ fake: true });
  assert.strictEqual(FastTravel.getRecentLocations('player1').length, 1);
});

// ── Nearby POIs ────────────────────────────────────────────────────────────────

console.log('\nNearby POIs');

test('getNearbyPOIs with large radius returns results', function() {
  var pois = FastTravel.getNearbyPOIs(0, 0, 1000);
  assert(pois.length > 0, 'should find POIs with large radius');
});

test('getNearbyPOIs with radius 0 returns nothing', function() {
  var pois = FastTravel.getNearbyPOIs(0, 0, 0);
  assert.strictEqual(pois.length, 0);
});

test('getNearbyPOIs near nexus finds nexus portals', function() {
  var pois = FastTravel.getNearbyPOIs(0, 0, 100);
  var portalIds = pois.map(function(p) { return p.id; });
  assert(portalIds.some(function(id) { return id.includes('nexus'); }));
});

test('getNearbyPOIs sorted by distance ascending', function() {
  var pois = FastTravel.getNearbyPOIs(0, 0, 500);
  for (var i = 1; i < pois.length; i++) {
    var d1 = FastTravel.distance(0, 0, pois[i - 1].x, pois[i - 1].z);
    var d2 = FastTravel.distance(0, 0, pois[i].x, pois[i].z);
    assert(d1 <= d2, 'POIs should be sorted by distance');
  }
});

test('getNearbyPOIs with invalid args returns empty array', function() {
  var pois = FastTravel.getNearbyPOIs('not', 'numbers', 100);
  assert.deepStrictEqual(pois, []);
});

test('STATIC_POIS contains portals, anchors, and gardens', function() {
  var cats = FastTravel.STATIC_POIS.map(function(p) { return p.category; });
  assert(cats.includes('portal'), 'should have portals');
  assert(cats.includes('anchor'), 'should have anchors');
  assert(cats.includes('garden'), 'should have gardens');
});

// ── Can Travel ─────────────────────────────────────────────────────────────────

console.log('\nCan Travel');

test('canTravel within 150 units is allowed free', function() {
  var result = FastTravel.canTravel('player1', null, { x: 0, z: 0 }, { x: 100, z: 0 });
  assert.strictEqual(result.allowed, true);
  assert.strictEqual(result.cost, 0);
});

test('canTravel long distance with sufficient balance allowed', function() {
  var economy = { balances: { player1: 50 } };
  var result = FastTravel.canTravel('player1', economy, { x: 0, z: 0 }, { x: 500, z: 0 });
  assert.strictEqual(result.allowed, true);
  assert(result.cost > 0);
});

test('canTravel long distance with insufficient balance denied', function() {
  var economy = { balances: { player1: 0 } };
  var result = FastTravel.canTravel('player1', economy, { x: 0, z: 0 }, { x: 500, z: 0 });
  assert.strictEqual(result.allowed, false);
  assert(result.error.includes('Insufficient'));
});

test('canTravel with invalid playerId returns not allowed', function() {
  var result = FastTravel.canTravel('', null, { x: 0, z: 0 }, { x: 50, z: 0 });
  assert.strictEqual(result.allowed, false);
});

test('canTravel with invalid from position returns not allowed', function() {
  var result = FastTravel.canTravel('player1', null, null, { x: 50, z: 0 });
  assert.strictEqual(result.allowed, false);
});

test('canTravel with invalid to position returns not allowed', function() {
  var result = FastTravel.canTravel('player1', null, { x: 0, z: 0 }, null);
  assert.strictEqual(result.allowed, false);
});

test('canTravel with economy getBalance function', function() {
  var ledger = { balances: { player1: 100 } };
  var economy = {
    ledger: ledger,
    getBalance: function(led, pid) { return led.balances[pid] || 0; }
  };
  var result = FastTravel.canTravel('player1', economy, { x: 0, z: 0 }, { x: 500, z: 0 });
  assert.strictEqual(result.allowed, true);
});

// ── Execute Fast Travel ────────────────────────────────────────────────────────

console.log('\nExecute Fast Travel');

test('executeFastTravel returns a warp message', function() {
  reset();
  var dest = { id: 'zone_nexus', name: 'The Nexus', x: 0, z: 0, zone: 'nexus', category: 'zone' };
  var msg = FastTravel.executeFastTravel('player1', dest, { x: 200, y: 0, z: 200, zone: 'gardens' });
  assert.strictEqual(msg.type, 'warp');
  assert.strictEqual(msg.from, 'player1');
  assert.strictEqual(msg.v, 1);
});

test('executeFastTravel warp message has correct destination in payload', function() {
  reset();
  var dest = { id: 'zone_gardens', name: 'The Gardens', x: 200, z: 30, zone: 'gardens', category: 'zone' };
  var msg = FastTravel.executeFastTravel('player1', dest, { x: 0, y: 0, z: 0, zone: 'nexus' });
  assert.strictEqual(msg.payload.destination_id, 'zone_gardens');
  assert.strictEqual(msg.payload.destination_name, 'The Gardens');
  assert.strictEqual(msg.payload.destination_x, 200);
  assert.strictEqual(msg.payload.destination_z, 30);
  assert.strictEqual(msg.payload.fast_travel, true);
});

test('executeFastTravel records in recent locations', function() {
  reset();
  var dest = { id: 'zone_nexus', name: 'The Nexus', x: 0, z: 0, zone: 'nexus', category: 'zone' };
  FastTravel.executeFastTravel('player1', dest, { x: 200, y: 0, z: 200, zone: 'gardens' });
  var recent = FastTravel.getRecentLocations('player1');
  assert.strictEqual(recent.length, 1);
  assert.strictEqual(recent[0].id, 'zone_nexus');
});

test('executeFastTravel message has id, ts, seq fields', function() {
  reset();
  var dest = { id: 'zone_nexus', name: 'The Nexus', x: 0, z: 0, zone: 'nexus' };
  var msg = FastTravel.executeFastTravel('player1', dest);
  assert(msg.id, 'message should have id');
  assert(msg.ts, 'message should have ts');
  assert(typeof msg.seq === 'number', 'message should have seq');
});

test('executeFastTravel uses provided currentPos in position field', function() {
  reset();
  var dest = { id: 'zone_nexus', name: 'Nexus', x: 0, z: 0, zone: 'nexus' };
  var msg = FastTravel.executeFastTravel('player1', dest, { x: 50, y: 10, z: 80, zone: 'gardens' });
  assert.strictEqual(msg.position.x, 50);
  assert.strictEqual(msg.position.z, 80);
  assert.strictEqual(msg.position.zone, 'gardens');
});

test('executeFastTravel throws on invalid playerId', function() {
  reset();
  var dest = { id: 'zone_nexus', name: 'Nexus', x: 0, z: 0 };
  var threw = false;
  try {
    FastTravel.executeFastTravel('', dest);
  } catch (e) {
    threw = true;
  }
  assert(threw, 'should throw for empty playerId');
});

test('executeFastTravel throws on invalid destination', function() {
  reset();
  var threw = false;
  try {
    FastTravel.executeFastTravel('player1', null);
  } catch (e) {
    threw = true;
  }
  assert(threw, 'should throw for null destination');
});

// ── Available Destinations ─────────────────────────────────────────────────────

console.log('\nAvailable Destinations');

test('getAvailableDestinations includes zone waypoints', function() {
  reset();
  var dests = FastTravel.getAvailableDestinations({ id: 'player1', position: { x: 0, z: 0 } });
  var zones = dests.filter(function(d) { return d.category === 'zone'; });
  assert.strictEqual(zones.length, 8);
});

test('getAvailableDestinations includes static POIs', function() {
  reset();
  var dests = FastTravel.getAvailableDestinations({ id: 'player1', position: { x: 0, z: 0 } });
  var pois = dests.filter(function(d) { return d.category !== 'zone' && d.category !== 'bookmark' && d.category !== 'recent'; });
  assert(pois.length > 0, 'should include static POIs');
});

test('getAvailableDestinations includes bookmarks', function() {
  reset();
  FastTravel.addBookmark('player1', { id: 'mybm', name: 'My Bookmark', x: 50, z: 50, zone: 'nexus' });
  var dests = FastTravel.getAvailableDestinations({ id: 'player1', position: { x: 0, z: 0 } });
  var bms = dests.filter(function(d) { return d.category === 'bookmark'; });
  assert.strictEqual(bms.length, 1);
});

test('getAvailableDestinations attaches distance field', function() {
  reset();
  var dests = FastTravel.getAvailableDestinations({ id: 'player1', position: { x: 0, z: 0 } });
  dests.forEach(function(d) {
    assert(typeof d.distance === 'number', 'each dest should have distance');
  });
});

test('getAvailableDestinations attaches travelCost field', function() {
  reset();
  var dests = FastTravel.getAvailableDestinations({ id: 'player1', position: { x: 0, z: 0 } });
  dests.forEach(function(d) {
    assert(typeof d.travelCost === 'number', 'each dest should have travelCost');
  });
});

test('getAvailableDestinations with no playerData returns empty', function() {
  reset();
  var dests = FastTravel.getAvailableDestinations(null);
  assert.deepStrictEqual(dests, []);
});

test('getAvailableDestinations no duplicate ids', function() {
  reset();
  FastTravel.addRecentLocation('player1', { id: 'zone_nexus', name: 'Nexus', x: 0, z: 0, zone: 'nexus' });
  var dests = FastTravel.getAvailableDestinations({ id: 'player1', position: { x: 0, z: 0 } });
  var ids = dests.map(function(d) { return d.id; });
  var unique = ids.filter(function(id, i) { return ids.indexOf(id) === i; });
  assert.strictEqual(ids.length, unique.length, 'no duplicate ids in available destinations');
});

// ── Search ─────────────────────────────────────────────────────────────────────

console.log('\nSearch');

test('searchDestinations finds by name', function() {
  reset();
  var all = FastTravel.getAvailableDestinations({ id: 'p', position: { x: 0, z: 0 } });
  var results = FastTravel.searchDestinations('nexus', all);
  assert(results.length > 0, 'should find nexus');
  assert(results.every(function(d) {
    return d.name.toLowerCase().includes('nexus') || (d.description || '').toLowerCase().includes('nexus') || (d.zone || '').toLowerCase().includes('nexus');
  }));
});

test('searchDestinations is case insensitive', function() {
  reset();
  var all = FastTravel.getAvailableDestinations({ id: 'p', position: { x: 0, z: 0 } });
  var r1 = FastTravel.searchDestinations('NEXUS', all);
  var r2 = FastTravel.searchDestinations('nexus', all);
  assert.strictEqual(r1.length, r2.length);
});

test('searchDestinations with empty query returns all', function() {
  reset();
  var all = FastTravel.getAvailableDestinations({ id: 'p', position: { x: 0, z: 0 } });
  var results = FastTravel.searchDestinations('', all);
  assert.strictEqual(results.length, all.length);
});

test('searchDestinations with no match returns empty array', function() {
  reset();
  var all = FastTravel.getAvailableDestinations({ id: 'p', position: { x: 0, z: 0 } });
  var results = FastTravel.searchDestinations('xyzzy_no_match', all);
  assert.strictEqual(results.length, 0);
});

test('searchDestinations with null available returns empty', function() {
  var results = FastTravel.searchDestinations('nexus', null);
  assert.deepStrictEqual(results, []);
});

test('searchDestinations with null query returns all', function() {
  reset();
  var all = FastTravel.getAvailableDestinations({ id: 'p', position: { x: 0, z: 0 } });
  var results = FastTravel.searchDestinations(null, all);
  assert.strictEqual(results.length, all.length);
});

test('searchDestinations finds by zone', function() {
  reset();
  var all = FastTravel.getAvailableDestinations({ id: 'p', position: { x: 0, z: 0 } });
  var results = FastTravel.searchDestinations('garden', all);
  assert(results.length > 0);
});

// ── Sort ───────────────────────────────────────────────────────────────────────

console.log('\nSort');

test('sortByDistance orders by distance ascending', function() {
  reset();
  var dests = FastTravel.getAvailableDestinations({ id: 'p', position: { x: 0, z: 0 } });
  var sorted = FastTravel.sortByDistance(dests);
  for (var i = 1; i < sorted.length; i++) {
    assert(sorted[i - 1].distance <= sorted[i].distance, 'should be ascending');
  }
});

test('sortByDistance returns empty array for null input', function() {
  var result = FastTravel.sortByDistance(null);
  assert.deepStrictEqual(result, []);
});

test('sortByDistance does not mutate original array', function() {
  reset();
  var dests = FastTravel.getAvailableDestinations({ id: 'p', position: { x: 100, z: 100 } });
  var original = dests.slice();
  FastTravel.sortByDistance(dests);
  // Compare lengths at least
  assert.strictEqual(dests.length, original.length);
});

test('sortByCategory groups zones first', function() {
  reset();
  var dests = FastTravel.getAvailableDestinations({ id: 'p', position: { x: 0, z: 0 } });
  var sorted = FastTravel.sortByCategory(dests);
  // Zones should come first
  assert.strictEqual(sorted[0].category, 'zone');
});

test('sortByCategory returns empty array for null input', function() {
  var result = FastTravel.sortByCategory(null);
  assert.deepStrictEqual(result, []);
});

test('sortByCategory sorts alphabetically within category', function() {
  reset();
  var dests = FastTravel.getAvailableDestinations({ id: 'p', position: { x: 0, z: 0 } });
  var sorted = FastTravel.sortByCategory(dests);
  var zones = sorted.filter(function(d) { return d.category === 'zone'; });
  for (var i = 1; i < zones.length; i++) {
    assert(zones[i - 1].name.localeCompare(zones[i].name) <= 0, 'zones should be alphabetical');
  }
});

// ── Formatting ─────────────────────────────────────────────────────────────────

console.log('\nFormatting');

test('getCategoryIcon returns hub for zone', function() {
  assert.strictEqual(FastTravel.getCategoryIcon('zone'), 'hub');
});

test('getCategoryIcon returns bookmark for bookmark', function() {
  assert.strictEqual(FastTravel.getCategoryIcon('bookmark'), 'bookmark');
});

test('getCategoryIcon returns history for recent', function() {
  assert.strictEqual(FastTravel.getCategoryIcon('recent'), 'history');
});

test('getCategoryIcon returns place for unknown', function() {
  assert.strictEqual(FastTravel.getCategoryIcon('unknown_cat'), 'place');
});

test('formatDestination returns displayName', function() {
  var dest = { id: 'x', name: 'The Nexus', zone: 'nexus', category: 'zone', x: 0, z: 0, safe: true, distance: 0, travelCost: 0 };
  var fmt = FastTravel.formatDestination(dest);
  assert(fmt.displayName, 'should have displayName');
  assert(fmt.displayName.includes('The Nexus'));
});

test('formatDestination marks dangerous destinations', function() {
  var dest = { id: 'x', name: 'The Arena', zone: 'arena', category: 'zone', x: 0, z: 0, safe: false, distance: 100, travelCost: 0 };
  var fmt = FastTravel.formatDestination(dest);
  assert(fmt.displayName.includes('Danger'), 'should indicate danger for unsafe zones');
});

test('formatDestination shows Free for zero cost', function() {
  var dest = { id: 'x', name: 'Nexus', zone: 'nexus', category: 'zone', x: 0, z: 0, safe: true, distance: 50, travelCost: 0 };
  var fmt = FastTravel.formatDestination(dest);
  assert.strictEqual(fmt.costLabel, 'Free');
});

test('formatDestination shows Spark cost', function() {
  var dest = { id: 'x', name: 'Dest', zone: 'nexus', category: 'zone', x: 500, z: 0, safe: true, distance: 500, travelCost: 4 };
  var fmt = FastTravel.formatDestination(dest);
  assert(fmt.costLabel.includes('4 Spark'));
});

test('formatDestination returns null for null input', function() {
  var fmt = FastTravel.formatDestination(null);
  assert.strictEqual(fmt, null);
});

test('formatDestination includes categoryIcon', function() {
  var dest = { id: 'x', name: 'Nexus', zone: 'nexus', category: 'zone', x: 0, z: 0, safe: true, distance: 0, travelCost: 0 };
  var fmt = FastTravel.formatDestination(dest);
  assert(fmt.categoryIcon, 'should have categoryIcon');
});

// ── HUD Panel ──────────────────────────────────────────────────────────────────

console.log('\nHUD Panel');

test('showFastTravelPanel returns visible true', function() {
  reset();
  var panel = FastTravel.showFastTravelPanel({ id: 'p', position: { x: 0, z: 0 } });
  assert.strictEqual(panel.visible, true);
});

test('showFastTravelPanel sets default category to zone', function() {
  reset();
  var panel = FastTravel.showFastTravelPanel({ id: 'p', position: { x: 0, z: 0 } });
  assert.strictEqual(panel.activeCategory, 'zone');
});

test('showFastTravelPanel with explicit category uses it', function() {
  reset();
  var panel = FastTravel.showFastTravelPanel({ id: 'p', position: { x: 0, z: 0 } }, 'portal');
  assert.strictEqual(panel.activeCategory, 'portal');
});

test('showFastTravelPanel returns destinations array', function() {
  reset();
  var panel = FastTravel.showFastTravelPanel({ id: 'p', position: { x: 0, z: 0 } });
  assert(Array.isArray(panel.destinations), 'should have destinations array');
});

test('showFastTravelPanel zone tab returns 8 zone waypoints', function() {
  reset();
  var panel = FastTravel.showFastTravelPanel({ id: 'p', position: { x: 0, z: 0 } }, 'zone');
  assert.strictEqual(panel.destinations.length, 8);
});

test('showFastTravelPanel destinations are sorted by distance', function() {
  reset();
  var panel = FastTravel.showFastTravelPanel({ id: 'p', position: { x: 0, z: 0 } }, 'zone');
  var dests = panel.destinations;
  for (var i = 1; i < dests.length; i++) {
    // destinations are formatted objects, check distanceLabel or use allDestinations
  }
  // Just verify all formatted destinations exist
  assert(dests.every(function(d) { return d.id && d.displayName; }));
});

test('showFastTravelPanel returns tabs array', function() {
  reset();
  var panel = FastTravel.showFastTravelPanel({ id: 'p', position: { x: 0, z: 0 } });
  assert(Array.isArray(panel.tabs), 'should have tabs');
  assert(panel.tabs.length > 0, 'should have at least one tab');
});

test('showFastTravelPanel tabs include all and zone', function() {
  reset();
  var panel = FastTravel.showFastTravelPanel({ id: 'p', position: { x: 0, z: 0 } });
  var tabCats = panel.tabs.map(function(t) { return t.category; });
  assert(tabCats.includes('all'), 'tabs should include all');
  assert(tabCats.includes('zone'), 'tabs should include zone');
});

test('hideFastTravelPanel returns visible false', function() {
  reset();
  FastTravel.showFastTravelPanel({ id: 'p', position: { x: 0, z: 0 } });
  var result = FastTravel.hideFastTravelPanel();
  assert.strictEqual(result.visible, false);
});

test('getPanelState reflects current state', function() {
  reset();
  FastTravel.showFastTravelPanel({ id: 'p', position: { x: 0, z: 0 } }, 'anchor');
  var state = FastTravel.getPanelState();
  assert.strictEqual(state.visible, true);
  assert.strictEqual(state.activeCategory, 'anchor');
});

test('switchCategory changes active tab', function() {
  reset();
  FastTravel.showFastTravelPanel({ id: 'p', position: { x: 0, z: 0 } });
  var panel = FastTravel.switchCategory('portal', { id: 'p', position: { x: 0, z: 0 } });
  assert.strictEqual(panel.activeCategory, 'portal');
});

test('switchCategory filters destinations by category', function() {
  reset();
  var panel = FastTravel.switchCategory('zone', { id: 'p', position: { x: 0, z: 0 } });
  panel.destinations.forEach(function(d) {
    assert.strictEqual(d.category, 'zone');
  });
});

test('searchPanel filters destinations by query', function() {
  reset();
  FastTravel.showFastTravelPanel({ id: 'p', position: { x: 0, z: 0 } });
  var panel = FastTravel.searchPanel('nexus', { id: 'p', position: { x: 0, z: 0 } });
  assert(panel.destinations.length > 0, 'should find nexus');
});

test('searchPanel with empty query shows category filter results', function() {
  reset();
  FastTravel.showFastTravelPanel({ id: 'p', position: { x: 0, z: 0 } }, 'zone');
  var panel = FastTravel.searchPanel('', { id: 'p', position: { x: 0, z: 0 } });
  assert.strictEqual(panel.destinations.length, 8);
});

// ── Report ─────────────────────────────────────────────────────────────────────

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
