/**
 * tests/test_mentor_guilds.js
 * Comprehensive tests for src/js/mentor_guilds.js
 * Run: node tests/test_mentor_guilds.js
 *
 * Uses only Node.js stdlib — zero external dependencies.
 */

'use strict';

var MentorGuilds = require('../src/js/mentor_guilds');

// ============================================================================
// Minimal test framework (var-only, no const/let)
// ============================================================================

var passed = 0;
var failed = 0;
var errors = [];

function assert(condition, msg) {
  if (!condition) {
    throw new Error(msg || 'Assertion failed');
  }
}

assert.strictEqual = function(a, b, msg) {
  if (a !== b) {
    throw new Error(msg || ('Expected ' + JSON.stringify(a) + ' === ' + JSON.stringify(b)));
  }
};

assert.notStrictEqual = function(a, b, msg) {
  if (a === b) {
    throw new Error(msg || ('Expected values to differ, both: ' + JSON.stringify(a)));
  }
};

assert.deepEqual = function(a, b, msg) {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw new Error(msg || ('Expected ' + JSON.stringify(a) + ' to deep equal ' + JSON.stringify(b)));
  }
};

function test(name, fn) {
  try {
    fn();
    passed++;
    process.stdout.write('  PASS: ' + name + '\n');
  } catch (e) {
    failed++;
    errors.push({ name: name, error: e });
    process.stdout.write('  FAIL: ' + name + '\n       ' + e.message + '\n');
  }
}

function suite(name, fn) {
  process.stdout.write('\n' + name + '\n');
  fn();
}

function report() {
  process.stdout.write('\n' + passed + ' passed, ' + failed + ' failed\n');
  if (errors.length > 0) {
    process.stdout.write('\nFailures:\n');
    for (var i = 0; i < errors.length; i++) {
      process.stdout.write('  ' + errors[i].name + ': ' + errors[i].error.message + '\n');
    }
  }
  return failed === 0;
}

// ============================================================================
// Helpers
// ============================================================================

function freshState() {
  return {
    mentorGuilds: [],
    cohorts: [],
    mentorStats: {},
    studentXP: {}
  };
}

// Build a guild with one mentor, return { state, guild }
function setupGuild(state, founderId, name) {
  founderId = founderId || 'mentor1';
  name = name || 'Test Guild';
  var result = MentorGuilds.createMentorGuild(state, founderId, name);
  return { state: state, guild: result.guild };
}

// Build guild + cohort, return { state, guild, cohort }
function setupCohort(state, mentorId, curriculumId) {
  mentorId = mentorId || 'mentor1';
  curriculumId = curriculumId || 'crafting_mastery';
  var g = setupGuild(state, mentorId, 'Guild_' + mentorId);
  var result = MentorGuilds.createCohort(state, mentorId, g.guild.id, curriculumId);
  return { state: state, guild: g.guild, cohort: result.cohort };
}

// Join N students to a cohort
function joinStudents(state, cohortId, studentIds) {
  for (var i = 0; i < studentIds.length; i++) {
    MentorGuilds.joinCohort(state, studentIds[i], cohortId);
  }
}

// Complete all lessons in the current module for a student
function finishCurrentModule(state, studentId, cohortId) {
  var cohort = MentorGuilds.getCohort(state, cohortId);
  var curriculum = MentorGuilds.getCurriculumById(cohort.curriculumId);
  var module = curriculum.modules[cohort.currentModule];
  for (var i = 0; i < module.lessons; i++) {
    MentorGuilds.completeLesson(state, studentId, cohortId, i);
  }
}

// Complete N full modules for a student (starting from module 0)
function finishModules(state, studentId, cohortId, n) {
  var cohort = MentorGuilds.getCohort(state, cohortId);
  var curriculum = MentorGuilds.getCurriculumById(cohort.curriculumId);
  for (var m = 0; m < n && m < curriculum.modules.length; m++) {
    // Advance cohort to this module if needed
    if (cohort.currentModule < m) {
      MentorGuilds.advanceModule(state, cohortId, m);
    }
    finishCurrentModule(state, studentId, cohortId);
    if (m + 1 < n && m + 1 < curriculum.modules.length) {
      MentorGuilds.advanceModule(state, cohortId, m + 1);
    }
  }
}

// ============================================================================
// SUITE 1: CURRICULA configuration
// ============================================================================

suite('Curricula — count and shape', function() {

  test('CURRICULA array is exported', function() {
    assert(Array.isArray(MentorGuilds.CURRICULA));
  });

  test('Exactly 8 curricula', function() {
    assert.strictEqual(MentorGuilds.CURRICULA.length, 8);
  });

  test('All 8 expected curriculum IDs exist', function() {
    var expected = [
      'crafting_mastery', 'combat_training', 'exploration_school', 'social_arts',
      'gardening_academy', 'fishing_school', 'cooking_institute', 'trading_academy'
    ];
    for (var i = 0; i < expected.length; i++) {
      assert(
        MentorGuilds.getCurriculumById(expected[i]) !== null,
        'Missing curriculum: ' + expected[i]
      );
    }
  });

  test('Each curriculum has id, name, description, category', function() {
    for (var i = 0; i < MentorGuilds.CURRICULA.length; i++) {
      var c = MentorGuilds.CURRICULA[i];
      assert(typeof c.id === 'string' && c.id.length > 0, c.id + ' missing id');
      assert(typeof c.name === 'string' && c.name.length > 0, c.id + ' missing name');
      assert(typeof c.description === 'string' && c.description.length > 0, c.id + ' missing description');
      assert(typeof c.category === 'string' && c.category.length > 0, c.id + ' missing category');
    }
  });

  test('Each curriculum has exactly 5 modules', function() {
    for (var i = 0; i < MentorGuilds.CURRICULA.length; i++) {
      var c = MentorGuilds.CURRICULA[i];
      assert(Array.isArray(c.modules), c.id + ' modules must be array');
      assert.strictEqual(c.modules.length, 5, c.id + ' must have 5 modules');
    }
  });

  test('Each module has id, name, lessons (>0), xpPerLesson (>0)', function() {
    for (var i = 0; i < MentorGuilds.CURRICULA.length; i++) {
      var c = MentorGuilds.CURRICULA[i];
      for (var m = 0; m < c.modules.length; m++) {
        var mod = c.modules[m];
        assert(typeof mod.id === 'string' && mod.id.length > 0, c.id + ' module ' + m + ' missing id');
        assert(typeof mod.name === 'string' && mod.name.length > 0, c.id + ' module ' + m + ' missing name');
        assert(typeof mod.lessons === 'number' && mod.lessons > 0, c.id + ' module ' + m + ' lessons must be >0');
        assert(typeof mod.xpPerLesson === 'number' && mod.xpPerLesson > 0, c.id + ' module ' + m + ' xpPerLesson must be >0');
      }
    }
  });

  test('Each curriculum has totalLessons equal to sum of module.lessons', function() {
    for (var i = 0; i < MentorGuilds.CURRICULA.length; i++) {
      var c = MentorGuilds.CURRICULA[i];
      var sum = 0;
      for (var m = 0; m < c.modules.length; m++) sum += c.modules[m].lessons;
      assert.strictEqual(c.totalLessons, sum, c.id + ' totalLessons mismatch');
    }
  });

  test('Each curriculum has bronze/silver/gold certifications', function() {
    for (var i = 0; i < MentorGuilds.CURRICULA.length; i++) {
      var c = MentorGuilds.CURRICULA[i];
      assert(c.certifications && c.certifications.bronze, c.id + ' missing bronze cert');
      assert(c.certifications.silver, c.id + ' missing silver cert');
      assert(c.certifications.gold, c.id + ' missing gold cert');
    }
  });

  test('Bronze < silver < gold modulesRequired for each curriculum', function() {
    for (var i = 0; i < MentorGuilds.CURRICULA.length; i++) {
      var c = MentorGuilds.CURRICULA[i];
      var b = c.certifications.bronze.modulesRequired;
      var s = c.certifications.silver.modulesRequired;
      var g = c.certifications.gold.modulesRequired;
      assert(b < s, c.id + ' bronze must be < silver');
      assert(s < g, c.id + ' silver must be < gold');
    }
  });

  test('Gold modulesRequired equals number of modules (5) for all curricula', function() {
    for (var i = 0; i < MentorGuilds.CURRICULA.length; i++) {
      var c = MentorGuilds.CURRICULA[i];
      assert.strictEqual(c.certifications.gold.modulesRequired, 5, c.id + ' gold must require all 5 modules');
    }
  });

  test('Certification titles are non-empty strings', function() {
    for (var i = 0; i < MentorGuilds.CURRICULA.length; i++) {
      var c = MentorGuilds.CURRICULA[i];
      assert(typeof c.certifications.bronze.title === 'string' && c.certifications.bronze.title.length > 0, c.id + ' bronze title');
      assert(typeof c.certifications.silver.title === 'string' && c.certifications.silver.title.length > 0, c.id + ' silver title');
      assert(typeof c.certifications.gold.title === 'string' && c.certifications.gold.title.length > 0, c.id + ' gold title');
    }
  });

  test('getCurricula returns all 8 curricula', function() {
    var all = MentorGuilds.getCurricula();
    assert.strictEqual(all.length, 8);
  });

  test('getCurriculumById returns correct curriculum', function() {
    var c = MentorGuilds.getCurriculumById('crafting_mastery');
    assert(c !== null);
    assert.strictEqual(c.id, 'crafting_mastery');
    assert.strictEqual(c.name, 'Crafting Mastery');
  });

  test('getCurriculumById returns null for unknown id', function() {
    var c = MentorGuilds.getCurriculumById('nonexistent_curriculum');
    assert.strictEqual(c, null);
  });

  test('crafting_mastery first module is Crafting Basics with 5 lessons at 20 xp', function() {
    var c = MentorGuilds.getCurriculumById('crafting_mastery');
    assert.strictEqual(c.modules[0].id, 'basics');
    assert.strictEqual(c.modules[0].lessons, 5);
    assert.strictEqual(c.modules[0].xpPerLesson, 20);
  });

  test('crafting_mastery mastery module is 2 lessons at 100 xp', function() {
    var c = MentorGuilds.getCurriculumById('crafting_mastery');
    assert.strictEqual(c.modules[4].id, 'mastery');
    assert.strictEqual(c.modules[4].lessons, 2);
    assert.strictEqual(c.modules[4].xpPerLesson, 100);
  });
});

