/**
 * tests/test_housing_social.js
 * 130+ tests for the ZION Housing Social system.
 * Run: node tests/test_housing_social.js
 */

'use strict';

const { test, suite, report, assert } = require('./test_runner');
const HS = require('../src/js/housing_social');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

var seq = 0;
function uid() { return 'player_' + (++seq); }

function makeHouse(style, zone) {
  return HS.createHouseState(uid(), style || 'cottage', zone || 'nexus');
}

function addRoomOk(state, type) {
  var res = HS.addRoom(state, type);
  if (res.error) throw new Error('addRoom failed: ' + res.error);
  return res.state;
}

function placeFurnOk(state, fid, roomIndex) {
  var res = HS.placeFurniture(state, fid, roomIndex !== undefined ? roomIndex : null);
  if (res.error) throw new Error('placeFurniture failed: ' + res.error);
  return res.state;
}

// ---------------------------------------------------------------------------
// SUITE 1: Catalog Integrity — HOUSE_STYLES
// ---------------------------------------------------------------------------
suite('House Styles Catalog', function() {

  test('HOUSE_STYLES is exported', function() {
    assert(typeof HS.HOUSE_STYLES === 'object' && HS.HOUSE_STYLES !== null);
  });

  test('HOUSE_STYLES has 6 entries', function() {
    assert(Object.keys(HS.HOUSE_STYLES).length === 6, 'Expected 6 styles');
  });

  var required = ['id', 'name', 'rooms', 'maxFurniture', 'desc', 'baseCost'];
  var styles = ['cottage', 'villa', 'tower', 'treehouse', 'workshop', 'garden_home'];

  styles.forEach(function(s) {
    test('HOUSE_STYLES.' + s + ' has all required fields', function() {
      var style = HS.HOUSE_STYLES[s];
      assert(style, 'Style ' + s + ' missing');
      required.forEach(function(field) {
        assert(style[field] !== undefined, s + ' missing field: ' + field);
      });
    });
  });

  test('cottage rooms=3 maxFurniture=15 baseCost=50', function() {
    var s = HS.HOUSE_STYLES.cottage;
    assert(s.rooms === 3 && s.maxFurniture === 15 && s.baseCost === 50);
  });

  test('villa rooms=5 maxFurniture=30 baseCost=150', function() {
    var s = HS.HOUSE_STYLES.villa;
    assert(s.rooms === 5 && s.maxFurniture === 30 && s.baseCost === 150);
  });

  test('tower rooms=4 maxFurniture=20 baseCost=200', function() {
    var s = HS.HOUSE_STYLES.tower;
    assert(s.rooms === 4 && s.maxFurniture === 20 && s.baseCost === 200);
  });

  test('workshop has most rooms (6)', function() {
    assert(HS.HOUSE_STYLES.workshop.rooms === 6);
  });

  test('all styles have baseCost > 0', function() {
    Object.keys(HS.HOUSE_STYLES).forEach(function(k) {
      assert(HS.HOUSE_STYLES[k].baseCost > 0, k + ' baseCost must be > 0');
    });
  });
});

// ---------------------------------------------------------------------------
// SUITE 2: Catalog Integrity — ROOM_TYPES
// ---------------------------------------------------------------------------
suite('Room Types Catalog', function() {

  test('ROOM_TYPES is exported', function() {
    assert(typeof HS.ROOM_TYPES === 'object' && HS.ROOM_TYPES !== null);
  });

  test('ROOM_TYPES has 8 entries', function() {
    assert(Object.keys(HS.ROOM_TYPES).length === 8, 'Expected 8 room types');
  });

  var roomList = ['bedroom', 'kitchen', 'workshop', 'gallery', 'library', 'garden', 'observatory', 'trophy_room'];

  roomList.forEach(function(r) {
    test('ROOM_TYPES.' + r + ' has id, name, desc, bonus', function() {
      var rt = HS.ROOM_TYPES[r];
      assert(rt, r + ' missing');
      assert(rt.id, r + ' missing id');
      assert(rt.name, r + ' missing name');
      assert(rt.desc, r + ' missing desc');
      assert(rt.bonus, r + ' missing bonus');
    });
  });

  test('bedroom bonus is rest_speed_20', function() {
    assert(HS.ROOM_TYPES.bedroom.bonus === 'rest_speed_20');
  });

  test('observatory bonus is stargazing_bonus_25', function() {
    assert(HS.ROOM_TYPES.observatory.bonus === 'stargazing_bonus_25');
  });
});

// ---------------------------------------------------------------------------
// SUITE 3: Catalog Integrity — FURNITURE
// ---------------------------------------------------------------------------
suite('Furniture Catalog', function() {

  test('FURNITURE is exported', function() {
    assert(typeof HS.FURNITURE === 'object' && HS.FURNITURE !== null);
  });

  test('FURNITURE has at least 25 items', function() {
    assert(Object.keys(HS.FURNITURE).length >= 25, 'Expected >=25 furniture items');
  });

  var requiredFields = ['id', 'name', 'rarity', 'cost', 'comfort'];
  var validRarities = ['common', 'uncommon', 'rare'];

  Object.keys(HS.FURNITURE).forEach(function(key) {
    var item = HS.FURNITURE[key];

    test('FURNITURE.' + key + ' has all required fields', function() {
      requiredFields.forEach(function(f) {
        assert(item[f] !== undefined, key + ' missing: ' + f);
      });
    });

    test('FURNITURE.' + key + ' id matches key', function() {
      assert(item.id === key, 'id mismatch for ' + key);
    });

    test('FURNITURE.' + key + ' rarity is valid', function() {
      assert(validRarities.indexOf(item.rarity) !== -1, key + ' invalid rarity: ' + item.rarity);
    });

    test('FURNITURE.' + key + ' cost > 0', function() {
      assert(item.cost > 0, key + ' cost must be > 0');
    });

    test('FURNITURE.' + key + ' comfort >= 0', function() {
      assert(item.comfort >= 0, key + ' comfort must be >= 0');
    });
  });

  test('telescope_f room is observatory', function() {
    assert(HS.FURNITURE.telescope_f.room === 'observatory');
  });

  test('fancy_bed room is bedroom', function() {
    assert(HS.FURNITURE.fancy_bed.room === 'bedroom');
  });

  test('rug room is null (any room)', function() {
    assert(HS.FURNITURE.rug.room === null);
  });

  test('getFurnitureCatalog returns FURNITURE', function() {
    var catalog = HS.getFurnitureCatalog();
    assert(typeof catalog === 'object');
    assert(Object.keys(catalog).length >= 25);
  });
});

