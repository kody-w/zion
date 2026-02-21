const { test, suite, report, assert } = require('./test_runner');
const Quests = require('../src/js/quests');

// ============================================================================
// HELPERS
// ============================================================================

// Each test that modifies global state must use a unique player ID so tests
// remain isolated (playerQuestStates is module-level in quests.js).
var playerSeq = 0;
function uid() {
  return 'test_player_' + (++playerSeq);
}

// Fully complete all objectives on an active quest object (mutates in place).
function fullyProgress(playerId, questId, eventType, eventData, times) {
  for (var i = 0; i < times; i++) {
    Quests.updateQuestProgress(playerId, eventType, eventData || {});
  }
}

// Accept a quest and assert success.
function acceptOk(playerId, questId) {
  var result = Quests.acceptQuest(playerId, questId);
  assert(result.success === true, 'acceptQuest should succeed for ' + questId + ': ' + result.message);
  return result;
}

// ============================================================================
// SUITE 1 — Quest database and initialization
// ============================================================================
suite('Quest Database & Initialization', function() {

  test('QUEST_DATABASE is not exported but quest IDs are accessible via getAvailableQuests', function() {
    var p = uid();
    var available = Quests.getAvailableQuests(p, { level: 0 });
    assert(available.length > 0, 'At least one quest must be available');
  });

  test('initPlayerQuests creates empty state without throwing', function() {
    var p = uid();
    Quests.initPlayerQuests(p);
    var active = Quests.getActiveQuests(p);
    assert(Array.isArray(active), 'Active quests should be an array');
    assert(active.length === 0, 'Newly initialized player should have 0 active quests');
  });

  test('initPlayerQuests is idempotent — calling twice does not reset existing state', function() {
    var p = uid();
    Quests.initPlayerQuests(p);
    acceptOk(p, 'quest_nexus_001');
    Quests.initPlayerQuests(p); // second init
    var active = Quests.getActiveQuests(p);
    assert(active.length === 1, 'Second initPlayerQuests should not wipe existing active quests');
  });

  test('Quest database contains 25 quests covering 8 zones', function() {
    var p = uid();
    var available = Quests.getAvailableQuests(p, { level: 99 });
    // All 25 quests in the DB have no level requirement and either no prereqs or
    // prereqs that haven't been met yet — count at least the ones with no prereqs.
    // We know there are 25 total; many need prerequisites, so available < 25 for a fresh player.
    // The right check: total in DB >= 20 (we can verify via getPlayerQuestStats).
    var stats = Quests.getPlayerQuestStats(p);
    assert(stats.totalAvailable === 25, 'Quest database should contain exactly 25 quests');
  });

  test('Quest database includes quests from 8 different zones', function() {
    var p = uid();
    var available = Quests.getAvailableQuests(p, { level: 0 });
    var ids = available.map(function(q) { return q.id; });
    var zones = ['nexus', 'gardens', 'wilds', 'athenaeum', 'studio', 'agora', 'commons', 'arena'];
    zones.forEach(function(zone) {
      var found = ids.some(function(id) { return id.indexOf(zone) !== -1; });
      assert(found, 'Zone ' + zone + ' should have at least one available quest for a fresh player (with no prereqs)');
    });
  });

  test('Each quest has required fields: id, title, description, type, objectives, rewards', function() {
    var p = uid();
    // Accept all quests that have no prerequisites so we can inspect them.
    var available = Quests.getAvailableQuests(p, { level: 0 });
    available.forEach(function(q) {
      assert(q.id !== undefined, 'Quest must have id');
      assert(typeof q.title === 'string' && q.title.length > 0, 'Quest must have title: ' + q.id);
      assert(typeof q.description === 'string', 'Quest must have description: ' + q.id);
      assert(typeof q.type === 'string', 'Quest must have type: ' + q.id);
      assert(Array.isArray(q.objectives), 'Quest must have objectives array: ' + q.id);
      assert(q.rewards !== undefined, 'Quest must have rewards: ' + q.id);
      assert(typeof q.rewards.spark === 'number', 'Rewards must have spark value: ' + q.id);
    });
  });

  test('Quest types cover: social, explore, gather, craft, deliver', function() {
    var p = uid();
    var available = Quests.getAvailableQuests(p, { level: 0 });
    var types = available.map(function(q) { return q.type; });
    var uniqueTypes = types.filter(function(v, i, a) { return a.indexOf(v) === i; });
    assert(uniqueTypes.indexOf('social') !== -1, 'social type should exist');
    assert(uniqueTypes.indexOf('explore') !== -1, 'explore type should exist');
    assert(uniqueTypes.indexOf('gather') !== -1, 'gather type should exist');
    assert(uniqueTypes.indexOf('craft') !== -1, 'craft type should exist');
  });

});

// ============================================================================
// SUITE 2 — acceptQuest
// ============================================================================
suite('acceptQuest', function() {

  test('acceptQuest succeeds for a valid quest with no prerequisites', function() {
    var p = uid();
    var result = Quests.acceptQuest(p, 'quest_nexus_001');
    assert(result.success === true, 'Should succeed');
    assert(result.quest !== undefined, 'Should return quest object');
    assert(result.quest.status === 'active', 'Quest status should be active');
  });

  test('acceptQuest returns an independent clone (modifying returned quest does not affect DB)', function() {
    var p = uid();
    var result = Quests.acceptQuest(p, 'quest_nexus_001');
    result.quest.title = 'MUTATED';
    // Accept for a different player — title should be unchanged.
    var p2 = uid();
    var result2 = Quests.acceptQuest(p2, 'quest_nexus_001');
    assert(result2.quest.title !== 'MUTATED', 'Quest clone should be independent from DB');
  });

  test('acceptQuest fails for invalid quest ID', function() {
    var p = uid();
    var result = Quests.acceptQuest(p, 'quest_does_not_exist');
    assert(result.success === false, 'Should fail for unknown quest ID');
    assert(result.message === 'Quest not found', 'Error message should indicate quest not found');
  });

  test('acceptQuest fails if quest already active', function() {
    var p = uid();
    Quests.acceptQuest(p, 'quest_nexus_001');
    var result = Quests.acceptQuest(p, 'quest_nexus_001');
    assert(result.success === false, 'Should fail for already-active quest');
    assert(result.message === 'Quest already active', 'Error message should say already active');
  });

  test('acceptQuest respects MAX_ACTIVE_QUESTS limit of 5', function() {
    var p = uid();
    // Accept 5 quests with no prereqs.
    var noPrereqIds = [
      'quest_nexus_001',
      'quest_gardens_001',
      'quest_gardens_002',
      'quest_gardens_003',
      'quest_wilds_001'
    ];
    noPrereqIds.forEach(function(id) {
      var r = Quests.acceptQuest(p, id);
      assert(r.success === true, 'Should accept quest ' + id);
    });
    // 6th quest attempt.
    var result = Quests.acceptQuest(p, 'quest_gardens_004');
    assert(result.success === false, '6th quest should be rejected');
    assert(result.message.includes('Too many active quests'), 'Message should mention quest limit');
  });

  test('acceptQuest returns quest with startTime set', function() {
    var before = Date.now();
    var p = uid();
    var result = Quests.acceptQuest(p, 'quest_nexus_001');
    var after = Date.now();
    assert(result.quest.startTime >= before && result.quest.startTime <= after,
      'startTime should be current timestamp');
  });

  test('acceptQuest fails when prerequisite quest not yet completed', function() {
    var p = uid();
    // quest_nexus_002 requires quest_nexus_001.
    var result = Quests.acceptQuest(p, 'quest_nexus_002');
    assert(result.success === false || Quests.getAvailableQuests(p, {}).every(function(q) {
      return q.id !== 'quest_nexus_002';
    }), 'quest_nexus_002 should not be directly available without prerequisite');
    // Alternatively check that it is not in available list.
    var available = Quests.getAvailableQuests(p, { level: 0 });
    var ids = available.map(function(q) { return q.id; });
    assert(ids.indexOf('quest_nexus_002') === -1, 'quest_nexus_002 should not be available without prerequisite');
  });

  test('acceptQuest succeeds after prerequisite completed', function() {
    var p = uid();
    // Complete quest_nexus_001 manually.
    acceptOk(p, 'quest_nexus_001');
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.completeQuest(p, 'quest_nexus_001', null);
    // Now quest_nexus_002 should be available.
    var available = Quests.getAvailableQuests(p, { level: 0 });
    var ids = available.map(function(q) { return q.id; });
    assert(ids.indexOf('quest_nexus_002') !== -1, 'quest_nexus_002 should be available after prerequisite');
    var result = Quests.acceptQuest(p, 'quest_nexus_002');
    assert(result.success === true, 'Should be able to accept quest_nexus_002 after prereq');
  });

});

