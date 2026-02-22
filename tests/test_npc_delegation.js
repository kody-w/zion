/**
 * tests/test_npc_delegation.js
 * 145+ tests for the NPC Delegation system
 */

var NpcDelegation = require('../src/js/npc_delegation');

var passed = 0;
var failed = 0;
var failures = [];

function assert(condition, msg) {
  if (!condition) {
    throw new Error(msg || 'Assertion failed');
  }
}

function assertEqual(a, b, msg) {
  if (a !== b) {
    throw new Error((msg || 'Expected equal') + ' | got: ' + JSON.stringify(a) + ' expected: ' + JSON.stringify(b));
  }
}

function assertDeepEqual(a, b, msg) {
  var aStr = JSON.stringify(a);
  var bStr = JSON.stringify(b);
  if (aStr !== bStr) {
    throw new Error((msg || 'Deep equal failed') + ' | got: ' + aStr + ' expected: ' + bStr);
  }
}

function test(name, fn) {
  try {
    fn();
    passed++;
    process.stdout.write('  PASS: ' + name + '\n');
  } catch (e) {
    failed++;
    failures.push({ name: name, error: e.message });
    process.stdout.write('  FAIL: ' + name + '\n    -> ' + e.message + '\n');
  }
}

function suite(name) {
  process.stdout.write('\n=== ' + name + ' ===\n');
}

// ---------------------------------------------------------------------------
// Helpers: create fresh state objects for tests
// ---------------------------------------------------------------------------

function makeState(opts) {
  opts = opts || {};
  var state = {
    delegations: [],
    receipts: [],
    npcCompletedCount: {},
    balances: opts.balances || {},
    npcs: opts.npcs || []
  };
  return state;
}

function makeNpc(id, archetype, opts) {
  opts = opts || {};
  return {
    id: id,
    name: opts.name || ('NPC_' + id),
    archetype: archetype,
    zone: opts.zone || 'gardens',
    reputation: typeof opts.reputation === 'number' ? opts.reputation : 0
  };
}

function makeStateWithNpc(npcId, archetype, sparkBalance, opts) {
  opts = opts || {};
  var npc = makeNpc(npcId, archetype, opts);
  var balances = {};
  balances['player1'] = sparkBalance !== undefined ? sparkBalance : 100;
  return makeState({ npcs: [npc], balances: balances });
}

// ---------------------------------------------------------------------------
// Suite 1: DELEGATABLE_TASKS data
// ---------------------------------------------------------------------------
suite('DELEGATABLE_TASKS data');

test('DELEGATABLE_TASKS is an array', function() {
  assert(Array.isArray(NpcDelegation.DELEGATABLE_TASKS), 'Should be array');
});

test('DELEGATABLE_TASKS has exactly 12 task types', function() {
  assertEqual(NpcDelegation.DELEGATABLE_TASKS.length, 12, 'Should have 12 tasks');
});

test('Each task has required fields: id, name, description, npcArchetypes, baseCost, duration, maxDelegations, output, zone', function() {
  var required = ['id', 'name', 'description', 'npcArchetypes', 'baseCost', 'duration', 'maxDelegations', 'output', 'zone'];
  NpcDelegation.DELEGATABLE_TASKS.forEach(function(task) {
    required.forEach(function(field) {
      assert(task[field] !== undefined, 'Task ' + task.id + ' missing field: ' + field);
    });
  });
});

test('Each task npcArchetypes is a non-empty array', function() {
  NpcDelegation.DELEGATABLE_TASKS.forEach(function(task) {
    assert(Array.isArray(task.npcArchetypes), task.id + ' npcArchetypes should be array');
    assert(task.npcArchetypes.length > 0, task.id + ' npcArchetypes should not be empty');
  });
});

test('Each task baseCost is a positive number', function() {
  NpcDelegation.DELEGATABLE_TASKS.forEach(function(task) {
    assert(typeof task.baseCost === 'number' && task.baseCost > 0, task.id + ' baseCost should be positive number');
  });
});

test('Each task duration is a positive number', function() {
  NpcDelegation.DELEGATABLE_TASKS.forEach(function(task) {
    assert(typeof task.duration === 'number' && task.duration > 0, task.id + ' duration should be positive');
  });
});

test('Each task maxDelegations is a positive integer', function() {
  NpcDelegation.DELEGATABLE_TASKS.forEach(function(task) {
    assert(typeof task.maxDelegations === 'number' && task.maxDelegations >= 1, task.id + ' maxDelegations should be >= 1');
  });
});

test('Each task output has type and description', function() {
  NpcDelegation.DELEGATABLE_TASKS.forEach(function(task) {
    assert(task.output && typeof task.output.type === 'string', task.id + ' output.type should be string');
    assert(task.output && typeof task.output.description === 'string', task.id + ' output.description should be string');
  });
});

test('water_garden task exists with correct archetype', function() {
  var task = NpcDelegation.getTaskById('water_garden');
  assert(task !== null, 'water_garden should exist');
  assert(task.npcArchetypes.indexOf('gardener') !== -1, 'water_garden requires gardener archetype');
});

test('gather_herbs task exists', function() {
  var task = NpcDelegation.getTaskById('gather_herbs');
  assert(task !== null, 'gather_herbs should exist');
});

test('patrol_zone task exists', function() {
  var task = NpcDelegation.getTaskById('patrol_zone');
  assert(task !== null, 'patrol_zone should exist');
});

test('teach_skill task exists', function() {
  var task = NpcDelegation.getTaskById('teach_skill');
  assert(task !== null, 'teach_skill should exist');
});

test('craft_basic task exists', function() {
  var task = NpcDelegation.getTaskById('craft_basic');
  assert(task !== null, 'craft_basic should exist');
});

test('fish_spot task exists', function() {
  var task = NpcDelegation.getTaskById('fish_spot');
  assert(task !== null, 'fish_spot should exist');
});

test('tend_crops task exists', function() {
  var task = NpcDelegation.getTaskById('tend_crops');
  assert(task !== null, 'tend_crops should exist');
});

test('guard_structure task exists', function() {
  var task = NpcDelegation.getTaskById('guard_structure');
  assert(task !== null, 'guard_structure should exist');
});

test('deliver_message task exists', function() {
  var task = NpcDelegation.getTaskById('deliver_message');
  assert(task !== null, 'deliver_message should exist');
});

test('scout_dungeon task exists', function() {
  var task = NpcDelegation.getTaskById('scout_dungeon');
  assert(task !== null, 'scout_dungeon should exist');
});

test('compose_song task exists', function() {
  var task = NpcDelegation.getTaskById('compose_song');
  assert(task !== null, 'compose_song should exist');
});

test('trade_goods task exists', function() {
  var task = NpcDelegation.getTaskById('trade_goods');
  assert(task !== null, 'trade_goods should exist');
});

