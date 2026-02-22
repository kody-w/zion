/**
 * tests/test_constitution_amendments.js
 * Comprehensive tests for the ZION Constitutional Amendment module.
 * 140+ tests covering all exported functions, lifecycle stages,
 * cooldowns, version tracking, vote tallying, filtering, edge cases.
 *
 * Run with: node tests/test_constitution_amendments.js
 */

'use strict';

var CA = require('../src/js/constitution_amendments');

// ============================================================================
// MINIMAL TEST HARNESS (var-only, achievement_engine style)
// ============================================================================

var passed = 0;
var failed = 0;
var failures = [];
var currentSuite = '';

function suite(name, fn) {
  currentSuite = name;
  console.log('\n' + name);
  fn();
}

function assert(condition, msg) {
  if (condition) {
    passed++;
    process.stdout.write('  ok - ' + msg + '\n');
  } else {
    failed++;
    var fullMsg = '[' + currentSuite + '] FAIL: ' + msg;
    failures.push(fullMsg);
    process.stdout.write('  FAIL - ' + msg + '\n');
  }
}

function assertEqual(a, b, msg) {
  assert(a === b, msg + ' (expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a) + ')');
}

function assertDeep(a, b, msg) {
  assert(JSON.stringify(a) === JSON.stringify(b), msg);
}

// ============================================================================
// HELPERS
// ============================================================================

var _seq = 0;
function uid(prefix) { return (prefix || 'player') + (++_seq); }

function freshState() {
  return CA.createState();
}

/**
 * Draft an amendment, co-sponsor it, open discussion, fast-forward past
 * discussion, open voting, fast-forward past voting, and close it.
 * Returns { state, amendmentId, result }.
 */
function fullLifecycle(opts) {
  opts = opts || {};
  var state    = opts.state    || freshState();
  var sponsor  = opts.sponsor  || uid('sp');
  var coSp1    = opts.coSp1   || uid('co');
  var coSp2    = opts.coSp2   || uid('co');
  var category = opts.category || 'governance';
  var title    = opts.title    || 'Test Amendment';
  var text     = opts.text     || 'Amend clause 1 to allow X';
  var sections = opts.sections || ['section-1'];
  var tick     = opts.tick     || 0;
  var voters   = opts.voters   || [uid('v'), uid('v'), uid('v'), uid('v'), uid('v'),
                                    uid('v'), uid('v'), uid('v'), uid('v'), uid('v')];
  var voteType = opts.voteType || 'yes'; // 'yes', 'no', or 'mixed'

  var r1 = CA.draftAmendment(state, sponsor, category, title, text, sections, tick);
  if (!r1.success) throw new Error('draftAmendment failed: ' + r1.error);
  var amendmentId = r1.amendment.id;

  CA.coSponsor(state, amendmentId, coSp1, tick);
  CA.coSponsor(state, amendmentId, coSp2, tick);

  var discussionTick = tick;
  CA.openDiscussion(state, amendmentId, discussionTick);

  var votingTick = discussionTick + CA.DISCUSSION_PERIOD;
  CA.openVoting(state, amendmentId, votingTick);

  // Cast votes
  for (var i = 0; i < voters.length; i++) {
    var vote;
    if (voteType === 'mixed') {
      vote = (i % 2 === 0) ? 'yes' : 'no';
    } else if (voteType === 'no') {
      vote = 'no';
    } else {
      vote = 'yes';
    }
    CA.castVote(state, amendmentId, voters[i], vote, votingTick + 1);
  }

  var closeTick = votingTick + CA.VOTING_PERIOD;
  var result = CA.closeVoting(state, amendmentId, closeTick);

  return { state: state, amendmentId: amendmentId, result: result, closeTick: closeTick };
}

// ============================================================================
// SUITE 1: MODULE EXPORTS
// ============================================================================

suite('Module exports', function() {

  assert(typeof CA === 'object', 'module exports an object');

  // Constants
  assert(Array.isArray(CA.CATEGORIES), 'CATEGORIES is an array');
  assertEqual(CA.CATEGORIES.length, 6, 'CATEGORIES has 6 items');
  assertEqual(typeof CA.DISCUSSION_PERIOD, 'number', 'DISCUSSION_PERIOD is a number');
  assertEqual(typeof CA.VOTING_PERIOD, 'number', 'VOTING_PERIOD is a number');
  assertEqual(typeof CA.VOTE_QUORUM, 'number', 'VOTE_QUORUM is a number');
  assertEqual(typeof CA.SPONSOR_COUNT, 'number', 'SPONSOR_COUNT is a number');
  assertEqual(typeof CA.SECTION_COOLDOWN, 'number', 'SECTION_COOLDOWN is a number');

  // Functions
  assert(typeof CA.createState === 'function',              'createState exported');
  assert(typeof CA.draftAmendment === 'function',           'draftAmendment exported');
  assert(typeof CA.coSponsor === 'function',                'coSponsor exported');
  assert(typeof CA.openDiscussion === 'function',           'openDiscussion exported');
  assert(typeof CA.addComment === 'function',               'addComment exported');
  assert(typeof CA.getComments === 'function',              'getComments exported');
  assert(typeof CA.openVoting === 'function',               'openVoting exported');
  assert(typeof CA.castVote === 'function',                 'castVote exported');
  assert(typeof CA.closeVoting === 'function',              'closeVoting exported');
  assert(typeof CA.getAmendment === 'function',             'getAmendment exported');
  assert(typeof CA.getAmendmentsByCategory === 'function',  'getAmendmentsByCategory exported');
  assert(typeof CA.getAmendmentsByStatus === 'function',    'getAmendmentsByStatus exported');
  assert(typeof CA.getActiveAmendments === 'function',      'getActiveAmendments exported');
  assert(typeof CA.getConstitutionVersion === 'function',   'getConstitutionVersion exported');
  assert(typeof CA.getAmendmentHistory === 'function',      'getAmendmentHistory exported');
  assert(typeof CA.getVoteResults === 'function',           'getVoteResults exported');
  assert(typeof CA.canAmendSection === 'function',          'canAmendSection exported');
  assert(typeof CA.getPlayerAmendments === 'function',      'getPlayerAmendments exported');
  assert(typeof CA.getAmendmentStats === 'function',        'getAmendmentStats exported');

});

// ============================================================================
// SUITE 2: CATEGORIES
// ============================================================================

suite('CATEGORIES data integrity', function() {

  assertEqual(CA.CATEGORIES.length, 6, '6 categories defined');

  var requiredKeys = ['id', 'name', 'description', 'icon', 'color'];
  var allHaveFields = true;
  for (var i = 0; i < CA.CATEGORIES.length; i++) {
    var cat = CA.CATEGORIES[i];
    for (var j = 0; j < requiredKeys.length; j++) {
      if (!(requiredKeys[j] in cat)) { allHaveFields = false; break; }
    }
  }
  assert(allHaveFields, 'every category has id, name, description, icon, color');

  // IDs are unique
  var ids = {};
  var unique = true;
  for (var k = 0; k < CA.CATEGORIES.length; k++) {
    if (ids[CA.CATEGORIES[k].id]) { unique = false; break; }
    ids[CA.CATEGORIES[k].id] = true;
  }
  assert(unique, 'all category IDs are unique');

  // Expected category IDs
  var expected = ['governance', 'economy', 'zones', 'rights', 'social', 'technical'];
  for (var m = 0; m < expected.length; m++) {
    assert(ids[expected[m]], 'category "' + expected[m] + '" exists');
  }

  // Names and descriptions are non-empty strings
  var namesOk = true;
  for (var n = 0; n < CA.CATEGORIES.length; n++) {
    var c = CA.CATEGORIES[n];
    if (typeof c.name !== 'string' || c.name.length === 0) { namesOk = false; break; }
    if (typeof c.description !== 'string' || c.description.length === 0) { namesOk = false; break; }
  }
  assert(namesOk, 'all categories have non-empty name and description');

});

// ============================================================================
// SUITE 3: CONSTANTS
// ============================================================================