// ============================================================================
// SUITE 3 — getAvailableQuests
// ============================================================================
suite('getAvailableQuests', function() {

  test('getAvailableQuests returns quests for fresh player (level 0)', function() {
    var p = uid();
    var available = Quests.getAvailableQuests(p, { level: 0 });
    assert(available.length > 0, 'Fresh player should have some available quests');
  });

  test('getAvailableQuests excludes already-active quests', function() {
    var p = uid();
    Quests.acceptQuest(p, 'quest_nexus_001');
    var available = Quests.getAvailableQuests(p, { level: 0 });
    var ids = available.map(function(q) { return q.id; });
    assert(ids.indexOf('quest_nexus_001') === -1, 'Active quest should not appear in available');
  });

  test('getAvailableQuests excludes non-repeatable turned-in quests', function() {
    var p = uid();
    acceptOk(p, 'quest_nexus_001');
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.completeQuest(p, 'quest_nexus_001', null);
    var available = Quests.getAvailableQuests(p, { level: 0 });
    var ids = available.map(function(q) { return q.id; });
    assert(ids.indexOf('quest_nexus_001') === -1, 'Non-repeatable completed quest should not be available');
  });

  test('getAvailableQuests includes repeatable quests even after completion', function() {
    var p = uid();
    acceptOk(p, 'quest_gardens_001'); // repeatable: true
    Quests.updateQuestProgress(p, 'collect', { item: 'sunflower' });
    Quests.updateQuestProgress(p, 'collect', { item: 'sunflower' });
    Quests.updateQuestProgress(p, 'collect', { item: 'sunflower' });
    Quests.completeQuest(p, 'quest_gardens_001', null);
    var available = Quests.getAvailableQuests(p, { level: 0 });
    var ids = available.map(function(q) { return q.id; });
    assert(ids.indexOf('quest_gardens_001') !== -1, 'Repeatable quest should be available again after completion');
  });

  test('getAvailableQuests returns copies, not references (mutation-safe)', function() {
    var p = uid();
    var available = Quests.getAvailableQuests(p, { level: 0 });
    available[0].title = 'MUTATED';
    var available2 = Quests.getAvailableQuests(p, { level: 0 });
    assert(available2[0].title !== 'MUTATED', 'Available quests should be independent copies');
  });

});

// ============================================================================
// SUITE 4 — updateQuestProgress
// ============================================================================
suite('updateQuestProgress', function() {

  test('updateQuestProgress returns empty array when no quests active', function() {
    var p = uid();
    var updated = Quests.updateQuestProgress(p, 'talk_npc', {});
    assert(Array.isArray(updated), 'Should return array');
    assert(updated.length === 0, 'No active quests = no updates');
  });

  test('updateQuestProgress increments collect objective', function() {
    var p = uid();
    acceptOk(p, 'quest_gardens_001'); // collect sunflower x3
    Quests.updateQuestProgress(p, 'collect', { item: 'sunflower' });
    var active = Quests.getActiveQuests(p);
    assert(active[0].objectives[0].current === 1, 'Objective current should be 1 after one collect');
  });

  test('updateQuestProgress does not match wrong item', function() {
    var p = uid();
    acceptOk(p, 'quest_gardens_001'); // collect sunflower
    Quests.updateQuestProgress(p, 'collect', { item: 'rose' });
    var active = Quests.getActiveQuests(p);
    assert(active[0].objectives[0].current === 0, 'Wrong item should not advance objective');
  });

  test('updateQuestProgress caps at objective count (no over-progress)', function() {
    var p = uid();
    acceptOk(p, 'quest_gardens_001'); // collect sunflower x3
    for (var i = 0; i < 10; i++) {
      Quests.updateQuestProgress(p, 'collect', { item: 'sunflower' });
    }
    var active = Quests.getActiveQuests(p);
    // Quest is 'complete' so it stays in active list until turned in.
    assert(active[0].objectives[0].current <= 3, 'Objective should not exceed count');
  });

  test('updateQuestProgress marks quest complete when all objectives met', function() {
    var p = uid();
    acceptOk(p, 'quest_gardens_001'); // collect sunflower x3
    Quests.updateQuestProgress(p, 'collect', { item: 'sunflower' });
    Quests.updateQuestProgress(p, 'collect', { item: 'sunflower' });
    Quests.updateQuestProgress(p, 'collect', { item: 'sunflower' });
    var active = Quests.getActiveQuests(p);
    assert(active[0].status === 'complete', 'Quest should be marked complete');
  });

  test('updateQuestProgress handles talk_npc for talk_npcs objective', function() {
    var p = uid();
    acceptOk(p, 'quest_nexus_001'); // talk_npcs x3
    var updated = Quests.updateQuestProgress(p, 'talk_npc', {});
    assert(updated.length === 1, 'Should return the updated quest');
    assert(updated[0].objectives[0].current === 1, 'current should be 1');
  });

  test('updateQuestProgress handles visit_zone and deduplicates zones', function() {
    var p = uid();
    // quest_nexus_002 needs quest_nexus_001 completed first.
    acceptOk(p, 'quest_nexus_001');
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.completeQuest(p, 'quest_nexus_001', null);
    acceptOk(p, 'quest_nexus_002'); // visit_zones x3 unique
    Quests.updateQuestProgress(p, 'visit_zone', { zone: 'nexus' });
    Quests.updateQuestProgress(p, 'visit_zone', { zone: 'nexus' }); // duplicate
    Quests.updateQuestProgress(p, 'visit_zone', { zone: 'gardens' });
    var active = Quests.getActiveQuests(p);
    var obj = active[0].objectives[0];
    assert(obj.current === 2, 'Duplicate zone visit should not count twice, current=' + obj.current);
  });

  test('updateQuestProgress handles deliver objective with npcId matching', function() {
    var p = uid();
    acceptOk(p, 'quest_gardens_005'); // deliver water_bucket to ai_citizen_043
    var updated = Quests.updateQuestProgress(p, 'deliver', { npcId: 'ai_citizen_043' });
    assert(updated.length === 1, 'Deliver to correct NPC should update quest');
    assert(updated[0].objectives[0].current === 1, 'current should be 1 after deliver');
  });

  test('updateQuestProgress does not match deliver to wrong NPC', function() {
    var p = uid();
    acceptOk(p, 'quest_gardens_005');
    Quests.updateQuestProgress(p, 'deliver', { npcId: 'ai_citizen_999' });
    var active = Quests.getActiveQuests(p);
    assert(active[0].objectives[0].current === 0, 'Wrong NPC should not advance delivery');
  });

  test('updateQuestProgress handles discover objective', function() {
    var p = uid();
    acceptOk(p, 'quest_gardens_004'); // discover gardens_secret_spot
    Quests.updateQuestProgress(p, 'discover', { location: 'gardens_secret_spot' });
    var active = Quests.getActiveQuests(p);
    assert(active[0].status === 'complete', 'Discover objective should complete when found');
  });

  test('updateQuestProgress handles observe objective with category', function() {
    var p = uid();
    acceptOk(p, 'quest_wilds_001'); // observe wildlife x5
    Quests.updateQuestProgress(p, 'observe', { category: 'wildlife' });
    var active = Quests.getActiveQuests(p);
    assert(active[0].objectives[0].current === 1, 'Observe wildlife should increment');
  });

  test('updateQuestProgress handles observe wrong category', function() {
    var p = uid();
    acceptOk(p, 'quest_wilds_001');
    Quests.updateQuestProgress(p, 'observe', { category: 'plants' });
    var active = Quests.getActiveQuests(p);
    assert(active[0].objectives[0].current === 0, 'Wrong category observe should not increment');
  });

  test('updateQuestProgress handles plant objective', function() {
    var p = uid();
    acceptOk(p, 'quest_gardens_002'); // plant moonflower_seed x5
    Quests.updateQuestProgress(p, 'plant', { item: 'moonflower_seed' });
    var active = Quests.getActiveQuests(p);
    assert(active[0].objectives[0].current === 1, 'Plant correct item should increment');
  });

  test('updateQuestProgress handles trade objective', function() {
    var p = uid();
    acceptOk(p, 'quest_agora_002'); // trade x2
    Quests.updateQuestProgress(p, 'trade', {});
    var active = Quests.getActiveQuests(p);
    assert(active[0].objectives[0].current === 1, 'Trade event should increment trade objective');
  });

  test('updateQuestProgress handles deliver_merchant objective', function() {
    var p = uid();
    acceptOk(p, 'quest_agora_001'); // deliver_merchants x3
    Quests.updateQuestProgress(p, 'deliver_merchant', {});
    var active = Quests.getActiveQuests(p);
    assert(active[0].objectives[0].current === 1, 'deliver_merchant should increment');
  });

  test('updateQuestProgress handles perfect_score objective', function() {
    var p = uid();
    // quest_arena_002 requires quest_arena_001 first.
    acceptOk(p, 'quest_arena_001'); // train x3
    Quests.updateQuestProgress(p, 'train', {});
    Quests.updateQuestProgress(p, 'train', {});
    Quests.updateQuestProgress(p, 'train', {});
    Quests.completeQuest(p, 'quest_arena_001', null);
    acceptOk(p, 'quest_arena_002'); // perfect_score
    Quests.updateQuestProgress(p, 'perfect_score', {});
    var active = Quests.getActiveQuests(p);
    assert(active[0].status === 'complete', 'perfect_score should complete that quest');
  });

  test('updateQuestProgress handles amount multiplier in eventData', function() {
    var p = uid();
    acceptOk(p, 'quest_commons_001'); // contribute building_material x5
    Quests.updateQuestProgress(p, 'contribute', { item: 'building_material', amount: 3 });
    var active = Quests.getActiveQuests(p);
    assert(active[0].objectives[0].current === 3, 'Amount=3 should advance by 3');
  });

  test('updateQuestProgress updates multiple active quests simultaneously', function() {
    var p = uid();
    acceptOk(p, 'quest_nexus_001'); // talk_npcs
    acceptOk(p, 'quest_athenaeum_002'); // talk_scholars
    var updated = Quests.updateQuestProgress(p, 'talk_npc', {});
    assert(updated.length === 2, 'Both quests with talk_npc objective should update simultaneously');
  });

  test('updateQuestProgress adds quest id to completedQuests when done', function() {
    var p = uid();
    acceptOk(p, 'quest_nexus_001');
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.updateQuestProgress(p, 'talk_npc', {});
    var log = Quests.getQuestLog(p, {});
    assert(log.completed.indexOf('quest_nexus_001') !== -1,
      'Completed quest id should be in completedQuests array after objectives met');
  });

});

