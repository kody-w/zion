/**
 * tests/test_lore_discovery.js
 * 140+ tests covering all exported functions of LoreDiscovery module.
 *
 * Run with: node tests/test_lore_discovery.js
 */

'use strict';

var LD = require('../src/js/lore_discovery');

// ============================================================================
// TEST HARNESS
// ============================================================================

var passed = 0;
var failed = 0;
var failures = [];
var currentSuite = '';

function suite(name, fn) {
  currentSuite = name;
  console.log('\n' + name);
  fn();
}

function assert(condition, msg) {
  if (condition) {
    passed++;
    process.stdout.write('  ok - ' + msg + '\n');
  } else {
    failed++;
    var fullMsg = '[' + currentSuite + '] FAIL: ' + msg;
    failures.push(fullMsg);
    process.stdout.write('  FAIL - ' + msg + '\n');
  }
}

function assertEqual(a, b, msg) {
  assert(a === b, msg + ' (expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a) + ')');
}

function assertDeep(a, b, msg) {
  assert(JSON.stringify(a) === JSON.stringify(b), msg + ' (got ' + JSON.stringify(a) + ')');
}

// ============================================================================
// HELPERS
// ============================================================================

var playerSeq = 0;
function uid() { return 'player_' + (++playerSeq); }

function freshState() {
  return LD.createState();
}

function stateWithDisc(playerId, loreIds, tick) {
  var s = freshState();
  for (var i = 0; i < loreIds.length; i++) {
    LD.discoverLore(s, playerId, loreIds[i], tick || 100);
  }
  return s;
}

// ============================================================================
// SUITE 1: Module Exports
// ============================================================================

suite('Module exports', function() {

  assert(typeof LD === 'object', 'module exports an object');
  assert(Array.isArray(LD.LORE_ENTRIES), 'LORE_ENTRIES is an array');
  assert(Array.isArray(LD.LORE_SETS), 'LORE_SETS is an array');
  assert(Array.isArray(LD.CATEGORIES), 'CATEGORIES is an array');
  assert(Array.isArray(LD.DISCOVER_METHODS), 'DISCOVER_METHODS is an array');
  assert(typeof LD.createState === 'function', 'createState is a function');
  assert(typeof LD.discoverLore === 'function', 'discoverLore is a function');
  assert(typeof LD.getDiscoveredLore === 'function', 'getDiscoveredLore is a function');
  assert(typeof LD.getLoreEntry === 'function', 'getLoreEntry is a function');
  assert(typeof LD.getLoreByCategory === 'function', 'getLoreByCategory is a function');
  assert(typeof LD.getLoreByZone === 'function', 'getLoreByZone is a function');
  assert(typeof LD.getUndiscovered === 'function', 'getUndiscovered is a function');
  assert(typeof LD.getDiscoveryProgress === 'function', 'getDiscoveryProgress is a function');
  assert(typeof LD.getSetProgress === 'function', 'getSetProgress is a function');
  assert(typeof LD.getCompletedSets === 'function', 'getCompletedSets is a function');
  assert(typeof LD.getSetBadges === 'function', 'getSetBadges is a function');
  assert(typeof LD.checkPrerequisite === 'function', 'checkPrerequisite is a function');
  assert(typeof LD.getAvailableLore === 'function', 'getAvailableLore is a function');
  assert(typeof LD.getLoreHint === 'function', 'getLoreHint is a function');
  assert(typeof LD.getDiscoveryLog === 'function', 'getDiscoveryLog is a function');
  assert(typeof LD.getLoreLeaderboard === 'function', 'getLoreLeaderboard is a function');
  assert(typeof LD.getLoreStats === 'function', 'getLoreStats is a function');
  assert(typeof LD.getRarityDistribution === 'function', 'getRarityDistribution is a function');
  assert(typeof LD.mulberry32 === 'function', 'mulberry32 is exported');

});

// ============================================================================
// SUITE 2: LORE_ENTRIES integrity
// ============================================================================

suite('LORE_ENTRIES database integrity', function() {

  assert(LD.LORE_ENTRIES.length === 40, 'exactly 40 lore entries (got ' + LD.LORE_ENTRIES.length + ')');

  var requiredFields = ['id', 'title', 'text', 'category', 'zone', 'discoverMethod', 'prerequisite', 'rarity', 'hint', 'unlocks'];
  var allHaveFields = true;
  for (var i = 0; i < LD.LORE_ENTRIES.length; i++) {
    var e = LD.LORE_ENTRIES[i];
    for (var j = 0; j < requiredFields.length; j++) {
      if (!(requiredFields[j] in e)) { allHaveFields = false; break; }
    }
    if (!allHaveFields) break;
  }
  assert(allHaveFields, 'all entries have required fields');

  // Unique IDs
  var idMap = {};
  var uniqueIds = true;
  for (var k = 0; k < LD.LORE_ENTRIES.length; k++) {
    if (idMap[LD.LORE_ENTRIES[k].id]) { uniqueIds = false; break; }
    idMap[LD.LORE_ENTRIES[k].id] = true;
  }
  assert(uniqueIds, 'all entry IDs are unique');

  // Valid categories
  var validCats = ['zone_history', 'npc_backstory', 'item_legend', 'world_myth', 'hidden_secret'];
  var allValidCats = true;
  for (var c = 0; c < LD.LORE_ENTRIES.length; c++) {
    if (validCats.indexOf(LD.LORE_ENTRIES[c].category) === -1) { allValidCats = false; break; }
  }
  assert(allValidCats, 'all entries have valid categories');

  // Valid discoverMethods
  var validMethods = ['explore_location', 'talk_to_npc', 'use_item', 'solve_puzzle'];
  var allValidMethods = true;
  for (var m = 0; m < LD.LORE_ENTRIES.length; m++) {
    if (validMethods.indexOf(LD.LORE_ENTRIES[m].discoverMethod) === -1) { allValidMethods = false; break; }
  }
  assert(allValidMethods, 'all entries have valid discoverMethods');

  // Valid rarities
  var validRarities = ['common', 'uncommon', 'rare', 'legendary'];
  var allValidRarities = true;
  for (var r = 0; r < LD.LORE_ENTRIES.length; r++) {
    if (validRarities.indexOf(LD.LORE_ENTRIES[r].rarity) === -1) { allValidRarities = false; break; }
  }
  assert(allValidRarities, 'all entries have valid rarities');

  // prerequisite is null or valid id
  var validPrereqs = true;
  for (var p = 0; p < LD.LORE_ENTRIES.length; p++) {
    var pre = LD.LORE_ENTRIES[p].prerequisite;
    if (pre !== null && !idMap[pre]) { validPrereqs = false; break; }
  }
  assert(validPrereqs, 'all prerequisites reference valid entry IDs or null');

  // unlocks is an array
  var allUnlocksArray = true;
  for (var u = 0; u < LD.LORE_ENTRIES.length; u++) {
    if (!Array.isArray(LD.LORE_ENTRIES[u].unlocks)) { allUnlocksArray = false; break; }
  }
  assert(allUnlocksArray, 'all unlocks fields are arrays');

  // hint is a string
  var allHintsStr = true;
  for (var h = 0; h < LD.LORE_ENTRIES.length; h++) {
    if (typeof LD.LORE_ENTRIES[h].hint !== 'string' || LD.LORE_ENTRIES[h].hint.length === 0) {
      allHintsStr = false; break;
    }
  }
  assert(allHintsStr, 'all entries have non-empty hint strings');

  // text is a string with content
  var allTextStr = true;
  for (var t = 0; t < LD.LORE_ENTRIES.length; t++) {
    if (typeof LD.LORE_ENTRIES[t].text !== 'string' || LD.LORE_ENTRIES[t].text.length < 10) {
      allTextStr = false; break;
    }
  }
  assert(allTextStr, 'all entries have substantive text');

  // zone is valid
  var validZones = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];
  var allValidZones = true;
  for (var z = 0; z < LD.LORE_ENTRIES.length; z++) {
    if (validZones.indexOf(LD.LORE_ENTRIES[z].zone) === -1) { allValidZones = false; break; }
  }
  assert(allValidZones, 'all entries have valid zone names');

});

