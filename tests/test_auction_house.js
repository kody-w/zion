/**
 * tests/test_auction_house.js
 * 200+ tests for the Auction House system (ZION Agora zone).
 *
 * Run: node tests/test_auction_house.js
 */
'use strict';

var AH = require('../src/js/auction_house');

// ---------------------------------------------------------------------------
// Minimal test harness
// ---------------------------------------------------------------------------
var passed   = 0;
var failed   = 0;
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
  var tol = tolerance !== undefined ? tolerance : 0.001;
  assert(Math.abs(a - b) <= tol, (msg || 'assertApprox') + ' — expected ~' + b + ', got ' + a);
}

function assertDefined(val, msg) {
  assert(val !== undefined && val !== null, (msg || 'assertDefined') + ' — got ' + val);
}

function assertType(val, type, msg) {
  assert(typeof val === type, (msg || 'assertType') + ' — expected ' + type + ', got ' + typeof val);
}

function assertArray(val, msg) {
  assert(Array.isArray(val), (msg || 'assertArray') + ' — got ' + typeof val);
}

function assertGT(a, b, msg) {
  assert(a > b, (msg || 'assertGT') + ' — expected ' + a + ' > ' + b);
}

function assertGTE(a, b, msg) {
  assert(a >= b, (msg || 'assertGTE') + ' — expected ' + a + ' >= ' + b);
}

function assertLTE(a, b, msg) {
  assert(a <= b, (msg || 'assertLTE') + ' — expected ' + a + ' <= ' + b);
}

function suite(name) {
  console.log('\n--- ' + name + ' ---');
}

// ---------------------------------------------------------------------------
// State / helper factories
// ---------------------------------------------------------------------------

var _playerCounter = 0;
function uid(prefix) {
  return (prefix || 'player') + '_' + (++_playerCounter);
}

function freshState() {
  return {};
}

function stateWithBalance(playerId, amount) {
  var s = freshState();
  AH.initAuctionHouse(s);
  if (!s.ledger) s.ledger = { balances: {}, transactions: [] };
  s.ledger.balances[playerId] = amount;
  return s;
}

function stateWithBalances(balMap) {
  var s = freshState();
  AH.initAuctionHouse(s);
  if (!s.ledger) s.ledger = { balances: {}, transactions: [] };
  for (var pid in balMap) {
    s.ledger.balances[pid] = balMap[pid];
  }
  return s;
}

function getBalance(state, playerId) {
  if (!state.ledger || !state.ledger.balances) return 0;
  return state.ledger.balances[playerId] || 0;
}

/**
 * Create a quick listing in a given state.
 * seller must already have enough balance for listing fee.
 */
function quickList(state, overrides) {
  var sellerId = (overrides && overrides.sellerId) || uid('seller');
  // Ensure seller has balance for fee
  if (!state.ledger) state.ledger = { balances: {}, transactions: [] };
  if (!state.ledger.balances[sellerId]) state.ledger.balances[sellerId] = 10000;

  var params = {
    sellerId:     sellerId,
    itemId:       (overrides && overrides.itemId)       || 'iron_ore',
    itemName:     (overrides && overrides.itemName)     || 'Iron Ore',
    category:     (overrides && overrides.category)     || 'materials',
    quantity:     (overrides && overrides.quantity)     || 1,
    reservePrice: (overrides && overrides.reservePrice) || 100,
    durationMs:   (overrides && overrides.durationMs)   || 3600000,  // 1 h
    mode:         (overrides && overrides.mode)         || AH.MODE_OPEN,
    buyoutPrice:  (overrides && overrides.buyoutPrice)  || null
  };
  return AH.listItem(state, params);
}

// ---------------------------------------------------------------------------
// SUITE 1: Module Exports
// ---------------------------------------------------------------------------
suite('Module Exports');

assert(typeof AH === 'object',                        'module exports object');
assert(typeof AH.initAuctionHouse === 'function',     'initAuctionHouse exported');
assert(typeof AH.listItem === 'function',             'listItem exported');
assert(typeof AH.placeBid === 'function',             'placeBid exported');
assert(typeof AH.buyout === 'function',               'buyout exported');
assert(typeof AH.resolveAuction === 'function',       'resolveAuction exported');
assert(typeof AH.cancelAuction === 'function',        'cancelAuction exported');
assert(typeof AH.getBidHistory === 'function',        'getBidHistory exported');
assert(typeof AH.searchAuctions === 'function',       'searchAuctions exported');
assert(typeof AH.getAuction === 'function',           'getAuction exported');
assert(typeof AH.getSellerRating === 'function',      'getSellerRating exported');
assert(typeof AH.tickAuctions === 'function',         'tickAuctions exported');
assert(typeof AH.getEscrowBalance === 'function',     'getEscrowBalance exported');
assert(typeof AH.getAuctionsByCategory === 'function','getAuctionsByCategory exported');
assert(typeof AH.getStats === 'function',             'getStats exported');
assert(typeof AH.getActiveAuctions === 'function',    'getActiveAuctions exported');
assert(typeof AH.calcListingFee === 'function',       'calcListingFee exported');
assert(typeof AH.mulberry32 === 'function',           'mulberry32 exported');

// Constants
assertEqual(AH.MODE_OPEN,       'open',      'MODE_OPEN');
assertEqual(AH.MODE_SEALED,     'sealed',    'MODE_SEALED');
assertEqual(AH.STATUS_ACTIVE,   'active',    'STATUS_ACTIVE');
assertEqual(AH.STATUS_ENDED,    'ended',     'STATUS_ENDED');
assertEqual(AH.STATUS_CANCELLED,'cancelled', 'STATUS_CANCELLED');
assertArray(AH.VALID_DURATIONS,              'VALID_DURATIONS is array');
assertEqual(AH.VALID_DURATIONS.length, 4,   'four valid durations');
assertEqual(AH.LISTING_FEE_RATE, 0.05,      'LISTING_FEE_RATE = 5%');
assertEqual(AH.MIN_LISTING_FEE, 1,          'MIN_LISTING_FEE = 1');

// ---------------------------------------------------------------------------
// SUITE 2: mulberry32 PRNG
// ---------------------------------------------------------------------------
suite('mulberry32 PRNG');

(function() {
  var rng = AH.mulberry32(42);
  var v1 = rng();
  var v2 = rng();
  var v3 = rng();
  assert(typeof v1 === 'number',            'rng returns number');
  assert(v1 >= 0 && v1 < 1,                'rng in [0,1)');
  assert(v2 >= 0 && v2 < 1,                'rng[1] in [0,1)');
  assert(v1 !== v2,                         'successive calls differ');

  // Deterministic: same seed → same sequence
  var rng2 = AH.mulberry32(42);
  assertEqual(rng2(), v1,                   'deterministic: call 1');
  assertEqual(rng2(), v2,                   'deterministic: call 2');
  assertEqual(rng2(), v3,                   'deterministic: call 3');

  // Different seeds → different values
  var rngB = AH.mulberry32(99);
  assert(rngB() !== v1,                     'different seed → different value');
})();

// ---------------------------------------------------------------------------
// SUITE 3: initAuctionHouse
// ---------------------------------------------------------------------------
suite('initAuctionHouse');

(function() {
  var s = freshState();
  AH.initAuctionHouse(s);
  assertDefined(s.auctionHouse,             'auctionHouse bucket created');
  assertArray(s.auctionHouse.auctions,      'auctions array');
  assertType(s.auctionHouse.escrow, 'object','escrow object');
  assertType(s.auctionHouse.sellerRatings, 'object','sellerRatings object');
  assertType(s.auctionHouse.searchIndex, 'object','searchIndex object');

  // Idempotent
  s.auctionHouse.auctions.push({ id: 'sentinel' });
  AH.initAuctionHouse(s);
  assertEqual(s.auctionHouse.auctions.length, 1, 'idempotent: sentinel preserved');
})();

// ---------------------------------------------------------------------------
// SUITE 4: calcListingFee
// ---------------------------------------------------------------------------
suite('calcListingFee');

(function() {
  assertEqual(AH.calcListingFee(100), 5,   'fee on 100 = 5 (5%)');
  assertEqual(AH.calcListingFee(200), 10,  'fee on 200 = 10');
  assertEqual(AH.calcListingFee(1000), 50, 'fee on 1000 = 50');
  assertEqual(AH.calcListingFee(10), 1,    'fee on 10 = 1 (min floor)');
  assertEqual(AH.calcListingFee(1), 1,     'fee on 1 = 1 (min floor)');
  assertEqual(AH.calcListingFee(19), 1,    'fee on 19 rounds to 1');
  assertEqual(AH.calcListingFee(20), 1,    '5% of 20 = 1');
  assertEqual(AH.calcListingFee(500), 25,  'fee on 500 = 25');
})();

// ---------------------------------------------------------------------------
// SUITE 5: listItem — validation
// ---------------------------------------------------------------------------
suite('listItem — validation');

(function() {
  var s = stateWithBalance('seller_x', 10000);

  // Missing sellerId
  var r = AH.listItem(s, {});
  assertEqual(r.success, false, 'no sellerId → fail');

  // Missing itemId
  r = AH.listItem(s, { sellerId: 'seller_x' });
  assertEqual(r.success, false, 'no itemId → fail');

  // Missing itemName
  r = AH.listItem(s, { sellerId: 'seller_x', itemId: 'iron_ore' });
  assertEqual(r.success, false, 'no itemName → fail');

  // Bad quantity
  r = AH.listItem(s, { sellerId: 'seller_x', itemId: 'iron_ore', itemName: 'Iron Ore',
                        quantity: 0, reservePrice: 100, durationMs: 3600000 });
  assertEqual(r.success, false, 'quantity 0 → fail');

  r = AH.listItem(s, { sellerId: 'seller_x', itemId: 'iron_ore', itemName: 'Iron Ore',
                        quantity: -5, reservePrice: 100, durationMs: 3600000 });
  assertEqual(r.success, false, 'negative quantity → fail');

  // Bad reservePrice
  r = AH.listItem(s, { sellerId: 'seller_x', itemId: 'iron_ore', itemName: 'Iron Ore',
                        quantity: 1, reservePrice: 0, durationMs: 3600000 });
  assertEqual(r.success, false, 'reservePrice 0 → fail');

  // Bad duration
  r = AH.listItem(s, { sellerId: 'seller_x', itemId: 'iron_ore', itemName: 'Iron Ore',
                        quantity: 1, reservePrice: 100, durationMs: 99999 });
  assertEqual(r.success, false, 'invalid durationMs → fail');

  // buyoutPrice not > reservePrice
  r = AH.listItem(s, { sellerId: 'seller_x', itemId: 'iron_ore', itemName: 'Iron Ore',
                        quantity: 1, reservePrice: 100, durationMs: 3600000,
                        buyoutPrice: 100 });
  assertEqual(r.success, false, 'buyoutPrice <= reservePrice → fail');

  r = AH.listItem(s, { sellerId: 'seller_x', itemId: 'iron_ore', itemName: 'Iron Ore',
                        quantity: 1, reservePrice: 100, durationMs: 3600000,
                        buyoutPrice: 50 });
  assertEqual(r.success, false, 'buyoutPrice < reservePrice → fail');
})();

// ---------------------------------------------------------------------------
// SUITE 6: listItem — success
// ---------------------------------------------------------------------------
suite('listItem — success');

