/**
 * market_dynamics.js — Dynamic Pricing & Supply/Demand System for ZION
 * Agora Zone Market: rolling price windows, wandering merchants, event effects.
 * Layer: after economy.js
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
  // MARKET_ITEMS — 30 tradeable items
  // ---------------------------------------------------------------------------

  var MARKET_ITEMS = [
    // --- materials ---
    { id: 'iron_ore',       name: 'Iron Ore',          category: 'materials',    basePrice: 10, minPrice: 3,   maxPrice: 50,  volatility: 0.20, supply: 100, demandDecay: 0.05 },
    { id: 'copper_ore',     name: 'Copper Ore',        category: 'materials',    basePrice: 8,  minPrice: 2,   maxPrice: 40,  volatility: 0.18, supply: 120, demandDecay: 0.05 },
    { id: 'silver_ore',     name: 'Silver Ore',        category: 'materials',    basePrice: 25, minPrice: 8,   maxPrice: 120, volatility: 0.30, supply: 60,  demandDecay: 0.04 },
    { id: 'timber',         name: 'Timber',            category: 'materials',    basePrice: 6,  minPrice: 2,   maxPrice: 30,  volatility: 0.15, supply: 150, demandDecay: 0.06 },
    { id: 'stone_block',    name: 'Stone Block',       category: 'materials',    basePrice: 4,  minPrice: 1,   maxPrice: 20,  volatility: 0.10, supply: 200, demandDecay: 0.07 },
    { id: 'silk_thread',    name: 'Silk Thread',       category: 'materials',    basePrice: 18, minPrice: 5,   maxPrice: 80,  volatility: 0.25, supply: 70,  demandDecay: 0.04 },
    // --- tools ---
    { id: 'iron_pickaxe',   name: 'Iron Pickaxe',      category: 'tools',        basePrice: 35, minPrice: 12,  maxPrice: 100, volatility: 0.15, supply: 50,  demandDecay: 0.03 },
    { id: 'fishing_rod',    name: 'Fishing Rod',       category: 'tools',        basePrice: 20, minPrice: 8,   maxPrice: 60,  volatility: 0.12, supply: 60,  demandDecay: 0.03 },
    { id: 'crafting_hammer',name: 'Crafting Hammer',   category: 'tools',        basePrice: 28, minPrice: 10,  maxPrice: 80,  volatility: 0.14, supply: 45,  demandDecay: 0.03 },
    // --- weapons ---
    { id: 'iron_sword',     name: 'Iron Sword',        category: 'weapons',      basePrice: 60, minPrice: 20,  maxPrice: 200, volatility: 0.25, supply: 40,  demandDecay: 0.02 },
    { id: 'oak_staff',      name: 'Oak Staff',         category: 'weapons',      basePrice: 45, minPrice: 15,  maxPrice: 150, volatility: 0.22, supply: 35,  demandDecay: 0.02 },
    { id: 'hunters_bow',    name: "Hunter's Bow",      category: 'weapons',      basePrice: 55, minPrice: 18,  maxPrice: 180, volatility: 0.24, supply: 38,  demandDecay: 0.02 },
    // --- armor ---
    { id: 'leather_vest',   name: 'Leather Vest',      category: 'armor',        basePrice: 40, minPrice: 15,  maxPrice: 130, volatility: 0.20, supply: 45,  demandDecay: 0.02 },
    { id: 'iron_shield',    name: 'Iron Shield',       category: 'armor',        basePrice: 50, minPrice: 18,  maxPrice: 160, volatility: 0.22, supply: 40,  demandDecay: 0.02 },
    { id: 'cloth_robes',    name: 'Cloth Robes',       category: 'armor',        basePrice: 30, minPrice: 10,  maxPrice: 100, volatility: 0.18, supply: 55,  demandDecay: 0.03 },
    // --- food ---
    { id: 'bread_loaf',     name: 'Bread Loaf',        category: 'food',         basePrice: 5,  minPrice: 1,   maxPrice: 25,  volatility: 0.12, supply: 200, demandDecay: 0.10 },
    { id: 'grilled_fish',   name: 'Grilled Fish',      category: 'food',         basePrice: 8,  minPrice: 2,   maxPrice: 35,  volatility: 0.15, supply: 120, demandDecay: 0.08 },
    { id: 'herb_bundle',    name: 'Herb Bundle',       category: 'food',         basePrice: 12, minPrice: 4,   maxPrice: 50,  volatility: 0.20, supply: 100, demandDecay: 0.07 },
    { id: 'honey_jar',      name: 'Honey Jar',         category: 'food',         basePrice: 15, minPrice: 5,   maxPrice: 60,  volatility: 0.18, supply: 80,  demandDecay: 0.06 },
    // --- potions ---
    { id: 'health_potion',  name: 'Health Potion',     category: 'potions',      basePrice: 20, minPrice: 8,   maxPrice: 80,  volatility: 0.20, supply: 70,  demandDecay: 0.05 },
    { id: 'stamina_tonic',  name: 'Stamina Tonic',     category: 'potions',      basePrice: 18, minPrice: 6,   maxPrice: 70,  volatility: 0.20, supply: 75,  demandDecay: 0.05 },
    { id: 'clarity_elixir', name: 'Clarity Elixir',    category: 'potions',      basePrice: 30, minPrice: 10,  maxPrice: 120, volatility: 0.28, supply: 50,  demandDecay: 0.04 },
    // --- decorations ---
    { id: 'carved_idol',    name: 'Carved Idol',       category: 'decorations',  basePrice: 22, minPrice: 8,   maxPrice: 90,  volatility: 0.25, supply: 55,  demandDecay: 0.03 },
    { id: 'painted_banner', name: 'Painted Banner',    category: 'decorations',  basePrice: 16, minPrice: 5,   maxPrice: 65,  volatility: 0.22, supply: 60,  demandDecay: 0.03 },
    { id: 'glass_lantern',  name: 'Glass Lantern',     category: 'decorations',  basePrice: 28, minPrice: 10,  maxPrice: 100, volatility: 0.20, supply: 50,  demandDecay: 0.03 },
    // --- rare ---
    { id: 'star_crystal',   name: 'Star Crystal',      category: 'rare',         basePrice: 100,minPrice: 40,  maxPrice: 500, volatility: 0.40, supply: 15,  demandDecay: 0.02 },
    { id: 'dragon_scale',   name: 'Dragon Scale',      category: 'rare',         basePrice: 200,minPrice: 80,  maxPrice: 1000,volatility: 0.50, supply: 8,   demandDecay: 0.01 },
    { id: 'void_shard',     name: 'Void Shard',        category: 'rare',         basePrice: 150,minPrice: 60,  maxPrice: 750, volatility: 0.45, supply: 10,  demandDecay: 0.01 },
    { id: 'ancient_coin',   name: 'Ancient Coin',      category: 'rare',         basePrice: 80, minPrice: 30,  maxPrice: 400, volatility: 0.35, supply: 20,  demandDecay: 0.02 },
    { id: 'phoenix_feather',name: 'Phoenix Feather',   category: 'rare',         basePrice: 180,minPrice: 70,  maxPrice: 900, volatility: 0.48, supply: 10,  demandDecay: 0.01 }
  ];

  // ---------------------------------------------------------------------------
  // MERCHANT_INVENTORY — 10 special wandering-merchant-only items
  // ---------------------------------------------------------------------------

  var MERCHANT_INVENTORY = [
    { id: 'enchanted_map',       name: 'Enchanted Map',        basePrice: 75,  minPrice: 30,  maxPrice: 300 },
    { id: 'travelers_cloak',     name: "Traveler's Cloak",     basePrice: 90,  minPrice: 35,  maxPrice: 350 },
    { id: 'mystic_compass',      name: 'Mystic Compass',       basePrice: 120, minPrice: 50,  maxPrice: 500 },
    { id: 'bottled_starlight',   name: 'Bottled Starlight',    basePrice: 60,  minPrice: 25,  maxPrice: 250 },
    { id: 'ancient_tome',        name: 'Ancient Tome',         basePrice: 150, minPrice: 60,  maxPrice: 600 },
    { id: 'lucky_charm',         name: 'Lucky Charm',          basePrice: 50,  minPrice: 20,  maxPrice: 200 },
    { id: 'resonance_crystal',   name: 'Resonance Crystal',    basePrice: 200, minPrice: 80,  maxPrice: 800 },
    { id: 'wanderers_journal',   name: "Wanderer's Journal",   basePrice: 45,  minPrice: 18,  maxPrice: 180 },
    { id: 'dream_essence',       name: 'Dream Essence',        basePrice: 110, minPrice: 45,  maxPrice: 450 },
    { id: 'forgotten_relic',     name: 'Forgotten Relic',      basePrice: 250, minPrice: 100, maxPrice: 1000 }
  ];

  // Merchant name pools for seeded generation
  var MERCHANT_FIRST = ['Aldric', 'Seraphina', 'Torvin', 'Mira', 'Cassian', 'Lena', 'Oryn', 'Vela', 'Dax', 'Sylva'];
  var MERCHANT_LAST  = ['the Wanderer', 'of the Road', 'Farstrider', 'Brightpack', 'the Trader', 'Swiftbarter', 'the Collector', 'Ashcloak'];

  // Price history cap per item
  var HISTORY_WINDOW = 100;

  // Buy fee (5%), sell spread (10% discount = 90% of market price)
  var BUY_FEE_RATE  = 0.05;
  var SELL_RATE     = 0.90;

  // Merchant TTL in ticks
  var MERCHANT_TTL = 100;

  // Stable threshold: < this % change considered stable
  var STABLE_THRESHOLD = 0.03;
  // Volatile threshold: std-dev / mean > this → volatile
  var VOLATILE_THRESHOLD = 0.15;

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  function clamp(val, lo, hi) {
    return val < lo ? lo : val > hi ? hi : val;
  }

  function getItemDef(itemId) {
    for (var i = 0; i < MARKET_ITEMS.length; i++) {
      if (MARKET_ITEMS[i].id === itemId) return MARKET_ITEMS[i];
    }
    return null;
  }

  function getMerchantItemDef(itemId) {
    for (var i = 0; i < MERCHANT_INVENTORY.length; i++) {
      if (MERCHANT_INVENTORY[i].id === itemId) return MERCHANT_INVENTORY[i];
    }
    return null;
  }

  // Simple deterministic noise [0,1] based on seed + tick
  function priceNoise(rng) {
    return rng() * 2 - 1; // returns -1 .. 1
  }

  // ---------------------------------------------------------------------------
  // initMarket(state)
  // ---------------------------------------------------------------------------

  function initMarket(state) {
    if (!state.market) {
      state.market = {
        prices: {},
        supply: {},
        demand: {},
        history: {},
        merchants: [],
        lastUpdate: 0
      };
    }
    var m = state.market;
    for (var i = 0; i < MARKET_ITEMS.length; i++) {
      var item = MARKET_ITEMS[i];
      if (m.prices[item.id] === undefined) {
        m.prices[item.id]  = item.basePrice;
        m.supply[item.id]  = item.supply;
        m.demand[item.id]  = item.supply; // balanced at start
        m.history[item.id] = [];
      }
    }
    return state;
  }

  // ---------------------------------------------------------------------------
  // recordTransaction(state, itemId, quantity, isBuy)
  // ---------------------------------------------------------------------------

  function recordTransaction(state, itemId, quantity, isBuy) {
    if (!state.market) initMarket(state);
    var m = state.market;
    var item = getItemDef(itemId);
    if (!item || !quantity || quantity <= 0) return state;

    var impact = quantity * 0.5; // scaled impact

    if (isBuy) {
      // Buying: increases demand, decreases supply
      m.demand[itemId] = (m.demand[itemId] || item.supply) + impact;
      m.supply[itemId] = Math.max(1, (m.supply[itemId] || item.supply) - impact);
    } else {
      // Selling: increases supply, decreases demand
      m.supply[itemId] = (m.supply[itemId] || item.supply) + impact;
      m.demand[itemId] = Math.max(1, (m.demand[itemId] || item.supply) - impact);
    }
    return state;
  }

  // ---------------------------------------------------------------------------
  // updatePrices(state, tick)
  // ---------------------------------------------------------------------------

  function updatePrices(state, tick) {
    if (!state.market) initMarket(state);
    var m = state.market;
    var rng = mulberry32(tick ^ 0xDEADBEEF);

    for (var i = 0; i < MARKET_ITEMS.length; i++) {
      var item = MARKET_ITEMS[i];
      var id = item.id;

      var supply = m.supply[id] || item.supply;
      var demand = m.demand[id] || supply;
      var ratio  = demand / supply;

      // Price formula: basePrice * ratio * (1 + volatility * noise)
      var noise    = priceNoise(rng); // -1 .. 1
      var rawPrice = item.basePrice * ratio * (1 + item.volatility * noise);
      var newPrice = Math.round(clamp(rawPrice, item.minPrice, item.maxPrice));

      m.prices[id] = newPrice;

      // Push to history, keep rolling window
      if (!m.history[id]) m.history[id] = [];
      m.history[id].push({ tick: tick, price: newPrice });
      if (m.history[id].length > HISTORY_WINDOW) {
        m.history[id].shift();
      }

      // Apply demand decay
      var decayed = (m.demand[id] || supply) * (1 - item.demandDecay);
      // Drift demand back toward supply over time
      m.demand[id] = decayed < supply ? decayed + (supply - decayed) * 0.1 : decayed;
    }

    m.lastUpdate = tick;
    return state;
  }

  // ---------------------------------------------------------------------------
  // getPrice(state, itemId)
  // ---------------------------------------------------------------------------

  function getPrice(state, itemId) {
    if (!state.market || state.market.prices[itemId] === undefined) {
      var item = getItemDef(itemId);
      return item ? item.basePrice : null;
    }
    return state.market.prices[itemId];
  }

  // ---------------------------------------------------------------------------
  // getBuyPrice(state, itemId, quantity)
  // ---------------------------------------------------------------------------

  function getBuyPrice(state, itemId, quantity) {
    var baseTotal = getPrice(state, itemId) * quantity;
    return Math.ceil(baseTotal * (1 + BUY_FEE_RATE));
  }

  // ---------------------------------------------------------------------------
  // getSellPrice(state, itemId, quantity)
  // ---------------------------------------------------------------------------

  function getSellPrice(state, itemId, quantity) {
    var baseTotal = getPrice(state, itemId) * quantity;
    return Math.floor(baseTotal * SELL_RATE);
  }

  // ---------------------------------------------------------------------------
  // getPriceTrend(state, itemId, windowSize)
  // ---------------------------------------------------------------------------

  function getPriceTrend(state, itemId, windowSize) {
    if (!state.market || !state.market.history[itemId]) return 'stable';
    var hist = state.market.history[itemId];
    var size = windowSize || 10;
    var slice = hist.slice(-size);
    if (slice.length < 2) return 'stable';

    var prices = [];
    for (var i = 0; i < slice.length; i++) {
      prices.push(slice[i].price);
    }

    // Compute mean and std-dev
    var sum = 0;
    for (var j = 0; j < prices.length; j++) sum += prices[j];
    var mean = sum / prices.length;

    var variance = 0;
    for (var k = 0; k < prices.length; k++) {
      variance += (prices[k] - mean) * (prices[k] - mean);
    }
    var stdDev = Math.sqrt(variance / prices.length);

    // Compare first and last halves to detect directional trend
    var firstHalf = prices.slice(0, Math.floor(prices.length / 2));
    var secondHalf = prices.slice(Math.floor(prices.length / 2));

    var firstSum = 0;
    for (var a = 0; a < firstHalf.length; a++) firstSum += firstHalf[a];
    var firstAvg = firstSum / firstHalf.length;

    var secondSum = 0;
    for (var b = 0; b < secondHalf.length; b++) secondSum += secondHalf[b];
    var secondAvg = secondSum / secondHalf.length;

    var change = (secondAvg - firstAvg) / firstAvg;

    // If there is a clear directional trend, report it (even if std-dev is large)
    if (change > STABLE_THRESHOLD) return 'rising';
    if (change < -STABLE_THRESHOLD) return 'falling';

    // No clear direction — check for high volatility (erratic oscillation)
    if (mean > 0 && stdDev / mean > VOLATILE_THRESHOLD) return 'volatile';

    return 'stable';
  }

  // ---------------------------------------------------------------------------
  // getPriceHistory(state, itemId, ticks)
  // ---------------------------------------------------------------------------

  function getPriceHistory(state, itemId, ticks) {
    if (!state.market || !state.market.history[itemId]) return [];
    var hist = state.market.history[itemId];
    var n = ticks || HISTORY_WINDOW;
    return hist.slice(-n);
  }

  // ---------------------------------------------------------------------------
  // getAllPrices(state)
  // ---------------------------------------------------------------------------

  function getAllPrices(state) {
    if (!state.market) return {};
    var result = {};
    for (var id in state.market.prices) {
      if (state.market.prices.hasOwnProperty(id)) {
        result[id] = state.market.prices[id];
      }
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // getTopMovers(state, count)
  // ---------------------------------------------------------------------------

  function getTopMovers(state, count) {
    if (!state.market) return [];
    var n = count || 5;
    var movers = [];

    for (var i = 0; i < MARKET_ITEMS.length; i++) {
      var item = MARKET_ITEMS[i];
      var id = item.id;
      var hist = state.market.history[id];
      if (!hist || hist.length < 2) continue;

      var oldest = hist[0].price;
      var newest = hist[hist.length - 1].price;
      var pctChange = (newest - oldest) / oldest;
      movers.push({ id: id, name: item.name, change: pctChange, currentPrice: newest });
    }

    // Sort by absolute change descending
    movers.sort(function(a, b) {
      return Math.abs(b.change) - Math.abs(a.change);
    });

    return movers.slice(0, n);
  }

  // ---------------------------------------------------------------------------
  // getCategoryPrices(state, category)
  // ---------------------------------------------------------------------------

  function getCategoryPrices(state, category) {
    var result = {};
    for (var i = 0; i < MARKET_ITEMS.length; i++) {
      var item = MARKET_ITEMS[i];
      if (item.category === category) {
        result[item.id] = getPrice(state, item.id);
      }
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // spawnMerchant(state, seed, tick)
  // ---------------------------------------------------------------------------

  function spawnMerchant(state, seed, tick) {
    if (!state.market) initMarket(state);
    var rng = mulberry32(seed ^ 0xC0FFEE);

    // Pick name
    var firstName = MERCHANT_FIRST[Math.floor(rng() * MERCHANT_FIRST.length)];
    var lastName  = MERCHANT_LAST[Math.floor(rng() * MERCHANT_LAST.length)];
    var name = firstName + ' ' + lastName;

    // Pick 3-6 items from merchant inventory
    var itemCount = 3 + Math.floor(rng() * 4);
    var pool = MERCHANT_INVENTORY.slice(); // copy
    var inventory = [];

    for (var i = 0; i < itemCount && pool.length > 0; i++) {
      var idx = Math.floor(rng() * pool.length);
      var mItem = pool.splice(idx, 1)[0];
      var qty   = 1 + Math.floor(rng() * 5);
      // Price within item range, seeded
      var priceRange = mItem.maxPrice - mItem.minPrice;
      var price = Math.round(mItem.minPrice + rng() * priceRange);
      inventory.push({
        id:       mItem.id,
        name:     mItem.name,
        quantity: qty,
        price:    price
      });
    }

    var merchant = {
      id:        'merchant_' + seed + '_' + tick,
      name:      name,
      zone:      'agora',
      inventory: inventory,
      expiresAt: tick + MERCHANT_TTL,
      spawnedAt: tick,
      seed:      seed
    };

    state.market.merchants.push(merchant);
    return state;
  }

  // ---------------------------------------------------------------------------
  // getMerchants(state)
  // ---------------------------------------------------------------------------

  function getMerchants(state) {
    if (!state.market) return [];
    // Return copy; caller must know current tick to filter expired
    return state.market.merchants.slice();
  }

  // ---------------------------------------------------------------------------
  // getActiveMerchants(state, tick) — internal + exported helper
  // ---------------------------------------------------------------------------

  function getActiveMerchants(state, tick) {
    if (!state.market) return [];
    var result = [];
    for (var i = 0; i < state.market.merchants.length; i++) {
      var m = state.market.merchants[i];
      if (m.expiresAt > tick) result.push(m);
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // buyFromMerchant(state, playerId, merchantId, itemId, quantity)
  // ---------------------------------------------------------------------------

  function buyFromMerchant(state, playerId, merchantId, itemId, quantity) {
    if (!state.market) return { success: false, reason: 'market_not_initialized' };
    var merchant = null;
    for (var i = 0; i < state.market.merchants.length; i++) {
      if (state.market.merchants[i].id === merchantId) {
        merchant = state.market.merchants[i];
        break;
      }
    }
    if (!merchant) return { success: false, reason: 'merchant_not_found' };

    var invItem = null;
    for (var j = 0; j < merchant.inventory.length; j++) {
      if (merchant.inventory[j].id === itemId) {
        invItem = merchant.inventory[j];
        break;
      }
    }
    if (!invItem) return { success: false, reason: 'item_not_in_inventory' };
    if (invItem.quantity < quantity) return { success: false, reason: 'insufficient_stock' };
    if (!quantity || quantity <= 0) return { success: false, reason: 'invalid_quantity' };

    var cost = invItem.price * quantity;
    invItem.quantity -= quantity;

    return {
      success: true,
      cost:    cost,
      item:    { id: itemId, quantity: quantity, priceEach: invItem.price }
    };
  }

  // ---------------------------------------------------------------------------
  // getMarketStats(state)
  // ---------------------------------------------------------------------------

  function getMarketStats(state) {
    if (!state.market) return { totalVolume: 0, avgPriceLevel: 0, mostTraded: [] };

    var total = 0;
    var count = 0;
    var priceIndexSum = 0;

    for (var i = 0; i < MARKET_ITEMS.length; i++) {
      var item = MARKET_ITEMS[i];
      var current = state.market.prices[item.id] || item.basePrice;
      priceIndexSum += current / item.basePrice; // ratio vs base
      count++;
      // Estimate volume from demand deviation
      var supply = state.market.supply[item.id] || item.supply;
      var demand = state.market.demand[item.id] || supply;
      total += Math.abs(demand - supply);
    }

    var avgIndex = count > 0 ? priceIndexSum / count : 1;

    // Sort by demand/supply imbalance for "most traded"
    var items = [];
    for (var k = 0; k < MARKET_ITEMS.length; k++) {
      var it = MARKET_ITEMS[k];
      var sup = state.market.supply[it.id] || it.supply;
      var dem = state.market.demand[it.id] || sup;
      items.push({ id: it.id, name: it.name, imbalance: Math.abs(dem - sup) });
    }
    items.sort(function(a, b) { return b.imbalance - a.imbalance; });

    return {
      totalVolume:  Math.round(total),
      avgPriceLevel: Math.round(avgIndex * 100) / 100,
      mostTraded:   items.slice(0, 5).map(function(x) { return x.id; })
    };
  }

  // ---------------------------------------------------------------------------
  // applyEventEffect(state, eventType, multiplier)
  // ---------------------------------------------------------------------------

  var EVENT_CATEGORIES = {
    harvest_festival:   'food',
    iron_shortage:      'materials',
    arms_tournament:    'weapons',
    plague:             'potions',
    builder_boom:       'tools',
    fashion_week:       'decorations',
    dragon_sighting:    'rare',
    armor_contest:      'armor'
  };

  function applyEventEffect(state, eventType, multiplier) {
    if (!state.market) initMarket(state);
    var category = EVENT_CATEGORIES[eventType];
    if (!category) {
      // Fallback: apply to all
      category = null;
    }

    for (var i = 0; i < MARKET_ITEMS.length; i++) {
      var item = MARKET_ITEMS[i];
      if (category !== null && item.category !== category) continue;

      var current = state.market.prices[item.id] || item.basePrice;
      var newPrice = Math.round(clamp(current * multiplier, item.minPrice, item.maxPrice));
      state.market.prices[item.id] = newPrice;
    }
    return state;
  }

  // ---------------------------------------------------------------------------
  // getSupplyDemand(state, itemId)
  // ---------------------------------------------------------------------------

  function getSupplyDemand(state, itemId) {
    if (!state.market) return null;
    var item = getItemDef(itemId);
    if (!item) return null;
    var supply = state.market.supply[itemId] || item.supply;
    var demand = state.market.demand[itemId] || supply;
    return {
      supply: supply,
      demand: demand,
      ratio:  demand / supply
    };
  }

  // ---------------------------------------------------------------------------
  // predictPrice(state, itemId, ticksAhead)
  // ---------------------------------------------------------------------------

  function predictPrice(state, itemId, ticksAhead) {
    var current = getPrice(state, itemId);
    if (current === null) return null;
    var item = getItemDef(itemId);
    if (!item) return null;

    var trend = getPriceTrend(state, itemId, 10);
    var hist  = getPriceHistory(state, itemId, 10);

    // Compute slope from history
    var slope = 0;
    if (hist.length >= 2) {
      var first = hist[0].price;
      var last  = hist[hist.length - 1].price;
      slope = (last - first) / hist.length; // price change per tick
    }

    var predicted = current + slope * (ticksAhead || 1);
    // If volatile, dampen prediction toward base
    if (trend === 'volatile') {
      predicted = current * 0.7 + item.basePrice * 0.3;
    }

    return Math.round(clamp(predicted, item.minPrice, item.maxPrice));
  }

  // ---------------------------------------------------------------------------
  // Exports
  // ---------------------------------------------------------------------------

  exports.MARKET_ITEMS       = MARKET_ITEMS;
  exports.MERCHANT_INVENTORY = MERCHANT_INVENTORY;
  exports.HISTORY_WINDOW     = HISTORY_WINDOW;
  exports.BUY_FEE_RATE       = BUY_FEE_RATE;
  exports.SELL_RATE          = SELL_RATE;
  exports.MERCHANT_TTL       = MERCHANT_TTL;

  exports.initMarket         = initMarket;
  exports.recordTransaction  = recordTransaction;
  exports.updatePrices       = updatePrices;
  exports.getPrice           = getPrice;
  exports.getBuyPrice        = getBuyPrice;
  exports.getSellPrice       = getSellPrice;
  exports.getPriceTrend      = getPriceTrend;
  exports.getPriceHistory    = getPriceHistory;
  exports.getAllPrices        = getAllPrices;
  exports.getTopMovers       = getTopMovers;
  exports.getCategoryPrices  = getCategoryPrices;
  exports.spawnMerchant      = spawnMerchant;
  exports.getMerchants       = getMerchants;
  exports.getActiveMerchants = getActiveMerchants;
  exports.buyFromMerchant    = buyFromMerchant;
  exports.getMarketStats     = getMarketStats;
  exports.applyEventEffect   = applyEventEffect;
  exports.getSupplyDemand    = getSupplyDemand;
  exports.predictPrice       = predictPrice;

})(typeof module !== 'undefined' ? module.exports : (window.MarketDynamics = {}));
