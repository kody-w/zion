const { test, suite, report, assert } = require('./test_runner');
const Mentoring = require('../src/js/mentoring');

// Reset module state between test suites by re-initialising with empty data
function resetState() {
  Mentoring.initMentoring({
    playerSkills: {},
    mentorships: {},
    mentorshipOffers: {},
    npcLessons: {}
  });
}

suite('Mentoring — SKILLS configuration', () => {

  test('SKILLS object contains all 8 skill types', () => {
    const expectedSkills = ['gardening', 'crafting', 'building', 'exploration', 'trading', 'social', 'combat', 'lore'];
    expectedSkills.forEach(skill => {
      assert(Mentoring.SKILLS[skill] !== undefined, `Missing skill: ${skill}`);
    });
    assert.strictEqual(Object.keys(Mentoring.SKILLS).length, 8);
  });

  test('Each skill has name, levels array, xpPerLevel array', () => {
    Object.entries(Mentoring.SKILLS).forEach(([key, skill]) => {
      assert(typeof skill.name === 'string', `${key} must have string name`);
      assert(Array.isArray(skill.levels), `${key} must have levels array`);
      assert(Array.isArray(skill.xpPerLevel), `${key} must have xpPerLevel array`);
    });
  });

  test('Each skill has exactly 5 levels', () => {
    Object.entries(Mentoring.SKILLS).forEach(([key, skill]) => {
      assert.strictEqual(skill.levels.length, 5, `${key} should have 5 levels`);
      assert.strictEqual(skill.xpPerLevel.length, 5, `${key} should have 5 xpPerLevel entries`);
    });
  });

  test('XP thresholds are [0, 100, 300, 600, 1000] for all skills', () => {
    const expectedThresholds = [0, 100, 300, 600, 1000];
    Object.entries(Mentoring.SKILLS).forEach(([key, skill]) => {
      assert.deepStrictEqual(skill.xpPerLevel, expectedThresholds, `${key} has unexpected XP thresholds`);
    });
  });

  test('XP thresholds are non-decreasing', () => {
    Object.entries(Mentoring.SKILLS).forEach(([key, skill]) => {
      for (let i = 1; i < skill.xpPerLevel.length; i++) {
        assert(
          skill.xpPerLevel[i] >= skill.xpPerLevel[i - 1],
          `${key} xpPerLevel[${i}] is not >= xpPerLevel[${i - 1}]`
        );
      }
    });
  });

  test('Level 0 XP threshold is always 0', () => {
    Object.entries(Mentoring.SKILLS).forEach(([key, skill]) => {
      assert.strictEqual(skill.xpPerLevel[0], 0, `${key} level 0 threshold should be 0`);
    });
  });

});

suite('Mentoring — NPC Teaching Specialties', () => {

  test('NPC_TEACHING_SPECIALTIES maps archetypes to skills', () => {
    assert(typeof Mentoring.NPC_TEACHING_SPECIALTIES === 'object');
    const keys = Object.keys(Mentoring.NPC_TEACHING_SPECIALTIES);
    assert(keys.length > 0, 'Should have at least one specialty mapping');
  });

  test('All mapped skills are valid SKILLS keys', () => {
    Object.entries(Mentoring.NPC_TEACHING_SPECIALTIES).forEach(([archetype, skill]) => {
      assert(
        Mentoring.SKILLS[skill] !== undefined,
        `Archetype ${archetype} maps to unknown skill: ${skill}`
      );
    });
  });

  test('gardener archetype teaches gardening', () => {
    assert.strictEqual(Mentoring.NPC_TEACHING_SPECIALTIES.gardener, 'gardening');
  });

  test('builder archetype teaches building', () => {
    assert.strictEqual(Mentoring.NPC_TEACHING_SPECIALTIES.builder, 'building');
  });

  test('explorer archetype teaches exploration', () => {
    assert.strictEqual(Mentoring.NPC_TEACHING_SPECIALTIES.explorer, 'exploration');
  });

  test('merchant archetype teaches trading', () => {
    assert.strictEqual(Mentoring.NPC_TEACHING_SPECIALTIES.merchant, 'trading');
  });

  test('scholar archetype teaches lore', () => {
    assert.strictEqual(Mentoring.NPC_TEACHING_SPECIALTIES.scholar, 'lore');
  });

  test('warrior archetype teaches combat', () => {
    assert.strictEqual(Mentoring.NPC_TEACHING_SPECIALTIES.warrior, 'combat');
  });

});

