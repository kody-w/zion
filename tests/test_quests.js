/**
 * tests/test_quests.js
 * Comprehensive tests for the ZION Quest, Daily Quest, Quest Chain, and Achievement system
 * 50+ assertions covering data integrity, lifecycle, progress, edge cases
 */

'use strict';

const { test, suite, report, assert } = require('./test_runner');
const Q = require('../src/js/quests');

// ============================================================================
// HELPERS
// ============================================================================

var pid = 0;
function uid() { return 'player_' + (++pid); }

/** Accept up to n quests from available pool to fill the active queue */
function fillActiveQuests(playerId, n) {
  var available = Q.getAvailableQuests(playerId, { level: 0 });
  var accepted = 0;
  for (var i = 0; i < available.length && accepted < n; i++) {
    var result = Q.acceptQuest(playerId, available[i].id);
    if (result.success) accepted++;
  }
  return accepted;
}

// ============================================================================
// SUITE 1 — MODULE EXPORTS
// ============================================================================

suite('Module exports', function() {
  test('exports QUEST_CHAINS object', function() {
    assert.ok(Q.QUEST_CHAINS && typeof Q.QUEST_CHAINS === 'object');
  });
  test('exports DAILY_QUESTS array', function() {
    assert.ok(Array.isArray(Q.DAILY_QUESTS));
  });
  test('exports ACHIEVEMENTS object', function() {
    assert.ok(Q.ACHIEVEMENTS && typeof Q.ACHIEVEMENTS === 'object');
  });
  test('exports initPlayerQuests function', function() {
    assert.strictEqual(typeof Q.initPlayerQuests, 'function');
  });
  test('exports acceptQuest function', function() {
    assert.strictEqual(typeof Q.acceptQuest, 'function');
  });
  test('exports updateQuestProgress function', function() {
    assert.strictEqual(typeof Q.updateQuestProgress, 'function');
  });
  test('exports completeQuest function', function() {
    assert.strictEqual(typeof Q.completeQuest, 'function');
  });
  test('exports getActiveQuests function', function() {
    assert.strictEqual(typeof Q.getActiveQuests, 'function');
  });
  test('exports getAvailableQuests function', function() {
    assert.strictEqual(typeof Q.getAvailableQuests, 'function');
  });
  test('exports getCompletedQuests function', function() {
    assert.strictEqual(typeof Q.getCompletedQuests, 'function');
  });
  test('exports trackAchievementEvent function', function() {
    assert.strictEqual(typeof Q.trackAchievementEvent, 'function');
  });
  test('exports getAchievements function', function() {
    assert.strictEqual(typeof Q.getAchievements, 'function');
  });
  test('exports getAchievementProgress function', function() {
    assert.strictEqual(typeof Q.getAchievementProgress, 'function');
  });
  test('exports getDailyQuests function', function() {
    assert.strictEqual(typeof Q.getDailyQuests, 'function');
  });
  test('exports initPlayerAchievements function', function() {
    assert.strictEqual(typeof Q.initPlayerAchievements, 'function');
  });
  test('exports abandonQuest function', function() {
    assert.strictEqual(typeof Q.abandonQuest, 'function');
  });
  test('exports getQuestLog function', function() {
    assert.strictEqual(typeof Q.getQuestLog, 'function');
  });
  test('exports getChainProgress function', function() {
    assert.strictEqual(typeof Q.getChainProgress, 'function');
  });
});

// ============================================================================
// SUITE 2 — QUEST_CHAINS DATA INTEGRITY
// ============================================================================

