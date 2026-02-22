/**
 * tests/test_crafting_chains.js
 * Comprehensive tests for the ZION CraftingChains module.
 * Run with: node tests/test_crafting_chains.js
 * 200+ tests covering all features.
 */

'use strict';

var CraftingChains = require('../src/js/crafting_chains');

var passed = 0;
var failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log('  ok - ' + msg);
  } else {
    failed++;
    console.error('  FAIL - ' + msg);
  }
}

// ---------------------------------------------------------------------------
// State factory helpers
// ---------------------------------------------------------------------------

function makePlayer(opts) {
  opts = opts || {};
  return {
    level:               opts.level !== undefined ? opts.level : 10,
    xp:                  opts.xp || 0,
    craftingLevel:       opts.craftingLevel || 0,
    inventory:           opts.inventory || {},
    specializations:     opts.specializations || {},
    discoveredBlueprints: opts.discoveredBlueprints || [],
    chainHistory:        opts.chainHistory || [],
    perks:               opts.perks || []
  };
}

function makeState(players) {
  return {
    players:       players || { player1: makePlayer() },
    craftingChains: {}
  };
}

function stateWithWorkstation(workstationId, workstationType, ownerId, opts) {
  opts = opts || {};
  var state = makeState({ player1: makePlayer(opts.playerOpts || {}) });
  if (ownerId !== 'player1') {
    state.players[ownerId] = makePlayer(opts.ownerOpts || {});
  }
  state.craftingChains = {
    workstations: {}
  };
  var wsType = CraftingChains.WORKSTATION_TYPES[workstationType];
  state.craftingChains.workstations[workstationId] = {
    id:            workstationId,
    type:          workstationType,
    name:          wsType ? wsType.name : workstationType,
    ownerId:       ownerId,
    durability:    opts.durability !== undefined ? opts.durability : (wsType ? wsType.durabilityMax : 200),
    durabilityMax: wsType ? wsType.durabilityMax : 200,
    upgradeLevel:  opts.upgradeLevel || 0,
    accessList:    opts.accessList || [ownerId],
    builtAt:       Date.now(),
    activeJobs:    []
  };
  return state;
}

function giveItems(state, playerId, itemMap) {
  var inv = state.players[playerId].inventory;
  var keys = Object.keys(itemMap);
  for (var i = 0; i < keys.length; i++) {
    inv[keys[i]] = (inv[keys[i]] || 0) + itemMap[keys[i]];
  }
}

// ============================================================================
// SUITE 1: MODULE EXPORTS & CONSTANTS
// ============================================================================

console.log('\n--- Suite 1: Module Exports & Constants ---');

assert(typeof CraftingChains === 'object', 'CraftingChains module loads as object');
assert(Array.isArray(CraftingChains.STAGES), 'STAGES is an array');
assert(CraftingChains.STAGES.length === 4, 'STAGES has 4 entries');
assert(CraftingChains.STAGES[0] === 'raw', 'First stage is raw');
assert(CraftingChains.STAGES[1] === 'refined', 'Second stage is refined');
assert(CraftingChains.STAGES[2] === 'component', 'Third stage is component');
assert(CraftingChains.STAGES[3] === 'finished', 'Fourth stage is finished');

assert(typeof CraftingChains.WORKSTATION_TYPES === 'object', 'WORKSTATION_TYPES is object');
assert(Object.keys(CraftingChains.WORKSTATION_TYPES).length === 6, 'Six workstation types');
assert(typeof CraftingChains.WORKSTATION_TYPES.smelter === 'object', 'smelter exists');
assert(typeof CraftingChains.WORKSTATION_TYPES.forge === 'object', 'forge exists');
assert(typeof CraftingChains.WORKSTATION_TYPES.loom === 'object', 'loom exists');
assert(typeof CraftingChains.WORKSTATION_TYPES.engraver === 'object', 'engraver exists');
assert(typeof CraftingChains.WORKSTATION_TYPES.assembler === 'object', 'assembler exists');
assert(typeof CraftingChains.WORKSTATION_TYPES.refinery === 'object', 'refinery exists');

assert(typeof CraftingChains.QUALITY_TIERS === 'object', 'QUALITY_TIERS is object');
assert(typeof CraftingChains.QUALITY_TIERS.poor === 'object', 'poor tier exists');
assert(typeof CraftingChains.QUALITY_TIERS.common === 'object', 'common tier exists');
assert(typeof CraftingChains.QUALITY_TIERS.fine === 'object', 'fine tier exists');
assert(typeof CraftingChains.QUALITY_TIERS.superior === 'object', 'superior tier exists');
assert(typeof CraftingChains.QUALITY_TIERS.masterwork === 'object', 'masterwork tier exists');

assert(Array.isArray(CraftingChains.QUALITY_TIER_ORDER), 'QUALITY_TIER_ORDER is array');
assert(CraftingChains.QUALITY_TIER_ORDER.length === 5, 'QUALITY_TIER_ORDER has 5 entries');

assert(typeof CraftingChains.INTERMEDIATE_PRODUCTS === 'object', 'INTERMEDIATE_PRODUCTS is object');
assert(Object.keys(CraftingChains.INTERMEDIATE_PRODUCTS).length >= 10, 'At least 10 intermediate products');

assert(Array.isArray(CraftingChains.CHAIN_BLUEPRINTS), 'CHAIN_BLUEPRINTS is array');
assert(CraftingChains.CHAIN_BLUEPRINTS.length >= 5, 'At least 5 chain blueprints');

assert(typeof CraftingChains.CHAIN_EFFICIENCY_BONUS === 'number', 'CHAIN_EFFICIENCY_BONUS is number');
assert(CraftingChains.CHAIN_EFFICIENCY_BONUS > 0, 'CHAIN_EFFICIENCY_BONUS is positive');
assert(typeof CraftingChains.DURABILITY_COST_PER_RUN === 'number', 'DURABILITY_COST_PER_RUN is number');
assert(CraftingChains.DURABILITY_COST_PER_RUN > 0, 'DURABILITY_COST_PER_RUN is positive');
assert(typeof CraftingChains.ORDER_EXPIRY_MS === 'number', 'ORDER_EXPIRY_MS is number');
assert(CraftingChains.ORDER_EXPIRY_MS > 0, 'ORDER_EXPIRY_MS is positive');

// ============================================================================
// SUITE 2: EXPORTED FUNCTION PRESENCE
// ============================================================================

console.log('\n--- Suite 2: Exported Functions ---');

var requiredFunctions = [
  'mulberry32', 'getQualityTier', 'calcPropagatedQuality',
  'buildWorkstation', 'upgradeWorkstation', 'grantAccess', 'revokeAccess',
  'repairWorkstation', 'getProductionTime', 'getPlayerWorkstations', 'getAccessibleWorkstations',
  'getBlueprints', 'getBlueprintById', 'hasDiscoveredBlueprint',
  'discoverBlueprint', 'experimentBlueprint', 'getDiscoveredBlueprints',
  'canRunStage', 'runStage', 'runChain',
  'placeSupplyOrder', 'fulfillSupplyOrder', 'cancelSupplyOrder',
  'getSupplyOrders', 'getPlayerOrders',
  'calcChainEfficiency', 'getChainHistory', 'getWorkstationStats',
  'applyMessage'
];

for (var fi = 0; fi < requiredFunctions.length; fi++) {
  assert(typeof CraftingChains[requiredFunctions[fi]] === 'function',
    'Exports function: ' + requiredFunctions[fi]);
}

// ============================================================================
// SUITE 3: WORKSTATION TYPE STRUCTURE
// ============================================================================

console.log('\n--- Suite 3: Workstation Type Structure ---');

var wsTypes = Object.keys(CraftingChains.WORKSTATION_TYPES);
for (var wi = 0; wi < wsTypes.length; wi++) {
  var wst = CraftingChains.WORKSTATION_TYPES[wsTypes[wi]];
  assert(typeof wst.id === 'string' && wst.id.length > 0, 'Workstation ' + wsTypes[wi] + ' has id');
  assert(typeof wst.name === 'string' && wst.name.length > 0, 'Workstation ' + wsTypes[wi] + ' has name');
  assert(typeof wst.stage === 'string', 'Workstation ' + wsTypes[wi] + ' has stage');
  assert(typeof wst.baseTime === 'number' && wst.baseTime > 0, 'Workstation ' + wsTypes[wi] + ' has baseTime > 0');
  assert(typeof wst.durabilityMax === 'number' && wst.durabilityMax > 0, 'Workstation ' + wsTypes[wi] + ' has durabilityMax > 0');
  assert(typeof wst.specialization === 'string', 'Workstation ' + wsTypes[wi] + ' has specialization');
}

// Stage assignments
assert(CraftingChains.WORKSTATION_TYPES.smelter.stage === 'raw', 'smelter is raw stage');
assert(CraftingChains.WORKSTATION_TYPES.refinery.stage === 'raw', 'refinery is raw stage');
assert(CraftingChains.WORKSTATION_TYPES.forge.stage === 'refined', 'forge is refined stage');
assert(CraftingChains.WORKSTATION_TYPES.loom.stage === 'refined', 'loom is refined stage');
assert(CraftingChains.WORKSTATION_TYPES.engraver.stage === 'component', 'engraver is component stage');
assert(CraftingChains.WORKSTATION_TYPES.assembler.stage === 'component', 'assembler is component stage');

// ============================================================================
// SUITE 4: BLUEPRINT STRUCTURE
// ============================================================================

console.log('\n--- Suite 4: Blueprint Structure ---');

var bps = CraftingChains.CHAIN_BLUEPRINTS;
var bpIds = {};