suite('Mentoring — Player Skill Initialisation', () => {

  test('initPlayerSkills creates all 8 skills at level 0 with 0 xp', () => {
    resetState();
    const skills = Mentoring.initPlayerSkills('player_init_test');
    assert(typeof skills === 'object', 'Should return skills object');
    Object.keys(Mentoring.SKILLS).forEach(skillName => {
      assert(skills[skillName] !== undefined, `Missing skill: ${skillName}`);
      assert.strictEqual(skills[skillName].xp, 0, `${skillName} xp should start at 0`);
      assert.strictEqual(skills[skillName].level, 0, `${skillName} level should start at 0`);
    });
  });

  test('initPlayerSkills sets levelName to level 0 name for each skill', () => {
    resetState();
    const skills = Mentoring.initPlayerSkills('player_levelname_test');
    Object.entries(Mentoring.SKILLS).forEach(([skillName, skillDef]) => {
      assert.strictEqual(
        skills[skillName].levelName,
        skillDef.levels[0],
        `${skillName} levelName should match level 0`
      );
    });
  });

  test('initPlayerSkills returns the same object on second call (idempotent)', () => {
    resetState();
    const skills1 = Mentoring.initPlayerSkills('player_idem_test');
    const skills2 = Mentoring.initPlayerSkills('player_idem_test');
    assert(skills1 === skills2, 'Second call should return the same object reference');
  });

  test('getPlayerSkills auto-initialises if player not yet registered', () => {
    resetState();
    const skills = Mentoring.getPlayerSkills('brand_new_player');
    assert(typeof skills === 'object', 'Should auto-init and return skills');
    Object.keys(Mentoring.SKILLS).forEach(skillName => {
      assert(skills[skillName] !== undefined, `Missing skill ${skillName} in auto-init`);
    });
  });

});

suite('Mentoring — XP Awards & Level Progression', () => {

  test('addSkillXP returns success=false for invalid skill', () => {
    resetState();
    const result = Mentoring.addSkillXP('player_xp_test', 'flying', 50);
    assert.strictEqual(result.success, false);
    assert(result.error !== undefined, 'Should provide error message');
  });

  test('addSkillXP increases XP correctly', () => {
    resetState();
    Mentoring.initPlayerSkills('player_xp1');
    const result = Mentoring.addSkillXP('player_xp1', 'gardening', 50);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.newXP, 50);
  });

  test('addSkillXP accumulates XP across multiple calls', () => {
    resetState();
    Mentoring.initPlayerSkills('player_xp2');
    Mentoring.addSkillXP('player_xp2', 'crafting', 40);
    const result = Mentoring.addSkillXP('player_xp2', 'crafting', 60);
    assert.strictEqual(result.newXP, 100);
  });

  test('addSkillXP reports leveledUp=false when XP below threshold', () => {
    resetState();
    Mentoring.initPlayerSkills('player_xp3');
    const result = Mentoring.addSkillXP('player_xp3', 'trading', 50);
    assert.strictEqual(result.leveledUp, false);
    assert.strictEqual(result.newLevel, 0);
  });

  test('addSkillXP reports leveledUp=true when crossing level 1 threshold (100 XP)', () => {
    resetState();
    Mentoring.initPlayerSkills('player_xp4');
    const result = Mentoring.addSkillXP('player_xp4', 'gardening', 100);
    assert.strictEqual(result.leveledUp, true);
    assert.strictEqual(result.newLevel, 1);
  });

  test('addSkillXP level 1 name matches SKILLS definition', () => {
    resetState();
    Mentoring.initPlayerSkills('player_xp5');
    const result = Mentoring.addSkillXP('player_xp5', 'gardening', 100);
    assert.strictEqual(result.newLevelName, Mentoring.SKILLS.gardening.levels[1]);
  });

  test('addSkillXP reaches level 4 (master) at 1000 XP', () => {
    resetState();
    Mentoring.initPlayerSkills('player_xp6');
    const result = Mentoring.addSkillXP('player_xp6', 'combat', 1000);
    assert.strictEqual(result.newLevel, 4);
    assert.strictEqual(result.newLevelName, Mentoring.SKILLS.combat.levels[4]);
  });

  test('addSkillXP auto-inits player if not yet registered', () => {
    resetState();
    const result = Mentoring.addSkillXP('auto_init_player', 'lore', 50);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.newXP, 50);
  });

  test('getSkillLevel returns 0 for unregistered player', () => {
    resetState();
    const level = Mentoring.getSkillLevel('ghost_player', 'social');
    assert.strictEqual(level, 0);
  });

  test('getSkillLevel returns correct level after XP award', () => {
    resetState();
    Mentoring.initPlayerSkills('player_level_test');
    Mentoring.addSkillXP('player_level_test', 'exploration', 300);
    const level = Mentoring.getSkillLevel('player_level_test', 'exploration');
    assert.strictEqual(level, 2);
  });

  test('XP does not go below 0 (no negative XP)', () => {
    resetState();
    Mentoring.initPlayerSkills('player_neg_xp');
    Mentoring.addSkillXP('player_neg_xp', 'building', 50);
    const skills = Mentoring.getPlayerSkills('player_neg_xp');
    assert(skills.building.xp >= 0, 'XP must not be negative');
  });

});

