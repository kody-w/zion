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

})(typeof module !== 'undefined' ? module.exports : (window.Quests = {}));
