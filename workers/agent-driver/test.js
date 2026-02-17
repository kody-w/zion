/**
 * Tests for ZION Agent Driver MCP Server
 *
 * Tests the browser session manager, perception, movement, and interaction
 * modules independently, then runs an integration test of the full loop.
 *
 * Usage: node test.js [--live] [--url URL]
 *   --live   Run against a live server (default: starts local HTTP server)
 *   --url    Specify custom URL (implies --live)
 */
import assert from 'node:assert';
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, extname, join } from 'node:path';

import { BrowserSession } from './browser.js';
import { Perception } from './perception.js';
import { Movement } from './movement.js';
import { Interaction } from './interaction.js';

// ── Test runner ──────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures = [];

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err) {
    failed++;
    failures.push({ name, error: err });
    console.log(`  ❌ ${name}: ${err.message}`);
  }
}

// ── Local HTTP server for testing ───────────────────────────────────
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.xml': 'application/xml' };

function startLocalServer(docsDir) {
  return new Promise((resolve_, reject) => {
    const srv = createServer((req, res) => {
      let filePath = join(docsDir, req.url === '/' ? 'index.html' : req.url);
      try {
        const data = readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port;
      resolve_({ server: srv, url: `http://127.0.0.1:${port}` });
    });
    srv.on('error', reject);
  });
}

// ── Main ─────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const isLive = args.includes('--live');
  const urlIdx = args.indexOf('--url');
  let testUrl = urlIdx !== -1 ? args[urlIdx + 1] : null;
  let localServer = null;

  // Start local server if not using live
  if (!testUrl) {
    const docsDir = resolve(import.meta.dirname, '../../docs');
    if (!existsSync(join(docsDir, 'index.html'))) {
      console.error('docs/index.html not found. Run ./scripts/bundle.sh first.');
      process.exit(1);
    }
    const { server, url } = await startLocalServer(docsDir);
    localServer = server;
    testUrl = url;
    console.log(`Local server at ${testUrl}`);
  }

  console.log(`\n════════════════════════════════════════`);
  console.log(`  ZION Agent Driver Tests`);
  console.log(`  URL: ${testUrl}`);
  console.log(`════════════════════════════════════════\n`);

  // ── Suite 1: BrowserSession ──────────────────────────────────────
  console.log('Suite: BrowserSession');

  let session = null;

  await test('creates a session with headless browser', async () => {
    session = new BrowserSession({ url: testUrl });
    assert.ok(session);
    assert.strictEqual(session.isConnected(), false);
  });

  await test('launches browser and loads page', async () => {
    await session.launch();
    assert.strictEqual(session.isConnected(), true);
    assert.ok(session.page);
  });

  await test('joins world as guest', async () => {
    const result = await session.joinWorld('TestAgent');
    assert.ok(result.success, 'join should succeed: ' + (result.error || ''));
    assert.strictEqual(result.playerName, 'TestAgent');
  });

  await test('reports login screen hidden after join', async () => {
    const state = await session.getWorldState();
    assert.strictEqual(state.loginHidden, true, 'login should be hidden');
  });

  await test('detects WebGL context', async () => {
    const state = await session.getWorldState();
    assert.strictEqual(state.hasWebGL, true, 'should have WebGL');
  });

  // ── Suite 2: Perception ──────────────────────────────────────────
  console.log('\nSuite: Perception');
  const perception = new Perception(session);

  await test('look() returns zone and player info', async () => {
    const state = await perception.look();
    assert.ok(state.zone, 'should have zone name');
    assert.ok(state.playerName, 'should have player name');
    assert.ok('spark' in state, 'should have spark balance');
  });

  await test('look() returns screenshot as base64', async () => {
    const state = await perception.look();
    assert.ok(state.screenshot, 'should have screenshot');
    assert.ok(state.screenshot.length > 100, 'screenshot should have data');
  });

  await test('status() returns structured state without screenshot', async () => {
    const state = await perception.status();
    assert.ok(state.zone, 'should have zone');
    assert.ok(state.playerName, 'should have player name');
    assert.strictEqual(state.screenshot, undefined, 'should NOT have screenshot');
  });

  await test('readChat() returns array', async () => {
    const messages = await perception.readChat();
    assert.ok(Array.isArray(messages), 'should return array');
  });

  // ── Suite 3: Movement ────────────────────────────────────────────
  console.log('\nSuite: Movement');
  const movement = new Movement(session);

  await test('move() accepts direction and returns position', async () => {
    const result = await movement.move('forward', 500);
    assert.ok(result, 'should return result');
    assert.ok(result.zone, 'should have zone');
  });

  await test('move() accepts all four directions', async () => {
    for (const dir of ['forward', 'left', 'backward', 'right']) {
      const result = await movement.move(dir, 300);
      assert.ok(result, `${dir} should return result`);
    }
  });

  await test('lookAround() rotates camera', async () => {
    const result = await movement.lookAround(90);
    assert.ok(result, 'should return result');
    assert.ok(result.screenshot, 'should include screenshot');
  });

  // ── Suite 4: Interaction ─────────────────────────────────────────
  console.log('\nSuite: Interaction');
  const interaction = new Interaction(session);

  await test('chat() sends a message', async () => {
    const result = await interaction.chat('Hello from TestAgent!');
    assert.ok(result.sent, 'message should be sent');
  });

  await test('emote() triggers an emote', async () => {
    const result = await interaction.emote('wave');
    assert.ok(result, 'should return result');
  });

  await test('interact() presses E key', async () => {
    const result = await interaction.interact();
    assert.ok(result, 'should return result');
  });

  await test('screenshot() returns base64 image', async () => {
    const result = await interaction.screenshot();
    assert.ok(result.image, 'should have image data');
    assert.ok(result.image.length > 100, 'image should have content');
    assert.strictEqual(result.mimeType, 'image/png');
  });

  // ── Suite 5: Integration (perception-action loop) ────────────────
  console.log('\nSuite: Integration');

  await test('full perception-action loop', async () => {
    // Look at the world
    const look1 = await perception.look();
    assert.ok(look1.zone, 'should see zone');

    // Walk forward
    await movement.move('forward', 800);

    // Look again — position may have changed
    const look2 = await perception.status();
    assert.ok(look2.zone, 'should still see zone after moving');

    // Say something
    await interaction.chat('I walked forward!');

    // Check chat
    const chat = await perception.readChat();
    assert.ok(Array.isArray(chat), 'chat should be readable after sending');
  });

  // ── Cleanup ──────────────────────────────────────────────────────
  console.log('\nSuite: Cleanup');

  await test('leaves world cleanly', async () => {
    const result = await session.leaveWorld();
    assert.ok(result.success, 'leave should succeed');
  });

  await test('closes browser', async () => {
    await session.close();
    assert.strictEqual(session.isConnected(), false);
  });

  // ── Report ───────────────────────────────────────────────────────
  if (localServer) localServer.close();

  console.log(`\n════════════════════════════════════════`);
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log(`════════════════════════════════════════\n`);

  if (failures.length > 0) {
    console.log('Failures:');
    failures.forEach(f => {
      console.log(`  ${f.name}:`);
      console.log(`    ${f.error.message}`);
    });
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