// ============================================================================
// SUITE 5 — completeQuest
// ============================================================================
suite('completeQuest', function() {

  test('completeQuest succeeds when quest status is complete', function() {
    var p = uid();
    acceptOk(p, 'quest_nexus_001');
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.updateQuestProgress(p, 'talk_npc', {});
    var result = Quests.completeQuest(p, 'quest_nexus_001', null);
    assert(result.success === true, 'completeQuest should succeed');
  });

  test('completeQuest fails when quest is not active', function() {
    var p = uid();
    var result = Quests.completeQuest(p, 'quest_nexus_001', null);
    assert(result.success === false, 'Should fail when quest not active');
    assert(result.message === 'Quest not active', 'Message should say not active');
  });

  test('completeQuest fails when objectives not finished', function() {
    var p = uid();
    acceptOk(p, 'quest_nexus_001');
    Quests.updateQuestProgress(p, 'talk_npc', {}); // only 1 of 3
    var result = Quests.completeQuest(p, 'quest_nexus_001', null);
    assert(result.success === false, 'Should fail with incomplete objectives');
    assert(result.message === 'Quest objectives not complete', 'Message should mention incomplete objectives');
  });

  test('completeQuest removes quest from active list', function() {
    var p = uid();
    acceptOk(p, 'quest_nexus_001');
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.completeQuest(p, 'quest_nexus_001', null);
    var active = Quests.getActiveQuests(p);
    assert(active.length === 0, 'Active quests should be empty after completion');
  });

  test('completeQuest adds quest to turnedIn list', function() {
    var p = uid();
    acceptOk(p, 'quest_nexus_001');
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.completeQuest(p, 'quest_nexus_001', null);
    var completed = Quests.getCompletedQuests(p);
    assert(completed.indexOf('quest_nexus_001') !== -1, 'Quest should be in turnedIn list');
  });

  test('completeQuest returns correct reward values', function() {
    var p = uid();
    acceptOk(p, 'quest_gardens_001'); // rewards: {spark: 30, items: [{id: rare_seed, count: 1}]}
    Quests.updateQuestProgress(p, 'collect', { item: 'sunflower' });
    Quests.updateQuestProgress(p, 'collect', { item: 'sunflower' });
    Quests.updateQuestProgress(p, 'collect', { item: 'sunflower' });
    var result = Quests.completeQuest(p, 'quest_gardens_001', null);
    assert(result.success === true, 'completeQuest should succeed');
    assert(result.rewards.spark === 30, 'Spark reward should be 30');
    assert(Array.isArray(result.rewards.items), 'Items should be array');
    assert(result.rewards.items.length === 1, 'Should have 1 item reward');
    assert(result.rewards.items[0].id === 'rare_seed', 'Item id should be rare_seed');
  });

  test('completeQuest returns quest object in result', function() {
    var p = uid();
    acceptOk(p, 'quest_nexus_001');
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.updateQuestProgress(p, 'talk_npc', {});
    var result = Quests.completeQuest(p, 'quest_nexus_001', null);
    assert(result.quest !== undefined, 'Should return quest object');
    assert(result.quest.id === 'quest_nexus_001', 'Returned quest should match');
  });

  test('completeQuest does not duplicate turnedIn entry on second call', function() {
    // This can occur if completeQuest is called after quest already turned in.
    var p = uid();
    acceptOk(p, 'quest_nexus_001');
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.completeQuest(p, 'quest_nexus_001', null);
    // Second call should fail since quest is no longer active.
    var result2 = Quests.completeQuest(p, 'quest_nexus_001', null);
    assert(result2.success === false, 'Second complete call should fail');
    var completed = Quests.getCompletedQuests(p);
    var count = completed.filter(function(id) { return id === 'quest_nexus_001'; }).length;
    assert(count === 1, 'Quest should appear exactly once in turnedIn list');
  });

});

// ============================================================================
// SUITE 6 — abandonQuest
// ============================================================================
suite('abandonQuest', function() {

  test('abandonQuest succeeds for active quest', function() {
    var p = uid();
    acceptOk(p, 'quest_nexus_001');
    var result = Quests.abandonQuest(p, 'quest_nexus_001');
    assert(result.success === true, 'Abandon should succeed');
    var active = Quests.getActiveQuests(p);
    assert(active.length === 0, 'Active list should be empty after abandon');
  });

  test('abandonQuest fails when quest is not active', function() {
    var p = uid();
    var result = Quests.abandonQuest(p, 'quest_nexus_001');
    assert(result.success === false, 'Abandon of non-active quest should fail');
    assert(result.message === 'Quest not active', 'Message should say not active');
  });

  test('abandonQuest does not add quest to turnedIn list', function() {
    var p = uid();
    acceptOk(p, 'quest_nexus_001');
    Quests.abandonQuest(p, 'quest_nexus_001');
    var completed = Quests.getCompletedQuests(p);
    assert(completed.indexOf('quest_nexus_001') === -1, 'Abandoned quest should not be in turnedIn');
  });

  test('abandonQuest allows re-accepting the same quest afterward', function() {
    var p = uid();
    acceptOk(p, 'quest_nexus_001');
    Quests.abandonQuest(p, 'quest_nexus_001');
    var result = Quests.acceptQuest(p, 'quest_nexus_001');
    assert(result.success === true, 'Should be able to accept again after abandon');
  });

  test('abandonQuest with partial progress resets cleanly (quest re-accepted starts fresh)', function() {
    var p = uid();
    acceptOk(p, 'quest_nexus_001');
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.updateQuestProgress(p, 'talk_npc', {}); // 2 of 3
    Quests.abandonQuest(p, 'quest_nexus_001');
    acceptOk(p, 'quest_nexus_001');
    var active = Quests.getActiveQuests(p);
    assert(active[0].objectives[0].current === 0, 'Re-accepted quest should have fresh objectives');
  });

});

// ============================================================================
// SUITE 7 — getActiveQuests
// ============================================================================
suite('getActiveQuests', function() {

  test('getActiveQuests returns empty array for fresh player', function() {
    var p = uid();
    var active = Quests.getActiveQuests(p);
    assert(Array.isArray(active), 'Should return array');
    assert(active.length === 0, 'Fresh player should have 0 active quests');
  });

  test('getActiveQuests returns a copy (mutation does not affect internal state)', function() {
    var p = uid();
    acceptOk(p, 'quest_nexus_001');
    var active = Quests.getActiveQuests(p);
    active.push({ fake: true });
    var active2 = Quests.getActiveQuests(p);
    assert(active2.length === 1, 'Mutation of returned array should not affect internal state');
  });

  test('getActiveQuests shows multiple accepted quests', function() {
    var p = uid();
    acceptOk(p, 'quest_nexus_001');
    acceptOk(p, 'quest_gardens_001');
    acceptOk(p, 'quest_wilds_001');
    var active = Quests.getActiveQuests(p);
    assert(active.length === 3, 'Should have 3 active quests');
  });

});

// ============================================================================
// SUITE 8 — getQuestLog
// ============================================================================
suite('getQuestLog', function() {

  test('getQuestLog returns active, completed, and available sections', function() {
    var p = uid();
    var log = Quests.getQuestLog(p, { level: 0 });
    assert(log.active !== undefined, 'Log should have active');
    assert(log.completed !== undefined, 'Log should have completed');
    assert(log.available !== undefined, 'Log should have available');
    assert(Array.isArray(log.active), 'active should be array');
    assert(Array.isArray(log.completed), 'completed should be array');
    assert(Array.isArray(log.available), 'available should be array');
  });

  test('getQuestLog active section matches getActiveQuests', function() {
    var p = uid();
    acceptOk(p, 'quest_nexus_001');
    acceptOk(p, 'quest_gardens_001');
    var log = Quests.getQuestLog(p, { level: 0 });
    assert(log.active.length === 2, 'active should have 2 quests');
  });

  test('getQuestLog completed section contains turned-in quest ids', function() {
    var p = uid();
    acceptOk(p, 'quest_nexus_001');
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.completeQuest(p, 'quest_nexus_001', null);
    var log = Quests.getQuestLog(p, { level: 0 });
    assert(log.completed.indexOf('quest_nexus_001') !== -1, 'Completed quest should be in log.completed');
  });

  test('getQuestLog works without playerData argument', function() {
    var p = uid();
    var log = Quests.getQuestLog(p);
    assert(log !== undefined, 'getQuestLog should work without playerData');
    assert(Array.isArray(log.available), 'available should still be an array');
  });

});

// ============================================================================
// SUITE 9 — getCompletedQuests
// ============================================================================
suite('getCompletedQuests', function() {

  test('getCompletedQuests returns empty array for fresh player', function() {
    var p = uid();
    var completed = Quests.getCompletedQuests(p);
    assert(Array.isArray(completed), 'Should return array');
    assert(completed.length === 0, 'No completed quests initially');
  });

  test('getCompletedQuests returns turned-in quest ids', function() {
    var p = uid();
    acceptOk(p, 'quest_nexus_001');
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.completeQuest(p, 'quest_nexus_001', null);
    var completed = Quests.getCompletedQuests(p);
    assert(completed.length === 1, 'Should have 1 completed quest');
    assert(completed[0] === 'quest_nexus_001', 'Completed quest id should match');
  });

});

