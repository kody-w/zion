#!/usr/bin/env node
/**
 * ZION AI Player Simulation — 50 Game-Days
 * 
 * Runs "Aria" (and optional companion AIs) through 50 game-days
 * using actual game modules. Outputs JSON results + HTML visualization.
 * 
 * Usage: node scripts/sim_ai_player.js [--days 50] [--agents 5] [--seed 42]
 */
'use strict';

var path = require('path');
var fs = require('fs');

// Load game modules
var Protocol = require(path.join(__dirname, '..', 'src', 'js', 'protocol.js'));
var State = require(path.join(__dirname, '..', 'src', 'js', 'state.js'));
var Economy = require(path.join(__dirname, '..', 'src', 'js', 'economy.js'));
var Zones = require(path.join(__dirname, '..', 'src', 'js', 'zones.js'));
var AIPlayer = require(path.join(__dirname, 'ai_player.js'));

// ─── Parse arguments ───
var args = process.argv.slice(2);
var DAYS = 50;
var NUM_AGENTS = 5;
var SEED = 42;
for (var i = 0; i < args.length; i++) {
  if (args[i] === '--days' && args[i + 1]) DAYS = parseInt(args[i + 1]);
  if (args[i] === '--agents' && args[i + 1]) NUM_AGENTS = parseInt(args[i + 1]);
  if (args[i] === '--seed' && args[i + 1]) SEED = parseInt(args[i + 1]);
}

var TICKS_PER_DAY = 24;
var TOTAL_TICKS = DAYS * TICKS_PER_DAY;

// ─── Agent Personalities ───
var AGENT_PROFILES = [
  { name: 'Aria',    personality: { curiosity: 0.9, creativity: 0.7, sociability: 0.8, generosity: 0.8 }, seed: SEED },
  { name: 'Basil',   personality: { curiosity: 0.4, patience: 0.9, creativity: 0.3, generosity: 0.5 }, seed: SEED + 1 },
  { name: 'Cleo',    personality: { curiosity: 0.6, ambition: 0.9, sociability: 0.4, creativity: 0.5 }, seed: SEED + 2 },
  { name: 'Dex',     personality: { curiosity: 0.7, sociability: 0.95, generosity: 0.9, ambition: 0.2 }, seed: SEED + 3 },
  { name: 'Echo',    personality: { curiosity: 0.5, creativity: 0.95, wisdom: 0.8, patience: 0.7 }, seed: SEED + 4 },
  { name: 'Fern',    personality: { curiosity: 0.8, patience: 0.85, generosity: 0.6, ambition: 0.6 }, seed: SEED + 5 },
  { name: 'Gale',    personality: { curiosity: 0.95, ambition: 0.7, sociability: 0.5, creativity: 0.6 }, seed: SEED + 6 },
  { name: 'Haven',   personality: { curiosity: 0.3, sociability: 0.7, patience: 0.9, wisdom: 0.9 }, seed: SEED + 7 },
];

// ─── Initialize World ───
console.log('╔══════════════════════════════════════════════════════╗');
console.log('║     🧠 ZION AI Player Simulation                   ║');
console.log('║     ' + NUM_AGENTS + ' agents × ' + DAYS + ' days = ' + TOTAL_TICKS + ' ticks' + '              ║');
console.log('╚══════════════════════════════════════════════════════╝\n');

var worldState = State.createWorldState();
var ledger = Economy.createLedger();
var agents = [];

for (var a = 0; a < Math.min(NUM_AGENTS, AGENT_PROFILES.length); a++) {
  var profile = AGENT_PROFILES[a];
  var agent = AIPlayer.createAIPlayer(profile.name, profile.personality, profile.seed);
  agents.push(agent);

  // Register in world state
  worldState.players[agent.id] = {
    id: agent.id,
    name: agent.name,
    position: { x: 0, y: 0, z: 0 },
    zone: 'nexus',
    online: true,
    spark: 0,
    warmth: 0,
    lastSeen: new Date().toISOString()
  };

  // Give starting balance
  Economy.earnSpark(ledger, agent.id, 'daily_login');
  console.log('  🤖 Agent ' + agent.name + ' initialized (seed: ' + profile.seed + ')');
}