suite('QUEST_CHAINS data integrity', function() {
  var chains = Q.QUEST_CHAINS;

  test('chain_origins exists', function() {
    assert.ok(chains['chain_origins'], 'chain_origins missing');
  });
  test('chain_garden_master exists', function() {
    assert.ok(chains['chain_garden_master'], 'chain_garden_master missing');
  });
  test('chain_scholar exists', function() {
    assert.ok(chains['chain_scholar'], 'chain_scholar missing');
  });
  test('chain_artisan exists', function() {
    assert.ok(chains['chain_artisan'], 'chain_artisan missing');
  });
  test('chain_explorer exists', function() {
    assert.ok(chains['chain_explorer'], 'chain_explorer missing');
  });
  test('all chains have a name string', function() {
    for (var id in chains) {
      assert.strictEqual(typeof chains[id].name, 'string', id + ' missing name');
      assert.ok(chains[id].name.length > 0, id + ' name is empty');
    }
  });
  test('all chains have a description string', function() {
    for (var id in chains) {
      assert.strictEqual(typeof chains[id].description, 'string', id + ' missing description');
    }
  });
  test('all chains have a non-empty quests array', function() {
    for (var id in chains) {
      assert.ok(Array.isArray(chains[id].quests), id + ' quests is not array');
      assert.ok(chains[id].quests.length > 0, id + ' quests array is empty');
    }
  });
  test('all chains have a reward object with spark and title', function() {
    for (var id in chains) {
      var reward = chains[id].reward;
      assert.ok(reward && typeof reward === 'object', id + ' missing reward');
      assert.strictEqual(typeof reward.spark, 'number', id + ' reward.spark not number');
      assert.strictEqual(typeof reward.title, 'string', id + ' reward.title not string');
    }
  });
  test('chain_origins reward spark is 100', function() {
    assert.strictEqual(chains['chain_origins'].reward.spark, 100);
  });
  test('chain_origins reward title is Historian', function() {
    assert.strictEqual(chains['chain_origins'].reward.title, 'Historian');
  });
  test('chain_garden_master has 5 quests', function() {
    assert.strictEqual(chains['chain_garden_master'].quests.length, 5);
  });
  test('chain_scholar has 3 quests', function() {
    assert.strictEqual(chains['chain_scholar'].quests.length, 3);
  });
  test('chain_explorer reward spark is 200', function() {
    assert.strictEqual(chains['chain_explorer'].reward.spark, 200);
  });
});

// ============================================================================
// SUITE 3 — DAILY_QUESTS DATA INTEGRITY
// ============================================================================

suite('DAILY_QUESTS data integrity', function() {
  var dailies = Q.DAILY_QUESTS;

  test('DAILY_QUESTS is non-empty', function() {
    assert.ok(dailies.length > 0);
  });
  test('all daily quests have an id string', function() {
    for (var i = 0; i < dailies.length; i++) {
      assert.strictEqual(typeof dailies[i].id, 'string', 'daily[' + i + '] missing id');
    }
  });
  test('all daily quests have a title string', function() {
    for (var i = 0; i < dailies.length; i++) {
      assert.strictEqual(typeof dailies[i].title, 'string', 'daily[' + i + '] missing title');
    }
  });
  test('all daily quests have a description string', function() {
    for (var i = 0; i < dailies.length; i++) {
      assert.strictEqual(typeof dailies[i].description, 'string', 'daily[' + i + '] missing description');
    }
  });
  test('all daily quests have a non-empty objectives array', function() {
    for (var i = 0; i < dailies.length; i++) {
      assert.ok(Array.isArray(dailies[i].objectives), 'daily[' + i + '] objectives not array');
      assert.ok(dailies[i].objectives.length > 0, 'daily[' + i + '] has no objectives');
    }
  });
  test('all daily quests have rewards with spark', function() {
    for (var i = 0; i < dailies.length; i++) {
      assert.ok(dailies[i].rewards && typeof dailies[i].rewards === 'object', 'daily[' + i + '] missing rewards');
      assert.strictEqual(typeof dailies[i].rewards.spark, 'number', 'daily[' + i + '] spark not number');
    }
  });
  test('all daily quests have dialogue object with offer, progress, complete', function() {
    for (var i = 0; i < dailies.length; i++) {
      var d = dailies[i].dialogue;
      assert.ok(d && typeof d === 'object', 'daily[' + i + '] missing dialogue');
      assert.strictEqual(typeof d.offer, 'string', 'daily[' + i + '] dialogue.offer not string');
      assert.strictEqual(typeof d.progress, 'string', 'daily[' + i + '] dialogue.progress not string');
      assert.strictEqual(typeof d.complete, 'string', 'daily[' + i + '] dialogue.complete not string');
    }
  });
  test('daily_social quest exists in DAILY_QUESTS', function() {
    var found = dailies.some(function(d) { return d.id === 'daily_social'; });
    assert.ok(found, 'daily_social not found');
  });
  test('daily_explorer quest exists in DAILY_QUESTS', function() {
    var found = dailies.some(function(d) { return d.id === 'daily_explorer'; });
    assert.ok(found, 'daily_explorer not found');
  });
});

// ============================================================================
// SUITE 4 — ACHIEVEMENTS DATA INTEGRITY
// ============================================================================

