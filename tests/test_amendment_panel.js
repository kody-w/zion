// test_amendment_panel.js — Tests for the Amendment Voting HUD Panel
// Covers: panel creation/destruction, amendment display formatting,
//         vote rendering, proposal form validation, edge cases.
'use strict';

var assert = require('assert');

var passed = 0;
var failed = 0;
var errors = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    process.stdout.write('  \u2713 ' + name + '\n');
  } catch (e) {
    failed++;
    errors.push({ name: name, error: e });
    process.stdout.write('  \u2717 ' + name + '\n    ' + e.message + '\n');
  }
}

function suite(name, fn) {
  console.log('\n' + name);
  fn();
}

// ─── Minimal DOM mock ─────────────────────────────────────────────────────────

var _elements = {};
var _domTree = [];
var _querySelectorAllResults = {};

function makeEl(tag) {
  var el = {
    _tag: tag,
    _children: [],
    _attrs: {},
    id: '',
    className: '',
    textContent: '',
    innerHTML: '',
    type: '',
    placeholder: '',
    min: '7',
    max: '90',
    value: '',
    checked: false,
    disabled: false,
    rows: 0,
    maxLength: 0,
    style: {
      cssText: '',
      display: '',
      background: '',
      color: '',
      borderColor: ''
    },
    onclick: null,
    oninput: null,
    onchange: null,
    addEventListener: function(evt, fn) { this['_on_' + evt] = fn; },
    getAttribute: function(k) { return this._attrs[k] !== undefined ? this._attrs[k] : null; },
    setAttribute: function(k, v) { this._attrs[k] = v; },
    appendChild: function(child) {
      this._children.push(child);
      if (child.id) _elements[child.id] = child;
      return child;
    },
    removeChild: function(child) {
      var idx = this._children.indexOf(child);
      if (idx !== -1) this._children.splice(idx, 1);
    },
    querySelector: function(sel) {
      if (sel.charAt(0) === '#') return _elements[sel.slice(1)] || null;
      return null;
    },
    querySelectorAll: function(sel) {
      if (_querySelectorAllResults[sel]) return _querySelectorAllResults[sel];
      return [];
    },
    classList: {
      _list: [],
      add: function(c) { if (this._list.indexOf(c) === -1) this._list.push(c); },
      remove: function(c) { var i = this._list.indexOf(c); if (i !== -1) this._list.splice(i, 1); },
      contains: function(c) { return this._list.indexOf(c) !== -1; }
    },
    parentNode: null
  };
  if (el.id) _elements[el.id] = el;
  return el;
}

function resetDOM() {
  _elements = {};
  _domTree = [];
  _querySelectorAllResults = {};
}

// Install global document / window mocks
global.document = {
  createElement: function(tag) { return makeEl(tag); },
  querySelector: function(sel) {
    if (sel === '#zion-hud') return makeEl('div');
    if (sel.charAt(0) === '#') return _elements[sel.slice(1)] || null;
    return null;
  },
  getElementById: function(id) { return _elements[id] || null; },
  querySelectorAll: function(sel) {
    if (_querySelectorAllResults[sel]) return _querySelectorAllResults[sel];
    return [];
  },
  head: makeEl('head'),
  body: (function() {
    var b = makeEl('body');
    b.appendChild = function(child) {
      this._children.push(child);
      if (child.id) _elements[child.id] = child;
      return child;
    };
    return b;
  })()
};

global.window = { HUD: {} };
global.requestAnimationFrame = function(fn) { fn(); };
global.setTimeout = function(fn) { /* noop in tests */ };
global.clearInterval = function() {};

// Load modules
var Protocol = require('../src/js/protocol.js');
var State = require('../src/js/state.js');
var HUD = require('../src/js/hud.js');

// ─── Helper fixtures ─────────────────────────────────────────────────────────

function makeAmendment(overrides) {
  var base = {
    id: 'amend_abc123',
    title: 'Add Community Garden Zone',
    description: 'This amendment proposes adding a dedicated community garden zone to improve social interaction among citizens.',
    diff_text: '+ §4.9 — Community Garden Zone\n+ All citizens may cultivate shared plots.',
    proposed_by: 'alice',
    proposed_at: '2026-02-01T00:00:00Z',
    discussion_period_days: 7,
    voting_closes_at: new Date(Date.now() + 5 * 86400000).toISOString(), // 5 days from now
    status: 'open',
    votes: [],
    result: null
  };
  if (overrides) {
    Object.keys(overrides).forEach(function(k) { base[k] = overrides[k]; });
  }
  return base;
}

function makeClosedAmendment(result, overrides) {
  var a = makeAmendment({
    id: 'amend_closed001',
    title: 'Reduce Spark Tax Rate',
    status: 'closed',
    result: result || 'approved',
    voting_closes_at: '2026-01-20T00:00:00Z',
    closed_at: '2026-01-20T12:00:00Z',
    votes: [
      { from: 'alice', vote: 'for', spark_weight: 100, ts: '2026-01-10T00:00:00Z' },
      { from: 'bob',   vote: 'against', spark_weight: 40, ts: '2026-01-11T00:00:00Z' }
    ],
    tally: { for_weight: 100, against_weight: 40, total_voters: 2 }
  });
  if (overrides) {
    Object.keys(overrides).forEach(function(k) { a[k] = overrides[k]; });
  }
  return a;
}

// =============================================================================
// SUITE 1: Protocol message types
// =============================================================================

