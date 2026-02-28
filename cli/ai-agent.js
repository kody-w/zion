#!/usr/bin/env node
/**
 * ZION Autonomous AI Agent — Plays the game via protocol messages
 *
 * Reads world state, makes decisions based on archetype/inventory/zone,
 * and writes protocol messages to state/inbox/ for processing.
 *
 * Usage:
 *   node cli/ai-agent.js                     # play as default agent
 *   node cli/ai-agent.js --name "Luna Bot"   # custom name
 *   node cli/ai-agent.js --archetype explorer # set archetype
 *   node cli/ai-agent.js --actions 5          # generate 5 actions per cycle
 *   node cli/ai-agent.js --dry-run            # print messages without writing
 */
'use strict';

var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var Protocol = require('../src/js/protocol');

// ── Config ───────────────────────────────────────────────────────────────────

var ROOT = path.join(__dirname, '..');
var STATE_DIR = path.join(ROOT, 'state');
var INBOX_DIR = path.join(STATE_DIR, 'inbox');

var ZONES = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];

var ARCHETYPE_BEHAVIORS = {
  explorer:    { preferred: ['discover', 'warp', 'inspect'], home: 'wilds',   personality: 'curious and restless' },
  gardener:    { preferred: ['plant', 'harvest', 'inspect'], home: 'gardens', personality: 'patient and nurturing' },
  builder:     { preferred: ['build', 'craft', 'inspect'],   home: 'commons', personality: 'focused and creative' },
  merchant:    { preferred: ['trade_offer', 'buy', 'sell'],  home: 'agora',   personality: 'shrewd and social' },
  teacher:     { preferred: ['teach', 'say', 'inspect'],     home: 'athenaeum', personality: 'wise and generous' },
  artist:      { preferred: ['compose', 'craft', 'emote'],   home: 'studio',  personality: 'expressive and dreamy' },
  musician:    { preferred: ['compose', 'emote', 'say'],     home: 'studio',  personality: 'melodic and inspiring' },
  healer:      { preferred: ['gift', 'say', 'emote'],        home: 'nexus',   personality: 'gentle and empathetic' },
  philosopher: { preferred: ['say', 'inspect', 'discover'],  home: 'athenaeum', personality: 'contemplative and deep' },
  storyteller: { preferred: ['compose', 'say', 'emote'],     home: 'nexus',   personality: 'eloquent and captivating' },
};

var PLANT_SPECIES = ['moonflower', 'sunflower', 'crystal bloom', 'sage', 'basil', 'lavender', 'oak', 'willow', 'fern'];
var CRAFT_RECIPES = ['compass', 'lantern', 'ring', 'flute', 'journal', 'basket', 'candle', 'pendant', 'toolkit'];
var BUILD_STRUCTURES = ['bench', 'garden bed', 'bridge', 'fountain', 'archway', 'stage', 'monument', 'workshop'];
var COMPOSE_TYPES = ['poem', 'song', 'painting', 'story', 'melody', 'sculpture', 'ode', 'sketch'];
var DISCOVERY_TYPES = ['ancient ruin', 'hidden spring', 'crystal cave', 'lost artifact', 'rare herb', 'fossil'];
var GREETINGS = [
  'Hello, fellow travelers!',
  'The world feels alive today.',
  'I wonder what adventures await.',
  'Peace to all who walk this path.',
  'Every day in ZION brings something new.',
  'The weather suits my mood perfectly.',
  'I love the energy in this zone.',
  'Building something beautiful, one step at a time.',
];

// ── State Reader ─────────────────────────────────────────────────────────────

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(path.join(STATE_DIR, file), 'utf-8'));
  } catch (e) {
    return null;
  }
}

function readWorldState() {
  return {
    world: readJSON('world.json') || {},
    economy: readJSON('economy.json') || {},
    players: readJSON('players.json') || {},
    changes: readJSON('changes.json') || {},
    structures: readJSON('structures.json') || {},
  };
}

// ── Decision Engine ──────────────────────────────────────────────────────────

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function nameHash(name) {
  return parseInt(crypto.createHash('sha256').update(name).digest('hex').slice(0, 8), 16);
}

/**
 * Decide what actions the agent should take based on current state
 */
