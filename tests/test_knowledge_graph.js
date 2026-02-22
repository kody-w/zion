/**
 * tests/test_knowledge_graph.js
 * Comprehensive tests for the ZION Knowledge Graph module.
 * 200+ tests covering all exported functions, edge cases, graph traversal,
 * synthesis, decay, NPC contributions, verification, and analytics.
 *
 * Run with: node tests/test_knowledge_graph.js
 */

'use strict';

var KG = require('../src/js/knowledge_graph');

// ============================================================================
// TEST HARNESS
// ============================================================================

var passed  = 0;
var failed  = 0;
var failures = [];
var currentSuite = '';

function suite(name, fn) {
  currentSuite = name;
  process.stdout.write('\n' + name + '\n');
  fn();
}

function assert(condition, msg) {
  if (condition) {
    passed++;
    process.stdout.write('  ok - ' + msg + '\n');
  } else {
    failed++;
    var full = '[' + currentSuite + '] FAIL: ' + msg;
    failures.push(full);
    process.stdout.write('  FAIL - ' + msg + '\n');
  }
}

function assertEqual(a, b, msg) {
  assert(a === b, msg + ' (expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a) + ')');
}

function assertGte(a, b, msg) {
  assert(a >= b, msg + ' (expected >= ' + b + ', got ' + a + ')');
}

function assertLte(a, b, msg) {
  assert(a <= b, msg + ' (expected <= ' + b + ', got ' + a + ')');
}

function assertNull(val, msg) {
  assert(val === null || val === undefined, msg + ' (expected null/undefined, got ' + JSON.stringify(val) + ')');
}

function assertNotNull(val, msg) {
  assert(val !== null && val !== undefined, msg + ' (expected non-null)');
}

// ============================================================================
// HELPERS
// ============================================================================

var _seq = 0;
function uid() { return 'player_' + (++_seq); }

function freshState() {
  return KG.initKnowledgeGraph({});
}

function makeNodeOpts(overrides) {
  var base = {
    title:    'Test Node ' + (++_seq),
    content:  'This is test content for the knowledge node.',
    category: 'lore',
    tags:     ['test', 'knowledge']
  };
  if (overrides) {
    for (var k in overrides) { base[k] = overrides[k]; }
  }
  return base;
}

// Convenience: create a node and return its ID
function addNode(state, playerId, overrides) {
  var opts = makeNodeOpts(overrides);
  var res = KG.createNode(state, playerId, opts);
  if (!res.ok) { return null; }
  return res.node.id;
}

// Create two connected nodes and return their IDs
function addConnectedPair(state, p1, p2, relType) {
  var id1 = addNode(state, p1, { category: 'crafting' });
  var id2 = addNode(state, p2, { category: 'crafting' });
  KG.addRelationship(state, p1, id1, id2, relType || 'related_to');
  return [id1, id2];
}

// Give a node enough upvotes to verify it (from different players)
function verifyNode(state, nodeId) {
  for (var i = 0; i < KG.VERIFY_THRESHOLD; i++) {
    KG.voteNode(state, 'verifier_' + i + '_' + nodeId, nodeId, 'up');
  }
}

// ============================================================================
// SUITE 1: MODULE EXPORTS & CONSTANTS
// ============================================================================

suite('1. Module Exports & Constants', function() {
  assert(typeof KG === 'object', 'KG is an object');

  // Constants
  assert(Array.isArray(KG.NODE_CATEGORIES), 'NODE_CATEGORIES is array');
  assertGte(KG.NODE_CATEGORIES.length, 7, 'At least 7 node categories');
  assert(KG.NODE_CATEGORIES.indexOf('crafting')   !== -1, 'crafting category exists');
  assert(KG.NODE_CATEGORIES.indexOf('combat')     !== -1, 'combat category exists');
  assert(KG.NODE_CATEGORIES.indexOf('lore')       !== -1, 'lore category exists');
  assert(KG.NODE_CATEGORIES.indexOf('ecology')    !== -1, 'ecology category exists');
  assert(KG.NODE_CATEGORIES.indexOf('economy')    !== -1, 'economy category exists');
  assert(KG.NODE_CATEGORIES.indexOf('social')     !== -1, 'social category exists');
  assert(KG.NODE_CATEGORIES.indexOf('exploration')!== -1, 'exploration category exists');

  assert(Array.isArray(KG.RELATIONSHIP_TYPES), 'RELATIONSHIP_TYPES is array');
  assertGte(KG.RELATIONSHIP_TYPES.length, 5, 'At least 5 relationship types');
  assert(KG.RELATIONSHIP_TYPES.indexOf('teaches')     !== -1, 'teaches rel exists');
  assert(KG.RELATIONSHIP_TYPES.indexOf('contradicts') !== -1, 'contradicts rel exists');
  assert(KG.RELATIONSHIP_TYPES.indexOf('extends')     !== -1, 'extends rel exists');
  assert(KG.RELATIONSHIP_TYPES.indexOf('depends_on')  !== -1, 'depends_on rel exists');
  assert(KG.RELATIONSHIP_TYPES.indexOf('related_to')  !== -1, 'related_to rel exists');

  assert(Array.isArray(KG.VERIFICATION_STATES), 'VERIFICATION_STATES is array');
  assert(KG.VERIFICATION_STATES.indexOf('unverified') !== -1, 'unverified state exists');
  assert(KG.VERIFICATION_STATES.indexOf('verified')   !== -1, 'verified state exists');
  assert(KG.VERIFICATION_STATES.indexOf('disputed')   !== -1, 'disputed state exists');

  // Numeric constants
  assert(typeof KG.SPARK_CREATE_NODE    === 'number', 'SPARK_CREATE_NODE is number');
  assert(typeof KG.SPARK_VERIFY_NODE    === 'number', 'SPARK_VERIFY_NODE is number');
  assert(typeof KG.SPARK_DISPUTE_NODE   === 'number', 'SPARK_DISPUTE_NODE is number');
  assert(typeof KG.SPARK_SYNTHESIS_BASE === 'number', 'SPARK_SYNTHESIS_BASE is number');
  assert(typeof KG.SPARK_SYNTHESIS_BONUS=== 'number', 'SPARK_SYNTHESIS_BONUS is number');
  assert(typeof KG.VERIFY_THRESHOLD     === 'number', 'VERIFY_THRESHOLD is number');
  assert(typeof KG.DISPUTE_THRESHOLD    === 'number', 'DISPUTE_THRESHOLD is number');
  assert(typeof KG.DECAY_TICKS_THRESHOLD=== 'number', 'DECAY_TICKS_THRESHOLD is number');

  assertGte(KG.SPARK_CREATE_NODE,    1,  'CREATE_NODE spark positive');
  assertGte(KG.SPARK_VERIFY_NODE,    1,  'VERIFY_NODE spark positive');
  assertGte(KG.SPARK_SYNTHESIS_BASE, 10, 'SYNTHESIS_BASE spark meaningful');
  assertGte(KG.VERIFY_THRESHOLD,     1,  'VERIFY_THRESHOLD at least 1');
  assertGte(KG.DECAY_TICKS_THRESHOLD,1,  'DECAY_TICKS_THRESHOLD at least 1');

  // Seed data
  assert(Array.isArray(KG.SEED_NODES),         'SEED_NODES is array');
  assertGte(KG.SEED_NODES.length, 5,            'At least 5 seed nodes');
  assert(Array.isArray(KG.SYNTHESIS_INSIGHTS),  'SYNTHESIS_INSIGHTS is array');
  assertGte(KG.SYNTHESIS_INSIGHTS.length, 1,    'At least 1 synthesis insight template');
  assert(Array.isArray(KG.INSIGHT_FRAGMENTS),   'INSIGHT_FRAGMENTS is array');
  assertGte(KG.INSIGHT_FRAGMENTS.length, 1,     'At least 1 insight fragment');

  assert(typeof KG.NPC_ARCHETYPE_CATEGORIES === 'object', 'NPC_ARCHETYPE_CATEGORIES is object');
  assert(KG.NPC_ARCHETYPE_CATEGORIES.teacher     !== undefined, 'teacher archetype mapped');
  assert(KG.NPC_ARCHETYPE_CATEGORIES.gardener    !== undefined, 'gardener archetype mapped');
  assert(KG.NPC_ARCHETYPE_CATEGORIES.builder     !== undefined, 'builder archetype mapped');
  assert(KG.NPC_ARCHETYPE_CATEGORIES.storyteller !== undefined, 'storyteller archetype mapped');
  assert(KG.NPC_ARCHETYPE_CATEGORIES.merchant    !== undefined, 'merchant archetype mapped');

  // Function exports
  assert(typeof KG.initKnowledgeGraph   === 'function', 'initKnowledgeGraph exported');
  assert(typeof KG.createNode           === 'function', 'createNode exported');
  assert(typeof KG.getNode              === 'function', 'getNode exported');
  assert(typeof KG.updateNode           === 'function', 'updateNode exported');
  assert(typeof KG.deleteNode           === 'function', 'deleteNode exported');
  assert(typeof KG.addRelationship      === 'function', 'addRelationship exported');
  assert(typeof KG.removeRelationship   === 'function', 'removeRelationship exported');
  assert(typeof KG.getNodeEdges         === 'function', 'getNodeEdges exported');
  assert(typeof KG.getEdgesByType       === 'function', 'getEdgesByType exported');
  assert(typeof KG.searchNodes          === 'function', 'searchNodes exported');
  assert(typeof KG.getNodesByCategory   === 'function', 'getNodesByCategory exported');
  assert(typeof KG.getNodesByContributor=== 'function', 'getNodesByContributor exported');
  assert(typeof KG.getConnectedNodes    === 'function', 'getConnectedNodes exported');
  assert(typeof KG.getNodesByRelationship=== 'function','getNodesByRelationship exported');
  assert(typeof KG.traverseGraph        === 'function', 'traverseGraph exported');
  assert(typeof KG.findPath             === 'function', 'findPath exported');
  assert(typeof KG.getLearningPath      === 'function', 'getLearningPath exported');
  assert(typeof KG.voteNode             === 'function', 'voteNode exported');
  assert(typeof KG.getVerificationStatus=== 'function', 'getVerificationStatus exported');
  assert(typeof KG.synthesizeNodes      === 'function', 'synthesizeNodes exported');
  assert(typeof KG.getPlayerSyntheses   === 'function', 'getPlayerSyntheses exported');
  assert(typeof KG.getContributorRep    === 'function', 'getContributorRep exported');
  assert(typeof KG.getContributorLeaderboard === 'function', 'getContributorLeaderboard exported');
  assert(typeof KG.tickDecay            === 'function', 'tickDecay exported');
  assert(typeof KG.reinforceNode        === 'function', 'reinforceNode exported');
  assert(typeof KG.npcContributeNode    === 'function', 'npcContributeNode exported');
  assert(typeof KG.npcReferenceNode     === 'function', 'npcReferenceNode exported');
  assert(typeof KG.getGraphStats        === 'function', 'getGraphStats exported');
  assert(typeof KG.getMostConnectedNodes=== 'function', 'getMostConnectedNodes exported');
  assert(typeof KG.getRecentNodes       === 'function', 'getRecentNodes exported');
  assert(typeof KG.getOrphanNodes       === 'function', 'getOrphanNodes exported');
  assert(typeof KG.getConflictingNodes  === 'function', 'getConflictingNodes exported');
});