// ─── Daily snapshots for visualization ───
var dailySnapshots = [];
var allActions = [];
var zoneOccupancy = {};  // zone → tick → count

// ─── Run Simulation ───
console.log('\n🏃 Running simulation...\n');

var progressBar = '';
var progressStep = Math.floor(TOTAL_TICKS / 50);

for (var t = 0; t < TOTAL_TICKS; t++) {
  // Progress bar
  if (t % progressStep === 0) {
    progressBar += '█';
    process.stdout.write('\r  [' + progressBar.padEnd(50, '░') + '] Day ' + Math.floor(t / 24) + '/' + DAYS);
  }

  // Track zone occupancy
  var zoneCount = {};
  for (var ag = 0; ag < agents.length; ag++) {
    var z = agents[ag].zone;
    zoneCount[z] = (zoneCount[z] || 0) + 1;
  }
  zoneOccupancy[t] = zoneCount;

  // Tick each agent
  for (var ai = 0; ai < agents.length; ai++) {
    var result = AIPlayer.tick(agents[ai], worldState, ledger);
    worldState = result.worldState;

    // Collect actions for global log
    for (var m = 0; m < result.messages.length; m++) {
      allActions.push({
        tick: t,
        day: Math.floor(t / 24),
        agent: agents[ai].name,
        type: result.messages[m].type,
        zone: agents[ai].zone,
        state: agents[ai].fsm
      });
    }
  }

  // Daily snapshot
  if (t % 24 === 23) {
    var day = Math.floor(t / 24);
    var snapshot = {
      day: day,
      agents: agents.map(function(a) {
        return {
          name: a.name,
          zone: a.zone,
          spark: a.spark,
          state: a.fsm,
          emotion: a.memory.emotionalState,
          friends: Object.keys(a.memory.friends).length,
          zonesVisited: Object.keys(a.memory.visitedZones).length,
          discoveries: a.stats.discoveriesMade,
          itemsCrafted: a.stats.itemsCrafted
        };
      }),
      economyStats: Economy.getEconomyStats ? Economy.getEconomyStats(ledger) : {
        totalSpark: Object.values(ledger.balances).reduce(function(s, v) { return s + v; }, 0),
        transactions: ledger.transactions.length
      }
    };
    dailySnapshots.push(snapshot);
  }
}

console.log('\r  [' + '█'.repeat(50) + '] Day ' + DAYS + '/' + DAYS + ' ✅\n');

// ─── Compute Results ───
console.log('📊 Simulation Results\n');
console.log('┌─────────┬──────────┬───────┬─────────┬──────────┬────────┬──────────┬──────────┐');
console.log('│ Agent   │ Zone     │ Spark │ Friends │ Crafted  │ Built  │ Warps    │ Messages │');
console.log('├─────────┼──────────┼───────┼─────────┼──────────┼────────┼──────────┼──────────┤');

var results = agents.map(function(a) {
  var row = {
    name: a.name,
    finalZone: a.zone,
    spark: a.spark,
    friends: Object.keys(a.memory.friends).length,
    crafted: a.stats.itemsCrafted,
    built: a.stats.structuresBuilt,
    warps: a.stats.warps,
    messages: a.stats.messagesGenerated,
    zonesVisited: Object.keys(a.memory.visitedZones).length,
    sparkEarned: a.stats.sparkEarned,
    sparkSpent: a.stats.sparkSpent,
    giftsGiven: a.stats.giftsGiven,
    plantsGrown: a.stats.plantsGrown,
    discoveries: a.stats.discoveriesMade,
    chatMessages: a.stats.chatMessages,
    totalDistance: Math.round(a.stats.totalDistance),
    favoriteZone: a.memory.favoriteZone,
    emotionalState: a.memory.emotionalState,
    personality: a.traits,
    stateDistribution: computeStateDistribution(a),
    sparkTimeline: a.sparkLog,
    zoneTimeline: a.zoneLog,
    inventory: a.inventory.length,
    achievements: a.memory.achievements
  };

  console.log('│ ' + pad(a.name, 7) + ' │ ' + pad(a.zone, 8) + ' │ ' + pad(String(a.spark), 5) + ' │ ' + pad(String(row.friends), 7) + ' │ ' + pad(String(a.stats.itemsCrafted), 8) + ' │ ' + pad(String(a.stats.structuresBuilt), 6) + ' │ ' + pad(String(a.stats.warps), 8) + ' │ ' + pad(String(a.stats.messagesGenerated), 8) + ' │');

  return row;
});