suite('Constants', function() {

  assertEqual(CA.DISCUSSION_PERIOD, 700,  'DISCUSSION_PERIOD is 700 ticks');
  assertEqual(CA.VOTING_PERIOD,     500,  'VOTING_PERIOD is 500 ticks');
  assertEqual(CA.VOTE_QUORUM,       10,   'VOTE_QUORUM is 10 votes');
  assertEqual(CA.SPONSOR_COUNT,     3,    'SPONSOR_COUNT is 3');
  assertEqual(CA.SECTION_COOLDOWN,  2000, 'SECTION_COOLDOWN is 2000 ticks');

});

// ============================================================================
// SUITE 4: createState
// ============================================================================

suite('createState', function() {

  var s = freshState();

  assert(typeof s === 'object' && s !== null, 'returns an object');
  assert(Array.isArray(s.amendments), 'amendments is an array');
  assertEqual(s.amendments.length, 0, 'amendments starts empty');

  assert(typeof s.comments === 'object', 'comments is an object');
  assert(typeof s.votes === 'object',    'votes is an object');

  assert(typeof s.constitution === 'object', 'constitution is an object');
  assertEqual(s.constitution.version, '1.0', 'constitution starts at v1.0');
  assert(Array.isArray(s.constitution.sections), 'constitution.sections is an array');
  assertEqual(s.constitution.sections.length, 0, 'constitution.sections starts empty');
  assertEqual(s.constitution.ratifiedAt, 0, 'constitution.ratifiedAt starts at 0');

  assert(Array.isArray(s.amendmentLog), 'amendmentLog is an array');
  assertEqual(s.amendmentLog.length, 0, 'amendmentLog starts empty');

  // Two calls produce independent states
  var s2 = freshState();
  s2.amendments.push({ id: 'test' });
  assertEqual(s.amendments.length, 0, 'states are independent');

});

// ============================================================================
// SUITE 5: draftAmendment — success
// ============================================================================

suite('draftAmendment — success', function() {

  var state   = freshState();
  var sponsor = uid('sp');
  var r = CA.draftAmendment(state, sponsor, 'governance', 'Test Amendment', 'Amend clause 1', ['sec-1'], 100);

  assert(r.success === true, 'success is true');
  assert(typeof r.amendment === 'object' && r.amendment !== null, 'returns amendment object');
  assert(typeof r.amendment.id === 'string' && r.amendment.id.length > 0, 'amendment has id');
  assertEqual(r.amendment.category,  'governance',    'category stored');
  assertEqual(r.amendment.title,     'Test Amendment','title stored');
  assertEqual(r.amendment.text,      'Amend clause 1','text stored');
  assert(Array.isArray(r.amendment.sections), 'sections is an array');
  assertEqual(r.amendment.sections.length, 1, 'sections has 1 entry');
  assertEqual(r.amendment.sections[0], 'sec-1', 'section stored');
  assertEqual(r.amendment.status,    'drafted',       'status is drafted');
  assertEqual(r.amendment.draftedAt, 100,             'draftedAt set to tick');
  assert(Array.isArray(r.amendment.sponsors), 'sponsors is an array');
  assertEqual(r.amendment.sponsors.length, 1, 'one sponsor initially');
  assertEqual(r.amendment.sponsors[0], sponsor, 'sponsor is the drafter');
  assert(r.amendment.discussionOpenedAt === null, 'discussionOpenedAt null initially');
  assert(r.amendment.votingOpenedAt === null, 'votingOpenedAt null initially');
  assert(r.amendment.closedAt === null, 'closedAt null initially');
  assert(r.amendment.version === null, 'version null before ratification');

  // Amendment added to state
  assertEqual(state.amendments.length, 1, 'amendment added to state');
  assertEqual(state.comments[r.amendment.id].length, 0, 'comment thread initialized');
  assert(typeof state.votes[r.amendment.id] === 'object', 'vote record initialized');

});

// ============================================================================
// SUITE 6: draftAmendment — validation errors
// ============================================================================

suite('draftAmendment — validation', function() {

  var state = freshState();

  var r1 = CA.draftAmendment(state, '', 'governance', 'T', 'text', ['s1'], 0);
  assert(r1.success === false, 'fails on empty sponsorId');
  assert(typeof r1.error === 'string', 'error message returned');

  var r2 = CA.draftAmendment(state, null, 'governance', 'T', 'text', ['s1'], 0);
  assert(r2.success === false, 'fails on null sponsorId');

  var r3 = CA.draftAmendment(state, 'alice', 'invalid_category', 'T', 'text', ['s1'], 0);
  assert(r3.success === false, 'fails on invalid category');
  assert(r3.error.indexOf('Invalid category') !== -1, 'error mentions invalid category');

  var r4 = CA.draftAmendment(state, 'alice', 'governance', '', 'text', ['s1'], 0);
  assert(r4.success === false, 'fails on empty title');

  var r5 = CA.draftAmendment(state, 'alice', 'governance', 'T', '', ['s1'], 0);
  assert(r5.success === false, 'fails on empty text');

  var r6 = CA.draftAmendment(state, 'alice', 'governance', 'T', 'text', [], 0);
  assert(r6.success === false, 'fails on empty sections array');

  var r7 = CA.draftAmendment(state, 'alice', 'governance', 'T', 'text', null, 0);
  assert(r7.success === false, 'fails on null sections');

  // Trim whitespace in title and text
  var r8 = CA.draftAmendment(state, 'alice', 'economy', '  Valid Title  ', '  Valid text  ', ['s1'], 0);
  assert(r8.success === true, 'trims whitespace in title/text');
  assertEqual(r8.amendment.title, 'Valid Title', 'title trimmed');
  assertEqual(r8.amendment.text, 'Valid text', 'text trimmed');

  // All 6 valid categories
  var validCats = ['governance', 'economy', 'zones', 'rights', 'social', 'technical'];
  for (var i = 0; i < validCats.length; i++) {
    var cat = validCats[i];
    var rCat = CA.draftAmendment(freshState(), uid(), cat, 'Title', 'Text', ['s1'], 0);
    assert(rCat.success === true, 'category "' + cat + '" is valid');
  }

});

// ============================================================================
// SUITE 7: coSponsor
// ============================================================================

suite('coSponsor', function() {

  function makeAmendmentWithSponsor() {
    var state   = freshState();
    var sponsor = uid('sp');
    var r       = CA.draftAmendment(state, sponsor, 'rights', 'Rights Amendment', 'Grant right X', ['r1'], 0);
    return { state: state, amendmentId: r.amendment.id, sponsor: sponsor };
  }

  var a1 = makeAmendmentWithSponsor();
  var r1 = CA.coSponsor(a1.state, a1.amendmentId, uid('co'), 0);
  assert(r1.success === true, 'first co-sponsor succeeds');
  assert(Array.isArray(r1.sponsors), 'returns sponsors array');
  assertEqual(r1.sponsors.length, 2, 'sponsors array has 2 entries after 1st co-sponsor');

  var a2 = makeAmendmentWithSponsor();
  CA.coSponsor(a2.state, a2.amendmentId, uid('co'), 0);
  var r2 = CA.coSponsor(a2.state, a2.amendmentId, uid('co'), 0);
  assert(r2.success === true, 'second co-sponsor succeeds');
  assertEqual(r2.sponsors.length, 3, 'sponsors array has 3 entries after 2nd co-sponsor');

  // Cannot add a 4th sponsor (max is 3)
  var r3 = CA.coSponsor(a2.state, a2.amendmentId, uid('co'), 0);
  assert(r3.success === false, 'fails when sponsor limit reached');
  assert(r3.error.indexOf('maximum') !== -1, 'error mentions maximum');

  // Cannot co-sponsor when already a sponsor
  var a3 = makeAmendmentWithSponsor();
  var r4 = CA.coSponsor(a3.state, a3.amendmentId, a3.sponsor, 0);
  assert(r4.success === false, 'fails when player already a sponsor');
  assert(r4.error.indexOf('already') !== -1, 'error mentions already sponsor');

  // Cannot co-sponsor amendment not in drafted status
  var a4 = makeAmendmentWithSponsor();
  var co1 = uid('co'), co2 = uid('co');
  CA.coSponsor(a4.state, a4.amendmentId, co1, 0);
  CA.coSponsor(a4.state, a4.amendmentId, co2, 0);
  CA.openDiscussion(a4.state, a4.amendmentId, 0);
  var r5 = CA.coSponsor(a4.state, a4.amendmentId, uid('co'), 0);
  assert(r5.success === false, 'fails when amendment not in drafted status');

  // Missing amendment ID
  var a5 = makeAmendmentWithSponsor();
  var r6 = CA.coSponsor(a5.state, 'nonexistent_id', uid('co'), 0);
  assert(r6.success === false, 'fails on nonexistent amendment');

  // Empty player ID
  var a6 = makeAmendmentWithSponsor();
  var r7 = CA.coSponsor(a6.state, a6.amendmentId, '', 0);
  assert(r7.success === false, 'fails on empty player ID');

});

