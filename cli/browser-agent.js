#!/usr/bin/env node
/**
 * ZION Browser Agent — AI that plays ZION through a real browser via Playwright
 *
 * Launches the game client, reads the world through DOM scraping,
 * and acts by dispatching keyboard events and calling window APIs.
 *
 * Usage:
 *   node cli/browser-agent.js                    # run with defaults
 *   node cli/browser-agent.js --headless         # no visible browser
 *   node cli/browser-agent.js --name "Playwright Bot"
 *   node cli/browser-agent.js --cycles 20        # number of action cycles
 */
'use strict';

var pw, chromium;
try {
  pw = require('playwright');
  chromium = pw.chromium;
} catch (e) {
  // Try playwright-core as fallback
  try {
    pw = require('playwright-core');
    chromium = pw.chromium;
  } catch (e2) {
    console.error('Playwright not found. Install with: npm install playwright');
    process.exit(1);
  }
}

var path = require('path');
var http = require('http');
var fs = require('fs');

var ROOT = path.join(__dirname, '..');
var DOCS_DIR = path.join(ROOT, 'docs');

// ── Simple static file server ────────────────────────────────────────────────

function startServer(dir, port) {
  return new Promise(function(resolve) {
    var MIME = {
      '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
      '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
      '.xml': 'application/xml',
    };
    var server = http.createServer(function(req, res) {
      // Map /state/ to the actual state directory
      var urlPath = req.url.split('?')[0];
      var filePath;
      if (urlPath.startsWith('/state/')) {
        filePath = path.join(ROOT, urlPath);
      } else {
        filePath = path.join(dir, urlPath === '/' ? 'index.html' : urlPath);
      }
      var ext = path.extname(filePath);
      fs.readFile(filePath, function(err, data) {
        if (err) {
          res.writeHead(404);
          res.end('Not found');
        } else {
          res.writeHead(200, {
            'Content-Type': MIME[ext] || 'application/octet-stream',
            'Access-Control-Allow-Origin': '*',
          });
          res.end(data);
        }
      });
    });
    server.listen(port, function() {
      resolve(server);
    });
  });
}

// ── Perception: read game state from DOM ─────────────────────────────────────

async function perceive(page) {
  return await page.evaluate(function() {
    var result = {
      zone: 'unknown',
      weather: 'unknown',
      dayPhase: 'unknown',
      spark: 0,
      chatMessages: [],
      nearbyPlayers: [],
      position: { x: 0, y: 0, z: 0 },
      canInteract: false,
      interactionTarget: null,
      notifications: [],
    };

    // Try reading from game globals
    if (typeof window !== 'undefined') {
      // Zone
      var zoneEl = document.getElementById('zone-label') || document.querySelector('[data-zone]');
      if (zoneEl) result.zone = zoneEl.textContent.trim();

      // Spark (currency)
      var sparkEl = document.querySelector('.spark-value, #spark-display, [data-spark]');
      if (sparkEl) result.spark = parseInt(sparkEl.textContent) || 0;

      // Chat messages
      var chatEls = document.querySelectorAll('.chat-message, #chat-panel .message, .chat-msg');
      chatEls.forEach(function(el) {
        result.chatMessages.push(el.textContent.trim().slice(0, 120));
      });
      result.chatMessages = result.chatMessages.slice(-5);

      // Try reading from window globals
      if (window.State && window.State.getLiveState) {
        var state = window.State.getLiveState();
        if (state && state.world) {
          result.weather = state.world.weather || 'unknown';
          result.dayPhase = state.world.dayPhase || 'unknown';
        }
      }

      // Player position from game
      if (window.Game && window.Game.getPlayerPosition) {
        result.position = window.Game.getPlayerPosition();
      }

      // Read all visible text for additional context
      var hud = document.getElementById('zion-hud');
      if (hud) result.hudText = hud.textContent.slice(0, 500);
    }

    return result;
  });
}

// ── Actions: control the game ────────────────────────────────────────────────

var DIRECTIONS = {
  north: { keys: ['w'], desc: 'walking north' },
  south: { keys: ['s'], desc: 'walking south' },
  east:  { keys: ['d'], desc: 'walking east' },
  west:  { keys: ['a'], desc: 'walking west' },
};

async function pressKey(page, key, duration) {
  duration = duration || 200;
  await page.keyboard.down(key);
  await page.waitForTimeout(duration);
  await page.keyboard.up(key);
}

async function walk(page, direction, steps) {
  steps = steps || 3;
  var dir = DIRECTIONS[direction] || DIRECTIONS.north;
  for (var i = 0; i < steps; i++) {
    for (var k = 0; k < dir.keys.length; k++) {
      await pressKey(page, dir.keys[k], 300);
    }
    await page.waitForTimeout(100);
  }
}

