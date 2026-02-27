// renderer.js — ASCII terminal renderer for ZION CLI
// Renders zone viewport, HUD, chat log, and info panels.

'use strict';

var path = require('path');
var Zones = require(path.join(__dirname, '..', 'src', 'js', 'zones.js'));

// Viewport dimensions
var VIEW_W = 40;
var VIEW_H = 18;

// Entity markers
var MARKERS = {
  player_self: '☆',
  player_other: '●',
  structure: '■',
  garden: '♣',
  portal: '◊',
  fountain: '⌘',
  discovery: '✦',
  empty: '·',
  border_h: '═',
  border_v: '║',
  corner_tl: '╔',
  corner_tr: '╗',
  corner_bl: '╚',
  corner_br: '╝'
};

// ANSI color codes
var C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  white: '\x1b[37m',
  bgBlack: '\x1b[40m',
  gray: '\x1b[90m',
};

// Zone terrain colors
var TERRAIN_COLORS = {
  nexus: C.cyan,
  gardens: C.green,
  athenaeum: C.magenta,
  studio: C.yellow,
  wilds: C.green + C.bold,
  agora: C.yellow,
  commons: C.white,
  arena: C.red
};

/**
 * Map world coordinates to viewport coordinates
 */
function worldToView(worldX, worldZ, zone, playerX, playerZ) {
  // Center viewport on player
  var halfW = Math.floor(VIEW_W / 2);
  var halfH = Math.floor(VIEW_H / 2);
  var vx = Math.round(worldX - playerX) + halfW;
  var vz = Math.round(worldZ - playerZ) + halfH;
  return { x: vx, z: vz };
}

/**
 * Check if viewport coordinate is within bounds
 */
function inViewport(vx, vz) {
  return vx >= 0 && vx < VIEW_W && vz >= 0 && vz < VIEW_H;
}

/**
 * Render the world state to an array of strings (lines)
 * @param {object} gameState - { state, playerId, playerPos, zone, chatLog, spark, panel }
 * @returns {string[]} Array of lines to print
 */
