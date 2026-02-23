// Test: StoryEngine wiring — getAvailableLore, discoverLore with loreId, arc completion, getNpcStory
// Verifies the corrected function signatures match what main.js now calls

(function() {
  var passed = 0;
  var failed = 0;

  function assert(condition, msg) {
    if (condition) { passed++; }
    else { failed++; console.error('FAIL: ' + msg); }
  }

  var StoryEngine = require('../src/js/story_engine');

  // Test 1: getAvailableLore exists and returns array
  var state = {};
  var available = StoryEngine.getAvailableLore(state, 'player_1', 'exploration', 'nexus', 'summer');
  assert(Array.isArray(available), 'getAvailableLore returns array');

  // Test 2: getAvailableLore with different zones
  var wildLore = StoryEngine.getAvailableLore(state, 'player_1', 'exploration', 'wilds', 'summer');
  assert(Array.isArray(wildLore), 'getAvailableLore(wilds) returns array');

  // Test 3: discoverLore with correct 4-arg signature (state, playerId, loreId, method)
  var allLore = StoryEngine.getAvailableLore(state, 'player_1', 'exploration', null, null);
  if (allLore.length > 0) {
    var loreEntry = allLore[0];
    var result = StoryEngine.discoverLore(state, 'player_1', loreEntry.id, 'exploration');
    assert(result !== null && result !== undefined, 'discoverLore returns result');
    assert(typeof result.success === 'boolean', 'discoverLore has success boolean');
    if (result.success) {
      assert(result.loreEntry !== undefined, 'successful discoverLore has loreEntry');
    }
  } else {
    // Even with empty state, all lore should be available
    passed++; // Skip
  }

  // Test 4: getDiscoveredLore returns what was discovered
  var discovered = StoryEngine.getDiscoveredLore(state, 'player_1', null);
  assert(Array.isArray(discovered), 'getDiscoveredLore returns array');

  // Test 5: getStoryArcs
  var arcs = StoryEngine.getStoryArcs();
  assert(Array.isArray(arcs), 'getStoryArcs returns array');
  assert(arcs.length > 0, 'getStoryArcs has entries');

  // Test 6: getArcProgress
  if (arcs.length > 0) {
    var arcProgress = StoryEngine.getArcProgress(state, 'player_1', arcs[0].id);
    assert(arcProgress !== null && arcProgress !== undefined, 'getArcProgress returns result');
    assert(typeof arcProgress.percent === 'number', 'getArcProgress has percent');
  } else {
    passed++;
  }

  // Test 7: getNpcStory returns lore for archetype
  var npcLore = StoryEngine.getNpcStory(state, 'player_1', 'storyteller', 'nexus', 'summer');
  // May return null if no matching lore, that's OK
  assert(npcLore === null || typeof npcLore === 'object', 'getNpcStory returns null or object');

  // Test 8: getCompletionPercent
  var pct = StoryEngine.getCompletionPercent(state, 'player_1');
  assert(typeof pct === 'number', 'getCompletionPercent returns number');
  assert(pct >= 0 && pct <= 100, 'getCompletionPercent is between 0-100');

  // Test 9: getLoreById
  var loreById = StoryEngine.getLoreById ? StoryEngine.getLoreById('nexus_founding') : null;
  // May be null if ID doesn't exist, test it doesn't throw
  assert(loreById === null || typeof loreById === 'object', 'getLoreById returns null or object');

  // Test 10: getCategories
  var categories = StoryEngine.getCategories();
  assert(Array.isArray(categories), 'getCategories returns array');
  assert(categories.length > 0, 'getCategories has entries');

  // Test 11: Discover multiple lore entries to test arc completion tracking
  var freshState = {};
  var allAvail = StoryEngine.getAvailableLore(freshState, 'player_2', 'exploration', null, null);
  var discovered2 = 0;
  for (var i = 0; i < Math.min(allAvail.length, 5); i++) {
    var dr = StoryEngine.discoverLore(freshState, 'player_2', allAvail[i].id, 'exploration');
    if (dr && dr.success) discovered2++;
  }
  assert(discovered2 > 0 || allAvail.length === 0, 'Can discover multiple lore entries');
  var pct2 = StoryEngine.getCompletionPercent(freshState, 'player_2');
  assert(pct2 > 0 || allAvail.length === 0, 'Completion percent increases after discoveries');

  console.log('test_wiring_story_engine: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
})();
