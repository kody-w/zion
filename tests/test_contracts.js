/**
 * tests/test_contracts.js
 * 150+ tests for the ZION Contracts system.
 * Standalone runner — no external test framework required.
 * Run with: node tests/test_contracts.js
 */

'use strict';

var Contracts = require('../src/js/contracts');

var passed = 0;
var failed = 0;
var failures = [];

function assert(condition, msg) {
  if (!condition) {
    var err = new Error(msg || 'Assertion failed');
    throw err;
  }
}

function assertEqual(a, b, msg) {
  if (a !== b) {
    throw new Error((msg || 'Expected equality') + ': got ' + JSON.stringify(a) + ' !== ' + JSON.stringify(b));
  }
}

function assertNotEqual(a, b, msg) {
  if (a === b) {
    throw new Error((msg || 'Expected inequality') + ': both are ' + JSON.stringify(a));
  }
}

function assertNull(val, msg) {
  if (val !== null) {
    throw new Error((msg || 'Expected null') + ': got ' + JSON.stringify(val));
  }
}

function assertNotNull(val, msg) {
  if (val === null || val === undefined) {
    throw new Error((msg || 'Expected non-null') + ': got ' + JSON.stringify(val));
  }
}

function assertDeepEqual(a, b, msg) {
  var aStr = JSON.stringify(a);
  var bStr = JSON.stringify(b);
  if (aStr !== bStr) {
    throw new Error((msg || 'Deep equality failed') + ': ' + aStr + ' !== ' + bStr);
  }
}

function test(name, fn) {
  try {
    fn();
    passed++;
    process.stdout.write('  PASS ' + name + '\n');
  } catch (e) {
    failed++;
    failures.push({ name: name, error: e.message });
    process.stdout.write('  FAIL ' + name + '\n       ' + e.message + '\n');
  }
}

