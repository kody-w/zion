// Test keyboard help panel and onboarding tutorial
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

  // Load HUD module
  var HUD = require('../src/js/hud');

  console.log('Keyboard Help Panel');
  console.log('');

  // Help panel exports exist
  assert(typeof HUD.showHelpPanel === 'function', 'showHelpPanel exported');
  assert(typeof HUD.hideHelpPanel === 'function', 'hideHelpPanel exported');
  assert(typeof HUD.toggleHelpPanel === 'function', 'toggleHelpPanel exported');

  console.log('');
  console.log('Onboarding Tutorial');

  // Onboarding exports exist
  assert(typeof HUD.showOnboarding === 'function', 'showOnboarding exported');
  assert(typeof HUD.hideOnboarding === 'function', 'hideOnboarding exported');
  assert(typeof HUD.initOnboarding === 'function', 'initOnboarding exported');

  // Original tutorial still exists
  assert(typeof HUD.initTutorial === 'function', 'initTutorial still exported (old tutorial)');

  console.log('');
  console.log('Existing panel exports still work');

  // Verify key existing exports weren't broken
  assert(typeof HUD.initHUD === 'function', 'initHUD still exported');
  assert(typeof HUD.updateChat === 'function', 'updateChat still exported');
  assert(typeof HUD.showNotification === 'function', 'showNotification still exported');
  assert(typeof HUD.showGuildPanel === 'function', 'showGuildPanel still exported');
  assert(typeof HUD.toggleGovernancePanel === 'function', 'toggleGovernancePanel still exported');
  assert(typeof HUD.showLeaderboardPanel === 'function', 'showLeaderboardPanel still exported');
  assert(typeof HUD.showAnchorPanel === 'function', 'showAnchorPanel still exported');
  assert(typeof HUD.showStewardPanel === 'function', 'showStewardPanel still exported');

  // No-op in Node.js (no DOM) but shouldn't throw
  try {
    HUD.showHelpPanel();
    assert(true, 'showHelpPanel() does not throw in Node.js');
  } catch(e) {
    assert(false, 'showHelpPanel() threw: ' + e.message);
  }

  try {
    HUD.hideHelpPanel();
    assert(true, 'hideHelpPanel() does not throw in Node.js');
  } catch(e) {
    assert(false, 'hideHelpPanel() threw: ' + e.message);
  }

  try {
    HUD.toggleHelpPanel();
    assert(true, 'toggleHelpPanel() does not throw in Node.js');
  } catch(e) {
    assert(false, 'toggleHelpPanel() threw: ' + e.message);
  }

  try {
    HUD.initOnboarding();
    assert(true, 'initOnboarding() does not throw in Node.js');
  } catch(e) {
    assert(false, 'initOnboarding() threw: ' + e.message);
  }

  console.log('');
  console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
})();