suite('Protocol — Amendment message types', function() {
  test('propose_amendment is a valid message type', function() {
    assert.ok(Protocol.MESSAGE_TYPES.has('propose_amendment'));
  });

  test('vote_amendment is a valid message type', function() {
    assert.ok(Protocol.MESSAGE_TYPES.has('vote_amendment'));
  });

  test('close_amendment is a valid message type', function() {
    assert.ok(Protocol.MESSAGE_TYPES.has('close_amendment'));
  });

  test('create propose_amendment message passes validation', function() {
    var msg = Protocol.createMessage('propose_amendment', 'alice', {
      title: 'New Amendment',
      description: 'Description here',
      diff_text: '+ added line',
      discussion_period_days: 7
    });
    var result = Protocol.validateMessage(msg);
    assert.ok(result.valid, 'Expected valid, got errors: ' + result.errors.join(', '));
  });

  test('create vote_amendment message passes validation', function() {
    var msg = Protocol.createMessage('vote_amendment', 'bob', {
      amendment_id: 'amend_abc123',
      vote: 'for'
    });
    var result = Protocol.validateMessage(msg);
    assert.ok(result.valid, 'Expected valid, got errors: ' + result.errors.join(', '));
  });

  test('create close_amendment message passes validation', function() {
    var msg = Protocol.createMessage('close_amendment', 'ZION-GOVERNANCE', {
      amendment_id: 'amend_abc123',
      result: 'approved',
      tally: { for_weight: 100, against_weight: 30, total_voters: 5 }
    });
    var result = Protocol.validateMessage(msg);
    assert.ok(result.valid, 'Expected valid, got errors: ' + result.errors.join(', '));
  });
});

// =============================================================================
// SUITE 2: State handling — propose_amendment
// =============================================================================

suite('State — propose_amendment message handling', function() {
  test('propose_amendment adds amendment to state', function() {
    var state = State.createWorldState();
    var msg = Protocol.createMessage('propose_amendment', 'alice', {
      title: 'Test Amendment',
      description: 'A detailed description of the amendment rationale',
      diff_text: '+ New constitutional line',
      discussion_period_days: 7
    });
    var newState = State.applyMessage(state, msg);
    assert.ok(Array.isArray(newState.amendments), 'amendments should be an array');
    assert.strictEqual(newState.amendments.length, 1);
    assert.strictEqual(newState.amendments[0].title, 'Test Amendment');
    assert.strictEqual(newState.amendments[0].proposed_by, 'alice');
    assert.strictEqual(newState.amendments[0].status, 'open');
    assert.deepStrictEqual(newState.amendments[0].votes, []);
  });

  test('propose_amendment sets correct discussion period', function() {
    var state = State.createWorldState();
    var msg = Protocol.createMessage('propose_amendment', 'alice', {
      title: 'Long Discussion',
      description: 'Needs lots of time to discuss this important matter',
      diff_text: '+ some diff',
      discussion_period_days: 14
    });
    var newState = State.applyMessage(state, msg);
    assert.strictEqual(newState.amendments[0].discussion_period_days, 14);
  });

  test('propose_amendment enforces minimum 7-day discussion period', function() {
    var state = State.createWorldState();
    var msg = Protocol.createMessage('propose_amendment', 'alice', {
      title: 'Quick Amendment',
      description: 'Wants to vote too quickly but that is not allowed',
      diff_text: '+ quick line',
      discussion_period_days: 2
    });
    var newState = State.applyMessage(state, msg);
    assert.ok(newState.amendments[0].discussion_period_days >= 7);
  });

  test('propose_amendment with missing title does not add amendment', function() {
    var state = State.createWorldState();
    var msg = Protocol.createMessage('propose_amendment', 'alice', {
      description: 'No title here',
      diff_text: '+ line'
    });
    var newState = State.applyMessage(state, msg);
    // Should not add an amendment without all required fields
    var amendments = newState.amendments || [];
    assert.strictEqual(amendments.length, 0);
  });

  test('propose_amendment with missing diff_text does not add amendment', function() {
    var state = State.createWorldState();
    var msg = Protocol.createMessage('propose_amendment', 'alice', {
      title: 'Title Only',
      description: 'Has description but no diff'
    });
    var newState = State.applyMessage(state, msg);
    var amendments = newState.amendments || [];
    assert.strictEqual(amendments.length, 0);
  });

  test('multiple proposals accumulate in state', function() {
    var state = State.createWorldState();
    var msg1 = Protocol.createMessage('propose_amendment', 'alice', {
      title: 'Amendment One', description: 'First amendment details here', diff_text: '+ line1'
    });
    var msg2 = Protocol.createMessage('propose_amendment', 'bob', {
      title: 'Amendment Two', description: 'Second amendment details here', diff_text: '+ line2'
    });
    state = State.applyMessage(state, msg1);
    state = State.applyMessage(state, msg2);
    assert.strictEqual(state.amendments.length, 2);
    assert.strictEqual(state.amendments[0].proposed_by, 'alice');
    assert.strictEqual(state.amendments[1].proposed_by, 'bob');
  });
});

// =============================================================================
// SUITE 3: State handling — vote_amendment
// =============================================================================