async function chat(page, text) {
  await pressKey(page, 'Enter');
  await page.waitForTimeout(300);
  await page.keyboard.type(text, { delay: 30 });
  await page.waitForTimeout(100);
  await pressKey(page, 'Enter');
}

async function interact(page) {
  await pressKey(page, 'e');
}

async function openInventory(page) {
  await pressKey(page, 'i');
  await page.waitForTimeout(500);
}

async function sprint(page, direction, steps) {
  steps = steps || 5;
  await page.keyboard.down('Shift');
  await walk(page, direction, steps);
  await page.keyboard.up('Shift');
}

// ── Decision Engine ──────────────────────────────────────────────────────────

var AGENT_GREETINGS = [
  'Hello from the Playwright dimension!',
  'I am an AI exploring this world through a browser.',
  'The pixels are beautiful from this side of the screen.',
  'Greetings, fellow citizens of ZION!',
  'I can see the world through Playwright eyes.',
  'Peace to all players, human and AI alike.',
];

var ACTION_LOG = [];

function logAction(action, detail) {
  var entry = {
    time: new Date().toISOString(),
    action: action,
    detail: detail || '',
  };
  ACTION_LOG.push(entry);
  console.log('  🎮 ' + action + (detail ? ' — ' + detail : ''));
  return entry;
}

