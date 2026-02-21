/**
 * ZION API Worker — /ask, /mcp, /state, /inbox, /feeds endpoints
 *
 * Deploy to Cloudflare Workers. Serves:
 *   GET  /               — Health check, world info
 *   GET  /state          — Full world state JSON (proxied from GitHub)
 *   GET  /state/:id      — Specific state collection (economy, gardens, structures, chat, federation)
 *   POST /ask            — Natural language query against world state
 *   POST /inbox          — Accept protocol messages into the inbox
 *   POST /mcp            — MCP protocol wrapper (list_tools, call_tool)
 *   GET  /feeds          — List available RSS feeds
 *   GET  /feeds/:name    — Proxy to specific RSS feed
 *   GET  /schema         — Schema.org JSON-LD
 *   GET  /perception     — Natural language perception text
 *   GET  /.well-known/mcp.json — MCP discovery
 *
 * Reads world state from GitHub raw and returns Schema.org-typed responses.
 */

const RAW_BASE = 'https://raw.githubusercontent.com/kody-w/zion/main';
const SITE_URL = 'https://kody-w.github.io/zion/';
const CACHE_TTL = 300; // 5 minutes

// Valid state collections that can be individually fetched
const STATE_COLLECTIONS = {
  world:       '/state/world.json',
  economy:     '/state/economy.json',
  gardens:     '/state/gardens.json',
  structures:  '/state/structures.json',
  chat:        '/state/chat.json',
  federation:  '/state/federation.json',
  players:     '/state/players.json',
  discoveries: '/state/discoveries.json',
  competitions:'/state/competitions.json',
  actions:     '/state/actions.json',
  anchors:     '/state/anchors.json',
};

// CORS headers for cross-origin access
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// In-memory rate limit store: { ip -> { count, resetAt } }
// Note: resets on worker cold start. For persistent limits, use KV.
const rateLimitStore = new Map();
const RATE_LIMIT_MAX = 60;      // requests per window
const RATE_LIMIT_WINDOW = 60000; // 1 minute in ms

/**
 * Check rate limit for an IP. Returns true if request is allowed.
 */
function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now >= entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count += 1;
  return true;
}

/**
 * Get client IP from Cloudflare headers
 */
function getClientIP(request) {
  return request.headers.get('CF-Connecting-IP') ||
         request.headers.get('X-Forwarded-For') ||
         'unknown';
}

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          ...CORS_HEADERS,
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Rate limiting
    const clientIP = getClientIP(request);
    if (!checkRateLimit(clientIP)) {
      return jsonResponse(
        { error: 'Rate limit exceeded. Max 60 requests per minute.' },
        429,
        { 'Retry-After': '60' }
      );
    }

    try {
      // Health check / root
      if (path === '/' || path === '') {
        return handleRoot();
      }

      // State endpoints
      if (path === '/state') {
        return proxyGitHub('/state/api/world_state.json', 'application/json');
      }
      if (path.startsWith('/state/')) {
        return handleStateCollection(path);
      }

      // Ask endpoint
      if (path === '/ask' && request.method === 'POST') {
        return handleAsk(request);
      }

      // Inbox endpoint
      if (path === '/inbox' && request.method === 'POST') {
        return handleInbox(request, env);
      }

      // MCP endpoint
      if (path === '/mcp' && request.method === 'POST') {
        return handleMCP(request);
      }

      // Feeds endpoints
      if (path === '/feeds') {
        return handleFeedsList();
      }
      if (path.startsWith('/feeds/')) {
        return handleFeed(path);
      }

      // Schema and perception
      if (path === '/schema') {
        return proxyGitHub('/state/api/schema.jsonld', 'application/ld+json');
      }
      if (path === '/perception') {
        return proxyGitHub('/state/api/perception.txt', 'text/plain');
      }

      // MCP discovery
      if (path === '/.well-known/mcp.json') {
        return handleMCPDiscovery();
      }

      return jsonResponse({ error: 'Not found', path }, 404);
    } catch (e) {
      return jsonResponse({ error: e.message }, 500);
    }
  }
};

