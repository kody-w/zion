/**
 * treasure_maps.js — ZION Procedural Treasure Map System
 *
 * Features:
 *   - Procedurally generated maps with 3-7 clue steps (seeded by map ID)
 *   - Rarity tiers: common / uncommon / rare / epic / legendary
 *   - Riddle-style clue chains pointing to zones, landmarks, coordinates
 *   - Maps are tradeable inventory items
 *   - Reward caches (Spark, items, cosmetics, lore) scaled by rarity
 *   - Map crafting from fragments found in exploration
 *   - Zone-gated clue steps
 *   - Time-limited (expiring) maps
 *   - Per-player map history
 *   - Shared / co-op map solving with group rewards
 *   - mulberry32 seeded PRNG for deterministic generation
 *
 * UMD module — works in browser (window.TreasureMaps) and Node.js (require).
 */
(function(exports) {
  'use strict';

  // --------------------------------------------------------------------------
  // Optional dependency guards
  // --------------------------------------------------------------------------
  var Exploration  = (typeof window !== 'undefined' && window.Exploration)  || {};
  var LoreDiscovery= (typeof window !== 'undefined' && window.LoreDiscovery)|| {};
  var Anchors      = (typeof window !== 'undefined' && window.Anchors)      || {};
  var Inventory    = (typeof window !== 'undefined' && window.Inventory)    || {};
  var Loot         = (typeof window !== 'undefined' && window.Loot)         || {};

  // --------------------------------------------------------------------------
  // mulberry32 seeded PRNG
  // --------------------------------------------------------------------------

  function createRng(seed) {
    var s = (seed >>> 0) || 0xDEADBEEF;
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

  function seedFromId(id) {
    return hashString(String(id));
  }

  // --------------------------------------------------------------------------
  // Constants
  // --------------------------------------------------------------------------

  var RARITY_TIERS = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

  var RARITY_META = {
    common:    { label: 'Common',    color: '#9e9e9e', clueMin: 3, clueMax: 3, fragmentsNeeded: 2, expiryDays: null, sparkMin: 20,  sparkMax: 60   },
    uncommon:  { label: 'Uncommon',  color: '#4caf50', clueMin: 3, clueMax: 4, fragmentsNeeded: 3, expiryDays: 7,   sparkMin: 60,  sparkMax: 150  },
    rare:      { label: 'Rare',      color: '#2196f3', clueMin: 4, clueMax: 5, fragmentsNeeded: 4, expiryDays: 5,   sparkMin: 150, sparkMax: 400  },
    epic:      { label: 'Epic',      color: '#9c27b0', clueMin: 5, clueMax: 6, fragmentsNeeded: 5, expiryDays: 3,   sparkMin: 400, sparkMax: 900  },
    legendary: { label: 'Legendary', color: '#ff9800', clueMin: 6, clueMax: 7, fragmentsNeeded: 6, expiryDays: 2,   sparkMin: 900, sparkMax: 2000 }
  };

  // Zone definitions mirroring world layout
  var ZONES = [
    { id: 'nexus',     name: 'The Nexus',      cx: 0,    cz: 0,    radius: 100 },
    { id: 'gardens',   name: 'The Gardens',    cx: 200,  cz: 30,   radius: 130 },
    { id: 'athenaeum', name: 'The Athenaeum',  cx: 100,  cz: -220, radius: 120 },
    { id: 'studio',    name: 'The Studio',     cx: -200, cz: -100, radius: 120 },
    { id: 'wilds',     name: 'The Wilds',      cx: -30,  cz: 260,  radius: 140 },
    { id: 'agora',     name: 'The Agora',      cx: -190, cz: 120,  radius: 110 },
    { id: 'commons',   name: 'The Commons',    cx: 170,  cz: 190,  radius: 110 },
    { id: 'arena',     name: 'The Arena',      cx: 0,    cz: -240, radius: 100 }
  ];

  var ZONE_IDS = ZONES.map(function(z) { return z.id; });

  // Landmarks used in clue generation
  var LANDMARKS = [
    { id: 'ancient_stone',   name: 'Ancient Standing Stone',   zone: 'wilds'     },
    { id: 'crystal_spring',  name: 'Crystal Spring',           zone: 'gardens'   },
    { id: 'iron_gate',       name: 'Iron Gate',                zone: 'nexus'     },
    { id: 'sunken_altar',    name: 'Sunken Altar',             zone: 'athenaeum' },
    { id: 'forge_ruins',     name: 'Forge Ruins',              zone: 'studio'    },
    { id: 'market_fountain', name: 'Market Fountain',          zone: 'agora'     },
    { id: 'gathering_oak',   name: 'Gathering Oak',            zone: 'commons'   },
    { id: 'arena_pillar',    name: 'Arena Pillar',             zone: 'arena'     },
    { id: 'moonlit_pool',    name: 'Moonlit Pool',             zone: 'wilds'     },
    { id: 'scholar_tomb',    name: 'Scholar Tomb',             zone: 'athenaeum' },
    { id: 'traders_post',    name: 'Trader Post',              zone: 'nexus'     },
    { id: 'hollow_tree',     name: 'Hollow Tree',              zone: 'gardens'   },
    { id: 'runed_bridge',    name: 'Runed Bridge',             zone: 'agora'     },
    { id: 'champions_dais',  name: "Champion's Dais",          zone: 'arena'     },
    { id: 'bell_tower',      name: 'Bell Tower',               zone: 'commons'   },
    { id: 'ember_shrine',    name: 'Ember Shrine',             zone: 'studio'    }
  ];

  // Riddle-style clue templates
  var CLUE_TEMPLATES = [
    'Seek the shadow of {landmark} where {direction} winds blow.',
    'In {zone}, beneath the {element}, your next step lies hidden.',
    'Where the {creature} rests at dusk, look to the {direction} wall.',
    'The {color} mark carved by ancients points the way from {landmark}.',
    'Count {number} paces {direction} from the heart of {zone}.',
    'When {element} meets stone in {zone}, the cache awaits below.',
    'Follow the trail of {color} moss past {landmark} at dawn.',
    'At the confluence of {zone} and memory, dig where roots are exposed.',
    'The map hides its truth: stand at {landmark} and face {direction}.',
    'Beneath the {element} in {zone}, where no footstep lingers long.',
    'Where {creature} calls echo longest, the treasure waits in shadow.',
    '{landmark} guards a secret — three steps {direction}, then one down.',
    'In the oldest corner of {zone}, where {color} lichen clings to stone.',
    'As the sun sets over {zone}, its light reveals the mark near {landmark}.',
    'The wandering soul who reaches {landmark} finds a message etched in stone.',
    'Two realms meet at the border of {zone} — there your fortune sleeps.',
    'Look not at the peak but at the base of {landmark} for the hollow place.',
    'Where the {element} flows slowest in {zone}, press your hand to the bank.',
    'A {creature} once nested here, leaving {color} feathers as your guide.',
    'Night falls on {zone}; where the {color} star aligns with {landmark}.'
  ];

  var DIRECTIONS   = ['north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest'];
  var ELEMENTS     = ['water', 'fire', 'wind', 'earth', 'stone', 'root', 'mist', 'ember'];
  var CREATURES    = ['fox', 'raven', 'wolf', 'owl', 'deer', 'serpent', 'hawk', 'hare'];
  var COLORS       = ['silver', 'amber', 'crimson', 'azure', 'emerald', 'violet', 'golden', 'obsidian'];
  var NUMBERS      = ['seven', 'three', 'nine', 'five', 'twelve', 'four', 'six', 'eight'];

  // Reward pools indexed by rarity
  var REWARD_ITEMS = {
    common:    ['herbs', 'stone', 'wood', 'feather', 'clay'],
    uncommon:  ['iron_ore', 'crystal', 'scroll', 'bone', 'shell'],
    rare:      ['gold_dust', 'ancient_coin', 'fossil', 'gem_ruby', 'gem_sapphire'],
    epic:      ['star_fragment', 'elixir', 'arcane_dust', 'void_shard', 'phoenix_feather'],
    legendary: ['prime_crystal', 'world_shard', 'eternal_flame', 'genesis_core', 'cosmic_dust']
  };

  var REWARD_LORE = {
    common:    [],
    uncommon:  ['lore_001', 'lore_002', 'lore_003'],
    rare:      ['lore_004', 'lore_005', 'lore_006', 'lore_007'],
    epic:      ['lore_008', 'lore_009', 'lore_010', 'lore_011'],
    legendary: ['lore_012', 'lore_013', 'lore_014', 'lore_015', 'lore_016']
  };

  var REWARD_COSMETICS = {
    common:    [],
    uncommon:  [],
    rare:      ['title_cartographer', 'trail_blue'],
    epic:      ['aura_treasure', 'title_treasure_hunter', 'trail_gold'],
    legendary: ['aura_legendary_finder', 'title_legend', 'outfit_explorer', 'trail_rainbow']
  };

  // Fragment definitions for map crafting
  var FRAGMENT_TYPES = [
    { id: 'map_fragment_common',    name: 'Tattered Map Fragment',    targetRarity: 'common'    },
    { id: 'map_fragment_uncommon',  name: 'Worn Map Fragment',        targetRarity: 'uncommon'  },
    { id: 'map_fragment_rare',      name: 'Aged Map Fragment',        targetRarity: 'rare'      },
    { id: 'map_fragment_epic',      name: 'Ancient Map Fragment',     targetRarity: 'epic'      },
    { id: 'map_fragment_legendary', name: 'Mythic Map Fragment',      targetRarity: 'legendary' }
  ];

  // Co-op bonus multipliers
  var COOP_BONUS = {
    1: 1.0,
    2: 1.3,
    3: 1.6,
    4: 1.9,
    5: 2.2
  };

  // --------------------------------------------------------------------------
  // Internal helpers
  // --------------------------------------------------------------------------

  function pick(arr, rng) {
    return arr[Math.floor(rng() * arr.length)];
  }

  function pickN(arr, n, rng) {
    var copy = arr.slice();
    var result = [];
    for (var i = 0; i < n && copy.length > 0; i++) {
      var idx = Math.floor(rng() * copy.length);
      result.push(copy.splice(idx, 1)[0]);
    }
    return result;
  }

  function randInt(min, max, rng) {
    return min + Math.floor(rng() * (max - min + 1));
  }

  function interpolateClue(template, rng) {
    return template
      .replace('{landmark}',  pick(LANDMARKS, rng).name)
      .replace('{zone}',      pick(ZONES, rng).name)
      .replace('{direction}', pick(DIRECTIONS, rng))
      .replace('{element}',   pick(ELEMENTS, rng))
      .replace('{creature}',  pick(CREATURES, rng))
      .replace('{color}',     pick(COLORS, rng))
      .replace('{number}',    pick(NUMBERS, rng));
  }

  function generateCoords(rng) {
    return {
      x: Math.round((rng() * 1200) - 600),
      z: Math.round((rng() * 1200) - 600)
    };
  }

  // --------------------------------------------------------------------------
  // Map Generation
  // --------------------------------------------------------------------------

  /**
   * Generate a complete treasure map from a mapId and rarity.
   * All output is deterministic given the same mapId.
   *
   * @param {string} mapId   - Unique map identifier (e.g. "map_abc123")
   * @param {string} rarity  - One of RARITY_TIERS
   * @param {object} [opts]  - { expiresAt: number|null, sharedWith: string[] }
   * @returns {object} Map definition
   */
  function generateMap(mapId, rarity, opts) {
    opts = opts || {};
    if (!mapId) { throw new Error('mapId is required'); }
    if (RARITY_TIERS.indexOf(rarity) === -1) {
      throw new Error('Invalid rarity: ' + rarity);
    }

    var meta  = RARITY_META[rarity];
    var rng   = createRng(seedFromId(mapId));
    var clueCount = randInt(meta.clueMin, meta.clueMax, rng);

    // Build clue chain
    var clues = [];
    for (var i = 0; i < clueCount; i++) {
      var template = pick(CLUE_TEMPLATES, rng);
      var zoneId   = pick(ZONE_IDS, rng);
      var landmark = pick(LANDMARKS, rng);
      var coords   = generateCoords(rng);
      clues.push({
        step:     i + 1,
        text:     interpolateClue(template, rng),
        zoneId:   zoneId,
        landmark: landmark.id,
        coords:   coords,
        solved:   false
      });
    }

    // Final cache location
    var finalZone   = pick(ZONE_IDS, rng);
    var finalCoords = generateCoords(rng);

    // Reward cache
    var rewards = buildRewardCache(rarity, rng);

    // Expiry
    var expiresAt = null;
    if (opts.expiresAt !== undefined) {
      expiresAt = opts.expiresAt;
    } else if (meta.expiryDays !== null) {
      expiresAt = Date.now() + meta.expiryDays * 24 * 60 * 60 * 1000;
    }

    return {
      id:          mapId,
      rarity:      rarity,
      label:       meta.label,
      color:       meta.color,
      clues:       clues,
      clueCount:   clueCount,
      finalZone:   finalZone,
      finalCoords: finalCoords,
      rewards:     rewards,
      expiresAt:   expiresAt,
      sharedWith:  opts.sharedWith || [],
      createdAt:   opts.createdAt || Date.now(),
      type:        'treasure_map'
    };
  }

  /**
   * Build reward cache for a given rarity.
   */
  function buildRewardCache(rarity, rng) {
    var meta      = RARITY_META[rarity];
    var itemPool  = REWARD_ITEMS[rarity];
    var lorePool  = REWARD_LORE[rarity];
    var cosPool   = REWARD_COSMETICS[rarity];

    // Spark reward
    var spark = randInt(meta.sparkMin, meta.sparkMax, rng);

    // Items — 1-3 items from pool
    var itemCount = randInt(1, 3, rng);
    var items = [];
    for (var i = 0; i < itemCount; i++) {
      items.push({
        id:  pick(itemPool, rng),
        qty: randInt(1, rarityItemQty(rarity), rng)
      });
    }

    // Lore entry (non-common maps)
    var loreEntry = null;
    if (lorePool.length > 0 && rng() < rarityLoreChance(rarity)) {
      loreEntry = pick(lorePool, rng);
    }

    // Cosmetic (rare+ maps)
    var cosmetic = null;
    if (cosPool.length > 0 && rng() < rarityCosmChance(rarity)) {
      cosmetic = pick(cosPool, rng);
    }

    return {
      spark:    spark,
      items:    items,
      lore:     loreEntry,
      cosmetic: cosmetic
    };
  }

  function rarityItemQty(rarity) {
    var map = { common: 3, uncommon: 5, rare: 8, epic: 12, legendary: 20 };
    return map[rarity] || 3;
  }

  function rarityLoreChance(rarity) {
    var map = { common: 0, uncommon: 0.3, rare: 0.6, epic: 0.85, legendary: 1.0 };
    return map[rarity] || 0;
  }

  function rarityCosmChance(rarity) {
    var map = { common: 0, uncommon: 0, rare: 0.4, epic: 0.7, legendary: 1.0 };
    return map[rarity] || 0;
  }

  // --------------------------------------------------------------------------
  // Rarity selection
  // --------------------------------------------------------------------------

  var RARITY_WEIGHTS = {
    common:    50,
    uncommon:  25,
    rare:      15,
    epic:       7,
    legendary:  3
  };

  /**
   * Select a rarity tier using weighted random roll.
   * @param {function} rng - PRNG function
   * @returns {string} rarity
   */
  function rollRarity(rng) {
    var total = 0;
    for (var r in RARITY_WEIGHTS) { total += RARITY_WEIGHTS[r]; }
    var roll = rng() * total;
    var cum  = 0;
    for (var i = 0; i < RARITY_TIERS.length; i++) {
      var tier = RARITY_TIERS[i];
      cum += RARITY_WEIGHTS[tier];
      if (roll < cum) { return tier; }
    }
    return 'common';
  }

  // --------------------------------------------------------------------------
  // Map State — clue progress tracking
  // --------------------------------------------------------------------------

  /**
   * Initialise per-player map progress state.
   * @param {object} state   - Global game state
   * @param {string} playerId
   */
  function ensurePlayerState(state, playerId) {
    if (!state.treasureMaps) { state.treasureMaps = {}; }
    if (!state.treasureMaps[playerId]) {
      state.treasureMaps[playerId] = {
        activeMaps:    {},   // mapId -> { clueProgress, startedAt }
        completedMaps: [],   // [{ mapId, completedAt, rarity, rewards }]
        fragments:     {},   // fragmentTypeId -> qty
        ownedMaps:     []    // [mapId] — maps held as inventory items
      };
    }
    return state.treasureMaps[playerId];
  }

  // --------------------------------------------------------------------------
  // Clue Solving
  // --------------------------------------------------------------------------

  /**
   * Attempt to advance a clue in a player's active map.
   *
   * @param {object} map        - Map definition from generateMap
   * @param {string} playerId
   * @param {number} clueStep   - 1-based clue index
   * @param {object} playerPos  - { x, z } current position
   * @param {string} currentZone- Current zone id
   * @param {object} state
   * @returns {{ success: boolean, message: string, nextClue?: object, complete?: boolean }}
   */
  function solveClue(map, playerId, clueStep, playerPos, currentZone, state) {
    if (!map || !map.clues) {
      return { success: false, message: 'Invalid map' };
    }

    // Check expiry
    if (isMapExpired(map)) {
      return { success: false, message: 'This map has expired.' };
    }

    var pState = ensurePlayerState(state, playerId);
    var active = pState.activeMaps[map.id];
    if (!active) {
      return { success: false, message: 'Map not active. Activate it first.' };
    }

    var clueIdx = clueStep - 1;
    if (clueIdx < 0 || clueIdx >= map.clues.length) {
      return { success: false, message: 'Invalid clue step.' };
    }

    // Must solve clues in order
    if (clueIdx !== active.clueProgress) {
      return { success: false, message: 'Solve clue ' + (active.clueProgress + 1) + ' first.' };
    }

    var clue = map.clues[clueIdx];

    // Zone requirement check
    if (currentZone && clue.zoneId && currentZone !== clue.zoneId) {
      return {
        success: false,
        message: 'You must be in ' + clue.zoneId + ' to solve this clue.'
      };
    }

    // Proximity check (within 30 units of clue coords)
    var dist = Math.sqrt(
      Math.pow(playerPos.x - clue.coords.x, 2) +
      Math.pow(playerPos.z - clue.coords.z, 2)
    );
    if (dist > 30) {
      return {
        success: false,
        message: 'You are not close enough to the clue location. Distance: ' + Math.round(dist)
      };
    }

    // Mark clue solved
    active.clueProgress++;
    clue.solved = true;

    // Check if map is complete
    if (active.clueProgress >= map.clues.length) {
      return {
        success:  true,
        message:  'Final clue solved! Head to the cache location.',
        complete: true,
        nextClue: null
      };
    }

    return {
      success:  true,
      message:  'Clue ' + clueStep + ' solved!',
      complete: false,
      nextClue: map.clues[active.clueProgress]
    };
  }

  // --------------------------------------------------------------------------
  // Map Activation / Deactivation
  // --------------------------------------------------------------------------

  /**
   * Activate a map for a player (begin tracking clue progress).
   */
  function activateMap(map, playerId, state) {
    if (!map) { return { success: false, message: 'No map provided.' }; }
    if (isMapExpired(map)) {
      return { success: false, message: 'Cannot activate an expired map.' };
    }

    var pState = ensurePlayerState(state, playerId);

    if (pState.activeMaps[map.id]) {
      return { success: false, message: 'Map is already active.' };
    }

    // Shared maps: player must be in sharedWith or be primary holder
    if (map.sharedWith && map.sharedWith.length > 0) {
      if (map.sharedWith.indexOf(playerId) === -1) {
        return { success: false, message: 'You are not a participant of this shared map.' };
      }
    }

    pState.activeMaps[map.id] = {
      clueProgress: 0,
      startedAt:    Date.now()
    };

    return { success: true, message: 'Map activated. Find clue 1: ' + map.clues[0].text };
  }

  /**
   * Deactivate / abandon an active map.
   */
  function deactivateMap(mapId, playerId, state) {
    var pState = ensurePlayerState(state, playerId);
    if (!pState.activeMaps[mapId]) {
      return { success: false, message: 'Map is not active.' };
    }
    delete pState.activeMaps[mapId];
    return { success: true, message: 'Map abandoned.' };
  }

  // --------------------------------------------------------------------------
  // Cache Discovery (map completion)
  // --------------------------------------------------------------------------

  /**
   * Claim the reward cache at the end of a completed map.
   *
   * @param {object} map
   * @param {string} playerId
   * @param {object} playerPos
   * @param {object} state
   * @param {string[]} [coopPlayers] - additional co-op participants
   * @returns {{ success: boolean, rewards?: object, message: string }}
   */
  function claimCache(map, playerId, playerPos, state, coopPlayers) {
    if (!map) { return { success: false, message: 'Invalid map.' }; }
    if (isMapExpired(map)) {
      return { success: false, message: 'This map has expired.' };
    }

    var pState = ensurePlayerState(state, playerId);
    var active = pState.activeMaps[map.id];
    if (!active) {
      return { success: false, message: 'Map is not active.' };
    }
    if (active.clueProgress < map.clues.length) {
      return { success: false, message: 'All clues must be solved before claiming.' };
    }

    // Proximity to final cache
    var dist = Math.sqrt(
      Math.pow(playerPos.x - map.finalCoords.x, 2) +
      Math.pow(playerPos.z - map.finalCoords.z, 2)
    );
    if (dist > 30) {
      return {
        success: false,
        message: 'You are not at the cache location. Distance: ' + Math.round(dist)
      };
    }

    // Apply co-op multiplier
    var participants = coopPlayers ? [playerId].concat(coopPlayers) : [playerId];
    var count        = Math.min(participants.length, 5);
    var multiplier   = COOP_BONUS[count] || 1.0;

    var finalRewards = applyCoopMultiplier(map.rewards, multiplier);

    // Record completion
    var completionRecord = {
      mapId:       map.id,
      rarity:      map.rarity,
      completedAt: Date.now(),
      rewards:     finalRewards,
      participants: participants,
      coopBonus:   multiplier
    };
    pState.completedMaps.push(completionRecord);
    delete pState.activeMaps[map.id];

    // Remove from ownedMaps
    var idx = pState.ownedMaps.indexOf(map.id);
    if (idx !== -1) { pState.ownedMaps.splice(idx, 1); }

    return {
      success:  true,
      message:  'Cache claimed! ' + (multiplier > 1 ? 'Co-op bonus x' + multiplier + '!' : ''),
      rewards:  finalRewards,
      record:   completionRecord
    };
  }

  function applyCoopMultiplier(rewards, multiplier) {
    if (multiplier === 1) { return rewards; }
    var scaled = {
      spark:    Math.round(rewards.spark * multiplier),
      items:    rewards.items.map(function(it) {
        return { id: it.id, qty: Math.round(it.qty * multiplier) };
      }),
      lore:     rewards.lore,
      cosmetic: rewards.cosmetic
    };
    return scaled;
  }

  // --------------------------------------------------------------------------
  // Map Expiry
  // --------------------------------------------------------------------------

  function isMapExpired(map) {
    if (!map.expiresAt) { return false; }
    return Date.now() > map.expiresAt;
  }

  function timeRemaining(map) {
    if (!map.expiresAt) { return null; }
    var ms = map.expiresAt - Date.now();
    return ms > 0 ? ms : 0;
  }

  // --------------------------------------------------------------------------
  // Map Trading
  // --------------------------------------------------------------------------

  /**
   * Transfer map ownership between players.
   */
  function tradeMap(mapId, fromPlayerId, toPlayerId, state) {
    var fromState = ensurePlayerState(state, fromPlayerId);
    var toState   = ensurePlayerState(state, toPlayerId);

    var fromIdx = fromState.ownedMaps.indexOf(mapId);
    if (fromIdx === -1) {
      return { success: false, message: 'Sender does not own this map.' };
    }

    // Cannot trade an active map
    if (fromState.activeMaps[mapId]) {
      return { success: false, message: 'Cannot trade an active map. Abandon it first.' };
    }

    fromState.ownedMaps.splice(fromIdx, 1);
    toState.ownedMaps.push(mapId);

    return { success: true, message: 'Map traded successfully.' };
  }

  /**
   * Give a newly generated map to a player.
   */
  function giveMap(mapId, playerId, state) {
    var pState = ensurePlayerState(state, playerId);
    if (pState.ownedMaps.indexOf(mapId) !== -1) {
      return { success: false, message: 'Player already owns this map.' };
    }
    pState.ownedMaps.push(mapId);
    return { success: true };
  }

  // --------------------------------------------------------------------------
  // Fragment Collection and Map Crafting
  // --------------------------------------------------------------------------

  /**
   * Award a map fragment to a player.
   */
  function awardFragment(fragmentTypeId, qty, playerId, state) {
    var frag = getFragmentType(fragmentTypeId);
    if (!frag) { return { success: false, message: 'Unknown fragment type.' }; }
    if (!qty || qty < 1) { return { success: false, message: 'Invalid quantity.' }; }

    var pState = ensurePlayerState(state, playerId);
    pState.fragments[fragmentTypeId] = (pState.fragments[fragmentTypeId] || 0) + qty;
    return {
      success: true,
      message: 'Received ' + qty + 'x ' + frag.name,
      total:   pState.fragments[fragmentTypeId]
    };
  }

  /**
   * Craft a treasure map from fragments.
   * Consumes the required number of fragments and generates a new map.
   *
   * @param {string} fragmentTypeId
   * @param {string} playerId
   * @param {object} state
   * @returns {{ success: boolean, map?: object, message: string }}
   */
  function craftMapFromFragments(fragmentTypeId, playerId, state) {
    var frag = getFragmentType(fragmentTypeId);
    if (!frag) { return { success: false, message: 'Unknown fragment type.' }; }

    var rarity  = frag.targetRarity;
    var meta    = RARITY_META[rarity];
    var needed  = meta.fragmentsNeeded;
    var pState  = ensurePlayerState(state, playerId);
    var held    = pState.fragments[fragmentTypeId] || 0;

    if (held < needed) {
      return {
        success: false,
        message: 'Need ' + needed + ' fragments, have ' + held + '.'
      };
    }

    // Consume fragments
    pState.fragments[fragmentTypeId] -= needed;

    // Generate map
    var mapId = 'map_' + playerId + '_' + Date.now().toString(36) + '_' + rarity;
    var map   = generateMap(mapId, rarity);
    giveMap(mapId, playerId, state);

    // Store map definition in state
    if (!state.mapDefinitions) { state.mapDefinitions = {}; }
    state.mapDefinitions[mapId] = map;

    return {
      success:  true,
      message:  'Crafted a ' + meta.label + ' treasure map!',
      map:      map,
      mapId:    mapId
    };
  }

  function getFragmentType(id) {
    for (var i = 0; i < FRAGMENT_TYPES.length; i++) {
      if (FRAGMENT_TYPES[i].id === id) { return FRAGMENT_TYPES[i]; }
    }
    return null;
  }

  // --------------------------------------------------------------------------
  // Shared / Co-op Maps
  // --------------------------------------------------------------------------

  /**
   * Create a shared map that multiple players can work on together.
   *
   * @param {string} mapId
   * @param {string} rarity
   * @param {string[]} participants - array of player IDs
   * @param {object} state
   * @returns {{ success: boolean, map?: object }}
   */
  function createSharedMap(mapId, rarity, participants, state) {
    if (!participants || participants.length < 2) {
      return { success: false, message: 'Shared maps require at least 2 participants.' };
    }
    if (participants.length > 5) {
      return { success: false, message: 'Shared maps support up to 5 participants.' };
    }

    var map = generateMap(mapId, rarity, { sharedWith: participants });

    if (!state.mapDefinitions) { state.mapDefinitions = {}; }
    state.mapDefinitions[mapId] = map;

    // Give map to all participants
    participants.forEach(function(pid) {
      giveMap(mapId, pid, state);
    });

    return { success: true, map: map };
  }

  /**
   * Activate a shared map for all participants simultaneously.
   */
  function activateSharedMap(mapId, state) {
    var map = state.mapDefinitions && state.mapDefinitions[mapId];
    if (!map) { return { success: false, message: 'Map definition not found.' }; }
    if (!map.sharedWith || map.sharedWith.length < 2) {
      return { success: false, message: 'Not a shared map.' };
    }

    var results = [];
    map.sharedWith.forEach(function(pid) {
      results.push({ playerId: pid, result: activateMap(map, pid, state) });
    });
    return { success: true, results: results };
  }

  // --------------------------------------------------------------------------
  // Map History
  // --------------------------------------------------------------------------

  /**
   * Get completed map history for a player.
   */
  function getMapHistory(playerId, state) {
    var pState = ensurePlayerState(state, playerId);
    return pState.completedMaps.slice();
  }

  /**
   * Get active maps for a player.
   */
  function getActiveMaps(playerId, state) {
    var pState = ensurePlayerState(state, playerId);
    var result = [];
    for (var mapId in pState.activeMaps) {
      result.push({ mapId: mapId, progress: pState.activeMaps[mapId] });
    }
    return result;
  }

  /**
   * Get owned (inventory) maps for a player.
   */
  function getOwnedMaps(playerId, state) {
    var pState = ensurePlayerState(state, playerId);
    return pState.ownedMaps.slice();
  }

  /**
   * Get fragment inventory for a player.
   */
  function getFragments(playerId, state) {
    var pState = ensurePlayerState(state, playerId);
    return Object.assign ? Object.assign({}, pState.fragments) : JSON.parse(JSON.stringify(pState.fragments));
  }

  /**
   * Count completed maps by rarity for a player.
   */
  function countCompletedByRarity(playerId, state) {
    var pState  = ensurePlayerState(state, playerId);
    var counts  = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 };
    pState.completedMaps.forEach(function(rec) {
      if (counts.hasOwnProperty(rec.rarity)) { counts[rec.rarity]++; }
    });
    return counts;
  }

  // --------------------------------------------------------------------------
  // Protocol Message Handler
  // --------------------------------------------------------------------------

  /**
   * Handle treasure map protocol messages.
   *
   * Supported types:
   *   treasure_map_activate, treasure_map_solve_clue, treasure_map_claim,
   *   treasure_map_trade, treasure_map_craft, treasure_map_award_fragment
   *
   * @param {object} msg   - Protocol message { type, from, payload, ... }
   * @param {object} state - Global game state
   * @returns {object} Result
   */
  function handleMessage(msg, state) {
    if (!msg || !msg.type) { return { success: false, message: 'Invalid message.' }; }
    var playerId = msg.from;
    var payload  = msg.payload || {};

    switch (msg.type) {
      case 'treasure_map_activate': {
        var mapDef = getMapDef(payload.mapId, state);
        if (!mapDef) { return { success: false, message: 'Map not found.' }; }
        return activateMap(mapDef, playerId, state);
      }

      case 'treasure_map_solve_clue': {
        var mapDef2 = getMapDef(payload.mapId, state);
        if (!mapDef2) { return { success: false, message: 'Map not found.' }; }
        return solveClue(
          mapDef2, playerId,
          payload.clueStep,
          payload.position || { x: 0, z: 0 },
          payload.zone || null,
          state
        );
      }

      case 'treasure_map_claim': {
        var mapDef3 = getMapDef(payload.mapId, state);
        if (!mapDef3) { return { success: false, message: 'Map not found.' }; }
        return claimCache(mapDef3, playerId, payload.position || { x: 0, z: 0 }, state, payload.coopPlayers || []);
      }

      case 'treasure_map_trade': {
        return tradeMap(payload.mapId, playerId, payload.toPlayerId, state);
      }

      case 'treasure_map_craft': {
        return craftMapFromFragments(payload.fragmentTypeId, playerId, state);
      }

      case 'treasure_map_award_fragment': {
        return awardFragment(payload.fragmentTypeId, payload.qty || 1, playerId, state);
      }

      case 'treasure_map_abandon': {
        return deactivateMap(payload.mapId, playerId, state);
      }

      default:
        return { success: false, message: 'Unknown message type: ' + msg.type };
    }
  }

  function getMapDef(mapId, state) {
    return state.mapDefinitions && state.mapDefinitions[mapId];
  }

  // --------------------------------------------------------------------------
  // Utility / Query Functions
  // --------------------------------------------------------------------------

  /**
   * Get a zone definition by id.
   */
  function getZone(zoneId) {
    for (var i = 0; i < ZONES.length; i++) {
      if (ZONES[i].id === zoneId) { return ZONES[i]; }
    }
    return null;
  }

  /**
   * Describe the current clue for a player.
   */
  function getCurrentClue(map, playerId, state) {
    var pState = ensurePlayerState(state, playerId);
    var active = pState.activeMaps[map.id];
    if (!active) { return null; }
    if (active.clueProgress >= map.clues.length) { return null; }
    return map.clues[active.clueProgress];
  }

  /**
   * Summarise map as an inventory item descriptor.
   */
  function toInventoryItem(map) {
    return {
      id:       map.id,
      type:     'treasure_map',
      name:     map.label + ' Treasure Map',
      rarity:   map.rarity,
      color:    map.color,
      tradeable: true,
      expiresAt: map.expiresAt,
      payload:  { mapId: map.id }
    };
  }

  /**
   * Check whether a player has completed a specific map.
   */
  function hasCompleted(mapId, playerId, state) {
    var pState = ensurePlayerState(state, playerId);
    return pState.completedMaps.some(function(r) { return r.mapId === mapId; });
  }

  /**
   * Get total Spark earned from treasure maps by a player.
   */
  function totalSparkEarned(playerId, state) {
    var pState = ensurePlayerState(state, playerId);
    return pState.completedMaps.reduce(function(sum, rec) {
      return sum + (rec.rewards ? rec.rewards.spark : 0);
    }, 0);
  }

  // --------------------------------------------------------------------------
  // Exports
  // --------------------------------------------------------------------------

  exports.RARITY_TIERS       = RARITY_TIERS;
  exports.RARITY_META        = RARITY_META;
  exports.RARITY_WEIGHTS     = RARITY_WEIGHTS;
  exports.ZONES              = ZONES;
  exports.ZONE_IDS           = ZONE_IDS;
  exports.LANDMARKS          = LANDMARKS;
  exports.CLUE_TEMPLATES     = CLUE_TEMPLATES;
  exports.FRAGMENT_TYPES     = FRAGMENT_TYPES;
  exports.REWARD_ITEMS       = REWARD_ITEMS;
  exports.REWARD_LORE        = REWARD_LORE;
  exports.REWARD_COSMETICS   = REWARD_COSMETICS;
  exports.COOP_BONUS         = COOP_BONUS;

  exports.createRng          = createRng;
  exports.hashString         = hashString;
  exports.seedFromId         = seedFromId;
  exports.rollRarity         = rollRarity;

  exports.generateMap        = generateMap;
  exports.buildRewardCache   = buildRewardCache;
  exports.isMapExpired       = isMapExpired;
  exports.timeRemaining      = timeRemaining;

  exports.activateMap        = activateMap;
  exports.deactivateMap      = deactivateMap;
  exports.solveClue          = solveClue;
  exports.claimCache         = claimCache;

  exports.tradeMap           = tradeMap;
  exports.giveMap            = giveMap;

  exports.awardFragment      = awardFragment;
  exports.craftMapFromFragments = craftMapFromFragments;
  exports.getFragmentType    = getFragmentType;

  exports.createSharedMap    = createSharedMap;
  exports.activateSharedMap  = activateSharedMap;

  exports.getMapHistory      = getMapHistory;
  exports.getActiveMaps      = getActiveMaps;
  exports.getOwnedMaps       = getOwnedMaps;
  exports.getFragments       = getFragments;
  exports.countCompletedByRarity = countCompletedByRarity;
  exports.totalSparkEarned   = totalSparkEarned;
  exports.hasCompleted       = hasCompleted;

  exports.handleMessage      = handleMessage;

  exports.getCurrentClue     = getCurrentClue;
  exports.getZone            = getZone;
  exports.toInventoryItem    = toInventoryItem;
  exports.ensurePlayerState  = ensurePlayerState;

})(typeof module !== 'undefined' ? module.exports : (window.TreasureMaps = {}));