(function() {
  var seller = uid('seller');
  var s = stateWithBalance(seller, 10000);

  var r = AH.listItem(s, {
    sellerId:     seller,
    itemId:       'iron_ore',
    itemName:     'Iron Ore',
    category:     'materials',
    quantity:     5,
    reservePrice: 100,
    durationMs:   3600000
  });

  assertEqual(r.success, true,       'listing succeeds');
  assertDefined(r.auctionId,         'auctionId returned');
  assertType(r.auctionId, 'string',  'auctionId is string');
  assertEqual(r.listingFee, 5,       'listingFee = 5 (5% of 100)');

  // Fee was destroyed
  var balAfter = getBalance(s, seller);
  assertEqual(balAfter, 9995,        'seller balance debited by listing fee');

  // Auction present
  var a = AH.getAuction(s, r.auctionId);
  assertDefined(a,                   'auction retrievable');
  assertEqual(a.sellerId, seller,    'sellerId correct');
  assertEqual(a.itemId, 'iron_ore',  'itemId correct');
  assertEqual(a.quantity, 5,         'quantity correct');
  assertEqual(a.reservePrice, 100,   'reservePrice correct');
  assertEqual(a.status, 'active',    'status is active');
  assertEqual(a.mode, 'open',        'mode defaults to open');
  assertEqual(a.bidCount, 0,         'no bids yet');
  assertEqual(a.topBidAmount, 0,     'topBidAmount = 0');
  assertDefined(a.startTime,         'startTime set');
  assertDefined(a.endTime,           'endTime set');
  assertGT(a.endTime, a.startTime,   'endTime > startTime');
})();

// ---------------------------------------------------------------------------
// SUITE 7: listItem — all valid durations
// ---------------------------------------------------------------------------
suite('listItem — all valid durations');

(function() {
  var durations = AH.VALID_DURATIONS;
  for (var i = 0; i < durations.length; i++) {
    var seller = uid('dursel');
    var s = stateWithBalance(seller, 5000);
    var r = quickList(s, { sellerId: seller, durationMs: durations[i] });
    assertEqual(r.success, true, 'duration ' + durations[i] + ' accepted');
    var a = AH.getAuction(s, r.auctionId);
    assertEqual(a.durationMs, durations[i], 'durationMs stored correctly');
  }
})();

// ---------------------------------------------------------------------------
// SUITE 8: listItem — listing fee insufficient balance
// ---------------------------------------------------------------------------
suite('listItem — insufficient balance for listing fee');

(function() {
  var seller = uid('poor_seller');
  var s = stateWithBalance(seller, 2);  // can't afford 5% of 100 = 5

  var r = AH.listItem(s, {
    sellerId:     seller,
    itemId:       'test_item',
    itemName:     'Test Item',
    category:     'misc',
    quantity:     1,
    reservePrice: 100,
    durationMs:   3600000
  });

  assertEqual(r.success, false,                    'fail when balance < listing fee');
  assert(/insufficient/i.test(r.message || ''),    'message mentions insufficient');
})();

// ---------------------------------------------------------------------------
// SUITE 9: listItem — sealed mode
// ---------------------------------------------------------------------------
suite('listItem — sealed mode');

(function() {
  var seller = uid('sealed_seller');
  var s = stateWithBalance(seller, 5000);
  var r = quickList(s, { sellerId: seller, mode: AH.MODE_SEALED });
  assertEqual(r.success, true,         'sealed listing created');
  var a = AH.getAuction(s, r.auctionId);
  assertEqual(a.mode, 'sealed',        'mode is sealed');
})();

// ---------------------------------------------------------------------------
// SUITE 10: listItem — buyout price
// ---------------------------------------------------------------------------
suite('listItem — buyout price');

(function() {
  var seller = uid('buyout_seller');
  var s = stateWithBalance(seller, 5000);
  var r = quickList(s, { sellerId: seller, reservePrice: 100, buyoutPrice: 500 });
  assertEqual(r.success, true,         'buyout listing created');
  var a = AH.getAuction(s, r.auctionId);
  assertEqual(a.buyoutPrice, 500,      'buyoutPrice stored');
})();

// ---------------------------------------------------------------------------
// SUITE 11: listItem — active listing cap
// ---------------------------------------------------------------------------
suite('listItem — active listing cap');

(function() {
  var seller = uid('cap_seller');
  var s = stateWithBalance(seller, 999999);
  var cap = AH.MAX_ACTIVE_LISTINGS_PER_SELLER;

  for (var i = 0; i < cap; i++) {
    var r = quickList(s, { sellerId: seller });
    assertEqual(r.success, true, 'listing ' + (i+1) + ' succeeds');
  }

  var extra = quickList(s, { sellerId: seller });
  assertEqual(extra.success, false, 'listing ' + (cap+1) + ' rejected');
  assert(/max/i.test(extra.message || ''), 'message mentions max');
})();

// ---------------------------------------------------------------------------
// SUITE 12: listItem — spark sink (SYSTEM ledger)
// ---------------------------------------------------------------------------
suite('listItem — spark sink recorded');

(function() {
  var seller = uid('sink_seller');
  var s = stateWithBalance(seller, 5000);
  var r = quickList(s, { sellerId: seller, reservePrice: 200 });
  // fee = 10
  assertEqual(r.listingFee, 10, 'fee = 10');

  var sinkBal = (s.ledger && s.ledger.balances && s.ledger.balances['SYSTEM']) || 0;
  assertGTE(sinkBal, 10, 'SYSTEM balance >= listing fee (sink)');

  // Transaction logged
  var txns = s.ledger.transactions || [];
  var sinkTx = txns.filter(function(t) { return t.type === 'spark_sink'; });
  assertGT(sinkTx.length, 0, 'spark_sink transaction recorded');
})();

// ---------------------------------------------------------------------------
// SUITE 13: placeBid — validation
// ---------------------------------------------------------------------------
suite('placeBid — validation');

(function() {
  var seller = uid('bid_val_seller');
  var bidder = uid('bid_val_bidder');
  var s = stateWithBalances({
    [seller]: 5000,
    [bidder]: 5000
  });
  var r = quickList(s, { sellerId: seller, reservePrice: 100 });
  var auctionId = r.auctionId;

  // No bidderId
  var b = AH.placeBid(s, { auctionId: auctionId, amount: 150 });
  assertEqual(b.success, false, 'no bidderId → fail');

  // No auctionId
  b = AH.placeBid(s, { bidderId: bidder, amount: 150 });
  assertEqual(b.success, false, 'no auctionId → fail');

  // Bad amount
  b = AH.placeBid(s, { bidderId: bidder, auctionId: auctionId, amount: 0 });
  assertEqual(b.success, false, 'amount 0 → fail');

  b = AH.placeBid(s, { bidderId: bidder, auctionId: auctionId, amount: -1 });
  assertEqual(b.success, false, 'negative amount → fail');

  // Auction not found
  b = AH.placeBid(s, { bidderId: bidder, auctionId: 'nonexistent', amount: 150 });
  assertEqual(b.success, false, 'nonexistent auction → fail');

  // Seller bids on own auction
  b = AH.placeBid(s, { bidderId: seller, auctionId: auctionId, amount: 150 });
  assertEqual(b.success, false, 'seller bids on own auction → fail');

  // Below reserve
  b = AH.placeBid(s, { bidderId: bidder, auctionId: auctionId, amount: 50 });
  assertEqual(b.success, false, 'bid below reserve → fail');
  assert(/reserve/i.test(b.message || ''), 'message mentions reserve');
})();

// ---------------------------------------------------------------------------
// SUITE 14: placeBid — open bidding success
// ---------------------------------------------------------------------------
suite('placeBid — open bidding success');

(function() {
  var seller = uid('open_seller');
  var bidder = uid('open_bidder');
  var s = stateWithBalances({
    [seller]: 5000,
    [bidder]: 5000
  });

  var r = quickList(s, { sellerId: seller, reservePrice: 100 });
  var auctionId = r.auctionId;

  var b = AH.placeBid(s, { bidderId: bidder, auctionId: auctionId, amount: 150 });
  assertEqual(b.success, true,            'bid placed successfully');
  assertDefined(b.bidId,                  'bidId returned');
  assertEqual(b.amount, 150,              'amount confirmed');

  var a = AH.getAuction(s, auctionId);
  assertEqual(a.topBidAmount, 150,        'topBidAmount updated');
  assertEqual(a.topBidderId, bidder,      'topBidderId updated');
  assertEqual(a.bidCount, 1,              'bidCount = 1');

  // Escrow
  var escrow = AH.getEscrowBalance(s, auctionId, bidder);
  assertEqual(escrow, 150,                'escrow holds 150');

  // Balance reduced
  var bal = getBalance(s, bidder);
  assertEqual(bal, 5000 - 150,            'bidder balance reduced by 150');
})();

// ---------------------------------------------------------------------------
// SUITE 15: placeBid — open bid increment enforcement
// ---------------------------------------------------------------------------
suite('placeBid — open bid increment enforcement');

(function() {
  var seller = uid('inc_seller');
  var bidder1 = uid('inc_b1');
  var bidder2 = uid('inc_b2');
  var s = stateWithBalances({ [seller]: 5000, [bidder1]: 5000, [bidder2]: 5000 });

  var r = quickList(s, { sellerId: seller, reservePrice: 100 });
  var auctionId = r.auctionId;

  AH.placeBid(s, { bidderId: bidder1, auctionId: auctionId, amount: 200 });

  // bidder2 tries same amount
  var b = AH.placeBid(s, { bidderId: bidder2, auctionId: auctionId, amount: 200 });
  assertEqual(b.success, false, 'same amount not accepted');

  // bidder2 tries just under 1% increment (200 * 1.01 = 202)
  b = AH.placeBid(s, { bidderId: bidder2, auctionId: auctionId, amount: 201 });
  assertEqual(b.success, false, '201 < 202 (min increment) → fail');

  // bidder2 meets minimum
  b = AH.placeBid(s, { bidderId: bidder2, auctionId: auctionId, amount: 202 });
  assertEqual(b.success, true, '202 >= min increment → success');
})();

// ---------------------------------------------------------------------------
// SUITE 16: placeBid — outbid refund & notification
// ---------------------------------------------------------------------------
suite('placeBid — outbid refund');

(function() {
  var seller  = uid('out_s');
  var bidder1 = uid('out_b1');
  var bidder2 = uid('out_b2');
  var s = stateWithBalances({ [seller]: 5000, [bidder1]: 5000, [bidder2]: 5000 });

  var r = quickList(s, { sellerId: seller, reservePrice: 100 });
  var auctionId = r.auctionId;

  // bidder1 bids 200
  AH.placeBid(s, { bidderId: bidder1, auctionId: auctionId, amount: 200 });
  var b1BalAfterBid = getBalance(s, bidder1);
  assertEqual(b1BalAfterBid, 4800, 'bidder1 balance after first bid');

  // bidder2 outbids
  AH.placeBid(s, { bidderId: bidder2, auctionId: auctionId, amount: 202 });

  // bidder1 should be refunded
  var b1BalAfterOutbid = getBalance(s, bidder1);
  assertEqual(b1BalAfterOutbid, 5000, 'bidder1 refunded after outbid');

  // bidder1's escrow cleared
  var escrow1 = AH.getEscrowBalance(s, auctionId, bidder1);
  assertEqual(escrow1, 0, 'bidder1 escrow = 0 after outbid');

  // bidder2 escrow active
  var escrow2 = AH.getEscrowBalance(s, auctionId, bidder2);
  assertEqual(escrow2, 202, 'bidder2 escrow = 202');
})();

// ---------------------------------------------------------------------------
// SUITE 17: placeBid — same bidder raises their bid
// ---------------------------------------------------------------------------
suite('placeBid — same bidder raises bid');

(function() {
  var seller  = uid('raise_s');
  var bidder  = uid('raise_b');
  var s = stateWithBalances({ [seller]: 5000, [bidder]: 5000 });

  var r = quickList(s, { sellerId: seller, reservePrice: 100 });
  var auctionId = r.auctionId;

  AH.placeBid(s, { bidderId: bidder, auctionId: auctionId, amount: 200 });
  var balAfterFirst = getBalance(s, bidder);
  assertEqual(balAfterFirst, 4800, 'balance after first bid');

  // Raise to 300 (increment is 1% of 200 = 202 minimum)
  var b = AH.placeBid(s, { bidderId: bidder, auctionId: auctionId, amount: 300 });
  assertEqual(b.success, true, 'raise bid succeeds');

  var balAfterRaise = getBalance(s, bidder);
  assertEqual(balAfterRaise, 4700, 'balance debited by additional 100');

  var escrow = AH.getEscrowBalance(s, auctionId, bidder);
  assertEqual(escrow, 300, 'escrow = 300');
})();

