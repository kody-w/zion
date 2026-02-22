// test_mentorship_market.js — Comprehensive tests for the Mentorship Marketplace
'use strict';
const { test, suite, report, assert } = require('./test_runner');
const MM = require('../src/js/mentorship_market');

// ─── Helpers ──────────────────────────────────────────────────────────────────

var _uid = 0;
function uid(prefix) { return (prefix || 'player') + '_' + (++_uid); }

function freshState() {
  return MM.createMarketState();
}

// Create a listing and return { state, listing }
function makeListingFor(state, subjectId, opts) {
  opts = opts || {};
  var teacherId = opts.teacherId || uid('teacher');
  var price     = typeof opts.price === 'number' ? opts.price : 20;
  var maxStudents = opts.maxStudents || 3;
  var tick      = opts.tick || 100;
  var level     = typeof opts.level === 'number' ? opts.level : 30;
  var r = MM.createListing(state, teacherId, subjectId, price, maxStudents, tick, level);
  return r;
}

// Full happy-path: listing -> book -> start -> complete
function fullSession(state, teacherId, studentId, subjectId) {
  var r1 = MM.createListing(state, teacherId, subjectId || 'trading_101', 15, 2, 500, 30);
  assert(r1.success, 'createListing failed: ' + r1.message);
  var r2 = MM.bookSession(r1.state, r1.listing.id, studentId);
  assert(r2.success, 'bookSession failed: ' + r2.message);
  var r3 = MM.startSession(r2.state, r2.session.id, 500);
  assert(r3.success, 'startSession failed: ' + r3.message);
  var r4 = MM.completeSession(r3.state, r2.session.id, 800);
  assert(r4.success, 'completeSession failed: ' + r4.message);
  return r4;
}

// ─── SUBJECTS catalog ────────────────────────────────────────────────────────

suite('SUBJECTS — catalog completeness', function() {

  test('SUBJECTS has exactly 15 entries', function() {
    assert.strictEqual(Object.keys(MM.SUBJECTS).length, 15);
  });

  test('All 15 subject keys are present', function() {
    var expected = [
      'fishing_basics', 'advanced_fishing', 'herb_identification',
      'basic_smithing', 'advanced_crafting', 'recipe_mastery',
      'card_strategy', 'dungeon_tactics', 'trading_101', 'market_analysis',
      'zone_lore', 'constellation_guide', 'navigation_skills',
      'survival_training', 'leadership'
    ];
    expected.forEach(function(key) {
      assert(MM.SUBJECTS[key] !== undefined, 'Missing subject: ' + key);
    });
  });

  test('Each subject has required fields: name, category, minLevel, basePrice, duration', function() {
    var required = ['name', 'category', 'minLevel', 'basePrice', 'duration'];
    Object.entries(MM.SUBJECTS).forEach(function(entry) {
      var key = entry[0]; var subj = entry[1];
      required.forEach(function(f) {
        assert(subj[f] !== undefined, key + ' missing field: ' + f);
      });
    });
  });

  test('All categories are valid', function() {
    Object.entries(MM.SUBJECTS).forEach(function(entry) {
      var key = entry[0]; var subj = entry[1];
      assert(MM.VALID_CATEGORIES.indexOf(subj.category) !== -1,
        key + ' has invalid category: ' + subj.category);
    });
  });

  test('All minLevel values are positive integers', function() {
    Object.entries(MM.SUBJECTS).forEach(function(entry) {
      var key = entry[0]; var subj = entry[1];
      assert(Number.isInteger(subj.minLevel) && subj.minLevel > 0,
        key + ' minLevel must be positive integer, got: ' + subj.minLevel);
    });
  });

  test('All basePrice values are positive numbers', function() {
    Object.entries(MM.SUBJECTS).forEach(function(entry) {
      var key = entry[0]; var subj = entry[1];
      assert(subj.basePrice > 0, key + ' basePrice must be positive');
    });
  });

  test('All duration values are positive numbers', function() {
    Object.entries(MM.SUBJECTS).forEach(function(entry) {
      var key = entry[0]; var subj = entry[1];
      assert(subj.duration > 0, key + ' duration must be positive');
    });
  });

  test('recipe_mastery and leadership have duration 600', function() {
    assert.strictEqual(MM.SUBJECTS.recipe_mastery.duration, 600);
    assert.strictEqual(MM.SUBJECTS.leadership.duration, 600);
  });

  test('getSubjects() returns the same object as SUBJECTS', function() {
    assert.deepStrictEqual(MM.getSubjects(), MM.SUBJECTS);
  });

  test('getSubjectsByCategory returns only matching subjects', function() {
    var gathering = MM.getSubjectsByCategory('gathering');
    var keys = Object.keys(gathering);
    assert(keys.length > 0, 'should have gathering subjects');
    keys.forEach(function(k) {
      assert.strictEqual(gathering[k].category, 'gathering', k + ' should be gathering');
    });
  });

  test('getSubjectsByCategory("gathering") has 3 subjects', function() {
    assert.strictEqual(Object.keys(MM.getSubjectsByCategory('gathering')).length, 3);
  });

  test('getSubjectsByCategory("crafting") has 3 subjects', function() {
    assert.strictEqual(Object.keys(MM.getSubjectsByCategory('crafting')).length, 3);
  });

  test('getSubjectsByCategory("economy") has 2 subjects', function() {
    assert.strictEqual(Object.keys(MM.getSubjectsByCategory('economy')).length, 2);
  });

  test('getSubjectsByCategory("social") has 1 subject (leadership)', function() {
    var social = MM.getSubjectsByCategory('social');
    assert.strictEqual(Object.keys(social).length, 1);
    assert(social.leadership !== undefined, 'leadership should be in social');
  });

  test('getSubjectsByCategory("unknown") returns empty object', function() {
    var result = MM.getSubjectsByCategory('unknown_cat');
    assert.strictEqual(Object.keys(result).length, 0);
  });

  test('subject names are non-empty strings', function() {
    Object.entries(MM.SUBJECTS).forEach(function(entry) {
      var key = entry[0]; var subj = entry[1];
      assert(typeof subj.name === 'string' && subj.name.length > 0, key + ' name must be non-empty string');
    });
  });
});

// ─── createMarketState ────────────────────────────────────────────────────────

suite('createMarketState — initial state shape', function() {

  test('returns object with listings array', function() {
    var s = freshState();
    assert(Array.isArray(s.listings));
    assert.strictEqual(s.listings.length, 0);
  });

  test('returns object with sessions array', function() {
    var s = freshState();
    assert(Array.isArray(s.sessions));
    assert.strictEqual(s.sessions.length, 0);
  });

  test('returns object with ratings map', function() {
    var s = freshState();
    assert(typeof s.ratings === 'object' && !Array.isArray(s.ratings));
  });

  test('returns object with teacherStats map', function() {
    var s = freshState();
    assert(typeof s.teacherStats === 'object' && !Array.isArray(s.teacherStats));
  });

  test('nextListingId starts at 1', function() {
    var s = freshState();
    assert.strictEqual(s.nextListingId, 1);
  });

  test('nextSessionId starts at 1', function() {
    var s = freshState();
    assert.strictEqual(s.nextSessionId, 1);
  });

  test('two fresh states are independent', function() {
    var s1 = freshState();
    var s2 = freshState();
    s1.listings.push({ id: 99 });
    assert.strictEqual(s2.listings.length, 0);
  });
});

// ─── createListing ────────────────────────────────────────────────────────────