// ---------------------------------------------------------------------------
// Suite 2: getTaskTypes / getTaskById
// ---------------------------------------------------------------------------
suite('getTaskTypes / getTaskById');

test('getTaskTypes returns all 12 tasks', function() {
  var tasks = NpcDelegation.getTaskTypes();
  assertEqual(tasks.length, 12, 'Should return 12 tasks');
});

test('getTaskTypes returns a copy (mutation safe)', function() {
  var tasks = NpcDelegation.getTaskTypes();
  tasks.push({ id: 'fake' });
  var tasks2 = NpcDelegation.getTaskTypes();
  assertEqual(tasks2.length, 12, 'Original should still have 12 tasks');
});

test('getTaskById returns correct task for valid id', function() {
  var task = NpcDelegation.getTaskById('water_garden');
  assert(task !== null, 'Should find water_garden');
  assertEqual(task.id, 'water_garden', 'Should match id');
  assertEqual(task.baseCost, 5, 'water_garden baseCost should be 5');
});

test('getTaskById returns null for unknown task', function() {
  var task = NpcDelegation.getTaskById('nonexistent_task');
  assertEqual(task, null, 'Should return null for unknown task');
});

test('getTaskById returns null for undefined', function() {
  var task = NpcDelegation.getTaskById(undefined);
  assertEqual(task, null, 'Should return null for undefined');
});

test('getTaskById returns null for empty string', function() {
  var task = NpcDelegation.getTaskById('');
  assertEqual(task, null, 'Should return null for empty string');
});

// ---------------------------------------------------------------------------
// Suite 3: getDelegationCost
// ---------------------------------------------------------------------------
suite('getDelegationCost');

test('getDelegationCost returns baseCost for zero reputation', function() {
  var cost = NpcDelegation.getDelegationCost('water_garden', 0);
  assertEqual(cost, 5, 'Cost should be baseCost (5) at 0 reputation');
});

test('getDelegationCost applies discount for high reputation', function() {
  var cost = NpcDelegation.getDelegationCost('water_garden', 1.0);
  // 30% discount on 5 = 3.5 -> ceil = 4
  assert(cost < 5, 'High rep should give discount');
  assert(cost > 0, 'Cost should remain positive');
});

test('getDelegationCost gives partial discount for mid reputation', function() {
  var costZero = NpcDelegation.getDelegationCost('water_garden', 0);
  var costMid = NpcDelegation.getDelegationCost('water_garden', 0.5);
  var costMax = NpcDelegation.getDelegationCost('water_garden', 1.0);
  assert(costMid <= costZero, 'Mid rep should not cost more than zero rep');
  assert(costMid >= costMax, 'Mid rep should not cost less than max rep');
});

test('getDelegationCost clamps reputation below 0', function() {
  var costNeg = NpcDelegation.getDelegationCost('water_garden', -0.5);
  var costZero = NpcDelegation.getDelegationCost('water_garden', 0);
  assertEqual(costNeg, costZero, 'Negative rep should be treated as 0');
});

test('getDelegationCost clamps reputation above 1', function() {
  var costOver = NpcDelegation.getDelegationCost('water_garden', 1.5);
  var costMax = NpcDelegation.getDelegationCost('water_garden', 1.0);
  assertEqual(costOver, costMax, 'Rep > 1 should be treated as 1');
});

test('getDelegationCost returns 0 for unknown task', function() {
  var cost = NpcDelegation.getDelegationCost('unknown_task', 0);
  assertEqual(cost, 0, 'Unknown task should return 0');
});

test('getDelegationCost handles undefined reputation', function() {
  var cost = NpcDelegation.getDelegationCost('water_garden', undefined);
  assertEqual(cost, 5, 'Undefined rep should be treated as 0');
});

test('getDelegationCost for teach_skill has higher baseCost', function() {
  var cost = NpcDelegation.getDelegationCost('teach_skill', 0);
  assertEqual(cost, 15, 'teach_skill baseCost should be 15');
});

test('getDelegationCost for deliver_message has lower baseCost', function() {
  var cost = NpcDelegation.getDelegationCost('deliver_message', 0);
  assertEqual(cost, 4, 'deliver_message baseCost should be 4');
});

// ---------------------------------------------------------------------------
// Suite 4: isNpcAvailable
// ---------------------------------------------------------------------------
suite('isNpcAvailable');

test('NPC is available when no delegations exist', function() {
  var state = makeState();
  var available = NpcDelegation.isNpcAvailable(state, 'npc1', 100);
  assertEqual(available, true, 'NPC should be available when no delegations');
});

test('NPC is not available when actively delegated', function() {
  var state = makeStateWithNpc('npc1', 'gardener', 100);
  NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc1', 100);
  var available = NpcDelegation.isNpcAvailable(state, 'npc1', 110);
  assertEqual(available, false, 'NPC should be busy');
});

test('NPC is available after delegation is cancelled', function() {
  var state = makeStateWithNpc('npc1', 'gardener', 100);
  var result = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc1', 100);
  NpcDelegation.cancelDelegation(state, 'player1', result.delegation.id);
  var available = NpcDelegation.isNpcAvailable(state, 'npc1', 110);
  assertEqual(available, true, 'NPC should be available after cancel');
});

test('isNpcAvailable ignores completed delegations', function() {
  var state = makeStateWithNpc('npc1', 'gardener', 100);
  NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc1', 100);
  NpcDelegation.checkCompletion(state, 200); // complete it
  var available = NpcDelegation.isNpcAvailable(state, 'npc1', 210);
  assertEqual(available, true, 'NPC should be available after completion');
});

test('isNpcAvailable handles state with no delegations array', function() {
  var state = {};
  var available = NpcDelegation.isNpcAvailable(state, 'npc1', 100);
  assertEqual(available, true, 'Should return true for fresh state');
});

// ---------------------------------------------------------------------------
// Suite 5: delegate — success cases
// ---------------------------------------------------------------------------
suite('delegate — success cases');

test('delegate returns success true', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50);
  var result = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  assertEqual(result.success, true, 'Should succeed');
});

test('delegate returns delegation object', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50);
  var result = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  assert(result.delegation !== null && result.delegation !== undefined, 'Should return delegation');
});

test('delegate sets correct taskType', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50);
  var result = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  assertEqual(result.delegation.taskType, 'water_garden', 'taskType should match');
});

test('delegate sets correct playerId', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50);
  var result = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  assertEqual(result.delegation.playerId, 'player1', 'playerId should match');
});

test('delegate sets correct npcId', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50);
  var result = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  assertEqual(result.delegation.npcId, 'npc_g1', 'npcId should match');
});

test('delegate sets status to active', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50);
  var result = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  assertEqual(result.delegation.status, 'active', 'status should be active');
});

test('delegate sets startTick correctly', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50);
  var result = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  assertEqual(result.delegation.startTick, 100, 'startTick should be currentTick');
});

