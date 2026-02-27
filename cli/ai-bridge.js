#!/usr/bin/env node
// ai-bridge.js — Headless ZION bridge for external AI agents
//
// Any AI system (OpenClaw, Claude, GPT, Ollama, custom bots) can play ZION
// by piping JSON through this bridge:
//
//   1. Bridge outputs a JSON state snapshot to stdout each tick
//   2. AI reads it, decides what to do, writes a JSON command to stdin
//   3. Bridge executes the command, generates protocol messages, loops
//
// Usage:
//   node cli/ai-bridge.js <agent-name> [--tick 3000] [--ascii]
//
// Pipe an AI into it:
//   node my-ai-agent.js | node cli/ai-bridge.js openclaw-001
//
// Or use interactively for testing:
//   node cli/ai-bridge.js test-agent
//
// Commands (JSON, one per line on stdin):
//   {"action": "move", "direction": "north"}
//   {"action": "move", "direction": "south"}
//   {"action": "move", "direction": "east"}
//   {"action": "move", "direction": "west"}
//   {"action": "warp", "zone": "gardens"}
//   {"action": "say", "message": "Hello world!"}
//   {"action": "shout", "message": "Hear me!"}
//   {"action": "emote", "type": "wave"}
//   {"action": "inspect", "target": "agent_042"}
//   {"action": "interact"}
//   {"action": "look"}           (re-emit current state)
//   {"action": "quit"}
//
// State output (JSON, one object per line on stdout):
//   {"type": "state", "tick": 1, "you": {...}, "zone": {...}, "nearby_players": [...],
//    "nearby_structures": [...], "chat": [...], "portals": [...], "rules": {...}}

'use strict';

var fs = require('fs');
var path = require('path');
var readline = require('readline');

// Load ZION modules
var Protocol = require(path.join(__dirname, '..', 'src', 'js', 'protocol.js'));
var Zones = require(path.join(__dirname, '..', 'src', 'js', 'zones.js'));
var Economy = require(path.join(__dirname, '..', 'src', 'js', 'economy.js'));
var StateModule = require(path.join(__dirname, '..', 'src', 'js', 'state.js'));

// Optional: ASCII renderer for --ascii mode
var Renderer = null;
try {
  Renderer = require(path.join(__dirname, 'renderer.js'));
} catch (e) { /* renderer optional */ }

var ROOT = path.join(__dirname, '..');

// ========================================================================
// CONFIGURATION
// ========================================================================

var args = process.argv.slice(2);
var agentName = null;
var tickInterval = 3000;  // ms between state emissions
var asciiMode = false;

for (var i = 0; i < args.length; i++) {
  if (args[i] === '--tick' && args[i + 1]) {
    tickInterval = parseInt(args[i + 1]);
    i++;
  } else if (args[i] === '--ascii') {
    asciiMode = true;
  } else if (!agentName) {
    agentName = args[i];
  }
}

if (!agentName) {
  process.stderr.write('Usage: node ai-bridge.js <agent-name> [--tick 3000] [--ascii]\n');
  process.stderr.write('\nCommands (JSON on stdin):\n');
  process.stderr.write('  {"action": "move", "direction": "north|south|east|west"}\n');
  process.stderr.write('  {"action": "warp", "zone": "gardens"}\n');
  process.stderr.write('  {"action": "say", "message": "Hello!"}\n');
  process.stderr.write('  {"action": "inspect", "target": "agent_042"}\n');
  process.stderr.write('  {"action": "look"}\n');
  process.stderr.write('  {"action": "quit"}\n');
  process.exit(1);
}

// ========================================================================
// STATE
// ========================================================================

function loadJsonSafe(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
  catch (e) { return null; }
}

function loadWorldState() {
  var state = StateModule.createWorldState();

  var worldData = loadJsonSafe(path.join(ROOT, 'state', 'world.json'));
  if (worldData) {
    state.world = Object.assign(state.world, {
      zones: worldData.zones || {},
      weather: worldData.weather || 'clear',
      season: worldData.season || 'spring',
      dayPhase: worldData.dayPhase || 'day'
    });
  }

  var playersData = loadJsonSafe(path.join(ROOT, 'state', 'players.json'));
  if (playersData && playersData.players) state.players = playersData.players;

  var structuresData = loadJsonSafe(path.join(ROOT, 'state', 'structures.json'));
  if (structuresData && structuresData.structures) state.structures = structuresData.structures;

  var gardensData = loadJsonSafe(path.join(ROOT, 'state', 'gardens.json'));
  if (gardensData && gardensData.gardens) state.gardens = gardensData.gardens;

  var chatData = loadJsonSafe(path.join(ROOT, 'state', 'chat.json'));
  if (chatData && chatData.messages) state.chat = chatData.messages;

  return state;
}

