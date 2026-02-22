/**
 * Tests for src/js/apprenticeship.js
 * Run: node tests/test_apprenticeship.js
 */

const { test, suite, report, assert } = require('./test_runner');
const Apprenticeship = require('../src/js/apprenticeship');

// ============================================================================
// HELPERS
// ============================================================================

function freshState() {
  return Apprenticeship.createApprenticeshipState();
}

// Complete a lesson fully by running all steps then completing
function runFullLesson(state, playerId, npcId, topic) {
  var result = Apprenticeship.startLesson(state, playerId, npcId, topic);
  if (!result.lesson) return result;
  var s = result.state;
  var lessonId = result.lesson.id;
  var steps = Apprenticeship.getLessonSteps(topic);
  for (var i = 0; i < steps.length; i++) {
    var adv = Apprenticeship.advanceLesson(s, lessonId, steps[i].action);
    s = adv.state;
  }
  return Apprenticeship.completeLesson(s, lessonId);
}

// ============================================================================
// SUITE: TOPICS configuration
// ============================================================================

suite('Apprenticeship — TOPICS configuration', () => {

  test('TOPICS object is exported', () => {
    assert(typeof Apprenticeship.TOPICS === 'object');
    assert(Apprenticeship.TOPICS !== null);
  });

  test('TOPICS contains exactly 12 topics', () => {
    assert.strictEqual(Object.keys(Apprenticeship.TOPICS).length, 12);
  });

  test('All 12 expected topic keys exist', () => {
    var expected = ['farming','cooking','smithing','trading','navigation','history','combat','music','healing','building','fishing','stargazing'];
    expected.forEach(key => {
      assert(Apprenticeship.TOPICS[key] !== undefined, 'Missing topic: ' + key);
    });
  });

  test('Each topic has name field (string)', () => {
    Object.entries(Apprenticeship.TOPICS).forEach(([key, t]) => {
      assert(typeof t.name === 'string' && t.name.length > 0, key + ' missing name');
    });
  });

  test('Each topic has zone field (string)', () => {
    Object.entries(Apprenticeship.TOPICS).forEach(([key, t]) => {
      assert(typeof t.zone === 'string' && t.zone.length > 0, key + ' missing zone');
    });
  });

  test('Each topic has xpReward (positive number)', () => {
    Object.entries(Apprenticeship.TOPICS).forEach(([key, t]) => {
      assert(typeof t.xpReward === 'number' && t.xpReward > 0, key + ' invalid xpReward');
    });
  });

  test('Each topic has sparkReward (positive number)', () => {
    Object.entries(Apprenticeship.TOPICS).forEach(([key, t]) => {
      assert(typeof t.sparkReward === 'number' && t.sparkReward > 0, key + ' invalid sparkReward');
    });
  });

  test('Each topic has desc field (string)', () => {
    Object.entries(Apprenticeship.TOPICS).forEach(([key, t]) => {
      assert(typeof t.desc === 'string' && t.desc.length > 0, key + ' missing desc');
    });
  });

  test('farming topic — correct values', () => {
    var t = Apprenticeship.TOPICS.farming;
    assert.strictEqual(t.name, 'Farming');
    assert.strictEqual(t.zone, 'gardens');
    assert.strictEqual(t.xpReward, 30);
    assert.strictEqual(t.sparkReward, 15);
  });

  test('trading topic — correct values', () => {
    var t = Apprenticeship.TOPICS.trading;
    assert.strictEqual(t.name, 'Trading');
    assert.strictEqual(t.zone, 'agora');
    assert.strictEqual(t.xpReward, 30);
    assert.strictEqual(t.sparkReward, 20);
  });

  test('smithing topic — correct values', () => {
    var t = Apprenticeship.TOPICS.smithing;
    assert.strictEqual(t.name, 'Smithing');
    assert.strictEqual(t.zone, 'studio');
    assert.strictEqual(t.xpReward, 35);
    assert.strictEqual(t.sparkReward, 18);
  });

  test('combat topic — correct values', () => {
    var t = Apprenticeship.TOPICS.combat;
    assert.strictEqual(t.name, 'Combat');
    assert.strictEqual(t.zone, 'arena');
    assert.strictEqual(t.xpReward, 32);
    assert.strictEqual(t.sparkReward, 16);
  });

  test('fishing topic has lowest xpReward (20)', () => {
    assert.strictEqual(Apprenticeship.TOPICS.fishing.xpReward, 20);
  });

  test('music topic has lowest sparkReward (11)', () => {
    assert.strictEqual(Apprenticeship.TOPICS.music.sparkReward, 11);
  });

});

// ============================================================================
// SUITE: SKILL_LEVEL_NAMES
// ============================================================================

suite('Apprenticeship — SKILL_LEVEL_NAMES', () => {

  test('SKILL_LEVEL_NAMES exported as array', () => {
    assert(Array.isArray(Apprenticeship.SKILL_LEVEL_NAMES));
  });

  test('SKILL_LEVEL_NAMES has exactly 6 entries', () => {
    assert.strictEqual(Apprenticeship.SKILL_LEVEL_NAMES.length, 6);
  });

  test('Level 0 is Untrained', () => {
    assert.strictEqual(Apprenticeship.SKILL_LEVEL_NAMES[0], 'Untrained');
  });

  test('Level 1 is Novice', () => {
    assert.strictEqual(Apprenticeship.SKILL_LEVEL_NAMES[1], 'Novice');
  });

  test('Level 5 is Master', () => {
    assert.strictEqual(Apprenticeship.SKILL_LEVEL_NAMES[5], 'Master');
  });

  test('getNPCSkillName(0) returns Untrained', () => {
    assert.strictEqual(Apprenticeship.getNPCSkillName(0), 'Untrained');
  });

  test('getNPCSkillName(1) returns Novice', () => {
    assert.strictEqual(Apprenticeship.getNPCSkillName(1), 'Novice');
  });

  test('getNPCSkillName(2) returns Practiced', () => {
    assert.strictEqual(Apprenticeship.getNPCSkillName(2), 'Practiced');
  });

  test('getNPCSkillName(3) returns Skilled', () => {
    assert.strictEqual(Apprenticeship.getNPCSkillName(3), 'Skilled');
  });

  test('getNPCSkillName(4) returns Expert', () => {
    assert.strictEqual(Apprenticeship.getNPCSkillName(4), 'Expert');
  });

  test('getNPCSkillName(5) returns Master', () => {
    assert.strictEqual(Apprenticeship.getNPCSkillName(5), 'Master');
  });

  test('getNPCSkillName(-1) returns Untrained (clamps)', () => {
    assert.strictEqual(Apprenticeship.getNPCSkillName(-1), 'Untrained');
  });

  test('getNPCSkillName(99) returns Master (clamps)', () => {
    assert.strictEqual(Apprenticeship.getNPCSkillName(99), 'Master');
  });

  test('getNPCSkillName with no arg returns Untrained', () => {
    assert.strictEqual(Apprenticeship.getNPCSkillName(undefined), 'Untrained');
  });

});

