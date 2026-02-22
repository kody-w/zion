/**
 * ZION Procedural Dungeon Generator
 * Seeded room graphs with puzzles, enemies, loot.
 * No project dependencies.
 */

(function(exports) {
  'use strict';

  // ---------------------------------------------------------------------------
  // Seeded pseudo-random number generator (mulberry32)
  // ---------------------------------------------------------------------------

  function createRng(seed) {
    var s = seed >>> 0;
    return function() {
      s += 0x6D2B79F5;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) >>> 0;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashString(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function seedFrom(base, suffix) {
    return hashString(String(base) + '|' + String(suffix));
  }

  function rngInt(rng, min, max) {
    return min + Math.floor(rng() * (max - min + 1));
  }

  function rngPick(rng, arr) {
    return arr[Math.floor(rng() * arr.length)];
  }

  function rngShuffle(rng, arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  var ROOM_TYPES = {
    entrance:     'entrance',
    corridor:     'corridor',
    chamber:      'chamber',
    treasure_room:'treasure_room',
    boss_room:    'boss_room',
    puzzle_room:  'puzzle_room',
    trap_room:    'trap_room',
    rest_area:    'rest_area',
    secret_room:  'secret_room'
  };

  var PUZZLE_TYPES = {
    lever_sequence:  'lever_sequence',
    pressure_plates: 'pressure_plates',
    riddle:          'riddle',
    pattern_match:   'pattern_match',
    light_bridge:    'light_bridge',
    crystal_align:   'crystal_align'
  };

  var ENEMY_TYPES = {
    shadow_wisp: {
      id: 'shadow_wisp',
      name: 'Shadow Wisp',
      hp: 20,
      maxHp: 20,
      attack: 4,
      defense: 1,
      speed: 8,
      xp: 15,
      tier: 'common'
    },
    stone_guardian: {
      id: 'stone_guardian',
      name: 'Stone Guardian',
      hp: 60,
      maxHp: 60,
      attack: 8,
      defense: 6,
      speed: 3,
      xp: 40,
      tier: 'uncommon'
    },
    crystal_spider: {
      id: 'crystal_spider',
      name: 'Crystal Spider',
      hp: 35,
      maxHp: 35,
      attack: 6,
      defense: 3,
      speed: 7,
      xp: 25,
      tier: 'common'
    },
    void_walker: {
      id: 'void_walker',
      name: 'Void Walker',
      hp: 80,
      maxHp: 80,
      attack: 12,
      defense: 4,
      speed: 6,
      xp: 65,
      tier: 'rare'
    },
    ancient_sentinel: {
      id: 'ancient_sentinel',
      name: 'Ancient Sentinel',
      hp: 200,
      maxHp: 200,
      attack: 20,
      defense: 12,
      speed: 4,
      xp: 150,
      tier: 'boss'
    }
  };

  var LOOT_TABLES = {
    common: {
      tier: 'common',
      items: [
        { id: 'health_potion',    name: 'Health Potion',    type: 'consumable', value: 10, effect: { heal: 30 } },
        { id: 'torch',            name: 'Torch',            type: 'tool',       value: 5,  effect: { light: 10 } },
        { id: 'iron_key',         name: 'Iron Key',         type: 'key',        value: 15, effect: {} },
        { id: 'leather_gloves',   name: 'Leather Gloves',   type: 'armor',      value: 20, effect: { defense: 1 } },
        { id: 'short_sword',      name: 'Short Sword',      type: 'weapon',     value: 25, effect: { attack: 3 } }
      ]
    },
    uncommon: {
      tier: 'uncommon',
      items: [
        { id: 'mana_potion',      name: 'Mana Potion',      type: 'consumable', value: 30, effect: { mana: 50 } },
        { id: 'silver_ring',      name: 'Silver Ring',      type: 'accessory',  value: 50, effect: { luck: 5 } },
        { id: 'chain_mail',       name: 'Chain Mail',       type: 'armor',      value: 80, effect: { defense: 4 } },
        { id: 'enchanted_blade',  name: 'Enchanted Blade',  type: 'weapon',     value: 90, effect: { attack: 7 } },
        { id: 'map_fragment',     name: 'Map Fragment',     type: 'quest',      value: 40, effect: {} }
      ]
    },
    rare: {
      tier: 'rare',
      items: [
        { id: 'elixir_of_might',  name: 'Elixir of Might',  type: 'consumable', value: 120, effect: { attack_bonus: 10, duration: 60 } },
        { id: 'shadow_cloak',     name: 'Shadow Cloak',     type: 'armor',      value: 200, effect: { defense: 8, stealth: 15 } },
        { id: 'crystal_staff',    name: 'Crystal Staff',    type: 'weapon',     value: 250, effect: { attack: 12, magic: 20 } },
        { id: 'void_amulet',      name: 'Void Amulet',      type: 'accessory',  value: 180, effect: { hp_max: 50, magic_resist: 10 } },
        { id: 'ancient_tome',     name: 'Ancient Tome',     type: 'quest',      value: 150, effect: { spell_unlock: true } }
      ]
    },
    epic: {
      tier: 'epic',
      items: [
        { id: 'dragonhide_armor', name: 'Dragonhide Armor', type: 'armor',      value: 600, effect: { defense: 18, fire_resist: 30 } },
        { id: 'soul_blade',       name: 'Soul Blade',       type: 'weapon',     value: 700, effect: { attack: 22, life_steal: 10 } },
        { id: 'ring_of_power',    name: 'Ring of Power',    type: 'accessory',  value: 500, effect: { all_stats: 10 } },
        { id: 'phoenix_feather',  name: 'Phoenix Feather',  type: 'consumable', value: 400, effect: { revive: true, heal: 100 } },
        { id: 'arcane_codex',     name: 'Arcane Codex',     type: 'quest',      value: 450, effect: { all_spells: true } }
      ]
    },
    legendary: {
      tier: 'legendary',
      items: [
        { id: 'crown_of_eternity', name: 'Crown of Eternity', type: 'accessory',  value: 2000, effect: { all_stats: 25, immortality: 30 } },
        { id: 'void_reaper',       name: 'Void Reaper',       type: 'weapon',     value: 2500, effect: { attack: 40, void_damage: 20 } },
        { id: 'titan_aegis',       name: 'Titan Aegis',       type: 'armor',      value: 2200, effect: { defense: 35, reflect: 15 } },
        { id: 'time_crystal',      name: 'Time Crystal',      type: 'quest',      value: 3000, effect: { time_control: true } },
        { id: 'world_shard',       name: 'World Shard',       type: 'quest',      value: 5000, effect: { world_power: true } }
      ]
    }
  };

  var DIFFICULTY_LEVELS = {
    novice: {
      id: 'novice',
      label: 'Novice',
      enemyHpMult: 0.6,
      enemyAtkMult: 0.6,
      lootMult: 1.2,
      puzzleComplexity: 0.3,
      trapDamage: 5,
      bossHpMult: 0.5,
      xpMult: 0.7
    },
    adventurer: {
      id: 'adventurer',
      label: 'Adventurer',
      enemyHpMult: 1.0,
      enemyAtkMult: 1.0,
      lootMult: 1.0,
      puzzleComplexity: 0.5,
      trapDamage: 15,
      bossHpMult: 1.0,
      xpMult: 1.0
    },
    hero: {
      id: 'hero',
      label: 'Hero',
      enemyHpMult: 1.5,
      enemyAtkMult: 1.4,
      lootMult: 0.9,
      puzzleComplexity: 0.75,
      trapDamage: 30,
      bossHpMult: 1.5,
      xpMult: 1.5
    },
    legend: {
      id: 'legend',
      label: 'Legend',
      enemyHpMult: 2.5,
      enemyAtkMult: 2.0,
      lootMult: 0.8,
      puzzleComplexity: 1.0,
      trapDamage: 50,
      bossHpMult: 2.5,
      xpMult: 2.5
    }
  };

  var DUNGEON_SIZES = {
    small:  { id: 'small',  label: 'Small',  minRooms: 5,  maxRooms: 8  },
    medium: { id: 'medium', label: 'Medium', minRooms: 10, maxRooms: 15 },
    large:  { id: 'large',  label: 'Large',  minRooms: 18, maxRooms: 25 },
    epic:   { id: 'epic',   label: 'Epic',   minRooms: 30, maxRooms: 40 }
  };

  // ---------------------------------------------------------------------------
  // Room type distribution helpers
  // ---------------------------------------------------------------------------

  function getRoomTypeDistribution(totalRooms) {
    var distribution = [];
    // always start with entrance
    distribution.push(ROOM_TYPES.entrance);
    // always end with boss
    distribution.push(ROOM_TYPES.boss_room);

    var remaining = totalRooms - 2;
    // mandatory: at least 1 treasure_room, 1 puzzle_room
    distribution.push(ROOM_TYPES.treasure_room);
    distribution.push(ROOM_TYPES.puzzle_room);
    remaining -= 2;

    // rest: fill with corridors, chambers, trap_rooms, rest_areas, secret_rooms
    var fillers = [
      ROOM_TYPES.corridor,
      ROOM_TYPES.chamber,
      ROOM_TYPES.trap_room,
      ROOM_TYPES.rest_area
    ];

    // add a few secret rooms for larger dungeons
    if (totalRooms >= 10) {
      distribution.push(ROOM_TYPES.secret_room);
      remaining -= 1;
    }
    if (totalRooms >= 18) {
      distribution.push(ROOM_TYPES.secret_room);
      distribution.push(ROOM_TYPES.puzzle_room);
      remaining -= 2;
    }
    if (totalRooms >= 30) {
      distribution.push(ROOM_TYPES.treasure_room);
      distribution.push(ROOM_TYPES.trap_room);
      remaining -= 2;
    }

    // fill rest
    for (var i = 0; i < remaining; i++) {
      distribution.push(fillers[i % fillers.length]);
    }

    return distribution;
  }

  // ---------------------------------------------------------------------------
  // Puzzle generation
  // ---------------------------------------------------------------------------

  var RIDDLES = [
    { question: 'I have cities, but no houses live there. I have mountains, but no trees grow. I have water, but no fish swim. What am I?', answer: 'map' },
    { question: 'The more you take, the more you leave behind. What am I?', answer: 'footsteps' },
    { question: 'I speak without a mouth and hear without ears. I have no body, but I come alive with the wind. What am I?', answer: 'echo' },
    { question: 'I have a head and a tail but no body. What am I?', answer: 'coin' },
    { question: 'I can fly without wings. I can cry without eyes. Wherever I go, darkness flies. What am I?', answer: 'cloud' }
  ];

  function generatePuzzle(seed, type) {
    var rng = createRng(seedFrom(seed, type));
    var puzzle = {
      id: 'puzzle_' + seed + '_' + type,
      type: type,
      solved: false,
      attempts: 0
    };

    switch (type) {
      case PUZZLE_TYPES.lever_sequence: {
        var levers = rngInt(rng, 3, 6);
        var sequence = [];
        for (var i = 0; i < levers; i++) {
          sequence.push(rngInt(rng, 0, levers - 1));
        }
        puzzle.description = 'Pull the levers in the correct sequence to unlock the door.';
        puzzle.levers = levers;
        puzzle.solution = sequence;
        puzzle.hint = 'The markings on the floor may reveal the order.';
        break;
      }
      case PUZZLE_TYPES.pressure_plates: {
        var plates = rngInt(rng, 4, 8);
        var activeSet = [];
        var seen = {};
        while (activeSet.length < Math.ceil(plates / 2)) {
          var p = rngInt(rng, 0, plates - 1);
          if (!seen[p]) { seen[p] = true; activeSet.push(p); }
        }
        activeSet.sort(function(a, b) { return a - b; });
        puzzle.description = 'Step on the correct pressure plates simultaneously to open the gate.';
        puzzle.plates = plates;
        puzzle.solution = activeSet;
        puzzle.hint = 'The worn tiles mark the path of those who came before.';
        break;
      }
      case PUZZLE_TYPES.riddle: {
        var riddle = rngPick(rng, RIDDLES);
        puzzle.description = riddle.question;
        puzzle.question = riddle.question;
        puzzle.solution = riddle.answer;
        puzzle.hint = 'Think about what surrounds you in this dungeon.';
        break;
      }
      case PUZZLE_TYPES.pattern_match: {
        var size = rngInt(rng, 3, 5);
        var pattern = [];
        for (var pi = 0; pi < size; pi++) {
          pattern.push(rngInt(rng, 1, 4));
        }
        puzzle.description = 'Reproduce the glowing pattern on the arcane panel.';
        puzzle.size = size;
        puzzle.solution = pattern;
        puzzle.hint = 'Watch the pattern carefully — it flashes once.';
        break;
      }
      case PUZZLE_TYPES.light_bridge: {
        var segments = rngInt(rng, 4, 7);
        var bridgePath = [];
        for (var bi = 0; bi < segments; bi++) {
          bridgePath.push(rngInt(rng, 0, 2)); // 0=left, 1=forward, 2=right
        }
        puzzle.description = 'Activate the crystal prisms to extend the light bridge.';
        puzzle.segments = segments;
        puzzle.solution = bridgePath;
        puzzle.hint = 'Follow the faint glow on the ground.';
        break;
      }
      case PUZZLE_TYPES.crystal_align: {
        var crystals = rngInt(rng, 3, 6);
        var angles = [];
        var validAngles = [0, 45, 90, 135, 180, 225, 270, 315];
        for (var ci = 0; ci < crystals; ci++) {
          angles.push(rngPick(rng, validAngles));
        }
        puzzle.description = 'Rotate the crystals to align their beams toward the central focus.';
        puzzle.crystals = crystals;
        puzzle.solution = angles;
        puzzle.hint = 'Ancient inscriptions show the correct angles.';
        break;
      }
      default: {
        puzzle.description = 'Solve the ancient puzzle.';
        puzzle.solution = [1, 2, 3];
        puzzle.hint = 'Look around for clues.';
      }
    }

    return puzzle;
  }

  function solvePuzzle(puzzle, attempt) {
    if (!puzzle || !puzzle.solution) {
      return { success: false, message: 'Invalid puzzle' };
    }

    puzzle.attempts = (puzzle.attempts || 0) + 1;

    var sol = puzzle.solution;
    var correct = false;

    if (puzzle.type === PUZZLE_TYPES.riddle) {
      // case-insensitive string compare
      correct = typeof attempt === 'string' &&
                attempt.trim().toLowerCase() === String(sol).toLowerCase();
    } else if (Array.isArray(sol) && Array.isArray(attempt)) {
      if (sol.length !== attempt.length) {
        correct = false;
      } else {
        correct = true;
        for (var i = 0; i < sol.length; i++) {
          if (sol[i] !== attempt[i]) { correct = false; break; }
        }
      }
    } else {
      correct = attempt === sol;
    }

    if (correct) {
      puzzle.solved = true;
      return { success: true, message: 'Puzzle solved!', xpReward: 50 + puzzle.attempts * 5 };
    }

    var msg = 'Incorrect. ';
    if (puzzle.attempts >= 3) {
      msg += 'Hint: ' + puzzle.hint;
    } else {
      msg += 'Try again.';
    }
    return { success: false, message: msg, attempts: puzzle.attempts };
  }

  // ---------------------------------------------------------------------------
  // Enemy encounter generation
  // ---------------------------------------------------------------------------

  function scaleEnemy(base, difficultyConfig) {
    var scaled = {};
    for (var k in base) { scaled[k] = base[k]; }
    scaled.hp = Math.round(base.hp * difficultyConfig.enemyHpMult);
    scaled.maxHp = scaled.hp;
    scaled.attack = Math.round(base.attack * difficultyConfig.enemyAtkMult);
    if (base.tier === 'boss') {
      scaled.hp = Math.round(base.hp * difficultyConfig.bossHpMult);
      scaled.maxHp = scaled.hp;
    }
    return scaled;
  }

  function generateEnemyEncounter(seed, difficulty, roomType) {
    var rng = createRng(seedFrom(seed, difficulty + '_' + roomType));
    var diffCfg = DIFFICULTY_LEVELS[difficulty] || DIFFICULTY_LEVELS.adventurer;

    var enemyKeys = Object.keys(ENEMY_TYPES);
    var encounter = {
      seed: seed,
      difficulty: difficulty,
      roomType: roomType,
      enemies: [],
      totalXp: 0,
      isBossEncounter: false
    };

    if (roomType === ROOM_TYPES.boss_room) {
      encounter.isBossEncounter = true;
      var boss = scaleEnemy(ENEMY_TYPES.ancient_sentinel, diffCfg);
      boss.instanceId = 'enemy_' + seed + '_0';
      encounter.enemies.push(boss);
      encounter.totalXp += Math.round(boss.xp * diffCfg.xpMult);
      // add a couple of minions
      var minionCount = rngInt(rng, 1, 3);
      for (var mi = 0; mi < minionCount; mi++) {
        var minionKey = rngPick(rng, ['shadow_wisp', 'crystal_spider']);
        var minion = scaleEnemy(ENEMY_TYPES[minionKey], diffCfg);
        minion.instanceId = 'enemy_' + seed + '_minion_' + mi;
        encounter.enemies.push(minion);
        encounter.totalXp += Math.round(minion.xp * diffCfg.xpMult);
      }
      return encounter;
    }

    if (roomType === ROOM_TYPES.entrance || roomType === ROOM_TYPES.rest_area) {
      // no enemies at entrance / rest area
      return encounter;
    }

    if (roomType === ROOM_TYPES.corridor) {
      var cCount = rngInt(rng, 0, 2);
      for (var ci = 0; ci < cCount; ci++) {
        var cKey = rngPick(rng, ['shadow_wisp', 'crystal_spider']);
        var ce = scaleEnemy(ENEMY_TYPES[cKey], diffCfg);
        ce.instanceId = 'enemy_' + seed + '_' + ci;
        encounter.enemies.push(ce);
        encounter.totalXp += Math.round(ce.xp * diffCfg.xpMult);
      }
      return encounter;
    }

    // general rooms: 1-4 enemies scaled to difficulty
    var maxCount = roomType === ROOM_TYPES.chamber ? 4 : 3;
    var count = rngInt(rng, 1, maxCount);
    for (var ei = 0; ei < count; ei++) {
      var eligibleKeys;
      if (difficulty === 'novice') {
        eligibleKeys = ['shadow_wisp', 'crystal_spider'];
      } else if (difficulty === 'adventurer') {
        eligibleKeys = ['shadow_wisp', 'crystal_spider', 'stone_guardian'];
      } else if (difficulty === 'hero') {
        eligibleKeys = ['crystal_spider', 'stone_guardian', 'void_walker'];
      } else {
        eligibleKeys = enemyKeys.filter(function(k) { return ENEMY_TYPES[k].tier !== 'boss'; });
      }
      var eKey = rngPick(rng, eligibleKeys);
      var enemy = scaleEnemy(ENEMY_TYPES[eKey], diffCfg);
      enemy.instanceId = 'enemy_' + seed + '_' + ei;
      encounter.enemies.push(enemy);
      encounter.totalXp += Math.round(enemy.xp * diffCfg.xpMult);
    }

    return encounter;
  }

  // ---------------------------------------------------------------------------
  // Combat resolution
  // ---------------------------------------------------------------------------

  function calculateCombatOutcome(playerStats, enemies) {
    if (!playerStats || !enemies || enemies.length === 0) {
      return { victory: true, survived: true, rounds: 0, damageDealt: 0, damageTaken: 0, xpGained: 0 };
    }

    var pHp = playerStats.hp || 100;
    var pAtk = playerStats.attack || 10;
    var pDef = playerStats.defense || 5;
    var pSpd = playerStats.speed || 5;

    var enemyPool = enemies.map(function(e) {
      return { id: e.instanceId || e.id, hp: e.hp, attack: e.attack, defense: e.defense, speed: e.speed || 5, xp: e.xp };
    });

    var rounds = 0;
    var damageDealt = 0;
    var damageTaken = 0;
    var xpGained = 0;

    while (pHp > 0 && enemyPool.length > 0) {
      rounds++;
      if (rounds > 200) break; // safety cap

      // Player attacks first enemy
      var target = enemyPool[0];
      var playerDmg = Math.max(1, pAtk - target.defense);
      target.hp -= playerDmg;
      damageDealt += playerDmg;

      if (target.hp <= 0) {
        xpGained += target.xp;
        enemyPool.shift();
        continue;
      }

      // Each remaining enemy attacks player
      for (var ei = 0; ei < enemyPool.length; ei++) {
        var e = enemyPool[ei];
        var enemyDmg = Math.max(1, e.attack - pDef);
        // speed factor: faster enemy deals slightly more
        var spdBonus = Math.max(0, e.speed - pSpd) * 0.5;
        enemyDmg = Math.round(enemyDmg + spdBonus);
        pHp -= enemyDmg;
        damageTaken += enemyDmg;
        if (pHp <= 0) break;
      }
    }

    return {
      victory: enemyPool.length === 0 && pHp > 0,
      survived: pHp > 0,
      playerHpRemaining: Math.max(0, pHp),
      rounds: rounds,
      damageDealt: damageDealt,
      damageTaken: damageTaken,
      xpGained: enemyPool.length === 0 ? xpGained : 0
    };
  }

  // ---------------------------------------------------------------------------
  // Loot
  // ---------------------------------------------------------------------------

  function getLootDrop(seed, difficulty, tier) {
    // Item selection uses only seed+tier so same item is picked regardless of difficulty
    var rng = createRng(seedFrom(seed, tier));
    var table = LOOT_TABLES[tier];
    if (!table) {
      table = LOOT_TABLES.common;
    }

    var diffCfg = DIFFICULTY_LEVELS[difficulty] || DIFFICULTY_LEVELS.adventurer;
    var item = rngPick(rng, table.items);

    // Make a copy with scaled value
    var loot = {};
    for (var k in item) { loot[k] = item[k]; }
    loot.value = Math.round(item.value * diffCfg.lootMult);
    loot.instanceId = 'loot_' + seed + '_' + tier;
    loot.tier = tier;

    return loot;
  }

  function determineLootTier(rng, difficulty) {
    var roll = rng();
    if (difficulty === 'novice') {
      if (roll < 0.60) return 'common';
      if (roll < 0.85) return 'uncommon';
      if (roll < 0.97) return 'rare';
      return 'epic';
    }
    if (difficulty === 'adventurer') {
      if (roll < 0.45) return 'common';
      if (roll < 0.75) return 'uncommon';
      if (roll < 0.93) return 'rare';
      if (roll < 0.99) return 'epic';
      return 'legendary';
    }
    if (difficulty === 'hero') {
      if (roll < 0.30) return 'common';
      if (roll < 0.60) return 'uncommon';
      if (roll < 0.85) return 'rare';
      if (roll < 0.97) return 'epic';
      return 'legendary';
    }
    // legend
    if (roll < 0.20) return 'common';
    if (roll < 0.45) return 'uncommon';
    if (roll < 0.70) return 'rare';
    if (roll < 0.90) return 'epic';
    return 'legendary';
  }

  // ---------------------------------------------------------------------------
  // Room generation
  // ---------------------------------------------------------------------------

  function generateRoom(seed, type, difficulty) {
    var rng = createRng(seedFrom(seed, type));
    var diffCfg = DIFFICULTY_LEVELS[difficulty] || DIFFICULTY_LEVELS.adventurer;

    var room = {
      id: 'room_' + seed,
      seed: seed,
      type: type,
      difficulty: difficulty,
      description: '',
      width: 0,
      height: 0,
      enemies: [],
      puzzle: null,
      loot: [],
      traps: [],
      connections: [],
      explored: false,
      cleared: false,
      isSecret: type === ROOM_TYPES.secret_room
    };

    // Dimensions
    switch (type) {
      case ROOM_TYPES.corridor:
        room.width = rngInt(rng, 3, 5);
        room.height = rngInt(rng, 8, 15);
        break;
      case ROOM_TYPES.boss_room:
        room.width = rngInt(rng, 20, 30);
        room.height = rngInt(rng, 20, 30);
        break;
      case ROOM_TYPES.entrance:
        room.width = rngInt(rng, 10, 14);
        room.height = rngInt(rng, 10, 14);
        break;
      default:
        room.width = rngInt(rng, 8, 18);
        room.height = rngInt(rng, 8, 18);
    }

    // Description
    var descriptions = {
      entrance:     'The dungeon entrance, torch brackets flicker with dying flames.',
      corridor:     'A narrow passage with worn stone walls and scattered debris.',
      chamber:      'A large vaulted chamber. Ancient carvings line the walls.',
      treasure_room:'A room glittering with hoarded wealth, locked chests in every corner.',
      boss_room:    'A massive hall. The air itself trembles with menacing power.',
      puzzle_room:  'Strange mechanisms cover the walls. Arcane symbols pulse with energy.',
      trap_room:    'The floor is suspiciously clean. Pressure plate outlines are barely visible.',
      rest_area:    'A sheltered alcove with a crumbling stone bench and dying embers.',
      secret_room:  'A hidden chamber behind a false wall. Dust undisturbed for centuries.'
    };
    room.description = descriptions[type] || 'A dungeon room.';

    // Enemies
    var encounter = generateEnemyEncounter(seed, difficulty, type);
    room.enemies = encounter.enemies;
    room.totalXp = encounter.totalXp;

    // Puzzle
    if (type === ROOM_TYPES.puzzle_room) {
      var puzzleTypes = Object.values(PUZZLE_TYPES);
      var pType = rngPick(rng, puzzleTypes);
      room.puzzle = generatePuzzle(seedFrom(seed, 'puzzle'), pType);
    }

    // Loot
    if (type === ROOM_TYPES.treasure_room || type === ROOM_TYPES.boss_room || type === ROOM_TYPES.secret_room) {
      var lootCount = rngInt(rng, 2, 5);
      for (var li = 0; li < lootCount; li++) {
        var tier = determineLootTier(rng, difficulty);
        if (type === ROOM_TYPES.boss_room) {
          // boss always drops at least rare
          if (tier === 'common' || tier === 'uncommon') tier = 'rare';
        }
        if (type === ROOM_TYPES.secret_room) {
          // secret rooms get better loot
          if (tier === 'common') tier = 'uncommon';
        }
        room.loot.push(getLootDrop(seedFrom(seed, 'loot_' + li), difficulty, tier));
      }
    } else if (type !== ROOM_TYPES.entrance) {
      // small chance of loot in other rooms
      if (rng() < 0.3) {
        var basicTier = determineLootTier(rng, difficulty);
        room.loot.push(getLootDrop(seedFrom(seed, 'loot_0'), difficulty, basicTier));
      }
    }

    // Traps
    if (type === ROOM_TYPES.trap_room) {
      var trapTypes = ['spike_pit', 'poison_dart', 'falling_ceiling', 'fire_jet', 'arcane_glyph'];
      var trapCount = rngInt(rng, 2, 4);
      for (var ti = 0; ti < trapCount; ti++) {
        room.traps.push({
          id: 'trap_' + seed + '_' + ti,
          type: rngPick(rng, trapTypes),
          damage: diffCfg.trapDamage,
          triggered: false,
          detectionDifficulty: rngInt(rng, 1, 10)
        });
      }
    } else if (type === ROOM_TYPES.corridor && rng() < 0.25) {
      room.traps.push({
        id: 'trap_' + seed + '_0',
        type: 'pressure_plate_dart',
        damage: Math.round(diffCfg.trapDamage * 0.5),
        triggered: false,
        detectionDifficulty: rngInt(rng, 1, 6)
      });
    }

    return room;
  }

  // ---------------------------------------------------------------------------
  // Room graph generation (DAG with cycles)
  // ---------------------------------------------------------------------------

  function generateRoomGraph(seed, roomCount) {
    var rng = createRng(seedFrom(seed, 'graph'));

    var rooms = [];
    for (var i = 0; i < roomCount; i++) {
      rooms.push({
        id: i,
        connections: [],
        visited: false
      });
    }

    // Build a spanning tree (so all rooms are reachable)
    // Add entrance → boss path first
    for (var i = 1; i < roomCount; i++) {
      var parent = rngInt(rng, 0, i - 1);
      rooms[i].connections.push(parent);
      rooms[parent].connections.push(i);
    }

    // Add extra edges for cycles (approximately 20% of roomCount additional edges)
    var extraEdges = Math.max(1, Math.floor(roomCount * 0.2));
    for (var e = 0; e < extraEdges; e++) {
      var a = rngInt(rng, 0, roomCount - 1);
      var b = rngInt(rng, 0, roomCount - 1);
      if (a !== b && rooms[a].connections.indexOf(b) === -1) {
        rooms[a].connections.push(b);
        rooms[b].connections.push(a);
      }
    }

    return {
      rooms: rooms,
      roomCount: roomCount,
      entranceId: 0,
      bossRoomId: roomCount - 1
    };
  }

  // ---------------------------------------------------------------------------
  // Pathfinding (BFS shortest path)
  // ---------------------------------------------------------------------------

  function getShortestPath(dungeon, fromRoom, toRoom) {
    if (!dungeon || !dungeon.rooms) return null;
    if (fromRoom === toRoom) return [fromRoom];

    var rooms = dungeon.rooms;
    var visited = {};
    var parent = {};
    var queue = [fromRoom];
    visited[fromRoom] = true;

    while (queue.length > 0) {
      var current = queue.shift();
      var room = rooms[current];
      if (!room) continue;

      var neighbors;
      // handle both generateRoomGraph format and generateDungeon format
      if (room.connections && Array.isArray(room.connections)) {
        neighbors = room.connections;
      } else {
        neighbors = [];
      }

      for (var ni = 0; ni < neighbors.length; ni++) {
        var neighbor = neighbors[ni];
        var nId = typeof neighbor === 'object' ? neighbor.id : neighbor;
        if (!visited[nId]) {
          visited[nId] = true;
          parent[nId] = current;
          if (nId === toRoom) {
            // reconstruct path
            var path = [toRoom];
            var node = toRoom;
            while (node !== fromRoom) {
              node = parent[node];
              path.unshift(node);
            }
            return path;
          }
          queue.push(nId);
        }
      }
    }

    return null; // no path found
  }

  // ---------------------------------------------------------------------------
  // Fog of war
  // ---------------------------------------------------------------------------

  function revealMap(dungeon, exploredRooms) {
    if (!dungeon || !dungeon.rooms) return dungeon;

    var exploredSet = {};
    for (var i = 0; i < exploredRooms.length; i++) {
      exploredSet[exploredRooms[i]] = true;
    }

    var visibleRooms = [];
    var hiddenRooms = [];

    for (var ri = 0; ri < dungeon.rooms.length; ri++) {
      var room = dungeon.rooms[ri];
      var isVisible = !!exploredSet[room.id];

      // also reveal rooms adjacent to explored rooms (line of sight)
      if (!isVisible && room.connections) {
        for (var ci = 0; ci < room.connections.length; ci++) {
          var neighborId = typeof room.connections[ci] === 'object'
            ? room.connections[ci].id
            : room.connections[ci];
          if (exploredSet[neighborId]) {
            isVisible = true;
            break;
          }
        }
      }

      // secret rooms only revealed if directly explored
      if (room.isSecret) {
        isVisible = !!exploredSet[room.id];
      }

      if (isVisible) {
        visibleRooms.push(room.id);
      } else {
        hiddenRooms.push(room.id);
      }
    }

    return {
      visibleRooms: visibleRooms,
      hiddenRooms: hiddenRooms,
      exploredRooms: exploredRooms.slice(),
      totalRooms: dungeon.rooms.length,
      revealedCount: visibleRooms.length
    };
  }

  // ---------------------------------------------------------------------------
  // Full dungeon generation
  // ---------------------------------------------------------------------------

  function generateDungeon(seed, difficulty, size) {
    var sizeConfig = DUNGEON_SIZES[size] || DUNGEON_SIZES.medium;
    var diffConfig = DIFFICULTY_LEVELS[difficulty] || DIFFICULTY_LEVELS.adventurer;
    var rng = createRng(seedFrom(seed, difficulty + '_' + size));

    var roomCount = rngInt(rng, sizeConfig.minRooms, sizeConfig.maxRooms);
    var typeDistribution = getRoomTypeDistribution(roomCount);
    // shuffle middle rooms (keep entrance at index 0, boss_room at last index)
    var shuffleRng = createRng(seedFrom(seed, 'type_shuffle'));
    // Filter out entrance and boss_room to shuffle everything else
    var middle = typeDistribution.filter(function(t) {
      return t !== ROOM_TYPES.entrance && t !== ROOM_TYPES.boss_room;
    });
    middle = rngShuffle(shuffleRng, middle);
    var shuffledTypes = [ROOM_TYPES.entrance].concat(middle).concat([ROOM_TYPES.boss_room]);

    // Generate graph structure
    var graph = generateRoomGraph(seedFrom(seed, 'graph'), roomCount);

    // Generate each room with content
    var rooms = [];
    for (var ri = 0; ri < roomCount; ri++) {
      var rType = shuffledTypes[ri] || ROOM_TYPES.corridor;
      var roomSeed = seedFrom(seed, 'room_' + ri);
      var room = generateRoom(roomSeed, rType, difficulty);
      room.id = ri;
      // carry over connections from graph
      room.connections = graph.rooms[ri].connections;
      rooms.push(room);
    }

    var dungeon = {
      seed: seed,
      difficulty: difficulty,
      difficultyConfig: diffConfig,
      size: size,
      sizeConfig: sizeConfig,
      roomCount: roomCount,
      rooms: rooms,
      entranceId: 0,
      bossRoomId: roomCount - 1,
      createdAt: Date.now(),
      completed: false,
      exploredRooms: [],
      clearedRooms: []
    };

    return dungeon;
  }

  // ---------------------------------------------------------------------------
  // Scoring
  // ---------------------------------------------------------------------------

  function getDungeonScore(dungeon, completion) {
    if (!dungeon) return 0;

    var diffMultipliers = {
      novice: 1.0,
      adventurer: 1.5,
      hero: 2.5,
      legend: 4.0
    };

    var diffMult = diffMultipliers[dungeon.difficulty] || 1.0;
    var comp = completion || {};

    var roomsCleared = comp.roomsCleared || 0;
    var puzzlesSolved = comp.puzzlesSolved || 0;
    var lootFound = comp.lootFound || 0;
    var bossDefeated = comp.bossDefeated ? 1 : 0;
    var secretsFound = comp.secretsFound || 0;
    var deathCount = comp.deaths || 0;
    var timeBonus = comp.timeBonus || 0;

    var baseScore = 0;
    baseScore += roomsCleared * 100;
    baseScore += puzzlesSolved * 200;
    baseScore += lootFound * 50;
    baseScore += bossDefeated * 1000;
    baseScore += secretsFound * 300;
    baseScore -= deathCount * 150;
    baseScore += timeBonus;

    var finalScore = Math.max(0, Math.round(baseScore * diffMult));

    return {
      baseScore: baseScore,
      difficultyMultiplier: diffMult,
      finalScore: finalScore,
      breakdown: {
        roomsCleared: roomsCleared * 100,
        puzzlesSolved: puzzlesSolved * 200,
        lootFound: lootFound * 50,
        bossDefeated: bossDefeated * 1000,
        secretsFound: secretsFound * 300,
        deathPenalty: deathCount * -150,
        timeBonus: timeBonus
      }
    };
  }

  // ---------------------------------------------------------------------------
  // Dungeon summary
  // ---------------------------------------------------------------------------

  function getDungeonSummary(dungeon) {
    if (!dungeon || !dungeon.rooms) {
      return null;
    }

    var summary = {
      seed: dungeon.seed,
      difficulty: dungeon.difficulty,
      size: dungeon.size,
      roomCount: dungeon.roomCount,
      roomsByType: {},
      totalEnemies: 0,
      totalLoot: 0,
      totalPuzzles: 0,
      totalTraps: 0,
      bossRoom: null,
      estimatedTimeMinutes: 0,
      hasBoss: false,
      secretRoomCount: 0
    };

    // Initialize room type counters
    for (var rType in ROOM_TYPES) {
      summary.roomsByType[rType] = 0;
    }

    for (var ri = 0; ri < dungeon.rooms.length; ri++) {
      var room = dungeon.rooms[ri];
      var rkey = room.type;

      if (summary.roomsByType[rkey] !== undefined) {
        summary.roomsByType[rkey]++;
      }

      summary.totalEnemies += room.enemies ? room.enemies.length : 0;
      summary.totalLoot += room.loot ? room.loot.length : 0;
      summary.totalPuzzles += room.puzzle ? 1 : 0;
      summary.totalTraps += room.traps ? room.traps.length : 0;

      if (room.type === ROOM_TYPES.secret_room) {
        summary.secretRoomCount++;
      }

      if (room.type === ROOM_TYPES.boss_room) {
        summary.hasBoss = true;
        summary.bossRoom = { id: room.id, enemyCount: room.enemies ? room.enemies.length : 0 };
      }
    }

    // Rough time estimate: 3 min/room base + 2 min/puzzle + 1 min/enemy
    summary.estimatedTimeMinutes = dungeon.roomCount * 3 + summary.totalPuzzles * 2 + summary.totalEnemies;

    return summary;
  }

  // ---------------------------------------------------------------------------
  // Exports
  // ---------------------------------------------------------------------------

  exports.ROOM_TYPES = ROOM_TYPES;
  exports.PUZZLE_TYPES = PUZZLE_TYPES;
  exports.ENEMY_TYPES = ENEMY_TYPES;
  exports.LOOT_TABLES = LOOT_TABLES;
  exports.DIFFICULTY_LEVELS = DIFFICULTY_LEVELS;
  exports.DUNGEON_SIZES = DUNGEON_SIZES;

  exports.generateDungeon = generateDungeon;
  exports.generateRoomGraph = generateRoomGraph;
  exports.generateRoom = generateRoom;
  exports.generatePuzzle = generatePuzzle;
  exports.solvePuzzle = solvePuzzle;
  exports.generateEnemyEncounter = generateEnemyEncounter;
  exports.calculateCombatOutcome = calculateCombatOutcome;
  exports.getLootDrop = getLootDrop;
  exports.getShortestPath = getShortestPath;
  exports.revealMap = revealMap;
  exports.getDungeonScore = getDungeonScore;
  exports.getDungeonSummary = getDungeonSummary;

})(typeof module !== 'undefined' ? module.exports : (window.Dungeons = {}));