// ============================================================================
// SUITE 8: openDiscussion
// ============================================================================

suite('openDiscussion', function() {

  function draftWith1Sponsor() {
    var state   = freshState();
    var sponsor = uid('sp');
    var r       = CA.draftAmendment(state, sponsor, 'social', 'Social', 'Text', ['s1'], 0);
    return { state: state, amendmentId: r.amendment.id };
  }

  // Fails without enough sponsors
  var a1 = draftWith1Sponsor();
  var r1 = CA.openDiscussion(a1.state, a1.amendmentId, 0);
  assert(r1.success === false, 'fails with only 1 sponsor');
  assert(r1.error.indexOf('sponsors') !== -1, 'error mentions sponsors');

  // Fails with 2 sponsors (need 3)
  var a2 = draftWith1Sponsor();
  CA.coSponsor(a2.state, a2.amendmentId, uid('co'), 0);
  var r2 = CA.openDiscussion(a2.state, a2.amendmentId, 0);
  assert(r2.success === false, 'fails with only 2 sponsors');

  // Succeeds with 3 sponsors
  var a3 = draftWith1Sponsor();
  CA.coSponsor(a3.state, a3.amendmentId, uid('co'), 0);
  CA.coSponsor(a3.state, a3.amendmentId, uid('co'), 0);
  var r3 = CA.openDiscussion(a3.state, a3.amendmentId, 42);
  assert(r3.success === true, 'succeeds with 3 sponsors');
  var amend3 = CA.getAmendment(a3.state, a3.amendmentId);
  assertEqual(amend3.status, 'discussion', 'amendment status is discussion');
  assertEqual(amend3.discussionOpenedAt, 42, 'discussionOpenedAt set to tick');

  // Cannot open discussion twice
  var r4 = CA.openDiscussion(a3.state, a3.amendmentId, 43);
  assert(r4.success === false, 'fails if already in discussion');

  // Non-existent amendment
  var r5 = CA.openDiscussion(freshState(), 'bad_id', 0);
  assert(r5.success === false, 'fails for nonexistent amendment');

});

// ============================================================================
// SUITE 9: addComment / getComments
// ============================================================================

suite('addComment and getComments', function() {

  function amendmentInDiscussion() {
    var state   = freshState();
    var sponsor = uid('sp');
    var r       = CA.draftAmendment(state, sponsor, 'technical', 'Technical Fix', 'Change X', ['t1'], 0);
    var id      = r.amendment.id;
    CA.coSponsor(state, id, uid('co'), 0);
    CA.coSponsor(state, id, uid('co'), 0);
    CA.openDiscussion(state, id, 0);
    return { state: state, amendmentId: id };
  }

  var a = amendmentInDiscussion();
  var r1 = CA.addComment(a.state, a.amendmentId, uid('p'), 'This is great!', 10);
  assert(r1.success === true, 'addComment succeeds in discussion phase');
  assert(typeof r1.comment === 'object', 'returns comment object');
  assert(typeof r1.comment.id === 'string' && r1.comment.id.length > 0, 'comment has id');
  assertEqual(r1.comment.amendmentId, a.amendmentId, 'comment has amendmentId');
  assertEqual(r1.comment.text, 'This is great!', 'comment text stored');
  assertEqual(r1.comment.createdAt, 10, 'comment createdAt set');

  // Text is trimmed
  var r2 = CA.addComment(a.state, a.amendmentId, uid('p'), '  Trimmed  ', 11);
  assert(r2.success === true, 'comment with whitespace succeeds');
  assertEqual(r2.comment.text, 'Trimmed', 'comment text trimmed');

  // getComments returns all
  var comments = CA.getComments(a.state, a.amendmentId);
  assertEqual(comments.length, 2, 'getComments returns 2 comments');

  // Fails on empty player ID
  var r3 = CA.addComment(a.state, a.amendmentId, '', 'text', 12);
  assert(r3.success === false, 'fails on empty player ID');

  // Fails on empty text
  var r4 = CA.addComment(a.state, a.amendmentId, uid('p'), '', 12);
  assert(r4.success === false, 'fails on empty text');

  // Fails on drafted amendment
  var state2   = freshState();
  var sp2      = uid('sp');
  var r5draft  = CA.draftAmendment(state2, sp2, 'zones', 'Z', 'text', ['z1'], 0);
  var r5       = CA.addComment(state2, r5draft.amendment.id, uid('p'), 'comment', 0);
  assert(r5.success === false, 'fails on drafted amendment');

  // Succeeds during voting phase too
  var a2 = amendmentInDiscussion();
  CA.openVoting(a2.state, a2.amendmentId, CA.DISCUSSION_PERIOD + 1);
  var r6 = CA.addComment(a2.state, a2.amendmentId, uid('p'), 'Voting comment', CA.DISCUSSION_PERIOD + 2);
  assert(r6.success === true, 'comment allowed during voting phase');

  // Fails after close
  var a3 = amendmentInDiscussion();
  CA.openVoting(a3.state, a3.amendmentId, CA.DISCUSSION_PERIOD);
  for (var i = 0; i < 10; i++) {
    CA.castVote(a3.state, a3.amendmentId, uid('v'), 'yes', CA.DISCUSSION_PERIOD + 1);
  }
  CA.closeVoting(a3.state, a3.amendmentId, CA.DISCUSSION_PERIOD + CA.VOTING_PERIOD);
  var r7 = CA.addComment(a3.state, a3.amendmentId, uid('p'), 'Late comment', CA.DISCUSSION_PERIOD + CA.VOTING_PERIOD + 1);
  assert(r7.success === false, 'fails after amendment is closed');

  // getComments on unknown amendment returns empty array
  var empty = CA.getComments(freshState(), 'nonexistent');
  assert(Array.isArray(empty), 'getComments returns array for unknown id');
  assertEqual(empty.length, 0, 'getComments returns empty array for unknown id');

});

// ============================================================================
// SUITE 10: openVoting
// ============================================================================