// ============================================================================
// SUITE: createApprenticeshipState
// ============================================================================

suite('Apprenticeship — createApprenticeshipState', () => {

  test('returns an object', () => {
    var s = freshState();
    assert(typeof s === 'object' && s !== null);
  });

  test('has mentorships object', () => {
    var s = freshState();
    assert(typeof s.mentorships === 'object');
  });

  test('has npcSkills object', () => {
    var s = freshState();
    assert(typeof s.npcSkills === 'object');
  });

  test('has lessonHistory array', () => {
    var s = freshState();
    assert(Array.isArray(s.lessonHistory));
  });

  test('has playerTeachingXP object', () => {
    var s = freshState();
    assert(typeof s.playerTeachingXP === 'object');
  });

  test('mentorships starts empty', () => {
    var s = freshState();
    assert.strictEqual(Object.keys(s.mentorships).length, 0);
  });

  test('npcSkills starts empty', () => {
    var s = freshState();
    assert.strictEqual(Object.keys(s.npcSkills).length, 0);
  });

  test('lessonHistory starts empty', () => {
    var s = freshState();
    assert.strictEqual(s.lessonHistory.length, 0);
  });

  test('playerTeachingXP starts empty', () => {
    var s = freshState();
    assert.strictEqual(Object.keys(s.playerTeachingXP).length, 0);
  });

  test('each call returns a new independent object', () => {
    var s1 = freshState();
    var s2 = freshState();
    s1.lessonHistory.push('test');
    assert.strictEqual(s2.lessonHistory.length, 0);
  });

});

// ============================================================================
// SUITE: getLessonSteps
// ============================================================================

suite('Apprenticeship — getLessonSteps', () => {

  test('returns array for valid topic', () => {
    var steps = Apprenticeship.getLessonSteps('farming');
    assert(Array.isArray(steps));
  });

  test('returns exactly 3 steps for each topic', () => {
    Object.keys(Apprenticeship.TOPICS).forEach(topic => {
      var steps = Apprenticeship.getLessonSteps(topic);
      assert(steps !== null, topic + ' has no steps');
      assert.strictEqual(steps.length, 3, topic + ' should have 3 steps');
    });
  });

  test('each step has index 0-2', () => {
    var steps = Apprenticeship.getLessonSteps('cooking');
    assert.strictEqual(steps[0].index, 0);
    assert.strictEqual(steps[1].index, 1);
    assert.strictEqual(steps[2].index, 2);
  });

  test('each step has phase field', () => {
    var steps = Apprenticeship.getLessonSteps('fishing');
    assert.strictEqual(steps[0].phase, 'introduce');
    assert.strictEqual(steps[1].phase, 'practice');
    assert.strictEqual(steps[2].phase, 'master');
  });

  test('each step has instruction string', () => {
    var steps = Apprenticeship.getLessonSteps('smithing');
    steps.forEach((step, i) => {
      assert(typeof step.instruction === 'string' && step.instruction.length > 0, 'step ' + i + ' missing instruction');
    });
  });

  test('each step has action string', () => {
    var steps = Apprenticeship.getLessonSteps('healing');
    steps.forEach((step, i) => {
      assert(typeof step.action === 'string' && step.action.length > 0, 'step ' + i + ' missing action');
    });
  });

  test('each step has description string', () => {
    var steps = Apprenticeship.getLessonSteps('history');
    steps.forEach((step, i) => {
      assert(typeof step.description === 'string' && step.description.length > 0, 'step ' + i + ' missing description');
    });
  });

  test('returns null for unknown topic', () => {
    var steps = Apprenticeship.getLessonSteps('alchemy');
    assert.strictEqual(steps, null);
  });

  test('returns null for empty string', () => {
    var steps = Apprenticeship.getLessonSteps('');
    assert.strictEqual(steps, null);
  });

});

// ============================================================================
// SUITE: getTeachableTopics
// ============================================================================

suite('Apprenticeship — getTeachableTopics', () => {

  test('returns array for known archetype', () => {
    var topics = Apprenticeship.getTeachableTopics('gardener');
    assert(Array.isArray(topics));
  });

  test('gardener can teach farming', () => {
    var topics = Apprenticeship.getTeachableTopics('gardener');
    assert(topics.indexOf('farming') !== -1);
  });

  test('merchant can teach trading', () => {
    var topics = Apprenticeship.getTeachableTopics('merchant');
    assert(topics.indexOf('trading') !== -1);
  });

  test('storyteller can teach history', () => {
    var topics = Apprenticeship.getTeachableTopics('storyteller');
    assert(topics.indexOf('history') !== -1);
  });

  test('builder can teach building', () => {
    var topics = Apprenticeship.getTeachableTopics('builder');
    assert(topics.indexOf('building') !== -1);
  });

  test('musician can teach music', () => {
    var topics = Apprenticeship.getTeachableTopics('musician');
    assert(topics.indexOf('music') !== -1);
  });

  test('healer can teach healing', () => {
    var topics = Apprenticeship.getTeachableTopics('healer');
    assert(topics.indexOf('healing') !== -1);
  });

  test('explorer can teach navigation', () => {
    var topics = Apprenticeship.getTeachableTopics('explorer');
    assert(topics.indexOf('navigation') !== -1);
  });

  test('philosopher can teach stargazing', () => {
    var topics = Apprenticeship.getTeachableTopics('philosopher');
    assert(topics.indexOf('stargazing') !== -1);
  });

  test('artist can teach smithing or building', () => {
    var topics = Apprenticeship.getTeachableTopics('artist');
    assert(topics.indexOf('smithing') !== -1 || topics.indexOf('building') !== -1);
  });

  test('teacher can teach history', () => {
    var topics = Apprenticeship.getTeachableTopics('teacher');
    assert(topics.indexOf('history') !== -1);
  });

  test('unknown archetype returns empty array', () => {
    var topics = Apprenticeship.getTeachableTopics('wizard');
    assert(Array.isArray(topics));
    assert.strictEqual(topics.length, 0);
  });

  test('null archetype returns empty array', () => {
    var topics = Apprenticeship.getTeachableTopics(null);
    assert(Array.isArray(topics));
    assert.strictEqual(topics.length, 0);
  });

  test('returns a copy (mutation does not affect module)', () => {
    var topics1 = Apprenticeship.getTeachableTopics('gardener');
    topics1.push('FAKE');
    var topics2 = Apprenticeship.getTeachableTopics('gardener');
    assert(topics2.indexOf('FAKE') === -1);
  });

  test('all 10 archetypes have at least 2 teachable topics', () => {
    var archetypes = ['gardener','builder','storyteller','merchant','explorer','teacher','musician','healer','philosopher','artist'];
    archetypes.forEach(arch => {
      var topics = Apprenticeship.getTeachableTopics(arch);
      assert(topics.length >= 2, arch + ' should have at least 2 topics');
    });
  });

});