suite('Mentoring — Mentorship Offers', () => {

  test('offerMentorship fails for invalid skill', () => {
    resetState();
    const result = Mentoring.offerMentorship('mentor1', 'mentee1', 'flying');
    assert.strictEqual(result.success, false);
    assert(result.error !== undefined);
  });

  test('offerMentorship fails if mentor level < 2', () => {
    resetState();
    Mentoring.initPlayerSkills('low_mentor');
    Mentoring.initPlayerSkills('any_mentee');
    // low_mentor has 0 XP in gardening → level 0
    const result = Mentoring.offerMentorship('low_mentor', 'any_mentee', 'gardening');
    assert.strictEqual(result.success, false);
    assert(result.error.toLowerCase().includes('level 2'), 'Error should mention level 2 requirement');
  });

  test('offerMentorship succeeds when mentor is level 2+', () => {
    resetState();
    Mentoring.initPlayerSkills('mentor_ok');
    Mentoring.initPlayerSkills('mentee_ok');
    // Bring mentor to level 2 (needs 300 XP)
    Mentoring.addSkillXP('mentor_ok', 'crafting', 300);
    const result = Mentoring.offerMentorship('mentor_ok', 'mentee_ok', 'crafting');
    assert.strictEqual(result.success, true);
    assert(result.offer !== undefined, 'Should return offer object');
    assert(result.offer.id !== undefined, 'Offer should have an id');
  });

  test('offerMentorship offer contains correct mentorId, menteeId, skill', () => {
    resetState();
    Mentoring.initPlayerSkills('mentor_fields');
    Mentoring.initPlayerSkills('mentee_fields');
    Mentoring.addSkillXP('mentor_fields', 'social', 300);
    const result = Mentoring.offerMentorship('mentor_fields', 'mentee_fields', 'social');
    assert.strictEqual(result.offer.mentorId, 'mentor_fields');
    assert.strictEqual(result.offer.menteeId, 'mentee_fields');
    assert.strictEqual(result.offer.skill, 'social');
  });

  test('declineMentorship removes offer silently', () => {
    resetState();
    Mentoring.initPlayerSkills('mentor_dec');
    Mentoring.initPlayerSkills('mentee_dec');
    Mentoring.addSkillXP('mentor_dec', 'trading', 300);
    const offerResult = Mentoring.offerMentorship('mentor_dec', 'mentee_dec', 'trading');
    const offerId = offerResult.offer.id;

    // Decline it
    Mentoring.declineMentorship(offerId);

    // Accepting a declined offer should fail
    const acceptResult = Mentoring.acceptMentorship(offerId);
    assert.strictEqual(acceptResult.success, false);
  });

});

