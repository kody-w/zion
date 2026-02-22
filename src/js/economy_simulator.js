/**
 * economy_simulator.js — Local Economic Forecasting Tool for ZION
 *
 * Players simulate market changes, predict price trends, test trade strategies,
 * and model scarcity. Snapshot real economy, run N ticks forward, see outcomes.
 * Pure functions, no server calls.
 *
 * Run: browser or Node.js (UMD pattern)
 */
(function(exports) {
    'use strict';

    // -------------------------------------------------------------------------
    // Seeded PRNG — mulberry32
    // -------------------------------------------------------------------------
    function mulberry32(seed) {
        var s = seed >>> 0;
        return function() {
            s += 0x6D2B79F5;
            var t = s;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    // -------------------------------------------------------------------------
    // Default market items (used when creating a fresh market state)
    // -------------------------------------------------------------------------
    var DEFAULT_ITEMS = [
        { id: 'iron_ore',      name: 'Iron Ore',      basePrice: 10,  category: 'resource',  supply: 100, demand: 80  },
        { id: 'wood_plank',    name: 'Wood Plank',    basePrice: 5,   category: 'resource',  supply: 150, demand: 120 },
        { id: 'herb_bundle',   name: 'Herb Bundle',   basePrice: 8,   category: 'resource',  supply: 80,  demand: 90  },
        { id: 'stone_block',   name: 'Stone Block',   basePrice: 4,   category: 'resource',  supply: 200, demand: 160 },
        { id: 'crystal_shard', name: 'Crystal Shard', basePrice: 50,  category: 'rare',      supply: 20,  demand: 40  },
        { id: 'fire_essence',  name: 'Fire Essence',  basePrice: 80,  category: 'rare',      supply: 15,  demand: 30  },
        { id: 'bread_loaf',    name: 'Bread Loaf',    basePrice: 6,   category: 'food',      supply: 120, demand: 100 },
        { id: 'roasted_meat',  name: 'Roasted Meat',  basePrice: 15,  category: 'food',      supply: 60,  demand: 75  },
        { id: 'steel_sword',   name: 'Steel Sword',   basePrice: 120, category: 'equipment', supply: 30,  demand: 35  },
        { id: 'leather_armor', name: 'Leather Armor', basePrice: 90,  category: 'equipment', supply: 40,  demand: 45  },
        { id: 'health_potion', name: 'Health Potion', basePrice: 25,  category: 'consumable', supply: 70, demand: 80  },
        { id: 'mana_potion',   name: 'Mana Potion',   basePrice: 30,  category: 'consumable', supply: 60, demand: 65  }
    ];

    // -------------------------------------------------------------------------
    // SIMULATION_PRESETS
    // -------------------------------------------------------------------------
    var SIMULATION_PRESETS = [
        {
            id: 'supply_shock',
            name: 'Supply Shock',
            description: 'What happens when iron ore supply drops 50%?',
            modifications: [{ itemId: 'iron_ore', field: 'supply', multiplier: 0.5 }],
            duration: 200
        },
        {
            id: 'demand_surge',
            name: 'Demand Surge',
            description: 'A crafting event doubles demand for wood and stone.',
            modifications: [
                { itemId: 'wood_plank',  field: 'demand', multiplier: 2.0 },
                { itemId: 'stone_block', field: 'demand', multiplier: 2.0 }
            ],
            duration: 150
        },
        {
            id: 'market_crash',
            name: 'Market Crash',
            description: 'Mass panic selling floods the market — all supplies surge 3x.',
            modifications: [
                { itemId: 'crystal_shard', field: 'supply', multiplier: 3.0 },
                { itemId: 'fire_essence',  field: 'supply', multiplier: 3.0 },
                { itemId: 'steel_sword',   field: 'supply', multiplier: 2.5 },
                { itemId: 'leather_armor', field: 'supply', multiplier: 2.5 }
            ],
            duration: 300
        },
        {
            id: 'guild_monopoly',
            name: 'Guild Monopoly',
            description: 'A powerful guild corners the iron and steel markets.',
            modifications: [
                { itemId: 'iron_ore',   field: 'supply', multiplier: 0.3 },
                { itemId: 'steel_sword', field: 'supply', multiplier: 0.4 }
            ],
            duration: 250
        },
        {
            id: 'new_player_flood',
            name: 'New Player Flood',
            description: 'A server event brings 200 new players — demand for basics surges.',
            modifications: [
                { itemId: 'bread_loaf',    field: 'demand', multiplier: 3.0 },
                { itemId: 'health_potion', field: 'demand', multiplier: 2.5 },
                { itemId: 'wood_plank',    field: 'demand', multiplier: 2.0 },
                { itemId: 'iron_ore',      field: 'demand', multiplier: 1.8 }
            ],
            duration: 200
        },
        {
            id: 'seasonal_harvest',
            name: 'Seasonal Harvest',
            description: 'Harvest season floods the market with food and herbs.',
            modifications: [
                { itemId: 'herb_bundle', field: 'supply', multiplier: 2.5 },
                { itemId: 'bread_loaf',  field: 'supply', multiplier: 2.0 },
                { itemId: 'roasted_meat', field: 'supply', multiplier: 1.8 }
            ],
            duration: 180
        },
        {
            id: 'trade_embargo',
            name: 'Trade Embargo',
            description: 'Federation dispute cuts rare material imports to near zero.',
            modifications: [
                { itemId: 'crystal_shard', field: 'supply', multiplier: 0.1 },
                { itemId: 'fire_essence',  field: 'supply', multiplier: 0.1 }
            ],
            duration: 350
        },
        {
            id: 'innovation_boom',
            name: 'Innovation Boom',
            description: 'New crafting recipes are discovered — demand for all resources explodes.',
            modifications: [
                { itemId: 'iron_ore',    field: 'demand', multiplier: 2.2 },
                { itemId: 'wood_plank',  field: 'demand', multiplier: 2.0 },
                { itemId: 'stone_block', field: 'demand', multiplier: 1.8 },
                { itemId: 'herb_bundle', field: 'demand', multiplier: 1.5 }
            ],
            duration: 220
        }
    ];

    // -------------------------------------------------------------------------
    // createSnapshot(marketState)
    // Deep-clone current market state for simulation.
    // -------------------------------------------------------------------------
    function createSnapshot(marketState) {
        if (!marketState) {
            // Create a default market state with all default items
            var defaultState = { items: [] };
            for (var i = 0; i < DEFAULT_ITEMS.length; i++) {
                var item = DEFAULT_ITEMS[i];
                defaultState.items.push({
                    id: item.id,
                    name: item.name,
                    basePrice: item.basePrice,
                    currentPrice: item.basePrice,
                    category: item.category,
                    supply: item.supply,
                    demand: item.demand
                });
            }
            return defaultState;
        }
        return JSON.parse(JSON.stringify(marketState));
    }

    // -------------------------------------------------------------------------
    // _applyModifications(snapshot, modifications)
    // Internal: apply preset modifications to a snapshot
    // -------------------------------------------------------------------------
    function _applyModifications(snapshot, modifications) {
        if (!modifications || !modifications.length) return;
        for (var i = 0; i < modifications.length; i++) {
            var mod = modifications[i];
            for (var j = 0; j < snapshot.items.length; j++) {
                var item = snapshot.items[j];
                if (item.id === mod.itemId) {
                    if (mod.field === 'supply') {
                        item.supply = Math.max(1, Math.round(item.supply * mod.multiplier));
                    } else if (mod.field === 'demand') {
                        item.demand = Math.max(1, Math.round(item.demand * mod.multiplier));
                    } else if (mod.field === 'price') {
                        item.currentPrice = Math.max(1, Math.round(item.currentPrice * mod.multiplier));
                    }
                    break;
                }
            }
        }
    }

    // -------------------------------------------------------------------------
    // _computePrice(item)
    // Internal: compute price from supply/demand ratio
    // -------------------------------------------------------------------------
    function _computePrice(item) {
        var ratio = item.supply > 0 ? item.demand / item.supply : 10;
        // Price = basePrice * (demand/supply)^0.5 with some floor
        var price = item.basePrice * Math.sqrt(ratio);
        if (price < 1) price = 1;
        return Math.round(price * 100) / 100;
    }

    // -------------------------------------------------------------------------
    // simulate(snapshot, modifications, ticks, seed)
    // Run simulation for N ticks with modifications applied. Pure function.
    // Returns {finalState, priceHistory: {itemId: [prices]}, events: [...], summary}
    // -------------------------------------------------------------------------
    function simulate(snapshot, modifications, ticks, seed) {
        var rng = mulberry32(seed !== undefined ? seed : 42);
        var state = createSnapshot(snapshot);
        var numTicks = ticks || 100;

        // Apply modifications
        _applyModifications(state, modifications);

        // Initialize price history
        var priceHistory = {};
        for (var i = 0; i < state.items.length; i++) {
            var item = state.items[i];
            item.currentPrice = _computePrice(item);
            priceHistory[item.id] = [item.currentPrice];
        }

        var events = [];

        // Run simulation ticks
        for (var t = 1; t <= numTicks; t++) {
            for (var j = 0; j < state.items.length; j++) {
                var it = state.items[j];

                // Supply/demand drift with small random noise
                var supplyNoise = (rng() - 0.5) * 0.05 * it.supply;
                var demandNoise = (rng() - 0.5) * 0.05 * it.demand;
                it.supply  = Math.max(1, it.supply  + supplyNoise);
                it.demand  = Math.max(1, it.demand  + demandNoise);

                // Gradual regression toward base supply/demand (market recovery)
                it.supply += (DEFAULT_ITEMS[j] ? (DEFAULT_ITEMS[j].supply - it.supply) * 0.005 : 0);
                it.demand += (DEFAULT_ITEMS[j] ? (DEFAULT_ITEMS[j].demand - it.demand) * 0.005 : 0);

                var newPrice = _computePrice(it);

                // Random shock event (1% chance per tick)
                if (rng() < 0.01) {
                    var shockDir  = rng() > 0.5 ? 1 : -1;
                    var shockMag  = 1 + rng() * 0.3;
                    newPrice = Math.max(1, newPrice * (shockDir > 0 ? shockMag : 1 / shockMag));
                    events.push({
                        tick: t,
                        itemId: it.id,
                        type: shockDir > 0 ? 'price_spike' : 'price_drop',
                        price: Math.round(newPrice * 100) / 100
                    });
                }

                it.currentPrice = Math.round(newPrice * 100) / 100;
                priceHistory[it.id].push(it.currentPrice);
            }
        }

        // Build summary
        var summary = { ticks: numTicks, itemCount: state.items.length, events: events.length };
        var biggestGain = null;
        var biggestLoss = null;
        for (var k = 0; k < state.items.length; k++) {
            var itm = state.items[k];
            var hist = priceHistory[itm.id];
            var startP = hist[0];
            var endP   = hist[hist.length - 1];
            var pct    = startP > 0 ? ((endP - startP) / startP) * 100 : 0;
            if (biggestGain === null || pct > biggestGain.changePercent) {
                biggestGain = { itemId: itm.id, changePercent: pct };
            }
            if (biggestLoss === null || pct < biggestLoss.changePercent) {
                biggestLoss = { itemId: itm.id, changePercent: pct };
            }
        }
        summary.biggestGain = biggestGain;
        summary.biggestLoss = biggestLoss;

        return { finalState: state, priceHistory: priceHistory, events: events, summary: summary };
    }

    // -------------------------------------------------------------------------
    // runPreset(marketState, presetId, seed)
    // Run a preset scenario simulation.
    // -------------------------------------------------------------------------
    function runPreset(marketState, presetId, seed) {
        var preset = getPresetById(presetId);
        if (!preset) return null;
        var snapshot = createSnapshot(marketState);
        return simulate(snapshot, preset.modifications, preset.duration, seed);
    }

    // -------------------------------------------------------------------------
    // comparePrices(before, after)
    // Return price changes: [{itemId, beforePrice, afterPrice, changePercent, trend}]
    // -------------------------------------------------------------------------
    function comparePrices(before, after) {
        if (!before || !after || !before.items || !after.items) return [];
        var result = [];
        for (var i = 0; i < before.items.length; i++) {
            var bItem = before.items[i];
            var aItem = null;
            for (var j = 0; j < after.items.length; j++) {
                if (after.items[j].id === bItem.id) {
                    aItem = after.items[j];
                    break;
                }
            }
            if (!aItem) continue;
            var bPrice = bItem.currentPrice !== undefined ? bItem.currentPrice : bItem.basePrice;
            var aPrice = aItem.currentPrice !== undefined ? aItem.currentPrice : aItem.basePrice;
            var changePct = bPrice > 0 ? ((aPrice - bPrice) / bPrice) * 100 : 0;
            var trend = changePct > 2 ? 'up' : (changePct < -2 ? 'down' : 'stable');
            result.push({
                itemId: bItem.id,
                beforePrice: bPrice,
                afterPrice: aPrice,
                changePercent: Math.round(changePct * 100) / 100,
                trend: trend
            });
        }
        return result;
    }

    // -------------------------------------------------------------------------
    // predictTrend(priceHistory, itemId, ticksAhead)
    // Linear regression on price history to predict future.
    // Returns {predictedPrice, confidence, direction}
    // -------------------------------------------------------------------------
    function predictTrend(priceHistory, itemId, ticksAhead) {
        var ahead = ticksAhead || 10;
        var hist  = priceHistory[itemId];
        if (!hist || hist.length < 2) {
            return { predictedPrice: 0, confidence: 0, direction: 'unknown' };
        }

        var n = hist.length;
        var sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        for (var i = 0; i < n; i++) {
            sumX  += i;
            sumY  += hist[i];
            sumXY += i * hist[i];
            sumX2 += i * i;
        }
        var denom = n * sumX2 - sumX * sumX;
        var slope     = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
        var intercept = (sumY - slope * sumX) / n;

        var predictedX     = n - 1 + ahead;
        var predictedPrice = slope * predictedX + intercept;
        if (predictedPrice < 0) predictedPrice = 0;
        predictedPrice = Math.round(predictedPrice * 100) / 100;

        // Confidence: based on R²
        var meanY  = sumY / n;
        var ssTot  = 0, ssRes = 0;
        for (var k = 0; k < n; k++) {
            var predicted = slope * k + intercept;
            ssTot += (hist[k] - meanY) * (hist[k] - meanY);
            ssRes += (hist[k] - predicted) * (hist[k] - predicted);
        }
        var r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
        if (r2 < 0) r2 = 0;
        var confidence = Math.round(r2 * 100) / 100;

        var direction = slope > 0.01 ? 'up' : (slope < -0.01 ? 'down' : 'stable');

        return {
            predictedPrice: predictedPrice,
            confidence: confidence,
            direction: direction
        };
    }

    // -------------------------------------------------------------------------
    // findArbitrage(state, itemIds)
    // Find items where buy price in one context < sell price in another.
    // Returns [{itemId, buyPrice, sellPrice, profit, profitPercent}]
    // -------------------------------------------------------------------------
    function findArbitrage(state, itemIds) {
        if (!state || !state.items) return [];
        var ids = itemIds || state.items.map(function(it) { return it.id; });
        var result = [];
        for (var i = 0; i < state.items.length; i++) {
            var item = state.items[i];
            if (ids.indexOf(item.id) === -1) continue;
            var price = item.currentPrice !== undefined ? item.currentPrice : item.basePrice;
            // Buy price is market price (with 2% spread), sell is base + premium if supply is low
            var buyPrice  = Math.round(price * 1.02 * 100) / 100;
            var sellPrice = item.supply < item.demand
                ? Math.round(price * 1.15 * 100) / 100   // scarcity premium
                : Math.round(price * 0.98 * 100) / 100;  // surplus discount
            var profit = sellPrice - buyPrice;
            var profitPct = buyPrice > 0 ? (profit / buyPrice) * 100 : 0;
            if (profit > 0) {
                result.push({
                    itemId: item.id,
                    buyPrice: buyPrice,
                    sellPrice: sellPrice,
                    profit: Math.round(profit * 100) / 100,
                    profitPercent: Math.round(profitPct * 100) / 100
                });
            }
        }
        return result;
    }

    // -------------------------------------------------------------------------
    // calculateROI(investAmount, itemId, holdTicks, state, seed)
    // Simulate buying, holding, selling.
    // Return {roi, finalValue, profit}
    // -------------------------------------------------------------------------
    function calculateROI(investAmount, itemId, holdTicks, state, seed) {
        var snapshot = createSnapshot(state);
        var result   = simulate(snapshot, [], holdTicks || 50, seed !== undefined ? seed : 99);
        var hist     = result.priceHistory[itemId];
        if (!hist || hist.length < 2) {
            return { roi: 0, finalValue: investAmount, profit: 0 };
        }
        var buyPrice  = hist[0];
        var sellPrice = hist[hist.length - 1];
        if (buyPrice <= 0) {
            return { roi: 0, finalValue: investAmount, profit: 0 };
        }
        var units      = investAmount / buyPrice;
        var finalValue = units * sellPrice;
        var profit     = finalValue - investAmount;
        var roi        = (profit / investAmount) * 100;
        return {
            roi: Math.round(roi * 100) / 100,
            finalValue: Math.round(finalValue * 100) / 100,
            profit: Math.round(profit * 100) / 100
        };
    }

    // -------------------------------------------------------------------------
    // getVolatilityIndex(priceHistory, itemId, window)
    // Standard deviation / mean for price volatility.
    // -------------------------------------------------------------------------
    function getVolatilityIndex(priceHistory, itemId, window) {
        var hist = priceHistory[itemId];
        if (!hist || hist.length < 2) return 0;
        var w = window || hist.length;
        var slice = hist.slice(Math.max(0, hist.length - w));
        var n   = slice.length;
        var sum = 0;
        for (var i = 0; i < n; i++) sum += slice[i];
        var mean = sum / n;
        if (mean === 0) return 0;
        var variance = 0;
        for (var j = 0; j < n; j++) {
            var diff = slice[j] - mean;
            variance += diff * diff;
        }
        variance /= n;
        var stddev = Math.sqrt(variance);
        return Math.round((stddev / mean) * 10000) / 10000;
    }

    // -------------------------------------------------------------------------
    // getCorrelation(priceHistory, itemA, itemB, window)
    // Pearson correlation coefficient between two item price histories (-1 to +1).
    // -------------------------------------------------------------------------
    function getCorrelation(priceHistory, itemA, itemB, window) {
        var histA = priceHistory[itemA];
        var histB = priceHistory[itemB];
        if (!histA || !histB || histA.length < 2 || histB.length < 2) return 0;
        var w  = window || Math.min(histA.length, histB.length);
        var aS = histA.slice(Math.max(0, histA.length - w));
        var bS = histB.slice(Math.max(0, histB.length - w));
        var n  = Math.min(aS.length, bS.length);

        var sumA = 0, sumB = 0;
        for (var i = 0; i < n; i++) {
            sumA += aS[i];
            sumB += bS[i];
        }
        var meanA = sumA / n;
        var meanB = sumB / n;

        var cov = 0, varA = 0, varB = 0;
        for (var j = 0; j < n; j++) {
            var dA = aS[j] - meanA;
            var dB = bS[j] - meanB;
            cov  += dA * dB;
            varA += dA * dA;
            varB += dB * dB;
        }
        var denom = Math.sqrt(varA * varB);
        if (denom === 0) return 0;
        return Math.round((cov / denom) * 10000) / 10000;
    }

    // -------------------------------------------------------------------------
    // getPresets()
    // -------------------------------------------------------------------------
    function getPresets() {
        return SIMULATION_PRESETS.slice();
    }

    // -------------------------------------------------------------------------
    // getPresetById(presetId)
    // -------------------------------------------------------------------------
    function getPresetById(presetId) {
        for (var i = 0; i < SIMULATION_PRESETS.length; i++) {
            if (SIMULATION_PRESETS[i].id === presetId) return SIMULATION_PRESETS[i];
        }
        return null;
    }

    // -------------------------------------------------------------------------
    // runBatchSimulation(marketState, scenarios, seed)
    // Run multiple scenarios, compare outcomes.
    // Returns [{scenarioId, summary, priceChanges}]
    // -------------------------------------------------------------------------
    function runBatchSimulation(marketState, scenarios, seed) {
        if (!scenarios || !scenarios.length) return [];
        var results = [];
        for (var i = 0; i < scenarios.length; i++) {
            var scenario = scenarios[i];
            var snapshot = createSnapshot(marketState);
            var simResult = simulate(snapshot, scenario.modifications || [], scenario.duration || 100, seed !== undefined ? seed + i : i);
            var beforeState = createSnapshot(marketState);
            // Initialize before state prices
            for (var b = 0; b < beforeState.items.length; b++) {
                beforeState.items[b].currentPrice = _computePrice(beforeState.items[b]);
            }
            var priceChanges = comparePrices(beforeState, simResult.finalState);
            results.push({
                scenarioId: scenario.id || ('scenario_' + i),
                summary: simResult.summary,
                priceChanges: priceChanges
            });
        }
        return results;
    }

    // -------------------------------------------------------------------------
    // getMarketHealthScore(state)
    // 0-100 score based on volatility, liquidity, price stability.
    // -------------------------------------------------------------------------
    function getMarketHealthScore(state) {
        if (!state || !state.items || !state.items.length) return 50;

        var totalScore = 0;
        var count = state.items.length;

        for (var i = 0; i < count; i++) {
            var item  = state.items[i];
            var price = item.currentPrice !== undefined ? item.currentPrice : item.basePrice;
            var base  = item.basePrice || 1;
            var supply = item.supply  || 1;
            var demand = item.demand  || 1;

            // Liquidity factor: how close supply is to demand
            var ratio = supply / demand;
            var liquidityScore = ratio >= 0.8 && ratio <= 1.5 ? 100 : (ratio < 0.8 ? ratio / 0.8 * 70 : Math.max(0, 100 - (ratio - 1.5) * 30));

            // Price stability: how close current price is to base
            var priceDeviation = Math.abs(price - base) / base;
            var stabilityScore = Math.max(0, 100 - priceDeviation * 100);

            totalScore += (liquidityScore + stabilityScore) / 2;
        }

        var score = totalScore / count;
        if (score > 100) score = 100;
        if (score < 0)   score = 0;
        return Math.round(score);
    }

    // -------------------------------------------------------------------------
    // suggestStrategy(state, playerId, riskTolerance)
    // Suggest buy/sell/hold based on trends.
    // riskTolerance: 'low' | 'medium' | 'high'
    // -------------------------------------------------------------------------
    function suggestStrategy(state, playerId, riskTolerance) {
        if (!state || !state.items) return [];
        var risk = riskTolerance || 'medium';
        var suggestions = [];

        for (var i = 0; i < state.items.length; i++) {
            var item  = state.items[i];
            var price = item.currentPrice !== undefined ? item.currentPrice : item.basePrice;
            var base  = item.basePrice || 1;
            var ratio = item.supply > 0 ? item.demand / item.supply : 1;

            var action, reason, confidence;

            // Determine action based on supply/demand ratio and price deviation
            if (ratio > 1.4) {
                // High demand relative to supply — prices will rise
                action = 'buy';
                reason = 'High demand vs supply — price likely to rise';
                confidence = risk === 'high' ? 0.8 : (risk === 'medium' ? 0.65 : 0.5);
            } else if (ratio < 0.7) {
                // Low demand relative to supply — prices will fall
                action = 'sell';
                reason = 'Oversupply — price likely to fall';
                confidence = risk === 'high' ? 0.8 : (risk === 'medium' ? 0.65 : 0.5);
            } else if (price < base * 0.85) {
                // Price below base — potential undervalue
                if (risk === 'high' || risk === 'medium') {
                    action = 'buy';
                    reason = 'Price below historical base — potential recovery';
                    confidence = risk === 'high' ? 0.7 : 0.55;
                } else {
                    action = 'hold';
                    reason = 'Price below base but too risky for conservative play';
                    confidence = 0.4;
                }
            } else if (price > base * 1.3) {
                // Price above base — potential overvalue
                action = 'sell';
                reason = 'Price above historical base — take profits';
                confidence = risk === 'low' ? 0.75 : 0.6;
            } else {
                action = 'hold';
                reason = 'Market stable — hold position';
                confidence = 0.6;
            }

            suggestions.push({
                itemId: item.id,
                action: action,
                reason: reason,
                confidence: Math.round(confidence * 100) / 100,
                currentPrice: price,
                basePrice: base
            });
        }

        return suggestions;
    }

    // -------------------------------------------------------------------------
    // calculateBreakeven(state, itemId, quantity, targetProfit)
    // How many ticks to hold to reach target profit.
    // -------------------------------------------------------------------------
    function calculateBreakeven(state, itemId, quantity, targetProfit) {
        if (!state || !state.items) return { ticks: -1, reachable: false };
        var item = null;
        for (var i = 0; i < state.items.length; i++) {
            if (state.items[i].id === itemId) { item = state.items[i]; break; }
        }
        if (!item) return { ticks: -1, reachable: false };

        var qty        = quantity || 1;
        var target     = targetProfit || 0;
        var buyPrice   = item.currentPrice !== undefined ? item.currentPrice : item.basePrice;
        var totalCost  = buyPrice * qty;
        var targetValue = totalCost + target;
        var targetPricePerUnit = qty > 0 ? targetValue / qty : buyPrice;

        // Simulate to find when price reaches target
        var snapshot  = createSnapshot(state);
        var simResult = simulate(snapshot, [], 500, 7);
        var hist      = simResult.priceHistory[itemId];

        if (!hist) return { ticks: -1, reachable: false };

        for (var t = 1; t < hist.length; t++) {
            if (hist[t] >= targetPricePerUnit) {
                var profit = hist[t] * qty - totalCost;
                return {
                    ticks: t,
                    reachable: true,
                    expectedPrice: Math.round(hist[t] * 100) / 100,
                    expectedProfit: Math.round(profit * 100) / 100
                };
            }
        }

        return {
            ticks: -1,
            reachable: false,
            maxPrice: Math.round(Math.max.apply(null, hist) * 100) / 100
        };
    }

    // -------------------------------------------------------------------------
    // createDefaultMarketState()
    // Helper: create a fresh default market state
    // -------------------------------------------------------------------------
    function createDefaultMarketState() {
        var state = { items: [] };
        for (var i = 0; i < DEFAULT_ITEMS.length; i++) {
            var d = DEFAULT_ITEMS[i];
            state.items.push({
                id: d.id,
                name: d.name,
                basePrice: d.basePrice,
                currentPrice: d.basePrice,
                category: d.category,
                supply: d.supply,
                demand: d.demand
            });
        }
        return state;
    }

    // -------------------------------------------------------------------------
    // Exports
    // -------------------------------------------------------------------------
    exports.SIMULATION_PRESETS = SIMULATION_PRESETS;
    exports.DEFAULT_ITEMS = DEFAULT_ITEMS;
    exports.createSnapshot = createSnapshot;
    exports.simulate = simulate;
    exports.runPreset = runPreset;
    exports.comparePrices = comparePrices;
    exports.predictTrend = predictTrend;
    exports.findArbitrage = findArbitrage;
    exports.calculateROI = calculateROI;
    exports.getVolatilityIndex = getVolatilityIndex;
    exports.getCorrelation = getCorrelation;
    exports.getPresets = getPresets;
    exports.getPresetById = getPresetById;
    exports.runBatchSimulation = runBatchSimulation;
    exports.getMarketHealthScore = getMarketHealthScore;
    exports.suggestStrategy = suggestStrategy;
    exports.calculateBreakeven = calculateBreakeven;
    exports.createDefaultMarketState = createDefaultMarketState;
    exports.mulberry32 = mulberry32;

})(typeof module !== 'undefined' ? module.exports : (window.EconomySimulator = {}));