// ============================================================================
// SUITE: startLesson
// ============================================================================

suite('Apprenticeship — startLesson', () => {

  test('returns object with state, lesson, message', () => {
    var s = freshState();
    var result = Apprenticeship.startLesson(s, 'player1', 'npc_001', 'farming');
    assert(typeof result.state === 'object');
    assert(result.lesson !== null && typeof result.lesson === 'object');
    assert(typeof result.message === 'string');
  });

  test('lesson has correct topic', () => {
    var s = freshState();
    var result = Apprenticeship.startLesson(s, 'player1', 'npc_001', 'farming');
    assert.strictEqual(result.lesson.topic, 'farming');
  });

  test('lesson has correct npcId', () => {
    var s = freshState();
    var result = Apprenticeship.startLesson(s, 'player1', 'npc_001', 'farming');
    assert.strictEqual(result.lesson.npcId, 'npc_001');
  });

  test('lesson has correct teacherId', () => {
    var s = freshState();
    var result = Apprenticeship.startLesson(s, 'player1', 'npc_001', 'farming');
    assert.strictEqual(result.lesson.teacherId, 'player1');
  });

  test('lesson starts at step 0', () => {
    var s = freshState();
    var result = Apprenticeship.startLesson(s, 'player1', 'npc_001', 'farming');
    assert.strictEqual(result.lesson.step, 0);
  });

  test('lesson has steps array of length 3', () => {
    var s = freshState();
    var result = Apprenticeship.startLesson(s, 'player1', 'npc_001', 'fishing');
    assert(Array.isArray(result.lesson.steps));
    assert.strictEqual(result.lesson.steps.length, 3);
  });

  test('lesson is not completed at start', () => {
    var s = freshState();
    var result = Apprenticeship.startLesson(s, 'player1', 'npc_001', 'cooking');
    assert.strictEqual(result.lesson.completed, false);
  });

  test('lesson has id', () => {
    var s = freshState();
    var result = Apprenticeship.startLesson(s, 'player1', 'npc_001', 'trading');
    assert(typeof result.lesson.id === 'string' && result.lesson.id.length > 0);
  });

  test('lesson has startedAt timestamp', () => {
    var s = freshState();
    var result = Apprenticeship.startLesson(s, 'player1', 'npc_001', 'trading');
    assert(typeof result.lesson.startedAt === 'number');
  });

  test('lesson added to state.mentorships', () => {
    var s = freshState();
    var result = Apprenticeship.startLesson(s, 'player1', 'npc_001', 'combat');
    assert(result.state.mentorships[result.lesson.id] !== undefined);
  });

  test('original state not mutated', () => {
    var s = freshState();
    var keys1 = Object.keys(s.mentorships).length;
    Apprenticeship.startLesson(s, 'player1', 'npc_001', 'music');
    assert.strictEqual(Object.keys(s.mentorships).length, keys1);
  });

  test('returns error for unknown topic', () => {
    var s = freshState();
    var result = Apprenticeship.startLesson(s, 'player1', 'npc_001', 'alchemy');
    assert.strictEqual(result.lesson, null);
    assert(result.message.toLowerCase().indexOf('unknown') !== -1 || result.message.toLowerCase().indexOf('topic') !== -1);
  });

  test('returns error for null topic', () => {
    var s = freshState();
    var result = Apprenticeship.startLesson(s, 'player1', 'npc_001', null);
    assert.strictEqual(result.lesson, null);
  });

  test('returns error for null playerId', () => {
    var s = freshState();
    var result = Apprenticeship.startLesson(s, null, 'npc_001', 'farming');
    assert.strictEqual(result.lesson, null);
  });

  test('returns error for null npcId', () => {
    var s = freshState();
    var result = Apprenticeship.startLesson(s, 'player1', null, 'farming');
    assert.strictEqual(result.lesson, null);
  });

  test('cannot start duplicate lesson for same NPC', () => {
    var s = freshState();
    var r1 = Apprenticeship.startLesson(s, 'player1', 'npc_001', 'farming');
    var r2 = Apprenticeship.startLesson(r1.state, 'player1', 'npc_001', 'cooking');
    assert.strictEqual(r2.lesson, null);
    assert(r2.message.toLowerCase().indexOf('already') !== -1 || r2.message.toLowerCase().indexOf('active') !== -1);
  });

  test('can start lessons with different NPCs simultaneously', () => {
    var s = freshState();
    var r1 = Apprenticeship.startLesson(s, 'player1', 'npc_001', 'farming');
    var r2 = Apprenticeship.startLesson(r1.state, 'player1', 'npc_002', 'fishing');
    assert(r2.lesson !== null);
  });

  test('lesson IDs are unique across multiple calls', () => {
    var s = freshState();
    var r1 = Apprenticeship.startLesson(s, 'player1', 'npc_001', 'farming');
    var r2 = Apprenticeship.startLesson(r1.state, 'player1', 'npc_002', 'fishing');
    assert(r1.lesson.id !== r2.lesson.id);
  });

});

// ============================================================================
// SUITE: advanceLesson
// ============================================================================

