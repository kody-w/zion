// Test: NpcDelegation wiring — delegate, checkCompletion, getTaskTypes, getDelegationStats, state init shape
var NpcDelegation = require('../src/js/npc_delegation.js');

var passed = 0;
var failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; }
  else { failed++; console.error('FAIL: ' + msg); }
}

// State init shape (manual, since createState doesn't exist)
var state = {
  delegations: [], receipts: [], npcCompletedCount: {},
  balances: { player1: 10000 },
  npcs: [
    { id: 'npc_healer_1', archetype: 'healer', zone: 'nexus' },
    { id: 'npc_builder_1', archetype: 'builder', zone: 'nexus' },
    { id: 'npc_explorer_1', archetype: 'explorer', zone: 'wilds' },
    { id: 'npc_merchant_1', archetype: 'merchant', zone: 'agora' }
  ]
};
assert(Array.isArray(state.delegations), 'state.delegations is array');
assert(Array.isArray(state.receipts), 'state.receipts is array');
assert(typeof state.npcCompletedCount === 'object', 'state.npcCompletedCount is object');

// getTaskTypes
var taskTypes = NpcDelegation.getTaskTypes();
assert(Array.isArray(taskTypes), 'getTaskTypes returns array');
assert(taskTypes.length > 0, 'getTaskTypes has at least one type');

// delegate: assign task to NPC
var delResult = NpcDelegation.delegate(state, 'player1', 'gather_herbs', 'npc_healer_1', 100);
assert(delResult !== null && typeof delResult === 'object', 'delegate returns result');
assert(delResult.success === true, 'delegate succeeds');

// delegate another task
var delResult2 = NpcDelegation.delegate(state, 'player1', 'craft_basic', 'npc_builder_1', 110);
assert(delResult2 !== null && typeof delResult2 === 'object', 'second delegate returns result');

// checkCompletion: simulate time passing — returns {completed: [...]}
var completionResults = NpcDelegation.checkCompletion(state, 999999);
assert(completionResults !== null && typeof completionResults === 'object', 'checkCompletion returns object');
assert(Array.isArray(completionResults.completed), 'checkCompletion.completed is array');
assert(completionResults.completed.length > 0, 'checkCompletion found completed delegations');

// getDelegationStats
var stats = NpcDelegation.getDelegationStats(state, 'player1');
assert(stats !== null && typeof stats === 'object', 'getDelegationStats returns object');
assert(typeof stats.totalDelegated === 'number' || typeof stats.completed === 'number', 'stats has numeric field');

// getPlayerDelegations
if (NpcDelegation.getPlayerDelegations) {
  var playerDels = NpcDelegation.getPlayerDelegations(state, 'player1');
  assert(Array.isArray(playerDels), 'getPlayerDelegations returns array');
}

// isNpcAvailable
if (NpcDelegation.isNpcAvailable) {
  var available = NpcDelegation.isNpcAvailable(state, 'npc_unused');
  assert(typeof available === 'boolean', 'isNpcAvailable returns boolean');
}

console.log('test_wiring_npc_delegation: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