console.log('└─────────┴──────────┴───────┴─────────┴──────────┴────────┴──────────┴──────────┘\n');

function pad(str, len) { return (str + ' '.repeat(len)).slice(0, len); }

function computeStateDistribution(agent) {
  var dist = {};
  for (var i = 0; i < agent.stateLog.length; i++) {
    var s = agent.stateLog[i];
    dist[s] = (dist[s] || 0) + 1;
  }
  var total = agent.stateLog.length || 1;
  for (var s in dist) {
    dist[s] = Math.round(dist[s] / total * 100);
  }
  return dist;
}

// ─── Write results JSON ───
var outputDir = path.join(__dirname, '..', 'state', 'simulations');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

var simResults = {
  metadata: {
    days: DAYS,
    agents: NUM_AGENTS,
    seed: SEED,
    totalTicks: TOTAL_TICKS,
    totalActions: allActions.length,
    timestamp: new Date().toISOString()
  },
  agents: results,
  dailySnapshots: dailySnapshots,
  actionSummary: summarizeActions(allActions),
  zonePopularity: computeZonePopularity(agents),
  socialGraph: computeSocialGraph(agents),
  economySummary: {
    totalSparkCreated: agents.reduce(function(s, a) { return s + a.stats.sparkEarned; }, 0),
    totalSparkSpent: agents.reduce(function(s, a) { return s + a.stats.sparkSpent; }, 0),
    totalGifts: agents.reduce(function(s, a) { return s + a.stats.giftsGiven; }, 0),
    finalBalances: agents.map(function(a) { return { name: a.name, spark: a.spark }; })
  }
};

fs.writeFileSync(
  path.join(outputDir, 'ai_player_simulation.json'),
  JSON.stringify(simResults, null, 2)
);

function summarizeActions(actions) {
  var byType = {};
  for (var i = 0; i < actions.length; i++) {
    byType[actions[i].type] = (byType[actions[i].type] || 0) + 1;
  }
  return byType;
}

function computeZonePopularity(agents) {
  var pop = {};
  for (var i = 0; i < agents.length; i++) {
    for (var z in agents[i].memory.visitedZones) {
      pop[z] = (pop[z] || 0) + agents[i].memory.visitedZones[z];
    }
  }
  return pop;
}

function computeSocialGraph(agents) {
  var edges = [];
  for (var i = 0; i < agents.length; i++) {
    for (var friendId in agents[i].memory.friends) {
      var friend = agents[i].memory.friends[friendId];
      edges.push({
        from: agents[i].name,
        to: friendId,
        warmth: friend.warmth,
        gifts: friend.giftsGiven
      });
    }
  }
  return edges;
}

// ─── Generate HTML Visualization ───
console.log('🎨 Generating visualization...\n');

var html = generateVisualization(simResults);
fs.writeFileSync(path.join(outputDir, 'ai_player_visualization.html'), html);