suite('Apprenticeship — advanceLesson', () => {

  function setupLesson(topic) {
    var s = freshState();
    topic = topic || 'farming';
    var result = Apprenticeship.startLesson(s, 'player1', 'npc_001', topic);
    return { state: result.state, lessonId: result.lesson.id, steps: result.lesson.steps };
  }

  test('returns state, step, completed, reward, message', () => {
    var setup = setupLesson();
    var r = Apprenticeship.advanceLesson(setup.state, setup.lessonId, setup.steps[0].action);
    assert(typeof r.state === 'object');
    assert(typeof r.completed === 'boolean');
    assert(typeof r.message === 'string');
  });

  test('step 0 advances to step 1 with correct action', () => {
    var setup = setupLesson();
    var r = Apprenticeship.advanceLesson(setup.state, setup.lessonId, setup.steps[0].action);
    assert.strictEqual(r.state.mentorships[setup.lessonId].step, 1);
  });

  test('step 1 advances to step 2 with correct action', () => {
    var setup = setupLesson();
    var r1 = Apprenticeship.advanceLesson(setup.state, setup.lessonId, setup.steps[0].action);
    var r2 = Apprenticeship.advanceLesson(r1.state, setup.lessonId, setup.steps[1].action);
    assert.strictEqual(r2.state.mentorships[setup.lessonId].step, 2);
  });

  test('completing step 2 marks readyToComplete', () => {
    var setup = setupLesson();
    var s = setup.state;
    s = Apprenticeship.advanceLesson(s, setup.lessonId, setup.steps[0].action).state;
    s = Apprenticeship.advanceLesson(s, setup.lessonId, setup.steps[1].action).state;
    var r = Apprenticeship.advanceLesson(s, setup.lessonId, setup.steps[2].action);
    assert.strictEqual(r.completed, true);
    assert(r.state.mentorships[setup.lessonId].readyToComplete === true);
  });

  test('wrong action returns failure message', () => {
    var setup = setupLesson();
    var r = Apprenticeship.advanceLesson(setup.state, setup.lessonId, 'wrong_action');
    assert(r.message.toLowerCase().indexOf('incorrect') !== -1 || r.message.toLowerCase().indexOf('expected') !== -1);
  });

  test('wrong action does not advance step', () => {
    var setup = setupLesson();
    var r = Apprenticeship.advanceLesson(setup.state, setup.lessonId, 'wrong_action');
    assert.strictEqual(r.state.mentorships[setup.lessonId].step, 0);
  });

  test('wrong action completed is false', () => {
    var setup = setupLesson();
    var r = Apprenticeship.advanceLesson(setup.state, setup.lessonId, 'wrong_action');
    assert.strictEqual(r.completed, false);
  });

  test('returns error for unknown lessonId', () => {
    var s = freshState();
    var r = Apprenticeship.advanceLesson(s, 'lesson_bogus', 'gather_herb');
    assert(r.message.toLowerCase().indexOf('not found') !== -1 || r.message.toLowerCase().indexOf('lesson') !== -1);
  });

  test('advance already-completed lesson returns completed status', () => {
    var setup = setupLesson();
    var s = setup.state;
    s = Apprenticeship.advanceLesson(s, setup.lessonId, setup.steps[0].action).state;
    s = Apprenticeship.advanceLesson(s, setup.lessonId, setup.steps[1].action).state;
    s = Apprenticeship.advanceLesson(s, setup.lessonId, setup.steps[2].action).state;
    var comp = Apprenticeship.completeLesson(s, setup.lessonId);
    var r = Apprenticeship.advanceLesson(comp.state, setup.lessonId, 'gather_herb');
    assert.strictEqual(r.completed, true);
  });

  test('original state not mutated on advance', () => {
    var setup = setupLesson();
    var stepBefore = setup.state.mentorships[setup.lessonId].step;
    Apprenticeship.advanceLesson(setup.state, setup.lessonId, setup.steps[0].action);
    assert.strictEqual(setup.state.mentorships[setup.lessonId].step, stepBefore);
  });

  test('after step 0, nextStep is step 1 data', () => {
    var setup = setupLesson();
    var r = Apprenticeship.advanceLesson(setup.state, setup.lessonId, setup.steps[0].action);
    assert(r.step !== null);
    assert.strictEqual(r.step.index, 1);
  });

  test('after final step, nextStep is null', () => {
    var setup = setupLesson();
    var s = setup.state;
    s = Apprenticeship.advanceLesson(s, setup.lessonId, setup.steps[0].action).state;
    s = Apprenticeship.advanceLesson(s, setup.lessonId, setup.steps[1].action).state;
    var r = Apprenticeship.advanceLesson(s, setup.lessonId, setup.steps[2].action);
    assert.strictEqual(r.step, null);
  });

  test('advance works for all 12 topics step 0', () => {
    Object.keys(Apprenticeship.TOPICS).forEach(topic => {
      var s = freshState();
      var start = Apprenticeship.startLesson(s, 'p1', 'npc_x', topic);
      var steps = start.lesson.steps;
      var r = Apprenticeship.advanceLesson(start.state, start.lesson.id, steps[0].action);
      assert.strictEqual(r.state.mentorships[start.lesson.id].step, 1, topic + ' step 0 failed');
    });
  });

});

// ============================================================================
// SUITE: completeLesson
// ============================================================================