test('delegate sets endTick = startTick + duration', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50);
  var result = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  var task = NpcDelegation.getTaskById('water_garden');
  assertEqual(result.delegation.endTick, 100 + task.duration, 'endTick should be startTick + duration');
});

test('delegate deducts Spark from player', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50);
  var result = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  var balance = state.balances['player1'];
  assert(balance < 50, 'Spark should be deducted');
});

test('delegate returns cost', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50);
  var result = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  assert(typeof result.cost === 'number' && result.cost > 0, 'Should return positive cost');
});

test('delegate adds delegation to state.delegations', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50);
  NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  assertEqual(state.delegations.length, 1, 'Should have 1 delegation in state');
});

test('delegate generates unique IDs for multiple delegations', function() {
  var npc1 = makeNpc('npc_g1', 'gardener', { zone: 'gardens' });
  var npc2 = makeNpc('npc_g2', 'gardener', { zone: 'gardens' });
  var state = makeState({
    npcs: [npc1, npc2],
    balances: { player1: 200 }
  });
  var r1 = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  var r2 = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g2', 100);
  assert(r1.delegation.id !== r2.delegation.id, 'IDs should be unique');
});

test('delegate with healer archetype can water_garden', function() {
  var state = makeStateWithNpc('npc_h1', 'healer', 50);
  var result = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_h1', 100);
  assertEqual(result.success, true, 'Healer should be able to water_garden');
});

test('delegate with explorer archetype can scout_dungeon', function() {
  var state = makeStateWithNpc('npc_e1', 'explorer', 100);
  var result = NpcDelegation.delegate(state, 'player1', 'scout_dungeon', 'npc_e1', 100);
  assertEqual(result.success, true, 'Explorer should scout dungeon');
});

test('delegate with merchant archetype can trade_goods', function() {
  var state = makeStateWithNpc('npc_m1', 'merchant', 100);
  var result = NpcDelegation.delegate(state, 'player1', 'trade_goods', 'npc_m1', 100);
  assertEqual(result.success, true, 'Merchant should trade goods');
});

test('delegate with teacher archetype can teach_skill', function() {
  var state = makeStateWithNpc('npc_t1', 'teacher', 100);
  var result = NpcDelegation.delegate(state, 'player1', 'teach_skill', 'npc_t1', 100);
  assertEqual(result.success, true, 'Teacher should teach skill');
});

test('delegate with musician archetype can compose_song', function() {
  var state = makeStateWithNpc('npc_mu1', 'musician', 100);
  var result = NpcDelegation.delegate(state, 'player1', 'compose_song', 'npc_mu1', 100);
  assertEqual(result.success, true, 'Musician should compose song');
});

// ---------------------------------------------------------------------------
// Suite 6: delegate — failure cases
// ---------------------------------------------------------------------------
suite('delegate — failure cases');

test('delegate fails with unknown task type', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50);
  var result = NpcDelegation.delegate(state, 'player1', 'unknown_task', 'npc_g1', 100);
  assertEqual(result.success, false, 'Should fail for unknown task');
  assert(typeof result.reason === 'string', 'Should have reason string');
});

test('delegate fails with unknown NPC', function() {
  var state = makeState({ balances: { player1: 50 } });
  var result = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_unknown', 100);
  assertEqual(result.success, false, 'Should fail for unknown NPC');
});

test('delegate fails when NPC archetype does not match task', function() {
  var state = makeStateWithNpc('npc_m1', 'merchant', 100);
  var result = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_m1', 100);
  assertEqual(result.success, false, 'Merchant cannot water garden');
  assert(result.reason.indexOf('archetype') !== -1 || result.reason.indexOf('cannot') !== -1, 'Should mention archetype mismatch');
});

test('delegate fails when NPC is already busy', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 100);
  NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  var state2 = makeState({
    npcs: state.npcs,
    balances: { player2: 100 },
    delegations: state.delegations,
    receipts: state.receipts,
    npcCompletedCount: state.npcCompletedCount
  });
  state2.balances['player1'] = state.balances['player1'];
  var result = NpcDelegation.delegate(state, 'player2', 'water_garden', 'npc_g1', 110);
  // Reuse same state for simplicity
  var state3 = makeStateWithNpc('npc_g2', 'gardener', 200);
  NpcDelegation.delegate(state3, 'player1', 'water_garden', 'npc_g2', 100);
  var result2 = NpcDelegation.delegate(state3, 'player1', 'water_garden', 'npc_g2', 110);
  assertEqual(result2.success, false, 'Should fail - NPC already busy');
});

test('delegate fails with insufficient Spark', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 2); // only 2 Spark
  var result = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  assertEqual(result.success, false, 'Should fail - insufficient Spark');
  assert(result.reason.indexOf('Insufficient') !== -1 || result.reason.indexOf('Spark') !== -1, 'Should mention Spark');
});

test('delegate fails when player has zero Spark', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 0);
  var result = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  assertEqual(result.success, false, 'Should fail with zero Spark');
});

test('delegate fails when max delegations for task type is reached', function() {
  // tend_crops maxDelegations = 3
  var npc1 = makeNpc('npc_g1', 'gardener');
  var npc2 = makeNpc('npc_g2', 'gardener');
  var npc3 = makeNpc('npc_g3', 'gardener');
  var npc4 = makeNpc('npc_g4', 'gardener');
  var state = makeState({
    npcs: [npc1, npc2, npc3, npc4],
    balances: { player1: 500 }
  });
  NpcDelegation.delegate(state, 'player1', 'tend_crops', 'npc_g1', 100);
  NpcDelegation.delegate(state, 'player1', 'tend_crops', 'npc_g2', 100);
  NpcDelegation.delegate(state, 'player1', 'tend_crops', 'npc_g3', 100);
  var result = NpcDelegation.delegate(state, 'player1', 'tend_crops', 'npc_g4', 100);
  assertEqual(result.success, false, 'Should fail - max delegations reached for tend_crops');
});

test('delegate fails - teach_skill max is 1', function() {
  var npc1 = makeNpc('npc_t1', 'teacher');
  var npc2 = makeNpc('npc_t2', 'teacher');
  var state = makeState({
    npcs: [npc1, npc2],
    balances: { player1: 500 }
  });
  NpcDelegation.delegate(state, 'player1', 'teach_skill', 'npc_t1', 100);
  var result = NpcDelegation.delegate(state, 'player1', 'teach_skill', 'npc_t2', 100);
  assertEqual(result.success, false, 'teach_skill max 1 should block second');
});

test('delegate does not deduct Spark on failure', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50);
  var before = state.balances['player1'];
  NpcDelegation.delegate(state, 'player1', 'unknown_task', 'npc_g1', 100);
  assertEqual(state.balances['player1'], before, 'Balance should not change on failure');
});