// ============================================================================
// SUITE 2: MENTOR_RANKS configuration
// ============================================================================

suite('MENTOR_RANKS configuration', function() {

  test('MENTOR_RANKS is exported array', function() {
    assert(Array.isArray(MentorGuilds.MENTOR_RANKS));
  });

  test('Exactly 4 mentor ranks', function() {
    assert.strictEqual(MentorGuilds.MENTOR_RANKS.length, 4);
  });

  test('Rank IDs are correct', function() {
    var expected = ['apprentice_mentor', 'journeyman_mentor', 'master_mentor', 'grand_mentor'];
    for (var i = 0; i < expected.length; i++) {
      assert.strictEqual(MentorGuilds.MENTOR_RANKS[i].rank, expected[i]);
    }
  });

  test('apprentice_mentor requires 0 graduates and has 0 xpBonus', function() {
    var r = MentorGuilds.MENTOR_RANKS[0];
    assert.strictEqual(r.studentsGraduated, 0);
    assert.strictEqual(r.xpBonus, 0.0);
  });

  test('journeyman_mentor requires 5 graduates and has 0.10 xpBonus', function() {
    var r = MentorGuilds.MENTOR_RANKS[1];
    assert.strictEqual(r.studentsGraduated, 5);
    assert.strictEqual(r.xpBonus, 0.1);
  });

  test('master_mentor requires 15 graduates and has 0.20 xpBonus', function() {
    var r = MentorGuilds.MENTOR_RANKS[2];
    assert.strictEqual(r.studentsGraduated, 15);
    assert.strictEqual(r.xpBonus, 0.2);
  });

  test('grand_mentor requires 30 graduates and has 0.30 xpBonus', function() {
    var r = MentorGuilds.MENTOR_RANKS[3];
    assert.strictEqual(r.studentsGraduated, 30);
    assert.strictEqual(r.xpBonus, 0.3);
  });

  test('Each rank has title string', function() {
    for (var i = 0; i < MentorGuilds.MENTOR_RANKS.length; i++) {
      assert(typeof MentorGuilds.MENTOR_RANKS[i].title === 'string' && MentorGuilds.MENTOR_RANKS[i].title.length > 0);
    }
  });

  test('Ranks are ordered by ascending studentsGraduated', function() {
    for (var i = 1; i < MentorGuilds.MENTOR_RANKS.length; i++) {
      assert(
        MentorGuilds.MENTOR_RANKS[i].studentsGraduated > MentorGuilds.MENTOR_RANKS[i-1].studentsGraduated,
        'Rank ' + i + ' should require more graduates than rank ' + (i-1)
      );
    }
  });
});

// ============================================================================
// SUITE 3: createMentorGuild
// ============================================================================

suite('createMentorGuild', function() {

  test('creates guild successfully', function() {
    var state = freshState();
    var result = MentorGuilds.createMentorGuild(state, 'founder1', 'Scholars of ZION');
    assert(result.success, 'should succeed');
    assert(result.guild, 'should return guild');
    assert(typeof result.guild.id === 'string');
  });

  test('guild has correct founderId', function() {
    var state = freshState();
    var result = MentorGuilds.createMentorGuild(state, 'founder1', 'Test Guild');
    assert.strictEqual(result.guild.founderId, 'founder1');
  });

  test('guild has correct name', function() {
    var state = freshState();
    var result = MentorGuilds.createMentorGuild(state, 'founder1', 'Test Guild');
    assert.strictEqual(result.guild.name, 'Test Guild');
  });

  test('founder is in mentors list', function() {
    var state = freshState();
    var result = MentorGuilds.createMentorGuild(state, 'founder1', 'Test Guild');
    assert(result.guild.mentors.indexOf('founder1') !== -1);
  });

  test('guild added to state.mentorGuilds', function() {
    var state = freshState();
    MentorGuilds.createMentorGuild(state, 'founder1', 'Test Guild');
    assert.strictEqual(state.mentorGuilds.length, 1);
  });

  test('fails with empty name', function() {
    var state = freshState();
    var result = MentorGuilds.createMentorGuild(state, 'founder1', '');
    assert(!result.success);
    assert(typeof result.reason === 'string');
  });

  test('fails with null name', function() {
    var state = freshState();
    var result = MentorGuilds.createMentorGuild(state, 'founder1', null);
    assert(!result.success);
  });

  test('fails with empty founderId', function() {
    var state = freshState();
    var result = MentorGuilds.createMentorGuild(state, '', 'Test Guild');
    assert(!result.success);
  });

  test('fails with null founderId', function() {
    var state = freshState();
    var result = MentorGuilds.createMentorGuild(state, null, 'Test Guild');
    assert(!result.success);
  });

  test('fails with duplicate guild name (case-insensitive)', function() {
    var state = freshState();
    MentorGuilds.createMentorGuild(state, 'founder1', 'My Guild');
    var result = MentorGuilds.createMentorGuild(state, 'founder2', 'my guild');
    assert(!result.success);
    assert(typeof result.reason === 'string');
  });

  test('two guilds can have different names', function() {
    var state = freshState();
    MentorGuilds.createMentorGuild(state, 'founder1', 'Guild Alpha');
    var r = MentorGuilds.createMentorGuild(state, 'founder2', 'Guild Beta');
    assert(r.success);
    assert.strictEqual(state.mentorGuilds.length, 2);
  });

  test('mentor stats initialised for founder', function() {
    var state = freshState();
    MentorGuilds.createMentorGuild(state, 'founder1', 'Test Guild');
    assert(state.mentorStats['founder1'] !== undefined);
  });

  test('guild cohortIds starts empty', function() {
    var state = freshState();
    var result = MentorGuilds.createMentorGuild(state, 'founder1', 'Test Guild');
    assert(Array.isArray(result.guild.cohortIds));
    assert.strictEqual(result.guild.cohortIds.length, 0);
  });

  test('getMentorGuilds returns all guilds', function() {
    var state = freshState();
    MentorGuilds.createMentorGuild(state, 'f1', 'Guild A');
    MentorGuilds.createMentorGuild(state, 'f2', 'Guild B');
    var guilds = MentorGuilds.getMentorGuilds(state);
    assert.strictEqual(guilds.length, 2);
  });
});

// ============================================================================
// SUITE 4: createCohort
// ============================================================================

suite('createCohort', function() {

  test('creates cohort successfully', function() {
    var state = freshState();
    var g = setupGuild(state);
    var result = MentorGuilds.createCohort(state, 'mentor1', g.guild.id, 'crafting_mastery');
    assert(result.success, 'should succeed: ' + result.reason);
    assert(result.cohort !== undefined);
  });

  test('cohort has correct curriculumId', function() {
    var state = freshState();
    var g = setupGuild(state);
    var result = MentorGuilds.createCohort(state, 'mentor1', g.guild.id, 'crafting_mastery');
    assert.strictEqual(result.cohort.curriculumId, 'crafting_mastery');
  });

  test('cohort has correct mentorId', function() {
    var state = freshState();
    var g = setupGuild(state);
    var result = MentorGuilds.createCohort(state, 'mentor1', g.guild.id, 'crafting_mastery');
    assert.strictEqual(result.cohort.mentorId, 'mentor1');
  });

  test('cohort starts in recruiting status', function() {
    var state = freshState();
    var g = setupGuild(state);
    var result = MentorGuilds.createCohort(state, 'mentor1', g.guild.id, 'crafting_mastery');
    assert.strictEqual(result.cohort.status, 'recruiting');
  });

  test('cohort maxStudents is 5', function() {
    var state = freshState();
    var g = setupGuild(state);
    var result = MentorGuilds.createCohort(state, 'mentor1', g.guild.id, 'crafting_mastery');
    assert.strictEqual(result.cohort.maxStudents, 5);
  });

  test('cohort currentModule starts at 0', function() {
    var state = freshState();
    var g = setupGuild(state);
    var result = MentorGuilds.createCohort(state, 'mentor1', g.guild.id, 'crafting_mastery');
    assert.strictEqual(result.cohort.currentModule, 0);
  });

  test('cohort students starts empty', function() {
    var state = freshState();
    var g = setupGuild(state);
    var result = MentorGuilds.createCohort(state, 'mentor1', g.guild.id, 'crafting_mastery');
    assert(Array.isArray(result.cohort.students));
    assert.strictEqual(result.cohort.students.length, 0);
  });

  test('cohort id added to guild.cohortIds', function() {
    var state = freshState();
    var g = setupGuild(state);
    var result = MentorGuilds.createCohort(state, 'mentor1', g.guild.id, 'crafting_mastery');
    assert(g.guild.cohortIds.indexOf(result.cohort.id) !== -1);
  });

  test('fails if mentor not in guild', function() {
    var state = freshState();
    var g = setupGuild(state, 'mentor1', 'G1');
    var result = MentorGuilds.createCohort(state, 'stranger', g.guild.id, 'crafting_mastery');
    assert(!result.success);
  });

  test('fails if guild not found', function() {
    var state = freshState();
    var result = MentorGuilds.createCohort(state, 'mentor1', 'bad_guild_id', 'crafting_mastery');
    assert(!result.success);
  });

  test('fails if curriculum not found', function() {
    var state = freshState();
    var g = setupGuild(state);
    var result = MentorGuilds.createCohort(state, 'mentor1', g.guild.id, 'bad_curriculum');
    assert(!result.success);
  });

  test('mentor stats cohortsLed incremented', function() {
    var state = freshState();
    var g = setupGuild(state);
    MentorGuilds.createCohort(state, 'mentor1', g.guild.id, 'crafting_mastery');
    assert.strictEqual(state.mentorStats['mentor1'].cohortsLed, 1);
  });

  test('multiple cohorts can be created in same guild', function() {
    var state = freshState();
    var g = setupGuild(state);
    MentorGuilds.createCohort(state, 'mentor1', g.guild.id, 'crafting_mastery');
    MentorGuilds.createCohort(state, 'mentor1', g.guild.id, 'combat_training');
    assert.strictEqual(state.cohorts.length, 2);
  });
});

