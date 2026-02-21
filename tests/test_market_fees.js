/**
 * test_market_fees.js - Tests for Market Listing Fees (§6.5.2) and
 * Structure Maintenance (§6.5.1) in the JS Economy module.
 */
const { test, suite, report, assert } = require('./test_runner');
const Economy = require('../src/js/economy');

// ---------------------------------------------------------------------------
// MARKET LISTING FEE TESTS (§6.5.2)
// ---------------------------------------------------------------------------

suite('Market Listing Fee - Constants', function() {

  test('LISTING_FEE_RATE is 5% (0.05)', function() {
    assert.strictEqual(Economy.LISTING_FEE_RATE, 0.05,
      'Constitution §6.5.2 mandates 5% fee on asking price');
  });

  test('MAINTENANCE_COST is 1 Spark', function() {
    assert.strictEqual(Economy.MAINTENANCE_COST, 1,
      'Constitution §6.5.1 mandates 1 Spark per structure per day');
  });

  test('SYSTEM_SINK_ID is SYSTEM (void, not TREASURY)', function() {
    assert.strictEqual(Economy.SYSTEM_SINK_ID, 'SYSTEM',
      'Destroyed Spark must go to SYSTEM (§6.5.3 — void, not redistribution)');
  });

});

suite('Market Listing Fee - Fee Calculation', function() {

  test('Fee is 5% of asking price (round numbers)', function() {
    var ledger = Economy.createLedger();
    ledger.balances['seller'] = 200;

    // Price 100 -> 5% = 5
    var listing = Economy.createMarketListing(ledger, 'seller', { type: 'sword' }, 100);
    assert.strictEqual(listing.feePaid, 5,
      'Fee for price 100 should be 5 (100 * 0.05)');
  });

  test('Fee floors to integer (player-favorable)', function() {
    var ledger = Economy.createLedger();
    ledger.balances['seller'] = 100;

    // Price 21 -> 5% = 1.05 -> floor = 1
    var listing = Economy.createMarketListing(ledger, 'seller', { type: 'herb' }, 21);
    assert.strictEqual(listing.feePaid, 1,
      'Fee should floor to 1 (player-favorable)');
  });

  test('Minimum fee is 1 Spark even for low prices', function() {
    var ledger = Economy.createLedger();
    ledger.balances['seller'] = 50;

    // Price 5 -> 5% = 0.25 -> floor = 0, but minimum is 1
    var listing = Economy.createMarketListing(ledger, 'seller', { type: 'seed' }, 5);
    assert.strictEqual(listing.feePaid, 1,
      'Minimum fee is 1 Spark regardless of price');
  });

  test('Minimum fee for price of 1', function() {
    var ledger = Economy.createLedger();
    ledger.balances['seller'] = 10;

    var listing = Economy.createMarketListing(ledger, 'seller', { type: 'leaf' }, 1);
    assert.strictEqual(listing.feePaid, 1,
      'Price of 1 Spark still incurs minimum 1 Spark fee');
  });

  test('Fee calculation for large asking price', function() {
    var ledger = Economy.createLedger();
    ledger.balances['seller'] = 1000;

    // Price 500 -> 5% = 25
    var listing = Economy.createMarketListing(ledger, 'seller', { type: 'artifact' }, 500);
    assert.strictEqual(listing.feePaid, 25,
      'Fee for price 500 should be 25');
  });

  test('Fee calculation for price 20 (boundary)', function() {
    var ledger = Economy.createLedger();
    ledger.balances['seller'] = 100;

    // Price 20 -> 5% = 1
    var listing = Economy.createMarketListing(ledger, 'seller', { type: 'item' }, 20);
    assert.strictEqual(listing.feePaid, 1);
  });

});