// ---------------------------------------------------------------------------
// SUITE 4: createHouseState
// ---------------------------------------------------------------------------
suite('createHouseState', function() {

  test('returns object with all required fields', function() {
    var s = HS.createHouseState('alice', 'cottage', 'nexus');
    assert(s.ownerId === 'alice');
    assert(s.style === 'cottage');
    assert(s.zone === 'nexus');
    assert(Array.isArray(s.rooms));
    assert(Array.isArray(s.furniture));
    assert(Array.isArray(s.guestbook));
    assert(Array.isArray(s.visitors));
    assert(typeof s.rating === 'object');
    assert(typeof s.permissions === 'object');
    assert(typeof s.comfortScore === 'number');
    assert(typeof s.lastVisited === 'number');
  });

  test('rooms starts empty', function() {
    var s = HS.createHouseState('alice', 'cottage', 'nexus');
    assert(s.rooms.length === 0);
  });

  test('rating starts at zero', function() {
    var s = HS.createHouseState('alice', 'cottage', 'nexus');
    assert(s.rating.total === 0 && s.rating.count === 0);
  });

  test('default permissions: not public, friendsOnly=true', function() {
    var s = HS.createHouseState('alice', 'cottage', 'nexus');
    assert(s.permissions.public === false);
    assert(s.permissions.friendsOnly === true);
    assert(Array.isArray(s.permissions.allowList));
  });

  test('all 6 styles are valid for creation', function() {
    Object.keys(HS.HOUSE_STYLES).forEach(function(style) {
      var s = HS.createHouseState(uid(), style, 'nexus');
      assert(s.style === style);
    });
  });

  test('throws on missing ownerId', function() {
    var threw = false;
    try { HS.createHouseState(null, 'cottage'); } catch(e) { threw = true; }
    assert(threw, 'Should throw without ownerId');
  });

  test('throws on invalid style', function() {
    var threw = false;
    try { HS.createHouseState('bob', 'mansion'); } catch(e) { threw = true; }
    assert(threw, 'Should throw on invalid style');
  });

  test('zone defaults to nexus if not provided', function() {
    var s = HS.createHouseState('alice', 'cottage');
    assert(s.zone === 'nexus');
  });
});

// ---------------------------------------------------------------------------
// SUITE 5: addRoom
// ---------------------------------------------------------------------------
suite('addRoom', function() {

  test('adds a valid room to empty house', function() {
    var s = makeHouse('cottage');
    var res = HS.addRoom(s, 'bedroom');
    assert(!res.error, 'Should not error');
    assert(res.state.rooms.length === 1);
    assert(res.room.type === 'bedroom');
  });

  test('returns error for invalid room type', function() {
    var s = makeHouse('cottage');
    var res = HS.addRoom(s, 'ballroom');
    assert(res.error, 'Should error on invalid room type');
  });

  test('respects cottage room limit (3)', function() {
    var s = makeHouse('cottage');
    s = addRoomOk(s, 'bedroom');
    s = addRoomOk(s, 'kitchen');
    s = addRoomOk(s, 'workshop');
    var res = HS.addRoom(s, 'library');
    assert(res.error, 'Should error at cottage limit');
    assert(res.state.rooms.length === 3);
  });

  test('villa allows up to 5 rooms', function() {
    var s = makeHouse('villa');
    var types = ['bedroom', 'kitchen', 'workshop', 'gallery', 'library'];
    types.forEach(function(t) { s = addRoomOk(s, t); });
    assert(s.rooms.length === 5);
  });

  test('workshop style allows up to 6 rooms', function() {
    var s = makeHouse('workshop');
    var types = ['bedroom', 'kitchen', 'workshop', 'gallery', 'library', 'garden'];
    types.forEach(function(t) { s = addRoomOk(s, t); });
    assert(s.rooms.length === 6);
  });

  test('room has id, type, name, bonus, furniture array', function() {
    var s = makeHouse('cottage');
    var res = HS.addRoom(s, 'library');
    var room = res.room;
    assert(room.id !== undefined);
    assert(room.type === 'library');
    assert(room.name === 'Library');
    assert(room.bonus === 'xp_bonus_10');
    assert(Array.isArray(room.furniture));
  });

  test('does not mutate original state', function() {
    var s = makeHouse('cottage');
    var origLen = s.rooms.length;
    HS.addRoom(s, 'bedroom');
    assert(s.rooms.length === origLen, 'Original state must not be mutated');
  });

  test('addRoom with no state returns error', function() {
    var res = HS.addRoom(null, 'bedroom');
    assert(res.error, 'Should error with no state');
  });
});