// ---------------------------------------------------------------------------
// Suite 7: cancelDelegation
// ---------------------------------------------------------------------------
suite('cancelDelegation');

test('cancelDelegation returns success true for active delegation', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50);
  var r = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  var result = NpcDelegation.cancelDelegation(state, 'player1', r.delegation.id);
  assertEqual(result.success, true, 'Cancel should succeed');
});

test('cancelDelegation sets status to cancelled', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50);
  var r = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  NpcDelegation.cancelDelegation(state, 'player1', r.delegation.id);
  var d = NpcDelegation.getDelegation(state, r.delegation.id);
  assertEqual(d.status, 'cancelled', 'Status should be cancelled');
});

test('cancelDelegation refunds 50% of cost', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50);
  var r = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  var afterDelegate = state.balances['player1'];
  var cancelResult = NpcDelegation.cancelDelegation(state, 'player1', r.delegation.id);
  var expectedRefund = Math.floor(r.cost / 2);
  assertEqual(cancelResult.refund, expectedRefund, 'Refund should be 50% of cost');
  assertEqual(state.balances['player1'], afterDelegate + expectedRefund, 'Balance should include refund');
});

test('cancelDelegation fails for unknown delegation id', function() {
  var state = makeState();
  var result = NpcDelegation.cancelDelegation(state, 'player1', 'del_nonexistent');
  assertEqual(result.success, false, 'Should fail for unknown delegation');
});

test('cancelDelegation fails when delegation belongs to different player', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50);
  var r = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  var result = NpcDelegation.cancelDelegation(state, 'player2', r.delegation.id);
  assertEqual(result.success, false, 'Should fail for wrong player');
});

test('cancelDelegation fails for already completed delegation', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50);
  var r = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  NpcDelegation.checkCompletion(state, 200);
  var result = NpcDelegation.cancelDelegation(state, 'player1', r.delegation.id);
  assertEqual(result.success, false, 'Should fail for completed delegation');
});

test('cancelDelegation fails for already cancelled delegation', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50);
  var r = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  NpcDelegation.cancelDelegation(state, 'player1', r.delegation.id);
  var result2 = NpcDelegation.cancelDelegation(state, 'player1', r.delegation.id);
  assertEqual(result2.success, false, 'Should fail for already cancelled');
});

test('cancelDelegation returns refund of 0 on failure', function() {
  var state = makeState();
  var result = NpcDelegation.cancelDelegation(state, 'player1', 'fake_id');
  assertEqual(result.refund, 0, 'Refund should be 0 on failure');
});

test('cancelDelegation frees up NPC for new delegation', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 100);
  var r = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  NpcDelegation.cancelDelegation(state, 'player1', r.delegation.id);
  var available = NpcDelegation.isNpcAvailable(state, 'npc_g1', 110);
  assertEqual(available, true, 'NPC should be free after cancel');
});

// ---------------------------------------------------------------------------
// Suite 8: checkCompletion
// ---------------------------------------------------------------------------
suite('checkCompletion');

test('checkCompletion returns empty when no active delegations', function() {
  var state = makeState();
  var result = NpcDelegation.checkCompletion(state, 100);
  assertEqual(result.completed.length, 0, 'Should return empty completed list');
});

test('checkCompletion does not complete delegation before endTick', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50);
  var r = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  var result = NpcDelegation.checkCompletion(state, 110); // endTick is 150
  assertEqual(result.completed.length, 0, 'Should not complete before endTick');
  assertEqual(r.delegation.status, 'active', 'Should still be active');
});

test('checkCompletion completes delegation at endTick', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50);
  NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  var result = NpcDelegation.checkCompletion(state, 150); // endTick = 100 + 50
  assertEqual(result.completed.length, 1, 'Should complete at endTick');
});

test('checkCompletion completes delegation past endTick', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50);
  NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  var result = NpcDelegation.checkCompletion(state, 200);
  assertEqual(result.completed.length, 1, 'Should complete past endTick');
});

test('checkCompletion sets delegation status to completed', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50);
  var r = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  NpcDelegation.checkCompletion(state, 200);
  var d = NpcDelegation.getDelegation(state, r.delegation.id);
  assertEqual(d.status, 'completed', 'Status should be completed');
});

test('checkCompletion generates a receipt', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50);
  NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  var result = NpcDelegation.checkCompletion(state, 200);
  assert(result.completed[0].receipt !== null, 'Should have receipt');
});

test('checkCompletion receipt has correct fields', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50, { name: 'Flora' });
  var r = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  NpcDelegation.checkCompletion(state, 200);
  var d = NpcDelegation.getDelegation(state, r.delegation.id);
  var receipt = d.receipt;
  assertEqual(receipt.delegationId, r.delegation.id, 'Receipt should reference delegation');
  assertEqual(receipt.npcId, 'npc_g1', 'Receipt should have NPC id');
  assertEqual(receipt.npcName, 'Flora', 'Receipt should have NPC name');
  assertEqual(receipt.task, 'water_garden', 'Receipt should have task type');
  assertEqual(receipt.outcome, 'success', 'Receipt outcome should be success');
  assertEqual(receipt.completedAt, 200, 'Receipt should have completedAt');
  assert(typeof receipt.sparkSpent === 'number', 'Receipt should have sparkSpent');
  assert(Array.isArray(receipt.itemsGathered), 'Receipt should have itemsGathered array');
});

test('checkCompletion adds receipt to state.receipts', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50);
  NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  NpcDelegation.checkCompletion(state, 200);
  assertEqual(state.receipts.length, 1, 'state.receipts should have 1 entry');
});

test('checkCompletion returns delegationId in completed list', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50);
  var r = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  var result = NpcDelegation.checkCompletion(state, 200);
  assertEqual(result.completed[0].delegationId, r.delegation.id, 'Should return correct delegationId');
});

test('checkCompletion completes multiple delegations at once', function() {
  var npc1 = makeNpc('npc_g1', 'gardener');
  var npc2 = makeNpc('npc_h1', 'healer');
  var state = makeState({
    npcs: [npc1, npc2],
    balances: { player1: 200 }
  });
  NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  NpcDelegation.delegate(state, 'player1', 'gather_herbs', 'npc_h1', 100);
  var result = NpcDelegation.checkCompletion(state, 300);
  assertEqual(result.completed.length, 2, 'Should complete both delegations');
});

test('checkCompletion does not re-complete already completed delegations', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50);
  NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  NpcDelegation.checkCompletion(state, 200);
  var result2 = NpcDelegation.checkCompletion(state, 300);
  assertEqual(result2.completed.length, 0, 'Should not re-complete');
});

test('checkCompletion increments npcCompletedCount', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50);
  NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  NpcDelegation.checkCompletion(state, 200);
  assertEqual(state.npcCompletedCount['npc_g1'], 1, 'NPC completed count should be 1');
});