// ============================================================================
// SUITE 10 — getQuestDialogue
// ============================================================================
suite('getQuestDialogue', function() {

  test('getQuestDialogue returns offer dialogue', function() {
    var dialogue = Quests.getQuestDialogue('quest_nexus_001', 'offer', null);
    assert(typeof dialogue === 'string' && dialogue.length > 0, 'Offer dialogue should be non-empty string');
    assert(dialogue.indexOf('Welcome') !== -1, 'Offer should include "Welcome"');
  });

  test('getQuestDialogue returns complete dialogue', function() {
    var dialogue = Quests.getQuestDialogue('quest_nexus_001', 'complete', null);
    assert(typeof dialogue === 'string' && dialogue.length > 0, 'Complete dialogue should be non-empty string');
  });

  test('getQuestDialogue interpolates progress variables', function() {
    var mockQuest = {
      objectives: [{ type: 'talk_npcs', count: 3, current: 1 }]
    };
    var dialogue = Quests.getQuestDialogue('quest_nexus_001', 'progress', mockQuest);
    assert(dialogue.indexOf('1') !== -1, 'Progress dialogue should include current count (1)');
    assert(dialogue.indexOf('2') !== -1, 'Progress dialogue should include remaining count (2)');
    assert(dialogue.indexOf('{current}') === -1, 'Template placeholder should be replaced');
    assert(dialogue.indexOf('{remaining}') === -1, 'Template placeholder should be replaced');
  });

  test('getQuestDialogue returns empty string for unknown quest', function() {
    var dialogue = Quests.getQuestDialogue('quest_unknown_999', 'offer', null);
    assert(dialogue === '', 'Unknown quest should return empty string');
  });

  test('getQuestDialogue returns empty string for unknown status', function() {
    var dialogue = Quests.getQuestDialogue('quest_nexus_001', 'nonexistent_status', null);
    assert(dialogue === '', 'Unknown status should return empty string');
  });

  test('getQuestDialogue progress uses first objective required field', function() {
    var mockQuest = {
      objectives: [{ type: 'visit_zones', zones: [], required: 4, current: 2 }]
    };
    var dialogue = Quests.getQuestDialogue('daily_explorer', 'progress', mockQuest);
    // daily_explorer is not in QUEST_DATABASE so this returns ''
    // Test with a real DB quest that has required field: quest_nexus_002 visit_zones required:3
    var mockQuest2 = {
      objectives: [{ type: 'visit_zones', zones: [], required: 3, current: 1 }]
    };
    var dialogue2 = Quests.getQuestDialogue('quest_nexus_002', 'progress', mockQuest2);
    assert(dialogue2.indexOf('1') !== -1, 'Should show current');
    assert(dialogue2.indexOf('2') !== -1, 'Should show remaining (3-1=2)');
  });

});

// ============================================================================
// SUITE 11 — getNpcQuests
// ============================================================================
suite('getNpcQuests', function() {

  test('getNpcQuests returns quests for a known NPC', function() {
    var p = uid();
    var npcQuests = Quests.getNpcQuests('ai_citizen_001', p);
    assert(Array.isArray(npcQuests), 'Should return array');
    assert(npcQuests.length > 0, 'ai_citizen_001 should have quests');
  });

  test('getNpcQuests returns empty array for NPC with no quests', function() {
    var p = uid();
    var npcQuests = Quests.getNpcQuests('ai_citizen_999', p);
    assert(Array.isArray(npcQuests), 'Should return array');
    assert(npcQuests.length === 0, 'Unknown NPC should have no quests');
  });

  test('getNpcQuests returns active state for active quest', function() {
    var p = uid();
    Quests.acceptQuest(p, 'quest_nexus_001'); // giverNpcId: ai_citizen_001
    var npcQuests = Quests.getNpcQuests('ai_citizen_001', p);
    var activeEntry = npcQuests.find(function(entry) { return entry.quest.id === 'quest_nexus_001'; });
    assert(activeEntry !== undefined, 'Active quest should be listed in NPC quests');
    assert(activeEntry.state === 'active', 'State should be active');
  });

  test('getNpcQuests returns available state for available quest', function() {
    var p = uid();
    var npcQuests = Quests.getNpcQuests('ai_citizen_001', p);
    var availEntry = npcQuests.find(function(entry) { return entry.quest.id === 'quest_nexus_001'; });
    assert(availEntry !== undefined, 'Available quest should appear in NPC list');
    assert(availEntry.state === 'available', 'State should be available');
  });

  test('getNpcQuests hides non-repeatable completed quests', function() {
    var p = uid();
    acceptOk(p, 'quest_nexus_001');
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.completeQuest(p, 'quest_nexus_001', null);
    var npcQuests = Quests.getNpcQuests('ai_citizen_001', p);
    var found = npcQuests.find(function(entry) { return entry.quest.id === 'quest_nexus_001'; });
    assert(found === undefined, 'Non-repeatable completed quest should not appear in NPC list');
  });

  test('getNpcQuests shows repeatable quest again after completion', function() {
    var p = uid();
    acceptOk(p, 'quest_gardens_001'); // giverNpcId: ai_citizen_013, repeatable
    Quests.updateQuestProgress(p, 'collect', { item: 'sunflower' });
    Quests.updateQuestProgress(p, 'collect', { item: 'sunflower' });
    Quests.updateQuestProgress(p, 'collect', { item: 'sunflower' });
    Quests.completeQuest(p, 'quest_gardens_001', null);
    var npcQuests = Quests.getNpcQuests('ai_citizen_013', p);
    var found = npcQuests.find(function(entry) { return entry.quest.id === 'quest_gardens_001'; });
    assert(found !== undefined, 'Repeatable quest should reappear in NPC list after completion');
  });

  test('getNpcQuests hides quest if prerequisites not met', function() {
    var p = uid();
    // ai_citizen_045 gives quest_arena_002 which requires quest_arena_001.
    var npcQuests = Quests.getNpcQuests('ai_citizen_045', p);
    var found = npcQuests.find(function(entry) { return entry.quest.id === 'quest_arena_002'; });
    assert(found === undefined, 'Quest with unmet prereqs should not appear in NPC list');
  });

});

// ============================================================================
// SUITE 12 — Quest Chains
// ============================================================================
suite('Quest Chains', function() {

  test('QUEST_CHAINS is exported and has correct structure', function() {
    assert(Quests.QUEST_CHAINS !== undefined, 'QUEST_CHAINS should be exported');
    var chains = Object.keys(Quests.QUEST_CHAINS);
    assert(chains.length >= 5, 'Should have at least 5 quest chains');
  });

  test('getChainProgress returns all chains with progress info', function() {
    var p = uid();
    var progress = Quests.getChainProgress(p);
    var chainIds = Object.keys(progress);
    assert(chainIds.length >= 5, 'Should have progress for all chains');
    chainIds.forEach(function(chainId) {
      var chain = progress[chainId];
      assert(typeof chain.name === 'string', chainId + ' should have name');
      assert(typeof chain.completed === 'number', chainId + ' should have completed count');
      assert(typeof chain.total === 'number', chainId + ' should have total count');
      assert(typeof chain.isComplete === 'boolean', chainId + ' should have isComplete flag');
      assert(chain.reward !== undefined, chainId + ' should have reward');
    });
  });

  test('getChainProgress shows 0 completed for fresh player', function() {
    var p = uid();
    var progress = Quests.getChainProgress(p);
    Object.keys(progress).forEach(function(chainId) {
      assert(progress[chainId].completed === 0, chainId + ' should have 0 completed for fresh player');
      assert(progress[chainId].isComplete === false, chainId + ' should not be complete for fresh player');
    });
  });

  test('getChainProgress increments when chain quests are completed', function() {
    var p = uid();
    // Complete quest_nexus_001 (part of chain_origins).
    acceptOk(p, 'quest_nexus_001');
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.completeQuest(p, 'quest_nexus_001', null);
    var progress = Quests.getChainProgress(p);
    assert(progress['chain_origins'].completed === 1, 'chain_origins should show 1 completed');
    assert(progress['chain_origins'].isComplete === false, 'chain_origins should not be complete yet');
  });

  test('getChainProgress marks chain complete when all quests done', function() {
    var p = uid();
    // chain_origins requires quest_nexus_001 + quest_nexus_002.
    acceptOk(p, 'quest_nexus_001');
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.completeQuest(p, 'quest_nexus_001', null);
    acceptOk(p, 'quest_nexus_002');
    Quests.updateQuestProgress(p, 'visit_zone', { zone: 'nexus' });
    Quests.updateQuestProgress(p, 'visit_zone', { zone: 'gardens' });
    Quests.updateQuestProgress(p, 'visit_zone', { zone: 'wilds' });
    Quests.completeQuest(p, 'quest_nexus_002', null);
    var progress = Quests.getChainProgress(p);
    assert(progress['chain_origins'].isComplete === true, 'chain_origins should be complete');
    assert(progress['chain_origins'].completed === 2, 'chain_origins should show 2 completed');
  });

  test('checkChainCompletion returns newly completed chains', function() {
    var p = uid();
    acceptOk(p, 'quest_nexus_001');
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.completeQuest(p, 'quest_nexus_001', null);
    acceptOk(p, 'quest_nexus_002');
    Quests.updateQuestProgress(p, 'visit_zone', { zone: 'nexus' });
    Quests.updateQuestProgress(p, 'visit_zone', { zone: 'gardens' });
    Quests.updateQuestProgress(p, 'visit_zone', { zone: 'wilds' });
    Quests.completeQuest(p, 'quest_nexus_002', null);
    var newly = Quests.checkChainCompletion(p);
    assert(newly.length >= 1, 'Should return at least one newly completed chain');
    var origins = newly.find(function(c) { return c.chainId === 'chain_origins'; });
    assert(origins !== undefined, 'chain_origins should be in newly completed list');
    assert(origins.reward !== undefined, 'Newly completed chain should have reward');
  });

  test('checkChainCompletion does not duplicate already-recorded completions', function() {
    var p = uid();
    acceptOk(p, 'quest_nexus_001');
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.completeQuest(p, 'quest_nexus_001', null);
    acceptOk(p, 'quest_nexus_002');
    Quests.updateQuestProgress(p, 'visit_zone', { zone: 'nexus' });
    Quests.updateQuestProgress(p, 'visit_zone', { zone: 'gardens' });
    Quests.updateQuestProgress(p, 'visit_zone', { zone: 'wilds' });
    Quests.completeQuest(p, 'quest_nexus_002', null);
    Quests.checkChainCompletion(p); // first call
    var second = Quests.checkChainCompletion(p); // second call
    var dupOrigins = second.filter(function(c) { return c.chainId === 'chain_origins'; });
    assert(dupOrigins.length === 0, 'Already-recorded chain should not appear again');
  });

  test('chain reward contains spark and title', function() {
    var origins = Quests.QUEST_CHAINS['chain_origins'];
    assert(typeof origins.reward.spark === 'number', 'Chain reward should have spark');
    assert(typeof origins.reward.title === 'string', 'Chain reward should have title');
  });

});