// ---------------------------------------------------------------------------
// SUITE 6: placeFurniture
// ---------------------------------------------------------------------------
suite('placeFurniture', function() {

  test('places valid furniture in house', function() {
    var s = makeHouse('cottage');
    var res = HS.placeFurniture(s, 'rug', null);
    assert(!res.error);
    assert(res.state.furniture.length === 1);
  });

  test('placement has furnitureId, name, comfort, rarity', function() {
    var s = makeHouse('cottage');
    var res = HS.placeFurniture(s, 'bed', null);
    var p = res.placement;
    assert(p.furnitureId === 'bed');
    assert(p.name === 'Wooden Bed');
    assert(p.comfort === 5);
    assert(p.rarity === 'common');
  });

  test('returns error for unknown furniture', function() {
    var s = makeHouse('cottage');
    var res = HS.placeFurniture(s, 'magic_carpet', null);
    assert(res.error);
  });

  test('respects cottage furniture limit (15)', function() {
    var s = makeHouse('cottage');
    var items = ['rug', 'potted_plant', 'mirror', 'clock', 'fireplace',
                 'window_seat', 'banner', 'chandelier', 'bed', 'fancy_bed',
                 'music_box', 'herb_rack', 'stove', 'bookshelf', 'desk'];
    for (var i = 0; i < items.length; i++) {
      s = placeFurnOk(s, items[i], null);
    }
    assert(s.furniture.length === 15);
    var extra = HS.placeFurniture(s, 'potted_plant', null);
    assert(extra.error, 'Should error at limit');
  });

  test('villa allows up to 30 furniture items', function() {
    var s = makeHouse('villa');
    var item = 'potted_plant';
    for (var i = 0; i < 30; i++) {
      s = placeFurnOk(s, item, null);
    }
    assert(s.furniture.length === 30);
    var extra = HS.placeFurniture(s, item, null);
    assert(extra.error);
  });

  test('can place furniture in a specific room by index', function() {
    var s = makeHouse('villa');
    s = addRoomOk(s, 'bedroom');
    var res = HS.placeFurniture(s, 'bed', 0);
    assert(!res.error);
    assert(res.placement.roomIndex === 0);
  });

  test('invalid roomIndex returns error', function() {
    var s = makeHouse('cottage');
    var res = HS.placeFurniture(s, 'rug', 5);
    assert(res.error);
  });

  test('updates comfortScore after placement', function() {
    var s = makeHouse('cottage');
    var res = HS.placeFurniture(s, 'bed', null);
    assert(res.state.comfortScore === 5);
  });

  test('does not mutate original state', function() {
    var s = makeHouse('cottage');
    var orig = s.furniture.length;
    HS.placeFurniture(s, 'rug', null);
    assert(s.furniture.length === orig);
  });
});

// ---------------------------------------------------------------------------
// SUITE 7: removeFurniture
// ---------------------------------------------------------------------------
suite('removeFurniture', function() {

  test('removes furniture by index', function() {
    var s = makeHouse('cottage');
    s = placeFurnOk(s, 'rug', null);
    s = placeFurnOk(s, 'bed', null);
    var res = HS.removeFurniture(s, 0);
    assert(!res.error);
    assert(res.state.furniture.length === 1);
    assert(res.removed.furnitureId === 'rug');
  });

  test('removes last item correctly', function() {
    var s = makeHouse('cottage');
    s = placeFurnOk(s, 'rug', null);
    var res = HS.removeFurniture(s, 0);
    assert(res.state.furniture.length === 0);
  });

  test('returns error on out-of-range index', function() {
    var s = makeHouse('cottage');
    var res = HS.removeFurniture(s, 0);
    assert(res.error);
  });

  test('returns error on negative index', function() {
    var s = makeHouse('cottage');
    s = placeFurnOk(s, 'rug', null);
    var res = HS.removeFurniture(s, -1);
    assert(res.error);
  });

  test('updates comfortScore after removal', function() {
    var s = makeHouse('cottage');
    s = placeFurnOk(s, 'bed', null);    // comfort 5
    s = placeFurnOk(s, 'rug', null);    // comfort 6 → total 11
    var res = HS.removeFurniture(s, 0); // remove bed
    assert(res.state.comfortScore === 6);
  });

  test('does not mutate original state', function() {
    var s = makeHouse('cottage');
    s = placeFurnOk(s, 'rug', null);
    var orig = s.furniture.length;
    HS.removeFurniture(s, 0);
    assert(s.furniture.length === orig);
  });
});

// ---------------------------------------------------------------------------
// SUITE 8: calculateComfort
// ---------------------------------------------------------------------------
suite('calculateComfort', function() {

  test('returns 0 for empty house', function() {
    var s = makeHouse('cottage');
    assert(HS.calculateComfort(s) === 0);
  });

  test('sums all furniture comfort values', function() {
    var s = makeHouse('villa');
    s = placeFurnOk(s, 'bed', null);     // 5
    s = placeFurnOk(s, 'rug', null);     // 6
    s = placeFurnOk(s, 'fireplace', null); // 12
    assert(HS.calculateComfort(s) === 23);
  });

  test('returns 0 for null input', function() {
    assert(HS.calculateComfort(null) === 0);
  });

  test('comfortScore on state matches calculateComfort', function() {
    var s = makeHouse('villa');
    s = placeFurnOk(s, 'fancy_bed', null); // 15
    s = placeFurnOk(s, 'fountain', null);  // 15
    assert(s.comfortScore === HS.calculateComfort(s));
    assert(s.comfortScore === 30);
  });

  test('rare items have high comfort', function() {
    var rareItems = ['statue', 'telescope_f', 'chandelier'];
    rareItems.forEach(function(id) {
      assert(HS.FURNITURE[id].comfort >= 10, id + ' should have comfort >= 10');
    });
  });
});