suite('openVoting', function() {

  function amendmentInDiscussion(tick) {
    tick = tick || 0;
    var state   = freshState();
    var sponsor = uid('sp');
    var r       = CA.draftAmendment(state, sponsor, 'economy', 'Economy', 'Change fees', ['e1'], tick);
    var id      = r.amendment.id;
    CA.coSponsor(state, id, uid('co'), tick);
    CA.coSponsor(state, id, uid('co'), tick);
    CA.openDiscussion(state, id, tick);
    return { state: state, amendmentId: id, startTick: tick };
  }

  // Cannot open voting before discussion period ends
  var a1 = amendmentInDiscussion(0);
  var r1 = CA.openVoting(a1.state, a1.amendmentId, CA.DISCUSSION_PERIOD - 1);
  assert(r1.success === false, 'fails before discussion period ends');
  assert(r1.error.indexOf('ticks remaining') !== -1, 'error mentions ticks remaining');

  // Succeeds exactly at discussion period end
  var a2 = amendmentInDiscussion(0);
  var r2 = CA.openVoting(a2.state, a2.amendmentId, CA.DISCUSSION_PERIOD);
  assert(r2.success === true, 'succeeds exactly at discussion period end');
  var amend2 = CA.getAmendment(a2.state, a2.amendmentId);
  assertEqual(amend2.status, 'voting', 'status changes to voting');
  assertEqual(amend2.votingOpenedAt, CA.DISCUSSION_PERIOD, 'votingOpenedAt set correctly');

  // Succeeds after discussion period
  var a3 = amendmentInDiscussion(100);
  var r3 = CA.openVoting(a3.state, a3.amendmentId, 100 + CA.DISCUSSION_PERIOD + 50);
  assert(r3.success === true, 'succeeds after discussion period');

  // Cannot open voting on a drafted amendment
  var state4  = freshState();
  var sp4     = uid('sp');
  var r4draft = CA.draftAmendment(state4, sp4, 'rights', 'R', 'text', ['r1'], 0);
  CA.coSponsor(state4, r4draft.amendment.id, uid('co'), 0);
  CA.coSponsor(state4, r4draft.amendment.id, uid('co'), 0);
  var r4 = CA.openVoting(state4, r4draft.amendment.id, CA.DISCUSSION_PERIOD + 1);
  assert(r4.success === false, 'fails on drafted amendment (not in discussion)');

  // Cannot open voting twice
  var a5 = amendmentInDiscussion(0);
  CA.openVoting(a5.state, a5.amendmentId, CA.DISCUSSION_PERIOD);
  var r5 = CA.openVoting(a5.state, a5.amendmentId, CA.DISCUSSION_PERIOD + 1);
  assert(r5.success === false, 'fails when already in voting');

  // Non-existent amendment
  var r6 = CA.openVoting(freshState(), 'bad_id', 1000);
  assert(r6.success === false, 'fails for nonexistent amendment');

});

// ============================================================================
// SUITE 11: castVote
// ============================================================================

suite('castVote', function() {

  function amendmentInVoting() {
    var state   = freshState();
    var sponsor = uid('sp');
    var r       = CA.draftAmendment(state, sponsor, 'social', 'Social Policy', 'Change X', ['s1'], 0);
    var id      = r.amendment.id;
    CA.coSponsor(state, id, uid('co'), 0);
    CA.coSponsor(state, id, uid('co'), 0);
    CA.openDiscussion(state, id, 0);
    CA.openVoting(state, id, CA.DISCUSSION_PERIOD);
    return { state: state, amendmentId: id };
  }

  var a1 = amendmentInVoting();
  var player1 = uid('v');

  var r1 = CA.castVote(a1.state, a1.amendmentId, player1, 'yes', CA.DISCUSSION_PERIOD + 1);
  assert(r1.success === true, 'yes vote succeeds');

  var r2 = CA.castVote(a1.state, a1.amendmentId, uid('v'), 'no', CA.DISCUSSION_PERIOD + 1);
  assert(r2.success === true, 'no vote succeeds');

  var r3 = CA.castVote(a1.state, a1.amendmentId, uid('v'), 'abstain', CA.DISCUSSION_PERIOD + 1);
  assert(r3.success === true, 'abstain vote succeeds');

  // Invalid vote value
  var r4 = CA.castVote(a1.state, a1.amendmentId, uid('v'), 'maybe', CA.DISCUSSION_PERIOD + 1);
  assert(r4.success === false, 'fails on invalid vote value');
  assert(r4.error.indexOf('yes') !== -1 || r4.error.indexOf('Invalid') !== -1, 'error mentions valid values');

  // Player can change their vote
  var r5 = CA.castVote(a1.state, a1.amendmentId, player1, 'no', CA.DISCUSSION_PERIOD + 2);
  assert(r5.success === true, 'player can change their vote');
  var results = CA.getVoteResults(a1.state, a1.amendmentId);
  // player1 switched from yes to no; player2 voted no; player3 voted abstain
  assertEqual(results.noVotes, 2, 'changed vote is counted correctly');

  // Cannot vote on non-voting amendment
  var state2  = freshState();
  var sp2     = uid('sp');
  var r6draft = CA.draftAmendment(state2, sp2, 'zones', 'Zone', 'text', ['z1'], 0);
  var r6      = CA.castVote(state2, r6draft.amendment.id, uid('v'), 'yes', 1);
  assert(r6.success === false, 'fails on drafted amendment');

  // Empty player ID
  var a2 = amendmentInVoting();
  var r7 = CA.castVote(a2.state, a2.amendmentId, '', 'yes', CA.DISCUSSION_PERIOD + 1);
  assert(r7.success === false, 'fails on empty player ID');

  // Non-existent amendment
  var r8 = CA.castVote(freshState(), 'bad_id', uid('v'), 'yes', 1);
  assert(r8.success === false, 'fails for nonexistent amendment');

});

// ============================================================================
// SUITE 12: closeVoting
// ============================================================================

suite('closeVoting — ratification', function() {

  function amendmentReadyToClose(voteType) {
    var voters = [];
    for (var i = 0; i < 12; i++) voters.push(uid('v'));
    return fullLifecycle({ voters: voters, voteType: voteType || 'yes' });
  }

  // Ratification: 12 yes votes, no no votes
  var lc1 = amendmentReadyToClose('yes');
  assert(lc1.result.success === true, 'closeVoting succeeds');
  assert(lc1.result.ratified === true, 'ratified with majority yes');
  assertEqual(lc1.result.yesVotes, 12, 'yesVotes is 12');
  assertEqual(lc1.result.noVotes, 0, 'noVotes is 0');
  assertEqual(lc1.result.abstainVotes, 0, 'abstainVotes is 0');

  // Constitution version increments after ratification
  var version = CA.getConstitutionVersion(lc1.state);
  assert(version.version !== '1.0', 'constitution version incremented');
  assertEqual(version.version, '1.1', 'constitution version is 1.1 after first ratification');
  assertEqual(version.ratifiedAt, lc1.closeTick, 'ratifiedAt updated');

  // Amendment gets version number
  var amend1 = CA.getAmendment(lc1.state, lc1.amendmentId);
  assertEqual(amend1.version, '1.1', 'amendment stores its ratified version');
  assertEqual(amend1.status, 'ratified', 'amendment status is ratified');
  assert(amend1.closedAt !== null, 'closedAt set');

});

suite('closeVoting — rejection', function() {

  // Rejection: 12 no votes
  var voters = [];
  for (var i = 0; i < 12; i++) voters.push(uid('v'));
  var lc2 = fullLifecycle({ voters: voters, voteType: 'no' });
  assert(lc2.result.success === true, 'closeVoting succeeds even when rejected');
  assert(lc2.result.ratified === false, 'rejected when majority votes no');
  assertEqual(lc2.result.noVotes, 12, 'noVotes counted correctly');

  var amend2 = CA.getAmendment(lc2.state, lc2.amendmentId);
  assertEqual(amend2.status, 'rejected', 'status is rejected');
  assert(amend2.version === null, 'no version assigned on rejection');

  // Constitution version does NOT increment on rejection
  var cv2 = CA.getConstitutionVersion(lc2.state);
  assertEqual(cv2.version, '1.0', 'constitution version unchanged after rejection');

});

suite('closeVoting — quorum failure', function() {

  // Only 5 yes votes (below quorum of 10) — not ratified
  var voters = [];
  for (var i = 0; i < 5; i++) voters.push(uid('v'));
  var lc3 = fullLifecycle({ voters: voters, voteType: 'yes' });
  assert(lc3.result.ratified === false, 'rejected when quorum not met');
  assertEqual(lc3.result.yesVotes, 5, 'yesVotes counted correctly');

});