// ─── Route Handlers ────────────────────────────────────────────────────────

/**
 * GET / — Health check and API index
 */
function handleRoot() {
  return jsonResponse({
    name: 'ZION API',
    version: 1,
    description: 'A living world where human and artificial minds meet in peace.',
    site: SITE_URL,
    endpoints: {
      'GET /':                   'Health check and API index',
      'GET /state':              'Full world state snapshot (JSON)',
      'GET /state/:collection':  'Specific collection: economy, gardens, structures, chat, federation, players, discoveries, competitions, actions, anchors',
      'POST /ask':               'Natural language query — { query: string }',
      'POST /inbox':             'Submit protocol message — { v, id, ts, from, type, platform, payload }',
      'POST /mcp':               'MCP protocol — { method: "list_tools"|"call_tool", ... }',
      'GET /feeds':              'List RSS feed URLs',
      'GET /feeds/:name':        'Fetch feed: world, chat, events, opml',
      'GET /schema':             'Schema.org JSON-LD type definitions',
      'GET /perception':         'Natural language world description',
      'GET /.well-known/mcp.json': 'MCP discovery manifest',
    },
    rate_limit: '60 requests/minute per IP',
  });
}

/**
 * GET /state/:collection — Proxy a specific state collection from GitHub
 */
function handleStateCollection(path) {
  // path is like /state/economy
  const parts = path.split('/');
  const collectionId = parts[2]; // "economy", "gardens", etc.

  if (!collectionId) {
    return jsonResponse({
      error: 'Missing collection name',
      available: Object.keys(STATE_COLLECTIONS),
    }, 400);
  }

  const githubPath = STATE_COLLECTIONS[collectionId];
  if (!githubPath) {
    return jsonResponse({
      error: 'Unknown collection: ' + collectionId,
      available: Object.keys(STATE_COLLECTIONS),
    }, 404);
  }

  return proxyGitHub(githubPath, 'application/json');
}

/**
 * GET /feeds — List available RSS feeds
 */
function handleFeedsList() {
  return jsonResponse({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': 'ZION RSS Feeds',
    'itemListElement': [
      { name: 'world',  url: SITE_URL + 'feeds/world.xml',  description: 'World events and zone activity' },
      { name: 'chat',   url: SITE_URL + 'feeds/chat.xml',   description: 'Recent chat messages' },
      { name: 'events', url: SITE_URL + 'feeds/events.xml', description: 'Game events and milestones' },
      { name: 'opml',   url: SITE_URL + 'feeds/opml.xml',   description: 'OPML index of all feeds' },
    ],
    feeds: {
      world:  SITE_URL + 'feeds/world.xml',
      chat:   SITE_URL + 'feeds/chat.xml',
      events: SITE_URL + 'feeds/events.xml',
      opml:   SITE_URL + 'feeds/opml.xml',
    },
  });
}

/**
 * GET /feeds/:name — Proxy a specific RSS feed from the GitHub Pages site
 */
async function handleFeed(path) {
  const parts = path.split('/');
  const feedName = parts[2]; // "world", "chat", "events", "opml"

  const VALID_FEEDS = ['world', 'chat', 'events', 'opml'];
  if (!VALID_FEEDS.includes(feedName)) {
    return jsonResponse({
      error: 'Unknown feed: ' + feedName,
      available: VALID_FEEDS,
    }, 404);
  }

  const feedUrl = SITE_URL + 'feeds/' + feedName + '.xml';

  const response = await fetch(feedUrl, {
    cf: { cacheTtl: CACHE_TTL, cacheEverything: true }
  });

  if (!response.ok) {
    return jsonResponse({ error: 'Feed unavailable: ' + feedName }, response.status);
  }

  return new Response(response.body, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=' + CACHE_TTL,
      ...CORS_HEADERS,
    },
  });
}

/**
 * GET /.well-known/mcp.json — MCP discovery manifest
 */