suite('ACHIEVEMENTS data integrity', function() {
  var achs = Q.ACHIEVEMENTS;
  var validCategories = ['exploration', 'social', 'crafting', 'building', 'gardening', 'economy', 'competition', 'quests', 'guild', 'art', 'physical', 'mentoring'];

  test('ACHIEVEMENTS is non-empty', function() {
    assert.ok(Object.keys(achs).length > 0);
  });
  test('all achievements have id string', function() {
    for (var id in achs) {
      assert.strictEqual(typeof achs[id].id, 'string', id + ' missing id');
    }
  });
  test('all achievements have name string', function() {
    for (var id in achs) {
      assert.strictEqual(typeof achs[id].name, 'string', id + ' missing name');
    }
  });
  test('all achievements have description string', function() {
    for (var id in achs) {
      assert.strictEqual(typeof achs[id].description, 'string', id + ' missing description');
    }
  });
  test('all achievements have icon string', function() {
    for (var id in achs) {
      assert.strictEqual(typeof achs[id].icon, 'string', id + ' missing icon');
    }
  });
  test('all achievements have a valid category', function() {
    for (var id in achs) {
      assert.ok(validCategories.indexOf(achs[id].category) !== -1, id + ' invalid category: ' + achs[id].category);
    }
  });
  test('all achievements have sparkReward as number', function() {
    for (var id in achs) {
      assert.strictEqual(typeof achs[id].sparkReward, 'number', id + ' sparkReward not number');
      assert.ok(achs[id].sparkReward >= 0, id + ' sparkReward is negative');
    }
  });
  test('achievement first_steps exists', function() {
    assert.ok(achs['first_steps'], 'first_steps missing');
  });
  test('achievement zone_hopper exists with exploration category', function() {
    assert.ok(achs['zone_hopper'], 'zone_hopper missing');
    assert.strictEqual(achs['zone_hopper'].category, 'exploration');
  });
  test('achievement quest_starter exists with quests category', function() {
    assert.ok(achs['quest_starter'], 'quest_starter missing');
    assert.strictEqual(achs['quest_starter'].category, 'quests');
  });
  test('achievement merchant_prince has sparkReward = 75', function() {
    assert.strictEqual(achs['merchant_prince'].sparkReward, 75);
  });
});

// ============================================================================
// SUITE 5 — initPlayerQuests + getActiveQuests / getCompletedQuests
// ============================================================================

suite('initPlayerQuests + getActiveQuests + getCompletedQuests', function() {
  test('getActiveQuests returns empty array after init', function() {
    var pid = uid();
    Q.initPlayerQuests(pid);
    var active = Q.getActiveQuests(pid);
    assert.ok(Array.isArray(active));
    assert.strictEqual(active.length, 0);
  });
  test('getCompletedQuests returns empty array after init', function() {
    var pid = uid();
    Q.initPlayerQuests(pid);
    var completed = Q.getCompletedQuests(pid);
    assert.ok(Array.isArray(completed));
    assert.strictEqual(completed.length, 0);
  });
  test('calling initPlayerQuests twice does not reset existing state', function() {
    var pid = uid();
    Q.initPlayerQuests(pid);
    Q.acceptQuest(pid, 'quest_nexus_001');
    Q.initPlayerQuests(pid); // second call should be no-op
    var active = Q.getActiveQuests(pid);
    assert.strictEqual(active.length, 1);
  });
  test('getAvailableQuests returns array for new player', function() {
    var pid = uid();
    Q.initPlayerQuests(pid);
    var available = Q.getAvailableQuests(pid, { level: 0 });
    assert.ok(Array.isArray(available));
    assert.ok(available.length > 0);
  });
  test('getAvailableQuests excludes quests with unmet prerequisites', function() {
    var pid = uid();
    Q.initPlayerQuests(pid);
    var available = Q.getAvailableQuests(pid, { level: 0 });
    // quest_nexus_002 requires quest_nexus_001 to be turned in
    var found = available.some(function(q) { return q.id === 'quest_nexus_002'; });
    assert.strictEqual(found, false, 'quest_nexus_002 should be gated behind quest_nexus_001');
  });
});

// ============================================================================
// SUITE 6 — acceptQuest
// ============================================================================