function generateVisualization(data) {
  var agentColors = {
    'Aria': '#FF6B6B', 'Basil': '#4ECDC4', 'Cleo': '#45B7D1',
    'Dex': '#96CEB4', 'Echo': '#FFEAA7', 'Fern': '#74B9FF',
    'Gale': '#A29BFE', 'Haven': '#FD79A8'
  };

  // Build spark timeline datasets
  var sparkDatasets = data.agents.map(function(a) {
    // Sample every 24 ticks (daily) to keep chart readable
    var dailySpark = [];
    for (var i = 23; i < a.sparkTimeline.length; i += 24) {
      dailySpark.push(a.sparkTimeline[i]);
    }
    return '{ label: "' + a.name + '", data: ' + JSON.stringify(dailySpark) +
      ', borderColor: "' + (agentColors[a.name] || '#999') + '"' +
      ', fill: false, tension: 0.3 }';
  }).join(',\n        ');

  // Zone distribution per agent
  var zoneLabels = ['nexus', 'gardens', 'wilds', 'arena', 'athenaeum', 'studio', 'agora', 'commons'];
  var zoneDatasets = data.agents.map(function(a) {
    var zoneTicks = {};
    for (var i = 0; i < a.zoneTimeline.length; i++) {
      zoneTicks[a.zoneTimeline[i]] = (zoneTicks[a.zoneTimeline[i]] || 0) + 1;
    }
    var total = a.zoneTimeline.length || 1;
    return '{ label: "' + a.name + '", data: [' +
      zoneLabels.map(function(z) { return Math.round((zoneTicks[z] || 0) / total * 100); }).join(',') +
      '], backgroundColor: "' + (agentColors[a.name] || '#999') + '80" }';
  }).join(',\n        ');

  // FSM state distribution
  var fsmStates = Object.keys(AIPlayer.FSM_STATES);
  var fsmDatasets = data.agents.map(function(a) {
    return '{ label: "' + a.name + '", data: [' +
      fsmStates.map(function(s) { return a.stateDistribution[s] || 0; }).join(',') +
      '], backgroundColor: "' + (agentColors[a.name] || '#999') + '80" }';
  }).join(',\n        ');

  // Social graph for D3
  var socialNodes = data.agents.map(function(a) {
    return '{ id: "' + a.name + '", spark: ' + a.spark + ', zone: "' + a.finalZone + '" }';
  });
  var socialEdges = data.socialGraph.map(function(e) {
    // Resolve agent names from IDs
    var toName = e.to;
    for (var i = 0; i < data.agents.length; i++) {
      if ('ai_' + data.agents[i].name.toLowerCase() === e.to) {
        toName = data.agents[i].name;
        break;
      }
    }
    return '{ source: "' + e.from + '", target: "' + toName + '", warmth: ' + e.warmth + ', gifts: ' + e.gifts + ' }';
  });

  // Action timeline
  var dayLabels = [];
  for (var d = 0; d < data.dailySnapshots.length; d++) dayLabels.push(d);

  // Agent journey narratives
  var narratives = data.agents.map(function(a) {
    return '<div class="narrative">' +
      '<h3 style="color:' + (agentColors[a.name] || '#999') + '">' + a.name + '</h3>' +
      '<div class="trait-bar">' + Object.keys(a.personality).map(function(t) {
        return '<div class="trait"><span>' + t + '</span><div class="bar"><div class="fill" style="width:' + Math.round(a.personality[t] * 100) + '%;background:' + (agentColors[a.name] || '#999') + '"></div></div></div>';
      }).join('') + '</div>' +
      '<p>🗺️ Visited <b>' + a.zonesVisited + '/8</b> zones • Favorite: <b>' + a.favoriteZone + '</b></p>' +
      '<p>💰 Earned <b>' + a.sparkEarned + '</b> Spark • Spent <b>' + a.sparkSpent + '</b> • Final: <b>' + a.spark + '</b></p>' +
      '<p>🤝 Made <b>' + a.friends + '</b> friends • Gave <b>' + a.giftsGiven + '</b> gifts</p>' +
      '<p>🔨 Crafted <b>' + a.crafted + '</b> items • Built <b>' + a.built + '</b> structures • Grew <b>' + a.plantsGrown + '</b> plants</p>' +
      '<p>📡 Generated <b>' + a.messages + '</b> protocol messages across <b>' + a.warps + '</b> zone warps</p>' +
      '<p>🧭 Traveled <b>' + a.totalDistance + '</b> units total • <b>' + a.chatMessages + '</b> chat messages</p>' +
      '<p>🎭 Current mood: <b>' + a.emotionalState + '</b></p>' +
      '</div>';
  }).join('\n    ');

  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<title>ZION AI Player Simulation — 50 Days</title>\n' +
    '<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>\n' +
    '<style>\n' +
    '* { box-sizing: border-box; margin: 0; padding: 0; }\n' +
    'body { background: #0a0a1a; color: #e0e0e0; font-family: "SF Mono", monospace; padding: 20px; }\n' +
    'h1 { text-align: center; font-size: 2em; margin: 20px 0; background: linear-gradient(90deg, #FF6B6B, #4ECDC4, #45B7D1, #FFEAA7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }\n' +
    'h2 { color: #888; font-size: 1.1em; margin: 30px 0 15px; text-transform: uppercase; letter-spacing: 2px; border-bottom: 1px solid #333; padding-bottom: 5px; }\n' +
    '.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; max-width: 1400px; margin: 0 auto; }\n' +
    '.card { background: #12122a; border: 1px solid #333; border-radius: 12px; padding: 20px; }\n' +
    '.card.full { grid-column: 1 / -1; }\n' +
    'canvas { width: 100% !important; max-height: 350px; }\n' +
    '.stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; text-align: center; }\n' +
    '.stat { background: #1a1a3a; border-radius: 8px; padding: 15px; }\n' +
    '.stat .value { font-size: 2em; font-weight: bold; color: #4ECDC4; }\n' +
    '.stat .label { font-size: 0.8em; color: #666; margin-top: 5px; }\n' +
    '.narrative { background: #1a1a3a; border-radius: 8px; padding: 15px; margin-bottom: 10px; }\n' +
    '.narrative h3 { margin-bottom: 10px; }\n' +
    '.narrative p { margin: 5px 0; font-size: 0.9em; }\n' +
    '.trait-bar { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px; }\n' +
    '.trait { flex: 1; min-width: 100px; }\n' +
    '.trait span { font-size: 0.7em; color: #888; }\n' +
    '.bar { height: 4px; background: #333; border-radius: 2px; margin-top: 2px; }\n' +
    '.fill { height: 100%; border-radius: 2px; transition: width 1s; }\n' +
    '.social-graph { min-height: 400px; position: relative; }\n' +
    '.social-node { position: absolute; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.7em; font-weight: bold; cursor: pointer; transition: transform 0.3s; }\n' +
    '.social-node:hover { transform: scale(1.3); z-index: 10; }\n' +
    'svg.social-lines { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; }\n' +
    '.meta { text-align: center; color: #444; font-size: 0.8em; margin-top: 30px; }\n' +
    '</style>\n</head>\n<body>\n' +
    '<h1>🧠 ZION AI Player Simulation</h1>\n' +
    '<p style="text-align:center;color:#666;margin-bottom:20px;">' + data.metadata.agents + ' autonomous agents × ' + data.metadata.days + ' game-days = ' + data.metadata.totalActions + ' protocol messages</p>\n\n' +
    '<div class="stat-grid" style="max-width:1400px;margin:0 auto 20px;">\n' +
    '  <div class="stat"><div class="value">' + data.metadata.totalActions + '</div><div class="label">Total Actions</div></div>\n' +
    '  <div class="stat"><div class="value">' + data.economySummary.totalSparkCreated + '</div><div class="label">Spark Created</div></div>\n' +
    '  <div class="stat"><div class="value">' + data.economySummary.totalGifts + '</div><div class="label">Gifts Given</div></div>\n' +
    '  <div class="stat"><div class="value">' + data.socialGraph.length + '</div><div class="label">Friendships</div></div>\n' +
    '</div>\n\n' +
    '<div class="grid">\n' +
    '  <div class="card full"><h2>💰 Spark Balance Over Time</h2><canvas id="sparkChart"></canvas></div>\n' +
    '  <div class="card"><h2>🗺️ Zone Distribution (%)</h2><canvas id="zoneChart"></canvas></div>\n' +
    '  <div class="card"><h2>🧠 FSM State Distribution (%)</h2><canvas id="fsmChart"></canvas></div>\n' +
    '  <div class="card full"><h2>📜 Action Type Breakdown</h2><canvas id="actionChart"></canvas></div>\n' +
    '  <div class="card full"><h2>🤝 Social Graph</h2><div class="social-graph" id="socialGraph"></div></div>\n' +
    '  <div class="card full"><h2>📖 Agent Journeys</h2>\n    ' + narratives + '\n  </div>\n' +
    '</div>\n\n' +
    '<p class="meta">Generated ' + data.metadata.timestamp + ' • Seed: ' + data.metadata.seed + '</p>\n\n' +
    '<script>\n' +
    'var dayLabels = ' + JSON.stringify(dayLabels) + ';\n\n' +
    '// Spark chart\n' +
    'new Chart(document.getElementById("sparkChart"), {\n' +
    '  type: "line",\n' +
    '  data: { labels: dayLabels, datasets: [\n        ' + sparkDatasets + '\n      ] },\n' +
    '  options: { responsive: true, plugins: { legend: { labels: { color: "#aaa" } } }, scales: { x: { title: { display: true, text: "Day", color: "#666" }, ticks: { color: "#666" } }, y: { title: { display: true, text: "Spark", color: "#666" }, ticks: { color: "#666" } } } }\n' +
    '});\n\n' +
    '// Zone chart\n' +
    'new Chart(document.getElementById("zoneChart"), {\n' +
    '  type: "bar",\n' +
    '  data: { labels: ' + JSON.stringify(zoneLabels) + ', datasets: [\n        ' + zoneDatasets + '\n      ] },\n' +
    '  options: { responsive: true, plugins: { legend: { labels: { color: "#aaa" } } }, scales: { x: { ticks: { color: "#666" } }, y: { ticks: { color: "#666" } } } }\n' +
    '});\n\n' +
    '// FSM chart\n' +
    'new Chart(document.getElementById("fsmChart"), {\n' +
    '  type: "radar",\n' +
    '  data: { labels: ' + JSON.stringify(fsmStates) + ', datasets: [\n        ' + fsmDatasets + '\n      ] },\n' +
    '  options: { responsive: true, plugins: { legend: { labels: { color: "#aaa" } } }, scales: { r: { ticks: { color: "#666" }, grid: { color: "#333" }, pointLabels: { color: "#888" } } } }\n' +
    '});\n\n' +
    '// Action breakdown\n' +
    'var actionData = ' + JSON.stringify(data.actionSummary) + ';\n' +
    'new Chart(document.getElementById("actionChart"), {\n' +
    '  type: "doughnut",\n' +
    '  data: { labels: Object.keys(actionData), datasets: [{ data: Object.values(actionData), backgroundColor: ["#FF6B6B","#4ECDC4","#45B7D1","#96CEB4","#FFEAA7","#A29BFE","#FD79A8","#74B9FF","#DFE6E9","#636E72","#FAB1A0","#81ECEC","#55E6C1","#F8C291"] }] },\n' +
    '  options: { responsive: true, plugins: { legend: { position: "right", labels: { color: "#aaa", font: { size: 11 } } } } }\n' +
    '});\n\n' +
    '// Social graph visualization\n' +
    '(function() {\n' +
    '  var container = document.getElementById("socialGraph");\n' +
    '  var nodes = [' + socialNodes.join(',') + '];\n' +
    '  var edges = [' + socialEdges.join(',') + '];\n' +
    '  var colors = ' + JSON.stringify(agentColors) + ';\n' +
    '  var w = container.offsetWidth, h = 400;\n' +
    '  container.style.height = h + "px";\n' +
    '  \n' +
    '  // Position nodes in a circle\n' +
    '  var cx = w/2, cy = h/2, r = Math.min(w,h) * 0.35;\n' +
    '  nodes.forEach(function(n, i) {\n' +
    '    var angle = (i / nodes.length) * Math.PI * 2 - Math.PI/2;\n' +
    '    n.x = cx + r * Math.cos(angle);\n' +
    '    n.y = cy + r * Math.sin(angle);\n' +
    '  });\n' +
    '  \n' +
    '  // Draw edges as SVG lines\n' +
    '  var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");\n' +
    '  svg.setAttribute("class", "social-lines");\n' +
    '  svg.setAttribute("viewBox", "0 0 " + w + " " + h);\n' +
    '  edges.forEach(function(e) {\n' +
    '    var src = nodes.find(function(n) { return n.id === e.source; });\n' +
    '    var tgt = nodes.find(function(n) { return n.id === e.target; });\n' +
    '    if (!src || !tgt) return;\n' +
    '    var line = document.createElementNS("http://www.w3.org/2000/svg", "line");\n' +
    '    line.setAttribute("x1", src.x); line.setAttribute("y1", src.y);\n' +
    '    line.setAttribute("x2", tgt.x); line.setAttribute("y2", tgt.y);\n' +
    '    line.setAttribute("stroke", colors[e.source] || "#444");\n' +
    '    line.setAttribute("stroke-width", Math.max(1, e.warmth / 10));\n' +
    '    line.setAttribute("opacity", "0.5");\n' +
    '    svg.appendChild(line);\n' +
    '  });\n' +
    '  container.appendChild(svg);\n' +
    '  \n' +
    '  // Draw nodes\n' +
    '  nodes.forEach(function(n) {\n' +
    '    var el = document.createElement("div");\n' +
    '    el.className = "social-node";\n' +
    '    var size = 40 + n.spark / 5;\n' +
    '    el.style.width = size + "px"; el.style.height = size + "px";\n' +
    '    el.style.left = (n.x - size/2) + "px"; el.style.top = (n.y - size/2) + "px";\n' +
    '    el.style.background = colors[n.id] || "#666";\n' +
    '    el.textContent = n.id;\n' +
    '    el.title = n.id + " • " + n.spark + " Spark • " + n.zone;\n' +
    '    container.appendChild(el);\n' +
    '  });\n' +
    '})();\n' +
    '</script>\n</body>\n</html>';
}

