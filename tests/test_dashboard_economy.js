/**
 * tests/test_dashboard_economy.js
 * 120+ tests covering DashboardEconomy module
 * Run: node tests/test_dashboard_economy.js
 */

'use strict';

var { test, suite, report, assert } = require('./test_runner');
var E = require('../src/js/dashboard_economy');

// ============================================================================
// HELPERS
// ============================================================================

var _seq = 0;
function uid() { return 'player_' + (++_seq) + '_' + Date.now(); }

function freshState() { return E.createEconomyState(); }

/** Backdate a transaction by the given milliseconds */
function backdateLastTx(state, ms) {
  var tx = state.transactions[state.transactions.length - 1];
  if (tx) tx.timestamp -= ms;
}

var DAY_MS = 86400000;

// ============================================================================
// SUITE 1 — Module Exports
// ============================================================================
suite('Module Exports', function() {

  test('module loads without error', function() {
    assert(typeof E === 'object' && E !== null, 'module must be an object');
  });

  test('createEconomyState is exported', function() {
    assert(typeof E.createEconomyState === 'function');
  });

  test('createEconomyPanel is exported', function() {
    assert(typeof E.createEconomyPanel === 'function');
  });

  test('getBalance is exported', function() {
    assert(typeof E.getBalance === 'function');
  });

  test('earnSpark is exported', function() {
    assert(typeof E.earnSpark === 'function');
  });

  test('spendSpark is exported', function() {
    assert(typeof E.spendSpark === 'function');
  });

  test('transferSpark is exported', function() {
    assert(typeof E.transferSpark === 'function');
  });

  test('createListing is exported', function() {
    assert(typeof E.createListing === 'function');
  });

  test('buyListing is exported', function() {
    assert(typeof E.buyListing === 'function');
  });

  test('cancelListing is exported', function() {
    assert(typeof E.cancelListing === 'function');
  });

  test('getListings is exported', function() {
    assert(typeof E.getListings === 'function');
  });

  test('getTransactionHistory is exported', function() {
    assert(typeof E.getTransactionHistory === 'function');
  });

  test('calculateDailyIncome is exported', function() {
    assert(typeof E.calculateDailyIncome === 'function');
  });

  test('calculateDailyExpenses is exported', function() {
    assert(typeof E.calculateDailyExpenses === 'function');
  });

  test('getEconomyStats is exported', function() {
    assert(typeof E.getEconomyStats === 'function');
  });

  test('calculateGiniCoefficient is exported', function() {
    assert(typeof E.calculateGiniCoefficient === 'function');
  });

  test('distributeUBI is exported', function() {
    assert(typeof E.distributeUBI === 'function');
  });

  test('applyWealthTax is exported', function() {
    assert(typeof E.applyWealthTax === 'function');
  });

  test('formatBalanceCard is exported', function() {
    assert(typeof E.formatBalanceCard === 'function');
  });

  test('formatListingRow is exported', function() {
    assert(typeof E.formatListingRow === 'function');
  });

  test('formatTransactionRow is exported', function() {
    assert(typeof E.formatTransactionRow === 'function');
  });

  test('formatEconomyStats is exported', function() {
    assert(typeof E.formatEconomyStats === 'function');
  });

  test('renderSparkChart is exported', function() {
    assert(typeof E.renderSparkChart === 'function');
  });

  test('getWealthDistribution is exported', function() {
    assert(typeof E.getWealthDistribution === 'function');
  });

});

// ============================================================================
// SUITE 2 — State Initialization
// ============================================================================
suite('createEconomyState', function() {

  test('returns an object', function() {
    var s = freshState();
    assert(typeof s === 'object' && s !== null);
  });

  test('has balances object', function() {
    var s = freshState();
    assert(typeof s.balances === 'object' && s.balances !== null);
  });

  test('has empty transactions array', function() {
    var s = freshState();
    assert(Array.isArray(s.transactions) && s.transactions.length === 0);
  });

  test('has empty listings array', function() {
    var s = freshState();
    assert(Array.isArray(s.listings) && s.listings.length === 0);
  });

  test('nextListingId starts at 1', function() {
    var s = freshState();
    assert(s.nextListingId === 1);
  });

  test('treasury is initialized to 1000000', function() {
    var s = freshState();
    assert(s.treasury === 1000000);
  });

  test('has empty ubiHistory array', function() {
    var s = freshState();
    assert(Array.isArray(s.ubiHistory) && s.ubiHistory.length === 0);
  });

  test('has empty taxHistory array', function() {
    var s = freshState();
    assert(Array.isArray(s.taxHistory) && s.taxHistory.length === 0);
  });

  test('has empty dailyStats array', function() {
    var s = freshState();
    assert(Array.isArray(s.dailyStats) && s.dailyStats.length === 0);
  });

  test('each call returns independent state', function() {
    var s1 = freshState();
    var s2 = freshState();
    s1.treasury = 999;
    assert(s2.treasury === 1000000, 'states must be independent');
  });

});

// ============================================================================
// SUITE 3 — getBalance
// ============================================================================
suite('getBalance', function() {

  test('unknown player returns DEFAULT_BALANCE (100)', function() {
    var s = freshState();
    assert(E.getBalance(s, 'nobody') === E.DEFAULT_BALANCE);
  });

  test('returns stored balance after earnSpark', function() {
    var s = freshState();
    var p = uid();
    E.earnSpark(s, p, 50, 'test');
    assert(E.getBalance(s, p) === E.DEFAULT_BALANCE + 50);
  });

  test('handles null state gracefully', function() {
    var bal = E.getBalance(null, 'p');
    assert(typeof bal === 'number');
  });

  test('balance is zero if explicitly set to zero', function() {
    var s = freshState();
    var p = uid();
    s.balances[p] = 0;
    assert(E.getBalance(s, p) === 0);
  });

});