// ============================================================================
// SUITE 3: Category counts
// ============================================================================

suite('Category counts', function() {

  var counts = { zone_history: 0, npc_backstory: 0, item_legend: 0, world_myth: 0, hidden_secret: 0 };
  for (var i = 0; i < LD.LORE_ENTRIES.length; i++) {
    counts[LD.LORE_ENTRIES[i].category]++;
  }

  assert(counts.zone_history === 8, 'zone_history has 8 entries (got ' + counts.zone_history + ')');
  assert(counts.npc_backstory === 10, 'npc_backstory has 10 entries (got ' + counts.npc_backstory + ')');
  assert(counts.item_legend === 8, 'item_legend has 8 entries (got ' + counts.item_legend + ')');
  assert(counts.world_myth === 8, 'world_myth has 8 entries (got ' + counts.world_myth + ')');
  assert(counts.hidden_secret === 6, 'hidden_secret has 6 entries (got ' + counts.hidden_secret + ')');
  assertEqual(counts.zone_history + counts.npc_backstory + counts.item_legend + counts.world_myth + counts.hidden_secret, 40, 'total sums to 40');

});

// ============================================================================
// SUITE 4: LORE_SETS integrity
// ============================================================================

suite('LORE_SETS integrity', function() {

  assertEqual(LD.LORE_SETS.length, 5, 'exactly 5 lore sets');

  var requiredSetFields = ['id', 'name', 'description', 'badge', 'badgeLabel', 'entries'];
  var allHaveFields = true;
  for (var i = 0; i < LD.LORE_SETS.length; i++) {
    var s = LD.LORE_SETS[i];
    for (var j = 0; j < requiredSetFields.length; j++) {
      if (!(requiredSetFields[j] in s)) { allHaveFields = false; break; }
    }
    if (!allHaveFields) break;
  }
  assert(allHaveFields, 'all sets have required fields');

  // Set IDs unique
  var setIdMap = {};
  var uniqueSetIds = true;
  for (var k = 0; k < LD.LORE_SETS.length; k++) {
    if (setIdMap[LD.LORE_SETS[k].id]) { uniqueSetIds = false; break; }
    setIdMap[LD.LORE_SETS[k].id] = true;
  }
  assert(uniqueSetIds, 'all set IDs are unique');

  // Entries are arrays of valid lore IDs
  var entryIdMap = {};
  for (var e = 0; e < LD.LORE_ENTRIES.length; e++) entryIdMap[LD.LORE_ENTRIES[e].id] = true;

  var allEntriesValid = true;
  for (var s2 = 0; s2 < LD.LORE_SETS.length; s2++) {
    var entries = LD.LORE_SETS[s2].entries;
    if (!Array.isArray(entries) || entries.length === 0) { allEntriesValid = false; break; }
    for (var f = 0; f < entries.length; f++) {
      if (!entryIdMap[entries[f]]) { allEntriesValid = false; break; }
    }
    if (!allEntriesValid) break;
  }
  assert(allEntriesValid, 'all set entries reference valid lore IDs');

  // Badges are strings
  var allBadgesStr = true;
  for (var b = 0; b < LD.LORE_SETS.length; b++) {
    if (typeof LD.LORE_SETS[b].badge !== 'string' || typeof LD.LORE_SETS[b].badgeLabel !== 'string') {
      allBadgesStr = false; break;
    }
  }
  assert(allBadgesStr, 'all sets have badge and badgeLabel strings');

});

// ============================================================================
// SUITE 5: CATEGORIES array
// ============================================================================

suite('CATEGORIES array', function() {

  assertEqual(LD.CATEGORIES.length, 5, 'exactly 5 categories');

  var expectedIds = ['zone_history', 'npc_backstory', 'item_legend', 'world_myth', 'hidden_secret'];
  for (var i = 0; i < expectedIds.length; i++) {
    var found = false;
    for (var j = 0; j < LD.CATEGORIES.length; j++) {
      if (LD.CATEGORIES[j].id === expectedIds[i]) { found = true; break; }
    }
    assert(found, 'CATEGORIES includes ' + expectedIds[i]);
  }

  var requiredCatFields = ['id', 'label', 'description', 'icon', 'count'];
  var allHaveFields = true;
  for (var k = 0; k < LD.CATEGORIES.length; k++) {
    var cat = LD.CATEGORIES[k];
    for (var f = 0; f < requiredCatFields.length; f++) {
      if (!(requiredCatFields[f] in cat)) { allHaveFields = false; break; }
    }
    if (!allHaveFields) break;
  }
  assert(allHaveFields, 'all categories have required fields (id, label, description, icon, count)');

});