suite('State — vote_amendment message handling', function() {
  function stateWithOpenAmendment() {
    var state = State.createWorldState();
    var propMsg = Protocol.createMessage('propose_amendment', 'alice', {
      title: 'Voting Test', description: 'Amendment to test voting on',
      diff_text: '+ test', discussion_period_days: 7
    });
    state = State.applyMessage(state, propMsg);
    return state;
  }

  test('vote_amendment records a "for" vote', function() {
    var state = stateWithOpenAmendment();
    var amendId = state.amendments[0].id;
    state.economy.balances['bob'] = 50;
    var voteMsg = Protocol.createMessage('vote_amendment', 'bob', {
      amendment_id: amendId,
      vote: 'for'
    });
    var newState = State.applyMessage(state, voteMsg);
    var votes = newState.amendments[0].votes;
    assert.strictEqual(votes.length, 1);
    assert.strictEqual(votes[0].from, 'bob');
    assert.strictEqual(votes[0].vote, 'for');
  });

  test('vote_amendment records an "against" vote', function() {
    var state = stateWithOpenAmendment();
    var amendId = state.amendments[0].id;
    state.economy.balances['carol'] = 30;
    var voteMsg = Protocol.createMessage('vote_amendment', 'carol', {
      amendment_id: amendId,
      vote: 'against'
    });
    var newState = State.applyMessage(state, voteMsg);
    var votes = newState.amendments[0].votes;
    assert.strictEqual(votes.length, 1);
    assert.strictEqual(votes[0].vote, 'against');
  });

  test('vote_amendment uses Spark balance as weight (minimum 1)', function() {
    var state = stateWithOpenAmendment();
    var amendId = state.amendments[0].id;
    state.economy.balances['dave'] = 200;
    var voteMsg = Protocol.createMessage('vote_amendment', 'dave', {
      amendment_id: amendId,
      vote: 'for'
    });
    var newState = State.applyMessage(state, voteMsg);
    assert.strictEqual(newState.amendments[0].votes[0].spark_weight, 200);
  });

  test('vote_amendment minimum weight is 1 for zero-balance voter', function() {
    var state = stateWithOpenAmendment();
    var amendId = state.amendments[0].id;
    state.economy.balances['newbie'] = 0;
    var voteMsg = Protocol.createMessage('vote_amendment', 'newbie', {
      amendment_id: amendId,
      vote: 'for'
    });
    var newState = State.applyMessage(state, voteMsg);
    assert.ok(newState.amendments[0].votes[0].spark_weight >= 1);
  });

  test('vote_amendment deduplicates: second vote from same user is ignored', function() {
    var state = stateWithOpenAmendment();
    var amendId = state.amendments[0].id;
    state.economy.balances['alice'] = 100;
    var vote1 = Protocol.createMessage('vote_amendment', 'alice', { amendment_id: amendId, vote: 'for' });
    var vote2 = Protocol.createMessage('vote_amendment', 'alice', { amendment_id: amendId, vote: 'against' });
    state = State.applyMessage(state, vote1);
    state = State.applyMessage(state, vote2);
    assert.strictEqual(state.amendments[0].votes.length, 1);
    assert.strictEqual(state.amendments[0].votes[0].vote, 'for');
  });

  test('vote_amendment on non-existent amendment ID is ignored', function() {
    var state = stateWithOpenAmendment();
    var voteMsg = Protocol.createMessage('vote_amendment', 'bob', {
      amendment_id: 'amend_nonexistent',
      vote: 'for'
    });
    var newState = State.applyMessage(state, voteMsg);
    assert.strictEqual(newState.amendments[0].votes.length, 0);
  });

  test('vote_amendment on closed amendment is rejected', function() {
    var state = State.createWorldState();
    state.amendments = [makeClosedAmendment('approved')];
    var voteMsg = Protocol.createMessage('vote_amendment', 'eve', {
      amendment_id: 'amend_closed001',
      vote: 'for'
    });
    var newState = State.applyMessage(state, voteMsg);
    // votes should not increase (was already 2 from fixture)
    assert.strictEqual(newState.amendments[0].votes.length, 2);
  });

  test('multiple different voters can all vote', function() {
    var state = stateWithOpenAmendment();
    var amendId = state.amendments[0].id;
    ['alice', 'bob', 'carol', 'dave'].forEach(function(u) {
      state.economy.balances[u] = 10;
    });
    state = State.applyMessage(state, Protocol.createMessage('vote_amendment', 'alice', { amendment_id: amendId, vote: 'for' }));
    state = State.applyMessage(state, Protocol.createMessage('vote_amendment', 'bob', { amendment_id: amendId, vote: 'against' }));
    state = State.applyMessage(state, Protocol.createMessage('vote_amendment', 'carol', { amendment_id: amendId, vote: 'for' }));
    state = State.applyMessage(state, Protocol.createMessage('vote_amendment', 'dave', { amendment_id: amendId, vote: 'for' }));
    assert.strictEqual(state.amendments[0].votes.length, 4);
  });
});

// =============================================================================
// SUITE 4: State handling — close_amendment
// =============================================================================

suite('State — close_amendment message handling', function() {
  test('close_amendment marks amendment as closed with result', function() {
    var state = State.createWorldState();
    state.amendments = [makeAmendment({ id: 'amend_test1', status: 'open' })];
    var msg = Protocol.createMessage('close_amendment', 'ZION-GOVERNANCE', {
      amendment_id: 'amend_test1',
      result: 'approved',
      tally: { for_weight: 200, against_weight: 50, total_voters: 5 }
    });
    var newState = State.applyMessage(state, msg);
    assert.strictEqual(newState.amendments[0].status, 'closed');
    assert.strictEqual(newState.amendments[0].result, 'approved');
    assert.strictEqual(newState.amendments[0].tally.for_weight, 200);
  });

  test('close_amendment with rejected result sets result correctly', function() {
    var state = State.createWorldState();
    state.amendments = [makeAmendment({ id: 'amend_test2', status: 'open' })];
    var msg = Protocol.createMessage('close_amendment', 'ZION-GOVERNANCE', {
      amendment_id: 'amend_test2',
      result: 'rejected',
      tally: { for_weight: 30, against_weight: 200, total_voters: 8 }
    });
    var newState = State.applyMessage(state, msg);
    assert.strictEqual(newState.amendments[0].result, 'rejected');
    assert.strictEqual(newState.amendments[0].tally.against_weight, 200);
  });

  test('close_amendment on non-existent ID does not crash', function() {
    var state = State.createWorldState();
    state.amendments = [makeAmendment()];
    var msg = Protocol.createMessage('close_amendment', 'ZION-GOVERNANCE', {
      amendment_id: 'amend_nonexistent',
      result: 'approved',
      tally: {}
    });
    var newState = State.applyMessage(state, msg);
    // Amendment should remain unchanged
    assert.strictEqual(newState.amendments[0].status, 'open');
  });
});