// ---------------------------------------------------------------------------
// SUITE 9: visitHouse
// ---------------------------------------------------------------------------
suite('visitHouse', function() {

  test('records a visit', function() {
    var s = makeHouse('cottage');
    var res = HS.visitHouse(s, 'bob', Date.now());
    assert(!res.error);
    assert(res.state.visitors.length === 1);
    assert(res.state.visitors[0].visitorId === 'bob');
  });

  test('updates lastVisited', function() {
    var s = makeHouse('cottage');
    var ts = 1000000;
    var res = HS.visitHouse(s, 'bob', ts);
    assert(res.state.lastVisited === ts);
  });

  test('returns a message', function() {
    var s = makeHouse('cottage');
    var res = HS.visitHouse(s, 'bob', Date.now());
    assert(typeof res.message === 'string' && res.message.length > 0);
  });

  test('owner visit gives a welcome home message', function() {
    var s = HS.createHouseState('alice', 'cottage', 'nexus');
    var res = HS.visitHouse(s, 'alice', Date.now());
    assert(res.message.indexOf('alice') !== -1);
    assert(res.message.toLowerCase().indexOf('home') !== -1 || res.message.toLowerCase().indexOf('welcome') !== -1);
  });

  test('non-owner visit message mentions owner', function() {
    var s = HS.createHouseState('alice', 'cottage', 'nexus');
    var res = HS.visitHouse(s, 'bob', Date.now());
    assert(res.message.indexOf('alice') !== -1);
  });

  test('comfortBonus is 0 when comfort is low', function() {
    var s = makeHouse('cottage');
    var res = HS.visitHouse(s, 'bob', Date.now());
    assert(res.comfortBonus === 0);
  });

  test('comfortBonus > 0 when comfort >= 50', function() {
    var s = makeHouse('villa');
    // Place enough furniture to reach 50 comfort
    s = placeFurnOk(s, 'fountain', null);   // 15
    s = placeFurnOk(s, 'fancy_bed', null);  // 15
    s = placeFurnOk(s, 'fireplace', null);  // 12
    s = placeFurnOk(s, 'statue', null);     // 12
    // total = 54 >= 50
    var res = HS.visitHouse(s, 'bob', Date.now());
    assert(res.comfortBonus > 0, 'Expected comfortBonus > 0, got: ' + res.comfortBonus);
  });

  test('multiple visits accumulate in visitors array', function() {
    var s = makeHouse('cottage');
    var res1 = HS.visitHouse(s, 'bob', 1000);
    var res2 = HS.visitHouse(res1.state, 'carol', 2000);
    assert(res2.state.visitors.length === 2);
  });

  test('returns error without visitorId', function() {
    var s = makeHouse('cottage');
    var res = HS.visitHouse(s, null, Date.now());
    assert(res.error);
  });

  test('does not mutate original state', function() {
    var s = makeHouse('cottage');
    var orig = s.visitors.length;
    HS.visitHouse(s, 'bob', Date.now());
    assert(s.visitors.length === orig);
  });
});

// ---------------------------------------------------------------------------
// SUITE 10: leaveGuestbookEntry
// ---------------------------------------------------------------------------
suite('leaveGuestbookEntry', function() {

  test('adds an entry to empty guestbook', function() {
    var s = makeHouse('cottage');
    var res = HS.leaveGuestbookEntry(s, 'bob', 'Nice place!', Date.now());
    assert(!res.error);
    assert(res.state.guestbook.length === 1);
  });

  test('entry has visitorId, message, timestamp', function() {
    var s = makeHouse('cottage');
    var ts = 99999;
    var res = HS.leaveGuestbookEntry(s, 'bob', 'Hello!', ts);
    var entry = res.entry;
    assert(entry.visitorId === 'bob');
    assert(entry.message === 'Hello!');
    assert(entry.timestamp === ts);
  });

  test('sanitizes HTML in message', function() {
    var s = makeHouse('cottage');
    var res = HS.leaveGuestbookEntry(s, 'bob', '<script>alert(1)</script>', Date.now());
    assert(!res.error);
    var msg = res.entry.message;
    assert(msg.indexOf('<script>') === -1, 'Should strip script tags');
    assert(msg.indexOf('&lt;') !== -1 || msg.indexOf('script') !== -1, 'Should encode/escape content');
  });

  test('truncates message to 200 chars', function() {
    var s = makeHouse('cottage');
    var longMsg = 'x'.repeat(500);
    var res = HS.leaveGuestbookEntry(s, 'bob', longMsg, Date.now());
    assert(!res.error);
    assert(res.entry.message.length <= 200);
  });

  test('rejects empty message', function() {
    var s = makeHouse('cottage');
    var res = HS.leaveGuestbookEntry(s, 'bob', '', Date.now());
    assert(res.error);
  });

  test('rejects whitespace-only message', function() {
    var s = makeHouse('cottage');
    var res = HS.leaveGuestbookEntry(s, 'bob', '   ', Date.now());
    assert(res.error);
  });

  test('rejects non-string message', function() {
    var s = makeHouse('cottage');
    var res = HS.leaveGuestbookEntry(s, 'bob', 12345, Date.now());
    assert(res.error);
  });

  test('rejects missing visitorId', function() {
    var s = makeHouse('cottage');
    var res = HS.leaveGuestbookEntry(s, null, 'hello', Date.now());
    assert(res.error);
  });

  test('does not mutate original state', function() {
    var s = makeHouse('cottage');
    var orig = s.guestbook.length;
    HS.leaveGuestbookEntry(s, 'bob', 'hi', Date.now());
    assert(s.guestbook.length === orig);
  });

  test('owner can leave a guestbook entry', function() {
    var s = HS.createHouseState('alice', 'cottage', 'nexus');
    var res = HS.leaveGuestbookEntry(s, 'alice', 'My own home!', Date.now());
    assert(!res.error);
    assert(res.state.guestbook.length === 1);
  });

  test('sanitizes angle brackets', function() {
    var s = makeHouse('cottage');
    var res = HS.leaveGuestbookEntry(s, 'bob', '<b>bold</b>', Date.now());
    assert(!res.error);
    assert(res.entry.message.indexOf('<b>') === -1);
  });
});