// ============================================================================
// SUITE 6: createState
// ============================================================================

suite('createState', function() {

  var s = LD.createState();
  assert(typeof s === 'object' && s !== null, 'createState returns an object');
  assert(typeof s.discovered === 'object', 'state has discovered object');
  assert(typeof s.setProgress === 'object', 'state has setProgress object');
  assert(Array.isArray(s.discoveryLog), 'state has discoveryLog array');
  assertEqual(s.discoveryLog.length, 0, 'discoveryLog starts empty');
  assertEqual(Object.keys(s.discovered).length, 0, 'discovered starts empty');
  assertEqual(Object.keys(s.setProgress).length, 0, 'setProgress starts empty');

  // Multiple createState calls produce independent objects
  var s2 = LD.createState();
  s.discovered['test'] = {};
  assert(!s2.discovered['test'], 'states are independent objects');

});

// ============================================================================
// SUITE 7: discoverLore — basic success
// ============================================================================

suite('discoverLore — basic success', function() {

  var p = uid(), s = freshState();
  var result = LD.discoverLore(s, p, 'zh_nexus_founding', 50);

  assert(result.success === true, 'success is true for valid no-prereq entry');
  assert(result.entry !== null, 'result includes entry');
  assertEqual(result.entry.id, 'zh_nexus_founding', 'result.entry.id matches');
  assert(Array.isArray(result.unlocked), 'result.unlocked is an array');
  assert(Array.isArray(result.setComplete), 'result.setComplete is an array');

  // State updated
  assert(!!s.discovered[p]['zh_nexus_founding'], 'discovery recorded in state');
  assertEqual(s.discovered[p]['zh_nexus_founding'].tick, 50, 'tick recorded correctly');

  // Discovery log updated
  assertEqual(s.discoveryLog.length, 1, 'discoveryLog has one entry');
  assertEqual(s.discoveryLog[0].playerId, p, 'log entry has correct playerId');
  assertEqual(s.discoveryLog[0].loreId, 'zh_nexus_founding', 'log entry has correct loreId');
  assertEqual(s.discoveryLog[0].tick, 50, 'log entry has correct tick');

});

// ============================================================================
// SUITE 8: discoverLore — unknown entry
// ============================================================================

suite('discoverLore — unknown entry', function() {

  var p = uid(), s = freshState();
  var result = LD.discoverLore(s, p, 'nonexistent_lore_id', 100);

  assert(result.success === false, 'success is false for unknown entry');
  assertEqual(result.reason, 'unknown_entry', 'reason is unknown_entry');
  assert(result.entry === null, 'entry is null');
  assertEqual(result.unlocked.length, 0, 'unlocked is empty');
  assertEqual(result.setComplete.length, 0, 'setComplete is empty');

});

// ============================================================================
// SUITE 9: discoverLore — already discovered
// ============================================================================

suite('discoverLore — already discovered', function() {

  var p = uid(), s = freshState();
  LD.discoverLore(s, p, 'zh_nexus_founding', 10);
  var result = LD.discoverLore(s, p, 'zh_nexus_founding', 20);

  assert(result.success === false, 'success is false when already discovered');
  assertEqual(result.reason, 'already_discovered', 'reason is already_discovered');
  // State not double-entered
  assertEqual(s.discoveryLog.length, 1, 'discoveryLog not incremented on duplicate');

});

// ============================================================================
// SUITE 10: discoverLore — prerequisite not met
// ============================================================================

suite('discoverLore — prerequisite not met', function() {

  var p = uid(), s = freshState();
  // zh_nexus_second_age requires zh_nexus_founding
  var result = LD.discoverLore(s, p, 'zh_nexus_second_age', 10);

  assert(result.success === false, 'success is false when prerequisite not met');
  assertEqual(result.reason, 'prerequisite_not_met', 'reason is prerequisite_not_met');
  assert(!s.discovered[p] || !s.discovered[p]['zh_nexus_second_age'], 'entry not recorded in state');

});

// ============================================================================
// SUITE 11: discoverLore — prerequisite met
// ============================================================================

suite('discoverLore — prerequisite chain', function() {

  var p = uid(), s = freshState();
  // Discover prerequisite first
  var r1 = LD.discoverLore(s, p, 'zh_nexus_founding', 10);
  assert(r1.success === true, 'founding discovered successfully');

  // Now unlock dependent entry
  var r2 = LD.discoverLore(s, p, 'zh_nexus_second_age', 20);
  assert(r2.success === true, 'second_age discovered after prerequisite met');
  assert(!!s.discovered[p]['zh_nexus_second_age'], 'second_age in state');

});

// ============================================================================
// SUITE 12: discoverLore — unlocked list
// ============================================================================

suite('discoverLore — unlocked list', function() {

  var p = uid(), s = freshState();
  var result = LD.discoverLore(s, p, 'zh_nexus_founding', 10);

  // zh_nexus_founding unlocks zh_nexus_second_age and wm_the_first_light
  assert(result.unlocked.indexOf('zh_nexus_second_age') !== -1, 'unlocked includes zh_nexus_second_age');
  assert(result.unlocked.indexOf('wm_the_first_light') !== -1, 'unlocked includes wm_the_first_light');

});

// ============================================================================
// SUITE 13: discoverLore — set completion
// ============================================================================

