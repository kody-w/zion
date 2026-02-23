// Test: Quest auto-accept — acceptQuest for quest_nexus_001, getActiveQuests
var Quests = require('../src/js/quests.js');

var passed = 0;
var failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; }
  else { failed++; console.error('FAIL: ' + msg); }
}

// initPlayerQuests exists
assert(typeof Quests.initPlayerQuests === 'function', 'initPlayerQuests is a function');
assert(typeof Quests.acceptQuest === 'function', 'acceptQuest is a function');
assert(typeof Quests.getActiveQuests === 'function', 'getActiveQuests is a function');

// Initialize quests for a test player
Quests.initPlayerQuests('autoTestPlayer');

// Before accepting, no active quests
var before = Quests.getActiveQuests('autoTestPlayer');
assert(Array.isArray(before), 'getActiveQuests returns array');
assert(before.length === 0, 'new player has no active quests');

// Accept the starter quest
var result = Quests.acceptQuest('autoTestPlayer', 'quest_nexus_001');
assert(result !== null && typeof result === 'object', 'acceptQuest returns result');
assert(result.success === true, 'acceptQuest succeeds for quest_nexus_001');

// Now player has one active quest
var after = Quests.getActiveQuests('autoTestPlayer');
assert(after.length === 1, 'player has 1 active quest after accept');
assert(after[0].id === 'quest_nexus_001', 'active quest is quest_nexus_001');

// Double-accept should fail gracefully
var dup = Quests.acceptQuest('autoTestPlayer', 'quest_nexus_001');
assert(dup.success === false, 'duplicate accept returns false');

console.log('test_roadmap_quest_auto: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
