/**
 * Tests for src/js/story_engine.js
 * Run with: node tests/test_story_engine.js
 */

var StoryEngine = require('../src/js/story_engine');

var passed = 0;
var failed = 0;
var errors = [];

function assert(condition, msg) {
  if (condition) {
    passed++;
    process.stdout.write('  PASS: ' + msg + '\n');
  } else {
    failed++;
    errors.push(msg);
    process.stdout.write('  FAIL: ' + msg + '\n');
  }
}

function assertEqual(a, b, msg) {
  assert(a === b, msg + ' (expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a) + ')');
}

function assertGTE(a, b, msg) {
  assert(a >= b, msg + ' (' + a + ' >= ' + b + ')');
}

function assertIn(arr, item, msg) {
  assert(arr.indexOf(item) !== -1, msg + ' (' + JSON.stringify(item) + ' in array)');
}

function assertNotIn(arr, item, msg) {
  assert(arr.indexOf(item) === -1, msg + ' (' + JSON.stringify(item) + ' NOT in array)');
}

function makeState() {
  return { players: {} };
}

function makeStateWithPlayer(playerId) {
  return { players: { [playerId]: { discoveredLore: [], discoveredLoreTimestamps: {} } } };
}

// Sequential player IDs
var playerSeq = 0;
function uid() {
  return 'player_' + (++playerSeq);
}

// ============================================================================
// SUITE 1: LORE ENTRIES DATA INTEGRITY
// ============================================================================

console.log('\n== Suite 1: Lore Entries Data Integrity ==');

(function() {
  var entries = StoryEngine._LORE_ENTRIES;

  assert(Array.isArray(entries), 'LORE_ENTRIES is an array');
  assertGTE(entries.length, 40, 'LORE_ENTRIES has at least 40 entries');

  // All required fields present
  var requiredFields = ['id', 'title', 'text', 'category', 'zone', 'prerequisites', 'discoveryMethod', 'npcArchetype', 'rarity', 'season'];
  entries.forEach(function(entry) {
    requiredFields.forEach(function(field) {
      assert(entry.hasOwnProperty(field), 'Entry ' + entry.id + ' has field: ' + field);
    });
  });

  // ID uniqueness
  var ids = {};
  entries.forEach(function(entry) {
    assert(!ids[entry.id], 'Lore ID is unique: ' + entry.id);
    ids[entry.id] = true;
  });

  // Valid categories
  var validCats = ['history', 'legend', 'mystery', 'prophecy', 'song', 'tale', 'teaching'];
  entries.forEach(function(entry) {
    assertIn(validCats, entry.category, 'Entry ' + entry.id + ' has valid category');
  });

  // Valid rarities
  var validRarities = ['common', 'uncommon', 'rare', 'legendary'];
  entries.forEach(function(entry) {
    assertIn(validRarities, entry.rarity, 'Entry ' + entry.id + ' has valid rarity');
  });

  // Valid zones
  var validZones = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];
  entries.forEach(function(entry) {
    assertIn(validZones, entry.zone, 'Entry ' + entry.id + ' has valid zone');
  });

  // Valid discovery methods
  var validMethods = ['npc_talk', 'exploration', 'quest', 'event', 'stargazing', 'time_capsule'];
  entries.forEach(function(entry) {
    assertIn(validMethods, entry.discoveryMethod, 'Entry ' + entry.id + ' has valid discoveryMethod');
  });

  // Season is null or valid
  var validSeasons = ['spring', 'summer', 'autumn', 'winter', null];
  entries.forEach(function(entry) {
    assertIn(validSeasons, entry.season, 'Entry ' + entry.id + ' has valid season');
  });

  // Prerequisites are arrays
  entries.forEach(function(entry) {
    assert(Array.isArray(entry.prerequisites), 'Entry ' + entry.id + ' prerequisites is array');
  });

  // Non-empty title and text
  entries.forEach(function(entry) {
    assert(typeof entry.title === 'string' && entry.title.length > 0, 'Entry ' + entry.id + ' has non-empty title');
    assert(typeof entry.text === 'string' && entry.text.length > 0, 'Entry ' + entry.id + ' has non-empty text');
  });
})();

// ============================================================================
// SUITE 2: CATEGORY DISTRIBUTION
// ============================================================================

console.log('\n== Suite 2: Category Distribution ==');

(function() {
  var entries = StoryEngine._LORE_ENTRIES;
  var cats = {};
  entries.forEach(function(e) {
    cats[e.category] = (cats[e.category] || 0) + 1;
  });

  assert((cats['history'] || 0) >= 8, 'At least 8 history entries');
  assert((cats['legend'] || 0) >= 6, 'At least 6 legend entries');
  assert((cats['mystery'] || 0) >= 6, 'At least 6 mystery entries');
  assert((cats['prophecy'] || 0) >= 5, 'At least 5 prophecy entries');
  assert((cats['song'] || 0) >= 5, 'At least 5 song entries');
  assert((cats['tale'] || 0) >= 5, 'At least 5 tale entries');
  assert((cats['teaching'] || 0) >= 5, 'At least 5 teaching entries');

  // All categories present
  var allCats = StoryEngine.getCategories();
  assert(allCats.indexOf('history') !== -1, 'categories includes history');
  assert(allCats.indexOf('legend') !== -1, 'categories includes legend');
  assert(allCats.indexOf('mystery') !== -1, 'categories includes mystery');
  assert(allCats.indexOf('prophecy') !== -1, 'categories includes prophecy');
  assert(allCats.indexOf('song') !== -1, 'categories includes song');
  assert(allCats.indexOf('tale') !== -1, 'categories includes tale');
  assert(allCats.indexOf('teaching') !== -1, 'categories includes teaching');
})();

