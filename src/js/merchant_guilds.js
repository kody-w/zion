// merchant_guilds.js
/**
 * ZION Merchant Guilds System — Economic Specialization and Trade Routes
 * Five guild types (traders, miners, farmers, alchemists, cartographers),
 * zone-to-zone cargo routes, cargo contracts, tariff system, supply chains,
 * and merchant ranking by trade volume and profit.
 * Constitution ref: §3 (economy), §2.3 (community formation)
 */

(function(exports) {
  'use strict';

  // ---------------------------------------------------------------------------
  // SEEDED PRNG — mulberry32
  // ---------------------------------------------------------------------------

  function mulberry32(seed) {
    var s = seed >>> 0;
    return function() {
      s += 0x6D2B79F5;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) >>> 0;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Internal counters (module-level, reset-safe via createState ids)
  var _guildCounter = 0;
  var _contractCounter = 0;
  var _cargoCounter = 0;

  // ---------------------------------------------------------------------------
  // GUILD TYPE DEFINITIONS
  // ---------------------------------------------------------------------------

  var GUILD_TYPES = [
    {
      id: 'traders',
      name: 'Traders Guild',
      description: 'Masters of commerce who profit from buying low and selling high. Expert negotiators with superior buy/sell margins.',
      specialty: 'buy_sell_margins',
      baseBonus: { buyMargin: 0.05, sellMargin: 0.05, tariffDiscount: 0.10 },
      maxMembers: 20
    },
    {
      id: 'miners',
      name: 'Miners Guild',
      description: 'Resource extraction specialists who dominate raw material supply chains. Bonus to resource yield and extraction speed.',
      specialty: 'resource_extraction',
      baseBonus: { extractionBonus: 0.15, resourceYield: 0.10, tariffDiscount: 0.05 },
      maxMembers: 15
    },
    {
      id: 'farmers',
      name: 'Farmers Collective',
      description: 'Agricultural producers supplying food and organic materials to ZION. Bonus to crop yield and seasonal bonuses.',
      specialty: 'produce',
      baseBonus: { cropYield: 0.20, seasonalBonus: 0.10, tariffDiscount: 0.05 },
      maxMembers: 18
    },
    {
      id: 'alchemists',
      name: 'Alchemists Brotherhood',
      description: 'Rare crafting specialists who transmute raw goods into high-value items. Bonus to crafting success and rare item discovery.',
      specialty: 'rare_crafting',
      baseBonus: { craftingBonus: 0.15, rareDiscovery: 0.10, tariffDiscount: 0.05 },
      maxMembers: 12
    },
    {
      id: 'cartographers',
      name: 'Cartographers Society',
      description: 'Exploration map specialists who chart the world and control information trade. Bonus to exploration rewards and map sales.',
      specialty: 'exploration_maps',
      baseBonus: { explorationBonus: 0.20, mapSaleBonus: 0.15, tariffDiscount: 0.08 },
      maxMembers: 10
    }
  ];

  // ---------------------------------------------------------------------------
  // TRADE ROUTE DEFINITIONS (12 predefined routes between 8 zones)
  // Zones: nexus, gardens, athenaeum, studio, wilds, agora, commons, arena
  // ---------------------------------------------------------------------------

  var TRADE_ROUTES = [
    {
      id: 'route_nexus_gardens',
      name: 'Nexus-Gardens Corridor',
      origin: 'nexus',
      destination: 'gardens',
      duration: 30,
      risk: 0.05,
      goods: ['produce', 'seeds', 'herbs'],
      capacity: 100
    },
    {
      id: 'route_nexus_agora',
      name: 'Nexus-Agora Exchange',
      origin: 'nexus',
      destination: 'agora',
      duration: 25,
      risk: 0.03,
      goods: ['crafted_goods', 'currency', 'contracts'],
      capacity: 150
    },
    {
      id: 'route_nexus_commons',
      name: 'Nexus-Commons Supply',
      origin: 'nexus',
      destination: 'commons',
      duration: 35,
      risk: 0.04,
      goods: ['food', 'tools', 'clothing'],
      capacity: 120
    },
    {
      id: 'route_gardens_wilds',
      name: 'Gardens-Wilds Harvest',
      origin: 'gardens',
      destination: 'wilds',
      duration: 40,
      risk: 0.12,
      goods: ['seeds', 'produce', 'rare_herbs'],
      capacity: 80
    },
    {
      id: 'route_athenaeum_agora',
      name: 'Athenaeum-Agora Knowledge',
      origin: 'athenaeum',
      destination: 'agora',
      duration: 45,
      risk: 0.06,
      goods: ['maps', 'scrolls', 'schematics'],
      capacity: 60
    },
    {
      id: 'route_studio_commons',
      name: 'Studio-Commons Craft',
      origin: 'studio',
      destination: 'commons',
      duration: 38,
      risk: 0.07,
      goods: ['art', 'crafted_goods', 'instruments'],
      capacity: 90
    },
    {
      id: 'route_wilds_nexus',
      name: 'Wilds-Nexus Raw Material',
      origin: 'wilds',
      destination: 'nexus',
      duration: 50,
      risk: 0.15,
      goods: ['ore', 'raw_stone', 'timber', 'pelts'],
      capacity: 200
    },
    {
      id: 'route_agora_arena',
      name: 'Agora-Arena Supply',
      origin: 'agora',
      destination: 'arena',
      duration: 30,
      risk: 0.08,
      goods: ['weapons', 'armor', 'potions'],
      capacity: 70
    },
    {
      id: 'route_commons_gardens',
      name: 'Commons-Gardens Exchange',
      origin: 'commons',
      destination: 'gardens',
      duration: 42,
      risk: 0.05,
      goods: ['tools', 'fertilizer', 'water'],
      capacity: 100
    },
    {
      id: 'route_arena_athenaeum',
      name: 'Arena-Athenaeum Lore',
      origin: 'arena',
      destination: 'athenaeum',
      duration: 55,
      risk: 0.09,
      goods: ['trophies', 'battle_records', 'rare_materials'],
      capacity: 50
    },
    {
      id: 'route_studio_athenaeum',
      name: 'Studio-Athenaeum Culture',
      origin: 'studio',
      destination: 'athenaeum',
      duration: 48,
      risk: 0.06,
      goods: ['art', 'music_scores', 'blueprints'],
      capacity: 65
    },
    {
      id: 'route_wilds_gardens',
      name: 'Wilds-Gardens Bounty',
      origin: 'wilds',
      destination: 'gardens',
      duration: 35,
      risk: 0.10,
      goods: ['rare_herbs', 'wild_seeds', 'animal_products'],
      capacity: 75
    }
  ];

  // ---------------------------------------------------------------------------
  // MERCHANT RANK DEFINITIONS
  // ---------------------------------------------------------------------------

  var MERCHANT_RANKS = [
    {
      id: 'novice',
      name: 'Novice Merchant',
      threshold: 0,
      bonus: { marginBonus: 0, cargoCapacityBonus: 0 },
      description: 'Just starting out in the merchant guilds.'
    },
    {
      id: 'journeyman',
      name: 'Journeyman Merchant',
      threshold: 500,
      bonus: { marginBonus: 0.02, cargoCapacityBonus: 10 },
      description: 'An established merchant with a proven track record.'
    },
    {
      id: 'master_merchant',
      name: 'Master Merchant',
      threshold: 2000,
      bonus: { marginBonus: 0.05, cargoCapacityBonus: 25 },
      description: 'A respected master of commerce in ZION.'
    },
    {
      id: 'grandmaster',
      name: 'Grandmaster',
      threshold: 10000,
      bonus: { marginBonus: 0.10, cargoCapacityBonus: 50 },
      description: 'The pinnacle of merchant achievement. Commands great respect.'
    }
  ];

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  function findGuildType(typeId) {
    for (var i = 0; i < GUILD_TYPES.length; i++) {
      if (GUILD_TYPES[i].id === typeId) return GUILD_TYPES[i];
    }
    return null;
  }

  function findTradeRoute(routeId) {
    for (var i = 0; i < TRADE_ROUTES.length; i++) {
      if (TRADE_ROUTES[i].id === routeId) return TRADE_ROUTES[i];
    }
    return null;
  }

  function findRankByVolume(volume) {
    var rank = MERCHANT_RANKS[0];
    for (var i = MERCHANT_RANKS.length - 1; i >= 0; i--) {
      if (volume >= MERCHANT_RANKS[i].threshold) {
        rank = MERCHANT_RANKS[i];
        break;
      }
    }
    return rank;
  }

  function ensureState(state) {
    if (!state.guilds) state.guilds = {};
    if (!state.routes) state.routes = {};
    if (!state.contracts) state.contracts = [];
    if (!state.cargo) state.cargo = [];
    if (!state.tariffs) state.tariffs = {};
    if (!state.memberStats) state.memberStats = {};
    if (!state.tradeLog) state.tradeLog = [];
  }

  function getMemberStat(state, playerId) {
    if (!state.memberStats[playerId]) {
      state.memberStats[playerId] = {
        totalVolume: 0,
        totalProfit: 0,
        contractsCompleted: 0,
        cargoDelivered: 0,
        rankXP: 0
      };
    }
    return state.memberStats[playerId];
  }

  // ---------------------------------------------------------------------------
  // createState
  // ---------------------------------------------------------------------------

  /**
   * Create a fresh merchant guilds state object.
   * @returns {object}
   */
  function createState() {
    return {
      guilds: {},
      routes: {},
      contracts: [],
      cargo: [],
      tariffs: {},
      memberStats: {},
      tradeLog: []
    };
  }

  // ---------------------------------------------------------------------------
  // GUILD MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Create a new merchant guild.
   * @param {object} state
   * @param {string} founderId
   * @param {string} guildTypeId
   * @param {string} name
   * @param {number} currentTick
   * @returns {{ success: boolean, guild?: object, reason?: string }}
   */
  function createGuild(state, founderId, guildTypeId, name, currentTick) {
    ensureState(state);

    if (!founderId) return { success: false, reason: 'founderId is required' };
    if (!guildTypeId) return { success: false, reason: 'guildTypeId is required' };
    if (!name || name.trim() === '') return { success: false, reason: 'Guild name is required' };

    var typeDef = findGuildType(guildTypeId);
    if (!typeDef) return { success: false, reason: 'Unknown guild type: ' + guildTypeId };

    // Check founder not already in a guild of this type
    var existing = getPlayerGuild(state, founderId);
    if (existing) {
      return { success: false, reason: founderId + ' is already a member of guild ' + existing.id };
    }

    var guildId = 'mguild_' + (++_guildCounter) + '_' + currentTick;

    var guild = {
      id: guildId,
      typeId: guildTypeId,
      name: name.trim(),
      founderId: founderId,
      members: [founderId],
      officers: [],
      createdAt: currentTick,
      totalVolume: 0,
      totalProfit: 0,
      supplyChain: [],
      status: 'active'
    };

    state.guilds[guildId] = guild;

    // Init member stats for founder
    getMemberStat(state, founderId);

    return { success: true, guild: guild };
  }

  /**
   * Join a merchant guild.
   * @param {object} state
   * @param {string} playerId
   * @param {string} guildId
   * @param {number} currentTick
   * @returns {{ success: boolean, reason?: string }}
   */
  function joinGuild(state, playerId, guildId, currentTick) {
    ensureState(state);

    if (!playerId) return { success: false, reason: 'playerId is required' };
    if (!guildId) return { success: false, reason: 'guildId is required' };

    var guild = state.guilds[guildId];
    if (!guild) return { success: false, reason: 'Guild not found: ' + guildId };
    if (guild.status !== 'active') return { success: false, reason: 'Guild is not active' };

    var typeDef = findGuildType(guild.typeId);
    if (typeDef && guild.members.length >= typeDef.maxMembers) {
      return { success: false, reason: 'Guild is full (' + typeDef.maxMembers + ' max members)' };
    }

    // Check if already in any guild
    var existing = getPlayerGuild(state, playerId);
    if (existing) {
      return { success: false, reason: playerId + ' is already in guild ' + existing.id };
    }

    guild.members.push(playerId);
    getMemberStat(state, playerId);

    return { success: true };
  }

  /**
   * Leave a merchant guild.
   * @param {object} state
   * @param {string} playerId
   * @param {string} guildId
   * @param {number} currentTick
   * @returns {{ success: boolean, reason?: string }}
   */
  function leaveGuild(state, playerId, guildId, currentTick) {
    ensureState(state);

    var guild = state.guilds[guildId];
    if (!guild) return { success: false, reason: 'Guild not found: ' + guildId };

    var idx = guild.members.indexOf(playerId);
    if (idx === -1) return { success: false, reason: playerId + ' is not a member of ' + guildId };

    // Founder cannot leave if other members exist
    if (guild.founderId === playerId && guild.members.length > 1) {
      return { success: false, reason: 'Founder cannot leave while other members remain' };
    }

    guild.members.splice(idx, 1);

    // Remove from officers if applicable
    var oidx = guild.officers.indexOf(playerId);
    if (oidx !== -1) guild.officers.splice(oidx, 1);

    // If guild is now empty, mark dissolved
    if (guild.members.length === 0) {
      guild.status = 'dissolved';
    }

    return { success: true };
  }

  /**
   * Get a guild by ID.
   * @param {object} state
   * @param {string} guildId
   * @returns {object|null}
   */
  function getGuild(state, guildId) {
    ensureState(state);
    return state.guilds[guildId] || null;
  }

  /**
   * Get all guilds of a specific type.
   * @param {object} state
   * @param {string} typeId
   * @returns {Array<object>}
   */
  function getGuildsByType(state, typeId) {
    ensureState(state);
    var result = [];
    for (var gid in state.guilds) {
      if (state.guilds[gid].typeId === typeId) {
        result.push(state.guilds[gid]);
      }
    }
    return result;
  }

  /**
   * Get the merchant guild a player belongs to.
   * @param {object} state
   * @param {string} playerId
   * @returns {object|null}
   */
  function getPlayerGuild(state, playerId) {
    ensureState(state);
    for (var gid in state.guilds) {
      var guild = state.guilds[gid];
      if (guild.members.indexOf(playerId) !== -1) {
        return guild;
      }
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // CARGO CONTRACTS
  // ---------------------------------------------------------------------------

  /**
   * Create a cargo contract for guild members to fulfill.
   * @param {object} state
   * @param {string} guildId
   * @param {string} originZone
   * @param {string} destZone
   * @param {string} itemId
   * @param {number} quantity
   * @param {number} reward     - Spark reward on completion
   * @param {number} currentTick
   * @returns {{ success: boolean, contract?: object, reason?: string }}
   */
  function createContract(state, guildId, originZone, destZone, itemId, quantity, reward, currentTick) {
    ensureState(state);

    if (!guildId) return { success: false, reason: 'guildId is required' };
    if (!originZone) return { success: false, reason: 'originZone is required' };
    if (!destZone) return { success: false, reason: 'destZone is required' };
    if (!itemId) return { success: false, reason: 'itemId is required' };
    if (!quantity || quantity <= 0) return { success: false, reason: 'quantity must be positive' };
    if (reward === undefined || reward === null || reward < 0) return { success: false, reason: 'reward must be non-negative' };

    var guild = state.guilds[guildId];
    if (!guild) return { success: false, reason: 'Guild not found: ' + guildId };
    if (guild.status !== 'active') return { success: false, reason: 'Guild is not active' };

    if (originZone === destZone) return { success: false, reason: 'Origin and destination must differ' };

    var contractId = 'mc_' + (++_contractCounter) + '_' + currentTick;

    var contract = {
      id: contractId,
      guildId: guildId,
      originZone: originZone,
      destZone: destZone,
      itemId: itemId,
      quantity: quantity,
      reward: reward,
      status: 'open',
      assignedTo: null,
      createdAt: currentTick,
      acceptedAt: null,
      completedAt: null
    };

    state.contracts.push(contract);

    return { success: true, contract: contract };
  }

  /**
   * Accept a cargo contract.
   * @param {object} state
   * @param {string} contractId
   * @param {string} playerId
   * @param {number} currentTick
   * @returns {{ success: boolean, contract?: object, reason?: string }}
   */
  function acceptContract(state, contractId, playerId, currentTick) {
    ensureState(state);

    var contract = _findContract(state, contractId);
    if (!contract) return { success: false, reason: 'Contract not found: ' + contractId };
    if (contract.status !== 'open') return { success: false, reason: 'Contract is not open (status: ' + contract.status + ')' };

    // Player must be in the guild
    var guild = state.guilds[contract.guildId];
    if (!guild) return { success: false, reason: 'Guild not found: ' + contract.guildId };
    if (guild.members.indexOf(playerId) === -1) {
      return { success: false, reason: playerId + ' is not a member of guild ' + contract.guildId };
    }

    contract.status = 'in_progress';
    contract.assignedTo = playerId;
    contract.acceptedAt = currentTick;

    return { success: true, contract: contract };
  }

  /**
   * Complete a cargo contract and award rankXP.
   * @param {object} state
   * @param {string} contractId
   * @param {number} currentTick
   * @returns {{ success: boolean, reward?: number, rankXP?: number, reason?: string }}
   */
  function completeContract(state, contractId, currentTick) {
    ensureState(state);

    var contract = _findContract(state, contractId);
    if (!contract) return { success: false, reason: 'Contract not found: ' + contractId };
    if (contract.status !== 'in_progress') {
      return { success: false, reason: 'Contract is not in progress (status: ' + contract.status + ')' };
    }

    contract.status = 'completed';
    contract.completedAt = currentTick;

    var rankXP = Math.floor(contract.reward * 0.1) + contract.quantity;

    // Update player stats
    var stats = getMemberStat(state, contract.assignedTo);
    stats.totalVolume += contract.quantity;
    stats.totalProfit += contract.reward;
    stats.contractsCompleted++;
    stats.rankXP += rankXP;

    // Update guild totals
    var guild = state.guilds[contract.guildId];
    if (guild) {
      guild.totalVolume += contract.quantity;
      guild.totalProfit += contract.reward;
    }

    // Log trade
    state.tradeLog.push({
      type: 'contract_completed',
      contractId: contractId,
      playerId: contract.assignedTo,
      guildId: contract.guildId,
      itemId: contract.itemId,
      quantity: contract.quantity,
      reward: contract.reward,
      tick: currentTick
    });

    return { success: true, reward: contract.reward, rankXP: rankXP };
  }

  /**
   * Get contracts for a guild filtered by status.
   * @param {object} state
   * @param {string} guildId
   * @param {string} [status] - If omitted, returns all statuses
   * @returns {Array<object>}
   */
  function getContracts(state, guildId, status) {
    ensureState(state);
    var result = [];
    for (var i = 0; i < state.contracts.length; i++) {
      var c = state.contracts[i];
      if (c.guildId !== guildId) continue;
      if (status && c.status !== status) continue;
      result.push(c);
    }
    return result;
  }

  /**
   * Get all contracts assigned to a player.
   * @param {object} state
   * @param {string} playerId
   * @returns {Array<object>}
   */
  function getPlayerContracts(state, playerId) {
    ensureState(state);
    var result = [];
    for (var i = 0; i < state.contracts.length; i++) {
      var c = state.contracts[i];
      if (c.assignedTo === playerId) result.push(c);
    }
    return result;
  }

  // Internal contract lookup
  function _findContract(state, contractId) {
    for (var i = 0; i < state.contracts.length; i++) {
      if (state.contracts[i].id === contractId) return state.contracts[i];
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // CARGO SHIPPING
  // ---------------------------------------------------------------------------

  /**
   * Ship cargo along a trade route. Returns cargo entry with arrival tick.
   * @param {object} state
   * @param {string} playerId
   * @param {string} routeId
   * @param {string} itemId
   * @param {number} quantity
   * @param {number} currentTick
   * @returns {{ success: boolean, cargo?: object, arrivalTick?: number, reason?: string }}
   */
  function shipCargo(state, playerId, routeId, itemId, quantity, currentTick) {
    ensureState(state);

    if (!playerId) return { success: false, reason: 'playerId is required' };
    if (!routeId) return { success: false, reason: 'routeId is required' };
    if (!itemId) return { success: false, reason: 'itemId is required' };
    if (!quantity || quantity <= 0) return { success: false, reason: 'quantity must be positive' };

    var routeDef = findTradeRoute(routeId);
    if (!routeDef) return { success: false, reason: 'Unknown trade route: ' + routeId };

    if (quantity > routeDef.capacity) {
      return { success: false, reason: 'quantity ' + quantity + ' exceeds route capacity ' + routeDef.capacity };
    }

    var arrivalTick = currentTick + routeDef.duration;

    // Determine if cargo is lost (risk check using seeded PRNG)
    var prng = mulberry32(currentTick + routeId.length + quantity);
    var roll = prng();
    var lost = roll < routeDef.risk;

    var cargoId = 'cargo_' + (++_cargoCounter) + '_' + currentTick;

    var cargo = {
      id: cargoId,
      playerId: playerId,
      routeId: routeId,
      itemId: itemId,
      quantity: quantity,
      originZone: routeDef.origin,
      destZone: routeDef.destination,
      shippedAt: currentTick,
      arrivalTick: arrivalTick,
      status: lost ? 'lost' : 'in_transit',
      arrived: false
    };

    state.cargo.push(cargo);

    // Update route stats in state
    if (!state.routes[routeId]) {
      state.routes[routeId] = {
        id: routeId,
        totalShipments: 0,
        totalVolume: 0,
        lostShipments: 0
      };
    }
    state.routes[routeId].totalShipments++;
    state.routes[routeId].totalVolume += quantity;
    if (lost) state.routes[routeId].lostShipments++;

    return { success: true, cargo: cargo, arrivalTick: arrivalTick };
  }

  /**
   * Process all cargo that has arrived by currentTick.
   * @param {object} state
   * @param {number} currentTick
   * @returns {{ arrived: Array<object> }}
   */
  function checkCargo(state, currentTick) {
    ensureState(state);

    var arrived = [];

    for (var i = 0; i < state.cargo.length; i++) {
      var cargo = state.cargo[i];
      if (cargo.arrived) continue;
      if (cargo.status === 'lost') {
        // Mark as processed so we don't keep checking it
        cargo.arrived = true;
        continue;
      }
      if (currentTick >= cargo.arrivalTick) {
        cargo.arrived = true;
        cargo.status = 'delivered';

        // Update player stats
        var stats = getMemberStat(state, cargo.playerId);
        stats.totalVolume += cargo.quantity;
        stats.cargoDelivered++;
        stats.rankXP += cargo.quantity;

        // Log trade
        state.tradeLog.push({
          type: 'cargo_arrived',
          cargoId: cargo.id,
          playerId: cargo.playerId,
          routeId: cargo.routeId,
          itemId: cargo.itemId,
          quantity: cargo.quantity,
          tick: currentTick
        });

        arrived.push(cargo);
      }
    }

    return { arrived: arrived };
  }

  // ---------------------------------------------------------------------------
  // TARIFF SYSTEM
  // ---------------------------------------------------------------------------

  /**
   * Set a guild's tariff rate for non-members.
   * @param {object} state
   * @param {string} guildId
   * @param {number} rate   - Fraction (0.0–1.0)
   * @param {number} currentTick
   * @returns {{ success: boolean, reason?: string }}
   */
  function setTariff(state, guildId, rate, currentTick) {
    ensureState(state);

    var guild = state.guilds[guildId];
    if (!guild) return { success: false, reason: 'Guild not found: ' + guildId };
    if (typeof rate !== 'number' || isNaN(rate)) return { success: false, reason: 'rate must be a number' };
    if (rate < 0) return { success: false, reason: 'rate cannot be negative' };
    if (rate > 1) return { success: false, reason: 'rate cannot exceed 1.0' };

    state.tariffs[guildId] = {
      rate: rate,
      setAt: currentTick,
      guildId: guildId
    };

    return { success: true };
  }

  /**
   * Get a guild's current tariff rate.
   * @param {object} state
   * @param {string} guildId
   * @returns {{ rate: number, setAt: number, guildId: string }|null}
   */
  function getTariff(state, guildId) {
    ensureState(state);
    return state.tariffs[guildId] || null;
  }

  // ---------------------------------------------------------------------------
  // MERCHANT RANK
  // ---------------------------------------------------------------------------

  /**
   * Get the merchant rank of a player based on their rankXP.
   * @param {object} state
   * @param {string} playerId
   * @returns {{ rank: object, rankXP: number, nextRank: object|null, xpToNext: number }}
   */
  function getMerchantRank(state, playerId) {
    ensureState(state);

    var stats = getMemberStat(state, playerId);
    var xp = stats.rankXP;
    var currentRank = findRankByVolume(xp);

    var nextRank = null;
    var xpToNext = 0;
    for (var i = 0; i < MERCHANT_RANKS.length; i++) {
      if (MERCHANT_RANKS[i].threshold > xp) {
        nextRank = MERCHANT_RANKS[i];
        xpToNext = MERCHANT_RANKS[i].threshold - xp;
        break;
      }
    }

    return {
      rank: currentRank,
      rankXP: xp,
      nextRank: nextRank,
      xpToNext: xpToNext
    };
  }

  // ---------------------------------------------------------------------------
  // SUPPLY CHAIN
  // ---------------------------------------------------------------------------

  /**
   * Get the supply chain relationships for a guild.
   * Supply chain tracks which guilds supply to and receive from this guild.
   * @param {object} state
   * @param {string} guildId
   * @returns {{ suppliers: Array<string>, consumers: Array<string>, routes: Array<object> }}
   */
  function getSupplyChain(state, guildId) {
    ensureState(state);

    var guild = state.guilds[guildId];
    if (!guild) return { suppliers: [], consumers: [], routes: [] };

    // Derive supply chain from cargo logs: guilds whose members shipped to us,
    // and guilds whose members we shipped to.
    var supplierSet = {};
    var consumerSet = {};
    var relevantRoutes = [];

    // Find which zones this guild operates in (origin or destination)
    // We use the cargo log to determine supply chain relationships
    for (var i = 0; i < state.cargo.length; i++) {
      var c = state.cargo[i];
      var shipperGuild = getPlayerGuild(state, c.playerId);
      if (!shipperGuild) continue;

      if (shipperGuild.id === guildId) {
        // We shipped to destZone — find guilds operating in destZone
        consumerSet[c.destZone] = true;
      } else if (c.destZone && guild.members.length > 0) {
        // Someone shipped to a zone where we might be — simplified: track supplier guilds
        supplierSet[shipperGuild.id] = true;
      }
    }

    // Also use the explicit supplyChain array on the guild object
    var explicitChain = guild.supplyChain || [];

    return {
      suppliers: Object.keys(supplierSet),
      consumers: Object.keys(consumerSet),
      routes: explicitChain
    };
  }

  // ---------------------------------------------------------------------------
  // LEADERBOARD & STATS
  // ---------------------------------------------------------------------------

  /**
   * Get top merchants in a guild by rankXP.
   * @param {object} state
   * @param {string} guildId
   * @param {number} count
   * @returns {Array<{ playerId: string, rankXP: number, rank: object }>}
   */
  function getGuildLeaderboard(state, guildId, count) {
    ensureState(state);

    var guild = state.guilds[guildId];
    if (!guild) return [];

    var members = guild.members;
    var entries = [];

    for (var i = 0; i < members.length; i++) {
      var pid = members[i];
      var stats = getMemberStat(state, pid);
      entries.push({
        playerId: pid,
        rankXP: stats.rankXP,
        totalVolume: stats.totalVolume,
        totalProfit: stats.totalProfit,
        contractsCompleted: stats.contractsCompleted,
        rank: findRankByVolume(stats.rankXP)
      });
    }

    entries.sort(function(a, b) { return b.rankXP - a.rankXP; });

    var limit = count || entries.length;
    return entries.slice(0, limit);
  }

  /**
   * Get aggregate stats for a guild.
   * @param {object} state
   * @param {string} guildId
   * @returns {object|null}
   */
  function getGuildStats(state, guildId) {
    ensureState(state);

    var guild = state.guilds[guildId];
    if (!guild) return null;

    var typeDef = findGuildType(guild.typeId);
    var openContracts = getContracts(state, guildId, 'open').length;
    var completedContracts = getContracts(state, guildId, 'completed').length;
    var inProgressContracts = getContracts(state, guildId, 'in_progress').length;
    var tariff = getTariff(state, guildId);

    return {
      guildId: guildId,
      name: guild.name,
      typeId: guild.typeId,
      typeName: typeDef ? typeDef.name : 'Unknown',
      memberCount: guild.members.length,
      maxMembers: typeDef ? typeDef.maxMembers : 0,
      totalVolume: guild.totalVolume,
      totalProfit: guild.totalProfit,
      openContracts: openContracts,
      completedContracts: completedContracts,
      inProgressContracts: inProgressContracts,
      tariffRate: tariff ? tariff.rate : 0,
      status: guild.status,
      createdAt: guild.createdAt
    };
  }

  // ---------------------------------------------------------------------------
  // ROUTE INFO
  // ---------------------------------------------------------------------------

  /**
   * Get info about a trade route, including accumulated runtime stats.
   * @param {object} state
   * @param {string} routeId
   * @returns {object|null}
   */
  function getRouteInfo(state, routeId) {
    ensureState(state);

    var routeDef = findTradeRoute(routeId);
    if (!routeDef) return null;

    var runtimeStats = state.routes[routeId] || {
      id: routeId,
      totalShipments: 0,
      totalVolume: 0,
      lostShipments: 0
    };

    return {
      id: routeDef.id,
      name: routeDef.name,
      origin: routeDef.origin,
      destination: routeDef.destination,
      duration: routeDef.duration,
      risk: routeDef.risk,
      goods: routeDef.goods,
      capacity: routeDef.capacity,
      totalShipments: runtimeStats.totalShipments,
      totalVolume: runtimeStats.totalVolume,
      lostShipments: runtimeStats.lostShipments,
      successRate: runtimeStats.totalShipments > 0
        ? (runtimeStats.totalShipments - runtimeStats.lostShipments) / runtimeStats.totalShipments
        : 1.0
    };
  }

  // ---------------------------------------------------------------------------
  // EXPORTS
  // ---------------------------------------------------------------------------

  exports.GUILD_TYPES          = GUILD_TYPES;
  exports.TRADE_ROUTES         = TRADE_ROUTES;
  exports.MERCHANT_RANKS       = MERCHANT_RANKS;

  exports.createState          = createState;
  exports.createGuild          = createGuild;
  exports.joinGuild            = joinGuild;
  exports.leaveGuild           = leaveGuild;
  exports.getGuild             = getGuild;
  exports.getGuildsByType      = getGuildsByType;
  exports.getPlayerGuild       = getPlayerGuild;

  exports.createContract       = createContract;
  exports.acceptContract       = acceptContract;
  exports.completeContract     = completeContract;
  exports.getContracts         = getContracts;
  exports.getPlayerContracts   = getPlayerContracts;

  exports.shipCargo            = shipCargo;
  exports.checkCargo           = checkCargo;

  exports.setTariff            = setTariff;
  exports.getTariff            = getTariff;

  exports.getMerchantRank      = getMerchantRank;
  exports.getSupplyChain       = getSupplyChain;
  exports.getGuildLeaderboard  = getGuildLeaderboard;
  exports.getGuildStats        = getGuildStats;
  exports.getRouteInfo         = getRouteInfo;

})(typeof module !== 'undefined' ? module.exports : (window.MerchantGuilds = {}));
