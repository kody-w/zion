// raid_system.js
/**
 * ZION Raid System
 * Cooperative 2-4 player dungeon raids with scaling difficulty,
 * boss mechanics, coordinated puzzles, shared loot, and cooldowns.
 * No project dependencies.
 */

(function(exports) {
  'use strict';

  // ---------------------------------------------------------------------------
  // Seeded PRNG — mulberry32
  // ---------------------------------------------------------------------------

  function mulberry32(seed) {
    return function() {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
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
  // RAID DUNGEONS — 8 definitions
  // ---------------------------------------------------------------------------

  var RAID_DUNGEONS = {
    crystal_caverns: {
      id: 'crystal_caverns',
      name: 'Crystal Caverns',
      description: 'A shimmering cave network filled with crystal golems',
      minPlayers: 2,
      maxPlayers: 4,
      baseDifficulty: 3,
      floors: 5,
      bossId: 'crystal_king',
      cooldownTicks: 500,
      entryZone: 'wilds',
      levelRequired: 5,
      lootTable: 'raid_crystal',
      puzzleCount: 2
    },
    shadow_depths: {
      id: 'shadow_depths',
      name: 'Shadow Depths',
      description: 'Ancient catacombs shrouded in perpetual darkness',
      minPlayers: 2,
      maxPlayers: 4,
      baseDifficulty: 5,
      floors: 6,
      bossId: 'void_herald',
      cooldownTicks: 600,
      entryZone: 'athenaeum',
      levelRequired: 10,
      lootTable: 'raid_shadow',
      puzzleCount: 3
    },
    fire_forge: {
      id: 'fire_forge',
      name: 'Fire Forge',
      description: 'A volcanic smith dungeon where molten metal flows freely',
      minPlayers: 2,
      maxPlayers: 4,
      baseDifficulty: 6,
      floors: 5,
      bossId: 'forge_titan',
      cooldownTicks: 650,
      entryZone: 'agora',
      levelRequired: 12,
      lootTable: 'raid_fire',
      puzzleCount: 2
    },
    frost_sanctum: {
      id: 'frost_sanctum',
      name: 'Frost Sanctum',
      description: 'A frozen temple where ice spirits guard ancient secrets',
      minPlayers: 2,
      maxPlayers: 4,
      baseDifficulty: 7,
      floors: 7,
      bossId: 'glacial_warden',
      cooldownTicks: 700,
      entryZone: 'commons',
      levelRequired: 15,
      lootTable: 'raid_frost',
      puzzleCount: 3
    },
    storm_spire: {
      id: 'storm_spire',
      name: 'Storm Spire',
      description: 'A lightning-wracked tower where storm elementals reign',
      minPlayers: 2,
      maxPlayers: 4,
      baseDifficulty: 7,
      floors: 6,
      bossId: 'tempest_lord',
      cooldownTicks: 700,
      entryZone: 'nexus',
      levelRequired: 15,
      lootTable: 'raid_storm',
      puzzleCount: 3
    },
    void_rift: {
      id: 'void_rift',
      name: 'Void Rift',
      description: 'A dimensional tear where reality fractures and warps',
      minPlayers: 3,
      maxPlayers: 4,
      baseDifficulty: 8,
      floors: 8,
      bossId: 'rift_devourer',
      cooldownTicks: 800,
      entryZone: 'arena',
      levelRequired: 20,
      lootTable: 'raid_void',
      puzzleCount: 4
    },
    ancient_ruins: {
      id: 'ancient_ruins',
      name: 'Ancient Ruins',
      description: 'Crumbling citadel of a long-dead civilization with deadly traps',
      minPlayers: 2,
      maxPlayers: 4,
      baseDifficulty: 6,
      floors: 6,
      bossId: 'stone_colossus',
      cooldownTicks: 650,
      entryZone: 'gardens',
      levelRequired: 12,
      lootTable: 'raid_ancient',
      puzzleCount: 3
    },
    world_tree_roots: {
      id: 'world_tree_roots',
      name: 'World Tree Roots',
      description: 'The vast root network of the world tree, home to nature corruption',
      minPlayers: 3,
      maxPlayers: 4,
      baseDifficulty: 9,
      floors: 8,
      bossId: 'root_tyrant',
      cooldownTicks: 900,
      entryZone: 'wilds',
      levelRequired: 25,
      lootTable: 'raid_nature',
      puzzleCount: 4
    }
  };

  // ---------------------------------------------------------------------------
  // RAID BOSSES — 8 definitions (one per dungeon)
  // ---------------------------------------------------------------------------

  var RAID_BOSSES = {
    crystal_king: {
      id: 'crystal_king',
      name: 'The Crystal King',
      dungeonId: 'crystal_caverns',
      baseHealth: 1000,
      healthPerPlayer: 300,
      attack: 25,
      defense: 15,
      phases: 3,
      mechanics: ['crystal_shield', 'gem_rain', 'mirror_split'],
      weaknesses: ['fire', 'blunt'],
      resistances: ['ice', 'pierce'],
      lootBonus: 1.5
    },
    void_herald: {
      id: 'void_herald',
      name: 'The Void Herald',
      dungeonId: 'shadow_depths',
      baseHealth: 1400,
      healthPerPlayer: 350,
      attack: 35,
      defense: 10,
      phases: 3,
      mechanics: ['shadow_clone', 'void_pulse', 'darkness_veil'],
      weaknesses: ['light', 'holy'],
      resistances: ['shadow', 'poison'],
      lootBonus: 1.7
    },
    forge_titan: {
      id: 'forge_titan',
      name: 'The Forge Titan',
      dungeonId: 'fire_forge',
      baseHealth: 1600,
      healthPerPlayer: 400,
      attack: 40,
      defense: 20,
      phases: 3,
      mechanics: ['molten_slam', 'fire_wave', 'forge_breath'],
      weaknesses: ['water', 'ice'],
      resistances: ['fire', 'earth'],
      lootBonus: 1.8
    },
    glacial_warden: {
      id: 'glacial_warden',
      name: 'Glacial Warden',
      dungeonId: 'frost_sanctum',
      baseHealth: 1800,
      healthPerPlayer: 450,
      attack: 38,
      defense: 25,
      phases: 3,
      mechanics: ['blizzard_storm', 'ice_lance', 'frozen_aura'],
      weaknesses: ['fire', 'lightning'],
      resistances: ['ice', 'water'],
      lootBonus: 2.0
    },
    tempest_lord: {
      id: 'tempest_lord',
      name: 'Tempest Lord',
      dungeonId: 'storm_spire',
      baseHealth: 1700,
      healthPerPlayer: 420,
      attack: 42,
      defense: 18,
      phases: 3,
      mechanics: ['lightning_call', 'thunder_clap', 'storm_surge'],
      weaknesses: ['earth', 'ice'],
      resistances: ['lightning', 'wind'],
      lootBonus: 2.0
    },
    rift_devourer: {
      id: 'rift_devourer',
      name: 'The Rift Devourer',
      dungeonId: 'void_rift',
      baseHealth: 2200,
      healthPerPlayer: 550,
      attack: 50,
      defense: 22,
      phases: 4,
      mechanics: ['reality_shred', 'void_collapse', 'dimension_shift', 'entropy_field'],
      weaknesses: ['arcane', 'holy'],
      resistances: ['physical', 'shadow'],
      lootBonus: 2.5
    },
    stone_colossus: {
      id: 'stone_colossus',
      name: 'Stone Colossus',
      dungeonId: 'ancient_ruins',
      baseHealth: 1500,
      healthPerPlayer: 380,
      attack: 36,
      defense: 30,
      phases: 3,
      mechanics: ['ruin_stomp', 'rubble_hurl', 'ancient_curse'],
      weaknesses: ['lightning', 'wind'],
      resistances: ['physical', 'earth'],
      lootBonus: 1.8
    },
    root_tyrant: {
      id: 'root_tyrant',
      name: 'The Root Tyrant',
      dungeonId: 'world_tree_roots',
      baseHealth: 2500,
      healthPerPlayer: 600,
      attack: 55,
      defense: 28,
      phases: 4,
      mechanics: ['root_bind', 'spore_cloud', 'overgrowth', 'nature_wrath'],
      weaknesses: ['fire', 'ice'],
      resistances: ['nature', 'poison'],
      lootBonus: 3.0
    }
  };

  // ---------------------------------------------------------------------------
  // PUZZLE TYPES — 5 cooperative puzzle types
  // ---------------------------------------------------------------------------

  var PUZZLE_TYPES = {
    synchronized_levers: {
      id: 'synchronized_levers',
      name: 'Synchronized Levers',
      description: 'All party members must pull levers simultaneously',
      minPlayers: 2,
      reward: { xp: 30, spark: 20 },
      timeLimit: 60
    },
    elemental_alignment: {
      id: 'elemental_alignment',
      name: 'Elemental Alignment',
      description: 'Each player channels a different element to align the runes',
      minPlayers: 2,
      reward: { xp: 40, spark: 25 },
      timeLimit: 90
    },
    mirror_maze: {
      id: 'mirror_maze',
      name: 'Mirror Maze',
      description: 'Players must position mirrors to direct a beam of light',
      minPlayers: 2,
      reward: { xp: 35, spark: 22 },
      timeLimit: 75
    },
    pressure_grid: {
      id: 'pressure_grid',
      name: 'Pressure Grid',
      description: 'Party members must stand on specific tiles simultaneously',
      minPlayers: 2,
      reward: { xp: 45, spark: 30 },
      timeLimit: 45
    },
    rune_sequence: {
      id: 'rune_sequence',
      name: 'Rune Sequence',
      description: 'Players take turns activating runes in a precise order',
      minPlayers: 2,
      reward: { xp: 50, spark: 35 },
      timeLimit: 120
    }
  };

  // ---------------------------------------------------------------------------
  // LOOT TABLES — per dungeon tier
  // ---------------------------------------------------------------------------

  var LOOT_TABLES = {
    raid_crystal: {
      items: [
        { id: 'crystal_shard_sword', name: 'Crystal Shard Sword', type: 'weapon', value: 350, rarity: 'rare' },
        { id: 'prism_shield', name: 'Prism Shield', type: 'armor', value: 300, rarity: 'rare' },
        { id: 'gem_focus', name: 'Gem Focus', type: 'accessory', value: 250, rarity: 'uncommon' },
        { id: 'crystal_crown', name: 'Crystal Crown', type: 'armor', value: 800, rarity: 'epic' },
        { id: 'refraction_orb', name: 'Refraction Orb', type: 'weapon', value: 1200, rarity: 'legendary' }
      ]
    },
    raid_shadow: {
      items: [
        { id: 'shadow_blade', name: 'Shadow Blade', type: 'weapon', value: 400, rarity: 'rare' },
        { id: 'void_mantle', name: 'Void Mantle', type: 'armor', value: 420, rarity: 'rare' },
        { id: 'umbra_ring', name: 'Umbra Ring', type: 'accessory', value: 280, rarity: 'uncommon' },
        { id: 'herald_staff', name: 'Herald\'s Staff', type: 'weapon', value: 900, rarity: 'epic' },
        { id: 'void_heart', name: 'Void Heart', type: 'accessory', value: 1500, rarity: 'legendary' }
      ]
    },
    raid_fire: {
      items: [
        { id: 'flame_edge', name: 'Flame Edge', type: 'weapon', value: 450, rarity: 'rare' },
        { id: 'magma_plate', name: 'Magma Plate', type: 'armor', value: 500, rarity: 'rare' },
        { id: 'forge_ember', name: 'Forge Ember', type: 'accessory', value: 300, rarity: 'uncommon' },
        { id: 'titan_hammer', name: 'Titan Hammer', type: 'weapon', value: 1000, rarity: 'epic' },
        { id: 'smelted_soul', name: 'Smelted Soul', type: 'accessory', value: 1600, rarity: 'legendary' }
      ]
    },
    raid_frost: {
      items: [
        { id: 'frost_lance', name: 'Frost Lance', type: 'weapon', value: 480, rarity: 'rare' },
        { id: 'glacier_plate', name: 'Glacier Plate', type: 'armor', value: 520, rarity: 'rare' },
        { id: 'ice_crystal_ring', name: 'Ice Crystal Ring', type: 'accessory', value: 320, rarity: 'uncommon' },
        { id: 'warden_aegis', name: 'Warden Aegis', type: 'armor', value: 1100, rarity: 'epic' },
        { id: 'eternal_frost', name: 'Eternal Frost', type: 'accessory', value: 1800, rarity: 'legendary' }
      ]
    },
    raid_storm: {
      items: [
        { id: 'storm_bow', name: 'Storm Bow', type: 'weapon', value: 470, rarity: 'rare' },
        { id: 'thunder_vest', name: 'Thunder Vest', type: 'armor', value: 510, rarity: 'rare' },
        { id: 'spark_amulet', name: 'Spark Amulet', type: 'accessory', value: 310, rarity: 'uncommon' },
        { id: 'tempest_blade', name: 'Tempest Blade', type: 'weapon', value: 1050, rarity: 'epic' },
        { id: 'eye_of_storms', name: 'Eye of Storms', type: 'accessory', value: 1750, rarity: 'legendary' }
      ]
    },
    raid_void: {
      items: [
        { id: 'rift_dagger', name: 'Rift Dagger', type: 'weapon', value: 600, rarity: 'epic' },
        { id: 'void_plate', name: 'Void Plate', type: 'armor', value: 650, rarity: 'epic' },
        { id: 'entropy_ring', name: 'Entropy Ring', type: 'accessory', value: 450, rarity: 'rare' },
        { id: 'devourer_fang', name: 'Devourer\'s Fang', type: 'weapon', value: 1400, rarity: 'legendary' },
        { id: 'fractured_reality', name: 'Fractured Reality', type: 'accessory', value: 2200, rarity: 'legendary' }
      ]
    },
    raid_ancient: {
      items: [
        { id: 'ruin_mace', name: 'Ruin Mace', type: 'weapon', value: 440, rarity: 'rare' },
        { id: 'colossus_hide', name: 'Colossus Hide', type: 'armor', value: 480, rarity: 'rare' },
        { id: 'ancient_signet', name: 'Ancient Signet', type: 'accessory', value: 290, rarity: 'uncommon' },
        { id: 'forgotten_blade', name: 'Forgotten Blade', type: 'weapon', value: 980, rarity: 'epic' },
        { id: 'soul_of_ages', name: 'Soul of Ages', type: 'accessory', value: 1650, rarity: 'legendary' }
      ]
    },
    raid_nature: {
      items: [
        { id: 'root_staff', name: 'Root Staff', type: 'weapon', value: 620, rarity: 'epic' },
        { id: 'bark_armor', name: 'Bark Armor', type: 'armor', value: 680, rarity: 'epic' },
        { id: 'seed_of_life', name: 'Seed of Life', type: 'accessory', value: 500, rarity: 'rare' },
        { id: 'tyrant_vine', name: 'Tyrant\'s Vine', type: 'weapon', value: 1500, rarity: 'legendary' },
        { id: 'world_heart', name: 'World Heart', type: 'accessory', value: 2500, rarity: 'legendary' }
      ]
    }
  };

  // ---------------------------------------------------------------------------
  // ENCOUNTER TEMPLATES — floor combat encounters
  // ---------------------------------------------------------------------------

  var ENCOUNTER_TYPES = [
    { id: 'patrol', name: 'Patrol', enemyCount: 2, difficulty: 1 },
    { id: 'ambush', name: 'Ambush', enemyCount: 3, difficulty: 2 },
    { id: 'guardian', name: 'Guardian', enemyCount: 1, difficulty: 3 },
    { id: 'horde', name: 'Horde', enemyCount: 5, difficulty: 2 },
    { id: 'elite', name: 'Elite Pack', enemyCount: 2, difficulty: 4 }
  ];

  // ---------------------------------------------------------------------------
  // ID COUNTER helpers (uses a closure counter in state)
  // ---------------------------------------------------------------------------

  function nextRaidId(state) {
    if (!state.raidCounter) state.raidCounter = 0;
    state.raidCounter++;
    return 'raid_' + state.raidCounter;
  }

  function nextPuzzleId(state) {
    if (!state.puzzleCounter) state.puzzleCounter = 0;
    state.puzzleCounter++;
    return 'puzzle_' + state.puzzleCounter;
  }

  // ---------------------------------------------------------------------------
  // RAID STATE CREATION
  // ---------------------------------------------------------------------------

  function createRaidStateStore() {
    return {
      raids: {},           // raidId -> RAID_STATE
      playerCooldowns: {}, // playerId -> { dungeonId -> tickExpires }
      playerHistory: {},   // playerId -> [{ raidId, dungeonId, completedTick, durationTicks }]
      leaderboard: {},     // dungeonId -> [{ raidId, party, durationTicks, completedTick }]
      raidCounter: 0,
      puzzleCounter: 0
    };
  }

  // ---------------------------------------------------------------------------
  // createRaid
  // ---------------------------------------------------------------------------

  function createRaid(state, leaderId, dungeonId, currentTick) {
    var dungeon = RAID_DUNGEONS[dungeonId];
    if (!dungeon) {
      return { success: false, reason: 'Unknown dungeon: ' + dungeonId };
    }

    // Check if leader is already in an active raid
    var raids = state.raids;
    for (var rid in raids) {
      var r = raids[rid];
      if (r.status === 'forming' || r.status === 'in_progress' || r.status === 'boss_fight') {
        if (r.party.indexOf(leaderId) !== -1) {
          return { success: false, reason: 'Already in an active raid' };
        }
      }
    }

    // Check cooldown
    var cooldownCheck = getPlayerCooldown(state, leaderId, dungeonId, currentTick);
    if (cooldownCheck.onCooldown) {
      return { success: false, reason: 'On cooldown for ' + cooldownCheck.remainingTicks + ' ticks' };
    }

    var raidId = nextRaidId(state);
    var raid = {
      id: raidId,
      dungeonId: dungeonId,
      party: [leaderId],
      leader: leaderId,
      status: 'forming',
      currentFloor: 0,
      bossPhase: 0,
      bossHealth: 0,
      bossMaxHealth: 0,
      startTick: 0,
      endTick: 0,
      combatLog: [],
      puzzlesSolved: 0,
      lootPool: [],
      lootDistribution: {},
      floors: [],
      activePuzzle: null,
      activeMechanic: null,
      playerHealth: {}
    };

    // Initialize leader health
    raid.playerHealth[leaderId] = 100;

    state.raids[raidId] = raid;
    return { success: true, raid: raid };
  }

  // ---------------------------------------------------------------------------
  // joinRaid
  // ---------------------------------------------------------------------------

  function joinRaid(state, playerId, raidId) {
    var raid = state.raids[raidId];
    if (!raid) {
      return { success: false, reason: 'Raid not found' };
    }
    if (raid.status !== 'forming') {
      return { success: false, reason: 'Raid is not in forming status' };
    }

    var dungeon = RAID_DUNGEONS[raid.dungeonId];
    if (raid.party.length >= dungeon.maxPlayers) {
      return { success: false, reason: 'Raid party is full' };
    }
    if (raid.party.indexOf(playerId) !== -1) {
      return { success: false, reason: 'Already in this raid' };
    }

    // Check if player is already in another active raid
    var raids = state.raids;
    for (var rid in raids) {
      var r = raids[rid];
      if (r.id !== raidId && (r.status === 'forming' || r.status === 'in_progress' || r.status === 'boss_fight')) {
        if (r.party.indexOf(playerId) !== -1) {
          return { success: false, reason: 'Already in another active raid' };
        }
      }
    }

    // Check cooldown
    var cooldownCheck = getPlayerCooldown(state, playerId, raid.dungeonId, 0);
    // We use currentTick=0 placeholder; caller may pass it, but we skip for simplicity
    // If caller wants real cooldown checks, they use a version with tick
    if (cooldownCheck.onCooldown) {
      return { success: false, reason: 'On cooldown for this dungeon' };
    }

    raid.party.push(playerId);
    raid.playerHealth[playerId] = 100;

    return { success: true, party: raid.party.slice() };
  }

  // joinRaid with tick parameter for cooldown check
  function joinRaidAtTick(state, playerId, raidId, currentTick) {
    var raid = state.raids[raidId];
    if (!raid) {
      return { success: false, reason: 'Raid not found' };
    }
    if (raid.status !== 'forming') {
      return { success: false, reason: 'Raid is not in forming status' };
    }

    var dungeon = RAID_DUNGEONS[raid.dungeonId];
    if (raid.party.length >= dungeon.maxPlayers) {
      return { success: false, reason: 'Raid party is full' };
    }
    if (raid.party.indexOf(playerId) !== -1) {
      return { success: false, reason: 'Already in this raid' };
    }

    // Check if player is already in another active raid
    var raids = state.raids;
    for (var rid in raids) {
      var r = raids[rid];
      if (r.id !== raidId && (r.status === 'forming' || r.status === 'in_progress' || r.status === 'boss_fight')) {
        if (r.party.indexOf(playerId) !== -1) {
          return { success: false, reason: 'Already in another active raid' };
        }
      }
    }

    // Check cooldown
    var cooldownCheck = getPlayerCooldown(state, playerId, raid.dungeonId, currentTick);
    if (cooldownCheck.onCooldown) {
      return { success: false, reason: 'On cooldown for this dungeon' };
    }

    raid.party.push(playerId);
    raid.playerHealth[playerId] = 100;

    return { success: true, party: raid.party.slice() };
  }

  // ---------------------------------------------------------------------------
  // leaveRaid
  // ---------------------------------------------------------------------------

  function leaveRaid(state, playerId, raidId) {
    var raid = state.raids[raidId];
    if (!raid) {
      return { success: false, reason: 'Raid not found' };
    }

    var idx = raid.party.indexOf(playerId);
    if (idx === -1) {
      return { success: false, reason: 'Player not in this raid' };
    }

    raid.party.splice(idx, 1);
    delete raid.playerHealth[playerId];

    // If leader left, assign next player as leader
    if (raid.leader === playerId) {
      if (raid.party.length > 0) {
        raid.leader = raid.party[0];
        raid.combatLog.push({ event: 'new_leader', playerId: raid.leader });
      } else {
        // No players left — abandon the raid
        raid.status = 'abandoned';
        raid.combatLog.push({ event: 'abandoned', reason: 'All players left' });
      }
    }

    return { success: true, newLeader: raid.leader || null, partySize: raid.party.length };
  }

  // ---------------------------------------------------------------------------
  // startRaid
  // ---------------------------------------------------------------------------

  function startRaid(state, raidId, currentTick, seed) {
    var raid = state.raids[raidId];
    if (!raid) {
      return { success: false, reason: 'Raid not found' };
    }
    if (raid.status !== 'forming') {
      return { success: false, reason: 'Raid is not in forming status' };
    }

    var dungeon = RAID_DUNGEONS[raid.dungeonId];
    if (raid.party.length < dungeon.minPlayers) {
      return {
        success: false,
        reason: 'Need at least ' + dungeon.minPlayers + ' players (have ' + raid.party.length + ')'
      };
    }

    var rng = mulberry32(seed || seedFrom(raidId, currentTick));
    raid.status = 'in_progress';
    raid.startTick = currentTick;
    raid.currentFloor = 1;

    // Generate all floors
    raid.floors = [];
    var puzzleFloors = [];
    // Distribute puzzles across floors (not first, not last)
    var availableFloors = [];
    for (var f = 2; f < dungeon.floors; f++) availableFloors.push(f);
    var shuffledFloors = rngShuffle(rng, availableFloors);
    for (var p = 0; p < Math.min(dungeon.puzzleCount, shuffledFloors.length); p++) {
      puzzleFloors.push(shuffledFloors[p]);
    }

    for (var fl = 1; fl <= dungeon.floors; fl++) {
      var isLast = fl === dungeon.floors;
      var hasPuzzle = !isLast && puzzleFloors.indexOf(fl) !== -1;
      var floor = {
        floorNumber: fl,
        encounters: [],
        puzzle: null,
        cleared: false,
        isBossFloor: isLast
      };

      if (isLast) {
        floor.isBossFloor = true;
      } else {
        // Generate 1-3 encounters
        var encCount = rngInt(rng, 1, 3);
        for (var e = 0; e < encCount; e++) {
          floor.encounters.push(rngPick(rng, ENCOUNTER_TYPES));
        }
        if (hasPuzzle) {
          var puzzleKeys = Object.keys(PUZZLE_TYPES);
          var puzzleType = rngPick(rng, puzzleKeys);
          floor.puzzle = {
            id: nextPuzzleId(state),
            typeId: puzzleType,
            type: PUZZLE_TYPES[puzzleType],
            solved: false,
            playerActions: []
          };
        }
      }
      raid.floors.push(floor);
    }

    raid.combatLog.push({ event: 'raid_started', tick: currentTick, partySize: raid.party.length });

    return { success: true, raid: raid, floors: raid.floors.length };
  }

  // ---------------------------------------------------------------------------
  // advanceFloor
  // ---------------------------------------------------------------------------

  function advanceFloor(state, raidId, seed) {
    var raid = state.raids[raidId];
    if (!raid) {
      return { success: false, reason: 'Raid not found' };
    }
    if (raid.status !== 'in_progress') {
      return { success: false, reason: 'Raid is not in progress' };
    }

    var dungeon = RAID_DUNGEONS[raid.dungeonId];

    // Mark current floor as cleared
    var currentFloorData = raid.floors[raid.currentFloor - 1];
    if (currentFloorData) {
      currentFloorData.cleared = true;
    }

    raid.currentFloor++;

    // Check if we've reached the boss floor
    if (raid.currentFloor > dungeon.floors) {
      return { success: false, reason: 'Already past last floor' };
    }

    var floorData = raid.floors[raid.currentFloor - 1];
    raid.combatLog.push({ event: 'floor_advanced', floor: raid.currentFloor });

    var puzzle = null;
    if (floorData && floorData.puzzle) {
      puzzle = {
        id: floorData.puzzle.id,
        typeId: floorData.puzzle.typeId,
        name: floorData.puzzle.type.name,
        description: floorData.puzzle.type.description,
        minPlayers: floorData.puzzle.type.minPlayers,
        timeLimit: floorData.puzzle.type.timeLimit,
        reward: floorData.puzzle.type.reward,
        solved: floorData.puzzle.solved
      };
    }

    return {
      success: true,
      floor: raid.currentFloor,
      encounters: floorData ? floorData.encounters : [],
      puzzle: puzzle,
      isBossFloor: floorData ? floorData.isBossFloor : false
    };
  }

  // ---------------------------------------------------------------------------
  // solvePuzzle
  // ---------------------------------------------------------------------------

  function solvePuzzle(state, raidId, puzzleId, playerActions) {
    var raid = state.raids[raidId];
    if (!raid) {
      return { success: false, reason: 'Raid not found' };
    }

    // Find the puzzle in current floor
    var floorData = raid.floors[raid.currentFloor - 1];
    if (!floorData || !floorData.puzzle || floorData.puzzle.id !== puzzleId) {
      return { success: false, reason: 'Puzzle not found on current floor' };
    }

    var puzzle = floorData.puzzle;
    if (puzzle.solved) {
      return { success: false, reason: 'Puzzle already solved' };
    }

    var puzzleType = PUZZLE_TYPES[puzzle.typeId];
    if (!puzzleType) {
      return { success: false, reason: 'Unknown puzzle type' };
    }

    // Check that enough players submitted actions
    if (!playerActions || playerActions.length < puzzleType.minPlayers) {
      return {
        success: false,
        reason: 'Need at least ' + puzzleType.minPlayers + ' players to solve this puzzle'
      };
    }

    // Check all acting players are in the raid party
    for (var i = 0; i < playerActions.length; i++) {
      if (raid.party.indexOf(playerActions[i].playerId) === -1) {
        return { success: false, reason: 'Player ' + playerActions[i].playerId + ' not in raid' };
      }
    }

    // Validate each action has required fields
    var validActions = 0;
    for (var j = 0; j < playerActions.length; j++) {
      if (playerActions[j].playerId && playerActions[j].action) {
        validActions++;
      }
    }

    var success = validActions >= puzzleType.minPlayers;

    if (success) {
      puzzle.solved = true;
      puzzle.playerActions = playerActions;
      raid.puzzlesSolved++;
      raid.combatLog.push({ event: 'puzzle_solved', puzzleId: puzzleId, typeId: puzzle.typeId });

      return {
        success: true,
        reward: puzzleType.reward,
        puzzlesSolved: raid.puzzlesSolved,
        reason: null
      };
    }

    return { success: false, reason: 'Puzzle actions invalid or incomplete' };
  }

  // ---------------------------------------------------------------------------
  // startBossFight
  // ---------------------------------------------------------------------------

  function startBossFight(state, raidId) {
    var raid = state.raids[raidId];
    if (!raid) {
      return { success: false, reason: 'Raid not found' };
    }
    if (raid.status !== 'in_progress') {
      return { success: false, reason: 'Raid must be in progress to start boss fight' };
    }

    var dungeon = RAID_DUNGEONS[raid.dungeonId];
    var boss = RAID_BOSSES[dungeon.bossId];
    if (!boss) {
      return { success: false, reason: 'Boss not found' };
    }

    // Scale boss health with party size
    var partySize = raid.party.length;
    var maxHealth = boss.baseHealth + (boss.healthPerPlayer * partySize);

    raid.status = 'boss_fight';
    raid.bossPhase = 1;
    raid.bossHealth = maxHealth;
    raid.bossMaxHealth = maxHealth;

    raid.combatLog.push({
      event: 'boss_fight_started',
      bossId: boss.id,
      bossName: boss.name,
      health: maxHealth,
      partySize: partySize
    });

    return {
      success: true,
      boss: {
        id: boss.id,
        name: boss.name,
        health: maxHealth,
        maxHealth: maxHealth,
        phase: 1,
        mechanics: boss.mechanics.slice(0, 1), // First phase mechanics
        weaknesses: boss.weaknesses,
        resistances: boss.resistances,
        totalPhases: boss.phases
      }
    };
  }

  // ---------------------------------------------------------------------------
  // attackBoss
  // ---------------------------------------------------------------------------

  function attackBoss(state, raidId, playerId, attackType, seed) {
    var raid = state.raids[raidId];
    if (!raid) {
      return { success: false, reason: 'Raid not found' };
    }
    if (raid.status !== 'boss_fight') {
      return { success: false, reason: 'Not in boss fight' };
    }
    if (raid.party.indexOf(playerId) === -1) {
      return { success: false, reason: 'Player not in raid' };
    }
    if (raid.bossHealth <= 0) {
      return { success: false, reason: 'Boss already defeated' };
    }

    var dungeon = RAID_DUNGEONS[raid.dungeonId];
    var boss = RAID_BOSSES[dungeon.bossId];
    var rng = mulberry32(seed || seedFrom(raidId, playerId));

    // Base damage
    var baseDamage = rngInt(rng, 15, 40);

    // Apply weakness bonus
    var damageMultiplier = 1.0;
    if (attackType && boss.weaknesses.indexOf(attackType) !== -1) {
      damageMultiplier = 1.5;
    }
    if (attackType && boss.resistances && boss.resistances.indexOf(attackType) !== -1) {
      damageMultiplier = 0.5;
    }

    // Apply defense reduction
    var rawDamage = Math.floor(baseDamage * damageMultiplier);
    var reducedDamage = Math.max(1, rawDamage - Math.floor(boss.defense * 0.3));
    var damage = reducedDamage;

    raid.bossHealth = Math.max(0, raid.bossHealth - damage);

    // Check if boss should phase change
    var dungeon2 = RAID_DUNGEONS[raid.dungeonId];
    var boss2 = RAID_BOSSES[dungeon2.bossId];
    var phaseThreshold = Math.floor(raid.bossMaxHealth / boss2.phases);
    var expectedPhase = boss2.phases - Math.floor(raid.bossHealth / phaseThreshold);
    expectedPhase = Math.max(1, Math.min(boss2.phases, expectedPhase));

    var phaseChanged = false;
    if (expectedPhase > raid.bossPhase && raid.bossHealth > 0) {
      phaseChanged = true;
    }

    // Trigger a random mechanic occasionally
    var mechanic = null;
    if (rng() < 0.25 && raid.bossHealth > 0) {
      var availableMechanics = boss.mechanics.slice(0, raid.bossPhase);
      mechanic = rngPick(rng, availableMechanics);
    }

    raid.combatLog.push({
      event: 'boss_attacked',
      playerId: playerId,
      attackType: attackType,
      damage: damage,
      bossHealth: raid.bossHealth,
      phaseChanged: phaseChanged,
      mechanic: mechanic
    });

    return {
      success: true,
      damage: damage,
      bossHealth: raid.bossHealth,
      bossMaxHealth: raid.bossMaxHealth,
      phaseChanged: phaseChanged,
      mechanic: mechanic
    };
  }

  // ---------------------------------------------------------------------------
  // processBossMechanic
  // ---------------------------------------------------------------------------

  function processBossMechanic(state, raidId, mechanicId, playerResponses) {
    var raid = state.raids[raidId];
    if (!raid) {
      return { success: false, reason: 'Raid not found' };
    }
    if (raid.status !== 'boss_fight') {
      return { success: false, reason: 'Not in boss fight' };
    }

    var dungeon = RAID_DUNGEONS[raid.dungeonId];
    var boss = RAID_BOSSES[dungeon.bossId];

    // Verify mechanic exists for this boss
    if (boss.mechanics.indexOf(mechanicId) === -1) {
      return { success: false, reason: 'Mechanic not found for this boss' };
    }

    var results = [];
    var responsesMap = {};

    if (playerResponses) {
      for (var i = 0; i < playerResponses.length; i++) {
        responsesMap[playerResponses[i].playerId] = playerResponses[i];
      }
    }

    for (var p = 0; p < raid.party.length; p++) {
      var pid = raid.party[p];
      var response = responsesMap[pid];
      var responded = response && response.response;
      var success = responded && response.response !== 'fail';
      var damageTaken = success ? 0 : 20;

      if (damageTaken > 0 && raid.playerHealth[pid] !== undefined) {
        raid.playerHealth[pid] = Math.max(0, raid.playerHealth[pid] - damageTaken);
      }

      results.push({
        playerId: pid,
        success: success,
        damageTaken: damageTaken
      });
    }

    raid.combatLog.push({
      event: 'mechanic_processed',
      mechanicId: mechanicId,
      results: results
    });

    return { success: true, results: results, mechanicId: mechanicId };
  }

  // ---------------------------------------------------------------------------
  // advanceBossPhase
  // ---------------------------------------------------------------------------

  function advanceBossPhase(state, raidId) {
    var raid = state.raids[raidId];
    if (!raid) {
      return { success: false, reason: 'Raid not found' };
    }
    if (raid.status !== 'boss_fight') {
      return { success: false, reason: 'Not in boss fight' };
    }

    var dungeon = RAID_DUNGEONS[raid.dungeonId];
    var boss = RAID_BOSSES[dungeon.bossId];

    if (raid.bossPhase >= boss.phases) {
      return { success: false, reason: 'Boss is already at final phase' };
    }

    raid.bossPhase++;

    // Boss heals a small amount on phase transition
    var healAmount = Math.floor(raid.bossMaxHealth * 0.05);
    raid.bossHealth = Math.min(raid.bossMaxHealth, raid.bossHealth + healAmount);

    // New mechanics become available based on phase
    var newMechanics = boss.mechanics.slice(0, raid.bossPhase);

    raid.combatLog.push({
      event: 'boss_phase_advanced',
      phase: raid.bossPhase,
      bossHealth: raid.bossHealth,
      healAmount: healAmount
    });

    return {
      success: true,
      phase: raid.bossPhase,
      newMechanics: newMechanics,
      bossHealed: healAmount,
      bossHealth: raid.bossHealth
    };
  }

  // ---------------------------------------------------------------------------
  // completeBoss
  // ---------------------------------------------------------------------------

  function completeBoss(state, raidId, seed) {
    var raid = state.raids[raidId];
    if (!raid) {
      return { success: false, reason: 'Raid not found' };
    }
    if (raid.status !== 'boss_fight') {
      return { success: false, reason: 'Not in boss fight' };
    }

    var dungeon = RAID_DUNGEONS[raid.dungeonId];
    var boss = RAID_BOSSES[dungeon.bossId];
    var rng = mulberry32(seed || seedFrom(raidId, 'loot'));

    raid.status = 'completed';
    raid.bossHealth = 0;

    // Generate loot based on party size and boss loot bonus
    var lootTableData = LOOT_TABLES[dungeon.lootTable];
    var lootItems = lootTableData ? lootTableData.items : [];
    var lootCount = Math.floor(raid.party.length * boss.lootBonus);
    lootCount = Math.max(1, Math.min(lootCount, lootItems.length));

    var shuffledLoot = rngShuffle(rng, lootItems.slice());
    raid.lootPool = shuffledLoot.slice(0, lootCount);

    // XP and Spark rewards
    var baseXp = 100 * dungeon.baseDifficulty;
    var baseSpark = 50 * dungeon.baseDifficulty;
    var puzzleBonus = raid.puzzlesSolved * 20;

    var lootDist = [];
    for (var i = 0; i < raid.party.length; i++) {
      lootDist.push({ playerId: raid.party[i], items: [] });
    }

    // Round-robin loot distribution as default
    for (var li = 0; li < raid.lootPool.length; li++) {
      var recipientIdx = li % raid.party.length;
      lootDist[recipientIdx].items.push(raid.lootPool[li]);
      raid.lootDistribution[raid.party[recipientIdx]] = raid.lootDistribution[raid.party[recipientIdx]] || [];
      raid.lootDistribution[raid.party[recipientIdx]].push(raid.lootPool[li].id);
    }

    // Record completion
    if (!state.playerHistory) state.playerHistory = {};
    if (!state.leaderboard) state.leaderboard = {};

    var durationTicks = (raid.endTick || 0) - raid.startTick;
    var entry = {
      raidId: raidId,
      dungeonId: dungeon.id,
      party: raid.party.slice(),
      durationTicks: durationTicks,
      completedTick: raid.endTick || 0
    };

    if (!state.leaderboard[dungeon.id]) state.leaderboard[dungeon.id] = [];
    state.leaderboard[dungeon.id].push(entry);
    // Sort by duration ascending (fastest first)
    state.leaderboard[dungeon.id].sort(function(a, b) { return a.durationTicks - b.durationTicks; });

    for (var p = 0; p < raid.party.length; p++) {
      var pid = raid.party[p];
      if (!state.playerHistory[pid]) state.playerHistory[pid] = [];
      state.playerHistory[pid].push({
        raidId: raidId,
        dungeonId: dungeon.id,
        completedTick: raid.endTick || 0,
        durationTicks: durationTicks
      });

      // Apply cooldown
      if (!state.playerCooldowns[pid]) state.playerCooldowns[pid] = {};
      state.playerCooldowns[pid][dungeon.id] = (raid.endTick || 0) + dungeon.cooldownTicks;
    }

    raid.combatLog.push({
      event: 'boss_defeated',
      bossId: boss.id,
      lootCount: raid.lootPool.length,
      xpAwarded: baseXp + puzzleBonus,
      sparkAwarded: baseSpark + puzzleBonus
    });

    return {
      success: true,
      loot: lootDist,
      xpAwarded: baseXp + puzzleBonus,
      sparkAwarded: baseSpark + puzzleBonus,
      puzzleBonusXp: puzzleBonus
    };
  }

  // ---------------------------------------------------------------------------
  // failRaid
  // ---------------------------------------------------------------------------

  function failRaid(state, raidId, reason) {
    var raid = state.raids[raidId];
    if (!raid) {
      return { success: false, reason: 'Raid not found' };
    }
    if (raid.status === 'completed' || raid.status === 'abandoned') {
      return { success: false, reason: 'Raid already ended' };
    }

    var dungeon = RAID_DUNGEONS[raid.dungeonId];
    raid.status = 'failed';

    // Partial rewards: XP per floor cleared
    var floorsCleared = 0;
    for (var f = 0; f < raid.floors.length; f++) {
      if (raid.floors[f].cleared) floorsCleared++;
    }

    var partialXp = Math.floor(20 * floorsCleared);
    var partialSpark = Math.floor(10 * floorsCleared);

    raid.combatLog.push({ event: 'raid_failed', reason: reason, floorsCleared: floorsCleared });

    return {
      success: true,
      reason: reason,
      partialRewards: {
        xp: partialXp,
        spark: partialSpark,
        floorsCleared: floorsCleared
      }
    };
  }

  // ---------------------------------------------------------------------------
  // distributeItem
  // ---------------------------------------------------------------------------

  function distributeItem(state, raidId, itemId, playerId) {
    var raid = state.raids[raidId];
    if (!raid) {
      return { success: false, reason: 'Raid not found' };
    }
    if (raid.party.indexOf(playerId) === -1) {
      return { success: false, reason: 'Player not in raid' };
    }

    // Find item in loot pool
    var item = null;
    for (var i = 0; i < raid.lootPool.length; i++) {
      if (raid.lootPool[i].id === itemId) {
        item = raid.lootPool[i];
        break;
      }
    }
    if (!item) {
      return { success: false, reason: 'Item not in loot pool' };
    }

    // Check item not already distributed
    for (var pid in raid.lootDistribution) {
      if (raid.lootDistribution[pid] && raid.lootDistribution[pid].indexOf(itemId) !== -1) {
        return { success: false, reason: 'Item already distributed' };
      }
    }

    if (!raid.lootDistribution[playerId]) {
      raid.lootDistribution[playerId] = [];
    }
    raid.lootDistribution[playerId].push(itemId);

    raid.combatLog.push({ event: 'item_distributed', itemId: itemId, playerId: playerId });

    return { success: true, item: item, playerId: playerId };
  }

  // ---------------------------------------------------------------------------
  // rollForLoot
  // ---------------------------------------------------------------------------

  function rollForLoot(state, raidId, itemId, seed) {
    var raid = state.raids[raidId];
    if (!raid) {
      return { success: false, reason: 'Raid not found' };
    }

    // Find item in loot pool
    var item = null;
    for (var i = 0; i < raid.lootPool.length; i++) {
      if (raid.lootPool[i].id === itemId) {
        item = raid.lootPool[i];
        break;
      }
    }
    if (!item) {
      return { success: false, reason: 'Item not in loot pool' };
    }

    var rng = mulberry32(seed || seedFrom(raidId, itemId));
    var rolls = {};
    var winnerId = null;
    var highestRoll = -1;

    for (var p = 0; p < raid.party.length; p++) {
      var pid = raid.party[p];
      var roll = Math.floor(rng() * 100) + 1;
      rolls[pid] = roll;
      if (roll > highestRoll) {
        highestRoll = roll;
        winnerId = pid;
      }
    }

    // Assign to winner
    if (!raid.lootDistribution[winnerId]) {
      raid.lootDistribution[winnerId] = [];
    }
    raid.lootDistribution[winnerId].push(itemId);

    raid.combatLog.push({ event: 'loot_rolled', itemId: itemId, winnerId: winnerId, rolls: rolls });

    return { success: true, winnerId: winnerId, rolls: rolls, item: item };
  }

  // ---------------------------------------------------------------------------
  // getRaidState
  // ---------------------------------------------------------------------------

  function getRaidState(state, raidId) {
    var raid = state.raids[raidId];
    if (!raid) {
      return null;
    }
    return raid;
  }

  // ---------------------------------------------------------------------------
  // getPlayerCooldown
  // ---------------------------------------------------------------------------

  function getPlayerCooldown(state, playerId, dungeonId, currentTick) {
    if (!state.playerCooldowns) state.playerCooldowns = {};
    var playerCds = state.playerCooldowns[playerId];
    if (!playerCds || !playerCds[dungeonId]) {
      return { onCooldown: false, remainingTicks: 0 };
    }

    var expiryTick = playerCds[dungeonId];
    if (currentTick >= expiryTick) {
      return { onCooldown: false, remainingTicks: 0 };
    }

    return { onCooldown: true, remainingTicks: expiryTick - currentTick };
  }

  // ---------------------------------------------------------------------------
  // getAvailableRaids
  // ---------------------------------------------------------------------------

  function getAvailableRaids(state, playerId, currentTick) {
    var available = [];
    for (var raidId in state.raids) {
      var raid = state.raids[raidId];
      if (raid.status !== 'forming') continue;
      if (raid.party.indexOf(playerId) !== -1) continue;

      var dungeon = RAID_DUNGEONS[raid.dungeonId];
      if (!dungeon) continue;
      if (raid.party.length >= dungeon.maxPlayers) continue;

      var cd = getPlayerCooldown(state, playerId, raid.dungeonId, currentTick);
      if (cd.onCooldown) continue;

      available.push({
        raidId: raidId,
        dungeonId: raid.dungeonId,
        dungeonName: dungeon.name,
        leader: raid.leader,
        partySize: raid.party.length,
        maxPlayers: dungeon.maxPlayers,
        minPlayers: dungeon.minPlayers,
        levelRequired: dungeon.levelRequired
      });
    }
    return available;
  }

  // ---------------------------------------------------------------------------
  // getRaidHistory
  // ---------------------------------------------------------------------------

  function getRaidHistory(state, playerId) {
    if (!state.playerHistory || !state.playerHistory[playerId]) {
      return [];
    }
    return state.playerHistory[playerId].slice();
  }

  // ---------------------------------------------------------------------------
  // getRaidLeaderboard
  // ---------------------------------------------------------------------------

  function getRaidLeaderboard(state, dungeonId, count) {
    if (!state.leaderboard || !state.leaderboard[dungeonId]) {
      return [];
    }
    var board = state.leaderboard[dungeonId].slice();
    // Sort by durationTicks ascending (fastest first)
    board.sort(function(a, b) { return a.durationTicks - b.durationTicks; });
    if (count && count > 0) {
      board = board.slice(0, count);
    }
    return board;
  }

  // ---------------------------------------------------------------------------
  // getDungeons
  // ---------------------------------------------------------------------------

  function getDungeons() {
    return RAID_DUNGEONS;
  }

  // ---------------------------------------------------------------------------
  // getBosses
  // ---------------------------------------------------------------------------

  function getBosses() {
    return RAID_BOSSES;
  }

  // ---------------------------------------------------------------------------
  // getPartyStats
  // ---------------------------------------------------------------------------

  function getPartyStats(state, raidId) {
    var raid = state.raids[raidId];
    if (!raid) {
      return null;
    }

    var dungeon = RAID_DUNGEONS[raid.dungeonId];
    var boss = RAID_BOSSES[dungeon.bossId];

    var partySize = raid.party.length;
    var scaledBossHealth = boss.baseHealth + (boss.healthPerPlayer * partySize);

    // Estimate DPS (simple model: 20 avg damage per player per attack)
    var estimatedDps = partySize * 20;

    return {
      partySize: partySize,
      party: raid.party.slice(),
      leader: raid.leader,
      dungeon: dungeon.name,
      dungeonDifficulty: dungeon.baseDifficulty,
      scaledBossHealth: scaledBossHealth,
      estimatedTotalDps: estimatedDps,
      puzzlesSolved: raid.puzzlesSolved,
      floorsTotal: dungeon.floors,
      currentFloor: raid.currentFloor
    };
  }

  // ---------------------------------------------------------------------------
  // EXPORTS
  // ---------------------------------------------------------------------------

  exports.RAID_DUNGEONS   = RAID_DUNGEONS;
  exports.RAID_BOSSES     = RAID_BOSSES;
  exports.PUZZLE_TYPES    = PUZZLE_TYPES;
  exports.LOOT_TABLES     = LOOT_TABLES;
  exports.ENCOUNTER_TYPES = ENCOUNTER_TYPES;

  exports.createRaidStateStore  = createRaidStateStore;
  exports.createRaid            = createRaid;
  exports.joinRaid              = joinRaid;
  exports.joinRaidAtTick        = joinRaidAtTick;
  exports.leaveRaid             = leaveRaid;
  exports.startRaid             = startRaid;
  exports.advanceFloor          = advanceFloor;
  exports.solvePuzzle           = solvePuzzle;
  exports.startBossFight        = startBossFight;
  exports.attackBoss            = attackBoss;
  exports.processBossMechanic   = processBossMechanic;
  exports.advanceBossPhase      = advanceBossPhase;
  exports.completeBoss          = completeBoss;
  exports.failRaid              = failRaid;
  exports.distributeItem        = distributeItem;
  exports.rollForLoot           = rollForLoot;
  exports.getRaidState          = getRaidState;
  exports.getPlayerCooldown     = getPlayerCooldown;
  exports.getAvailableRaids     = getAvailableRaids;
  exports.getRaidHistory        = getRaidHistory;
  exports.getRaidLeaderboard    = getRaidLeaderboard;
  exports.getDungeons           = getDungeons;
  exports.getBosses             = getBosses;
  exports.getPartyStats         = getPartyStats;

})(typeof module !== 'undefined' ? module.exports : (window.RaidSystem = {}));