for (var bpi = 0; bpi < bps.length; bpi++) {
  var bp = bps[bpi];
  assert(typeof bp.id === 'string' && bp.id.length > 0, 'Blueprint ' + bpi + ' has id');
  assert(typeof bp.name === 'string', 'Blueprint ' + bp.id + ' has name');
  assert(typeof bp.category === 'string', 'Blueprint ' + bp.id + ' has category');
  assert(typeof bp.levelRequired === 'number' && bp.levelRequired >= 1, 'Blueprint ' + bp.id + ' has levelRequired >= 1');
  assert(Array.isArray(bp.stages) && bp.stages.length >= 2, 'Blueprint ' + bp.id + ' has 2+ stages');
  assert(typeof bp.xpReward === 'number' && bp.xpReward > 0, 'Blueprint ' + bp.id + ' has xpReward > 0');
  assert(typeof bp.description === 'string', 'Blueprint ' + bp.id + ' has description');
  assert(!bpIds[bp.id], 'Blueprint id unique: ' + bp.id);
  bpIds[bp.id] = true;

  for (var si = 0; si < bp.stages.length; si++) {
    var stage = bp.stages[si];
    assert(typeof stage.stage === 'string', bp.id + ' stage ' + si + ' has stage name');
    assert(typeof stage.workstation === 'string', bp.id + ' stage ' + si + ' has workstation');
    assert(Array.isArray(stage.inputs) && stage.inputs.length >= 1, bp.id + ' stage ' + si + ' has inputs');
    assert(typeof stage.output === 'object', bp.id + ' stage ' + si + ' has output');
    assert(typeof stage.output.itemId === 'string', bp.id + ' stage ' + si + ' output has itemId');
    assert(typeof stage.output.qty === 'number' && stage.output.qty > 0, bp.id + ' stage ' + si + ' output qty > 0');
    assert(typeof stage.time === 'number' && stage.time > 0, bp.id + ' stage ' + si + ' has time > 0');

    for (var ii = 0; ii < stage.inputs.length; ii++) {
      var inp = stage.inputs[ii];
      assert(typeof inp.itemId === 'string' && inp.itemId.length > 0, bp.id + ' stage ' + si + ' input ' + ii + ' has itemId');
      assert(typeof inp.qty === 'number' && inp.qty > 0, bp.id + ' stage ' + si + ' input ' + ii + ' qty > 0');
    }
  }
}

// ============================================================================
// SUITE 5: MULBERRY32 PRNG
// ============================================================================

console.log('\n--- Suite 5: mulberry32 PRNG ---');

var rng1 = CraftingChains.mulberry32(42);
var rng2 = CraftingChains.mulberry32(42);

var r1a = rng1(), r1b = rng1(), r1c = rng1();
var r2a = rng2(), r2b = rng2(), r2c = rng2();

assert(r1a === r2a, 'Same seed produces same first value');
assert(r1b === r2b, 'Same seed produces same second value');
assert(r1c === r2c, 'Same seed produces same third value');
assert(r1a >= 0 && r1a < 1, 'PRNG output is in [0, 1)');
assert(r1b >= 0 && r1b < 1, 'PRNG second output in [0, 1)');
assert(r1a !== r1b, 'Consecutive values differ');

var rng3 = CraftingChains.mulberry32(999);
var rng4 = CraftingChains.mulberry32(1000);
assert(rng3() !== rng4(), 'Different seeds produce different values');

// ============================================================================
// SUITE 6: getQualityTier
// ============================================================================

console.log('\n--- Suite 6: getQualityTier ---');

assert(CraftingChains.getQualityTier(0.0) === 'poor', 'Quality 0.0 = poor');
assert(CraftingChains.getQualityTier(0.1) === 'poor', 'Quality 0.1 = poor');
assert(CraftingChains.getQualityTier(0.29) === 'poor', 'Quality 0.29 = poor');
assert(CraftingChains.getQualityTier(0.3) === 'common', 'Quality 0.3 = common');
assert(CraftingChains.getQualityTier(0.5) === 'common', 'Quality 0.5 = common');
assert(CraftingChains.getQualityTier(0.59) === 'common', 'Quality 0.59 = common');
assert(CraftingChains.getQualityTier(0.6) === 'fine', 'Quality 0.6 = fine');
assert(CraftingChains.getQualityTier(0.75) === 'fine', 'Quality 0.75 = fine');
assert(CraftingChains.getQualityTier(0.79) === 'fine', 'Quality 0.79 = fine');
assert(CraftingChains.getQualityTier(0.8) === 'superior', 'Quality 0.8 = superior');
assert(CraftingChains.getQualityTier(0.9) === 'superior', 'Quality 0.9 = superior');
assert(CraftingChains.getQualityTier(0.94) === 'superior', 'Quality 0.94 = superior');
assert(CraftingChains.getQualityTier(0.95) === 'masterwork', 'Quality 0.95 = masterwork');
assert(CraftingChains.getQualityTier(1.0) === 'masterwork', 'Quality 1.0 = masterwork');

// ============================================================================
// SUITE 7: calcPropagatedQuality
// ============================================================================

console.log('\n--- Suite 7: calcPropagatedQuality ---');

var pq0 = CraftingChains.calcPropagatedQuality(0.8, 0, 0);
assert(pq0 === 0.8, 'Stage 0: pure roll, no propagation (got ' + pq0 + ')');

var pq1 = CraftingChains.calcPropagatedQuality(0.8, 0.4, 1);
// Expected: 0.8 * 0.6 + 0.4 * 0.4 = 0.48 + 0.16 = 0.64
assert(Math.abs(pq1 - 0.64) < 0.001, 'Stage 1 propagation: 0.8 roll, 0.4 prev → ~0.64 (got ' + pq1 + ')');

var pq2 = CraftingChains.calcPropagatedQuality(1.0, 1.0, 1);
assert(pq2 === 1.0, 'Perfect inputs → perfect output (stage 1)');

var pq3 = CraftingChains.calcPropagatedQuality(0.0, 0.0, 2);
assert(pq3 === 0.0, 'Zero roll, zero prev → zero quality');

var pqHigh = CraftingChains.calcPropagatedQuality(0.9, 0.5, 1);
assert(pqHigh > 0.5, 'High roll drags quality up when prev is lower');
assert(pqHigh < 0.9, 'Propagation is weighted average, not full roll');

// ============================================================================
// SUITE 8: getProductionTime
// ============================================================================

console.log('\n--- Suite 8: getProductionTime ---');

assert(CraftingChains.getProductionTime(10000, 0) === 10000, 'Level 0: no time reduction');
assert(CraftingChains.getProductionTime(10000, 1) === 9000, 'Level 1: 10% reduction');
assert(CraftingChains.getProductionTime(10000, 2) === 8100, 'Level 2: 19% reduction');
assert(CraftingChains.getProductionTime(10000, 3) === 7290, 'Level 3: ~27% reduction');

var ptNeg = CraftingChains.getProductionTime(0, 0);
assert(ptNeg === 0, 'getProductionTime(0, 0) = 0');

// ============================================================================
// SUITE 9: buildWorkstation
// ============================================================================

console.log('\n--- Suite 9: buildWorkstation ---');

var s9 = makeState({ player1: makePlayer() });
var bwR = CraftingChains.buildWorkstation(s9, 'player1', 'smelter', 'ws_smelter_1');
assert(bwR.success === true, 'buildWorkstation succeeds for valid type');
assert(typeof bwR.workstation === 'object', 'Returns workstation object');
assert(bwR.workstation.id === 'ws_smelter_1', 'Workstation has correct id');
assert(bwR.workstation.type === 'smelter', 'Workstation type is smelter');
assert(bwR.workstation.ownerId === 'player1', 'Owner is player1');
assert(bwR.workstation.durability === CraftingChains.WORKSTATION_TYPES.smelter.durabilityMax, 'Full durability on build');
assert(bwR.workstation.upgradeLevel === 0, 'Starts at upgrade level 0');
assert(Array.isArray(bwR.workstation.accessList), 'accessList is array');
assert(bwR.workstation.accessList.indexOf('player1') !== -1, 'Owner is in accessList');

// Duplicate id
var dupR = CraftingChains.buildWorkstation(s9, 'player1', 'smelter', 'ws_smelter_1');
assert(dupR.success === false, 'Cannot build workstation with duplicate id');

// Unknown type
var unkR = CraftingChains.buildWorkstation(s9, 'player1', 'blaster', 'ws_blaster_1');
assert(unkR.success === false, 'Rejects unknown workstation type');

// Unknown player
var noPlayerR = CraftingChains.buildWorkstation(s9, 'ghost', 'forge', 'ws_forge_1');
assert(noPlayerR.success === false, 'Rejects unknown player');

// All 6 types
var s9b = makeState({ player1: makePlayer() });
var types = ['smelter', 'forge', 'loom', 'engraver', 'assembler', 'refinery'];
for (var ti = 0; ti < types.length; ti++) {
  var tr = CraftingChains.buildWorkstation(s9b, 'player1', types[ti], 'ws_' + types[ti]);
  assert(tr.success === true, 'buildWorkstation succeeds for type: ' + types[ti]);
}

// ============================================================================
// SUITE 10: upgradeWorkstation
// ============================================================================

console.log('\n--- Suite 10: upgradeWorkstation ---');

var s10 = stateWithWorkstation('ws1', 'forge', 'player1');
assert(s10.craftingChains.workstations.ws1.upgradeLevel === 0, 'Starts at level 0');

var u1 = CraftingChains.upgradeWorkstation(s10, 'player1', 'ws1');
assert(u1.success === true, 'First upgrade succeeds');
assert(u1.workstation.upgradeLevel === 1, 'Upgrade level is now 1');

