const { test, suite, report, assert } = require('./test_runner');
const Economy = require('../src/js/economy');

suite('Tax Bracket Tests', () => {

  test('Balance 0-19 has 0% tax rate', () => {
    assert.strictEqual(Economy.getTaxRate(0), 0);
    assert.strictEqual(Economy.getTaxRate(10), 0);
    assert.strictEqual(Economy.getTaxRate(19), 0);
  });

  test('Balance 20-49 has 5% tax rate', () => {
    assert.strictEqual(Economy.getTaxRate(20), 0.05);
    assert.strictEqual(Economy.getTaxRate(35), 0.05);
    assert.strictEqual(Economy.getTaxRate(49), 0.05);
  });

  test('Balance 50-99 has 10% tax rate', () => {
    assert.strictEqual(Economy.getTaxRate(50), 0.10);
    assert.strictEqual(Economy.getTaxRate(75), 0.10);
    assert.strictEqual(Economy.getTaxRate(99), 0.10);
  });

  test('Balance 100-249 has 15% tax rate', () => {
    assert.strictEqual(Economy.getTaxRate(100), 0.15);
    assert.strictEqual(Economy.getTaxRate(200), 0.15);
    assert.strictEqual(Economy.getTaxRate(249), 0.15);
  });

  test('Balance 250-499 has 20% tax rate', () => {
    assert.strictEqual(Economy.getTaxRate(250), 0.20);
    assert.strictEqual(Economy.getTaxRate(400), 0.20);
    assert.strictEqual(Economy.getTaxRate(499), 0.20);
  });

  test('Balance 500+ has 25% tax rate', () => {
    assert.strictEqual(Economy.getTaxRate(500), 0.25);
    assert.strictEqual(Economy.getTaxRate(1000), 0.25);
    assert.strictEqual(Economy.getTaxRate(99999), 0.25);
  });

  test('Negative balance has 0% tax rate', () => {
    assert.strictEqual(Economy.getTaxRate(-5), 0);
    assert.strictEqual(Economy.getTaxRate(-100), 0);
  });

});

suite('calculateTax Tests', () => {

  test('calculateTax floors amounts (player-favorable)', () => {
    // 10 * 0.05 = 0.5 -> floor to 0
    const result = Economy.calculateTax(10, 20);
    assert.strictEqual(result.taxAmount, 0);
    assert.strictEqual(result.netAmount, 10);
    assert.strictEqual(result.taxRate, 0.05);
  });

  test('calculateTax with larger amount', () => {
    // 50 * 0.10 = 5
    const result = Economy.calculateTax(50, 75);
    assert.strictEqual(result.taxAmount, 5);
    assert.strictEqual(result.netAmount, 45);
  });

  test('calculateTax at 0 balance = no tax', () => {
    const result = Economy.calculateTax(100, 0);
    assert.strictEqual(result.taxAmount, 0);
    assert.strictEqual(result.netAmount, 100);
    assert.strictEqual(result.taxRate, 0);
  });

  test('calculateTax at 500+ balance', () => {
    // 100 * 0.25 = 25
    const result = Economy.calculateTax(100, 500);
    assert.strictEqual(result.taxAmount, 25);
    assert.strictEqual(result.netAmount, 75);
  });

});

