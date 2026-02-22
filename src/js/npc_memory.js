/**
 * npc_memory.js - NPC Relationship Memory System
 *
 * Tracks friendship levels, gift history, opinions, and interaction history
 * between players and NPCs. Modifies dialogue and provides gameplay bonuses
 * based on relationship tiers.
 */

(function(exports) {
  'use strict';

  // ============================================================================
  // CONSTANTS
  // ============================================================================

  var DECAY_RATE = 0.5; // Friendship points lost per day of absence (after grace period)
  var DECAY_GRACE_DAYS = 3; // Days before decay begins
  var MAX_GIFT_MEMORY = 50;
  var INTERACTION_MEMORY_LIMIT = 100;
  var MAX_FRIENDSHIP = 100;
  var MIN_FRIENDSHIP = 0;

  // ============================================================================
  // RELATIONSHIP TIERS
  // ============================================================================

  var RELATIONSHIP_TIERS = {
    stranger:      { min: 0,   max: 9,   label: 'Stranger',      color: '#888888' },
    acquaintance:  { min: 10,  max: 29,  label: 'Acquaintance',  color: '#88aacc' },
    friend:        { min: 30,  max: 59,  label: 'Friend',        color: '#44bb66' },
    close_friend:  { min: 60,  max: 99,  label: 'Close Friend',  color: '#ffaa00' },
    best_friend:   { min: 100, max: 100, label: 'Best Friend',   color: '#ff6600' }
  };

  // ============================================================================
  // OPINION TYPES
  // ============================================================================

  var OPINION_TYPES = {
    likes:    'likes',
    dislikes: 'dislikes',
    neutral:  'neutral'
  };

  // ============================================================================
  // ARCHETYPE PREFERENCES
  // Items/topics each archetype likes, dislikes, or is neutral about
  // ============================================================================

  var ARCHETYPE_PREFERENCES = {
    gardener: {
      items: {
        likes:    ['seeds', 'flowers', 'herbs', 'watering_can', 'fertilizer', 'garden_tools', 'honey', 'fruit'],
        dislikes: ['axe', 'fire', 'poison', 'salt', 'mining_pick'],
        neutral:  ['rope', 'cloth', 'coin', 'gem']
      },
      topics: {
        likes:    ['gardens', 'nature', 'rain', 'spring', 'harvest'],
        dislikes: ['pollution', 'deforestation', 'drought'],
        neutral:  ['trade', 'combat', 'politics']
      }
    },
    builder: {
      items: {
        likes:    ['stone', 'wood', 'blueprint', 'hammer', 'chisel', 'rope', 'metal', 'brick'],
        dislikes: ['poison', 'fire', 'decay'],
        neutral:  ['flowers', 'cloth', 'food', 'gem']
      },
      topics: {
        likes:    ['construction', 'architecture', 'agora', 'commons', 'innovation'],
        dislikes: ['chaos', 'destruction', 'disorder'],
        neutral:  ['music', 'philosophy', 'love']
      }
    },
    storyteller: {
      items: {
        likes:    ['book', 'scroll', 'ink', 'quill', 'lantern', 'map', 'journal'],
        dislikes: ['noise_device', 'mining_pick', 'axe'],
        neutral:  ['food', 'flowers', 'coin', 'cloth']
      },
      topics: {
        likes:    ['athenaeum', 'history', 'legends', 'travel', 'adventure'],
        dislikes: ['censorship', 'silence', 'boredom'],
        neutral:  ['trade', 'construction', 'combat']
      }
    },
    merchant: {
      items: {
        likes:    ['coin', 'gem', 'rare_goods', 'exotic_spice', 'silk', 'jewelry', 'contract'],
        dislikes: ['broken_item', 'spoiled_food', 'counterfeit'],
        neutral:  ['flowers', 'tools', 'scrolls', 'rope']
      },
      topics: {
        likes:    ['agora', 'trade', 'profit', 'travel', 'negotiation'],
        dislikes: ['theft', 'taxes', 'protectionism'],
        neutral:  ['music', 'philosophy', 'nature']
      }
    },
    explorer: {
      items: {
        likes:    ['map', 'compass', 'rope', 'torch', 'rations', 'journal', 'artifact', 'specimen'],
        dislikes: ['cage', 'chains', 'heavy_armor'],
        neutral:  ['jewelry', 'coin', 'silk', 'seeds']
      },
      topics: {
        likes:    ['wilds', 'discovery', 'adventure', 'unknown_zones', 'cartography'],
        dislikes: ['borders', 'walls', 'stagnation'],
        neutral:  ['trade', 'politics', 'philosophy']
      }
    },
    teacher: {
      items: {
        likes:    ['book', 'scroll', 'quill', 'ink', 'chalk', 'globe', 'astrolabe'],
        dislikes: ['noise_device', 'distraction_toy', 'weapon'],
        neutral:  ['food', 'flowers', 'coin', 'cloth']
      },
      topics: {
        likes:    ['athenaeum', 'education', 'knowledge', 'research', 'wisdom'],
        dislikes: ['ignorance', 'propaganda', 'superstition'],
        neutral:  ['trade', 'combat', 'entertainment']
      }
    },
    musician: {
      items: {
        likes:    ['instrument', 'sheet_music', 'metronome', 'rosin', 'strings', 'flute', 'drum'],
        dislikes: ['earplugs', 'cacophony_device', 'noise_blocker'],
        neutral:  ['coin', 'cloth', 'food', 'tools']
      },
      topics: {
        likes:    ['studio', 'performance', 'composition', 'harmony', 'festival'],
        dislikes: ['silence', 'censorship', 'monotony'],
        neutral:  ['trade', 'construction', 'politics']
      }
    },
    healer: {
      items: {
        likes:    ['herbs', 'potion', 'bandage', 'salve', 'crystal', 'honey', 'flowers'],
        dislikes: ['poison', 'weapon', 'toxin'],
        neutral:  ['coin', 'gem', 'book', 'cloth']
      },
      topics: {
        likes:    ['gardens', 'wellness', 'compassion', 'medicine', 'peace'],
        dislikes: ['violence', 'disease', 'suffering'],
        neutral:  ['trade', 'architecture', 'performance']
      }
    },
    philosopher: {
      items: {
        likes:    ['book', 'scroll', 'incense', 'candle', 'hourglass', 'quill', 'astrolabe'],
        dislikes: ['noise_device', 'frivolous_toy', 'junk'],
        neutral:  ['coin', 'food', 'cloth', 'gem']
      },
      topics: {
        likes:    ['athenaeum', 'wisdom', 'debate', 'ethics', 'metaphysics', 'cosmology'],
        dislikes: ['shallow_entertainment', 'materialism', 'dogma'],
        neutral:  ['trade', 'construction', 'combat']
      }
    },
    artist: {
      items: {
        likes:    ['paint', 'canvas', 'brushes', 'charcoal', 'clay', 'gem', 'dye', 'flowers'],
        dislikes: ['plain_material', 'broken_art', 'noise_device'],
        neutral:  ['coin', 'tools', 'food', 'rope']
      },
      topics: {
        likes:    ['studio', 'beauty', 'inspiration', 'creativity', 'nature', 'gardens'],
        dislikes: ['ugliness', 'censorship', 'commercialism'],
        neutral:  ['trade', 'politics', 'combat']
      }
    }
  };

  // ============================================================================
  // GIFT REACTION THRESHOLDS
  // ============================================================================

  var GIFT_FRIENDSHIP_VALUES = {
    love:    20,  // Favorite item for archetype
    like:    10,  // Generally liked
    neutral:  3,  // Neither good nor bad
    dislike: -5   // Dislikes this item
  };

  // ============================================================================
  // UNLOCKED DIALOGUE BY TIER
  // ============================================================================

  var UNLOCKED_DIALOGUE = {
    stranger: {
      gardener:     ['Hello there, traveler.'],
      builder:      ['Welcome to ZION.'],
      storyteller:  ['Greetings, stranger.'],
      merchant:     ['Looking to trade?'],
      explorer:     ['Hey there.'],
      teacher:      ['Hello.'],
      musician:     ['Hi.'],
      healer:       ['Hello, be well.'],
      philosopher:  ['Welcome.'],
      artist:       ['Hello.']
    },
    acquaintance: {
      gardener:     ['Good to see you again! The herbs are doing well today.', 'Welcome back! The garden always looks better with visitors.'],
      builder:      ['Ah, returning! I\'ve been working on a new design.', 'Good to see you. Come check out the new stonework.'],
      storyteller:  ['Ah, you return! I have a new tale brewing.', 'Welcome back, I remember you from before.'],
      merchant:     ['Ah, a returning customer! I may have something for you.', 'Good to see you again. Shall we deal?'],
      explorer:     ['Back again! Did you explore anywhere new?', 'Glad you\'re here. I found new trails to share.'],
      teacher:      ['Welcome back! Ready to learn something new?', 'Ah, I remember you. You ask good questions.'],
      musician:     ['Good to see you again! I\'ve been composing.', 'You\'re back! I\'ll play something for you.'],
      healer:       ['Welcome back, friend. How is your health?', 'Ah, I remember your face. Be well!'],
      philosopher:  ['You return! I\'ve been pondering since we last spoke.', 'Ah, you again. Have you thought more on our last discussion?'],
      artist:       ['Welcome back! I finished a piece since we last met.', 'Ah, you came back! Want to see what I\'ve created?']
    },
    friend: {
      gardener:     ['My friend! I saved some moonflower seeds for you.', 'There you are! I was hoping you\'d visit today.', 'Welcome, friend! The garden has missed you.'],
      builder:      ['My friend! Just in time — I need your opinion on this arch.', 'There you are! I want to show you my latest plans.', 'Glad you\'re here. I\'ve been saving the best work for your eyes.'],
      storyteller:  ['My friend! I\'ve been saving my best tale just for you.', 'You arrived! I\'ve been writing about your journey, you know.', 'Perfect timing! Sit and let me tell you something extraordinary.'],
      merchant:     ['Ah, my friend! I have special stock set aside just for you.', 'Excellent! Come, I\'ll give you the friend\'s discount.', 'There you are! I was hoping you\'d stop by.'],
      explorer:     ['My companion! I found something remarkable — you must hear about it.', 'You\'re here! I was going to send word to find you.', 'Friend! Come — the trails are calling and I want your company.'],
      teacher:      ['My student, my friend! You make learning a joy.', 'Ah, you\'re here! I\'ve prepared something special to teach you.', 'There you are! I have been thinking of our conversations.'],
      musician:     ['Friend! I composed something with you in mind.', 'You\'re here! I\'ll play you the piece I\'ve been working on.', 'Come! I want to share my latest composition with you.'],
      healer:       ['Dear friend! You look well — that makes my heart glad.', 'Welcome! I\'ve prepared a restorative tea for your visit.', 'There you are! I was just thinking of you.'],
      philosopher:  ['My intellectual companion! I have questions only you can help me think through.', 'Ah, you arrive! I\'ve been wrestling with a paradox all morning.', 'Friend! Sit with me — the world needs pondering.'],
      artist:       ['Dear friend! I painted with you in mind this morning.', 'You\'re here! I want your honest opinion on this piece.', 'My friend! The colors remind me of you today.']
    },
    close_friend: {
      gardener:     ['There you are! I\'ve been worried — the foxglove bloomed and I thought of you.', 'My dear! These rare seeds are yours. I grew them from the ones you brought.', 'Close friend! The garden sings when you arrive.'],
      builder:      ['Finally! I need your eye on this — no one understands my vision like you do.', 'My trusted friend! I want to dedicate this archway to our friendship.', 'You\'re here! I\'ve been saving this project until you could see it born.'],
      storyteller:  ['My dearest audience! This story is about us, you know.', 'You\'re here! The tale I\'ve been weaving is yours to take home.', 'Close friend — the stories I save for you are the truest ones.'],
      merchant:     ['My most valued partner! I\'ve been keeping the rarest finds for you.', 'You arrive! I have something very special — not for sale to anyone but you.', 'My dear friend! Let\'s talk openly — I\'ll show you the real books.'],
      explorer:     ['My trail companion! I would not venture the deep wilds without you.', 'You\'re here! I found something — but I waited to show you together.', 'Dear friend! I mapped a route with your favorite landmarks.'],
      teacher:      ['My brightest student, my dear friend! You have surpassed even my expectations.', 'You arrive! I\'ve been holding a secret text — for your eyes only.', 'Dearest friend! Your questions have changed how I think about everything.'],
      musician:     ['My muse! I cannot compose without thinking of you.', 'You\'re here! I wrote an entire movement for our friendship.', 'Dearest friend! Sit — I\'ll play you the whole suite from the heart.'],
      healer:       ['My dear friend! I have prepared something rare — just for your wellness.', 'You\'re here! I can see in your eyes you needed this visit.', 'Dearest one! You brighten this healing place by being here.'],
      philosopher:  ['My fellow thinker! Your absence made the debates hollow.', 'You arrive! I have been saving my most radical idea for your ears.', 'Dearest friend! With you, every question feels answerable.'],
      artist:       ['My inspiration! You must see — this whole series was born from thinking of you.', 'You\'re here! I could not finish this piece without showing you.', 'Dearest friend! The colors are yours — I painted them from memory.']
    },
    best_friend: {
      gardener:     ['My dearest friend in all of ZION! The garden and I are one, and you are part of both.'],
      builder:      ['My dearest! Everything I have built has your name written in the foundation.'],
      storyteller:  ['My dearest! You are woven into every story I will ever tell. You are legend.'],
      merchant:     ['Dearest friend — the ledger of our friendship is worth more than every coin in ZION.'],
      explorer:     ['My dearest companion! ZION holds no frontier I would not cross with you by my side.'],
      teacher:      ['My dearest! You are both student and teacher to me now. I learn from you every day.'],
      musician:     ['My dearest muse! Every note I have ever played was searching for you.'],
      healer:       ['My dearest friend! Knowing you heals something in me that I never knew was broken.'],
      philosopher:  ['My dearest! With you, I have found what I sought — another mind as restless as mine.'],
      artist:       ['My dearest! I paint to make the world as beautiful as the feeling of your friendship.']
    }
  };

  // ============================================================================
  // GAMEPLAY BONUSES BY TIER
  // ============================================================================

  var FRIENDSHIP_BONUSES = {
    stranger: {
      trade_discount: 0,
      quest_hints: false,
      crafting_help: false,
      special_inventory: false,
      gossip_access: false,
      fast_travel_tip: false,
      xp_bonus: 0
    },
    acquaintance: {
      trade_discount: 0.05,
      quest_hints: false,
      crafting_help: false,
      special_inventory: false,
      gossip_access: true,
      fast_travel_tip: false,
      xp_bonus: 0
    },
    friend: {
      trade_discount: 0.10,
      quest_hints: true,
      crafting_help: false,
      special_inventory: false,
      gossip_access: true,
      fast_travel_tip: true,
      xp_bonus: 0.05
    },
    close_friend: {
      trade_discount: 0.20,
      quest_hints: true,
      crafting_help: true,
      special_inventory: true,
      gossip_access: true,
      fast_travel_tip: true,
      xp_bonus: 0.10
    },
    best_friend: {
      trade_discount: 0.30,
      quest_hints: true,
      crafting_help: true,
      special_inventory: true,
      gossip_access: true,
      fast_travel_tip: true,
      xp_bonus: 0.15,
      exclusive_quests: true
    }
  };

  // ============================================================================
  // INTERACTION TYPES
  // ============================================================================

  var INTERACTION_TYPES = {
    greeting:       { friendshipDelta: 1,  label: 'Greeting' },
    conversation:   { friendshipDelta: 2,  label: 'Conversation' },
    gift:           { friendshipDelta: 0,  label: 'Gift' }, // handled separately
    quest_complete: { friendshipDelta: 5,  label: 'Quest Completed' },
    quest_help:     { friendshipDelta: 3,  label: 'Quest Helped' },
    trade:          { friendshipDelta: 1,  label: 'Traded' },
    teach:          { friendshipDelta: 4,  label: 'Taught/Learned' },
    perform:        { friendshipDelta: 3,  label: 'Performance' },
    craft_together: { friendshipDelta: 4,  label: 'Crafted Together' },
    explore:        { friendshipDelta: 3,  label: 'Explored Together' },
    heal:           { friendshipDelta: 5,  label: 'Healed' },
    rude:           { friendshipDelta: -5, label: 'Rude Interaction' },
    ignored:        { friendshipDelta: -2, label: 'Ignored' }
  };

  // ============================================================================
  // PRIVATE STORAGE
  // ============================================================================

  // relationships[playerId][npcId] = { friendship, lastVisitDay, tier }
  var relationships = {};

  // giftHistory[playerId][npcId] = [ { itemId, day, reaction, friendshipChange } ]
  var giftHistory = {};

  // interactionHistory[playerId][npcId] = [ { type, details, day, friendshipDelta } ]
  var interactionHistory = {};

  // npcMoods[npcId] = { mood, lastUpdated }
  var npcMoods = {};

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  function getRelKey(playerId, npcId) {
    return playerId + '::' + npcId;
  }

  function ensurePlayer(playerId) {
    if (!relationships[playerId]) {
      relationships[playerId] = {};
    }
    if (!giftHistory[playerId]) {
      giftHistory[playerId] = {};
    }
    if (!interactionHistory[playerId]) {
      interactionHistory[playerId] = {};
    }
  }

  function computeTier(friendship) {
    if (friendship >= 100) return 'best_friend';
    if (friendship >= 60)  return 'close_friend';
    if (friendship >= 30)  return 'friend';
    if (friendship >= 10)  return 'acquaintance';
    return 'stranger';
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function getCurrentDay() {
    // Returns a numeric day counter; uses Date-based calculation
    return Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Initialize relationship tracking for a player-NPC pair.
   * Safe to call multiple times — will not reset existing data.
   * @param {string} playerId
   * @param {string} npcId
   * @returns {object} The relationship data
   */
  function initRelationship(playerId, npcId) {
    ensurePlayer(playerId);
    if (!relationships[playerId][npcId]) {
      relationships[playerId][npcId] = {
        friendship:    0,
        tier:          'stranger',
        lastVisitDay:  getCurrentDay(),
        createdDay:    getCurrentDay()
      };
    }
    if (!giftHistory[playerId][npcId]) {
      giftHistory[playerId][npcId] = [];
    }
    if (!interactionHistory[playerId][npcId]) {
      interactionHistory[playerId][npcId] = [];
    }
    return relationships[playerId][npcId];
  }

  /**
   * Get the current relationship data for a player-NPC pair.
   * Auto-initializes if not present.
   * @param {string} playerId
   * @param {string} npcId
   * @returns {object} { friendship, tier, lastVisitDay, createdDay }
   */
  function getRelationship(playerId, npcId) {
    return initRelationship(playerId, npcId);
  }

  /**
   * Adjust friendship between player and NPC.
   * @param {string} playerId
   * @param {string} npcId
   * @param {number} amount - Positive or negative points
   * @param {string} reason - Human-readable reason for the change
   * @returns {object} { oldFriendship, newFriendship, oldTier, newTier, tierChanged }
   */
  function adjustFriendship(playerId, npcId, amount, reason) {
    var rel = getRelationship(playerId, npcId);
    var oldFriendship = rel.friendship;
    var oldTier = rel.tier;

    rel.friendship = clamp(rel.friendship + amount, MIN_FRIENDSHIP, MAX_FRIENDSHIP);
    rel.tier = computeTier(rel.friendship);
    rel.lastVisitDay = getCurrentDay();

    var result = {
      oldFriendship: oldFriendship,
      newFriendship: rel.friendship,
      oldTier:       oldTier,
      newTier:       rel.tier,
      tierChanged:   oldTier !== rel.tier,
      reason:        reason || 'unspecified'
    };

    return result;
  }

  /**
   * Get the current relationship tier name for a player-NPC pair.
   * @param {string} playerId
   * @param {string} npcId
   * @returns {string} Tier name: 'stranger' | 'acquaintance' | 'friend' | 'close_friend' | 'best_friend'
   */
  function getTier(playerId, npcId) {
    var rel = getRelationship(playerId, npcId);
    return rel.tier;
  }

  /**
   * Record a gift from player to NPC.
   * Automatically adjusts friendship based on NPC preference.
   * @param {string} playerId
   * @param {string} npcId
   * @param {string} itemId
   * @param {string} [npcArchetype] - Optional, used to compute reaction
   * @returns {object} { reaction, friendshipDelta, memory }
   */
  function addGiftMemory(playerId, npcId, itemId, npcArchetype) {
    initRelationship(playerId, npcId);
    var reaction = getGiftReaction(npcId, itemId, npcArchetype);
    var friendshipDelta = GIFT_FRIENDSHIP_VALUES[reaction] || GIFT_FRIENDSHIP_VALUES.neutral;

    var memory = {
      itemId:          itemId,
      day:             getCurrentDay(),
      reaction:        reaction,
      friendshipChange: friendshipDelta
    };

    var history = giftHistory[playerId][npcId];
    history.push(memory);

    // Trim to max
    if (history.length > MAX_GIFT_MEMORY) {
      history.splice(0, history.length - MAX_GIFT_MEMORY);
    }

    adjustFriendship(playerId, npcId, friendshipDelta, 'gift:' + itemId);

    return {
      reaction:        reaction,
      friendshipDelta: friendshipDelta,
      memory:          memory
    };
  }

  /**
   * Get past gifts given by player to NPC.
   * @param {string} playerId
   * @param {string} npcId
   * @returns {Array} Array of gift memory objects
   */
  function getGiftHistory(playerId, npcId) {
    initRelationship(playerId, npcId);
    return giftHistory[playerId][npcId].slice();
  }

  /**
   * Determine an NPC's reaction to a gift item.
   * Checks archetype preferences stored in npc registry or passed directly.
   * @param {string} npcId - NPC identifier (may encode archetype)
   * @param {string} itemId
   * @param {string} [npcArchetype] - Archetype override
   * @returns {string} 'love' | 'like' | 'neutral' | 'dislike'
   */
  function getGiftReaction(npcId, itemId, npcArchetype) {
    // Determine archetype — try override first, then extract from id
    var archetype = npcArchetype || null;
    if (!archetype) {
      // Try to extract from npcId like 'gardener_001' or 'npc_gardener_1'
      var archetypes = Object.keys(ARCHETYPE_PREFERENCES);
      for (var i = 0; i < archetypes.length; i++) {
        if (npcId.indexOf(archetypes[i]) !== -1) {
          archetype = archetypes[i];
          break;
        }
      }
    }

    if (!archetype || !ARCHETYPE_PREFERENCES[archetype]) {
      return 'neutral';
    }

    var prefs = ARCHETYPE_PREFERENCES[archetype].items;

    if (prefs.likes.indexOf(itemId) !== -1) {
      // Check for "love" — items that match primary passion
      var primaryLoves = {
        gardener:    ['seeds', 'flowers', 'herbs'],
        builder:     ['blueprint', 'hammer', 'stone'],
        storyteller: ['book', 'scroll', 'quill'],
        merchant:    ['gem', 'rare_goods', 'coin'],
        explorer:    ['map', 'compass', 'artifact'],
        teacher:     ['book', 'scroll', 'astrolabe'],
        musician:    ['instrument', 'sheet_music'],
        healer:      ['herbs', 'potion', 'crystal'],
        philosopher: ['book', 'scroll', 'incense'],
        artist:      ['paint', 'canvas', 'brushes']
      };
      var loves = primaryLoves[archetype] || [];
      if (loves.indexOf(itemId) !== -1) {
        return 'love';
      }
      return 'like';
    }

    if (prefs.dislikes.indexOf(itemId) !== -1) {
      return 'dislike';
    }

    return 'neutral';
  }

  /**
   * Record a general interaction between player and NPC.
   * @param {string} playerId
   * @param {string} npcId
   * @param {string} type - One of INTERACTION_TYPES keys
   * @param {object} [details] - Optional extra data
   * @returns {object} The interaction memory record
   */
  function addInteractionMemory(playerId, npcId, type, details) {
    initRelationship(playerId, npcId);
    var interactionDef = INTERACTION_TYPES[type];
    var friendshipDelta = interactionDef ? interactionDef.friendshipDelta : 1;

    var memory = {
      type:            type,
      details:         details || {},
      day:             getCurrentDay(),
      timestamp:       Date.now(),
      friendshipDelta: friendshipDelta
    };

    var history = interactionHistory[playerId][npcId];
    history.push(memory);

    // Trim to limit
    if (history.length > INTERACTION_MEMORY_LIMIT) {
      history.splice(0, history.length - INTERACTION_MEMORY_LIMIT);
    }

    if (friendshipDelta !== 0) {
      adjustFriendship(playerId, npcId, friendshipDelta, 'interaction:' + type);
    } else {
      // Still update last visit day
      var rel = getRelationship(playerId, npcId);
      rel.lastVisitDay = getCurrentDay();
    }

    return memory;
  }

  /**
   * Get interaction history for a player-NPC pair.
   * @param {string} playerId
   * @param {string} npcId
   * @param {number} [limit] - Max entries to return (most recent first)
   * @returns {Array} Array of interaction memory records
   */
  function getInteractionHistory(playerId, npcId, limit) {
    initRelationship(playerId, npcId);
    var history = interactionHistory[playerId][npcId];
    var sorted = history.slice().reverse(); // most recent first
    if (limit && limit > 0) {
      return sorted.slice(0, limit);
    }
    return sorted;
  }

  /**
   * Get dialogue modifiers based on relationship level.
   * Affects tone, options unlocked, and topics available.
   * @param {string} playerId
   * @param {string} npcId
   * @returns {object} Modifiers object
   */
  function getDialogueModifiers(playerId, npcId) {
    var tier = getTier(playerId, npcId);
    var rel = getRelationship(playerId, npcId);
    var bonuses = FRIENDSHIP_BONUSES[tier] || FRIENDSHIP_BONUSES.stranger;

    return {
      tier:             tier,
      friendship:       rel.friendship,
      tone:             getTone(tier),
      canAskFavors:     tier === 'friend' || tier === 'close_friend' || tier === 'best_friend',
      canDiscussSecrets: tier === 'close_friend' || tier === 'best_friend',
      canGetAdvice:     tier !== 'stranger',
      tradeDiscount:    bonuses.trade_discount,
      questHints:       bonuses.quest_hints,
      craftingHelp:     bonuses.crafting_help,
      specialInventory: bonuses.special_inventory,
      gossipAccess:     bonuses.gossip_access
    };
  }

  function getTone(tier) {
    var tones = {
      stranger:     'formal',
      acquaintance: 'polite',
      friend:       'warm',
      close_friend: 'intimate',
      best_friend:  'devoted'
    };
    return tones[tier] || 'formal';
  }

  /**
   * Get special dialogue lines unlocked by friendship tier.
   * @param {string} playerId
   * @param {string} npcId
   * @param {string} [npcArchetype] - Archetype for the NPC
   * @returns {Array} Array of unlocked dialogue strings
   */
  function getUnlockedDialogue(playerId, npcId, npcArchetype) {
    var tier = getTier(playerId, npcId);
    var archetype = npcArchetype || extractArchetype(npcId);
    var tierDialogue = UNLOCKED_DIALOGUE[tier] || {};
    var lines = tierDialogue[archetype] || tierDialogue['gardener'] || [];

    // Also include all lower-tier dialogue
    var allTiers = ['stranger', 'acquaintance', 'friend', 'close_friend', 'best_friend'];
    var tierIdx = allTiers.indexOf(tier);
    var result = [];
    for (var i = 0; i <= tierIdx; i++) {
      var lowerTierDialogue = UNLOCKED_DIALOGUE[allTiers[i]] || {};
      var lowerLines = lowerTierDialogue[archetype] || lowerTierDialogue['gardener'] || [];
      result = result.concat(lowerLines);
    }
    return result;
  }

  function extractArchetype(npcId) {
    var archetypes = Object.keys(ARCHETYPE_PREFERENCES);
    for (var i = 0; i < archetypes.length; i++) {
      if (npcId.indexOf(archetypes[i]) !== -1) {
        return archetypes[i];
      }
    }
    return 'gardener'; // default fallback for dialogue purposes
  }

  // Like extractArchetype but returns null when no match found (used for opinions)
  function extractArchetypeStrict(npcId) {
    var archetypes = Object.keys(ARCHETYPE_PREFERENCES);
    for (var i = 0; i < archetypes.length; i++) {
      if (npcId.indexOf(archetypes[i]) !== -1) {
        return archetypes[i];
      }
    }
    return null;
  }

  /**
   * Get an NPC's opinion on a topic (zone, item, activity).
   * @param {string} npcId
   * @param {string} topic
   * @param {string} [npcArchetype] - Archetype override
   * @returns {string} 'likes' | 'dislikes' | 'neutral'
   */
  function getOpinionOf(npcId, topic, npcArchetype) {
    var archetype = npcArchetype || extractArchetypeStrict(npcId);
    var prefs = ARCHETYPE_PREFERENCES[archetype];
    if (!prefs) return OPINION_TYPES.neutral;

    // Check items
    if (prefs.items.likes.indexOf(topic) !== -1)    return OPINION_TYPES.likes;
    if (prefs.items.dislikes.indexOf(topic) !== -1) return OPINION_TYPES.dislikes;

    // Check topics
    if (prefs.topics.likes.indexOf(topic) !== -1)    return OPINION_TYPES.likes;
    if (prefs.topics.dislikes.indexOf(topic) !== -1) return OPINION_TYPES.dislikes;

    return OPINION_TYPES.neutral;
  }

  /**
   * Calculate an NPC's mood based on recent interactions.
   * @param {string} npcId
   * @param {Array} interactions - Recent interaction records [{friendshipDelta, day}]
   * @returns {string} 'joyful' | 'content' | 'neutral' | 'grumpy' | 'sad'
   */
  function getNPCMood(npcId, interactions) {
    if (!interactions || interactions.length === 0) {
      return 'neutral';
    }

    var today = getCurrentDay();
    var recentInteractions = [];
    for (var i = 0; i < interactions.length; i++) {
      if (interactions[i].day >= today - 1) {
        recentInteractions.push(interactions[i]);
      }
    }

    if (recentInteractions.length === 0) {
      return 'neutral';
    }

    var totalDelta = 0;
    for (var j = 0; j < recentInteractions.length; j++) {
      totalDelta += (recentInteractions[j].friendshipDelta || 0);
    }

    if (totalDelta >= 10)  return 'joyful';
    if (totalDelta >= 3)   return 'content';
    if (totalDelta >= -2)  return 'neutral';
    if (totalDelta >= -8)  return 'grumpy';
    return 'sad';
  }

  /**
   * Get the NPCs with the highest friendship level for a player.
   * @param {string} playerId
   * @param {number} [limit=5] - Number of results
   * @returns {Array} Sorted array of { npcId, friendship, tier }
   */
  function getClosestFriends(playerId, limit) {
    ensurePlayer(playerId);
    var limit_ = limit || 5;
    var rels = relationships[playerId];
    var entries = [];

    for (var npcId in rels) {
      if (rels.hasOwnProperty(npcId)) {
        entries.push({
          npcId:      npcId,
          friendship: rels[npcId].friendship,
          tier:       rels[npcId].tier
        });
      }
    }

    entries.sort(function(a, b) {
      return b.friendship - a.friendship;
    });

    return entries.slice(0, limit_);
  }

  /**
   * Get gameplay bonuses for a friendship tier.
   * @param {string} tier - Tier name
   * @returns {object} Bonus object
   */
  function getFriendshipBonuses(tier) {
    return FRIENDSHIP_BONUSES[tier] || FRIENDSHIP_BONUSES.stranger;
  }

  /**
   * Apply relationship decay for days of absence.
   * @param {string} playerId
   * @param {number} daysSinceVisit - Days since player last visited each NPC
   */
  function decayRelationships(playerId, daysSinceVisit) {
    ensurePlayer(playerId);
    var rels = relationships[playerId];

    for (var npcId in rels) {
      if (rels.hasOwnProperty(npcId)) {
        var daysOfDecay = daysSinceVisit - DECAY_GRACE_DAYS;
        if (daysOfDecay > 0) {
          var decayAmount = daysOfDecay * DECAY_RATE;
          var rel = rels[npcId];
          var oldTier = rel.tier;
          rel.friendship = clamp(rel.friendship - decayAmount, MIN_FRIENDSHIP, MAX_FRIENDSHIP);
          rel.tier = computeTier(rel.friendship);
          rel.decayed = true;
          rel.lastDecayAmount = decayAmount;
          rel.lastDecayTierChanged = oldTier !== rel.tier;
        }
      }
    }
  }

  /**
   * Reset all relationship data (useful for testing or new game).
   */
  function resetAll() {
    relationships = {};
    giftHistory = {};
    interactionHistory = {};
    npcMoods = {};
  }

  /**
   * Export a serializable snapshot of all relationships for a player.
   * @param {string} playerId
   * @returns {object} Serializable snapshot
   */
  function exportPlayerData(playerId) {
    ensurePlayer(playerId);
    return {
      relationships:    JSON.parse(JSON.stringify(relationships[playerId] || {})),
      giftHistory:      JSON.parse(JSON.stringify(giftHistory[playerId] || {})),
      interactionHistory: JSON.parse(JSON.stringify(interactionHistory[playerId] || {}))
    };
  }

  /**
   * Import previously exported player data.
   * @param {string} playerId
   * @param {object} data - From exportPlayerData
   */
  function importPlayerData(playerId, data) {
    if (data.relationships)      relationships[playerId]      = data.relationships;
    if (data.giftHistory)        giftHistory[playerId]        = data.giftHistory;
    if (data.interactionHistory) interactionHistory[playerId] = data.interactionHistory;
  }

  // ============================================================================
  // EXPORTS
  // ============================================================================

  exports.RELATIONSHIP_TIERS      = RELATIONSHIP_TIERS;
  exports.OPINION_TYPES           = OPINION_TYPES;
  exports.ARCHETYPE_PREFERENCES   = ARCHETYPE_PREFERENCES;
  exports.INTERACTION_TYPES       = INTERACTION_TYPES;
  exports.FRIENDSHIP_BONUSES      = FRIENDSHIP_BONUSES;
  exports.UNLOCKED_DIALOGUE       = UNLOCKED_DIALOGUE;
  exports.DECAY_RATE              = DECAY_RATE;
  exports.MAX_GIFT_MEMORY         = MAX_GIFT_MEMORY;
  exports.INTERACTION_MEMORY_LIMIT = INTERACTION_MEMORY_LIMIT;

  exports.initRelationship        = initRelationship;
  exports.getRelationship         = getRelationship;
  exports.adjustFriendship        = adjustFriendship;
  exports.getTier                 = getTier;
  exports.addGiftMemory           = addGiftMemory;
  exports.getGiftHistory          = getGiftHistory;
  exports.getGiftReaction         = getGiftReaction;
  exports.addInteractionMemory    = addInteractionMemory;
  exports.getInteractionHistory   = getInteractionHistory;
  exports.getDialogueModifiers    = getDialogueModifiers;
  exports.getUnlockedDialogue     = getUnlockedDialogue;
  exports.getOpinionOf            = getOpinionOf;
  exports.getNPCMood              = getNPCMood;
  exports.getClosestFriends       = getClosestFriends;
  exports.getFriendshipBonuses    = getFriendshipBonuses;
  exports.decayRelationships      = decayRelationships;
  exports.resetAll                = resetAll;
  exports.exportPlayerData        = exportPlayerData;
  exports.importPlayerData        = importPlayerData;

})(typeof module !== 'undefined' ? module.exports : (window.NpcMemory = {}));
