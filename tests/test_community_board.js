/**
 * tests/test_community_board.js
 * 125+ tests for the ZION Community Board system.
 * Standalone runner — no external test framework required.
 * Run with: node tests/test_community_board.js
 */

'use strict';

var CommunityBoard = require('../src/js/community_board');

var passed = 0;
var failed = 0;
var failures = [];

function assert(condition, msg) {
  if (!condition) {
    throw new Error(msg || 'Assertion failed');
  }
}

function assertEqual(a, b, msg) {
  if (a !== b) {
    throw new Error((msg || 'Expected equality') + ': got ' + JSON.stringify(a) + ' !== ' + JSON.stringify(b));
  }
}

function assertNotEqual(a, b, msg) {
  if (a === b) {
    throw new Error((msg || 'Expected inequality') + ': both are ' + JSON.stringify(a));
  }
}

function assertNull(val, msg) {
  if (val !== null && val !== undefined) {
    throw new Error((msg || 'Expected null/undefined') + ': got ' + JSON.stringify(val));
  }
}

function assertNotNull(val, msg) {
  if (val === null || val === undefined) {
    throw new Error((msg || 'Expected non-null') + ': got null/undefined');
  }
}

function assertGreater(a, b, msg) {
  if (!(a > b)) {
    throw new Error((msg || 'Expected ' + a + ' > ' + b) + ': got ' + JSON.stringify(a));
  }
}

function assertGTE(a, b, msg) {
  if (!(a >= b)) {
    throw new Error((msg || 'Expected ' + a + ' >= ' + b) + ': got ' + JSON.stringify(a));
  }
}

function assertLTE(a, b, msg) {
  if (!(a <= b)) {
    throw new Error((msg || 'Expected ' + a + ' <= ' + b) + ': got ' + JSON.stringify(a));
  }
}

function assertArrayLength(arr, len, msg) {
  if (!Array.isArray(arr)) throw new Error((msg || 'Expected array') + ': got ' + typeof arr);
  if (arr.length !== len) {
    throw new Error((msg || 'Expected length ' + len) + ': got ' + arr.length);
  }
}

function test(name, fn) {
  try {
    fn();
    passed++;
    process.stdout.write('  PASS ' + name + '\n');
  } catch (e) {
    failed++;
    failures.push({ name: name, error: e.message });
    process.stdout.write('  FAIL ' + name + '\n       ' + e.message + '\n');
  }
}

function suite(name) {
  process.stdout.write('\n--- ' + name + ' ---\n');
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function makeState() {
  return CommunityBoard.createState();
}

function makePost(state, overrides) {
  var opts = overrides || {};
  return CommunityBoard.createPost(
    state,
    opts.authorId || 'player1',
    opts.zone || 'nexus',
    opts.type || 'general',
    opts.title || 'Hello World',
    opts.content || 'This is a test post.',
    opts.tick || 100
  );
}

function make500CharContent() {
  var s = '';
  for (var i = 0; i < 500; i++) s += 'a';
  return s;
}

function make501CharContent() {
  return make500CharContent() + 'b';
}

// ===========================================================================
// SUITE 1: POST_TYPES constants
// ===========================================================================
suite('POST_TYPES constants');

test('POST_TYPES is an array', function() {
  assert(Array.isArray(CommunityBoard.POST_TYPES), 'POST_TYPES is an array');
});

test('POST_TYPES has exactly 5 types', function() {
  assertArrayLength(CommunityBoard.POST_TYPES, 5, 'POST_TYPES has 5 entries');
});

test('all 5 type ids are present', function() {
  var ids = CommunityBoard.POST_TYPES.map(function(t) { return t.id; });
  var expected = ['announcement', 'event', 'trade_listing', 'help_wanted', 'general'];
  for (var i = 0; i < expected.length; i++) {
    assert(ids.indexOf(expected[i]) !== -1, 'Has type: ' + expected[i]);
  }
});

test('each type has required fields', function() {
  var required = ['id', 'name', 'description', 'icon', 'defaultExpiryTicks', 'allowNpcPost', 'requiresSteward'];
  for (var i = 0; i < CommunityBoard.POST_TYPES.length; i++) {
    var t = CommunityBoard.POST_TYPES[i];
    for (var f = 0; f < required.length; f++) {
      assert(t[required[f]] !== undefined, t.id + ' has field: ' + required[f]);
    }
  }
});

test('defaultExpiryTicks is 500 for all types', function() {
  for (var i = 0; i < CommunityBoard.POST_TYPES.length; i++) {
    assertEqual(CommunityBoard.POST_TYPES[i].defaultExpiryTicks, 500, CommunityBoard.POST_TYPES[i].id + ' defaultExpiryTicks is 500');
  }
});

test('announcement allowNpcPost is true', function() {
  var t = null;
  for (var i = 0; i < CommunityBoard.POST_TYPES.length; i++) {
    if (CommunityBoard.POST_TYPES[i].id === 'announcement') { t = CommunityBoard.POST_TYPES[i]; break; }
  }
  assertNotNull(t, 'announcement type found');
  assert(t.allowNpcPost === true, 'announcement allowNpcPost is true');
});

test('help_wanted allowNpcPost is false', function() {
  var t = null;
  for (var i = 0; i < CommunityBoard.POST_TYPES.length; i++) {
    if (CommunityBoard.POST_TYPES[i].id === 'help_wanted') { t = CommunityBoard.POST_TYPES[i]; break; }
  }
  assertNotNull(t, 'help_wanted type found');
  assert(t.allowNpcPost === false, 'help_wanted allowNpcPost is false');
});

test('general allowNpcPost is false', function() {
  var t = null;
  for (var i = 0; i < CommunityBoard.POST_TYPES.length; i++) {
    if (CommunityBoard.POST_TYPES[i].id === 'general') { t = CommunityBoard.POST_TYPES[i]; break; }
  }
  assertNotNull(t, 'general type found');
  assert(t.allowNpcPost === false, 'general allowNpcPost is false');
});

test('POST_CHAR_LIMIT is 500', function() {
  assertEqual(CommunityBoard.POST_CHAR_LIMIT, 500, 'POST_CHAR_LIMIT is 500');
});

test('MAX_PINS_PER_BOARD is 3', function() {
  assertEqual(CommunityBoard.MAX_PINS_PER_BOARD, 3, 'MAX_PINS_PER_BOARD is 3');
});

test('DEFAULT_EXPIRY_TICKS is 500', function() {
  assertEqual(CommunityBoard.DEFAULT_EXPIRY_TICKS, 500, 'DEFAULT_EXPIRY_TICKS is 500');
});

test('VALID_ZONES has 8 zones', function() {
  assertArrayLength(CommunityBoard.VALID_ZONES, 8, 'VALID_ZONES has 8 entries');
});

test('all 8 zone names are present in VALID_ZONES', function() {
  var expected = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];
  for (var i = 0; i < expected.length; i++) {
    assert(CommunityBoard.VALID_ZONES.indexOf(expected[i]) !== -1, 'Has zone: ' + expected[i]);
  }
});

// ===========================================================================
// SUITE 2: createState
// ===========================================================================
suite('createState');

test('createState returns object with correct keys', function() {
  var state = makeState();
  assert(typeof state.boards === 'object', 'boards is object');
  assert(typeof state.posts === 'object', 'posts is object');
  assert(typeof state.reactions === 'object', 'reactions is object');
  assert(Array.isArray(state.boardLog), 'boardLog is array');
});

test('createState returns empty collections', function() {
  var state = makeState();
  assertEqual(Object.keys(state.boards).length, 0, 'boards starts empty');
  assertEqual(Object.keys(state.posts).length, 0, 'posts starts empty');
  assertEqual(Object.keys(state.reactions).length, 0, 'reactions starts empty');
  assertArrayLength(state.boardLog, 0, 'boardLog starts empty');
});

test('createState returns independent state objects', function() {
  var s1 = makeState();
  var s2 = makeState();
  makePost(s1);
  assertEqual(Object.keys(s1.posts).length, 1, 's1 has 1 post');
  assertEqual(Object.keys(s2.posts).length, 0, 's2 still empty');
});

