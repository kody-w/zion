const { test, suite, report, assert } = require('./test_runner');
const Economy = require('../src/js/economy');

suite('Economy Tests', () => {

  test('New player balance is 0', () => {
    const ledger = Economy.createLedger();
    const balance = Economy.getBalance(ledger, 'player1');
    assert.strictEqual(balance, 0);
  });

  test('earnSpark for daily_login awards 10', () => {
    const ledger = Economy.createLedger();
    const earned = Economy.earnSpark(ledger, 'player1', 'daily_login');
    assert.strictEqual(earned, 10);
    assert.strictEqual(Economy.getBalance(ledger, 'player1'), 10);
  });

  test('earnSpark for harvest awards 5-15 range', () => {
    const ledger = Economy.createLedger();
    const earned = Economy.earnSpark(ledger, 'player1', 'harvest', { complexity: 0.5 });
    assert(earned >= 5 && earned <= 15, `Expected 5-15, got ${earned}`);
  });

  test('earnSpark for craft awards 5-50 range based on complexity', () => {
    const ledger = Economy.createLedger();

    // Min complexity
    const earnedMin = Economy.earnSpark(ledger, 'player1', 'craft', { complexity: 0 });
    assert.strictEqual(earnedMin, 5, 'Min craft should be 5');

    // Max complexity
    const earnedMax = Economy.earnSpark(ledger, 'player2', 'craft', { complexity: 1 });
    assert.strictEqual(earnedMax, 50, 'Max craft should be 50');

    // Mid complexity
    const earnedMid = Economy.earnSpark(ledger, 'player3', 'craft', { complexity: 0.5 });
    assert(earnedMid >= 20 && earnedMid <= 35, `Mid craft should be ~27.5, got ${earnedMid}`);
  });

  test('earnSpark for teach awards 10-30 range', () => {
    const ledger = Economy.createLedger();
    const earned = Economy.earnSpark(ledger, 'player1', 'teach', { complexity: 0.5 });
    assert(earned >= 10 && earned <= 30, `Expected 10-30, got ${earned}`);
  });

  test('earnSpark for discover awards 5-25 range', () => {
    const ledger = Economy.createLedger();
    const earned = Economy.earnSpark(ledger, 'player1', 'discover', { rarity: 0.5 });
    assert(earned >= 5 && earned <= 25, `Expected 5-25, got ${earned}`);
  });

  test('earnSpark for gift awards 1-3', () => {
    const ledger = Economy.createLedger();
    const earned = Economy.earnSpark(ledger, 'player1', 'gift', { complexity: 0.5 });
    assert(earned >= 1 && earned <= 3, `Expected 1-3, got ${earned}`);
  });

  test('transferSpark transfers correctly', () => {
    const ledger = Economy.createLedger();

    // Give player1 some Spark
    Economy.earnSpark(ledger, 'player1', 'daily_login'); // 10 Spark

    // Transfer 5 to player2
    const result = Economy.transferSpark(ledger, 'player1', 'player2', 5);
    assert.strictEqual(result.success, true);

    // Check balances
    assert.strictEqual(Economy.getBalance(ledger, 'player1'), 5);
    assert.strictEqual(Economy.getBalance(ledger, 'player2'), 5);
  });

  test('Cannot spend more than balance (spendSpark fails)', () => {
    const ledger = Economy.createLedger();

    // Give player1 10 Spark
    Economy.earnSpark(ledger, 'player1', 'daily_login');

    // Try to spend 20
    const result = Economy.spendSpark(ledger, 'player1', 20);
    assert.strictEqual(result.success, false);

    // Balance should still be 10
    assert.strictEqual(Economy.getBalance(ledger, 'player1'), 10);
  });

  test('createMarketListing creates listing', () => {
    const ledger = Economy.createLedger();
    ledger.balances['player1'] = 100; // Need balance for listing fee
    const item = { type: 'sword', name: 'Iron Sword' };
    const listing = Economy.createMarketListing(ledger, 'player1', item, 50);

    assert(listing.id !== undefined, 'Listing should have an id');
    assert.strictEqual(listing.seller, 'player1');
    assert.strictEqual(listing.price, 50);
    assert.strictEqual(listing.active, true);
    assert.deepStrictEqual(listing.item, item);
  });

  test('buyListing transfers item and Spark', () => {
    const ledger = Economy.createLedger();

    // Give seller balance for listing fee (fee = max(1, floor(50*0.05)) = 2)
    ledger.balances['seller1'] = 10;
    const item = { type: 'sword', name: 'Iron Sword' };
    const listing = Economy.createMarketListing(ledger, 'seller1', item, 50);
    const sellerAfterFee = Economy.getBalance(ledger, 'seller1'); // 10 - 2 = 8

    // Give buyer enough Spark
    Economy.earnSpark(ledger, 'buyer1', 'daily_login'); // 10
    Economy.earnSpark(ledger, 'buyer1', 'daily_login'); // 20
    Economy.earnSpark(ledger, 'buyer1', 'daily_login'); // 30
    Economy.earnSpark(ledger, 'buyer1', 'daily_login'); // 40
    Economy.earnSpark(ledger, 'buyer1', 'daily_login'); // 50

    // Buy the listing
    const result = Economy.buyListing(ledger, 'buyer1', listing.id);
    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.item, item);

    // Check balances (seller gets 50 from sale + had 8 after fee)
    assert.strictEqual(Economy.getBalance(ledger, 'buyer1'), 0);
    assert.strictEqual(Economy.getBalance(ledger, 'seller1'), sellerAfterFee + 50);

    // Listing should be inactive
    const updatedListing = ledger.listings.find(l => l.id === listing.id);
    assert.strictEqual(updatedListing.active, false);
  });

  test('buyListing fails if buyer has insufficient Spark', () => {
    const ledger = Economy.createLedger();

    // Give seller balance for listing fee
    ledger.balances['seller1'] = 10;
    const item = { type: 'sword', name: 'Iron Sword' };
    const listing = Economy.createMarketListing(ledger, 'seller1', item, 50);
    const sellerAfterFee = Economy.getBalance(ledger, 'seller1');

    // Give buyer only 10 Spark
    Economy.earnSpark(ledger, 'buyer1', 'daily_login');

    // Try to buy
    const result = Economy.buyListing(ledger, 'buyer1', listing.id);
    assert.strictEqual(result.success, false);

    // Balances unchanged after failed purchase
    assert.strictEqual(Economy.getBalance(ledger, 'buyer1'), 10);
    assert.strictEqual(Economy.getBalance(ledger, 'seller1'), sellerAfterFee);
  });

  test('Transaction log records all transactions', () => {
    const ledger = Economy.createLedger();

    // Earn some Spark
    Economy.earnSpark(ledger, 'player1', 'daily_login');

    // Transfer some
    Economy.transferSpark(ledger, 'player1', 'player2', 5);

    // Get transaction log
    const log = Economy.getTransactionLog(ledger, 'player1');

    assert(log.length >= 2, 'Should have at least 2 transactions');
    assert(log.some(tx => tx.type === 'earn'), 'Should have earn transaction');
    assert(log.some(tx => tx.type === 'transfer'), 'Should have transfer transaction');
  });

  test('No way to create Spark except through earnSpark', () => {
    const ledger = Economy.createLedger();

    // Verify balance starts at 0
    assert.strictEqual(Economy.getBalance(ledger, 'player1'), 0);

    // Only earnSpark can increase balance from 0
    Economy.earnSpark(ledger, 'player1', 'daily_login');
    assert.strictEqual(Economy.getBalance(ledger, 'player1'), 10);

    // transferSpark can only move existing Spark, not create it
    const transferResult = Economy.transferSpark(ledger, 'player1', 'player2', 5);
    assert.strictEqual(transferResult.success, true);

    // Total Spark in system should still be 10
    const total = Economy.getBalance(ledger, 'player1') + Economy.getBalance(ledger, 'player2');
    assert.strictEqual(total, 10, 'Total Spark should remain constant');
  });

});

const success = report();
process.exit(success ? 0 : 1);