suite('earnSpark with Tax Tests', () => {

  test('earnSpark with 0 balance applies no tax (first bracket)', () => {
    const ledger = Economy.createLedger();
    const earned = Economy.earnSpark(ledger, 'player1', 'daily_login');
    assert.strictEqual(earned, 10);
    assert.strictEqual(Economy.getBalance(ledger, 'player1'), 10);
    // No TREASURY balance since no tax
    assert.strictEqual(Economy.getBalance(ledger, Economy.TREASURY_ID), 0);
  });

  test('earnSpark applies tax and credits TREASURY', () => {
    const ledger = Economy.createLedger();
    // Give player a starting balance of 100 (15% bracket)
    ledger.balances['player1'] = 100;

    // daily_login = 10 spark, 15% tax = 1 (floor(10*0.15)=1)
    const earned = Economy.earnSpark(ledger, 'player1', 'daily_login');
    assert.strictEqual(earned, 9); // 10 - 1 = 9
    assert.strictEqual(Economy.getBalance(ledger, 'player1'), 109);
    assert.strictEqual(Economy.getBalance(ledger, Economy.TREASURY_ID), 1);
  });

  test('Tax transaction is recorded in ledger', () => {
    const ledger = Economy.createLedger();
    ledger.balances['player1'] = 100;
    Economy.earnSpark(ledger, 'player1', 'daily_login');

    const taxTxns = ledger.transactions.filter(tx => tx.type === 'tax');
    assert.strictEqual(taxTxns.length, 1);
    assert.strictEqual(taxTxns[0].to, Economy.TREASURY_ID);
    assert.strictEqual(taxTxns[0].amount, 1);
  });

  test('Spark conservation: player + TREASURY = gross amount', () => {
    const ledger = Economy.createLedger();
    ledger.balances['player1'] = 500; // 25% bracket

    const earned = Economy.earnSpark(ledger, 'player1', 'mentor'); // 50 spark
    const tax = 50 - earned;
    assert.strictEqual(earned + tax, 50, 'Net + tax should equal gross');
    assert.strictEqual(Economy.getBalance(ledger, 'player1'), 500 + earned);
    assert.strictEqual(Economy.getBalance(ledger, Economy.TREASURY_ID), tax);
  });

  test('Earn transaction includes taxWithheld in details', () => {
    const ledger = Economy.createLedger();
    ledger.balances['player1'] = 50; // 10% bracket
    Economy.earnSpark(ledger, 'player1', 'daily_login');

    const earnTxns = ledger.transactions.filter(tx => tx.type === 'earn');
    assert.strictEqual(earnTxns.length, 1);
    assert.strictEqual(earnTxns[0].details.taxWithheld, 1);
    assert.strictEqual(earnTxns[0].details.grossAmount, 10);
  });

});

suite('Transfer/Spending Not Affected by Tax', () => {

  test('transferSpark is NOT taxed', () => {
    const ledger = Economy.createLedger();
    ledger.balances['player1'] = 100;
    ledger.balances['player2'] = 0;

    const result = Economy.transferSpark(ledger, 'player1', 'player2', 30);
    assert.strictEqual(result.success, true);
    assert.strictEqual(Economy.getBalance(ledger, 'player1'), 70);
    assert.strictEqual(Economy.getBalance(ledger, 'player2'), 30);
    // No tax on transfers
    assert.strictEqual(Economy.getBalance(ledger, Economy.TREASURY_ID), 0);
  });

  test('spendSpark is NOT taxed', () => {
    const ledger = Economy.createLedger();
    ledger.balances['player1'] = 50;

    const result = Economy.spendSpark(ledger, 'player1', 20);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.balance, 30);
    assert.strictEqual(Economy.getBalance(ledger, Economy.TREASURY_ID), 0);
  });

});