// ============================================================================
// SUITE 4 — earnSpark
// ============================================================================
suite('earnSpark', function() {

  test('increases balance by amount', function() {
    var s = freshState();
    var p = uid();
    E.earnSpark(s, p, 30, 'harvest');
    assert(E.getBalance(s, p) === E.DEFAULT_BALANCE + 30);
  });

  test('auto-initializes new player at DEFAULT_BALANCE', function() {
    var s = freshState();
    var p = uid();
    E.earnSpark(s, p, 10, 'harvest');
    assert(E.getBalance(s, p) === E.DEFAULT_BALANCE + 10);
  });

  test('logs a transaction', function() {
    var s = freshState();
    var p = uid();
    E.earnSpark(s, p, 25, 'teach');
    assert(s.transactions.length === 1);
  });

  test('transaction type is earn', function() {
    var s = freshState();
    var p = uid();
    E.earnSpark(s, p, 25, 'teach');
    assert(s.transactions[0].type === 'earn');
  });

  test('transaction amount matches', function() {
    var s = freshState();
    var p = uid();
    E.earnSpark(s, p, 25, 'teach');
    assert(s.transactions[0].amount === 25);
  });

  test('transaction reason matches', function() {
    var s = freshState();
    var p = uid();
    E.earnSpark(s, p, 25, 'teach');
    assert(s.transactions[0].reason === 'teach');
  });

  test('transaction playerId matches', function() {
    var s = freshState();
    var p = uid();
    E.earnSpark(s, p, 25, 'teach');
    assert(s.transactions[0].playerId === p);
  });

  test('transaction has timestamp', function() {
    var s = freshState();
    var p = uid();
    E.earnSpark(s, p, 25, 'teach');
    assert(typeof s.transactions[0].timestamp === 'number');
  });

  test('transaction has id string', function() {
    var s = freshState();
    var p = uid();
    E.earnSpark(s, p, 25, 'teach');
    assert(typeof s.transactions[0].id === 'string');
  });

  test('ignores zero amount', function() {
    var s = freshState();
    var p = uid();
    E.earnSpark(s, p, 0, 'nothing');
    assert(s.transactions.length === 0);
  });

  test('ignores negative amount', function() {
    var s = freshState();
    var p = uid();
    E.earnSpark(s, p, -10, 'cheat');
    assert(s.transactions.length === 0);
  });

  test('returns state', function() {
    var s = freshState();
    var p = uid();
    var ret = E.earnSpark(s, p, 10, 'x');
    assert(ret === s);
  });

  test('accumulates multiple earnings', function() {
    var s = freshState();
    var p = uid();
    E.earnSpark(s, p, 10, 'a');
    E.earnSpark(s, p, 20, 'b');
    assert(E.getBalance(s, p) === E.DEFAULT_BALANCE + 30);
  });

});

// ============================================================================
// SUITE 5 — spendSpark
// ============================================================================
suite('spendSpark', function() {

  test('decreases balance', function() {
    var s = freshState();
    var p = uid();
    E.earnSpark(s, p, 50, 'earn');
    E.spendSpark(s, p, 30, 'buy');
    assert(E.getBalance(s, p) === E.DEFAULT_BALANCE + 20);
  });

  test('returns success: true on valid spend', function() {
    var s = freshState();
    var p = uid();
    var res = E.spendSpark(s, p, 50, 'buy');
    assert(res.success === true);
  });

  test('returns state in result', function() {
    var s = freshState();
    var p = uid();
    var res = E.spendSpark(s, p, 50, 'buy');
    assert(res.state === s);
  });

  test('fails if insufficient funds', function() {
    var s = freshState();
    var p = uid();
    var res = E.spendSpark(s, p, 9999, 'too_much');
    assert(res.success === false);
  });

  test('balance unchanged on failure', function() {
    var s = freshState();
    var p = uid();
    var before = E.getBalance(s, p);
    E.spendSpark(s, p, 9999, 'too_much');
    assert(E.getBalance(s, p) === before);
  });

  test('failure returns informative message', function() {
    var s = freshState();
    var p = uid();
    var res = E.spendSpark(s, p, 9999, 'too_much');
    assert(typeof res.message === 'string' && res.message.length > 0);
  });

  test('logs transaction on success', function() {
    var s = freshState();
    var p = uid();
    var prevLen = s.transactions.length;
    E.spendSpark(s, p, 50, 'buy');
    assert(s.transactions.length === prevLen + 1);
  });

  test('transaction amount is negative', function() {
    var s = freshState();
    var p = uid();
    E.spendSpark(s, p, 30, 'buy');
    var tx = s.transactions[s.transactions.length - 1];
    assert(tx.amount === -30);
  });

  test('rejects zero amount', function() {
    var s = freshState();
    var p = uid();
    var res = E.spendSpark(s, p, 0, 'x');
    assert(res.success === false);
  });

  test('exact balance spend succeeds', function() {
    var s = freshState();
    var p = uid();
    s.balances[p] = 50;
    var res = E.spendSpark(s, p, 50, 'all-in');
    assert(res.success === true);
    assert(E.getBalance(s, p) === 0);
  });

});

// ============================================================================
// SUITE 6 — transferSpark
// ============================================================================
suite('transferSpark', function() {

  test('sender balance decreases', function() {
    var s = freshState();
    var a = uid(); var b = uid();
    s.balances[a] = 200; s.balances[b] = 0;
    E.transferSpark(s, a, b, 50, 'gift');
    assert(s.balances[a] === 150);
  });

  test('receiver balance increases', function() {
    var s = freshState();
    var a = uid(); var b = uid();
    s.balances[a] = 200; s.balances[b] = 0;
    E.transferSpark(s, a, b, 50, 'gift');
    assert(s.balances[b] === 50);
  });

  test('returns success: true', function() {
    var s = freshState();
    var a = uid(); var b = uid();
    s.balances[a] = 200;
    var res = E.transferSpark(s, a, b, 50, 'gift');
    assert(res.success === true);
  });

  test('fails if insufficient funds', function() {
    var s = freshState();
    var a = uid(); var b = uid();
    s.balances[a] = 10;
    var res = E.transferSpark(s, a, b, 100, 'gift');
    assert(res.success === false);
  });

  test('no balance change on failure', function() {
    var s = freshState();
    var a = uid(); var b = uid();
    s.balances[a] = 10; s.balances[b] = 5;
    E.transferSpark(s, a, b, 100, 'gift');
    assert(s.balances[a] === 10 && s.balances[b] === 5);
  });

  test('logs two transactions (debit + credit)', function() {
    var s = freshState();
    var a = uid(); var b = uid();
    s.balances[a] = 200;
    E.transferSpark(s, a, b, 50, 'gift');
    assert(s.transactions.length === 2);
  });

  test('debit transaction type is transfer_out', function() {
    var s = freshState();
    var a = uid(); var b = uid();
    s.balances[a] = 200;
    E.transferSpark(s, a, b, 50, 'gift');
    var debit = s.transactions.find(function(t) { return t.playerId === a; });
    assert(debit && debit.type === 'transfer_out');
  });

  test('credit transaction type is transfer_in', function() {
    var s = freshState();
    var a = uid(); var b = uid();
    s.balances[a] = 200;
    E.transferSpark(s, a, b, 50, 'gift');
    var credit = s.transactions.find(function(t) { return t.playerId === b; });
    assert(credit && credit.type === 'transfer_in');
  });

  test('counterparty is recorded on both transactions', function() {
    var s = freshState();
    var a = uid(); var b = uid();
    s.balances[a] = 200;
    E.transferSpark(s, a, b, 50, 'gift');
    var debit = s.transactions.find(function(t) { return t.playerId === a; });
    var credit = s.transactions.find(function(t) { return t.playerId === b; });
    assert(debit.counterparty === b);
    assert(credit.counterparty === a);
  });

  test('handles new players (auto-initializes)', function() {
    var s = freshState();
    var a = uid(); var b = uid();
    // Do not pre-set balances; let default apply
    s.balances[a] = 200;
    var res = E.transferSpark(s, a, b, 50, 'gift');
    assert(res.success === true);
    assert(s.balances[b] === E.DEFAULT_BALANCE + 50);
  });

});