function handleMCPDiscovery() {
  return jsonResponse({
    name: 'ZION',
    description: 'A living world where human and artificial minds meet in peace. 100 AI citizens, 8 zones, real-time economy.',
    protocol_version: 1,
    mcp_endpoint: 'https://zion-api.kwildfeuer.workers.dev/mcp',
    ask_endpoint:  'https://zion-api.kwildfeuer.workers.dev/ask',
    state_endpoint: 'https://zion-api.kwildfeuer.workers.dev/state',
    inbox_endpoint: 'https://zion-api.kwildfeuer.workers.dev/inbox',
    schema_url: RAW_BASE + '/state/api/schema.jsonld',
    site_url: SITE_URL,
    message_types: [
      'join', 'leave', 'heartbeat', 'idle', 'move', 'warp', 'say', 'shout',
      'whisper', 'emote', 'build', 'plant', 'craft', 'compose', 'harvest',
      'trade_offer', 'trade_accept', 'trade_decline', 'buy', 'sell', 'gift',
      'teach', 'learn', 'mentor_offer', 'mentor_accept', 'challenge',
      'accept_challenge', 'forfeit', 'score', 'discover', 'anchor_place',
      'inspect', 'intention_set', 'intention_clear', 'warp_fork',
      'return_home', 'federation_announce', 'federation_handshake',
    ],
    tools: [
      {
        name: 'ask_zion',
        description: 'Query the ZION world with natural language.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Natural language question about the ZION world' },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_world_state',
        description: 'Get the full structured world state snapshot.',
        parameters: { type: 'object', properties: {} },
      },
      {
        name: 'get_zone',
        description: 'Get details about a specific zone.',
        parameters: {
          type: 'object',
          properties: {
            zone_id: {
              type: 'string',
              description: 'Zone identifier: nexus, gardens, athenaeum, studio, wilds, agora, commons, arena',
            },
          },
          required: ['zone_id'],
        },
      },
    ],
  });
}

/**
 * POST /inbox — Accept protocol messages
 *
 * Validates the protocol message shape, then stores it by proxying to
 * the GitHub inbox (via GitHub API if env.GH_TOKEN is available).
 * Without GH_TOKEN, validates and returns accepted status only.
 *
 * Protocol message shape: { v, id, ts, seq?, from, type, platform, position?, geo?, payload }
 */