suite('Mentoring — Accepting Mentorships', () => {

  test('acceptMentorship fails for unknown offerId', () => {
    resetState();
    const result = Mentoring.acceptMentorship('nonexistent_offer_id');
    assert.strictEqual(result.success, false);
    assert(result.error !== undefined);
  });

  test('acceptMentorship creates mentorship with 0 stepsCompleted and 5 totalSteps', () => {
    resetState();
    Mentoring.initPlayerSkills('mentor_accept');
    Mentoring.initPlayerSkills('mentee_accept');
    Mentoring.addSkillXP('mentor_accept', 'lore', 300);
    const offerResult = Mentoring.offerMentorship('mentor_accept', 'mentee_accept', 'lore');
    const acceptResult = Mentoring.acceptMentorship(offerResult.offer.id);

    assert.strictEqual(acceptResult.success, true);
    assert(acceptResult.mentorship !== undefined);
    assert.strictEqual(acceptResult.mentorship.stepsCompleted, 0);
    assert.strictEqual(acceptResult.mentorship.totalSteps, 5);
  });

  test('acceptMentorship removes the offer after acceptance', () => {
    resetState();
    Mentoring.initPlayerSkills('mentor_consume');
    Mentoring.initPlayerSkills('mentee_consume');
    Mentoring.addSkillXP('mentor_consume', 'building', 300);
    const offerResult = Mentoring.offerMentorship('mentor_consume', 'mentee_consume', 'building');
    const offerId = offerResult.offer.id;

    Mentoring.acceptMentorship(offerId);

    // Accepting the same offer again should fail
    const secondAccept = Mentoring.acceptMentorship(offerId);
    assert.strictEqual(secondAccept.success, false, 'Should not be able to accept same offer twice');
  });

  test('acceptMentorship mentorship preserves mentor/mentee/skill', () => {
    resetState();
    Mentoring.initPlayerSkills('mentor_data');
    Mentoring.initPlayerSkills('mentee_data');
    Mentoring.addSkillXP('mentor_data', 'combat', 300);
    const offerResult = Mentoring.offerMentorship('mentor_data', 'mentee_data', 'combat');
    const acceptResult = Mentoring.acceptMentorship(offerResult.offer.id);
    const m = acceptResult.mentorship;
    assert.strictEqual(m.mentorId, 'mentor_data');
    assert.strictEqual(m.menteeId, 'mentee_data');
    assert.strictEqual(m.skill, 'combat');
  });

});

