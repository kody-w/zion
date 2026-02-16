/**
 * ZION API Worker — /ask endpoint + MCP server
 *
 * Deploy to Cloudflare Workers. Serves:
 *   POST /ask  — Natural language query against world state
 *   POST /mcp  — MCP protocol wrapper (list_tools, call_tool)
 *   GET  /state — Proxy to world_state.json
 *   GET  /schema — Proxy to schema.jsonld
 *   GET  /feeds — List available RSS feeds
 *
 * Reads world state from GitHub raw and returns Schema.org-typed responses.
 */

const RAW_BASE = 'https://raw.githubusercontent.com/kody-w/zion/main';
const SITE_URL = 'https://kody-w.github.io/zion/';
const CACHE_TTL = 300; // 5 minutes

// CORS headers for cross-origin access
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === '/ask' && request.method === 'POST') {
        return handleAsk(request);
      }
      if (path === '/mcp' && request.method === 'POST') {
        return handleMCP(request);
      }
      if (path === '/state') {
        return proxyGitHub('/state/api/world_state.json', 'application/json');
      }
      if (path === '/schema') {
        return proxyGitHub('/state/api/schema.jsonld', 'application/ld+json');
      }
      if (path === '/perception') {
        return proxyGitHub('/state/api/perception.txt', 'text/plain');
      }
      if (path === '/feeds') {
        return jsonResponse({
          feeds: {
            world: SITE_URL + 'feeds/world.xml',
            chat: SITE_URL + 'feeds/chat.xml',
            events: SITE_URL + 'feeds/events.xml',
            opml: SITE_URL + 'feeds/opml.xml',
          }
        });
      }
      if (path === '/' || path === '') {
        return jsonResponse({
          name: 'ZION API',
          version: 1,
          endpoints: {
            ask: 'POST /ask — Natural language query',
            mcp: 'POST /mcp — MCP protocol',
            state: 'GET /state — World state JSON',
            schema: 'GET /schema — Schema.org JSON-LD',
            perception: 'GET /perception — Natural language state',
            feeds: 'GET /feeds — RSS feed URLs',
          },
          docs: RAW_BASE + '/state/api/README.md',
        });
      }

      return jsonResponse({ error: 'Not found' }, 404);
    } catch (e) {
      return jsonResponse({ error: e.message }, 500);
    }
  }
};

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

/**
 * Handle /ask — natural language query
 *
 * Accepts: { query: string, mode?: "json"|"text"|"schema" }
 * Returns: Schema.org-typed response matching the query
 */
async function handleAsk(request) {
  const body = await request.json();
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

  // Simple keyword-based query routing
  let result;

  if (matchesAny(query, ['weather', 'time', 'day', 'night', 'season', 'world'])) {
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
        'numberOfNPCs': zoneNpcs.length,
        'numberOfPlayers': zdata.player_count || 0,
        'npcs': zoneNpcs.slice(0, 10).map(n => ({ name: n.name, archetype: n.archetype })),
      };
    } else {
      result = {
        '@type': 'ItemList',
        'name': 'All Zones',
        'itemListElement': Object.entries(zones).map(([id, z]) => ({
          '@type': 'Place',
          'identifier': id,
          'name': z.name,
          'description': z.description || '',
          'numberOfNPCs': z.npc_count || 0,
          'numberOfPlayers': z.player_count || 0,
        })),
      };
    }
  }
  else if (matchesAny(query, ['npc', 'citizen', 'people', 'who', 'person'])) {
    const archMatch = findArchetypeInQuery(query, npcs);
    const filtered = archMatch
      ? npcs.filter(n => n.archetype === archMatch)
      : npcs;
    result = {
      '@type': 'ItemList',
      'name': archMatch ? archMatch + ' NPCs' : 'All Citizens',
      'numberOfItems': filtered.length,
      'itemListElement': filtered.slice(0, 20).map(n => ({
        '@type': 'Person',
        'name': n.name,
        'identifier': n.id,
        'roleName': n.archetype,
        'location': { '@type': 'Place', 'name': n.zone },
      })),
    };
  }
  else if (matchesAny(query, ['chat', 'message', 'said', 'talk', 'conversation'])) {
    result = {
      '@type': 'ItemList',
      'name': 'Recent Messages',
      'numberOfItems': chat.length,
      'itemListElement': chat.slice(-10).map(m => ({
        '@type': 'Message',
        'sender': { '@type': 'Person', 'name': m.from },
        'text': m.text,
        'dateCreated': m.ts,
      })),
    };
  }
  else if (matchesAny(query, ['economy', 'spark', 'market', 'trade', 'listing'])) {
    result = {
      '@type': 'Answer',
      'text': 'Economy: ' + (economy.total_spark || 0) + ' Spark in circulation, ' +
              (economy.active_listings || 0) + ' active marketplace listings.',
      'data': economy,
    };
  }
  else {
    // Default: return full summary
    result = {
      '@type': 'Answer',
      'text': formatWorldSummary(world, zones, npcs),
      'about': { '@type': 'GameServer', 'name': 'ZION' },
      'data': {
        world: world,
        zone_count: Object.keys(zones).length,
        npc_count: npcs.length,
        recent_messages: chat.length,
      },
    };
  }

  // Wrap in Schema.org context
  result['@context'] = 'https://schema.org';

  return jsonResponse(result);
}

/**
 * Handle /mcp — MCP protocol
 *
 * Supports: list_tools, call_tool
 */
async function handleMCP(request) {
  const body = await request.json();
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
          description: 'Get details about a specific zone.',
          parameters: {
            type: 'object',
            properties: {
              zone_id: { type: 'string', description: 'Zone identifier (nexus, gardens, athenaeum, studio, wilds, agora, commons, arena)' },
            },
            required: ['zone_id'],
          },
        },
      ],
    });
  }

  if (method === 'call_tool') {
    const toolName = body.tool || body.name;
    const args = body.arguments || body.params || {};

    if (toolName === 'ask_zion') {
      // Reuse /ask handler
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
          'npcs': zoneNpcs.map(n => ({ name: n.name, archetype: n.archetype })),
        }
      });
    }

    return jsonResponse({ error: 'Unknown tool: ' + toolName }, 400);
  }

  return jsonResponse({ error: 'Unknown method: ' + method }, 400);
}

// --- Helpers ---

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
  return `ZION — ${world.dayPhase || 'day'}, ${world.weather || 'clear'} weather, ` +
         `${world.season || 'spring'} season. ` +
         `${zoneCount} zones, ${npcs.length} citizens active.`;
}

function proxyGitHub(path, contentType) {
  return fetch(RAW_BASE + path, {
    cf: { cacheTtl: CACHE_TTL, cacheEverything: true }
  }).then(response => {
    if (!response.ok) {
      return jsonResponse({ error: 'Upstream error' }, response.status);
    }
    return new Response(response.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=' + CACHE_TTL,
        ...CORS_HEADERS,
      },
    });
  });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60',
      ...CORS_HEADERS,
    },
  });
}