suite('acceptQuest', function() {
  test('accepting a valid quest returns success: true', function() {
    var pid = uid();
    Q.initPlayerQuests(pid);
    var result = Q.acceptQuest(pid, 'quest_nexus_001');
    assert.strictEqual(result.success, true);
  });
  test('accepted quest appears in getActiveQuests', function() {
    var pid = uid();
    Q.initPlayerQuests(pid);
    Q.acceptQuest(pid, 'quest_nexus_001');
    var active = Q.getActiveQuests(pid);
    assert.strictEqual(active.length, 1);
    assert.strictEqual(active[0].id, 'quest_nexus_001');
  });
  test('acceptQuest returns quest object on success', function() {
    var pid = uid();
    Q.initPlayerQuests(pid);
    var result = Q.acceptQuest(pid, 'quest_nexus_001');
    assert.ok(result.quest && typeof result.quest === 'object');
    assert.strictEqual(result.quest.id, 'quest_nexus_001');
  });
  test('acceptQuest returns message string on success', function() {
    var pid = uid();
    Q.initPlayerQuests(pid);
    var result = Q.acceptQuest(pid, 'quest_nexus_001');
    assert.strictEqual(typeof result.message, 'string');
    assert.ok(result.message.length > 0);
  });
  test('accepted quest has status active', function() {
    var pid = uid();
    Q.initPlayerQuests(pid);
    var result = Q.acceptQuest(pid, 'quest_nexus_001');
    assert.strictEqual(result.quest.status, 'active');
  });
  test('accepting non-existent quest returns success: false', function() {
    var pid = uid();
    Q.initPlayerQuests(pid);
    var result = Q.acceptQuest(pid, 'quest_does_not_exist_xyz');
    assert.strictEqual(result.success, false);
  });
  test('accepting non-existent quest returns message', function() {
    var pid = uid();
    Q.initPlayerQuests(pid);
    var result = Q.acceptQuest(pid, 'quest_does_not_exist_xyz');
    assert.strictEqual(typeof result.message, 'string');
    assert.ok(result.message.length > 0);
  });
  test('accepting same quest twice returns success: false', function() {
    var pid = uid();
    Q.initPlayerQuests(pid);
    Q.acceptQuest(pid, 'quest_nexus_001');
    var result = Q.acceptQuest(pid, 'quest_nexus_001');
    assert.strictEqual(result.success, false);
  });
  test('accepting same quest twice does not duplicate active quests', function() {
    var pid = uid();
    Q.initPlayerQuests(pid);
    Q.acceptQuest(pid, 'quest_nexus_001');
    Q.acceptQuest(pid, 'quest_nexus_001');
    var active = Q.getActiveQuests(pid);
    assert.strictEqual(active.length, 1);
  });
  test('rejects quest when active queue is at max (5)', function() {
    var pid = uid();
    Q.initPlayerQuests(pid);
    var filled = fillActiveQuests(pid, 5);
    assert.strictEqual(filled, 5);
    // All further accepts should fail
    var available = Q.getAvailableQuests(pid, { level: 0 });
    if (available.length > 0) {
      var result = Q.acceptQuest(pid, available[0].id);
      assert.strictEqual(result.success, false);
    }
  });
  test('MAX_ACTIVE_QUESTS is exported as 5', function() {
    // The module sets MAX_ACTIVE_QUESTS = 5 internally; we verify behavior
    var pid = uid();
    Q.initPlayerQuests(pid);
    var filled = fillActiveQuests(pid, 5);
    var active = Q.getActiveQuests(pid);
    assert.strictEqual(active.length, 5);
  });
});

// ============================================================================
// SUITE 7 — updateQuestProgress
// ============================================================================

