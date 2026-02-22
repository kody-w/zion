// Test Economy.earnSpark call signature fixes
(function() {
  var passed = 0;
  var failed = 0;

  function assert(condition, msg) {
    if (condition) {
      console.log('  ok - ' + msg);
      passed++;
    } else {
      console.log('  FAIL - ' + msg);
      failed++;
    }
  }

  var Economy = require('../src/js/economy');

  console.log('Economy.earnSpark signature verification');
  console.log('');

  // Verify earnSpark exists
  assert(typeof Economy.earnSpark === 'function', 'earnSpark is a function');

  // Create a proper ledger
  var ledger = Economy.createLedger ? Economy.createLedger() : { balances: {}, transactions: [] };

  // Test correct call: (ledger, playerId, activity, details)
  var result;
  try {
    result = Economy.earnSpark(ledger, 'test-player', 'harvest', { complexity: 0.5 });
    assert(true, 'earnSpark(ledger, id, activity, details) does not throw');
  } catch (e) {
    assert(false, 'earnSpark(ledger, id, activity, details) threw: ' + e.message);
  }

  // Test fishing call: (ledger, playerId, 'fishing', details)
  try {
    result = Economy.earnSpark(ledger, 'test-player', 'fishing', { complexity: 0.2 });
    assert(true, 'earnSpark fishing call does not throw');
  } catch (e) {
    assert(false, 'earnSpark fishing threw: ' + e.message);
  }

  // Test daily_login call: (ledger, playerId, 'daily_login', details)
  try {
    result = Economy.earnSpark(ledger, 'test-player', 'daily_login', {});
    assert(true, 'earnSpark daily_login call does not throw');
  } catch (e) {
    assert(false, 'earnSpark daily_login threw: ' + e.message);
  }

  console.log('');
  console.log('Source code verification');

  var fs = require('fs');
  var src = fs.readFileSync(__dirname + '/../src/js/main.js', 'utf8');

  // Bug 1: gameState was passed as ledger in handleHarvestMessage
  var harvestBug = /earnSpark\(gameState,\s*msg\.from/;
  assert(!harvestBug.test(src), 'harvest handler no longer passes gameState as ledger');

  // Verify harvest now uses economyLedger
  var harvestFixed = /earnSpark\(economyLedger,\s*msg\.from,\s*'harvest'/;
  assert(harvestFixed.test(src), 'harvest handler uses economyLedger and activity string');

  // Bug 2: missing ledger in daily_login
  var dailyBug = /earnSpark\(localPlayer\.id,\s*'daily_login'/;
  assert(!dailyBug.test(src), 'daily_login no longer missing ledger arg');

  // Verify daily_login now has ledger
  var dailyFixed = /earnSpark\(economyLedger,\s*localPlayer\.id,\s*'daily_login'/;
  assert(dailyFixed.test(src), 'daily_login now passes economyLedger first');

  // Bug 3: swapped args in fishing (sparkAmount, 'fishing') -> ('fishing', details)
  var fishBug = /earnSpark\(economyLedger,\s*localPlayer\.id,\s*sparkAmount,\s*'fishing'\)/;
  assert(!fishBug.test(src), 'fishing no longer has swapped args');

  // Verify fishing now correct
  var fishFixed = /earnSpark\(economyLedger,\s*localPlayer\.id,\s*'fishing',\s*\{/;
  assert(fishFixed.test(src), 'fishing now passes activity string then details object');

  console.log('');
  console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
})();