// ===========================================================================
// SUITE 3: createPost
// ===========================================================================
suite('createPost');

test('createPost returns success with valid params', function() {
  var state = makeState();
  var r = makePost(state);
  assert(r.success, 'createPost returns success');
  assertNotNull(r.post, 'post is returned');
});

test('created post has correct fields', function() {
  var state = makeState();
  var r = makePost(state, { authorId: 'alice', zone: 'gardens', type: 'announcement', title: 'Big News', content: 'Something happened', tick: 50 });
  var p = r.post;
  assertEqual(p.authorId, 'alice', 'authorId correct');
  assertEqual(p.zone, 'gardens', 'zone correct');
  assertEqual(p.type, 'announcement', 'type correct');
  assertEqual(p.title, 'Big News', 'title correct');
  assertEqual(p.content, 'Something happened', 'content correct');
  assertEqual(p.status, 'active', 'status is active');
  assertEqual(p.pinned, false, 'pinned is false');
  assertEqual(p.npcGenerated, false, 'npcGenerated is false');
  assertEqual(p.createdAt, 50, 'createdAt is tick');
  assertEqual(p.expiresAt, 550, 'expiresAt is tick + 500');
  assertNull(p.editedAt, 'editedAt is null');
  assertNull(p.deletedAt, 'deletedAt is null');
});

test('post is stored in state.posts', function() {
  var state = makeState();
  var r = makePost(state);
  assertEqual(Object.keys(state.posts).length, 1, '1 post in state');
  assertEqual(state.posts[r.post.id].id, r.post.id, 'stored post id matches');
});

test('board is initialized on first post', function() {
  var state = makeState();
  makePost(state, { zone: 'agora' });
  assertNotNull(state.boards['agora'], 'agora board created');
  assert(Array.isArray(state.boards['agora'].pinned), 'board.pinned is array');
});

test('reactions object created for new post', function() {
  var state = makeState();
  var r = makePost(state);
  assertNotNull(state.reactions[r.post.id], 'reactions entry created');
  assertEqual(Object.keys(state.reactions[r.post.id]).length, 0, 'reactions starts empty');
});

test('log entry added on createPost', function() {
  var state = makeState();
  makePost(state, { tick: 77 });
  assertArrayLength(state.boardLog, 1, 'log has 1 entry');
  assertEqual(state.boardLog[0].event, 'post_created', 'log event is post_created');
  assertEqual(state.boardLog[0].tick, 77, 'log tick correct');
});

test('multiple posts get unique ids', function() {
  var state = makeState();
  var r1 = makePost(state, { tick: 1 });
  var r2 = makePost(state, { tick: 2 });
  assertNotEqual(r1.post.id, r2.post.id, 'unique ids');
});

test('createPost fails without authorId', function() {
  var state = makeState();
  var r = CommunityBoard.createPost(state, null, 'nexus', 'general', 'title', 'content', 1);
  assert(!r.success, 'fails without authorId');
  assertNotNull(r.error, 'has error message');
});

test('createPost fails without zone', function() {
  var state = makeState();
  var r = CommunityBoard.createPost(state, 'p', null, 'general', 'title', 'content', 1);
  assert(!r.success, 'fails without zone');
});

test('createPost fails with unknown zone', function() {
  var state = makeState();
  var r = CommunityBoard.createPost(state, 'p', 'shadowlands', 'general', 'title', 'content', 1);
  assert(!r.success, 'fails with unknown zone');
  assertNotNull(r.error, 'has error');
});

test('createPost fails without type', function() {
  var state = makeState();
  var r = CommunityBoard.createPost(state, 'p', 'nexus', null, 'title', 'content', 1);
  assert(!r.success, 'fails without type');
});

test('createPost fails with unknown type', function() {
  var state = makeState();
  var r = CommunityBoard.createPost(state, 'p', 'nexus', 'rumor', 'title', 'content', 1);
  assert(!r.success, 'fails with unknown type');
});

test('createPost fails without title', function() {
  var state = makeState();
  var r = CommunityBoard.createPost(state, 'p', 'nexus', 'general', null, 'content', 1);
  assert(!r.success, 'fails without title');
});

test('createPost fails with empty title', function() {
  var state = makeState();
  var r = CommunityBoard.createPost(state, 'p', 'nexus', 'general', '   ', 'content', 1);
  assert(!r.success, 'fails with whitespace-only title');
});

test('createPost fails without content', function() {
  var state = makeState();
  var r = CommunityBoard.createPost(state, 'p', 'nexus', 'general', 'title', null, 1);
  assert(!r.success, 'fails without content');
});

test('createPost fails with empty content', function() {
  var state = makeState();
  var r = CommunityBoard.createPost(state, 'p', 'nexus', 'general', 'title', '  ', 1);
  assert(!r.success, 'fails with whitespace-only content');
});

test('createPost fails when content exceeds 500 chars', function() {
  var state = makeState();
  var r = CommunityBoard.createPost(state, 'p', 'nexus', 'general', 'title', make501CharContent(), 1);
  assert(!r.success, 'fails when content too long');
  assertNotNull(r.error, 'has error message');
});

test('createPost succeeds with exactly 500 char content', function() {
  var state = makeState();
  var r = CommunityBoard.createPost(state, 'p', 'nexus', 'general', 'title', make500CharContent(), 1);
  assert(r.success, 'succeeds with exactly 500 chars');
});

test('all 5 post types can be created', function() {
  var state = makeState();
  var types = ['announcement', 'event', 'trade_listing', 'help_wanted', 'general'];
  for (var i = 0; i < types.length; i++) {
    var r = CommunityBoard.createPost(state, 'p', 'nexus', types[i], 'title ' + i, 'content ' + i, i + 1);
    assert(r.success, types[i] + ' can be created');
  }
});

test('all 8 zones accept posts', function() {
  var zones = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];
  for (var i = 0; i < zones.length; i++) {
    var state = makeState();
    var r = makePost(state, { zone: zones[i] });
    assert(r.success, zones[i] + ' accepts posts');
  }
});

test('title is trimmed', function() {
  var state = makeState();
  var r = CommunityBoard.createPost(state, 'p', 'nexus', 'general', '  Hello  ', 'content', 1);
  assert(r.success, 'succeeds with padded title');
  assertEqual(r.post.title, 'Hello', 'title is trimmed');
});

test('content is trimmed', function() {
  var state = makeState();
  var r = CommunityBoard.createPost(state, 'p', 'nexus', 'general', 'title', '  content  ', 1);
  assert(r.success, 'succeeds with padded content');
  assertEqual(r.post.content, 'content', 'content is trimmed');
});

test('expiresAt = createdAt + 500', function() {
  var state = makeState();
  var r = makePost(state, { tick: 200 });
  assertEqual(r.post.expiresAt, 700, 'expiresAt = 200 + 500');
});

// ===========================================================================
// SUITE 4: editPost
// ===========================================================================
suite('editPost');

test('editPost returns success for author', function() {
  var state = makeState();
  var r = makePost(state, { authorId: 'alice', tick: 100 });
  var e = CommunityBoard.editPost(state, r.post.id, 'alice', 'Updated content', 120);
  assert(e.success, 'editPost returns success');
});

test('post content updated after edit', function() {
  var state = makeState();
  var r = makePost(state, { authorId: 'alice', tick: 100 });
  CommunityBoard.editPost(state, r.post.id, 'alice', 'New content here', 120);
  assertEqual(r.post.content, 'New content here', 'content updated');
});

test('editedAt set after edit', function() {
  var state = makeState();
  var r = makePost(state, { authorId: 'alice', tick: 100 });
  CommunityBoard.editPost(state, r.post.id, 'alice', 'Edited', 125);
  assertEqual(r.post.editedAt, 125, 'editedAt is 125');
});