// ---------------------------------------------------------------------------
// SUITE 11: getGuestbook
// ---------------------------------------------------------------------------
suite('getGuestbook', function() {

  test('returns empty array for empty guestbook', function() {
    var s = makeHouse('cottage');
    var gb = HS.getGuestbook(s, 10);
    assert(Array.isArray(gb) && gb.length === 0);
  });

  test('returns entries newest first', function() {
    var s = makeHouse('cottage');
    var r1 = HS.leaveGuestbookEntry(s, 'alice', 'first', 1000);
    var r2 = HS.leaveGuestbookEntry(r1.state, 'bob', 'second', 2000);
    var gb = HS.getGuestbook(r2.state, 10);
    assert(gb[0].message === 'second');
    assert(gb[1].message === 'first');
  });

  test('respects limit parameter', function() {
    var s = makeHouse('cottage');
    for (var i = 0; i < 5; i++) {
      var r = HS.leaveGuestbookEntry(s, 'p' + i, 'msg ' + i, i * 1000);
      s = r.state;
    }
    var gb = HS.getGuestbook(s, 2);
    assert(gb.length === 2);
  });

  test('returns all entries when no limit given', function() {
    var s = makeHouse('cottage');
    for (var i = 0; i < 5; i++) {
      var r = HS.leaveGuestbookEntry(s, 'p' + i, 'msg ' + i, i * 1000);
      s = r.state;
    }
    var gb = HS.getGuestbook(s);
    assert(gb.length === 5);
  });

  test('handles null state gracefully', function() {
    var gb = HS.getGuestbook(null, 10);
    assert(Array.isArray(gb) && gb.length === 0);
  });
});

// ---------------------------------------------------------------------------
// SUITE 12: rateHouse
// ---------------------------------------------------------------------------
suite('rateHouse', function() {

  test('adds a rating successfully', function() {
    var s = makeHouse('cottage');
    var res = HS.rateHouse(s, 'bob', 4);
    assert(!res.error);
    assert(res.state.rating.count === 1);
    assert(res.state.rating.total === 4);
  });

  test('averageRating returned matches total/count', function() {
    var s = makeHouse('cottage');
    var res = HS.rateHouse(s, 'bob', 4);
    assert(res.averageRating === 4);
  });

  test('rejects rating below 1', function() {
    var s = makeHouse('cottage');
    var res = HS.rateHouse(s, 'bob', 0);
    assert(res.error);
  });

  test('rejects rating above 5', function() {
    var s = makeHouse('cottage');
    var res = HS.rateHouse(s, 'bob', 6);
    assert(res.error);
  });

  test('rejects non-integer rating', function() {
    var s = makeHouse('cottage');
    var res = HS.rateHouse(s, 'bob', 3.5);
    assert(res.error);
  });

  test('prevents same visitor rating twice', function() {
    var s = makeHouse('cottage');
    var r1 = HS.rateHouse(s, 'bob', 5);
    var r2 = HS.rateHouse(r1.state, 'bob', 3);
    assert(r2.error, 'Should prevent duplicate rating');
    assert(r2.state.rating.count === 1);
  });

  test('allows different visitors to rate', function() {
    var s = makeHouse('cottage');
    var r1 = HS.rateHouse(s, 'alice', 5);
    var r2 = HS.rateHouse(r1.state, 'bob', 3);
    assert(!r2.error);
    assert(r2.state.rating.count === 2);
  });

  test('average of 5 and 3 is 4', function() {
    var s = makeHouse('cottage');
    var r1 = HS.rateHouse(s, 'alice', 5);
    var r2 = HS.rateHouse(r1.state, 'bob', 3);
    assert(r2.averageRating === 4);
  });

  test('rejects missing visitorId', function() {
    var s = makeHouse('cottage');
    var res = HS.rateHouse(s, null, 4);
    assert(res.error);
  });

  test('does not mutate original state', function() {
    var s = makeHouse('cottage');
    var orig = s.rating.count;
    HS.rateHouse(s, 'bob', 5);
    assert(s.rating.count === orig);
  });
});

// ---------------------------------------------------------------------------
// SUITE 13: getAverageRating
// ---------------------------------------------------------------------------
suite('getAverageRating', function() {

  test('returns 0 when no ratings', function() {
    var s = makeHouse('cottage');
    assert(HS.getAverageRating(s) === 0);
  });

  test('returns exact value for single rating', function() {
    var s = makeHouse('cottage');
    var r = HS.rateHouse(s, 'bob', 5);
    assert(HS.getAverageRating(r.state) === 5);
  });

  test('returns rounded average for multiple ratings', function() {
    var s = makeHouse('cottage');
    var r1 = HS.rateHouse(s, 'a', 4);
    var r2 = HS.rateHouse(r1.state, 'b', 5);
    var r3 = HS.rateHouse(r2.state, 'c', 3);
    // avg = 12/3 = 4.0
    assert(HS.getAverageRating(r3.state) === 4);
  });

  test('returns 0 for null state', function() {
    assert(HS.getAverageRating(null) === 0);
  });
});