test('checkCompletion handles state with no delegations gracefully', function() {
  var state = {};
  var result = NpcDelegation.checkCompletion(state, 100);
  assertEqual(result.completed.length, 0, 'Empty state should return empty completed');
});

// ---------------------------------------------------------------------------
// Suite 9: getDelegation
// ---------------------------------------------------------------------------
suite('getDelegation');

test('getDelegation returns correct delegation by ID', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50);
  var r = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  var d = NpcDelegation.getDelegation(state, r.delegation.id);
  assert(d !== null, 'Should find delegation');
  assertEqual(d.id, r.delegation.id, 'Should return correct delegation');
});

test('getDelegation returns null for unknown ID', function() {
  var state = makeState();
  var d = NpcDelegation.getDelegation(state, 'del_nonexistent');
  assertEqual(d, null, 'Should return null for unknown ID');
});

test('getDelegation on empty state returns null', function() {
  var state = makeState();
  var d = NpcDelegation.getDelegation(state, 'del_1');
  assertEqual(d, null, 'Empty state should return null');
});

// ---------------------------------------------------------------------------
// Suite 10: getPlayerDelegations
// ---------------------------------------------------------------------------
suite('getPlayerDelegations');

test('getPlayerDelegations returns all delegations for player', function() {
  var npc1 = makeNpc('npc_g1', 'gardener');
  var npc2 = makeNpc('npc_g2', 'gardener');
  var state = makeState({
    npcs: [npc1, npc2],
    balances: { player1: 200, player2: 200 }
  });
  NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  NpcDelegation.delegate(state, 'player2', 'water_garden', 'npc_g2', 100);
  var player1Delegations = NpcDelegation.getPlayerDelegations(state, 'player1');
  assertEqual(player1Delegations.length, 1, 'Player1 should have 1 delegation');
});

test('getPlayerDelegations filters by status', function() {
  var npc1 = makeNpc('npc_g1', 'gardener');
  var npc2 = makeNpc('npc_g2', 'gardener');
  var state = makeState({
    npcs: [npc1, npc2],
    balances: { player1: 200 }
  });
  var r1 = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  NpcDelegation.delegate(state, 'player1', 'tend_crops', 'npc_g2', 100);
  NpcDelegation.cancelDelegation(state, 'player1', r1.delegation.id);

  var active = NpcDelegation.getPlayerDelegations(state, 'player1', 'active');
  assertEqual(active.length, 1, 'Should have 1 active');

  var cancelled = NpcDelegation.getPlayerDelegations(state, 'player1', 'cancelled');
  assertEqual(cancelled.length, 1, 'Should have 1 cancelled');
});

test('getPlayerDelegations returns empty array for player with no delegations', function() {
  var state = makeState();
  var result = NpcDelegation.getPlayerDelegations(state, 'player_nobody');
  assertEqual(result.length, 0, 'Should return empty array');
});

test('getPlayerDelegations without status filter returns all', function() {
  var npc1 = makeNpc('npc_g1', 'gardener');
  var npc2 = makeNpc('npc_g2', 'gardener');
  var state = makeState({
    npcs: [npc1, npc2],
    balances: { player1: 200 }
  });
  var r1 = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  NpcDelegation.delegate(state, 'player1', 'tend_crops', 'npc_g2', 100);
  NpcDelegation.cancelDelegation(state, 'player1', r1.delegation.id);
  var all = NpcDelegation.getPlayerDelegations(state, 'player1');
  assertEqual(all.length, 2, 'Should return all delegations regardless of status');
});

// ---------------------------------------------------------------------------
// Suite 11: getNpcDelegations
// ---------------------------------------------------------------------------
suite('getNpcDelegations');

test('getNpcDelegations returns delegations for specific NPC', function() {
  var npc1 = makeNpc('npc_g1', 'gardener');
  var npc2 = makeNpc('npc_g2', 'gardener');
  var state = makeState({
    npcs: [npc1, npc2],
    balances: { player1: 200 }
  });
  NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  var d1 = NpcDelegation.getNpcDelegations(state, 'npc_g1');
  assertEqual(d1.length, 1, 'npc_g1 should have 1 delegation');
  var d2 = NpcDelegation.getNpcDelegations(state, 'npc_g2');
  assertEqual(d2.length, 0, 'npc_g2 should have 0 delegations');
});

test('getNpcDelegations returns empty for unknown NPC', function() {
  var state = makeState();
  var result = NpcDelegation.getNpcDelegations(state, 'npc_unknown');
  assertEqual(result.length, 0, 'Should return empty for unknown NPC');
});

test('getNpcDelegations includes completed delegations', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50);
  NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  NpcDelegation.checkCompletion(state, 200);
  var delegations = NpcDelegation.getNpcDelegations(state, 'npc_g1');
  assertEqual(delegations.length, 1, 'Should include completed delegation');
  assertEqual(delegations[0].status, 'completed', 'Should be completed');
});

// ---------------------------------------------------------------------------
// Suite 12: getAvailableNpcs
// ---------------------------------------------------------------------------
suite('getAvailableNpcs');

test('getAvailableNpcs returns NPCs matching archetype and free', function() {
  var npc1 = makeNpc('npc_g1', 'gardener', { zone: 'gardens' });
  var npc2 = makeNpc('npc_h1', 'healer', { zone: 'gardens' });
  var npc3 = makeNpc('npc_m1', 'merchant', { zone: 'agora' });
  var state = makeState({ npcs: [npc1, npc2, npc3], balances: {} });
  var available = NpcDelegation.getAvailableNpcs(state, 'water_garden', null, 100);
  // water_garden requires gardener or healer
  assertEqual(available.length, 2, 'Should return 2 available NPCs');
});

test('getAvailableNpcs excludes busy NPCs', function() {
  var npc1 = makeNpc('npc_g1', 'gardener', { zone: 'gardens' });
  var npc2 = makeNpc('npc_g2', 'gardener', { zone: 'gardens' });
  var state = makeState({
    npcs: [npc1, npc2],
    balances: { player1: 200 }
  });
  NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  var available = NpcDelegation.getAvailableNpcs(state, 'water_garden', null, 110);
  assertEqual(available.length, 1, 'Should exclude busy NPC');
});

test('getAvailableNpcs returns empty for unknown task', function() {
  var npc1 = makeNpc('npc_g1', 'gardener', { zone: 'gardens' });
  var state = makeState({ npcs: [npc1] });
  var available = NpcDelegation.getAvailableNpcs(state, 'nonexistent_task', null, 100);
  assertEqual(available.length, 0, 'Should return empty for unknown task');
});

test('getAvailableNpcs filters by zone', function() {
  var npc1 = makeNpc('npc_g1', 'gardener', { zone: 'gardens' });
  var npc2 = makeNpc('npc_g2', 'gardener', { zone: 'wilds' });
  var state = makeState({ npcs: [npc1, npc2] });
  var available = NpcDelegation.getAvailableNpcs(state, 'water_garden', 'gardens', 100);
  assertEqual(available.length, 1, 'Should filter by zone');
  assertEqual(available[0].id, 'npc_g1', 'Should return gardens NPC');
});