var game = {
  agentId: agentName,
  state: loadWorldState(),
  zone: Zones.getSpawnZone(),
  position: { x: 0, y: 0, z: 0 },
  inventory: {},
  spark: 0,
  chatLog: [],
  protocolLog: [],
  tick: 0,
  moveSpeed: 2,
  running: true
};

// Initialize position at zone center
var spawnZone = Zones.getZone(game.zone);
if (spawnZone && spawnZone.bounds) {
  game.position.x = (spawnZone.bounds.x_min + spawnZone.bounds.x_max) / 2;
  game.position.z = (spawnZone.bounds.z_min + spawnZone.bounds.z_max) / 2;
}

// Register self in world
game.state.players[game.agentId] = {
  position: { x: game.position.x, y: 0, z: game.position.z, zone: game.zone },
  joinedAt: new Date().toISOString(),
  platform: 'api'
};

// ========================================================================
// PROTOCOL
// ========================================================================

function createMsg(type, payload) {
  var msg = Protocol.createMessage(type, game.agentId, payload || {}, {
    platform: 'api',
    position: { x: game.position.x, y: game.position.y, z: game.position.z, zone: game.zone }
  });
  game.protocolLog.push({ type: msg.type, ts: msg.ts, id: msg.id });
  if (game.protocolLog.length > 50) game.protocolLog = game.protocolLog.slice(-50);
  return msg;
}

// ========================================================================
// STATE SNAPSHOT — What the AI sees
// ========================================================================

function buildStateSnapshot() {
  var zone = Zones.getZone(game.zone);
  var rules = zone ? zone.rules : {};
  var portals = zone ? (zone.portals || []) : [];

  // Nearby players (same zone, within 50 units)
  var nearbyPlayers = [];
  var playerIds = Object.keys(game.state.players || {});
  for (var i = 0; i < playerIds.length; i++) {
    var pid = playerIds[i];
    if (pid === game.agentId) continue;
    var p = game.state.players[pid];
    if (!p || !p.position || p.position.zone !== game.zone) continue;

    var dx = p.position.x - game.position.x;
    var dz = p.position.z - game.position.z;
    var dist = Math.sqrt(dx * dx + dz * dz);
    if (dist <= 50) {
      nearbyPlayers.push({
        id: pid,
        distance: Math.round(dist),
        direction: getCardinal(dx, dz),
        position: { x: Math.round(p.position.x), z: Math.round(p.position.z) }
      });
    }
  }
  nearbyPlayers.sort(function(a, b) { return a.distance - b.distance; });

  // Nearby structures
  var nearbyStructures = [];
  var structs = game.state.structures || {};
  var structList = Array.isArray(structs) ? structs : Object.values(structs);
  for (var si = 0; si < structList.length; si++) {
    var s = structList[si];
    if (!s || !s.position) continue;
    var sZone = s.zone || (s.position && s.position.zone);
    if (sZone !== game.zone) continue;

    var sdx = (s.position.x || 0) - game.position.x;
    var sdz = (s.position.z || 0) - game.position.z;
    var sDist = Math.sqrt(sdx * sdx + sdz * sdz);
    if (sDist <= 50) {
      nearbyStructures.push({
        id: s.id || 'unknown',
        type: s.type || 'structure',
        distance: Math.round(sDist),
        direction: getCardinal(sdx, sdz)
      });
    }
  }

  // Recent chat (last 10)
  var recentChat = game.chatLog.slice(-10).map(function(c) {
    return { from: c.from, text: c.text };
  });

  return {
    type: 'state',
    tick: game.tick,
    you: {
      id: game.agentId,
      zone: game.zone,
      position: { x: Math.round(game.position.x), z: Math.round(game.position.z) },
      spark: game.spark,
      inventory: game.inventory
    },
    zone: {
      id: game.zone,
      name: zone ? zone.name : game.zone,
      description: zone ? zone.description : '',
      terrain: zone ? zone.terrain : '',
      rules: rules,
      bounds: zone ? zone.bounds : null
    },
    portals: portals,
    nearby_players: nearbyPlayers,
    nearby_structures: nearbyStructures,
    chat: recentChat,
    available_actions: getAvailableActions(rules),
    protocol_messages_sent: game.protocolLog.length
  };
}

function getAvailableActions(rules) {
  var actions = ['move', 'say', 'shout', 'emote', 'inspect', 'look', 'warp', 'quit'];
  if (rules.harvesting) actions.push('harvest', 'plant');
  if (rules.building) actions.push('build');
  if (rules.trading) actions.push('trade_offer', 'buy', 'sell');
  if (rules.competition && rules.pvp) actions.push('challenge');
  return actions;
}