test('updatedAt set after edit', function() {
  var state = makeState();
  var r = makePost(state, { authorId: 'alice', tick: 100 });
  CommunityBoard.editPost(state, r.post.id, 'alice', 'Edited', 125);
  assertEqual(r.post.updatedAt, 125, 'updatedAt is 125');
});

test('log entry added on editPost', function() {
  var state = makeState();
  var r = makePost(state, { authorId: 'alice', tick: 100 });
  CommunityBoard.editPost(state, r.post.id, 'alice', 'Edited', 125);
  var lastLog = state.boardLog[state.boardLog.length - 1];
  assertEqual(lastLog.event, 'post_edited', 'log event is post_edited');
});

test('editPost fails without postId', function() {
  var state = makeState();
  var e = CommunityBoard.editPost(state, null, 'alice', 'content', 100);
  assert(!e.success, 'fails without postId');
});

test('editPost fails without authorId', function() {
  var state = makeState();
  var r = makePost(state, { authorId: 'alice', tick: 100 });
  var e = CommunityBoard.editPost(state, r.post.id, null, 'content', 110);
  assert(!e.success, 'fails without authorId');
});

test('editPost fails with unknown postId', function() {
  var state = makeState();
  var e = CommunityBoard.editPost(state, 'post_fake_999', 'alice', 'content', 100);
  assert(!e.success, 'fails with unknown postId');
});

test('editPost fails when not the author', function() {
  var state = makeState();
  var r = makePost(state, { authorId: 'alice', tick: 100 });
  var e = CommunityBoard.editPost(state, r.post.id, 'bob', 'Hijacked content', 110);
  assert(!e.success, 'fails when not author');
});

test('editPost fails if post is expired', function() {
  var state = makeState();
  var r = makePost(state, { authorId: 'alice', tick: 100 });
  CommunityBoard.expirePosts(state, 700);
  var e = CommunityBoard.editPost(state, r.post.id, 'alice', 'Edited', 700);
  assert(!e.success, 'fails to edit expired post');
});

test('editPost fails if content exceeds 500 chars', function() {
  var state = makeState();
  var r = makePost(state, { authorId: 'alice', tick: 100 });
  var e = CommunityBoard.editPost(state, r.post.id, 'alice', make501CharContent(), 110);
  assert(!e.success, 'fails when new content too long');
});

test('editPost fails with empty newContent', function() {
  var state = makeState();
  var r = makePost(state, { authorId: 'alice', tick: 100 });
  var e = CommunityBoard.editPost(state, r.post.id, 'alice', '   ', 110);
  assert(!e.success, 'fails with whitespace newContent');
});

// ===========================================================================
// SUITE 5: deletePost
// ===========================================================================
suite('deletePost');

test('deletePost returns success for author', function() {
  var state = makeState();
  var r = makePost(state, { authorId: 'alice', tick: 100 });
  var d = CommunityBoard.deletePost(state, r.post.id, 'alice', 110);
  assert(d.success, 'deletePost returns success');
});

test('post status is deleted after deletePost', function() {
  var state = makeState();
  var r = makePost(state, { authorId: 'alice', tick: 100 });
  CommunityBoard.deletePost(state, r.post.id, 'alice', 110);
  assertEqual(r.post.status, 'deleted', 'status is deleted');
});

test('deletedAt set on deletePost', function() {
  var state = makeState();
  var r = makePost(state, { authorId: 'alice', tick: 100 });
  CommunityBoard.deletePost(state, r.post.id, 'alice', 115);
  assertEqual(r.post.deletedAt, 115, 'deletedAt is 115');
});

test('steward can delete any post', function() {
  var state = makeState();
  var r = makePost(state, { authorId: 'alice', tick: 100 });
  var d = CommunityBoard.deletePost(state, r.post.id, 'steward_bob', 110);
  assert(d.success, 'steward can delete post');
  assertEqual(r.post.status, 'deleted', 'post is deleted');
});

test('deletePost removes post from pinned list', function() {
  var state = makeState();
  var r = makePost(state, { authorId: 'alice', zone: 'nexus', tick: 100 });
  CommunityBoard.pinPost(state, r.post.id, 'steward1', 105);
  assertEqual(r.post.pinned, true, 'post is pinned');
  CommunityBoard.deletePost(state, r.post.id, 'alice', 110);
  var pinned = CommunityBoard.getPinnedPosts(state, 'nexus');
  assertArrayLength(pinned, 0, 'pinned list is empty after delete');
});

test('log entry added on deletePost', function() {
  var state = makeState();
  var r = makePost(state, { authorId: 'alice', tick: 100 });
  CommunityBoard.deletePost(state, r.post.id, 'alice', 110);
  var lastLog = state.boardLog[state.boardLog.length - 1];
  assertEqual(lastLog.event, 'post_deleted', 'log event is post_deleted');
});

test('deletePost fails without postId', function() {
  var state = makeState();
  var d = CommunityBoard.deletePost(state, null, 'alice', 100);
  assert(!d.success, 'fails without postId');
});

test('deletePost fails without deleterId', function() {
  var state = makeState();
  var r = makePost(state, { authorId: 'alice', tick: 100 });
  var d = CommunityBoard.deletePost(state, r.post.id, null, 110);
  assert(!d.success, 'fails without deleterId');
});

test('deletePost fails with unknown postId', function() {
  var state = makeState();
  var d = CommunityBoard.deletePost(state, 'post_fake', 'alice', 100);
  assert(!d.success, 'fails with unknown postId');
});

test('deletePost fails if already deleted', function() {
  var state = makeState();
  var r = makePost(state, { authorId: 'alice', tick: 100 });
  CommunityBoard.deletePost(state, r.post.id, 'alice', 110);
  var d2 = CommunityBoard.deletePost(state, r.post.id, 'alice', 120);
  assert(!d2.success, 'cannot delete twice');
});

// ===========================================================================
// SUITE 6: pinPost / unpinPost
// ===========================================================================
suite('pinPost and unpinPost');

test('pinPost returns success with valid params', function() {
  var state = makeState();
  var r = makePost(state, { zone: 'nexus', tick: 100 });
  var p = CommunityBoard.pinPost(state, r.post.id, 'steward1', 110);
  assert(p.success, 'pinPost returns success');
});

test('post.pinned is true after pinPost', function() {
  var state = makeState();
  var r = makePost(state, { zone: 'nexus', tick: 100 });
  CommunityBoard.pinPost(state, r.post.id, 'steward1', 110);
  assertEqual(r.post.pinned, true, 'post.pinned is true');
});

test('post appears in board.pinned after pinPost', function() {
  var state = makeState();
  var r = makePost(state, { zone: 'nexus', tick: 100 });
  CommunityBoard.pinPost(state, r.post.id, 'steward1', 110);
  assert(state.boards['nexus'].pinned.indexOf(r.post.id) !== -1, 'post in board.pinned');
});

test('log entry added on pinPost', function() {
  var state = makeState();
  var r = makePost(state, { zone: 'nexus', tick: 100 });
  CommunityBoard.pinPost(state, r.post.id, 'steward1', 110);
  var lastLog = state.boardLog[state.boardLog.length - 1];
  assertEqual(lastLog.event, 'post_pinned', 'log event is post_pinned');
});

test('pinPost fails if already pinned', function() {
  var state = makeState();
  var r = makePost(state, { zone: 'nexus', tick: 100 });
  CommunityBoard.pinPost(state, r.post.id, 'steward1', 110);
  var p2 = CommunityBoard.pinPost(state, r.post.id, 'steward1', 115);
  assert(!p2.success, 'cannot pin already-pinned post');
});

test('pinPost fails when board already has 3 pinned posts', function() {
  var state = makeState();
  var posts = [];
  for (var i = 0; i < 4; i++) {
    var pr = makePost(state, { zone: 'nexus', tick: 100 + i });
    posts.push(pr.post);
  }
  CommunityBoard.pinPost(state, posts[0].id, 'steward1', 200);
  CommunityBoard.pinPost(state, posts[1].id, 'steward1', 201);
  CommunityBoard.pinPost(state, posts[2].id, 'steward1', 202);
  var p4 = CommunityBoard.pinPost(state, posts[3].id, 'steward1', 203);
  assert(!p4.success, 'cannot pin 4th post (max 3)');
  assertNotNull(p4.error, 'has error message');
});

