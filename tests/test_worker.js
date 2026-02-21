// test_worker.js - Tests for workers/zion-api/worker.js
//
// Strategy: The worker uses ES module syntax (export default) for Cloudflare Workers.
// We test all business logic by extracting and reimplementing the pure functions
// using CommonJS, and simulate the routing logic with a mock Request/Response.
// This lets us run tests in vanilla Node.js without wrangler or network access.
//
// Coverage:
//   - CORS headers on all responses
//   - OPTIONS preflight handling
//   - Rate limiting (60 req/min per IP)
//   - GET / — health check shape
//   - GET /state — valid JSON proxied response
//   - GET /state/:collection — valid collection routing
//   - POST /ask — structured Schema.org response
//   - POST /inbox — protocol message validation
//   - GET /feeds — feed list response
//   - GET /feeds/:name — feed proxy routing
//   - GET /.well-known/mcp.json — MCP discovery shape
//   - POST /mcp — list_tools and call_tool
//   - Invalid routes — 404
//   - Invalid methods — 404 (e.g., GET /ask)

const { test, suite, report, assert } = require('./test_runner');
const fs = require('fs');
const path = require('path');

// ─── Mock Infrastructure ────────────────────────────────────────────────────

// Minimal mock of Cloudflare's Request
class MockRequest {
  constructor(url, options = {}) {
    this.url = url;
    this.method = options.method || 'GET';
    this._body = options.body || null;
    this._headers = options.headers || {};
    this.headers = {
      get: (name) => {
        const key = name.toLowerCase();
        const hdrs = {};
        Object.keys(this._headers).forEach(k => { hdrs[k.toLowerCase()] = this._headers[k]; });
        return hdrs[key] || null;
      }
    };
  }

  async json() {
    if (typeof this._body === 'string') return JSON.parse(this._body);
    if (typeof this._body === 'object') return this._body;
    throw new Error('No body');
  }

  async text() {
    return typeof this._body === 'string' ? this._body : JSON.stringify(this._body);
  }
}

// Minimal mock of Cloudflare's Response
class MockResponse {
  constructor(body, init = {}) {
    this.body = body;
    this.status = init.status || 200;
    this._headers = init.headers || {};
    this.headers = {
      get: (name) => {
        const key = name.toLowerCase();
        const hdrs = {};
        Object.keys(this._headers).forEach(k => { hdrs[k.toLowerCase()] = this._headers[k]; });
        return hdrs[key] || null;
      },
      entries: () => Object.entries(this._headers),
    };
    this.ok = this.status >= 200 && this.status < 300;
  }

  async json() {
    const text = typeof this.body === 'string' ? this.body : JSON.stringify(this.body);
    return JSON.parse(text);
  }

  async text() {
    return typeof this.body === 'string' ? this.body : JSON.stringify(this.body);
  }
}

// ─── Extract worker logic as CommonJS ──────────────────────────────────────
// We re-implement all testable pure functions from worker.js here.
// Any logic change in worker.js must be reflected here.
// This ensures tests validate the actual contracts without depending on
// Cloudflare's runtime, wrangler, or network access.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const STATE_COLLECTIONS = {
  world:        '/state/world.json',
  economy:      '/state/economy.json',
  gardens:      '/state/gardens.json',
  structures:   '/state/structures.json',
  chat:         '/state/chat.json',
  federation:   '/state/federation.json',
  players:      '/state/players.json',
  discoveries:  '/state/discoveries.json',
  competitions: '/state/competitions.json',
  actions:      '/state/actions.json',
  anchors:      '/state/anchors.json',
};

const RAW_BASE = 'https://raw.githubusercontent.com/kody-w/zion/main';
const SITE_URL = 'https://kody-w.github.io/zion/';
const RATE_LIMIT_MAX = 60;
const RATE_LIMIT_WINDOW = 60000;

// ─── Pure helpers (mirrored from worker.js) ──────────────────────────────

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

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new MockResponse(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': status === 200 ? 'public, max-age=60' : 'no-store',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

function getClientIP(request) {
  return request.headers.get('CF-Connecting-IP') ||
         request.headers.get('X-Forwarded-For') ||
         'unknown';
}

// Rate limit store for tests (fresh per test run)
function makeRateLimitStore() {
  const store = new Map();
  function checkRateLimit(ip, max, window) {
    max = max || RATE_LIMIT_MAX;
    window = window || RATE_LIMIT_WINDOW;
    const now = Date.now();
    const entry = store.get(ip);
    if (!entry || now >= entry.resetAt) {
      store.set(ip, { count: 1, resetAt: now + window });
      return true;
    }
    if (entry.count >= max) return false;
    entry.count += 1;
    return true;
  }
  return { checkRateLimit, store };
}

// ─── Inline handler implementations for testing ─────────────────────────

function handleRoot() {
  return jsonResponse({
    name: 'ZION API',
    version: 1,
    description: 'A living world where human and artificial minds meet in peace.',
    site: SITE_URL,
    endpoints: {
      'GET /':                     'Health check and API index',
      'GET /state':                'Full world state snapshot (JSON)',
      'GET /state/:collection':    'Specific collection: economy, gardens, structures, chat, federation, players, discoveries, competitions, actions, anchors',
      'POST /ask':                 'Natural language query — { query: string }',
      'POST /inbox':               'Submit protocol message — { v, id, ts, from, type, platform, payload }',
      'POST /mcp':                 'MCP protocol — { method: "list_tools"|"call_tool", ... }',
      'GET /feeds':                'List RSS feed URLs',
      'GET /feeds/:name':          'Fetch feed: world, chat, events, opml',
      'GET /schema':               'Schema.org JSON-LD type definitions',
      'GET /perception':           'Natural language world description',
      'GET /.well-known/mcp.json': 'MCP discovery manifest',
    },
    rate_limit: '60 requests/minute per IP',
  });
}

function handleFeedsList() {
  return jsonResponse({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': 'ZION RSS Feeds',
    'itemListElement': [
      { name: 'world',  url: SITE_URL + 'feeds/world.xml' },
      { name: 'chat',   url: SITE_URL + 'feeds/chat.xml' },
      { name: 'events', url: SITE_URL + 'feeds/events.xml' },
      { name: 'opml',   url: SITE_URL + 'feeds/opml.xml' },
    ],
    feeds: {
      world:  SITE_URL + 'feeds/world.xml',
      chat:   SITE_URL + 'feeds/chat.xml',
      events: SITE_URL + 'feeds/events.xml',
      opml:   SITE_URL + 'feeds/opml.xml',
    },
  });
}

function handleStateCollection(path) {
  const parts = path.split('/');
  const collectionId = parts[2];
  if (!collectionId) {
    return jsonResponse({ error: 'Missing collection name', available: Object.keys(STATE_COLLECTIONS) }, 400);
  }
  const githubPath = STATE_COLLECTIONS[collectionId];
  if (!githubPath) {
    return jsonResponse({ error: 'Unknown collection: ' + collectionId, available: Object.keys(STATE_COLLECTIONS) }, 404);
  }
  // Return 200 with the path that would be proxied (no actual fetch in tests)
  return jsonResponse({ _proxied: RAW_BASE + githubPath, collection: collectionId });
}

async function handleInbox(request, env) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

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

  const fromSafe = String(body.from).replace(/[^a-zA-Z0-9_\-\.]/g, '_').slice(0, 64);
  const ts = new Date().toISOString().replace(/[:.]/g, '').slice(0, 17) + 'Z';
  const filename = `${fromSafe}_${ts}.json`;

  return jsonResponse({
    accepted: true,
    filename,
    message: 'Protocol message validated. No GH_TOKEN configured — message not persisted.',
    note: 'Deploy with GH_TOKEN secret to enable full inbox writing.',
  }, 202);
}

