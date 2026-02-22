// market_speculation.js
/**
 * market_speculation.js — Advanced Economy: Futures, Margin Trading, Circuit Breakers
 * Extends market_dynamics.js with financial instruments.
 * Layer: after market_dynamics.js
 */

(function(exports) {
  'use strict';

  // ---------------------------------------------------------------------------
  // Seeded PRNG — mulberry32
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
  // COMMODITIES — 15 tradeable futures
  // ---------------------------------------------------------------------------

  var COMMODITIES = [
    { id: 'iron_futures',    name: 'Iron Futures',    underlyingItem: 'iron_ore',    contractSize: 10, marginRequirement: 0.20, interestRate: 0.01, maxLeverage: 5, settlementTicks: 500 },
    { id: 'copper_futures',  name: 'Copper Futures',  underlyingItem: 'copper_ore',  contractSize: 10, marginRequirement: 0.20, interestRate: 0.01, maxLeverage: 5, settlementTicks: 500 },
    { id: 'gold_futures',    name: 'Gold Futures',    underlyingItem: 'gold_ore',    contractSize: 5,  marginRequirement: 0.25, interestRate: 0.015,maxLeverage: 4, settlementTicks: 400 },
    { id: 'wood_futures',    name: 'Wood Futures',    underlyingItem: 'timber',      contractSize: 20, marginRequirement: 0.15, interestRate: 0.008,maxLeverage: 6, settlementTicks: 600 },
    { id: 'stone_futures',   name: 'Stone Futures',   underlyingItem: 'stone_block', contractSize: 20, marginRequirement: 0.15, interestRate: 0.008,maxLeverage: 6, settlementTicks: 600 },
    { id: 'herb_futures',    name: 'Herb Futures',    underlyingItem: 'herb_bundle', contractSize: 15, marginRequirement: 0.20, interestRate: 0.012,maxLeverage: 5, settlementTicks: 300 },
    { id: 'crystal_futures', name: 'Crystal Futures', underlyingItem: 'crystal',     contractSize: 5,  marginRequirement: 0.30, interestRate: 0.02, maxLeverage: 3, settlementTicks: 400 },
    { id: 'fish_futures',    name: 'Fish Futures',    underlyingItem: 'grilled_fish',contractSize: 15, marginRequirement: 0.18, interestRate: 0.010,maxLeverage: 5, settlementTicks: 350 },
    { id: 'wheat_futures',   name: 'Wheat Futures',   underlyingItem: 'bread_loaf',  contractSize: 25, marginRequirement: 0.15, interestRate: 0.008,maxLeverage: 6, settlementTicks: 400 },
    { id: 'leather_futures', name: 'Leather Futures', underlyingItem: 'leather_vest',contractSize: 8,  marginRequirement: 0.20, interestRate: 0.012,maxLeverage: 5, settlementTicks: 500 },
    { id: 'gem_futures',     name: 'Gem Futures',     underlyingItem: 'gem',         contractSize: 3,  marginRequirement: 0.35, interestRate: 0.025,maxLeverage: 3, settlementTicks: 300 },
    { id: 'fabric_futures',  name: 'Fabric Futures',  underlyingItem: 'silk_thread', contractSize: 12, marginRequirement: 0.20, interestRate: 0.012,maxLeverage: 5, settlementTicks: 450 },
    { id: 'bone_futures',    name: 'Bone Futures',    underlyingItem: 'bone',        contractSize: 20, marginRequirement: 0.15, interestRate: 0.008,maxLeverage: 6, settlementTicks: 500 },
    { id: 'glass_futures',   name: 'Glass Futures',   underlyingItem: 'glass_lantern',contractSize: 8, marginRequirement: 0.22, interestRate: 0.013,maxLeverage: 4, settlementTicks: 450 },
    { id: 'dye_futures',     name: 'Dye Futures',     underlyingItem: 'dye',         contractSize: 10, marginRequirement: 0.20, interestRate: 0.011,maxLeverage: 5, settlementTicks: 400 }
  ];

  // ---------------------------------------------------------------------------
  // Internal counter for unique IDs
  // ---------------------------------------------------------------------------

  var _contractCounter = 0;

  function _nextContractId() {
    _contractCounter += 1;
    return 'future_' + _contractCounter;
  }

  // ---------------------------------------------------------------------------
  // State Initializers
  // ---------------------------------------------------------------------------

  /**
   * Ensure the speculative state namespace exists on `state`.
   * Called internally at the start of every function that touches state.
   */
  function _ensureState(state) {
    if (!state.speculation) {
      state.speculation = {
        contracts: {},        // contractId → FUTURES_CONTRACT
        marginAccounts: {},   // playerId → MARGIN_ACCOUNT
        circuitBreakers: {},  // itemId → CIRCUIT_BREAKER
        tradeLog: []          // [{contractId, tick, price, playerId}]
      };
    }
  }

  function _ensureMarginAccount(state, playerId) {
    if (!state.speculation.marginAccounts[playerId]) {
      state.speculation.marginAccounts[playerId] = {
        playerId: playerId,
        balance: 0,
        positions: [],
        totalMarginUsed: 0,
        totalProfitLoss: 0,
        liquidationThreshold: 0.5
      };
    }
    return state.speculation.marginAccounts[playerId];
  }

  function _ensureCircuitBreaker(state, itemId) {
    if (!state.speculation.circuitBreakers[itemId]) {
      state.speculation.circuitBreakers[itemId] = {
        itemId: itemId,
        triggerPercent: 0.50,
        windowTicks: 100,
        pauseDuration: 50,
        active: false,
        pausedUntil: 0
      };
    }
    return state.speculation.circuitBreakers[itemId];
  }

  // ---------------------------------------------------------------------------
  // getCommodities / getCommodityById
  // ---------------------------------------------------------------------------

  function getCommodities() {
    return COMMODITIES.slice();
  }

  function getCommodityById(commodityId) {
    for (var i = 0; i < COMMODITIES.length; i++) {
      if (COMMODITIES[i].id === commodityId) return COMMODITIES[i];
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // openPosition
  // ---------------------------------------------------------------------------

  /**
   * Open a futures position.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} commodityId
   * @param {string} direction  'long' | 'short'
   * @param {number} quantity   number of contracts
   * @param {number} currentPrice  underlying spot price
   * @param {number} currentTick
   * @returns {{success:boolean, contract:Object|null, marginRequired:number, reason:string}}
   */
  function openPosition(state, playerId, commodityId, direction, quantity, currentPrice, currentTick) {
    _ensureState(state);

    var commodity = getCommodityById(commodityId);
    if (!commodity) {
      return { success: false, contract: null, marginRequired: 0, reason: 'Unknown commodity: ' + commodityId };
    }

    if (!direction || (direction !== 'long' && direction !== 'short')) {
      return { success: false, contract: null, marginRequired: 0, reason: 'direction must be long or short' };
    }

    if (!quantity || quantity <= 0) {
      return { success: false, contract: null, marginRequired: 0, reason: 'quantity must be positive' };
    }

    if (currentPrice <= 0) {
      return { success: false, contract: null, marginRequired: 0, reason: 'currentPrice must be positive' };
    }

    // Calculate margin required
    // notionalValue = contractSize * quantity * currentPrice
    var notionalValue = commodity.contractSize * quantity * currentPrice;
    var marginRequired = notionalValue * commodity.marginRequirement;

    // Check leverage limit
    // leverage = notionalValue / margin; max allowed = maxLeverage
    // Minimum margin = notionalValue / maxLeverage
    var minMargin = notionalValue / commodity.maxLeverage;
    if (marginRequired < minMargin) {
      marginRequired = minMargin;
    }

    // Check leverage: quantity * contractSize * price / margin <= maxLeverage
    var leverage = notionalValue / marginRequired;
    if (leverage > commodity.maxLeverage) {
      return { success: false, contract: null, marginRequired: marginRequired, reason: 'Exceeds max leverage of ' + commodity.maxLeverage + 'x' };
    }

    // Deduct margin from player's margin account
    var account = _ensureMarginAccount(state, playerId);
    if (account.balance < marginRequired) {
      return { success: false, contract: null, marginRequired: marginRequired, reason: 'Insufficient margin balance. Need ' + marginRequired + ', have ' + account.balance };
    }

    account.balance -= marginRequired;
    account.totalMarginUsed += marginRequired;

    var contractId = _nextContractId();
    var contract = {
      id: contractId,
      commodityId: commodityId,
      holderId: playerId,
      direction: direction,
      quantity: quantity,
      entryPrice: currentPrice,
      margin: marginRequired,
      openedAt: currentTick,
      settlementTick: currentTick + commodity.settlementTicks,
      status: 'open',
      profitLoss: 0
    };

    state.speculation.contracts[contractId] = contract;
    account.positions.push(contractId);

    // Record in trade log
    state.speculation.tradeLog.push({
      contractId: contractId,
      tick: currentTick,
      price: currentPrice,
      playerId: playerId,
      action: 'open',
      commodityId: commodityId
    });

    return { success: true, contract: contract, marginRequired: marginRequired, reason: '' };
  }

  // ---------------------------------------------------------------------------
  // getPositionPnL
  // ---------------------------------------------------------------------------

  /**
   * Calculate unrealized P&L for an open position.
   * @param {Object} state
   * @param {string} contractId
   * @param {number} currentPrice
   * @returns {{profitLoss:number, percentChange:number}}
   */
  function getPositionPnL(state, contractId, currentPrice) {
    _ensureState(state);
    var contract = state.speculation.contracts[contractId];
    if (!contract) return { profitLoss: 0, percentChange: 0 };

    var commodity = getCommodityById(contract.commodityId);
    if (!commodity) return { profitLoss: 0, percentChange: 0 };

    var priceDelta = currentPrice - contract.entryPrice;
    // Long: profit when price goes up; Short: profit when price goes down
    if (contract.direction === 'short') {
      priceDelta = -priceDelta;
    }

    var profitLoss = priceDelta * contract.quantity * commodity.contractSize;
    var percentChange = contract.entryPrice > 0 ? (priceDelta / contract.entryPrice) * 100 : 0;

    return { profitLoss: profitLoss, percentChange: percentChange };
  }

  // ---------------------------------------------------------------------------
  // closePosition
  // ---------------------------------------------------------------------------

  /**
   * Close an open position. Calculate P&L.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} contractId
   * @param {number} currentPrice
   * @returns {{success:boolean, profitLoss:number, settled:boolean, reason:string}}
   */
  function closePosition(state, playerId, contractId, currentPrice) {
    _ensureState(state);
    var contract = state.speculation.contracts[contractId];
    if (!contract) {
      return { success: false, profitLoss: 0, settled: false, reason: 'Contract not found: ' + contractId };
    }
    if (contract.holderId !== playerId) {
      return { success: false, profitLoss: 0, settled: false, reason: 'Contract does not belong to player' };
    }
    if (contract.status !== 'open') {
      return { success: false, profitLoss: 0, settled: false, reason: 'Contract is already ' + contract.status };
    }

    var pnl = getPositionPnL(state, contractId, currentPrice);
    var profitLoss = pnl.profitLoss;

    contract.status = 'settled';
    contract.profitLoss = profitLoss;

    // Return margin + P&L to player margin account
    var account = _ensureMarginAccount(state, playerId);
    account.balance += contract.margin + profitLoss;
    account.totalMarginUsed -= contract.margin;
    account.totalProfitLoss += profitLoss;

    // Remove from positions list
    var idx = account.positions.indexOf(contractId);
    if (idx !== -1) account.positions.splice(idx, 1);

    return { success: true, profitLoss: profitLoss, settled: true, reason: '' };
  }

  // ---------------------------------------------------------------------------
  // settleExpired
  // ---------------------------------------------------------------------------

  /**
   * Settle all expired futures contracts.
   * @param {Object} state
   * @param {number} currentTick
   * @param {Function} getCurrentPrice  function(itemId) → number
   * @returns {{settled: Array}}
   */
  function settleExpired(state, currentTick, getCurrentPrice) {
    _ensureState(state);
    var settled = [];

    for (var contractId in state.speculation.contracts) {
      var contract = state.speculation.contracts[contractId];
      if (contract.status !== 'open') continue;
      if (contract.settlementTick > currentTick) continue;

      var commodity = getCommodityById(contract.commodityId);
      if (!commodity) continue;

      var currentPrice = getCurrentPrice(commodity.underlyingItem);
      var result = closePosition(state, contract.holderId, contractId, currentPrice);
      contract.status = 'expired';

      settled.push({ contractId: contractId, profitLoss: result.profitLoss });
    }

    return { settled: settled };
  }

  // ---------------------------------------------------------------------------
  // checkLiquidation
  // ---------------------------------------------------------------------------

  /**
   * Check if player's margin account needs liquidation.
   * @param {Object} state
   * @param {string} playerId
   * @param {Function} getCurrentPrice  function(itemId) → number
   * @returns {{needsLiquidation:boolean, marginLevel:number, threshold:number}}
   */
  function checkLiquidation(state, playerId, getCurrentPrice) {
    _ensureState(state);
    var account = _ensureMarginAccount(state, playerId);

    if (account.totalMarginUsed === 0) {
      return { needsLiquidation: false, marginLevel: 1, threshold: account.liquidationThreshold };
    }

    // Calculate total unrealized P&L across all open positions
    var totalUnrealizedPnL = 0;
    for (var i = 0; i < account.positions.length; i++) {
      var contractId = account.positions[i];
      var contract = state.speculation.contracts[contractId];
      if (!contract || contract.status !== 'open') continue;
      var commodity = getCommodityById(contract.commodityId);
      if (!commodity) continue;
      var price = getCurrentPrice(commodity.underlyingItem);
      var pnl = getPositionPnL(state, contractId, price);
      totalUnrealizedPnL += pnl.profitLoss;
    }

    // Effective margin = deposited margin + unrealized P&L
    var effectiveMargin = account.totalMarginUsed + account.balance + totalUnrealizedPnL;
    var marginLevel = effectiveMargin / account.totalMarginUsed;

    var needsLiquidation = marginLevel < account.liquidationThreshold;
    return { needsLiquidation: needsLiquidation, marginLevel: marginLevel, threshold: account.liquidationThreshold };
  }

  // ---------------------------------------------------------------------------
  // liquidatePosition
  // ---------------------------------------------------------------------------

  /**
   * Force-close a position due to margin call.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} contractId
   * @param {number} currentPrice
   * @returns {{success:boolean, loss:number}}
   */
  function liquidatePosition(state, playerId, contractId, currentPrice) {
    _ensureState(state);
    var contract = state.speculation.contracts[contractId];
    if (!contract || contract.status !== 'open') {
      return { success: false, loss: 0 };
    }

    var result = closePosition(state, playerId, contractId, currentPrice);
    contract.status = 'liquidated';

    var loss = result.profitLoss < 0 ? Math.abs(result.profitLoss) : 0;
    return { success: result.success, loss: loss };
  }

  // ---------------------------------------------------------------------------
  // depositMargin / withdrawMargin / getMarginAccount / getOpenPositions
  // ---------------------------------------------------------------------------

  /**
   * Add Spark to margin account.
   * @param {Object} state
   * @param {string} playerId
   * @param {number} amount
   * @returns {{success:boolean, newBalance:number, reason:string}}
   */
  function depositMargin(state, playerId, amount) {
    _ensureState(state);
    if (!amount || amount <= 0) {
      return { success: false, newBalance: 0, reason: 'amount must be positive' };
    }
    var account = _ensureMarginAccount(state, playerId);
    account.balance += amount;
    return { success: true, newBalance: account.balance, reason: '' };
  }

  /**
   * Remove Spark from margin account (only excess above margin in use).
   * @param {Object} state
   * @param {string} playerId
   * @param {number} amount
   * @returns {{success:boolean, withdrawn:number, reason:string}}
   */
  function withdrawMargin(state, playerId, amount) {
    _ensureState(state);
    if (!amount || amount <= 0) {
      return { success: false, withdrawn: 0, reason: 'amount must be positive' };
    }
    var account = _ensureMarginAccount(state, playerId);
    var available = account.balance; // free balance not locked in positions
    if (amount > available) {
      return { success: false, withdrawn: 0, reason: 'Insufficient free margin. Available: ' + available };
    }
    account.balance -= amount;
    return { success: true, withdrawn: amount, reason: '' };
  }

  /**
   * Return margin account state.
   * @param {Object} state
   * @param {string} playerId
   * @returns {Object}
   */
  function getMarginAccount(state, playerId) {
    _ensureState(state);
    return _ensureMarginAccount(state, playerId);
  }

  /**
   * Return all open futures contracts for player.
   * @param {Object} state
   * @param {string} playerId
   * @returns {Array}
   */
  function getOpenPositions(state, playerId) {
    _ensureState(state);
    var account = _ensureMarginAccount(state, playerId);
    var open = [];
    for (var i = 0; i < account.positions.length; i++) {
      var contract = state.speculation.contracts[account.positions[i]];
      if (contract && contract.status === 'open') {
        open.push(contract);
      }
    }
    return open;
  }

  // ---------------------------------------------------------------------------
  // Circuit Breakers
  // ---------------------------------------------------------------------------

  /**
   * Check if circuit breaker should trigger.
   * @param {Object} state
   * @param {string} itemId
   * @param {Array} priceHistory  [{price:number, tick:number}] sorted ascending by tick
   * @returns {{triggered:boolean, previousPrice:number, currentPrice:number, dropPercent:number}}
   */
  function checkCircuitBreaker(state, itemId, priceHistory) {
    _ensureState(state);
    var cb = _ensureCircuitBreaker(state, itemId);

    if (!priceHistory || priceHistory.length < 2) {
      return { triggered: false, previousPrice: 0, currentPrice: 0, dropPercent: 0 };
    }

    var latest = priceHistory[priceHistory.length - 1];
    var currentPrice = latest.price;
    var currentTick = latest.tick;

    // Find oldest price within the window
    var windowStart = currentTick - cb.windowTicks;
    var referencePrice = null;
    for (var i = 0; i < priceHistory.length; i++) {
      if (priceHistory[i].tick >= windowStart) {
        referencePrice = priceHistory[i].price;
        break;
      }
    }

    if (referencePrice === null) {
      referencePrice = priceHistory[0].price;
    }

    if (referencePrice <= 0) {
      return { triggered: false, previousPrice: referencePrice, currentPrice: currentPrice, dropPercent: 0 };
    }

    var dropPercent = (referencePrice - currentPrice) / referencePrice;
    var triggered = dropPercent >= cb.triggerPercent;

    return {
      triggered: triggered,
      previousPrice: referencePrice,
      currentPrice: currentPrice,
      dropPercent: dropPercent
    };
  }

  /**
   * Activate circuit breaker — pause trading for item.
   * @param {Object} state
   * @param {string} itemId
   * @param {number} currentTick
   * @returns {{paused:boolean, resumeAt:number}}
   */
  function triggerCircuitBreaker(state, itemId, currentTick) {
    _ensureState(state);
    var cb = _ensureCircuitBreaker(state, itemId);
    cb.active = true;
    cb.pausedUntil = currentTick + cb.pauseDuration;
    return { paused: true, resumeAt: cb.pausedUntil };
  }

  /**
   * Check if trading is allowed (circuit breaker not active).
   * @param {Object} state
   * @param {string} itemId
   * @param {number} currentTick
   * @returns {{allowed:boolean, reason:string, resumeAt:number}}
   */
  function isTradeAllowed(state, itemId, currentTick) {
    _ensureState(state);
    var cb = state.speculation.circuitBreakers[itemId];
    if (!cb || !cb.active) {
      return { allowed: true, reason: '', resumeAt: 0 };
    }
    if (currentTick >= cb.pausedUntil) {
      cb.active = false;
      cb.pausedUntil = 0;
      return { allowed: true, reason: '', resumeAt: 0 };
    }
    return {
      allowed: false,
      reason: 'Circuit breaker active for ' + itemId + '. Trading paused until tick ' + cb.pausedUntil,
      resumeAt: cb.pausedUntil
    };
  }

  // ---------------------------------------------------------------------------
  // Monopoly Detection & Breaking
  // ---------------------------------------------------------------------------

  /**
   * Check if any guild controls >60% of supply contracts for an item.
   * Examines open contracts on the underlying item's futures.
   * @param {Object} state
   * @param {string} itemId
   * @returns {{hasMonopoly:boolean, guildId:string|null, controlPercent:number}}
   */
  function detectMonopoly(state, itemId) {
    _ensureState(state);

    // Find commodity for this item
    var commodity = null;
    for (var ci = 0; ci < COMMODITIES.length; ci++) {
      if (COMMODITIES[ci].underlyingItem === itemId) {
        commodity = COMMODITIES[ci];
        break;
      }
    }

    if (!commodity) {
      return { hasMonopoly: false, guildId: null, controlPercent: 0 };
    }

    // Count total open contracts (long positions indicate supply bets)
    // Count by guild (stored on player or on contract.guildId)
    var guildTotals = {};
    var totalContracts = 0;

    for (var contractId in state.speculation.contracts) {
      var contract = state.speculation.contracts[contractId];
      if (contract.commodityId !== commodity.id) continue;
      if (contract.status !== 'open') continue;
      if (contract.direction !== 'long') continue;

      totalContracts += contract.quantity;

      // Guild is stored on contract (optional) or from player profile
      var guildId = contract.guildId || null;
      if (!guildId) {
        // Try state.guilds player memberships
        if (state.guilds) {
          for (var gid in state.guilds) {
            var guild = state.guilds[gid];
            if (guild.members && guild.members.indexOf(contract.holderId) !== -1) {
              guildId = gid;
              break;
            }
          }
        }
      }
      if (!guildId) {
        // Treat solo players as their own "guild"
        guildId = 'player_' + contract.holderId;
      }

      guildTotals[guildId] = (guildTotals[guildId] || 0) + contract.quantity;
    }

    if (totalContracts === 0) {
      return { hasMonopoly: false, guildId: null, controlPercent: 0 };
    }

    // Find maximum controller
    var maxGuild = null;
    var maxContracts = 0;
    for (var gid2 in guildTotals) {
      if (guildTotals[gid2] > maxContracts) {
        maxContracts = guildTotals[gid2];
        maxGuild = gid2;
      }
    }

    var controlPercent = maxContracts / totalContracts;
    var MONOPOLY_THRESHOLD = 0.60;
    var hasMonopoly = controlPercent > MONOPOLY_THRESHOLD;

    return {
      hasMonopoly: hasMonopoly,
      guildId: hasMonopoly ? maxGuild : null,
      controlPercent: controlPercent
    };
  }

  // Alternative resource spawn locations (relative offsets around ZION zones)
  var SPAWN_REGIONS = [
    { x: 50,   z: 50  },
    { x: -80,  z: 120 },
    { x: 150,  z: -60 },
    { x: -120, z: -80 },
    { x: 200,  z: 200 },
    { x: -200, z: 150 },
    { x: 100,  z: -200},
    { x: -50,  z: -150}
  ];

  /**
   * Spawn alternative resources to break monopoly.
   * @param {Object} state
   * @param {string} itemId
   * @param {number} seed  PRNG seed
   * @returns {{alternativeSpawned:boolean, locations:Array}}
   */
  function breakMonopoly(state, itemId, seed) {
    _ensureState(state);
    var rng = mulberry32(seed || 42);

    // Spawn 3–5 alternative resource nodes
    var count = 3 + Math.floor(rng() * 3);
    var locations = [];

    for (var i = 0; i < count; i++) {
      var regionIdx = Math.floor(rng() * SPAWN_REGIONS.length);
      var region = SPAWN_REGIONS[regionIdx];
      var jitterX = (rng() - 0.5) * 40;
      var jitterZ = (rng() - 0.5) * 40;
      locations.push({
        itemId: itemId,
        x: region.x + jitterX,
        z: region.z + jitterZ,
        quantity: 20 + Math.floor(rng() * 30),
        spawnedAt: Date.now()
      });
    }

    // Record in state
    if (!state.speculation.alternativeResources) {
      state.speculation.alternativeResources = [];
    }
    for (var j = 0; j < locations.length; j++) {
      state.speculation.alternativeResources.push(locations[j]);
    }

    return { alternativeSpawned: locations.length > 0, locations: locations };
  }

  // ---------------------------------------------------------------------------
  // Analytics
  // ---------------------------------------------------------------------------

  /**
   * Return overall market health metrics.
   * @param {Object} state
   * @returns {{volatilityIndex:number, activePositions:number, marginUtilization:number, totalOpenInterest:number}}
   */
  function getMarketHealth(state) {
    _ensureState(state);

    var activePositions = 0;
    var totalOpenInterest = 0;
    var totalMarginDeposited = 0;
    var totalMarginUsed = 0;

    for (var contractId in state.speculation.contracts) {
      var contract = state.speculation.contracts[contractId];
      if (contract.status === 'open') {
        activePositions += 1;
        var commodity = getCommodityById(contract.commodityId);
        if (commodity) {
          totalOpenInterest += contract.quantity * commodity.contractSize * contract.entryPrice;
        }
      }
    }

    for (var playerId in state.speculation.marginAccounts) {
      var account = state.speculation.marginAccounts[playerId];
      totalMarginDeposited += account.balance + account.totalMarginUsed;
      totalMarginUsed += account.totalMarginUsed;
    }

    var marginUtilization = totalMarginDeposited > 0 ? totalMarginUsed / totalMarginDeposited : 0;

    // Volatility index: number of active circuit breakers / total items
    var activeCBs = 0;
    var totalCBs = 0;
    for (var itemId in state.speculation.circuitBreakers) {
      totalCBs += 1;
      if (state.speculation.circuitBreakers[itemId].active) activeCBs += 1;
    }
    var volatilityIndex = totalCBs > 0 ? activeCBs / totalCBs : 0;

    return {
      volatilityIndex: volatilityIndex,
      activePositions: activePositions,
      marginUtilization: marginUtilization,
      totalOpenInterest: totalOpenInterest
    };
  }

  /**
   * Return most profitable traders.
   * @param {Object} state
   * @param {number} count
   * @returns {Array} [{playerId, totalProfitLoss, openPositions}]
   */
  function getTopTraders(state, count) {
    _ensureState(state);
    var traders = [];

    for (var playerId in state.speculation.marginAccounts) {
      var account = state.speculation.marginAccounts[playerId];
      traders.push({
        playerId: playerId,
        totalProfitLoss: account.totalProfitLoss,
        openPositions: account.positions.length
      });
    }

    traders.sort(function(a, b) { return b.totalProfitLoss - a.totalProfitLoss; });

    var n = count || 10;
    return traders.slice(0, n);
  }

  /**
   * Return trading volume for a commodity over a window.
   * @param {Object} state
   * @param {string} commodityId
   * @param {number} windowTicks
   * @param {number} currentTick
   * @returns {{volume:number, tradeCount:number}}
   */
  function getTradingVolume(state, commodityId, windowTicks, currentTick) {
    _ensureState(state);
    var volume = 0;
    var tradeCount = 0;
    var since = currentTick - windowTicks;

    for (var i = 0; i < state.speculation.tradeLog.length; i++) {
      var entry = state.speculation.tradeLog[i];
      if (entry.commodityId !== commodityId) continue;
      if (entry.tick < since) continue;
      volume += 1;
      tradeCount += 1;
    }

    return { volume: volume, tradeCount: tradeCount };
  }

  // ---------------------------------------------------------------------------
  // Exports
  // ---------------------------------------------------------------------------

  exports.COMMODITIES            = COMMODITIES;
  exports.getCommodities         = getCommodities;
  exports.getCommodityById       = getCommodityById;
  exports.openPosition           = openPosition;
  exports.closePosition          = closePosition;
  exports.settleExpired          = settleExpired;
  exports.checkLiquidation       = checkLiquidation;
  exports.liquidatePosition      = liquidatePosition;
  exports.depositMargin          = depositMargin;
  exports.withdrawMargin         = withdrawMargin;
  exports.getMarginAccount       = getMarginAccount;
  exports.getOpenPositions       = getOpenPositions;
  exports.getPositionPnL         = getPositionPnL;
  exports.checkCircuitBreaker    = checkCircuitBreaker;
  exports.triggerCircuitBreaker  = triggerCircuitBreaker;
  exports.isTradeAllowed         = isTradeAllowed;
  exports.detectMonopoly         = detectMonopoly;
  exports.breakMonopoly          = breakMonopoly;
  exports.getMarketHealth        = getMarketHealth;
  exports.getTopTraders          = getTopTraders;
  exports.getTradingVolume       = getTradingVolume;

})(typeof module !== 'undefined' ? module.exports : (window.MarketSpeculation = {}));