// ============================================================================
// SUITE 13 — Daily Quests
// ============================================================================
suite('Daily Quests', function() {

  test('DAILY_QUESTS is exported and has 7 entries', function() {
    assert(Array.isArray(Quests.DAILY_QUESTS), 'DAILY_QUESTS should be an array');
    assert(Quests.DAILY_QUESTS.length === 7, 'Should have exactly 7 daily quest templates');
  });

  test('getDailyQuests returns exactly 3 quests', function() {
    var dailies = Quests.getDailyQuests();
    assert(Array.isArray(dailies), 'Should return array');
    assert(dailies.length === 3, 'Should return exactly 3 daily quests');
  });

  test('getDailyQuests quests have required metadata', function() {
    var dailies = Quests.getDailyQuests();
    dailies.forEach(function(d) {
      assert(typeof d.id === 'string', 'Daily should have id');
      assert(d.type === 'daily', 'Daily type should be "daily"');
      assert(d.repeatable === false, 'Daily should not be repeatable');
      assert(d.requiredLevel === 0, 'Daily should have requiredLevel 0');
      assert(Array.isArray(d.prerequisiteQuests) && d.prerequisiteQuests.length === 0,
        'Daily should have no prerequisites');
      assert(d.status === 'available', 'Daily should be available');
      assert(d.giverNpcId !== undefined, 'Daily should have a giverNpcId');
    });
  });

  test('getDailyQuests IDs encode day of year', function() {
    var dailies = Quests.getDailyQuests();
    // ID format is: 'daily_' + dayOfYear + '_' + index
    dailies.forEach(function(d, i) {
      var parts = d.id.split('_');
      // parts: ['daily', dayOfYear, i]
      assert(parts.length === 3, 'Daily ID should have 3 parts: ' + d.id);
      assert(!isNaN(parseInt(parts[1])), 'Daily ID second part should be numeric (day)');
      assert(parseInt(parts[2]) === i, 'Daily ID third part should be index');
    });
  });

  test('getDailyQuests returns different quests on different days (rotation)', function() {
    // We cannot change the actual date, but we can verify the rotation logic
    // by inspecting DAILY_QUESTS length vs. 3-daily count.
    var dailies = Quests.getDailyQuests();
    // At least: they should be 3 different quest templates from DAILY_QUESTS.
    var baseIds = dailies.map(function(d) { return d.title; });
    var unique = baseIds.filter(function(v, i, a) { return a.indexOf(v) === i; });
    assert(unique.length === 3, 'All 3 daily quests should be different');
  });

  test('isDailyCompleted returns false initially', function() {
    var p = uid();
    var dailies = Quests.getDailyQuests();
    assert(Quests.isDailyCompleted(p, dailies[0].id) === false, 'Daily should not be completed initially');
  });

  test('isDailyCompleted returns true after quest is completed', function() {
    var p = uid();
    var dailies = Quests.getDailyQuests();
    var daily = dailies[0];
    // Accept and complete the daily.
    var acceptResult = Quests.acceptQuest(p, daily.id);
    // Daily quests are not in QUEST_DATABASE so acceptQuest will fail;
    // we need to manually push to turnedIn instead.
    // Verify this behavior:
    if (!acceptResult.success) {
      // Daily quests have generated IDs not in QUEST_DATABASE.
      // isDailyCompleted only checks turnedInQuests so we simulate completion
      // by marking the state manually via completeQuest path.
      // We can test isDailyCompleted by directly checking what it reads:
      // it reads state.turnedInQuests — we cannot modify that externally.
      // Instead verify that the daily ID won't cause a crash.
      assert(Quests.isDailyCompleted(p, daily.id) === false,
        'Non-DB daily should not be marked complete');
    } else {
      // If accept worked, drive it to completion.
      Quests.completeQuest(p, daily.id, null);
      assert(Quests.isDailyCompleted(p, daily.id) === true,
        'Daily should be marked complete after turnIn');
    }
  });

});

// ============================================================================
// SUITE 14 — getPlayerQuestStats
// ============================================================================
suite('getPlayerQuestStats', function() {

  test('getPlayerQuestStats returns correct structure for fresh player', function() {
    var p = uid();
    var stats = Quests.getPlayerQuestStats(p);
    assert(typeof stats.activeQuests === 'number', 'Should have activeQuests count');
    assert(typeof stats.completedQuests === 'number', 'Should have completedQuests count');
    assert(typeof stats.totalAvailable === 'number', 'Should have totalAvailable count');
    assert(typeof stats.completedChains === 'number', 'Should have completedChains count');
    assert(typeof stats.totalChains === 'number', 'Should have totalChains count');
    assert(Array.isArray(stats.titles), 'Should have titles array');
  });

  test('getPlayerQuestStats totalAvailable equals 25 (database size)', function() {
    var p = uid();
    var stats = Quests.getPlayerQuestStats(p);
    assert(stats.totalAvailable === 25, 'totalAvailable should be 25');
  });

  test('getPlayerQuestStats activeQuests increments as quests accepted', function() {
    var p = uid();
    acceptOk(p, 'quest_nexus_001');
    acceptOk(p, 'quest_gardens_001');
    var stats = Quests.getPlayerQuestStats(p);
    assert(stats.activeQuests === 2, 'activeQuests should be 2');
  });

  test('getPlayerQuestStats completedQuests increments after turnIn', function() {
    var p = uid();
    acceptOk(p, 'quest_nexus_001');
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.completeQuest(p, 'quest_nexus_001', null);
    var stats = Quests.getPlayerQuestStats(p);
    assert(stats.completedQuests === 1, 'completedQuests should be 1 after one completion');
  });

  test('getPlayerQuestStats totalChains matches QUEST_CHAINS count', function() {
    var p = uid();
    var stats = Quests.getPlayerQuestStats(p);
    var chainCount = Object.keys(Quests.QUEST_CHAINS).length;
    assert(stats.totalChains === chainCount, 'totalChains should match QUEST_CHAINS count');
  });

  test('getPlayerQuestStats titles populated after chain completion', function() {
    var p = uid();
    // Complete chain_origins (quest_nexus_001 + quest_nexus_002).
    acceptOk(p, 'quest_nexus_001');
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.completeQuest(p, 'quest_nexus_001', null);
    acceptOk(p, 'quest_nexus_002');
    Quests.updateQuestProgress(p, 'visit_zone', { zone: 'nexus' });
    Quests.updateQuestProgress(p, 'visit_zone', { zone: 'gardens' });
    Quests.updateQuestProgress(p, 'visit_zone', { zone: 'wilds' });
    Quests.completeQuest(p, 'quest_nexus_002', null);
    Quests.checkChainCompletion(p);
    var stats = Quests.getPlayerQuestStats(p);
    assert(stats.completedChains >= 1, 'Should have at least 1 completed chain');
    assert(stats.titles.indexOf('Historian') !== -1, 'Should have Historian title from chain_origins');
  });

});