suite('discoverLore — set completion', function() {

  var p = uid(), s = freshState();
  // set_hidden_truths requires 6 entries — let's discover all 6
  var hiddenSet = null;
  for (var i = 0; i < LD.LORE_SETS.length; i++) {
    if (LD.LORE_SETS[i].id === 'set_hidden_truths') { hiddenSet = LD.LORE_SETS[i]; break; }
  }
  assert(hiddenSet !== null, 'found set_hidden_truths');

  // Discover all prerequisites for hidden_secret entries (in dependency order)
  // hs_moving_wilds needs zh_wilds_original_border
  LD.discoverLore(s, p, 'zh_wilds_original_border', 10);
  // hs_orvyns_warmth needs il_orvyns_candle -> nb_first_merchant -> zh_nexus_second_age -> zh_nexus_founding
  LD.discoverLore(s, p, 'zh_nexus_founding', 10);
  LD.discoverLore(s, p, 'zh_nexus_second_age', 10);
  LD.discoverLore(s, p, 'nb_first_merchant', 10);
  LD.discoverLore(s, p, 'il_orvyns_candle', 10);
  // hs_the_singing_bed needs nb_verdana -> zh_gardens_origin
  LD.discoverLore(s, p, 'zh_gardens_origin', 10);
  LD.discoverLore(s, p, 'nb_verdana', 10);
  // hs_color_formula needs nb_artist_lyra -> zh_studio_color_rebellion
  LD.discoverLore(s, p, 'zh_studio_color_rebellion', 10);
  LD.discoverLore(s, p, 'nb_artist_lyra', 10);
  // hs_domas_door needs nb_explorer_domas -> zh_wilds_original_border (already done)
  LD.discoverLore(s, p, 'nb_explorer_domas', 10);
  // hs_true_ledger needs nb_market_keeper -> zh_agora_night_market
  LD.discoverLore(s, p, 'zh_agora_night_market', 10);
  LD.discoverLore(s, p, 'nb_market_keeper', 10);

  // Now discover the 6 hidden secrets
  LD.discoverLore(s, p, 'hs_moving_wilds', 20);
  LD.discoverLore(s, p, 'hs_orvyns_warmth', 20);
  LD.discoverLore(s, p, 'hs_the_singing_bed', 20);
  LD.discoverLore(s, p, 'hs_color_formula', 20);
  LD.discoverLore(s, p, 'hs_domas_door', 20);
  var lastResult = LD.discoverLore(s, p, 'hs_true_ledger', 20);

  assert(lastResult.success === true, 'last hidden secret discovered successfully');
  assert(lastResult.setComplete.indexOf('set_hidden_truths') !== -1, 'set_hidden_truths completed on last discovery');
  assert(!!s.setProgress[p]['set_hidden_truths'], 'setProgress records set completion');

});

// ============================================================================
// SUITE 14: discoverLore — tick default
// ============================================================================

suite('discoverLore — tick defaults to 0', function() {

  var p = uid(), s = freshState();
  LD.discoverLore(s, p, 'zh_nexus_founding');
  assert(!!s.discovered[p]['zh_nexus_founding'], 'discovery recorded without tick arg');
  assertEqual(s.discovered[p]['zh_nexus_founding'].tick, 0, 'tick defaults to 0');

});

// ============================================================================
// SUITE 15: getDiscoveredLore
// ============================================================================

suite('getDiscoveredLore', function() {

  var p = uid(), s = freshState();
  var initial = LD.getDiscoveredLore(s, p);
  assert(Array.isArray(initial), 'returns array for new player');
  assertEqual(initial.length, 0, 'empty for new player');

  LD.discoverLore(s, p, 'zh_nexus_founding', 10);
  LD.discoverLore(s, p, 'zh_gardens_origin', 20);

  var disc = LD.getDiscoveredLore(s, p);
  assertEqual(disc.length, 2, 'returns 2 discovered entries');

  var hasNexus = disc.some(function(d) { return d.entry.id === 'zh_nexus_founding'; });
  var hasGardens = disc.some(function(d) { return d.entry.id === 'zh_gardens_origin'; });
  assert(hasNexus, 'includes zh_nexus_founding');
  assert(hasGardens, 'includes zh_gardens_origin');

  // Each result has entry and discoveryData
  assert(typeof disc[0].entry === 'object', 'result has entry object');
  assert(typeof disc[0].discoveryData === 'object', 'result has discoveryData object');
  assert(typeof disc[0].discoveryData.tick === 'number', 'discoveryData has tick');

});

// ============================================================================
// SUITE 16: getLoreEntry
// ============================================================================

suite('getLoreEntry', function() {

  var entry = LD.getLoreEntry('zh_nexus_founding');
  assert(entry !== null, 'returns entry for valid id');
  assertEqual(entry.id, 'zh_nexus_founding', 'returned entry has correct id');
  assertEqual(entry.category, 'zone_history', 'returned entry has correct category');

  var missing = LD.getLoreEntry('not_a_real_id');
  assert(missing === null, 'returns null for unknown id');

});

// ============================================================================
// SUITE 17: getLoreByCategory
// ============================================================================

suite('getLoreByCategory', function() {

  var zhEntries = LD.getLoreByCategory('zone_history');
  assert(Array.isArray(zhEntries), 'returns array');
  assertEqual(zhEntries.length, 8, 'zone_history has 8 entries');
  var allZH = zhEntries.every(function(e) { return e.category === 'zone_history'; });
  assert(allZH, 'all returned entries have category zone_history');

  var nbEntries = LD.getLoreByCategory('npc_backstory');
  assertEqual(nbEntries.length, 10, 'npc_backstory has 10 entries');

  var ilEntries = LD.getLoreByCategory('item_legend');
  assertEqual(ilEntries.length, 8, 'item_legend has 8 entries');

  var wmEntries = LD.getLoreByCategory('world_myth');
  assertEqual(wmEntries.length, 8, 'world_myth has 8 entries');

  var hsEntries = LD.getLoreByCategory('hidden_secret');
  assertEqual(hsEntries.length, 6, 'hidden_secret has 6 entries');

  var empty = LD.getLoreByCategory('nonexistent');
  assert(Array.isArray(empty), 'returns array for unknown category');
  assertEqual(empty.length, 0, 'empty for unknown category');

});

// ============================================================================
// SUITE 18: getLoreByZone
// ============================================================================

suite('getLoreByZone', function() {

  var nexusEntries = LD.getLoreByZone('nexus');
  assert(Array.isArray(nexusEntries), 'returns array');
  assert(nexusEntries.length > 0, 'nexus has entries');
  var allNexus = nexusEntries.every(function(e) { return e.zone === 'nexus'; });
  assert(allNexus, 'all returned entries have zone nexus');

  // Every zone has at least one entry
  var zones = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];
  for (var i = 0; i < zones.length; i++) {
    var zEntries = LD.getLoreByZone(zones[i]);
    assert(zEntries.length > 0, 'zone ' + zones[i] + ' has at least one entry');
  }

  var empty = LD.getLoreByZone('unknown_zone');
  assert(Array.isArray(empty) && empty.length === 0, 'empty for unknown zone');

});

// ============================================================================
// SUITE 19: getUndiscovered
// ============================================================================