test('pinPost fails without postId', function() {
  var state = makeState();
  var p = CommunityBoard.pinPost(state, null, 'steward1', 100);
  assert(!p.success, 'fails without postId');
});

test('pinPost fails without stewardId', function() {
  var state = makeState();
  var r = makePost(state, { zone: 'nexus', tick: 100 });
  var p = CommunityBoard.pinPost(state, r.post.id, null, 110);
  assert(!p.success, 'fails without stewardId');
});

test('pinPost fails with unknown postId', function() {
  var state = makeState();
  var p = CommunityBoard.pinPost(state, 'post_fake', 'steward1', 100);
  assert(!p.success, 'fails with unknown postId');
});

test('pinPost fails for non-active post', function() {
  var state = makeState();
  var r = makePost(state, { zone: 'nexus', tick: 100 });
  CommunityBoard.expirePosts(state, 700);
  var p = CommunityBoard.pinPost(state, r.post.id, 'steward1', 700);
  assert(!p.success, 'cannot pin expired post');
});

test('unpinPost returns success with valid params', function() {
  var state = makeState();
  var r = makePost(state, { zone: 'nexus', tick: 100 });
  CommunityBoard.pinPost(state, r.post.id, 'steward1', 110);
  var u = CommunityBoard.unpinPost(state, r.post.id, 'steward1', 120);
  assert(u.success, 'unpinPost returns success');
});

test('post.pinned is false after unpinPost', function() {
  var state = makeState();
  var r = makePost(state, { zone: 'nexus', tick: 100 });
  CommunityBoard.pinPost(state, r.post.id, 'steward1', 110);
  CommunityBoard.unpinPost(state, r.post.id, 'steward1', 120);
  assertEqual(r.post.pinned, false, 'post.pinned is false after unpin');
});

test('post removed from board.pinned after unpinPost', function() {
  var state = makeState();
  var r = makePost(state, { zone: 'nexus', tick: 100 });
  CommunityBoard.pinPost(state, r.post.id, 'steward1', 110);
  CommunityBoard.unpinPost(state, r.post.id, 'steward1', 120);
  assert(state.boards['nexus'].pinned.indexOf(r.post.id) === -1, 'post removed from board.pinned');
});

test('log entry added on unpinPost', function() {
  var state = makeState();
  var r = makePost(state, { zone: 'nexus', tick: 100 });
  CommunityBoard.pinPost(state, r.post.id, 'steward1', 110);
  CommunityBoard.unpinPost(state, r.post.id, 'steward1', 120);
  var lastLog = state.boardLog[state.boardLog.length - 1];
  assertEqual(lastLog.event, 'post_unpinned', 'log event is post_unpinned');
});

test('unpinPost fails if post is not pinned', function() {
  var state = makeState();
  var r = makePost(state, { zone: 'nexus', tick: 100 });
  var u = CommunityBoard.unpinPost(state, r.post.id, 'steward1', 110);
  assert(!u.success, 'fails if post not pinned');
});

test('unpinPost fails without postId', function() {
  var state = makeState();
  var u = CommunityBoard.unpinPost(state, null, 'steward1', 100);
  assert(!u.success, 'fails without postId');
});

test('unpinPost fails without stewardId', function() {
  var state = makeState();
  var r = makePost(state, { zone: 'nexus', tick: 100 });
  CommunityBoard.pinPost(state, r.post.id, 'steward1', 110);
  var u = CommunityBoard.unpinPost(state, r.post.id, null, 120);
  assert(!u.success, 'fails without stewardId');
});

test('pin count decreases after unpinPost', function() {
  var state = makeState();
  var r1 = makePost(state, { zone: 'nexus', tick: 100 });
  var r2 = makePost(state, { zone: 'nexus', tick: 101 });
  CommunityBoard.pinPost(state, r1.post.id, 'steward1', 110);
  CommunityBoard.pinPost(state, r2.post.id, 'steward1', 111);
  assertEqual(state.boards['nexus'].pinned.length, 2, '2 pinned');
  CommunityBoard.unpinPost(state, r1.post.id, 'steward1', 120);
  assertEqual(state.boards['nexus'].pinned.length, 1, '1 pinned after unpin');
});

// ===========================================================================
// SUITE 7: addReaction / removeReaction
// ===========================================================================
suite('addReaction and removeReaction');

test('addReaction returns success with valid params', function() {
  var state = makeState();
  var r = makePost(state, { tick: 100 });
  var a = CommunityBoard.addReaction(state, r.post.id, 'player2', 'like', 110);
  assert(a.success, 'addReaction returns success');
});

test('reaction is stored in state.reactions', function() {
  var state = makeState();
  var r = makePost(state, { tick: 100 });
  CommunityBoard.addReaction(state, r.post.id, 'player2', 'helpful', 110);
  assertNotNull(state.reactions[r.post.id]['player2'], 'reaction stored');
  assertEqual(state.reactions[r.post.id]['player2'].type, 'helpful', 'reaction type correct');
});

test('log entry added on addReaction', function() {
  var state = makeState();
  var r = makePost(state, { tick: 100 });
  CommunityBoard.addReaction(state, r.post.id, 'player2', 'funny', 110);
  var lastLog = state.boardLog[state.boardLog.length - 1];
  assertEqual(lastLog.event, 'reaction_added', 'log event is reaction_added');
});

test('all 3 reaction types are accepted', function() {
  var state = makeState();
  var r = makePost(state, { tick: 100 });
  var types = ['like', 'helpful', 'funny'];
  for (var i = 0; i < types.length; i++) {
    var a = CommunityBoard.addReaction(state, r.post.id, 'player' + i, types[i], 110 + i);
    assert(a.success, types[i] + ' reaction accepted');
  }
});

test('addReaction fails if player already reacted', function() {
  var state = makeState();
  var r = makePost(state, { tick: 100 });
  CommunityBoard.addReaction(state, r.post.id, 'player2', 'like', 110);
  var a2 = CommunityBoard.addReaction(state, r.post.id, 'player2', 'funny', 115);
  assert(!a2.success, 'cannot react twice');
});

test('addReaction fails with invalid reaction type', function() {
  var state = makeState();
  var r = makePost(state, { tick: 100 });
  var a = CommunityBoard.addReaction(state, r.post.id, 'player2', 'love', 110);
  assert(!a.success, 'fails with invalid reaction type');
  assertNotNull(a.error, 'has error message');
});

test('addReaction fails without postId', function() {
  var state = makeState();
  var a = CommunityBoard.addReaction(state, null, 'player2', 'like', 100);
  assert(!a.success, 'fails without postId');
});

test('addReaction fails without playerId', function() {
  var state = makeState();
  var r = makePost(state, { tick: 100 });
  var a = CommunityBoard.addReaction(state, r.post.id, null, 'like', 110);
  assert(!a.success, 'fails without playerId');
});

test('addReaction fails without reactionType', function() {
  var state = makeState();
  var r = makePost(state, { tick: 100 });
  var a = CommunityBoard.addReaction(state, r.post.id, 'player2', null, 110);
  assert(!a.success, 'fails without reactionType');
});

test('addReaction fails with unknown postId', function() {
  var state = makeState();
  var a = CommunityBoard.addReaction(state, 'post_fake', 'player2', 'like', 100);
  assert(!a.success, 'fails with unknown postId');
});

test('addReaction fails for non-active post', function() {
  var state = makeState();
  var r = makePost(state, { tick: 100 });
  CommunityBoard.expirePosts(state, 700);
  var a = CommunityBoard.addReaction(state, r.post.id, 'player2', 'like', 700);
  assert(!a.success, 'cannot react to expired post');
});