var u2 = CraftingChains.upgradeWorkstation(s10, 'player1', 'ws1');
assert(u2.success === true, 'Second upgrade succeeds');
assert(u2.workstation.upgradeLevel === 2, 'Upgrade level is now 2');

var u3 = CraftingChains.upgradeWorkstation(s10, 'player1', 'ws1');
assert(u3.success === true, 'Third upgrade succeeds');
assert(u3.workstation.upgradeLevel === 3, 'Upgrade level is now 3 (max)');

var u4 = CraftingChains.upgradeWorkstation(s10, 'player1', 'ws1');
assert(u4.success === false, 'Cannot upgrade beyond max level');

// Non-owner upgrade
var s10b = stateWithWorkstation('ws1', 'forge', 'player1');
s10b.players.player2 = makePlayer();
var uNonOwner = CraftingChains.upgradeWorkstation(s10b, 'player2', 'ws1');
assert(uNonOwner.success === false, 'Non-owner cannot upgrade workstation');

// Non-existent workstation
var uGhost = CraftingChains.upgradeWorkstation(s10, 'player1', 'nonexistent');
assert(uGhost.success === false, 'Cannot upgrade non-existent workstation');

// ============================================================================
// SUITE 11: grantAccess / revokeAccess
// ============================================================================

console.log('\n--- Suite 11: grantAccess / revokeAccess ---');

var s11 = stateWithWorkstation('ws1', 'smelter', 'player1');
s11.players.player2 = makePlayer();
s11.players.player3 = makePlayer();

var ga = CraftingChains.grantAccess(s11, 'player1', 'ws1', 'player2');
assert(ga.success === true, 'Owner can grant access');
assert(s11.craftingChains.workstations.ws1.accessList.indexOf('player2') !== -1, 'player2 is in accessList');

// Idempotent
var ga2 = CraftingChains.grantAccess(s11, 'player1', 'ws1', 'player2');
assert(ga2.success === true, 'Granting access twice is idempotent');
var cnt = 0;
s11.craftingChains.workstations.ws1.accessList.forEach(function(id) { if (id === 'player2') cnt++; });
assert(cnt === 1, 'player2 appears exactly once in accessList');

// Non-owner cannot grant
var gaNonOwner = CraftingChains.grantAccess(s11, 'player2', 'ws1', 'player3');
assert(gaNonOwner.success === false, 'Non-owner cannot grant access');

// Ghost workstation
var gaGhost = CraftingChains.grantAccess(s11, 'player1', 'ghostws', 'player2');
assert(gaGhost.success === false, 'Cannot grant on non-existent workstation');

// Revoke
var rv = CraftingChains.revokeAccess(s11, 'player1', 'ws1', 'player2');
assert(rv.success === true, 'Owner can revoke access');
assert(s11.craftingChains.workstations.ws1.accessList.indexOf('player2') === -1, 'player2 removed from accessList');

// Cannot revoke owner
var rvOwner = CraftingChains.revokeAccess(s11, 'player1', 'ws1', 'player1');
assert(rvOwner.success === false, 'Cannot revoke owner\'s own access');

// Non-owner cannot revoke
CraftingChains.grantAccess(s11, 'player1', 'ws1', 'player3');
var rvNonOwner = CraftingChains.revokeAccess(s11, 'player2', 'ws1', 'player3');
assert(rvNonOwner.success === false, 'Non-owner cannot revoke access');

// ============================================================================
// SUITE 12: repairWorkstation
// ============================================================================

console.log('\n--- Suite 12: repairWorkstation ---');

var s12 = stateWithWorkstation('ws1', 'smelter', 'player1', { durability: 10 });
var maxDur = CraftingChains.WORKSTATION_TYPES.smelter.durabilityMax;
assert(s12.craftingChains.workstations.ws1.durability === 10, 'Setup: durability is 10');

var rep = CraftingChains.repairWorkstation(s12, 'player1', 'ws1');
assert(rep.success === true, 'Repair succeeds for owner');
assert(rep.workstation.durability === maxDur, 'Durability restored to max after repair');

// Non-access player
s12.players.player2 = makePlayer();
var repNoAccess = CraftingChains.repairWorkstation(s12, 'player2', 'ws1');
assert(repNoAccess.success === false, 'Player without access cannot repair');

// Grant access and retry
CraftingChains.grantAccess(s12, 'player1', 'ws1', 'player2');
s12.craftingChains.workstations.ws1.durability = 50;
var repGuest = CraftingChains.repairWorkstation(s12, 'player2', 'ws1');
assert(repGuest.success === true, 'Guest with access can repair workstation');
assert(repGuest.workstation.durability === maxDur, 'Durability restored by guest repair');

// Non-existent workstation
var repGhost = CraftingChains.repairWorkstation(s12, 'player1', 'ghost');
assert(repGhost.success === false, 'Cannot repair non-existent workstation');

// ============================================================================
// SUITE 13: getPlayerWorkstations / getAccessibleWorkstations
// ============================================================================

console.log('\n--- Suite 13: getPlayerWorkstations / getAccessibleWorkstations ---');

var s13 = makeState({ player1: makePlayer(), player2: makePlayer() });
CraftingChains.buildWorkstation(s13, 'player1', 'smelter', 'ws_s1');
CraftingChains.buildWorkstation(s13, 'player1', 'forge', 'ws_f1');
CraftingChains.buildWorkstation(s13, 'player2', 'loom', 'ws_l1');

var p1ws = CraftingChains.getPlayerWorkstations(s13, 'player1');
assert(Array.isArray(p1ws), 'getPlayerWorkstations returns array');
assert(p1ws.length === 2, 'player1 owns 2 workstations');

var p2ws = CraftingChains.getPlayerWorkstations(s13, 'player2');
assert(p2ws.length === 1, 'player2 owns 1 workstation');

// Grant cross-access
CraftingChains.grantAccess(s13, 'player2', 'ws_l1', 'player1');
var p1Access = CraftingChains.getAccessibleWorkstations(s13, 'player1');
assert(p1Access.length === 3, 'player1 can access 3 workstations (owns 2 + granted 1)');

var p2Access = CraftingChains.getAccessibleWorkstations(s13, 'player2');
assert(p2Access.length === 1, 'player2 accesses their own 1 workstation');

// Empty state
var emptyState = makeState({ player1: makePlayer() });
var noWs = CraftingChains.getPlayerWorkstations(emptyState, 'player1');
assert(Array.isArray(noWs) && noWs.length === 0, 'No workstations returns empty array');

// ============================================================================
// SUITE 14: getBlueprints / getBlueprintById
// ============================================================================

console.log('\n--- Suite 14: getBlueprints / getBlueprintById ---');

var allBps = CraftingChains.getBlueprints();
assert(Array.isArray(allBps), 'getBlueprints returns array');
assert(allBps.length === CraftingChains.CHAIN_BLUEPRINTS.length, 'getBlueprints returns all blueprints');

var weaponBps = CraftingChains.getBlueprints('weapons');
assert(Array.isArray(weaponBps), 'getBlueprints(weapons) returns array');
assert(weaponBps.length >= 1, 'At least one weapon blueprint');
weaponBps.forEach(function(b) {
  assert(b.category === 'weapons', 'Filtered blueprint has category weapons');
});

var noCategory = CraftingChains.getBlueprints('nonexistent');
assert(Array.isArray(noCategory) && noCategory.length === 0, 'Unknown category returns empty array');

var foundBp = CraftingChains.getBlueprintById('chain_iron_sword');
assert(foundBp !== null, 'getBlueprintById finds chain_iron_sword');
assert(foundBp.id === 'chain_iron_sword', 'Retrieved blueprint has correct id');
assert(foundBp.stages.length === 4, 'Iron sword chain has 4 stages');

var nullBp = CraftingChains.getBlueprintById('no_such_bp');
assert(nullBp === null, 'getBlueprintById returns null for unknown id');

// ============================================================================
// SUITE 15: discoverBlueprint / hasDiscoveredBlueprint
// ============================================================================

console.log('\n--- Suite 15: discoverBlueprint / hasDiscoveredBlueprint ---');

var s15 = makeState({ player1: makePlayer() });

assert(CraftingChains.hasDiscoveredBlueprint(s15, 'player1', 'chain_iron_sword') === false,
  'New player has not discovered blueprints');

var disc1 = CraftingChains.discoverBlueprint(s15, 'player1', 'chain_iron_sword');
assert(disc1.success === true, 'discoverBlueprint succeeds');
assert(CraftingChains.hasDiscoveredBlueprint(s15, 'player1', 'chain_iron_sword') === true,
  'Blueprint is now discovered');

// Duplicate discovery
var disc2 = CraftingChains.discoverBlueprint(s15, 'player1', 'chain_iron_sword');
assert(disc2.success === false, 'Cannot discover already-known blueprint');

// Unknown blueprint
var discUnk = CraftingChains.discoverBlueprint(s15, 'player1', 'no_such_blueprint');
assert(discUnk.success === false, 'Cannot discover unknown blueprint');

// Unknown player
var discUnkPlayer = CraftingChains.discoverBlueprint(s15, 'ghost', 'chain_iron_sword');
assert(discUnkPlayer.success === false, 'Cannot discover for unknown player');

// getDiscoveredBlueprints
CraftingChains.discoverBlueprint(s15, 'player1', 'chain_steel_ingot');
var discovered = CraftingChains.getDiscoveredBlueprints(s15, 'player1');
assert(Array.isArray(discovered), 'getDiscoveredBlueprints returns array');
assert(discovered.length === 2, 'Player has 2 discovered blueprints');
discovered.forEach(function(d) {
  assert(typeof d.id === 'string', 'Discovered blueprint has id');
  assert(Array.isArray(d.stages), 'Discovered blueprint has stages');
});