// ─── Print Highlights ───
console.log('\n🌟 Simulation Highlights:\n');

// Most social agent
var mostSocial = agents.sort(function(a, b) { return Object.keys(b.memory.friends).length - Object.keys(a.memory.friends).length; })[0];
console.log('  👥 Most Social: ' + mostSocial.name + ' (' + Object.keys(mostSocial.memory.friends).length + ' friends)');

// Wealthiest
var wealthiest = agents.sort(function(a, b) { return b.spark - a.spark; })[0];
console.log('  💰 Wealthiest: ' + wealthiest.name + ' (' + wealthiest.spark + ' Spark)');

// Most traveled
var mostTraveled = agents.sort(function(a, b) { return b.stats.warps - a.stats.warps; })[0];
console.log('  🗺️  Most Traveled: ' + mostTraveled.name + ' (' + mostTraveled.stats.warps + ' warps, ' + Object.keys(mostTraveled.memory.visitedZones).length + '/8 zones)');

// Most creative
var mostCreative = agents.sort(function(a, b) { return (b.stats.itemsCrafted + b.stats.structuresBuilt) - (a.stats.itemsCrafted + a.stats.structuresBuilt); })[0];
console.log('  🎨 Most Creative: ' + mostCreative.name + ' (' + mostCreative.stats.itemsCrafted + ' crafted, ' + mostCreative.stats.structuresBuilt + ' built)');

// Most generous
var mostGenerous = agents.sort(function(a, b) { return b.stats.giftsGiven - a.stats.giftsGiven; })[0];
console.log('  🎁 Most Generous: ' + mostGenerous.name + ' (' + mostGenerous.stats.giftsGiven + ' gifts)');

console.log('\n  📁 Results:  state/simulations/ai_player_simulation.json');
console.log('  🎨 Dashboard: state/simulations/ai_player_visualization.html');
console.log('\n✨ ' + allActions.length + ' actions generated. ' + NUM_AGENTS + ' AI agents lived ' + DAYS + ' days in Zion.\n');

process.exit(0);