test('getAvailableNpcs with no NPCs returns empty', function() {
  var state = makeState({ npcs: [] });
  var available = NpcDelegation.getAvailableNpcs(state, 'water_garden', null, 100);
  assertEqual(available.length, 0, 'Should return empty with no NPCs');
});

test('getAvailableNpcs with no state.npcs returns empty', function() {
  var state = makeState();
  delete state.npcs;
  var available = NpcDelegation.getAvailableNpcs(state, 'water_garden', null, 100);
  assertEqual(available.length, 0, 'Should return empty without npcs array');
});

// ---------------------------------------------------------------------------
// Suite 13: getReceipts
// ---------------------------------------------------------------------------
suite('getReceipts');

test('getReceipts returns receipts for player', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50);
  NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  NpcDelegation.checkCompletion(state, 200);
  var receipts = NpcDelegation.getReceipts(state, 'player1');
  assertEqual(receipts.length, 1, 'Should have 1 receipt');
});

test('getReceipts returns empty for player with no completed delegations', function() {
  var state = makeState();
  var receipts = NpcDelegation.getReceipts(state, 'player1');
  assertEqual(receipts.length, 0, 'Should return empty for player with no receipts');
});

test('getReceipts only returns receipts for specified player', function() {
  var npc1 = makeNpc('npc_g1', 'gardener');
  var npc2 = makeNpc('npc_g2', 'gardener');
  var state = makeState({
    npcs: [npc1, npc2],
    balances: { player1: 200, player2: 200 }
  });
  NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  NpcDelegation.delegate(state, 'player2', 'water_garden', 'npc_g2', 100);
  NpcDelegation.checkCompletion(state, 200);
  var receipts1 = NpcDelegation.getReceipts(state, 'player1');
  var receipts2 = NpcDelegation.getReceipts(state, 'player2');
  assertEqual(receipts1.length, 1, 'Player1 should have 1 receipt');
  assertEqual(receipts2.length, 1, 'Player2 should have 1 receipt');
});

// ---------------------------------------------------------------------------
// Suite 14: getDelegationHistory
// ---------------------------------------------------------------------------
suite('getDelegationHistory');

test('getDelegationHistory returns all delegations for player', function() {
  var npc1 = makeNpc('npc_g1', 'gardener');
  var npc2 = makeNpc('npc_g2', 'gardener');
  var state = makeState({
    npcs: [npc1, npc2],
    balances: { player1: 200 }
  });
  var r1 = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  NpcDelegation.delegate(state, 'player1', 'tend_crops', 'npc_g2', 100);
  NpcDelegation.cancelDelegation(state, 'player1', r1.delegation.id);
  NpcDelegation.checkCompletion(state, 200);
  var history = NpcDelegation.getDelegationHistory(state, 'player1');
  assertEqual(history.length, 2, 'History should include all statuses');
});

test('getDelegationHistory returns empty for player with no history', function() {
  var state = makeState();
  var history = NpcDelegation.getDelegationHistory(state, 'player_nobody');
  assertEqual(history.length, 0, 'Should return empty for player with no history');
});

// ---------------------------------------------------------------------------
// Suite 15: getActiveCount / getMaxDelegations
// ---------------------------------------------------------------------------
suite('getActiveCount / getMaxDelegations');

test('getActiveCount returns 0 for player with no delegations', function() {
  var state = makeState();
  var count = NpcDelegation.getActiveCount(state, 'player1');
  assertEqual(count, 0, 'Count should be 0');
});

test('getActiveCount increments after delegation', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50);
  NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  var count = NpcDelegation.getActiveCount(state, 'player1');
  assertEqual(count, 1, 'Count should be 1');
});

test('getActiveCount does not count cancelled delegations', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50);
  var r = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  NpcDelegation.cancelDelegation(state, 'player1', r.delegation.id);
  var count = NpcDelegation.getActiveCount(state, 'player1');
  assertEqual(count, 0, 'Count should be 0 after cancel');
});

test('getActiveCount does not count completed delegations', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50);
  NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  NpcDelegation.checkCompletion(state, 200);
  var count = NpcDelegation.getActiveCount(state, 'player1');
  assertEqual(count, 0, 'Count should be 0 after completion');
});

test('getMaxDelegations returns a positive number', function() {
  var state = makeState();
  var max = NpcDelegation.getMaxDelegations(state, 'player1');
  assert(typeof max === 'number' && max > 0, 'Max should be a positive number');
});

test('getMaxDelegations returns same value regardless of player', function() {
  var state = makeState();
  var max1 = NpcDelegation.getMaxDelegations(state, 'player1');
  var max2 = NpcDelegation.getMaxDelegations(state, 'player_newbie');
  assertEqual(max1, max2, 'Max should be consistent across players');
});

// ---------------------------------------------------------------------------
// Suite 16: getNpcEfficiency
// ---------------------------------------------------------------------------
suite('getNpcEfficiency');

test('getNpcEfficiency returns 1.0 for new NPC', function() {
  var state = makeState();
  var eff = NpcDelegation.getNpcEfficiency(state, 'npc_new');
  assertEqual(eff, 1.0, 'New NPC should have efficiency 1.0');
});

test('getNpcEfficiency increases with completed tasks', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 100);
  var eff0 = NpcDelegation.getNpcEfficiency(state, 'npc_g1');
  // Simulate completed tasks
  state.npcCompletedCount['npc_g1'] = 25;
  var eff25 = NpcDelegation.getNpcEfficiency(state, 'npc_g1');
  assert(eff25 > eff0, 'Efficiency should increase with more completions');
});

test('getNpcEfficiency caps at 2.0', function() {
  var state = makeState();
  state.npcCompletedCount = { 'npc_veteran': 1000 };
  var eff = NpcDelegation.getNpcEfficiency(state, 'npc_veteran');
  assertEqual(eff, 2.0, 'Efficiency should cap at 2.0');
});

test('getNpcEfficiency at 50 completions is 2.0', function() {
  var state = makeState();
  state.npcCompletedCount = { 'npc_g1': 50 };
  var eff = NpcDelegation.getNpcEfficiency(state, 'npc_g1');
  assertEqual(eff, 2.0, '50 completions should give 2.0 efficiency');
});

test('getNpcEfficiency at 25 completions is 1.5', function() {
  var state = makeState();
  state.npcCompletedCount = { 'npc_g1': 25 };
  var eff = NpcDelegation.getNpcEfficiency(state, 'npc_g1');
  assertEqual(eff, 1.5, '25 completions should give 1.5 efficiency');
});