suite('createListing — happy path', function() {

  test('creates listing with correct fields', function() {
    var s = freshState();
    var r = MM.createListing(s, 'alice', 'fishing_basics', 10, 3, 200, 10);
    assert(r.success, r.message);
    assert.strictEqual(r.listing.teacherId, 'alice');
    assert.strictEqual(r.listing.subjectId, 'fishing_basics');
    assert.strictEqual(r.listing.price, 10);
    assert.strictEqual(r.listing.maxStudents, 3);
    assert.strictEqual(r.listing.scheduleTick, 200);
  });

  test('listing gets incrementing ID starting at 1', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 10, 1, 100, 10);
    var r2 = MM.createListing(r1.state, 'alice', 'zone_lore', 12, 1, 200, 15);
    assert.strictEqual(r1.listing.id, 1);
    assert.strictEqual(r2.listing.id, 2);
  });

  test('listing defaults to open status', function() {
    var s = freshState();
    var r = MM.createListing(s, 'alice', 'trading_101', 10, 2, 100, 10);
    assert.strictEqual(r.listing.status, MM.LISTING_STATUS.OPEN);
  });

  test('listing embeds subject reference', function() {
    var s = freshState();
    var r = MM.createListing(s, 'alice', 'fishing_basics', 10, 2, 100, 10);
    assert(r.listing.subject !== undefined, 'listing should embed subject');
    assert.strictEqual(r.listing.subject.name, 'Fishing Basics');
  });

  test('listing is added to state.listings', function() {
    var s = freshState();
    var r = MM.createListing(s, 'alice', 'trading_101', 10, 2, 100, 10);
    assert.strictEqual(r.state.listings.length, 1);
  });

  test('does not mutate original state', function() {
    var s = freshState();
    MM.createListing(s, 'alice', 'trading_101', 10, 2, 100, 10);
    assert.strictEqual(s.listings.length, 0);
  });

  test('price of 0 is allowed', function() {
    var s = freshState();
    var r = MM.createListing(s, 'alice', 'trading_101', 0, 1, 100, 10);
    assert(r.success, 'price 0 should be allowed');
    assert.strictEqual(r.listing.price, 0);
  });

  test('maxStudents is floored to integer', function() {
    var s = freshState();
    var r = MM.createListing(s, 'alice', 'trading_101', 10, 3.9, 100, 10);
    assert(r.success);
    assert.strictEqual(r.listing.maxStudents, 3);
  });
});

suite('createListing — validation failures', function() {

  test('fails with invalid teacherId (empty string)', function() {
    var s = freshState();
    var r = MM.createListing(s, '', 'trading_101', 10, 1, 100, 10);
    assert(!r.success);
    assert(r.listing === null);
  });

  test('fails with invalid teacherId (non-string)', function() {
    var s = freshState();
    var r = MM.createListing(s, 42, 'trading_101', 10, 1, 100, 10);
    assert(!r.success);
  });

  test('fails with unknown subject', function() {
    var s = freshState();
    var r = MM.createListing(s, 'alice', 'dragon_taming', 10, 1, 100, 30);
    assert(!r.success);
    assert(r.message.indexOf('Unknown subject') !== -1);
  });

  test('fails when teacher level is below minLevel', function() {
    var s = freshState();
    // fishing_basics requires minLevel 5, teacher is level 3
    var r = MM.createListing(s, 'alice', 'fishing_basics', 10, 1, 100, 3);
    assert(!r.success);
    assert(r.message.indexOf('below required level') !== -1);
  });

  test('fails with negative price', function() {
    var s = freshState();
    var r = MM.createListing(s, 'alice', 'trading_101', -5, 1, 100, 10);
    assert(!r.success);
  });

  test('fails with maxStudents < 1', function() {
    var s = freshState();
    var r = MM.createListing(s, 'alice', 'trading_101', 10, 0, 100, 10);
    assert(!r.success);
  });

  test('fails with negative scheduleTick', function() {
    var s = freshState();
    var r = MM.createListing(s, 'alice', 'trading_101', 10, 1, -1, 10);
    assert(!r.success);
  });

  test('fails when teacher level is exactly one below minLevel', function() {
    var s = freshState();
    // leadership requires level 20; teacher is level 19
    var r = MM.createListing(s, 'alice', 'leadership', 25, 1, 100, 19);
    assert(!r.success);
    assert(r.message.indexOf('below required level') !== -1);
  });

  test('succeeds when teacher level equals exactly minLevel', function() {
    var s = freshState();
    var r = MM.createListing(s, 'alice', 'fishing_basics', 10, 1, 100, 5);
    assert(r.success, r.message);
  });
});

// ─── cancelListing ────────────────────────────────────────────────────────────

suite('cancelListing', function() {

  test('teacher can cancel own listing', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 10, 2, 100, 10);
    var r2 = MM.cancelListing(r1.state, r1.listing.id, 'alice');
    assert(r2.success, r2.message);
    var listing = r2.state.listings[0];
    assert.strictEqual(listing.status, MM.LISTING_STATUS.CANCELLED);
  });

  test('non-teacher cannot cancel listing', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 10, 2, 100, 10);
    var r2 = MM.cancelListing(r1.state, r1.listing.id, 'bob');
    assert(!r2.success);
    assert(r2.message.indexOf('Only the teacher') !== -1);
  });

  test('cancelling a listing also cancels booked sessions', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 10, 3, 100, 10);
    var r2 = MM.bookSession(r1.state, r1.listing.id, 'bob');
    var r3 = MM.cancelListing(r2.state, r1.listing.id, 'alice');
    assert(r3.success, r3.message);
    var session = r3.state.sessions[0];
    assert.strictEqual(session.status, MM.SESSION_STATUS.CANCELLED);
    assert(session.refunded, 'cancelled sessions should be refunded');
  });

  test('cannot cancel an already-cancelled listing', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 10, 2, 100, 10);
    var r2 = MM.cancelListing(r1.state, r1.listing.id, 'alice');
    var r3 = MM.cancelListing(r2.state, r1.listing.id, 'alice');
    assert(!r3.success);
    assert(r3.message.indexOf('already cancelled') !== -1);
  });

  test('cancelling non-existent listing fails gracefully', function() {
    var s = freshState();
    var r = MM.cancelListing(s, 9999, 'alice');
    assert(!r.success);
    assert(r.message.indexOf('not found') !== -1);
  });

  test('does not mutate original state', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 10, 2, 100, 10);
    MM.cancelListing(r1.state, r1.listing.id, 'alice');
    assert.strictEqual(r1.state.listings[0].status, MM.LISTING_STATUS.OPEN);
  });
});

// ─── bookSession ─────────────────────────────────────────────────────────────

suite('bookSession — happy path', function() {

  test('student can book an open listing', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 15, 2, 100, 10);
    var r2 = MM.bookSession(r1.state, r1.listing.id, 'bob');
    assert(r2.success, r2.message);
    assert(r2.session !== null);
    assert.strictEqual(r2.session.studentId, 'bob');
    assert.strictEqual(r2.session.teacherId, 'alice');
  });

  test('session holds price in escrow', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 20, 2, 100, 10);
    var r2 = MM.bookSession(r1.state, r1.listing.id, 'bob');
    assert.strictEqual(r2.session.escrow, 20);
  });

  test('session starts in booked status', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 15, 2, 100, 10);
    var r2 = MM.bookSession(r1.state, r1.listing.id, 'bob');
    assert.strictEqual(r2.session.status, MM.SESSION_STATUS.BOOKED);
  });

  test('session ID increments from 1', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 15, 5, 100, 10);
    var r2 = MM.bookSession(r1.state, r1.listing.id, 'bob');
    var r3 = MM.bookSession(r2.state, r1.listing.id, 'carol');
    assert.strictEqual(r2.session.id, 1);
    assert.strictEqual(r3.session.id, 2);
  });

  test('listing becomes full when all slots are taken', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 15, 1, 100, 10);
    var r2 = MM.bookSession(r1.state, r1.listing.id, 'bob');
    var listing = r2.state.listings[0];
    assert.strictEqual(listing.status, MM.LISTING_STATUS.FULL);
  });

  test('multiple students can book multi-slot listing', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 15, 3, 100, 10);
    var r2 = MM.bookSession(r1.state, r1.listing.id, 'bob');
    var r3 = MM.bookSession(r2.state, r1.listing.id, 'carol');
    assert(r2.success && r3.success);
    var listing = r3.state.listings[0];
    assert.strictEqual(listing.status, MM.LISTING_STATUS.OPEN);
  });

  test('does not mutate original state', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 15, 2, 100, 10);
    MM.bookSession(r1.state, r1.listing.id, 'bob');
    assert.strictEqual(r1.state.sessions.length, 0);
  });
});

