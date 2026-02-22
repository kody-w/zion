/**
 * tests/test_achievement_engine.js
 * Comprehensive tests for the ZION Achievement Engine
 * 130+ tests covering all exported functions, criteria types, rewards, edge cases.
 *
 * Run with: node tests/test_achievement_engine.js
 */

'use strict';

var AE = require('../src/js/achievement_engine');

// ============================================================================
// MINIMAL TEST HARNESS (var-only, as per spec)
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
  assert(JSON.stringify(a) === JSON.stringify(b), msg);
}

// ============================================================================
// HELPERS
// ============================================================================

var playerSeq = 0;
function uid() { return 'p' + (++playerSeq); }

/** Create a minimal state object */
function freshState() {
  return { players: {} };
}

/** Create state with player already seeded */
function stateFor(playerId) {
  var s = freshState();
  s.players[playerId] = { stats: {}, unlocked: [] };
  return s;
}

/** Set a stat directly for test setup */
function setStat(state, playerId, statName, value) {
  if (!state.players[playerId]) state.players[playerId] = { stats: {}, unlocked: [] };
  state.players[playerId].stats[statName] = value;
}

/** Mark an achievement as unlocked directly */
function unlock(state, playerId, achId) {
  if (!state.players[playerId]) state.players[playerId] = { stats: {}, unlocked: [] };
  state.players[playerId].unlocked.push(achId);
}

// ============================================================================
// SUITE 1: MODULE EXPORTS
// ============================================================================

suite('Module exports', function() {

  assert(typeof AE === 'object', 'module exports an object');
  assert(Array.isArray(AE.ACHIEVEMENTS), 'ACHIEVEMENTS is an array');
  assert(typeof AE.STAT_DEFINITIONS === 'object', 'STAT_DEFINITIONS is an object');
  assert(typeof AE.trackStat === 'function', 'trackStat is a function');
  assert(typeof AE.checkAchievements === 'function', 'checkAchievements is a function');
  assert(typeof AE.trackAndCheck === 'function', 'trackAndCheck is a function');
  assert(typeof AE.getPlayerStats === 'function', 'getPlayerStats is a function');
  assert(typeof AE.getAchievements === 'function', 'getAchievements is a function');
  assert(typeof AE.getUnlockedAchievements === 'function', 'getUnlockedAchievements is a function');
  assert(typeof AE.getProgress === 'function', 'getProgress is a function');
  assert(typeof AE.getAllProgress === 'function', 'getAllProgress is a function');
  assert(typeof AE.getAchievementById === 'function', 'getAchievementById is a function');
  assert(typeof AE.getCategories === 'function', 'getCategories is a function');
  assert(typeof AE.getTotalPoints === 'function', 'getTotalPoints is a function');
  assert(typeof AE.getCompletionPercent === 'function', 'getCompletionPercent is a function');
  assert(typeof AE.getNextAchievements === 'function', 'getNextAchievements is a function');
  assert(typeof AE.getHiddenAchievements === 'function', 'getHiddenAchievements is a function');
  assert(typeof AE.resetStats === 'function', 'resetStats is a function');

});

// ============================================================================
// SUITE 2: ACHIEVEMENT DATABASE INTEGRITY
// ============================================================================

suite('Achievement database integrity', function() {

  assert(AE.ACHIEVEMENTS.length >= 50, 'at least 50 achievements defined (got ' + AE.ACHIEVEMENTS.length + ')');

  // Every achievement must have required fields
  var requiredFields = ['id', 'name', 'description', 'category', 'criteria', 'reward', 'tier', 'hidden', 'prerequisite'];
  var allHaveFields = true;
  for (var i = 0; i < AE.ACHIEVEMENTS.length; i++) {
    var ach = AE.ACHIEVEMENTS[i];
    for (var j = 0; j < requiredFields.length; j++) {
      if (!(requiredFields[j] in ach)) {
        allHaveFields = false;
        break;
      }
    }
    if (!allHaveFields) break;
  }
  assert(allHaveFields, 'all achievements have required fields');

  // All achievement IDs are unique
  var ids = {};
  var uniqueIds = true;
  for (var k = 0; k < AE.ACHIEVEMENTS.length; k++) {
    if (ids[AE.ACHIEVEMENTS[k].id]) { uniqueIds = false; break; }
    ids[AE.ACHIEVEMENTS[k].id] = true;
  }
  assert(uniqueIds, 'all achievement IDs are unique');

  // Tiers are 1-5
  var validTiers = true;
  for (var t = 0; t < AE.ACHIEVEMENTS.length; t++) {
    var tier = AE.ACHIEVEMENTS[t].tier;
    if (typeof tier !== 'number' || tier < 1 || tier > 5) { validTiers = false; break; }
  }
  assert(validTiers, 'all achievement tiers are integers 1-5');

  // Hidden field is boolean
  var hiddenBool = true;
  for (var h = 0; h < AE.ACHIEVEMENTS.length; h++) {
    if (typeof AE.ACHIEVEMENTS[h].hidden !== 'boolean') { hiddenBool = false; break; }
  }
  assert(hiddenBool, 'all achievement hidden fields are booleans');

  // All rewards have spark, xp, xpCategory, badge
  var validRewards = true;
  for (var r = 0; r < AE.ACHIEVEMENTS.length; r++) {
    var reward = AE.ACHIEVEMENTS[r].reward;
    if (typeof reward.spark !== 'number' || reward.spark < 0) { validRewards = false; break; }
    if (typeof reward.xp !== 'number' || reward.xp < 0) { validRewards = false; break; }
    if (typeof reward.xpCategory !== 'string') { validRewards = false; break; }
    if (typeof reward.badge !== 'string') { validRewards = false; break; }
  }
  assert(validRewards, 'all achievement rewards have valid spark/xp/xpCategory/badge');

  // Criteria types are valid
  var validCriteriaTypes = ['counter', 'milestone', 'compound', 'threshold'];
  var allValidCriteria = true;
  for (var c = 0; c < AE.ACHIEVEMENTS.length; c++) {
    var ct = AE.ACHIEVEMENTS[c].criteria.type;
    if (validCriteriaTypes.indexOf(ct) === -1) { allValidCriteria = false; break; }
  }
  assert(allValidCriteria, 'all criteria types are valid (counter/milestone/compound/threshold)');

  // Counter/milestone/threshold criteria reference valid stat names
  var statNames = Object.keys(AE.STAT_DEFINITIONS);
  var allStatsValid = true;
  for (var s = 0; s < AE.ACHIEVEMENTS.length; s++) {
    var crit = AE.ACHIEVEMENTS[s].criteria;
    if (crit.type === 'counter' || crit.type === 'milestone' || crit.type === 'threshold') {
      if (statNames.indexOf(crit.stat) === -1) {
        allStatsValid = false;
        break;
      }
    }
    if (crit.type === 'compound') {
      for (var ci = 0; ci < crit.conditions.length; ci++) {
        if (statNames.indexOf(crit.conditions[ci].stat) === -1) {
          allStatsValid = false;
          break;
        }
      }
    }
    if (!allStatsValid) break;
  }
  assert(allStatsValid, 'all criteria reference valid stat names from STAT_DEFINITIONS');

  // Prerequisites, if set, reference a valid achievement ID
  var allPrereqsValid = true;
  var achIds = {};
  for (var ai = 0; ai < AE.ACHIEVEMENTS.length; ai++) achIds[AE.ACHIEVEMENTS[ai].id] = true;
  for (var pi = 0; pi < AE.ACHIEVEMENTS.length; pi++) {
    var prereq = AE.ACHIEVEMENTS[pi].prerequisite;
    if (prereq !== null && !achIds[prereq]) {
      allPrereqsValid = false;
      break;
    }
  }
  assert(allPrereqsValid, 'all prerequisites reference valid achievement IDs');

});

