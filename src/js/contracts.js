// contracts.js
/**
 * ZION Contracts System — Guild-Level Trade Agreements
 * Supply contracts, exclusive trade routes, resource monopolies.
 * Governance-voted and enforceable with reputation penalties for breach.
 */

(function(exports) {
  'use strict';

  // ---------------------------------------------------------------------------
  // CONTRACT TYPE DEFINITIONS
  // ---------------------------------------------------------------------------

  var CONTRACT_TYPES = [
    {
      id: 'supply_agreement',
      name: 'Supply Agreement',
      description: 'Recurring delivery of goods at fixed price',
      minDuration: 100,
      maxDuration: 5000,
      requiresVote: true,
      voteThreshold: 0.6,
      breachPenalty: { reputation: -20, spark: 200 },
      maxPerGuild: 3
    },
    {
      id: 'trade_route',
      name: 'Trade Route',
      description: 'Establishes discounted trade corridor between two guilds',
      minDuration: 200,
      maxDuration: 10000,
      requiresVote: true,
      voteThreshold: 0.6,
      breachPenalty: { reputation: -15, spark: 100 },
      maxPerGuild: 5
    },
    {
      id: 'exclusive_deal',
      name: 'Exclusive Deal',
      description: 'Exclusive supply relationship; neither party may trade item with others',
      minDuration: 300,
      maxDuration: 8000,
      requiresVote: true,
      voteThreshold: 0.75,
      breachPenalty: { reputation: -30, spark: 400 },
      maxPerGuild: 2
    },
    {
      id: 'resource_monopoly',
      name: 'Resource Monopoly',
      description: 'Claim dominant control over a resource supply chain',
      minDuration: 500,
      maxDuration: 10000,
      requiresVote: true,
      voteThreshold: 0.8,
      breachPenalty: { reputation: -40, spark: 600 },
      maxPerGuild: 1
    },
    {
      id: 'protection_pact',
      name: 'Protection Pact',
      description: 'Mutual defence agreement; breach triggers diplomatic penalties',
      minDuration: 100,
      maxDuration: 10000,
      requiresVote: false,
      voteThreshold: 0.5,
      breachPenalty: { reputation: -25, spark: 150 },
      maxPerGuild: 4
    }
  ];

  // ---------------------------------------------------------------------------
  // INTERNAL COUNTER
  // ---------------------------------------------------------------------------

  var contractCounter = 0;
  var routeCounter = 0;

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Look up a contract type definition by id.
   * @param {string} typeId
   * @returns {object|null}
   */
  function findContractType(typeId) {
    for (var i = 0; i < CONTRACT_TYPES.length; i++) {
      if (CONTRACT_TYPES[i].id === typeId) return CONTRACT_TYPES[i];
    }
    return null;
  }

  /**
   * Count active contracts of a given type for a guild (either party).
   * @param {object} state
   * @param {string} guildId
   * @param {string} typeId
   * @returns {number}
   */
  function countActiveContractsOfType(state, guildId, typeId) {
    var count = 0;
    var contracts = state.contracts || [];
    for (var i = 0; i < contracts.length; i++) {
      var c = contracts[i];
      if (c.type === typeId &&
          (c.partyA === guildId || c.partyB === guildId) &&
          (c.status === 'active' || c.status === 'proposed' || c.status === 'voting')) {
        count++;
      }
    }
    return count;
  }

  /**
   * Ensure state has required arrays.
   * @param {object} state
   */
  function ensureState(state) {
    if (!state.contracts) state.contracts = [];
    if (!state.tradeRoutes) state.tradeRoutes = [];
    if (!state.reputationPenalties) state.reputationPenalties = {};
  }

  // ---------------------------------------------------------------------------
  // PUBLIC API
  // ---------------------------------------------------------------------------

  /**
   * Propose a new contract between two guilds.
   * @param {object} state        - World/guild state (mutated)
   * @param {string} proposerGuildId
   * @param {string} targetGuildId
   * @param {string} contractType - One of the CONTRACT_TYPES ids
   * @param {object} terms        - Contract-specific terms
   * @param {number} currentTick
   * @returns {{ success: boolean, contract?: object, reason?: string }}
   */
  function proposeContract(state, proposerGuildId, targetGuildId, contractType, terms, currentTick) {
    ensureState(state);

    if (!proposerGuildId || !targetGuildId) {
      return { success: false, reason: 'Both guild IDs are required' };
    }

    if (proposerGuildId === targetGuildId) {
      return { success: false, reason: 'A guild cannot contract with itself' };
    }

    var typeDef = findContractType(contractType);
    if (!typeDef) {
      return { success: false, reason: 'Unknown contract type: ' + contractType };
    }

    // Duration validation
    var duration = (terms && terms.duration) ? terms.duration : 0;
    if (duration < typeDef.minDuration) {
      return { success: false, reason: 'Duration ' + duration + ' is below minimum ' + typeDef.minDuration };
    }
    if (duration > typeDef.maxDuration) {
      return { success: false, reason: 'Duration ' + duration + ' exceeds maximum ' + typeDef.maxDuration };
    }

    // maxPerGuild check for proposer
    var activeForProposer = countActiveContractsOfType(state, proposerGuildId, contractType);
    if (activeForProposer >= typeDef.maxPerGuild) {
      return {
        success: false,
        reason: proposerGuildId + ' already has ' + activeForProposer + ' active ' + contractType + ' contracts (max ' + typeDef.maxPerGuild + ')'
      };
    }

    // maxPerGuild check for target
    var activeForTarget = countActiveContractsOfType(state, targetGuildId, contractType);
    if (activeForTarget >= typeDef.maxPerGuild) {
      return {
        success: false,
        reason: targetGuildId + ' already has ' + activeForTarget + ' active ' + contractType + ' contracts (max ' + typeDef.maxPerGuild + ')'
      };
    }

    var contractId = 'contract_' + (++contractCounter) + '_' + currentTick;

    var initialStatus = typeDef.requiresVote ? 'voting' : 'proposed';

    var contract = {
      id: contractId,
      type: contractType,
      partyA: proposerGuildId,
      partyB: targetGuildId,
      status: initialStatus,
      terms: terms || {},
      deliveriesMade: 0,
      createdAt: currentTick,
      expiresAt: currentTick + duration,
      votes: {
        partyA: { yes: 0, no: 0, voted: [] },
        partyB: { yes: 0, no: 0, voted: [] }
      },
      lastDelivery: 0,
      breachReason: null,
      breachedBy: null,
      completedAt: null
    };

    state.contracts.push(contract);

    return { success: true, contract: contract };
  }

  /**
   * Record a guild member's vote on a contract.
   * @param {object} state
   * @param {string} playerId
   * @param {string} contractId
   * @param {string} guildId     - Which guild this player represents
   * @param {boolean} vote       - true = yes, false = no
   * @returns {{ success: boolean, currentVotes?: object, approved?: boolean|null, reason?: string }}
   */
  function voteOnContract(state, playerId, contractId, guildId, vote) {
    ensureState(state);

    var contract = getContractById(state, contractId);
    if (!contract) {
      return { success: false, reason: 'Contract not found: ' + contractId };
    }

    if (contract.status !== 'voting' && contract.status !== 'proposed') {
      return { success: false, reason: 'Contract is not open for voting (status: ' + contract.status + ')' };
    }

    // Determine which side
    var side = null;
    if (contract.partyA === guildId) side = 'partyA';
    else if (contract.partyB === guildId) side = 'partyB';

    if (!side) {
      return { success: false, reason: guildId + ' is not a party to contract ' + contractId };
    }

    var sideVotes = contract.votes[side];
    if (sideVotes.voted.indexOf(playerId) !== -1) {
      return { success: false, reason: playerId + ' has already voted on this contract' };
    }

    sideVotes.voted.push(playerId);
    if (vote) {
      sideVotes.yes++;
    } else {
      sideVotes.no++;
    }

    // Calculate approval for each side
    var typeDef = findContractType(contract.type);
    var threshold = typeDef ? typeDef.voteThreshold : 0.6;

    var approved = null;
    var partyATotal = contract.votes.partyA.yes + contract.votes.partyA.no;
    var partyBTotal = contract.votes.partyB.yes + contract.votes.partyB.no;

    if (partyATotal > 0 && partyBTotal > 0) {
      var partyARate = partyATotal > 0 ? contract.votes.partyA.yes / partyATotal : 0;
      var partyBRate = partyBTotal > 0 ? contract.votes.partyB.yes / partyBTotal : 0;
      if (partyARate >= threshold && partyBRate >= threshold) {
        approved = true;
      } else if (
        (partyARate < threshold && partyATotal > 0 && contract.votes.partyA.no > partyATotal * (1 - threshold)) ||
        (partyBRate < threshold && partyBTotal > 0 && contract.votes.partyB.no > partyBTotal * (1 - threshold))
      ) {
        approved = false;
      }
    }

    return {
      success: true,
      currentVotes: { partyA: contract.votes.partyA, partyB: contract.votes.partyB },
      approved: approved
    };
  }

  /**
   * Activate a contract after both guilds have approved it.
   * @param {object} state
   * @param {string} contractId
   * @param {number} currentTick
   * @returns {{ success: boolean, reason?: string }}
   */
  function activateContract(state, contractId, currentTick) {
    ensureState(state);

    var contract = getContractById(state, contractId);
    if (!contract) {
      return { success: false, reason: 'Contract not found: ' + contractId };
    }

    if (contract.status === 'active') {
      return { success: false, reason: 'Contract is already active' };
    }

    if (contract.status !== 'voting' && contract.status !== 'proposed') {
      return { success: false, reason: 'Cannot activate contract with status: ' + contract.status };
    }

    var typeDef = findContractType(contract.type);
    var threshold = typeDef ? typeDef.voteThreshold : 0.6;

    if (typeDef && typeDef.requiresVote) {
      var partyATotal = contract.votes.partyA.yes + contract.votes.partyA.no;
      var partyBTotal = contract.votes.partyB.yes + contract.votes.partyB.no;

      if (partyATotal === 0 || partyBTotal === 0) {
        return { success: false, reason: 'Both guilds must vote before activation' };
      }

      var partyARate = contract.votes.partyA.yes / partyATotal;
      var partyBRate = contract.votes.partyB.yes / partyBTotal;

      if (partyARate < threshold) {
        return { success: false, reason: 'Party A vote approval ' + (partyARate * 100).toFixed(1) + '% is below threshold ' + (threshold * 100) + '%' };
      }
      if (partyBRate < threshold) {
        return { success: false, reason: 'Party B vote approval ' + (partyBRate * 100).toFixed(1) + '% is below threshold ' + (threshold * 100) + '%' };
      }
    }

    contract.status = 'active';

    // For trade_route type, create a route entry
    if (contract.type === 'trade_route') {
      var discount = (contract.terms && contract.terms.discount) ? contract.terms.discount : 0.05;
      var route = {
        id: 'route_' + (++routeCounter) + '_' + currentTick,
        guildA: contract.partyA,
        guildB: contract.partyB,
        discount: discount,
        startTick: currentTick,
        endTick: contract.expiresAt,
        volumeTraded: 0,
        contractId: contractId
      };
      state.tradeRoutes.push(route);
    }

    return { success: true };
  }

  /**
   * Record a delivery for a supply agreement contract.
   * @param {object} state
   * @param {string} contractId
   * @param {number} currentTick
   * @returns {{ success: boolean, deliveriesMade?: number, totalDeliveries?: number, complete?: boolean, reason?: string }}
   */
  function fulfillDelivery(state, contractId, currentTick) {
    ensureState(state);

    var contract = getContractById(state, contractId);
    if (!contract) {
      return { success: false, reason: 'Contract not found: ' + contractId };
    }

    if (contract.status !== 'active') {
      return { success: false, reason: 'Contract is not active (status: ' + contract.status + ')' };
    }

    var totalDeliveries = (contract.terms && contract.terms.totalDeliveries) ? contract.terms.totalDeliveries : 0;

    contract.deliveriesMade++;
    contract.lastDelivery = currentTick;

    var complete = false;
    if (totalDeliveries > 0 && contract.deliveriesMade >= totalDeliveries) {
      contract.status = 'fulfilled';
      contract.completedAt = currentTick;
      complete = true;
    }

    return {
      success: true,
      deliveriesMade: contract.deliveriesMade,
      totalDeliveries: totalDeliveries,
      complete: complete
    };
  }

  /**
   * Check if a delivery is overdue for a supply agreement.
   * @param {object} state
   * @param {string} contractId
   * @param {number} currentTick
   * @returns {{ due: boolean, overdueTicks: number, breachRisk: boolean, reason?: string }}
   */
  function checkDeliveryDue(state, contractId, currentTick) {
    ensureState(state);

    var contract = getContractById(state, contractId);
    if (!contract) {
      return { due: false, overdueTicks: 0, breachRisk: false, reason: 'Contract not found' };
    }

    if (contract.status !== 'active') {
      return { due: false, overdueTicks: 0, breachRisk: false, reason: 'Contract not active' };
    }

    var interval = (contract.terms && contract.terms.deliveryInterval) ? contract.terms.deliveryInterval : 0;
    if (interval <= 0) {
      return { due: false, overdueTicks: 0, breachRisk: false };
    }

    var lastDelivery = contract.lastDelivery || contract.createdAt;
    var nextDue = lastDelivery + interval;
    var overdueTicks = currentTick - nextDue;
    var due = overdueTicks >= 0;
    // Breach risk if overdue by more than half the interval
    var breachRisk = overdueTicks >= (interval * 0.5);

    return {
      due: due,
      overdueTicks: due ? overdueTicks : 0,
      breachRisk: breachRisk
    };
  }

  /**
   * Declare a contract breached and apply reputation/spark penalties.
   * @param {object} state
   * @param {string} contractId
   * @param {string} faultGuildId  - The guild at fault
   * @param {string} reason
   * @returns {{ success: boolean, penalty?: { reputation: number, spark: number }, reason?: string }}
   */
  function breachContract(state, contractId, faultGuildId, reason) {
    ensureState(state);

    var contract = getContractById(state, contractId);
    if (!contract) {
      return { success: false, reason: 'Contract not found: ' + contractId };
    }

    if (contract.status === 'breached') {
      return { success: false, reason: 'Contract already breached' };
    }

    if (contract.status === 'fulfilled' || contract.status === 'expired' || contract.status === 'cancelled') {
      return { success: false, reason: 'Cannot breach a ' + contract.status + ' contract' };
    }

    var typeDef = findContractType(contract.type);
    var penalty = typeDef ? { reputation: typeDef.breachPenalty.reputation, spark: typeDef.breachPenalty.spark }
                          : { reputation: -10, spark: 100 };

    contract.status = 'breached';
    contract.breachedBy = faultGuildId;
    contract.breachReason = reason || 'unspecified';

    // Record penalty in state
    if (!state.reputationPenalties[faultGuildId]) {
      state.reputationPenalties[faultGuildId] = [];
    }
    state.reputationPenalties[faultGuildId].push({
      contractId: contractId,
      reputation: penalty.reputation,
      spark: penalty.spark,
      tick: (state.currentTick || 0)
    });

    // Deactivate associated trade route if this was a trade_route contract
    if (contract.type === 'trade_route' && state.tradeRoutes) {
      for (var i = 0; i < state.tradeRoutes.length; i++) {
        if (state.tradeRoutes[i].contractId === contractId) {
          state.tradeRoutes[i].endTick = -1; // mark inactive
          break;
        }
      }
    }

    return { success: true, penalty: penalty };
  }

  /**
   * Cancel a proposed or voting contract. Only the proposing guild (partyA) can
   * cancel a 'proposed' contract; either party can cancel a 'voting' contract.
   * @param {object} state
   * @param {string} contractId
   * @param {string} guildId     - Guild requesting cancellation
   * @returns {{ success: boolean, reason?: string }}
   */
  function cancelContract(state, contractId, guildId) {
    ensureState(state);

    var contract = getContractById(state, contractId);
    if (!contract) {
      return { success: false, reason: 'Contract not found: ' + contractId };
    }

    if (contract.status !== 'proposed' && contract.status !== 'voting') {
      return { success: false, reason: 'Can only cancel proposed or voting contracts (current: ' + contract.status + ')' };
    }

    if (contract.status === 'proposed' && contract.partyA !== guildId) {
      return { success: false, reason: 'Only the proposing guild can cancel a proposed contract' };
    }

    if (contract.partyA !== guildId && contract.partyB !== guildId) {
      return { success: false, reason: guildId + ' is not a party to this contract' };
    }

    contract.status = 'cancelled';
    return { success: true };
  }

  /**
   * Check all active/voting/proposed contracts and expire those past their end date.
   * @param {object} state
   * @param {number} currentTick
   * @returns {{ expired: Array<{ contractId: string, type: string }> }}
   */
  function expireContracts(state, currentTick) {
    ensureState(state);

    var expired = [];
    var contracts = state.contracts || [];

    for (var i = 0; i < contracts.length; i++) {
      var c = contracts[i];
      if ((c.status === 'active' || c.status === 'voting' || c.status === 'proposed') &&
          c.expiresAt > 0 && currentTick > c.expiresAt) {
        c.status = 'expired';
        expired.push({ contractId: c.id, type: c.type });

        // Deactivate associated trade route
        if (c.type === 'trade_route' && state.tradeRoutes) {
          for (var j = 0; j < state.tradeRoutes.length; j++) {
            if (state.tradeRoutes[j].contractId === c.id) {
              state.tradeRoutes[j].endTick = currentTick;
              break;
            }
          }
        }
      }
    }

    return { expired: expired };
  }

  /**
   * Return all active contracts for a guild (either party).
   * @param {object} state
   * @param {string} guildId
   * @returns {Array<object>}
   */
  function getActiveContracts(state, guildId) {
    ensureState(state);
    var result = [];
    var contracts = state.contracts || [];
    for (var i = 0; i < contracts.length; i++) {
      var c = contracts[i];
      if (c.status === 'active' && (c.partyA === guildId || c.partyB === guildId)) {
        result.push(c);
      }
    }
    return result;
  }

  /**
   * Return the contract with the given id.
   * @param {object} state
   * @param {string} contractId
   * @returns {object|null}
   */
  function getContractById(state, contractId) {
    var contracts = (state && state.contracts) ? state.contracts : [];
    for (var i = 0; i < contracts.length; i++) {
      if (contracts[i].id === contractId) return contracts[i];
    }
    return null;
  }

  /**
   * Return all past (non-active, non-proposed, non-voting) contracts for a guild.
   * @param {object} state
   * @param {string} guildId
   * @returns {Array<object>}
   */
  function getContractHistory(state, guildId) {
    ensureState(state);
    var result = [];
    var historical = ['fulfilled', 'breached', 'expired', 'cancelled'];
    var contracts = state.contracts || [];
    for (var i = 0; i < contracts.length; i++) {
      var c = contracts[i];
      if (historical.indexOf(c.status) !== -1 && (c.partyA === guildId || c.partyB === guildId)) {
        result.push(c);
      }
    }
    return result;
  }

  /**
   * Return the trade discount between two guilds from any active trade route.
   * @param {object} state
   * @param {string} guildA
   * @param {string} guildB
   * @returns {number} Discount fraction (0 if no route)
   */
  function getTradeDiscount(state, guildA, guildB) {
    ensureState(state);
    var routes = state.tradeRoutes || [];
    var bestDiscount = 0;
    var tick = state.currentTick || 0;
    for (var i = 0; i < routes.length; i++) {
      var r = routes[i];
      var matchesParties = (r.guildA === guildA && r.guildB === guildB) ||
                           (r.guildA === guildB && r.guildB === guildA);
      if (matchesParties && r.endTick > tick) {
        if (r.discount > bestDiscount) bestDiscount = r.discount;
      }
    }
    return bestDiscount;
  }

  /**
   * Check whether any guild holds a monopoly (>60% of active supply contracts) on an item.
   * @param {object} state
   * @param {string} itemId
   * @returns {{ hasMonopoly: boolean, guildId: string|null, controlPercent: number }}
   */
  function calculateMonopolyEffect(state, itemId) {
    ensureState(state);
    var contracts = state.contracts || [];
    var guildCounts = {};
    var total = 0;

    for (var i = 0; i < contracts.length; i++) {
      var c = contracts[i];
      if (c.status === 'active' && c.type === 'supply_agreement') {
        var cItem = c.terms && c.terms.itemId;
        if (cItem === itemId) {
          // The supplier is partyA
          var supplier = c.partyA;
          guildCounts[supplier] = (guildCounts[supplier] || 0) + 1;
          total++;
        }
      }
    }

    if (total === 0) {
      return { hasMonopoly: false, guildId: null, controlPercent: 0 };
    }

    var topGuild = null;
    var topCount = 0;
    for (var gid in guildCounts) {
      if (guildCounts[gid] > topCount) {
        topCount = guildCounts[gid];
        topGuild = gid;
      }
    }

    var controlPercent = topCount / total;
    var MONOPOLY_THRESHOLD = 0.6;

    return {
      hasMonopoly: controlPercent > MONOPOLY_THRESHOLD,
      guildId: controlPercent > MONOPOLY_THRESHOLD ? topGuild : null,
      controlPercent: controlPercent
    };
  }

  /**
   * Return all contract type definitions.
   * @returns {Array<object>}
   */
  function getContractTypes() {
    return CONTRACT_TYPES;
  }

  /**
   * Return a guild's contract reliability score: ratio of fulfilled to total completed.
   * @param {object} state
   * @param {string} guildId
   * @returns {{ score: number, fulfilled: number, total: number }}
   */
  function getGuildReputation(state, guildId) {
    ensureState(state);
    var contracts = state.contracts || [];
    var fulfilled = 0;
    var total = 0;
    var terminal = ['fulfilled', 'breached', 'expired'];

    for (var i = 0; i < contracts.length; i++) {
      var c = contracts[i];
      if (terminal.indexOf(c.status) !== -1 && (c.partyA === guildId || c.partyB === guildId)) {
        total++;
        if (c.status === 'fulfilled') fulfilled++;
      }
    }

    return {
      score: total > 0 ? fulfilled / total : 1.0,
      fulfilled: fulfilled,
      total: total
    };
  }

  /**
   * Return contracts in 'voting' or 'proposed' status that involve the guild.
   * @param {object} state
   * @param {string} guildId
   * @returns {Array<object>}
   */
  function getPendingVotes(state, guildId) {
    ensureState(state);
    var result = [];
    var contracts = state.contracts || [];
    for (var i = 0; i < contracts.length; i++) {
      var c = contracts[i];
      if ((c.status === 'voting' || c.status === 'proposed') &&
          (c.partyA === guildId || c.partyB === guildId)) {
        result.push(c);
      }
    }
    return result;
  }

  /**
   * Return all upcoming delivery obligations for a guild within a tick range.
   * @param {object} state
   * @param {string} guildId
   * @param {number} fromTick
   * @param {number} toTick
   * @returns {Array<{ contractId: string, dueTick: number, itemId: string, quantity: number }>}
   */
  function getDeliverySchedule(state, guildId, fromTick, toTick) {
    ensureState(state);
    var schedule = [];
    var contracts = state.contracts || [];

    for (var i = 0; i < contracts.length; i++) {
      var c = contracts[i];
      if (c.status !== 'active') continue;
      if (c.type !== 'supply_agreement') continue;
      // Only supplier (partyA) has delivery obligations
      if (c.partyA !== guildId) continue;

      var interval = c.terms && c.terms.deliveryInterval;
      if (!interval || interval <= 0) continue;

      var lastDelivery = c.lastDelivery || c.createdAt;
      var nextDue = lastDelivery + interval;

      // Walk through all due deliveries in range
      while (nextDue <= toTick) {
        if (nextDue >= fromTick) {
          schedule.push({
            contractId: c.id,
            dueTick: nextDue,
            itemId: (c.terms && c.terms.itemId) || 'unknown',
            quantity: (c.terms && c.terms.quantity) || 0
          });
        }
        nextDue += interval;
        // Safety: if interval somehow rounds back
        if (interval === 0) break;
      }
    }

    // Sort by dueTick ascending
    schedule.sort(function(a, b) { return a.dueTick - b.dueTick; });

    return schedule;
  }

  /**
   * Return total trade volume (from trade routes) between two guilds.
   * @param {object} state
   * @param {string} guildA
   * @param {string} guildB
   * @returns {number}
   */
  function getTradeVolume(state, guildA, guildB) {
    ensureState(state);
    var routes = state.tradeRoutes || [];
    var total = 0;
    for (var i = 0; i < routes.length; i++) {
      var r = routes[i];
      var matchesParties = (r.guildA === guildA && r.guildB === guildB) ||
                           (r.guildA === guildB && r.guildB === guildA);
      if (matchesParties) {
        total += (r.volumeTraded || 0);
      }
    }
    return total;
  }

  // ---------------------------------------------------------------------------
  // EXPORTS
  // ---------------------------------------------------------------------------

  exports.CONTRACT_TYPES        = CONTRACT_TYPES;
  exports.proposeContract       = proposeContract;
  exports.voteOnContract        = voteOnContract;
  exports.activateContract      = activateContract;
  exports.fulfillDelivery       = fulfillDelivery;
  exports.checkDeliveryDue      = checkDeliveryDue;
  exports.breachContract        = breachContract;
  exports.cancelContract        = cancelContract;
  exports.expireContracts       = expireContracts;
  exports.getActiveContracts    = getActiveContracts;
  exports.getContractById       = getContractById;
  exports.getContractHistory    = getContractHistory;
  exports.getTradeDiscount      = getTradeDiscount;
  exports.calculateMonopolyEffect = calculateMonopolyEffect;
  exports.getContractTypes      = getContractTypes;
  exports.getGuildReputation    = getGuildReputation;
  exports.getPendingVotes       = getPendingVotes;
  exports.getDeliverySchedule   = getDeliverySchedule;
  exports.getTradeVolume        = getTradeVolume;

})(typeof module !== 'undefined' ? module.exports : (window.Contracts = {}));