// ---------------------------------------------------------------------------
// SUITE 18: placeBid — sealed mode (single bid per bidder)
// ---------------------------------------------------------------------------
suite('placeBid — sealed mode');

(function() {
  var seller  = uid('seal_s');
  var bidder1 = uid('seal_b1');
  var bidder2 = uid('seal_b2');
  var s = stateWithBalances({ [seller]: 5000, [bidder1]: 5000, [bidder2]: 5000 });

  var r = quickList(s, { sellerId: seller, mode: AH.MODE_SEALED, reservePrice: 100 });
  var auctionId = r.auctionId;

  var b1 = AH.placeBid(s, { bidderId: bidder1, auctionId: auctionId, amount: 200 });
  assertEqual(b1.success, true, 'sealed bid 1 succeeds');

  var b2 = AH.placeBid(s, { bidderId: bidder2, auctionId: auctionId, amount: 150 });
  assertEqual(b2.success, true, 'sealed bid 2 succeeds (different bidder)');

  // bidder1 tries to bid again
  var b3 = AH.placeBid(s, { bidderId: bidder1, auctionId: auctionId, amount: 250 });
  assertEqual(b3.success, false, 'second sealed bid rejected');
  assert(/sealed/i.test(b3.message || ''), 'message mentions sealed');
})();

// ---------------------------------------------------------------------------
// SUITE 19: placeBid — insufficient balance
// ---------------------------------------------------------------------------
suite('placeBid — insufficient balance');

(function() {
  var seller = uid('insuf_s');
  var bidder = uid('insuf_b');
  var s = stateWithBalances({ [seller]: 5000, [bidder]: 50 });

  var r = quickList(s, { sellerId: seller, reservePrice: 100 });
  var b = AH.placeBid(s, { bidderId: bidder, auctionId: r.auctionId, amount: 200 });
  assertEqual(b.success, false, 'insufficient balance → fail');
  assert(/insufficient/i.test(b.message || ''), 'message mentions insufficient');
})();

// ---------------------------------------------------------------------------
// SUITE 20: placeBid — on ended or cancelled auction
// ---------------------------------------------------------------------------
suite('placeBid — non-active auction');

(function() {
  var seller = uid('na_s');
  var bidder = uid('na_b');
  var s = stateWithBalances({ [seller]: 5000, [bidder]: 5000 });

  // Create & cancel
  var r = quickList(s, { sellerId: seller });
  AH.cancelAuction(s, { sellerId: seller, auctionId: r.auctionId });

  var b = AH.placeBid(s, { bidderId: bidder, auctionId: r.auctionId, amount: 200 });
  assertEqual(b.success, false, 'bid on cancelled auction → fail');
})();

// ---------------------------------------------------------------------------
// SUITE 21: resolveAuction — winner found
// ---------------------------------------------------------------------------
suite('resolveAuction — winner found');

(function() {
  var seller  = uid('res_s');
  var bidder1 = uid('res_b1');
  var bidder2 = uid('res_b2');
  var s = stateWithBalances({ [seller]: 5000, [bidder1]: 5000, [bidder2]: 5000 });

  // Create auction with past endTime by manipulating state directly
  var r = quickList(s, { sellerId: seller, reservePrice: 100 });
  var auctionId = r.auctionId;

  AH.placeBid(s, { bidderId: bidder1, auctionId: auctionId, amount: 200 });
  AH.placeBid(s, { bidderId: bidder2, auctionId: auctionId, amount: 202 });

  // Force auction to expire
  var auction = s.auctionHouse.auctions[s.auctionHouse.auctions.length - 1];
  auction.endTime = Date.now() - 1000;

  var sellerBalBefore = getBalance(s, seller);
  var res = AH.resolveAuction(s, auctionId);

  assertEqual(res.success, true,               'resolve succeeds');
  assertEqual(res.winnerId, bidder2,           'bidder2 wins (highest bid)');
  assertEqual(res.finalPrice, 202,             'finalPrice = 202');

  // Seller received payment
  var sellerBalAfter = getBalance(s, seller);
  assertEqual(sellerBalAfter, sellerBalBefore + 202, 'seller received 202');

  // bidder1 refunded
  assertEqual(getBalance(s, bidder1), 5000, 'bidder1 fully refunded');

  // bidder2 escrow cleared
  assertEqual(AH.getEscrowBalance(s, auctionId, bidder2), 0, 'winner escrow cleared');

  // Auction status
  var a = AH.getAuction(s, auctionId);
  assertEqual(a.status, 'ended',               'auction ended');
  assertEqual(a.winnerId, bidder2,             'winnerId set');
  assertDefined(a.resolvedAt,                  'resolvedAt set');
})();

// ---------------------------------------------------------------------------
// SUITE 22: resolveAuction — reserve not met
// ---------------------------------------------------------------------------
suite('resolveAuction — reserve not met');

(function() {
  var seller = uid('rsv_s');
  var bidder = uid('rsv_b');
  var s = stateWithBalances({ [seller]: 5000, [bidder]: 5000 });

  var r = quickList(s, { sellerId: seller, reservePrice: 1000 });
  // Bidder can't meet reserve (bidder only has 5000, but reserve is 1000 — they can actually bid)
  // Instead let's not place any bids so reserve not met
  var auction = s.auctionHouse.auctions[s.auctionHouse.auctions.length - 1];
  auction.endTime = Date.now() - 1000;

  var res = AH.resolveAuction(s, r.auctionId);
  assertEqual(res.success, true,   'resolve succeeds');
  assertEqual(res.winnerId, null,  'no winner when no bids');
  assertEqual(res.finalPrice, null,'no final price');

  var a = AH.getAuction(s, r.auctionId);
  assertEqual(a.status, 'ended',   'auction ended');
  assertEqual(a.winnerId, null,    'winnerId is null');
})();

// ---------------------------------------------------------------------------
// SUITE 23: resolveAuction — idempotent
// ---------------------------------------------------------------------------
suite('resolveAuction — idempotent');

(function() {
  var seller = uid('idem_s');
  var bidder = uid('idem_b');
  var s = stateWithBalances({ [seller]: 5000, [bidder]: 5000 });

  var r = quickList(s, { sellerId: seller, reservePrice: 100 });
  AH.placeBid(s, { bidderId: bidder, auctionId: r.auctionId, amount: 150 });

  var auction = s.auctionHouse.auctions[s.auctionHouse.auctions.length - 1];
  auction.endTime = Date.now() - 1000;

  var res1 = AH.resolveAuction(s, r.auctionId);
  var res2 = AH.resolveAuction(s, r.auctionId);

  assertEqual(res1.success, true,          'first resolve succeeds');
  assertEqual(res2.success, true,          'second resolve succeeds');
  assertEqual(res2.alreadyResolved, true,  'second resolve flagged as alreadyResolved');
  assertEqual(res2.winnerId, bidder,       'winnerId same on second call');
})();

// ---------------------------------------------------------------------------
// SUITE 24: resolveAuction — not yet expired
// ---------------------------------------------------------------------------
suite('resolveAuction — not yet expired');

(function() {
  var seller = uid('early_s');
  var s = stateWithBalance(seller, 5000);
  var r = quickList(s, { sellerId: seller });
  var res = AH.resolveAuction(s, r.auctionId);
  assertEqual(res.success, false, 'cannot resolve before expiry');
  assert(/not expired/i.test(res.message || ''), 'message mentions not expired');
})();

// ---------------------------------------------------------------------------
// SUITE 25: cancelAuction — success (no bids)
// ---------------------------------------------------------------------------
suite('cancelAuction — success (no bids)');

(function() {
  var seller = uid('can_s');
  var s = stateWithBalance(seller, 5000);
  var r = quickList(s, { sellerId: seller });

  var c = AH.cancelAuction(s, { sellerId: seller, auctionId: r.auctionId });
  assertEqual(c.success, true, 'cancel succeeds when no bids');

  var a = AH.getAuction(s, r.auctionId);
  assertEqual(a.status, 'cancelled', 'auction cancelled');
  assertDefined(a.resolvedAt,        'resolvedAt set');
})();

// ---------------------------------------------------------------------------
// SUITE 26: cancelAuction — fail when bids placed
// ---------------------------------------------------------------------------
suite('cancelAuction — fail when bids placed');

(function() {
  var seller = uid('can_bid_s');
  var bidder = uid('can_bid_b');
  var s = stateWithBalances({ [seller]: 5000, [bidder]: 5000 });

  var r = quickList(s, { sellerId: seller, reservePrice: 100 });
  AH.placeBid(s, { bidderId: bidder, auctionId: r.auctionId, amount: 150 });

  var c = AH.cancelAuction(s, { sellerId: seller, auctionId: r.auctionId });
  assertEqual(c.success, false,                   'cannot cancel after bids');
  assert(/bids/i.test(c.message || ''),           'message mentions bids');
})();

// ---------------------------------------------------------------------------
// SUITE 27: cancelAuction — wrong seller
// ---------------------------------------------------------------------------
suite('cancelAuction — wrong seller');

(function() {
  var seller  = uid('ws_s');
  var intruder= uid('ws_i');
  var s = stateWithBalances({ [seller]: 5000, [intruder]: 5000 });

  var r = quickList(s, { sellerId: seller });
  var c = AH.cancelAuction(s, { sellerId: intruder, auctionId: r.auctionId });
  assertEqual(c.success, false,               'wrong seller → fail');
  assert(/seller/i.test(c.message || ''),     'message mentions seller');
})();

// ---------------------------------------------------------------------------
// SUITE 28: cancelAuction — seller rating updated
// ---------------------------------------------------------------------------
suite('cancelAuction — seller rating');

(function() {
  var seller = uid('rt_s');
  var s = stateWithBalance(seller, 5000);
  var r = quickList(s, { sellerId: seller });
  AH.cancelAuction(s, { sellerId: seller, auctionId: r.auctionId });

  var rating = AH.getSellerRating(s, seller);
  assertEqual(rating.totalCancels, 1,     'cancel recorded');
  assertEqual(rating.totalSales,   0,     'no sales');
  assertEqual(rating.successRate,  0,     'successRate = 0 after cancel');
})();

// ---------------------------------------------------------------------------
// SUITE 29: buyout — success
// ---------------------------------------------------------------------------
suite('buyout — success');

(function() {
  var seller = uid('bo_s');
  var buyer  = uid('bo_b');
  var bidder = uid('bo_other');
  var s = stateWithBalances({ [seller]: 5000, [buyer]: 5000, [bidder]: 5000 });

  var r = quickList(s, { sellerId: seller, reservePrice: 100, buyoutPrice: 500 });
  AH.placeBid(s, { bidderId: bidder, auctionId: r.auctionId, amount: 150 });

  var sellerBalBefore = getBalance(s, seller);
  var bidderBalBefore = getBalance(s, bidder);
  var buyerBalBefore  = getBalance(s, buyer);

  var b = AH.buyout(s, { buyerId: buyer, auctionId: r.auctionId });
  assertEqual(b.success, true,          'buyout succeeds');
  assertEqual(b.finalPrice, 500,        'finalPrice = buyoutPrice');

  // Seller received full buyout
  assertEqual(getBalance(s, seller), sellerBalBefore + 500, 'seller received 500');

  // Buyer debited
  assertEqual(getBalance(s, buyer), buyerBalBefore - 500, 'buyer debited 500');

  // Losing bidder refunded
  assertEqual(getBalance(s, bidder), 5000, 'losing bidder refunded');

  // Auction ended
  var a = AH.getAuction(s, r.auctionId);
  assertEqual(a.status,   'ended',      'auction ended');
  assertEqual(a.winnerId, buyer,        'winner = buyer');
  assertEqual(a.buyoutBy, buyer,        'buyoutBy = buyer');
})();

// ---------------------------------------------------------------------------
// SUITE 30: buyout — no buyout price
// ---------------------------------------------------------------------------
suite('buyout — no buyout price');

(function() {
  var seller = uid('nbo_s');
  var buyer  = uid('nbo_b');
  var s = stateWithBalances({ [seller]: 5000, [buyer]: 5000 });

  var r = quickList(s, { sellerId: seller });
  var b = AH.buyout(s, { buyerId: buyer, auctionId: r.auctionId });
  assertEqual(b.success, false, 'buyout without buyoutPrice → fail');
  assert(/buyout/i.test(b.message || ''), 'message mentions buyout');
})();