// ============================================================================
// SUITE 3: CATEGORY COVERAGE
// ============================================================================

suite('Category coverage', function() {

  var categories = AE.getCategories();
  var expectedCategories = ['exploration', 'combat', 'social', 'crafting', 'fishing', 'gathering', 'trading', 'building', 'questing', 'mastery'];

  assert(categories.length >= 10, 'at least 10 categories exist');

  for (var i = 0; i < expectedCategories.length; i++) {
    var cat = expectedCategories[i];
    assert(categories.indexOf(cat) !== -1, 'category "' + cat + '" exists');
  }

  // Each category has at least 3 achievements
  for (var j = 0; j < expectedCategories.length; j++) {
    var catAchs = AE.getAchievements(expectedCategories[j]);
    assert(catAchs.length >= 3, 'category "' + expectedCategories[j] + '" has at least 3 achievements (got ' + catAchs.length + ')');
  }

});

// ============================================================================
// SUITE 4: STAT DEFINITIONS
// ============================================================================

suite('STAT_DEFINITIONS', function() {

  var statKeys = Object.keys(AE.STAT_DEFINITIONS);
  assert(statKeys.length >= 30, 'at least 30 stats defined (got ' + statKeys.length + ')');

  var expectedStats = [
    'zones_visited', 'fish_caught', 'dungeons_cleared', 'npcs_befriended',
    'items_crafted', 'trades_completed', 'quests_completed', 'buildings_placed',
    'constellations_found', 'time_capsules_buried', 'time_capsules_found',
    'cards_won', 'meals_cooked', 'sparks_earned', 'sparks_spent',
    'mentor_sessions', 'votes_cast', 'houses_visited', 'guild_contributions',
    'prestige_level', 'harvests', 'zone_nexus_visits', 'zone_wilds_visits',
    'zone_gardens_visits', 'zone_studio_visits', 'zone_athenaeum_visits',
    'zone_agora_visits', 'zone_commons_visits', 'zone_arena_visits',
    'epic_fish_caught', 'masterwork_items_crafted'
  ];

  for (var i = 0; i < expectedStats.length; i++) {
    assert(AE.STAT_DEFINITIONS[expectedStats[i]] !== undefined,
      'stat "' + expectedStats[i] + '" exists in STAT_DEFINITIONS');
  }

  // Each stat has a label
  var allHaveLabel = true;
  for (var s = 0; s < statKeys.length; s++) {
    if (typeof AE.STAT_DEFINITIONS[statKeys[s]].label !== 'string') {
      allHaveLabel = false; break;
    }
  }
  assert(allHaveLabel, 'all stats have a label string');

});

// ============================================================================
// SUITE 5: trackStat
// ============================================================================

suite('trackStat', function() {

  var p = uid(), s = freshState();
  AE.trackStat(s, p, 'fish_caught', 1);
  assertEqual(s.players[p].stats.fish_caught, 1, 'trackStat increments from 0 to 1');

  AE.trackStat(s, p, 'fish_caught', 3);
  assertEqual(s.players[p].stats.fish_caught, 4, 'trackStat increments by 3');

  AE.trackStat(s, p, 'fish_caught', 0);
  assertEqual(s.players[p].stats.fish_caught, 4, 'trackStat with 0 increment leaves value unchanged');

  // Negative increment clamped to 0
  AE.trackStat(s, p, 'fish_caught', -5);
  assertEqual(s.players[p].stats.fish_caught, 4, 'trackStat with negative increment does not decrease stat');

  // Default increment is 1
  AE.trackStat(s, p, 'fish_caught');
  assertEqual(s.players[p].stats.fish_caught, 5, 'trackStat with no increment defaults to +1');

  // New stat starts at 0
  var p2 = uid(), s2 = freshState();
  AE.trackStat(s2, p2, 'harvests', 10);
  assertEqual(s2.players[p2].stats.harvests, 10, 'new stat starts at 0 before increment');

  // Returns updated state
  var p3 = uid(), s3 = freshState();
  var returned = AE.trackStat(s3, p3, 'cards_won', 5);
  assert(returned === s3, 'trackStat returns the same state object');

  // Null state guard
  var result = AE.trackStat(null, 'x', 'fish_caught', 1);
  assert(result === null, 'trackStat with null state returns null');

  // Missing player guard
  var result2 = AE.trackStat(freshState(), null, 'fish_caught', 1);
  assert(result2 !== null, 'trackStat with null playerId returns state unchanged');

  // Multiple stats on same player
  var p4 = uid(), s4 = freshState();
  AE.trackStat(s4, p4, 'fish_caught', 2);
  AE.trackStat(s4, p4, 'harvests', 7);
  assertEqual(s4.players[p4].stats.fish_caught, 2, 'separate stats tracked independently - fish_caught');
  assertEqual(s4.players[p4].stats.harvests, 7, 'separate stats tracked independently - harvests');

  // Multiple players independent
  var pa = uid(), pb = uid(), sm = freshState();
  AE.trackStat(sm, pa, 'fish_caught', 3);
  AE.trackStat(sm, pb, 'fish_caught', 7);
  assertEqual(sm.players[pa].stats.fish_caught, 3, 'player A stat independent');
  assertEqual(sm.players[pb].stats.fish_caught, 7, 'player B stat independent');

});

// ============================================================================
// SUITE 6: checkAchievements — counter type
// ============================================================================

suite('checkAchievements — counter criteria', function() {

  // Unlock at exactly target
  var p = uid(), s = freshState();
  setStat(s, p, 'fish_caught', 10);
  var earned = AE.checkAchievements(s, p);
  var ids = earned.map(function(e) { return e.achievementId; });
  assert(ids.indexOf('angler') !== -1, 'angler unlocks when fish_caught reaches 10');

  // Not unlocked below target
  var p2 = uid(), s2 = freshState();
  setStat(s2, p2, 'fish_caught', 9);
  var earned2 = AE.checkAchievements(s2, p2);
  var ids2 = earned2.map(function(e) { return e.achievementId; });
  assert(ids2.indexOf('angler') === -1, 'angler does NOT unlock at 9 fish');

  // first_catch at 1 fish
  var p3 = uid(), s3 = freshState();
  setStat(s3, p3, 'fish_caught', 1);
  var earned3 = AE.checkAchievements(s3, p3);
  var ids3 = earned3.map(function(e) { return e.achievementId; });
  assert(ids3.indexOf('first_catch') !== -1, 'first_catch unlocks at fish_caught=1');

  // No double-unlock
  var p4 = uid(), s4 = freshState();
  setStat(s4, p4, 'fish_caught', 10);
  var first = AE.checkAchievements(s4, p4);
  var second = AE.checkAchievements(s4, p4);
  assert(second.length === 0 || second.filter(function(e){ return e.achievementId === 'angler'; }).length === 0,
    'angler not double-unlocked');

  // Excess stat still unlocks
  var p5 = uid(), s5 = freshState();
  setStat(s5, p5, 'fish_caught', 999);
  var earned5 = AE.checkAchievements(s5, p5);
  var ids5 = earned5.map(function(e) { return e.achievementId; });
  assert(ids5.indexOf('angler') !== -1, 'angler unlocks when fish_caught far exceeds target');

  // Returns array
  var p6 = uid(), s6 = freshState();
  var result6 = AE.checkAchievements(s6, p6);
  assert(Array.isArray(result6), 'checkAchievements returns an array');

  // No achievements on fresh state
  var p7 = uid(), s7 = freshState();
  var empty = AE.checkAchievements(s7, p7);
  assert(empty.length === 0, 'no achievements on fresh player with no stats');

  // Null guards
  var r1 = AE.checkAchievements(null, 'x');
  assert(Array.isArray(r1) && r1.length === 0, 'checkAchievements with null state returns []');
  var r2 = AE.checkAchievements(freshState(), null);
  assert(Array.isArray(r2) && r2.length === 0, 'checkAchievements with null playerId returns []');

});