suite('Mentoring — Lesson Steps & Completion', () => {

  test('completeLessonStep fails for unknown mentorshipId', () => {
    resetState();
    const result = Mentoring.completeLessonStep('nonexistent_mentorship');
    assert.strictEqual(result.success, false);
  });

  test('completeLessonStep increments stepsCompleted', () => {
    resetState();
    Mentoring.initPlayerSkills('mentor_step');
    Mentoring.initPlayerSkills('mentee_step');
    Mentoring.addSkillXP('mentor_step', 'gardening', 300);
    const offerResult = Mentoring.offerMentorship('mentor_step', 'mentee_step', 'gardening');
    const acceptResult = Mentoring.acceptMentorship(offerResult.offer.id);
    const mentorshipId = acceptResult.mentorship.id;

    const stepResult = Mentoring.completeLessonStep(mentorshipId);
    assert.strictEqual(stepResult.success, true);
    assert.strictEqual(stepResult.stepsCompleted, 1);
  });

  test('completeLessonStep awards 20 XP to mentee per step', () => {
    resetState();
    Mentoring.initPlayerSkills('mentor_xp_grant');
    Mentoring.initPlayerSkills('mentee_xp_grant');
    Mentoring.addSkillXP('mentor_xp_grant', 'social', 300);
    const offerResult = Mentoring.offerMentorship('mentor_xp_grant', 'mentee_xp_grant', 'social');
    const acceptResult = Mentoring.acceptMentorship(offerResult.offer.id);
    const mentorshipId = acceptResult.mentorship.id;

    Mentoring.completeLessonStep(mentorshipId);

    const skills = Mentoring.getPlayerSkills('mentee_xp_grant');
    assert.strictEqual(skills.social.xp, 20, 'Mentee should have 20 XP after one step');
  });

  test('completeLessonStep reports completed=false before all steps done', () => {
    resetState();
    Mentoring.initPlayerSkills('mentor_progress');
    Mentoring.initPlayerSkills('mentee_progress');
    Mentoring.addSkillXP('mentor_progress', 'exploration', 300);
    const offerResult = Mentoring.offerMentorship('mentor_progress', 'mentee_progress', 'exploration');
    const acceptResult = Mentoring.acceptMentorship(offerResult.offer.id);
    const mentorshipId = acceptResult.mentorship.id;

    const stepResult = Mentoring.completeLessonStep(mentorshipId);
    assert.strictEqual(stepResult.completed, false);
  });

  test('completeLessonStep reports completed=true on final (5th) step', () => {
    resetState();
    Mentoring.initPlayerSkills('mentor_final');
    Mentoring.initPlayerSkills('mentee_final');
    Mentoring.addSkillXP('mentor_final', 'trading', 300);
    const offerResult = Mentoring.offerMentorship('mentor_final', 'mentee_final', 'trading');
    const acceptResult = Mentoring.acceptMentorship(offerResult.offer.id);
    const mentorshipId = acceptResult.mentorship.id;

    // Complete all 5 steps
    let lastResult;
    for (let i = 0; i < 5; i++) {
      lastResult = Mentoring.completeLessonStep(mentorshipId);
    }
    assert.strictEqual(lastResult.completed, true);
    assert.strictEqual(lastResult.stepsCompleted, 5);
  });

  test('completeLessonStep grants sparkReward of at least 5 per step', () => {
    resetState();
    Mentoring.initPlayerSkills('mentor_spark');
    Mentoring.initPlayerSkills('mentee_spark');
    Mentoring.addSkillXP('mentor_spark', 'lore', 300);
    const offerResult = Mentoring.offerMentorship('mentor_spark', 'mentee_spark', 'lore');
    const acceptResult = Mentoring.acceptMentorship(offerResult.offer.id);
    const mentorshipId = acceptResult.mentorship.id;

    const stepResult = Mentoring.completeLessonStep(mentorshipId);
    assert(stepResult.sparkReward >= 5, `sparkReward should be >= 5, got ${stepResult.sparkReward}`);
  });

  test('completeLessonStep on final step includes 50 bonus sparks', () => {
    resetState();
    Mentoring.initPlayerSkills('mentor_bonus');
    Mentoring.initPlayerSkills('mentee_bonus');
    Mentoring.addSkillXP('mentor_bonus', 'crafting', 300);
    const offerResult = Mentoring.offerMentorship('mentor_bonus', 'mentee_bonus', 'crafting');
    const acceptResult = Mentoring.acceptMentorship(offerResult.offer.id);
    const mentorshipId = acceptResult.mentorship.id;

    for (let i = 0; i < 4; i++) {
      Mentoring.completeLessonStep(mentorshipId);
    }
    const finalStep = Mentoring.completeLessonStep(mentorshipId);
    // Final step reward = 5-10 (base) + 50 (completion bonus)
    assert(finalStep.sparkReward >= 55, `Final step should have >= 55 sparks, got ${finalStep.sparkReward}`);
  });

  test('completeLessonStep fails after mentorship is already completed', () => {
    resetState();
    Mentoring.initPlayerSkills('mentor_over');
    Mentoring.initPlayerSkills('mentee_over');
    Mentoring.addSkillXP('mentor_over', 'building', 300);
    const offerResult = Mentoring.offerMentorship('mentor_over', 'mentee_over', 'building');
    const acceptResult = Mentoring.acceptMentorship(offerResult.offer.id);
    const mentorshipId = acceptResult.mentorship.id;

    for (let i = 0; i < 5; i++) {
      Mentoring.completeLessonStep(mentorshipId);
    }

    const extraStep = Mentoring.completeLessonStep(mentorshipId);
    assert.strictEqual(extraStep.success, false);
  });

  test('completeLessonStep progress fraction is correct', () => {
    resetState();
    Mentoring.initPlayerSkills('mentor_frac');
    Mentoring.initPlayerSkills('mentee_frac');
    Mentoring.addSkillXP('mentor_frac', 'combat', 300);
    const offerResult = Mentoring.offerMentorship('mentor_frac', 'mentee_frac', 'combat');
    const acceptResult = Mentoring.acceptMentorship(offerResult.offer.id);
    const mentorshipId = acceptResult.mentorship.id;

    const step2 = Mentoring.completeLessonStep(mentorshipId);
    const step2Again = Mentoring.completeLessonStep(mentorshipId);
    assert(Math.abs(step2Again.progress - 0.4) < 0.001, `Progress at step 2 should be 0.4, got ${step2Again.progress}`);
  });

});

