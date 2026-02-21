// test_economy_viz.js - Tests for EconomyViz module
// Vanilla JS, zero dependencies (except assert)
var assert = require('assert');
var EconomyViz = require('../src/js/economy_viz.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function ok(val, msg) {
  if (!val) throw new Error(msg || 'Assertion failed');
}

function eq(a, b, msg) {
  if (a !== b) throw new Error((msg || '') + ' | expected ' + JSON.stringify(b) + ' got ' + JSON.stringify(a));
}

function near(a, b, epsilon, msg) {
  epsilon = epsilon || 0.001;
  if (Math.abs(a - b) > epsilon) {
    throw new Error((msg || '') + ' | expected ~' + b + ' got ' + a);
  }
}

var passed = 0;
var failed = 0;
var failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    process.stdout.write('  pass: ' + name + '\n');
  } catch (e) {
    failed++;
    failures.push({ name: name, error: e });
    process.stdout.write('  FAIL: ' + name + '\n    ' + e.message + '\n');
  }
}

// ---------------------------------------------------------------------------
// Sample economy states
// ---------------------------------------------------------------------------

var emptyState = {
  balances: {},
  transactions: []
};

var singleCitizenState = {
  balances: { alice: 100 },
  transactions: [
    { type: 'earn', from: 'SYSTEM', to: 'alice', amount: 100, ts: 1000 }
  ]
};

var withTreasuryState = {
  balances: {
    TREASURY: 50,
    alice: 100,
    bob: 200
  },
  transactions: [
    { type: 'earn', from: 'SYSTEM', to: 'alice', amount: 100, ts: 1000 },
    { type: 'tax',  from: 'alice',  to: 'TREASURY', amount: 20, ts: 1001 },
    { type: 'earn', from: 'SYSTEM', to: 'bob',   amount: 200, ts: 1002 },
    { type: 'tax',  from: 'bob',    to: 'TREASURY', amount: 30, ts: 1003 },
    { type: 'ubi',  from: 'TREASURY', to: 'alice', amount: 5, ts: 1004 },
    { type: 'trade', from: 'bob',   to: 'alice', amount: 10, ts: 1005 },
    { type: 'gift',  from: 'alice', to: 'bob',   amount: 3,  ts: 1006 }
  ]
};

var realisticState = {
  balances: {
    TREASURY: 300,
    agent_001: 10,
    agent_002: 25,
    agent_003: 50,
    agent_004: 75,
    agent_005: 100,
    agent_006: 200,
    agent_007: 400,
    agent_008: 800,
    agent_009: 1500,
    agent_010: 3000
  },
  transactions: []
};

var negativeBalanceState = {
  balances: {
    TREASURY: 100,
    alice: -5,
    bob: 50,
    carol: 0
  },
  transactions: [
    { type: 'ubi', from: 'TREASURY', to: 'alice', amount: 5, ts: 2000 },
    { type: 'earn', from: 'SYSTEM', to: 'bob', amount: 50, ts: 2001 }
  ]
};

var zeroTreasuryState = {
  balances: {
    TREASURY: 0,
    alice: 40,
    bob: 60
  },
  transactions: []
};

var equalBalanceState = {
  balances: {
    alice: 100,
    bob: 100,
    carol: 100
  },
  transactions: []
};

var allToOneState = {
  balances: {
    alice: 999,
    bob: 0,
    carol: 0,
    dave: 1
  },
  transactions: []
};

// ---------------------------------------------------------------------------
// Suite: computeGini
// ---------------------------------------------------------------------------
process.stdout.write('\ncomputeGini\n');

test('perfect equality gives 0', function() {
  var g = EconomyViz.computeGini({ alice: 100, bob: 100, carol: 100 });
  near(g, 0, 0.001, 'equal distribution');
});

test('single player gives 0', function() {
  var g = EconomyViz.computeGini({ alice: 500 });
  near(g, 0, 0.001, 'single player');
});

test('one-has-all gives near 1', function() {
  // Three zeros and one 1000: Gini ≈ 0.75
  var g = EconomyViz.computeGini({ alice: 1000, bob: 0, carol: 0, dave: 0 });
  ok(g > 0.5, 'should be > 0.5, got ' + g);
  ok(g <= 1.0, 'should be <= 1');
});