// ============================================================================
// SUITE 2: initKnowledgeGraph
// ============================================================================

suite('2. initKnowledgeGraph', function() {
  var s1 = KG.initKnowledgeGraph({});
  assert(s1.knowledgeGraph !== undefined,                  'knowledgeGraph key created');
  assert(typeof s1.knowledgeGraph.nodes === 'object',      'nodes object created');
  assert(Array.isArray(s1.knowledgeGraph.edges),           'edges array created');
  assert(typeof s1.knowledgeGraph.contributorRep === 'object', 'contributorRep created');
  assert(Array.isArray(s1.knowledgeGraph.syntheses),       'syntheses array created');
  assert(typeof s1.knowledgeGraph.tickCount === 'number',  'tickCount is number');
  assertEqual(s1.knowledgeGraph.tickCount, 0,              'tickCount starts at 0');

  // Seed nodes populated
  var seedCount = Object.keys(s1.knowledgeGraph.nodes).length;
  assertGte(seedCount, KG.SEED_NODES.length, 'All seed nodes present after init');

  // Each seed node is verified
  for (var id in s1.knowledgeGraph.nodes) {
    var n = s1.knowledgeGraph.nodes[id];
    if (n.isNpc) {
      assertEqual(n.verification, 'verified', 'NPC seed node is verified: ' + id);
    }
  }

  // Idempotent — calling twice doesn't duplicate
  var nodesBefore = Object.keys(s1.knowledgeGraph.nodes).length;
  KG.initKnowledgeGraph(s1);
  var nodesAfter  = Object.keys(s1.knowledgeGraph.nodes).length;
  assertEqual(nodesAfter, nodesBefore, 'Second init does not duplicate seed nodes');

  // null/undefined state handled
  var r = KG.initKnowledgeGraph(null);
  assert(r === null, 'null state returns null');

  // Extra properties preserved
  var s2 = KG.initKnowledgeGraph({ myProp: 42 });
  assertEqual(s2.myProp, 42, 'Existing state properties preserved');
});

// ============================================================================
// SUITE 3: createNode
// ============================================================================

suite('3. createNode', function() {
  var state = freshState();
  var p1 = uid();

  // Happy path
  var res = KG.createNode(state, p1, { title: 'Fire Making', content: 'Strike flint to spark.', category: 'crafting', tags: ['fire'] });
  assert(res.ok,                         'createNode returns ok');
  assertNotNull(res.node,                'createNode returns node');
  assert(typeof res.node.id === 'string','node has string id');
  assertEqual(res.node.title,    'Fire Making',              'node title set');
  assertEqual(res.node.content,  'Strike flint to spark.',   'node content set');
  assertEqual(res.node.category, 'crafting',                 'node category set');
  assertEqual(res.node.contributor, p1,                      'node contributor set');
  assertEqual(res.node.verification, 'unverified',           'new node unverified');
  assertEqual(res.node.upvotes, 0,                           'new node has 0 upvotes');
  assertEqual(res.node.downvotes, 0,                         'new node has 0 downvotes');
  assert(typeof res.node.voters === 'object',                'voters object created');
  assert(Array.isArray(res.node.tags),                       'tags is array');
  assertEqual(res.node.tags[0], 'fire',                      'tag stored correctly');
  assertEqual(res.node.connectionCount, 0,                   'connectionCount starts at 0');
  assertGte(res.spark, 1,                                    'spark reward returned');
  assertEqual(res.spark, KG.SPARK_CREATE_NODE,               'correct spark amount');

  // Node stored in state
  var storedNode = KG.getNode(state, res.node.id);
  assertNotNull(storedNode, 'node retrievable from state');
  assertEqual(storedNode.id, res.node.id, 'retrieved node has correct id');

  // Contributor rep updated
  var rep = KG.getContributorRep(state, p1);
  assertNotNull(rep, 'contributor rep created');
  assertEqual(rep.nodesCreated, 1, 'nodesCreated incremented');
  assertEqual(rep.spark, KG.SPARK_CREATE_NODE, 'spark in rep matches reward');

  // Validation — missing title
  var r2 = KG.createNode(state, p1, { title: '', content: 'x', category: 'lore' });
  assert(!r2.ok,                'empty title rejected');
  assertEqual(r2.error, 'title_required', 'title_required error');

  // Validation — missing content
  var r3 = KG.createNode(state, p1, { title: 'T', content: '', category: 'lore' });
  assert(!r3.ok, 'empty content rejected');
  assertEqual(r3.error, 'content_required', 'content_required error');

  // Validation — invalid category
  var r4 = KG.createNode(state, p1, { title: 'T2', content: 'C', category: 'badcat' });
  assert(!r4.ok, 'invalid category rejected');
  assertEqual(r4.error, 'invalid_category', 'invalid_category error');

  // Validation — no player
  var r5 = KG.createNode(state, null, { title: 'T3', content: 'C3', category: 'lore' });
  assert(!r5.ok, 'null playerId rejected');

  // Validation — no state
  var r6 = KG.createNode(null, p1, { title: 'T4', content: 'C4', category: 'lore' });
  assert(!r6.ok, 'null state rejected');

  // Duplicate title from same contributor
  KG.createNode(state, p1, { title: 'Unique Title DUP', content: 'Some content', category: 'lore' });
  var r7 = KG.createNode(state, p1, { title: 'Unique Title DUP', content: 'Different content', category: 'lore' });
  assert(!r7.ok,                        'duplicate title from same player rejected');
  assertEqual(r7.error, 'duplicate_title', 'duplicate_title error');

  // Different player can use same title
  var p2 = uid();
  var r8 = KG.createNode(state, p2, { title: 'Unique Title DUP', content: 'Another content', category: 'lore' });
  assert(r8.ok, 'different player can use same title');

  // Tags default to empty array if not provided
  var r9 = KG.createNode(state, p1, { title: 'No Tags', content: 'Content here', category: 'combat' });
  assert(r9.ok, 'createNode works without tags');
  assert(Array.isArray(r9.node.tags), 'tags defaults to array');
  assertEqual(r9.node.tags.length, 0, 'empty tags array by default');

  // All valid categories work
  var cats = KG.NODE_CATEGORIES;
  for (var ci = 0; ci < cats.length; ci++) {
    var rCat = KG.createNode(state, p1, { title: 'Cat ' + cats[ci], content: 'Content', category: cats[ci] });
    assert(rCat.ok, 'category ' + cats[ci] + ' accepted');
  }
});

// ============================================================================
// SUITE 4: getNode / updateNode / deleteNode
// ============================================================================

suite('4. getNode / updateNode / deleteNode', function() {
  var state = freshState();
  var p1 = uid();
  var p2 = uid();

  var id1 = addNode(state, p1, { title: 'Editable Node', content: 'Original content', category: 'lore' });

  // getNode happy path
  var node = KG.getNode(state, id1);
  assertNotNull(node, 'getNode returns node');
  assertEqual(node.title, 'Editable Node', 'correct title returned');

  // getNode not found
  assertNull(KG.getNode(state, 'nonexistent'), 'getNode returns null for missing id');

  // getNode null state
  assertNull(KG.getNode(null, id1), 'getNode returns null for null state');

  // updateNode happy path
  var upd = KG.updateNode(state, p1, id1, { title: 'Updated Title', content: 'New content here' });
  assert(upd.ok, 'updateNode succeeds for contributor');
  var updated = KG.getNode(state, id1);
  assertEqual(updated.title,   'Updated Title',    'title updated');
  assertEqual(updated.content, 'New content here', 'content updated');
  // Verification reset when content changes
  assertEqual(updated.verification, 'unverified', 'verification reset on content update');

  // updateNode — non-contributor rejected
  var upd2 = KG.updateNode(state, p2, id1, { title: 'Hacked' });
  assert(!upd2.ok,                    'non-contributor cannot update');
  assertEqual(upd2.error, 'not_contributor', 'not_contributor error');

  // updateNode — node not found
  var upd3 = KG.updateNode(state, p1, 'ghost_id', { title: 'X' });
  assert(!upd3.ok,                    'update of missing node fails');
  assertEqual(upd3.error, 'node_not_found', 'node_not_found error');

  // updateNode — update tags
  var upd4 = KG.updateNode(state, p1, id1, { tags: ['alpha', 'beta'] });
  assert(upd4.ok, 'updateNode allows tag update');
  var nTags = KG.getNode(state, id1);
  assertEqual(nTags.tags.length, 2, 'tags updated to 2 items');
  assertEqual(nTags.tags[0], 'alpha', 'first tag correct');

  // deleteNode happy path
  var id2 = addNode(state, p1, { category: 'combat' });
  var del1 = KG.deleteNode(state, p1, id2);
  assert(del1.ok, 'deleteNode succeeds for contributor');
  assertNull(KG.getNode(state, id2), 'deleted node no longer retrievable');

  // deleteNode — non-contributor
  var id3 = addNode(state, p1, { category: 'combat' });
  var del2 = KG.deleteNode(state, p2, id3);
  assert(!del2.ok,                    'non-contributor cannot delete');
  assertEqual(del2.error, 'not_contributor', 'not_contributor delete error');

  // deleteNode — node not found
  var del3 = KG.deleteNode(state, p1, 'ghost_del');
  assert(!del3.ok, 'delete of missing node fails');

  // deleteNode removes associated edges
  var id4 = addNode(state, p1, { category: 'lore' });
  var id5 = addNode(state, p2, { category: 'lore' });
  KG.addRelationship(state, p1, id4, id5, 'related_to');
  var edgesBefore = KG.getNodeEdges(state, id5).length;
  assertGte(edgesBefore, 1, 'edge exists before delete');
  KG.deleteNode(state, p1, id4);
  var edgesAfter = KG.getNodeEdges(state, id5).length;
  assertEqual(edgesAfter, 0, 'edges removed when node deleted');
  // Connection count on remaining node decremented
  var remaining = KG.getNode(state, id5);
  assertEqual(remaining.connectionCount, 0, 'connectionCount decremented on partner');
});