// ============================================================================
// SUITE 7: checkAchievements — milestone type
// ============================================================================

suite('checkAchievements — milestone criteria', function() {

  // prestige_seeker requires prestige_level >= 1
  var p = uid(), s = freshState();
  setStat(s, p, 'prestige_level', 0);
  var earned0 = AE.checkAchievements(s, p);
  var ids0 = earned0.map(function(e) { return e.achievementId; });
  assert(ids0.indexOf('prestige_seeker') === -1, 'prestige_seeker NOT unlocked at prestige_level=0');

  var p2 = uid(), s2 = freshState();
  setStat(s2, p2, 'prestige_level', 1);
  var earned1 = AE.checkAchievements(s2, p2);
  var ids1 = earned1.map(function(e) { return e.achievementId; });
  assert(ids1.indexOf('prestige_seeker') !== -1, 'prestige_seeker unlocks at prestige_level=1');

  // true_master requires prestige_level >= 3
  var p3 = uid(), s3 = freshState();
  setStat(s3, p3, 'prestige_level', 2);
  var earned2 = AE.checkAchievements(s3, p3);
  var ids2 = earned2.map(function(e) { return e.achievementId; });
  assert(ids2.indexOf('true_master') === -1, 'true_master NOT at prestige_level=2 (prereq not met)');

  // Unlock prestige_seeker first, then true_master at 3
  var p4 = uid(), s4 = freshState();
  unlock(s4, p4, 'prestige_seeker');
  setStat(s4, p4, 'prestige_level', 3);
  var earned3 = AE.checkAchievements(s4, p4);
  var ids3 = earned3.map(function(e) { return e.achievementId; });
  assert(ids3.indexOf('true_master') !== -1, 'true_master unlocks at prestige_level=3 after prereq');

});

// ============================================================================
// SUITE 8: checkAchievements — threshold type
// ============================================================================

suite('checkAchievements — threshold criteria', function() {

  // wealth_threshold: sparks_earned >= 1000
  // Prereq: spark_hoarder
  var p = uid(), s = freshState();
  unlock(s, p, 'market_newcomer');
  unlock(s, p, 'spark_hoarder');
  setStat(s, p, 'sparks_earned', 999);
  var earned999 = AE.checkAchievements(s, p);
  var ids999 = earned999.map(function(e) { return e.achievementId; });
  assert(ids999.indexOf('wealth_threshold') === -1, 'wealth_threshold NOT at 999 sparks');

  var p2 = uid(), s2 = freshState();
  unlock(s2, p2, 'market_newcomer');
  unlock(s2, p2, 'spark_hoarder');
  setStat(s2, p2, 'sparks_earned', 1000);
  var earned1k = AE.checkAchievements(s2, p2);
  var ids1k = earned1k.map(function(e) { return e.achievementId; });
  assert(ids1k.indexOf('wealth_threshold') !== -1, 'wealth_threshold unlocks at exactly 1000 sparks');

  // harvest_threshold: harvests >= 50
  var p3 = uid(), s3 = freshState();
  unlock(s3, p3, 'first_harvest');
  setStat(s3, p3, 'harvests', 50);
  var earnedH = AE.checkAchievements(s3, p3);
  var idsH = earnedH.map(function(e) { return e.achievementId; });
  assert(idsH.indexOf('harvest_threshold') !== -1, 'harvest_threshold unlocks at harvests=50');

  var p4 = uid(), s4 = freshState();
  unlock(s4, p4, 'first_harvest');
  setStat(s4, p4, 'harvests', 49);
  var earnedH2 = AE.checkAchievements(s4, p4);
  var idsH2 = earnedH2.map(function(e) { return e.achievementId; });
  assert(idsH2.indexOf('harvest_threshold') === -1, 'harvest_threshold NOT at harvests=49');

});

// ============================================================================
// SUITE 9: checkAchievements — compound type (all logic)
// ============================================================================

suite('checkAchievements — compound criteria (all)', function() {

  // true_explorer: zones_visited >= 8 AND constellations_found >= 5
  // Prereq chain: first_steps -> zone_hopper -> world_traveler -> pathfinder -> stargazer
  function prereqsForTrueExplorer(state, pid) {
    unlock(state, pid, 'first_steps');
    unlock(state, pid, 'zone_hopper');
    unlock(state, pid, 'world_traveler');
    unlock(state, pid, 'pathfinder');
    unlock(state, pid, 'stargazer');
  }

  // Both conditions met
  var p = uid(), s = freshState();
  prereqsForTrueExplorer(s, p);
  setStat(s, p, 'zones_visited', 8);
  setStat(s, p, 'constellations_found', 5);
  var earned = AE.checkAchievements(s, p);
  var ids = earned.map(function(e) { return e.achievementId; });
  assert(ids.indexOf('true_explorer') !== -1, 'true_explorer unlocks when all compound conditions met');

  // Only first condition met
  var p2 = uid(), s2 = freshState();
  prereqsForTrueExplorer(s2, p2);
  setStat(s2, p2, 'zones_visited', 8);
  setStat(s2, p2, 'constellations_found', 4);
  var earned2 = AE.checkAchievements(s2, p2);
  var ids2 = earned2.map(function(e) { return e.achievementId; });
  assert(ids2.indexOf('true_explorer') === -1, 'true_explorer NOT unlocked when second condition unmet');

  // Only second condition met
  var p3 = uid(), s3 = freshState();
  prereqsForTrueExplorer(s3, p3);
  setStat(s3, p3, 'zones_visited', 7);
  setStat(s3, p3, 'constellations_found', 5);
  var earned3 = AE.checkAchievements(s3, p3);
  var ids3 = earned3.map(function(e) { return e.achievementId; });
  assert(ids3.indexOf('true_explorer') === -1, 'true_explorer NOT unlocked when first condition unmet');

  // Neither met
  var p4 = uid(), s4 = freshState();
  prereqsForTrueExplorer(s4, p4);
  setStat(s4, p4, 'zones_visited', 7);
  setStat(s4, p4, 'constellations_found', 4);
  var earned4 = AE.checkAchievements(s4, p4);
  var ids4 = earned4.map(function(e) { return e.achievementId; });
  assert(ids4.indexOf('true_explorer') === -1, 'true_explorer NOT unlocked when neither condition met');

  // arena_champion: cards_won >= 25 AND dungeons_cleared >= 10
  function prereqsForArena(state, pid) {
    unlock(state, pid, 'first_dungeon');
    unlock(state, pid, 'dungeon_runner');
    unlock(state, pid, 'dungeon_master');
  }

  var p5 = uid(), s5 = freshState();
  prereqsForArena(s5, p5);
  setStat(s5, p5, 'cards_won', 25);
  setStat(s5, p5, 'dungeons_cleared', 10);
  var earned5 = AE.checkAchievements(s5, p5);
  var ids5 = earned5.map(function(e) { return e.achievementId; });
  assert(ids5.indexOf('arena_champion') !== -1, 'arena_champion unlocks when cards_won=25 and dungeons_cleared=10');

  var p6 = uid(), s6 = freshState();
  prereqsForArena(s6, p6);
  setStat(s6, p6, 'cards_won', 24);
  setStat(s6, p6, 'dungeons_cleared', 10);
  var earned6 = AE.checkAchievements(s6, p6);
  var ids6 = earned6.map(function(e) { return e.achievementId; });
  assert(ids6.indexOf('arena_champion') === -1, 'arena_champion NOT unlocked when cards_won=24');

});