test('realistic spread is between 0 and 1', function() {
  var balances = {};
  for (var i = 0; i < 10; i++) {
    balances['agent_' + i] = (i + 1) * 100;
  }
  var g = EconomyViz.computeGini(balances);
  ok(g > 0, 'should be > 0');
  ok(g < 1, 'should be < 1');
});

test('empty balances gives 0', function() {
  var g = EconomyViz.computeGini({});
  near(g, 0, 0.001, 'empty');
});

test('negative balances are treated as 0', function() {
  // Should not produce NaN or error
  var g = EconomyViz.computeGini({ alice: -10, bob: 100, carol: 50 });
  ok(typeof g === 'number', 'should return a number');
  ok(!isNaN(g), 'should not be NaN');
  ok(g >= 0, 'should be >= 0');
  ok(g <= 1, 'should be <= 1');
});

test('two equal players gives 0', function() {
  var g = EconomyViz.computeGini({ alice: 200, bob: 200 });
  near(g, 0, 0.001);
});

// ---------------------------------------------------------------------------
// Suite: computeDistribution
// ---------------------------------------------------------------------------
process.stdout.write('\ncomputeDistribution\n');

test('returns brackets array', function() {
  var result = EconomyViz.computeDistribution(realisticState.balances);
  ok(Array.isArray(result.brackets), 'should return brackets array');
  ok(result.brackets.length > 0, 'should have at least one bracket');
});

test('each bracket has range, count, totalSpark', function() {
  var result = EconomyViz.computeDistribution(realisticState.balances);
  result.brackets.forEach(function(b) {
    ok(b.range !== undefined, 'bracket needs range');
    ok(typeof b.count === 'number', 'bracket needs count');
    ok(typeof b.totalSpark === 'number', 'bracket needs totalSpark');
  });
});

test('all non-TREASURY citizens are counted', function() {
  var result = EconomyViz.computeDistribution(realisticState.balances);
  var total = result.brackets.reduce(function(sum, b) { return sum + b.count; }, 0);
  // realisticState has 10 agents + TREASURY (TREASURY excluded)
  eq(total, 10, 'should count 10 agents');
});

test('empty balances returns empty brackets or all-zero', function() {
  var result = EconomyViz.computeDistribution({});
  ok(Array.isArray(result.brackets), 'should return brackets array');
  var total = result.brackets.reduce(function(sum, b) { return sum + b.count; }, 0);
  eq(total, 0, 'empty state should have 0 count');
});

test('single citizen in correct bracket', function() {
  var result = EconomyViz.computeDistribution({ alice: 75 });
  var total = result.brackets.reduce(function(sum, b) { return sum + b.count; }, 0);
  eq(total, 1, 'should count 1 citizen');
  // Find the bracket containing 75
  var found = result.brackets.some(function(b) {
    return b.count > 0 && b.totalSpark === 75;
  });
  ok(found, 'should place alice in a bracket with 75 totalSpark');
});

test('negative balances are bucketed at 0', function() {
  var result = EconomyViz.computeDistribution({ alice: -50, bob: 100 });
  var total = result.brackets.reduce(function(sum, b) { return sum + b.count; }, 0);
  eq(total, 2, 'should count both citizens');
});

test('totalSpark per bracket matches summed balances', function() {
  var result = EconomyViz.computeDistribution(realisticState.balances);
  var grandTotal = result.brackets.reduce(function(sum, b) { return sum + b.totalSpark; }, 0);
  // Sum of agent balances: 10+25+50+75+100+200+400+800+1500+3000 = 6160
  eq(grandTotal, 6160, 'total spark in brackets');
});

// ---------------------------------------------------------------------------
// Suite: getFlowData
// ---------------------------------------------------------------------------
process.stdout.write('\ngetFlowData\n');

test('returns nodes, flows, summary', function() {
  var result = EconomyViz.getFlowData(withTreasuryState);
  ok(result.nodes !== undefined, 'needs nodes');
  ok(result.flows !== undefined, 'needs flows');
  ok(result.summary !== undefined, 'needs summary');
});

test('nodes include TREASURY with type treasury', function() {
  var result = EconomyViz.getFlowData(withTreasuryState);
  var treasury = result.nodes.filter(function(n) { return n.id === 'TREASURY'; });
  eq(treasury.length, 1, 'should have exactly one TREASURY node');
  eq(treasury[0].type, 'treasury', 'TREASURY node type');
  eq(treasury[0].balance, 50, 'TREASURY balance');
});