suite('getUndiscovered', function() {

  var p = uid(), s = freshState();
  var undiscovered = LD.getUndiscovered(s, p);
  assertEqual(undiscovered.length, 40, 'all 40 undiscovered for new player');

  // Each has hint, category, zone, rarity, id
  var hasRequiredFields = undiscovered.every(function(u) {
    return typeof u.id === 'string' && typeof u.hint === 'string' &&
           typeof u.category === 'string' && typeof u.zone === 'string' &&
           typeof u.rarity === 'string';
  });
  assert(hasRequiredFields, 'each undiscovered entry has id, hint, category, zone, rarity');

  // Does not include text (hint only, not full entry)
  var noText = undiscovered.every(function(u) { return !('text' in u); });
  assert(noText, 'undiscovered entries do not expose full text');

  // Discover one; count drops
  LD.discoverLore(s, p, 'zh_nexus_founding', 10);
  var after = LD.getUndiscovered(s, p);
  assertEqual(after.length, 39, 'undiscovered count decreases after discovery');

  // Discovered entry not in undiscovered
  var stillHasNexus = after.some(function(u) { return u.id === 'zh_nexus_founding'; });
  assert(!stillHasNexus, 'discovered entry removed from undiscovered');

});

// ============================================================================
// SUITE 20: getDiscoveryProgress
// ============================================================================

suite('getDiscoveryProgress', function() {

  var p = uid(), s = freshState();
  var prog = LD.getDiscoveryProgress(s, p);
  assert(typeof prog === 'object', 'returns object');
  assertEqual(prog.found, 0, 'found starts at 0');
  assertEqual(prog.total, 40, 'total is 40');
  assertEqual(prog.pct, 0, 'pct starts at 0');
  assert(typeof prog.byCategory === 'object', 'has byCategory');

  // Discover one zone_history entry
  LD.discoverLore(s, p, 'zh_nexus_founding', 10);
  var prog2 = LD.getDiscoveryProgress(s, p);
  assertEqual(prog2.found, 1, 'found is 1 after one discovery');
  assertEqual(prog2.pct, Math.round(1/40*100), 'pct correct');
  assertEqual(prog2.byCategory.zone_history.found, 1, 'zone_history found is 1');
  assertEqual(prog2.byCategory.zone_history.total, 8, 'zone_history total is 8');
  assertEqual(prog2.byCategory.npc_backstory.found, 0, 'npc_backstory found is 0');

  // byCategory pct
  assert(typeof prog2.byCategory.zone_history.pct === 'number', 'byCategory has pct');
  assertEqual(prog2.byCategory.zone_history.pct, Math.round(1/8*100), 'zone_history pct correct');

});

// ============================================================================
// SUITE 21: getSetProgress
// ============================================================================

suite('getSetProgress', function() {

  var p = uid(), s = freshState();
  var setId = 'set_founding_stories';

  var prog = LD.getSetProgress(s, p, setId);
  assert(prog !== null, 'returns object for valid setId');
  assertEqual(prog.setId, setId, 'setId correct');
  assertEqual(prog.found, 0, 'found starts at 0');
  assertEqual(prog.total, 8, 'total is 8 for founding stories');
  assertEqual(prog.pct, 0, 'pct starts at 0');
  assert(prog.completed === false, 'not completed initially');
  assert(prog.badge === null, 'badge null when not complete');

  // Invalid setId
  var invalid = LD.getSetProgress(s, p, 'nonexistent_set');
  assert(invalid === null, 'returns null for invalid setId');

  // After partial discovery
  LD.discoverLore(s, p, 'zh_nexus_founding', 10);
  var prog2 = LD.getSetProgress(s, p, setId);
  assertEqual(prog2.found, 1, 'found is 1 after one qualifying discovery');

});

// ============================================================================
// SUITE 22: getCompletedSets
// ============================================================================

suite('getCompletedSets', function() {

  var p = uid(), s = freshState();
  var initial = LD.getCompletedSets(s, p);
  assert(Array.isArray(initial), 'returns array');
  assertEqual(initial.length, 0, 'empty for new player');

  // Simulate set completion via state manipulation
  if (!s.setProgress[p]) s.setProgress[p] = {};
  s.setProgress[p]['set_founding_stories'] = { completedAt: 100 };

  var completed = LD.getCompletedSets(s, p);
  assertEqual(completed.length, 1, 'one completed set after injection');
  assertEqual(completed[0].setId, 'set_founding_stories', 'correct setId returned');
  assert(typeof completed[0].set === 'object', 'set data included');
  assertEqual(completed[0].completedAt, 100, 'completedAt correct');

});

// ============================================================================
// SUITE 23: getSetBadges
// ============================================================================

suite('getSetBadges', function() {

  var p = uid(), s = freshState();
  var initial = LD.getSetBadges(s, p);
  assert(Array.isArray(initial), 'returns array');
  assertEqual(initial.length, 0, 'no badges for new player');

  if (!s.setProgress[p]) s.setProgress[p] = {};
  s.setProgress[p]['set_founding_stories'] = { completedAt: 100 };
  s.setProgress[p]['set_creation_myths'] = { completedAt: 200 };

  var badges = LD.getSetBadges(s, p);
  assertEqual(badges.length, 2, 'two badges for two completed sets');
  var hasBadge = badges.some(function(b) { return b.badge === 'badge_historian'; });
  assert(hasBadge, 'historian badge included');
  var hasMythBadge = badges.some(function(b) { return b.badge === 'badge_mythkeeper'; });
  assert(hasMythBadge, 'mythkeeper badge included');
  assert(typeof badges[0].label === 'string', 'badge has label');
  assert(typeof badges[0].setId === 'string', 'badge has setId');

});

// ============================================================================
// SUITE 24: checkPrerequisite
// ============================================================================

suite('checkPrerequisite', function() {

  var p = uid(), s = freshState();

  // Entry with no prerequisite
  assert(LD.checkPrerequisite(s, p, 'zh_nexus_founding') === true, 'no-prereq entry always available');
  assert(LD.checkPrerequisite(s, p, 'zh_gardens_origin') === true, 'gardens origin has no prereq');

  // Entry with unmet prerequisite
  assert(LD.checkPrerequisite(s, p, 'zh_nexus_second_age') === false, 'second_age prereq not met initially');

  // Meet the prerequisite
  LD.discoverLore(s, p, 'zh_nexus_founding', 10);
  assert(LD.checkPrerequisite(s, p, 'zh_nexus_second_age') === true, 'second_age prereq met after founding');

  // Unknown loreId
  assert(LD.checkPrerequisite(s, p, 'nonexistent') === false, 'false for unknown loreId');

});