// ---------------------------------------------------------------------------
// SUITE 31: buyout — seller cannot buyout own auction
// ---------------------------------------------------------------------------
suite('buyout — seller cannot buyout own');

(function() {
  var seller = uid('sbo_s');
  var s = stateWithBalance(seller, 10000);
  var r = quickList(s, { sellerId: seller, buyoutPrice: 500 });
  var b = AH.buyout(s, { buyerId: seller, auctionId: r.auctionId });
  assertEqual(b.success, false, 'seller buyout own → fail');
})();

// ---------------------------------------------------------------------------
// SUITE 32: buyout — insufficient balance
// ---------------------------------------------------------------------------
suite('buyout — insufficient balance');

(function() {
  var seller = uid('ibo_s');
  var buyer  = uid('ibo_b');
  var s = stateWithBalances({ [seller]: 5000, [buyer]: 100 });

  var r = quickList(s, { sellerId: seller, reservePrice: 100, buyoutPrice: 500 });
  var b = AH.buyout(s, { buyerId: buyer, auctionId: r.auctionId });
  assertEqual(b.success, false, 'insufficient balance → fail');
})();

// ---------------------------------------------------------------------------
// SUITE 33: getBidHistory — open mode
// ---------------------------------------------------------------------------
suite('getBidHistory — open mode');

(function() {
  var seller  = uid('hist_s');
  var bidder1 = uid('hist_b1');
  var bidder2 = uid('hist_b2');
  var s = stateWithBalances({ [seller]: 5000, [bidder1]: 5000, [bidder2]: 5000 });

  var r = quickList(s, { sellerId: seller, reservePrice: 100 });
  AH.placeBid(s, { bidderId: bidder1, auctionId: r.auctionId, amount: 150 });
  AH.placeBid(s, { bidderId: bidder2, auctionId: r.auctionId, amount: 202 });

  var h = AH.getBidHistory(s, r.auctionId);
  assertEqual(h.success, true,                  'getBidHistory succeeds');
  assertArray(h.bids,                           'bids is array');
  assertEqual(h.bids.length, 2,                 'two bids in history');

  // Open mode: amounts visible to all
  assertEqual(h.bids[0].amount, 150,            'first bid amount visible');
  assertEqual(h.bids[1].amount, 202,            'second bid amount visible');
  assertEqual(h.mode, 'open',                   'mode = open');
})();

// ---------------------------------------------------------------------------
// SUITE 34: getBidHistory — sealed mode (amounts hidden)
// ---------------------------------------------------------------------------
suite('getBidHistory — sealed mode');

(function() {
  var seller  = uid('sh_s');
  var bidder1 = uid('sh_b1');
  var bidder2 = uid('sh_b2');
  var s = stateWithBalances({ [seller]: 5000, [bidder1]: 5000, [bidder2]: 5000 });

  var r = quickList(s, { sellerId: seller, mode: AH.MODE_SEALED, reservePrice: 100 });
  AH.placeBid(s, { bidderId: bidder1, auctionId: r.auctionId, amount: 300 });
  AH.placeBid(s, { bidderId: bidder2, auctionId: r.auctionId, amount: 200 });

  // Third-party viewer sees -1
  var h = AH.getBidHistory(s, r.auctionId, 'some_stranger');
  assertEqual(h.bids[0].amount, -1,             'stranger cannot see bid amount');
  assertEqual(h.bids[1].amount, -1,             'stranger cannot see second bid');

  // Seller can see amounts
  var hSeller = AH.getBidHistory(s, r.auctionId, seller);
  assertGT(hSeller.bids[0].amount, 0,           'seller sees real amount');

  // Bidder sees own bid
  var hBidder = AH.getBidHistory(s, r.auctionId, bidder1);
  var ownBid = hBidder.bids.filter(function(b) { return b.bidderId === bidder1; });
  assertEqual(ownBid[0].amount, 300,            'bidder sees own amount');
})();

// ---------------------------------------------------------------------------
// SUITE 35: getBidHistory — revealed after auction ends
// ---------------------------------------------------------------------------
suite('getBidHistory — revealed after auction ends');

(function() {
  var seller  = uid('rev_s');
  var bidder1 = uid('rev_b1');
  var s = stateWithBalances({ [seller]: 5000, [bidder1]: 5000 });

  var r = quickList(s, { sellerId: seller, mode: AH.MODE_SEALED, reservePrice: 100 });
  AH.placeBid(s, { bidderId: bidder1, auctionId: r.auctionId, amount: 300 });

  // Force expire
  var auction = s.auctionHouse.auctions[s.auctionHouse.auctions.length - 1];
  auction.endTime = Date.now() - 1000;
  AH.resolveAuction(s, r.auctionId);

  // Now anyone can see
  var h = AH.getBidHistory(s, r.auctionId, 'stranger');
  assertEqual(h.bids[0].amount, 300,  'amounts revealed after auction ends');
})();

// ---------------------------------------------------------------------------
// SUITE 36: searchAuctions — basic
// ---------------------------------------------------------------------------
suite('searchAuctions — basic');

(function() {
  var s = freshState();
  var seller = uid('srch_s');
  s = stateWithBalance(seller, 99999);

  // List 3 auctions in 'materials', 1 in 'weapons'
  quickList(s, { sellerId: seller, category: 'materials', itemId: 'iron_ore',   itemName: 'Iron Ore',   reservePrice: 50 });
  quickList(s, { sellerId: seller, category: 'materials', itemId: 'copper_ore', itemName: 'Copper Ore', reservePrice: 80 });
  quickList(s, { sellerId: seller, category: 'materials', itemId: 'silver_ore', itemName: 'Silver Ore', reservePrice: 200 });
  quickList(s, { sellerId: seller, category: 'weapons',   itemId: 'iron_sword', itemName: 'Iron Sword', reservePrice: 300 });

  var res = AH.searchAuctions(s);
  assertEqual(res.success, true,       'search succeeds');
  assertGTE(res.total, 4,              'total >= 4');

  // Filter by category
  var mat = AH.searchAuctions(s, { category: 'materials' });
  assertEqual(mat.total, 3,            '3 materials auctions');

  var wpn = AH.searchAuctions(s, { category: 'weapons' });
  assertEqual(wpn.total, 1,            '1 weapons auction');
})();

// ---------------------------------------------------------------------------
// SUITE 37: searchAuctions — filters
// ---------------------------------------------------------------------------
suite('searchAuctions — filters');

(function() {
  var seller = uid('flt_s');
  var s = stateWithBalance(seller, 999999);

  quickList(s, { sellerId: seller, category: 'tools', itemId: 'pickaxe', itemName: 'Pickaxe', reservePrice: 100, mode: AH.MODE_OPEN });
  quickList(s, { sellerId: seller, category: 'tools', itemId: 'hammer',  itemName: 'Hammer',  reservePrice: 50,  mode: AH.MODE_SEALED });
  quickList(s, { sellerId: seller, category: 'food',  itemId: 'bread',   itemName: 'Bread',   reservePrice: 10,  buyoutPrice: 30 });

  // Filter by itemId
  var r1 = AH.searchAuctions(s, { itemId: 'pickaxe' });
  assertEqual(r1.total, 1, 'filter by itemId');

  // Filter by mode
  var r2 = AH.searchAuctions(s, { mode: AH.MODE_SEALED });
  assertGTE(r2.total, 1, 'sealed filter');

  // Filter by minPrice
  var r3 = AH.searchAuctions(s, { category: 'tools', minPrice: 75 });
  assertEqual(r3.total, 1, 'minPrice filter');

  // Filter by maxPrice
  var r4 = AH.searchAuctions(s, { category: 'tools', maxPrice: 75 });
  assertEqual(r4.total, 1, 'maxPrice filter');

  // Filter hasBuyout
  var r5 = AH.searchAuctions(s, { hasBuyout: true });
  assertGTE(r5.total, 1, 'hasBuyout filter');

  // Filter by sellerId
  var r6 = AH.searchAuctions(s, { sellerId: seller });
  assertGTE(r6.total, 3, 'sellerId filter');
})();

// ---------------------------------------------------------------------------
// SUITE 38: searchAuctions — sorting
// ---------------------------------------------------------------------------
suite('searchAuctions — sorting');

(function() {
  var seller = uid('sort_s');
  var s = stateWithBalance(seller, 999999);

  quickList(s, { sellerId: seller, category: 'test_sort', reservePrice: 300, itemId: 'c', itemName: 'C' });
  quickList(s, { sellerId: seller, category: 'test_sort', reservePrice: 100, itemId: 'a', itemName: 'A' });
  quickList(s, { sellerId: seller, category: 'test_sort', reservePrice: 200, itemId: 'b', itemName: 'B' });

  var asc  = AH.searchAuctions(s, { category: 'test_sort', sortBy: 'price_asc' });
  assertEqual(asc.results[0].reservePrice, 100,  'price_asc: first = 100');
  assertEqual(asc.results[2].reservePrice, 300,  'price_asc: last = 300');

  var desc = AH.searchAuctions(s, { category: 'test_sort', sortBy: 'price_desc' });
  assertEqual(desc.results[0].reservePrice, 300, 'price_desc: first = 300');
  assertEqual(desc.results[2].reservePrice, 100, 'price_desc: last = 100');
})();

// ---------------------------------------------------------------------------
// SUITE 39: searchAuctions — pagination
// ---------------------------------------------------------------------------
suite('searchAuctions — pagination');

(function() {
  // Use multiple sellers so we don't hit the MAX_ACTIVE_LISTINGS_PER_SELLER cap
  var s = freshState();
  AH.initAuctionHouse(s);
  if (!s.ledger) s.ledger = { balances: {}, transactions: [] };

  for (var i = 0; i < 10; i++) {
    var pgSeller = uid('pg_s');
    s.ledger.balances[pgSeller] = 99999;
    quickList(s, { sellerId: pgSeller, category: 'pg_cat', itemId: 'pg_item_' + i, itemName: 'PG Item ' + i });
  }

  var page1 = AH.searchAuctions(s, { category: 'pg_cat', limit: 3, offset: 0 });
  assertEqual(page1.results.length, 3,  'page 1: 3 results');
  assertEqual(page1.total, 10,          'total = 10');

  var page2 = AH.searchAuctions(s, { category: 'pg_cat', limit: 3, offset: 3 });
  assertEqual(page2.results.length, 3,  'page 2: 3 results');

  var page4 = AH.searchAuctions(s, { category: 'pg_cat', limit: 3, offset: 9 });
  assertEqual(page4.results.length, 1,  'page 4: 1 result');
})();

// ---------------------------------------------------------------------------
// SUITE 40: searchAuctions — ended auctions excluded
// ---------------------------------------------------------------------------
suite('searchAuctions — ended excluded');

(function() {
  var seller = uid('ex_s');
  var bidder = uid('ex_b');
  var s = stateWithBalances({ [seller]: 5000, [bidder]: 5000 });

  var r = quickList(s, { sellerId: seller, category: 'ex_cat', reservePrice: 100 });
  AH.placeBid(s, { bidderId: bidder, auctionId: r.auctionId, amount: 150 });

  // Expire and resolve
  var auction = s.auctionHouse.auctions[s.auctionHouse.auctions.length - 1];
  auction.endTime = Date.now() - 1000;
  AH.resolveAuction(s, r.auctionId);

  var res = AH.searchAuctions(s, { category: 'ex_cat' });
  assertEqual(res.total, 0, 'ended auction excluded from search');
})();

// ---------------------------------------------------------------------------
// SUITE 41: getAuction — not found
// ---------------------------------------------------------------------------
suite('getAuction — not found');

(function() {
  var s = freshState();
  AH.initAuctionHouse(s);
  var a = AH.getAuction(s, 'nonexistent_id');
  assertEqual(a, null, 'returns null for nonexistent auction');
})();

// ---------------------------------------------------------------------------
// SUITE 42: getSellerRating — defaults for new seller
// ---------------------------------------------------------------------------
suite('getSellerRating — defaults');

