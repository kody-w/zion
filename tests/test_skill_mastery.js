/**
 * tests/test_skill_mastery.js
 * 130+ tests for ZION Skill Mastery System
 * Run: node tests/test_skill_mastery.js
 */

'use strict';

var SkillMastery = require('../src/js/skill_mastery.js');

// ============================================================================
// MINIMAL TEST HARNESS
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
  assert(JSON.stringify(a) === JSON.stringify(b), msg + ' (expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a) + ')');
}

// ============================================================================
// HELPERS
// ============================================================================

var playerSeq = 0;
function uid() { return 'player_' + (++playerSeq); }

function freshState() {
  return SkillMastery.createState();
}

function stateWithPlayer(playerId) {
  var state = freshState();
  SkillMastery.initPlayer(state, playerId);
  return state;
}

// ============================================================================
// SUITE 1: Module shape & exports
// ============================================================================

suite('1. Module shape & exports', function() {
  assert(typeof SkillMastery === 'object', 'module exports an object');
  assert(Array.isArray(SkillMastery.SKILLS), 'SKILLS is an array');
  assert(Array.isArray(SkillMastery.SYNERGIES), 'SYNERGIES is an array');
  assert(typeof SkillMastery.createState === 'function', 'createState is a function');
  assert(typeof SkillMastery.initPlayer === 'function', 'initPlayer is a function');
  assert(typeof SkillMastery.gainXP === 'function', 'gainXP is a function');
  assert(typeof SkillMastery.getTier === 'function', 'getTier is a function');
  assert(typeof SkillMastery.getPlayerSkills === 'function', 'getPlayerSkills is a function');
  assert(typeof SkillMastery.getPlayerSkill === 'function', 'getPlayerSkill is a function');
  assert(typeof SkillMastery.applyFade === 'function', 'applyFade is a function');
  assert(typeof SkillMastery.getSynergies === 'function', 'getSynergies is a function');
  assert(typeof SkillMastery.checkSynergy === 'function', 'checkSynergy is a function');
  assert(typeof SkillMastery.getMasteryBadges === 'function', 'getMasteryBadges is a function');
  assert(typeof SkillMastery.getSkillLeaderboard === 'function', 'getSkillLeaderboard is a function');
  assert(typeof SkillMastery.getPlayerRank === 'function', 'getPlayerRank is a function');
  assert(typeof SkillMastery.getCategorySkills === 'function', 'getCategorySkills is a function');
  assert(typeof SkillMastery.getSkillHistory === 'function', 'getSkillHistory is a function');
  assert(typeof SkillMastery.getSkillById === 'function', 'getSkillById is a function');
  assert(typeof SkillMastery.getSkills === 'function', 'getSkills is a function');
  assert(typeof SkillMastery.mulberry32 === 'function', 'mulberry32 is a function');
});

// ============================================================================
// SUITE 2: SKILLS array integrity
// ============================================================================

suite('2. SKILLS array integrity', function() {
  var skills = SkillMastery.SKILLS;
  assertEqual(skills.length, 18, 'exactly 18 skills defined');

  var expectedIds = [
    'gardening', 'carpentry', 'alchemy', 'diplomacy', 'investigation',
    'forgery', 'sailing', 'inscription', 'cartography', 'cooking_mastery',
    'spellcasting', 'deception', 'leadership', 'lore_keeping', 'mathematics',
    'music_theory', 'stealth', 'weaving'
  ];
  for (var i = 0; i < expectedIds.length; i++) {
    var found = false;
    for (var j = 0; j < skills.length; j++) {
      if (skills[j].id === expectedIds[i]) { found = true; break; }
    }
    assert(found, 'skill "' + expectedIds[i] + '" exists');
  }

  // Every skill has required fields
  var validCategories = ['combat', 'craft', 'social', 'knowledge'];
  for (var k = 0; k < skills.length; k++) {
    var s = skills[k];
    assert(typeof s.id === 'string' && s.id.length > 0, 'skill[' + k + '] has id');
    assert(typeof s.name === 'string' && s.name.length > 0, 'skill[' + k + '] has name');
    assert(typeof s.description === 'string' && s.description.length > 0, 'skill[' + k + '] has description');
    assert(validCategories.indexOf(s.category) !== -1, 'skill[' + k + '] category is valid: ' + s.category);
    assert(typeof s.zone === 'string' && s.zone.length > 0, 'skill[' + k + '] has zone');
  }

  // IDs are unique
  var idSet = {};
  var allUnique = true;
  for (var m = 0; m < skills.length; m++) {
    if (idSet[skills[m].id]) { allUnique = false; break; }
    idSet[skills[m].id] = true;
  }
  assert(allUnique, 'all skill IDs are unique');
});

// ============================================================================
// SUITE 3: Category distribution
// ============================================================================