suite('Market Listing Fee - Deduction at Listing Time', function() {

  test('Fee is deducted from seller balance immediately on listing', function() {
    var ledger = Economy.createLedger();
    ledger.balances['seller'] = 100;

    Economy.createMarketListing(ledger, 'seller', { type: 'sword' }, 100);
    // Fee = 5
    assert.strictEqual(Economy.getBalance(ledger, 'seller'), 95,
      'Fee must be deducted at listing time, not at sale time');
  });

  test('Seller balance reflects fee deduction even if item never sells', function() {
    var ledger = Economy.createLedger();
    ledger.balances['seller'] = 50;

    var listing = Economy.createMarketListing(ledger, 'seller', { type: 'widget' }, 40);
    // Fee = max(1, floor(40 * 0.05)) = 2
    assert.strictEqual(listing.feePaid, 2);
    assert.strictEqual(Economy.getBalance(ledger, 'seller'), 48,
      'Fee deducted at listing time regardless of whether item sells');
  });

  test('Multiple listings each incur separate fees', function() {
    var ledger = Economy.createLedger();
    ledger.balances['seller'] = 100;

    Economy.createMarketListing(ledger, 'seller', { type: 'item1' }, 100); // fee 5
    Economy.createMarketListing(ledger, 'seller', { type: 'item2' }, 100); // fee 5
    Economy.createMarketListing(ledger, 'seller', { type: 'item3' }, 100); // fee 5

    assert.strictEqual(Economy.getBalance(ledger, 'seller'), 85,
      'Three listings of 100 each cost 15 total in fees');
  });

  test('Listing records feePaid on the listing object', function() {
    var ledger = Economy.createLedger();
    ledger.balances['seller'] = 100;

    var listing = Economy.createMarketListing(ledger, 'seller', { type: 'gem' }, 60);
    // Fee = max(1, floor(60 * 0.05)) = 3
    assert(listing.feePaid !== undefined, 'listing.feePaid must be present');
    assert.strictEqual(listing.feePaid, 3);
  });

});

suite('Market Listing Fee - Spark Destroyed (SYSTEM Sink)', function() {

  test('Fee Spark goes to SYSTEM sink, not TREASURY', function() {
    var ledger = Economy.createLedger();
    ledger.balances['seller'] = 100;
    ledger.balances[Economy.TREASURY_ID] = 0;

    Economy.createMarketListing(ledger, 'seller', { type: 'item' }, 100);
    // Fee = 5

    assert.strictEqual(Economy.getBalance(ledger, Economy.TREASURY_ID), 0,
      'TREASURY must NOT receive listing fee Spark (§6.5.3 — destroy, not redistribute)');
  });

  test('Fee creates listing_fee transaction pointing to SYSTEM', function() {
    var ledger = Economy.createLedger();
    ledger.balances['seller'] = 100;

    Economy.createMarketListing(ledger, 'seller', { type: 'item' }, 100);

    var feeTxns = ledger.transactions.filter(function(tx) {
      return tx.type === 'listing_fee';
    });
    assert.strictEqual(feeTxns.length, 1, 'Should have exactly one listing_fee transaction');
    assert.strictEqual(feeTxns[0].to, Economy.SYSTEM_SINK_ID,
      'Fee transaction must point to SYSTEM (void/sink)');
    assert.strictEqual(feeTxns[0].amount, 5);
    assert.strictEqual(feeTxns[0].from, 'seller');
  });

  test('Total Spark in economy decreases by fee amount', function() {
    var ledger = Economy.createLedger();
    ledger.balances['seller'] = 100;

    var totalBefore = Economy.getBalance(ledger, 'seller');
    Economy.createMarketListing(ledger, 'seller', { type: 'item' }, 100);
    var totalAfter = Economy.getBalance(ledger, 'seller');

    assert.strictEqual(totalBefore - totalAfter, 5,
      'Total Spark in circulation decreases by listing fee amount');
  });

});

