// Test: HousingSocial wiring — createHouseState, addRoom, placeFurniture, visitHouse, leaveGuestbookEntry, calculateComfort
var HousingSocial = require('../src/js/housing_social.js');

var passed = 0;
var failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; }
  else { failed++; console.error('FAIL: ' + msg); }
}

// createHouseState
var state = HousingSocial.createHouseState('testplayer', 'cottage', 'nexus');
assert(state !== null && typeof state === 'object', 'createHouseState returns object');

// addRoom
var roomResult = HousingSocial.addRoom(state, 'bedroom');
assert(roomResult !== null && typeof roomResult === 'object', 'addRoom returns result');

// addRoom: kitchen
var kitchenResult = HousingSocial.addRoom(state, 'kitchen');
assert(kitchenResult !== null, 'addRoom kitchen returns result');

// placeFurniture
var furnResult = HousingSocial.placeFurniture(state, 'basic_bed', 0);
assert(furnResult !== null && typeof furnResult === 'object', 'placeFurniture returns result');

// calculateComfort
var comfort = HousingSocial.calculateComfort(state);
assert(typeof comfort === 'number', 'calculateComfort returns number');
assert(comfort >= 0, 'comfort is non-negative');

// visitHouse — returns {state, message}, use returned state
var visitResult = HousingSocial.visitHouse(state, 'visitor1', 100);
assert(visitResult !== null && typeof visitResult === 'object', 'visitHouse returns result');
if (visitResult && visitResult.state) state = visitResult.state;

// Multiple visits — capture returned state each time
var v2 = HousingSocial.visitHouse(state, 'visitor2', 200);
if (v2 && v2.state) state = v2.state;
var v3 = HousingSocial.visitHouse(state, 'visitor3', 300);
if (v3 && v3.state) state = v3.state;

// leaveGuestbookEntry — returns {state, entry}
var guestResult = HousingSocial.leaveGuestbookEntry(state, 'visitor1', 'What a cozy place!', 150);
assert(guestResult !== null && typeof guestResult === 'object', 'leaveGuestbookEntry returns result');
if (guestResult && guestResult.state) state = guestResult.state;

// getVisitorCount — uses current state with visitors
var visitorCount = HousingSocial.getVisitorCount(state);
assert(typeof visitorCount === 'number', 'getVisitorCount returns number');
assert(visitorCount >= 1, 'visitor count is at least 1');

// getGuestbook
if (HousingSocial.getGuestbook) {
  var guestbook = HousingSocial.getGuestbook(state);
  assert(Array.isArray(guestbook), 'getGuestbook returns array');
  assert(guestbook.length >= 1, 'guestbook has entries');
}

// getRecentVisitors
if (HousingSocial.getRecentVisitors) {
  var recent = HousingSocial.getRecentVisitors(state, 10);
  assert(Array.isArray(recent), 'getRecentVisitors returns array');
}

// getHouseBonus
if (HousingSocial.getHouseBonus) {
  var bonus = HousingSocial.getHouseBonus(state);
  assert(bonus !== undefined, 'getHouseBonus returns a value');
}

console.log('test_wiring_housing: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