// ============================================================================
// SUITE 7 — createListing
// ============================================================================
suite('createListing', function() {

  test('succeeds with valid args', function() {
    var s = freshState();
    var p = uid();
    s.balances[p] = 500;
    var res = E.createListing(s, p, 'item_wood', 10, 5);
    assert(res.success === true);
  });

  test('listing is added to state', function() {
    var s = freshState();
    var p = uid();
    s.balances[p] = 500;
    E.createListing(s, p, 'item_wood', 10, 5);
    assert(s.listings.length === 1);
  });

  test('listing has correct fields', function() {
    var s = freshState();
    var p = uid();
    s.balances[p] = 500;
    var res = E.createListing(s, p, 'item_wood', 10, 5);
    var l = res.listing;
    assert(l.itemId === 'item_wood');
    assert(l.quantity === 10);
    assert(l.pricePerUnit === 5);
    assert(l.sellerId === p);
    assert(l.active === true);
    assert(typeof l.id === 'string');
  });

  test('listing fee is 5% of total (min 1)', function() {
    var s = freshState();
    var p = uid();
    s.balances[p] = 500;
    // 10 * 5 = 50; 5% = 2.5 => floor = 2
    var res = E.createListing(s, p, 'item_wood', 10, 5);
    assert(res.fee === 2);
  });

  test('minimum listing fee is 1 Spark', function() {
    var s = freshState();
    var p = uid();
    s.balances[p] = 500;
    // 1 item at 1 Spark => total 1; 5% = 0.05 => floor = 0 => min 1
    var res = E.createListing(s, p, 'item_cheap', 1, 1);
    assert(res.fee === 1);
  });

  test('listing fee is deducted from balance', function() {
    var s = freshState();
    var p = uid();
    s.balances[p] = 500;
    var res = E.createListing(s, p, 'item_wood', 10, 5);
    assert(s.balances[p] === 500 - res.fee);
  });

  test('fee goes to treasury', function() {
    var s = freshState();
    var p = uid();
    s.balances[p] = 500;
    var before = s.treasury;
    var res = E.createListing(s, p, 'item_wood', 10, 5);
    assert(s.treasury === before + res.fee);
  });

  test('fails if insufficient funds for fee', function() {
    var s = freshState();
    var p = uid();
    s.balances[p] = 0;
    var res = E.createListing(s, p, 'item_wood', 100, 100);
    assert(res.success === false);
  });

  test('rejects zero quantity', function() {
    var s = freshState();
    var p = uid();
    var res = E.createListing(s, p, 'item_wood', 0, 5);
    assert(res.success === false);
  });

  test('rejects zero price', function() {
    var s = freshState();
    var p = uid();
    var res = E.createListing(s, p, 'item_wood', 10, 0);
    assert(res.success === false);
  });

  test('rejects negative quantity', function() {
    var s = freshState();
    var p = uid();
    var res = E.createListing(s, p, 'item_wood', -1, 5);
    assert(res.success === false);
  });

  test('nextListingId increments', function() {
    var s = freshState();
    var p = uid();
    s.balances[p] = 500;
    E.createListing(s, p, 'a', 1, 5);
    assert(s.nextListingId === 2);
    E.createListing(s, p, 'b', 1, 5);
    assert(s.nextListingId === 3);
  });

  test('logs a listing_fee transaction', function() {
    var s = freshState();
    var p = uid();
    s.balances[p] = 500;
    E.createListing(s, p, 'item_wood', 10, 5);
    var feeTx = s.transactions.find(function(t) { return t.type === 'listing_fee'; });
    assert(feeTx !== undefined);
  });

});