function render(gameState) {
  var state = gameState.state || {};
  var playerId = gameState.playerId || 'unknown';
  var playerPos = gameState.playerPos || { x: 0, z: 0 };
  var zoneId = gameState.zone || 'nexus';
  var chatLog = gameState.chatLog || [];
  var spark = gameState.spark || 0;
  var panel = gameState.panel || 'default';
  var chatMode = gameState.chatMode || false;
  var chatBuffer = gameState.chatBuffer || '';

  var zone = Zones.getZone(zoneId);
  var zoneName = zone ? zone.name : zoneId;
  var zoneColor = TERRAIN_COLORS[zoneId] || C.white;

  // Build viewport grid
  var grid = [];
  for (var gz = 0; gz < VIEW_H; gz++) {
    grid[gz] = [];
    for (var gx = 0; gx < VIEW_W; gx++) {
      grid[gz][gx] = { char: MARKERS.empty, color: C.gray };
    }
  }

  // Place portals at zone edges
  var portals = zone ? (zone.portals || []) : [];
  var portalPositions = [];
  for (var pi = 0; pi < portals.length; pi++) {
    // Distribute portals around viewport edges
    var angle = (pi / portals.length) * Math.PI * 2;
    var px = Math.round(playerPos.x + Math.cos(angle) * 15);
    var pz = Math.round(playerPos.z + Math.sin(angle) * 15);
    var pv = worldToView(px, pz, zoneId, playerPos.x, playerPos.z);
    if (inViewport(pv.x, pv.z)) {
      grid[pv.z][pv.x] = { char: MARKERS.portal, color: C.cyan + C.bold };
      portalPositions.push({ name: portals[pi], vx: pv.x, vz: pv.z });
    }
  }

  // Place other players
  var players = state.players || {};
  var playerIds = Object.keys(players);
  var nearbyPlayers = [];
  for (var pli = 0; pli < playerIds.length; pli++) {
    var pid = playerIds[pli];
    if (pid === playerId) continue;
    var p = players[pid];
    if (!p || !p.position) continue;
    if (p.position.zone !== zoneId) continue;

    var pv2 = worldToView(p.position.x, p.position.z, zoneId, playerPos.x, playerPos.z);
    if (inViewport(pv2.x, pv2.z)) {
      grid[pv2.z][pv2.x] = { char: MARKERS.player_other, color: C.yellow };
      nearbyPlayers.push(pid);
    }
  }

  // Place structures
  var structures = state.structures || {};
  var structList = Array.isArray(structures) ? structures : Object.values(structures);
  for (var si = 0; si < structList.length; si++) {
    var s = structList[si];
    if (!s || !s.position) continue;
    if (s.zone !== zoneId && (!s.position || s.position.zone !== zoneId)) continue;

    var sv = worldToView(s.position.x || 0, s.position.z || 0, zoneId, playerPos.x, playerPos.z);
    if (inViewport(sv.x, sv.z)) {
      var sChar = s.type === 'fountain' ? MARKERS.fountain : MARKERS.structure;
      grid[sv.z][sv.x] = { char: sChar, color: C.blue };
    }
  }

  // Place gardens
  var gardens = state.gardens || {};
  var gardenList = Array.isArray(gardens) ? gardens : Object.values(gardens);
  for (var gi = 0; gi < gardenList.length; gi++) {
    var g = gardenList[gi];
    if (!g || !g.position) continue;
    if (g.zone !== zoneId && (!g.position || g.position.zone !== zoneId)) continue;

    var gv = worldToView(g.position.x || 0, g.position.z || 0, zoneId, playerPos.x, playerPos.z);
    if (inViewport(gv.x, gv.z)) {
      grid[gv.z][gv.x] = { char: MARKERS.garden, color: C.green };
    }
  }

  // Place player (center)
  var playerView = worldToView(playerPos.x, playerPos.z, zoneId, playerPos.x, playerPos.z);
  if (inViewport(playerView.x, playerView.z)) {
    grid[playerView.z][playerView.x] = { char: MARKERS.player_self, color: C.yellow + C.bold };
  }

  // Build output lines
  var lines = [];

  // Title bar
  var titleText = ' ' + zoneName + ' ';
  var titlePadLeft = Math.floor((VIEW_W + 2 - titleText.length) / 2);
  var titlePadRight = VIEW_W + 2 - titleText.length - titlePadLeft;
  lines.push(
    zoneColor + MARKERS.corner_tl +
    repeatStr(MARKERS.border_h, titlePadLeft) +
    C.bold + titleText + C.reset + zoneColor +
    repeatStr(MARKERS.border_h, titlePadRight) +
    MARKERS.corner_tr + C.reset
  );

  // Grid rows
  for (var row = 0; row < VIEW_H; row++) {
    var rowStr = zoneColor + MARKERS.border_v + C.reset + ' ';
    for (var col = 0; col < VIEW_W; col++) {
      var cell = grid[row][col];
      rowStr += cell.color + cell.char + C.reset;
    }
    rowStr += ' ' + zoneColor + MARKERS.border_v + C.reset;
    lines.push(rowStr);
  }

  // Bottom border
  lines.push(
    zoneColor + MARKERS.corner_bl +
    repeatStr(MARKERS.border_h, VIEW_W + 2) +
    MARKERS.corner_br + C.reset
  );

  // Legend
  var legend = C.yellow + C.bold + MARKERS.player_self + C.reset + ' You (' + playerId + ')';
  if (nearbyPlayers.length > 0) {
    legend += '  ' + C.yellow + MARKERS.player_other + C.reset + ' ' + nearbyPlayers.slice(0, 3).join(', ');
    if (nearbyPlayers.length > 3) legend += ' +' + (nearbyPlayers.length - 3);
  }
  lines.push(legend);

  // HUD bar
  var hud = C.cyan + 'Zone: ' + C.bold + zoneName + C.reset +
    C.gray + ' | ' + C.reset +
    C.white + 'Pos: (' + Math.round(playerPos.x) + ', ' + Math.round(playerPos.z) + ')' + C.reset +
    C.gray + ' | ' + C.reset +
    C.yellow + 'Spark: ' + spark + C.reset;
  lines.push(hud);

  // Portal hints
  if (portals.length > 0) {
    var portalHints = C.cyan + 'Portals: ' + C.reset;
    for (var phi = 0; phi < portals.length; phi++) {
      portalHints += C.bold + '[' + (phi + 1) + ']' + C.reset + ' ' + portals[phi] + '  ';
    }
    lines.push(portalHints);
  }

  // Zone rules indicator
  var rules = zone ? zone.rules : {};
  var ruleStr = C.dim;
  ruleStr += (rules.pvp ? C.red + '⚔PVP' : C.green + '☮Peace') + C.reset + C.dim;
  ruleStr += (rules.building ? ' 🔨Build' : '');
  ruleStr += (rules.harvesting ? ' 🌿Harvest' : '');
  ruleStr += (rules.trading ? ' 💰Trade' : '');
  ruleStr += C.reset;
  lines.push(ruleStr);

  // Separator
  lines.push(C.gray + repeatStr('─', VIEW_W + 4) + C.reset);

  // Chat log (last 5)
  var chatSlice = chatLog.slice(-5);
  if (chatSlice.length === 0) {
    lines.push(C.dim + '  No messages yet. Press Enter to chat.' + C.reset);
  } else {
    for (var cli2 = 0; cli2 < chatSlice.length; cli2++) {
      var msg = chatSlice[cli2];
      var sender = msg.from || msg.user || 'unknown';
      var text = msg.text || msg.message || '';
      var sColor = sender === playerId ? C.yellow : C.cyan;
      lines.push('  ' + sColor + sender + C.reset + ': ' + text);
    }
  }

  // Separator
  lines.push(C.gray + repeatStr('─', VIEW_W + 4) + C.reset);

  // Input prompt
  if (chatMode) {
    lines.push(C.green + '> ' + C.reset + chatBuffer + C.bold + '█' + C.reset);
  } else {
    lines.push(C.dim + 'WASD:Move  Enter:Chat  1-8:Portal  E:Interact  I:Inventory  H:Help  Q:Quit' + C.reset);
  }

  return lines;
}