// ---------------------------------------------------------------------------
// SUITE 14: getVisitorCount
// ---------------------------------------------------------------------------
suite('getVisitorCount', function() {

  test('returns 0 for no visitors', function() {
    var s = makeHouse('cottage');
    assert(HS.getVisitorCount(s) === 0);
  });

  test('owner visits do not count', function() {
    var s = HS.createHouseState('alice', 'cottage', 'nexus');
    var r = HS.visitHouse(s, 'alice', Date.now());
    assert(HS.getVisitorCount(r.state) === 0);
  });

  test('unique non-owner visitors are counted', function() {
    var s = HS.createHouseState('alice', 'cottage', 'nexus');
    var r1 = HS.visitHouse(s, 'bob', 1000);
    var r2 = HS.visitHouse(r1.state, 'carol', 2000);
    assert(HS.getVisitorCount(r2.state) === 2);
  });

  test('same visitor multiple times counts as 1', function() {
    var s = HS.createHouseState('alice', 'cottage', 'nexus');
    var r1 = HS.visitHouse(s, 'bob', 1000);
    var r2 = HS.visitHouse(r1.state, 'bob', 2000);
    assert(HS.getVisitorCount(r2.state) === 1);
  });

  test('returns 0 for null state', function() {
    assert(HS.getVisitorCount(null) === 0);
  });
});

// ---------------------------------------------------------------------------
// SUITE 15: getRecentVisitors
// ---------------------------------------------------------------------------
suite('getRecentVisitors', function() {

  test('returns empty array for no visitors', function() {
    var s = makeHouse('cottage');
    assert(HS.getRecentVisitors(s, 5).length === 0);
  });

  test('returns visitors newest first', function() {
    var s = makeHouse('cottage');
    var r1 = HS.visitHouse(s, 'alice', 1000);
    var r2 = HS.visitHouse(r1.state, 'bob', 2000);
    var visitors = HS.getRecentVisitors(r2.state, 5);
    assert(visitors[0].visitorId === 'bob');
    assert(visitors[1].visitorId === 'alice');
  });

  test('respects limit parameter', function() {
    var s = makeHouse('cottage');
    for (var i = 0; i < 5; i++) {
      var r = HS.visitHouse(s, 'player' + i, i * 1000);
      s = r.state;
    }
    var visitors = HS.getRecentVisitors(s, 2);
    assert(visitors.length === 2);
  });

  test('handles null state gracefully', function() {
    var v = HS.getRecentVisitors(null, 5);
    assert(Array.isArray(v) && v.length === 0);
  });
});

// ---------------------------------------------------------------------------
// SUITE 16: setPermissions
// ---------------------------------------------------------------------------
suite('setPermissions', function() {

  test('sets public to true', function() {
    var s = makeHouse('cottage');
    var res = HS.setPermissions(s, { public: true });
    assert(res.state.permissions.public === true);
  });

  test('sets friendsOnly to false', function() {
    var s = makeHouse('cottage');
    var res = HS.setPermissions(s, { friendsOnly: false });
    assert(res.state.permissions.friendsOnly === false);
  });

  test('sets allowList', function() {
    var s = makeHouse('cottage');
    var res = HS.setPermissions(s, { allowList: ['bob', 'carol'] });
    assert(res.state.permissions.allowList.indexOf('bob') !== -1);
    assert(res.state.permissions.allowList.indexOf('carol') !== -1);
  });

  test('partial update only changes specified fields', function() {
    var s = makeHouse('cottage');
    var res = HS.setPermissions(s, { public: true });
    assert(res.state.permissions.friendsOnly === s.permissions.friendsOnly);
  });

  test('does not mutate original state', function() {
    var s = makeHouse('cottage');
    var orig = s.permissions.public;
    HS.setPermissions(s, { public: true });
    assert(s.permissions.public === orig);
  });

  test('returns error for null state', function() {
    var res = HS.setPermissions(null, { public: true });
    assert(res.error);
  });
});

// ---------------------------------------------------------------------------
// SUITE 17: canVisit
// ---------------------------------------------------------------------------
suite('canVisit', function() {

  test('owner can always visit', function() {
    var s = HS.createHouseState('alice', 'cottage', 'nexus');
    assert(HS.canVisit(s, 'alice') === true);
  });

  test('stranger cannot visit private house', function() {
    var s = HS.createHouseState('alice', 'cottage', 'nexus');
    // Default: friendsOnly=true, public=false
    assert(HS.canVisit(s, 'stranger') === false);
  });

  test('public house allows everyone', function() {
    var s = HS.createHouseState('alice', 'cottage', 'nexus');
    var res = HS.setPermissions(s, { public: true, friendsOnly: false });
    assert(HS.canVisit(res.state, 'stranger') === true);
  });

  test('allow-listed player can visit', function() {
    var s = HS.createHouseState('alice', 'cottage', 'nexus');
    var res = HS.setPermissions(s, { allowList: ['bob'] });
    assert(HS.canVisit(res.state, 'bob') === true);
  });

  test('non-allow-listed player cannot visit friends-only house', function() {
    var s = HS.createHouseState('alice', 'cottage', 'nexus');
    var res = HS.setPermissions(s, { allowList: ['bob'], friendsOnly: true });
    assert(HS.canVisit(res.state, 'carol') === false);
  });

  test('returns false for null state', function() {
    assert(HS.canVisit(null, 'bob') === false);
  });

  test('returns false for null visitorId', function() {
    var s = makeHouse('cottage');
    assert(HS.canVisit(s, null) === false);
  });
});