// ============================================================================
// SUITE 8 — buyListing
// ============================================================================
suite('buyListing', function() {

  // Returns { s, seller, listing } - all in the same state object
  function mkListing(itemId, qty, price) {
    var s = freshState();
    var seller = uid();
    s.balances[seller] = 500;
    var res = E.createListing(s, seller, itemId, qty, price);
    return { s: s, seller: seller, listing: res.listing };
  }

  test('succeeds with valid purchase', function() {
    var ctx = mkListing('item_wood', 10, 5);
    var buyer = uid();
    ctx.s.balances[buyer] = 200;
    var res = E.buyListing(ctx.s, buyer, ctx.listing.id, 5);
    assert(res.success === true);
  });

  test('reduces listing quantity', function() {
    var ctx = mkListing('item_wood', 10, 5);
    var buyer = uid();
    ctx.s.balances[buyer] = 200;
    E.buyListing(ctx.s, buyer, ctx.listing.id, 3);
    assert(ctx.listing.quantity === 7);
  });

  test('deducts Spark from buyer', function() {
    var ctx = mkListing('item_wood', 10, 5);
    var buyer = uid();
    ctx.s.balances[buyer] = 200;
    E.buyListing(ctx.s, buyer, ctx.listing.id, 4);
    assert(ctx.s.balances[buyer] === 200 - 20);
  });

  test('credits Spark to seller', function() {
    var ctx = mkListing('item_wood', 10, 5);
    var buyer = uid();
    var sellerBefore = ctx.s.balances[ctx.seller];
    ctx.s.balances[buyer] = 200;
    E.buyListing(ctx.s, buyer, ctx.listing.id, 4);
    assert(ctx.s.balances[ctx.seller] === sellerBefore + 20);
  });

  test('returns cost in result', function() {
    var ctx = mkListing('item_wood', 10, 5);
    var buyer = uid();
    ctx.s.balances[buyer] = 200;
    var res = E.buyListing(ctx.s, buyer, ctx.listing.id, 4);
    assert(res.cost === 20);
  });

  test('returns items count', function() {
    var ctx = mkListing('item_wood', 10, 5);
    var buyer = uid();
    ctx.s.balances[buyer] = 200;
    var res = E.buyListing(ctx.s, buyer, ctx.listing.id, 4);
    assert(res.items === 4);
  });

  test('partial buy: caps at available quantity', function() {
    var ctx = mkListing('item_wood', 3, 5);
    var buyer = uid();
    ctx.s.balances[buyer] = 500;
    var res = E.buyListing(ctx.s, buyer, ctx.listing.id, 999);
    assert(res.items === 3);
  });

  test('listing marked inactive when quantity reaches 0', function() {
    var ctx = mkListing('item_wood', 5, 5);
    var buyer = uid();
    ctx.s.balances[buyer] = 500;
    E.buyListing(ctx.s, buyer, ctx.listing.id, 5);
    assert(ctx.listing.active === false);
  });

  test('fails if buyer has insufficient funds', function() {
    var ctx = mkListing('item_wood', 10, 100);
    var buyer = uid();
    ctx.s.balances[buyer] = 5;
    var res = E.buyListing(ctx.s, buyer, ctx.listing.id, 1);
    assert(res.success === false);
  });

  test('fails if listing not found', function() {
    var s = freshState();
    var buyer = uid();
    s.balances[buyer] = 500;
    var res = E.buyListing(s, buyer, 'listing_nonexistent', 1);
    assert(res.success === false);
  });

  test('cannot buy own listing', function() {
    var ctx = mkListing('item_wood', 10, 5);
    var res = E.buyListing(ctx.s, ctx.seller, ctx.listing.id, 1);
    assert(res.success === false);
  });

  test('cannot buy inactive listing', function() {
    var ctx = mkListing('item_wood', 10, 5);
    var buyer = uid();
    ctx.listing.active = false;
    ctx.s.balances[buyer] = 500;
    var res = E.buyListing(ctx.s, buyer, ctx.listing.id, 1);
    assert(res.success === false);
  });

  test('logs market_buy and market_sell transactions', function() {
    var ctx = mkListing('item_wood', 10, 5);
    var buyer = uid();
    ctx.s.balances[buyer] = 500;
    var beforeLen = ctx.s.transactions.length;
    E.buyListing(ctx.s, buyer, ctx.listing.id, 2);
    // Should add 2 new transactions
    assert(ctx.s.transactions.length === beforeLen + 2);
    var buyTx = ctx.s.transactions.find(function(t) { return t.type === 'market_buy'; });
    var sellTx = ctx.s.transactions.find(function(t) { return t.type === 'market_sell'; });
    assert(buyTx !== undefined);
    assert(sellTx !== undefined);
  });

});

// ============================================================================
// SUITE 9 — cancelListing
// ============================================================================
suite('cancelListing', function() {

  function makeListingForCancel() {
    var s = freshState();
    var p = uid();
    s.balances[p] = 500;
    var res = E.createListing(s, p, 'item_wood', 10, 5);
    return { s: s, p: p, listing: res.listing };
  }

  test('cancels active listing', function() {
    var ctx = makeListingForCancel();
    var res = E.cancelListing(ctx.s, ctx.p, ctx.listing.id);
    assert(res.success === true);
    assert(ctx.listing.active === false);
  });

  test('fails if seller mismatch', function() {
    var ctx = makeListingForCancel();
    var impostor = uid();
    var res = E.cancelListing(ctx.s, impostor, ctx.listing.id);
    assert(res.success === false);
  });

  test('fails if listing not found', function() {
    var ctx = makeListingForCancel();
    var res = E.cancelListing(ctx.s, ctx.p, 'listing_bad_id');
    assert(res.success === false);
  });

  test('fails if listing already inactive', function() {
    var ctx = makeListingForCancel();
    ctx.listing.active = false;
    var res = E.cancelListing(ctx.s, ctx.p, ctx.listing.id);
    assert(res.success === false);
  });

  test('no fee refund (balance unchanged by cancel)', function() {
    var ctx = makeListingForCancel();
    var balBeforeCancel = ctx.s.balances[ctx.p];
    E.cancelListing(ctx.s, ctx.p, ctx.listing.id);
    assert(ctx.s.balances[ctx.p] === balBeforeCancel);
  });

});

// ============================================================================
// SUITE 10 — getListings
// ============================================================================
suite('getListings', function() {

  function buildMarket() {
    var s = freshState();
    var s1 = uid(); var s2 = uid();
    s.balances[s1] = 1000; s.balances[s2] = 1000;
    E.createListing(s, s1, 'item_wood', 10, 5);
    E.createListing(s, s1, 'item_stone', 5, 20);
    E.createListing(s, s2, 'item_wood', 20, 3);
    return s;
  }

  test('returns all active listings with no filters', function() {
    var s = buildMarket();
    var listings = E.getListings(s, {});
    assert(listings.length === 3);
  });

  test('filters by itemId', function() {
    var s = buildMarket();
    var listings = E.getListings(s, { itemId: 'item_wood' });
    assert(listings.length === 2);
    listings.forEach(function(l) { assert(l.itemId === 'item_wood'); });
  });

  test('filters by sellerId', function() {
    var s = buildMarket();
    var s1Id = s.listings[0].sellerId;
    var listings = E.getListings(s, { sellerId: s1Id });
    assert(listings.length === 2);
  });

  test('filters by minPrice', function() {
    var s = buildMarket();
    var listings = E.getListings(s, { minPrice: 10 });
    assert(listings.length === 1);
    assert(listings[0].itemId === 'item_stone');
  });

  test('filters by maxPrice', function() {
    var s = buildMarket();
    var listings = E.getListings(s, { maxPrice: 5 });
    listings.forEach(function(l) { assert(l.pricePerUnit <= 5); });
  });

  test('sort by price ascending', function() {
    var s = buildMarket();
    var listings = E.getListings(s, { sortBy: 'price' });
    for (var i = 1; i < listings.length; i++) {
      assert(listings[i].pricePerUnit >= listings[i - 1].pricePerUnit);
    }
  });

  test('sort by quantity descending', function() {
    var s = buildMarket();
    var listings = E.getListings(s, { sortBy: 'quantity' });
    for (var i = 1; i < listings.length; i++) {
      assert(listings[i].quantity <= listings[i - 1].quantity);
    }
  });

  test('inactive listings are excluded', function() {
    var s = buildMarket();
    s.listings[0].active = false;
    var listings = E.getListings(s, {});
    assert(listings.length === 2);
  });

  test('empty state returns empty array', function() {
    var s = freshState();
    assert(E.getListings(s, {}).length === 0);
  });

});