// ============================================================================
// SUITE 5: joinCohort
// ============================================================================

suite('joinCohort', function() {

  test('student can join recruiting cohort', function() {
    var state = freshState();
    var setup = setupCohort(state);
    var result = MentorGuilds.joinCohort(state, 'student1', setup.cohort.id);
    assert(result.success, result.reason);
  });

  test('student added to cohort.students', function() {
    var state = freshState();
    var setup = setupCohort(state);
    MentorGuilds.joinCohort(state, 'student1', setup.cohort.id);
    assert(setup.cohort.students.indexOf('student1') !== -1);
  });

  test('student progress initialised on join', function() {
    var state = freshState();
    var setup = setupCohort(state);
    MentorGuilds.joinCohort(state, 'student1', setup.cohort.id);
    assert(setup.cohort.progress['student1'] !== undefined);
    assert.strictEqual(setup.cohort.progress['student1'].totalXP, 0);
    assert.strictEqual(setup.cohort.progress['student1'].lessonsCompleted, 0);
  });

  test('fails to join non-existent cohort', function() {
    var state = freshState();
    var result = MentorGuilds.joinCohort(state, 'student1', 'bad_cohort');
    assert(!result.success);
  });

  test('fails to join cohort twice (duplicate)', function() {
    var state = freshState();
    var setup = setupCohort(state);
    MentorGuilds.joinCohort(state, 'student1', setup.cohort.id);
    var result = MentorGuilds.joinCohort(state, 'student1', setup.cohort.id);
    assert(!result.success);
    assert.strictEqual(setup.cohort.students.length, 1);
  });

  test('cohort activates when 5th student joins', function() {
    var state = freshState();
    var setup = setupCohort(state);
    for (var i = 1; i <= 5; i++) {
      MentorGuilds.joinCohort(state, 'student' + i, setup.cohort.id);
    }
    assert.strictEqual(setup.cohort.status, 'active');
  });

  test('6th student cannot join (max 5)', function() {
    var state = freshState();
    var setup = setupCohort(state);
    for (var i = 1; i <= 5; i++) {
      MentorGuilds.joinCohort(state, 'student' + i, setup.cohort.id);
    }
    var result = MentorGuilds.joinCohort(state, 'student6', setup.cohort.id);
    assert(!result.success);
    assert(result.reason.toLowerCase().indexOf('full') !== -1 || result.reason.toLowerCase().indexOf('recruit') !== -1);
  });

  test('mentor cannot join own cohort as student', function() {
    var state = freshState();
    var setup = setupCohort(state);
    var result = MentorGuilds.joinCohort(state, 'mentor1', setup.cohort.id);
    assert(!result.success);
  });

  test('fails to join completed cohort', function() {
    var state = freshState();
    var setup = setupCohort(state);
    for (var i = 1; i <= 5; i++) MentorGuilds.joinCohort(state, 'student' + i, setup.cohort.id);
    MentorGuilds.graduateCohort(state, setup.cohort.id);
    var result = MentorGuilds.joinCohort(state, 'student99', setup.cohort.id);
    assert(!result.success);
  });
});

// ============================================================================
// SUITE 6: leaveCohort
// ============================================================================

suite('leaveCohort', function() {

  test('student can leave cohort', function() {
    var state = freshState();
    var setup = setupCohort(state);
    MentorGuilds.joinCohort(state, 'student1', setup.cohort.id);
    var result = MentorGuilds.leaveCohort(state, 'student1', setup.cohort.id);
    assert(result.success);
  });

  test('student removed from cohort.students', function() {
    var state = freshState();
    var setup = setupCohort(state);
    MentorGuilds.joinCohort(state, 'student1', setup.cohort.id);
    MentorGuilds.leaveCohort(state, 'student1', setup.cohort.id);
    assert(setup.cohort.students.indexOf('student1') === -1);
  });

  test('progress marked as left', function() {
    var state = freshState();
    var setup = setupCohort(state);
    MentorGuilds.joinCohort(state, 'student1', setup.cohort.id);
    MentorGuilds.leaveCohort(state, 'student1', setup.cohort.id);
    assert(setup.cohort.progress['student1'].left === true);
  });

  test('fails to leave cohort not joined', function() {
    var state = freshState();
    var setup = setupCohort(state);
    var result = MentorGuilds.leaveCohort(state, 'student1', setup.cohort.id);
    assert(!result.success);
  });

  test('fails to leave non-existent cohort', function() {
    var state = freshState();
    var result = MentorGuilds.leaveCohort(state, 'student1', 'bad_id');
    assert(!result.success);
  });

  test('cohort disbands if last student leaves while active', function() {
    var state = freshState();
    var setup = setupCohort(state);
    for (var i = 1; i <= 5; i++) MentorGuilds.joinCohort(state, 'student' + i, setup.cohort.id);
    // Remove all
    for (var j = 1; j <= 5; j++) MentorGuilds.leaveCohort(state, 'student' + j, setup.cohort.id);
    assert.strictEqual(setup.cohort.status, 'disbanded');
  });

  test('leaving during recruiting does not disband', function() {
    var state = freshState();
    var setup = setupCohort(state);
    MentorGuilds.joinCohort(state, 'student1', setup.cohort.id);
    MentorGuilds.joinCohort(state, 'student2', setup.cohort.id);
    MentorGuilds.leaveCohort(state, 'student1', setup.cohort.id);
    assert.notStrictEqual(setup.cohort.status, 'disbanded');
  });
});

// ============================================================================
// SUITE 7: completeLesson
// ============================================================================

