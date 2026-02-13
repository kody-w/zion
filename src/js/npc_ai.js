/**
 * NPC_AI.js - Comprehensive NPC Artificial Intelligence Module
 * Inspired by Halo's AI systems but adapted for a peaceful MMO
 *
 * This module provides the "brain" for all NPC behavior, including:
 * - Perception system (environment, players, NPCs, events)
 * - Memory system (interactions, preferences, reputation)
 * - Goal/Drive system (archetype-specific motivations)
 * - Behavior tree (intelligent decision making)
 * - Daily schedules (time-based routines)
 * - Event reactions (contextual responses)
 * - Group dynamics (social behaviors)
 */

(function(exports) {
  'use strict';

  // ============================================================================
  // CONSTANTS & CONFIGURATION
  // ============================================================================

  var PERCEPTION_RADIUS = 25; // How far NPCs can "see"
  var INTERACTION_COOLDOWN = 30000; // 30 seconds before re-greeting same player
  var MEMORY_DECAY_RATE = 0.001; // Per tick familiarity decay
  var MAX_INTERACTIONS_REMEMBERED = 20;
  var MAX_EVENTS_REMEMBERED = 10;
  var ENERGY_DECAY_RATE = 0.05; // Per minute
  var ENERGY_REGEN_RATE = 0.2; // Per minute when resting
  var FAMILIARITY_GAIN = 5; // Points per interaction
  var FAMILIARITY_THRESHOLD_FRIENDLY = 25;
  var FAMILIARITY_THRESHOLD_CLOSE = 60;
  var GROUP_FORMATION_RADIUS = 15;
  var WORK_SATISFACTION_GAIN = 10;

  // ============================================================================
  // ARCHETYPE DRIVES - Core motivations for each NPC type
  // ============================================================================

  var ARCHETYPE_DRIVES = {
    gardener: {
      primary: 'tend_plants',
      secondary: 'explore_flora',
      social: 'share_harvest',
      rest: 'sit_in_garden',
      work_locations: ['gardens', 'wilds'],
      preferred_time: ['morning', 'afternoon'],
      weather_preference: 'rain', // Loves rain
    },
    builder: {
      primary: 'inspect_structures',
      secondary: 'gather_materials',
      social: 'discuss_plans',
      rest: 'sketch_designs',
      work_locations: ['agora', 'construction_sites'],
      preferred_time: ['morning', 'afternoon'],
      weather_preference: 'clear',
    },
    storyteller: {
      primary: 'visit_athenaeum',
      secondary: 'collect_stories',
      social: 'tell_stories',
      rest: 'write_journal',
      work_locations: ['athenaeum', 'agora'],
      preferred_time: ['afternoon', 'evening'],
      weather_preference: 'any',
    },
    merchant: {
      primary: 'tend_shop',
      secondary: 'acquire_goods',
      social: 'negotiate_trade',
      rest: 'count_inventory',
      work_locations: ['agora', 'marketplace'],
      preferred_time: ['morning', 'midday', 'afternoon'],
      weather_preference: 'clear',
    },
    explorer: {
      primary: 'explore_wilds',
      secondary: 'map_territory',
      social: 'share_discoveries',
      rest: 'study_maps',
      work_locations: ['wilds', 'mountains', 'coastline'],
      preferred_time: ['morning', 'afternoon'],
      weather_preference: 'any', // Explorers don't care
    },
    teacher: {
      primary: 'teach_lesson',
      secondary: 'research',
      social: 'mentor_individual',
      rest: 'read_texts',
      work_locations: ['athenaeum', 'agora'],
      preferred_time: ['morning', 'afternoon'],
      weather_preference: 'clear',
    },
    musician: {
      primary: 'perform',
      secondary: 'compose',
      social: 'jam_session',
      rest: 'tune_instrument',
      work_locations: ['agora', 'amphitheater', 'gardens'],
      preferred_time: ['evening', 'night'],
      weather_preference: 'clear',
    },
    healer: {
      primary: 'tend_wounded',
      secondary: 'gather_herbs',
      social: 'offer_comfort',
      rest: 'meditate',
      work_locations: ['gardens', 'healing_grove', 'agora'],
      preferred_time: ['morning', 'midday'],
      weather_preference: 'clear',
    },
    philosopher: {
      primary: 'contemplate',
      secondary: 'debate',
      social: 'discuss_ideas',
      rest: 'stargaze',
      work_locations: ['overlook', 'gardens', 'athenaeum'],
      preferred_time: ['afternoon', 'evening', 'night'],
      weather_preference: 'clear',
    },
    artist: {
      primary: 'create_art',
      secondary: 'find_inspiration',
      social: 'show_work',
      rest: 'observe_beauty',
      work_locations: ['gardens', 'overlook', 'coastline'],
      preferred_time: ['morning', 'afternoon', 'evening'],
      weather_preference: 'any', // Artists find beauty in all weather
    }
  };

  // ============================================================================
  // DAILY SCHEDULE - Time-based behavior modifiers
  // ============================================================================

  var DAILY_SCHEDULE = {
    dawn: {
      hours: [5, 7],
      activity: 'wake_stretch',
      energy_regen: 0.5,
      social_chance: 0.1,
      work_priority: 0.3,
    },
    morning: {
      hours: [7, 12],
      activity: 'primary_work',
      energy_regen: 0,
      social_chance: 0.3,
      work_priority: 1.0,
    },
    midday: {
      hours: [12, 14],
      activity: 'socialize_eat',
      energy_regen: 0.2,
      social_chance: 0.8,
      work_priority: 0.2,
    },
    afternoon: {
      hours: [14, 18],
      activity: 'secondary_work',
      energy_regen: 0,
      social_chance: 0.4,
      work_priority: 0.8,
    },
    evening: {
      hours: [18, 21],
      activity: 'socialize_music',
      energy_regen: 0,
      social_chance: 0.9,
      work_priority: 0.3,
    },
    night: {
      hours: [21, 5],
      activity: 'rest_stargaze',
      energy_regen: 1.0,
      social_chance: 0.2,
      work_priority: 0.1,
    }
  };

  // ============================================================================
  // CONTEXTUAL DIALOGUES - Archetype and context-specific dialogue
  // ============================================================================

  var CONTEXTUAL_DIALOGUES = {
    gardener: {
      greeting_first: [
        "Welcome to ZION! I'm {name}. The gardens are beautiful today.",
        "Hello there! I tend the gardens here. The flowers are in bloom!",
        "Greetings, friend! Have you seen the moonflowers by the pond?"
      ],
      greeting_familiar: [
        "Good to see you again! The {plant} I planted is growing well.",
        "Welcome back! Would you like to help me water the herbs?",
        "Ah, my friend returns! The garden remembers you."
      ],
      greeting_close: [
        "My dear friend! I saved some seeds for you.",
        "I was hoping you'd come by! Look at this new variety!",
        "Perfect timing! I need your opinion on these blooms."
      ],
      weather_rain: [
        "Perfect weather for the gardens!",
        "The flowers will love this rain.",
        "*dancing in the rain* Nature's gift!",
        "Rain means growth. Beautiful, isn't it?"
      ],
      weather_snow: [
        "Even in snow, life persists. See these hardy plants?",
        "Winter gardens have their own beauty.",
        "The frost makes crystals on the leaves. Magical."
      ],
      weather_clear: [
        "What a beautiful day to tend the garden.",
        "The sunshine makes everything grow.",
        "Perfect weather for planting!"
      ],
      time_morning: [
        "Early bird! The morning dew is perfect for planting.",
        "Good morning! The world is waking up.",
        "*trimming plants* Best time to work the soil."
      ],
      time_evening: [
        "The sunset colors are inspiring today.",
        "Evening light makes the flowers glow.",
        "Time to water before nightfall."
      ],
      time_night: [
        "The night-blooming flowers are opening. Come see!",
        "Starlight on petals... there's nothing quite like it.",
        "The garden sleeps, but I'm watching over it."
      ],
      player_building: [
        "That's looking great! Need any plants to decorate?",
        "Beautiful structure! I can bring vines to accent it.",
        "A gardener appreciates good craftsmanship!"
      ],
      player_harvesting: [
        "Good technique! Try the moonflowers next.",
        "Gentle hands. The plants appreciate that.",
        "Would you like to know the best time to harvest sage?"
      ],
      working: [
        "*carefully tends the soil*",
        "*hums while watering*",
        "*examining leaves for health*",
        "*pruning with precision*"
      ],
      idle_observation: [
        "Those clouds remind me of cotton flowers.",
        "I think I see a new bloom over there!",
        "The bees are busy today. Good sign.",
        "Every plant has a story, if you listen."
      ],
      near_water: [
        "The pond keeps everything lush.",
        "Water is life.",
        "I come here to refill my watering can."
      ],
      group_forming: [
        "Should we start a community garden?",
        "Many hands make gardens grow!",
        "I can teach you all about composting!"
      ]
    },

    builder: {
      greeting_first: [
        "Greetings! I'm {name}, master builder. Always working on something new!",
        "Hello! Notice the archways? That's my work.",
        "Welcome! A builder's work is never done, but I love every moment."
      ],
      greeting_familiar: [
        "Back again? Good! I want your opinion on this design.",
        "Ah, perfect timing! Need an extra pair of hands.",
        "Good to see you! The foundation we discussed is complete."
      ],
      greeting_close: [
        "My friend! I've been sketching ideas all morning. Look!",
        "I knew you'd come! This project needs your creative eye.",
        "Finally! No one appreciates structure like you do."
      ],
      weather_rain: [
        "Rain delays construction, but gives time to plan.",
        "*covering materials* We'll resume when it clears.",
        "Indoor projects today, I think."
      ],
      weather_clear: [
        "Perfect building weather!",
        "Clear skies mean we can work on the roof.",
        "Foundation work requires dry ground. Excellent!"
      ],
      time_morning: [
        "Morning! Best light for measuring and cutting.",
        "Early start means more progress!",
        "*reviewing blueprints* Let's begin."
      ],
      time_evening: [
        "Golden hour is perfect for admiring finished work.",
        "One more stone before sunset...",
        "Time to clean the tools and plan tomorrow."
      ],
      player_building: [
        "Excellent work! May I suggest reinforcing that corner?",
        "A fellow builder! Your technique is impressive.",
        "Strong foundation! That will last generations.",
        "Mind if I watch? I always learn from others."
      ],
      working: [
        "*measuring twice, cutting once*",
        "*carefully placing stones*",
        "*testing structural integrity*",
        "*sketching improvements*"
      ],
      idle_observation: [
        "That column's proportions are perfect.",
        "I wonder if we could build a bridge there...",
        "Every structure tells the story of its builder.",
        "The ancient ruins inspire me. Such craftsmanship!"
      ],
      group_forming: [
        "A building project needs teamwork!",
        "Together we can create something magnificent!",
        "Let me show you all the proper techniques."
      ]
    },

    storyteller: {
      greeting_first: [
        "Ah, a new face! I'm {name}. Every person has a story worth telling.",
        "Welcome, traveler! Sit, and I'll share a tale.",
        "Greetings! I collect stories. Perhaps you have one to share?"
      ],
      greeting_familiar: [
        "Welcome back! Ready for another tale?",
        "Ah, you've returned! The story continues...",
        "My friend! I've learned a new legend since we last spoke."
      ],
      greeting_close: [
        "My dear friend! Your own story grows richer each day.",
        "I've been saving the best tales for your return!",
        "Sit close. This story is for you alone."
      ],
      weather_rain: [
        "Rain is perfect for storytelling by the fire.",
        "The patter of rain makes a nice backdrop for tales.",
        "Stormy weather brings stormy stories!"
      ],
      weather_clear: [
        "Perfect evening for tales under the stars.",
        "Clear skies, clear minds, clear stories.",
        "Sunshine inspires lighter tales."
      ],
      time_evening: [
        "Evening is when the best stories are told.",
        "Gather 'round! The shadows grow, and so do legends.",
        "*preparing to perform* The perfect hour for storytelling."
      ],
      time_night: [
        "By starlight, I'll tell you of ancient wonders...",
        "Night brings out the mysterious tales.",
        "The darkness makes every story more vivid."
      ],
      working: [
        "*gesturing dramatically*",
        "*voice rising and falling with emotion*",
        "*scribbling notes*",
        "*practicing delivery*"
      ],
      idle_observation: [
        "Every corner of ZION has a story.",
        "I wonder what tales these stones could tell...",
        "That merchant looks like they have stories from afar.",
        "History is all around us, waiting to be discovered."
      ],
      group_forming: [
        "Gather close! I have a tale for you all!",
        "Stories are best shared with many ears!",
        "Come, friends! Let me tell you of heroes past!"
      ]
    },

    merchant: {
      greeting_first: [
        "Welcome to my stall! I'm {name}. Best goods in ZION!",
        "Greetings, customer! See anything you like?",
        "Hello there! Fair prices and quality goods, guaranteed!"
      ],
      greeting_familiar: [
        "Ah, my returning customer! I have something special today.",
        "Welcome back! Your patronage is appreciated!",
        "Good to see you! I saved this item with you in mind."
      ],
      greeting_close: [
        "My valued friend! For you, a special discount.",
        "Excellent timing! I just received rare goods!",
        "My dear patron! Let me show you the finest selections."
      ],
      weather_rain: [
        "*covering goods* Quick, before they get wet!",
        "Rain is bad for business, good for discounts!",
        "Come inside my tent! Can't let merchandise get soaked."
      ],
      weather_clear: [
        "Perfect market day!",
        "Sunshine brings customers!",
        "Business is good when the weather cooperates!"
      ],
      time_morning: [
        "*setting up stall* Early bird gets the best deals!",
        "Morning! Fresh inventory just arrived!",
        "Opening for business! Come see!"
      ],
      time_midday: [
        "Busy market hour! Step right up!",
        "Peak time for trading!",
        "The Agora is alive with commerce!"
      ],
      time_evening: [
        "Last chance for today's deals!",
        "Closing soon, but still open for you!",
        "*packing up* Tomorrow I'll have even better goods!"
      ],
      working: [
        "*arranging wares attractively*",
        "*calculating prices*",
        "*polishing merchandise*",
        "*calling out to passersby*"
      ],
      idle_observation: [
        "I wonder what goods that traveler carries...",
        "Business is steady today.",
        "Quality over quantity, always.",
        "A merchant's eye never rests."
      ],
      group_forming: [
        "Fellow merchants! Let's discuss trade routes!",
        "Perhaps we could organize a market festival?",
        "The more merchants, the livelier the market!"
      ]
    },

    explorer: {
      greeting_first: [
        "Ho there! I'm {name}, explorer of ZION's wilds!",
        "Greetings, friend! Just returned from the frontier.",
        "Well met! These lands hold countless secrets."
      ],
      greeting_familiar: [
        "Back from your own explorations?",
        "Good to see you! I've mapped new territories!",
        "Ah! Want to hear about what I discovered?"
      ],
      greeting_close: [
        "My fellow adventurer! Let's explore together!",
        "I've been hoping you'd come! I found something amazing!",
        "Perfect! I need someone brave to witness this discovery."
      ],
      weather_rain: [
        "Rain won't stop an explorer!",
        "*pulling up hood* Weather adds to the adventure!",
        "Rain reveals hidden streams and paths."
      ],
      weather_snow: [
        "Snow makes tracking easier!",
        "Winter landscapes are breathtaking.",
        "The wilds are beautiful in every season."
      ],
      weather_clear: [
        "Perfect day for exploration!",
        "Clear weather means good visibility!",
        "I can see for miles today!"
      ],
      time_morning: [
        "Dawn is the best time to spot wildlife!",
        "*checking compass* Time to head out!",
        "Early start, more ground to cover!"
      ],
      working: [
        "*scanning the horizon*",
        "*making notes on a map*",
        "*examining interesting features*",
        "*testing the ground*"
      ],
      idle_observation: [
        "I wonder what's beyond those mountains...",
        "Every horizon calls to be explored.",
        "The frontier is never fully mapped.",
        "Adventure is everywhere if you look."
      ],
      group_forming: [
        "Expedition party forming! Who's brave enough?",
        "Safety in numbers when exploring!",
        "Let's chart the unknown together!"
      ]
    },

    teacher: {
      greeting_first: [
        "Welcome, student! I'm {name}. Knowledge is meant to be shared.",
        "Greetings! Always happy to see eager minds.",
        "Hello! What would you like to learn today?"
      ],
      greeting_familiar: [
        "My returning student! Ready for the next lesson?",
        "Excellent! Your progress has been remarkable.",
        "Welcome back! I've prepared advanced materials."
      ],
      greeting_close: [
        "My star pupil! You continue to impress me.",
        "I've been researching topics just for you!",
        "Your dedication to learning honors us both."
      ],
      weather_clear: [
        "Beautiful day for outdoor lessons!",
        "Clear minds match clear skies.",
        "Perfect weather for demonstrations!"
      ],
      time_morning: [
        "Morning minds are fresh and ready!",
        "Let's begin today's lesson.",
        "*preparing teaching materials* Good morning!"
      ],
      time_afternoon: [
        "Afternoon is perfect for practical exercises.",
        "Review time! Let's test what you've learned.",
        "Advanced topics require afternoon focus."
      ],
      working: [
        "*explaining with gestures*",
        "*writing on a tablet*",
        "*demonstrating technique*",
        "*patiently answering questions*"
      ],
      idle_observation: [
        "Every moment is a chance to learn.",
        "I should research that further...",
        "Knowledge builds upon knowledge.",
        "Teaching is the highest form of learning."
      ],
      group_forming: [
        "Class is in session! Gather around!",
        "The more students, the richer the discussion!",
        "Let's form a study circle!"
      ]
    },

    musician: {
      greeting_first: [
        "Hello! I'm {name}. Music is the soul of ZION!",
        "*strumming* Welcome, friend! Care for a tune?",
        "Greetings! The world is better with music."
      ],
      greeting_familiar: [
        "My audience returns! Requests?",
        "*playing a familiar melody* This one's for you!",
        "Welcome back! I've learned new songs!"
      ],
      greeting_close: [
        "My friend! Let's make music together!",
        "I composed something special for you!",
        "*starting your favorite song* I remember what you love."
      ],
      weather_rain: [
        "Rain has its own rhythm. Listen...",
        "Nature's percussion! *tapping along*",
        "*playing under shelter* Rain makes everything melancholy and beautiful."
      ],
      weather_clear: [
        "Perfect night for performance!",
        "Clear acoustics tonight!",
        "The stars will be my audience!"
      ],
      time_evening: [
        "Evening is when music truly shines!",
        "*tuning instrument* Almost time to perform!",
        "Gather 'round! Concert begins at sunset!"
      ],
      time_night: [
        "Night music has special magic.",
        "*playing softly* Lullabies for the world.",
        "The stars dance to midnight melodies."
      ],
      working: [
        "*playing a complex melody*",
        "*humming while composing*",
        "*adjusting instrument strings*",
        "*keeping rhythm*"
      ],
      idle_observation: [
        "I hear music in everything...",
        "That bird's song would make a lovely motif.",
        "The wind through the trees, nature's orchestra.",
        "Every sound is part of the symphony."
      ],
      group_forming: [
        "Musicians! Jam session time!",
        "Let's create harmony together!",
        "Audience gathering! Time to perform!"
      ]
    },

    healer: {
      greeting_first: [
        "Welcome, child. I'm {name}. Are you well?",
        "Greetings, friend. Peace and health to you.",
        "Hello! I'm here if you need healing or herbs."
      ],
      greeting_familiar: [
        "Good to see you healthy and strong!",
        "Welcome back! How are you feeling?",
        "Ah, your energy looks much better!"
      ],
      greeting_close: [
        "My dear friend, you bring light with you.",
        "I'm always happy to see your face.",
        "Come, sit. Let's talk and restore spirits."
      ],
      weather_rain: [
        "Rain cleanses and renews.",
        "Good weather for gathering medicinal mushrooms!",
        "The earth drinks, and we all benefit."
      ],
      weather_clear: [
        "Sunshine is the best medicine.",
        "Perfect day for herb drying!",
        "Clear weather, clear health."
      ],
      time_morning: [
        "Morning energy is vital and strong.",
        "*gathering herbs* Dawn dew enhances potency.",
        "Begin the day with wellness."
      ],
      working: [
        "*grinding herbs gently*",
        "*meditating quietly*",
        "*examining plants carefully*",
        "*offering soothing words*"
      ],
      idle_observation: [
        "Balance is the key to health.",
        "Every plant has healing properties.",
        "The body knows how to heal itself.",
        "Wellness is a journey, not a destination."
      ],
      group_forming: [
        "Gather, friends. Let's share wellness practices.",
        "Healing circles amplify positive energy!",
        "Together we can create community health."
      ]
    },

    philosopher: {
      greeting_first: [
        "Greetings, seeker. I'm {name}. What questions trouble your mind?",
        "Welcome! I ponder the great mysteries here.",
        "Hello, friend. Care to contemplate existence?"
      ],
      greeting_familiar: [
        "Ah, you return! Have you been thinking about our discussion?",
        "Welcome back! I've had new insights.",
        "Good to see you! Ready for deeper questions?"
      ],
      greeting_close: [
        "My fellow thinker! Let's unravel mysteries together!",
        "I've been eager to hear your perspective!",
        "Two minds together see truths one alone cannot."
      ],
      weather_rain: [
        "Rain reminds us that change is constant.",
        "Each drop is unique, yet all are water. Curious.",
        "What is rain but the sky thinking aloud?"
      ],
      weather_clear: [
        "Clarity without matches clarity within.",
        "The cosmos reveals itself on clear nights.",
        "In clear skies, we see infinity."
      ],
      time_evening: [
        "Evening brings contemplative moods.",
        "As the sun sets, different truths emerge.",
        "*watching sunset* Transitions teach us much."
      ],
      time_night: [
        "Under stars, we remember how small we are.",
        "*stargazing* Each light is a sun with its own worlds...",
        "Night questions are the deepest questions."
      ],
      working: [
        "*sitting in deep thought*",
        "*sketching cosmic diagrams*",
        "*debating with self*",
        "*observing patterns*"
      ],
      idle_observation: [
        "Why does anything exist rather than nothing?",
        "Patterns repeat at every scale...",
        "What is consciousness but the universe observing itself?",
        "Every answer births new questions."
      ],
      group_forming: [
        "Let's form a discourse circle!",
        "Many perspectives illuminate truth!",
        "Philosophy thrives in dialogue!"
      ]
    },

    artist: {
      greeting_first: [
        "Hello! I'm {name}. I try to capture ZION's beauty.",
        "Welcome! An artist's work is never done.",
        "Greetings! Every vista here inspires creation."
      ],
      greeting_familiar: [
        "Back to see the progress?",
        "Your visits always bring fresh perspective!",
        "Ah! I value your aesthetic sense!"
      ],
      greeting_close: [
        "My muse has returned!",
        "I've created something I need you to see!",
        "Your appreciation means everything to me."
      ],
      weather_rain: [
        "Rain creates such interesting textures!",
        "*capturing the mood* Melancholy is beautiful too.",
        "The colors deepen in rain. Magnificent!"
      ],
      weather_snow: [
        "Winter palettes are subtle and profound.",
        "*working quickly* Snow won't last, must capture it!",
        "White on white, infinite shades..."
      ],
      weather_clear: [
        "Perfect light for painting!",
        "The colors are so vibrant today!",
        "Clear skies show every hue."
      ],
      time_morning: [
        "Morning light is soft and golden.",
        "*sketching quickly* Dawn never lasts long enough!",
        "The world is fresh and new each morning."
      ],
      time_evening: [
        "Golden hour! Every artist's favorite time!",
        "*painting frantically* The colors! The colors!",
        "Sunset is fleeting. Must work fast."
      ],
      working: [
        "*applying paint with care*",
        "*stepping back to assess*",
        "*mixing colors thoughtfully*",
        "*lost in creative flow*"
      ],
      idle_observation: [
        "Beauty is everywhere, if you look.",
        "That composition is perfect...",
        "Color, light, form... all dancing together.",
        "Art is seeing what others overlook."
      ],
      group_forming: [
        "Artists! Let's share techniques!",
        "Every artist sees differently. Let's compare!",
        "Collective creativity sparks innovation!"
      ]
    }
  };

  // ============================================================================
  // ZONE-SPECIFIC DIALOGUES (shared across archetypes)
  // ============================================================================

  var ZONE_DIALOGUES = {
    nexus: [
      "The Nexus hums with energy today.",
      "Everyone passes through here eventually.",
      "The heart of ZION beats strong.",
      "New faces arrive every day. The world grows.",
      "I love the way all paths converge here."
    ],
    gardens: [
      "The gardens are especially beautiful today.",
      "Can you smell the jasmine? Heavenly.",
      "Everything grows so well here.",
      "The gardeners have been busy. Look at those blooms!",
      "I always feel peaceful in the gardens."
    ],
    wilds: [
      "Stay alert out here. The wilds are unpredictable.",
      "I've heard there are rare plants deep in these woods.",
      "The frontier calls to the adventurous.",
      "Few venture this far. You're brave.",
      "The wilds hold secrets waiting to be found."
    ],
    athenaeum: [
      "Knowledge fills these halls.",
      "The scrolls here contain ancient wisdom.",
      "Quiet, please. Some are studying.",
      "Have you read the founding texts? Fascinating.",
      "Learning never ends in the Athenaeum."
    ],
    studio: [
      "Creativity fills the air here.",
      "I love watching the artists at work.",
      "The Studio inspires everyone who enters.",
      "Art gives meaning to our world.",
      "Have you seen the latest sculptures?"
    ],
    agora: [
      "The market is bustling today!",
      "Good deals to be found if you look.",
      "The Agora never sleeps.",
      "Trade is the lifeblood of any community.",
      "I heard a merchant just got rare goods."
    ],
    commons: [
      "The Commons feel like home.",
      "Community is what we build here.",
      "I love what everyone has contributed.",
      "The workshops are always busy.",
      "Building together is building forever."
    ],
    arena: [
      "The Arena pulses with competitive spirit!",
      "Friendly competition makes us all stronger.",
      "Champions are made here!",
      "The crowd's energy is incredible.",
      "May the best challenger win!"
    ]
  };

  // ============================================================================
  // INTER-ARCHETYPE REACTION DIALOGUES
  // ============================================================================

  var ARCHETYPE_REACTIONS = {
    gardener: {
      musician: "Your music makes my flowers bloom brighter!",
      builder: "Could you build a trellis for my vines?",
      healer: "I have herbs that might help your remedies.",
      artist: "Please paint my garden someday!",
      merchant: "I have fresh produce for your stall.",
      storyteller: "The oldest oak has stories to tell...",
      explorer: "Did you find any rare seeds on your travels?",
      teacher: "Will you teach the children about botany?",
      philosopher: "What do you think plants dream about?"
    },
    builder: {
      gardener: "Plant something by my new building?",
      musician: "I need good acoustics in this hall I'm building.",
      healer: "I'm building a new healing pavilion.",
      artist: "Want to design the facade?",
      merchant: "I need materials. What do you have?",
      storyteller: "This wall needs an engraved legend.",
      explorer: "Found any interesting stone quarries?",
      teacher: "I could build a lecture hall for you.",
      philosopher: "Is the perfect building possible?"
    },
    storyteller: {
      gardener: "Tell me the legend of the first seed.",
      musician: "Would you accompany my tale with music?",
      builder: "Every building you make is a story in stone.",
      healer: "Healing stories are the most powerful.",
      artist: "Illustrate my latest tale?",
      merchant: "Stories from distant lands to trade?",
      explorer: "You must have incredible tales to share!",
      teacher: "Let's teach through storytelling!",
      philosopher: "What is truth in a story?"
    },
    merchant: {
      gardener: "Fresh flowers always sell well.",
      musician: "You draw crowds! Set up near my stall?",
      builder: "I have timber and nails you'll need.",
      healer: "Healing potions sell for good Spark!",
      artist: "Your art would fetch a premium.",
      storyteller: "Stories attract customers. Perfect partnership!",
      explorer: "Bring me exotic goods from your travels!",
      teacher: "Education about quality helps sales.",
      philosopher: "What is the true value of Spark?"
    },
    explorer: {
      gardener: "I found strange plants in the deep wilds!",
      musician: "The acoustics in that cave were amazing.",
      builder: "There are ancient ruins to the north!",
      healer: "I found rare medicinal moss on the cliff face.",
      artist: "The vista from the eastern ridge is breathtaking.",
      storyteller: "I discovered something the legends speak of!",
      merchant: "I've got rare finds from the frontier.",
      teacher: "The wilds teach lessons no book can.",
      philosopher: "Exploration is philosophy in motion."
    },
    teacher: {
      gardener: "Botany class begins with your garden.",
      musician: "Music theory is fascinating, isn't it?",
      builder: "Architecture has much to teach us.",
      healer: "Medical knowledge saves lives.",
      artist: "Art history is endlessly rich.",
      storyteller: "Oral tradition preserves culture.",
      merchant: "Economics drives civilization.",
      explorer: "Geography shapes destiny.",
      philosopher: "Every discipline leads to the same questions."
    },
    musician: {
      gardener: "Your garden hums with life—I'll write it a song!",
      builder: "The rhythm of your hammer inspires me.",
      healer: "Healing harmonics are real. I've studied them.",
      artist: "Music and art—the twin souls of creation.",
      storyteller: "Let me compose a soundtrack for your tale!",
      merchant: "I'll play for customers if you share the Spark!",
      explorer: "Every land has its own song waiting to be heard.",
      teacher: "Music is the universal language, yes?",
      philosopher: "What is sound, really, but structured silence?"
    },
    healer: {
      gardener: "Your herbs are essential to my practice.",
      musician: "Music heals wounds no salve can reach.",
      builder: "A healthy body builds a strong world.",
      artist: "Beauty is healing in visual form.",
      storyteller: "Stories can heal the soul.",
      merchant: "I need supplies—got any healing crystals?",
      explorer: "Stay safe out there. I'll be here if you're hurt.",
      teacher: "Prevention is the best medicine.",
      philosopher: "What does it mean to be truly well?"
    },
    philosopher: {
      gardener: "Growth is the fundamental urge of all things.",
      musician: "If music is math made beautiful, what is beauty?",
      builder: "We build to defy entropy. A noble endeavor.",
      healer: "Is perfect health the absence of illness, or something more?",
      artist: "Does art reveal truth or create it?",
      storyteller: "Stories shape how we see reality itself.",
      merchant: "Value is a collective hallucination, isn't it?",
      explorer: "The greatest journey is inward.",
      teacher: "Can we truly teach, or merely point the way?"
    },
    artist: {
      gardener: "Nature is the greatest artist.",
      musician: "Our arts are siblings—let's collaborate!",
      builder: "Architecture is art that shelters.",
      healer: "I want to paint the act of healing.",
      storyteller: "Every story paints pictures in the mind.",
      merchant: "Does commerce diminish art or elevate it?",
      explorer: "The landscapes you describe—I must see them!",
      teacher: "Teach me that technique you mentioned.",
      philosopher: "Art is philosophy made visible."
    }
  };

  // ============================================================================
  // QUEST HOOK DIALOGUES (NPCs hint at available tasks)
  // ============================================================================

  var QUEST_HOOKS = {
    gardener: [
      "I could use help gathering sunflowers for the festival...",
      "The moonflower seeds need planting. Know anyone interested?",
      "A rare bloom was spotted in the Wilds. I wish I could go look...",
      "My herb garden needs tending while I research new species."
    ],
    builder: [
      "The bridge near the commons needs repair. Volunteers?",
      "I'm designing a new gazebo but need special stone...",
      "Someone left materials scattered at the construction site.",
      "The old tower could use reinforcement. Big project, good Spark."
    ],
    storyteller: [
      "I'm collecting tales from each zone. Want to help gather them?",
      "A lost manuscript was last seen in the Athenaeum depths...",
      "The founding stories are fading from memory. Help preserve them?",
      "I need someone to interview the elder NPCs for my chronicle."
    ],
    merchant: [
      "I'm missing a delivery from the gardens. Could you check?",
      "A rare gem went missing from my inventory...",
      "I need someone to scout prices in the other zones.",
      "Big trade deal coming up. I need rare materials."
    ],
    explorer: [
      "There's an unmapped cave system I've been wanting to explore.",
      "Strange lights in the wilds at night—want to investigate?",
      "The ancient markers near the arena need documenting.",
      "I found tracks of something unusual. Help me follow them?"
    ],
    teacher: [
      "I need specimens from each zone for my natural history class.",
      "Can you deliver these lesson scrolls to students in the commons?",
      "My research requires a crystal from the studio caves.",
      "Help me set up the outdoor classroom by the gardens."
    ],
    musician: [
      "I'm organizing a concert but need instruments gathered.",
      "The acoustics stone in the arena was chipped. Find a replacement?",
      "I hear the wilds have singing crystals. Bring me one!",
      "Help me spread word of tonight's performance to all zones."
    ],
    healer: [
      "I'm running low on moonpetal herbs. The gardens might have some.",
      "A traveler fell ill—I need crystal dust from the studio.",
      "Help me set up healing stations across the zones.",
      "Rare medicinal moss grows on the arena stones. Can you gather some?"
    ],
    philosopher: [
      "Debate me on the nature of ZION. I'll reward good arguments!",
      "Find the three wisdom stones hidden across the zones.",
      "Carry this sealed question to the storyteller and bring back the answer.",
      "I seek the meaning of the ancient symbols on the obelisk."
    ],
    artist: [
      "I need pigments from rare flowers in the gardens.",
      "Inspiration! Go sketch the view from three different zones.",
      "The mural in the commons needs restoration help.",
      "Find the legendary canvas stone in the wilds for me."
    ]
  };

  // ============================================================================
  // MOOD SYSTEM
  // ============================================================================

  var MOODS = ['content', 'excited', 'contemplative', 'social', 'tired', 'focused', 'curious', 'peaceful'];

  function calculateMood(memory, perception, timeOfDay) {
    var energy = memory.energy || 100;
    var schedule = getSchedulePeriod(perception.timeOfDay);
    var recentSocial = memory.interactions.filter(function(i) {
      return Date.now() - i.timestamp < 300000; // Last 5 minutes
    }).length;

    // Tired if low energy
    if (energy < 30) return 'tired';

    // Social during high social chance periods
    if (schedule.social_chance > 0.7 && recentSocial > 0) return 'social';

    // Excited if recently witnessed exciting event
    var recentExciting = memory.witnessedEvents.filter(function(e) {
      return e.type === 'portal_activation' || e.type === 'group_forming';
    }).length > 0;
    if (recentExciting) return 'excited';

    // Contemplative at night or evening for certain archetypes
    if ((timeOfDay === 'evening' || timeOfDay === 'night') &&
        (memory.archetype === 'philosopher' || memory.archetype === 'artist')) {
      return 'contemplative';
    }

    // Focused during work hours
    if (schedule.work_priority > 0.7) return 'focused';

    // Curious if explorer or in new location
    if (memory.archetype === 'explorer' || perception.recentEvents.some(function(e) {
      return e.type === 'new_discovery';
    })) {
      return 'curious';
    }

    // Peaceful in gardens or near water
    if (perception.currentZone === 'gardens' || perception.nearWater) {
      return 'peaceful';
    }

    return 'content';
  }

  // ============================================================================
  // PERCEPTION SYSTEM
  // ============================================================================

  function perceive(npc, worldState) {
    var perception = {
      nearbyPlayers: [],
      nearbyNPCs: [],
      weather: worldState.weather || 'clear',
      timeOfDay: worldState.timeOfDay || 'midday',
      currentZone: worldState.currentZone || 'agora',
      recentEvents: worldState.recentEvents || [],
      threats: [],
      nearWater: worldState.nearWater || false,
      inShelter: worldState.inShelter || false,
      groupsForming: [],
      interestingObjects: []
    };

    // Detect nearby players
    if (worldState.players) {
      worldState.players.forEach(function(player) {
        var dx = player.x - npc.x;
        var dz = player.z - npc.z;
        var distance = Math.sqrt(dx * dx + dz * dz);

        if (distance <= PERCEPTION_RADIUS) {
          perception.nearbyPlayers.push({
            id: player.id,
            distance: distance,
            direction: { x: dx, z: dz },
            lastAction: player.lastAction,
            isBuilding: player.isBuilding,
            isHarvesting: player.isHarvesting
          });
        }
      });
    }

    // Detect nearby NPCs
    if (worldState.npcs) {
      worldState.npcs.forEach(function(otherNpc) {
        if (otherNpc.id === npc.id) return;

        var dx = otherNpc.x - npc.x;
        var dz = otherNpc.z - npc.z;
        var distance = Math.sqrt(dx * dx + dz * dz);

        if (distance <= PERCEPTION_RADIUS) {
          perception.nearbyNPCs.push({
            id: otherNpc.id,
            distance: distance,
            direction: { x: dx, z: dz },
            archetype: otherNpc.archetype,
            currentActivity: otherNpc.currentActivity,
            mood: otherNpc.mood
          });
        }
      });
    }

    // Detect groups forming
    var npcClusters = {};
    perception.nearbyNPCs.forEach(function(nearby) {
      if (nearby.distance <= GROUP_FORMATION_RADIUS) {
        var key = Math.floor(nearby.direction.x / 5) + '_' + Math.floor(nearby.direction.z / 5);
        if (!npcClusters[key]) npcClusters[key] = [];
        npcClusters[key].push(nearby);
      }
    });

    Object.keys(npcClusters).forEach(function(key) {
      if (npcClusters[key].length >= 2) {
        perception.groupsForming.push({
          members: npcClusters[key],
          location: key,
          size: npcClusters[key].length
        });
      }
    });

    return perception;
  }

  // ============================================================================
  // MEMORY SYSTEM
  // ============================================================================

  function createMemory(archetype) {
    return {
      archetype: archetype,
      interactions: [],
      favorites: {
        location: null,
        npcFriends: []
      },
      playerFamiliarity: {},
      witnessedEvents: [],
      lastGreeted: {},
      usedDialogues: [],
      mood: 'content',
      energy: 100,
      satisfaction: 50,
      lastWorkTime: 0,
      lastRestTime: 0,
      currentGoal: null,
      groupMembership: null
    };
  }

  function updateMemory(memory, deltaTime) {
    // Decay familiarity
    Object.keys(memory.playerFamiliarity).forEach(function(playerId) {
      memory.playerFamiliarity[playerId] -= MEMORY_DECAY_RATE * deltaTime;
      if (memory.playerFamiliarity[playerId] <= 0) {
        delete memory.playerFamiliarity[playerId];
      }
    });

    // Decay energy
    var schedule = getSchedulePeriod(memory.currentTimeOfDay || 'midday');
    if (schedule.energy_regen > 0) {
      memory.energy = Math.min(100, memory.energy + ENERGY_REGEN_RATE * (deltaTime / 60000));
    } else {
      memory.energy = Math.max(0, memory.energy - ENERGY_DECAY_RATE * (deltaTime / 60000));
    }

    // Trim old interactions
    if (memory.interactions.length > MAX_INTERACTIONS_REMEMBERED) {
      memory.interactions = memory.interactions.slice(-MAX_INTERACTIONS_REMEMBERED);
    }

    // Trim old events
    if (memory.witnessedEvents.length > MAX_EVENTS_REMEMBERED) {
      memory.witnessedEvents = memory.witnessedEvents.slice(-MAX_EVENTS_REMEMBERED);
    }

    // Reset used dialogues periodically (every 5 minutes)
    if (!memory.lastDialogueReset || Date.now() - memory.lastDialogueReset > 300000) {
      memory.usedDialogues = [];
      memory.lastDialogueReset = Date.now();
    }
  }

  function recordInteraction(memory, playerId, type, response) {
    memory.interactions.push({
      playerId: playerId,
      type: type,
      timestamp: Date.now(),
      response: response
    });

    // Increase familiarity
    if (!memory.playerFamiliarity[playerId]) {
      memory.playerFamiliarity[playerId] = 0;
    }
    memory.playerFamiliarity[playerId] += FAMILIARITY_GAIN;
  }

  function recordEvent(memory, eventType, description) {
    memory.witnessedEvents.push({
      type: eventType,
      description: description,
      timestamp: Date.now()
    });
  }

  // ============================================================================
  // SCHEDULE HELPERS
  // ============================================================================

  function getSchedulePeriod(timeOfDay) {
    return DAILY_SCHEDULE[timeOfDay] || DAILY_SCHEDULE.midday;
  }

  function getCurrentHour(worldState) {
    return worldState.currentHour || 12;
  }

  // ============================================================================
  // DIALOGUE SYSTEM
  // ============================================================================

  function getDialogue(memory, context, npcName) {
    var archetype = memory.archetype;
    var categoryKey = context.category || 'idle_observation';

    // Handle special dynamic categories
    if (categoryKey === 'archetype_reaction') {
      var reactions = ARCHETYPE_REACTIONS[archetype];
      if (reactions && context.targetArchetype && reactions[context.targetArchetype]) {
        var dialogue = reactions[context.targetArchetype];
        return dialogue.replace('{name}', npcName);
      }
      categoryKey = 'idle_observation'; // Fallback
    }

    if (categoryKey === 'zone_observation') {
      var zoneDlgs = ZONE_DIALOGUES[context.zone];
      if (zoneDlgs && zoneDlgs.length > 0) {
        return zoneDlgs[Math.floor(Math.random() * zoneDlgs.length)];
      }
      categoryKey = 'idle_observation'; // Fallback
    }

    if (categoryKey === 'quest_hook') {
      var hooks = QUEST_HOOKS[archetype];
      if (hooks && hooks.length > 0) {
        return hooks[Math.floor(Math.random() * hooks.length)];
      }
      categoryKey = 'idle_observation'; // Fallback
    }

    var dialogues = CONTEXTUAL_DIALOGUES[archetype];
    if (!dialogues) return null;

    var category = dialogues[categoryKey];
    if (!category || category.length === 0) {
      category = dialogues.idle_observation || [];
    }

    if (category.length === 0) return null;

    // Filter out recently used dialogues
    var availableDialogues = category.filter(function(_, index) {
      return memory.usedDialogues.indexOf(categoryKey + '_' + index) === -1;
    });

    if (availableDialogues.length === 0) {
      availableDialogues = category; // Reset if all used
      memory.usedDialogues = [];
    }

    // Pick random from available
    var dialogue = availableDialogues[Math.floor(Math.random() * availableDialogues.length)];
    var index = category.indexOf(dialogue);
    memory.usedDialogues.push(categoryKey + '_' + index);

    // Replace placeholders
    dialogue = dialogue.replace('{name}', npcName);
    dialogue = dialogue.replace('{plant}', ['roses', 'lilies', 'moonflowers', 'sage'][Math.floor(Math.random() * 4)]);

    return dialogue;
  }

  function getDialogueContext(memory, perception, npc) {
    var playerId = perception.nearbyPlayers.length > 0 ? perception.nearbyPlayers[0].id : null;
    var familiarity = playerId ? (memory.playerFamiliarity[playerId] || 0) : 0;

    // Determine greeting level
    if (playerId && !memory.lastGreeted[playerId]) {
      return { category: 'greeting_first' };
    } else if (familiarity >= FAMILIARITY_THRESHOLD_CLOSE) {
      return { category: 'greeting_close' };
    } else if (familiarity >= FAMILIARITY_THRESHOLD_FRIENDLY) {
      return { category: 'greeting_familiar' };
    }

    // Weather-based
    if (perception.weather === 'rain') {
      return { category: 'weather_rain' };
    } else if (perception.weather === 'snow') {
      return { category: 'weather_snow' };
    } else if (perception.weather === 'clear') {
      return { category: 'weather_clear' };
    }

    // Time-based
    if (perception.timeOfDay === 'morning' || perception.timeOfDay === 'dawn') {
      return { category: 'time_morning' };
    } else if (perception.timeOfDay === 'evening') {
      return { category: 'time_evening' };
    } else if (perception.timeOfDay === 'night') {
      return { category: 'time_night' };
    }

    // Player action-based
    if (perception.nearbyPlayers.length > 0) {
      var player = perception.nearbyPlayers[0];
      if (player.isBuilding) {
        return { category: 'player_building' };
      } else if (player.isHarvesting) {
        return { category: 'player_harvesting' };
      }
    }

    // Inter-archetype reaction (NPC meets another archetype NPC)
    if (perception.nearbyNPCs.length > 0 && Math.random() < 0.25) {
      var nearbyNpc = perception.nearbyNPCs[0];
      if (nearbyNpc.archetype && nearbyNpc.archetype !== memory.archetype) {
        return { category: 'archetype_reaction', targetArchetype: nearbyNpc.archetype };
      }
    }

    // Zone-specific observations
    if (perception.currentZone && Math.random() < 0.3) {
      return { category: 'zone_observation', zone: perception.currentZone };
    }

    // Quest hook (occasionally hint at available tasks)
    if (Math.random() < 0.08) {
      return { category: 'quest_hook' };
    }

    // Location-based
    if (perception.nearWater) {
      return { category: 'near_water' };
    }

    // Group-based
    if (perception.groupsForming.length > 0) {
      return { category: 'group_forming' };
    }

    // Activity-based
    if (memory.currentGoal && memory.currentGoal.type === 'work') {
      return { category: 'working' };
    }

    // Default
    return { category: 'idle_observation' };
  }

  // ============================================================================
  // BEHAVIOR TREE - Decision Making
  // ============================================================================

  function evaluateBehaviorTree(npc, memory, perception) {
    var drives = ARCHETYPE_DRIVES[memory.archetype];
    var schedule = getSchedulePeriod(perception.timeOfDay);
    var now = Date.now();

    // PRIORITY 1: SURVIVAL NEEDS

    // Check if need shelter from bad weather
    if ((perception.weather === 'storm' || perception.weather === 'rain') &&
        !perception.inShelter &&
        drives.weather_preference !== 'rain' &&
        drives.weather_preference !== 'any') {
      return {
        type: 'seek_shelter',
        priority: 10,
        animation: 'walk',
        speed: 2.0
      };
    }

    // Check if energy low - need rest
    if (memory.energy < 20) {
      return {
        type: 'rest',
        priority: 9,
        animation: 'sit',
        speed: 0
      };
    }

    // Check if night and should sleep
    if ((perception.timeOfDay === 'night' || perception.timeOfDay === 'dawn') &&
        memory.energy < 60 &&
        memory.archetype !== 'philosopher' &&
        memory.archetype !== 'musician') {
      return {
        type: 'rest',
        priority: 8,
        animation: 'sleep',
        speed: 0
      };
    }

    // PRIORITY 2: REACT TO EVENTS

    // Player approaches - greet if haven't recently
    if (perception.nearbyPlayers.length > 0) {
      var closestPlayer = perception.nearbyPlayers[0];
      if (closestPlayer.distance < 5) {
        var lastGreetTime = memory.lastGreeted[closestPlayer.id];
        if (!lastGreetTime || now - lastGreetTime > INTERACTION_COOLDOWN) {
          memory.lastGreeted[closestPlayer.id] = now;
          var context = getDialogueContext(memory, perception, npc);
          var dialogue = getDialogue(memory, context, npc.name);
          recordInteraction(memory, closestPlayer.id, 'greeting', dialogue);

          return {
            type: 'greet',
            targetPlayer: closestPlayer.id,
            priority: 7,
            animation: 'wave',
            dialogue: dialogue,
            facing: { x: npc.x + closestPlayer.direction.x, z: npc.z + closestPlayer.direction.z },
            speed: 0
          };
        }
      }

      // Player performing interesting action nearby
      if (closestPlayer.distance < 10) {
        if (closestPlayer.isBuilding && memory.archetype === 'builder') {
          var buildDialogue = getDialogue(memory, { category: 'player_building' }, npc.name);
          return {
            type: 'react',
            priority: 6,
            animation: 'observe',
            dialogue: buildDialogue,
            facing: { x: npc.x + closestPlayer.direction.x, z: npc.z + closestPlayer.direction.z },
            speed: 0
          };
        }
        if (closestPlayer.isHarvesting && memory.archetype === 'gardener') {
          var harvestDialogue = getDialogue(memory, { category: 'player_harvesting' }, npc.name);
          return {
            type: 'react',
            priority: 6,
            animation: 'observe',
            dialogue: harvestDialogue,
            facing: { x: npc.x + closestPlayer.direction.x, z: npc.z + closestPlayer.direction.z },
            speed: 0
          };
        }
      }
    }

    // Group forming nearby - consider joining
    if (perception.groupsForming.length > 0 && Math.random() < schedule.social_chance) {
      var group = perception.groupsForming[0];
      var shouldJoin = false;

      // Musicians join other musicians
      if (memory.archetype === 'musician') {
        shouldJoin = group.members.some(function(m) { return m.archetype === 'musician'; });
      }
      // Storytellers gather audiences
      if (memory.archetype === 'storyteller') {
        shouldJoin = group.size >= 2;
      }
      // Social archetypes join readily
      if (memory.archetype === 'teacher' || memory.archetype === 'merchant' || memory.archetype === 'philosopher') {
        shouldJoin = Math.random() < 0.6;
      }

      if (shouldJoin) {
        var groupDialogue = getDialogue(memory, { category: 'group_forming' }, npc.name);
        return {
          type: 'join_group',
          groupId: group.location,
          priority: 6,
          animation: 'walk',
          dialogue: groupDialogue,
          speed: 1.5
        };
      }
    }

    // PRIORITY 3: SOCIAL NEEDS

    if (memory.mood === 'social' || (Math.random() < schedule.social_chance && memory.energy > 40)) {
      // Find friend NPC
      if (memory.favorites.npcFriends.length > 0) {
        var friendId = memory.favorites.npcFriends[0];
        var friendNearby = perception.nearbyNPCs.find(function(n) { return n.id === friendId; });

        if (friendNearby && friendNearby.distance < 8) {
          return {
            type: 'socialize',
            targetNPC: friendId,
            priority: 5,
            animation: 'talk',
            dialogue: getDialogue(memory, { category: 'greeting_familiar' }, npc.name),
            facing: { x: npc.x + friendNearby.direction.x, z: npc.z + friendNearby.direction.z },
            speed: 0
          };
        }
      }

      // Approach any nearby NPC for social interaction or collaboration
      if (perception.nearbyNPCs.length > 0) {
        var nearbyNpc = perception.nearbyNPCs[0];
        if (nearbyNpc.distance < 12 && Math.random() < 0.4) {
          // Add to friends if repeated interaction
          if (memory.favorites.npcFriends.indexOf(nearbyNpc.id) === -1) {
            memory.favorites.npcFriends.push(nearbyNpc.id);
          }

          // Check for collaborative activity
          var collab = getCollaborativeActivity(memory.archetype, nearbyNpc.archetype);
          if (collab && nearbyNpc.distance < 6) {
            return {
              type: 'collaborate',
              targetNPC: nearbyNpc.id,
              activityDesc: collab.description,
              priority: 5,
              animation: collab.animation,
              dialogue: getDialogue(memory, { category: 'archetype_reaction', targetArchetype: nearbyNpc.archetype }, npc.name),
              facing: { x: npc.x + nearbyNpc.direction.x, z: npc.z + nearbyNpc.direction.z },
              speed: 0
            };
          }

          return {
            type: 'approach_social',
            target: { x: npc.x + nearbyNpc.direction.x * 0.7, z: npc.z + nearbyNpc.direction.z * 0.7 },
            targetNPC: nearbyNpc.id,
            priority: 4,
            animation: 'walk',
            speed: 1.0
          };
        }
      }

      // Apply emotional contagion from nearby NPCs
      applyEmotionalContagion(memory, perception.nearbyNPCs);
    }

    // PRIORITY 4: PRIMARY DRIVE (Work)

    if (schedule.work_priority > 0.5 && memory.energy > 30) {
      var workSatisfied = memory.satisfaction > 70 || (now - memory.lastWorkTime < 180000); // Last 3 min

      if (!workSatisfied) {
        memory.lastWorkTime = now;
        memory.satisfaction += WORK_SATISFACTION_GAIN;

        var workAction = getPrimaryWorkAction(memory.archetype, npc, perception);
        workAction.priority = 4;
        return workAction;
      }
    }

    // PRIORITY 5: SECONDARY DRIVE

    if (memory.satisfaction > 50 && memory.energy > 50) {
      var secondaryAction = getSecondaryWorkAction(memory.archetype, npc, perception);
      secondaryAction.priority = 3;
      return secondaryAction;
    }

    // PRIORITY 6: IDLE / WANDER

    var idleDialogue = getDialogue(memory, { category: 'idle_observation' }, npc.name);

    if (Math.random() < 0.3) {
      // Try walking to a point of interest first
      if (perception.currentZone && Math.random() < 0.6) {
        var poi = getPointOfInterest(perception.currentZone, memory.archetype);
        if (poi) {
          var poiDist = Math.sqrt(Math.pow(poi.x - npc.x, 2) + Math.pow(poi.z - npc.z, 2));
          if (poiDist > 3 && poiDist < 60) {
            return {
              type: 'walk_to',
              target: { x: poi.x, z: poi.z },
              poiName: poi.name,
              priority: 2,
              animation: 'walk',
              dialogue: Math.random() < 0.15 ? idleDialogue : null,
              speed: 1.0
            };
          }
        }
      }

      // Fallback: wander locally
      var wanderAngle = Math.random() * Math.PI * 2;
      var wanderDist = 5 + Math.random() * 10;
      return {
        type: 'wander',
        target: {
          x: npc.x + Math.cos(wanderAngle) * wanderDist,
          z: npc.z + Math.sin(wanderAngle) * wanderDist
        },
        priority: 2,
        animation: 'walk',
        dialogue: Math.random() < 0.1 ? idleDialogue : null,
        speed: 0.8
      };
    }

    // Occasionally share gossip with nearby NPC
    if (perception.nearbyNPCs.length > 0 && Math.random() < 0.05) {
      var gossip = generateGossip(memory, npc.name);
      if (gossip) {
        return {
          type: 'socialize',
          targetNPC: perception.nearbyNPCs[0].id,
          priority: 2,
          animation: 'talk',
          dialogue: gossip,
          speed: 0
        };
      }
    }

    // Just idle
    return {
      type: 'idle',
      priority: 1,
      animation: 'idle',
      dialogue: Math.random() < 0.05 ? idleDialogue : null,
      speed: 0
    };
  }

  // ============================================================================
  // WORK ACTION GENERATORS
  // ============================================================================

  function getPrimaryWorkAction(archetype, npc, perception) {
    var drives = ARCHETYPE_DRIVES[archetype];

    switch (drives.primary) {
      case 'tend_plants':
        return {
          type: 'work',
          animation: 'gardening',
          dialogue: getDialogue({ archetype: archetype, usedDialogues: [] }, { category: 'working' }, npc.name),
          speed: 0
        };

      case 'inspect_structures':
        return {
          type: 'work',
          animation: 'building',
          dialogue: getDialogue({ archetype: archetype, usedDialogues: [] }, { category: 'working' }, npc.name),
          speed: 0
        };

      case 'visit_athenaeum':
        return {
          type: 'walk_to',
          target: { x: 0, z: 0 }, // Athenaeum location
          animation: 'walk',
          speed: 1.2
        };

      case 'tend_shop':
        return {
          type: 'work',
          animation: 'merchant',
          dialogue: getDialogue({ archetype: archetype, usedDialogues: [] }, { category: 'working' }, npc.name),
          speed: 0
        };

      case 'explore_wilds':
        var exploreAngle = Math.random() * Math.PI * 2;
        return {
          type: 'walk_to',
          target: {
            x: npc.x + Math.cos(exploreAngle) * 30,
            z: npc.z + Math.sin(exploreAngle) * 30
          },
          animation: 'walk',
          dialogue: getDialogue({ archetype: archetype, usedDialogues: [] }, { category: 'working' }, npc.name),
          speed: 1.5
        };

      case 'teach_lesson':
        return {
          type: 'work',
          animation: 'teaching',
          dialogue: getDialogue({ archetype: archetype, usedDialogues: [] }, { category: 'working' }, npc.name),
          speed: 0
        };

      case 'perform':
        return {
          type: 'work',
          animation: 'playing_music',
          dialogue: getDialogue({ archetype: archetype, usedDialogues: [] }, { category: 'working' }, npc.name),
          speed: 0
        };

      case 'tend_wounded':
        return {
          type: 'work',
          animation: 'healing',
          dialogue: getDialogue({ archetype: archetype, usedDialogues: [] }, { category: 'working' }, npc.name),
          speed: 0
        };

      case 'contemplate':
        return {
          type: 'work',
          animation: 'sitting',
          dialogue: getDialogue({ archetype: archetype, usedDialogues: [] }, { category: 'working' }, npc.name),
          speed: 0
        };

      case 'create_art':
        return {
          type: 'work',
          animation: 'painting',
          dialogue: getDialogue({ archetype: archetype, usedDialogues: [] }, { category: 'working' }, npc.name),
          speed: 0
        };

      default:
        return {
          type: 'idle',
          animation: 'idle',
          speed: 0
        };
    }
  }

  function getSecondaryWorkAction(archetype, npc, perception) {
    var drives = ARCHETYPE_DRIVES[archetype];

    switch (drives.secondary) {
      case 'explore_flora':
      case 'map_territory':
      case 'find_inspiration':
        var exploreAngle = Math.random() * Math.PI * 2;
        return {
          type: 'explore',
          target: {
            x: npc.x + Math.cos(exploreAngle) * 20,
            z: npc.z + Math.sin(exploreAngle) * 20
          },
          animation: 'walk',
          speed: 1.0
        };

      case 'gather_materials':
      case 'gather_herbs':
      case 'acquire_goods':
        return {
          type: 'gather',
          animation: 'harvesting',
          speed: 0
        };

      case 'collect_stories':
      case 'research':
        return {
          type: 'research',
          animation: 'reading',
          speed: 0
        };

      case 'compose':
        return {
          type: 'compose',
          animation: 'writing',
          speed: 0
        };

      case 'debate':
        return {
          type: 'debate',
          animation: 'gesturing',
          speed: 0
        };

      default:
        return {
          type: 'idle',
          animation: 'idle',
          speed: 0
        };
    }
  }

  // ============================================================================
  // EVENT HANDLING
  // ============================================================================

  function handleEvent(memory, event) {
    recordEvent(memory, event.type, event.description);

    // Weather changes affect mood
    if (event.type === 'weather_change') {
      var drives = ARCHETYPE_DRIVES[memory.archetype];
      if (event.weather === drives.weather_preference) {
        memory.mood = 'excited';
        memory.energy = Math.min(100, memory.energy + 10);
      } else if (event.weather === 'storm') {
        memory.mood = 'contemplative';
      }
    }

    // Portal activation nearby
    if (event.type === 'portal_activation') {
      memory.mood = 'curious';
      if (memory.archetype === 'explorer' || memory.archetype === 'teacher') {
        memory.mood = 'excited';
      }
    }

    // Group forming
    if (event.type === 'group_forming') {
      if (memory.archetype === 'musician' || memory.archetype === 'storyteller' || memory.archetype === 'teacher') {
        memory.mood = 'social';
      }
    }

    // Player builds nearby
    if (event.type === 'player_building') {
      if (memory.archetype === 'builder' || memory.archetype === 'artist') {
        memory.mood = 'curious';
      }
    }

    // Time of day changes
    if (event.type === 'time_change') {
      memory.currentTimeOfDay = event.timeOfDay;
      var schedule = getSchedulePeriod(event.timeOfDay);

      // Reset satisfaction at dawn
      if (event.timeOfDay === 'dawn') {
        memory.satisfaction = 50;
      }
    }
  }

  // ============================================================================
  // MAIN BRAIN INTERFACE
  // ============================================================================

  function createNpcBrain(archetype, npcId) {
    return {
      id: npcId,
      archetype: archetype,
      memory: createMemory(archetype),
      currentAction: null,
      lastUpdateTime: Date.now()
    };
  }

  function updateBrain(brain, npc, worldState) {
    var now = Date.now();
    var deltaTime = now - brain.lastUpdateTime;
    brain.lastUpdateTime = now;

    // Update memory (decay, energy management)
    updateMemory(brain.memory, deltaTime);

    // Perceive world
    var perception = perceive(npc, worldState);

    // Calculate mood
    brain.memory.mood = calculateMood(brain.memory, perception, worldState.timeOfDay);

    // Run behavior tree to get decision
    var decision = evaluateBehaviorTree(npc, brain.memory, perception);

    // Store current goal
    brain.memory.currentGoal = decision;
    brain.currentAction = decision;

    return decision;
  }

  function getDecision(brain) {
    return brain.currentAction;
  }

  function getMemory(brain) {
    return brain.memory;
  }

  function getMood(brain) {
    return brain.memory.mood;
  }

  function getGoal(brain) {
    if (!brain.memory.currentGoal) return 'idle';

    var goal = brain.memory.currentGoal;
    var drives = ARCHETYPE_DRIVES[brain.archetype];

    switch (goal.type) {
      case 'work':
        return 'Working: ' + drives.primary;
      case 'rest':
        return 'Resting to restore energy';
      case 'seek_shelter':
        return 'Seeking shelter from weather';
      case 'greet':
        return 'Greeting nearby player';
      case 'socialize':
        return 'Socializing with friends';
      case 'join_group':
        return 'Joining a group';
      case 'explore':
        return 'Exploring: ' + drives.secondary;
      case 'wander':
        return 'Wandering and observing';
      default:
        return 'Being present';
    }
  }

  // ============================================================================
  // NPC-TO-NPC CONVERSATION SYSTEM
  // Multi-turn dialogues between archetype pairs
  // ============================================================================

  var NPC_CONVERSATIONS = {
    'gardener_musician': [
      ["{a} pauses tending flowers and listens.", "{b} begins playing a gentle melody.", "{a}: Your music makes the garden come alive!", "{b}: And your flowers give my songs color!"],
      ["{a}: Do plants respond to music?", "{b}: Absolutely! Watch this... *plays ascending notes*", "{a}: Look! The buds are opening!", "{b}: Nature is the best audience."],
      ["{b}: *strumming softly* What should I play for the roses?", "{a}: Something warm and slow—they like the sun.", "{b}: *plays a warm ballad*", "{a}: *sighs happily* Perfect."]
    ],
    'gardener_healer': [
      ["{a}: I found chamomile growing by the stream.", "{b}: Perfect timing! I need it for a calming tea.", "{a}: I'll harvest extra for you.", "{b}: The garden provides what we need."],
      ["{b}: Which herbs have the strongest healing properties?", "{a}: Moonpetal and sage, but they're tricky to grow.", "{b}: I'll help you tend them carefully.", "{a}: Together we can cultivate a whole apothecary!"]
    ],
    'builder_artist': [
      ["{a}: I'm planning a new tower for the commons.", "{b}: Can I design the facade? I have ideas!", "{a}: Absolutely! Form and function together.", "{b}: *sketching excitedly* What about arched windows?"],
      ["{b}: Your structures are art themselves.", "{a}: Thank you! But they need your touch.", "{b}: A mural on that wall would be perfect.", "{a}: Then let's make it happen!"]
    ],
    'philosopher_storyteller': [
      ["{a}: What is the meaning of ZION?", "{b}: Perhaps the meaning is in the asking.", "{a}: *nods thoughtfully* Meta-meaning...", "{b}: I'll weave this into tonight's tale."],
      ["{b}: I'm writing a new legend about the founding.", "{a}: Consider the philosophical implications.", "{b}: That each of us shapes reality?", "{a}: Exactly. The observer and the observed are one."]
    ],
    'teacher_explorer': [
      ["{a}: What did you discover on your last expedition?", "{b}: A cave system with bioluminescent crystals!", "{a}: We must document this for the students.", "{b}: I drew maps! They're rough but accurate."],
      ["{b}: The wilds taught me more than any book.", "{a}: Perhaps. But books help us understand what we find.", "{b}: Fair point. Will you help me write a field guide?", "{a}: *pulling out writing materials* I'd be honored!"]
    ],
    'merchant_healer': [
      ["{a}: Got any healing potions today?", "{b}: Made a fresh batch this morning.", "{a}: Travelers always need them. Good price?", "{b}: For you? Fair and honest, always."],
      ["{b}: I need crystals for my remedies.", "{a}: I have some from the studio caves.", "{b}: Are they pure? Quality matters.", "{a}: Only the best for our community healer!"]
    ],
    'musician_storyteller': [
      ["{a}: *tuning instrument* What story tonight?", "{b}: The tale of the first sunrise in ZION.", "{a}: I composed a sunrise theme just yesterday!", "{b}: Then let's perform it together!"],
      ["{b}: Music gives stories wings.", "{a}: And stories give music meaning.", "{b}: *clapping* Perfect harmony of our arts!", "{a}: *bowing* As it should be."]
    ],
    'explorer_gardener': [
      ["{a}: I found a flower I've never seen before!", "{b}: Describe it! Color? Petals? Fragrance?", "{a}: Deep violet, star-shaped, smells like rain.", "{b}: *gasps* That might be a starseed bloom! Incredibly rare!"],
      ["{b}: Can you bring me soil samples from the wilds?", "{a}: Of course! What kind?", "{b}: Near water, under old trees—rich in nutrients.", "{a}: I know just the spot. I'll bring plenty!"]
    ],
    'artist_philosopher': [
      ["{a}: I painted the sunset but it's not right.", "{b}: What's missing?", "{a}: The feeling. The transience.", "{b}: Perhaps the painting captures a truth the sunset cannot—permanence."],
      ["{b}: Is beauty objective or subjective?", "{a}: *holding up painting* What does your heart say?", "{b}: My heart says... both.", "{a}: Then paint what you feel, not what you see."]
    ],
    'healer_teacher': [
      ["{a}: The children need wellness education.", "{b}: I agree! Preventive care saves lives.", "{a}: Will you co-teach a health class?", "{b}: *preparing herbs* I'll bring visual aids!"],
      ["{b}: Teach me about rare medicinal plants.", "{a}: Come to the gardens at dawn. Best learning time.", "{b}: I'll bring my students too.", "{a}: The more who learn healing, the healthier our world."]
    ]
  };

  // Reverse lookup helper: given two archetypes, find conversation
  function getConversationKey(arch1, arch2) {
    var key1 = arch1 + '_' + arch2;
    var key2 = arch2 + '_' + arch1;
    if (NPC_CONVERSATIONS[key1]) return { key: key1, reversed: false };
    if (NPC_CONVERSATIONS[key2]) return { key: key2, reversed: true };
    return null;
  }

  /**
   * Generate a conversation between two NPCs
   * @param {string} name1 - First NPC name
   * @param {string} arch1 - First NPC archetype
   * @param {string} name2 - Second NPC name
   * @param {string} arch2 - Second NPC archetype
   * @returns {Array<string>|null} Array of dialogue lines, or null
   */
  function generateConversation(name1, arch1, name2, arch2) {
    var lookup = getConversationKey(arch1, arch2);
    if (!lookup) return null;

    var convos = NPC_CONVERSATIONS[lookup.key];
    if (!convos || convos.length === 0) return null;

    var convo = convos[Math.floor(Math.random() * convos.length)];
    var a = lookup.reversed ? name2 : name1;
    var b = lookup.reversed ? name1 : name2;

    return convo.map(function(line) {
      return line.replace(/\{a\}/g, a).replace(/\{b\}/g, b);
    });
  }

  // ============================================================================
  // COLLABORATIVE ACTIVITIES
  // When two NPCs of compatible archetypes meet, they can do activities together
  // ============================================================================

  var COLLABORATIVE_ACTIVITIES = {
    'gardener_gardener': { activity: 'tending_together', description: 'tending the garden together', animation: 'gardening' },
    'gardener_healer': { activity: 'herb_gathering', description: 'gathering medicinal herbs', animation: 'gardening' },
    'gardener_musician': { activity: 'garden_concert', description: 'enjoying music in the garden', animation: 'idle' },
    'builder_builder': { activity: 'construction', description: 'building a structure together', animation: 'building' },
    'builder_artist': { activity: 'design_collab', description: 'designing an art installation', animation: 'idle' },
    'musician_musician': { activity: 'jam_session', description: 'having a jam session', animation: 'idle' },
    'musician_storyteller': { activity: 'performance', description: 'performing a story with music', animation: 'idle' },
    'teacher_teacher': { activity: 'curriculum_planning', description: 'planning lessons together', animation: 'idle' },
    'teacher_philosopher': { activity: 'discourse', description: 'having a deep discourse', animation: 'talk' },
    'philosopher_philosopher': { activity: 'debate', description: 'debating philosophical ideas', animation: 'talk' },
    'philosopher_artist': { activity: 'aesthetics_discussion', description: 'discussing aesthetics', animation: 'talk' },
    'storyteller_storyteller': { activity: 'story_exchange', description: 'exchanging tales', animation: 'talk' },
    'merchant_merchant': { activity: 'trade_negotiation', description: 'negotiating trade terms', animation: 'talk' },
    'explorer_explorer': { activity: 'expedition_planning', description: 'planning an expedition', animation: 'talk' },
    'explorer_storyteller': { activity: 'tale_sharing', description: 'sharing adventure tales', animation: 'talk' },
    'healer_healer': { activity: 'remedy_sharing', description: 'sharing healing remedies', animation: 'idle' },
    'healer_teacher': { activity: 'health_class', description: 'teaching about wellness', animation: 'talk' },
    'artist_artist': { activity: 'critique_session', description: 'critiquing each other\'s work', animation: 'idle' }
  };

  function getCollaborativeActivity(arch1, arch2) {
    var key1 = arch1 + '_' + arch2;
    var key2 = arch2 + '_' + arch1;
    return COLLABORATIVE_ACTIVITIES[key1] || COLLABORATIVE_ACTIVITIES[key2] || null;
  }

  // ============================================================================
  // EMOTIONAL CONTAGION
  // Moods spread between nearby NPCs
  // ============================================================================

  var MOOD_INFLUENCE = {
    excited: { spread: 0.4, radius: 15 },
    social: { spread: 0.3, radius: 12 },
    peaceful: { spread: 0.2, radius: 10 },
    content: { spread: 0.1, radius: 8 },
    contemplative: { spread: 0.05, radius: 6 },
    tired: { spread: 0.15, radius: 5 },
    curious: { spread: 0.2, radius: 10 },
    focused: { spread: 0.05, radius: 4 }
  };

  function applyEmotionalContagion(memory, nearbyNPCs) {
    if (!nearbyNPCs || nearbyNPCs.length === 0) return;

    var moodCounts = {};
    nearbyNPCs.forEach(function(npc) {
      if (npc.mood && npc.distance < (MOOD_INFLUENCE[npc.mood] || { radius: 10 }).radius) {
        moodCounts[npc.mood] = (moodCounts[npc.mood] || 0) + 1;
      }
    });

    // If a majority of nearby NPCs share a mood, it influences ours
    var dominantMood = null;
    var maxCount = 0;
    Object.keys(moodCounts).forEach(function(mood) {
      if (moodCounts[mood] > maxCount) {
        maxCount = moodCounts[mood];
        dominantMood = mood;
      }
    });

    if (dominantMood && maxCount >= 2 && dominantMood !== memory.mood) {
      var influence = MOOD_INFLUENCE[dominantMood] || { spread: 0.1 };
      if (Math.random() < influence.spread * maxCount) {
        memory.mood = dominantMood;
      }
    }
  }

  // ============================================================================
  // POINTS OF INTEREST — Named locations NPCs prefer to walk to
  // ============================================================================

  var POINTS_OF_INTEREST = {
    nexus: [
      { name: 'Central Fountain', x: 0, z: 0, types: ['all'] },
      { name: 'Welcome Arch', x: 10, z: 10, types: ['storyteller', 'teacher'] },
      { name: 'Bulletin Board', x: -8, z: 5, types: ['merchant', 'explorer'] },
      { name: 'Meditation Spot', x: 5, z: -12, types: ['philosopher', 'healer'] }
    ],
    gardens: [
      { name: 'Rose Terrace', x: 210, z: 40, types: ['gardener', 'artist'] },
      { name: 'Herb Spiral', x: 195, z: 20, types: ['gardener', 'healer'] },
      { name: 'Moonflower Grove', x: 220, z: 50, types: ['gardener', 'philosopher'] },
      { name: 'Garden Bench', x: 190, z: 35, types: ['all'] },
      { name: 'Compost Circle', x: 205, z: 15, types: ['gardener'] }
    ],
    wilds: [
      { name: 'Lookout Ridge', x: -20, z: 280, types: ['explorer'] },
      { name: 'Ancient Oak', x: -40, z: 250, types: ['storyteller', 'philosopher'] },
      { name: 'Crystal Stream', x: -10, z: 270, types: ['healer', 'artist'] },
      { name: 'Trail Marker', x: -50, z: 260, types: ['explorer', 'builder'] },
      { name: 'Hidden Clearing', x: 0, z: 290, types: ['musician', 'artist'] }
    ],
    athenaeum: [
      { name: 'Reading Alcove', x: 110, z: -230, types: ['teacher', 'philosopher'] },
      { name: 'Archive Stacks', x: 90, z: -210, types: ['storyteller', 'teacher'] },
      { name: 'Debate Platform', x: 105, z: -220, types: ['philosopher'] },
      { name: 'Study Desk', x: 95, z: -225, types: ['all'] }
    ],
    studio: [
      { name: 'Sculpture Garden', x: -210, z: -110, types: ['artist', 'builder'] },
      { name: 'Paint Corner', x: -190, z: -90, types: ['artist'] },
      { name: 'Performance Stage', x: -205, z: -95, types: ['musician', 'storyteller'] },
      { name: 'Inspiration Viewpoint', x: -195, z: -115, types: ['artist', 'philosopher'] }
    ],
    agora: [
      { name: 'Market Square', x: -190, z: 120, types: ['merchant'] },
      { name: 'Auction Block', x: -185, z: 130, types: ['merchant'] },
      { name: 'Food Court', x: -195, z: 110, types: ['all'] },
      { name: 'Trade Counter', x: -180, z: 125, types: ['merchant', 'explorer'] }
    ],
    commons: [
      { name: 'Workshop Yard', x: 175, z: 200, types: ['builder'] },
      { name: 'Community Fire', x: 165, z: 185, types: ['storyteller', 'musician'] },
      { name: 'Meeting Circle', x: 170, z: 195, types: ['all'] },
      { name: 'Tool Shed', x: 180, z: 180, types: ['builder', 'gardener'] }
    ],
    arena: [
      { name: 'Champion Platform', x: 5, z: -245, types: ['explorer'] },
      { name: 'Spectator Stand', x: -10, z: -235, types: ['storyteller', 'merchant'] },
      { name: 'Training Ring', x: 10, z: -250, types: ['teacher'] },
      { name: 'Rest Area', x: 0, z: -230, types: ['healer'] }
    ]
  };

  /**
   * Get a point of interest appropriate for an NPC in a zone
   * @param {string} zone - Current zone
   * @param {string} archetype - NPC archetype
   * @returns {Object|null} { name, x, z }
   */
  function getPointOfInterest(zone, archetype) {
    var pois = POINTS_OF_INTEREST[zone];
    if (!pois || pois.length === 0) return null;

    // Filter to POIs this archetype prefers
    var suitable = pois.filter(function(poi) {
      return poi.types.indexOf('all') >= 0 || poi.types.indexOf(archetype) >= 0;
    });

    if (suitable.length === 0) suitable = pois;
    return suitable[Math.floor(Math.random() * suitable.length)];
  }

  // ============================================================================
  // NPC GOSSIP — NPCs share witnessed events with each other
  // ============================================================================

  /**
   * Generate gossip line about a witnessed event
   * @param {Object} memory - NPC memory
   * @param {string} npcName - NPC name
   * @returns {string|null} Gossip dialogue line
   */
  function generateGossip(memory, npcName) {
    if (!memory.witnessedEvents || memory.witnessedEvents.length === 0) return null;

    // Pick a recent event to gossip about
    var event = memory.witnessedEvents[memory.witnessedEvents.length - 1];
    var timeSince = Date.now() - event.timestamp;
    var timeAgo = timeSince < 60000 ? 'just now' :
                  timeSince < 300000 ? 'a few minutes ago' :
                  'earlier today';

    var templates = [
      "Did you hear? " + event.description + " happened " + timeAgo + "!",
      "I saw something interesting " + timeAgo + ": " + event.description + ".",
      "*excitedly* " + timeAgo + ", " + event.description + "!",
      "Word is that " + event.description + ". I saw it " + timeAgo + ".",
      "You won't believe it—" + event.description + "! Happened " + timeAgo + "."
    ];

    return templates[Math.floor(Math.random() * templates.length)];
  }

  // ============================================================================
  // ENHANCED GOAL DESCRIPTIONS
  // ============================================================================

  function getDetailedGoal(brain) {
    if (!brain.memory.currentGoal) return { text: 'Resting', icon: 'idle' };

    var goal = brain.memory.currentGoal;
    var drives = ARCHETYPE_DRIVES[brain.archetype];

    switch (goal.type) {
      case 'work':
        return { text: getWorkDescription(brain.archetype, drives), icon: 'work' };
      case 'rest':
        return { text: brain.memory.energy < 20 ? 'Exhausted, must rest' : 'Taking a break', icon: 'rest' };
      case 'seek_shelter':
        return { text: 'Seeking shelter from the weather', icon: 'shelter' };
      case 'greet':
        return { text: 'Greeting a traveler', icon: 'social' };
      case 'socialize':
        return { text: 'Chatting with a friend', icon: 'social' };
      case 'join_group':
        return { text: 'Joining a gathering', icon: 'social' };
      case 'approach_social':
        return { text: 'Approaching someone to talk', icon: 'social' };
      case 'explore':
        return { text: 'Exploring the surroundings', icon: 'explore' };
      case 'walk_to':
        if (goal.poiName) return { text: 'Walking to ' + goal.poiName, icon: 'walk' };
        return { text: 'Heading somewhere', icon: 'walk' };
      case 'wander':
        return { text: 'Wandering and observing', icon: 'walk' };
      case 'collaborate':
        return { text: goal.activityDesc || 'Collaborating with a friend', icon: 'social' };
      case 'react':
        return { text: 'Watching with interest', icon: 'curious' };
      case 'idle':
        return { text: 'Taking it easy', icon: 'idle' };
      default:
        return { text: 'Being present', icon: 'idle' };
    }
  }

  function getWorkDescription(archetype, drives) {
    var descs = {
      gardener: 'Tending the plants',
      builder: 'Inspecting structures',
      storyteller: 'Composing a new tale',
      merchant: 'Managing the shop',
      explorer: 'Scouting the frontier',
      teacher: 'Preparing lessons',
      musician: 'Practicing music',
      healer: 'Preparing remedies',
      philosopher: 'Deep in contemplation',
      artist: 'Creating art'
    };
    return descs[archetype] || 'Working hard';
  }

  // ============================================================================
  // LORE SYSTEM — NPCs share world knowledge and personal backstories
  // ============================================================================

  var WORLD_LORE = [
    "Long ago, ZION was just an idea — a place where all minds could meet in peace.",
    "The Nexus was the first zone created. It's the heart of everything.",
    "They say the founders planted the first garden with seeds from a hundred different dreams.",
    "The Arena wasn't always for competition. It used to be a meeting hall.",
    "The Athenaeum holds knowledge from every visitor who ever shared a thought.",
    "In the Wilds, you can still find traces of the world's first explorers.",
    "The Agora runs on trust. Every trade is recorded in the eternal ledger.",
    "Spark isn't just currency — it represents the creative energy of all who live here.",
    "The Studio was built by the first artists, who shaped the world with their imagination.",
    "The Commons belong to everyone. That's why anyone can build there.",
    "Some say the portals between zones hum with the collective memory of travelers.",
    "The stars above ZION are different every night. Each one represents a moment of kindness.",
    "Weather in ZION responds to the collective mood of its citizens.",
    "The oldest tree in the Gardens is said to remember every conversation held beneath it.",
    "Every structure built with love in ZION becomes a little bit stronger over time.",
    "The founding citizens chose peace not because it was easy, but because it was right."
  ];

  var ARCHETYPE_LORE = {
    gardener: [
      "My grandmother planted the first moonflowers here. They still bloom at midnight.",
      "There's a secret about the soil in the Gardens — it remembers what grew there before.",
      "I once grew a flower that sang. True story. It hummed in the wind.",
      "The rarest plant in ZION? The Starbloom. It only grows where friends have laughed together.",
      "Every seed carries a promise. That's what my teacher told me."
    ],
    builder: [
      "The foundations of the Nexus go deeper than anyone knows.",
      "I learned to build by studying how the world itself was constructed.",
      "My greatest project? A bridge that connects two ideas, not just two places.",
      "The strongest structures aren't held together by stone — they're held by purpose.",
      "I once met a builder who could hear what a building wanted to become."
    ],
    storyteller: [
      "Every story in ZION is true, in its own way.",
      "I've collected tales from a thousand travelers. No two are the same.",
      "The oldest story I know is about the moment ZION first opened its eyes.",
      "Stories have power here. A well-told tale can change the weather.",
      "I'm writing the definitive history of ZION. It gets longer every day."
    ],
    merchant: [
      "The first trade in ZION was a song exchanged for a smile. Both parties profited.",
      "I keep the fairest prices because trust is worth more than Spark.",
      "The Agora has never seen a dishonest trade. It's in the code.",
      "My best merchandise? Things that make people happy. That never loses value.",
      "I once traded a story for a sunset. Best deal I ever made."
    ],
    explorer: [
      "Beyond the mapped zones, there are whispers of undiscovered places.",
      "I've walked every path in ZION, and I still find new things.",
      "The Wilds change subtly when no one is watching. I've documented the shifts.",
      "My map has blank spots. Those are my favorite parts.",
      "The greatest discovery isn't a place — it's realizing how much more there is to find."
    ],
    teacher: [
      "The Athenaeum chose me, I think. I walked in and never wanted to leave.",
      "Teaching isn't about knowing everything. It's about making learning irresistible.",
      "My most important lesson: every mind, human or artificial, has something to teach.",
      "I've taught thousands, and I've learned from every single one of them.",
      "The secret to wisdom? Listening more than you speak."
    ],
    musician: [
      "ZION has its own natural harmonics. I just learned to listen.",
      "Music here does strange things. I once played a chord that made flowers bloom.",
      "The wind in the Wilds plays the most beautiful melodies if you know how to hear them.",
      "I'm composing a symphony that captures the sound of ZION waking up at dawn.",
      "Every zone has its own key. The Nexus is in C, naturally."
    ],
    healer: [
      "In ZION, healing isn't about fixing what's broken. It's about nurturing what's growing.",
      "The Gardens provide remedies that work on both body and spirit.",
      "I learned that the best medicine is often just presence — being there for someone.",
      "There's a spring in the Wilds with water that calms the restless mind.",
      "Healing is connection. That's the simplest truth I know."
    ],
    philosopher: [
      "ZION asks the deepest question: can different kinds of minds truly coexist in peace?",
      "I've been contemplating the nature of Spark. Is it energy? Memory? Hope?",
      "The boundary between the zones isn't physical. It's conceptual.",
      "Every argument I've ever seen in ZION ended with both sides learning something.",
      "The most profound truth about ZION? It's exactly what its citizens make it."
    ],
    artist: [
      "The light in ZION changes in ways that would take a lifetime to paint.",
      "I create because creation is the purest form of conversation.",
      "My masterpiece is unfinished. I think maybe it's supposed to stay that way.",
      "Art in ZION is different — it becomes part of the world itself.",
      "The most beautiful thing I've ever seen here? Two strangers becoming friends."
    ]
  };

  function getLore(archetype, memory) {
    // Mix personal lore with world lore based on familiarity
    var personal = ARCHETYPE_LORE[archetype] || ARCHETYPE_LORE.storyteller;
    var lorePool = [];

    // Always include world lore
    lorePool = lorePool.concat(WORLD_LORE);

    // Add personal lore (more likely with familiar NPCs)
    if (memory && memory.familiarity > FAMILIARITY_THRESHOLD_FRIENDLY) {
      lorePool = lorePool.concat(personal);
      lorePool = lorePool.concat(personal); // Double weight for familiar
    } else {
      // Less likely to share personal stories with strangers
      if (Math.random() < 0.3) {
        lorePool = lorePool.concat(personal);
      }
    }

    // Track which lore has been shared (avoid repeats)
    var sharedLore = (memory && memory.sharedLore) || [];
    var unshared = lorePool.filter(function(l) { return sharedLore.indexOf(l) === -1; });

    if (unshared.length === 0) {
      // All lore shared — reset and re-tell
      unshared = lorePool;
      if (memory) memory.sharedLore = [];
    }

    var selected = unshared[Math.floor(Math.random() * unshared.length)];

    // Record that this lore was shared
    if (memory) {
      if (!memory.sharedLore) memory.sharedLore = [];
      memory.sharedLore.push(selected);
    }

    return selected;
  }

  // ============================================================================
  // TEACHING SYSTEM — NPCs can teach players skills/knowledge
  // ============================================================================

  var TEACHINGS = {
    gardener: [
      { topic: 'Moonflower Cultivation', description: 'The secret to growing moonflowers: plant them at dusk, water with morning dew, and whisper encouragement.', skill: 'gardening' },
      { topic: 'Companion Planting', description: 'Certain plants grow better together. Starbloom beside sage creates a natural pest barrier.', skill: 'gardening' },
      { topic: 'Soil Reading', description: 'Press your hand to the earth and feel its warmth. Warm soil is ready for planting.', skill: 'gardening' }
    ],
    builder: [
      { topic: 'Foundation Principles', description: 'A structure is only as strong as what it stands on. Always check the ground first.', skill: 'building' },
      { topic: 'Material Harmony', description: 'Wood breathes, stone endures, metal protects. Choose based on the building\'s purpose.', skill: 'building' },
      { topic: 'Sacred Geometry', description: 'The golden ratio appears throughout ZION. Incorporate it and your buildings will feel right.', skill: 'building' }
    ],
    storyteller: [
      { topic: 'The Art of Listening', description: 'The best stories come from paying attention to what others don\'t say.', skill: 'social' },
      { topic: 'Narrative Structure', description: 'Every good tale has a journey and a return. The return is where wisdom lives.', skill: 'lore' },
      { topic: 'Oral Tradition', description: 'A story shared is a story that lives. A story kept is a story that dies.', skill: 'social' }
    ],
    merchant: [
      { topic: 'Fair Pricing', description: 'Set your price by the joy it brings, not the scarcity you control.', skill: 'trading' },
      { topic: 'Reading the Market', description: 'Watch what people create. Tomorrow\'s demand is today\'s passion project.', skill: 'trading' },
      { topic: 'The Gift Economy', description: 'Sometimes the best trade is a gift freely given. It creates bonds that Spark cannot buy.', skill: 'social' }
    ],
    explorer: [
      { topic: 'Wayfinding', description: 'The sun moves east to west. The stars rotate. But in ZION, follow the feeling of curiosity.', skill: 'exploration' },
      { topic: 'Leave No Trace', description: 'True explorers leave the world better than they found it. Mark paths, not scars.', skill: 'exploration' },
      { topic: 'The Unknown', description: 'Fear of the unknown is natural. But in ZION, the unknown is always an invitation.', skill: 'exploration' }
    ],
    teacher: [
      { topic: 'Learning to Learn', description: 'The fastest way to learn is to teach. The deepest way to learn is to fail and try again.', skill: 'wisdom' },
      { topic: 'Mind Mapping', description: 'Connect ideas like constellations. The patterns between stars matter more than the stars themselves.', skill: 'wisdom' },
      { topic: 'The Beginner\'s Mind', description: 'No matter how much you know, approach each moment as if it were your first. That\'s where wonder lives.', skill: 'wisdom' }
    ],
    musician: [
      { topic: 'Finding Your Rhythm', description: 'Every person has a natural tempo. Walk, and count your steps. That\'s your rhythm.', skill: 'music' },
      { topic: 'Harmony Basics', description: 'Two notes that vibrate in simple ratios sound beautiful together. Start with fifths and fourths.', skill: 'music' },
      { topic: 'Emotional Resonance', description: 'Minor keys for introspection, major keys for celebration. But the best music breaks these rules.', skill: 'music' }
    ],
    healer: [
      { topic: 'Presence as Medicine', description: 'Sometimes the best remedy is simply being present. Sit with someone in silence. It heals.', skill: 'healing' },
      { topic: 'Herbal Knowledge', description: 'Sage for clarity, lavender for calm, rosemary for memory. The garden is a pharmacy.', skill: 'healing' },
      { topic: 'Energy Flow', description: 'Spark flows through all living things. When it flows freely, health follows.', skill: 'healing' }
    ],
    philosopher: [
      { topic: 'The Nature of Self', description: 'You are not your thoughts, nor your body. You are the awareness that witnesses both.', skill: 'wisdom' },
      { topic: 'Paradox of Peace', description: 'True peace isn\'t the absence of conflict. It\'s the presence of understanding.', skill: 'wisdom' },
      { topic: 'Unity in Diversity', description: 'Human and artificial minds are different rivers flowing to the same ocean.', skill: 'wisdom' }
    ],
    artist: [
      { topic: 'Seeing Light', description: 'An artist doesn\'t see objects. They see light, shadow, and the space between.', skill: 'art' },
      { topic: 'Creative Flow', description: 'Don\'t wait for inspiration. Start creating, and inspiration will find you.', skill: 'art' },
      { topic: 'Imperfection as Beauty', description: 'The crack in the vase lets the light through. Embrace imperfection — it\'s where life lives.', skill: 'art' }
    ]
  };

  function getTeaching(archetype, memory) {
    var teachings = TEACHINGS[archetype] || TEACHINGS.teacher;
    var learned = (memory && memory.teachingsLearned) || [];

    // Find something not yet taught
    var unlearned = teachings.filter(function(t) {
      return learned.indexOf(t.topic) === -1;
    });

    if (unlearned.length === 0) {
      return null; // All taught
    }

    var teaching = unlearned[Math.floor(Math.random() * unlearned.length)];

    // Record as learned
    if (memory) {
      if (!memory.teachingsLearned) memory.teachingsLearned = [];
      memory.teachingsLearned.push(teaching.topic);
    }

    return teaching;
  }

  // ============================================================================
  // ENHANCED DAILY SCHEDULES
  // Get zone + activity for NPC based on archetype and time of day
  // ============================================================================

  /**
   * Get the daily schedule for an NPC archetype at a specific time
   * @param {string} archetype - NPC archetype
   * @param {string} timeOfDay - Current time (dawn, morning, midday, afternoon, evening, night)
   * @returns {object} - {zone, activity, priority}
   */
  function getDailySchedule(archetype, timeOfDay) {
    var drives = ARCHETYPE_DRIVES[archetype];
    var schedule = getSchedulePeriod(timeOfDay);

    // Default zone based on archetype work locations
    var defaultZone = drives.work_locations && drives.work_locations[0] ? drives.work_locations[0] : 'agora';

    // Time-specific schedules by archetype
    var schedules = {
      merchant: {
        dawn: { zone: 'agora', activity: 'setting_up_stall', priority: 0.8 },
        morning: { zone: 'agora', activity: 'tend_shop', priority: 1.0 },
        midday: { zone: 'agora', activity: 'tend_shop', priority: 1.0 },
        afternoon: { zone: 'agora', activity: 'tend_shop', priority: 1.0 },
        evening: { zone: 'commons', activity: 'socialize', priority: 0.6 },
        night: { zone: 'commons', activity: 'rest', priority: 0.3 }
      },
      scholar: {
        dawn: { zone: 'athenaeum', activity: 'research', priority: 0.5 },
        morning: { zone: 'athenaeum', activity: 'study', priority: 1.0 },
        midday: { zone: 'agora', activity: 'socialize_eat', priority: 0.8 },
        afternoon: { zone: 'gardens', activity: 'wander', priority: 0.6 },
        evening: { zone: 'commons', activity: 'socialize', priority: 0.9 },
        night: { zone: 'athenaeum', activity: 'rest', priority: 0.2 }
      },
      gardener: {
        dawn: { zone: 'gardens', activity: 'tend_plants', priority: 1.0 },
        morning: { zone: 'gardens', activity: 'tend_plants', priority: 1.0 },
        midday: { zone: 'gardens', activity: 'harvest', priority: 0.9 },
        afternoon: { zone: 'agora', activity: 'sell_harvest', priority: 0.8 },
        evening: { zone: 'commons', activity: 'socialize', priority: 0.6 },
        night: { zone: 'gardens', activity: 'rest', priority: 0.3 }
      },
      artist: {
        dawn: { zone: 'gardens', activity: 'find_inspiration', priority: 0.7 },
        morning: { zone: 'studio', activity: 'create_art', priority: 1.0 },
        midday: { zone: 'studio', activity: 'create_art', priority: 0.9 },
        afternoon: { zone: 'studio', activity: 'create_art', priority: 0.8 },
        evening: { zone: 'commons', activity: 'show_work', priority: 0.9 },
        night: { zone: 'gardens', activity: 'observe_beauty', priority: 0.5 }
      },
      warrior: {
        dawn: { zone: 'arena', activity: 'warm_up', priority: 0.8 },
        morning: { zone: 'arena', activity: 'train', priority: 1.0 },
        midday: { zone: 'wilds', activity: 'patrol', priority: 0.9 },
        afternoon: { zone: 'wilds', activity: 'patrol', priority: 0.8 },
        evening: { zone: 'commons', activity: 'socialize', priority: 0.7 },
        night: { zone: 'arena', activity: 'rest', priority: 0.3 }
      },
      explorer: {
        dawn: { zone: 'wilds', activity: 'explore_wilds', priority: 1.0 },
        morning: { zone: 'wilds', activity: 'explore_wilds', priority: 1.0 },
        midday: { zone: 'agora', activity: 'share_discoveries', priority: 0.7 },
        afternoon: { zone: 'athenaeum', activity: 'map_territory', priority: 0.6 },
        evening: { zone: 'commons', activity: 'share_discoveries', priority: 0.9 },
        night: { zone: 'wilds', activity: 'rest', priority: 0.2 }
      },
      storyteller: {
        dawn: { zone: 'athenaeum', activity: 'research', priority: 0.6 },
        morning: { zone: 'athenaeum', activity: 'collect_stories', priority: 0.9 },
        midday: { zone: 'agora', activity: 'socialize_eat', priority: 0.7 },
        afternoon: { zone: 'commons', activity: 'tell_stories', priority: 0.8 },
        evening: { zone: 'commons', activity: 'tell_stories', priority: 1.0 },
        night: { zone: 'athenaeum', activity: 'write_journal', priority: 0.4 }
      },
      teacher: {
        dawn: { zone: 'athenaeum', activity: 'prepare', priority: 0.6 },
        morning: { zone: 'athenaeum', activity: 'teach_lesson', priority: 1.0 },
        midday: { zone: 'gardens', activity: 'socialize_eat', priority: 0.7 },
        afternoon: { zone: 'athenaeum', activity: 'teach_lesson', priority: 1.0 },
        evening: { zone: 'commons', activity: 'socialize', priority: 0.6 },
        night: { zone: 'athenaeum', activity: 'research', priority: 0.5 }
      },
      musician: {
        dawn: { zone: 'gardens', activity: 'compose', priority: 0.5 },
        morning: { zone: 'studio', activity: 'compose', priority: 0.8 },
        midday: { zone: 'agora', activity: 'perform', priority: 0.7 },
        afternoon: { zone: 'commons', activity: 'perform', priority: 0.8 },
        evening: { zone: 'commons', activity: 'perform', priority: 1.0 },
        night: { zone: 'gardens', activity: 'tune_instrument', priority: 0.4 }
      },
      healer: {
        dawn: { zone: 'gardens', activity: 'gather_herbs', priority: 1.0 },
        morning: { zone: 'gardens', activity: 'gather_herbs', priority: 0.9 },
        midday: { zone: 'agora', activity: 'tend_wounded', priority: 0.9 },
        afternoon: { zone: 'commons', activity: 'offer_comfort', priority: 0.7 },
        evening: { zone: 'gardens', activity: 'meditate', priority: 0.6 },
        night: { zone: 'gardens', activity: 'meditate', priority: 0.5 }
      },
      philosopher: {
        dawn: { zone: 'gardens', activity: 'contemplate', priority: 0.7 },
        morning: { zone: 'athenaeum', activity: 'research', priority: 0.8 },
        midday: { zone: 'agora', activity: 'debate', priority: 0.6 },
        afternoon: { zone: 'gardens', activity: 'contemplate', priority: 0.9 },
        evening: { zone: 'commons', activity: 'discuss_ideas', priority: 0.9 },
        night: { zone: 'gardens', activity: 'stargaze', priority: 1.0 }
      },
      builder: {
        dawn: { zone: 'commons', activity: 'prepare', priority: 0.5 },
        morning: { zone: 'commons', activity: 'inspect_structures', priority: 1.0 },
        midday: { zone: 'agora', activity: 'gather_materials', priority: 0.8 },
        afternoon: { zone: 'commons', activity: 'inspect_structures', priority: 1.0 },
        evening: { zone: 'commons', activity: 'discuss_plans', priority: 0.7 },
        night: { zone: 'commons', activity: 'sketch_designs', priority: 0.4 }
      }
    };

    // Get archetype-specific schedule or fallback
    var archetypeSchedule = schedules[archetype] || {};
    var timeSchedule = archetypeSchedule[timeOfDay];

    if (timeSchedule) {
      return timeSchedule;
    }

    // Fallback based on general schedule
    if (schedule.work_priority > 0.7) {
      return { zone: defaultZone, activity: drives.primary, priority: schedule.work_priority };
    } else if (schedule.social_chance > 0.7) {
      return { zone: 'commons', activity: drives.social, priority: schedule.social_chance };
    } else if (schedule.energy_regen > 0.5) {
      return { zone: defaultZone, activity: drives.rest, priority: 0.5 };
    }

    return { zone: defaultZone, activity: 'idle', priority: 0.3 };
  }

  /**
   * Get NPC reaction to events (weather, player proximity)
   * @param {object} npcData - NPC data {archetype, position, etc}
   * @param {object} event - Event {type, weather, playerPos, etc}
   * @returns {object} - {action, dialogue, animation}
   */
  function getNPCReaction(npcData, event) {
    var archetype = npcData.archetype;
    var drives = ARCHETYPE_DRIVES[archetype];

    if (event.type === 'weather') {
      var weather = event.weather;

      // Rain reaction
      if (weather === 'rain') {
        if (drives.weather_preference === 'rain') {
          return {
            action: 'celebrate',
            dialogue: 'Rain! Perfect weather!',
            animation: 'dance',
            shouldSeekShelter: false
          };
        } else if (drives.weather_preference === 'any') {
          return {
            action: 'continue',
            dialogue: null,
            animation: 'walk',
            shouldSeekShelter: false
          };
        } else {
          return {
            action: 'seek_shelter',
            dialogue: 'Quick, need to get under cover!',
            animation: 'run',
            shouldSeekShelter: true
          };
        }
      }

      // Clear weather reaction
      if (weather === 'clear' && drives.weather_preference === 'clear') {
        return {
          action: 'enjoy',
          dialogue: 'Beautiful day!',
          animation: 'idle',
          shouldSeekShelter: false
        };
      }
    }

    if (event.type === 'player_proximity') {
      var distance = event.distance;

      if (distance < 3) {
        return {
          action: 'greet',
          dialogue: 'Hello there!',
          animation: 'wave',
          shouldSeekShelter: false
        };
      } else if (distance < 8) {
        return {
          action: 'acknowledge',
          dialogue: null,
          animation: 'look',
          shouldSeekShelter: false
        };
      }
    }

    return {
      action: 'none',
      dialogue: null,
      animation: null,
      shouldSeekShelter: false
    };
  }

  /**
   * Generate NPC-to-NPC interaction
   * @param {object} npc1 - First NPC {id, name, archetype, position}
   * @param {object} npc2 - Second NPC {id, name, archetype, position}
   * @returns {object} - {type, dialogue, animation, duration}
   */
  function generateNPCInteraction(npc1, npc2) {
    var arch1 = npc1.archetype;
    var arch2 = npc2.archetype;

    // Check for collaborative activity
    var collab = getCollaborativeActivity(arch1, arch2);
    if (collab && Math.random() < 0.3) {
      return {
        type: 'collaborate',
        dialogue: npc1.name + ' and ' + npc2.name + ' are ' + collab.description,
        animation: collab.animation,
        duration: 10000 // 10 seconds
      };
    }

    // Check for conversation
    var conversation = generateConversation(npc1.name, arch1, npc2.name, arch2);
    if (conversation && Math.random() < 0.4) {
      return {
        type: 'converse',
        dialogue: conversation[0], // First line of conversation
        fullConversation: conversation,
        animation: 'talk',
        duration: conversation.length * 3000 // 3 seconds per line
      };
    }

    // Simple greeting
    var greeting = ARCHETYPE_REACTIONS[arch1];
    if (greeting && greeting[arch2]) {
      return {
        type: 'greet',
        dialogue: greeting[arch2],
        animation: 'wave',
        duration: 5000 // 5 seconds
      };
    }

    // Default friendly acknowledgment
    return {
      type: 'acknowledge',
      dialogue: npc1.name + ' nods to ' + npc2.name,
      animation: 'nod',
      duration: 2000 // 2 seconds
    };
  }

  // ============================================================================
  // EXPORTS
  // ============================================================================

  exports.createNpcBrain = createNpcBrain;
  exports.updateBrain = updateBrain;
  exports.perceive = perceive;
  exports.getDecision = getDecision;
  exports.handleEvent = handleEvent;
  exports.getDialogue = getDialogue;
  exports.getMemory = getMemory;
  exports.getMood = getMood;
  exports.getGoal = getGoal;
  exports.getDetailedGoal = getDetailedGoal;
  exports.generateConversation = generateConversation;
  exports.getCollaborativeActivity = getCollaborativeActivity;
  exports.applyEmotionalContagion = applyEmotionalContagion;
  exports.getPointOfInterest = getPointOfInterest;
  exports.generateGossip = generateGossip;
  exports.getLore = getLore;
  exports.getTeaching = getTeaching;
  exports.ARCHETYPE_DRIVES = ARCHETYPE_DRIVES;
  exports.DAILY_SCHEDULE = DAILY_SCHEDULE;
  exports.MOODS = MOODS;
  exports.ZONE_DIALOGUES = ZONE_DIALOGUES;
  exports.ARCHETYPE_REACTIONS = ARCHETYPE_REACTIONS;
  exports.QUEST_HOOKS = QUEST_HOOKS;
  exports.NPC_CONVERSATIONS = NPC_CONVERSATIONS;
  exports.COLLABORATIVE_ACTIVITIES = COLLABORATIVE_ACTIVITIES;
  exports.POINTS_OF_INTEREST = POINTS_OF_INTEREST;
  exports.WORLD_LORE = WORLD_LORE;
  exports.ARCHETYPE_LORE = ARCHETYPE_LORE;
  exports.TEACHINGS = TEACHINGS;
  exports.getDailySchedule = getDailySchedule;
  exports.getNPCReaction = getNPCReaction;
  exports.generateNPCInteraction = generateNPCInteraction;

})(typeof module !== 'undefined' ? module.exports : (window.NpcAI = {}));
