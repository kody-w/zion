// Test: Contracts wiring — proposeContract, voteOnContract, activateContract, fulfillDelivery, expireContracts, getGuildReputation
var Contracts = require('../src/js/contracts.js');

var passed = 0;
var failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; }
  else { failed++; console.error('FAIL: ' + msg); }
}

// Contracts uses gameState.subsystems pattern — ensureState adds contracts array to the state object
var subsystems = {};

// getContractTypes
var types = Contracts.getContractTypes();
assert(Array.isArray(types), 'getContractTypes returns array');
assert(types.length > 0, 'getContractTypes has at least one type');

// proposeContract
var typeId = types[0].id;
var terms = { itemId: 'wood', quantity: 10, pricePerUnit: 5, deliveryInterval: 100, duration: 500 };
var propResult = Contracts.proposeContract(subsystems, 'guild_a', 'guild_b', typeId, terms, 100);
assert(propResult !== null && typeof propResult === 'object', 'proposeContract returns result');
assert(propResult.success === true, 'proposeContract succeeds');
var contractId = propResult.contract ? propResult.contract.id : (propResult.id || null);
assert(contractId !== null, 'proposeContract returns contract id');

// getPendingVotes
var pending = Contracts.getPendingVotes(subsystems, 'guild_a');
assert(Array.isArray(pending) || pending === null || pending === undefined, 'getPendingVotes returns array or null');

// voteOnContract
if (Contracts.voteOnContract) {
  var voteResult = Contracts.voteOnContract(subsystems, 'voter1', contractId, 'guild_a', true);
  assert(voteResult !== null && typeof voteResult === 'object', 'voteOnContract returns result');
}

// activateContract
if (Contracts.activateContract) {
  var activateResult = Contracts.activateContract(subsystems, contractId, 200);
  assert(activateResult !== null && typeof activateResult === 'object', 'activateContract returns result');
}

// getActiveContracts
var activeContracts = Contracts.getActiveContracts(subsystems, null);
assert(Array.isArray(activeContracts), 'getActiveContracts returns array');

// fulfillDelivery
if (activeContracts.length > 0) {
  var delivResult = Contracts.fulfillDelivery(subsystems, activeContracts[0].id, 300);
  assert(delivResult !== null && typeof delivResult === 'object', 'fulfillDelivery returns result');
}

// expireContracts: should not throw
Contracts.expireContracts(subsystems, 999999);
assert(true, 'expireContracts runs without error');

// getGuildReputation
var rep = Contracts.getGuildReputation(subsystems, 'guild_a');
assert(rep !== undefined, 'getGuildReputation returns a value');

console.log('test_wiring_contracts: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
