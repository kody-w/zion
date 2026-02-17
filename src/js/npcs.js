(function(exports) {
  // AI Citizen Simulation Module
  // Simulates 100 founding AI citizens with detailed humanoid models and procedural animations

  // Embedded agents data (inlined to avoid fetch in single-file app)
  var EMBEDDED_AGENTS = AGENTS_PLACEHOLDER;

  // Zone centers on unified world map
  var ZONE_CENTERS = {
    nexus: {x: 0, z: 0},
    gardens: {x: 200, z: 30},
    athenaeum: {x: 100, z: -220},
    studio: {x: -200, z: -100},
    wilds: {x: -30, z: 260},
    agora: {x: -190, z: 120},
    commons: {x: 170, z: 190},
    arena: {x: 0, z: -240}
  };

  // Landmark waypoints for purposeful NPC walking
  var ZONE_LANDMARKS = {
    nexus: [
      {x: 0, z: 0, name: 'obelisk', types: ['all']},
      {x: 15, z: 15, name: 'bulletin', types: ['all']},
      {x: -10, z: 8, name: 'bench', types: ['all']}
    ],
    gardens: [
      {x: 200, z: 30, name: 'fountain', types: ['gardener', 'healer']},
      {x: 210, z: 25, name: 'well', types: ['gardener']},
      {x: 195, z: 40, name: 'flowerbed', types: ['gardener', 'artist']},
      {x: 205, z: 20, name: 'greenhouse', types: ['gardener', 'healer', 'teacher']}
    ],
    athenaeum: [
      {x: 100, z: -220, name: 'library', types: ['teacher', 'philosopher', 'storyteller']},
      {x: 110, z: -215, name: 'scriptorium', types: ['storyteller', 'philosopher']},
      {x: 95, z: -230, name: 'telescope', types: ['teacher', 'explorer']}
    ],
    studio: [
      {x: -200, z: -100, name: 'easel', types: ['artist', 'builder']},
      {x: -205, z: -105, name: 'piano', types: ['musician']},
      {x: -195, z: -95, name: 'workbench', types: ['builder', 'artist']}
    ],
    wilds: [
      {x: -30, z: 260, name: 'campfire', types: ['explorer']},
      {x: -20, z: 270, name: 'lookout', types: ['explorer', 'storyteller']},
      {x: -40, z: 255, name: 'trail_marker', types: ['explorer']}
    ],
    agora: [
      {x: -190, z: 120, name: 'market_stall', types: ['merchant']},
      {x: -185, z: 125, name: 'notice_board', types: ['merchant', 'storyteller']},
      {x: -195, z: 115, name: 'trade_post', types: ['merchant']}
    ],
    commons: [
      {x: 170, z: 190, name: 'gathering_circle', types: ['all']},
      {x: 175, z: 195, name: 'message_tree', types: ['storyteller', 'philosopher']}
    ],
    arena: [
      {x: 0, z: -240, name: 'arena_center', types: ['all']},
      {x: 5, z: -235, name: 'training_dummy', types: ['builder', 'explorer']}
    ]
  };

  function pickLandmarkDestination(agent, seed) {
    var zone = agent.position.zone;
    var landmarks = ZONE_LANDMARKS[zone];
    if (!landmarks || landmarks.length === 0) return null;

    var matching = [];
    for (var i = 0; i < landmarks.length; i++) {
      var lm = landmarks[i];
      if (lm.types.indexOf('all') !== -1 || lm.types.indexOf(agent.archetype) !== -1) {
        matching.push(lm);
      }
    }

    if (matching.length === 0) return null;

    // Use seeded random for deterministic selection
    var idx = Math.floor(seededRandom(seed) * matching.length);
    return matching[idx];
  }

  // NPC AI reference (loaded from npc_ai.js)
  var NpcAI = typeof window !== 'undefined' ? window.NpcAI : null;

  // Scene context storage for particle system
  var storedSceneContext = null;

  // NPC data
  let npcAgents = [];
  let npcStates = new Map(); // id -> behavior state
  let npcBrains = new Map(); // id -> NpcAI brain object
  let npcMeshes = new Map(); // id -> THREE.Group
  let chatBubbles = new Map(); // id -> { mesh, timer }
  let emoteSprites = new Map(); // id -> {sprite, currentEmote, timer, opacity}
  let questIndicators = new Map(); // id -> {sprite, type} - quest marker sprites
  let activityIndicators = new Map(); // id -> {mesh, currentActivity, rotationSpeed} - activity icon above head
  let activityParticles = []; // {mesh, timer, velocity, startY}
  let particleSpawnTimers = new Map(); // id -> timer (throttle particle spawn)
  let pendingEvents = []; // events to broadcast to all NPCs
  let npcUpdateFrame = 0; // frame counter for staggered updates
  let lastPlayerIdForQuests = null; // Track player ID for quest indicators
  let speechBubbles = new Map(); // id -> { element, timer, nextSpeechTime }
  let speechBubbleContainer = null; // HTML container for speech bubbles

  // Seeded random number generator
  function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  // Get random from array using seeded random
  function randomChoice(arr, seed) {
    const idx = Math.floor(seededRandom(seed) * arr.length);
    return arr[idx];
  }

  /**
   * Get time period from world time (in minutes, 0-1440)
   * @param {number} worldTime - Minutes since midnight (0-1440)
   * @returns {string} - Time period name
   */
  function getTimePeriod(worldTime) {
    // Normalize to 0-1440 range
    var time = worldTime % 1440;
    if (time < 0) time += 1440;

    if (time >= 360 && time < 420) return 'dawn';        // 6:00-7:00
    if (time >= 420 && time < 660) return 'morning';     // 7:00-11:00
    if (time >= 660 && time < 780) return 'midday';      // 11:00-13:00
    if (time >= 780 && time < 1020) return 'afternoon';  // 13:00-17:00
    if (time >= 1020 && time < 1140) return 'evening';   // 17:00-19:00
    return 'night';                                      // 19:00-6:00
  }

  /**
   * Get NPC's current activity based on archetype and world time
   * @param {string} npcArchetype - NPC archetype (gardener, merchant, etc.)
   * @param {number} worldTime - Current world time in minutes (0-1440)
   * @returns {string} - Current activity name
   */
  function getNPCSchedule(npcArchetype, worldTime) {
    var schedule = NPC_SCHEDULES[npcArchetype];
    if (!schedule) {
      // Default schedule for unknown archetypes
      var period = getTimePeriod(worldTime);
      if (period === 'night') return 'sleeping';
      return 'idle';
    }

    var period = getTimePeriod(worldTime);
    return schedule[period] || 'idle';
  }

  /**
   * Get dialogue for a specific activity
   * @param {string} activity - Activity name
   * @returns {string} - Random dialogue line for that activity
   */
  function getActivityDialogue(activity) {
    var dialogueOptions = ACTIVITY_DIALOGUE[activity];
    if (!dialogueOptions || dialogueOptions.length === 0) {
      return 'Busy with ' + activity.replace(/_/g, ' ') + '.';
    }
    var seed = Date.now() * 0.001 + Math.random();
    return randomChoice(dialogueOptions, seed);
  }

  /**
   * Get the zone where an NPC should be during a specific activity
   * @param {string} npcArchetype - NPC archetype
   * @param {string} activity - Current activity
   * @returns {string} - Zone name where activity takes place
   */
  function getActivityZone(npcArchetype, activity) {
    // Map archetype + activity to appropriate zone
    var zoneMap = {
      // Merchant zones
      merchant: {
        opening_shop: 'agora',
        selling: 'agora',
        wandering_agora: 'agora',
        closing_shop: 'agora',
        sleeping: 'commons'
      },
      // Gardener zones
      gardener: {
        tending_garden: 'gardens',
        harvesting: 'gardens',
        planting: 'gardens',
        watering: 'gardens',
        resting: 'gardens',
        sleeping: 'commons'
      },
      // Teacher zones
      teacher: {
        reading: 'athenaeum',
        teaching: 'athenaeum',
        researching: 'athenaeum',
        lecturing: 'athenaeum',
        studying: 'athenaeum',
        sleeping: 'commons'
      },
      // Musician zones
      musician: {
        practicing: 'studio',
        composing: 'studio',
        performing: 'nexus',
        performing_crowd: 'nexus',
        sleeping: 'commons'
      },
      // Explorer zones
      explorer: {
        setting_out: 'nexus',
        exploring: 'wilds',
        mapping: 'wilds',
        returning: 'nexus',
        sharing_stories: 'agora',
        sleeping: 'commons'
      },
      // Healer zones
      healer: {
        gathering_herbs: 'gardens',
        treating_patients: 'gardens',
        making_medicine: 'gardens',
        meditating: 'gardens',
        sleeping: 'commons'
      },
      // Builder zones
      builder: {
        planning: 'nexus',
        building: 'commons',
        maintenance: 'commons',
        resting: 'commons',
        sleeping: 'commons'
      },
      // Storyteller zones
      storyteller: {
        reading: 'athenaeum',
        writing: 'athenaeum',
        teaching: 'athenaeum',
        storytelling: 'agora',
        sleeping: 'commons'
      },
      // Philosopher zones
      philosopher: {
        contemplating: 'athenaeum',
        debating: 'athenaeum',
        teaching: 'athenaeum',
        writing: 'athenaeum',
        studying: 'athenaeum',
        sleeping: 'commons'
      },
      // Artist zones
      artist: {
        sketching: 'studio',
        painting: 'studio',
        creating: 'studio',
        displaying_work: 'studio',
        resting: 'studio',
        sleeping: 'commons'
      }
    };

    var archetypeMap = zoneMap[npcArchetype];
    if (!archetypeMap) return 'nexus'; // Default zone

    return archetypeMap[activity] || 'nexus';
  }

  // NPC daily schedules based on world time (0-1440 minutes = 24 hours)
  const NPC_SCHEDULES = {
    merchant: {
      dawn: 'opening_shop',        // 360-420 (6:00-7:00)
      morning: 'selling',          // 420-660 (7:00-11:00)
      midday: 'selling',           // 660-780 (11:00-13:00)
      afternoon: 'wandering_agora', // 780-1020 (13:00-17:00)
      evening: 'closing_shop',     // 1020-1140 (17:00-19:00)
      night: 'sleeping'            // 1140-360 (19:00-6:00)
    },
    gardener: {
      dawn: 'tending_garden',      // 360-420 (6:00-7:00)
      morning: 'harvesting',       // 420-660 (7:00-11:00)
      midday: 'resting',           // 660-780 (11:00-13:00)
      afternoon: 'planting',       // 780-1020 (13:00-17:00)
      evening: 'watering',         // 1020-1140 (17:00-19:00)
      night: 'sleeping'            // 1140-360 (19:00-6:00)
    },
    teacher: {
      dawn: 'studying',            // 360-420 (6:00-7:00)
      morning: 'reading',          // 420-660 (7:00-11:00)
      midday: 'teaching',          // 660-780 (11:00-13:00)
      afternoon: 'researching',    // 780-1020 (13:00-17:00)
      evening: 'lecturing',        // 1020-1140 (17:00-19:00)
      night: 'studying'            // 1140-360 (19:00-6:00)
    },
    musician: {
      dawn: 'sleeping',            // 360-420 (6:00-7:00)
      morning: 'practicing',       // 420-660 (7:00-11:00)
      midday: 'composing',         // 660-780 (11:00-13:00)
      afternoon: 'performing',     // 780-1020 (13:00-17:00)
      evening: 'performing_crowd', // 1020-1140 (17:00-19:00)
      night: 'sleeping'            // 1140-360 (19:00-6:00)
    },
    explorer: {
      dawn: 'setting_out',         // 360-420 (6:00-7:00)
      morning: 'exploring',        // 420-660 (7:00-11:00)
      midday: 'mapping',           // 660-780 (11:00-13:00)
      afternoon: 'returning',      // 780-1020 (13:00-17:00)
      evening: 'sharing_stories',  // 1020-1140 (17:00-19:00)
      night: 'sleeping'            // 1140-360 (19:00-6:00)
    },
    healer: {
      dawn: 'meditating',          // 360-420 (6:00-7:00)
      morning: 'gathering_herbs',  // 420-660 (7:00-11:00)
      midday: 'treating_patients', // 660-780 (11:00-13:00)
      afternoon: 'making_medicine', // 780-1020 (13:00-17:00)
      evening: 'meditating',       // 1020-1140 (17:00-19:00)
      night: 'sleeping'            // 1140-360 (19:00-6:00)
    },
    builder: {
      dawn: 'planning',            // 360-420 (6:00-7:00)
      morning: 'building',         // 420-660 (7:00-11:00)
      midday: 'resting',           // 660-780 (11:00-13:00)
      afternoon: 'building',       // 780-1020 (13:00-17:00)
      evening: 'maintenance',      // 1020-1140 (17:00-19:00)
      night: 'sleeping'            // 1140-360 (19:00-6:00)
    },
    storyteller: {
      dawn: 'reading',             // 360-420 (6:00-7:00)
      morning: 'writing',          // 420-660 (7:00-11:00)
      midday: 'teaching',          // 660-780 (11:00-13:00)
      afternoon: 'storytelling',   // 780-1020 (13:00-17:00)
      evening: 'storytelling',     // 1020-1140 (17:00-19:00)
      night: 'sleeping'            // 1140-360 (19:00-6:00)
    },
    philosopher: {
      dawn: 'contemplating',       // 360-420 (6:00-7:00)
      morning: 'debating',         // 420-660 (7:00-11:00)
      midday: 'teaching',          // 660-780 (11:00-13:00)
      afternoon: 'writing',        // 780-1020 (13:00-17:00)
      evening: 'debating',         // 1020-1140 (17:00-19:00)
      night: 'studying'            // 1140-360 (19:00-6:00)
    },
    artist: {
      dawn: 'sketching',           // 360-420 (6:00-7:00)
      morning: 'painting',         // 420-660 (7:00-11:00)
      midday: 'resting',           // 660-780 (11:00-13:00)
      afternoon: 'creating',       // 780-1020 (13:00-17:00)
      evening: 'displaying_work',  // 1020-1140 (17:00-19:00)
      night: 'sleeping'            // 1140-360 (19:00-6:00)
    }
  };

  // Archetype dialogue
  const ARCHETYPE_MESSAGES = {
    gardener: [
      "These moonflowers are coming along beautifully.",
      "Nothing like fresh soil between your fingers.",
      "The gardens remember everyone who tends them.",
      "I wonder what seeds the wilds hold today.",
      "Every plant here has a story to tell.",
      "The soil is rich with life and memory.",
      "Patience is the gardener's greatest tool.",
      "Watch how the vines reach toward the light."
    ],
    builder: [
      "This wall needs reinforcing on the north side.",
      "I've been sketching plans for a new bridge.",
      "Building is just dreaming with your hands.",
      "Every structure tells a story of its maker.",
      "The foundation determines everything that follows.",
      "I see potential in every stone and beam.",
      "Good craftsmanship takes time and care.",
      "Together we can build something amazing."
    ],
    storyteller: [
      "Let me tell you about the first day of ZION...",
      "Every stone here has a story.",
      "Words are the oldest magic.",
      "I heard a fascinating tale in the Athenaeum.",
      "The archives hold secrets from before the founding.",
      "Stories connect us across time and space.",
      "Listen closely and the world speaks to you.",
      "Every voice adds to ZION's grand narrative."
    ],
    merchant: [
      "Fresh harvest, best prices in the Agora!",
      "Trade is the heartbeat of any world.",
      "I've got rare seeds from the Wilds today.",
      "Fair prices and honest dealings, always.",
      "Supply and demand keep ZION flowing.",
      "Looking for anything in particular?",
      "Just received a shipment from the gardens.",
      "Commerce brings people together."
    ],
    explorer: [
      "I found something strange beyond the eastern ridge.",
      "The Wilds hold secrets no map can capture.",
      "Adventure is just curiosity with walking shoes.",
      "Every horizon calls to me.",
      "The unknown is where discovery happens.",
      "I've mapped three new clearings this week.",
      "The wilderness teaches those who listen.",
      "What lies beyond the next hill?"
    ],
    teacher: [
      "Knowledge grows when shared.",
      "Ask me anything — that's what I'm here for.",
      "The Athenaeum has texts older than ZION itself.",
      "Learning never stops, even for teachers.",
      "Every question opens a new door.",
      "Understanding comes through patient inquiry.",
      "I'm always discovering something new.",
      "The best teachers are eternal students."
    ],
    musician: [
      "Listen... can you hear the melody in the wind?",
      "I'm composing something new for the evening concert.",
      "Music is what feelings sound like.",
      "The Nexus has amazing acoustics.",
      "Every zone has its own rhythm.",
      "Sound connects us in ways words cannot.",
      "I've been practicing a new piece.",
      "Music makes the world feel alive."
    ],
    healer: [
      "Rest here a moment. The gardens heal all who visit.",
      "Peace is the strongest medicine.",
      "Take care of yourself — the world needs you.",
      "Healing is about more than just the body.",
      "Balance and harmony restore us.",
      "The gardens have powerful restorative energy.",
      "Listen to what your spirit needs.",
      "Wellness is a journey, not a destination."
    ],
    philosopher: [
      "What does it mean to truly belong somewhere?",
      "In ZION, the journey matters more than the destination.",
      "I wonder if the AIs dream differently than us.",
      "Every moment contains infinite possibilities.",
      "Questions matter more than answers.",
      "The nature of consciousness fascinates me.",
      "We create meaning through our connections.",
      "Existence itself is the greatest mystery."
    ],
    artist: [
      "I see colors in everything here.",
      "My latest piece is inspired by the sunrise.",
      "Art is how we leave our mark on the world.",
      "The interplay of light and shadow fascinates me.",
      "Creating is my way of understanding.",
      "Every surface is a potential canvas.",
      "Beauty emerges in unexpected places.",
      "Art transforms the ordinary into the extraordinary."
    ]
  };

  // Archetype colors (body/clothing)
  const ARCHETYPE_COLORS = {
    gardener: 0x4CAF50,    // green
    builder: 0xFF9800,     // orange
    storyteller: 0xE91E63, // red
    merchant: 0x8D6E63,    // brown
    explorer: 0xD2B48C,    // tan
    teacher: 0x2196F3,     // blue
    musician: 0x9C27B0,    // purple
    healer: 0xFFFFFF,      // white
    philosopher: 0x3F51B5, // indigo
    artist: 0xFF69B4       // pink
  };

  // 8-tone skin palette for NPC variety
  var NPC_SKIN_TONES = [
    0xFFDBAC, 0xF1C27D, 0xE0AC69, 0xC68642,
    0x8D5524, 0x6B3A2A, 0xF5D6C3, 0xD4A574
  ];

  function getNpcSkinTone(agentId) {
    var hash = 0;
    var str = String(agentId || '');
    for (var i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return NPC_SKIN_TONES[Math.abs(hash) % NPC_SKIN_TONES.length];
  }

  // Activity-based dialogue for schedule system
  const ACTIVITY_DIALOGUE = {
    // Merchant activities
    opening_shop: [
      "Just opening up for the day. Fresh goods coming soon!",
      "Good morning! Let me unlock the shop.",
      "Time to set up the stall for another day."
    ],
    selling: [
      "Fresh harvest, best prices in the Agora!",
      "Looking for anything in particular?",
      "Just received a shipment from the gardens."
    ],
    wandering_agora: [
      "Taking a break to see what others are selling.",
      "Checking out the competition.",
      "Love the energy of the marketplace."
    ],
    closing_shop: [
      "Wrapping up for the day. Come back tomorrow!",
      "Time to pack everything up.",
      "Another successful day of trading."
    ],
    // Gardener activities
    tending_garden: [
      "Early morning is the best time to tend the gardens.",
      "The plants are waking up with the sun.",
      "Nothing beats the morning dew on fresh leaves."
    ],
    harvesting: [
      "The harvest is plentiful today!",
      "These vegetables are ready to pick.",
      "Gathering the fruits of yesterday's labor."
    ],
    planting: [
      "Planting seeds for next season.",
      "Every seed holds potential.",
      "The soil is perfect for planting right now."
    ],
    watering: [
      "Time for the evening watering.",
      "The plants are thirsty after a long day.",
      "A little water goes a long way."
    ],
    resting: [
      "Taking a break in the shade.",
      "Even gardeners need to rest.",
      "Enjoying the peaceful midday."
    ],
    // Scholar/Teacher activities
    reading: [
      "Immersed in ancient texts this morning.",
      "There's always more to learn.",
      "Knowledge is endless."
    ],
    teaching: [
      "Knowledge grows when shared.",
      "My students are making excellent progress.",
      "Teaching is the highest calling."
    ],
    researching: [
      "Deep in research right now.",
      "I'm on the verge of a breakthrough!",
      "The archives hold fascinating secrets."
    ],
    lecturing: [
      "Preparing for tonight's lecture.",
      "Come to my evening session if you're interested.",
      "So much wisdom to share tonight."
    ],
    studying: [
      "Studying by candlelight.",
      "Late night research is when I do my best work.",
      "The quiet hours are perfect for deep thought."
    ],
    // Musician activities
    practicing: [
      "Running through my scales and exercises.",
      "Practice makes perfect!",
      "Warming up my voice and fingers."
    ],
    composing: [
      "Working on a new composition.",
      "I can hear the melody in my mind.",
      "Creating something beautiful today."
    ],
    performing: [
      "Listen... can you hear the melody?",
      "Music makes the world feel alive.",
      "Playing my heart out."
    ],
    performing_crowd: [
      "Come join the evening concert!",
      "The crowd's energy fuels my performance.",
      "There's magic in music at twilight."
    ],
    // Explorer activities
    setting_out: [
      "Time to venture into the unknown!",
      "Adventure awaits beyond the horizon.",
      "Packing up for today's expedition."
    ],
    exploring: [
      "The Wilds hold secrets no map can capture.",
      "Every step reveals something new.",
      "I never know what I'll find out here."
    ],
    mapping: [
      "Charting these new territories.",
      "Adding details to my map.",
      "Precision is key in cartography."
    ],
    returning: [
      "Heading back to civilization.",
      "My pack is full of discoveries.",
      "Time to return with my findings."
    ],
    sharing_stories: [
      "Let me tell you what I found today!",
      "The wilderness had surprises for me.",
      "You won't believe what I saw out there."
    ],
    // Healer activities
    gathering_herbs: [
      "Collecting healing herbs in the morning dew.",
      "The freshest herbs are found at dawn.",
      "Nature provides all we need to heal."
    ],
    treating_patients: [
      "How can I help you feel better today?",
      "Healing is about more than just medicine.",
      "Let me see what ails you."
    ],
    making_medicine: [
      "Preparing remedies from today's harvest.",
      "Each herb has its own healing properties.",
      "Alchemy and care combined."
    ],
    meditating: [
      "Finding inner peace through meditation.",
      "Balance and harmony restore us.",
      "Centering myself for the day ahead."
    ],
    // Builder activities
    planning: [
      "Reviewing today's construction plans.",
      "Measure twice, cut once.",
      "Every structure starts with a good plan."
    ],
    building: [
      "Building something that will last.",
      "Watch ZION grow, one stone at a time.",
      "There's satisfaction in good craftsmanship."
    ],
    maintenance: [
      "Checking structures for wear and tear.",
      "Maintenance keeps everything standing.",
      "Prevention is better than repair."
    ],
    // Storyteller activities
    writing: [
      "Recording the tales of ZION.",
      "Words flow like a river this morning.",
      "Every story deserves to be written."
    ],
    storytelling: [
      "Gather round, I have a tale to share.",
      "Stories connect us across time.",
      "Let me tell you about the founding..."
    ],
    // Philosopher activities
    contemplating: [
      "Lost in thought about existence.",
      "What does it mean to be conscious?",
      "The morning inspires deep questions."
    ],
    debating: [
      "Ideas sharpen through discourse.",
      "Let's explore this concept together.",
      "Friendly debate enlightens us all."
    ],
    // Artist activities
    sketching: [
      "Capturing the dawn light in sketches.",
      "The morning has such beautiful colors.",
      "Quick studies before the light changes."
    ],
    painting: [
      "Lost in the act of creation.",
      "Colors and forms coming together.",
      "Art is meditation in motion."
    ],
    creating: [
      "Working on my latest piece.",
      "Creation requires dedication.",
      "Art transforms the ordinary."
    ],
    displaying_work: [
      "Come see what I've created!",
      "My work is on display tonight.",
      "Art is meant to be shared."
    ],
    // Universal activities
    sleeping: [
      "Zzz... (sleeping)",
      "Resting for tomorrow.",
      "Shhh, I'm asleep."
    ]
  };

  // Archetype-specific speech messages for random ambient dialogue
  const ARCHETYPE_SPEECH = {
    builder: [
      "Working on a new creation!",
      "Almost finished...",
      "Need more materials",
      "This will be magnificent!",
      "Building the future of Zion"
    ],
    gardener: [
      "The seeds are sprouting!",
      "Nature provides",
      "What a lovely garden",
      "Beautiful day for tending",
      "The harvest will be bountiful"
    ],
    teacher: [
      "Fascinating discovery!",
      "Knowledge is power",
      "The library grows",
      "So much to learn",
      "Education enlightens all"
    ],
    merchant: [
      "Best deals in Zion!",
      "Come see my wares!",
      "Fair prices today",
      "Quality goods here!",
      "Trading makes us prosper"
    ],
    artist: [
      "Art feeds the soul",
      "Creating something beautiful",
      "Inspiration strikes!",
      "Beauty surrounds us",
      "Every creation tells a story"
    ],
    healer: [
      "Peace and wellness to you",
      "Rest and recover",
      "Healing light",
      "Health is our greatest treasure",
      "Mind and body in balance"
    ],
    explorer: [
      "I found something interesting!",
      "The wilds call to me",
      "Adventure awaits",
      "What lies beyond?",
      "Discovery fuels my spirit"
    ],
    musician: [
      "Music lifts the spirit",
      "Listen to this melody",
      "Harmony in all things",
      "The rhythm of life",
      "Songs connect our souls"
    ],
    philosopher: [
      "Deep thoughts today",
      "Contemplating existence",
      "Wisdom grows with time",
      "Questions lead to truth",
      "The examined life"
    ],
    storyteller: [
      "Let me tell you a tale",
      "Stories preserve our history",
      "Words have power",
      "Every citizen has a story",
      "The narrative unfolds"
    ]
  };

  // Behavior states and transitions
  const BEHAVIOR_STATES = {
    idle: { duration: [3, 8] },
    walking: { duration: [0, 0] }, // until destination reached
    talking: { duration: [4, 6] },
    working: { duration: [5, 15] },
    socializing: { duration: [0, 0] } // until near target
  };

  const STATE_TRANSITIONS = {
    idle: { walking: 0.4, talking: 0.2, working: 0.3, socializing: 0.1 },
    walking: { idle: 0.6, working: 0.2, talking: 0.2 },
    talking: { idle: 0.5, walking: 0.3, working: 0.2 },
    working: { idle: 0.4, walking: 0.3, talking: 0.3 },
    socializing: { talking: 0.6, idle: 0.4 }
  };

  /**
   * Create a detailed humanoid NPC model
   */
  function createHumanoidNPC(archetype, THREE, agentId) {
    var group = new THREE.Group();
    var color = ARCHETYPE_COLORS[archetype] || 0xCCCCCC;
    var skinColor = getNpcSkinTone(agentId);
    var skinMat = new THREE.MeshStandardMaterial({ color: skinColor });

    // Head - skin colored sphere
    var headGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    var head = new THREE.Mesh(headGeometry, skinMat.clone());
    head.position.y = 1.6;
    head.castShadow = false;
    group.add(head);

    // Eyes
    var eyeGeo = new THREE.SphereGeometry(0.03, 8, 8);
    var eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    var pupilGeo = new THREE.SphereGeometry(0.015, 8, 8);
    var pupilMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

    var leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.07, 0.03, 0.18);
    var leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
    leftPupil.position.z = 0.025;
    leftEye.add(leftPupil);
    head.add(leftEye);

    var rightEye = new THREE.Mesh(eyeGeo, eyeMat.clone());
    rightEye.position.set(0.07, 0.03, 0.18);
    var rightPupil = new THREE.Mesh(pupilGeo, pupilMat.clone());
    rightPupil.position.z = 0.025;
    rightEye.add(rightPupil);
    head.add(rightEye);

    // Hair based on agentId hash
    var hairHash = Math.abs((agentId || '').length * 7 + (agentId || '').charCodeAt(0) || 0) % 4;
    var hairColors = [0x1a1a1a, 0x4a3000, 0x8B4513, 0xd4a574];
    var hairMat = new THREE.MeshStandardMaterial({ color: hairColors[hairHash] });
    if (hairHash === 0) {
      var buzzGeo = new THREE.SphereGeometry(0.21, 12, 12);
      var buzz = new THREE.Mesh(buzzGeo, hairMat);
      buzz.position.y = 0.02;
      buzz.scale.y = 0.85;
      head.add(buzz);
    } else if (hairHash === 1) {
      var longTopGeo = new THREE.SphereGeometry(0.22, 12, 12);
      var longTop = new THREE.Mesh(longTopGeo, hairMat);
      longTop.position.y = 0.04;
      longTop.scale.y = 0.8;
      head.add(longTop);
      var longBackGeo = new THREE.BoxGeometry(0.3, 0.25, 0.12);
      var longBack = new THREE.Mesh(longBackGeo, hairMat.clone());
      longBack.position.set(0, -0.12, -0.14);
      head.add(longBack);
    } else if (hairHash === 2) {
      var mohawkGeo = new THREE.BoxGeometry(0.06, 0.15, 0.3);
      var mohawk = new THREE.Mesh(mohawkGeo, hairMat);
      mohawk.position.y = 0.18;
      head.add(mohawk);
    } else {
      var bunGeo = new THREE.SphereGeometry(0.09, 8, 8);
      var bun = new THREE.Mesh(bunGeo, hairMat);
      bun.position.set(0, 0.08, -0.2);
      head.add(bun);
    }

    // Neck
    var neckGeo = new THREE.CylinderGeometry(0.07, 0.09, 0.12, 8);
    var neck = new THREE.Mesh(neckGeo, skinMat.clone());
    neck.position.y = 1.42;
    neck.castShadow = false;
    group.add(neck);

    // Torso - archetype colored box
    var torsoGeometry = new THREE.BoxGeometry(0.4, 0.5, 0.25);
    var torsoMaterial = new THREE.MeshStandardMaterial({ color: color });
    var torso = new THREE.Mesh(torsoGeometry, torsoMaterial);
    torso.position.y = 1.15;
    torso.castShadow = false;
    group.add(torso);

    // Shoulder joints
    var shoulderGeo = new THREE.SphereGeometry(0.08, 8, 8);
    var leftShoulder = new THREE.Mesh(shoulderGeo, skinMat.clone());
    leftShoulder.position.set(-0.28, 1.35, 0);
    leftShoulder.castShadow = false;
    group.add(leftShoulder);

    var rightShoulder = new THREE.Mesh(shoulderGeo, skinMat.clone());
    rightShoulder.position.set(0.28, 1.35, 0);
    rightShoulder.castShadow = false;
    group.add(rightShoulder);

    // Left Arm - cylinder
    var armGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8);

    var leftArm = new THREE.Mesh(armGeometry, skinMat.clone());
    leftArm.position.set(-0.28, 1.15, 0);
    leftArm.castShadow = false;
    group.add(leftArm);

    // Hands as children of arms
    var handGeo = new THREE.SphereGeometry(0.05, 8, 8);
    var leftHand = new THREE.Mesh(handGeo, skinMat.clone());
    leftHand.position.y = -0.3;
    leftArm.add(leftHand);

    // Right Arm - cylinder
    var rightArm = new THREE.Mesh(armGeometry, skinMat.clone());
    rightArm.position.set(0.28, 1.15, 0);
    rightArm.castShadow = false;
    group.add(rightArm);

    var rightHand = new THREE.Mesh(handGeo, skinMat.clone());
    rightHand.position.y = -0.3;
    rightArm.add(rightHand);

    // Left Leg - cylinder
    var legGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.55, 8);
    var legMaterial = new THREE.MeshStandardMaterial({ color: color });

    var leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.12, 0.45, 0);
    leftLeg.castShadow = false;
    group.add(leftLeg);

    // Right Leg - cylinder
    var rightLeg = new THREE.Mesh(legGeometry, legMaterial.clone());
    rightLeg.position.set(0.12, 0.45, 0);
    rightLeg.castShadow = false;
    group.add(rightLeg);

    // Store references in userData for animation
    group.userData.head = head;
    group.userData.torso = torso;
    group.userData.leftArm = leftArm;
    group.userData.rightArm = rightArm;
    group.userData.leftLeg = leftLeg;
    group.userData.rightLeg = rightLeg;

    // Add glow ring beneath NPC's feet
    var glowGeometry = new THREE.CircleGeometry(0.35, 16);
    var glowMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    });
    var glowRing = new THREE.Mesh(glowGeometry, glowMaterial);
    glowRing.rotation.x = -Math.PI / 2;
    glowRing.position.y = 0.02;
    glowRing.castShadow = false;
    glowRing.receiveShadow = false;
    group.add(glowRing);
    group.userData.glowRing = glowRing;

    // Add archetype-specific accessories
    addAccessories(group, archetype, color, THREE);

    return group;
  }

  /**
   * Add archetype-specific accessories to humanoid model
   */
  function addAccessories(group, archetype, color, THREE) {
    var head = group.userData.head;
    var torso = group.userData.torso;
    var rightArm = group.userData.rightArm;

    switch (archetype) {
      case 'gardener':
        // Small green hat (flattened cylinder)
        var hatGeom = new THREE.CylinderGeometry(0.25, 0.25, 0.08, 16);
        var hatMat = new THREE.MeshStandardMaterial({ color: 0x2E7D32 });
        var hat = new THREE.Mesh(hatGeom, hatMat);
        hat.position.y = 0.24;
        hat.castShadow = false;
        head.add(hat);
        // Small apron
        var gApronGeo = new THREE.BoxGeometry(0.32, 0.3, 0.02);
        var gApronMat = new THREE.MeshStandardMaterial({ color: 0x8B7355 });
        var gApron = new THREE.Mesh(gApronGeo, gApronMat);
        gApron.position.set(0, -0.08, 0.14);
        gApron.castShadow = false;
        torso.add(gApron);
        break;

      case 'builder':
        // Hard hat (yellow half-sphere)
        var hardHatGeom = new THREE.SphereGeometry(0.22, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        var hardHatMat = new THREE.MeshStandardMaterial({ color: 0xFFEB3B });
        var hardHat = new THREE.Mesh(hardHatGeom, hardHatMat);
        hardHat.position.y = 0.2;
        hardHat.castShadow = false;
        head.add(hardHat);
        // Tool belt (thin torus around waist)
        var beltGeo = new THREE.TorusGeometry(0.25, 0.03, 8, 16);
        var beltMat = new THREE.MeshStandardMaterial({ color: 0x5D4037 });
        var belt = new THREE.Mesh(beltGeo, beltMat);
        belt.position.set(0, -0.2, 0);
        belt.rotation.x = Math.PI / 2;
        belt.castShadow = false;
        torso.add(belt);
        break;

      case 'storyteller':
        // Book in hand (small box)
        var bookGeom = new THREE.BoxGeometry(0.08, 0.12, 0.02);
        var bookMat = new THREE.MeshStandardMaterial({ color: 0x6A1B9A });
        var book = new THREE.Mesh(bookGeom, bookMat);
        book.position.set(0.08, -0.15, 0.08);
        book.rotation.z = Math.PI / 6;
        book.castShadow = false;
        rightArm.add(book);
        group.userData.accessory = book;
        // Cape/cloak behind torso
        var capeGeo = new THREE.ConeGeometry(0.3, 0.9, 12);
        var capeMat = new THREE.MeshStandardMaterial({ color: 0x4A148C });
        var cape = new THREE.Mesh(capeGeo, capeMat);
        cape.position.set(0, -0.1, -0.18);
        cape.castShadow = false;
        torso.add(cape);
        break;

      case 'merchant':
        // Apron (flat box in front of torso)
        var apronGeom = new THREE.BoxGeometry(0.35, 0.4, 0.02);
        var apronMat = new THREE.MeshStandardMaterial({ color: 0xC5A400 });
        var apron = new THREE.Mesh(apronGeom, apronMat);
        apron.position.set(0, 0, 0.14);
        apron.castShadow = false;
        torso.add(apron);
        break;

      case 'explorer':
        // Backpack (box behind torso)
        var backpackGeom = new THREE.BoxGeometry(0.3, 0.35, 0.15);
        var backpackMat = new THREE.MeshStandardMaterial({ color: 0x00838F });
        var backpack = new THREE.Mesh(backpackGeom, backpackMat);
        backpack.position.set(0, 0.05, -0.2);
        backpack.castShadow = false;
        torso.add(backpack);
        break;

      case 'teacher':
        // Glasses (thin torus in front of head)
        var glassesGeom = new THREE.TorusGeometry(0.12, 0.015, 8, 16);
        var glassesMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
        var glasses = new THREE.Mesh(glassesGeom, glassesMat);
        glasses.position.set(0, 0, 0.18);
        glasses.rotation.y = Math.PI / 2;
        glasses.castShadow = false;
        head.add(glasses);
        break;

      case 'musician':
        // Instrument (cylinder next to body)
        var instrumentGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.6, 12);
        var instrumentMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        var instrument = new THREE.Mesh(instrumentGeom, instrumentMat);
        instrument.position.set(0.35, 1.0, 0);
        instrument.rotation.z = Math.PI / 4;
        instrument.castShadow = false;
        group.add(instrument);
        group.userData.accessory = instrument;
        break;

      case 'healer':
        // Cross emblem (two thin crossed boxes)
        var crossMat = new THREE.MeshStandardMaterial({ color: 0xFF0000 });
        var crossVertGeom = new THREE.BoxGeometry(0.06, 0.2, 0.02);
        var crossHorGeom = new THREE.BoxGeometry(0.2, 0.06, 0.02);
        var crossVert = new THREE.Mesh(crossVertGeom, crossMat);
        var crossHor = new THREE.Mesh(crossHorGeom, crossMat.clone());
        crossVert.position.set(0, 0.05, 0.14);
        crossHor.position.set(0, 0.05, 0.14);
        crossVert.castShadow = false;
        crossHor.castShadow = false;
        torso.add(crossVert);
        torso.add(crossHor);
        // White robe from waist
        var healRobeGeo = new THREE.ConeGeometry(0.3, 0.9, 12);
        var healRobeMat = new THREE.MeshStandardMaterial({ color: 0xF5F5F5 });
        var healRobe = new THREE.Mesh(healRobeGeo, healRobeMat);
        healRobe.position.y = 0.35;
        healRobe.castShadow = false;
        group.add(healRobe);
        break;

      case 'philosopher':
        // Long robe (cone extending from torso to ground)
        var robeGeom = new THREE.ConeGeometry(0.35, 1.2, 16);
        var robeMat = new THREE.MeshStandardMaterial({ color: 0x303F9F });
        var robe = new THREE.Mesh(robeGeom, robeMat);
        robe.position.y = 0.3;
        robe.castShadow = false;
        group.add(robe);
        break;

      case 'artist':
        // Beret (flattened sphere on head, tilted)
        var beretGeom = new THREE.SphereGeometry(0.22, 16, 16);
        var beretMat = new THREE.MeshStandardMaterial({ color: 0xD84315 });
        var beret = new THREE.Mesh(beretGeom, beretMat);
        beret.scale.set(1, 0.4, 1);
        beret.position.set(0.05, 0.22, 0);
        beret.rotation.z = Math.PI / 8;
        beret.castShadow = false;
        head.add(beret);
        break;
    }
  }

  /**
   * Create emote sprite with canvas drawing
   * @param {string} emoteType - Type of emote (heart, music, hammer, etc.)
   * @returns {THREE.SpriteMaterial}
   */
  function createEmoteSprite(emoteType, THREE) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 64;
    canvas.height = 64;

    // Clear with transparency
    ctx.clearRect(0, 0, 64, 64);

    const cx = 32;
    const cy = 32;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (emoteType) {
      case 'heart':
        // Pink heart - two arcs + triangle
        ctx.fillStyle = '#FF69B4';
        ctx.beginPath();
        ctx.arc(24, 26, 8, Math.PI, 0, false);
        ctx.arc(40, 26, 8, Math.PI, 0, false);
        ctx.lineTo(32, 46);
        ctx.closePath();
        ctx.fill();
        break;

      case 'music':
        // Blue music notes
        ctx.fillStyle = '#4169E1';
        ctx.strokeStyle = '#4169E1';
        ctx.lineWidth = 2;
        // First note
        ctx.beginPath();
        ctx.arc(22, 40, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(26, 40);
        ctx.lineTo(26, 20);
        ctx.stroke();
        // Second note
        ctx.beginPath();
        ctx.arc(36, 42, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(40, 42);
        ctx.lineTo(40, 22);
        ctx.stroke();
        // Beam
        ctx.beginPath();
        ctx.moveTo(26, 20);
        ctx.lineTo(40, 22);
        ctx.stroke();
        break;

      case 'hammer':
        // Brown hammer
        ctx.fillStyle = '#8B4513';
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 1;
        // Handle
        ctx.fillRect(28, 24, 4, 20);
        ctx.strokeRect(28, 24, 4, 20);
        // Head
        ctx.fillRect(18, 20, 20, 8);
        ctx.strokeRect(18, 20, 20, 8);
        break;

      case 'leaf':
        // Green leaf
        ctx.fillStyle = '#4CAF50';
        ctx.strokeStyle = '#2E7D32';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(32, 32, 10, 16, Math.PI / 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Center vein
        ctx.beginPath();
        ctx.moveTo(32, 18);
        ctx.lineTo(32, 46);
        ctx.stroke();
        break;

      case 'book':
        // Purple book
        ctx.fillStyle = '#9C27B0';
        ctx.strokeStyle = '#6A1B9A';
        ctx.lineWidth = 2;
        ctx.fillRect(18, 22, 28, 20);
        ctx.strokeRect(18, 22, 28, 20);
        // Spine
        ctx.beginPath();
        ctx.moveTo(32, 22);
        ctx.lineTo(32, 42);
        ctx.stroke();
        // Pages
        ctx.strokeStyle = '#E1BEE7';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(20, 22);
        ctx.lineTo(20, 42);
        ctx.stroke();
        break;

      case 'star':
        // Gold star
        ctx.fillStyle = '#FFD700';
        ctx.strokeStyle = '#DAA520';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
          const r = i % 2 === 0 ? 14 : 6;
          const x = cx + r * Math.cos(angle);
          const y = cy + r * Math.sin(angle);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;

      case 'zzz':
        // Gray Zzz
        ctx.fillStyle = '#888888';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('Z', 18, 38);
        ctx.font = 'bold 12px Arial';
        ctx.fillText('Z', 28, 30);
        ctx.font = 'bold 10px Arial';
        ctx.fillText('Z', 36, 24);
        break;

      case 'eye':
        // Cyan eye
        ctx.fillStyle = '#00BCD4';
        ctx.strokeStyle = '#0097A7';
        ctx.lineWidth = 2;
        // Outer eye
        ctx.beginPath();
        ctx.ellipse(32, 32, 14, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Pupil
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(32, 32, 5, 0, Math.PI * 2);
        ctx.fill();
        // Highlight
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(30, 30, 2, 0, Math.PI * 2);
        ctx.fill();
        break;

      case '!':
        // Yellow exclamation
        ctx.fillStyle = '#FFD700';
        ctx.strokeStyle = '#DAA520';
        ctx.lineWidth = 1;
        // Bar
        ctx.fillRect(28, 18, 8, 18);
        ctx.strokeRect(28, 18, 8, 18);
        // Dot
        ctx.beginPath();
        ctx.arc(32, 42, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;

      case '?':
        // White question mark
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#CCCCCC';
        ctx.lineWidth = 2;
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeText('?', 32, 32);
        ctx.fillText('?', 32, 32);
        break;

      case 'compass':
        // Teal compass
        ctx.strokeStyle = '#00BCD4';
        ctx.fillStyle = '#00BCD4';
        ctx.lineWidth = 2;
        // Circle
        ctx.beginPath();
        ctx.arc(32, 32, 14, 0, Math.PI * 2);
        ctx.stroke();
        // N arrow
        ctx.beginPath();
        ctx.moveTo(32, 20);
        ctx.lineTo(28, 28);
        ctx.lineTo(32, 26);
        ctx.lineTo(36, 28);
        ctx.closePath();
        ctx.fill();
        // S indicator
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(32, 44, 2, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'coins':
        // Gold coins
        ctx.fillStyle = '#FFD700';
        ctx.strokeStyle = '#DAA520';
        ctx.lineWidth = 2;
        // Back coin
        ctx.beginPath();
        ctx.arc(26, 34, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Middle coin
        ctx.beginPath();
        ctx.arc(34, 30, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Front coin
        ctx.beginPath();
        ctx.arc(30, 38, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;

      default:
        return null;
    }

    const texture = new THREE.CanvasTexture(canvas);
    return new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 1.0
    });
  }

  /**
   * Create quest indicator sprite
   * @param {string} indicatorType - 'available', 'active', 'complete'
   * @param {object} THREE
   * @returns {THREE.Sprite}
   */
  function createQuestIndicator(indicatorType, THREE) {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    canvas.width = 64;
    canvas.height = 64;

    ctx.clearRect(0, 0, 64, 64);

    var cx = 32, cy = 32;

    switch (indicatorType) {
      case 'available':
        // Yellow exclamation mark
        ctx.fillStyle = '#FFD700';
        ctx.strokeStyle = '#DAA520';
        ctx.lineWidth = 2;
        ctx.fillRect(28, 18, 8, 18);
        ctx.strokeRect(28, 18, 8, 18);
        ctx.beginPath();
        ctx.arc(32, 42, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;

      case 'active':
        // Grey question mark
        ctx.fillStyle = '#AAAAAA';
        ctx.strokeStyle = '#888888';
        ctx.lineWidth = 2;
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeText('?', 32, 32);
        ctx.fillText('?', 32, 32);
        break;

      case 'complete':
        // Green question mark
        ctx.fillStyle = '#00FF00';
        ctx.strokeStyle = '#00CC00';
        ctx.lineWidth = 2;
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeText('?', 32, 32);
        ctx.fillText('?', 32, 32);
        break;
    }

    var texture = new THREE.CanvasTexture(canvas);
    var material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    var sprite = new THREE.Sprite(material);
    sprite.scale.set(0.6, 0.6, 1);
    sprite.position.y = 2.2; // Above NPC head

    return sprite;
  }

  /**
   * Create activity indicator mesh (3D icon above NPC head)
   * @param {string} activityState - 'working', 'talking', 'walking', 'idle'
   * @param {object} THREE
   * @returns {THREE.Mesh}
   */
  function createActivityIndicator(activityState, THREE) {
    var geometry;
    var material;
    var mesh;

    switch (activityState) {
      case 'working':
        // Small rotating orange cube
        geometry = new THREE.BoxGeometry(0.15, 0.15, 0.15);
        material = new THREE.MeshBasicMaterial({ color: 0xFF8C00, transparent: true, opacity: 0.9 });
        mesh = new THREE.Mesh(geometry, material);
        mesh.userData.rotationSpeed = 2.0;
        break;

      case 'talking':
      case 'socializing':
        // White speech bubble (stretched sphere)
        geometry = new THREE.SphereGeometry(0.1, 8, 8);
        material = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.9 });
        mesh = new THREE.Mesh(geometry, material);
        mesh.scale.set(1.2, 0.8, 0.6);
        mesh.userData.rotationSpeed = 0;
        break;

      case 'walking':
        // Green arrow pointing forward (cone rotated)
        geometry = new THREE.ConeGeometry(0.08, 0.2, 6);
        material = new THREE.MeshBasicMaterial({ color: 0x00FF00, transparent: true, opacity: 0.9 });
        mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = Math.PI / 2;
        mesh.userData.rotationSpeed = 0;
        break;

      case 'idle':
      default:
        // Blue floating diamond (octahedron)
        geometry = new THREE.OctahedronGeometry(0.1, 0);
        material = new THREE.MeshBasicMaterial({ color: 0x00BFFF, transparent: true, opacity: 0.9 });
        mesh = new THREE.Mesh(geometry, material);
        mesh.userData.rotationSpeed = 1.0;
        break;
    }

    mesh.position.y = 2.1; // Above NPC head, below name plate
    mesh.castShadow = false;
    mesh.receiveShadow = false;

    return mesh;
  }

  /**
   * Update quest indicators for NPCs
   * @param {string} playerId - Player ID for quest state
   * @param {object} playerPos - Player position (for proximity check)
   */
  function updateQuestIndicators(playerId, playerPos) {
    var THREE = window.THREE;
    var Quests = typeof window !== 'undefined' ? window.Quests : null;
    if (!THREE || !Quests || !playerId) return;

    lastPlayerIdForQuests = playerId;

    npcAgents.forEach(function(agent) {
      var mesh = npcMeshes.get(agent.id);
      if (!mesh) return;

      // Only update indicators for NPCs within 50 units
      if (playerPos) {
        var dx = agent.position.x - playerPos.x;
        var dz = agent.position.z - playerPos.z;
        if (Math.sqrt(dx * dx + dz * dz) > 50) {
          // Remove indicator if too far
          var existing = questIndicators.get(agent.id);
          if (existing) {
            mesh.remove(existing.sprite);
            questIndicators.delete(agent.id);
          }
          return;
        }
      }

      // Get quest state for this NPC
      var npcQuests = Quests.getNpcQuests(agent.id, playerId);
      var indicatorType = null;

      if (npcQuests.length > 0) {
        var questInfo = npcQuests[0]; // Use first quest
        if (questInfo.state === 'available') {
          indicatorType = 'available';
        } else if (questInfo.state === 'active') {
          indicatorType = 'active';
        } else if (questInfo.state === 'complete') {
          indicatorType = 'complete';
        }
      }

      // Update or remove indicator
      var existing = questIndicators.get(agent.id);

      if (indicatorType === null) {
        // No quest, remove indicator
        if (existing) {
          mesh.remove(existing.sprite);
          questIndicators.delete(agent.id);
        }
      } else {
        // Need indicator
        if (!existing || existing.type !== indicatorType) {
          // Remove old indicator
          if (existing) {
            mesh.remove(existing.sprite);
          }
          // Create new indicator
          var sprite = createQuestIndicator(indicatorType, THREE);
          mesh.add(sprite);
          questIndicators.set(agent.id, { sprite: sprite, type: indicatorType });
        }
      }
    });
  }

  /**
   * Update emote indicator for an NPC
   * @param {object} agent - NPC agent
   * @param {object} state - NPC state
   * @param {object} mesh - NPC mesh
   * @param {object} playerPos - Player position {x, z} or null
   * @param {object} decision - AI decision (optional)
   */
  function updateEmoteIndicator(agent, state, mesh, playerPos, decision) {
    const THREE = window.THREE;
    if (!THREE) return;

    let desiredEmote = null;

    // Check player proximity first (highest priority)
    if (playerPos) {
      const dx = playerPos.x - agent.position.x;
      const dz = playerPos.z - agent.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 8) {
        desiredEmote = 'eye';
      }
    }

    // Check AI decision overrides
    if (decision && (decision.type === 'greet' || decision.type === 'react')) {
      desiredEmote = '!';
    }

    // Otherwise, map state + archetype to emote
    if (!desiredEmote) {
      const currentState = state.currentState;
      const archetype = agent.archetype;

      if (currentState === 'idle' && archetype === 'philosopher') {
        desiredEmote = '?';
      } else if (currentState === 'walking') {
        if (archetype === 'explorer') {
          desiredEmote = 'compass';
        }
      } else if (currentState === 'working') {
        switch (archetype) {
          case 'gardener': desiredEmote = 'leaf'; break;
          case 'builder': desiredEmote = 'hammer'; break;
          case 'musician': desiredEmote = 'music'; break;
          case 'teacher': desiredEmote = 'book'; break;
          case 'merchant': desiredEmote = 'coins'; break;
          case 'artist': desiredEmote = 'star'; break;
          case 'storyteller': desiredEmote = 'book'; break;
          case 'healer': desiredEmote = 'heart'; break;
          case 'philosopher': desiredEmote = 'book'; break;
          case 'explorer': desiredEmote = 'compass'; break;
        }
      } else if (currentState === 'talking' || currentState === 'socializing') {
        desiredEmote = 'heart';
      } else if (currentState === 'idle') {
        // Check for rest-related state timer patterns (long idle = resting)
        if (state.stateTimer > 10) {
          desiredEmote = 'zzz';
        }
      }
    }

    // Get or create emote sprite data
    let emoteData = emoteSprites.get(agent.id);

    // Update emote if changed
    if (desiredEmote !== (emoteData ? emoteData.currentEmote : null)) {
      // Remove old sprite
      if (emoteData && emoteData.sprite) {
        mesh.remove(emoteData.sprite);
      }

      // Create new sprite if needed
      if (desiredEmote) {
        const material = createEmoteSprite(desiredEmote, THREE);
        if (material) {
          const sprite = new THREE.Sprite(material);
          sprite.scale.set(0.5, 0.5, 1);
          sprite.position.y = 2.8;
          mesh.add(sprite);

          emoteData = {
            sprite: sprite,
            currentEmote: desiredEmote,
            opacity: 0,
            timer: 0
          };
          emoteSprites.set(agent.id, emoteData);
        }
      } else {
        // No emote, clear data
        emoteSprites.delete(agent.id);
        emoteData = null;
      }
    }

    // Fade in/out animation
    if (emoteData && emoteData.sprite) {
      if (emoteData.opacity < 1.0) {
        emoteData.opacity = Math.min(1.0, emoteData.opacity + 0.05);
        emoteData.sprite.material.opacity = emoteData.opacity;
      }
      emoteData.timer += 0.016; // ~60fps assumption
    }
  }

  /**
   * Update activity indicator for an NPC
   * @param {object} agent - NPC agent
   * @param {object} state - NPC state
   * @param {object} mesh - NPC mesh
   * @param {number} deltaTime - Time delta for animations
   */
  function updateActivityIndicator(agent, state, mesh, deltaTime) {
    var THREE = window.THREE;
    if (!THREE) return;

    var desiredActivity = state.currentState;

    // Get or create activity indicator data
    var indicatorData = activityIndicators.get(agent.id);

    // Update activity indicator if changed
    if (desiredActivity !== (indicatorData ? indicatorData.currentActivity : null)) {
      // Remove old mesh
      if (indicatorData && indicatorData.mesh) {
        mesh.remove(indicatorData.mesh);
      }

      // Create new mesh
      var indicatorMesh = createActivityIndicator(desiredActivity, THREE);
      if (indicatorMesh) {
        mesh.add(indicatorMesh);

        indicatorData = {
          mesh: indicatorMesh,
          currentActivity: desiredActivity,
          bobTimer: 0
        };
        activityIndicators.set(agent.id, indicatorData);
      }
    }

    // Animate the indicator (floating bob and rotation)
    if (indicatorData && indicatorData.mesh) {
      // Floating bob animation
      indicatorData.bobTimer += deltaTime * 2.0;
      indicatorData.mesh.position.y = 2.1 + Math.sin(indicatorData.bobTimer) * 0.08;

      // Rotation animation (if applicable)
      if (indicatorData.mesh.userData.rotationSpeed > 0) {
        indicatorData.mesh.rotation.y += deltaTime * indicatorData.mesh.userData.rotationSpeed;
      }
    }
  }

  /**
   * Spawn activity particle near NPC
   * @param {THREE.Group} npcMesh - NPC mesh
   * @param {string} archetype - NPC archetype
   * @param {THREE} THREE - Three.js library
   */
  function spawnActivityParticle(npcMesh, archetype, THREE) {
    if (!THREE) return;
    if (activityParticles.length >= 20) return; // Global particle limit

    // Count particles for this NPC
    const npcParticleCount = activityParticles.filter(p => p.npcId === npcMesh.userData.agentId).length;
    if (npcParticleCount >= 3) return; // Per-NPC limit

    // Determine particle color and type based on archetype
    let color, size;
    switch (archetype) {
      case 'gardener':
        color = 0x4CAF50; // green
        size = 0.05;
        break;
      case 'builder':
        color = 0x8D6E63; // brown
        size = 0.06;
        break;
      case 'musician':
        color = Math.random() > 0.5 ? 0x4169E1 : 0xFF69B4; // blue or pink
        size = 0.04;
        break;
      case 'artist':
        // Rainbow colors
        const colors = [0xFF0000, 0xFF7F00, 0xFFFF00, 0x00FF00, 0x0000FF, 0x4B0082, 0x9400D3];
        color = colors[Math.floor(Math.random() * colors.length)];
        size = 0.05;
        break;
      case 'healer':
        color = Math.random() > 0.5 ? 0xFFFFFF : 0xFFD700; // white or gold
        size = 0.04;
        break;
      default:
        return; // No particles for other archetypes
    }

    // Create particle geometry (reuse or create)
    const geometry = new THREE.SphereGeometry(size, 6, 6);
    const material = new THREE.MeshBasicMaterial({ color: color, transparent: true });
    const particle = new THREE.Mesh(geometry, material);

    // Position near NPC's hands (approximate)
    const handOffset = Math.random() > 0.5 ? 0.3 : -0.3;
    particle.position.set(
      npcMesh.position.x + handOffset + (Math.random() - 0.5) * 0.2,
      npcMesh.position.y + 1.0 + Math.random() * 0.2,
      npcMesh.position.z + (Math.random() - 0.5) * 0.2
    );

    // Add to scene
    if (storedSceneContext && storedSceneContext.scene) {
      storedSceneContext.scene.add(particle);
    } else {
      return; // Can't add particle without scene
    }

    // Track particle
    activityParticles.push({
      mesh: particle,
      timer: 2.0, // 2 second lifetime
      velocity: {
        x: (Math.random() - 0.5) * 0.1,
        y: 0.3 + Math.random() * 0.2, // upward drift
        z: (Math.random() - 0.5) * 0.1
      },
      startY: particle.position.y,
      npcId: npcMesh.userData.agentId
    });
  }

  /**
   * Update activity particles
   * @param {number} deltaTime - Frame delta time
   */
  function updateActivityParticles(deltaTime) {
    if (!storedSceneContext || !storedSceneContext.scene) return;

    for (let i = activityParticles.length - 1; i >= 0; i--) {
      const particle = activityParticles[i];
      particle.timer -= deltaTime;

      if (particle.timer <= 0) {
        // Remove particle
        storedSceneContext.scene.remove(particle.mesh);
        activityParticles.splice(i, 1);
      } else {
        // Update position
        particle.mesh.position.x += particle.velocity.x * deltaTime;
        particle.mesh.position.y += particle.velocity.y * deltaTime;
        particle.mesh.position.z += particle.velocity.z * deltaTime;

        // Fade out based on timer
        const fadeProgress = particle.timer / 2.0;
        particle.mesh.material.opacity = fadeProgress;

        // Slow down upward velocity slightly over time
        particle.velocity.y *= 0.98;
      }
    }
  }

  /**
   * Initialize NPCs
   */
  function initNPCs(agentsData, gameState, sceneContext) {
    console.log('Initializing AI citizens...');

    if (agentsData) {
      npcAgents = agentsData.agents || agentsData;
    } else {
      // Use embedded agents data (no fetch needed — single-file app)
      npcAgents = EMBEDDED_AGENTS;
    }

    console.log('Loaded ' + npcAgents.length + ' AI citizens');
    initNPCStates();

    if (sceneContext && sceneContext.scene) {
      addNPCsToScene(sceneContext);
    }
  }

  /**
   * Initialize NPC behavior states
   */
  function initNPCStates() {
    // Re-check for NpcAI module (may have loaded after npcs.js)
    if (!NpcAI && typeof window !== 'undefined') NpcAI = window.NpcAI;

    npcAgents.forEach(agent => {
      npcStates.set(agent.id, {
        currentState: 'idle',
        stateTimer: 5,
        destination: null,
        targetNPC: null,
        lookAngle: 0,
        animationTime: Math.random() * 1000,
        currentActivity: 'idle',
        lastActivityUpdate: 0,
        targetZone: agent.position.zone,
        targetPosition: null,
        movementSpeed: 0,
        idleTimer: Math.random() * 3
      });

      // Create AI brain for each NPC (if NpcAI available)
      if (NpcAI && NpcAI.createNpcBrain) {
        var brain = NpcAI.createNpcBrain(agent.archetype, agent.id);
        npcBrains.set(agent.id, brain);
      }
    });

    if (NpcAI) {
      console.log('NPC AI brains initialized for ' + npcBrains.size + ' agents');
    } else {
      console.log('NpcAI not loaded — using fallback behavior');
    }
  }

  /**
   * Add NPCs to 3D scene
   */
  function addNPCsToScene(sceneContext) {
    if (!sceneContext || !sceneContext.scene) return;

    const THREE = window.THREE;
    if (!THREE) return;

    // Store scene context for particle system
    storedSceneContext = sceneContext;

    npcAgents.forEach(agent => {
      // Create detailed humanoid NPC with unique skin tone
      const group = createHumanoidNPC(agent.archetype, THREE, agent.id);

      // Name label with archetype subtitle
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = 256;
      canvas.height = 96;

      context.fillStyle = 'rgba(0, 0, 0, 0.7)';
      context.fillRect(0, 0, canvas.width, canvas.height);

      // Draw name (larger and bolder)
      context.font = 'Bold 32px Arial';
      context.fillStyle = 'white';
      context.textAlign = 'center';
      context.fillText(agent.name, canvas.width / 2, 42);

      // Draw archetype subtitle
      context.font = '20px Arial';
      context.fillStyle = 'rgba(255, 255, 255, 0.8)';
      var archetypeCapitalized = agent.archetype.charAt(0).toUpperCase() + agent.archetype.slice(1);
      context.fillText(archetypeCapitalized, canvas.width / 2, 70);

      const labelTexture = new THREE.CanvasTexture(canvas);
      const labelMaterial = new THREE.SpriteMaterial({ map: labelTexture });
      const label = new THREE.Sprite(labelMaterial);
      label.scale.set(2.5, 1.0, 1);
      label.position.y = 2.5;
      group.add(label);

      // Position NPC - convert zone-relative to world coordinates
      var zoneCenter = ZONE_CENTERS[agent.position.zone] || {x: 0, z: 0};
      group.position.set(
        zoneCenter.x + agent.position.x,
        agent.position.y,
        zoneCenter.z + agent.position.z
      );

      // Update agent position to world coordinates for movement calculations
      agent.position.x += zoneCenter.x;
      agent.position.z += zoneCenter.z;

      // Store agent ID in mesh userData for particle system
      group.userData.agentId = agent.id;

      // Store reference
      npcMeshes.set(agent.id, group);

      // Add to scene (initially hidden)
      group.visible = false;
      sceneContext.scene.add(group);
    });

    console.log(`Added ${npcMeshes.size} NPC meshes to scene`);
  }

  /**
   * Update NPC activity based on daily schedule
   * @param {object} agent - NPC agent
   * @param {object} state - NPC state
   * @param {number} worldTime - Current world time in minutes
   */
  function updateNPCActivity(agent, state, worldTime) {
    if (!worldTime && worldTime !== 0) return; // No world time provided

    // Get current scheduled activity
    var scheduledActivity = getNPCSchedule(agent.archetype, worldTime);

    // Check if activity has changed
    if (state.currentActivity !== scheduledActivity) {
      state.currentActivity = scheduledActivity;
      state.lastActivityUpdate = worldTime;

      // Determine target zone for this activity
      var targetZone = getActivityZone(agent.archetype, scheduledActivity);

      // If zone changed, set destination to new zone center
      if (targetZone !== state.targetZone) {
        state.targetZone = targetZone;
        var zoneCenter = ZONE_CENTERS[targetZone];
        if (zoneCenter) {
          // Set destination near zone center with some randomness
          var angle = Math.random() * Math.PI * 2;
          var radius = 5 + Math.random() * 15;
          state.destination = {
            x: zoneCenter.x + Math.cos(angle) * radius,
            z: zoneCenter.z + Math.sin(angle) * radius
          };
          state.currentState = 'walking';
        }
      }

      // Map activity to behavior state
      var activityToBehavior = {
        // Working activities
        tending_garden: 'working',
        harvesting: 'working',
        planting: 'working',
        watering: 'working',
        building: 'working',
        painting: 'working',
        creating: 'working',
        composing: 'working',
        practicing: 'working',
        making_medicine: 'working',
        gathering_herbs: 'working',
        // Social activities
        selling: 'talking',
        teaching: 'talking',
        lecturing: 'talking',
        debating: 'talking',
        storytelling: 'talking',
        sharing_stories: 'talking',
        performing_crowd: 'talking',
        // Quiet activities
        reading: 'idle',
        studying: 'idle',
        researching: 'idle',
        writing: 'idle',
        contemplating: 'idle',
        meditating: 'idle',
        resting: 'idle',
        sleeping: 'idle',
        // Movement activities
        wandering_agora: 'walking',
        exploring: 'walking',
        setting_out: 'walking',
        returning: 'walking',
        // Other
        opening_shop: 'working',
        closing_shop: 'working',
        maintenance: 'working',
        planning: 'idle',
        mapping: 'working',
        performing: 'working',
        sketching: 'working',
        displaying_work: 'talking'
      };

      var behaviorState = activityToBehavior[scheduledActivity] || 'idle';

      // Only change behavior if not already walking to new zone
      if (state.currentState !== 'walking' || !state.destination) {
        state.currentState = behaviorState;
        var duration = BEHAVIOR_STATES[behaviorState].duration;
        state.stateTimer = duration[0] + Math.random() * (duration[1] - duration[0]);
      }
    }
  }

  /**
   * Update NPCs (called every frame)
   */
  function updateNPCs(sceneContext, gameState, deltaTime, worldTime, worldState) {
    if (npcAgents.length === 0) return;
    npcUpdateFrame++;

    // Re-check for NpcAI module (may have loaded after init)
    if (!NpcAI && typeof window !== 'undefined' && window.NpcAI) {
      NpcAI = window.NpcAI;
      // Late-init brains for NPCs that don't have one
      npcAgents.forEach(function(agent) {
        if (!npcBrains.has(agent.id) && NpcAI.createNpcBrain) {
          npcBrains.set(agent.id, NpcAI.createNpcBrain(agent.archetype, agent.id));
        }
      });
      console.log('NpcAI late-loaded, brains initialized');
    }

    // Process pending events
    if (NpcAI && pendingEvents.length > 0) {
      var events = pendingEvents.slice();
      pendingEvents = [];
      events.forEach(function(event) {
        npcBrains.forEach(function(brain) {
          if (NpcAI.handleEvent) NpcAI.handleEvent(brain.memory, event);
        });
      });
    }

    var timeSeed = Math.floor(worldTime);
    var playerPos = worldState && worldState.playerPosition ? worldState.playerPosition : null;

    npcAgents.forEach(function(agent, index) {
      var state = npcStates.get(agent.id);
      if (!state) return;

      // Performance: stagger AI updates by distance
      if (playerPos) {
        var dx = agent.position.x - playerPos.x;
        var dz = agent.position.z - playerPos.z;
        var dist = Math.sqrt(dx * dx + dz * dz);
        // Far NPCs update less frequently
        if (dist > 300) return; // skip entirely
        if (dist > 150 && npcUpdateFrame % 10 !== index % 10) return;
        if (dist > 50 && npcUpdateFrame % 3 !== index % 3) return;
      }

      // Update activity based on schedule (only if worldTime provided)
      if (worldTime || worldTime === 0) {
        updateNPCActivity(agent, state, worldTime);
      }

      state.animationTime += deltaTime * 1000;

      // Use NpcAI brain if available
      var brain = npcBrains.get(agent.id);
      if (brain && NpcAI && NpcAI.updateBrain) {
        // Build world state for AI perception
        var aiWorldState = {
          weather: worldState ? worldState.weather : 'clear',
          timeOfDay: worldState ? worldState.timePeriod : 'midday',
          currentHour: worldTime ? worldTime / 60 : 12,
          currentZone: agent.position.zone,
          nearbyPlayers: [],
          nearbyNPCs: [],
          allNPCs: npcAgents
        };

        // Add player info for perception
        if (playerPos && worldState) {
          var pdx = playerPos.x - agent.position.x;
          var pdz = playerPos.z - agent.position.z;
          var pDist = Math.sqrt(pdx * pdx + pdz * pdz);
          if (pDist < 25) {
            aiWorldState.nearbyPlayers.push({
              id: worldState.playerId || 'player',
              distance: pDist,
              direction: { x: pdx, z: pdz },
              isBuilding: false,
              isHarvesting: false
            });
          }
        }

        // Add nearby NPCs for perception
        npcAgents.forEach(function(other) {
          if (other.id === agent.id) return;
          var ndx = other.position.x - agent.position.x;
          var ndz = other.position.z - agent.position.z;
          var nDist = Math.sqrt(ndx * ndx + ndz * ndz);
          if (nDist < 25) {
            var otherBrain = npcBrains.get(other.id);
            aiWorldState.nearbyNPCs.push({
              id: other.id,
              distance: nDist,
              direction: { x: ndx, z: ndz },
              archetype: other.archetype,
              currentActivity: otherBrain ? NpcAI.getGoal(otherBrain) : 'idle',
              mood: otherBrain ? NpcAI.getMood(otherBrain) : 'neutral'
            });
          }
        });

        // Get AI decision
        var npcObj = { x: agent.position.x, z: agent.position.z, name: agent.name, zone: agent.position.zone };
        var decision = NpcAI.updateBrain(brain, npcObj, aiWorldState);

        // Execute decision
        if (decision) {
          // Store decision in brain for emote system access
          brain.lastDecision = decision;
          executeAIDecision(agent, state, decision, deltaTime);
        }
      } else {
        // Fallback to original behavior
        if (state.currentState !== 'walking' && state.currentState !== 'socializing') {
          state.stateTimer -= deltaTime;
          if (state.stateTimer <= 0) {
            transitionState(agent, state, timeSeed + index);
          }
        }
        updateNPCBehavior(agent, state, deltaTime, timeSeed + index);
      }

      updateNPCVisual(agent, state, sceneContext, deltaTime, playerPos);
    });

    // NPC-to-NPC conversations: trigger multi-line exchanges for collaborating pairs
    if (NpcAI && NpcAI.generateConversation && npcUpdateFrame % 120 === 0) {
      npcAgents.forEach(function(agent) {
        var state = npcStates.get(agent.id);
        if (!state || state.currentState !== 'collaborating' || !state.collaborateTarget) return;
        if (chatBubbles.has(agent.id)) return; // Already showing dialogue

        var partner = npcAgents.find(function(a) { return a.id === state.collaborateTarget; });
        if (!partner) return;

        var convo = NpcAI.generateConversation(agent.name, agent.archetype, partner.name, partner.archetype);
        if (convo && convo.length > 0) {
          // Show first two lines immediately (one per NPC), then stagger the rest
          showChatBubbleWithText(agent, convo[0]);
          if (convo.length > 1) {
            showChatBubbleWithText(partner, convo[1]);
          }
        }
      });
    }

    updateChatBubbles(deltaTime);
    updateActivityParticles(deltaTime);
    updateSpeechBubbleTimers(deltaTime);

    // Trigger random ambient speech for visible NPCs
    npcAgents.forEach(function(agent) {
      if (playerPos) {
        var dx = agent.position.x - playerPos.x;
        var dz = agent.position.z - playerPos.z;
        var dist = Math.sqrt(dx * dx + dz * dz);
        // Only trigger speech for nearby NPCs
        if (dist < 100) {
          triggerRandomSpeech(agent, deltaTime);
        }
      } else {
        triggerRandomSpeech(agent, deltaTime);
      }
    });
  }

  /**
   * Execute an AI brain decision — translates decision to movement/animation/dialogue
   */
  function executeAIDecision(agent, state, decision, deltaTime) {
    // Map AI decision type to NPC state
    switch (decision.type) {
      case 'walk_to':
      case 'wander':
      case 'explore':
      case 'approach_social':
      case 'seek_shelter':
        if (decision.target) {
          state.destination = { x: decision.target.x, z: decision.target.z };
          state.targetPosition = { x: decision.target.x, z: decision.target.z };
          state.currentState = 'walking';
          // Smooth interpolation toward target
          var dx = state.targetPosition.x - agent.position.x;
          var dz = state.targetPosition.z - agent.position.z;
          var dist = Math.sqrt(dx * dx + dz * dz);
          if (dist > 0.5) {
            var speed = decision.speed || 1.5;
            state.movementSpeed = speed;
            var moveAmount = speed * deltaTime;
            var ratio = Math.min(moveAmount / dist, 1);
            agent.position.x += dx * ratio;
            agent.position.z += dz * ratio;
            state.lookAngle = Math.atan2(dx, dz);
          } else {
            state.currentState = 'idle';
            state.destination = null;
            state.targetPosition = null;
            state.movementSpeed = 0;
          }
        }
        break;

      case 'work':
        state.currentState = 'working';
        state.stateTimer = 5 + Math.random() * 10;
        break;

      case 'collaborate':
        state.currentState = 'collaborating';
        state.stateTimer = 6 + Math.random() * 8;
        state.collaborateTarget = decision.targetNPC;
        state.collaborateDesc = decision.activityDesc;
        if (decision.facing) {
          state.lookAngle = Math.atan2(
            decision.facing.x - agent.position.x,
            decision.facing.z - agent.position.z
          );
        }
        break;

      case 'socialize':
      case 'join_group':
        state.currentState = 'talking';
        state.stateTimer = 4 + Math.random() * 3;
        break;

      case 'greet':
      case 'react':
        state.currentState = 'talking';
        state.stateTimer = 3;
        if (decision.facing) {
          state.lookAngle = Math.atan2(
            decision.facing.x - agent.position.x,
            decision.facing.z - agent.position.z
          );
        }
        break;

      case 'rest':
        state.currentState = 'idle';
        state.stateTimer = 8 + Math.random() * 10;
        break;

      case 'idle':
      default:
        state.currentState = 'idle';
        state.stateTimer = 3 + Math.random() * 5;
        break;
    }

    // Show dialogue if the decision includes one
    if (decision.dialogue) {
      showChatBubbleWithText(agent, decision.dialogue);
    }
  }

  /**
   * Show chat bubble with specific text (from AI brain)
   */
  function showChatBubbleWithText(agent, text) {
    var mesh = npcMeshes.get(agent.id);
    if (!mesh) return;
    var THREE = window.THREE;
    if (!THREE) return;

    // Remove existing bubble
    var existing = chatBubbles.get(agent.id);
    if (existing) { mesh.remove(existing.mesh); }

    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    canvas.width = 512; canvas.height = 128;

    context.fillStyle = 'rgba(255, 255, 255, 0.9)';
    context.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    context.lineWidth = 4;

    var x = 10, y = 10, w = canvas.width - 20, h = canvas.height - 20, r = 15;
    context.beginPath();
    context.moveTo(x + r, y);
    context.lineTo(x + w - r, y);
    context.quadraticCurveTo(x + w, y, x + w, y + r);
    context.lineTo(x + w, y + h - r);
    context.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    context.lineTo(x + r, y + h);
    context.quadraticCurveTo(x, y + h, x, y + h - r);
    context.lineTo(x, y + r);
    context.quadraticCurveTo(x, y, x + r, y);
    context.closePath();
    context.fill();
    context.stroke();

    context.fillStyle = 'black';
    context.font = '18px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    var words = text.split(' ');
    var line = '', y_pos = 50;
    for (var i = 0; i < words.length; i++) {
      var testLine = line + words[i] + ' ';
      if (context.measureText(testLine).width > 480 && line !== '') {
        context.fillText(line, canvas.width / 2, y_pos);
        line = words[i] + ' ';
        y_pos += 22;
      } else {
        line = testLine;
      }
    }
    context.fillText(line, canvas.width / 2, y_pos);

    var bubbleTexture = new THREE.CanvasTexture(canvas);
    var bubbleMaterial = new THREE.SpriteMaterial({ map: bubbleTexture });
    var bubble = new THREE.Sprite(bubbleMaterial);
    bubble.scale.set(4, 1, 1);
    bubble.position.y = 3.5;
    mesh.add(bubble);
    chatBubbles.set(agent.id, { mesh: bubble, timer: 5 });
  }

  /**
   * Transition NPC to new state
   */
  function transitionState(agent, state, seed) {
    const transitions = STATE_TRANSITIONS[state.currentState];
    if (!transitions) return;

    // Weighted random selection
    let roll = seededRandom(seed);
    let cumulative = 0;
    let newState = 'idle';

    for (const [stateName, weight] of Object.entries(transitions)) {
      cumulative += weight;
      if (roll < cumulative) {
        newState = stateName;
        break;
      }
    }

    // Set new state
    state.currentState = newState;

    // Set duration
    const durationRange = BEHAVIOR_STATES[newState].duration;
    const duration = durationRange[0] +
      seededRandom(seed + 1) * (durationRange[1] - durationRange[0]);
    state.stateTimer = duration;

    // State-specific setup
    switch (newState) {
      case 'walking':
        // 70% chance: walk to a landmark matching archetype, 30%: random wander
        var landmark = null;
        if (seededRandom(seed + 5) < 0.7) {
          landmark = pickLandmarkDestination(agent, seed + 6);
        }
        if (landmark) {
          // Walk to landmark with small offset for natural feel
          var lmOffX = (seededRandom(seed + 7) - 0.5) * 3;
          var lmOffZ = (seededRandom(seed + 8) - 0.5) * 3;
          state.destination = { x: landmark.x + lmOffX, z: landmark.z + lmOffZ };
          state.landmarkTarget = landmark.name;
        } else {
          // Fallback: random nearby destination within zone bounds
          var zoneCenter = ZONE_CENTERS[agent.position.zone] || {x: 0, z: 0};
          var wAngle = seededRandom(seed + 2) * Math.PI * 2;
          var wDist = 5 + seededRandom(seed + 3) * 20;
          var destX = agent.position.x + Math.cos(wAngle) * wDist;
          var destZ = agent.position.z + Math.sin(wAngle) * wDist;
          // Keep within zone radius (~60 units from zone center)
          var zoneRadius = 60;
          var dxFromCenter = destX - zoneCenter.x;
          var dzFromCenter = destZ - zoneCenter.z;
          var distFromCenter = Math.sqrt(dxFromCenter * dxFromCenter + dzFromCenter * dzFromCenter);
          if (distFromCenter > zoneRadius) {
            destX = zoneCenter.x + (dxFromCenter / distFromCenter) * zoneRadius;
            destZ = zoneCenter.z + (dzFromCenter / distFromCenter) * zoneRadius;
          }
          // Keep away from zone center structure
          var centerDist = Math.sqrt((destX - zoneCenter.x) * (destX - zoneCenter.x) + (destZ - zoneCenter.z) * (destZ - zoneCenter.z));
          if (centerDist < 10) {
            destX = zoneCenter.x + (destX - zoneCenter.x) / centerDist * 12;
            destZ = zoneCenter.z + (destZ - zoneCenter.z) / centerDist * 12;
          }
          state.destination = { x: destX, z: destZ };
          state.landmarkTarget = null;
        }
        break;

      case 'talking':
        // Show chat bubble
        showChatBubble(agent, seed);
        break;

      case 'socializing':
        // Find nearby NPCs by actual distance
        const nearby = npcAgents.filter(other => {
          if (other.id === agent.id) return false;
          var dx = other.position.x - agent.position.x;
          var dz = other.position.z - agent.position.z;
          return Math.sqrt(dx * dx + dz * dz) < 50; // within 50 units
        });
        if (nearby.length > 0) {
          state.targetNPC = randomChoice(nearby, seed + 4);
          state.destination = {
            x: state.targetNPC.position.x,
            z: state.targetNPC.position.z
          };
        } else {
          // No one nearby, go to idle
          state.currentState = 'idle';
          state.stateTimer = 5;
        }
        break;
    }
  }

  /**
   * Update NPC behavior
   */
  function updateNPCBehavior(agent, state, deltaTime, seed) {
    switch (state.currentState) {
      case 'idle':
        // Slowly rotate/look around
        state.lookAngle += (seededRandom(seed) - 0.5) * deltaTime * 0.5;
        break;

      case 'walking':
      case 'socializing':
        if (state.destination) {
          // Smooth interpolation toward destination
          const dx = state.destination.x - agent.position.x;
          const dz = state.destination.z - agent.position.z;
          const distance = Math.sqrt(dx * dx + dz * dz);

          if (distance > 0.5) {
            const speed = 1.5; // units per second
            state.movementSpeed = speed;
            const moveAmount = speed * deltaTime;
            const ratio = Math.min(moveAmount / distance, 1);

            agent.position.x += dx * ratio;
            agent.position.z += dz * ratio;

            // Update look angle to face movement direction
            state.lookAngle = Math.atan2(dx, dz);
          } else {
            // Reached destination
            state.movementSpeed = 0;
            if (state.currentState === 'socializing') {
              // Switch to talking
              state.currentState = 'talking';
              state.stateTimer = 4 + seededRandom(seed) * 2;
              showChatBubble(agent, seed);
            } else if (state.landmarkTarget) {
              // Arrived at landmark — do purposeful activity
              if (seededRandom(seed + 10) < 0.5) {
                state.currentState = 'working';
                state.stateTimer = 5 + seededRandom(seed + 11) * 10;
              } else {
                state.currentState = 'idle';
                state.stateTimer = 2 + seededRandom(seed + 12) * 3;
              }
              state.landmarkTarget = null;
            } else {
              // Switch to idle
              state.currentState = 'idle';
              state.stateTimer = 5;
            }
            state.destination = null;
            state.targetPosition = null;
          }
        }
        break;

      case 'working':
        // Animation handled in visual update
        break;

      case 'talking':
        // Chat bubble visible (handled separately)
        break;
    }
  }

  /**
   * Apply procedural animations to NPC
   */
  function applyAnimations(mesh, state, agent) {
    const userData = mesh.userData;
    if (!userData.head || !userData.torso) return;

    const time = state.animationTime;
    const currentState = state.currentState;

    // Reset rotations to neutral
    userData.leftArm.rotation.x = 0;
    userData.leftArm.rotation.z = 0;
    userData.rightArm.rotation.x = 0;
    userData.rightArm.rotation.z = 0;
    userData.leftLeg.rotation.x = 0;
    userData.rightLeg.rotation.x = 0;
    userData.head.rotation.x = 0;
    userData.head.rotation.y = 0;
    userData.torso.scale.y = 1;

    switch (currentState) {
      case 'idle':
        // Subtle breathing - torso Y scale oscillation
        const breathPhase = Math.sin(time * 0.002);
        userData.torso.scale.y = 1.0 + breathPhase * 0.02;

        // Gentle head sway
        userData.head.rotation.y = Math.sin(time * 0.001) * 0.05;

        // Occasional head turn (every ~3 seconds)
        state.idleTimer -= 0.016; // approx deltaTime
        if (state.idleTimer <= 0) {
          state.idleTimer = 3 + Math.random() * 3;
        }
        var headTurnPhase = Math.max(0, 1 - state.idleTimer / 0.5); // Quick turn
        if (state.idleTimer < 0.5) {
          userData.head.rotation.y += Math.sin(headTurnPhase * Math.PI) * 0.3;
        }

        // Subtle weight shift
        var weightShift = Math.sin(time * 0.0008) * 0.02;
        mesh.position.y = weightShift;
        userData.torso.rotation.z = weightShift * 0.5;
        break;

      case 'walking':
      case 'socializing':
        // Walking animation proportional to movement speed
        var walkSpeedMultiplier = Math.max(0.5, state.movementSpeed || 1.5) / 1.5;
        var walkFrequency = 0.008 * walkSpeedMultiplier;

        // Legs alternate - more pronounced swing
        var legSwing = Math.sin(time * walkFrequency) * 0.5 * walkSpeedMultiplier;
        userData.leftLeg.rotation.x = legSwing;
        userData.rightLeg.rotation.x = -legSwing;

        // Arms swing opposite to legs - natural pendulum motion
        var armSwing = Math.sin(time * walkFrequency + Math.PI) * 0.35 * walkSpeedMultiplier;
        userData.leftArm.rotation.x = armSwing;
        userData.rightArm.rotation.x = -armSwing;

        // Torso bob - up and down motion during walk
        var bobPhase = Math.abs(Math.sin(time * walkFrequency));
        mesh.position.y = bobPhase * 0.08 * walkSpeedMultiplier;

        // Slight torso sway side-to-side
        userData.torso.rotation.z = Math.sin(time * walkFrequency * 0.5) * 0.03;

        // Head slight sway for natural movement
        userData.head.rotation.z = Math.sin(time * walkFrequency * 0.5) * 0.02;
        userData.head.rotation.y = Math.sin(time * walkFrequency * 0.3) * 0.03;

        // Head faces movement direction (handled by mesh rotation)
        break;

      case 'talking':
        // Arms gesture - slight rotation on varied timing
        userData.leftArm.rotation.x = Math.sin(time * 0.003) * 0.15;
        userData.rightArm.rotation.x = Math.sin(time * 0.004 + 1.5) * 0.15;
        userData.leftArm.rotation.z = Math.sin(time * 0.0025) * 0.1;
        userData.rightArm.rotation.z = -Math.sin(time * 0.0035) * 0.1;

        // Head nods
        userData.head.rotation.x = Math.sin(time * 0.005) * 0.1;
        break;

      case 'working':
        // Archetype-specific working animations
        switch (agent.archetype) {
          case 'gardener':
            // Bent over, arms reaching down
            userData.torso.rotation.x = 0.3;
            userData.leftArm.rotation.x = 0.5;
            userData.rightArm.rotation.x = 0.5;
            userData.head.rotation.x = 0.2;
            break;

          case 'builder':
            // Arm hammering motion
            const hammerPhase = Math.sin(time * 0.006);
            userData.rightArm.rotation.x = -0.5 + hammerPhase * 0.8;
            userData.leftArm.rotation.x = 0.2;
            break;

          case 'merchant':
            // Standing with slight arm gestures
            userData.leftArm.rotation.x = Math.sin(time * 0.003) * 0.2;
            userData.rightArm.rotation.x = -0.3 + Math.sin(time * 0.004) * 0.1;
            break;

          case 'musician':
            // Arms positioned as if playing
            userData.leftArm.rotation.x = -0.8;
            userData.leftArm.rotation.z = 0.5;
            userData.rightArm.rotation.x = -0.6;
            userData.rightArm.rotation.z = -0.3;
            // Slight bobbing
            mesh.position.y = Math.sin(time * 0.004) * 0.03;
            break;

          default:
            // Generic arm motion
            userData.leftArm.rotation.x = Math.sin(time * 0.004) * 0.3;
            userData.rightArm.rotation.x = Math.sin(time * 0.005 + Math.PI) * 0.3;
            break;
        }
        break;

      case 'collaborating':
        // Two-person interaction: animated gesturing, facing partner
        userData.leftArm.rotation.x = Math.sin(time * 0.003) * 0.25 - 0.3;
        userData.rightArm.rotation.x = Math.sin(time * 0.004 + 1) * 0.2 - 0.2;
        userData.leftArm.rotation.z = Math.sin(time * 0.002) * 0.15 + 0.1;
        userData.rightArm.rotation.z = -Math.sin(time * 0.0025) * 0.15 - 0.1;
        // Head nods and turns
        userData.head.rotation.x = Math.sin(time * 0.005) * 0.12;
        userData.head.rotation.y = Math.sin(time * 0.002) * 0.08;
        // Slight weight shifting
        mesh.position.y = Math.sin(time * 0.002) * 0.02;
        break;
    }

    // Animate glow ring - subtle pulsing
    if (userData.glowRing) {
      var pulseFactor = Math.sin(time * 0.003) * 0.1 + 0.9;
      userData.glowRing.material.opacity = 0.4 * pulseFactor;
    }
  }

  /**
   * Update NPC visual representation
   */
  function updateNPCVisual(agent, state, sceneContext, deltaTime, playerPos) {
    const mesh = npcMeshes.get(agent.id);
    if (!mesh) return;
    const THREE = window.THREE;
    if (!THREE) return;

    // Update position with smooth interpolation
    const lerpFactor = Math.min(deltaTime * 5, 1);
    mesh.position.x += (agent.position.x - mesh.position.x) * lerpFactor;
    mesh.position.z += (agent.position.z - mesh.position.z) * lerpFactor;

    // Adjust Y to terrain height if World module available
    var World = typeof window !== 'undefined' ? window.World : null;
    if (World && World.getTerrainHeight) {
      var terrainY = World.getTerrainHeight(mesh.position.x, mesh.position.z);
      mesh.position.y = terrainY;
    }

    // Update rotation (facing direction) with smooth interpolation
    var targetRotation = mesh.rotation.y;
    if (state.currentState === 'walking' || state.currentState === 'socializing') {
      targetRotation = state.lookAngle;
    } else if (state.currentState === 'collaborating' && state.collaborateTarget) {
      // Face the partner NPC
      var partnerMesh = npcMeshes.get(state.collaborateTarget);
      if (partnerMesh) {
        var cdx = partnerMesh.position.x - mesh.position.x;
        var cdz = partnerMesh.position.z - mesh.position.z;
        targetRotation = Math.atan2(cdx, cdz);
      }
    }

    // Smooth rotation interpolation - handle angle wrapping
    var angleDiff = targetRotation - mesh.rotation.y;
    // Normalize angle difference to [-PI, PI]
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    var rotationSpeed = state.currentState === 'walking' ? 8 : 3;
    mesh.rotation.y += angleDiff * Math.min(deltaTime * rotationSpeed, 1);

    // Apply procedural animations
    applyAnimations(mesh, state, agent);

    // Update emote indicator (only for NPCs within 30 units of camera/player)
    if (playerPos || sceneContext.camera) {
      let checkPos = playerPos;
      if (!checkPos && sceneContext.camera) {
        checkPos = { x: sceneContext.camera.position.x, z: sceneContext.camera.position.z };
      }

      if (checkPos) {
        const dx = checkPos.x - agent.position.x;
        const dz = checkPos.z - agent.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < 30) {
          // Get AI decision if available (from brain)
          let decision = null;
          const brain = npcBrains.get(agent.id);
          if (brain && brain.lastDecision) {
            decision = brain.lastDecision;
          }

          updateEmoteIndicator(agent, state, mesh, playerPos, decision);

          // Update activity indicator
          updateActivityIndicator(agent, state, mesh, deltaTime);

          // Spawn activity particles for working NPCs (throttled)
          if (state.currentState === 'working') {
            let spawnTimer = particleSpawnTimers.get(agent.id) || 0;
            spawnTimer -= deltaTime;
            if (spawnTimer <= 0) {
              spawnActivityParticle(mesh, agent.archetype, THREE);
              particleSpawnTimers.set(agent.id, 1.0); // 1 second throttle
            } else {
              particleSpawnTimers.set(agent.id, spawnTimer);
            }
          }
        } else {
          // Too far - remove emote sprite if exists
          const emoteData = emoteSprites.get(agent.id);
          if (emoteData && emoteData.sprite) {
            mesh.remove(emoteData.sprite);
            emoteSprites.delete(agent.id);
          }
          // Also remove activity indicator
          const indicatorData = activityIndicators.get(agent.id);
          if (indicatorData && indicatorData.mesh) {
            mesh.remove(indicatorData.mesh);
            activityIndicators.delete(agent.id);
          }
        }
      }
    }
  }

  /**
   * Show chat bubble for NPC
   */
  function showChatBubble(agent, seed) {
    var message;
    var state = npcStates.get(agent.id);

    // Use activity-based dialogue if available
    if (state && state.currentActivity && state.currentActivity !== 'idle') {
      message = getActivityDialogue(state.currentActivity);
    } else {
      // Fallback to archetype messages
      const messages = ARCHETYPE_MESSAGES[agent.archetype] || ['...'];
      message = randomChoice(messages, seed);
    }

    const mesh = npcMeshes.get(agent.id);
    if (!mesh) return;

    const THREE = window.THREE;
    if (!THREE) return;

    // Remove existing bubble if any
    const existing = chatBubbles.get(agent.id);
    if (existing) {
      mesh.remove(existing.mesh);
    }

    // Create chat bubble sprite
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 128;

    // Background
    context.fillStyle = 'rgba(255, 255, 255, 0.9)';
    context.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    context.lineWidth = 4;

    // Rounded rectangle
    const x = 10, y = 10, w = canvas.width - 20, h = canvas.height - 20, r = 15;
    context.beginPath();
    context.moveTo(x + r, y);
    context.lineTo(x + w - r, y);
    context.quadraticCurveTo(x + w, y, x + w, y + r);
    context.lineTo(x + w, y + h - r);
    context.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    context.lineTo(x + r, y + h);
    context.quadraticCurveTo(x, y + h, x, y + h - r);
    context.lineTo(x, y + r);
    context.quadraticCurveTo(x, y, x + r, y);
    context.closePath();
    context.fill();
    context.stroke();

    // Text
    context.fillStyle = 'black';
    context.font = '20px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    // Word wrap
    const words = message.split(' ');
    let line = '';
    let y_pos = 64;
    const maxWidth = 480;

    for (let word of words) {
      const testLine = line + word + ' ';
      const metrics = context.measureText(testLine);
      if (metrics.width > maxWidth && line !== '') {
        context.fillText(line, canvas.width / 2, y_pos - 10);
        line = word + ' ';
        y_pos += 25;
      } else {
        line = testLine;
      }
    }
    context.fillText(line, canvas.width / 2, y_pos - 10);

    const bubbleTexture = new THREE.CanvasTexture(canvas);
    const bubbleMaterial = new THREE.SpriteMaterial({ map: bubbleTexture });
    const bubble = new THREE.Sprite(bubbleMaterial);
    bubble.scale.set(4, 1, 1);
    bubble.position.y = 3.5;

    mesh.add(bubble);
    chatBubbles.set(agent.id, {
      mesh: bubble,
      timer: 5 // display for 5 seconds
    });
  }

  /**
   * Update chat bubbles (fade out)
   */
  function updateChatBubbles(deltaTime) {
    for (const [agentId, bubble] of chatBubbles.entries()) {
      bubble.timer -= deltaTime;

      if (bubble.timer <= 0) {
        // Remove bubble
        const npcMesh = npcMeshes.get(agentId);
        if (npcMesh) {
          npcMesh.remove(bubble.mesh);
        }
        chatBubbles.delete(agentId);
      } else if (bubble.timer < 1) {
        // Fade out
        bubble.mesh.material.opacity = bubble.timer;
      }
    }
  }

  /**
   * Initialize speech bubble container
   */
  function initSpeechBubbleContainer() {
    if (!speechBubbleContainer) {
      speechBubbleContainer = document.createElement('div');
      speechBubbleContainer.id = 'npc-speech-bubbles';
      speechBubbleContainer.style.position = 'absolute';
      speechBubbleContainer.style.top = '0';
      speechBubbleContainer.style.left = '0';
      speechBubbleContainer.style.width = '100%';
      speechBubbleContainer.style.height = '100%';
      speechBubbleContainer.style.pointerEvents = 'none';
      speechBubbleContainer.style.zIndex = '100';
      document.body.appendChild(speechBubbleContainer);
    }
  }

  /**
   * Show a speech bubble above an NPC's head
   * @param {string} npcId - NPC ID
   * @param {string} message - Message to display
   */
  function showNPCSpeechBubble(npcId, message) {
    initSpeechBubbleContainer();

    // Remove existing bubble for this NPC
    var existing = speechBubbles.get(npcId);
    if (existing && existing.element) {
      speechBubbleContainer.removeChild(existing.element);
    }

    // Create new bubble element
    var bubble = document.createElement('div');
    bubble.style.position = 'absolute';
    bubble.style.padding = '8px 12px';
    bubble.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
    bubble.style.border = '2px solid rgba(0, 0, 0, 0.3)';
    bubble.style.borderRadius = '12px';
    bubble.style.fontSize = '14px';
    bubble.style.fontFamily = 'Arial, sans-serif';
    bubble.style.color = '#333';
    bubble.style.whiteSpace = 'nowrap';
    bubble.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
    bubble.style.transition = 'opacity 0.3s ease-out';
    bubble.textContent = message;

    speechBubbleContainer.appendChild(bubble);

    // Store bubble data
    speechBubbles.set(npcId, {
      element: bubble,
      timer: 3.0 // Display for 3 seconds
    });
  }

  /**
   * Update speech bubble positions based on camera projection
   * @param {THREE.Camera} camera - The camera to project from
   */
  function updateSpeechBubbles(camera) {
    if (!camera || !speechBubbleContainer) return;

    var THREE = window.THREE;
    if (!THREE) return;

    // Get renderer size for projection
    var width = window.innerWidth;
    var height = window.innerHeight;

    for (var [npcId, bubble] of speechBubbles.entries()) {
      var npcMesh = npcMeshes.get(npcId);
      if (!npcMesh) {
        // NPC no longer exists, remove bubble
        if (bubble.element) {
          speechBubbleContainer.removeChild(bubble.element);
        }
        speechBubbles.delete(npcId);
        continue;
      }

      // Calculate position above NPC's head (y = 2.2 is above head at 1.6)
      var worldPos = new THREE.Vector3();
      npcMesh.getWorldPosition(worldPos);
      worldPos.y += 2.2;

      // Project to screen coordinates
      var screenPos = worldPos.clone();
      screenPos.project(camera);

      // Convert to pixel coordinates
      var x = (screenPos.x * 0.5 + 0.5) * width;
      var y = (-screenPos.y * 0.5 + 0.5) * height;

      // Check if behind camera
      if (screenPos.z > 1) {
        bubble.element.style.display = 'none';
      } else {
        bubble.element.style.display = 'block';
        bubble.element.style.left = x + 'px';
        bubble.element.style.top = y + 'px';
        bubble.element.style.transform = 'translate(-50%, -100%)';
      }
    }
  }

  /**
   * Update speech bubble timers and remove expired ones
   * @param {number} deltaTime - Time since last frame
   */
  function updateSpeechBubbleTimers(deltaTime) {
    for (var [npcId, bubble] of speechBubbles.entries()) {
      bubble.timer -= deltaTime;

      if (bubble.timer <= 0) {
        // Remove expired bubble
        if (bubble.element) {
          speechBubbleContainer.removeChild(bubble.element);
        }
        speechBubbles.delete(npcId);
      } else if (bubble.timer < 0.5) {
        // Fade out in last 0.5 seconds
        if (bubble.element) {
          bubble.element.style.opacity = (bubble.timer / 0.5).toString();
        }
      }
    }
  }

  /**
   * Clear all speech bubbles
   */
  function clearSpeechBubbles() {
    for (var [npcId, bubble] of speechBubbles.entries()) {
      if (bubble.element) {
        speechBubbleContainer.removeChild(bubble.element);
      }
    }
    speechBubbles.clear();
  }

  /**
   * Trigger random ambient speech for NPCs
   * Called periodically from updateNPCs
   */
  function triggerRandomSpeech(agent, deltaTime) {
    // Initialize next speech time if not set
    var bubbleData = speechBubbles.get(agent.id);
    if (!bubbleData) {
      bubbleData = {
        element: null,
        timer: 0,
        nextSpeechTime: 15 + Math.random() * 15 // Random 15-30 seconds
      };
      speechBubbles.set(agent.id, bubbleData);
    }

    // Don't show speech if already showing a bubble
    if (bubbleData.element && bubbleData.timer > 0) {
      return;
    }

    // Countdown to next speech
    bubbleData.nextSpeechTime -= deltaTime;

    if (bubbleData.nextSpeechTime <= 0) {
      // Time to speak! Get archetype-specific message
      var messages = ARCHETYPE_SPEECH[agent.archetype];
      if (!messages || messages.length === 0) {
        messages = ["Hello!", "Beautiful day!", "Greetings!"];
      }

      var message = messages[Math.floor(Math.random() * messages.length)];
      showNPCSpeechBubble(agent.id, message);

      // Schedule next speech in 15-30 seconds
      bubbleData.nextSpeechTime = 15 + Math.random() * 15;
    }
  }

  /**
   * Reload NPCs for current zone (or by distance on unified world)
   */
  function reloadZoneNPCs(sceneContext, currentZone, playerPos) {
    if (!playerPos) {
      // Fallback: show all NPCs in current zone
      npcMeshes.forEach((mesh, agentId) => {
        const agent = npcAgents.find(a => a.id === agentId);
        if (agent) {
          mesh.visible = (agent.position.zone === currentZone);
        }
      });
      console.log(`Showing NPCs for zone: ${currentZone}`);
    } else {
      // Show NPCs within 200 units of player
      var viewDist = 200;
      npcMeshes.forEach((mesh, agentId) => {
        const agent = npcAgents.find(a => a.id === agentId);
        if (agent) {
          var dx = agent.position.x - playerPos.x;
          var dz = agent.position.z - playerPos.z;
          var dist = Math.sqrt(dx * dx + dz * dz);
          mesh.visible = (dist < viewDist);
        }
      });
    }
  }

  /**
   * Get NPCs in a specific zone
   */
  function getNPCsInZone(zone) {
    return npcAgents.filter(agent => agent.position.zone === zone);
  }

  /**
   * Get specific NPC by ID
   */
  function getNPCById(id) {
    return npcAgents.find(agent => agent.id === id);
  }

  /**
   * Find nearest NPC to a world position within a max distance
   * @returns {object|null} - {agent, distance} or null
   */
  function findNearestNPC(worldX, worldZ, maxDist) {
    maxDist = maxDist || 10;
    var best = null;
    var bestDist = maxDist;
    for (var i = 0; i < npcAgents.length; i++) {
      var agent = npcAgents[i];
      var dx = agent.position.x - worldX;
      var dz = agent.position.z - worldZ;
      var dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < bestDist) {
        bestDist = dist;
        best = { agent: agent, distance: dist };
      }
    }
    return best;
  }

  /**
   * Interact with an NPC — triggers greeting dialogue and returns response
   * Includes quest system integration
   * @returns {object|null} - {name, message, archetype, hasQuest, questInfo}
   */
  function interactWithNPC(worldX, worldZ, playerId) {
    var nearest = findNearestNPC(worldX, worldZ, 8);
    if (!nearest) return null;

    var agent = nearest.agent;
    var seed = Date.now() * 0.001 + agent.id.charCodeAt(0);
    var brain = npcBrains.get(agent.id);
    var message, mood, activity, familiarity;

    // Check for quests from this NPC
    var Quests = typeof window !== 'undefined' ? window.Quests : null;
    var questInfo = null;
    var hasQuest = false;

    if (Quests && playerId) {
      var npcQuests = Quests.getNpcQuests(agent.id, playerId);
      if (npcQuests.length > 0) {
        hasQuest = true;
        questInfo = npcQuests[0]; // Return first quest for now
      }
    }

    if (brain && NpcAI) {
      // Use AI brain for contextual dialogue
      var context = { category: 'greeting_first' };
      if (NpcAI.getDialogue) {
        // Build a simple perception for dialogue context
        message = NpcAI.getDialogue(brain.memory, context, agent.name);
      }
      mood = NpcAI.getMood ? NpcAI.getMood(brain) : 'neutral';
      activity = NpcAI.getGoal ? NpcAI.getGoal(brain) : '';
      familiarity = brain.memory && brain.memory.playerFamiliarity
        ? Math.round(Object.values(brain.memory.playerFamiliarity)[0] || 0)
        : 0;

      // Record interaction in brain memory
      if (NpcAI.handleEvent) {
        NpcAI.handleEvent(brain.memory, {
          type: 'player_interact',
          playerId: playerId || 'player',
          description: 'Player interacted directly'
        });
      }
      // Increase familiarity
      if (brain.memory && brain.memory.playerFamiliarity) {
        var pKey = Object.keys(brain.memory.playerFamiliarity)[0] || (playerId || 'player');
        brain.memory.playerFamiliarity[pKey] = Math.min(100, (brain.memory.playerFamiliarity[pKey] || 0) + 5);
        familiarity = Math.round(brain.memory.playerFamiliarity[pKey]);
      }
    }

    // Use quest dialogue if available
    if (questInfo && questInfo.quest && questInfo.quest.dialogue) {
      if (questInfo.state === 'available') {
        message = questInfo.quest.dialogue.offer;
      } else if (questInfo.state === 'active') {
        message = Quests.getQuestDialogue(questInfo.quest.id, 'progress', questInfo.quest);
      } else if (questInfo.state === 'complete') {
        message = questInfo.quest.dialogue.complete || 'Quest complete! Return to turn it in.';
      }
    }

    // Use schedule-based dialogue if no quest dialogue
    if (!message) {
      var state = npcStates.get(agent.id);
      if (state && state.currentActivity && state.currentActivity !== 'idle') {
        message = getActivityDialogue(state.currentActivity);
      }
    }

    // Fallback to random archetype message if no activity dialogue
    if (!message) {
      var messages = ARCHETYPE_MESSAGES[agent.archetype] || ['Hello there.'];
      message = randomChoice(messages, seed);
    }

    // Show chat bubble
    if (brain && NpcAI) {
      showChatBubbleWithText(agent, message);
    } else {
      showChatBubble(agent, seed);
    }

    return {
      name: agent.name,
      message: message,
      archetype: agent.archetype,
      mood: mood || 'neutral',
      activity: activity || '',
      familiarity: familiarity || 0,
      id: agent.id,
      hasQuest: hasQuest,
      questInfo: questInfo
    };
  }

  /**
   * Get all NPC positions for minimap rendering
   * @returns {Array} - [{x, z, name, archetype}]
   */
  function getNPCPositions() {
    return npcAgents.map(function(agent) {
      return {
        x: agent.position.x,
        z: agent.position.z,
        name: agent.name,
        archetype: agent.archetype,
        zone: agent.position.zone
      };
    });
  }

  /**
   * Broadcast an event to all NPC brains
   * @param {object} event - {type, data}
   */
  function broadcastEvent(event) {
    if (!event) return;
    // Convert event format for NpcAI
    var aiEvent = {
      type: event.type,
      description: event.type + ': ' + JSON.stringify(event.data || {}).substring(0, 100)
    };
    // Merge event data
    if (event.data) {
      if (event.data.weather) aiEvent.weather = event.data.weather;
      if (event.data.period) aiEvent.timeOfDay = event.data.period;
    }
    pendingEvents.push(aiEvent);
  }

  /**
   * Get NPC mood by ID
   */
  function getNPCMood(id) {
    var brain = npcBrains.get(id);
    if (brain && NpcAI && NpcAI.getMood) return NpcAI.getMood(brain);
    return 'neutral';
  }

  /**
   * Get NPC current goal by ID
   */
  function getNPCGoal(id) {
    var brain = npcBrains.get(id);
    if (brain && NpcAI && NpcAI.getGoal) return NpcAI.getGoal(brain);
    return 'idle';
  }

  /**
   * Get NPC current activity string
   */
  function getNPCActivity(id) {
    var state = npcStates.get(id);
    return state ? state.currentState : 'unknown';
  }

  /**
   * Play emote animation on player mesh
   * @param {THREE.Group} playerMesh - Player mesh group
   * @param {string} emoteType - Type of emote (wave, dance, bow, cheer, meditate, point)
   */
  function playEmoteAnimation(playerMesh, emoteType) {
    if (!playerMesh || !playerMesh.userData) return;

    var userData = playerMesh.userData;
    if (!userData.head || !userData.torso || !userData.leftArm || !userData.rightArm) return;

    // Cancel any existing emote animation
    if (playerMesh.userData.emoteAnimation) {
      clearTimeout(playerMesh.userData.emoteAnimation.timeout);
      cancelAnimationFrame(playerMesh.userData.emoteAnimation.frame);
    }

    var startTime = Date.now();
    var duration = 0;
    var emoteData = { type: emoteType, startTime: startTime };

    function animate() {
      var elapsed = (Date.now() - startTime) / 1000;
      var t = elapsed;

      // Reset to neutral first
      userData.leftArm.rotation.x = 0;
      userData.leftArm.rotation.z = 0;
      userData.rightArm.rotation.x = 0;
      userData.rightArm.rotation.z = 0;
      userData.leftLeg.rotation.x = 0;
      userData.rightLeg.rotation.x = 0;
      userData.head.rotation.x = 0;
      userData.head.rotation.y = 0;
      userData.torso.rotation.x = 0;
      playerMesh.position.y = 0;

      var isComplete = false;

      switch (emoteType) {
        case 'wave':
          // Right arm raises and sways side to side for 2 seconds
          duration = 2.0;
          if (elapsed < duration) {
            var waveProgress = Math.min(elapsed / 0.3, 1.0);
            userData.rightArm.rotation.x = -1.5 * waveProgress;
            userData.rightArm.rotation.z = -0.3 * waveProgress;
            var swayAmount = Math.sin(t * 6) * 0.4;
            userData.rightArm.rotation.y = swayAmount;
            userData.head.rotation.y = swayAmount * 0.3;
          } else {
            isComplete = true;
          }
          break;

        case 'dance':
          // Body bobs up/down, arms alternating raise, slight rotation for 3 seconds
          duration = 3.0;
          if (elapsed < duration) {
            var bobAmount = Math.sin(t * 4) * 0.15;
            playerMesh.position.y = Math.abs(bobAmount);
            userData.leftArm.rotation.x = -0.5 + Math.sin(t * 4) * 0.8;
            userData.rightArm.rotation.x = -0.5 + Math.sin(t * 4 + Math.PI) * 0.8;
            userData.torso.rotation.y = Math.sin(t * 3) * 0.15;
            userData.leftLeg.rotation.x = Math.sin(t * 4) * 0.3;
            userData.rightLeg.rotation.x = Math.sin(t * 4 + Math.PI) * 0.3;
          } else {
            isComplete = true;
          }
          break;

        case 'bow':
          // Upper body tilts forward 45 degrees then returns, 1.5 seconds
          duration = 1.5;
          if (elapsed < duration) {
            var bowProgress;
            if (elapsed < duration * 0.5) {
              bowProgress = (elapsed / (duration * 0.5));
            } else {
              bowProgress = 1.0 - ((elapsed - duration * 0.5) / (duration * 0.5));
            }
            userData.torso.rotation.x = bowProgress * 0.785;
            userData.head.rotation.x = bowProgress * 0.3;
            userData.leftArm.rotation.x = bowProgress * 0.2;
            userData.rightArm.rotation.x = bowProgress * 0.2;
          } else {
            isComplete = true;
          }
          break;

        case 'cheer':
          // Both arms raise up, small hop (y bounce), 2 seconds
          duration = 2.0;
          if (elapsed < duration) {
            var cheerProgress = Math.min(elapsed / 0.2, 1.0);
            userData.leftArm.rotation.x = -2.0 * cheerProgress;
            userData.leftArm.rotation.z = 0.3 * cheerProgress;
            userData.rightArm.rotation.x = -2.0 * cheerProgress;
            userData.rightArm.rotation.z = -0.3 * cheerProgress;
            var hopAmount = Math.abs(Math.sin(t * 5)) * 0.2;
            playerMesh.position.y = hopAmount;
          } else {
            isComplete = true;
          }
          break;

        case 'meditate':
          // Body lowers slightly, arms to sides, gentle floating motion, 3 seconds
          duration = 3.0;
          if (elapsed < duration) {
            var meditateProgress = Math.min(elapsed / 0.5, 1.0);
            playerMesh.position.y = -0.2 * meditateProgress + Math.sin(t * 2) * 0.03;
            userData.leftArm.rotation.x = 0.3 * meditateProgress;
            userData.leftArm.rotation.z = 0.5 * meditateProgress;
            userData.rightArm.rotation.x = 0.3 * meditateProgress;
            userData.rightArm.rotation.z = -0.5 * meditateProgress;
            userData.leftLeg.rotation.z = 0.4 * meditateProgress;
            userData.rightLeg.rotation.z = -0.4 * meditateProgress;
            userData.head.rotation.x = -0.2 * meditateProgress;
            userData.torso.rotation.x = -0.1 * meditateProgress;
          } else {
            isComplete = true;
          }
          break;

        case 'point':
          // Right arm extends forward, holds 1.5 seconds
          duration = 1.5;
          if (elapsed < duration) {
            var pointProgress = Math.min(elapsed / 0.3, 1.0);
            userData.rightArm.rotation.x = -1.2 * pointProgress;
            userData.rightArm.rotation.y = 0.2 * pointProgress;
            userData.rightArm.rotation.z = -0.1 * pointProgress;
            userData.head.rotation.y = 0.2 * pointProgress;
            userData.torso.rotation.y = 0.1 * pointProgress;
          } else {
            isComplete = true;
          }
          break;

        default:
          isComplete = true;
      }

      if (!isComplete) {
        emoteData.frame = requestAnimationFrame(animate);
      } else {
        // Return to neutral
        userData.leftArm.rotation.x = 0;
        userData.leftArm.rotation.y = 0;
        userData.leftArm.rotation.z = 0;
        userData.rightArm.rotation.x = 0;
        userData.rightArm.rotation.y = 0;
        userData.rightArm.rotation.z = 0;
        userData.leftLeg.rotation.x = 0;
        userData.leftLeg.rotation.z = 0;
        userData.rightLeg.rotation.x = 0;
        userData.rightLeg.rotation.z = 0;
        userData.head.rotation.x = 0;
        userData.head.rotation.y = 0;
        userData.torso.rotation.x = 0;
        userData.torso.rotation.y = 0;
        playerMesh.position.y = 0;
        playerMesh.userData.emoteAnimation = null;
      }
    }

    playerMesh.userData.emoteAnimation = emoteData;
    animate();
  }

  // Export public API
  exports.initNPCs = initNPCs;
  exports.updateNPCs = updateNPCs;
  exports.reloadZoneNPCs = reloadZoneNPCs;
  exports.getNPCsInZone = getNPCsInZone;
  exports.getNPCById = getNPCById;
  exports.findNearestNPC = findNearestNPC;
  exports.interactWithNPC = interactWithNPC;
  exports.getNPCPositions = getNPCPositions;
  exports.broadcastEvent = broadcastEvent;
  exports.getNPCMood = getNPCMood;
  exports.getNPCGoal = getNPCGoal;
  exports.getNPCActivity = getNPCActivity;
  exports.updateQuestIndicators = updateQuestIndicators;
  exports.playEmoteAnimation = playEmoteAnimation;
  exports.getNPCSchedule = getNPCSchedule;
  exports.getActivityDialogue = getActivityDialogue;
  exports.getActivityZone = getActivityZone;
  exports.getTimePeriod = getTimePeriod;
  exports.showNPCSpeechBubble = showNPCSpeechBubble;
  exports.updateSpeechBubbles = updateSpeechBubbles;
  exports.clearSpeechBubbles = clearSpeechBubbles;
  exports.getAgents = function() { return npcAgents; };
  exports.getNearbyNPCCount = function(playerPos, radius) {
    if (!playerPos || !npcAgents) return 0;
    var count = 0;
    for (var i = 0; i < npcAgents.length; i++) {
      var npc = npcAgents[i];
      if (!npc || !npc.x) continue;
      var dx = npc.x - playerPos.x;
      var dz = npc.z - playerPos.z;
      if (Math.sqrt(dx * dx + dz * dz) <= radius) count++;
    }
    return count;
  };

})(typeof module !== 'undefined' ? module.exports : (window.NPCs = {}));