suite('bookSession — validation failures', function() {

  test('teacher cannot book their own session', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 15, 2, 100, 10);
    var r2 = MM.bookSession(r1.state, r1.listing.id, 'alice');
    assert(!r2.success);
    assert(r2.message.indexOf('cannot book') !== -1 || r2.message.indexOf('Teacher') !== -1);
  });

  test('cannot book full listing', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 15, 1, 100, 10);
    var r2 = MM.bookSession(r1.state, r1.listing.id, 'bob');
    var r3 = MM.bookSession(r2.state, r1.listing.id, 'carol');
    assert(!r3.success);
    assert(r3.message.indexOf('full') !== -1);
  });

  test('cannot book cancelled listing', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 15, 2, 100, 10);
    var r2 = MM.cancelListing(r1.state, r1.listing.id, 'alice');
    var r3 = MM.bookSession(r2.state, r1.listing.id, 'bob');
    assert(!r3.success);
    assert(r3.message.indexOf('cancelled') !== -1);
  });

  test('student cannot double-book same listing', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 15, 5, 100, 10);
    var r2 = MM.bookSession(r1.state, r1.listing.id, 'bob');
    var r3 = MM.bookSession(r2.state, r1.listing.id, 'bob');
    assert(!r3.success);
    assert(r3.message.indexOf('already booked') !== -1);
  });

  test('booking non-existent listing fails', function() {
    var s = freshState();
    var r = MM.bookSession(s, 999, 'bob');
    assert(!r.success);
    assert(r.message.indexOf('not found') !== -1);
  });

  test('invalid student ID fails', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 15, 2, 100, 10);
    var r2 = MM.bookSession(r1.state, r1.listing.id, '');
    assert(!r2.success);
  });
});

// ─── cancelBooking ────────────────────────────────────────────────────────────

suite('cancelBooking — refund logic', function() {

  test('student gets refund when cancelling far in advance (> 60 ticks)', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 15, 2, 1000, 10);
    var r2 = MM.bookSession(r1.state, r1.listing.id, 'bob');
    // currentTick=0, scheduleTick=1000, difference > 60 → refund
    var r3 = MM.cancelBooking(r2.state, r2.session.id, 'bob', 0);
    assert(r3.success, r3.message);
    assert(r3.refunded, 'should be refunded');
    assert.strictEqual(r3.state.sessions[0].status, MM.SESSION_STATUS.CANCELLED);
  });

  test('no refund when cancelling within 60 ticks of session', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 15, 2, 1000, 10);
    var r2 = MM.bookSession(r1.state, r1.listing.id, 'bob');
    // currentTick=950, scheduleTick=1000, difference=50 <= 60 → no refund
    var r3 = MM.cancelBooking(r2.state, r2.session.id, 'bob', 950);
    assert(r3.success, r3.message);
    assert(!r3.refunded, 'should not be refunded within 60 ticks');
  });

  test('exactly 61 ticks before session gives refund', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 15, 2, 1000, 10);
    var r2 = MM.bookSession(r1.state, r1.listing.id, 'bob');
    var r3 = MM.cancelBooking(r2.state, r2.session.id, 'bob', 939); // 1000-939=61
    assert(r3.refunded, 'exactly 61 ticks should get refund');
  });

  test('exactly 60 ticks before session does NOT give refund', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 15, 2, 1000, 10);
    var r2 = MM.bookSession(r1.state, r1.listing.id, 'bob');
    var r3 = MM.cancelBooking(r2.state, r2.session.id, 'bob', 940); // 1000-940=60
    assert(!r3.refunded, 'exactly 60 ticks should NOT get refund');
  });

  test('teacher can cancel a booking', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 15, 2, 1000, 10);
    var r2 = MM.bookSession(r1.state, r1.listing.id, 'bob');
    var r3 = MM.cancelBooking(r2.state, r2.session.id, 'alice', 0);
    assert(r3.success, r3.message);
  });

  test('cancellation re-opens a full listing', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 15, 1, 1000, 10);
    var r2 = MM.bookSession(r1.state, r1.listing.id, 'bob');
    assert.strictEqual(r2.state.listings[0].status, MM.LISTING_STATUS.FULL);
    var r3 = MM.cancelBooking(r2.state, r2.session.id, 'bob', 0);
    assert.strictEqual(r3.state.listings[0].status, MM.LISTING_STATUS.OPEN);
  });

  test('third-party cannot cancel a booking', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 15, 2, 1000, 10);
    var r2 = MM.bookSession(r1.state, r1.listing.id, 'bob');
    var r3 = MM.cancelBooking(r2.state, r2.session.id, 'charlie', 0);
    assert(!r3.success);
    assert(r3.message.indexOf('not part of') !== -1);
  });

  test('cannot cancel already-cancelled session', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 15, 2, 1000, 10);
    var r2 = MM.bookSession(r1.state, r1.listing.id, 'bob');
    var r3 = MM.cancelBooking(r2.state, r2.session.id, 'bob', 0);
    var r4 = MM.cancelBooking(r3.state, r2.session.id, 'bob', 0);
    assert(!r4.success);
  });

  test('cannot cancel completed session', function() {
    var t = uid('teacher'); var st = uid('student');
    var r4 = fullSession(freshState(), t, st, 'trading_101');
    var sessionId = r4.state.sessions[0].id;
    var r5 = MM.cancelBooking(r4.state, sessionId, st, 0);
    assert(!r5.success);
    assert(r5.message.indexOf('completed') !== -1);
  });

  test('cannot cancel active session', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 15, 2, 500, 10);
    var r2 = MM.bookSession(r1.state, r1.listing.id, 'bob');
    var r3 = MM.startSession(r2.state, r2.session.id, 500);
    var r4 = MM.cancelBooking(r3.state, r2.session.id, 'bob', 500);
    assert(!r4.success);
    assert(r4.message.indexOf('active') !== -1);
  });
});

// ─── startSession ─────────────────────────────────────────────────────────────