suite('Mentoring — Mentorship Queries & Management', () => {

  test('getActiveMentorships returns active mentorships for player', () => {
    resetState();
    Mentoring.initPlayerSkills('mentor_query');
    Mentoring.initPlayerSkills('mentee_query');
    Mentoring.addSkillXP('mentor_query', 'gardening', 300);
    const offerResult = Mentoring.offerMentorship('mentor_query', 'mentee_query', 'gardening');
    Mentoring.acceptMentorship(offerResult.offer.id);

    const activeMentor = Mentoring.getActiveMentorships('mentor_query');
    const activeMentee = Mentoring.getActiveMentorships('mentee_query');

    assert(activeMentor.length >= 1, 'Mentor should appear in active mentorships');
    assert(activeMentee.length >= 1, 'Mentee should appear in active mentorships');
  });

  test('getActiveMentorships returns empty array for player with no mentorships', () => {
    resetState();
    const active = Mentoring.getActiveMentorships('loner_player');
    assert(Array.isArray(active), 'Should return array');
    assert.strictEqual(active.length, 0);
  });

  test('getMentorshipProgress returns null for unknown id', () => {
    resetState();
    const progress = Mentoring.getMentorshipProgress('bad_id');
    assert.strictEqual(progress, null);
  });

  test('getMentorshipProgress returns correct structure', () => {
    resetState();
    Mentoring.initPlayerSkills('mentor_prog');
    Mentoring.initPlayerSkills('mentee_prog');
    Mentoring.addSkillXP('mentor_prog', 'lore', 300);
    const offerResult = Mentoring.offerMentorship('mentor_prog', 'mentee_prog', 'lore');
    const acceptResult = Mentoring.acceptMentorship(offerResult.offer.id);
    const mentorshipId = acceptResult.mentorship.id;

    const progress = Mentoring.getMentorshipProgress(mentorshipId);
    assert(progress !== null, 'Progress should not be null for valid mentorship');
    assert.strictEqual(progress.stepsCompleted, 0);
    assert.strictEqual(progress.totalSteps, 5);
    assert.strictEqual(progress.skill, 'lore');
    assert.strictEqual(progress.mentor, 'mentor_prog');
    assert.strictEqual(progress.mentee, 'mentee_prog');
  });

  test('cancelMentorship fails for unknown mentorshipId', () => {
    resetState();
    const result = Mentoring.cancelMentorship('bad_id', 'anyone');
    assert.strictEqual(result.success, false);
  });

  test('cancelMentorship fails if player is not part of the mentorship', () => {
    resetState();
    Mentoring.initPlayerSkills('mentor_cancel');
    Mentoring.initPlayerSkills('mentee_cancel');
    Mentoring.addSkillXP('mentor_cancel', 'crafting', 300);
    const offerResult = Mentoring.offerMentorship('mentor_cancel', 'mentee_cancel', 'crafting');
    const acceptResult = Mentoring.acceptMentorship(offerResult.offer.id);
    const mentorshipId = acceptResult.mentorship.id;

    const result = Mentoring.cancelMentorship(mentorshipId, 'outsider_player');
    assert.strictEqual(result.success, false);
  });

  test('cancelMentorship succeeds when called by the mentor', () => {
    resetState();
    Mentoring.initPlayerSkills('mentor_cancels');
    Mentoring.initPlayerSkills('mentee_cancels');
    Mentoring.addSkillXP('mentor_cancels', 'social', 300);
    const offerResult = Mentoring.offerMentorship('mentor_cancels', 'mentee_cancels', 'social');
    const acceptResult = Mentoring.acceptMentorship(offerResult.offer.id);
    const mentorshipId = acceptResult.mentorship.id;

    const result = Mentoring.cancelMentorship(mentorshipId, 'mentor_cancels');
    assert.strictEqual(result.success, true);

    // Mentorship should no longer appear
    const active = Mentoring.getActiveMentorships('mentor_cancels');
    const found = active.find(m => m.id === mentorshipId);
    assert(found === undefined, 'Cancelled mentorship should not appear in active list');
  });

  test('cancelMentorship succeeds when called by the mentee', () => {
    resetState();
    Mentoring.initPlayerSkills('mentor_mc');
    Mentoring.initPlayerSkills('mentee_mc');
    Mentoring.addSkillXP('mentor_mc', 'trading', 300);
    const offerResult = Mentoring.offerMentorship('mentor_mc', 'mentee_mc', 'trading');
    const acceptResult = Mentoring.acceptMentorship(offerResult.offer.id);
    const mentorshipId = acceptResult.mentorship.id;

    const result = Mentoring.cancelMentorship(mentorshipId, 'mentee_mc');
    assert.strictEqual(result.success, true);
  });

});

