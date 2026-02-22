// meta_events.js — Multi-week persistent meta-events for ZION
// World bosses, community goals, phased challenges, and lasting consequences.
// No project dependencies.

(function(exports) {
  'use strict';

  // ---------------------------------------------------------------------------
  // Seeded PRNG (mulberry32)
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
  // Event Definitions
  // ---------------------------------------------------------------------------

  var EVENT_DEFINITIONS = [
    {
      id: 'rift_incursion',
      name: 'The Rift Incursion',
      description: 'Dimensional rifts are tearing through ZION. Gather intel, prepare defenses, and confront the Rift Lord.',
      phases: [
        {
          id: 'intel_gathering',
          name: 'Intelligence Gathering',
          duration: 2000,
          objective: 'Gather 500 rift fragments across all zones',
          communityGoal: 500,
          individualContributions: true,
          rewards: { spark: 20, xp: 50 }
        },
        {
          id: 'defense_prep',
          name: 'Defense Preparation',
          duration: 2000,
          objective: 'Build 50 defense structures in affected zones',
          communityGoal: 50,
          individualContributions: true,
          rewards: { spark: 30, xp: 75 }
        },
        {
          id: 'final_battle',
          name: 'The Final Battle',
          duration: 1000,
          objective: 'Defeat the Rift Lord (community boss)',
          communityGoal: 10000,
          bossId: 'rift_lord',
          rewards: { spark: 100, xp: 200 }
        }
      ],
      totalDuration: 5000,
      successOutcome: {
        description: 'The rifts are sealed. A new crystal garden appears in the Wilds.',
        worldChange: { type: 'add_landmark', zone: 'wilds', name: 'Crystal Garden' },
        globalReward: { spark: 50 }
      },
      failureOutcome: {
        description: 'The rifts persist. Dark energy corrupts the Wilds for a season.',
        worldChange: { type: 'zone_debuff', zone: 'wilds', effect: 'corruption', duration: 2000 },
        globalPenalty: { sparkEarnReduction: 0.1 }
      },
      minParticipants: 10,
      cooldown: 10000
    },
    {
      id: 'harvest_blessing',
      name: 'The Harvest Blessing',
      description: 'A legendary spirit of abundance has awakened. Cultivate sacred crops, host the Grand Feast, and earn the Blessing of Plenty.',
      phases: [
        {
          id: 'sacred_planting',
          name: 'Sacred Planting',
          duration: 2000,
          objective: 'Plant 1000 sacred seeds across the Gardens and Commons',
          communityGoal: 1000,
          individualContributions: true,
          rewards: { spark: 15, xp: 40 }
        },
        {
          id: 'grand_harvest',
          name: 'The Grand Harvest',
          duration: 2000,
          objective: 'Collect 800 units of the sacred harvest',
          communityGoal: 800,
          individualContributions: true,
          rewards: { spark: 25, xp: 60 }
        },
        {
          id: 'feast_celebration',
          name: 'Feast of Plenty',
          duration: 1000,
          objective: 'Host and attend 200 feast gatherings across all zones',
          communityGoal: 200,
          individualContributions: true,
          rewards: { spark: 80, xp: 150 }
        }
      ],
      totalDuration: 5000,
      successOutcome: {
        description: 'The Blessing of Plenty rains down. Gardens produce double yields for two seasons.',
        worldChange: { type: 'zone_buff', zone: 'gardens', effect: 'double_yield', duration: 4000 },
        globalReward: { spark: 40 }
      },
      failureOutcome: {
        description: 'The spirit departs disappointed. A mild blight reduces garden yields.',
        worldChange: { type: 'zone_debuff', zone: 'gardens', effect: 'blight', duration: 1500 },
        globalPenalty: { harvestReduction: 0.2 }
      },
      minParticipants: 8,
      cooldown: 8000
    },
    {
      id: 'ancient_awakening',
      name: 'The Ancient Awakening',
      description: 'An ancient colossus stirs beneath the Athenaeum. Scholars must decode its language, restore its memory, and decide its fate.',
      phases: [
        {
          id: 'decoding',
          name: 'Decoding the Ancient Script',
          duration: 2500,
          objective: 'Decipher 300 ancient glyphs in the Athenaeum vaults',
          communityGoal: 300,
          individualContributions: true,
          rewards: { spark: 25, xp: 60 }
        },
        {
          id: 'memory_restoration',
          name: 'Memory Restoration',
          duration: 2000,
          objective: 'Restore 150 fragments of the colossus memory core',
          communityGoal: 150,
          individualContributions: true,
          rewards: { spark: 35, xp: 80 }
        },
        {
          id: 'colossus_trial',
          name: 'Trial of the Colossus',
          duration: 1000,
          objective: 'Survive and complete the colossus trial (community boss)',
          communityGoal: 8000,
          bossId: 'ancient_colossus',
          rewards: { spark: 120, xp: 250 }
        }
      ],
      totalDuration: 5500,
      successOutcome: {
        description: 'The colossus becomes a guardian. A hidden library wing opens with rare knowledge.',
        worldChange: { type: 'add_landmark', zone: 'athenaeum', name: 'Guardian Archive' },
        globalReward: { spark: 60 }
      },
      failureOutcome: {
        description: 'The colossus rampages briefly before retreating underground. The Athenaeum suffers damage.',
        worldChange: { type: 'zone_debuff', zone: 'athenaeum', effect: 'structural_damage', duration: 2500 },
        globalPenalty: { xpReduction: 0.15 }
      },
      minParticipants: 12,
      cooldown: 12000
    },
    {
      id: 'storm_of_ages',
      name: 'The Storm of Ages',
      description: 'A cataclysmic storm born from forgotten magic gathers over ZION. Citizens must fortify, survive, and harness the storm\'s power.',
      phases: [
        {
          id: 'fortification',
          name: 'Fortification',
          duration: 2000,
          objective: 'Reinforce 100 structures across all zones before the storm hits',
          communityGoal: 100,
          individualContributions: true,
          rewards: { spark: 20, xp: 45 }
        },
        {
          id: 'storm_survival',
          name: 'Storm Survival',
          duration: 1500,
          objective: 'Keep storm damage below critical threshold (collective resilience points)',
          communityGoal: 500,
          individualContributions: true,
          rewards: { spark: 40, xp: 90 }
        },
        {
          id: 'storm_heart',
          name: 'Heart of the Storm',
          duration: 1000,
          objective: 'Defeat the Storm Elemental at the storm\'s heart',
          communityGoal: 12000,
          bossId: 'storm_elemental',
          rewards: { spark: 90, xp: 180 }
        }
      ],
      totalDuration: 4500,
      successOutcome: {
        description: 'The storm is tamed. Lightning-forged crystals scatter across the Arena and Wilds.',
        worldChange: { type: 'add_landmark', zone: 'arena', name: 'Storm Crystal Spire' },
        globalReward: { spark: 45 }
      },
      failureOutcome: {
        description: 'The storm devastates several zones. Travel between zones is restricted temporarily.',
        worldChange: { type: 'travel_restriction', zones: ['wilds', 'arena'], duration: 1000 },
        globalPenalty: { travelCostIncrease: 0.5 }
      },
      minParticipants: 15,
      cooldown: 9000
    },
    {
      id: 'festival_of_light',
      name: 'Festival of Light',
      description: 'A rare celestial alignment brings the Festival of Light. Citizens collaborate to create a luminous display that will be remembered for generations.',
      phases: [
        {
          id: 'lantern_crafting',
          name: 'Lantern Crafting',
          duration: 2000,
          objective: 'Craft 2000 luminous lanterns across all zones',
          communityGoal: 2000,
          individualContributions: true,
          rewards: { spark: 10, xp: 30 }
        },
        {
          id: 'light_weaving',
          name: 'Light Weaving',
          duration: 2000,
          objective: 'Weave 500 light patterns into the sky mosaic',
          communityGoal: 500,
          individualContributions: true,
          rewards: { spark: 20, xp: 50 }
        },
        {
          id: 'grand_illumination',
          name: 'The Grand Illumination',
          duration: 1000,
          objective: 'Simultaneously illuminate all 8 zones with coordinated light displays',
          communityGoal: 8,
          individualContributions: true,
          rewards: { spark: 75, xp: 160 }
        }
      ],
      totalDuration: 5000,
      successOutcome: {
        description: 'The Grand Illumination succeeds. A permanent aurora hangs over the Nexus as a reminder.',
        worldChange: { type: 'add_effect', zone: 'nexus', name: 'Eternal Aurora', effect: 'light_aurora' },
        globalReward: { spark: 35 }
      },
      failureOutcome: {
        description: 'The alignment passes uncelebrated. Night becomes slightly darker across all zones.',
        worldChange: { type: 'ambient_change', zones: 'all', effect: 'dim_nights', duration: 2000 },
        globalPenalty: { nightVisibilityReduction: 0.1 }
      },
      minParticipants: 5,
      cooldown: 7000
    },
    {
      id: 'the_great_migration',
      name: 'The Great Migration',
      description: 'Thousands of magical creatures begin their ancient migration route through ZION. Citizens must guide, protect, and celebrate their passage.',
      phases: [
        {
          id: 'path_clearing',
          name: 'Path Clearing',
          duration: 2000,
          objective: 'Clear and mark 400 migration path segments across all zones',
          communityGoal: 400,
          individualContributions: true,
          rewards: { spark: 18, xp: 42 }
        },
        {
          id: 'guardian_escort',
          name: 'Guardian Escort',
          duration: 2500,
          objective: 'Safely escort 600 creature groups through dangerous zones',
          communityGoal: 600,
          individualContributions: true,
          rewards: { spark: 30, xp: 70 }
        },
        {
          id: 'migration_celebration',
          name: 'Migration Celebration',
          duration: 1000,
          objective: 'Defeat the Poacher King threatening the migration',
          communityGoal: 9000,
          bossId: 'poacher_king',
          rewards: { spark: 85, xp: 170 }
        }
      ],
      totalDuration: 5500,
      successOutcome: {
        description: 'The migration succeeds. Magical creatures now visit ZION regularly, enriching all zones.',
        worldChange: { type: 'recurring_spawns', zones: 'all', creatures: 'migration_animals', frequency: 500 },
        globalReward: { spark: 40 }
      },
      failureOutcome: {
        description: 'Many creatures are lost. The Wilds grow quieter and wildlife spawns are reduced.',
        worldChange: { type: 'zone_debuff', zone: 'wilds', effect: 'creature_scarcity', duration: 3000 },
        globalPenalty: { wildlifeSpawnReduction: 0.3 }
      },
      minParticipants: 10,
      cooldown: 8500
    }
  ];

  // ---------------------------------------------------------------------------
  // World Boss Definitions
  // ---------------------------------------------------------------------------

  var WORLD_BOSSES = {
    rift_lord: {
      id: 'rift_lord',
      name: 'The Rift Lord',
      maxHealth: 10000,
      phase: 1,
      phases: 3,
      phaseThresholds: [0.66, 0.33, 0],
      attacks: ['void_blast', 'shadow_wave', 'dimension_tear'],
      damageMultiplier: 1.0
    },
    ancient_colossus: {
      id: 'ancient_colossus',
      name: 'The Ancient Colossus',
      maxHealth: 8000,
      phase: 1,
      phases: 3,
      phaseThresholds: [0.66, 0.33, 0],
      attacks: ['stone_slam', 'ancient_beam', 'earth_shatter'],
      damageMultiplier: 1.0
    },
    storm_elemental: {
      id: 'storm_elemental',
      name: 'Storm Elemental Prime',
      maxHealth: 12000,
      phase: 1,
      phases: 3,
      phaseThresholds: [0.66, 0.33, 0],
      attacks: ['lightning_strike', 'wind_cyclone', 'thunder_crash'],
      damageMultiplier: 1.0
    },
    poacher_king: {
      id: 'poacher_king',
      name: 'The Poacher King',
      maxHealth: 9000,
      phase: 1,
      phases: 3,
      phaseThresholds: [0.66, 0.33, 0],
      attacks: ['net_trap', 'poison_dart', 'beast_call'],
      damageMultiplier: 1.0
    }
  };

  // ---------------------------------------------------------------------------
  // State Factory
  // ---------------------------------------------------------------------------

  function createMetaEventsState() {
    return {
      instances: {},        // instanceId -> META_EVENT_STATE
      history: [],          // completed event records
      worldChanges: [],     // active world changes
      cooldowns: {},        // eventId -> lastCompletedTick
      instanceCounter: 0
    };
  }

  // ---------------------------------------------------------------------------
  // Internal Helpers
  // ---------------------------------------------------------------------------

  function generateInstanceId(state, eventId) {
    state.instanceCounter = (state.instanceCounter || 0) + 1;
    return 'event_instance_' + eventId + '_' + state.instanceCounter;
  }

  function getEventDef(eventId) {
    for (var i = 0; i < EVENT_DEFINITIONS.length; i++) {
      if (EVENT_DEFINITIONS[i].id === eventId) return EVENT_DEFINITIONS[i];
    }
    return null;
  }

  function cloneBossState(bossId) {
    var template = WORLD_BOSSES[bossId];
    if (!template) return null;
    return {
      id: template.id,
      name: template.name,
      maxHealth: template.maxHealth,
      currentHealth: template.maxHealth,
      phase: 1,
      phases: template.phases,
      phaseThresholds: template.phaseThresholds.slice(),
      attacks: template.attacks.slice(),
      damageMultiplier: template.damageMultiplier
    };
  }

  function computeBossPhase(boss) {
    var ratio = boss.currentHealth / boss.maxHealth;
    // Phase increases as health drops past thresholds
    // phaseThresholds: [0.66, 0.33, 0] means:
    //   health > 0.66 => phase 1
    //   health between 0.33 and 0.66 => phase 2
    //   health <= 0.33 => phase 3
    var newPhase = 1;
    for (var i = 0; i < boss.phaseThresholds.length; i++) {
      if (ratio <= boss.phaseThresholds[i]) {
        newPhase = i + 2; // threshold 0 => phase 2, threshold 1 => phase 3 ...
        // but we only track up to boss.phases
        break;
      }
    }
    // cap
    if (newPhase > boss.phases) newPhase = boss.phases;
    return newPhase;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Schedule a meta-event to begin at a future tick.
   * Returns {success, instance, reason}
   */
  function scheduleEvent(state, eventId, startTick) {
    var def = getEventDef(eventId);
    if (!def) {
      return { success: false, instance: null, reason: 'Unknown event: ' + eventId };
    }

    // Check cooldown
    if (isEventOnCooldown(state, eventId, startTick)) {
      return { success: false, instance: null, reason: 'Event ' + eventId + ' is on cooldown' };
    }

    // Check for existing active/scheduled instance
    var instances = Object.values(state.instances);
    for (var i = 0; i < instances.length; i++) {
      var inst = instances[i];
      if (inst.eventId === eventId &&
          (inst.status === 'scheduled' || inst.status === 'active')) {
        return { success: false, instance: null, reason: 'Event ' + eventId + ' is already running or scheduled' };
      }
    }

    var instanceId = generateInstanceId(state, eventId);
    var phaseProgress = [];
    for (var p = 0; p < def.phases.length; p++) {
      phaseProgress.push(0);
    }

    var instance = {
      id: instanceId,
      eventId: eventId,
      status: 'scheduled',
      currentPhase: 0,
      phaseProgress: phaseProgress,
      startTick: startTick,
      phaseStartTick: startTick,
      participants: {},
      bossState: null,
      outcome: null
    };

    state.instances[instanceId] = instance;
    return { success: true, instance: instance, reason: null };
  }

  /**
   * Activate a scheduled event.
   * Returns {success, phase, reason}
   */
  function startEvent(state, instanceId, currentTick) {
    var inst = state.instances[instanceId];
    if (!inst) {
      return { success: false, phase: null, reason: 'Instance not found: ' + instanceId };
    }
    if (inst.status !== 'scheduled') {
      return { success: false, phase: null, reason: 'Instance is not in scheduled state: ' + inst.status };
    }

    var def = getEventDef(inst.eventId);
    var phase = def.phases[0];

    inst.status = 'active';
    inst.currentPhase = 0;
    inst.phaseStartTick = currentTick;

    // Initialize boss state if first phase has a boss
    if (phase.bossId) {
      inst.bossState = cloneBossState(phase.bossId);
    }

    return { success: true, phase: phase, reason: null };
  }

  /**
   * Player contributes to current phase goal.
   * Returns {success, playerTotal, phaseProgress, phaseComplete, reason}
   */
  function contribute(state, playerId, instanceId, amount, contributionType) {
    var inst = state.instances[instanceId];
    if (!inst) {
      return { success: false, playerTotal: 0, phaseProgress: 0, phaseComplete: false, reason: 'Instance not found' };
    }
    if (inst.status !== 'active') {
      return { success: false, playerTotal: 0, phaseProgress: 0, phaseComplete: false, reason: 'Event is not active: ' + inst.status };
    }

    var def = getEventDef(inst.eventId);
    var phase = def.phases[inst.currentPhase];

    if (!phase.individualContributions) {
      return { success: false, playerTotal: 0, phaseProgress: 0, phaseComplete: false, reason: 'Phase does not accept individual contributions' };
    }

    var amt = amount > 0 ? amount : 0;

    // Register participant
    if (!inst.participants[playerId]) {
      inst.participants[playerId] = {
        contributions: 0,
        joinedAt: inst.phaseStartTick || inst.startTick,
        lastContribution: 0
      };
    }
    inst.participants[playerId].contributions += amt;
    inst.participants[playerId].lastContribution = inst.currentPhase;

    // Increment phase progress
    inst.phaseProgress[inst.currentPhase] += amt;

    var playerTotal = inst.participants[playerId].contributions;
    var phaseProgressVal = inst.phaseProgress[inst.currentPhase];
    var phaseComplete = phaseProgressVal >= phase.communityGoal;

    return {
      success: true,
      playerTotal: playerTotal,
      phaseProgress: phaseProgressVal,
      phaseComplete: phaseComplete,
      reason: null
    };
  }

  /**
   * Move to next phase when current goal is met.
   * Returns {success, newPhase, complete, reason}
   */
  function advancePhase(state, instanceId, currentTick) {
    var inst = state.instances[instanceId];
    if (!inst) {
      return { success: false, newPhase: null, complete: false, reason: 'Instance not found' };
    }
    if (inst.status !== 'active') {
      return { success: false, newPhase: null, complete: false, reason: 'Event is not active' };
    }

    var def = getEventDef(inst.eventId);
    var phase = def.phases[inst.currentPhase];

    // Check goal met
    if (inst.phaseProgress[inst.currentPhase] < phase.communityGoal) {
      return { success: false, newPhase: null, complete: false, reason: 'Phase goal not yet met' };
    }

    var nextPhaseIndex = inst.currentPhase + 1;

    // All phases done
    if (nextPhaseIndex >= def.phases.length) {
      return { success: true, newPhase: null, complete: true, reason: null };
    }

    inst.currentPhase = nextPhaseIndex;
    inst.phaseStartTick = currentTick;

    var nextPhase = def.phases[nextPhaseIndex];

    // Initialize boss if next phase has one
    if (nextPhase.bossId) {
      inst.bossState = cloneBossState(nextPhase.bossId);
    }

    return { success: true, newPhase: nextPhase, complete: false, reason: null };
  }

  /**
   * Attack world boss in boss phase.
   * Returns {success, damage, bossHealth, bossPhase, bossDefeated, reason}
   */
  function attackBoss(state, playerId, instanceId, damage, seed) {
    var inst = state.instances[instanceId];
    if (!inst) {
      return { success: false, damage: 0, bossHealth: 0, bossPhase: 0, bossDefeated: false, reason: 'Instance not found' };
    }
    if (inst.status !== 'active') {
      return { success: false, damage: 0, bossHealth: 0, bossPhase: 0, bossDefeated: false, reason: 'Event is not active' };
    }

    var def = getEventDef(inst.eventId);
    var phase = def.phases[inst.currentPhase];

    if (!phase.bossId) {
      return { success: false, damage: 0, bossHealth: 0, bossPhase: 0, bossDefeated: false, reason: 'Current phase is not a boss phase' };
    }

    if (!inst.bossState) {
      return { success: false, damage: 0, bossHealth: 0, bossPhase: 0, bossDefeated: false, reason: 'Boss state not initialized' };
    }

    // Scale damage by participant count (more participants = more damage multiplier)
    var participantCount = Object.keys(inst.participants).length;
    var scaleFactor = 1.0 + (participantCount * 0.05); // +5% per participant
    var scaledDamage = Math.floor(damage * scaleFactor);

    // Add variance using seeded PRNG
    if (seed !== undefined) {
      var rng = mulberry32(seed);
      var variance = 0.9 + rng() * 0.2; // 90-110% variance
      scaledDamage = Math.floor(scaledDamage * variance);
    }

    if (scaledDamage < 1) scaledDamage = 1;

    inst.bossState.currentHealth -= scaledDamage;
    if (inst.bossState.currentHealth < 0) inst.bossState.currentHealth = 0;

    // Update boss phase
    var newBossPhase = computeBossPhase(inst.bossState);
    inst.bossState.phase = newBossPhase;

    var bossDefeated = inst.bossState.currentHealth <= 0;

    // Also count as contribution toward phase communityGoal
    if (!inst.participants[playerId]) {
      inst.participants[playerId] = {
        contributions: 0,
        joinedAt: inst.phaseStartTick || inst.startTick,
        lastContribution: 0
      };
    }
    inst.participants[playerId].contributions += scaledDamage;
    inst.participants[playerId].lastContribution = inst.currentPhase;
    inst.phaseProgress[inst.currentPhase] += scaledDamage;

    return {
      success: true,
      damage: scaledDamage,
      bossHealth: inst.bossState.currentHealth,
      bossPhase: inst.bossState.phase,
      bossDefeated: bossDefeated,
      reason: null
    };
  }

  /**
   * Check if current phase has timed out.
   * Returns {timedOut, phaseProgress, goalMet}
   */
  function checkPhaseTimeout(state, instanceId, currentTick) {
    var inst = state.instances[instanceId];
    if (!inst) {
      return { timedOut: false, phaseProgress: 0, goalMet: false };
    }
    if (inst.status !== 'active') {
      return { timedOut: false, phaseProgress: 0, goalMet: false };
    }

    var def = getEventDef(inst.eventId);
    var phase = def.phases[inst.currentPhase];
    var elapsed = currentTick - (inst.phaseStartTick || inst.startTick);
    var progress = inst.phaseProgress[inst.currentPhase];
    var goalMet = progress >= phase.communityGoal;
    var timedOut = !goalMet && elapsed >= phase.duration;

    return { timedOut: timedOut, phaseProgress: progress, goalMet: goalMet };
  }

  /**
   * Finalize event with success or failure outcome.
   * Returns {success, outcome, worldChange, rewards, reason}
   */
  function completeEvent(state, instanceId, success) {
    var inst = state.instances[instanceId];
    if (!inst) {
      return { success: false, outcome: null, worldChange: null, rewards: null, reason: 'Instance not found' };
    }
    if (inst.status !== 'active' && inst.status !== 'scheduled') {
      return { success: false, outcome: null, worldChange: null, rewards: null, reason: 'Event is not active or scheduled: ' + inst.status };
    }

    var def = getEventDef(inst.eventId);
    var outcomeData = success ? def.successOutcome : def.failureOutcome;

    inst.status = success ? 'completed_success' : 'completed_failure';
    inst.outcome = {
      success: success,
      description: outcomeData.description,
      worldChange: outcomeData.worldChange,
      reward: success ? outcomeData.globalReward : null,
      penalty: success ? null : outcomeData.globalPenalty
    };

    // Apply world change
    if (outcomeData.worldChange) {
      state.worldChanges.push({
        instanceId: instanceId,
        eventId: inst.eventId,
        change: outcomeData.worldChange,
        appliedAt: Date.now()
      });
    }

    // Record in history
    state.history.push({
      instanceId: instanceId,
      eventId: inst.eventId,
      eventName: def.name,
      status: inst.status,
      outcome: inst.outcome,
      participants: Object.keys(inst.participants).length,
      completedAt: Date.now()
    });

    // Record cooldown tick (use startTick as proxy since we don't receive currentTick here;
    // caller should use isEventOnCooldown with appropriate tick)
    state.cooldowns[inst.eventId] = inst.startTick + def.totalDuration;

    return {
      success: true,
      outcome: inst.outcome,
      worldChange: outcomeData.worldChange,
      rewards: success ? outcomeData.globalReward : null,
      reason: null
    };
  }

  /**
   * Return full event state.
   */
  function getEventState(state, instanceId) {
    return state.instances[instanceId] || null;
  }

  /**
   * Return all active meta-events.
   */
  function getActiveEvents(state) {
    var result = [];
    var keys = Object.keys(state.instances);
    for (var i = 0; i < keys.length; i++) {
      var inst = state.instances[keys[i]];
      if (inst.status === 'active') result.push(inst);
    }
    return result;
  }

  /**
   * Return scheduled (not yet started) events.
   */
  function getScheduledEvents(state) {
    var result = [];
    var keys = Object.keys(state.instances);
    for (var i = 0; i < keys.length; i++) {
      var inst = state.instances[keys[i]];
      if (inst.status === 'scheduled') result.push(inst);
    }
    return result;
  }

  /**
   * Return player's contribution stats.
   */
  function getParticipantStats(state, instanceId, playerId) {
    var inst = state.instances[instanceId];
    if (!inst) return null;
    return inst.participants[playerId] || null;
  }

  /**
   * Return top contributors (sorted by total contributions).
   */
  function getLeaderboard(state, instanceId, count) {
    var inst = state.instances[instanceId];
    if (!inst) return [];

    var entries = [];
    var playerIds = Object.keys(inst.participants);
    for (var i = 0; i < playerIds.length; i++) {
      var pid = playerIds[i];
      entries.push({
        playerId: pid,
        contributions: inst.participants[pid].contributions,
        joinedAt: inst.participants[pid].joinedAt
      });
    }

    entries.sort(function(a, b) { return b.contributions - a.contributions; });

    var limit = (typeof count === 'number' && count > 0) ? count : entries.length;
    return entries.slice(0, limit);
  }

  /**
   * Return current phase progress details.
   */
  function getPhaseProgress(state, instanceId) {
    var inst = state.instances[instanceId];
    if (!inst) return null;

    var def = getEventDef(inst.eventId);
    var phase = def.phases[inst.currentPhase];

    return {
      phaseIndex: inst.currentPhase,
      phaseId: phase.id,
      phaseName: phase.name,
      progress: inst.phaseProgress[inst.currentPhase],
      goal: phase.communityGoal,
      percentage: Math.min(100, Math.floor((inst.phaseProgress[inst.currentPhase] / phase.communityGoal) * 100)),
      duration: phase.duration,
      isBossPhase: !!phase.bossId
    };
  }

  /**
   * Return all completed events with outcomes.
   */
  function getEventHistory(state) {
    return state.history.slice();
  }

  /**
   * Return all active world changes from completed events.
   */
  function getWorldChanges(state) {
    return state.worldChanges.slice();
  }

  /**
   * Check if event is on cooldown.
   */
  function isEventOnCooldown(state, eventId, currentTick) {
    var def = getEventDef(eventId);
    if (!def) return false;

    var lastCompletedTick = state.cooldowns[eventId];
    if (lastCompletedTick === undefined || lastCompletedTick === null) return false;

    return currentTick < lastCompletedTick + def.cooldown;
  }

  /**
   * Return all meta-event definitions.
   */
  function getEventDefinitions() {
    return EVENT_DEFINITIONS.slice();
  }

  /**
   * Return single event definition.
   */
  function getEventById(eventId) {
    return getEventDef(eventId) || null;
  }

  /**
   * Return number of unique participants.
   */
  function getTotalParticipants(state, instanceId) {
    var inst = state.instances[instanceId];
    if (!inst) return 0;
    return Object.keys(inst.participants).length;
  }

  /**
   * Return world boss state for boss phase events.
   */
  function getBossState(state, instanceId) {
    var inst = state.instances[instanceId];
    if (!inst) return null;
    return inst.bossState || null;
  }

  // ---------------------------------------------------------------------------
  // Exports
  // ---------------------------------------------------------------------------

  exports.EVENT_DEFINITIONS = EVENT_DEFINITIONS;
  exports.WORLD_BOSSES = WORLD_BOSSES;
  exports.mulberry32 = mulberry32;
  exports.createMetaEventsState = createMetaEventsState;
  exports.scheduleEvent = scheduleEvent;
  exports.startEvent = startEvent;
  exports.contribute = contribute;
  exports.advancePhase = advancePhase;
  exports.attackBoss = attackBoss;
  exports.checkPhaseTimeout = checkPhaseTimeout;
  exports.completeEvent = completeEvent;
  exports.getEventState = getEventState;
  exports.getActiveEvents = getActiveEvents;
  exports.getScheduledEvents = getScheduledEvents;
  exports.getParticipantStats = getParticipantStats;
  exports.getLeaderboard = getLeaderboard;
  exports.getPhaseProgress = getPhaseProgress;
  exports.getEventHistory = getEventHistory;
  exports.getWorldChanges = getWorldChanges;
  exports.isEventOnCooldown = isEventOnCooldown;
  exports.getEventDefinitions = getEventDefinitions;
  exports.getEventById = getEventById;
  exports.getTotalParticipants = getTotalParticipants;
  exports.getBossState = getBossState;

})(typeof module !== 'undefined' ? module.exports : (window.MetaEvents = {}));