suite('Market Listing Fee - Insufficient Balance Cases', function() {

  test('Listing fails when seller has 0 Spark', function() {
    var ledger = Economy.createLedger();
    ledger.balances['broke_seller'] = 0;

    var result = Economy.createMarketListing(ledger, 'broke_seller', { type: 'item' }, 100);
    assert.strictEqual(result.success, false,
      'Listing should fail when seller cannot afford minimum fee');
    assert.strictEqual(Economy.getBalance(ledger, 'broke_seller'), 0,
      'Balance unchanged on failed listing');
  });

  test('Listing fails when seller has less than minimum fee', function() {
    var ledger = Economy.createLedger();
    ledger.balances['seller'] = 0; // less than minimum fee of 1

    var result = Economy.createMarketListing(ledger, 'seller', { type: 'item' }, 50);
    assert.strictEqual(result.success, false);
  });

  test('Failed listing does not create a listing entry', function() {
    var ledger = Economy.createLedger();
    ledger.balances['broke_seller'] = 0;

    Economy.createMarketListing(ledger, 'broke_seller', { type: 'item' }, 100);

    var activeListings = Economy.getActiveListings(ledger);
    assert.strictEqual(activeListings.length, 0,
      'Failed listing should not appear in active listings');
  });

  test('Failed listing does not create a fee transaction', function() {
    var ledger = Economy.createLedger();
    ledger.balances['broke_seller'] = 0;

    Economy.createMarketListing(ledger, 'broke_seller', { type: 'item' }, 100);

    var feeTxns = ledger.transactions.filter(function(tx) {
      return tx.type === 'listing_fee';
    });
    assert.strictEqual(feeTxns.length, 0,
      'No fee transaction should be created for failed listings');
  });

  test('Seller with exactly fee amount can list', function() {
    var ledger = Economy.createLedger();
    ledger.balances['seller'] = 5; // exactly the fee for price 100

    var listing = Economy.createMarketListing(ledger, 'seller', { type: 'item' }, 100);
    // fee = 5, seller has 5 -> success
    assert.strictEqual(listing.active, true,
      'Seller with exactly the fee amount should be able to list');
    assert.strictEqual(Economy.getBalance(ledger, 'seller'), 0);
  });

  test('Seller with one less than fee cannot list (boundary)', function() {
    var ledger = Economy.createLedger();
    ledger.balances['seller'] = 4; // one less than fee of 5

    var result = Economy.createMarketListing(ledger, 'seller', { type: 'item' }, 100);
    assert.strictEqual(result.success, false,
      'Seller missing even 1 Spark for fee should not be able to list');
    assert.strictEqual(Economy.getBalance(ledger, 'seller'), 4,
      'Balance unchanged on failed listing');
  });

});

// ---------------------------------------------------------------------------
// STRUCTURE MAINTENANCE TESTS via applyMaintenance (§6.5.1)
// ---------------------------------------------------------------------------

suite('Structure Maintenance - Cost Calculation', function() {

  test('1 structure costs 1 Spark per day', function() {
    var ledger = Economy.createLedger();
    ledger.balances['owner'] = 10;

    var result = Economy.applyMaintenance(ledger, { 's1': 'owner' });

    assert.strictEqual(result.totalDestroyed, 1,
      'Exactly 1 Spark should be destroyed per structure per day');
    assert.strictEqual(Economy.getBalance(ledger, 'owner'), 9);
  });

  test('Multiple structures multiply cost', function() {
    var ledger = Economy.createLedger();
    ledger.balances['owner'] = 10;

    var result = Economy.applyMaintenance(ledger, {
      's1': 'owner',
      's2': 'owner',
      's3': 'owner'
    });

    assert.strictEqual(result.totalDestroyed, 3,
      '3 structures should cost 3 Spark total');
    assert.strictEqual(Economy.getBalance(ledger, 'owner'), 7);
  });

  test('Different owners each charged separately', function() {
    var ledger = Economy.createLedger();
    ledger.balances['alice'] = 5;
    ledger.balances['bob'] = 3;

    Economy.applyMaintenance(ledger, {
      's_alice': 'alice',
      's_bob': 'bob'
    });

    assert.strictEqual(Economy.getBalance(ledger, 'alice'), 4);
    assert.strictEqual(Economy.getBalance(ledger, 'bob'), 2);
  });

  test('MAINTENANCE_COST constant equals 1', function() {
    assert.strictEqual(Economy.MAINTENANCE_COST, 1,
      'MAINTENANCE_COST must be exactly 1 Spark per §6.5.1');
  });

});