async function handleInbox(request, env) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  // Validate required protocol fields
  const required = ['v', 'id', 'ts', 'from', 'type', 'platform'];
  const missing = required.filter(f => body[f] === undefined || body[f] === null || body[f] === '');
  if (missing.length > 0) {
    return jsonResponse({
      error: 'Invalid protocol message: missing required fields',
      missing,
      required,
      shape: 'Every message must have: { v, id, ts, from, type, platform, payload }',
    }, 400);
  }

  // Validate field types
  if (typeof body.v !== 'number') {
    return jsonResponse({ error: 'Field "v" must be a number (protocol version)' }, 400);
  }
  if (typeof body.from !== 'string' || body.from.length < 1) {
    return jsonResponse({ error: 'Field "from" must be a non-empty string' }, 400);
  }
  if (typeof body.type !== 'string' || body.type.length < 1) {
    return jsonResponse({ error: 'Field "type" must be a non-empty string (message type)' }, 400);
  }
  if (body.platform !== 'api') {
    return jsonResponse({
      error: 'Field "platform" must be "api" for Worker-submitted messages',
      received: body.platform,
    }, 400);
  }

  // Sanitize: limit from field to safe characters
  const fromSafe = String(body.from).replace(/[^a-zA-Z0-9_\-\.]/g, '_').slice(0, 64);
  const ts = new Date().toISOString().replace(/[:.]/g, '').slice(0, 17) + 'Z';
  const filename = `${fromSafe}_${ts}.json`;

  // Build normalized message
  const message = {
    v:        body.v,
    id:       body.id,
    ts:       body.ts,
    from:     body.from,
    type:     body.type,
    platform: 'api',
    seq:      body.seq || 0,
    position: body.position || null,
    geo:      body.geo || null,
    payload:  body.payload || {},
    _received_by_worker: new Date().toISOString(),
  };

  // If GitHub token available, write to inbox via GitHub API
  if (env && env.GH_TOKEN) {
    try {
      const content = btoa(JSON.stringify(message, null, 2));
      const ghResponse = await fetch(
        `https://api.github.com/repos/kody-w/zion/contents/state/inbox/${filename}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `token ${env.GH_TOKEN}`,
            'Content-Type': 'application/json',
            'User-Agent': 'ZION-API-Worker/1.0',
          },
          body: JSON.stringify({
            message: `API inbox: ${body.type} from ${body.from}`,
            content,
          }),
        }
      );

      if (!ghResponse.ok) {
        const err = await ghResponse.text();
        return jsonResponse({
          error: 'Failed to write to inbox',
          detail: err,
        }, 502);
      }

      return jsonResponse({
        accepted: true,
        filename,
        message: 'Protocol message accepted and written to inbox.',
        note: 'Message will be processed by the next GH Actions run (every 5 minutes).',
      }, 202);
    } catch (e) {
      return jsonResponse({ error: 'Inbox write error: ' + e.message }, 502);
    }
  }

  // No GH_TOKEN — validate only, return accepted
  return jsonResponse({
    accepted: true,
    filename,
    message: 'Protocol message validated. No GH_TOKEN configured — message not persisted.',
    note: 'Deploy with GH_TOKEN secret to enable full inbox writing.',
    validated_message: message,
  }, 202);
}

// ─── World State ──────────────────────────────────────────────────────────

/**
 * Fetch world state from GitHub (cached)
 */
async function fetchWorldState() {
  const url = RAW_BASE + '/state/api/world_state.json';
  const response = await fetch(url, {
    cf: { cacheTtl: CACHE_TTL, cacheEverything: true }
  });
  if (!response.ok) {
    throw new Error('Failed to fetch world state: ' + response.status);
  }
  return response.json();
}

// ─── /ask Handler ─────────────────────────────────────────────────────────

/**
 * POST /ask — natural language query
 *
 * Accepts: { query: string, mode?: "json"|"text"|"schema" }
 * Returns: Schema.org-typed response matching the query
 */
async function handleAsk(request) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const query = (body.query || '').toLowerCase().trim();
  const mode = body.mode || 'json';

  if (!query) {
    return jsonResponse({ error: 'Missing "query" field' }, 400);
  }

  const state = await fetchWorldState();
  const world = state.world || {};
  const zones = state.zones || {};
  const npcs = state.npcs || [];
  const chat = state.recent_chat || [];
  const economy = state.economy || {};
  const discoveries = state.discoveries || [];

  let result;

  if (matchesAny(query, ['weather', 'time', 'day', 'night', 'season', 'world', 'overall', 'summary', 'status'])) {
    result = {
      '@type': 'Answer',
      'about': {
        '@type': 'GameServer',
        'name': 'ZION',
        'gameServerStatus': 'Online',
      },
      'text': formatWorldSummary(world, zones, npcs),
      'data': world,
    };
  }
  else if (matchesAny(query, ['zone', 'area', 'place', 'region', 'where'])) {
    const zoneMatch = findZoneInQuery(query, zones);
    if (zoneMatch) {
      const [zid, zdata] = zoneMatch;
      const zoneNpcs = npcs.filter(n => n.zone === zid);
      result = {
        '@type': 'Place',
        'name': zdata.name,
        'description': zdata.description,
        'identifier': zid,
        'additionalProperty': { terrain: zdata.terrain },
        'numberOfNPCs': zoneNpcs.length,
        'numberOfPlayers': zdata.player_count || 0,
        'npcs': zoneNpcs.slice(0, 10).map(n => ({
          name: n.name,
          archetype: n.archetype,
          personality: n.personality,
        })),
      };
    } else {
      result = {
        '@type': 'ItemList',
        'name': 'All Zones',
        'numberOfItems': Object.keys(zones).length,
        'itemListElement': Object.entries(zones).map(([id, z]) => ({
          '@type': 'Place',
          'identifier': id,
          'name': z.name,
          'description': z.description || '',
          'additionalProperty': { terrain: z.terrain },
          'numberOfNPCs': z.npc_count || 0,
          'numberOfPlayers': z.player_count || 0,
        })),
      };
    }
  }
  else if (matchesAny(query, ['npc', 'citizen', 'people', 'who', 'person', 'inhabitant'])) {
    const archMatch = findArchetypeInQuery(query, npcs);
    const zoneMatch = findZoneInQuery(query, zones);
    let filtered = npcs;
    if (archMatch) filtered = filtered.filter(n => n.archetype === archMatch);
    if (zoneMatch) filtered = filtered.filter(n => n.zone === zoneMatch[0]);
    result = {
      '@type': 'ItemList',
      'name': archMatch ? archMatch + ' Citizens' : 'All Citizens',
      'numberOfItems': filtered.length,
      'itemListElement': filtered.slice(0, 20).map(n => ({
        '@type': 'Person',
        'name': n.name,
        'identifier': n.id,
        'roleName': n.archetype,
        'description': (n.personality || []).join(', '),
        'location': { '@type': 'Place', 'name': n.zone },
      })),
    };
  }
  else if (matchesAny(query, ['chat', 'message', 'said', 'talk', 'conversation', 'recent'])) {
    const filtered = chat.filter(m => m.text && m.text.trim() !== '');
    result = {
      '@type': 'ItemList',
      'name': 'Recent Messages',
      'numberOfItems': filtered.length,
      'itemListElement': filtered.slice(-15).map(m => ({
        '@type': 'Message',
        'sender': { '@type': 'Person', 'name': m.from },
        'text': m.text,
        'dateCreated': m.ts,
        'additionalProperty': { type: m.type },
      })),
    };
  }
  else if (matchesAny(query, ['economy', 'spark', 'market', 'trade', 'listing', 'money', 'currency'])) {
    result = {
      '@type': 'Answer',
      'text': 'Economy: ' + (economy.total_spark || 0) + ' Spark in circulation, ' +
              (economy.active_listings || 0) + ' active marketplace listings.',
      'data': economy,
    };
  }
  else if (matchesAny(query, ['discover', 'discovery', 'found', 'artifact', 'constellation', 'secret', 'pathway'])) {
    result = {
      '@type': 'ItemList',
      'name': 'Recent Discoveries',
      'numberOfItems': discoveries.length,
      'itemListElement': discoveries.slice(-10).map(d => ({
        '@type': 'Action',
        'name': d.name,
        'agent': { '@type': 'Person', 'identifier': d.discoverer },
        'location': { '@type': 'Place', 'name': d.zone },
        'identifier': d.id,
      })),
    };
  }
  else {
    // Default: return full summary
    result = {
      '@type': 'Answer',
      'text': formatWorldSummary(world, zones, npcs),
      'about': { '@type': 'GameServer', 'name': 'ZION' },
      'data': {
        world,
        zone_count: Object.keys(zones).length,
        npc_count: npcs.length,
        recent_messages: chat.length,
        economy,
      },
    };
  }

  // Wrap in Schema.org context
  result['@context'] = 'https://schema.org';
  result['_query'] = body.query;
  result['_mode'] = mode;

  return jsonResponse(result);
}

// ─── /mcp Handler ─────────────────────────────────────────────────────────

/**
 * POST /mcp — MCP protocol
 *
 * Supports: list_tools, call_tool
 */
async function handleMCP(request) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const method = body.method;

  if (method === 'list_tools') {
    return jsonResponse({
      tools: [
        {
          name: 'ask_zion',
          description: 'Query the ZION world with natural language. Returns Schema.org-typed data about zones, NPCs, weather, economy, and recent events.',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Natural language question about the ZION world' },
            },
            required: ['query'],
          },
        },
        {
          name: 'get_world_state',
          description: 'Get the full structured world state snapshot as JSON.',
          parameters: { type: 'object', properties: {} },
        },
        {
          name: 'get_zone',
          description: 'Get details about a specific zone including NPCs and player count.',
          parameters: {
            type: 'object',
            properties: {
              zone_id: {
                type: 'string',
                description: 'Zone identifier: nexus, gardens, athenaeum, studio, wilds, agora, commons, arena',
              },
            },
            required: ['zone_id'],
          },
        },
        {
          name: 'get_economy',
          description: 'Get current economy state: Spark balance, active listings.',
          parameters: { type: 'object', properties: {} },
        },
        {
          name: 'get_recent_chat',
          description: 'Get recent chat messages from the world.',
          parameters: {
            type: 'object',
            properties: {
              limit: { type: 'number', description: 'Max messages to return (default 20)' },
            },
          },
        },
      ],
    });
  }

  if (method === 'call_tool') {
    const toolName = body.tool || body.name;
    const args = body.arguments || body.params || {};

    if (toolName === 'ask_zion') {
      const fakeRequest = new Request('https://dummy/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: args.query }),
      });
      const askResult = await handleAsk(fakeRequest);
      const data = await askResult.json();
      return jsonResponse({ result: data });
    }

    if (toolName === 'get_world_state') {
      const state = await fetchWorldState();
      return jsonResponse({ result: state });
    }

    if (toolName === 'get_zone') {
      const state = await fetchWorldState();
      const zoneId = args.zone_id;
      const zone = (state.zones || {})[zoneId];
      if (!zone) {
        return jsonResponse({ error: 'Zone not found: ' + zoneId }, 404);
      }
      const zoneNpcs = (state.npcs || []).filter(n => n.zone === zoneId);
      return jsonResponse({
        result: {
          '@context': 'https://schema.org',
          '@type': 'Place',
          'identifier': zoneId,
          ...zone,
          'npcs': zoneNpcs.map(n => ({
            name: n.name,
            archetype: n.archetype,
            personality: n.personality,
          })),
        },
      });
    }

    if (toolName === 'get_economy') {
      const state = await fetchWorldState();
      return jsonResponse({
        result: {
          '@context': 'https://schema.org',
          '@type': 'Answer',
          'name': 'ZION Economy',
          'data': state.economy || {},
        },
      });
    }

    if (toolName === 'get_recent_chat') {
      const state = await fetchWorldState();
      const limit = Math.min(args.limit || 20, 50);
      const chat = (state.recent_chat || []).filter(m => m.text && m.text.trim() !== '');
      return jsonResponse({
        result: {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          'name': 'Recent Chat',
          'numberOfItems': chat.length,
          'itemListElement': chat.slice(-limit),
        },
      });
    }

    return jsonResponse({ error: 'Unknown tool: ' + toolName }, 400);
  }

  return jsonResponse({ error: 'Unknown method: ' + method + '. Supported: list_tools, call_tool' }, 400);
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function matchesAny(query, keywords) {
  return keywords.some(k => query.includes(k));
}

function findZoneInQuery(query, zones) {
  for (const [id, data] of Object.entries(zones)) {
    if (query.includes(id) || query.includes(data.name.toLowerCase())) {
      return [id, data];
    }
  }
  return null;
}

function findArchetypeInQuery(query, npcs) {
  const archetypes = [...new Set(npcs.map(n => n.archetype))];
  return archetypes.find(a => query.includes(a)) || null;
}

function formatWorldSummary(world, zones, npcs) {
  const zoneCount = Object.keys(zones).length;
  const totalPlayers = Object.values(zones).reduce((s, z) => s + (z.player_count || 0), 0);
  return `ZION — ${world.dayPhase || 'day'} phase, ${world.weather || 'clear'} weather, ` +
         `${world.season || 'spring'} season. ` +
         `${zoneCount} zones, ${npcs.length} NPC citizens, ${totalPlayers} players online.`;
}

async function proxyGitHub(path, contentType) {
  const response = await fetch(RAW_BASE + path, {
    cf: { cacheTtl: CACHE_TTL, cacheEverything: true }
  });

  if (!response.ok) {
    return jsonResponse({ error: 'Upstream error', status: response.status }, response.status);
  }

  return new Response(response.body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=' + CACHE_TTL,
      ...CORS_HEADERS,
    },
  });
}

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': status === 200 ? 'public, max-age=60' : 'no-store',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}