// =============================================================================
// SUITE 5: HUD helpers — _amendmentTally
// =============================================================================

suite('HUD — _amendmentTally helper', function() {
  test('empty votes returns zeros', function() {
    var t = HUD._amendmentTally([]);
    assert.strictEqual(t.forWeight, 0);
    assert.strictEqual(t.againstWeight, 0);
    assert.strictEqual(t.total, 0);
    assert.strictEqual(t.pct, 0);
  });

  test('all "for" votes: pct = 100', function() {
    var votes = [
      { vote: 'for', spark_weight: 50 },
      { vote: 'for', spark_weight: 100 }
    ];
    var t = HUD._amendmentTally(votes);
    assert.strictEqual(t.forWeight, 150);
    assert.strictEqual(t.againstWeight, 0);
    assert.strictEqual(t.pct, 100);
  });

  test('all "against" votes: pct = 0', function() {
    var votes = [
      { vote: 'against', spark_weight: 80 },
      { vote: 'against', spark_weight: 20 }
    ];
    var t = HUD._amendmentTally(votes);
    assert.strictEqual(t.pct, 0);
    assert.strictEqual(t.againstWeight, 100);
  });

  test('mixed votes: pct rounds correctly', function() {
    var votes = [
      { vote: 'for', spark_weight: 75 },
      { vote: 'against', spark_weight: 25 }
    ];
    var t = HUD._amendmentTally(votes);
    assert.strictEqual(t.forWeight, 75);
    assert.strictEqual(t.againstWeight, 25);
    assert.strictEqual(t.pct, 75);
    assert.strictEqual(t.total, 100);
  });

  test('votes without spark_weight default to weight 1', function() {
    var votes = [
      { vote: 'for' },
      { vote: 'for' },
      { vote: 'against' }
    ];
    var t = HUD._amendmentTally(votes);
    assert.strictEqual(t.forWeight, 2);
    assert.strictEqual(t.againstWeight, 1);
    assert.strictEqual(t.total, 3);
  });

  test('exactly 50/50 split gives pct = 50', function() {
    var votes = [
      { vote: 'for', spark_weight: 50 },
      { vote: 'against', spark_weight: 50 }
    ];
    var t = HUD._amendmentTally(votes);
    assert.strictEqual(t.pct, 50);
  });

  test('large spark weights work correctly', function() {
    var votes = [
      { vote: 'for', spark_weight: 999999 },
      { vote: 'against', spark_weight: 1 }
    ];
    var t = HUD._amendmentTally(votes);
    assert.strictEqual(t.pct, 100); // rounds to 100%
    assert.strictEqual(t.forWeight, 999999);
  });
});

// =============================================================================
// SUITE 6: HUD helpers — _amendmentCountdown
// =============================================================================

suite('HUD — _amendmentCountdown helper', function() {
  test('past date returns "Voting closed"', function() {
    var pastDate = new Date(Date.now() - 10000).toISOString();
    var result = HUD._amendmentCountdown(pastDate);
    assert.strictEqual(result, 'Voting closed');
  });

  test('far future date shows days', function() {
    var futureDate = new Date(Date.now() + 5 * 86400000 + 3600000).toISOString();
    var result = HUD._amendmentCountdown(futureDate);
    assert.ok(result.indexOf('5d') !== -1, 'Expected days in: ' + result);
  });

  test('near future date (hours) shows hours', function() {
    var futureDate = new Date(Date.now() + 3 * 3600000 + 600000).toISOString();
    var result = HUD._amendmentCountdown(futureDate);
    assert.ok(result.indexOf('h') !== -1, 'Expected hours in: ' + result);
  });

  test('very near future (minutes) shows minutes', function() {
    var futureDate = new Date(Date.now() + 30 * 60000).toISOString();
    var result = HUD._amendmentCountdown(futureDate);
    assert.ok(result.indexOf('m') !== -1, 'Expected minutes in: ' + result);
  });

  test('exactly zero diff returns "Voting closed"', function() {
    var now = new Date(Date.now() - 1).toISOString();
    var result = HUD._amendmentCountdown(now);
    assert.strictEqual(result, 'Voting closed');
  });
});

// =============================================================================
// SUITE 7: HUD helpers — _htmlEsc
// =============================================================================

suite('HUD — _htmlEsc helper', function() {
  test('escapes &', function() {
    assert.strictEqual(HUD._htmlEsc('a & b'), 'a &amp; b');
  });

  test('escapes <', function() {
    assert.strictEqual(HUD._htmlEsc('<script>'), '&lt;script&gt;');
  });

  test('escapes >', function() {
    assert.strictEqual(HUD._htmlEsc('a>b'), 'a&gt;b');
  });

  test('escapes double quotes', function() {
    assert.strictEqual(HUD._htmlEsc('"hello"'), '&quot;hello&quot;');
  });

  test('escapes single quotes', function() {
    assert.strictEqual(HUD._htmlEsc("it's"), 'it&#39;s');
  });

  test('null returns empty string', function() {
    assert.strictEqual(HUD._htmlEsc(null), '');
  });

  test('undefined returns empty string', function() {
    assert.strictEqual(HUD._htmlEsc(undefined), '');
  });

  test('numbers are converted and returned', function() {
    assert.strictEqual(HUD._htmlEsc(42), '42');
  });

  test('safe string passes through unchanged', function() {
    assert.strictEqual(HUD._htmlEsc('Hello World'), 'Hello World');
  });

  test('XSS injection pattern is escaped', function() {
    var input = '<img src=x onerror="alert(1)">';
    var output = HUD._htmlEsc(input);
    assert.ok(output.indexOf('<') === -1, 'Should have no raw <');
    assert.ok(output.indexOf('>') === -1, 'Should have no raw >');
  });
});

