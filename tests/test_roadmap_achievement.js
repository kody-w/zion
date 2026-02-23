// Test: HUD.showAchievementBanner exists and is callable
var HUD = require('../src/js/hud.js');

var passed = 0;
var failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; }
  else { failed++; console.error('FAIL: ' + msg); }
}

// showAchievementBanner exists
assert(typeof HUD.showAchievementBanner === 'function', 'showAchievementBanner is a function');

// Calling with no DOM should not throw
var threw = false;
try {
  HUD.showAchievementBanner({ name: 'Test Achievement', description: 'You did it!' });
} catch (e) {
  threw = true;
}
assert(!threw, 'showAchievementBanner does not throw without DOM');

// Calling with null achievement should not throw
threw = false;
try {
  HUD.showAchievementBanner(null);
} catch (e) {
  threw = true;
}
assert(!threw, 'showAchievementBanner handles null achievement');

// Calling with empty object should not throw
threw = false;
try {
  HUD.showAchievementBanner({});
} catch (e) {
  threw = true;
}
assert(!threw, 'showAchievementBanner handles empty achievement');

// showNotification still exists (not broken)
assert(typeof HUD.showNotification === 'function', 'showNotification still exists');

// showQuestComplete still exists
assert(typeof HUD.showQuestComplete === 'function', 'showQuestComplete still exists');

console.log('test_roadmap_achievement: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
