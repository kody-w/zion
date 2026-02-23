// Test: CommunityBoard wiring — createPost, createNpcPost, getBoardPosts, expirePosts, addReaction, getBoardStats
var CommunityBoard = require('../src/js/community_board.js');

var passed = 0;
var failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; }
  else { failed++; console.error('FAIL: ' + msg); }
}

// Create state
var state = CommunityBoard.createState();
assert(state !== null && typeof state === 'object', 'createState returns object');

// createPost
var postResult = CommunityBoard.createPost(state, 'player1', 'nexus', 'general', 'Hello World', 'My first post on the board', 100);
assert(postResult !== null && typeof postResult === 'object', 'createPost returns result');
assert(postResult.success === true, 'createPost succeeds');
var postId = postResult.post ? postResult.post.id : (postResult.id || null);
assert(postId !== null, 'createPost returns post id');

// createNpcPost
var npcPostResult = CommunityBoard.createNpcPost(state, 'npc_1', 'gardens', 'announcement', 'NPC News', 'Big event in gardens!', 200);
assert(npcPostResult !== null && typeof npcPostResult === 'object', 'createNpcPost returns result');
assert(npcPostResult.success === true, 'createNpcPost succeeds');

// getBoardPosts
var posts = CommunityBoard.getBoardPosts(state, 'nexus', 1, 10);
assert(posts !== null && typeof posts === 'object', 'getBoardPosts returns object');
assert(posts.posts !== undefined || Array.isArray(posts), 'getBoardPosts has posts');

// getBoardPosts for gardens
var gardenPosts = CommunityBoard.getBoardPosts(state, 'gardens', 1, 10);
assert(gardenPosts !== null, 'getBoardPosts for gardens returns result');

// addReaction
if (postId) {
  var reactResult = CommunityBoard.addReaction(state, postId, 'player2', 'like');
  assert(reactResult !== null && typeof reactResult === 'object', 'addReaction returns result');
}

// expirePosts: should not throw
CommunityBoard.expirePosts(state, 999999);
assert(true, 'expirePosts runs without error');

// getBoardStats
var stats = CommunityBoard.getBoardStats(state, 'nexus');
assert(stats !== null && typeof stats === 'object', 'getBoardStats returns object');

// Create multiple posts for stats testing
CommunityBoard.createPost(state, 'player2', 'nexus', 'trade_listing', 'Selling wood', '10 wood for 5 Spark', 300);
CommunityBoard.createPost(state, 'player3', 'nexus', 'event', 'Party tonight', 'Meet at nexus center', 400);
var stats2 = CommunityBoard.getBoardStats(state, 'nexus');
assert(typeof stats2 === 'object', 'stats after multiple posts is object');

console.log('test_wiring_community_board: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