suite('completeLesson', function() {

  test('completes lesson and awards XP', function() {
    var state = freshState();
    var setup = setupCohort(state);
    MentorGuilds.joinCohort(state, 'student1', setup.cohort.id);
    setup.cohort.status = 'active';
    var result = MentorGuilds.completeLesson(state, 'student1', setup.cohort.id, 0);
    assert(result.success, result.reason);
    assert(result.xpAwarded > 0);
  });

  test('XP awarded equals module xpPerLesson for apprentice_mentor (0 bonus)', function() {
    var state = freshState();
    var setup = setupCohort(state);
    MentorGuilds.joinCohort(state, 'student1', setup.cohort.id);
    setup.cohort.status = 'active';
    var curriculum = MentorGuilds.getCurriculumById('crafting_mastery');
    var result = MentorGuilds.completeLesson(state, 'student1', setup.cohort.id, 0);
    assert.strictEqual(result.xpAwarded, curriculum.modules[0].xpPerLesson);
  });

  test('student totalXP increments after lesson', function() {
    var state = freshState();
    var setup = setupCohort(state);
    MentorGuilds.joinCohort(state, 'student1', setup.cohort.id);
    setup.cohort.status = 'active';
    MentorGuilds.completeLesson(state, 'student1', setup.cohort.id, 0);
    assert(setup.cohort.progress['student1'].totalXP > 0);
  });

  test('lessonsCompleted increments each lesson', function() {
    var state = freshState();
    var setup = setupCohort(state);
    MentorGuilds.joinCohort(state, 'student1', setup.cohort.id);
    setup.cohort.status = 'active';
    MentorGuilds.completeLesson(state, 'student1', setup.cohort.id, 0);
    MentorGuilds.completeLesson(state, 'student1', setup.cohort.id, 1);
    assert.strictEqual(setup.cohort.progress['student1'].lessonsCompleted, 2);
  });

  test('moduleComplete=true when all lessons in module done', function() {
    var state = freshState();
    var setup = setupCohort(state);
    MentorGuilds.joinCohort(state, 'student1', setup.cohort.id);
    setup.cohort.status = 'active';
    var curriculum = MentorGuilds.getCurriculumById('crafting_mastery');
    var mod = curriculum.modules[0];
    var lastResult;
    for (var i = 0; i < mod.lessons; i++) {
      lastResult = MentorGuilds.completeLesson(state, 'student1', setup.cohort.id, i);
    }
    assert(lastResult.moduleComplete === true);
  });

  test('moduleComplete=false for partial module', function() {
    var state = freshState();
    var setup = setupCohort(state);
    MentorGuilds.joinCohort(state, 'student1', setup.cohort.id);
    setup.cohort.status = 'active';
    var result = MentorGuilds.completeLesson(state, 'student1', setup.cohort.id, 0);
    assert(result.moduleComplete === false);
  });

  test('fails if student not in cohort', function() {
    var state = freshState();
    var setup = setupCohort(state);
    setup.cohort.status = 'active';
    var result = MentorGuilds.completeLesson(state, 'outsider', setup.cohort.id, 0);
    assert(!result.success);
  });

  test('fails if cohort not found', function() {
    var state = freshState();
    var result = MentorGuilds.completeLesson(state, 'student1', 'bad_cohort', 0);
    assert(!result.success);
  });

  test('fails if all lessons in module already done', function() {
    var state = freshState();
    var setup = setupCohort(state);
    MentorGuilds.joinCohort(state, 'student1', setup.cohort.id);
    setup.cohort.status = 'active';
    var curriculum = MentorGuilds.getCurriculumById('crafting_mastery');
    for (var i = 0; i < curriculum.modules[0].lessons; i++) {
      MentorGuilds.completeLesson(state, 'student1', setup.cohort.id, i);
    }
    var result = MentorGuilds.completeLesson(state, 'student1', setup.cohort.id, 99);
    assert(!result.success);
  });

  test('mentor xpBonus applies when mentor is journeyman or higher', function() {
    var state = freshState();
    var setup = setupCohort(state);
    // Give mentor 5 graduates to reach journeyman
    state.mentorStats['mentor1'].studentsGraduated = 5;
    MentorGuilds.joinCohort(state, 'student1', setup.cohort.id);
    setup.cohort.status = 'active';
    var curriculum = MentorGuilds.getCurriculumById('crafting_mastery');
    var baseXP = curriculum.modules[0].xpPerLesson;
    var result = MentorGuilds.completeLesson(state, 'student1', setup.cohort.id, 0);
    var expectedXP = baseXP + Math.floor(baseXP * 0.1);
    assert.strictEqual(result.xpAwarded, expectedXP);
  });

  test('master_mentor bonus of 20% applies', function() {
    var state = freshState();
    var setup = setupCohort(state);
    state.mentorStats['mentor1'].studentsGraduated = 15;
    MentorGuilds.joinCohort(state, 'student1', setup.cohort.id);
    setup.cohort.status = 'active';
    var curriculum = MentorGuilds.getCurriculumById('crafting_mastery');
    var baseXP = curriculum.modules[0].xpPerLesson;
    var result = MentorGuilds.completeLesson(state, 'student1', setup.cohort.id, 0);
    var expectedXP = baseXP + Math.floor(baseXP * 0.2);
    assert.strictEqual(result.xpAwarded, expectedXP);
  });

  test('grand_mentor bonus of 30% applies', function() {
    var state = freshState();
    var setup = setupCohort(state);
    state.mentorStats['mentor1'].studentsGraduated = 30;
    MentorGuilds.joinCohort(state, 'student1', setup.cohort.id);
    setup.cohort.status = 'active';
    var curriculum = MentorGuilds.getCurriculumById('crafting_mastery');
    var baseXP = curriculum.modules[0].xpPerLesson;
    var result = MentorGuilds.completeLesson(state, 'student1', setup.cohort.id, 0);
    var expectedXP = baseXP + Math.floor(baseXP * 0.3);
    assert.strictEqual(result.xpAwarded, expectedXP);
  });

  test('certificationEarned is null when no cert threshold reached', function() {
    var state = freshState();
    var setup = setupCohort(state);
    MentorGuilds.joinCohort(state, 'student1', setup.cohort.id);
    setup.cohort.status = 'active';
    var result = MentorGuilds.completeLesson(state, 'student1', setup.cohort.id, 0);
    // Only 1 lesson done, no cert yet
    assert(result.certificationEarned === null);
  });

  test('certificationEarned is not null when bronze threshold crossed', function() {
    var state = freshState();
    var setup = setupCohort(state);
    MentorGuilds.joinCohort(state, 'student1', setup.cohort.id);
    setup.cohort.status = 'active';
    // Complete module 0 (5 lessons)
    var curriculum = MentorGuilds.getCurriculumById('crafting_mastery');
    for (var i = 0; i < curriculum.modules[0].lessons; i++) {
      MentorGuilds.completeLesson(state, 'student1', setup.cohort.id, i);
    }
    // Advance to module 1 and complete it
    MentorGuilds.advanceModule(state, setup.cohort.id, 1);
    var lastResult;
    for (var j = 0; j < curriculum.modules[1].lessons; j++) {
      lastResult = MentorGuilds.completeLesson(state, 'student1', setup.cohort.id, j);
    }
    // Bronze requires 2 modules -> should be earned now
    assert(lastResult.certificationEarned !== null);
    assert.strictEqual(lastResult.certificationEarned.level, 'bronze');
  });
});

// ============================================================================
// SUITE 8: advanceModule
// ============================================================================

suite('advanceModule', function() {

  test('advances cohort to next module', function() {
    var state = freshState();
    var setup = setupCohort(state);
    MentorGuilds.joinCohort(state, 'student1', setup.cohort.id);
    setup.cohort.status = 'active';
    var result = MentorGuilds.advanceModule(state, setup.cohort.id, 1);
    assert(result.success, result.reason);
    assert.strictEqual(result.newModule, 1);
  });

  test('cohort currentModule updated', function() {
    var state = freshState();
    var setup = setupCohort(state);
    MentorGuilds.joinCohort(state, 'student1', setup.cohort.id);
    setup.cohort.status = 'active';
    MentorGuilds.advanceModule(state, setup.cohort.id, 1);
    assert.strictEqual(setup.cohort.currentModule, 1);
  });

  test('student lessonsInModule reset after advance', function() {
    var state = freshState();
    var setup = setupCohort(state);
    MentorGuilds.joinCohort(state, 'student1', setup.cohort.id);
    setup.cohort.status = 'active';
    MentorGuilds.completeLesson(state, 'student1', setup.cohort.id, 0);
    MentorGuilds.advanceModule(state, setup.cohort.id, 1);
    assert.strictEqual(setup.cohort.progress['student1'].lessonsInModule, 0);
  });

  test('fails to go back to previous module', function() {
    var state = freshState();
    var setup = setupCohort(state);
    setup.cohort.status = 'active';
    MentorGuilds.advanceModule(state, setup.cohort.id, 2);
    var result = MentorGuilds.advanceModule(state, setup.cohort.id, 1);
    assert(!result.success);
  });

  test('fails to advance beyond last module', function() {
    var state = freshState();
    var setup = setupCohort(state);
    setup.cohort.status = 'active';
    var result = MentorGuilds.advanceModule(state, setup.cohort.id, 10);
    assert(!result.success);
  });

  test('fails on non-existent cohort', function() {
    var state = freshState();
    var result = MentorGuilds.advanceModule(state, 'bad_cohort', 1);
    assert(!result.success);
  });

  test('activates recruiting cohort when advancing module', function() {
    var state = freshState();
    var setup = setupCohort(state);
    MentorGuilds.joinCohort(state, 'student1', setup.cohort.id);
    assert.strictEqual(setup.cohort.status, 'recruiting');
    MentorGuilds.advanceModule(state, setup.cohort.id, 1);
    assert.strictEqual(setup.cohort.status, 'active');
  });
});

// ============================================================================
// SUITE 9: submitPeerReview
// ============================================================================