test('getNpcEfficiency handles missing npcCompletedCount gracefully', function() {
  var state = makeState();
  delete state.npcCompletedCount;
  // Should not throw
  var eff = NpcDelegation.getNpcEfficiency(state, 'npc_g1');
  assertEqual(eff, 1.0, 'Should default to 1.0 without count data');
});

// ---------------------------------------------------------------------------
// Suite 17: getDelegationStats
// ---------------------------------------------------------------------------
suite('getDelegationStats');

test('getDelegationStats returns zeroes for new player', function() {
  var state = makeState();
  var stats = NpcDelegation.getDelegationStats(state, 'player_new');
  assertEqual(stats.totalDelegated, 0, 'totalDelegated should be 0');
  assertEqual(stats.completed, 0, 'completed should be 0');
  assertEqual(stats.failed, 0, 'failed should be 0');
  assertEqual(stats.cancelled, 0, 'cancelled should be 0');
  assertEqual(stats.sparkSpent, 0, 'sparkSpent should be 0');
});

test('getDelegationStats counts active delegation as totalDelegated', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50);
  NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  var stats = NpcDelegation.getDelegationStats(state, 'player1');
  assertEqual(stats.totalDelegated, 1, 'Should count 1 total');
});

test('getDelegationStats counts completed delegations', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50);
  NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  NpcDelegation.checkCompletion(state, 200);
  var stats = NpcDelegation.getDelegationStats(state, 'player1');
  assertEqual(stats.completed, 1, 'Should count 1 completed');
});

test('getDelegationStats counts cancelled delegations', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50);
  var r = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  NpcDelegation.cancelDelegation(state, 'player1', r.delegation.id);
  var stats = NpcDelegation.getDelegationStats(state, 'player1');
  assertEqual(stats.cancelled, 1, 'Should count 1 cancelled');
});

test('getDelegationStats tracks sparkSpent for completed', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50);
  var r = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  var cost = r.cost;
  NpcDelegation.checkCompletion(state, 200);
  var stats = NpcDelegation.getDelegationStats(state, 'player1');
  assertEqual(stats.sparkSpent, cost, 'sparkSpent should equal delegation cost');
});

test('getDelegationStats sparkSpent for cancelled is half cost', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50);
  var r = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  var cost = r.cost;
  NpcDelegation.cancelDelegation(state, 'player1', r.delegation.id);
  var stats = NpcDelegation.getDelegationStats(state, 'player1');
  var expectedSpent = Math.ceil(cost / 2);
  assertEqual(stats.sparkSpent, expectedSpent, 'Cancelled sparkSpent should be half of cost (ceiling)');
});

test('getDelegationStats aggregates multiple delegations', function() {
  var npc1 = makeNpc('npc_g1', 'gardener');
  var npc2 = makeNpc('npc_g2', 'gardener');
  var npc3 = makeNpc('npc_g3', 'gardener');
  var state = makeState({
    npcs: [npc1, npc2, npc3],
    balances: { player1: 500 }
  });
  var r1 = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  NpcDelegation.delegate(state, 'player1', 'tend_crops', 'npc_g2', 100);
  NpcDelegation.cancelDelegation(state, 'player1', r1.delegation.id);
  NpcDelegation.checkCompletion(state, 200);
  var stats = NpcDelegation.getDelegationStats(state, 'player1');
  assertEqual(stats.totalDelegated, 2, 'Should count 2 total');
  assertEqual(stats.cancelled, 1, 'Should count 1 cancelled');
  assertEqual(stats.completed, 1, 'Should count 1 completed');
});

test('getDelegationStats does not include other players delegations', function() {
  var npc1 = makeNpc('npc_g1', 'gardener');
  var npc2 = makeNpc('npc_g2', 'gardener');
  var state = makeState({
    npcs: [npc1, npc2],
    balances: { player1: 200, player2: 200 }
  });
  NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  NpcDelegation.delegate(state, 'player2', 'water_garden', 'npc_g2', 100);
  var stats = NpcDelegation.getDelegationStats(state, 'player1');
  assertEqual(stats.totalDelegated, 1, 'Should only count player1 delegations');
});

// ---------------------------------------------------------------------------
// Suite 18: Integration scenarios
// ---------------------------------------------------------------------------
suite('Integration scenarios');

test('Full delegation lifecycle: delegate -> complete -> receipt', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 100, { name: 'Briar' });
  // Delegate
  var r = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 1000);
  assertEqual(r.success, true, 'Delegation should succeed');
  // NPC busy
  var busy = NpcDelegation.isNpcAvailable(state, 'npc_g1', 1010);
  assertEqual(busy, false, 'NPC should be busy');
  // Not yet complete
  var check1 = NpcDelegation.checkCompletion(state, 1010);
  assertEqual(check1.completed.length, 0, 'Should not be done yet');
  // Complete
  var check2 = NpcDelegation.checkCompletion(state, 1060);
  assertEqual(check2.completed.length, 1, 'Should complete after endTick');
  // NPC free again
  var free = NpcDelegation.isNpcAvailable(state, 'npc_g1', 1061);
  assertEqual(free, true, 'NPC should be free after completion');
  // Receipt exists
  var receipts = NpcDelegation.getReceipts(state, 'player1');
  assertEqual(receipts.length, 1, 'Should have 1 receipt');
  assertEqual(receipts[0].npcName, 'Briar', 'Receipt should have NPC name');
});

test('Full lifecycle with cancel: delegate -> cancel -> NPC free -> redelegate', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 100);
  var r = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  assertEqual(r.success, true, 'First delegation should succeed');
  NpcDelegation.cancelDelegation(state, 'player1', r.delegation.id);
  // NPC should now be free
  var avail = NpcDelegation.isNpcAvailable(state, 'npc_g1', 110);
  assertEqual(avail, true, 'NPC should be free after cancel');
  // Re-delegate should succeed
  var r2 = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 110);
  assertEqual(r2.success, true, 'Re-delegation should succeed');
});

test('Multiple players can delegate to different NPCs concurrently', function() {
  var npc1 = makeNpc('npc_g1', 'gardener');
  var npc2 = makeNpc('npc_g2', 'gardener');
  var state = makeState({
    npcs: [npc1, npc2],
    balances: { player1: 200, player2: 200 }
  });
  var r1 = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  var r2 = NpcDelegation.delegate(state, 'player2', 'water_garden', 'npc_g2', 100);
  assertEqual(r1.success, true, 'Player1 delegation should succeed');
  assertEqual(r2.success, true, 'Player2 delegation should succeed');
});