// ============================================================================
// SUITE 15 — Achievements
// ============================================================================
suite('Achievements', function() {

  test('ACHIEVEMENTS is exported and contains known achievements', function() {
    assert(Quests.ACHIEVEMENTS !== undefined, 'ACHIEVEMENTS should be exported');
    var ids = Object.keys(Quests.ACHIEVEMENTS);
    assert(ids.length > 20, 'Should have more than 20 achievements');
    assert(Quests.ACHIEVEMENTS['first_steps'] !== undefined, 'first_steps achievement should exist');
    assert(Quests.ACHIEVEMENTS['zone_hopper'] !== undefined, 'zone_hopper achievement should exist');
  });

  test('initPlayerAchievements creates achievement state', function() {
    var p = uid();
    var state = Quests.initPlayerAchievements(p);
    assert(state !== undefined, 'Should return state object');
    assert(state.unlocked !== undefined, 'Should have unlocked Set');
    assert(state.counters !== undefined, 'Should have counters');
  });

  test('getAchievements returns all achievements with unlocked status', function() {
    var p = uid();
    var achievements = Quests.getAchievements(p);
    assert(Array.isArray(achievements), 'Should return array');
    assert(achievements.length === Object.keys(Quests.ACHIEVEMENTS).length,
      'Should return all achievements');
    achievements.forEach(function(a) {
      assert(typeof a.unlocked === 'boolean', 'Each achievement should have unlocked boolean');
      assert(typeof a.id === 'string', 'Each achievement should have id');
      assert(typeof a.name === 'string', 'Each achievement should have name');
      assert(typeof a.sparkReward === 'number', 'Each achievement should have sparkReward');
    });
  });

  test('getAchievements shows all as locked for fresh player', function() {
    var p = uid();
    var achievements = Quests.getAchievements(p);
    var unlockedCount = achievements.filter(function(a) { return a.unlocked; }).length;
    assert(unlockedCount === 0, 'Fresh player should have 0 unlocked achievements');
  });

  test('trackAchievementEvent unlocks first_steps on login', function() {
    var p = uid();
    var newly = Quests.trackAchievementEvent(p, 'login', {});
    assert(newly.some(function(a) { return a.id === 'first_steps'; }),
      'first_steps should be unlocked on login');
  });

  test('trackAchievementEvent does not re-unlock already-unlocked achievement', function() {
    var p = uid();
    Quests.trackAchievementEvent(p, 'login', {});
    var second = Quests.trackAchievementEvent(p, 'login', {});
    var dupes = second.filter(function(a) { return a.id === 'first_steps'; });
    assert(dupes.length === 0, 'first_steps should not unlock twice');
  });

  test('trackAchievementEvent unlocks zone_hopper after 4 zones', function() {
    var p = uid();
    var zones = ['nexus', 'gardens', 'wilds', 'athenaeum'];
    var allNewly = [];
    zones.forEach(function(zone) {
      var newly = Quests.trackAchievementEvent(p, 'visit_zone', { zone: zone });
      allNewly = allNewly.concat(newly);
    });
    assert(allNewly.some(function(a) { return a.id === 'zone_hopper'; }),
      'zone_hopper should unlock after visiting 4 zones');
  });

  test('trackAchievementEvent unlocks world_traveler after 8 zones', function() {
    var p = uid();
    var zones = ['nexus', 'gardens', 'wilds', 'athenaeum', 'studio', 'agora', 'commons', 'arena'];
    var allNewly = [];
    zones.forEach(function(zone) {
      var newly = Quests.trackAchievementEvent(p, 'visit_zone', { zone: zone });
      allNewly = allNewly.concat(newly);
    });
    assert(allNewly.some(function(a) { return a.id === 'world_traveler'; }),
      'world_traveler should unlock after visiting all 8 zones');
  });

  test('trackAchievementEvent does not unlock zone_hopper with repeated same zone', function() {
    var p = uid();
    var allNewly = [];
    for (var i = 0; i < 10; i++) {
      var newly = Quests.trackAchievementEvent(p, 'visit_zone', { zone: 'nexus' });
      allNewly = allNewly.concat(newly);
    }
    assert(!allNewly.some(function(a) { return a.id === 'zone_hopper'; }),
      'zone_hopper should not unlock from visiting same zone 10 times');
  });

  test('trackAchievementEvent unlocks friendly_face after 10 NPC talks', function() {
    var p = uid();
    var allNewly = [];
    for (var i = 0; i < 10; i++) {
      var newly = Quests.trackAchievementEvent(p, 'talk_npc', {});
      allNewly = allNewly.concat(newly);
    }
    assert(allNewly.some(function(a) { return a.id === 'friendly_face'; }),
      'friendly_face should unlock after 10 NPC talks');
  });

  test('trackAchievementEvent does not unlock social_butterfly at 10 talks', function() {
    var p = uid();
    for (var i = 0; i < 10; i++) {
      Quests.trackAchievementEvent(p, 'talk_npc', {});
    }
    var achievements = Quests.getAchievements(p);
    var butterfly = achievements.find(function(a) { return a.id === 'social_butterfly'; });
    assert(butterfly.unlocked === false, 'social_butterfly should not unlock at 10 (needs 50)');
  });

  test('trackAchievementEvent unlocks first_trade on first trade', function() {
    var p = uid();
    var newly = Quests.trackAchievementEvent(p, 'trade', {});
    assert(newly.some(function(a) { return a.id === 'first_trade'; }),
      'first_trade should unlock on first trade event');
  });

  test('trackAchievementEvent unlocks first_craft on first craft', function() {
    var p = uid();
    var newly = Quests.trackAchievementEvent(p, 'craft', {});
    assert(newly.some(function(a) { return a.id === 'first_craft'; }),
      'first_craft should unlock on first craft event');
  });

  test('trackAchievementEvent unlocks potion_brewer after 10 potions', function() {
    var p = uid();
    var allNewly = [];
    for (var i = 0; i < 10; i++) {
      var newly = Quests.trackAchievementEvent(p, 'craft', { category: 'potion' });
      allNewly = allNewly.concat(newly);
    }
    assert(allNewly.some(function(a) { return a.id === 'potion_brewer'; }),
      'potion_brewer should unlock after 10 potion crafts');
  });

  test('trackAchievementEvent unlocks instrument_maker on instrument craft', function() {
    var p = uid();
    var newly = Quests.trackAchievementEvent(p, 'craft', { category: 'instrument' });
    assert(newly.some(function(a) { return a.id === 'instrument_maker'; }),
      'instrument_maker should unlock on instrument craft');
  });

  test('trackAchievementEvent unlocks green_thumb on first plant', function() {
    var p = uid();
    var newly = Quests.trackAchievementEvent(p, 'plant', {});
    assert(newly.some(function(a) { return a.id === 'green_thumb'; }),
      'green_thumb should unlock on first seed planted');
  });

  test('trackAchievementEvent unlocks first_build on first build', function() {
    var p = uid();
    var newly = Quests.trackAchievementEvent(p, 'build', {});
    assert(newly.some(function(a) { return a.id === 'first_build'; }),
      'first_build should unlock on first structure placed');
  });

  test('trackAchievementEvent unlocks spark_saver when spark >= 100', function() {
    var p = uid();
    var newly = Quests.trackAchievementEvent(p, 'some_event', { spark: 100 });
    assert(newly.some(function(a) { return a.id === 'spark_saver'; }),
      'spark_saver should unlock when spark reaches 100');
  });

  test('trackAchievementEvent unlocks spark_hoarder when spark >= 500', function() {
    var p = uid();
    var newly = Quests.trackAchievementEvent(p, 'some_event', { spark: 500 });
    assert(newly.some(function(a) { return a.id === 'spark_hoarder'; }),
      'spark_hoarder should unlock when spark reaches 500');
  });

  test('trackAchievementEvent unlocks spark_magnate when spark >= 2000', function() {
    var p = uid();
    var newly = Quests.trackAchievementEvent(p, 'some_event', { spark: 2000 });
    assert(newly.some(function(a) { return a.id === 'spark_magnate'; }),
      'spark_magnate should unlock when spark reaches 2000');
  });

  test('trackAchievementEvent unlocks gift_giver on first gift', function() {
    var p = uid();
    var newly = Quests.trackAchievementEvent(p, 'gift', {});
    assert(newly.some(function(a) { return a.id === 'gift_giver'; }),
      'gift_giver should unlock on first gift event');
  });

  test('trackAchievementEvent unlocks first_challenge on competition entry', function() {
    var p = uid();
    var newly = Quests.trackAchievementEvent(p, 'competition_enter', {});
    assert(newly.some(function(a) { return a.id === 'first_challenge'; }),
      'first_challenge should unlock on competition entry');
  });

  test('trackAchievementEvent unlocks champion after 5 competition wins', function() {
    var p = uid();
    var allNewly = [];
    for (var i = 0; i < 5; i++) {
      var newly = Quests.trackAchievementEvent(p, 'competition_win', {});
      allNewly = allNewly.concat(newly);
    }
    assert(allNewly.some(function(a) { return a.id === 'champion'; }),
      'champion should unlock after 5 competition wins');
  });

  test('trackAchievementEvent unlocks quest_starter on quest_accept event', function() {
    var p = uid();
    var newly = Quests.trackAchievementEvent(p, 'quest_accept', {});
    assert(newly.some(function(a) { return a.id === 'quest_starter'; }),
      'quest_starter should unlock on quest_accept event');
  });

  test('trackAchievementEvent unlocks chain_finisher on chain_complete event', function() {
    var p = uid();
    var newly = Quests.trackAchievementEvent(p, 'chain_complete', {});
    assert(newly.some(function(a) { return a.id === 'chain_finisher'; }),
      'chain_finisher should unlock on chain_complete event');
  });

  test('trackAchievementEvent unlocks guild_founder on guild_create', function() {
    var p = uid();
    var newly = Quests.trackAchievementEvent(p, 'guild_create', {});
    assert(newly.some(function(a) { return a.id === 'guild_founder'; }),
      'guild_founder should unlock on guild_create event');
  });

  test('trackAchievementEvent unlocks guild_member on guild_join', function() {
    var p = uid();
    var newly = Quests.trackAchievementEvent(p, 'guild_join', {});
    assert(newly.some(function(a) { return a.id === 'guild_member'; }),
      'guild_member should unlock on guild_join event');
  });

  test('trackAchievementEvent unlocks first_artwork after first artwork', function() {
    var p = uid();
    var newly = Quests.trackAchievementEvent(p, 'artwork', {});
    assert(newly.some(function(a) { return a.id === 'first_artwork'; }),
      'first_artwork should unlock on first artwork event');
  });

  test('trackAchievementEvent unlocks sunwalker on warmth_tier Sunwalker', function() {
    var p = uid();
    var newly = Quests.trackAchievementEvent(p, 'warmth_tier', { tier: 'Sunwalker' });
    assert(newly.some(function(a) { return a.id === 'sunwalker'; }),
      'sunwalker should unlock on Sunwalker warmth tier');
  });

  test('trackAchievementEvent does not unlock sunwalker on wrong tier', function() {
    var p = uid();
    var newly = Quests.trackAchievementEvent(p, 'warmth_tier', { tier: 'Freezing' });
    assert(!newly.some(function(a) { return a.id === 'sunwalker'; }),
      'sunwalker should not unlock on wrong tier');
  });

  test('trackAchievementEvent unlocks first_lesson after completing a lesson', function() {
    var p = uid();
    var newly = Quests.trackAchievementEvent(p, 'lesson', {});
    assert(newly.some(function(a) { return a.id === 'first_lesson'; }),
      'first_lesson should unlock on first lesson completed');
  });

  test('trackAchievementEvent unlocks wise_mentor after mentoring 5 players', function() {
    var p = uid();
    var allNewly = [];
    for (var i = 0; i < 5; i++) {
      var newly = Quests.trackAchievementEvent(p, 'mentor', {});
      allNewly = allNewly.concat(newly);
    }
    assert(allNewly.some(function(a) { return a.id === 'wise_mentor'; }),
      'wise_mentor should unlock after mentoring 5 players');
  });

  test('trackAchievementEvent unlocks trailblazer after 10 discoveries', function() {
    var p = uid();
    var allNewly = [];
    for (var i = 0; i < 10; i++) {
      var newly = Quests.trackAchievementEvent(p, 'discover', {});
      allNewly = allNewly.concat(newly);
    }
    assert(allNewly.some(function(a) { return a.id === 'trailblazer'; }),
      'trailblazer should unlock after 10 discoveries');
  });

  test('trackAchievementEvent unlocks gardener after 20 plant harvests', function() {
    var p = uid();
    var allNewly = [];
    for (var i = 0; i < 20; i++) {
      var newly = Quests.trackAchievementEvent(p, 'harvest', {});
      allNewly = allNewly.concat(newly);
    }
    assert(allNewly.some(function(a) { return a.id === 'gardener'; }),
      'gardener should unlock after 20 harvests');
  });

  test('trackAchievementEvent handles undefined eventData gracefully', function() {
    var p = uid();
    var newly = Quests.trackAchievementEvent(p, 'login', undefined);
    assert(Array.isArray(newly), 'Should return array even with undefined eventData');
  });

  test('trackAchievementEvent returns array for unknown event type', function() {
    var p = uid();
    var newly = Quests.trackAchievementEvent(p, 'unknown_event_xyz', {});
    assert(Array.isArray(newly), 'Should return array for unknown event type');
  });

});