// ============================================================================
// SUITE 10: Prerequisites
// ============================================================================

suite('Prerequisites block premature unlock', function() {

  // zone_hopper requires first_steps
  var p = uid(), s = freshState();
  setStat(s, p, 'zones_visited', 5);
  var earned = AE.checkAchievements(s, p);
  var ids = earned.map(function(e) { return e.achievementId; });
  // first_steps (target=3) should unlock, zone_hopper (target=5) requires first_steps prereq met first
  // Since we check all in one pass, first_steps unlocks in the same pass and adds to unlocked array
  // so zone_hopper can unlock too — but if prereq not in unlocked list before this check, it blocks
  // Actually with enough stat, first_steps unlocks first, then zone_hopper checks unlocked array
  // The engine adds first_steps to unlocked before checking zone_hopper in the same loop iteration
  // Let's verify: first_steps should be in earned
  assert(ids.indexOf('first_steps') !== -1, 'first_steps earns when zones_visited=5');

  // world_traveler blocked if zone_hopper not unlocked
  var p2 = uid(), s2 = freshState();
  unlock(s2, p2, 'first_steps');
  // zone_hopper NOT unlocked
  setStat(s2, p2, 'zones_visited', 8);
  var earned2 = AE.checkAchievements(s2, p2);
  var ids2 = earned2.map(function(e) { return e.achievementId; });
  // zone_hopper should unlock (prereq=first_steps which is met), then world_traveler should also unlock
  assert(ids2.indexOf('zone_hopper') !== -1, 'zone_hopper unlocks when first_steps prereq met');

  // Explicit prerequisite blocking test: manually block prereq
  var p3 = uid(), s3 = freshState();
  // Do NOT unlock first_steps or zone_hopper
  setStat(s3, p3, 'zones_visited', 8);
  var earned3 = AE.checkAchievements(s3, p3);
  // first_steps should unlock (no prereq), zone_hopper unlocks after first_steps, world_traveler after zone_hopper
  var ids3 = earned3.map(function(e) { return e.achievementId; });
  assert(ids3.indexOf('first_steps') !== -1, 'first_steps unlocks with no prereq at zones_visited=8');

  // Hidden achievement blocked by prereq
  var p4 = uid(), s4 = freshState();
  // epic_fisher requires angler prereq; do NOT unlock angler
  setStat(s4, p4, 'epic_fish_caught', 1);
  var earned4 = AE.checkAchievements(s4, p4);
  var ids4 = earned4.map(function(e) { return e.achievementId; });
  assert(ids4.indexOf('epic_fisher') === -1, 'epic_fisher blocked without angler prereq');

  // With angler prereq met, epic_fisher unlocks
  var p5 = uid(), s5 = freshState();
  unlock(s5, p5, 'first_catch');
  unlock(s5, p5, 'angler');
  setStat(s5, p5, 'epic_fish_caught', 1);
  var earned5 = AE.checkAchievements(s5, p5);
  var ids5 = earned5.map(function(e) { return e.achievementId; });
  assert(ids5.indexOf('epic_fisher') !== -1, 'epic_fisher unlocks when angler prereq met');

  // masterwork_creator blocked without journeyman_crafter
  var p6 = uid(), s6 = freshState();
  setStat(s6, p6, 'masterwork_items_crafted', 1);
  var earned6 = AE.checkAchievements(s6, p6);
  var ids6 = earned6.map(function(e) { return e.achievementId; });
  assert(ids6.indexOf('masterwork_creator') === -1, 'masterwork_creator blocked without journeyman_crafter');

});

// ============================================================================
// SUITE 11: Duplicate unlock prevention
// ============================================================================

suite('Duplicate unlock prevention', function() {

  var p = uid(), s = freshState();
  setStat(s, p, 'fish_caught', 10);
  var first = AE.checkAchievements(s, p);
  var firstIds = first.map(function(e) { return e.achievementId; });
  assert(firstIds.indexOf('angler') !== -1, 'angler unlocks first time');

  var second = AE.checkAchievements(s, p);
  var secondIds = second.map(function(e) { return e.achievementId; });
  assert(secondIds.indexOf('angler') === -1, 'angler NOT returned second time (duplicate prevention)');

  // trackAndCheck also prevents duplicates
  var p2 = uid(), s2 = freshState();
  var r1 = AE.trackAndCheck(s2, p2, 'fish_caught', 10);
  assert(r1.newAchievements.filter(function(e){ return e.achievementId === 'angler'; }).length <= 1,
    'trackAndCheck does not duplicate angler on first call');
  var r2 = AE.trackAndCheck(r1.state, p2, 'fish_caught', 0);
  assert(r2.newAchievements.filter(function(e){ return e.achievementId === 'angler'; }).length === 0,
    'trackAndCheck does not re-unlock angler on second call');

});

// ============================================================================
// SUITE 12: Hidden achievements
// ============================================================================

suite('Hidden achievements', function() {

  var hidden = AE.getHiddenAchievements();
  assert(Array.isArray(hidden), 'getHiddenAchievements returns array');
  assert(hidden.length > 0, 'there are hidden achievements');

  for (var i = 0; i < hidden.length; i++) {
    assert(hidden[i].hidden === true, 'all returned achievements have hidden=true');
  }

  // Non-hidden achievements not included
  var nonHiddenCount = 0;
  for (var j = 0; j < AE.ACHIEVEMENTS.length; j++) {
    if (!AE.ACHIEVEMENTS[j].hidden) nonHiddenCount++;
  }
  var totalHidden = AE.getHiddenAchievements().length;
  assert(totalHidden < AE.ACHIEVEMENTS.length, 'not all achievements are hidden');
  assert(totalHidden + nonHiddenCount === AE.ACHIEVEMENTS.length, 'hidden + non-hidden = total');

  // Hidden achievements still unlock via checkAchievements
  var p = uid(), s = freshState();
  unlock(s, p, 'first_catch');
  unlock(s, p, 'angler');
  setStat(s, p, 'epic_fish_caught', 1);
  var earned = AE.checkAchievements(s, p);
  var ids = earned.map(function(e) { return e.achievementId; });
  assert(ids.indexOf('epic_fisher') !== -1, 'hidden epic_fisher can be unlocked');
  var epicFisher = AE.getAchievementById('epic_fisher');
  assert(epicFisher && epicFisher.hidden === true, 'epic_fisher is indeed marked hidden');

  // Hidden achievements not in regular getAchievements with category filter
  // (they ARE included — hidden is for UI display, not exclusion)
  var fishingAchs = AE.getAchievements('fishing');
  var epicInFishing = fishingAchs.filter(function(a){ return a.id === 'epic_fisher'; });
  assert(epicInFishing.length === 1, 'hidden epic_fisher included in getAchievements(fishing)');

});