suite('UBI Distribution Tests', () => {

  test('distributeUBI pays eligible players', () => {
    const ledger = Economy.createLedger();
    ledger.balances[Economy.TREASURY_ID] = 10;
    ledger.balances['player1'] = 5;
    ledger.balances['player2'] = 3;

    const result = Economy.distributeUBI(ledger, ['player1', 'player2']);
    assert.strictEqual(result.perPlayer, 2); // min(2, 10/2) = 2
    assert.strictEqual(result.recipients, 2);
    assert.strictEqual(result.distributed, 4);
    assert.strictEqual(Economy.getBalance(ledger, 'player1'), 7);
    assert.strictEqual(Economy.getBalance(ledger, 'player2'), 5);
    assert.strictEqual(Economy.getBalance(ledger, Economy.TREASURY_ID), 6);
  });

  test('UBI with insufficient treasury distributes less', () => {
    const ledger = Economy.createLedger();
    ledger.balances[Economy.TREASURY_ID] = 3;

    const result = Economy.distributeUBI(ledger, ['p1', 'p2', 'p3']);
    assert.strictEqual(result.perPlayer, 1); // min(2, floor(3/3)) = 1
    assert.strictEqual(result.distributed, 3);
    assert.strictEqual(Economy.getBalance(ledger, Economy.TREASURY_ID), 0);
  });

  test('UBI skips when treasury too low for even 1 per player', () => {
    const ledger = Economy.createLedger();
    ledger.balances[Economy.TREASURY_ID] = 1;

    const result = Economy.distributeUBI(ledger, ['p1', 'p2', 'p3']);
    assert.strictEqual(result.distributed, 0);
    assert.strictEqual(result.perPlayer, 0);
  });

  test('Treasury cannot go negative from UBI', () => {
    const ledger = Economy.createLedger();
    ledger.balances[Economy.TREASURY_ID] = 5;

    Economy.distributeUBI(ledger, ['p1', 'p2', 'p3']);
    assert(Economy.getBalance(ledger, Economy.TREASURY_ID) >= 0, 'Treasury should not go negative');
  });

  test('UBI for negative balance players works', () => {
    const ledger = Economy.createLedger();
    ledger.balances[Economy.TREASURY_ID] = 10;
    ledger.balances['player1'] = -5;

    const result = Economy.distributeUBI(ledger, ['player1']);
    assert.strictEqual(result.recipients, 1);
    assert.strictEqual(Economy.getBalance(ledger, 'player1'), -3); // -5 + 2
  });

  test('UBI with empty eligible list does nothing', () => {
    const ledger = Economy.createLedger();
    ledger.balances[Economy.TREASURY_ID] = 100;

    const result = Economy.distributeUBI(ledger, []);
    assert.strictEqual(result.distributed, 0);
  });

  test('UBI records transactions', () => {
    const ledger = Economy.createLedger();
    ledger.balances[Economy.TREASURY_ID] = 10;
    ledger.balances['p1'] = 0;

    Economy.distributeUBI(ledger, ['p1']);
    const ubiTxns = ledger.transactions.filter(tx => tx.type === 'ubi');
    assert.strictEqual(ubiTxns.length, 1);
    assert.strictEqual(ubiTxns[0].from, Economy.TREASURY_ID);
    assert.strictEqual(ubiTxns[0].to, 'p1');
    assert.strictEqual(ubiTxns[0].amount, 2);
  });

});

suite('getTreasuryInfo Tests', () => {

  test('getTreasuryInfo returns correct info', () => {
    const ledger = Economy.createLedger();
    ledger.balances[Economy.TREASURY_ID] = 15;
    ledger.transactions.push({ type: 'tax', amount: 10 });
    ledger.transactions.push({ type: 'tax', amount: 5 });
    ledger.transactions.push({ type: 'ubi', amount: 2 });

    const info = Economy.getTreasuryInfo(ledger);
    assert.strictEqual(info.balance, 15);
    assert.strictEqual(info.totalTaxCollected, 15);
    assert.strictEqual(info.totalUbiDistributed, 2);
  });

  test('getTreasuryInfo with empty ledger', () => {
    const ledger = Economy.createLedger();
    const info = Economy.getTreasuryInfo(ledger);
    assert.strictEqual(info.balance, 0);
    assert.strictEqual(info.totalTaxCollected, 0);
    assert.strictEqual(info.totalUbiDistributed, 0);
  });

});

suite('Leaderboard and Stats Exclude TREASURY', () => {

  test('TREASURY excluded from leaderboard', () => {
    const ledger = Economy.createLedger();
    ledger.balances[Economy.TREASURY_ID] = 9999;
    ledger.balances['player1'] = 50;
    ledger.balances['player2'] = 30;

    const board = Economy.getLeaderboard(ledger);
    const ids = board.map(e => e.playerId);
    assert(!ids.includes(Economy.TREASURY_ID), 'TREASURY should not be on leaderboard');
    assert.strictEqual(board.length, 2);
  });

  test('TREASURY excluded from economy stats', () => {
    const ledger = Economy.createLedger();
    ledger.balances[Economy.TREASURY_ID] = 100;
    ledger.balances['player1'] = 50;

    const stats = Economy.getEconomyStats(ledger);
    assert.strictEqual(stats.playerCount, 1);
    assert.strictEqual(stats.totalSpark, 50);
    assert.strictEqual(stats.treasury, 100);
  });

});

const success = report();
process.exit(success ? 0 : 1);