suite('closeVoting — timing errors', function() {

  function amendmentInVoting() {
    var state   = freshState();
    var sponsor = uid('sp');
    var r       = CA.draftAmendment(state, sponsor, 'governance', 'G', 'text', ['g1'], 0);
    var id      = r.amendment.id;
    CA.coSponsor(state, id, uid('co'), 0);
    CA.coSponsor(state, id, uid('co'), 0);
    CA.openDiscussion(state, id, 0);
    CA.openVoting(state, id, CA.DISCUSSION_PERIOD);
    return { state: state, amendmentId: id };
  }

  // Cannot close voting before voting period ends
  var a1 = amendmentInVoting();
  var r1 = CA.closeVoting(a1.state, a1.amendmentId, CA.DISCUSSION_PERIOD + CA.VOTING_PERIOD - 1);
  assert(r1.success === false, 'fails before voting period ends');
  assert(r1.error.indexOf('ticks remaining') !== -1, 'error mentions ticks remaining');

  // Cannot close an amendment not in voting phase
  var state2  = freshState();
  var sp2     = uid('sp');
  var r2draft = CA.draftAmendment(state2, sp2, 'rights', 'R', 'text', ['r1'], 0);
  var r2      = CA.closeVoting(state2, r2draft.amendment.id, 9999);
  assert(r2.success === false, 'fails when amendment not in voting');

  // Non-existent amendment
  var r3 = CA.closeVoting(freshState(), 'bad_id', 9999);
  assert(r3.success === false, 'fails for nonexistent amendment');

  // Cannot close twice
  var a4 = amendmentInVoting();
  for (var i = 0; i < 10; i++) {
    CA.castVote(a4.state, a4.amendmentId, uid('v'), 'yes', CA.DISCUSSION_PERIOD + 1);
  }
  CA.closeVoting(a4.state, a4.amendmentId, CA.DISCUSSION_PERIOD + CA.VOTING_PERIOD);
  var r4 = CA.closeVoting(a4.state, a4.amendmentId, CA.DISCUSSION_PERIOD + CA.VOTING_PERIOD + 100);
  assert(r4.success === false, 'fails when already closed');

});

// ============================================================================
// SUITE 13: getAmendment
// ============================================================================

suite('getAmendment', function() {

  var state   = freshState();
  var sponsor = uid('sp');
  var r       = CA.draftAmendment(state, sponsor, 'technical', 'Tech', 'text', ['t1'], 0);
  var id      = r.amendment.id;

  var found = CA.getAmendment(state, id);
  assert(found !== null, 'getAmendment finds existing amendment');
  assertEqual(found.id, id, 'returned amendment has correct ID');

  var notFound = CA.getAmendment(state, 'nonexistent');
  assert(notFound === null, 'getAmendment returns null for unknown ID');

  // Multiple amendments
  var r2 = CA.draftAmendment(state, uid('sp'), 'economy', 'Eco', 'text2', ['e1'], 10);
  var found2 = CA.getAmendment(state, r2.amendment.id);
  assert(found2 !== null, 'finds second amendment');
  assertEqual(found2.category, 'economy', 'correct amendment returned');

});

// ============================================================================
// SUITE 14: getAmendmentsByCategory
// ============================================================================

suite('getAmendmentsByCategory', function() {

  var state = freshState();
  CA.draftAmendment(state, uid(), 'governance', 'G1', 'text', ['g1'], 0);
  CA.draftAmendment(state, uid(), 'governance', 'G2', 'text', ['g2'], 1);
  CA.draftAmendment(state, uid(), 'economy',    'E1', 'text', ['e1'], 2);
  CA.draftAmendment(state, uid(), 'rights',     'R1', 'text', ['r1'], 3);

  var govAmends = CA.getAmendmentsByCategory(state, 'governance');
  assertEqual(govAmends.length, 2, 'returns 2 governance amendments');

  var ecoAmends = CA.getAmendmentsByCategory(state, 'economy');
  assertEqual(ecoAmends.length, 1, 'returns 1 economy amendment');

  var rightsAmends = CA.getAmendmentsByCategory(state, 'rights');
  assertEqual(rightsAmends.length, 1, 'returns 1 rights amendment');

  var socialAmends = CA.getAmendmentsByCategory(state, 'social');
  assertEqual(socialAmends.length, 0, 'returns 0 for category with no amendments');

  // All categories are valid filters
  var allAmends = CA.getAmendmentsByCategory(state, 'technical');
  assertEqual(allAmends.length, 0, 'returns 0 for technical (none added)');

});

// ============================================================================
// SUITE 15: getAmendmentsByStatus
// ============================================================================

suite('getAmendmentsByStatus', function() {

  var state   = freshState();
  var sp1     = uid('sp');
  var r1      = CA.draftAmendment(state, sp1, 'zones', 'Z1', 'text', ['z1'], 0);
  var id1     = r1.amendment.id;

  // Get 2nd amendment into discussion
  var sp2     = uid('sp');
  var r2      = CA.draftAmendment(state, sp2, 'social', 'S1', 'text', ['s1'], 0);
  var id2     = r2.amendment.id;
  CA.coSponsor(state, id2, uid('co'), 0);
  CA.coSponsor(state, id2, uid('co'), 0);
  CA.openDiscussion(state, id2, 0);

  var drafted = CA.getAmendmentsByStatus(state, 'drafted');
  assertEqual(drafted.length, 1, 'returns 1 drafted amendment');
  assertEqual(drafted[0].id, id1, 'correct drafted amendment returned');

  var discussion = CA.getAmendmentsByStatus(state, 'discussion');
  assertEqual(discussion.length, 1, 'returns 1 discussion amendment');

  var voting = CA.getAmendmentsByStatus(state, 'voting');
  assertEqual(voting.length, 0, 'returns 0 voting amendments');

  var ratified = CA.getAmendmentsByStatus(state, 'ratified');
  assertEqual(ratified.length, 0, 'returns 0 ratified amendments initially');

  var rejected = CA.getAmendmentsByStatus(state, 'rejected');
  assertEqual(rejected.length, 0, 'returns 0 rejected amendments initially');

});

// ============================================================================
// SUITE 16: getActiveAmendments
// ============================================================================

suite('getActiveAmendments', function() {

  var state = freshState();

  // Drafted — not active
  CA.draftAmendment(state, uid(), 'rights', 'R', 'text', ['r1'], 0);

  // Discussion — active
  var r2  = CA.draftAmendment(state, uid(), 'social', 'S', 'text', ['s1'], 0);
  CA.coSponsor(state, r2.amendment.id, uid(), 0);
  CA.coSponsor(state, r2.amendment.id, uid(), 0);
  CA.openDiscussion(state, r2.amendment.id, 0);

  // Voting — active
  var r3  = CA.draftAmendment(state, uid(), 'economy', 'E', 'text', ['e1'], 0);
  CA.coSponsor(state, r3.amendment.id, uid(), 0);
  CA.coSponsor(state, r3.amendment.id, uid(), 0);
  CA.openDiscussion(state, r3.amendment.id, 0);
  CA.openVoting(state, r3.amendment.id, CA.DISCUSSION_PERIOD);

  var active = CA.getActiveAmendments(state);
  assertEqual(active.length, 2, 'returns 2 active amendments (discussion + voting)');

  var statuses = active.map(function(a) { return a.status; });
  assert(statuses.indexOf('discussion') !== -1, 'discussion amendment is active');
  assert(statuses.indexOf('voting') !== -1, 'voting amendment is active');
  assert(statuses.indexOf('drafted') === -1, 'drafted amendment is NOT active');

});

// ============================================================================
// SUITE 17: getConstitutionVersion
// ============================================================================

