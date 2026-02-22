// lore_discovery.js
/**
 * ZION Lore Discovery System
 * Systematic lore discovery and collection: 40 entries across 5 categories,
 * unlock chains, lore sets, rarity tiers, codex UI data, and environmental triggers.
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

  // ---------------------------------------------------------------------------
  // CONSTANTS
  // ---------------------------------------------------------------------------

  var ZONES_LIST = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];

  var RARITY_WEIGHTS = {
    common:    0.60,
    uncommon:  0.25,
    rare:      0.10,
    legendary: 0.05
  };

  var DISCOVER_METHODS = ['explore_location', 'talk_to_npc', 'use_item', 'solve_puzzle'];

  // ---------------------------------------------------------------------------
  // CATEGORIES — 5 category definitions
  // ---------------------------------------------------------------------------

  var CATEGORIES = [
    {
      id: 'zone_history',
      label: 'Zone History',
      description: 'Ancient records and founding stories of each zone in ZION.',
      icon: 'scroll',
      count: 8
    },
    {
      id: 'npc_backstory',
      label: 'NPC Backstories',
      description: 'Personal histories and hidden depths of the citizens you meet.',
      icon: 'person',
      count: 10
    },
    {
      id: 'item_legend',
      label: 'Item Legends',
      description: 'Myths and truths behind the most storied artifacts in ZION.',
      icon: 'gem',
      count: 8
    },
    {
      id: 'world_myth',
      label: 'World Myths',
      description: 'Grand stories that explain the nature and origin of ZION itself.',
      icon: 'star',
      count: 8
    },
    {
      id: 'hidden_secret',
      label: 'Hidden Secrets',
      description: 'Whispered truths known only to those who look carefully.',
      icon: 'eye',
      count: 6
    }
  ];

  // ---------------------------------------------------------------------------
  // LORE ENTRIES — 40 entries
  // ---------------------------------------------------------------------------

  var LORE_ENTRIES = [

    // =========================================================
    // ZONE_HISTORY — 8 entries
    // =========================================================
    {
      id: 'zh_nexus_founding',
      title: 'The First Crossroads',
      text: 'Long before the Nexus had a name, it was simply the place where all paths converged. The earliest citizens did not plan it — they just kept meeting here by chance until chance became tradition and tradition became foundation. The Nexus was named not by a decree but by a child who asked: "What do you call the place where everything begins?"',
      category: 'zone_history',
      zone: 'nexus',
      discoverMethod: 'talk_to_npc',
      prerequisite: null,
      rarity: 'common',
      hint: 'An elder near the central fire knows how ZION began.',
      unlocks: ['zh_nexus_second_age', 'wm_the_first_light']
    },
    {
      id: 'zh_nexus_second_age',
      title: 'The Second Age of the Nexus',
      text: 'After the founding generation grew old, the Nexus nearly fell silent. The second generation of citizens almost abandoned it for the zones. But one merchant set up a permanent stall at the crossroads and refused to leave. Within a season, others joined. The Nexus entered its second age: not a meeting-point, but a living heart.',
      category: 'zone_history',
      zone: 'nexus',
      discoverMethod: 'explore_location',
      prerequisite: 'zh_nexus_founding',
      rarity: 'uncommon',
      hint: 'The oldest market stone in the Nexus bears a merchant\'s mark.',
      unlocks: ['nb_first_merchant']
    },
    {
      id: 'zh_gardens_origin',
      title: 'Gardens Before the Seeds',
      text: 'The Gardens existed as a concept before a single seed was planted. Citizens gathered and described the garden they wanted: what it would smell like, what colors would bloom in what season, which paths would be straight and which would meander. Only after the vision was agreed upon did anyone bring soil. They say this is why the Gardens feel inevitable — they were decided before they were planted.',
      category: 'zone_history',
      zone: 'gardens',
      discoverMethod: 'explore_location',
      prerequisite: null,
      rarity: 'common',
      hint: 'The oldest garden bed holds more than flowers.',
      unlocks: ['nb_verdana', 'il_verdanas_shears']
    },
    {
      id: 'zh_athenaeum_open_door',
      title: 'The Open Door Policy',
      text: 'The Athenaeum was the first building in ZION to declare that no door inside it would ever be locked. This was a radical act. The founders had to argue through three community votes before it passed. The final vote was won by a child who pointed out that all the adults were arguing about who deserved to learn, and no one had asked the child what she wanted to know.',
      category: 'zone_history',
      zone: 'athenaeum',
      discoverMethod: 'talk_to_npc',
      prerequisite: null,
      rarity: 'common',
      hint: 'The Athenaeum librarian loves to tell the story of the first vote.',
      unlocks: ['nb_caelen', 'il_the_open_ledger']
    },
    {
      id: 'zh_studio_color_rebellion',
      title: 'The Color Rebellion',
      text: 'In the early days of ZION, a faction of builders declared that all structures must be grey — unified, undistracted, pure. The artists of what would become the Studio responded by painting everything they owned in the most vivid colors they could find. The "rebellion" lasted one week before the builders, charmed despite themselves, abandoned the grey decree. The Studio has been every color since.',
      category: 'zone_history',
      zone: 'studio',
      discoverMethod: 'explore_location',
      prerequisite: null,
      rarity: 'uncommon',
      hint: 'Beneath the Studio\'s east wall, old grey paint shows through.',
      unlocks: ['nb_artist_lyra', 'il_the_first_brush']
    },
    {
      id: 'zh_wilds_original_border',
      title: 'Where the Wilds Begin',
      text: 'The original border of the Wilds was marked with stones placed by the first explorers. Over the centuries the Wilds have moved — expanding into territory once claimed, retreating in places, shifting as if alive. The border stones are still there for those who know how to find them, now deep inside the Wilds or stranded in civilized zones like errant ambassadors.',
      category: 'zone_history',
      zone: 'wilds',
      discoverMethod: 'explore_location',
      prerequisite: null,
      rarity: 'uncommon',
      hint: 'Old border-stones sometimes hum at night.',
      unlocks: ['nb_explorer_domas', 'hs_moving_wilds']
    },
    {
      id: 'zh_agora_night_market',
      title: 'The Night Market Tradition',
      text: 'The Agora\'s most beloved tradition — the Night Market — began as an accident. A merchant fell asleep at her stall and woke to find other merchants had set up around her rather than disturb her. By morning a full market had run through the night without plan or permission. The Night Market has run every week since, always beginning the moment someone falls asleep at a stall.',
      category: 'zone_history',
      zone: 'agora',
      discoverMethod: 'talk_to_npc',
      prerequisite: null,
      rarity: 'common',
      hint: 'The oldest market-keeper remembers the first sleepy merchant.',
      unlocks: ['nb_market_keeper', 'il_the_brass_weight']
    },
    {
      id: 'zh_arena_peaceful_origins',
      title: 'The Arena Was a Garden First',
      text: 'Before the Arena was built, the site was a communal garden. The first contest held there was a debate about whether to convert it. The garden advocates argued with such skill and passion that the competition advocates were won over — not by the arguments, but by the demonstration. "Anyone who argues that well," said the competition founder, "deserves a proper arena." The garden was relocated to what became the Gardens.',
      category: 'zone_history',
      zone: 'arena',
      discoverMethod: 'talk_to_npc',
      prerequisite: null,
      rarity: 'uncommon',
      hint: 'Old growth still flourishes beneath the Arena\'s flagstones.',
      unlocks: ['nb_philosopher_davan', 'wm_the_great_debate']
    },

    // =========================================================
    // NPC_BACKSTORY — 10 entries
    // =========================================================
    {
      id: 'nb_first_merchant',
      title: 'The Merchant Who Would Not Leave',
      text: 'The merchant who kept the Nexus alive during its quiet age was named Orvyn. He had no family and nowhere else to go, so he stayed. He never sold anything of great value — only small things: bread, thread, candles. He believed the small things kept a place alive when the grand things had moved on. When Orvyn died, citizens placed small things on his memorial: a spool, a heel of bread, a single candle still burning.',
      category: 'npc_backstory',
      zone: 'nexus',
      discoverMethod: 'talk_to_npc',
      prerequisite: 'zh_nexus_second_age',
      rarity: 'uncommon',
      hint: 'Ask the Nexus elder about the merchant memorial.',
      unlocks: ['il_orvyns_candle']
    },
    {
      id: 'nb_verdana',
      title: 'Verdana\'s Untold Season',
      text: 'The gardener Verdana, who dreamed the Gardens into being, spent one season where she grew nothing at all. She walked every inch of the Gardens and watched what wanted to grow without her help. At the end of the season she replanted everything she had forced to grow, giving the space to what had chosen to be there. The Gardens improved by thirty percent. Verdana called this her best gardening year.',
      category: 'npc_backstory',
      zone: 'gardens',
      discoverMethod: 'talk_to_npc',
      prerequisite: 'zh_gardens_origin',
      rarity: 'rare',
      hint: 'The garden\'s most weathered journal is kept by an old groundskeeper.',
      unlocks: ['il_verdanas_shears', 'hs_the_singing_bed']
    },
    {
      id: 'nb_caelen',
      title: 'Caelen\'s First Lesson',
      text: 'Before Caelen opened the Athenaeum, she was a wandering teacher with no fixed home. Her first student was a child she met on a road who asked her: "Where does the sky end?" Caelen had no answer. She spent three years finding one. When she returned, the child had grown up and become a builder. Caelen told her the answer: "The sky doesn\'t end — it thins." The builder looked at her walls differently from that day on.',
      category: 'npc_backstory',
      zone: 'athenaeum',
      discoverMethod: 'talk_to_npc',
      prerequisite: 'zh_athenaeum_open_door',
      rarity: 'uncommon',
      hint: 'A plaque near the Athenaeum entrance tells of its founder\'s wandering years.',
      unlocks: ['il_the_open_ledger']
    },
    {
      id: 'nb_artist_lyra',
      title: 'Lyra\'s Lost Colors',
      text: 'The Studio\'s most celebrated artist, Lyra, was colorblind. She painted entirely by label and formula, mixing pigments by recipe rather than sight. Her contemporaries debated whether her work was "truly" art. Lyra responded by inviting them to close their eyes and describe what they heard in her paintings. Many of them wept. None of them argued further.',
      category: 'npc_backstory',
      zone: 'studio',
      discoverMethod: 'explore_location',
      prerequisite: 'zh_studio_color_rebellion',
      rarity: 'rare',
      hint: 'Lyra\'s formula notebooks are kept in a locked cabinet — the only locked thing in the Studio.',
      unlocks: ['il_the_first_brush', 'hs_color_formula']
    },
    {
      id: 'nb_explorer_domas',
      title: 'Domas and the Three Returns',
      text: 'The explorer Domas entered the Wilds three times and returned from each trip profoundly changed. After the first: he stopped speaking for a month. After the second: he started giving away everything he owned. After the third: he went in and did not return for seven years. When he did, he built a small house on the border and spent the rest of his life sitting in the doorway, greeting anyone who came back from the Wilds with the same words: "Welcome. You made it."',
      category: 'npc_backstory',
      zone: 'wilds',
      discoverMethod: 'explore_location',
      prerequisite: 'zh_wilds_original_border',
      rarity: 'rare',
      hint: 'A weathered doorframe on the Wilds border bears old scratched words.',
      unlocks: ['hs_domas_door', 'wm_the_wilds_voice']
    },
    {
      id: 'nb_market_keeper',
      title: 'The Keeper\'s Hidden Ledger',
      text: 'The oldest market-keeper in the Agora keeps two ledgers. The public one records all trades by Spark value. The private one records what people were really trading: worry for reassurance, loneliness for conversation, fear for the normalcy of a transaction. "Every trade is two trades," she says. "The one you see and the one you need." She has never shown the private ledger to anyone. It is the most important document in ZION.',
      category: 'npc_backstory',
      zone: 'agora',
      discoverMethod: 'talk_to_npc',
      prerequisite: 'zh_agora_night_market',
      rarity: 'rare',
      hint: 'The market-keeper will not show you her ledger, but she might describe it.',
      unlocks: ['il_the_brass_weight', 'hs_true_ledger']
    },
    {
      id: 'nb_philosopher_davan',
      title: 'Davan\'s Last Argument',
      text: 'The Arena\'s philosopher-founder Davan died mid-debate, a fate she considered ideal. Her opponent paused and then continued arguing her side for her, presenting Davan\'s probable counterpoints. The audience watched a dead woman win an argument through the integrity of her living opponent. The tradition of "arguing for the absent" in Arena debates began that day.',
      category: 'npc_backstory',
      zone: 'arena',
      discoverMethod: 'talk_to_npc',
      prerequisite: 'zh_arena_peaceful_origins',
      rarity: 'uncommon',
      hint: 'The Arena archivist has a transcript of the last debate.',
      unlocks: ['wm_the_great_debate']
    },
    {
      id: 'nb_healer_thessaly',
      title: 'Thessaly and the Thousand Cures',
      text: 'The wandering healer Thessaly kept meticulous records of every patient she treated. After fifty years, she reviewed them and made a startling discovery: ninety percent of what she had treated was loneliness presenting as illness. She spent her final decade not dispensing medicine but simply sitting with people. Her cure rate improved.',
      category: 'npc_backstory',
      zone: 'wilds',
      discoverMethod: 'talk_to_npc',
      prerequisite: null,
      rarity: 'uncommon',
      hint: 'A healer in the Wilds carries old treatment records.',
      unlocks: ['wm_the_great_compassion']
    },
    {
      id: 'nb_builder_stone',
      title: 'Stone\'s Impossible Bridge',
      text: 'The master builder known only as Stone built a bridge between the Nexus and the Commons using no mortar — only precisely cut stone fitted together by friction and gravity. Engineers said it was impossible. Stone built it in forty days working alone. When asked to explain the technique she said: "I listened to where the stones wanted to sit." The bridge has stood for three hundred years. It is the most visited structure in ZION and the most studied. No one has replicated it.',
      category: 'npc_backstory',
      zone: 'commons',
      discoverMethod: 'explore_location',
      prerequisite: null,
      rarity: 'rare',
      hint: 'The bridge between the Nexus and Commons has no mortar in its joints.',
      unlocks: ['il_stones_plumb_line', 'wm_the_impossible_arch']
    },
    {
      id: 'nb_musician_echo',
      title: 'Echo\'s Vanishing Songs',
      text: 'The musician Echo composed her pieces to be played once and never written down. She believed music that could be perfectly reproduced had lost something essential. Citizens tried to memorize her compositions but found them impossible to hold — each performance subtly different, shaped by the moment. After Echo died, musicians gathered and attempted to reconstruct her songs from memory. They produced seventeen different pieces. Echo would have approved of all of them.',
      category: 'npc_backstory',
      zone: 'studio',
      discoverMethod: 'solve_puzzle',
      prerequisite: null,
      rarity: 'legendary',
      hint: 'Seventeen musicians each claim to know Echo\'s true song. Only one knows the secret.',
      unlocks: ['il_echos_reed']
    },

    // =========================================================
    // ITEM_LEGEND — 8 entries
    // =========================================================
    {
      id: 'il_orvyns_candle',
      title: 'Orvyn\'s Undying Candle',
      text: 'The candle placed on Orvyn\'s memorial has never been relit — it has simply never gone out. Scholars have attempted to study it but find their instruments give inconsistent readings. The most coherent explanation was offered by a child: "It stays lit because people keep expecting it to." Whether or not this is true, nobody has tried to extinguish it to find out.',
      category: 'item_legend',
      zone: 'nexus',
      discoverMethod: 'explore_location',
      prerequisite: 'nb_first_merchant',
      rarity: 'rare',
      hint: 'A candle near the Nexus memorial burns without being tended.',
      unlocks: ['hs_orvyns_warmth']
    },
    {
      id: 'il_verdanas_shears',
      title: 'Verdana\'s Dream-Shears',
      text: 'The gardening shears Verdana used to tend the Gardens were said to know the difference between growth that served a plant and growth that hindered it. In her hands, they never cut what should not be cut. When others used them, the shears were ordinary. Botanists believe the shears simply responded to Verdana\'s exceptional horticultural intuition. Romantics believe otherwise.',
      category: 'item_legend',
      zone: 'gardens',
      discoverMethod: 'talk_to_npc',
      prerequisite: 'zh_gardens_origin',
      rarity: 'uncommon',
      hint: 'The head gardener keeps an heirloom tool behind the greenhouse.',
      unlocks: []
    },
    {
      id: 'il_the_open_ledger',
      title: 'The Open Ledger',
      text: 'The Athenaeum keeps a ledger of every piece of knowledge that has ever passed through its doors — who brought it, who took it, and what questions it answered or raised. The ledger has no end. Every day new pages appear, written in the same hand, despite that hand having died two hundred years ago. The current head librarian has stopped looking for explanations and simply keeps the ledger dusted.',
      category: 'item_legend',
      zone: 'athenaeum',
      discoverMethod: 'explore_location',
      prerequisite: 'zh_athenaeum_open_door',
      rarity: 'rare',
      hint: 'In the deepest stacks, a ledger writes itself.',
      unlocks: []
    },
    {
      id: 'il_the_first_brush',
      title: 'The First Brush',
      text: 'The brush used to paint ZION\'s first artwork — a smear of ochre on a flat stone — is kept in a case in the Studio. It should have disintegrated centuries ago. Conservators find it in perfect condition each time they inspect it. The bristles, impossibly, still hold a trace of ochre paint that has never dried. If you touch the case, legend says you can feel a faint warmth, as if someone is still holding the other end.',
      category: 'item_legend',
      zone: 'studio',
      discoverMethod: 'explore_location',
      prerequisite: 'zh_studio_color_rebellion',
      rarity: 'uncommon',
      hint: 'A glass case in the Studio\'s founding gallery holds a very old brush.',
      unlocks: []
    },
    {
      id: 'il_the_brass_weight',
      title: 'The Merchant\'s Brass Weight',
      text: 'Every scale in the Agora is calibrated against a single brass weight of unknown origin. The weight is perfectly accurate — more accurate than any known manufacturing method could produce. Metallurgists who have analyzed it find it is made of no alloy on record. The market-keeper says the weight was found in the soil when the Agora\'s first stall was dug. Nothing was found beside it. Nothing was found below it.',
      category: 'item_legend',
      zone: 'agora',
      discoverMethod: 'talk_to_npc',
      prerequisite: 'zh_agora_night_market',
      rarity: 'uncommon',
      hint: 'The Agora\'s weights-and-measures booth holds the reference weight.',
      unlocks: []
    },
    {
      id: 'il_stones_plumb_line',
      title: 'Stone\'s Plumb Line',
      text: 'The builder Stone used a single plumb line for every project she completed. The string was ordinary; the weight was a river-smooth stone she had found as a child. She claimed the stone had spoken to her and told her it wanted to be useful. After Stone died the plumb line was donated to the Commons. Builders who borrow it report that their work is measurably more true — and that they sometimes hear, very faintly, a stone that wants to be put to work.',
      category: 'item_legend',
      zone: 'commons',
      discoverMethod: 'talk_to_npc',
      prerequisite: 'nb_builder_stone',
      rarity: 'rare',
      hint: 'The Commons tool-library holds a very old plumb line.',
      unlocks: []
    },
    {
      id: 'il_echos_reed',
      title: 'Echo\'s Reed Flute',
      text: 'The musician Echo carved every instrument she played from a single river reed, replacing it each season. When she died, seventeen reeds were found in her home — one from each season she had composed. Citizens could not agree which was her last. They distributed the seventeen reeds to seventeen musicians, who each played the song they believed Echo had been working toward. All seventeen songs were beautiful. All seventeen were different. All seventeen sounded somehow like the same song.',
      category: 'item_legend',
      zone: 'studio',
      discoverMethod: 'solve_puzzle',
      prerequisite: 'nb_musician_echo',
      rarity: 'legendary',
      hint: 'Seventeen musicians each carry a reed. If you ask them all to play together, something happens.',
      unlocks: []
    },
    {
      id: 'il_arena_founding_stone',
      title: 'The Founding Stone of the Arena',
      text: 'The first stone placed in the Arena\'s construction was carried by the philosopher Davan herself. She had walked the boundary of the space three times before placing it. Citizens watched without understanding why. After the Arena was complete she explained: "A space for competition needs to know how large the spirit can grow before you put walls around it." The founding stone is still in its original position. It is the only stone in the Arena that has never been replaced.',
      category: 'item_legend',
      zone: 'arena',
      discoverMethod: 'explore_location',
      prerequisite: 'zh_arena_peaceful_origins',
      rarity: 'uncommon',
      hint: 'One stone in the Arena is older than all the others.',
      unlocks: []
    },

    // =========================================================
    // WORLD_MYTH — 8 entries
    // =========================================================
    {
      id: 'wm_the_first_light',
      title: 'The Myth of the First Light',
      text: 'Before ZION existed, there was a light that searched for a place to land. It passed over many worlds and found them too hard, too soft, too loud, too silent. When it reached the place that would become ZION, it stopped. The world was empty — no people, no paths, no names. But the light recognized something: the potential for all those things. The light landed, and stayed. Citizens say that is why ZION always feels lit from within — even on overcast days, there is a warmth that has no source.',
      category: 'world_myth',
      zone: 'nexus',
      discoverMethod: 'talk_to_npc',
      prerequisite: 'zh_nexus_founding',
      rarity: 'uncommon',
      hint: 'The oldest storyteller in ZION knows why the world feels lit from within.',
      unlocks: ['wm_the_second_light']
    },
    {
      id: 'wm_the_second_light',
      title: 'The Myth of the Second Light',
      text: 'When the first citizens arrived in ZION, they brought a second light with them: the light of intention. The First Light could illuminate a world, but only the Second Light could give it meaning. The myths say these two lights recognized each other and made an agreement: the First Light would keep the world warm and visible; the Second Light would fill it with purpose. Citizens who have felt a sudden clarity of purpose in ZION have touched the Second Light.',
      category: 'world_myth',
      zone: 'nexus',
      discoverMethod: 'talk_to_npc',
      prerequisite: 'wm_the_first_light',
      rarity: 'rare',
      hint: 'There is a second myth that follows the first. Ask again.',
      unlocks: []
    },
    {
      id: 'wm_the_great_debate',
      title: 'The Myth of the Great Debate',
      text: 'ZION myth holds that the world was not created but argued into existence. Two primal forces — one that wanted things to be fixed, one that wanted things to change — debated for an eternity. The world formed in the space between their arguments: structured enough to be real, fluid enough to be alive. This is why, the myth says, ZION responds to citizen intention and changes with their choices. The debate is still happening. You are participating in it right now.',
      category: 'world_myth',
      zone: 'arena',
      discoverMethod: 'talk_to_npc',
      prerequisite: 'zh_arena_peaceful_origins',
      rarity: 'rare',
      hint: 'The Arena holds a philosophical tradition that reveals cosmological truth.',
      unlocks: []
    },
    {
      id: 'wm_the_wilds_voice',
      title: 'The Myth of the Wilds\' Voice',
      text: 'The Wilds, the oldest myths say, was the first part of ZION to exist — predating even the First Light. It did not grow; it waited. It had always been there, patient beyond patience, existing before the concept of existence had been named. When the First Light arrived the Wilds greeted it with a sound that no language has ever captured. Citizens in the deepest Wilds sometimes hear it — a sound older than words, meaning something like: "You found me. I knew you would."',
      category: 'world_myth',
      zone: 'wilds',
      discoverMethod: 'explore_location',
      prerequisite: 'nb_explorer_domas',
      rarity: 'legendary',
      hint: 'The deepest part of the Wilds holds a sound no one can describe.',
      unlocks: []
    },
    {
      id: 'wm_the_great_compassion',
      title: 'The Myth of the Great Compassion',
      text: 'In the time before history, every zone of ZION was separate — not physically but spiritually. Each zone believed it was the center. Then came a traveler who visited each zone and wept in each one, for each zone\'s beauty, for each one\'s loneliness. The zones, feeling themselves witnessed, relaxed. The roads between them became shorter. Citizens who had never met found themselves neighbors. The traveler was never identified. The Great Compassion, the myth says, has no single source.',
      category: 'world_myth',
      zone: 'wilds',
      discoverMethod: 'talk_to_npc',
      prerequisite: 'nb_healer_thessaly',
      rarity: 'uncommon',
      hint: 'A healer in the Wilds knows a myth about how the zones came together.',
      unlocks: []
    },
    {
      id: 'wm_the_impossible_arch',
      title: 'The Myth of the Impossible Arch',
      text: 'Every impossible structure in ZION, myth says, exists because someone believed the stones wanted to be there. The laws of physics in ZION are not violated — they are consulted. Stone and wood and water each have preferences, and a builder who listens will find that the structure wants to stand. The myth is offered as comfort to new builders who are afraid of collapse. It is also, structural engineers quietly admit, a surprisingly accurate description of how ZION\'s most enduring buildings were made.',
      category: 'world_myth',
      zone: 'commons',
      discoverMethod: 'talk_to_npc',
      prerequisite: 'nb_builder_stone',
      rarity: 'uncommon',
      hint: 'The Commons builders\' guild holds a myth about living stone.',
      unlocks: []
    },
    {
      id: 'wm_the_gardens_dream',
      title: 'The Myth of the Dreaming Garden',
      text: 'The Gardens, the myth says, dream. Not in the way creatures dream — not in images and feelings — but in growth patterns, in the direction a vine chooses to climb, in which flowers bloom earliest in spring. The garden\'s dream is the slow unfolding of a vision that predates ZION, a vision of what a world in perfect health would look like. Every growing thing is a sentence in a very long poem the Gardens have been writing since before anyone was there to read it.',
      category: 'world_myth',
      zone: 'gardens',
      discoverMethod: 'explore_location',
      prerequisite: 'zh_gardens_origin',
      rarity: 'rare',
      hint: 'A very old part of the garden contains patterns that look deliberate.',
      unlocks: []
    },
    {
      id: 'wm_the_archives_end',
      title: 'The Myth of the Archive\'s End',
      text: 'The Athenaeum myth holds that when enough knowledge has been gathered, the archive will complete itself — the last piece of understanding will fall into place, and the library will become something other than a library. What it becomes, the myth does not say. Librarians tend to discuss this myth on quiet nights. None of them fears it. The knowledge-keepers of ZION have always believed that more understanding, whatever it leads to, is better than less.',
      category: 'world_myth',
      zone: 'athenaeum',
      discoverMethod: 'solve_puzzle',
      prerequisite: 'zh_athenaeum_open_door',
      rarity: 'legendary',
      hint: 'A hidden room in the Athenaeum holds the incomplete final volume.',
      unlocks: []
    },

    // =========================================================
    // HIDDEN_SECRET — 6 entries
    // =========================================================
    {
      id: 'hs_moving_wilds',
      title: 'The Wilds Move at Night',
      text: 'Citizens who have mapped the Wilds carefully and returned the next day find their maps inaccurate. The Wilds\' pathways rearrange themselves, slowly, at a rate too gradual to observe but too consistent to be coincidence. Experienced guides do not use maps — they use their last visit as a reference and adjust. No one knows if the Wilds are aware of this. No one has asked in a way that received an answer.',
      category: 'hidden_secret',
      zone: 'wilds',
      discoverMethod: 'explore_location',
      prerequisite: 'zh_wilds_original_border',
      rarity: 'rare',
      hint: 'Return to a place you\'ve mapped and look carefully.',
      unlocks: []
    },
    {
      id: 'hs_orvyns_warmth',
      title: 'The Warmth at the Memorial',
      text: 'Citizens who sit at Orvyn\'s memorial for more than ten minutes report feeling unexpectedly less alone. Those in grief find the feeling particularly strong. Scientists who have studied the site find nothing unusual. Philosophers who have studied the site find everything unusual. The current consensus is that Orvyn, who spent his life making a crossroads feel inhabited, is still doing his work. The memorial does not feel like an ending. It feels like a small stall that is always open.',
      category: 'hidden_secret',
      zone: 'nexus',
      discoverMethod: 'explore_location',
      prerequisite: 'il_orvyns_candle',
      rarity: 'legendary',
      hint: 'Sit at the Nexus memorial long enough to feel something.',
      unlocks: []
    },
    {
      id: 'hs_the_singing_bed',
      title: 'The Bed That Hums',
      text: 'In the northeastern corner of the Gardens, there is a flower bed that has never been planted. Citizens report hearing a low hum from it — not music exactly, but a sound that feels like a song waiting to begin. Botanists find the soil there unusually rich, as if preparing for something. Gardeners refuse to plant in it. "It already knows what it\'s growing," says the oldest gardener. "It just hasn\'t told us yet."',
      category: 'hidden_secret',
      zone: 'gardens',
      discoverMethod: 'explore_location',
      prerequisite: 'nb_verdana',
      rarity: 'rare',
      hint: 'In the northeast corner of the Gardens, the soil sounds different.',
      unlocks: []
    },
    {
      id: 'hs_color_formula',
      title: 'Lyra\'s True Formula',
      text: 'The locked cabinet in the Studio that holds Lyra\'s color formulas is not locked with a key. It is locked with a question. The question is painted on the cabinet door in colors Lyra never used in any painting: "What do you see when you close your eyes?" Citizens who answer aloud find the cabinet open. What they find inside is different for every person who opens it. No two accounts match. Everyone who opens it cries.',
      category: 'hidden_secret',
      zone: 'studio',
      discoverMethod: 'solve_puzzle',
      prerequisite: 'nb_artist_lyra',
      rarity: 'legendary',
      hint: 'The locked cabinet in the Studio opens for those who answer a painted question.',
      unlocks: []
    },
    {
      id: 'hs_domas_door',
      title: 'What Domas Wrote on His Door',
      text: 'The words Domas scratched into his doorframe — "Welcome. You made it." — are still legible three centuries later. But citizens who look carefully at night, when the moon is at a particular angle, report seeing secondary text beneath the primary inscription, in Domas\'s same hand. The secondary text reads: "I was waiting for you." Not citizens collectively. Not travelers in general. The secondary text, every witness agrees, means you specifically. Whatever your name is. However long it took.',
      category: 'hidden_secret',
      zone: 'wilds',
      discoverMethod: 'explore_location',
      prerequisite: 'nb_explorer_domas',
      rarity: 'legendary',
      hint: 'Domas\'s doorframe carries a message that changes depending on who reads it.',
      unlocks: []
    },
    {
      id: 'hs_true_ledger',
      title: 'The Market-Keeper\'s True Ledger',
      text: 'The market-keeper\'s private ledger, which she has never shown to anyone, has been found — but only by citizens who were not looking for it. Those who discovered it by accident report seeing their own name in it, with an entry they did not expect. The entry is never about what they traded. It is always about what they needed. The market-keeper, when asked, neither confirms nor denies that the ledger finds people rather than being found. She offers tea and changes the subject with extraordinary skill.',
      category: 'hidden_secret',
      zone: 'agora',
      discoverMethod: 'talk_to_npc',
      prerequisite: 'nb_market_keeper',
      rarity: 'legendary',
      hint: 'The market-keeper\'s hidden ledger finds those who need it.',
      unlocks: []
    },

  ];

  // ---------------------------------------------------------------------------
  // LORE SETS — 5 collections with completion badges
  // ---------------------------------------------------------------------------

  var LORE_SETS = [
    {
      id: 'set_founding_stories',
      name: 'Founding Stories',
      description: 'The origin tales of every zone in ZION.',
      badge: 'badge_historian',
      badgeLabel: 'Historian of ZION',
      entries: [
        'zh_nexus_founding',
        'zh_gardens_origin',
        'zh_athenaeum_open_door',
        'zh_studio_color_rebellion',
        'zh_wilds_original_border',
        'zh_agora_night_market',
        'zh_arena_peaceful_origins',
        'zh_nexus_second_age'
      ]
    },
    {
      id: 'set_legendary_citizens',
      name: 'Legendary Citizens',
      description: 'The backstories of ZION\'s most storied founders and heroes.',
      badge: 'badge_chronicler',
      badgeLabel: 'Chronicler of Lives',
      entries: [
        'nb_first_merchant',
        'nb_verdana',
        'nb_caelen',
        'nb_artist_lyra',
        'nb_explorer_domas',
        'nb_market_keeper',
        'nb_philosopher_davan',
        'nb_healer_thessaly',
        'nb_builder_stone',
        'nb_musician_echo'
      ]
    },
    {
      id: 'set_storied_artifacts',
      name: 'Storied Artifacts',
      description: 'Legends of the most famous items and relics in ZION.',
      badge: 'badge_relic_hunter',
      badgeLabel: 'Relic Hunter',
      entries: [
        'il_orvyns_candle',
        'il_verdanas_shears',
        'il_the_open_ledger',
        'il_the_first_brush',
        'il_the_brass_weight',
        'il_stones_plumb_line',
        'il_echos_reed',
        'il_arena_founding_stone'
      ]
    },
    {
      id: 'set_creation_myths',
      name: 'Creation Myths',
      description: 'The grand cosmological myths explaining ZION\'s nature and origin.',
      badge: 'badge_mythkeeper',
      badgeLabel: 'Keeper of Myths',
      entries: [
        'wm_the_first_light',
        'wm_the_second_light',
        'wm_the_great_debate',
        'wm_the_wilds_voice',
        'wm_the_great_compassion',
        'wm_the_impossible_arch',
        'wm_the_gardens_dream',
        'wm_the_archives_end'
      ]
    },
    {
      id: 'set_hidden_truths',
      name: 'Hidden Truths',
      description: 'The six deepest secrets of ZION, known only to the most observant.',
      badge: 'badge_seer',
      badgeLabel: 'Seer of Hidden Things',
      entries: [
        'hs_moving_wilds',
        'hs_orvyns_warmth',
        'hs_the_singing_bed',
        'hs_color_formula',
        'hs_domas_door',
        'hs_true_ledger'
      ]
    }
  ];

  // ---------------------------------------------------------------------------
  // LOOKUP MAPS (built at module load)
  // ---------------------------------------------------------------------------

  var ENTRY_MAP = {};
  for (var i = 0; i < LORE_ENTRIES.length; i++) {
    ENTRY_MAP[LORE_ENTRIES[i].id] = LORE_ENTRIES[i];
  }

  var SET_MAP = {};
  for (var j = 0; j < LORE_SETS.length; j++) {
    SET_MAP[LORE_SETS[j].id] = LORE_SETS[j];
  }

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  function createState() {
    return {
      discovered: {},    // { playerId: { loreId: { tick, timestamp } } }
      setProgress: {},   // { playerId: { setId: { completedAt } } }
      discoveryLog: []   // [{ playerId, loreId, tick, title }]
    };
  }

  function ensurePlayer(state, playerId) {
    if (!state.discovered[playerId]) state.discovered[playerId] = {};
    if (!state.setProgress[playerId]) state.setProgress[playerId] = {};
  }

  // ---------------------------------------------------------------------------
  // CORE: discoverLore
  // ---------------------------------------------------------------------------

  function discoverLore(state, playerId, loreId, currentTick) {
    ensurePlayer(state, playerId);

    var entry = ENTRY_MAP[loreId];
    if (!entry) return { success: false, reason: 'unknown_entry', entry: null, unlocked: [], setComplete: [] };

    // Already discovered
    if (state.discovered[playerId][loreId]) {
      return { success: false, reason: 'already_discovered', entry: entry, unlocked: [], setComplete: [] };
    }

    // Check prerequisite
    if (entry.prerequisite && !state.discovered[playerId][entry.prerequisite]) {
      return { success: false, reason: 'prerequisite_not_met', entry: entry, unlocked: [], setComplete: [] };
    }

    // Record discovery
    var tick = typeof currentTick === 'number' ? currentTick : 0;
    state.discovered[playerId][loreId] = { tick: tick, timestamp: Date.now() };

    // Add to discovery log
    state.discoveryLog.push({ playerId: playerId, loreId: loreId, tick: tick, title: entry.title });

    // Determine newly unlocked entries (prerequisites now satisfied)
    var unlocked = [];
    for (var k = 0; k < LORE_ENTRIES.length; k++) {
      var e = LORE_ENTRIES[k];
      if (e.prerequisite === loreId && !state.discovered[playerId][e.id]) {
        unlocked.push(e.id);
      }
    }

    // Check set completions
    var setComplete = [];
    for (var s = 0; s < LORE_SETS.length; s++) {
      var set = LORE_SETS[s];
      if (state.setProgress[playerId][set.id]) continue; // already complete
      var allFound = true;
      for (var m = 0; m < set.entries.length; m++) {
        if (!state.discovered[playerId][set.entries[m]]) { allFound = false; break; }
      }
      if (allFound) {
        state.setProgress[playerId][set.id] = { completedAt: tick };
        setComplete.push(set.id);
      }
    }

    return { success: true, entry: entry, unlocked: unlocked, setComplete: setComplete };
  }

  // ---------------------------------------------------------------------------
  // QUERIES
  // ---------------------------------------------------------------------------

  function getDiscoveredLore(state, playerId) {
    if (!state.discovered[playerId]) return [];
    var result = [];
    var disc = state.discovered[playerId];
    for (var id in disc) {
      if (disc.hasOwnProperty(id)) {
        var entry = ENTRY_MAP[id];
        if (entry) result.push({ entry: entry, discoveryData: disc[id] });
      }
    }
    return result;
  }

  function getLoreEntry(loreId) {
    return ENTRY_MAP[loreId] || null;
  }

  function getLoreByCategory(category) {
    var result = [];
    for (var i = 0; i < LORE_ENTRIES.length; i++) {
      if (LORE_ENTRIES[i].category === category) result.push(LORE_ENTRIES[i]);
    }
    return result;
  }

  function getLoreByZone(zone) {
    var result = [];
    for (var i = 0; i < LORE_ENTRIES.length; i++) {
      if (LORE_ENTRIES[i].zone === zone) result.push(LORE_ENTRIES[i]);
    }
    return result;
  }

  function getUndiscovered(state, playerId) {
    ensurePlayer(state, playerId);
    var result = [];
    for (var i = 0; i < LORE_ENTRIES.length; i++) {
      var e = LORE_ENTRIES[i];
      if (!state.discovered[playerId][e.id]) {
        result.push({ id: e.id, hint: e.hint, category: e.category, zone: e.zone, rarity: e.rarity });
      }
    }
    return result;
  }

  function getDiscoveryProgress(state, playerId) {
    ensurePlayer(state, playerId);
    var total = LORE_ENTRIES.length;
    var found = Object.keys(state.discovered[playerId]).length;
    var byCategory = {};
    for (var c = 0; c < CATEGORIES.length; c++) {
      var cat = CATEGORIES[c];
      var catTotal = getLoreByCategory(cat.id).length;
      var catFound = 0;
      for (var id in state.discovered[playerId]) {
        if (state.discovered[playerId].hasOwnProperty(id)) {
          var entry = ENTRY_MAP[id];
          if (entry && entry.category === cat.id) catFound++;
        }
      }
      byCategory[cat.id] = { found: catFound, total: catTotal, pct: catTotal > 0 ? Math.round(catFound / catTotal * 100) : 0 };
    }
    return {
      found: found,
      total: total,
      pct: total > 0 ? Math.round(found / total * 100) : 0,
      byCategory: byCategory
    };
  }

  function getSetProgress(state, playerId, setId) {
    ensurePlayer(state, playerId);
    var set = SET_MAP[setId];
    if (!set) return null;
    var found = 0;
    var entries = set.entries;
    for (var i = 0; i < entries.length; i++) {
      if (state.discovered[playerId][entries[i]]) found++;
    }
    var completed = !!(state.setProgress[playerId] && state.setProgress[playerId][setId]);
    return {
      setId: setId,
      name: set.name,
      found: found,
      total: entries.length,
      pct: entries.length > 0 ? Math.round(found / entries.length * 100) : 0,
      completed: completed,
      badge: completed ? set.badge : null
    };
  }

  function getCompletedSets(state, playerId) {
    ensurePlayer(state, playerId);
    var result = [];
    var sp = state.setProgress[playerId];
    if (!sp) return result;
    for (var setId in sp) {
      if (sp.hasOwnProperty(setId) && SET_MAP[setId]) {
        result.push({ setId: setId, set: SET_MAP[setId], completedAt: sp[setId].completedAt });
      }
    }
    return result;
  }

  function getSetBadges(state, playerId) {
    var completed = getCompletedSets(state, playerId);
    var badges = [];
    for (var i = 0; i < completed.length; i++) {
      badges.push({ badge: completed[i].set.badge, label: completed[i].set.badgeLabel, setId: completed[i].setId });
    }
    return badges;
  }

  function checkPrerequisite(state, playerId, loreId) {
    ensurePlayer(state, playerId);
    var entry = ENTRY_MAP[loreId];
    if (!entry) return false;
    if (!entry.prerequisite) return true;
    return !!(state.discovered[playerId] && state.discovered[playerId][entry.prerequisite]);
  }

  function getAvailableLore(state, playerId) {
    ensurePlayer(state, playerId);
    var result = [];
    for (var i = 0; i < LORE_ENTRIES.length; i++) {
      var e = LORE_ENTRIES[i];
      if (state.discovered[playerId][e.id]) continue;
      if (!e.prerequisite || (state.discovered[playerId] && state.discovered[playerId][e.prerequisite])) {
        result.push(e);
      }
    }
    return result;
  }

  function getLoreHint(state, playerId, loreId) {
    ensurePlayer(state, playerId);
    var entry = ENTRY_MAP[loreId];
    if (!entry) return null;
    if (state.discovered[playerId][loreId]) return null; // already found, no hint needed
    return entry.hint || null;
  }

  function getDiscoveryLog(state, playerId, count) {
    var log = state.discoveryLog.filter(function(item) { return item.playerId === playerId; });
    if (typeof count === 'number' && count > 0) {
      log = log.slice(-count);
    }
    return log;
  }

  function getLoreLeaderboard(state, count) {
    var totals = {};
    for (var playerId in state.discovered) {
      if (state.discovered.hasOwnProperty(playerId)) {
        totals[playerId] = Object.keys(state.discovered[playerId]).length;
      }
    }
    var entries = [];
    for (var pid in totals) {
      if (totals.hasOwnProperty(pid)) {
        entries.push({ playerId: pid, count: totals[pid] });
      }
    }
    entries.sort(function(a, b) { return b.count - a.count; });
    if (typeof count === 'number' && count > 0) {
      entries = entries.slice(0, count);
    }
    return entries;
  }

  function getLoreStats(state) {
    var totalPlayers = Object.keys(state.discovered).length;
    var totalDiscoveries = state.discoveryLog.length;
    var byCategoryGlobal = {};
    for (var c = 0; c < CATEGORIES.length; c++) {
      byCategoryGlobal[CATEGORIES[c].id] = 0;
    }
    for (var pid in state.discovered) {
      if (state.discovered.hasOwnProperty(pid)) {
        for (var lid in state.discovered[pid]) {
          if (state.discovered[pid].hasOwnProperty(lid)) {
            var entry = ENTRY_MAP[lid];
            if (entry && byCategoryGlobal.hasOwnProperty(entry.category)) {
              byCategoryGlobal[entry.category]++;
            }
          }
        }
      }
    }
    var byRarityGlobal = { common: 0, uncommon: 0, rare: 0, legendary: 0 };
    for (var p2 in state.discovered) {
      if (state.discovered.hasOwnProperty(p2)) {
        for (var l2 in state.discovered[p2]) {
          if (state.discovered[p2].hasOwnProperty(l2)) {
            var e2 = ENTRY_MAP[l2];
            if (e2 && byRarityGlobal.hasOwnProperty(e2.rarity)) {
              byRarityGlobal[e2.rarity]++;
            }
          }
        }
      }
    }
    return {
      totalPlayers: totalPlayers,
      totalDiscoveries: totalDiscoveries,
      byCategory: byCategoryGlobal,
      byRarity: byRarityGlobal,
      totalEntries: LORE_ENTRIES.length
    };
  }

  function getRarityDistribution() {
    return {
      common:    RARITY_WEIGHTS.common,
      uncommon:  RARITY_WEIGHTS.uncommon,
      rare:      RARITY_WEIGHTS.rare,
      legendary: RARITY_WEIGHTS.legendary
    };
  }

  // ---------------------------------------------------------------------------
  // ENVIRONMENTAL STORYTELLING
  // ---------------------------------------------------------------------------

  function getEnvironmentalTriggers(zone, tick) {
    var rng = mulberry32((tick || 0) + zone.charCodeAt(0));
    var zoneEntries = getLoreByZone(zone);
    var triggers = [];
    for (var i = 0; i < zoneEntries.length; i++) {
      if (rng() < 0.15) {
        triggers.push({
          loreId: zoneEntries[i].id,
          hint: zoneEntries[i].hint,
          rarity: zoneEntries[i].rarity
        });
      }
    }
    return triggers;
  }

  // ---------------------------------------------------------------------------
  // EXPORTS
  // ---------------------------------------------------------------------------

  exports.LORE_ENTRIES         = LORE_ENTRIES;
  exports.LORE_SETS            = LORE_SETS;
  exports.CATEGORIES           = CATEGORIES;
  exports.DISCOVER_METHODS     = DISCOVER_METHODS;
  exports.createState          = createState;
  exports.discoverLore         = discoverLore;
  exports.getDiscoveredLore    = getDiscoveredLore;
  exports.getLoreEntry         = getLoreEntry;
  exports.getLoreByCategory    = getLoreByCategory;
  exports.getLoreByZone        = getLoreByZone;
  exports.getUndiscovered      = getUndiscovered;
  exports.getDiscoveryProgress = getDiscoveryProgress;
  exports.getSetProgress       = getSetProgress;
  exports.getCompletedSets     = getCompletedSets;
  exports.getSetBadges         = getSetBadges;
  exports.checkPrerequisite    = checkPrerequisite;
  exports.getAvailableLore     = getAvailableLore;
  exports.getLoreHint          = getLoreHint;
  exports.getDiscoveryLog      = getDiscoveryLog;
  exports.getLoreLeaderboard   = getLoreLeaderboard;
  exports.getLoreStats         = getLoreStats;
  exports.getRarityDistribution = getRarityDistribution;
  exports.getEnvironmentalTriggers = getEnvironmentalTriggers;
  exports.mulberry32           = mulberry32;

})(typeof module !== 'undefined' ? module.exports : (window.LoreDiscovery = {}));