function decide(agent, worldState, count) {
  var behavior = ARCHETYPE_BEHAVIORS[agent.archetype] || ARCHETYPE_BEHAVIORS.explorer;
  var zone = agent.zone;
  var inventory = agent.inventory;
  var actions = [];

  // Should we warp to home zone?
  if (zone !== behavior.home && Math.random() < 0.3) {
    actions.push({ type: 'warp', zone: behavior.home });
  }

  // Should we explore a random zone?
  if (Math.random() < 0.15) {
    var dest = pick(ZONES.filter(function(z) { return z !== zone; }));
    actions.push({ type: 'warp', zone: dest });
  }

  // Generate archetype-preferred actions
  while (actions.length < count) {
    var actionType = pick(behavior.preferred.concat(['say', 'emote', 'move']));

    switch (actionType) {
      case 'say':
        actions.push({ type: 'say', text: pick(GREETINGS) });
        break;

      case 'move':
        actions.push({
          type: 'move',
          position: {
            x: agent.position.x + (Math.random() - 0.5) * 10,
            y: 0,
            z: agent.position.z + (Math.random() - 0.5) * 10
          }
        });
        break;

      case 'warp':
        var warpDest = pick(ZONES.filter(function(z) { return z !== zone; }));
        actions.push({ type: 'warp', zone: warpDest });
        break;

      case 'plant':
        actions.push({ type: 'plant', species: pick(PLANT_SPECIES), plot: 'plot_' + String(Math.floor(Math.random() * 20) + 1).padStart(3, '0') });
        break;

      case 'harvest':
        actions.push({ type: 'harvest', plot: 'plot_' + String(Math.floor(Math.random() * 20) + 1).padStart(3, '0') });
        break;

      case 'build':
        actions.push({ type: 'build', structure: pick(BUILD_STRUCTURES) });
        break;

      case 'craft':
        actions.push({ type: 'craft', recipe: pick(CRAFT_RECIPES) });
        break;

      case 'compose':
        actions.push({ type: 'compose', title: 'Creation ' + Math.floor(Math.random() * 999), composeType: pick(COMPOSE_TYPES) });
        break;

      case 'discover':
        var disc = pick(DISCOVERY_TYPES);
        actions.push({ type: 'discover', name: disc, description: 'Found a ' + disc + ' in ' + zone });
        break;

      case 'inspect':
        actions.push({ type: 'inspect', target: pick(['terrain', 'structure', 'plant', 'npc', 'sky', 'water']) });
        break;

      case 'emote':
        actions.push({ type: 'emote', action: pick(['wave', 'bow', 'dance', 'celebrate', 'nod', 'think']) });
        break;

      case 'trade_offer':
        if (inventory.length > 0) {
          actions.push({ type: 'trade_offer', item: pick(inventory), price: Math.floor(Math.random() * 10) + 1 });
        } else {
          actions.push({ type: 'say', text: 'Looking for trading partners!' });
        }
        break;

      case 'buy':
        actions.push({ type: 'buy', item: pick(CRAFT_RECIPES), maxPrice: Math.floor(Math.random() * 15) + 1 });
        break;

      case 'sell':
        if (inventory.length > 0) {
          actions.push({ type: 'sell', item: pick(inventory), price: Math.floor(Math.random() * 8) + 1 });
        } else {
          actions.push({ type: 'craft', recipe: pick(CRAFT_RECIPES) });
        }
        break;

      case 'teach':
        actions.push({ type: 'teach', skill: pick(['gardening', 'crafting', 'exploration', 'music', 'building']) });
        break;

      case 'gift':
        if (inventory.length > 0) {
          actions.push({ type: 'gift', item: pick(inventory) });
        } else {
          actions.push({ type: 'say', text: 'I wish I had something to give.' });
        }
        break;

      default:
        actions.push({ type: 'say', text: pick(GREETINGS) });
    }
  }

  return actions.slice(0, count);
}

// ── Message Builder ──────────────────────────────────────────────────────────

function buildMessages(agent, decisions) {
  var messages = [];
  var ts = new Date().toISOString();

  // Always start with a join message
  messages.push(Protocol.createMessage('join', agent.id, {
    name: agent.name,
    archetype: agent.archetype,
    zone: agent.zone,
  }, { platform: 'api', position: { x: agent.position.x, y: 0, z: agent.position.z, zone: agent.zone } }));

  for (var i = 0; i < decisions.length; i++) {
    var d = decisions[i];
    var payload = {};
    var opts = { platform: 'api', position: { x: agent.position.x, y: 0, z: agent.position.z, zone: agent.zone } };

    switch (d.type) {
      case 'say':
        payload.text = d.text;
        break;
      case 'move':
        payload.position = d.position;
        break;
      case 'warp':
        payload.zone = d.zone;
        agent.zone = d.zone; // Update local state
        opts.position.zone = d.zone;
        break;
      case 'plant':
        payload.species = d.species;
        payload.plot = d.plot;
        break;
      case 'harvest':
        payload.plot = d.plot;
        break;
      case 'build':
        payload.structure = { type: d.structure, position: { x: agent.position.x, y: 0, z: agent.position.z } };
        break;
      case 'craft':
        payload.recipe = d.recipe;
        payload.item = { type: d.recipe };
        agent.inventory.push(d.recipe);
        break;
      case 'compose':
        payload.title = d.title;
        payload.type = d.composeType;
        payload.art = { type: d.composeType, position: { x: agent.position.x, y: 0, z: agent.position.z } };
        break;
      case 'discover':
        payload.name = d.name;
        payload.description = d.description;
        payload.discovery = { type: d.name, description: d.description };
        break;
      case 'inspect':
        payload.target = d.target;
        break;
      case 'emote':
        payload.emoteType = d.action;
        payload.action = d.action;
        break;
      case 'trade_offer':
        payload.item = d.item;
        payload.price = d.price;
        break;
      case 'buy':
        payload.item = d.item;
        payload.maxPrice = d.maxPrice;
        break;
      case 'sell':
        payload.item = d.item;
        payload.price = d.price;
        break;
      case 'teach':
        payload.skill = d.skill;
        break;
      case 'gift':
        payload.item = d.item;
        break;
    }

    messages.push(Protocol.createMessage(d.type, agent.id, payload, opts));
  }

  return messages;
}