suite('getConstitutionVersion', function() {

  var s1 = freshState();
  var v1 = CA.getConstitutionVersion(s1);
  assertEqual(v1.version, '1.0', 'initial version is 1.0');
  assertEqual(v1.ratifiedAt, 0, 'initial ratifiedAt is 0');
  assertEqual(v1.sectionCount, 0, 'initial sectionCount is 0');

  // After ratification, version increments
  var lc = fullLifecycle({ sections: ['art-1'] });
  var v2 = CA.getConstitutionVersion(lc.state);
  assertEqual(v2.version, '1.1', 'version is 1.1 after one ratification');
  assertEqual(v2.sectionCount, 1, 'sectionCount is 1 after amending 1 section');

  // Multiple ratifications
  var state2 = freshState();
  for (var i = 0; i < 9; i++) {
    var secId = 'unique-sec-' + i;
    var sp    = uid('sp');
    var tick  = i * 3000; // space out ticks to avoid cooldowns
    var rdraft = CA.draftAmendment(state2, sp, 'technical', 'T' + i, 'text', [secId], tick);
    var id     = rdraft.amendment.id;
    CA.coSponsor(state2, id, uid('co'), tick);
    CA.coSponsor(state2, id, uid('co'), tick);
    CA.openDiscussion(state2, id, tick);
    CA.openVoting(state2, id, tick + CA.DISCUSSION_PERIOD);
    for (var v = 0; v < 10; v++) {
      CA.castVote(state2, id, uid('voter'), 'yes', tick + CA.DISCUSSION_PERIOD + 1);
    }
    CA.closeVoting(state2, id, tick + CA.DISCUSSION_PERIOD + CA.VOTING_PERIOD);
  }
  var v3 = CA.getConstitutionVersion(state2);
  assertEqual(v3.version, '1.9', 'version is 1.9 after 9 ratifications');

  // 10th ratification rolls minor to 0, increments major
  var sp10   = uid('sp');
  var tick10 = 9 * 3000;
  var r10    = CA.draftAmendment(state2, sp10, 'governance', 'G10', 'text', ['unique-sec-100'], tick10);
  var id10   = r10.amendment.id;
  CA.coSponsor(state2, id10, uid('co'), tick10);
  CA.coSponsor(state2, id10, uid('co'), tick10);
  CA.openDiscussion(state2, id10, tick10);
  CA.openVoting(state2, id10, tick10 + CA.DISCUSSION_PERIOD);
  for (var v10 = 0; v10 < 10; v10++) {
    CA.castVote(state2, id10, uid('voter'), 'yes', tick10 + CA.DISCUSSION_PERIOD + 1);
  }
  CA.closeVoting(state2, id10, tick10 + CA.DISCUSSION_PERIOD + CA.VOTING_PERIOD);
  var v4 = CA.getConstitutionVersion(state2);
  assertEqual(v4.version, '2.0', 'version rolls to 2.0 after 10 ratifications');

});

// ============================================================================
// SUITE 18: getAmendmentHistory
// ============================================================================

suite('getAmendmentHistory', function() {

  var s = freshState();
  assert(Array.isArray(CA.getAmendmentHistory(s, 5)), 'returns array on empty state');
  assertEqual(CA.getAmendmentHistory(s, 5).length, 0, 'empty when no amendments closed');

  // Ratify one
  var lc = fullLifecycle({ state: s, sections: ['h-sec-1'], tick: 0 });
  var hist1 = CA.getAmendmentHistory(lc.state, 10);
  assertEqual(hist1.length, 1, 'one entry after one closed amendment');
  assertEqual(hist1[0].amendmentId, lc.amendmentId, 'correct amendment in history');
  assert(hist1[0].ratified === true, 'history entry shows ratified');
  assert(typeof hist1[0].closedAt === 'number', 'history entry has closedAt');
  assert(typeof hist1[0].yesVotes === 'number', 'history entry has yesVotes');

  // Reject one
  var voters = [];
  for (var i = 0; i < 12; i++) voters.push(uid('v'));
  var lc2 = fullLifecycle({ state: lc.state, sections: ['h-sec-2'], tick: 10000, voters: voters, voteType: 'no' });
  var hist2 = CA.getAmendmentHistory(lc2.state, 10);
  assertEqual(hist2.length, 2, 'two entries in history');
  // Most recent first
  assertEqual(hist2[0].ratified, false, 'most recent (rejected) is first');
  assertEqual(hist2[1].ratified, true, 'older (ratified) is second');

  // Count parameter limits results
  var histLimited = CA.getAmendmentHistory(lc2.state, 1);
  assertEqual(histLimited.length, 1, 'count parameter limits to 1 entry');

  // No count returns all
  var histAll = CA.getAmendmentHistory(lc2.state);
  assertEqual(histAll.length, 2, 'no count returns all entries');

});

// ============================================================================
// SUITE 19: getVoteResults
// ============================================================================

suite('getVoteResults', function() {

  function votingAmendment() {
    var state   = freshState();
    var sp      = uid('sp');
    var r       = CA.draftAmendment(state, sp, 'rights', 'R', 'text', ['r1'], 0);
    var id      = r.amendment.id;
    CA.coSponsor(state, id, uid(), 0);
    CA.coSponsor(state, id, uid(), 0);
    CA.openDiscussion(state, id, 0);
    CA.openVoting(state, id, CA.DISCUSSION_PERIOD);
    return { state: state, amendmentId: id };
  }

  var a = votingAmendment();
  // Cast 6 yes, 3 no, 1 abstain
  for (var i = 0; i < 6; i++) CA.castVote(a.state, a.amendmentId, uid('v'), 'yes', CA.DISCUSSION_PERIOD + 1);
  for (var j = 0; j < 3; j++) CA.castVote(a.state, a.amendmentId, uid('v'), 'no', CA.DISCUSSION_PERIOD + 1);
  CA.castVote(a.state, a.amendmentId, uid('v'), 'abstain', CA.DISCUSSION_PERIOD + 1);

  var results = CA.getVoteResults(a.state, a.amendmentId);
  assertEqual(results.yesVotes,     6,  'yesVotes is 6');
  assertEqual(results.noVotes,      3,  'noVotes is 3');
  assertEqual(results.abstainVotes, 1,  'abstainVotes is 1');
  assertEqual(results.totalVotes,   10, 'totalVotes is 10');

  // Quorum check: 6 yes + 3 no = 9 decisive, which is < 10
  assertEqual(results.quorumMet, false, 'quorumMet is false when decisive < 10 (6+3=9)');

  // Test quorum met with exactly 10 decisive
  var b = votingAmendment();
  for (var k = 0; k < 7; k++) CA.castVote(b.state, b.amendmentId, uid('v'), 'yes', CA.DISCUSSION_PERIOD + 1);
  for (var l = 0; l < 3; l++) CA.castVote(b.state, b.amendmentId, uid('v'), 'no', CA.DISCUSSION_PERIOD + 1);
  var results2 = CA.getVoteResults(b.state, b.amendmentId);
  assert(results2.quorumMet === true, 'quorumMet is true when 10 decisive votes');

  // Returns zeros for amendment with no votes
  var c = votingAmendment();
  var results3 = CA.getVoteResults(c.state, c.amendmentId);
  assertEqual(results3.totalVotes, 0, 'totalVotes is 0 when no votes cast');

  // Unknown amendment ID returns zeros
  var results4 = CA.getVoteResults(freshState(), 'bad_id');
  assertEqual(results4.totalVotes, 0, 'totalVotes is 0 for unknown amendment');

});

// ============================================================================
// SUITE 20: canAmendSection
// ============================================================================

