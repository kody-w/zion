/**
 * ZION Autonomous AI Player — "Aria"
 * 
 * A fully autonomous agent that plays ZION using a finite state machine,
 * personality traits, and the actual game modules. Curious but peaceful.
 * 
 * Uses: protocol.js, state.js, economy.js, zones.js, social.js,
 *       creation.js, exploration.js, competition.js, intentions.js
 */
(function(exports) {
  'use strict';

  // ─── Load actual game modules ───
  var Protocol, State, Economy, Zones, Social, Creation, Exploration, Competition, Intentions;
  if (typeof require !== 'undefined') {
    Protocol = require('../src/js/protocol.js');
    State = require('../src/js/state.js');
    Zones = require('../src/js/zones.js');
    Economy = require('../src/js/economy.js');
    Social = require('../src/js/social.js');
    Creation = require('../src/js/creation.js');
    Exploration = require('../src/js/exploration.js');
    Competition = require('../src/js/competition.js');
    Intentions = require('../src/js/intentions.js');
  }

  // ─── Finite State Machine States ───
  var FSM_STATES = {
    WAKING:      'WAKING',      // Just logged in, orienting
    EXPLORING:   'EXPLORING',   // Wandering, discovering
    EARNING:     'EARNING',     // Focused on Spark generation
    TRADING:     'TRADING',     // At the market buying/selling
    SOCIALIZING: 'SOCIALIZING', // Chatting, gifting, befriending
    BUILDING:    'BUILDING',    // Constructing in commons
    GARDENING:   'GARDENING',   // Planting/harvesting in gardens
    CRAFTING:    'CRAFTING',    // Making items in studio
    COMPETING:   'COMPETING',   // Puzzle/race in arena (never PvP)
    RESTING:     'RESTING'      // End of day, reflecting
  };

  // ─── Personality Trait Defaults ───
  var DEFAULT_PERSONALITY = {
    curiosity:    0.85,  // High — loves exploring new zones
    peacefulness: 1.0,   // Maximum — never initiates violence
    generosity:   0.7,   // Gives gifts freely
    ambition:     0.5,   // Moderate earning drive
    creativity:   0.75,  // Enjoys building and crafting
    sociability:  0.65,  // Friendly but not clingy
    patience:     0.6,   // Will garden but prefers variety
    wisdom:       0.7    // Seeks knowledge in athenaeum
  };

  // ─── Day phases (each game-day = 24 ticks) ───
  var PHASES = {
    DAWN:      { start: 0,  end: 5,  name: 'dawn' },
    MORNING:   { start: 6,  end: 11, name: 'morning' },
    AFTERNOON: { start: 12, end: 17, name: 'afternoon' },
    EVENING:   { start: 18, end: 21, name: 'evening' },
    NIGHT:     { start: 22, end: 23, name: 'night' }
  };

  // ─── Zone affinities (what activities each zone is best for) ───
  var ZONE_ACTIVITIES = {
    nexus:     ['socialize', 'trade', 'rest'],
    gardens:   ['garden', 'harvest', 'discover'],
    wilds:     ['explore', 'discover', 'forage'],
    arena:     ['compete', 'spectate'],
    athenaeum: ['learn', 'teach', 'discover'],
    studio:    ['craft', 'compose', 'build'],
    agora:     ['trade', 'socialize', 'perform'],
    commons:   ['build', 'socialize', 'garden']
  };

  // ─── Seeded PRNG for reproducible simulations ───
  function SeededRandom(seed) {
    this.seed = seed || 42;
  }
  SeededRandom.prototype.next = function() {
    this.seed = (this.seed * 16807 + 0) % 2147483647;
    return (this.seed - 1) / 2147483646;
  };
  SeededRandom.prototype.pick = function(arr) {
    return arr[Math.floor(this.next() * arr.length)];
  };
  SeededRandom.prototype.chance = function(probability) {
    return this.next() < probability;
  };
  SeededRandom.prototype.between = function(min, max) {
    return min + Math.floor(this.next() * (max - min + 1));
  };

  // ─── Memory system (what the AI remembers) ───
  function createMemory() {
    return {
      visitedZones: {},        // zone → visit count
      friends: {},             // playerId → { warmth, lastSeen, giftsGiven }
      favoriteZone: null,      // Most-visited zone
      discoveries: [],         // Things found
      crafted: [],             // Items made
      built: [],               // Structures created
      trades: [],              // Trade history
      conversations: [],       // Chat log (last 50)
      sparkHistory: [],        // Balance over time
      emotionalState: 'content', // content, excited, curious, reflective, grateful
      daysSinceNewZone: 0,     // Triggers wanderlust
      consecutiveSameState: 0, // Prevents getting stuck
      totalSteps: 0,
      achievements: []
    };
  }

  // ─── The AI Player ───
  function createAIPlayer(name, personality, seed) {
    var rng = new SeededRandom(seed || 42);
    var traits = Object.assign({}, DEFAULT_PERSONALITY, personality || {});

    var ai = {
      id: 'ai_' + (name || 'aria').toLowerCase().replace(/\s+/g, '_'),
      name: name || 'Aria',
      traits: traits,
      rng: rng,

      // Current state
      fsm: FSM_STATES.WAKING,
      zone: 'nexus',
      position: { x: 0, y: 0, z: 0 },
      spark: 0,
      inventory: [],
      warmth: 0,
      reputation: 0,

      // Time tracking
      gameDay: 0,
      gameTick: 0,    // 0-23 within a day
      totalTicks: 0,

      // Memory
      memory: createMemory(),

      // Action log (for visualization)
      actionLog: [],
      stateLog: [],     // FSM state at each tick
      sparkLog: [],     // Spark balance at each tick
      zoneLog: [],      // Zone at each tick

      // Stats
      stats: {
        messagesGenerated: 0,
        zonesVisited: 0,
        sparkEarned: 0,
        sparkSpent: 0,
        giftsGiven: 0,
        friendsMade: 0,
        itemsCrafted: 0,
        structuresBuilt: 0,
        plantsGrown: 0,
        discoveriesMade: 0,
        competitionsEntered: 0,
        chatMessages: 0,
        warps: 0,
        totalDistance: 0
      }
    };

    return ai;
  }

  // ─── Phase Detection ───
  function getPhase(tick) {
    for (var key in PHASES) {
      var p = PHASES[key];
      if (tick >= p.start && tick <= p.end) return p;
    }
    return PHASES.NIGHT;
  }

  // ─── Emotional State Engine ───
  function updateEmotion(ai) {
    var mem = ai.memory;

    if (mem.daysSinceNewZone > 3 && ai.traits.curiosity > 0.7) {
      mem.emotionalState = 'restless';
    } else if (ai.stats.discoveriesMade > 0 && ai.rng.chance(0.3)) {
      mem.emotionalState = 'excited';
    } else if (ai.stats.giftsGiven > ai.stats.friendsMade && ai.rng.chance(0.4)) {
      mem.emotionalState = 'grateful';
    } else if (getPhase(ai.gameTick).name === 'night') {
      mem.emotionalState = 'reflective';
    } else if (ai.rng.chance(ai.traits.curiosity * 0.5)) {
      mem.emotionalState = 'curious';
    } else {
      mem.emotionalState = 'content';
    }
  }

  // ─── FSM Transition Logic ───
  function decideNextState(ai, worldState, ledger) {
    var phase = getPhase(ai.gameTick);
    var rng = ai.rng;
    var traits = ai.traits;
    var mem = ai.memory;

    // Track how long we've been in same state
    if (ai.stateLog.length > 0 && ai.stateLog[ai.stateLog.length - 1] === ai.fsm) {
      mem.consecutiveSameState++;
    } else {
      mem.consecutiveSameState = 0;
    }

    // Night → rest
    if (phase.name === 'night') return FSM_STATES.RESTING;

    // Dawn → wake up on first tick of a new day
    if (phase.name === 'dawn' && ai.gameTick === 0) return FSM_STATES.WAKING;

    // Time-of-day schedule influences activities
    var timeBonus = {};
    if (phase.name === 'dawn') {
      timeBonus[FSM_STATES.EXPLORING] = 0.2;
      timeBonus[FSM_STATES.GARDENING] = 0.15;
    } else if (phase.name === 'morning') {
      timeBonus[FSM_STATES.EARNING] = 0.2;
      timeBonus[FSM_STATES.CRAFTING] = 0.15;
      timeBonus[FSM_STATES.BUILDING] = 0.15;
    } else if (phase.name === 'afternoon') {
      timeBonus[FSM_STATES.SOCIALIZING] = 0.2;
      timeBonus[FSM_STATES.TRADING] = 0.15;
      timeBonus[FSM_STATES.COMPETING] = 0.15;
    } else if (phase.name === 'evening') {
      timeBonus[FSM_STATES.SOCIALIZING] = 0.15;
      timeBonus[FSM_STATES.EXPLORING] = 0.1;
    }

    // Base scores from personality
    var scores = {};
    scores[FSM_STATES.EXPLORING]   = traits.curiosity * 0.4;
    scores[FSM_STATES.EARNING]     = traits.ambition * 0.4 + (ai.spark < 20 ? 0.2 : 0);
    scores[FSM_STATES.TRADING]     = 0.2 + (ai.inventory.length > 2 ? 0.15 : 0);
    scores[FSM_STATES.SOCIALIZING] = traits.sociability * 0.45;
    scores[FSM_STATES.BUILDING]    = traits.creativity * 0.4;
    scores[FSM_STATES.GARDENING]   = traits.patience * 0.45;
    scores[FSM_STATES.CRAFTING]    = traits.creativity * 0.45;
    scores[FSM_STATES.COMPETING]   = 0.15 + traits.ambition * 0.1;

    // Apply time-of-day bonuses
    for (var s in timeBonus) {
      scores[s] = (scores[s] || 0) + timeBonus[s];
    }

    // STRONG penalty for repeating the same state (encourages variety)
    if (mem.consecutiveSameState > 2) {
      scores[ai.fsm] *= 0.3;
    } else if (mem.consecutiveSameState > 0) {
      scores[ai.fsm] *= 0.7;
    }

    // Bonus for states not done recently
    var recentStates = ai.stateLog.slice(-10);
    for (var state in scores) {
      var count = recentStates.filter(function(x) { return x === state; }).length;
      if (count === 0) scores[state] += 0.15; // Haven't done this recently
    }

    // Add controlled randomness
    for (var st in scores) {
      scores[st] += rng.next() * 0.15;
    }

    // Pick highest scoring state
    var best = FSM_STATES.EXPLORING;
    var bestScore = -1;
    for (var s2 in scores) {
      if (scores[s2] > bestScore) {
        bestScore = scores[s2];
        best = s2;
      }
    }

    return best;
  }

  // ─── Action Generators (one per FSM state) ───

  function generateWakingActions(ai, worldState, ledger) {
    var messages = [];
    // Join the world
    messages.push(Protocol.createMessage('join', ai.id, {
      name: ai.name,
      zone: ai.zone
    }));

    // Say good morning
    var greetings = [
      'Good morning, Zion! ☀️',
      'A new day dawns. What shall we discover?',
      'Hello world! Aria is here.',
      'The light is beautiful today.',
      '*stretches* Ready for adventure!'
    ];
    messages.push(Protocol.createMessage('say', ai.id, {
      text: ai.rng.pick(greetings)
    }, { position: ai.position }));

    ai.stats.chatMessages++;
    return messages;
  }

  function generateExploringActions(ai, worldState, ledger) {
    var messages = [];
    var rng = ai.rng;

    // Move in a random direction (simulating wandering)
    var dx = rng.between(-10, 10);
    var dz = rng.between(-10, 10);
    var newPos = {
      x: ai.position.x + dx,
      y: 0,
      z: ai.position.z + dz
    };
    messages.push(Protocol.createMessage('move', ai.id, {}, {
      position: newPos
    }));
    ai.position = newPos;
    ai.stats.totalDistance += Math.sqrt(dx * dx + dz * dz);

    // Try to discover something
    if (rng.chance(0.4)) {
      messages.push(Protocol.createMessage('discover', ai.id, {
        position: ai.position,
        description: generateDiscoveryText(ai)
      }, { position: ai.position }));
    }

    // Consider warping to a new zone
    if (rng.chance(ai.traits.curiosity * 0.3) || ai.memory.daysSinceNewZone > 3) {
      var connected = Zones.getConnectedZones(ai.zone);
      if (connected && connected.length > 0) {
        // Prefer unvisited zones
        var unvisited = connected.filter(function(z) {
          return !ai.memory.visitedZones[z];
        });
        var target = unvisited.length > 0 ? rng.pick(unvisited) : rng.pick(connected);

        messages.push(Protocol.createMessage('warp', ai.id, {
          zone: target,
          from: ai.zone
        }));

        ai.zone = target;
        ai.position = { x: 0, y: 0, z: 0 };
        ai.memory.visitedZones[target] = (ai.memory.visitedZones[target] || 0) + 1;
        ai.memory.daysSinceNewZone = 0;
        ai.stats.warps++;

        // Sync to worldState
        if (worldState.players[ai.id]) {
          worldState.players[ai.id].zone = ai.zone;
          worldState.players[ai.id].position = ai.position;
        }

        // Express excitement about new zone
        var reactions = [
          'Oh! ' + target + ' is fascinating!',
          'I\'ve always wanted to visit ' + target + '.',
          '*looks around in wonder* So this is ' + target + '...',
          'The energy here in ' + target + ' is different.',
        ];
        messages.push(Protocol.createMessage('say', ai.id, {
          text: rng.pick(reactions)
        }, { position: ai.position }));
        ai.stats.chatMessages++;
      }
    }

    // Inspect something nearby
    if (rng.chance(0.25)) {
      messages.push(Protocol.createMessage('inspect', ai.id, {
        position: ai.position
      }, { position: ai.position }));
    }

    return messages;
  }

  function generateEarningActions(ai, worldState, ledger) {
    var messages = [];
    var rng = ai.rng;

    // Pick the best earning activity for current zone
    var zoneActs = ZONE_ACTIVITIES[ai.zone] || ['explore'];

    if (zoneActs.indexOf('harvest') >= 0 && rng.chance(0.5)) {
      messages.push(Protocol.createMessage('harvest', ai.id, {
        position: ai.position,
        resource: rng.pick(['berries', 'herbs', 'flowers', 'mushrooms'])
      }, { position: ai.position }));
      Economy.earnSpark(ledger, ai.id, 'harvest', { complexity: rng.next() });
      ai.stats.sparkEarned += 10;
    } else if (zoneActs.indexOf('craft') >= 0 && rng.chance(0.4)) {
      var material = rng.pick(['wood', 'stone', 'fiber', 'clay']);
      messages.push(Protocol.createMessage('craft', ai.id, {
        recipe: material + '_charm',
        materials: [material]
      }));
      Economy.earnSpark(ledger, ai.id, 'craft', { complexity: rng.next() });
      ai.stats.sparkEarned += 15;
      ai.stats.itemsCrafted++;
    } else {
      // Daily activities
      Economy.earnSpark(ledger, ai.id, 'daily_login');
      ai.stats.sparkEarned += 10;
    }

    ai.spark = Economy.getBalance(ledger, ai.id);
    return messages;
  }

  function generateTradingActions(ai, worldState, ledger) {
    var messages = [];
    var rng = ai.rng;

    if (ai.inventory.length > 0 && rng.chance(0.5)) {
      // List an item for sale
      var item = ai.inventory.shift();
      var price = rng.between(5, 30);
      Economy.createMarketListing(ledger, ai.id, item, price);
      messages.push(Protocol.createMessage('trade_offer', ai.id, {
        item: item,
        price: price,
        action: 'list'
      }));
      ai.stats.sparkSpent += 1; // listing fee
    }

    // Check market for good deals
    if (rng.chance(0.3) && ai.spark > 20) {
      var listings = Economy.getActiveListings ? Economy.getActiveListings(ledger) : [];
      if (listings && listings.length > 0) {
        var affordable = listings.filter(function(l) {
          return l.price <= ai.spark * 0.5 && l.seller !== ai.id;
        });
        if (affordable.length > 0) {
          var deal = rng.pick(affordable);
          Economy.buyListing(ledger, ai.id, deal.id);
          ai.inventory.push(deal.item);
          ai.stats.sparkSpent += deal.price;
        }
      }
    }

    // Express trading sentiment
    if (rng.chance(0.3)) {
      var tradeChat = [
        'Anyone trading today? I have interesting wares!',
        'The market here is wonderful.',
        'Looking for rare herbs, if anyone has some!',
        'Fair prices, fair trades — that\'s the Zion way.'
      ];
      messages.push(Protocol.createMessage('say', ai.id, {
        text: rng.pick(tradeChat)
      }, { position: ai.position }));
      ai.stats.chatMessages++;
    }

    ai.spark = Economy.getBalance(ledger, ai.id);
    return messages;
  }

  function generateSocializingActions(ai, worldState, ledger) {
    var messages = [];
    var rng = ai.rng;

    // Find nearby players to interact with
    var players = worldState.players || {};
    var nearby = [];
    for (var pid in players) {
      if (pid === ai.id) continue;
      var p = players[pid];
      if (p.zone === ai.zone && p.online !== false) {
        nearby.push(p);
      }
    }

    if (nearby.length > 0) {
      var target = rng.pick(nearby);

      // Chat with them
      var convos = [
        'Hi ' + (target.name || target.id) + '! How are you today?',
        'Beautiful day in ' + ai.zone + ', isn\'t it?',
        'Have you discovered anything interesting lately?',
        'I love the community here. Everyone is so kind.',
        '*waves* Hello friend!',
        'What brings you to ' + ai.zone + '?'
      ];
      messages.push(Protocol.createMessage('say', ai.id, {
        text: rng.pick(convos)
      }, { position: ai.position }));
      ai.stats.chatMessages++;

      // Gift something if generous and have spark
      if (rng.chance(ai.traits.generosity * 0.4) && ai.spark > 10) {
        var giftAmount = rng.between(1, 3);
        var result = Economy.transferSpark(ledger, ai.id, target.id, giftAmount);
        if (result && result.success) {
          messages.push(Protocol.createMessage('gift', ai.id, {
            to: target.id,
            amount: giftAmount,
            message: 'A small gift for you! ✨'
          }));
          ai.stats.giftsGiven++;
          ai.stats.sparkSpent += giftAmount;

          // Remember this friend
          if (!ai.memory.friends[target.id]) {
            ai.memory.friends[target.id] = { warmth: 0, lastSeen: ai.totalTicks, giftsGiven: 0 };
            ai.stats.friendsMade++;
          }
          ai.memory.friends[target.id].warmth += 10;
          ai.memory.friends[target.id].giftsGiven++;
          ai.memory.friends[target.id].lastSeen = ai.totalTicks;
        }
      }

      // Emote
      if (rng.chance(0.3)) {
        var emotes = [
          'smiles warmly',
          'does a little dance',
          'waves enthusiastically',
          'admires the scenery',
          'hums a gentle melody'
        ];
        messages.push(Protocol.createMessage('emote', ai.id, {
          text: rng.pick(emotes)
        }, { position: ai.position }));
      }
    } else {
      // Alone — reflect
      var thoughts = [
        'It\'s quiet here... peaceful.',
        '*sits and watches the world go by*',
        'I wonder where everyone is today.',
        'Sometimes solitude is its own gift.'
      ];
      messages.push(Protocol.createMessage('say', ai.id, {
        text: rng.pick(thoughts)
      }, { position: ai.position }));
      ai.stats.chatMessages++;
    }

    ai.spark = Economy.getBalance(ledger, ai.id);
    return messages;
  }

  function generateBuildingActions(ai, worldState, ledger) {
    var messages = [];
    var rng = ai.rng;

    if (!Zones.isActionAllowed('build', ai.zone)) {
      return generateExploringActions(ai, worldState, ledger);
    }

    var structures = [
      { type: 'bench', name: 'Aria\'s Reading Bench' },
      { type: 'fountain', name: 'Whispering Fountain' },
      { type: 'garden_arch', name: 'Twilight Arch' },
      { type: 'lantern', name: 'Kindness Lantern' },
      { type: 'shrine', name: 'Shrine of Curiosity' },
      { type: 'bridge', name: 'Friendship Bridge' }
    ];

    var structure = rng.pick(structures);
    var buildPos = {
      x: ai.position.x + rng.between(-5, 5),
      y: 0,
      z: ai.position.z + rng.between(-5, 5)
    };

    messages.push(Protocol.createMessage('build', ai.id, {
      type: structure.type,
      name: structure.name,
      position: buildPos,
      materials: ['stone', 'wood']
    }, { position: ai.position }));

    Economy.earnSpark(ledger, ai.id, 'build', { complexity: rng.next() });
    ai.stats.structuresBuilt++;
    ai.memory.built.push({ type: structure.type, name: structure.name, day: ai.gameDay });

    // Proud of creation
    messages.push(Protocol.createMessage('say', ai.id, {
      text: 'I built a ' + structure.type + '! I call it "' + structure.name + '" 🏗️'
    }, { position: ai.position }));
    ai.stats.chatMessages++;

    ai.spark = Economy.getBalance(ledger, ai.id);
    return messages;
  }

  function generateGardeningActions(ai, worldState, ledger) {
    var messages = [];
    var rng = ai.rng;

    if (!Zones.isActionAllowed('harvest', ai.zone)) {
      return generateExploringActions(ai, worldState, ledger);
    }

    var plants = ['sunflower', 'lavender', 'mint', 'rose', 'bamboo', 'fern', 'daisy'];
    var plant = rng.pick(plants);

    if (rng.chance(0.5)) {
      // Plant
      messages.push(Protocol.createMessage('plant', ai.id, {
        type: plant,
        position: {
          x: ai.position.x + rng.between(-3, 3),
          y: 0,
          z: ai.position.z + rng.between(-3, 3)
        }
      }, { position: ai.position }));
      ai.stats.plantsGrown++;
    } else {
      // Harvest
      messages.push(Protocol.createMessage('harvest', ai.id, {
        position: ai.position,
        resource: plant
      }, { position: ai.position }));

      Economy.earnSpark(ledger, ai.id, 'harvest', { complexity: rng.next() });
      ai.stats.sparkEarned += 8;
      ai.inventory.push({ type: 'plant', name: plant });
    }

    // Garden chat
    if (rng.chance(0.3)) {
      var gardenChat = [
        'The ' + plant + 's are growing beautifully!',
        'There\'s something meditative about gardening.',
        '*tends to the garden carefully*',
        'Nature provides if you listen.',
      ];
      messages.push(Protocol.createMessage('say', ai.id, {
        text: rng.pick(gardenChat)
      }, { position: ai.position }));
      ai.stats.chatMessages++;
    }

    ai.spark = Economy.getBalance(ledger, ai.id);
    return messages;
  }

  function generateCraftingActions(ai, worldState, ledger) {
    var messages = [];
    var rng = ai.rng;

    var recipes = [
      { name: 'Crystal Pendant', materials: ['crystal', 'wire'], complexity: 0.7 },
      { name: 'Wooden Flute', materials: ['wood', 'reed'], complexity: 0.5 },
      { name: 'Herb Pouch', materials: ['leather', 'herbs'], complexity: 0.3 },
      { name: 'Star Map', materials: ['paper', 'ink'], complexity: 0.8 },
      { name: 'Dream Catcher', materials: ['silk', 'feathers'], complexity: 0.6 },
      { name: 'Friendship Bracelet', materials: ['thread', 'beads'], complexity: 0.2 }
    ];

    var recipe = rng.pick(recipes);
    messages.push(Protocol.createMessage('craft', ai.id, {
      recipe: recipe.name,
      materials: recipe.materials
    }));

    Economy.earnSpark(ledger, ai.id, 'craft', { complexity: recipe.complexity });
    ai.stats.itemsCrafted++;
    ai.stats.sparkEarned += Math.round(5 + 45 * recipe.complexity);
    ai.inventory.push({ type: 'crafted', name: recipe.name });
    ai.memory.crafted.push({ name: recipe.name, day: ai.gameDay });

    messages.push(Protocol.createMessage('say', ai.id, {
      text: 'Just crafted a ' + recipe.name + '! ✨'
    }, { position: ai.position }));
    ai.stats.chatMessages++;

    ai.spark = Economy.getBalance(ledger, ai.id);
    return messages;
  }

  function generateCompetingActions(ai, worldState, ledger) {
    var messages = [];
    var rng = ai.rng;

    // Only peaceful competitions — puzzles and races, never duels
    var compTypes = ['puzzle_race', 'race', 'build_contest'];
    var comp = rng.pick(compTypes);

    messages.push(Protocol.createMessage('challenge', ai.id, {
      type: comp,
      zone: ai.zone
    }, { position: ai.position }));
    ai.stats.competitionsEntered++;

    // Score a result
    var score = rng.between(50, 100);
    messages.push(Protocol.createMessage('score', ai.id, {
      competition: comp,
      score: score
    }));

    if (score > 75) {
      Economy.earnSpark(ledger, ai.id, 'competition_win', { complexity: score / 100 });
      ai.stats.sparkEarned += score;
    }

    messages.push(Protocol.createMessage('say', ai.id, {
      text: score > 75 ? 'What a race! That was exhilarating! 🏆' : 'Good game! I\'ll do better next time.'
    }, { position: ai.position }));
    ai.stats.chatMessages++;

    ai.spark = Economy.getBalance(ledger, ai.id);
    return messages;
  }

  function generateRestingActions(ai, worldState, ledger) {
    var messages = [];
    var rng = ai.rng;

    // Night reflection
    var reflections = [
      'Day ' + ai.gameDay + ' draws to a close. ' + ai.stats.discoveriesMade + ' discoveries so far!',
      'Goodnight, Zion. ' + Object.keys(ai.memory.friends).length + ' friends and counting. 🌙',
      '*watches the stars* What a day it\'s been.',
      'I earned ' + ai.spark + ' Spark today. The economy of kindness.',
      'Tomorrow I want to visit ' + getWishZone(ai) + '.',
      '*yawns* Time to rest. See you at dawn!'
    ];

    messages.push(Protocol.createMessage('say', ai.id, {
      text: rng.pick(reflections)
    }, { position: ai.position }));
    ai.stats.chatMessages++;

    messages.push(Protocol.createMessage('emote', ai.id, {
      text: 'settles in for the night'
    }, { position: ai.position }));

    return messages;
  }

  // ─── Helper Functions ───

  function getWishZone(ai) {
    var connected = Zones.getConnectedZones(ai.zone) || [];
    var leastVisited = connected.sort(function(a, b) {
      return (ai.memory.visitedZones[a] || 0) - (ai.memory.visitedZones[b] || 0);
    });
    return leastVisited[0] || 'nexus';
  }

  function generateDiscoveryText(ai) {
    var discoveries = [
      'a hidden alcove covered in luminescent moss',
      'ancient runes carved into the stone',
      'a gentle spring flowing with warm water',
      'a nest of crystalline butterflies',
      'strange harmonics echoing from deep within',
      'a patch of flowers that glow at twilight',
      'footprints of someone who walked here long ago',
      'a small creature that chirps and follows me',
      'a perfectly balanced stone cairn',
      'writing on the wall: "Kindness was here"'
    ];
    return ai.rng.pick(discoveries);
  }

  // ─── Zone best for each activity ───
  var BEST_ZONE_FOR = {
    GARDENING:   'gardens',
    BUILDING:    'commons',
    CRAFTING:    'studio',
    TRADING:     'agora',
    COMPETING:   'arena'
  };

  // Warp toward a target zone (may take multiple hops)
  function warpToward(ai, targetZone, worldState) {
    if (ai.zone === targetZone) return [];
    var connected = Zones.getConnectedZones(ai.zone) || [];
    var dest = connected.indexOf(targetZone) >= 0 ? targetZone : (connected.length > 0 ? ai.rng.pick(connected) : null);
    if (!dest) return [];

    ai.zone = dest;
    ai.position = { x: ai.rng.between(-5, 5), y: 0, z: ai.rng.between(-5, 5) };
    ai.stats.warps++;
    ai.memory.daysSinceNewZone = 0;

    // Sync to world state
    if (worldState.players[ai.id]) {
      worldState.players[ai.id].zone = ai.zone;
      worldState.players[ai.id].position = ai.position;
    }

    return [Protocol.createMessage('warp', ai.id, { zone: dest, from: ai.zone })];
  }

  // Sync agent position into worldState so other agents can see them
  function syncToWorld(ai, worldState) {
    if (worldState.players[ai.id]) {
      worldState.players[ai.id].zone = ai.zone;
      worldState.players[ai.id].position = ai.position;
      worldState.players[ai.id].spark = ai.spark;
      worldState.players[ai.id].online = true;
    }
  }

  // ─── Main Tick Function ───
  function tick(ai, worldState, ledger) {
    // Decide FSM state
    var nextState = decideNextState(ai, worldState, ledger);
    ai.fsm = nextState;

    // Update emotion
    updateEmotion(ai);

    // If the desired activity needs a specific zone, warp there first
    var messages = [];
    var neededZone = BEST_ZONE_FOR[ai.fsm];
    if (neededZone && ai.zone !== neededZone) {
      messages = messages.concat(warpToward(ai, neededZone, worldState));
    }

    // Generate actions based on state
    var actions = [];
    switch (ai.fsm) {
      case FSM_STATES.WAKING:      actions = generateWakingActions(ai, worldState, ledger);   break;
      case FSM_STATES.EXPLORING:   actions = generateExploringActions(ai, worldState, ledger); break;
      case FSM_STATES.EARNING:     actions = generateEarningActions(ai, worldState, ledger);   break;
      case FSM_STATES.TRADING:     actions = generateTradingActions(ai, worldState, ledger);   break;
      case FSM_STATES.SOCIALIZING: actions = generateSocializingActions(ai, worldState, ledger); break;
      case FSM_STATES.BUILDING:    actions = generateBuildingActions(ai, worldState, ledger);  break;
      case FSM_STATES.GARDENING:   actions = generateGardeningActions(ai, worldState, ledger); break;
      case FSM_STATES.CRAFTING:    actions = generateCraftingActions(ai, worldState, ledger);  break;
      case FSM_STATES.COMPETING:   actions = generateCompetingActions(ai, worldState, ledger); break;
      case FSM_STATES.RESTING:     actions = generateRestingActions(ai, worldState, ledger);   break;
    }
    messages = messages.concat(actions);

    // Apply messages to world state
    for (var i = 0; i < messages.length; i++) {
      try {
        worldState = State.applyMessage(worldState, messages[i]) || worldState;
      } catch (e) {
        // Some messages may not be handled — that's OK
      }
    }

    // Sync agent state to world
    ai.spark = Economy.getBalance(ledger, ai.id);
    syncToWorld(ai, worldState);

    ai.stats.messagesGenerated += messages.length;
    ai.totalTicks++;
    ai.gameTick = (ai.gameTick + 1) % 24;
    if (ai.gameTick === 0) {
      ai.gameDay++;
      ai.memory.daysSinceNewZone++;
    }

    // Log for visualization
    ai.stateLog.push(ai.fsm);
    ai.sparkLog.push(ai.spark);
    ai.zoneLog.push(ai.zone);
    ai.memory.sparkHistory.push({ tick: ai.totalTicks, spark: ai.spark });

    // Log actions
    for (var j = 0; j < messages.length; j++) {
      ai.actionLog.push({
        tick: ai.totalTicks,
        day: ai.gameDay,
        phase: getPhase(ai.gameTick).name,
        state: ai.fsm,
        type: messages[j].type,
        zone: ai.zone,
        emotion: ai.memory.emotionalState,
        spark: ai.spark
      });
    }

    // Visit tracking
    if (!ai.memory.visitedZones[ai.zone]) {
      ai.stats.zonesVisited++;
    }
    ai.memory.visitedZones[ai.zone] = (ai.memory.visitedZones[ai.zone] || 0) + 1;

    // Update favorite zone
    var maxVisits = 0;
    for (var z in ai.memory.visitedZones) {
      if (ai.memory.visitedZones[z] > maxVisits) {
        maxVisits = ai.memory.visitedZones[z];
        ai.memory.favoriteZone = z;
      }
    }

    return { ai: ai, worldState: worldState, messages: messages };
  }

  // ─── Exports ───
  exports.FSM_STATES = FSM_STATES;
  exports.ZONE_ACTIVITIES = ZONE_ACTIVITIES;
  exports.DEFAULT_PERSONALITY = DEFAULT_PERSONALITY;
  exports.createAIPlayer = createAIPlayer;
  exports.createMemory = createMemory;
  exports.tick = tick;
  exports.decideNextState = decideNextState;
  exports.getPhase = getPhase;
  exports.SeededRandom = SeededRandom;

})(typeof module !== 'undefined' ? module.exports : (window.ZION = window.ZION || {}));