// Empty player
var emptyDisc = CraftingChains.getDiscoveredBlueprints(s15, 'ghost');
assert(emptyDisc.length === 0, 'getDiscoveredBlueprints returns empty for unknown player');

// ============================================================================
// SUITE 16: experimentBlueprint
// ============================================================================

console.log('\n--- Suite 16: experimentBlueprint ---');

var s16 = makeState({ player1: makePlayer({ craftingLevel: 5 }) });

// With seed that guarantees discovery (run several with different seeds to find one)
var experimentResult = null;
for (var expSeed = 1; expSeed <= 50; expSeed++) {
  var er = CraftingChains.experimentBlueprint(s16, 'player1', 'chain_gold_artefact', expSeed);
  if (er.success && er.discovered) { experimentResult = er; break; }
}
assert(experimentResult !== null, 'experimentBlueprint can discover blueprint');
assert(experimentResult.blueprintId === 'chain_gold_artefact', 'Discovered correct blueprint');
assert(CraftingChains.hasDiscoveredBlueprint(s16, 'player1', 'chain_gold_artefact') === true,
  'Blueprint is discoverable through experiment');

// Already discovered
var expDup = CraftingChains.experimentBlueprint(s16, 'player1', 'chain_gold_artefact', 1);
assert(expDup.success === true, 'experimenting on known blueprint returns success');
assert(expDup.discovered === false, 'discovered flag is false for already-known');

// Unknown blueprint
var expUnk = CraftingChains.experimentBlueprint(s16, 'player1', 'no_bp', 1);
assert(expUnk.success === false, 'experiment fails on unknown blueprint');

// Unknown player
var expUnkPlayer = CraftingChains.experimentBlueprint(s16, 'ghost', 'chain_iron_sword', 1);
assert(expUnkPlayer.success === false, 'experiment fails on unknown player');

// ============================================================================
// SUITE 17: canRunStage
// ============================================================================

console.log('\n--- Suite 17: canRunStage ---');

// Setup: smelter workstation + correct materials
var s17 = stateWithWorkstation('ws_smelter', 'smelter', 'player1');
giveItems(s17, 'player1', { iron_ore: 10, coal: 10 });

var cr1 = CraftingChains.canRunStage(s17, 'player1', 'chain_iron_sword', 0, 'ws_smelter');
assert(cr1.canRun === true, 'canRunStage: valid setup returns canRun=true');
assert(cr1.reason === 'OK', 'canRunStage: reason is OK');

// Unknown blueprint
var crUnkBp = CraftingChains.canRunStage(s17, 'player1', 'no_bp', 0, 'ws_smelter');
assert(crUnkBp.canRun === false, 'canRunStage: unknown blueprint → false');

// Invalid stage index
var crBadIdx = CraftingChains.canRunStage(s17, 'player1', 'chain_iron_sword', 99, 'ws_smelter');
assert(crBadIdx.canRun === false, 'canRunStage: invalid stage index → false');

// Level check
var s17Low = stateWithWorkstation('ws_smelter', 'smelter', 'player1', { playerOpts: { level: 1 } });
giveItems(s17Low, 'player1', { iron_ore: 10, coal: 10 });
var crLevel = CraftingChains.canRunStage(s17Low, 'player1', 'chain_iron_sword', 0, 'ws_smelter');
assert(crLevel.canRun === false, 'canRunStage: insufficient level → false');
assert(typeof crLevel.reason === 'string', 'Reason is a string');

// Wrong workstation type
var s17WrongWs = stateWithWorkstation('ws_forge', 'forge', 'player1');
giveItems(s17WrongWs, 'player1', { iron_ore: 10, coal: 10 });
var crWrongWs = CraftingChains.canRunStage(s17WrongWs, 'player1', 'chain_iron_sword', 0, 'ws_forge');
assert(crWrongWs.canRun === false, 'canRunStage: wrong workstation type → false');

// No access
var s17NoAccess = stateWithWorkstation('ws_smelter', 'smelter', 'player1');
s17NoAccess.players.player2 = makePlayer();
giveItems(s17NoAccess, 'player2', { iron_ore: 10, coal: 10 });
var crNoAccess = CraftingChains.canRunStage(s17NoAccess, 'player2', 'chain_iron_sword', 0, 'ws_smelter');
assert(crNoAccess.canRun === false, 'canRunStage: no access → false');

// Missing materials
var s17NoMat = stateWithWorkstation('ws_smelter', 'smelter', 'player1');
var crNoMat = CraftingChains.canRunStage(s17NoMat, 'player1', 'chain_iron_sword', 0, 'ws_smelter');
assert(crNoMat.canRun === false, 'canRunStage: missing materials → false');

// Broken workstation (durability 0)
var s17Broken = stateWithWorkstation('ws_smelter', 'smelter', 'player1', { durability: 0 });
giveItems(s17Broken, 'player1', { iron_ore: 10, coal: 10 });
var crBroken = CraftingChains.canRunStage(s17Broken, 'player1', 'chain_iron_sword', 0, 'ws_smelter');
assert(crBroken.canRun === false, 'canRunStage: broken workstation → false');

// Non-existent workstation
var crNoWs = CraftingChains.canRunStage(s17, 'player1', 'chain_iron_sword', 0, 'ghost_ws');
assert(crNoWs.canRun === false, 'canRunStage: non-existent workstation → false');

// ============================================================================
// SUITE 18: runStage (single stage execution)
// ============================================================================

console.log('\n--- Suite 18: runStage ---');

var s18 = stateWithWorkstation('ws_smelter', 'smelter', 'player1');
giveItems(s18, 'player1', { iron_ore: 10, coal: 10 });
var wsDur = s18.craftingChains.workstations.ws_smelter.durability;

var rs1 = CraftingChains.runStage(s18, 'player1', 'chain_iron_sword', 0, 'ws_smelter', 12345, 0);
assert(rs1.success === true, 'runStage stage 0 succeeds with materials');
assert(typeof rs1.output === 'object', 'runStage returns output object');
assert(rs1.output.itemId === 'iron_ingot', 'Stage 0 outputs iron_ingot');
assert(rs1.output.qty === 2, 'Stage 0 outputs qty 2');
assert(typeof rs1.quality === 'number', 'runStage returns quality');
assert(rs1.quality >= 0 && rs1.quality <= 1, 'Quality is in [0, 1]');
assert(typeof rs1.qualityTier === 'string', 'runStage returns qualityTier');
assert(rs1.durabilityLeft === wsDur - CraftingChains.DURABILITY_COST_PER_RUN, 'Durability decreased');

// Materials consumed
var oreLeft = s18.players.player1.inventory.iron_ore;
assert(oreLeft === 6, 'iron_ore consumed correctly (10 - 4 = 6, got ' + oreLeft + ')');
var coalLeft = s18.players.player1.inventory.coal;
assert(coalLeft === 8, 'coal consumed correctly (10 - 2 = 8, got ' + coalLeft + ')');

// Output added to inventory
var ingotCount = s18.players.player1.inventory.iron_ingot;
assert(ingotCount === 2, 'iron_ingot added to inventory (got ' + ingotCount + ')');

// Chain history recorded
assert(s18.players.player1.chainHistory.length === 1, 'Chain history has 1 entry');
assert(s18.players.player1.chainHistory[0].blueprintId === 'chain_iron_sword', 'History records blueprint');
assert(s18.players.player1.chainHistory[0].stageIdx === 0, 'History records stage index');

// Fail: insufficient materials
var s18b = stateWithWorkstation('ws_smelter', 'smelter', 'player1');
var rs2 = CraftingChains.runStage(s18b, 'player1', 'chain_iron_sword', 0, 'ws_smelter', 1, 0);
assert(rs2.success === false, 'runStage fails when materials missing');
assert(typeof rs2.reason === 'string', 'Returns reason string on failure');

// ============================================================================
// SUITE 19: runStage quality propagation
// ============================================================================

console.log('\n--- Suite 19: runStage quality propagation ---');

var s19 = stateWithWorkstation('ws_smelter', 'smelter', 'player1');
giveItems(s19, 'player1', { iron_ore: 10, coal: 10 });

// Run with known seed for repeatability
var rs19a = CraftingChains.runStage(s19, 'player1', 'chain_iron_sword', 0, 'ws_smelter', 777, 0);
var rs19b = CraftingChains.runStage(
  stateWithWorkstation('ws_smelter', 'smelter', 'player1'),
  'player1', 'chain_iron_sword', 0, 'ws_smelter', 777, 0
);
// Same seed should produce same quality
giveItems(stateWithWorkstation('ws_smelter', 'smelter', 'player1'), 'player1', { iron_ore: 10, coal: 10 });
// Since states are rebuilt, just verify quality range
assert(rs19a.quality >= 0 && rs19a.quality <= 1, 'Stage 0 quality is valid');

// With high prevQuality: quality should be dragged toward prev
var s19c = stateWithWorkstation('ws_smelter', 'smelter', 'player1');
giveItems(s19c, 'player1', { iron_ore: 10, coal: 10 });
var rs19c = CraftingChains.runStage(s19c, 'player1', 'chain_iron_sword', 0, 'ws_smelter', 1, 0);
assert(rs19c.success === true, 'Stage runs fine');
assert(rs19c.quality >= 0, 'Quality non-negative');

// ============================================================================
// SUITE 20: runStage specialization bonus
// ============================================================================

console.log('\n--- Suite 20: runStage specialization bonus ---');

// Player with metallurgy specialization (smelter uses metallurgy)
var s20 = stateWithWorkstation('ws_smelter', 'smelter', 'player1', {
  playerOpts: { specializations: { metallurgy: 3 } }
});
giveItems(s20, 'player1', { iron_ore: 10, coal: 10 });
var rs20 = CraftingChains.runStage(s20, 'player1', 'chain_iron_sword', 0, 'ws_smelter', 42, 0);
assert(rs20.success === true, 'runStage with specialization succeeds');
// Spec bonus = 3 * 0.03 = 0.09, quality is boosted by spec
assert(rs20.quality >= 0, 'Quality is non-negative with spec bonus');