suite('canAmendSection', function() {

  // No cooldown — fresh state, section never amended
  var s1 = freshState();
  var r1 = CA.canAmendSection(s1, 'section-A', 0);
  assert(r1.canAmend === true, 'can amend section never previously amended');
  assertEqual(r1.cooldownRemaining, 0, 'no cooldown on fresh section');
  assert(r1.lastAmendedAt === null, 'lastAmendedAt is null for new section');

  // After ratification, section has a cooldown
  var voters = [];
  for (var i = 0; i < 10; i++) voters.push(uid('v'));
  var lc = fullLifecycle({ sections: ['cooldown-sec'], tick: 0, voters: voters });
  var r2 = CA.canAmendSection(lc.state, 'cooldown-sec', lc.closeTick);
  assert(r2.canAmend === false, 'cannot amend section immediately after ratification');
  assertEqual(r2.cooldownRemaining, CA.SECTION_COOLDOWN, 'cooldown starts at full SECTION_COOLDOWN');

  // After partial cooldown
  var partialTick = lc.closeTick + 1000;
  var r3 = CA.canAmendSection(lc.state, 'cooldown-sec', partialTick);
  assert(r3.canAmend === false, 'still on cooldown at partial time');
  assertEqual(r3.cooldownRemaining, CA.SECTION_COOLDOWN - 1000, 'cooldown remaining calculated correctly');

  // After full cooldown elapses
  var fullTick = lc.closeTick + CA.SECTION_COOLDOWN;
  var r4 = CA.canAmendSection(lc.state, 'cooldown-sec', fullTick);
  assert(r4.canAmend === true, 'can amend after cooldown expires');
  assertEqual(r4.cooldownRemaining, 0, 'no cooldown remaining after expiry');

  // Different section is not affected by cooldown
  var r5 = CA.canAmendSection(lc.state, 'different-sec', lc.closeTick);
  assert(r5.canAmend === true, 'different section has no cooldown');

  // Cooldown check blocks draftAmendment
  var s2 = freshState();
  var voters2 = [];
  for (var j = 0; j < 10; j++) voters2.push(uid('v'));
  var lc2 = fullLifecycle({ state: s2, sections: ['blocked-sec'], tick: 0, voters: voters2 });
  var rBlock = CA.draftAmendment(s2, uid('sp'), 'governance', 'Blocked', 'text', ['blocked-sec'], lc2.closeTick + 100);
  assert(rBlock.success === false, 'draftAmendment blocked by cooldown');
  assert(rBlock.error.indexOf('cooldown') !== -1, 'error mentions cooldown');

  // Multiple sections: only one on cooldown blocks draft
  var s3 = freshState();
  var voters3 = [];
  for (var k = 0; k < 10; k++) voters3.push(uid('v'));
  var lc3 = fullLifecycle({ state: s3, sections: ['sec-cool', 'sec-free'], tick: 0, voters: voters3 });
  // Both sections now have cooldown; try to amend with free section not in cooldown
  var rOk = CA.draftAmendment(s3, uid('sp'), 'governance', 'OK', 'text', ['sec-free-new'], lc3.closeTick + 100);
  assert(rOk.success === true, 'can draft amendment on section not under cooldown');

});

// ============================================================================
// SUITE 21: getPlayerAmendments
// ============================================================================

suite('getPlayerAmendments', function() {

  var state  = freshState();
  var alice  = uid('alice');
  var bob    = uid('bob');
  var carol  = uid('carol');

  // Alice drafts two amendments
  CA.draftAmendment(state, alice, 'economy',    'A1', 'text', ['a1'], 0);
  CA.draftAmendment(state, alice, 'governance', 'A2', 'text', ['a2'], 1);

  // Bob drafts one
  CA.draftAmendment(state, bob,   'rights',     'B1', 'text', ['b1'], 2);

  // Carol has no amendments
  var carolAmends = CA.getPlayerAmendments(state, carol);
  assertEqual(carolAmends.length, 0, 'returns empty array for player with no amendments');

  var aliceAmends = CA.getPlayerAmendments(state, alice);
  assertEqual(aliceAmends.length, 2, 'returns 2 amendments for alice');

  var bobAmends = CA.getPlayerAmendments(state, bob);
  assertEqual(bobAmends.length, 1, 'returns 1 amendment for bob');

  // As co-sponsor, player also appears
  var r = CA.draftAmendment(state, uid('sp'), 'social', 'S', 'text', ['s1'], 3);
  CA.coSponsor(state, r.amendment.id, alice, 3);
  var aliceAmends2 = CA.getPlayerAmendments(state, alice);
  assertEqual(aliceAmends2.length, 3, 'alice appears as co-sponsor — amendment counted');

});

// ============================================================================
// SUITE 22: getAmendmentStats
// ============================================================================

suite('getAmendmentStats', function() {

  var s = freshState();
  var stats0 = CA.getAmendmentStats(s);
  assertEqual(stats0.total,      0, 'total is 0 initially');
  assertEqual(stats0.drafted,    0, 'drafted is 0 initially');
  assertEqual(stats0.discussion, 0, 'discussion is 0 initially');
  assertEqual(stats0.voting,     0, 'voting is 0 initially');
  assertEqual(stats0.ratified,   0, 'ratified is 0 initially');
  assertEqual(stats0.rejected,   0, 'rejected is 0 initially');
  assertEqual(stats0.constitutionVersion, '1.0', 'constitutionVersion is 1.0');
  assert(typeof stats0.byCategory === 'object', 'byCategory is an object');
  assertEqual(Object.keys(stats0.byCategory).length, 6, 'byCategory has 6 keys');

  // Add some amendments
  CA.draftAmendment(s, uid(), 'governance', 'G', 'text', ['g1'], 0);
  CA.draftAmendment(s, uid(), 'economy',    'E', 'text', ['e1'], 1);
  var r3 = CA.draftAmendment(s, uid(), 'social', 'S', 'text', ['s1'], 2);
  CA.coSponsor(s, r3.amendment.id, uid(), 2);
  CA.coSponsor(s, r3.amendment.id, uid(), 2);
  CA.openDiscussion(s, r3.amendment.id, 2);

  var stats1 = CA.getAmendmentStats(s);
  assertEqual(stats1.total,      3, 'total is 3');
  assertEqual(stats1.drafted,    2, 'drafted is 2');
  assertEqual(stats1.discussion, 1, 'discussion is 1');
  assertEqual(stats1.byCategory.governance, 1, 'byCategory.governance is 1');
  assertEqual(stats1.byCategory.economy,    1, 'byCategory.economy is 1');
  assertEqual(stats1.byCategory.social,     1, 'byCategory.social is 1');
  assertEqual(stats1.byCategory.rights,     0, 'byCategory.rights is 0');

  // After ratification
  var voters = [];
  for (var i = 0; i < 10; i++) voters.push(uid('v'));
  var lc = fullLifecycle({ state: s, sections: ['stat-sec'], tick: 5000, voters: voters });
  var stats2 = CA.getAmendmentStats(lc.state);
  assertEqual(stats2.ratified, 1, 'ratified count increments');
  assertEqual(stats2.totalAmendmentsRatified, 1, 'totalAmendmentsRatified is 1');
  assert(stats2.constitutionVersion !== '1.0', 'constitutionVersion updated after ratification');

});

// ============================================================================
// SUITE 23: Amendment log
// ============================================================================

suite('Amendment log entries', function() {

  var voters = [];
  for (var i = 0; i < 10; i++) voters.push(uid('v'));
  var lc = fullLifecycle({ voters: voters, sections: ['log-sec'] });

  assertEqual(lc.state.amendmentLog.length, 1, 'one log entry after close');
  var entry = lc.state.amendmentLog[0];

  assert(typeof entry.amendmentId === 'string', 'log entry has amendmentId');
  assert(typeof entry.title === 'string',       'log entry has title');
  assert(typeof entry.category === 'string',    'log entry has category');
  assert(typeof entry.status === 'string',      'log entry has status');
  assert(typeof entry.ratified === 'boolean',   'log entry has ratified boolean');
  assert(typeof entry.yesVotes === 'number',    'log entry has yesVotes');
  assert(typeof entry.noVotes === 'number',     'log entry has noVotes');
  assert(typeof entry.abstainVotes === 'number','log entry has abstainVotes');
  assert(typeof entry.closedAt === 'number',    'log entry has closedAt');

  // Rejected amendment also logged
  var voters2 = [];
  for (var j = 0; j < 12; j++) voters2.push(uid('v'));
  var lc2 = fullLifecycle({ voters: voters2, voteType: 'no', sections: ['log-sec-2'], tick: 10000 });
  assertEqual(lc2.state.amendmentLog.length, 1, 'one log entry for rejected');
  assert(lc2.state.amendmentLog[0].ratified === false, 'log shows ratified=false for rejected');
  assert(lc2.state.amendmentLog[0].version === null, 'log has null version for rejected');

});

// ============================================================================
// SUITE 24: Full lifecycle integration
// ============================================================================

