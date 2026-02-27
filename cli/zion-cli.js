#!/usr/bin/env node
// zion-cli.js — ZION Terminal Client
// Play ZION from the command line. One protocol, all players.

'use strict';

var fs = require('fs');
var path = require('path');
var readline = require('readline');

// Load ZION modules (UMD pattern works with require())
var Protocol = require(path.join(__dirname, '..', 'src', 'js', 'protocol.js'));
var Zones = require(path.join(__dirname, '..', 'src', 'js', 'zones.js'));
var Economy = require(path.join(__dirname, '..', 'src', 'js', 'economy.js'));
var StateModule = require(path.join(__dirname, '..', 'src', 'js', 'state.js'));

// Load CLI modules
var Renderer = require(path.join(__dirname, 'renderer.js'));
var InputHandler = require(path.join(__dirname, 'cli-input.js'));

// ========================================================================
// STATE LOADING
// ========================================================================

var ROOT = path.join(__dirname, '..');

function loadJsonSafe(filePath) {
  try {
    var raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function loadWorldState() {
  var state = StateModule.createWorldState();

  // Load canonical state files
  var worldData = loadJsonSafe(path.join(ROOT, 'state', 'world.json'));
  if (worldData) {
    state.world = Object.assign(state.world, {
      zones: worldData.zones || {},
      time: worldData.time || 0,
      weather: worldData.weather || 'clear',
      season: worldData.season || 'spring',
      dayPhase: worldData.dayPhase || 'day'
    });
  }

  var playersData = loadJsonSafe(path.join(ROOT, 'state', 'players.json'));
  if (playersData && playersData.players) {
    state.players = playersData.players;
  }

  var structuresData = loadJsonSafe(path.join(ROOT, 'state', 'structures.json'));
  if (structuresData && structuresData.structures) {
    state.structures = structuresData.structures;
  }

  var gardensData = loadJsonSafe(path.join(ROOT, 'state', 'gardens.json'));
  if (gardensData && gardensData.gardens) {
    state.gardens = gardensData.gardens;
  }

  var economyData = loadJsonSafe(path.join(ROOT, 'state', 'economy.json'));
  if (economyData) {
    state.economy = economyData;
  }

  var chatData = loadJsonSafe(path.join(ROOT, 'state', 'chat.json'));
  if (chatData && chatData.messages) {
    state.chat = chatData.messages;
  }

  return state;
}

// ========================================================================
// GAME STATE
// ========================================================================

var game = {
  playerId: null,
  state: null,
  ledger: null,
  zone: 'nexus',
  position: { x: 0, y: 0, z: 0 },
  inventory: {},
  spark: 0,
  chatLog: [],
  messageLog: [],  // Protocol messages generated
  panel: 'default',
  showHelp: false,
  showInventory: false,
  running: false,
  renderTimer: null,
  input: null,
  moveSpeed: 2,  // Units per keypress
};

// ========================================================================
// PROTOCOL MESSAGE GENERATION
// ========================================================================

function createProtocolMessage(type, payload) {
  return Protocol.createMessage(type, game.playerId, payload || {}, {
    platform: 'api',
    position: {
      x: game.position.x,
      y: game.position.y,
      z: game.position.z,
      zone: game.zone
    }
  });
}

function logMessage(msg) {
  game.messageLog.push(msg);
  // Keep last 100
  if (game.messageLog.length > 100) {
    game.messageLog = game.messageLog.slice(-100);
  }
}

// ========================================================================
// GAME ACTIONS
// ========================================================================

function handleMove(delta) {
  if (game.showHelp || game.showInventory) return;

  var newX = game.position.x + delta.x * game.moveSpeed;
  var newZ = game.position.z + delta.z * game.moveSpeed;

  // Clamp to zone bounds
  var zone = Zones.getZone(game.zone);
  if (zone && zone.bounds) {
    newX = Math.max(zone.bounds.x_min, Math.min(zone.bounds.x_max, newX));
    newZ = Math.max(zone.bounds.z_min, Math.min(zone.bounds.z_max, newZ));
  }

  game.position.x = newX;
  game.position.z = newZ;

  // Generate protocol message
  var msg = createProtocolMessage('move', {
    position: { x: newX, y: game.position.y, z: newZ },
    zone: game.zone
  });
  logMessage(msg);

  // Update player in state
  if (!game.state.players[game.playerId]) {
    game.state.players[game.playerId] = {};
  }
  game.state.players[game.playerId].position = {
    x: newX, y: game.position.y, z: newZ, zone: game.zone
  };

  renderFrame();
}

function handleAction(action, data) {
  if (action === 'chat_open' || action === 'chat_close' || action === 'chat_update') {
    renderFrame();
    return;
  }

  if (action === 'help') {
    game.showHelp = !game.showHelp;
    game.showInventory = false;
    renderFrame();
    return;
  }

  if (action === 'inventory') {
    game.showInventory = !game.showInventory;
    game.showHelp = false;
    renderFrame();
    return;
  }

  if (action === 'interact') {
    handleInteract();
    return;
  }

  if (action === 'cycle_panel') {
    var panels = ['default', 'players', 'economy'];
    var idx = panels.indexOf(game.panel);
    game.panel = panels[(idx + 1) % panels.length];
    renderFrame();
    return;
  }

  // Portal warp (1-8)
  var portalMatch = action.match(/^portal_(\d)$/);
  if (portalMatch) {
    var portalIndex = parseInt(portalMatch[1]) - 1;
    handleWarp(portalIndex);
    return;
  }

  // Dismiss help/inventory on any key
  if (game.showHelp || game.showInventory) {
    game.showHelp = false;
    game.showInventory = false;
    renderFrame();
    return;
  }
}

function handleChat(text) {
  if (!text || text.trim().length === 0) return;

  var msg = createProtocolMessage('say', {
    message: text.trim()
  });
  logMessage(msg);

  // Add to chat log
  game.chatLog.push({
    from: game.playerId,
    text: text.trim(),
    ts: new Date().toISOString()
  });

  renderFrame();
}

function handleWarp(portalIndex) {
  var zone = Zones.getZone(game.zone);
  if (!zone || !zone.portals) return;

  if (portalIndex < 0 || portalIndex >= zone.portals.length) return;

  var targetZone = zone.portals[portalIndex];
  if (!Zones.zoneExists(targetZone)) return;

  var targetZoneData = Zones.getZone(targetZone);

  // Generate warp message
  var msg = createProtocolMessage('warp', {
    zone: targetZone
  });
  logMessage(msg);

  // Move to target zone center
  game.zone = targetZone;
  if (targetZoneData && targetZoneData.bounds) {
    game.position.x = (targetZoneData.bounds.x_min + targetZoneData.bounds.x_max) / 2;
    game.position.z = (targetZoneData.bounds.z_min + targetZoneData.bounds.z_max) / 2;
  } else {
    game.position.x = 0;
    game.position.z = 0;
  }

  // Update player state
  if (!game.state.players[game.playerId]) {
    game.state.players[game.playerId] = {};
  }
  game.state.players[game.playerId].position = {
    x: game.position.x, y: game.position.y, z: game.position.z, zone: game.zone
  };

  // Add warp notification to chat
  game.chatLog.push({
    from: 'SYSTEM',
    text: 'You warped to ' + (targetZoneData ? targetZoneData.name : targetZone),
    ts: new Date().toISOString()
  });

  renderFrame();
}

function handleInteract() {
  // Find nearest entity
  var nearest = null;
  var nearestDist = Infinity;

  // Check players
  var playerIds = Object.keys(game.state.players || {});
  for (var i = 0; i < playerIds.length; i++) {
    var pid = playerIds[i];
    if (pid === game.playerId) continue;
    var p = game.state.players[pid];
    if (!p || !p.position || p.position.zone !== game.zone) continue;

    var dx = p.position.x - game.position.x;
    var dz = p.position.z - game.position.z;
    var dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < nearestDist && dist < 10) {
      nearestDist = dist;
      nearest = { type: 'player', id: pid, data: p };
    }
  }

  if (nearest) {
    var msg = createProtocolMessage('inspect', { target: nearest.id });
    logMessage(msg);

    game.chatLog.push({
      from: 'SYSTEM',
      text: 'Inspected ' + nearest.type + ': ' + nearest.id + ' at distance ' + Math.round(nearestDist),
      ts: new Date().toISOString()
    });
  } else {
    game.chatLog.push({
      from: 'SYSTEM',
      text: 'Nothing nearby to interact with.',
      ts: new Date().toISOString()
    });
  }

  renderFrame();
}

function handleQuit() {
  // Generate leave message
  var msg = createProtocolMessage('leave', {});
  logMessage(msg);

  game.running = false;

  // Restore terminal
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  process.stdin.pause();

  // Clear screen and show goodbye
  process.stdout.write('\x1b[2J\x1b[H');
  console.log('');
  console.log(Renderer.C.cyan + Renderer.C.bold + '  Thank you for visiting ZION.' + Renderer.C.reset);
  console.log(Renderer.C.dim + '  ' + game.messageLog.length + ' protocol messages generated.' + Renderer.C.reset);
  console.log('');

  process.exit(0);
}

// ========================================================================
// RENDERING
// ========================================================================

function renderFrame() {
  if (!game.running) return;

  var lines;

  if (game.showHelp) {
    lines = Renderer.renderHelp();
  } else if (game.showInventory) {
    lines = Renderer.renderInventory(game.inventory, game.spark);
  } else {
    lines = Renderer.render({
      state: game.state,
      playerId: game.playerId,
      playerPos: game.position,
      zone: game.zone,
      chatLog: game.chatLog,
      spark: game.spark,
      panel: game.panel,
      chatMode: game.input ? game.input.isChatMode() : false,
      chatBuffer: game.input ? game.input.getChatBuffer() : ''
    });
  }

  // Clear screen and draw
  var output = '\x1b[2J\x1b[H' + lines.join('\n') + '\n';
  process.stdout.write(output);
}

// ========================================================================
// STARTUP
// ========================================================================

function start(username) {
  game.playerId = username;
  game.state = loadWorldState();
  game.ledger = Economy.createLedger();
  game.zone = Zones.getSpawnZone();
  game.running = true;

  // Set initial position to zone center
  var spawnZone = Zones.getZone(game.zone);
  if (spawnZone && spawnZone.bounds) {
    game.position.x = (spawnZone.bounds.x_min + spawnZone.bounds.x_max) / 2;
    game.position.z = (spawnZone.bounds.z_min + spawnZone.bounds.z_max) / 2;
  }

  // Add self to state
  game.state.players[game.playerId] = {
    position: {
      x: game.position.x, y: game.position.y, z: game.position.z, zone: game.zone
    },
    joinedAt: new Date().toISOString(),
    platform: 'api'
  };

  // Generate join message
  var joinMsg = createProtocolMessage('join', {});
  logMessage(joinMsg);

  // Add welcome to chat
  game.chatLog.push({
    from: 'SYSTEM',
    text: 'Welcome to ZION, ' + game.playerId + '! You spawned in The Nexus.',
    ts: new Date().toISOString()
  });

  // Load existing chat if available
  if (game.state.chat && Array.isArray(game.state.chat)) {
    for (var ci = 0; ci < Math.min(game.state.chat.length, 10); ci++) {
      var chatMsg = game.state.chat[ci];
      if (chatMsg && (chatMsg.user || chatMsg.from)) {
        game.chatLog.push({
          from: chatMsg.user || chatMsg.from,
          text: chatMsg.text || chatMsg.message || '',
          ts: chatMsg.timestamp || chatMsg.ts || ''
        });
      }
    }
  }

  // Set up input
  game.input = InputHandler.createInputHandler({
    onMove: handleMove,
    onAction: handleAction,
    onChat: handleChat,
    onQuit: handleQuit
  });

  // Enable raw mode for terminal
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', function(data) {
    game.input.handleData(data);
  });

  // Handle process signals
  process.on('SIGINT', handleQuit);
  process.on('SIGTERM', handleQuit);

  // Initial render
  renderFrame();
}

// ========================================================================
// MAIN
// ========================================================================

function main() {
  var args = process.argv.slice(2);
  var username = args[0];

  // Show splash
  process.stdout.write('\x1b[2J\x1b[H');
  var splash = Renderer.renderSplash();
  console.log(splash.join('\n'));

  if (username) {
    // Direct start with provided username
    start(username);
  } else {
    // Prompt for username
    var rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(Renderer.C.yellow + '  Enter your player name: ' + Renderer.C.reset, function(answer) {
      rl.close();
      var name = (answer || '').trim().replace(/[^a-zA-Z0-9_-]/g, '');
      if (!name) name = 'wanderer-' + Math.random().toString(36).substr(2, 4);
      start(name);
    });
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

// Export for testing
module.exports = {
  loadWorldState: loadWorldState,
  createProtocolMessage: createProtocolMessage,
  handleMove: handleMove,
  handleWarp: handleWarp,
  handleChat: handleChat,
  game: game,
  start: start
};