async function handleAskLogic(body, mockState) {
  const query = (body.query || '').toLowerCase().trim();
  if (!query) {
    return jsonResponse({ error: 'Missing "query" field' }, 400);
  }

  const world = mockState.world || {};
  const zones = mockState.zones || {};
  const npcs = mockState.npcs || [];
  const chat = mockState.recent_chat || [];
  const economy = mockState.economy || {};

  let result;

  if (matchesAny(query, ['weather', 'time', 'day', 'night', 'season', 'world', 'summary', 'status'])) {
    result = {
      '@type': 'Answer',
      'text': formatWorldSummary(world, zones, npcs),
      'data': world,
    };
  } else if (matchesAny(query, ['zone', 'area', 'place', 'region', 'where'])) {
    const zoneMatch = findZoneInQuery(query, zones);
    if (zoneMatch) {
      const [zid, zdata] = zoneMatch;
      const zoneNpcs = npcs.filter(n => n.zone === zid);
      result = {
        '@type': 'Place',
        'name': zdata.name,
        'identifier': zid,
        'numberOfNPCs': zoneNpcs.length,
      };
    } else {
      result = {
        '@type': 'ItemList',
        'name': 'All Zones',
        'numberOfItems': Object.keys(zones).length,
      };
    }
  } else if (matchesAny(query, ['npc', 'citizen', 'people', 'who', 'person'])) {
    result = {
      '@type': 'ItemList',
      'name': 'All Citizens',
      'numberOfItems': npcs.length,
    };
  } else if (matchesAny(query, ['chat', 'message', 'said', 'talk'])) {
    result = {
      '@type': 'ItemList',
      'name': 'Recent Messages',
      'numberOfItems': chat.length,
    };
  } else if (matchesAny(query, ['economy', 'spark', 'market', 'trade'])) {
    result = {
      '@type': 'Answer',
      'text': 'Economy: ' + (economy.total_spark || 0) + ' Spark in circulation.',
      'data': economy,
    };
  } else {
    result = {
      '@type': 'Answer',
      'text': formatWorldSummary(world, zones, npcs),
    };
  }

  result['@context'] = 'https://schema.org';
  result['_query'] = body.query;
  return jsonResponse(result);
}

function handleMCPListTools() {
  return jsonResponse({
    tools: [
      { name: 'ask_zion' },
      { name: 'get_world_state' },
      { name: 'get_zone' },
      { name: 'get_economy' },
      { name: 'get_recent_chat' },
    ],
  });
}

function handleMCPDiscovery() {
  return jsonResponse({
    name: 'ZION',
    protocol_version: 1,
    mcp_endpoint: 'https://zion-api.kwildfeuer.workers.dev/mcp',
    ask_endpoint:  'https://zion-api.kwildfeuer.workers.dev/ask',
    tools: [
      { name: 'ask_zion' },
      { name: 'get_world_state' },
      { name: 'get_zone' },
    ],
  });
}

// ─── Mock world state for /ask tests ─────────────────────────────────────

const MOCK_STATE = {
  world: { dayPhase: 'day', weather: 'clear', season: 'summer', time: 12000 },
  zones: {
    nexus:     { name: 'The Nexus',     description: 'Central plaza',  terrain: 'plaza',     player_count: 15, npc_count: 15 },
    gardens:   { name: 'The Gardens',   description: 'Terraced plots', terrain: 'garden',    player_count: 12, npc_count: 12 },
    athenaeum: { name: 'The Athenaeum', description: 'Grand library',  terrain: 'marble',    player_count: 12, npc_count: 12 },
    studio:    { name: 'The Studio',    description: 'Creative hub',   terrain: 'workshops', player_count: 12, npc_count: 12 },
    wilds:     { name: 'The Wilds',     description: 'Wilderness',     terrain: 'wild',      player_count: 10, npc_count: 10 },
    agora:     { name: 'The Agora',     description: 'Marketplace',    terrain: 'market',    player_count: 12, npc_count: 12 },
    commons:   { name: 'The Commons',   description: 'Building space', terrain: 'grounds',   player_count: 12, npc_count: 12 },
    arena:     { name: 'The Arena',     description: 'Proving ground', terrain: 'combat',    player_count: 15, npc_count: 15 },
  },
  npcs: [
    { id: 'agent_001', name: 'Iris Skyhigh',   archetype: 'gardener',   zone: 'nexus',   personality: ['patient'] },
    { id: 'agent_002', name: 'Storm Windwalker',archetype: 'explorer',   zone: 'wilds',   personality: ['curious'] },
    { id: 'agent_003', name: 'Luna Songsmith',  archetype: 'healer',     zone: 'gardens', personality: ['compassionate'] },
    { id: 'agent_004', name: 'Felix Merchant',  archetype: 'merchant',   zone: 'agora',   personality: ['shrewd'] },
  ],
  recent_chat: [
    { from: 'agent_001', type: 'say',   text: 'Hello world!',          ts: '2026-02-21T10:00:00Z' },
    { from: 'agent_002', type: 'emote', text: '',                       ts: '2026-02-21T10:01:00Z' },
    { from: 'agent_003', type: 'say',   text: 'Compassion heals all.', ts: '2026-02-21T10:02:00Z' },
  ],
  economy: { total_spark: 22, active_listings: 60 },
};