// ============================================================================
// SUITE 3: ZONE COVERAGE
// ============================================================================

console.log('\n== Suite 3: Zone Coverage ==');

(function() {
  var zones = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];
  zones.forEach(function(zone) {
    var entries = StoryEngine.getLoreByZone(zone);
    assertGTE(entries.length, 2, 'Zone ' + zone + ' has at least 2 lore entries');
  });

  // getLoreByZone returns only matching zone
  var nexusLore = StoryEngine.getLoreByZone('nexus');
  nexusLore.forEach(function(e) {
    assertEqual(e.zone, 'nexus', 'getLoreByZone(nexus) entry has zone nexus: ' + e.id);
  });

  var wildLore = StoryEngine.getLoreByZone('wilds');
  wildLore.forEach(function(e) {
    assertEqual(e.zone, 'wilds', 'getLoreByZone(wilds) entry has zone wilds: ' + e.id);
  });

  // Unknown zone returns empty array
  var unknown = StoryEngine.getLoreByZone('unknown_zone');
  assertEqual(unknown.length, 0, 'getLoreByZone with unknown zone returns empty array');
})();

// ============================================================================
// SUITE 4: STORY ARCS DATA INTEGRITY
// ============================================================================

console.log('\n== Suite 4: Story Arcs Data Integrity ==');

(function() {
  var arcs = StoryEngine.getStoryArcs();

  assert(Array.isArray(arcs), 'getStoryArcs returns array');
  assertEqual(arcs.length, 8, 'Exactly 8 story arcs');

  var allLoreIds = {};
  StoryEngine._LORE_ENTRIES.forEach(function(e) { allLoreIds[e.id] = true; });

  arcs.forEach(function(arc) {
    assert(typeof arc.id === 'string' && arc.id.length > 0, 'Arc ' + arc.id + ' has valid id');
    assert(typeof arc.title === 'string' && arc.title.length > 0, 'Arc ' + arc.id + ' has valid title');
    assert(typeof arc.description === 'string', 'Arc ' + arc.id + ' has description');
    assert(Array.isArray(arc.parts) && arc.parts.length > 0, 'Arc ' + arc.id + ' has non-empty parts');
    assert(typeof arc.reward === 'object', 'Arc ' + arc.id + ' has reward object');
    assert(typeof arc.reward.spark === 'number' && arc.reward.spark > 0, 'Arc ' + arc.id + ' reward has spark');
    assert(typeof arc.reward.xp === 'number' && arc.reward.xp > 0, 'Arc ' + arc.id + ' reward has xp');
    assert(typeof arc.reward.badge === 'string' && arc.reward.badge.length > 0, 'Arc ' + arc.id + ' reward has badge');

    // All part IDs reference valid lore
    arc.parts.forEach(function(partId) {
      assert(allLoreIds[partId] === true, 'Arc ' + arc.id + ' references valid lore ID: ' + partId);
    });
  });

  // Arc IDs are unique
  var arcIds = {};
  arcs.forEach(function(arc) {
    assert(!arcIds[arc.id], 'Arc ID is unique: ' + arc.id);
    arcIds[arc.id] = true;
  });
})();

// ============================================================================
// SUITE 5: getLoreById
// ============================================================================

console.log('\n== Suite 5: getLoreById ==');

(function() {
  var entry = StoryEngine.getLoreById('founding_of_nexus');
  assert(entry !== null, 'getLoreById returns entry for known ID');
  assertEqual(entry.id, 'founding_of_nexus', 'getLoreById returns correct entry');
  assertEqual(entry.zone, 'nexus', 'getLoreById returns entry with correct zone');
  assertEqual(entry.category, 'history', 'getLoreById returns entry with correct category');

  var missing = StoryEngine.getLoreById('nonexistent_lore');
  assert(missing === null, 'getLoreById returns null for unknown ID');

  var anotherEntry = StoryEngine.getLoreById('the_seven_questions');
  assert(anotherEntry !== null, 'getLoreById finds teaching entry');
  assertEqual(anotherEntry.category, 'teaching', 'Found entry has correct category');
})();

// ============================================================================
// SUITE 6: discoverLore — basic flow
// ============================================================================

console.log('\n== Suite 6: discoverLore Basic Flow ==');

(function() {
  var state = makeState();
  var pid = uid();

  var result = StoryEngine.discoverLore(state, pid, 'founding_of_nexus', 'npc_talk');
  assert(result.success === true, 'discoverLore succeeds for valid inputs');
  assert(result.loreEntry !== null, 'discoverLore returns loreEntry');
  assertEqual(result.loreEntry.id, 'founding_of_nexus', 'discoverLore returns correct lore entry');
  assert(result.arcCompleted === null, 'discoverLore arcCompleted null when arc not complete');
  assert(result.reward === null, 'discoverLore reward null when arc not complete');

  // Player now has lore
  var discovered = StoryEngine.getDiscoveredLore(state, pid);
  assertEqual(discovered.length, 1, 'Player has 1 discovered lore after first discovery');
  assertEqual(discovered[0].id, 'founding_of_nexus', 'Discovered lore ID matches');
})();

// ============================================================================
// SUITE 7: discoverLore — duplicate prevention
// ============================================================================

console.log('\n== Suite 7: discoverLore Duplicate Prevention ==');

(function() {
  var state = makeState();
  var pid = uid();

  StoryEngine.discoverLore(state, pid, 'founding_of_nexus', 'npc_talk');
  var result2 = StoryEngine.discoverLore(state, pid, 'founding_of_nexus', 'npc_talk');
  assert(result2.success === false, 'Second discoverLore of same entry fails');
  assert(result2.error === 'Lore already discovered', 'Error message correct for duplicate');

  var discovered = StoryEngine.getDiscoveredLore(state, pid);
  assertEqual(discovered.length, 1, 'Player still has only 1 entry after duplicate attempt');
})();