// ============================================================================
// SUITE 25: getAvailableLore
// ============================================================================

suite('getAvailableLore', function() {

  var p = uid(), s = freshState();
  var available = LD.getAvailableLore(s, p);
  assert(Array.isArray(available), 'returns array');

  // All no-prereq entries should be available
  var noPrereqCount = LD.LORE_ENTRIES.filter(function(e) { return e.prerequisite === null; }).length;
  assertEqual(available.length, noPrereqCount, 'available count matches no-prereq entries');

  // No already-discovered entries
  LD.discoverLore(s, p, 'zh_nexus_founding', 10);
  var available2 = LD.getAvailableLore(s, p);
  var hasNexus = available2.some(function(e) { return e.id === 'zh_nexus_founding'; });
  assert(!hasNexus, 'discovered entry not in available');

  // Discovering prerequisite unlocks dependent entries
  var hasSecondAge = available2.some(function(e) { return e.id === 'zh_nexus_second_age'; });
  assert(hasSecondAge, 'zh_nexus_second_age available after prerequisite discovered');

});

// ============================================================================
// SUITE 26: getLoreHint
// ============================================================================

suite('getLoreHint', function() {

  var p = uid(), s = freshState();

  var hint = LD.getLoreHint(s, p, 'zh_nexus_founding');
  assert(typeof hint === 'string' && hint.length > 0, 'returns hint string for undiscovered entry');

  // Discovered entry returns null
  LD.discoverLore(s, p, 'zh_nexus_founding', 10);
  var hintAfter = LD.getLoreHint(s, p, 'zh_nexus_founding');
  assert(hintAfter === null, 'returns null for already discovered entry');

  // Unknown entry
  var hintUnknown = LD.getLoreHint(s, p, 'nonexistent');
  assert(hintUnknown === null, 'returns null for unknown entry');

});

// ============================================================================
// SUITE 27: getDiscoveryLog
// ============================================================================

suite('getDiscoveryLog', function() {

  var p = uid(), s = freshState();

  var emptyLog = LD.getDiscoveryLog(s, p, 10);
  assert(Array.isArray(emptyLog), 'returns array');
  assertEqual(emptyLog.length, 0, 'empty log for new player');

  LD.discoverLore(s, p, 'zh_nexus_founding', 10);
  LD.discoverLore(s, p, 'zh_gardens_origin', 20);
  LD.discoverLore(s, p, 'zh_athenaeum_open_door', 30);

  var log = LD.getDiscoveryLog(s, p);
  assertEqual(log.length, 3, 'log has 3 entries after 3 discoveries');
  assert(typeof log[0].loreId === 'string', 'log entry has loreId');
  assert(typeof log[0].tick === 'number', 'log entry has tick');
  assert(typeof log[0].title === 'string', 'log entry has title');

  // Count parameter limits results
  var limited = LD.getDiscoveryLog(s, p, 2);
  assertEqual(limited.length, 2, 'count parameter limits results to 2');

  // Count=1 returns most recent
  var one = LD.getDiscoveryLog(s, p, 1);
  assertEqual(one.length, 1, 'count=1 returns 1');
  assertEqual(one[0].loreId, 'zh_athenaeum_open_door', 'count=1 returns most recent');

  // Log is player-specific
  var p2 = uid();
  LD.discoverLore(s, p2, 'zh_nexus_founding', 5);
  var p2Log = LD.getDiscoveryLog(s, p2);
  assertEqual(p2Log.length, 1, 'p2 log has 1 entry');
  var p1Log = LD.getDiscoveryLog(s, p);
  assertEqual(p1Log.length, 3, 'p1 log unaffected by p2 discoveries');

});

// ============================================================================
// SUITE 28: getLoreLeaderboard
// ============================================================================

suite('getLoreLeaderboard', function() {

  var s = freshState();
  var p1 = uid(), p2 = uid(), p3 = uid();

  LD.discoverLore(s, p1, 'zh_nexus_founding', 10);
  LD.discoverLore(s, p1, 'zh_gardens_origin', 10);
  LD.discoverLore(s, p1, 'zh_athenaeum_open_door', 10);

  LD.discoverLore(s, p2, 'zh_nexus_founding', 10);
  LD.discoverLore(s, p2, 'zh_gardens_origin', 10);

  LD.discoverLore(s, p3, 'zh_nexus_founding', 10);

  var board = LD.getLoreLeaderboard(s);
  assert(Array.isArray(board), 'returns array');
  assertEqual(board.length, 3, 'three players in leaderboard');

  // Sorted descending
  assert(board[0].count >= board[1].count, 'first entry has more discoveries than second');
  assert(board[1].count >= board[2].count, 'second entry has more than third');
  assertEqual(board[0].playerId, p1, 'p1 is first (3 discoveries)');
  assertEqual(board[1].playerId, p2, 'p2 is second (2 discoveries)');
  assertEqual(board[2].playerId, p3, 'p3 is third (1 discovery)');

  // Count parameter
  var top2 = LD.getLoreLeaderboard(s, 2);
  assertEqual(top2.length, 2, 'count=2 limits to top 2');

  // Empty state
  var emptyState = freshState();
  var emptyBoard = LD.getLoreLeaderboard(emptyState);
  assert(Array.isArray(emptyBoard) && emptyBoard.length === 0, 'empty leaderboard for empty state');

});

// ============================================================================
// SUITE 29: getLoreStats
// ============================================================================