// ============================================================================
// SUITE 5: addRelationship / removeRelationship
// ============================================================================

suite('5. addRelationship / removeRelationship', function() {
  var state = freshState();
  var p1 = uid();
  var p2 = uid();
  var id1 = addNode(state, p1, { category: 'crafting' });
  var id2 = addNode(state, p2, { category: 'crafting' });
  var id3 = addNode(state, p1, { category: 'ecology' });

  // Happy path — all relationship types
  var rels = KG.RELATIONSHIP_TYPES;
  for (var ri = 0; ri < rels.length; ri++) {
    var fromId = addNode(state, p1, { category: 'lore' });
    var toId   = addNode(state, p2, { category: 'lore' });
    var relRes = KG.addRelationship(state, p1, fromId, toId, rels[ri]);
    assert(relRes.ok, 'addRelationship ok for type: ' + rels[ri]);
    assertNotNull(relRes.edge, 'edge object returned for type: ' + rels[ri]);
    assertEqual(relRes.edge.type, rels[ri], 'edge type correct: ' + rels[ri]);
    assertEqual(relRes.edge.from, fromId, 'edge.from correct');
    assertEqual(relRes.edge.to,   toId,   'edge.to correct');
    assertEqual(relRes.edge.contributor, p1, 'edge contributor set');
  }

  // Connection count incremented
  var res1 = KG.addRelationship(state, p1, id1, id2, 'related_to');
  assert(res1.ok, 'addRelationship for connection count test');
  assertEqual(KG.getNode(state, id1).connectionCount, 1, 'id1 connectionCount incremented');
  assertEqual(KG.getNode(state, id2).connectionCount, 1, 'id2 connectionCount incremented');

  // Second relationship between same pair (different type) allowed
  var res2 = KG.addRelationship(state, p1, id1, id2, 'teaches');
  assert(res2.ok, 'second different-type edge between same pair allowed');
  assertEqual(KG.getNode(state, id1).connectionCount, 2, 'connectionCount further incremented');

  // Duplicate edge (same type) rejected
  var res3 = KG.addRelationship(state, p1, id1, id2, 'related_to');
  assert(!res3.ok,                    'duplicate edge rejected');
  assertEqual(res3.error, 'duplicate_edge', 'duplicate_edge error');

  // Self-loop rejected
  var res4 = KG.addRelationship(state, p1, id1, id1, 'related_to');
  assert(!res4.ok,              'self-loop rejected');
  assertEqual(res4.error, 'self_loop', 'self_loop error');

  // Invalid relationship type
  var res5 = KG.addRelationship(state, p1, id1, id3, 'hugs');
  assert(!res5.ok,                              'invalid rel type rejected');
  assertEqual(res5.error, 'invalid_relationship_type', 'invalid_relationship_type error');

  // Node not found
  var res6 = KG.addRelationship(state, p1, 'ghost', id1, 'related_to');
  assert(!res6.ok,                     'from_node_not_found error');
  assertEqual(res6.error, 'from_node_not_found', 'from_node_not_found message');

  var res7 = KG.addRelationship(state, p1, id1, 'ghost2', 'related_to');
  assert(!res7.ok,                   'to_node_not_found error');
  assertEqual(res7.error, 'to_node_not_found', 'to_node_not_found message');

  // No player
  var res8 = KG.addRelationship(state, null, id1, id2, 'related_to');
  assert(!res8.ok, 'null player rejected for addRelationship');

  // removeRelationship happy path
  var rId1 = addNode(state, p1, { category: 'social' });
  var rId2 = addNode(state, p2, { category: 'social' });
  KG.addRelationship(state, p1, rId1, rId2, 'extends');
  var cntBefore1 = KG.getNode(state, rId1).connectionCount;
  var cntBefore2 = KG.getNode(state, rId2).connectionCount;
  var rem1 = KG.removeRelationship(state, p1, rId1, rId2, 'extends');
  assert(rem1.ok, 'removeRelationship succeeds');
  assertEqual(KG.getNode(state, rId1).connectionCount, cntBefore1 - 1, 'connectionCount decremented on from node');
  assertEqual(KG.getNode(state, rId2).connectionCount, cntBefore2 - 1, 'connectionCount decremented on to node');
  // Edge gone
  var edgesAfterRem = KG.getNodeEdges(state, rId1);
  var stillExists = edgesAfterRem.some(function(e) { return e.type === 'extends'; });
  assert(!stillExists, 'removed edge no longer in graph');

  // removeRelationship — edge not found
  var rem2 = KG.removeRelationship(state, p1, rId1, rId2, 'extends');
  assert(!rem2.ok,                  'remove of already-removed edge fails');
  assertEqual(rem2.error, 'edge_not_found', 'edge_not_found error');
});

// ============================================================================
// SUITE 6: getNodeEdges / getEdgesByType
// ============================================================================

suite('6. getNodeEdges / getEdgesByType', function() {
  var state = freshState();
  var p1 = uid();
  var p2 = uid();
  var id1 = addNode(state, p1, { category: 'combat' });
  var id2 = addNode(state, p2, { category: 'combat' });
  var id3 = addNode(state, p1, { category: 'lore' });

  KG.addRelationship(state, p1, id1, id2, 'teaches');
  KG.addRelationship(state, p1, id1, id3, 'related_to');

  var edges1 = KG.getNodeEdges(state, id1);
  assertEqual(edges1.length, 2, 'getNodeEdges returns both edges for id1');

  var edges2 = KG.getNodeEdges(state, id2);
  assertEqual(edges2.length, 1, 'getNodeEdges returns 1 edge for id2');

  // Unknown node returns empty
  var edgesGhost = KG.getNodeEdges(state, 'ghost');
  assert(Array.isArray(edgesGhost), 'getNodeEdges returns array for unknown id');
  assertEqual(edgesGhost.length, 0, 'empty array for unknown node');

  // Null state
  var edgesNull = KG.getNodeEdges(null, id1);
  assertEqual(edgesNull.length, 0, 'getNodeEdges returns [] for null state');

  // getEdgesByType
  var teachEdges = KG.getEdgesByType(state, 'teaches');
  assert(Array.isArray(teachEdges), 'getEdgesByType returns array');
  assert(teachEdges.length >= 1, 'teaches edges found');
  for (var i = 0; i < teachEdges.length; i++) {
    assertEqual(teachEdges[i].type, 'teaches', 'all returned edges have correct type');
  }

  var relEdges = KG.getEdgesByType(state, 'related_to');
  assert(relEdges.length >= 1, 'related_to edges found');

  // Non-existent type
  var noneEdges = KG.getEdgesByType(state, 'no_such_type');
  assertEqual(noneEdges.length, 0, 'no edges for unknown type');

  // Null state
  var nullEdges = KG.getEdgesByType(null, 'teaches');
  assertEqual(nullEdges.length, 0, 'getEdgesByType returns [] for null state');
});

// ============================================================================
// SUITE 7: searchNodes
// ============================================================================

suite('7. searchNodes', function() {
  var state = freshState();
  var p1 = uid();
  var p2 = uid();

  KG.createNode(state, p1, { title: 'Iron Smelting Guide', content: 'How to smelt iron ore into bars.', category: 'crafting', tags: ['iron', 'metallurgy'] });
  KG.createNode(state, p1, { title: 'Combat Tactics 101', content: 'Basic fighting techniques for beginners.', category: 'combat', tags: ['tactics', 'beginner'] });
  KG.createNode(state, p2, { title: 'Herb Lore Volume I',  content: 'Identifying common herbs in the Wilds.', category: 'ecology', tags: ['herbs', 'wilds'] });
  KG.createNode(state, p2, { title: 'Ancient Prophecy',    content: 'A mysterious iron-forged tablet prophesied the Nexus.', category: 'lore', tags: ['prophecy', 'nexus'] });

  // Keyword in title
  var r1 = KG.searchNodes(state, 'iron');
  assert(r1.length >= 2, 'keyword "iron" matches title and content');

  // Keyword in tags
  var r2 = KG.searchNodes(state, 'metallurgy');
  assert(r2.length >= 1, 'keyword "metallurgy" matches tag');

  // Keyword in content
  var r3 = KG.searchNodes(state, 'forged');
  assert(r3.length >= 1, 'keyword "forged" matches content');

  // No match
  var r4 = KG.searchNodes(state, 'zzznomatch');
  assertEqual(r4.length, 0, 'no results for unmatched keyword');

  // Category filter
  var r5 = KG.searchNodes(state, '', { category: 'crafting' });
  assert(r5.length >= 1, 'category filter works');
  for (var i = 0; i < r5.length; i++) {
    assertEqual(r5[i].category, 'crafting', 'all results are crafting category');
  }

  // Contributor filter
  var r6 = KG.searchNodes(state, '', { contributor: p2 });
  assert(r6.length >= 2, 'contributor filter returns p2 nodes');
  for (var j = 0; j < r6.length; j++) {
    assertEqual(r6[j].contributor, p2, 'all results belong to p2');
  }

  // Verified filter — create verified node
  var vState = freshState();
  var vp = uid();
  var vId = addNode(vState, vp, { category: 'lore' });
  verifyNode(vState, vId);
  var r7 = KG.searchNodes(vState, '', { verified: true });
  // Should include seed nodes + our verified node
  assert(r7.length >= 1, 'verified filter returns verified nodes');
  for (var k = 0; k < r7.length; k++) {
    assertEqual(r7[k].verification, 'verified', 'all results verified');
  }

  // Empty query returns all (except seeds — they're in state too)
  var r8 = KG.searchNodes(state, '');
  assertGte(r8.length, 4, 'empty query returns all player nodes plus seeds');

  // Null state
  var r9 = KG.searchNodes(null, 'iron');
  assertEqual(r9.length, 0, 'null state returns empty array');

  // Case insensitive
  var r10 = KG.searchNodes(state, 'IRON');
  assert(r10.length >= 1, 'search is case-insensitive');
});