// ============================================================================
// SUITE 8: discoverLore — prerequisites
// ============================================================================

console.log('\n== Suite 8: discoverLore Prerequisites ==');

(function() {
  var state = makeState();
  var pid = uid();

  // builders_oath requires founding_of_nexus
  var result = StoryEngine.discoverLore(state, pid, 'builders_oath', 'exploration');
  assert(result.success === false, 'discoverLore fails when prerequisite not met');
  assertEqual(result.error, 'Prerequisites not met', 'Correct error for unmet prereq');

  // Now fulfill prerequisite
  StoryEngine.discoverLore(state, pid, 'founding_of_nexus', 'npc_talk');
  var result2 = StoryEngine.discoverLore(state, pid, 'builders_oath', 'exploration');
  assert(result2.success === true, 'discoverLore succeeds after prerequisite met');
  assertEqual(result2.loreEntry.id, 'builders_oath', 'Correct lore entry returned');
})();

// ============================================================================
// SUITE 9: discoverLore — wrong discovery method
// ============================================================================

console.log('\n== Suite 9: discoverLore Wrong Method ==');

(function() {
  var state = makeState();
  var pid = uid();

  // founding_of_nexus requires npc_talk
  var result = StoryEngine.discoverLore(state, pid, 'founding_of_nexus', 'exploration');
  assert(result.success === false, 'discoverLore fails with wrong discovery method');
  assertEqual(result.error, 'Wrong discovery method', 'Correct error for wrong method');

  // Correct method succeeds
  var result2 = StoryEngine.discoverLore(state, pid, 'founding_of_nexus', 'npc_talk');
  assert(result2.success === true, 'discoverLore succeeds with correct method');
})();

// ============================================================================
// SUITE 10: discoverLore — null method skips method check
// ============================================================================

console.log('\n== Suite 10: discoverLore Null Method ==');

(function() {
  var state = makeState();
  var pid = uid();

  // Passing null method should skip method check
  var result = StoryEngine.discoverLore(state, pid, 'founding_of_nexus', null);
  assert(result.success === true, 'discoverLore with null method skips method check');

  var state2 = makeState();
  var pid2 = uid();
  var result2 = StoryEngine.discoverLore(state2, pid2, 'founding_of_nexus', undefined);
  assert(result2.success === true, 'discoverLore with undefined method skips method check');
})();

// ============================================================================
// SUITE 11: discoverLore — unknown lore ID
// ============================================================================

console.log('\n== Suite 11: discoverLore Unknown Lore ID ==');

(function() {
  var state = makeState();
  var pid = uid();

  var result = StoryEngine.discoverLore(state, pid, 'this_does_not_exist', 'npc_talk');
  assert(result.success === false, 'discoverLore fails for unknown lore ID');
  assert(result.error !== null, 'discoverLore returns error for unknown lore ID');
})();

// ============================================================================
// SUITE 12: discoverLore — arc completion detection
// ============================================================================

console.log('\n== Suite 12: discoverLore Arc Completion ==');

(function() {
  var state = makeState();
  var pid = uid();

  // 'the_first_dawn' arc: founding_of_nexus, builders_oath, garden_of_dreams
  StoryEngine.discoverLore(state, pid, 'founding_of_nexus', null);
  StoryEngine.discoverLore(state, pid, 'builders_oath', null);
  var result = StoryEngine.discoverLore(state, pid, 'garden_of_dreams', null);

  assert(result.success === true, 'Third part discovered successfully');
  assert(result.arcCompleted !== null, 'Arc completion detected on final part');
  assertEqual(result.arcCompleted.id, 'the_first_dawn', 'Correct arc detected as completed');
  assert(result.reward !== null, 'Reward provided on arc completion');
  assertEqual(result.reward.spark, 100, 'Correct spark reward for the_first_dawn');
  assertEqual(result.reward.xp, 200, 'Correct xp reward for the_first_dawn');
  assertEqual(result.reward.badge, 'lorekeeper', 'Correct badge reward for the_first_dawn');
})();

// ============================================================================
// SUITE 13: Arc rewards validation
// ============================================================================

console.log('\n== Suite 13: Arc Rewards Validation ==');

(function() {
  var arcs = StoryEngine.getStoryArcs();
  arcs.forEach(function(arc) {
    assert(arc.reward.spark > 0, 'Arc ' + arc.id + ' spark reward > 0');
    assert(arc.reward.xp > 0, 'Arc ' + arc.id + ' xp reward > 0');
    assert(typeof arc.reward.badge === 'string' && arc.reward.badge.length > 0, 'Arc ' + arc.id + ' badge is non-empty string');
  });

  // Specific arcs
  var firstDawn = arcs.filter(function(a) { return a.id === 'the_first_dawn'; })[0];
  assertEqual(firstDawn.reward.spark, 100, 'the_first_dawn spark reward is 100');
  assertEqual(firstDawn.reward.badge, 'lorekeeper', 'the_first_dawn badge is lorekeeper');

  var scholars = arcs.filter(function(a) { return a.id === 'the_scholars_path'; })[0];
  assertEqual(scholars.reward.spark, 200, 'the_scholars_path spark reward is 200');
  assertEqual(scholars.reward.badge, 'deep_reader', 'the_scholars_path badge is deep_reader');
})();

// ============================================================================
// SUITE 14: getArcProgress
// ============================================================================

console.log('\n== Suite 14: getArcProgress ==');