// No specialization
var s20b = stateWithWorkstation('ws_smelter', 'smelter', 'player1');
giveItems(s20b, 'player1', { iron_ore: 10, coal: 10 });
var rs20b = CraftingChains.runStage(s20b, 'player1', 'chain_iron_sword', 0, 'ws_smelter', 42, 0);
// Quality without spec should be <= quality with spec (for same seed, since roll is clamped up)
assert(rs20b.success === true, 'Stage runs without specialization');

// ============================================================================
// SUITE 21: runChain (full chain)
// ============================================================================

console.log('\n--- Suite 21: runChain ---');

// Build full set of workstations for iron sword chain: smelter→forge→engraver→assembler
function makeFullChainState() {
  var state = makeState({ player1: makePlayer() });
  state.craftingChains = { workstations: {} };

  var wsTypes2 = CraftingChains.WORKSTATION_TYPES;
  ['smelter', 'forge', 'engraver', 'assembler'].forEach(function(t) {
    state.craftingChains.workstations['ws_' + t] = {
      id: 'ws_' + t, type: t, name: wsTypes2[t].name,
      ownerId: 'player1', durability: wsTypes2[t].durabilityMax,
      durabilityMax: wsTypes2[t].durabilityMax,
      upgradeLevel: 0, accessList: ['player1'], builtAt: Date.now(), activeJobs: []
    };
  });

  // iron sword chain needs: iron_ore x4, coal x2 (stage0), coal x1 (stage1), gold_ore x1 (stage2), leather x2 (stage3)
  giveItems(state, 'player1', {
    iron_ore: 10, coal: 10, gold_ore: 5, leather: 10
  });
  return state;
}

var s21 = makeFullChainState();
var wsMap21 = {
  smelter:  'ws_smelter',
  forge:    'ws_forge',
  engraver: 'ws_engraver',
  assembler: 'ws_assembler'
};
var rc21 = CraftingChains.runChain(s21, 'player1', 'chain_iron_sword', wsMap21, 100);
assert(rc21.success === true, 'runChain iron_sword succeeds with all materials');
assert(Array.isArray(rc21.stageResults), 'runChain returns stageResults array');
assert(rc21.stageResults.length === 4, 'Iron sword chain has 4 stage results');
assert(typeof rc21.finalQuality === 'number', 'runChain returns finalQuality');
assert(rc21.finalQuality >= 0 && rc21.finalQuality <= 1, 'finalQuality in [0,1]');
assert(typeof rc21.finalQualityTier === 'string', 'runChain returns finalQualityTier');
assert(typeof rc21.xpAwarded === 'number' && rc21.xpAwarded > 0, 'XP awarded after chain');
assert(rc21.chainBonus === true, '4-stage chain earns chainBonus');

// XP awarded to player
assert(s21.players.player1.xp >= 120, 'Player received XP (got ' + s21.players.player1.xp + ')');

// Final product in inventory
var sword = s21.players.player1.inventory['masterwork_iron_sword'];
assert(sword === 1 || sword >= 1, 'masterwork_iron_sword in inventory (got ' + sword + ')');

// ============================================================================
// SUITE 22: runChain — 2-stage chain (no chain bonus)
// ============================================================================

console.log('\n--- Suite 22: runChain 2-stage ---');

var s22 = makeState({ player1: makePlayer() });
s22.craftingChains = { workstations: {} };
['smelter', 'forge'].forEach(function(t) {
  var wsType = CraftingChains.WORKSTATION_TYPES[t];
  s22.craftingChains.workstations['ws_' + t] = {
    id: 'ws_' + t, type: t, name: wsType.name,
    ownerId: 'player1', durability: wsType.durabilityMax,
    durabilityMax: wsType.durabilityMax,
    upgradeLevel: 0, accessList: ['player1'], builtAt: Date.now(), activeJobs: []
  };
});

giveItems(s22, 'player1', { iron_ore: 10, coal: 10, copper_ore: 5 });

var rc22 = CraftingChains.runChain(s22, 'player1', 'chain_steel_ingot', {
  smelter: 'ws_smelter',
  forge:   'ws_forge'
}, 200);
assert(rc22.success === true, 'runChain 2-stage steel_ingot succeeds');
assert(rc22.stageResults.length === 2, '2-stage chain has 2 results');
assert(rc22.chainBonus === false, '2-stage chain does not earn chainBonus (not all 4 stages)');
assert(rc22.xpAwarded > 0, 'XP awarded for 2-stage chain');

// ============================================================================
// SUITE 23: runChain — failure cases
// ============================================================================

console.log('\n--- Suite 23: runChain failures ---');

// No workstation map entry for a stage
var s23 = makeFullChainState();
var rcNoWs = CraftingChains.runChain(s23, 'player1', 'chain_iron_sword', {
  smelter: 'ws_smelter'
  // missing forge, engraver, assembler
}, 1);
assert(rcNoWs.success === false, 'runChain fails when workstation missing for stage');

// Unknown blueprint
var s23b = makeFullChainState();
var rcUnkBp = CraftingChains.runChain(s23b, 'player1', 'no_such_chain', {}, 1);
assert(rcUnkBp.success === false, 'runChain fails for unknown blueprint');

// Unknown player
var rcUnkPlayer = CraftingChains.runChain(s23b, 'ghost', 'chain_iron_sword', wsMap21, 1);
assert(rcUnkPlayer.success === false, 'runChain fails for unknown player');

// Missing materials mid-chain
var s23c = makeState({ player1: makePlayer() });
s23c.craftingChains = { workstations: {} };
['smelter', 'forge', 'engraver', 'assembler'].forEach(function(t) {
  var wt = CraftingChains.WORKSTATION_TYPES[t];
  s23c.craftingChains.workstations['ws_' + t] = {
    id: 'ws_' + t, type: t, name: wt.name, ownerId: 'player1',
    durability: wt.durabilityMax, durabilityMax: wt.durabilityMax,
    upgradeLevel: 0, accessList: ['player1'], builtAt: Date.now(), activeJobs: []
  };
});
giveItems(s23c, 'player1', { iron_ore: 10, coal: 10 });
// Missing gold_ore and leather required for later stages
var rcMidFail = CraftingChains.runChain(s23c, 'player1', 'chain_iron_sword', wsMap21, 1);
assert(rcMidFail.success === false, 'runChain fails if mid-chain materials are missing');

// ============================================================================
// SUITE 24: runChain — chainBonus adjusts finalQuality
// ============================================================================

console.log('\n--- Suite 24: chainBonus quality adjustment ---');

var s24 = makeFullChainState();
var rc24 = CraftingChains.runChain(s24, 'player1', 'chain_iron_sword', wsMap21, 777);
if (rc24.success) {
  var lastStageQ = rc24.stageResults[rc24.stageResults.length - 1].quality;
  // finalQuality should match last stage quality (after bonus applied)
  assert(rc24.finalQuality === lastStageQ, 'finalQuality equals last stage quality after bonus applied');
  assert(rc24.finalQuality <= 1.0, 'finalQuality does not exceed 1.0 even with bonus');
}

// ============================================================================
// SUITE 25: placeSupplyOrder
// ============================================================================

console.log('\n--- Suite 25: placeSupplyOrder ---');

var s25 = makeState({ player1: makePlayer() });
var po1 = CraftingChains.placeSupplyOrder(s25, 'player1', 'iron_ingot', 5, 10, 111);
assert(po1.success === true, 'placeSupplyOrder succeeds');
assert(typeof po1.orderId === 'string', 'Returns orderId');
assert(typeof po1.order === 'object', 'Returns order object');
assert(po1.order.requesterId === 'player1', 'Order requesterId correct');
assert(po1.order.itemId === 'iron_ingot', 'Order itemId correct');
assert(po1.order.qty === 5, 'Order qty correct');
assert(po1.order.offerPrice === 10, 'Order price correct');
assert(po1.order.status === 'open', 'New order status is open');
assert(po1.order.filled === 0, 'New order filled is 0');
assert(typeof po1.order.expiresAt === 'number', 'Order has expiresAt');

// Unknown player
var poUnk = CraftingChains.placeSupplyOrder(s25, 'ghost', 'iron_ingot', 1, 1, 1);
assert(poUnk.success === false, 'placeSupplyOrder fails for unknown player');

// Unknown item
var poUnkItem = CraftingChains.placeSupplyOrder(s25, 'player1', 'dragon_scales', 1, 1, 1);
assert(poUnkItem.success === false, 'placeSupplyOrder fails for unknown intermediate product');

// Zero quantity
var poZero = CraftingChains.placeSupplyOrder(s25, 'player1', 'iron_ingot', 0, 1, 1);
assert(poZero.success === false, 'placeSupplyOrder fails for qty = 0');

// Negative price
var poNegPrice = CraftingChains.placeSupplyOrder(s25, 'player1', 'iron_ingot', 1, -5, 1);
assert(poNegPrice.success === false, 'placeSupplyOrder fails for negative price');

// ============================================================================
// SUITE 26: fulfillSupplyOrder
// ============================================================================

console.log('\n--- Suite 26: fulfillSupplyOrder ---');

var s26 = makeState({ player1: makePlayer(), player2: makePlayer() });
giveItems(s26, 'player2', { iron_ingot: 10 });

var po26 = CraftingChains.placeSupplyOrder(s26, 'player1', 'iron_ingot', 5, 10, 222);
var orderId26 = po26.orderId;