suite('startSession', function() {

  test('sets session status to active', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 15, 2, 500, 10);
    var r2 = MM.bookSession(r1.state, r1.listing.id, 'bob');
    var r3 = MM.startSession(r2.state, r2.session.id, 500);
    assert(r3.success, r3.message);
    assert.strictEqual(r3.state.sessions[0].status, MM.SESSION_STATUS.ACTIVE);
  });

  test('records startedAt tick', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 15, 2, 500, 10);
    var r2 = MM.bookSession(r1.state, r1.listing.id, 'bob');
    var r3 = MM.startSession(r2.state, r2.session.id, 500);
    assert.strictEqual(r3.state.sessions[0].startedAt, 500);
  });

  test('fails if session not found', function() {
    var s = freshState();
    var r = MM.startSession(s, 999, 100);
    assert(!r.success);
  });

  test('fails to start already active session', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 15, 2, 500, 10);
    var r2 = MM.bookSession(r1.state, r1.listing.id, 'bob');
    var r3 = MM.startSession(r2.state, r2.session.id, 500);
    var r4 = MM.startSession(r3.state, r2.session.id, 501);
    assert(!r4.success);
    assert(r4.message.indexOf('already active') !== -1);
  });

  test('fails to start cancelled session', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 15, 2, 1000, 10);
    var r2 = MM.bookSession(r1.state, r1.listing.id, 'bob');
    var r3 = MM.cancelBooking(r2.state, r2.session.id, 'bob', 0);
    var r4 = MM.startSession(r3.state, r2.session.id, 1000);
    assert(!r4.success);
    assert(r4.message.indexOf('cancelled') !== -1);
  });

  test('fails to start completed session', function() {
    var t = uid('teacher'); var st = uid('student');
    var r4 = fullSession(freshState(), t, st, 'trading_101');
    var sessionId = r4.state.sessions[0].id;
    var r5 = MM.startSession(r4.state, sessionId, 900);
    assert(!r5.success);
    assert(r5.message.indexOf('completed') !== -1);
  });
});

// ─── completeSession ──────────────────────────────────────────────────────────

suite('completeSession', function() {

  test('sets session status to completed', function() {
    var t = uid('teacher'); var st = uid('student');
    var r = fullSession(freshState(), t, st, 'trading_101');
    assert.strictEqual(r.state.sessions[0].status, MM.SESSION_STATUS.COMPLETED);
  });

  test('teacher reward contains spark equal to price', function() {
    var t = uid('teacher'); var st = uid('student');
    var s = freshState();
    var r1 = MM.createListing(s, t, 'trading_101', 30, 2, 500, 10);
    var r2 = MM.bookSession(r1.state, r1.listing.id, st);
    var r3 = MM.startSession(r2.state, r2.session.id, 500);
    var r4 = MM.completeSession(r3.state, r2.session.id, 800);
    assert.strictEqual(r4.teacherReward.spark, 30);
  });

  test('student reward contains xp >= STUDENT_XP_BASE', function() {
    var t = uid('teacher'); var st = uid('student');
    var r = fullSession(freshState(), t, st, 'trading_101');
    assert(r.studentReward.xp >= 50, 'Student XP should be >= 50');
  });

  test('teacher stats updated: totalSessions incremented', function() {
    var t = uid('teacher'); var st = uid('student');
    var r = fullSession(freshState(), t, st, 'trading_101');
    assert(r.state.teacherStats[t] !== undefined, 'teacherStats should exist for teacher');
    assert.strictEqual(r.state.teacherStats[t].totalSessions, 1);
  });

  test('teacher stats updated: totalEarned incremented by price', function() {
    var t = uid('teacher'); var st = uid('student');
    var s = freshState();
    var r1 = MM.createListing(s, t, 'trading_101', 25, 2, 500, 10);
    var r2 = MM.bookSession(r1.state, r1.listing.id, st);
    var r3 = MM.startSession(r2.state, r2.session.id, 500);
    var r4 = MM.completeSession(r3.state, r2.session.id, 800);
    assert.strictEqual(r4.state.teacherStats[t].totalEarned, 25);
  });

  test('teacher stats track subjectCounts', function() {
    var t = uid('teacher'); var st = uid('student');
    var r = fullSession(freshState(), t, st, 'trading_101');
    assert.strictEqual(r.state.teacherStats[t].subjectCounts['trading_101'], 1);
  });

  test('escrow zeroed after completion', function() {
    var t = uid('teacher'); var st = uid('student');
    var r = fullSession(freshState(), t, st, 'trading_101');
    assert.strictEqual(r.state.sessions[0].escrow, 0);
  });

  test('records completedAt tick', function() {
    var s = freshState();
    var t = uid('teacher'); var st = uid('student');
    var r1 = MM.createListing(s, t, 'trading_101', 15, 2, 500, 10);
    var r2 = MM.bookSession(r1.state, r1.listing.id, st);
    var r3 = MM.startSession(r2.state, r2.session.id, 500);
    var r4 = MM.completeSession(r3.state, r2.session.id, 800);
    assert.strictEqual(r4.state.sessions[0].completedAt, 800);
  });

  test('fails if session not started (still booked)', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 15, 2, 500, 10);
    var r2 = MM.bookSession(r1.state, r1.listing.id, 'bob');
    var r3 = MM.completeSession(r2.state, r2.session.id, 800);
    assert(!r3.success);
    assert(r3.message.indexOf('started') !== -1 || r3.message.indexOf('active') !== -1 || r3.message.indexOf('must be') !== -1);
  });

  test('fails to complete already-completed session', function() {
    var t = uid('teacher'); var st = uid('student');
    var r = fullSession(freshState(), t, st, 'trading_101');
    var r2 = MM.completeSession(r.state, r.state.sessions[0].id, 900);
    assert(!r2.success);
    assert(r2.message.indexOf('already completed') !== -1);
  });

  test('fails to complete cancelled session', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 15, 2, 1000, 10);
    var r2 = MM.bookSession(r1.state, r1.listing.id, 'bob');
    var r3 = MM.cancelBooking(r2.state, r2.session.id, 'bob', 0);
    var r4 = MM.completeSession(r3.state, r2.session.id, 1000);
    assert(!r4.success);
    assert(r4.message.indexOf('cancelled') !== -1);
  });

  test('fails if session not found', function() {
    var s = freshState();
    var r = MM.completeSession(s, 999, 100);
    assert(!r.success);
  });

  test('long-duration subject (600 tick) gives bonus XP', function() {
    var t = uid('teacher'); var st = uid('student');
    var r = fullSession(freshState(), t, st, 'leadership'); // duration 600
    var shortR = fullSession(freshState(), uid('t'), uid('s'), 'trading_101'); // duration 300
    assert(r.studentReward.xp > shortR.studentReward.xp, 'Long session should give more XP');
  });
});

// ─── rateSession ──────────────────────────────────────────────────────────────