suite('Structure Maintenance - Decay on Non-payment', function() {

  test('Owner at floor (0) cannot pay, structure decays', function() {
    var ledger = Economy.createLedger();
    ledger.balances['broke'] = 0;

    var result = Economy.applyMaintenance(ledger, { 'doomed_struct': 'broke' });

    assert.strictEqual(result.structuresDecayed.length, 1,
      'Structure should be marked for decay when owner has 0 Spark');
    assert.strictEqual(result.structuresDecayed[0], 'doomed_struct');
    assert.strictEqual(Economy.getBalance(ledger, 'broke'), 0,
      'Balance stays at 0 (floor) — no negative balance');
  });

  test('Only structures with unpayable owners decay', function() {
    var ledger = Economy.createLedger();
    ledger.balances['rich'] = 10;
    ledger.balances['broke'] = 0;

    var result = Economy.applyMaintenance(ledger, {
      's_rich': 'rich',
      's_broke': 'broke'
    });

    assert.strictEqual(result.structuresDecayed.length, 1);
    assert.strictEqual(result.structuresDecayed[0], 's_broke');
    assert.strictEqual(result.totalDestroyed, 1, 'Only rich paid; broke destroyed nothing');
  });

  test('Multiple broke owners all have structures decayed', function() {
    var ledger = Economy.createLedger();
    ledger.balances['broke1'] = 0;
    ledger.balances['broke2'] = 0;

    var result = Economy.applyMaintenance(ledger, {
      's1': 'broke1',
      's2': 'broke2'
    });

    assert.strictEqual(result.structuresDecayed.length, 2);
    assert.strictEqual(result.totalDestroyed, 0);
  });

  test('Maintenance transaction goes to SYSTEM not TREASURY', function() {
    var ledger = Economy.createLedger();
    ledger.balances['owner'] = 10;
    ledger.balances[Economy.TREASURY_ID] = 0;

    Economy.applyMaintenance(ledger, { 's1': 'owner' });

    assert.strictEqual(Economy.getBalance(ledger, Economy.TREASURY_ID), 0,
      'TREASURY should not receive maintenance Spark (§6.5.3 — destroy)');
  });

  test('Maintenance creates transaction with type maintenance', function() {
    var ledger = Economy.createLedger();
    ledger.balances['owner'] = 10;

    Economy.applyMaintenance(ledger, { 'struct_1': 'owner' });

    var mainTxns = ledger.transactions.filter(function(tx) {
      return tx.type === 'maintenance';
    });
    assert.strictEqual(mainTxns.length, 1);
    assert.strictEqual(mainTxns[0].to, Economy.SYSTEM_SINK_ID);
    assert.strictEqual(mainTxns[0].from, 'owner');
    assert.strictEqual(mainTxns[0].details.structureId, 'struct_1');
  });

});