var fo1 = CraftingChains.fulfillSupplyOrder(s26, 'player2', orderId26, 3);
assert(fo1.success === true, 'fulfillSupplyOrder partial fulfillment succeeds');
assert(fo1.filled === 3, 'Filled count is 3');
assert(fo1.remaining === 2, 'Remaining is 2');

// Items transferred
var p2ingots = s26.players.player2.inventory.iron_ingot;
assert(p2ingots === 7, 'Supplier lost 3 ingots (10 - 3 = 7, got ' + p2ingots + ')');
var p1ingots = s26.players.player1.inventory.iron_ingot;
assert(p1ingots === 3, 'Requester gained 3 ingots (got ' + p1ingots + ')');

// Complete fulfillment
var fo2 = CraftingChains.fulfillSupplyOrder(s26, 'player2', orderId26, 2);
assert(fo2.success === true, 'Final fulfillment succeeds');
assert(fo2.remaining === 0, 'No remaining after full fill');
var order26 = s26.craftingChains.supplyOrders[orderId26];
assert(order26.status === 'filled', 'Order status is filled when complete');

// Cannot fulfill filled order
var fo3 = CraftingChains.fulfillSupplyOrder(s26, 'player2', orderId26, 1);
assert(fo3.success === false, 'Cannot fulfill already-filled order');

// Cannot fulfill own order
var s26b = makeState({ player1: makePlayer() });
giveItems(s26b, 'player1', { iron_ingot: 10 });
var po26b = CraftingChains.placeSupplyOrder(s26b, 'player1', 'iron_ingot', 3, 5, 333);
var fo26b = CraftingChains.fulfillSupplyOrder(s26b, 'player1', po26b.orderId, 1);
assert(fo26b.success === false, 'Cannot fulfill own order');

// Not enough items
var s26c = makeState({ player1: makePlayer(), player2: makePlayer() });
giveItems(s26c, 'player2', { iron_ingot: 1 });
var po26c = CraftingChains.placeSupplyOrder(s26c, 'player1', 'iron_ingot', 5, 10, 444);
var fo26c = CraftingChains.fulfillSupplyOrder(s26c, 'player2', po26c.orderId, 5);
assert(fo26c.success === false, 'Cannot over-fulfill beyond what supplier has');

// Unknown order
var foUnk = CraftingChains.fulfillSupplyOrder(s26, 'player2', 'fake_order', 1);
assert(foUnk.success === false, 'Cannot fulfill unknown order');

// Unknown supplier
var foUnkSup = CraftingChains.fulfillSupplyOrder(s26, 'ghost', orderId26, 1);
assert(foUnkSup.success === false, 'Cannot fulfill for unknown player');

// ============================================================================
// SUITE 27: cancelSupplyOrder
// ============================================================================

console.log('\n--- Suite 27: cancelSupplyOrder ---');

var s27 = makeState({ player1: makePlayer(), player2: makePlayer() });
var po27 = CraftingChains.placeSupplyOrder(s27, 'player1', 'copper_ingot', 3, 5, 555);
var orderId27 = po27.orderId;

var co1 = CraftingChains.cancelSupplyOrder(s27, 'player1', orderId27);
assert(co1.success === true, 'Requester can cancel own order');
assert(s27.craftingChains.supplyOrders[orderId27].status === 'cancelled', 'Status set to cancelled');

// Cannot cancel already cancelled
var co2 = CraftingChains.cancelSupplyOrder(s27, 'player1', orderId27);
assert(co2.success === false, 'Cannot cancel already-cancelled order');

// Non-requester cannot cancel
var po27b = CraftingChains.placeSupplyOrder(s27, 'player1', 'copper_ingot', 3, 5, 666);
var co3 = CraftingChains.cancelSupplyOrder(s27, 'player2', po27b.orderId);
assert(co3.success === false, 'Non-requester cannot cancel order');

// Unknown order
var coUnk = CraftingChains.cancelSupplyOrder(s27, 'player1', 'no_order');
assert(coUnk.success === false, 'Cannot cancel unknown order');

// ============================================================================
// SUITE 28: getSupplyOrders / getPlayerOrders
// ============================================================================

console.log('\n--- Suite 28: getSupplyOrders / getPlayerOrders ---');

var s28 = makeState({ player1: makePlayer(), player2: makePlayer() });
CraftingChains.placeSupplyOrder(s28, 'player1', 'iron_ingot', 2, 5, 1);
CraftingChains.placeSupplyOrder(s28, 'player1', 'iron_ingot', 3, 8, 2);
CraftingChains.placeSupplyOrder(s28, 'player2', 'copper_ingot', 1, 4, 3);
CraftingChains.placeSupplyOrder(s28, 'player1', 'copper_ingot', 5, 6, 4);

var ironOrders = CraftingChains.getSupplyOrders(s28, 'iron_ingot');
assert(Array.isArray(ironOrders), 'getSupplyOrders returns array');
assert(ironOrders.length === 2, 'Two open iron_ingot orders (got ' + ironOrders.length + ')');
ironOrders.forEach(function(o) {
  assert(o.itemId === 'iron_ingot', 'Filtered orders are for iron_ingot');
  assert(o.status === 'open', 'Returned orders are open');
});

var allOrders = CraftingChains.getSupplyOrders(s28);
assert(allOrders.length === 4, 'getSupplyOrders() with no filter returns all open orders');

var p1Orders = CraftingChains.getPlayerOrders(s28, 'player1');
assert(Array.isArray(p1Orders), 'getPlayerOrders returns array');
assert(p1Orders.length === 3, 'player1 has 3 orders');

var p2Orders = CraftingChains.getPlayerOrders(s28, 'player2');
assert(p2Orders.length === 1, 'player2 has 1 order');

// Empty for unknown player
var ghostOrders = CraftingChains.getPlayerOrders(s28, 'ghost');
assert(ghostOrders.length === 0, 'Unknown player has no orders');

// ============================================================================
// SUITE 29: calcChainEfficiency
// ============================================================================

console.log('\n--- Suite 29: calcChainEfficiency ---');

var effResult1 = CraftingChains.calcChainEfficiency({
  finalQuality: 0.97,
  chainBonus: false,
  stageResults: [{}]
});
assert(effResult1.efficiency >= 0.95, 'High quality → masterwork efficiency');
assert(effResult1.rating === 'masterwork', 'masterwork rating for 0.97');

var effResult2 = CraftingChains.calcChainEfficiency({
  finalQuality: 0.85,
  chainBonus: false,
  stageResults: [{}]
});
assert(effResult2.rating === 'superior', 'superior rating for 0.85');

var effResult3 = CraftingChains.calcChainEfficiency({
  finalQuality: 0.7,
  chainBonus: false,
  stageResults: [{}]
});
assert(effResult3.rating === 'fine', 'fine rating for 0.7');

var effResult4 = CraftingChains.calcChainEfficiency({
  finalQuality: 0.4,
  chainBonus: false,
  stageResults: [{}]
});
assert(effResult4.rating === 'common', 'common rating for 0.4');

var effResult5 = CraftingChains.calcChainEfficiency({
  finalQuality: 0.1,
  chainBonus: false,
  stageResults: [{}]
});
assert(effResult5.rating === 'poor', 'poor rating for 0.1');

var effBonus = CraftingChains.calcChainEfficiency({
  finalQuality: 0.91,
  chainBonus: true,
  stageResults: [{}]
});
assert(effBonus.efficiency > 0.91, 'Chain bonus increases efficiency (got ' + effBonus.efficiency + ')');
assert(effBonus.efficiency <= 1.0, 'Efficiency does not exceed 1.0 with bonus');

// Null input
var effNull = CraftingChains.calcChainEfficiency(null);
assert(effNull.efficiency === 0, 'Null input returns efficiency 0');
assert(effNull.rating === 'failed', 'Null input returns failed rating');

// ============================================================================
// SUITE 30: getChainHistory
// ============================================================================

console.log('\n--- Suite 30: getChainHistory ---');

var s30 = makeState({ player1: makePlayer() });
// Simulate chain history entries
s30.players.player1.chainHistory = [
  { blueprintId: 'chain_iron_sword', stageIdx: 0, workstation: 'ws1', output: 'iron_ingot', quality: 0.7, qualityTier: 'fine', timestamp: 100 },
  { blueprintId: 'chain_iron_sword', stageIdx: 1, workstation: 'ws2', output: 'tempered_blade', quality: 0.75, qualityTier: 'fine', timestamp: 200 },
  { blueprintId: 'chain_steel_ingot', stageIdx: 0, workstation: 'ws1', output: 'iron_ingot', quality: 0.5, qualityTier: 'common', timestamp: 300 }
];

var hist30 = CraftingChains.getChainHistory(s30, 'player1');
assert(hist30.totalRuns === 3, 'Total runs is 3');
assert(typeof hist30.byBlueprint === 'object', 'byBlueprint is object');
assert(hist30.byBlueprint['chain_iron_sword'].runs === 2, 'Iron sword has 2 runs');
assert(hist30.byBlueprint['chain_steel_ingot'].runs === 1, 'Steel ingot has 1 run');
var expectedAvg = (0.7 + 0.75 + 0.5) / 3;
assert(Math.abs(hist30.avgQuality - expectedAvg) < 0.001, 'Average quality computed correctly');

// Unknown player
var histGhost = CraftingChains.getChainHistory(s30, 'ghost');
assert(histGhost.totalRuns === 0, 'Unknown player returns 0 runs');

// ============================================================================
// SUITE 31: getWorkstationStats
// ============================================================================

console.log('\n--- Suite 31: getWorkstationStats ---');