(function() {
  var state = makeState();
  var pid = uid();

  var prog0 = StoryEngine.getArcProgress(state, pid, 'the_first_dawn');
  assertEqual(prog0.partsFound, 0, 'Arc progress partsFound starts at 0');
  assertEqual(prog0.totalParts, 3, 'Arc the_first_dawn has 3 total parts');
  assertEqual(prog0.percent, 0, 'Arc progress percent starts at 0');
  assert(prog0.completed === false, 'Arc not completed at start');
  assertEqual(prog0.missingParts.length, 3, 'All 3 parts missing at start');

  StoryEngine.discoverLore(state, pid, 'founding_of_nexus', null);
  var prog1 = StoryEngine.getArcProgress(state, pid, 'the_first_dawn');
  assertEqual(prog1.partsFound, 1, 'partsFound increments to 1');
  assertEqual(prog1.percent, 33, 'percent is 33 after 1/3 parts');
  assertEqual(prog1.missingParts.length, 2, '2 parts still missing');

  StoryEngine.discoverLore(state, pid, 'builders_oath', null);
  StoryEngine.discoverLore(state, pid, 'garden_of_dreams', null);
  var prog3 = StoryEngine.getArcProgress(state, pid, 'the_first_dawn');
  assertEqual(prog3.partsFound, 3, 'partsFound is 3 after all parts found');
  assertEqual(prog3.percent, 100, 'percent is 100 on arc completion');
  assert(prog3.completed === true, 'Arc completed after all parts found');
  assertEqual(prog3.missingParts.length, 0, 'No missing parts on completion');

  // Unknown arc
  var progUnknown = StoryEngine.getArcProgress(state, pid, 'nonexistent_arc');
  assertEqual(progUnknown.partsFound, 0, 'Unknown arc has 0 parts found');
  assertEqual(progUnknown.totalParts, 0, 'Unknown arc has 0 total parts');
})();

// ============================================================================
// SUITE 15: getAllArcProgress
// ============================================================================

console.log('\n== Suite 15: getAllArcProgress ==');

(function() {
  var state = makeState();
  var pid = uid();

  var allProgress = StoryEngine.getAllArcProgress(state, pid);
  assertEqual(allProgress.length, 8, 'getAllArcProgress returns 8 entries');

  allProgress.forEach(function(item) {
    assert(typeof item.arc === 'object', 'Each item has arc');
    assert(typeof item.progress === 'object', 'Each item has progress');
    assert(item.progress.completed === false, 'No arcs completed for fresh player');
    assertEqual(item.progress.partsFound, 0, 'No parts found for fresh player');
  });
})();

// ============================================================================
// SUITE 16: getDiscoveredLore
// ============================================================================

console.log('\n== Suite 16: getDiscoveredLore ==');

(function() {
  var state = makeState();
  var pid = uid();

  var emptyLore = StoryEngine.getDiscoveredLore(state, pid);
  assertEqual(emptyLore.length, 0, 'getDiscoveredLore returns empty array for new player');

  StoryEngine.discoverLore(state, pid, 'founding_of_nexus', null);
  StoryEngine.discoverLore(state, pid, 'the_seven_questions', null);
  StoryEngine.discoverLore(state, pid, 'the_nexus_round', null);

  var all = StoryEngine.getDiscoveredLore(state, pid);
  assertEqual(all.length, 3, 'getDiscoveredLore returns 3 entries');

  var history = StoryEngine.getDiscoveredLore(state, pid, 'history');
  assertEqual(history.length, 1, 'getDiscoveredLore filtered by history returns 1');
  assertEqual(history[0].id, 'founding_of_nexus', 'Correct history entry returned');

  var teaching = StoryEngine.getDiscoveredLore(state, pid, 'teaching');
  assertEqual(teaching.length, 1, 'getDiscoveredLore filtered by teaching returns 1');

  var song = StoryEngine.getDiscoveredLore(state, pid, 'song');
  assertEqual(song.length, 1, 'getDiscoveredLore filtered by song returns 1');

  var mystery = StoryEngine.getDiscoveredLore(state, pid, 'mystery');
  assertEqual(mystery.length, 0, 'getDiscoveredLore filtered by mystery returns 0');

  // Non-existent player
  var noneState = makeState();
  var none = StoryEngine.getDiscoveredLore(noneState, 'ghost_player');
  assertEqual(none.length, 0, 'getDiscoveredLore returns empty for unknown player');
})();

// ============================================================================
// SUITE 17: getUndiscoveredLore
// ============================================================================

console.log('\n== Suite 17: getUndiscoveredLore ==');

(function() {
  var state = makeState();
  var pid = uid();

  // Fresh player — should see all lore with no prerequisites
  var undiscovered = StoryEngine.getUndiscoveredLore(state, pid);
  assertGTE(undiscovered.length, 1, 'getUndiscoveredLore returns at least 1 for fresh player');

  // Discover one entry, it should disappear from undiscovered
  StoryEngine.discoverLore(state, pid, 'founding_of_nexus', null);
  var undiscovered2 = StoryEngine.getUndiscoveredLore(state, pid);
  assert(undiscovered2.every(function(e) { return e.id !== 'founding_of_nexus'; }), 'Discovered lore removed from undiscovered list');

  // Hidden lore (prereq not met) should not appear by default
  var hasBuilders = undiscovered2.some(function(e) { return e.id === 'builders_oath'; });
  // builders_oath prereq is founding_of_nexus which is now met, so it SHOULD appear
  assert(hasBuilders, 'builders_oath now appears in undiscovered since prereq is met');

  // With includeHidden = true we get everything undiscovered including locked ones
  var withHidden = StoryEngine.getUndiscoveredLore(state, pid, true);
  assertGTE(withHidden.length, undiscovered2.length, 'includeHidden returns at least as many as without');
})();

// ============================================================================
// SUITE 18: getAvailableLore — filtering
// ============================================================================