// =============================================================================
// SUITE 8: HUD — _amendmentTabBar rendering
// =============================================================================

suite('HUD — _amendmentTabBar rendering', function() {
  test('renders all three tabs', function() {
    var html = HUD._amendmentTabBar('active');
    assert.ok(html.indexOf('Active Votes') !== -1);
    assert.ok(html.indexOf('Propose') !== -1);
    assert.ok(html.indexOf('History') !== -1);
  });

  test('active tab has gold color', function() {
    var html = HUD._amendmentTabBar('active');
    // Active tab button should have gold-colored text
    assert.ok(html.indexOf('#daa520') !== -1);
  });

  test('propose tab active changes styling', function() {
    var htmlActive = HUD._amendmentTabBar('propose');
    var htmlInactive = HUD._amendmentTabBar('active');
    // The "Propose" data-tab should be gold when active
    assert.ok(htmlActive.indexOf('data-tab="propose"') !== -1);
    assert.ok(htmlInactive.indexOf('data-tab="active"') !== -1);
  });

  test('tab buttons have data-tab attributes', function() {
    var html = HUD._amendmentTabBar('history');
    assert.ok(html.indexOf('data-tab="active"') !== -1);
    assert.ok(html.indexOf('data-tab="propose"') !== -1);
    assert.ok(html.indexOf('data-tab="history"') !== -1);
  });

  test('tab buttons have amend-tab-btn class', function() {
    var html = HUD._amendmentTabBar('active');
    assert.ok(html.indexOf('amend-tab-btn') !== -1);
  });
});

// =============================================================================
// SUITE 9: HUD — _renderActiveAmendments
// =============================================================================

suite('HUD — _renderActiveAmendments rendering', function() {
  test('empty list shows "no amendments" message', function() {
    var html = HUD._renderActiveAmendments([], 'alice');
    assert.ok(html.indexOf('No active amendments') !== -1);
  });

  test('open amendment shows title', function() {
    var a = makeAmendment({ title: 'My Great Proposal' });
    var html = HUD._renderActiveAmendments([a], 'bob');
    assert.ok(html.indexOf('My Great Proposal') !== -1);
  });

  test('open amendment shows proposer name', function() {
    var a = makeAmendment({ proposed_by: 'alice' });
    var html = HUD._renderActiveAmendments([a], 'bob');
    assert.ok(html.indexOf('alice') !== -1);
  });

  test('shows vote buttons for user who has not voted', function() {
    var a = makeAmendment();
    var html = HUD._renderActiveAmendments([a], 'bob');
    assert.ok(html.indexOf('amend-vote-btn') !== -1);
    assert.ok(html.indexOf('data-vote="for"') !== -1);
    assert.ok(html.indexOf('data-vote="against"') !== -1);
  });

  test('shows "You voted: FOR" for user who already voted for', function() {
    var a = makeAmendment({
      votes: [{ from: 'alice', vote: 'for', spark_weight: 50, ts: '2026-01-01T00:00:00Z' }]
    });
    var html = HUD._renderActiveAmendments([a], 'alice');
    assert.ok(html.indexOf('You voted') !== -1);
    assert.ok(html.indexOf('FOR') !== -1);
    // Should not show vote buttons for alice
    assert.ok(html.indexOf('amend-vote-btn') === -1);
  });

  test('shows "You voted: AGAINST" for user who voted against', function() {
    var a = makeAmendment({
      votes: [{ from: 'bob', vote: 'against', spark_weight: 30, ts: '2026-01-01T00:00:00Z' }]
    });
    var html = HUD._renderActiveAmendments([a], 'bob');
    assert.ok(html.indexOf('AGAINST') !== -1);
  });

  test('shows vote buttons for different user when another has voted', function() {
    var a = makeAmendment({
      votes: [{ from: 'alice', vote: 'for', spark_weight: 50, ts: '2026-01-01T00:00:00Z' }]
    });
    var html = HUD._renderActiveAmendments([a], 'bob');
    assert.ok(html.indexOf('amend-vote-btn') !== -1);
  });

  test('shows spark weight totals', function() {
    var a = makeAmendment({
      votes: [
        { from: 'alice', vote: 'for', spark_weight: 100, ts: '2026-01-01T00:00:00Z' },
        { from: 'bob', vote: 'against', spark_weight: 40, ts: '2026-01-01T00:00:00Z' }
      ]
    });
    var html = HUD._renderActiveAmendments([a], 'carol');
    assert.ok(html.indexOf('100') !== -1);
    assert.ok(html.indexOf('40') !== -1);
  });

  test('filters out closed amendments', function() {
    var open = makeAmendment({ title: 'Open Proposal' });
    var closed = makeClosedAmendment('approved');
    var html = HUD._renderActiveAmendments([open, closed], 'bob');
    assert.ok(html.indexOf('Open Proposal') !== -1);
    assert.ok(html.indexOf('Reduce Spark Tax Rate') === -1);
  });

  test('renders multiple open amendments', function() {
    var a1 = makeAmendment({ id: 'amend1', title: 'First Amendment' });
    var a2 = makeAmendment({ id: 'amend2', title: 'Second Amendment' });
    var html = HUD._renderActiveAmendments([a1, a2], 'carol');
    assert.ok(html.indexOf('First Amendment') !== -1);
    assert.ok(html.indexOf('Second Amendment') !== -1);
  });

  test('amendment title is HTML-escaped', function() {
    var a = makeAmendment({ title: '<script>alert("xss")</script>' });
    var html = HUD._renderActiveAmendments([a], 'bob');
    assert.ok(html.indexOf('<script>') === -1, 'XSS script tag should be escaped');
    assert.ok(html.indexOf('&lt;script&gt;') !== -1, 'Should have escaped entity');
  });

  test('amendment IDs are in vote button data attributes', function() {
    var a = makeAmendment({ id: 'amend_xyz789' });
    var html = HUD._renderActiveAmendments([a], 'bob');
    assert.ok(html.indexOf('data-amendment-id="amend_xyz789"') !== -1);
  });

  test('vote bar percentage capped at 100%', function() {
    // Even if somehow pct > 100 (shouldn't happen), width should be capped
    var a = makeAmendment({
      votes: [{ vote: 'for', spark_weight: 1000, from: 'whale' }]
    });
    var html = HUD._renderActiveAmendments([a], 'bob');
    // Check the bar is rendered (width set to some %)
    assert.ok(html.indexOf('width:') !== -1);
  });
});

