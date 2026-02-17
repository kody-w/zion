#!/usr/bin/env node
// Tests for sim_crm.js — CRM Simulation module
'use strict';

var SimCRM = require('../src/js/sim_crm.js');

var passed = 0;
var failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error('FAIL: ' + message);
  }
}

function assertEqual(actual, expected, message) {
  if (actual === expected) {
    passed++;
  } else {
    failed++;
    console.error('FAIL: ' + message + ' — expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
  }
}

// --- initState ---

(function testInitStateEmpty() {
  var state = SimCRM.initState();
  assert(state.accounts && typeof state.accounts === 'object', 'initState returns accounts object');
  assert(state.contacts && typeof state.contacts === 'object', 'initState returns contacts object');
  assert(state.opportunities && typeof state.opportunities === 'object', 'initState returns opportunities object');
  assert(Array.isArray(state.activities), 'initState returns activities array');
  assert(Array.isArray(state.pipeline_stages), 'initState returns pipeline_stages array');
  assertEqual(state.pipeline_stages.length, 6, 'pipeline_stages has 6 stages');
})();

(function testInitStateFromSnapshot() {
  var snapshot = {
    accounts: { 'acc_test_1': { id: 'acc_test_1', name: 'Test Corp' } },
    contacts: {},
    opportunities: {},
    activities: [],
    pipeline_stages: SimCRM.PIPELINE_STAGES.slice()
  };
  var state = SimCRM.initState(snapshot);
  assert(state.accounts['acc_test_1'] !== undefined, 'initState restores snapshot accounts');
  assertEqual(state.accounts['acc_test_1'].name, 'Test Corp', 'initState restores account data');
  // Ensure deep clone
  snapshot.accounts['acc_test_1'].name = 'Modified';
  assertEqual(state.accounts['acc_test_1'].name, 'Test Corp', 'initState deep clones snapshot');
})();

// --- Accounts CRUD ---

(function testCreateAccount() {
  var state = SimCRM.initState();
  var result = SimCRM.createAccount(state, {
    name: 'Agora Trading Co',
    industry: 'trade',
    revenue: 5000,
    owner: 'agent_004',
    zone: 'agora'
  });
  var newState = result.state;
  var record = result.record;

  assert(record.id.indexOf('acc_') === 0, 'account id has acc_ prefix');
  assertEqual(record.name, 'Agora Trading Co', 'account name set');
  assertEqual(record.industry, 'trade', 'account industry set');
  assertEqual(record.revenue, 5000, 'account revenue set');
  assertEqual(record.owner, 'agent_004', 'account owner set');
  assertEqual(record.status, 'active', 'account default status is active');
  assert(newState.accounts[record.id] !== undefined, 'account stored in state');
  // Original state unchanged (pure function)
  assertEqual(Object.keys(state.accounts).length, 0, 'original state unchanged');
})();

(function testUpdateAccount() {
  var state = SimCRM.initState();
  var result = SimCRM.createAccount(state, { name: 'Old Name', revenue: 100 });
  state = result.state;
  var id = result.record.id;

  var updated = SimCRM.updateAccount(state, id, { name: 'New Name', revenue: 9000 });
  assertEqual(updated.accounts[id].name, 'New Name', 'account name updated');
  assertEqual(updated.accounts[id].revenue, 9000, 'account revenue updated');
  // Original unchanged
  assertEqual(state.accounts[id].name, 'Old Name', 'original state unchanged after update');
})();

(function testUpdateAccountMissing() {
  var state = SimCRM.initState();
  var result = SimCRM.updateAccount(state, 'nonexistent', { name: 'X' });
  assert(result === state, 'updating nonexistent account returns same state');
})();

// --- Contacts CRUD ---

(function testCreateContact() {
  var state = SimCRM.initState();
  var result = SimCRM.createContact(state, {
    name: 'Luna Rootdeep',
    email: 'luna@agora.zion',
    role: 'merchant',
    accountId: 'acc_123'
  });
  var record = result.record;
  assert(record.id.indexOf('con_') === 0, 'contact id has con_ prefix');
  assertEqual(record.name, 'Luna Rootdeep', 'contact name set');
  assertEqual(record.accountId, 'acc_123', 'contact accountId set');
})();

(function testUpdateContact() {
  var state = SimCRM.initState();
  var result = SimCRM.createContact(state, { name: 'Original' });
  state = result.state;
  var id = result.record.id;

  var updated = SimCRM.updateContact(state, id, { role: 'manager' });
  assertEqual(updated.contacts[id].role, 'manager', 'contact role updated');
})();

// --- Opportunities ---

(function testCreateOpportunity() {
  var state = SimCRM.initState();
  var result = SimCRM.createOpportunity(state, {
    name: 'Crystal Supply Deal',
    accountId: 'acc_123',
    stage: 'proposal',
    value: 2500,
    owner: 'agent_004'
  });
  var record = result.record;
  assert(record.id.indexOf('opp_') === 0, 'opportunity id has opp_ prefix');
  assertEqual(record.stage, 'proposal', 'opportunity stage set');
  assertEqual(record.value, 2500, 'opportunity value set');
  assertEqual(record.probability, 50, 'proposal stage gets 50% probability');
})();

(function testCreateOpportunityDefaultStage() {
  var state = SimCRM.initState();
  var result = SimCRM.createOpportunity(state, { name: 'New Deal' });
  assertEqual(result.record.stage, 'prospecting', 'default stage is prospecting');
  assertEqual(result.record.probability, 10, 'prospecting gets 10% probability');
})();

(function testUpdateStage() {
  var state = SimCRM.initState();
  var result = SimCRM.createOpportunity(state, { name: 'Deal', stage: 'prospecting' });
  state = result.state;
  var id = result.record.id;

  var updated = SimCRM.updateStage(state, id, 'qualification');
  assertEqual(updated.opportunities[id].stage, 'qualification', 'stage updated to qualification');
  assertEqual(updated.opportunities[id].probability, 25, 'probability updated for qualification');
})();

(function testUpdateStageInvalid() {
  var state = SimCRM.initState();
  var result = SimCRM.createOpportunity(state, { name: 'Deal', stage: 'proposal' });
  state = result.state;
  var id = result.record.id;

  var unchanged = SimCRM.updateStage(state, id, 'invalid_stage');
  assertEqual(unchanged.opportunities[id].stage, 'proposal', 'invalid stage rejected');
})();

(function testCannotMoveFromClosedWon() {
  var state = SimCRM.initState();
  var result = SimCRM.createOpportunity(state, { name: 'Won Deal', stage: 'negotiation' });
  state = result.state;
  var id = result.record.id;

  state = SimCRM.closeDeal(state, id, true, {});
  var unchanged = SimCRM.updateStage(state, id, 'prospecting');
  assertEqual(unchanged.opportunities[id].stage, 'closed_won', 'closed_won cannot be reopened');
})();

(function testCloseDealWon() {
  var state = SimCRM.initState();
  var result = SimCRM.createOpportunity(state, { name: 'Big Deal', value: 1000, stage: 'negotiation' });
  state = result.state;
  var id = result.record.id;

  var closed = SimCRM.closeDeal(state, id, true, { value: 1200 });
  assertEqual(closed.opportunities[id].stage, 'closed_won', 'deal marked as closed_won');
  assertEqual(closed.opportunities[id].probability, 100, 'won probability is 100');
  assertEqual(closed.opportunities[id].value, 1200, 'final value updated');
})();

(function testCloseDealLost() {
  var state = SimCRM.initState();
  var result = SimCRM.createOpportunity(state, { name: 'Lost Deal', stage: 'proposal' });
  state = result.state;
  var id = result.record.id;

  var closed = SimCRM.closeDeal(state, id, false, { reason: 'budget' });
  assertEqual(closed.opportunities[id].stage, 'closed_lost', 'deal marked as closed_lost');
  assertEqual(closed.opportunities[id].probability, 0, 'lost probability is 0');
  assertEqual(closed.opportunities[id].close_reason, 'budget', 'close reason recorded');
})();

// --- Activities ---

(function testLogActivity() {
  var state = SimCRM.initState();
  var result = SimCRM.logActivity(state, {
    type: 'call',
    subject: 'Follow up on proposal',
    regarding: 'opp_123',
    regardingType: 'opportunity',
    owner: 'agent_014'
  });
  var record = result.record;
  assert(record.id.indexOf('act_') === 0, 'activity id has act_ prefix');
  assertEqual(record.type, 'call', 'activity type set');
  assertEqual(record.subject, 'Follow up on proposal', 'activity subject set');
  assertEqual(result.state.activities.length, 1, 'activity added to array');
})();

(function testLogActivityInvalidType() {
  var state = SimCRM.initState();
  var result = SimCRM.logActivity(state, { type: 'invalid_type', subject: 'Test' });
  assertEqual(result.record.type, 'task', 'invalid activity type defaults to task');
})();

// --- Notes ---

(function testAddNoteToAccount() {
  var state = SimCRM.initState();
  var result = SimCRM.createAccount(state, { name: 'Test Corp' });
  state = result.state;
  var id = result.record.id;

  var noted = SimCRM.addNote(state, 'account', id, 'Great customer', 'agent_004');
  assertEqual(noted.accounts[id].notes.length, 1, 'note added to account');
  assertEqual(noted.accounts[id].notes[0].text, 'Great customer', 'note text correct');
  assertEqual(noted.accounts[id].notes[0].author, 'agent_004', 'note author correct');
})();

(function testAddNoteToMissingEntity() {
  var state = SimCRM.initState();
  var unchanged = SimCRM.addNote(state, 'account', 'nonexistent', 'text', 'author');
  assert(unchanged === state, 'adding note to missing entity returns same state');
})();

// --- Query ---

(function testQueryAccounts() {
  var state = SimCRM.initState();
  var r1 = SimCRM.createAccount(state, { name: 'A', industry: 'trade' });
  state = r1.state;
  var r2 = SimCRM.createAccount(state, { name: 'B', industry: 'craft' });
  state = r2.state;
  var r3 = SimCRM.createAccount(state, { name: 'C', industry: 'trade' });
  state = r3.state;

  var all = SimCRM.query(state, 'accounts', null);
  assertEqual(all.length, 3, 'query all accounts returns 3');

  var trade = SimCRM.query(state, 'accounts', { industry: 'trade' });
  assertEqual(trade.length, 2, 'query filtered accounts returns 2');
})();

(function testQueryActivities() {
  var state = SimCRM.initState();
  var r1 = SimCRM.logActivity(state, { type: 'call', subject: 'Call 1' });
  state = r1.state;
  var r2 = SimCRM.logActivity(state, { type: 'email', subject: 'Email 1' });
  state = r2.state;
  var r3 = SimCRM.logActivity(state, { type: 'call', subject: 'Call 2' });
  state = r3.state;

  var calls = SimCRM.query(state, 'activities', { type: 'call' });
  assertEqual(calls.length, 2, 'query call activities returns 2');
})();

(function testQueryInvalidType() {
  var state = SimCRM.initState();
  var results = SimCRM.query(state, 'nonexistent', {});
  assertEqual(results.length, 0, 'query invalid entity type returns empty');
})();

// --- Metrics ---

(function testGetMetrics() {
  var state = SimCRM.initState();

  // Create accounts
  var r1 = SimCRM.createAccount(state, { name: 'A' });
  state = r1.state;
  var r2 = SimCRM.createAccount(state, { name: 'B' });
  state = r2.state;

  // Create contacts
  var c1 = SimCRM.createContact(state, { name: 'C1' });
  state = c1.state;

  // Create opportunities
  var o1 = SimCRM.createOpportunity(state, { name: 'Deal 1', value: 1000, stage: 'proposal' });
  state = o1.state;
  var o2 = SimCRM.createOpportunity(state, { name: 'Deal 2', value: 500, stage: 'negotiation' });
  state = o2.state;
  var o3 = SimCRM.createOpportunity(state, { name: 'Deal 3', value: 2000, stage: 'proposal' });
  state = o3.state;

  // Close one deal
  state = SimCRM.closeDeal(state, o2.record.id, true, {});

  // Log activity
  var a1 = SimCRM.logActivity(state, { type: 'call', subject: 'Test' });
  state = a1.state;

  var metrics = SimCRM.getMetrics(state);
  assertEqual(metrics.accounts_count, 2, 'metrics accounts_count');
  assertEqual(metrics.contacts_count, 1, 'metrics contacts_count');
  assertEqual(metrics.opportunities_count, 3, 'metrics opportunities_count');
  assertEqual(metrics.pipeline_value, 3000, 'metrics pipeline_value (open opps only)');
  assertEqual(metrics.won_count, 1, 'metrics won_count');
  assertEqual(metrics.won_value, 500, 'metrics won_value');
  assertEqual(metrics.conversion_rate, 100, 'metrics conversion_rate (1 won / 1 closed)');
  assertEqual(metrics.activity_count, 1, 'metrics activity_count');
})();

// --- applyAction dispatch ---

(function testApplyActionCreateAccount() {
  var state = SimCRM.initState();
  var msg = {
    from: 'agent_004',
    payload: {
      sim: 'crm',
      action: 'create_account',
      data: { name: 'Via Action', industry: 'trade' }
    }
  };
  var newState = SimCRM.applyAction(state, msg);
  var accounts = SimCRM.query(newState, 'accounts', {});
  assertEqual(accounts.length, 1, 'applyAction create_account creates account');
  assertEqual(accounts[0].name, 'Via Action', 'applyAction passes data through');
  assertEqual(accounts[0].owner, 'agent_004', 'applyAction sets owner from msg.from');
})();

(function testApplyActionUpdateStage() {
  var state = SimCRM.initState();
  var result = SimCRM.createOpportunity(state, { name: 'Deal', stage: 'prospecting' });
  state = result.state;
  var id = result.record.id;

  var msg = {
    from: 'agent_004',
    payload: { sim: 'crm', action: 'update_stage', data: { id: id, stage: 'qualification' } }
  };
  var newState = SimCRM.applyAction(state, msg);
  assertEqual(newState.opportunities[id].stage, 'qualification', 'applyAction update_stage works');
})();

(function testApplyActionLogActivity() {
  var state = SimCRM.initState();
  var msg = {
    from: 'agent_014',
    payload: { sim: 'crm', action: 'log_activity', data: { type: 'meeting', subject: 'Quarterly review' } }
  };
  var newState = SimCRM.applyAction(state, msg);
  assertEqual(newState.activities.length, 1, 'applyAction log_activity adds activity');
  assertEqual(newState.activities[0].owner, 'agent_014', 'activity owner from msg.from');
})();

(function testApplyActionUnknown() {
  var state = SimCRM.initState();
  var msg = { from: 'x', payload: { sim: 'crm', action: 'nonexistent', data: {} } };
  var result = SimCRM.applyAction(state, msg);
  assert(result === state, 'unknown action returns same state');
})();

// --- Snapshot fidelity ---

(function testSnapshotRoundTrip() {
  var state = SimCRM.initState();
  var r1 = SimCRM.createAccount(state, { name: 'Corp A', industry: 'trade', revenue: 5000 });
  state = r1.state;
  var r2 = SimCRM.createContact(state, { name: 'Contact 1', accountId: r1.record.id });
  state = r2.state;
  var r3 = SimCRM.createOpportunity(state, { name: 'Opp 1', accountId: r1.record.id, value: 1000 });
  state = r3.state;
  var r4 = SimCRM.logActivity(state, { type: 'call', subject: 'Initial call' });
  state = r4.state;

  // Serialize and restore
  var json = JSON.stringify(state);
  var restored = SimCRM.initState(JSON.parse(json));

  assertEqual(Object.keys(restored.accounts).length, 1, 'snapshot restores 1 account');
  assertEqual(Object.keys(restored.contacts).length, 1, 'snapshot restores 1 contact');
  assertEqual(Object.keys(restored.opportunities).length, 1, 'snapshot restores 1 opportunity');
  assertEqual(restored.activities.length, 1, 'snapshot restores 1 activity');

  // Data fidelity
  var acct = restored.accounts[r1.record.id];
  assertEqual(acct.name, 'Corp A', 'snapshot preserves account name');
  assertEqual(acct.revenue, 5000, 'snapshot preserves account revenue');
})();

// --- simulateTick ---

(function testSimulateTickRunsWithoutError() {
  // Build a state with some data to tick against
  var state = SimCRM.initState();
  var a1 = SimCRM.createAccount(state, { name: 'Shop A', owner: 'agent_004' });
  state = a1.state;
  var a2 = SimCRM.createAccount(state, { name: 'Shop B', owner: 'agent_014' });
  state = a2.state;
  var o1 = SimCRM.createOpportunity(state, { name: 'Deal 1', accountId: a1.record.id, stage: 'prospecting', value: 1000, owner: 'agent_004' });
  state = o1.state;
  var o2 = SimCRM.createOpportunity(state, { name: 'Deal 2', accountId: a2.record.id, stage: 'qualification', value: 2000, owner: 'agent_014' });
  state = o2.state;
  var o3 = SimCRM.createOpportunity(state, { name: 'Deal 3', accountId: a1.record.id, stage: 'negotiation', value: 500, owner: 'agent_004' });
  state = o3.state;

  var before = SimCRM.getMetrics(state);

  // Run 5 ticks — with probabilistic actions, one tick may be a no-op,
  // but 5 ticks should produce at least one change.
  var ticked = state;
  for (var t = 0; t < 5; t++) {
    ticked = SimCRM.simulateTick(ticked);
  }

  assert(ticked !== null, 'simulateTick returns a state');
  assert(ticked.accounts !== undefined, 'ticked state has accounts');
  assert(ticked.opportunities !== undefined, 'ticked state has opportunities');
  assert(Array.isArray(ticked.activities), 'ticked state has activities array');

  var after = SimCRM.getMetrics(ticked);
  var somethingChanged = after.activity_count > before.activity_count
    || after.opportunities_count > before.opportunities_count
    || JSON.stringify(after.stage_breakdown) !== JSON.stringify(before.stage_breakdown);
  assert(somethingChanged, 'simulateTick changes something in the state after 5 ticks');
})();

(function testSimulateTickEmptyState() {
  var state = SimCRM.initState();
  var ticked = SimCRM.simulateTick(state);
  assert(ticked === state, 'simulateTick on empty state returns same state');
})();

(function testSimulateTickMultipleRounds() {
  // Run 10 ticks to make sure nothing blows up
  var state = SimCRM.initState();
  var a1 = SimCRM.createAccount(state, { name: 'TestCo', owner: 'agent_004' });
  state = a1.state;
  var o1 = SimCRM.createOpportunity(state, { name: 'Big Deal', accountId: a1.record.id, stage: 'prospecting', value: 3000 });
  state = o1.state;

  for (var i = 0; i < 10; i++) {
    state = SimCRM.simulateTick(state);
  }

  var metrics = SimCRM.getMetrics(state);
  assert(metrics.activity_count > 0, 'multiple ticks produce activities');
  assert(metrics.opportunities_count >= 1, 'opportunities still exist after ticks');
})();

// --- Results ---

console.log('\nCRM Simulation Tests: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) {
  process.exit(1);
} else {
  console.log('All CRM tests passed!');
}