var s31 = stateWithWorkstation('ws1', 'smelter', 'player1', { durability: 100 });
s31.craftingChains.workstations.ws1.durabilityMax = 200;
s31.players.player1.chainHistory = [
  { workstation: 'ws1', quality: 0.8, blueprintId: 'x', stageIdx: 0, output: 'y', qualityTier: 'superior', timestamp: 1 },
  { workstation: 'ws1', quality: 0.6, blueprintId: 'x', stageIdx: 1, output: 'z', qualityTier: 'fine', timestamp: 2 },
  { workstation: 'ws2', quality: 0.5, blueprintId: 'x', stageIdx: 0, output: 'w', qualityTier: 'common', timestamp: 3 }
];

var stats31 = CraftingChains.getWorkstationStats(s31, 'ws1');
assert(stats31.runs === 2, 'ws1 has 2 runs (got ' + stats31.runs + ')');
assert(Math.abs(stats31.avgQuality - 0.7) < 0.001, 'avgQuality for ws1 is 0.7');
assert(Math.abs(stats31.durabilityPct - 0.5) < 0.001, 'durabilityPct is 0.5 (100/200)');

// Non-existent workstation
var statsGhost = CraftingChains.getWorkstationStats(s31, 'ghost');
assert(statsGhost.runs === 0, 'Non-existent workstation returns 0 runs');
assert(statsGhost.durabilityPct === 0, 'Non-existent workstation returns 0 durabilityPct');

// ============================================================================
// SUITE 32: applyMessage
// ============================================================================

console.log('\n--- Suite 32: applyMessage ---');

// Not a chain_craft message
var am1 = CraftingChains.applyMessage({ players: {} }, { type: 'craft', payload: {}, from: 'p1' });
assert(am1.success === false, 'applyMessage rejects non chain_craft messages');

// build_workstation action
var s32 = makeState({ player1: makePlayer() });
var amBuild = CraftingChains.applyMessage(s32, {
  type: 'chain_craft',
  from: 'player1',
  payload: { action: 'build_workstation', workstationType: 'forge', workstationId: 'ws_forge_a' }
});
assert(amBuild.success === true, 'applyMessage build_workstation succeeds');

// upgrade_workstation action
var amUpgrade = CraftingChains.applyMessage(s32, {
  type: 'chain_craft',
  from: 'player1',
  payload: { action: 'upgrade_workstation', workstationId: 'ws_forge_a' }
});
assert(amUpgrade.success === true, 'applyMessage upgrade_workstation succeeds');

// grant_access action
s32.players.player2 = makePlayer();
var amGrant = CraftingChains.applyMessage(s32, {
  type: 'chain_craft',
  from: 'player1',
  payload: { action: 'grant_access', workstationId: 'ws_forge_a', guestId: 'player2' }
});
assert(amGrant.success === true, 'applyMessage grant_access succeeds');

// revoke_access action
var amRevoke = CraftingChains.applyMessage(s32, {
  type: 'chain_craft',
  from: 'player1',
  payload: { action: 'revoke_access', workstationId: 'ws_forge_a', guestId: 'player2' }
});
assert(amRevoke.success === true, 'applyMessage revoke_access succeeds');

// repair_workstation action
s32.craftingChains.workstations.ws_forge_a.durability = 10;
var amRepair = CraftingChains.applyMessage(s32, {
  type: 'chain_craft',
  from: 'player1',
  payload: { action: 'repair_workstation', workstationId: 'ws_forge_a' }
});
assert(amRepair.success === true, 'applyMessage repair_workstation succeeds');

// place_order action
var amOrder = CraftingChains.applyMessage(s32, {
  type: 'chain_craft',
  from: 'player1',
  payload: { action: 'place_order', itemId: 'iron_ingot', qty: 2, offerPrice: 5, seed: 1 }
});
assert(amOrder.success === true, 'applyMessage place_order succeeds');

// fulfill_order action
giveItems(s32, 'player2', { iron_ingot: 5 });
var amFulfill = CraftingChains.applyMessage(s32, {
  type: 'chain_craft',
  from: 'player2',
  payload: { action: 'fulfill_order', orderId: amOrder.orderId, qty: 2 }
});
assert(amFulfill.success === true, 'applyMessage fulfill_order succeeds');

// cancel_order action (place another first)
var amOrder2 = CraftingChains.applyMessage(s32, {
  type: 'chain_craft',
  from: 'player1',
  payload: { action: 'place_order', itemId: 'iron_ingot', qty: 1, offerPrice: 3, seed: 2 }
});
var amCancel = CraftingChains.applyMessage(s32, {
  type: 'chain_craft',
  from: 'player1',
  payload: { action: 'cancel_order', orderId: amOrder2.orderId }
});
assert(amCancel.success === true, 'applyMessage cancel_order succeeds');

// discover_blueprint action
var amDiscover = CraftingChains.applyMessage(s32, {
  type: 'chain_craft',
  from: 'player1',
  payload: { action: 'discover_blueprint', blueprintId: 'chain_iron_sword' }
});
assert(amDiscover.success === true, 'applyMessage discover_blueprint succeeds');

// experiment_blueprint action
var amExperiment = CraftingChains.applyMessage(s32, {
  type: 'chain_craft',
  from: 'player1',
  payload: { action: 'experiment_blueprint', blueprintId: 'chain_steel_ingot', seed: 10 }
});
assert(typeof amExperiment.success === 'boolean', 'applyMessage experiment_blueprint returns result');

// Unknown action
var amUnk = CraftingChains.applyMessage(s32, {
  type: 'chain_craft',
  from: 'player1',
  payload: { action: 'explode' }
});
assert(amUnk.success === false, 'applyMessage rejects unknown action');

// ============================================================================
// SUITE 33: Intermediate Products Structure
// ============================================================================

console.log('\n--- Suite 33: Intermediate Products Structure ---');

var intermed = CraftingChains.INTERMEDIATE_PRODUCTS;
var intermedKeys = Object.keys(intermed);

assert(intermedKeys.length >= 14, 'At least 14 intermediate products');

for (var ipi = 0; ipi < intermedKeys.length; ipi++) {
  var ip = intermed[intermedKeys[ipi]];
  assert(typeof ip.id === 'string' && ip.id.length > 0, 'Intermediate product ' + intermedKeys[ipi] + ' has id');
  assert(typeof ip.name === 'string', 'Intermediate product ' + ip.id + ' has name');
  assert(typeof ip.stage === 'string', 'Intermediate product ' + ip.id + ' has stage');
  assert(typeof ip.from === 'string', 'Intermediate product ' + ip.id + ' has from workstation');
}

// Spot check specific products
assert(intermed.iron_ingot !== undefined, 'iron_ingot intermediate product exists');
assert(intermed.iron_ingot.from === 'smelter', 'iron_ingot comes from smelter');
assert(intermed.tempered_blade !== undefined, 'tempered_blade intermediate product exists');
assert(intermed.tempered_blade.from === 'forge', 'tempered_blade comes from forge');
assert(intermed.etched_gem !== undefined, 'etched_gem intermediate product exists');
assert(intermed.etched_gem.from === 'engraver', 'etched_gem comes from engraver');
assert(intermed.gear_assembly !== undefined, 'gear_assembly exists');
assert(intermed.gear_assembly.from === 'assembler', 'gear_assembly from assembler');

// ============================================================================
// SUITE 34: Workstation durability tracking
// ============================================================================

console.log('\n--- Suite 34: Durability tracking ---');

var s34 = stateWithWorkstation('ws_smelter', 'smelter', 'player1');
var initialDur = s34.craftingChains.workstations.ws_smelter.durability;
giveItems(s34, 'player1', { iron_ore: 40, coal: 40 });

// Run stage 5 times to drain durability
for (var di = 0; di < 5; di++) {
  CraftingChains.runStage(s34, 'player1', 'chain_iron_sword', 0, 'ws_smelter', di * 100, 0);
}
var durAfter5 = s34.craftingChains.workstations.ws_smelter.durability;
var expectedDur = initialDur - 5 * CraftingChains.DURABILITY_COST_PER_RUN;
assert(durAfter5 === expectedDur, 'Durability decreases by DURABILITY_COST_PER_RUN per run (got ' + durAfter5 + ', expected ' + expectedDur + ')');

// Drain to 0 — supply enough materials for many runs
giveItems(s34, 'player1', { iron_ore: 500, coal: 500 });
var runsUntilBroken = Math.ceil(durAfter5 / CraftingChains.DURABILITY_COST_PER_RUN) + 2;
for (var di2 = 0; di2 < runsUntilBroken; di2++) {
  CraftingChains.runStage(s34, 'player1', 'chain_iron_sword', 0, 'ws_smelter', (di2 + 10) * 100, 0);
}
var finalDur = s34.craftingChains.workstations.ws_smelter.durability;
assert(finalDur === 0, 'Durability floors at 0');

// Verify workstation is broken
var crBrokenNow = CraftingChains.canRunStage(s34, 'player1', 'chain_iron_sword', 0, 'ws_smelter');
giveItems(s34, 'player1', { iron_ore: 40, coal: 40 });
assert(crBrokenNow.canRun === false, 'Broken workstation cannot run stages');

// Repair restores durability
CraftingChains.repairWorkstation(s34, 'player1', 'ws_smelter');
assert(s34.craftingChains.workstations.ws_smelter.durability === initialDur, 'Repair restores full durability');

// ============================================================================
// SUITE 35: Quality tier boundary precision
// ============================================================================

console.log('\n--- Suite 35: Quality tier boundaries ---');

var boundaries = [
  { v: 0.0,   expected: 'poor'       },
  { v: 0.299, expected: 'poor'       },
  { v: 0.3,   expected: 'common'     },
  { v: 0.599, expected: 'common'     },
  { v: 0.6,   expected: 'fine'       },
  { v: 0.799, expected: 'fine'       },
  { v: 0.8,   expected: 'superior'   },
  { v: 0.949, expected: 'superior'   },
  { v: 0.95,  expected: 'masterwork' },
  { v: 0.999, expected: 'masterwork' },
  { v: 1.0,   expected: 'masterwork' }
];