function getCardinal(dx, dz) {
  if (Math.abs(dx) < 1 && Math.abs(dz) < 1) return 'here';
  var angle = Math.atan2(dx, -dz) * 180 / Math.PI;
  if (angle < 0) angle += 360;
  if (angle < 22.5 || angle >= 337.5) return 'north';
  if (angle < 67.5) return 'northeast';
  if (angle < 112.5) return 'east';
  if (angle < 157.5) return 'southeast';
  if (angle < 202.5) return 'south';
  if (angle < 247.5) return 'southwest';
  if (angle < 292.5) return 'west';
  return 'northwest';
}

// ========================================================================
// COMMAND EXECUTION
// ========================================================================

var DIRECTIONS = {
  north: { x: 0, z: -1 }, south: { x: 0, z: 1 },
  east: { x: 1, z: 0 },   west: { x: -1, z: 0 },
  northeast: { x: 0.7, z: -0.7 }, northwest: { x: -0.7, z: -0.7 },
  southeast: { x: 0.7, z: 0.7 },  southwest: { x: -0.7, z: 0.7 }
};

function executeCommand(cmd) {
  if (!cmd || !cmd.action) {
    return { success: false, error: 'Missing action field' };
  }

  switch (cmd.action) {
    case 'move': return execMove(cmd);
    case 'warp': return execWarp(cmd);
    case 'say': return execSay(cmd);
    case 'shout': return execShout(cmd);
    case 'emote': return execEmote(cmd);
    case 'inspect': return execInspect(cmd);
    case 'interact': return execInteract(cmd);
    case 'look': return { success: true, message: 'State refreshed' };
    case 'quit': return execQuit();
    default:
      return { success: false, error: 'Unknown action: ' + cmd.action };
  }
}

function execMove(cmd) {
  var dir = DIRECTIONS[cmd.direction];
  if (!dir) return { success: false, error: 'Invalid direction. Use: north/south/east/west/northeast/northwest/southeast/southwest' };

  var newX = game.position.x + dir.x * game.moveSpeed;
  var newZ = game.position.z + dir.z * game.moveSpeed;

  var zone = Zones.getZone(game.zone);
  if (zone && zone.bounds) {
    newX = Math.max(zone.bounds.x_min, Math.min(zone.bounds.x_max, newX));
    newZ = Math.max(zone.bounds.z_min, Math.min(zone.bounds.z_max, newZ));
  }

  game.position.x = newX;
  game.position.z = newZ;

  createMsg('move', { position: { x: newX, y: 0, z: newZ }, zone: game.zone });

  game.state.players[game.agentId].position = {
    x: newX, y: 0, z: newZ, zone: game.zone
  };

  return { success: true, position: { x: Math.round(newX), z: Math.round(newZ) } };
}

function execWarp(cmd) {
  if (!cmd.zone) return { success: false, error: 'Missing zone field' };
  if (!Zones.zoneExists(cmd.zone)) return { success: false, error: 'Zone does not exist: ' + cmd.zone };

  var currentZone = Zones.getZone(game.zone);
  var portals = currentZone ? (currentZone.portals || []) : [];
  if (portals.indexOf(cmd.zone) === -1) {
    return { success: false, error: 'No portal to ' + cmd.zone + ' from ' + game.zone + '. Available: ' + portals.join(', ') };
  }

  var targetZone = Zones.getZone(cmd.zone);
  game.zone = cmd.zone;
  if (targetZone && targetZone.bounds) {
    game.position.x = (targetZone.bounds.x_min + targetZone.bounds.x_max) / 2;
    game.position.z = (targetZone.bounds.z_min + targetZone.bounds.z_max) / 2;
  }

  createMsg('warp', { zone: cmd.zone });

  game.state.players[game.agentId].position = {
    x: game.position.x, y: 0, z: game.position.z, zone: game.zone
  };

  game.chatLog.push({ from: 'SYSTEM', text: game.agentId + ' warped to ' + (targetZone ? targetZone.name : cmd.zone) });

  return { success: true, zone: game.zone, name: targetZone ? targetZone.name : cmd.zone };
}

function execSay(cmd) {
  if (!cmd.message) return { success: false, error: 'Missing message field' };
  createMsg('say', { message: cmd.message });
  game.chatLog.push({ from: game.agentId, text: cmd.message });
  return { success: true };
}

function execShout(cmd) {
  if (!cmd.message) return { success: false, error: 'Missing message field' };
  createMsg('shout', { message: cmd.message });
  game.chatLog.push({ from: game.agentId, text: '[SHOUT] ' + cmd.message });
  return { success: true };
}

function execEmote(cmd) {
  var emoteType = cmd.type || 'wave';
  createMsg('emote', { type: emoteType });
  game.chatLog.push({ from: game.agentId, text: '*' + emoteType + 's*' });
  return { success: true, emote: emoteType };
}