suite('3. Category distribution', function() {
  var combat    = SkillMastery.getCategorySkills('combat');
  var craft     = SkillMastery.getCategorySkills('craft');
  var social    = SkillMastery.getCategorySkills('social');
  var knowledge = SkillMastery.getCategorySkills('knowledge');

  assert(combat.length > 0, 'combat category has skills');
  assert(craft.length > 0, 'craft category has skills');
  assert(social.length > 0, 'social category has skills');
  assert(knowledge.length > 0, 'knowledge category has skills');
  assertEqual(combat.length + craft.length + social.length + knowledge.length, 18,
    'category counts sum to 18');

  // getCategorySkills returns only skills of that category
  for (var i = 0; i < combat.length; i++) {
    assertEqual(combat[i].category, 'combat', 'combat skill has correct category');
  }
  for (var j = 0; j < craft.length; j++) {
    assertEqual(craft[j].category, 'craft', 'craft skill has correct category');
  }

  // unknown category returns empty
  var none = SkillMastery.getCategorySkills('unknown_cat');
  assertEqual(none.length, 0, 'unknown category returns empty array');
});

// ============================================================================
// SUITE 4: getSkillById & getSkills
// ============================================================================

suite('4. getSkillById & getSkills', function() {
  var alchemy = SkillMastery.getSkillById('alchemy');
  assert(alchemy !== null, 'getSkillById returns skill object for valid id');
  assertEqual(alchemy.id, 'alchemy', 'correct id returned');
  assertEqual(alchemy.category, 'craft', 'alchemy category is craft');

  var bad = SkillMastery.getSkillById('nonexistent');
  assert(bad === null, 'getSkillById returns null for unknown id');

  var all = SkillMastery.getSkills();
  assertEqual(all.length, 18, 'getSkills returns 18 skills');
  // should be a copy, not the original array
  all.push({ id: 'fake' });
  assertEqual(SkillMastery.getSkills().length, 18, 'getSkills returns a copy');
});

// ============================================================================
// SUITE 5: SYNERGIES array integrity
// ============================================================================

suite('5. SYNERGIES array integrity', function() {
  var syns = SkillMastery.SYNERGIES;
  assert(syns.length >= 10, 'at least 10 synergies defined (got ' + syns.length + ')');

  for (var i = 0; i < syns.length; i++) {
    var syn = syns[i];
    assert(typeof syn.id === 'string' && syn.id.length > 0, 'synergy[' + i + '] has id');
    assert(Array.isArray(syn.skills) && syn.skills.length === 2, 'synergy[' + i + '] has 2 skills');
    assert(typeof syn.name === 'string', 'synergy[' + i + '] has name');
    assert(typeof syn.description === 'string', 'synergy[' + i + '] has description');
    assert(typeof syn.bonus === 'number' && syn.bonus > 0, 'synergy[' + i + '] has positive bonus');

    // Both skill IDs must be valid
    assert(SkillMastery.getSkillById(syn.skills[0]) !== null,
      'synergy[' + i + '] skill[0] "' + syn.skills[0] + '" is valid');
    assert(SkillMastery.getSkillById(syn.skills[1]) !== null,
      'synergy[' + i + '] skill[1] "' + syn.skills[1] + '" is valid');
  }

  // IDs unique
  var idSet = {};
  var allUnique = true;
  for (var j = 0; j < syns.length; j++) {
    if (idSet[syns[j].id]) { allUnique = false; break; }
    idSet[syns[j].id] = true;
  }
  assert(allUnique, 'all synergy IDs are unique');

  // Check alchemy+inscription synergy exists
  var alchIns = false;
  for (var k = 0; k < syns.length; k++) {
    var s = syns[k];
    if ((s.skills[0] === 'alchemy' && s.skills[1] === 'inscription') ||
        (s.skills[0] === 'inscription' && s.skills[1] === 'alchemy')) {
      alchIns = true; break;
    }
  }
  assert(alchIns, 'alchemy+inscription synergy exists');
});

// ============================================================================
// SUITE 6: createState & initPlayer
// ============================================================================

suite('6. createState & initPlayer', function() {
  var state = SkillMastery.createState();
  assert(typeof state === 'object', 'createState returns object');
  assert(typeof state.players === 'object', 'state has players object');
  assert(Array.isArray(state.skillLog), 'state has skillLog array');
  assertEqual(Object.keys(state.players).length, 0, 'players starts empty');
  assertEqual(state.skillLog.length, 0, 'skillLog starts empty');

  var pid = uid();
  var playerData = SkillMastery.initPlayer(state, pid);
  assert(typeof playerData === 'object', 'initPlayer returns player data');
  assert(state.players[pid] !== undefined, 'player added to state');

  // All 18 skills initialized
  var skillCount = Object.keys(state.players[pid].skills).length;
  assertEqual(skillCount, 18, 'initPlayer creates entries for all 18 skills');

  // Each skill entry has correct shape
  var skillEntry = state.players[pid].skills['gardening'];
  assert(skillEntry !== undefined, 'gardening skill entry exists');
  assertEqual(skillEntry.xp, 0, 'initial xp is 0');
  assertEqual(skillEntry.tier, 'apprentice', 'initial tier is apprentice');
  assertEqual(skillEntry.lastUsedTick, 0, 'initial lastUsedTick is 0');
  assert(Array.isArray(skillEntry.history), 'history is an array');

  // initPlayer is idempotent
  SkillMastery.initPlayer(state, pid);
  assertEqual(Object.keys(state.players[pid].skills).length, 18,
    'double-init does not duplicate skills');
});

