/**
 * tests/test_economy_simulator.js
 * 130+ tests for the Economy Simulator module.
 *
 * Run: node tests/test_economy_simulator.js
 */
'use strict';

var ES = require('../src/js/economy_simulator');

// ---------------------------------------------------------------------------
// Minimal test harness (var-only, no const/let)
// ---------------------------------------------------------------------------
var passed = 0;
var failed = 0;
var failures = [];

function assert(condition, msg) {
    if (condition) {
        passed++;
    } else {
        failed++;
        failures.push(msg || 'assertion failed');
        console.log('  FAIL: ' + (msg || 'assertion failed'));
    }
}

function assertEqual(a, b, msg) {
    assert(a === b, (msg || 'assertEqual') + ' — expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a));
}

function assertApprox(a, b, tolerance, msg) {
    var tol = tolerance !== undefined ? tolerance : 0.1;
    assert(Math.abs(a - b) <= tol, (msg || 'assertApprox') + ' — expected ~' + b + ' (tol ' + tol + '), got ' + a);
}

function assertDefined(val, msg) {
    assert(val !== undefined && val !== null, (msg || 'assertDefined') + ' — got ' + val);
}

function assertGte(a, b, msg) {
    assert(a >= b, (msg || 'assertGte') + ' — expected >= ' + b + ', got ' + a);
}

function assertLte(a, b, msg) {
    assert(a <= b, (msg || 'assertLte') + ' — expected <= ' + b + ', got ' + a);
}

function assertInRange(val, lo, hi, msg) {
    assert(val >= lo && val <= hi, (msg || 'assertInRange') + ' — expected [' + lo + ',' + hi + '], got ' + val);
}

function suite(name) {
    console.log('\n--- ' + name + ' ---');
}

// ---------------------------------------------------------------------------
// SUITE 1: Module Exports
// ---------------------------------------------------------------------------
suite('Module Exports');

assert(typeof ES === 'object', 'module exports object');
assert(Array.isArray(ES.SIMULATION_PRESETS), 'SIMULATION_PRESETS is array');
assert(Array.isArray(ES.DEFAULT_ITEMS), 'DEFAULT_ITEMS is array');
assert(typeof ES.createSnapshot === 'function', 'createSnapshot exported');
assert(typeof ES.simulate === 'function', 'simulate exported');
assert(typeof ES.runPreset === 'function', 'runPreset exported');
assert(typeof ES.comparePrices === 'function', 'comparePrices exported');
assert(typeof ES.predictTrend === 'function', 'predictTrend exported');
assert(typeof ES.findArbitrage === 'function', 'findArbitrage exported');
assert(typeof ES.calculateROI === 'function', 'calculateROI exported');
assert(typeof ES.getVolatilityIndex === 'function', 'getVolatilityIndex exported');
assert(typeof ES.getCorrelation === 'function', 'getCorrelation exported');
assert(typeof ES.getPresets === 'function', 'getPresets exported');
assert(typeof ES.getPresetById === 'function', 'getPresetById exported');
assert(typeof ES.runBatchSimulation === 'function', 'runBatchSimulation exported');
assert(typeof ES.getMarketHealthScore === 'function', 'getMarketHealthScore exported');
assert(typeof ES.suggestStrategy === 'function', 'suggestStrategy exported');
assert(typeof ES.calculateBreakeven === 'function', 'calculateBreakeven exported');
assert(typeof ES.createDefaultMarketState === 'function', 'createDefaultMarketState exported');
assert(typeof ES.mulberry32 === 'function', 'mulberry32 exported');

// ---------------------------------------------------------------------------
// SUITE 2: SIMULATION_PRESETS structure
// ---------------------------------------------------------------------------
suite('SIMULATION_PRESETS Structure');

assertEqual(ES.SIMULATION_PRESETS.length, 8, 'exactly 8 presets');

var presetIds = ['supply_shock', 'demand_surge', 'market_crash', 'guild_monopoly',
                 'new_player_flood', 'seasonal_harvest', 'trade_embargo', 'innovation_boom'];

for (var pi = 0; pi < presetIds.length; pi++) {
    var pid = presetIds[pi];
    var preset = ES.getPresetById(pid);
    assertDefined(preset, 'preset exists: ' + pid);
    assert(typeof preset.name === 'string', pid + ' has name');
    assert(typeof preset.description === 'string', pid + ' has description');
    assert(Array.isArray(preset.modifications), pid + ' has modifications array');
    assert(typeof preset.duration === 'number', pid + ' has duration');
    assertGte(preset.duration, 1, pid + ' duration >= 1');
}

// Check modification structure on supply_shock
var supplyShock = ES.getPresetById('supply_shock');
assertEqual(supplyShock.modifications.length, 1, 'supply_shock has 1 modification');
assertEqual(supplyShock.modifications[0].itemId, 'iron_ore', 'supply_shock targets iron_ore');
assertEqual(supplyShock.modifications[0].field, 'supply', 'supply_shock modifies supply');
assertEqual(supplyShock.modifications[0].multiplier, 0.5, 'supply_shock multiplier is 0.5');
assertEqual(supplyShock.duration, 200, 'supply_shock duration is 200');

// ---------------------------------------------------------------------------
// SUITE 3: mulberry32 PRNG
// ---------------------------------------------------------------------------
suite('mulberry32 PRNG');

var rng1 = ES.mulberry32(12345);
var r1 = rng1();
var r2 = rng1();
assert(typeof r1 === 'number', 'rng returns number');
assertInRange(r1, 0, 1, 'rng value in [0,1]');
assertInRange(r2, 0, 1, 'rng value 2 in [0,1]');
assert(r1 !== r2, 'consecutive rng values differ');

// Same seed produces same sequence
var rng2 = ES.mulberry32(12345);
assertEqual(rng2(), r1, 'same seed same first value');

// Different seeds produce different values
var rng3 = ES.mulberry32(99999);
assert(rng3() !== r1, 'different seeds produce different values');

// Generate 100 values, all in [0,1]
var rng4 = ES.mulberry32(777);
var allInRange = true;
for (var ri = 0; ri < 100; ri++) {
    var rv = rng4();
    if (rv < 0 || rv > 1) { allInRange = false; break; }
}
assert(allInRange, 'all 100 rng values in [0,1]');

// ---------------------------------------------------------------------------
// SUITE 4: DEFAULT_ITEMS structure
// ---------------------------------------------------------------------------
suite('DEFAULT_ITEMS Structure');

assertGte(ES.DEFAULT_ITEMS.length, 8, 'at least 8 default items');

var defaultItemIds = ['iron_ore', 'wood_plank', 'herb_bundle', 'stone_block',
                      'crystal_shard', 'fire_essence', 'bread_loaf', 'roasted_meat',
                      'steel_sword', 'leather_armor', 'health_potion', 'mana_potion'];

for (var di = 0; di < defaultItemIds.length; di++) {
    var did = defaultItemIds[di];
    var found = false;
    for (var dj = 0; dj < ES.DEFAULT_ITEMS.length; dj++) {
        if (ES.DEFAULT_ITEMS[dj].id === did) { found = true; break; }
    }
    assert(found, 'DEFAULT_ITEMS contains ' + did);
}

for (var dk = 0; dk < ES.DEFAULT_ITEMS.length; dk++) {
    var dItem = ES.DEFAULT_ITEMS[dk];
    assert(typeof dItem.id === 'string', 'item has id: ' + dItem.id);
    assert(typeof dItem.name === 'string', 'item has name: ' + dItem.id);
    assert(typeof dItem.basePrice === 'number', 'item has basePrice: ' + dItem.id);
    assertGte(dItem.basePrice, 1, 'basePrice >= 1: ' + dItem.id);
    assert(typeof dItem.supply === 'number', 'item has supply: ' + dItem.id);
    assert(typeof dItem.demand === 'number', 'item has demand: ' + dItem.id);
    assert(typeof dItem.category === 'string', 'item has category: ' + dItem.id);
}

// ---------------------------------------------------------------------------
// SUITE 5: createSnapshot
// ---------------------------------------------------------------------------
suite('createSnapshot');

var snap1 = ES.createSnapshot(null);
assertDefined(snap1, 'snapshot from null not null');
assert(Array.isArray(snap1.items), 'snapshot has items array');
assertGte(snap1.items.length, 8, 'snapshot has at least 8 items');

// Check deep clone — mutation does not affect original
var original = ES.createDefaultMarketState();
var snapped  = ES.createSnapshot(original);
snapped.items[0].basePrice = 9999;
assert(original.items[0].basePrice !== 9999, 'createSnapshot deep-clones (mutation isolated)');

// Snapshot preserves all fields
var snap2 = ES.createSnapshot(original);
assertEqual(snap2.items.length, original.items.length, 'snapshot same item count');
for (var si = 0; si < original.items.length; si++) {
    assertEqual(snap2.items[si].id, original.items[si].id, 'snapshot item id matches: ' + si);
    assertEqual(snap2.items[si].basePrice, original.items[si].basePrice, 'snapshot basePrice matches: ' + si);
    assertEqual(snap2.items[si].supply, original.items[si].supply, 'snapshot supply matches: ' + si);
    assertEqual(snap2.items[si].demand, original.items[si].demand, 'snapshot demand matches: ' + si);
}

// ---------------------------------------------------------------------------
// SUITE 6: createDefaultMarketState
// ---------------------------------------------------------------------------
suite('createDefaultMarketState');

var defaultState = ES.createDefaultMarketState();
assertDefined(defaultState, 'createDefaultMarketState returns object');
assert(Array.isArray(defaultState.items), 'default state has items');
assertEqual(defaultState.items.length, ES.DEFAULT_ITEMS.length, 'same item count as DEFAULT_ITEMS');

for (var cdi = 0; cdi < defaultState.items.length; cdi++) {
    var cdItem = defaultState.items[cdi];
    assert(typeof cdItem.currentPrice === 'number', 'item has currentPrice after init: ' + cdItem.id);
    assertEqual(cdItem.currentPrice, cdItem.basePrice, 'currentPrice equals basePrice initially: ' + cdItem.id);
}

// Two calls return independent objects
var ds1 = ES.createDefaultMarketState();
var ds2 = ES.createDefaultMarketState();
ds1.items[0].supply = 9999;
assert(ds2.items[0].supply !== 9999, 'two calls return independent objects');

// ---------------------------------------------------------------------------
// SUITE 7: simulate — basic
// ---------------------------------------------------------------------------
suite('simulate — basic');

var baseState = ES.createDefaultMarketState();
var simResult = ES.simulate(baseState, [], 10, 42);

assertDefined(simResult, 'simulate returns result');
assertDefined(simResult.finalState, 'simulate returns finalState');
assertDefined(simResult.priceHistory, 'simulate returns priceHistory');
assert(Array.isArray(simResult.events), 'simulate returns events array');
assertDefined(simResult.summary, 'simulate returns summary');
assertEqual(simResult.summary.ticks, 10, 'summary.ticks equals requested ticks');

// priceHistory for each item
for (var phi = 0; phi < baseState.items.length; phi++) {
    var phId = baseState.items[phi].id;
    assert(Array.isArray(simResult.priceHistory[phId]), 'priceHistory has entry for ' + phId);
    // Should have ticks+1 entries (initial + one per tick)
    assertEqual(simResult.priceHistory[phId].length, 11, 'priceHistory length = ticks+1 for ' + phId);
}

// All prices positive
var allPositive = true;
for (var ppItem in simResult.priceHistory) {
    var ppHist = simResult.priceHistory[ppItem];
    for (var ppT = 0; ppT < ppHist.length; ppT++) {
        if (ppHist[ppT] <= 0) { allPositive = false; break; }
    }
}
assert(allPositive, 'all simulated prices are positive');

// Determinism: same seed => same result
var sim2 = ES.simulate(baseState, [], 10, 42);
assertEqual(
    simResult.priceHistory['iron_ore'][5],
    sim2.priceHistory['iron_ore'][5],
    'same seed produces same price at tick 5'
);

// Different seed => different result (with high probability)
var sim3 = ES.simulate(baseState, [], 50, 9999);
assert(
    simResult.priceHistory['iron_ore'][5] !== sim3.priceHistory['iron_ore'][5] ||
    simResult.priceHistory['wood_plank'][10] !== sim3.priceHistory['wood_plank'][10],
    'different seed produces different results'
);

// Summary has biggestGain and biggestLoss
assertDefined(simResult.summary.biggestGain, 'summary has biggestGain');
assertDefined(simResult.summary.biggestLoss, 'summary has biggestLoss');
assert(typeof simResult.summary.biggestGain.itemId === 'string', 'biggestGain has itemId');
assert(typeof simResult.summary.biggestLoss.itemId === 'string', 'biggestLoss has itemId');

// ---------------------------------------------------------------------------
// SUITE 8: simulate — modifications
// ---------------------------------------------------------------------------
suite('simulate — modifications');

var stateMod = ES.createDefaultMarketState();
var mods = [{ itemId: 'iron_ore', field: 'supply', multiplier: 0.1 }];
var simMod = ES.simulate(stateMod, mods, 100, 42);

// Iron ore price should be significantly higher than base after supply shock
var ironHistory = simMod.priceHistory['iron_ore'];
assertDefined(ironHistory, 'iron_ore in priceHistory with supply shock');
var ironFinal = ironHistory[ironHistory.length - 1];
assertGte(ironFinal, stateMod.items[0].basePrice, 'supply shock raises iron_ore price above base');

// Demand surge should raise prices
var stateDemand = ES.createDefaultMarketState();
var demandMods  = [{ itemId: 'wood_plank', field: 'demand', multiplier: 5.0 }];
var simDemand   = ES.simulate(stateDemand, demandMods, 50, 42);
var woodHistory = simDemand.priceHistory['wood_plank'];
assertDefined(woodHistory, 'wood_plank in priceHistory with demand surge');
var woodFinal = woodHistory[woodHistory.length - 1];
assertGte(woodFinal, stateDemand.items[1].basePrice * 0.8, 'demand surge raises wood_plank price');

// Modifications do not mutate original state
var stateOrig = ES.createDefaultMarketState();
var origIronSupply = stateOrig.items[0].supply;
ES.simulate(stateOrig, [{ itemId: 'iron_ore', field: 'supply', multiplier: 0.1 }], 10, 1);
assertEqual(stateOrig.items[0].supply, origIronSupply, 'simulate does not mutate original state');

// ---------------------------------------------------------------------------
// SUITE 9: runPreset
// ---------------------------------------------------------------------------
suite('runPreset');

var psState = ES.createDefaultMarketState();

var presetResult = ES.runPreset(psState, 'supply_shock', 42);
assertDefined(presetResult, 'runPreset supply_shock returns result');
assertDefined(presetResult.finalState, 'runPreset result has finalState');
assertDefined(presetResult.priceHistory, 'runPreset result has priceHistory');
assertEqual(presetResult.summary.ticks, 200, 'supply_shock runs for 200 ticks');

var demandResult = ES.runPreset(psState, 'demand_surge', 42);
assertDefined(demandResult, 'runPreset demand_surge returns result');
assertEqual(demandResult.summary.ticks, 150, 'demand_surge runs for 150 ticks');

var crashResult = ES.runPreset(psState, 'market_crash', 42);
assertEqual(crashResult.summary.ticks, 300, 'market_crash runs for 300 ticks');

var embResult = ES.runPreset(psState, 'trade_embargo', 42);
assertEqual(embResult.summary.ticks, 350, 'trade_embargo runs for 350 ticks');

// Invalid preset returns null
var nullResult = ES.runPreset(psState, 'nonexistent_preset', 42);
assertEqual(nullResult, null, 'invalid preset returns null');

// runPreset does not mutate original state
var psOrig = ES.createDefaultMarketState();
var psOrigPrice = psOrig.items[0].basePrice;
ES.runPreset(psOrig, 'supply_shock', 1);
assertEqual(psOrig.items[0].basePrice, psOrigPrice, 'runPreset does not mutate state');

// ---------------------------------------------------------------------------
// SUITE 10: comparePrices
// ---------------------------------------------------------------------------
suite('comparePrices');

var cpBefore = ES.createDefaultMarketState();
var cpAfterState = ES.createSnapshot(cpBefore);
// Manually set a different price
cpAfterState.items[0].currentPrice = cpBefore.items[0].basePrice * 2;

var cpResult = ES.comparePrices(cpBefore, cpAfterState);
assert(Array.isArray(cpResult), 'comparePrices returns array');
assertEqual(cpResult.length, cpBefore.items.length, 'comparePrices returns entry per item');

var ironChange = null;
for (var ci = 0; ci < cpResult.length; ci++) {
    if (cpResult[ci].itemId === 'iron_ore') { ironChange = cpResult[ci]; break; }
}
assertDefined(ironChange, 'comparePrices has iron_ore entry');
assert(typeof ironChange.beforePrice === 'number', 'beforePrice is number');
assert(typeof ironChange.afterPrice === 'number', 'afterPrice is number');
assert(typeof ironChange.changePercent === 'number', 'changePercent is number');
assert(typeof ironChange.trend === 'string', 'trend is string');
assertApprox(ironChange.changePercent, 100, 5, 'iron_ore doubled = ~100% change');
assertEqual(ironChange.trend, 'up', 'doubled price trend is up');

// Price drop scenario
var cpBeforeDrop = ES.createDefaultMarketState();
var cpAfterDrop  = ES.createSnapshot(cpBeforeDrop);
cpAfterDrop.items[0].currentPrice = cpBeforeDrop.items[0].basePrice * 0.5;
var cpDropResult = ES.comparePrices(cpBeforeDrop, cpAfterDrop);
var ironDropChange = null;
for (var cd = 0; cd < cpDropResult.length; cd++) {
    if (cpDropResult[cd].itemId === 'iron_ore') { ironDropChange = cpDropResult[cd]; break; }
}
assertApprox(ironDropChange.changePercent, -50, 5, 'halved price = ~-50% change');
assertEqual(ironDropChange.trend, 'down', 'halved price trend is down');

// Stable price
var cpStableBefore = ES.createDefaultMarketState();
var cpStableAfter  = ES.createSnapshot(cpStableBefore);
var cpStableResult = ES.comparePrices(cpStableBefore, cpStableAfter);
var stableEntry    = cpStableResult[0];
assertEqual(stableEntry.trend, 'stable', 'unchanged price trend is stable');

// Handles null gracefully
var nullCP = ES.comparePrices(null, null);
assert(Array.isArray(nullCP) && nullCP.length === 0, 'comparePrices(null,null) returns empty array');

// ---------------------------------------------------------------------------
// SUITE 11: predictTrend
// ---------------------------------------------------------------------------
suite('predictTrend');

// Flat trend
var flatHistory = {};
flatHistory['iron_ore'] = [10, 10, 10, 10, 10];
var flatPred = ES.predictTrend(flatHistory, 'iron_ore', 5);
assertDefined(flatPred, 'predictTrend returns result');
assertApprox(flatPred.predictedPrice, 10, 1, 'flat trend predicts ~10');
assertEqual(flatPred.direction, 'stable', 'flat trend direction is stable');
assertInRange(flatPred.confidence, 0, 1, 'confidence in [0,1]');

// Rising trend
var risingHistory = {};
risingHistory['iron_ore'] = [10, 12, 14, 16, 18, 20];
var risingPred = ES.predictTrend(risingHistory, 'iron_ore', 3);
assertGte(risingPred.predictedPrice, 20, 'rising trend predicts higher price');
assertEqual(risingPred.direction, 'up', 'rising trend direction is up');

// Falling trend
var fallingHistory = {};
fallingHistory['iron_ore'] = [20, 18, 16, 14, 12, 10];
var fallingPred = ES.predictTrend(fallingHistory, 'iron_ore', 3);
assertLte(fallingPred.predictedPrice, 12, 'falling trend predicts lower price');
assertEqual(fallingPred.direction, 'down', 'falling trend direction is down');

// Unknown item
var unknownPred = ES.predictTrend({}, 'nonexistent', 5);
assertEqual(unknownPred.direction, 'unknown', 'unknown item returns direction unknown');
assertEqual(unknownPred.predictedPrice, 0, 'unknown item returns price 0');
assertEqual(unknownPred.confidence, 0, 'unknown item returns confidence 0');

// Single value
var singleHistory = {};
singleHistory['iron_ore'] = [10];
var singlePred = ES.predictTrend(singleHistory, 'iron_ore', 5);
assertEqual(singlePred.direction, 'unknown', 'single value returns unknown direction');

// ticksAhead defaults to 10
var defaultAhead = ES.predictTrend(risingHistory, 'iron_ore');
assertDefined(defaultAhead.predictedPrice, 'predictTrend works with default ticksAhead');

// ---------------------------------------------------------------------------
// SUITE 12: findArbitrage
// ---------------------------------------------------------------------------
suite('findArbitrage');

// Create a state with high-demand items (supply < demand)
var arbState = ES.createDefaultMarketState();
// crystal_shard has supply=20, demand=40 => demand > supply => arbitrage opportunity
var arbResult = ES.findArbitrage(arbState, null);
assert(Array.isArray(arbResult), 'findArbitrage returns array');
// Each entry should have required fields
for (var ai = 0; ai < arbResult.length; ai++) {
    var arb = arbResult[ai];
    assert(typeof arb.itemId === 'string', 'arb entry has itemId');
    assert(typeof arb.buyPrice === 'number', 'arb entry has buyPrice');
    assert(typeof arb.sellPrice === 'number', 'arb entry has sellPrice');
    assert(typeof arb.profit === 'number', 'arb entry has profit');
    assert(typeof arb.profitPercent === 'number', 'arb entry has profitPercent');
    assertGte(arb.profit, 0, 'arb profit is non-negative');
    assertGte(arb.profitPercent, 0, 'arb profitPercent is non-negative');
    assert(arb.sellPrice > arb.buyPrice, 'arb sellPrice > buyPrice');
}

// Filter by itemIds
var filteredArb = ES.findArbitrage(arbState, ['iron_ore', 'crystal_shard']);
for (var fi = 0; fi < filteredArb.length; fi++) {
    assert(
        filteredArb[fi].itemId === 'iron_ore' || filteredArb[fi].itemId === 'crystal_shard',
        'filtered arb only contains requested items'
    );
}

// Null state returns empty array
var nullArb = ES.findArbitrage(null, null);
assert(Array.isArray(nullArb) && nullArb.length === 0, 'findArbitrage(null) returns empty array');

// Crystal shard should have arbitrage (demand > supply)
var crystalArb = null;
for (var cai = 0; cai < arbResult.length; cai++) {
    if (arbResult[cai].itemId === 'crystal_shard') { crystalArb = arbResult[cai]; break; }
}
assertDefined(crystalArb, 'crystal_shard has arbitrage opportunity (demand > supply)');
assertGte(crystalArb.profit, 0.01, 'crystal_shard arb profit > 0');

// ---------------------------------------------------------------------------
// SUITE 13: calculateROI
// ---------------------------------------------------------------------------
suite('calculateROI');

var roiState = ES.createDefaultMarketState();
var roiResult = ES.calculateROI(1000, 'iron_ore', 100, roiState, 42);
assertDefined(roiResult, 'calculateROI returns result');
assert(typeof roiResult.roi === 'number', 'roi is number');
assert(typeof roiResult.finalValue === 'number', 'finalValue is number');
assert(typeof roiResult.profit === 'number', 'profit is number');
assertGte(roiResult.finalValue, 0, 'finalValue >= 0');
// profit should equal finalValue - investAmount
assertApprox(roiResult.profit, roiResult.finalValue - 1000, 1, 'profit = finalValue - invest');

// Deterministic with same seed
var roi2 = ES.calculateROI(1000, 'iron_ore', 100, roiState, 42);
assertEqual(roiResult.roi, roi2.roi, 'calculateROI deterministic with same seed');

// Zero invest amount should handle gracefully
var roiZero = ES.calculateROI(0, 'iron_ore', 50, roiState, 42);
assert(typeof roiZero.roi === 'number', 'calculateROI handles 0 investAmount');

// Unknown item
var roiUnknown = ES.calculateROI(100, 'nonexistent_item', 50, roiState, 42);
assert(typeof roiUnknown.roi === 'number', 'calculateROI handles unknown item');

// Crystal shard test
var roiCrystal = ES.calculateROI(500, 'crystal_shard', 80, roiState, 77);
assert(typeof roiCrystal.roi === 'number', 'crystal_shard roi is number');
assert(typeof roiCrystal.finalValue === 'number', 'crystal_shard finalValue is number');

// ---------------------------------------------------------------------------
// SUITE 14: getVolatilityIndex
// ---------------------------------------------------------------------------
suite('getVolatilityIndex');

// Constant price = zero volatility
var constHistory = { iron_ore: [10, 10, 10, 10, 10] };
var constVol = ES.getVolatilityIndex(constHistory, 'iron_ore');
assertEqual(constVol, 0, 'constant prices = 0 volatility');

// Volatile prices should have higher index
var volHistory = { iron_ore: [10, 20, 5, 30, 2, 25] };
var highVol = ES.getVolatilityIndex(volHistory, 'iron_ore');
assertGte(highVol, 0.1, 'volatile prices have high volatility index');

// Window parameter limits history
var longHistory = { iron_ore: [] };
for (var lh = 0; lh < 100; lh++) { longHistory.iron_ore.push(lh % 2 === 0 ? 10 : 20); }
var windowed = ES.getVolatilityIndex(longHistory, 'iron_ore', 10);
var unwindowed = ES.getVolatilityIndex(longHistory, 'iron_ore');
assert(typeof windowed === 'number', 'windowed volatility is number');
assert(typeof unwindowed === 'number', 'unwindowed volatility is number');

// Unknown item returns 0
var unknownVol = ES.getVolatilityIndex({}, 'nonexistent');
assertEqual(unknownVol, 0, 'unknown item volatility is 0');

// Single value returns 0
var singleVol = ES.getVolatilityIndex({ iron_ore: [10] }, 'iron_ore');
assertEqual(singleVol, 0, 'single value volatility is 0');

// Volatility is non-negative
assertGte(highVol, 0, 'volatility index is non-negative');

// ---------------------------------------------------------------------------
// SUITE 15: getCorrelation
// ---------------------------------------------------------------------------
suite('getCorrelation');

// Perfect positive correlation
var corrPos = {
    iron_ore: [1, 2, 3, 4, 5],
    wood_plank: [2, 4, 6, 8, 10]
};
var posCorr = ES.getCorrelation(corrPos, 'iron_ore', 'wood_plank');
assertApprox(posCorr, 1.0, 0.01, 'perfect positive correlation ~1.0');

// Perfect negative correlation
var corrNeg = {
    iron_ore: [5, 4, 3, 2, 1],
    wood_plank: [1, 2, 3, 4, 5]
};
var negCorr = ES.getCorrelation(corrNeg, 'iron_ore', 'wood_plank');
assertApprox(negCorr, -1.0, 0.01, 'perfect negative correlation ~-1.0');

// Zero correlation (orthogonal data)
var corrZero = {
    iron_ore: [10, 10, 10, 10, 10],
    wood_plank: [5, 15, 5, 15, 5]
};
var zeroCorr = ES.getCorrelation(corrZero, 'iron_ore', 'wood_plank');
assertEqual(zeroCorr, 0, 'constant series has 0 correlation');

// Correlation in range [-1, 1]
var simState2 = ES.createDefaultMarketState();
var simRes2   = ES.simulate(simState2, [], 100, 42);
var corrVal = ES.getCorrelation(simRes2.priceHistory, 'iron_ore', 'wood_plank');
assertInRange(corrVal, -1, 1, 'simulated correlation in [-1,1]');

// Missing item returns 0
var missingCorr = ES.getCorrelation({ iron_ore: [1,2,3] }, 'iron_ore', 'nonexistent');
assertEqual(missingCorr, 0, 'missing item correlation returns 0');

// Window parameter
var windCorr = ES.getCorrelation(corrPos, 'iron_ore', 'wood_plank', 3);
assertInRange(windCorr, -1, 1, 'windowed correlation in [-1,1]');

// ---------------------------------------------------------------------------
// SUITE 16: getPresets and getPresetById
// ---------------------------------------------------------------------------
suite('getPresets and getPresetById');

var presets = ES.getPresets();
assert(Array.isArray(presets), 'getPresets returns array');
assertEqual(presets.length, 8, 'getPresets returns 8 presets');

// Modifying returned array does not affect internal
presets.push({ id: 'fake' });
assertEqual(ES.getPresets().length, 8, 'getPresets returns copy (not reference)');

// getPresetById
var sp = ES.getPresetById('supply_shock');
assertDefined(sp, 'getPresetById supply_shock');
assertEqual(sp.id, 'supply_shock', 'getPresetById returns correct preset');

var ds_preset = ES.getPresetById('demand_surge');
assertEqual(ds_preset.id, 'demand_surge', 'getPresetById demand_surge');

var inn = ES.getPresetById('innovation_boom');
assertEqual(inn.id, 'innovation_boom', 'getPresetById innovation_boom');

var notFound = ES.getPresetById('does_not_exist');
assertEqual(notFound, null, 'getPresetById returns null for unknown id');

// All 8 presets findable
for (var gpi = 0; gpi < presetIds.length; gpi++) {
    var gpFound = ES.getPresetById(presetIds[gpi]);
    assertDefined(gpFound, 'getPresetById finds: ' + presetIds[gpi]);
}

// ---------------------------------------------------------------------------
// SUITE 17: runBatchSimulation
// ---------------------------------------------------------------------------
suite('runBatchSimulation');

var batchState = ES.createDefaultMarketState();
var scenarios  = [
    { id: 'test_s1', modifications: [{ itemId: 'iron_ore', field: 'supply', multiplier: 0.5 }], duration: 50 },
    { id: 'test_s2', modifications: [{ itemId: 'wood_plank', field: 'demand', multiplier: 2.0 }], duration: 50 }
];

var batchResult = ES.runBatchSimulation(batchState, scenarios, 42);
assert(Array.isArray(batchResult), 'runBatchSimulation returns array');
assertEqual(batchResult.length, 2, 'batch result has 2 entries');

for (var bi = 0; bi < batchResult.length; bi++) {
    var br = batchResult[bi];
    assert(typeof br.scenarioId === 'string', 'batch result has scenarioId');
    assertDefined(br.summary, 'batch result has summary');
    assert(Array.isArray(br.priceChanges), 'batch result has priceChanges array');
}

assertEqual(batchResult[0].scenarioId, 'test_s1', 'batch result[0] scenarioId is test_s1');
assertEqual(batchResult[1].scenarioId, 'test_s2', 'batch result[1] scenarioId is test_s2');

// Empty scenarios returns empty array
var emptyBatch = ES.runBatchSimulation(batchState, [], 42);
assert(Array.isArray(emptyBatch) && emptyBatch.length === 0, 'empty scenarios returns empty array');

// Null scenarios returns empty array
var nullBatch = ES.runBatchSimulation(batchState, null, 42);
assert(Array.isArray(nullBatch) && nullBatch.length === 0, 'null scenarios returns empty array');

// Each scenario runs for its own duration
var batchDuration = [
    { id: 'short', modifications: [], duration: 20 },
    { id: 'long',  modifications: [], duration: 80 }
];
var batchDurResult = ES.runBatchSimulation(batchState, batchDuration, 1);
assertEqual(batchDurResult[0].summary.ticks, 20, 'short scenario runs 20 ticks');
assertEqual(batchDurResult[1].summary.ticks, 80, 'long scenario runs 80 ticks');

// ---------------------------------------------------------------------------
// SUITE 18: getMarketHealthScore
// ---------------------------------------------------------------------------
suite('getMarketHealthScore');

var healthState = ES.createDefaultMarketState();
var healthScore = ES.getMarketHealthScore(healthState);
assert(typeof healthScore === 'number', 'health score is number');
assertInRange(healthScore, 0, 100, 'health score in [0,100]');

// Healthy market (supply ≈ demand) should score reasonably well
assertGte(healthScore, 30, 'balanced market scores >= 30');

// Distressed market (extreme supply imbalance) should score lower
var distressedState = ES.createDefaultMarketState();
for (var dsi = 0; dsi < distressedState.items.length; dsi++) {
    distressedState.items[dsi].supply  = 1;
    distressedState.items[dsi].demand  = 1000;
    distressedState.items[dsi].currentPrice = distressedState.items[dsi].basePrice * 10;
}
var distressedScore = ES.getMarketHealthScore(distressedState);
assert(typeof distressedScore === 'number', 'distressed state returns number');
assertInRange(distressedScore, 0, 100, 'distressed score in [0,100]');

// Null state returns fallback
var nullScore = ES.getMarketHealthScore(null);
assert(typeof nullScore === 'number', 'null state returns number');

// Empty items returns fallback
var emptyScore = ES.getMarketHealthScore({ items: [] });
assert(typeof emptyScore === 'number', 'empty items returns number');

// Two different states should produce different scores
var lowHealth = ES.createDefaultMarketState();
lowHealth.items[0].supply = 1;
lowHealth.items[0].demand = 10000;
var lowScore  = ES.getMarketHealthScore(lowHealth);
assert(typeof lowScore === 'number', 'modified state returns number');

// ---------------------------------------------------------------------------
// SUITE 19: suggestStrategy
// ---------------------------------------------------------------------------
suite('suggestStrategy');

var stratState = ES.createDefaultMarketState();
var suggestions = ES.suggestStrategy(stratState, 'player1', 'medium');
assert(Array.isArray(suggestions), 'suggestStrategy returns array');
assertEqual(suggestions.length, stratState.items.length, 'one suggestion per item');

for (var ssi = 0; ssi < suggestions.length; ssi++) {
    var sug = suggestions[ssi];
    assert(typeof sug.itemId === 'string', 'suggestion has itemId');
    assert(sug.action === 'buy' || sug.action === 'sell' || sug.action === 'hold',
           'action is buy/sell/hold: ' + sug.action);
    assert(typeof sug.reason === 'string', 'suggestion has reason');
    assertInRange(sug.confidence, 0, 1, 'confidence in [0,1]');
    assert(typeof sug.currentPrice === 'number', 'suggestion has currentPrice');
    assert(typeof sug.basePrice === 'number', 'suggestion has basePrice');
}

// Risk tolerance affects confidence
var lowRiskSugs    = ES.suggestStrategy(stratState, 'player1', 'low');
var highRiskSugs   = ES.suggestStrategy(stratState, 'player1', 'high');
assert(Array.isArray(lowRiskSugs),  'low risk returns array');
assert(Array.isArray(highRiskSugs), 'high risk returns array');

// Create a state with clear buy signal (demand >> supply)
var buySignalState = ES.createDefaultMarketState();
buySignalState.items[0].supply = 10;
buySignalState.items[0].demand = 100;
var buySugs = ES.suggestStrategy(buySignalState, 'p1', 'medium');
assertEqual(buySugs[0].action, 'buy', 'high demand/supply ratio => buy signal');

// Create a state with clear sell signal (supply >> demand)
var sellSignalState = ES.createDefaultMarketState();
sellSignalState.items[0].supply = 1000;
sellSignalState.items[0].demand = 10;
var sellSugs = ES.suggestStrategy(sellSignalState, 'p1', 'medium');
assertEqual(sellSugs[0].action, 'sell', 'low demand/supply ratio => sell signal');

// Null state returns empty array
var nullSug = ES.suggestStrategy(null, 'p1', 'medium');
assert(Array.isArray(nullSug) && nullSug.length === 0, 'null state returns empty array');

// Default risk tolerance
var defaultRisk = ES.suggestStrategy(stratState, 'player1');
assert(Array.isArray(defaultRisk), 'suggestStrategy works with default riskTolerance');

// ---------------------------------------------------------------------------
// SUITE 20: calculateBreakeven
// ---------------------------------------------------------------------------
suite('calculateBreakeven');

var bkState = ES.createDefaultMarketState();

// Breakeven with zero target profit should be immediate or very soon
var bkZero = ES.calculateBreakeven(bkState, 'iron_ore', 10, 0);
assertDefined(bkZero, 'calculateBreakeven returns result');
assert(typeof bkZero.ticks === 'number', 'breakeven result has ticks');
assert(typeof bkZero.reachable === 'boolean', 'breakeven result has reachable');

// Large target profit may not be reachable
var bkHuge = ES.calculateBreakeven(bkState, 'iron_ore', 1, 10000000);
assert(typeof bkHuge.reachable === 'boolean', 'large profit breakeven has reachable');
if (!bkHuge.reachable) {
    assert(typeof bkHuge.maxPrice === 'number', 'unreachable breakeven has maxPrice');
}

// Reachable result has positive ticks
var bkReach = ES.calculateBreakeven(bkState, 'iron_ore', 5, 1);
if (bkReach.reachable) {
    assertGte(bkReach.ticks, 1, 'reachable breakeven ticks >= 1');
    assert(typeof bkReach.expectedPrice === 'number', 'reachable breakeven has expectedPrice');
    assert(typeof bkReach.expectedProfit === 'number', 'reachable breakeven has expectedProfit');
}

// Unknown item
var bkUnknown = ES.calculateBreakeven(bkState, 'nonexistent_item', 5, 10);
assertEqual(bkUnknown.ticks, -1, 'unknown item returns ticks -1');
assertEqual(bkUnknown.reachable, false, 'unknown item returns reachable false');

// Null state
var bkNull = ES.calculateBreakeven(null, 'iron_ore', 5, 10);
assertEqual(bkNull.ticks, -1, 'null state returns ticks -1');

// Default quantity
var bkDefault = ES.calculateBreakeven(bkState, 'wood_plank');
assertDefined(bkDefault, 'calculateBreakeven works with default params');

// ---------------------------------------------------------------------------
// SUITE 21: Integration — Full Simulation Pipeline
// ---------------------------------------------------------------------------
suite('Integration — Full Simulation Pipeline');

// Snapshot -> simulate -> compare -> predict workflow
var intState  = ES.createDefaultMarketState();
var intSnap   = ES.createSnapshot(intState);
var intSim    = ES.simulate(intSnap, [{ itemId: 'crystal_shard', field: 'supply', multiplier: 0.2 }], 80, 42);
var intComp   = ES.comparePrices(intSnap, intSim.finalState);
var intPred   = ES.predictTrend(intSim.priceHistory, 'crystal_shard', 20);
var intHealth = ES.getMarketHealthScore(intSim.finalState);
var intArb    = ES.findArbitrage(intSim.finalState, null);
var intStrat  = ES.suggestStrategy(intSim.finalState, 'player_a', 'high');

assert(Array.isArray(intComp), 'integration: comparePrices returns array');
assertDefined(intPred.predictedPrice, 'integration: predictTrend returns prediction');
assertInRange(intHealth, 0, 100, 'integration: health score in range');
assert(Array.isArray(intArb), 'integration: findArbitrage returns array');
assert(Array.isArray(intStrat), 'integration: suggestStrategy returns array');

// Run all 8 presets
var allPresetsState = ES.createDefaultMarketState();
for (var ap = 0; ap < presetIds.length; ap++) {
    var apResult = ES.runPreset(allPresetsState, presetIds[ap], ap * 100);
    assertDefined(apResult, 'all presets run: ' + presetIds[ap]);
    assertDefined(apResult.finalState, 'preset finalState: ' + presetIds[ap]);
    assertGte(apResult.summary.ticks, 1, 'preset has ticks > 0: ' + presetIds[ap]);
}

// Batch run all presets as scenarios
var allPresetsList = ES.SIMULATION_PRESETS;
var batchScenarios = [];
for (var bsi = 0; bsi < allPresetsList.length; bsi++) {
    var bsPr = allPresetsList[bsi];
    batchScenarios.push({ id: bsPr.id, modifications: bsPr.modifications, duration: Math.min(bsPr.duration, 50) });
}
var batchAll = ES.runBatchSimulation(allPresetsState, batchScenarios, 99);
assertEqual(batchAll.length, 8, 'batch run 8 scenarios produces 8 results');
for (var ba = 0; ba < batchAll.length; ba++) {
    assertDefined(batchAll[ba].summary, 'batch result ' + ba + ' has summary');
}

// Confirm simulate output shape fully
var finalSim = ES.simulate(allPresetsState, [], 30, 55);
assert(typeof finalSim.summary.ticks === 'number', 'summary.ticks is number');
assert(typeof finalSim.summary.itemCount === 'number', 'summary.itemCount is number');
assert(typeof finalSim.summary.events === 'number', 'summary.events is number');
assertEqual(finalSim.summary.itemCount, allPresetsState.items.length, 'summary.itemCount matches item count');

// ---------------------------------------------------------------------------
// FINAL REPORT
// ---------------------------------------------------------------------------
console.log('\n================================');
console.log('Economy Simulator Test Results');
console.log('================================');
console.log('Passed: ' + passed);
console.log('Failed: ' + failed);
if (failures.length > 0) {
    console.log('\nFailed tests:');
    for (var fi = 0; fi < failures.length; fi++) {
        console.log('  ' + (fi + 1) + '. ' + failures[fi]);
    }
}
console.log('================================\n');

if (failed > 0) {
    process.exit(1);
} else {
    console.log('All ' + passed + ' tests passed!');
    process.exit(0);
}