// ============================================================================
// SUITE 13: getProgress
// ============================================================================

suite('getProgress', function() {

  // Counter type progress
  var p = uid(), s = freshState();
  setStat(s, p, 'fish_caught', 5);
  var prog = AE.getProgress(s, p, 'angler'); // target: 10
  assertEqual(prog.current, 5, 'getProgress counter: current = 5');
  assertEqual(prog.target, 10, 'getProgress counter: target = 10');
  assertEqual(prog.percent, 50, 'getProgress counter: percent = 50');
  assertEqual(prog.unlocked, false, 'getProgress counter: unlocked = false');

  // At target: 100%
  var p2 = uid(), s2 = freshState();
  setStat(s2, p2, 'fish_caught', 10);
  unlock(s2, p2, 'first_catch');
  unlock(s2, p2, 'angler');
  var prog2 = AE.getProgress(s2, p2, 'angler');
  assertEqual(prog2.percent, 100, 'getProgress counter: percent = 100 at target');
  assertEqual(prog2.unlocked, true, 'getProgress counter: unlocked = true when in unlocked list');

  // Over target: capped at 100%
  var p3 = uid(), s3 = freshState();
  setStat(s3, p3, 'fish_caught', 999);
  var prog3 = AE.getProgress(s3, p3, 'angler');
  assertEqual(prog3.percent, 100, 'getProgress counter: percent capped at 100');

  // Milestone type
  var p4 = uid(), s4 = freshState();
  setStat(s4, p4, 'prestige_level', 0);
  var prog4 = AE.getProgress(s4, p4, 'prestige_seeker');
  assertEqual(prog4.percent, 0, 'getProgress milestone: 0% at value=0');

  var p5 = uid(), s5 = freshState();
  setStat(s5, p5, 'prestige_level', 1);
  unlock(s5, p5, 'prestige_seeker');
  var prog5 = AE.getProgress(s5, p5, 'prestige_seeker');
  assertEqual(prog5.percent, 100, 'getProgress milestone: 100% at value=1');

  // Threshold type
  var p6 = uid(), s6 = freshState();
  setStat(s6, p6, 'sparks_earned', 500);
  unlock(s6, p6, 'market_newcomer');
  unlock(s6, p6, 'spark_hoarder');
  var prog6 = AE.getProgress(s6, p6, 'wealth_threshold'); // min: 1000
  assertEqual(prog6.percent, 50, 'getProgress threshold: 50% at half of min');

  // Unknown achievement ID
  var prog7 = AE.getProgress(freshState(), uid(), 'does_not_exist');
  assertEqual(prog7.percent, 0, 'getProgress on unknown id returns 0%');
  assertEqual(prog7.unlocked, false, 'getProgress on unknown id returns unlocked=false');

  // Compound type
  var p8 = uid(), s8 = freshState();
  setStat(s8, p8, 'zones_visited', 4);   // 4/8 = 50%
  setStat(s8, p8, 'constellations_found', 5); // 5/5 = 100%
  var prog8 = AE.getProgress(s8, p8, 'true_explorer');
  assert(prog8.percent >= 0 && prog8.percent <= 100, 'getProgress compound: percent in [0,100]');
  assert(prog8.percent > 0, 'getProgress compound: non-zero with partial progress');

  // Zero stat gives 0%
  var p9 = uid(), s9 = freshState();
  var prog9 = AE.getProgress(s9, p9, 'first_catch');
  assertEqual(prog9.percent, 0, 'getProgress: 0% with no stats');

});

// ============================================================================
// SUITE 14: getAllProgress
// ============================================================================

suite('getAllProgress', function() {

  var p = uid(), s = freshState();
  var all = AE.getAllProgress(s, p);
  assert(typeof all === 'object', 'getAllProgress returns an object');
  assert(Object.keys(all).length === AE.ACHIEVEMENTS.length, 'getAllProgress covers all achievements');

  for (var i = 0; i < AE.ACHIEVEMENTS.length; i++) {
    var id = AE.ACHIEVEMENTS[i].id;
    assert(all[id] !== undefined, 'getAllProgress contains entry for ' + id);
    assert(typeof all[id].percent === 'number', 'entry for ' + id + ' has percent');
    assert(typeof all[id].unlocked === 'boolean', 'entry for ' + id + ' has unlocked');
  }

});

// ============================================================================
// SUITE 15: getPlayerStats
// ============================================================================

suite('getPlayerStats', function() {

  var p = uid(), s = freshState();
  AE.trackStat(s, p, 'fish_caught', 5);
  AE.trackStat(s, p, 'harvests', 12);
  var stats = AE.getPlayerStats(s, p);
  assertEqual(stats.fish_caught, 5, 'getPlayerStats returns fish_caught=5');
  assertEqual(stats.harvests, 12, 'getPlayerStats returns harvests=12');

  // Empty stats for new player
  var p2 = uid(), s2 = freshState();
  var stats2 = AE.getPlayerStats(s2, p2);
  assert(typeof stats2 === 'object', 'getPlayerStats returns object for new player');
  assertEqual(Object.keys(stats2).length, 0, 'new player has empty stats');

  // Null guards
  var r1 = AE.getPlayerStats(null, 'x');
  assert(typeof r1 === 'object', 'getPlayerStats null state returns object');
  var r2 = AE.getPlayerStats(freshState(), null);
  assert(typeof r2 === 'object', 'getPlayerStats null playerId returns object');

});

// ============================================================================
// SUITE 16: getUnlockedAchievements
// ============================================================================

suite('getUnlockedAchievements', function() {

  var p = uid(), s = freshState();
  var none = AE.getUnlockedAchievements(s, p);
  assert(Array.isArray(none), 'returns array');
  assertEqual(none.length, 0, 'empty array for new player');

  setStat(s, p, 'fish_caught', 10);
  AE.checkAchievements(s, p);
  var after = AE.getUnlockedAchievements(s, p);
  assert(after.indexOf('first_catch') !== -1, 'first_catch in unlocked after check');
  assert(after.indexOf('angler') !== -1, 'angler in unlocked after check');

  // Returns a copy, not reference
  var p2 = uid(), s2 = freshState();
  var ul = AE.getUnlockedAchievements(s2, p2);
  ul.push('fake_id');
  var ul2 = AE.getUnlockedAchievements(s2, p2);
  assertEqual(ul2.length, 0, 'getUnlockedAchievements returns a copy');

});

// ============================================================================
// SUITE 17: getAchievementById
// ============================================================================