// ============================================================================
// SUITE 7: getTier
// ============================================================================

suite('7. getTier thresholds', function() {
  assertEqual(SkillMastery.getTier(0), 'apprentice', 'xp=0 → apprentice');
  assertEqual(SkillMastery.getTier(50), 'apprentice', 'xp=50 → apprentice');
  assertEqual(SkillMastery.getTier(99), 'apprentice', 'xp=99 → apprentice');
  assertEqual(SkillMastery.getTier(100), 'journeyman', 'xp=100 → journeyman');
  assertEqual(SkillMastery.getTier(200), 'journeyman', 'xp=200 → journeyman');
  assertEqual(SkillMastery.getTier(499), 'journeyman', 'xp=499 → journeyman');
  assertEqual(SkillMastery.getTier(500), 'master', 'xp=500 → master');
  assertEqual(SkillMastery.getTier(1000), 'master', 'xp=1000 → master');
  assertEqual(SkillMastery.getTier(9999), 'master', 'xp=9999 → master');
});

// ============================================================================
// SUITE 8: gainXP — basic XP mechanics
// ============================================================================

suite('8. gainXP — basic mechanics', function() {
  var state = freshState();
  var pid = uid();

  var result = SkillMastery.gainXP(state, pid, 'gardening', 10, 1);
  assert(result.success === true, 'gainXP succeeds for valid inputs');
  assertEqual(result.xp, 10, 'xp is 10 after gaining 10');
  assertEqual(result.tier, 'apprentice', 'tier is apprentice at xp 10');
  assert(result.badge === null, 'no badge awarded below journeyman');

  // gain more XP
  SkillMastery.gainXP(state, pid, 'gardening', 40, 2);
  var result2 = SkillMastery.gainXP(state, pid, 'gardening', 50, 3);
  assertEqual(result2.xp, 100, 'xp accumulates correctly to 100');
  assertEqual(result2.tier, 'journeyman', 'tier becomes journeyman at xp 100');
  assertEqual(result2.badge, 'gardening_journeyman', 'journeyman badge awarded');

  // Gain to master
  var result3 = SkillMastery.gainXP(state, pid, 'gardening', 400, 4);
  assertEqual(result3.tier, 'master', 'tier becomes master at xp 500');
  assertEqual(result3.badge, 'gardening_master', 'master badge awarded');

  // Badge not duplicated after already mastered
  var result4 = SkillMastery.gainXP(state, pid, 'gardening', 10, 5);
  assert(result4.badge === null, 'no duplicate badge after master');
});

// ============================================================================
// SUITE 9: gainXP — player auto-init & unknown skill
// ============================================================================

suite('9. gainXP — auto-init & error cases', function() {
  var state = freshState();
  var pid = uid();

  // gainXP should auto-init player if not present
  var result = SkillMastery.gainXP(state, pid, 'carpentry', 5, 1);
  assert(result.success === true, 'gainXP auto-inits player');
  assert(state.players[pid] !== undefined, 'player created in state');

  // Unknown skill
  var bad = SkillMastery.gainXP(state, pid, 'flying', 10, 1);
  assert(bad.success === false, 'gainXP fails for unknown skill');
  assertEqual(bad.error, 'unknown_skill', 'error is unknown_skill');

  // Invalid amount
  var badAmt = SkillMastery.gainXP(state, pid, 'carpentry', 0, 1);
  assert(badAmt.success === false, 'gainXP fails for zero amount');
  assertEqual(badAmt.error, 'invalid_amount', 'error is invalid_amount');

  var negAmt = SkillMastery.gainXP(state, pid, 'carpentry', -5, 1);
  assert(negAmt.success === false, 'gainXP fails for negative amount');
  assertEqual(negAmt.error, 'invalid_amount', 'error is invalid_amount for negative');
});

// ============================================================================
// SUITE 10: gainXP — skillLog & history
// ============================================================================

suite('10. gainXP — logging', function() {
  var state = freshState();
  var pid = uid();

  SkillMastery.gainXP(state, pid, 'sailing', 20, 10);
  SkillMastery.gainXP(state, pid, 'sailing', 30, 20);

  assertEqual(state.skillLog.length, 2, 'skillLog has 2 entries after 2 gains');
  assertEqual(state.skillLog[0].skillId, 'sailing', 'first log entry skillId correct');
  assertEqual(state.skillLog[0].newXp, 20, 'first log entry newXp = 20');
  assertEqual(state.skillLog[1].newXp, 50, 'second log entry newXp = 50');
  assertEqual(state.skillLog[0].playerId, pid, 'log entry has playerId');
  assertEqual(state.skillLog[0].tick, 10, 'log entry has tick');

  var history = SkillMastery.getSkillHistory(state, pid, 'sailing');
  assertEqual(history.length, 2, 'getSkillHistory returns 2 entries');
  assertEqual(history[0].newXp, 20, 'first history entry correct');
  assertEqual(history[1].newXp, 50, 'second history entry correct');

  // History for unknown skill returns empty
  var badHistory = SkillMastery.getSkillHistory(state, pid, 'nonexistent');
  assertEqual(badHistory.length, 0, 'unknown skill returns empty history');

  // History for uninitiated player skill returns empty
  var newPid = uid();
  var emptyHistory = SkillMastery.getSkillHistory(state, newPid, 'sailing');
  assertEqual(emptyHistory.length, 0, 'new player returns empty history');
});