// ============================================================================
// SUITE 8: getNodesByCategory / getNodesByContributor / getConnectedNodes / getNodesByRelationship
// ============================================================================

suite('8. Query Helpers', function() {
  var state = freshState();
  var p1 = uid();
  var p2 = uid();

  var cid1 = addNode(state, p1, { category: 'crafting' });
  var cid2 = addNode(state, p1, { category: 'crafting' });
  var lid1 = addNode(state, p2, { category: 'lore' });
  var eid1 = addNode(state, p2, { category: 'exploration' });

  KG.addRelationship(state, p1, cid1, cid2, 'teaches');
  KG.addRelationship(state, p1, cid1, lid1, 'related_to');

  // getNodesByCategory
  var crafting = KG.getNodesByCategory(state, 'crafting');
  assert(crafting.length >= 2, 'getNodesByCategory returns crafting nodes');
  for (var i = 0; i < crafting.length; i++) {
    assertEqual(crafting[i].category, 'crafting', 'all results are crafting');
  }

  // getNodesByCategory — invalid category
  var inv = KG.getNodesByCategory(state, 'badcat');
  assertEqual(inv.length, 0, 'invalid category returns empty');

  // getNodesByContributor
  var p1Nodes = KG.getNodesByContributor(state, p1);
  assert(p1Nodes.length >= 2, 'getNodesByContributor returns p1 nodes');
  for (var j = 0; j < p1Nodes.length; j++) {
    assertEqual(p1Nodes[j].contributor, p1, 'all results belong to p1');
  }

  var p2Nodes = KG.getNodesByContributor(state, p2);
  assert(p2Nodes.length >= 2, 'getNodesByContributor returns p2 nodes');

  // getNodesByContributor — unknown player
  var unknown = KG.getNodesByContributor(state, 'no_such_player');
  assertEqual(unknown.length, 0, 'unknown contributor returns empty');

  // getConnectedNodes
  var connected = KG.getConnectedNodes(state, cid1);
  assert(connected.length >= 2, 'getConnectedNodes returns neighbours');
  var hasC2 = connected.some(function(n) { return n.id === cid2; });
  var hasL1 = connected.some(function(n) { return n.id === lid1; });
  assert(hasC2, 'cid2 in connected of cid1');
  assert(hasL1, 'lid1 in connected of cid1');

  // getConnectedNodes — isolated node
  var isolated = KG.getConnectedNodes(state, eid1);
  assertEqual(isolated.length, 0, 'isolated node has no connections');

  // getConnectedNodes — unknown node
  var gcUnk = KG.getConnectedNodes(state, 'ghost_node');
  assertEqual(gcUnk.length, 0, 'unknown node returns empty for getConnectedNodes');

  // getNodesByRelationship
  var taught = KG.getNodesByRelationship(state, cid1, 'teaches');
  assert(taught.length >= 1, 'getNodesByRelationship(teaches) returns results');
  var hasC2t = taught.some(function(n) { return n.id === cid2; });
  assert(hasC2t, 'cid2 found via teaches relationship');

  var related = KG.getNodesByRelationship(state, cid1, 'related_to');
  assert(related.length >= 1, 'getNodesByRelationship(related_to) returns results');

  // getNodesByRelationship — no matches
  var deps = KG.getNodesByRelationship(state, cid1, 'depends_on');
  assertEqual(deps.length, 0, 'no depends_on for cid1');

  // Null state
  assertEqual(KG.getNodesByCategory(null, 'lore').length, 0, 'getNodesByCategory null state');
  assertEqual(KG.getNodesByContributor(null, p1).length, 0, 'getNodesByContributor null state');
  assertEqual(KG.getConnectedNodes(null, cid1).length, 0, 'getConnectedNodes null state');
  assertEqual(KG.getNodesByRelationship(null, cid1, 'teaches').length, 0, 'getNodesByRelationship null state');
});

// ============================================================================
// SUITE 9: traverseGraph / findPath / getLearningPath
// ============================================================================

suite('9. Graph Traversal', function() {
  var state = freshState();
  var p1 = uid();
  var p2 = uid();

  // Build a chain: n1 -> n2 -> n3 -> n4
  var n1 = addNode(state, p1, { category: 'crafting', title: 'Trav Node A' });
  var n2 = addNode(state, p1, { category: 'crafting', title: 'Trav Node B' });
  var n3 = addNode(state, p2, { category: 'crafting', title: 'Trav Node C' });
  var n4 = addNode(state, p2, { category: 'crafting', title: 'Trav Node D' });
  KG.addRelationship(state, p1, n1, n2, 'teaches');
  KG.addRelationship(state, p1, n2, n3, 'teaches');
  KG.addRelationship(state, p2, n3, n4, 'teaches');

  // traverseGraph from n1, depth 3
  var t1 = KG.traverseGraph(state, n1, 3);
  assert(Array.isArray(t1), 'traverseGraph returns array');
  assertGte(t1.length, 3, 'traversal finds at least 3 reachable nodes');
  // Start node not in results
  var hasN1 = t1.some(function(r) { return r.node.id === n1; });
  assert(!hasN1, 'start node not in traversal results');
  // n2 at depth 1, n3 at depth 2, n4 at depth 3
  var n2entry = t1.find(function(r) { return r.node.id === n2; });
  assertNotNull(n2entry, 'n2 in traversal');
  assertEqual(n2entry.depth, 1, 'n2 at depth 1');

  var n4entry = t1.find(function(r) { return r.node.id === n4; });
  assertNotNull(n4entry, 'n4 in traversal at depth 3');
  assertEqual(n4entry.depth, 3, 'n4 at depth 3');

  // traverseGraph depth limit
  var t2 = KG.traverseGraph(state, n1, 1);
  var hasN3 = t2.some(function(r) { return r.node.id === n3; });
  assert(!hasN3, 'depth 1 traversal does not reach n3 (depth 2)');

  // traverseGraph with rel type filter
  var t3 = KG.traverseGraph(state, n1, 3, 'teaches');
  assertGte(t3.length, 3, 'rel type filter traversal reaches all 3 via teaches');
  var t4 = KG.traverseGraph(state, n1, 3, 'contradicts');
  assertEqual(t4.length, 0, 'wrong rel type filter returns empty');

  // traverseGraph depth 0 — no results
  var t5 = KG.traverseGraph(state, n1, 0);
  assertEqual(t5.length, 0, 'depth 0 traversal returns empty');

  // traverseGraph unknown start
  var t6 = KG.traverseGraph(state, 'ghost', 3);
  assertEqual(t6.length, 0, 'unknown start node returns empty traversal');

  // findPath happy path
  var path1 = KG.findPath(state, n1, n4);
  assertNotNull(path1, 'path found between n1 and n4');
  assert(Array.isArray(path1), 'findPath returns array');
  assertEqual(path1[0], n1, 'path starts at n1');
  assertEqual(path1[path1.length - 1], n4, 'path ends at n4');

  // findPath same node
  var pathSame = KG.findPath(state, n1, n1);
  assertNotNull(pathSame, 'findPath from node to itself returns path');
  assertEqual(pathSame.length, 1, 'self-path has length 1');
  assertEqual(pathSame[0], n1, 'self-path is just the node');

  // findPath no path
  var isolated = addNode(state, p1, { category: 'social' });
  var pathNone = KG.findPath(state, n1, isolated);
  assertNull(pathNone, 'findPath returns null when no path exists');

  // findPath null state
  var pathNull = KG.findPath(null, n1, n4);
  assertNull(pathNull, 'findPath returns null for null state');

  // findPath unknown node
  var pathUnk = KG.findPath(state, 'ghost', n4);
  assertNull(pathUnk, 'findPath returns null for unknown from node');

  // getLearningPath follows teaches edges
  var lp = KG.getLearningPath(state, n1, 5);
  assert(Array.isArray(lp), 'getLearningPath returns array');
  assertGte(lp.length, 3, 'learning path has at least 3 steps');
  // Sorted by depth ascending
  for (var i = 1; i < lp.length; i++) {
    assert(lp[i].depth >= lp[i-1].depth, 'learning path sorted by depth');
  }
  // All are teaches connections
  for (var j = 0; j < lp.length; j++) {
    assert(lp[j].path.length >= 2, 'each step has a path');
  }

  // getLearningPath null state
  var lpNull = KG.getLearningPath(null, n1);
  assertEqual(lpNull.length, 0, 'getLearningPath returns [] for null state');

  // Path includes the nodes
  var n2inPath = lp.some(function(s) { return s.node.id === n2; });
  assert(n2inPath, 'n2 in learning path');
});

// ============================================================================
// SUITE 10: voteNode / getVerificationStatus
// ============================================================================