suite('submitPeerReview', function() {

  test('reviewer can review another student', function() {
    var state = freshState();
    var setup = setupCohort(state);
    joinStudents(state, setup.cohort.id, ['s1', 's2', 's3', 's4', 's5']);
    var result = MentorGuilds.submitPeerReview(state, 's1', setup.cohort.id, 's2', 4, 'Great work');
    assert(result.success, result.reason);
  });

  test('review stored in cohort.peerReviews', function() {
    var state = freshState();
    var setup = setupCohort(state);
    joinStudents(state, setup.cohort.id, ['s1', 's2', 's3', 's4', 's5']);
    MentorGuilds.submitPeerReview(state, 's1', setup.cohort.id, 's2', 5, 'Excellent');
    assert.strictEqual(setup.cohort.peerReviews.length, 1);
    assert.strictEqual(setup.cohort.peerReviews[0].rating, 5);
  });

  test('fails if reviewer not in cohort', function() {
    var state = freshState();
    var setup = setupCohort(state);
    joinStudents(state, setup.cohort.id, ['s1', 's2', 's3', 's4', 's5']);
    var result = MentorGuilds.submitPeerReview(state, 'outsider', setup.cohort.id, 's1', 3, 'ok');
    assert(!result.success);
  });

  test('fails if target not in cohort', function() {
    var state = freshState();
    var setup = setupCohort(state);
    joinStudents(state, setup.cohort.id, ['s1', 's2', 's3', 's4', 's5']);
    var result = MentorGuilds.submitPeerReview(state, 's1', setup.cohort.id, 'ghost', 3, 'ok');
    assert(!result.success);
  });

  test('fails if reviewer reviews themselves', function() {
    var state = freshState();
    var setup = setupCohort(state);
    joinStudents(state, setup.cohort.id, ['s1', 's2', 's3', 's4', 's5']);
    var result = MentorGuilds.submitPeerReview(state, 's1', setup.cohort.id, 's1', 5, 'I am great');
    assert(!result.success);
    assert(result.reason.toLowerCase().indexOf('yourself') !== -1 || result.reason.toLowerCase().indexOf('self') !== -1);
  });

  test('fails with rating below 1', function() {
    var state = freshState();
    var setup = setupCohort(state);
    joinStudents(state, setup.cohort.id, ['s1', 's2', 's3', 's4', 's5']);
    var result = MentorGuilds.submitPeerReview(state, 's1', setup.cohort.id, 's2', 0, 'bad');
    assert(!result.success);
  });

  test('fails with rating above 5', function() {
    var state = freshState();
    var setup = setupCohort(state);
    joinStudents(state, setup.cohort.id, ['s1', 's2', 's3', 's4', 's5']);
    var result = MentorGuilds.submitPeerReview(state, 's1', setup.cohort.id, 's2', 6, 'too high');
    assert(!result.success);
  });

  test('accepts rating of 1', function() {
    var state = freshState();
    var setup = setupCohort(state);
    joinStudents(state, setup.cohort.id, ['s1', 's2', 's3', 's4', 's5']);
    var result = MentorGuilds.submitPeerReview(state, 's1', setup.cohort.id, 's2', 1, 'poor');
    assert(result.success);
  });

  test('accepts rating of 5', function() {
    var state = freshState();
    var setup = setupCohort(state);
    joinStudents(state, setup.cohort.id, ['s1', 's2', 's3', 's4', 's5']);
    var result = MentorGuilds.submitPeerReview(state, 's1', setup.cohort.id, 's2', 5, 'perfect');
    assert(result.success);
  });

  test('fails with non-cohort id', function() {
    var state = freshState();
    var result = MentorGuilds.submitPeerReview(state, 's1', 'bad_id', 's2', 3, '');
    assert(!result.success);
  });

  test('mentor can review a student', function() {
    var state = freshState();
    var setup = setupCohort(state);
    joinStudents(state, setup.cohort.id, ['s1', 's2', 's3', 's4', 's5']);
    var result = MentorGuilds.submitPeerReview(state, 'mentor1', setup.cohort.id, 's1', 4, 'Good progress');
    assert(result.success, result.reason);
  });

  test('review has timestamp', function() {
    var state = freshState();
    var setup = setupCohort(state);
    joinStudents(state, setup.cohort.id, ['s1', 's2', 's3', 's4', 's5']);
    var result = MentorGuilds.submitPeerReview(state, 's1', setup.cohort.id, 's2', 3, 'ok');
    assert(typeof result.review.timestamp === 'number');
  });

  test('multiple reviews can exist for same target', function() {
    var state = freshState();
    var setup = setupCohort(state);
    joinStudents(state, setup.cohort.id, ['s1', 's2', 's3', 's4', 's5']);
    MentorGuilds.submitPeerReview(state, 's1', setup.cohort.id, 's3', 4, 'Good');
    MentorGuilds.submitPeerReview(state, 's2', setup.cohort.id, 's3', 5, 'Excellent');
    assert.strictEqual(setup.cohort.peerReviews.length, 2);
  });
});

// ============================================================================
// SUITE 10: getPeerReviews
// ============================================================================

suite('getPeerReviews', function() {

  test('returns reviews for specific student', function() {
    var state = freshState();
    var setup = setupCohort(state);
    joinStudents(state, setup.cohort.id, ['s1', 's2', 's3', 's4', 's5']);
    MentorGuilds.submitPeerReview(state, 's1', setup.cohort.id, 's2', 4, 'Good');
    MentorGuilds.submitPeerReview(state, 's3', setup.cohort.id, 's2', 5, 'Great');
    var reviews = MentorGuilds.getPeerReviews(state, setup.cohort.id, 's2');
    assert.strictEqual(reviews.length, 2);
  });

  test('returns empty array if student has no reviews', function() {
    var state = freshState();
    var setup = setupCohort(state);
    joinStudents(state, setup.cohort.id, ['s1', 's2', 's3', 's4', 's5']);
    var reviews = MentorGuilds.getPeerReviews(state, setup.cohort.id, 's1');
    assert.strictEqual(reviews.length, 0);
  });

  test('does not include reviews for other students', function() {
    var state = freshState();
    var setup = setupCohort(state);
    joinStudents(state, setup.cohort.id, ['s1', 's2', 's3', 's4', 's5']);
    MentorGuilds.submitPeerReview(state, 's1', setup.cohort.id, 's2', 4, 'For s2');
    MentorGuilds.submitPeerReview(state, 's1', setup.cohort.id, 's3', 3, 'For s3');
    var reviews = MentorGuilds.getPeerReviews(state, setup.cohort.id, 's2');
    assert.strictEqual(reviews.length, 1);
    assert.strictEqual(reviews[0].targetId, 's2');
  });

  test('returns empty array for non-existent cohort', function() {
    var state = freshState();
    var reviews = MentorGuilds.getPeerReviews(state, 'bad_id', 's1');
    assert.strictEqual(reviews.length, 0);
  });
});

// ============================================================================
// SUITE 11: getCertification
// ============================================================================

suite('getCertification', function() {

  test('no certification before completing any modules', function() {
    var state = freshState();
    var setup = setupCohort(state);
    MentorGuilds.joinCohort(state, 'student1', setup.cohort.id);
    var cert = MentorGuilds.getCertification(state, 'student1', 'crafting_mastery');
    assert.strictEqual(cert.level, null);
  });

  test('bronze certification after 2 modules completed', function() {
    var state = freshState();
    var setup = setupCohort(state);
    MentorGuilds.joinCohort(state, 'student1', setup.cohort.id);
    setup.cohort.status = 'active';
    var curriculum = MentorGuilds.getCurriculumById('crafting_mastery');
    // Complete module 0
    for (var i = 0; i < curriculum.modules[0].lessons; i++) {
      MentorGuilds.completeLesson(state, 'student1', setup.cohort.id, i);
    }
    // Advance + complete module 1
    MentorGuilds.advanceModule(state, setup.cohort.id, 1);
    for (var j = 0; j < curriculum.modules[1].lessons; j++) {
      MentorGuilds.completeLesson(state, 'student1', setup.cohort.id, j);
    }
    var cert = MentorGuilds.getCertification(state, 'student1', 'crafting_mastery');
    assert.strictEqual(cert.level, 'bronze');
    assert(typeof cert.title === 'string' && cert.title.length > 0);
  });

  test('silver certification after 3 modules completed', function() {
    var state = freshState();
    var setup = setupCohort(state);
    MentorGuilds.joinCohort(state, 'student1', setup.cohort.id);
    setup.cohort.status = 'active';
    var curriculum = MentorGuilds.getCurriculumById('crafting_mastery');
    for (var m = 0; m < 3; m++) {
      if (m > 0) MentorGuilds.advanceModule(state, setup.cohort.id, m);
      for (var l = 0; l < curriculum.modules[m].lessons; l++) {
        MentorGuilds.completeLesson(state, 'student1', setup.cohort.id, l);
      }
    }
    var cert = MentorGuilds.getCertification(state, 'student1', 'crafting_mastery');
    assert.strictEqual(cert.level, 'silver');
  });

  test('gold certification after all 5 modules completed', function() {
    var state = freshState();
    var setup = setupCohort(state);
    MentorGuilds.joinCohort(state, 'student1', setup.cohort.id);
    setup.cohort.status = 'active';
    var curriculum = MentorGuilds.getCurriculumById('crafting_mastery');
    for (var m = 0; m < 5; m++) {
      if (m > 0) MentorGuilds.advanceModule(state, setup.cohort.id, m);
      for (var l = 0; l < curriculum.modules[m].lessons; l++) {
        MentorGuilds.completeLesson(state, 'student1', setup.cohort.id, l);
      }
    }
    var cert = MentorGuilds.getCertification(state, 'student1', 'crafting_mastery');
    assert.strictEqual(cert.level, 'gold');
  });

  test('returns correct modulesCompleted count', function() {
    var state = freshState();
    var setup = setupCohort(state);
    MentorGuilds.joinCohort(state, 'student1', setup.cohort.id);
    setup.cohort.status = 'active';
    var curriculum = MentorGuilds.getCurriculumById('crafting_mastery');
    for (var i = 0; i < curriculum.modules[0].lessons; i++) {
      MentorGuilds.completeLesson(state, 'student1', setup.cohort.id, i);
    }
    var cert = MentorGuilds.getCertification(state, 'student1', 'crafting_mastery');
    assert.strictEqual(cert.modulesCompleted, 1);
  });

  test('returns null for unknown curriculum', function() {
    var state = freshState();
    var cert = MentorGuilds.getCertification(state, 'student1', 'nonexistent');
    assert.strictEqual(cert.level, null);
  });

  test('1 module completed = no cert (bronze needs 2)', function() {
    var state = freshState();
    var setup = setupCohort(state);
    MentorGuilds.joinCohort(state, 'student1', setup.cohort.id);
    setup.cohort.status = 'active';
    var curriculum = MentorGuilds.getCurriculumById('crafting_mastery');
    for (var i = 0; i < curriculum.modules[0].lessons; i++) {
      MentorGuilds.completeLesson(state, 'student1', setup.cohort.id, i);
    }
    var cert = MentorGuilds.getCertification(state, 'student1', 'crafting_mastery');
    assert.strictEqual(cert.level, null);
  });
});

// ============================================================================
// SUITE 12: getMentorRank
// ============================================================================

