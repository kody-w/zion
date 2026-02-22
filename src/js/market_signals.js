/**
 * market_signals.js — Real-time Market Data, Price Trends & Alerts for ZION
 * Rolling price history, volatility indices, sentiment, arbitrage detection.
 * Layer: after economy.js / market_dynamics.js
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
  // TRACKED_ITEMS — 25 items with base prices
  // ---------------------------------------------------------------------------

  var TRACKED_ITEMS = [
    { id: 'iron_ore',        name: 'Iron Ore',        category: 'materials',   basePrice: 10  },
    { id: 'copper_ore',      name: 'Copper Ore',      category: 'materials',   basePrice: 8   },
    { id: 'silver_ore',      name: 'Silver Ore',      category: 'materials',   basePrice: 25  },
    { id: 'timber',          name: 'Timber',          category: 'materials',   basePrice: 6   },
    { id: 'stone_block',     name: 'Stone Block',     category: 'materials',   basePrice: 4   },
    { id: 'silk_thread',     name: 'Silk Thread',     category: 'materials',   basePrice: 18  },
    { id: 'iron_pickaxe',    name: 'Iron Pickaxe',    category: 'tools',       basePrice: 35  },
    { id: 'fishing_rod',     name: 'Fishing Rod',     category: 'tools',       basePrice: 20  },
    { id: 'crafting_hammer', name: 'Crafting Hammer', category: 'tools',       basePrice: 28  },
    { id: 'iron_sword',      name: 'Iron Sword',      category: 'weapons',     basePrice: 60  },
    { id: 'oak_staff',       name: 'Oak Staff',       category: 'weapons',     basePrice: 45  },
    { id: 'hunters_bow',     name: "Hunter's Bow",    category: 'weapons',     basePrice: 55  },
    { id: 'leather_vest',    name: 'Leather Vest',    category: 'armor',       basePrice: 40  },
    { id: 'iron_shield',     name: 'Iron Shield',     category: 'armor',       basePrice: 50  },
    { id: 'bread_loaf',      name: 'Bread Loaf',      category: 'food',        basePrice: 5   },
    { id: 'grilled_fish',    name: 'Grilled Fish',    category: 'food',        basePrice: 8   },
    { id: 'herb_bundle',     name: 'Herb Bundle',     category: 'food',        basePrice: 12  },
    { id: 'honey_jar',       name: 'Honey Jar',       category: 'food',        basePrice: 15  },
    { id: 'health_potion',   name: 'Health Potion',   category: 'potions',     basePrice: 20  },
    { id: 'stamina_tonic',   name: 'Stamina Tonic',   category: 'potions',     basePrice: 18  },
    { id: 'clarity_elixir',  name: 'Clarity Elixir',  category: 'potions',     basePrice: 30  },
    { id: 'carved_idol',     name: 'Carved Idol',     category: 'decorations', basePrice: 22  },
    { id: 'painted_banner',  name: 'Painted Banner',  category: 'decorations', basePrice: 16  },
    { id: 'star_crystal',    name: 'Star Crystal',    category: 'rare',        basePrice: 100 },
    { id: 'dragon_scale',    name: 'Dragon Scale',    category: 'rare',        basePrice: 200 }
  ];

  // Canonical zone list
  var ZONES = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];

  // Maximum rolling ticks of price history kept per (item, zone) pair
  var MAX_HISTORY_TICKS = 30;

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  function itemKey(itemId, zone) {
    return itemId + ':' + zone;
  }

  function getItemById(itemId) {
    for (var i = 0; i < TRACKED_ITEMS.length; i++) {
      if (TRACKED_ITEMS[i].id === itemId) return TRACKED_ITEMS[i];
    }
    return null;
  }

  function basePrice(itemId) {
    var item = getItemById(itemId);
    return item ? item.basePrice : 0;
  }

  // Ensure history array exists for key
  function ensureHistory(state, key) {
    if (!state.priceHistory[key]) state.priceHistory[key] = [];
  }

  // Ensure volume buckets exist for key
  function ensureVolumes(state, key) {
    if (!state.volumes[key]) state.volumes[key] = { buyVolume: 0, sellVolume: 0, ticks: {} };
  }

  // Ensure sentiments entry exists for itemId
  function ensureSentiment(state, itemId) {
    if (!state.sentiments[itemId]) {
      state.sentiments[itemId] = { sentiment: 'neutral', confidence: 0, trend: 'flat' };
    }
  }

  // Compute sentiment from price history across all zones
  function computeSentiment(state, itemId) {
    var allPrices = [];
    for (var z = 0; z < ZONES.length; z++) {
      var key = itemKey(itemId, ZONES[z]);
      var hist = state.priceHistory[key];
      if (hist && hist.length > 0) {
        for (var h = 0; h < hist.length; h++) {
          allPrices.push({ tick: hist[h].tick, price: hist[h].price });
        }
      }
    }
    if (allPrices.length < 2) {
      return { sentiment: 'neutral', confidence: 0, trend: 'flat' };
    }
    // Sort by tick ascending
    allPrices.sort(function(a, b) { return a.tick - b.tick; });

    var first = allPrices[0].price;
    var last = allPrices[allPrices.length - 1].price;
    var base = basePrice(itemId) || 1;
    var changePercent = (last - first) / (first || base) * 100;

    var sentiment, trend;
    if (changePercent > 5) {
      sentiment = 'bullish';
      trend = 'rising';
    } else if (changePercent < -5) {
      sentiment = 'bearish';
      trend = 'falling';
    } else {
      sentiment = 'neutral';
      trend = 'flat';
    }

    // Confidence: how strong is the move relative to base
    var confidence = Math.min(1, Math.abs(changePercent) / 30);

    return { sentiment: sentiment, confidence: confidence, trend: trend };
  }

  // Recalculate and store sentiment
  function updateSentiment(state, itemId) {
    state.sentiments[itemId] = computeSentiment(state, itemId);
  }

  // Check a single alert against the current price in its zone
  function evaluateAlert(alert, currentPrice) {
    if (alert.direction === 'above') {
      return currentPrice >= alert.targetPrice;
    } else if (alert.direction === 'below') {
      return currentPrice <= alert.targetPrice;
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // createState
  // ---------------------------------------------------------------------------

  /**
   * Returns a fresh market signals state object.
   * priceHistory keys: "itemId:zone" → [{tick, price, volume}]
   * volumes keys: "itemId:zone" → {buyVolume, sellVolume, ticks: {tickNo: {buy, sell}}}
   * alerts: [{alertId, playerId, itemId, targetPrice, direction, zone, active, createdTick}]
   * sentiments: {itemId: {sentiment, confidence, trend}}
   * tradeLog: [{id, itemId, zone, price, quantity, isBuy, tick}]
   */
  function createState() {
    return {
      priceHistory: {},
      volumes: {},
      alerts: [],
      sentiments: {},
      tradeLog: [],
      _alertCounter: 0,
      _tradeCounter: 0
    };
  }

  // ---------------------------------------------------------------------------
  // recordTrade
  // ---------------------------------------------------------------------------

  /**
   * Records a trade event. Updates price history, volumes, sentiments, checks alerts.
   * @param {Object} state
   * @param {string} itemId
   * @param {string} zone
   * @param {number} price
   * @param {number} quantity
   * @param {boolean} isBuy  — true if this is a buy order (buyer perspective)
   * @param {number} currentTick
   * @returns {{success: boolean, alerts: Array}}
   */
  function recordTrade(state, itemId, zone, price, quantity, isBuy, currentTick) {
    if (!getItemById(itemId)) return { success: false, alerts: [] };
    if (price <= 0 || quantity <= 0) return { success: false, alerts: [] };

    var key = itemKey(itemId, zone);

    // -- Price history --
    ensureHistory(state, key);
    var hist = state.priceHistory[key];
    // Add entry
    hist.push({ tick: currentTick, price: price, volume: quantity });
    // Trim to MAX_HISTORY_TICKS most recent unique ticks
    // Keep only the last 30 entries (rolling window)
    if (hist.length > MAX_HISTORY_TICKS) {
      state.priceHistory[key] = hist.slice(hist.length - MAX_HISTORY_TICKS);
    }

    // -- Volumes --
    ensureVolumes(state, key);
    var vol = state.volumes[key];
    if (isBuy) {
      vol.buyVolume += quantity;
    } else {
      vol.sellVolume += quantity;
    }
    if (!vol.ticks[currentTick]) {
      vol.ticks[currentTick] = { buy: 0, sell: 0 };
    }
    if (isBuy) {
      vol.ticks[currentTick].buy += quantity;
    } else {
      vol.ticks[currentTick].sell += quantity;
    }

    // -- Trade log --
    state._tradeCounter = (state._tradeCounter || 0) + 1;
    state.tradeLog.push({
      id: 'trade_' + state._tradeCounter,
      itemId: itemId,
      zone: zone,
      price: price,
      quantity: quantity,
      isBuy: isBuy,
      tick: currentTick
    });

    // -- Sentiment --
    ensureSentiment(state, itemId);
    updateSentiment(state, itemId);

    // -- Check alerts --
    var triggered = checkAlerts(state, currentTick);

    return { success: true, alerts: triggered.triggered };
  }

  // ---------------------------------------------------------------------------
  // getPriceHistory
  // ---------------------------------------------------------------------------

  /**
   * Returns up to `ticks` recent data points for itemId in zone.
   * Each entry: {tick, price, volume}
   */
  function getPriceHistory(state, itemId, zone, ticks) {
    var key = itemKey(itemId, zone);
    var hist = state.priceHistory[key];
    if (!hist || hist.length === 0) return [];
    var limit = ticks != null ? ticks : MAX_HISTORY_TICKS;
    if (hist.length <= limit) return hist.slice();
    return hist.slice(hist.length - limit);
  }

  // ---------------------------------------------------------------------------
  // getCurrentPrice
  // ---------------------------------------------------------------------------

  /**
   * Returns the latest recorded price for itemId in zone, or base price if none.
   */
  function getCurrentPrice(state, itemId, zone) {
    var key = itemKey(itemId, zone);
    var hist = state.priceHistory[key];
    if (!hist || hist.length === 0) return basePrice(itemId);
    return hist[hist.length - 1].price;
  }

  // ---------------------------------------------------------------------------
  // getVolatilityIndex
  // ---------------------------------------------------------------------------

  /**
   * Computes volatility from the rolling price history for itemId in zone.
   * Uses standard deviation of price changes as a percent of base price.
   * Returns {index (0-1+), label, changePercent}
   */
  function getVolatilityIndex(state, itemId, zone) {
    var key = itemKey(itemId, zone);
    var hist = state.priceHistory[key];
    var base = basePrice(itemId) || 1;

    if (!hist || hist.length < 2) {
      return { index: 0, label: 'stable', changePercent: 0 };
    }

    // Compute percent changes tick-to-tick
    var changes = [];
    for (var i = 1; i < hist.length; i++) {
      var prev = hist[i - 1].price || base;
      var curr = hist[i].price;
      changes.push((curr - prev) / prev * 100);
    }

    // Overall change percent from first to last
    var first = hist[0].price || base;
    var last = hist[hist.length - 1].price;
    var changePercent = Math.abs((last - first) / first * 100);

    // Standard deviation of changes
    var mean = 0;
    for (var j = 0; j < changes.length; j++) mean += changes[j];
    mean /= changes.length;
    var variance = 0;
    for (var k = 0; k < changes.length; k++) {
      variance += (changes[k] - mean) * (changes[k] - mean);
    }
    variance /= changes.length;
    var stdDev = Math.sqrt(variance);

    // Use max(changePercent, stdDev) as the primary volatility signal
    var signal = Math.max(changePercent, stdDev);

    var label;
    if (signal < 5) {
      label = 'stable';
    } else if (signal < 15) {
      label = 'rising';
    } else if (signal < 30) {
      label = 'volatile';
    } else {
      label = 'extreme';
    }

    return {
      index: signal / 100,
      label: label,
      changePercent: changePercent
    };
  }

  // ---------------------------------------------------------------------------
  // getSentiment
  // ---------------------------------------------------------------------------

  /**
   * Returns sentiment for itemId across all zones.
   * {sentiment: 'bullish'|'bearish'|'neutral', confidence: 0-1, trend: 'rising'|'falling'|'flat'}
   */
  function getSentiment(state, itemId) {
    ensureSentiment(state, itemId);
    return state.sentiments[itemId];
  }

  // ---------------------------------------------------------------------------
  // getMovingAverage
  // ---------------------------------------------------------------------------

  /**
   * Computes simple moving average of price over last `window` data points in zone.
   * Returns the average, or base price if insufficient data.
   */
  function getMovingAverage(state, itemId, zone, window) {
    var key = itemKey(itemId, zone);
    var hist = state.priceHistory[key];
    var base = basePrice(itemId);
    if (!hist || hist.length === 0) return base;
    var slice = hist.length <= window ? hist : hist.slice(hist.length - window);
    var sum = 0;
    for (var i = 0; i < slice.length; i++) sum += slice[i].price;
    return sum / slice.length;
  }

  // ---------------------------------------------------------------------------
  // setAlert
  // ---------------------------------------------------------------------------

  /**
   * Registers a price alert for a player.
   * direction: 'above' | 'below'
   * Returns {success, alertId}
   */
  function setAlert(state, playerId, itemId, targetPrice, direction, zone) {
    if (!getItemById(itemId)) return { success: false, alertId: null };
    if (direction !== 'above' && direction !== 'below') return { success: false, alertId: null };
    if (targetPrice <= 0) return { success: false, alertId: null };

    state._alertCounter = (state._alertCounter || 0) + 1;
    var alertId = 'alert_' + state._alertCounter;

    state.alerts.push({
      alertId: alertId,
      playerId: playerId,
      itemId: itemId,
      targetPrice: targetPrice,
      direction: direction,
      zone: zone || null,
      active: true,
      createdTick: 0
    });

    return { success: true, alertId: alertId };
  }

  // ---------------------------------------------------------------------------
  // removeAlert
  // ---------------------------------------------------------------------------

  /**
   * Deactivates and removes an alert by alertId.
   * Returns {success}
   */
  function removeAlert(state, alertId) {
    for (var i = 0; i < state.alerts.length; i++) {
      if (state.alerts[i].alertId === alertId) {
        state.alerts.splice(i, 1);
        return { success: true };
      }
    }
    return { success: false };
  }

  // ---------------------------------------------------------------------------
  // checkAlerts
  // ---------------------------------------------------------------------------

  /**
   * Evaluates all active alerts against current prices.
   * Returns {triggered: [{alertId, playerId, itemId, price}]}
   * Triggered alerts are removed from state.alerts.
   */
  function checkAlerts(state, currentTick) {
    var triggered = [];
    var remaining = [];

    for (var i = 0; i < state.alerts.length; i++) {
      var alert = state.alerts[i];
      if (!alert.active) { remaining.push(alert); continue; }

      // Determine price: zone-specific or best price across all zones
      var price;
      if (alert.zone) {
        price = getCurrentPrice(state, alert.itemId, alert.zone);
      } else {
        // Check all zones; trigger if any zone satisfies
        var zonePrices = [];
        for (var z = 0; z < ZONES.length; z++) {
          zonePrices.push(getCurrentPrice(state, alert.itemId, ZONES[z]));
        }
        // For above: take max price; for below: take min price
        if (alert.direction === 'above') {
          price = Math.max.apply(null, zonePrices);
        } else {
          price = Math.min.apply(null, zonePrices);
        }
      }

      if (evaluateAlert(alert, price)) {
        triggered.push({
          alertId: alert.alertId,
          playerId: alert.playerId,
          itemId: alert.itemId,
          price: price,
          tick: currentTick
        });
        // Remove triggered alert (do not keep in remaining)
      } else {
        remaining.push(alert);
      }
    }

    state.alerts = remaining;
    return { triggered: triggered };
  }

  // ---------------------------------------------------------------------------
  // getPlayerAlerts
  // ---------------------------------------------------------------------------

  /**
   * Returns all active alerts for a given player.
   */
  function getPlayerAlerts(state, playerId) {
    var result = [];
    for (var i = 0; i < state.alerts.length; i++) {
      if (state.alerts[i].playerId === playerId && state.alerts[i].active) {
        result.push(state.alerts[i]);
      }
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // getTrendReport
  // ---------------------------------------------------------------------------

  /**
   * Returns top gainers, top losers, and shortage items for a zone.
   * Gainers/losers: top 5 by price change percent vs base price.
   * Shortages: items where sell volume < buy volume in recent window.
   */
  function getTrendReport(state, zone) {
    var gainers = [];
    var losers = [];
    var shortages = [];

    for (var i = 0; i < TRACKED_ITEMS.length; i++) {
      var item = TRACKED_ITEMS[i];
      var key = itemKey(item.id, zone);
      var hist = state.priceHistory[key];
      var base = item.basePrice;

      var currentPrice = getCurrentPrice(state, item.id, zone);
      var changePercent = (currentPrice - base) / base * 100;

      gainers.push({ itemId: item.id, name: item.name, changePercent: changePercent, currentPrice: currentPrice });

      // Check shortage: if there's more buy volume than sell volume
      var vol = state.volumes[key];
      if (vol && vol.buyVolume > vol.sellVolume) {
        shortages.push({ itemId: item.id, name: item.name, buyVolume: vol.buyVolume, sellVolume: vol.sellVolume });
      }
    }

    // Sort gainers descending
    gainers.sort(function(a, b) { return b.changePercent - a.changePercent; });
    losers = gainers.slice().sort(function(a, b) { return a.changePercent - b.changePercent; });

    return {
      gainers: gainers.slice(0, 5),
      losers: losers.slice(0, 5),
      shortages: shortages
    };
  }

  // ---------------------------------------------------------------------------
  // findArbitrage
  // ---------------------------------------------------------------------------

  /**
   * Detects profitable price differentials between zones.
   * Returns [{itemId, buyZone, sellZone, profit, profitPercent}]
   * Only reports pairs with profitPercent > 5%.
   */
  function findArbitrage(state) {
    var opportunities = [];

    for (var i = 0; i < TRACKED_ITEMS.length; i++) {
      var item = TRACKED_ITEMS[i];

      // Get prices in every zone
      var zonePrices = [];
      for (var z = 0; z < ZONES.length; z++) {
        var p = getCurrentPrice(state, item.id, ZONES[z]);
        zonePrices.push({ zone: ZONES[z], price: p });
      }

      // Find min and max
      var minEntry = zonePrices[0];
      var maxEntry = zonePrices[0];
      for (var j = 1; j < zonePrices.length; j++) {
        if (zonePrices[j].price < minEntry.price) minEntry = zonePrices[j];
        if (zonePrices[j].price > maxEntry.price) maxEntry = zonePrices[j];
      }

      if (minEntry.zone === maxEntry.zone) continue;
      var profit = maxEntry.price - minEntry.price;
      var profitPercent = (profit / minEntry.price) * 100;

      if (profitPercent > 5) {
        opportunities.push({
          itemId: item.id,
          buyZone: minEntry.zone,
          sellZone: maxEntry.zone,
          profit: profit,
          profitPercent: profitPercent
        });
      }
    }

    // Sort by profitPercent descending
    opportunities.sort(function(a, b) { return b.profitPercent - a.profitPercent; });
    return opportunities;
  }

  // ---------------------------------------------------------------------------
  // getVolumeReport
  // ---------------------------------------------------------------------------

  /**
   * Returns buy/sell volumes per item for a zone over the last `ticks` ticks.
   * Returns [{itemId, name, buyVolume, sellVolume, netVolume}]
   */
  function getVolumeReport(state, zone, ticks) {
    var report = [];
    for (var i = 0; i < TRACKED_ITEMS.length; i++) {
      var item = TRACKED_ITEMS[i];
      var key = itemKey(item.id, zone);
      var vol = state.volumes[key];
      var buyVol = 0;
      var sellVol = 0;

      if (vol) {
        if (ticks != null) {
          // Sum only the last `ticks` tick entries
          var tickKeys = Object.keys(vol.ticks).map(Number).sort(function(a, b) { return b - a; });
          var counted = 0;
          for (var t = 0; t < tickKeys.length && counted < ticks; t++, counted++) {
            var tickData = vol.ticks[tickKeys[t]];
            buyVol += tickData.buy;
            sellVol += tickData.sell;
          }
        } else {
          buyVol = vol.buyVolume;
          sellVol = vol.sellVolume;
        }
      }

      report.push({
        itemId: item.id,
        name: item.name,
        buyVolume: buyVol,
        sellVolume: sellVol,
        netVolume: buyVol - sellVol
      });
    }
    return report;
  }

  // ---------------------------------------------------------------------------
  // getMarketOverview
  // ---------------------------------------------------------------------------

  /**
   * Returns global market summary statistics.
   */
  function getMarketOverview(state) {
    var totalTrades = state.tradeLog.length;
    var totalVolume = 0;
    var totalValue = 0;
    var activeAlerts = state.alerts.filter(function(a) { return a.active; }).length;

    for (var i = 0; i < state.tradeLog.length; i++) {
      var trade = state.tradeLog[i];
      totalVolume += trade.quantity;
      totalValue += trade.price * trade.quantity;
    }

    var avgPrice = totalVolume > 0 ? totalValue / totalVolume : 0;

    // Count items tracked (those with any price history)
    var trackedCount = 0;
    for (var key in state.priceHistory) {
      if (state.priceHistory[key] && state.priceHistory[key].length > 0) trackedCount++;
    }

    // Bullish / bearish counts
    var bullishCount = 0;
    var bearishCount = 0;
    var neutralCount = 0;
    for (var itemId in state.sentiments) {
      var s = state.sentiments[itemId];
      if (s.sentiment === 'bullish') bullishCount++;
      else if (s.sentiment === 'bearish') bearishCount++;
      else neutralCount++;
    }

    return {
      totalTrades: totalTrades,
      totalVolume: totalVolume,
      totalValue: totalValue,
      avgPrice: avgPrice,
      activeAlerts: activeAlerts,
      trackedMarkets: trackedCount,
      bullishItems: bullishCount,
      bearishItems: bearishCount,
      neutralItems: neutralCount
    };
  }

  // ---------------------------------------------------------------------------
  // getItemReport
  // ---------------------------------------------------------------------------

  /**
   * Returns a detailed market report for one item across all zones.
   */
  function getItemReport(state, itemId) {
    var item = getItemById(itemId);
    if (!item) return null;

    var zoneData = [];
    for (var z = 0; z < ZONES.length; z++) {
      var zone = ZONES[z];
      var key = itemKey(itemId, zone);
      var hist = state.priceHistory[key];
      var vol = state.volumes[key];
      var currentPrice = getCurrentPrice(state, itemId, zone);
      var volatility = getVolatilityIndex(state, itemId, zone);
      var ma5 = getMovingAverage(state, itemId, zone, 5);
      var ma10 = getMovingAverage(state, itemId, zone, 10);
      var ma20 = getMovingAverage(state, itemId, zone, 20);

      zoneData.push({
        zone: zone,
        currentPrice: currentPrice,
        basePrice: item.basePrice,
        changePercent: (currentPrice - item.basePrice) / item.basePrice * 100,
        volatility: volatility,
        ma5: ma5,
        ma10: ma10,
        ma20: ma20,
        buyVolume: vol ? vol.buyVolume : 0,
        sellVolume: vol ? vol.sellVolume : 0,
        historyLength: hist ? hist.length : 0
      });
    }

    var sentiment = getSentiment(state, itemId);

    return {
      itemId: itemId,
      name: item.name,
      category: item.category,
      basePrice: item.basePrice,
      sentiment: sentiment,
      zones: zoneData
    };
  }

  // ---------------------------------------------------------------------------
  // getTopTraded
  // ---------------------------------------------------------------------------

  /**
   * Returns the `count` most traded items in a zone by total volume.
   */
  function getTopTraded(state, zone, count) {
    var volumes = [];
    for (var i = 0; i < TRACKED_ITEMS.length; i++) {
      var item = TRACKED_ITEMS[i];
      var key = itemKey(item.id, zone);
      var vol = state.volumes[key];
      var totalVol = vol ? (vol.buyVolume + vol.sellVolume) : 0;
      volumes.push({ itemId: item.id, name: item.name, totalVolume: totalVol });
    }
    volumes.sort(function(a, b) { return b.totalVolume - a.totalVolume; });
    return volumes.slice(0, count || 5);
  }

  // ---------------------------------------------------------------------------
  // getZoneMarketHealth
  // ---------------------------------------------------------------------------

  /**
   * Returns a health score 0-100 for a zone's market.
   * Based on: volume activity, price stability, alert pressure, trade count.
   */
  function getZoneMarketHealth(state, zone) {
    var totalBuy = 0;
    var totalSell = 0;
    var activeItems = 0;
    var volatileItems = 0;

    for (var i = 0; i < TRACKED_ITEMS.length; i++) {
      var item = TRACKED_ITEMS[i];
      var key = itemKey(item.id, zone);
      var vol = state.volumes[key];
      var hist = state.priceHistory[key];

      if (hist && hist.length > 0) activeItems++;
      if (vol) {
        totalBuy += vol.buyVolume;
        totalSell += vol.sellVolume;
      }

      var vi = getVolatilityIndex(state, item.id, zone);
      if (vi.label === 'volatile' || vi.label === 'extreme') volatileItems++;
    }

    // Score components (0-100 each)
    // Activity: more is better (up to 1000 total volume = 100%)
    var activityScore = Math.min(100, (totalBuy + totalSell) / 10);

    // Balance: buy/sell balance near 1:1 is healthy
    var totalVol = totalBuy + totalSell;
    var balanceScore;
    if (totalVol === 0) {
      balanceScore = 50;
    } else {
      var ratio = Math.min(totalBuy, totalSell) / Math.max(totalBuy, totalSell);
      balanceScore = ratio * 100;
    }

    // Coverage: how many of 25 items have any trades
    var coverageScore = (activeItems / TRACKED_ITEMS.length) * 100;

    // Stability: penalize volatile items
    var stabilityScore = 100 - (volatileItems / TRACKED_ITEMS.length * 100);

    // Weighted average
    var health = (activityScore * 0.3) + (balanceScore * 0.2) + (coverageScore * 0.3) + (stabilityScore * 0.2);
    return Math.round(Math.max(0, Math.min(100, health)));
  }

  // ---------------------------------------------------------------------------
  // getTradeLog
  // ---------------------------------------------------------------------------

  /**
   * Returns recent trades for an item (or all items if itemId is null).
   * Returns the last `count` trades in reverse-chronological order.
   */
  function getTradeLog(state, itemId, count) {
    var filtered;
    if (itemId) {
      filtered = state.tradeLog.filter(function(t) { return t.itemId === itemId; });
    } else {
      filtered = state.tradeLog.slice();
    }
    // Most recent first
    filtered.sort(function(a, b) { return b.tick - a.tick; });
    return count != null ? filtered.slice(0, count) : filtered;
  }

  // ---------------------------------------------------------------------------
  // Exports
  // ---------------------------------------------------------------------------

  exports.TRACKED_ITEMS = TRACKED_ITEMS;
  exports.ZONES = ZONES;
  exports.MAX_HISTORY_TICKS = MAX_HISTORY_TICKS;
  exports.mulberry32 = mulberry32;
  exports.createState = createState;
  exports.recordTrade = recordTrade;
  exports.getPriceHistory = getPriceHistory;
  exports.getCurrentPrice = getCurrentPrice;
  exports.getVolatilityIndex = getVolatilityIndex;
  exports.getSentiment = getSentiment;
  exports.getMovingAverage = getMovingAverage;
  exports.setAlert = setAlert;
  exports.removeAlert = removeAlert;
  exports.checkAlerts = checkAlerts;
  exports.getPlayerAlerts = getPlayerAlerts;
  exports.getTrendReport = getTrendReport;
  exports.findArbitrage = findArbitrage;
  exports.getVolumeReport = getVolumeReport;
  exports.getMarketOverview = getMarketOverview;
  exports.getItemReport = getItemReport;
  exports.getTopTraded = getTopTraded;
  exports.getZoneMarketHealth = getZoneMarketHealth;
  exports.getTradeLog = getTradeLog;

})(typeof module !== 'undefined' ? module.exports : (window.MarketSignals = {}));
