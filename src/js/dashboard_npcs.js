/**
 * ZION Dashboard NPC Interaction System
 * Provides NPC panel for dashboard (UI-only) mode: talk, shop, quests, relationships
 * Layer: standalone (no required project dependencies; guards optional deps)
 */

(function(exports) {
  'use strict';

  // ==========================================================================
  // CONSTANTS
  // ==========================================================================

  var ZONES = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];

  var ARCHETYPES = {
    gardener: {
      role: 'Gardener',
      greeting: 'The soil speaks to those who listen.',
      shop: ['seeds', 'fertilizer', 'watering_can'],
      skills: ['herbalism', 'farming'],
      quests: ['plant_10_seeds', 'harvest_rare_herb']
    },
    builder: {
      role: 'Builder',
      greeting: 'Every structure tells a story.',
      shop: ['planks', 'nails', 'blueprint'],
      skills: ['construction', 'design'],
      quests: ['build_shelter', 'repair_bridge']
    },
    storyteller: {
      role: 'Storyteller',
      greeting: 'Gather close, I have a tale...',
      shop: ['scroll', 'ink', 'journal'],
      skills: ['lore', 'history'],
      quests: ['collect_3_tales', 'visit_ancient_site']
    },
    merchant: {
      role: 'Merchant',
      greeting: 'Fine goods, fair prices!',
      shop: ['trade_permit', 'lockbox', 'scale'],
      skills: ['trading', 'appraisal'],
      quests: ['complete_5_trades', 'find_rare_item']
    },
    explorer: {
      role: 'Explorer',
      greeting: 'The horizon always calls.',
      shop: ['compass', 'rope', 'map_fragment'],
      skills: ['navigation', 'survival'],
      quests: ['discover_3_landmarks', 'map_unknown_area']
    },
    teacher: {
      role: 'Teacher',
      greeting: 'What would you like to learn today?',
      shop: ['textbook', 'chalk', 'lens'],
      skills: ['education', 'research'],
      quests: ['attend_3_lessons', 'solve_puzzle']
    },
    musician: {
      role: 'Musician',
      greeting: 'Music connects all living things.',
      shop: ['strings', 'drum_skin', 'sheet_music'],
      skills: ['performance', 'composition'],
      quests: ['play_for_crowd', 'compose_melody']
    },
    healer: {
      role: 'Healer',
      greeting: 'Rest here, friend. You are safe.',
      shop: ['bandage', 'salve', 'herb_pouch'],
      skills: ['medicine', 'alchemy'],
      quests: ['heal_5_citizens', 'brew_potion']
    },
    philosopher: {
      role: 'Philosopher',
      greeting: 'Question everything, especially this.',
      shop: ['riddle_box', 'meditation_mat', 'star_chart'],
      skills: ['wisdom', 'debate'],
      quests: ['debate_3_topics', 'meditate_at_shrine']
    },
    artist: {
      role: 'Artist',
      greeting: 'Beauty exists in every corner of this world.',
      shop: ['pigment', 'canvas', 'chisel'],
      skills: ['painting', 'sculpture'],
      quests: ['create_artwork', 'find_inspiration']
    }
  };

  var ARCHETYPE_KEYS = Object.keys(ARCHETYPES);

  // 100 names for NPC generation
  var NPC_NAMES = [
    'Aelara', 'Bram', 'Calla', 'Dorin', 'Elara', 'Fenn', 'Greta', 'Hale', 'Iris', 'Jasper',
    'Kael', 'Luna', 'Maren', 'Nyx', 'Orin', 'Petra', 'Quinn', 'Riven', 'Sage', 'Thane',
    'Uma', 'Vale', 'Wren', 'Xander', 'Yara', 'Zeke', 'Ashwin', 'Briar', 'Cedar', 'Dawn',
    'Ember', 'Flint', 'Gale', 'Haven', 'Ivy', 'Jade', 'Kira', 'Lark', 'Moss', 'Nova',
    'Oak', 'Piper', 'Rain', 'Stone', 'Thorn', 'Umber', 'Vesper', 'Willow', 'Zara', 'Aspen',
    'Brook', 'Clay', 'Dune', 'Echo', 'Frost', 'Glen', 'Heath', 'Ione', 'Juniper', 'Kai',
    'Lotus', 'Maple', 'North', 'Onyx', 'Pine', 'Quest', 'Reed', 'Sable', 'Tide', 'Unity',
    'Vine', 'Wave', 'Xyla', 'Yarrow', 'Zinnia', 'Alder', 'Birch', 'Coral', 'Drake', 'Elm',
    'Fawn', 'Grove', 'Haze', 'Indigo', 'Jem', 'Kelp', 'Linden', 'Marsh', 'Nettle', 'Olive',
    'Pearl', 'Quill', 'Rue', 'Swift', 'Terra', 'Urchin', 'Veil', 'Wisp', 'Xyris', 'Yew'
  ];

  // Mood cycles
  var MOODS = ['happy', 'neutral', 'busy', 'thoughtful'];

  // Item catalog with descriptions and base prices
  var ITEM_CATALOG = {
    // Gardener
    seeds:          { name: 'Seeds',          basePrice: 5,   description: 'A packet of mixed seeds ready for planting.' },
    fertilizer:     { name: 'Fertilizer',     basePrice: 8,   description: 'Enriched compost to speed plant growth.' },
    watering_can:   { name: 'Watering Can',   basePrice: 15,  description: 'A copper watering can with a fine rose head.' },
    // Builder
    planks:         { name: 'Planks',         basePrice: 10,  description: 'Hewn timber planks, good for walls and floors.' },
    nails:          { name: 'Nails',          basePrice: 4,   description: 'Iron nails, sold by the handful.' },
    blueprint:      { name: 'Blueprint',      basePrice: 25,  description: 'Detailed construction plans for a small structure.' },
    // Storyteller
    scroll:         { name: 'Scroll',         basePrice: 12,  description: 'A blank scroll of quality parchment.' },
    ink:            { name: 'Ink',            basePrice: 7,   description: 'Deep black ink in a sealed vial.' },
    journal:        { name: 'Journal',        basePrice: 20,  description: 'A leather-bound journal with 200 pages.' },
    // Merchant
    trade_permit:   { name: 'Trade Permit',   basePrice: 30,  description: 'Official permit allowing market stall operation.' },
    lockbox:        { name: 'Lockbox',        basePrice: 18,  description: 'A sturdy iron box with a reliable lock.' },
    scale:          { name: 'Scale',          basePrice: 22,  description: 'A brass balance scale for fair measurement.' },
    // Explorer
    compass:        { name: 'Compass',        basePrice: 20,  description: 'A reliable magnetic compass.' },
    rope:           { name: 'Rope',           basePrice: 9,   description: 'Fifteen meters of braided hemp rope.' },
    map_fragment:   { name: 'Map Fragment',   basePrice: 35,  description: 'A torn piece of a larger map, showing unknown territory.' },
    // Teacher
    textbook:       { name: 'Textbook',       basePrice: 25,  description: 'A comprehensive guide on a chosen subject.' },
    chalk:          { name: 'Chalk',          basePrice: 3,   description: 'White chalk sticks for writing on boards.' },
    lens:           { name: 'Lens',           basePrice: 40,  description: 'A ground glass lens for study and observation.' },
    // Musician
    strings:        { name: 'Strings',        basePrice: 8,   description: 'A set of instrument strings in various gauges.' },
    drum_skin:      { name: 'Drum Skin',      basePrice: 15,  description: 'A tanned hide stretched for drumming.' },
    sheet_music:    { name: 'Sheet Music',    basePrice: 12,  description: 'Handwritten musical scores.' },
    // Healer
    bandage:        { name: 'Bandage',        basePrice: 5,   description: 'Clean linen bandage for wound dressing.' },
    salve:          { name: 'Salve',          basePrice: 10,  description: 'Herbal ointment for soothing cuts and burns.' },
    herb_pouch:     { name: 'Herb Pouch',     basePrice: 18,  description: 'A selection of dried medicinal herbs.' },
    // Philosopher
    riddle_box:     { name: 'Riddle Box',     basePrice: 28,  description: 'A puzzle box containing a mystery inside.' },
    meditation_mat: { name: 'Meditation Mat', basePrice: 16,  description: 'A woven mat for contemplative practice.' },
    star_chart:     { name: 'Star Chart',     basePrice: 45,  description: 'A detailed celestial map of the night sky.' },
    // Artist
    pigment:        { name: 'Pigment',        basePrice: 12,  description: 'Ground mineral pigments in vibrant colors.' },
    canvas:         { name: 'Canvas',         basePrice: 20,  description: 'A primed linen canvas ready for painting.' },
    chisel:         { name: 'Chisel',         basePrice: 22,  description: 'A sharp steel chisel for stone carving.' }
  };

  // Quest catalog
  var QUEST_CATALOG = {
    plant_10_seeds: {
      questId: 'plant_10_seeds',
      title: 'Sow the Land',
      description: 'Plant ten seeds in the gardens zone to help the community grow.',
      reward: { spark: 30, friendship: 10 },
      requirements: { level: 1 }
    },
    harvest_rare_herb: {
      questId: 'harvest_rare_herb',
      title: 'The Rare Bloom',
      description: 'Find and harvest a rare herb growing deep in the wilds.',
      reward: { spark: 60, friendship: 15 },
      requirements: { level: 3 }
    },
    build_shelter: {
      questId: 'build_shelter',
      title: 'First Shelter',
      description: 'Construct a basic shelter in the commons district.',
      reward: { spark: 40, friendship: 10 },
      requirements: { level: 1 }
    },
    repair_bridge: {
      questId: 'repair_bridge',
      title: 'Mend the Bridge',
      description: 'Repair the old stone bridge near the arena zone.',
      reward: { spark: 75, friendship: 20 },
      requirements: { level: 4 }
    },
    collect_3_tales: {
      questId: 'collect_3_tales',
      title: 'The Story Harvest',
      description: 'Speak to three different citizens and collect their personal stories.',
      reward: { spark: 35, friendship: 12 },
      requirements: { level: 1 }
    },
    visit_ancient_site: {
      questId: 'visit_ancient_site',
      title: 'Echoes of the Past',
      description: 'Visit the ancient site hidden in the athenaeum zone.',
      reward: { spark: 55, friendship: 15 },
      requirements: { level: 2 }
    },
    complete_5_trades: {
      questId: 'complete_5_trades',
      title: 'A Fair Exchange',
      description: 'Complete five successful trades in the agora market.',
      reward: { spark: 50, friendship: 10 },
      requirements: { level: 1 }
    },
    find_rare_item: {
      questId: 'find_rare_item',
      title: 'The Uncommon Commodity',
      description: 'Locate a rare item that only appears in certain zones.',
      reward: { spark: 80, friendship: 18 },
      requirements: { level: 3 }
    },
    discover_3_landmarks: {
      questId: 'discover_3_landmarks',
      title: 'Landmark Discovery',
      description: 'Explore and discover three landmarks across different zones.',
      reward: { spark: 45, friendship: 12 },
      requirements: { level: 1 }
    },
    map_unknown_area: {
      questId: 'map_unknown_area',
      title: 'Charting the Unknown',
      description: 'Create a map of an unexplored region near the wilds.',
      reward: { spark: 70, friendship: 18 },
      requirements: { level: 4 }
    },
    attend_3_lessons: {
      questId: 'attend_3_lessons',
      title: 'The Eager Student',
      description: 'Attend three lessons at the athenaeum.',
      reward: { spark: 30, friendship: 10 },
      requirements: { level: 1 }
    },
    solve_puzzle: {
      questId: 'solve_puzzle',
      title: 'The Grand Puzzle',
      description: 'Solve a complex riddle left by a former scholar.',
      reward: { spark: 65, friendship: 16 },
      requirements: { level: 2 }
    },
    play_for_crowd: {
      questId: 'play_for_crowd',
      title: 'Street Performance',
      description: 'Perform music for a crowd of at least five citizens in the agora.',
      reward: { spark: 40, friendship: 12 },
      requirements: { level: 1 }
    },
    compose_melody: {
      questId: 'compose_melody',
      title: 'New Composition',
      description: 'Compose an original melody and share it with the community.',
      reward: { spark: 60, friendship: 15 },
      requirements: { level: 2 }
    },
    heal_5_citizens: {
      questId: 'heal_5_citizens',
      title: 'Healer\'s Work',
      description: 'Provide healing or comfort to five citizens in need.',
      reward: { spark: 50, friendship: 15 },
      requirements: { level: 1 }
    },
    brew_potion: {
      questId: 'brew_potion',
      title: 'The Brew',
      description: 'Brew a restorative potion using herbs gathered in the wilds.',
      reward: { spark: 70, friendship: 18 },
      requirements: { level: 3 }
    },
    debate_3_topics: {
      questId: 'debate_3_topics',
      title: 'The Discourse',
      description: 'Engage in substantive debate on three different philosophical topics.',
      reward: { spark: 45, friendship: 12 },
      requirements: { level: 1 }
    },
    meditate_at_shrine: {
      questId: 'meditate_at_shrine',
      title: 'Shrine Meditation',
      description: 'Meditate at the ancient shrine in the athenaeum for one in-game hour.',
      reward: { spark: 55, friendship: 14 },
      requirements: { level: 2 }
    },
    create_artwork: {
      questId: 'create_artwork',
      title: 'Original Work',
      description: 'Create an original artwork and display it in the studio zone.',
      reward: { spark: 60, friendship: 15 },
      requirements: { level: 1 }
    },
    find_inspiration: {
      questId: 'find_inspiration',
      title: 'The Muse',
      description: 'Visit five different zones to gather visual inspiration for your art.',
      reward: { spark: 40, friendship: 10 },
      requirements: { level: 1 }
    }
  };

  // Price multipliers by archetype
  var ARCHETYPE_PRICE_MULTIPLIERS = {
    merchant:    0.85,
    gardener:    1.00,
    builder:     1.05,
    storyteller: 1.00,
    explorer:    1.10,
    teacher:     1.00,
    musician:    1.05,
    healer:      1.00,
    philosopher: 1.15,
    artist:      1.10
  };

  // Dialogue templates by friendship tier
  var DIALOGUE_BY_TIER = {
    stranger: {
      greeting: [
        'I don\'t believe we\'ve met. Welcome to {zone}.',
        'Ah, a new face. I am {name}, the {role} of this area.',
        'Hello there, traveler. What brings you to {zone}?'
      ],
      farewell: [
        'Safe travels, stranger.',
        'Until we meet again.',
        'May your path be clear.'
      ]
    },
    acquaintance: {
      greeting: [
        'Good to see you again, {player}.',
        'Ah, {player}! Back again, I see.',
        'Welcome back, {player}. How goes your work?'
      ],
      farewell: [
        'Take care, {player}.',
        'See you around, {player}.',
        'Until next time!'
      ]
    },
    friend: {
      greeting: [
        'There you are, {player}! I was hoping you\'d visit.',
        '{player}! Always a pleasure to see a friend.',
        'My dear {player}, welcome! Come, sit with me.'
      ],
      farewell: [
        'Come back soon, friend.',
        'Always good to see you, {player}.',
        'Take care, and visit again!'
      ]
    },
    confidant: {
      greeting: [
        '{player}, you couldn\'t have arrived at a better time.',
        'My closest friend! What adventures have you had today?',
        '{player}! I have so much to tell you.'
      ],
      farewell: [
        'You are always welcome here, {player}.',
        'Until next time, dear friend.',
        'My door is always open for you, {player}.'
      ]
    }
  };

  // Time-of-day greetings
  var TIME_GREETINGS = {
    morning:   'Good morning!',
    afternoon: 'Good afternoon!',
    evening:   'Good evening!',
    night:     'You\'re up late...'
  };

  // Archetype-specific mood by time
  var ARCHETYPE_MOOD_BY_TIME = {
    gardener:    { morning: 'happy',     afternoon: 'busy',      evening: 'neutral',    night: 'thoughtful' },
    builder:     { morning: 'busy',      afternoon: 'busy',      evening: 'neutral',    night: 'thoughtful' },
    storyteller: { morning: 'neutral',   afternoon: 'happy',     evening: 'happy',      night: 'thoughtful' },
    merchant:    { morning: 'happy',     afternoon: 'busy',      evening: 'neutral',    night: 'neutral' },
    explorer:    { morning: 'happy',     afternoon: 'neutral',   evening: 'thoughtful', night: 'thoughtful' },
    teacher:     { morning: 'happy',     afternoon: 'busy',      evening: 'neutral',    night: 'thoughtful' },
    musician:    { morning: 'neutral',   afternoon: 'neutral',   evening: 'happy',      night: 'happy' },
    healer:      { morning: 'happy',     afternoon: 'busy',      evening: 'neutral',    night: 'thoughtful' },
    philosopher: { morning: 'thoughtful', afternoon: 'thoughtful', evening: 'thoughtful', night: 'happy' },
    artist:      { morning: 'neutral',   afternoon: 'happy',     evening: 'happy',      night: 'thoughtful' }
  };

  // Gossip lines by archetype (zone-aware)
  var GOSSIP = {
    gardener:    'I heard the gardens are especially lush near the old fountain this season.',
    builder:     'They say someone is constructing a grand tower near the arena. Bold project.',
    storyteller: 'A traveler came through yesterday with the strangest tale about the wilds.',
    merchant:    'Trade has been brisk lately. The nexus market is quite busy these days.',
    explorer:    'There are uncharted paths beyond the wilds that few dare to walk.',
    teacher:     'The athenaeum received new texts last week. Fascinating reading.',
    musician:    'There was a beautiful impromptu concert in the agora just yesterday.',
    healer:      'The commons folk have been quite healthy. Fresh air and good water help.',
    philosopher: 'I\'ve been pondering the nature of zones. Are boundaries real or imagined?',
    artist:      'The studio is full of creative energy lately. Something is brewing.'
  };

  // ==========================================================================
  // NPC GENERATION
  // ==========================================================================

  var _npcRegistry = null; // lazy-initialized registry

  /**
   * Generate all 100 NPCs deterministically
   * Each zone gets 12-13 NPCs distributed across archetypes
   */
  function _generateNPCs() {
    var npcs = [];
    var nameIndex = 0;
    var archetypeIndex = 0;

    for (var z = 0; z < ZONES.length; z++) {
      var zone = ZONES[z];
      // Zones 0-3 get 13 NPCs, zones 4-7 get 12 NPCs (total = 4*13 + 4*12 = 100)
      var count = z < 4 ? 13 : 12;

      for (var n = 0; n < count; n++) {
        var npcIndex = npcs.length + 1; // 1-based
        var idStr = npcIndex < 10 ? '00' + npcIndex : (npcIndex < 100 ? '0' + npcIndex : '' + npcIndex);
        var archetype = ARCHETYPE_KEYS[archetypeIndex % ARCHETYPE_KEYS.length];
        archetypeIndex++;

        npcs.push({
          id:         'npc_' + idStr,
          name:       NPC_NAMES[nameIndex % NPC_NAMES.length],
          archetype:  archetype,
          zone:       zone,
          mood:       'neutral',
          friendship: 0
        });

        nameIndex++;
      }
    }

    return npcs;
  }

  /**
   * Get (and lazy-init) the NPC registry map by id
   */
  function _getRegistry() {
    if (!_npcRegistry) {
      _npcRegistry = {};
      var list = _generateNPCs();
      for (var i = 0; i < list.length; i++) {
        _npcRegistry[list[i].id] = list[i];
      }
    }
    return _npcRegistry;
  }

  /**
   * Get a flat array of all NPCs
   */
  function _getAllNPCs() {
    var registry = _getRegistry();
    var result = [];
    for (var id in registry) {
      if (registry.hasOwnProperty(id)) {
        result.push(registry[id]);
      }
    }
    return result;
  }

  // ==========================================================================
  // FRIENDSHIP HELPERS
  // ==========================================================================

  /**
   * Returns friendship tier string for a given friendship value
   * @param {number} friendship - 0-100
   * @returns {string} 'stranger' | 'acquaintance' | 'friend' | 'confidant'
   */
  function getFriendshipTier(friendship) {
    if (friendship >= 80) return 'confidant';
    if (friendship >= 50) return 'friend';
    if (friendship >= 20) return 'acquaintance';
    return 'stranger';
  }

  /**
   * Render an ASCII friendship bar
   * @param {number} friendship - 0-100
   * @returns {string} e.g. '[####------] 40%'
   */
  function _friendshipBar(friendship) {
    var pct = Math.max(0, Math.min(100, friendship));
    var filled = Math.round(pct / 10);
    var empty = 10 - filled;
    var bar = '[';
    for (var i = 0; i < filled; i++) bar += '#';
    for (var j = 0; j < empty; j++) bar += '-';
    bar += '] ' + pct + '%';
    return bar;
  }

  // ==========================================================================
  // PLAYER STATE (in-memory; per session)
  // ==========================================================================

  // friendship[playerId][npcId] = number
  var _friendship = {};

  // visitCounts[playerId][npcId] = number
  var _visitCounts = {};

  // completedQuests[playerId] = Set-like object {questId: true}
  var _completedQuests = {};

  // activeQuests[playerId][questId] = quest object
  var _activeQuests = {};

  // inventory[playerId] = [{itemId, name, qty}]
  var _inventory = {};

  /**
   * Get friendship value for a player/npc pair
   */
  function _getFriendship(npcId, playerId) {
    if (!_friendship[playerId]) return 0;
    return _friendship[playerId][npcId] || 0;
  }

  /**
   * Get visit count for a player/npc pair
   */
  function _getVisitCount(npcId, playerId) {
    if (!_visitCounts[playerId]) return 0;
    return _visitCounts[playerId][npcId] || 0;
  }

  /**
   * Increment visit count
   */
  function _incrementVisit(npcId, playerId) {
    if (!_visitCounts[playerId]) _visitCounts[playerId] = {};
    _visitCounts[playerId][npcId] = (_visitCounts[playerId][npcId] || 0) + 1;
  }

  // ==========================================================================
  // CORE EXPORTED FUNCTIONS
  // ==========================================================================

  /**
   * Get all NPCs in a zone
   * @param {string} zoneId
   * @returns {Array}
   */
  function getNPCsInZone(zoneId) {
    return _getAllNPCs().filter(function(npc) {
      return npc.zone === zoneId;
    });
  }

  /**
   * Get an NPC by ID
   * @param {string} npcId
   * @returns {Object|null}
   */
  function getNPCById(npcId) {
    var registry = _getRegistry();
    return registry[npcId] || null;
  }

  /**
   * Get the current mood of an NPC based on time of day
   * @param {string} npcId
   * @param {string} timeOfDay - 'morning'|'afternoon'|'evening'|'night'
   * @returns {string} mood
   */
  function getNPCMood(npcId, timeOfDay) {
    var npc = getNPCById(npcId);
    if (!npc) return 'neutral';
    var validTimes = ['morning', 'afternoon', 'evening', 'night'];
    var tod = validTimes.indexOf(timeOfDay) >= 0 ? timeOfDay : 'afternoon';
    var moodMap = ARCHETYPE_MOOD_BY_TIME[npc.archetype];
    if (!moodMap) return 'neutral';
    return moodMap[tod] || 'neutral';
  }

  /**
   * Update friendship between a player and NPC
   * @param {string} npcId
   * @param {string} playerId
   * @param {number} amount - positive or negative
   * @returns {number} new friendship level (0-100)
   */
  function updateFriendship(npcId, playerId, amount) {
    if (!_friendship[playerId]) _friendship[playerId] = {};
    var current = _friendship[playerId][npcId] || 0;
    var next = Math.max(0, Math.min(100, current + amount));
    _friendship[playerId][npcId] = next;
    return next;
  }

  /**
   * Talk to an NPC — returns dialogue object
   * @param {string} npcId
   * @param {string} playerId
   * @returns {Object} { speaker, text, options: [{label, action}] }
   */
  function talkToNPC(npcId, playerId) {
    var npc = getNPCById(npcId);
    if (!npc) {
      return {
        speaker: 'System',
        text: 'No one by that name could be found.',
        options: []
      };
    }

    var friendship = _getFriendship(npcId, playerId);
    var tier = getFriendshipTier(friendship);
    var visits = _getVisitCount(npcId, playerId);
    var archData = ARCHETYPES[npc.archetype];

    // Increment visit on talk
    _incrementVisit(npcId, playerId);

    // Small friendship boost on visit (capped after many visits)
    if (visits < 10) {
      updateFriendship(npcId, playerId, 2);
    }

    // Determine time-of-day greeting prefix
    var hour = new Date().getHours();
    var tod;
    if (hour >= 5 && hour < 12)       tod = 'morning';
    else if (hour >= 12 && hour < 17) tod = 'afternoon';
    else if (hour >= 17 && hour < 21) tod = 'evening';
    else                               tod = 'night';

    var timeGreet = TIME_GREETINGS[tod];

    // Build greeting based on tier
    var tierGreetings = DIALOGUE_BY_TIER[tier].greeting;
    var greetIdx = visits % tierGreetings.length;
    var greetTemplate = tierGreetings[greetIdx];

    var playerLabel = playerId || 'traveler';
    var greet = greetTemplate
      .replace('{player}', playerLabel)
      .replace('{name}', npc.name)
      .replace('{role}', archData.role)
      .replace('{zone}', npc.zone);

    var introLine = (tier === 'stranger')
      ? greet
      : (timeGreet + ' ' + greet);

    // Archetype greeting on first visit
    var text;
    if (visits === 0) {
      text = archData.greeting + ' ' + introLine;
    } else {
      text = introLine;
    }

    return {
      speaker: npc.name,
      text: text,
      options: [
        { label: '[>] Chat',    action: 'gossip' },
        { label: '[$] Shop',   action: 'shop' },
        { label: '[!] Quest',  action: 'quest' },
        { label: '[~] Goodbye', action: 'farewell' }
      ]
    };
  }

  /**
   * Get available dialogue options for an NPC
   * @param {string} npcId
   * @param {string} playerId
   * @param {string} context - 'greeting'|'shop'|'quest'|'gossip'|'farewell'
   * @returns {Array} [{label, action}]
   */
  function getDialogueOptions(npcId, playerId, context) {
    var npc = getNPCById(npcId);
    if (!npc) return [];

    var baseOptions = [
      { label: '[>] Chat',    action: 'gossip' },
      { label: '[$] Shop',   action: 'shop' },
      { label: '[!] Quest',  action: 'quest' },
      { label: '[~] Goodbye', action: 'farewell' }
    ];

    if (context === 'farewell') {
      return [{ label: '[>] Wait, one more thing...', action: 'greeting' }];
    }
    if (context === 'gossip') {
      return [
        { label: '[>] Tell me more', action: 'gossip' },
        { label: '[~] Goodbye',      action: 'farewell' },
        { label: '[$] Shop',         action: 'shop' },
        { label: '[!] Quest',        action: 'quest' }
      ];
    }
    if (context === 'shop') {
      return [
        { label: '[>] Chat',    action: 'gossip' },
        { label: '[!] Quest',  action: 'quest' },
        { label: '[~] Goodbye', action: 'farewell' }
      ];
    }
    if (context === 'quest') {
      return [
        { label: '[>] Chat',    action: 'gossip' },
        { label: '[$] Shop',   action: 'shop' },
        { label: '[~] Goodbye', action: 'farewell' }
      ];
    }
    return baseOptions;
  }

  /**
   * Process a dialogue choice and return the next state
   * @param {string} npcId
   * @param {string} playerId
   * @param {string} choice - action string from dialogue option
   * @returns {Object} { speaker, text, options, effect }
   */
  function processDialogueChoice(npcId, playerId, choice) {
    var npc = getNPCById(npcId);
    if (!npc) {
      return { speaker: 'System', text: 'NPC not found.', options: [], effect: null };
    }

    var archData = ARCHETYPES[npc.archetype];
    var friendship = _getFriendship(npcId, playerId);
    var tier = getFriendshipTier(friendship);
    var effect = null;

    if (choice === 'gossip') {
      var gossipLine = GOSSIP[npc.archetype] || 'Things seem quiet around here.';
      // Small friendship gain for chatting
      var newFriendship = updateFriendship(npcId, playerId, 1);
      effect = { type: 'friendship', delta: 1, total: newFriendship };
      return {
        speaker: npc.name,
        text: gossipLine,
        options: getDialogueOptions(npcId, playerId, 'gossip'),
        effect: effect
      };
    }

    if (choice === 'farewell') {
      var farewellTemplates = DIALOGUE_BY_TIER[tier].farewell;
      var farewellIdx = _getVisitCount(npcId, playerId) % farewellTemplates.length;
      var farewellText = farewellTemplates[farewellIdx]
        .replace('{player}', playerId || 'traveler')
        .replace('{name}', npc.name);
      return {
        speaker: npc.name,
        text: farewellText,
        options: [],
        effect: null
      };
    }

    if (choice === 'shop') {
      var inventory = getShopInventory(npcId);
      var itemList = inventory.map(function(item) {
        return item.name + ' (' + item.price + ' Spark)';
      }).join(', ');
      return {
        speaker: npc.name,
        text: 'Here is what I have available: ' + itemList,
        options: getDialogueOptions(npcId, playerId, 'shop'),
        effect: { type: 'open_shop', npcId: npcId }
      };
    }

    if (choice === 'quest') {
      var playerLabel = playerId || 'traveler';
      var quests = getAvailableQuests(npcId, playerId);
      if (quests.length === 0) {
        return {
          speaker: npc.name,
          text: 'I have no tasks for you right now, ' + playerLabel + '. Come back later.',
          options: getDialogueOptions(npcId, playerId, 'quest'),
          effect: null
        };
      }
      var questNames = quests.map(function(q) { return '[!] ' + q.title; }).join(', ');
      return {
        speaker: npc.name,
        text: 'I have work that needs doing, ' + playerLabel + ': ' + questNames,
        options: getDialogueOptions(npcId, playerId, 'quest'),
        effect: { type: 'open_quests', npcId: npcId }
      };
    }

    if (choice === 'greeting') {
      return talkToNPC(npcId, playerId);
    }

    return {
      speaker: npc.name,
      text: 'Hmm, I\'m not sure what you mean.',
      options: getDialogueOptions(npcId, playerId, 'greeting'),
      effect: null
    };
  }

  /**
   * Get shop inventory for an NPC
   * @param {string} npcId
   * @returns {Array} [{id, name, price, description, stock}]
   */
  function getShopInventory(npcId) {
    var npc = getNPCById(npcId);
    if (!npc) return [];

    var archData = ARCHETYPES[npc.archetype];
    var multiplier = ARCHETYPE_PRICE_MULTIPLIERS[npc.archetype] || 1.0;

    return archData.shop.map(function(itemId) {
      var catalogItem = ITEM_CATALOG[itemId];
      if (!catalogItem) return null;
      var price = Math.round(catalogItem.basePrice * multiplier);
      return {
        id:          itemId,
        name:        catalogItem.name,
        price:       price,
        description: catalogItem.description,
        stock:       10
      };
    }).filter(function(item) { return item !== null; });
  }

  /**
   * Buy an item from an NPC
   * @param {string} npcId
   * @param {string} itemId
   * @param {string} playerId
   * @param {Object} [economy] - optional economy ledger (guards if absent)
   * @returns {Object} { success, message, item, cost }
   */
  function buyFromNPC(npcId, itemId, playerId, economy) {
    var npc = getNPCById(npcId);
    if (!npc) {
      return { success: false, message: 'NPC not found.', item: null, cost: 0 };
    }

    var inventory = getShopInventory(npcId);
    var shopItem = null;
    for (var i = 0; i < inventory.length; i++) {
      if (inventory[i].id === itemId) {
        shopItem = inventory[i];
        break;
      }
    }

    if (!shopItem) {
      return { success: false, message: 'Item not available from this NPC.', item: null, cost: 0 };
    }

    // Attempt economy deduction if provided
    if (economy && typeof economy.getBalance === 'function') {
      var balance = economy.getBalance(playerId);
      if (balance < shopItem.price) {
        return {
          success: false,
          message: 'Not enough Spark. Need ' + shopItem.price + ', have ' + balance + '.',
          item: null,
          cost: shopItem.price
        };
      }
      if (typeof economy.deduct === 'function') {
        economy.deduct(playerId, shopItem.price);
      }
    }

    // Add to player inventory
    if (!_inventory[playerId]) _inventory[playerId] = [];
    var found = false;
    for (var j = 0; j < _inventory[playerId].length; j++) {
      if (_inventory[playerId][j].itemId === itemId) {
        _inventory[playerId][j].qty += 1;
        found = true;
        break;
      }
    }
    if (!found) {
      _inventory[playerId].push({ itemId: itemId, name: shopItem.name, qty: 1 });
    }

    // Small friendship bump on purchase
    updateFriendship(npcId, playerId, 3);

    return {
      success: true,
      message: 'You purchased ' + shopItem.name + ' for ' + shopItem.price + ' Spark.',
      item: shopItem,
      cost: shopItem.price
    };
  }

  /**
   * Get available quests from an NPC for a player
   * @param {string} npcId
   * @param {string} playerId
   * @returns {Array} quest objects
   */
  function getAvailableQuests(npcId, playerId) {
    var npc = getNPCById(npcId);
    if (!npc) return [];

    var archData = ARCHETYPES[npc.archetype];
    var completed = _completedQuests[playerId] || {};
    var active = _activeQuests[playerId] || {};

    return archData.quests.map(function(questId) {
      return QUEST_CATALOG[questId] || null;
    }).filter(function(quest) {
      if (!quest) return false;
      if (completed[quest.questId]) return false;
      if (active[quest.questId]) return false;
      return true;
    });
  }

  /**
   * Accept a quest from an NPC
   * @param {string} npcId
   * @param {string} questId
   * @param {string} playerId
   * @returns {Object} { success, quest }
   */
  function acceptQuestFromNPC(npcId, questId, playerId) {
    var npc = getNPCById(npcId);
    if (!npc) {
      return { success: false, quest: null, message: 'NPC not found.' };
    }

    var archData = ARCHETYPES[npc.archetype];
    if (archData.quests.indexOf(questId) < 0) {
      return { success: false, quest: null, message: 'This NPC does not offer that quest.' };
    }

    var quest = QUEST_CATALOG[questId];
    if (!quest) {
      return { success: false, quest: null, message: 'Quest not found.' };
    }

    var completed = _completedQuests[playerId] || {};
    if (completed[questId]) {
      return { success: false, quest: quest, message: 'You have already completed this quest.' };
    }

    if (!_activeQuests[playerId]) _activeQuests[playerId] = {};
    if (_activeQuests[playerId][questId]) {
      return { success: false, quest: quest, message: 'Quest already active.' };
    }

    _activeQuests[playerId][questId] = quest;

    // Friendship bonus for accepting
    updateFriendship(npcId, playerId, 5);

    return { success: true, quest: quest, message: 'Quest accepted: ' + quest.title };
  }

  /**
   * Search NPCs by name, role, or zone
   * @param {string} query
   * @returns {Array} matching NPCs
   */
  function searchNPCs(query) {
    if (!query || typeof query !== 'string') return [];
    var q = query.toLowerCase().trim();
    if (q.length === 0) return [];

    return _getAllNPCs().filter(function(npc) {
      var archData = ARCHETYPES[npc.archetype];
      var role = archData ? archData.role.toLowerCase() : '';
      return (
        npc.name.toLowerCase().indexOf(q) >= 0 ||
        role.indexOf(q) >= 0 ||
        npc.zone.toLowerCase().indexOf(q) >= 0 ||
        npc.archetype.toLowerCase().indexOf(q) >= 0
      );
    });
  }

  /**
   * Format an NPC card as HTML string
   * @param {Object} npc
   * @param {number} friendship - 0-100
   * @returns {string} HTML string
   */
  function formatNPCCard(npc, friendship) {
    if (!npc) return '<div class="npc-card npc-card--empty">No NPC data.</div>';

    var f = typeof friendship === 'number' ? friendship : 0;
    var archData = ARCHETYPES[npc.archetype] || { role: 'Unknown' };
    var tier = getFriendshipTier(f);
    var bar = _friendshipBar(f);
    var mood = npc.mood || 'neutral';

    return (
      '<div class="npc-card" data-id="' + npc.id + '">' +
        '<div class="npc-card__header">' +
          '<span class="npc-card__name">' + npc.name + '</span>' +
          '<span class="npc-card__role"> &mdash; ' + archData.role + '</span>' +
        '</div>' +
        '<div class="npc-card__meta">' +
          '<span class="npc-card__zone">Zone: ' + npc.zone + '</span>' +
          ' | ' +
          '<span class="npc-card__mood">[~] ' + mood + '</span>' +
        '</div>' +
        '<div class="npc-card__friendship">' +
          'Friendship (' + tier + '): ' + bar +
        '</div>' +
        '<div class="npc-card__actions">' +
          '<button class="npc-btn npc-btn--talk"  data-npc="' + npc.id + '">[>] Talk</button>' +
          '<button class="npc-btn npc-btn--shop"  data-npc="' + npc.id + '">[$] Shop</button>' +
          '<button class="npc-btn npc-btn--quest" data-npc="' + npc.id + '">[!] Quest</button>' +
        '</div>' +
      '</div>'
    );
  }

  // ==========================================================================
  // DOM PANEL (browser only; guarded)
  // ==========================================================================

  /**
   * Create the NPC interaction panel DOM element
   * @returns {Element|Object} DOM element (or plain object if no DOM)
   */
  function createNPCPanel() {
    // Guard: no DOM in Node environment
    if (typeof document === 'undefined') {
      return { type: 'npc-panel', rendered: false };
    }

    var panel = document.createElement('div');
    panel.className = 'dashboard-npc-panel';
    panel.setAttribute('data-panel', 'npcs');

    // --- Filter bar ---
    var filterBar = document.createElement('div');
    filterBar.className = 'npc-filter-bar';

    var zoneSelect = document.createElement('select');
    zoneSelect.className = 'npc-filter-zone';
    zoneSelect.innerHTML = '<option value="">All Zones</option>' +
      ZONES.map(function(z) {
        return '<option value="' + z + '">' + z.charAt(0).toUpperCase() + z.slice(1) + '</option>';
      }).join('');

    var archetypeSelect = document.createElement('select');
    archetypeSelect.className = 'npc-filter-archetype';
    archetypeSelect.innerHTML = '<option value="">All Roles</option>' +
      ARCHETYPE_KEYS.map(function(k) {
        return '<option value="' + k + '">' + ARCHETYPES[k].role + '</option>';
      }).join('');

    var searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'npc-filter-search';
    searchInput.placeholder = 'Search by name...';

    filterBar.appendChild(zoneSelect);
    filterBar.appendChild(archetypeSelect);
    filterBar.appendChild(searchInput);

    // --- NPC list ---
    var npcList = document.createElement('div');
    npcList.className = 'npc-list';

    // Render first zone by default
    var allNPCs = getNPCsInZone(ZONES[0]);
    for (var i = 0; i < allNPCs.length; i++) {
      var npc = allNPCs[i];
      var friendship = 0;
      var cardHtml = formatNPCCard(npc, friendship);
      var wrapper = document.createElement('div');
      wrapper.innerHTML = cardHtml;
      npcList.appendChild(wrapper.firstChild);
    }

    // --- Interaction area ---
    var interactionArea = document.createElement('div');
    interactionArea.className = 'npc-interaction-area';
    interactionArea.innerHTML = '<p class="npc-interaction-prompt">Select an NPC to interact.</p>';

    // --- Wire up filter events ---
    function _applyFilters() {
      var zone = zoneSelect.value;
      var archetype = archetypeSelect.value;
      var query = searchInput.value;

      var filtered = _getAllNPCs();

      if (zone) {
        filtered = filtered.filter(function(n) { return n.zone === zone; });
      }
      if (archetype) {
        filtered = filtered.filter(function(n) { return n.archetype === archetype; });
      }
      if (query) {
        var q = query.toLowerCase();
        filtered = filtered.filter(function(n) {
          var role = (ARCHETYPES[n.archetype] || {}).role || '';
          return (
            n.name.toLowerCase().indexOf(q) >= 0 ||
            role.toLowerCase().indexOf(q) >= 0 ||
            n.zone.toLowerCase().indexOf(q) >= 0
          );
        });
      }

      npcList.innerHTML = '';
      for (var fi = 0; fi < filtered.length; fi++) {
        var fn = filtered[fi];
        var html = formatNPCCard(fn, _getFriendship(fn.id, 'player'));
        var wr = document.createElement('div');
        wr.innerHTML = html;
        npcList.appendChild(wr.firstChild);
      }

      if (filtered.length === 0) {
        npcList.innerHTML = '<p class="npc-list--empty">No NPCs match your search.</p>';
      }
    }

    zoneSelect.addEventListener('change', _applyFilters);
    archetypeSelect.addEventListener('change', _applyFilters);
    searchInput.addEventListener('input', _applyFilters);

    // --- Wire up NPC action buttons via delegation ---
    npcList.addEventListener('click', function(e) {
      var btn = e.target;
      if (!btn.classList.contains('npc-btn')) return;
      var npcId = btn.getAttribute('data-npc');
      var playerId = 'player';

      interactionArea.innerHTML = '';

      if (btn.classList.contains('npc-btn--talk')) {
        var dialogue = talkToNPC(npcId, playerId);
        _renderDialogue(interactionArea, dialogue, npcId, playerId);
      } else if (btn.classList.contains('npc-btn--shop')) {
        _renderShop(interactionArea, npcId, playerId);
      } else if (btn.classList.contains('npc-btn--quest')) {
        _renderQuests(interactionArea, npcId, playerId);
      }
    });

    // Assemble panel
    panel.appendChild(filterBar);
    panel.appendChild(npcList);
    panel.appendChild(interactionArea);

    return panel;
  }

  /**
   * Render dialogue into a container (internal helper)
   */
  function _renderDialogue(container, dialogue, npcId, playerId) {
    var div = document.createElement('div');
    div.className = 'npc-dialogue';
    div.innerHTML =
      '<div class="npc-dialogue__speaker">' + dialogue.speaker + '</div>' +
      '<div class="npc-dialogue__text">' + dialogue.text + '</div>' +
      '<div class="npc-dialogue__options"></div>';

    var optionsDiv = div.querySelector('.npc-dialogue__options');
    dialogue.options.forEach(function(opt) {
      var btn = document.createElement('button');
      btn.className = 'npc-dialogue__option-btn';
      btn.textContent = opt.label;
      btn.addEventListener('click', function() {
        var result = processDialogueChoice(npcId, playerId, opt.action);
        container.innerHTML = '';
        _renderDialogue(container, result, npcId, playerId);
      });
      optionsDiv.appendChild(btn);
    });

    container.appendChild(div);
  }

  /**
   * Render shop into a container (internal helper)
   */
  function _renderShop(container, npcId, playerId) {
    var inventory = getShopInventory(npcId);
    var npc = getNPCById(npcId);
    var html = '<div class="npc-shop"><h3>[$] ' + (npc ? npc.name : '') + '\'s Shop</h3><ul>';
    inventory.forEach(function(item) {
      html += '<li><strong>' + item.name + '</strong> &mdash; ' + item.price + ' Spark &mdash; ' + item.description + '</li>';
    });
    html += '</ul></div>';
    container.innerHTML = html;
  }

  /**
   * Render quests into a container (internal helper)
   */
  function _renderQuests(container, npcId, playerId) {
    var quests = getAvailableQuests(npcId, playerId);
    var npc = getNPCById(npcId);
    var html = '<div class="npc-quests"><h3>[!] ' + (npc ? npc.name : '') + '\'s Quests</h3>';
    if (quests.length === 0) {
      html += '<p>No quests available right now.</p>';
    } else {
      html += '<ul>';
      quests.forEach(function(q) {
        html += '<li><strong>' + q.title + '</strong> &mdash; ' + q.description +
                ' <em>(Reward: ' + q.reward.spark + ' Spark)</em></li>';
      });
      html += '</ul>';
    }
    html += '</div>';
    container.innerHTML = html;
  }

  // ==========================================================================
  // EXPORTS
  // ==========================================================================

  exports.ARCHETYPES             = ARCHETYPES;
  exports.ZONES                  = ZONES;
  exports.NPC_NAMES              = NPC_NAMES;
  exports.ITEM_CATALOG           = ITEM_CATALOG;
  exports.QUEST_CATALOG          = QUEST_CATALOG;
  exports.ARCHETYPE_PRICE_MULTIPLIERS = ARCHETYPE_PRICE_MULTIPLIERS;

  exports.createNPCPanel         = createNPCPanel;
  exports.getNPCsInZone          = getNPCsInZone;
  exports.getNPCById             = getNPCById;
  exports.talkToNPC              = talkToNPC;
  exports.getShopInventory       = getShopInventory;
  exports.buyFromNPC             = buyFromNPC;
  exports.getAvailableQuests     = getAvailableQuests;
  exports.acceptQuestFromNPC     = acceptQuestFromNPC;
  exports.updateFriendship       = updateFriendship;
  exports.getFriendshipTier      = getFriendshipTier;
  exports.getNPCMood             = getNPCMood;
  exports.searchNPCs             = searchNPCs;
  exports.formatNPCCard          = formatNPCCard;
  exports.getDialogueOptions     = getDialogueOptions;
  exports.processDialogueChoice  = processDialogueChoice;

  // Internal helpers exposed for testing
  exports._generateNPCs          = _generateNPCs;
  exports._friendshipBar         = _friendshipBar;
  exports._getAllNPCs            = _getAllNPCs;
  exports._getFriendship         = _getFriendship;

})(typeof module !== 'undefined' ? module.exports : (window.DashboardNPCs = {}));