// ============================================================================
// SUITE 11: lastUsedTick tracking
// ============================================================================

suite('11. lastUsedTick tracking', function() {
  var state = freshState();
  var pid = uid();

  SkillMastery.gainXP(state, pid, 'alchemy', 10, 42);
  var skillData = state.players[pid].skills['alchemy'];
  assertEqual(skillData.lastUsedTick, 42, 'lastUsedTick updated after gainXP');

  SkillMastery.gainXP(state, pid, 'alchemy', 10, 100);
  assertEqual(state.players[pid].skills['alchemy'].lastUsedTick, 100,
    'lastUsedTick updated on subsequent gainXP');
});

// ============================================================================
// SUITE 12: applyFade — basic decay
// ============================================================================

suite('12. applyFade — basic decay', function() {
  var state = freshState();
  var pid = uid();

  // Give some XP at tick 0
  SkillMastery.gainXP(state, pid, 'stealth', 200, 0);
  assertEqual(state.players[pid].skills['stealth'].xp, 200, 'xp set to 200 at tick 0');

  // Apply fade at tick 100: 100 ticks since use → lose 1 XP
  var result = SkillMastery.applyFade(state, pid, 100);
  assert(typeof result === 'object', 'applyFade returns object');
  assert(Array.isArray(result.faded), 'result has faded array');

  var fadedStealth = null;
  for (var i = 0; i < result.faded.length; i++) {
    if (result.faded[i].skillId === 'stealth') { fadedStealth = result.faded[i]; break; }
  }
  assert(fadedStealth !== null, 'stealth appears in faded list');
  assertEqual(fadedStealth.lost, 1, 'lost exactly 1 XP per 100 ticks');
  assertEqual(fadedStealth.newXp, 199, 'newXp is 199');
  assertEqual(state.players[pid].skills['stealth'].xp, 199, 'state xp updated to 199');
});

// ============================================================================
// SUITE 13: applyFade — multi-tick decay & floor
// ============================================================================

suite('13. applyFade — multi-tick & floor', function() {
  var state = freshState();
  var pid = uid();

  SkillMastery.gainXP(state, pid, 'weaving', 5, 0);

  // 600 ticks elapsed → should lose 6, but floor at 0
  var result = SkillMastery.applyFade(state, pid, 600);
  var fadedWeaving = null;
  for (var i = 0; i < result.faded.length; i++) {
    if (result.faded[i].skillId === 'weaving') { fadedWeaving = result.faded[i]; break; }
  }
  assert(fadedWeaving !== null, 'weaving appears in faded list');
  assertEqual(fadedWeaving.newXp, 0, 'newXp floored at 0');
  assertEqual(state.players[pid].skills['weaving'].xp, 0, 'state xp at 0 (floor)');
});

// ============================================================================
// SUITE 14: applyFade — skills with 0 XP not faded
// ============================================================================

suite('14. applyFade — zero-xp skills skipped', function() {
  var state = freshState();
  var pid = uid();
  SkillMastery.initPlayer(state, pid);

  // All skills start at 0, nothing should fade
  var result = SkillMastery.applyFade(state, pid, 1000);
  assertEqual(result.faded.length, 0, 'no fade when all skills at 0 xp');
});

// ============================================================================
// SUITE 15: applyFade — recently used skills not faded
// ============================================================================

suite('15. applyFade — recently used skills not faded', function() {
  var state = freshState();
  var pid = uid();

  SkillMastery.gainXP(state, pid, 'inscription', 100, 500);

  // Only 50 ticks since use — less than 100 — no fade
  var result = SkillMastery.applyFade(state, pid, 550);
  var foundInscription = false;
  for (var i = 0; i < result.faded.length; i++) {
    if (result.faded[i].skillId === 'inscription') { foundInscription = true; break; }
  }
  assert(!foundInscription, 'inscription not faded when used 50 ticks ago');
});

// ============================================================================
// SUITE 16: applyFade — tier updated after fade
// ============================================================================

suite('16. applyFade — tier recalculated after fade', function() {
  var state = freshState();
  var pid = uid();

  // Set up at exactly journeyman boundary
  SkillMastery.gainXP(state, pid, 'mathematics', 100, 0);
  assertEqual(state.players[pid].skills['mathematics'].tier, 'journeyman',
    'starts at journeyman');

  // Fade 1 XP → drops back to apprentice
  SkillMastery.applyFade(state, pid, 100);
  assertEqual(state.players[pid].skills['mathematics'].tier, 'apprentice',
    'tier recalculated to apprentice after fade below threshold');
});