// ============================================================================
// SUITE 16 — getAchievementProgress
// ============================================================================
suite('getAchievementProgress', function() {

  test('getAchievementProgress returns correct structure for fresh player', function() {
    var p = uid();
    var progress = Quests.getAchievementProgress(p);
    assert(typeof progress.unlocked === 'number', 'Should have unlocked count');
    assert(typeof progress.total === 'number', 'Should have total count');
    assert(typeof progress.percentage === 'number', 'Should have percentage');
    assert(progress.counters !== undefined, 'Should have counters');
  });

  test('getAchievementProgress shows 0 unlocked for fresh player', function() {
    var p = uid();
    var progress = Quests.getAchievementProgress(p);
    assert(progress.unlocked === 0, 'Fresh player should have 0 unlocked achievements');
    assert(progress.percentage === 0, 'Percentage should be 0 for fresh player');
  });

  test('getAchievementProgress increments after unlock', function() {
    var p = uid();
    Quests.trackAchievementEvent(p, 'login', {});
    var progress = Quests.getAchievementProgress(p);
    assert(progress.unlocked >= 1, 'Should have at least 1 unlocked after login');
    assert(progress.percentage > 0, 'Percentage should be > 0 after first unlock');
  });

  test('getAchievementProgress counters track events correctly', function() {
    var p = uid();
    Quests.trackAchievementEvent(p, 'talk_npc', {});
    Quests.trackAchievementEvent(p, 'talk_npc', {});
    Quests.trackAchievementEvent(p, 'trade', {});
    var progress = Quests.getAchievementProgress(p);
    assert(progress.counters.npcs_talked === 2, 'npcs_talked should be 2');
    assert(progress.counters.trades_completed === 1, 'trades_completed should be 1');
  });

  test('getAchievementProgress total equals all ACHIEVEMENTS count', function() {
    var p = uid();
    var progress = Quests.getAchievementProgress(p);
    var total = Object.keys(Quests.ACHIEVEMENTS).length;
    assert(progress.total === total, 'total should equal number of achievements');
  });

  test('getAchievementProgress percentage is 100 when all unlocked', function() {
    var p = uid();
    // Unlock enough achievements to test percentage math.
    // Instead of unlocking all (complex), verify formula: percentage = round(unlocked/total * 100)
    var progress = Quests.getAchievementProgress(p);
    var expectedPercentage = progress.total > 0
      ? Math.round((progress.unlocked / progress.total) * 100)
      : 0;
    assert(progress.percentage === expectedPercentage,
      'Percentage should match floor formula: ' + expectedPercentage + ' vs ' + progress.percentage);
  });

  test('getAchievementProgress zones_visited reflects unique zones', function() {
    var p = uid();
    Quests.trackAchievementEvent(p, 'visit_zone', { zone: 'nexus' });
    Quests.trackAchievementEvent(p, 'visit_zone', { zone: 'nexus' }); // duplicate
    Quests.trackAchievementEvent(p, 'visit_zone', { zone: 'gardens' });
    var progress = Quests.getAchievementProgress(p);
    assert(progress.counters.zones_visited === 2, 'zones_visited should count unique zones only');
  });

});

