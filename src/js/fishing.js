(function(exports) {
  'use strict';

  // ─── CONSTANTS ───────────────────────────────────────────────────────────────

  var PERFECT_TIMING_BONUS = 1.5;

  // Catch rates by rarity (probability weight, not percentage)
  var CATCH_RATES = {
    common:    100,
    uncommon:   40,
    rare:       15,
    epic:        5,
    legendary:   1
  };

  // ─── FISH CATALOG (25+ species) ──────────────────────────────────────────────

  var FISH_CATALOG = [
    // ── Common ──────────────────────────────────────────────────────────────────
    {
      id: 'sunfish',
      name: 'Sunfish',
      rarity: 'common',
      zone: ['nexus', 'gardens', 'commons'],
      value: 5,
      weightMin: 0.2,
      weightMax: 1.5,
      season: ['spring', 'summer'],
      description: 'A small, cheerful fish that loves warm shallows.'
    },
    {
      id: 'river_perch',
      name: 'River Perch',
      rarity: 'common',
      zone: ['wilds', 'agora', 'nexus'],
      value: 6,
      weightMin: 0.3,
      weightMax: 2.0,
      season: ['spring', 'summer', 'autumn'],
      description: 'A hardy perch found in most waterways.'
    },
    {
      id: 'blue_gill',
      name: 'Blue Gill',
      rarity: 'common',
      zone: ['gardens', 'commons', 'studio'],
      value: 4,
      weightMin: 0.1,
      weightMax: 1.0,
      season: ['spring', 'summer', 'autumn', 'winter'],
      description: 'Year-round staple of the Gardens ponds.'
    },
    {
      id: 'mud_carp',
      name: 'Mud Carp',
      rarity: 'common',
      zone: ['agora', 'nexus'],
      value: 3,
      weightMin: 0.5,
      weightMax: 3.0,
      season: ['spring', 'summer', 'autumn', 'winter'],
      description: 'Abundant and easy to catch. Not glamorous, but filling.'
    },
    {
      id: 'stone_loach',
      name: 'Stone Loach',
      rarity: 'common',
      zone: ['wilds', 'arena'],
      value: 5,
      weightMin: 0.1,
      weightMax: 0.8,
      season: ['spring', 'summer', 'autumn', 'winter'],
      description: 'Hides under rocks in fast-moving streams.'
    },
    {
      id: 'freshwater_eel',
      name: 'Freshwater Eel',
      rarity: 'common',
      zone: ['wilds', 'agora', 'commons'],
      value: 7,
      weightMin: 0.4,
      weightMax: 2.5,
      season: ['summer', 'autumn'],
      description: 'Slippery and surprisingly tasty.'
    },
    // ── Uncommon ────────────────────────────────────────────────────────────────
    {
      id: 'silver_trout',
      name: 'Silver Trout',
      rarity: 'uncommon',
      zone: ['wilds', 'gardens'],
      value: 15,
      weightMin: 0.5,
      weightMax: 4.0,
      season: ['spring', 'autumn'],
      description: 'Quick and spirited — a favourite of sport anglers.'
    },
    {
      id: 'golden_roach',
      name: 'Golden Roach',
      rarity: 'uncommon',
      zone: ['nexus', 'commons'],
      value: 18,
      weightMin: 0.3,
      weightMax: 2.5,
      season: ['spring', 'summer'],
      description: 'Gleams like a coin beneath the surface.'
    },
    {
      id: 'crystal_bass',
      name: 'Crystal Bass',
      rarity: 'uncommon',
      zone: ['athenaeum', 'gardens'],
      value: 20,
      weightMin: 0.8,
      weightMax: 5.0,
      season: ['summer', 'autumn'],
      description: 'Its scales refract light into tiny rainbows.'
    },
    {
      id: 'bronze_bream',
      name: 'Bronze Bream',
      rarity: 'uncommon',
      zone: ['agora', 'studio'],
      value: 16,
      weightMin: 0.4,
      weightMax: 3.0,
      season: ['summer', 'autumn', 'winter'],
      description: 'Deep bronze colouring makes it easy to admire in the creel.'
    },
    {
      id: 'spotted_pike',
      name: 'Spotted Pike',
      rarity: 'uncommon',
      zone: ['wilds', 'arena'],
      value: 22,
      weightMin: 1.0,
      weightMax: 6.0,
      season: ['autumn', 'winter'],
      description: 'An ambush predator with distinctive dark spots.'
    },
    {
      id: 'jade_gudgeon',
      name: 'Jade Gudgeon',
      rarity: 'uncommon',
      zone: ['gardens', 'athenaeum'],
      value: 14,
      weightMin: 0.1,
      weightMax: 0.6,
      season: ['spring', 'summer'],
      description: 'Tiny but prized for its jade-green tint.'
    },
    // ── Rare ────────────────────────────────────────────────────────────────────
    {
      id: 'moonfish',
      name: 'Moonfish',
      rarity: 'rare',
      zone: ['wilds', 'nexus'],
      value: 60,
      weightMin: 1.0,
      weightMax: 8.0,
      season: ['winter'],
      description: 'Glows softly on moonlit nights. Only bites after dusk.'
    },
    {
      id: 'ghost_carp',
      name: 'Ghost Carp',
      rarity: 'rare',
      zone: ['athenaeum', 'studio'],
      value: 75,
      weightMin: 2.0,
      weightMax: 12.0,
      season: ['autumn', 'winter'],
      description: 'Nearly translucent. Legends say it carries memories of the deep.'
    },
    {
      id: 'thunder_eel',
      name: 'Thunder Eel',
      rarity: 'rare',
      zone: ['arena', 'wilds'],
      value: 80,
      weightMin: 1.5,
      weightMax: 10.0,
      season: ['summer'],
      description: 'Crackles with static energy. Handle with care!'
    },
    {
      id: 'prism_perch',
      name: 'Prism Perch',
      rarity: 'rare',
      zone: ['gardens', 'commons'],
      value: 65,
      weightMin: 0.8,
      weightMax: 5.0,
      season: ['spring'],
      description: 'Every scale shifts through the full spectrum at sunrise.'
    },
    {
      id: 'cobalt_salmon',
      name: 'Cobalt Salmon',
      rarity: 'rare',
      zone: ['wilds', 'agora'],
      value: 70,
      weightMin: 2.5,
      weightMax: 9.0,
      season: ['autumn'],
      description: 'Migrates upriver once each autumn. Fiercely fought.'
    },
    {
      id: 'ember_catfish',
      name: 'Ember Catfish',
      rarity: 'rare',
      zone: ['studio', 'arena'],
      value: 72,
      weightMin: 3.0,
      weightMax: 14.0,
      season: ['summer', 'autumn'],
      description: 'Whiskers glow orange like cooling embers.'
    },
    // ── Epic ────────────────────────────────────────────────────────────────────
    {
      id: 'void_sturgeon',
      name: 'Void Sturgeon',
      rarity: 'epic',
      zone: ['nexus', 'arena'],
      value: 200,
      weightMin: 10.0,
      weightMax: 40.0,
      season: ['winter'],
      description: 'An ancient creature from before the world was shaped. Exceptionally rare.'
    },
    {
      id: 'starweave_koi',
      name: 'Starweave Koi',
      rarity: 'epic',
      zone: ['gardens', 'athenaeum'],
      value: 220,
      weightMin: 5.0,
      weightMax: 20.0,
      season: ['spring', 'summer'],
      description: 'Its patterns mirror the night sky. A treasure of the Gardens.'
    },
    {
      id: 'abyssal_pike',
      name: 'Abyssal Pike',
      rarity: 'epic',
      zone: ['wilds', 'studio'],
      value: 250,
      weightMin: 8.0,
      weightMax: 35.0,
      season: ['autumn', 'winter'],
      description: 'Comes from waters so deep they have no name.'
    },
    // ── Legendary ───────────────────────────────────────────────────────────────
    {
      id: 'elder_leviathan',
      name: 'Elder Leviathan',
      rarity: 'legendary',
      zone: ['nexus'],
      value: 1000,
      weightMin: 50.0,
      weightMax: 150.0,
      season: ['winter'],
      description: 'The lord of all waters. Few have seen it. Fewer have landed it.'
    },
    {
      id: 'solarfin',
      name: 'Solarfin',
      rarity: 'legendary',
      zone: ['gardens'],
      value: 900,
      weightMin: 20.0,
      weightMax: 80.0,
      season: ['summer'],
      description: 'Burns bright as the noon sun. Only surfaces on the longest days.'
    },
    {
      id: 'rift_ray',
      name: 'Rift Ray',
      rarity: 'legendary',
      zone: ['studio', 'athenaeum'],
      value: 950,
      weightMin: 30.0,
      weightMax: 100.0,
      season: ['autumn'],
      description: 'Glides between dimensions. Catching one is said to change your fate.'
    },
    {
      id: 'chronofish',
      name: 'Chronofish',
      rarity: 'legendary',
      zone: ['nexus', 'wilds'],
      value: 1200,
      weightMin: 15.0,
      weightMax: 60.0,
      season: ['spring', 'summer', 'autumn', 'winter'],
      description: 'Exists slightly outside of time. Can be caught in any season, but almost never is.'
    }
  ];

  // ─── BAIT TYPES ──────────────────────────────────────────────────────────────

  var BAIT_TYPES = {
    worm: {
      id: 'worm',
      name: 'Earthworm',
      description: 'Basic bait. Attracts most common and uncommon fish.',
      rarityBonus: { common: 1.2, uncommon: 1.1, rare: 0.8, epic: 0.5, legendary: 0.3 },
      cost: 2,
      zoneBonus: null
    },
    cricket: {
      id: 'cricket',
      name: 'Cricket',
      description: 'Surface bait good for warm-weather fish.',
      rarityBonus: { common: 1.1, uncommon: 1.3, rare: 0.9, epic: 0.6, legendary: 0.4 },
      cost: 3,
      zoneBonus: ['wilds', 'gardens']
    },
    minnow: {
      id: 'minnow',
      name: 'Live Minnow',
      description: 'Attracts larger predator fish.',
      rarityBonus: { common: 0.8, uncommon: 1.2, rare: 1.4, epic: 1.0, legendary: 0.6 },
      cost: 8,
      zoneBonus: ['arena', 'wilds']
    },
    special_lure: {
      id: 'special_lure',
      name: 'Special Lure',
      description: 'A crafted lure that draws rare and epic species.',
      rarityBonus: { common: 0.6, uncommon: 1.0, rare: 1.6, epic: 1.4, legendary: 0.8 },
      cost: 20,
      zoneBonus: null
    },
    golden_fly: {
      id: 'golden_fly',
      name: 'Golden Fly',
      description: 'Legendary bait. Greatly increases chance of legendary catches.',
      rarityBonus: { common: 0.4, uncommon: 0.8, rare: 1.2, epic: 1.8, legendary: 3.0 },
      cost: 100,
      zoneBonus: null
    }
  };

  // ─── ROD TYPES ───────────────────────────────────────────────────────────────

  var ROD_TYPES = {
    basic: {
      id: 'basic',
      name: 'Basic Rod',
      description: 'A simple wooden rod. Gets the job done.',
      catchBonus: 1.0,
      timingWindow: 1.0,   // multiplier on perfect-timing window width
      rarityBonus: { common: 1.0, uncommon: 0.8, rare: 0.5, epic: 0.3, legendary: 0.1 },
      cost: 0
    },
    improved: {
      id: 'improved',
      name: 'Improved Rod',
      description: 'Steel-reinforced. Noticeably better action.',
      catchBonus: 1.2,
      timingWindow: 1.2,
      rarityBonus: { common: 1.0, uncommon: 1.1, rare: 0.8, epic: 0.5, legendary: 0.2 },
      cost: 50
    },
    master: {
      id: 'master',
      name: 'Master Rod',
      description: 'Handcrafted from enchanted timber. Favoured by serious anglers.',
      catchBonus: 1.5,
      timingWindow: 1.4,
      rarityBonus: { common: 1.0, uncommon: 1.2, rare: 1.2, epic: 0.8, legendary: 0.4 },
      cost: 200
    },
    legendary: {
      id: 'legendary',
      name: 'Legendary Rod',
      description: 'Forged from a fallen star. Draws forth creatures from the depths of legend.',
      catchBonus: 2.0,
      timingWindow: 1.8,
      rarityBonus: { common: 1.0, uncommon: 1.2, rare: 1.5, epic: 1.5, legendary: 1.5 },
      cost: 1000
    }
  };

  // ─── FISHING ZONES ───────────────────────────────────────────────────────────

  var FISHING_ZONES = {
    nexus: {
      zoneId: 'nexus',
      name: 'Nexus Fountain Pool',
      spots: 3,
      fish: ['sunfish', 'mud_carp', 'golden_roach', 'moonfish', 'void_sturgeon', 'elder_leviathan', 'chronofish'],
      difficulty: 'easy',
      catchRateBonus: 1.0
    },
    gardens: {
      zoneId: 'gardens',
      name: 'Gardens Koi Ponds',
      spots: 5,
      fish: ['sunfish', 'blue_gill', 'silver_trout', 'golden_roach', 'crystal_bass', 'jade_gudgeon', 'prism_perch', 'starweave_koi', 'solarfin'],
      difficulty: 'easy',
      catchRateBonus: 1.1
    },
    athenaeum: {
      zoneId: 'athenaeum',
      name: 'Athenaeum Reflection Pool',
      spots: 2,
      fish: ['blue_gill', 'jade_gudgeon', 'crystal_bass', 'ghost_carp', 'starweave_koi', 'rift_ray'],
      difficulty: 'medium',
      catchRateBonus: 0.9
    },
    studio: {
      zoneId: 'studio',
      name: 'Studio Canal',
      spots: 3,
      fish: ['blue_gill', 'bronze_bream', 'ghost_carp', 'ember_catfish', 'abyssal_pike', 'rift_ray'],
      difficulty: 'medium',
      catchRateBonus: 1.0
    },
    wilds: {
      zoneId: 'wilds',
      name: 'Wilds River Network',
      spots: 8,
      fish: ['river_perch', 'stone_loach', 'freshwater_eel', 'silver_trout', 'spotted_pike', 'moonfish', 'thunder_eel', 'cobalt_salmon', 'abyssal_pike', 'chronofish'],
      difficulty: 'medium',
      catchRateBonus: 1.2
    },
    agora: {
      zoneId: 'agora',
      name: 'Agora Market Docks',
      spots: 4,
      fish: ['river_perch', 'mud_carp', 'freshwater_eel', 'bronze_bream', 'cobalt_salmon'],
      difficulty: 'easy',
      catchRateBonus: 1.05
    },
    commons: {
      zoneId: 'commons',
      name: 'Commons Lake',
      spots: 6,
      fish: ['sunfish', 'blue_gill', 'freshwater_eel', 'golden_roach', 'bronze_bream', 'prism_perch'],
      difficulty: 'easy',
      catchRateBonus: 1.15
    },
    arena: {
      zoneId: 'arena',
      name: 'Arena Storm Pools',
      spots: 3,
      fish: ['stone_loach', 'spotted_pike', 'thunder_eel', 'ember_catfish', 'void_sturgeon'],
      difficulty: 'hard',
      catchRateBonus: 0.85
    }
  };

  // ─── INTERNAL STATE ──────────────────────────────────────────────────────────

  // Active fishing sessions: { playerId -> { zone, bait, rod, castAt, state } }
  var _sessions = {};

  // Creel (catch basket) per player: { playerId -> [catch...] }
  var _creels = {};

  // Lifetime stats per player: { playerId -> stats }
  var _stats = {};

  // Fish populations per zone: { zoneId -> { fishId -> populationFactor (0..2) } }
  var _populations = {};

  // Active tournaments: { tournamentId -> tournament }
  var _tournaments = {};

  // ─── HELPERS ─────────────────────────────────────────────────────────────────

  function _getOrInitCreel(playerId) {
    if (!_creels[playerId]) { _creels[playerId] = []; }
    return _creels[playerId];
  }

  function _getOrInitStats(playerId) {
    if (!_stats[playerId]) {
      _stats[playerId] = {
        totalCasts: 0,
        totalCatches: 0,
        totalSold: 0,
        totalEarned: 0,
        biggestCatch: null,
        rarestCatch: null,
        catchesByRarity: { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 },
        tournamentsEntered: 0,
        tournamentsWon: 0
      };
    }
    return _stats[playerId];
  }

  function _getOrInitPopulation(zoneId) {
    if (!_populations[zoneId]) {
      _populations[zoneId] = {};
      var zone = FISHING_ZONES[zoneId];
      if (zone) {
        for (var i = 0; i < zone.fish.length; i++) {
          _populations[zoneId][zone.fish[i]] = 1.0;
        }
      }
    }
    return _populations[zoneId];
  }

  function _rarityRank(rarity) {
    var ranks = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
    return ranks[rarity] !== undefined ? ranks[rarity] : 0;
  }

  // Seeded pseudo-random (Mulberry32 — stdlib-safe)
  function _rand(seed) {
    var t = (seed + 0x6D2B79F5) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Pick a seed from current millisecond + extras for unpredictability
  function _rollSeed(extra) {
    return (Date.now() ^ (extra | 0)) >>> 0;
  }

  // Build the candidate fish pool for a zone/season/bait/rod combo
  function _buildPool(zoneId, season, baitId, rodId) {
    var zone = FISHING_ZONES[zoneId];
    if (!zone) { return []; }
    var bait = BAIT_TYPES[baitId] || BAIT_TYPES.worm;
    var rod  = ROD_TYPES[rodId]   || ROD_TYPES.basic;
    var pop  = _getOrInitPopulation(zoneId);

    var pool = [];
    for (var i = 0; i < zone.fish.length; i++) {
      var fishId = zone.fish[i];
      var fish = _getFishById(fishId);
      if (!fish) { continue; }

      // Season filter — if fish has specific seasons, skip off-season
      if (fish.season && fish.season.length > 0 && season) {
        if (fish.season.indexOf(season) === -1) { continue; }
      }

      var baseRate  = CATCH_RATES[fish.rarity] || 1;
      var baitMult  = (bait.rarityBonus[fish.rarity] || 1.0);
      var rodMult   = (rod.rarityBonus[fish.rarity]  || 1.0);
      var popFactor = (pop[fishId] !== undefined ? pop[fishId] : 1.0);
      var zoneMult  = zone.catchRateBonus || 1.0;

      // Zone-specific bait bonus
      if (bait.zoneBonus && bait.zoneBonus.indexOf(zoneId) !== -1) {
        baitMult *= 1.2;
      }

      var weight = baseRate * baitMult * rodMult * popFactor * zoneMult;
      if (weight > 0) {
        pool.push({ fish: fish, weight: weight });
      }
    }
    return pool;
  }

  function _pickFromPool(pool, seed) {
    if (pool.length === 0) { return null; }
    var total = 0;
    for (var i = 0; i < pool.length; i++) { total += pool[i].weight; }
    var roll = _rand(seed) * total;
    var cumulative = 0;
    for (var j = 0; j < pool.length; j++) {
      cumulative += pool[j].weight;
      if (roll <= cumulative) { return pool[j].fish; }
    }
    return pool[pool.length - 1].fish;
  }

  function _getFishById(fishId) {
    for (var i = 0; i < FISH_CATALOG.length; i++) {
      if (FISH_CATALOG[i].id === fishId) { return FISH_CATALOG[i]; }
    }
    return null;
  }

  function _randomWeight(fish, seed) {
    var range = fish.weightMax - fish.weightMin;
    return +(fish.weightMin + _rand(seed) * range).toFixed(2);
  }

  // ─── FISHING ACTIONS ─────────────────────────────────────────────────────────

  /**
   * Begin a fishing session for a player.
   * Returns the session object or null on error.
   */
  function startFishing(playerId, zoneId, baitId, rodId) {
    if (!playerId) { return null; }
    if (!FISHING_ZONES[zoneId]) { return null; }
    if (!BAIT_TYPES[baitId]) { baitId = 'worm'; }
    if (!ROD_TYPES[rodId])   { rodId  = 'basic'; }

    var session = {
      playerId: playerId,
      zone: zoneId,
      bait: baitId,
      rod: rodId,
      castAt: null,
      state: 'idle',   // idle | casting | waiting | biting | reeling
      lastResult: null
    };
    _sessions[playerId] = session;
    return session;
  }

  /**
   * Cast the line. Returns updated session or null.
   */
  function castLine(playerId) {
    var session = _sessions[playerId];
    if (!session) { return null; }
    if (session.state !== 'idle') { return null; }

    var stats = _getOrInitStats(playerId);
    stats.totalCasts++;

    session.state = 'waiting';
    session.castAt = Date.now();
    session.lastResult = null;
    return session;
  }

  /**
   * Check for a bite. Returns { bite: true/false, fish: fishObj|null } and
   * advances session to 'biting' state if a fish bites.
   * Pass currentSeason as one of 'spring'|'summer'|'autumn'|'winter'|null.
   */
  function getBite(playerId, currentSeason) {
    var session = _sessions[playerId];
    if (!session || session.state !== 'waiting') {
      return { bite: false, fish: null };
    }

    var pool = _buildPool(session.zone, currentSeason || null, session.bait, session.rod);
    if (pool.length === 0) { return { bite: false, fish: null }; }

    // Base bite probability (30%) modified by rod catch bonus
    var rod = ROD_TYPES[session.rod] || ROD_TYPES.basic;
    var biteProb = 0.30 * rod.catchBonus;
    if (biteProb > 0.95) { biteProb = 0.95; }

    var seed = _rollSeed(session.castAt || 0);
    if (_rand(seed) > biteProb) {
      return { bite: false, fish: null };
    }

    // Pick the fish
    var seed2 = _rollSeed(seed + 1);
    var fish = _pickFromPool(pool, seed2);
    session._pendingFish = fish;
    session._biteAt = Date.now();
    session.state = 'biting';

    return { bite: true, fish: fish };
  }

  /**
   * Reel in the line.
   * timing: 'early' | 'perfect' | 'late'
   * Returns catch result: { success, fish, weight, timing, bonusApplied } or null.
   */
  function reelIn(playerId, timing) {
    var session = _sessions[playerId];
    if (!session || session.state !== 'biting') { return null; }

    var fish = session._pendingFish;
    if (!fish) {
      session.state = 'idle';
      return { success: false, fish: null, weight: 0, timing: timing, bonusApplied: false };
    }

    var success = timing === 'perfect' || timing === 'early';
    // 'late' always loses the fish
    if (timing === 'late') { success = false; }

    var result = {
      success: success,
      fish: fish,
      weight: 0,
      timing: timing,
      bonusApplied: false
    };

    if (success) {
      var weightSeed = _rollSeed((session._biteAt || 0) + fish.id.length);
      var weight = _randomWeight(fish, weightSeed);

      if (timing === 'perfect') {
        weight = +(weight * PERFECT_TIMING_BONUS).toFixed(2);
        // Cap at 120% of max weight (bonus can push above catalogue max)
        result.bonusApplied = true;
      }

      result.weight = weight;

      // Creel
      var entry = { fish: fish, weight: weight, zone: session.zone, caughtAt: Date.now() };
      _getOrInitCreel(playerId).push(entry);

      // Stats
      var stats = _getOrInitStats(playerId);
      stats.totalCatches++;
      stats.catchesByRarity[fish.rarity] = (stats.catchesByRarity[fish.rarity] || 0) + 1;

      if (!stats.biggestCatch || weight > stats.biggestCatch.weight) {
        stats.biggestCatch = entry;
      }
      if (!stats.rarestCatch || _rarityRank(fish.rarity) > _rarityRank(stats.rarestCatch.fish.rarity)) {
        stats.rarestCatch = entry;
      }

      // Deplete population slightly
      var pop = _getOrInitPopulation(session.zone);
      if (pop[fish.id] !== undefined) {
        pop[fish.id] = Math.max(0, pop[fish.id] - 0.05);
      }
    }

    session.state = 'idle';
    session._pendingFish = null;
    session.lastResult = result;
    return result;
  }

  /**
   * Get the most recent catch result for a player.
   */
  function getCatch(playerId) {
    var session = _sessions[playerId];
    return session ? session.lastResult : null;
  }

  // ─── CREEL MANAGEMENT ────────────────────────────────────────────────────────

  /**
   * Manually add a fish to the creel (useful for event-driven flows).
   */
  function addToCreel(playerId, fishId, weight) {
    var fish = _getFishById(fishId);
    if (!fish) { return null; }
    var w = (weight !== undefined && weight > 0) ? +weight : _randomWeight(fish, _rollSeed(fishId.length));
    var entry = { fish: fish, weight: w, zone: 'nexus', caughtAt: Date.now() };
    _getOrInitCreel(playerId).push(entry);
    return entry;
  }

  /**
   * Return the player's creel contents.
   */
  function getCreel(playerId) {
    return _getOrInitCreel(playerId);
  }

  /**
   * Sell all fish in the creel. Returns total coins earned.
   */
  function sellCatch(playerId) {
    var creel = _getOrInitCreel(playerId);
    if (creel.length === 0) { return 0; }

    var total = 0;
    for (var i = 0; i < creel.length; i++) {
      var entry = creel[i];
      // Value = base value * weight factor (heavier = more valuable)
      var weightFactor = entry.weight / entry.fish.weightMax;
      total += Math.round(entry.fish.value * (0.5 + weightFactor * 0.5));
    }

    var stats = _getOrInitStats(playerId);
    stats.totalSold += creel.length;
    stats.totalEarned += total;

    _creels[playerId] = [];
    return total;
  }

  /**
   * Clear a player's creel (release fish back).
   */
  function clearCreel(playerId) {
    _creels[playerId] = [];
  }

  // ─── LIFETIME STATS ──────────────────────────────────────────────────────────

  function getLifetimeStats(playerId) {
    return _getOrInitStats(playerId);
  }

  // ─── ECOLOGY / POPULATIONS ───────────────────────────────────────────────────

  /**
   * Get current population factor for a fish in a zone (0..2, 1.0 = normal).
   */
  function getFishPopulation(zoneId, fishId) {
    var pop = _getOrInitPopulation(zoneId);
    if (pop[fishId] === undefined) { return null; }
    return pop[fishId];
  }

  /**
   * Update (recover/deplete) all fish populations across all zones.
   * Should be called periodically (e.g., game tick).
   * recoveryRate: fraction recovered per tick (default 0.01)
   * depletionFloor: minimum population factor (default 0.1)
   */
  function updatePopulations(recoveryRate, depletionFloor) {
    var rate  = (recoveryRate  !== undefined) ? recoveryRate  : 0.01;
    var floor = (depletionFloor !== undefined) ? depletionFloor : 0.10;

    for (var zoneId in _populations) {
      if (!_populations.hasOwnProperty(zoneId)) { continue; }
      var pop = _populations[zoneId];
      for (var fishId in pop) {
        if (!pop.hasOwnProperty(fishId)) { continue; }
        pop[fishId] = Math.min(2.0, Math.max(floor, pop[fishId] + rate));
      }
    }
  }

  /**
   * Set population factor directly (for testing / admin).
   */
  function setFishPopulation(zoneId, fishId, factor) {
    var pop = _getOrInitPopulation(zoneId);
    pop[fishId] = Math.min(2.0, Math.max(0, factor));
  }

  // ─── SEASONAL HELPERS ────────────────────────────────────────────────────────

  /**
   * Returns all fish that can be caught in a given season.
   */
  function getSeasonalFish(season) {
    var results = [];
    for (var i = 0; i < FISH_CATALOG.length; i++) {
      var fish = FISH_CATALOG[i];
      if (!fish.season || fish.season.length === 0 || fish.season.indexOf(season) !== -1) {
        results.push(fish);
      }
    }
    return results;
  }

  /**
   * Returns all fish available in a given zone (any season).
   */
  function getFishByZone(zoneId) {
    var zone = FISHING_ZONES[zoneId];
    if (!zone) { return []; }
    var results = [];
    for (var i = 0; i < zone.fish.length; i++) {
      var fish = _getFishById(zone.fish[i]);
      if (fish) { results.push(fish); }
    }
    return results;
  }

  // ─── TOURNAMENTS ─────────────────────────────────────────────────────────────

  var _tournamentCounter = 0;

  /**
   * Create a new tournament.
   * opts: { name, zoneId, metric ('heaviest'|'rarest'|'most'), durationMs, season }
   */
  function startTournament(opts) {
    opts = opts || {};
    var id = 'tournament_' + (++_tournamentCounter);
    var tournament = {
      id: id,
      name: opts.name || 'ZION Fishing Tournament',
      zoneId: opts.zoneId || null,
      metric: opts.metric || 'heaviest',  // heaviest | rarest | most
      season: opts.season || null,
      startedAt: Date.now(),
      durationMs: opts.durationMs || 3600000,  // 1 hour default
      state: 'active',   // active | ended
      entries: {},        // { playerId -> [entry...] }
      rankings: null
    };
    _tournaments[id] = tournament;
    return tournament;
  }

  /**
   * Join a tournament (register a player).
   * Returns the tournament or null if not found / not active.
   */
  function joinTournament(tournamentId, playerId) {
    var t = _tournaments[tournamentId];
    if (!t || t.state !== 'active') { return null; }
    if (!t.entries[playerId]) {
      t.entries[playerId] = [];
    }
    var stats = _getOrInitStats(playerId);
    stats.tournamentsEntered++;
    return t;
  }

  /**
   * Submit a catch entry to a tournament.
   * entry: { fish, weight } — typically from reelIn result.
   */
  function submitEntry(tournamentId, playerId, entry) {
    var t = _tournaments[tournamentId];
    if (!t || t.state !== 'active') { return null; }
    if (!t.entries[playerId]) { t.entries[playerId] = []; }
    if (!entry || !entry.fish) { return null; }

    var record = {
      playerId: playerId,
      fish: entry.fish,
      weight: entry.weight || 0,
      submittedAt: Date.now()
    };
    t.entries[playerId].push(record);
    t.rankings = null; // invalidate cached rankings
    return record;
  }

  /**
   * Get current tournament rankings.
   * Returns array sorted by score descending.
   */
  function getTournamentRankings(tournamentId) {
    var t = _tournaments[tournamentId];
    if (!t) { return null; }

    if (t.rankings && t.state === 'ended') { return t.rankings; }

    var scores = [];
    for (var playerId in t.entries) {
      if (!t.entries.hasOwnProperty(playerId)) { continue; }
      var playerEntries = t.entries[playerId];
      var score = 0;

      if (t.metric === 'heaviest') {
        // Best single fish weight
        for (var i = 0; i < playerEntries.length; i++) {
          if (playerEntries[i].weight > score) { score = playerEntries[i].weight; }
        }
      } else if (t.metric === 'rarest') {
        // Highest rarity rank achieved
        for (var j = 0; j < playerEntries.length; j++) {
          var rank = _rarityRank(playerEntries[j].fish.rarity);
          if (rank > score) { score = rank; }
        }
      } else if (t.metric === 'most') {
        // Total number of catches
        score = playerEntries.length;
      }

      scores.push({ playerId: playerId, score: score, entries: playerEntries.length });
    }

    scores.sort(function(a, b) { return b.score - a.score; });

    // Add rank field
    for (var k = 0; k < scores.length; k++) {
      scores[k].rank = k + 1;
    }

    t.rankings = scores;
    return scores;
  }

  /**
   * End a tournament, finalize rankings, award winner.
   * Returns final standings.
   */
  function endTournament(tournamentId) {
    var t = _tournaments[tournamentId];
    if (!t) { return null; }

    t.state = 'ended';
    var rankings = getTournamentRankings(tournamentId);

    if (rankings && rankings.length > 0) {
      var winner = rankings[0].playerId;
      var stats = _getOrInitStats(winner);
      stats.tournamentsWon++;
      t.winner = winner;
    }

    return { tournament: t, rankings: rankings };
  }

  /**
   * Get a tournament by id.
   */
  function getTournament(tournamentId) {
    return _tournaments[tournamentId] || null;
  }

  // ─── RESET (for testing) ─────────────────────────────────────────────────────

  function _reset() {
    _sessions = {};
    _creels = {};
    _stats = {};
    _populations = {};
    _tournaments = {};
    _tournamentCounter = 0;
  }

  // ─── EXPORTS ─────────────────────────────────────────────────────────────────

  exports.FISH_CATALOG         = FISH_CATALOG;
  exports.BAIT_TYPES           = BAIT_TYPES;
  exports.ROD_TYPES            = ROD_TYPES;
  exports.FISHING_ZONES        = FISHING_ZONES;
  exports.CATCH_RATES          = CATCH_RATES;
  exports.PERFECT_TIMING_BONUS = PERFECT_TIMING_BONUS;

  exports.startFishing         = startFishing;
  exports.castLine             = castLine;
  exports.getBite              = getBite;
  exports.reelIn               = reelIn;
  exports.getCatch             = getCatch;

  exports.addToCreel           = addToCreel;
  exports.getCreel             = getCreel;
  exports.sellCatch            = sellCatch;
  exports.clearCreel           = clearCreel;

  exports.getLifetimeStats     = getLifetimeStats;

  exports.getFishPopulation    = getFishPopulation;
  exports.updatePopulations    = updatePopulations;
  exports.setFishPopulation    = setFishPopulation;

  exports.getSeasonalFish      = getSeasonalFish;
  exports.getFishByZone        = getFishByZone;

  exports.startTournament      = startTournament;
  exports.joinTournament       = joinTournament;
  exports.submitEntry          = submitEntry;
  exports.getTournamentRankings = getTournamentRankings;
  exports.endTournament        = endTournament;
  exports.getTournament        = getTournament;

  exports._reset               = _reset;

})(typeof module !== 'undefined' ? module.exports : (window.Fishing = {}));
