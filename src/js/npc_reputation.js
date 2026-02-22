/**
 * ZION NPC Reputation System
 * Reputation-based NPC relationships with dynamic dialogue unlocks.
 * NPCs remember player actions and change behavior based on trust level.
 */

(function(exports) {
  'use strict';

  // ---------------------------------------------------------------------------
  // CONSTANTS
  // ---------------------------------------------------------------------------

  var REPUTATION_MIN = -100;
  var REPUTATION_MAX = 100;

  var TIERS = [
    { min: -100, max: -75, name: 'Hostile',    color: '#ff0000', dialoguePool: 'hostile' },
    { min: -74,  max: -50, name: 'Distrusted', color: '#ff4444', dialoguePool: 'distrusted' },
    { min: -49,  max: -25, name: 'Disliked',   color: '#ff8888', dialoguePool: 'disliked' },
    { min: -24,  max: -1,  name: 'Wary',       color: '#ffaaaa', dialoguePool: 'wary' },
    { min: 0,    max: 14,  name: 'Neutral',    color: '#cccccc', dialoguePool: 'neutral' },
    { min: 15,   max: 29,  name: 'Known',      color: '#aaddaa', dialoguePool: 'known' },
    { min: 30,   max: 49,  name: 'Friendly',   color: '#88cc88', dialoguePool: 'friendly' },
    { min: 50,   max: 69,  name: 'Trusted',    color: '#44aa44', dialoguePool: 'trusted' },
    { min: 70,   max: 89,  name: 'Honored',    color: '#228822', dialoguePool: 'honored' },
    { min: 90,   max: 100, name: 'Sworn Ally', color: '#00ff00', dialoguePool: 'ally' }
  ];

  var REPUTATION_ACTIONS = {
    trade_with:     { base: 2,   desc: 'Traded with NPC' },
    complete_quest: { base: 10,  desc: 'Completed a quest from NPC' },
    gift_item:      { base: 5,   desc: 'Gave a gift' },
    gift_liked:     { base: 15,  desc: 'Gave a favorite gift' },
    gift_disliked:  { base: -5,  desc: 'Gave a disliked gift' },
    help_event:     { base: 8,   desc: 'Helped during an event' },
    daily_greeting: { base: 1,   desc: 'Said hello today' },
    fail_quest:     { base: -5,  desc: 'Failed a quest' },
    steal_attempt:  { base: -20, desc: 'Attempted theft' },
    mentored_by:    { base: 12,  desc: 'Learned from this NPC' },
    defended:       { base: 15,  desc: 'Defended NPC from threat' },
    ignored_plea:   { base: -8,  desc: 'Ignored a plea for help' }
  };

  var ARCHETYPE_PREFERENCES = {
    gardener:    { likedGifts: ['seeds','herbs','honey'],                   dislikedGifts: ['iron_ore','stone'],         topics: ['nature','seasons','growth'] },
    builder:     { likedGifts: ['planks','nails','blueprint'],              dislikedGifts: ['scroll','ink'],             topics: ['architecture','design','materials'] },
    storyteller: { likedGifts: ['scroll','ink','journal'],                  dislikedGifts: ['pickaxe','axe'],            topics: ['history','legends','poetry'] },
    merchant:    { likedGifts: ['gold_dust','trade_permit','lockbox'],      dislikedGifts: ['herbs','clay'],             topics: ['markets','prices','deals'] },
    explorer:    { likedGifts: ['compass','rope','map_fragment'],           dislikedGifts: ['clay','silk'],              topics: ['adventures','discoveries','terrain'] },
    teacher:     { likedGifts: ['textbook','chalk','lens'],                 dislikedGifts: ['drum_skin','strings'],      topics: ['learning','wisdom','philosophy'] },
    musician:    { likedGifts: ['strings','drum_skin','sheet_music'],       dislikedGifts: ['nails','pickaxe'],          topics: ['music','harmony','rhythm'] },
    healer:      { likedGifts: ['herbs','bandage','salve'],                 dislikedGifts: ['iron_ore','stone'],         topics: ['healing','wellness','herbs'] },
    philosopher: { likedGifts: ['riddle_box','star_chart','scroll'],        dislikedGifts: ['axe','nails'],              topics: ['truth','existence','ethics'] },
    artist:      { likedGifts: ['pigment','canvas','chisel'],               dislikedGifts: ['lockbox','scale'],          topics: ['beauty','creation','inspiration'] }
  };

  // Dialogue pools keyed by pool name, then by context
  var DIALOGUE_POOLS = {
    hostile: {
      greeting: [
        "Leave. Now.",
        "I have nothing to say to you.",
        "Get away from me.",
        "You have the nerve to approach me?"
      ],
      farewell: [
        "Good riddance.",
        "Stay away."
      ],
      shop: [
        "I won't do business with you.",
        "Find another merchant."
      ],
      quest: [
        "I would never trust you with this.",
        "You'd only make things worse."
      ],
      gossip: [
        "I'm not talking to you.",
        "Leave me alone."
      ]
    },
    distrusted: {
      greeting: [
        "What do you want?",
        "Keep your distance.",
        "I don't trust you.",
        "Speak quickly and leave."
      ],
      farewell: [
        "Don't come back soon.",
        "Next time, don't bother."
      ],
      shop: [
        "Full price. No exceptions.",
        "Pay first, then we'll talk."
      ],
      quest: [
        "You'd have to prove yourself first.",
        "I doubt you could handle this."
      ],
      gossip: [
        "Why would I tell you anything?",
        "I've heard enough about you already."
      ]
    },
    disliked: {
      greeting: [
        "Oh. You again.",
        "Hmm. What now?",
        "I suppose I can spare a moment.",
        "Make it brief."
      ],
      farewell: [
        "Off with you then.",
        "Until next time, I suppose."
      ],
      shop: [
        "Standard rates apply.",
        "Don't expect any favors."
      ],
      quest: [
        "There might be something you could do... if you're capable.",
        "It's not much, but you might manage it."
      ],
      gossip: [
        "I've heard a thing or two.",
        "Nothing worth your time, probably."
      ]
    },
    wary: {
      greeting: [
        "Ah. Hello.",
        "You've been around lately.",
        "I've seen you before.",
        "What brings you here?"
      ],
      farewell: [
        "Take care.",
        "Until next time."
      ],
      shop: [
        "I have some wares, if you're interested.",
        "Browse freely."
      ],
      quest: [
        "I might have something for someone willing to help.",
        "There's a task I've been putting off..."
      ],
      gossip: [
        "I've heard a few things lately.",
        "Word travels fast in ZION."
      ]
    },
    neutral: {
      greeting: [
        "Hello, traveler.",
        "Welcome.",
        "Good day.",
        "Greetings."
      ],
      farewell: [
        "Safe travels.",
        "Farewell.",
        "Until we meet again."
      ],
      shop: [
        "Take a look at what I have.",
        "Everything is priced fairly.",
        "What can I help you with?"
      ],
      quest: [
        "I could use some assistance.",
        "There's something that needs doing."
      ],
      gossip: [
        "The usual news, nothing special.",
        "Things are quiet these days."
      ]
    },
    known: {
      greeting: [
        "Ah, good to see you.",
        "Welcome back.",
        "I was hoping you'd stop by.",
        "How have you been?"
      ],
      farewell: [
        "Come back soon.",
        "It's always a pleasure.",
        "Safe journeys."
      ],
      shop: [
        "I saved something interesting for you.",
        "For a familiar face, I'll see what I can do.",
        "You know where to find the good stuff."
      ],
      quest: [
        "I have a task I think suits you.",
        "You're just the person I needed to see."
      ],
      gossip: [
        "Since you're a regular, I'll share what I know.",
        "Between you and me, I've heard something."
      ]
    },
    friendly: {
      greeting: [
        "My friend! Good to see you!",
        "Always happy when you come by.",
        "Just the person I wanted to talk to!",
        "Welcome, welcome!"
      ],
      farewell: [
        "Don't be a stranger!",
        "Come back whenever you like.",
        "It's always a pleasure, friend."
      ],
      shop: [
        "For you? I'll give you a little discount.",
        "Friends get special treatment here.",
        "Let me show you my better selection."
      ],
      quest: [
        "I have a special task only a friend would understand.",
        "I've been saving this one for you."
      ],
      gossip: [
        "I'll tell you something not many know.",
        "Since we're friends, here's a secret tip."
      ]
    },
    trusted: {
      greeting: [
        "Ah, one of the few people I truly trust.",
        "You're always welcome here.",
        "I think of you as a real ally.",
        "I'm glad you're here."
      ],
      farewell: [
        "I'll keep a good word in for you.",
        "My door is always open for you.",
        "Stay safe out there."
      ],
      shop: [
        "Take what you need — I'll work out fair payment.",
        "For you, I have items not on public display.",
        "I've been holding back some rare stock for trusted customers."
      ],
      quest: [
        "I have a rare quest I only share with trusted companions.",
        "This mission requires someone I know won't let me down."
      ],
      gossip: [
        "I'll share a rare recipe with you.",
        "There's a location only a few know about..."
      ]
    },
    honored: {
      greeting: [
        "The honored one arrives!",
        "You grace us with your presence.",
        "I feel safer knowing you're around.",
        "Always an honor to see you."
      ],
      farewell: [
        "ZION is better with you in it.",
        "We'll remember your deeds here.",
        "Walk tall."
      ],
      shop: [
        "For someone of your standing, the best prices.",
        "I have things reserved for the truly respected.",
        "Name your need — I'll do what I can."
      ],
      quest: [
        "I have a task worthy of your reputation.",
        "Only someone of honor could attempt this."
      ],
      gossip: [
        "I'll share the location of a secret place.",
        "They say the ancient texts mention something hidden..."
      ]
    },
    ally: {
      greeting: [
        "My sworn ally! I am always at your side.",
        "Nothing brings me more joy than seeing you.",
        "You are as family to me now.",
        "My friend, my ally, my companion."
      ],
      farewell: [
        "I swear to stand with you always.",
        "Call on me and I will answer.",
        "Until we meet again, ally."
      ],
      shop: [
        "Take what you need — you've earned it.",
        "My rare stock is yours to browse.",
        "For a sworn ally, everything is at cost."
      ],
      quest: [
        "This is the most important task I have ever asked of anyone.",
        "Only my sworn ally could carry this burden."
      ],
      gossip: [
        "I will share everything I know with you.",
        "There is nothing I keep from a sworn ally."
      ]
    }
  };

  var FEATURE_THRESHOLDS = [
    { score: 90, feature: 'sworn_ally_perks',  desc: 'Sworn ally perks: free items, combat aid' },
    { score: 70, feature: 'secret_locations',   desc: 'Access to secret locations' },
    { score: 50, feature: 'rare_quests',         desc: 'Rare quest access' },
    { score: 30, feature: 'discount_shop',       desc: 'Shop discounts' },
    { score: 15, feature: 'personal_stories',    desc: 'Personal NPC stories' },
    { score: 0,  feature: 'basic_shop',          desc: 'Basic shop access' }
  ];

  // ---------------------------------------------------------------------------
  // CORE STATE
  // ---------------------------------------------------------------------------

  /**
   * Creates a fresh reputation state object.
   * @returns {Object} { players: {}, npcRelationships: {}, history: [] }
   */
  function createReputationState() {
    return {
      players: {},
      npcRelationships: {},
      history: []
    };
  }

  // ---------------------------------------------------------------------------
  // TIER HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Returns the tier object for a given reputation score.
   * @param {number} score
   * @returns {Object} tier
   */
  function getTier(score) {
    for (var i = 0; i < TIERS.length; i++) {
      var tier = TIERS[i];
      if (score >= tier.min && score <= tier.max) {
        return tier;
      }
    }
    // Fallback: clamp to extremes
    if (score < REPUTATION_MIN) return TIERS[0];
    return TIERS[TIERS.length - 1];
  }

  // ---------------------------------------------------------------------------
  // REPUTATION GETTERS / SETTERS
  // ---------------------------------------------------------------------------

  /**
   * Returns reputation score for a player-NPC pair. Defaults to 0.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} npcId
   * @returns {number}
   */
  function getReputation(state, playerId, npcId) {
    if (!state || !state.players) return 0;
    if (!state.players[playerId]) return 0;
    if (typeof state.players[playerId][npcId] === 'undefined') return 0;
    return state.players[playerId][npcId];
  }

  /**
   * Sets reputation for a player-NPC pair (clamped to -100..100).
   * @param {Object} state
   * @param {string} playerId
   * @param {string} npcId
   * @param {number} score
   */
  function setReputation(state, playerId, npcId, score) {
    if (!state.players[playerId]) {
      state.players[playerId] = {};
    }
    state.players[playerId][npcId] = Math.max(REPUTATION_MIN, Math.min(REPUTATION_MAX, score));
  }

  /**
   * Apply a reputation action, logging to history.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} npcId
   * @param {string} action  - key from REPUTATION_ACTIONS
   * @param {Object} [context] - optional context object
   * @returns {Object} { state, change, newScore, tier, message }
   */
  function modifyReputation(state, playerId, npcId, action, context) {
    context = context || {};

    var actionDef = REPUTATION_ACTIONS[action];
    if (!actionDef) {
      return {
        state: state,
        change: 0,
        newScore: getReputation(state, playerId, npcId),
        tier: getTier(getReputation(state, playerId, npcId)),
        message: 'Unknown action: ' + action
      };
    }

    var oldScore = getReputation(state, playerId, npcId);
    var change = actionDef.base;

    // Context modifiers
    if (context.multiplier && typeof context.multiplier === 'number') {
      change = Math.round(change * context.multiplier);
    }

    var newScore = Math.max(REPUTATION_MIN, Math.min(REPUTATION_MAX, oldScore + change));
    setReputation(state, playerId, npcId, newScore);

    var tier = getTier(newScore);

    var historyEntry = {
      ts: context.ts || Date.now(),
      playerId: playerId,
      npcId: npcId,
      action: action,
      change: change,
      oldScore: oldScore,
      newScore: newScore,
      tierName: tier.name,
      desc: actionDef.desc
    };
    state.history.push(historyEntry);

    var crossed = '';
    var oldTier = getTier(oldScore);
    if (oldTier.name !== tier.name) {
      crossed = ' Relationship changed to ' + tier.name + '.';
    }

    return {
      state: state,
      change: change,
      newScore: newScore,
      tier: tier,
      message: actionDef.desc + ' (' + (change >= 0 ? '+' : '') + change + ').' + crossed
    };
  }

  // ---------------------------------------------------------------------------
  // DIALOGUE
  // ---------------------------------------------------------------------------

  /**
   * Returns appropriate dialogue based on archetype, tier, and context.
   * @param {string} npcArchetype
   * @param {Object} tier  - tier object (from getTier)
   * @param {string} [context] - 'greeting'|'farewell'|'shop'|'quest'|'gossip'
   * @returns {Object} { text, options: [{label, action}] }
   */
  function getDialogue(npcArchetype, tier, context) {
    context = context || 'greeting';
    var poolName = tier ? tier.dialoguePool : 'neutral';
    var pool = DIALOGUE_POOLS[poolName] || DIALOGUE_POOLS['neutral'];
    var lines = pool[context] || pool['greeting'];

    // Pick a line using a simple deterministic index based on archetype length
    var archetypeLen = npcArchetype ? npcArchetype.length : 0;
    var lineIndex = archetypeLen % lines.length;
    var text = lines[lineIndex];

    // Build options based on tier score
    var options = [];
    var score = tier ? tier.min : 0;

    if (poolName === 'hostile' || poolName === 'distrusted') {
      // Very limited options
      options = [{ label: 'Back away', action: 'leave' }];
    } else if (poolName === 'disliked' || poolName === 'wary') {
      options = [
        { label: 'Greet', action: 'greet' },
        { label: 'Leave', action: 'leave' }
      ];
    } else if (poolName === 'neutral' || poolName === 'known') {
      options = [
        { label: 'Talk', action: 'greet' },
        { label: 'Shop', action: 'shop' },
        { label: 'Leave', action: 'leave' }
      ];
    } else if (poolName === 'friendly') {
      options = [
        { label: 'Chat', action: 'greet' },
        { label: 'Shop', action: 'shop' },
        { label: 'Ask for quest', action: 'quest' },
        { label: 'Leave', action: 'leave' }
      ];
    } else if (poolName === 'trusted') {
      options = [
        { label: 'Chat', action: 'greet' },
        { label: 'Shop (rare items)', action: 'shop' },
        { label: 'Special quest', action: 'quest' },
        { label: 'Ask for secrets', action: 'gossip' },
        { label: 'Leave', action: 'leave' }
      ];
    } else if (poolName === 'honored' || poolName === 'ally') {
      options = [
        { label: 'Chat', action: 'greet' },
        { label: 'Shop (best items)', action: 'shop' },
        { label: 'Important quest', action: 'quest' },
        { label: 'Share secrets', action: 'gossip' },
        { label: 'Request aid', action: 'aid' },
        { label: 'Leave', action: 'leave' }
      ];
    }

    // Add archetype-flavored topic if preferences exist
    var prefs = ARCHETYPE_PREFERENCES[npcArchetype];
    if (prefs && prefs.topics && prefs.topics.length > 0 && context === 'gossip') {
      var topicIdx = archetypeLen % prefs.topics.length;
      text = text + ' I always enjoy talking about ' + prefs.topics[topicIdx] + '.';
    }

    return { text: text, options: options };
  }

  // ---------------------------------------------------------------------------
  // GIFT SYSTEM
  // ---------------------------------------------------------------------------

  /**
   * Returns 'liked', 'disliked', or 'neutral' for a gift given to an archetype.
   * @param {string} npcArchetype
   * @param {string} giftItemId
   * @returns {string}
   */
  function getGiftReaction(npcArchetype, giftItemId) {
    var prefs = ARCHETYPE_PREFERENCES[npcArchetype];
    if (!prefs) return 'neutral';

    if (prefs.likedGifts.indexOf(giftItemId) !== -1) return 'liked';
    if (prefs.dislikedGifts.indexOf(giftItemId) !== -1) return 'disliked';
    return 'neutral';
  }

  /**
   * Process gift giving with appropriate reputation change.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} npcId
   * @param {string} npcArchetype
   * @param {string} giftItemId
   * @returns {Object} { state, reaction, change, message }
   */
  function processGift(state, playerId, npcId, npcArchetype, giftItemId) {
    var reaction = getGiftReaction(npcArchetype, giftItemId);
    var action;
    var message;

    if (reaction === 'liked') {
      action = 'gift_liked';
      message = 'They absolutely loved the ' + giftItemId + '!';
    } else if (reaction === 'disliked') {
      action = 'gift_disliked';
      message = 'They frowned at the ' + giftItemId + '.';
    } else {
      action = 'gift_item';
      message = 'They accepted the ' + giftItemId + '.';
    }

    var result = modifyReputation(state, playerId, npcId, action, { giftItemId: giftItemId });

    return {
      state: result.state,
      reaction: reaction,
      change: result.change,
      message: message
    };
  }

  // ---------------------------------------------------------------------------
  // FEATURE UNLOCKS
  // ---------------------------------------------------------------------------

  /**
   * Returns array of features unlocked at this reputation score.
   * @param {number} score
   * @returns {Array<string>}
   */
  function getUnlockedFeatures(score) {
    var features = [];
    for (var i = 0; i < FEATURE_THRESHOLDS.length; i++) {
      if (score >= FEATURE_THRESHOLDS[i].score) {
        features.push(FEATURE_THRESHOLDS[i].feature);
      }
    }
    return features;
  }

  // ---------------------------------------------------------------------------
  // RELATIONSHIP SUMMARIES
  // ---------------------------------------------------------------------------

  /**
   * Returns all NPC relationships for a player, sorted by score descending.
   * @param {Object} state
   * @param {string} playerId
   * @returns {Array<Object>}
   */
  function getNPCRelationshipSummary(state, playerId) {
    if (!state || !state.players || !state.players[playerId]) return [];
    var relationships = state.players[playerId];
    var result = [];
    for (var npcId in relationships) {
      var score = relationships[npcId];
      var tier = getTier(score);
      result.push({
        npcId: npcId,
        score: score,
        tier: tier.name,
        tierColor: tier.color
      });
    }
    result.sort(function(a, b) { return b.score - a.score; });
    return result;
  }

  /**
   * Returns top N relationships for a player by score.
   * @param {Object} state
   * @param {string} playerId
   * @param {number} [limit=5]
   * @returns {Array<Object>}
   */
  function getTopRelationships(state, playerId, limit) {
    limit = typeof limit === 'number' ? limit : 5;
    var all = getNPCRelationshipSummary(state, playerId);
    return all.slice(0, limit);
  }

  // ---------------------------------------------------------------------------
  // REPUTATION DECAY
  // ---------------------------------------------------------------------------

  /**
   * Slowly decay all reputations toward 0 by amount if score is above threshold.
   * @param {Object} state
   * @param {string} playerId
   * @param {number} [amount=1]    - amount to decay per tick
   * @param {number} [threshold=5] - only decay if |score| > threshold
   * @returns {Object} state
   */
  function decayReputation(state, playerId, amount, threshold) {
    amount = typeof amount === 'number' ? amount : 1;
    threshold = typeof threshold === 'number' ? threshold : 5;

    if (!state || !state.players || !state.players[playerId]) return state;

    var relationships = state.players[playerId];
    for (var npcId in relationships) {
      var score = relationships[npcId];
      if (Math.abs(score) > threshold) {
        if (score > 0) {
          relationships[npcId] = Math.max(0, score - amount);
        } else {
          relationships[npcId] = Math.min(0, score + amount);
        }
      }
    }

    return state;
  }

  // ---------------------------------------------------------------------------
  // FORMATTING
  // ---------------------------------------------------------------------------

  /**
   * Returns a visual reputation bar string with tier name.
   * Example: [----|====#====|----] Friendly (42)
   * @param {number} score  (-100 to 100)
   * @returns {string}
   */
  function formatReputationBar(score) {
    score = Math.max(REPUTATION_MIN, Math.min(REPUTATION_MAX, score));
    var tier = getTier(score);

    // Bar is 20 chars wide, representing -100..100
    var barWidth = 20;
    // Position from 0..barWidth-1
    var normalized = (score - REPUTATION_MIN) / (REPUTATION_MAX - REPUTATION_MIN); // 0..1
    var pos = Math.round(normalized * (barWidth - 1));

    var bar = '';
    for (var i = 0; i < barWidth; i++) {
      if (i === pos) {
        bar += '#';
      } else if (i < barWidth / 2) {
        bar += score >= 0 ? '-' : '=';
      } else {
        bar += score >= 0 ? '=' : '-';
      }
    }

    // Simpler, clearer format: negative region dashes, positive region equals
    bar = '';
    var midPoint = Math.floor(barWidth / 2); // index 10 = score 0
    for (var j = 0; j < barWidth; j++) {
      if (j === pos) {
        bar += '#';
      } else if (j < midPoint) {
        bar += '-';
      } else {
        bar += '=';
      }
    }

    return '[' + bar + '] ' + tier.name + ' (' + score + ')';
  }

  /**
   * Returns an HTML card string for an NPC relationship.
   * @param {string} npcId
   * @param {string} npcName
   * @param {string} archetype
   * @param {number} score
   * @returns {string} HTML string
   */
  function formatRelationshipCard(npcId, npcName, archetype, score) {
    var tier = getTier(score);
    var features = getUnlockedFeatures(score);
    var bar = formatReputationBar(score);
    var featureList = features.length > 0
      ? '<ul>' + features.map(function(f) { return '<li>' + f + '</li>'; }).join('') + '</ul>'
      : '<p>No special features unlocked yet.</p>';

    return '<div class="npc-rep-card" data-npc-id="' + npcId + '">' +
      '<h3 class="npc-name">' + npcName + '</h3>' +
      '<span class="npc-archetype">' + archetype + '</span>' +
      '<div class="npc-tier" style="color:' + tier.color + '">' + tier.name + '</div>' +
      '<div class="npc-bar"><pre>' + bar + '</pre></div>' +
      '<div class="npc-score">Score: ' + score + '</div>' +
      '<div class="npc-features">' + featureList + '</div>' +
      '</div>';
  }

  // ---------------------------------------------------------------------------
  // EXPORTS
  // ---------------------------------------------------------------------------

  exports.TIERS = TIERS;
  exports.REPUTATION_ACTIONS = REPUTATION_ACTIONS;
  exports.ARCHETYPE_PREFERENCES = ARCHETYPE_PREFERENCES;
  exports.DIALOGUE_POOLS = DIALOGUE_POOLS;
  exports.FEATURE_THRESHOLDS = FEATURE_THRESHOLDS;
  exports.REPUTATION_MIN = REPUTATION_MIN;
  exports.REPUTATION_MAX = REPUTATION_MAX;

  exports.createReputationState = createReputationState;
  exports.getReputation = getReputation;
  exports.modifyReputation = modifyReputation;
  exports.getTier = getTier;
  exports.getDialogue = getDialogue;
  exports.getGiftReaction = getGiftReaction;
  exports.processGift = processGift;
  exports.getUnlockedFeatures = getUnlockedFeatures;
  exports.getNPCRelationshipSummary = getNPCRelationshipSummary;
  exports.getTopRelationships = getTopRelationships;
  exports.decayReputation = decayReputation;
  exports.formatReputationBar = formatReputationBar;
  exports.formatRelationshipCard = formatRelationshipCard;

})(typeof module !== 'undefined' ? module.exports : (window.NpcReputation = {}));
