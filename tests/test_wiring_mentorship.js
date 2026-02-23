// Test: MentorshipMarket wiring — createMarketState, listings, sessions, rewards
// Verifies the full lifecycle: create state → create listing → book → start → complete → rate

(function() {
  var passed = 0;
  var failed = 0;

  function assert(condition, msg) {
    if (condition) { passed++; }
    else { failed++; console.error('FAIL: ' + msg); }
  }

  var MentorshipMarket = require('../src/js/mentorship_market');

  // Test 1: createMarketState exists and returns valid state
  assert(typeof MentorshipMarket.createMarketState === 'function', 'createMarketState is a function');
  var state = MentorshipMarket.createMarketState();
  assert(state !== null && state !== undefined, 'createMarketState returns state');
  assert(state.listings !== undefined, 'state has listings');
  assert(state.sessions !== undefined, 'state has sessions');

  // Test 2: getSubjects returns subjects map
  var subjects = MentorshipMarket.getSubjects();
  assert(subjects !== null && typeof subjects === 'object', 'getSubjects returns object');
  var subjectKeys = Object.keys(subjects);
  assert(subjectKeys.length > 0, 'getSubjects has entries');

  // Test 3: createListing with correct signature
  var subjectId = subjectKeys[0];
  var sub = subjects[subjectId];
  var listResult = MentorshipMarket.createListing(state, 'teacher_1', subjectId, sub.basePrice || 10, 3, 500, 5);
  assert(listResult && listResult.success === true, 'createListing succeeds');
  assert(listResult.listing !== undefined, 'createListing returns listing');
  state = listResult.state;

  // Test 4: getListings finds the listing
  var listings = MentorshipMarket.getListings(state, { teacherId: 'teacher_1' });
  assert(Array.isArray(listings), 'getListings returns array');
  assert(listings.length >= 1, 'getListings finds teacher listing');

  // Test 5: bookSession
  var bookResult = MentorshipMarket.bookSession(state, listResult.listing.id, 'student_1');
  assert(bookResult && bookResult.success === true, 'bookSession succeeds');
  assert(bookResult.session !== undefined, 'bookSession returns session');
  state = bookResult.state;

  // Test 6: startSession
  var startResult = MentorshipMarket.startSession(state, bookResult.session.id, 100);
  assert(startResult && startResult.success === true, 'startSession succeeds');
  state = startResult.state;

  // Test 7: completeSession returns rewards
  var completeResult = MentorshipMarket.completeSession(state, bookResult.session.id, 200);
  assert(completeResult && completeResult.success === true, 'completeSession succeeds');
  assert(completeResult.studentReward !== undefined, 'completeSession has studentReward');
  assert(completeResult.teacherReward !== undefined, 'completeSession has teacherReward');
  state = completeResult.state;

  // Test 8: rateSession
  var rateResult = MentorshipMarket.rateSession(state, bookResult.session.id, 'student_1', 5, 'Great lesson!');
  assert(rateResult && rateResult.success === true, 'rateSession succeeds');
  state = rateResult.state;

  // Test 9: getTeacherRating after rating
  var rating = MentorshipMarket.getTeacherRating(state, 'teacher_1');
  assert(rating && rating.average > 0, 'getTeacherRating returns positive average');
  assert(rating.count >= 1, 'getTeacherRating has count >= 1');

  // Test 10: getTeacherProfile
  var profile = MentorshipMarket.getTeacherProfile(state, 'teacher_1');
  assert(profile && profile.teacherId === 'teacher_1', 'getTeacherProfile returns correct teacher');

  console.log('test_wiring_mentorship: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
})();