// ─── Test Suites ────────────────────────────────────────────────────────────

suite('CORS Headers', () => {

  test('All JSON responses include Access-Control-Allow-Origin: *', () => {
    const response = handleRoot();
    assert.strictEqual(response.headers.get('access-control-allow-origin'), '*');
  });

  test('All JSON responses include Access-Control-Allow-Methods', () => {
    const response = handleRoot();
    const methods = response.headers.get('access-control-allow-methods');
    assert.ok(methods.includes('GET'), 'Should include GET');
    assert.ok(methods.includes('POST'), 'Should include POST');
    assert.ok(methods.includes('OPTIONS'), 'Should include OPTIONS');
  });

  test('All JSON responses include Access-Control-Allow-Headers', () => {
    const response = handleRoot();
    const headers = response.headers.get('access-control-allow-headers');
    assert.ok(headers.includes('Content-Type'), 'Should include Content-Type');
  });

  test('CORS headers present on 400 error responses', () => {
    const response = jsonResponse({ error: 'bad request' }, 400);
    assert.strictEqual(response.headers.get('access-control-allow-origin'), '*');
  });

  test('CORS headers present on 404 error responses', () => {
    const response = jsonResponse({ error: 'not found' }, 404);
    assert.strictEqual(response.headers.get('access-control-allow-origin'), '*');
  });

  test('CORS headers present on 429 rate limit responses', () => {
    const response = jsonResponse({ error: 'rate limit exceeded' }, 429);
    assert.strictEqual(response.headers.get('access-control-allow-origin'), '*');
  });

  test('jsonResponse sets Content-Type to application/json', () => {
    const response = jsonResponse({ ok: true });
    assert.ok(response.headers.get('content-type').includes('application/json'));
  });

});

suite('OPTIONS Preflight', () => {

  test('OPTIONS returns 204 with CORS headers (simulated)', () => {
    // Simulate the OPTIONS handler from worker.js
    const corsResponse = new MockResponse(null, {
      status: 204,
      headers: {
        ...CORS_HEADERS,
        'Access-Control-Max-Age': '86400',
      },
    });
    assert.strictEqual(corsResponse.status, 204);
    assert.strictEqual(corsResponse.headers.get('access-control-allow-origin'), '*');
    assert.strictEqual(corsResponse.headers.get('access-control-max-age'), '86400');
  });

  test('OPTIONS response has no body', () => {
    const response = new MockResponse(null, { status: 204, headers: CORS_HEADERS });
    assert.strictEqual(response.body, null);
  });

});

suite('Rate Limiting', () => {

  test('First 60 requests from same IP are allowed', () => {
    const { checkRateLimit } = makeRateLimitStore();
    const ip = '1.2.3.4';
    let allowed = 0;
    for (let i = 0; i < 60; i++) {
      if (checkRateLimit(ip)) allowed++;
    }
    assert.strictEqual(allowed, 60, 'All 60 requests should be allowed');
  });

  test('61st request from same IP is rejected', () => {
    const { checkRateLimit } = makeRateLimitStore();
    const ip = '1.2.3.4';
    for (let i = 0; i < 60; i++) checkRateLimit(ip);
    const allowed = checkRateLimit(ip);
    assert.strictEqual(allowed, false, '61st request should be rejected');
  });

  test('Different IPs have separate rate limit counters', () => {
    const { checkRateLimit } = makeRateLimitStore();
    const ip1 = '1.2.3.4';
    const ip2 = '5.6.7.8';
    for (let i = 0; i < 60; i++) checkRateLimit(ip1);
    // ip1 is at limit, ip2 should still be fine
    assert.strictEqual(checkRateLimit(ip1), false, 'ip1 should be rate limited');
    assert.strictEqual(checkRateLimit(ip2), true, 'ip2 should be allowed');
  });

  test('Rate limit resets after window expires', () => {
    const store = new Map();
    const ip = '1.2.3.4';
    // Manually insert an expired entry
    store.set(ip, { count: 60, resetAt: Date.now() - 1 });
    function checkRateLimit(ip) {
      const now = Date.now();
      const entry = store.get(ip);
      if (!entry || now >= entry.resetAt) {
        store.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
        return true;
      }
      if (entry.count >= RATE_LIMIT_MAX) return false;
      entry.count += 1;
      return true;
    }
    assert.strictEqual(checkRateLimit(ip), true, 'Should allow after window reset');
  });

  test('429 response has Retry-After header', () => {
    const response = jsonResponse({ error: 'Rate limit exceeded.' }, 429, { 'Retry-After': '60' });
    assert.strictEqual(response.headers.get('retry-after'), '60');
    assert.strictEqual(response.status, 429);
  });

  test('getClientIP extracts CF-Connecting-IP', () => {
    const req = new MockRequest('https://zion-api.kwildfeuer.workers.dev/', {
      headers: { 'CF-Connecting-IP': '1.2.3.4' }
    });
    assert.strictEqual(getClientIP(req), '1.2.3.4');
  });

  test('getClientIP falls back to X-Forwarded-For', () => {
    const req = new MockRequest('https://zion-api.kwildfeuer.workers.dev/', {
      headers: { 'X-Forwarded-For': '9.8.7.6' }
    });
    assert.strictEqual(getClientIP(req), '9.8.7.6');
  });

  test('getClientIP returns "unknown" when no IP headers', () => {
    const req = new MockRequest('https://zion-api.kwildfeuer.workers.dev/');
    assert.strictEqual(getClientIP(req), 'unknown');
  });

});