suite('rateSession — happy path', function() {

  test('student can rate the session', function() {
    var t = uid('teacher'); var st = uid('student');
    var r = fullSession(freshState(), t, st, 'trading_101');
    var sessionId = r.state.sessions[0].id;
    var r2 = MM.rateSession(r.state, sessionId, st, 5, 'Great session!');
    assert(r2.success, r2.message);
  });

  test('teacher can rate the session', function() {
    var t = uid('teacher'); var st = uid('student');
    var r = fullSession(freshState(), t, st, 'trading_101');
    var sessionId = r.state.sessions[0].id;
    var r2 = MM.rateSession(r.state, sessionId, t, 4, 'Good student');
    assert(r2.success, r2.message);
  });

  test('student rating is stored under "teacher" key (rates the teacher)', function() {
    var t = uid('teacher'); var st = uid('student');
    var r = fullSession(freshState(), t, st, 'trading_101');
    var sessionId = r.state.sessions[0].id;
    var r2 = MM.rateSession(r.state, sessionId, st, 5, 'Excellent');
    assert(r2.state.ratings[sessionId].teacher !== undefined, 'student rates teacher');
    assert.strictEqual(r2.state.ratings[sessionId].teacher.rating, 5);
  });

  test('rating is rounded to nearest integer', function() {
    var t = uid('teacher'); var st = uid('student');
    var r = fullSession(freshState(), t, st, 'trading_101');
    var sessionId = r.state.sessions[0].id;
    var r2 = MM.rateSession(r.state, sessionId, st, 4.7, '');
    assert.strictEqual(r2.state.ratings[sessionId].teacher.rating, 5);
  });

  test('review is truncated to 200 chars', function() {
    var t = uid('teacher'); var st = uid('student');
    var r = fullSession(freshState(), t, st, 'trading_101');
    var sessionId = r.state.sessions[0].id;
    var longReview = 'A'.repeat(300);
    var r2 = MM.rateSession(r.state, sessionId, st, 5, longReview);
    assert.strictEqual(r2.state.ratings[sessionId].teacher.review.length, 200);
  });

  test('rating below 2 is flagged', function() {
    var t = uid('teacher'); var st = uid('student');
    var r = fullSession(freshState(), t, st, 'trading_101');
    var sessionId = r.state.sessions[0].id;
    var r2 = MM.rateSession(r.state, sessionId, st, 1, 'Terrible');
    assert(r2.state.ratings[sessionId].teacher.flagged, 'rating < 2 should be flagged');
  });

  test('rating of 2 is not flagged', function() {
    var t = uid('teacher'); var st = uid('student');
    var r = fullSession(freshState(), t, st, 'trading_101');
    var sessionId = r.state.sessions[0].id;
    var r2 = MM.rateSession(r.state, sessionId, st, 2, 'OK');
    assert(!r2.state.ratings[sessionId].teacher.flagged, 'rating 2 should NOT be flagged');
  });

  test('both teacher and student can rate same session', function() {
    var t = uid('teacher'); var st = uid('student');
    var r = fullSession(freshState(), t, st, 'trading_101');
    var sessionId = r.state.sessions[0].id;
    var r2 = MM.rateSession(r.state, sessionId, st, 5, 'Loved it');
    var r3 = MM.rateSession(r2.state, sessionId, t, 4, 'Good student');
    assert(r2.success && r3.success);
    assert(r3.state.ratings[sessionId].teacher !== undefined);
    assert(r3.state.ratings[sessionId].student !== undefined);
  });
});

suite('rateSession — validation failures', function() {

  test('cannot rate incomplete session', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 15, 2, 500, 10);
    var r2 = MM.bookSession(r1.state, r1.listing.id, 'bob');
    var r3 = MM.rateSession(r2.state, r2.session.id, 'bob', 5, '');
    assert(!r3.success);
    assert(r3.message.indexOf('completed') !== -1);
  });

  test('third-party cannot rate session', function() {
    var t = uid('teacher'); var st = uid('student');
    var r = fullSession(freshState(), t, st, 'trading_101');
    var sessionId = r.state.sessions[0].id;
    var r2 = MM.rateSession(r.state, sessionId, 'outsider', 5, '');
    assert(!r2.success);
    assert(r2.message.indexOf('not part of') !== -1);
  });

  test('cannot rate with value out of range (0)', function() {
    var t = uid('teacher'); var st = uid('student');
    var r = fullSession(freshState(), t, st, 'trading_101');
    var sessionId = r.state.sessions[0].id;
    var r2 = MM.rateSession(r.state, sessionId, st, 0, '');
    assert(!r2.success);
  });

  test('cannot rate with value out of range (6)', function() {
    var t = uid('teacher'); var st = uid('student');
    var r = fullSession(freshState(), t, st, 'trading_101');
    var sessionId = r.state.sessions[0].id;
    var r2 = MM.rateSession(r.state, sessionId, st, 6, '');
    assert(!r2.success);
  });

  test('cannot rate same session twice (student)', function() {
    var t = uid('teacher'); var st = uid('student');
    var r = fullSession(freshState(), t, st, 'trading_101');
    var sessionId = r.state.sessions[0].id;
    var r2 = MM.rateSession(r.state, sessionId, st, 5, 'First');
    var r3 = MM.rateSession(r2.state, sessionId, st, 4, 'Second');
    assert(!r3.success);
    assert(r3.message.indexOf('Already rated') !== -1);
  });

  test('rating non-existent session fails', function() {
    var s = freshState();
    var r = MM.rateSession(s, 9999, 'alice', 5, '');
    assert(!r.success);
    assert(r.message.indexOf('not found') !== -1);
  });
});

// ─── getTeacherRating ─────────────────────────────────────────────────────────

suite('getTeacherRating', function() {

  test('returns zero average for teacher with no ratings', function() {
    var s = freshState();
    var result = MM.getTeacherRating(s, 'alice');
    assert.strictEqual(result.average, 0);
    assert.strictEqual(result.count, 0);
  });

  test('computes correct average rating', function() {
    var t = uid('teacher'); var st1 = uid('s'); var st2 = uid('s');
    var s = freshState();
    // Session 1 — rated 4
    var r1 = MM.createListing(s, t, 'trading_101', 15, 5, 500, 10);
    var rb1 = MM.bookSession(r1.state, r1.listing.id, st1);
    var rs1 = MM.startSession(rb1.state, rb1.session.id, 500);
    var rc1 = MM.completeSession(rs1.state, rb1.session.id, 800);
    var rr1 = MM.rateSession(rc1.state, rb1.session.id, st1, 4, '');
    // Session 2 — rated 2
    var rb2 = MM.bookSession(rr1.state, r1.listing.id, st2);
    var rs2 = MM.startSession(rb2.state, rb2.session.id, 500);
    var rc2 = MM.completeSession(rs2.state, rb2.session.id, 800);
    var rr2 = MM.rateSession(rc2.state, rb2.session.id, st2, 2, '');
    var result = MM.getTeacherRating(rr2.state, t);
    assert.strictEqual(result.average, 3); // (4+2)/2=3
    assert.strictEqual(result.count, 2);
  });

  test('includes reviews with text', function() {
    var t = uid('teacher'); var st = uid('student');
    var r = fullSession(freshState(), t, st, 'trading_101');
    var sessionId = r.state.sessions[0].id;
    var r2 = MM.rateSession(r.state, sessionId, st, 5, 'Amazing teacher!');
    var result = MM.getTeacherRating(r2.state, t);
    assert(result.reviews.length > 0, 'should have reviews');
    assert.strictEqual(result.reviews[0].review, 'Amazing teacher!');
  });
});

// ─── getListings ──────────────────────────────────────────────────────────────