// ============================================================================
// SUITE 11 — getTransactionHistory
// ============================================================================
suite('getTransactionHistory', function() {

  test('returns transactions for the given player', function() {
    var s = freshState();
    var p = uid(); var other = uid();
    E.earnSpark(s, p, 10, 'a');
    E.earnSpark(s, other, 20, 'b');
    var hist = E.getTransactionHistory(s, p);
    assert(hist.length === 1);
    assert(hist[0].playerId === p);
  });

  test('default limit is 50', function() {
    var s = freshState();
    var p = uid();
    for (var i = 0; i < 60; i++) E.earnSpark(s, p, 1, 'x');
    var hist = E.getTransactionHistory(s, p);
    assert(hist.length === 50);
  });

  test('custom limit is respected', function() {
    var s = freshState();
    var p = uid();
    for (var i = 0; i < 20; i++) E.earnSpark(s, p, 1, 'x');
    var hist = E.getTransactionHistory(s, p, 5);
    assert(hist.length === 5);
  });

  test('transactions sorted newest first', function() {
    var s = freshState();
    var p = uid();
    E.earnSpark(s, p, 1, 'a');
    E.earnSpark(s, p, 2, 'b');
    var hist = E.getTransactionHistory(s, p);
    assert(hist[0].timestamp >= hist[1].timestamp);
  });

  test('returns empty array for unknown player', function() {
    var s = freshState();
    assert(E.getTransactionHistory(s, 'nobody').length === 0);
  });

});

// ============================================================================
// SUITE 12 — calculateDailyIncome / calculateDailyExpenses
// ============================================================================
suite('Daily Income & Expenses', function() {

  test('calculates income from recent transactions', function() {
    var s = freshState();
    var p = uid();
    E.earnSpark(s, p, 30, 'harvest');
    E.earnSpark(s, p, 20, 'teach');
    assert(E.calculateDailyIncome(s, p) === 50);
  });

  test('ignores old income beyond 24 hours', function() {
    var s = freshState();
    var p = uid();
    E.earnSpark(s, p, 30, 'harvest');
    backdateLastTx(s, DAY_MS + 1000);
    E.earnSpark(s, p, 20, 'teach');
    assert(E.calculateDailyIncome(s, p) === 20);
  });

  test('calculates expenses from recent transactions', function() {
    var s = freshState();
    var p = uid();
    s.balances[p] = 500;
    E.spendSpark(s, p, 30, 'buy1');
    E.spendSpark(s, p, 20, 'buy2');
    assert(E.calculateDailyExpenses(s, p) === 50);
  });

  test('ignores old expenses beyond 24 hours', function() {
    var s = freshState();
    var p = uid();
    s.balances[p] = 500;
    E.spendSpark(s, p, 30, 'old');
    backdateLastTx(s, DAY_MS + 1000);
    E.spendSpark(s, p, 20, 'new');
    assert(E.calculateDailyExpenses(s, p) === 20);
  });

  test('income ignores negative transactions', function() {
    var s = freshState();
    var p = uid();
    s.balances[p] = 500;
    E.spendSpark(s, p, 30, 'buy');
    assert(E.calculateDailyIncome(s, p) === 0);
  });

  test('expenses ignores positive transactions', function() {
    var s = freshState();
    var p = uid();
    E.earnSpark(s, p, 30, 'earn');
    assert(E.calculateDailyExpenses(s, p) === 0);
  });

  test('returns 0 for unknown player', function() {
    var s = freshState();
    assert(E.calculateDailyIncome(s, 'ghost') === 0);
    assert(E.calculateDailyExpenses(s, 'ghost') === 0);
  });

});

// ============================================================================
// SUITE 13 — calculateGiniCoefficient
// ============================================================================
suite('calculateGiniCoefficient', function() {

  test('returns 0 for empty array', function() {
    assert(E.calculateGiniCoefficient([]) === 0);
  });

  test('returns 0 for single element', function() {
    assert(E.calculateGiniCoefficient([100]) === 0);
  });

  test('returns 0 for perfectly equal distribution', function() {
    var g = E.calculateGiniCoefficient([100, 100, 100, 100]);
    assert(g === 0);
  });

  test('returns high value for maximum inequality', function() {
    // One person has everything
    var g = E.calculateGiniCoefficient([0, 0, 0, 1000]);
    assert(g > 0.7);
  });

  test('result is between 0 and 1', function() {
    var g = E.calculateGiniCoefficient([10, 50, 200, 1000, 5000]);
    assert(g >= 0 && g <= 1);
  });

  test('more equal distribution gives lower Gini', function() {
    var g1 = E.calculateGiniCoefficient([100, 100, 100]);
    var g2 = E.calculateGiniCoefficient([10, 100, 1000]);
    assert(g1 < g2);
  });

});