test('citizen nodes have type citizen', function() {
  var result = EconomyViz.getFlowData(withTreasuryState);
  var citizens = result.nodes.filter(function(n) { return n.id !== 'TREASURY'; });
  citizens.forEach(function(n) {
    eq(n.type, 'citizen', 'citizen node type for ' + n.id);
    ok(n.label !== undefined, 'citizen needs label');
    ok(typeof n.balance === 'number', 'citizen needs numeric balance');
  });
});

test('flows are categorized by type: tax', function() {
  var result = EconomyViz.getFlowData(withTreasuryState);
  var taxFlows = result.flows.filter(function(f) { return f.type === 'tax'; });
  ok(taxFlows.length >= 1, 'should have at least one tax flow');
  taxFlows.forEach(function(f) {
    eq(f.to, 'TREASURY', 'tax flow goes to TREASURY');
    ok(f.amount > 0, 'tax flow has positive amount');
  });
});

test('flows are categorized by type: ubi', function() {
  var result = EconomyViz.getFlowData(withTreasuryState);
  var ubiFlows = result.flows.filter(function(f) { return f.type === 'ubi'; });
  ok(ubiFlows.length >= 1, 'should have at least one ubi flow');
  ubiFlows.forEach(function(f) {
    eq(f.from, 'TREASURY', 'ubi flow comes from TREASURY');
  });
});

test('flows are categorized by type: earn', function() {
  var result = EconomyViz.getFlowData(withTreasuryState);
  var earnFlows = result.flows.filter(function(f) { return f.type === 'earn'; });
  ok(earnFlows.length >= 1, 'should have at least one earn flow');
});

test('flows are categorized by type: trade', function() {
  var result = EconomyViz.getFlowData(withTreasuryState);
  var tradeFlows = result.flows.filter(function(f) { return f.type === 'trade'; });
  ok(tradeFlows.length >= 1, 'should have at least one trade flow');
});

test('flows are categorized by type: gift', function() {
  var result = EconomyViz.getFlowData(withTreasuryState);
  var giftFlows = result.flows.filter(function(f) { return f.type === 'gift'; });
  ok(giftFlows.length >= 1, 'should have at least one gift flow');
});

test('empty state returns empty nodes and flows', function() {
  var result = EconomyViz.getFlowData(emptyState);
  eq(result.nodes.length, 0, 'empty state: no nodes');
  eq(result.flows.length, 0, 'empty state: no flows');
});

test('single citizen state nodes length is 1', function() {
  var result = EconomyViz.getFlowData(singleCitizenState);
  eq(result.nodes.length, 1, 'single citizen: 1 node');
});

test('summary totalSupply includes all balances', function() {
  var result = EconomyViz.getFlowData(withTreasuryState);
  // TREASURY=50, alice=100, bob=200 => 350
  eq(result.summary.totalSupply, 350, 'totalSupply should be 350');
});

test('summary treasuryBalance matches TREASURY node', function() {
  var result = EconomyViz.getFlowData(withTreasuryState);
  eq(result.summary.treasuryBalance, 50, 'treasuryBalance');
});

test('summary giniCoefficient is in 0-1 range', function() {
  var result = EconomyViz.getFlowData(realisticState);
  ok(result.summary.giniCoefficient >= 0, 'gini >= 0');
  ok(result.summary.giniCoefficient <= 1, 'gini <= 1');
});

test('summary avgBalance excludes TREASURY', function() {
  // alice=100, bob=200 -> avg=150; TREASURY should not be included
  var result = EconomyViz.getFlowData(withTreasuryState);
  eq(result.summary.avgBalance, 150, 'avgBalance should be 150');
});

test('summary topEarners is an array', function() {
  var result = EconomyViz.getFlowData(realisticState);
  ok(Array.isArray(result.summary.topEarners), 'topEarners should be array');
});

test('summary topEarners are sorted descending', function() {
  var result = EconomyViz.getFlowData(realisticState);
  var earners = result.summary.topEarners;
  for (var i = 0; i + 1 < earners.length; i++) {
    ok(earners[i].balance >= earners[i+1].balance, 'topEarners must be sorted desc');
  }
});