// ---------------------------------------------------------------------------
// SUITE 18: getHouseBonus
// ---------------------------------------------------------------------------
suite('getHouseBonus', function() {

  test('returns empty array for house with no rooms', function() {
    var s = makeHouse('cottage');
    assert(HS.getHouseBonus(s).length === 0);
  });

  test('returns bonus for each room', function() {
    var s = makeHouse('villa');
    s = addRoomOk(s, 'bedroom');
    s = addRoomOk(s, 'library');
    var bonuses = HS.getHouseBonus(s);
    assert(bonuses.indexOf('rest_speed_20') !== -1);
    assert(bonuses.indexOf('xp_bonus_10') !== -1);
  });

  test('multiple rooms return multiple bonuses', function() {
    var s = makeHouse('workshop');
    s = addRoomOk(s, 'bedroom');
    s = addRoomOk(s, 'kitchen');
    s = addRoomOk(s, 'workshop');
    var bonuses = HS.getHouseBonus(s);
    assert(bonuses.length === 3);
  });

  test('returns null-safe empty array for null state', function() {
    var bonuses = HS.getHouseBonus(null);
    assert(Array.isArray(bonuses) && bonuses.length === 0);
  });

  test('observatory room bonus is stargazing_bonus_25', function() {
    var s = makeHouse('villa');
    s = addRoomOk(s, 'observatory');
    var bonuses = HS.getHouseBonus(s);
    assert(bonuses.indexOf('stargazing_bonus_25') !== -1);
  });
});

// ---------------------------------------------------------------------------
// SUITE 19: getTopRatedHouses
// ---------------------------------------------------------------------------
suite('getTopRatedHouses', function() {

  test('returns empty array for empty input', function() {
    assert(HS.getTopRatedHouses([]).length === 0);
  });

  test('returns houses sorted by rating descending', function() {
    var h1 = makeHouse('cottage');
    var h2 = makeHouse('villa');
    var h3 = makeHouse('tower');
    var r1 = HS.rateHouse(h1, 'x', 2);
    var r2 = HS.rateHouse(h2, 'y', 5);
    var r3 = HS.rateHouse(h3, 'z', 3);
    var top = HS.getTopRatedHouses([r1.state, r2.state, r3.state]);
    assert(HS.getAverageRating(top[0]) === 5);
    assert(HS.getAverageRating(top[1]) === 3);
    assert(HS.getAverageRating(top[2]) === 2);
  });

  test('respects limit parameter', function() {
    var houses = [];
    for (var i = 1; i <= 5; i++) {
      var h = makeHouse('cottage');
      var r = HS.rateHouse(h, 'voter' + i, i);
      houses.push(r.state);
    }
    var top = HS.getTopRatedHouses(houses, 3);
    assert(top.length === 3);
  });

  test('handles non-array gracefully', function() {
    var result = HS.getTopRatedHouses(null);
    assert(Array.isArray(result) && result.length === 0);
  });

  test('unrated houses rank last', function() {
    var rated = makeHouse('cottage');
    var r = HS.rateHouse(rated, 'bob', 3);
    var unrated = makeHouse('villa');
    var top = HS.getTopRatedHouses([unrated, r.state]);
    assert(HS.getAverageRating(top[0]) === 3);
    assert(HS.getAverageRating(top[1]) === 0);
  });
});

// ---------------------------------------------------------------------------
// SUITE 20: Formatting Functions
// ---------------------------------------------------------------------------
suite('formatHouseCard', function() {

  test('returns an HTML string', function() {
    var s = makeHouse('cottage');
    var html = HS.formatHouseCard(s);
    assert(typeof html === 'string');
    assert(html.indexOf('<div') !== -1);
  });

  test('includes owner id', function() {
    var s = HS.createHouseState('alice', 'cottage', 'nexus');
    var html = HS.formatHouseCard(s);
    assert(html.indexOf('alice') !== -1);
  });

  test('includes style name', function() {
    var s = makeHouse('villa');
    var html = HS.formatHouseCard(s);
    assert(html.toLowerCase().indexOf('villa') !== -1);
  });

  test('includes rating stars', function() {
    var s = makeHouse('cottage');
    var html = HS.formatHouseCard(s);
    assert(html.indexOf('&#9733;') !== -1 || html.indexOf('&#9734;') !== -1);
  });

  test('sanitizes HTML in owner id', function() {
    var s = HS.createHouseState('<evil>', 'cottage', 'nexus');
    var html = HS.formatHouseCard(s);
    assert(html.indexOf('<evil>') === -1);
  });

  test('handles null gracefully', function() {
    var html = HS.formatHouseCard(null);
    assert(typeof html === 'string');
  });

  test('shows room bonuses when rooms present', function() {
    var s = makeHouse('villa');
    s = addRoomOk(s, 'observatory');
    var html = HS.formatHouseCard(s);
    assert(html.indexOf('stargazing_bonus_25') !== -1);
  });

  test('shows access level label', function() {
    var s = makeHouse('cottage');
    var html = HS.formatHouseCard(s);
    assert(
      html.indexOf('Public') !== -1 ||
      html.indexOf('Friends Only') !== -1 ||
      html.indexOf('Private') !== -1
    );
  });
});

suite('formatGuestbookEntry', function() {

  test('returns an HTML string', function() {
    var s = makeHouse('cottage');
    var r = HS.leaveGuestbookEntry(s, 'bob', 'Great house!', Date.now());
    var html = HS.formatGuestbookEntry(r.entry);
    assert(typeof html === 'string');
    assert(html.indexOf('<div') !== -1);
  });

  test('includes visitorId', function() {
    var s = makeHouse('cottage');
    var r = HS.leaveGuestbookEntry(s, 'alice', 'Hello!', Date.now());
    var html = HS.formatGuestbookEntry(r.entry);
    assert(html.indexOf('alice') !== -1);
  });

  test('includes message text', function() {
    var s = makeHouse('cottage');
    var r = HS.leaveGuestbookEntry(s, 'bob', 'Lovely home!', Date.now());
    var html = HS.formatGuestbookEntry(r.entry);
    assert(html.indexOf('Lovely home!') !== -1);
  });

  test('includes a date string', function() {
    var s = makeHouse('cottage');
    var r = HS.leaveGuestbookEntry(s, 'bob', 'hi', 1000000000000);
    var html = HS.formatGuestbookEntry(r.entry);
    // Should contain a year
    assert(/\d{4}/.test(html));
  });

  test('handles null entry gracefully', function() {
    var html = HS.formatGuestbookEntry(null);
    assert(typeof html === 'string');
  });
});