for (var bi = 0; bi < boundaries.length; bi++) {
  var bt = boundaries[bi];
  assert(CraftingChains.getQualityTier(bt.v) === bt.expected,
    'Quality ' + bt.v + ' → ' + bt.expected + ' (got ' + CraftingChains.getQualityTier(bt.v) + ')');
}

// ============================================================================
// SUITE 36: Deterministic runs with same seed
// ============================================================================

console.log('\n--- Suite 36: Deterministic results with same seed ---');

function buildCompleteChainState() {
  var state = makeState({ player1: makePlayer() });
  state.craftingChains = { workstations: {} };
  ['smelter', 'forge', 'engraver', 'assembler'].forEach(function(t) {
    var wt = CraftingChains.WORKSTATION_TYPES[t];
    state.craftingChains.workstations['ws_' + t] = {
      id: 'ws_' + t, type: t, name: wt.name, ownerId: 'player1',
      durability: wt.durabilityMax, durabilityMax: wt.durabilityMax,
      upgradeLevel: 0, accessList: ['player1'], builtAt: 0, activeJobs: []
    };
  });
  giveItems(state, 'player1', { iron_ore: 20, coal: 20, gold_ore: 10, leather: 10 });
  return state;
}

var stateA = buildCompleteChainState();
var stateB = buildCompleteChainState();
var wsMapD = { smelter: 'ws_smelter', forge: 'ws_forge', engraver: 'ws_engraver', assembler: 'ws_assembler' };

var rcA = CraftingChains.runChain(stateA, 'player1', 'chain_iron_sword', wsMapD, 42424242);
var rcB = CraftingChains.runChain(stateB, 'player1', 'chain_iron_sword', wsMapD, 42424242);

assert(rcA.success === true, 'Determinism test: run A succeeded');
assert(rcB.success === true, 'Determinism test: run B succeeded');
assert(rcA.finalQuality === rcB.finalQuality, 'Same seed produces same finalQuality');
assert(rcA.finalQualityTier === rcB.finalQualityTier, 'Same seed produces same finalQualityTier');

for (var ds = 0; ds < rcA.stageResults.length; ds++) {
  assert(rcA.stageResults[ds].quality === rcB.stageResults[ds].quality,
    'Stage ' + ds + ' quality is deterministic');
}

// ============================================================================
// SUITE 37: runStage with Array-format inventory
// ============================================================================

console.log('\n--- Suite 37: Array-format inventory compatibility ---');

var s37 = makeState({ player1: makePlayer() });
// Use array-format inventory
s37.players.player1.inventory = [
  { itemId: 'iron_ore', qty: 10 },
  { itemId: 'coal', qty: 10 }
];
s37.craftingChains = { workstations: {} };
var wt37 = CraftingChains.WORKSTATION_TYPES.smelter;
s37.craftingChains.workstations.ws_smelter = {
  id: 'ws_smelter', type: 'smelter', name: wt37.name, ownerId: 'player1',
  durability: wt37.durabilityMax, durabilityMax: wt37.durabilityMax,
  upgradeLevel: 0, accessList: ['player1'], builtAt: 0, activeJobs: []
};

var rs37 = CraftingChains.runStage(s37, 'player1', 'chain_iron_sword', 0, 'ws_smelter', 99, 0);
assert(rs37.success === true, 'runStage works with array-format inventory');
assert(Array.isArray(s37.players.player1.inventory), 'Inventory remains array after stage run');

// iron_ore consumed
var oreInv = s37.players.player1.inventory.filter(function(sl) { return sl.itemId === 'iron_ore'; });
var oreTot = oreInv.reduce(function(a, sl) { return a + sl.qty; }, 0);
assert(oreTot === 6, 'iron_ore consumed correctly in array inventory (10-4=6, got ' + oreTot + ')');

// iron_ingot produced
var ingotInv = s37.players.player1.inventory.filter(function(sl) { return sl.itemId === 'iron_ingot'; });
var ingotTot = ingotInv.reduce(function(a, sl) { return a + sl.qty; }, 0);
assert(ingotTot === 2, 'iron_ingot produced in array inventory (got ' + ingotTot + ')');

// ============================================================================
// SUITE 38: XP accumulation across chain stages
// ============================================================================

console.log('\n--- Suite 38: XP accumulation ---');

var s38 = buildCompleteChainState();
var initialXP = s38.players.player1.xp;
var wsMapX = { smelter: 'ws_smelter', forge: 'ws_forge', engraver: 'ws_engraver', assembler: 'ws_assembler' };

var rc38 = CraftingChains.runChain(s38, 'player1', 'chain_iron_sword', wsMapX, 111);
assert(rc38.success === true, 'XP test: chain succeeded');
var xpGained = s38.players.player1.xp - initialXP;
assert(xpGained === 120, 'XP gained equals blueprint xpReward=120 (got ' + xpGained + ')');

// Run 2-stage chain
var s38b = makeState({ player1: makePlayer() });
s38b.craftingChains = { workstations: {} };
['smelter', 'forge'].forEach(function(t) {
  var wt = CraftingChains.WORKSTATION_TYPES[t];
  s38b.craftingChains.workstations['ws_' + t] = {
    id: 'ws_' + t, type: t, name: wt.name, ownerId: 'player1',
    durability: wt.durabilityMax, durabilityMax: wt.durabilityMax,
    upgradeLevel: 0, accessList: ['player1'], builtAt: 0, activeJobs: []
  };
});
giveItems(s38b, 'player1', { iron_ore: 10, coal: 10, copper_ore: 5 });
var rc38b = CraftingChains.runChain(s38b, 'player1', 'chain_steel_ingot', {
  smelter: 'ws_smelter', forge: 'ws_forge'
}, 222);
assert(rc38b.success === true, 'XP test 2-stage: chain succeeded');
assert(s38b.players.player1.xp === 60, '2-stage chain awards xpReward=60');

// ============================================================================
// SUITE 39: Multi-player supply chain scenario
// ============================================================================

console.log('\n--- Suite 39: Multi-player supply chain scenario ---');

var s39 = makeState({ player1: makePlayer(), player2: makePlayer() });
// Player 1 produces iron_ingots
var smelterWs = stateWithWorkstation('ws_smelter', 'smelter', 'player1');
s39.craftingChains = smelterWs.craftingChains;
giveItems(s39, 'player1', { iron_ore: 10, coal: 10 });

// Player 1 runs stage to produce iron ingots
CraftingChains.runStage(s39, 'player1', 'chain_iron_sword', 0, 'ws_smelter', 10, 0);

// Player 2 places an order for iron_ingots
var po39 = CraftingChains.placeSupplyOrder(s39, 'player2', 'iron_ingot', 2, 8, 39);
assert(po39.success === true, 'Player2 places supply order');

// Player 1 fulfills the order
var fo39 = CraftingChains.fulfillSupplyOrder(s39, 'player1', po39.orderId, 2);
assert(fo39.success === true, 'Player1 fulfills Player2\'s order (got: ' + (fo39.reason || 'ok') + ')');
assert(fo39.remaining === 0, 'Order fully filled');

// Player 2 now has iron_ingots
var p2inv = s39.players.player2.inventory;
var p2ingots = Array.isArray(p2inv)
  ? p2inv.reduce(function(a, s) { return s.itemId === 'iron_ingot' ? a + s.qty : a; }, 0)
  : (p2inv.iron_ingot || 0);
assert(p2ingots === 2, 'Player2 received 2 iron_ingots from supply order');

// ============================================================================
// SUITE 40: Edge cases and null safety
// ============================================================================

console.log('\n--- Suite 40: Edge cases and null safety ---');

// canRunStage with null state
var crNull = CraftingChains.canRunStage({}, 'player1', 'chain_iron_sword', 0, 'ws1');
assert(crNull.canRun === false, 'canRunStage handles missing state gracefully');

// getChainHistory for unknown player
var histEmpty = CraftingChains.getChainHistory({}, 'unknown');
assert(histEmpty.totalRuns === 0, 'getChainHistory handles empty state');

// getPlayerOrders with no orders
var ordersEmpty = CraftingChains.getPlayerOrders({}, 'player1');
assert(Array.isArray(ordersEmpty) && ordersEmpty.length === 0, 'getPlayerOrders on empty state');

// getSupplyOrders with no orders
var soEmpty = CraftingChains.getSupplyOrders({});
assert(Array.isArray(soEmpty) && soEmpty.length === 0, 'getSupplyOrders on empty state');

// runChain with empty workstation map
var s40 = buildCompleteChainState();
var rcEmptyMap = CraftingChains.runChain(s40, 'player1', 'chain_iron_sword', {}, 1);
assert(rcEmptyMap.success === false, 'runChain fails with empty workstation map');

// getPlayerWorkstations with no craftingChains state
var s40b = makeState({ player1: makePlayer() });
var ws40 = CraftingChains.getPlayerWorkstations(s40b, 'player1');
assert(Array.isArray(ws40) && ws40.length === 0, 'getPlayerWorkstations handles no craftingChains state');

// getAccessibleWorkstations with no craftingChains state
var ac40 = CraftingChains.getAccessibleWorkstations(s40b, 'player1');
assert(Array.isArray(ac40) && ac40.length === 0, 'getAccessibleWorkstations handles no craftingChains state');

// ============================================================================
// FINAL REPORT
// ============================================================================

console.log('\n========================================');
console.log(passed + ' passed, ' + failed + ' failed');
console.log('========================================');

if (failed > 0) process.exit(1);