test('zero TREASURY state handled without error', function() {
  var result = EconomyViz.getFlowData(zeroTreasuryState);
  var treasury = result.nodes.filter(function(n) { return n.id === 'TREASURY'; });
  eq(treasury[0].balance, 0, 'TREASURY balance 0');
  eq(result.summary.treasuryBalance, 0, 'summary treasuryBalance 0');
});

test('negative balances appear in nodes correctly', function() {
  var result = EconomyViz.getFlowData(negativeBalanceState);
  var alice = result.nodes.filter(function(n) { return n.id === 'alice'; })[0];
  eq(alice.balance, -5, 'alice balance should be -5');
});

// ---------------------------------------------------------------------------
// Suite: formatSummary
// ---------------------------------------------------------------------------
process.stdout.write('\nformatSummary\n');

test('returns a non-empty string', function() {
  var s = EconomyViz.formatSummary(realisticState);
  ok(typeof s === 'string', 'should be string');
  ok(s.length > 0, 'should be non-empty');
});

test('includes total supply figure', function() {
  var s = EconomyViz.formatSummary(realisticState);
  // Total: 300+10+25+50+75+100+200+400+800+1500+3000 = 6460
  ok(s.indexOf('6460') !== -1 || s.toLowerCase().indexOf('total') !== -1,
    'should mention total supply: ' + s);
});

test('includes treasury balance', function() {
  var s = EconomyViz.formatSummary(withTreasuryState);
  ok(s.toLowerCase().indexOf('treasury') !== -1, 'should mention treasury: ' + s);
});

test('includes gini coefficient', function() {
  var s = EconomyViz.formatSummary(realisticState);
  ok(s.toLowerCase().indexOf('gini') !== -1, 'should mention gini: ' + s);
});

test('includes citizen count', function() {
  var s = EconomyViz.formatSummary(realisticState);
  // 10 agents
  ok(s.indexOf('10') !== -1, 'should mention citizen count 10: ' + s);
});

test('empty economy produces sensible string', function() {
  var s = EconomyViz.formatSummary(emptyState);
  ok(typeof s === 'string', 'should return string for empty economy');
  ok(s.length > 0, 'should be non-empty even for empty economy');
});

// ---------------------------------------------------------------------------
// Suite: module API surface
// ---------------------------------------------------------------------------
process.stdout.write('\nModule API surface\n');

test('EconomyViz.init is a function', function() {
  ok(typeof EconomyViz.init === 'function', 'init should be function');
});

test('EconomyViz.loadState is a function', function() {
  ok(typeof EconomyViz.loadState === 'function', 'loadState should be function');
});

test('EconomyViz.update is a function', function() {
  ok(typeof EconomyViz.update === 'function', 'update should be function');
});

test('EconomyViz.render is a function', function() {
  ok(typeof EconomyViz.render === 'function', 'render should be function');
});

test('EconomyViz.getFlowData is a function', function() {
  ok(typeof EconomyViz.getFlowData === 'function', 'getFlowData should be function');
});

test('EconomyViz.computeGini is a function', function() {
  ok(typeof EconomyViz.computeGini === 'function', 'computeGini should be function');
});

test('EconomyViz.computeDistribution is a function', function() {
  ok(typeof EconomyViz.computeDistribution === 'function', 'computeDistribution should be function');
});

test('EconomyViz.formatSummary is a function', function() {
  ok(typeof EconomyViz.formatSummary === 'function', 'formatSummary should be function');
});

// ---------------------------------------------------------------------------
// Suite: loadState + getFlowData round-trip
// ---------------------------------------------------------------------------
process.stdout.write('\nloadState round-trip\n');

test('loadState does not throw', function() {
  // loadState stores state internally; canvas rendering skipped in Node
  EconomyViz.loadState(realisticState);
  ok(true, 'no throw');
});

test('after loadState, getFlowData still works with any state', function() {
  EconomyViz.loadState(realisticState);
  var result = EconomyViz.getFlowData(realisticState);
  ok(result.nodes.length > 0, 'nodes present after loadState');
});

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
process.stdout.write('\n' + passed + ' passed, ' + failed + ' failed\n');
if (failures.length > 0) {
  process.stdout.write('\nFailures:\n');
  failures.forEach(function(f) {
    process.stdout.write('  ' + f.name + ': ' + f.error.message + '\n');
  });
}
process.exit(failed === 0 ? 0 : 1);