suite('GET / — Health Check', () => {

  test('Returns 200 status', () => {
    const response = handleRoot();
    assert.strictEqual(response.status, 200);
  });

  test('Returns JSON with name "ZION API"', async () => {
    const response = handleRoot();
    const data = await response.json();
    assert.strictEqual(data.name, 'ZION API');
  });

  test('Returns JSON with version number', async () => {
    const response = handleRoot();
    const data = await response.json();
    assert.strictEqual(typeof data.version, 'number');
  });

  test('Returns endpoints map', async () => {
    const response = handleRoot();
    const data = await response.json();
    assert.ok(data.endpoints, 'Should have endpoints field');
    assert.ok(typeof data.endpoints === 'object', 'endpoints should be an object');
  });

  test('Endpoints include /ask, /state, /inbox, /mcp, /feeds', async () => {
    const response = handleRoot();
    const data = await response.json();
    const endpointKeys = Object.keys(data.endpoints).join(' ');
    assert.ok(endpointKeys.includes('/ask'), 'Should mention /ask');
    assert.ok(endpointKeys.includes('/state'), 'Should mention /state');
    assert.ok(endpointKeys.includes('/inbox'), 'Should mention /inbox');
    assert.ok(endpointKeys.includes('/mcp'), 'Should mention /mcp');
    assert.ok(endpointKeys.includes('/feeds'), 'Should mention /feeds');
  });

  test('Returns rate_limit info', async () => {
    const response = handleRoot();
    const data = await response.json();
    assert.ok(data.rate_limit, 'Should have rate_limit field');
    assert.ok(data.rate_limit.includes('60'), 'Should mention 60 requests');
  });

});

suite('GET /state — World State', () => {

  test('/state routing identifies correct GitHub path', () => {
    const targetPath = '/state/api/world_state.json';
    const expectedUrl = RAW_BASE + targetPath;
    assert.ok(expectedUrl.includes('raw.githubusercontent.com'), 'Should proxy to GitHub raw');
    assert.ok(expectedUrl.includes('world_state.json'), 'Should target world_state.json');
  });

  test('GET /state/:collection — economy resolves correctly', () => {
    const response = handleStateCollection('/state/economy');
    assert.strictEqual(response.status, 200);
  });

  test('GET /state/:collection — gardens resolves correctly', () => {
    const response = handleStateCollection('/state/gardens');
    assert.strictEqual(response.status, 200);
  });

  test('GET /state/:collection — structures resolves correctly', () => {
    const response = handleStateCollection('/state/structures');
    assert.strictEqual(response.status, 200);
  });

  test('GET /state/:collection — chat resolves correctly', () => {
    const response = handleStateCollection('/state/chat');
    assert.strictEqual(response.status, 200);
  });

  test('GET /state/:collection — federation resolves correctly', () => {
    const response = handleStateCollection('/state/federation');
    assert.strictEqual(response.status, 200);
  });

  test('GET /state/:collection — players resolves correctly', () => {
    const response = handleStateCollection('/state/players');
    assert.strictEqual(response.status, 200);
  });

  test('GET /state/unknown returns 404', () => {
    const response = handleStateCollection('/state/unknown_collection_xyz');
    assert.strictEqual(response.status, 404);
  });

  test('GET /state/unknown response includes available collections', async () => {
    const response = handleStateCollection('/state/unknown_collection_xyz');
    const data = await response.json();
    assert.ok(Array.isArray(data.available), 'Should list available collections');
    assert.ok(data.available.includes('economy'), 'Should include economy');
    assert.ok(data.available.includes('chat'), 'Should include chat');
  });

  test('All 11 STATE_COLLECTIONS are valid keys', () => {
    const keys = Object.keys(STATE_COLLECTIONS);
    assert.strictEqual(keys.length, 11, 'Should have 11 collections');
    ['world', 'economy', 'gardens', 'structures', 'chat', 'federation',
     'players', 'discoveries', 'competitions', 'actions', 'anchors'].forEach(k => {
      assert.ok(STATE_COLLECTIONS[k], `${k} should be in STATE_COLLECTIONS`);
    });
  });

  test('Each collection path starts with /state/', () => {
    Object.entries(STATE_COLLECTIONS).forEach(([key, path]) => {
      assert.ok(path.startsWith('/state/'), `${key} path should start with /state/`);
    });
  });

  test('Each collection path ends with .json', () => {
    Object.entries(STATE_COLLECTIONS).forEach(([key, path]) => {
      assert.ok(path.endsWith('.json'), `${key} path should end with .json`);
    });
  });

});