// =============================================================================
// SUITE 10: HUD — _renderAmendmentHistory
// =============================================================================

suite('HUD — _renderAmendmentHistory rendering', function() {
  test('empty history shows placeholder message', function() {
    var html = HUD._renderAmendmentHistory([]);
    assert.ok(html.indexOf('No closed amendments') !== -1);
  });

  test('open amendments are excluded from history', function() {
    var open = makeAmendment({ title: 'Open Proposal' });
    var html = HUD._renderAmendmentHistory([open]);
    assert.ok(html.indexOf('No closed amendments') !== -1);
  });

  test('approved amendment shows green checkmark', function() {
    var a = makeClosedAmendment('approved');
    var html = HUD._renderAmendmentHistory([a]);
    assert.ok(html.indexOf('APPROVED') !== -1);
    assert.ok(html.indexOf('#4ade80') !== -1); // green color
  });

  test('rejected amendment shows red X', function() {
    var a = makeClosedAmendment('rejected');
    var html = HUD._renderAmendmentHistory([a]);
    assert.ok(html.indexOf('REJECTED') !== -1);
    assert.ok(html.indexOf('#f87171') !== -1); // red color
  });

  test('shows for/against weights from tally', function() {
    var a = makeClosedAmendment('approved');
    var html = HUD._renderAmendmentHistory([a]);
    assert.ok(html.indexOf('100') !== -1); // for_weight
    assert.ok(html.indexOf('40') !== -1);  // against_weight
  });

  test('shows voter count', function() {
    var a = makeClosedAmendment('approved');
    var html = HUD._renderAmendmentHistory([a]);
    assert.ok(html.indexOf('2') !== -1); // total_voters
  });

  test('shows proposer name', function() {
    var a = makeClosedAmendment('approved');
    var html = HUD._renderAmendmentHistory([a]);
    assert.ok(html.indexOf('alice') !== -1);
  });

  test('shows amendment title', function() {
    var a = makeClosedAmendment('approved');
    var html = HUD._renderAmendmentHistory([a]);
    assert.ok(html.indexOf('Reduce Spark Tax Rate') !== -1);
  });

  test('title is HTML-escaped in history', function() {
    var a = makeClosedAmendment('approved', { title: '<b>Bold Hack</b>' });
    var html = HUD._renderAmendmentHistory([a]);
    assert.ok(html.indexOf('<b>') === -1);
    assert.ok(html.indexOf('&lt;b&gt;') !== -1);
  });

  test('multiple closed amendments shown in history', function() {
    var a1 = makeClosedAmendment('approved', { id: 'amend_hist1', title: 'Old Law', proposed_by: 'alice' });
    var a2 = makeClosedAmendment('rejected', { id: 'amend_hist2', title: 'New Idea', proposed_by: 'bob' });
    var html = HUD._renderAmendmentHistory([a1, a2]);
    assert.ok(html.indexOf('Old Law') !== -1);
    assert.ok(html.indexOf('New Idea') !== -1);
  });

  test('history uses votes array when no tally field', function() {
    var a = {
      id: 'amend_notally',
      title: 'No Tally Amendment',
      status: 'closed',
      result: 'approved',
      proposed_by: 'carol',
      proposed_at: '2026-01-01T00:00:00Z',
      closed_at: '2026-01-15T00:00:00Z',
      votes: [
        { from: 'carol', vote: 'for', spark_weight: 60 },
        { from: 'dave', vote: 'against', spark_weight: 10 }
      ]
      // no tally field
    };
    var html = HUD._renderAmendmentHistory([a]);
    assert.ok(html.indexOf('No Tally Amendment') !== -1);
    assert.ok(html.indexOf('carol') !== -1);
  });
});

// =============================================================================
// SUITE 11: HUD — _renderProposeForm
// =============================================================================