console.log('\n== Suite 18: getAvailableLore Filtering ==');

(function() {
  var state = makeState();
  var pid = uid();

  // Filter by method
  var npcTalkLore = StoryEngine.getAvailableLore(state, pid, 'npc_talk', null, null);
  assert(npcTalkLore.every(function(e) { return e.discoveryMethod === 'npc_talk'; }), 'All returned entries have npc_talk method');

  var explorationLore = StoryEngine.getAvailableLore(state, pid, 'exploration', null, null);
  assert(explorationLore.every(function(e) { return e.discoveryMethod === 'exploration'; }), 'All returned entries have exploration method');

  // Filter by zone
  var nexusLore = StoryEngine.getAvailableLore(state, pid, null, 'nexus', null);
  assert(nexusLore.every(function(e) { return e.zone === 'nexus'; }), 'All returned entries are in nexus zone');
  assertGTE(nexusLore.length, 1, 'At least 1 nexus lore available');

  // Filter by season — spring-only lore
  var springLore = StoryEngine.getAvailableLore(state, pid, null, null, 'spring');
  var hasNonSpring = springLore.some(function(e) { return e.season !== null && e.season !== 'spring'; });
  assert(!hasNonSpring, 'Spring filter excludes non-spring seasonal lore');

  // Winter filter should exclude spring-only
  var winterLore = StoryEngine.getAvailableLore(state, pid, null, null, 'winter');
  var hasSpringOnly = winterLore.some(function(e) { return e.season === 'spring'; });
  assert(!hasSpringOnly, 'Winter filter excludes spring-only lore');

  // Combined filter
  var combined = StoryEngine.getAvailableLore(state, pid, 'npc_talk', 'nexus', null);
  assert(combined.every(function(e) {
    return e.discoveryMethod === 'npc_talk' && e.zone === 'nexus';
  }), 'Combined method+zone filter works correctly');

  // Already discovered items excluded
  StoryEngine.discoverLore(state, pid, 'founding_of_nexus', null);
  var afterDiscover = StoryEngine.getAvailableLore(state, pid, null, 'nexus', null);
  assert(afterDiscover.every(function(e) { return e.id !== 'founding_of_nexus'; }), 'Discovered lore not in available list');
})();

// ============================================================================
// SUITE 19: Seasonal lore availability
// ============================================================================

console.log('\n== Suite 19: Seasonal Lore Availability ==');

(function() {
  var state = makeState();
  var pid = uid();

  // garden_of_dreams is spring only
  var springAvail = StoryEngine.getAvailableLore(state, pid, null, 'gardens', 'spring');
  var hasGardenDreams = springAvail.some(function(e) { return e.id === 'garden_of_dreams'; });
  assert(hasGardenDreams, 'garden_of_dreams available in spring');

  // garden_of_dreams NOT available in winter
  var winterAvail = StoryEngine.getAvailableLore(state, pid, null, 'gardens', 'winter');
  var noGardenDreams = winterAvail.every(function(e) { return e.id !== 'garden_of_dreams'; });
  assert(noGardenDreams, 'garden_of_dreams NOT available in winter');

  // winter_anthem is winter only
  var winterCommons = StoryEngine.getAvailableLore(state, pid, null, 'commons', 'winter');
  var hasWinterAnthem = winterCommons.some(function(e) { return e.id === 'winter_anthem'; });
  assert(hasWinterAnthem, 'winter_anthem available in winter/commons');

  var summerCommons = StoryEngine.getAvailableLore(state, pid, null, 'commons', 'summer');
  var noWinterAnthem = summerCommons.every(function(e) { return e.id !== 'winter_anthem'; });
  assert(noWinterAnthem, 'winter_anthem NOT available in summer');

  // Null-season entries available in any season
  var nexusSummer = StoryEngine.getAvailableLore(state, pid, null, 'nexus', 'summer');
  var nexusWinter = StoryEngine.getAvailableLore(state, pid, null, 'nexus', 'winter');
  // founding_of_nexus has season: null, should appear in both
  var summerHas = nexusSummer.some(function(e) { return e.id === 'founding_of_nexus'; });
  var winterHas = nexusWinter.some(function(e) { return e.id === 'founding_of_nexus'; });
  assert(summerHas, 'founding_of_nexus (null season) available in summer');
  assert(winterHas, 'founding_of_nexus (null season) available in winter');
})();

// ============================================================================
// SUITE 20: getNpcStory
// ============================================================================

console.log('\n== Suite 20: getNpcStory ==');

(function() {
  var state = makeState();
  var pid = uid();

  // Storyteller in nexus — should find founding_of_nexus
  var story = StoryEngine.getNpcStory(state, pid, 'storyteller', 'nexus', null);
  assert(story !== null, 'getNpcStory returns story for storyteller in nexus');
  assertEqual(story.npcArchetype, 'storyteller', 'Returned story has correct npcArchetype');
  assertEqual(story.zone, 'nexus', 'Returned story is in nexus zone');

  // After player discovers it, NPC has nothing new
  StoryEngine.discoverLore(state, pid, story.id, null);
  // Discover any remaining storyteller/nexus entries
  var remaining = StoryEngine.getAvailableLore(state, pid, null, 'nexus', null).filter(function(e) {
    return e.npcArchetype === 'storyteller';
  });
  // Discover all remaining storyteller/nexus entries
  remaining.forEach(function(e) {
    StoryEngine.discoverLore(state, pid, e.id, null);
  });
  var noStory = StoryEngine.getNpcStory(state, pid, 'storyteller', 'nexus', null);
  assert(noStory === null, 'getNpcStory returns null when player has heard everything');

  // Gardener in gardens
  var state2 = makeState();
  var pid2 = uid();
  var gardenerStory = StoryEngine.getNpcStory(state2, pid2, 'gardener', 'gardens', null);
  assert(gardenerStory !== null, 'Gardener in gardens has stories to tell');
  assertEqual(gardenerStory.npcArchetype, 'gardener', 'getNpcStory returns gardener archetype');
  assertEqual(gardenerStory.zone, 'gardens', 'getNpcStory returns gardens zone');

  // Seasonal: gardener in gardens in spring can tell garden_of_dreams
  var state3 = makeState();
  var pid3 = uid();
  var springStory = StoryEngine.getNpcStory(state3, pid3, 'gardener', 'gardens', 'spring');
  assert(springStory !== null, 'Gardener in gardens in spring has stories');

  // Wrong archetype for zone returns null (musician in arena)
  var state4 = makeState();
  var pid4 = uid();
  var wrongArch = StoryEngine.getNpcStory(state4, pid4, 'musician', 'arena', null);
  // musician archetype has no entries in arena zone
  assert(wrongArch === null, 'getNpcStory returns null for archetype with no entries in zone');
})();