suite('Apprenticeship — completeLesson', () => {

  function fullyAdvanced(topic) {
    topic = topic || 'farming';
    var s = freshState();
    var start = Apprenticeship.startLesson(s, 'player1', 'npc_001', topic);
    var st = start.state;
    var lessonId = start.lesson.id;
    var steps = start.lesson.steps;
    st = Apprenticeship.advanceLesson(st, lessonId, steps[0].action).state;
    st = Apprenticeship.advanceLesson(st, lessonId, steps[1].action).state;
    st = Apprenticeship.advanceLesson(st, lessonId, steps[2].action).state;
    return { state: st, lessonId: lessonId };
  }

  test('returns state, playerReward, npcSkillGain, message', () => {
    var fa = fullyAdvanced();
    var r = Apprenticeship.completeLesson(fa.state, fa.lessonId);
    assert(typeof r.state === 'object');
    assert(typeof r.playerReward === 'object' && r.playerReward !== null);
    assert(typeof r.npcSkillGain === 'object' && r.npcSkillGain !== null);
    assert(typeof r.message === 'string');
  });

  test('lesson is marked completed', () => {
    var fa = fullyAdvanced();
    var r = Apprenticeship.completeLesson(fa.state, fa.lessonId);
    assert.strictEqual(r.state.mentorships[fa.lessonId].completed, true);
  });

  test('playerReward has xp matching topic xpReward', () => {
    var fa = fullyAdvanced('farming');
    var r = Apprenticeship.completeLesson(fa.state, fa.lessonId);
    assert.strictEqual(r.playerReward.xp, Apprenticeship.TOPICS.farming.xpReward);
  });

  test('playerReward has spark matching topic sparkReward', () => {
    var fa = fullyAdvanced('farming');
    var r = Apprenticeship.completeLesson(fa.state, fa.lessonId);
    assert.strictEqual(r.playerReward.spark, Apprenticeship.TOPICS.farming.sparkReward);
  });

  test('playerReward has teacherRank', () => {
    var fa = fullyAdvanced();
    var r = Apprenticeship.completeLesson(fa.state, fa.lessonId);
    assert(typeof r.playerReward.teacherRank === 'string' && r.playerReward.teacherRank.length > 0);
  });

  test('npcSkillGain.before is 0 for untrained NPC', () => {
    var fa = fullyAdvanced('farming');
    var r = Apprenticeship.completeLesson(fa.state, fa.lessonId);
    assert.strictEqual(r.npcSkillGain.before, 0);
  });

  test('npcSkillGain.after is 1 after first lesson', () => {
    var fa = fullyAdvanced('farming');
    var r = Apprenticeship.completeLesson(fa.state, fa.lessonId);
    assert.strictEqual(r.npcSkillGain.after, 1);
  });

  test('npcSkillGain.skillName reflects new level', () => {
    var fa = fullyAdvanced('farming');
    var r = Apprenticeship.completeLesson(fa.state, fa.lessonId);
    assert.strictEqual(r.npcSkillGain.skillName, 'Novice');
  });

  test('npcSkill in state updated to 1', () => {
    var fa = fullyAdvanced('farming');
    var r = Apprenticeship.completeLesson(fa.state, fa.lessonId);
    var skill = Apprenticeship.getNPCSkill(r.state, 'npc_001', 'farming');
    assert.strictEqual(skill, 1);
  });

  test('playerTeachingXP updated in state', () => {
    var fa = fullyAdvanced('farming');
    var r = Apprenticeship.completeLesson(fa.state, fa.lessonId);
    assert.strictEqual(r.state.playerTeachingXP['player1'], Apprenticeship.TOPICS.farming.xpReward);
  });

  test('lesson record added to lessonHistory', () => {
    var fa = fullyAdvanced('farming');
    var r = Apprenticeship.completeLesson(fa.state, fa.lessonId);
    assert.strictEqual(r.state.lessonHistory.length, 1);
  });

  test('lessonHistory record has correct fields', () => {
    var fa = fullyAdvanced('farming');
    var r = Apprenticeship.completeLesson(fa.state, fa.lessonId);
    var rec = r.state.lessonHistory[0];
    assert.strictEqual(rec.teacherId, 'player1');
    assert.strictEqual(rec.npcId, 'npc_001');
    assert.strictEqual(rec.topic, 'farming');
    assert(typeof rec.completedAt === 'number');
  });

  test('error if lesson not finished (no readyToComplete)', () => {
    var s = freshState();
    var start = Apprenticeship.startLesson(s, 'p1', 'npc_x', 'fishing');
    var r = Apprenticeship.completeLesson(start.state, start.lesson.id);
    assert.strictEqual(r.playerReward, null);
    assert(r.message.toLowerCase().indexOf('step') !== -1 || r.message.toLowerCase().indexOf('finish') !== -1 || r.message.toLowerCase().indexOf('not yet') !== -1);
  });

  test('error if lesson already completed', () => {
    var fa = fullyAdvanced();
    var r1 = Apprenticeship.completeLesson(fa.state, fa.lessonId);
    var r2 = Apprenticeship.completeLesson(r1.state, fa.lessonId);
    assert.strictEqual(r2.playerReward, null);
    assert(r2.message.toLowerCase().indexOf('already') !== -1);
  });

  test('error for unknown lessonId', () => {
    var s = freshState();
    var r = Apprenticeship.completeLesson(s, 'bogus_id');
    assert.strictEqual(r.playerReward, null);
  });

  test('NPC skill caps at 5 (Master) regardless of lessons', () => {
    // Teach same NPC 6 times, skill should not exceed 5
    var state = freshState();
    for (var i = 0; i < 6; i++) {
      var npcId = 'npc_cap_test';
      // Use a different second NPC to avoid duplicate lesson error; farm on npc_cap_test
      var start = Apprenticeship.startLesson(state, 'p1', npcId, 'fishing');
      if (!start.lesson) { break; }
      var s = start.state;
      var lessonId = start.lesson.id;
      var steps = start.lesson.steps;
      s = Apprenticeship.advanceLesson(s, lessonId, steps[0].action).state;
      s = Apprenticeship.advanceLesson(s, lessonId, steps[1].action).state;
      s = Apprenticeship.advanceLesson(s, lessonId, steps[2].action).state;
      var comp = Apprenticeship.completeLesson(s, lessonId);
      state = comp.state;
    }
    var finalSkill = Apprenticeship.getNPCSkill(state, 'npc_cap_test', 'fishing');
    assert(finalSkill <= 5, 'Skill should not exceed 5, got ' + finalSkill);
  });

  test('XP accumulates across multiple lessons', () => {
    var state = freshState();
    // Teach two different NPCs
    for (var i = 0; i < 2; i++) {
      var npcId = 'npc_multi_' + i;
      var start = Apprenticeship.startLesson(state, 'p1', npcId, 'farming');
      var s = start.state;
      var lessonId = start.lesson.id;
      var steps = start.lesson.steps;
      s = Apprenticeship.advanceLesson(s, lessonId, steps[0].action).state;
      s = Apprenticeship.advanceLesson(s, lessonId, steps[1].action).state;
      s = Apprenticeship.advanceLesson(s, lessonId, steps[2].action).state;
      var comp = Apprenticeship.completeLesson(s, lessonId);
      state = comp.state;
    }
    var totalXP = state.playerTeachingXP['p1'];
    assert.strictEqual(totalXP, Apprenticeship.TOPICS.farming.xpReward * 2);
  });

});

// ============================================================================
// SUITE: getNPCSkill
// ============================================================================

suite('Apprenticeship — getNPCSkill', () => {

  test('returns 0 for untrained NPC', () => {
    var s = freshState();
    assert.strictEqual(Apprenticeship.getNPCSkill(s, 'npc_001', 'farming'), 0);
  });

  test('returns 0 for unknown NPC', () => {
    var s = freshState();
    assert.strictEqual(Apprenticeship.getNPCSkill(s, 'ghost_npc', 'combat'), 0);
  });

  test('returns correct skill after lesson', () => {
    var fa = (function() {
      var s = freshState();
      var start = Apprenticeship.startLesson(s, 'p1', 'npc_001', 'combat');
      var st = start.state;
      var lessonId = start.lesson.id;
      var steps = start.lesson.steps;
      st = Apprenticeship.advanceLesson(st, lessonId, steps[0].action).state;
      st = Apprenticeship.advanceLesson(st, lessonId, steps[1].action).state;
      st = Apprenticeship.advanceLesson(st, lessonId, steps[2].action).state;
      return Apprenticeship.completeLesson(st, lessonId).state;
    })();
    assert.strictEqual(Apprenticeship.getNPCSkill(fa, 'npc_001', 'combat'), 1);
  });

  test('returns 0 for NPC that exists but not this topic', () => {
    var s = freshState();
    s.npcSkills['npc_001'] = { farming: 2 };
    assert.strictEqual(Apprenticeship.getNPCSkill(s, 'npc_001', 'combat'), 0);
  });

  test('handles null state gracefully', () => {
    assert.strictEqual(Apprenticeship.getNPCSkill(null, 'npc_001', 'farming'), 0);
  });

});