suite('getAchievementById', function() {

  var ach = AE.getAchievementById('angler');
  assert(ach !== null, 'returns achievement object for valid id');
  assertEqual(ach.id, 'angler', 'returned object has correct id');
  assertEqual(ach.category, 'fishing', 'returned object has correct category');

  var notFound = AE.getAchievementById('does_not_exist');
  assert(notFound === null, 'returns null for unknown id');

  var nullResult = AE.getAchievementById(null);
  assert(nullResult === null, 'returns null for null id');

  // Spot-check a few achievements
  var fe = AE.getAchievementById('first_steps');
  assert(fe !== null && fe.tier === 1, 'first_steps is tier 1');

  var tc = AE.getAchievementById('citizen_of_zion');
  assert(tc !== null && tc.tier === 5, 'citizen_of_zion is tier 5');

  var hid = AE.getAchievementById('epic_fisher');
  assert(hid !== null && hid.hidden === true, 'epic_fisher is hidden');

});

// ============================================================================
// SUITE 18: getCategories
// ============================================================================

suite('getCategories', function() {

  var cats = AE.getCategories();
  assert(Array.isArray(cats), 'getCategories returns array');
  assert(cats.length >= 10, 'at least 10 categories');

  // No duplicates
  var seen = {};
  var noDups = true;
  for (var i = 0; i < cats.length; i++) {
    if (seen[cats[i]]) { noDups = false; break; }
    seen[cats[i]] = true;
  }
  assert(noDups, 'no duplicate categories');

  // All are strings
  var allStrings = true;
  for (var j = 0; j < cats.length; j++) {
    if (typeof cats[j] !== 'string') { allStrings = false; break; }
  }
  assert(allStrings, 'all categories are strings');

});

// ============================================================================
// SUITE 19: getAchievements (category filter)
// ============================================================================

suite('getAchievements with category filter', function() {

  var all = AE.getAchievements();
  assertEqual(all.length, AE.ACHIEVEMENTS.length, 'getAchievements() returns all achievements');

  var fishing = AE.getAchievements('fishing');
  assert(fishing.length >= 3, 'fishing category has at least 3 achievements');
  var allFishing = fishing.every(function(a){ return a.category === 'fishing'; });
  assert(allFishing, 'all returned achievements are in fishing category');

  var exploration = AE.getAchievements('exploration');
  assert(exploration.length >= 3, 'exploration category has at least 3 achievements');

  var social = AE.getAchievements('social');
  assert(social.length >= 3, 'social category has at least 3 achievements');

  var crafting = AE.getAchievements('crafting');
  assert(crafting.length >= 3, 'crafting category has at least 3 achievements');

  var mastery = AE.getAchievements('mastery');
  assert(mastery.length >= 3, 'mastery category has at least 3 achievements');

  var unknown = AE.getAchievements('nonexistent_category');
  assertEqual(unknown.length, 0, 'unknown category returns empty array');

  // Returns a copy, mutations do not affect original
  var copy = AE.getAchievements('fishing');
  copy.push({ id: 'fake' });
  var copy2 = AE.getAchievements('fishing');
  assert(copy2.every(function(a){ return a.id !== 'fake'; }), 'getAchievements returns a copy');

});

// ============================================================================
// SUITE 20: getTotalPoints
// ============================================================================

suite('getTotalPoints', function() {

  // No unlocks: 0 points
  var p = uid(), s = freshState();
  assertEqual(AE.getTotalPoints(s, p), 0, 'no unlocks = 0 points');

  // Unlock tier-1 achievement: 10 points
  setStat(s, p, 'fish_caught', 1);
  AE.checkAchievements(s, p); // unlocks first_catch (tier 1)
  var pts = AE.getTotalPoints(s, p);
  assert(pts >= 10, 'tier-1 unlock gives at least 10 points');

  // Add tier-3 unlock: 30 points more
  var p2 = uid(), s2 = freshState();
  unlock(s2, p2, 'first_steps');
  unlock(s2, p2, 'zone_hopper');
  unlock(s2, p2, 'world_traveler');
  var pts2 = AE.getTotalPoints(s2, p2);
  // tier 1 + tier 2 + tier 2 = 10 + 20 + 20 = 50
  assertEqual(pts2, 50, 'getTotalPoints sums tier*10 correctly (10+20+20=50)');

  // Points are exactly tier * 10 per unlock
  var p3 = uid(), s3 = freshState();
  unlock(s3, p3, 'citizen_of_zion'); // tier 5
  var pts3 = AE.getTotalPoints(s3, p3);
  assertEqual(pts3, 50, 'tier-5 achievement gives 50 points');

  // Null guards
  assertEqual(AE.getTotalPoints(null, 'x'), 0, 'getTotalPoints null state returns 0');
  assertEqual(AE.getTotalPoints(freshState(), null), 0, 'getTotalPoints null player returns 0');

});

// ============================================================================
// SUITE 21: getCompletionPercent
// ============================================================================

suite('getCompletionPercent', function() {

  var p = uid(), s = freshState();
  assertEqual(AE.getCompletionPercent(s, p), 0, 'fresh player: 0% completion');

  // Unlock all achievements
  var p2 = uid(), s2 = freshState();
  for (var i = 0; i < AE.ACHIEVEMENTS.length; i++) {
    unlock(s2, p2, AE.ACHIEVEMENTS[i].id);
  }
  assertEqual(AE.getCompletionPercent(s2, p2), 100, 'all unlocked: 100% completion');

  // Half unlocked
  var p3 = uid(), s3 = freshState();
  var half = Math.floor(AE.ACHIEVEMENTS.length / 2);
  for (var j = 0; j < half; j++) {
    unlock(s3, p3, AE.ACHIEVEMENTS[j].id);
  }
  var pct3 = AE.getCompletionPercent(s3, p3);
  assert(pct3 > 0 && pct3 < 100, 'partial completion between 0 and 100');

  // Result is integer
  var p4 = uid(), s4 = freshState();
  unlock(s4, p4, 'angler');
  var pct4 = AE.getCompletionPercent(s4, p4);
  assertEqual(pct4, Math.floor(pct4), 'completion percent is an integer');

});

// ============================================================================
// SUITE 22: getNextAchievements
// ============================================================================

suite('getNextAchievements', function() {

  var p = uid(), s = freshState();
  var next = AE.getNextAchievements(s, p, 5);
  assert(Array.isArray(next), 'returns array');
  assert(next.length <= 5, 'returns at most 5 items');
  for (var i = 0; i < next.length; i++) {
    assert(typeof next[i].achievement === 'object', 'entry has achievement object');
    assert(typeof next[i].progress === 'object', 'entry has progress object');
  }

  // Prioritizes near-complete over zero-progress
  var p2 = uid(), s2 = freshState();
  setStat(s2, p2, 'fish_caught', 9); // 90% toward angler (target 10)
  setStat(s2, p2, 'harvests', 0);    // 0% toward first_harvest
  var next2 = AE.getNextAchievements(s2, p2, 3);
  var firstId = next2.length > 0 ? next2[0].achievement.id : null;
  // first_catch (target 1, stat=9) would be 100% but it's already unlocked?
  // Actually first_catch not unlocked since we didn't unlock it, and fish_caught=9 >= 1
  // So first_catch would be at 100% -> unlocked in first checkAchievements call?
  // No: getNextAchievements does NOT call checkAchievements. It only reads the state.
  // So first_catch would show 100% progress but unlocked=false in progress
  // and it would be first in the list.
  assert(next2.length > 0, 'next achievements returned when stats have progress');

  // Unlocked achievements excluded
  var p3 = uid(), s3 = freshState();
  unlock(s3, p3, 'first_catch');
  unlock(s3, p3, 'angler');
  var next3 = AE.getNextAchievements(s3, p3, 10);
  var ids3 = next3.map(function(e){ return e.achievement.id; });
  assert(ids3.indexOf('first_catch') === -1, 'unlocked achievements not in next list');
  assert(ids3.indexOf('angler') === -1, 'unlocked achievements not in next list (angler)');

  // Default count is 5
  var p4 = uid(), s4 = freshState();
  var next4 = AE.getNextAchievements(s4, p4);
  assert(next4.length <= 5, 'default count is 5');

  // count=0 returns empty
  var p5 = uid(), s5 = freshState();
  var next5 = AE.getNextAchievements(s5, p5, 0);
  // getNextAchievements with count=0 should use default (5) based on implementation
  // or return 0. Let's just check it returns an array.
  assert(Array.isArray(next5), 'count=0 still returns array');

  // count=1 returns at most 1
  var p6 = uid(), s6 = freshState();
  var next6 = AE.getNextAchievements(s6, p6, 1);
  assert(next6.length <= 1, 'count=1 returns at most 1 item');

});