suite('Structure Maintenance - Edge Cases', function() {

  test('Empty structure map returns zeros', function() {
    var ledger = Economy.createLedger();
    ledger.balances['owner'] = 10;

    var result = Economy.applyMaintenance(ledger, {});
    assert.strictEqual(result.totalDestroyed, 0);
    assert.strictEqual(result.structuresDecayed.length, 0);
    assert.strictEqual(Economy.getBalance(ledger, 'owner'), 10,
      'Balance unchanged with no structures');
  });

  test('Null structure map returns zeros gracefully', function() {
    var ledger = Economy.createLedger();

    var result = Economy.applyMaintenance(ledger, null);
    assert.strictEqual(result.totalDestroyed, 0);
    assert.strictEqual(result.structuresDecayed.length, 0);
  });

  test('Owner with exactly 1 Spark can pay (boundary)', function() {
    var ledger = Economy.createLedger();
    ledger.balances['edge_owner'] = 1;

    var result = Economy.applyMaintenance(ledger, { 's1': 'edge_owner' });

    assert.strictEqual(result.totalDestroyed, 1);
    assert.strictEqual(result.structuresDecayed.length, 0);
    assert.strictEqual(Economy.getBalance(ledger, 'edge_owner'), 0,
      'Balance goes to 0 (floor) after paying exactly 1 Spark');
  });

  test('Total Spark in economy decreases by maintenance amount', function() {
    var ledger = Economy.createLedger();
    ledger.balances['owner'] = 50;
    var before = Economy.getBalance(ledger, 'owner');

    Economy.applyMaintenance(ledger, {
      's1': 'owner',
      's2': 'owner'
    });

    var after = Economy.getBalance(ledger, 'owner');
    assert.strictEqual(before - after, 2,
      'Total Spark in economy decreases by maintenance cost — it is destroyed');
  });

});

// ---------------------------------------------------------------------------
// COMBINED: Fee + Buy Flow (§6.5.2 listing fee is paid even if item sells)
// ---------------------------------------------------------------------------

suite('Market Listing Fee - Full Buy Flow', function() {

  test('Fee is paid at listing, sale price goes to seller', function() {
    var ledger = Economy.createLedger();
    ledger.balances['seller'] = 10;
    ledger.balances['buyer'] = 100;

    // Create listing for 50 Spark (fee = 2 = floor(50 * 0.05) = 2)
    var listing = Economy.createMarketListing(ledger, 'seller', { type: 'gem' }, 50);
    var sellerAfterFee = Economy.getBalance(ledger, 'seller'); // 10 - 2 = 8

    // Buy the listing
    var result = Economy.buyListing(ledger, 'buyer', listing.id);
    assert.strictEqual(result.success, true);

    // Seller receives sale price (50) but already paid fee (2)
    assert.strictEqual(Economy.getBalance(ledger, 'seller'), sellerAfterFee + 50,
      'Seller gets sale price on top of balance after fee');
    assert.strictEqual(Economy.getBalance(ledger, 'buyer'), 50,
      'Buyer pays full sale price');
  });

  test('Fee is NOT refunded if listing is cancelled', function() {
    var ledger = Economy.createLedger();
    ledger.balances['seller'] = 20;

    var listing = Economy.createMarketListing(ledger, 'seller', { type: 'item' }, 100);
    // Fee = 5
    var sellerAfterFee = Economy.getBalance(ledger, 'seller'); // 20 - 5 = 15

    // Cancel the listing
    Economy.cancelListing(ledger, listing.id, 'seller');

    // Balance should still reflect the fee was paid (not refunded)
    assert.strictEqual(Economy.getBalance(ledger, 'seller'), sellerAfterFee,
      'Listing fee is non-refundable — it is destroyed at listing time');
  });

  test('Cannot list if fee would leave seller unable to buy own item', function() {
    // Tests that fee gate works — seller can NOT self-buy per protocol
    var ledger = Economy.createLedger();
    ledger.balances['seller'] = 5; // Can pay fee of 5

    var listing = Economy.createMarketListing(ledger, 'seller', { type: 'item' }, 100);
    assert.strictEqual(listing.active, true);

    // seller now has 0 Spark, tries to self-buy
    var result = Economy.buyListing(ledger, 'seller', listing.id);
    assert.strictEqual(result.success, false,
      'Self-purchase must be blocked per §3.3 consent protocol');
  });

});

var success = report();
process.exit(success ? 0 : 1);