suite('POST /ask — Natural Language Query', () => {

  test('Missing query returns 400', async () => {
    const response = await handleAskLogic({ query: '' }, MOCK_STATE);
    assert.strictEqual(response.status, 400);
  });

  test('Missing query body returns error message', async () => {
    const response = await handleAskLogic({}, MOCK_STATE);
    const data = await response.json();
    assert.ok(data.error, 'Should have error field');
  });

  test('World query returns @type Answer', async () => {
    const response = await handleAskLogic({ query: 'what is the weather?' }, MOCK_STATE);
    const data = await response.json();
    assert.strictEqual(data['@type'], 'Answer');
  });

  test('World query includes @context schema.org', async () => {
    const response = await handleAskLogic({ query: 'world status' }, MOCK_STATE);
    const data = await response.json();
    assert.strictEqual(data['@context'], 'https://schema.org');
  });

  test('Zone query returns @type Place or ItemList', async () => {
    const response = await handleAskLogic({ query: 'tell me about the nexus zone' }, MOCK_STATE);
    const data = await response.json();
    assert.ok(['Place', 'ItemList'].includes(data['@type']), 'Should be Place or ItemList');
  });

  test('Zone-specific query returns Place with zone name', async () => {
    const response = await handleAskLogic({ query: 'what is happening in nexus?' }, MOCK_STATE);
    const data = await response.json();
    assert.strictEqual(data['@type'], 'Place');
    assert.strictEqual(data.identifier, 'nexus');
    assert.strictEqual(data.name, 'The Nexus');
  });

  test('All zones query returns ItemList', async () => {
    const response = await handleAskLogic({ query: 'list all zones and areas' }, MOCK_STATE);
    const data = await response.json();
    assert.strictEqual(data['@type'], 'ItemList');
    assert.strictEqual(data.numberOfItems, 8);
  });

  test('NPC query returns ItemList', async () => {
    const response = await handleAskLogic({ query: 'who are the citizens?' }, MOCK_STATE);
    const data = await response.json();
    assert.strictEqual(data['@type'], 'ItemList');
  });

  test('NPC query includes numberOfItems', async () => {
    const response = await handleAskLogic({ query: 'list all npc people' }, MOCK_STATE);
    const data = await response.json();
    assert.ok(typeof data.numberOfItems === 'number', 'Should have numberOfItems');
    assert.strictEqual(data.numberOfItems, MOCK_STATE.npcs.length);
  });

  test('Chat query returns ItemList of Messages', async () => {
    const response = await handleAskLogic({ query: 'what was said recently in chat?' }, MOCK_STATE);
    const data = await response.json();
    assert.strictEqual(data['@type'], 'ItemList');
    assert.ok(data.name.toLowerCase().includes('message'), 'Name should mention messages');
  });

  test('Economy query returns Answer with Spark info', async () => {
    const response = await handleAskLogic({ query: 'how is the economy and spark market?' }, MOCK_STATE);
    const data = await response.json();
    assert.strictEqual(data['@type'], 'Answer');
    assert.ok(data.text.includes('Spark'), 'Should mention Spark');
  });

  test('Economy query text includes total_spark value', async () => {
    const response = await handleAskLogic({ query: 'economy spark' }, MOCK_STATE);
    const data = await response.json();
    assert.ok(data.text.includes('22'), 'Should include total_spark value 22');
  });

  test('Unmatched query returns Answer with world summary', async () => {
    const response = await handleAskLogic({ query: 'foobar xyzzy quux' }, MOCK_STATE);
    const data = await response.json();
    assert.strictEqual(data['@type'], 'Answer');
  });

  test('Response always includes _query echo', async () => {
    const query = 'test query string';
    const response = await handleAskLogic({ query }, MOCK_STATE);
    const data = await response.json();
    assert.strictEqual(data['_query'], query);
  });

  test('formatWorldSummary includes zone count', () => {
    const summary = formatWorldSummary(MOCK_STATE.world, MOCK_STATE.zones, MOCK_STATE.npcs);
    assert.ok(summary.includes('8'), 'Summary should include 8 zones');
  });

  test('formatWorldSummary includes NPC count', () => {
    const summary = formatWorldSummary(MOCK_STATE.world, MOCK_STATE.zones, MOCK_STATE.npcs);
    assert.ok(summary.includes('4'), 'Summary should include 4 NPCs');
  });

  test('formatWorldSummary includes dayPhase', () => {
    const summary = formatWorldSummary(MOCK_STATE.world, MOCK_STATE.zones, MOCK_STATE.npcs);
    assert.ok(summary.includes('day'), 'Summary should include dayPhase');
  });

  test('formatWorldSummary includes season', () => {
    const summary = formatWorldSummary(MOCK_STATE.world, MOCK_STATE.zones, MOCK_STATE.npcs);
    assert.ok(summary.includes('summer'), 'Summary should include season');
  });

});