// ============================================================================
// SUITE 21: generateStoryBeat
// ============================================================================

console.log('\n== Suite 21: generateStoryBeat ==');

(function() {
  var context = {
    season: 'summer',
    zone: 'gardens',
    playerName: 'Aria',
    npcName: 'Elder Verdana'
  };

  var result = StoryEngine.generateStoryBeat('harvest_festival', context);
  assert(result.success === true, 'generateStoryBeat succeeds for known event type');
  assert(typeof result.text === 'string' && result.text.length > 0, 'generateStoryBeat returns non-empty text');
  assertEqual(result.eventType, 'harvest_festival', 'generateStoryBeat returns correct eventType');

  // Template substitution
  assert(result.text.indexOf('{') === -1, 'All template placeholders are substituted');
  assert(result.text.indexOf('summer') !== -1 || result.text.indexOf('gardens') !== -1 || result.text.indexOf('Aria') !== -1 || result.text.indexOf('Elder Verdana') !== -1, 'Context values appear in generated text');

  // All event types work
  var eventTypes = ['harvest_festival', 'storm_warning', 'new_citizen', 'contest_won', 'artifact_found', 'rare_weather'];
  eventTypes.forEach(function(evType) {
    var r = StoryEngine.generateStoryBeat(evType, context);
    assert(r.success === true, 'generateStoryBeat succeeds for event type: ' + evType);
    assert(r.text.indexOf('{') === -1, 'No unresolved placeholders for event type: ' + evType);
  });

  // Unknown event type
  var bad = StoryEngine.generateStoryBeat('unknown_event_xyz', context);
  assert(bad.success === false, 'generateStoryBeat fails for unknown event type');
  assert(typeof bad.error === 'string', 'generateStoryBeat returns error string for unknown type');
  assert(bad.text === null, 'generateStoryBeat text is null for unknown type');

  // Deterministic with same context
  var r1 = StoryEngine.generateStoryBeat('harvest_festival', context);
  var r2 = StoryEngine.generateStoryBeat('harvest_festival', context);
  assertEqual(r1.text, r2.text, 'generateStoryBeat is deterministic with same context');

  // Context with partial values
  var partial = StoryEngine.generateStoryBeat('storm_warning', { season: 'winter', zone: 'wilds' });
  assert(partial.success === true, 'generateStoryBeat works with partial context');
  assert(partial.text.indexOf('{season}') === -1, 'season placeholder resolved in partial context');
  assert(partial.text.indexOf('{zone}') === -1, 'zone placeholder resolved in partial context');
})();

// ============================================================================
// SUITE 22: getCompletionPercent
// ============================================================================

console.log('\n== Suite 22: getCompletionPercent ==');

(function() {
  var state = makeState();
  var pid = uid();

  assertEqual(StoryEngine.getCompletionPercent(state, pid), 0, 'Fresh player has 0% completion');

  StoryEngine.discoverLore(state, pid, 'founding_of_nexus', null);
  var pct = StoryEngine.getCompletionPercent(state, pid);
  assertGTE(pct, 1, 'Completion percent > 0 after first discovery');
  assert(pct < 100, 'Completion percent < 100 after one discovery');

  // Discover all lore
  var allState = makeState();
  var allPid = uid();
  StoryEngine._LORE_ENTRIES.forEach(function(entry) {
    // Force-add without checks
    if (!allState.players[allPid]) allState.players[allPid] = { discoveredLore: [], discoveredLoreTimestamps: {} };
    allState.players[allPid].discoveredLore.push(entry.id);
  });
  assertEqual(StoryEngine.getCompletionPercent(allState, allPid), 100, 'Full completion = 100%');

  // Unknown player
  var emptyState = makeState();
  assertEqual(StoryEngine.getCompletionPercent(emptyState, 'nobody'), 0, 'Unknown player = 0%');
})();

// ============================================================================
// SUITE 23: searchLore
// ============================================================================

console.log('\n== Suite 23: searchLore ==');

