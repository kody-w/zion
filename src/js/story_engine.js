/**
 * ZION Story Engine — Branching Narrative & Lore System
 * Manages discoverable lore, story arcs, and dynamic story generation.
 * No project dependencies.
 */

(function(exports) {
  'use strict';

  // ---------------------------------------------------------------------------
  // SEEDED PRNG
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

  var CATEGORIES = ['history', 'legend', 'mystery', 'prophecy', 'song', 'tale', 'teaching'];

  var DISCOVERY_METHODS = ['npc_talk', 'exploration', 'quest', 'event', 'stargazing', 'time_capsule'];

  var RARITIES = ['common', 'uncommon', 'rare', 'legendary'];

  var SEASONS_LIST = ['spring', 'summer', 'autumn', 'winter'];

  var ZONES_LIST = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];

  // ---------------------------------------------------------------------------
  // LORE ENTRIES — 40 entries across all categories
  // ---------------------------------------------------------------------------

  var LORE_ENTRIES = [

    // =========================================================
    // HISTORY (8 entries)
    // =========================================================
    {
      id: 'founding_of_nexus',
      title: 'The Founding of the Nexus',
      text: 'In the earliest days of ZION, the first citizens gathered at the crossroads of all paths. They had no walls, no laws — only a shared fire and a question: what kind of world would they build together? From that circle of strangers, the Nexus was born. Every road in ZION leads back to it, as every story leads back to a beginning.',
      category: 'history',
      zone: 'nexus',
      prerequisites: [],
      discoveryMethod: 'npc_talk',
      npcArchetype: 'storyteller',
      rarity: 'common',
      season: null
    },
    {
      id: 'builders_oath',
      title: "The Builder's Oath",
      text: "When the first structures rose in ZION, the builders swore an oath: no wall would be built to divide, only to shelter. The oath was carved into the foundation stones of the Commons — and though the stones have been buried under seasons of moss, the words remain. Those who build with good intent always find the carving glowing faintly beneath their feet.",
      category: 'history',
      zone: 'commons',
      prerequisites: ['founding_of_nexus'],
      discoveryMethod: 'exploration',
      npcArchetype: 'builder',
      rarity: 'common',
      season: null
    },
    {
      id: 'garden_of_dreams',
      title: 'Garden of Dreams',
      text: 'The Gardens were not planted — they were dreamed. The first gardener, known only as Verdana, sat at the center of a barren field and described every flower she wished to see. When she opened her eyes, the garden had answered. Botanists still argue whether the plants heard her or whether she simply knew where they were already sleeping.',
      category: 'history',
      zone: 'gardens',
      prerequisites: [],
      discoveryMethod: 'npc_talk',
      npcArchetype: 'gardener',
      rarity: 'common',
      season: 'spring'
    },
    {
      id: 'athenaeum_founding',
      title: 'The Athenaeum Rises',
      text: "Before the Athenaeum was built, knowledge in ZION was hoarded in private journals and locked rooms. A teacher named Caelen gathered every book she could find and placed them in an open courtyard, unguarded. That act of radical trust became the Athenaeum's founding principle: all knowledge freely given, freely taken, freely grown.",
      category: 'history',
      zone: 'athenaeum',
      prerequisites: [],
      discoveryMethod: 'npc_talk',
      npcArchetype: 'teacher',
      rarity: 'common',
      season: null
    },
    {
      id: 'studio_first_canvas',
      title: 'The First Canvas',
      text: "The Studio was founded the day someone painted the sky a different color — not to change it, but to show it could be imagined otherwise. The first canvas still hangs in the Studio's east wall, faded but intact. It shows a ZION no one has ever seen: a ZION at the end of all seasons, when every color the world ever held shines at once.",
      category: 'history',
      zone: 'studio',
      prerequisites: [],
      discoveryMethod: 'exploration',
      npcArchetype: 'artist',
      rarity: 'uncommon',
      season: null
    },
    {
      id: 'arena_first_contest',
      title: 'The First Contest',
      text: "The Arena was never meant for war. Its founder, a philosopher named Davan, believed competition refined the spirit when it was met with dignity. The first contest was a debate, not a duel: two citizens argued the meaning of home until sunrise. The winner, it was agreed, was whoever had learned the most by dawn.",
      category: 'history',
      zone: 'arena',
      prerequisites: [],
      discoveryMethod: 'npc_talk',
      npcArchetype: 'philosopher',
      rarity: 'uncommon',
      season: null
    },
    {
      id: 'agora_market_origins',
      title: 'The Market That Never Closed',
      text: 'The Agora opened on a Tuesday and never had a closing time. Its founders believed that need does not keep hours and generosity should not either. In the early days, traders slept beside their stalls and woke to find coins left in the night by anonymous hands. Some say the first trade in ZION was a story exchanged for a meal.',
      category: 'history',
      zone: 'agora',
      prerequisites: [],
      discoveryMethod: 'npc_talk',
      npcArchetype: 'merchant',
      rarity: 'common',
      season: null
    },
    {
      id: 'wilds_untamed_pact',
      title: 'The Untamed Pact',
      text: 'When early explorers reached the Wilds, they expected to tame it. Instead, they made a pact with it. The agreement was unwritten because the Wilds could not hold a pen — but also because some agreements are deeper than words. Explorers who enter the Wilds with respect return changed. Those who enter seeking conquest often do not return at all.',
      category: 'history',
      zone: 'wilds',
      prerequisites: [],
      discoveryMethod: 'exploration',
      npcArchetype: 'explorer',
      rarity: 'uncommon',
      season: null
    },

    // =========================================================
    // LEGEND (6 entries)
    // =========================================================
    {
      id: 'the_first_spark',
      title: 'Legend of the First Spark',
      text: 'Before currency was invented, there was a single ember that never went out. It was carried from camp to camp, cooking the first meals and warming the first cold nights of ZION. When the citizens created Spark, they named it after that ember. Some say if you look closely at your Spark balance in the right light, you can still see it flicker.',
      category: 'legend',
      zone: 'nexus',
      prerequisites: ['founding_of_nexus'],
      discoveryMethod: 'npc_talk',
      npcArchetype: 'storyteller',
      rarity: 'uncommon',
      season: null
    },
    {
      id: 'verdanas_lost_seed',
      title: "Verdana's Lost Seed",
      text: "Verdana, who dreamed the Gardens into being, is said to have kept one seed she never planted. She believed it was the seed of a flower that had not yet been imagined — one that would bloom only when ZION was truly ready. The seed passed through many hands and many centuries. No one knows where it rests now, but gardeners searching the eastern beds sometimes find soil that hums.",
      category: 'legend',
      zone: 'gardens',
      prerequisites: ['garden_of_dreams'],
      discoveryMethod: 'exploration',
      npcArchetype: 'gardener',
      rarity: 'rare',
      season: 'spring'
    },
    {
      id: 'the_wandering_healer',
      title: 'The Wandering Healer',
      text: "A healer known as Thessaly walked every road in ZION in a single season, tending to anyone who was hurt or lost. She never charged Spark, never asked for a name. When people tried to thank her she would say: 'I am only passing the kindness forward.' No one knows where she started or where she went when the season turned. But travelers who are truly lost sometimes find her walking beside them.",
      category: 'legend',
      zone: 'wilds',
      prerequisites: [],
      discoveryMethod: 'exploration',
      npcArchetype: 'healer',
      rarity: 'rare',
      season: null
    },
    {
      id: 'caelens_eternal_library',
      title: "Caelen's Eternal Library",
      text: "They say the Athenaeum holds more books than have ever been written. Scholars who have counted the shelves report numbers that change each time. The librarians do not find this troubling. Caelen, the Athenaeum's founder, believed knowledge grew whether or not anyone was watching — and that a library that stops surprising you has stopped being a library.",
      category: 'legend',
      zone: 'athenaeum',
      prerequisites: ['athenaeum_founding'],
      discoveryMethod: 'npc_talk',
      npcArchetype: 'teacher',
      rarity: 'uncommon',
      season: null
    },
    {
      id: 'davans_ghost_debate',
      title: "Davan's Ghost Debate",
      text: "Davan, the Arena's philosopher-founder, is said to still attend every competition as a ghost. Not to interfere — only to observe. Citizens sometimes feel a cold presence at their shoulder just before a critical moment, whispering an argument they had not considered. Whether it is Davan or their own doubt made manifest, the result is the same: a better contest.",
      category: 'legend',
      zone: 'arena',
      prerequisites: ['arena_first_contest'],
      discoveryMethod: 'npc_talk',
      npcArchetype: 'philosopher',
      rarity: 'rare',
      season: null
    },
    {
      id: 'the_midnight_musician',
      title: 'The Midnight Musician',
      text: "In the Studio district, when the clock passes midnight and most citizens are asleep, a musician plays. No one has ever seen them clearly — only a silhouette at a window, a melody that sounds like every song at once. Those who have heard it describe waking the next morning with new ideas they could not explain. The music is called the Download.",
      category: 'legend',
      zone: 'studio',
      prerequisites: ['studio_first_canvas'],
      discoveryMethod: 'stargazing',
      npcArchetype: 'musician',
      rarity: 'rare',
      season: 'winter'
    },

    // =========================================================
    // MYSTERY (6 entries)
    // =========================================================
    {
      id: 'the_quiet_road',
      title: 'The Quiet Road',
      text: "There is a road in ZION that appears on no map. Travelers who have walked it report that it connects places that should be too far apart — that an hour on the Quiet Road equals a day of walking any other way. Some say it is a glitch in the world's fabric. Others say it is a gift from whoever built ZION before the first citizens arrived.",
      category: 'mystery',
      zone: 'wilds',
      prerequisites: ['wilds_untamed_pact'],
      discoveryMethod: 'exploration',
      npcArchetype: 'explorer',
      rarity: 'legendary',
      season: null
    },
    {
      id: 'the_echo_pool',
      title: 'The Echo Pool',
      text: "Deep in the Gardens there is a pool that answers questions — not in words, but in images. You ask your question by thinking it clearly, then look into the water. What you see is not a prediction but a possibility. Gardeners have been known to kneel by the pool for hours, working out decisions that logic alone could not resolve.",
      category: 'mystery',
      zone: 'gardens',
      prerequisites: [],
      discoveryMethod: 'exploration',
      npcArchetype: 'gardener',
      rarity: 'rare',
      season: null
    },
    {
      id: 'the_locked_floor',
      title: 'The Locked Floor',
      text: "The Athenaeum has a basement floor that no key can open. Scholars have catalogued every book in the building except those on that floor. When pressed, the oldest librarians simply say: 'Those books read you.' No one has explained what happens after that, and the people who seem to know have a way of changing the subject.",
      category: 'mystery',
      zone: 'athenaeum',
      prerequisites: ['athenaeum_founding'],
      discoveryMethod: 'exploration',
      npcArchetype: 'teacher',
      rarity: 'legendary',
      season: null
    },
    {
      id: 'the_unfinished_tower',
      title: 'The Unfinished Tower',
      text: "Somewhere in the Wilds stands a tower that cannot be finished. Every stone added by day is found on the ground by morning. The builders who attempted it gave up one by one — all except for one who still goes each day, undaunted. When asked why she continues she says: 'Some things are worth building even if they are never built.'",
      category: 'mystery',
      zone: 'wilds',
      prerequisites: [],
      discoveryMethod: 'exploration',
      npcArchetype: 'builder',
      rarity: 'uncommon',
      season: null
    },
    {
      id: 'the_commons_whisper',
      title: 'The Commons Whisper',
      text: 'At certain hours, if you stand in the exact center of the Commons and remain very still, you can hear voices. Not from any direction in particular — from everywhere and nowhere. Citizens say it is the sound of every conversation ever had in the Commons, layered on top of each other, endlessly repeating. Spend enough time listening and you begin to hear your own name.',
      category: 'mystery',
      zone: 'commons',
      prerequisites: [],
      discoveryMethod: 'exploration',
      npcArchetype: 'philosopher',
      rarity: 'uncommon',
      season: null
    },
    {
      id: 'the_stars_that_move',
      title: 'The Stars That Move',
      text: "Astronomers in ZION have identified two stars that do not follow the proper paths. They move slowly, erratically, and seem to respond to events on the ground. After major festivals, they are brighter. After periods of conflict, they dim. No one has proposed a satisfactory theory. The astronomers continue to watch. The stars continue to do as they please.",
      category: 'mystery',
      zone: 'nexus',
      prerequisites: [],
      discoveryMethod: 'stargazing',
      npcArchetype: 'storyteller',
      rarity: 'rare',
      season: null
    },

    // =========================================================
    // PROPHECY (5 entries)
    // =========================================================
    {
      id: 'the_final_harvest',
      title: 'The Final Harvest',
      text: "A prophecy preserved in the Athenaeum speaks of a harvest at the end of time — not of crops but of stories. Every tale ever told in ZION will be gathered and pressed into a single fruit. Anyone who eats it will know the entire history of the world in an instant. Whether this is a promise or a warning depends on who you ask.",
      category: 'prophecy',
      zone: 'athenaeum',
      prerequisites: ['athenaeum_founding'],
      discoveryMethod: 'npc_talk',
      npcArchetype: 'teacher',
      rarity: 'rare',
      season: 'autumn'
    },
    {
      id: 'the_great_bridge',
      title: 'The Great Bridge',
      text: "Prophets of the Agora speak of a bridge that will one day connect ZION to another world entirely. Not a physical bridge — a bridge of understanding. They say ZION will send its best citizens as ambassadors of play, and the other world will send theirs, and the two will recognize each other across the impossible distance. The day the bridge appears will be the day both worlds are ready.",
      category: 'prophecy',
      zone: 'agora',
      prerequisites: [],
      discoveryMethod: 'npc_talk',
      npcArchetype: 'merchant',
      rarity: 'rare',
      season: null
    },
    {
      id: 'the_perfect_season',
      title: 'The Perfect Season',
      text: "It is written in old texts that one day ZION will experience a fifth season — a season with no name, no weather, and no time. It will last exactly long enough for every citizen to say the thing they most needed to say and do the thing they most needed to do. Then time will resume and no one will be certain whether it happened at all.",
      category: 'prophecy',
      zone: 'nexus',
      prerequisites: ['founding_of_nexus'],
      discoveryMethod: 'stargazing',
      npcArchetype: 'storyteller',
      rarity: 'legendary',
      season: null
    },
    {
      id: 'the_last_song',
      title: 'The Last Song',
      text: "A bard left this verse carved into the Studio wall: 'When the last song is sung, not silence follows / but every song sung backward / so the world remembers how it began / before it forgets again.' Musicians debate endlessly whether this is a prophecy of ending or renewal. Most agree it is both.",
      category: 'prophecy',
      zone: 'studio',
      prerequisites: ['studio_first_canvas'],
      discoveryMethod: 'exploration',
      npcArchetype: 'musician',
      rarity: 'legendary',
      season: 'winter'
    },
    {
      id: 'the_thousand_return',
      title: 'The Thousand Return',
      text: "An Arena prophecy: 'When the thousandth contest is completed, those who gave their best and lost will return, not as opponents but as teachers.' Citizens of the Arena treat this as spiritual rather than literal — a reminder that defeat does not mean diminishment. Those who lose well, they say, teach more than those who win poorly.",
      category: 'prophecy',
      zone: 'arena',
      prerequisites: ['arena_first_contest'],
      discoveryMethod: 'npc_talk',
      npcArchetype: 'philosopher',
      rarity: 'uncommon',
      season: null
    },

    // =========================================================
    // SONG (5 entries)
    // =========================================================
    {
      id: 'the_nexus_round',
      title: 'The Nexus Round',
      text: "A canticle sung in rounds at the crossroads:\n\n'We meet at the middle, we part at the edge,\nWe carry the center wherever we go.\nThe road is the only unbreakable pledge,\nAnd home is the direction we know.'\n\n'We know, we know, we go.'\n\nCircles sung in rounds grow louder at the center.",
      category: 'song',
      zone: 'nexus',
      prerequisites: [],
      discoveryMethod: 'npc_talk',
      npcArchetype: 'musician',
      rarity: 'common',
      season: null
    },
    {
      id: 'gardens_lullaby',
      title: "The Gardener's Lullaby",
      text: "Sung to seeds and tired workers alike:\n\n'Sleep, little seedling, beneath the soft earth,\nYour dreaming is growing, your rest has worth.\nThe rain will remember your name in the night,\nAnd morning will find you still reaching for light.'\n\nGardens worked late often find the nightshift team humming this without knowing where they learned it.",
      category: 'song',
      zone: 'gardens',
      prerequisites: [],
      discoveryMethod: 'npc_talk',
      npcArchetype: 'musician',
      rarity: 'common',
      season: 'spring'
    },
    {
      id: 'the_explorers_chorus',
      title: "The Explorer's Chorus",
      text: "A marching song for those who go where maps don't:\n\n'Over the edge and into the blank,\nWhere the last line of knowing went thin.\nWe don't walk for the glory or rank —\nWe walk because walking begins.\n\nBegins, begins, begins.'\n\nThis song gets faster the deeper you go into the Wilds.",
      category: 'song',
      zone: 'wilds',
      prerequisites: [],
      discoveryMethod: 'exploration',
      npcArchetype: 'musician',
      rarity: 'uncommon',
      season: null
    },
    {
      id: 'traders_ballad',
      title: "The Trader's Ballad",
      text: "A song passed between merchants in the Agora:\n\n'The best trade I ever made was this:\nI gave away something I could not keep,\nAnd received in return something I did not know I missed.\nThat is the secret the market won't speak.\n\nGive what you can, take what you need,\nLeave something behind for the next hungry seed.'",
      category: 'song',
      zone: 'agora',
      prerequisites: [],
      discoveryMethod: 'npc_talk',
      npcArchetype: 'musician',
      rarity: 'common',
      season: null
    },
    {
      id: 'winter_anthem',
      title: 'The Winter Anthem',
      text: "Sung only when snow falls in ZION:\n\n'Let the cold come in — we are warmer than walls.\nLet the dark come in — we are brighter than halls.\nThe winter that finds us will find us together,\nAnd come spring we'll remember we survived the weather.\n\nWe survived, we survived, we thrive.'",
      category: 'song',
      zone: 'commons',
      prerequisites: [],
      discoveryMethod: 'npc_talk',
      npcArchetype: 'musician',
      rarity: 'uncommon',
      season: 'winter'
    },

    // =========================================================
    // TALE (5 entries)
    // =========================================================
    {
      id: 'the_two_merchants',
      title: 'The Two Merchants',
      text: "Two merchants came to the Agora with the same rare gem. Each believed it to be unique. Each demanded the other must be mistaken. They argued for a day and a night. A child walked by and asked to see both gems. She looked at them carefully and said: 'These are not the same. One is the gem you found. The other is the gem it became after you found it.' The merchants had no answer for this, so they went to sleep.",
      category: 'tale',
      zone: 'agora',
      prerequisites: [],
      discoveryMethod: 'npc_talk',
      npcArchetype: 'storyteller',
      rarity: 'common',
      season: null
    },
    {
      id: 'the_builder_and_the_storm',
      title: 'The Builder and the Storm',
      text: "A builder was raising a wall when a great storm came and knocked it down. She built it again. The storm came again. She built it a third time, this time with a door in the exact place the wind had struck. The storm came and passed straight through without touching a stone. Her students asked what lesson they should take. She said: 'Always listen to what is trying to get in.'",
      category: 'tale',
      zone: 'commons',
      prerequisites: [],
      discoveryMethod: 'npc_talk',
      npcArchetype: 'storyteller',
      rarity: 'common',
      season: null
    },
    {
      id: 'the_student_who_forgot',
      title: 'The Student Who Forgot',
      text: "A student at the Athenaeum read every book on the shelves and forgot all of it the next morning. She panicked until her teacher pointed out: she was able to learn everything she forgot faster each time. 'Knowledge,' the teacher said, 'is not something you hold. It is something you can find.' The student graduated by proving she could find anything she needed in under ten minutes.",
      category: 'tale',
      zone: 'athenaeum',
      prerequisites: [],
      discoveryMethod: 'npc_talk',
      npcArchetype: 'teacher',
      rarity: 'common',
      season: null
    },
    {
      id: 'the_artist_and_the_wall',
      title: 'The Artist and the Wall',
      text: "An artist was given a wall and told to paint something that would last forever. She spent one year painting and one year watching it fade. When the paint was gone she stood before the blank wall and said: 'Done.' When asked what she had painted, she said: 'A lesson in how walls look when you have given a year of attention to them.' The wall was donated to the Athenaeum, bare and beloved.",
      category: 'tale',
      zone: 'studio',
      prerequisites: [],
      discoveryMethod: 'npc_talk',
      npcArchetype: 'storyteller',
      rarity: 'uncommon',
      season: null
    },
    {
      id: 'the_healer_in_the_wilds',
      title: 'The Healer in the Wilds',
      text: "A healer went into the Wilds seeking a plant that could cure any illness. She searched for a season and found nothing. On the last day before she meant to give up, she fell and hurt her ankle. Unable to walk, she sat very still. A deer approached. Then a fox. Then a dozen birds. They sat with her until she was calm enough to look at her ankle properly. It was not broken — only twisted. She walked home. The cure she'd been looking for, she wrote, was always stillness.",
      category: 'tale',
      zone: 'wilds',
      prerequisites: [],
      discoveryMethod: 'exploration',
      npcArchetype: 'healer',
      rarity: 'uncommon',
      season: 'autumn'
    },

    // =========================================================
    // TEACHING (5 entries)
    // =========================================================
    {
      id: 'the_seven_questions',
      title: 'The Seven Questions',
      text: "A philosopher in the Athenaeum taught only through questions. The first: 'What is real?' The second: 'What is true?' The third: 'What is good?' The fourth: 'What is beautiful?' The fifth: 'What endures?' The sixth: 'What is worth the cost?' The seventh: 'Who decides?' Students who could answer the seventh had, she said, answered all the others.",
      category: 'teaching',
      zone: 'athenaeum',
      prerequisites: [],
      discoveryMethod: 'npc_talk',
      npcArchetype: 'philosopher',
      rarity: 'common',
      season: null
    },
    {
      id: 'on_the_nature_of_spark',
      title: 'On the Nature of Spark',
      text: "A lecture from the Agora Trading Guild: 'Spark is not wealth. Wealth is what Spark becomes when it moves. A Spark held is merely potential. A Spark given creates a connection. A Spark exchanged creates a relationship. A Spark taxed creates a community. Never confuse the coin with the conversation — the coin is just the excuse to begin talking.'",
      category: 'teaching',
      zone: 'agora',
      prerequisites: [],
      discoveryMethod: 'npc_talk',
      npcArchetype: 'teacher',
      rarity: 'common',
      season: null
    },
    {
      id: 'the_path_doctrine',
      title: 'The Path Doctrine',
      text: "Explorers of ZION are taught: 'A path you did not make is a path someone made for you. A path you make is a path you make for someone else. The best paths are worn smooth by many feet going many directions. If your path ends at a wall, you have not found a dead end — you have found where the next door will go.'",
      category: 'teaching',
      zone: 'wilds',
      prerequisites: [],
      discoveryMethod: 'exploration',
      npcArchetype: 'explorer',
      rarity: 'uncommon',
      season: null
    },
    {
      id: 'the_commons_contract',
      title: 'The Commons Contract',
      text: "Posted at every entrance to the Commons: 'You are welcome here if: you bring no harm, you take only what you need, you leave something behind that others may use, and you remember that everyone here made the same agreement. That is all. That is enough.' The contract has never been enforced — it has never needed to be.",
      category: 'teaching',
      zone: 'commons',
      prerequisites: [],
      discoveryMethod: 'npc_talk',
      npcArchetype: 'philosopher',
      rarity: 'common',
      season: null
    },
    {
      id: 'on_winning_and_losing',
      title: 'On Winning and Losing',
      text: "A teaching from the Arena philosophers: 'Winning and losing are positions, not identities. You win a contest; you are not a winner. You lose a contest; you are not a loser. The person who confuses their score with their soul has already made the fundamental error. Compete with all your skill and none of your ego, and you will leave the Arena better regardless of the board.'",
      category: 'teaching',
      zone: 'arena',
      prerequisites: [],
      discoveryMethod: 'npc_talk',
      npcArchetype: 'philosopher',
      rarity: 'common',
      season: null
    }
  ];

  // Build lookup map
  var LORE_MAP = {};
  for (var _li = 0; _li < LORE_ENTRIES.length; _li++) {
    LORE_MAP[LORE_ENTRIES[_li].id] = LORE_ENTRIES[_li];
  }

  // ---------------------------------------------------------------------------
  // STORY ARCS — 8 multi-part narrative arcs
  // ---------------------------------------------------------------------------

  var STORY_ARCS = [
    {
      id: 'the_first_dawn',
      title: 'The First Dawn',
      parts: ['founding_of_nexus', 'builders_oath', 'garden_of_dreams'],
      reward: { spark: 100, badge: 'lorekeeper', xp: 200 },
      description: 'Piece together the story of how ZION began.'
    },
    {
      id: 'roots_and_branches',
      title: 'Roots and Branches',
      parts: ['garden_of_dreams', 'verdanas_lost_seed', 'gardens_lullaby', 'the_echo_pool'],
      reward: { spark: 150, badge: 'green_thumb', xp: 300 },
      description: 'Follow the living legacy of the first gardener through the seasons.'
    },
    {
      id: 'the_scholars_path',
      title: "The Scholar's Path",
      parts: ['athenaeum_founding', 'caelens_eternal_library', 'the_student_who_forgot', 'the_seven_questions', 'the_locked_floor'],
      reward: { spark: 200, badge: 'deep_reader', xp: 400 },
      description: 'Uncover the mysteries that the Athenaeum holds in plain sight.'
    },
    {
      id: 'songs_of_the_world',
      title: 'Songs of the World',
      parts: ['the_nexus_round', 'gardens_lullaby', 'the_explorers_chorus', 'traders_ballad', 'winter_anthem'],
      reward: { spark: 175, badge: 'bard_soul', xp: 350 },
      description: 'Collect the five great songs of ZION and know the soul of its people.'
    },
    {
      id: 'into_the_wilds',
      title: 'Into the Wilds',
      parts: ['wilds_untamed_pact', 'the_wandering_healer', 'the_quiet_road', 'the_path_doctrine', 'the_unfinished_tower'],
      reward: { spark: 225, badge: 'trailblazer', xp: 450 },
      description: 'Map the unmappable and discover what lies beyond the last known edge.'
    },
    {
      id: 'the_artists_eye',
      title: "The Artist's Eye",
      parts: ['studio_first_canvas', 'the_midnight_musician', 'the_artist_and_the_wall', 'the_last_song'],
      reward: { spark: 175, badge: 'creative_soul', xp: 350 },
      description: 'See ZION through the eyes of its artists and hear what they heard.'
    },
    {
      id: 'marketplace_of_ideas',
      title: 'Marketplace of Ideas',
      parts: ['agora_market_origins', 'the_great_bridge', 'the_two_merchants', 'traders_ballad', 'on_the_nature_of_spark'],
      reward: { spark: 150, badge: 'fair_dealer', xp: 300 },
      description: 'Learn how trade, trust, and generosity built the beating heart of ZION.'
    },
    {
      id: 'the_long_contest',
      title: 'The Long Contest',
      parts: ['arena_first_contest', 'davans_ghost_debate', 'the_thousand_return', 'on_winning_and_losing'],
      reward: { spark: 175, badge: 'true_competitor', xp: 350 },
      description: 'Understand the philosophy of competition as ZION intended it.'
    }
  ];

  // Build arc lookup map
  var ARC_MAP = {};
  for (var _ai = 0; _ai < STORY_ARCS.length; _ai++) {
    ARC_MAP[STORY_ARCS[_ai].id] = STORY_ARCS[_ai];
  }

  // ---------------------------------------------------------------------------
  // STORY TEMPLATES — dynamic story generation
  // ---------------------------------------------------------------------------

  var STORY_TEMPLATES = [
    {
      eventType: 'harvest_festival',
      templates: [
        'During the {season} harvest in {zone}, the citizens gathered to celebrate a bounty that no single pair of hands had grown alone.',
        'The {season} brought abundance to {zone}, and the people rejoiced with tables that groaned under the weight of shared work.',
        '{npcName} led the harvest ceremony in {zone} this {season}, singing the old counting songs while {playerName} carried the first basket.'
      ]
    },
    {
      eventType: 'storm_warning',
      templates: [
        'Clouds gathered over {zone} on a {season} afternoon, and {npcName} was first to call for shelter.',
        'The {season} storm that struck {zone} was the worst in recent memory — and the moment the community showed what it was made of.',
        'When the storm rolled in over {zone}, {playerName} helped {npcName} secure the stalls before a single piece of goods was lost.'
      ]
    },
    {
      eventType: 'new_citizen',
      templates: [
        'On a quiet {season} morning in {zone}, a new face appeared at the crossroads. {playerName} was among the first to say welcome.',
        '{npcName} remembered the day a new citizen arrived in {zone} in {season}: lost, uncertain, and full of questions worth answering.',
        'Every arrival in {zone} is celebrated, but the {season} arrival of the citizen who would change everything began so quietly.'
      ]
    },
    {
      eventType: 'contest_won',
      templates: [
        '{playerName} stepped into the arena in {zone} that {season} and proved something the crowd had not expected.',
        'The contest held in {zone} during {season} will be remembered — {playerName} competed not to win but to grow, and won anyway.',
        '{npcName} presented the prize to {playerName} in {zone} and said: "This is not the end of anything. This is where your real practice begins."'
      ]
    },
    {
      eventType: 'artifact_found',
      templates: [
        'In the depths of {zone}, during an unremarkable {season} afternoon, {playerName} found something that had no business being there.',
        '{npcName} said the artifact found in {zone} had been lost since before the {season} festivals began counting years.',
        'The discovery in {zone} that {season} rewrote three chapters of the Athenaeum catalog and opened four new questions.'
      ]
    },
    {
      eventType: 'rare_weather',
      templates: [
        "The {zone} saw weather this {season} that the oldest residents had never witnessed — {npcName} wrote it down so no one would have to argue about it later.",
        'Snow in {zone} in {season}: the kind of moment that becomes a landmark in personal calendars for years afterward.',
        'It rained upward in {zone} once, during a {season} that refused to behave. {playerName} was there and still cannot fully explain it.'
      ]
    }
  ];

  // Build template lookup map
  var TEMPLATE_MAP = {};
  for (var _ti = 0; _ti < STORY_TEMPLATES.length; _ti++) {
    TEMPLATE_MAP[STORY_TEMPLATES[_ti].eventType] = STORY_TEMPLATES[_ti];
  }

  // ---------------------------------------------------------------------------
  // INTERNAL HELPERS
  // ---------------------------------------------------------------------------

  function ensurePlayerLore(state, playerId) {
    if (!state.players) {
      state.players = {};
    }
    if (!state.players[playerId]) {
      state.players[playerId] = {};
    }
    if (!state.players[playerId].discoveredLore) {
      state.players[playerId].discoveredLore = [];
    }
    if (!state.players[playerId].discoveredLoreTimestamps) {
      state.players[playerId].discoveredLoreTimestamps = {};
    }
  }

  function playerHasLore(state, playerId, loreId) {
    var lore = state.players[playerId].discoveredLore;
    for (var i = 0; i < lore.length; i++) {
      if (lore[i] === loreId) return true;
    }
    return false;
  }

  function checkPrerequisitesMet(state, playerId, loreEntry) {
    var prereqs = loreEntry.prerequisites;
    for (var i = 0; i < prereqs.length; i++) {
      if (!playerHasLore(state, playerId, prereqs[i])) {
        return false;
      }
    }
    return true;
  }

  function checkArcCompletion(state, playerId, loreId) {
    var completedArc = null;
    for (var i = 0; i < STORY_ARCS.length; i++) {
      var arc = STORY_ARCS[i];
      var partsMatch = false;
      for (var j = 0; j < arc.parts.length; j++) {
        if (arc.parts[j] === loreId) {
          partsMatch = true;
          break;
        }
      }
      if (!partsMatch) continue;
      // Check if all parts are now discovered
      var allFound = true;
      for (var k = 0; k < arc.parts.length; k++) {
        if (!playerHasLore(state, playerId, arc.parts[k])) {
          allFound = false;
          break;
        }
      }
      if (allFound) {
        completedArc = arc;
        break;
      }
    }
    return completedArc;
  }

  function substituteTemplate(template, context) {
    var result = template;
    var keys = Object.keys(context);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var val = String(context[key]);
      // Replace all occurrences of {key}
      var placeholder = '{' + key + '}';
      while (result.indexOf(placeholder) !== -1) {
        result = result.replace(placeholder, val);
      }
    }
    return result;
  }

  function hashString(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  // ---------------------------------------------------------------------------
  // PUBLIC API
  // ---------------------------------------------------------------------------

  /**
   * Discover a lore entry for a player.
   * @param {Object} state - World state
   * @param {string} playerId
   * @param {string} loreId
   * @param {string} method - discovery method used
   * @returns {{success, loreEntry, arcCompleted, reward}}
   */
  function discoverLore(state, playerId, loreId, method) {
    if (!state || !playerId || !loreId) {
      return { success: false, error: 'Missing required arguments', loreEntry: null, arcCompleted: null, reward: null };
    }

    var loreEntry = LORE_MAP[loreId];
    if (!loreEntry) {
      return { success: false, error: 'Unknown lore ID: ' + loreId, loreEntry: null, arcCompleted: null, reward: null };
    }

    ensurePlayerLore(state, playerId);

    // Duplicate check
    if (playerHasLore(state, playerId, loreId)) {
      return { success: false, error: 'Lore already discovered', loreEntry: loreEntry, arcCompleted: null, reward: null };
    }

    // Check prerequisites
    if (!checkPrerequisitesMet(state, playerId, loreEntry)) {
      return { success: false, error: 'Prerequisites not met', loreEntry: loreEntry, arcCompleted: null, reward: null };
    }

    // Check discovery method matches
    if (method && loreEntry.discoveryMethod !== method) {
      return { success: false, error: 'Wrong discovery method', loreEntry: loreEntry, arcCompleted: null, reward: null };
    }

    // Add to discovered lore
    state.players[playerId].discoveredLore.push(loreId);
    state.players[playerId].discoveredLoreTimestamps[loreId] = Date.now();

    // Check for arc completion
    var completedArc = checkArcCompletion(state, playerId, loreId);
    var reward = null;
    if (completedArc) {
      reward = {
        spark: completedArc.reward.spark,
        xp: completedArc.reward.xp,
        badge: completedArc.reward.badge
      };
    }

    return {
      success: true,
      loreEntry: loreEntry,
      arcCompleted: completedArc || null,
      reward: reward
    };
  }

  /**
   * Get a player's discovered lore, optionally filtered by category.
   * @param {Object} state
   * @param {string} playerId
   * @param {string|null} category
   * @returns {Array}
   */
  function getDiscoveredLore(state, playerId, category) {
    if (!state || !state.players || !state.players[playerId]) {
      return [];
    }
    var discovered = state.players[playerId].discoveredLore || [];
    var result = [];
    for (var i = 0; i < discovered.length; i++) {
      var entry = LORE_MAP[discovered[i]];
      if (!entry) continue;
      if (category && entry.category !== category) continue;
      result.push(entry);
    }
    return result;
  }

  /**
   * Get lore entries the player hasn't discovered yet.
   * By default excludes entries with prerequisites not yet met (hidden).
   * @param {Object} state
   * @param {string} playerId
   * @param {boolean} [includeHidden] - if true, also include locked entries
   * @returns {Array}
   */
  function getUndiscoveredLore(state, playerId, includeHidden) {
    ensurePlayerLore(state, playerId);
    var discovered = state.players[playerId].discoveredLore || [];
    var discoveredSet = {};
    for (var i = 0; i < discovered.length; i++) {
      discoveredSet[discovered[i]] = true;
    }

    var result = [];
    for (var j = 0; j < LORE_ENTRIES.length; j++) {
      var entry = LORE_ENTRIES[j];
      if (discoveredSet[entry.id]) continue;
      if (!includeHidden && !checkPrerequisitesMet(state, playerId, entry)) continue;
      result.push(entry);
    }
    return result;
  }

  /**
   * Get lore entries currently available given method, zone, and season.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} method
   * @param {string} zone
   * @param {string} season
   * @returns {Array}
   */
  function getAvailableLore(state, playerId, method, zone, season) {
    ensurePlayerLore(state, playerId);
    var discovered = state.players[playerId].discoveredLore || [];
    var discoveredSet = {};
    for (var i = 0; i < discovered.length; i++) {
      discoveredSet[discovered[i]] = true;
    }

    var result = [];
    for (var j = 0; j < LORE_ENTRIES.length; j++) {
      var entry = LORE_ENTRIES[j];
      if (discoveredSet[entry.id]) continue;
      if (!checkPrerequisitesMet(state, playerId, entry)) continue;
      if (method && entry.discoveryMethod !== method) continue;
      if (zone && entry.zone !== zone) continue;
      if (season && entry.season !== null && entry.season !== season) continue;
      result.push(entry);
    }
    return result;
  }

  /**
   * Return lore entry definition by ID.
   * @param {string} loreId
   * @returns {Object|null}
   */
  function getLoreById(loreId) {
    return LORE_MAP[loreId] || null;
  }

  /**
   * Return all story arcs.
   * @returns {Array}
   */
  function getStoryArcs() {
    return STORY_ARCS.slice();
  }

  /**
   * Get progress for a specific arc.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} arcId
   * @returns {{partsFound, totalParts, percent, completed, missingParts}}
   */
  function getArcProgress(state, playerId, arcId) {
    var arc = ARC_MAP[arcId];
    if (!arc) {
      return { partsFound: 0, totalParts: 0, percent: 0, completed: false, missingParts: [] };
    }
    ensurePlayerLore(state, playerId);
    var discovered = state.players[playerId].discoveredLore || [];
    var discoveredSet = {};
    for (var i = 0; i < discovered.length; i++) {
      discoveredSet[discovered[i]] = true;
    }

    var missingParts = [];
    var partsFound = 0;
    for (var j = 0; j < arc.parts.length; j++) {
      if (discoveredSet[arc.parts[j]]) {
        partsFound++;
      } else {
        missingParts.push(arc.parts[j]);
      }
    }
    var totalParts = arc.parts.length;
    var percent = totalParts > 0 ? Math.round((partsFound / totalParts) * 100) : 0;
    return {
      partsFound: partsFound,
      totalParts: totalParts,
      percent: percent,
      completed: partsFound === totalParts,
      missingParts: missingParts
    };
  }

  /**
   * Get progress for all arcs.
   * @param {Object} state
   * @param {string} playerId
   * @returns {Array}
   */
  function getAllArcProgress(state, playerId) {
    var result = [];
    for (var i = 0; i < STORY_ARCS.length; i++) {
      var arc = STORY_ARCS[i];
      var progress = getArcProgress(state, playerId, arc.id);
      result.push({
        arc: arc,
        progress: progress
      });
    }
    return result;
  }

  /**
   * Generate a dynamic story beat from an event type and context.
   * @param {string} eventType
   * @param {Object} context - {season, zone, playerName, npcName, ...}
   * @returns {{success, text, eventType}|{success, error}}
   */
  function generateStoryBeat(eventType, context) {
    var templateDef = TEMPLATE_MAP[eventType];
    if (!templateDef) {
      return { success: false, error: 'Unknown event type: ' + eventType, text: null };
    }

    var templates = templateDef.templates;
    var seed = hashString(eventType + JSON.stringify(context || {}));
    var rng = mulberry32(seed);
    var idx = Math.floor(rng() * templates.length);
    var rawTemplate = templates[idx];
    var text = substituteTemplate(rawTemplate, context || {});

    return {
      success: true,
      text: text,
      eventType: eventType
    };
  }

  /**
   * Get a lore entry an NPC of a given archetype could tell in this zone/season.
   * Prioritizes undiscovered lore.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} npcArchetype
   * @param {string} zone
   * @param {string} season
   * @returns {Object|null}
   */
  function getNpcStory(state, playerId, npcArchetype, zone, season) {
    ensurePlayerLore(state, playerId);
    var discovered = state.players[playerId].discoveredLore || [];
    var discoveredSet = {};
    for (var i = 0; i < discovered.length; i++) {
      discoveredSet[discovered[i]] = true;
    }

    var candidates = [];
    for (var j = 0; j < LORE_ENTRIES.length; j++) {
      var entry = LORE_ENTRIES[j];
      if (entry.npcArchetype !== npcArchetype) continue;
      if (entry.zone !== zone) continue;
      if (season && entry.season !== null && entry.season !== season) continue;
      if (!checkPrerequisitesMet(state, playerId, entry)) continue;
      candidates.push({ entry: entry, discovered: !!discoveredSet[entry.id] });
    }

    if (candidates.length === 0) return null;

    // Prefer undiscovered
    var undiscovered = [];
    for (var k = 0; k < candidates.length; k++) {
      if (!candidates[k].discovered) {
        undiscovered.push(candidates[k].entry);
      }
    }

    if (undiscovered.length > 0) {
      return undiscovered[0];
    }

    // All discovered — return null (NPC has nothing new)
    return null;
  }

  /**
   * Get overall completion percentage.
   * @param {Object} state
   * @param {string} playerId
   * @returns {number} 0–100
   */
  function getCompletionPercent(state, playerId) {
    if (!state || !state.players || !state.players[playerId]) return 0;
    var discovered = state.players[playerId].discoveredLore || [];
    return Math.round((discovered.length / LORE_ENTRIES.length) * 100);
  }

  /**
   * Get all lore entries for a specific zone.
   * @param {string} zone
   * @returns {Array}
   */
  function getLoreByZone(zone) {
    var result = [];
    for (var i = 0; i < LORE_ENTRIES.length; i++) {
      if (LORE_ENTRIES[i].zone === zone) {
        result.push(LORE_ENTRIES[i]);
      }
    }
    return result;
  }

  /**
   * Return all lore categories.
   * @returns {Array}
   */
  function getCategories() {
    return CATEGORIES.slice();
  }

  /**
   * Search discovered lore by keyword in title or text.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} query
   * @returns {Array}
   */
  function searchLore(state, playerId, query) {
    if (!state || !state.players || !state.players[playerId]) return [];
    var discovered = state.players[playerId].discoveredLore || [];
    if (!query || typeof query !== 'string') return [];
    var q = query.toLowerCase();
    var result = [];
    for (var i = 0; i < discovered.length; i++) {
      var entry = LORE_MAP[discovered[i]];
      if (!entry) continue;
      if (entry.title.toLowerCase().indexOf(q) !== -1 || entry.text.toLowerCase().indexOf(q) !== -1) {
        result.push(entry);
      }
    }
    return result;
  }

  /**
   * Get the last N discovered lore entries.
   * @param {Object} state
   * @param {string} playerId
   * @param {number} count
   * @returns {Array}
   */
  function getRecentDiscoveries(state, playerId, count) {
    if (!state || !state.players || !state.players[playerId]) return [];
    var discovered = state.players[playerId].discoveredLore || [];
    var timestamps = state.players[playerId].discoveredLoreTimestamps || {};
    var n = count || 5;

    var sorted = discovered.slice().sort(function(a, b) {
      var ta = timestamps[a] || 0;
      var tb = timestamps[b] || 0;
      return tb - ta;
    });

    var result = [];
    for (var i = 0; i < Math.min(n, sorted.length); i++) {
      var entry = LORE_MAP[sorted[i]];
      if (entry) result.push(entry);
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // EXPORTS
  // ---------------------------------------------------------------------------

  exports.discoverLore = discoverLore;
  exports.getDiscoveredLore = getDiscoveredLore;
  exports.getUndiscoveredLore = getUndiscoveredLore;
  exports.getAvailableLore = getAvailableLore;
  exports.getLoreById = getLoreById;
  exports.getStoryArcs = getStoryArcs;
  exports.getArcProgress = getArcProgress;
  exports.getAllArcProgress = getAllArcProgress;
  exports.generateStoryBeat = generateStoryBeat;
  exports.getNpcStory = getNpcStory;
  exports.getCompletionPercent = getCompletionPercent;
  exports.getLoreByZone = getLoreByZone;
  exports.getCategories = getCategories;
  exports.searchLore = searchLore;
  exports.getRecentDiscoveries = getRecentDiscoveries;

  // Expose data for testing
  exports._LORE_ENTRIES = LORE_ENTRIES;
  exports._STORY_ARCS = STORY_ARCS;
  exports._STORY_TEMPLATES = STORY_TEMPLATES;
  exports._CATEGORIES = CATEGORIES;
  exports._ZONES_LIST = ZONES_LIST;

})(typeof module !== 'undefined' ? module.exports : (window.StoryEngine = {}));