test('removeReaction returns success', function() {
  var state = makeState();
  var r = makePost(state, { tick: 100 });
  CommunityBoard.addReaction(state, r.post.id, 'player2', 'like', 110);
  var rem = CommunityBoard.removeReaction(state, r.post.id, 'player2', 120);
  assert(rem.success, 'removeReaction returns success');
});

test('reaction is removed from state.reactions', function() {
  var state = makeState();
  var r = makePost(state, { tick: 100 });
  CommunityBoard.addReaction(state, r.post.id, 'player2', 'like', 110);
  CommunityBoard.removeReaction(state, r.post.id, 'player2', 120);
  assertNull(state.reactions[r.post.id]['player2'], 'reaction removed');
});

test('log entry added on removeReaction', function() {
  var state = makeState();
  var r = makePost(state, { tick: 100 });
  CommunityBoard.addReaction(state, r.post.id, 'player2', 'like', 110);
  CommunityBoard.removeReaction(state, r.post.id, 'player2', 120);
  var lastLog = state.boardLog[state.boardLog.length - 1];
  assertEqual(lastLog.event, 'reaction_removed', 'log event is reaction_removed');
});

test('removeReaction fails if player has not reacted', function() {
  var state = makeState();
  var r = makePost(state, { tick: 100 });
  var rem = CommunityBoard.removeReaction(state, r.post.id, 'player2', 110);
  assert(!rem.success, 'fails if no reaction exists');
});

test('removeReaction fails without postId', function() {
  var state = makeState();
  var rem = CommunityBoard.removeReaction(state, null, 'player2', 100);
  assert(!rem.success, 'fails without postId');
});

test('removeReaction fails without playerId', function() {
  var state = makeState();
  var r = makePost(state, { tick: 100 });
  CommunityBoard.addReaction(state, r.post.id, 'player2', 'like', 110);
  var rem = CommunityBoard.removeReaction(state, r.post.id, null, 120);
  assert(!rem.success, 'fails without playerId');
});

test('removeReaction fails with unknown postId', function() {
  var state = makeState();
  var rem = CommunityBoard.removeReaction(state, 'post_fake', 'player2', 100);
  assert(!rem.success, 'fails with unknown postId');
});

// ===========================================================================
// SUITE 8: getPost
// ===========================================================================
suite('getPost');

test('getPost returns the correct post', function() {
  var state = makeState();
  var r = makePost(state, { tick: 100 });
  var p = CommunityBoard.getPost(state, r.post.id);
  assertNotNull(p, 'post found');
  assertEqual(p.id, r.post.id, 'correct id returned');
});

test('getPost returns null for unknown id', function() {
  var state = makeState();
  var p = CommunityBoard.getPost(state, 'post_fake');
  assertNull(p, 'returns null for unknown id');
});

test('getPost returns deleted posts too', function() {
  var state = makeState();
  var r = makePost(state, { authorId: 'alice', tick: 100 });
  CommunityBoard.deletePost(state, r.post.id, 'alice', 110);
  var p = CommunityBoard.getPost(state, r.post.id);
  assertNotNull(p, 'deleted post still retrievable');
  assertEqual(p.status, 'deleted', 'status is deleted');
});

// ===========================================================================
// SUITE 9: getBoardPosts
// ===========================================================================
suite('getBoardPosts');

test('getBoardPosts returns active posts for zone', function() {
  var state = makeState();
  makePost(state, { zone: 'nexus', tick: 100 });
  makePost(state, { zone: 'nexus', tick: 101 });
  makePost(state, { zone: 'gardens', tick: 102 }); // different zone
  var result = CommunityBoard.getBoardPosts(state, 'nexus', 1, 10);
  assertEqual(result.total, 2, '2 posts for nexus');
  assertArrayLength(result.posts, 2, '2 posts returned');
});

test('getBoardPosts returns correct pagination fields', function() {
  var state = makeState();
  for (var i = 0; i < 12; i++) {
    makePost(state, { zone: 'nexus', tick: 100 + i });
  }
  var result = CommunityBoard.getBoardPosts(state, 'nexus', 1, 10);
  assertEqual(result.total, 12, 'total is 12');
  assertEqual(result.page, 1, 'page is 1');
  assertEqual(result.totalPages, 2, 'totalPages is 2');
  assertArrayLength(result.posts, 10, 'page 1 has 10 posts');
});

test('getBoardPosts page 2 returns remaining posts', function() {
  var state = makeState();
  for (var i = 0; i < 12; i++) {
    makePost(state, { zone: 'nexus', tick: 100 + i });
  }
  var result = CommunityBoard.getBoardPosts(state, 'nexus', 2, 10);
  assertArrayLength(result.posts, 2, 'page 2 has 2 posts');
});

test('getBoardPosts pinned posts appear first', function() {
  var state = makeState();
  var r1 = makePost(state, { zone: 'nexus', tick: 100 });
  var r2 = makePost(state, { zone: 'nexus', tick: 101 });
  makePost(state, { zone: 'nexus', tick: 102 });
  CommunityBoard.pinPost(state, r1.post.id, 'steward1', 110);
  CommunityBoard.pinPost(state, r2.post.id, 'steward1', 111);
  var result = CommunityBoard.getBoardPosts(state, 'nexus', 1, 10);
  // First two should be pinned
  assertEqual(result.posts[0].pinned, true, 'first post is pinned');
  assertEqual(result.posts[1].pinned, true, 'second post is pinned');
  assertEqual(result.posts[2].pinned, false, 'third post is not pinned');
});

test('getBoardPosts excludes deleted posts', function() {
  var state = makeState();
  var r = makePost(state, { authorId: 'alice', zone: 'nexus', tick: 100 });
  makePost(state, { zone: 'nexus', tick: 101 });
  CommunityBoard.deletePost(state, r.post.id, 'alice', 110);
  var result = CommunityBoard.getBoardPosts(state, 'nexus', 1, 10);
  assertEqual(result.total, 1, 'deleted post excluded');
});

test('getBoardPosts excludes expired posts', function() {
  var state = makeState();
  makePost(state, { zone: 'nexus', tick: 100 });
  makePost(state, { zone: 'nexus', tick: 101 });
  CommunityBoard.expirePosts(state, 700);
  var result = CommunityBoard.getBoardPosts(state, 'nexus', 1, 10);
  assertEqual(result.total, 0, 'expired posts excluded');
});

test('getBoardPosts returns empty for zone with no posts', function() {
  var state = makeState();
  var result = CommunityBoard.getBoardPosts(state, 'arena', 1, 10);
  assertEqual(result.total, 0, 'no posts for empty zone');
  assertArrayLength(result.posts, 0, 'empty array returned');
  assertEqual(result.totalPages, 1, 'totalPages at least 1');
});

test('getBoardPosts sorts non-pinned by createdAt descending', function() {
  var state = makeState();
  makePost(state, { zone: 'nexus', tick: 100 });
  makePost(state, { zone: 'nexus', tick: 200 });
  makePost(state, { zone: 'nexus', tick: 150 });
  var result = CommunityBoard.getBoardPosts(state, 'nexus', 1, 10);
  assertGTE(result.posts[0].createdAt, result.posts[1].createdAt, 'first post newer than second');
  assertGTE(result.posts[1].createdAt, result.posts[2].createdAt, 'second post newer than third');
});

// ===========================================================================
// SUITE 10: getPinnedPosts
// ===========================================================================
suite('getPinnedPosts');

test('getPinnedPosts returns pinned posts for zone', function() {
  var state = makeState();
  var r = makePost(state, { zone: 'agora', tick: 100 });
  CommunityBoard.pinPost(state, r.post.id, 'steward1', 110);
  var pinned = CommunityBoard.getPinnedPosts(state, 'agora');
  assertArrayLength(pinned, 1, '1 pinned post returned');
  assertEqual(pinned[0].id, r.post.id, 'correct post returned');
});

test('getPinnedPosts returns empty for zone with no pins', function() {
  var state = makeState();
  makePost(state, { zone: 'agora', tick: 100 });
  var pinned = CommunityBoard.getPinnedPosts(state, 'agora');
  assertArrayLength(pinned, 0, 'no pinned posts');
});