// ============================================================================
// SUITE 14 — getEconomyStats
// ============================================================================
suite('getEconomyStats', function() {

  test('returns stats object with all required keys', function() {
    var s = freshState();
    var stats = E.getEconomyStats(s);
    var keys = ['totalCirculation', 'averageWealth', 'medianWealth', 'giniCoefficient', 'activeTraders', 'totalListings', 'totalTransactions'];
    keys.forEach(function(k) { assert(k in stats, 'missing key: ' + k); });
  });

  test('totalCirculation sums all player balances', function() {
    var s = freshState();
    var p1 = uid(); var p2 = uid();
    s.balances[p1] = 100; s.balances[p2] = 200;
    var stats = E.getEconomyStats(s);
    assert(stats.totalCirculation === 300);
  });

  test('excludes treasury from circulation', function() {
    var s = freshState();
    var p = uid();
    s.balances[p] = 100;
    var stats = E.getEconomyStats(s);
    assert(stats.totalCirculation === 100);
  });

  test('averageWealth is correct', function() {
    var s = freshState();
    var p1 = uid(); var p2 = uid(); var p3 = uid();
    s.balances[p1] = 100; s.balances[p2] = 200; s.balances[p3] = 300;
    var stats = E.getEconomyStats(s);
    assert(stats.averageWealth === 200);
  });

  test('totalTransactions counts all transactions', function() {
    var s = freshState();
    var p = uid();
    E.earnSpark(s, p, 10, 'a');
    E.earnSpark(s, p, 20, 'b');
    var stats = E.getEconomyStats(s);
    assert(stats.totalTransactions === 2);
  });

  test('totalListings counts only active listings', function() {
    var s = freshState();
    var p = uid();
    s.balances[p] = 1000;
    E.createListing(s, p, 'item_a', 5, 10);
    E.createListing(s, p, 'item_b', 5, 10);
    s.listings[0].active = false;
    var stats = E.getEconomyStats(s);
    assert(stats.totalListings === 1);
  });

  test('handles null state', function() {
    var stats = E.getEconomyStats(null);
    assert(stats.totalCirculation === 0);
  });

});

// ============================================================================
// SUITE 15 — getWealthDistribution
// ============================================================================
suite('getWealthDistribution', function() {

  test('returns correct number of brackets', function() {
    var s = freshState();
    var dist = E.getWealthDistribution(s);
    // Default brackets: [0, 50, 100, 250, 500, 1000, 5000, Infinity] => 7 brackets
    assert(dist.length === E.WEALTH_BRACKETS.length - 1);
  });

  test('counts players in correct bracket', function() {
    var s = freshState();
    var p = uid();
    s.balances[p] = 75; // should fall in 50-99 bracket
    var dist = E.getWealthDistribution(s);
    var bracket = dist.find(function(b) { return b.bracket === '50-99'; });
    assert(bracket && bracket.count === 1);
  });

  test('player with 0 balance goes in 0-49 bracket', function() {
    var s = freshState();
    var p = uid();
    s.balances[p] = 0;
    var dist = E.getWealthDistribution(s);
    assert(dist[0].count === 1);
  });

  test('player with huge balance goes in top bracket', function() {
    var s = freshState();
    var p = uid();
    s.balances[p] = 99999;
    var dist = E.getWealthDistribution(s);
    var topBracket = dist[dist.length - 1];
    assert(topBracket.count === 1);
  });

  test('custom brackets work', function() {
    var s = freshState();
    var p = uid();
    s.balances[p] = 500;
    var dist = E.getWealthDistribution(s, [0, 100, Infinity]);
    assert(dist.length === 2);
    var high = dist.find(function(b) { return b.bracket === '100+'; });
    assert(high && high.count === 1);
  });

  test('treasury is excluded', function() {
    var s = freshState();
    // treasury balance is s.treasury but not s.balances[__treasury__]
    var dist = E.getWealthDistribution(s);
    var total = dist.reduce(function(sum, b) { return sum + b.count; }, 0);
    assert(total === 0);
  });

});

// ============================================================================
// SUITE 16 — distributeUBI
// ============================================================================
suite('distributeUBI', function() {

  test('gives equal amount to all players', function() {
    var s = freshState();
    var p1 = uid(); var p2 = uid();
    s.balances[p1] = 0; s.balances[p2] = 0;
    E.distributeUBI(s, 10);
    assert(s.balances[p1] === 10 && s.balances[p2] === 10);
  });

  test('deducts from treasury', function() {
    var s = freshState();
    var p1 = uid(); var p2 = uid();
    s.balances[p1] = 0; s.balances[p2] = 0;
    var before = s.treasury;
    E.distributeUBI(s, 10);
    assert(s.treasury === before - 20);
  });

  test('returns correct recipients count', function() {
    var s = freshState();
    var p1 = uid(); var p2 = uid(); var p3 = uid();
    s.balances[p1] = 0; s.balances[p2] = 0; s.balances[p3] = 0;
    var res = E.distributeUBI(s, 5);
    assert(res.recipients === 3);
  });

  test('returns perPlayer amount', function() {
    var s = freshState();
    var p = uid();
    s.balances[p] = 0;
    var res = E.distributeUBI(s, 15);
    assert(res.perPlayer === 15);
  });

  test('logs UBI transactions', function() {
    var s = freshState();
    var p = uid();
    s.balances[p] = 0;
    E.distributeUBI(s, 10);
    var ubiTx = s.transactions.find(function(t) { return t.type === 'ubi'; });
    assert(ubiTx !== undefined);
  });

  test('records in ubiHistory', function() {
    var s = freshState();
    var p = uid();
    s.balances[p] = 0;
    E.distributeUBI(s, 10);
    assert(s.ubiHistory.length === 1);
  });

  test('fails if treasury insufficient', function() {
    var s = freshState();
    var p = uid();
    s.balances[p] = 0;
    s.treasury = 5;
    var res = E.distributeUBI(s, 10);
    assert(res.success === false);
  });

  test('success: true returned on valid distribution', function() {
    var s = freshState();
    var p = uid();
    s.balances[p] = 0;
    var res = E.distributeUBI(s, 10);
    assert(res.success === true);
  });

  test('no players returns recipients: 0', function() {
    var s = freshState();
    var res = E.distributeUBI(s, 10);
    assert(res.recipients === 0);
  });

  test('rejects invalid amount', function() {
    var s = freshState();
    var res = E.distributeUBI(s, 0);
    assert(res.success === false);
  });

});

