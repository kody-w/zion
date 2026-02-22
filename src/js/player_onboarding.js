/**
 * ZION Player Onboarding System
 * Tutorial checkpoint tracking, progress, hints, and returning player welcome.
 */

(function(exports) {
  'use strict';

  // ---------------------------------------------------------------------------
  // ONBOARDING STEPS — 20 ordered tutorial steps
  // ---------------------------------------------------------------------------
  var ONBOARDING_STEPS = [
    {
      id: 'welcome',
      name: 'Welcome to ZION',
      description: 'Learn the basics of your new home',
      category: 'basics',
      instruction: 'Open the HUD by pressing H',
      completionCheck: 'hud_opened',
      reward: { spark: 10, xp: 5 },
      prerequisite: null,
      order: 0,
      zone: 'nexus',
      estimatedTicks: 20,
      tip: 'The Nexus is the center of ZION — all roads lead here.'
    },
    {
      id: 'move_character',
      name: 'Take Your First Steps',
      description: 'Move your character using WASD or arrow keys',
      category: 'movement',
      instruction: 'Use W, A, S, D to walk around',
      completionCheck: 'player_moved',
      reward: { spark: 10, xp: 10 },
      prerequisite: 'welcome',
      order: 1,
      zone: 'nexus',
      estimatedTicks: 10,
      tip: 'Hold Shift to sprint. Use the mouse to look around.'
    },
    {
      id: 'visit_zone',
      name: 'Explore a New Zone',
      description: 'Travel to a zone other than the Nexus',
      category: 'exploration',
      instruction: 'Walk to any zone boundary and cross into it',
      completionCheck: 'zone_entered',
      reward: { spark: 15, xp: 15 },
      prerequisite: 'move_character',
      order: 2,
      zone: null,
      estimatedTicks: 30,
      tip: 'Each zone has a unique character. The Gardens are just to the north-east.'
    },
    {
      id: 'open_inventory',
      name: 'Check Your Inventory',
      description: 'Open your inventory to see what you\'re carrying',
      category: 'basics',
      instruction: 'Press I to open your inventory',
      completionCheck: 'inventory_opened',
      reward: { spark: 5, xp: 5 },
      prerequisite: 'visit_zone',
      order: 3,
      zone: null,
      estimatedTicks: 5,
      tip: 'Your inventory holds items, resources, and crafted goods.'
    },
    {
      id: 'talk_to_npc',
      name: 'Meet a Citizen',
      description: 'Have a conversation with an AI citizen',
      category: 'social',
      instruction: 'Walk up to a glowing citizen and press E to talk',
      completionCheck: 'npc_talked',
      reward: { spark: 20, xp: 20 },
      prerequisite: 'open_inventory',
      order: 4,
      zone: 'nexus',
      estimatedTicks: 15,
      tip: 'Citizens remember your conversations and may offer quests.'
    },
    {
      id: 'pick_up_item',
      name: 'Pick Up an Item',
      description: 'Find and collect an item from the world',
      category: 'basics',
      instruction: 'Walk over a glowing item on the ground to pick it up',
      completionCheck: 'item_picked_up',
      reward: { spark: 10, xp: 10 },
      prerequisite: 'talk_to_npc',
      order: 5,
      zone: null,
      estimatedTicks: 20,
      tip: 'Items glow with a soft light. Some are rare — keep an eye out!'
    },
    {
      id: 'craft_first_item',
      name: 'Craft Something',
      description: 'Use the crafting system to create your first item',
      category: 'crafting',
      instruction: 'Press C to open crafting, then select a recipe',
      completionCheck: 'item_crafted',
      reward: { spark: 25, xp: 25 },
      prerequisite: 'pick_up_item',
      order: 6,
      zone: 'studio',
      estimatedTicks: 40,
      tip: 'Crafting combines resources into useful items. Start with something simple.'
    },
    {
      id: 'plant_seed',
      name: 'Grow Something',
      description: 'Plant a seed in the Gardens and watch it grow',
      category: 'crafting',
      instruction: 'Go to the Gardens, equip a seed, and press F on fertile soil',
      completionCheck: 'seed_planted',
      reward: { spark: 20, xp: 20 },
      prerequisite: 'craft_first_item',
      order: 7,
      zone: 'gardens',
      estimatedTicks: 50,
      tip: 'Plants grow over several ticks. Check back later to harvest!'
    },
    {
      id: 'catch_first_fish',
      name: 'Go Fishing',
      description: 'Catch your first fish from one of ZION\'s waterways',
      category: 'exploration',
      instruction: 'Find water, equip a fishing rod, and press F',
      completionCheck: 'fish_caught',
      reward: { spark: 20, xp: 20 },
      prerequisite: 'plant_seed',
      order: 8,
      zone: 'wilds',
      estimatedTicks: 60,
      tip: 'Different fish appear at different times of day. Rare fish are worth more Spark.'
    },
    {
      id: 'join_chat',
      name: 'Join the Conversation',
      description: 'Send a message in the community chat',
      category: 'social',
      instruction: 'Press T to open chat, type a message, and press Enter',
      completionCheck: 'chat_message_sent',
      reward: { spark: 15, xp: 15 },
      prerequisite: 'catch_first_fish',
      order: 9,
      zone: null,
      estimatedTicks: 10,
      tip: 'Be kind! ZION has a constitution that protects everyone\'s dignity.'
    },
    {
      id: 'visit_3_zones',
      name: 'Become an Explorer',
      description: 'Visit at least 3 different zones in total',
      category: 'exploration',
      instruction: 'Travel to 3 distinct zones across ZION',
      completionCheck: 'visited_3_zones',
      reward: { spark: 30, xp: 30 },
      prerequisite: 'join_chat',
      order: 10,
      zone: null,
      estimatedTicks: 80,
      tip: 'ZION has 8 unique zones: Nexus, Gardens, Athenaeum, Studio, Wilds, Agora, Commons, and Arena.'
    },
    {
      id: 'complete_quest',
      name: 'Complete a Quest',
      description: 'Accept and finish your first quest from a citizen',
      category: 'social',
      instruction: 'Talk to a citizen offering a quest (! above their head) and complete it',
      completionCheck: 'quest_completed',
      reward: { spark: 40, xp: 40 },
      prerequisite: 'visit_3_zones',
      order: 11,
      zone: null,
      estimatedTicks: 100,
      tip: 'Quests reward Spark and experience. Some unlock new areas or abilities.'
    },
    {
      id: 'earn_first_spark',
      name: 'Earn Your First Spark',
      description: 'Accumulate Spark through activities and have it show in your balance',
      category: 'economy',
      instruction: 'Your Spark balance is shown in the HUD. Earn through any activity.',
      completionCheck: 'spark_earned',
      reward: { spark: 25, xp: 20 },
      prerequisite: 'complete_quest',
      order: 12,
      zone: null,
      estimatedTicks: 30,
      tip: 'Spark is ZION\'s currency. It\'s earned by contributing, not just grinding.'
    },
    {
      id: 'trade_with_player',
      name: 'Make Your First Trade',
      description: 'Trade an item or Spark with another player',
      category: 'economy',
      instruction: 'Find another player, right-click them, and select Trade',
      completionCheck: 'trade_completed',
      reward: { spark: 30, xp: 25 },
      prerequisite: 'earn_first_spark',
      order: 13,
      zone: 'agora',
      estimatedTicks: 120,
      tip: 'The Agora is the marketplace. Other players post listings you can browse.'
    },
    {
      id: 'build_structure',
      name: 'Build Something',
      description: 'Place your first building or structure in the world',
      category: 'crafting',
      instruction: 'Open the build menu with B, select a structure, and place it',
      completionCheck: 'structure_built',
      reward: { spark: 35, xp: 35 },
      prerequisite: 'trade_with_player',
      order: 14,
      zone: 'commons',
      estimatedTicks: 150,
      tip: 'Structures can be decorated, expanded, and shared with friends.'
    },
    {
      id: 'cook_meal',
      name: 'Cook a Meal',
      description: 'Use ingredients to cook a meal at a cooking station',
      category: 'crafting',
      instruction: 'Find a cooking station (campfire or kitchen), add ingredients, and cook',
      completionCheck: 'meal_cooked',
      reward: { spark: 25, xp: 30 },
      prerequisite: 'build_structure',
      order: 15,
      zone: null,
      estimatedTicks: 60,
      tip: 'Meals grant temporary buffs to your stats. Cook for other players for bonus Spark.'
    },
    {
      id: 'enter_dungeon',
      name: 'Enter the Depths',
      description: 'Find and enter one of ZION\'s procedural dungeons',
      category: 'advanced',
      instruction: 'Explore the Wilds or Arena to find dungeon entrances',
      completionCheck: 'dungeon_entered',
      reward: { spark: 50, xp: 50 },
      prerequisite: 'cook_meal',
      order: 16,
      zone: 'arena',
      estimatedTicks: 200,
      tip: 'Dungeons are dangerous but rewarding. Bring a friend or come well-equipped.'
    },
    {
      id: 'join_guild',
      name: 'Find Your People',
      description: 'Join or create a guild to collaborate with other players',
      category: 'social',
      instruction: 'Open the Guild panel (G) and apply to or create a guild',
      completionCheck: 'guild_joined',
      reward: { spark: 40, xp: 40 },
      prerequisite: 'enter_dungeon',
      order: 17,
      zone: null,
      estimatedTicks: 100,
      tip: 'Guilds unlock shared housing, cooperative quests, and guild-only events.'
    },
    {
      id: 'customize_appearance',
      name: 'Make It Yours',
      description: 'Customize your character\'s appearance',
      category: 'advanced',
      instruction: 'Open the Appearance panel (O) and change your look',
      completionCheck: 'appearance_customized',
      reward: { spark: 20, xp: 15 },
      prerequisite: 'join_guild',
      order: 18,
      zone: null,
      estimatedTicks: 30,
      tip: 'Cosmetics are earned through gameplay, never purchased. Show off your achievements!'
    },
    {
      id: 'complete_onboarding',
      name: 'Citizen of ZION',
      description: 'You\'ve completed the full onboarding journey. Welcome home.',
      category: 'advanced',
      instruction: 'You\'ve done it! ZION is now yours to explore freely.',
      completionCheck: 'onboarding_finished',
      reward: { spark: 100, xp: 100 },
      prerequisite: 'customize_appearance',
      order: 19,
      zone: 'nexus',
      estimatedTicks: 10,
      tip: 'The adventure never ends. New content, events, and citizens appear every day.'
    }
  ];

  // ---------------------------------------------------------------------------
  // Category hints — fallback hints by category
  // ---------------------------------------------------------------------------
  var CATEGORY_HINTS = {
    basics: 'Press H to toggle the HUD and see all available actions.',
    movement: 'WASD to move, mouse to look, Shift to sprint.',
    social: 'Citizens are always happy to chat. Try approaching one!',
    economy: 'Spark is earned through contribution, not time spent grinding.',
    crafting: 'Combine resources in your inventory or at a crafting station.',
    exploration: 'Each zone has hidden secrets and rare resources.',
    advanced: 'You have come far. ZION\'s deepest features await you.'
  };

  // ---------------------------------------------------------------------------
  // Welcome-back message templates
  // ---------------------------------------------------------------------------
  var WELCOME_BACK_MESSAGES = [
    'Welcome back, {name}! ZION has missed you.',
    'Great to see you again, {name}. Pick up where you left off.',
    '{name} returns! Your progress has been saved.',
    'The citizens of ZION welcome back {name}!',
    'Ready to continue your adventure, {name}?'
  ];

  // ---------------------------------------------------------------------------
  // Internal: step index map for fast lookup
  // ---------------------------------------------------------------------------
  var _stepById = {};
  for (var _i = 0; _i < ONBOARDING_STEPS.length; _i++) {
    _stepById[ONBOARDING_STEPS[_i].id] = ONBOARDING_STEPS[_i];
  }

  // ---------------------------------------------------------------------------
  // Internal: ensure player state exists
  // ---------------------------------------------------------------------------
  function _ensurePlayer(state, playerId) {
    if (!state.players) {
      state.players = {};
    }
  }

  function _getPlayerState(state, playerId) {
    if (!state.players) { state.players = {}; }
    return state.players[playerId] || null;
  }

  // ---------------------------------------------------------------------------
  // Internal: get all steps not yet completed/skipped
  // ---------------------------------------------------------------------------
  function _getRemainingSteps(playerState) {
    var done = {};
    var i;
    for (i = 0; i < playerState.completedSteps.length; i++) {
      done[playerState.completedSteps[i]] = true;
    }
    for (i = 0; i < playerState.skippedSteps.length; i++) {
      done[playerState.skippedSteps[i]] = true;
    }
    var remaining = [];
    for (i = 0; i < ONBOARDING_STEPS.length; i++) {
      if (!done[ONBOARDING_STEPS[i].id]) {
        remaining.push(ONBOARDING_STEPS[i]);
      }
    }
    return remaining;
  }

  // ---------------------------------------------------------------------------
  // initOnboarding(state, playerId, currentTick)
  // ---------------------------------------------------------------------------
  function initOnboarding(state, playerId, currentTick) {
    _ensurePlayer(state, playerId);
    if (state.players[playerId]) {
      // Already initialized — idempotent
      return state.players[playerId];
    }
    state.players[playerId] = {
      playerId: playerId,
      currentStep: 0,
      completedSteps: [],
      skippedSteps: [],
      startedAt: currentTick || 0,
      completedAt: null,
      totalRewards: { spark: 0, xp: 0 },
      hints: { shown: 0, dismissed: 0 },
      returnVisits: 0
    };
    return state.players[playerId];
  }

  // ---------------------------------------------------------------------------
  // completeStep(state, playerId, stepId, currentTick)
  // ---------------------------------------------------------------------------
  function completeStep(state, playerId, stepId, currentTick) {
    var ps = _getPlayerState(state, playerId);
    if (!ps) {
      return { success: false, reason: 'Player not initialized' };
    }
    var step = _stepById[stepId];
    if (!step) {
      return { success: false, reason: 'Unknown step: ' + stepId };
    }
    // Already completed
    var i;
    for (i = 0; i < ps.completedSteps.length; i++) {
      if (ps.completedSteps[i] === stepId) {
        return { success: false, reason: 'Step already completed' };
      }
    }
    // Award reward
    var reward = { spark: step.reward.spark, xp: step.reward.xp };
    ps.totalRewards.spark += reward.spark;
    ps.totalRewards.xp += reward.xp;
    // Mark completed
    ps.completedSteps.push(stepId);
    // Remove from skipped if it was there
    var newSkipped = [];
    for (i = 0; i < ps.skippedSteps.length; i++) {
      if (ps.skippedSteps[i] !== stepId) {
        newSkipped.push(ps.skippedSteps[i]);
      }
    }
    ps.skippedSteps = newSkipped;
    // Advance currentStep index
    var doneSet = {};
    for (i = 0; i < ps.completedSteps.length; i++) { doneSet[ps.completedSteps[i]] = true; }
    for (i = 0; i < ps.skippedSteps.length; i++) { doneSet[ps.skippedSteps[i]] = true; }
    // Find next incomplete step by order
    var nextStep = null;
    for (i = 0; i < ONBOARDING_STEPS.length; i++) {
      if (!doneSet[ONBOARDING_STEPS[i].id]) {
        nextStep = ONBOARDING_STEPS[i];
        ps.currentStep = ONBOARDING_STEPS[i].order;
        break;
      }
    }
    // Check if all steps done
    var allDone = true;
    for (i = 0; i < ONBOARDING_STEPS.length; i++) {
      if (!doneSet[ONBOARDING_STEPS[i].id]) {
        allDone = false;
        break;
      }
    }
    var onboardingComplete = false;
    if (allDone) {
      onboardingComplete = true;
      ps.completedAt = currentTick || 0;
      ps.currentStep = ONBOARDING_STEPS.length;
    }
    return {
      success: true,
      reward: reward,
      nextStep: nextStep,
      onboardingComplete: onboardingComplete
    };
  }

  // ---------------------------------------------------------------------------
  // skipStep(state, playerId, stepId)
  // ---------------------------------------------------------------------------
  function skipStep(state, playerId, stepId) {
    var ps = _getPlayerState(state, playerId);
    if (!ps) {
      return { success: false, reason: 'Player not initialized' };
    }
    var step = _stepById[stepId];
    if (!step) {
      return { success: false, reason: 'Unknown step: ' + stepId };
    }
    // Already completed — no-op
    var i;
    for (i = 0; i < ps.completedSteps.length; i++) {
      if (ps.completedSteps[i] === stepId) {
        return { success: false, reason: 'Step already completed, cannot skip' };
      }
    }
    // Already skipped — idempotent
    for (i = 0; i < ps.skippedSteps.length; i++) {
      if (ps.skippedSteps[i] === stepId) {
        return { success: true, alreadySkipped: true };
      }
    }
    ps.skippedSteps.push(stepId);
    // Advance current step
    var doneSet = {};
    for (i = 0; i < ps.completedSteps.length; i++) { doneSet[ps.completedSteps[i]] = true; }
    for (i = 0; i < ps.skippedSteps.length; i++) { doneSet[ps.skippedSteps[i]] = true; }
    for (i = 0; i < ONBOARDING_STEPS.length; i++) {
      if (!doneSet[ONBOARDING_STEPS[i].id]) {
        ps.currentStep = ONBOARDING_STEPS[i].order;
        break;
      }
    }
    return { success: true, skipped: stepId };
  }

  // ---------------------------------------------------------------------------
  // getCurrentStep(state, playerId)
  // ---------------------------------------------------------------------------
  function getCurrentStep(state, playerId) {
    var ps = _getPlayerState(state, playerId);
    if (!ps) { return null; }
    if (isOnboardingComplete(state, playerId)) {
      return null;
    }
    var doneSet = {};
    var i;
    for (i = 0; i < ps.completedSteps.length; i++) { doneSet[ps.completedSteps[i]] = true; }
    for (i = 0; i < ps.skippedSteps.length; i++) { doneSet[ps.skippedSteps[i]] = true; }
    for (i = 0; i < ONBOARDING_STEPS.length; i++) {
      if (!doneSet[ONBOARDING_STEPS[i].id]) {
        return ONBOARDING_STEPS[i];
      }
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // getProgress(state, playerId)
  // ---------------------------------------------------------------------------
  function getProgress(state, playerId) {
    var ps = _getPlayerState(state, playerId);
    if (!ps) {
      return { currentStep: 0, completed: 0, total: ONBOARDING_STEPS.length, percent: 0, estimatedTimeRemaining: 0 };
    }
    var total = ONBOARDING_STEPS.length;
    var completed = ps.completedSteps.length;
    var percent = Math.round((completed / total) * 100);
    // Estimate remaining ticks
    var i;
    var doneSet = {};
    for (i = 0; i < ps.completedSteps.length; i++) { doneSet[ps.completedSteps[i]] = true; }
    for (i = 0; i < ps.skippedSteps.length; i++) { doneSet[ps.skippedSteps[i]] = true; }
    var estimatedTimeRemaining = 0;
    for (i = 0; i < ONBOARDING_STEPS.length; i++) {
      if (!doneSet[ONBOARDING_STEPS[i].id]) {
        estimatedTimeRemaining += ONBOARDING_STEPS[i].estimatedTicks;
      }
    }
    return {
      currentStep: ps.currentStep,
      completed: completed,
      total: total,
      percent: percent,
      estimatedTimeRemaining: estimatedTimeRemaining
    };
  }

  // ---------------------------------------------------------------------------
  // getCompletedSteps(state, playerId)
  // ---------------------------------------------------------------------------
  function getCompletedSteps(state, playerId) {
    var ps = _getPlayerState(state, playerId);
    if (!ps) { return []; }
    var result = [];
    for (var i = 0; i < ps.completedSteps.length; i++) {
      var step = _stepById[ps.completedSteps[i]];
      if (step) { result.push(step); }
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // getNextSteps(state, playerId, count)
  // ---------------------------------------------------------------------------
  function getNextSteps(state, playerId, count) {
    var ps = _getPlayerState(state, playerId);
    if (!ps) { return []; }
    var n = count || 3;
    var doneSet = {};
    var i;
    for (i = 0; i < ps.completedSteps.length; i++) { doneSet[ps.completedSteps[i]] = true; }
    for (i = 0; i < ps.skippedSteps.length; i++) { doneSet[ps.skippedSteps[i]] = true; }
    var result = [];
    for (i = 0; i < ONBOARDING_STEPS.length && result.length < n; i++) {
      if (!doneSet[ONBOARDING_STEPS[i].id]) {
        result.push(ONBOARDING_STEPS[i]);
      }
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // getHint(state, playerId, stepId)
  // ---------------------------------------------------------------------------
  function getHint(state, playerId, stepId) {
    var ps = _getPlayerState(state, playerId);
    if (!ps) { return null; }
    var targetStepId = stepId;
    if (!targetStepId) {
      var current = getCurrentStep(state, playerId);
      if (!current) { return null; }
      targetStepId = current.id;
    }
    var step = _stepById[targetStepId];
    if (!step) { return null; }
    ps.hints.shown++;
    return {
      stepId: targetStepId,
      instruction: step.instruction,
      tip: step.tip,
      zone: step.zone,
      categoryHint: CATEGORY_HINTS[step.category] || null
    };
  }

  // ---------------------------------------------------------------------------
  // dismissHint(state, playerId)
  // ---------------------------------------------------------------------------
  function dismissHint(state, playerId) {
    var ps = _getPlayerState(state, playerId);
    if (!ps) { return false; }
    ps.hints.dismissed++;
    return true;
  }

  // ---------------------------------------------------------------------------
  // isOnboardingComplete(state, playerId)
  // ---------------------------------------------------------------------------
  function isOnboardingComplete(state, playerId) {
    var ps = _getPlayerState(state, playerId);
    if (!ps) { return false; }
    if (ps.completedAt !== null) { return true; }
    var doneSet = {};
    var i;
    for (i = 0; i < ps.completedSteps.length; i++) { doneSet[ps.completedSteps[i]] = true; }
    for (i = 0; i < ps.skippedSteps.length; i++) { doneSet[ps.skippedSteps[i]] = true; }
    for (i = 0; i < ONBOARDING_STEPS.length; i++) {
      if (!doneSet[ONBOARDING_STEPS[i].id]) { return false; }
    }
    return true;
  }

  // ---------------------------------------------------------------------------
  // getRewardsEarned(state, playerId)
  // ---------------------------------------------------------------------------
  function getRewardsEarned(state, playerId) {
    var ps = _getPlayerState(state, playerId);
    if (!ps) { return { spark: 0, xp: 0 }; }
    return { spark: ps.totalRewards.spark, xp: ps.totalRewards.xp };
  }

  // ---------------------------------------------------------------------------
  // resetOnboarding(state, playerId, currentTick)
  // ---------------------------------------------------------------------------
  function resetOnboarding(state, playerId, currentTick) {
    _ensurePlayer(state, playerId);
    state.players[playerId] = {
      playerId: playerId,
      currentStep: 0,
      completedSteps: [],
      skippedSteps: [],
      startedAt: currentTick || 0,
      completedAt: null,
      totalRewards: { spark: 0, xp: 0 },
      hints: { shown: 0, dismissed: 0 },
      returnVisits: 0
    };
    return state.players[playerId];
  }

  // ---------------------------------------------------------------------------
  // recordReturn(state, playerId, currentTick)
  // ---------------------------------------------------------------------------
  function recordReturn(state, playerId, currentTick) {
    var ps = _getPlayerState(state, playerId);
    if (!ps) { return null; }
    ps.returnVisits++;
    ps.lastReturnAt = currentTick || 0;
    return {
      returnVisits: ps.returnVisits,
      message: getWelcomeBackMessage(state, playerId)
    };
  }

  // ---------------------------------------------------------------------------
  // getWelcomeBackMessage(state, playerId)
  // ---------------------------------------------------------------------------
  function getWelcomeBackMessage(state, playerId) {
    var ps = _getPlayerState(state, playerId);
    if (!ps) { return 'Welcome back to ZION!'; }
    var nameStr = playerId;
    var template = WELCOME_BACK_MESSAGES[ps.returnVisits % WELCOME_BACK_MESSAGES.length];
    var message = template.replace('{name}', nameStr);
    // Add progress context
    var progress = getProgress(state, playerId);
    if (progress.percent === 100) {
      message += ' You\'ve mastered the basics — keep exploring!';
    } else if (progress.percent > 50) {
      message += ' You\'re more than halfway through your journey.';
    } else if (progress.percent > 0) {
      message += ' You\'re making great progress in ZION.';
    } else {
      message += ' Your adventure is just beginning!';
    }
    return message;
  }

  // ---------------------------------------------------------------------------
  // getStepsByCategory(category)
  // ---------------------------------------------------------------------------
  function getStepsByCategory(category) {
    var result = [];
    for (var i = 0; i < ONBOARDING_STEPS.length; i++) {
      if (ONBOARDING_STEPS[i].category === category) {
        result.push(ONBOARDING_STEPS[i]);
      }
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // getAllSteps()
  // ---------------------------------------------------------------------------
  function getAllSteps() {
    return ONBOARDING_STEPS.slice();
  }

  // ---------------------------------------------------------------------------
  // getSuggestedActions(state, playerId)
  // ---------------------------------------------------------------------------
  function getSuggestedActions(state, playerId) {
    var ps = _getPlayerState(state, playerId);
    if (!ps) { return []; }
    return getNextSteps(state, playerId, 3);
  }

  // ---------------------------------------------------------------------------
  // getOnboardingStats(state)
  // ---------------------------------------------------------------------------
  function getOnboardingStats(state) {
    if (!state.players) {
      return { totalPlayers: 0, completedPlayers: 0, completionRate: 0, avgTimeToComplete: 0, mostSkippedStep: null };
    }
    var playerIds = Object.keys(state.players);
    var totalPlayers = playerIds.length;
    var completedPlayers = 0;
    var completionTimes = [];
    var skipCounts = {};
    var i, j, ps;
    // Initialize skip counts
    for (i = 0; i < ONBOARDING_STEPS.length; i++) {
      skipCounts[ONBOARDING_STEPS[i].id] = 0;
    }
    for (i = 0; i < playerIds.length; i++) {
      ps = state.players[playerIds[i]];
      if (isOnboardingComplete(state, playerIds[i])) {
        completedPlayers++;
        if (ps.completedAt !== null && ps.startedAt !== null) {
          completionTimes.push(ps.completedAt - ps.startedAt);
        }
      }
      for (j = 0; j < ps.skippedSteps.length; j++) {
        if (skipCounts[ps.skippedSteps[j]] !== undefined) {
          skipCounts[ps.skippedSteps[j]]++;
        }
      }
    }
    var completionRate = totalPlayers > 0 ? Math.round((completedPlayers / totalPlayers) * 100) : 0;
    var avgTimeToComplete = 0;
    if (completionTimes.length > 0) {
      var sum = 0;
      for (i = 0; i < completionTimes.length; i++) { sum += completionTimes[i]; }
      avgTimeToComplete = Math.round(sum / completionTimes.length);
    }
    // Most skipped step
    var mostSkippedStep = null;
    var maxSkips = 0;
    var stepIds = Object.keys(skipCounts);
    for (i = 0; i < stepIds.length; i++) {
      if (skipCounts[stepIds[i]] > maxSkips) {
        maxSkips = skipCounts[stepIds[i]];
        mostSkippedStep = stepIds[i];
      }
    }
    return {
      totalPlayers: totalPlayers,
      completedPlayers: completedPlayers,
      completionRate: completionRate,
      avgTimeToComplete: avgTimeToComplete,
      mostSkippedStep: mostSkippedStep
    };
  }

  // ---------------------------------------------------------------------------
  // getStepById(stepId)
  // ---------------------------------------------------------------------------
  function getStepById(stepId) {
    return _stepById[stepId] || null;
  }

  // ---------------------------------------------------------------------------
  // Exports
  // ---------------------------------------------------------------------------
  exports.ONBOARDING_STEPS = ONBOARDING_STEPS;
  exports.initOnboarding = initOnboarding;
  exports.completeStep = completeStep;
  exports.skipStep = skipStep;
  exports.getCurrentStep = getCurrentStep;
  exports.getProgress = getProgress;
  exports.getCompletedSteps = getCompletedSteps;
  exports.getNextSteps = getNextSteps;
  exports.getHint = getHint;
  exports.dismissHint = dismissHint;
  exports.isOnboardingComplete = isOnboardingComplete;
  exports.getRewardsEarned = getRewardsEarned;
  exports.resetOnboarding = resetOnboarding;
  exports.recordReturn = recordReturn;
  exports.getWelcomeBackMessage = getWelcomeBackMessage;
  exports.getStepsByCategory = getStepsByCategory;
  exports.getAllSteps = getAllSteps;
  exports.getSuggestedActions = getSuggestedActions;
  exports.getOnboardingStats = getOnboardingStats;
  exports.getStepById = getStepById;

})(typeof module !== 'undefined' ? module.exports : (window.PlayerOnboarding = {}));