// ============================================================================
// SUITE 17: getSynergies
// ============================================================================

suite('17. getSynergies', function() {
  var alchemySyns = SkillMastery.getSynergies('alchemy');
  assert(alchemySyns.length > 0, 'alchemy has synergies');
  for (var i = 0; i < alchemySyns.length; i++) {
    var found = alchemySyns[i].skills[0] === 'alchemy' ||
                alchemySyns[i].skills[1] === 'alchemy';
    assert(found, 'alchemy synergy includes alchemy in skills pair');
  }

  var stealthSyns = SkillMastery.getSynergies('stealth');
  assert(stealthSyns.length > 0, 'stealth has synergies');

  // Skill with no synergy (find one if it exists, else just check return shape)
  var noSyns = SkillMastery.getSynergies('nonexistent_skill');
  assert(Array.isArray(noSyns), 'getSynergies returns array for unknown skill');
  assertEqual(noSyns.length, 0, 'unknown skill has no synergies');
});

// ============================================================================
// SUITE 18: checkSynergy — inactive (below journeyman)
// ============================================================================

suite('18. checkSynergy — inactive', function() {
  var state = freshState();
  var pid = uid();

  // Both skills at apprentice level — synergy inactive
  SkillMastery.gainXP(state, pid, 'alchemy', 50, 1);
  SkillMastery.gainXP(state, pid, 'inscription', 50, 1);

  var result = SkillMastery.checkSynergy(state, pid, 'alchemy', 'inscription');
  assert(typeof result === 'object', 'checkSynergy returns object');
  assertEqual(result.active, false, 'synergy inactive below journeyman');
  assertEqual(result.bonus, 0, 'bonus is 0 when inactive');
  assertEqual(result.name, 'Spell Writing', 'synergy name is correct');
});

// ============================================================================
// SUITE 19: checkSynergy — active (both at journeyman+)
// ============================================================================

suite('19. checkSynergy — active', function() {
  var state = freshState();
  var pid = uid();

  SkillMastery.gainXP(state, pid, 'alchemy', 200, 1);
  SkillMastery.gainXP(state, pid, 'inscription', 150, 1);

  var result = SkillMastery.checkSynergy(state, pid, 'alchemy', 'inscription');
  assertEqual(result.active, true, 'synergy active when both at journeyman+');
  assert(result.bonus > 0, 'bonus > 0 when synergy active');
  assert(typeof result.name === 'string', 'synergy name returned');

  // Order of skill IDs should not matter
  var result2 = SkillMastery.checkSynergy(state, pid, 'inscription', 'alchemy');
  assertEqual(result2.active, true, 'synergy active regardless of skill order');
  assertEqual(result2.bonus, result.bonus, 'bonus same regardless of skill order');
});

// ============================================================================
// SUITE 20: checkSynergy — non-existent pair
// ============================================================================

suite('20. checkSynergy — non-existent pair', function() {
  var state = freshState();
  var pid = uid();

  // gardening + sailing have no direct synergy
  SkillMastery.gainXP(state, pid, 'gardening', 200, 1);
  SkillMastery.gainXP(state, pid, 'sailing', 200, 1);

  var result = SkillMastery.checkSynergy(state, pid, 'gardening', 'sailing');
  assertEqual(result.active, false, 'no synergy for gardening+sailing');
  assertEqual(result.bonus, 0, 'bonus 0 for no synergy pair');
  assert(result.name === null, 'name null for no synergy pair');
});

// ============================================================================
// SUITE 21: gainXP — synergy bonus applied
// ============================================================================

suite('21. gainXP — synergy bonus on XP gain', function() {
  var state = freshState();
  var pid = uid();

  // Bring both alchemy and inscription to journeyman
  SkillMastery.gainXP(state, pid, 'alchemy', 200, 1);
  SkillMastery.gainXP(state, pid, 'inscription', 200, 1);

  // Now gain XP in alchemy — synergy should apply bonus
  var result = SkillMastery.gainXP(state, pid, 'alchemy', 100, 2);
  assert(result.success === true, 'gainXP succeeds with synergy');
  assert(result.synergy !== null, 'synergy object returned');
  assert(result.synergy.bonusXp > 0, 'synergy grants bonus XP');
  assert(result.xp > 300, 'total XP exceeds base + gain due to synergy bonus');

  // Verify synergy info
  assert(typeof result.synergy.id === 'string', 'synergy id present');
  assert(typeof result.synergy.name === 'string', 'synergy name present');
});

// ============================================================================
// SUITE 22: gainXP — no synergy bonus at apprentice
// ============================================================================