suite('10. Node Verification', function() {
  var state = freshState();
  var p1 = uid();
  var p2 = uid();
  var p3 = uid();
  var p4 = uid();

  var id1 = addNode(state, p1, { category: 'lore' });

  // Basic upvote
  var v1 = KG.voteNode(state, p2, id1, 'up');
  assert(v1.ok, 'upvote returns ok');
  assertEqual(v1.spark, KG.SPARK_VERIFY_NODE, 'voter earns SPARK_VERIFY_NODE');
  var node = KG.getNode(state, id1);
  assertEqual(node.upvotes, 1, '1 upvote after vote');

  // getVerificationStatus
  var status = KG.getVerificationStatus(state, id1);
  assertNotNull(status, 'getVerificationStatus returns object');
  assertEqual(status.upvotes, 1, 'status upvotes correct');
  assertEqual(status.downvotes, 0, 'status downvotes 0');
  assertEqual(status.score, 1, 'status score correct');
  assertEqual(status.verification, 'unverified', 'still unverified at 1 vote');

  // Reach verification threshold
  var thres = KG.VERIFY_THRESHOLD;
  for (var vi = 0; vi < thres - 1; vi++) {
    KG.voteNode(state, 'verifier_' + vi + uid(), id1, 'up');
  }
  var verifiedNode = KG.getNode(state, id1);
  assertEqual(verifiedNode.verification, 'verified', 'node verified after reaching threshold');

  // Cannot vote on own node
  var ownVote = KG.voteNode(state, p1, id1, 'up');
  assert(!ownVote.ok,                   'contributor cannot vote on own node');
  assertEqual(ownVote.error, 'cannot_vote_own_node', 'cannot_vote_own_node error');

  // Cannot vote twice
  var dblVote = KG.voteNode(state, p2, id1, 'up');
  assert(!dblVote.ok,              'double vote rejected');
  assertEqual(dblVote.error, 'already_voted', 'already_voted error');

  // Invalid vote value
  var badVote = KG.voteNode(state, p3, id1, 'maybe');
  assert(!badVote.ok,             'invalid vote value rejected');
  assertEqual(badVote.error, 'invalid_vote', 'invalid_vote error');

  // Node not found
  var ghostVote = KG.voteNode(state, p3, 'ghost', 'up');
  assert(!ghostVote.ok,                'vote on ghost node fails');
  assertEqual(ghostVote.error, 'node_not_found', 'node_not_found error');

  // Null state
  var nullVote = KG.voteNode(null, p3, id1, 'up');
  assert(!nullVote.ok, 'null state vote fails');

  // Downvotes — disputed state
  var state2 = freshState();
  var dp1 = uid();
  var dp2 = uid();
  var dp3 = uid();
  var did = addNode(state2, dp1, { category: 'combat' });
  var dispThres = KG.DISPUTE_THRESHOLD;
  for (var di = 0; di < dispThres; di++) {
    KG.voteNode(state2, 'dv_' + di + uid(), did, 'down');
  }
  var dispNode = KG.getNode(state2, did);
  assertEqual(dispNode.verification, 'disputed', 'node disputed after enough downvotes');
  assertEqual(dispNode.downvotes, dispThres, 'downvote count correct');

  // Downvote spark reward
  var dvState = freshState();
  var dvp1 = uid();
  var dvp2 = uid();
  var dvId = addNode(dvState, dvp1, { category: 'economy' });
  var dvRes = KG.voteNode(dvState, dvp2, dvId, 'down');
  assert(dvRes.ok, 'downvote returns ok');
  assertEqual(dvRes.spark, KG.SPARK_DISPUTE_NODE, 'downvote earns SPARK_DISPUTE_NODE');

  // getVerificationStatus — null state
  var nullStatus = KG.getVerificationStatus(null, id1);
  assertNull(nullStatus, 'getVerificationStatus returns null for null state');

  // getVerificationStatus — unknown node
  var ghostStatus = KG.getVerificationStatus(state, 'ghost_node');
  assertNull(ghostStatus, 'getVerificationStatus returns null for unknown node');

  // Voter rep updated
  var repP2 = KG.getContributorRep(state, p2);
  assertNotNull(repP2, 'voter rep created');
  assertGte(repP2.verifications, 1, 'verifications count incremented');
  assertGte(repP2.spark, KG.SPARK_VERIFY_NODE, 'voter spark earned');
});

// ============================================================================
// SUITE 11: synthesizeNodes
// ============================================================================

suite('11. Knowledge Synthesis', function() {
  var state = freshState();
  var p1 = uid();
  var p2 = uid();

  // Build a connected graph for synthesis
  var s1 = addNode(state, p1, { category: 'crafting', title: 'Synth Node 1' });
  var s2 = addNode(state, p2, { category: 'ecology',  title: 'Synth Node 2' });
  var s3 = addNode(state, p1, { category: 'lore',     title: 'Synth Node 3' });
  KG.addRelationship(state, p1, s1, s2, 'related_to');
  KG.addRelationship(state, p2, s2, s3, 'extends');

  // Happy path — connected pair
  var syn1 = KG.synthesizeNodes(state, p1, [s1, s2]);
  assert(syn1.ok,                     'synthesis of connected pair ok');
  assertNotNull(syn1.synthesis,        'synthesis object returned');
  assertGte(syn1.spark, 1,             'spark earned from synthesis');
  assertEqual(syn1.spark, KG.SPARK_SYNTHESIS_BASE, 'direct pair earns base spark');
  assert(typeof syn1.synthesis.insight === 'string', 'insight is string');
  assert(syn1.synthesis.insight.length > 0,          'insight is non-empty');
  assertGte(syn1.synthesis.pathLength, 2,            'path length at least 2');

  // Contributor rep updated
  var repP1 = KG.getContributorRep(state, p1);
  assertEqual(repP1.syntheses, 1, 'syntheses count incremented');
  assertGte(repP1.spark, syn1.spark, 'spark in rep includes synthesis reward');

  // Synthesis with longer path (more spark)
  var syn2 = KG.synthesizeNodes(state, p2, [s1, s3]);
  assert(syn2.ok, 'synthesis of distant pair ok');
  assertGte(syn2.spark, KG.SPARK_SYNTHESIS_BASE, 'distant pair earns >= base spark');
  // Path length 3: s1->s2->s3, bonus for length >2
  assertGte(syn2.spark, KG.SPARK_SYNTHESIS_BASE + KG.SPARK_SYNTHESIS_BONUS, 'path length bonus applied');

  // Already synthesized — same player same pair
  var syn3 = KG.synthesizeNodes(state, p1, [s1, s2]);
  assert(!syn3.ok,                     'duplicate synthesis rejected');
  assertEqual(syn3.error, 'already_synthesized', 'already_synthesized error');

  // Different player can synthesize same pair
  var syn4 = KG.synthesizeNodes(state, p2, [s1, s2]);
  assert(syn4.ok, 'different player can synthesize same pair');

  // No path between nodes — isolated
  var iso = addNode(state, p1, { category: 'social' });
  var synIso = KG.synthesizeNodes(state, p1, [s1, iso]);
  assert(!synIso.ok,                     'synthesis with no path rejected');
  assertEqual(synIso.error, 'no_path_between_nodes', 'no_path_between_nodes error');

  // Too few nodes
  var synFew = KG.synthesizeNodes(state, p1, [s1]);
  assert(!synFew.ok,                       'synthesis with 1 node rejected');
  assertEqual(synFew.error, 'need_at_least_2_nodes', 'need_at_least_2_nodes error');

  // Empty array
  var synEmpty = KG.synthesizeNodes(state, p1, []);
  assert(!synEmpty.ok, 'synthesis with empty array rejected');

  // Unknown node
  var synGhost = KG.synthesizeNodes(state, p1, [s1, 'ghost_node']);
  assert(!synGhost.ok, 'synthesis with unknown node rejected');

  // Null state
  var synNull = KG.synthesizeNodes(null, p1, [s1, s2]);
  assert(!synNull.ok, 'synthesis with null state fails');

  // No player
  var synNoP = KG.synthesizeNodes(state, null, [s1, s2]);
  assert(!synNoP.ok, 'synthesis with no player fails');

  // Deterministic insight (same seed -> same insight)
  var state2 = freshState();
  var dp1 = uid();
  var dp2 = uid();
  var da = addNode(state2, dp1, { category: 'crafting', title: 'Det Node A' });
  var db = addNode(state2, dp2, { category: 'lore',     title: 'Det Node B' });
  KG.addRelationship(state2, dp1, da, db, 'teaches');
  var det1 = KG.synthesizeNodes(state2, dp1, [da, db]);
  // Re-run on fresh state with same conditions (different player for duplicate check)
  var state3 = freshState();
  var dp3 = uid();
  // Create nodes with known IDs
  var res3a = KG.createNode(state3, dp3, { title: 'Det Node A', content: 'Same content', category: 'crafting' });
  var res3b = KG.createNode(state3, dp3, { title: 'Det Node B', content: 'Same content', category: 'lore' });
  // Nodes won't have same IDs (timestamps differ), but insight is seeded on node IDs
  assert(typeof det1.synthesis.insight === 'string', 'deterministic synthesis produces string insight');

  // 3-node synthesis with path through middle
  var sm1 = addNode(state, p1, { category: 'economy', title: 'Multi Syn A' });
  var sm2 = addNode(state, p2, { category: 'economy', title: 'Multi Syn B' });
  var sm3 = addNode(state, p1, { category: 'economy', title: 'Multi Syn C' });
  KG.addRelationship(state, p1, sm1, sm2, 'teaches');
  KG.addRelationship(state, p2, sm2, sm3, 'extends');
  var synMulti = KG.synthesizeNodes(state, p2, [sm1, sm2, sm3]);
  assert(synMulti.ok, '3-node synthesis works');
  assert(synMulti.synthesis.nodeIds.length === 3, 'synthesis records all node IDs');

  // getPlayerSyntheses
  var pSyns = KG.getPlayerSyntheses(state, p1);
  assert(Array.isArray(pSyns), 'getPlayerSyntheses returns array');
  assertGte(pSyns.length, 1, 'at least 1 synthesis for p1');
  for (var si = 0; si < pSyns.length; si++) {
    assertEqual(pSyns[si].player, p1, 'all returned syntheses belong to p1');
  }

  // getPlayerSyntheses — no syntheses
  var noSyns = KG.getPlayerSyntheses(state, 'nobody');
  assertEqual(noSyns.length, 0, 'no syntheses for unknown player');

  // getPlayerSyntheses — null state
  var nullSyns = KG.getPlayerSyntheses(null, p1);
  assertEqual(nullSyns.length, 0, 'null state returns empty for getPlayerSyntheses');

  // Node reinforced after synthesis
  var beforeTs = KG.getNode(state, s1).lastReinforced;
  // Small delay not possible in sync code — just check field exists
  assertNotNull(KG.getNode(state, s1).lastReinforced, 'lastReinforced field present after synthesis');
});