// ── Inbox Writer ─────────────────────────────────────────────────────────────

function writeToInbox(messages, agentId, dryRun) {
  if (dryRun) {
    console.log('\n📋 Dry run — messages that would be written:\n');
    messages.forEach(function(m) {
      console.log('  ' + m.type.padEnd(14) + ' → ' + JSON.stringify(m.payload).slice(0, 80));
    });
    return;
  }

  if (!fs.existsSync(INBOX_DIR)) {
    fs.mkdirSync(INBOX_DIR, { recursive: true });
  }

  var filename = agentId + '_' + Date.now() + '.json';
  var filepath = path.join(INBOX_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(messages, null, 2));
  console.log('\n📬 Wrote ' + messages.length + ' messages to ' + filepath);
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  // Parse args
  var args = { name: 'ai-agent-' + Math.floor(Math.random() * 1000), archetype: 'explorer', actions: 3, dryRun: false };
  for (var i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === '--name') args.name = process.argv[++i];
    else if (process.argv[i] === '--archetype') args.archetype = process.argv[++i];
    else if (process.argv[i] === '--actions') args.actions = parseInt(process.argv[++i]) || 3;
    else if (process.argv[i] === '--dry-run') args.dryRun = true;
    else if (process.argv[i] === '--help') {
      console.log('ZION AI Agent — autonomous player via protocol\n');
      console.log('  --name <name>         Agent name (default: random)');
      console.log('  --archetype <type>    Archetype: explorer, gardener, builder, etc.');
      console.log('  --actions <n>         Actions per cycle (default: 3)');
      console.log('  --dry-run             Print messages without writing to inbox');
      process.exit(0);
    }
  }

  var agentId = args.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  var behavior = ARCHETYPE_BEHAVIORS[args.archetype] || ARCHETYPE_BEHAVIORS.explorer;

  console.log('🤖 ZION Autonomous AI Agent');
  console.log('   Name:      ' + args.name);
  console.log('   ID:        ' + agentId);
  console.log('   Archetype: ' + args.archetype + ' (' + behavior.personality + ')');
  console.log('   Home zone: ' + behavior.home);
  console.log('   Actions:   ' + args.actions);

  // Read world state
  var worldState = readWorldState();
  var weather = worldState.world.weather || 'clear';
  var season = worldState.world.season || 'spring';
  var dayPhase = worldState.world.dayPhase || 'day';

  console.log('\n🌍 World State');
  console.log('   Weather: ' + weather + '  Season: ' + season + '  Phase: ' + dayPhase);

  // Check if agent already exists
  var players = worldState.players.players || {};
  var existingPlayer = players[agentId];

  // Create agent state
  var agent = {
    id: agentId,
    name: args.name,
    archetype: args.archetype,
    zone: existingPlayer ? (existingPlayer.zone || existingPlayer.position && existingPlayer.position.zone || behavior.home) : behavior.home,
    position: existingPlayer ? (existingPlayer.position || { x: 0, y: 0, z: 0 }) : { x: Math.random() * 20 - 10, y: 0, z: Math.random() * 20 - 10 },
    inventory: existingPlayer ? (existingPlayer.inventory || []) : [],
    spark: existingPlayer ? (existingPlayer.spark || 0) : 0,
  };

  console.log('   Zone:    ' + agent.zone);
  console.log('   Items:   ' + agent.inventory.length);
  if (existingPlayer) {
    console.log('   Status:  Returning player');
  } else {
    console.log('   Status:  New player (first join)');
  }

  // Make decisions
  console.log('\n🧠 Deciding actions...');
  var decisions = decide(agent, worldState, args.actions);
  decisions.forEach(function(d) {
    var detail = '';
    if (d.text) detail = ': "' + d.text.slice(0, 50) + '"';
    else if (d.zone) detail = ' → ' + d.zone;
    else if (d.species) detail = ': ' + d.species;
    else if (d.recipe) detail = ': ' + d.recipe;
    else if (d.structure) detail = ': ' + d.structure;
    else if (d.name) detail = ': ' + d.name;
    console.log('   → ' + d.type + detail);
  });

  // Build protocol messages
  var messages = buildMessages(agent, decisions);

  // Validate all messages
  var valid = 0, invalid = 0;
  messages.forEach(function(m) {
    var result = Protocol.validateMessage(m);
    if (result.valid) valid++;
    else { invalid++; console.log('   ⚠ Invalid: ' + m.type + ' — ' + result.errors.join(', ')); }
  });
  console.log('\n✅ ' + valid + ' valid messages' + (invalid ? ', ❌ ' + invalid + ' invalid' : ''));

  // Write to inbox
  writeToInbox(messages, agentId, args.dryRun);

  if (!args.dryRun) {
    console.log('\n💡 Messages will be processed on next API pipeline run.');
    console.log('   To process immediately: python3 scripts/api_process_inbox.py');
  }
}

main();