suite('22. gainXP — no synergy bonus at apprentice', function() {
  var state = freshState();
  var pid = uid();

  // Both at apprentice
  SkillMastery.gainXP(state, pid, 'alchemy', 50, 1);
  SkillMastery.gainXP(state, pid, 'inscription', 50, 1);

  var result = SkillMastery.gainXP(state, pid, 'alchemy', 10, 2);
  assert(result.synergy === null, 'no synergy bonus when both at apprentice');
  assertEqual(result.xp, 60, 'xp is exactly 60 (no bonus)');
});

// ============================================================================
// SUITE 23: getMasteryBadges
// ============================================================================

suite('23. getMasteryBadges', function() {
  var state = freshState();
  var pid = uid();

  // No badges initially
  SkillMastery.initPlayer(state, pid);
  var badges = SkillMastery.getMasteryBadges(state, pid);
  assertEqual(badges.length, 0, 'no badges at start');

  // Gain journeyman in sailing
  SkillMastery.gainXP(state, pid, 'sailing', 100, 10);
  badges = SkillMastery.getMasteryBadges(state, pid);
  assertEqual(badges.length, 1, 'one badge after reaching journeyman');
  assertEqual(badges[0].id, 'sailing_journeyman', 'correct badge id');
  assertEqual(badges[0].skillId, 'sailing', 'badge has correct skillId');
  assertEqual(badges[0].tier, 'journeyman', 'badge has correct tier');
  assertEqual(badges[0].unlockedAt, 10, 'badge has correct unlock tick');

  // Gain master in sailing
  SkillMastery.gainXP(state, pid, 'sailing', 400, 20);
  badges = SkillMastery.getMasteryBadges(state, pid);
  assertEqual(badges.length, 2, 'two badges after reaching master');

  // Badges array is a copy
  badges.push({ id: 'fake_badge' });
  assertEqual(SkillMastery.getMasteryBadges(state, pid).length, 2,
    'getMasteryBadges returns a copy');

  // Multiple skills, multiple badges
  SkillMastery.gainXP(state, pid, 'weaving', 100, 30);
  badges = SkillMastery.getMasteryBadges(state, pid);
  assertEqual(badges.length, 3, 'three badges after second skill journeyman');
});

// ============================================================================
// SUITE 24: getPlayerSkills
// ============================================================================

suite('24. getPlayerSkills', function() {
  var state = freshState();
  var pid = uid();

  var skills = SkillMastery.getPlayerSkills(state, pid);
  assertEqual(skills.length, 18, 'getPlayerSkills returns 18 skill entries');

  // Check shape of each entry
  for (var i = 0; i < skills.length; i++) {
    var s = skills[i];
    assert(typeof s.id === 'string', 'skill entry has id');
    assert(typeof s.name === 'string', 'skill entry has name');
    assert(typeof s.category === 'string', 'skill entry has category');
    assert(typeof s.zone === 'string', 'skill entry has zone');
    assert(typeof s.xp === 'number', 'skill entry has xp (number)');
    assert(typeof s.tier === 'string', 'skill entry has tier');
  }

  // Verify XP updates reflected
  SkillMastery.gainXP(state, pid, 'diplomacy', 75, 5);
  var updatedSkills = SkillMastery.getPlayerSkills(state, pid);
  var dip = null;
  for (var j = 0; j < updatedSkills.length; j++) {
    if (updatedSkills[j].id === 'diplomacy') { dip = updatedSkills[j]; break; }
  }
  assert(dip !== null, 'diplomacy found in player skills');
  assertEqual(dip.xp, 75, 'diplomacy xp correct after gain');
  assertEqual(dip.tier, 'apprentice', 'diplomacy tier correct');
});

// ============================================================================
// SUITE 25: getPlayerSkill (single skill)
// ============================================================================

suite('25. getPlayerSkill', function() {
  var state = freshState();
  var pid = uid();

  SkillMastery.gainXP(state, pid, 'lore_keeping', 500, 1);
  var skill = SkillMastery.getPlayerSkill(state, pid, 'lore_keeping');
  assert(skill !== null, 'getPlayerSkill returns object for valid skill');
  assertEqual(skill.id, 'lore_keeping', 'id correct');
  assertEqual(skill.xp, 500, 'xp correct');
  assertEqual(skill.tier, 'master', 'tier correct');
  assert(typeof skill.zone === 'string', 'zone present');
  assert(typeof skill.category === 'string', 'category present');

  // Unknown skill
  var bad = SkillMastery.getPlayerSkill(state, pid, 'nonexistent');
  assert(bad === null, 'getPlayerSkill returns null for unknown skill');

  // Unknown player — auto-inits at 0
  var newPid = uid();
  var freshSkill = SkillMastery.getPlayerSkill(state, newPid, 'cartography');
  assert(freshSkill !== null, 'getPlayerSkill handles new player');
  assertEqual(freshSkill.xp, 0, 'new player skill xp is 0');
  assertEqual(freshSkill.tier, 'apprentice', 'new player skill tier is apprentice');
});

// ============================================================================
// SUITE 26: getSkillLeaderboard
// ============================================================================