(function() {
  var s = freshState();
  AH.initAuctionHouse(s);
  var r = AH.getSellerRating(s, 'brand_new_seller');
  assertEqual(r.totalSales,   0,   'totalSales = 0');
  assertEqual(r.totalCancels, 0,   'totalCancels = 0');
  assertEqual(r.successRate,  1.0, 'successRate = 1.0');
  assertArray(r.ratingHistory,     'ratingHistory is array');
  assertEqual(r.ratingHistory.length, 0, 'no history');
})();

// ---------------------------------------------------------------------------
// SUITE 43: getSellerRating — after sales
// ---------------------------------------------------------------------------
suite('getSellerRating — after sales');

(function() {
  var seller  = uid('sr_s');
  var bidder  = uid('sr_b');
  var s = stateWithBalances({ [seller]: 999999, [bidder]: 999999 });

  // Complete a sale
  var r = quickList(s, { sellerId: seller, reservePrice: 100 });
  AH.placeBid(s, { bidderId: bidder, auctionId: r.auctionId, amount: 150 });
  var auction = s.auctionHouse.auctions[s.auctionHouse.auctions.length - 1];
  auction.endTime = Date.now() - 1000;
  AH.resolveAuction(s, r.auctionId);

  var rating = AH.getSellerRating(s, seller);
  assertEqual(rating.totalSales,   1,   'one sale recorded');
  assertEqual(rating.successRate,  1.0, 'successRate = 1.0 (all sales)');
  assertEqual(rating.ratingHistory.length, 1, 'one history entry');
  assertEqual(rating.ratingHistory[0].success, true, 'history entry: success');
})();

// ---------------------------------------------------------------------------
// SUITE 44: getSellerRating — mixed sales and cancels
// ---------------------------------------------------------------------------
suite('getSellerRating — mixed');

(function() {
  var seller  = uid('mix_s');
  var bidder  = uid('mix_b');
  var s = stateWithBalances({ [seller]: 999999, [bidder]: 999999 });

  // Sale
  var r1 = quickList(s, { sellerId: seller, reservePrice: 100 });
  AH.placeBid(s, { bidderId: bidder, auctionId: r1.auctionId, amount: 150 });
  var a1 = s.auctionHouse.auctions[s.auctionHouse.auctions.length - 1];
  a1.endTime = Date.now() - 1000;
  AH.resolveAuction(s, r1.auctionId);

  // Cancel
  var r2 = quickList(s, { sellerId: seller, reservePrice: 100 });
  AH.cancelAuction(s, { sellerId: seller, auctionId: r2.auctionId });

  var rating = AH.getSellerRating(s, seller);
  assertEqual(rating.totalSales,   1, 'one sale');
  assertEqual(rating.totalCancels, 1, 'one cancel');
  assertApprox(rating.successRate, 0.5, 0.001, 'successRate = 0.5');
})();

// ---------------------------------------------------------------------------
// SUITE 45: tickAuctions
// ---------------------------------------------------------------------------
suite('tickAuctions');

(function() {
  var seller  = uid('tick_s');
  var bidder  = uid('tick_b');
  var s = stateWithBalances({ [seller]: 999999, [bidder]: 999999 });

  var r1 = quickList(s, { sellerId: seller, reservePrice: 100 });
  var r2 = quickList(s, { sellerId: seller, reservePrice: 100 });

  // Place bid on r1
  AH.placeBid(s, { bidderId: bidder, auctionId: r1.auctionId, amount: 150 });

  // Expire only r1
  var auctions = s.auctionHouse.auctions;
  for (var i = 0; i < auctions.length; i++) {
    if (auctions[i].id === r1.auctionId) {
      auctions[i].endTime = Date.now() - 1000;
    }
  }

  var results = AH.tickAuctions(s);
  assertEqual(results.length, 1,              'one auction resolved by tick');
  assertEqual(results[0].auctionId, r1.auctionId, 'correct auction resolved');
  assertEqual(results[0].winnerId, bidder,    'correct winner');

  // r2 still active
  var a2 = AH.getAuction(s, r2.auctionId);
  assertEqual(a2.status, 'active',            'r2 still active');
})();

// ---------------------------------------------------------------------------
// SUITE 46: tickAuctions — multiple expired
// ---------------------------------------------------------------------------
suite('tickAuctions — multiple expired');

(function() {
  var seller = uid('mtick_s');
  var s = stateWithBalance(seller, 999999);

  var ids = [];
  for (var i = 0; i < 3; i++) {
    var r = quickList(s, { sellerId: seller, reservePrice: 100 });
    ids.push(r.auctionId);
  }

  // Expire all
  var auctions = s.auctionHouse.auctions;
  for (var j = 0; j < auctions.length; j++) {
    auctions[j].endTime = Date.now() - 1000;
  }

  var results = AH.tickAuctions(s);
  assertGTE(results.length, 3, 'at least 3 auctions resolved');
})();

// ---------------------------------------------------------------------------
// SUITE 47: getEscrowBalance
// ---------------------------------------------------------------------------
suite('getEscrowBalance');

(function() {
  var seller = uid('escrw_s');
  var bidder = uid('escrw_b');
  var s = stateWithBalances({ [seller]: 5000, [bidder]: 5000 });

  var r = quickList(s, { sellerId: seller, reservePrice: 100 });
  assertEqual(AH.getEscrowBalance(s, r.auctionId, bidder), 0, 'escrow = 0 before bid');

  AH.placeBid(s, { bidderId: bidder, auctionId: r.auctionId, amount: 200 });
  assertEqual(AH.getEscrowBalance(s, r.auctionId, bidder), 200, 'escrow = 200 after bid');

  // Nonexistent auction
  assertEqual(AH.getEscrowBalance(s, 'fake_id', bidder), 0, 'escrow = 0 for nonexistent');
})();

// ---------------------------------------------------------------------------
// SUITE 48: getAuctionsByCategory
// ---------------------------------------------------------------------------
suite('getAuctionsByCategory');

(function() {
  var seller = uid('gc_s');
  var s = stateWithBalance(seller, 999999);

  quickList(s, { sellerId: seller, category: 'rare_gems', itemId: 'ruby', itemName: 'Ruby' });
  quickList(s, { sellerId: seller, category: 'rare_gems', itemId: 'sapphire', itemName: 'Sapphire' });
  quickList(s, { sellerId: seller, category: 'potions',   itemId: 'mana_pot', itemName: 'Mana Pot' });

  var gems = AH.getAuctionsByCategory(s, 'rare_gems');
  assertEqual(gems.length, 2, 'two rare_gems auctions');

  var pots = AH.getAuctionsByCategory(s, 'potions');
  assertEqual(pots.length, 1, 'one potions auction');

  var none = AH.getAuctionsByCategory(s, 'nonexistent_cat');
  assertEqual(none.length, 0, 'empty array for unknown category');
})();

// ---------------------------------------------------------------------------
// SUITE 49: getStats
// ---------------------------------------------------------------------------
suite('getStats');

(function() {
  var seller = uid('st_s');
  var bidder = uid('st_b');
  var s = stateWithBalances({ [seller]: 999999, [bidder]: 999999 });

  var r1 = quickList(s, { sellerId: seller, reservePrice: 100 });
  var r2 = quickList(s, { sellerId: seller, reservePrice: 200 });
  AH.cancelAuction(s, { sellerId: seller, auctionId: r2.auctionId });
  AH.placeBid(s, { bidderId: bidder, auctionId: r1.auctionId, amount: 150 });

  var a = s.auctionHouse.auctions[0];
  a.endTime = Date.now() - 1000;
  AH.resolveAuction(s, r1.auctionId);

  var stats = AH.getStats(s);
  assertEqual(stats.activeListings,    0, 'no active listings');
  assertEqual(stats.endedListings,     1, 'one ended listing');
  assertEqual(stats.cancelledListings, 1, 'one cancelled listing');
  assertEqual(stats.totalListings,     2, 'total = 2');
  assertGT(stats.totalFeesDestroyed,   0, 'fees destroyed > 0');
  assertEqual(stats.totalVolumeTraded, 150, 'volume = 150');
})();

// ---------------------------------------------------------------------------
// SUITE 50: getActiveAuctions
// ---------------------------------------------------------------------------
suite('getActiveAuctions');

(function() {
  var seller = uid('ga_s');
  var bidder = uid('ga_b');
  var s = stateWithBalances({ [seller]: 999999, [bidder]: 999999 });

  var r1 = quickList(s, { sellerId: seller, reservePrice: 100 });
  var r2 = quickList(s, { sellerId: seller, reservePrice: 200 });

  // Expire r2
  var auctions = s.auctionHouse.auctions;
  for (var i = 0; i < auctions.length; i++) {
    if (auctions[i].id === r2.auctionId) {
      auctions[i].endTime = Date.now() - 1000;
    }
  }
  AH.resolveAuction(s, r2.auctionId);

  var active = AH.getActiveAuctions(s);
  // r1 should still be active, r2 ended
  var hasR1 = active.some(function(a) { return a.id === r1.auctionId; });
  var hasR2 = active.some(function(a) { return a.id === r2.auctionId; });
  assertEqual(hasR1, true,  'r1 in active list');
  assertEqual(hasR2, false, 'r2 not in active list');
})();

// ---------------------------------------------------------------------------
// SUITE 51: Spark escrow — full lifecycle
// ---------------------------------------------------------------------------
suite('Spark escrow — full auction lifecycle');

(function() {
  var seller  = uid('esc_s');
  var winner  = uid('esc_w');
  var loser   = uid('esc_l');
  var s = stateWithBalances({ [seller]: 5000, [winner]: 5000, [loser]: 5000 });

  var r = quickList(s, { sellerId: seller, reservePrice: 100 });
  AH.placeBid(s, { bidderId: loser,  auctionId: r.auctionId, amount: 150 });
  AH.placeBid(s, { bidderId: winner, auctionId: r.auctionId, amount: 202 });

  // Loser is now refunded after outbid; winner holds escrow
  assertEqual(getBalance(s, loser), 5000,  'loser refunded after outbid');
  assertEqual(AH.getEscrowBalance(s, r.auctionId, winner), 202, 'winner escrow = 202');
  assertEqual(getBalance(s, winner), 5000 - 202, 'winner balance reduced');

  // Expire and resolve
  var auction = s.auctionHouse.auctions[s.auctionHouse.auctions.length - 1];
  auction.endTime = Date.now() - 1000;
  AH.resolveAuction(s, r.auctionId);

  // Winner escrow cleared, seller paid
  assertEqual(AH.getEscrowBalance(s, r.auctionId, winner), 0, 'winner escrow cleared');
  assertEqual(getBalance(s, loser), 5000, 'loser fully returned');
  assertEqual(getBalance(s, winner), 5000 - 202, 'winner paid 202');

  var listingFee = r.listingFee;
  assertEqual(getBalance(s, seller), 5000 - listingFee + 202, 'seller: paid fee, received 202');
})();

// ---------------------------------------------------------------------------
// SUITE 52: Listing fee — minimum floor
// ---------------------------------------------------------------------------
suite('Listing fee — minimum floor enforced');

(function() {
  var seller = uid('floor_s');
  var s = stateWithBalance(seller, 5000);

  // 5% of 5 = 0.25 → floor to 1
  var r = AH.listItem(s, {
    sellerId:     seller,
    itemId:       'tiny_item',
    itemName:     'Tiny Item',
    category:     'misc',
    quantity:     1,
    reservePrice: 5,
    durationMs:   3600000
  });
  assertEqual(r.success, true,     'listing with small reserve succeeds');
  assertEqual(r.listingFee, 1,     'listing fee floored to 1');
})();

// ---------------------------------------------------------------------------
// SUITE 53: Multiple concurrent auctions — isolation
// ---------------------------------------------------------------------------
suite('Multiple concurrent auctions — isolation');