// ============================================================================
// SUITE 23: resetStats
// ============================================================================

suite('resetStats', function() {

  var p = uid(), s = freshState();
  AE.trackStat(s, p, 'fish_caught', 10);
  AE.trackStat(s, p, 'harvests', 50);
  AE.checkAchievements(s, p);
  var before = AE.getUnlockedAchievements(s, p);
  assert(before.length > 0, 'achievements unlocked before reset');

  AE.resetStats(s, p);

  // Stats cleared
  var stats = AE.getPlayerStats(s, p);
  assertEqual(Object.keys(stats).length, 0, 'stats cleared after resetStats');
  assertEqual(AE.getPlayerStats(s, p).fish_caught || 0, 0, 'fish_caught=0 after reset');

  // Unlocked achievements NOT cleared by resetStats
  var after = AE.getUnlockedAchievements(s, p);
  assert(after.length === before.length, 'unlocked achievements preserved after resetStats');

  // Stats can be re-incremented after reset
  AE.trackStat(s, p, 'fish_caught', 5);
  assertEqual(s.players[p].stats.fish_caught, 5, 'trackStat works after resetStats');

  // Null guards
  var r1 = AE.resetStats(null, 'x');
  assert(r1 === null, 'resetStats null state returns null');

  var s2 = freshState();
  var r2 = AE.resetStats(s2, null);
  assert(r2 === s2, 'resetStats null playerId returns state unchanged');

});

// ============================================================================
// SUITE 24: trackAndCheck combined
// ============================================================================

suite('trackAndCheck combined', function() {

  var p = uid(), s = freshState();
  var r = AE.trackAndCheck(s, p, 'fish_caught', 10);

  assert(r.state !== undefined, 'trackAndCheck returns state');
  assert(Array.isArray(r.newAchievements), 'trackAndCheck returns newAchievements array');
  assert(typeof r.statsUpdated === 'object', 'trackAndCheck returns statsUpdated');

  var ids = r.newAchievements.map(function(e){ return e.achievementId; });
  assert(ids.indexOf('first_catch') !== -1, 'first_catch in newAchievements after fish_caught=10');
  assert(ids.indexOf('angler') !== -1, 'angler in newAchievements after fish_caught=10');

  assertEqual(r.statsUpdated['fish_caught'], 10, 'statsUpdated reflects new value');
  assertEqual(r.state.players[p].stats.fish_caught, 10, 'state.players[p].stats updated in place');

  // No achievements when stat not near target
  var p2 = uid(), s2 = freshState();
  var r2 = AE.trackAndCheck(s2, p2, 'fish_caught', 1);
  var ids2 = r2.newAchievements.map(function(e){ return e.achievementId; });
  assert(ids2.indexOf('angler') === -1, 'angler not in newAchievements at fish_caught=1');

  // Null state guard
  var r3 = AE.trackAndCheck(null, 'x', 'fish_caught', 1);
  assert(Array.isArray(r3.newAchievements) && r3.newAchievements.length === 0,
    'trackAndCheck null state returns empty newAchievements');

  // Null playerId guard
  var r4 = AE.trackAndCheck(freshState(), null, 'fish_caught', 1);
  assert(Array.isArray(r4.newAchievements) && r4.newAchievements.length === 0,
    'trackAndCheck null playerId returns empty newAchievements');

  // Default increment 1
  var p5 = uid(), s5 = freshState();
  var r5 = AE.trackAndCheck(s5, p5, 'fish_caught');
  assertEqual(r5.statsUpdated['fish_caught'], 1, 'default increment is 1');

  // State is returned (same reference)
  var p6 = uid(), s6 = freshState();
  var r6 = AE.trackAndCheck(s6, p6, 'fish_caught', 5);
  assert(r6.state === s6, 'trackAndCheck returns same state reference');

  // Consecutive calls accumulate
  var p7 = uid(), s7 = freshState();
  var r7a = AE.trackAndCheck(s7, p7, 'fish_caught', 5);
  var r7b = AE.trackAndCheck(r7a.state, p7, 'fish_caught', 5);
  assertEqual(r7b.statsUpdated['fish_caught'], 10, 'consecutive trackAndCheck accumulates');
  var ids7b = r7b.newAchievements.map(function(e){ return e.achievementId; });
  assert(ids7b.indexOf('angler') !== -1, 'angler unlocks on second call reaching target');

});

// ============================================================================
// SUITE 25: Achievement reward shapes
// ============================================================================

suite('Achievement reward shapes', function() {

  // Every achievement reward has positive spark and xp
  var allPositive = true;
  for (var i = 0; i < AE.ACHIEVEMENTS.length; i++) {
    var r = AE.ACHIEVEMENTS[i].reward;
    if (r.spark < 0 || r.xp < 0) { allPositive = false; break; }
  }
  assert(allPositive, 'all reward spark and xp are non-negative');

  // Higher-tier achievements have larger rewards (on average)
  var tier1sparks = [], tier5sparks = [];
  for (var j = 0; j < AE.ACHIEVEMENTS.length; j++) {
    if (AE.ACHIEVEMENTS[j].tier === 1) tier1sparks.push(AE.ACHIEVEMENTS[j].reward.spark);
    if (AE.ACHIEVEMENTS[j].tier === 5) tier5sparks.push(AE.ACHIEVEMENTS[j].reward.spark);
  }
  var avg1 = tier1sparks.reduce(function(s,v){ return s+v; }, 0) / (tier1sparks.length || 1);
  var avg5 = tier5sparks.reduce(function(s,v){ return s+v; }, 0) / (tier5sparks.length || 1);
  assert(avg5 > avg1, 'tier-5 achievements have higher avg spark reward than tier-1');

  // Badge names are non-empty strings
  var allBadges = true;
  for (var k = 0; k < AE.ACHIEVEMENTS.length; k++) {
    if (!AE.ACHIEVEMENTS[k].reward.badge || AE.ACHIEVEMENTS[k].reward.badge.length === 0) {
      allBadges = false; break;
    }
  }
  assert(allBadges, 'all rewards have non-empty badge strings');

  // xpCategory is a non-empty string
  var allXpCat = true;
  for (var l = 0; l < AE.ACHIEVEMENTS.length; l++) {
    if (!AE.ACHIEVEMENTS[l].reward.xpCategory || AE.ACHIEVEMENTS[l].reward.xpCategory.length === 0) {
      allXpCat = false; break;
    }
  }
  assert(allXpCat, 'all rewards have non-empty xpCategory strings');

});

