// archival.js
/**
 * ZION Archival System — Lore Preservation, Relics, Excavation & Guild Research
 * Extends story_engine.js with interactive content discovery.
 * Players excavate dig sites, discover relics, run guild research projects,
 * and propose lore amendments through collaborative worldbuilding.
 * No project dependencies.
 */

(function(exports) {
  'use strict';

  // ---------------------------------------------------------------------------
  // SEEDED PRNG — mulberry32
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

  // ---------------------------------------------------------------------------
  // CONSTANTS
  // ---------------------------------------------------------------------------

  var RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  var DISCOVERY_METHODS = ['excavation', 'exploration', 'quest', 'trade', 'raid'];
  var ZONES_LIST = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];

  var ARCHIVIST_RANKS = [
    { rank: 'novice',     title: 'Novice Archivist',     minScore: 0    },
    { rank: 'scholar',    title: 'Scholar of Relics',    minScore: 100  },
    { rank: 'historian',  title: 'ZION Historian',       minScore: 300  },
    { rank: 'archivist',  title: 'Senior Archivist',     minScore: 700  },
    { rank: 'lorekeeper', title: 'Lorekeeper of ZION',   minScore: 1500 }
  ];

  var AMENDMENT_APPROVAL_THRESHOLD = 0.66;

  // ---------------------------------------------------------------------------
  // RELICS — 20 discoverable relics across all zones
  // ---------------------------------------------------------------------------

  var RELICS = [

    // =========================================================
    // WILDS RELICS (3)
    // =========================================================
    {
      id: 'crystal_shard',
      name: 'Ancient Crystal Shard',
      description: 'A fragment of crystallized memory from before the founding. Light refracts through it in impossible colors, each hue carrying a whisper of someone who once lived.',
      rarity: 'rare',
      zone: 'wilds',
      discoveryMethod: 'excavation',
      loreChain: ['crystal_shard_lore_1', 'crystal_shard_lore_2', 'crystal_shard_lore_3'],
      xpReward: 50,
      sparkReward: 25
    },
    {
      id: 'stone_tablet',
      name: 'Etched Stone Tablet',
      description: 'A flat stone engraved with symbols no living scholar can fully translate. The partial readings speak of a covenant between the land and its first inhabitants.',
      rarity: 'uncommon',
      zone: 'wilds',
      discoveryMethod: 'excavation',
      loreChain: ['stone_tablet_lore_1', 'stone_tablet_lore_2'],
      xpReward: 30,
      sparkReward: 15
    },
    {
      id: 'rusted_compass',
      name: 'Rusted Compass of the Wilds',
      description: 'An iron compass whose needle points not toward magnetic north but toward something deeper — some say the original heart of ZION. It has never been wrong.',
      rarity: 'epic',
      zone: 'wilds',
      discoveryMethod: 'exploration',
      loreChain: ['rusted_compass_lore_1', 'rusted_compass_lore_2', 'rusted_compass_lore_3', 'rusted_compass_lore_4'],
      xpReward: 80,
      sparkReward: 50
    },

    // =========================================================
    // NEXUS RELICS (3)
    // =========================================================
    {
      id: 'founding_ember',
      name: 'Founding Ember (Preserved)',
      description: 'A fragment of the original fire that never went out, preserved in glass. The flame within is cold now but still visible — a ghost of the warmth that started civilization.',
      rarity: 'legendary',
      zone: 'nexus',
      discoveryMethod: 'quest',
      loreChain: ['founding_ember_lore_1', 'founding_ember_lore_2', 'founding_ember_lore_3', 'founding_ember_lore_4', 'founding_ember_lore_5'],
      xpReward: 200,
      sparkReward: 100
    },
    {
      id: 'crossing_stone',
      name: 'Crossroads Marker Stone',
      description: 'One of the original stones placed at the intersection of all paths. On its base is carved: "All roads begin here. All roads return." The carving glows at midnight.',
      rarity: 'uncommon',
      zone: 'nexus',
      discoveryMethod: 'excavation',
      loreChain: ['crossing_stone_lore_1', 'crossing_stone_lore_2'],
      xpReward: 30,
      sparkReward: 15
    },
    {
      id: 'first_coin',
      name: 'First Minted Spark Coin',
      description: 'The very first coin struck when Spark currency was formalized. One side shows the ember; the other shows the crossroads. Its value is priceless, its purchasing power: one.',
      rarity: 'epic',
      zone: 'nexus',
      discoveryMethod: 'trade',
      loreChain: ['first_coin_lore_1', 'first_coin_lore_2', 'first_coin_lore_3'],
      xpReward: 100,
      sparkReward: 75
    },

    // =========================================================
    // ATHENAEUM RELICS (2)
    // =========================================================
    {
      id: 'caelens_quill',
      name: "Caelen's Teaching Quill",
      description: "The quill used to write the first open invitation to the Athenaeum: 'All knowledge freely given, freely taken, freely grown.' The ink never dried on the philosophy.",
      rarity: 'rare',
      zone: 'athenaeum',
      discoveryMethod: 'quest',
      loreChain: ['caelens_quill_lore_1', 'caelens_quill_lore_2', 'caelens_quill_lore_3'],
      xpReward: 60,
      sparkReward: 35
    },
    {
      id: 'first_journal',
      name: 'First Donated Journal',
      description: 'The first private journal donated to make the Athenaeum public. Its pages are water-damaged but its entries remain: observations on weather, trade, and kindness.',
      rarity: 'common',
      zone: 'athenaeum',
      discoveryMethod: 'exploration',
      loreChain: ['first_journal_lore_1'],
      xpReward: 15,
      sparkReward: 8
    },

    // =========================================================
    // GARDENS RELICS (2)
    // =========================================================
    {
      id: 'verdana_seed_pouch',
      name: "Verdana's Dream Seed Pouch",
      description: 'The last remaining seeds from the legendary first gardener Verdana. They are said to grow whatever the planter most needs, not what they most want.',
      rarity: 'legendary',
      zone: 'gardens',
      discoveryMethod: 'quest',
      loreChain: ['verdana_seed_lore_1', 'verdana_seed_lore_2', 'verdana_seed_lore_3', 'verdana_seed_lore_4'],
      xpReward: 180,
      sparkReward: 90
    },
    {
      id: 'root_bead',
      name: 'Petrified Root Bead',
      description: 'A bead carved from the petrified root of the oldest tree in the Gardens. Gardeners wear them for luck. They smell faintly of rain even in drought.',
      rarity: 'common',
      zone: 'gardens',
      discoveryMethod: 'excavation',
      loreChain: ['root_bead_lore_1'],
      xpReward: 10,
      sparkReward: 5
    },

    // =========================================================
    // STUDIO RELICS (2)
    // =========================================================
    {
      id: 'first_canvas_fragment',
      name: 'Fragment of the First Canvas',
      description: 'A torn piece of the legendary first canvas — the one showing ZION at the end of all seasons. This fragment shows a single tree in every color at once.',
      rarity: 'epic',
      zone: 'studio',
      discoveryMethod: 'exploration',
      loreChain: ['canvas_fragment_lore_1', 'canvas_fragment_lore_2', 'canvas_fragment_lore_3'],
      xpReward: 90,
      sparkReward: 55
    },
    {
      id: 'painters_lens',
      name: "Original Painter's Lens",
      description: 'A glass lens ground by the Studio founders to see light "as it truly is." Looking through it, colors appear deeper, shapes more honest. Artists covet it above most relics.',
      rarity: 'uncommon',
      zone: 'studio',
      discoveryMethod: 'raid',
      loreChain: ['painters_lens_lore_1', 'painters_lens_lore_2'],
      xpReward: 35,
      sparkReward: 20
    },

    // =========================================================
    // AGORA RELICS (2)
    // =========================================================
    {
      id: 'night_trade_ledger',
      name: 'Night Trade Ledger',
      description: 'A ledger filled with anonymous trades from the Agora\'s early days — goods given and received in darkness, with no names recorded. Every entry ends with "fair exchange."',
      rarity: 'uncommon',
      zone: 'agora',
      discoveryMethod: 'excavation',
      loreChain: ['night_ledger_lore_1', 'night_ledger_lore_2'],
      xpReward: 30,
      sparkReward: 18
    },
    {
      id: 'market_bell',
      name: 'Original Market Bell',
      description: 'The bell that never officially rang to close the Agora. Its clapper is missing — removed, legend says, so it could never signal the end of trade. It hums anyway.',
      rarity: 'rare',
      zone: 'agora',
      discoveryMethod: 'trade',
      loreChain: ['market_bell_lore_1', 'market_bell_lore_2', 'market_bell_lore_3'],
      xpReward: 55,
      sparkReward: 30
    },

    // =========================================================
    // COMMONS RELICS (2)
    // =========================================================
    {
      id: 'builders_oath_stone',
      name: "Builder's Oath Foundation Stone",
      description: 'One of the original oath stones buried beneath the Commons. The inscription is worn but readable: "No wall to divide — only to shelter." Still glows faintly at dusk.',
      rarity: 'rare',
      zone: 'commons',
      discoveryMethod: 'excavation',
      loreChain: ['oath_stone_lore_1', 'oath_stone_lore_2', 'oath_stone_lore_3'],
      xpReward: 60,
      sparkReward: 35
    },
    {
      id: 'communal_hearth_ash',
      name: 'Communal Hearth Ash (Sealed)',
      description: 'Ash from the first communal hearth of the Commons, sealed in an iron pot. Historians argue about whether it is sacred or simply old. The Commons residents say: both.',
      rarity: 'common',
      zone: 'commons',
      discoveryMethod: 'excavation',
      loreChain: ['hearth_ash_lore_1'],
      xpReward: 12,
      sparkReward: 6
    },

    // =========================================================
    // ARENA RELICS (2)
    // =========================================================
    {
      id: 'davans_debate_notes',
      name: "Davan's Debate Notes",
      description: 'The philosopher Davan\'s notes from the first Arena contest — a debate, not a duel. Scrawled at the bottom: "Winner: everyone who stayed until dawn." The notes are still sharp.',
      rarity: 'uncommon',
      zone: 'arena',
      discoveryMethod: 'exploration',
      loreChain: ['davan_notes_lore_1', 'davan_notes_lore_2'],
      xpReward: 25,
      sparkReward: 14
    },
    {
      id: 'champion_bracer',
      name: 'First Champion\'s Bracer',
      description: 'The bracer awarded to ZION\'s first arena champion — winner of the first physical contest held three seasons after Davan\'s debate. Inscribed: "Strength serves the whole."',
      rarity: 'epic',
      zone: 'arena',
      discoveryMethod: 'raid',
      loreChain: ['champion_bracer_lore_1', 'champion_bracer_lore_2', 'champion_bracer_lore_3'],
      xpReward: 95,
      sparkReward: 60
    },

    // =========================================================
    // NEXUS BONUS (1) — 19th relic
    // =========================================================
    {
      id: 'founders_map',
      name: "Founders' Planning Map",
      description: 'A hand-drawn map created by the founding council, showing the original layout of ZION before any of the zones had proper names. The Nexus is simply labelled "Here." in heavy ink.',
      rarity: 'rare',
      zone: 'nexus',
      discoveryMethod: 'quest',
      loreChain: ['founders_map_lore_1', 'founders_map_lore_2'],
      xpReward: 55,
      sparkReward: 30
    },

    // =========================================================
    // GARDENS BONUS (1) — 20th relic
    // =========================================================
    {
      id: 'dream_watering_can',
      name: "Verdana's Dream Watering Can",
      description: 'The watering can used in the first garden of ZION. Its water never runs out, but will only flow when the holder genuinely wishes something to grow. It has never been empty.',
      rarity: 'uncommon',
      zone: 'gardens',
      discoveryMethod: 'exploration',
      loreChain: ['watering_can_lore_1', 'watering_can_lore_2'],
      xpReward: 28,
      sparkReward: 16
    }

  ];

  // ---------------------------------------------------------------------------
  // EXCAVATION_SITES — 10 dig sites across all zones
  // ---------------------------------------------------------------------------

  var EXCAVATION_SITES = [
    {
      id: 'wilds_ruins',
      name: 'Ancient Ruins of the Wilds',
      zone: 'wilds',
      difficulty: 3,
      relicPool: ['crystal_shard', 'stone_tablet'],
      digTime: 30,
      maxDigs: 10,
      respawnTime: 500,
      requiredTool: 'excavation_kit'
    },
    {
      id: 'wilds_deep_cache',
      name: 'Deep Cache of the Untamed',
      zone: 'wilds',
      difficulty: 4,
      relicPool: ['crystal_shard', 'rusted_compass'],
      digTime: 50,
      maxDigs: 6,
      respawnTime: 800,
      requiredTool: 'excavation_kit'
    },
    {
      id: 'nexus_crossroads_pit',
      name: 'Crossroads Foundation Pit',
      zone: 'nexus',
      difficulty: 2,
      relicPool: ['crossing_stone'],
      digTime: 20,
      maxDigs: 8,
      respawnTime: 400,
      requiredTool: 'excavation_kit'
    },
    {
      id: 'athenaeum_archive_vault',
      name: 'Athenaeum Archive Vault',
      zone: 'athenaeum',
      difficulty: 2,
      relicPool: ['first_journal'],
      digTime: 15,
      maxDigs: 12,
      respawnTime: 300,
      requiredTool: 'excavation_kit'
    },
    {
      id: 'gardens_old_beds',
      name: 'Ancient Garden Beds',
      zone: 'gardens',
      difficulty: 1,
      relicPool: ['root_bead'],
      digTime: 10,
      maxDigs: 15,
      respawnTime: 200,
      requiredTool: 'excavation_kit'
    },
    {
      id: 'studio_collapsed_wing',
      name: 'Collapsed Studio Wing',
      zone: 'studio',
      difficulty: 3,
      relicPool: ['first_canvas_fragment'],
      digTime: 35,
      maxDigs: 8,
      respawnTime: 600,
      requiredTool: 'excavation_kit'
    },
    {
      id: 'agora_old_stalls',
      name: 'Old Market Stall Foundations',
      zone: 'agora',
      difficulty: 2,
      relicPool: ['night_trade_ledger'],
      digTime: 20,
      maxDigs: 10,
      respawnTime: 350,
      requiredTool: 'excavation_kit'
    },
    {
      id: 'commons_oath_layer',
      name: 'Oath Stone Layer — Commons Subfloor',
      zone: 'commons',
      difficulty: 3,
      relicPool: ['builders_oath_stone', 'communal_hearth_ash'],
      digTime: 30,
      maxDigs: 9,
      respawnTime: 450,
      requiredTool: 'excavation_kit'
    },
    {
      id: 'arena_founder_quarter',
      name: 'Arena Founder\'s Quarter',
      zone: 'arena',
      difficulty: 2,
      relicPool: ['davans_debate_notes'],
      digTime: 20,
      maxDigs: 10,
      respawnTime: 400,
      requiredTool: 'excavation_kit'
    },
    {
      id: 'wilds_sacred_mound',
      name: 'Sacred Mound of the First Walkers',
      zone: 'wilds',
      difficulty: 5,
      relicPool: ['crystal_shard', 'stone_tablet', 'rusted_compass'],
      digTime: 70,
      maxDigs: 4,
      respawnTime: 1200,
      requiredTool: 'excavation_kit'
    }
  ];

  // ---------------------------------------------------------------------------
  // RESEARCH_PROJECTS — 8 guild research projects
  // ---------------------------------------------------------------------------

  var RESEARCH_PROJECTS = [
    {
      id: 'origin_mystery',
      name: "The Mystery of ZION's Origin",
      description: 'Piece together the truth about how ZION came to be.',
      category: 'history',
      phases: [
        { name: 'Gather Evidence', relicsRequired: ['crystal_shard', 'stone_tablet'], contributionGoal: 100 },
        { name: 'Analyze Findings', skillRequired: 'exploration', contributionGoal: 200 },
        { name: 'Write Conclusion', contributionGoal: 150 }
      ],
      reward: {
        loreEntry: 'the_true_origin',
        guildTitle: 'Keepers of History',
        spark: 500,
        xp: 1000
      },
      duration: 5000
    },
    {
      id: 'founders_covenant',
      name: "The Founders' Covenant",
      description: 'Research the hidden agreements made between the eight zone founders at the dawn of ZION.',
      category: 'history',
      phases: [
        { name: 'Collect Founder Relics', relicsRequired: ['crossing_stone', 'caelens_quill'], contributionGoal: 80 },
        { name: 'Cross-Reference Records', contributionGoal: 160 },
        { name: 'Draft Covenant Theory', contributionGoal: 120 }
      ],
      reward: {
        loreEntry: 'the_founders_covenant',
        guildTitle: 'Covenant Scholars',
        spark: 400,
        xp: 800
      },
      duration: 4000
    },
    {
      id: 'verdanas_legacy',
      name: "Verdana's Lost Legacy",
      description: 'Uncover the full history of the first gardener and the secrets locked in her dream seeds.',
      category: 'legend',
      phases: [
        { name: 'Find Botanical Records', relicsRequired: ['verdana_seed_pouch', 'root_bead'], contributionGoal: 90 },
        { name: 'Grow Test Specimens', skillRequired: 'crafting', contributionGoal: 180 },
        { name: 'Publish Findings', contributionGoal: 100 }
      ],
      reward: {
        loreEntry: 'verdanas_full_legacy',
        guildTitle: 'Dreamgarden Cultivators',
        spark: 350,
        xp: 700
      },
      duration: 3500
    },
    {
      id: 'spark_economy_origins',
      name: 'Origins of the Spark Economy',
      description: 'Trace Spark currency from the first ember through to the first mint.',
      category: 'economics',
      phases: [
        { name: 'Study Trade Ledgers', relicsRequired: ['night_trade_ledger', 'first_coin'], contributionGoal: 100 },
        { name: 'Map Trade Routes', skillRequired: 'exploration', contributionGoal: 200 },
        { name: 'Economic Report', contributionGoal: 150 }
      ],
      reward: {
        loreEntry: 'spark_economy_history',
        guildTitle: 'Economic Historians',
        spark: 450,
        xp: 900
      },
      duration: 4500
    },
    {
      id: 'arena_philosophy',
      name: "The Arena's True Purpose",
      description: "Explore Davan's original intent for the Arena and how competition shapes community.",
      category: 'philosophy',
      phases: [
        { name: 'Study Arena Records', relicsRequired: ['davans_debate_notes'], contributionGoal: 70 },
        { name: 'Interview Champions', contributionGoal: 140 },
        { name: 'Publish Philosophy', contributionGoal: 90 }
      ],
      reward: {
        loreEntry: 'arena_true_purpose',
        guildTitle: 'Philosophical Competitors',
        spark: 300,
        xp: 600
      },
      duration: 3000
    },
    {
      id: 'artisan_lineages',
      name: 'The Great Artisan Lineages',
      description: 'Document the creative lineages of the Studio from the first canvas to the present day.',
      category: 'art',
      phases: [
        { name: 'Recover Studio Relics', relicsRequired: ['first_canvas_fragment', 'painters_lens'], contributionGoal: 110 },
        { name: 'Interview Descendants', contributionGoal: 220 },
        { name: 'Curate Exhibition', contributionGoal: 130 }
      ],
      reward: {
        loreEntry: 'artisan_lineages_record',
        guildTitle: 'Studio Archivists',
        spark: 380,
        xp: 760
      },
      duration: 3800
    },
    {
      id: 'knowledge_migration',
      name: 'The Great Knowledge Migration',
      description: 'Trace how information moved from private hands to the open Athenaeum.',
      category: 'education',
      phases: [
        { name: 'Catalog Donated Works', relicsRequired: ['caelens_quill', 'first_journal'], contributionGoal: 80 },
        { name: 'Map Knowledge Flows', skillRequired: 'exploration', contributionGoal: 160 },
        { name: 'Publish Index', contributionGoal: 100 }
      ],
      reward: {
        loreEntry: 'knowledge_migration_history',
        guildTitle: 'Open Knowledge Keepers',
        spark: 330,
        xp: 660
      },
      duration: 3300
    },
    {
      id: 'commons_architecture',
      name: 'Architecture of Community',
      description: 'Analyze how the Commons was designed to foster community rather than isolation.',
      category: 'architecture',
      phases: [
        { name: 'Excavate Foundation Stones', relicsRequired: ['builders_oath_stone', 'communal_hearth_ash'], contributionGoal: 90 },
        { name: 'Structural Analysis', skillRequired: 'crafting', contributionGoal: 180 },
        { name: 'Publish Design Principles', contributionGoal: 110 }
      ],
      reward: {
        loreEntry: 'commons_design_principles',
        guildTitle: 'Community Architects',
        spark: 360,
        xp: 720
      },
      duration: 3600
    }
  ];

  // ---------------------------------------------------------------------------
  // STATE HELPERS
  // ---------------------------------------------------------------------------

  function ensureArchivalState(state) {
    if (!state.archival) {
      state.archival = {
        sites: {},
        playerArchives: {},
        activeResearch: {},
        amendments: {}
      };
    }
    if (!state.archival.sites)          { state.archival.sites = {}; }
    if (!state.archival.playerArchives) { state.archival.playerArchives = {}; }
    if (!state.archival.activeResearch) { state.archival.activeResearch = {}; }
    if (!state.archival.amendments)     { state.archival.amendments = {}; }
    return state.archival;
  }

  function ensurePlayerArchive(state, playerId) {
    var arch = ensureArchivalState(state);
    if (!arch.playerArchives[playerId]) {
      arch.playerArchives[playerId] = {
        playerId: playerId,
        discoveredRelics: [],
        completedExcavations: 0,
        researchContributions: {},
        proposedAmendments: [],
        archivistRank: 'novice'
      };
    }
    return arch.playerArchives[playerId];
  }

  function ensureSiteState(state, siteId) {
    var arch = ensureArchivalState(state);
    if (!arch.sites[siteId]) {
      arch.sites[siteId] = {
        siteId: siteId,
        digsRemaining: null, // null = pristine (not yet touched)
        lastDepletedAt: null
      };
    }
    return arch.sites[siteId];
  }

  // ---------------------------------------------------------------------------
  // INTERNAL HELPERS
  // ---------------------------------------------------------------------------

  function getRelicDef(relicId) {
    for (var i = 0; i < RELICS.length; i++) {
      if (RELICS[i].id === relicId) { return RELICS[i]; }
    }
    return null;
  }

  function getSiteDef(siteId) {
    for (var i = 0; i < EXCAVATION_SITES.length; i++) {
      if (EXCAVATION_SITES[i].id === siteId) { return EXCAVATION_SITES[i]; }
    }
    return null;
  }

  function getProjectDef(projectId) {
    for (var i = 0; i < RESEARCH_PROJECTS.length; i++) {
      if (RESEARCH_PROJECTS[i].id === projectId) { return RESEARCH_PROJECTS[i]; }
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // EXCAVATION
  // ---------------------------------------------------------------------------

  /**
   * Attempt excavation at a dig site.
   * Returns {success, relic, xp, spark, siteDepletionRemaining, reason}
   */
  function excavate(state, playerId, siteId, seed, currentTick) {
    var siteDef = getSiteDef(siteId);
    if (!siteDef) {
      return { success: false, relic: null, xp: 0, spark: 0, siteDepletionRemaining: 0, reason: 'Unknown site' };
    }

    var siteState = ensureSiteState(state, siteId);

    // Initialise fresh site
    if (siteState.digsRemaining === null) {
      siteState.digsRemaining = siteDef.maxDigs;
    }

    // Check depletion
    if (siteState.digsRemaining <= 0) {
      // Check if respawn has occurred
      if (siteState.lastDepletedAt !== null &&
          (currentTick - siteState.lastDepletedAt) >= siteDef.respawnTime) {
        siteState.digsRemaining = siteDef.maxDigs;
        siteState.lastDepletedAt = null;
      } else {
        var ticksLeft = siteState.lastDepletedAt !== null
          ? siteDef.respawnTime - (currentTick - siteState.lastDepletedAt)
          : siteDef.respawnTime;
        return { success: false, relic: null, xp: 0, spark: 0, siteDepletionRemaining: 0, reason: 'Site depleted', respawnIn: ticksLeft };
      }
    }

    // Consume a dig
    siteState.digsRemaining -= 1;
    if (siteState.digsRemaining === 0) {
      siteState.lastDepletedAt = currentTick;
    }

    var playerArchive = ensurePlayerArchive(state, playerId);

    // Use seeded PRNG for relic determination
    var rng = mulberry32(seedFrom(seed, siteId + '|' + playerId));
    var roll = rng();

    // Find undiscovered relics from pool
    var pool = siteDef.relicPool;
    var undiscovered = [];
    for (var i = 0; i < pool.length; i++) {
      if (playerArchive.discoveredRelics.indexOf(pool[i]) === -1) {
        undiscovered.push(pool[i]);
      }
    }

    // Base find chance: 40% if relics remain, 20% if all discovered
    var findChance = undiscovered.length > 0 ? 0.40 : 0.20;

    if (roll < findChance) {
      // Pick relic from pool (prefer undiscovered)
      var relicId;
      if (undiscovered.length > 0) {
        relicId = undiscovered[Math.floor(rng() * undiscovered.length)];
      } else {
        relicId = pool[Math.floor(rng() * pool.length)];
      }

      var relicDef = getRelicDef(relicId);
      var discoverResult = discoverRelic(state, playerId, relicId);
      playerArchive.completedExcavations += 1;

      return {
        success: true,
        relic: relicDef,
        xp: relicDef ? relicDef.xpReward : 10,
        spark: relicDef ? relicDef.sparkReward : 5,
        siteDepletionRemaining: siteState.digsRemaining,
        loreUnlocked: discoverResult.loreUnlocked
      };
    }

    // No relic found — still a valid dig
    playerArchive.completedExcavations += 1;
    return {
      success: true,
      relic: null,
      xp: 5,
      spark: 2,
      siteDepletionRemaining: siteState.digsRemaining,
      loreUnlocked: []
    };
  }

  /**
   * Return site status: available digs, respawn timer.
   */
  function getSiteStatus(state, siteId, currentTick) {
    var siteDef = getSiteDef(siteId);
    if (!siteDef) { return null; }

    var siteState = ensureSiteState(state, siteId);
    var digsRemaining = siteState.digsRemaining === null ? siteDef.maxDigs : siteState.digsRemaining;
    var depleted = digsRemaining <= 0;
    var respawnIn = 0;

    if (depleted && siteState.lastDepletedAt !== null) {
      var elapsed = currentTick - siteState.lastDepletedAt;
      respawnIn = Math.max(0, siteDef.respawnTime - elapsed);
      if (respawnIn === 0) {
        // Respawned
        depleted = false;
        digsRemaining = siteDef.maxDigs;
      }
    }

    return {
      siteId: siteId,
      name: siteDef.name,
      zone: siteDef.zone,
      digsRemaining: digsRemaining,
      maxDigs: siteDef.maxDigs,
      depleted: depleted,
      respawnIn: respawnIn,
      difficulty: siteDef.difficulty,
      requiredTool: siteDef.requiredTool
    };
  }

  /**
   * Return all sites in a zone (or all zones if zone is null/undefined).
   */
  function getExcavationSites(state, zone) {
    var results = [];
    for (var i = 0; i < EXCAVATION_SITES.length; i++) {
      var site = EXCAVATION_SITES[i];
      if (!zone || site.zone === zone) {
        results.push(getSiteStatus(state, site.id, 0));
      }
    }
    return results;
  }

  // ---------------------------------------------------------------------------
  // RELIC DISCOVERY
  // ---------------------------------------------------------------------------

  /**
   * Add relic to player's collection. Unlock associated lore chain.
   * Returns {success, relic, loreUnlocked, reason}
   */
  function discoverRelic(state, playerId, relicId) {
    var relicDef = getRelicDef(relicId);
    if (!relicDef) {
      return { success: false, relic: null, loreUnlocked: [], reason: 'Unknown relic' };
    }

    var playerArchive = ensurePlayerArchive(state, playerId);

    // Idempotent — no duplicates
    if (playerArchive.discoveredRelics.indexOf(relicId) !== -1) {
      return { success: true, relic: relicDef, loreUnlocked: [], alreadyOwned: true };
    }

    playerArchive.discoveredRelics.push(relicId);

    // Unlock lore chain
    var loreUnlocked = relicDef.loreChain ? relicDef.loreChain.slice() : [];

    // Update rank
    playerArchive.archivistRank = _calcRank(state, playerId).rank;

    return { success: true, relic: relicDef, loreUnlocked: loreUnlocked };
  }

  /**
   * Return player's discovered relics (full definitions).
   */
  function getPlayerRelics(state, playerId) {
    var playerArchive = ensurePlayerArchive(state, playerId);
    var results = [];
    for (var i = 0; i < playerArchive.discoveredRelics.length; i++) {
      var def = getRelicDef(playerArchive.discoveredRelics[i]);
      if (def) { results.push(def); }
    }
    return results;
  }

  // ---------------------------------------------------------------------------
  // RESEARCH PROJECTS
  // ---------------------------------------------------------------------------

  /**
   * Begin a guild research project.
   * Returns {success, project, reason}
   */
  function startResearchProject(state, guildId, projectId, currentTick) {
    var projectDef = getProjectDef(projectId);
    if (!projectDef) {
      return { success: false, project: null, reason: 'Unknown project' };
    }

    var arch = ensureArchivalState(state);
    var key = guildId + '|' + projectId;

    if (arch.activeResearch[key]) {
      return { success: false, project: arch.activeResearch[key], reason: 'Already active' };
    }

    // Build phase progress tracking
    var phases = [];
    for (var i = 0; i < projectDef.phases.length; i++) {
      phases.push({
        name: projectDef.phases[i].name,
        contributionGoal: projectDef.phases[i].contributionGoal,
        relicsRequired: projectDef.phases[i].relicsRequired ? projectDef.phases[i].relicsRequired.slice() : [],
        relicsContributed: [],
        currentContribution: 0,
        complete: false
      });
    }

    var project = {
      id: key,
      projectId: projectId,
      guildId: guildId,
      name: projectDef.name,
      category: projectDef.category,
      currentPhase: 0,
      phases: phases,
      startedAt: currentTick,
      completedAt: null,
      status: 'active', // active, completed, abandoned
      contributors: {},
      reward: projectDef.reward
    };

    arch.activeResearch[key] = project;
    return { success: true, project: project, reason: null };
  }

  /**
   * Contribute to research phase (XP points or relic).
   * Returns {success, phaseProgress, phaseComplete, reason}
   */
  function contributeToResearch(state, playerId, projectId, amount, relicId) {
    var arch = ensureArchivalState(state);

    // Find the active project across all guilds matching this projectId
    var project = null;
    var key = null;
    var keys = Object.keys(arch.activeResearch);
    for (var i = 0; i < keys.length; i++) {
      if (arch.activeResearch[keys[i]].projectId === projectId &&
          arch.activeResearch[keys[i]].status === 'active') {
        project = arch.activeResearch[keys[i]];
        key = keys[i];
        break;
      }
    }

    if (!project) {
      return { success: false, phaseProgress: 0, phaseComplete: false, reason: 'Project not active' };
    }

    if (project.status !== 'active') {
      return { success: false, phaseProgress: 0, phaseComplete: false, reason: 'Project not active' };
    }

    var phase = project.phases[project.currentPhase];
    if (!phase) {
      return { success: false, phaseProgress: 0, phaseComplete: false, reason: 'No active phase' };
    }

    if (phase.complete) {
      return { success: false, phaseProgress: phase.currentContribution, phaseComplete: true, reason: 'Phase already complete' };
    }

    // Track contributor
    if (!project.contributors[playerId]) {
      project.contributors[playerId] = 0;
    }
    project.contributors[playerId] += amount;

    // Track player contribution
    var playerArchive = ensurePlayerArchive(state, playerId);
    if (!playerArchive.researchContributions[projectId]) {
      playerArchive.researchContributions[projectId] = 0;
    }
    playerArchive.researchContributions[projectId] += amount;

    phase.currentContribution += amount;

    // Relic contribution
    if (relicId) {
      if (phase.relicsRequired && phase.relicsRequired.indexOf(relicId) !== -1) {
        if (phase.relicsContributed.indexOf(relicId) === -1) {
          phase.relicsContributed.push(relicId);
        }
      }
    }

    // Check phase completion
    var relicsOk = true;
    if (phase.relicsRequired && phase.relicsRequired.length > 0) {
      for (var j = 0; j < phase.relicsRequired.length; j++) {
        if (phase.relicsContributed.indexOf(phase.relicsRequired[j]) === -1) {
          relicsOk = false;
          break;
        }
      }
    }

    var phaseComplete = relicsOk && phase.currentContribution >= phase.contributionGoal;
    if (phaseComplete && !phase.complete) {
      phase.complete = true;
    }

    return {
      success: true,
      phaseProgress: phase.currentContribution,
      phaseComplete: phaseComplete,
      reason: null
    };
  }

  /**
   * Move research to next phase when goal met.
   * Returns {success, newPhase, reason}
   */
  function advanceResearchPhase(state, projectId) {
    var arch = ensureArchivalState(state);

    var project = null;
    var keys = Object.keys(arch.activeResearch);
    for (var i = 0; i < keys.length; i++) {
      if (arch.activeResearch[keys[i]].projectId === projectId &&
          arch.activeResearch[keys[i]].status === 'active') {
        project = arch.activeResearch[keys[i]];
        break;
      }
    }

    if (!project) {
      return { success: false, newPhase: -1, reason: 'Project not found or not active' };
    }

    var currentPhase = project.phases[project.currentPhase];
    if (!currentPhase || !currentPhase.complete) {
      return { success: false, newPhase: project.currentPhase, reason: 'Current phase not complete' };
    }

    var nextIndex = project.currentPhase + 1;
    if (nextIndex >= project.phases.length) {
      return { success: false, newPhase: project.currentPhase, reason: 'All phases complete — use completeResearch' };
    }

    project.currentPhase = nextIndex;
    return { success: true, newPhase: nextIndex, reason: null };
  }

  /**
   * Finalize research. Award rewards.
   * Returns {success, reward, loreCreated, reason}
   */
  function completeResearch(state, projectId) {
    var arch = ensureArchivalState(state);

    var project = null;
    var keys = Object.keys(arch.activeResearch);
    for (var i = 0; i < keys.length; i++) {
      if (arch.activeResearch[keys[i]].projectId === projectId &&
          arch.activeResearch[keys[i]].status === 'active') {
        project = arch.activeResearch[keys[i]];
        break;
      }
    }

    if (!project) {
      return { success: false, reward: null, loreCreated: null, reason: 'Project not found or not active' };
    }

    // All phases must be complete
    for (var i = 0; i < project.phases.length; i++) {
      if (!project.phases[i].complete) {
        return { success: false, reward: null, loreCreated: null, reason: 'Not all phases complete' };
      }
    }

    project.status = 'completed';
    project.completedAt = Date.now();

    return {
      success: true,
      reward: project.reward,
      loreCreated: project.reward.loreEntry || null,
      reason: null
    };
  }

  /**
   * Return current progress for all phases.
   */
  function getResearchProgress(state, projectId) {
    var arch = ensureArchivalState(state);

    var project = null;
    var keys = Object.keys(arch.activeResearch);
    for (var i = 0; i < keys.length; i++) {
      if (arch.activeResearch[keys[i]].projectId === projectId) {
        project = arch.activeResearch[keys[i]];
        break;
      }
    }

    if (!project) { return null; }

    var projectDef = getProjectDef(projectId);
    var phaseProgress = [];
    for (var j = 0; j < project.phases.length; j++) {
      var ph = project.phases[j];
      phaseProgress.push({
        name: ph.name,
        goal: ph.contributionGoal,
        current: ph.currentContribution,
        percent: Math.min(100, Math.floor((ph.currentContribution / ph.contributionGoal) * 100)),
        complete: ph.complete,
        relicsRequired: ph.relicsRequired,
        relicsContributed: ph.relicsContributed
      });
    }

    return {
      projectId: projectId,
      name: project.name,
      currentPhase: project.currentPhase,
      status: project.status,
      phases: phaseProgress,
      contributors: project.contributors
    };
  }

  /**
   * Return active research projects for a guild.
   */
  function getActiveResearch(state, guildId) {
    var arch = ensureArchivalState(state);
    var results = [];
    var keys = Object.keys(arch.activeResearch);
    for (var i = 0; i < keys.length; i++) {
      var p = arch.activeResearch[keys[i]];
      if (p.guildId === guildId && p.status === 'active') {
        results.push(p);
      }
    }
    return results;
  }

  // ---------------------------------------------------------------------------
  // LORE AMENDMENTS
  // ---------------------------------------------------------------------------

  /**
   * Propose a lore amendment.
   * Returns {success, amendment, reason}
   */
  function proposeAmendment(state, playerId, loreId, newText, reason, currentTick) {
    var arch = ensureArchivalState(state);

    if (!loreId || !newText || !reason) {
      return { success: false, amendment: null, reason: 'Missing required fields' };
    }

    var amendmentId = 'amendment_' + playerId + '_' + currentTick;

    // Prevent duplicate proposals for same lore by same player
    var existing = arch.amendments[amendmentId];
    if (existing) {
      return { success: false, amendment: existing, reason: 'Amendment already exists' };
    }

    var amendment = {
      id: amendmentId,
      proposerId: playerId,
      loreId: loreId,
      proposedText: newText,
      reason: reason,
      status: 'voting',
      votes: { yes: 0, no: 0, voters: [] },
      requiredApproval: AMENDMENT_APPROVAL_THRESHOLD,
      createdAt: currentTick
    };

    arch.amendments[amendmentId] = amendment;

    var playerArchive = ensurePlayerArchive(state, playerId);
    playerArchive.proposedAmendments.push(amendmentId);

    return { success: true, amendment: amendment, reason: null };
  }

  /**
   * Vote on amendment (stewards only). vote: true/false.
   * Returns {success, currentVotes, approved, reason}
   */
  function voteOnAmendment(state, voterId, amendmentId, vote, stewardCount) {
    var arch = ensureArchivalState(state);
    var amendment = arch.amendments[amendmentId];

    if (!amendment) {
      return { success: false, currentVotes: null, approved: null, reason: 'Amendment not found' };
    }

    if (amendment.status !== 'voting') {
      return { success: false, currentVotes: amendment.votes, approved: amendment.status === 'approved', reason: 'Amendment not in voting status' };
    }

    // Prevent double voting
    if (amendment.votes.voters.indexOf(voterId) !== -1) {
      return { success: false, currentVotes: amendment.votes, approved: null, reason: 'Already voted' };
    }

    amendment.votes.voters.push(voterId);
    if (vote) {
      amendment.votes.yes += 1;
    } else {
      amendment.votes.no += 1;
    }

    // Evaluate approval threshold
    var totalVoters = amendment.votes.voters.length;
    var totalStewards = stewardCount || totalVoters; // default to voter pool if steward count not given
    var yesRatio = totalStewards > 0 ? amendment.votes.yes / totalStewards : 0;

    var approved = null;
    if (yesRatio >= AMENDMENT_APPROVAL_THRESHOLD) {
      amendment.status = 'approved';
      approved = true;
    } else if (totalVoters >= totalStewards && yesRatio < AMENDMENT_APPROVAL_THRESHOLD) {
      // All stewards voted and threshold not met
      amendment.status = 'rejected';
      approved = false;
    }

    return { success: true, currentVotes: amendment.votes, approved: approved, reason: null };
  }

  /**
   * Return amendments by status (or all if status is null/undefined).
   */
  function getAmendments(state, status) {
    var arch = ensureArchivalState(state);
    var results = [];
    var keys = Object.keys(arch.amendments);
    for (var i = 0; i < keys.length; i++) {
      var a = arch.amendments[keys[i]];
      if (!status || a.status === status) {
        results.push(a);
      }
    }
    return results;
  }

  // ---------------------------------------------------------------------------
  // ARCHIVIST RANK
  // ---------------------------------------------------------------------------

  function _calcRankScore(state, playerId) {
    var playerArchive = ensurePlayerArchive(state, playerId);
    var relicScore = playerArchive.discoveredRelics.length * 20;
    var excavationScore = playerArchive.completedExcavations * 5;
    var contributionScore = 0;
    var contribs = playerArchive.researchContributions;
    var projIds = Object.keys(contribs);
    for (var i = 0; i < projIds.length; i++) {
      contributionScore += contribs[projIds[i]];
    }
    var amendmentScore = playerArchive.proposedAmendments.length * 10;
    return relicScore + excavationScore + contributionScore + amendmentScore;
  }

  function _calcRank(state, playerId) {
    var score = _calcRankScore(state, playerId);
    var rankDef = ARCHIVIST_RANKS[0];
    for (var i = ARCHIVIST_RANKS.length - 1; i >= 0; i--) {
      if (score >= ARCHIVIST_RANKS[i].minScore) {
        rankDef = ARCHIVIST_RANKS[i];
        break;
      }
    }

    // Next rank
    var nextRankDef = null;
    for (var j = 0; j < ARCHIVIST_RANKS.length; j++) {
      if (ARCHIVIST_RANKS[j].minScore > score) {
        nextRankDef = ARCHIVIST_RANKS[j];
        break;
      }
    }

    var progress = 0;
    if (nextRankDef) {
      var fromScore = rankDef.minScore;
      var toScore = nextRankDef.minScore;
      progress = Math.floor(((score - fromScore) / (toScore - fromScore)) * 100);
    } else {
      progress = 100; // Max rank
    }

    return {
      rank: rankDef.rank,
      title: rankDef.title,
      score: score,
      nextRank: nextRankDef ? nextRankDef.rank : null,
      nextRankTitle: nextRankDef ? nextRankDef.title : null,
      progress: progress
    };
  }

  /**
   * Calculate rank based on relics + excavations + contributions.
   */
  function getArchivistRank(state, playerId) {
    return _calcRank(state, playerId);
  }

  // ---------------------------------------------------------------------------
  // QUERY HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Return relic definition by ID.
   */
  function getRelicById(relicId) {
    return getRelicDef(relicId);
  }

  /**
   * Return all relics, optionally filtered by zone.
   */
  function getRelics(zone) {
    if (!zone) { return RELICS.slice(); }
    var results = [];
    for (var i = 0; i < RELICS.length; i++) {
      if (RELICS[i].zone === zone) { results.push(RELICS[i]); }
    }
    return results;
  }

  /**
   * Return all research project definitions.
   */
  function getResearchProjects() {
    return RESEARCH_PROJECTS.slice();
  }

  /**
   * Return collection stats: {found, total, percent, byRarity: {...}}
   */
  function getRelicCollection(state, playerId) {
    var playerArchive = ensurePlayerArchive(state, playerId);
    var total = RELICS.length;
    var found = playerArchive.discoveredRelics.length;
    var percent = total > 0 ? Math.floor((found / total) * 100) : 0;

    var byRarity = {};
    for (var r = 0; r < RARITIES.length; r++) {
      byRarity[RARITIES[r]] = { found: 0, total: 0 };
    }
    for (var i = 0; i < RELICS.length; i++) {
      var rarity = RELICS[i].rarity;
      if (byRarity[rarity]) { byRarity[rarity].total += 1; }
    }
    for (var j = 0; j < playerArchive.discoveredRelics.length; j++) {
      var def = getRelicDef(playerArchive.discoveredRelics[j]);
      if (def && byRarity[def.rarity]) { byRarity[def.rarity].found += 1; }
    }

    return { found: found, total: total, percent: percent, byRarity: byRarity };
  }

  /**
   * Return top archivists by rank score.
   */
  function getArchivalLeaderboard(state, count) {
    var arch = ensureArchivalState(state);
    var playerIds = Object.keys(arch.playerArchives);
    var entries = [];
    for (var i = 0; i < playerIds.length; i++) {
      var pid = playerIds[i];
      var rankInfo = _calcRank(state, pid);
      entries.push({
        playerId: pid,
        rank: rankInfo.rank,
        title: rankInfo.title,
        score: rankInfo.score,
        relicsFound: arch.playerArchives[pid].discoveredRelics.length
      });
    }
    entries.sort(function(a, b) { return b.score - a.score; });
    return entries.slice(0, count || 10);
  }

  // ---------------------------------------------------------------------------
  // EXPORTS
  // ---------------------------------------------------------------------------

  exports.excavate              = excavate;
  exports.getSiteStatus         = getSiteStatus;
  exports.getExcavationSites    = getExcavationSites;
  exports.discoverRelic         = discoverRelic;
  exports.getPlayerRelics       = getPlayerRelics;
  exports.startResearchProject  = startResearchProject;
  exports.contributeToResearch  = contributeToResearch;
  exports.advanceResearchPhase  = advanceResearchPhase;
  exports.completeResearch      = completeResearch;
  exports.getResearchProgress   = getResearchProgress;
  exports.getActiveResearch     = getActiveResearch;
  exports.proposeAmendment      = proposeAmendment;
  exports.voteOnAmendment       = voteOnAmendment;
  exports.getAmendments         = getAmendments;
  exports.getArchivistRank      = getArchivistRank;
  exports.getRelicById          = getRelicById;
  exports.getRelics             = getRelics;
  exports.getResearchProjects   = getResearchProjects;
  exports.getRelicCollection    = getRelicCollection;
  exports.getArchivalLeaderboard = getArchivalLeaderboard;

  // Exposed for tests
  exports._RELICS               = RELICS;
  exports._EXCAVATION_SITES     = EXCAVATION_SITES;
  exports._RESEARCH_PROJECTS    = RESEARCH_PROJECTS;
  exports._ARCHIVIST_RANKS      = ARCHIVIST_RANKS;
  exports._RARITIES             = RARITIES;
  exports._ZONES_LIST           = ZONES_LIST;

})(typeof module !== 'undefined' ? module.exports : (window.Archival = {}));
