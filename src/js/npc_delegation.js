/**
 * ZION MMO - NPC Delegation System
 *
 * Players delegate tasks to NPCs while offline. NPCs execute via behavior trees.
 * Costs Spark as service fee. Tracks completion with receipts.
 */

(function(exports) {
  'use strict';

  // ---------------------------------------------------------------------------
  // DELEGATABLE_TASKS — 12 task types NPCs can perform
  // ---------------------------------------------------------------------------
  var DELEGATABLE_TASKS = [
    {
      id: 'water_garden',
      name: 'Water Garden',
      description: 'NPC tends your garden plots',
      npcArchetypes: ['gardener', 'healer'],
      baseCost: 5,
      duration: 50,
      maxDelegations: 3,
      skillRequired: null,
      output: { type: 'garden_watered', description: 'Garden quality maintained' },
      zone: 'gardens'
    },
    {
      id: 'gather_herbs',
      name: 'Gather Herbs',
      description: 'NPC collects medicinal herbs from the zone',
      npcArchetypes: ['gardener', 'healer', 'explorer'],
      baseCost: 8,
      duration: 75,
      maxDelegations: 2,
      skillRequired: null,
      output: { type: 'herbs_gathered', description: 'Medicinal herbs collected from zone' },
      zone: 'gardens'
    },
    {
      id: 'patrol_zone',
      name: 'Patrol Zone',
      description: 'NPC patrols zone perimeter to deter griefers',
      npcArchetypes: ['merchant', 'explorer'],
      baseCost: 10,
      duration: 100,
      maxDelegations: 2,
      skillRequired: null,
      output: { type: 'zone_patrolled', description: 'Zone perimeter secured' },
      zone: 'nexus'
    },
    {
      id: 'teach_skill',
      name: 'Teach Skill',
      description: 'NPC teaches a skill to waiting players',
      npcArchetypes: ['teacher', 'philosopher'],
      baseCost: 15,
      duration: 120,
      maxDelegations: 1,
      skillRequired: null,
      output: { type: 'skill_taught', description: 'Players received instruction' },
      zone: 'athenaeum'
    },
    {
      id: 'craft_basic',
      name: 'Craft Basic Item',
      description: 'NPC crafts a basic item on your behalf',
      npcArchetypes: ['builder', 'merchant'],
      baseCost: 12,
      duration: 80,
      maxDelegations: 2,
      skillRequired: null,
      output: { type: 'item_crafted', description: 'Basic item fabricated' },
      zone: 'studio'
    },
    {
      id: 'fish_spot',
      name: 'Fish a Spot',
      description: 'NPC fishes a designated spot for resources',
      npcArchetypes: ['explorer', 'healer'],
      baseCost: 7,
      duration: 60,
      maxDelegations: 3,
      skillRequired: null,
      output: { type: 'fish_caught', description: 'Fish and resources gathered' },
      zone: 'wilds'
    },
    {
      id: 'tend_crops',
      name: 'Tend Crops',
      description: 'NPC maintains crop growth and removes weeds',
      npcArchetypes: ['gardener'],
      baseCost: 6,
      duration: 65,
      maxDelegations: 3,
      skillRequired: null,
      output: { type: 'crops_tended', description: 'Crops maintained and weeded' },
      zone: 'gardens'
    },
    {
      id: 'guard_structure',
      name: 'Guard Structure',
      description: 'NPC stands guard over a player structure',
      npcArchetypes: ['builder', 'merchant'],
      baseCost: 20,
      duration: 200,
      maxDelegations: 1,
      skillRequired: null,
      output: { type: 'structure_guarded', description: 'Structure protected from harm' },
      zone: 'commons'
    },
    {
      id: 'deliver_message',
      name: 'Deliver Message',
      description: 'NPC carries a message to another player',
      npcArchetypes: ['merchant', 'explorer', 'storyteller'],
      baseCost: 4,
      duration: 40,
      maxDelegations: 5,
      skillRequired: null,
      output: { type: 'message_delivered', description: 'Message delivered to recipient' },
      zone: 'agora'
    },
    {
      id: 'scout_dungeon',
      name: 'Scout Dungeon',
      description: 'NPC scouts a dungeon and returns with a map',
      npcArchetypes: ['explorer'],
      baseCost: 25,
      duration: 150,
      maxDelegations: 1,
      skillRequired: null,
      output: { type: 'dungeon_scouted', description: 'Dungeon layout mapped' },
      zone: 'wilds'
    },
    {
      id: 'compose_song',
      name: 'Compose Song',
      description: 'NPC composes a song for your collection',
      npcArchetypes: ['musician', 'storyteller', 'artist'],
      baseCost: 18,
      duration: 110,
      maxDelegations: 2,
      skillRequired: null,
      output: { type: 'song_composed', description: 'Original song added to collection' },
      zone: 'studio'
    },
    {
      id: 'trade_goods',
      name: 'Trade Goods',
      description: 'NPC trades goods at market on your behalf',
      npcArchetypes: ['merchant'],
      baseCost: 10,
      duration: 90,
      maxDelegations: 2,
      skillRequired: null,
      output: { type: 'goods_traded', description: 'Goods sold at market rate' },
      zone: 'agora'
    }
  ];

  // ---------------------------------------------------------------------------
  // Internal counters
  // ---------------------------------------------------------------------------
  var delegationCounter = 0;

  // ---------------------------------------------------------------------------
  // Helper utilities
  // ---------------------------------------------------------------------------

  /**
   * Generate a unique delegation ID
   */
  function generateDelegationId() {
    delegationCounter++;
    return 'del_' + delegationCounter + '_' + Date.now();
  }

  /**
   * Get task definition by id
   * @param {string} taskTypeId
   * @returns {Object|null}
   */
  function getTaskById(taskTypeId) {
    for (var i = 0; i < DELEGATABLE_TASKS.length; i++) {
      if (DELEGATABLE_TASKS[i].id === taskTypeId) {
        return DELEGATABLE_TASKS[i];
      }
    }
    return null;
  }

  /**
   * Get all task types
   * @returns {Array}
   */
  function getTaskTypes() {
    return DELEGATABLE_TASKS.slice();
  }

  /**
   * Get NPC info from state by npcId
   * @param {Object} state
   * @param {string} npcId
   * @returns {Object|null}
   */
  function getNpcFromState(state, npcId) {
    if (!state || !state.npcs) return null;
    for (var i = 0; i < state.npcs.length; i++) {
      if (state.npcs[i].id === npcId) {
        return state.npcs[i];
      }
    }
    return null;
  }

  /**
   * Get player Spark balance from state
   * @param {Object} state
   * @param {string} playerId
   * @returns {number}
   */
  function getPlayerSpark(state, playerId) {
    if (!state || !state.balances) return 0;
    return state.balances[playerId] || 0;
  }

  /**
   * Deduct Spark from player balance
   * @param {Object} state
   * @param {string} playerId
   * @param {number} amount
   */
  function deductSpark(state, playerId, amount) {
    if (!state.balances) state.balances = {};
    state.balances[playerId] = (state.balances[playerId] || 0) - amount;
    if (state.balances[playerId] < 0) state.balances[playerId] = 0;
  }

  /**
   * Add Spark to player balance
   * @param {Object} state
   * @param {string} playerId
   * @param {number} amount
   */
  function addSpark(state, playerId, amount) {
    if (!state.balances) state.balances = {};
    state.balances[playerId] = (state.balances[playerId] || 0) + amount;
  }

  /**
   * Ensure delegations array exists on state
   * @param {Object} state
   */
  function ensureDelegations(state) {
    if (!state.delegations) state.delegations = [];
    if (!state.receipts) state.receipts = [];
    if (!state.npcCompletedCount) state.npcCompletedCount = {};
  }

  // ---------------------------------------------------------------------------
  // Core API
  // ---------------------------------------------------------------------------

  /**
   * Calculate delegation cost adjusted by NPC reputation (higher rep = discount)
   * @param {string} taskTypeId
   * @param {number} npcReputation - 0 to 1 scale (0 = no rep, 1 = max rep)
   * @returns {number} Final cost in Spark
   */
  function getDelegationCost(taskTypeId, npcReputation) {
    var task = getTaskById(taskTypeId);
    if (!task) return 0;
    var rep = typeof npcReputation === 'number' ? npcReputation : 0;
    // Clamp reputation to 0-1
    if (rep < 0) rep = 0;
    if (rep > 1) rep = 1;
    // Higher reputation gives up to 30% discount
    var discount = rep * 0.3;
    var cost = Math.ceil(task.baseCost * (1 - discount));
    return cost;
  }

  /**
   * Check if an NPC is currently available (not busy with another delegation)
   * @param {Object} state
   * @param {string} npcId
   * @param {number} currentTick
   * @returns {boolean}
   */
  function isNpcAvailable(state, npcId, currentTick) {
    ensureDelegations(state);
    for (var i = 0; i < state.delegations.length; i++) {
      var d = state.delegations[i];
      if (d.npcId === npcId && (d.status === 'active' || d.status === 'pending')) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get count of active delegations for a player
   * @param {Object} state
   * @param {string} playerId
   * @returns {number}
   */
  function getActiveCount(state, playerId) {
    ensureDelegations(state);
    var count = 0;
    for (var i = 0; i < state.delegations.length; i++) {
      var d = state.delegations[i];
      if (d.playerId === playerId && (d.status === 'active' || d.status === 'pending')) {
        count++;
      }
    }
    return count;
  }

  /**
   * Get maximum delegations allowed for a player
   * Default max based on the task type, or global max of 10
   * @param {Object} state
   * @param {string} playerId
   * @returns {number}
   */
  function getMaxDelegations(state, playerId) {
    // Global maximum of 10 concurrent delegations per player
    return 10;
  }

  /**
   * Get NPC efficiency based on completed tasks (higher for more experienced NPCs)
   * @param {Object} state
   * @param {string} npcId
   * @returns {number} Efficiency multiplier 1.0 to 2.0
   */
  function getNpcEfficiency(state, npcId) {
    ensureDelegations(state);
    var completed = state.npcCompletedCount[npcId] || 0;
    // Efficiency increases with experience, caps at 2.0
    // Formula: 1.0 + min(completed / 50, 1.0)
    var efficiency = 1.0 + Math.min(completed / 50, 1.0);
    return Math.round(efficiency * 100) / 100;
  }

  /**
   * Get available NPCs that can perform a task and are free
   * @param {Object} state
   * @param {string} taskTypeId
   * @param {string} zone - optional zone filter
   * @param {number} currentTick
   * @returns {Array} List of available NPC objects
   */
  function getAvailableNpcs(state, taskTypeId, zone, currentTick) {
    var task = getTaskById(taskTypeId);
    if (!task) return [];
    if (!state || !state.npcs) return [];
    ensureDelegations(state);

    var available = [];
    for (var i = 0; i < state.npcs.length; i++) {
      var npc = state.npcs[i];
      // Check archetype match
      if (task.npcArchetypes.indexOf(npc.archetype) === -1) continue;
      // Check zone match if provided
      if (zone && npc.zone && npc.zone !== zone) continue;
      // Check NPC is not busy
      if (!isNpcAvailable(state, npc.id, currentTick)) continue;
      available.push(npc);
    }
    return available;
  }

  /**
   * Delegate a task to an NPC
   * @param {Object} state
   * @param {string} playerId
   * @param {string} taskTypeId
   * @param {string} npcId
   * @param {number} currentTick
   * @returns {Object} {success, delegation, cost, reason}
   */
  function delegate(state, playerId, taskTypeId, npcId, currentTick) {
    ensureDelegations(state);

    // Validate task type
    var task = getTaskById(taskTypeId);
    if (!task) {
      return { success: false, reason: 'Unknown task type: ' + taskTypeId };
    }

    // Validate NPC exists
    var npc = getNpcFromState(state, npcId);
    if (!npc) {
      return { success: false, reason: 'NPC not found: ' + npcId };
    }

    // Check NPC archetype matches task requirements
    if (task.npcArchetypes.indexOf(npc.archetype) === -1) {
      return {
        success: false,
        reason: 'NPC archetype ' + npc.archetype + ' cannot perform task ' + taskTypeId
      };
    }

    // Check NPC is not already busy
    if (!isNpcAvailable(state, npcId, currentTick)) {
      return { success: false, reason: 'NPC is already busy with another task' };
    }

    // Check player is not at max delegations for this task type
    var activeOfType = 0;
    for (var i = 0; i < state.delegations.length; i++) {
      var d = state.delegations[i];
      if (d.playerId === playerId && d.taskType === taskTypeId &&
          (d.status === 'active' || d.status === 'pending')) {
        activeOfType++;
      }
    }
    if (activeOfType >= task.maxDelegations) {
      return {
        success: false,
        reason: 'Maximum delegations (' + task.maxDelegations + ') reached for task ' + taskTypeId
      };
    }

    // Calculate cost with NPC reputation discount
    var npcRep = npc.reputation || 0;
    var cost = getDelegationCost(taskTypeId, npcRep);

    // Check player has enough Spark
    var playerSpark = getPlayerSpark(state, playerId);
    if (playerSpark < cost) {
      return {
        success: false,
        reason: 'Insufficient Spark. Need ' + cost + ' but have ' + playerSpark
      };
    }

    // Deduct Spark
    deductSpark(state, playerId, cost);

    // Create delegation
    var delegation = {
      id: generateDelegationId(),
      taskType: taskTypeId,
      playerId: playerId,
      npcId: npcId,
      status: 'active',
      startTick: currentTick,
      endTick: currentTick + task.duration,
      cost: cost,
      result: null,
      receipt: null
    };

    state.delegations.push(delegation);

    return {
      success: true,
      delegation: delegation,
      cost: cost,
      reason: null
    };
  }

  /**
   * Cancel an active delegation. 50% Spark refund.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} delegationId
   * @returns {Object} {success, refund, reason}
   */
  function cancelDelegation(state, playerId, delegationId) {
    ensureDelegations(state);

    var delegation = null;
    for (var i = 0; i < state.delegations.length; i++) {
      if (state.delegations[i].id === delegationId) {
        delegation = state.delegations[i];
        break;
      }
    }

    if (!delegation) {
      return { success: false, refund: 0, reason: 'Delegation not found: ' + delegationId };
    }

    if (delegation.playerId !== playerId) {
      return { success: false, refund: 0, reason: 'Delegation does not belong to this player' };
    }

    if (delegation.status !== 'active' && delegation.status !== 'pending') {
      return {
        success: false,
        refund: 0,
        reason: 'Cannot cancel delegation with status: ' + delegation.status
      };
    }

    // 50% refund
    var refund = Math.floor(delegation.cost / 2);
    delegation.status = 'cancelled';
    addSpark(state, playerId, refund);

    return { success: true, refund: refund, reason: null };
  }

  /**
   * Check all active delegations and complete those past endTick
   * @param {Object} state
   * @param {number} currentTick
   * @returns {Object} {completed: [{delegationId, receipt}]}
   */
  function checkCompletion(state, currentTick) {
    ensureDelegations(state);

    var completed = [];

    for (var i = 0; i < state.delegations.length; i++) {
      var d = state.delegations[i];
      if (d.status !== 'active') continue;
      if (currentTick < d.endTick) continue;

      // Mark as completed
      d.status = 'completed';
      d.result = 'success';

      // Get NPC info for receipt
      var npc = getNpcFromState(state, d.npcId);
      var npcName = npc ? (npc.name || d.npcId) : d.npcId;
      var task = getTaskById(d.taskType);
      var taskDesc = task ? task.output.description : 'Task completed';

      // Generate receipt
      var receipt = {
        delegationId: d.id,
        npcId: d.npcId,
        npcName: npcName,
        task: d.taskType,
        completedAt: currentTick,
        outcome: 'success',
        details: taskDesc + ' at tick ' + currentTick + '.',
        itemsGathered: [],
        sparkSpent: d.cost
      };

      d.receipt = receipt;
      state.receipts.push(receipt);

      // Track NPC experience
      if (!state.npcCompletedCount[d.npcId]) {
        state.npcCompletedCount[d.npcId] = 0;
      }
      state.npcCompletedCount[d.npcId]++;

      completed.push({ delegationId: d.id, receipt: receipt });
    }

    return { completed: completed };
  }

  /**
   * Get a single delegation by ID
   * @param {Object} state
   * @param {string} delegationId
   * @returns {Object|null}
   */
  function getDelegation(state, delegationId) {
    ensureDelegations(state);
    for (var i = 0; i < state.delegations.length; i++) {
      if (state.delegations[i].id === delegationId) {
        return state.delegations[i];
      }
    }
    return null;
  }

  /**
   * Get all delegations for a player, optionally filtered by status
   * @param {Object} state
   * @param {string} playerId
   * @param {string} [status] - optional filter: 'pending', 'active', 'completed', 'failed', 'cancelled'
   * @returns {Array}
   */
  function getPlayerDelegations(state, playerId, status) {
    ensureDelegations(state);
    var results = [];
    for (var i = 0; i < state.delegations.length; i++) {
      var d = state.delegations[i];
      if (d.playerId !== playerId) continue;
      if (status && d.status !== status) continue;
      results.push(d);
    }
    return results;
  }

  /**
   * Get all delegations assigned to an NPC
   * @param {Object} state
   * @param {string} npcId
   * @returns {Array}
   */
  function getNpcDelegations(state, npcId) {
    ensureDelegations(state);
    var results = [];
    for (var i = 0; i < state.delegations.length; i++) {
      if (state.delegations[i].npcId === npcId) {
        results.push(state.delegations[i]);
      }
    }
    return results;
  }

  /**
   * Get all receipts for a player
   * @param {Object} state
   * @param {string} playerId
   * @returns {Array}
   */
  function getReceipts(state, playerId) {
    ensureDelegations(state);
    var results = [];
    for (var i = 0; i < state.receipts.length; i++) {
      var receipt = state.receipts[i];
      // Find delegation to get playerId
      var d = getDelegation(state, receipt.delegationId);
      if (d && d.playerId === playerId) {
        results.push(receipt);
      }
    }
    return results;
  }

  /**
   * Get full delegation history for a player (all statuses)
   * @param {Object} state
   * @param {string} playerId
   * @returns {Array}
   */
  function getDelegationHistory(state, playerId) {
    return getPlayerDelegations(state, playerId, null);
  }

  /**
   * Get aggregated stats for a player's delegations
   * @param {Object} state
   * @param {string} playerId
   * @returns {Object} {totalDelegated, completed, failed, cancelled, sparkSpent}
   */
  function getDelegationStats(state, playerId) {
    ensureDelegations(state);
    var totalDelegated = 0;
    var completed = 0;
    var failed = 0;
    var cancelled = 0;
    var sparkSpent = 0;

    for (var i = 0; i < state.delegations.length; i++) {
      var d = state.delegations[i];
      if (d.playerId !== playerId) continue;
      totalDelegated++;
      if (d.status === 'completed') {
        completed++;
        sparkSpent += d.cost;
      } else if (d.status === 'failed') {
        failed++;
        sparkSpent += d.cost;
      } else if (d.status === 'cancelled') {
        cancelled++;
        // Only half cost was kept (half was refunded)
        sparkSpent += Math.ceil(d.cost / 2);
      } else {
        // active or pending — count cost as spent
        sparkSpent += d.cost;
      }
    }

    return {
      totalDelegated: totalDelegated,
      completed: completed,
      failed: failed,
      cancelled: cancelled,
      sparkSpent: sparkSpent
    };
  }

  // ---------------------------------------------------------------------------
  // Exports
  // ---------------------------------------------------------------------------
  exports.DELEGATABLE_TASKS = DELEGATABLE_TASKS;

  exports.delegate = delegate;
  exports.cancelDelegation = cancelDelegation;
  exports.checkCompletion = checkCompletion;
  exports.getDelegation = getDelegation;
  exports.getPlayerDelegations = getPlayerDelegations;
  exports.getNpcDelegations = getNpcDelegations;
  exports.isNpcAvailable = isNpcAvailable;
  exports.getAvailableNpcs = getAvailableNpcs;
  exports.getTaskTypes = getTaskTypes;
  exports.getTaskById = getTaskById;
  exports.getReceipts = getReceipts;
  exports.getDelegationHistory = getDelegationHistory;
  exports.getDelegationCost = getDelegationCost;
  exports.getActiveCount = getActiveCount;
  exports.getMaxDelegations = getMaxDelegations;
  exports.getNpcEfficiency = getNpcEfficiency;
  exports.getDelegationStats = getDelegationStats;

})(typeof module !== 'undefined' ? module.exports : (window.NpcDelegation = {}));