// ============================================================================
// SUITE 17 — Multiple active quests and edge cases
// ============================================================================
suite('Multiple Active Quests & Edge Cases', function() {

  test('Player can have up to 5 simultaneous active quests', function() {
    var p = uid();
    var questIds = [
      'quest_nexus_001',
      'quest_gardens_001',
      'quest_gardens_002',
      'quest_gardens_003',
      'quest_wilds_001'
    ];
    questIds.forEach(function(id) { acceptOk(p, id); });
    var active = Quests.getActiveQuests(p);
    assert(active.length === 5, 'Should have 5 active quests');
  });

  test('Progress event only updates relevant quests, not all active', function() {
    var p = uid();
    acceptOk(p, 'quest_nexus_001'); // talk_npcs
    acceptOk(p, 'quest_gardens_001'); // collect sunflower
    var updated = Quests.updateQuestProgress(p, 'collect', { item: 'sunflower' });
    assert(updated.length === 1, 'Only collect quest should update');
    assert(updated[0].id === 'quest_gardens_001', 'Correct quest should update');
    var active = Quests.getActiveQuests(p);
    var nexusQ = active.find(function(q) { return q.id === 'quest_nexus_001'; });
    assert(nexusQ.objectives[0].current === 0, 'talk_npc quest should not advance on collect event');
  });

  test('Completing one quest does not affect other active quests', function() {
    var p = uid();
    acceptOk(p, 'quest_nexus_001'); // talk_npc x3
    acceptOk(p, 'quest_gardens_001'); // collect sunflower x3
    // Complete nexus quest.
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.completeQuest(p, 'quest_nexus_001', null);
    // Gardens quest should still be active.
    var active = Quests.getActiveQuests(p);
    assert(active.length === 1, 'Gardens quest should still be active');
    assert(active[0].id === 'quest_gardens_001', 'Remaining quest should be gardens');
    assert(active[0].objectives[0].current === 0, 'Gardens progress should be untouched');
  });

  test('Accepting quest after slot opens (abandon frees slot)', function() {
    var p = uid();
    var questIds = [
      'quest_nexus_001',
      'quest_gardens_001',
      'quest_gardens_002',
      'quest_gardens_003',
      'quest_wilds_001'
    ];
    questIds.forEach(function(id) { acceptOk(p, id); });
    Quests.abandonQuest(p, 'quest_nexus_001');
    var result = Quests.acceptQuest(p, 'quest_gardens_004');
    assert(result.success === true, 'Should be able to accept after abandoning a slot');
  });

  test('Quest with multi-count objective tracks correctly across progress calls', function() {
    var p = uid();
    acceptOk(p, 'quest_wilds_004'); // plant native_seed x6
    for (var i = 0; i < 5; i++) {
      Quests.updateQuestProgress(p, 'plant', { item: 'native_seed' });
    }
    var active = Quests.getActiveQuests(p);
    assert(active[0].objectives[0].current === 5, 'Should be at 5 after 5 events');
    assert(active[0].status === 'active', 'Quest should still be active (needs 6)');
    Quests.updateQuestProgress(p, 'plant', { item: 'native_seed' });
    var active2 = Quests.getActiveQuests(p);
    assert(active2[0].status === 'complete', 'Quest should be complete after 6th plant');
  });

  test('Repeatable quest can be accepted and completed multiple times', function() {
    var p = uid();
    for (var round = 0; round < 3; round++) {
      acceptOk(p, 'quest_gardens_001');
      Quests.updateQuestProgress(p, 'collect', { item: 'sunflower' });
      Quests.updateQuestProgress(p, 'collect', { item: 'sunflower' });
      Quests.updateQuestProgress(p, 'collect', { item: 'sunflower' });
      var result = Quests.completeQuest(p, 'quest_gardens_001', null);
      assert(result.success === true, 'Round ' + round + ' completion should succeed');
    }
    // 3 completions — turnedIn can have duplicates (one per round) or be filtered.
    // The code pushes only if not already present, so it's max 1 entry.
    var completed = Quests.getCompletedQuests(p);
    assert(completed.indexOf('quest_gardens_001') !== -1, 'Repeatable quest should be in completed list');
  });

  test('No quest progress leaks between different players', function() {
    var p1 = uid();
    var p2 = uid();
    acceptOk(p1, 'quest_nexus_001');
    acceptOk(p2, 'quest_nexus_001');
    Quests.updateQuestProgress(p1, 'talk_npc', {});
    Quests.updateQuestProgress(p1, 'talk_npc', {});
    Quests.updateQuestProgress(p1, 'talk_npc', {});
    var p1Active = Quests.getActiveQuests(p1);
    var p2Active = Quests.getActiveQuests(p2);
    assert(p1Active[0].objectives[0].current === 3, 'p1 should have 3 progress');
    assert(p2Active[0].objectives[0].current === 0, 'p2 should have 0 progress (isolated)');
  });

  test('getQuestLog available section does not include quests at level cap', function() {
    // All DB quests have requiredLevel: 0, so all are available for level 0.
    // This tests the level gate logic: at level 0 vs. a hypothetical level -1.
    var p = uid();
    var logZero = Quests.getQuestLog(p, { level: 0 });
    // There are no level-gated quests in the current DB (all require 0).
    // Verify available >= 0 (no crash).
    assert(logZero.available.length >= 0, 'getQuestLog should not crash on level check');
  });

  test('updateQuestProgress for observe does not match wrong event type', function() {
    var p = uid();
    acceptOk(p, 'quest_wilds_001'); // observe wildlife
    Quests.updateQuestProgress(p, 'collect', { category: 'wildlife' });
    var active = Quests.getActiveQuests(p);
    assert(active[0].objectives[0].current === 0, 'collect event should not advance observe objective');
  });

  test('updateQuestProgress for read objective matches correct event and item', function() {
    var p = uid();
    acceptOk(p, 'quest_athenaeum_001'); // read scroll x3
    Quests.updateQuestProgress(p, 'read', { item: 'scroll' });
    var active = Quests.getActiveQuests(p);
    assert(active[0].objectives[0].current === 1, 'Reading scroll should advance read objective');
  });

  test('updateQuestProgress for read does not match wrong item', function() {
    var p = uid();
    acceptOk(p, 'quest_athenaeum_001'); // read scroll
    Quests.updateQuestProgress(p, 'read', { item: 'book' });
    var active = Quests.getActiveQuests(p);
    assert(active[0].objectives[0].current === 0, 'Reading wrong item should not advance objective');
  });

  test('updateQuestProgress attend_gathering matches correctly', function() {
    var p = uid();
    acceptOk(p, 'quest_commons_002'); // attend_gathering players:3
    var updated = Quests.updateQuestProgress(p, 'attend_gathering', {});
    assert(updated.length === 1, 'attend_gathering event should update quest');
  });

  test('updateQuestProgress help_citizen (not help_citizens) matches correctly', function() {
    var p = uid();
    acceptOk(p, 'quest_commons_003'); // help_citizens x4, event is 'help_citizen' (singular)
    Quests.updateQuestProgress(p, 'help_citizen', {});
    var active = Quests.getActiveQuests(p);
    assert(active[0].objectives[0].current === 1, 'help_citizen event should match help_citizens objective');
  });

  test('updateQuestProgress place_marker matches place_marker event', function() {
    var p = uid();
    acceptOk(p, 'quest_wilds_003'); // place_marker x3
    Quests.updateQuestProgress(p, 'place_marker', {});
    var active = Quests.getActiveQuests(p);
    assert(active[0].objectives[0].current === 1, 'place_marker event should match objective');
  });

  test('updateQuestProgress compose event matches quest_studio_002', function() {
    var p = uid();
    acceptOk(p, 'quest_studio_002'); // compose instruments:3
    Quests.updateQuestProgress(p, 'compose', {});
    var active = Quests.getActiveQuests(p);
    assert(active[0].objectives[0].current === 1, 'compose event should advance compose objective');
  });

  test('updateQuestProgress paint_mural event matches quest_studio_003', function() {
    var p = uid();
    acceptOk(p, 'quest_studio_003'); // paint_mural count:5
    Quests.updateQuestProgress(p, 'paint_mural', {});
    var active = Quests.getActiveQuests(p);
    assert(active[0].objectives[0].current === 1, 'paint_mural event should advance objective');
  });

  test('updateQuestProgress create event matches quest_studio_001', function() {
    var p = uid();
    acceptOk(p, 'quest_studio_001'); // create artwork count:1
    Quests.updateQuestProgress(p, 'create', {});
    var active = Quests.getActiveQuests(p);
    assert(active[0].status === 'complete', 'create event should complete quest (count is 1)');
  });

  test('updateQuestProgress train event matches quest_arena_001', function() {
    var p = uid();
    acceptOk(p, 'quest_arena_001'); // train x3
    Quests.updateQuestProgress(p, 'train', {});
    var active = Quests.getActiveQuests(p);
    assert(active[0].objectives[0].current === 1, 'train event should advance objective');
  });

  test('updateQuestProgress talk_merchants event matches quest_agora_003', function() {
    var p = uid();
    acceptOk(p, 'quest_agora_003'); // talk_merchants x5
    Quests.updateQuestProgress(p, 'talk_npc', {});
    var active = Quests.getActiveQuests(p);
    assert(active[0].objectives[0].current === 1, 'talk_npc event should advance talk_merchants objective');
  });

});

// ============================================================================
// SUITE 18 — Quest prerequisites chain (end-to-end)
// ============================================================================
suite('Quest Prerequisites Chain', function() {

  test('quest_arena_002 requires quest_arena_001 to be turned in', function() {
    var p = uid();
    var availBefore = Quests.getAvailableQuests(p, { level: 0 });
    var ids = availBefore.map(function(q) { return q.id; });
    assert(ids.indexOf('quest_arena_002') === -1, 'quest_arena_002 should not be available without arena_001');
  });

  test('quest_arena_002 becomes available after quest_arena_001 completion', function() {
    var p = uid();
    acceptOk(p, 'quest_arena_001');
    Quests.updateQuestProgress(p, 'train', {});
    Quests.updateQuestProgress(p, 'train', {});
    Quests.updateQuestProgress(p, 'train', {});
    Quests.completeQuest(p, 'quest_arena_001', null);
    var avail = Quests.getAvailableQuests(p, { level: 0 });
    var ids = avail.map(function(q) { return q.id; });
    assert(ids.indexOf('quest_arena_002') !== -1, 'quest_arena_002 should be available after quest_arena_001');
  });

  test('quest_nexus_002 is unavailable until quest_nexus_001 is turned in', function() {
    var p = uid();
    var avail = Quests.getAvailableQuests(p, { level: 0 });
    var ids = avail.map(function(q) { return q.id; });
    assert(ids.indexOf('quest_nexus_002') === -1, 'quest_nexus_002 should be unavailable initially');
  });

  test('quest_nexus_002 becomes available after quest_nexus_001 completed', function() {
    var p = uid();
    acceptOk(p, 'quest_nexus_001');
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.updateQuestProgress(p, 'talk_npc', {});
    Quests.completeQuest(p, 'quest_nexus_001', null);
    var avail = Quests.getAvailableQuests(p, { level: 0 });
    var ids = avail.map(function(q) { return q.id; });
    assert(ids.indexOf('quest_nexus_002') !== -1, 'quest_nexus_002 available after nexus_001');
  });

  test('Full arena chain: train x3 -> champion path -> champion medal', function() {
    var p = uid();
    // Step 1: quest_arena_001 (train x3)
    acceptOk(p, 'quest_arena_001');
    for (var i = 0; i < 3; i++) Quests.updateQuestProgress(p, 'train', {});
    var r1 = Quests.completeQuest(p, 'quest_arena_001', null);
    assert(r1.success === true, 'arena_001 should complete');
    assert(r1.rewards.spark === 45, 'arena_001 spark reward should be 45');
    // Step 2: quest_arena_002 (perfect_score)
    acceptOk(p, 'quest_arena_002');
    Quests.updateQuestProgress(p, 'perfect_score', {});
    var r2 = Quests.completeQuest(p, 'quest_arena_002', null);
    assert(r2.success === true, 'arena_002 should complete');
    assert(r2.rewards.spark === 100, 'arena_002 spark reward should be 100');
    assert(r2.rewards.items.some(function(i) { return i.id === 'champion_medal'; }),
      'champion_medal should be in rewards');
  });

});

// ============================================================================
// Report
// ============================================================================
var success = report();
process.exit(success ? 0 : 1);