suite('getMentorRank', function() {

  test('new mentor is apprentice_mentor', function() {
    var state = freshState();
    setupGuild(state);
    var rank = MentorGuilds.getMentorRank(state, 'mentor1');
    assert.strictEqual(rank.rank, 'apprentice_mentor');
  });

  test('mentor with 5 graduates is journeyman_mentor', function() {
    var state = freshState();
    state.mentorStats = { 'mentor1': { studentsGraduated: 5, cohortsLed: 1, totalRatings: 0, ratingCount: 0 } };
    var rank = MentorGuilds.getMentorRank(state, 'mentor1');
    assert.strictEqual(rank.rank, 'journeyman_mentor');
  });

  test('mentor with 15 graduates is master_mentor', function() {
    var state = freshState();
    state.mentorStats = { 'mentor1': { studentsGraduated: 15, cohortsLed: 3, totalRatings: 0, ratingCount: 0 } };
    var rank = MentorGuilds.getMentorRank(state, 'mentor1');
    assert.strictEqual(rank.rank, 'master_mentor');
  });

  test('mentor with 30 graduates is grand_mentor', function() {
    var state = freshState();
    state.mentorStats = { 'mentor1': { studentsGraduated: 30, cohortsLed: 6, totalRatings: 0, ratingCount: 0 } };
    var rank = MentorGuilds.getMentorRank(state, 'mentor1');
    assert.strictEqual(rank.rank, 'grand_mentor');
  });

  test('rank xpBonus is 0 for apprentice_mentor', function() {
    var state = freshState();
    setupGuild(state);
    var rank = MentorGuilds.getMentorRank(state, 'mentor1');
    assert.strictEqual(rank.xpBonus, 0.0);
  });

  test('rank xpBonus is 0.1 for journeyman_mentor', function() {
    var state = freshState();
    state.mentorStats = { 'mentor1': { studentsGraduated: 5 } };
    var rank = MentorGuilds.getMentorRank(state, 'mentor1');
    assert.strictEqual(rank.xpBonus, 0.1);
  });

  test('rank xpBonus is 0.2 for master_mentor', function() {
    var state = freshState();
    state.mentorStats = { 'mentor1': { studentsGraduated: 15 } };
    var rank = MentorGuilds.getMentorRank(state, 'mentor1');
    assert.strictEqual(rank.xpBonus, 0.2);
  });

  test('rank xpBonus is 0.3 for grand_mentor', function() {
    var state = freshState();
    state.mentorStats = { 'mentor1': { studentsGraduated: 30 } };
    var rank = MentorGuilds.getMentorRank(state, 'mentor1');
    assert.strictEqual(rank.xpBonus, 0.3);
  });

  test('returns apprentice_mentor for unknown mentor', function() {
    var state = freshState();
    var rank = MentorGuilds.getMentorRank(state, 'nobody');
    assert.strictEqual(rank.rank, 'apprentice_mentor');
  });

  test('studentsGraduated returned in rank info', function() {
    var state = freshState();
    state.mentorStats = { 'mentor1': { studentsGraduated: 7 } };
    var rank = MentorGuilds.getMentorRank(state, 'mentor1');
    assert.strictEqual(rank.studentsGraduated, 7);
  });

  test('4 graduates stays apprentice (needs 5)', function() {
    var state = freshState();
    state.mentorStats = { 'mentor1': { studentsGraduated: 4 } };
    var rank = MentorGuilds.getMentorRank(state, 'mentor1');
    assert.strictEqual(rank.rank, 'apprentice_mentor');
  });

  test('29 graduates stays master (needs 30 for grand)', function() {
    var state = freshState();
    state.mentorStats = { 'mentor1': { studentsGraduated: 29 } };
    var rank = MentorGuilds.getMentorRank(state, 'mentor1');
    assert.strictEqual(rank.rank, 'master_mentor');
  });
});

// ============================================================================
// SUITE 13: getCohortProgress
// ============================================================================

suite('getCohortProgress', function() {

  test('returns null for unknown cohort', function() {
    var state = freshState();
    var result = MentorGuilds.getCohortProgress(state, 'bad_id');
    assert.strictEqual(result, null);
  });

  test('returns cohortId in result', function() {
    var state = freshState();
    var setup = setupCohort(state);
    MentorGuilds.joinCohort(state, 'student1', setup.cohort.id);
    var result = MentorGuilds.getCohortProgress(state, setup.cohort.id);
    assert.strictEqual(result.cohortId, setup.cohort.id);
  });

  test('returns status', function() {
    var state = freshState();
    var setup = setupCohort(state);
    var result = MentorGuilds.getCohortProgress(state, setup.cohort.id);
    assert(typeof result.status === 'string');
  });

  test('students array has one entry per enrolled student', function() {
    var state = freshState();
    var setup = setupCohort(state);
    joinStudents(state, setup.cohort.id, ['s1', 's2', 's3']);
    var result = MentorGuilds.getCohortProgress(state, setup.cohort.id);
    assert.strictEqual(result.students.length, 3);
  });

  test('each student entry has studentId, totalXP, lessonsCompleted, modulesCompleted', function() {
    var state = freshState();
    var setup = setupCohort(state);
    MentorGuilds.joinCohort(state, 'student1', setup.cohort.id);
    var result = MentorGuilds.getCohortProgress(state, setup.cohort.id);
    var entry = result.students[0];
    assert.strictEqual(entry.studentId, 'student1');
    assert(typeof entry.totalXP === 'number');
    assert(typeof entry.lessonsCompleted === 'number');
    assert(typeof entry.modulesCompleted === 'number');
  });

  test('XP reflects completed lessons', function() {
    var state = freshState();
    var setup = setupCohort(state);
    MentorGuilds.joinCohort(state, 'student1', setup.cohort.id);
    setup.cohort.status = 'active';
    MentorGuilds.completeLesson(state, 'student1', setup.cohort.id, 0);
    var result = MentorGuilds.getCohortProgress(state, setup.cohort.id);
    assert(result.students[0].totalXP > 0);
  });
});

// ============================================================================
// SUITE 14: getStudentHistory
// ============================================================================

suite('getStudentHistory', function() {

  test('returns empty array for student with no cohorts', function() {
    var state = freshState();
    var history = MentorGuilds.getStudentHistory(state, 'nobody');
    assert.strictEqual(history.length, 0);
  });

  test('returns one entry per cohort the student participated in', function() {
    var state = freshState();
    var s1 = setupCohort(state, 'mentor1', 'crafting_mastery');
    MentorGuilds.joinCohort(state, 'student1', s1.cohort.id);

    var s2 = setupCohort(state, 'mentor2', 'combat_training');
    MentorGuilds.joinCohort(state, 'student1', s2.cohort.id);

    var history = MentorGuilds.getStudentHistory(state, 'student1');
    assert.strictEqual(history.length, 2);
  });

  test('history entry has curriculumId', function() {
    var state = freshState();
    var setup = setupCohort(state);
    MentorGuilds.joinCohort(state, 'student1', setup.cohort.id);
    var history = MentorGuilds.getStudentHistory(state, 'student1');
    assert.strictEqual(history[0].curriculumId, 'crafting_mastery');
  });

  test('history entry has lessonsCompleted', function() {
    var state = freshState();
    var setup = setupCohort(state);
    MentorGuilds.joinCohort(state, 'student1', setup.cohort.id);
    setup.cohort.status = 'active';
    MentorGuilds.completeLesson(state, 'student1', setup.cohort.id, 0);
    var history = MentorGuilds.getStudentHistory(state, 'student1');
    assert.strictEqual(history[0].lessonsCompleted, 1);
  });

  test('history includes left=true for dropped cohorts', function() {
    var state = freshState();
    var setup = setupCohort(state);
    MentorGuilds.joinCohort(state, 'student1', setup.cohort.id);
    MentorGuilds.leaveCohort(state, 'student1', setup.cohort.id);
    var history = MentorGuilds.getStudentHistory(state, 'student1');
    assert(history[0].left === true);
  });

  test('history tracks multiple curricula', function() {
    var state = freshState();
    var setupA = setupCohort(state, 'mentor1', 'crafting_mastery');
    var setupB = setupCohort(state, 'mentor2', 'fishing_school');
    MentorGuilds.joinCohort(state, 'student1', setupA.cohort.id);
    MentorGuilds.joinCohort(state, 'student1', setupB.cohort.id);
    var history = MentorGuilds.getStudentHistory(state, 'student1');
    var currIds = history.map(function(h) { return h.curriculumId; });
    assert(currIds.indexOf('crafting_mastery') !== -1);
    assert(currIds.indexOf('fishing_school') !== -1);
  });
});

// ============================================================================
// SUITE 15: graduateCohort
// ============================================================================