(function() {
  var seller  = uid('conc_s');
  var bidder  = uid('conc_b');
  var s = stateWithBalances({ [seller]: 999999, [bidder]: 999999 });

  var r1 = quickList(s, { sellerId: seller, category: 'cat_a', reservePrice: 100 });
  var r2 = quickList(s, { sellerId: seller, category: 'cat_b', reservePrice: 200 });

  AH.placeBid(s, { bidderId: bidder, auctionId: r1.auctionId, amount: 150 });
  AH.placeBid(s, { bidderId: bidder, auctionId: r2.auctionId, amount: 250 });

  var a1 = AH.getAuction(s, r1.auctionId);
  var a2 = AH.getAuction(s, r2.auctionId);

  assertEqual(a1.topBidAmount, 150, 'auction 1 top bid = 150');
  assertEqual(a2.topBidAmount, 250, 'auction 2 top bid = 250');
  assertEqual(a1.bidCount, 1, 'auction 1 bid count = 1');
  assertEqual(a2.bidCount, 1, 'auction 2 bid count = 1');

  var e1 = AH.getEscrowBalance(s, r1.auctionId, bidder);
  var e2 = AH.getEscrowBalance(s, r2.auctionId, bidder);
  assertEqual(e1, 150, 'escrow auction 1 = 150');
  assertEqual(e2, 250, 'escrow auction 2 = 250');
})();

// ---------------------------------------------------------------------------
// SUITE 54: Sealed bidding — highest wins
// ---------------------------------------------------------------------------
suite('Sealed bidding — highest wins at resolution');

(function() {
  var seller  = uid('sh_win_s');
  var bidderA = uid('sh_win_a');
  var bidderB = uid('sh_win_b');
  var bidderC = uid('sh_win_c');
  var s = stateWithBalances({
    [seller]:  999999,
    [bidderA]: 999999,
    [bidderB]: 999999,
    [bidderC]: 999999
  });

  var r = quickList(s, { sellerId: seller, mode: AH.MODE_SEALED, reservePrice: 100 });
  AH.placeBid(s, { bidderId: bidderA, auctionId: r.auctionId, amount: 200 });
  AH.placeBid(s, { bidderId: bidderB, auctionId: r.auctionId, amount: 500 });
  AH.placeBid(s, { bidderId: bidderC, auctionId: r.auctionId, amount: 350 });

  var auction = s.auctionHouse.auctions[s.auctionHouse.auctions.length - 1];
  auction.endTime = Date.now() - 1000;

  var res = AH.resolveAuction(s, r.auctionId);
  assertEqual(res.winnerId,   bidderB, 'bidderB (highest) wins');
  assertEqual(res.finalPrice, 500,     'finalPrice = 500');

  // Losers refunded
  assertEqual(getBalance(s, bidderA), 999999, 'bidderA refunded');
  assertEqual(getBalance(s, bidderC), 999999, 'bidderC refunded');
})();

// ---------------------------------------------------------------------------
// SUITE 55: Listing fee rate constant
// ---------------------------------------------------------------------------
suite('Listing fee rate = 5% per Constitution §6.5');

(function() {
  assertEqual(AH.LISTING_FEE_RATE, 0.05, 'LISTING_FEE_RATE = 0.05 (5%)');

  // Verify at key price points
  var cases = [
    [100, 5],
    [1000, 50],
    [500, 25],
    [200, 10],
    [2000, 100]
  ];
  for (var i = 0; i < cases.length; i++) {
    var price = cases[i][0];
    var expected = cases[i][1];
    assertEqual(AH.calcListingFee(price), expected, 'fee(' + price + ')=' + expected);
  }
})();

// ---------------------------------------------------------------------------
// SUITE 56: searchAuctions — bids_desc sort
// ---------------------------------------------------------------------------
suite('searchAuctions — bids_desc sort');

(function() {
  var seller  = uid('bd_s');
  var bidder  = uid('bd_b');
  var s = stateWithBalances({ [seller]: 999999, [bidder]: 999999 });

  var r1 = quickList(s, { sellerId: seller, category: 'bcat', itemId: 'item1', itemName: 'Item1', reservePrice: 100 });
  var r2 = quickList(s, { sellerId: seller, category: 'bcat', itemId: 'item2', itemName: 'Item2', reservePrice: 100 });

  // r1 gets one bid, r2 gets none
  AH.placeBid(s, { bidderId: bidder, auctionId: r1.auctionId, amount: 150 });

  var res = AH.searchAuctions(s, { category: 'bcat', sortBy: 'bids_desc' });
  assertEqual(res.results[0].id, r1.auctionId, 'auction with most bids first');
  assertEqual(res.results[1].id, r2.auctionId, 'auction with no bids last');
})();

// ---------------------------------------------------------------------------
// SUITE 57: searchAuctions — time_desc sort
// ---------------------------------------------------------------------------
suite('searchAuctions — time_desc sort');

(function() {
  var seller = uid('td_s');
  var s = stateWithBalance(seller, 999999);

  var r1 = quickList(s, { sellerId: seller, category: 'tdcat', itemId: 'ti1', itemName: 'T1', durationMs: 3600000, reservePrice: 100 });
  var r2 = quickList(s, { sellerId: seller, category: 'tdcat', itemId: 'ti2', itemName: 'T2', durationMs: 172800000, reservePrice: 100 });

  var res = AH.searchAuctions(s, { category: 'tdcat', sortBy: 'time_desc' });
  // r2 has longest duration (furthest end time)
  assertEqual(res.results[0].id, r2.auctionId, 'longest duration listed first (time_desc)');
})();

// ---------------------------------------------------------------------------
// SUITE 58: getAuction — all fields present
// ---------------------------------------------------------------------------
suite('getAuction — all fields present');

(function() {
  var seller = uid('af_s');
  var s = stateWithBalance(seller, 5000);
  var r = quickList(s, { sellerId: seller, reservePrice: 100, buyoutPrice: 500,
                          quantity: 3, description: 'Test desc' });
  var a = AH.getAuction(s, r.auctionId);

  assertDefined(a.id,           'field: id');
  assertDefined(a.sellerId,     'field: sellerId');
  assertDefined(a.itemId,       'field: itemId');
  assertDefined(a.itemName,     'field: itemName');
  assertDefined(a.category,     'field: category');
  assertDefined(a.quantity,     'field: quantity');
  assertDefined(a.reservePrice, 'field: reservePrice');
  assertDefined(a.buyoutPrice,  'field: buyoutPrice');
  assertDefined(a.description,  'field: description');
  assertDefined(a.mode,         'field: mode');
  assertDefined(a.status,       'field: status');
  assertDefined(a.startTime,    'field: startTime');
  assertDefined(a.endTime,      'field: endTime');
  assertType(a.topBidAmount, 'number', 'field: topBidAmount');
  assertType(a.bidCount,     'number', 'field: bidCount');
  assertType(a.listingFee,   'number', 'field: listingFee');
})();

// ---------------------------------------------------------------------------
// SUITE 59: searchAuctions — returns summary fields only (not full bid arrays)
// ---------------------------------------------------------------------------
suite('searchAuctions — result shape');

(function() {
  var seller = uid('shape_s');
  var s = stateWithBalance(seller, 5000);
  quickList(s, { sellerId: seller, category: 'shape_cat', reservePrice: 100 });

  var res = AH.searchAuctions(s, { category: 'shape_cat' });
  var first = res.results[0];
  assertDefined(first.id,           'result: id');
  assertDefined(first.itemId,       'result: itemId');
  assertDefined(first.category,     'result: category');
  assertDefined(first.reservePrice, 'result: reservePrice');
  assertDefined(first.endTime,      'result: endTime');
  assertDefined(first.timeLeft,     'result: timeLeft');
  assertGT(first.timeLeft, 0,       'timeLeft > 0');
})();

// ---------------------------------------------------------------------------
// SUITE 60: Edge cases
// ---------------------------------------------------------------------------
suite('Edge cases');

(function() {
  // cancelAuction — not found
  var s = freshState();
  AH.initAuctionHouse(s);
  var r = AH.cancelAuction(s, { sellerId: 'x', auctionId: 'nope' });
  assertEqual(r.success, false, 'cancelAuction: not found → fail');

  // resolveAuction — not found
  var r2 = AH.resolveAuction(s, 'nope');
  assertEqual(r2.success, false, 'resolveAuction: not found → fail');

  // buyout — not found
  var r3 = AH.buyout(s, { buyerId: 'x', auctionId: 'nope' });
  assertEqual(r3.success, false, 'buyout: not found → fail');

  // getBidHistory — not found
  var r4 = AH.getBidHistory(s, 'nope');
  assertEqual(r4.success, false, 'getBidHistory: not found → fail');

  // placeBid on null params
  var r5 = AH.placeBid(s, null);
  assertEqual(r5.success, false, 'placeBid null params → fail');

  // listItem with null params
  var r6 = AH.listItem(s, null);
  assertEqual(r6.success, false, 'listItem null params → fail');
})();

// ---------------------------------------------------------------------------
// SUITE 61: Auction IDs are unique
// ---------------------------------------------------------------------------
suite('Auction IDs are unique');

(function() {
  var seller = uid('uniq_s');
  var s = stateWithBalance(seller, 999999);
  var ids = {};
  for (var i = 0; i < 10; i++) {
    var r = quickList(s, { sellerId: seller, itemId: 'item_' + i, itemName: 'Item ' + i });
    assert(!ids[r.auctionId], 'auction ID ' + r.auctionId + ' is unique');
    ids[r.auctionId] = true;
  }
})();

// ---------------------------------------------------------------------------
// SUITE 62: Bid IDs are unique
// ---------------------------------------------------------------------------
suite('Bid IDs are unique');

(function() {
  var seller = uid('bid_uniq_s');
  var s = stateWithBalances({ [seller]: 999999 });
  var r = quickList(s, { sellerId: seller, reservePrice: 100 });

  var bidIds = {};
  for (var i = 0; i < 5; i++) {
    var bidder = uid('bid_uniq_b');
    s.ledger.balances[bidder] = 999999;
    var amount = 100 + (i + 1) * 10;
    var b = AH.placeBid(s, { bidderId: bidder, auctionId: r.auctionId, amount: amount });
    if (b.success) {
      assert(!bidIds[b.bidId], 'bid ID is unique');
      bidIds[b.bidId] = true;
    }
  }
})();

// ---------------------------------------------------------------------------
// SUITE 63: getStats — zero state
// ---------------------------------------------------------------------------
suite('getStats — empty house');

(function() {
  var s = freshState();
  AH.initAuctionHouse(s);
  var stats = AH.getStats(s);
  assertEqual(stats.totalListings,     0, 'totalListings = 0');
  assertEqual(stats.activeListings,    0, 'activeListings = 0');
  assertEqual(stats.endedListings,     0, 'endedListings = 0');
  assertEqual(stats.cancelledListings, 0, 'cancelledListings = 0');
  assertEqual(stats.totalFeesDestroyed,0, 'totalFeesDestroyed = 0');
  assertEqual(stats.totalVolumeTraded, 0, 'totalVolumeTraded = 0');
})();

// ---------------------------------------------------------------------------
// SUITE 64: Description optional
// ---------------------------------------------------------------------------
suite('listItem — description optional');

(function() {
  var seller = uid('desc_s');
  var s = stateWithBalance(seller, 5000);
  var r = AH.listItem(s, {
    sellerId: seller, itemId: 'item', itemName: 'Item',
    quantity: 1, reservePrice: 100, durationMs: 3600000
    // no description
  });
  assertEqual(r.success, true, 'listing without description succeeds');
  var a = AH.getAuction(s, r.auctionId);
  assertEqual(a.description, '', 'description defaults to empty string');
})();

// ---------------------------------------------------------------------------
// SUITE 65: Category defaults to misc
// ---------------------------------------------------------------------------
suite('listItem — category defaults to misc');

(function() {
  var seller = uid('misc_s');
  var s = stateWithBalance(seller, 5000);
  var r = AH.listItem(s, {
    sellerId: seller, itemId: 'item', itemName: 'Item',
    quantity: 1, reservePrice: 100, durationMs: 3600000
    // no category
  });
  assertEqual(r.success, true, 'listing without category succeeds');
  var a = AH.getAuction(s, r.auctionId);
  assertEqual(a.category, 'misc', 'category defaults to misc');
})();