// ============================================================================
// SUITE: getTeacherRank
// ============================================================================

suite('Apprenticeship — getTeacherRank', () => {

  test('0 XP returns Tutor', () => {
    assert.strictEqual(Apprenticeship.getTeacherRank(0), 'Tutor');
  });

  test('49 XP returns Tutor', () => {
    assert.strictEqual(Apprenticeship.getTeacherRank(49), 'Tutor');
  });

  test('50 XP returns Instructor', () => {
    assert.strictEqual(Apprenticeship.getTeacherRank(50), 'Instructor');
  });

  test('149 XP returns Instructor', () => {
    assert.strictEqual(Apprenticeship.getTeacherRank(149), 'Instructor');
  });

  test('150 XP returns Professor', () => {
    assert.strictEqual(Apprenticeship.getTeacherRank(150), 'Professor');
  });

  test('299 XP returns Professor', () => {
    assert.strictEqual(Apprenticeship.getTeacherRank(299), 'Professor');
  });

  test('300 XP returns Grand Teacher', () => {
    assert.strictEqual(Apprenticeship.getTeacherRank(300), 'Grand Teacher');
  });

  test('999 XP returns Grand Teacher', () => {
    assert.strictEqual(Apprenticeship.getTeacherRank(999), 'Grand Teacher');
  });

  test('undefined XP returns Tutor', () => {
    assert.strictEqual(Apprenticeship.getTeacherRank(undefined), 'Tutor');
  });

  test('negative XP returns Tutor', () => {
    assert.strictEqual(Apprenticeship.getTeacherRank(-10), 'Tutor');
  });

  test('exactly 100 XP returns Instructor', () => {
    assert.strictEqual(Apprenticeship.getTeacherRank(100), 'Instructor');
  });

});

// ============================================================================
// SUITE: getPlayerTeachingStats
// ============================================================================

suite('Apprenticeship — getPlayerTeachingStats', () => {

  test('returns default stats for player with no history', () => {
    var s = freshState();
    var stats = Apprenticeship.getPlayerTeachingStats(s, 'player1');
    assert.strictEqual(stats.totalLessons, 0);
    assert.strictEqual(stats.teachingXP, 0);
    assert.strictEqual(stats.teacherRank, 'Tutor');
    assert(Array.isArray(stats.topicsTaught));
    assert(Array.isArray(stats.studentsTaught));
  });

  test('totalLessons increments after completed lessons', () => {
    var r = runFullLesson(freshState(), 'p1', 'npc_001', 'farming');
    var stats = Apprenticeship.getPlayerTeachingStats(r.state, 'p1');
    assert.strictEqual(stats.totalLessons, 1);
  });

  test('topicsTaught lists taught topics', () => {
    var r = runFullLesson(freshState(), 'p1', 'npc_001', 'farming');
    var stats = Apprenticeship.getPlayerTeachingStats(r.state, 'p1');
    assert(stats.topicsTaught.indexOf('farming') !== -1);
  });

  test('studentsTaught lists NPC IDs', () => {
    var r = runFullLesson(freshState(), 'p1', 'npc_001', 'farming');
    var stats = Apprenticeship.getPlayerTeachingStats(r.state, 'p1');
    assert(stats.studentsTaught.indexOf('npc_001') !== -1);
  });

  test('teachingXP reflects accumulated XP', () => {
    var r = runFullLesson(freshState(), 'p1', 'npc_001', 'farming');
    var stats = Apprenticeship.getPlayerTeachingStats(r.state, 'p1');
    assert.strictEqual(stats.teachingXP, Apprenticeship.TOPICS.farming.xpReward);
  });

  test('teacherRank updates with XP', () => {
    // Need 50 XP for Instructor. smithing gives 35, farming gives 30 = 65 total
    var s = freshState();
    var r1 = runFullLesson(s, 'p1', 'npc_001', 'smithing');
    var r2 = runFullLesson(r1.state, 'p1', 'npc_002', 'farming');
    var stats = Apprenticeship.getPlayerTeachingStats(r2.state, 'p1');
    assert.strictEqual(stats.teacherRank, 'Instructor');
  });

  test('handles null state', () => {
    var stats = Apprenticeship.getPlayerTeachingStats(null, 'p1');
    assert.strictEqual(stats.totalLessons, 0);
  });

  test('handles null playerId', () => {
    var stats = Apprenticeship.getPlayerTeachingStats(freshState(), null);
    assert.strictEqual(stats.totalLessons, 0);
  });

  test('student count is unique NPCs', () => {
    // Teach same NPC two different topics counts as 1 student
    var s = freshState();
    var r1 = runFullLesson(s, 'p1', 'npc_001', 'farming');
    var r2 = runFullLesson(r1.state, 'p1', 'npc_001', 'fishing');
    var stats = Apprenticeship.getPlayerTeachingStats(r2.state, 'p1');
    assert.strictEqual(stats.studentsTaught.length, 1);
  });

  test('topic count is unique topics', () => {
    // Teach farming to two NPCs — still 1 topic
    var s = freshState();
    var r1 = runFullLesson(s, 'p1', 'npc_001', 'farming');
    var r2 = runFullLesson(r1.state, 'p1', 'npc_002', 'farming');
    var stats = Apprenticeship.getPlayerTeachingStats(r2.state, 'p1');
    assert.strictEqual(stats.topicsTaught.length, 1);
  });

});

// ============================================================================
// SUITE: getActiveLessons
// ============================================================================

suite('Apprenticeship — getActiveLessons', () => {

  test('returns empty array for player with no lessons', () => {
    var s = freshState();
    var active = Apprenticeship.getActiveLessons(s, 'p1');
    assert(Array.isArray(active));
    assert.strictEqual(active.length, 0);
  });

  test('returns started lessons', () => {
    var s = freshState();
    var r = Apprenticeship.startLesson(s, 'p1', 'npc_001', 'farming');
    var active = Apprenticeship.getActiveLessons(r.state, 'p1');
    assert.strictEqual(active.length, 1);
  });

  test('does not return completed lessons', () => {
    var r = runFullLesson(freshState(), 'p1', 'npc_001', 'farming');
    var active = Apprenticeship.getActiveLessons(r.state, 'p1');
    assert.strictEqual(active.length, 0);
  });

  test('returns only lessons for the specified player', () => {
    var s = freshState();
    var r1 = Apprenticeship.startLesson(s, 'p1', 'npc_001', 'farming');
    var r2 = Apprenticeship.startLesson(r1.state, 'p2', 'npc_002', 'fishing');
    var active = Apprenticeship.getActiveLessons(r2.state, 'p1');
    assert.strictEqual(active.length, 1);
    assert.strictEqual(active[0].teacherId, 'p1');
  });

  test('handles null state', () => {
    var active = Apprenticeship.getActiveLessons(null, 'p1');
    assert(Array.isArray(active));
    assert.strictEqual(active.length, 0);
  });

});