suite('26. getSkillLeaderboard', function() {
  var state = freshState();
  var p1 = uid(); var p2 = uid(); var p3 = uid(); var p4 = uid();

  SkillMastery.gainXP(state, p1, 'spellcasting', 300, 1);
  SkillMastery.gainXP(state, p2, 'spellcasting', 500, 1);
  SkillMastery.gainXP(state, p3, 'spellcasting', 100, 1);
  SkillMastery.gainXP(state, p4, 'spellcasting', 450, 1);

  var board = SkillMastery.getSkillLeaderboard(state, 'spellcasting', 10);
  assertEqual(board.length, 4, 'leaderboard has 4 players');

  // Sorted descending by XP
  assertEqual(board[0].playerId, p2, 'first place is p2 (500 xp)');
  assertEqual(board[1].playerId, p4, 'second place is p4 (450 xp)');
  assertEqual(board[2].playerId, p1, 'third place is p1 (300 xp)');
  assertEqual(board[3].playerId, p3, 'fourth place is p3 (100 xp)');

  // count limit
  var top2 = SkillMastery.getSkillLeaderboard(state, 'spellcasting', 2);
  assertEqual(top2.length, 2, 'count param limits results to 2');
  assertEqual(top2[0].playerId, p2, 'top2[0] is p2');

  // Each entry has required fields
  assert(typeof board[0].xp === 'number', 'leaderboard entry has xp');
  assert(typeof board[0].tier === 'string', 'leaderboard entry has tier');
  assert(typeof board[0].playerId === 'string', 'leaderboard entry has playerId');

  // Unknown skill returns empty
  var emptyBoard = SkillMastery.getSkillLeaderboard(state, 'unknown_skill', 10);
  assertEqual(emptyBoard.length, 0, 'unknown skill returns empty leaderboard');
});

// ============================================================================
// SUITE 27: getPlayerRank
// ============================================================================

suite('27. getPlayerRank', function() {
  var state = freshState();
  var p1 = uid(); var p2 = uid(); var p3 = uid();

  SkillMastery.gainXP(state, p1, 'deception', 400, 1);
  SkillMastery.gainXP(state, p2, 'deception', 200, 1);
  SkillMastery.gainXP(state, p3, 'deception', 600, 1);

  assertEqual(SkillMastery.getPlayerRank(state, p3, 'deception'), 1, 'p3 ranked 1st');
  assertEqual(SkillMastery.getPlayerRank(state, p1, 'deception'), 2, 'p1 ranked 2nd');
  assertEqual(SkillMastery.getPlayerRank(state, p2, 'deception'), 3, 'p2 ranked 3rd');

  // Player not in leaderboard
  var p4 = uid();
  var rank = SkillMastery.getPlayerRank(state, p4, 'deception');
  assert(rank === null, 'unknown player rank is null');
});

// ============================================================================
// SUITE 28: mulberry32 PRNG
// ============================================================================

suite('28. mulberry32 PRNG', function() {
  var rng = SkillMastery.mulberry32(12345);
  assert(typeof rng === 'function', 'mulberry32 returns a function');

  var val1 = rng();
  var val2 = rng();
  assert(val1 >= 0 && val1 < 1, 'rng value in [0, 1)');
  assert(val2 >= 0 && val2 < 1, 'second rng value in [0, 1)');
  assert(val1 !== val2, 'successive rng values are different');

  // Deterministic: same seed produces same sequence
  var rng2 = SkillMastery.mulberry32(12345);
  assertEqual(rng2(), val1, 'same seed produces same first value');

  // Different seeds produce different values
  var rng3 = SkillMastery.mulberry32(99999);
  var v3 = rng3();
  assert(v3 !== val1, 'different seed produces different value');
});

// ============================================================================
// SUITE 29: Multi-player isolation
// ============================================================================

suite('29. Multi-player isolation', function() {
  var state = freshState();
  var p1 = uid(); var p2 = uid();

  SkillMastery.gainXP(state, p1, 'cooking_mastery', 200, 1);
  SkillMastery.gainXP(state, p2, 'cooking_mastery', 50, 1);

  assertEqual(state.players[p1].skills['cooking_mastery'].xp, 200, 'p1 xp isolated');
  assertEqual(state.players[p2].skills['cooking_mastery'].xp, 50, 'p2 xp isolated');

  // Fade on p1 doesn't affect p2
  SkillMastery.applyFade(state, p1, 1000);
  assertEqual(state.players[p2].skills['cooking_mastery'].xp, 50, 'p2 unaffected by p1 fade');
});

// ============================================================================
// SUITE 30: Edge cases & robustness
// ============================================================================