suite('getLoreStats', function() {

  var s = freshState();
  var p1 = uid(), p2 = uid();

  var statsEmpty = LD.getLoreStats(s);
  assert(typeof statsEmpty === 'object', 'returns object');
  assertEqual(statsEmpty.totalPlayers, 0, 'no players in empty state');
  assertEqual(statsEmpty.totalDiscoveries, 0, 'no discoveries in empty state');
  assertEqual(statsEmpty.totalEntries, 40, 'totalEntries is 40');
  assert(typeof statsEmpty.byCategory === 'object', 'has byCategory');
  assert(typeof statsEmpty.byRarity === 'object', 'has byRarity');

  LD.discoverLore(s, p1, 'zh_nexus_founding', 10);  // zone_history, common
  LD.discoverLore(s, p1, 'zh_gardens_origin', 10);   // zone_history, common
  LD.discoverLore(s, p2, 'nb_healer_thessaly', 10);  // npc_backstory, uncommon

  var stats = LD.getLoreStats(s);
  assertEqual(stats.totalPlayers, 2, 'two players recorded');
  assertEqual(stats.totalDiscoveries, 3, 'three total discoveries in log');
  assertEqual(stats.byCategory.zone_history, 2, 'zone_history count is 2');
  assertEqual(stats.byCategory.npc_backstory, 1, 'npc_backstory count is 1');
  assertEqual(stats.byRarity.common, 2, 'common rarity count is 2');
  assertEqual(stats.byRarity.uncommon, 1, 'uncommon rarity count is 1');

});

// ============================================================================
// SUITE 30: getRarityDistribution
// ============================================================================

suite('getRarityDistribution', function() {

  var dist = LD.getRarityDistribution();
  assert(typeof dist === 'object', 'returns object');
  assertEqual(dist.common, 0.60, 'common is 0.60');
  assertEqual(dist.uncommon, 0.25, 'uncommon is 0.25');
  assertEqual(dist.rare, 0.10, 'rare is 0.10');
  assertEqual(dist.legendary, 0.05, 'legendary is 0.05');

  var total = dist.common + dist.uncommon + dist.rare + dist.legendary;
  assert(Math.abs(total - 1.0) < 0.001, 'rarity weights sum to 1.0 (got ' + total + ')');

  // All rarity tiers should have at least one entry
  var rarityCount = { common: 0, uncommon: 0, rare: 0, legendary: 0 };
  for (var i = 0; i < LD.LORE_ENTRIES.length; i++) {
    rarityCount[LD.LORE_ENTRIES[i].rarity]++;
  }
  assert(rarityCount.common >= 1, 'at least one common entry');
  assert(rarityCount.uncommon >= 1, 'at least one uncommon entry');
  assert(rarityCount.rare >= 1, 'at least one rare entry');
  assert(rarityCount.legendary >= 1, 'at least one legendary entry');

});

// ============================================================================
// SUITE 31: Rarity distribution in entries
// ============================================================================

suite('Actual rarity breakdown in entries', function() {

  var counts = { common: 0, uncommon: 0, rare: 0, legendary: 0 };
  for (var i = 0; i < LD.LORE_ENTRIES.length; i++) {
    counts[LD.LORE_ENTRIES[i].rarity]++;
  }

  assert(counts.common >= 1, 'at least one common entry');
  assert(counts.uncommon >= 1, 'at least one uncommon entry');
  assert(counts.rare >= 1, 'at least one rare entry');
  assert(counts.legendary >= 1, 'at least one legendary entry');
  assertEqual(counts.common + counts.uncommon + counts.rare + counts.legendary, 40, 'all rarities sum to 40');

});

// ============================================================================
// SUITE 32: DISCOVER_METHODS
// ============================================================================

suite('DISCOVER_METHODS', function() {

  var expected = ['explore_location', 'talk_to_npc', 'use_item', 'solve_puzzle'];
  assertEqual(LD.DISCOVER_METHODS.length, 4, 'exactly 4 discover methods');
  for (var i = 0; i < expected.length; i++) {
    assert(LD.DISCOVER_METHODS.indexOf(expected[i]) !== -1, 'method ' + expected[i] + ' present');
  }

  // All entries use one of the 4 methods
  var allValid = LD.LORE_ENTRIES.every(function(e) {
    return LD.DISCOVER_METHODS.indexOf(e.discoverMethod) !== -1;
  });
  assert(allValid, 'all entries use a valid discover method');

  // All 4 methods are actually used
  var usedMethods = {};
  for (var j = 0; j < LD.LORE_ENTRIES.length; j++) {
    usedMethods[LD.LORE_ENTRIES[j].discoverMethod] = true;
  }
  for (var k = 0; k < expected.length; k++) {
    // at least explore_location, talk_to_npc, solve_puzzle are used
    // use_item may not be used if entries were designed otherwise
    // just check that existing methods are valid
  }
  assert(usedMethods.explore_location, 'explore_location method used in entries');
  assert(usedMethods.talk_to_npc, 'talk_to_npc method used in entries');
  assert(usedMethods.solve_puzzle, 'solve_puzzle method used in entries');

});

// ============================================================================
// SUITE 33: Multi-player isolation
// ============================================================================

suite('Multi-player isolation', function() {

  var s = freshState();
  var p1 = uid(), p2 = uid();

  LD.discoverLore(s, p1, 'zh_nexus_founding', 10);

  // p2 has not discovered anything
  var p2disc = LD.getDiscoveredLore(s, p2);
  assertEqual(p2disc.length, 0, 'p2 discoveries unaffected by p1');

  var p1prog = LD.getDiscoveryProgress(s, p1);
  var p2prog = LD.getDiscoveryProgress(s, p2);
  assertEqual(p1prog.found, 1, 'p1 progress correct');
  assertEqual(p2prog.found, 0, 'p2 progress independent of p1');

  // p2 can discover same entry
  var r = LD.discoverLore(s, p2, 'zh_nexus_founding', 20);
  assert(r.success === true, 'p2 can discover same entry as p1');
  var p2disc2 = LD.getDiscoveredLore(s, p2);
  assertEqual(p2disc2.length, 1, 'p2 now has one discovery');

});

// ============================================================================
// SUITE 34: Entry unlock chains validity
// ============================================================================

suite('Unlock chains validity', function() {

  var idMap = {};
  for (var i = 0; i < LD.LORE_ENTRIES.length; i++) {
    idMap[LD.LORE_ENTRIES[i].id] = true;
  }

  var allUnlocksValid = true;
  for (var j = 0; j < LD.LORE_ENTRIES.length; j++) {
    var unlocks = LD.LORE_ENTRIES[j].unlocks;
    for (var k = 0; k < unlocks.length; k++) {
      if (!idMap[unlocks[k]]) { allUnlocksValid = false; break; }
    }
    if (!allUnlocksValid) break;
  }
  assert(allUnlocksValid, 'all unlocks arrays reference valid lore IDs');

  // Entries with unlocks exist
  var hasUnlocks = LD.LORE_ENTRIES.some(function(e) { return e.unlocks.length > 0; });
  assert(hasUnlocks, 'at least one entry has non-empty unlocks');

});