test('getPinnedPosts returns empty for zone with no posts at all', function() {
  var state = makeState();
  var pinned = CommunityBoard.getPinnedPosts(state, 'commons');
  assertArrayLength(pinned, 0, 'empty for no-post zone');
});

test('getPinnedPosts does not include deleted pinned posts', function() {
  var state = makeState();
  var r = makePost(state, { authorId: 'alice', zone: 'agora', tick: 100 });
  CommunityBoard.pinPost(state, r.post.id, 'steward1', 110);
  CommunityBoard.deletePost(state, r.post.id, 'alice', 115);
  var pinned = CommunityBoard.getPinnedPosts(state, 'agora');
  assertArrayLength(pinned, 0, 'deleted post not in pinned list');
});

test('up to 3 pinned posts can coexist', function() {
  var state = makeState();
  for (var i = 0; i < 3; i++) {
    var r = makePost(state, { zone: 'studio', tick: 100 + i });
    CommunityBoard.pinPost(state, r.post.id, 'steward1', 110 + i);
  }
  var pinned = CommunityBoard.getPinnedPosts(state, 'studio');
  assertArrayLength(pinned, 3, '3 pinned posts coexist');
});

// ===========================================================================
// SUITE 11: getPostsByType
// ===========================================================================
suite('getPostsByType');

test('getPostsByType returns posts of correct type', function() {
  var state = makeState();
  makePost(state, { zone: 'nexus', type: 'announcement', tick: 100 });
  makePost(state, { zone: 'nexus', type: 'event', tick: 101 });
  makePost(state, { zone: 'nexus', type: 'announcement', tick: 102 });
  var announcements = CommunityBoard.getPostsByType(state, 'nexus', 'announcement');
  assertArrayLength(announcements, 2, '2 announcements returned');
});

test('getPostsByType filters by zone correctly', function() {
  var state = makeState();
  makePost(state, { zone: 'nexus', type: 'event', tick: 100 });
  makePost(state, { zone: 'gardens', type: 'event', tick: 101 });
  var events = CommunityBoard.getPostsByType(state, 'nexus', 'event');
  assertArrayLength(events, 1, 'only nexus events returned');
});

test('getPostsByType returns empty for no matching posts', function() {
  var state = makeState();
  makePost(state, { zone: 'nexus', type: 'general', tick: 100 });
  var tradeListings = CommunityBoard.getPostsByType(state, 'nexus', 'trade_listing');
  assertArrayLength(tradeListings, 0, 'no trade listings for nexus');
});

test('getPostsByType excludes deleted posts', function() {
  var state = makeState();
  var r = makePost(state, { authorId: 'alice', zone: 'nexus', type: 'event', tick: 100 });
  CommunityBoard.deletePost(state, r.post.id, 'alice', 110);
  var events = CommunityBoard.getPostsByType(state, 'nexus', 'event');
  assertArrayLength(events, 0, 'deleted post excluded from type filter');
});

test('getPostsByType results sorted newest-first', function() {
  var state = makeState();
  makePost(state, { zone: 'nexus', type: 'general', tick: 100 });
  makePost(state, { zone: 'nexus', type: 'general', tick: 300 });
  makePost(state, { zone: 'nexus', type: 'general', tick: 200 });
  var generals = CommunityBoard.getPostsByType(state, 'nexus', 'general');
  assertGTE(generals[0].createdAt, generals[1].createdAt, 'sorted newest first');
  assertGTE(generals[1].createdAt, generals[2].createdAt, 'sorted newest first (2nd)');
});

// ===========================================================================
// SUITE 12: getPostsByAuthor
// ===========================================================================
suite('getPostsByAuthor');

test('getPostsByAuthor returns all posts by author', function() {
  var state = makeState();
  makePost(state, { authorId: 'alice', zone: 'nexus', tick: 100 });
  makePost(state, { authorId: 'alice', zone: 'gardens', tick: 101 });
  makePost(state, { authorId: 'bob', zone: 'nexus', tick: 102 });
  var alicePosts = CommunityBoard.getPostsByAuthor(state, 'alice');
  assertArrayLength(alicePosts, 2, 'alice has 2 posts');
});

test('getPostsByAuthor returns empty for unknown author', function() {
  var state = makeState();
  makePost(state, { authorId: 'alice', tick: 100 });
  var unknown = CommunityBoard.getPostsByAuthor(state, 'ghost');
  assertArrayLength(unknown, 0, 'no posts for unknown author');
});

test('getPostsByAuthor includes posts across all zones', function() {
  var state = makeState();
  var zones = ['nexus', 'gardens', 'athenaeum'];
  for (var i = 0; i < zones.length; i++) {
    makePost(state, { authorId: 'traveler', zone: zones[i], tick: 100 + i });
  }
  var posts = CommunityBoard.getPostsByAuthor(state, 'traveler');
  assertArrayLength(posts, 3, 'posts from all zones returned');
});

test('getPostsByAuthor includes deleted posts', function() {
  var state = makeState();
  var r = makePost(state, { authorId: 'alice', tick: 100 });
  CommunityBoard.deletePost(state, r.post.id, 'alice', 110);
  var posts = CommunityBoard.getPostsByAuthor(state, 'alice');
  assertArrayLength(posts, 1, 'deleted post still in author list');
  assertEqual(posts[0].status, 'deleted', 'status is deleted');
});

// ===========================================================================
// SUITE 13: searchPosts
// ===========================================================================
suite('searchPosts');

test('searchPosts finds posts by title keyword', function() {
  var state = makeState();
  CommunityBoard.createPost(state, 'p', 'nexus', 'general', 'Dragon Sighting', 'A dragon was seen', 100);
  CommunityBoard.createPost(state, 'p', 'nexus', 'general', 'Normal Post', 'Nothing here', 101);
  var results = CommunityBoard.searchPosts(state, 'nexus', 'dragon');
  assertArrayLength(results, 1, '1 result for "dragon"');
});

test('searchPosts finds posts by content keyword', function() {
  var state = makeState();
  CommunityBoard.createPost(state, 'p', 'nexus', 'general', 'Post 1', 'Contains the word firefly', 100);
  CommunityBoard.createPost(state, 'p', 'nexus', 'general', 'Post 2', 'Nothing relevant', 101);
  var results = CommunityBoard.searchPosts(state, 'nexus', 'firefly');
  assertArrayLength(results, 1, '1 result for "firefly"');
});

test('searchPosts is case-insensitive', function() {
  var state = makeState();
  CommunityBoard.createPost(state, 'p', 'nexus', 'general', 'FESTIVAL Time', 'Big event', 100);
  var results = CommunityBoard.searchPosts(state, 'nexus', 'festival');
  assertArrayLength(results, 1, 'case-insensitive match');
});

test('searchPosts filters by zone', function() {
  var state = makeState();
  CommunityBoard.createPost(state, 'p', 'nexus', 'general', 'Trade offer', 'Selling iron', 100);
  CommunityBoard.createPost(state, 'p', 'gardens', 'general', 'Trade offer', 'Selling herbs', 101);
  var results = CommunityBoard.searchPosts(state, 'nexus', 'trade');
  assertArrayLength(results, 1, 'only nexus posts returned');
});

test('searchPosts returns empty for no matches', function() {
  var state = makeState();
  CommunityBoard.createPost(state, 'p', 'nexus', 'general', 'Boring Title', 'Boring content', 100);
  var results = CommunityBoard.searchPosts(state, 'nexus', 'xyzzy');
  assertArrayLength(results, 0, 'no results for non-matching keyword');
});

test('searchPosts returns empty for empty keyword', function() {
  var state = makeState();
  CommunityBoard.createPost(state, 'p', 'nexus', 'general', 'Title', 'Content', 100);
  var results = CommunityBoard.searchPosts(state, 'nexus', '');
  assertArrayLength(results, 0, 'returns empty for empty keyword');
});

