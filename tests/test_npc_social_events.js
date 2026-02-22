/**
 * test_npc_social_events.js — Tests for NPC social events, seasonal modifiers, and new quests
 */

(function() {
  'use strict';

  var NpcAI;
  try { NpcAI = require('../src/js/npc_ai'); } catch(e) { NpcAI = {}; }
  var Quests;
  try { Quests = require('../src/js/quests'); } catch(e) { Quests = {}; }

  var passed = 0;
  var failed = 0;

  function assert(condition, msg) {
    if (condition) { passed++; }
    else { failed++; console.error('FAIL: ' + msg); }
  }

  // --- NPC Social Events ---

  // Test 1: checkSocialEvents returns null with no nearby NPCs
  var result = NpcAI.checkSocialEvents(
    { archetype: 'merchant', name: 'TestMerchant' },
    {},
    { nearbyNPCs: [] },
    { time: Date.now() }
  );
  assert(result === null, 'checkSocialEvents should return null with no nearby NPCs');

  // Test 2: checkSocialEvents returns null with null perception
  result = NpcAI.checkSocialEvents({ archetype: 'merchant' }, {}, null, {});
  assert(result === null, 'checkSocialEvents should return null with null perception');

  // Test 3: NPC_SOCIAL_EVENTS has all 5 event types
  assert(NpcAI.NPC_SOCIAL_EVENTS !== undefined, 'NPC_SOCIAL_EVENTS should be exported');
  var eventTypes = ['trade_goods', 'teach_skill', 'perform_together', 'philosophical_debate', 'healing_circle'];
  for (var i = 0; i < eventTypes.length; i++) {
    assert(NpcAI.NPC_SOCIAL_EVENTS[eventTypes[i]] !== undefined,
      'NPC_SOCIAL_EVENTS should have ' + eventTypes[i]);
  }

  // Test 4: Each event has required fields
  for (var et in NpcAI.NPC_SOCIAL_EVENTS) {
    var ev = NpcAI.NPC_SOCIAL_EVENTS[et];
    assert(Array.isArray(ev.archetypes) && ev.archetypes.length > 0, et + ' should have archetypes array');
    assert(typeof ev.chance === 'number', et + ' should have numeric chance');
    assert(typeof ev.cooldown === 'number', et + ' should have numeric cooldown');
    assert(typeof ev.duration === 'number', et + ' should have numeric duration');
    assert(Array.isArray(ev.outcomes) && ev.outcomes.length >= 3, et + ' should have at least 3 outcomes');
  }

  // --- Seasonal Modifiers ---

  // Test 5: SEASONAL_MODIFIERS has entries for all 4 seasons
  assert(NpcAI.SEASONAL_MODIFIERS !== undefined, 'SEASONAL_MODIFIERS should be exported');
  var seasons = ['spring', 'summer', 'autumn', 'winter'];
  for (var s = 0; s < seasons.length; s++) {
    assert(NpcAI.SEASONAL_MODIFIERS[seasons[s]] !== undefined,
      'SEASONAL_MODIFIERS should have ' + seasons[s]);
  }

  // Test 6: applySeasonalModifiers adjusts energy correctly
  assert(typeof NpcAI.applySeasonalModifiers === 'function', 'applySeasonalModifiers should be exported');
  var baseStats = { energy: 100, social: 50, work: 75 };
  var springStats = NpcAI.applySeasonalModifiers(baseStats, 'spring');
  assert(springStats.energy > baseStats.energy, 'spring should increase energy (bonus is positive)');

  var winterStats = NpcAI.applySeasonalModifiers(baseStats, 'winter');
  assert(winterStats.energy < baseStats.energy, 'winter should decrease energy (bonus is negative)');

  // Test 7: applySeasonalModifiers with unknown season returns baseStats unchanged
  var unknownStats = NpcAI.applySeasonalModifiers(baseStats, 'monsoon');
  assert(unknownStats.energy === baseStats.energy, 'unknown season should not change energy');

  // --- New Quests ---

  // Test 8: All 10 new quests exist
  var newQuestIds = [
    'quest_agora_004', 'quest_nexus_003', 'quest_gardens_006', 'quest_wilds_005',
    'quest_athenaeum_004', 'quest_commons_004', 'quest_arena_004', 'quest_studio_004',
    'quest_agora_005', 'quest_nexus_004'
  ];

  // Check quests via getAvailableQuests or direct access
  var dummyPlayer = 'test_quest_player_' + Date.now();
  Quests.initPlayerQuests(dummyPlayer);
  var available = Quests.getAvailableQuests(dummyPlayer, { level: 10 });
  var availableIds = available.map(function(q) { return q.id; });

  for (var q = 0; q < newQuestIds.length; q++) {
    assert(availableIds.indexOf(newQuestIds[q]) >= 0,
      'Quest ' + newQuestIds[q] + ' should be available');
  }

  // Test 9: New quests have valid structure
  for (var qi = 0; qi < available.length; qi++) {
    var quest = available[qi];
    if (newQuestIds.indexOf(quest.id) >= 0) {
      assert(quest.title && quest.title.length > 0, quest.id + ' should have title');
      assert(quest.description && quest.description.length > 0, quest.id + ' should have description');
      assert(Array.isArray(quest.objectives) && quest.objectives.length > 0, quest.id + ' should have objectives');
      assert(quest.rewards !== undefined, quest.id + ' should have rewards');
      assert(quest.dialogue !== undefined, quest.id + ' should have dialogue');
    }
  }

  // Test 10: No duplicate quest IDs
  var idSet = {};
  var hasDuplicates = false;
  for (var di = 0; di < available.length; di++) {
    if (idSet[available[di].id]) { hasDuplicates = true; break; }
    idSet[available[di].id] = true;
  }
  assert(!hasDuplicates, 'No duplicate quest IDs should exist');

  console.log('test_npc_social_events: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
})();
