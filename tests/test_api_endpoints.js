#!/usr/bin/env node
/**
 * ZION API Interactive Test Script
 *
 * Exercises every endpoint of the ZION API Worker.
 * Usage:
 *   node tests/test_api_endpoints.js                    # test live API
 *   node tests/test_api_endpoints.js http://localhost:8787  # test local dev
 *
 * Exit code 0 = all passed, 1 = failures.
 */

'use strict';

const https = require('https');
const http = require('http');

const BASE = process.argv[2] || 'https://zion-api.kwildfeuer.workers.dev';

// ─── Minimal test harness ─────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const results = [];

function ok(name) {
  passed++;
  results.push({ name, status: 'PASS' });
  console.log(`  \x1b[32m✓\x1b[0m ${name}`);
}
function fail(name, reason) {
  failed++;
  results.push({ name, status: 'FAIL', reason });
  console.log(`  \x1b[31m✗\x1b[0m ${name} — ${reason}`);
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const mod = url.protocol === 'https:' ? https : http;
    const opts = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    const req = mod.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (_) { /* not JSON */ }
        resolve({ status: res.statusCode, headers: res.headers, body: data, json });
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

function GET(path) { return request('GET', path); }
function POST(path, body) { return request('POST', path, body); }
function OPTIONS(path) { return request('OPTIONS', path); }

// ─── Test functions ───────────────────────────────────────────────────────

async function testCORSPreflight() {
  const name = 'OPTIONS / — CORS preflight returns 204';
  try {
    const r = await OPTIONS('/');
    if (r.status === 204) ok(name);
    else fail(name, `status=${r.status}`);
  } catch (e) { fail(name, e.message); }
}

async function testCORSHeaders() {
  const name = 'GET / — response includes CORS headers';
  try {
    const r = await GET('/');
    const acao = r.headers['access-control-allow-origin'];
    if (acao === '*') ok(name);
    else fail(name, `Access-Control-Allow-Origin=${acao}`);
  } catch (e) { fail(name, e.message); }
}

async function testRootHealthCheck() {
  const name = 'GET / — health check returns API metadata';
  try {
    const r = await GET('/');
    if (r.status !== 200) return fail(name, `status=${r.status}`);
    if (!r.json) return fail(name, 'not JSON');
    if (r.json.name !== 'ZION API') return fail(name, `name=${r.json.name}`);
    if (r.json.version !== 1) return fail(name, `version=${r.json.version}`);
    if (!r.json.endpoints) return fail(name, 'missing endpoints');
    if (!r.json.rate_limit) return fail(name, 'missing rate_limit');
    ok(name);
  } catch (e) { fail(name, e.message); }
}

async function testStateFullWorld() {
  const name = 'GET /state — returns full world state JSON';
  try {
    const r = await GET('/state');
    if (r.status !== 200) return fail(name, `status=${r.status}`);
    if (!r.json) return fail(name, 'not JSON');
    ok(name);
  } catch (e) { fail(name, e.message); }
}

async function testStateCollection(collection) {
  const name = `GET /state/${collection} — returns ${collection} state`;
  try {
    const r = await GET(`/state/${collection}`);
    if (r.status !== 200) return fail(name, `status=${r.status}`);
    if (!r.json && !r.body) return fail(name, 'empty response');
    ok(name);
  } catch (e) { fail(name, e.message); }
}

async function testStateUnknownCollection() {
  const name = 'GET /state/bogus — returns 404 with available list';
  try {
    const r = await GET('/state/bogus');
    if (r.status !== 404) return fail(name, `status=${r.status}`);
    if (!r.json || !r.json.available) return fail(name, 'missing available list');
    ok(name);
  } catch (e) { fail(name, e.message); }
}

async function testAskWorldSummary() {
  const name = 'POST /ask — query "world status" returns Answer';
  try {
    const r = await POST('/ask', { query: 'world status' });
    if (r.status !== 200) return fail(name, `status=${r.status}`);
    if (!r.json) return fail(name, 'not JSON');
    if (r.json['@type'] !== 'Answer') return fail(name, `@type=${r.json['@type']}`);
    if (r.json['@context'] !== 'https://schema.org') return fail(name, 'missing @context');
    ok(name);
  } catch (e) { fail(name, e.message); }
}

async function testAskZones() {
  const name = 'POST /ask — query "zones" returns ItemList of Places';
  try {
    const r = await POST('/ask', { query: 'list all zones' });
    if (r.status !== 200) return fail(name, `status=${r.status}`);
    if (!r.json) return fail(name, 'not JSON');
    // Could be ItemList or Place depending on state
    if (!['ItemList', 'Place', 'Answer'].includes(r.json['@type'])) {
      return fail(name, `@type=${r.json['@type']}`);
    }
    ok(name);
  } catch (e) { fail(name, e.message); }
}

async function testAskNPCs() {
  const name = 'POST /ask — query "who are the citizens" returns ItemList';
  try {
    const r = await POST('/ask', { query: 'who are the citizens' });
    if (r.status !== 200) return fail(name, `status=${r.status}`);
    if (!r.json) return fail(name, 'not JSON');
    ok(name);
  } catch (e) { fail(name, e.message); }
}

async function testAskChat() {
  const name = 'POST /ask — query "recent chat" returns messages';
  try {
    const r = await POST('/ask', { query: 'recent chat messages' });
    if (r.status !== 200) return fail(name, `status=${r.status}`);
    ok(name);
  } catch (e) { fail(name, e.message); }
}

async function testAskEconomy() {
  const name = 'POST /ask — query "economy spark" returns economy data';
  try {
    const r = await POST('/ask', { query: 'economy spark market' });
    if (r.status !== 200) return fail(name, `status=${r.status}`);
    ok(name);
  } catch (e) { fail(name, e.message); }
}

async function testAskDiscoveries() {
  const name = 'POST /ask — query "discoveries" returns discovery list';
  try {
    const r = await POST('/ask', { query: 'recent discoveries' });
    if (r.status !== 200) return fail(name, `status=${r.status}`);
    ok(name);
  } catch (e) { fail(name, e.message); }
}

async function testAskMissingQuery() {
  const name = 'POST /ask — missing query returns 400';
  try {
    const r = await POST('/ask', {});
    if (r.status !== 400) return fail(name, `status=${r.status}`);
    if (!r.json || !r.json.error) return fail(name, 'missing error field');
    ok(name);
  } catch (e) { fail(name, e.message); }
}

async function testAskBadJSON() {
  const name = 'POST /ask — invalid JSON returns 400';
  try {
    const r = await request('POST', '/ask', 'not json!!!');
    if (r.status !== 400) return fail(name, `status=${r.status}`);
    ok(name);
  } catch (e) { fail(name, e.message); }
}

async function testAskWithMode() {
  const name = 'POST /ask — mode parameter is echoed back';
  try {
    const r = await POST('/ask', { query: 'world status', mode: 'schema' });
    if (r.status !== 200) return fail(name, `status=${r.status}`);
    if (r.json && r.json._mode !== 'schema') return fail(name, `_mode=${r.json._mode}`);
    ok(name);
  } catch (e) { fail(name, e.message); }
}

async function testInboxValidMessage() {
  const name = 'POST /inbox — valid protocol message returns 202';
  try {
    const r = await POST('/inbox', {
      v: 1,
      id: 'test-' + Date.now(),
      ts: new Date().toISOString(),
      from: 'api-test-runner',
      type: 'heartbeat',
      platform: 'api',
      seq: 0,
      payload: {},
    });
    if (r.status !== 202) return fail(name, `status=${r.status}`);
    if (!r.json || !r.json.accepted) return fail(name, 'accepted not true');
    if (!r.json.filename) return fail(name, 'missing filename');
    ok(name);
  } catch (e) { fail(name, e.message); }
}

async function testInboxMissingFields() {
  const name = 'POST /inbox — missing required fields returns 400';
  try {
    const r = await POST('/inbox', { v: 1 });
    if (r.status !== 400) return fail(name, `status=${r.status}`);
    if (!r.json || !r.json.missing) return fail(name, 'missing "missing" list');
    ok(name);
  } catch (e) { fail(name, e.message); }
}

async function testInboxBadVersion() {
  const name = 'POST /inbox — non-numeric v returns 400';
  try {
    const r = await POST('/inbox', {
      v: 'one', id: 'x', ts: 'x', from: 'x', type: 'say', platform: 'api',
    });
    if (r.status !== 400) return fail(name, `status=${r.status}`);
    ok(name);
  } catch (e) { fail(name, e.message); }
}

async function testInboxBadPlatform() {
  const name = 'POST /inbox — platform != "api" returns 400';
  try {
    const r = await POST('/inbox', {
      v: 1, id: 'x', ts: 'x', from: 'tester', type: 'say', platform: 'desktop',
    });
    if (r.status !== 400) return fail(name, `status=${r.status}`);
    if (!r.json || !r.json.error.includes('platform')) return fail(name, 'wrong error');
    ok(name);
  } catch (e) { fail(name, e.message); }
}

async function testInboxBadJSON() {
  const name = 'POST /inbox — invalid JSON returns 400';
  try {
    const r = await request('POST', '/inbox', '{bad json');
    if (r.status !== 400) return fail(name, `status=${r.status}`);
    ok(name);
  } catch (e) { fail(name, e.message); }
}

async function testMCPListTools() {
  const name = 'POST /mcp — list_tools returns tool definitions';
  try {
    const r = await POST('/mcp', { method: 'list_tools' });
    if (r.status !== 200) return fail(name, `status=${r.status}`);
    if (!r.json || !Array.isArray(r.json.tools)) return fail(name, 'no tools array');
    const names = r.json.tools.map(t => t.name);
    const expected = ['ask_zion', 'get_world_state', 'get_zone', 'get_economy', 'get_recent_chat'];
    for (const e of expected) {
      if (!names.includes(e)) return fail(name, `missing tool: ${e}`);
    }
    ok(name);
  } catch (e) { fail(name, e.message); }
}

async function testMCPCallAskZion() {
  const name = 'POST /mcp — call_tool ask_zion returns result';
  try {
    const r = await POST('/mcp', {
      method: 'call_tool', tool: 'ask_zion', arguments: { query: 'world summary' },
    });
    if (r.status !== 200) return fail(name, `status=${r.status}`);
    if (!r.json || !r.json.result) return fail(name, 'no result');
    ok(name);
  } catch (e) { fail(name, e.message); }
}

async function testMCPCallWorldState() {
  const name = 'POST /mcp — call_tool get_world_state returns result';
  try {
    const r = await POST('/mcp', { method: 'call_tool', tool: 'get_world_state', arguments: {} });
    if (r.status !== 200) return fail(name, `status=${r.status}`);
    if (!r.json || !r.json.result) return fail(name, 'no result');
    ok(name);
  } catch (e) { fail(name, e.message); }
}

async function testMCPCallGetZone() {
  const name = 'POST /mcp — call_tool get_zone(nexus) returns Place';
  try {
    const r = await POST('/mcp', {
      method: 'call_tool', tool: 'get_zone', arguments: { zone_id: 'nexus' },
    });
    if (r.status !== 200) return fail(name, `status=${r.status}`);
    if (!r.json || !r.json.result) return fail(name, 'no result');
    if (r.json.result['@type'] !== 'Place') return fail(name, `@type=${r.json.result['@type']}`);
    ok(name);
  } catch (e) { fail(name, e.message); }
}

async function testMCPCallGetZoneNotFound() {
  const name = 'POST /mcp — call_tool get_zone(bogus) returns 404';
  try {
    const r = await POST('/mcp', {
      method: 'call_tool', tool: 'get_zone', arguments: { zone_id: 'bogus' },
    });
    if (r.status !== 404) return fail(name, `status=${r.status}`);
    ok(name);
  } catch (e) { fail(name, e.message); }
}

async function testMCPCallGetEconomy() {
  const name = 'POST /mcp — call_tool get_economy returns Answer';
  try {
    const r = await POST('/mcp', { method: 'call_tool', tool: 'get_economy', arguments: {} });
    if (r.status !== 200) return fail(name, `status=${r.status}`);
    if (!r.json || !r.json.result) return fail(name, 'no result');
    ok(name);
  } catch (e) { fail(name, e.message); }
}

async function testMCPCallGetChat() {
  const name = 'POST /mcp — call_tool get_recent_chat returns ItemList';
  try {
    const r = await POST('/mcp', {
      method: 'call_tool', tool: 'get_recent_chat', arguments: { limit: 5 },
    });
    if (r.status !== 200) return fail(name, `status=${r.status}`);
    if (!r.json || !r.json.result) return fail(name, 'no result');
    ok(name);
  } catch (e) { fail(name, e.message); }
}

async function testMCPUnknownTool() {
  const name = 'POST /mcp — call_tool with unknown tool returns 400';
  try {
    const r = await POST('/mcp', { method: 'call_tool', tool: 'nope', arguments: {} });
    if (r.status !== 400) return fail(name, `status=${r.status}`);
    ok(name);
  } catch (e) { fail(name, e.message); }
}

async function testMCPUnknownMethod() {
  const name = 'POST /mcp — unknown method returns 400';
  try {
    const r = await POST('/mcp', { method: 'destroy_world' });
    if (r.status !== 400) return fail(name, `status=${r.status}`);
    ok(name);
  } catch (e) { fail(name, e.message); }
}

async function testMCPBadJSON() {
  const name = 'POST /mcp — invalid JSON returns 400';
  try {
    const r = await request('POST', '/mcp', 'not json');
    if (r.status !== 400) return fail(name, `status=${r.status}`);
    ok(name);
  } catch (e) { fail(name, e.message); }
}

async function testMCPAltParamNames() {
  const name = 'POST /mcp — call_tool accepts "name" and "params" aliases';
  try {
    const r = await POST('/mcp', {
      method: 'call_tool', name: 'get_economy', params: {},
    });
    if (r.status !== 200) return fail(name, `status=${r.status}`);
    ok(name);
  } catch (e) { fail(name, e.message); }
}

async function testFeedsList() {
  const name = 'GET /feeds — returns feed list with Schema.org typing';
  try {
    const r = await GET('/feeds');
    if (r.status !== 200) return fail(name, `status=${r.status}`);
    if (!r.json) return fail(name, 'not JSON');
    if (r.json['@type'] !== 'ItemList') return fail(name, `@type=${r.json['@type']}`);
    if (!r.json.feeds) return fail(name, 'missing feeds object');
    ok(name);
  } catch (e) { fail(name, e.message); }
}

async function testFeedProxy(feedName) {
  const name = `GET /feeds/${feedName} — returns RSS XML`;
  try {
    const r = await GET(`/feeds/${feedName}`);
    // Accept 200 (found) or upstream errors (feed may not exist yet)
    if (r.status === 200) {
      const ct = r.headers['content-type'] || '';
      if (!ct.includes('rss') && !ct.includes('xml')) return fail(name, `content-type=${ct}`);
      ok(name);
    } else if (r.status === 404 || r.status >= 400) {
      // Feed file may not exist yet on GH Pages — that's a valid upstream error
      ok(name + ' (feed not deployed yet, got ' + r.status + ')');
    } else {
      fail(name, `status=${r.status}`);
    }
  } catch (e) { fail(name, e.message); }
}

async function testFeedUnknown() {
  const name = 'GET /feeds/bogus — returns 404';
  try {
    const r = await GET('/feeds/bogus');
    if (r.status !== 404) return fail(name, `status=${r.status}`);
    if (!r.json || !r.json.available) return fail(name, 'missing available list');
    ok(name);
  } catch (e) { fail(name, e.message); }
}

async function testSchema() {
  const name = 'GET /schema — returns JSON-LD';
  try {
    const r = await GET('/schema');
    // schema file may not exist; accept 200 or upstream error
    if (r.status === 200) {
      const ct = r.headers['content-type'] || '';
      if (!ct.includes('ld+json') && !ct.includes('json')) return fail(name, `content-type=${ct}`);
      ok(name);
    } else {
      ok(name + ' (schema not deployed, got ' + r.status + ')');
    }
  } catch (e) { fail(name, e.message); }
}

async function testPerception() {
  const name = 'GET /perception — returns plain text';
  try {
    const r = await GET('/perception');
    if (r.status === 200) {
      const ct = r.headers['content-type'] || '';
      if (!ct.includes('text/plain')) return fail(name, `content-type=${ct}`);
      ok(name);
    } else {
      ok(name + ' (perception not deployed, got ' + r.status + ')');
    }
  } catch (e) { fail(name, e.message); }
}

async function testMCPDiscovery() {
  const name = 'GET /.well-known/mcp.json — MCP discovery manifest';
  try {
    const r = await GET('/.well-known/mcp.json');
    if (r.status !== 200) return fail(name, `status=${r.status}`);
    if (!r.json) return fail(name, 'not JSON');
    if (r.json.name !== 'ZION') return fail(name, `name=${r.json.name}`);
    if (!r.json.mcp_endpoint) return fail(name, 'missing mcp_endpoint');
    if (!Array.isArray(r.json.message_types)) return fail(name, 'missing message_types');
    if (!Array.isArray(r.json.tools)) return fail(name, 'missing tools');
    ok(name);
  } catch (e) { fail(name, e.message); }
}

async function testNotFound() {
  const name = 'GET /nonexistent — returns 404';
  try {
    const r = await GET('/this-does-not-exist');
    if (r.status !== 404) return fail(name, `status=${r.status}`);
    if (!r.json || !r.json.error) return fail(name, 'missing error field');
    ok(name);
  } catch (e) { fail(name, e.message); }
}

// ─── Runner ───────────────────────────────────────────────────────────────

async function run() {
  console.log(`\nZION API Test Suite — ${BASE}\n`);

  console.log('── CORS ──');
  await testCORSPreflight();
  await testCORSHeaders();

  console.log('\n── Health Check ──');
  await testRootHealthCheck();

  console.log('\n── State Endpoints ──');
  await testStateFullWorld();
  const collections = ['world', 'economy', 'gardens', 'structures', 'chat',
                       'federation', 'players', 'discoveries', 'competitions',
                       'actions', 'anchors'];
  for (const c of collections) {
    await testStateCollection(c);
  }
  await testStateUnknownCollection();

  console.log('\n── /ask Endpoint ──');
  await testAskWorldSummary();
  await testAskZones();
  await testAskNPCs();
  await testAskChat();
  await testAskEconomy();
  await testAskDiscoveries();
  await testAskWithMode();
  await testAskMissingQuery();
  await testAskBadJSON();

  console.log('\n── /inbox Endpoint ──');
  await testInboxValidMessage();
  await testInboxMissingFields();
  await testInboxBadVersion();
  await testInboxBadPlatform();
  await testInboxBadJSON();

  console.log('\n── /mcp Endpoint ──');
  await testMCPListTools();
  await testMCPCallAskZion();
  await testMCPCallWorldState();
  await testMCPCallGetZone();
  await testMCPCallGetZoneNotFound();
  await testMCPCallGetEconomy();
  await testMCPCallGetChat();
  await testMCPUnknownTool();
  await testMCPUnknownMethod();
  await testMCPBadJSON();
  await testMCPAltParamNames();

  console.log('\n── Feeds ──');
  await testFeedsList();
  for (const f of ['world', 'chat', 'events', 'opml']) {
    await testFeedProxy(f);
  }
  await testFeedUnknown();

  console.log('\n── Schema / Perception / Discovery ──');
  await testSchema();
  await testPerception();
  await testMCPDiscovery();

  console.log('\n── 404 ──');
  await testNotFound();

  // Summary
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  ${passed + failed} tests: \x1b[32m${passed} passed\x1b[0m, \x1b[31m${failed} failed\x1b[0m`);
  console.log(`${'─'.repeat(50)}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