// ============================================================================
// SUITE: getNPCStudents
// ============================================================================

suite('Apprenticeship — getNPCStudents', () => {

  test('returns empty array with no history', () => {
    var students = Apprenticeship.getNPCStudents(freshState(), 'p1');
    assert(Array.isArray(students));
    assert.strictEqual(students.length, 0);
  });

  test('returns NPC after completed lesson', () => {
    var r = runFullLesson(freshState(), 'p1', 'npc_001', 'farming');
    var students = Apprenticeship.getNPCStudents(r.state, 'p1');
    assert(students.indexOf('npc_001') !== -1);
  });

  test('returns only unique students', () => {
    var s = freshState();
    var r1 = runFullLesson(s, 'p1', 'npc_001', 'farming');
    var r2 = runFullLesson(r1.state, 'p1', 'npc_001', 'fishing');
    var students = Apprenticeship.getNPCStudents(r2.state, 'p1');
    assert.strictEqual(students.filter(x => x === 'npc_001').length, 1);
  });

  test('does not include NPCs taught by other players', () => {
    var s = freshState();
    var r1 = runFullLesson(s, 'p1', 'npc_001', 'farming');
    var r2 = runFullLesson(r1.state, 'p2', 'npc_002', 'fishing');
    var students = Apprenticeship.getNPCStudents(r2.state, 'p1');
    assert(students.indexOf('npc_002') === -1);
  });

  test('handles null state', () => {
    var students = Apprenticeship.getNPCStudents(null, 'p1');
    assert(Array.isArray(students));
  });

});

// ============================================================================
// SUITE: Formatting functions
// ============================================================================

suite('Apprenticeship — formatLessonCard', () => {

  test('returns HTML string', () => {
    var s = freshState();
    var r = Apprenticeship.startLesson(s, 'p1', 'npc_001', 'farming');
    var html = Apprenticeship.formatLessonCard(r.lesson);
    assert(typeof html === 'string');
    assert(html.indexOf('<') !== -1);
  });

  test('contains topic name', () => {
    var s = freshState();
    var r = Apprenticeship.startLesson(s, 'p1', 'npc_001', 'farming');
    var html = Apprenticeship.formatLessonCard(r.lesson);
    assert(html.indexOf('Farming') !== -1);
  });

  test('contains NPC ID', () => {
    var s = freshState();
    var r = Apprenticeship.startLesson(s, 'p1', 'npc_001', 'fishing');
    var html = Apprenticeship.formatLessonCard(r.lesson);
    assert(html.indexOf('npc_001') !== -1);
  });

  test('contains progress information', () => {
    var s = freshState();
    var r = Apprenticeship.startLesson(s, 'p1', 'npc_001', 'cooking');
    var html = Apprenticeship.formatLessonCard(r.lesson);
    assert(html.indexOf('Step') !== -1 || html.indexOf('step') !== -1 || html.indexOf('%') !== -1);
  });

  test('handles null gracefully', () => {
    var html = Apprenticeship.formatLessonCard(null);
    assert(typeof html === 'string');
  });

});

suite('Apprenticeship — formatTeacherProfile', () => {

  test('returns HTML string', () => {
    var stats = Apprenticeship.getPlayerTeachingStats(freshState(), 'p1');
    var html = Apprenticeship.formatTeacherProfile(stats);
    assert(typeof html === 'string');
    assert(html.indexOf('<') !== -1);
  });

  test('contains teacher rank', () => {
    var stats = Apprenticeship.getPlayerTeachingStats(freshState(), 'p1');
    var html = Apprenticeship.formatTeacherProfile(stats);
    assert(html.indexOf('Tutor') !== -1);
  });

  test('contains XP label', () => {
    var stats = Apprenticeship.getPlayerTeachingStats(freshState(), 'p1');
    var html = Apprenticeship.formatTeacherProfile(stats);
    assert(html.toLowerCase().indexOf('xp') !== -1 || html.indexOf('XP') !== -1);
  });

  test('contains lessons count label', () => {
    var stats = Apprenticeship.getPlayerTeachingStats(freshState(), 'p1');
    var html = Apprenticeship.formatTeacherProfile(stats);
    assert(html.toLowerCase().indexOf('lesson') !== -1);
  });

  test('handles null gracefully', () => {
    var html = Apprenticeship.formatTeacherProfile(null);
    assert(typeof html === 'string');
  });

});

suite('Apprenticeship — formatNPCSkillCard', () => {

  test('returns HTML string', () => {
    var html = Apprenticeship.formatNPCSkillCard('npc_001', {});
    assert(typeof html === 'string');
    assert(html.indexOf('<') !== -1);
  });

  test('contains NPC ID', () => {
    var html = Apprenticeship.formatNPCSkillCard('npc_teacher_01', {});
    assert(html.indexOf('npc_teacher_01') !== -1);
  });

  test('shows skill topic name when skills present', () => {
    var html = Apprenticeship.formatNPCSkillCard('npc_001', { farming: 2 });
    assert(html.indexOf('Farming') !== -1);
  });

  test('shows skill level name', () => {
    var html = Apprenticeship.formatNPCSkillCard('npc_001', { farming: 2 });
    assert(html.indexOf('Practiced') !== -1);
  });

  test('shows No skills message when empty', () => {
    var html = Apprenticeship.formatNPCSkillCard('npc_001', {});
    assert(html.toLowerCase().indexOf('no skill') !== -1 || html.toLowerCase().indexOf('none') !== -1 || html.toLowerCase().indexOf('not yet') !== -1 || html.toLowerCase().indexOf('no ') !== -1);
  });

  test('handles null npcId gracefully', () => {
    var html = Apprenticeship.formatNPCSkillCard(null, {});
    assert(typeof html === 'string');
  });

  test('handles null skills gracefully', () => {
    var html = Apprenticeship.formatNPCSkillCard('npc_001', null);
    assert(typeof html === 'string');
  });

  test('multiple skills all appear', () => {
    var html = Apprenticeship.formatNPCSkillCard('npc_001', { farming: 1, fishing: 3 });
    assert(html.indexOf('Farming') !== -1);
    assert(html.indexOf('Fishing') !== -1);
  });

});