(function() {
  var state = makeState();
  var pid = uid();

  // Discover several entries
  StoryEngine.discoverLore(state, pid, 'founding_of_nexus', null);
  StoryEngine.discoverLore(state, pid, 'the_seven_questions', null);
  StoryEngine.discoverLore(state, pid, 'on_the_nature_of_spark', null);
  StoryEngine.discoverLore(state, pid, 'the_nexus_round', null);

  // Search by word in title
  var nexusResults = StoryEngine.searchLore(state, pid, 'nexus');
  assertGTE(nexusResults.length, 1, 'searchLore finds entries with "nexus" in title');

  // Search by word in text
  var sparkResults = StoryEngine.searchLore(state, pid, 'spark');
  assertGTE(sparkResults.length, 1, 'searchLore finds entries with "spark" in text');

  // Case-insensitive search
  var upperResults = StoryEngine.searchLore(state, pid, 'ZION');
  assertGTE(upperResults.length, 1, 'searchLore is case-insensitive');

  // No match
  var noMatch = StoryEngine.searchLore(state, pid, 'xyzzy_no_match_12345');
  assertEqual(noMatch.length, 0, 'searchLore returns empty for no match');

  // Empty query
  var emptyQuery = StoryEngine.searchLore(state, pid, '');
  assertEqual(emptyQuery.length, 0, 'searchLore returns empty for empty query');

  // Undiscovered lore NOT returned
  StoryEngine.discoverLore(state, pid, 'the_seven_questions', null);
  var searchAll = StoryEngine.searchLore(state, pid, 'seven');
  // Only seven_questions should appear if it's the only discovered entry with 'seven'
  var allFromSearch = searchAll.map(function(e) { return e.id; });
  assert(allFromSearch.indexOf('the_seven_questions') !== -1, 'searchLore finds discovered entry with "seven"');

  // Unknown player
  assertEqual(StoryEngine.searchLore(makeState(), 'nobody', 'anything').length, 0, 'searchLore returns empty for unknown player');
})();

// ============================================================================
// SUITE 24: getRecentDiscoveries
// ============================================================================

console.log('\n== Suite 24: getRecentDiscoveries ==');

(function() {
  var state = makeState();
  var pid = uid();

  var empty = StoryEngine.getRecentDiscoveries(state, pid, 5);
  assertEqual(empty.length, 0, 'getRecentDiscoveries returns empty for new player');

  // Discover 3 entries with slight delays via timestamp manipulation
  var p = state.players[pid] = { discoveredLore: [], discoveredLoreTimestamps: {} };
  p.discoveredLore.push('founding_of_nexus');
  p.discoveredLoreTimestamps['founding_of_nexus'] = 1000;
  p.discoveredLore.push('the_seven_questions');
  p.discoveredLoreTimestamps['the_seven_questions'] = 2000;
  p.discoveredLore.push('on_the_nature_of_spark');
  p.discoveredLoreTimestamps['on_the_nature_of_spark'] = 3000;

  var recent3 = StoryEngine.getRecentDiscoveries(state, pid, 3);
  assertEqual(recent3.length, 3, 'getRecentDiscoveries returns 3 entries');
  // Most recent first
  assertEqual(recent3[0].id, 'on_the_nature_of_spark', 'Most recent entry is first');
  assertEqual(recent3[1].id, 'the_seven_questions', 'Second most recent is second');
  assertEqual(recent3[2].id, 'founding_of_nexus', 'Oldest entry is last');

  var recent2 = StoryEngine.getRecentDiscoveries(state, pid, 2);
  assertEqual(recent2.length, 2, 'getRecentDiscoveries respects count limit');

  // Count larger than available
  var recent10 = StoryEngine.getRecentDiscoveries(state, pid, 10);
  assertEqual(recent10.length, 3, 'getRecentDiscoveries returns all when count > available');

  // Unknown player
  assertEqual(StoryEngine.getRecentDiscoveries(makeState(), 'nobody', 5).length, 0, 'getRecentDiscoveries empty for unknown player');
})();

// ============================================================================
// SUITE 25: getCategories
// ============================================================================

console.log('\n== Suite 25: getCategories ==');

(function() {
  var cats = StoryEngine.getCategories();
  assert(Array.isArray(cats), 'getCategories returns array');
  assertEqual(cats.length, 7, 'getCategories returns exactly 7 categories');
  assertIn(cats, 'history', 'categories includes history');
  assertIn(cats, 'legend', 'categories includes legend');
  assertIn(cats, 'mystery', 'categories includes mystery');
  assertIn(cats, 'prophecy', 'categories includes prophecy');
  assertIn(cats, 'song', 'categories includes song');
  assertIn(cats, 'tale', 'categories includes tale');
  assertIn(cats, 'teaching', 'categories includes teaching');

  // Returns a copy (mutation safety)
  var cats2 = StoryEngine.getCategories();
  cats2.push('fake_category');
  var cats3 = StoryEngine.getCategories();
  assertEqual(cats3.length, 7, 'getCategories returns new array each time (mutation safe)');
})();

// ============================================================================
// SUITE 26: getStoryArcs — mutation safety
// ============================================================================

console.log('\n== Suite 26: getStoryArcs Mutation Safety ==');

(function() {
  var arcs1 = StoryEngine.getStoryArcs();
  arcs1.push({ id: 'fake_arc' });
  var arcs2 = StoryEngine.getStoryArcs();
  assertEqual(arcs2.length, 8, 'getStoryArcs returns new array each time');
})();

// ============================================================================
// SUITE 27: Edge cases — empty/null state
// ============================================================================

console.log('\n== Suite 27: Edge Cases ==');