suite('getListings — filtering and sorting', function() {

  test('returns all open listings when no filters', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 10, 2, 100, 10);
    var r2 = MM.createListing(r1.state, 'bob', 'fishing_basics', 10, 2, 200, 10);
    var listings = MM.getListings(r2.state, {});
    assert.strictEqual(listings.length, 2);
  });

  test('filters by subject', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 10, 2, 100, 10);
    var r2 = MM.createListing(r1.state, 'bob', 'fishing_basics', 10, 2, 200, 10);
    var listings = MM.getListings(r2.state, { subject: 'fishing_basics' });
    assert.strictEqual(listings.length, 1);
    assert.strictEqual(listings[0].subjectId, 'fishing_basics');
  });

  test('filters by category', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 10, 2, 100, 10);
    var r2 = MM.createListing(r1.state, 'bob', 'fishing_basics', 10, 2, 200, 10);
    var listings = MM.getListings(r2.state, { category: 'economy' });
    assert.strictEqual(listings.length, 1);
    assert.strictEqual(listings[0].subjectId, 'trading_101');
  });

  test('filters by maxPrice', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 10, 2, 100, 10);
    var r2 = MM.createListing(r1.state, 'bob', 'fishing_basics', 50, 2, 200, 10);
    var listings = MM.getListings(r2.state, { maxPrice: 15 });
    assert.strictEqual(listings.length, 1);
    assert.strictEqual(listings[0].subjectId, 'trading_101');
  });

  test('filters by teacherId', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 10, 2, 100, 10);
    var r2 = MM.createListing(r1.state, 'bob', 'fishing_basics', 10, 2, 200, 10);
    var listings = MM.getListings(r2.state, { teacherId: 'alice' });
    assert.strictEqual(listings.length, 1);
    assert.strictEqual(listings[0].teacherId, 'alice');
  });

  test('does not return cancelled listings', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 10, 2, 100, 10);
    var r2 = MM.cancelListing(r1.state, r1.listing.id, 'alice');
    var listings = MM.getListings(r2.state, {});
    assert.strictEqual(listings.length, 0);
  });

  test('sorts by price ascending when sortBy=price', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 30, 2, 100, 10);
    var r2 = MM.createListing(r1.state, 'bob', 'fishing_basics', 10, 2, 200, 10);
    var listings = MM.getListings(r2.state, { sortBy: 'price' });
    assert.strictEqual(listings[0].price, 10);
    assert.strictEqual(listings[1].price, 30);
  });

  test('sorts by date (scheduleTick) when sortBy=date', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 10, 2, 500, 10);
    var r2 = MM.createListing(r1.state, 'bob', 'fishing_basics', 10, 2, 100, 10);
    var listings = MM.getListings(r2.state, { sortBy: 'date' });
    assert.strictEqual(listings[0].scheduleTick, 100);
    assert.strictEqual(listings[1].scheduleTick, 500);
  });

  test('default sort is by teacher rating descending', function() {
    var t1 = uid('teacher'); var t2 = uid('teacher');
    var st = uid('student');
    // Complete two sessions, rate t1=5, t2=2
    var s = freshState();
    var r1 = MM.createListing(s, t1, 'trading_101', 10, 2, 500, 10);
    var rb1 = MM.bookSession(r1.state, r1.listing.id, st);
    var rs1 = MM.startSession(rb1.state, rb1.session.id, 500);
    var rc1 = MM.completeSession(rs1.state, rb1.session.id, 800);
    var rr1 = MM.rateSession(rc1.state, rb1.session.id, st, 5, '');
    var r2 = MM.createListing(rr1.state, t2, 'fishing_basics', 10, 2, 600, 10);
    var rb2 = MM.bookSession(r2.state, r2.listing.id, uid('student2'));
    var rs2 = MM.startSession(rb2.state, rb2.session.id, 600);
    var rc2 = MM.completeSession(rs2.state, rb2.session.id, 900);
    var rr2 = MM.rateSession(rc2.state, rb2.session.id, rb2.session.studentId, 2, '');
    // Now create open listings for t1 and t2
    var final1 = MM.createListing(rr2.state, t1, 'zone_lore', 10, 2, 1000, 15);
    var final2 = MM.createListing(final1.state, t2, 'zone_lore', 10, 2, 1100, 15);
    var listings = MM.getListings(final2.state, {});
    // t1 (rating=5) should appear before t2 (rating=2)
    var idx1 = listings.findIndex(function(l) { return l.teacherId === t1; });
    var idx2 = listings.findIndex(function(l) { return l.teacherId === t2; });
    assert(idx1 < idx2, 'Higher-rated teacher should appear first');
  });

  test('minRating filter excludes teachers with low average', function() {
    var t = uid('teacher'); var st = uid('student');
    var r = fullSession(freshState(), t, st, 'trading_101');
    var sessionId = r.state.sessions[0].id;
    var rr = MM.rateSession(r.state, sessionId, st, 1, 'Bad');
    // Create a new listing for t
    var rl = MM.createListing(rr.state, t, 'trading_101', 10, 2, 1000, 10);
    var listings = MM.getListings(rl.state, { minRating: 4 });
    assert(listings.every(function(l) { return l.teacherId !== t; }),
      'Teacher with low rating should be filtered out');
  });
});

// ─── getTeacherRank ────────────────────────────────────────────────────────────

suite('getTeacherRank', function() {

  test('"New Teacher" for score 0 (0 sessions, any rating)', function() {
    assert.strictEqual(MM.getTeacherRank(0, 5), 'New Teacher');
  });

  test('"New Teacher" for score < 10', function() {
    // 2 sessions * 4 rating = 8 < 10
    assert.strictEqual(MM.getTeacherRank(2, 4), 'New Teacher');
  });

  test('"Instructor" for score exactly 10', function() {
    // 2 sessions * 5 = 10
    assert.strictEqual(MM.getTeacherRank(2, 5), 'Instructor');
  });

  test('"Instructor" for score in [10, 29]', function() {
    // 5 sessions * 3 = 15
    assert.strictEqual(MM.getTeacherRank(5, 3), 'Instructor');
  });

  test('"Professor" for score exactly 30', function() {
    // 6 sessions * 5 = 30
    assert.strictEqual(MM.getTeacherRank(6, 5), 'Professor');
  });

  test('"Professor" for score in [30, 59]', function() {
    // 10 sessions * 4 = 40
    assert.strictEqual(MM.getTeacherRank(10, 4), 'Professor');
  });

  test('"Master Teacher" for score exactly 60', function() {
    // 12 sessions * 5 = 60
    assert.strictEqual(MM.getTeacherRank(12, 5), 'Master Teacher');
  });

  test('"Master Teacher" for score in [60, 99]', function() {
    // 20 sessions * 4 = 80
    assert.strictEqual(MM.getTeacherRank(20, 4), 'Master Teacher');
  });

  test('"Grand Mentor" for score exactly 100', function() {
    // 20 sessions * 5 = 100
    assert.strictEqual(MM.getTeacherRank(20, 5), 'Grand Mentor');
  });

  test('"Grand Mentor" for score > 100', function() {
    assert.strictEqual(MM.getTeacherRank(100, 5), 'Grand Mentor');
  });

  test('handles 0 sessions gracefully', function() {
    assert.strictEqual(MM.getTeacherRank(0, 0), 'New Teacher');
  });

  test('handles negative sessions gracefully', function() {
    // Negative treated as 0 → New Teacher
    assert.strictEqual(MM.getTeacherRank(-5, 5), 'New Teacher');
  });
});

// ─── getTeacherProfile ────────────────────────────────────────────────────────

suite('getTeacherProfile', function() {

  test('returns correct profile after sessions', function() {
    var t = uid('teacher'); var st = uid('student');
    var r = fullSession(freshState(), t, st, 'trading_101');
    var sessionId = r.state.sessions[0].id;
    var rr = MM.rateSession(r.state, sessionId, st, 5, '');
    var profile = MM.getTeacherProfile(rr.state, t);
    assert.strictEqual(profile.totalSessions, 1);
    assert.strictEqual(profile.averageRating, 5);
    assert(profile.rank !== undefined, 'profile should have rank');
    assert(profile.subjects['trading_101'] !== undefined, 'subject count should exist');
  });

  test('profile with no sessions returns defaults', function() {
    var s = freshState();
    var profile = MM.getTeacherProfile(s, 'nobody');
    assert.strictEqual(profile.totalSessions, 0);
    assert.strictEqual(profile.averageRating, 0);
    assert.strictEqual(profile.totalEarned, 0);
    assert.strictEqual(profile.rank, 'New Teacher');
  });

  test('totalEarned reflects session price', function() {
    var t = uid('teacher'); var st = uid('student');
    var s = freshState();
    var r1 = MM.createListing(s, t, 'trading_101', 40, 2, 500, 10);
    var r2 = MM.bookSession(r1.state, r1.listing.id, st);
    var r3 = MM.startSession(r2.state, r2.session.id, 500);
    var r4 = MM.completeSession(r3.state, r2.session.id, 800);
    var profile = MM.getTeacherProfile(r4.state, t);
    assert.strictEqual(profile.totalEarned, 40);
  });
});