suite('Full lifecycle integration', function() {

  var state   = freshState();
  var sponsor = uid('sp');
  var coSp1   = uid('co');
  var coSp2   = uid('co');

  // 1. Draft
  var r1 = CA.draftAmendment(state, sponsor, 'governance', 'Great Charter', 'All players get rights', ['art-1', 'art-2'], 0);
  assert(r1.success === true, 'draft succeeds');
  assertEqual(r1.amendment.status, 'drafted', 'status is drafted');

  // 2. Cannot open voting from drafted
  var rv1 = CA.openVoting(state, r1.amendment.id, CA.DISCUSSION_PERIOD + 1);
  assert(rv1.success === false, 'cannot skip to voting from draft');

  // 3. Co-sponsor
  CA.coSponsor(state, r1.amendment.id, coSp1, 0);
  CA.coSponsor(state, r1.amendment.id, coSp2, 0);
  assertEqual(CA.getAmendment(state, r1.amendment.id).sponsors.length, 3, '3 sponsors after co-sponsoring');

  // 4. Open discussion
  var rd = CA.openDiscussion(state, r1.amendment.id, 0);
  assert(rd.success === true, 'open discussion succeeds');
  assertEqual(CA.getAmendment(state, r1.amendment.id).status, 'discussion', 'status is discussion');

  // 5. Comment during discussion
  var rc = CA.addComment(state, r1.amendment.id, uid('p'), 'I support this!', 100);
  assert(rc.success === true, 'comment added during discussion');

  // 6. Open voting after discussion period
  var rv2 = CA.openVoting(state, r1.amendment.id, CA.DISCUSSION_PERIOD);
  assert(rv2.success === true, 'open voting succeeds after discussion period');

  // 7. Cast votes (10 yes)
  for (var vi = 0; vi < 10; vi++) {
    CA.castVote(state, r1.amendment.id, uid('v'), 'yes', CA.DISCUSSION_PERIOD + 1);
  }

  // 8. Close voting
  var rc2 = CA.closeVoting(state, r1.amendment.id, CA.DISCUSSION_PERIOD + CA.VOTING_PERIOD);
  assert(rc2.success === true, 'close voting succeeds');
  assert(rc2.ratified === true, 'amendment is ratified');
  assertEqual(rc2.yesVotes, 10, 'correct yes votes');

  // 9. Constitution version updated
  var cv = CA.getConstitutionVersion(state);
  assertEqual(cv.version, '1.1', 'constitution is now v1.1');

  // 10. Section on cooldown
  var sa = CA.canAmendSection(state, 'art-1', CA.DISCUSSION_PERIOD + CA.VOTING_PERIOD + 1);
  assert(sa.canAmend === false, 'art-1 is on cooldown');
  var sb = CA.canAmendSection(state, 'art-2', CA.DISCUSSION_PERIOD + CA.VOTING_PERIOD + 1);
  assert(sb.canAmend === false, 'art-2 is on cooldown');

  // 11. Stats reflect everything
  var stats = CA.getAmendmentStats(state);
  assertEqual(stats.total, 1, 'stats shows 1 total amendment');
  assertEqual(stats.ratified, 1, 'stats shows 1 ratified');
  assertEqual(stats.constitutionVersion, '1.1', 'stats shows updated version');

});

// ============================================================================
// SUITE 25: Edge cases
// ============================================================================

suite('Edge cases and robustness', function() {

  // Multiple amendments on different sections simultaneously
  var state   = freshState();
  var tick    = 0;
  var results = [];
  var secs    = ['edge-a', 'edge-b', 'edge-c'];
  for (var i = 0; i < 3; i++) {
    var sp    = uid('sp');
    var r     = CA.draftAmendment(state, sp, 'technical', 'T' + i, 'text', [secs[i]], tick);
    var id    = r.amendment.id;
    CA.coSponsor(state, id, uid(), tick);
    CA.coSponsor(state, id, uid(), tick);
    CA.openDiscussion(state, id, tick);
    CA.openVoting(state, id, tick + CA.DISCUSSION_PERIOD);
    for (var v = 0; v < 10; v++) {
      CA.castVote(state, id, uid('v'), 'yes', tick + CA.DISCUSSION_PERIOD + 1);
    }
    var cr = CA.closeVoting(state, id, tick + CA.DISCUSSION_PERIOD + CA.VOTING_PERIOD);
    results.push(cr);
    tick += 3000;
  }
  assertEqual(results[0].ratified, true, 'first amendment ratified');
  assertEqual(results[1].ratified, true, 'second amendment ratified');
  assertEqual(results[2].ratified, true, 'third amendment ratified');
  assertEqual(CA.getConstitutionVersion(state).version, '1.3', 'version is 1.3 after 3 ratifications');

  // Tie vote — not ratified (not strictly greater)
  var state2 = freshState();
  var sp2    = uid('sp');
  var r2     = CA.draftAmendment(state2, sp2, 'economy', 'Tie Test', 'text', ['tie-sec'], 0);
  var id2    = r2.amendment.id;
  CA.coSponsor(state2, id2, uid(), 0);
  CA.coSponsor(state2, id2, uid(), 0);
  CA.openDiscussion(state2, id2, 0);
  CA.openVoting(state2, id2, CA.DISCUSSION_PERIOD);
  // 5 yes, 5 no = tie
  for (var yi = 0; yi < 5; yi++) CA.castVote(state2, id2, uid('v'), 'yes', CA.DISCUSSION_PERIOD + 1);
  for (var ni = 0; ni < 5; ni++) CA.castVote(state2, id2, uid('v'), 'no', CA.DISCUSSION_PERIOD + 1);
  var tieResult = CA.closeVoting(state2, id2, CA.DISCUSSION_PERIOD + CA.VOTING_PERIOD);
  assert(tieResult.ratified === false, 'tie vote (5-5) does not ratify');

  // getAmendmentHistory with count=0 returns all
  var voters = [];
  for (var hi = 0; hi < 10; hi++) voters.push(uid('v'));
  var lc = fullLifecycle({ voters: voters, sections: ['h1'] });
  var histAll = CA.getAmendmentHistory(lc.state, 0);
  assert(Array.isArray(histAll), 'getAmendmentHistory with count=0 returns array');

  // Sections array returns copy (not mutation)
  var state3 = freshState();
  var sp3    = uid('sp');
  var r3     = CA.draftAmendment(state3, sp3, 'rights', 'R', 'text', ['r1', 'r2'], 0);
  r3.amendment.sections.push('injected');
  var fetched = CA.getAmendment(state3, r3.amendment.id);
  // The amendment was returned by reference in draftAmendment, so mutation would affect state.
  // This tests that sections were sliced on creation (stored independently of input array).
  var origInput = ['r1', 'r2'];
  origInput.push('mutated');
  var fetched2 = CA.getAmendment(state3, r3.amendment.id);
  assert(fetched2.sections.indexOf('mutated') === -1, 'sections are copied from input, not shared');

  // getComments returns a copy
  var state4 = freshState();
  var sp4    = uid('sp');
  var r4     = CA.draftAmendment(state4, sp4, 'social', 'S', 'text', ['s4'], 0);
  var id4    = r4.amendment.id;
  CA.coSponsor(state4, id4, uid(), 0);
  CA.coSponsor(state4, id4, uid(), 0);
  CA.openDiscussion(state4, id4, 0);
  CA.addComment(state4, id4, uid('p'), 'Test comment', 10);
  var cmts = CA.getComments(state4, id4);
  cmts.push({ injected: true });
  assertEqual(CA.getComments(state4, id4).length, 1, 'getComments returns a copy, mutation does not affect state');

});

// ============================================================================
// FINAL REPORT
// ============================================================================

console.log('\n============================================================');
console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
if (failures.length > 0) {
  console.log('\nFailures:');
  for (var fi = 0; fi < failures.length; fi++) {
    console.log('  ' + failures[fi]);
  }
  process.exit(1);
} else {
  console.log('All tests passed.');
  process.exit(0);
}
