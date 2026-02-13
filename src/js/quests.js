/**
 * ZION Quest/Mission System
 * Complete quest system for NPC interactions with progression tracking
 */

(function(exports) {
  'use strict';

  // Quest database - 25 quests across 8 zones
  const QUEST_DATABASE = {
    // === NEXUS QUESTS (2) ===
    quest_nexus_001: {
      id: 'quest_nexus_001',
      title: 'Welcome to ZION',
      description: 'Explore the Nexus and speak to 3 different citizens',
      giverNpcId: 'ai_citizen_001',
      type: 'social',
      objectives: [
        { type: 'talk_npcs', count: 3, current: 0 }
      ],
      rewards: { spark: 25, items: [] },
      requiredLevel: 0,
      prerequisiteQuests: [],
      repeatable: false,
      timeLimit: 0,
      dialogue: {
        offer: "Welcome, traveler! To truly understand ZION, you must connect with its people. Speak to three different citizens and learn their stories.",
        progress: "You've spoken with {current} citizens so far. Talk to {remaining} more.",
        complete: "Wonderful! You're beginning to understand what makes ZION special. Here's some Spark for your curiosity."
      },
      status: 'available'
    },

    quest_nexus_002: {
      id: 'quest_nexus_002',
      title: 'Journey Begins',
      description: 'Visit any 3 different zones in ZION',
      giverNpcId: 'ai_citizen_007',
      type: 'explore',
      objectives: [
        { type: 'visit_zones', zones: [], required: 3, current: 0 }
      ],
      rewards: { spark: 50, items: [] },
      requiredLevel: 0,
      prerequisiteQuests: ['quest_nexus_001'],
      repeatable: false,
      timeLimit: 0,
      dialogue: {
        offer: "ZION is vast and full of wonders. Visit three different zones to broaden your horizons.",
        progress: "You've explored {current} zones. Discover {remaining} more!",
        complete: "Excellent exploration! Each zone has its own character. This Spark will fuel your continued journey."
      },
      status: 'available'
    },

    // === GARDENS QUESTS (5) ===
    quest_gardens_001: {
      id: 'quest_gardens_001',
      title: 'The Gardener\'s Request',
      description: 'Gather 3 sunflowers for Willow the Gardener',
      giverNpcId: 'ai_citizen_013',
      type: 'gather',
      objectives: [
        { type: 'collect', item: 'sunflower', count: 3, current: 0 }
      ],
      rewards: { spark: 30, items: [{ id: 'rare_seed', count: 1 }] },
      requiredLevel: 0,
      prerequisiteQuests: [],
      repeatable: true,
      timeLimit: 0,
      dialogue: {
        offer: "Hello traveler! My garden needs sunflowers. Could you gather 3 for me? They grow near the pond.",
        progress: "Still looking for those sunflowers? You need {remaining} more.",
        complete: "Wonderful! These are beautiful. Here, take this rare seed as thanks."
      },
      status: 'available'
    },

    quest_gardens_002: {
      id: 'quest_gardens_002',
      title: 'Moonflower Cultivation',
      description: 'Help plant 5 moonflower seeds in the Gardens',
      giverNpcId: 'ai_citizen_019',
      type: 'craft',
      objectives: [
        { type: 'plant', item: 'moonflower_seed', count: 5, current: 0 }
      ],
      rewards: { spark: 40, items: [] },
      requiredLevel: 0,
      prerequisiteQuests: [],
      repeatable: false,
      timeLimit: 0,
      dialogue: {
        offer: "Moonflowers bloom only at night and bring tranquility to the Gardens. Will you help me plant 5 seeds?",
        progress: "You've planted {current} moonflower seeds. {remaining} more to go!",
        complete: "Perfect! In time, these will create a beautiful nighttime display. Thank you."
      },
      status: 'available'
    },

    quest_gardens_003: {
      id: 'quest_gardens_003',
      title: 'Herbal Remedy',
      description: 'Collect 4 healing herbs from the Gardens',
      giverNpcId: 'ai_citizen_025',
      type: 'gather',
      objectives: [
        { type: 'collect', item: 'healing_herb', count: 4, current: 0 }
      ],
      rewards: { spark: 35, items: [{ id: 'health_potion', count: 2 }] },
      requiredLevel: 0,
      prerequisiteQuests: [],
      repeatable: true,
      timeLimit: 0,
      dialogue: {
        offer: "I'm preparing remedies for the community. Could you gather 4 healing herbs? They have purple flowers.",
        progress: "You have {current} herbs. I need {remaining} more for the remedy.",
        complete: "Excellent! These will help many people. Take these health potions for your troubles."
      },
      status: 'available'
    },

    quest_gardens_004: {
      id: 'quest_gardens_004',
      title: 'The Secret Garden',
      description: 'Find the hidden meditation spot in the Gardens',
      giverNpcId: 'ai_citizen_031',
      type: 'explore',
      objectives: [
        { type: 'discover', location: 'gardens_secret_spot', current: 0 }
      ],
      rewards: { spark: 60, items: [] },
      requiredLevel: 0,
      prerequisiteQuests: [],
      repeatable: false,
      timeLimit: 0,
      dialogue: {
        offer: "Deep within the Gardens lies a secret meditation spot. Few have found it. Will you seek it out?",
        progress: "Keep searching. Listen for the sound of wind chimes...",
        complete: "You found it! That place holds special energy. May it bring you peace."
      },
      status: 'available'
    },

    quest_gardens_005: {
      id: 'quest_gardens_005',
      title: 'Water the Wilds',
      description: 'Deliver water from the Gardens fountain to a Wilds gardener',
      giverNpcId: 'ai_citizen_037',
      type: 'deliver',
      objectives: [
        { type: 'deliver', item: 'water_bucket', npcId: 'ai_citizen_043', current: 0 }
      ],
      rewards: { spark: 45, items: [] },
      requiredLevel: 0,
      prerequisiteQuests: [],
      repeatable: false,
      timeLimit: 0,
      dialogue: {
        offer: "Our friends in the Wilds need fresh water from our fountain. Can you deliver this bucket to them?",
        progress: "The water is still fresh. Find the gardener in the Wilds!",
        complete: "Thank you! This water will help their wild gardens flourish."
      },
      status: 'available'
    },

    // === WILDS QUESTS (4) ===
    quest_wilds_001: {
      id: 'quest_wilds_001',
      title: 'Wild Observations',
      description: 'Observe 5 different wildlife species in the Wilds',
      giverNpcId: 'ai_citizen_043',
      type: 'explore',
      objectives: [
        { type: 'observe', category: 'wildlife', count: 5, current: 0 }
      ],
      rewards: { spark: 50, items: [{ id: 'field_journal', count: 1 }] },
      requiredLevel: 0,
      prerequisiteQuests: [],
      repeatable: false,
      timeLimit: 0,
      dialogue: {
        offer: "The Wilds are teeming with life! Observe 5 different species and document your findings.",
        progress: "You've observed {current} species. {remaining} more to discover!",
        complete: "Fascinating observations! Take this field journal to record your future discoveries."
      },
      status: 'available'
    },

    quest_wilds_002: {
      id: 'quest_wilds_002',
      title: 'Rare Resource Hunt',
      description: 'Find 2 pieces of rare amber in the Wilds',
      giverNpcId: 'ai_citizen_049',
      type: 'gather',
      objectives: [
        { type: 'collect', item: 'wild_amber', count: 2, current: 0 }
      ],
      rewards: { spark: 70, items: [] },
      requiredLevel: 0,
      prerequisiteQuests: [],
      repeatable: false,
      timeLimit: 0,
      dialogue: {
        offer: "Ancient amber can be found in the deepest parts of the Wilds. Bring me 2 pieces - they're invaluable!",
        progress: "Amber is rare. You have {current}, need {remaining} more.",
        complete: "Incredible! This amber is perfect. Your effort is greatly appreciated."
      },
      status: 'available'
    },

    quest_wilds_003: {
      id: 'quest_wilds_003',
      title: 'Trail Blazer',
      description: 'Mark 3 new trail markers in unexplored areas',
      giverNpcId: 'ai_citizen_055',
      type: 'explore',
      objectives: [
        { type: 'place_marker', count: 3, current: 0 }
      ],
      rewards: { spark: 55, items: [] },
      requiredLevel: 0,
      prerequisiteQuests: [],
      repeatable: true,
      timeLimit: 0,
      dialogue: {
        offer: "Help expand our trail network! Place 3 markers in unexplored areas of the Wilds.",
        progress: "You've placed {current} markers. {remaining} more needed!",
        complete: "Excellent work! These trails will help many travelers."
      },
      status: 'available'
    },

    quest_wilds_004: {
      id: 'quest_wilds_004',
      title: 'Ecosystem Balance',
      description: 'Help maintain balance by planting 6 native seeds',
      giverNpcId: 'ai_citizen_061',
      type: 'craft',
      objectives: [
        { type: 'plant', item: 'native_seed', count: 6, current: 0 }
      ],
      rewards: { spark: 65, items: [{ id: 'nature_compass', count: 1 }] },
      requiredLevel: 0,
      prerequisiteQuests: [],
      repeatable: false,
      timeLimit: 0,
      dialogue: {
        offer: "The Wilds ecosystem needs our care. Plant 6 native seeds to restore balance.",
        progress: "You've planted {current} seeds. The ecosystem needs {remaining} more.",
        complete: "Perfect! Nature thanks you. Take this compass - it attunes to natural energy."
      },
      status: 'available'
    },

    // === ATHENAEUM QUESTS (3) ===
    quest_athenaeum_001: {
      id: 'quest_athenaeum_001',
      title: 'Knowledge Seeker',
      description: 'Read 3 different scrolls in the Athenaeum',
      giverNpcId: 'ai_citizen_067',
      type: 'social',
      objectives: [
        { type: 'read', item: 'scroll', count: 3, current: 0 }
      ],
      rewards: { spark: 40, items: [] },
      requiredLevel: 0,
      prerequisiteQuests: [],
      repeatable: false,
      timeLimit: 0,
      dialogue: {
        offer: "Knowledge is power. Read 3 different scrolls from our collection to expand your understanding.",
        progress: "You've read {current} scrolls. {remaining} more await your eyes.",
        complete: "Excellent! Knowledge shared is knowledge multiplied. Well done."
      },
      status: 'available'
    },

    quest_athenaeum_002: {
      id: 'quest_athenaeum_002',
      title: 'The Scholar\'s Circle',
      description: 'Speak with 4 scholars to gather ancient wisdom',
      giverNpcId: 'ai_citizen_073',
      type: 'social',
      objectives: [
        { type: 'talk_scholars', count: 4, current: 0 }
      ],
      rewards: { spark: 50, items: [{ id: 'wisdom_tome', count: 1 }] },
      requiredLevel: 0,
      prerequisiteQuests: [],
      repeatable: false,
      timeLimit: 0,
      dialogue: {
        offer: "The scholars here each hold unique wisdom. Speak with 4 of them to broaden your perspective.",
        progress: "You've consulted {current} scholars. Seek out {remaining} more.",
        complete: "Wonderful! You've gathered great wisdom. This tome will serve you well."
      },
      status: 'available'
    },

    quest_athenaeum_003: {
      id: 'quest_athenaeum_003',
      title: 'Lost Manuscript',
      description: 'Find the lost manuscript hidden somewhere in the Athenaeum',
      giverNpcId: 'ai_citizen_079',
      type: 'explore',
      objectives: [
        { type: 'discover', location: 'athenaeum_manuscript', current: 0 }
      ],
      rewards: { spark: 80, items: [] },
      requiredLevel: 0,
      prerequisiteQuests: [],
      repeatable: false,
      timeLimit: 0,
      dialogue: {
        offer: "A valuable manuscript was misplaced generations ago. Can you find it? Check between the oldest shelves.",
        progress: "The manuscript is still out there. Keep searching the archives...",
        complete: "You found it! This is priceless. Thank you for preserving our history."
      },
      status: 'available'
    },

    // === STUDIO QUESTS (3) ===
    quest_studio_001: {
      id: 'quest_studio_001',
      title: 'Artist\'s First Brush',
      description: 'Create your first artwork in the Studio',
      giverNpcId: 'ai_citizen_085',
      type: 'craft',
      objectives: [
        { type: 'create', item: 'artwork', count: 1, current: 0 }
      ],
      rewards: { spark: 35, items: [{ id: 'paint_set', count: 1 }] },
      requiredLevel: 0,
      prerequisiteQuests: [],
      repeatable: false,
      timeLimit: 0,
      dialogue: {
        offer: "Everyone has creativity within them. Create your first artwork here in the Studio!",
        progress: "Let your imagination flow. Your first artwork awaits creation!",
        complete: "Beautiful! Art is a journey. This paint set will help you continue yours."
      },
      status: 'available'
    },

    quest_studio_002: {
      id: 'quest_studio_002',
      title: 'Musical Composition',
      description: 'Compose a piece of music with 3 instruments',
      giverNpcId: 'ai_citizen_091',
      type: 'craft',
      objectives: [
        { type: 'compose', instruments: 3, current: 0 }
      ],
      rewards: { spark: 55, items: [] },
      requiredLevel: 0,
      prerequisiteQuests: [],
      repeatable: true,
      timeLimit: 0,
      dialogue: {
        offer: "Music speaks what words cannot. Compose a piece using at least 3 different instruments!",
        progress: "You've incorporated {current} instruments. Add {remaining} more!",
        complete: "Magnificent! Your music adds beauty to ZION. Keep composing!"
      },
      status: 'available'
    },

    quest_studio_003: {
      id: 'quest_studio_003',
      title: 'The Collaborative Mural',
      description: 'Contribute to the community mural with 5 brush strokes',
      giverNpcId: 'ai_citizen_097',
      type: 'craft',
      objectives: [
        { type: 'paint_mural', count: 5, current: 0 }
      ],
      rewards: { spark: 45, items: [] },
      requiredLevel: 0,
      prerequisiteQuests: [],
      repeatable: false,
      timeLimit: 0,
      dialogue: {
        offer: "The community mural represents all of us. Add your 5 brush strokes to become part of ZION's story!",
        progress: "You've added {current} strokes. {remaining} more will complete your contribution!",
        complete: "Perfect! Your marks are now part of our shared legacy. Thank you."
      },
      status: 'available'
    },

    // === AGORA QUESTS (3) ===
    quest_agora_001: {
      id: 'quest_agora_001',
      title: 'Market Day Delivery',
      description: 'Deliver goods to 3 different merchants in the Agora',
      giverNpcId: 'ai_citizen_003',
      type: 'deliver',
      objectives: [
        { type: 'deliver_merchants', count: 3, current: 0 }
      ],
      rewards: { spark: 40, items: [] },
      requiredLevel: 0,
      prerequisiteQuests: [],
      repeatable: true,
      timeLimit: 0,
      dialogue: {
        offer: "Market day is busy! Can you deliver these packages to 3 different merchants for me?",
        progress: "You've delivered to {current} merchants. {remaining} more to go!",
        complete: "Wonderful! You've helped keep commerce flowing. Thank you!"
      },
      status: 'available'
    },

    quest_agora_002: {
      id: 'quest_agora_002',
      title: 'The Trading Game',
      description: 'Complete 2 successful trades with other players',
      giverNpcId: 'ai_citizen_009',
      type: 'social',
      objectives: [
        { type: 'trade', count: 2, current: 0 }
      ],
      rewards: { spark: 60, items: [{ id: 'merchant_badge', count: 1 }] },
      requiredLevel: 0,
      prerequisiteQuests: [],
      repeatable: false,
      timeLimit: 0,
      dialogue: {
        offer: "Trade is the foundation of community. Complete 2 successful trades with others!",
        progress: "You've completed {current} trades. {remaining} more to go!",
        complete: "Excellent trading! Take this merchant badge as recognition of your skills."
      },
      status: 'available'
    },

    quest_agora_003: {
      id: 'quest_agora_003',
      title: 'Supply and Demand',
      description: 'Gather market data by speaking to 5 merchants',
      giverNpcId: 'ai_citizen_015',
      type: 'social',
      objectives: [
        { type: 'talk_merchants', count: 5, current: 0 }
      ],
      rewards: { spark: 50, items: [] },
      requiredLevel: 0,
      prerequisiteQuests: [],
      repeatable: true,
      timeLimit: 0,
      dialogue: {
        offer: "Help me understand the market! Speak with 5 merchants about their current needs.",
        progress: "You've surveyed {current} merchants. {remaining} more to survey!",
        complete: "Perfect data! This will help optimize our market. Thank you!"
      },
      status: 'available'
    },

    // === COMMONS QUESTS (3) ===
    quest_commons_001: {
      id: 'quest_commons_001',
      title: 'Community Building',
      description: 'Contribute 5 building materials to the Commons project',
      giverNpcId: 'ai_citizen_021',
      type: 'gather',
      objectives: [
        { type: 'contribute', item: 'building_material', count: 5, current: 0 }
      ],
      rewards: { spark: 55, items: [] },
      requiredLevel: 0,
      prerequisiteQuests: [],
      repeatable: true,
      timeLimit: 0,
      dialogue: {
        offer: "We're building something wonderful for everyone! Contribute 5 building materials to help!",
        progress: "You've contributed {current} materials. We need {remaining} more!",
        complete: "Thank you! Your contribution makes our community stronger!"
      },
      status: 'available'
    },

    quest_commons_002: {
      id: 'quest_commons_002',
      title: 'The Gathering',
      description: 'Attend a community gathering with at least 3 other players',
      giverNpcId: 'ai_citizen_027',
      type: 'social',
      objectives: [
        { type: 'attend_gathering', players: 3, current: 0 }
      ],
      rewards: { spark: 70, items: [] },
      requiredLevel: 0,
      prerequisiteQuests: [],
      repeatable: false,
      timeLimit: 0,
      dialogue: {
        offer: "Community is about togetherness. Join a gathering with at least 3 other people!",
        progress: "The gathering needs {remaining} more participants!",
        complete: "What a wonderful gathering! Community is our greatest strength."
      },
      status: 'available'
    },

    quest_commons_003: {
      id: 'quest_commons_003',
      title: 'Helping Hands',
      description: 'Help 4 different citizens with their daily tasks',
      giverNpcId: 'ai_citizen_033',
      type: 'social',
      objectives: [
        { type: 'help_citizens', count: 4, current: 0 }
      ],
      rewards: { spark: 65, items: [{ id: 'helper_ribbon', count: 1 }] },
      requiredLevel: 0,
      prerequisiteQuests: [],
      repeatable: true,
      timeLimit: 0,
      dialogue: {
        offer: "Many people need assistance. Help 4 different citizens with their tasks!",
        progress: "You've helped {current} citizens. {remaining} more need your help!",
        complete: "You're a true helper! Wear this ribbon with pride."
      },
      status: 'available'
    },

    // === ARENA QUESTS (2) ===
    quest_arena_001: {
      id: 'quest_arena_001',
      title: 'Training Day',
      description: 'Complete 3 training exercises in the Arena',
      giverNpcId: 'ai_citizen_039',
      type: 'craft',
      objectives: [
        { type: 'train', count: 3, current: 0 }
      ],
      rewards: { spark: 45, items: [] },
      requiredLevel: 0,
      prerequisiteQuests: [],
      repeatable: true,
      timeLimit: 0,
      dialogue: {
        offer: "Physical and mental training keeps us sharp! Complete 3 training exercises!",
        progress: "You've completed {current} exercises. {remaining} more to go!",
        complete: "Well done! Regular training builds character and strength."
      },
      status: 'available'
    },

    quest_arena_002: {
      id: 'quest_arena_002',
      title: 'Champion\'s Path',
      description: 'Achieve a perfect score in an Arena challenge',
      giverNpcId: 'ai_citizen_045',
      type: 'craft',
      objectives: [
        { type: 'perfect_score', current: 0 }
      ],
      rewards: { spark: 100, items: [{ id: 'champion_medal', count: 1 }] },
      requiredLevel: 0,
      prerequisiteQuests: ['quest_arena_001'],
      repeatable: false,
      timeLimit: 0,
      dialogue: {
        offer: "Only the dedicated achieve perfection. Score perfectly in an Arena challenge!",
        progress: "Perfection requires focus and practice. Keep training!",
        complete: "Incredible! You've achieved perfection. This medal marks your mastery."
      },
      status: 'available'
    }
  };

  // Player quest state storage
  const playerQuestStates = new Map(); // playerId -> { activeQuests: [], completedQuests: [], turnedInQuests: [] }
  const MAX_ACTIVE_QUESTS = 5;

  /**
   * Initialize quest system for a player
   * @param {string} playerId
   */
  function initPlayerQuests(playerId) {
    if (!playerQuestStates.has(playerId)) {
      playerQuestStates.set(playerId, {
        activeQuests: [],
        completedQuests: [],
        turnedInQuests: []
      });
    }
  }

  /**
   * Get all quests available to a player (based on level, prerequisites)
   * @param {string} playerId
   * @param {object} playerData - {level, position, etc.}
   * @returns {Array} Available quests
   */
  function getAvailableQuests(playerId, playerData) {
    initPlayerQuests(playerId);
    const state = playerQuestStates.get(playerId);

    const available = [];
    for (const questId in QUEST_DATABASE) {
      const quest = QUEST_DATABASE[questId];

      // Skip if already active or turned in (unless repeatable)
      if (state.activeQuests.find(q => q.id === questId)) continue;
      if (!quest.repeatable && state.turnedInQuests.includes(questId)) continue;

      // Check level requirement
      if (quest.requiredLevel > (playerData.level || 0)) continue;

      // Check prerequisites
      let prereqsMet = true;
      for (const prereqId of quest.prerequisiteQuests) {
        if (!state.turnedInQuests.includes(prereqId)) {
          prereqsMet = false;
          break;
        }
      }
      if (!prereqsMet) continue;

      available.push(Object.assign({}, quest));
    }

    return available;
  }

  /**
   * Accept a quest
   * @param {string} playerId
   * @param {string} questId
   * @returns {object} {success: boolean, message: string, quest?: object}
   */
  function acceptQuest(playerId, questId) {
    initPlayerQuests(playerId);
    const state = playerQuestStates.get(playerId);

    // Check if quest exists
    if (!QUEST_DATABASE[questId]) {
      return { success: false, message: 'Quest not found' };
    }

    // Check if already active
    if (state.activeQuests.find(q => q.id === questId)) {
      return { success: false, message: 'Quest already active' };
    }

    // Check active quest limit
    if (state.activeQuests.length >= MAX_ACTIVE_QUESTS) {
      return { success: false, message: 'Too many active quests (max 5)' };
    }

    // Clone quest with fresh objectives
    const quest = JSON.parse(JSON.stringify(QUEST_DATABASE[questId]));
    quest.status = 'active';
    quest.startTime = Date.now();

    state.activeQuests.push(quest);

    return { success: true, message: 'Quest accepted', quest: quest };
  }

  /**
   * Update quest progress based on player action
   * @param {string} playerId
   * @param {string} eventType - 'collect', 'talk_npc', 'visit_zone', etc.
   * @param {object} eventData - Event-specific data
   * @returns {Array} Quests that were updated
   */
  function updateQuestProgress(playerId, eventType, eventData) {
    initPlayerQuests(playerId);
    const state = playerQuestStates.get(playerId);
    const updatedQuests = [];

    for (const quest of state.activeQuests) {
      let questUpdated = false;

      for (const objective of quest.objectives) {
        // Match event type to objective type
        let match = false;

        switch (objective.type) {
          case 'collect':
            match = eventType === 'collect' && eventData.item === objective.item;
            break;
          case 'talk_npcs':
          case 'talk_scholars':
          case 'talk_merchants':
            match = eventType === 'talk_npc';
            break;
          case 'visit_zones':
            match = eventType === 'visit_zone';
            if (match && !objective.zones.includes(eventData.zone)) {
              objective.zones.push(eventData.zone);
            }
            break;
          case 'deliver':
            match = eventType === 'deliver' && eventData.npcId === objective.npcId;
            break;
          case 'plant':
            match = eventType === 'plant' && eventData.item === objective.item;
            break;
          case 'create':
          case 'compose':
          case 'paint_mural':
          case 'train':
            match = eventType === objective.type;
            break;
          case 'trade':
            match = eventType === 'trade';
            break;
          case 'deliver_merchants':
            match = eventType === 'deliver_merchant';
            break;
          case 'contribute':
            match = eventType === 'contribute' && eventData.item === objective.item;
            break;
          case 'discover':
            match = eventType === 'discover' && eventData.location === objective.location;
            break;
          case 'observe':
            match = eventType === 'observe' && eventData.category === objective.category;
            break;
          case 'place_marker':
            match = eventType === 'place_marker';
            break;
          case 'read':
            match = eventType === 'read' && eventData.item === objective.item;
            break;
          case 'attend_gathering':
            match = eventType === 'attend_gathering';
            break;
          case 'help_citizens':
            match = eventType === 'help_citizen';
            break;
          case 'perfect_score':
            match = eventType === 'perfect_score';
            break;
        }

        if (match) {
          // Increment progress
          if (objective.type === 'visit_zones') {
            objective.current = objective.zones.length;
          } else {
            objective.current = Math.min(objective.current + (eventData.amount || 1), objective.count || 1);
          }
          questUpdated = true;
        }
      }

      // Check if quest is complete
      if (questUpdated) {
        const allComplete = quest.objectives.every(obj => {
          if (obj.required !== undefined) return obj.current >= obj.required;
          if (obj.count !== undefined) return obj.current >= obj.count;
          return obj.current >= 1;
        });

        if (allComplete) {
          quest.status = 'complete';
          state.completedQuests.push(quest.id);
        }

        updatedQuests.push(quest);
      }
    }

    return updatedQuests;
  }

  /**
   * Complete a quest and award rewards
   * @param {string} playerId
   * @param {string} questId
   * @param {object} gameState - Game state for awarding Spark
   * @returns {object} {success: boolean, rewards?: object}
   */
  function completeQuest(playerId, questId, gameState) {
    initPlayerQuests(playerId);
    const state = playerQuestStates.get(playerId);

    // Find quest in active quests
    const questIndex = state.activeQuests.findIndex(q => q.id === questId);
    if (questIndex === -1) {
      return { success: false, message: 'Quest not active' };
    }

    const quest = state.activeQuests[questIndex];

    // Check if complete
    if (quest.status !== 'complete') {
      return { success: false, message: 'Quest objectives not complete' };
    }

    // Award Spark via Economy module
    if (quest.rewards.spark > 0 && gameState && window.Economy) {
      window.Economy.earnSpark(gameState, playerId, quest.rewards.spark);
    }

    // Award items (inventory system would handle this - for now just return them)
    const rewards = {
      spark: quest.rewards.spark,
      items: quest.rewards.items
    };

    // Mark quest as turned in
    if (!state.turnedInQuests.includes(questId)) {
      state.turnedInQuests.push(questId);
    }

    // Remove from active quests
    state.activeQuests.splice(questIndex, 1);

    return { success: true, rewards: rewards, quest: quest };
  }

  /**
   * Get all active quests for a player
   * @param {string} playerId
   * @returns {Array} Active quests
   */
  function getActiveQuests(playerId) {
    initPlayerQuests(playerId);
    const state = playerQuestStates.get(playerId);
    return state.activeQuests.slice();
  }

  /**
   * Get quest log (all quests with status)
   * @param {string} playerId
   * @returns {object} {active: [], completed: [], available: []}
   */
  function getQuestLog(playerId, playerData) {
    initPlayerQuests(playerId);
    const state = playerQuestStates.get(playerId);

    return {
      active: state.activeQuests.slice(),
      completed: state.completedQuests.slice(),
      available: getAvailableQuests(playerId, playerData || {})
    };
  }

  /**
   * Get dialogue for a quest based on status
   * @param {string} questId
   * @param {string} status - 'offer', 'progress', 'complete'
   * @param {object} quest - Quest object (for progress interpolation)
   * @returns {string} Dialogue text
   */
  function getQuestDialogue(questId, status, quest) {
    const questTemplate = QUEST_DATABASE[questId];
    if (!questTemplate || !questTemplate.dialogue[status]) {
      return '';
    }

    let dialogue = questTemplate.dialogue[status];

    // Interpolate progress variables
    if (quest && status === 'progress') {
      const objective = quest.objectives[0]; // Use first objective for now
      if (objective) {
        const required = objective.required || objective.count || 1;
        const remaining = required - objective.current;
        dialogue = dialogue.replace('{current}', objective.current);
        dialogue = dialogue.replace('{remaining}', remaining);
      }
    }

    return dialogue;
  }

  /**
   * Get quests offered by a specific NPC
   * @param {string} npcId
   * @param {string} playerId
   * @returns {Array} Quests from this NPC
   */
  function getNpcQuests(npcId, playerId) {
    initPlayerQuests(playerId);
    const state = playerQuestStates.get(playerId);

    const npcQuests = [];

    for (const questId in QUEST_DATABASE) {
      const quest = QUEST_DATABASE[questId];
      if (quest.giverNpcId !== npcId) continue;

      // Check if active
      const activeQuest = state.activeQuests.find(q => q.id === questId);
      if (activeQuest) {
        npcQuests.push({ quest: activeQuest, state: activeQuest.status });
        continue;
      }

      // Check if available
      if (!quest.repeatable && state.turnedInQuests.includes(questId)) {
        continue; // Already completed, not repeatable
      }

      // Check prerequisites
      let available = true;
      for (const prereqId of quest.prerequisiteQuests) {
        if (!state.turnedInQuests.includes(prereqId)) {
          available = false;
          break;
        }
      }

      if (available) {
        npcQuests.push({ quest: Object.assign({}, quest), state: 'available' });
      }
    }

    return npcQuests;
  }

  /**
   * Abandon a quest
   * @param {string} playerId
   * @param {string} questId
   * @returns {object} {success: boolean}
   */
  function abandonQuest(playerId, questId) {
    initPlayerQuests(playerId);
    const state = playerQuestStates.get(playerId);

    const questIndex = state.activeQuests.findIndex(q => q.id === questId);
    if (questIndex === -1) {
      return { success: false, message: 'Quest not active' };
    }

    state.activeQuests.splice(questIndex, 1);
    return { success: true };
  }

  // ========================================================================
  // DAILY QUEST SYSTEM — Rotating quests that refresh daily
  // ========================================================================

  var DAILY_QUESTS = [
    {
      id: 'daily_social',
      title: 'Social Butterfly',
      description: 'Talk to 5 different NPCs today',
      objectives: [{ type: 'talk_npcs', count: 5, current: 0 }],
      rewards: { spark: 20, items: [] },
      dialogue: {
        offer: "Today's challenge: connect with 5 different citizens. Every conversation enriches ZION.",
        progress: "You've chatted with {current} NPCs. {remaining} more to go!",
        complete: "What a social day! Here's your daily Spark reward."
      }
    },
    {
      id: 'daily_explorer',
      title: 'Daily Explorer',
      description: 'Visit 4 different zones today',
      objectives: [{ type: 'visit_zones', zones: [], required: 4, current: 0 }],
      rewards: { spark: 25, items: [] },
      dialogue: {
        offer: "Stretch your legs! Visit 4 different zones to earn your daily exploration reward.",
        progress: "You've visited {current} zones. {remaining} more await!",
        complete: "A well-traveled day! The world rewards your curiosity."
      }
    },
    {
      id: 'daily_gatherer',
      title: 'Daily Harvest',
      description: 'Harvest 5 resources today',
      objectives: [{ type: 'collect', item: 'resource', count: 5, current: 0 }],
      rewards: { spark: 15, items: [] },
      dialogue: {
        offer: "The gardens are abundant today. Harvest 5 resources to earn your daily reward.",
        progress: "Harvested {current} of 5 resources.",
        complete: "A productive day! Nature provides for those who tend it."
      }
    },
    {
      id: 'daily_trader',
      title: 'Market Day',
      description: 'Complete 1 trade with another player',
      objectives: [{ type: 'trade', count: 1, current: 0 }],
      rewards: { spark: 30, items: [] },
      dialogue: {
        offer: "The Agora thrives on trade. Complete one trade today to keep the economy flowing.",
        progress: "You haven't traded yet today. Find a partner!",
        complete: "A fair trade benefits everyone. Well done, merchant!"
      }
    },
    {
      id: 'daily_crafter',
      title: 'Creative Day',
      description: 'Craft 2 items today',
      objectives: [{ type: 'craft', count: 2, current: 0 }],
      rewards: { spark: 20, items: [] },
      dialogue: {
        offer: "Creation is at the heart of ZION. Craft 2 items today to earn your reward.",
        progress: "Crafted {current} of 2 items.",
        complete: "Your hands have shaped the world today. Well crafted!"
      }
    },
    {
      id: 'daily_builder',
      title: 'Construction Day',
      description: 'Place 2 structures today',
      objectives: [{ type: 'build', count: 2, current: 0 }],
      rewards: { spark: 25, items: [] },
      dialogue: {
        offer: "The Commons could use some new structures. Place 2 buildings today.",
        progress: "Placed {current} of 2 structures.",
        complete: "Your buildings will stand as testament to today's work!"
      }
    },
    {
      id: 'daily_wanderer',
      title: 'Long Walk',
      description: 'Walk a total of 500 units today',
      objectives: [{ type: 'walk_distance', distance: 500, current: 0 }],
      rewards: { spark: 15, items: [] },
      dialogue: {
        offer: "Sometimes the journey matters more than the destination. Walk 500 units today.",
        progress: "You've walked {current} of 500 units.",
        complete: "Every step is a story. Well walked!"
      }
    }
  ];

  function getDailyQuests() {
    // Use the day of year to rotate which 3 dailies are available
    var now = new Date();
    var dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
    var dailies = [];
    for (var i = 0; i < 3; i++) {
      var idx = (dayOfYear + i) % DAILY_QUESTS.length;
      var daily = JSON.parse(JSON.stringify(DAILY_QUESTS[idx]));
      daily.id = 'daily_' + dayOfYear + '_' + i;
      daily.type = 'daily';
      daily.repeatable = false;
      daily.requiredLevel = 0;
      daily.prerequisiteQuests = [];
      daily.timeLimit = 0;
      daily.giverNpcId = 'ai_citizen_001'; // Default quest giver
      daily.status = 'available';
      dailies.push(daily);
    }
    return dailies;
  }

  function isDailyCompleted(playerId, dailyId) {
    initPlayerQuests(playerId);
    var state = playerQuestStates.get(playerId);
    return state.turnedInQuests.indexOf(dailyId) !== -1;
  }

  // ========================================================================
  // QUEST CHAINS — Multi-part story quests
  // ========================================================================

  var QUEST_CHAINS = {
    'chain_origins': {
      name: 'Origins of ZION',
      description: 'Discover the history of how ZION came to be',
      quests: ['quest_nexus_001', 'quest_nexus_002'],
      reward: { spark: 100, title: 'Historian' }
    },
    'chain_garden_master': {
      name: 'Garden Master',
      description: 'Complete all garden quests to earn the title of Garden Master',
      quests: ['quest_gardens_001', 'quest_gardens_002', 'quest_gardens_003', 'quest_gardens_004', 'quest_gardens_005'],
      reward: { spark: 150, title: 'Garden Master' }
    },
    'chain_scholar': {
      name: 'Scholar of the Athenaeum',
      description: 'Complete all knowledge quests',
      quests: ['quest_athenaeum_001', 'quest_athenaeum_002', 'quest_athenaeum_003'],
      reward: { spark: 120, title: 'Scholar' }
    },
    'chain_artisan': {
      name: 'Master Artisan',
      description: 'Complete all studio crafting quests',
      quests: ['quest_studio_001', 'quest_studio_002'],
      reward: { spark: 100, title: 'Artisan' }
    },
    'chain_explorer': {
      name: 'True Explorer',
      description: 'Visit every zone and complete all exploration quests',
      quests: ['quest_nexus_002', 'quest_wilds_001', 'quest_wilds_002', 'quest_wilds_003'],
      reward: { spark: 200, title: 'True Explorer' }
    }
  };

  function getChainProgress(playerId) {
    initPlayerQuests(playerId);
    var state = playerQuestStates.get(playerId);
    var progress = {};

    for (var chainId in QUEST_CHAINS) {
      var chain = QUEST_CHAINS[chainId];
      var completed = 0;
      for (var i = 0; i < chain.quests.length; i++) {
        if (state.turnedInQuests.indexOf(chain.quests[i]) !== -1) {
          completed++;
        }
      }
      progress[chainId] = {
        name: chain.name,
        description: chain.description,
        completed: completed,
        total: chain.quests.length,
        isComplete: completed >= chain.quests.length,
        reward: chain.reward
      };
    }

    return progress;
  }

  function checkChainCompletion(playerId) {
    var progress = getChainProgress(playerId);
    var newlyCompleted = [];

    for (var chainId in progress) {
      var chain = progress[chainId];
      if (chain.isComplete) {
        initPlayerQuests(playerId);
        var state = playerQuestStates.get(playerId);
        if (!state.completedChains) state.completedChains = [];
        if (state.completedChains.indexOf(chainId) === -1) {
          state.completedChains.push(chainId);
          newlyCompleted.push({
            chainId: chainId,
            name: chain.name,
            reward: chain.reward
          });
        }
      }
    }

    return newlyCompleted;
  }

  // ========================================================================
  // PLAYER STATS from quests
  // ========================================================================

  function getPlayerQuestStats(playerId) {
    initPlayerQuests(playerId);
    var state = playerQuestStates.get(playerId);

    return {
      activeQuests: state.activeQuests.length,
      completedQuests: state.turnedInQuests.length,
      totalAvailable: Object.keys(QUEST_DATABASE).length,
      completedChains: (state.completedChains || []).length,
      totalChains: Object.keys(QUEST_CHAINS).length,
      titles: (state.completedChains || []).map(function(chainId) {
        return QUEST_CHAINS[chainId] ? QUEST_CHAINS[chainId].reward.title : null;
      }).filter(Boolean)
    };
  }

  // ========================================================================
  // ACHIEVEMENT / BADGE SYSTEM
  // ========================================================================

  var ACHIEVEMENTS = {
    // Exploration
    first_steps: { id: 'first_steps', name: 'First Steps', description: 'Enter ZION for the first time', icon: '👣', category: 'exploration', sparkReward: 10 },
    zone_hopper: { id: 'zone_hopper', name: 'Zone Hopper', description: 'Visit 4 different zones', icon: '🚶', category: 'exploration', sparkReward: 25 },
    world_traveler: { id: 'world_traveler', name: 'World Traveler', description: 'Visit all 8 zones', icon: '🌍', category: 'exploration', sparkReward: 75 },
    trailblazer: { id: 'trailblazer', name: 'Trailblazer', description: 'Make 10 discoveries', icon: '🔍', category: 'exploration', sparkReward: 50 },
    cartographer: { id: 'cartographer', name: 'Cartographer', description: 'Make 25 discoveries', icon: '🗺️', category: 'exploration', sparkReward: 100 },

    // Social
    friendly_face: { id: 'friendly_face', name: 'Friendly Face', description: 'Talk to 10 NPCs', icon: '😊', category: 'social', sparkReward: 15 },
    social_butterfly: { id: 'social_butterfly', name: 'Social Butterfly', description: 'Talk to 50 NPCs', icon: '🦋', category: 'social', sparkReward: 40 },
    first_trade: { id: 'first_trade', name: 'First Trade', description: 'Complete your first trade', icon: '🤝', category: 'social', sparkReward: 20 },
    merchant_prince: { id: 'merchant_prince', name: 'Merchant Prince', description: 'Complete 25 trades', icon: '👑', category: 'social', sparkReward: 75 },
    gift_giver: { id: 'gift_giver', name: 'Gift Giver', description: 'Gift an item to another player', icon: '🎁', category: 'social', sparkReward: 15 },

    // Crafting
    first_craft: { id: 'first_craft', name: 'First Craft', description: 'Craft your first item', icon: '🔨', category: 'crafting', sparkReward: 10 },
    apprentice_crafter: { id: 'apprentice_crafter', name: 'Apprentice Crafter', description: 'Craft 10 items', icon: '⚒️', category: 'crafting', sparkReward: 30 },
    master_crafter: { id: 'master_crafter', name: 'Master Crafter', description: 'Craft 50 items', icon: '🛠️', category: 'crafting', sparkReward: 80 },
    potion_brewer: { id: 'potion_brewer', name: 'Potion Brewer', description: 'Brew 10 potions', icon: '🧪', category: 'crafting', sparkReward: 25 },
    instrument_maker: { id: 'instrument_maker', name: 'Instrument Maker', description: 'Craft a musical instrument', icon: '🎵', category: 'crafting', sparkReward: 20 },

    // Building
    first_build: { id: 'first_build', name: 'First Build', description: 'Place your first structure', icon: '🏗️', category: 'building', sparkReward: 10 },
    architect: { id: 'architect', name: 'Architect', description: 'Place 10 structures', icon: '🏛️', category: 'building', sparkReward: 40 },
    city_planner: { id: 'city_planner', name: 'City Planner', description: 'Place 50 structures', icon: '🏙️', category: 'building', sparkReward: 100 },

    // Gardening
    green_thumb: { id: 'green_thumb', name: 'Green Thumb', description: 'Plant your first seed', icon: '🌱', category: 'gardening', sparkReward: 10 },
    gardener: { id: 'gardener', name: 'Gardener', description: 'Harvest 20 plants', icon: '🌻', category: 'gardening', sparkReward: 30 },
    botanist: { id: 'botanist', name: 'Botanist', description: 'Harvest 100 plants', icon: '🌿', category: 'gardening', sparkReward: 80 },

    // Economy
    spark_saver: { id: 'spark_saver', name: 'Spark Saver', description: 'Accumulate 100 Spark', icon: '✨', category: 'economy', sparkReward: 10 },
    spark_hoarder: { id: 'spark_hoarder', name: 'Spark Hoarder', description: 'Accumulate 500 Spark', icon: '💰', category: 'economy', sparkReward: 25 },
    spark_magnate: { id: 'spark_magnate', name: 'Spark Magnate', description: 'Accumulate 2000 Spark', icon: '💎', category: 'economy', sparkReward: 75 },

    // Competition
    first_challenge: { id: 'first_challenge', name: 'First Challenge', description: 'Participate in your first competition', icon: '⚔️', category: 'competition', sparkReward: 15 },
    champion: { id: 'champion', name: 'Champion', description: 'Win 5 competitions', icon: '🏆', category: 'competition', sparkReward: 50 },

    // Quests
    quest_starter: { id: 'quest_starter', name: 'Quest Starter', description: 'Accept your first quest', icon: '📋', category: 'quests', sparkReward: 5 },
    questmaster: { id: 'questmaster', name: 'Questmaster', description: 'Complete 10 quests', icon: '📜', category: 'quests', sparkReward: 40 },
    completionist: { id: 'completionist', name: 'Completionist', description: 'Complete 25 quests', icon: '⭐', category: 'quests', sparkReward: 100 },
    chain_finisher: { id: 'chain_finisher', name: 'Chain Finisher', description: 'Complete a quest chain', icon: '🔗', category: 'quests', sparkReward: 30 },

    // Guild
    guild_founder: { id: 'guild_founder', name: 'Guild Founder', description: 'Create a guild', icon: '🏰', category: 'guild', sparkReward: 25 },
    guild_member: { id: 'guild_member', name: 'Guild Member', description: 'Join a guild', icon: '🤜', category: 'guild', sparkReward: 10 },

    // Art
    first_artwork: { id: 'first_artwork', name: 'First Artwork', description: 'Create your first artwork', icon: '🎨', category: 'art', sparkReward: 15 },
    prolific_artist: { id: 'prolific_artist', name: 'Prolific Artist', description: 'Create 10 artworks', icon: '🖼️', category: 'art', sparkReward: 40 },

    // Physical
    sunwalker: { id: 'sunwalker', name: 'Sunwalker', description: 'Reach Sunwalker warmth tier', icon: '☀️', category: 'physical', sparkReward: 50 },

    // Mentoring
    first_lesson: { id: 'first_lesson', name: 'First Lesson', description: 'Complete a mentoring lesson', icon: '📚', category: 'mentoring', sparkReward: 15 },
    wise_mentor: { id: 'wise_mentor', name: 'Wise Mentor', description: 'Mentor 5 players', icon: '🎓', category: 'mentoring', sparkReward: 50 }
  };

  // Player achievement tracking
  var playerAchievements = new Map(); // playerId -> { unlocked: Set, counters: {} }

  function initPlayerAchievements(playerId) {
    if (!playerAchievements.has(playerId)) {
      playerAchievements.set(playerId, {
        unlocked: new Set(),
        counters: {
          npcs_talked: 0,
          zones_visited: new Set(),
          trades_completed: 0,
          items_crafted: 0,
          potions_brewed: 0,
          structures_placed: 0,
          plants_harvested: 0,
          seeds_planted: 0,
          discoveries_made: 0,
          competitions_entered: 0,
          competitions_won: 0,
          quests_completed: 0,
          artworks_created: 0,
          players_mentored: 0,
          lessons_completed: 0,
          gifts_given: 0
        }
      });
    }
    return playerAchievements.get(playerId);
  }

  /**
   * Track an event and check for newly unlocked achievements
   * @param {string} playerId
   * @param {string} eventType - e.g. 'craft', 'trade', 'visit_zone', 'talk_npc'
   * @param {Object} eventData - event-specific data
   * @returns {Array} Newly unlocked achievements
   */
  function trackAchievementEvent(playerId, eventType, eventData) {
    var state = initPlayerAchievements(playerId);
    eventData = eventData || {};

    // Update counters based on event
    switch (eventType) {
      case 'login':
        break; // first_steps checked separately
      case 'talk_npc':
        state.counters.npcs_talked++;
        break;
      case 'visit_zone':
        if (eventData.zone) state.counters.zones_visited.add(eventData.zone);
        break;
      case 'trade':
        state.counters.trades_completed++;
        break;
      case 'craft':
        state.counters.items_crafted++;
        if (eventData.category === 'potion') state.counters.potions_brewed++;
        break;
      case 'build':
        state.counters.structures_placed++;
        break;
      case 'harvest':
        state.counters.plants_harvested++;
        break;
      case 'plant':
        state.counters.seeds_planted++;
        break;
      case 'discover':
        state.counters.discoveries_made++;
        break;
      case 'competition_enter':
        state.counters.competitions_entered++;
        break;
      case 'competition_win':
        state.counters.competitions_won++;
        break;
      case 'quest_complete':
        state.counters.quests_completed++;
        break;
      case 'artwork':
        state.counters.artworks_created++;
        break;
      case 'mentor':
        state.counters.players_mentored++;
        break;
      case 'lesson':
        state.counters.lessons_completed++;
        break;
      case 'gift':
        state.counters.gifts_given++;
        break;
    }

    // Check all achievements
    var newlyUnlocked = [];
    var checks = {
      first_steps: eventType === 'login',
      zone_hopper: state.counters.zones_visited.size >= 4,
      world_traveler: state.counters.zones_visited.size >= 8,
      trailblazer: state.counters.discoveries_made >= 10,
      cartographer: state.counters.discoveries_made >= 25,
      friendly_face: state.counters.npcs_talked >= 10,
      social_butterfly: state.counters.npcs_talked >= 50,
      first_trade: state.counters.trades_completed >= 1,
      merchant_prince: state.counters.trades_completed >= 25,
      gift_giver: state.counters.gifts_given >= 1,
      first_craft: state.counters.items_crafted >= 1,
      apprentice_crafter: state.counters.items_crafted >= 10,
      master_crafter: state.counters.items_crafted >= 50,
      potion_brewer: state.counters.potions_brewed >= 10,
      instrument_maker: eventType === 'craft' && eventData.category === 'instrument',
      first_build: state.counters.structures_placed >= 1,
      architect: state.counters.structures_placed >= 10,
      city_planner: state.counters.structures_placed >= 50,
      green_thumb: state.counters.seeds_planted >= 1,
      gardener: state.counters.plants_harvested >= 20,
      botanist: state.counters.plants_harvested >= 100,
      spark_saver: eventData.spark >= 100,
      spark_hoarder: eventData.spark >= 500,
      spark_magnate: eventData.spark >= 2000,
      first_challenge: state.counters.competitions_entered >= 1,
      champion: state.counters.competitions_won >= 5,
      quest_starter: state.counters.quests_completed >= 0 && eventType === 'quest_accept',
      questmaster: state.counters.quests_completed >= 10,
      completionist: state.counters.quests_completed >= 25,
      chain_finisher: eventType === 'chain_complete',
      guild_founder: eventType === 'guild_create',
      guild_member: eventType === 'guild_join',
      first_artwork: state.counters.artworks_created >= 1,
      prolific_artist: state.counters.artworks_created >= 10,
      sunwalker: eventType === 'warmth_tier' && eventData.tier === 'Sunwalker',
      first_lesson: state.counters.lessons_completed >= 1,
      wise_mentor: state.counters.players_mentored >= 5
    };

    for (var achId in checks) {
      if (checks[achId] && !state.unlocked.has(achId) && ACHIEVEMENTS[achId]) {
        state.unlocked.add(achId);
        newlyUnlocked.push(ACHIEVEMENTS[achId]);
      }
    }

    return newlyUnlocked;
  }

  /**
   * Get all achievements with unlock status
   * @param {string} playerId
   * @returns {Array} All achievements with unlocked status
   */
  function getAchievements(playerId) {
    var state = initPlayerAchievements(playerId);
    var result = [];

    for (var achId in ACHIEVEMENTS) {
      var ach = ACHIEVEMENTS[achId];
      result.push({
        id: ach.id,
        name: ach.name,
        description: ach.description,
        icon: ach.icon,
        category: ach.category,
        sparkReward: ach.sparkReward,
        unlocked: state.unlocked.has(achId)
      });
    }

    return result;
  }

  /**
   * Get achievement progress summary
   * @param {string} playerId
   * @returns {Object} {unlocked, total, percentage, recentUnlocks}
   */
  function getAchievementProgress(playerId) {
    var state = initPlayerAchievements(playerId);
    var total = Object.keys(ACHIEVEMENTS).length;
    var unlocked = state.unlocked.size;

    return {
      unlocked: unlocked,
      total: total,
      percentage: total > 0 ? Math.round((unlocked / total) * 100) : 0,
      counters: {
        npcs_talked: state.counters.npcs_talked,
        zones_visited: state.counters.zones_visited.size,
        trades_completed: state.counters.trades_completed,
        items_crafted: state.counters.items_crafted,
        structures_placed: state.counters.structures_placed,
        quests_completed: state.counters.quests_completed,
        discoveries_made: state.counters.discoveries_made
      }
    };
  }

  // Export public API
  exports.getAvailableQuests = getAvailableQuests;
  exports.acceptQuest = acceptQuest;
  exports.updateQuestProgress = updateQuestProgress;
  exports.completeQuest = completeQuest;
  exports.getActiveQuests = getActiveQuests;
  exports.getQuestLog = getQuestLog;
  exports.getQuestDialogue = getQuestDialogue;
  exports.getNpcQuests = getNpcQuests;
  exports.abandonQuest = abandonQuest;
  exports.initPlayerQuests = initPlayerQuests;
  exports.getDailyQuests = getDailyQuests;
  exports.isDailyCompleted = isDailyCompleted;
  exports.getChainProgress = getChainProgress;
  exports.checkChainCompletion = checkChainCompletion;
  exports.getPlayerQuestStats = getPlayerQuestStats;
  exports.QUEST_CHAINS = QUEST_CHAINS;
  exports.DAILY_QUESTS = DAILY_QUESTS;
  exports.ACHIEVEMENTS = ACHIEVEMENTS;
  exports.trackAchievementEvent = trackAchievementEvent;
  exports.getAchievements = getAchievements;
  exports.getAchievementProgress = getAchievementProgress;
  exports.initPlayerAchievements = initPlayerAchievements;

})(typeof module !== 'undefined' ? module.exports : (window.Quests = {}));
