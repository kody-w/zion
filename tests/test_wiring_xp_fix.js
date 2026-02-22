// Test Wiring.js Progression.awardXP argument fix
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

  var Wiring = require('../src/js/wiring');
  var Progression = require('../src/js/progression');

  console.log('Wiring XP call signature fix');
  console.log('');

  // Verify Progression.awardXP signature: (state, source, amount)
  assert(typeof Progression.awardXP === 'function', 'Progression.awardXP exported');

  // Create a proper progression state
  var ps = Progression.createPlayerProgression('test-player');
  assert(ps !== null, 'createPlayerProgression returns state');
  assert(ps.totalXP === 0, 'starts at 0 XP');

  // Direct call with correct args works
  var result = Progression.awardXP(ps, 'exploration', 5);
  assert(result !== null, 'awardXP returns result');
  assert(result.state.totalXP === 5, 'awarded 5 XP');

  console.log('');
  console.log('Source code verification');

  var fs = require('fs');
  var src = fs.readFileSync(__dirname + '/../src/js/wiring.js', 'utf8');

  // The old bug: [state, playerId, 'activity', amount] — 4 args with playerId extra
  var bugPattern = /awardXP',\s*\[state,\s*playerId,/;
  assert(!bugPattern.test(src), 'no awardXP calls with [state, playerId, ...] pattern');

  // The fix: [_getPlayerProgression(state, playerId), 'activity', amount]
  var fixPattern = /_getPlayerProgression\(state, playerId\)/;
  assert(fixPattern.test(src), 'awardXP calls use _getPlayerProgression helper');

  // Count fixed calls — should be 16 (all events)
  var matches = src.match(/_getPlayerProgression\(state, playerId\)/g);
  assert(matches !== null && matches.length >= 15, 'all awardXP calls fixed (' + (matches ? matches.length : 0) + ' found)');

  // Verify _getPlayerProgression function exists
  var helperPattern = /function _getPlayerProgression\(state, playerId\)/;
  assert(helperPattern.test(src), '_getPlayerProgression helper function defined');

  console.log('');
  console.log('Wiring module exports');

  // Verify Wiring has proper exports
  assert(typeof Wiring.init === 'function', 'Wiring.init exported');
  assert(typeof Wiring.onZoneChange === 'function', 'onZoneChange exported');
  assert(typeof Wiring.onHarvest === 'function', 'onHarvest exported');
  assert(typeof Wiring.onCraft === 'function', 'onCraft exported');
  assert(typeof Wiring.onFishCaught === 'function', 'onFishCaught exported');
  assert(typeof Wiring.getStats === 'function', 'getStats exported');

  console.log('');
  console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
})();