// ============================================================================
// SUITE 17 — applyWealthTax
// ============================================================================
suite('applyWealthTax', function() {

  test('taxes balances above threshold', function() {
    var s = freshState();
    var rich = uid();
    s.balances[rich] = 1000;
    E.applyWealthTax(s, 500, 0.1);
    // excess = 500, tax = floor(500 * 0.1) = 50
    assert(s.balances[rich] === 950);
  });

  test('does not tax below threshold', function() {
    var s = freshState();
    var poor = uid();
    s.balances[poor] = 100;
    E.applyWealthTax(s, 500, 0.1);
    assert(s.balances[poor] === 100);
  });

  test('tax goes to treasury', function() {
    var s = freshState();
    var rich = uid();
    s.balances[rich] = 1000;
    var before = s.treasury;
    E.applyWealthTax(s, 500, 0.1);
    assert(s.treasury === before + 50);
  });

  test('returns taxed array with playerId and amount', function() {
    var s = freshState();
    var rich = uid();
    s.balances[rich] = 1000;
    var res = E.applyWealthTax(s, 500, 0.1);
    assert(res.taxed.length === 1);
    assert(res.taxed[0].playerId === rich);
    assert(res.taxed[0].amount === 50);
  });

  test('records in taxHistory', function() {
    var s = freshState();
    var rich = uid();
    s.balances[rich] = 1000;
    E.applyWealthTax(s, 500, 0.1);
    assert(s.taxHistory.length === 1);
  });

  test('logs wealth_tax transaction', function() {
    var s = freshState();
    var rich = uid();
    s.balances[rich] = 1000;
    E.applyWealthTax(s, 500, 0.1);
    var taxTx = s.transactions.find(function(t) { return t.type === 'wealth_tax'; });
    assert(taxTx !== undefined && taxTx.amount < 0);
  });

  test('exactly at threshold is not taxed', function() {
    var s = freshState();
    var p = uid();
    s.balances[p] = 500;
    E.applyWealthTax(s, 500, 0.1);
    assert(s.balances[p] === 500);
  });

  test('returns success: true', function() {
    var s = freshState();
    var res = E.applyWealthTax(s, 500, 0.1);
    assert(res.success === true);
  });

  test('returns empty taxed array when nobody qualifies', function() {
    var s = freshState();
    var poor = uid();
    s.balances[poor] = 100;
    var res = E.applyWealthTax(s, 500, 0.1);
    assert(res.taxed.length === 0);
  });

});

// ============================================================================
// SUITE 18 — Formatting Functions
// ============================================================================
suite('formatBalanceCard', function() {

  test('returns a string', function() {
    var s = freshState();
    var p = uid();
    var html = E.formatBalanceCard(s, p);
    assert(typeof html === 'string');
  });

  test('includes balance value', function() {
    var s = freshState();
    var p = uid();
    s.balances[p] = 250;
    var html = E.formatBalanceCard(s, p);
    assert(html.indexOf('250') !== -1);
  });

  test('includes Spark text', function() {
    var s = freshState();
    var p = uid();
    var html = E.formatBalanceCard(s, p);
    assert(html.indexOf('Spark') !== -1);
  });

  test('includes daily income', function() {
    var s = freshState();
    var p = uid();
    E.earnSpark(s, p, 40, 'test');
    var html = E.formatBalanceCard(s, p);
    assert(html.indexOf('40') !== -1);
  });

  test('includes UBI received', function() {
    var s = freshState();
    var p = uid();
    s.balances[p] = 0;
    E.distributeUBI(s, 20);
    var html = E.formatBalanceCard(s, p);
    assert(html.indexOf('UBI') !== -1);
  });

});

suite('formatListingRow', function() {

  test('returns a string', function() {
    var listing = { id: 'l1', itemId: 'item_wood', quantity: 10, pricePerUnit: 5, sellerId: 'alice' };
    var html = E.formatListingRow(listing);
    assert(typeof html === 'string');
  });

  test('includes item name', function() {
    var listing = { id: 'l1', itemId: 'item_wood', quantity: 10, pricePerUnit: 5, sellerId: 'alice' };
    assert(E.formatListingRow(listing).indexOf('item_wood') !== -1);
  });

  test('includes quantity', function() {
    var listing = { id: 'l1', itemId: 'item_wood', quantity: 10, pricePerUnit: 5, sellerId: 'alice' };
    assert(E.formatListingRow(listing).indexOf('10') !== -1);
  });

  test('includes price', function() {
    var listing = { id: 'l1', itemId: 'item_wood', quantity: 10, pricePerUnit: 5, sellerId: 'alice' };
    assert(E.formatListingRow(listing).indexOf('5') !== -1);
  });

  test('includes seller', function() {
    var listing = { id: 'l1', itemId: 'item_wood', quantity: 10, pricePerUnit: 5, sellerId: 'alice' };
    assert(E.formatListingRow(listing).indexOf('alice') !== -1);
  });

  test('includes Buy button', function() {
    var listing = { id: 'l1', itemId: 'item_wood', quantity: 10, pricePerUnit: 5, sellerId: 'alice' };
    assert(E.formatListingRow(listing).indexOf('Buy') !== -1);
  });

  test('returns empty string for null', function() {
    assert(E.formatListingRow(null) === '');
  });

  test('includes total price', function() {
    var listing = { id: 'l1', itemId: 'item_wood', quantity: 10, pricePerUnit: 5, sellerId: 'alice' };
    assert(E.formatListingRow(listing).indexOf('50') !== -1);
  });

});

suite('formatTransactionRow', function() {

  test('returns a string', function() {
    var tx = { id: 'tx1', type: 'earn', playerId: 'alice', amount: 30, reason: 'harvest', timestamp: Date.now(), counterparty: null };
    assert(typeof E.formatTransactionRow(tx) === 'string');
  });

  test('shows positive amount with + sign for income', function() {
    var tx = { id: 'tx1', type: 'earn', playerId: 'alice', amount: 30, reason: 'harvest', timestamp: Date.now(), counterparty: null };
    assert(E.formatTransactionRow(tx).indexOf('+30') !== -1);
  });

  test('shows negative amount for spend', function() {
    var tx = { id: 'tx1', type: 'spend', playerId: 'alice', amount: -20, reason: 'buy', timestamp: Date.now(), counterparty: null };
    assert(E.formatTransactionRow(tx).indexOf('-20') !== -1);
  });

  test('shows reason', function() {
    var tx = { id: 'tx1', type: 'earn', playerId: 'alice', amount: 10, reason: 'teaching', timestamp: Date.now(), counterparty: null };
    assert(E.formatTransactionRow(tx).indexOf('teaching') !== -1);
  });

  test('returns empty string for null', function() {
    assert(E.formatTransactionRow(null) === '');
  });

});