test('NPC reputation discount reduces actual Spark deducted', function() {
  var npc_high_rep = makeNpc('npc_g_rep', 'gardener', { reputation: 1.0 });
  var npc_no_rep = makeNpc('npc_g_norep', 'gardener', { reputation: 0 });
  var state1 = makeState({ npcs: [npc_high_rep], balances: { player1: 100 } });
  var state2 = makeState({ npcs: [npc_no_rep], balances: { player1: 100 } });

  NpcDelegation.delegate(state1, 'player1', 'water_garden', 'npc_g_rep', 100);
  NpcDelegation.delegate(state2, 'player1', 'water_garden', 'npc_g_norep', 100);

  var balance1 = state1.balances['player1'];
  var balance2 = state2.balances['player1'];
  assert(balance1 >= balance2, 'High rep NPC should cost less Spark');
});

test('Delegation stats are empty for other players', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50);
  NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  var stats = NpcDelegation.getDelegationStats(state, 'player_stranger');
  assertEqual(stats.totalDelegated, 0, 'Stranger should have no stats');
});

test('getDelegationCost consistency across task types', function() {
  var tasks = NpcDelegation.getTaskTypes();
  tasks.forEach(function(task) {
    var cost0 = NpcDelegation.getDelegationCost(task.id, 0);
    var cost1 = NpcDelegation.getDelegationCost(task.id, 1.0);
    assertEqual(cost0, task.baseCost, task.id + ' cost at 0 rep should match baseCost');
    assert(cost1 <= cost0, task.id + ' max rep cost should not exceed no rep cost');
    assert(cost1 > 0, task.id + ' max rep cost should still be positive');
  });
});

test('NPC efficiency grows through actual completions', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 500);
  var effBefore = NpcDelegation.getNpcEfficiency(state, 'npc_g1');
  assertEqual(effBefore, 1.0, 'Should start at 1.0');
  // Complete 10 delegations sequentially
  for (var i = 0; i < 10; i++) {
    NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', i * 200);
    NpcDelegation.checkCompletion(state, i * 200 + 100);
    // Replenish spark
    state.balances['player1'] = 500;
  }
  var effAfter = NpcDelegation.getNpcEfficiency(state, 'npc_g1');
  assert(effAfter > effBefore, 'Efficiency should increase after completions');
});

// ---------------------------------------------------------------------------
// Suite 19: Edge cases and boundary conditions
// ---------------------------------------------------------------------------
suite('Edge cases and boundary conditions');

test('delegate result has null reason on success', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50);
  var result = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  assertEqual(result.reason, null, 'reason should be null on success');
});

test('delegate result has null result and receipt on creation', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50);
  var result = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  assertEqual(result.delegation.result, null, 'result should be null initially');
  assertEqual(result.delegation.receipt, null, 'receipt should be null initially');
});

test('delegation ID is a non-empty string', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50);
  var result = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  assert(typeof result.delegation.id === 'string' && result.delegation.id.length > 0, 'ID should be a non-empty string');
});

test('delegation ID starts with del_', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50);
  var result = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  assert(result.delegation.id.indexOf('del_') === 0, 'ID should start with del_');
});

test('checkCompletion at exactly endTick completes delegation', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50);
  var r = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  var endTick = r.delegation.endTick;
  var result = NpcDelegation.checkCompletion(state, endTick);
  assertEqual(result.completed.length, 1, 'Should complete at exactly endTick');
});

test('getAvailableNpcs works when zone is null (no filter)', function() {
  var npc1 = makeNpc('npc_g1', 'gardener', { zone: 'gardens' });
  var npc2 = makeNpc('npc_g2', 'gardener', { zone: 'wilds' });
  var state = makeState({ npcs: [npc1, npc2] });
  var available = NpcDelegation.getAvailableNpcs(state, 'water_garden', null, 100);
  assertEqual(available.length, 2, 'Should return both NPCs when zone is null');
});

test('getAvailableNpcs works when zone is undefined (no filter)', function() {
  var npc1 = makeNpc('npc_g1', 'gardener', { zone: 'gardens' });
  var state = makeState({ npcs: [npc1] });
  var available = NpcDelegation.getAvailableNpcs(state, 'water_garden', undefined, 100);
  assertEqual(available.length, 1, 'Should return NPC when zone is undefined');
});

test('getDelegationCost at 0.5 reputation gives 15% discount', function() {
  var cost = NpcDelegation.getDelegationCost('water_garden', 0.5);
  // 15% discount on 5 = 4.25 -> ceil = 5
  var expected = Math.ceil(5 * (1 - 0.15));
  assertEqual(cost, expected, 'Cost should match 15% discount calculation');
});

test('delegate fails when player balance is just under cost', function() {
  // water_garden cost is 5 Spark; give player only 4
  var state = makeStateWithNpc('npc_g1', 'gardener', 4);
  var result = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  assertEqual(result.success, false, 'Should fail with 4 Spark when cost is 5');
});

test('delegate succeeds when player balance equals exact cost', function() {
  // water_garden costs 5 Spark; give player exactly 5
  var state = makeStateWithNpc('npc_g1', 'gardener', 5);
  var result = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  assertEqual(result.success, true, 'Should succeed with exactly enough Spark');
});

test('getDelegationStats failed field defaults to 0 (no failed status set manually)', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50);
  var stats = NpcDelegation.getDelegationStats(state, 'player1');
  assertEqual(stats.failed, 0, 'failed should start at 0');
});

test('getPlayerDelegations with completed status filter', function() {
  var npc1 = makeNpc('npc_g1', 'gardener');
  var npc2 = makeNpc('npc_g2', 'gardener');
  var state = makeState({
    npcs: [npc1, npc2],
    balances: { player1: 200 }
  });
  NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  NpcDelegation.delegate(state, 'player1', 'tend_crops', 'npc_g2', 100);
  NpcDelegation.checkCompletion(state, 300);
  var completed = NpcDelegation.getPlayerDelegations(state, 'player1', 'completed');
  assertEqual(completed.length, 2, 'Should return 2 completed delegations');
});

test('getNpcDelegations includes cancelled delegations', function() {
  var state = makeStateWithNpc('npc_g1', 'gardener', 50);
  var r = NpcDelegation.delegate(state, 'player1', 'water_garden', 'npc_g1', 100);
  NpcDelegation.cancelDelegation(state, 'player1', r.delegation.id);
  var delegations = NpcDelegation.getNpcDelegations(state, 'npc_g1');
  assertEqual(delegations.length, 1, 'Should include cancelled delegation');
  assertEqual(delegations[0].status, 'cancelled', 'Should be cancelled');
});

// ---------------------------------------------------------------------------
// Final report
// ---------------------------------------------------------------------------
process.stdout.write('\n==============================\n');
process.stdout.write('Total: ' + (passed + failed) + ' | Passed: ' + passed + ' | Failed: ' + failed + '\n');
if (failures.length > 0) {
  process.stdout.write('\nFailures:\n');
  failures.forEach(function(f) {
    process.stdout.write('  FAIL: ' + f.name + '\n    -> ' + f.error + '\n');
  });
}
process.stdout.write('==============================\n');
if (failed > 0) {
  process.exit(1);
}