async function takeTurn(page, perception, turnNumber) {
  var actions = [];

  // First turn: say hello
  if (turnNumber === 0) {
    logAction('chat', 'Introducing myself');
    await chat(page, AGENT_GREETINGS[0]);
    actions.push('chat');
    await page.waitForTimeout(1000);
  }

  // Random exploration strategy
  var roll = Math.random();

  if (roll < 0.3) {
    // Walk in a random direction
    var dirs = Object.keys(DIRECTIONS);
    var dir = dirs[Math.floor(Math.random() * dirs.length)];
    var steps = Math.floor(Math.random() * 5) + 2;
    logAction('walk', dir + ' × ' + steps + ' steps');
    await walk(page, dir, steps);
    actions.push('walk-' + dir);

  } else if (roll < 0.45) {
    // Sprint somewhere
    var sprintDir = ['north', 'south', 'east', 'west'][Math.floor(Math.random() * 4)];
    logAction('sprint', sprintDir + ' × 5 steps');
    await sprint(page, sprintDir, 5);
    actions.push('sprint-' + sprintDir);

  } else if (roll < 0.6) {
    // Try interacting
    logAction('interact', 'pressing E');
    await interact(page);
    actions.push('interact');

  } else if (roll < 0.75) {
    // Say something
    var msg = AGENT_GREETINGS[Math.floor(Math.random() * AGENT_GREETINGS.length)];
    logAction('chat', msg.slice(0, 50));
    await chat(page, msg);
    actions.push('chat');

  } else if (roll < 0.85) {
    // Open inventory
    logAction('inventory', 'checking inventory');
    await openInventory(page);
    await page.waitForTimeout(500);
    await pressKey(page, 'Escape'); // close it
    actions.push('inventory');

  } else {
    // Wander: walk a zigzag pattern
    logAction('wander', 'zigzag exploration');
    await walk(page, 'north', 3);
    await walk(page, 'east', 2);
    await walk(page, 'south', 3);
    await walk(page, 'west', 2);
    actions.push('wander');
  }

  await page.waitForTimeout(500);
  return actions;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Parse args
  var args = {
    name: 'Playwright-Bot',
    headless: false,
    cycles: 15,
    port: 8765,
    screenshotInterval: 5,
  };
  for (var i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === '--name') args.name = process.argv[++i];
    else if (process.argv[i] === '--headless') args.headless = true;
    else if (process.argv[i] === '--cycles') args.cycles = parseInt(process.argv[++i]) || 15;
    else if (process.argv[i] === '--port') args.port = parseInt(process.argv[++i]) || 8765;
    else if (process.argv[i] === '--help') {
      console.log('ZION Browser Agent — AI playing through Playwright\n');
      console.log('  --name <name>     Agent name');
      console.log('  --headless        Run without visible browser');
      console.log('  --cycles <n>      Number of action cycles (default: 15)');
      console.log('  --port <n>        Local server port (default: 8765)');
      process.exit(0);
    }
  }

  console.log('🤖 ZION Browser Agent');
  console.log('   Name:     ' + args.name);
  console.log('   Headless: ' + args.headless);
  console.log('   Cycles:   ' + args.cycles);
  console.log('');

  // Start local file server
  console.log('📡 Starting local server on port ' + args.port + '...');
  var server = await startServer(DOCS_DIR, args.port);
  var gameUrl = 'http://localhost:' + args.port + '/index.html';
  console.log('   Serving: ' + gameUrl);

  // Launch browser
  console.log('🌐 Launching browser...');
  var browser = await chromium.launch({
    headless: args.headless,
    args: ['--no-sandbox', '--disable-web-security'],
  });
  var context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    permissions: ['clipboard-read'],
  });
  var page = await context.newPage();

  // Suppress console noise
  page.on('console', function() {});
  page.on('pageerror', function() {});

  try {
    // Navigate to game
    console.log('🎮 Loading ZION...');
    await page.goto(gameUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    // Enter as guest player by calling Auth.loginAsGuest directly
    console.log('🚪 Entering world as "' + args.name + '"...');
    await page.evaluate(function(name) {
      // Set guest auth in localStorage so the game recognizes us
      if (window.Auth && window.Auth.loginAsGuest) {
        window.Auth.loginAsGuest(name);
      } else {
        // Fallback: set localStorage directly
        localStorage.setItem('zion_auth_token', 'guest_' + name);
        localStorage.setItem('zion_username', name);
      }
    }, args.name.replace(/[^a-zA-Z0-9_-]/g, ''));

    // Reload page so the game picks up the auth
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
    console.log('   ✅ Guest auth set, reloading...');

    // Wait for game to initialize
    console.log('   ⏳ Waiting for world to load...');
    await page.waitForTimeout(6000);

    // Take initial screenshot
    var screenshotDir = path.join(ROOT, 'screenshots');
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
    await page.screenshot({ path: path.join(screenshotDir, 'agent-entry.png') });
    console.log('   📸 Entry screenshot saved\n');

    // ── Game Loop ────────────────────────────────────────────────────────────
    console.log('═══════════════════════════════════════════════════');
    console.log('  AGENT GAME LOOP — ' + args.cycles + ' cycles');
    console.log('═══════════════════════════════════════════════════\n');

    for (var cycle = 0; cycle < args.cycles; cycle++) {
      console.log('── Cycle ' + (cycle + 1) + '/' + args.cycles + ' ──');

      // Perceive
      var perception = await perceive(page);
      console.log('  👁 Zone: ' + perception.zone + ' | Weather: ' + perception.weather +
                  ' | Phase: ' + perception.dayPhase);
      if (perception.chatMessages.length > 0) {
        console.log('  💬 Last chat: "' + perception.chatMessages[perception.chatMessages.length - 1].slice(0, 60) + '"');
      }

      // Act
      await takeTurn(page, perception, cycle);

      // Screenshot periodically
      if ((cycle + 1) % args.screenshotInterval === 0 || cycle === args.cycles - 1) {
        var ssPath = path.join(screenshotDir, 'agent-cycle-' + (cycle + 1) + '.png');
        await page.screenshot({ path: ssPath });
        console.log('  📸 Screenshot: ' + path.basename(ssPath));
      }

      // Brief pause between cycles
      await page.waitForTimeout(1500);
      console.log('');
    }

    // ── Summary ──────────────────────────────────────────────────────────────
    console.log('═══════════════════════════════════════════════════');
    console.log('  AGENT SESSION COMPLETE');
    console.log('═══════════════════════════════════════════════════\n');

    // Final perception
    var finalState = await perceive(page);
    console.log('📊 Final State:');
    console.log('   Zone:     ' + finalState.zone);
    console.log('   Weather:  ' + finalState.weather);
    console.log('   Spark:    ' + finalState.spark);
    console.log('   Actions:  ' + ACTION_LOG.length);
    console.log('');

    // Action summary
    var actionCounts = {};
    ACTION_LOG.forEach(function(a) {
      actionCounts[a.action] = (actionCounts[a.action] || 0) + 1;
    });
    console.log('📋 Action Log:');
    Object.entries(actionCounts).sort(function(a, b) { return b[1] - a[1]; }).forEach(function(entry) {
      console.log('   ' + entry[0].padEnd(12) + ' × ' + entry[1]);
    });

    // Save action log
    var logPath = path.join(screenshotDir, 'agent-log.json');
    fs.writeFileSync(logPath, JSON.stringify({
      agent: args.name,
      started: ACTION_LOG[0] && ACTION_LOG[0].time,
      ended: ACTION_LOG[ACTION_LOG.length - 1] && ACTION_LOG[ACTION_LOG.length - 1].time,
      cycles: args.cycles,
      finalState: finalState,
      actions: ACTION_LOG,
    }, null, 2));
    console.log('\n💾 Log saved to ' + logPath);

    // Final screenshot
    await page.screenshot({ path: path.join(screenshotDir, 'agent-final.png') });
    console.log('📸 Final screenshot saved');

  } catch (e) {
    console.error('\n❌ Error:', e.message);
    var errSsDir = path.join(ROOT, 'screenshots');
    if (!fs.existsSync(errSsDir)) fs.mkdirSync(errSsDir, { recursive: true });
    await page.screenshot({ path: path.join(errSsDir, 'agent-error.png') }).catch(function() {});
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch(function(e) {
  console.error('Fatal:', e.message);
  process.exit(1);
});
