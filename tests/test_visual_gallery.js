/**
 * tests/test_visual_gallery.js
 * 200+ tests for the ZION Visual Gallery system.
 *
 * Run: node tests/test_visual_gallery.js
 */
'use strict';

var VG = require('../src/js/visual_gallery');

// ---------------------------------------------------------------------------
// Minimal test harness
// ---------------------------------------------------------------------------
var passed   = 0;
var failed   = 0;
var failures = [];

function assert(condition, msg) {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(msg || 'assertion failed');
    console.log('  FAIL: ' + (msg || 'assertion failed'));
  }
}

function assertEqual(a, b, msg) {
  assert(a === b,
    (msg || 'assertEqual') + ' — expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a));
}

function assertNotEqual(a, b, msg) {
  assert(a !== b,
    (msg || 'assertNotEqual') + ' — expected values to differ, both are ' + JSON.stringify(a));
}

function assertApprox(a, b, tolerance, msg) {
  var tol = tolerance !== undefined ? tolerance : 0.001;
  assert(Math.abs(a - b) <= tol,
    (msg || 'assertApprox') + ' — expected ~' + b + ', got ' + a);
}

function assertDefined(val, msg) {
  assert(val !== undefined && val !== null, (msg || 'assertDefined') + ' — got ' + val);
}

function assertUndefined(val, msg) {
  assert(val === undefined || val === null, (msg || 'assertUndefined') + ' — got ' + JSON.stringify(val));
}

function assertType(val, type, msg) {
  assert(typeof val === type, (msg || 'assertType') + ' — expected ' + type + ', got ' + typeof val);
}

function assertArray(val, msg) {
  assert(Array.isArray(val), (msg || 'assertArray') + ' — got ' + typeof val);
}

function assertGT(a, b, msg) {
  assert(a > b, (msg || 'assertGT') + ' — expected ' + a + ' > ' + b);
}

function assertGTE(a, b, msg) {
  assert(a >= b, (msg || 'assertGTE') + ' — expected ' + a + ' >= ' + b);
}

function assertLTE(a, b, msg) {
  assert(a <= b, (msg || 'assertLTE') + ' — expected ' + a + ' <= ' + b);
}

function assertIncludes(arr, val, msg) {
  assert(Array.isArray(arr) && arr.indexOf(val) !== -1,
    (msg || 'assertIncludes') + ' — ' + JSON.stringify(val) + ' not in array');
}

function suite(name) {
  console.log('\n--- ' + name + ' ---');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

var _playerCounter = 0;
function uid(prefix) {
  return (prefix || 'player') + '_' + (++_playerCounter);
}

function freshState() {
  return {};
}

function stateWithGallery() {
  var s = freshState();
  VG.initGallery(s);
  return s;
}

function makeArtwork(state, artistId, overrides) {
  var opts = Object.assign({ title: 'Test Art', medium: 'pixel', width: 8, height: 8 }, overrides || {});
  return VG.createArtwork(state, artistId, opts);
}

// ============================================================================
// SUITE 1: Module exports
// ============================================================================
suite('Module Exports');

assert(typeof VG === 'object', 'module is an object');
assert(typeof VG.initGallery === 'function', 'initGallery exported');
assert(typeof VG.createArtwork === 'function', 'createArtwork exported');
assert(typeof VG.getArtwork === 'function', 'getArtwork exported');
assert(typeof VG.getArtistArtworks === 'function', 'getArtistArtworks exported');
assert(typeof VG.displayArtwork === 'function', 'displayArtwork exported');
assert(typeof VG.removeArtworkFromWall === 'function', 'removeArtworkFromWall exported');
assert(typeof VG.getRoomDisplay === 'function', 'getRoomDisplay exported');
assert(typeof VG.recordView === 'function', 'recordView exported');
assert(typeof VG.rateArtwork === 'function', 'rateArtwork exported');
assert(typeof VG.getRating === 'function', 'getRating exported');
assert(typeof VG.createExhibition === 'function', 'createExhibition exported');
assert(typeof VG.addArtworkToExhibition === 'function', 'addArtworkToExhibition exported');
assert(typeof VG.removeArtworkFromExhibition === 'function', 'removeArtworkFromExhibition exported');
assert(typeof VG.getExhibition === 'function', 'getExhibition exported');
assert(typeof VG.closeExhibition === 'function', 'closeExhibition exported');
assert(typeof VG.viewExhibition === 'function', 'viewExhibition exported');
assert(typeof VG.listArtForTrade === 'function', 'listArtForTrade exported');
assert(typeof VG.cancelTradeListing === 'function', 'cancelTradeListing exported');
assert(typeof VG.purchaseArtwork === 'function', 'purchaseArtwork exported');
assert(typeof VG.getTradeListings === 'function', 'getTradeListings exported');
assert(typeof VG.lockArtwork === 'function', 'lockArtwork exported');
assert(typeof VG.getFeaturedArtworks === 'function', 'getFeaturedArtworks exported');
assert(typeof VG.getRoomInfo === 'function', 'getRoomInfo exported');
assert(typeof VG.getAllRooms === 'function', 'getAllRooms exported');
assert(typeof VG.getArtworksInRoom === 'function', 'getArtworksInRoom exported');
assert(typeof VG.searchArtworks === 'function', 'searchArtworks exported');
assert(typeof VG.getTopByViews === 'function', 'getTopByViews exported');
assert(typeof VG.getTopByRating === 'function', 'getTopByRating exported');
assert(typeof VG.getGalleryStats === 'function', 'getGalleryStats exported');
assert(typeof VG.deleteArtwork === 'function', 'deleteArtwork exported');
assert(typeof VG.generatePixelData === 'function', 'generatePixelData exported');
assert(typeof VG.generateTextData === 'function', 'generateTextData exported');
assert(typeof VG.generatePatternData === 'function', 'generatePatternData exported');
assert(typeof VG.getArtistProfile === 'function', 'getArtistProfile exported');
assert(typeof VG.getConstants === 'function', 'getConstants exported');

// ============================================================================
// SUITE 2: initGallery
// ============================================================================
suite('initGallery');

(function() {
  var s = freshState();
  assert(!s.gallery, 'gallery not present before init');
  VG.initGallery(s);
  assertDefined(s.gallery, 'gallery initialised');
  assertType(s.gallery.artworks, 'object', 'artworks object');
  assertType(s.gallery.wallSlots, 'object', 'wallSlots object');
  assertType(s.gallery.exhibitions, 'object', 'exhibitions object');
  assertType(s.gallery.ratings, 'object', 'ratings object');
  assertType(s.gallery.viewLog, 'object', 'viewLog object');
  assertType(s.gallery.artistProfiles, 'object', 'artistProfiles object');
  assertArray(s.gallery.featured, 'featured is array');
  assertType(s.gallery.tradeListing, 'object', 'tradeListing object');

  // Wall slots initialised for all rooms
  assertDefined(s.gallery.wallSlots['main_hall'], 'main_hall slots exist');
  assertDefined(s.gallery.wallSlots['east_wing'], 'east_wing slots exist');
  assertDefined(s.gallery.wallSlots['west_wing'], 'west_wing slots exist');
  assertDefined(s.gallery.wallSlots['atrium'], 'atrium slots exist');
  assertDefined(s.gallery.wallSlots['vault'], 'vault slots exist');

  // Idempotent — calling again doesn't wipe existing data
  var s2 = freshState();
  VG.initGallery(s2);
  var art = makeArtwork(s2, 'artist1');
  VG.initGallery(s2); // re-init
  assertDefined(s2.gallery.artworks[art.artworkId], 'existing artwork survives re-init');
})();

// ============================================================================
// SUITE 3: Artwork Creation
// ============================================================================
suite('Artwork Creation — happy path');

(function() {
  var s = stateWithGallery();
  var artist = uid('a');

  var res = VG.createArtwork(s, artist, { title: 'Sunrise', medium: 'pixel', width: 16, height: 16 });
  assertEqual(res.success, true, 'create pixel artwork success');
  assertDefined(res.artworkId, 'artworkId returned');
  assertDefined(res.artwork, 'artwork object returned');
  assertEqual(res.artwork.title, 'Sunrise', 'title set');
  assertEqual(res.artwork.medium, 'pixel', 'medium set');
  assertEqual(res.artwork.width, 16, 'width set');
  assertEqual(res.artwork.height, 16, 'height set');
  assertEqual(res.artwork.artistId, artist, 'artistId set');
  assertEqual(res.artwork.views, 0, 'views start at 0');
  assertEqual(res.artwork.rarity, 'common', 'initial rarity is common');
  assertEqual(res.artwork.tradeable, true, 'tradeable by default');
  assertType(res.artwork.price, 'number', 'price is number');

  // text medium
  var res2 = VG.createArtwork(s, artist, { title: 'Poem', medium: 'text', width: 40, height: 10 });
  assertEqual(res2.success, true, 'create text artwork success');
  assertEqual(res2.artwork.medium, 'text', 'text medium set');

  // pattern medium
  var res3 = VG.createArtwork(s, artist, { title: 'Grid', medium: 'pattern', width: 8, height: 8 });
  assertEqual(res3.success, true, 'create pattern artwork success');
  assertEqual(res3.artwork.medium, 'pattern', 'pattern medium set');

  // with description
  var res4 = VG.createArtwork(s, artist, { title: 'Desc', medium: 'pixel', description: 'A test piece' });
  assertEqual(res4.artwork.description, 'A test piece', 'description set');

  // with data
  var data = [1, 2, 3, 4];
  var res5 = VG.createArtwork(s, artist, { title: 'With Data', medium: 'pixel', data: data });
  assert(Array.isArray(res5.artwork.data), 'data stored');
  assertEqual(res5.artwork.data.length, 4, 'data length preserved');

  // Artist profile created
  var profile = VG.getArtistProfile(s, artist);
  assertDefined(profile, 'artist profile created');
  assertEqual(profile.playerId, artist, 'profile playerId');
  assertIncludes(profile.artworks, res.artworkId, 'artworkId in profile');
  assertEqual(profile.rank, 'apprentice', 'initial rank apprentice');
})();

suite('Artwork Creation — validation');

(function() {
  var s = stateWithGallery();
  var artist = uid();

  // Missing title
  var r1 = VG.createArtwork(s, artist, { medium: 'pixel' });
  assertEqual(r1.success, false, 'fails without title');
  assertDefined(r1.error, 'error provided');

  // Invalid medium
  var r2 = VG.createArtwork(s, artist, { title: 'X', medium: 'oil' });
  assertEqual(r2.success, false, 'fails with invalid medium');

  // Invalid artist ID
  var r3 = VG.createArtwork(s, null, { title: 'X', medium: 'pixel' });
  assertEqual(r3.success, false, 'fails with null artist');

  var r4 = VG.createArtwork(s, '', { title: 'X', medium: 'pixel' });
  assertEqual(r4.success, false, 'fails with empty artist');

  // Title too long
  var longTitle = new Array(82).join('X');
  var r5 = VG.createArtwork(s, artist, { title: longTitle, medium: 'pixel' });
  assertEqual(r5.success, false, 'fails with title > 80 chars');

  // Width out of range
  var r6 = VG.createArtwork(s, artist, { title: 'Big', medium: 'pixel', width: 999, height: 8 });
  assertEqual(r6.success, false, 'fails with width > max for pixel');

  // Height out of range
  var r7 = VG.createArtwork(s, artist, { title: 'Big', medium: 'pixel', width: 8, height: 999 });
  assertEqual(r7.success, false, 'fails with height > max for pixel');

  // Width 0
  var r8 = VG.createArtwork(s, artist, { title: 'Zero', medium: 'pixel', width: 0, height: 8 });
  assertEqual(r8.success, false, 'fails with width 0');

  // Each artwork gets a unique ID
  var s2 = stateWithGallery();
  var ids = {};
  for (var i = 0; i < 10; i++) {
    var res = VG.createArtwork(s2, uid(), { title: 'Art' + i, medium: 'pixel' });
    assert(!ids[res.artworkId], 'artwork ID is unique');
    ids[res.artworkId] = true;
  }
})();

// ============================================================================
// SUITE 4: getArtwork & getArtistArtworks
// ============================================================================
suite('getArtwork & getArtistArtworks');

(function() {
  var s = stateWithGallery();
  var artist = uid();

  // Before any artwork
  assertEqual(VG.getArtwork(s, 'nonexistent'), null, 'getArtwork returns null for missing');
  assertArray(VG.getArtistArtworks(s, artist), 'getArtistArtworks returns array for unknown artist');
  assertEqual(VG.getArtistArtworks(s, artist).length, 0, 'empty array for artist with no works');

  var res1 = VG.createArtwork(s, artist, { title: 'Work1', medium: 'pixel' });
  var res2 = VG.createArtwork(s, artist, { title: 'Work2', medium: 'text' });

  var fetched = VG.getArtwork(s, res1.artworkId);
  assertDefined(fetched, 'getArtwork retrieves artwork');
  assertEqual(fetched.title, 'Work1', 'correct artwork fetched');

  var artistWorks = VG.getArtistArtworks(s, artist);
  assertEqual(artistWorks.length, 2, 'getArtistArtworks returns 2 works');
  assert(artistWorks.some(function(a) { return a.title === 'Work1'; }), 'Work1 in list');
  assert(artistWorks.some(function(a) { return a.title === 'Work2'; }), 'Work2 in list');

  // Uninitialized state
  assertEqual(VG.getArtwork({}, 'x'), null, 'getArtwork on uninit state returns null');
  assertArray(VG.getArtistArtworks({}, 'p'), 'getArtistArtworks on uninit state returns array');
})();

// ============================================================================
// SUITE 5: Gallery Wall Display
// ============================================================================
suite('Gallery Wall — happy path');

(function() {
  var s = stateWithGallery();
  var artist = uid();
  var res = VG.createArtwork(s, artist, { title: 'Mural', medium: 'pixel', width: 32, height: 32 });
  var artworkId = res.artworkId;

  var d = VG.displayArtwork(s, artist, artworkId, 'main_hall', 'north_1');
  assertEqual(d.success, true, 'display artwork success');
  assertEqual(d.roomId, 'main_hall', 'roomId returned');
  assertEqual(d.slotName, 'north_1', 'slotName returned');

  // Verify slot is occupied
  var display = VG.getRoomDisplay(s, 'main_hall');
  assertDefined(display['north_1'], 'north_1 slot occupied');
  assertEqual(display['north_1'].id, artworkId, 'correct artwork in slot');

  // artwork records its display location
  var art = VG.getArtwork(s, artworkId);
  assertEqual(art.displayedIn, 'main_hall', 'displayedIn set');
  assertEqual(art.displayedSlot, 'north_1', 'displayedSlot set');
})();

suite('Gallery Wall — remove artwork from wall');

(function() {
  var s = stateWithGallery();
  var artist = uid();
  var res = VG.createArtwork(s, artist, { title: 'Temp', medium: 'pixel' });
  VG.displayArtwork(s, artist, res.artworkId, 'east_wing', 'pixel_row_1');

  var remove = VG.removeArtworkFromWall(s, artist, res.artworkId);
  assertEqual(remove.success, true, 'remove from wall success');

  var display = VG.getRoomDisplay(s, 'east_wing');
  assertEqual(display['pixel_row_1'], null, 'slot cleared after removal');

  var art = VG.getArtwork(s, res.artworkId);
  assertEqual(art.displayedIn, null, 'displayedIn cleared');
  assertEqual(art.displayedSlot, null, 'displayedSlot cleared');

  // Cannot remove if not on wall
  var r2 = VG.removeArtworkFromWall(s, artist, res.artworkId);
  assertEqual(r2.success, false, 'cannot remove artwork not on wall');
})();

suite('Gallery Wall — validation');

(function() {
  var s = stateWithGallery();
  var artist = uid();
  var other  = uid();
  var res = VG.createArtwork(s, artist, { title: 'Mine', medium: 'pixel' });

  // Non-owner cannot display
  var r1 = VG.displayArtwork(s, other, res.artworkId, 'main_hall', 'north_1');
  assertEqual(r1.success, false, 'non-owner cannot display artwork');

  // Invalid room
  var r2 = VG.displayArtwork(s, artist, res.artworkId, 'bad_room', 'north_1');
  assertEqual(r2.success, false, 'invalid room rejected');

  // Invalid slot
  var r3 = VG.displayArtwork(s, artist, res.artworkId, 'main_hall', 'bad_slot');
  assertEqual(r3.success, false, 'invalid slot rejected');

  // Non-existent artwork
  var r4 = VG.displayArtwork(s, artist, 'fake_art', 'main_hall', 'north_1');
  assertEqual(r4.success, false, 'non-existent artwork rejected');

  // Slot already occupied by another artwork
  var res2 = VG.createArtwork(s, artist, { title: 'Mine2', medium: 'pixel' });
  VG.displayArtwork(s, artist, res.artworkId, 'main_hall', 'north_1');
  var r5 = VG.displayArtwork(s, artist, res2.artworkId, 'main_hall', 'north_1');
  assertEqual(r5.success, false, 'occupied slot rejected');

  // Non-owner cannot remove from wall
  var artist2 = uid();
  var res3 = VG.createArtwork(s, artist2, { title: 'Theirs', medium: 'pixel' });
  VG.displayArtwork(s, artist2, res3.artworkId, 'east_wing', 'pixel_row_2');
  var r6 = VG.removeArtworkFromWall(s, artist, res3.artworkId);
  assertEqual(r6.success, false, 'non-owner cannot remove from wall');
})();

suite('Gallery Wall — vault rarity restriction');

(function() {
  var s = stateWithGallery();
  var artist = uid();
  var rater1 = uid();
  var rater2 = uid();

  // Common artwork cannot go in vault
  var res = VG.createArtwork(s, artist, { title: 'Common Work', medium: 'pixel' });
  var r1 = VG.displayArtwork(s, artist, res.artworkId, 'vault', 'vault_main');
  assertEqual(r1.success, false, 'common artwork rejected from vault');

  // Rate up to rare
  VG.rateArtwork(s, rater1, res.artworkId, 4);
  VG.rateArtwork(s, rater2, res.artworkId, 4);

  // Now it should have rare rarity (avg=4.0 >= 3.5)
  var art = VG.getArtwork(s, res.artworkId);
  assertEqual(art.rarity, 'rare', 'artwork is rare after good ratings');

  var r2 = VG.displayArtwork(s, artist, res.artworkId, 'vault', 'vault_main');
  assertEqual(r2.success, true, 'rare artwork allowed in vault');
})();

suite('Gallery Wall — artist slot limit');

(function() {
  var s = stateWithGallery();
  var artist = uid();
  var rooms = ['main_hall', 'east_wing', 'west_wing', 'atrium'];
  var allSlots = {
    main_hall: ['north_1','north_2','north_3'],
    east_wing: ['pixel_row_1','pixel_row_2','pixel_row_3'],
    west_wing: ['text_wall_1','text_wall_2','text_wall_3'],
    atrium:    ['center_a','center_b','left_curve','alcove_1']
  };

  // Fill up to 10 slots
  var count = 0;
  for (var ri = 0; ri < rooms.length && count < 10; ri++) {
    var roomSlots = allSlots[rooms[ri]];
    for (var si = 0; si < roomSlots.length && count < 10; si++) {
      var artRes = VG.createArtwork(s, artist, { title: 'Art' + count, medium: 'pixel' });
      var dispRes = VG.displayArtwork(s, artist, artRes.artworkId, rooms[ri], roomSlots[si]);
      assertEqual(dispRes.success, true, 'slot ' + count + ' display succeeds');
      count++;
    }
  }
  assertEqual(count, 10, 'filled 10 slots');

  // Next display should fail
  var extra = VG.createArtwork(s, artist, { title: 'Extra', medium: 'pixel' });
  var extraDisp = VG.displayArtwork(s, artist, extra.artworkId, 'main_hall', 'south_1');
  assertEqual(extraDisp.success, false, 'artist slot limit enforced');
})();

// ============================================================================
// SUITE 6: getRoomDisplay & getRoomInfo
// ============================================================================
suite('getRoomDisplay & getRoomInfo');

(function() {
  var s = stateWithGallery();

  // Empty room
  var display = VG.getRoomDisplay(s, 'main_hall');
  assertType(display, 'object', 'getRoomDisplay returns object');
  assert(Object.keys(display).length > 0, 'main_hall has slots');
  for (var slotName in display) {
    assertEqual(display[slotName], null, 'empty slot is null');
  }

  // Invalid room
  var bad = VG.getRoomDisplay(s, 'nonexistent');
  assertType(bad, 'object', 'invalid room returns object');
  assertEqual(Object.keys(bad).length, 0, 'no slots for invalid room');

  // getRoomInfo
  var info = VG.getRoomInfo(s, 'main_hall');
  assertDefined(info, 'getRoomInfo returns info');
  assertEqual(info.id, 'main_hall', 'room id');
  assertEqual(info.name, 'Main Hall', 'room name');
  assertType(info.capacity, 'number', 'capacity is number');
  assertGT(info.capacity, 0, 'positive capacity');
  assertEqual(info.featured, true, 'main_hall is featured');
  assertEqual(info.occupiedSlots, 0, 'no occupied slots initially');
  assertEqual(info.availableSlots, info.capacity, 'all slots available initially');

  // After displaying
  var artist = uid();
  var res = VG.createArtwork(s, artist, { title: 'A', medium: 'pixel' });
  VG.displayArtwork(s, artist, res.artworkId, 'main_hall', 'north_1');
  var info2 = VG.getRoomInfo(s, 'main_hall');
  assertEqual(info2.occupiedSlots, 1, 'one slot occupied');
  assertEqual(info2.availableSlots, info2.capacity - 1, 'available decremented');

  // Invalid room returns null
  assertEqual(VG.getRoomInfo(s, 'fake_room'), null, 'invalid room returns null');

  // getAllRooms
  var allRooms = VG.getAllRooms(s);
  assertArray(allRooms, 'getAllRooms returns array');
  assertEqual(allRooms.length, 5, 'five gallery rooms');
  assert(allRooms.some(function(r) { return r.id === 'vault'; }), 'vault in rooms list');
})();

// ============================================================================
// SUITE 7: Record View & Viewer Spark
// ============================================================================
suite('Record View — happy path');

(function() {
  var s = stateWithGallery();
  var artist = uid();
  var viewer = uid();

  var res = VG.createArtwork(s, artist, { title: 'View Me', medium: 'pixel' });
  var artworkId = res.artworkId;

  var now = 1000000;
  var view = VG.recordView(s, viewer, artworkId, now);
  assertEqual(view.success, true, 'recordView success');
  assertGTE(view.sparkAwarded, 1, 'spark awarded >= 1');
  assertLTE(view.sparkAwarded, 5, 'spark awarded <= 5');
  assertEqual(view.totalViews, 1, 'totalViews is 1');
  assertEqual(view.selfView, false, 'not a self view');

  // Artwork view count updated
  var art = VG.getArtwork(s, artworkId);
  assertEqual(art.views, 1, 'artwork views incremented');

  // Artist profile updated
  var profile = VG.getArtistProfile(s, artist);
  assertEqual(profile.totalViews, 1, 'artist totalViews incremented');
  assertGT(profile.totalEarnings, 0, 'artist totalEarnings incremented');

  // Second view from different viewer (different ts)
  var viewer2 = uid();
  var view2 = VG.recordView(s, viewer2, artworkId, now + 1000);
  assertEqual(view2.success, true, 'second viewer succeeds');
  assertEqual(VG.getArtwork(s, artworkId).views, 2, 'views incremented to 2');
})();

suite('Record View — self-view');

(function() {
  var s = stateWithGallery();
  var artist = uid();
  var res = VG.createArtwork(s, artist, { title: 'Own', medium: 'pixel' });

  var view = VG.recordView(s, artist, res.artworkId, 1000);
  assertEqual(view.success, true, 'self-view succeeds');
  assertEqual(view.sparkAwarded, 0, 'no Spark for self-view');
  assertEqual(view.selfView, true, 'selfView flag set');
  assertEqual(view.totalViews, 1, 'view count still incremented');

  // Artist totalEarnings unchanged
  var profile = VG.getArtistProfile(s, artist);
  assertEqual(profile.totalEarnings, 0, 'no earnings on self-view');
})();

suite('Record View — cooldown');

(function() {
  var s = stateWithGallery();
  var artist = uid();
  var viewer = uid();
  var res = VG.createArtwork(s, artist, { title: 'Cooldown Test', medium: 'pixel' });
  var artworkId = res.artworkId;

  var now = 5000000;
  var v1 = VG.recordView(s, viewer, artworkId, now);
  assertEqual(v1.success, true, 'first view succeeds');

  // Second view within cooldown (1 ms later)
  var v2 = VG.recordView(s, viewer, artworkId, now + 1);
  assertEqual(v2.success, false, 'second view in cooldown fails');
  assertDefined(v2.error, 'cooldown error message');

  // After cooldown (5 minutes + 1 ms)
  var v3 = VG.recordView(s, viewer, artworkId, now + 300001);
  assertEqual(v3.success, true, 'view after cooldown succeeds');
})();

suite('Record View — non-existent artwork');

(function() {
  var s = stateWithGallery();
  var res = VG.recordView(s, uid(), 'fake_art', 1000);
  assertEqual(res.success, false, 'fails for non-existent artwork');
  assertDefined(res.error, 'error message provided');
})();

// ============================================================================
// SUITE 8: Artist Rank Progression
// ============================================================================
suite('Artist Rank Progression');

(function() {
  var s = stateWithGallery();
  var artist = uid();
  var res = VG.createArtwork(s, artist, { title: 'Rank Test', medium: 'pixel' });
  var artworkId = res.artworkId;

  var profile = VG.getArtistProfile(s, artist);
  assertEqual(profile.rank, 'apprentice', 'starts as apprentice');

  // Simulate 50 views from unique viewers
  var now = 0;
  for (var i = 0; i < 50; i++) {
    VG.recordView(s, uid(), artworkId, now);
    now += 400000; // > 5 min cooldown
  }
  assertEqual(profile.totalViews, 50, '50 total views');
  assertEqual(profile.rank, 'journeyman', 'promoted to journeyman');

  // Simulate to 200 views
  for (var j = 0; j < 150; j++) {
    VG.recordView(s, uid(), artworkId, now);
    now += 400000;
  }
  assertEqual(profile.rank, 'craftsman', 'promoted to craftsman at 200 views');
})();

// ============================================================================
// SUITE 9: Art Rating
// ============================================================================
suite('Art Rating — happy path');

(function() {
  var s = stateWithGallery();
  var artist = uid();
  var rater1 = uid();
  var rater2 = uid();
  var rater3 = uid();

  var res = VG.createArtwork(s, artist, { title: 'Rate Me', medium: 'pixel' });
  var artworkId = res.artworkId;

  // Initial rating state
  var initial = VG.getRating(s, artworkId);
  assertDefined(initial, 'rating record exists');
  assertEqual(initial.avgRating, 0, 'initial avgRating is 0');
  assertEqual(initial.ratingCount, 0, 'initial ratingCount is 0');

  // First rating
  var r1 = VG.rateArtwork(s, rater1, artworkId, 4);
  assertEqual(r1.success, true, 'first rating success');
  assertApprox(r1.newAvg, 4, 0.001, 'avg after one 4-star rating');
  assertEqual(r1.ratingCount, 1, 'rating count is 1');

  // Second rating
  var r2 = VG.rateArtwork(s, rater2, artworkId, 2);
  assertEqual(r2.success, true, 'second rating success');
  assertApprox(r2.newAvg, 3, 0.001, 'avg after (4+2)/2=3');
  assertEqual(r2.ratingCount, 2, 'rating count is 2');

  // Third rating
  var r3 = VG.rateArtwork(s, rater3, artworkId, 5);
  assertEqual(r3.success, true, 'third rating success');
  assertApprox(r3.newAvg, 11/3, 0.01, 'avg after (4+2+5)/3');
  assertEqual(r3.ratingCount, 3, 'rating count is 3');

  // getRating
  var rating = VG.getRating(s, artworkId);
  assertApprox(rating.avgRating, 11/3, 0.01, 'getRating returns correct avg');
  assertEqual(rating.ratingCount, 3, 'getRating returns correct count');
})();

suite('Art Rating — update existing rating');

(function() {
  var s = stateWithGallery();
  var artist = uid();
  var rater = uid();
  var res = VG.createArtwork(s, artist, { title: 'Rerate', medium: 'pixel' });

  VG.rateArtwork(s, rater, res.artworkId, 2);
  var r2 = VG.rateArtwork(s, rater, res.artworkId, 5);
  assertEqual(r2.success, true, 'update rating success');
  assertEqual(r2.ratingCount, 1, 'rating count stays 1 on update');
  assertApprox(r2.newAvg, 5, 0.001, 'updated avg reflects new rating');
})();

suite('Art Rating — validation');

(function() {
  var s = stateWithGallery();
  var artist = uid();
  var rater = uid();
  var res = VG.createArtwork(s, artist, { title: 'Invalid Rates', medium: 'pixel' });

  // Artist cannot rate own work
  var r1 = VG.rateArtwork(s, artist, res.artworkId, 5);
  assertEqual(r1.success, false, 'artist cannot rate own work');

  // Invalid star values
  var r2 = VG.rateArtwork(s, rater, res.artworkId, 0);
  assertEqual(r2.success, false, 'rating 0 rejected');

  var r3 = VG.rateArtwork(s, rater, res.artworkId, 6);
  assertEqual(r3.success, false, 'rating 6 rejected');

  var r4 = VG.rateArtwork(s, rater, res.artworkId, 3.5);
  assertEqual(r4.success, false, 'fractional rating rejected');

  var r5 = VG.rateArtwork(s, rater, res.artworkId, -1);
  assertEqual(r5.success, false, 'negative rating rejected');

  // Non-existent artwork
  var r6 = VG.rateArtwork(s, rater, 'fake_art', 3);
  assertEqual(r6.success, false, 'non-existent artwork rejected');

  // Rating 1 and 5 are valid edge cases
  var r7 = VG.rateArtwork(s, rater, res.artworkId, 1);
  assertEqual(r7.success, true, 'rating 1 valid');

  var rater2 = uid();
  var r8 = VG.rateArtwork(s, rater2, res.artworkId, 5);
  assertEqual(r8.success, true, 'rating 5 valid');
})();

suite('Art Rating — rarity update');

(function() {
  var s = stateWithGallery();
  var artist = uid();
  var res = VG.createArtwork(s, artist, { title: 'Rarity Test', medium: 'pixel' });
  var artworkId = res.artworkId;

  // Common (no ratings)
  assertEqual(VG.getArtwork(s, artworkId).rarity, 'common', 'starts common');

  // Uncommon (avg >= 2.5)
  VG.rateArtwork(s, uid(), artworkId, 3);
  assertEqual(VG.getArtwork(s, artworkId).rarity, 'uncommon', 'uncommon at 3.0 avg');

  // Rare (avg >= 3.5)
  VG.rateArtwork(s, uid(), artworkId, 4);
  // avg = (3+4)/2 = 3.5
  assertEqual(VG.getArtwork(s, artworkId).rarity, 'rare', 'rare at 3.5 avg');

  // Epic (avg >= 4.2)
  var s2 = stateWithGallery();
  var a2 = uid();
  var res2 = VG.createArtwork(s2, a2, { title: 'Epic', medium: 'pixel' });
  VG.rateArtwork(s2, uid(), res2.artworkId, 5);
  VG.rateArtwork(s2, uid(), res2.artworkId, 4);
  VG.rateArtwork(s2, uid(), res2.artworkId, 4);
  // avg = (5+4+4)/3 = 4.33
  assertEqual(VG.getArtwork(s2, res2.artworkId).rarity, 'epic', 'epic at 4.33 avg');

  // Legendary (avg >= 4.8)
  var s3 = stateWithGallery();
  var a3 = uid();
  var res3 = VG.createArtwork(s3, a3, { title: 'Legend', medium: 'pixel' });
  VG.rateArtwork(s3, uid(), res3.artworkId, 5);
  VG.rateArtwork(s3, uid(), res3.artworkId, 5);
  VG.rateArtwork(s3, uid(), res3.artworkId, 5);
  VG.rateArtwork(s3, uid(), res3.artworkId, 5);
  VG.rateArtwork(s3, uid(), res3.artworkId, 4);
  // avg = (5*4+4)/5 = 4.8
  assertEqual(VG.getArtwork(s3, res3.artworkId).rarity, 'legendary', 'legendary at 4.8 avg');
})();

// ============================================================================
// SUITE 10: Exhibitions
// ============================================================================
suite('Exhibitions — creation');

(function() {
  var s = stateWithGallery();
  var curator = uid();
  var artist  = uid();

  var r1 = VG.createArtwork(s, artist, { title: 'Art1', medium: 'pixel' });
  var r2 = VG.createArtwork(s, artist, { title: 'Art2', medium: 'text' });

  var exh = VG.createExhibition(s, curator, {
    title:       'Spring Show',
    theme:       'nature',
    description: 'A celebration of spring',
    artworkIds:  [r1.artworkId, r2.artworkId]
  });
  assertEqual(exh.success, true, 'exhibition created');
  assertDefined(exh.exhibitionId, 'exhibitionId returned');
  assertDefined(exh.exhibition, 'exhibition object returned');
  assertEqual(exh.exhibition.title, 'Spring Show', 'title set');
  assertEqual(exh.exhibition.theme, 'nature', 'theme set');
  assertEqual(exh.exhibition.curatorId, curator, 'curatorId set');
  assertEqual(exh.exhibition.artworkIds.length, 2, 'artworkIds included');
  assertEqual(exh.exhibition.active, true, 'active by default');
  assertEqual(exh.exhibition.views, 0, 'views start at 0');

  // Curator profile updated
  var profile = VG.getArtistProfile(s, curator);
  assertIncludes(profile.exhibitions, exh.exhibitionId, 'exhibitionId in curator profile');
})();

suite('Exhibitions — validation');

(function() {
  var s = stateWithGallery();
  var curator = uid();

  // Missing title
  var r1 = VG.createExhibition(s, curator, { theme: 'art' });
  assertEqual(r1.success, false, 'fails without title');

  // Missing theme
  var r2 = VG.createExhibition(s, curator, { title: 'Show' });
  assertEqual(r2.success, false, 'fails without theme');

  // Missing curator
  var r3 = VG.createExhibition(s, null, { title: 'Show', theme: 'art' });
  assertEqual(r3.success, false, 'fails without curator');

  // Title too long
  var r4 = VG.createExhibition(s, curator, { title: new Array(102).join('X'), theme: 'art' });
  assertEqual(r4.success, false, 'fails with title > 100 chars');

  // Non-existent artworkId
  var r5 = VG.createExhibition(s, curator, { title: 'Show', theme: 'art', artworkIds: ['fake_art'] });
  assertEqual(r5.success, false, 'fails with non-existent artworkId');

  // artworkIds not array
  var r6 = VG.createExhibition(s, curator, { title: 'Show', theme: 'art', artworkIds: 'not_array' });
  assertEqual(r6.success, false, 'fails with artworkIds not array');

  // Too many artworks (> 12)
  var artist = uid();
  var ids = [];
  for (var i = 0; i < 13; i++) {
    var res = VG.createArtwork(s, artist, { title: 'Art' + i, medium: 'pixel' });
    ids.push(res.artworkId);
  }
  var r7 = VG.createExhibition(s, curator, { title: 'Big Show', theme: 'art', artworkIds: ids });
  assertEqual(r7.success, false, 'fails with > 12 artworks');
})();

suite('Exhibitions — add/remove artworks');

(function() {
  var s = stateWithGallery();
  var curator = uid();
  var artist  = uid();

  var a1 = VG.createArtwork(s, artist, { title: 'A1', medium: 'pixel' });
  var a2 = VG.createArtwork(s, artist, { title: 'A2', medium: 'pixel' });
  var a3 = VG.createArtwork(s, artist, { title: 'A3', medium: 'pixel' });

  var exh = VG.createExhibition(s, curator, { title: 'Show', theme: 'test', artworkIds: [a1.artworkId] });

  // Add artwork
  var add = VG.addArtworkToExhibition(s, curator, exh.exhibitionId, a2.artworkId);
  assertEqual(add.success, true, 'add artwork success');
  assertEqual(add.artworkCount, 2, 'artworkCount 2');

  // Cannot add duplicate
  var dup = VG.addArtworkToExhibition(s, curator, exh.exhibitionId, a2.artworkId);
  assertEqual(dup.success, false, 'duplicate artwork rejected');

  // Non-curator cannot add
  var other = uid();
  var r2 = VG.addArtworkToExhibition(s, other, exh.exhibitionId, a3.artworkId);
  assertEqual(r2.success, false, 'non-curator cannot add artwork');

  // Remove artwork
  var remove = VG.removeArtworkFromExhibition(s, curator, exh.exhibitionId, a2.artworkId);
  assertEqual(remove.success, true, 'remove artwork success');
  assertEqual(remove.artworkCount, 1, 'artworkCount back to 1');

  // Cannot remove artwork not in exhibition
  var r3 = VG.removeArtworkFromExhibition(s, curator, exh.exhibitionId, a3.artworkId);
  assertEqual(r3.success, false, 'cannot remove artwork not in exhibition');

  // Non-curator cannot remove
  var r4 = VG.removeArtworkFromExhibition(s, other, exh.exhibitionId, a1.artworkId);
  assertEqual(r4.success, false, 'non-curator cannot remove artwork');

  // Non-existent exhibition
  var r5 = VG.addArtworkToExhibition(s, curator, 'fake_exh', a1.artworkId);
  assertEqual(r5.success, false, 'non-existent exhibition rejected');
})();

suite('Exhibitions — close & view');

(function() {
  var s = stateWithGallery();
  var curator = uid();
  var artist  = uid();
  var viewer  = uid();

  var a1 = VG.createArtwork(s, artist, { title: 'V1', medium: 'pixel' });
  var a2 = VG.createArtwork(s, artist, { title: 'V2', medium: 'pixel' });

  var exh = VG.createExhibition(s, curator, {
    title: 'View Show', theme: 'test', artworkIds: [a1.artworkId, a2.artworkId]
  });

  // viewExhibition
  var viewRes = VG.viewExhibition(s, viewer, exh.exhibitionId, 1000000);
  assertEqual(viewRes.success, true, 'viewExhibition success');
  assertGT(viewRes.exhibitionViews, 0, 'exhibitionViews incremented');
  assertGTE(viewRes.sparkAwarded, 2, 'spark awarded >= 2 (one per artwork)');
  assertArray(viewRes.artworkResults, 'artworkResults is array');
  assertEqual(viewRes.artworkResults.length, 2, 'results for each artwork');

  // Close exhibition
  var close = VG.closeExhibition(s, curator, exh.exhibitionId);
  assertEqual(close.success, true, 'closeExhibition success');
  assertEqual(VG.getExhibition(s, exh.exhibitionId).active, false, 'exhibition inactive');

  // Cannot view closed exhibition
  var viewClosed = VG.viewExhibition(s, viewer, exh.exhibitionId, 2000000);
  assertEqual(viewClosed.success, false, 'cannot view closed exhibition');

  // Non-curator cannot close
  var other = uid();
  var exh2 = VG.createExhibition(s, curator, { title: 'Show2', theme: 'test' });
  var r2 = VG.closeExhibition(s, other, exh2.exhibitionId);
  assertEqual(r2.success, false, 'non-curator cannot close exhibition');

  // Non-existent exhibition
  assertEqual(VG.getExhibition(s, 'fake'), null, 'non-existent exhibition returns null');
})();

// ============================================================================
// SUITE 11: Art Trading
// ============================================================================
suite('Art Trading — list and cancel');

(function() {
  var s = stateWithGallery();
  var artist = uid();
  var other  = uid();

  var res = VG.createArtwork(s, artist, { title: 'For Sale', medium: 'pixel' });

  // List for trade
  var list = VG.listArtForTrade(s, artist, res.artworkId, 50);
  assertEqual(list.success, true, 'listArtForTrade success');
  assertEqual(list.price, 50, 'price set');
  assertEqual(VG.getArtwork(s, res.artworkId).listedForTrade, true, 'listedForTrade flag set');

  // Get listings
  var listings = VG.getTradeListings(s);
  assertArray(listings, 'getTradeListings returns array');
  assertEqual(listings.length, 1, 'one listing');
  assertEqual(listings[0].artworkId, res.artworkId, 'correct artwork listed');
  assertEqual(listings[0].price, 50, 'correct price');
  assertEqual(listings[0].sellerId, artist, 'correct seller');

  // Non-owner cannot list
  var r2 = VG.listArtForTrade(s, other, res.artworkId, 30);
  assertEqual(r2.success, false, 'non-owner cannot list');

  // Invalid price
  var res2 = VG.createArtwork(s, artist, { title: 'Free?', medium: 'pixel' });
  var r3 = VG.listArtForTrade(s, artist, res2.artworkId, 0);
  assertEqual(r3.success, false, 'price 0 rejected');

  var r4 = VG.listArtForTrade(s, artist, res2.artworkId, -10);
  assertEqual(r4.success, false, 'negative price rejected');

  var r5 = VG.listArtForTrade(s, artist, res2.artworkId, 9.5);
  assertEqual(r5.success, false, 'fractional price rejected');

  // Cancel listing
  var cancel = VG.cancelTradeListing(s, artist, res.artworkId);
  assertEqual(cancel.success, true, 'cancelTradeListing success');
  assertEqual(VG.getArtwork(s, res.artworkId).listedForTrade, false, 'listedForTrade cleared');
  assertEqual(VG.getTradeListings(s).length, 0, 'no listings after cancel');

  // Cannot cancel non-existent listing
  var r6 = VG.cancelTradeListing(s, artist, res.artworkId);
  assertEqual(r6.success, false, 'cannot cancel non-existent listing');

  // Non-seller cannot cancel
  VG.listArtForTrade(s, artist, res.artworkId, 50);
  var r7 = VG.cancelTradeListing(s, other, res.artworkId);
  assertEqual(r7.success, false, 'non-seller cannot cancel listing');
})();

suite('Art Trading — purchase');

(function() {
  var s = stateWithGallery();
  var artist = uid();
  var buyer  = uid();

  var res = VG.createArtwork(s, artist, { title: 'Masterpiece', medium: 'pixel' });
  VG.listArtForTrade(s, artist, res.artworkId, 100);

  // Cannot buy own artwork
  var r1 = VG.purchaseArtwork(s, artist, res.artworkId);
  assertEqual(r1.success, false, 'cannot purchase own artwork');

  // Purchase
  var purchase = VG.purchaseArtwork(s, buyer, res.artworkId);
  assertEqual(purchase.success, true, 'purchaseArtwork success');
  assertEqual(purchase.newOwner, buyer, 'new owner set');
  assertEqual(purchase.price, 100, 'price in result');

  // Ownership transferred
  var art = VG.getArtwork(s, res.artworkId);
  assertEqual(art.artistId, buyer, 'artwork artistId updated to buyer');
  assertEqual(art.listedForTrade, false, 'listing cleared after purchase');

  // No more listing
  var listings = VG.getTradeListings(s);
  assertEqual(listings.length, 0, 'no active listings after purchase');

  // Buyer profile updated
  var buyerProfile = VG.getArtistProfile(s, buyer);
  assertIncludes(buyerProfile.artworks, res.artworkId, 'artwork in buyer profile');

  // Seller profile updated
  var sellerProfile = VG.getArtistProfile(s, artist);
  assert(sellerProfile.artworks.indexOf(res.artworkId) === -1, 'artwork removed from seller profile');
  assertGT(sellerProfile.totalEarnings, 0, 'seller earnings credited');

  // Cannot purchase unlisted artwork
  var r2 = VG.purchaseArtwork(s, uid(), res.artworkId);
  assertEqual(r2.success, false, 'cannot purchase unlisted artwork');

  // Cannot purchase non-existent artwork
  var r3 = VG.purchaseArtwork(s, uid(), 'fake_art');
  assertEqual(r3.success, false, 'cannot purchase non-existent artwork');
})();

suite('Art Trading — lock artwork');

(function() {
  var s = stateWithGallery();
  var artist = uid();
  var other  = uid();

  var res = VG.createArtwork(s, artist, { title: 'Locked', medium: 'pixel' });
  VG.listArtForTrade(s, artist, res.artworkId, 50);

  // Non-owner cannot lock
  var r1 = VG.lockArtwork(s, other, res.artworkId);
  assertEqual(r1.success, false, 'non-owner cannot lock artwork');

  // Lock artwork
  var lock = VG.lockArtwork(s, artist, res.artworkId);
  assertEqual(lock.success, true, 'lockArtwork success');

  var art = VG.getArtwork(s, res.artworkId);
  assertEqual(art.tradeable, false, 'tradeable set to false');
  assertEqual(art.listedForTrade, false, 'listing removed on lock');

  // Cannot list locked artwork
  var r2 = VG.listArtForTrade(s, artist, res.artworkId, 50);
  assertEqual(r2.success, false, 'cannot list locked artwork');

  // Lock non-existent artwork
  var r3 = VG.lockArtwork(s, artist, 'fake_art');
  assertEqual(r3.success, false, 'non-existent artwork lock fails');
})();

// ============================================================================
// SUITE 12: Featured Artworks
// ============================================================================
suite('Featured Artworks');

(function() {
  var s = stateWithGallery();
  var artist = uid();

  // Empty state
  var featured = VG.getFeaturedArtworks(s);
  assertArray(featured, 'getFeaturedArtworks returns array on empty');

  // Create artworks and rate them
  var arts = [];
  for (var i = 0; i < 7; i++) {
    var res = VG.createArtwork(s, artist, { title: 'Art' + i, medium: 'pixel' });
    arts.push(res.artworkId);
  }

  // Rate different amounts
  var raters = [uid(), uid(), uid(), uid(), uid()];
  VG.rateArtwork(s, raters[0], arts[0], 5);
  VG.rateArtwork(s, raters[1], arts[0], 5);
  VG.rateArtwork(s, raters[2], arts[1], 3);
  VG.rateArtwork(s, raters[3], arts[2], 1);

  var featured2 = VG.getFeaturedArtworks(s);
  assertArray(featured2, 'getFeaturedArtworks returns array');
  assertLTE(featured2.length, 5, 'at most 5 featured artworks');
  assertGT(featured2.length, 0, 'at least 1 featured artwork');
  // Highest rated should be first
  assertEqual(featured2[0].id, arts[0], 'highest rated is first featured');
})();

// ============================================================================
// SUITE 13: Search Artworks
// ============================================================================
suite('searchArtworks');

(function() {
  var s = stateWithGallery();
  var artist1 = uid();
  var artist2 = uid();

  VG.createArtwork(s, artist1, { title: 'Pixel1', medium: 'pixel' });
  VG.createArtwork(s, artist1, { title: 'Text1',  medium: 'text'  });
  VG.createArtwork(s, artist2, { title: 'Pixel2', medium: 'pixel' });
  VG.createArtwork(s, artist2, { title: 'Pat1',   medium: 'pattern' });

  // No filters
  var all = VG.searchArtworks(s, {});
  assertEqual(all.length, 4, 'no filters returns all artworks');

  // Filter by medium
  var pixels = VG.searchArtworks(s, { medium: 'pixel' });
  assertEqual(pixels.length, 2, 'filter by pixel medium');
  assert(pixels.every(function(a) { return a.medium === 'pixel'; }), 'all results are pixel');

  var texts = VG.searchArtworks(s, { medium: 'text' });
  assertEqual(texts.length, 1, 'filter by text medium');

  // Filter by artist
  var a1Works = VG.searchArtworks(s, { artistId: artist1 });
  assertEqual(a1Works.length, 2, 'filter by artist1');
  assert(a1Works.every(function(a) { return a.artistId === artist1; }), 'all results from artist1');

  // Filter by rarity (all common initially)
  var commons = VG.searchArtworks(s, { rarity: 'common' });
  assertEqual(commons.length, 4, 'all artworks start common');

  // Filter by rating
  var artRes = VG.createArtwork(s, artist1, { title: 'Rated', medium: 'pixel' });
  VG.rateArtwork(s, uid(), artRes.artworkId, 5);
  VG.rateArtwork(s, uid(), artRes.artworkId, 5);
  // avg = 5.0, rarity = legendary

  var highRated = VG.searchArtworks(s, { minRating: 4.5 });
  assert(highRated.length >= 1, 'minRating filter works');

  // Combined filters
  var combined = VG.searchArtworks(s, { medium: 'pixel', artistId: artist1 });
  assertEqual(combined.length, 2, 'combined filter pixel + artist1 (including new rated one)');

  // Empty state
  var emptyResult = VG.searchArtworks({}, {});
  assertArray(emptyResult, 'empty state returns array');
  assertEqual(emptyResult.length, 0, 'empty state returns empty');
})();

// ============================================================================
// SUITE 14: Top by Views & Top by Rating
// ============================================================================
suite('getTopByViews & getTopByRating');

(function() {
  var s = stateWithGallery();
  var artist = uid();

  for (var i = 0; i < 8; i++) {
    VG.createArtwork(s, artist, { title: 'A' + i, medium: 'pixel' });
  }

  // View different artworks different numbers of times
  var artworkIds = Object.keys(s.gallery.artworks);
  var now = 0;
  for (var j = 0; j < artworkIds.length; j++) {
    for (var v = 0; v < (j + 1); v++) {
      VG.recordView(s, uid(), artworkIds[j], now);
      now += 400000;
    }
  }

  var topViews = VG.getTopByViews(s, 3);
  assertArray(topViews, 'getTopByViews returns array');
  assertEqual(topViews.length, 3, 'limited to 3');
  // Sorted descending by views
  for (var k = 0; k < topViews.length - 1; k++) {
    assertGTE(topViews[k].views, topViews[k+1].views, 'sorted by views descending');
  }

  // Default limit
  var topDefault = VG.getTopByViews(s);
  assertLTE(topDefault.length, 10, 'default limit is 10');

  // getTopByRating
  var artIds = Object.keys(s.gallery.artworks);
  VG.rateArtwork(s, uid(), artIds[0], 5);
  VG.rateArtwork(s, uid(), artIds[1], 2);

  var topRating = VG.getTopByRating(s, 3);
  assertArray(topRating, 'getTopByRating returns array');
  assertGTE(topRating.length, 1, 'at least one result');
  // First should be the 5-star artwork
  assertEqual(topRating[0].id, artIds[0], 'highest rated first');

  // Empty state
  assertArray(VG.getTopByViews({}), 'empty state getTopByViews returns array');
  assertArray(VG.getTopByRating({}), 'empty state getTopByRating returns array');
})();

// ============================================================================
// SUITE 15: Gallery Statistics
// ============================================================================
suite('getGalleryStats');

(function() {
  var s = stateWithGallery();

  // Empty stats
  var empty = VG.getGalleryStats(s);
  assertEqual(empty.totalArtworks, 0, 'empty totalArtworks');
  assertEqual(empty.totalExhibitions, 0, 'empty totalExhibitions');
  assertEqual(empty.totalViews, 0, 'empty totalViews');
  assertEqual(empty.totalArtists, 0, 'empty totalArtists');
  assertEqual(empty.totalListings, 0, 'empty totalListings');

  // Uninit state
  var uninit = VG.getGalleryStats({});
  assertEqual(uninit.totalArtworks, 0, 'uninit totalArtworks');

  // After activity
  var artist = uid();
  var curator = uid();
  var viewer  = uid();

  var r1 = VG.createArtwork(s, artist, { title: 'S1', medium: 'pixel' });
  var r2 = VG.createArtwork(s, artist, { title: 'S2', medium: 'text' });

  VG.createExhibition(s, curator, { title: 'Show', theme: 'test' });
  VG.recordView(s, viewer, r1.artworkId, 1000000);
  VG.recordView(s, viewer, r2.artworkId, 1000000);
  VG.listArtForTrade(s, artist, r1.artworkId, 25);

  var stats = VG.getGalleryStats(s);
  assertEqual(stats.totalArtworks, 2, 'totalArtworks 2');
  assertEqual(stats.totalExhibitions, 1, 'totalExhibitions 1');
  assertGTE(stats.totalViews, 2, 'totalViews >= 2');
  assertEqual(stats.totalArtists, 2, 'totalArtists includes artist and curator (curator has profile from exhibition)');
  assertEqual(stats.totalListings, 1, 'totalListings 1');
})();

// ============================================================================
// SUITE 16: Delete Artwork
// ============================================================================
suite('deleteArtwork');

(function() {
  var s = stateWithGallery();
  var artist = uid();
  var other  = uid();

  var res = VG.createArtwork(s, artist, { title: 'Delete Me', medium: 'pixel' });
  var artworkId = res.artworkId;

  // Non-owner cannot delete
  var r1 = VG.deleteArtwork(s, other, artworkId);
  assertEqual(r1.success, false, 'non-owner cannot delete');

  // Delete artwork
  var del = VG.deleteArtwork(s, artist, artworkId);
  assertEqual(del.success, true, 'deleteArtwork success');

  // Gone
  assertEqual(VG.getArtwork(s, artworkId), null, 'artwork no longer exists');

  // Profile updated
  var profile = VG.getArtistProfile(s, artist);
  assert(profile.artworks.indexOf(artworkId) === -1, 'artwork removed from profile');

  // Cannot delete if in active exhibition
  var res2 = VG.createArtwork(s, artist, { title: 'In Show', medium: 'pixel' });
  var curator = uid();
  VG.createExhibition(s, curator, {
    title: 'Show', theme: 'test', artworkIds: [res2.artworkId]
  });
  var r2 = VG.deleteArtwork(s, artist, res2.artworkId);
  assertEqual(r2.success, false, 'cannot delete artwork in active exhibition');

  // Non-existent artwork
  var r3 = VG.deleteArtwork(s, artist, 'nonexistent');
  assertEqual(r3.success, false, 'non-existent artwork delete fails');

  // Deleting artwork removes it from trade listing
  var res3 = VG.createArtwork(s, artist, { title: 'Listed for Trade', medium: 'pixel' });
  VG.listArtForTrade(s, artist, res3.artworkId, 50);
  VG.deleteArtwork(s, artist, res3.artworkId);
  assertEqual(VG.getTradeListings(s).length, 0, 'trade listing removed when artwork deleted');

  // Deleting artwork removes it from wall slot
  var res4 = VG.createArtwork(s, artist, { title: 'On Wall', medium: 'pixel' });
  VG.displayArtwork(s, artist, res4.artworkId, 'main_hall', 'north_2');
  VG.deleteArtwork(s, artist, res4.artworkId);
  var display = VG.getRoomDisplay(s, 'main_hall');
  assertEqual(display['north_2'], null, 'wall slot cleared after artwork deletion');
})();

// ============================================================================
// SUITE 17: Generate Pixel / Text / Pattern Data
// ============================================================================
suite('generatePixelData');

(function() {
  var data = VG.generatePixelData('test_seed', 8, 8);
  assertArray(data, 'generatePixelData returns array');
  assertEqual(data.length, 64, '8x8 = 64 pixels');
  assert(data.every(function(v) { return v >= 0 && v < 8; }), 'values in range [0, colorCount)');

  // Deterministic
  var data2 = VG.generatePixelData('test_seed', 8, 8);
  assertEqual(JSON.stringify(data), JSON.stringify(data2), 'generatePixelData is deterministic');

  // Different seed → different output
  var data3 = VG.generatePixelData('other_seed', 8, 8);
  assertNotEqual(JSON.stringify(data), JSON.stringify(data3), 'different seed gives different output');

  // Custom color count
  var data4 = VG.generatePixelData('seed', 4, 4, 2);
  assert(data4.every(function(v) { return v === 0 || v === 1; }), 'colorCount 2 gives binary values');

  // Max colorCount clamped
  var data5 = VG.generatePixelData('seed', 4, 4, 100);
  assertArray(data5, 'clamped colorCount still works');

  // Min colorCount clamped
  var data6 = VG.generatePixelData('seed', 4, 4, 0);
  assertArray(data6, 'min colorCount clamped works');
})();

suite('generateTextData');

(function() {
  var lines = VG.generateTextData('text_seed', 20, 5);
  assertArray(lines, 'generateTextData returns array');
  assertEqual(lines.length, 5, '5 lines');
  assert(lines.every(function(l) { return typeof l === 'string'; }), 'all elements are strings');
  assert(lines.every(function(l) { return l.length === 20; }), 'each line is 20 chars');

  // Deterministic
  var lines2 = VG.generateTextData('text_seed', 20, 5);
  assertEqual(JSON.stringify(lines), JSON.stringify(lines2), 'generateTextData is deterministic');

  // Different seed
  var lines3 = VG.generateTextData('other_seed', 20, 5);
  assertNotEqual(JSON.stringify(lines), JSON.stringify(lines3), 'different seed gives different output');
})();

suite('generatePatternData');

(function() {
  var pattern = VG.generatePatternData('pattern_seed', 8, 8);
  assertArray(pattern, 'generatePatternData returns array');
  assertEqual(pattern.length, 8, '8 rows');
  assert(pattern.every(function(row) { return Array.isArray(row) && row.length === 8; }), '8 cols each row');
  assert(pattern.every(function(row) {
    return row.every(function(v) { return v >= 0 && v <= 1; });
  }), 'values in [0, 1]');

  // Deterministic
  var pattern2 = VG.generatePatternData('pattern_seed', 8, 8);
  assertEqual(JSON.stringify(pattern), JSON.stringify(pattern2), 'generatePatternData is deterministic');

  // Different seed
  var pattern3 = VG.generatePatternData('other_seed', 8, 8);
  assertNotEqual(JSON.stringify(pattern), JSON.stringify(pattern3), 'different seed gives different output');
})();

// ============================================================================
// SUITE 18: PRNG & Hash helpers
// ============================================================================
suite('mulberry32 & hashString');

(function() {
  var rng = VG._mulberry32(42);
  assertType(rng, 'function', 'mulberry32 returns function');

  var v1 = rng();
  assertType(v1, 'number', 'rng returns number');
  assertGTE(v1, 0, 'rng value >= 0');
  assertLTE(v1, 1, 'rng value <= 1');

  // Deterministic with same seed
  var rng2 = VG._mulberry32(42);
  assertEqual(rng2(), v1, 'same seed gives same first value');

  // Different seeds give different values
  var rng3 = VG._mulberry32(43);
  assertNotEqual(rng3(), v1, 'different seed gives different value');

  // hashString
  var h1 = VG._hashString('hello');
  assertType(h1, 'number', 'hashString returns number');
  assertGTE(h1, 0, 'hash is non-negative');

  var h2 = VG._hashString('hello');
  assertEqual(h1, h2, 'hashString is deterministic');

  var h3 = VG._hashString('world');
  assertNotEqual(h1, h3, 'different strings give different hashes');

  // Empty string
  var h4 = VG._hashString('');
  assertType(h4, 'number', 'empty string hash is number');
})();

// ============================================================================
// SUITE 19: getConstants
// ============================================================================
suite('getConstants');

(function() {
  var constants = VG.getConstants();
  assertDefined(constants, 'getConstants returns object');
  assertArray(constants.MEDIUMS, 'MEDIUMS is array');
  assertEqual(constants.MEDIUMS.length, 3, '3 mediums');
  assertIncludes(constants.MEDIUMS, 'pixel', 'pixel in mediums');
  assertIncludes(constants.MEDIUMS, 'text', 'text in mediums');
  assertIncludes(constants.MEDIUMS, 'pattern', 'pattern in mediums');

  assertDefined(constants.MEDIUM_MAX_DIMS, 'MEDIUM_MAX_DIMS defined');
  assertDefined(constants.GALLERY_ROOMS, 'GALLERY_ROOMS defined');
  assertEqual(Object.keys(constants.GALLERY_ROOMS).length, 5, '5 gallery rooms');
  assertDefined(constants.ROOM_WALL_SLOTS, 'ROOM_WALL_SLOTS defined');
  assertEqual(constants.VIEWER_SPARK_MIN, 1, 'VIEWER_SPARK_MIN is 1');
  assertEqual(constants.VIEWER_SPARK_MAX, 5, 'VIEWER_SPARK_MAX is 5');
  assertEqual(constants.MAX_EXHIBITION_ARTWORKS, 12, 'MAX_EXHIBITION_ARTWORKS is 12');
  assertEqual(constants.FEATURED_ART_COUNT, 5, 'FEATURED_ART_COUNT is 5');
  assertArray(constants.ARTIST_RANKS, 'ARTIST_RANKS is array');
  assertGT(constants.ARTIST_RANKS.length, 0, 'ARTIST_RANKS has entries');
  assertEqual(constants.MAX_ARTIST_GALLERY_SLOTS, 10, 'MAX_ARTIST_GALLERY_SLOTS is 10');
  assertEqual(constants.VIEW_COOLDOWN_MS, 300000, 'VIEW_COOLDOWN_MS is 300000');
  assertEqual(constants.MIN_RATING, 1, 'MIN_RATING is 1');
  assertEqual(constants.MAX_RATING, 5, 'MAX_RATING is 5');
  assertDefined(constants.ART_BASE_PRICE_BY_RARITY, 'ART_BASE_PRICE_BY_RARITY defined');
  assertDefined(constants.RARITY_BY_AVG_RATING, 'RARITY_BY_AVG_RATING defined');
})();

// ============================================================================
// SUITE 20: getArtistProfile
// ============================================================================
suite('getArtistProfile');

(function() {
  var s = stateWithGallery();
  var artist = uid();

  // Before any activity
  assertEqual(VG.getArtistProfile(s, artist), null, 'no profile before any activity');

  // After creating artwork
  VG.createArtwork(s, artist, { title: 'P', medium: 'pixel' });
  var profile = VG.getArtistProfile(s, artist);
  assertDefined(profile, 'profile created after artwork creation');
  assertEqual(profile.playerId, artist, 'playerId matches');
  assertArray(profile.artworks, 'artworks is array');
  assertArray(profile.exhibitions, 'exhibitions is array');
  assertEqual(profile.totalViews, 0, 'totalViews starts at 0');
  assertEqual(profile.totalEarnings, 0, 'totalEarnings starts at 0');
  assertEqual(profile.rank, 'apprentice', 'initial rank apprentice');
  assertType(profile.joinedAt, 'number', 'joinedAt is a timestamp');
})();

// ============================================================================
// SUITE 21: getArtworksInRoom
// ============================================================================
suite('getArtworksInRoom');

(function() {
  var s = stateWithGallery();
  var artist = uid();

  // Empty room
  var empty = VG.getArtworksInRoom(s, 'west_wing');
  assertArray(empty, 'empty room returns array');
  assertEqual(empty.length, 0, 'empty room has no artworks');

  // Invalid room
  var invalid = VG.getArtworksInRoom(s, 'fake_room');
  assertArray(invalid, 'invalid room returns array');
  assertEqual(invalid.length, 0, 'invalid room has no artworks');

  // Place artworks
  var r1 = VG.createArtwork(s, artist, { title: 'W1', medium: 'text' });
  var r2 = VG.createArtwork(s, artist, { title: 'W2', medium: 'text' });
  VG.displayArtwork(s, artist, r1.artworkId, 'west_wing', 'text_wall_1');
  VG.displayArtwork(s, artist, r2.artworkId, 'west_wing', 'text_wall_2');

  var works = VG.getArtworksInRoom(s, 'west_wing');
  assertEqual(works.length, 2, 'two artworks in west_wing');
  assert(works.some(function(a) { return a.id === r1.artworkId; }), 'r1 in room');
  assert(works.some(function(a) { return a.id === r2.artworkId; }), 'r2 in room');

  // Uninit state
  assertArray(VG.getArtworksInRoom({}, 'main_hall'), 'uninit state returns array');
})();

// ============================================================================
// SUITE 22: Edge cases & integration
// ============================================================================
suite('Edge cases & integration');

(function() {
  // Multiple artists, multiple rooms
  var s = stateWithGallery();
  var a1 = uid(), a2 = uid(), a3 = uid();
  var buyer = uid();

  // Each artist creates artworks
  var r1a = VG.createArtwork(s, a1, { title: 'A1 Pixel', medium: 'pixel', width: 16, height: 16 });
  var r1b = VG.createArtwork(s, a1, { title: 'A1 Text',  medium: 'text',  width: 80, height: 20 });
  var r2a = VG.createArtwork(s, a2, { title: 'A2 Pat',   medium: 'pattern', width: 16, height: 16 });
  var r3a = VG.createArtwork(s, a3, { title: 'A3 Pix',   medium: 'pixel',   width: 8, height: 8 });

  // Display in different rooms
  VG.displayArtwork(s, a1, r1a.artworkId, 'main_hall', 'north_1');
  VG.displayArtwork(s, a1, r1b.artworkId, 'west_wing', 'text_wall_1');
  VG.displayArtwork(s, a2, r2a.artworkId, 'east_wing', 'pixel_row_1');

  // Various viewers
  var viewer1 = uid(), viewer2 = uid();
  var now = 1000000;
  VG.recordView(s, viewer1, r1a.artworkId, now);
  VG.recordView(s, viewer2, r1a.artworkId, now + 1000);
  VG.recordView(s, viewer1, r2a.artworkId, now + 2000);

  // Ratings
  VG.rateArtwork(s, a2, r1a.artworkId, 5);
  VG.rateArtwork(s, a3, r1a.artworkId, 4);
  VG.rateArtwork(s, a1, r2a.artworkId, 3);

  // Exhibition with multiple artists' works
  var curator = uid();
  var exh = VG.createExhibition(s, curator, {
    title: 'Multi-Artist Show',
    theme: 'collaboration',
    artworkIds: [r1a.artworkId, r2a.artworkId, r3a.artworkId]
  });
  assertEqual(exh.success, true, 'multi-artist exhibition created');

  // Trade flow
  VG.listArtForTrade(s, a1, r1b.artworkId, 75);
  var purchase = VG.purchaseArtwork(s, buyer, r1b.artworkId);
  assertEqual(purchase.success, true, 'cross-artist trade successful');

  // Stats should reflect all activity
  var stats = VG.getGalleryStats(s);
  assertGTE(stats.totalArtworks, 4, 'at least 4 artworks');
  assertGTE(stats.totalViews, 3, 'at least 3 total views');

  // Featured artworks populated
  var featured = VG.getFeaturedArtworks(s);
  assertArray(featured, 'featured is array');
  assertGTE(featured.length, 1, 'at least 1 featured');
})();

suite('Medium max dimension boundaries');

(function() {
  var s = stateWithGallery();
  var artist = uid();

  // pixel max dimensions
  var rPix = VG.createArtwork(s, artist, { title: 'MaxPix', medium: 'pixel', width: 64, height: 64 });
  assertEqual(rPix.success, true, 'pixel 64x64 ok');

  // text max dimensions
  var rTxt = VG.createArtwork(s, artist, { title: 'MaxTxt', medium: 'text', width: 256, height: 64 });
  assertEqual(rTxt.success, true, 'text 256x64 ok');

  // pattern max dimensions
  var rPat = VG.createArtwork(s, artist, { title: 'MaxPat', medium: 'pattern', width: 32, height: 32 });
  assertEqual(rPat.success, true, 'pattern 32x32 ok');

  // pixel over max
  var rOver = VG.createArtwork(s, artist, { title: 'Over', medium: 'pixel', width: 65, height: 8 });
  assertEqual(rOver.success, false, 'pixel width 65 rejected');

  // text over max height
  var rOverT = VG.createArtwork(s, artist, { title: 'OverT', medium: 'text', width: 80, height: 65 });
  assertEqual(rOverT.success, false, 'text height 65 rejected');

  // pattern over max
  var rOverP = VG.createArtwork(s, artist, { title: 'OverP', medium: 'pattern', width: 33, height: 8 });
  assertEqual(rOverP.success, false, 'pattern width 33 rejected');
})();

suite('Wall slot independence between rooms');

(function() {
  var s = stateWithGallery();
  var artist = uid();
  var r1 = VG.createArtwork(s, artist, { title: 'Multi', medium: 'pixel' });

  // Same slot name but different rooms
  VG.displayArtwork(s, artist, r1.artworkId, 'main_hall', 'north_1');
  // Note: slot "north_1" is only in main_hall, so we use room-specific slots:
  var r2 = VG.createArtwork(s, artist, { title: 'East', medium: 'pixel' });
  var d2 = VG.displayArtwork(s, artist, r2.artworkId, 'east_wing', 'pixel_row_1');
  assertEqual(d2.success, true, 'can display in different room');

  var mainDisplay = VG.getRoomDisplay(s, 'main_hall');
  var eastDisplay = VG.getRoomDisplay(s, 'east_wing');
  assertEqual(mainDisplay['north_1'].id, r1.artworkId, 'main_hall slot correct');
  assertEqual(eastDisplay['pixel_row_1'].id, r2.artworkId, 'east_wing slot correct');
})();

suite('View count deterministic Spark values');

(function() {
  // Same seed (artworkId + viewerId + viewCount) always gives same Spark
  var s1 = stateWithGallery();
  var s2 = stateWithGallery();
  var artistId = 'artist_fixed';
  var viewerId = 'viewer_fixed';

  // We need artworkIds to match — use the same creation sequence
  var r1 = VG.createArtwork(s1, artistId, { title: 'Spark Test', medium: 'pixel' });
  var r2 = VG.createArtwork(s2, artistId, { title: 'Spark Test', medium: 'pixel' });

  var now = 9999999;
  var v1 = VG.recordView(s1, viewerId, r1.artworkId, now);
  var v2 = VG.recordView(s2, viewerId, r2.artworkId, now + 1000);

  assertGTE(v1.sparkAwarded, 1, 'spark in range min');
  assertLTE(v1.sparkAwarded, 5, 'spark in range max');
  assertGTE(v2.sparkAwarded, 1, 'spark in range min (s2)');
  assertLTE(v2.sparkAwarded, 5, 'spark in range max (s2)');
})();

suite('Exhibition view updates all artwork views');

(function() {
  var s = stateWithGallery();
  var artist  = uid();
  var curator = uid();
  var viewer  = uid();

  var a1 = VG.createArtwork(s, artist, { title: 'E1', medium: 'pixel' });
  var a2 = VG.createArtwork(s, artist, { title: 'E2', medium: 'pixel' });
  var a3 = VG.createArtwork(s, artist, { title: 'E3', medium: 'text' });

  VG.createExhibition(s, curator, {
    title: 'Big Exhibition', theme: 'test',
    artworkIds: [a1.artworkId, a2.artworkId, a3.artworkId]
  });

  var exhIds = Object.keys(s.gallery.exhibitions);
  var exhId = exhIds[0];

  var res = VG.viewExhibition(s, viewer, exhId, 2000000);
  assertEqual(res.success, true, 'viewExhibition success');
  assertEqual(VG.getArtwork(s, a1.artworkId).views, 1, 'a1 views incremented');
  assertEqual(VG.getArtwork(s, a2.artworkId).views, 1, 'a2 views incremented');
  assertEqual(VG.getArtwork(s, a3.artworkId).views, 1, 'a3 views incremented');
})();

// ============================================================================
// Final report
// ============================================================================
console.log('\n==============================');
console.log('Visual Gallery Test Results');
console.log('==============================');
console.log(passed + ' passed, ' + failed + ' failed');

if (failures.length > 0) {
  console.log('\nFailed assertions:');
  for (var fi = 0; fi < failures.length; fi++) {
    console.log('  ' + (fi + 1) + ') ' + failures[fi]);
  }
}

if (failed > 0) {
  process.exit(1);
}