suite('Mentoring — NPC Lesson System', () => {

  test('canNPCTeach returns true for matching archetype/skill pair', () => {
    assert.strictEqual(Mentoring.canNPCTeach('gardener', 'gardening'), true);
    assert.strictEqual(Mentoring.canNPCTeach('builder', 'building'), true);
    assert.strictEqual(Mentoring.canNPCTeach('explorer', 'exploration'), true);
    assert.strictEqual(Mentoring.canNPCTeach('scholar', 'lore'), true);
  });

  test('canNPCTeach returns false for mismatched archetype/skill', () => {
    assert.strictEqual(Mentoring.canNPCTeach('gardener', 'combat'), false);
    assert.strictEqual(Mentoring.canNPCTeach('builder', 'trading'), false);
    assert.strictEqual(Mentoring.canNPCTeach('explorer', 'gardening'), false);
  });

  test('canNPCTeach returns false for invalid skill', () => {
    assert.strictEqual(Mentoring.canNPCTeach('gardener', 'flying'), false);
  });

  test('canNPCTeach returns false for unknown archetype', () => {
    assert.strictEqual(Mentoring.canNPCTeach('wizard', 'lore'), false);
  });

  test('startNPCLesson fails when NPC cannot teach the skill', () => {
    resetState();
    const result = Mentoring.startNPCLesson('player1', 'npc1', 'gardener', 'combat');
    assert.strictEqual(result.success, false);
    assert(result.error !== undefined);
  });

  test('startNPCLesson succeeds when NPC can teach the skill', () => {
    resetState();
    Mentoring.initPlayerSkills('player_lesson');
    const result = Mentoring.startNPCLesson('player_lesson', 'npc_gardener_01', 'gardener', 'gardening');
    assert.strictEqual(result.success, true);
    assert(result.lesson !== undefined);
    assert(result.lesson.id !== undefined);
  });

  test('startNPCLesson lesson contains playerId, npcId, skill', () => {
    resetState();
    Mentoring.initPlayerSkills('player_lesson2');
    const result = Mentoring.startNPCLesson('player_lesson2', 'npc_scholar_01', 'scholar', 'lore');
    assert.strictEqual(result.lesson.playerId, 'player_lesson2');
    assert.strictEqual(result.lesson.npcId, 'npc_scholar_01');
    assert.strictEqual(result.lesson.skill, 'lore');
  });

  test('completeNPCLesson fails for unknown lessonId', () => {
    resetState();
    const result = Mentoring.completeNPCLesson('bad_lesson_id');
    assert.strictEqual(result.success, false);
  });

  test('completeNPCLesson awards 15 XP to the player', () => {
    resetState();
    Mentoring.initPlayerSkills('player_npc_xp');
    const startResult = Mentoring.startNPCLesson('player_npc_xp', 'npc_bldr', 'builder', 'building');
    const completeResult = Mentoring.completeNPCLesson(startResult.lesson.id);

    assert.strictEqual(completeResult.success, true);
    assert.strictEqual(completeResult.xpGained, 15);

    const skills = Mentoring.getPlayerSkills('player_npc_xp');
    assert.strictEqual(skills.building.xp, 15);
  });

  test('completeNPCLesson returns sparkCost between 5 and 14', () => {
    resetState();
    Mentoring.initPlayerSkills('player_npc_spark');
    const startResult = Mentoring.startNPCLesson('player_npc_spark', 'npc_expl', 'explorer', 'exploration');
    const completeResult = Mentoring.completeNPCLesson(startResult.lesson.id);
    assert(completeResult.sparkCost >= 5 && completeResult.sparkCost < 15,
      `sparkCost should be 5-14, got ${completeResult.sparkCost}`);
  });

  test('completeNPCLesson removes the lesson after completion', () => {
    resetState();
    Mentoring.initPlayerSkills('player_npc_rm');
    const startResult = Mentoring.startNPCLesson('player_npc_rm', 'npc_merch', 'merchant', 'trading');
    const lessonId = startResult.lesson.id;
    Mentoring.completeNPCLesson(lessonId);

    // Completing again should fail (lesson removed)
    const secondComplete = Mentoring.completeNPCLesson(lessonId);
    assert.strictEqual(secondComplete.success, false);
  });

});