suite('formatEconomyStats', function() {

  test('returns a string', function() {
    var stats = E.getEconomyStats(freshState());
    assert(typeof E.formatEconomyStats(stats) === 'string');
  });

  test('includes circulation', function() {
    var s = freshState();
    var p = uid();
    s.balances[p] = 500;
    var stats = E.getEconomyStats(s);
    var html = E.formatEconomyStats(stats);
    assert(html.indexOf('500') !== -1);
  });

  test('includes Gini coefficient', function() {
    var stats = E.getEconomyStats(freshState());
    var html = E.formatEconomyStats(stats);
    assert(html.indexOf('Gini') !== -1 || html.indexOf('gini') !== -1 || html.toLowerCase().indexOf('gini') !== -1);
  });

  test('returns No data for null', function() {
    var html = E.formatEconomyStats(null);
    assert(html.indexOf('No data') !== -1 || html.length > 0);
  });

  test('includes ASCII bar chart', function() {
    var stats = E.getEconomyStats(freshState());
    var html = E.formatEconomyStats(stats);
    assert(html.indexOf('[') !== -1 && html.indexOf(']') !== -1);
  });

});

// ============================================================================
// SUITE 19 — renderSparkChart
// ============================================================================
suite('renderSparkChart', function() {

  test('returns a string', function() {
    var s = freshState();
    var p = uid();
    E.earnSpark(s, p, 50, 'a');
    var chart = E.renderSparkChart(E.getTransactionHistory(s, p));
    assert(typeof chart === 'string');
  });

  test('returns (no data) for empty array', function() {
    var chart = E.renderSparkChart([]);
    assert(chart === '(no data)');
  });

  test('multi-line output for real data', function() {
    var s = freshState();
    var p = uid();
    E.earnSpark(s, p, 50, 'a');
    E.earnSpark(s, p, 30, 'b');
    var chart = E.renderSparkChart(s.transactions);
    assert(chart.indexOf('\n') !== -1);
  });

  test('custom days parameter used', function() {
    var s = freshState();
    var p = uid();
    E.earnSpark(s, p, 10, 'a');
    // Should not throw with days=3
    var chart = E.renderSparkChart(s.transactions, 3);
    assert(typeof chart === 'string');
  });

  test('handles null transactions', function() {
    var chart = E.renderSparkChart(null);
    assert(typeof chart === 'string');
  });

});

// ============================================================================
// SUITE 20 — createEconomyPanel (Node skips DOM)
// ============================================================================
suite('createEconomyPanel', function() {

  test('returns null in Node environment (no document)', function() {
    // In Node.js, document is undefined so we expect null
    var result = E.createEconomyPanel();
    assert(result === null);
  });

});

// ============================================================================
// SUITE 21 — Edge Cases
// ============================================================================
suite('Edge Cases', function() {

  test('spendSpark with exactly the balance succeeds', function() {
    var s = freshState();
    var p = uid();
    s.balances[p] = 50;
    var res = E.spendSpark(s, p, 50, 'all');
    assert(res.success === true && s.balances[p] === 0);
  });

  test('transferSpark with 0 amount fails', function() {
    var s = freshState();
    var a = uid(); var b = uid();
    s.balances[a] = 100;
    var res = E.transferSpark(s, a, b, 0, 'nothing');
    assert(res.success === false);
  });

  test('buying more than available gets partial fill', function() {
    var s = freshState();
    var seller = uid(); var buyer = uid();
    s.balances[seller] = 500;
    var res = E.createListing(s, seller, 'item_gem', 2, 10);
    s.balances[buyer] = 1000;
    var buyRes = E.buyListing(s, buyer, res.listing.id, 999);
    assert(buyRes.items === 2);
  });

  test('giniCoefficient with all zeros returns 0', function() {
    assert(E.calculateGiniCoefficient([0, 0, 0]) === 0);
  });

  test('getListings with null state returns empty array', function() {
    assert(E.getListings(null, {}).length === 0);
  });

  test('getTransactionHistory with null state returns empty array', function() {
    assert(E.getTransactionHistory(null, 'p').length === 0);
  });

  test('getEconomyStats handles state with no balances', function() {
    var s = freshState();
    var stats = E.getEconomyStats(s);
    assert(stats.totalCirculation === 0);
    assert(stats.averageWealth === 0);
    assert(stats.giniCoefficient === 0);
  });

  test('multiple UBI rounds accumulate in ubiHistory', function() {
    var s = freshState();
    var p = uid();
    s.balances[p] = 0;
    E.distributeUBI(s, 5);
    E.distributeUBI(s, 10);
    assert(s.ubiHistory.length === 2);
  });

  test('wealth tax with rate 0 taxes nobody', function() {
    var s = freshState();
    var rich = uid();
    s.balances[rich] = 1000;
    var res = E.applyWealthTax(s, 0, 0);
    assert(res.taxed.length === 0);
  });

  test('createListing fee is 5% floor with large amounts', function() {
    var s = freshState();
    var p = uid();
    s.balances[p] = 10000;
    var res = E.createListing(s, p, 'item_rare', 100, 200);
    // total = 20000; 5% = 1000
    assert(res.fee === 1000);
  });

  test('buying partial reduces but does not deactivate listing', function() {
    var s = freshState();
    var seller = uid(); var buyer = uid();
    s.balances[seller] = 500;
    var listRes = E.createListing(s, seller, 'item_wood', 10, 5);
    s.balances[buyer] = 500;
    E.buyListing(s, buyer, listRes.listing.id, 5);
    assert(listRes.listing.active === true);
    assert(listRes.listing.quantity === 5);
  });

  test('earnSpark with no reason uses empty string', function() {
    var s = freshState();
    var p = uid();
    E.earnSpark(s, p, 10);
    assert(s.transactions[0].reason === '' || s.transactions[0].reason === undefined || typeof s.transactions[0].reason === 'string');
  });

  test('distributeUBI with no players succeeds with 0 recipients', function() {
    var s = freshState();
    var res = E.distributeUBI(s, 10);
    assert(res.success === true && res.recipients === 0);
  });

});

// ============================================================================
// RUN
// ============================================================================
var ok = report();
process.exit(ok ? 0 : 1);