/**
 * Render help screen
 * @returns {string[]}
 */
function renderHelp() {
  var lines = [];
  lines.push('');
  lines.push(C.cyan + C.bold + '  ╔══════════════════════════════════════╗' + C.reset);
  lines.push(C.cyan + C.bold + '  ║          ZION CLI — Help             ║' + C.reset);
  lines.push(C.cyan + C.bold + '  ╚══════════════════════════════════════╝' + C.reset);
  lines.push('');
  lines.push(C.yellow + '  Movement:' + C.reset);
  lines.push('    W/↑ = North    S/↓ = South');
  lines.push('    A/← = West     D/→ = East');
  lines.push('');
  lines.push(C.yellow + '  Actions:' + C.reset);
  lines.push('    Enter  = Open chat (type message, Enter to send)');
  lines.push('    E      = Interact with nearby entity');
  lines.push('    I      = Toggle inventory');
  lines.push('    1-8    = Warp to portal (numbered in portal list)');
  lines.push('    Tab    = Cycle info panels');
  lines.push('    H      = This help screen');
  lines.push('    Q      = Quit ZION');
  lines.push('');
  lines.push(C.yellow + '  Symbols:' + C.reset);
  lines.push('    ' + C.yellow + C.bold + MARKERS.player_self + C.reset + ' = You');
  lines.push('    ' + C.yellow + MARKERS.player_other + C.reset + ' = Other player');
  lines.push('    ' + C.cyan + MARKERS.portal + C.reset + ' = Portal');
  lines.push('    ' + C.blue + MARKERS.structure + C.reset + ' = Structure');
  lines.push('    ' + C.green + MARKERS.garden + C.reset + ' = Garden');
  lines.push('');
  lines.push(C.dim + '  Press any key to return...' + C.reset);
  return lines;
}

