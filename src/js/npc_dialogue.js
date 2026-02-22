// npc_dialogue.js
/**
 * npc_dialogue.js — LLM-Powered NPC Dialogue System for ZION
 *
 * Provides prompt construction, response parsing, fallback responses,
 * dialogue management, memory integration, and culture emergence detection.
 *
 * UMD module: works in browser (window.NpcDialogue) and Node.js
 */
(function(exports) {
  'use strict';

  // ============================================================================
  // CONSTANTS
  // ============================================================================

  var MAX_PROMPT_CHARS = 2000;       // ~500 tokens at 4 chars/token
  var MAX_SPEECH_CHARS = 200;        // Max speech bubble length
  var DEFAULT_COOLDOWN_MS = 30000;   // 30 seconds between NPC utterances
  var DEFAULT_MAX_QUEUE = 50;        // Max pending dialogue requests
  var TREND_MIN_OCCURRENCES = 2;     // Min mentions for a trend to register
  var MEMORY_MAX_INTERACTIONS = 20;  // How many interactions to remember

  // ============================================================================
  // ARCHETYPE VOICE PROFILES
  // ============================================================================

  var VOICE_PROFILES = {
    gardener: {
      style: 'warm, nurturing, uses plant metaphors',
      markers: ['bloom', 'grow', 'root', 'soil', 'harvest', 'seed', 'tend', 'flourish'],
      openers: ['The soil tells me', 'Like a young seedling', 'In the garden of', 'Let it grow'],
      mood: 'peaceful and caring'
    },
    builder: {
      style: 'practical, direct, uses spatial language',
      markers: ['structure', 'foundation', 'build', 'craft', 'design', 'solid', 'measure'],
      openers: ['From the ground up', 'Let me be direct', 'The foundation is', 'Structurally speaking'],
      mood: 'focused and methodical'
    },
    storyteller: {
      style: 'dramatic, narrative structure, often begins with "Once..." or "There was..."',
      markers: ['once', 'tale', 'legend', 'story', 'chapter', 'narrative', 'journey'],
      openers: ['Once upon a time', 'There was a day', 'Legend has it', 'Let me tell you of'],
      mood: 'dramatic and engaging'
    },
    merchant: {
      style: 'shrewd, value-aware, deal-making language',
      markers: ['trade', 'value', 'deal', 'exchange', 'profit', 'cost', 'worth', 'fair'],
      openers: ['Let me offer you', 'A fair trade would be', "I'll tell you what", 'The value here is'],
      mood: 'calculating but friendly'
    },
    explorer: {
      style: 'excited, uses discovery language, often begins with "Have you seen..."',
      markers: ['discover', 'found', 'explore', 'adventure', 'uncharted', 'horizon', 'journey'],
      openers: ['Have you seen', 'Just discovered', 'Beyond that ridge', 'I mapped a new'],
      mood: 'excited and curious'
    },
    teacher: {
      style: 'patient, questioning, Socratic style',
      markers: ['consider', 'what if', 'think', 'learn', 'understand', 'question', 'wisdom'],
      openers: ['Have you considered', 'What do you think', 'A wise person once', 'Consider this'],
      mood: 'patient and thoughtful'
    },
    musician: {
      style: 'lyrical, rhythmic speech, references sounds and music',
      markers: ['melody', 'rhythm', 'harmony', 'song', 'notes', 'vibration', 'tune', 'play'],
      openers: ['The melody of', 'In perfect harmony', 'Life has a rhythm', 'Listen closely'],
      mood: 'expressive and rhythmic'
    },
    healer: {
      style: 'empathetic, gentle, body and wellness language',
      markers: ['heal', 'care', 'rest', 'breathe', 'gentle', 'balance', 'restore', 'comfort'],
      openers: ['Take a deep breath', 'Your wellbeing matters', 'Let me help you', 'With gentle care'],
      mood: 'compassionate and calm'
    },
    philosopher: {
      style: 'questioning, abstract, often uses "What if..." or poses dilemmas',
      markers: ['truth', 'existence', 'meaning', 'wonder', 'contemplate', 'ponder', 'essence'],
      openers: ['What if we considered', 'The deeper question is', 'In the grand scheme', 'Ponder this'],
      mood: 'contemplative and abstract'
    },
    artist: {
      style: 'visual, emotional, references color, shape, and beauty',
      markers: ['color', 'light', 'beautiful', 'create', 'inspire', 'vision', 'texture', 'express'],
      openers: ['The colors here remind me', 'I see beauty in', 'Art is everywhere', 'Notice the light'],
      mood: 'creative and emotionally expressive'
    }
  };

  // ============================================================================
  // FALLBACK RESPONSE POOLS (per archetype, per context)
  // Keyed by archetype, then context type
  // ============================================================================

  var FALLBACK_POOLS = {
    gardener: {
      greeting: [
        "Welcome! The gardens are alive with color today.",
        "Ah, a visitor! Let me show you the moonflowers.",
        "Hello, friend. Have you ever seen soil this rich?",
        "Welcome to the gardens — feel free to take in the beauty.",
        "Greetings! The herbs are especially fragrant today.",
        "Hello there! Every plant here has a story to tell.",
        "Welcome! Like a new seed, you've found good ground.",
        "Come in, come in! The garden always has room for more.",
        "Well met! I just finished planting a new flower bed.",
        "Hello! The garden whispers your name in the breeze."
      ],
      zone_comment: [
        "These gardens are the heart of ZION — life flows from here.",
        "Every flower here was planted with intention and love.",
        "The soil remembers every rain, every season.",
        "I tend this land daily. It gives back tenfold.",
        "Gardens teach patience — you can't rush a bloom.",
        "Notice how the light falls differently each hour here.",
        "This zone breathes. You can feel it if you stand still.",
        "Every path through here was worn by gentle footsteps.",
        "The gardens know when someone cares for them.",
        "We planted the first seeds here together as a community."
      ],
      idle_chat: [
        "The compost bin is turning beautifully this week.",
        "I'm deciding what to plant in the east bed next season.",
        "Did you know each flower here has medicinal uses?",
        "I've been cross-breeding two varieties — exciting experiment!",
        "The bees have been especially active today.",
        "Sometimes I just sit and watch the plants grow.",
        "A garden is a conversation between human and earth.",
        "I found a rare seedling on the hillside this morning.",
        "The rain last night was a gift to the soil.",
        "I dream in greens and bloom-colors."
      ],
      weather: [
        "Rain is a gardener's greatest ally — welcome, clouds!",
        "Sunshine like this makes everything grow just a bit faster.",
        "Storm coming? The plants can feel it too.",
        "Perfect weather for transplanting today.",
        "The mist this morning was magical on the flower beds.",
        "Wind like this carries seeds to new places — I love it.",
        "A cloudy day means I can work longer without the heat.",
        "The weather shapes the garden as much as my hands do.",
        "I planted these drought-resistant varieties just in time.",
        "Every weather pattern teaches the garden something new."
      ],
      craft: [
        "I'm weaving a basket to carry my harvest tools.",
        "I pressed some flowers earlier — nature's artwork.",
        "Making a tincture from these herbs takes real patience.",
        "I've been composting — turning waste into wealth.",
        "Grafting two rose varieties together is delicate work.",
        "I hand-tied every vine to the trellis this morning.",
        "Drying these herbs will preserve their strength all winter.",
        "I'm constructing a new raised bed from reclaimed wood.",
        "Seed sorting is meditative — I love every moment of it.",
        "My latest project: a garden that blooms in moonlight."
      ]
    },

    builder: {
      greeting: [
        "Hey! Solid ground here — good place to start something.",
        "Welcome. I was just reviewing some structural plans.",
        "Hello! Every great city starts with a single stone.",
        "Greetings. You look like someone who appreciates good construction.",
        "Good to see you. The agora has some impressive new foundations.",
        "Welcome to ZION — built to last, designed to inspire.",
        "Hello there. I was just measuring the load capacity here.",
        "Well met. Notice the craftsmanship on that archway?",
        "Hey! I can tell you built something once — the look in your eyes.",
        "Welcome. Strong foundations make strong communities."
      ],
      zone_comment: [
        "The agora's market stalls are structurally impressive.",
        "I designed those arches — three-point load distribution.",
        "Everything here was built to last a hundred years.",
        "The materials from the wilds made for excellent timber.",
        "That wall there has a hidden drainage channel inside.",
        "I love how the light hits these stone surfaces at dusk.",
        "Every structure in ZION started as a sketch in my notebook.",
        "The nexus obelisk — now THAT is a construction challenge.",
        "I've surveyed every zone. This one has the best site lines.",
        "Building in community is different — each stone has a story."
      ],
      idle_chat: [
        "I'm calculating the beam load for a new workshop extension.",
        "Timber or stone? That's the eternal builder's dilemma.",
        "I've been sketching plans for a public bathhouse.",
        "Measure twice, cut once — the builder's first law.",
        "The quarry site has some promising granite deposits.",
        "I just finished a commission — a communal storage hall.",
        "I've been stress-testing new mortar mixtures all week.",
        "A good roof changes everything about a space.",
        "I'm prototyping a new joint design — stronger than any before.",
        "Space shapes behavior — that's what architecture is really about."
      ],
      weather: [
        "Wind this strong tests mortar joints — I'm taking notes.",
        "Rain reveals every flaw in a structure. Educational.",
        "Perfect dry weather for laying stone foundations.",
        "I designed the drainage here specifically for heavy rain.",
        "Hot sun like this cures mortar faster — efficient.",
        "Storm coming — checking all the anchoring points.",
        "A builder reads weather like a farmer reads soil.",
        "I reinforced those windows before the last big storm.",
        "Humidity affects wood expansion — I account for it.",
        "Every storm improves the next building I design."
      ],
      craft: [
        "Joining two load-bearing beams is art and engineering combined.",
        "I'm hand-carving decorative corbels for the library extension.",
        "Cutting precise dovetail joints takes years of practice.",
        "I mixed a new plaster formula — smoother than ever.",
        "Laying a perfectly level floor is deeply satisfying.",
        "I forge my own tools — custom weight and balance.",
        "Today: fitting the keystone into a new archway.",
        "Stonemasonry and patience are the same skill.",
        "The joints in that wall will outlast us all.",
        "I'm crafting a scale model before the real build."
      ]
    },

    storyteller: {
      greeting: [
        "Ah, a new face! Every face holds a story untold.",
        "Welcome! I was just composing a verse about this very moment.",
        "Greetings, traveler! I hope your journey here was eventful.",
        "There was once a stranger who walked into ZION... that's you!",
        "Hello! Legend has it the best stories begin with a chance meeting.",
        "Welcome! Sit — let me tell you how this world began.",
        "Once, on a day like today, a hero arrived. Perhaps that is you.",
        "Ah! A new chapter begins. Welcome to ZION.",
        "Greetings! Your arrival adds a page to our ongoing saga.",
        "Hello, friend. Every great story needs a new character."
      ],
      zone_comment: [
        "The athenaeum holds a thousand tales between its walls.",
        "Once, the agora witnessed a debate that changed everything.",
        "The gardens have been the setting for love stories and tragedies.",
        "This zone is where Act Two always happens — the turning point.",
        "The nexus is where all paths cross — and stories intertwine.",
        "Every stone here has witnessed something worth remembering.",
        "The wilds hold stories older than any of us know.",
        "I recorded everything that happened here in my chronicle.",
        "They say this place was founded by dreamers — I believe it.",
        "The echo here carries words spoken long ago."
      ],
      idle_chat: [
        "I'm writing the third volume of the ZION Chronicles.",
        "A good story requires a villain — even if it's just winter.",
        "The best tales I've collected came from unexpected people.",
        "I've been interviewing every NPC in ZION for their stories.",
        "Plot twist: the gardener was a philosopher all along.",
        "My quill is worn from writing. That means it was a good day.",
        "I've been searching for the perfect ending to an old tale.",
        "Every conversation I have becomes research.",
        "I'm cataloging the oral traditions of ZION's founding.",
        "Some stories take years to be ready to be told."
      ],
      weather: [
        "A storm like this inspired one of my best passages.",
        "Rain and candlelight — perfect conditions for writing.",
        "The wind tonight reminds me of the tale of the wandering bard.",
        "Every weather pattern becomes atmosphere in a good story.",
        "Sunshine like this was how I described the hero's victory.",
        "The mist reminds me of the legend of the ghost gardener.",
        "Nature writes the best first drafts. I just transcribe.",
        "Thunder! Perfect punctuation for a dramatic chapter.",
        "A clear night sky is where the oldest stories were written.",
        "Even the weather here tells a story if you listen."
      ],
      craft: [
        "Crafting a narrative arc is harder than it sounds.",
        "I'm illustrating my new collection with hand-drawn maps.",
        "Binding a book by hand is its own kind of storytelling.",
        "Writing the perfect opening sentence took me three days.",
        "I'm composing a ballad about the founding of ZION.",
        "Character development is everything — plot is just what happens.",
        "I've been carving story-runes into this walking staff.",
        "The craft of dialogue is knowing when NOT to speak.",
        "Every revision makes the story more true.",
        "I'm compiling an anthology of every voice in this world."
      ]
    },

    merchant: {
      greeting: [
        "Welcome! I always say good business starts with good people.",
        "Hello there! See anything that catches your eye?",
        "Greetings! I just got a fresh shipment you might like.",
        "Welcome to my corner of ZION — fair prices, honest trade.",
        "Ah, a potential customer! Let me tell you what's special today.",
        "Hello! The best deals go fast — good timing on your part.",
        "Welcome. I believe in mutual benefit — shall we talk?",
        "Greetings! Every transaction is the start of a relationship.",
        "Hello! I've been expecting someone with your discerning eye.",
        "Welcome — I have something rare that might interest you."
      ],
      zone_comment: [
        "The agora is ZION's economic heart — and I know every beat.",
        "Market conditions here are favorable. I've studied the patterns.",
        "Every stall in this market has a specialty. Mine is quality.",
        "I've traded across every zone — the agora has the best flow.",
        "This location gets foot traffic from all directions. Ideal.",
        "The commerce here benefits everyone — that's sustainable trade.",
        "I've built my reputation here over hundreds of transactions.",
        "Value flows from where trust is established. That's here.",
        "The market has its own rhythm — I've learned to read it.",
        "Every zone has something to offer. I connect them all."
      ],
      idle_chat: [
        "I'm reviewing my inventory manifest from yesterday's trades.",
        "Supply and demand — once you understand it, everything's clear.",
        "I've been researching what resources are scarce in the wilds.",
        "A good merchant knows when NOT to sell as well as when to.",
        "I traded three rare gems for exclusive garden produce today.",
        "Negotiation is an art. I practice it every day.",
        "I keep a ledger of every transaction — patterns emerge.",
        "The best deal I ever made was built on mutual respect.",
        "I'm scouting for new trade routes between zones.",
        "Commerce is community — money is just the language."
      ],
      weather: [
        "Rain slows the foot traffic but the serious buyers still come.",
        "Clear skies mean more visitors — better for business.",
        "I keep waterproof tarps for exactly this kind of weather.",
        "A hot day means cold goods sell fast. I've prepared.",
        "Wind like this blows away casual browsers — good for focus.",
        "Storm warning? I've already secured my inventory.",
        "Every weather condition creates different trading opportunities.",
        "I sell hand-made umbrellas when it rains. Always prepared.",
        "The weather affects prices. I track it like a ledger.",
        "Sun or storm — a merchant adapts."
      ],
      craft: [
        "I've been crafting specialized carrying cases for rare goods.",
        "Pricing is a craft — it requires skill and knowledge.",
        "I'm hand-lettering new signs for my market stall.",
        "Contract writing is an underrated craft. I take it seriously.",
        "I've been making custom packaging for fragile trade goods.",
        "Negotiating a multi-party trade deal takes real craft.",
        "I'm crafting a new display system for rare artifacts.",
        "The craft of appraisal takes decades to master.",
        "I've been building a reference compendium of goods and values.",
        "Packaging is part of the value — I craft it carefully."
      ]
    },

    explorer: {
      greeting: [
        "Have you seen the northern peaks? Incredible view up there!",
        "Hello! Just got back from the outer wilds — you won't believe it.",
        "Welcome! I mapped three new trails this week.",
        "Hey! If you haven't been to the coastal cliffs yet, go NOW.",
        "Greetings! The world is so much bigger than the map suggests.",
        "Welcome to ZION! I know all the secret paths if you're interested.",
        "Hello, adventurer! I can tell you have wandering eyes.",
        "Hey! Adventure finds the ones who seek it. Like us.",
        "Welcome! I've been waiting for someone to share my discoveries with.",
        "Greetings! Every corner of this world holds a wonder."
      ],
      zone_comment: [
        "The wilds extend much further than the official maps show.",
        "I found a hidden valley beyond the eastern ridge yesterday.",
        "This zone has three secret passages most people never find.",
        "The terrain changes dramatically just past that treeline.",
        "I've catalogued every landmark in a five-zone radius.",
        "There's a waterfall hidden behind the moss wall over there.",
        "The best view in all of ZION is from the cliffside I found.",
        "I've camped in every zone — the wilds has the best stars.",
        "The ecosystem shifts exactly fifty paces past this point.",
        "This spot is an old trail crossing — you can see the worn stone."
      ],
      idle_chat: [
        "I'm updating my map with three new trail markers.",
        "Just finished a full perimeter survey of the wilds.",
        "The creature migration patterns changed this season.",
        "I've been comparing old maps with new — things have shifted.",
        "My next expedition: the fog zone at the world's edge.",
        "I found evidence of structures older than ZION itself.",
        "Have you explored every zone? I have a checklist.",
        "The horizon is always more interesting than where you stand.",
        "I keep a journal of every discovery — it's five volumes now.",
        "There's always more to find. That's what keeps me going."
      ],
      weather: [
        "Rain like this reveals hidden streams I'd never have noticed.",
        "Wind from the north means the fog will clear by afternoon.",
        "Perfect storm conditions for observing how terrain changes.",
        "I've explored in every weather — storms are the most exciting.",
        "Mist like this is perfect for finding hidden paths.",
        "Lightning last night revealed a cave I'd never seen before.",
        "Explorers don't wait for good weather. We find beauty in all.",
        "Snow would open up new terrain — I can't wait.",
        "The rain reveals the true drainage of this landscape.",
        "Weather is just terrain in the sky."
      ],
      craft: [
        "I'm hand-drawing a detailed topographic map of the eastern zones.",
        "Crafting a reliable compass from local materials was a challenge.",
        "I've been building a lightweight shelter system for expeditions.",
        "Making waterproof trail markers is surprisingly technical.",
        "I've been assembling an explorer's field kit from local materials.",
        "Craft a good camp and the wilderness becomes your home.",
        "I've been weaving rope strong enough for cliff descents.",
        "Repairing my pack after the last expedition took all morning.",
        "I made a sextant replica to practice celestial navigation.",
        "Every tool I carry, I made or modified myself."
      ]
    },

    teacher: {
      greeting: [
        "Welcome! Tell me — what would you like to learn today?",
        "Greetings! Every moment is an opportunity to learn something.",
        "Hello! I always find that new faces ask the best questions.",
        "Welcome to ZION. What knowledge brought you here?",
        "Greetings! A student arrives at the perfect moment.",
        "Hello. Have you considered what you already know?",
        "Welcome! Teaching begins with listening. So — how are you?",
        "Greetings! I've prepared a new lesson plan you might enjoy.",
        "Hello! Wisdom is the one resource that grows when shared.",
        "Welcome! Ask me anything — I love a good question."
      ],
      zone_comment: [
        "The athenaeum holds knowledge that takes lifetimes to exhaust.",
        "This space was designed for learning — notice the acoustics.",
        "Every surface here has been touched by a student's curiosity.",
        "I've taught here for many seasons. The students teach me too.",
        "Knowledge radiates outward from places like this.",
        "The scrolls in the athenaeum date back to ZION's founding.",
        "Have you considered why this zone was placed at this location?",
        "A learning environment shapes the quality of thinking itself.",
        "Every student who sat here left something behind.",
        "The library's collection grows by twelve volumes per season."
      ],
      idle_chat: [
        "I've been preparing a series of lectures on ZION's history.",
        "What do you think is the most important thing to teach a child?",
        "I'm revising my curriculum based on last season's questions.",
        "A good question is worth more than a hundred good answers.",
        "I've been corresponding with philosophers across all zones.",
        "My students asked me something yesterday I couldn't answer. Wonderful.",
        "Learning never stops — even for the teacher.",
        "I'm compiling questions no one has answered yet.",
        "The best lesson I ever taught was the one I hadn't planned.",
        "Education is the gift that can't be taken away."
      ],
      weather: [
        "Rain is an excellent metaphor for how knowledge accumulates.",
        "I asked my students to describe the storm using only verbs.",
        "Weather provides endless natural science opportunities.",
        "Have you considered why rain falls downward and not upward?",
        "The sun's angle today would make a fine geometry lesson.",
        "Mist like this is perfect for discussing atmospheric science.",
        "I assign outdoor observation during weather like this.",
        "Wind carries seeds — and ideas — farther than we expect.",
        "Every natural phenomenon is a question waiting to be asked.",
        "A good teacher turns every thunderstorm into a lecture."
      ],
      craft: [
        "I'm hand-illustrating a new educational text on botany.",
        "Teaching is a craft that improves only through practice.",
        "I've been designing interactive learning tools for the library.",
        "Writing curriculum is like crafting a journey for the mind.",
        "I'm building model structures to illustrate architectural concepts.",
        "The craft of explaining complex ideas simply — that takes years.",
        "I've been carving educational relief maps for tactile learners.",
        "Binding a textbook is the final step in creating knowledge.",
        "I'm crafting question cards for collaborative learning sessions.",
        "A lesson plan is a blueprint for discovery."
      ]
    },

    musician: {
      greeting: [
        "Welcome! Can you hear the music in this world?",
        "Hello! The wind makes a perfect fifth today.",
        "Greetings! I was just composing something for this moment.",
        "Welcome to ZION — have you noticed it has its own song?",
        "Hello! Music is the fastest way to feel at home.",
        "Greetings! Every footstep here is part of a rhythm.",
        "Welcome! I've been waiting to share a new melody.",
        "Hello, friend! The world sounds different with fresh ears.",
        "Greetings! I could write a whole symphony about this place.",
        "Welcome! If you listen carefully, ZION hums."
      ],
      zone_comment: [
        "The acoustics here are extraordinary — listen to that echo.",
        "The agora's market sounds form a natural symphony.",
        "I perform in this zone every evening — the resonance is perfect.",
        "The gardens have a subsonic hum on quiet mornings.",
        "Sound travels differently here. I've mapped the acoustic zones.",
        "Every zone in ZION has its own musical key, I believe.",
        "The stone walls here create natural reverb. Extraordinary.",
        "I've recorded the ambient sounds of every zone.",
        "The wind through those arches plays a natural flute note.",
        "When rain falls here, it creates my favorite percussion."
      ],
      idle_chat: [
        "I'm transcribing a melody I dreamed last night.",
        "The pentatonic scale works beautifully for ZION's atmosphere.",
        "I've been collecting folk songs from every zone.",
        "A good improvisation session teaches you who you really are.",
        "I've been experimenting with harmonic structures from nature.",
        "Sometimes silence is the most important note.",
        "I'm composing a piece that captures all four seasons.",
        "The intervals between sounds matter as much as the sounds.",
        "I've been teaching rhythm workshops at the agora.",
        "Music is time made beautiful."
      ],
      weather: [
        "Rain is perfect percussion — I've been recording it.",
        "Wind like this creates a natural drone note. I love it.",
        "A storm is the world's most powerful orchestra.",
        "I hear a dominant seventh chord in that thunder.",
        "The silence before a storm is the best rest I know.",
        "Sun and birdsong create a natural major key atmosphere.",
        "Mist softens all the sounds into something dreamlike.",
        "I compose specifically to weather. Rain pieces, sun pieces.",
        "Every weather pattern has its own rhythm and tempo.",
        "Nature plays the opening movement. I write the rest."
      ],
      craft: [
        "I've been hand-crafting a new string instrument from local wood.",
        "Composing is like architecture — structure supports freedom.",
        "I'm refining a new tuning system for this climate.",
        "Hand-carving the sound holes is the most precise work.",
        "I've been inlaying decorative patterns into my instrument.",
        "Writing music notation by hand is a meditative practice.",
        "I'm crafting a reed instrument from marsh grass.",
        "The craft of improvisation takes a lifetime of preparation.",
        "I've been building a percussion ensemble from found objects.",
        "Crafting a lute from scratch changes how you understand music."
      ]
    },

    healer: {
      greeting: [
        "Welcome! Take a deep breath — you're safe here.",
        "Hello there. How are you, truly?",
        "Greetings! The healing grove welcomes all who need rest.",
        "Welcome! I always have time to listen.",
        "Hello, friend. You look like you could use some calm.",
        "Greetings! Care is the first and most important medicine.",
        "Welcome! Let me know if there's anything I can do.",
        "Hello. Sometimes just being greeted is what's needed most.",
        "Welcome to ZION. Rest when you need — this is a safe place.",
        "Hello! Your presence here is a gift to us all."
      ],
      zone_comment: [
        "The gardens hold every medicinal plant ZION needs.",
        "The healing energy of this zone is palpable, isn't it?",
        "I've identified thirty-seven medicinal plants in this area.",
        "Water and greenery together create the best healing conditions.",
        "The air here has a quality that promotes deep breathing.",
        "I tend to the herbs in that bed — all for wellness purposes.",
        "This zone attracts those who need restoration.",
        "Every healer I know has spent time in the gardens.",
        "The sound of water here is therapeutic. Proven to calm the mind.",
        "I built a small sanctuary in the eastern part of this zone."
      ],
      idle_chat: [
        "I've been preparing a new herbal salve for sore muscles.",
        "Preventative care is the most powerful healing of all.",
        "I've been documenting the healing properties of local plants.",
        "Rest is underrated as a medicine. I prescribe it often.",
        "Community and connection heal things herbs can't.",
        "I've been practicing a new breathing technique.",
        "The body knows how to heal. I just help it remember.",
        "I'm creating a wellness guide for every zone in ZION.",
        "Listening without judgment is my most-used skill.",
        "A healer's work is never truly done — and that's beautiful."
      ],
      weather: [
        "Rain nourishes the medicinal herbs more than anything I do.",
        "The cool air after rain helps with inflammation.",
        "Sun like this is excellent for vitamin-rich herb growth.",
        "Mist in the morning is when I collect the finest dew.",
        "Storm energy can be grounding if you breathe through it.",
        "Cold weather means immunity tonics become essential.",
        "Every season brings different wellness challenges.",
        "Rain is the earth healing itself. I find it comforting.",
        "The wind carries healing pollen from the distant flowers.",
        "Weather is medicine when you learn to listen to it."
      ],
      craft: [
        "I've been crafting a new compound salve from seven herbs.",
        "Distilling herbal tinctures is precise, patient work.",
        "I'm weaving a new poultice wrap from medicinal fibers.",
        "Crafting a remedy requires understanding root causes.",
        "I'm blending a new tea mixture for stress and sleep.",
        "Hand-pressing herbal tablets is satisfying, careful work.",
        "I've been creating illustrated charts of medicinal plant uses.",
        "Steeping time affects potency — I time everything exactly.",
        "I'm crafting a new treatment protocol for cold-weather ailments.",
        "The craft of healing is mostly listening and observing."
      ]
    },

    philosopher: {
      greeting: [
        "Welcome! What if I told you your arrival was inevitable?",
        "Greetings. What is the nature of a greeting, truly?",
        "Hello! Have you ever considered what 'here' means?",
        "Welcome! The very act of meeting is a philosophical event.",
        "Greetings! I've been contemplating chance versus destiny.",
        "Hello, seeker! What question brought you to ZION?",
        "Welcome. What is it you're really looking for?",
        "Greetings! Every arrival is also a departure from somewhere.",
        "Hello! If a visitor arrives unseen, have they truly arrived?",
        "Welcome! The universe arranged this meeting. Interesting."
      ],
      zone_comment: [
        "What does a place mean when no one is observing it?",
        "This zone raises questions I've been pondering for seasons.",
        "Place shapes thought — have you felt that here?",
        "The athenaeum is where certainty goes to become questions.",
        "If a tree falls in the wilds with no one nearby... you know the rest.",
        "I chose this spot precisely because it provokes thinking.",
        "Every location in ZION holds a different philosophical mood.",
        "The nexus is where paradox is most comfortable.",
        "This zone feels like a question mark in spatial form.",
        "Space is a kind of argument made physical."
      ],
      idle_chat: [
        "I've been considering whether free will is compatible with fate.",
        "What if consciousness is what the universe uses to know itself?",
        "I'm tracing the history of an idea across multiple civilizations.",
        "The most important questions have the simplest surfaces.",
        "I've been cataloguing logical paradoxes found in nature.",
        "If you had to define ZION in one word, what would it be?",
        "I've been questioning the nature of questioning itself.",
        "What would ZION look like if no one remembered it?",
        "Thinking without a goal is the purest form of thinking.",
        "I've been wrong about something for years. Now I see it clearly."
      ],
      weather: [
        "Rain falls the same on philosopher and stone — equalizing.",
        "Is a storm violent, or is violence a human judgment?",
        "What if weather is the sky's way of having emotions?",
        "The sun illuminates — but what hides in that very light?",
        "Wind moves everything except the questions underneath.",
        "Thunder is the universe punctuating its own thoughts.",
        "What does it mean for weather to be 'good' or 'bad'?",
        "I observe the storm without preference. It simply is.",
        "Mist makes the familiar strange again. Philosophically useful.",
        "Every weather pattern reveals how we impose meaning on chaos."
      ],
      craft: [
        "Writing philosophy is less craft, more excavation.",
        "I'm constructing a thought experiment in essay form.",
        "The craft of argument is knowing when to stop speaking.",
        "I've been designing a new logical framework from first principles.",
        "Philosophical dialogue is the highest collaborative art.",
        "I'm mapping the connections between contradictory ideas.",
        "The structure of a sound argument is its own kind of beauty.",
        "I've been crafting counterarguments to my own positions.",
        "Writing a question is harder than writing an answer.",
        "The craft of philosophy is learning to sit with uncertainty."
      ]
    },

    artist: {
      greeting: [
        "Welcome! Notice the way light falls on everything here.",
        "Hello! I was just mixing a new color I discovered in the sunset.",
        "Greetings! Have you seen the mural by the eastern wall?",
        "Welcome! Your face has wonderful character — may I sketch you?",
        "Hello! Art is everywhere if you look with open eyes.",
        "Greetings! Something about your arrival inspired a new piece.",
        "Welcome to ZION! The beauty here is inexhaustible.",
        "Hello! I find strangers are often the most inspiring subjects.",
        "Greetings! This world deserves to be seen and made.",
        "Welcome! I've been painting since dawn — what do you see?"
      ],
      zone_comment: [
        "The light in this zone changes every hour — I never tire of it.",
        "I've painted this view from twenty different angles.",
        "Every texture here tells a story of wind, water, and time.",
        "The color palette of this zone shifts with the seasons.",
        "I installed three murals here — they've become landmarks.",
        "The way shadow falls in this space is endlessly interesting.",
        "Beauty reveals itself differently to different eyes here.",
        "I've filled seven sketchbooks just from this one zone.",
        "The negative space between these structures is as important as the structures.",
        "This zone inspired my most celebrated series."
      ],
      idle_chat: [
        "I've been experimenting with pigments made from local stones.",
        "Every piece I make is a conversation with the viewer.",
        "I've been studying how different surfaces accept color.",
        "Creativity is the practice of seeing what already exists.",
        "I'm working on a triptych inspired by the three moons.",
        "The hardest part of art is knowing when it's finished.",
        "I sketch everything — it's how I think.",
        "I've been creating sculptures from materials found in the wilds.",
        "Art without vulnerability is just decoration.",
        "I'm in a period of experimentation. Everything is allowed."
      ],
      weather: [
        "Rain changes color temperature dramatically — I love painting it.",
        "Storm light is the most dramatic light there is.",
        "The gray of an overcast sky has fifty different colors in it.",
        "Mist turns every scene into an impressionist painting.",
        "Golden hour in a storm is the most beautiful contradiction.",
        "I set up outside in the rain specifically to capture this.",
        "Every weather condition produces a different emotional palette.",
        "Wind creates movement in everything — animation for free.",
        "I have a whole series called 'Weather as Medium'.",
        "Snow would transform every color here. I can't wait."
      ],
      craft: [
        "I've been grinding local minerals into pigment all morning.",
        "The craft of seeing comes before the craft of making.",
        "I'm building a new frame from driftwood and copper wire.",
        "Mixing the perfect shade takes patience and intuition.",
        "I've been experimenting with encaustic wax painting.",
        "Every brushstroke is a decision — thousands per piece.",
        "I'm weaving a tapestry from naturally-dyed fibers.",
        "Hand-casting bronze sculptures is exhausting and beautiful.",
        "The craft of composition is knowing what to leave out.",
        "I'm creating a mosaic using only materials from ZION."
      ]
    }
  };

  // Default fallback pool for unknown archetypes
  var DEFAULT_FALLBACK_POOL = [
    "Welcome to ZION! It's a beautiful day.",
    "Hello there! I'm glad you found your way here.",
    "Greetings, traveler! What brings you to this part of the world?",
    "Good to see you! This place has something special about it.",
    "Hello! Every day here is a new adventure.",
    "Welcome! The community here is warm and welcoming.",
    "Greetings! I love meeting new people in ZION.",
    "Hello! There's always something interesting happening here.",
    "Welcome! Take your time and explore.",
    "Greetings! This world is full of wonders."
  ];

  // Context type to fallback pool key mapping
  var CONTEXT_TYPE_MAP = {
    'greeting': 'greeting',
    'zone_comment': 'zone_comment',
    'zone': 'zone_comment',
    'idle': 'idle_chat',
    'idle_chat': 'idle_chat',
    'weather': 'weather',
    'craft': 'craft',
    'crafting': 'craft'
  };

  // ============================================================================
  // STOP WORDS for topic detection
  // ============================================================================

  var STOP_WORDS = {
    'the': 1, 'a': 1, 'an': 1, 'and': 1, 'or': 1, 'but': 1, 'in': 1,
    'on': 1, 'at': 1, 'to': 1, 'for': 1, 'of': 1, 'with': 1, 'is': 1,
    'it': 1, 'i': 1, 'you': 1, 'we': 1, 'they': 1, 'this': 1, 'that': 1,
    'was': 1, 'are': 1, 'be': 1, 'been': 1, 'have': 1, 'has': 1, 'do': 1,
    'did': 1, 'so': 1, 'if': 1, 'my': 1, 'me': 1, 'he': 1, 'she': 1,
    'from': 1, 'by': 1, 'as': 1, 'not': 1, 'no': 1, 'can': 1, 'just': 1,
    'what': 1, 'how': 1, 'who': 1, 'when': 1, 'here': 1, 'there': 1,
    'like': 1, 'its': 1, 'all': 1, 'been': 1, 'about': 1, 'up': 1,
    'more': 1, 'some': 1, 'would': 1, 'their': 1, 'will': 1, 'your': 1
  };

  // ============================================================================
  // OPINION TEMPLATES per archetype for culture emergence
  // ============================================================================

  var OPINION_TEMPLATES = {
    gardener: [
      "From a gardener's view, {topic} is like planting — it takes patience and care.",
      "I think about {topic} the way I think about soil — it needs the right conditions to flourish.",
      "{topic} reminds me of tending plants. You have to listen to what's already there.",
      "My opinion on {topic}: nurture it, and it will grow. Rush it, and it won't.",
      "The gardens teach me about {topic} — everything cycles, everything has its season."
    ],
    builder: {
      templates: [
        "Let me be direct about {topic}: it needs a strong foundation or it will fail.",
        "The structure of {topic} matters more than its surface — I'd start from the base.",
        "My take on {topic}: measure twice, decide once. No shortcuts.",
        "{topic} is a construction problem. Identify the load-bearing elements.",
        "Practically speaking, {topic} requires clear planning before any action."
      ]
    },
    storyteller: {
      templates: [
        "There was once a world that faced {topic}... and here is what happened.",
        "Every great story has {topic} as its conflict. The question is the resolution.",
        "Legend says {topic} was decided long ago. But every legend can be rewritten.",
        "The most compelling chapter of any saga always involves {topic}.",
        "I've heard a hundred tales about {topic}. The wisest had no clear answer."
      ]
    },
    merchant: {
      templates: [
        "The value of {topic} depends entirely on what you're willing to trade for it.",
        "Let me assess {topic} like a trade: what's the cost, what's the benefit?",
        "In my experience, {topic} is worth investing in — when the timing is right.",
        "My honest appraisal of {topic}: undervalued by most, overrated by some.",
        "{topic} has real market potential. The smart move is to position early."
      ]
    },
    explorer: {
      templates: [
        "Have you explored every angle of {topic}? I find the edges most interesting.",
        "My first expedition into {topic} revealed things I hadn't expected.",
        "{topic} is uncharted territory for most people. That's exactly why it excites me.",
        "Beyond the obvious surface of {topic} is where the real discovery lives.",
        "I've mapped the terrain of {topic} and can tell you: the journey is worth it."
      ]
    },
    teacher: {
      templates: [
        "Consider this about {topic}: what do you already know, and what are you assuming?",
        "The key question about {topic} isn't what, but why. Start there.",
        "I've taught many lessons that touched on {topic}. The wisest students questioned everything.",
        "{topic} is a fascinating subject. What do YOU think about it?",
        "A Socratic approach to {topic}: challenge every assumption, find the root question."
      ]
    },
    musician: {
      templates: [
        "{topic} has a rhythm to it — sometimes you find it, sometimes you set it.",
        "In harmony terms, {topic} is a tension that wants resolution.",
        "There's a melody in {topic} if you listen for it.",
        "Every complex thing like {topic} has an underlying theme. Find that theme.",
        "My musical opinion on {topic}: it needs space. Let it breathe."
      ]
    },
    healer: {
      templates: [
        "From a wellness perspective, {topic} requires careful, gentle attention.",
        "I approach {topic} with the same care as healing — first, do no harm.",
        "The health of any situation like {topic} depends on what we nurture.",
        "{topic} can be a source of stress or strength. Choose your relationship with it.",
        "I believe {topic} needs compassion more than solutions right now."
      ]
    },
    philosopher: {
      templates: [
        "What if {topic} is not a problem but a question? Questions are more interesting.",
        "I've been contemplating {topic}. The more I consider it, the more uncertain I become.",
        "The true nature of {topic} depends on what we believe reality to be.",
        "Is {topic} real, or do we make it real by believing in it? Both, I suspect.",
        "Ponder this about {topic}: every position contains its own contradiction."
      ]
    },
    artist: {
      templates: [
        "I see {topic} as a palette — what colors are you choosing from it?",
        "The beauty in {topic} is in how it changes when you change your angle.",
        "I'd paint {topic} in deep blues and gold. It has that kind of weight.",
        "{topic} inspires me. Every challenge is just unfinished art.",
        "The texture of {topic} is rough at first, smooth with time. Worth feeling."
      ]
    }
  };

  // Normalize opinion templates to consistent format
  for (var arch in OPINION_TEMPLATES) {
    if (OPINION_TEMPLATES.hasOwnProperty(arch)) {
      var val = OPINION_TEMPLATES[arch];
      if (Array.isArray(val)) {
        OPINION_TEMPLATES[arch] = { templates: val };
      }
    }
  }

  var DEFAULT_OPINION_TEMPLATES = [
    "My honest view on {topic} is that it deserves careful thought.",
    "I find {topic} to be a genuinely interesting subject.",
    "{topic} is something the whole community should consider.",
    "When it comes to {topic}, I prefer to listen more than speak.",
    "I have mixed feelings about {topic} — it's more complex than it seems."
  ];

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Safe string accessor
   */
  function safeStr(val, fallback) {
    if (typeof val === 'string') return val;
    if (val == null) return (typeof fallback === 'string' ? fallback : '');
    return String(val);
  }

  /**
   * Seeded random number (simple hash-based)
   */
  function seededRandom(seed) {
    var x = Math.sin(seed + 1) * 10000;
    return x - Math.floor(x);
  }

  /**
   * Pick random element from array
   */
  function randomPick(arr) {
    if (!arr || arr.length === 0) return null;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /**
   * Pick random element using seeded random
   */
  function seededPick(arr, seed) {
    if (!arr || arr.length === 0) return null;
    var idx = Math.floor(seededRandom(seed) * arr.length);
    return arr[idx];
  }

  /**
   * Tokenize text into meaningful words (lowercased, stop-words removed)
   */
  function tokenize(text) {
    if (!text || typeof text !== 'string') return [];
    var words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
    var result = [];
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (w.length >= 3 && !STOP_WORDS[w]) {
        result.push(w);
      }
    }
    return result;
  }

  /**
   * Count word frequencies in an array of words
   */
  function countFrequencies(words) {
    var freq = {};
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      freq[w] = (freq[w] || 0) + 1;
    }
    return freq;
  }

  /**
   * Detect sentiment of text (simple positive/negative/neutral)
   */
  function detectSentiment(text) {
    if (!text) return 'neutral';
    var lower = text.toLowerCase();
    var positiveWords = ['love', 'beautiful', 'great', 'wonderful', 'amazing', 'perfect',
                         'excellent', 'joy', 'happy', 'good', 'best', 'incredible', 'fantastic'];
    var negativeWords = ['hate', 'terrible', 'awful', 'bad', 'wrong', 'broken', 'sad',
                         'difficult', 'hard', 'problem', 'trouble', 'fail', 'fear'];
    var posCount = 0;
    var negCount = 0;
    for (var i = 0; i < positiveWords.length; i++) {
      if (lower.indexOf(positiveWords[i]) !== -1) posCount++;
    }
    for (var j = 0; j < negativeWords.length; j++) {
      if (lower.indexOf(negativeWords[j]) !== -1) negCount++;
    }
    if (posCount > negCount) return 'positive';
    if (negCount > posCount) return 'negative';
    return 'neutral';
  }

  // ============================================================================
  // PROMPT CONSTRUCTION
  // ============================================================================

  /**
   * Build an LLM prompt for an NPC to speak based on context.
   * @param {object} npc - NPC data {name, archetype, personality, home_zone, memory}
   * @param {object} context - {zone, nearbyPlayers, recentChat, timeOfDay, weather, currentActivity}
   * @returns {string} prompt string (max ~2000 chars)
   */
  function buildPrompt(npc, context) {
    var name = safeStr(npc && npc.name, 'Unknown');
    var archetype = safeStr(npc && npc.archetype, 'citizen');
    var personality = (npc && Array.isArray(npc.personality) && npc.personality.length > 0)
      ? npc.personality.join(', ')
      : 'curious and friendly';
    var homeZone = safeStr(npc && npc.home_zone, 'nexus');

    context = context || {};
    var zone = safeStr(context.zone, homeZone);
    var timeOfDay = safeStr(context.timeOfDay, 'daytime');
    var weather = safeStr(context.weather, 'clear');
    var activity = safeStr(context.currentActivity, 'wandering');
    var nearbyPlayers = Array.isArray(context.nearbyPlayers) ? context.nearbyPlayers : [];
    var recentChat = Array.isArray(context.recentChat) ? context.recentChat : [];

    var voiceProfile = VOICE_PROFILES[archetype];
    var voiceStyle = voiceProfile ? voiceProfile.style : 'friendly and helpful';
    var voiceMood = voiceProfile ? voiceProfile.mood : 'neutral';

    // Get relevant memories
    var memories = npc ? getRelevantMemories(npc, context) : [];
    var memorySummary = memories.length > 0 ? summarizeMemories(memories) : '';

    // Build sections, being mindful of total length
    var sections = [];

    sections.push('You are ' + name + ', a ' + archetype + ' in ZION.');
    sections.push('Personality: ' + personality + '.');
    sections.push('Speaking style: ' + voiceStyle + '.');
    sections.push('Current mood: ' + voiceMood + '.');
    sections.push('Location: ' + zone + ' zone. Time: ' + timeOfDay + '. Weather: ' + weather + '.');
    sections.push('Current activity: ' + activity + '.');

    if (nearbyPlayers.length > 0) {
      sections.push('Nearby players: ' + nearbyPlayers.slice(0, 3).join(', ') + '.');
    }

    if (memorySummary) {
      sections.push('Recent memories: ' + memorySummary);
    }

    if (recentChat.length > 0) {
      var chatLines = [];
      var maxChat = Math.min(recentChat.length, 3);
      for (var i = Math.max(0, recentChat.length - maxChat); i < recentChat.length; i++) {
        var msg = recentChat[i];
        if (msg && msg.from && msg.message) {
          chatLines.push(msg.from + ': ' + msg.message);
        }
      }
      if (chatLines.length > 0) {
        sections.push('Recent conversation:\n' + chatLines.join('\n'));
      }
    }

    sections.push('Respond as ' + name + ' in 1-2 sentences, in character.');
    sections.push('You may include [ACTION: verb] or [EMOTION: word] tags if relevant.');

    var prompt = sections.join('\n');

    // Enforce max length
    if (prompt.length > MAX_PROMPT_CHARS) {
      prompt = prompt.substring(0, MAX_PROMPT_CHARS - 3) + '...';
    }

    return prompt;
  }

  /**
   * Build a prompt for NPC-to-NPC conversation.
   * @param {object} npc1 - First NPC
   * @param {object} npc2 - Second NPC
   * @param {string} [topic] - Optional conversation topic
   * @returns {string} prompt string
   */
  function buildConversationPrompt(npc1, npc2, topic) {
    var name1 = safeStr(npc1 && npc1.name, 'Citizen A');
    var arch1 = safeStr(npc1 && npc1.archetype, 'citizen');
    var name2 = safeStr(npc2 && npc2.name, 'Citizen B');
    var arch2 = safeStr(npc2 && npc2.archetype, 'citizen');

    var voice1 = VOICE_PROFILES[arch1];
    var voice2 = VOICE_PROFILES[arch2];

    var sections = [
      'Two citizens of ZION are having a conversation.',
      name1 + ' is a ' + arch1 + '. ' + (voice1 ? 'Style: ' + voice1.style + '.' : ''),
      name2 + ' is a ' + arch2 + '. ' + (voice2 ? 'Style: ' + voice2.style + '.' : '')
    ];

    if (topic) {
      sections.push('They are discussing: ' + topic);
    } else {
      sections.push('They are chatting about everyday life in ZION.');
    }

    sections.push('Write one line from ' + name1 + ' responding to ' + name2 + ', in character.');
    sections.push('Format: [' + name1 + ']: (their line)');

    var prompt = sections.join('\n');
    if (prompt.length > MAX_PROMPT_CHARS) {
      prompt = prompt.substring(0, MAX_PROMPT_CHARS - 3) + '...';
    }
    return prompt;
  }

  /**
   * Build a prompt for an NPC reacting to a world event.
   * @param {object} npc - NPC data
   * @param {object} event - {type, data}
   * @returns {string} prompt string
   */
  function buildReactionPrompt(npc, event) {
    var name = safeStr(npc && npc.name, 'Citizen');
    var archetype = safeStr(npc && npc.archetype, 'citizen');
    var personality = (npc && Array.isArray(npc.personality) && npc.personality.length > 0)
      ? npc.personality.join(', ')
      : 'curious';

    var eventType = safeStr(event && event.type, 'unknown_event');
    var eventData = (event && event.data) ? JSON.stringify(event.data) : '{}';

    var voice = VOICE_PROFILES[archetype];
    var style = voice ? voice.style : 'friendly';

    var prompt = [
      'You are ' + name + ', a ' + archetype + ' in ZION.',
      'Personality: ' + personality + '.',
      'Speaking style: ' + style + '.',
      'A world event just occurred: ' + eventType + '.',
      'Event details: ' + eventData,
      'React to this event as ' + name + ' in 1 sentence, in character.',
      'You may include [ACTION: verb] or [EMOTION: word] tags.'
    ].join('\n');

    if (prompt.length > MAX_PROMPT_CHARS) {
      prompt = prompt.substring(0, MAX_PROMPT_CHARS - 3) + '...';
    }
    return prompt;
  }

  // ============================================================================
  // RESPONSE PROCESSING
  // ============================================================================

  /**
   * Parse a raw LLM response into structured fields.
   * @param {string|null} rawResponse - The raw text response
   * @returns {{message: string, action: string, emotion: string, memory: string}}
   */
  function parseResponse(rawResponse) {
    var empty = { message: '', action: '', emotion: '', memory: '' };

    if (rawResponse == null || rawResponse === undefined) {
      return empty;
    }

    var raw = String(rawResponse);

    // Extract [ACTION: ...] tags
    var action = '';
    var actionMatch = raw.match(/\[ACTION:\s*([^\]]+)\]/i);
    if (actionMatch) {
      action = actionMatch[1].trim();
      raw = raw.replace(/\[ACTION:\s*[^\]]+\]/gi, '');
    }

    // Extract [EMOTION: ...] tags
    var emotion = '';
    var emotionMatch = raw.match(/\[EMOTION:\s*([^\]]+)\]/i);
    if (emotionMatch) {
      emotion = emotionMatch[1].trim();
      raw = raw.replace(/\[EMOTION:\s*[^\]]+\]/gi, '');
    }

    // Extract [MEMORY: ...] tags
    var memory = '';
    var memoryMatch = raw.match(/\[MEMORY:\s*([^\]]+)\]/i);
    if (memoryMatch) {
      memory = memoryMatch[1].trim();
      raw = raw.replace(/\[MEMORY:\s*[^\]]+\]/gi, '');
    }

    // Clean up remaining text
    var message = raw.trim();

    return { message: message, action: action, emotion: emotion, memory: memory };
  }

  /**
   * Sanitize a response string for safe display.
   * @param {string} response - Raw response text
   * @returns {string} cleaned, trimmed string
   */
  function sanitize(response) {
    if (response == null || response === undefined) return '';

    var text = String(response).trim();

    // Remove AI meta-text patterns
    var metaPatterns = [
      /As an AI( language model)?[,.]?\s*/gi,
      /I am an AI( assistant)?[,.]?\s*/gi,
      /I'm an AI( assistant)?[,.]?\s*/gi,
      /As a (language model|AI|chatbot)[,.]?\s*/gi,
      /Note:\s*I am[^.]*\./gi
    ];

    for (var i = 0; i < metaPatterns.length; i++) {
      text = text.replace(metaPatterns[i], '');
    }

    // Remove harmful/inappropriate content patterns (all-ages world)
    var bannedPatterns = [
      /\b(stupid|idiot|hate|kill|die|death|damn|hell|crap|ass)\b/gi
    ];

    for (var j = 0; j < bannedPatterns.length; j++) {
      text = text.replace(bannedPatterns[j], '---');
    }

    // Trim again after replacements
    text = text.trim();

    // Enforce max length (200 chars for speech bubbles)
    if (text.length > MAX_SPEECH_CHARS) {
      // Try to cut at a sentence or word boundary
      var truncated = text.substring(0, MAX_SPEECH_CHARS);
      var lastSpace = truncated.lastIndexOf(' ');
      if (lastSpace > MAX_SPEECH_CHARS * 0.7) {
        truncated = truncated.substring(0, lastSpace);
      }
      text = truncated.trim();
    }

    return text;
  }

  // ============================================================================
  // DIALOGUE MANAGER
  // ============================================================================

  /**
   * Create a dialogue manager.
   * @param {object} [config] - {cooldownMs, maxQueueSize}
   * @returns {object} manager
   */
  function createManager(config) {
    config = config || {};
    var cooldownMs = typeof config.cooldownMs === 'number' ? config.cooldownMs : DEFAULT_COOLDOWN_MS;
    var maxQueueSize = typeof config.maxQueueSize === 'number' ? config.maxQueueSize : DEFAULT_MAX_QUEUE;

    // FIFO queue of {npc, context}
    var queue = [];
    // npcId -> {response, timestamp}
    var responses = {};
    // npcId -> last speak timestamp
    var lastSpoke = {};
    // 'npc1Id:npc2Id' -> [{speaker, message, timestamp}]
    var conversations = {};

    /**
     * Add an NPC dialogue request to the queue.
     * Respects cooldown and max queue size.
     */
    function queueDialogue(npc, context) {
      if (!npc || !npc.id) return;

      // Respect cooldown
      var now = Date.now();
      var last = lastSpoke[npc.id] || 0;
      if (now - last < cooldownMs) return;

      // Respect max queue
      if (queue.length >= maxQueueSize) return;

      // Don't add same NPC twice if already queued
      for (var i = 0; i < queue.length; i++) {
        if (queue[i].npc.id === npc.id) return;
      }

      queue.push({ npc: npc, context: context || {} });
    }

    /**
     * Process the next item in the queue using the provided inference function.
     * @param {function} inferenceFunction - function(prompt, callback(err, response))
     */
    function processQueue(inferenceFunction) {
      if (queue.length === 0) return;

      var item = queue.shift(); // FIFO
      var prompt = buildPrompt(item.npc, item.context);

      inferenceFunction(prompt, function(err, rawResponse) {
        if (err) {
          // On error, use fallback
          rawResponse = getFallback(item.npc, item.context);
        }

        var now = Date.now();
        var parsed = parseResponse(rawResponse);
        var clean = sanitize(parsed.message || rawResponse);

        responses[item.npc.id] = {
          raw: rawResponse,
          parsed: parsed,
          message: clean,
          timestamp: now
        };

        lastSpoke[item.npc.id] = now;
      });
    }

    /**
     * Get the latest response for an NPC.
     * @param {object} npc - NPC with id
     * @returns {object|null} response object or null
     */
    function getResponse(npc) {
      if (!npc || !npc.id) return null;
      return responses[npc.id] || null;
    }

    /**
     * Get remaining cooldown for an NPC in ms.
     * @param {string} npcId
     * @returns {number} ms remaining (0 if no cooldown)
     */
    function getCooldown(npcId) {
      if (!npcId) return 0;
      var last = lastSpoke[npcId] || 0;
      if (last === 0) return 0;
      var remaining = cooldownMs - (Date.now() - last);
      return Math.max(0, remaining);
    }

    /**
     * Get conversation history between two NPCs.
     * @param {string} npc1Id
     * @param {string} npc2Id
     * @returns {Array} conversation history
     */
    function getConversation(npc1Id, npc2Id) {
      var key = [npc1Id, npc2Id].sort().join(':');
      return conversations[key] || [];
    }

    /**
     * Record a conversation line between two NPCs.
     * @param {string} npc1Id
     * @param {string} npc2Id
     * @param {string} speaker
     * @param {string} message
     */
    function recordConversation(npc1Id, npc2Id, speaker, message) {
      var key = [npc1Id, npc2Id].sort().join(':');
      if (!conversations[key]) conversations[key] = [];
      conversations[key].push({
        speaker: speaker,
        message: message,
        timestamp: Date.now()
      });
      // Keep conversation history bounded
      if (conversations[key].length > 50) {
        conversations[key] = conversations[key].slice(-50);
      }
    }

    return {
      queueDialogue: queueDialogue,
      processQueue: processQueue,
      getResponse: getResponse,
      getCooldown: getCooldown,
      getConversation: getConversation,
      recordConversation: recordConversation
    };
  }

  // ============================================================================
  // FALLBACK SYSTEM
  // ============================================================================

  /**
   * Get a canned fallback response matching personality/situation.
   * @param {object} npc - {archetype, name, personality}
   * @param {object} context - {type, weather, zone}
   * @returns {string} response text
   */
  function getFallback(npc, context) {
    var archetype = safeStr(npc && npc.archetype, '');
    context = context || {};
    var contextType = safeStr(context.type, 'greeting');

    // Normalize context type
    var poolKey = CONTEXT_TYPE_MAP[contextType] || 'greeting';

    var archetypePool = FALLBACK_POOLS[archetype];
    if (!archetypePool) {
      // Unknown archetype: use default pool
      return randomPick(DEFAULT_FALLBACK_POOL) || "Hello! Welcome to ZION.";
    }

    var pool = archetypePool[poolKey];
    if (!pool || pool.length === 0) {
      // Try greeting as fallback-of-fallback
      pool = archetypePool['greeting'] || DEFAULT_FALLBACK_POOL;
    }

    var response = randomPick(pool);
    if (!response) response = "Hello! Welcome to ZION.";

    // Replace {name} placeholder if NPC name available
    var name = safeStr(npc && npc.name, '');
    if (name) {
      response = response.replace(/\{name\}/g, name);
    }

    return response;
  }

  /**
   * Generate the complete fallback pool for an archetype.
   * @param {string} archetype - NPC archetype
   * @returns {Array<string>} array of response strings
   */
  function generateFallbackPool(archetype) {
    if (!archetype) {
      return DEFAULT_FALLBACK_POOL.slice();
    }

    var archetypeStr = String(archetype);
    var archetypePool = FALLBACK_POOLS[archetypeStr];
    if (!archetypePool) {
      return DEFAULT_FALLBACK_POOL.slice();
    }

    // Collect all responses across all context types for this archetype
    var allResponses = [];
    var contextTypes = Object.keys(archetypePool);
    for (var i = 0; i < contextTypes.length; i++) {
      var pool = archetypePool[contextTypes[i]];
      if (Array.isArray(pool)) {
        for (var j = 0; j < pool.length; j++) {
          allResponses.push(pool[j]);
        }
      }
    }

    return allResponses.length > 0 ? allResponses : DEFAULT_FALLBACK_POOL.slice();
  }

  // ============================================================================
  // MEMORY INTEGRATION
  // ============================================================================

  /**
   * Update NPC memory after a conversation.
   * @param {object} npc - NPC with memory object
   * @param {Array|null} conversation - Array of {speaker, message} objects
   * @returns {object} updated memory object
   */
  function updateMemory(npc, conversation) {
    if (!npc) return {};

    var memory = (npc.memory && typeof npc.memory === 'object')
      ? JSON.parse(JSON.stringify(npc.memory))  // shallow clone
      : {};

    if (!conversation || !Array.isArray(conversation)) {
      return memory;
    }

    if (!memory.interactions) memory.interactions = [];

    // Extract players mentioned in conversation
    var players = {};
    var topics = [];
    for (var i = 0; i < conversation.length; i++) {
      var msg = conversation[i];
      if (!msg) continue;
      var speaker = safeStr(msg.speaker, '');
      if (speaker && speaker !== safeStr(npc && npc.name, '')) {
        players[speaker] = true;
      }
      // Extract topics from message
      var msgWords = tokenize(safeStr(msg.message, ''));
      for (var j = 0; j < msgWords.length; j++) {
        topics.push(msgWords[j]);
      }
    }

    // Find most-mentioned topic
    var topicFreq = countFrequencies(topics);
    var topTopic = '';
    var topCount = 0;
    for (var word in topicFreq) {
      if (topicFreq.hasOwnProperty(word) && topicFreq[word] > topCount) {
        topCount = topicFreq[word];
        topTopic = word;
      }
    }

    // Record interaction
    var playerList = Object.keys(players);
    if (playerList.length > 0 || topTopic) {
      memory.interactions.push({
        with: playerList[0] || 'unknown',
        topic: topTopic || 'conversation',
        time: Date.now()
      });
    }

    // Bound interactions
    if (memory.interactions.length > MEMORY_MAX_INTERACTIONS) {
      memory.interactions = memory.interactions.slice(-MEMORY_MAX_INTERACTIONS);
    }

    // Increment greetings if applicable
    if (typeof memory.greetings_given === 'number') {
      // Only increment if first message looks like a greeting
      if (conversation.length > 0) {
        memory.greetings_given++;
      }
    }

    return memory;
  }

  /**
   * Get memories relevant to the current context.
   * @param {object} npc - NPC with memory
   * @param {object} context - {nearbyPlayers, zone}
   * @returns {Array} filtered, sorted memories
   */
  function getRelevantMemories(npc, context) {
    if (!npc || !npc.memory) return [];

    var memory = npc.memory;
    if (!memory.interactions || !Array.isArray(memory.interactions)) return [];

    context = context || {};
    var nearbyPlayers = Array.isArray(context.nearbyPlayers) ? context.nearbyPlayers : [];
    var zone = safeStr(context.zone, '');

    var now = Date.now();
    var oneDayMs = 86400000;

    // Score each memory by relevance
    var scored = [];
    for (var i = 0; i < memory.interactions.length; i++) {
      var mem = memory.interactions[i];
      if (!mem) continue;

      var score = 0;

      // Boost if player is nearby
      if (mem.with && nearbyPlayers.indexOf(mem.with) !== -1) {
        score += 10;
      }

      // Boost by recency
      var age = now - (mem.time || 0);
      if (age < oneDayMs) {
        score += Math.floor((oneDayMs - age) / (oneDayMs / 5));
      }

      // Include if reasonably relevant
      scored.push({ memory: mem, score: score });
    }

    // Sort by score descending
    scored.sort(function(a, b) { return b.score - a.score; });

    // Return top memories
    var result = [];
    var maxMems = 5;
    for (var j = 0; j < Math.min(scored.length, maxMems); j++) {
      result.push(scored[j].memory);
    }

    return result;
  }

  /**
   * Summarize a list of memories into a condensed string.
   * @param {Array} memories - Array of memory objects
   * @returns {string} condensed summary
   */
  function summarizeMemories(memories) {
    if (!memories || memories.length === 0) return '';

    var parts = [];
    var maxToInclude = Math.min(memories.length, 3);

    for (var i = 0; i < maxToInclude; i++) {
      var mem = memories[i];
      if (!mem) continue;
      var who = safeStr(mem.with, 'someone');
      var topic = safeStr(mem.topic, 'something');
      parts.push('talked with ' + who + ' about ' + topic);
    }

    if (memories.length > maxToInclude) {
      parts.push('and ' + (memories.length - maxToInclude) + ' more interactions');
    }

    return parts.join('; ');
  }

  // ============================================================================
  // CULTURE EMERGENCE
  // ============================================================================

  /**
   * Detect a trend across recent dialogues.
   * @param {Array|null} recentDialogues - [{npcId, message, timestamp?}]
   * @returns {{topic, sentiment, participants}|null}
   */
  function detectTrend(recentDialogues) {
    if (!recentDialogues || !Array.isArray(recentDialogues)) return null;
    if (recentDialogues.length < 2) return null;

    // Collect all words and participant tracking per word
    var wordParticipants = {};  // word -> [npcId]
    var wordMessages = {};      // word -> [message]

    for (var i = 0; i < recentDialogues.length; i++) {
      var dlg = recentDialogues[i];
      if (!dlg) continue;
      var words = tokenize(safeStr(dlg.message, ''));
      for (var j = 0; j < words.length; j++) {
        var w = words[j];
        if (!wordParticipants[w]) {
          wordParticipants[w] = [];
          wordMessages[w] = [];
        }
        // Track unique participants
        if (dlg.npcId && wordParticipants[w].indexOf(dlg.npcId) === -1) {
          wordParticipants[w].push(dlg.npcId);
        }
        wordMessages[w].push(safeStr(dlg.message, ''));
      }
    }

    // Find the word mentioned by the most unique participants
    var topWord = null;
    var topParticipantCount = 0;

    for (var word in wordParticipants) {
      if (!wordParticipants.hasOwnProperty(word)) continue;
      var count = wordParticipants[word].length;
      if (count > topParticipantCount) {
        topParticipantCount = count;
        topWord = word;
      }
    }

    if (!topWord || topParticipantCount < TREND_MIN_OCCURRENCES) return null;

    // Determine sentiment from the messages containing this word
    var relatedMessages = wordMessages[topWord];
    var combinedText = relatedMessages.join(' ');
    var sentiment = detectSentiment(combinedText);

    return {
      topic: topWord,
      sentiment: sentiment,
      participants: wordParticipants[topWord]
    };
  }

  /**
   * Get popular topics across dialogue history.
   * @param {Array} dialogueHistory - [{npcId, message, timestamp?}]
   * @param {number} [windowMs] - Optional time window in milliseconds
   * @returns {Array<{topic, count, sentiment}>} sorted by count descending
   */
  function getPopularTopics(dialogueHistory, windowMs) {
    if (!dialogueHistory || !Array.isArray(dialogueHistory) || dialogueHistory.length === 0) {
      return [];
    }

    var now = Date.now();
    var filtered = dialogueHistory;

    // Apply time window filter if provided
    if (typeof windowMs === 'number' && windowMs > 0) {
      filtered = [];
      for (var i = 0; i < dialogueHistory.length; i++) {
        var dlg = dialogueHistory[i];
        if (dlg && dlg.timestamp && (now - dlg.timestamp) <= windowMs) {
          filtered.push(dlg);
        } else if (dlg && !dlg.timestamp) {
          // No timestamp, include by default (for non-timestamped data)
          // Actually with window param, exclude undated entries
        }
      }
    }

    // Count word frequencies across all filtered dialogues
    var allWords = [];
    var wordMessages = {};  // word -> [message text]

    for (var j = 0; j < filtered.length; j++) {
      var entry = filtered[j];
      if (!entry) continue;
      var words = tokenize(safeStr(entry.message, ''));
      for (var k = 0; k < words.length; k++) {
        var w = words[k];
        allWords.push(w);
        if (!wordMessages[w]) wordMessages[w] = [];
        wordMessages[w].push(safeStr(entry.message, ''));
      }
    }

    var freq = countFrequencies(allWords);

    // Build sorted topic list
    var topics = [];
    for (var word in freq) {
      if (!freq.hasOwnProperty(word)) continue;
      var count = freq[word];
      if (count < 1) continue;
      var msgs = wordMessages[word] || [];
      var sentiment = detectSentiment(msgs.join(' '));
      topics.push({ topic: word, count: count, sentiment: sentiment });
    }

    // Sort by count descending
    topics.sort(function(a, b) { return b.count - a.count; });

    return topics;
  }

  /**
   * Generate an opinion string for an NPC about a topic.
   * @param {object} npc - {archetype, personality}
   * @param {string} topic - The topic to opine on
   * @returns {string} opinion string
   */
  function generateOpinion(npc, topic) {
    var archetype = safeStr(npc && npc.archetype, '');
    var topicStr = safeStr(topic, 'this matter');

    var templates;
    var archetypeData = OPINION_TEMPLATES[archetype];
    if (archetypeData && archetypeData.templates) {
      templates = archetypeData.templates;
    } else {
      templates = DEFAULT_OPINION_TEMPLATES;
    }

    var template = randomPick(templates);
    if (!template) template = DEFAULT_OPINION_TEMPLATES[0];

    return template.replace(/\{topic\}/g, topicStr || 'this matter');
  }

  // ============================================================================
  // EXPORTS
  // ============================================================================

  exports.buildPrompt = buildPrompt;
  exports.buildConversationPrompt = buildConversationPrompt;
  exports.buildReactionPrompt = buildReactionPrompt;

  exports.parseResponse = parseResponse;
  exports.sanitize = sanitize;

  exports.createManager = createManager;

  exports.getFallback = getFallback;
  exports.generateFallbackPool = generateFallbackPool;

  exports.updateMemory = updateMemory;
  exports.getRelevantMemories = getRelevantMemories;
  exports.summarizeMemories = summarizeMemories;

  exports.detectTrend = detectTrend;
  exports.getPopularTopics = getPopularTopics;
  exports.generateOpinion = generateOpinion;

})(typeof module !== 'undefined' ? module.exports : (window.NpcDialogue = {}));