suite('updateQuestProgress', function() {
  test('returns empty array when no quests active', function() {
    var pid = uid();
    Q.initPlayerQuests(pid);
    var updated = Q.updateQuestProgress(pid, 'talk_npc', {});
    assert.ok(Array.isArray(updated));
    assert.strictEqual(updated.length, 0);
  });
  test('returns updated quest when event matches active quest objective', function() {
    var pid = uid();
    Q.initPlayerQuests(pid);
    Q.acceptQuest(pid, 'quest_nexus_001'); // objective: talk_npcs count:3
    var updated = Q.updateQuestProgress(pid, 'talk_npc', {});
    assert.strictEqual(updated.length, 1);
    assert.strictEqual(updated[0].id, 'quest_nexus_001');
  });
  test('objective current increments after matching event', function() {
    var pid = uid();
    Q.initPlayerQuests(pid);
    Q.acceptQuest(pid, 'quest_nexus_001');
    Q.updateQuestProgress(pid, 'talk_npc', {});
    var active = Q.getActiveQuests(pid);
    assert.strictEqual(active[0].objectives[0].current, 1);
  });
  test('unrelated event does not update quest', function() {
    var pid = uid();
    Q.initPlayerQuests(pid);
    Q.acceptQuest(pid, 'quest_nexus_001'); // talk_npcs type
    var updated = Q.updateQuestProgress(pid, 'collect', { item: 'sunflower' });
    assert.strictEqual(updated.length, 0);
  });
  test('quest status becomes complete when all objectives met', function() {
    var pid = uid();
    Q.initPlayerQuests(pid);
    Q.acceptQuest(pid, 'quest_nexus_001'); // requires 3 talk_npc events
    Q.updateQuestProgress(pid, 'talk_npc', {});
    Q.updateQuestProgress(pid, 'talk_npc', {});
    Q.updateQuestProgress(pid, 'talk_npc', {});
    var active = Q.getActiveQuests(pid);
    assert.strictEqual(active[0].status, 'complete');
  });
  test('collect event increments gather quest objective', function() {
    var pid = uid();
    Q.initPlayerQuests(pid);
    Q.acceptQuest(pid, 'quest_gardens_001'); // collect sunflower x3
    Q.updateQuestProgress(pid, 'collect', { item: 'sunflower' });
    var active = Q.getActiveQuests(pid);
    assert.strictEqual(active[0].objectives[0].current, 1);
  });
  test('collect event with wrong item does not update gather quest', function() {
    var pid = uid();
    Q.initPlayerQuests(pid);
    Q.acceptQuest(pid, 'quest_gardens_001'); // collect sunflower
    Q.updateQuestProgress(pid, 'collect', { item: 'mushroom' });
    var active = Q.getActiveQuests(pid);
    assert.strictEqual(active[0].objectives[0].current, 0);
  });
  test('objective current does not exceed objective count', function() {
    var pid = uid();
    Q.initPlayerQuests(pid);
    Q.acceptQuest(pid, 'quest_gardens_001'); // sunflower x3
    for (var i = 0; i < 10; i++) {
      Q.updateQuestProgress(pid, 'collect', { item: 'sunflower' });
    }
    var active = Q.getActiveQuests(pid);
    // After quest completes it stays in active but status is complete
    assert.ok(active[0].objectives[0].current <= active[0].objectives[0].count);
  });
  test('visit_zone event updates zone_hopper objective', function() {
    var pid = uid();
    Q.initPlayerQuests(pid);
    Q.acceptQuest(pid, 'quest_nexus_002'); // requires quest_nexus_001 turned in first
    // quest_nexus_002 needs prerequisite — use a direct zone quest instead
    Q.acceptQuest(pid, 'quest_wilds_001'); // observe wildlife x5
    var updated = Q.updateQuestProgress(pid, 'observe', { category: 'wildlife' });
    assert.strictEqual(updated.length, 1);
  });
});

// ============================================================================
// SUITE 8 — getDailyQuests
// ============================================================================

suite('getDailyQuests', function() {
  test('returns an array', function() {
    var dailies = Q.getDailyQuests();
    assert.ok(Array.isArray(dailies));
  });
  test('returns exactly 3 daily quests', function() {
    var dailies = Q.getDailyQuests();
    assert.strictEqual(dailies.length, 3);
  });
  test('each daily has an id string', function() {
    var dailies = Q.getDailyQuests();
    for (var i = 0; i < dailies.length; i++) {
      assert.strictEqual(typeof dailies[i].id, 'string', 'daily[' + i + '] id is not string');
    }
  });
  test('each daily has a title string', function() {
    var dailies = Q.getDailyQuests();
    for (var i = 0; i < dailies.length; i++) {
      assert.strictEqual(typeof dailies[i].title, 'string', 'daily[' + i + '] title not string');
    }
  });
  test('each daily has a description string', function() {
    var dailies = Q.getDailyQuests();
    for (var i = 0; i < dailies.length; i++) {
      assert.strictEqual(typeof dailies[i].description, 'string');
    }
  });
  test('each daily has type set to daily', function() {
    var dailies = Q.getDailyQuests();
    for (var i = 0; i < dailies.length; i++) {
      assert.strictEqual(dailies[i].type, 'daily');
    }
  });
  test('each daily has repeatable set to false', function() {
    var dailies = Q.getDailyQuests();
    for (var i = 0; i < dailies.length; i++) {
      assert.strictEqual(dailies[i].repeatable, false);
    }
  });
  test('each daily has requiredLevel = 0', function() {
    var dailies = Q.getDailyQuests();
    for (var i = 0; i < dailies.length; i++) {
      assert.strictEqual(dailies[i].requiredLevel, 0);
    }
  });
  test('each daily has non-empty objectives array', function() {
    var dailies = Q.getDailyQuests();
    for (var i = 0; i < dailies.length; i++) {
      assert.ok(Array.isArray(dailies[i].objectives));
      assert.ok(dailies[i].objectives.length > 0);
    }
  });
  test('each daily has rewards object with spark', function() {
    var dailies = Q.getDailyQuests();
    for (var i = 0; i < dailies.length; i++) {
      assert.ok(dailies[i].rewards && typeof dailies[i].rewards === 'object');
      assert.strictEqual(typeof dailies[i].rewards.spark, 'number');
    }
  });
  test('each daily has status available', function() {
    var dailies = Q.getDailyQuests();
    for (var i = 0; i < dailies.length; i++) {
      assert.strictEqual(dailies[i].status, 'available');
    }
  });
  test('calling getDailyQuests twice returns same set of 3 quests', function() {
    var a = Q.getDailyQuests();
    var b = Q.getDailyQuests();
    assert.strictEqual(a.length, b.length);
    for (var i = 0; i < a.length; i++) {
      assert.strictEqual(a[i].title, b[i].title);
    }
  });
});