suite('graduateCohort', function() {

  test('graduates cohort successfully', function() {
    var state = freshState();
    var setup = setupCohort(state);
    joinStudents(state, setup.cohort.id, ['s1', 's2', 's3', 's4', 's5']);
    var result = MentorGuilds.graduateCohort(state, setup.cohort.id);
    assert(result.success, result.reason);
  });

  test('cohort status set to completed', function() {
    var state = freshState();
    var setup = setupCohort(state);
    MentorGuilds.joinCohort(state, 's1', setup.cohort.id);
    MentorGuilds.graduateCohort(state, setup.cohort.id);
    assert.strictEqual(setup.cohort.status, 'completed');
  });

  test('graduates array contains all students', function() {
    var state = freshState();
    var setup = setupCohort(state);
    joinStudents(state, setup.cohort.id, ['s1', 's2', 's3']);
    var result = MentorGuilds.graduateCohort(state, setup.cohort.id);
    assert.strictEqual(result.graduates.length, 3);
  });

  test('each graduate entry has studentId', function() {
    var state = freshState();
    var setup = setupCohort(state);
    MentorGuilds.joinCohort(state, 's1', setup.cohort.id);
    var result = MentorGuilds.graduateCohort(state, setup.cohort.id);
    assert(result.graduates[0].studentId === 's1');
  });

  test('mentor studentsGraduated incremented by certified count', function() {
    var state = freshState();
    var setup = setupCohort(state);
    MentorGuilds.joinCohort(state, 's1', setup.cohort.id);
    setup.cohort.status = 'active';
    // Complete 2 modules for s1 to earn bronze
    var curriculum = MentorGuilds.getCurriculumById('crafting_mastery');
    for (var i = 0; i < curriculum.modules[0].lessons; i++) MentorGuilds.completeLesson(state, 's1', setup.cohort.id, i);
    MentorGuilds.advanceModule(state, setup.cohort.id, 1);
    for (var j = 0; j < curriculum.modules[1].lessons; j++) MentorGuilds.completeLesson(state, 's1', setup.cohort.id, j);
    MentorGuilds.graduateCohort(state, setup.cohort.id);
    assert.strictEqual(state.mentorStats['mentor1'].studentsGraduated, 1);
  });

  test('mentorXP awarded per certified graduate', function() {
    var state = freshState();
    var setup = setupCohort(state);
    MentorGuilds.joinCohort(state, 's1', setup.cohort.id);
    setup.cohort.status = 'active';
    var curriculum = MentorGuilds.getCurriculumById('crafting_mastery');
    for (var i = 0; i < curriculum.modules[0].lessons; i++) MentorGuilds.completeLesson(state, 's1', setup.cohort.id, i);
    MentorGuilds.advanceModule(state, setup.cohort.id, 1);
    for (var j = 0; j < curriculum.modules[1].lessons; j++) MentorGuilds.completeLesson(state, 's1', setup.cohort.id, j);
    var result = MentorGuilds.graduateCohort(state, setup.cohort.id);
    assert(result.mentorXP > 0);
  });

  test('fails to graduate already completed cohort', function() {
    var state = freshState();
    var setup = setupCohort(state);
    MentorGuilds.joinCohort(state, 's1', setup.cohort.id);
    MentorGuilds.graduateCohort(state, setup.cohort.id);
    var result = MentorGuilds.graduateCohort(state, setup.cohort.id);
    assert(!result.success);
  });

  test('fails for non-existent cohort', function() {
    var state = freshState();
    var result = MentorGuilds.graduateCohort(state, 'bad_id');
    assert(!result.success);
  });

  test('student with no modules has null certification', function() {
    var state = freshState();
    var setup = setupCohort(state);
    MentorGuilds.joinCohort(state, 's1', setup.cohort.id);
    var result = MentorGuilds.graduateCohort(state, setup.cohort.id);
    assert.strictEqual(result.graduates[0].certification, null);
  });

  test('mentorXP is 0 when no graduates earned certifications', function() {
    var state = freshState();
    var setup = setupCohort(state);
    MentorGuilds.joinCohort(state, 's1', setup.cohort.id);
    var result = MentorGuilds.graduateCohort(state, setup.cohort.id);
    assert.strictEqual(result.mentorXP, 0);
  });
});

// ============================================================================
// SUITE 16: getLeaderboard
// ============================================================================

suite('getLeaderboard', function() {

  test('returns array', function() {
    var state = freshState();
    var board = MentorGuilds.getLeaderboard(state, 'crafting_mastery', 10);
    assert(Array.isArray(board));
  });

  test('returns empty array when no students', function() {
    var state = freshState();
    var board = MentorGuilds.getLeaderboard(state, 'crafting_mastery', 10);
    assert.strictEqual(board.length, 0);
  });

  test('sorted by totalXP descending', function() {
    var state = freshState();
    var setupA = setupCohort(state, 'mentor1', 'crafting_mastery');
    MentorGuilds.joinCohort(state, 's1', setupA.cohort.id);
    MentorGuilds.joinCohort(state, 's2', setupA.cohort.id);
    setupA.cohort.status = 'active';
    // s1 completes 2 lessons, s2 completes 1
    MentorGuilds.completeLesson(state, 's1', setupA.cohort.id, 0);
    MentorGuilds.completeLesson(state, 's1', setupA.cohort.id, 1);
    MentorGuilds.completeLesson(state, 's2', setupA.cohort.id, 0);
    var board = MentorGuilds.getLeaderboard(state, 'crafting_mastery', 10);
    assert(board[0].totalXP >= board[1].totalXP);
    assert.strictEqual(board[0].studentId, 's1');
  });

  test('count parameter limits results', function() {
    var state = freshState();
    var setup = setupCohort(state, 'mentor1', 'crafting_mastery');
    joinStudents(state, setup.cohort.id, ['s1', 's2', 's3', 's4', 's5']);
    setup.cohort.status = 'active';
    for (var i = 1; i <= 5; i++) {
      MentorGuilds.completeLesson(state, 's' + i, setup.cohort.id, 0);
    }
    var board = MentorGuilds.getLeaderboard(state, 'crafting_mastery', 3);
    assert.strictEqual(board.length, 3);
  });

  test('defaults to 10 results if count not provided', function() {
    var state = freshState();
    // Add only 2 students
    var setup = setupCohort(state, 'mentor1', 'crafting_mastery');
    MentorGuilds.joinCohort(state, 's1', setup.cohort.id);
    MentorGuilds.joinCohort(state, 's2', setup.cohort.id);
    setup.cohort.status = 'active';
    MentorGuilds.completeLesson(state, 's1', setup.cohort.id, 0);
    var board = MentorGuilds.getLeaderboard(state, 'crafting_mastery');
    assert(board.length <= 10);
  });

  test('only includes students in specified curriculum', function() {
    var state = freshState();
    var craft = setupCohort(state, 'mentor1', 'crafting_mastery');
    var combat = setupCohort(state, 'mentor2', 'combat_training');
    MentorGuilds.joinCohort(state, 's1', craft.cohort.id);
    MentorGuilds.joinCohort(state, 's2', combat.cohort.id);
    craft.cohort.status = 'active';
    combat.cohort.status = 'active';
    MentorGuilds.completeLesson(state, 's1', craft.cohort.id, 0);
    MentorGuilds.completeLesson(state, 's2', combat.cohort.id, 0);
    var board = MentorGuilds.getLeaderboard(state, 'crafting_mastery', 10);
    for (var i = 0; i < board.length; i++) {
      assert.notStrictEqual(board[i].studentId, 's2', 's2 in combat, not crafting');
    }
  });

  test('each entry has studentId and totalXP', function() {
    var state = freshState();
    var setup = setupCohort(state, 'mentor1', 'crafting_mastery');
    MentorGuilds.joinCohort(state, 's1', setup.cohort.id);
    setup.cohort.status = 'active';
    MentorGuilds.completeLesson(state, 's1', setup.cohort.id, 0);
    var board = MentorGuilds.getLeaderboard(state, 'crafting_mastery', 5);
    assert(typeof board[0].studentId === 'string');
    assert(typeof board[0].totalXP === 'number');
  });
});

// ============================================================================
// SUITE 17: getMentorStats
// ============================================================================

suite('getMentorStats', function() {

  test('returns mentor stats object', function() {
    var state = freshState();
    setupGuild(state);
    var stats = MentorGuilds.getMentorStats(state, 'mentor1');
    assert(typeof stats === 'object' && stats !== null);
  });

  test('cohortsLed reflects cohorts created', function() {
    var state = freshState();
    var g = setupGuild(state);
    MentorGuilds.createCohort(state, 'mentor1', g.guild.id, 'crafting_mastery');
    MentorGuilds.createCohort(state, 'mentor1', g.guild.id, 'combat_training');
    var stats = MentorGuilds.getMentorStats(state, 'mentor1');
    assert.strictEqual(stats.cohortsLed, 2);
  });

  test('studentsGraduated reflects graduated count', function() {
    var state = freshState();
    var setup = setupCohort(state);
    MentorGuilds.joinCohort(state, 's1', setup.cohort.id);
    setup.cohort.status = 'active';
    var curriculum = MentorGuilds.getCurriculumById('crafting_mastery');
    // Complete 2 modules for bronze
    for (var i = 0; i < curriculum.modules[0].lessons; i++) MentorGuilds.completeLesson(state, 's1', setup.cohort.id, i);
    MentorGuilds.advanceModule(state, setup.cohort.id, 1);
    for (var j = 0; j < curriculum.modules[1].lessons; j++) MentorGuilds.completeLesson(state, 's1', setup.cohort.id, j);
    MentorGuilds.graduateCohort(state, setup.cohort.id);
    var stats = MentorGuilds.getMentorStats(state, 'mentor1');
    assert.strictEqual(stats.studentsGraduated, 1);
  });

  test('avgRating is 0 if no reviews received', function() {
    var state = freshState();
    setupGuild(state);
    var stats = MentorGuilds.getMentorStats(state, 'mentor1');
    assert.strictEqual(stats.avgRating, 0);
  });

  test('rank matches getMentorRank', function() {
    var state = freshState();
    setupGuild(state);
    var stats = MentorGuilds.getMentorStats(state, 'mentor1');
    var rank = MentorGuilds.getMentorRank(state, 'mentor1');
    assert.strictEqual(stats.rank, rank.rank);
  });

  test('mentorId included in stats', function() {
    var state = freshState();
    setupGuild(state);
    var stats = MentorGuilds.getMentorStats(state, 'mentor1');
    assert.strictEqual(stats.mentorId, 'mentor1');
  });

  test('unknown mentor returns zeroed stats', function() {
    var state = freshState();
    var stats = MentorGuilds.getMentorStats(state, 'nobody');
    assert.strictEqual(stats.cohortsLed, 0);
    assert.strictEqual(stats.studentsGraduated, 0);
    assert.strictEqual(stats.avgRating, 0);
  });
});