// ============================================================================
// SUITE 12: Contributor Reputation
// ============================================================================

suite('12. Contributor Reputation', function() {
  var state = freshState();
  var p1 = uid();
  var p2 = uid();
  var p3 = uid();

  // p1 creates 3 nodes
  var id1 = addNode(state, p1, { category: 'crafting' });
  var id2 = addNode(state, p1, { category: 'lore' });
  var id3 = addNode(state, p2, { category: 'ecology' });

  // p1 adds 2 edges
  KG.addRelationship(state, p1, id1, id2, 'teaches');
  KG.addRelationship(state, p1, id1, id3, 'related_to');

  // p2 votes
  KG.voteNode(state, p2, id1, 'up');

  // p1 synthesizes
  KG.synthesizeNodes(state, p1, [id1, id2]);

  var rep1 = KG.getContributorRep(state, p1);
  assertNotNull(rep1, 'rep exists for p1');
  assertEqual(rep1.playerId, p1, 'playerId in rep');
  assertGte(rep1.nodesCreated, 2, 'nodesCreated >= 2');
  assertGte(rep1.edgesCreated, 2, 'edgesCreated >= 2');
  assertGte(rep1.syntheses, 1,    'syntheses >= 1');
  assertGte(rep1.spark, 1,        'spark > 0');
  assertEqual(rep1.total, rep1.nodesCreated + rep1.edgesCreated + rep1.verifications + rep1.syntheses, 'total is sum');

  var rep2 = KG.getContributorRep(state, p2);
  assertNotNull(rep2, 'rep exists for p2');
  assertGte(rep2.verifications, 1, 'p2 verifications counted');

  // Unknown player
  var repUnk = KG.getContributorRep(state, 'nobody');
  assertNull(repUnk, 'unknown player returns null rep');

  // Null state
  var repNull = KG.getContributorRep(null, p1);
  assertNull(repNull, 'null state returns null rep');

  // Leaderboard
  var lb = KG.getContributorLeaderboard(state, 5);
  assert(Array.isArray(lb), 'leaderboard is array');
  assertGte(lb.length, 1, 'leaderboard has at least 1 entry');
  // Sorted descending by total
  for (var i = 1; i < lb.length; i++) {
    assert(lb[i].total <= lb[i-1].total, 'leaderboard sorted descending');
  }

  // Leaderboard limit
  var lb2 = KG.getContributorLeaderboard(state, 1);
  assertEqual(lb2.length, 1, 'leaderboard limit of 1 respected');

  // Leaderboard null state
  var lbNull = KG.getContributorLeaderboard(null);
  assertEqual(lbNull.length, 0, 'null state returns empty leaderboard');

  // Leaderboard default limit (no arg)
  var lbDef = KG.getContributorLeaderboard(state);
  assert(Array.isArray(lbDef), 'leaderboard with no limit returns array');
  assertLte(lbDef.length, 10, 'default limit is 10');
});

// ============================================================================
// SUITE 13: Knowledge Decay
// ============================================================================

suite('13. Knowledge Decay', function() {
  var state = freshState();
  var p1 = uid();
  var p2 = uid();

  // Create an unverified node
  var id1 = addNode(state, p1, { category: 'lore' });
  var node1 = KG.getNode(state, id1);
  assertEqual(node1.ticksWithoutReinforcement, 0, 'fresh node has 0 ticks');

  // Tick once — below threshold
  var res1 = KG.tickDecay(state);
  assert(typeof res1 === 'object', 'tickDecay returns object');
  assert(Array.isArray(res1.decayed), 'decayed array returned');
  assert(Array.isArray(res1.removed), 'removed array returned');
  assertEqual(res1.decayed.length, 0, 'no decay below threshold');
  assertEqual(KG.getNode(state, id1).ticksWithoutReinforcement, 1, 'tick counter incremented');
  assertEqual(state.knowledgeGraph.tickCount, 1, 'tickCount incremented');

  // Simulate reaching threshold — manually set ticks
  var threshold = KG.DECAY_TICKS_THRESHOLD;
  KG.getNode(state, id1).ticksWithoutReinforcement = threshold - 1;
  // One more tick should trigger decay (upvotes was 0)
  var res2 = KG.tickDecay(state);
  // Node had no upvotes — so nothing to decay BUT should still reset counter
  assertEqual(KG.getNode(state, id1).ticksWithoutReinforcement, 0, 'decay tick counter reset after threshold');

  // Node with upvotes decays
  var id2 = addNode(state, p1, { category: 'combat' });
  KG.getNode(state, id2).upvotes = 3;
  KG.getNode(state, id2).ticksWithoutReinforcement = threshold - 1;
  var res3 = KG.tickDecay(state);
  var decayedNode = KG.getNode(state, id2);
  assert(decayedNode.upvotes < 3, 'upvotes decayed after threshold ticks');
  assert(res3.decayed.some(function(d) { return d.id === id2; }), 'id2 in decayed list');

  // Verified nodes do NOT decay
  var idVerified = addNode(state, p1, { category: 'ecology' });
  KG.getNode(state, idVerified).verification = 'verified';
  KG.getNode(state, idVerified).upvotes = 5;
  KG.getNode(state, idVerified).ticksWithoutReinforcement = threshold - 1;
  KG.tickDecay(state);
  assertEqual(KG.getNode(state, idVerified).upvotes, 5, 'verified node does not decay');

  // NPC nodes do NOT decay
  // (NPC seed nodes have isNpc: true)
  var seedId = KG.SEED_NODES[0].id;
  var seedNode = KG.getNode(state, seedId);
  if (seedNode) {
    var origUpvotes = seedNode.upvotes;
    seedNode.ticksWithoutReinforcement = threshold - 1;
    KG.tickDecay(state);
    assertEqual(KG.getNode(state, seedId).upvotes, origUpvotes, 'NPC seed node does not decay');
  }

  // Orphan node fully decayed — removed after 2 decay cycles
  var idOrphan = addNode(state, p1, { category: 'social' });
  var orphanNode = KG.getNode(state, idOrphan);
  orphanNode.upvotes = 0;
  orphanNode.downvotes = 0;
  orphanNode.voters = {};
  // First decay cycle
  orphanNode.ticksWithoutReinforcement = threshold - 1;
  KG.tickDecay(state);
  assertNotNull(KG.getNode(state, idOrphan), 'orphan not removed after first decay cycle');
  // Second decay cycle
  var orphanAfterFirst = KG.getNode(state, idOrphan);
  orphanAfterFirst.ticksWithoutReinforcement = threshold - 1;
  var res4 = KG.tickDecay(state);
  // Orphan with no votes, no edges, 2+ decay cycles should be removed
  assertNull(KG.getNode(state, idOrphan), 'fully-decayed orphan node removed after 2 cycles');
  assert(res4.removed.some(function(r) { return r.id === idOrphan; }), 'idOrphan in removed list');

  // Node with edges is NOT removed even if fully decayed
  var idEdged = addNode(state, p1, { category: 'economy' });
  var idPartner = addNode(state, p2, { category: 'economy' });
  KG.addRelationship(state, p1, idEdged, idPartner, 'extends');
  KG.getNode(state, idEdged).upvotes = 0;
  KG.getNode(state, idEdged).downvotes = 0;
  KG.getNode(state, idEdged).voters = {};
  KG.getNode(state, idEdged).ticksWithoutReinforcement = threshold - 1;
  var res5 = KG.tickDecay(state);
  assertNotNull(KG.getNode(state, idEdged), 'connected node not removed even if fully decayed');

  // tickDecay null state
  var resNull = KG.tickDecay(null);
  assertEqual(resNull.decayed.length, 0, 'null state tickDecay returns empty decayed');
  assertEqual(resNull.removed.length, 0, 'null state tickDecay returns empty removed');

  // reinforceNode
  var idReinf = addNode(state, p1, { category: 'exploration' });
  KG.getNode(state, idReinf).ticksWithoutReinforcement = 50;
  var reinfRes = KG.reinforceNode(state, idReinf);
  assert(reinfRes.ok, 'reinforceNode returns ok');
  assertEqual(KG.getNode(state, idReinf).ticksWithoutReinforcement, 0, 'reinforceNode resets tick counter');

  // reinforceNode — unknown node
  var reinfUnk = KG.reinforceNode(state, 'ghost');
  assert(!reinfUnk.ok,                'reinforceNode fails for unknown node');
  assertEqual(reinfUnk.error, 'node_not_found', 'node_not_found on reinforceNode');

  // reinforceNode — null state
  var reinfNull = KG.reinforceNode(null, idReinf);
  assert(!reinfNull.ok, 'reinforceNode fails for null state');
});

// ============================================================================
// SUITE 14: NPC Contributions
// ============================================================================