// ============================================================================
// SUITE: LESSON_STEPS exported data
// ============================================================================

suite('Apprenticeship — LESSON_STEPS exported data', () => {

  test('LESSON_STEPS is exported', () => {
    assert(typeof Apprenticeship.LESSON_STEPS === 'object');
  });

  test('LESSON_STEPS has all 12 topics', () => {
    Object.keys(Apprenticeship.TOPICS).forEach(topic => {
      assert(Apprenticeship.LESSON_STEPS[topic] !== undefined, 'Missing LESSON_STEPS for: ' + topic);
    });
  });

  test('farming step 0 action is gather_herb', () => {
    assert.strictEqual(Apprenticeship.LESSON_STEPS.farming[0].action, 'gather_herb');
  });

  test('smithing step 0 action is gather_ore', () => {
    assert.strictEqual(Apprenticeship.LESSON_STEPS.smithing[0].action, 'gather_ore');
  });

  test('combat step 1 action is spar', () => {
    assert.strictEqual(Apprenticeship.LESSON_STEPS.combat[1].action, 'spar');
  });

  test('music step 0 action is clap_rhythm', () => {
    assert.strictEqual(Apprenticeship.LESSON_STEPS.music[0].action, 'clap_rhythm');
  });

});

// ============================================================================
// SUITE: TEACHER_RANKS exported data
// ============================================================================

suite('Apprenticeship — TEACHER_RANKS exported data', () => {

  test('TEACHER_RANKS is exported as array', () => {
    assert(Array.isArray(Apprenticeship.TEACHER_RANKS));
  });

  test('TEACHER_RANKS has 4 entries', () => {
    assert.strictEqual(Apprenticeship.TEACHER_RANKS.length, 4);
  });

  test('rank names are correct', () => {
    var names = Apprenticeship.TEACHER_RANKS.map(r => r.rank);
    assert(names.indexOf('Tutor') !== -1);
    assert(names.indexOf('Instructor') !== -1);
    assert(names.indexOf('Professor') !== -1);
    assert(names.indexOf('Grand Teacher') !== -1);
  });

});

// ============================================================================
// SUITE: ARCHETYPE_TOPICS exported data
// ============================================================================

suite('Apprenticeship — ARCHETYPE_TOPICS exported data', () => {

  test('ARCHETYPE_TOPICS is exported', () => {
    assert(typeof Apprenticeship.ARCHETYPE_TOPICS === 'object');
  });

  test('has all 10 archetypes', () => {
    var archetypes = ['gardener','builder','storyteller','merchant','explorer','teacher','musician','healer','philosopher','artist'];
    archetypes.forEach(a => {
      assert(Apprenticeship.ARCHETYPE_TOPICS[a] !== undefined, 'Missing archetype: ' + a);
    });
  });

  test('all topic references in ARCHETYPE_TOPICS are valid TOPICS keys', () => {
    Object.entries(Apprenticeship.ARCHETYPE_TOPICS).forEach(([arch, topicList]) => {
      topicList.forEach(t => {
        assert(Apprenticeship.TOPICS[t] !== undefined, arch + ' references unknown topic: ' + t);
      });
    });
  });

});

// ============================================================================
// SUITE: Edge Cases
// ============================================================================

suite('Apprenticeship — Edge Cases', () => {

  test('startLesson with empty string topic fails', () => {
    var r = Apprenticeship.startLesson(freshState(), 'p1', 'npc_x', '');
    assert.strictEqual(r.lesson, null);
  });

  test('advanceLesson with null action fails gracefully', () => {
    var s = freshState();
    var r = Apprenticeship.startLesson(s, 'p1', 'npc_x', 'farming');
    var adv = Apprenticeship.advanceLesson(r.state, r.lesson.id, null);
    assert.strictEqual(adv.completed, false);
    assert(typeof adv.message === 'string');
  });

  test('completeLesson with null state returns error', () => {
    var r = Apprenticeship.completeLesson(null, 'some_id');
    assert.strictEqual(r.playerReward, null);
  });

  test('getActiveLessons with no mentorships key', () => {
    var s = { npcSkills: {}, lessonHistory: [], playerTeachingXP: {} };
    var active = Apprenticeship.getActiveLessons(s, 'p1');
    assert(Array.isArray(active));
  });

  test('multiple players can have concurrent lessons with same NPC', () => {
    var s = freshState();
    var r1 = Apprenticeship.startLesson(s, 'p1', 'npc_001', 'farming');
    var r2 = Apprenticeship.startLesson(r1.state, 'p2', 'npc_001', 'farming');
    // Different players, same NPC — allowed
    assert(r2.lesson !== null, 'Different players should be able to teach same NPC');
  });

  test('getLessonSteps for undefined returns null', () => {
    assert.strictEqual(Apprenticeship.getLessonSteps(undefined), null);
  });

  test('getNPCStudents for player with no lessons returns empty', () => {
    var s = freshState();
    var r = runFullLesson(s, 'p1', 'npc_001', 'farming');
    var students = Apprenticeship.getNPCStudents(r.state, 'p_nobody');
    assert.strictEqual(students.length, 0);
  });

  test('full lesson workflow: all 12 topics complete without error', () => {
    var topics = Object.keys(Apprenticeship.TOPICS);
    topics.forEach((topic, i) => {
      var s = freshState();
      var npcId = 'npc_full_' + i;
      var r = runFullLesson(s, 'p_full', npcId, topic);
      assert(r.playerReward !== null, topic + ' should complete successfully');
      assert(r.npcSkillGain !== null, topic + ' npcSkillGain should not be null');
    });
  });

  test('state immutability: original state unchanged after startLesson', () => {
    var s = freshState();
    var originalKeys = JSON.stringify(Object.keys(s.mentorships));
    Apprenticeship.startLesson(s, 'p1', 'npc_001', 'farming');
    assert.strictEqual(JSON.stringify(Object.keys(s.mentorships)), originalKeys);
  });

  test('state immutability: original state unchanged after advanceLesson', () => {
    var s = freshState();
    var r = Apprenticeship.startLesson(s, 'p1', 'npc_001', 'farming');
    var stepBefore = r.state.mentorships[r.lesson.id].step;
    Apprenticeship.advanceLesson(r.state, r.lesson.id, r.lesson.steps[0].action);
    assert.strictEqual(r.state.mentorships[r.lesson.id].step, stepBefore);
  });

});

// ============================================================================
// RUN
// ============================================================================

if (!report()) {
  process.exit(1);
}
