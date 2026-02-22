/**
 * ZION Trust Bonds System
 * Deep NPC relationship progression: bond levels, gifts, memories,
 * gossip, betrayal, and decay mechanics.
 */

(function(exports) {
  'use strict';

  // ============================================================================
  // SEEDED PRNG — mulberry32
  // ============================================================================

  function mulberry32(seed) {
    var s = seed >>> 0;
    return function() {
      s += 0x6D2B79F5;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ============================================================================
  // BOND LEVELS — 5 tiers with thresholds
  // ============================================================================

  var BOND_LEVELS = [
    {
      name: 'stranger',
      label: 'Stranger',
      minPoints: 0,
      maxPoints: 24,
      color: '#888888',
      description: 'You have just met. No trust has been established.',
      dialoguePrefix: 'stranger',
      questAccess: false
    },
    {
      name: 'acquaintance',
      label: 'Acquaintance',
      minPoints: 25,
      maxPoints: 99,
      color: '#88aacc',
      description: 'You have exchanged pleasantries and built a little familiarity.',
      dialoguePrefix: 'acquaintance',
      questAccess: false
    },
    {
      name: 'friend',
      label: 'Friend',
      minPoints: 100,
      maxPoints: 249,
      color: '#44bb66',
      description: 'A genuine friendship has formed. They speak freely with you.',
      dialoguePrefix: 'friend',
      questAccess: true
    },
    {
      name: 'confidant',
      label: 'Confidant',
      minPoints: 250,
      maxPoints: 499,
      color: '#ffaa00',
      description: 'Deep trust. They share their secrets and fears with you.',
      dialoguePrefix: 'confidant',
      questAccess: true
    },
    {
      name: 'soul_bonded',
      label: 'Soul Bonded',
      minPoints: 500,
      maxPoints: Infinity,
      color: '#ff66ff',
      description: 'An unbreakable bond. You are woven into their story forever.',
      dialoguePrefix: 'soul_bonded',
      questAccess: true
    }
  ];

  // ============================================================================
  // GIFT TYPES — 10 gifts with NPC archetype preferences
  // ============================================================================

  var GIFT_TYPES = [
    {
      id: 'wildflower_bouquet',
      name: 'Wildflower Bouquet',
      description: 'A hand-picked bundle of meadow flowers.',
      basePoints: 10,
      archetypeBonus: {
        gardener: 20,
        healer: 12,
        artist: 15,
        musician: 8,
        builder: 4,
        merchant: 5,
        explorer: 6,
        philosopher: 5,
        storyteller: 7,
        teacher: 8
      }
    },
    {
      id: 'rare_seed_packet',
      name: 'Rare Seed Packet',
      description: 'Seeds from a plant found only deep in the Wilds.',
      basePoints: 18,
      archetypeBonus: {
        gardener: 35,
        healer: 20,
        explorer: 18,
        artist: 10,
        musician: 6,
        builder: 5,
        merchant: 12,
        philosopher: 8,
        storyteller: 9,
        teacher: 12
      }
    },
    {
      id: 'handwritten_poem',
      name: 'Handwritten Poem',
      description: 'A poem composed in the recipient\'s honour.',
      basePoints: 12,
      archetypeBonus: {
        storyteller: 30,
        teacher: 18,
        philosopher: 22,
        artist: 20,
        musician: 15,
        healer: 10,
        gardener: 8,
        builder: 3,
        merchant: 4,
        explorer: 6
      }
    },
    {
      id: 'master_blueprint',
      name: 'Master Blueprint',
      description: 'A detailed schematic for an advanced structure.',
      basePoints: 15,
      archetypeBonus: {
        builder: 35,
        merchant: 12,
        teacher: 15,
        explorer: 8,
        philosopher: 6,
        artist: 5,
        musician: 3,
        gardener: 4,
        healer: 5,
        storyteller: 6
      }
    },
    {
      id: 'exotic_spice',
      name: 'Exotic Spice',
      description: 'A rare spice traded from distant shores.',
      basePoints: 14,
      archetypeBonus: {
        merchant: 28,
        healer: 18,
        explorer: 20,
        gardener: 12,
        storyteller: 10,
        teacher: 8,
        philosopher: 7,
        artist: 8,
        musician: 6,
        builder: 5
      }
    },
    {
      id: 'musical_score',
      name: 'Musical Score',
      description: 'An original composition written for this person.',
      basePoints: 13,
      archetypeBonus: {
        musician: 32,
        artist: 18,
        storyteller: 14,
        philosopher: 10,
        healer: 9,
        teacher: 8,
        explorer: 7,
        gardener: 7,
        merchant: 4,
        builder: 3
      }
    },
    {
      id: 'ancient_map',
      name: 'Ancient Map',
      description: 'A hand-drawn map showing a hidden corner of the world.',
      basePoints: 16,
      archetypeBonus: {
        explorer: 35,
        storyteller: 20,
        philosopher: 14,
        teacher: 12,
        artist: 10,
        merchant: 10,
        builder: 8,
        gardener: 6,
        healer: 5,
        musician: 5
      }
    },
    {
      id: 'medicinal_herbs',
      name: 'Medicinal Herbs',
      description: 'Carefully dried herbs with restorative properties.',
      basePoints: 14,
      archetypeBonus: {
        healer: 35,
        gardener: 20,
        teacher: 12,
        philosopher: 8,
        storyteller: 7,
        explorer: 10,
        artist: 6,
        musician: 5,
        builder: 4,
        merchant: 9
      }
    },
    {
      id: 'gemstone',
      name: 'Gemstone',
      description: 'A polished gemstone with inner luminescence.',
      basePoints: 20,
      archetypeBonus: {
        merchant: 22,
        artist: 25,
        builder: 15,
        explorer: 16,
        gardener: 10,
        healer: 10,
        musician: 12,
        philosopher: 10,
        storyteller: 10,
        teacher: 8
      }
    },
    {
      id: 'philosophical_tome',
      name: 'Philosophical Tome',
      description: 'A dense book of wisdom gathered over many lives.',
      basePoints: 15,
      archetypeBonus: {
        philosopher: 35,
        teacher: 28,
        storyteller: 18,
        healer: 10,
        artist: 8,
        musician: 7,
        explorer: 9,
        gardener: 5,
        builder: 4,
        merchant: 4
      }
    }
  ];

  // ============================================================================
  // ACTION TYPES — interaction types with base points and cooldowns
  // ============================================================================

  var ACTION_TYPES = [
    {
      id: 'conversation',
      label: 'Conversation',
      basePoints: 3,
      cooldownTicks: 50,
      description: 'Talk with the NPC about general topics.'
    },
    {
      id: 'shared_activity',
      label: 'Shared Activity',
      basePoints: 8,
      cooldownTicks: 100,
      description: 'Participate in an activity together.'
    },
    {
      id: 'helped_task',
      label: 'Helped with Task',
      basePoints: 12,
      cooldownTicks: 150,
      description: 'Assist the NPC in completing one of their goals.'
    },
    {
      id: 'time_spent',
      label: 'Time Spent Together',
      basePoints: 5,
      cooldownTicks: 75,
      description: 'Simply spending time near each other.'
    },
    {
      id: 'deep_conversation',
      label: 'Deep Conversation',
      basePoints: 15,
      cooldownTicks: 200,
      description: 'A meaningful exchange about life, dreams, and fears.'
    },
    {
      id: 'shared_meal',
      label: 'Shared Meal',
      basePoints: 10,
      cooldownTicks: 120,
      description: 'Share a meal together.'
    },
    {
      id: 'taught_skill',
      label: 'Taught a Skill',
      basePoints: 18,
      cooldownTicks: 250,
      description: 'Teach or learn a skill together.'
    },
    {
      id: 'collaborated',
      label: 'Collaborated on Project',
      basePoints: 20,
      cooldownTicks: 300,
      description: 'Work together on a shared creative or practical project.'
    }
  ];

  // ============================================================================
  // BETRAYAL TYPES
  // ============================================================================

  var BETRAYAL_TYPES = {
    steal: { label: 'Stole from NPC', pointsLost: 80, description: 'You took something that was not yours.' },
    attack: { label: 'Attacked NPC', pointsLost: 120, description: 'You raised a hand against them.' },
    ignore_crisis: { label: 'Ignored During Crisis', pointsLost: 50, description: 'You turned away when they needed help most.' },
    spread_rumour: { label: 'Spread False Rumour', pointsLost: 60, description: 'You damaged their reputation with lies.' },
    broke_promise: { label: 'Broke a Promise', pointsLost: 40, description: 'You failed to keep your word.' }
  };

  // ============================================================================
  // DIALOGUE UNLOCKS PER LEVEL
  // ============================================================================

  var DIALOGUE_UNLOCKS = {
    stranger: [],
    acquaintance: [
      { id: 'acq_greeting', text: 'Ah, it is good to see you again.' },
      { id: 'acq_smalltalk', text: 'How have you been finding ZION?' }
    ],
    friend: [
      { id: 'friend_secret', text: 'I do not tell many people this, but...' },
      { id: 'friend_favour', text: 'I could use your help with something personal.' },
      { id: 'friend_story', text: 'Let me tell you how I came to be here.' }
    ],
    confidant: [
      { id: 'conf_fear', text: 'My greatest fear is that one day this place will change beyond recognition.' },
      { id: 'conf_dream', text: 'I have a dream. A real one. Can I share it with you?' },
      { id: 'conf_past', text: 'Before ZION, my life was very different. Very dark.' },
      { id: 'conf_quest', text: 'There is something only I know about. I need someone I trust.' }
    ],
    soul_bonded: [
      { id: 'soul_vow', text: 'I would follow you to the edge of this world and back.' },
      { id: 'soul_legacy', text: 'When I am gone, I want you to carry this forward.' },
      { id: 'soul_truth', text: 'The truth about this place is something I have never told anyone...' },
      { id: 'soul_gift', text: 'This was given to me at a time when I had nothing. Now I give it to you.' },
      { id: 'soul_covenant', text: 'Between us, there are no secrets.' }
    ]
  };

  // ============================================================================
  // GOSSIP TEMPLATES
  // ============================================================================

  var GOSSIP_POSITIVE = [
    '{player} is one of the finest souls I have met in ZION.',
    'If you need help, seek out {player}. They have never let me down.',
    '{player} gave me a gift that I still think about. Remarkable person.',
    'I shared my deepest worries with {player} and they listened without judgement.',
    'They say fortune favours the bold — I say it favours people like {player}.',
    '{player} and I worked side by side and I learned so much from them.'
  ];

  var GOSSIP_NEUTRAL = [
    'I have seen {player} around. Seems decent enough.',
    '{player} spoke to me once. Nothing memorable, but pleasant.',
    'I do not know {player} very well. Our paths cross occasionally.',
    '{player}? Yes, I recognise the name. We have exchanged greetings.'
  ];

  var GOSSIP_NEGATIVE = [
    'Be careful around {player}. They showed their true colours when it mattered.',
    'I trusted {player} once. I will not make that mistake again.',
    '{player} stole from me. Or at least, I believe so. Keep your belongings close.',
    'When I needed help, {player} walked away. That tells you everything.',
    '{player} spread lies about me. I have not forgotten.'
  ];

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  function getBondKey(playerId, npcId) {
    return playerId + '::' + npcId;
  }

  function getBondLevelName(points) {
    for (var i = BOND_LEVELS.length - 1; i >= 0; i--) {
      if (points >= BOND_LEVELS[i].minPoints) {
        return BOND_LEVELS[i].name;
      }
    }
    return BOND_LEVELS[0].name;
  }

  function getBondLevelDef(points) {
    for (var i = BOND_LEVELS.length - 1; i >= 0; i--) {
      if (points >= BOND_LEVELS[i].minPoints) {
        return BOND_LEVELS[i];
      }
    }
    return BOND_LEVELS[0];
  }

  function getNextThreshold(points) {
    for (var i = 0; i < BOND_LEVELS.length; i++) {
      if (points < BOND_LEVELS[i].minPoints) {
        return BOND_LEVELS[i].minPoints;
      }
    }
    return null; // already at max level
  }

  function getProgress(points) {
    var current = getBondLevelDef(points);
    var nextThreshold = getNextThreshold(points);
    if (nextThreshold === null) {
      return 1;
    }
    var rangeStart = current.minPoints;
    var rangeTotal = nextThreshold - rangeStart;
    var rangeProgress = points - rangeStart;
    return rangeTotal > 0 ? rangeProgress / rangeTotal : 1;
  }

  function getActionDef(actionType) {
    for (var i = 0; i < ACTION_TYPES.length; i++) {
      if (ACTION_TYPES[i].id === actionType) return ACTION_TYPES[i];
    }
    return null;
  }

  function getGiftDef(giftType) {
    for (var i = 0; i < GIFT_TYPES.length; i++) {
      if (GIFT_TYPES[i].id === giftType) return GIFT_TYPES[i];
    }
    return null;
  }

  function ensureBondEntry(state, playerId, npcId) {
    var key = getBondKey(playerId, npcId);
    if (!state.bonds[key]) {
      state.bonds[key] = {
        playerId: playerId,
        npcId: npcId,
        points: 0,
        lastInteractTick: -1,
        cooldowns: {},
        giftCooldowns: {}
      };
    }
    return state.bonds[key];
  }

  function ensureMemoryEntry(state, playerId, npcId) {
    var key = getBondKey(playerId, npcId);
    if (!state.memories[key]) {
      state.memories[key] = {
        playerId: playerId,
        npcId: npcId,
        playerName: playerId,
        interactions: []
      };
    }
    return state.memories[key];
  }

  function clampPoints(points) {
    return Math.max(0, points);
  }

  // ============================================================================
  // STATE FACTORY
  // ============================================================================

  function createState() {
    return {
      bonds: {},
      memories: {},
      gossip: [],
      bondLog: []
    };
  }

  // ============================================================================
  // INTERACT — gain bond points from an action type
  // ============================================================================

  function interact(state, playerId, npcId, actionType, currentTick) {
    var actionDef = getActionDef(actionType);
    if (!actionDef) {
      return { success: false, points: 0, newLevel: null, unlocks: [], reason: 'unknown_action' };
    }

    var entry = ensureBondEntry(state, playerId, npcId);

    // Check cooldown
    var lastUsed = entry.cooldowns[actionType] || -Infinity;
    if (currentTick - lastUsed < actionDef.cooldownTicks) {
      return {
        success: false,
        points: 0,
        newLevel: getBondLevelName(entry.points),
        unlocks: [],
        reason: 'on_cooldown'
      };
    }

    var prevLevel = getBondLevelName(entry.points);
    var gained = actionDef.basePoints;
    entry.points = clampPoints(entry.points + gained);
    entry.cooldowns[actionType] = currentTick;
    entry.lastInteractTick = currentTick;

    var newLevel = getBondLevelName(entry.points);
    var levelChanged = newLevel !== prevLevel;

    // Add to memory
    addMemory(state, playerId, npcId, {
      type: actionType,
      label: actionDef.label,
      tick: currentTick,
      pointsGained: gained
    }, currentTick);

    // Build unlocks list if level changed
    var unlocks = levelChanged ? getUnlocks(state, playerId, npcId) : [];

    // Log bond change
    state.bondLog.push({
      tick: currentTick,
      playerId: playerId,
      npcId: npcId,
      action: actionType,
      pointsGained: gained,
      totalPoints: entry.points,
      levelChanged: levelChanged,
      newLevel: newLevel
    });

    return {
      success: true,
      points: gained,
      totalPoints: entry.points,
      newLevel: newLevel,
      levelChanged: levelChanged,
      unlocks: unlocks
    };
  }

  // ============================================================================
  // GIVE GIFT — gain bond points from a gift, with NPC archetype weighting
  // ============================================================================

  function giveGift(state, playerId, npcId, giftType, currentTick, npcArchetype) {
    var giftDef = getGiftDef(giftType);
    if (!giftDef) {
      return { success: false, points: 0, reaction: 'confused', newLevel: null, reason: 'unknown_gift' };
    }

    var entry = ensureBondEntry(state, playerId, npcId);

    // Gift cooldown (each gift type has 200-tick cooldown)
    var lastGift = entry.giftCooldowns[giftType] || -Infinity;
    if (currentTick - lastGift < 200) {
      return {
        success: false,
        points: 0,
        reaction: 'already_received',
        newLevel: getBondLevelName(entry.points),
        reason: 'on_cooldown'
      };
    }

    var archetype = npcArchetype || 'merchant';
    var archetypeBonus = giftDef.archetypeBonus[archetype] || giftDef.basePoints;
    var gained = giftDef.basePoints + Math.floor(archetypeBonus * 0.5);

    // Determine reaction
    var reaction;
    if (archetypeBonus >= 25) {
      reaction = 'overjoyed';
    } else if (archetypeBonus >= 15) {
      reaction = 'pleased';
    } else if (archetypeBonus >= 8) {
      reaction = 'grateful';
    } else {
      reaction = 'polite';
    }

    var prevLevel = getBondLevelName(entry.points);
    entry.points = clampPoints(entry.points + gained);
    entry.giftCooldowns[giftType] = currentTick;
    entry.lastInteractTick = currentTick;

    var newLevel = getBondLevelName(entry.points);
    var levelChanged = newLevel !== prevLevel;

    addMemory(state, playerId, npcId, {
      type: 'gift',
      label: 'Gave gift: ' + giftDef.name,
      giftId: giftType,
      tick: currentTick,
      pointsGained: gained,
      reaction: reaction
    }, currentTick);

    state.bondLog.push({
      tick: currentTick,
      playerId: playerId,
      npcId: npcId,
      action: 'gift:' + giftType,
      pointsGained: gained,
      totalPoints: entry.points,
      levelChanged: levelChanged,
      newLevel: newLevel
    });

    return {
      success: true,
      points: gained,
      totalPoints: entry.points,
      reaction: reaction,
      newLevel: newLevel,
      levelChanged: levelChanged
    };
  }

  // ============================================================================
  // GET BOND LEVEL — returns level info for a player-NPC pair
  // ============================================================================

  function getBondLevel(state, playerId, npcId) {
    var entry = ensureBondEntry(state, playerId, npcId);
    var points = entry.points;
    var levelDef = getBondLevelDef(points);
    var nextThreshold = getNextThreshold(points);
    var progress = getProgress(points);

    return {
      level: levelDef.name,
      label: levelDef.label,
      points: points,
      nextThreshold: nextThreshold,
      progress: progress,
      color: levelDef.color,
      description: levelDef.description
    };
  }

  // ============================================================================
  // GET PLAYER BONDS — all bonds this player has
  // ============================================================================

  function getPlayerBonds(state, playerId) {
    var result = [];
    var keys = Object.keys(state.bonds);
    for (var i = 0; i < keys.length; i++) {
      var entry = state.bonds[keys[i]];
      if (entry.playerId === playerId) {
        result.push({
          npcId: entry.npcId,
          points: entry.points,
          level: getBondLevelName(entry.points),
          lastInteractTick: entry.lastInteractTick
        });
      }
    }
    return result;
  }

  // ============================================================================
  // GET NPC BONDS — all player bonds an NPC has
  // ============================================================================

  function getNpcBonds(state, npcId) {
    var result = [];
    var keys = Object.keys(state.bonds);
    for (var i = 0; i < keys.length; i++) {
      var entry = state.bonds[keys[i]];
      if (entry.npcId === npcId) {
        result.push({
          playerId: entry.playerId,
          points: entry.points,
          level: getBondLevelName(entry.points),
          lastInteractTick: entry.lastInteractTick
        });
      }
    }
    return result;
  }

  // ============================================================================
  // MEMORIES
  // ============================================================================

  function addMemory(state, playerId, npcId, event, currentTick) {
    var memEntry = ensureMemoryEntry(state, playerId, npcId);
    var memory = {
      tick: currentTick,
      type: event.type || 'unknown',
      label: event.label || '',
      data: event
    };
    memEntry.interactions.push(memory);
    // Keep only last 10
    if (memEntry.interactions.length > 10) {
      memEntry.interactions = memEntry.interactions.slice(memEntry.interactions.length - 10);
    }
    return memory;
  }

  function getMemories(state, playerId, npcId) {
    var key = getBondKey(playerId, npcId);
    var mem = state.memories[key];
    if (!mem) return [];
    return mem.interactions.slice();
  }

  // ============================================================================
  // GOSSIP
  // ============================================================================

  function getGossip(state, npcId) {
    var result = [];
    for (var i = 0; i < state.gossip.length; i++) {
      if (state.gossip[i].npcId === npcId) {
        result.push(state.gossip[i]);
      }
    }
    return result;
  }

  function generateGossip(state, npcId, currentTick) {
    var npcBonds = getNpcBonds(state, npcId);
    var seed = (npcId.length * 31 + currentTick) >>> 0;
    var rng = mulberry32(seed);
    var generated = [];

    for (var i = 0; i < npcBonds.length; i++) {
      var bond = npcBonds[i];
      var playerId = bond.playerId;
      var points = bond.points;

      var template;
      var sentiment;

      if (points >= 250) {
        var idx = Math.floor(rng() * GOSSIP_POSITIVE.length);
        template = GOSSIP_POSITIVE[idx];
        sentiment = 'positive';
      } else if (points >= 100) {
        var idx2 = Math.floor(rng() * GOSSIP_POSITIVE.length);
        template = GOSSIP_POSITIVE[idx2];
        sentiment = 'positive';
      } else if (points >= 25) {
        var idx3 = Math.floor(rng() * GOSSIP_NEUTRAL.length);
        template = GOSSIP_NEUTRAL[idx3];
        sentiment = 'neutral';
      } else {
        var idx4 = Math.floor(rng() * GOSSIP_NEUTRAL.length);
        template = GOSSIP_NEUTRAL[idx4];
        sentiment = 'neutral';
      }

      // For negative bonds (below 0 not possible, but after betrayal bond may be low)
      if (points < 10 && bond.lastInteractTick !== -1) {
        var idx5 = Math.floor(rng() * GOSSIP_NEGATIVE.length);
        template = GOSSIP_NEGATIVE[idx5];
        sentiment = 'negative';
      }

      var text = template.replace(/\{player\}/g, playerId);

      var gossipEntry = {
        npcId: npcId,
        playerId: playerId,
        text: text,
        sentiment: sentiment,
        tick: currentTick
      };

      // Remove existing gossip for this pair and add new
      state.gossip = state.gossip.filter(function(g) {
        return !(g.npcId === npcId && g.playerId === playerId);
      });
      state.gossip.push(gossipEntry);
      generated.push(gossipEntry);
    }

    return generated;
  }

  // ============================================================================
  // BETRAY — break bond trust
  // ============================================================================

  function betray(state, playerId, npcId, betrayalType, currentTick) {
    var betrayalDef = BETRAYAL_TYPES[betrayalType];
    if (!betrayalDef) {
      return { success: false, pointsLost: 0, newLevel: null, reason: 'unknown_betrayal' };
    }

    var entry = ensureBondEntry(state, playerId, npcId);
    var prevLevel = getBondLevelName(entry.points);
    var lost = Math.min(entry.points, betrayalDef.pointsLost);
    entry.points = clampPoints(entry.points - betrayalDef.pointsLost);
    entry.lastInteractTick = currentTick;

    var newLevel = getBondLevelName(entry.points);

    addMemory(state, playerId, npcId, {
      type: 'betrayal',
      label: 'Betrayal: ' + betrayalDef.label,
      betrayalType: betrayalType,
      tick: currentTick,
      pointsLost: lost
    }, currentTick);

    state.bondLog.push({
      tick: currentTick,
      playerId: playerId,
      npcId: npcId,
      action: 'betrayal:' + betrayalType,
      pointsLost: lost,
      totalPoints: entry.points,
      levelChanged: newLevel !== prevLevel,
      newLevel: newLevel
    });

    return {
      success: true,
      pointsLost: lost,
      newLevel: newLevel,
      levelChanged: newLevel !== prevLevel,
      description: betrayalDef.description
    };
  }

  // ============================================================================
  // APPLY DECAY — lose 1 point per 200 ticks of inactivity
  // ============================================================================

  function applyDecay(state, currentTick) {
    var decayed = [];
    var keys = Object.keys(state.bonds);

    for (var i = 0; i < keys.length; i++) {
      var entry = state.bonds[keys[i]];
      if (entry.points <= 0) continue;
      if (entry.lastInteractTick < 0) continue;

      var ticksSinceLast = currentTick - entry.lastInteractTick;
      var decayUnits = Math.floor(ticksSinceLast / 200);
      if (decayUnits <= 0) continue;

      var lost = decayUnits;
      if (lost > entry.points) lost = entry.points;
      entry.points = clampPoints(entry.points - lost);

      if (lost > 0) {
        decayed.push({
          playerId: entry.playerId,
          npcId: entry.npcId,
          lost: lost,
          remaining: entry.points
        });
      }
    }

    return { decayed: decayed };
  }

  // ============================================================================
  // GET UNLOCKS — dialogue and quest unlocks at current bond level
  // ============================================================================

  function getUnlocks(state, playerId, npcId) {
    var entry = ensureBondEntry(state, playerId, npcId);
    var level = getBondLevelName(entry.points);
    var levelDef = getBondLevelDef(entry.points);

    // Collect all unlocks up to and including current level
    var result = [];
    for (var i = 0; i < BOND_LEVELS.length; i++) {
      var lvl = BOND_LEVELS[i];
      var dialogues = DIALOGUE_UNLOCKS[lvl.name] || [];
      for (var j = 0; j < dialogues.length; j++) {
        result.push({
          type: 'dialogue',
          id: dialogues[j].id,
          text: dialogues[j].text,
          level: lvl.name
        });
      }
      if (lvl.name === level) break;
    }

    if (levelDef.questAccess) {
      result.push({
        type: 'quest_access',
        id: 'quest_' + level,
        level: level
      });
    }

    return result;
  }

  // ============================================================================
  // GET BOND LEADERBOARD — top players by bond with an NPC
  // ============================================================================

  function getBondLeaderboard(state, npcId, count) {
    var bonds = getNpcBonds(state, npcId);
    bonds.sort(function(a, b) { return b.points - a.points; });
    return bonds.slice(0, count || 10);
  }

  // ============================================================================
  // GET PLAYER BOND STATS — summary stats for a player
  // ============================================================================

  function getPlayerBondStats(state, playerId) {
    var bonds = getPlayerBonds(state, playerId);
    var total = 0;
    var counts = { stranger: 0, acquaintance: 0, friend: 0, confidant: 0, soul_bonded: 0 };
    var maxPoints = 0;
    var topNpc = null;

    for (var i = 0; i < bonds.length; i++) {
      total += bonds[i].points;
      var lvl = bonds[i].level;
      if (counts[lvl] !== undefined) counts[lvl]++;
      if (bonds[i].points > maxPoints) {
        maxPoints = bonds[i].points;
        topNpc = bonds[i].npcId;
      }
    }

    return {
      totalBonds: bonds.length,
      totalPoints: total,
      levelCounts: counts,
      topNpc: topNpc,
      topNpcPoints: maxPoints,
      averagePoints: bonds.length > 0 ? Math.floor(total / bonds.length) : 0
    };
  }

  // ============================================================================
  // GET STRONGEST BONDS — top NPC bonds for a player
  // ============================================================================

  function getStrongestBonds(state, playerId, count) {
    var bonds = getPlayerBonds(state, playerId);
    bonds.sort(function(a, b) { return b.points - a.points; });
    return bonds.slice(0, count || 5);
  }

  // ============================================================================
  // EXPORTS
  // ============================================================================

  exports.BOND_LEVELS = BOND_LEVELS;
  exports.GIFT_TYPES = GIFT_TYPES;
  exports.ACTION_TYPES = ACTION_TYPES;
  exports.BETRAYAL_TYPES = BETRAYAL_TYPES;
  exports.DIALOGUE_UNLOCKS = DIALOGUE_UNLOCKS;
  exports.GOSSIP_POSITIVE = GOSSIP_POSITIVE;
  exports.GOSSIP_NEUTRAL = GOSSIP_NEUTRAL;
  exports.GOSSIP_NEGATIVE = GOSSIP_NEGATIVE;

  exports.createState = createState;
  exports.interact = interact;
  exports.giveGift = giveGift;
  exports.getBondLevel = getBondLevel;
  exports.getBondLevelName = getBondLevelName;
  exports.getPlayerBonds = getPlayerBonds;
  exports.getNpcBonds = getNpcBonds;
  exports.getMemories = getMemories;
  exports.addMemory = addMemory;
  exports.getGossip = getGossip;
  exports.generateGossip = generateGossip;
  exports.betray = betray;
  exports.applyDecay = applyDecay;
  exports.getUnlocks = getUnlocks;
  exports.getBondLeaderboard = getBondLeaderboard;
  exports.getPlayerBondStats = getPlayerBondStats;
  exports.getStrongestBonds = getStrongestBonds;

})(typeof module !== 'undefined' ? module.exports : (window.TrustBonds = {}));