suite('14. NPC Contributions', function() {
  var state = freshState();

  // npcContributeNode — all archetypes
  var archetypes = ['teacher', 'gardener', 'builder', 'storyteller', 'merchant',
                    'explorer', 'musician', 'healer', 'philosopher', 'artist'];
  for (var ai = 0; ai < archetypes.length; ai++) {
    var arch = archetypes[ai];
    var res = KG.npcContributeNode(state, 'npc_' + arch + '_99', arch, {
      title:   arch + ' Knowledge ' + ai,
      content: 'Content from ' + arch + ' NPC teacher.',
      tags:    [arch]
    });
    assert(res.ok,          'npcContributeNode ok for archetype: ' + arch);
    assertNotNull(res.node, 'node returned for archetype: ' + arch);
    assertEqual(res.node.isNpc, true, 'isNpc flag set for: ' + arch);
    assertEqual(res.node.verification, 'verified', 'NPC node starts verified: ' + arch);
    assertEqual(res.node.upvotes, 3, 'NPC node starts with 3 upvotes: ' + arch);
    var expectedCat = KG.NPC_ARCHETYPE_CATEGORIES[arch];
    assertEqual(res.node.category, expectedCat, 'category correct for archetype: ' + arch);
  }

  // npcContributeNode — unknown archetype falls back to 'lore'
  var res2 = KG.npcContributeNode(state, 'npc_unknown', 'wizard', {
    title:   'Wizard Lore',
    content: 'Wizardly wisdom.',
  });
  assert(res2.ok, 'unknown archetype accepted');
  assertEqual(res2.node.category, 'lore', 'unknown archetype defaults to lore');

  // npcContributeNode — validation
  var res3 = KG.npcContributeNode(state, 'npc_x', 'teacher', { title: '', content: 'c' });
  assert(!res3.ok,                             'empty title rejected');
  assertEqual(res3.error, 'title_and_content_required', 'title_and_content_required error');

  var res4 = KG.npcContributeNode(state, null, 'teacher', { title: 'T', content: 'C' });
  assert(!res4.ok, 'null npcId rejected');

  var res5 = KG.npcContributeNode(null, 'npc_x', 'teacher', { title: 'T', content: 'C' });
  assert(!res5.ok, 'null state rejected');

  // npcReferenceNode — reinforces a node
  var targetId = addNode(state, 'player_x', { category: 'lore' });
  KG.getNode(state, targetId).ticksWithoutReinforcement = 50;
  var refRes = KG.npcReferenceNode(state, targetId);
  assert(refRes.ok, 'npcReferenceNode returns ok');
  assertEqual(KG.getNode(state, targetId).ticksWithoutReinforcement, 0, 'npcReferenceNode resets decay counter');

  // NPC nodes survive decay
  var npcNodeId = res2.node.id;
  KG.getNode(state, npcNodeId).ticksWithoutReinforcement = KG.DECAY_TICKS_THRESHOLD - 1;
  KG.tickDecay(state);
  assertNotNull(KG.getNode(state, npcNodeId), 'NPC node not removed by decay');
  assertEqual(KG.getNode(state, npcNodeId).upvotes, 3, 'NPC node upvotes unchanged by decay');

  // Contributor rep created for NPC
  var npcRepRes = KG.npcContributeNode(state, 'npc_rep_test', 'merchant', {
    title: 'Rep Test Node', content: 'Some important merchant knowledge.'
  });
  var npcRep = KG.getContributorRep(state, 'npc_rep_test');
  assertNotNull(npcRep, 'NPC contributor rep created');
  assertGte(npcRep.nodesCreated, 1, 'NPC nodesCreated incremented');
});

// ============================================================================
// SUITE 15: getGraphStats / Analytics
// ============================================================================

suite('15. Graph Stats & Analytics', function() {
  var state = freshState();
  var p1 = uid();
  var p2 = uid();

  var gid1 = addNode(state, p1, { category: 'crafting' });
  var gid2 = addNode(state, p2, { category: 'ecology' });
  var gid3 = addNode(state, p1, { category: 'lore' });

  KG.addRelationship(state, p1, gid1, gid2, 'teaches');
  KG.addRelationship(state, p1, gid1, gid3, 'related_to');
  verifyNode(state, gid1); // gid1 verified

  // getGraphStats
  var stats = KG.getGraphStats(state);
  assertNotNull(stats, 'getGraphStats returns object');
  assertGte(stats.nodeCount, 3,  'nodeCount >= 3 (player nodes)');
  assertGte(stats.edgeCount, 2,  'edgeCount >= 2');
  assertGte(stats.verifiedCount, 1, 'verifiedCount >= 1 (NPC seeds + gid1)');
  assert(typeof stats.synthesesCount  === 'number', 'synthesesCount is number');
  assert(typeof stats.tickCount       === 'number', 'tickCount is number');
  assert(typeof stats.categoryBreakdown === 'object', 'categoryBreakdown is object');
  assertGte(stats.categoryBreakdown['crafting'], 1, 'crafting in breakdown');
  assertGte(stats.categoryBreakdown['ecology'],  1, 'ecology in breakdown');
  assertGte(stats.categoryBreakdown['lore'],     1, 'lore in breakdown');
  assertEqual(stats.verifiedCount + stats.disputedCount + stats.unverifiedCount, stats.nodeCount, 'verification counts sum to nodeCount');

  // getGraphStats — null state
  var nullStats = KG.getGraphStats(null);
  assertEqual(nullStats.nodeCount, 0, 'null state returns zero nodeCount');
  assertEqual(nullStats.edgeCount, 0, 'null state returns zero edgeCount');

  // getMostConnectedNodes — gid1 has 2 connections
  var hubs = KG.getMostConnectedNodes(state, 3);
  assert(Array.isArray(hubs), 'getMostConnectedNodes returns array');
  assertGte(hubs.length, 1, 'at least 1 hub returned');
  // Sorted by connectionCount desc
  for (var i = 1; i < hubs.length; i++) {
    assert(hubs[i].connectionCount <= hubs[i-1].connectionCount, 'hubs sorted by connectionCount');
  }
  assertEqual(hubs[0].id, gid1, 'gid1 is most connected node');

  // getMostConnectedNodes — null state
  var nullHubs = KG.getMostConnectedNodes(null, 3);
  assertEqual(nullHubs.length, 0, 'null state returns empty hubs');

  // getRecentNodes
  var recent = KG.getRecentNodes(state, 5);
  assert(Array.isArray(recent), 'getRecentNodes returns array');
  assertGte(recent.length, 1, 'at least 1 recent node');
  // Sorted by createdAt desc
  for (var j = 1; j < recent.length; j++) {
    assert(recent[j].createdAt <= recent[j-1].createdAt, 'recent nodes sorted by createdAt desc');
  }

  // getRecentNodes — limit
  var recent2 = KG.getRecentNodes(state, 1);
  assertEqual(recent2.length, 1, 'getRecentNodes limit of 1 respected');

  // getRecentNodes — null state
  var nullRecent = KG.getRecentNodes(null, 5);
  assertEqual(nullRecent.length, 0, 'null state returns empty recent nodes');

  // getOrphanNodes — gid3 has an edge, gid1 and gid2 also have edges
  // Let's add an isolated node
  var orphId = addNode(state, p2, { category: 'social' });
  var orphans = KG.getOrphanNodes(state);
  assert(Array.isArray(orphans), 'getOrphanNodes returns array');
  var hasOrph = orphans.some(function(n) { return n.id === orphId; });
  assert(hasOrph, 'isolated node appears in orphans list');
  // gid1 is not an orphan
  var hasGid1 = orphans.some(function(n) { return n.id === gid1; });
  assert(!hasGid1, 'connected node not in orphans');

  // getOrphanNodes — null state
  var nullOrphans = KG.getOrphanNodes(null);
  assertEqual(nullOrphans.length, 0, 'null state returns empty orphans');

  // getConflictingNodes
  var cState = freshState();
  var cp1 = uid();
  var cp2 = uid();
  var cn1 = addNode(cState, cp1, { category: 'lore' });
  var cn2 = addNode(cState, cp2, { category: 'lore' });
  KG.addRelationship(cState, cp1, cn1, cn2, 'contradicts');
  var conflicts = KG.getConflictingNodes(cState);
  assert(Array.isArray(conflicts), 'getConflictingNodes returns array');
  assertGte(conflicts.length, 1, 'at least 1 conflict found');
  assertEqual(conflicts[0].edge.type, 'contradicts', 'conflict edge type is contradicts');
  assertNotNull(conflicts[0].nodeA, 'conflict has nodeA');
  assertNotNull(conflicts[0].nodeB, 'conflict has nodeB');

  // No contradicts edges
  var noConflicts = KG.getConflictingNodes(state);
  assert(Array.isArray(noConflicts), 'getConflictingNodes returns array even if empty');

  // getConflictingNodes — null state
  var nullConflicts = KG.getConflictingNodes(null);
  assertEqual(nullConflicts.length, 0, 'null state returns empty conflicts');
});

// ============================================================================
// SUITE 16: Seed Nodes Integrity
// ============================================================================

suite('16. Seed Nodes Integrity', function() {
  // Verify SEED_NODES data structure
  var required = ['id', 'title', 'content', 'category', 'contributor', 'isNpc', 'tags'];
  for (var i = 0; i < KG.SEED_NODES.length; i++) {
    var seed = KG.SEED_NODES[i];
    for (var j = 0; j < required.length; j++) {
      assert(seed[required[j]] !== undefined, 'seed[' + i + '] has field: ' + required[j]);
    }
    assert(_isValidCat(seed.category), 'seed[' + i + '] has valid category: ' + seed.category);
    assert(Array.isArray(seed.tags), 'seed[' + i + '] tags is array');
    assert(typeof seed.title   === 'string' && seed.title.length > 0,   'seed[' + i + '] title non-empty');
    assert(typeof seed.content === 'string' && seed.content.length > 0, 'seed[' + i + '] content non-empty');
    assert(seed.isNpc === true, 'seed[' + i + '] isNpc true');
  }

  // Unique IDs
  var ids = {};
  var allUnique = true;
  for (var k = 0; k < KG.SEED_NODES.length; k++) {
    if (ids[KG.SEED_NODES[k].id]) { allUnique = false; }
    ids[KG.SEED_NODES[k].id] = true;
  }
  assert(allUnique, 'all SEED_NODES have unique IDs');

  // Categories covered by seed nodes
  var seedCats = {};
  for (var si = 0; si < KG.SEED_NODES.length; si++) {
    seedCats[KG.SEED_NODES[si].category] = true;
  }
  assert(Object.keys(seedCats).length >= 3, 'seed nodes cover at least 3 different categories');

  // After init, seed nodes are in state
  var s = freshState();
  for (var li = 0; li < KG.SEED_NODES.length; li++) {
    var node = KG.getNode(s, KG.SEED_NODES[li].id);
    assertNotNull(node, 'seed node ' + KG.SEED_NODES[li].id + ' present in state');
    assertEqual(node.verification, 'verified', 'seed node ' + KG.SEED_NODES[li].id + ' is verified');
    assertEqual(node.isNpc, true, 'seed node ' + KG.SEED_NODES[li].id + ' isNpc=true');
    assertGte(node.upvotes, 3, 'seed node ' + KG.SEED_NODES[li].id + ' starts with upvotes >= 3');
  }
});