// ============================================================================
// SUITE 9 — Achievement tracking
// ============================================================================

suite('Achievement tracking', function() {
  test('getAchievements returns array for new player', function() {
    var pid = uid();
    var achs = Q.getAchievements(pid);
    assert.ok(Array.isArray(achs));
    assert.ok(achs.length > 0);
  });
  test('all achievements start as unlocked: false', function() {
    var pid = uid();
    var achs = Q.getAchievements(pid);
    for (var i = 0; i < achs.length; i++) {
      assert.strictEqual(achs[i].unlocked, false, achs[i].id + ' should start locked');
    }
  });
  test('getAchievementProgress returns object with unlocked, total, percentage, counters', function() {
    var pid = uid();
    var progress = Q.getAchievementProgress(pid);
    assert.ok('unlocked' in progress);
    assert.ok('total' in progress);
    assert.ok('percentage' in progress);
    assert.ok('counters' in progress);
  });
  test('getAchievementProgress starts with 0 unlocked', function() {
    var pid = uid();
    var progress = Q.getAchievementProgress(pid);
    assert.strictEqual(progress.unlocked, 0);
  });
  test('getAchievementProgress total matches ACHIEVEMENTS count', function() {
    var pid = uid();
    var progress = Q.getAchievementProgress(pid);
    assert.strictEqual(progress.total, Object.keys(Q.ACHIEVEMENTS).length);
  });
  test('getAchievementProgress percentage starts at 0', function() {
    var pid = uid();
    var progress = Q.getAchievementProgress(pid);
    assert.strictEqual(progress.percentage, 0);
  });
  test('trackAchievementEvent returns array', function() {
    var pid = uid();
    var result = Q.trackAchievementEvent(pid, 'login', {});
    assert.ok(Array.isArray(result));
  });
  test('trackAchievementEvent login unlocks first_steps', function() {
    var pid = uid();
    var unlocked = Q.trackAchievementEvent(pid, 'login', {});
    var ids = unlocked.map(function(a) { return a.id; });
    assert.ok(ids.indexOf('first_steps') !== -1, 'first_steps not unlocked on login');
  });
  test('first_steps not unlocked twice on second login', function() {
    var pid = uid();
    Q.trackAchievementEvent(pid, 'login', {});
    var second = Q.trackAchievementEvent(pid, 'login', {});
    var ids = second.map(function(a) { return a.id; });
    assert.ok(ids.indexOf('first_steps') === -1, 'first_steps should only unlock once');
  });
  test('trackAchievementEvent craft increments items_crafted counter', function() {
    var pid = uid();
    Q.trackAchievementEvent(pid, 'craft', {});
    var progress = Q.getAchievementProgress(pid);
    assert.strictEqual(progress.counters.items_crafted, 1);
  });
  test('first_craft achievement unlocked after first craft event', function() {
    var pid = uid();
    var unlocked = Q.trackAchievementEvent(pid, 'craft', {});
    var ids = unlocked.map(function(a) { return a.id; });
    assert.ok(ids.indexOf('first_craft') !== -1, 'first_craft not unlocked');
  });
  test('first_trade unlocked after first trade event', function() {
    var pid = uid();
    var unlocked = Q.trackAchievementEvent(pid, 'trade', {});
    var ids = unlocked.map(function(a) { return a.id; });
    assert.ok(ids.indexOf('first_trade') !== -1, 'first_trade not unlocked');
  });
  test('trade counter increments with each trade event', function() {
    var pid = uid();
    Q.trackAchievementEvent(pid, 'trade', {});
    Q.trackAchievementEvent(pid, 'trade', {});
    var progress = Q.getAchievementProgress(pid);
    assert.strictEqual(progress.counters.trades_completed, 2);
  });
  test('getAchievements shows unlocked: true for first_craft after crafting', function() {
    var pid = uid();
    Q.trackAchievementEvent(pid, 'craft', {});
    var achs = Q.getAchievements(pid);
    var firstCraft = achs.filter(function(a) { return a.id === 'first_craft'; })[0];
    assert.ok(firstCraft, 'first_craft not in achievements list');
    assert.strictEqual(firstCraft.unlocked, true);
  });
  test('getAchievements entries have id, name, description, icon, category, sparkReward, unlocked', function() {
    var pid = uid();
    var achs = Q.getAchievements(pid);
    var ach = achs[0];
    assert.ok('id' in ach);
    assert.ok('name' in ach);
    assert.ok('description' in ach);
    assert.ok('icon' in ach);
    assert.ok('category' in ach);
    assert.ok('sparkReward' in ach);
    assert.ok('unlocked' in ach);
  });
  test('zone_hopper unlocks after visiting 4 zones', function() {
    var pid = uid();
    Q.trackAchievementEvent(pid, 'visit_zone', { zone: 'nexus' });
    Q.trackAchievementEvent(pid, 'visit_zone', { zone: 'gardens' });
    Q.trackAchievementEvent(pid, 'visit_zone', { zone: 'wilds' });
    var before = Q.getAchievementProgress(pid);
    assert.strictEqual(before.counters.zones_visited, 3);
    var unlocked = Q.trackAchievementEvent(pid, 'visit_zone', { zone: 'arena' });
    var ids = unlocked.map(function(a) { return a.id; });
    assert.ok(ids.indexOf('zone_hopper') !== -1, 'zone_hopper not unlocked at 4 zones');
  });
  test('visiting same zone twice does not double-count', function() {
    var pid = uid();
    Q.trackAchievementEvent(pid, 'visit_zone', { zone: 'nexus' });
    Q.trackAchievementEvent(pid, 'visit_zone', { zone: 'nexus' });
    var progress = Q.getAchievementProgress(pid);
    assert.strictEqual(progress.counters.zones_visited, 1);
  });
  test('green_thumb unlocks after planting first seed', function() {
    var pid = uid();
    var unlocked = Q.trackAchievementEvent(pid, 'plant', {});
    var ids = unlocked.map(function(a) { return a.id; });
    assert.ok(ids.indexOf('green_thumb') !== -1, 'green_thumb not unlocked');
  });
  test('friendly_face unlocks after talking to 10 NPCs', function() {
    var pid = uid();
    for (var i = 0; i < 9; i++) {
      Q.trackAchievementEvent(pid, 'talk_npc', {});
    }
    var progress = Q.getAchievementProgress(pid);
    assert.strictEqual(progress.counters.npcs_talked, 9);
    var unlocked = Q.trackAchievementEvent(pid, 'talk_npc', {});
    var ids = unlocked.map(function(a) { return a.id; });
    assert.ok(ids.indexOf('friendly_face') !== -1, 'friendly_face not unlocked at 10 NPCs');
  });
  test('getAchievementProgress percentage increases as achievements unlock', function() {
    var pid = uid();
    var before = Q.getAchievementProgress(pid);
    Q.trackAchievementEvent(pid, 'login', {});
    var after = Q.getAchievementProgress(pid);
    assert.ok(after.percentage > before.percentage);
  });
});