test('searchPosts excludes deleted posts', function() {
  var state = makeState();
  var r = CommunityBoard.createPost(state, 'alice', 'nexus', 'general', 'Hidden treasure', 'Find it', 100);
  CommunityBoard.deletePost(state, r.post.id, 'alice', 110);
  var results = CommunityBoard.searchPosts(state, 'nexus', 'treasure');
  assertArrayLength(results, 0, 'deleted post excluded from search');
});

test('searchPosts excludes expired posts', function() {
  var state = makeState();
  CommunityBoard.createPost(state, 'p', 'nexus', 'general', 'Expired Treasure', 'Old news', 100);
  CommunityBoard.expirePosts(state, 700);
  var results = CommunityBoard.searchPosts(state, 'nexus', 'treasure');
  assertArrayLength(results, 0, 'expired post excluded from search');
});

test('searchPosts returns multiple matching results', function() {
  var state = makeState();
  CommunityBoard.createPost(state, 'p', 'nexus', 'general', 'Market sale', 'Iron for sale', 100);
  CommunityBoard.createPost(state, 'p', 'nexus', 'trade_listing', 'Sale event', 'Sale is live', 101);
  CommunityBoard.createPost(state, 'p', 'nexus', 'announcement', 'Big news', 'Nothing', 102);
  var results = CommunityBoard.searchPosts(state, 'nexus', 'sale');
  assertArrayLength(results, 2, '2 results for "sale"');
});

// ===========================================================================
// SUITE 14: expirePosts
// ===========================================================================
suite('expirePosts');

test('expirePosts returns expired array', function() {
  var state = makeState();
  makePost(state, { tick: 100 }); // expires at 600
  var result = CommunityBoard.expirePosts(state, 700);
  assert(Array.isArray(result.expired), 'expired is array');
  assertArrayLength(result.expired, 1, '1 post expired');
});

test('expired post status is expired', function() {
  var state = makeState();
  var r = makePost(state, { tick: 100 });
  CommunityBoard.expirePosts(state, 700);
  assertEqual(r.post.status, 'expired', 'status is expired');
});

test('expirePosts does not expire posts before expiresAt', function() {
  var state = makeState();
  makePost(state, { tick: 100 }); // expires at 600
  var result = CommunityBoard.expirePosts(state, 599);
  assertArrayLength(result.expired, 0, 'no expiry before expiresAt');
});

test('expirePosts does not expire already-deleted posts', function() {
  var state = makeState();
  var r = makePost(state, { authorId: 'alice', tick: 100 });
  CommunityBoard.deletePost(state, r.post.id, 'alice', 110);
  var result = CommunityBoard.expirePosts(state, 9999);
  for (var i = 0; i < result.expired.length; i++) {
    assertNotEqual(result.expired[i].id, r.post.id, 'deleted post not in expired list');
  }
});

test('expirePosts returns empty when nothing to expire', function() {
  var state = makeState();
  var result = CommunityBoard.expirePosts(state, 9999);
  assertArrayLength(result.expired, 0, 'empty when no posts');
});

test('log entry added for each expired post', function() {
  var state = makeState();
  makePost(state, { tick: 100 });
  makePost(state, { tick: 110 });
  var logBefore = state.boardLog.length;
  CommunityBoard.expirePosts(state, 700);
  assertEqual(state.boardLog.length, logBefore + 2, '2 log entries added');
});

test('expirePosts removes expired pinned posts from board.pinned', function() {
  var state = makeState();
  var r = makePost(state, { zone: 'nexus', tick: 100 });
  CommunityBoard.pinPost(state, r.post.id, 'steward1', 110);
  CommunityBoard.expirePosts(state, 700);
  var board = state.boards['nexus'];
  assert(board.pinned.indexOf(r.post.id) === -1, 'expired pinned post removed from board.pinned');
});

test('expirePosts only expires at or after expiresAt tick', function() {
  var state = makeState();
  makePost(state, { tick: 100 }); // expiresAt = 600
  var r = CommunityBoard.expirePosts(state, 600);
  assertArrayLength(r.expired, 1, 'expires exactly at expiresAt tick');
});

// ===========================================================================
// SUITE 15: getReactions
// ===========================================================================
suite('getReactions');

test('getReactions returns counts for all reaction types', function() {
  var state = makeState();
  var r = makePost(state, { tick: 100 });
  CommunityBoard.addReaction(state, r.post.id, 'p1', 'like', 110);
  CommunityBoard.addReaction(state, r.post.id, 'p2', 'helpful', 111);
  CommunityBoard.addReaction(state, r.post.id, 'p3', 'funny', 112);
  CommunityBoard.addReaction(state, r.post.id, 'p4', 'like', 113);
  var counts = CommunityBoard.getReactions(state, r.post.id);
  assertEqual(counts.like, 2, 'like count is 2');
  assertEqual(counts.helpful, 1, 'helpful count is 1');
  assertEqual(counts.funny, 1, 'funny count is 1');
  assertEqual(counts.total, 4, 'total is 4');
});

test('getReactions returns zero counts for post with no reactions', function() {
  var state = makeState();
  var r = makePost(state, { tick: 100 });
  var counts = CommunityBoard.getReactions(state, r.post.id);
  assertEqual(counts.like, 0, 'like is 0');
  assertEqual(counts.helpful, 0, 'helpful is 0');
  assertEqual(counts.funny, 0, 'funny is 0');
  assertEqual(counts.total, 0, 'total is 0');
});

test('getReactions returns zero counts for unknown post', function() {
  var state = makeState();
  var counts = CommunityBoard.getReactions(state, 'post_fake');
  assertEqual(counts.total, 0, 'total is 0 for unknown post');
});

test('getReactions decrements after removeReaction', function() {
  var state = makeState();
  var r = makePost(state, { tick: 100 });
  CommunityBoard.addReaction(state, r.post.id, 'p1', 'like', 110);
  CommunityBoard.addReaction(state, r.post.id, 'p2', 'like', 111);
  CommunityBoard.removeReaction(state, r.post.id, 'p1', 120);
  var counts = CommunityBoard.getReactions(state, r.post.id);
  assertEqual(counts.like, 1, 'like count decremented to 1');
  assertEqual(counts.total, 1, 'total decremented to 1');
});

// ===========================================================================
// SUITE 16: getBoardStats
// ===========================================================================
suite('getBoardStats');

test('getBoardStats returns correct structure', function() {
  var state = makeState();
  var stats = CommunityBoard.getBoardStats(state, 'nexus');
  assertEqual(typeof stats.zone, 'string', 'zone is string');
  assertEqual(typeof stats.totalPosts, 'number', 'totalPosts is number');
  assertEqual(typeof stats.activePosts, 'number', 'activePosts is number');
  assertEqual(typeof stats.expiredPosts, 'number', 'expiredPosts is number');
  assertEqual(typeof stats.deletedPosts, 'number', 'deletedPosts is number');
  assertEqual(typeof stats.pinnedPosts, 'number', 'pinnedPosts is number');
  assertEqual(typeof stats.npcPosts, 'number', 'npcPosts is number');
  assertEqual(typeof stats.totalReactions, 'number', 'totalReactions is number');
  assert(typeof stats.byType === 'object', 'byType is object');
});

test('getBoardStats counts posts correctly', function() {
  var state = makeState();
  makePost(state, { zone: 'nexus', tick: 100 });
  makePost(state, { zone: 'nexus', tick: 101 });
  makePost(state, { zone: 'gardens', tick: 102 });
  var stats = CommunityBoard.getBoardStats(state, 'nexus');
  assertEqual(stats.totalPosts, 2, 'totalPosts is 2 for nexus');
  assertEqual(stats.activePosts, 2, 'activePosts is 2');
});

test('getBoardStats counts pinned posts', function() {
  var state = makeState();
  var r = makePost(state, { zone: 'nexus', tick: 100 });
  CommunityBoard.pinPost(state, r.post.id, 'steward1', 110);
  var stats = CommunityBoard.getBoardStats(state, 'nexus');
  assertEqual(stats.pinnedPosts, 1, 'pinnedPosts is 1');
});