suite('Mentoring — State Persistence', () => {

  test('getMentoringState returns playerSkills, mentorships, mentorshipOffers, npcLessons', () => {
    resetState();
    const state = Mentoring.getMentoringState();
    assert(state.playerSkills !== undefined, 'State must have playerSkills');
    assert(state.mentorships !== undefined, 'State must have mentorships');
    assert(state.mentorshipOffers !== undefined, 'State must have mentorshipOffers');
    assert(state.npcLessons !== undefined, 'State must have npcLessons');
  });

  test('initMentoring restores playerSkills from saved data', () => {
    const savedData = {
      playerSkills: {
        saved_player: {
          gardening: { xp: 150, level: 1, levelName: 'Sprout' }
        }
      },
      mentorships: {},
      mentorshipOffers: {},
      npcLessons: {}
    };
    Mentoring.initMentoring(savedData);
    const skills = Mentoring.getPlayerSkills('saved_player');
    assert.strictEqual(skills.gardening.xp, 150);
    assert.strictEqual(skills.gardening.level, 1);
  });

  test('initMentoring with empty object resets to empty defaults', () => {
    // Passing an explicit empty object clears all state
    Mentoring.initMentoring({ playerSkills: {}, mentorships: {}, mentorshipOffers: {}, npcLessons: {} });
    const state = Mentoring.getMentoringState();
    assert.deepStrictEqual(state.playerSkills, {});
    assert.deepStrictEqual(state.mentorships, {});
  });

  test('initMentoring with null/falsy leaves state unchanged (no-op)', () => {
    // First, set some state
    Mentoring.initMentoring({ playerSkills: { some_player: { lore: { xp: 50, level: 0, levelName: 'Curious' } } }, mentorships: {}, mentorshipOffers: {}, npcLessons: {} });
    // Then call with null — should be a no-op (the module does nothing when existingData is falsy)
    Mentoring.initMentoring(null);
    const state = Mentoring.getMentoringState();
    // State should still contain some_player from the previous initMentoring call
    assert(state.playerSkills['some_player'] !== undefined, 'Null init should not clear existing state');
  });

  test('getMentoringState reflects changes after XP award', () => {
    resetState();
    Mentoring.initPlayerSkills('state_test_player');
    Mentoring.addSkillXP('state_test_player', 'crafting', 200);
    const state = Mentoring.getMentoringState();
    assert.strictEqual(state.playerSkills['state_test_player'].crafting.xp, 200);
  });

});

const success = report();
process.exit(success ? 0 : 1);