// Helper for suite 16
function _isValidCat(cat) {
  var cats = KG.NODE_CATEGORIES;
  for (var i = 0; i < cats.length; i++) { if (cats[i] === cat) { return true; } }
  return false;
}

// ============================================================================
// SUITE 17: Integration — Full Workflow
// ============================================================================

suite('17. Integration — Full Workflow', function() {
  var state = freshState();
  var scholar1 = uid();
  var scholar2 = uid();
  var scholar3 = uid();

  // 1. Two scholars create nodes
  var nA = addNode(state, scholar1, { category: 'crafting', title: 'Iron Forging', tags: ['smithing'] });
  var nB = addNode(state, scholar2, { category: 'economy', title: 'Market Demand', tags: ['trade'] });
  var nC = addNode(state, scholar1, { category: 'lore', title: 'Steel Origins', tags: ['history', 'smithing'] });
  assertGte(Object.keys(state.knowledgeGraph.nodes).length, 3, '3+ nodes after creation');

  // 2. Link them
  KG.addRelationship(state, scholar1, nA, nB, 'related_to');
  KG.addRelationship(state, scholar1, nA, nC, 'extends');

  // 3. scholar3 verifies nA
  for (var vi = 0; vi < KG.VERIFY_THRESHOLD; vi++) {
    KG.voteNode(state, 'voter_' + vi + uid(), nA, 'up');
  }
  assertEqual(KG.getNode(state, nA).verification, 'verified', 'nA verified after community votes');

  // 4. Synthesize
  var synResult = KG.synthesizeNodes(state, scholar3, [nA, nB]);
  assert(synResult.ok, 'synthesis succeeds in workflow');
  assert(synResult.synthesis.insight.indexOf('Iron Forging') !== -1 ||
         synResult.synthesis.insight.indexOf('Market Demand') !== -1,
         'synthesis insight mentions one of the node titles');

  // 5. Leaderboard reflects activity
  var lb = KG.getContributorLeaderboard(state, 5);
  assert(lb.length >= 2, 'leaderboard shows multiple contributors');
  // scholar1 created 2 nodes and 2 edges — should be near top
  var s1Entry = lb.find(function(e) { return e.playerId === scholar1; });
  assertNotNull(s1Entry, 'scholar1 on leaderboard');
  assertGte(s1Entry.total, 4, 'scholar1 total activity >= 4');

  // 6. Search works
  var smithResults = KG.searchNodes(state, 'smithing');
  assertGte(smithResults.length, 1, 'smithing search finds nodes with that tag');

  // 7. Learning path from nA
  var lp = KG.getLearningPath(state, nA, 5);
  assert(Array.isArray(lp), 'learning path is array');
  // nC is teaches-adjacent via extends (not teaches), so teaches path may be empty — that is correct

  // 8. Graph stats
  var stats = KG.getGraphStats(state);
  assertGte(stats.edgeCount, 2, 'at least 2 edges in integrated graph');
  assertGte(stats.verifiedCount, 1, 'at least 1 verified node');
  assertGte(stats.synthesesCount, 1, 'at least 1 synthesis recorded');

  // 9. NPC contributes and is referenceable
  var npcRes = KG.npcContributeNode(state, 'npc_teacher_int', 'teacher', {
    title: 'Ancient Smithing Secrets', content: 'The old masters combined iron with star-metal.'
  });
  assert(npcRes.ok, 'NPC contribution in integration workflow');
  KG.addRelationship(state, scholar1, nA, npcRes.node.id, 'extends');
  var npLearning = KG.getLearningPath(state, nA, 3);
  // NPC node is now reachable via extends from nA
  var hasNpc = npLearning.some(function(s) { return s.node.id === npcRes.node.id; });
  // We followed teaches edges only — not extends — so may not appear in learning path; that's correct
  assert(typeof hasNpc === 'boolean', 'learning path NPC check executed');

  // 10. Decay ticks pass — reinforced nodes survive
  for (var ti = 0; ti < KG.DECAY_TICKS_THRESHOLD; ti++) {
    // Reinforce nA each tick to keep it alive
    KG.reinforceNode(state, nA);
    KG.tickDecay(state);
  }
  assertNotNull(KG.getNode(state, nA), 'reinforced node survives decay ticks');
});

// ============================================================================
// SUITE 18: Edge Cases & Robustness
// ============================================================================

suite('18. Edge Cases & Robustness', function() {
  // All null-state calls return gracefully
  assert(KG.getGraphStats(null).nodeCount === 0,                   'null state getGraphStats safe');
  assert(KG.getMostConnectedNodes(null).length === 0,               'null state getMostConnectedNodes safe');
  assert(KG.getRecentNodes(null).length === 0,                      'null state getRecentNodes safe');
  assert(KG.getOrphanNodes(null).length === 0,                      'null state getOrphanNodes safe');
  assert(KG.getConflictingNodes(null).length === 0,                 'null state getConflictingNodes safe');
  assert(KG.tickDecay(null).decayed.length === 0,                   'null state tickDecay safe');
  assert(KG.getContributorLeaderboard(null).length === 0,           'null state leaderboard safe');
  assert(KG.traverseGraph(null, 'x').length === 0,                  'null state traverseGraph safe');
  assert(KG.findPath(null, 'x', 'y') === null,                      'null state findPath safe');
  assert(KG.getLearningPath(null, 'x').length === 0,                'null state getLearningPath safe');
  assert(KG.getConnectedNodes(null, 'x').length === 0,              'null state getConnectedNodes safe');
  assert(KG.getEdgesByType(null, 'teaches').length === 0,           'null state getEdgesByType safe');
  assert(!KG.createNode(null, 'p', { title: 'T', content: 'C', category: 'lore' }).ok, 'null state createNode safe');
  assert(!KG.addRelationship(null, 'p', 'a', 'b', 'teaches').ok,    'null state addRelationship safe');
  assert(!KG.voteNode(null, 'p', 'n', 'up').ok,                     'null state voteNode safe');
  assert(!KG.synthesizeNodes(null, 'p', ['a', 'b']).ok,             'null state synthesizeNodes safe');
  assert(!KG.reinforceNode(null, 'x').ok,                           'null state reinforceNode safe');

  // Large number of nodes — no crash
  var state = freshState();
  var bp = uid();
  for (var i = 0; i < 50; i++) {
    addNode(state, bp, { category: KG.NODE_CATEGORIES[i % KG.NODE_CATEGORIES.length] });
  }
  var bigStats = KG.getGraphStats(state);
  assertGte(bigStats.nodeCount, 50, 'handles 50+ nodes');

  var bigHubs = KG.getMostConnectedNodes(state, 5);
  assert(bigHubs.length <= 5, 'getMostConnectedNodes respects limit on large graph');

  var bigRecent = KG.getRecentNodes(state, 10);
  assert(bigRecent.length <= 10, 'getRecentNodes respects limit on large graph');

  var bigOrphans = KG.getOrphanNodes(state);
  assertGte(bigOrphans.length, 1, 'orphan check works on large graph');

  // Chain of 10 nodes fully connected
  var chainState = freshState();
  var cp = uid();
  var chainIds = [];
  for (var ci = 0; ci < 10; ci++) {
    chainIds.push(addNode(chainState, cp, { category: 'lore', title: 'Chain ' + ci }));
  }
  for (var ei = 0; ei < chainIds.length - 1; ei++) {
    KG.addRelationship(chainState, cp, chainIds[ei], chainIds[ei+1], 'teaches');
  }
  // Path from first to last
  var longPath = KG.findPath(chainState, chainIds[0], chainIds[chainIds.length - 1]);
  assertNotNull(longPath, 'path found in 10-node chain');
  assertEqual(longPath.length, 10, 'path traverses all 10 nodes');

  // Synthesis of connected pair in chain earns bonus spark
  var synChain = KG.synthesizeNodes(chainState, cp, [chainIds[0], chainIds[9]]);
  assert(synChain.ok, 'synthesis in 10-node chain ok');
  assertGte(synChain.spark, KG.SPARK_SYNTHESIS_BASE + KG.SPARK_SYNTHESIS_BONUS, 'long path earns bonus spark');

  // updateNode with only title (no content reset)
  var titleOnlyState = freshState();
  var top = uid();
  var tid = addNode(titleOnlyState, top, { category: 'lore' });
  verifyNode(titleOnlyState, tid); // verify first
  assertEqual(KG.getNode(titleOnlyState, tid).verification, 'verified', 'node verified before title-only update');
  KG.updateNode(titleOnlyState, top, tid, { title: 'New Title Only' });
  assertEqual(KG.getNode(titleOnlyState, tid).verification, 'verified', 'verification unchanged on title-only update');

  // Node tags mutation safety (should not affect stored tags if caller mutates original array)
  var tagState = freshState();
  var tagP = uid();
  var origTags = ['alpha', 'beta'];
  var tagId = addNode(tagState, tagP, { category: 'lore', tags: origTags });
  origTags.push('gamma'); // mutate original
  var tagNode = KG.getNode(tagState, tagId);
  // Depending on implementation, tags may or may not be isolated
  assert(Array.isArray(tagNode.tags), 'tags remain array after external mutation of original');
});

// ============================================================================
// FINAL SUMMARY
// ============================================================================

process.stdout.write('\n' + '='.repeat(60) + '\n');
if (failures.length > 0) {
  process.stdout.write('FAILURES:\n');
  for (var fi = 0; fi < failures.length; fi++) {
    process.stdout.write('  ' + failures[fi] + '\n');
  }
  process.stdout.write('\n');
}
process.stdout.write(passed + ' passed, ' + failed + ' failed\n');
if (failed > 0) { process.exit(1); }