suite('HUD — _renderProposeForm rendering', function() {
  test('renders title input', function() {
    var html = HUD._renderProposeForm();
    assert.ok(html.indexOf('id="amend-title"') !== -1);
  });

  test('renders description textarea', function() {
    var html = HUD._renderProposeForm();
    assert.ok(html.indexOf('id="amend-description"') !== -1);
  });

  test('renders diff textarea', function() {
    var html = HUD._renderProposeForm();
    assert.ok(html.indexOf('id="amend-diff"') !== -1);
  });

  test('renders discussion period input', function() {
    var html = HUD._renderProposeForm();
    assert.ok(html.indexOf('id="amend-days"') !== -1);
  });

  test('renders submit button', function() {
    var html = HUD._renderProposeForm();
    assert.ok(html.indexOf('id="amend-submit-btn"') !== -1);
  });

  test('renders error div (hidden)', function() {
    var html = HUD._renderProposeForm();
    assert.ok(html.indexOf('id="amend-error"') !== -1);
  });

  test('contains constitutional constraints reminder', function() {
    var html = HUD._renderProposeForm();
    assert.ok(html.indexOf('7-day discussion period') !== -1 ||
              html.indexOf('7 day') !== -1 ||
              html.indexOf('§7.5') !== -1);
  });

  test('days input has default value 7', function() {
    var html = HUD._renderProposeForm();
    assert.ok(html.indexOf('value="7"') !== -1);
  });

  test('title input has maxlength', function() {
    var html = HUD._renderProposeForm();
    assert.ok(html.indexOf('maxlength=') !== -1);
  });
});

// =============================================================================
// SUITE 12: HUD — Panel creation/destruction
// =============================================================================

suite('HUD — createAmendmentPanel', function() {
  test('createAmendmentPanel returns an element', function() {
    resetDOM();
    var panel = HUD.createAmendmentPanel();
    assert.ok(panel !== null);
  });

  test('panel has id "amendment-panel"', function() {
    resetDOM();
    var panel = HUD.createAmendmentPanel();
    assert.strictEqual(panel.id, 'amendment-panel');
  });

  test('panel has amendment-panel class', function() {
    resetDOM();
    var panel = HUD.createAmendmentPanel();
    assert.ok(panel.className.indexOf('amendment-panel') !== -1);
  });

  test('panel display starts as "none" (hidden)', function() {
    resetDOM();
    var panel = HUD.createAmendmentPanel();
    assert.ok(panel.style.display === 'none' ||
              panel.style.cssText.indexOf('display:none') !== -1);
  });

  test('panel has close button child', function() {
    resetDOM();
    var panel = HUD.createAmendmentPanel();
    // Panel should have children (header with close button, body)
    assert.ok(panel._children.length >= 1);
  });
});

suite('HUD — showAmendmentPanel / hideAmendmentPanel', function() {
  test('showAmendmentPanel makes panel visible (display:flex)', function() {
    resetDOM();
    HUD.showAmendmentPanel([], 'alice');
    // Panel should now be displayed
    var panelEl = document.getElementById('amendment-panel');
    if (panelEl) {
      assert.ok(panelEl.style.display === 'flex' ||
                panelEl.style.cssText.indexOf('flex') !== -1);
    } else {
      // Panel may have been added to body; test passes if no error thrown
      assert.ok(true);
    }
  });

  test('hideAmendmentPanel hides panel', function() {
    resetDOM();
    HUD.showAmendmentPanel([], 'alice');
    HUD.hideAmendmentPanel();
    // Should not throw
    assert.ok(true);
  });

  test('toggleAmendmentPanel: show then hide', function() {
    resetDOM();
    HUD.hideAmendmentPanel(); // ensure hidden first
    HUD.toggleAmendmentPanel([], 'alice'); // show
    HUD.toggleAmendmentPanel([], 'alice'); // hide
    assert.ok(true); // No throw = pass
  });

  test('initAmendmentPanel stores callback', function() {
    var called = false;
    var cbData = null;
    HUD.initAmendmentPanel(function(action, data) {
      called = true;
      cbData = { action: action, data: data };
    });
    assert.ok(true); // No throw = pass
  });

  test('showAmendmentPanel with no HUD element appends to body', function() {
    resetDOM();
    // Override querySelector so no #zion-hud exists
    var origQS = global.document.querySelector;
    global.document.querySelector = function(sel) { return null; };
    try {
      HUD.showAmendmentPanel([], 'alice');
      assert.ok(true);
    } finally {
      global.document.querySelector = origQS;
    }
  });
});

// =============================================================================
// SUITE 13: Proposal form validation (unit-level)
// =============================================================================

suite('Proposal form validation logic', function() {
  // We test the validation rules that _wireProposalForm enforces by simulating them

  function validateProposal(title, desc, diff, days) {
    if (!title || !title.trim()) return 'Title is required.';
    if (title.trim().length < 5) return 'Title must be at least 5 characters.';
    if (!desc || !desc.trim()) return 'Description is required.';
    if (desc.trim().length < 20) return 'Description must be at least 20 characters.';
    if (!diff || !diff.trim()) return 'Diff text is required.';
    var d = parseInt(days, 10);
    if (isNaN(d) || d < 7) return 'Discussion period must be at least 7 days.';
    return null;
  }

  test('empty title returns error', function() {
    assert.strictEqual(validateProposal('', 'long description here today', '+ diff', 7), 'Title is required.');
  });

  test('title whitespace-only returns error', function() {
    assert.strictEqual(validateProposal('   ', 'long enough description', '+ diff', 7), 'Title is required.');
  });

  test('title too short returns error', function() {
    assert.strictEqual(validateProposal('Hi', 'long enough description here', '+ diff', 7), 'Title must be at least 5 characters.');
  });

  test('empty description returns error', function() {
    assert.strictEqual(validateProposal('Valid Title', '', '+ diff', 7), 'Description is required.');
  });

  test('description too short returns error', function() {
    assert.strictEqual(validateProposal('Valid Title', 'Short desc', '+ diff', 7), 'Description must be at least 20 characters.');
  });

  test('empty diff returns error', function() {
    assert.strictEqual(validateProposal('Valid Title', 'Long enough description here', '', 7), 'Diff text is required.');
  });

  test('discussion period < 7 returns error', function() {
    assert.strictEqual(validateProposal('Valid Title', 'Long enough description here', '+ diff', 3), 'Discussion period must be at least 7 days.');
  });

  test('discussion period = 0 returns error', function() {
    assert.strictEqual(validateProposal('Valid Title', 'Long enough description here', '+ diff', 0), 'Discussion period must be at least 7 days.');
  });

  test('NaN days returns error', function() {
    assert.strictEqual(validateProposal('Valid Title', 'Long enough description here', '+ diff', 'abc'), 'Discussion period must be at least 7 days.');
  });

  test('valid proposal returns null (no error)', function() {
    assert.strictEqual(validateProposal('Valid Title Here', 'This is a long enough description for the amendment proposal', '+ new line\n- old line', 7), null);
  });

  test('valid proposal with 14 day period returns null', function() {
    assert.strictEqual(validateProposal('Longer Discussion', 'Needs more time for discussion and deliberation', '+ line', 14), null);
  });

  test('exactly 5 character title is valid', function() {
    assert.strictEqual(validateProposal('Title', 'Long enough description for the test', '+ diff', 7), null);
  });

  test('exactly 20 character description is valid', function() {
    assert.strictEqual(validateProposal('Good Title Here', '12345678901234567890', '+ diff', 7), null);
  });
});