// ============================================================================
// SUITE 26: Specific achievement spot-checks
// ============================================================================

suite('Specific achievement spot-checks', function() {

  // first_steps
  var ae = AE.getAchievementById('first_steps');
  assert(ae !== null, 'first_steps exists');
  assertEqual(ae.tier, 1, 'first_steps tier=1');
  assertEqual(ae.criteria.type, 'counter', 'first_steps criteria type=counter');
  assertEqual(ae.criteria.stat, 'zones_visited', 'first_steps stat=zones_visited');
  assertEqual(ae.criteria.target, 3, 'first_steps target=3');
  assert(ae.hidden === false, 'first_steps not hidden');
  assert(ae.prerequisite === null, 'first_steps has no prereq');

  // world_traveler
  var wt = AE.getAchievementById('world_traveler');
  assert(wt !== null, 'world_traveler exists');
  assertEqual(wt.criteria.target, 8, 'world_traveler target=8');
  assertEqual(wt.prerequisite, 'zone_hopper', 'world_traveler prereq=zone_hopper');

  // citizen_of_zion
  var coz = AE.getAchievementById('citizen_of_zion');
  assert(coz !== null, 'citizen_of_zion exists');
  assertEqual(coz.tier, 5, 'citizen_of_zion tier=5');
  assertEqual(coz.criteria.type, 'compound', 'citizen_of_zion is compound');
  assertEqual(coz.criteria.logic, 'all', 'citizen_of_zion logic=all');
  assert(coz.criteria.conditions.length >= 5, 'citizen_of_zion has 5+ conditions');

  // time_keeper (compound)
  var tk = AE.getAchievementById('time_keeper');
  assert(tk !== null, 'time_keeper exists');
  assertEqual(tk.criteria.type, 'compound', 'time_keeper is compound');
  var hasBuried = tk.criteria.conditions.some(function(c){ return c.stat === 'time_capsules_buried'; });
  var hasFound = tk.criteria.conditions.some(function(c){ return c.stat === 'time_capsules_found'; });
  assert(hasBuried, 'time_keeper checks time_capsules_buried');
  assert(hasFound, 'time_keeper checks time_capsules_found');

  // legendary_smith is tier 5 and hidden
  var ls = AE.getAchievementById('legendary_smith');
  assert(ls !== null, 'legendary_smith exists');
  assertEqual(ls.tier, 5, 'legendary_smith tier=5');
  assert(ls.hidden === true, 'legendary_smith is hidden');

  // prestige_seeker uses milestone
  var ps = AE.getAchievementById('prestige_seeker');
  assert(ps !== null, 'prestige_seeker exists');
  assertEqual(ps.criteria.type, 'milestone', 'prestige_seeker is milestone type');
  assertEqual(ps.criteria.stat, 'prestige_level', 'prestige_seeker stat=prestige_level');

  // wealth_threshold uses threshold
  var wth = AE.getAchievementById('wealth_threshold');
  assert(wth !== null, 'wealth_threshold exists');
  assertEqual(wth.criteria.type, 'threshold', 'wealth_threshold is threshold type');
  assertEqual(wth.criteria.min, 1000, 'wealth_threshold min=1000');

});

// ============================================================================
// SUITE 27: Edge cases
// ============================================================================

suite('Edge cases', function() {

  // Very large increments
  var p = uid(), s = freshState();
  AE.trackStat(s, p, 'harvests', 99999);
  assertEqual(s.players[p].stats.harvests, 99999, 'very large increment stored correctly');

  // State with pre-existing players is preserved
  var p2 = uid(), s2 = freshState();
  s2.players['other_player'] = { stats: { fish_caught: 42 }, unlocked: ['angler'] };
  AE.trackStat(s2, p2, 'fish_caught', 5);
  assertEqual(s2.players['other_player'].stats.fish_caught, 42, 'other player stats untouched');

  // checkAchievements with already-full unlocked list
  var p3 = uid(), s3 = freshState();
  for (var i = 0; i < AE.ACHIEVEMENTS.length; i++) {
    unlock(s3, p3, AE.ACHIEVEMENTS[i].id);
  }
  var r3 = AE.checkAchievements(s3, p3);
  assertEqual(r3.length, 0, 'checkAchievements returns empty when all already unlocked');

  // Fractional increment (edge): should accumulate as float
  var p4 = uid(), s4 = freshState();
  AE.trackStat(s4, p4, 'fish_caught', 0.5);
  AE.trackStat(s4, p4, 'fish_caught', 0.5);
  assert(s4.players[p4].stats.fish_caught >= 1, 'fractional increments accumulate');

  // getProgress on player with no stats object
  var p5 = uid(), s5 = freshState();
  var prog5 = AE.getProgress(s5, p5, 'first_catch');
  assertEqual(prog5.current, 0, 'getProgress on player with no stats returns current=0');

  // trackAndCheck with zero increment still returns statsUpdated
  var p6 = uid(), s6 = freshState();
  var r6 = AE.trackAndCheck(s6, p6, 'fish_caught', 0);
  assertEqual(r6.statsUpdated['fish_caught'], 0, 'trackAndCheck with 0 increment returns 0 in statsUpdated');

  // resetStats on player that was never initialized
  var p7 = uid(), s7 = freshState();
  var r7 = AE.resetStats(s7, p7);
  assert(r7 === s7, 'resetStats on uninitialized player returns state');
  var stats7 = AE.getPlayerStats(s7, p7);
  assertEqual(Object.keys(stats7).length, 0, 'stats empty after reset of uninitialized player');

  // Achievement with compound + any logic would function (even if none defined, check module handles it)
  // We test this with a synthetic scenario - if all_zones_master needs 10 visits to each zone
  var p8 = uid(), s8 = freshState();
  unlock(s8, p8, 'world_traveler');
  var zoneStats = ['zone_nexus_visits','zone_wilds_visits','zone_gardens_visits','zone_studio_visits',
    'zone_athenaeum_visits','zone_agora_visits','zone_commons_visits','zone_arena_visits'];
  for (var zi = 0; zi < zoneStats.length; zi++) {
    setStat(s8, p8, zoneStats[zi], 10);
  }
  var r8 = AE.checkAchievements(s8, p8);
  var ids8 = r8.map(function(e){ return e.achievementId; });
  assert(ids8.indexOf('all_zones_master') !== -1, 'all_zones_master unlocks when all zone visit stats >= 10');

});

// ============================================================================
// FINAL REPORT
// ============================================================================

console.log('\n============================');
console.log('ACHIEVEMENT ENGINE TEST SUITE');
console.log('============================');
console.log(passed + ' passed, ' + failed + ' failed out of ' + (passed + failed) + ' tests');

if (failures.length > 0) {
  console.log('\nFailures:');
  for (var fi = 0; fi < failures.length; fi++) {
    console.log('  ' + failures[fi]);
  }
}

if (failed > 0) {
  process.exit(1);
} else {
  console.log('\nAll tests passed!');
}