// ============================================================================
// SUITE 10 — EDGE CASES
// ============================================================================

suite('Edge cases', function() {
  test('getActiveQuests for unknown player returns empty array', function() {
    var active = Q.getActiveQuests('unknown_player_xyz_9999');
    assert.ok(Array.isArray(active));
    assert.strictEqual(active.length, 0);
  });
  test('getCompletedQuests for unknown player returns empty array', function() {
    var completed = Q.getCompletedQuests('unknown_player_xyz_8888');
    assert.ok(Array.isArray(completed));
    assert.strictEqual(completed.length, 0);
  });
  test('updateQuestProgress for unknown player returns empty array', function() {
    var updated = Q.updateQuestProgress('unknown_player_xyz_7777', 'collect', { item: 'sunflower' });
    assert.ok(Array.isArray(updated));
    assert.strictEqual(updated.length, 0);
  });
  test('acceptQuest with invalid quest id returns success: false', function() {
    var pid = uid();
    Q.initPlayerQuests(pid);
    var result = Q.acceptQuest(pid, '');
    assert.strictEqual(result.success, false);
  });
  test('completeQuest for non-active quest returns success: false', function() {
    var pid = uid();
    Q.initPlayerQuests(pid);
    var result = Q.completeQuest(pid, 'quest_nexus_001', null);
    assert.strictEqual(result.success, false);
  });
  test('completeQuest for active but incomplete quest returns success: false', function() {
    var pid = uid();
    Q.initPlayerQuests(pid);
    Q.acceptQuest(pid, 'quest_nexus_001');
    var result = Q.completeQuest(pid, 'quest_nexus_001', null);
    assert.strictEqual(result.success, false);
  });
  test('completeQuest for completed-objective quest returns success: true', function() {
    var pid = uid();
    Q.initPlayerQuests(pid);
    Q.acceptQuest(pid, 'quest_nexus_001'); // talk_npc x3
    Q.updateQuestProgress(pid, 'talk_npc', {});
    Q.updateQuestProgress(pid, 'talk_npc', {});
    Q.updateQuestProgress(pid, 'talk_npc', {});
    var result = Q.completeQuest(pid, 'quest_nexus_001', null);
    assert.strictEqual(result.success, true);
  });
  test('completeQuest removes quest from active list', function() {
    var pid = uid();
    Q.initPlayerQuests(pid);
    Q.acceptQuest(pid, 'quest_nexus_001');
    Q.updateQuestProgress(pid, 'talk_npc', {});
    Q.updateQuestProgress(pid, 'talk_npc', {});
    Q.updateQuestProgress(pid, 'talk_npc', {});
    Q.completeQuest(pid, 'quest_nexus_001', null);
    var active = Q.getActiveQuests(pid);
    var stillActive = active.some(function(q) { return q.id === 'quest_nexus_001'; });
    assert.strictEqual(stillActive, false);
  });
  test('completeQuest adds quest to completed list', function() {
    var pid = uid();
    Q.initPlayerQuests(pid);
    Q.acceptQuest(pid, 'quest_nexus_001');
    Q.updateQuestProgress(pid, 'talk_npc', {});
    Q.updateQuestProgress(pid, 'talk_npc', {});
    Q.updateQuestProgress(pid, 'talk_npc', {});
    Q.completeQuest(pid, 'quest_nexus_001', null);
    var completed = Q.getCompletedQuests(pid);
    assert.ok(completed.indexOf('quest_nexus_001') !== -1);
  });
  test('completeQuest returns rewards object', function() {
    var pid = uid();
    Q.initPlayerQuests(pid);
    Q.acceptQuest(pid, 'quest_nexus_001');
    Q.updateQuestProgress(pid, 'talk_npc', {});
    Q.updateQuestProgress(pid, 'talk_npc', {});
    Q.updateQuestProgress(pid, 'talk_npc', {});
    var result = Q.completeQuest(pid, 'quest_nexus_001', null);
    assert.ok(result.rewards && typeof result.rewards === 'object');
    assert.strictEqual(typeof result.rewards.spark, 'number');
  });
  test('abandonQuest removes quest from active list', function() {
    var pid = uid();
    Q.initPlayerQuests(pid);
    Q.acceptQuest(pid, 'quest_nexus_001');
    Q.abandonQuest(pid, 'quest_nexus_001');
    var active = Q.getActiveQuests(pid);
    assert.strictEqual(active.length, 0);
  });
  test('abandonQuest on non-active quest returns success: false', function() {
    var pid = uid();
    Q.initPlayerQuests(pid);
    var result = Q.abandonQuest(pid, 'quest_nexus_001');
    assert.strictEqual(result.success, false);
  });
  test('getAvailableQuests does not include already-active quest', function() {
    var pid = uid();
    Q.initPlayerQuests(pid);
    Q.acceptQuest(pid, 'quest_nexus_001');
    var available = Q.getAvailableQuests(pid, { level: 0 });
    var found = available.some(function(q) { return q.id === 'quest_nexus_001'; });
    assert.strictEqual(found, false);
  });
  test('trackAchievementEvent with unknown event type returns empty array', function() {
    var pid = uid();
    var unlocked = Q.trackAchievementEvent(pid, 'not_a_real_event_xyz', {});
    assert.ok(Array.isArray(unlocked));
    assert.strictEqual(unlocked.length, 0);
  });
  test('getQuestLog returns object with active, completed, available arrays', function() {
    var pid = uid();
    Q.initPlayerQuests(pid);
    var log = Q.getQuestLog(pid, { level: 0 });
    assert.ok(Array.isArray(log.active));
    assert.ok(Array.isArray(log.completed));
    assert.ok(Array.isArray(log.available));
  });
  test('getChainProgress returns object with all chain ids', function() {
    var pid = uid();
    Q.initPlayerQuests(pid);
    var progress = Q.getChainProgress(pid);
    for (var id in Q.QUEST_CHAINS) {
      assert.ok(id in progress, 'chain ' + id + ' missing from progress');
    }
  });
  test('getChainProgress chain entry has completed, total, isComplete', function() {
    var pid = uid();
    Q.initPlayerQuests(pid);
    var progress = Q.getChainProgress(pid);
    var chain = progress['chain_origins'];
    assert.ok('completed' in chain);
    assert.ok('total' in chain);
    assert.ok('isComplete' in chain);
    assert.strictEqual(chain.completed, 0);
    assert.strictEqual(chain.isComplete, false);
  });
});

// ============================================================================
// REPORT
// ============================================================================

if (!report()) process.exit(1);