// ─── getTopTeachers ───────────────────────────────────────────────────────────

suite('getTopTeachers', function() {

  test('returns empty array when no sessions', function() {
    var s = freshState();
    var top = MM.getTopTeachers(s, 5);
    assert(Array.isArray(top));
    assert.strictEqual(top.length, 0);
  });

  test('returns at most `limit` teachers', function() {
    var s = freshState();
    // Complete 5 sessions with 5 teachers
    for (var i = 0; i < 5; i++) {
      var t = uid('teacher'); var st = uid('student');
      var r = fullSession(s, t, st, 'trading_101');
      s = r.state;
    }
    var top3 = MM.getTopTeachers(s, 3);
    assert.strictEqual(top3.length, 3);
  });

  test('sorted by score (sessions * rating) descending', function() {
    var s = freshState();
    // t1: 1 session, rated 5 → score=5
    var t1 = uid('teacher'); var st1 = uid('student');
    var r1 = fullSession(s, t1, st1, 'trading_101');
    var rr1 = MM.rateSession(r1.state, r1.state.sessions[0].id, st1, 5, '');
    // t2: 1 session, rated 2 → score=2
    var t2 = uid('teacher'); var st2 = uid('student');
    var r2 = fullSession(rr1.state, t2, st2, 'fishing_basics');
    var sessionId2 = r2.state.sessions[r2.state.sessions.length - 1].id;
    var rr2 = MM.rateSession(r2.state, sessionId2, st2, 2, '');
    var top = MM.getTopTeachers(rr2.state, 10);
    assert.strictEqual(top[0].teacherId, t1, 't1 (score 5) should be first');
    assert.strictEqual(top[1].teacherId, t2, 't2 (score 2) should be second');
  });

  test('default limit is 10', function() {
    var s = freshState();
    for (var i = 0; i < 12; i++) {
      var t = uid('teacher'); var st = uid('student');
      var r = fullSession(s, t, st, 'trading_101');
      s = r.state;
    }
    var top = MM.getTopTeachers(s);
    assert.strictEqual(top.length, 10);
  });
});

// ─── getStudentHistory ────────────────────────────────────────────────────────

suite('getStudentHistory', function() {

  test('returns empty array for unknown student', function() {
    var s = freshState();
    var history = MM.getStudentHistory(s, 'nobody');
    assert(Array.isArray(history));
    assert.strictEqual(history.length, 0);
  });

  test('returns correct sessions for student', function() {
    var t = uid('teacher'); var st = uid('student');
    var r = fullSession(freshState(), t, st, 'trading_101');
    var history = MM.getStudentHistory(r.state, st);
    assert.strictEqual(history.length, 1);
    assert.strictEqual(history[0].session.studentId, st);
  });

  test('includes subjectName in history entry', function() {
    var t = uid('teacher'); var st = uid('student');
    var r = fullSession(freshState(), t, st, 'trading_101');
    var history = MM.getStudentHistory(r.state, st);
    assert.strictEqual(history[0].subjectName, 'Trading 101');
  });

  test('includes rating info after rating', function() {
    var t = uid('teacher'); var st = uid('student');
    var r = fullSession(freshState(), t, st, 'trading_101');
    var sessionId = r.state.sessions[0].id;
    var rr = MM.rateSession(r.state, sessionId, st, 4, 'Good');
    var history = MM.getStudentHistory(rr.state, st);
    assert(history[0].myRating !== null, 'should have myRating after rating');
    assert.strictEqual(history[0].myRating.rating, 4);
  });

  test('cancelled sessions are included (not filtered out)', function() {
    var s = freshState();
    var t = uid('teacher'); var st = uid('student');
    var r1 = MM.createListing(s, t, 'trading_101', 15, 2, 1000, 10);
    var r2 = MM.bookSession(r1.state, r1.listing.id, st);
    var r3 = MM.cancelBooking(r2.state, r2.session.id, st, 0);
    var history = MM.getStudentHistory(r3.state, st);
    assert.strictEqual(history.length, 1);
    assert.strictEqual(history[0].session.status, MM.SESSION_STATUS.CANCELLED);
  });

  test('does not include other students sessions', function() {
    var t = uid('teacher'); var st1 = uid('s'); var st2 = uid('s');
    var s = freshState();
    var r1 = MM.createListing(s, t, 'trading_101', 15, 5, 500, 10);
    var r2 = MM.bookSession(r1.state, r1.listing.id, st1);
    var r3 = MM.bookSession(r2.state, r1.listing.id, st2);
    var history1 = MM.getStudentHistory(r3.state, st1);
    var history2 = MM.getStudentHistory(r3.state, st2);
    assert.strictEqual(history1.length, 1);
    assert.strictEqual(history2.length, 1);
    assert.strictEqual(history1[0].session.studentId, st1);
    assert.strictEqual(history2[0].session.studentId, st2);
  });
});

// ─── Formatting ───────────────────────────────────────────────────────────────

suite('formatRatingStars', function() {

  test('0 stars returns [-----]', function() {
    assert.strictEqual(MM.formatRatingStars(0), '[-----]');
  });

  test('5 stars returns [*****]', function() {
    assert.strictEqual(MM.formatRatingStars(5), '[*****]');
  });

  test('3 stars returns [***--]', function() {
    assert.strictEqual(MM.formatRatingStars(3), '[***--]');
  });

  test('1 star returns [*----]', function() {
    assert.strictEqual(MM.formatRatingStars(1), '[*----]');
  });

  test('fractional rounds to nearest', function() {
    // 3.7 → rounds to 4 → [****-]
    assert.strictEqual(MM.formatRatingStars(3.7), '[****-]');
    // 3.4 → rounds to 3 → [***--]
    assert.strictEqual(MM.formatRatingStars(3.4), '[***--]');
  });

  test('always returns 7-char string [XXXXX]', function() {
    for (var i = 0; i <= 5; i++) {
      var s = MM.formatRatingStars(i);
      assert.strictEqual(s.length, 7, 'Star string should be 7 chars for rating ' + i);
    }
  });
});

suite('formatListingCard', function() {

  test('returns HTML string', function() {
    var s = freshState();
    var r = MM.createListing(s, 'alice', 'trading_101', 10, 2, 100, 10);
    var html = MM.formatListingCard(r.listing, { average: 4.5, count: 10 });
    assert(typeof html === 'string', 'should return string');
    assert(html.indexOf('<div') !== -1, 'should contain div');
  });

  test('contains listing id', function() {
    var s = freshState();
    var r = MM.createListing(s, 'alice', 'trading_101', 10, 2, 100, 10);
    var html = MM.formatListingCard(r.listing, { average: 3, count: 1 });
    assert(html.indexOf('data-listing-id="' + r.listing.id + '"') !== -1);
  });

  test('contains subject name', function() {
    var s = freshState();
    var r = MM.createListing(s, 'alice', 'trading_101', 10, 2, 100, 10);
    var html = MM.formatListingCard(r.listing, { average: 0, count: 0 });
    assert(html.indexOf('Trading 101') !== -1);
  });

  test('shows "No ratings yet" when count is 0', function() {
    var s = freshState();
    var r = MM.createListing(s, 'alice', 'trading_101', 10, 2, 100, 10);
    var html = MM.formatListingCard(r.listing, { average: 0, count: 0 });
    assert(html.indexOf('No ratings yet') !== -1);
  });

  test('handles null listing gracefully', function() {
    var html = MM.formatListingCard(null, {});
    assert(typeof html === 'string');
    assert(html.indexOf('empty') !== -1 || html.indexOf('No listing') !== -1);
  });
});