// ============================================================================
// SUITE 18: getActiveCohorts
// ============================================================================

suite('getActiveCohorts', function() {

  test('returns active cohorts for guild', function() {
    var state = freshState();
    var g = setupGuild(state);
    var r1 = MentorGuilds.createCohort(state, 'mentor1', g.guild.id, 'crafting_mastery');
    r1.cohort.status = 'active';
    var active = MentorGuilds.getActiveCohorts(state, g.guild.id);
    assert.strictEqual(active.length, 1);
  });

  test('recruiting cohorts included in active', function() {
    var state = freshState();
    var g = setupGuild(state);
    MentorGuilds.createCohort(state, 'mentor1', g.guild.id, 'crafting_mastery');
    var active = MentorGuilds.getActiveCohorts(state, g.guild.id);
    assert.strictEqual(active.length, 1);
  });

  test('completed cohorts not included', function() {
    var state = freshState();
    var g = setupGuild(state);
    var r1 = MentorGuilds.createCohort(state, 'mentor1', g.guild.id, 'crafting_mastery');
    MentorGuilds.joinCohort(state, 's1', r1.cohort.id);
    MentorGuilds.graduateCohort(state, r1.cohort.id);
    var active = MentorGuilds.getActiveCohorts(state, g.guild.id);
    assert.strictEqual(active.length, 0);
  });

  test('returns empty array for guild with no cohorts', function() {
    var state = freshState();
    var g = setupGuild(state);
    var active = MentorGuilds.getActiveCohorts(state, g.guild.id);
    assert.strictEqual(active.length, 0);
  });

  test('does not return cohorts from other guilds', function() {
    var state = freshState();
    var g1 = setupGuild(state, 'mentor1', 'Guild 1');
    var g2 = setupGuild(state, 'mentor2', 'Guild 2');
    MentorGuilds.createCohort(state, 'mentor1', g1.guild.id, 'crafting_mastery');
    var active = MentorGuilds.getActiveCohorts(state, g2.guild.id);
    assert.strictEqual(active.length, 0);
  });
});

// ============================================================================
// SUITE 19: getCohort
// ============================================================================

suite('getCohort', function() {

  test('returns cohort by id', function() {
    var state = freshState();
    var setup = setupCohort(state);
    var cohort = MentorGuilds.getCohort(state, setup.cohort.id);
    assert(cohort !== null);
    assert.strictEqual(cohort.id, setup.cohort.id);
  });

  test('returns null for unknown id', function() {
    var state = freshState();
    var cohort = MentorGuilds.getCohort(state, 'bad_id');
    assert.strictEqual(cohort, null);
  });
});

// ============================================================================
// SUITE 20: Edge cases
// ============================================================================

suite('Edge cases', function() {

  test('completeLesson fails on disbanded cohort', function() {
    var state = freshState();
    var setup = setupCohort(state);
    joinStudents(state, setup.cohort.id, ['s1', 's2', 's3', 's4', 's5']);
    // Disjoint all students to disband
    for (var i = 1; i <= 5; i++) MentorGuilds.leaveCohort(state, 's' + i, setup.cohort.id);
    var result = MentorGuilds.completeLesson(state, 's1', setup.cohort.id, 0);
    assert(!result.success);
  });

  test('student leaving mid-lesson preserves XP earned before leaving', function() {
    var state = freshState();
    var setup = setupCohort(state);
    MentorGuilds.joinCohort(state, 's1', setup.cohort.id);
    setup.cohort.status = 'active';
    MentorGuilds.completeLesson(state, 's1', setup.cohort.id, 0);
    var xpBefore = setup.cohort.progress['s1'].totalXP;
    MentorGuilds.leaveCohort(state, 's1', setup.cohort.id);
    // Progress record preserved
    assert(setup.cohort.progress['s1'] !== undefined);
    assert.strictEqual(setup.cohort.progress['s1'].totalXP, xpBefore);
  });

  test('graduating incomplete cohort gives null certification', function() {
    var state = freshState();
    var setup = setupCohort(state);
    MentorGuilds.joinCohort(state, 's1', setup.cohort.id);
    // No lessons completed
    var result = MentorGuilds.graduateCohort(state, setup.cohort.id);
    assert(result.success);
    assert.strictEqual(result.graduates[0].certification, null);
    assert.strictEqual(result.mentorXP, 0);
  });

  test('reviewing self in cohort fails', function() {
    var state = freshState();
    var setup = setupCohort(state);
    joinStudents(state, setup.cohort.id, ['s1', 's2', 's3', 's4', 's5']);
    var result = MentorGuilds.submitPeerReview(state, 's3', setup.cohort.id, 's3', 5, 'I am great');
    assert(!result.success);
  });

  test('joining cohort with invalid studentId fails', function() {
    var state = freshState();
    var setup = setupCohort(state);
    var result = MentorGuilds.joinCohort(state, '', setup.cohort.id);
    assert(!result.success);
  });

  test('advanceModule on completed cohort fails', function() {
    var state = freshState();
    var setup = setupCohort(state);
    MentorGuilds.joinCohort(state, 's1', setup.cohort.id);
    MentorGuilds.graduateCohort(state, setup.cohort.id);
    var result = MentorGuilds.advanceModule(state, setup.cohort.id, 1);
    assert(!result.success);
  });

  test('two students in same cohort accumulate XP independently', function() {
    var state = freshState();
    var setup = setupCohort(state);
    MentorGuilds.joinCohort(state, 's1', setup.cohort.id);
    MentorGuilds.joinCohort(state, 's2', setup.cohort.id);
    setup.cohort.status = 'active';
    MentorGuilds.completeLesson(state, 's1', setup.cohort.id, 0);
    MentorGuilds.completeLesson(state, 's1', setup.cohort.id, 1);
    MentorGuilds.completeLesson(state, 's2', setup.cohort.id, 0);
    var xp1 = setup.cohort.progress['s1'].totalXP;
    var xp2 = setup.cohort.progress['s2'].totalXP;
    assert(xp1 > xp2);
  });

  test('multiple peer reviews for same pair allowed', function() {
    var state = freshState();
    var setup = setupCohort(state);
    joinStudents(state, setup.cohort.id, ['s1', 's2', 's3', 's4', 's5']);
    MentorGuilds.submitPeerReview(state, 's1', setup.cohort.id, 's2', 3, 'First review');
    MentorGuilds.submitPeerReview(state, 's1', setup.cohort.id, 's2', 5, 'Second review');
    assert.strictEqual(setup.cohort.peerReviews.length, 2);
  });

  test('non-integer rating fails', function() {
    var state = freshState();
    var setup = setupCohort(state);
    joinStudents(state, setup.cohort.id, ['s1', 's2', 's3', 's4', 's5']);
    var result = MentorGuilds.submitPeerReview(state, 's1', setup.cohort.id, 's2', 'five', 'bad rating');
    assert(!result.success);
  });

  test('getMentorGuilds returns copy, not internal reference', function() {
    var state = freshState();
    MentorGuilds.createMentorGuild(state, 'founder1', 'Guild A');
    var guilds = MentorGuilds.getMentorGuilds(state);
    guilds.push({ id: 'fake' });
    var guilds2 = MentorGuilds.getMentorGuilds(state);
    assert.strictEqual(guilds2.length, 1);
  });

  test('getLeaderboard with 0 count returns empty', function() {
    var state = freshState();
    var setup = setupCohort(state, 'mentor1', 'crafting_mastery');
    MentorGuilds.joinCohort(state, 's1', setup.cohort.id);
    setup.cohort.status = 'active';
    MentorGuilds.completeLesson(state, 's1', setup.cohort.id, 0);
    var board = MentorGuilds.getLeaderboard(state, 'crafting_mastery', 0);
    assert.strictEqual(board.length, 0);
  });

  test('student in 0 cohorts has empty history', function() {
    var state = freshState();
    var history = MentorGuilds.getStudentHistory(state, 'ghost_student');
    assert.deepEqual(history, []);
  });

  test('createCohort with missing mentorId fails', function() {
    var state = freshState();
    var g = setupGuild(state);
    var result = MentorGuilds.createCohort(state, null, g.guild.id, 'crafting_mastery');
    assert(!result.success);
  });

  test('peerReview feedback can be empty string', function() {
    var state = freshState();
    var setup = setupCohort(state);
    joinStudents(state, setup.cohort.id, ['s1', 's2', 's3', 's4', 's5']);
    var result = MentorGuilds.submitPeerReview(state, 's1', setup.cohort.id, 's2', 3, '');
    assert(result.success);
    assert.strictEqual(result.review.feedback, '');
  });

  test('MAX_COHORT_STUDENTS exported and equals 5', function() {
    assert.strictEqual(MentorGuilds.MAX_COHORT_STUDENTS, 5);
  });
});

// ============================================================================
// Final report
// ============================================================================

var ok = report();
process.exit(ok ? 0 : 1);
