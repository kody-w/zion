// Test State.setLiveState fix (removed bad call)
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

  var State = require('../src/js/state');

  console.log('State.setLiveState signature');
  console.log('');

  // Verify setLiveState expects (path, value)
  assert(typeof State.setLiveState === 'function', 'setLiveState exported');

  // Calling with string path should work
  try {
    State.setLiveState('test.key', 'value');
    assert(true, 'setLiveState(string, value) does not throw');
  } catch (e) {
    assert(false, 'setLiveState(string, value) threw: ' + e.message);
  }

  // Calling with object (the old bug) would throw
  var threw = false;
  try {
    State.setLiveState({ citizens: {} });
  } catch (e) {
    threw = true;
  }
  assert(threw, 'setLiveState(object) throws (path.split is not a function)');

  console.log('');
  console.log('Source code verification');

  var fs = require('fs');
  var src = fs.readFileSync(__dirname + '/../src/js/main.js', 'utf8');

  // The bug line "State.setLiveState(live)" should be removed
  var bugPattern = /State\.setLiveState\(live\)/;
  assert(!bugPattern.test(src), 'State.setLiveState(live) removed from main.js');

  // getLiveState returns reference — mutations persist without setLiveState
  var live = State.getLiveState();
  assert(live !== null && typeof live === 'object', 'getLiveState returns object');

  // Mutate directly and verify it persists
  live._test_direct_mutation = true;
  var live2 = State.getLiveState();
  assert(live2._test_direct_mutation === true, 'direct mutations persist (reference semantics)');

  // Clean up
  delete live._test_direct_mutation;

  console.log('');
  console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
})();