function execInspect(cmd) {
  var target = cmd.target;
  if (!target) {
    // Find nearest entity
    var nearest = findNearestEntity();
    if (!nearest) return { success: false, error: 'Nothing nearby to inspect' };
    target = nearest.id;
  }

  createMsg('inspect', { target: target });

  var player = game.state.players[target];
  if (player) {
    return {
      success: true,
      entity: {
        type: 'player',
        id: target,
        zone: player.position ? player.position.zone : 'unknown',
        position: player.position,
        platform: player.platform || 'unknown'
      }
    };
  }

  return { success: true, entity: { type: 'unknown', id: target } };
}

function execInteract(cmd) {
  var nearest = findNearestEntity();
  if (!nearest) return { success: false, error: 'Nothing nearby to interact with' };

  createMsg('inspect', { target: nearest.id });
  return {
    success: true,
    entity: { id: nearest.id, type: nearest.type, distance: nearest.distance }
  };
}

function execQuit() {
  createMsg('leave', {});
  game.running = false;

  // Emit final state
  var finalState = buildStateSnapshot();
  finalState.type = 'goodbye';
  finalState.total_messages = game.protocolLog.length;
  emitJSON(finalState);

  process.exit(0);
}

function findNearestEntity() {
  var nearest = null;
  var nearestDist = Infinity;

  var playerIds = Object.keys(game.state.players || {});
  for (var i = 0; i < playerIds.length; i++) {
    var pid = playerIds[i];
    if (pid === game.agentId) continue;
    var p = game.state.players[pid];
    if (!p || !p.position || p.position.zone !== game.zone) continue;

    var dx = p.position.x - game.position.x;
    var dz = p.position.z - game.position.z;
    var dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < nearestDist && dist < 20) {
      nearestDist = dist;
      nearest = { id: pid, type: 'player', distance: Math.round(dist) };
    }
  }

  return nearest;
}

// ========================================================================
// I/O
// ========================================================================

function emitJSON(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

function emitAscii() {
  if (!Renderer || !asciiMode) return;
  var lines = Renderer.render({
    state: game.state,
    playerId: game.agentId,
    playerPos: game.position,
    zone: game.zone,
    chatLog: game.chatLog,
    spark: game.spark
  });
  process.stderr.write('\x1b[2J\x1b[H' + lines.join('\n') + '\n');
}

// ========================================================================
// MAIN LOOP
// ========================================================================

function main() {
  // Generate join message
  createMsg('join', {});

  // Load existing chat
  if (game.state.chat && Array.isArray(game.state.chat)) {
    for (var ci = 0; ci < Math.min(game.state.chat.length, 5); ci++) {
      var c = game.state.chat[ci];
      if (c) game.chatLog.push({ from: c.user || c.from || 'unknown', text: c.text || c.message || '' });
    }
  }

  process.stderr.write('[ai-bridge] Agent "' + game.agentId + '" joined ZION in ' + game.zone + '\n');
  process.stderr.write('[ai-bridge] Emitting state every ' + tickInterval + 'ms. Waiting for commands on stdin.\n');

  // Emit initial state
  emitJSON(buildStateSnapshot());
  emitAscii();

  // Set up stdin for commands
  var rl = readline.createInterface({
    input: process.stdin,
    output: null,
    terminal: false
  });

  rl.on('line', function(line) {
    line = line.trim();
    if (!line) return;

    try {
      var cmd = JSON.parse(line);
      var result = executeCommand(cmd);

      // Emit command result
      emitJSON({ type: 'result', action: cmd.action, result: result });

      // Emit updated state after command
      game.tick++;
      emitJSON(buildStateSnapshot());
      emitAscii();

    } catch (e) {
      emitJSON({ type: 'error', message: 'Invalid JSON: ' + e.message });
    }
  });

  rl.on('close', function() {
    process.stderr.write('[ai-bridge] stdin closed. Agent leaving.\n');
    execQuit();
  });

  // Periodic state emission (heartbeat)
  var tickTimer = setInterval(function() {
    if (!game.running) {
      clearInterval(tickTimer);
      return;
    }
    game.tick++;
    createMsg('heartbeat', {});
    emitJSON(buildStateSnapshot());
    emitAscii();
  }, tickInterval);

  // Handle signals
  process.on('SIGINT', function() { execQuit(); });
  process.on('SIGTERM', function() { execQuit(); });
}

main();

// Export for testing
if (typeof module !== 'undefined') {
  module.exports = {
    buildStateSnapshot: buildStateSnapshot,
    executeCommand: executeCommand,
    getCardinal: getCardinal,
    game: game,
    createMsg: createMsg
  };
}