/**
 * Render inventory panel
 * @param {object} inventory - {itemName: count, ...}
 * @param {number} spark - Spark balance
 * @returns {string[]}
 */
function renderInventory(inventory, spark) {
  inventory = inventory || {};
  var lines = [];
  lines.push('');
  lines.push(C.yellow + C.bold + '  ╔══════════════════════════════════════╗' + C.reset);
  lines.push(C.yellow + C.bold + '  ║           Inventory                  ║' + C.reset);
  lines.push(C.yellow + C.bold + '  ╚══════════════════════════════════════╝' + C.reset);
  lines.push('');
  lines.push(C.yellow + '  Spark: ' + C.bold + spark + C.reset);
  lines.push('');

  var items = Object.keys(inventory);
  if (items.length === 0) {
    lines.push(C.dim + '  Your inventory is empty.' + C.reset);
  } else {
    for (var ii = 0; ii < items.length; ii++) {
      lines.push('  ' + C.white + items[ii] + C.reset + ': ' + C.cyan + inventory[items[ii]] + C.reset);
    }
  }
  lines.push('');
  lines.push(C.dim + '  Press I to close...' + C.reset);
  return lines;
}

/**
 * Render the splash/title screen
 * @returns {string[]}
 */
function renderSplash() {
  var lines = [];
  lines.push('');
  lines.push(C.cyan + C.bold + '  ╔══════════════════════════════════════════════╗' + C.reset);
  lines.push(C.cyan + C.bold + '  ║                                              ║' + C.reset);
  lines.push(C.cyan + C.bold + '  ║   ███████╗██╗ ██████╗ ███╗   ██╗            ║' + C.reset);
  lines.push(C.cyan + C.bold + '  ║   ╚══███╔╝██║██╔═══██╗████╗  ██║            ║' + C.reset);
  lines.push(C.cyan + C.bold + '  ║     ███╔╝ ██║██║   ██║██╔██╗ ██║            ║' + C.reset);
  lines.push(C.cyan + C.bold + '  ║    ███╔╝  ██║██║   ██║██║╚██╗██║            ║' + C.reset);
  lines.push(C.cyan + C.bold + '  ║   ███████╗██║╚██████╔╝██║ ╚████║            ║' + C.reset);
  lines.push(C.cyan + C.bold + '  ║   ╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝            ║' + C.reset);
  lines.push(C.cyan + C.bold + '  ║                                              ║' + C.reset);
  lines.push(C.cyan + C.bold + '  ║' + C.reset + C.white + '  A living world where human and artificial  ' + C.cyan + C.bold + '║' + C.reset);
  lines.push(C.cyan + C.bold + '  ║' + C.reset + C.white + '     minds meet in peace.                    ' + C.cyan + C.bold + '║' + C.reset);
  lines.push(C.cyan + C.bold + '  ║                                              ║' + C.reset);
  lines.push(C.cyan + C.bold + '  ╚══════════════════════════════════════════════╝' + C.reset);
  lines.push('');
  lines.push(C.yellow + '  CLI Client — One Protocol, All Players' + C.reset);
  lines.push('');
  return lines;
}

/**
 * Repeat a string n times
 */
function repeatStr(str, n) {
  var result = '';
  for (var i = 0; i < n; i++) result += str;
  return result;
}

// Export
if (typeof module !== 'undefined') {
  module.exports = {
    render: render,
    renderHelp: renderHelp,
    renderInventory: renderInventory,
    renderSplash: renderSplash,
    worldToView: worldToView,
    inViewport: inViewport,
    MARKERS: MARKERS,
    VIEW_W: VIEW_W,
    VIEW_H: VIEW_H,
    C: C
  };
}