// ---------------------------------------------------------------------------
// SUITE 66: Sealed bids — no increment rule (any amount >= reserve)
// ---------------------------------------------------------------------------
suite('Sealed bids — no increment rule');

(function() {
  var seller  = uid('sno_s');
  var bidder1 = uid('sno_b1');
  var bidder2 = uid('sno_b2');
  var s = stateWithBalances({ [seller]: 5000, [bidder1]: 5000, [bidder2]: 5000 });

  var r = quickList(s, { sellerId: seller, mode: AH.MODE_SEALED, reservePrice: 100 });

  // bidder1 bids 500
  AH.placeBid(s, { bidderId: bidder1, auctionId: r.auctionId, amount: 500 });

  // bidder2 bids 101 (would fail increment rule in open mode, but sealed has no such rule)
  var b2 = AH.placeBid(s, { bidderId: bidder2, auctionId: r.auctionId, amount: 101 });
  assertEqual(b2.success, true, 'sealed: any amount >= reserve accepted');
})();

// ---------------------------------------------------------------------------
// SUITE 67: getSellerRating — ratingHistory copy (not reference)
// ---------------------------------------------------------------------------
suite('getSellerRating — ratingHistory is a copy');

(function() {
  var seller = uid('copy_s');
  var bidder = uid('copy_b');
  var s = stateWithBalances({ [seller]: 999999, [bidder]: 999999 });

  var r = quickList(s, { sellerId: seller, reservePrice: 100 });
  AH.cancelAuction(s, { sellerId: seller, auctionId: r.auctionId });

  var rating1 = AH.getSellerRating(s, seller);
  rating1.ratingHistory.push({ ts: 0, success: true }); // mutate returned copy

  var rating2 = AH.getSellerRating(s, seller);
  assertEqual(rating2.ratingHistory.length, 1, 'mutation of copy does not affect source');
})();

// ---------------------------------------------------------------------------
// SUITE 68: placeBid — escrow for same bidder updated correctly on raise
// ---------------------------------------------------------------------------
suite('placeBid — escrow updates on same-bidder raise');

(function() {
  var seller = uid('eu_s');
  var bidder = uid('eu_b');
  var s = stateWithBalances({ [seller]: 5000, [bidder]: 5000 });

  var r = quickList(s, { sellerId: seller, reservePrice: 100 });

  AH.placeBid(s, { bidderId: bidder, auctionId: r.auctionId, amount: 200 });
  assertEqual(AH.getEscrowBalance(s, r.auctionId, bidder), 200, 'escrow after first bid');
  assertEqual(getBalance(s, bidder), 4800, 'balance after first bid');

  // Raise to 300
  AH.placeBid(s, { bidderId: bidder, auctionId: r.auctionId, amount: 300 });
  assertEqual(AH.getEscrowBalance(s, r.auctionId, bidder), 300, 'escrow after raise');
  assertEqual(getBalance(s, bidder), 4700, 'balance debited additional 100');
})();

// ---------------------------------------------------------------------------
// SUITE 69: Cancelled auction can't be bid on
// ---------------------------------------------------------------------------
suite('Cancelled auction rejects bids');

(function() {
  var seller = uid('crb_s');
  var bidder = uid('crb_b');
  var s = stateWithBalances({ [seller]: 5000, [bidder]: 5000 });

  var r = quickList(s, { sellerId: seller });
  AH.cancelAuction(s, { sellerId: seller, auctionId: r.auctionId });

  var b = AH.placeBid(s, { bidderId: bidder, auctionId: r.auctionId, amount: 200 });
  assertEqual(b.success, false, 'cancelled auction rejects bid');
})();

// ---------------------------------------------------------------------------
// SUITE 70: Ended auction can't be bid on
// ---------------------------------------------------------------------------
suite('Ended auction rejects bids');

(function() {
  var seller = uid('erb_s');
  var bidder = uid('erb_b');
  var s = stateWithBalances({ [seller]: 5000, [bidder]: 5000 });

  var r = quickList(s, { sellerId: seller, reservePrice: 100 });
  AH.placeBid(s, { bidderId: bidder, auctionId: r.auctionId, amount: 150 });

  var auction = s.auctionHouse.auctions[s.auctionHouse.auctions.length - 1];
  auction.endTime = Date.now() - 1000;
  AH.resolveAuction(s, r.auctionId);

  var bidder2 = uid('erb_b2');
  s.ledger.balances[bidder2] = 5000;
  var b = AH.placeBid(s, { bidderId: bidder2, auctionId: r.auctionId, amount: 200 });
  assertEqual(b.success, false, 'ended auction rejects bid');
})();

// ---------------------------------------------------------------------------
// SUITE 71: Multiple sellers, isolated ratings
// ---------------------------------------------------------------------------
suite('Multiple sellers — ratings isolated');

(function() {
  var sellerA = uid('msr_a');
  var sellerB = uid('msr_b');
  var bidder  = uid('msr_b');
  var s = stateWithBalances({ [sellerA]: 999999, [sellerB]: 999999, [bidder]: 999999 });

  // sellerA: 2 sales
  for (var i = 0; i < 2; i++) {
    var r = quickList(s, { sellerId: sellerA, reservePrice: 100 });
    AH.placeBid(s, { bidderId: bidder, auctionId: r.auctionId, amount: 150 });
    var a = s.auctionHouse.auctions[s.auctionHouse.auctions.length - 1];
    a.endTime = Date.now() - 1000;
    AH.resolveAuction(s, r.auctionId);
  }

  // sellerB: 1 cancel
  var rb = quickList(s, { sellerId: sellerB, reservePrice: 100 });
  AH.cancelAuction(s, { sellerId: sellerB, auctionId: rb.auctionId });

  var rA = AH.getSellerRating(s, sellerA);
  var rB = AH.getSellerRating(s, sellerB);

  assertEqual(rA.totalSales,   2, 'sellerA: 2 sales');
  assertEqual(rA.totalCancels, 0, 'sellerA: 0 cancels');
  assertEqual(rB.totalSales,   0, 'sellerB: 0 sales');
  assertEqual(rB.totalCancels, 1, 'sellerB: 1 cancel');
})();

// ---------------------------------------------------------------------------
// SUITE 72: Listing fee — large reserve price
// ---------------------------------------------------------------------------
suite('Listing fee — large reserve');

(function() {
  var seller = uid('lg_s');
  var s = stateWithBalance(seller, 999999);

  var r = AH.listItem(s, {
    sellerId:     seller,
    itemId:       'dragon_scale',
    itemName:     'Dragon Scale',
    category:     'rare',
    quantity:     1,
    reservePrice: 10000,
    durationMs:   86400000
  });
  assertEqual(r.success, true,    'large reserve listing succeeds');
  assertEqual(r.listingFee, 500,  'fee = 500 (5% of 10000)');

  var bal = getBalance(s, seller);
  assertEqual(bal, 999999 - 500, 'seller balance debited by 500');
})();

// ---------------------------------------------------------------------------
// SUITE 73: cancelAuction — not active (already ended)
// ---------------------------------------------------------------------------
suite('cancelAuction — already ended');

(function() {
  var seller = uid('ae_s');
  var bidder = uid('ae_b');
  var s = stateWithBalances({ [seller]: 5000, [bidder]: 5000 });

  var r = quickList(s, { sellerId: seller, reservePrice: 100 });
  AH.placeBid(s, { bidderId: bidder, auctionId: r.auctionId, amount: 150 });
  var auction = s.auctionHouse.auctions[s.auctionHouse.auctions.length - 1];
  auction.endTime = Date.now() - 1000;
  AH.resolveAuction(s, r.auctionId);

  var c = AH.cancelAuction(s, { sellerId: seller, auctionId: r.auctionId });
  assertEqual(c.success, false, 'cannot cancel ended auction');
})();

// ---------------------------------------------------------------------------
// SUITE 74: getBidHistory — empty auction
// ---------------------------------------------------------------------------
suite('getBidHistory — no bids');

(function() {
  var seller = uid('nb_s');
  var s = stateWithBalance(seller, 5000);
  var r = quickList(s, { sellerId: seller });

  var h = AH.getBidHistory(s, r.auctionId);
  assertEqual(h.success, true,    'getBidHistory succeeds on empty');
  assertArray(h.bids,             'bids is array');
  assertEqual(h.bids.length, 0,   'no bids');
})();

// ---------------------------------------------------------------------------
// SUITE 75: getAuctionsByCategory — after cancels
// ---------------------------------------------------------------------------
suite('getAuctionsByCategory — cancelled excluded');

(function() {
  var seller = uid('gac_s');
  var s = stateWithBalance(seller, 999999);

  var r1 = quickList(s, { sellerId: seller, category: 'ac_test', reservePrice: 100 });
  var r2 = quickList(s, { sellerId: seller, category: 'ac_test', reservePrice: 100 });
  AH.cancelAuction(s, { sellerId: seller, auctionId: r2.auctionId });

  var ids = AH.getAuctionsByCategory(s, 'ac_test');
  assertEqual(ids.length, 1, 'cancelled auction excluded from category index');
  assertEqual(ids[0], r1.auctionId, 'only active auction returned');
})();

// ---------------------------------------------------------------------------
// SUITE 76: buyout — updates seller rating
// ---------------------------------------------------------------------------
suite('buyout — updates seller rating');

(function() {
  var seller = uid('bsr_s');
  var buyer  = uid('bsr_b');
  var s = stateWithBalances({ [seller]: 5000, [buyer]: 5000 });

  var r = quickList(s, { sellerId: seller, reservePrice: 100, buyoutPrice: 300 });
  AH.buyout(s, { buyerId: buyer, auctionId: r.auctionId });

  var rating = AH.getSellerRating(s, seller);
  assertEqual(rating.totalSales, 1, 'buyout counted as sale');
})();

// ---------------------------------------------------------------------------
// SUITE 77: searchAuctions — expired active (not in results)
// ---------------------------------------------------------------------------
suite('searchAuctions — expired auction excluded even if status=active');

(function() {
  var seller = uid('exp_s');
  var s = stateWithBalance(seller, 5000);
  var r = quickList(s, { sellerId: seller, category: 'exp_test', reservePrice: 100 });

  // Manually force endTime to past without resolving
  var auction = s.auctionHouse.auctions[s.auctionHouse.auctions.length - 1];
  auction.endTime = Date.now() - 1000;

  var res = AH.searchAuctions(s, { category: 'exp_test' });
  assertEqual(res.total, 0, 'expired-but-unresolved auction excluded from search');
})();

// ---------------------------------------------------------------------------
// SUITE 78: placeBid — expired auction rejected
// ---------------------------------------------------------------------------
suite('placeBid — expired auction rejected');

(function() {
  var seller = uid('pbexp_s');
  var bidder = uid('pbexp_b');
  var s = stateWithBalances({ [seller]: 5000, [bidder]: 5000 });

  var r = quickList(s, { sellerId: seller, reservePrice: 100 });
  var auction = s.auctionHouse.auctions[s.auctionHouse.auctions.length - 1];
  auction.endTime = Date.now() - 1000;

  var b = AH.placeBid(s, { bidderId: bidder, auctionId: r.auctionId, amount: 150 });
  assertEqual(b.success, false, 'bid on expired auction → fail');
  assert(/expired/i.test(b.message || ''), 'message mentions expired');
})();

// ---------------------------------------------------------------------------
// SUITE 79: VALID_DURATIONS values
// ---------------------------------------------------------------------------
suite('VALID_DURATIONS values');

(function() {
  var d = AH.VALID_DURATIONS;
  assert(d.indexOf(3600000) !== -1,   '1h duration present');
  assert(d.indexOf(21600000) !== -1,  '6h duration present');
  assert(d.indexOf(86400000) !== -1,  '24h duration present');
  assert(d.indexOf(172800000) !== -1, '48h duration present');
})();

// ---------------------------------------------------------------------------
// SUITE 80: getActiveAuctions — empty
// ---------------------------------------------------------------------------
suite('getActiveAuctions — empty state');