test('getBoardStats counts reactions', function() {
  var state = makeState();
  var r = makePost(state, { zone: 'nexus', tick: 100 });
  CommunityBoard.addReaction(state, r.post.id, 'p1', 'like', 110);
  CommunityBoard.addReaction(state, r.post.id, 'p2', 'funny', 111);
  var stats = CommunityBoard.getBoardStats(state, 'nexus');
  assertEqual(stats.totalReactions, 2, 'totalReactions is 2');
});

test('getBoardStats byType tracks each post type', function() {
  var state = makeState();
  makePost(state, { zone: 'nexus', type: 'announcement', tick: 100 });
  makePost(state, { zone: 'nexus', type: 'announcement', tick: 101 });
  makePost(state, { zone: 'nexus', type: 'event', tick: 102 });
  var stats = CommunityBoard.getBoardStats(state, 'nexus');
  assertEqual(stats.byType['announcement'].total, 2, 'announcement total is 2');
  assertEqual(stats.byType['event'].total, 1, 'event total is 1');
  assertEqual(stats.byType['general'].total, 0, 'general total is 0');
});

test('getBoardStats returns zeros for empty zone', function() {
  var state = makeState();
  var stats = CommunityBoard.getBoardStats(state, 'wilds');
  assertEqual(stats.totalPosts, 0, 'totalPosts is 0 for empty zone');
  assertEqual(stats.activePosts, 0, 'activePosts is 0');
  assertEqual(stats.pinnedPosts, 0, 'pinnedPosts is 0');
});

test('getBoardStats zone field matches requested zone', function() {
  var state = makeState();
  var stats = CommunityBoard.getBoardStats(state, 'arena');
  assertEqual(stats.zone, 'arena', 'zone field matches');
});

test('getBoardStats counts npcPosts', function() {
  var state = makeState();
  CommunityBoard.createNpcPost(state, 'npc_merchant', 'nexus', 'announcement', 'Market Alert', 'Iron prices rising', 100);
  makePost(state, { zone: 'nexus', tick: 101 });
  var stats = CommunityBoard.getBoardStats(state, 'nexus');
  assertEqual(stats.npcPosts, 1, 'npcPosts is 1');
});

// ===========================================================================
// SUITE 17: getRecentActivity
// ===========================================================================
suite('getRecentActivity');

test('getRecentActivity returns recent log entries for zone', function() {
  var state = makeState();
  makePost(state, { zone: 'nexus', tick: 100 });
  makePost(state, { zone: 'nexus', tick: 101 });
  makePost(state, { zone: 'gardens', tick: 102 }); // different zone
  var activity = CommunityBoard.getRecentActivity(state, 'nexus', 20);
  assert(activity.length >= 2, 'at least 2 entries for nexus');
  for (var i = 0; i < activity.length; i++) {
    assertEqual(activity[i].zone, 'nexus', 'all entries are for nexus');
  }
});

test('getRecentActivity respects count param', function() {
  var state = makeState();
  for (var i = 0; i < 10; i++) {
    makePost(state, { zone: 'nexus', tick: 100 + i });
  }
  var activity = CommunityBoard.getRecentActivity(state, 'nexus', 3);
  assertLTE(activity.length, 3, 'at most 3 entries returned');
});

test('getRecentActivity returns empty for zone with no activity', function() {
  var state = makeState();
  makePost(state, { zone: 'nexus', tick: 100 });
  var activity = CommunityBoard.getRecentActivity(state, 'arena', 20);
  assertArrayLength(activity, 0, 'no activity for arena');
});

test('getRecentActivity returns entries in reverse chronological order', function() {
  var state = makeState();
  makePost(state, { zone: 'nexus', tick: 100 });
  makePost(state, { zone: 'nexus', tick: 200 });
  var activity = CommunityBoard.getRecentActivity(state, 'nexus', 20);
  if (activity.length >= 2) {
    assertGTE(activity[0].tick, activity[1].tick, 'entries in reverse chronological order');
  }
});

// ===========================================================================
// SUITE 18: createNpcPost
// ===========================================================================
suite('createNpcPost');

test('createNpcPost returns success for allowed type', function() {
  var state = makeState();
  var r = CommunityBoard.createNpcPost(state, 'npc_merchant', 'nexus', 'announcement', 'Market Alert', 'Iron up 20%', 100);
  assert(r.success, 'createNpcPost returns success');
});

test('npcGenerated flag is true on NPC post', function() {
  var state = makeState();
  var r = CommunityBoard.createNpcPost(state, 'npc_weather', 'gardens', 'event', 'Storm Warning', 'Rain expected', 100);
  assert(r.success, 'createNpcPost succeeds');
  assertEqual(r.post.npcGenerated, true, 'npcGenerated is true');
});

test('createNpcPost fails for type that does not allow NPC posts', function() {
  var state = makeState();
  var r = CommunityBoard.createNpcPost(state, 'npc_bot', 'nexus', 'help_wanted', 'I need help', 'Please assist', 100);
  assert(!r.success, 'fails for help_wanted (allowNpcPost: false)');
  assertNotNull(r.error, 'has error message');
});

test('createNpcPost fails for general type', function() {
  var state = makeState();
  var r = CommunityBoard.createNpcPost(state, 'npc_bot', 'nexus', 'general', 'Chat', 'Hello', 100);
  assert(!r.success, 'fails for general (allowNpcPost: false)');
});

test('createNpcPost for trade_listing is allowed', function() {
  var state = makeState();
  var r = CommunityBoard.createNpcPost(state, 'npc_merchant', 'agora', 'trade_listing', 'Bulk Iron', 'Selling 100 iron', 100);
  assert(r.success, 'trade_listing NPC post allowed');
  assertEqual(r.post.npcGenerated, true, 'marked as NPC generated');
});

test('createNpcPost for event is allowed', function() {
  var state = makeState();
  var r = CommunityBoard.createNpcPost(state, 'npc_herald', 'arena', 'event', 'Tournament', 'Join the tournament at tick 500', 100);
  assert(r.success, 'event NPC post allowed');
});

// ===========================================================================
// SUITE 19: mulberry32 PRNG
// ===========================================================================
suite('mulberry32 PRNG');

test('mulberry32 is exported', function() {
  assert(typeof CommunityBoard.mulberry32 === 'function', 'mulberry32 is a function');
});

test('mulberry32 returns a function', function() {
  var rand = CommunityBoard.mulberry32(42);
  assert(typeof rand === 'function', 'mulberry32(seed) returns function');
});

test('mulberry32 generates values between 0 and 1', function() {
  var rand = CommunityBoard.mulberry32(123);
  for (var i = 0; i < 20; i++) {
    var v = rand();
    assert(v >= 0 && v < 1, 'value ' + v + ' is in [0, 1)');
  }
});

test('mulberry32 same seed produces same sequence', function() {
  var r1 = CommunityBoard.mulberry32(999);
  var r2 = CommunityBoard.mulberry32(999);
  for (var i = 0; i < 10; i++) {
    assertEqual(r1(), r2(), 'same value for same seed at step ' + i);
  }
});

test('mulberry32 different seeds produce different sequences', function() {
  var r1 = CommunityBoard.mulberry32(1);
  var r2 = CommunityBoard.mulberry32(2);
  var v1 = r1();
  var v2 = r2();
  assertNotEqual(v1, v2, 'different seeds give different values');
});

// ===========================================================================
// FINAL REPORT
// ===========================================================================

process.stdout.write('\n===========================================\n');
process.stdout.write('RESULTS: ' + passed + ' passed, ' + failed + ' failed\n');
if (failures.length > 0) {
  process.stdout.write('\nFailed tests:\n');
  for (var f = 0; f < failures.length; f++) {
    process.stdout.write('  - ' + failures[f].name + '\n    ' + failures[f].error + '\n');
  }
  process.exit(1);
} else {
  process.stdout.write('All tests passed!\n');
  process.exit(0);
}