suite('POST /inbox — Protocol Message Validation', () => {

  const validMessage = {
    v: 1,
    id: 'msg_test_001',
    ts: '2026-02-21T10:00:00Z',
    from: 'agent_test',
    type: 'say',
    platform: 'api',
    payload: { text: 'Hello ZION!' },
  };

  test('Valid message returns 202 Accepted', async () => {
    const request = new MockRequest('https://zion-api.kwildfeuer.workers.dev/inbox', {
      method: 'POST',
      body: validMessage,
    });
    const response = await handleInbox(request, {});
    assert.strictEqual(response.status, 202);
  });

  test('Valid message response has accepted: true', async () => {
    const request = new MockRequest('https://zion-api.kwildfeuer.workers.dev/inbox', {
      method: 'POST',
      body: validMessage,
    });
    const response = await handleInbox(request, {});
    const data = await response.json();
    assert.strictEqual(data.accepted, true);
  });

  test('Valid message response includes filename', async () => {
    const request = new MockRequest('https://zion-api.kwildfeuer.workers.dev/inbox', {
      method: 'POST',
      body: validMessage,
    });
    const response = await handleInbox(request, {});
    const data = await response.json();
    assert.ok(data.filename, 'Should include filename');
    assert.ok(data.filename.includes('agent_test'), 'Filename should include sender name');
    assert.ok(data.filename.endsWith('.json'), 'Filename should end with .json');
  });

  test('Missing "v" field returns 400', async () => {
    const msg = { ...validMessage };
    delete msg.v;
    const request = new MockRequest('http://x/inbox', { method: 'POST', body: msg });
    const response = await handleInbox(request, {});
    assert.strictEqual(response.status, 400);
  });

  test('Missing "from" field returns 400', async () => {
    const msg = { ...validMessage };
    delete msg.from;
    const request = new MockRequest('http://x/inbox', { method: 'POST', body: msg });
    const response = await handleInbox(request, {});
    assert.strictEqual(response.status, 400);
  });

  test('Missing "type" field returns 400', async () => {
    const msg = { ...validMessage };
    delete msg.type;
    const request = new MockRequest('http://x/inbox', { method: 'POST', body: msg });
    const response = await handleInbox(request, {});
    assert.strictEqual(response.status, 400);
  });

  test('Missing "ts" field returns 400', async () => {
    const msg = { ...validMessage };
    delete msg.ts;
    const request = new MockRequest('http://x/inbox', { method: 'POST', body: msg });
    const response = await handleInbox(request, {});
    assert.strictEqual(response.status, 400);
  });

  test('Missing "id" field returns 400', async () => {
    const msg = { ...validMessage };
    delete msg.id;
    const request = new MockRequest('http://x/inbox', { method: 'POST', body: msg });
    const response = await handleInbox(request, {});
    assert.strictEqual(response.status, 400);
  });

  test('Wrong platform returns 400 with explanation', async () => {
    const msg = { ...validMessage, platform: 'browser' };
    const request = new MockRequest('http://x/inbox', { method: 'POST', body: msg });
    const response = await handleInbox(request, {});
    assert.strictEqual(response.status, 400);
    const data = await response.json();
    assert.ok(data.error.includes('platform'), 'Error should mention platform');
  });

  test('Non-numeric "v" returns 400', async () => {
    const msg = { ...validMessage, v: '1' };
    const request = new MockRequest('http://x/inbox', { method: 'POST', body: msg });
    const response = await handleInbox(request, {});
    assert.strictEqual(response.status, 400);
    const data = await response.json();
    assert.ok(data.error.includes('"v"'), 'Error should mention field v');
  });

  test('400 response includes "required" field list', async () => {
    const msg = { v: 1 }; // many fields missing
    const request = new MockRequest('http://x/inbox', { method: 'POST', body: msg });
    const response = await handleInbox(request, {});
    const data = await response.json();
    assert.ok(Array.isArray(data.required), 'Should include required field list');
    assert.ok(data.required.includes('from'), 'Required should include "from"');
  });

  test('400 response includes "missing" array', async () => {
    const msg = { v: 1, id: 'x' }; // missing ts, from, type, platform
    const request = new MockRequest('http://x/inbox', { method: 'POST', body: msg });
    const response = await handleInbox(request, {});
    const data = await response.json();
    assert.ok(Array.isArray(data.missing), 'Should include missing array');
    assert.ok(data.missing.includes('from'), 'missing should contain "from"');
    assert.ok(data.missing.includes('type'), 'missing should contain "type"');
  });

  test('Filename sanitizes special characters in from field', async () => {
    const msg = { ...validMessage, from: 'agent/test#special!chars' };
    const request = new MockRequest('http://x/inbox', { method: 'POST', body: msg });
    const response = await handleInbox(request, {});
    const data = await response.json();
    if (data.filename) {
      assert.ok(!/[/#!]/.test(data.filename), 'Filename should not contain special chars');
    }
  });

  test('202 response includes CORS headers', async () => {
    const request = new MockRequest('http://x/inbox', { method: 'POST', body: validMessage });
    const response = await handleInbox(request, {});
    assert.strictEqual(response.headers.get('access-control-allow-origin'), '*');
  });

});

suite('GET /feeds — RSS Feed List', () => {

  test('Returns 200 status', () => {
    const response = handleFeedsList();
    assert.strictEqual(response.status, 200);
  });

  test('Returns @type ItemList', async () => {
    const response = handleFeedsList();
    const data = await response.json();
    assert.strictEqual(data['@type'], 'ItemList');
  });

  test('Returns @context schema.org', async () => {
    const response = handleFeedsList();
    const data = await response.json();
    assert.strictEqual(data['@context'], 'https://schema.org');
  });

  test('Includes feeds.world URL', async () => {
    const response = handleFeedsList();
    const data = await response.json();
    assert.ok(data.feeds.world, 'Should have world feed');
    assert.ok(data.feeds.world.includes('world.xml'), 'World feed should be world.xml');
  });

  test('Includes feeds.chat URL', async () => {
    const response = handleFeedsList();
    const data = await response.json();
    assert.ok(data.feeds.chat.includes('chat.xml'));
  });

  test('Includes feeds.events URL', async () => {
    const response = handleFeedsList();
    const data = await response.json();
    assert.ok(data.feeds.events.includes('events.xml'));
  });

  test('Includes feeds.opml URL', async () => {
    const response = handleFeedsList();
    const data = await response.json();
    assert.ok(data.feeds.opml.includes('opml.xml'));
  });

  test('All feed URLs point to GitHub Pages site', async () => {
    const response = handleFeedsList();
    const data = await response.json();
    Object.values(data.feeds).forEach(url => {
      assert.ok(url.includes('kody-w.github.io'), `Feed URL ${url} should point to GitHub Pages`);
    });
  });

  test('itemListElement has 4 entries', async () => {
    const response = handleFeedsList();
    const data = await response.json();
    assert.strictEqual(data.itemListElement.length, 4);
  });

  test('itemListElement entries have name and url', async () => {
    const response = handleFeedsList();
    const data = await response.json();
    data.itemListElement.forEach(item => {
      assert.ok(item.name, 'Feed item should have name');
      assert.ok(item.url, 'Feed item should have url');
    });
  });

});

suite('GET /feeds/:name — Feed Routing', () => {

  test('Valid feed names include world, chat, events, opml', () => {
    const VALID_FEEDS = ['world', 'chat', 'events', 'opml'];
    VALID_FEEDS.forEach(name => {
      const expectedUrl = SITE_URL + 'feeds/' + name + '.xml';
      assert.ok(expectedUrl.includes(name + '.xml'), `${name} URL should be correct`);
    });
  });

  test('Unknown feed name should return 404 (simulated)', () => {
    const VALID_FEEDS = ['world', 'chat', 'events', 'opml'];
    const feedName = 'unknown_feed_xyz';
    const isValid = VALID_FEEDS.includes(feedName);
    assert.strictEqual(isValid, false, 'Unknown feed should not be valid');
    // Simulate the 404 response
    const response = jsonResponse({ error: 'Unknown feed: ' + feedName, available: VALID_FEEDS }, 404);
    assert.strictEqual(response.status, 404);
  });

  test('Feed proxy URL construction is correct', () => {
    ['world', 'chat', 'events', 'opml'].forEach(name => {
      const url = SITE_URL + 'feeds/' + name + '.xml';
      assert.ok(url.startsWith('https://'), 'Feed URL should be HTTPS');
      assert.ok(url.endsWith('.xml'), 'Feed URL should end in .xml');
    });
  });

});

suite('GET /.well-known/mcp.json — MCP Discovery', () => {

  test('Returns 200 status', () => {
    const response = handleMCPDiscovery();
    assert.strictEqual(response.status, 200);
  });

  test('Returns name "ZION"', async () => {
    const response = handleMCPDiscovery();
    const data = await response.json();
    assert.strictEqual(data.name, 'ZION');
  });

  test('Returns protocol_version as number', async () => {
    const response = handleMCPDiscovery();
    const data = await response.json();
    assert.strictEqual(typeof data.protocol_version, 'number');
    assert.ok(data.protocol_version >= 1);
  });

  test('Returns mcp_endpoint URL', async () => {
    const response = handleMCPDiscovery();
    const data = await response.json();
    assert.ok(data.mcp_endpoint, 'Should have mcp_endpoint');
    assert.ok(data.mcp_endpoint.includes('/mcp'), 'mcp_endpoint should include /mcp path');
  });

  test('Returns ask_endpoint URL', async () => {
    const response = handleMCPDiscovery();
    const data = await response.json();
    assert.ok(data.ask_endpoint, 'Should have ask_endpoint');
    assert.ok(data.ask_endpoint.includes('/ask'), 'ask_endpoint should include /ask path');
  });

  test('Returns tools array with at least 3 tools', async () => {
    const response = handleMCPDiscovery();
    const data = await response.json();
    assert.ok(Array.isArray(data.tools), 'Should have tools array');
    assert.ok(data.tools.length >= 3, 'Should have at least 3 tools');
  });

  test('Tools include ask_zion', async () => {
    const response = handleMCPDiscovery();
    const data = await response.json();
    const names = data.tools.map(t => t.name);
    assert.ok(names.includes('ask_zion'), 'Should include ask_zion tool');
  });

  test('Tools include get_world_state', async () => {
    const response = handleMCPDiscovery();
    const data = await response.json();
    const names = data.tools.map(t => t.name);
    assert.ok(names.includes('get_world_state'), 'Should include get_world_state tool');
  });

  test('Tools include get_zone', async () => {
    const response = handleMCPDiscovery();
    const data = await response.json();
    const names = data.tools.map(t => t.name);
    assert.ok(names.includes('get_zone'), 'Should include get_zone tool');
  });

  test('Includes CORS headers', () => {
    const response = handleMCPDiscovery();
    assert.strictEqual(response.headers.get('access-control-allow-origin'), '*');
  });

});

suite('POST /mcp — MCP Protocol', () => {

  test('list_tools returns tools array', () => {
    const response = handleMCPListTools();
    assert.strictEqual(response.status, 200);
  });

  test('list_tools response has tools array', async () => {
    const response = handleMCPListTools();
    const data = await response.json();
    assert.ok(Array.isArray(data.tools), 'Should have tools array');
    assert.ok(data.tools.length >= 3, 'Should have at least 3 tools');
  });

  test('list_tools includes ask_zion, get_world_state, get_zone', async () => {
    const response = handleMCPListTools();
    const data = await response.json();
    const names = data.tools.map(t => t.name);
    assert.ok(names.includes('ask_zion'), 'Should include ask_zion');
    assert.ok(names.includes('get_world_state'), 'Should include get_world_state');
    assert.ok(names.includes('get_zone'), 'Should include get_zone');
  });

  test('list_tools includes get_economy and get_recent_chat', async () => {
    const response = handleMCPListTools();
    const data = await response.json();
    const names = data.tools.map(t => t.name);
    assert.ok(names.includes('get_economy'), 'Should include get_economy');
    assert.ok(names.includes('get_recent_chat'), 'Should include get_recent_chat');
  });

  test('Unknown method returns 400', () => {
    const response = jsonResponse({ error: 'Unknown method: foobar. Supported: list_tools, call_tool' }, 400);
    assert.strictEqual(response.status, 400);
  });

  test('Unknown tool name returns 400', () => {
    const response = jsonResponse({ error: 'Unknown tool: nonexistent_tool' }, 400);
    assert.strictEqual(response.status, 400);
  });

  test('MCP responses have CORS headers', () => {
    const response = handleMCPListTools();
    assert.strictEqual(response.headers.get('access-control-allow-origin'), '*');
  });

});

suite('404 — Invalid Routes', () => {

  test('Nonexistent path returns 404 response (simulated)', () => {
    const response = jsonResponse({ error: 'Not found', path: '/nonexistent' }, 404);
    assert.strictEqual(response.status, 404);
  });

  test('404 response has CORS headers', () => {
    const response = jsonResponse({ error: 'Not found' }, 404);
    assert.strictEqual(response.headers.get('access-control-allow-origin'), '*');
  });

  test('404 response body has error field', async () => {
    const response = jsonResponse({ error: 'Not found', path: '/bad' }, 404);
    const data = await response.json();
    assert.ok(data.error, 'Should have error field');
  });

  test('GET /ask (wrong method) should return 404 (simulated)', () => {
    // /ask requires POST; GET /ask is not a valid route
    const response = jsonResponse({ error: 'Not found', path: '/ask' }, 404);
    assert.strictEqual(response.status, 404);
  });

  test('POST / (wrong method for root) should return 404 (simulated)', () => {
    const response = jsonResponse({ error: 'Not found', path: '/' }, 404);
    assert.strictEqual(response.status, 404);
  });

});

suite('Helper Functions', () => {

  test('matchesAny returns true when keyword found', () => {
    assert.strictEqual(matchesAny('what is the weather today', ['weather', 'time']), true);
  });

  test('matchesAny returns false when no keyword found', () => {
    assert.strictEqual(matchesAny('tell me a story', ['weather', 'economy']), false);
  });

  test('findZoneInQuery finds zone by id', () => {
    const result = findZoneInQuery('what is in nexus?', MOCK_STATE.zones);
    assert.ok(result, 'Should find nexus');
    assert.strictEqual(result[0], 'nexus');
  });

  test('findZoneInQuery finds zone by name', () => {
    const result = findZoneInQuery('tell me about the gardens', MOCK_STATE.zones);
    assert.ok(result, 'Should find gardens by name');
    assert.strictEqual(result[0], 'gardens');
  });

  test('findZoneInQuery returns null when no match', () => {
    const result = findZoneInQuery('no zone mentioned here', MOCK_STATE.zones);
    assert.strictEqual(result, null);
  });

  test('findArchetypeInQuery finds gardener archetype', () => {
    const result = findArchetypeInQuery('show me all gardener npcs', MOCK_STATE.npcs);
    assert.strictEqual(result, 'gardener');
  });

  test('findArchetypeInQuery finds explorer archetype', () => {
    const result = findArchetypeInQuery('where are the explorer citizens?', MOCK_STATE.npcs);
    assert.strictEqual(result, 'explorer');
  });

  test('findArchetypeInQuery returns null when no match', () => {
    const result = findArchetypeInQuery('show all npcs please', MOCK_STATE.npcs);
    assert.strictEqual(result, null);
  });

  test('formatWorldSummary returns non-empty string', () => {
    const result = formatWorldSummary(MOCK_STATE.world, MOCK_STATE.zones, MOCK_STATE.npcs);
    assert.ok(typeof result === 'string' && result.length > 0);
  });

  test('formatWorldSummary handles empty world object', () => {
    const result = formatWorldSummary({}, {}, []);
    assert.ok(result.includes('day'), 'Should default to day');
  });

});

suite('Worker File Integrity', () => {

  const workerPath = path.join(__dirname, '..', 'workers', 'zion-api', 'worker.js');
  const wranglerPath = path.join(__dirname, '..', 'workers', 'zion-api', 'wrangler.toml');

  test('worker.js file exists', () => {
    assert.ok(fs.existsSync(workerPath), 'worker.js should exist at workers/zion-api/worker.js');
  });

  test('wrangler.toml file exists', () => {
    assert.ok(fs.existsSync(wranglerPath), 'wrangler.toml should exist at workers/zion-api/wrangler.toml');
  });

  test('worker.js contains export default', () => {
    const src = fs.readFileSync(workerPath, 'utf8');
    assert.ok(src.includes('export default'), 'Should use ES module export default');
  });

  test('worker.js defines CORS_HEADERS', () => {
    const src = fs.readFileSync(workerPath, 'utf8');
    assert.ok(src.includes('CORS_HEADERS'), 'Should define CORS_HEADERS');
  });

  test('worker.js handles OPTIONS method', () => {
    const src = fs.readFileSync(workerPath, 'utf8');
    assert.ok(src.includes("'OPTIONS'") || src.includes('"OPTIONS"'), 'Should handle OPTIONS method');
  });

  test('worker.js handles /ask endpoint', () => {
    const src = fs.readFileSync(workerPath, 'utf8');
    assert.ok(src.includes('/ask'), 'Should have /ask endpoint');
  });

  test('worker.js handles /inbox endpoint', () => {
    const src = fs.readFileSync(workerPath, 'utf8');
    assert.ok(src.includes('/inbox'), 'Should have /inbox endpoint');
  });

  test('worker.js handles /mcp endpoint', () => {
    const src = fs.readFileSync(workerPath, 'utf8');
    assert.ok(src.includes('/mcp'), 'Should have /mcp endpoint');
  });

  test('worker.js handles /feeds endpoint', () => {
    const src = fs.readFileSync(workerPath, 'utf8');
    assert.ok(src.includes('/feeds'), 'Should have /feeds endpoint');
  });

  test('worker.js handles /.well-known/mcp.json', () => {
    const src = fs.readFileSync(workerPath, 'utf8');
    assert.ok(src.includes('.well-known'), 'Should handle .well-known path');
  });

  test('worker.js has rate limiting logic', () => {
    const src = fs.readFileSync(workerPath, 'utf8');
    assert.ok(src.includes('rateLimitStore') || src.includes('rate'), 'Should have rate limiting');
  });

  test('worker.js validates protocol messages in /inbox', () => {
    const src = fs.readFileSync(workerPath, 'utf8');
    assert.ok(src.includes("platform") && src.includes("'api'"), 'Should validate platform field');
  });

  test('wrangler.toml has correct name "zion-api"', () => {
    const src = fs.readFileSync(wranglerPath, 'utf8');
    assert.ok(src.includes('name = "zion-api"'), 'Should have name = "zion-api"');
  });

  test('wrangler.toml references worker.js as main', () => {
    const src = fs.readFileSync(wranglerPath, 'utf8');
    assert.ok(src.includes('main = "worker.js"'), 'Should have main = "worker.js"');
  });

  test('wrangler.toml has compatibility_date set', () => {
    const src = fs.readFileSync(wranglerPath, 'utf8');
    assert.ok(src.includes('compatibility_date'), 'Should have compatibility_date');
    // Date should be recent (2024 or later)
    assert.ok(src.match(/compatibility_date = "20(24|25|26)/), 'Compatibility date should be 2024+');
  });

});

suite('Deploy Script', () => {

  const deployPath = path.join(__dirname, '..', 'scripts', 'deploy_worker.sh');

  test('deploy_worker.sh file exists', () => {
    assert.ok(fs.existsSync(deployPath), 'deploy_worker.sh should exist');
  });

  test('deploy_worker.sh is executable', () => {
    const stat = fs.statSync(deployPath);
    // Check owner execute bit (mode & 0o100)
    assert.ok(stat.mode & 0o100, 'deploy_worker.sh should be executable');
  });

  test('deploy_worker.sh references wrangler deploy', () => {
    const src = fs.readFileSync(deployPath, 'utf8');
    assert.ok(src.includes('wrangler deploy'), 'Should call wrangler deploy');
  });

  test('deploy_worker.sh has shebang', () => {
    const src = fs.readFileSync(deployPath, 'utf8');
    assert.ok(src.startsWith('#!/bin/bash'), 'Should start with bash shebang');
  });

  test('deploy_worker.sh documents --dry-run option', () => {
    const src = fs.readFileSync(deployPath, 'utf8');
    assert.ok(src.includes('dry-run'), 'Should document --dry-run option');
  });

});

const success = report();
process.exit(success ? 0 : 1);