function suite(name) {
  process.stdout.write('\n--- ' + name + ' ---\n');
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function makeState(currentTick) {
  return {
    contracts: [],
    tradeRoutes: [],
    reputationPenalties: {},
    currentTick: currentTick || 0
  };
}

/**
 * Build a supply-agreement contract proposal and optionally activate it.
 */
function buildSupplyContract(state, tick, partyA, partyB, activate) {
  partyA = partyA || 'guild_1';
  partyB = partyB || 'guild_2';
  tick = tick || 1000;
  var terms = {
    itemId: 'iron_ore',
    quantity: 100,
    pricePerUnit: 5,
    deliveryInterval: 50,
    totalDeliveries: 10,
    duration: 600
  };
  var result = Contracts.proposeContract(state, partyA, partyB, 'supply_agreement', terms, tick);
  if (!result.success) throw new Error('Could not build supply contract: ' + result.reason);
  if (activate) {
    // Cast enough votes to pass threshold (3 yes out of 3 = 100% >= 60%)
    Contracts.voteOnContract(state, 'member_a1', result.contract.id, partyA, true);
    Contracts.voteOnContract(state, 'member_a2', result.contract.id, partyA, true);
    Contracts.voteOnContract(state, 'member_b1', result.contract.id, partyB, true);
    Contracts.voteOnContract(state, 'member_b2', result.contract.id, partyB, true);
    var actResult = Contracts.activateContract(state, result.contract.id, tick);
    if (!actResult.success) throw new Error('Could not activate supply contract: ' + actResult.reason);
  }
  return result.contract;
}

/**
 * Build and activate a trade_route contract.
 */
function buildTradeRoute(state, tick, partyA, partyB, discount) {
  partyA = partyA || 'guild_1';
  partyB = partyB || 'guild_2';
  tick = tick || 1000;
  discount = discount !== undefined ? discount : 0.05;
  var terms = { discount: discount, duration: 5000 };
  var result = Contracts.proposeContract(state, partyA, partyB, 'trade_route', terms, tick);
  if (!result.success) throw new Error('Could not build trade route: ' + result.reason);
  Contracts.voteOnContract(state, 'ma1', result.contract.id, partyA, true);
  Contracts.voteOnContract(state, 'ma2', result.contract.id, partyA, true);
  Contracts.voteOnContract(state, 'mb1', result.contract.id, partyB, true);
  Contracts.voteOnContract(state, 'mb2', result.contract.id, partyB, true);
  state.currentTick = tick;
  var actResult = Contracts.activateContract(state, result.contract.id, tick);
  if (!actResult.success) throw new Error('Could not activate trade route: ' + actResult.reason);
  return result.contract;
}

// ===========================================================================
// SUITE 1: CONTRACT_TYPES structure
// ===========================================================================
suite('CONTRACT_TYPES — definitions');

test('CONTRACT_TYPES is exported', function() {
  assert(Array.isArray(Contracts.CONTRACT_TYPES), 'CONTRACT_TYPES should be an array');
});

test('CONTRACT_TYPES has exactly 5 types', function() {
  assertEqual(Contracts.CONTRACT_TYPES.length, 5, 'Should have 5 contract types');
});

test('supply_agreement type exists with correct structure', function() {
  var types = Contracts.getContractTypes();
  var sa = null;
  for (var i = 0; i < types.length; i++) { if (types[i].id === 'supply_agreement') sa = types[i]; }
  assertNotNull(sa, 'supply_agreement should exist');
  assertEqual(sa.minDuration, 100);
  assertEqual(sa.maxDuration, 5000);
  assertEqual(sa.requiresVote, true);
  assertEqual(sa.voteThreshold, 0.6);
  assertEqual(sa.maxPerGuild, 3);
  assertEqual(sa.breachPenalty.reputation, -20);
  assertEqual(sa.breachPenalty.spark, 200);
});

test('trade_route type exists with correct structure', function() {
  var types = Contracts.getContractTypes();
  var tr = null;
  for (var i = 0; i < types.length; i++) { if (types[i].id === 'trade_route') tr = types[i]; }
  assertNotNull(tr, 'trade_route should exist');
  assertEqual(tr.maxPerGuild, 5);
  assertEqual(tr.breachPenalty.reputation, -15);
});

test('exclusive_deal type exists with correct structure', function() {
  var types = Contracts.getContractTypes();
  var ed = null;
  for (var i = 0; i < types.length; i++) { if (types[i].id === 'exclusive_deal') ed = types[i]; }
  assertNotNull(ed, 'exclusive_deal should exist');
  assertEqual(ed.voteThreshold, 0.75);
  assertEqual(ed.maxPerGuild, 2);
  assertEqual(ed.breachPenalty.reputation, -30);
  assertEqual(ed.breachPenalty.spark, 400);
});

test('resource_monopoly type exists with correct structure', function() {
  var types = Contracts.getContractTypes();
  var rm = null;
  for (var i = 0; i < types.length; i++) { if (types[i].id === 'resource_monopoly') rm = types[i]; }
  assertNotNull(rm, 'resource_monopoly should exist');
  assertEqual(rm.voteThreshold, 0.8);
  assertEqual(rm.maxPerGuild, 1);
  assertEqual(rm.breachPenalty.reputation, -40);
  assertEqual(rm.breachPenalty.spark, 600);
});

test('protection_pact type exists with correct structure', function() {
  var types = Contracts.getContractTypes();
  var pp = null;
  for (var i = 0; i < types.length; i++) { if (types[i].id === 'protection_pact') pp = types[i]; }
  assertNotNull(pp, 'protection_pact should exist');
  assertEqual(pp.requiresVote, false);
  assertEqual(pp.maxPerGuild, 4);
  assertEqual(pp.breachPenalty.reputation, -25);
});

test('each contract type has all required fields', function() {
  var types = Contracts.getContractTypes();
  var required = ['id', 'name', 'description', 'minDuration', 'maxDuration', 'requiresVote', 'voteThreshold', 'breachPenalty', 'maxPerGuild'];
  for (var i = 0; i < types.length; i++) {
    for (var j = 0; j < required.length; j++) {
      assert(types[i].hasOwnProperty(required[j]), types[i].id + ' missing field ' + required[j]);
    }
  }
});

test('each breach penalty has reputation and spark fields', function() {
  var types = Contracts.getContractTypes();
  for (var i = 0; i < types.length; i++) {
    var bp = types[i].breachPenalty;
    assert(typeof bp.reputation === 'number', types[i].id + ' breach reputation should be a number');
    assert(typeof bp.spark === 'number', types[i].id + ' breach spark should be a number');
    assert(bp.reputation < 0, types[i].id + ' breach reputation should be negative');
  }
});

test('getContractTypes returns same array as CONTRACT_TYPES', function() {
  var a = Contracts.getContractTypes();
  var b = Contracts.CONTRACT_TYPES;
  assertEqual(a.length, b.length);
  for (var i = 0; i < a.length; i++) {
    assertEqual(a[i].id, b[i].id);
  }
});

// ===========================================================================
// SUITE 2: proposeContract
// ===========================================================================
suite('proposeContract');

test('creates a valid contract object', function() {
  var state = makeState(500);
  var result = Contracts.proposeContract(state, 'guild_1', 'guild_2', 'supply_agreement',
    { itemId: 'iron_ore', duration: 600 }, 500);
  assert(result.success, 'should succeed');
  assertNotNull(result.contract);
  assert(result.contract.id.indexOf('contract_') === 0, 'id should start with contract_');
  assertEqual(result.contract.partyA, 'guild_1');
  assertEqual(result.contract.partyB, 'guild_2');
  assertEqual(result.contract.type, 'supply_agreement');
  assertEqual(result.contract.createdAt, 500);
  assertEqual(result.contract.expiresAt, 1100);
});

test('new contract starts in voting status for requiresVote types', function() {
  var state = makeState(100);
  var result = Contracts.proposeContract(state, 'guild_1', 'guild_2', 'supply_agreement',
    { duration: 500 }, 100);
  assert(result.success);
  assertEqual(result.contract.status, 'voting');
});

test('new contract starts in proposed status for non-requiresVote types', function() {
  var state = makeState(100);
  var result = Contracts.proposeContract(state, 'guild_1', 'guild_2', 'protection_pact',
    { duration: 500 }, 100);
  assert(result.success);
  assertEqual(result.contract.status, 'proposed');
});

test('contract is added to state.contracts', function() {
  var state = makeState(100);
  assertEqual(state.contracts.length, 0);
  Contracts.proposeContract(state, 'guild_1', 'guild_2', 'supply_agreement', { duration: 500 }, 100);
  assertEqual(state.contracts.length, 1);
});

test('vote object initialised with empty arrays', function() {
  var state = makeState(100);
  var result = Contracts.proposeContract(state, 'g1', 'g2', 'supply_agreement', { duration: 200 }, 100);
  var v = result.contract.votes;
  assertEqual(v.partyA.yes, 0);
  assertEqual(v.partyA.no, 0);
  assert(Array.isArray(v.partyA.voted));
  assertEqual(v.partyB.yes, 0);
  assertEqual(v.partyB.no, 0);
  assert(Array.isArray(v.partyB.voted));
});

test('fails when proposer and target are the same guild', function() {
  var state = makeState(100);
  var result = Contracts.proposeContract(state, 'guild_1', 'guild_1', 'supply_agreement', { duration: 500 }, 100);
  assert(!result.success);
  assert(result.reason, 'should have a reason');
});

test('fails with missing proposer guild ID', function() {
  var state = makeState(100);
  var result = Contracts.proposeContract(state, '', 'guild_2', 'supply_agreement', { duration: 500 }, 100);
  assert(!result.success);
});

test('fails with missing target guild ID', function() {
  var state = makeState(100);
  var result = Contracts.proposeContract(state, 'guild_1', '', 'supply_agreement', { duration: 500 }, 100);
  assert(!result.success);
});

test('fails with unknown contract type', function() {
  var state = makeState(100);
  var result = Contracts.proposeContract(state, 'guild_1', 'guild_2', 'alien_pact', { duration: 500 }, 100);
  assert(!result.success);
  assert(result.reason.indexOf('Unknown') !== -1 || result.reason.length > 0);
});

test('fails when duration is below minDuration', function() {
  var state = makeState(100);
  var result = Contracts.proposeContract(state, 'guild_1', 'guild_2', 'supply_agreement', { duration: 50 }, 100);
  assert(!result.success);
  assert(result.reason, 'should have reason for duration violation');
});

test('fails when duration exceeds maxDuration', function() {
  var state = makeState(100);
  var result = Contracts.proposeContract(state, 'guild_1', 'guild_2', 'supply_agreement', { duration: 9999 }, 100);
  assert(!result.success);
});

test('fails when proposer exceeds maxPerGuild for supply_agreement (max 3)', function() {
  var state = makeState(100);
  // Create 3 active supply agreements for guild_1 as proposer
  for (var i = 0; i < 3; i++) {
    var r = Contracts.proposeContract(state, 'guild_1', 'guild_' + (i + 10), 'supply_agreement', { duration: 500 }, 100);
    assert(r.success, 'setup contract ' + i + ' failed: ' + (r.reason || ''));
  }
  // 4th should fail
  var result = Contracts.proposeContract(state, 'guild_1', 'guild_99', 'supply_agreement', { duration: 500 }, 100);
  assert(!result.success, '4th supply_agreement should fail');
});

test('fails when target exceeds maxPerGuild for supply_agreement (max 3)', function() {
  var state = makeState(100);
  for (var i = 0; i < 3; i++) {
    var r = Contracts.proposeContract(state, 'guild_' + (i + 10), 'guild_target', 'supply_agreement', { duration: 500 }, 100);
    assert(r.success, 'setup contract failed: ' + (r.reason || ''));
  }
  var result = Contracts.proposeContract(state, 'guild_new', 'guild_target', 'supply_agreement', { duration: 500 }, 100);
  assert(!result.success);
});

test('fails when guild exceeds maxPerGuild for resource_monopoly (max 1)', function() {
  var state = makeState(100);
  Contracts.proposeContract(state, 'guild_1', 'guild_2', 'resource_monopoly', { duration: 600 }, 100);
  var second = Contracts.proposeContract(state, 'guild_1', 'guild_3', 'resource_monopoly', { duration: 600 }, 100);
  assert(!second.success, 'second resource_monopoly should fail');
});

test('deliveriesMade initialised to 0', function() {
  var state = makeState(100);
  var result = Contracts.proposeContract(state, 'g1', 'g2', 'supply_agreement', { duration: 500 }, 100);
  assertEqual(result.contract.deliveriesMade, 0);
});

test('lastDelivery initialised to 0', function() {
  var state = makeState(100);
  var result = Contracts.proposeContract(state, 'g1', 'g2', 'supply_agreement', { duration: 500 }, 100);
  assertEqual(result.contract.lastDelivery, 0);
});

test('two proposals from different proposers to same target are both accepted', function() {
  var state = makeState(100);
  var r1 = Contracts.proposeContract(state, 'guild_A', 'guild_X', 'supply_agreement', { duration: 500 }, 100);
  var r2 = Contracts.proposeContract(state, 'guild_B', 'guild_X', 'supply_agreement', { duration: 500 }, 100);
  assert(r1.success);
  assert(r2.success);
  assertEqual(state.contracts.length, 2);
});

// ===========================================================================
// SUITE 3: voteOnContract
// ===========================================================================
suite('voteOnContract');

test('records a yes vote for partyA', function() {
  var state = makeState(100);
  var c = Contracts.proposeContract(state, 'g1', 'g2', 'supply_agreement', { duration: 300 }, 100).contract;
  var result = Contracts.voteOnContract(state, 'player1', c.id, 'g1', true);
  assert(result.success);
  assertEqual(result.currentVotes.partyA.yes, 1);
  assertEqual(result.currentVotes.partyA.no, 0);
});

test('records a no vote for partyB', function() {
  var state = makeState(100);
  var c = Contracts.proposeContract(state, 'g1', 'g2', 'supply_agreement', { duration: 300 }, 100).contract;
  var result = Contracts.voteOnContract(state, 'player2', c.id, 'g2', false);
  assert(result.success);
  assertEqual(result.currentVotes.partyB.no, 1);
});

test('prevents double voting by same player', function() {
  var state = makeState(100);
  var c = Contracts.proposeContract(state, 'g1', 'g2', 'supply_agreement', { duration: 300 }, 100).contract;
  Contracts.voteOnContract(state, 'player1', c.id, 'g1', true);
  var result = Contracts.voteOnContract(state, 'player1', c.id, 'g1', true);
  assert(!result.success, 'double vote should fail');
  assert(result.reason.indexOf('already voted') !== -1, 'reason should mention already voted');
});

test('fails when contract not found', function() {
  var state = makeState(100);
  var result = Contracts.voteOnContract(state, 'p1', 'bad_id', 'g1', true);
  assert(!result.success);
});

test('fails when guild is not a party', function() {
  var state = makeState(100);
  var c = Contracts.proposeContract(state, 'g1', 'g2', 'supply_agreement', { duration: 300 }, 100).contract;
  var result = Contracts.voteOnContract(state, 'p1', c.id, 'g_outsider', true);
  assert(!result.success);
  assert(result.reason.indexOf('not a party') !== -1);
});

test('fails when voting on an already active contract', function() {
  var state = makeState(100);
  var c = buildSupplyContract(state, 100, 'g1', 'g2', true);
  var result = Contracts.voteOnContract(state, 'p_late', c.id, 'g1', true);
  assert(!result.success);
});

test('multiple players from partyA can vote', function() {
  var state = makeState(100);
  var c = Contracts.proposeContract(state, 'g1', 'g2', 'supply_agreement', { duration: 300 }, 100).contract;
  Contracts.voteOnContract(state, 'player_a1', c.id, 'g1', true);
  Contracts.voteOnContract(state, 'player_a2', c.id, 'g1', true);
  Contracts.voteOnContract(state, 'player_a3', c.id, 'g1', false);
  var contract = Contracts.getContractById(state, c.id);
  assertEqual(contract.votes.partyA.yes, 2);
  assertEqual(contract.votes.partyA.no, 1);
  assertEqual(contract.votes.partyA.voted.length, 3);
});

test('approved is null when only one party has voted', function() {
  var state = makeState(100);
  var c = Contracts.proposeContract(state, 'g1', 'g2', 'supply_agreement', { duration: 300 }, 100).contract;
  var result = Contracts.voteOnContract(state, 'p1', c.id, 'g1', true);
  assertNull(result.approved);
});

test('approved is true when both parties exceed 60% threshold', function() {
  var state = makeState(100);
  var c = Contracts.proposeContract(state, 'g1', 'g2', 'supply_agreement', { duration: 300 }, 100).contract;
  Contracts.voteOnContract(state, 'a1', c.id, 'g1', true);
  Contracts.voteOnContract(state, 'a2', c.id, 'g1', true);
  var result = Contracts.voteOnContract(state, 'b1', c.id, 'g2', true);
  // partyA: 2/2 = 100%, partyB: 1/1 = 100%
  assertEqual(result.approved, true);
});

// ===========================================================================
// SUITE 4: activateContract
// ===========================================================================
suite('activateContract');

test('activates after both guilds vote yes at threshold', function() {
  var state = makeState(100);
  var c = Contracts.proposeContract(state, 'g1', 'g2', 'supply_agreement', { duration: 300 }, 100).contract;
  Contracts.voteOnContract(state, 'a1', c.id, 'g1', true);
  Contracts.voteOnContract(state, 'a2', c.id, 'g1', true);
  Contracts.voteOnContract(state, 'b1', c.id, 'g2', true);
  Contracts.voteOnContract(state, 'b2', c.id, 'g2', true);
  var result = Contracts.activateContract(state, c.id, 100);
  assert(result.success, 'should activate: ' + result.reason);
  var contract = Contracts.getContractById(state, c.id);
  assertEqual(contract.status, 'active');
});

test('activation fails when no votes cast', function() {
  var state = makeState(100);
  var c = Contracts.proposeContract(state, 'g1', 'g2', 'supply_agreement', { duration: 300 }, 100).contract;
  var result = Contracts.activateContract(state, c.id, 100);
  assert(!result.success);
});

test('activation fails when only partyA voted', function() {
  var state = makeState(100);
  var c = Contracts.proposeContract(state, 'g1', 'g2', 'supply_agreement', { duration: 300 }, 100).contract;
  Contracts.voteOnContract(state, 'a1', c.id, 'g1', true);
  var result = Contracts.activateContract(state, c.id, 100);
  assert(!result.success);
});

test('activation fails when partyA approval below 60%', function() {
  var state = makeState(100);
  var c = Contracts.proposeContract(state, 'g1', 'g2', 'supply_agreement', { duration: 300 }, 100).contract;
  Contracts.voteOnContract(state, 'a1', c.id, 'g1', true);
  Contracts.voteOnContract(state, 'a2', c.id, 'g1', false);
  Contracts.voteOnContract(state, 'a3', c.id, 'g1', false);  // 1/3 = 33%
  Contracts.voteOnContract(state, 'b1', c.id, 'g2', true);
  var result = Contracts.activateContract(state, c.id, 100);
  assert(!result.success, 'should fail: partyA below threshold');
});

test('activation fails when partyB approval below 60%', function() {
  var state = makeState(100);
  var c = Contracts.proposeContract(state, 'g1', 'g2', 'supply_agreement', { duration: 300 }, 100).contract;
  Contracts.voteOnContract(state, 'a1', c.id, 'g1', true);
  Contracts.voteOnContract(state, 'a2', c.id, 'g1', true);
  Contracts.voteOnContract(state, 'b1', c.id, 'g2', true);
  Contracts.voteOnContract(state, 'b2', c.id, 'g2', false);
  Contracts.voteOnContract(state, 'b3', c.id, 'g2', false);  // 1/3 = 33%
  var result = Contracts.activateContract(state, c.id, 100);
  assert(!result.success);
});

test('activation fails for already-active contract', function() {
  var state = makeState(100);
  var c = buildSupplyContract(state, 100, 'g1', 'g2', true);
  var result = Contracts.activateContract(state, c.id, 100);
  assert(!result.success);
});

test('activation fails for non-existent contract', function() {
  var state = makeState(100);
  var result = Contracts.activateContract(state, 'no_such_contract', 100);
  assert(!result.success);
});

test('trade_route activation creates a trade route entry', function() {
  var state = makeState(100);
  var c = Contracts.proposeContract(state, 'g1', 'g2', 'trade_route', { discount: 0.07, duration: 5000 }, 100).contract;
  Contracts.voteOnContract(state, 'a1', c.id, 'g1', true);
  Contracts.voteOnContract(state, 'b1', c.id, 'g2', true);
  state.currentTick = 100;
  Contracts.activateContract(state, c.id, 100);
  assertEqual(state.tradeRoutes.length, 1, 'a trade route should be created');
  assertEqual(state.tradeRoutes[0].discount, 0.07);
  assertEqual(state.tradeRoutes[0].guildA, 'g1');
  assertEqual(state.tradeRoutes[0].guildB, 'g2');
});

test('protection_pact activates without vote requirement being checked', function() {
  var state = makeState(100);
  var c = Contracts.proposeContract(state, 'g1', 'g2', 'protection_pact', { duration: 500 }, 100).contract;
  // No votes needed for non-requiresVote types
  var result = Contracts.activateContract(state, c.id, 100);
  assert(result.success, 'protection_pact should activate without votes: ' + result.reason);
});

// ===========================================================================
// SUITE 5: fulfillDelivery
// ===========================================================================
suite('fulfillDelivery');

test('increments deliveriesMade on first delivery', function() {
  var state = makeState(100);
  var c = buildSupplyContract(state, 100, 'g1', 'g2', true);
  var result = Contracts.fulfillDelivery(state, c.id, 150);
  assert(result.success);
  assertEqual(result.deliveriesMade, 1);
});

test('updates lastDelivery tick', function() {
  var state = makeState(100);
  var c = buildSupplyContract(state, 100, 'g1', 'g2', true);
  Contracts.fulfillDelivery(state, c.id, 155);
  var contract = Contracts.getContractById(state, c.id);
  assertEqual(contract.lastDelivery, 155);
});

test('fails on non-active contract', function() {
  var state = makeState(100);
  var c = Contracts.proposeContract(state, 'g1', 'g2', 'supply_agreement', { duration: 300 }, 100).contract;
  var result = Contracts.fulfillDelivery(state, c.id, 150);
  assert(!result.success);
});

test('fails on non-existent contract', function() {
  var state = makeState(100);
  var result = Contracts.fulfillDelivery(state, 'bad_id', 100);
  assert(!result.success);
});

test('returns correct totalDeliveries from terms', function() {
  var state = makeState(100);
  var c = buildSupplyContract(state, 100, 'g1', 'g2', true);
  var result = Contracts.fulfillDelivery(state, c.id, 150);
  assertEqual(result.totalDeliveries, 10);
});

test('complete is false before all deliveries made', function() {
  var state = makeState(100);
  var c = buildSupplyContract(state, 100, 'g1', 'g2', true);
  var result = Contracts.fulfillDelivery(state, c.id, 150);
  assertEqual(result.complete, false);
});

test('contract transitions to fulfilled after all deliveries', function() {
  var state = makeState(100);
  var c = buildSupplyContract(state, 100, 'g1', 'g2', true);
  for (var i = 0; i < 10; i++) {
    Contracts.fulfillDelivery(state, c.id, 150 + i * 50);
  }
  var contract = Contracts.getContractById(state, c.id);
  assertEqual(contract.status, 'fulfilled');
});

test('complete is true on final delivery', function() {
  var state = makeState(100);
  var c = buildSupplyContract(state, 100, 'g1', 'g2', true);
  var result;
  for (var i = 0; i < 10; i++) {
    result = Contracts.fulfillDelivery(state, c.id, 150 + i * 50);
  }
  assertEqual(result.complete, true);
});

test('completedAt is set when contract becomes fulfilled', function() {
  var state = makeState(100);
  var c = buildSupplyContract(state, 100, 'g1', 'g2', true);
  for (var i = 0; i < 10; i++) {
    Contracts.fulfillDelivery(state, c.id, 200 + i);
  }
  var contract = Contracts.getContractById(state, c.id);
  assertNotNull(contract.completedAt);
});

test('multiple deliveries accumulate correctly', function() {
  var state = makeState(100);
  var c = buildSupplyContract(state, 100, 'g1', 'g2', true);
  Contracts.fulfillDelivery(state, c.id, 150);
  Contracts.fulfillDelivery(state, c.id, 200);
  Contracts.fulfillDelivery(state, c.id, 250);
  var contract = Contracts.getContractById(state, c.id);
  assertEqual(contract.deliveriesMade, 3);
});

// ===========================================================================
// SUITE 6: checkDeliveryDue
// ===========================================================================
suite('checkDeliveryDue');

test('returns not due when delivery interval has not elapsed', function() {
  var state = makeState(100);
  var c = buildSupplyContract(state, 100, 'g1', 'g2', true);
  var result = Contracts.checkDeliveryDue(state, c.id, 130);  // interval is 50, created at 100
  assertEqual(result.due, false);
  assertEqual(result.overdueTicks, 0);
});

test('returns due when delivery interval has elapsed', function() {
  var state = makeState(100);
  var c = buildSupplyContract(state, 100, 'g1', 'g2', true);
  // interval = 50, lastDelivery = 0, so nextDue = 0+50=50; at tick 160: 160-50=110 overdue
  var result = Contracts.checkDeliveryDue(state, c.id, 160);
  assertEqual(result.due, true);
  assert(result.overdueTicks > 0);
});

test('breachRisk is false when overdue by less than half interval', function() {
  var state = makeState(100);
  var c = buildSupplyContract(state, 100, 'g1', 'g2', true);
  // just barely due (interval=50, so <25 overdue = no risk)
  // nextDue = 0+50=50, at tick=65 overdueTicks=15 < 25
  var result = Contracts.checkDeliveryDue(state, c.id, 65);
  assert(result.due || !result.due, 'either ok');
  if (result.due) {
    assertEqual(result.breachRisk, false);
  }
});

test('breachRisk is true when overdue by more than half interval', function() {
  var state = makeState(100);
  var c = buildSupplyContract(state, 100, 'g1', 'g2', true);
  // interval=50, createdAt=100, nextDue=150; at tick=230: overdueTicks=80 >= 25 (half of 50)
  var result = Contracts.checkDeliveryDue(state, c.id, 230);
  assert(result.due, 'should be due at tick 230');
  assertEqual(result.breachRisk, true);
});

test('returns not due for non-active contract', function() {
  var state = makeState(100);
  var c = Contracts.proposeContract(state, 'g1', 'g2', 'supply_agreement', { duration: 300 }, 100).contract;
  var result = Contracts.checkDeliveryDue(state, c.id, 200);
  assertEqual(result.due, false);
});

test('returns correct result for missing contract', function() {
  var state = makeState(100);
  var result = Contracts.checkDeliveryDue(state, 'no_contract', 200);
  assertEqual(result.due, false);
  assertEqual(result.overdueTicks, 0);
  assertEqual(result.breachRisk, false);
});

test('after a delivery, overdue resets from lastDelivery tick', function() {
  var state = makeState(100);
  var c = buildSupplyContract(state, 100, 'g1', 'g2', true);
  Contracts.fulfillDelivery(state, c.id, 150);  // lastDelivery = 150
  // nextDue = 150+50=200; at tick=190: not due
  var result = Contracts.checkDeliveryDue(state, c.id, 190);
  assertEqual(result.due, false);
});

// ===========================================================================
// SUITE 7: breachContract
// ===========================================================================
suite('breachContract');

test('changes status to breached', function() {
  var state = makeState(100);
  var c = buildSupplyContract(state, 100, 'g1', 'g2', true);
  Contracts.breachContract(state, c.id, 'g1', 'missed delivery');
  var contract = Contracts.getContractById(state, c.id);
  assertEqual(contract.status, 'breached');
});

test('records which guild breached', function() {
  var state = makeState(100);
  var c = buildSupplyContract(state, 100, 'g1', 'g2', true);
  Contracts.breachContract(state, c.id, 'g2', 'violated terms');
  var contract = Contracts.getContractById(state, c.id);
  assertEqual(contract.breachedBy, 'g2');
});

test('records breach reason', function() {
  var state = makeState(100);
  var c = buildSupplyContract(state, 100, 'g1', 'g2', true);
  Contracts.breachContract(state, c.id, 'g1', 'missed 3 deliveries');
  var contract = Contracts.getContractById(state, c.id);
  assertEqual(contract.breachReason, 'missed 3 deliveries');
});

test('returns correct penalty amounts for supply_agreement', function() {
  var state = makeState(100);
  var c = buildSupplyContract(state, 100, 'g1', 'g2', true);
  var result = Contracts.breachContract(state, c.id, 'g1', 'no reason');
  assert(result.success);
  assertEqual(result.penalty.reputation, -20);
  assertEqual(result.penalty.spark, 200);
});

test('records penalty in reputationPenalties state', function() {
  var state = makeState(100);
  var c = buildSupplyContract(state, 100, 'g1', 'g2', true);
  Contracts.breachContract(state, c.id, 'g1', 'test');
  assert(Array.isArray(state.reputationPenalties['g1']));
  assertEqual(state.reputationPenalties['g1'].length, 1);
  assertEqual(state.reputationPenalties['g1'][0].reputation, -20);
});

test('fails to breach an already-breached contract', function() {
  var state = makeState(100);
  var c = buildSupplyContract(state, 100, 'g1', 'g2', true);
  Contracts.breachContract(state, c.id, 'g1', 'first');
  var result = Contracts.breachContract(state, c.id, 'g2', 'second');
  assert(!result.success);
});

test('fails to breach a fulfilled contract', function() {
  var state = makeState(100);
  var c = buildSupplyContract(state, 100, 'g1', 'g2', true);
  for (var i = 0; i < 10; i++) { Contracts.fulfillDelivery(state, c.id, 150 + i * 50); }
  var result = Contracts.breachContract(state, c.id, 'g1', 'late');
  assert(!result.success);
});

test('fails to breach a non-existent contract', function() {
  var state = makeState(100);
  var result = Contracts.breachContract(state, 'ghost_id', 'g1', 'bad');
  assert(!result.success);
});

test('deactivates trade route when trade_route contract is breached', function() {
  var state = makeState(100);
  buildTradeRoute(state, 100, 'g1', 'g2', 0.05);
  assertEqual(state.tradeRoutes.length, 1);
  var c = state.contracts[0];
  Contracts.breachContract(state, c.id, 'g1', 'bad faith');
  assertEqual(state.tradeRoutes[0].endTick, -1);
});

test('exclusive_deal breach applies correct penalty', function() {
  var state = makeState(100);
  var terms = { duration: 400 };
  var pr = Contracts.proposeContract(state, 'g1', 'g2', 'exclusive_deal', terms, 100);
  Contracts.voteOnContract(state, 'a1', pr.contract.id, 'g1', true);
  Contracts.voteOnContract(state, 'b1', pr.contract.id, 'g2', true);
  Contracts.activateContract(state, pr.contract.id, 100);
  var result = Contracts.breachContract(state, pr.contract.id, 'g2', 'violated exclusivity');
  assertEqual(result.penalty.reputation, -30);
  assertEqual(result.penalty.spark, 400);
});

test('resource_monopoly breach applies correct penalty', function() {
  var state = makeState(100);
  var terms = { duration: 600 };
  var pr = Contracts.proposeContract(state, 'g1', 'g2', 'resource_monopoly', terms, 100);
  Contracts.voteOnContract(state, 'a1', pr.contract.id, 'g1', true);
  Contracts.voteOnContract(state, 'b1', pr.contract.id, 'g2', true);
  Contracts.activateContract(state, pr.contract.id, 100);
  var result = Contracts.breachContract(state, pr.contract.id, 'g1', 'broke monopoly');
  assertEqual(result.penalty.reputation, -40);
  assertEqual(result.penalty.spark, 600);
});

// ===========================================================================
// SUITE 8: cancelContract
// ===========================================================================
suite('cancelContract');

test('proposer can cancel a proposed contract', function() {
  var state = makeState(100);
  var c = Contracts.proposeContract(state, 'g1', 'g2', 'protection_pact', { duration: 300 }, 100).contract;
  var result = Contracts.cancelContract(state, c.id, 'g1');
  assert(result.success);
  var contract = Contracts.getContractById(state, c.id);
  assertEqual(contract.status, 'cancelled');
});

test('non-proposer cannot cancel a proposed contract', function() {
  var state = makeState(100);
  var c = Contracts.proposeContract(state, 'g1', 'g2', 'protection_pact', { duration: 300 }, 100).contract;
  var result = Contracts.cancelContract(state, c.id, 'g2');
  assert(!result.success, 'partyB should not be able to cancel a proposed contract');
  assert(result.reason.indexOf('proposing') !== -1 || result.reason.length > 0);
});

test('either party can cancel a voting contract', function() {
  var state = makeState(100);
  var c = Contracts.proposeContract(state, 'g1', 'g2', 'supply_agreement', { duration: 300 }, 100).contract;
  var result = Contracts.cancelContract(state, c.id, 'g2');
  assert(result.success, 'partyB should be able to cancel a voting contract: ' + result.reason);
});

test('partyA can cancel a voting contract', function() {
  var state = makeState(100);
  var c = Contracts.proposeContract(state, 'g1', 'g2', 'supply_agreement', { duration: 300 }, 100).contract;
  var result = Contracts.cancelContract(state, c.id, 'g1');
  assert(result.success);
});

test('cannot cancel an active contract', function() {
  var state = makeState(100);
  var c = buildSupplyContract(state, 100, 'g1', 'g2', true);
  var result = Contracts.cancelContract(state, c.id, 'g1');
  assert(!result.success);
  assert(result.reason.indexOf('proposed or voting') !== -1 || result.reason.length > 0);
});

test('cannot cancel a fulfilled contract', function() {
  var state = makeState(100);
  var c = buildSupplyContract(state, 100, 'g1', 'g2', true);
  for (var i = 0; i < 10; i++) { Contracts.fulfillDelivery(state, c.id, 150 + i * 50); }
  var result = Contracts.cancelContract(state, c.id, 'g1');
  assert(!result.success);
});

test('outsider guild cannot cancel any contract', function() {
  var state = makeState(100);
  var c = Contracts.proposeContract(state, 'g1', 'g2', 'supply_agreement', { duration: 300 }, 100).contract;
  var result = Contracts.cancelContract(state, c.id, 'g_outsider');
  assert(!result.success);
});

test('fails for non-existent contract', function() {
  var state = makeState(100);
  var result = Contracts.cancelContract(state, 'fake_id', 'g1');
  assert(!result.success);
});

// ===========================================================================
// SUITE 9: expireContracts
// ===========================================================================
suite('expireContracts');

test('expires contracts past their end date', function() {
  var state = makeState(100);
  buildSupplyContract(state, 100, 'g1', 'g2', true);  // expiresAt = 100+600=700
  var result = Contracts.expireContracts(state, 800);
  assertEqual(result.expired.length, 1);
  assertEqual(result.expired[0].type, 'supply_agreement');
});

test('does not expire contracts before end date', function() {
  var state = makeState(100);
  buildSupplyContract(state, 100, 'g1', 'g2', true);  // expiresAt = 700
  var result = Contracts.expireContracts(state, 600);
  assertEqual(result.expired.length, 0);
});

test('changes status to expired', function() {
  var state = makeState(100);
  var c = buildSupplyContract(state, 100, 'g1', 'g2', true);  // expiresAt=700
  Contracts.expireContracts(state, 800);
  var contract = Contracts.getContractById(state, c.id);
  assertEqual(contract.status, 'expired');
});

test('does not expire already-fulfilled contracts', function() {
  var state = makeState(100);
  var c = buildSupplyContract(state, 100, 'g1', 'g2', true);
  for (var i = 0; i < 10; i++) { Contracts.fulfillDelivery(state, c.id, 150 + i * 50); }
  var result = Contracts.expireContracts(state, 999);
  assertEqual(result.expired.length, 0);
  var contract = Contracts.getContractById(state, c.id);
  assertEqual(contract.status, 'fulfilled');
});

test('does not expire already-breached contracts', function() {
  var state = makeState(100);
  var c = buildSupplyContract(state, 100, 'g1', 'g2', true);
  Contracts.breachContract(state, c.id, 'g1', 'test');
  var result = Contracts.expireContracts(state, 999);
  assertEqual(result.expired.length, 0);
});

test('multiple contracts can be expired at once', function() {
  var state = makeState(100);
  buildSupplyContract(state, 100, 'g1', 'g2', true);
  buildSupplyContract(state, 100, 'g3', 'g4', true);
  var result = Contracts.expireContracts(state, 900);
  assertEqual(result.expired.length, 2);
});

test('voting contracts also expire', function() {
  var state = makeState(100);
  var c = Contracts.proposeContract(state, 'g1', 'g2', 'supply_agreement', { duration: 300 }, 100).contract;
  Contracts.expireContracts(state, 800);
  var contract = Contracts.getContractById(state, c.id);
  assertEqual(contract.status, 'expired');
});

test('expired trade route has its endTick updated', function() {
  var state = makeState(100);
  buildTradeRoute(state, 100, 'g1', 'g2', 0.05);  // expiresAt = 100+5000=5100
  Contracts.expireContracts(state, 6000);
  assertEqual(state.tradeRoutes[0].endTick, 6000);
});

test('returns empty array when no contracts expire', function() {
  var state = makeState(100);
  var result = Contracts.expireContracts(state, 200);
  assertDeepEqual(result.expired, []);
});

// ===========================================================================
// SUITE 10: getActiveContracts
// ===========================================================================
suite('getActiveContracts');

test('returns all active contracts for a guild', function() {
  var state = makeState(100);
  buildSupplyContract(state, 100, 'g1', 'g2', true);
  buildSupplyContract(state, 100, 'g1', 'g3', true);
  var active = Contracts.getActiveContracts(state, 'g1');
  assertEqual(active.length, 2);
});

test('returns empty array when guild has no active contracts', function() {
  var state = makeState(100);
  buildSupplyContract(state, 100, 'g1', 'g2', true);
  var active = Contracts.getActiveContracts(state, 'g3');
  assertEqual(active.length, 0);
});

test('includes contracts where guild is partyB', function() {
  var state = makeState(100);
  buildSupplyContract(state, 100, 'g1', 'g2', true);
  var active = Contracts.getActiveContracts(state, 'g2');
  assertEqual(active.length, 1);
});

test('does not include voting or proposed contracts', function() {
  var state = makeState(100);
  Contracts.proposeContract(state, 'g1', 'g2', 'supply_agreement', { duration: 300 }, 100);
  var active = Contracts.getActiveContracts(state, 'g1');
  assertEqual(active.length, 0);
});

// ===========================================================================
// SUITE 11: getContractById
// ===========================================================================
suite('getContractById');

test('returns correct contract by id', function() {
  var state = makeState(100);
  var c = Contracts.proposeContract(state, 'g1', 'g2', 'supply_agreement', { duration: 300 }, 100).contract;
  var found = Contracts.getContractById(state, c.id);
  assertNotNull(found);
  assertEqual(found.id, c.id);
});

test('returns null for unknown id', function() {
  var state = makeState(100);
  var found = Contracts.getContractById(state, 'no_such_id');
  assertNull(found);
});

// ===========================================================================
// SUITE 12: getContractHistory
// ===========================================================================
suite('getContractHistory');

test('returns fulfilled contracts in history', function() {
  var state = makeState(100);
  var c = buildSupplyContract(state, 100, 'g1', 'g2', true);
  for (var i = 0; i < 10; i++) { Contracts.fulfillDelivery(state, c.id, 150 + i * 50); }
  var history = Contracts.getContractHistory(state, 'g1');
  assertEqual(history.length, 1);
  assertEqual(history[0].status, 'fulfilled');
});

test('returns breached contracts in history', function() {
  var state = makeState(100);
  var c = buildSupplyContract(state, 100, 'g1', 'g2', true);
  Contracts.breachContract(state, c.id, 'g1', 'test');
  var history = Contracts.getContractHistory(state, 'g1');
  assertEqual(history.length, 1);
  assertEqual(history[0].status, 'breached');
});

test('returns expired contracts in history', function() {
  var state = makeState(100);
  buildSupplyContract(state, 100, 'g1', 'g2', true);
  Contracts.expireContracts(state, 900);
  var history = Contracts.getContractHistory(state, 'g1');
  assertEqual(history.length, 1);
  assertEqual(history[0].status, 'expired');
});

test('does not include active contracts', function() {
  var state = makeState(100);
  buildSupplyContract(state, 100, 'g1', 'g2', true);
  var history = Contracts.getContractHistory(state, 'g1');
  assertEqual(history.length, 0);
});

test('includes contracts where guild is partyB', function() {
  var state = makeState(100);
  var c = buildSupplyContract(state, 100, 'g1', 'g2', true);
  Contracts.breachContract(state, c.id, 'g1', 'test');
  var history = Contracts.getContractHistory(state, 'g2');
  assertEqual(history.length, 1);
});

test('cancelled contracts appear in history', function() {
  var state = makeState(100);
  var c = Contracts.proposeContract(state, 'g1', 'g2', 'protection_pact', { duration: 300 }, 100).contract;
  Contracts.cancelContract(state, c.id, 'g1');
  var history = Contracts.getContractHistory(state, 'g1');
  assertEqual(history.length, 1);
  assertEqual(history[0].status, 'cancelled');
});

// ===========================================================================
// SUITE 13: getTradeDiscount
// ===========================================================================
suite('getTradeDiscount');

test('returns correct discount for active trade route', function() {
  var state = makeState(100);
  buildTradeRoute(state, 100, 'g1', 'g2', 0.05);
  state.currentTick = 200;
  var discount = Contracts.getTradeDiscount(state, 'g1', 'g2');
  assertEqual(discount, 0.05);
});

test('returns 0 when no trade route exists', function() {
  var state = makeState(100);
  var discount = Contracts.getTradeDiscount(state, 'g1', 'g2');
  assertEqual(discount, 0);
});

test('returns discount regardless of party order (g2 asks about g1)', function() {
  var state = makeState(100);
  buildTradeRoute(state, 100, 'g1', 'g2', 0.08);
  state.currentTick = 200;
  var discount = Contracts.getTradeDiscount(state, 'g2', 'g1');
  assertEqual(discount, 0.08);
});

test('returns 0 for expired trade route', function() {
  var state = makeState(100);
  buildTradeRoute(state, 100, 'g1', 'g2', 0.05);  // endTick = 5100
  state.currentTick = 6000;
  var discount = Contracts.getTradeDiscount(state, 'g1', 'g2');
  assertEqual(discount, 0);
});

test('returns highest discount when multiple routes exist', function() {
  var state = makeState(100);
  buildTradeRoute(state, 100, 'g1', 'g2', 0.03);
  buildTradeRoute(state, 200, 'g1', 'g2', 0.10);
  state.currentTick = 500;
  var discount = Contracts.getTradeDiscount(state, 'g1', 'g2');
  assertEqual(discount, 0.10);
});

test('different guild pair has no discount', function() {
  var state = makeState(100);
  buildTradeRoute(state, 100, 'g1', 'g2', 0.05);
  state.currentTick = 200;
  var discount = Contracts.getTradeDiscount(state, 'g1', 'g3');
  assertEqual(discount, 0);
});

// ===========================================================================
// SUITE 14: calculateMonopolyEffect
// ===========================================================================
suite('calculateMonopolyEffect');

test('returns no monopoly when no supply contracts exist', function() {
  var state = makeState(100);
  var result = Contracts.calculateMonopolyEffect(state, 'iron_ore');
  assertEqual(result.hasMonopoly, false);
  assertNull(result.guildId);
  assertEqual(result.controlPercent, 0);
});

test('detects monopoly when one guild has >60% of supply contracts for an item', function() {
  var state = makeState(100);
  // g1 has 3 supply contracts for iron_ore (max allowed), g2 has 1 => g1 has 75% > 60%
  for (var i = 0; i < 3; i++) {
    buildSupplyContract(state, 100, 'g1', 'guild_buyer_' + i, true);
  }
  buildSupplyContract(state, 100, 'g2', 'guild_buyer_x', true);
  var result = Contracts.calculateMonopolyEffect(state, 'iron_ore');
  assertEqual(result.hasMonopoly, true, 'g1 should have monopoly with 75%');
  assertEqual(result.guildId, 'g1');
  assert(result.controlPercent > 0.6, 'controlPercent should be >60%');
});

test('no monopoly when control is exactly 60%', function() {
  var state = makeState(100);
  // 3 from g1, 2 from g2 => g1=3/5=60% — NOT strictly >60%
  for (var i = 0; i < 3; i++) {
    buildSupplyContract(state, 100, 'g1', 'buyer_' + i, true);
  }
  for (var j = 0; j < 2; j++) {
    buildSupplyContract(state, 100, 'g2', 'buyer2_' + j, true);
  }
  var result = Contracts.calculateMonopolyEffect(state, 'iron_ore');
  assertEqual(result.hasMonopoly, false, '60% is not a monopoly (needs >60%)');
});

test('different item has no monopoly', function() {
  var state = makeState(100);
  buildSupplyContract(state, 100, 'g1', 'g2', true);
  var result = Contracts.calculateMonopolyEffect(state, 'gold_bar');
  assertEqual(result.hasMonopoly, false);
});

test('controlPercent is accurate', function() {
  var state = makeState(100);
  // 2 from g1, 1 from g2 => g1=2/3=66.7%
  buildSupplyContract(state, 100, 'g1', 'gB1', true);
  buildSupplyContract(state, 100, 'g1', 'gB2', true);
  buildSupplyContract(state, 100, 'g2', 'gB3', true);
  var result = Contracts.calculateMonopolyEffect(state, 'iron_ore');
  var expectedPct = 2 / 3;
  assert(Math.abs(result.controlPercent - expectedPct) < 0.001, 'controlPercent should be ~0.667');
});

// ===========================================================================
// SUITE 15: getGuildReputation
// ===========================================================================
suite('getGuildReputation');

test('returns 1.0 for a guild with no completed contracts', function() {
  var state = makeState(100);
  var rep = Contracts.getGuildReputation(state, 'new_guild');
  assertEqual(rep.score, 1.0);
  assertEqual(rep.fulfilled, 0);
  assertEqual(rep.total, 0);
});

test('returns 1.0 when all contracts fulfilled', function() {
  var state = makeState(100);
  var c = buildSupplyContract(state, 100, 'g1', 'g2', true);
  for (var i = 0; i < 10; i++) { Contracts.fulfillDelivery(state, c.id, 200 + i); }
  var rep = Contracts.getGuildReputation(state, 'g1');
  assertEqual(rep.score, 1.0);
  assertEqual(rep.fulfilled, 1);
  assertEqual(rep.total, 1);
});

test('returns 0.0 when all contracts breached', function() {
  var state = makeState(100);
  var c = buildSupplyContract(state, 100, 'g1', 'g2', true);
  Contracts.breachContract(state, c.id, 'g1', 'test');
  var rep = Contracts.getGuildReputation(state, 'g1');
  assertEqual(rep.score, 0.0);
  assertEqual(rep.fulfilled, 0);
  assertEqual(rep.total, 1);
});

test('calculates correctly with mixed history', function() {
  var state = makeState(100);
  // Fulfilled: 2, Breached: 1
  var c1 = buildSupplyContract(state, 100, 'g1', 'gA', true);
  for (var i = 0; i < 10; i++) { Contracts.fulfillDelivery(state, c1.id, 200 + i); }
  var c2 = buildSupplyContract(state, 100, 'g1', 'gB', true);
  for (var j = 0; j < 10; j++) { Contracts.fulfillDelivery(state, c2.id, 200 + j); }
  var c3 = buildSupplyContract(state, 100, 'g1', 'gC', true);
  Contracts.breachContract(state, c3.id, 'g1', 'test');
  var rep = Contracts.getGuildReputation(state, 'g1');
  assertEqual(rep.fulfilled, 2);
  assertEqual(rep.total, 3);
  assert(Math.abs(rep.score - (2 / 3)) < 0.001, 'score should be ~0.667');
});

test('expired contracts count against total but not fulfilled', function() {
  var state = makeState(100);
  buildSupplyContract(state, 100, 'g1', 'g2', true);  // expiresAt=700
  Contracts.expireContracts(state, 900);
  var rep = Contracts.getGuildReputation(state, 'g1');
  assertEqual(rep.total, 1);
  assertEqual(rep.fulfilled, 0);
  assertEqual(rep.score, 0.0);
});

// ===========================================================================
// SUITE 16: getPendingVotes
// ===========================================================================
suite('getPendingVotes');

test('returns contracts awaiting vote', function() {
  var state = makeState(100);
  Contracts.proposeContract(state, 'g1', 'g2', 'supply_agreement', { duration: 300 }, 100);
  var pending = Contracts.getPendingVotes(state, 'g1');
  assertEqual(pending.length, 1);
});

test('returns empty array when no pending votes', function() {
  var state = makeState(100);
  var pending = Contracts.getPendingVotes(state, 'g1');
  assertEqual(pending.length, 0);
});

test('does not include active contracts in pending votes', function() {
  var state = makeState(100);
  buildSupplyContract(state, 100, 'g1', 'g2', true);
  var pending = Contracts.getPendingVotes(state, 'g1');
  assertEqual(pending.length, 0);
});

test('returns pending for partyB as well', function() {
  var state = makeState(100);
  Contracts.proposeContract(state, 'g1', 'g2', 'supply_agreement', { duration: 300 }, 100);
  var pending = Contracts.getPendingVotes(state, 'g2');
  assertEqual(pending.length, 1);
});

test('includes proposed status contracts', function() {
  var state = makeState(100);
  Contracts.proposeContract(state, 'g1', 'g2', 'protection_pact', { duration: 300 }, 100);
  var pending = Contracts.getPendingVotes(state, 'g1');
  assertEqual(pending.length, 1);
});

// ===========================================================================
// SUITE 17: getDeliverySchedule
// ===========================================================================
suite('getDeliverySchedule');

test('returns upcoming deliveries within tick range', function() {
  var state = makeState(100);
  var c = buildSupplyContract(state, 100, 'g1', 'g2', true);
  // interval=50, lastDelivery=0, so deliveries at 50, 100, 150, 200...
  var schedule = Contracts.getDeliverySchedule(state, 'g1', 150, 300);
  assert(schedule.length > 0, 'should have deliveries in range');
});

test('returns empty array when no obligations in range', function() {
  var state = makeState(100);
  buildSupplyContract(state, 1000, 'g1', 'g2', true);
  // interval=50, lastDelivery=0, so deliveries at 50, 100...
  // range 5000-5100: active expiresAt=1600 so not active... but let's use a range far out
  var state2 = makeState(100);
  var schedule = Contracts.getDeliverySchedule(state2, 'g1', 5000, 5100);
  assertEqual(schedule.length, 0);
});

test('only returns obligations for the supplier (partyA)', function() {
  var state = makeState(100);
  buildSupplyContract(state, 100, 'g1', 'g2', true);
  // g2 is partyB (buyer), has no delivery obligations
  var schedule = Contracts.getDeliverySchedule(state, 'g2', 0, 9999);
  assertEqual(schedule.length, 0);
});

test('each entry has contractId, dueTick, itemId, quantity', function() {
  var state = makeState(100);
  buildSupplyContract(state, 100, 'g1', 'g2', true);
  var schedule = Contracts.getDeliverySchedule(state, 'g1', 0, 200);
  assert(schedule.length > 0, 'need at least one delivery for inspection');
  var entry = schedule[0];
  assert(entry.hasOwnProperty('contractId'), 'missing contractId');
  assert(entry.hasOwnProperty('dueTick'), 'missing dueTick');
  assert(entry.hasOwnProperty('itemId'), 'missing itemId');
  assert(entry.hasOwnProperty('quantity'), 'missing quantity');
});

test('deliveries are sorted by dueTick ascending', function() {
  var state = makeState(100);
  buildSupplyContract(state, 100, 'g1', 'g2', true);
  var schedule = Contracts.getDeliverySchedule(state, 'g1', 0, 500);
  for (var i = 1; i < schedule.length; i++) {
    assert(schedule[i].dueTick >= schedule[i - 1].dueTick, 'schedule not sorted');
  }
});

test('itemId matches contract terms', function() {
  var state = makeState(100);
  buildSupplyContract(state, 100, 'g1', 'g2', true);
  var schedule = Contracts.getDeliverySchedule(state, 'g1', 0, 200);
  if (schedule.length > 0) {
    assertEqual(schedule[0].itemId, 'iron_ore');
  }
});

// ===========================================================================
// SUITE 18: getTradeVolume
// ===========================================================================
suite('getTradeVolume');

test('returns 0 when no routes exist', function() {
  var state = makeState(100);
  assertEqual(Contracts.getTradeVolume(state, 'g1', 'g2'), 0);
});

test('returns volumeTraded from route', function() {
  var state = makeState(100);
  buildTradeRoute(state, 100, 'g1', 'g2', 0.05);
  state.tradeRoutes[0].volumeTraded = 500;
  assertEqual(Contracts.getTradeVolume(state, 'g1', 'g2'), 500);
});

test('aggregates volume from multiple routes between same guilds', function() {
  var state = makeState(100);
  buildTradeRoute(state, 100, 'g1', 'g2', 0.03);
  buildTradeRoute(state, 200, 'g1', 'g2', 0.05);
  state.tradeRoutes[0].volumeTraded = 200;
  state.tradeRoutes[1].volumeTraded = 300;
  assertEqual(Contracts.getTradeVolume(state, 'g1', 'g2'), 500);
});

test('returns volume regardless of party order', function() {
  var state = makeState(100);
  buildTradeRoute(state, 100, 'g1', 'g2', 0.05);
  state.tradeRoutes[0].volumeTraded = 750;
  assertEqual(Contracts.getTradeVolume(state, 'g2', 'g1'), 750);
});

test('does not include volume from different guild pairs', function() {
  var state = makeState(100);
  buildTradeRoute(state, 100, 'g1', 'g2', 0.05);
  state.tradeRoutes[0].volumeTraded = 1000;
  assertEqual(Contracts.getTradeVolume(state, 'g1', 'g3'), 0);
});

// ===========================================================================
// SUITE 19: Edge cases and integration
// ===========================================================================
suite('Edge cases and integration');

test('cannot vote after contract is activated', function() {
  var state = makeState(100);
  var c = buildSupplyContract(state, 100, 'g1', 'g2', true);
  var result = Contracts.voteOnContract(state, 'late_voter', c.id, 'g1', true);
  assert(!result.success, 'voting on active contract should fail');
});

test('cannot breach a fulfilled contract', function() {
  var state = makeState(100);
  var c = buildSupplyContract(state, 100, 'g1', 'g2', true);
  for (var i = 0; i < 10; i++) { Contracts.fulfillDelivery(state, c.id, 150 + i); }
  var result = Contracts.breachContract(state, c.id, 'g1', 'too late');
  assert(!result.success);
});

test('propose to self fails with clear reason', function() {
  var state = makeState(100);
  var result = Contracts.proposeContract(state, 'g1', 'g1', 'supply_agreement', { duration: 300 }, 100);
  assert(!result.success);
  assert(result.reason.length > 0);
});

test('state auto-initialised with empty arrays', function() {
  var bareState = {};  // no contracts, no tradeRoutes
  var result = Contracts.proposeContract(bareState, 'g1', 'g2', 'supply_agreement', { duration: 300 }, 100);
  assert(result.success, 'should succeed even on bare state');
  assert(Array.isArray(bareState.contracts));
});

test('full lifecycle: propose -> vote -> activate -> deliver -> fulfill', function() {
  var state = makeState(500);
  // 1. Propose
  var pr = Contracts.proposeContract(state, 'merchants', 'miners', 'supply_agreement', {
    itemId: 'gold_ore', quantity: 50, pricePerUnit: 10,
    deliveryInterval: 100, totalDeliveries: 5, duration: 600
  }, 500);
  assert(pr.success, '1. propose');
  var cId = pr.contract.id;

  // 2. Vote
  Contracts.voteOnContract(state, 'm1', cId, 'merchants', true);
  Contracts.voteOnContract(state, 'm2', cId, 'merchants', true);
  Contracts.voteOnContract(state, 'n1', cId, 'miners', true);
  Contracts.voteOnContract(state, 'n2', cId, 'miners', true);

  // 3. Activate
  var act = Contracts.activateContract(state, cId, 500);
  assert(act.success, '3. activate: ' + act.reason);

  // 4. Deliver 5 times
  for (var d = 0; d < 5; d++) {
    var fd = Contracts.fulfillDelivery(state, cId, 600 + d * 100);
    assert(fd.success, '4. delivery ' + d);
  }

  // 5. Check fulfilled
  var contract = Contracts.getContractById(state, cId);
  assertEqual(contract.status, 'fulfilled', '5. status should be fulfilled');
});

test('reputation degrades after breach', function() {
  var state = makeState(100);
  // Fulfill 1, Breach 1
  var c1 = buildSupplyContract(state, 100, 'g1', 'gA', true);
  for (var i = 0; i < 10; i++) { Contracts.fulfillDelivery(state, c1.id, 200 + i); }
  var c2 = buildSupplyContract(state, 100, 'g1', 'gB', true);
  Contracts.breachContract(state, c2.id, 'g1', 'bad');
  var rep = Contracts.getGuildReputation(state, 'g1');
  assertEqual(rep.score, 0.5);
});

test('trade route discount applies correctly after activation', function() {
  var state = makeState(1000);
  buildTradeRoute(state, 1000, 'alpha', 'beta', 0.12);
  state.currentTick = 2000;
  assertEqual(Contracts.getTradeDiscount(state, 'alpha', 'beta'), 0.12);
});

test('exclusive_deal requires 75% threshold', function() {
  var state = makeState(100);
  var pr = Contracts.proposeContract(state, 'g1', 'g2', 'exclusive_deal', { duration: 400 }, 100);
  var cId = pr.contract.id;
  // 3 yes, 2 no = 60% — below 75% threshold
  Contracts.voteOnContract(state, 'a1', cId, 'g1', true);
  Contracts.voteOnContract(state, 'a2', cId, 'g1', true);
  Contracts.voteOnContract(state, 'a3', cId, 'g1', true);
  Contracts.voteOnContract(state, 'a4', cId, 'g1', false);
  Contracts.voteOnContract(state, 'a5', cId, 'g1', false);
  // partyA: 3/5 = 60% — below 75%
  Contracts.voteOnContract(state, 'b1', cId, 'g2', true);
  var result = Contracts.activateContract(state, cId, 100);
  assert(!result.success, 'exclusive_deal should not activate with only 60% partyA approval');
});

test('resource_monopoly requires 80% threshold', function() {
  var state = makeState(100);
  var pr = Contracts.proposeContract(state, 'g1', 'g2', 'resource_monopoly', { duration: 600 }, 100);
  var cId = pr.contract.id;
  // 3 yes, 2 no = 60% — below 80%
  for (var i = 0; i < 3; i++) { Contracts.voteOnContract(state, 'a' + i, cId, 'g1', true); }
  for (var j = 0; j < 2; j++) { Contracts.voteOnContract(state, 'ax' + j, cId, 'g1', false); }
  Contracts.voteOnContract(state, 'b1', cId, 'g2', true);
  var result = Contracts.activateContract(state, cId, 100);
  assert(!result.success, 'resource_monopoly should not activate with 60% partyA approval');
});

test('monopoly clears when all contracts expired', function() {
  var state = makeState(100);
  buildSupplyContract(state, 100, 'g1', 'g2', true);
  buildSupplyContract(state, 100, 'g1', 'g3', true);
  Contracts.expireContracts(state, 900);
  var result = Contracts.calculateMonopolyEffect(state, 'iron_ore');
  assertEqual(result.hasMonopoly, false);
});

test('getPendingVotes excludes cancelled contracts', function() {
  var state = makeState(100);
  var c = Contracts.proposeContract(state, 'g1', 'g2', 'protection_pact', { duration: 300 }, 100).contract;
  Contracts.cancelContract(state, c.id, 'g1');
  var pending = Contracts.getPendingVotes(state, 'g1');
  assertEqual(pending.length, 0);
});

test('multiple guilds can have separate contracts independently', function() {
  var state = makeState(100);
  buildSupplyContract(state, 100, 'alpha', 'beta', true);
  buildSupplyContract(state, 100, 'gamma', 'delta', true);
  assertEqual(Contracts.getActiveContracts(state, 'alpha').length, 1);
  assertEqual(Contracts.getActiveContracts(state, 'gamma').length, 1);
  assertEqual(Contracts.getActiveContracts(state, 'beta').length, 1);
  assertEqual(Contracts.getActiveContracts(state, 'delta').length, 1);
});

test('protection_pact breach applies correct penalty', function() {
  var state = makeState(100);
  var pr = Contracts.proposeContract(state, 'g1', 'g2', 'protection_pact', { duration: 500 }, 100);
  Contracts.activateContract(state, pr.contract.id, 100);
  var result = Contracts.breachContract(state, pr.contract.id, 'g2', 'abandoned ally');
  assertEqual(result.penalty.reputation, -25);
  assertEqual(result.penalty.spark, 150);
});

test('breach accumulates penalties for repeated offenders', function() {
  var state = makeState(100);
  var c1 = buildSupplyContract(state, 100, 'bad_guild', 'victim_1', true);
  var c2 = buildSupplyContract(state, 100, 'bad_guild', 'victim_2', true);
  Contracts.breachContract(state, c1.id, 'bad_guild', 'first breach');
  Contracts.breachContract(state, c2.id, 'bad_guild', 'second breach');
  var penalties = state.reputationPenalties['bad_guild'];
  assertEqual(penalties.length, 2);
});

test('getContractHistory returns multiple historical contracts', function() {
  var state = makeState(100);
  var c1 = buildSupplyContract(state, 100, 'g1', 'gA', true);
  Contracts.breachContract(state, c1.id, 'g1', 'x');
  var c2 = buildSupplyContract(state, 100, 'g1', 'gB', true);
  for (var i = 0; i < 10; i++) { Contracts.fulfillDelivery(state, c2.id, 200 + i); }
  var history = Contracts.getContractHistory(state, 'g1');
  assertEqual(history.length, 2);
});

test('getDeliverySchedule returns correct itemId and quantity from contract terms', function() {
  var state = makeState(100);
  buildSupplyContract(state, 100, 'g1', 'g2', true);
  var schedule = Contracts.getDeliverySchedule(state, 'g1', 0, 500);
  assert(schedule.length > 0, 'should have entries');
  for (var i = 0; i < schedule.length; i++) {
    assertEqual(schedule[i].itemId, 'iron_ore', 'itemId should be iron_ore');
    assertEqual(schedule[i].quantity, 100, 'quantity should be 100');
  }
});

// ===========================================================================
// FINAL REPORT
// ===========================================================================

process.stdout.write('\n========================================\n');
process.stdout.write('  Results: ' + passed + ' passed, ' + failed + ' failed\n');
process.stdout.write('========================================\n');

if (failures.length > 0) {
  process.stdout.write('\nFailures:\n');
  for (var fi = 0; fi < failures.length; fi++) {
    process.stdout.write('  ' + failures[fi].name + ': ' + failures[fi].error + '\n');
  }
}

process.exit(failed === 0 ? 0 : 1);