(function() {
  // null state
  var nullResult = StoryEngine.discoverLore(null, 'pid', 'founding_of_nexus', 'npc_talk');
  assert(nullResult.success === false, 'discoverLore handles null state gracefully');

  // null playerId
  var nullPid = StoryEngine.discoverLore(makeState(), null, 'founding_of_nexus', 'npc_talk');
  assert(nullPid.success === false, 'discoverLore handles null playerId gracefully');

  // null loreId
  var nullLore = StoryEngine.discoverLore(makeState(), 'pid', null, 'npc_talk');
  assert(nullLore.success === false, 'discoverLore handles null loreId gracefully');

  // getDiscoveredLore on completely empty state
  var emptyDisc = StoryEngine.getDiscoveredLore({}, 'nobody');
  assertEqual(emptyDisc.length, 0, 'getDiscoveredLore handles empty state');

  // getCompletionPercent on null state
  var pctNull = StoryEngine.getCompletionPercent(null, 'pid');
  assertEqual(pctNull, 0, 'getCompletionPercent returns 0 for null state');

  // searchLore on null state
  var searchNull = StoryEngine.searchLore(null, 'pid', 'nexus');
  assertEqual(searchNull.length, 0, 'searchLore returns empty for null state');

  // getRecentDiscoveries on null state
  var recentNull = StoryEngine.getRecentDiscoveries(null, 'pid', 5);
  assertEqual(recentNull.length, 0, 'getRecentDiscoveries returns empty for null state');

  // getAvailableLore on empty state
  var state = {};
  var avail = StoryEngine.getAvailableLore(state, 'new_player', null, null, null);
  assertGTE(avail.length, 0, 'getAvailableLore works on empty state');

  // getLoreByZone for each valid zone returns array
  var zones = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];
  zones.forEach(function(z) {
    var lore = StoryEngine.getLoreByZone(z);
    assert(Array.isArray(lore), 'getLoreByZone returns array for ' + z);
  });
})();

// ============================================================================
// SUITE 28: Prerequisites chain validation
// ============================================================================

console.log('\n== Suite 28: Prerequisites Chain Validation ==');

(function() {
  var state = makeState();
  var pid = uid();

  // verdanas_lost_seed requires garden_of_dreams, which requires no prereqs (but has spring season)
  // garden_of_dreams has no prerequisites
  // verdanas_lost_seed prereq is garden_of_dreams
  var result1 = StoryEngine.discoverLore(state, pid, 'verdanas_lost_seed', null);
  assert(result1.success === false, 'verdanas_lost_seed fails without garden_of_dreams');

  StoryEngine.discoverLore(state, pid, 'garden_of_dreams', null);
  var result2 = StoryEngine.discoverLore(state, pid, 'verdanas_lost_seed', null);
  assert(result2.success === true, 'verdanas_lost_seed succeeds after garden_of_dreams discovered');

  // caelens_eternal_library prereq is athenaeum_founding
  var state2 = makeState();
  var pid2 = uid();
  var r1 = StoryEngine.discoverLore(state2, pid2, 'caelens_eternal_library', null);
  assert(r1.success === false, 'caelens_eternal_library blocked by athenaeum_founding prereq');
  StoryEngine.discoverLore(state2, pid2, 'athenaeum_founding', null);
  var r2 = StoryEngine.discoverLore(state2, pid2, 'caelens_eternal_library', null);
  assert(r2.success === true, 'caelens_eternal_library unlocks after athenaeum_founding');
})();

// ============================================================================
// SUITE 29: STORY_TEMPLATES data integrity
// ============================================================================

console.log('\n== Suite 29: STORY_TEMPLATES Data Integrity ==');

(function() {
  var templates = StoryEngine._STORY_TEMPLATES;
  assert(Array.isArray(templates), '_STORY_TEMPLATES is an array');
  assertGTE(templates.length, 5, 'At least 5 event types in templates');

  templates.forEach(function(t) {
    assert(typeof t.eventType === 'string' && t.eventType.length > 0, 'Template has eventType: ' + t.eventType);
    assert(Array.isArray(t.templates) && t.templates.length > 0, 'Template ' + t.eventType + ' has non-empty templates array');
    t.templates.forEach(function(tmpl) {
      assert(typeof tmpl === 'string' && tmpl.length > 0, 'Individual template is non-empty string');
    });
  });

  var eventTypes = templates.map(function(t) { return t.eventType; });
  assertIn(eventTypes, 'harvest_festival', 'Templates include harvest_festival');
  assertIn(eventTypes, 'storm_warning', 'Templates include storm_warning');
  assertIn(eventTypes, 'new_citizen', 'Templates include new_citizen');
  assertIn(eventTypes, 'contest_won', 'Templates include contest_won');
  assertIn(eventTypes, 'artifact_found', 'Templates include artifact_found');
  assertIn(eventTypes, 'rare_weather', 'Templates include rare_weather');
})();

// ============================================================================
// SUITE 30: Multiple arc completion across one session
// ============================================================================

console.log('\n== Suite 30: Multiple Arc Completions ==');

(function() {
  var state = makeState();
  var pid = uid();

  // songs_of_the_world arc parts: nexus_round, gardens_lullaby, explorers_chorus, traders_ballad, winter_anthem
  var songParts = ['the_nexus_round', 'gardens_lullaby', 'the_explorers_chorus', 'traders_ballad', 'winter_anthem'];
  var completions = 0;

  songParts.forEach(function(partId, idx) {
    var r = StoryEngine.discoverLore(state, pid, partId, null);
    assert(r.success === true, 'Song part ' + partId + ' discovered');
    if (r.arcCompleted) completions++;
  });

  assertEqual(completions, 1, 'Exactly 1 arc completed after all song parts discovered');

  var songProgress = StoryEngine.getArcProgress(state, pid, 'songs_of_the_world');
  assert(songProgress.completed === true, 'songs_of_the_world arc is completed');
  assertEqual(songProgress.percent, 100, 'songs_of_the_world is 100%');
})();

// ============================================================================
// FINAL REPORT
// ============================================================================

console.log('\n========================================');
console.log('Total: ' + (passed + failed) + ' tests — ' + passed + ' passed, ' + failed + ' failed');
if (errors.length > 0) {
  console.log('\nFailed tests:');
  errors.forEach(function(msg) {
    console.log('  - ' + msg);
  });
  process.exit(1);
} else {
  console.log('All tests passed!');
  process.exit(0);
}