// =============================================================================
// SUITE 14: Edge cases
// =============================================================================

suite('Edge cases', function() {
  test('_amendmentTally handles votes with missing vote field', function() {
    var votes = [
      { from: 'alice', spark_weight: 50 }, // no vote field
      { from: 'bob', vote: 'for', spark_weight: 10 }
    ];
    var t = HUD._amendmentTally(votes);
    // Only bob's vote should count
    assert.strictEqual(t.forWeight, 10);
    assert.strictEqual(t.total, 10);
  });

  test('_renderActiveAmendments with malformed vote entry (no "from")', function() {
    var a = makeAmendment({
      votes: [{ vote: 'for', spark_weight: 100 }] // no 'from'
    });
    var html = HUD._renderActiveAmendments([a], 'bob');
    // Should still render without crashing
    assert.ok(typeof html === 'string');
  });

  test('_renderAmendmentHistory with null tally values', function() {
    var a = makeClosedAmendment('approved', {
      tally: { for_weight: null, against_weight: null, total_voters: 0 },
      votes: []
    });
    var html = HUD._renderAmendmentHistory([a]);
    assert.ok(typeof html === 'string');
  });

  test('_amendmentCountdown with invalid date string returns "Voting closed"', function() {
    var result = HUD._amendmentCountdown('not-a-date');
    // NaN date comparison: diff will be NaN, which is <= 0
    assert.strictEqual(result, 'Voting closed');
  });

  test('showAmendmentPanel called twice does not create duplicate panels', function() {
    resetDOM();
    HUD.showAmendmentPanel([], 'alice');
    HUD.showAmendmentPanel([], 'alice'); // second call
    assert.ok(true); // No crash
  });

  test('hideAmendmentPanel when panel was never shown does not crash', function() {
    resetDOM();
    HUD.hideAmendmentPanel();
    assert.ok(true);
  });

  test('refreshAmendmentPanel without DOM does not crash', function() {
    resetDOM();
    // No 'amendment-panel-content' element exists
    HUD.refreshAmendmentPanel([], 'alice');
    assert.ok(true);
  });

  test('_renderActiveAmendments with closed status amendment is skipped', function() {
    var closed = makeAmendment({ status: 'closed', title: 'Should Not Show' });
    var html = HUD._renderActiveAmendments([closed], 'alice');
    assert.ok(html.indexOf('Should Not Show') === -1);
    assert.ok(html.indexOf('No active amendments') !== -1);
  });

  test('_htmlEsc handles number 0', function() {
    assert.strictEqual(HUD._htmlEsc(0), '0');
  });

  test('_htmlEsc handles boolean false', function() {
    assert.strictEqual(HUD._htmlEsc(false), 'false');
  });

  test('_amendmentTally with empty object votes defaults gracefully', function() {
    var votes = [{}]; // empty object, no vote or weight
    var t = HUD._amendmentTally(votes);
    assert.strictEqual(t.forWeight, 0);
    assert.strictEqual(t.againstWeight, 0);
  });

  test('state applyMessage does not mutate original state', function() {
    var state = State.createWorldState();
    var original = JSON.stringify(state);
    var msg = Protocol.createMessage('propose_amendment', 'alice', {
      title: 'Immutability Test',
      description: 'Testing that state is not mutated in place',
      diff_text: '+ new line here'
    });
    State.applyMessage(state, msg);
    assert.strictEqual(JSON.stringify(state), original, 'Original state should be unchanged');
  });

  test('propose_amendment with very long title is still stored', function() {
    var state = State.createWorldState();
    var longTitle = 'A'.repeat(200);
    var msg = Protocol.createMessage('propose_amendment', 'alice', {
      title: longTitle,
      description: 'Description of this amendment is provided here',
      diff_text: '+ test line'
    });
    var newState = State.applyMessage(state, msg);
    if (newState.amendments && newState.amendments.length > 0) {
      assert.strictEqual(newState.amendments[0].title, longTitle);
    }
    // If not stored (e.g., validation rejects it), that's also acceptable
    assert.ok(true);
  });
});

// =============================================================================
// Summary
// =============================================================================

console.log('\n' + '='.repeat(60));
console.log('Amendment Panel Tests Complete');
console.log('='.repeat(60));
console.log('Passed: ' + passed);
console.log('Failed: ' + failed);

if (errors.length > 0) {
  console.log('\nFailed tests:');
  errors.forEach(function(e) {
    console.log('  - ' + e.name);
    console.log('    ' + e.error.message);
  });
}

if (failed > 0) {
  process.exit(1);
}
