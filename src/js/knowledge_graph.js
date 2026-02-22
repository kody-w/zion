/**
 * ZION Knowledge Graph — Athenaeum Semantic Knowledge Network
 * Player-built semantic knowledge network for the Athenaeum.
 * Knowledge nodes (facts, recipes, lore) linked by typed relationships
 * (teaches, contradicts, extends, depends_on, related_to), with search,
 * synthesis rewards, and collaborative encyclopedia.
 * Constitution reference: Article V — the Athenaeum is a zone of free knowledge.
 */

(function(exports) {
  'use strict';

  // ---------------------------------------------------------------------------
  // Optional dependency guards
  // ---------------------------------------------------------------------------
  var LoreDiscovery = (typeof window !== 'undefined' && window.LoreDiscovery) || {};
  var StoryEngine   = (typeof window !== 'undefined' && window.StoryEngine)   || {};
  var SkillMastery  = (typeof window !== 'undefined' && window.SkillMastery)  || {};
  var Profiles      = (typeof window !== 'undefined' && window.Profiles)      || {};

  // ---------------------------------------------------------------------------
  // SEEDED PRNG — mulberry32
  // ---------------------------------------------------------------------------

  function mulberry32(seed) {
    return function() {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // ---------------------------------------------------------------------------
  // CONSTANTS
  // ---------------------------------------------------------------------------

  var NODE_CATEGORIES = [
    'crafting', 'combat', 'lore', 'ecology',
    'economy', 'social', 'exploration'
  ];

  var RELATIONSHIP_TYPES = [
    'teaches', 'contradicts', 'extends', 'depends_on', 'related_to'
  ];

  var VERIFICATION_STATES = ['unverified', 'verified', 'disputed'];

  // Votes needed to change verification state
  var VERIFY_THRESHOLD  = 3;
  var DISPUTE_THRESHOLD = 2;

  // Spark rewards
  var SPARK_CREATE_NODE       = 10;
  var SPARK_VERIFY_NODE       = 5;
  var SPARK_DISPUTE_NODE      = 2;
  var SPARK_SYNTHESIS_BASE    = 25;
  var SPARK_SYNTHESIS_BONUS   = 15; // per extra hop beyond 2

  // Knowledge decay — ticks without reinforcement before decay
  var DECAY_TICKS_THRESHOLD   = 100;
  var DECAY_VOTE_LOSS         = 1;

  // NPC archetype contribution mappings
  var NPC_ARCHETYPE_CATEGORIES = {
    teacher:     'lore',
    gardener:    'ecology',
    builder:     'crafting',
    storyteller: 'lore',
    merchant:    'economy',
    explorer:    'exploration',
    musician:    'social',
    healer:      'crafting',
    philosopher: 'lore',
    artist:      'social'
  };

  // Built-in seed nodes contributed by NPC teachers
  var SEED_NODES = [
    {
      id: 'node_fire_making',
      title: 'The Art of Fire Making',
      content: 'Striking flint against iron creates sparks sufficient to ignite dry tinder. The angle of the strike determines heat generated.',
      category: 'crafting',
      contributor: 'npc_builder_01',
      isNpc: true,
      tags: ['fire', 'survival', 'crafting']
    },
    {
      id: 'node_herb_identification',
      title: 'Herb Identification in the Wilds',
      content: 'Moonpetal glows faintly at dusk; Starbloom smells of ozone. Never harvest wilted specimens — potency is halved.',
      category: 'ecology',
      contributor: 'npc_gardener_01',
      isNpc: true,
      tags: ['herbs', 'ecology', 'wilds', 'gathering']
    },
    {
      id: 'node_trade_routes',
      title: 'Agora Trade Routes',
      content: 'The Agora connects all eight zones. Merchants who arrive at dawn receive a 10% markup advantage on rare goods.',
      category: 'economy',
      contributor: 'npc_merchant_01',
      isNpc: true,
      tags: ['trade', 'economy', 'agora']
    },
    {
      id: 'node_nexus_history',
      title: 'Origins of the Nexus',
      content: 'The Nexus was the first gathering point. Seven founding citizens carved the initial roads outward, each claiming a direction.',
      category: 'lore',
      contributor: 'npc_storyteller_01',
      isNpc: true,
      tags: ['history', 'nexus', 'founding']
    },
    {
      id: 'node_arena_tactics',
      title: 'Arena Combat Fundamentals',
      content: 'Positioning trumps raw strength. Circle left to exploit most opponents. Feint twice before committing to a strike.',
      category: 'combat',
      contributor: 'npc_explorer_01',
      isNpc: true,
      tags: ['combat', 'arena', 'tactics']
    },
    {
      id: 'node_iron_smelting',
      title: 'Iron Smelting Basics',
      content: 'Iron ore requires coal at a 2:1 ratio. Bellows must be worked steadily. Impurities leave a gray sheen on the bar.',
      category: 'crafting',
      contributor: 'npc_builder_01',
      isNpc: true,
      tags: ['crafting', 'iron', 'smelting']
    },
    {
      id: 'node_seasonal_ecology',
      title: 'Seasonal Changes in the Wilds',
      content: 'Spring brings Moonpetal blooms. Summer dries the riverbed near the Wilds border. Autumn reveals hidden cave entrances under fallen leaves.',
      category: 'ecology',
      contributor: 'npc_gardener_01',
      isNpc: true,
      tags: ['ecology', 'seasons', 'wilds']
    },
    {
      id: 'node_social_bonds',
      title: 'Building Trust in ZION',
      content: 'Repeated positive interactions compound trust. A shared meal doubles bond strength versus a simple conversation.',
      category: 'social',
      contributor: 'npc_musician_01',
      isNpc: true,
      tags: ['social', 'trust', 'bonds']
    }
  ];

  // Synthesis insight templates — generated when combining nodes
  var SYNTHESIS_INSIGHTS = [
    'The connection between {a} and {b} reveals: {insight}',
    'Cross-referencing {a} with {b} uncovers: {insight}',
    'Synthesizing {a} and {b} yields: {insight}',
    'The scholar who reads both {a} and {b} discovers: {insight}'
  ];

  var INSIGHT_FRAGMENTS = [
    'a hidden synergy that triples effectiveness',
    'a contradictory principle that simplifies the problem',
    'an ancient technique lost to common knowledge',
    'a pattern that shortcuts the usual process',
    'a shared root concept unifying both domains',
    'an unexpected application in a third domain',
    'a warning that prevents a common mistake',
    'evidence of collaborative origin between the two fields'
  ];

  // ---------------------------------------------------------------------------
  // INTERNAL HELPERS
  // ---------------------------------------------------------------------------

  function _now() {
    return typeof Date !== 'undefined' ? Date.now() : 0;
  }

  function _generateId(prefix) {
    return (prefix || 'node') + '_' + (_now() % 1000000) + '_' + Math.floor(Math.random() * 10000);
  }

  function _isValidCategory(cat) {
    for (var i = 0; i < NODE_CATEGORIES.length; i++) {
      if (NODE_CATEGORIES[i] === cat) { return true; }
    }
    return false;
  }

  function _isValidRelType(rel) {
    for (var i = 0; i < RELATIONSHIP_TYPES.length; i++) {
      if (RELATIONSHIP_TYPES[i] === rel) { return true; }
    }
    return false;
  }

  function _slugify(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  }

  function _clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  // Simple string search — checks title, content, tags
  function _nodeMatchesQuery(node, query) {
    var q = query.toLowerCase();
    if (node.title && node.title.toLowerCase().indexOf(q) !== -1) { return true; }
    if (node.content && node.content.toLowerCase().indexOf(q) !== -1) { return true; }
    if (node.tags) {
      for (var i = 0; i < node.tags.length; i++) {
        if (node.tags[i].toLowerCase().indexOf(q) !== -1) { return true; }
      }
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // STATE INITIALISATION
  // ---------------------------------------------------------------------------

  /**
   * Initialise knowledge graph state on the world/game state object.
   * Populates seed nodes from NPC teachers.
   * @param {object} state - game state
   * @returns {object} state (mutated)
   */
  function initKnowledgeGraph(state) {
    if (!state) { return state; }
    if (!state.knowledgeGraph) {
      state.knowledgeGraph = {
        nodes: {},          // nodeId -> node object
        edges: [],          // array of {from, to, type, contributor, ts}
        contributorRep: {}, // playerId -> { nodesCreated, edgesCreated, verifications, syntheses, spark }
        syntheses: [],      // array of completed synthesis records
        tickCount: 0        // for decay tracking
      };
    }

    // Seed NPC nodes if not already present
    var kg = state.knowledgeGraph;
    for (var i = 0; i < SEED_NODES.length; i++) {
      var seed = SEED_NODES[i];
      if (!kg.nodes[seed.id]) {
        kg.nodes[seed.id] = {
          id:           seed.id,
          title:        seed.title,
          content:      seed.content,
          category:     seed.category,
          contributor:  seed.contributor,
          isNpc:        true,
          tags:         seed.tags || [],
          verification: 'verified',  // NPCs start verified
          upvotes:      3,
          downvotes:    0,
          voters:       {},
          createdAt:    _now(),
          lastReinforced: _now(),
          ticksWithoutReinforcement: 0,
          connectionCount: 0
        };
        // Initialise NPC contributor rep
        if (!kg.contributorRep[seed.contributor]) {
          kg.contributorRep[seed.contributor] = {
            nodesCreated: 0, edgesCreated: 0,
            verifications: 0, syntheses: 0, spark: 0
          };
        }
        kg.contributorRep[seed.contributor].nodesCreated++;
      }
    }

    return state;
  }

  // ---------------------------------------------------------------------------
  // NODE MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Create a new knowledge node.
   * @param {object} state
   * @param {string} playerId
   * @param {object} opts - { title, content, category, tags }
   * @returns {{ ok: boolean, node?: object, spark?: number, error?: string }}
   */
  function createNode(state, playerId, opts) {
    if (!state || !state.knowledgeGraph) { return { ok: false, error: 'not_initialized' }; }
    if (!playerId) { return { ok: false, error: 'no_player' }; }
    if (!opts || !opts.title || !opts.title.trim()) { return { ok: false, error: 'title_required' }; }
    if (!opts.content || !opts.content.trim()) { return { ok: false, error: 'content_required' }; }
    if (!opts.category || !_isValidCategory(opts.category)) { return { ok: false, error: 'invalid_category' }; }

    var kg = state.knowledgeGraph;

    // Prevent duplicate titles from same contributor
    var nodes = kg.nodes;
    for (var nid in nodes) {
      if (nodes[nid].contributor === playerId &&
          nodes[nid].title.toLowerCase() === opts.title.toLowerCase()) {
        return { ok: false, error: 'duplicate_title' };
      }
    }

    var id = 'node_' + _slugify(opts.title) + '_' + (_now() % 100000);
    // Ensure uniqueness
    while (kg.nodes[id]) { id = id + '_1'; }

    var node = {
      id:           id,
      title:        opts.title.trim(),
      content:      opts.content.trim(),
      category:     opts.category,
      contributor:  playerId,
      isNpc:        false,
      tags:         Array.isArray(opts.tags) ? opts.tags.slice() : [],
      verification: 'unverified',
      upvotes:      0,
      downvotes:    0,
      voters:       {},
      createdAt:    _now(),
      lastReinforced: _now(),
      ticksWithoutReinforcement: 0,
      connectionCount: 0
    };

    kg.nodes[id] = node;

    // Update contributor rep
    if (!kg.contributorRep[playerId]) {
      kg.contributorRep[playerId] = { nodesCreated: 0, edgesCreated: 0, verifications: 0, syntheses: 0, spark: 0 };
    }
    kg.contributorRep[playerId].nodesCreated++;
    kg.contributorRep[playerId].spark += SPARK_CREATE_NODE;

    return { ok: true, node: node, spark: SPARK_CREATE_NODE };
  }

  /**
   * Get a node by ID.
   * @param {object} state
   * @param {string} nodeId
   * @returns {object|null}
   */
  function getNode(state, nodeId) {
    if (!state || !state.knowledgeGraph) { return null; }
    return state.knowledgeGraph.nodes[nodeId] || null;
  }

  /**
   * Update node content (only by contributor or admin).
   * @param {object} state
   * @param {string} playerId
   * @param {string} nodeId
   * @param {object} updates - { title?, content?, tags? }
   * @returns {{ ok: boolean, error?: string }}
   */
  function updateNode(state, playerId, nodeId, updates) {
    if (!state || !state.knowledgeGraph) { return { ok: false, error: 'not_initialized' }; }
    var kg = state.knowledgeGraph;
    var node = kg.nodes[nodeId];
    if (!node) { return { ok: false, error: 'node_not_found' }; }
    if (node.contributor !== playerId) { return { ok: false, error: 'not_contributor' }; }

    if (updates.title && updates.title.trim()) {
      node.title = updates.title.trim();
    }
    if (updates.content && updates.content.trim()) {
      node.content = updates.content.trim();
    }
    if (Array.isArray(updates.tags)) {
      node.tags = updates.tags.slice();
    }

    // Reset verification when content changes
    if (updates.content) {
      node.verification = 'unverified';
      node.upvotes = 0;
      node.downvotes = 0;
      node.voters = {};
    }
    node.lastReinforced = _now();
    node.ticksWithoutReinforcement = 0;

    return { ok: true };
  }

  /**
   * Delete a node and all its edges.
   * Only the contributor can delete their node.
   */
  function deleteNode(state, playerId, nodeId) {
    if (!state || !state.knowledgeGraph) { return { ok: false, error: 'not_initialized' }; }
    var kg = state.knowledgeGraph;
    var node = kg.nodes[nodeId];
    if (!node) { return { ok: false, error: 'node_not_found' }; }
    if (node.contributor !== playerId) { return { ok: false, error: 'not_contributor' }; }

    // Remove edges referencing this node
    var remaining = [];
    for (var i = 0; i < kg.edges.length; i++) {
      var e = kg.edges[i];
      if (e.from !== nodeId && e.to !== nodeId) {
        remaining.push(e);
      } else {
        // Update connection counts
        var other = e.from === nodeId ? e.to : e.from;
        if (kg.nodes[other]) { kg.nodes[other].connectionCount = Math.max(0, kg.nodes[other].connectionCount - 1); }
      }
    }
    kg.edges = remaining;

    delete kg.nodes[nodeId];
    return { ok: true };
  }

  // ---------------------------------------------------------------------------
  // RELATIONSHIP MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Add a typed relationship (edge) between two nodes.
   * @param {object} state
   * @param {string} playerId
   * @param {string} fromId
   * @param {string} toId
   * @param {string} relType - one of RELATIONSHIP_TYPES
   * @returns {{ ok: boolean, edge?: object, error?: string }}
   */
  function addRelationship(state, playerId, fromId, toId, relType) {
    if (!state || !state.knowledgeGraph) { return { ok: false, error: 'not_initialized' }; }
    if (!playerId) { return { ok: false, error: 'no_player' }; }
    if (!_isValidRelType(relType)) { return { ok: false, error: 'invalid_relationship_type' }; }

    var kg = state.knowledgeGraph;
    if (!kg.nodes[fromId]) { return { ok: false, error: 'from_node_not_found' }; }
    if (!kg.nodes[toId])   { return { ok: false, error: 'to_node_not_found' }; }
    if (fromId === toId)   { return { ok: false, error: 'self_loop' }; }

    // Prevent duplicate edges of same type
    for (var i = 0; i < kg.edges.length; i++) {
      var e = kg.edges[i];
      if (e.from === fromId && e.to === toId && e.type === relType) {
        return { ok: false, error: 'duplicate_edge' };
      }
    }

    var edge = {
      from:        fromId,
      to:          toId,
      type:        relType,
      contributor: playerId,
      ts:          _now()
    };
    kg.edges.push(edge);

    // Increment connection counts
    kg.nodes[fromId].connectionCount++;
    kg.nodes[toId].connectionCount++;

    // Reinforce both nodes
    kg.nodes[fromId].lastReinforced = _now();
    kg.nodes[fromId].ticksWithoutReinforcement = 0;
    kg.nodes[toId].lastReinforced = _now();
    kg.nodes[toId].ticksWithoutReinforcement = 0;

    // Update contributor rep
    if (!kg.contributorRep[playerId]) {
      kg.contributorRep[playerId] = { nodesCreated: 0, edgesCreated: 0, verifications: 0, syntheses: 0, spark: 0 };
    }
    kg.contributorRep[playerId].edgesCreated++;

    return { ok: true, edge: edge };
  }

  /**
   * Remove a specific typed relationship.
   */
  function removeRelationship(state, playerId, fromId, toId, relType) {
    if (!state || !state.knowledgeGraph) { return { ok: false, error: 'not_initialized' }; }
    var kg = state.knowledgeGraph;
    var found = false;
    var remaining = [];
    for (var i = 0; i < kg.edges.length; i++) {
      var e = kg.edges[i];
      if (e.from === fromId && e.to === toId && e.type === relType && e.contributor === playerId) {
        found = true;
        // Decrement connection counts
        if (kg.nodes[fromId]) { kg.nodes[fromId].connectionCount = Math.max(0, kg.nodes[fromId].connectionCount - 1); }
        if (kg.nodes[toId])   { kg.nodes[toId].connectionCount   = Math.max(0, kg.nodes[toId].connectionCount   - 1); }
      } else {
        remaining.push(e);
      }
    }
    if (!found) { return { ok: false, error: 'edge_not_found' }; }
    kg.edges = remaining;
    return { ok: true };
  }

  /**
   * Get all edges involving a specific node.
   * @param {object} state
   * @param {string} nodeId
   * @returns {Array}
   */
  function getNodeEdges(state, nodeId) {
    if (!state || !state.knowledgeGraph) { return []; }
    var result = [];
    var edges = state.knowledgeGraph.edges;
    for (var i = 0; i < edges.length; i++) {
      if (edges[i].from === nodeId || edges[i].to === nodeId) {
        result.push(edges[i]);
      }
    }
    return result;
  }

  /**
   * Get all edges of a specific relationship type.
   */
  function getEdgesByType(state, relType) {
    if (!state || !state.knowledgeGraph) { return []; }
    var result = [];
    var edges = state.knowledgeGraph.edges;
    for (var i = 0; i < edges.length; i++) {
      if (edges[i].type === relType) { result.push(edges[i]); }
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // SEARCH & QUERY
  // ---------------------------------------------------------------------------

  /**
   * Search nodes by keyword (title, content, tags).
   * @param {object} state
   * @param {string} query
   * @param {object} [opts] - { category?, contributor?, verified? }
   * @returns {Array} matching nodes
   */
  function searchNodes(state, query, opts) {
    if (!state || !state.knowledgeGraph) { return []; }
    opts = opts || {};
    var results = [];
    var nodes = state.knowledgeGraph.nodes;

    for (var id in nodes) {
      var node = nodes[id];
      var match = true;

      if (query && !_nodeMatchesQuery(node, query)) { match = false; }
      if (opts.category && node.category !== opts.category) { match = false; }
      if (opts.contributor && node.contributor !== opts.contributor) { match = false; }
      if (opts.verified !== undefined) {
        if (opts.verified && node.verification !== 'verified') { match = false; }
        if (!opts.verified && node.verification === 'verified') { match = false; }
      }

      if (match) { results.push(node); }
    }

    // Sort: verified first, then by upvotes desc
    results.sort(function(a, b) {
      if (a.verification === 'verified' && b.verification !== 'verified') { return -1; }
      if (b.verification === 'verified' && a.verification !== 'verified') { return 1; }
      return (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes);
    });

    return results;
  }

  /**
   * Get all nodes in a specific category.
   */
  function getNodesByCategory(state, category) {
    if (!state || !state.knowledgeGraph) { return []; }
    if (!_isValidCategory(category)) { return []; }
    return searchNodes(state, '', { category: category });
  }

  /**
   * Get all nodes contributed by a specific player.
   */
  function getNodesByContributor(state, playerId) {
    if (!state || !state.knowledgeGraph) { return []; }
    return searchNodes(state, '', { contributor: playerId });
  }

  /**
   * Get nodes connected to a given node (1 hop away).
   */
  function getConnectedNodes(state, nodeId) {
    if (!state || !state.knowledgeGraph) { return []; }
    var kg = state.knowledgeGraph;
    var seen = {};
    var result = [];
    var edges = kg.edges;
    for (var i = 0; i < edges.length; i++) {
      var e = edges[i];
      var otherId = null;
      if (e.from === nodeId) { otherId = e.to; }
      else if (e.to === nodeId) { otherId = e.from; }
      if (otherId && !seen[otherId] && kg.nodes[otherId]) {
        seen[otherId] = true;
        result.push(kg.nodes[otherId]);
      }
    }
    return result;
  }

  /**
   * Find nodes connected by a specific relationship type.
   */
  function getNodesByRelationship(state, nodeId, relType) {
    if (!state || !state.knowledgeGraph) { return []; }
    var kg = state.knowledgeGraph;
    var result = [];
    var seen = {};
    for (var i = 0; i < kg.edges.length; i++) {
      var e = kg.edges[i];
      if (e.type !== relType) { continue; }
      var otherId = null;
      if (e.from === nodeId) { otherId = e.to; }
      else if (e.to === nodeId) { otherId = e.from; }
      if (otherId && !seen[otherId] && kg.nodes[otherId]) {
        seen[otherId] = true;
        result.push(kg.nodes[otherId]);
      }
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // GRAPH TRAVERSAL
  // ---------------------------------------------------------------------------

  /**
   * BFS traversal — returns all nodes reachable from startId up to maxDepth hops.
   * Optionally filter by relationship type.
   * @param {object} state
   * @param {string} startId
   * @param {number} [maxDepth=3]
   * @param {string} [relType] - optional filter
   * @returns {Array} array of { node, depth, path }
   */
  function traverseGraph(state, startId, maxDepth, relType) {
    if (!state || !state.knowledgeGraph) { return []; }
    maxDepth = (maxDepth !== undefined && maxDepth >= 0) ? maxDepth : 3;
    var kg = state.knowledgeGraph;
    if (!kg.nodes[startId]) { return []; }

    var visited = {};
    visited[startId] = true;
    var queue = [{ id: startId, depth: 0, path: [startId] }];
    var results = [];

    while (queue.length > 0) {
      var current = queue.shift();
      if (current.id !== startId) {
        results.push({
          node:  kg.nodes[current.id],
          depth: current.depth,
          path:  current.path.slice()
        });
      }
      if (current.depth >= maxDepth) { continue; }

      // Find neighbours
      for (var i = 0; i < kg.edges.length; i++) {
        var e = kg.edges[i];
        if (relType && e.type !== relType) { continue; }
        var neighbour = null;
        if (e.from === current.id)      { neighbour = e.to; }
        else if (e.to === current.id)   { neighbour = e.from; }
        if (neighbour && !visited[neighbour] && kg.nodes[neighbour]) {
          visited[neighbour] = true;
          queue.push({ id: neighbour, depth: current.depth + 1, path: current.path.concat([neighbour]) });
        }
      }
    }
    return results;
  }

  /**
   * Find the shortest path between two nodes (BFS).
   * @returns {Array|null} array of nodeIds or null if no path
   */
  function findPath(state, fromId, toId) {
    if (!state || !state.knowledgeGraph) { return null; }
    var kg = state.knowledgeGraph;
    if (!kg.nodes[fromId] || !kg.nodes[toId]) { return null; }
    if (fromId === toId) { return [fromId]; }

    var visited = {};
    visited[fromId] = true;
    var queue = [{ id: fromId, path: [fromId] }];

    while (queue.length > 0) {
      var current = queue.shift();
      for (var i = 0; i < kg.edges.length; i++) {
        var e = kg.edges[i];
        var neighbour = null;
        if (e.from === current.id)      { neighbour = e.to; }
        else if (e.to === current.id)   { neighbour = e.from; }
        if (!neighbour || visited[neighbour] || !kg.nodes[neighbour]) { continue; }
        var newPath = current.path.concat([neighbour]);
        if (neighbour === toId) { return newPath; }
        visited[neighbour] = true;
        queue.push({ id: neighbour, path: newPath });
      }
    }
    return null;
  }

  /**
   * Get a learning path — ordered nodes that teach a concept chain.
   * Follows 'teaches' edges from startId for up to maxDepth steps.
   */
  function getLearningPath(state, startId, maxDepth) {
    if (!state || !state.knowledgeGraph) { return []; }
    maxDepth = (maxDepth !== undefined) ? maxDepth : 5;
    var traversal = traverseGraph(state, startId, maxDepth, 'teaches');
    // Sort by depth (ascending) to get ordered learning path
    traversal.sort(function(a, b) { return a.depth - b.depth; });
    return traversal;
  }

  // ---------------------------------------------------------------------------
  // NODE VERIFICATION (Community Voting)
  // ---------------------------------------------------------------------------

  /**
   * Cast an upvote or downvote on a node.
   * Each player can vote once per node. Voting changes verification state.
   * @param {object} state
   * @param {string} playerId
   * @param {string} nodeId
   * @param {string} vote - 'up' or 'down'
   * @returns {{ ok: boolean, verification?: string, spark?: number, error?: string }}
   */
  function voteNode(state, playerId, nodeId, vote) {
    if (!state || !state.knowledgeGraph) { return { ok: false, error: 'not_initialized' }; }
    if (vote !== 'up' && vote !== 'down') { return { ok: false, error: 'invalid_vote' }; }
    var kg = state.knowledgeGraph;
    var node = kg.nodes[nodeId];
    if (!node) { return { ok: false, error: 'node_not_found' }; }
    if (node.contributor === playerId) { return { ok: false, error: 'cannot_vote_own_node' }; }
    if (node.voters[playerId]) { return { ok: false, error: 'already_voted' }; }

    node.voters[playerId] = vote;
    if (vote === 'up') {
      node.upvotes++;
    } else {
      node.downvotes++;
    }

    // Recalculate verification state
    var prevVerification = node.verification;
    if (node.upvotes >= VERIFY_THRESHOLD && node.downvotes < DISPUTE_THRESHOLD) {
      node.verification = 'verified';
    } else if (node.downvotes >= DISPUTE_THRESHOLD) {
      node.verification = 'disputed';
    }

    // Reinforce on upvote
    if (vote === 'up') {
      node.lastReinforced = _now();
      node.ticksWithoutReinforcement = 0;
    }

    // Reward voter
    if (!kg.contributorRep[playerId]) {
      kg.contributorRep[playerId] = { nodesCreated: 0, edgesCreated: 0, verifications: 0, syntheses: 0, spark: 0 };
    }
    var sparkEarned = (vote === 'up') ? SPARK_VERIFY_NODE : SPARK_DISPUTE_NODE;
    kg.contributorRep[playerId].verifications++;
    kg.contributorRep[playerId].spark += sparkEarned;

    return { ok: true, verification: node.verification, prevVerification: prevVerification, spark: sparkEarned };
  }

  /**
   * Get verification status of a node.
   */
  function getVerificationStatus(state, nodeId) {
    if (!state || !state.knowledgeGraph) { return null; }
    var node = state.knowledgeGraph.nodes[nodeId];
    if (!node) { return null; }
    return {
      verification: node.verification,
      upvotes:      node.upvotes,
      downvotes:    node.downvotes,
      score:        node.upvotes - node.downvotes
    };
  }

  // ---------------------------------------------------------------------------
  // KNOWLEDGE SYNTHESIS
  // ---------------------------------------------------------------------------

  /**
   * Attempt synthesis between two or more connected nodes.
   * Nodes must have a path between them. Rewards Spark based on path length.
   * Uses seeded PRNG for deterministic insight generation.
   * @param {object} state
   * @param {string} playerId
   * @param {Array<string>} nodeIds - at least 2 node IDs
   * @returns {{ ok: boolean, synthesis?: object, spark?: number, error?: string }}
   */
  function synthesizeNodes(state, playerId, nodeIds) {
    if (!state || !state.knowledgeGraph) { return { ok: false, error: 'not_initialized' }; }
    if (!playerId) { return { ok: false, error: 'no_player' }; }
    if (!Array.isArray(nodeIds) || nodeIds.length < 2) { return { ok: false, error: 'need_at_least_2_nodes' }; }

    var kg = state.knowledgeGraph;

    // Validate all nodes exist
    for (var i = 0; i < nodeIds.length; i++) {
      if (!kg.nodes[nodeIds[i]]) { return { ok: false, error: 'node_not_found:' + nodeIds[i] }; }
    }

    // Check for path between first and last node
    var path = findPath(state, nodeIds[0], nodeIds[nodeIds.length - 1]);
    if (!path) { return { ok: false, error: 'no_path_between_nodes' }; }

    // Check if this synthesis already done by this player (same set)
    var sortedIds = nodeIds.slice().sort().join(',');
    for (var si = 0; si < kg.syntheses.length; si++) {
      var s = kg.syntheses[si];
      if (s.player === playerId && s.nodeKey === sortedIds) {
        return { ok: false, error: 'already_synthesized' };
      }
    }

    // Seed for deterministic insight
    var seedVal = 0;
    for (var ci = 0; ci < sortedIds.length; ci++) { seedVal = (seedVal * 31 + sortedIds.charCodeAt(ci)) | 0; }
    var rng = mulberry32(Math.abs(seedVal));

    var nodeA = kg.nodes[nodeIds[0]];
    var nodeB = kg.nodes[nodeIds[nodeIds.length - 1]];
    var template = SYNTHESIS_INSIGHTS[Math.floor(rng() * SYNTHESIS_INSIGHTS.length)];
    var fragment  = INSIGHT_FRAGMENTS[Math.floor(rng() * INSIGHT_FRAGMENTS.length)];
    var insight   = template
      .replace('{a}', nodeA.title)
      .replace('{b}', nodeB.title)
      .replace('{insight}', fragment);

    var spark = SPARK_SYNTHESIS_BASE + Math.max(0, path.length - 2) * SPARK_SYNTHESIS_BONUS;

    var synthesis = {
      id:        'syn_' + (_now() % 1000000),
      player:    playerId,
      nodeIds:   nodeIds.slice(),
      nodeKey:   sortedIds,
      path:      path,
      pathLength: path.length,
      insight:   insight,
      spark:     spark,
      ts:        _now()
    };
    kg.syntheses.push(synthesis);

    // Reward player
    if (!kg.contributorRep[playerId]) {
      kg.contributorRep[playerId] = { nodesCreated: 0, edgesCreated: 0, verifications: 0, syntheses: 0, spark: 0 };
    }
    kg.contributorRep[playerId].syntheses++;
    kg.contributorRep[playerId].spark += spark;

    // Reinforce the nodes involved
    for (var ri = 0; ri < nodeIds.length; ri++) {
      if (kg.nodes[nodeIds[ri]]) {
        kg.nodes[nodeIds[ri]].lastReinforced = _now();
        kg.nodes[nodeIds[ri]].ticksWithoutReinforcement = 0;
      }
    }

    return { ok: true, synthesis: synthesis, spark: spark };
  }

  /**
   * Get all synthesis records for a player.
   */
  function getPlayerSyntheses(state, playerId) {
    if (!state || !state.knowledgeGraph) { return []; }
    var result = [];
    var synths = state.knowledgeGraph.syntheses;
    for (var i = 0; i < synths.length; i++) {
      if (synths[i].player === playerId) { result.push(synths[i]); }
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // CONTRIBUTOR REPUTATION
  // ---------------------------------------------------------------------------

  /**
   * Get contributor reputation for a player.
   * @param {object} state
   * @param {string} playerId
   * @returns {object|null}
   */
  function getContributorRep(state, playerId) {
    if (!state || !state.knowledgeGraph) { return null; }
    var rep = state.knowledgeGraph.contributorRep[playerId];
    if (!rep) { return null; }
    return {
      playerId:      playerId,
      nodesCreated:  rep.nodesCreated,
      edgesCreated:  rep.edgesCreated,
      verifications: rep.verifications,
      syntheses:     rep.syntheses,
      spark:         rep.spark,
      total:         rep.nodesCreated + rep.edgesCreated + rep.verifications + rep.syntheses
    };
  }

  /**
   * Get leaderboard — top contributors sorted by total activity.
   */
  function getContributorLeaderboard(state, limit) {
    if (!state || !state.knowledgeGraph) { return []; }
    limit = limit || 10;
    var reps = state.knowledgeGraph.contributorRep;
    var list = [];
    for (var pid in reps) {
      var r = reps[pid];
      list.push({
        playerId:      pid,
        nodesCreated:  r.nodesCreated,
        edgesCreated:  r.edgesCreated,
        verifications: r.verifications,
        syntheses:     r.syntheses,
        spark:         r.spark,
        total:         r.nodesCreated + r.edgesCreated + r.verifications + r.syntheses
      });
    }
    list.sort(function(a, b) { return b.total - a.total; });
    return list.slice(0, limit);
  }

  // ---------------------------------------------------------------------------
  // KNOWLEDGE DECAY
  // ---------------------------------------------------------------------------

  /**
   * Advance the knowledge graph by one tick.
   * Unverified nodes without recent reinforcement lose upvotes (decay).
   * Fully-decayed nodes (0 upvotes, 0 downvotes, unverified) become eligible for cleanup.
   * @param {object} state
   * @returns {{ decayed: Array, removed: Array }}
   */
  function tickDecay(state) {
    if (!state || !state.knowledgeGraph) { return { decayed: [], removed: [] }; }
    var kg = state.knowledgeGraph;
    kg.tickCount++;

    var decayed = [];
    var removed = [];
    var nodesToRemove = [];

    for (var id in kg.nodes) {
      var node = kg.nodes[id];
      if (node.verification === 'verified' || node.isNpc) { continue; } // Verified/NPC nodes don't decay

      node.ticksWithoutReinforcement++;
      if (node.ticksWithoutReinforcement >= DECAY_TICKS_THRESHOLD) {
        // Decay upvotes
        if (node.upvotes > 0) {
          node.upvotes = Math.max(0, node.upvotes - DECAY_VOTE_LOSS);
          decayed.push({ id: id, title: node.title, upvotes: node.upvotes });
        }
        // Increment decay cycle counter
        node.decayCycles = (node.decayCycles || 0) + 1;
        // If fully decayed after at least 2 cycles AND never voted on, mark for removal
        // (nodes that were never engaged are removed after sustained abandonment)
        if (node.upvotes === 0 && node.downvotes === 0 &&
            Object.keys(node.voters).length === 0 && node.decayCycles >= 2) {
          nodesToRemove.push(id);
        }
        // Reset counter so decay is periodic
        node.ticksWithoutReinforcement = 0;
      }
    }

    // Remove fully decayed orphan nodes (no edges)
    for (var ri = 0; ri < nodesToRemove.length; ri++) {
      var nid = nodesToRemove[ri];
      var hasEdge = false;
      for (var ei = 0; ei < kg.edges.length; ei++) {
        if (kg.edges[ei].from === nid || kg.edges[ei].to === nid) { hasEdge = true; break; }
      }
      if (!hasEdge) {
        removed.push({ id: nid, title: kg.nodes[nid].title });
        delete kg.nodes[nid];
      }
    }

    return { decayed: decayed, removed: removed };
  }

  /**
   * Reinforce a node — reset its decay counter.
   * Called when a player reads or references the node.
   */
  function reinforceNode(state, nodeId) {
    if (!state || !state.knowledgeGraph) { return { ok: false }; }
    var node = state.knowledgeGraph.nodes[nodeId];
    if (!node) { return { ok: false, error: 'node_not_found' }; }
    node.lastReinforced = _now();
    node.ticksWithoutReinforcement = 0;
    return { ok: true };
  }

  // ---------------------------------------------------------------------------
  // NPC CONTRIBUTIONS
  // ---------------------------------------------------------------------------

  /**
   * NPC teacher adds a node to the knowledge graph.
   * @param {object} state
   * @param {string} npcId
   * @param {string} archetype - npc archetype (determines category)
   * @param {object} opts - { title, content, tags? }
   * @returns {{ ok: boolean, node?: object, error?: string }}
   */
  function npcContributeNode(state, npcId, archetype, opts) {
    if (!state || !state.knowledgeGraph) { return { ok: false, error: 'not_initialized' }; }
    if (!npcId) { return { ok: false, error: 'no_npc_id' }; }
    if (!opts || !opts.title || !opts.content) { return { ok: false, error: 'title_and_content_required' }; }

    var category = NPC_ARCHETYPE_CATEGORIES[archetype] || 'lore';
    var kg = state.knowledgeGraph;

    var id = 'node_npc_' + _slugify(opts.title) + '_' + (_now() % 100000);
    while (kg.nodes[id]) { id = id + '_1'; }

    var node = {
      id:           id,
      title:        opts.title.trim(),
      content:      opts.content.trim(),
      category:     category,
      contributor:  npcId,
      isNpc:        true,
      tags:         Array.isArray(opts.tags) ? opts.tags.slice() : [],
      verification: 'verified',  // NPCs start verified
      upvotes:      3,
      downvotes:    0,
      voters:       {},
      createdAt:    _now(),
      lastReinforced: _now(),
      ticksWithoutReinforcement: 0,
      connectionCount: 0
    };
    kg.nodes[id] = node;

    if (!kg.contributorRep[npcId]) {
      kg.contributorRep[npcId] = { nodesCreated: 0, edgesCreated: 0, verifications: 0, syntheses: 0, spark: 0 };
    }
    kg.contributorRep[npcId].nodesCreated++;

    return { ok: true, node: node };
  }

  /**
   * NPC references a node — reinforces it.
   */
  function npcReferenceNode(state, nodeId) {
    return reinforceNode(state, nodeId);
  }

  // ---------------------------------------------------------------------------
  // STATS & ANALYTICS
  // ---------------------------------------------------------------------------

  /**
   * Get overall knowledge graph statistics.
   */
  function getGraphStats(state) {
    if (!state || !state.knowledgeGraph) {
      return { nodeCount: 0, edgeCount: 0, synthesesCount: 0, verifiedCount: 0, disputedCount: 0, unverifiedCount: 0 };
    }
    var kg = state.knowledgeGraph;
    var nodeCount = 0;
    var verifiedCount = 0;
    var disputedCount = 0;
    var unverifiedCount = 0;
    var categoryBreakdown = {};

    for (var id in kg.nodes) {
      nodeCount++;
      var n = kg.nodes[id];
      if (n.verification === 'verified')   { verifiedCount++;   }
      else if (n.verification === 'disputed') { disputedCount++;  }
      else                                    { unverifiedCount++; }
      categoryBreakdown[n.category] = (categoryBreakdown[n.category] || 0) + 1;
    }

    return {
      nodeCount:         nodeCount,
      edgeCount:         kg.edges.length,
      synthesesCount:    kg.syntheses.length,
      verifiedCount:     verifiedCount,
      disputedCount:     disputedCount,
      unverifiedCount:   unverifiedCount,
      tickCount:         kg.tickCount,
      categoryBreakdown: categoryBreakdown
    };
  }

  /**
   * Get the most-connected nodes (hub nodes).
   */
  function getMostConnectedNodes(state, limit) {
    if (!state || !state.knowledgeGraph) { return []; }
    limit = limit || 5;
    var kg = state.knowledgeGraph;
    var list = [];
    for (var id in kg.nodes) {
      list.push(kg.nodes[id]);
    }
    list.sort(function(a, b) { return b.connectionCount - a.connectionCount; });
    return list.slice(0, limit);
  }

  /**
   * Get recently created nodes (by creation time desc).
   */
  function getRecentNodes(state, limit) {
    if (!state || !state.knowledgeGraph) { return []; }
    limit = limit || 10;
    var nodes = state.knowledgeGraph.nodes;
    var list = [];
    for (var id in nodes) { list.push(nodes[id]); }
    list.sort(function(a, b) { return b.createdAt - a.createdAt; });
    return list.slice(0, limit);
  }

  /**
   * Find orphan nodes — nodes with no edges.
   */
  function getOrphanNodes(state) {
    if (!state || !state.knowledgeGraph) { return []; }
    var kg = state.knowledgeGraph;
    var connected = {};
    for (var i = 0; i < kg.edges.length; i++) {
      connected[kg.edges[i].from] = true;
      connected[kg.edges[i].to]   = true;
    }
    var orphans = [];
    for (var id in kg.nodes) {
      if (!connected[id]) { orphans.push(kg.nodes[id]); }
    }
    return orphans;
  }

  /**
   * Get all nodes that contradict each other.
   */
  function getConflictingNodes(state) {
    if (!state || !state.knowledgeGraph) { return []; }
    var kg = state.knowledgeGraph;
    var conflicts = [];
    for (var i = 0; i < kg.edges.length; i++) {
      var e = kg.edges[i];
      if (e.type === 'contradicts') {
        conflicts.push({ nodeA: kg.nodes[e.from], nodeB: kg.nodes[e.to], edge: e });
      }
    }
    return conflicts;
  }

  // ---------------------------------------------------------------------------
  // EXPORTS
  // ---------------------------------------------------------------------------

  exports.NODE_CATEGORIES      = NODE_CATEGORIES;
  exports.RELATIONSHIP_TYPES   = RELATIONSHIP_TYPES;
  exports.VERIFICATION_STATES  = VERIFICATION_STATES;
  exports.SEED_NODES           = SEED_NODES;
  exports.SYNTHESIS_INSIGHTS   = SYNTHESIS_INSIGHTS;
  exports.INSIGHT_FRAGMENTS    = INSIGHT_FRAGMENTS;

  exports.SPARK_CREATE_NODE    = SPARK_CREATE_NODE;
  exports.SPARK_VERIFY_NODE    = SPARK_VERIFY_NODE;
  exports.SPARK_DISPUTE_NODE   = SPARK_DISPUTE_NODE;
  exports.SPARK_SYNTHESIS_BASE = SPARK_SYNTHESIS_BASE;
  exports.SPARK_SYNTHESIS_BONUS= SPARK_SYNTHESIS_BONUS;
  exports.VERIFY_THRESHOLD     = VERIFY_THRESHOLD;
  exports.DISPUTE_THRESHOLD    = DISPUTE_THRESHOLD;
  exports.DECAY_TICKS_THRESHOLD= DECAY_TICKS_THRESHOLD;
  exports.NPC_ARCHETYPE_CATEGORIES = NPC_ARCHETYPE_CATEGORIES;

  // Core functions
  exports.initKnowledgeGraph   = initKnowledgeGraph;
  exports.createNode           = createNode;
  exports.getNode              = getNode;
  exports.updateNode           = updateNode;
  exports.deleteNode           = deleteNode;

  // Relationships
  exports.addRelationship      = addRelationship;
  exports.removeRelationship   = removeRelationship;
  exports.getNodeEdges         = getNodeEdges;
  exports.getEdgesByType       = getEdgesByType;

  // Search & Query
  exports.searchNodes          = searchNodes;
  exports.getNodesByCategory   = getNodesByCategory;
  exports.getNodesByContributor= getNodesByContributor;
  exports.getConnectedNodes    = getConnectedNodes;
  exports.getNodesByRelationship = getNodesByRelationship;

  // Graph Traversal
  exports.traverseGraph        = traverseGraph;
  exports.findPath             = findPath;
  exports.getLearningPath      = getLearningPath;

  // Verification
  exports.voteNode             = voteNode;
  exports.getVerificationStatus= getVerificationStatus;

  // Synthesis
  exports.synthesizeNodes      = synthesizeNodes;
  exports.getPlayerSyntheses   = getPlayerSyntheses;

  // Contributor Rep
  exports.getContributorRep    = getContributorRep;
  exports.getContributorLeaderboard = getContributorLeaderboard;

  // Decay
  exports.tickDecay            = tickDecay;
  exports.reinforceNode        = reinforceNode;

  // NPC
  exports.npcContributeNode    = npcContributeNode;
  exports.npcReferenceNode     = npcReferenceNode;

  // Analytics
  exports.getGraphStats        = getGraphStats;
  exports.getMostConnectedNodes= getMostConnectedNodes;
  exports.getRecentNodes       = getRecentNodes;
  exports.getOrphanNodes       = getOrphanNodes;
  exports.getConflictingNodes  = getConflictingNodes;

})(typeof module !== 'undefined' ? module.exports : (window.KnowledgeGraph = {}));