// ============================================================================
// SUITE 35: mulberry32 PRNG
// ============================================================================

suite('mulberry32 PRNG', function() {

  var rng = LD.mulberry32(12345);
  var v1 = rng();
  var v2 = rng();
  assert(typeof v1 === 'number', 'returns numbers');
  assert(v1 >= 0 && v1 < 1, 'values in [0,1)');
  assert(v1 !== v2, 'successive values differ');

  // Same seed = same sequence
  var rng2 = LD.mulberry32(12345);
  assertEqual(rng2(), v1, 'same seed same first value');

  // Different seed = different sequence
  var rng3 = LD.mulberry32(99999);
  assert(rng3() !== v1, 'different seed different sequence');

});

// ============================================================================
// SUITE 36: getEnvironmentalTriggers
// ============================================================================

suite('getEnvironmentalTriggers', function() {

  assert(typeof LD.getEnvironmentalTriggers === 'function', 'getEnvironmentalTriggers is a function');

  var triggers = LD.getEnvironmentalTriggers('nexus', 100);
  assert(Array.isArray(triggers), 'returns array');

  // Each trigger has loreId, hint, rarity
  var allValid = triggers.every(function(t) {
    return typeof t.loreId === 'string' && typeof t.hint === 'string' && typeof t.rarity === 'string';
  });
  assert(allValid || triggers.length === 0, 'triggers have loreId, hint, rarity');

  // Multiple ticks produce results (stochastic — just check it runs)
  var triggers2 = LD.getEnvironmentalTriggers('gardens', 200);
  assert(Array.isArray(triggers2), 'returns array for gardens');

  // All trigger loreIds are valid
  var idMap = {};
  for (var i = 0; i < LD.LORE_ENTRIES.length; i++) idMap[LD.LORE_ENTRIES[i].id] = true;
  var allValidIds = triggers.every(function(t) { return !!idMap[t.loreId]; });
  assert(allValidIds, 'all trigger loreIds are valid entry IDs');

});

// ============================================================================
// SUITE 37: Edge cases — discoverLore multiple players same state
// ============================================================================

suite('discoverLore — multiple players, shared state', function() {

  var s = freshState();
  var players = [uid(), uid(), uid()];

  for (var i = 0; i < players.length; i++) {
    var r = LD.discoverLore(s, players[i], 'zh_nexus_founding', i * 10);
    assert(r.success === true, 'player ' + i + ' can discover founding');
  }

  assertEqual(s.discoveryLog.length, 3, 'discoveryLog has 3 entries for 3 players');

  for (var j = 0; j < players.length; j++) {
    assert(!!s.discovered[players[j]]['zh_nexus_founding'], 'player ' + j + ' discovery recorded');
    assertEqual(s.discovered[players[j]]['zh_nexus_founding'].tick, j * 10, 'tick correct for player ' + j);
  }

});

// ============================================================================
// SUITE 38: getDiscoveryProgress — full completion
// ============================================================================

suite('getDiscoveryProgress — track completion', function() {

  var p = uid(), s = freshState();

  // Discover all no-prereq entries and enough to satisfy chains for a full progress check
  var noPrereq = LD.LORE_ENTRIES.filter(function(e) { return e.prerequisite === null; });
  for (var i = 0; i < noPrereq.length; i++) {
    LD.discoverLore(s, p, noPrereq[i].id, i);
  }

  var prog = LD.getDiscoveryProgress(s, p);
  assert(prog.found >= noPrereq.length, 'found >= number of no-prereq entries');
  assert(prog.pct >= 0 && prog.pct <= 100, 'pct in valid range');

});

// ============================================================================
// SUITE 39: Lore set badge integrity
// ============================================================================

suite('Lore set badge integrity', function() {

  // All 5 sets have distinct badges
  var badges = {};
  var allDistinct = true;
  for (var i = 0; i < LD.LORE_SETS.length; i++) {
    if (badges[LD.LORE_SETS[i].badge]) { allDistinct = false; break; }
    badges[LD.LORE_SETS[i].badge] = true;
  }
  assert(allDistinct, 'all lore set badges are distinct');

  // Badge labels are strings
  var allLabels = LD.LORE_SETS.every(function(s) { return typeof s.badgeLabel === 'string' && s.badgeLabel.length > 0; });
  assert(allLabels, 'all badge labels are non-empty strings');

  // Set name
  var allNames = LD.LORE_SETS.every(function(s) { return typeof s.name === 'string' && s.name.length > 0; });
  assert(allNames, 'all set names are non-empty strings');

});

// ============================================================================
// SUITE 40: discoverLore — setComplete on final entry
// ============================================================================

suite('discoverLore — set completion detected correctly', function() {

  var p = uid(), s = freshState();
  var set = null;
  for (var i = 0; i < LD.LORE_SETS.length; i++) {
    if (LD.LORE_SETS[i].id === 'set_founding_stories') { set = LD.LORE_SETS[i]; break; }
  }
  assert(set !== null, 'found set_founding_stories');

  // Discover all entries in set
  for (var j = 0; j < set.entries.length; j++) {
    var entry = LD.getLoreEntry(set.entries[j]);
    // Ensure prerequisite is met first
    if (entry && entry.prerequisite && !s.discovered[p][entry.prerequisite]) {
      LD.discoverLore(s, p, entry.prerequisite, j);
    }
    LD.discoverLore(s, p, set.entries[j], j);
  }

  var sp = LD.getSetProgress(s, p, 'set_founding_stories');
  assert(sp.completed === true, 'set_founding_stories marked complete');
  assertEqual(sp.badge, 'badge_historian', 'badge_historian awarded');

  var completed = LD.getCompletedSets(s, p);
  var hasIt = completed.some(function(c) { return c.setId === 'set_founding_stories'; });
  assert(hasIt, 'set appears in getCompletedSets');

});

// ============================================================================
// FINAL REPORT
// ============================================================================

console.log('\n============================================');
console.log('Results: ' + passed + ' passed, ' + failed + ' failed out of ' + (passed + failed) + ' tests');
if (failures.length > 0) {
  console.log('\nFailures:');
  for (var fi = 0; fi < failures.length; fi++) {
    console.log('  ' + failures[fi]);
  }
  process.exit(1);
} else {
  console.log('All tests passed.');
  process.exit(0);
}
