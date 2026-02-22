/**
 * Tests for src/js/living_calendar.js
 * Run with: node tests/test_living_calendar.js
 */

'use strict';

var LC = require('../src/js/living_calendar');

var passed = 0;
var failed = 0;
var total = 0;

function assert(condition, msg) {
  total++;
  if (condition) {
    passed++;
    console.log('  ok - ' + msg);
  } else {
    failed++;
    console.error('  FAIL - ' + msg);
  }
}

function section(title) {
  console.log('\n--- ' + title + ' ---');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

var NOW = 1700000000;  // arbitrary fixed timestamp for tests

function makeState() {
  return LC.createCalendarState();
}

/**
 * Schedule a minimal valid event at nowTs + offset seconds.
 */
function scheduleBasic(state, opts) {
  var o = opts || {};
  return LC.scheduleEvent(state, {
    title:    o.title    || 'Test Event',
    category: o.category || 'community',
    startAt:  o.startAt  !== undefined ? o.startAt : NOW + 3600,
    endAt:    o.endAt    !== undefined ? o.endAt   : NOW + 7200,
    location: o.location || 'nexus',
    zone:     o.zone     || 'nexus',
    host:     o.host     || 'admin',
    capacity: o.capacity !== undefined ? o.capacity : 0,
    recurrence: o.recurrence || 'none',
    tags:     o.tags     || [],
    description: o.description || ''
  });
}

// ---------------------------------------------------------------------------
// SECTION 1: createCalendarState
// ---------------------------------------------------------------------------
section('createCalendarState');

var fresh = LC.createCalendarState();
assert(typeof fresh === 'object', 'createCalendarState returns an object');
assert(typeof fresh.events === 'object', 'state has events map');
assert(typeof fresh.subscriptions === 'object', 'state has subscriptions map');
assert(typeof fresh.rsvps === 'object', 'state has rsvps map');
assert(typeof fresh.attendance === 'object', 'state has attendance map');
assert(typeof fresh.notifications === 'object', 'state has notifications map');
assert(typeof fresh.history === 'object', 'state has history map');
assert(typeof fresh.recurringTemplates === 'object', 'state has recurringTemplates map');
assert(fresh.nextEventId === 1, 'nextEventId starts at 1');
assert(fresh.nextTemplateId === 1, 'nextTemplateId starts at 1');
assert(Object.keys(fresh.events).length === 0, 'events map is empty on init');
assert(Object.keys(fresh.subscriptions).length === 0, 'subscriptions empty on init');

// ---------------------------------------------------------------------------
// SECTION 2: Exported Constants
// ---------------------------------------------------------------------------
section('Exported Constants');

assert(Array.isArray(LC.VALID_CATEGORIES), 'VALID_CATEGORIES is an array');
assert(LC.VALID_CATEGORIES.length === 9, 'VALID_CATEGORIES has 9 entries');
assert(LC.VALID_CATEGORIES.indexOf('tournament') !== -1, 'tournament is a valid category');
assert(LC.VALID_CATEGORIES.indexOf('festival') !== -1, 'festival is valid');
assert(LC.VALID_CATEGORIES.indexOf('guild_war') !== -1, 'guild_war is valid');
assert(LC.VALID_CATEGORIES.indexOf('auction') !== -1, 'auction is valid');
assert(LC.VALID_CATEGORIES.indexOf('election') !== -1, 'election is valid');
assert(LC.VALID_CATEGORIES.indexOf('raid') !== -1, 'raid is valid');
assert(LC.VALID_CATEGORIES.indexOf('concert') !== -1, 'concert is valid');
assert(LC.VALID_CATEGORIES.indexOf('community') !== -1, 'community is valid');
assert(LC.VALID_CATEGORIES.indexOf('custom') !== -1, 'custom is valid');

assert(Array.isArray(LC.VALID_RECURRENCE), 'VALID_RECURRENCE is an array');
assert(LC.VALID_RECURRENCE.indexOf('none') !== -1, 'none recurrence is valid');
assert(LC.VALID_RECURRENCE.indexOf('daily') !== -1, 'daily recurrence is valid');
assert(LC.VALID_RECURRENCE.indexOf('weekly') !== -1, 'weekly recurrence is valid');
assert(LC.VALID_RECURRENCE.indexOf('monthly') !== -1, 'monthly recurrence is valid');

assert(Array.isArray(LC.VALID_RSVP_STATUS), 'VALID_RSVP_STATUS is array');
assert(LC.VALID_RSVP_STATUS.indexOf('going') !== -1, 'going is valid RSVP status');
assert(LC.VALID_RSVP_STATUS.indexOf('maybe') !== -1, 'maybe is valid RSVP status');
assert(LC.VALID_RSVP_STATUS.indexOf('not_going') !== -1, 'not_going is valid RSVP status');

assert(typeof LC.SECONDS_PER_DAY === 'number' && LC.SECONDS_PER_DAY === 86400, 'SECONDS_PER_DAY = 86400');
assert(typeof LC.SECONDS_PER_WEEK === 'number' && LC.SECONDS_PER_WEEK === 604800, 'SECONDS_PER_WEEK = 604800');
assert(typeof LC.SECONDS_30_DAYS === 'number' && LC.SECONDS_30_DAYS === 30 * 86400, 'SECONDS_30_DAYS = 30 * 86400');

// ---------------------------------------------------------------------------
// SECTION 3: scheduleEvent — basic functionality
// ---------------------------------------------------------------------------
section('scheduleEvent — basic');

var s = makeState();
var r1 = scheduleBasic(s);
assert(r1.success === true, 'scheduleEvent succeeds with valid opts');
assert(r1.event !== null, 'scheduleEvent returns event object');
assert(typeof r1.event.id === 'string', 'event has string id');
assert(r1.event.id.length > 0, 'event id is not empty');
assert(r1.event.title === 'Test Event', 'event title stored correctly');
assert(r1.event.category === 'community', 'event category stored correctly');
assert(r1.event.startAt === NOW + 3600, 'event startAt correct');
assert(r1.event.endAt === NOW + 7200, 'event endAt correct');
assert(r1.event.duration === 3600, 'event duration calculated (endAt - startAt)');
assert(r1.event.status === 'scheduled', 'initial status is scheduled');
assert(r1.event.rsvpCount === 0, 'initial rsvpCount is 0');
assert(r1.event.attendanceCount === 0, 'initial attendanceCount is 0');
assert(r1.event.isPublic === true, 'default isPublic is true');
assert(typeof r1.reason === 'string', 'scheduleEvent returns reason string');

// Event appears in state
var fetched = LC.getEventById(s, r1.event.id);
assert(fetched !== null, 'getEventById retrieves scheduled event');
assert(fetched.id === r1.event.id, 'retrieved event id matches');

// Multiple events get unique IDs
var r2 = scheduleBasic(s, { title: 'Event 2' });
var r3 = scheduleBasic(s, { title: 'Event 3' });
assert(r1.event.id !== r2.event.id, 'first and second event have unique IDs');
assert(r2.event.id !== r3.event.id, 'second and third event have unique IDs');
assert(r1.event.id !== r3.event.id, 'first and third event have unique IDs');

// nextEventId increments
assert(s.nextEventId === 4, 'nextEventId incremented to 4 after 3 schedules');

// All categories work
var catState = makeState();
for (var ci = 0; ci < LC.VALID_CATEGORIES.length; ci++) {
  var cat = LC.VALID_CATEGORIES[ci];
  var catRes = scheduleBasic(catState, { category: cat, title: cat + ' event' });
  assert(catRes.success === true, 'scheduleEvent succeeds for category: ' + cat);
  assert(catRes.event.category === cat, 'event category stored as ' + cat);
}

// ---------------------------------------------------------------------------
// SECTION 4: scheduleEvent — validation
// ---------------------------------------------------------------------------
section('scheduleEvent — validation');

var vs = makeState();

// Missing opts
var vr1 = LC.scheduleEvent(vs, null);
assert(vr1.success === false, 'scheduleEvent fails with null opts');
assert(typeof vr1.reason === 'string', 'null opts: reason is string');

// Empty title
var vr2 = LC.scheduleEvent(vs, { title: '', category: 'community', startAt: NOW + 100, endAt: NOW + 200 });
assert(vr2.success === false, 'scheduleEvent fails with empty title');

// Missing title
var vr3 = LC.scheduleEvent(vs, { category: 'community', startAt: NOW + 100, endAt: NOW + 200 });
assert(vr3.success === false, 'scheduleEvent fails with undefined title');

// Invalid category
var vr4 = LC.scheduleEvent(vs, { title: 'T', category: 'invalid_cat', startAt: NOW + 100, endAt: NOW + 200 });
assert(vr4.success === false, 'scheduleEvent fails with invalid category');
assert(vr4.reason.toLowerCase().indexOf('invalid category') !== -1, 'invalid category error mentions category');

// Negative startAt
var vr5 = LC.scheduleEvent(vs, { title: 'T', category: 'raid', startAt: -1, endAt: NOW + 200 });
assert(vr5.success === false, 'scheduleEvent fails with negative startAt');

// endAt before startAt
var vr6 = LC.scheduleEvent(vs, { title: 'T', category: 'raid', startAt: NOW + 500, endAt: NOW + 100 });
assert(vr6.success === false, 'scheduleEvent fails when endAt < startAt');

// endAt equal to startAt
var vr7 = LC.scheduleEvent(vs, { title: 'T', category: 'raid', startAt: NOW + 500, endAt: NOW + 500 });
assert(vr7.success === false, 'scheduleEvent fails when endAt == startAt');

// Negative capacity
var vr8 = LC.scheduleEvent(vs, { title: 'T', category: 'raid', startAt: NOW + 100, endAt: NOW + 200, capacity: -5 });
assert(vr8.success === false, 'scheduleEvent fails with negative capacity');

// Invalid recurrence
var vr9 = LC.scheduleEvent(vs, { title: 'T', category: 'raid', startAt: NOW + 100, endAt: NOW + 200, recurrence: 'hourly' });
assert(vr9.success === false, 'scheduleEvent fails with invalid recurrence');

// Zero capacity allowed (unlimited)
var vr10 = LC.scheduleEvent(vs, { title: 'T', category: 'concert', startAt: NOW + 100, endAt: NOW + 200, capacity: 0 });
assert(vr10.success === true, 'scheduleEvent succeeds with capacity 0 (unlimited)');

// startAt = 0 is valid
var vr11 = LC.scheduleEvent(vs, { title: 'T', category: 'festival', startAt: 0, endAt: 100 });
assert(vr11.success === true, 'scheduleEvent succeeds with startAt=0');

// tags array stored
var vr12 = LC.scheduleEvent(vs, { title: 'Tagged', category: 'custom', startAt: NOW + 100, endAt: NOW + 200, tags: ['pvp', 'seasonal'] });
assert(vr12.success === true, 'scheduleEvent with tags succeeds');
assert(Array.isArray(vr12.event.tags), 'event tags is array');
assert(vr12.event.tags.indexOf('pvp') !== -1, 'pvp tag stored');
assert(vr12.event.tags.indexOf('seasonal') !== -1, 'seasonal tag stored');

// isPublic defaults
var vr13 = LC.scheduleEvent(vs, { title: 'Private', category: 'guild_war', startAt: NOW + 100, endAt: NOW + 200, isPublic: false });
assert(vr13.success === true, 'scheduleEvent with isPublic=false succeeds');
assert(vr13.event.isPublic === false, 'isPublic=false stored correctly');

// Whitespace-only title
var vr14 = LC.scheduleEvent(vs, { title: '   ', category: 'community', startAt: NOW + 100, endAt: NOW + 200 });
assert(vr14.success === false, 'scheduleEvent fails with whitespace-only title');

// ---------------------------------------------------------------------------
// SECTION 5: getEventById
// ---------------------------------------------------------------------------
section('getEventById');

var gbs = makeState();
var gbr = scheduleBasic(gbs, { title: 'Findable' });
var found = LC.getEventById(gbs, gbr.event.id);
assert(found !== null, 'getEventById finds existing event');
assert(found.title === 'Findable', 'getEventById returns correct event');

var notFound = LC.getEventById(gbs, 'ev_9999');
assert(notFound === null, 'getEventById returns null for unknown id');

var notFound2 = LC.getEventById(gbs, '');
assert(notFound2 === null, 'getEventById returns null for empty id');

// ---------------------------------------------------------------------------
// SECTION 6: cancelEvent
// ---------------------------------------------------------------------------
section('cancelEvent');

var cs = makeState();
var cr1 = scheduleBasic(cs, { title: 'To Cancel' });
var cancelRes = LC.cancelEvent(cs, cr1.event.id, NOW);
assert(cancelRes.success === true, 'cancelEvent succeeds on scheduled event');
assert(typeof cancelRes.reason === 'string', 'cancelEvent returns reason');

var cancelledEv = LC.getEventById(cs, cr1.event.id);
assert(cancelledEv.status === 'cancelled', 'cancelled event has status=cancelled');

// Cancel again fails
var cancelAgain = LC.cancelEvent(cs, cr1.event.id, NOW);
assert(cancelAgain.success === false, 'cannot cancel already cancelled event');

// Cancel non-existent
var cancelFake = LC.cancelEvent(cs, 'ev_9999', NOW);
assert(cancelFake.success === false, 'cancelEvent fails for non-existent event');

// Cancel completed event fails
var compState = makeState();
var compRes = scheduleBasic(compState);
LC.completeEvent(compState, compRes.event.id, NOW + 10000);
var cancelComp = LC.cancelEvent(compState, compRes.event.id, NOW + 10001);
assert(cancelComp.success === false, 'cannot cancel a completed event');

// ---------------------------------------------------------------------------
// SECTION 7: updateEvent
// ---------------------------------------------------------------------------
section('updateEvent');

var us = makeState();
var ur = scheduleBasic(us, { title: 'Original Title', capacity: 10 });
var evId = ur.event.id;

// Update title
var upd1 = LC.updateEvent(us, evId, { title: 'New Title' });
assert(upd1.success === true, 'updateEvent succeeds with valid title change');
assert(upd1.event.title === 'New Title', 'title updated correctly');

// Update capacity
var upd2 = LC.updateEvent(us, evId, { capacity: 50 });
assert(upd2.success === true, 'updateEvent succeeds with capacity change');
assert(upd2.event.capacity === 50, 'capacity updated correctly');

// Update location
var upd3 = LC.updateEvent(us, evId, { location: 'arena', zone: 'arena' });
assert(upd3.success === true, 'updateEvent succeeds with location change');
assert(upd3.event.location === 'arena', 'location updated correctly');
assert(upd3.event.zone === 'arena', 'zone updated correctly');

// Update time window
var upd4 = LC.updateEvent(us, evId, { startAt: NOW + 7200, endAt: NOW + 14400 });
assert(upd4.success === true, 'updateEvent succeeds with time change');
assert(upd4.event.duration === 7200, 'duration recalculated after time update');

// Invalid category update
var upd5 = LC.updateEvent(us, evId, { category: 'invalid_xyz' });
assert(upd5.success === false, 'updateEvent fails with invalid category');

// endAt before startAt update
var upd6 = LC.updateEvent(us, evId, { startAt: NOW + 5000, endAt: NOW + 1000 });
assert(upd6.success === false, 'updateEvent fails when new endAt < new startAt');

// Update non-existent event
var upd7 = LC.updateEvent(us, 'ev_fake', { title: 'X' });
assert(upd7.success === false, 'updateEvent fails for non-existent event');

// Cannot update cancelled event
var cancelState2 = makeState();
var cRes2 = scheduleBasic(cancelState2);
LC.cancelEvent(cancelState2, cRes2.event.id, NOW);
var upd8 = LC.updateEvent(cancelState2, cRes2.event.id, { title: 'New' });
assert(upd8.success === false, 'cannot update cancelled event');

// Cannot update completed event
var compState2 = makeState();
var cRes3 = scheduleBasic(compState2);
LC.completeEvent(compState2, cRes3.event.id, NOW + 99999);
var upd9 = LC.updateEvent(compState2, cRes3.event.id, { title: 'New' });
assert(upd9.success === false, 'cannot update completed event');

// Null updates
var upd10 = LC.updateEvent(us, evId, null);
assert(upd10.success === false, 'updateEvent fails with null updates');

// ---------------------------------------------------------------------------
// SECTION 8: 30-Day Calendar Window
// ---------------------------------------------------------------------------
section('30-Day Calendar Window');

var w30s = makeState();
// Event inside 30-day window
scheduleBasic(w30s, { title: 'In Window', startAt: NOW + 100, endAt: NOW + 200 });
// Event at exact 30-day boundary
scheduleBasic(w30s, { title: 'At Boundary', startAt: NOW + LC.SECONDS_30_DAYS, endAt: NOW + LC.SECONDS_30_DAYS + 3600 });
// Event beyond 30 days
scheduleBasic(w30s, { title: 'Beyond Window', startAt: NOW + LC.SECONDS_30_DAYS + 1, endAt: NOW + LC.SECONDS_30_DAYS + 3601 });
// Currently active event (started before now, ends after now)
scheduleBasic(w30s, { title: 'Currently Active', startAt: NOW - 3600, endAt: NOW + 3600 });

var window30 = LC.getThirtyDayCalendar(w30s, NOW);
assert(Array.isArray(window30), 'getThirtyDayCalendar returns array');
// Should include: In Window, At Boundary, Currently Active (3 events)
// Beyond Window (startAt = NOW + SECONDS_30_DAYS + 1) is excluded
assert(window30.length === 3, 'getThirtyDayCalendar returns 3 events (got ' + window30.length + ')');

// Sorted by startAt
if (window30.length >= 2) {
  assert(window30[0].startAt <= window30[1].startAt, 'getThirtyDayCalendar sorted by startAt');
}

// Cancelled events excluded
var cancelForWindow = makeState();
scheduleBasic(cancelForWindow, { title: 'Normal', startAt: NOW + 100, endAt: NOW + 200 });
var toCancel = scheduleBasic(cancelForWindow, { title: 'Cancelled', startAt: NOW + 300, endAt: NOW + 400 });
LC.cancelEvent(cancelForWindow, toCancel.event.id, NOW);
var w30WithCancel = LC.getThirtyDayCalendar(cancelForWindow, NOW);
assert(w30WithCancel.length === 1, 'getThirtyDayCalendar excludes cancelled events');

// ---------------------------------------------------------------------------
// SECTION 9: getEventsInRange
// ---------------------------------------------------------------------------
section('getEventsInRange');

var rs = makeState();
scheduleBasic(rs, { title: 'E1', startAt: NOW + 100, endAt: NOW + 200 });
scheduleBasic(rs, { title: 'E2', startAt: NOW + 300, endAt: NOW + 400 });
scheduleBasic(rs, { title: 'E3', startAt: NOW + 600, endAt: NOW + 700 });
scheduleBasic(rs, { title: 'E4', category: 'raid', startAt: NOW + 500, endAt: NOW + 600, zone: 'wilds', host: 'guildmaster' });

// Basic range
var range1 = LC.getEventsInRange(rs, NOW, NOW + 400);
assert(range1.length === 2, 'getEventsInRange returns 2 events in [NOW, NOW+400]');

// Category filter
var range2 = LC.getEventsInRange(rs, NOW, NOW + 1000, { category: 'raid' });
assert(range2.length === 1, 'getEventsInRange category filter: 1 raid event');
assert(range2[0].title === 'E4', 'correct raid event found');

// Zone filter
var range3 = LC.getEventsInRange(rs, NOW, NOW + 1000, { zone: 'wilds' });
assert(range3.length === 1, 'getEventsInRange zone filter: 1 wilds event');

// Host filter
var range4 = LC.getEventsInRange(rs, NOW, NOW + 1000, { host: 'guildmaster' });
assert(range4.length === 1, 'getEventsInRange host filter: 1 guildmaster event');

// Status filter
var range5 = LC.getEventsInRange(rs, NOW, NOW + 1000, { status: 'scheduled' });
assert(range5.length === 4, 'getEventsInRange status=scheduled: all 4 events');

// Empty range
var range6 = LC.getEventsInRange(rs, NOW + 5000, NOW + 6000);
assert(range6.length === 0, 'getEventsInRange returns [] for empty range');

// Results sorted
var range7 = LC.getEventsInRange(rs, NOW, NOW + 1000);
assert(range7[0].startAt <= range7[1].startAt, 'getEventsInRange sorted by startAt');

// ---------------------------------------------------------------------------
// SECTION 10: getTodaysEvents / getWeeksEvents
// ---------------------------------------------------------------------------
section('getTodaysEvents / getWeeksEvents');

var ts2 = makeState();
scheduleBasic(ts2, { title: 'Today1', startAt: NOW + 1000, endAt: NOW + 2000 });
scheduleBasic(ts2, { title: 'Today2', startAt: NOW + 50000, endAt: NOW + 51000 });          // ~14h from now
scheduleBasic(ts2, { title: 'Tomorrow', startAt: NOW + 90000, endAt: NOW + 91000 });         // ~25h from now
scheduleBasic(ts2, { title: 'NextWeek', startAt: NOW + 700000, endAt: NOW + 701000 });       // ~8 days

var today = LC.getTodaysEvents(ts2, NOW);
assert(today.length === 2, 'getTodaysEvents returns 2 events within 24h (got ' + today.length + ')');

var thisWeek = LC.getWeeksEvents(ts2, NOW);
assert(thisWeek.length === 3, 'getWeeksEvents returns 3 events within 7 days (got ' + thisWeek.length + ')');

// ---------------------------------------------------------------------------
// SECTION 11: subscribeToCategory
// ---------------------------------------------------------------------------
section('subscribeToCategory');

var subS = makeState();
var sub1 = LC.subscribeToCategory(subS, 'alice', 'tournament');
assert(sub1.success === true, 'subscribeToCategory succeeds');
assert(typeof sub1.reason === 'string', 'subscribeToCategory returns reason');

var sub2 = LC.subscribeToCategory(subS, 'alice', 'festival');
assert(sub2.success === true, 'alice subscribes to festival');

// Invalid category
var sub3 = LC.subscribeToCategory(subS, 'alice', 'invalid_xyz');
assert(sub3.success === false, 'subscribeToCategory fails with invalid category');

// Empty playerId
var sub4 = LC.subscribeToCategory(subS, '', 'tournament');
assert(sub4.success === false, 'subscribeToCategory fails with empty playerId');

// Get subscriptions
var subs = LC.getSubscriptions(subS, 'alice');
assert(Array.isArray(subs.categories), 'getSubscriptions.categories is array');
assert(subs.categories.indexOf('tournament') !== -1, 'tournament in alice categories');
assert(subs.categories.indexOf('festival') !== -1, 'festival in alice categories');
assert(subs.categories.length === 2, 'alice has 2 subscribed categories');

// Player with no subscriptions
var emptySubs = LC.getSubscriptions(subS, 'unknown_player');
assert(emptySubs.categories.length === 0, 'unknown player has no category subscriptions');
assert(emptySubs.eventIds.length === 0, 'unknown player has no event subscriptions');

// Idempotent subscribe (subscribing twice should not duplicate)
LC.subscribeToCategory(subS, 'alice', 'tournament');
var subs2 = LC.getSubscriptions(subS, 'alice');
assert(subs2.categories.length === 2, 'subscribing to same category twice stays at 2');

// Multiple players
LC.subscribeToCategory(subS, 'bob', 'tournament');
LC.subscribeToCategory(subS, 'carol', 'tournament');
var tournamentSubs = LC.getCategorySubscribers(subS, 'tournament');
assert(Array.isArray(tournamentSubs), 'getCategorySubscribers returns array');
assert(tournamentSubs.indexOf('alice') !== -1, 'alice in tournament subscribers');
assert(tournamentSubs.indexOf('bob') !== -1, 'bob in tournament subscribers');
assert(tournamentSubs.indexOf('carol') !== -1, 'carol in tournament subscribers');
assert(tournamentSubs.length === 3, 'tournament has 3 subscribers');

// Empty category subscribers
var raidSubs = LC.getCategorySubscribers(subS, 'raid');
assert(raidSubs.length === 0, 'raid has 0 subscribers initially');

// ---------------------------------------------------------------------------
// SECTION 12: unsubscribeFromCategory
// ---------------------------------------------------------------------------
section('unsubscribeFromCategory');

var uns = makeState();
LC.subscribeToCategory(uns, 'alice', 'tournament');
LC.subscribeToCategory(uns, 'alice', 'raid');

var unsub1 = LC.unsubscribeFromCategory(uns, 'alice', 'tournament');
assert(unsub1.success === true, 'unsubscribeFromCategory succeeds');
var unsubSubs = LC.getSubscriptions(uns, 'alice');
assert(unsubSubs.categories.indexOf('tournament') === -1, 'tournament removed from subscriptions');
assert(unsubSubs.categories.indexOf('raid') !== -1, 'raid still subscribed');

// Unsubscribe from non-subscribed category
var unsub2 = LC.unsubscribeFromCategory(uns, 'alice', 'festival');
assert(unsub2.success === false, 'unsubscribeFromCategory fails for non-subscribed category');

// Unsubscribe for player with no subscriptions at all
var unsub3 = LC.unsubscribeFromCategory(uns, 'unknown_player', 'raid');
assert(unsub3.success === false, 'unsubscribeFromCategory fails for unknown player');

// ---------------------------------------------------------------------------
// SECTION 13: subscribeToEvent / unsubscribeFromEvent
// ---------------------------------------------------------------------------
section('subscribeToEvent / unsubscribeFromEvent');

var evSubS = makeState();
var evSubR = scheduleBasic(evSubS, { title: 'Special Concert' });
var evSubId = evSubR.event.id;

var esub1 = LC.subscribeToEvent(evSubS, 'alice', evSubId);
assert(esub1.success === true, 'subscribeToEvent succeeds');

var esubSubs = LC.getSubscriptions(evSubS, 'alice');
assert(esubSubs.eventIds.indexOf(evSubId) !== -1, 'event id in alice subscriptions');

// Subscribe to non-existent event
var esub2 = LC.subscribeToEvent(evSubS, 'alice', 'ev_fake');
assert(esub2.success === false, 'subscribeToEvent fails for non-existent event');

// Empty playerId
var esub3 = LC.subscribeToEvent(evSubS, '', evSubId);
assert(esub3.success === false, 'subscribeToEvent fails with empty playerId');

// Unsubscribe from event
var eunsub1 = LC.unsubscribeFromEvent(evSubS, 'alice', evSubId);
assert(eunsub1.success === true, 'unsubscribeFromEvent succeeds');
var afterUnsub = LC.getSubscriptions(evSubS, 'alice');
assert(afterUnsub.eventIds.indexOf(evSubId) === -1, 'event id removed from subscriptions');

// Unsubscribe from non-subscribed event
var eunsub2 = LC.unsubscribeFromEvent(evSubS, 'alice', evSubId);
assert(eunsub2.success === false, 'unsubscribeFromEvent fails if not subscribed');

// ---------------------------------------------------------------------------
// SECTION 14: RSVP System
// ---------------------------------------------------------------------------
section('RSVP System');

var rs2 = makeState();
var rsvpEv = scheduleBasic(rs2, { title: 'Grand Festival', category: 'festival', capacity: 3 });
var rsvpId = rsvpEv.event.id;

// RSVP going
var rv1 = LC.rsvp(rs2, 'alice', rsvpId, 'going', NOW);
assert(rv1.success === true, 'RSVP going succeeds');
assert(rv1.rsvp.status === 'going', 'RSVP status is going');
assert(rv1.rsvp.playerId === 'alice', 'RSVP playerId is alice');
assert(typeof rv1.reason === 'string', 'RSVP returns reason');

// RSVP maybe
var rv2 = LC.rsvp(rs2, 'bob', rsvpId, 'maybe', NOW);
assert(rv2.success === true, 'RSVP maybe succeeds');

// RSVP not_going
var rv3 = LC.rsvp(rs2, 'carol', rsvpId, 'not_going', NOW);
assert(rv3.success === true, 'RSVP not_going succeeds');

// Get event RSVPs
var rsvps = LC.getEventRsvps(rs2, rsvpId);
assert(Array.isArray(rsvps.going), 'getEventRsvps.going is array');
assert(rsvps.going.indexOf('alice') !== -1, 'alice in going list');
assert(rsvps.maybe.indexOf('bob') !== -1, 'bob in maybe list');
assert(rsvps.not_going.indexOf('carol') !== -1, 'carol in not_going list');
assert(rsvps.total === 3, 'total RSVPs is 3');

// rsvpCount on event
var rsvpEvRefreshed = LC.getEventById(rs2, rsvpId);
assert(rsvpEvRefreshed.rsvpCount === 1, 'event rsvpCount tracks only going RSVPs');

// RSVP at capacity (capacity=3, 1 already going, add 2 more)
var rv4 = LC.rsvp(rs2, 'dave', rsvpId, 'going', NOW);
assert(rv4.success === true, 'second going RSVP succeeds (2/3 capacity)');
var rv5 = LC.rsvp(rs2, 'eve', rsvpId, 'going', NOW);
assert(rv5.success === true, 'third going RSVP succeeds (3/3 capacity)');
var rv6 = LC.rsvp(rs2, 'frank', rsvpId, 'going', NOW);
assert(rv6.success === false, 'fourth going RSVP fails at capacity (got ' + (rv6.success ? 'true' : 'false') + ')');
assert(rv6.reason.toLowerCase().indexOf('capacity') !== -1, 'capacity error mentions capacity');

// Changing existing RSVP doesn't double-count
var rv7 = LC.rsvp(rs2, 'alice', rsvpId, 'maybe', NOW);
assert(rv7.success === true, 'alice can change RSVP to maybe');
assert(rv7.rsvp.previousStatus === 'going', 'previousStatus recorded as going');
var rsvps2 = LC.getEventRsvps(rs2, rsvpId);
assert(rsvps2.going.indexOf('alice') === -1, 'alice no longer in going after change');
assert(rsvps2.maybe.indexOf('alice') !== -1, 'alice now in maybe after change');

// RSVP to invalid event
var rv8 = LC.rsvp(rs2, 'alice', 'ev_fake', 'going', NOW);
assert(rv8.success === false, 'RSVP fails for non-existent event');

// Invalid RSVP status
var rv9 = LC.rsvp(rs2, 'alice', rsvpId, 'confirmed', NOW);
assert(rv9.success === false, 'RSVP fails with invalid status');

// RSVP to cancelled event
var cancelledRsvp = makeState();
var cancelledEvR = scheduleBasic(cancelledRsvp);
LC.cancelEvent(cancelledRsvp, cancelledEvR.event.id, NOW);
var rv10 = LC.rsvp(cancelledRsvp, 'alice', cancelledEvR.event.id, 'going', NOW);
assert(rv10.success === false, 'RSVP fails for cancelled event');

// getPlayerRsvp
var myRsvp = LC.getPlayerRsvp(rs2, 'bob', rsvpId);
assert(myRsvp !== null, 'getPlayerRsvp returns RSVP for player');
assert(myRsvp.status === 'maybe', 'getPlayerRsvp returns correct status');

// getPlayerRsvp for non-participant
var noRsvp = LC.getPlayerRsvp(rs2, 'unknown_player', rsvpId);
assert(noRsvp === null, 'getPlayerRsvp returns null for non-participant');

// getPlayerRsvp for non-existent event
var noEvRsvp = LC.getPlayerRsvp(rs2, 'alice', 'ev_fake');
assert(noEvRsvp === null, 'getPlayerRsvp returns null for non-existent event');

// Empty playerId RSVP
var rv11 = LC.rsvp(rs2, '', rsvpId, 'going', NOW);
assert(rv11.success === false, 'RSVP fails with empty playerId');

// ---------------------------------------------------------------------------
// SECTION 15: getPlayerRsvps
// ---------------------------------------------------------------------------
section('getPlayerRsvps');

var prs = makeState();
var ev1 = scheduleBasic(prs, { title: 'Ev1', startAt: NOW + 1000, endAt: NOW + 2000 });
var ev2 = scheduleBasic(prs, { title: 'Ev2', startAt: NOW + 3000, endAt: NOW + 4000 });
var ev3 = scheduleBasic(prs, { title: 'Ev3', startAt: NOW + 5000, endAt: NOW + 6000 });

LC.rsvp(prs, 'alice', ev1.event.id, 'going', NOW);
LC.rsvp(prs, 'alice', ev2.event.id, 'maybe', NOW);
LC.rsvp(prs, 'alice', ev3.event.id, 'not_going', NOW);

var allRsvps = LC.getPlayerRsvps(prs, 'alice');
assert(Array.isArray(allRsvps), 'getPlayerRsvps returns array');
assert(allRsvps.length === 3, 'alice has 3 RSVPs (got ' + allRsvps.length + ')');

// Filter by status
var goingRsvps = LC.getPlayerRsvps(prs, 'alice', 'going');
assert(goingRsvps.length === 1, 'filtered to 1 going RSVP');
assert(goingRsvps[0].eventId === ev1.event.id, 'going RSVP is for ev1');

var maybeRsvps = LC.getPlayerRsvps(prs, 'alice', 'maybe');
assert(maybeRsvps.length === 1, 'filtered to 1 maybe RSVP');

// Player with no RSVPs
var noRsvpPlayer = LC.getPlayerRsvps(prs, 'frank');
assert(Array.isArray(noRsvpPlayer) && noRsvpPlayer.length === 0, 'player with no RSVPs returns empty array');

// Results sorted by event startAt
if (allRsvps.length >= 2) {
  assert(allRsvps[0].event.startAt <= allRsvps[1].event.startAt, 'getPlayerRsvps sorted by startAt');
}

// ---------------------------------------------------------------------------
// SECTION 16: Check-In / Attendance
// ---------------------------------------------------------------------------
section('Check-In / Attendance');

var attS = makeState();
// Event that has already started (startAt in past, endAt in future)
var attEv = scheduleBasic(attS, { title: 'Live Event', startAt: NOW - 3600, endAt: NOW + 3600 });
var attId = attEv.event.id;

// Start the event
LC.startEvent(attS, attId, NOW);

// Check in
var ci1 = LC.checkIn(attS, 'alice', attId, NOW);
assert(ci1.success === true, 'checkIn succeeds for active event');
assert(typeof ci1.reason === 'string', 'checkIn returns reason');

var ci2 = LC.checkIn(attS, 'bob', attId, NOW);
assert(ci2.success === true, 'bob checks in successfully');

// Duplicate check-in
var ci3 = LC.checkIn(attS, 'alice', attId, NOW);
assert(ci3.success === false, 'duplicate check-in fails');
assert(ci3.reason.toLowerCase().indexOf('already') !== -1, 'duplicate check-in reason mentions already');

// Get attendance
var att = LC.getAttendance(attS, attId);
assert(att.count === 2, 'attendance count is 2');
assert(Array.isArray(att.attendees), 'attendees is array');
var attPlayerIds = att.attendees.map(function(a) { return a.playerId; });
assert(attPlayerIds.indexOf('alice') !== -1, 'alice in attendees');
assert(attPlayerIds.indexOf('bob') !== -1, 'bob in attendees');

// Check-in for cancelled event
var cancelAttState = makeState();
var cancelAttEv = scheduleBasic(cancelAttState, { startAt: NOW - 100, endAt: NOW + 3600 });
LC.cancelEvent(cancelAttState, cancelAttEv.event.id, NOW);
var ci4 = LC.checkIn(cancelAttState, 'alice', cancelAttEv.event.id, NOW);
assert(ci4.success === false, 'checkIn fails for cancelled event');

// Check-in for non-existent event
var ci5 = LC.checkIn(attS, 'alice', 'ev_fake', NOW);
assert(ci5.success === false, 'checkIn fails for non-existent event');

// Check-in before event starts (more than 15 min early)
var futureAttState = makeState();
var futureAttEv = scheduleBasic(futureAttState, { startAt: NOW + 7200, endAt: NOW + 10800 });
var ci6 = LC.checkIn(futureAttState, 'alice', futureAttEv.event.id, NOW);
assert(ci6.success === false, 'checkIn fails if event has not started');

// Check-in within 15 min of start (allowed)
var earlyAttState = makeState();
var earlyAttEv = scheduleBasic(earlyAttState, { startAt: NOW + 600, endAt: NOW + 3600 });
var ci7 = LC.checkIn(earlyAttState, 'alice', earlyAttEv.event.id, NOW);
assert(ci7.success === true, 'checkIn allowed within 15 min of start');

// Check-in after event ended
var endedState = makeState();
var endedEv = scheduleBasic(endedState, { startAt: NOW - 7200, endAt: NOW - 3600 });
var ci8 = LC.checkIn(endedState, 'alice', endedEv.event.id, NOW);
assert(ci8.success === false, 'checkIn fails after event has ended');

// attendanceCount updated on event
var attEvRefreshed = LC.getEventById(attS, attId);
assert(attEvRefreshed.attendanceCount === 2, 'event attendanceCount reflects check-ins');

// Attendance for non-existent event
var noAtt = LC.getAttendance(attS, 'ev_fake');
assert(noAtt.count === 0, 'getAttendance for non-existent event returns count=0');
assert(noAtt.attendees.length === 0, 'getAttendance for non-existent event returns empty attendees');

// ---------------------------------------------------------------------------
// SECTION 17: startEvent / completeEvent lifecycle
// ---------------------------------------------------------------------------
section('startEvent / completeEvent lifecycle');

var lcS = makeState();
var lcEv = scheduleBasic(lcS, { title: 'Lifecycle Event', startAt: NOW + 100, endAt: NOW + 3700 });
var lcId = lcEv.event.id;

// Start event
var startRes = LC.startEvent(lcS, lcId, NOW + 100);
assert(startRes.success === true, 'startEvent succeeds');
var startedEv = LC.getEventById(lcS, lcId);
assert(startedEv.status === 'active', 'event status is active after startEvent');

// Cannot start already active event
var startAgain = LC.startEvent(lcS, lcId, NOW + 101);
assert(startAgain.success === false, 'startEvent fails for already active event');

// Cannot start non-existent event
var startFake = LC.startEvent(lcS, 'ev_fake', NOW);
assert(startFake.success === false, 'startEvent fails for non-existent event');

// Complete the event
var compRes2 = LC.completeEvent(lcS, lcId, NOW + 3700);
assert(compRes2.success === true, 'completeEvent succeeds');
assert(compRes2.historyEntry !== null, 'completeEvent returns historyEntry');
assert(compRes2.historyEntry.eventId === lcId, 'historyEntry has correct eventId');
assert(compRes2.historyEntry.title === 'Lifecycle Event', 'historyEntry has correct title');
var completedEv2 = LC.getEventById(lcS, lcId);
assert(completedEv2.status === 'completed', 'event status is completed');

// Complete again fails
var compAgain = LC.completeEvent(lcS, lcId, NOW + 5000);
assert(compAgain.success === false, 'completeEvent fails if called twice');

// Complete cancelled event fails
var compCancelState = makeState();
var compCancelEv = scheduleBasic(compCancelState);
LC.cancelEvent(compCancelState, compCancelEv.event.id, NOW);
var compCancelRes = LC.completeEvent(compCancelState, compCancelEv.event.id, NOW + 100);
assert(compCancelRes.success === false, 'completeEvent fails for cancelled event');

// Complete non-existent event
var compFake = LC.completeEvent(lcS, 'ev_fake', NOW);
assert(compFake.success === false, 'completeEvent fails for non-existent event');

// History entry includes attendance info
var hState = makeState();
var hEv = scheduleBasic(hState, { startAt: NOW - 3600, endAt: NOW + 3600 });
LC.startEvent(hState, hEv.event.id, NOW - 3600);
LC.checkIn(hState, 'alice', hEv.event.id, NOW);
LC.checkIn(hState, 'bob', hEv.event.id, NOW);
LC.rsvp(hState, 'alice', hEv.event.id, 'going', NOW - 7200);
LC.rsvp(hState, 'carol', hEv.event.id, 'going', NOW - 7200);
var hRes = LC.completeEvent(hState, hEv.event.id, NOW + 3600);
assert(hRes.historyEntry.actualAttendance === 2, 'historyEntry.actualAttendance = 2');
assert(hRes.historyEntry.rsvpGoing === 2, 'historyEntry.rsvpGoing = 2');

// ---------------------------------------------------------------------------
// SECTION 18: Event History
// ---------------------------------------------------------------------------
section('Event History');

var histS = makeState();
var hist1 = scheduleBasic(histS, { title: 'Ancient Tournament', category: 'tournament', startAt: NOW - 90000, endAt: NOW - 86400 });
var hist2 = scheduleBasic(histS, { title: 'Old Festival', category: 'festival', startAt: NOW - 40000, endAt: NOW - 36400 });
var hist3 = scheduleBasic(histS, { title: 'Recent Raid', category: 'raid', startAt: NOW - 10000, endAt: NOW - 6400 });

LC.completeEvent(histS, hist1.event.id, NOW - 86400);
LC.completeEvent(histS, hist2.event.id, NOW - 36400);
LC.completeEvent(histS, hist3.event.id, NOW - 6400);

var fullHistory = LC.getEventHistory(histS);
assert(Array.isArray(fullHistory), 'getEventHistory returns array');
assert(fullHistory.length === 3, 'getEventHistory has 3 entries');

// Sorted most-recent first
assert(fullHistory[0].completedAt >= fullHistory[1].completedAt, 'history sorted most-recent first');

// Category filter
var tHistory = LC.getEventHistory(histS, { category: 'tournament' });
assert(tHistory.length === 1, 'getEventHistory category filter: 1 tournament');
assert(tHistory[0].title === 'Ancient Tournament', 'correct tournament in history');

// Limit
var limited = LC.getEventHistory(histS, { limit: 2 });
assert(limited.length === 2, 'getEventHistory with limit=2 returns 2 entries');

// getEventHistoryEntry
var entry = LC.getEventHistoryEntry(histS, hist1.event.id);
assert(entry !== null, 'getEventHistoryEntry returns entry for completed event');
assert(entry.eventId === hist1.event.id, 'historyEntry eventId correct');
assert(entry.category === 'tournament', 'historyEntry category correct');

// getEventHistoryEntry for non-existent event
var noEntry = LC.getEventHistoryEntry(histS, 'ev_fake');
assert(noEntry === null, 'getEventHistoryEntry returns null for non-existent event');

// getEventHistoryEntry for scheduled (not completed) event
var notComplete = scheduleBasic(histS, { title: 'Still Upcoming' });
var noHist = LC.getEventHistoryEntry(histS, notComplete.event.id);
assert(noHist === null, 'getEventHistoryEntry returns null for non-completed event');

// ---------------------------------------------------------------------------
// SECTION 19: Recurring Templates
// ---------------------------------------------------------------------------
section('Recurring Templates');

var recS = makeState();

// Create daily template
var tmpl1 = LC.createRecurringTemplate(recS, {
  title: 'Daily Market',
  category: 'auction',
  recurrence: 'daily',
  duration: 3600,
  location: 'commons',
  zone: 'commons',
  host: 'market_ai',
  capacity: 100,
  tags: ['market', 'daily']
});
assert(tmpl1.success === true, 'createRecurringTemplate succeeds for daily');
assert(tmpl1.template !== null, 'template object returned');
assert(typeof tmpl1.template.id === 'string', 'template has string id');
assert(tmpl1.template.recurrence === 'daily', 'template recurrence is daily');
assert(tmpl1.template.active === true, 'template is active by default');
assert(tmpl1.template.lastSpawnedAt === null, 'lastSpawnedAt is null initially');
assert(Array.isArray(tmpl1.template.spawnedEvents), 'spawnedEvents is array');

// Create weekly template
var tmpl2 = LC.createRecurringTemplate(recS, {
  title: 'Weekly Tournament',
  category: 'tournament',
  recurrence: 'weekly',
  duration: 7200
});
assert(tmpl2.success === true, 'createRecurringTemplate succeeds for weekly');

// Create monthly template
var tmpl3 = LC.createRecurringTemplate(recS, {
  title: 'Monthly Election',
  category: 'election',
  recurrence: 'monthly',
  duration: 86400
});
assert(tmpl3.success === true, 'createRecurringTemplate succeeds for monthly');

// Validation failures
var tmplFail1 = LC.createRecurringTemplate(recS, {
  title: '', category: 'auction', recurrence: 'daily', duration: 3600
});
assert(tmplFail1.success === false, 'template fails with empty title');

var tmplFail2 = LC.createRecurringTemplate(recS, {
  title: 'X', category: 'invalid', recurrence: 'daily', duration: 3600
});
assert(tmplFail2.success === false, 'template fails with invalid category');

var tmplFail3 = LC.createRecurringTemplate(recS, {
  title: 'X', category: 'auction', recurrence: 'none', duration: 3600
});
assert(tmplFail3.success === false, 'template fails with recurrence=none');

var tmplFail4 = LC.createRecurringTemplate(recS, {
  title: 'X', category: 'auction', recurrence: 'daily', duration: 0
});
assert(tmplFail4.success === false, 'template fails with duration=0');

var tmplFail5 = LC.createRecurringTemplate(recS, {
  title: 'X', category: 'auction', recurrence: 'daily', duration: -100
});
assert(tmplFail5.success === false, 'template fails with negative duration');

// Unique template IDs
assert(tmpl1.template.id !== tmpl2.template.id, 'templates get unique IDs');
assert(tmpl2.template.id !== tmpl3.template.id, 'templates get unique IDs (2)');

// ---------------------------------------------------------------------------
// SECTION 20: spawnRecurringEvents
// ---------------------------------------------------------------------------
section('spawnRecurringEvents');

var spawnS = makeState();
var spawnTmpl = LC.createRecurringTemplate(spawnS, {
  title: 'Daily Auction',
  category: 'auction',
  recurrence: 'daily',
  duration: 3600
});
var spawnTid = spawnTmpl.template.id;

// Spawn for 3 days ahead
var spawnRes = LC.spawnRecurringEvents(spawnS, NOW, 3 * LC.SECONDS_PER_DAY);
assert(Array.isArray(spawnRes.spawned), 'spawnRecurringEvents returns spawned array');
assert(spawnRes.spawned.length === 3, 'spawned 3 events for 3 days (got ' + spawnRes.spawned.length + ')');

// Spawned events are in state
for (var si = 0; si < spawnRes.spawned.length; si++) {
  var spawnedEv = LC.getEventById(spawnS, spawnRes.spawned[si].id);
  assert(spawnedEv !== null, 'spawned event ' + si + ' is in state');
  assert(spawnedEv.templateId === spawnTid, 'spawned event links back to template');
}

// Template lastSpawnedAt updated
var tplAfter = spawnS.recurringTemplates[spawnTid];
assert(tplAfter.lastSpawnedAt !== null, 'lastSpawnedAt updated after spawn');
assert(tplAfter.spawnedEvents.length === 3, 'template tracks 3 spawned event IDs');

// Calling again does not re-spawn same events (cursor advanced)
var spawnRes2 = LC.spawnRecurringEvents(spawnS, NOW, 3 * LC.SECONDS_PER_DAY);
assert(spawnRes2.spawned.length === 0, 'second spawn call does not re-spawn same events');

// Spawn weekly template
var weeklySpawnS = makeState();
var wTmpl = LC.createRecurringTemplate(weeklySpawnS, {
  title: 'Weekly Concert',
  category: 'concert',
  recurrence: 'weekly',
  duration: 7200
});
var wSpawn = LC.spawnRecurringEvents(weeklySpawnS, NOW, 4 * LC.SECONDS_PER_WEEK);
assert(wSpawn.spawned.length === 4, 'weekly template spawns 4 events in 4 weeks (got ' + wSpawn.spawned.length + ')');

// Deactivate template — no future spawns
LC.deactivateTemplate(spawnS, spawnTid);
var tplDeact = spawnS.recurringTemplates[spawnTid];
assert(tplDeact.active === false, 'template deactivated');

// Spawn after deactivation spawns nothing new
var spawnAfterDeact = LC.spawnRecurringEvents(spawnS, NOW, 7 * LC.SECONDS_PER_DAY);
assert(spawnAfterDeact.spawned.length === 0, 'deactivated template spawns 0 events');

// Deactivate non-existent template
var deactFake = LC.deactivateTemplate(spawnS, 'tpl_999');
assert(deactFake.success === false, 'deactivateTemplate fails for unknown template');

// ---------------------------------------------------------------------------
// SECTION 21: Reminders / processReminders
// ---------------------------------------------------------------------------
section('processReminders');

var remS = makeState();
// Event starting in exactly 1h (reminder should fire)
var remEv1 = scheduleBasic(remS, { title: 'Event in 1h', startAt: NOW + 3600, endAt: NOW + 7200 });
// Event starting in exactly 15m (reminder should fire)
var remEv2 = scheduleBasic(remS, { title: 'Event in 15m', startAt: NOW + 900, endAt: NOW + 3700 });
// Event starting in 2h (no reminder yet)
var remEv3 = scheduleBasic(remS, { title: 'Event in 2h', startAt: NOW + 7200, endAt: NOW + 10800 });

// Subscribe alice to community
LC.subscribeToCategory(remS, 'alice', 'community');

// processReminders at NOW (1h before remEv1 and 15m before remEv2)
var remRes = LC.processReminders(remS, NOW);
assert(Array.isArray(remRes.reminders), 'processReminders returns reminders array');
assert(remRes.reminders.length === 2, 'processReminders emits 2 reminders (1h + 15m) (got ' + remRes.reminders.length + ')');

// Reminders have required fields
if (remRes.reminders.length > 0) {
  var rem = remRes.reminders[0];
  assert(typeof rem.eventId === 'string', 'reminder has eventId');
  assert(typeof rem.label === 'string', 'reminder has label');
  assert(typeof rem.message === 'string', 'reminder has message');
}

// Alice should have received notifications
var aliceNotes = LC.getNotifications(remS, 'alice');
assert(aliceNotes.length >= 2, 'alice received at least 2 reminder notifications');

// processReminders outside reminder window produces 0
var noRem = LC.processReminders(remS, NOW + 999999);
assert(noRem.reminders.length === 0, 'processReminders emits 0 outside window');

// ---------------------------------------------------------------------------
// SECTION 22: Notifications
// ---------------------------------------------------------------------------
section('Notifications');

var notifS = makeState();
LC.subscribeToCategory(notifS, 'alice', 'festival');
LC.subscribeToCategory(notifS, 'bob', 'festival');

// Schedule and cancel a festival — triggers notifications
var notifEv = LC.scheduleEvent(notifS, {
  title: 'Spring Festival',
  category: 'festival',
  startAt: NOW + 5000,
  endAt: NOW + 9000
});
LC.cancelEvent(notifS, notifEv.event.id, NOW);

// Both subscribers should have a notification
var aliceNotifs = LC.getNotifications(notifS, 'alice');
assert(Array.isArray(aliceNotifs), 'getNotifications returns array');
assert(aliceNotifs.length >= 1, 'alice has at least 1 notification');
assert(aliceNotifs[0].read === false, 'notification starts unread');
assert(typeof aliceNotifs[0].type === 'string', 'notification has type');
assert(typeof aliceNotifs[0].message === 'string', 'notification has message');
assert(typeof aliceNotifs[0].ts === 'number', 'notification has timestamp');

var bobNotifs = LC.getNotifications(notifS, 'bob');
assert(bobNotifs.length >= 1, 'bob has at least 1 notification');

// getNotifications unreadOnly
var unreadAlice = LC.getNotifications(notifS, 'alice', true);
assert(unreadAlice.length === aliceNotifs.length, 'unread count equals total (none read yet)');

// markNotificationsRead — all
var markRes = LC.markNotificationsRead(notifS, 'alice');
assert(markRes.markedCount >= 1, 'markNotificationsRead marks >= 1 notifications');
var afterMark = LC.getNotifications(notifS, 'alice', true);
assert(afterMark.length === 0, 'no unread notifications after marking all read');

// markNotificationsRead — specific indices
var notifS2 = makeState();
LC.subscribeToCategory(notifS2, 'alice', 'concert');
var c1 = LC.scheduleEvent(notifS2, { title: 'C1', category: 'concert', startAt: NOW + 100, endAt: NOW + 200 });
var c2 = LC.scheduleEvent(notifS2, { title: 'C2', category: 'concert', startAt: NOW + 300, endAt: NOW + 400 });
LC.cancelEvent(notifS2, c1.event.id, NOW);
LC.cancelEvent(notifS2, c2.event.id, NOW);
var alice2Notes = LC.getNotifications(notifS2, 'alice');
assert(alice2Notes.length === 2, 'alice has 2 notifications');
LC.markNotificationsRead(notifS2, 'alice', [0]);
var alice2Unread = LC.getNotifications(notifS2, 'alice', true);
assert(alice2Unread.length === 1, 'marking index 0 leaves 1 unread');

// markNotificationsRead for player with no notifications
var emptyMark = LC.markNotificationsRead(notifS, 'unknown_player');
assert(emptyMark.markedCount === 0, 'markNotificationsRead returns 0 for unknown player');

// broadcastToCategory
var broadS = makeState();
LC.subscribeToCategory(broadS, 'alice', 'community');
LC.subscribeToCategory(broadS, 'bob', 'community');
LC.subscribeToCategory(broadS, 'carol', 'concert');  // different category
var bcast = LC.broadcastToCategory(broadS, 'community', 'Community announcement!', NOW);
assert(bcast.sentTo === 2, 'broadcast sent to 2 community subscribers');
var aliceBroadcast = LC.getNotifications(broadS, 'alice');
assert(aliceBroadcast.length === 1, 'alice received 1 broadcast notification');
assert(aliceBroadcast[0].message === 'Community announcement!', 'broadcast message correct');
assert(aliceBroadcast[0].type === 'broadcast', 'broadcast type is broadcast');
var carolBroadcast = LC.getNotifications(broadS, 'carol');
assert(carolBroadcast.length === 0, 'carol (concert only) did not receive community broadcast');

// Notification eventId is null for broadcasts
assert(aliceBroadcast[0].eventId === null, 'broadcast notification has null eventId');

// ---------------------------------------------------------------------------
// SECTION 23: notifySubscribers — category + event subscriptions
// ---------------------------------------------------------------------------
section('Notifications: category + event subscriptions');

var nsubS = makeState();
LC.subscribeToCategory(nsubS, 'alice', 'raid');    // category subscriber
var nsubEv = scheduleBasic(nsubS, { title: 'Special Raid', category: 'raid' });
LC.subscribeToEvent(nsubS, 'bob', nsubEv.event.id);  // event-specific subscriber

LC.cancelEvent(nsubS, nsubEv.event.id, NOW);

// Both alice (cat) and bob (event) should be notified
var aliceNsub = LC.getNotifications(nsubS, 'alice');
var bobNsub = LC.getNotifications(nsubS, 'bob');
assert(aliceNsub.length >= 1, 'alice (category subscriber) notified on cancel');
assert(bobNsub.length >= 1, 'bob (event subscriber) notified on cancel');

// ---------------------------------------------------------------------------
// SECTION 24: Calendar Search
// ---------------------------------------------------------------------------
section('Calendar Search');

var searchS = makeState();
scheduleBasic(searchS, { title: 'Grand Auction', category: 'auction', zone: 'commons', host: 'market_ai', startAt: NOW + 1000, endAt: NOW + 2000, tags: ['weekly'] });
scheduleBasic(searchS, { title: 'Battle Royal Tournament', category: 'tournament', zone: 'arena', host: 'arena_ai', startAt: NOW + 3000, endAt: NOW + 4000, tags: ['pvp'] });
scheduleBasic(searchS, { title: 'Spring Festival', category: 'festival', zone: 'gardens', host: 'city', startAt: NOW + 5000, endAt: NOW + 8000, tags: ['seasonal', 'weekly'] });
scheduleBasic(searchS, { title: 'Ancient Lore Concert', category: 'concert', zone: 'athenaeum', host: 'bard', startAt: NOW + 10000, endAt: NOW + 13000, tags: ['music'] });

// Text search in title
var sr1 = LC.searchEvents(searchS, { q: 'auction' });
assert(sr1.length === 1, 'searchEvents finds 1 result for "auction"');
assert(sr1[0].title === 'Grand Auction', 'correct event found');

// Case-insensitive text search
var sr2 = LC.searchEvents(searchS, { q: 'TOURNAMENT' });
assert(sr2.length === 1, 'searchEvents case-insensitive for "TOURNAMENT"');

// Category filter
var sr3 = LC.searchEvents(searchS, { category: 'festival' });
assert(sr3.length === 1, 'searchEvents category filter: 1 festival');

// Zone filter
var sr4 = LC.searchEvents(searchS, { zone: 'arena' });
assert(sr4.length === 1, 'searchEvents zone filter: 1 arena event');

// Host filter
var sr5 = LC.searchEvents(searchS, { host: 'bard' });
assert(sr5.length === 1, 'searchEvents host filter: 1 bard event');

// Date range filter
var sr6 = LC.searchEvents(searchS, { fromTs: NOW + 3000, toTs: NOW + 6000 });
assert(sr6.length === 2, 'searchEvents date range: 2 events in [+3000, +6000]');

// Tag filter
var sr7 = LC.searchEvents(searchS, { tags: ['weekly'] });
assert(sr7.length === 2, 'searchEvents tag "weekly": 2 events');

var sr8 = LC.searchEvents(searchS, { tags: ['pvp'] });
assert(sr8.length === 1, 'searchEvents tag "pvp": 1 event');

// No matches
var sr9 = LC.searchEvents(searchS, { q: 'xyznomatch' });
assert(sr9.length === 0, 'searchEvents returns [] for no matches');

// Combined filters
var sr10 = LC.searchEvents(searchS, { category: 'festival', zone: 'gardens' });
assert(sr10.length === 1, 'searchEvents combined category+zone: 1 match');

var sr11 = LC.searchEvents(searchS, { category: 'raid', zone: 'gardens' });
assert(sr11.length === 0, 'searchEvents combined: 0 matches for raid in gardens');

// Empty query returns all
var sr12 = LC.searchEvents(searchS, {});
assert(sr12.length === 4, 'searchEvents with empty query returns all events');

// Results sorted by startAt
var sr13 = LC.searchEvents(searchS, {});
assert(sr13[0].startAt <= sr13[1].startAt, 'searchEvents results sorted by startAt');

// ---------------------------------------------------------------------------
// SECTION 25: getEventsByCategory / getEventsByZone / getEventsByHost
// ---------------------------------------------------------------------------
section('getEventsByCategory / Zone / Host');

var catS = makeState();
scheduleBasic(catS, { category: 'raid', zone: 'wilds', host: 'raidleader', startAt: NOW + 100, endAt: NOW + 200 });
scheduleBasic(catS, { category: 'raid', zone: 'arena', host: 'raidleader', startAt: NOW - 1000, endAt: NOW - 500 }); // past
scheduleBasic(catS, { category: 'concert', zone: 'studio', host: 'bard', startAt: NOW + 300, endAt: NOW + 400 });

// getEventsByCategory
var byCat = LC.getEventsByCategory(catS, 'raid');
assert(byCat.length === 2, 'getEventsByCategory returns 2 raid events');

// With nowTs filter — past events excluded
var byCatFuture = LC.getEventsByCategory(catS, 'raid', NOW);
assert(byCatFuture.length === 1, 'getEventsByCategory with nowTs: 1 future raid');

// No events for category
var byCatNone = LC.getEventsByCategory(catS, 'election');
assert(byCatNone.length === 0, 'getEventsByCategory returns [] for empty category');

// getEventsByZone
var byZone = LC.getEventsByZone(catS, 'wilds', NOW);
assert(byZone.length === 1, 'getEventsByZone returns 1 future wilds event');

var byZoneNone = LC.getEventsByZone(catS, 'athenaeum', NOW);
assert(byZoneNone.length === 0, 'getEventsByZone returns 0 for zone with no events');

// getEventsByHost
var byHost = LC.getEventsByHost(catS, 'raidleader');
assert(byHost.length === 2, 'getEventsByHost returns 2 raidleader events');

var byHostNone = LC.getEventsByHost(catS, 'unknown_host');
assert(byHostNone.length === 0, 'getEventsByHost returns [] for unknown host');

// ---------------------------------------------------------------------------
// SECTION 26: getNextEvent
// ---------------------------------------------------------------------------
section('getNextEvent');

var nextS = makeState();
scheduleBasic(nextS, { category: 'festival', startAt: NOW + 1000, endAt: NOW + 2000 });
scheduleBasic(nextS, { category: 'raid', startAt: NOW + 500, endAt: NOW + 700 });
scheduleBasic(nextS, { category: 'festival', startAt: NOW + 3000, endAt: NOW + 4000 });

var next1 = LC.getNextEvent(nextS, NOW);
assert(next1 !== null, 'getNextEvent returns an event');
assert(next1.startAt === NOW + 500, 'getNextEvent returns the soonest event');

// With category filter
var next2 = LC.getNextEvent(nextS, NOW, 'festival');
assert(next2 !== null, 'getNextEvent with category filter returns event');
assert(next2.startAt === NOW + 1000, 'getNextEvent festival returns soonest festival');

// No upcoming events
var emptyNext = makeState();
var next3 = LC.getNextEvent(emptyNext, NOW);
assert(next3 === null, 'getNextEvent returns null when no events');

// Past events excluded
var pastOnly = makeState();
scheduleBasic(pastOnly, { startAt: NOW - 5000, endAt: NOW - 1000 });
var next4 = LC.getNextEvent(pastOnly, NOW);
assert(next4 === null, 'getNextEvent returns null when only past events');

// Cancelled events excluded
var cancelledNextS = makeState();
var cne = scheduleBasic(cancelledNextS, { startAt: NOW + 100, endAt: NOW + 200 });
LC.cancelEvent(cancelledNextS, cne.event.id, NOW);
var next5 = LC.getNextEvent(cancelledNextS, NOW);
assert(next5 === null, 'getNextEvent excludes cancelled events');

// ---------------------------------------------------------------------------
// SECTION 27: Conflict Detection
// ---------------------------------------------------------------------------
section('Conflict Detection');

var confS = makeState();
var confEv1 = scheduleBasic(confS, { title: 'Ev A', startAt: NOW + 1000, endAt: NOW + 2000 });
var confEv2 = scheduleBasic(confS, { title: 'Ev B', startAt: NOW + 1500, endAt: NOW + 2500 }); // overlaps with A
var confEv3 = scheduleBasic(confS, { title: 'Ev C', startAt: NOW + 3000, endAt: NOW + 4000 }); // no overlap

LC.rsvp(confS, 'alice', confEv1.event.id, 'going', NOW);
LC.rsvp(confS, 'alice', confEv2.event.id, 'going', NOW);
LC.rsvp(confS, 'alice', confEv3.event.id, 'going', NOW);

var conflicts = LC.detectConflicts(confS, 'alice');
assert(Array.isArray(conflicts), 'detectConflicts returns array');
assert(conflicts.length === 1, 'detectConflicts finds 1 conflict (A overlaps B)');
assert(conflicts[0].event1 !== null, 'conflict has event1');
assert(conflicts[0].event2 !== null, 'conflict has event2');

// No conflicts for bob (no RSVPs)
var noConflicts = LC.detectConflicts(confS, 'bob');
assert(noConflicts.length === 0, 'detectConflicts returns [] for player with no RSVPs');

// eventsConflict helper
var evA = { startAt: 1000, endAt: 2000 };
var evB = { startAt: 1500, endAt: 2500 };  // overlaps
var evC = { startAt: 2000, endAt: 3000 };  // adjacent (no overlap)
var evD = { startAt: 3000, endAt: 4000 };  // no overlap

assert(LC.eventsConflict(evA, evB) === true, 'eventsConflict: A and B overlap');
assert(LC.eventsConflict(evA, evC) === false, 'eventsConflict: A and C are adjacent (no overlap)');
assert(LC.eventsConflict(evA, evD) === false, 'eventsConflict: A and D do not overlap');
assert(LC.eventsConflict(evB, evD) === false, 'eventsConflict: B and D do not overlap');

// Cancelled events not included in conflict detection
var cancelConfS = makeState();
var ccEv1 = scheduleBasic(cancelConfS, { startAt: NOW + 1000, endAt: NOW + 2000 });
var ccEv2 = scheduleBasic(cancelConfS, { startAt: NOW + 1500, endAt: NOW + 2500 });
LC.rsvp(cancelConfS, 'alice', ccEv1.event.id, 'going', NOW);
LC.rsvp(cancelConfS, 'alice', ccEv2.event.id, 'going', NOW);
LC.cancelEvent(cancelConfS, ccEv2.event.id, NOW);
var cancelledConflicts = LC.detectConflicts(cancelConfS, 'alice');
assert(cancelledConflicts.length === 0, 'detectConflicts excludes cancelled events');

// maybe RSVPs not counted as conflicts
var maybeConfS = makeState();
var mcEv1 = scheduleBasic(maybeConfS, { startAt: NOW + 1000, endAt: NOW + 2000 });
var mcEv2 = scheduleBasic(maybeConfS, { startAt: NOW + 1500, endAt: NOW + 2500 });
LC.rsvp(maybeConfS, 'alice', mcEv1.event.id, 'going', NOW);
LC.rsvp(maybeConfS, 'alice', mcEv2.event.id, 'maybe', NOW);  // maybe, not going
var maybeConflicts = LC.detectConflicts(maybeConfS, 'alice');
assert(maybeConflicts.length === 0, 'detectConflicts only checks going RSVPs');

// ---------------------------------------------------------------------------
// SECTION 28: Weekly Digest
// ---------------------------------------------------------------------------
section('Weekly Digest');

var wdS = makeState();
var weekStart = NOW;

// Add upcoming events this week
scheduleBasic(wdS, { title: 'Tournament A', category: 'tournament', startAt: weekStart + 3600, endAt: weekStart + 7200 });
scheduleBasic(wdS, { title: 'Festival B', category: 'festival', startAt: weekStart + 86400, endAt: weekStart + 90000 });
scheduleBasic(wdS, { title: 'Raid C', category: 'raid', startAt: weekStart + 172800, endAt: weekStart + 176400 });
scheduleBasic(wdS, { title: 'Concert D', category: 'concert', startAt: weekStart + 259200, endAt: weekStart + 262800 });

// Add past (completed) events from previous week
var pastEv1 = scheduleBasic(wdS, { title: 'Past Festival', category: 'festival', startAt: weekStart - 86400, endAt: weekStart - 82800 });
var pastEv2 = scheduleBasic(wdS, { title: 'Past Raid', category: 'raid', startAt: weekStart - 3600, endAt: weekStart - 100 });
LC.startEvent(wdS, pastEv1.event.id, weekStart - 86400);
LC.completeEvent(wdS, pastEv1.event.id, weekStart - 82800);
LC.startEvent(wdS, pastEv2.event.id, weekStart - 3600);
LC.completeEvent(wdS, pastEv2.event.id, weekStart - 100);

var digest = LC.generateWeeklyDigest(wdS, weekStart, 42);
assert(typeof digest === 'object', 'generateWeeklyDigest returns object');
assert(digest.weekStart === weekStart, 'digest.weekStart correct');
assert(digest.weekEnd === weekStart + LC.SECONDS_PER_WEEK, 'digest.weekEnd correct');
assert(typeof digest.totalEvents === 'number', 'digest.totalEvents is number');
assert(digest.totalEvents >= 4, 'digest.totalEvents >= 4 upcoming');
assert(typeof digest.categoryCounts === 'object', 'digest.categoryCounts is object');
assert(digest.categoryCounts.tournament >= 1, 'tournament counted in digest');
assert(digest.categoryCounts.festival >= 1, 'festival counted in digest');
assert(Array.isArray(digest.upcomingEvents), 'digest.upcomingEvents is array');
assert(digest.upcomingEvents.length <= 5, 'digest.upcomingEvents capped at 5');
assert(typeof digest.generatedWithSeed === 'number', 'digest has generatedWithSeed');
assert(digest.generatedWithSeed === 42, 'digest.generatedWithSeed = 42');

// Featured event is one of the upcoming events
if (digest.featuredEvent) {
  assert(typeof digest.featuredEvent.id === 'string', 'featuredEvent has id');
}

// Digest is deterministic with same seed
var digest2 = LC.generateWeeklyDigest(wdS, weekStart, 42);
if (digest.featuredEvent && digest2.featuredEvent) {
  assert(digest.featuredEvent.id === digest2.featuredEvent.id, 'same seed produces same featuredEvent');
}

// Different seed may produce different featured event
var digest3 = LC.generateWeeklyDigest(wdS, weekStart, 999);
assert(typeof digest3 === 'object', 'generateWeeklyDigest works with different seed');
assert(digest3.totalEvents === digest.totalEvents, 'same events regardless of seed');

// Highlights map has entries
assert(typeof digest.highlights === 'object', 'digest.highlights is object');

// ---------------------------------------------------------------------------
// SECTION 29: getCalendarStats
// ---------------------------------------------------------------------------
section('getCalendarStats');

var statS = makeState();
scheduleBasic(statS, { category: 'tournament', startAt: NOW + 100, endAt: NOW + 200 });
scheduleBasic(statS, { category: 'festival', startAt: NOW + 300, endAt: NOW + 400 });
var cancelStatEv = scheduleBasic(statS, { category: 'raid', startAt: NOW + 500, endAt: NOW + 600 });
LC.cancelEvent(statS, cancelStatEv.event.id, NOW);
var completeStatEv = scheduleBasic(statS, { category: 'concert', startAt: NOW - 1000, endAt: NOW - 500 });
LC.completeEvent(statS, completeStatEv.event.id, NOW);
LC.subscribeToCategory(statS, 'alice', 'tournament');
LC.subscribeToCategory(statS, 'bob', 'festival');
LC.createRecurringTemplate(statS, { title: 'X', category: 'auction', recurrence: 'daily', duration: 3600 });
LC.createRecurringTemplate(statS, { title: 'Y', category: 'concert', recurrence: 'weekly', duration: 7200 });
var inactTmpl = LC.createRecurringTemplate(statS, { title: 'Z', category: 'raid', recurrence: 'monthly', duration: 3600 });
LC.deactivateTemplate(statS, inactTmpl.template.id);

var stats = LC.getCalendarStats(statS, NOW);
assert(typeof stats === 'object', 'getCalendarStats returns object');
assert(stats.totalEvents === 4, 'stats.totalEvents = 4');
assert(stats.scheduledEvents === 2, 'stats.scheduledEvents = 2');
assert(stats.completedEvents === 1, 'stats.completedEvents = 1');
assert(stats.cancelledEvents === 1, 'stats.cancelledEvents = 1');
assert(stats.totalSubscribers === 2, 'stats.totalSubscribers = 2');
assert(stats.totalTemplates === 3, 'stats.totalTemplates = 3');
assert(stats.activeTemplates === 2, 'stats.activeTemplates = 2 (one deactivated)');
assert(stats.historyCount === 1, 'stats.historyCount = 1');
assert(typeof stats.categoryBreakdown === 'object', 'stats.categoryBreakdown is object');
assert(stats.categoryBreakdown.tournament === 1, 'tournament: 1 in breakdown');
assert(stats.categoryBreakdown.festival === 1, 'festival: 1 in breakdown');

// ---------------------------------------------------------------------------
// SECTION 30: tick function
// ---------------------------------------------------------------------------
section('tick function');

var tickS = makeState();
// Event that should be started by tick
var tickEv1 = scheduleBasic(tickS, { title: 'Starting Now', startAt: NOW - 1, endAt: NOW + 7200 });
// Event that should be completed by tick
var tickEv2 = scheduleBasic(tickS, { title: 'Just Ended', startAt: NOW - 7200, endAt: NOW - 1 });
LC.startEvent(tickS, tickEv2.event.id, NOW - 7200); // pre-start it so it's 'active'

// Subscribe alice for notifications
LC.subscribeToCategory(tickS, 'alice', 'community');

var tickRes = LC.tick(tickS, NOW);
assert(Array.isArray(tickRes.started), 'tick returns started array');
assert(Array.isArray(tickRes.completed), 'tick returns completed array');
assert(Array.isArray(tickRes.remindersEmitted), 'tick returns remindersEmitted array');

// tickEv1 should have been started
assert(tickRes.started.indexOf(tickEv1.event.id) !== -1, 'tick started tickEv1');
var startedEv = LC.getEventById(tickS, tickEv1.event.id);
assert(startedEv.status === 'active', 'tickEv1 status is active after tick');

// tickEv2 should have been completed
assert(tickRes.completed.indexOf(tickEv2.event.id) !== -1, 'tick completed tickEv2');
var completedEv3 = LC.getEventById(tickS, tickEv2.event.id);
assert(completedEv3.status === 'completed', 'tickEv2 status is completed after tick');

// tick on empty state
var emptyTickS = makeState();
var emptyTick = LC.tick(emptyTickS, NOW);
assert(emptyTick.started.length === 0, 'tick on empty state: 0 started');
assert(emptyTick.completed.length === 0, 'tick on empty state: 0 completed');
assert(emptyTick.remindersEmitted.length === 0, 'tick on empty state: 0 reminders');

// ---------------------------------------------------------------------------
// SECTION 31: Edge Cases and Defensive Programming
// ---------------------------------------------------------------------------
section('Edge Cases');

// scheduleEvent with minimal valid opts
var minS = makeState();
var minR = LC.scheduleEvent(minS, { title: 'Min', category: 'custom', startAt: 0, endAt: 1 });
assert(minR.success === true, 'minimal valid scheduleEvent succeeds');
assert(minR.event.duration === 1, 'minimal event duration=1');

// RSVP to completed event
var compRsvpS = makeState();
var compRsvpEv = scheduleBasic(compRsvpS, { startAt: NOW - 1000, endAt: NOW - 500 });
LC.completeEvent(compRsvpS, compRsvpEv.event.id, NOW);
var compRsvp = LC.rsvp(compRsvpS, 'alice', compRsvpEv.event.id, 'going', NOW);
assert(compRsvp.success === false, 'cannot RSVP to completed event');

// getEventRsvps for non-existent event
var noRsvpEv = LC.getEventRsvps(makeState(), 'ev_fake');
assert(noRsvpEv.going.length === 0, 'getEventRsvps.going = [] for non-existent event');
assert(noRsvpEv.maybe.length === 0, 'getEventRsvps.maybe = [] for non-existent event');
assert(noRsvpEv.total === 0, 'getEventRsvps.total = 0 for non-existent event');

// getThirtyDayCalendar on empty state
var emptyWindow = LC.getThirtyDayCalendar(makeState(), NOW);
assert(Array.isArray(emptyWindow) && emptyWindow.length === 0, '30-day calendar empty on empty state');

// getEventHistory on empty state
var emptyHist = LC.getEventHistory(makeState());
assert(Array.isArray(emptyHist) && emptyHist.length === 0, 'getEventHistory returns [] on empty state');

// spawnRecurringEvents on empty templates
var noTmplS = makeState();
var spawnEmpty = LC.spawnRecurringEvents(noTmplS, NOW, 7 * LC.SECONDS_PER_DAY);
assert(spawnEmpty.spawned.length === 0, 'spawnRecurringEvents returns [] with no templates');

// detectConflicts on empty state
var emptyConf = LC.detectConflicts(makeState(), 'alice');
assert(emptyConf.length === 0, 'detectConflicts returns [] on empty state');

// updateEvent with empty updates object
var emptyUpdS = makeState();
var emptyUpdEv = scheduleBasic(emptyUpdS, { title: 'Stable' });
var emptyUpd = LC.updateEvent(emptyUpdS, emptyUpdEv.event.id, {});
assert(emptyUpd.success === true, 'updateEvent with empty {} succeeds (no-op)');
assert(emptyUpd.event.title === 'Stable', 'title unchanged after empty update');

// Tags default to empty array if not provided
var noTagsR = scheduleBasic(minS, { title: 'No Tags Event' });
assert(Array.isArray(noTagsR.event.tags) && noTagsR.event.tags.length === 0, 'event tags defaults to []');

// capacity=0 (unlimited) does not block RSVPs
var unlimS = makeState();
var unlimEv = scheduleBasic(unlimS, { title: 'Unlimited', capacity: 0 });
for (var ui = 0; ui < 20; ui++) {
  var rRes = LC.rsvp(unlimS, 'player' + ui, unlimEv.event.id, 'going', NOW);
  assert(rRes.success === true, 'unlimited capacity allows RSVP #' + ui);
}
var unlimRsvps = LC.getEventRsvps(unlimS, unlimEv.event.id);
assert(unlimRsvps.going.length === 20, '20 going RSVPs with unlimited capacity');

// broadcastToCategory with no subscribers
var emptyBcast = LC.broadcastToCategory(makeState(), 'raid', 'No one listening', NOW);
assert(emptyBcast.sentTo === 0, 'broadcast to 0 subscribers sends 0');

// getNotifications for player with no notifications
var noNotifs = LC.getNotifications(makeState(), 'ghost_player');
assert(Array.isArray(noNotifs) && noNotifs.length === 0, 'getNotifications returns [] for unknown player');

// generateWeeklyDigest on empty state
var emptyDigest = LC.generateWeeklyDigest(makeState(), NOW, 1);
assert(emptyDigest.totalEvents === 0, 'empty state digest has 0 events');
assert(emptyDigest.featuredEvent === null, 'empty state digest has null featuredEvent');

// Subscriptions defense copy: getSubscriptions returns arrays, not internal refs
var defCopyS = makeState();
LC.subscribeToCategory(defCopyS, 'alice', 'concert');
var cats1 = LC.getSubscriptions(defCopyS, 'alice');
cats1.categories.push('injected');
var cats2 = LC.getSubscriptions(defCopyS, 'alice');
assert(cats2.categories.length === 1, 'getSubscriptions returns copy (mutation not reflected)');

// Multiple subscriptions across all categories
var allCatS = makeState();
for (var ai = 0; ai < LC.VALID_CATEGORIES.length; ai++) {
  LC.subscribeToCategory(allCatS, 'omnibus', LC.VALID_CATEGORIES[ai]);
}
var omnibSubs = LC.getSubscriptions(allCatS, 'omnibus');
assert(omnibSubs.categories.length === LC.VALID_CATEGORIES.length, 'can subscribe to all categories');

// ---------------------------------------------------------------------------
// RESULTS SUMMARY
// ---------------------------------------------------------------------------
console.log('\n========================================');
console.log('Living Calendar Test Results');
console.log('========================================');
console.log('Total:  ' + total);
console.log('Passed: ' + passed);
console.log('Failed: ' + failed);
console.log('========================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('All tests passed!');
  process.exit(0);
}