suite('30. Edge cases & robustness', function() {
  var state = freshState();
  var pid = uid();

  // Very large XP gain
  var result = SkillMastery.gainXP(state, pid, 'leadership', 999999, 1);
  assert(result.success === true, 'large XP gain succeeds');
  assertEqual(result.tier, 'master', 'tier correct for huge xp');

  // getSkillHistory returns a copy
  SkillMastery.gainXP(state, pid, 'music_theory', 50, 5);
  var history1 = SkillMastery.getSkillHistory(state, pid, 'music_theory');
  history1.push({ fake: true });
  var history2 = SkillMastery.getSkillHistory(state, pid, 'music_theory');
  assertEqual(history2.length, 1, 'getSkillHistory returns a copy (not reference)');

  // getPlayerSkills for non-initiated player still returns 18
  var newPid = uid();
  var skills = SkillMastery.getPlayerSkills(state, newPid);
  assertEqual(skills.length, 18, 'getPlayerSkills auto-inits and returns 18 for new player');

  // applyFade on non-initiated player returns empty faded
  var newPid2 = uid();
  var fadeResult = SkillMastery.applyFade(state, newPid2, 500);
  assertEqual(fadeResult.faded.length, 0, 'applyFade on new player returns empty faded');

  // getTier constants exported and correct
  assertEqual(SkillMastery.TIER_APPRENTICE, 0, 'TIER_APPRENTICE is 0');
  assertEqual(SkillMastery.TIER_JOURNEYMAN, 100, 'TIER_JOURNEYMAN is 100');
  assertEqual(SkillMastery.TIER_MASTER, 500, 'TIER_MASTER is 500');
});

// ============================================================================
// SUITE 31: Synergy — gainXP records baseAmount
// ============================================================================

suite('31. Synergy gainXP records baseAmount', function() {
  var state = freshState();
  var pid = uid();

  // Activate alchemy+inscription synergy
  SkillMastery.gainXP(state, pid, 'alchemy', 200, 1);
  SkillMastery.gainXP(state, pid, 'inscription', 200, 1);

  var result = SkillMastery.gainXP(state, pid, 'alchemy', 50, 5);
  assert(result.success === true, 'gainXP with active synergy succeeds');

  var history = SkillMastery.getSkillHistory(state, pid, 'alchemy');
  var lastEntry = history[history.length - 1];
  assertEqual(lastEntry.baseAmount, 50, 'history records baseAmount (pre-synergy)');
  assert(lastEntry.amount > 50, 'history records effective amount (with synergy bonus)');
  assertEqual(lastEntry.amount, result.xp - lastEntry.oldXp, 'history amount matches xp delta');
});

// ============================================================================
// SUITE 32: Apprentice badge on first journeyman (not at 0 start)
// ============================================================================

suite('32. Tier badge progression', function() {
  var state = freshState();
  var pid = uid();

  // Apprentice never gets a badge (it's the starting state)
  var r1 = SkillMastery.gainXP(state, pid, 'forgery', 50, 1);
  assert(r1.badge === null, 'no badge for apprentice tier gain');

  // Journeyman badge
  var r2 = SkillMastery.gainXP(state, pid, 'forgery', 50, 2);
  assertEqual(r2.badge, 'forgery_journeyman', 'journeyman badge awarded when crossing 100');

  // No duplicate journeyman badge
  var r3 = SkillMastery.gainXP(state, pid, 'forgery', 10, 3);
  assert(r3.badge === null, 'no duplicate journeyman badge');

  // Master badge
  var r4 = SkillMastery.gainXP(state, pid, 'forgery', 390, 4);
  assertEqual(r4.badge, 'forgery_master', 'master badge awarded when crossing 500');

  // No duplicate master badge
  var r5 = SkillMastery.gainXP(state, pid, 'forgery', 10, 5);
  assert(r5.badge === null, 'no duplicate master badge');

  // Badge count for this player on forgery = 2 (journeyman + master)
  var badges = SkillMastery.getMasteryBadges(state, pid);
  var forgeryBadges = 0;
  for (var i = 0; i < badges.length; i++) {
    if (badges[i].skillId === 'forgery') forgeryBadges++;
  }
  assertEqual(forgeryBadges, 2, 'exactly 2 forgery badges earned');
});

// ============================================================================
// SUITE 33: skillLog entries across multiple players and skills
// ============================================================================

suite('33. skillLog multi-player', function() {
  var state = freshState();
  var p1 = uid(); var p2 = uid();

  SkillMastery.gainXP(state, p1, 'gardening', 10, 1);
  SkillMastery.gainXP(state, p2, 'cartography', 20, 2);
  SkillMastery.gainXP(state, p1, 'alchemy', 30, 3);

  assertEqual(state.skillLog.length, 3, 'skillLog has 3 entries');
  assertEqual(state.skillLog[0].playerId, p1, 'log entry 0 playerId correct');
  assertEqual(state.skillLog[1].playerId, p2, 'log entry 1 playerId correct');
  assertEqual(state.skillLog[2].playerId, p1, 'log entry 2 playerId correct');
  assertEqual(state.skillLog[0].skillId, 'gardening', 'log entry 0 skillId correct');
  assertEqual(state.skillLog[1].skillId, 'cartography', 'log entry 1 skillId correct');
});

// ============================================================================
// RESULTS
// ============================================================================

console.log('\n========================================');
console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
console.log('========================================');

if (failures.length > 0) {
  console.log('\nFailed tests:');
  for (var i = 0; i < failures.length; i++) {
    console.log('  ' + failures[i]);
  }
}

if (failed > 0) process.exit(1);