suite('formatRoomLayout', function() {

  test('returns a string', function() {
    var s = makeHouse('villa');
    var layout = HS.formatRoomLayout(s);
    assert(typeof layout === 'string');
  });

  test('shows "empty" for house with no rooms', function() {
    var s = makeHouse('cottage');
    var layout = HS.formatRoomLayout(s);
    assert(layout.indexOf('empty') !== -1);
  });

  test('includes room count for populated house', function() {
    var s = makeHouse('villa');
    s = addRoomOk(s, 'bedroom');
    s = addRoomOk(s, 'kitchen');
    var layout = HS.formatRoomLayout(s);
    assert(layout.indexOf('2') !== -1);
  });

  test('includes style name', function() {
    var s = makeHouse('tower');
    s = addRoomOk(s, 'observatory');
    var layout = HS.formatRoomLayout(s);
    assert(layout.toLowerCase().indexOf('tower') !== -1);
  });

  test('contains ASCII box characters', function() {
    var s = makeHouse('cottage');
    s = addRoomOk(s, 'bedroom');
    var layout = HS.formatRoomLayout(s);
    assert(layout.indexOf('+') !== -1);
    assert(layout.indexOf('|') !== -1);
  });

  test('handles null gracefully', function() {
    var layout = HS.formatRoomLayout(null);
    assert(typeof layout === 'string');
  });
});

// ---------------------------------------------------------------------------
// SUITE 21: Edge Cases & Integration
// ---------------------------------------------------------------------------
suite('Edge Cases', function() {

  test('visiting own house does not add to visitor count', function() {
    var s = HS.createHouseState('alice', 'cottage', 'nexus');
    var r = HS.visitHouse(s, 'alice', Date.now());
    assert(HS.getVisitorCount(r.state) === 0);
  });

  test('owner can rate their own house', function() {
    var s = HS.createHouseState('alice', 'cottage', 'nexus');
    var res = HS.rateHouse(s, 'alice', 5);
    assert(!res.error);
  });

  test('rating without visiting is allowed', function() {
    var s = makeHouse('cottage');
    var res = HS.rateHouse(s, 'bob', 4);
    assert(!res.error, 'Should allow rating without visiting');
  });

  test('full workflow: visit, rate, guestbook, permissions', function() {
    var s = HS.createHouseState('owner1', 'villa', 'gardens');
    // Add rooms
    s = addRoomOk(s, 'bedroom');
    s = addRoomOk(s, 'library');
    // Add furniture
    s = placeFurnOk(s, 'bed', 0);
    s = placeFurnOk(s, 'bookshelf', 1);
    // Open to public
    var permRes = HS.setPermissions(s, { public: true, friendsOnly: false });
    s = permRes.state;
    // Visit
    var visitRes = HS.visitHouse(s, 'visitor1', 1000);
    s = visitRes.state;
    // Guestbook
    var gbRes = HS.leaveGuestbookEntry(s, 'visitor1', 'Beautiful villa!', 2000);
    s = gbRes.state;
    // Rate
    var rateRes = HS.rateHouse(s, 'visitor1', 5);
    s = rateRes.state;
    // Check everything
    assert(HS.canVisit(s, 'stranger') === true);
    assert(HS.getVisitorCount(s) === 1);
    assert(HS.getGuestbook(s, 1)[0].message === 'Beautiful villa!');
    assert(HS.getAverageRating(s) === 5);
    assert(HS.calculateComfort(s) === 5 + 4); // bed=5, bookshelf=4
    var bonuses = HS.getHouseBonus(s);
    assert(bonuses.indexOf('rest_speed_20') !== -1);
    assert(bonuses.indexOf('xp_bonus_10') !== -1);
  });

  test('state immutability: chained operations do not interfere', function() {
    var s0 = makeHouse('villa');
    var r1 = HS.addRoom(s0, 'bedroom');
    var r2 = HS.addRoom(s0, 'kitchen');
    // Both branch from s0; each should have exactly 1 room
    assert(r1.state.rooms.length === 1);
    assert(r2.state.rooms.length === 1);
    assert(s0.rooms.length === 0);
  });

  test('treehouse furniture limit is 12', function() {
    var s = makeHouse('treehouse');
    var items = ['rug', 'potted_plant', 'mirror', 'clock', 'fireplace',
                 'window_seat', 'banner', 'bed', 'herb_rack', 'stove', 'bookshelf', 'desk'];
    for (var i = 0; i < items.length; i++) {
      s = placeFurnOk(s, items[i], null);
    }
    assert(s.furniture.length === 12);
    var extra = HS.placeFurniture(s, 'potted_plant', null);
    assert(extra.error);
  });

  test('getTopRatedHouses does not mutate input array', function() {
    var h1 = makeHouse('cottage');
    var h2 = makeHouse('villa');
    var r1 = HS.rateHouse(h1, 'x', 2);
    var r2 = HS.rateHouse(h2, 'y', 5);
    var arr = [r1.state, r2.state];
    var first = arr[0];
    HS.getTopRatedHouses(arr, 2);
    assert(arr[0] === first, 'Input array should not be mutated');
  });
});

// ---------------------------------------------------------------------------
// Final report
// ---------------------------------------------------------------------------

if (!report()) {
  process.exit(1);
}
