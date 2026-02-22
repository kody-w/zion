// guild_wars.js
(function(exports) {
  'use strict';

  // Guild Wars — Territory Control System for ZION MMO
  // Guilds claim territory nodes, declare wars, fight for control.
  // Winners earn tax bonuses and exclusive market access.

  // ---------------------------------------------------------------------------
  // STATIC TERRITORY DEFINITIONS — 16 nodes, 2 per zone
  // ---------------------------------------------------------------------------

  var TERRITORIES = [
    // nexus (2)
    {
      id: 'nexus_plaza',
      name: 'Nexus Plaza',
      zone: 'nexus',
      value: 5,
      taxRate: 0.10,
      bonus: { type: 'spark_earn', value: 0.10 },
      maxClaimPerGuild: 3
    },
    {
      id: 'nexus_gate',
      name: 'Nexus Gate',
      zone: 'nexus',
      value: 4,
      taxRate: 0.08,
      bonus: { type: 'spark_earn', value: 0.08 },
      maxClaimPerGuild: 3
    },
    // gardens (2)
    {
      id: 'gardens_grove',
      name: 'Gardens Grove',
      zone: 'gardens',
      value: 3,
      taxRate: 0.07,
      bonus: { type: 'harvest_yield', value: 0.15 },
      maxClaimPerGuild: 3
    },
    {
      id: 'gardens_spring',
      name: 'Gardens Spring',
      zone: 'gardens',
      value: 2,
      taxRate: 0.05,
      bonus: { type: 'harvest_yield', value: 0.10 },
      maxClaimPerGuild: 3
    },
    // athenaeum (2)
    {
      id: 'athenaeum_hall',
      name: 'Athenaeum Hall',
      zone: 'athenaeum',
      value: 4,
      taxRate: 0.09,
      bonus: { type: 'craft_quality', value: 0.12 },
      maxClaimPerGuild: 3
    },
    {
      id: 'athenaeum_archive',
      name: 'Athenaeum Archive',
      zone: 'athenaeum',
      value: 3,
      taxRate: 0.07,
      bonus: { type: 'craft_quality', value: 0.08 },
      maxClaimPerGuild: 3
    },
    // studio (2)
    {
      id: 'studio_stage',
      name: 'Studio Stage',
      zone: 'studio',
      value: 3,
      taxRate: 0.07,
      bonus: { type: 'perform_earn', value: 0.15 },
      maxClaimPerGuild: 3
    },
    {
      id: 'studio_workshop',
      name: 'Studio Workshop',
      zone: 'studio',
      value: 2,
      taxRate: 0.05,
      bonus: { type: 'perform_earn', value: 0.10 },
      maxClaimPerGuild: 3
    },
    // wilds (2)
    {
      id: 'wilds_outpost',
      name: 'Wilds Outpost',
      zone: 'wilds',
      value: 3,
      taxRate: 0.07,
      bonus: { type: 'discover_chance', value: 0.12 },
      maxClaimPerGuild: 3
    },
    {
      id: 'wilds_hollow',
      name: 'Wilds Hollow',
      zone: 'wilds',
      value: 2,
      taxRate: 0.05,
      bonus: { type: 'discover_chance', value: 0.08 },
      maxClaimPerGuild: 3
    },
    // agora (2)
    {
      id: 'agora_market',
      name: 'Agora Market',
      zone: 'agora',
      value: 5,
      taxRate: 0.10,
      bonus: { type: 'market_access', value: 1 },
      maxClaimPerGuild: 3
    },
    {
      id: 'agora_square',
      name: 'Agora Square',
      zone: 'agora',
      value: 4,
      taxRate: 0.08,
      bonus: { type: 'market_access', value: 1 },
      maxClaimPerGuild: 3
    },
    // commons (2)
    {
      id: 'commons_hearth',
      name: 'Commons Hearth',
      zone: 'commons',
      value: 2,
      taxRate: 0.05,
      bonus: { type: 'ubi_bonus', value: 0.05 },
      maxClaimPerGuild: 3
    },
    {
      id: 'commons_plaza',
      name: 'Commons Plaza',
      zone: 'commons',
      value: 3,
      taxRate: 0.07,
      bonus: { type: 'ubi_bonus', value: 0.08 },
      maxClaimPerGuild: 3
    },
    // arena (2)
    {
      id: 'arena_coliseum',
      name: 'Arena Coliseum',
      zone: 'arena',
      value: 5,
      taxRate: 0.10,
      bonus: { type: 'combat_power', value: 0.15 },
      maxClaimPerGuild: 3
    },
    {
      id: 'arena_barracks',
      name: 'Arena Barracks',
      zone: 'arena',
      value: 4,
      taxRate: 0.08,
      bonus: { type: 'combat_power', value: 0.10 },
      maxClaimPerGuild: 3
    }
  ];

  // ---------------------------------------------------------------------------
  // CONSTANTS
  // ---------------------------------------------------------------------------

  var CLAIM_COST_PER_VALUE = 100;  // territory.value * 100 Spark
  var ABANDON_REFUND_RATE  = 0.50; // 50% refund on voluntary abandon
  var RESET_REFUND_RATE    = 0.25; // 25% refund on monthly reset
  var WAR_DECLARATION_COST = 200;  // non-refundable war tax
  var WAR_NOTICE_TICKS     = 700;  // 7 "days" (100 ticks per day)
  var MAX_DEFENSE_LEVEL    = 5;
  var DEFENSE_UPGRADE_BASE = 200;  // level * 200 Spark per upgrade
  var DEFENDER_HOME_BONUS  = 0.20; // 20% force bonus for defender
  var MAX_GUILD_TERRITORIES = 3;

  // ---------------------------------------------------------------------------
  // MODULE STATE
  // ---------------------------------------------------------------------------

  var territoryStates  = {};  // territoryId → TERRITORY_STATE
  var wars             = [];  // WAR_DECLARATION[]
  var warHistory       = [];  // resolved WAR_DECLARATION[]
  var warCounter       = 1;

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  function getTerritoryDef(territoryId) {
    for (var i = 0; i < TERRITORIES.length; i++) {
      if (TERRITORIES[i].id === territoryId) return TERRITORIES[i];
    }
    return null;
  }

  function getTerritoryState(state, territoryId) {
    var ts = state.territoryStates || {};
    if (!ts[territoryId]) {
      ts[territoryId] = {
        territoryId: territoryId,
        ownerId: null,
        claimedAt: null,
        taxCollected: 0,
        defenseLevel: 0,
        fortifications: []
      };
      state.territoryStates = ts;
    }
    return ts[territoryId];
  }

  function ensureState(state) {
    if (!state.territoryStates) state.territoryStates = {};
    if (!state.wars)            state.wars = [];
    if (!state.warHistory)      state.warHistory = [];
    if (!state.warCounter)      state.warCounter = 1;
    // Initialize all territory states
    for (var i = 0; i < TERRITORIES.length; i++) {
      getTerritoryState(state, TERRITORIES[i].id);
    }
  }

  function getGuildTreasuryBalance(state, guildId) {
    if (!state.guildTreasuries) return 0;
    return state.guildTreasuries[guildId] || 0;
  }

  function deductGuildTreasury(state, guildId, amount) {
    if (!state.guildTreasuries) state.guildTreasuries = {};
    var current = state.guildTreasuries[guildId] || 0;
    state.guildTreasuries[guildId] = current - amount;
  }

  function addGuildTreasury(state, guildId, amount) {
    if (!state.guildTreasuries) state.guildTreasuries = {};
    var current = state.guildTreasuries[guildId] || 0;
    state.guildTreasuries[guildId] = current + amount;
  }

  function countGuildTerritories(state, guildId) {
    var count = 0;
    var ts = state.territoryStates || {};
    for (var tid in ts) {
      if (ts.hasOwnProperty(tid) && ts[tid].ownerId === guildId) count++;
    }
    return count;
  }

  function getPlayerGuildId(state, playerId) {
    if (!state.playerGuilds) return null;
    return state.playerGuilds[playerId] || null;
  }

  function seededRand(seed) {
    // Simple LCG for deterministic battle resolution
    var s = (seed * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 4294967296;
  }

  // ---------------------------------------------------------------------------
  // claimTerritory
  // ---------------------------------------------------------------------------

  /**
   * Claim an unclaimed territory node.
   * @param {object} state       — shared game state
   * @param {string} guildId     — claiming guild
   * @param {string} territoryId — territory to claim
   * @param {number} currentTick — current game tick
   * @returns {{ success: boolean, reason?: string, territory?: object }}
   */
  function claimTerritory(state, guildId, territoryId, currentTick) {
    ensureState(state);
    var def = getTerritoryDef(territoryId);
    if (!def) {
      return { success: false, reason: 'Territory not found' };
    }

    var ts = getTerritoryState(state, territoryId);
    if (ts.ownerId !== null) {
      return { success: false, reason: 'Territory already claimed' };
    }

    // Check guild territory cap
    var held = countGuildTerritories(state, guildId);
    if (held >= MAX_GUILD_TERRITORIES) {
      return { success: false, reason: 'Guild has reached maximum territory limit (' + MAX_GUILD_TERRITORIES + ')' };
    }

    var cost = def.value * CLAIM_COST_PER_VALUE;
    var balance = getGuildTreasuryBalance(state, guildId);
    if (balance < cost) {
      return { success: false, reason: 'Insufficient treasury. Need ' + cost + ' Spark, have ' + balance };
    }

    deductGuildTreasury(state, guildId, cost);
    ts.ownerId   = guildId;
    ts.claimedAt = currentTick;
    ts.defenseLevel = 0;

    return {
      success: true,
      cost: cost,
      territory: {
        def: def,
        state: ts
      }
    };
  }

  // ---------------------------------------------------------------------------
  // abandonTerritory
  // ---------------------------------------------------------------------------

  /**
   * Voluntarily relinquish a territory (50 % Spark refund).
   * @param {object} state
   * @param {string} guildId
   * @param {string} territoryId
   * @returns {{ success: boolean, refund?: number, reason?: string }}
   */
  function abandonTerritory(state, guildId, territoryId) {
    ensureState(state);
    var def = getTerritoryDef(territoryId);
    if (!def) {
      return { success: false, reason: 'Territory not found' };
    }

    var ts = getTerritoryState(state, territoryId);
    if (ts.ownerId !== guildId) {
      return { success: false, reason: 'Guild does not own this territory' };
    }

    var originalCost = def.value * CLAIM_COST_PER_VALUE;
    var refund = Math.floor(originalCost * ABANDON_REFUND_RATE);

    ts.ownerId      = null;
    ts.claimedAt    = null;
    ts.defenseLevel = 0;
    ts.fortifications = [];

    addGuildTreasury(state, guildId, refund);

    return { success: true, refund: refund };
  }

  // ---------------------------------------------------------------------------
  // declareWar
  // ---------------------------------------------------------------------------

  /**
   * Declare war on a guild's territory. 700-tick notice period.
   * @param {object} state
   * @param {string} attackerGuildId
   * @param {string} defenderGuildId
   * @param {string} territoryId
   * @param {number} currentTick
   * @returns {{ success: boolean, war?: object, battleTick?: number, reason?: string }}
   */
  function declareWar(state, attackerGuildId, defenderGuildId, territoryId, currentTick) {
    ensureState(state);

    if (attackerGuildId === defenderGuildId) {
      return { success: false, reason: 'Cannot declare war on own guild' };
    }

    var def = getTerritoryDef(territoryId);
    if (!def) {
      return { success: false, reason: 'Territory not found' };
    }

    var ts = getTerritoryState(state, territoryId);

    // Territory must be owned by the defender (or unclaimed — still disallow)
    if (ts.ownerId !== defenderGuildId) {
      return { success: false, reason: 'Target guild does not own that territory' };
    }

    // Check attacker is not declaring against own territory
    if (ts.ownerId === attackerGuildId) {
      return { success: false, reason: 'Cannot declare war on own territory' };
    }

    // Prevent duplicate active wars on the same territory
    var existingWar = null;
    for (var i = 0; i < state.wars.length; i++) {
      var w = state.wars[i];
      if (w.territoryId === territoryId &&
          (w.status === 'declared' || w.status === 'battle_ready' || w.status === 'in_battle')) {
        existingWar = w;
        break;
      }
    }
    if (existingWar) {
      return { success: false, reason: 'War already declared on this territory' };
    }

    // Deduct war tax from attacker treasury
    var balance = getGuildTreasuryBalance(state, attackerGuildId);
    if (balance < WAR_DECLARATION_COST) {
      return { success: false, reason: 'Insufficient treasury for war declaration. Need ' + WAR_DECLARATION_COST + ' Spark' };
    }
    deductGuildTreasury(state, attackerGuildId, WAR_DECLARATION_COST);

    var warId = 'war_' + (state.warCounter++);
    var battleTick = currentTick + WAR_NOTICE_TICKS;

    var war = {
      id: warId,
      attackerId: attackerGuildId,
      defenderId: defenderGuildId,
      territoryId: territoryId,
      declaredAt: currentTick,
      battleTick: battleTick,
      status: 'declared',
      attackerForce: 0,
      defenderForce: 0,
      participants: { attackers: [], defenders: [] },
      result: null
    };

    state.wars.push(war);

    return { success: true, war: war, battleTick: battleTick };
  }

  // ---------------------------------------------------------------------------
  // cancelWar
  // ---------------------------------------------------------------------------

  /**
   * Cancel own war declaration during the notice period (no refund).
   * @param {object} state
   * @param {string} guildId — must be the attacker
   * @param {string} warId
   * @returns {{ success: boolean, reason?: string }}
   */
  function cancelWar(state, guildId, warId) {
    ensureState(state);

    var war = null;
    for (var i = 0; i < state.wars.length; i++) {
      if (state.wars[i].id === warId) { war = state.wars[i]; break; }
    }
    if (!war) {
      return { success: false, reason: 'War not found' };
    }
    if (war.attackerId !== guildId) {
      return { success: false, reason: 'Only the attacking guild can cancel this war' };
    }
    if (war.status !== 'declared') {
      return { success: false, reason: 'War can only be cancelled during the notice period (status: declared)' };
    }

    war.status = 'cancelled';
    // Move to history
    state.warHistory.push(war);
    state.wars = state.wars.filter(function(w) { return w.id !== warId; });

    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // joinBattle
  // ---------------------------------------------------------------------------

  /**
   * A player commits to fight in a war on the specified side.
   * @param {object} state
   * @param {string} playerId
   * @param {string} warId
   * @param {string} side   — 'attacker' | 'defender'
   * @returns {{ success: boolean, reason?: string }}
   */
  function joinBattle(state, playerId, warId, side) {
    ensureState(state);

    if (side !== 'attacker' && side !== 'defender') {
      return { success: false, reason: 'Side must be "attacker" or "defender"' };
    }

    var war = null;
    for (var i = 0; i < state.wars.length; i++) {
      if (state.wars[i].id === warId) { war = state.wars[i]; break; }
    }
    if (!war) {
      return { success: false, reason: 'War not found' };
    }
    if (war.status !== 'declared' && war.status !== 'battle_ready') {
      return { success: false, reason: 'Cannot join battle: war status is ' + war.status };
    }

    // Validate player guild membership
    var playerGuildId = getPlayerGuildId(state, playerId);
    if (side === 'attacker' && playerGuildId !== war.attackerId) {
      return { success: false, reason: 'Player is not a member of the attacking guild' };
    }
    if (side === 'defender' && playerGuildId !== war.defenderId) {
      return { success: false, reason: 'Player is not a member of the defending guild' };
    }

    // Prevent double join
    var allParticipants = war.participants.attackers.concat(war.participants.defenders);
    for (var j = 0; j < allParticipants.length; j++) {
      if (allParticipants[j] === playerId) {
        return { success: false, reason: 'Player already joined this battle' };
      }
    }

    if (side === 'attacker') {
      war.participants.attackers.push(playerId);
    } else {
      war.participants.defenders.push(playerId);
    }

    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // contributeWarEffort
  // ---------------------------------------------------------------------------

  /**
   * A player contributes war points (from activities during war period).
   * @param {object} state
   * @param {string} playerId
   * @param {string} warId
   * @param {number} points
   * @returns {{ success: boolean, totalForce?: number, reason?: string }}
   */
  function contributeWarEffort(state, playerId, warId, points) {
    ensureState(state);

    if (typeof points !== 'number' || points <= 0) {
      return { success: false, reason: 'Points must be a positive number' };
    }

    var war = null;
    for (var i = 0; i < state.wars.length; i++) {
      if (state.wars[i].id === warId) { war = state.wars[i]; break; }
    }
    if (!war) {
      return { success: false, reason: 'War not found' };
    }
    if (war.status !== 'declared' && war.status !== 'battle_ready' && war.status !== 'in_battle') {
      return { success: false, reason: 'War is not active' };
    }

    // Determine which side the player is on
    var isAttacker = false;
    var isDefender = false;
    for (var j = 0; j < war.participants.attackers.length; j++) {
      if (war.participants.attackers[j] === playerId) { isAttacker = true; break; }
    }
    if (!isAttacker) {
      for (var k = 0; k < war.participants.defenders.length; k++) {
        if (war.participants.defenders[k] === playerId) { isDefender = true; break; }
      }
    }

    // Allow contribution even without explicit join — use guild membership
    if (!isAttacker && !isDefender) {
      var playerGuildId = getPlayerGuildId(state, playerId);
      if (playerGuildId === war.attackerId) isAttacker = true;
      else if (playerGuildId === war.defenderId) isDefender = true;
    }

    if (!isAttacker && !isDefender) {
      return { success: false, reason: 'Player is not a participant in this war' };
    }

    var totalForce;
    if (isAttacker) {
      war.attackerForce += points;
      totalForce = war.attackerForce;
    } else {
      war.defenderForce += points;
      totalForce = war.defenderForce;
    }

    return { success: true, totalForce: totalForce };
  }

  // ---------------------------------------------------------------------------
  // resolveBattle
  // ---------------------------------------------------------------------------

  /**
   * Resolve a battle. Compares forces with defender home advantage.
   * @param {object} state
   * @param {string} warId
   * @param {number} seed    — for deterministic resolution
   * @returns {{ result: string, winner: string, loser: string, territoryTransferred: boolean, spoils: object }}
   */
  function resolveBattle(state, warId, seed) {
    ensureState(state);

    var warIdx = -1;
    for (var i = 0; i < state.wars.length; i++) {
      if (state.wars[i].id === warId) { warIdx = i; break; }
    }
    if (warIdx === -1) {
      return { success: false, reason: 'War not found' };
    }

    var war = state.wars[warIdx];
    if (war.status === 'resolved') {
      return { success: false, reason: 'Battle already resolved' };
    }

    war.status = 'in_battle';

    var ts = getTerritoryState(state, war.territoryId);

    // Defender gets home advantage: +20% + defense level * 5%
    var defenseBonus = DEFENDER_HOME_BONUS + (ts.defenseLevel * 0.05);
    var effectiveDefenderForce = war.defenderForce * (1 + defenseBonus);
    var effectiveAttackerForce = war.attackerForce;

    // Add small random tiebreaker (uses seed so deterministic)
    var rng = seededRand(seed || war.declaredAt || 1);
    effectiveAttackerForce += rng * 0.001;
    effectiveDefenderForce += (1 - rng) * 0.001;

    var result;
    var territoryTransferred = false;
    var winner, loser;
    var spoils = {};

    if (effectiveAttackerForce > effectiveDefenderForce) {
      result = 'attacker_wins';
      winner = war.attackerId;
      loser  = war.defenderId;
      territoryTransferred = true;

      // Transfer territory
      ts.ownerId   = war.attackerId;
      ts.claimedAt = war.battleTick;
      ts.defenseLevel = 0;
      ts.fortifications = [];

      // Calculate spoils from defender's treasury
      var lootAmount = Math.floor(getGuildTreasuryBalance(state, war.defenderId) * 0.10);
      if (lootAmount > 0) {
        deductGuildTreasury(state, war.defenderId, lootAmount);
        addGuildTreasury(state, war.attackerId, lootAmount);
        spoils.treasuryLooted = lootAmount;
      }
    } else if (effectiveDefenderForce > effectiveAttackerForce) {
      result = 'defender_wins';
      winner = war.defenderId;
      loser  = war.attackerId;
      territoryTransferred = false;
    } else {
      // Exact tie (extremely rare with seeded tiebreaker — kept for completeness)
      result = 'draw';
      winner = null;
      loser  = null;
      territoryTransferred = false;
    }

    war.result = result;
    war.status = 'resolved';

    // Record in history
    if (!state.warHistory) state.warHistory = [];
    state.warHistory.push(war);
    state.wars.splice(warIdx, 1);

    return {
      success: true,
      result: result,
      winner: winner,
      loser: loser,
      territoryTransferred: territoryTransferred,
      spoils: spoils,
      attackerForce: war.attackerForce,
      defenderForce: war.defenderForce,
      effectiveDefenderForce: effectiveDefenderForce
    };
  }

  // ---------------------------------------------------------------------------
  // upgradeDefense
  // ---------------------------------------------------------------------------

  /**
   * Upgrade a territory's defense level (max 5). Cost = level * 200 Spark.
   * @param {object} state
   * @param {string} guildId
   * @param {string} territoryId
   * @param {number} sparkCost   — provided explicitly so caller controls payment
   * @returns {{ success: boolean, newLevel?: number, cost?: number, reason?: string }}
   */
  function upgradeDefense(state, guildId, territoryId, sparkCost) {
    ensureState(state);

    var def = getTerritoryDef(territoryId);
    if (!def) {
      return { success: false, reason: 'Territory not found' };
    }

    var ts = getTerritoryState(state, territoryId);
    if (ts.ownerId !== guildId) {
      return { success: false, reason: 'Guild does not own this territory' };
    }

    if (ts.defenseLevel >= MAX_DEFENSE_LEVEL) {
      return { success: false, reason: 'Defense already at maximum level (' + MAX_DEFENSE_LEVEL + ')' };
    }

    var nextLevel = ts.defenseLevel + 1;
    var requiredCost = nextLevel * DEFENSE_UPGRADE_BASE;

    if (sparkCost !== undefined && sparkCost !== requiredCost) {
      return { success: false, reason: 'sparkCost mismatch: expected ' + requiredCost + ', got ' + sparkCost };
    }

    var cost = requiredCost;
    var balance = getGuildTreasuryBalance(state, guildId);
    if (balance < cost) {
      return { success: false, reason: 'Insufficient treasury. Need ' + cost + ' Spark, have ' + balance };
    }

    deductGuildTreasury(state, guildId, cost);
    ts.defenseLevel = nextLevel;
    ts.fortifications.push({ level: nextLevel, cost: cost });

    return { success: true, newLevel: nextLevel, cost: cost };
  }

  // ---------------------------------------------------------------------------
  // collectTax
  // ---------------------------------------------------------------------------

  /**
   * Collect the territory tax on Spark earned inside a territory.
   * @param {object} state
   * @param {string} territoryId
   * @param {number} sparkAmount — gross Spark earned before tax
   * @returns {{ taxAmount: number, ownerGuild: string|null }}
   */
  function collectTax(state, territoryId, sparkAmount) {
    ensureState(state);

    var def = getTerritoryDef(territoryId);
    if (!def) {
      return { taxAmount: 0, ownerGuild: null };
    }

    var ts = getTerritoryState(state, territoryId);
    if (!ts.ownerId) {
      return { taxAmount: 0, ownerGuild: null };
    }

    var taxAmount = Math.floor(sparkAmount * def.taxRate);
    ts.taxCollected += taxAmount;
    addGuildTreasury(state, ts.ownerId, taxAmount);

    return { taxAmount: taxAmount, ownerGuild: ts.ownerId };
  }

  // ---------------------------------------------------------------------------
  // QUERY FUNCTIONS
  // ---------------------------------------------------------------------------

  /**
   * Return territory state (merged with definition).
   */
  function getTerritory(state, territoryId) {
    ensureState(state);
    var def = getTerritoryDef(territoryId);
    if (!def) return null;
    var ts = getTerritoryState(state, territoryId);
    return { def: def, state: ts };
  }

  /**
   * Return territories in a zone (or all if zone omitted).
   */
  function getTerritories(state, zone) {
    ensureState(state);
    var result = [];
    for (var i = 0; i < TERRITORIES.length; i++) {
      var def = TERRITORIES[i];
      if (!zone || def.zone === zone) {
        var ts = getTerritoryState(state, def.id);
        result.push({ def: def, state: ts });
      }
    }
    return result;
  }

  /**
   * Return all territories owned by a guild.
   */
  function getGuildTerritories(state, guildId) {
    ensureState(state);
    var result = [];
    var ts = state.territoryStates;
    for (var tid in ts) {
      if (ts.hasOwnProperty(tid) && ts[tid].ownerId === guildId) {
        var def = getTerritoryDef(tid);
        if (def) result.push({ def: def, state: ts[tid] });
      }
    }
    return result;
  }

  /**
   * Return all active war declarations.
   */
  function getActiveWars(state) {
    ensureState(state);
    return state.wars.slice();
  }

  /**
   * Return a war by ID (searches active wars first, then history).
   */
  function getWarById(state, warId) {
    ensureState(state);
    for (var i = 0; i < state.wars.length; i++) {
      if (state.wars[i].id === warId) return state.wars[i];
    }
    for (var j = 0; j < state.warHistory.length; j++) {
      if (state.warHistory[j].id === warId) return state.warHistory[j];
    }
    return null;
  }

  /**
   * Return war history for a guild (wins, losses, draws).
   */
  function getWarHistory(state, guildId) {
    ensureState(state);
    var wins = 0, losses = 0, draws = 0;
    var guildWars = [];

    for (var i = 0; i < state.warHistory.length; i++) {
      var war = state.warHistory[i];
      if (war.attackerId !== guildId && war.defenderId !== guildId) continue;
      guildWars.push(war);
      if (war.result === 'draw') {
        draws++;
      } else if (war.result === 'attacker_wins') {
        if (war.attackerId === guildId) wins++;
        else losses++;
      } else if (war.result === 'defender_wins') {
        if (war.defenderId === guildId) wins++;
        else losses++;
      }
    }

    return { wins: wins, losses: losses, draws: draws, wars: guildWars };
  }

  /**
   * Calculate total military power of a guild.
   * Power = (territories * 100) + (treasury / 10).
   */
  function getGuildPower(state, guildId) {
    ensureState(state);
    var territoryCount = countGuildTerritories(state, guildId);
    var treasury = getGuildTreasuryBalance(state, guildId);
    var totalDefense = 0;
    var ts = state.territoryStates;
    for (var tid in ts) {
      if (ts.hasOwnProperty(tid) && ts[tid].ownerId === guildId) {
        totalDefense += ts[tid].defenseLevel;
      }
    }
    return {
      power: (territoryCount * 100) + Math.floor(treasury / 10) + (totalDefense * 20),
      territories: territoryCount,
      treasury: treasury,
      totalDefense: totalDefense
    };
  }

  /**
   * Return full territory map (all 16 nodes with ownership).
   */
  function getTerritoryMap(state) {
    ensureState(state);
    var map = [];
    for (var i = 0; i < TERRITORIES.length; i++) {
      var def = TERRITORIES[i];
      var ts = getTerritoryState(state, def.id);
      map.push({
        id: def.id,
        name: def.name,
        zone: def.zone,
        value: def.value,
        ownerId: ts.ownerId,
        defenseLevel: ts.defenseLevel,
        taxCollected: ts.taxCollected,
        bonus: def.bonus
      });
    }
    return map;
  }

  /**
   * Monthly reset — all territories become unclaimed. 25% refund to owners.
   * @param {object} state
   * @param {number} currentTick
   * @returns {{ reset: Array }}
   */
  function resetTerritories(state, currentTick) {
    ensureState(state);
    var resetLog = [];
    var ts = state.territoryStates;

    for (var i = 0; i < TERRITORIES.length; i++) {
      var def = TERRITORIES[i];
      var tstate = ts[def.id];
      if (!tstate) continue;
      if (tstate.ownerId) {
        var originalCost = def.value * CLAIM_COST_PER_VALUE;
        var refund = Math.floor(originalCost * RESET_REFUND_RATE);
        addGuildTreasury(state, tstate.ownerId, refund);
        resetLog.push({
          territoryId: def.id,
          previousOwner: tstate.ownerId,
          refund: refund
        });
        tstate.ownerId = null;
        tstate.claimedAt = null;
        tstate.defenseLevel = 0;
        tstate.fortifications = [];
        tstate.taxCollected = 0;
      }
    }

    // Cancel all active wars
    for (var j = state.wars.length - 1; j >= 0; j--) {
      state.wars[j].status = 'cancelled';
      state.warHistory.push(state.wars[j]);
    }
    state.wars = [];

    return { reset: resetLog };
  }

  /**
   * Return all territory definitions (aliased as getDungeons for API compat).
   */
  function getDungeons() {
    return TERRITORIES.slice();
  }

  // ---------------------------------------------------------------------------
  // STATE MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Create a fresh GuildWars state object (embed inside larger game state).
   */
  function createGuildWarsState() {
    var state = {
      territoryStates: {},
      wars: [],
      warHistory: [],
      warCounter: 1,
      guildTreasuries: {},
      playerGuilds: {}
    };
    ensureState(state);
    return state;
  }

  // ---------------------------------------------------------------------------
  // EXPORTS
  // ---------------------------------------------------------------------------

  exports.TERRITORIES           = TERRITORIES;
  exports.WAR_NOTICE_TICKS      = WAR_NOTICE_TICKS;
  exports.MAX_GUILD_TERRITORIES = MAX_GUILD_TERRITORIES;
  exports.MAX_DEFENSE_LEVEL     = MAX_DEFENSE_LEVEL;
  exports.DEFENDER_HOME_BONUS   = DEFENDER_HOME_BONUS;

  exports.createGuildWarsState  = createGuildWarsState;
  exports.claimTerritory        = claimTerritory;
  exports.abandonTerritory      = abandonTerritory;
  exports.declareWar            = declareWar;
  exports.cancelWar             = cancelWar;
  exports.joinBattle            = joinBattle;
  exports.contributeWarEffort   = contributeWarEffort;
  exports.resolveBattle         = resolveBattle;
  exports.upgradeDefense        = upgradeDefense;
  exports.collectTax            = collectTax;
  exports.getTerritory          = getTerritory;
  exports.getTerritories        = getTerritories;
  exports.getGuildTerritories   = getGuildTerritories;
  exports.getActiveWars         = getActiveWars;
  exports.getWarById            = getWarById;
  exports.getWarHistory         = getWarHistory;
  exports.getGuildPower         = getGuildPower;
  exports.getTerritoryMap       = getTerritoryMap;
  exports.resetTerritories      = resetTerritories;
  exports.getDungeons           = getDungeons;

})(typeof module !== 'undefined' ? module.exports : (window.GuildWars = {}));