suite('formatSessionCard', function() {

  test('returns HTML string', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 15, 2, 500, 10);
    var r2 = MM.bookSession(r1.state, r1.listing.id, 'bob');
    var html = MM.formatSessionCard(r2.session);
    assert(typeof html === 'string');
    assert(html.indexOf('<div') !== -1);
  });

  test('contains session id', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 15, 2, 500, 10);
    var r2 = MM.bookSession(r1.state, r1.listing.id, 'bob');
    var html = MM.formatSessionCard(r2.session);
    assert(html.indexOf('data-session-id="' + r2.session.id + '"') !== -1);
  });

  test('contains student and teacher IDs', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 15, 2, 500, 10);
    var r2 = MM.bookSession(r1.state, r1.listing.id, 'bob');
    var html = MM.formatSessionCard(r2.session);
    assert(html.indexOf('alice') !== -1, 'should contain teacherId');
    assert(html.indexOf('bob') !== -1, 'should contain studentId');
  });

  test('handles null session gracefully', function() {
    var html = MM.formatSessionCard(null);
    assert(typeof html === 'string');
    assert(html.indexOf('empty') !== -1 || html.indexOf('No session') !== -1);
  });
});

suite('formatTeacherProfile', function() {

  test('returns HTML string', function() {
    var t = uid('teacher'); var st = uid('student');
    var r = fullSession(freshState(), t, st, 'trading_101');
    var profile = MM.getTeacherProfile(r.state, t);
    var html = MM.formatTeacherProfile(profile);
    assert(typeof html === 'string');
    assert(html.indexOf('<div') !== -1);
  });

  test('contains teacher ID', function() {
    var t = uid('teacher'); var st = uid('student');
    var r = fullSession(freshState(), t, st, 'trading_101');
    var profile = MM.getTeacherProfile(r.state, t);
    var html = MM.formatTeacherProfile(profile);
    assert(html.indexOf(t) !== -1);
  });

  test('contains rank label', function() {
    var t = uid('teacher'); var st = uid('student');
    var r = fullSession(freshState(), t, st, 'trading_101');
    var profile = MM.getTeacherProfile(r.state, t);
    var html = MM.formatTeacherProfile(profile);
    assert(html.indexOf(profile.rank) !== -1);
  });

  test('handles null profile gracefully', function() {
    var html = MM.formatTeacherProfile(null);
    assert(typeof html === 'string');
    assert(html.indexOf('empty') !== -1 || html.indexOf('No profile') !== -1);
  });

  test('shows "No sessions taught yet" for new teacher', function() {
    var s = freshState();
    var profile = MM.getTeacherProfile(s, 'nobody');
    var html = MM.formatTeacherProfile(profile);
    assert(html.indexOf('No sessions') !== -1);
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

suite('Edge cases', function() {

  test('booking cancelled session after listing is cancelled: sessions are also cancelled', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 15, 3, 1000, 10);
    var r2 = MM.bookSession(r1.state, r1.listing.id, 'bob');
    var r3 = MM.cancelListing(r2.state, r1.listing.id, 'alice');
    // Bob's session should be cancelled
    assert.strictEqual(r3.state.sessions[0].status, MM.SESSION_STATUS.CANCELLED);
  });

  test('cannot self-teach: teacher cannot be student in their own listing', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 15, 3, 100, 10);
    var r2 = MM.bookSession(r1.state, r1.listing.id, 'alice');
    assert(!r2.success);
  });

  test('rate before session completes fails', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 15, 2, 500, 10);
    var r2 = MM.bookSession(r1.state, r1.listing.id, 'bob');
    var r3 = MM.startSession(r2.state, r2.session.id, 500);
    var r4 = MM.rateSession(r3.state, r2.session.id, 'bob', 5, '');
    assert(!r4.success);
    assert(r4.message.indexOf('completed') !== -1);
  });

  test('multiple sessions complete independently', function() {
    var t = uid('teacher'); var st1 = uid('s'); var st2 = uid('s');
    var s = freshState();
    var r1 = MM.createListing(s, t, 'trading_101', 15, 5, 500, 10);
    var rb1 = MM.bookSession(r1.state, r1.listing.id, st1);
    var rb2 = MM.bookSession(rb1.state, r1.listing.id, st2);
    var rs1 = MM.startSession(rb2.state, rb1.session.id, 500);
    var rs2 = MM.startSession(rs1.state, rb2.session.id, 500);
    var rc1 = MM.completeSession(rs2.state, rb1.session.id, 800);
    var rc2 = MM.completeSession(rc1.state, rb2.session.id, 800);
    assert(rc2.success);
    assert.strictEqual(rc2.state.teacherStats[t].totalSessions, 2);
    assert.strictEqual(rc2.state.teacherStats[t].totalEarned, 30);
  });

  test('teacher accumulates stats across multiple subjects', function() {
    var t = uid('teacher'); var st = uid('student');
    var s = freshState();
    var r1 = fullSession(s, t, st, 'trading_101');
    var st2 = uid('student');
    var r2 = fullSession(r1.state, t, st2, 'fishing_basics');
    var profile = MM.getTeacherProfile(r2.state, t);
    assert.strictEqual(profile.totalSessions, 2);
    assert(profile.subjects['trading_101'] === 1, 'trading_101 should have 1 session');
    assert(profile.subjects['fishing_basics'] === 1, 'fishing_basics should have 1 session');
  });

  test('price 0 listing: escrow is 0, teacher reward spark is 0', function() {
    var t = uid('teacher'); var st = uid('student');
    var s = freshState();
    var r1 = MM.createListing(s, t, 'trading_101', 0, 2, 500, 10);
    var r2 = MM.bookSession(r1.state, r1.listing.id, st);
    assert.strictEqual(r2.session.escrow, 0);
    var r3 = MM.startSession(r2.state, r2.session.id, 500);
    var r4 = MM.completeSession(r3.state, r2.session.id, 800);
    assert.strictEqual(r4.teacherReward.spark, 0);
  });

  test('listing with maxStudents=1 becomes full after one booking', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 10, 1, 100, 10);
    var r2 = MM.bookSession(r1.state, r1.listing.id, 'bob');
    assert.strictEqual(r2.state.listings[0].status, MM.LISTING_STATUS.FULL);
  });

  test('teacher rank updates as sessions increase', function() {
    // Build up enough sessions for Grand Mentor (score >= 100)
    var t = uid('teacher');
    var s = freshState();
    for (var i = 0; i < 20; i++) {
      var st = uid('student');
      var r = fullSession(s, t, st, 'trading_101');
      s = r.state;
      // Rate each session 5 stars
      var sessionId = r.state.sessions[r.state.sessions.length - 1].id;
      var rr = MM.rateSession(s, sessionId, st, 5, '');
      s = rr.state;
    }
    var profile = MM.getTeacherProfile(s, t);
    assert.strictEqual(profile.rank, 'Grand Mentor');
  });

  test('getListings returns full listings (not cancelled)', function() {
    var s = freshState();
    var r1 = MM.createListing(s, 'alice', 'trading_101', 10, 1, 100, 10);
    var r2 = MM.bookSession(r1.state, r1.listing.id, 'bob');
    // Listing is now FULL
    var listings = MM.getListings(r2.state, {});
    assert.strictEqual(listings.length, 1, 'full listings should still appear');
    assert.strictEqual(listings[0].status, MM.LISTING_STATUS.FULL);
  });
});

// ─── Run and exit ─────────────────────────────────────────────────────────────

var ok = report();
process.exit(ok ? 0 : 1);