(function() {
  var s = freshState();
  AH.initAuctionHouse(s);
  var active = AH.getActiveAuctions(s);
  assertArray(active,              'returns array');
  assertEqual(active.length, 0,   'empty state: no active auctions');
})();

// ---------------------------------------------------------------------------
// SUITE 81: Auction endTime calculation correct for each duration
// ---------------------------------------------------------------------------
suite('Auction endTime calculation');

(function() {
  var seller = uid('et_s');
  var s = stateWithBalance(seller, 999999);
  var durations = AH.VALID_DURATIONS;

  for (var i = 0; i < durations.length; i++) {
    var before = Date.now();
    var r = quickList(s, { sellerId: seller, durationMs: durations[i] });
    var after = Date.now();
    var a = AH.getAuction(s, r.auctionId);
    var expectedMin = before + durations[i];
    var expectedMax = after + durations[i];
    assertGTE(a.endTime, expectedMin, 'endTime >= before+duration for ' + durations[i]);
    assertLTE(a.endTime, expectedMax, 'endTime <= after+duration for ' + durations[i]);
  }
})();

// ---------------------------------------------------------------------------
// SUITE 82: searchAuctions — sellerId filter
// ---------------------------------------------------------------------------
suite('searchAuctions — sellerId filter isolation');

(function() {
  var sellerA = uid('sf_a');
  var sellerB = uid('sf_b');
  var s = stateWithBalances({ [sellerA]: 999999, [sellerB]: 999999 });

  quickList(s, { sellerId: sellerA, category: 'sf_cat', itemId: 'a1', itemName: 'A1' });
  quickList(s, { sellerId: sellerA, category: 'sf_cat', itemId: 'a2', itemName: 'A2' });
  quickList(s, { sellerId: sellerB, category: 'sf_cat', itemId: 'b1', itemName: 'B1' });

  var rA = AH.searchAuctions(s, { sellerId: sellerA, category: 'sf_cat' });
  assertEqual(rA.total, 2, 'sellerA has 2 listings');

  var rB = AH.searchAuctions(s, { sellerId: sellerB, category: 'sf_cat' });
  assertEqual(rB.total, 1, 'sellerB has 1 listing');
})();

// ---------------------------------------------------------------------------
// SUITE 83: Resolving cancelled auction → fail
// ---------------------------------------------------------------------------
suite('resolveAuction — cancelled auction');

(function() {
  var seller = uid('rca_s');
  var s = stateWithBalance(seller, 5000);
  var r = quickList(s, { sellerId: seller });
  AH.cancelAuction(s, { sellerId: seller, auctionId: r.auctionId });

  var res = AH.resolveAuction(s, r.auctionId);
  assertEqual(res.success, false, 'resolving cancelled → fail');
})();

// ---------------------------------------------------------------------------
// SUITE 84: Spark integrity — no double-charge
// ---------------------------------------------------------------------------
suite('Spark integrity — no double-charge');

(function() {
  var seller  = uid('di_s');
  var bidder1 = uid('di_b1');
  var bidder2 = uid('di_b2');
  var START   = 10000;
  var s = stateWithBalances({ [seller]: START, [bidder1]: START, [bidder2]: START });

  var r = quickList(s, { sellerId: seller, reservePrice: 100 });
  var fee = r.listingFee;

  AH.placeBid(s, { bidderId: bidder1, auctionId: r.auctionId, amount: 200 });
  AH.placeBid(s, { bidderId: bidder2, auctionId: r.auctionId, amount: 202 });
  // bidder1 was outbid and refunded

  // Expire and resolve
  var auction = s.auctionHouse.auctions[s.auctionHouse.auctions.length - 1];
  auction.endTime = Date.now() - 1000;
  AH.resolveAuction(s, r.auctionId);

  // Total Spark in the system (excluding SYSTEM sink):
  // seller starts with START, pays fee, receives 202  → START - fee + 202
  // bidder1 starts with START, bids 200, gets refunded → START
  // bidder2 starts with START, wins paying 202         → START - 202
  // SYSTEM receives fee

  var sellerBal  = getBalance(s, seller);
  var b1Bal      = getBalance(s, bidder1);
  var b2Bal      = getBalance(s, bidder2);
  var systemBal  = (s.ledger.balances['SYSTEM'] || 0);

  var totalAfter = sellerBal + b1Bal + b2Bal + systemBal;
  var totalBefore = START * 3;

  assertEqual(totalAfter, totalBefore, 'Spark conserved (no creation/destruction beyond fee sink)');
})();

// ---------------------------------------------------------------------------
// SUITE 85: listItem — null params
// ---------------------------------------------------------------------------
suite('listItem — null params');

(function() {
  var s = freshState();
  AH.initAuctionHouse(s);

  var r = AH.listItem(s, null);
  assertEqual(r.success, false, 'null params → fail');

  var r2 = AH.listItem(s, undefined);
  assertEqual(r2.success, false, 'undefined params → fail');
})();

// ---------------------------------------------------------------------------
// SUITE 86: cancelAuction — null params
// ---------------------------------------------------------------------------
suite('cancelAuction — null / missing params');

(function() {
  var s = freshState();
  AH.initAuctionHouse(s);

  var r = AH.cancelAuction(s, null);
  assertEqual(r.success, false, 'null params → fail');

  var r2 = AH.cancelAuction(s, { auctionId: 'x' });
  assertEqual(r2.success, false, 'no sellerId → fail');

  var r3 = AH.cancelAuction(s, { sellerId: 'x' });
  assertEqual(r3.success, false, 'no auctionId → fail');
})();

// ---------------------------------------------------------------------------
// SUITE 87: buyout — null params
// ---------------------------------------------------------------------------
suite('buyout — null / missing params');

(function() {
  var s = freshState();
  AH.initAuctionHouse(s);

  var r = AH.buyout(s, null);
  assertEqual(r.success, false, 'null params → fail');

  var r2 = AH.buyout(s, { auctionId: 'x' });
  assertEqual(r2.success, false, 'no buyerId → fail');

  var r3 = AH.buyout(s, { buyerId: 'x' });
  assertEqual(r3.success, false, 'no auctionId → fail');
})();

// ---------------------------------------------------------------------------
// SUITE 88: tickAuctions — no expired auctions
// ---------------------------------------------------------------------------
suite('tickAuctions — nothing to resolve');

(function() {
  var seller = uid('no_tick_s');
  var s = stateWithBalance(seller, 5000);
  quickList(s, { sellerId: seller });  // still active

  var results = AH.tickAuctions(s);
  assertArray(results,             'tickAuctions returns array');
  assertEqual(results.length, 0,   'no auctions resolved');
})();

// ---------------------------------------------------------------------------
// SUITE 89: tickAuctions — empty state
// ---------------------------------------------------------------------------
suite('tickAuctions — empty state');

(function() {
  var s = freshState();
  var results = AH.tickAuctions(s);
  assertArray(results,             'empty state: returns array');
  assertEqual(results.length, 0,   'empty state: zero results');
})();

// ---------------------------------------------------------------------------
// SUITE 90: searchAuctions — default limit = 50
// ---------------------------------------------------------------------------
suite('searchAuctions — default limit 50');

(function() {
  // Use many sellers (3 listings each) to avoid hitting MAX_ACTIVE_LISTINGS_PER_SELLER=20
  var s = freshState();
  AH.initAuctionHouse(s);
  if (!s.ledger) s.ledger = { balances: {}, transactions: [] };

  var count = 0;
  while (count < 60) {
    var limSeller = uid('lim50_s');
    s.ledger.balances[limSeller] = 999999;
    for (var batch = 0; batch < 3 && count < 60; batch++, count++) {
      quickList(s, { sellerId: limSeller, category: 'lim_cat', itemId: 'li_' + count, itemName: 'L ' + count });
    }
  }

  var res = AH.searchAuctions(s, { category: 'lim_cat' });
  assertEqual(res.results.length, 50, 'default limit = 50');
  assertEqual(res.total, 60,          'total = 60');
  assertEqual(res.limit, 50,          'limit field = 50');
})();

// ---------------------------------------------------------------------------
// SUITE 91: getStats — uniqueSellers
// ---------------------------------------------------------------------------
suite('getStats — uniqueSellers');

(function() {
  var sellerA = uid('us_a');
  var sellerB = uid('us_b');
  var s = stateWithBalances({ [sellerA]: 999999, [sellerB]: 999999 });

  quickList(s, { sellerId: sellerA });
  quickList(s, { sellerId: sellerA });
  quickList(s, { sellerId: sellerB });

  // cancel B's listing to trigger rating creation
  var r = quickList(s, { sellerId: sellerB });
  AH.cancelAuction(s, { sellerId: sellerB, auctionId: r.auctionId });

  var stats = AH.getStats(s);
  assertGTE(stats.uniqueSellers, 1, 'at least one unique seller');
})();

// ---------------------------------------------------------------------------
// SUITE 92: Auction mode field exposed in search
// ---------------------------------------------------------------------------
suite('searchAuctions result includes mode field');

(function() {
  var seller = uid('mode_s');
  var s = stateWithBalance(seller, 5000);
  quickList(s, { sellerId: seller, mode: AH.MODE_SEALED, category: 'mode_test' });

  var res = AH.searchAuctions(s, { category: 'mode_test' });
  assertEqual(res.results[0].mode, 'sealed', 'mode field present in search result');
})();

// ---------------------------------------------------------------------------
// SUITE 93: getBidHistory status field
// ---------------------------------------------------------------------------
suite('getBidHistory — status field');

(function() {
  var seller = uid('bhs_s');
  var bidder = uid('bhs_b');
  var s = stateWithBalances({ [seller]: 5000, [bidder]: 5000 });

  var r = quickList(s, { sellerId: seller });
  AH.placeBid(s, { bidderId: bidder, auctionId: r.auctionId, amount: 150 });

  var h = AH.getBidHistory(s, r.auctionId);
  assertEqual(h.status, 'active', 'status = active during auction');
})();

// ---------------------------------------------------------------------------
// SUITE 94: buyout — buyer with existing escrow
// ---------------------------------------------------------------------------
suite('buyout — buyer with prior bid uses escrow');

(function() {
  var seller = uid('eboy_s');
  var buyer  = uid('eboy_b');
  var s = stateWithBalances({ [seller]: 5000, [buyer]: 5000 });

  var r = quickList(s, { sellerId: seller, reservePrice: 100, buyoutPrice: 500 });
  // Buyer places a bid first (escrow some Spark)
  AH.placeBid(s, { bidderId: buyer, auctionId: r.auctionId, amount: 150 });

  var balBeforeBuyout = getBalance(s, buyer);
  var escrowBefore = AH.getEscrowBalance(s, r.auctionId, buyer);
  assertEqual(escrowBefore, 150, 'buyer escrow = 150');

  // Buyout: needs 500 total. Already has 150 in escrow, needs 350 more.
  var b = AH.buyout(s, { buyerId: buyer, auctionId: r.auctionId });
  assertEqual(b.success, true, 'buyout with prior escrow succeeds');

  var balAfterBuyout = getBalance(s, buyer);
  // Net loss: 500 - 150 (escrow already deducted) = 350 additional
  assertEqual(getBalance(s, buyer), balBeforeBuyout - (500 - 150), 'buyer balance: 350 additional');
})();

// ---------------------------------------------------------------------------
// SUITE 95: Quantity > 1 stored correctly
// ---------------------------------------------------------------------------
suite('listItem — quantity > 1');

(function() {
  var seller = uid('qty_s');
  var s = stateWithBalance(seller, 5000);
  var r = quickList(s, { sellerId: seller, quantity: 50, reservePrice: 100 });
  var a = AH.getAuction(s, r.auctionId);
  assertEqual(a.quantity, 50, 'quantity = 50');
})();

// ---------------------------------------------------------------------------
// Final summary
// ---------------------------------------------------------------------------
console.log('\n' + passed + ' passed, ' + failed + ' failed');

if (failures.length > 0) {
  console.log('\nFailed tests:');
  for (var fi = 0; fi < failures.length; fi++) {
    console.log('  - ' + failures[fi]);
  }
}

if (failed > 0) process.exit(1);
