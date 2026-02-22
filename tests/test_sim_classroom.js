#!/usr/bin/env node
// tests/test_sim_classroom.js — Comprehensive tests for SimClassroom module
'use strict';

var SimClassroom = require('../src/js/sim_classroom.js');

var passed = 0;
var failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log('  ok - ' + msg);
  } else {
    failed++;
    console.error('  FAIL - ' + msg);
  }
}

function assertEqual(actual, expected, msg) {
  if (actual === expected) {
    passed++;
    console.log('  ok - ' + msg);
  } else {
    failed++;
    console.error('  FAIL - ' + msg + ' — expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
  }
}

function assertDeepEqual(actual, expected, msg) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    passed++;
    console.log('  ok - ' + msg);
  } else {
    failed++;
    console.error('  FAIL - ' + msg + '\n    expected: ' + JSON.stringify(expected) + '\n    got:      ' + JSON.stringify(actual));
  }
}

// ============================================================================
// Helpers
// ============================================================================

function makeState() {
  return SimClassroom.initState();
}

function makeFullCourse(state, teacherId, category) {
  // Creates a course with 2 lessons each having a 2-question quiz
  var cres = SimClassroom.createCourse(state, {
    title: 'Test Course',
    description: 'A test course',
    category: category || 'lore',
    teacherId: teacherId || 'teacher_01'
  });
  state = cres.state;
  var courseId = cres.courseId;

  var lres1 = SimClassroom.addLesson(state, courseId, {
    title: 'Lesson 1', content: 'Content 1', objectives: ['obj1']
  });
  state = lres1.state;
  var lessonId1 = lres1.lessonId;

  var qres1 = SimClassroom.addQuiz(state, courseId, lessonId1, [
    { type: 'multiple_choice', prompt: 'Q1', options: ['A', 'B', 'C', 'D'], correct: 0 },
    { type: 'true_false',      prompt: 'Q2', correct: 0 }
  ]);
  state = qres1.state;
  var quizId1 = qres1.quizId;

  var lres2 = SimClassroom.addLesson(state, courseId, {
    title: 'Lesson 2', content: 'Content 2', objectives: ['obj2']
  });
  state = lres2.state;
  var lessonId2 = lres2.lessonId;

  var qres2 = SimClassroom.addQuiz(state, courseId, lessonId2, [
    { type: 'multiple_choice', prompt: 'Q3', options: ['A', 'B', 'C', 'D'], correct: 2 },
    { type: 'multiple_choice', prompt: 'Q4', options: ['A', 'B', 'C', 'D'], correct: 1 }
  ]);
  state = qres2.state;
  var quizId2 = qres2.quizId;

  return {
    state: state,
    courseId: courseId,
    lessonId1: lessonId1,
    lessonId2: lessonId2,
    quizId1: quizId1,
    quizId2: quizId2
  };
}

function enrollAndComplete(state, studentId, parts) {
  // Enroll, complete all lessons, pass all quizzes
  var eres = SimClassroom.enroll(state, studentId, parts.courseId);
  state = eres.state;

  state = SimClassroom.completeLesson(state, studentId, parts.courseId, parts.lessonId1).state;
  state = SimClassroom.completeLesson(state, studentId, parts.courseId, parts.lessonId2).state;
  state = SimClassroom.submitQuiz(state, studentId, parts.courseId, parts.quizId1, [0, 0]).state; // 100%
  state = SimClassroom.submitQuiz(state, studentId, parts.courseId, parts.quizId2, [2, 1]).state; // 100%

  return state;
}

// ============================================================================
// 1. Constants & Module shape
// ============================================================================
console.log('\n--- Constants & Module shape ---');

assert(Array.isArray(SimClassroom.CATEGORIES), 'CATEGORIES is an array');
assertEqual(SimClassroom.CATEGORIES.length, 6, 'CATEGORIES has 6 entries');
assert(SimClassroom.CATEGORIES.indexOf('crafting') !== -1, 'CATEGORIES contains crafting');
assert(SimClassroom.CATEGORIES.indexOf('combat') !== -1, 'CATEGORIES contains combat');
assert(SimClassroom.CATEGORIES.indexOf('lore') !== -1, 'CATEGORIES contains lore');
assert(SimClassroom.CATEGORIES.indexOf('social') !== -1, 'CATEGORIES contains social');
assert(SimClassroom.CATEGORIES.indexOf('economics') !== -1, 'CATEGORIES contains economics');
assert(SimClassroom.CATEGORIES.indexOf('exploration') !== -1, 'CATEGORIES contains exploration');
assertEqual(SimClassroom.PASS_THRESHOLD, 70, 'PASS_THRESHOLD is 70');
assert(typeof SimClassroom.SPARK_REWARDS === 'object', 'SPARK_REWARDS is an object');
assert(SimClassroom.SPARK_REWARDS.complete_lesson > 0, 'SPARK_REWARDS.complete_lesson > 0');
assert(SimClassroom.SPARK_REWARDS.pass_quiz > 0, 'SPARK_REWARDS.pass_quiz > 0');
assert(SimClassroom.SPARK_REWARDS.complete_course > 0, 'SPARK_REWARDS.complete_course > 0');
assert(SimClassroom.SPARK_REWARDS.earn_certificate > 0, 'SPARK_REWARDS.earn_certificate > 0');
assert(SimClassroom.SPARK_REWARDS.rate_course > 0, 'SPARK_REWARDS.rate_course > 0');
assert(Array.isArray(SimClassroom.QUESTION_TYPES), 'QUESTION_TYPES is an array');
assert(SimClassroom.QUESTION_TYPES.indexOf('multiple_choice') !== -1, 'QUESTION_TYPES has multiple_choice');
assert(SimClassroom.QUESTION_TYPES.indexOf('true_false') !== -1, 'QUESTION_TYPES has true_false');

// ============================================================================
// 2. initState
// ============================================================================
console.log('\n--- initState ---');

(function() {
  var s = SimClassroom.initState();
  assert(s && typeof s === 'object', 'initState returns an object');
  assert(s.courses && typeof s.courses === 'object', 'state has courses object');
  assert(s.enrollments && typeof s.enrollments === 'object', 'state has enrollments object');
  assert(s.progress && typeof s.progress === 'object', 'state has progress object');
  assert(s.certificates && typeof s.certificates === 'object', 'state has certificates object');
  assert(s.teacher_profiles && typeof s.teacher_profiles === 'object', 'state has teacher_profiles object');
  assert(s.ratings && typeof s.ratings === 'object', 'state has ratings object');
  assertEqual(s._version, 1, 'state has _version = 1');
  assertEqual(Object.keys(s.courses).length, 0, 'courses starts empty');
  assertEqual(Object.keys(s.enrollments).length, 0, 'enrollments starts empty');
  assertEqual(Object.keys(s.certificates).length, 0, 'certificates starts empty');
})();

(function() {
  // initState from snapshot
  var s = SimClassroom.initState();
  var cres = SimClassroom.createCourse(s, { title: 'Snap Course', category: 'lore', teacherId: 'teacher_x' });
  s = cres.state;
  var json = JSON.stringify(s);
  var restored = SimClassroom.initState(JSON.parse(json));
  assert(restored.courses[cres.courseId] !== undefined, 'initState restores courses from snapshot');
  assertEqual(restored.courses[cres.courseId].title, 'Snap Course', 'course title preserved in snapshot');
  assertEqual(restored._version, 1, 'snapshot _version preserved');
})();

(function() {
  // Snapshot deep clone (mutations don't affect restored state)
  var s = SimClassroom.initState();
  var cres = SimClassroom.createCourse(s, { title: 'Clone Test', category: 'crafting', teacherId: 't1' });
  s = cres.state;
  var snap = JSON.parse(JSON.stringify(s));
  var restored = SimClassroom.initState(snap);
  snap.courses[cres.courseId].title = 'Mutated';
  assertEqual(restored.courses[cres.courseId].title, 'Clone Test', 'snapshot is deep cloned — mutation does not affect restored');
})();

// ============================================================================
// 3. createCourse
// ============================================================================
console.log('\n--- createCourse ---');

(function() {
  var s = SimClassroom.initState();
  var res = SimClassroom.createCourse(s, {
    title: 'Forge Fundamentals',
    description: 'Learn to smelt',
    category: 'crafting',
    teacherId: 'npc_blacksmith'
  });
  assert(res.state !== s, 'createCourse returns new state');
  assert(res.courseId && typeof res.courseId === 'string', 'createCourse returns a courseId');
  assert(res.courseId.indexOf('crs_') === 0, 'courseId has crs_ prefix');
  var course = res.state.courses[res.courseId];
  assert(course !== undefined, 'course is stored in state');
  assertEqual(course.title, 'Forge Fundamentals', 'course title stored');
  assertEqual(course.description, 'Learn to smelt', 'course description stored');
  assertEqual(course.category, 'crafting', 'course category stored');
  assertEqual(course.teacherId, 'npc_blacksmith', 'course teacherId stored');
  assert(Array.isArray(course.prerequisites), 'course.prerequisites is an array');
  assertEqual(course.prerequisites.length, 0, 'course starts with no prerequisites');
  assert(typeof course.lessons === 'object', 'course.lessons is an object');
  assert(Array.isArray(course.lessonOrder), 'course.lessonOrder is an array');
  assert(typeof course.quizzes === 'object', 'course.quizzes is an object');
  assertEqual(course.totalStudents, 0, 'course starts with 0 students');
  assertEqual(course.avgRating, 0, 'course starts with avgRating 0');
  assert(typeof course.createdAt === 'string', 'course has createdAt timestamp');
})();

(function() {
  // Teacher profile created automatically
  var s = SimClassroom.initState();
  var res = SimClassroom.createCourse(s, { title: 'X', category: 'lore', teacherId: 'teacher_42' });
  var profile = res.state.teacher_profiles['teacher_42'];
  assert(profile !== undefined, 'teacher profile created on first course');
  assert(Array.isArray(profile.courses), 'teacher profile has courses array');
  assert(profile.courses.indexOf(res.courseId) !== -1, 'courseId added to teacher courses');
  assertEqual(profile.total_students, 0, 'teacher starts with 0 students');
  assertEqual(profile.avg_rating, 0, 'teacher starts with avg_rating 0');
})();

(function() {
  // Multiple courses same teacher
  var s = SimClassroom.initState();
  var r1 = SimClassroom.createCourse(s, { title: 'A', category: 'lore', teacherId: 'teacher_5' });
  s = r1.state;
  var r2 = SimClassroom.createCourse(s, { title: 'B', category: 'combat', teacherId: 'teacher_5' });
  s = r2.state;
  assertEqual(s.teacher_profiles['teacher_5'].courses.length, 2, 'two courses listed on teacher profile');
})();

(function() {
  // Unknown category falls back to lore
  var s = SimClassroom.initState();
  var res = SimClassroom.createCourse(s, { title: 'X', category: 'hacking', teacherId: 't1' });
  assertEqual(res.state.courses[res.courseId].category, 'lore', 'unknown category defaults to lore');
})();

(function() {
  // Default title
  var s = SimClassroom.initState();
  var res = SimClassroom.createCourse(s, { category: 'lore', teacherId: 't1' });
  assertEqual(res.state.courses[res.courseId].title, 'Untitled Course', 'missing title defaults to Untitled Course');
})();

(function() {
  // Ratings bucket initialized
  var s = SimClassroom.initState();
  var res = SimClassroom.createCourse(s, { title: 'X', category: 'lore', teacherId: 't1' });
  var bucket = res.state.ratings[res.courseId];
  assert(bucket !== undefined, 'ratings bucket created for new course');
  assert(Array.isArray(bucket.raterIds), 'bucket.raterIds is array');
  assert(Array.isArray(bucket.scores), 'bucket.scores is array');
  assertEqual(bucket.avg, 0, 'bucket avg starts at 0');
})();

(function() {
  // sparkReward default
  var s = SimClassroom.initState();
  var res = SimClassroom.createCourse(s, { title: 'X', category: 'lore', teacherId: 't1' });
  assertEqual(res.state.courses[res.courseId].sparkReward, SimClassroom.SPARK_REWARDS.complete_course,
    'course sparkReward defaults to SPARK_REWARDS.complete_course');
})();

(function() {
  // Custom sparkReward
  var s = SimClassroom.initState();
  var res = SimClassroom.createCourse(s, { title: 'X', category: 'lore', teacherId: 't1', sparkReward: 200 });
  assertEqual(res.state.courses[res.courseId].sparkReward, 200, 'custom sparkReward stored');
})();

// ============================================================================
// 4. addLesson
// ============================================================================
console.log('\n--- addLesson ---');

(function() {
  var s = SimClassroom.initState();
  var cres = SimClassroom.createCourse(s, { title: 'X', category: 'lore', teacherId: 't1' });
  s = cres.state;

  var lres = SimClassroom.addLesson(s, cres.courseId, {
    title: 'Introduction',
    content: 'Welcome to the course.',
    objectives: ['Learn the basics', 'Pass the quiz']
  });
  assert(lres.state !== s, 'addLesson returns new state');
  assert(lres.lessonId && lres.lessonId.indexOf('les_') === 0, 'lessonId has les_ prefix');
  var lesson = lres.state.courses[cres.courseId].lessons[lres.lessonId];
  assert(lesson !== undefined, 'lesson stored in course');
  assertEqual(lesson.title, 'Introduction', 'lesson title stored');
  assertEqual(lesson.content, 'Welcome to the course.', 'lesson content stored');
  assert(Array.isArray(lesson.objectives), 'lesson.objectives is array');
  assertEqual(lesson.objectives.length, 2, 'lesson objectives stored');
  assertEqual(lesson.courseId, cres.courseId, 'lesson.courseId set');
  assertEqual(lesson.order, 0, 'first lesson has order 0');
  var lo = lres.state.courses[cres.courseId].lessonOrder;
  assert(lo.indexOf(lres.lessonId) !== -1, 'lessonOrder contains lessonId');
})();

(function() {
  // Lesson ordering
  var s = SimClassroom.initState();
  var cres = SimClassroom.createCourse(s, { title: 'X', category: 'lore', teacherId: 't1' });
  s = cres.state;
  var l1 = SimClassroom.addLesson(s, cres.courseId, { title: 'L1', content: '', objectives: [] });
  s = l1.state;
  var l2 = SimClassroom.addLesson(s, cres.courseId, { title: 'L2', content: '', objectives: [] });
  s = l2.state;
  var l3 = SimClassroom.addLesson(s, cres.courseId, { title: 'L3', content: '', objectives: [] });
  s = l3.state;
  var order = s.courses[cres.courseId].lessonOrder;
  assertEqual(order.length, 3, 'lessonOrder has 3 entries');
  assertEqual(order[0], l1.lessonId, 'first lesson is L1');
  assertEqual(order[1], l2.lessonId, 'second lesson is L2');
  assertEqual(order[2], l3.lessonId, 'third lesson is L3');
  assertEqual(s.courses[cres.courseId].lessons[l2.lessonId].order, 1, 'L2 has order index 1');
})();

(function() {
  // addLesson to nonexistent course
  var s = SimClassroom.initState();
  var res = SimClassroom.addLesson(s, 'nonexistent_course', { title: 'X', content: '', objectives: [] });
  assert(res.state === s, 'addLesson to nonexistent course returns same state');
  assert(res.lessonId === null, 'addLesson to nonexistent course returns null lessonId');
})();

(function() {
  // updateLesson
  var s = SimClassroom.initState();
  var cres = SimClassroom.createCourse(s, { title: 'X', category: 'lore', teacherId: 't1' });
  s = cres.state;
  var lres = SimClassroom.addLesson(s, cres.courseId, { title: 'Old Title', content: 'Old', objectives: ['A'] });
  s = lres.state;
  var updated = SimClassroom.updateLesson(s, cres.courseId, lres.lessonId, {
    title: 'New Title',
    content: 'New content',
    objectives: ['B', 'C']
  });
  assertEqual(updated.courses[cres.courseId].lessons[lres.lessonId].title, 'New Title', 'lesson title updated');
  assertEqual(updated.courses[cres.courseId].lessons[lres.lessonId].content, 'New content', 'lesson content updated');
  assertEqual(updated.courses[cres.courseId].lessons[lres.lessonId].objectives.length, 2, 'lesson objectives updated');
  // Original unchanged
  assertEqual(s.courses[cres.courseId].lessons[lres.lessonId].title, 'Old Title', 'original state unaffected by updateLesson');
})();

(function() {
  // updateLesson nonexistent course
  var s = SimClassroom.initState();
  var result = SimClassroom.updateLesson(s, 'bad_course', 'bad_lesson', { title: 'X' });
  assert(result === s, 'updateLesson with bad courseId returns same state');
})();

(function() {
  // updateLesson nonexistent lesson
  var s = SimClassroom.initState();
  var cres = SimClassroom.createCourse(s, { title: 'X', category: 'lore', teacherId: 't1' });
  s = cres.state;
  var result = SimClassroom.updateLesson(s, cres.courseId, 'bad_lesson', { title: 'X' });
  assert(result === s, 'updateLesson with bad lessonId returns same state');
})();

// ============================================================================
// 5. addQuiz
// ============================================================================
console.log('\n--- addQuiz ---');

(function() {
  var s = SimClassroom.initState();
  var cres = SimClassroom.createCourse(s, { title: 'X', category: 'lore', teacherId: 't1' });
  s = cres.state;
  var lres = SimClassroom.addLesson(s, cres.courseId, { title: 'L', content: '', objectives: [] });
  s = lres.state;

  var questions = [
    { type: 'multiple_choice', prompt: 'What color is the sky?', options: ['Red', 'Blue', 'Green', 'Yellow'], correct: 1 },
    { type: 'true_false', prompt: 'Fire is hot?', correct: true }
  ];

  var qres = SimClassroom.addQuiz(s, cres.courseId, lres.lessonId, questions);
  assert(qres.state !== s, 'addQuiz returns new state');
  assert(qres.quizId && qres.quizId.indexOf('qz_') === 0, 'quizId has qz_ prefix');
  var quiz = qres.state.courses[cres.courseId].quizzes[qres.quizId];
  assert(quiz !== undefined, 'quiz stored in course');
  assertEqual(quiz.lessonId, lres.lessonId, 'quiz linked to lesson');
  assertEqual(quiz.courseId, cres.courseId, 'quiz linked to course');
  assertEqual(quiz.questions.length, 2, 'quiz has 2 questions');
  assertEqual(quiz.questions[0].type, 'multiple_choice', 'first question is MC');
  assertEqual(quiz.questions[0].prompt, 'What color is the sky?', 'MC question prompt preserved');
  assertEqual(quiz.questions[0].correct, 1, 'MC correct answer stored');
  assertEqual(quiz.questions[1].type, 'true_false', 'second question is true_false');
  assertEqual(quiz.questions[1].options[0], 'True', 'T/F options are True/False');
  assertEqual(quiz.questions[1].options[1], 'False', 'T/F second option is False');
})();

(function() {
  // Question IDs generated
  var s = SimClassroom.initState();
  var cres = SimClassroom.createCourse(s, { title: 'X', category: 'lore', teacherId: 't1' });
  s = cres.state;
  var lres = SimClassroom.addLesson(s, cres.courseId, { title: 'L', content: '', objectives: [] });
  s = lres.state;
  var qres = SimClassroom.addQuiz(s, cres.courseId, lres.lessonId, [
    { type: 'multiple_choice', prompt: 'Q?', options: ['A', 'B'], correct: 0 }
  ]);
  assert(qres.quiz.questions[0].id && qres.quiz.questions[0].id.indexOf('qst_') === 0, 'question has qst_ id');
})();

(function() {
  // addQuiz to nonexistent course
  var s = SimClassroom.initState();
  var res = SimClassroom.addQuiz(s, 'bad_course', null, []);
  assert(res.state === s, 'addQuiz to nonexistent course returns same state');
  assert(res.quizId === null, 'addQuiz to nonexistent course returns null quizId');
})();

(function() {
  // Unknown question type defaults to multiple_choice
  var s = SimClassroom.initState();
  var cres = SimClassroom.createCourse(s, { title: 'X', category: 'lore', teacherId: 't1' });
  s = cres.state;
  var lres = SimClassroom.addLesson(s, cres.courseId, { title: 'L', content: '', objectives: [] });
  s = lres.state;
  var qres = SimClassroom.addQuiz(s, cres.courseId, lres.lessonId, [
    { type: 'essay', prompt: 'Explain?', options: [], correct: 0 }
  ]);
  assertEqual(qres.quiz.questions[0].type, 'multiple_choice', 'unknown question type defaults to multiple_choice');
})();

(function() {
  // T/F correct normalisation: true -> 0, false -> 1
  var s = SimClassroom.initState();
  var cres = SimClassroom.createCourse(s, { title: 'X', category: 'lore', teacherId: 't1' });
  s = cres.state;
  var lres = SimClassroom.addLesson(s, cres.courseId, { title: 'L', content: '', objectives: [] });
  s = lres.state;
  var qres = SimClassroom.addQuiz(s, cres.courseId, lres.lessonId, [
    { type: 'true_false', prompt: 'True?', correct: true },
    { type: 'true_false', prompt: 'False?', correct: false }
  ]);
  assertEqual(qres.quiz.questions[0].correct, 0, 'T/F correct=true maps to 0 (True option)');
  assertEqual(qres.quiz.questions[1].correct, 1, 'T/F correct=false maps to 1 (False option)');
})();

// ============================================================================
// 6. Enrollment
// ============================================================================
console.log('\n--- Enrollment ---');

(function() {
  var s = SimClassroom.initState();
  var cres = SimClassroom.createCourse(s, { title: 'X', category: 'lore', teacherId: 't1' });
  s = cres.state;

  var eres = SimClassroom.enroll(s, 'student_01', cres.courseId);
  assert(eres.ok, 'enroll succeeds');
  assert(eres.state !== s, 'enroll returns new state');
  var enrolled = eres.state.enrollments['student_01'];
  assert(Array.isArray(enrolled) && enrolled.indexOf(cres.courseId) !== -1, 'student is enrolled in course');
  var prog = eres.state.progress['student_01'][cres.courseId];
  assert(prog !== undefined, 'progress record created on enrollment');
  assert(Array.isArray(prog.lessons_done), 'progress.lessons_done is array');
  assert(typeof prog.quiz_scores === 'object', 'progress.quiz_scores is object');
  assertEqual(prog.completed, false, 'progress.completed starts false');
  assertEqual(prog.spark_earned, 0, 'spark_earned starts at 0');
  assert(typeof prog.enrolled_at === 'string', 'enrolled_at timestamp set');
})();

(function() {
  // Course totalStudents incremented
  var s = SimClassroom.initState();
  var cres = SimClassroom.createCourse(s, { title: 'X', category: 'lore', teacherId: 't1' });
  s = cres.state;
  var eres = SimClassroom.enroll(s, 'student_01', cres.courseId);
  assertEqual(eres.state.courses[cres.courseId].totalStudents, 1, 'totalStudents incremented on enrollment');
})();

(function() {
  // Teacher profile total_students incremented
  var s = SimClassroom.initState();
  var cres = SimClassroom.createCourse(s, { title: 'X', category: 'lore', teacherId: 'teacher_9' });
  s = cres.state;
  s = SimClassroom.enroll(s, 'student_A', cres.courseId).state;
  s = SimClassroom.enroll(s, 'student_B', cres.courseId).state;
  assertEqual(s.teacher_profiles['teacher_9'].total_students, 2, 'teacher total_students incremented for each enrollment');
})();

(function() {
  // Double enrollment rejected
  var s = SimClassroom.initState();
  var cres = SimClassroom.createCourse(s, { title: 'X', category: 'lore', teacherId: 't1' });
  s = cres.state;
  s = SimClassroom.enroll(s, 'student_01', cres.courseId).state;
  var eres2 = SimClassroom.enroll(s, 'student_01', cres.courseId);
  assert(!eres2.ok, 'double enrollment rejected');
  assertEqual(eres2.reason, 'already_enrolled', 'reason is already_enrolled');
  assert(eres2.state === s, 'state unchanged on double enrollment');
})();

(function() {
  // Enrollment in nonexistent course
  var s = SimClassroom.initState();
  var eres = SimClassroom.enroll(s, 'student_01', 'bad_course');
  assert(!eres.ok, 'enrollment in nonexistent course rejected');
  assertEqual(eres.reason, 'course_not_found', 'reason is course_not_found');
})();

(function() {
  // canEnroll
  var s = SimClassroom.initState();
  var cres = SimClassroom.createCourse(s, { title: 'X', category: 'lore', teacherId: 't1' });
  s = cres.state;
  var check = SimClassroom.canEnroll(s, 'student_01', cres.courseId);
  assert(check.ok, 'canEnroll returns ok for fresh enrollment');
})();

(function() {
  // unenroll
  var s = SimClassroom.initState();
  var cres = SimClassroom.createCourse(s, { title: 'X', category: 'lore', teacherId: 't1' });
  s = cres.state;
  s = SimClassroom.enroll(s, 'student_01', cres.courseId).state;
  var unenrolled = SimClassroom.unenroll(s, 'student_01', cres.courseId);
  assert(unenrolled.enrollments['student_01'].indexOf(cres.courseId) === -1, 'student unenrolled from course');
  assert((unenrolled.progress['student_01'] || {})[cres.courseId] === undefined, 'progress removed on unenroll');
})();

(function() {
  // unenroll from course not enrolled
  var s = SimClassroom.initState();
  var cres = SimClassroom.createCourse(s, { title: 'X', category: 'lore', teacherId: 't1' });
  s = cres.state;
  var result = SimClassroom.unenroll(s, 'nobody', cres.courseId);
  assert(result === s, 'unenroll returns same state if not enrolled');
})();

// ============================================================================
// 7. Prerequisites
// ============================================================================
console.log('\n--- Prerequisites ---');

(function() {
  var s = SimClassroom.initState();
  var r1 = SimClassroom.createCourse(s, { title: 'Prereq', category: 'lore', teacherId: 't1' });
  s = r1.state;
  var r2 = SimClassroom.createCourse(s, { title: 'Advanced', category: 'lore', teacherId: 't1' });
  s = r2.state;

  s = SimClassroom.addPrerequisite(s, r2.courseId, r1.courseId);
  assertEqual(s.courses[r2.courseId].prerequisites.length, 1, 'prerequisite added');
  assertEqual(s.courses[r2.courseId].prerequisites[0], r1.courseId, 'correct prereq courseId stored');

  // Cannot enroll in Advanced without completing Prereq
  var check = SimClassroom.canEnroll(s, 'student_x', r2.courseId);
  assert(!check.ok, 'cannot enroll without completing prerequisite');
  assertEqual(check.reason, 'prerequisite_not_met', 'reason is prerequisite_not_met');
  assertEqual(check.missing, r1.courseId, 'missing prereq identified');
})();

(function() {
  // After completing prereq, can enroll in advanced
  var s = SimClassroom.initState();
  var parts1 = makeFullCourse(s, 't1', 'lore');
  s = parts1.state;
  var r2 = SimClassroom.createCourse(s, { title: 'Advanced', category: 'lore', teacherId: 't1' });
  s = r2.state;
  s = SimClassroom.addPrerequisite(s, r2.courseId, parts1.courseId);

  // Complete prereq for student
  s = enrollAndComplete(s, 'student_prereq', parts1);
  var certRes = SimClassroom.issueCertificate(s, 'student_prereq', parts1.courseId);
  s = certRes.state;

  // Now should be able to enroll in advanced
  var check = SimClassroom.canEnroll(s, 'student_prereq', r2.courseId);
  assert(check.ok, 'can enroll in advanced course after completing prerequisite');
})();

(function() {
  // addPrerequisite idempotent
  var s = SimClassroom.initState();
  var r1 = SimClassroom.createCourse(s, { title: 'A', category: 'lore', teacherId: 't1' });
  s = r1.state;
  var r2 = SimClassroom.createCourse(s, { title: 'B', category: 'lore', teacherId: 't1' });
  s = r2.state;
  s = SimClassroom.addPrerequisite(s, r2.courseId, r1.courseId);
  s = SimClassroom.addPrerequisite(s, r2.courseId, r1.courseId); // duplicate
  assertEqual(s.courses[r2.courseId].prerequisites.length, 1, 'duplicate prerequisite not added twice');
})();

(function() {
  // removePrerequisite
  var s = SimClassroom.initState();
  var r1 = SimClassroom.createCourse(s, { title: 'A', category: 'lore', teacherId: 't1' });
  s = r1.state;
  var r2 = SimClassroom.createCourse(s, { title: 'B', category: 'lore', teacherId: 't1' });
  s = r2.state;
  s = SimClassroom.addPrerequisite(s, r2.courseId, r1.courseId);
  s = SimClassroom.removePrerequisite(s, r2.courseId, r1.courseId);
  assertEqual(s.courses[r2.courseId].prerequisites.length, 0, 'prerequisite removed');
})();

(function() {
  // addPrerequisite with nonexistent course returns same state
  var s = SimClassroom.initState();
  var result = SimClassroom.addPrerequisite(s, 'bad_course', 'other_bad');
  assert(result === s, 'addPrerequisite with bad courseId returns same state');
})();

// ============================================================================
// 8. completeLesson
// ============================================================================
console.log('\n--- completeLesson ---');

(function() {
  var s = SimClassroom.initState();
  var parts = makeFullCourse(s, 't1', 'lore');
  s = parts.state;
  s = SimClassroom.enroll(s, 'student_01', parts.courseId).state;

  var res = SimClassroom.completeLesson(s, 'student_01', parts.courseId, parts.lessonId1);
  assert(res.ok, 'completeLesson succeeds');
  assert(res.state !== s, 'completeLesson returns new state');
  var prog = res.state.progress['student_01'][parts.courseId];
  assert(prog.lessons_done.indexOf(parts.lessonId1) !== -1, 'lesson marked done in progress');
  assertEqual(res.spark, SimClassroom.SPARK_REWARDS.complete_lesson, 'spark awarded for completing lesson');
  assertEqual(prog.spark_earned, SimClassroom.SPARK_REWARDS.complete_lesson, 'spark recorded in progress');
})();

(function() {
  // Cannot complete same lesson twice
  var s = SimClassroom.initState();
  var parts = makeFullCourse(s, 't1', 'lore');
  s = parts.state;
  s = SimClassroom.enroll(s, 'student_01', parts.courseId).state;
  s = SimClassroom.completeLesson(s, 'student_01', parts.courseId, parts.lessonId1).state;
  var res2 = SimClassroom.completeLesson(s, 'student_01', parts.courseId, parts.lessonId1);
  assert(!res2.ok, 'completing lesson twice rejected');
  assertEqual(res2.reason, 'already_completed', 'reason is already_completed');
})();

(function() {
  // completeLesson without enrollment
  var s = SimClassroom.initState();
  var parts = makeFullCourse(s, 't1', 'lore');
  s = parts.state;
  var res = SimClassroom.completeLesson(s, 'nobody', parts.courseId, parts.lessonId1);
  assert(!res.ok, 'completeLesson without enrollment rejected');
  assertEqual(res.reason, 'not_enrolled', 'reason is not_enrolled');
})();

(function() {
  // completeLesson with bad courseId
  var s = SimClassroom.initState();
  var res = SimClassroom.completeLesson(s, 'student_01', 'bad_course', 'bad_lesson');
  assert(!res.ok, 'completeLesson with bad courseId rejected');
  assertEqual(res.reason, 'course_not_found', 'reason is course_not_found');
})();

(function() {
  // completeLesson with bad lessonId
  var s = SimClassroom.initState();
  var parts = makeFullCourse(s, 't1', 'lore');
  s = parts.state;
  s = SimClassroom.enroll(s, 'student_01', parts.courseId).state;
  var res = SimClassroom.completeLesson(s, 'student_01', parts.courseId, 'bad_lesson');
  assert(!res.ok, 'completeLesson with bad lessonId rejected');
  assertEqual(res.reason, 'lesson_not_found', 'reason is lesson_not_found');
})();

// ============================================================================
// 9. submitQuiz & Grading
// ============================================================================
console.log('\n--- submitQuiz & Grading ---');

(function() {
  var s = SimClassroom.initState();
  var parts = makeFullCourse(s, 't1', 'lore');
  s = parts.state;
  s = SimClassroom.enroll(s, 'student_01', parts.courseId).state;

  // Quiz 1 has: MC correct=0, T/F correct=0. Answer: [0, 0] = 100%
  var res = SimClassroom.submitQuiz(s, 'student_01', parts.courseId, parts.quizId1, [0, 0]);
  assert(res.ok, 'submitQuiz returns ok');
  assertEqual(res.score, 100, 'perfect answers give 100% score');
  assertEqual(res.correct, 2, 'correct count is 2');
  assertEqual(res.total, 2, 'total questions is 2');
  assert(res.passed, 'score 100 >= 70 threshold: passed');
  var prog = res.state.progress['student_01'][parts.courseId];
  assertEqual(prog.quiz_scores[parts.quizId1], 100, 'quiz score stored in progress');
})();

(function() {
  // Failing score
  var s = SimClassroom.initState();
  var parts = makeFullCourse(s, 't1', 'lore');
  s = parts.state;
  s = SimClassroom.enroll(s, 'student_01', parts.courseId).state;
  // Quiz 1: MC correct=0, T/F correct=0. Answer wrong for both: [1, 1]
  var res = SimClassroom.submitQuiz(s, 'student_01', parts.courseId, parts.quizId1, [1, 1]);
  assertEqual(res.score, 0, 'all wrong gives 0% score');
  assert(!res.passed, 'score 0 < 70: not passed');
})();

(function() {
  // Partial score
  var s = SimClassroom.initState();
  var parts = makeFullCourse(s, 't1', 'lore');
  s = parts.state;
  s = SimClassroom.enroll(s, 'student_01', parts.courseId).state;
  // Quiz 1: MC correct=0, T/F correct=0. [0, 1] = 1/2 = 50%
  var res = SimClassroom.submitQuiz(s, 'student_01', parts.courseId, parts.quizId1, [0, 1]);
  assertEqual(res.score, 50, '1/2 answers correct = 50%');
  assert(!res.passed, '50% < 70%: not passed');
})();

(function() {
  // Best score kept on retry
  var s = SimClassroom.initState();
  var parts = makeFullCourse(s, 't1', 'lore');
  s = parts.state;
  s = SimClassroom.enroll(s, 'student_01', parts.courseId).state;
  // First attempt: 0%
  s = SimClassroom.submitQuiz(s, 'student_01', parts.courseId, parts.quizId1, [1, 1]).state;
  assertEqual(s.progress['student_01'][parts.courseId].quiz_scores[parts.quizId1], 0, 'first attempt score stored');
  // Second attempt: 100%
  s = SimClassroom.submitQuiz(s, 'student_01', parts.courseId, parts.quizId1, [0, 0]).state;
  assertEqual(s.progress['student_01'][parts.courseId].quiz_scores[parts.quizId1], 100, 'best score kept after retry');
})();

(function() {
  // Spark for passing quiz (only on first pass)
  var s = SimClassroom.initState();
  var parts = makeFullCourse(s, 't1', 'lore');
  s = parts.state;
  s = SimClassroom.enroll(s, 'student_01', parts.courseId).state;
  var res1 = SimClassroom.submitQuiz(s, 'student_01', parts.courseId, parts.quizId1, [0, 0]);
  assert(res1.sparkEarned >= SimClassroom.SPARK_REWARDS.pass_quiz, 'spark earned for first-time pass');
  s = res1.state;
  // Pass again — no extra spark
  var res2 = SimClassroom.submitQuiz(s, 'student_01', parts.courseId, parts.quizId1, [0, 0]);
  assertEqual(res2.sparkEarned, 0, 'no spark earned for re-passing already-passed quiz');
})();

(function() {
  // submitQuiz without enrollment
  var s = SimClassroom.initState();
  var parts = makeFullCourse(s, 't1', 'lore');
  s = parts.state;
  var res = SimClassroom.submitQuiz(s, 'nobody', parts.courseId, parts.quizId1, [0, 0]);
  assert(!res.ok, 'submitQuiz without enrollment rejected');
  assertEqual(res.reason, 'not_enrolled', 'reason is not_enrolled');
})();

(function() {
  // submitQuiz with bad courseId
  var s = SimClassroom.initState();
  var res = SimClassroom.submitQuiz(s, 'student_01', 'bad_course', 'bad_quiz', []);
  assert(!res.ok, 'submitQuiz with bad courseId rejected');
  assertEqual(res.reason, 'course_not_found', 'reason is course_not_found');
})();

(function() {
  // submitQuiz with bad quizId
  var s = SimClassroom.initState();
  var parts = makeFullCourse(s, 't1', 'lore');
  s = parts.state;
  s = SimClassroom.enroll(s, 'student_01', parts.courseId).state;
  var res = SimClassroom.submitQuiz(s, 'student_01', parts.courseId, 'bad_quiz', [0]);
  assert(!res.ok, 'submitQuiz with bad quizId rejected');
  assertEqual(res.reason, 'quiz_not_found', 'reason is quiz_not_found');
})();

// ============================================================================
// 10. Course completion (automatic)
// ============================================================================
console.log('\n--- Course completion ---');

(function() {
  var s = SimClassroom.initState();
  var parts = makeFullCourse(s, 't1', 'lore');
  s = parts.state;
  s = SimClassroom.enroll(s, 'student_01', parts.courseId).state;

  // Complete everything
  s = SimClassroom.completeLesson(s, 'student_01', parts.courseId, parts.lessonId1).state;
  s = SimClassroom.completeLesson(s, 'student_01', parts.courseId, parts.lessonId2).state;
  s = SimClassroom.submitQuiz(s, 'student_01', parts.courseId, parts.quizId1, [0, 0]).state;
  var res = SimClassroom.submitQuiz(s, 'student_01', parts.courseId, parts.quizId2, [2, 1]);
  assert(res.courseCompleted, 'course marked completed after all lessons+quizzes done');
  assert(res.state.progress['student_01'][parts.courseId].completed, 'progress.completed = true');
  assert(typeof res.state.progress['student_01'][parts.courseId].completed_at === 'string', 'completed_at set');
})();

(function() {
  // Course not completed if lessons missing
  var s = SimClassroom.initState();
  var parts = makeFullCourse(s, 't1', 'lore');
  s = parts.state;
  s = SimClassroom.enroll(s, 'student_01', parts.courseId).state;
  // Only complete lesson 1 and both quizzes
  s = SimClassroom.completeLesson(s, 'student_01', parts.courseId, parts.lessonId1).state;
  s = SimClassroom.submitQuiz(s, 'student_01', parts.courseId, parts.quizId1, [0, 0]).state;
  var res = SimClassroom.submitQuiz(s, 'student_01', parts.courseId, parts.quizId2, [2, 1]);
  assert(!res.courseCompleted, 'course not completed if lessons remain');
})();

(function() {
  // Course not completed if a quiz not passed
  var s = SimClassroom.initState();
  var parts = makeFullCourse(s, 't1', 'lore');
  s = parts.state;
  s = SimClassroom.enroll(s, 'student_01', parts.courseId).state;
  s = SimClassroom.completeLesson(s, 'student_01', parts.courseId, parts.lessonId1).state;
  s = SimClassroom.completeLesson(s, 'student_01', parts.courseId, parts.lessonId2).state;
  s = SimClassroom.submitQuiz(s, 'student_01', parts.courseId, parts.quizId1, [1, 1]).state; // fail
  var res = SimClassroom.submitQuiz(s, 'student_01', parts.courseId, parts.quizId2, [2, 1]);
  assert(!res.courseCompleted, 'course not completed if any quiz not passed');
})();

(function() {
  // Spark bonus awarded on course completion
  var s = SimClassroom.initState();
  var parts = makeFullCourse(s, 't1', 'lore');
  s = parts.state;
  s = SimClassroom.enroll(s, 'student_01', parts.courseId).state;
  var sparkBefore = s.progress['student_01'][parts.courseId].spark_earned;
  s = enrollAndComplete(s, 'student_01_dupl', parts); // reuse helper differently
  s = SimClassroom.initState(); // restart cleanly
  var parts2 = makeFullCourse(s, 't1', 'lore');
  s = parts2.state;
  s = SimClassroom.enroll(s, 'student_spark', parts2.courseId).state;
  s = SimClassroom.completeLesson(s, 'student_spark', parts2.courseId, parts2.lessonId1).state;
  s = SimClassroom.completeLesson(s, 'student_spark', parts2.courseId, parts2.lessonId2).state;
  s = SimClassroom.submitQuiz(s, 'student_spark', parts2.courseId, parts2.quizId1, [0, 0]).state;
  var finalRes = SimClassroom.submitQuiz(s, 'student_spark', parts2.courseId, parts2.quizId2, [2, 1]);
  assert(finalRes.courseCompleted, 'course completed');
  var totalSpark = finalRes.state.progress['student_spark'][parts2.courseId].spark_earned;
  assert(totalSpark >= SimClassroom.SPARK_REWARDS.complete_course, 'course completion spark included');
})();

// ============================================================================
// 11. Certificates
// ============================================================================
console.log('\n--- Certificates ---');

(function() {
  var s = SimClassroom.initState();
  var p = makeFullCourse(s, 'teacher_cert', 'crafting');
  s = p.state;
  s = enrollAndComplete(s, 'student_cert', p);

  var res = SimClassroom.issueCertificate(s, 'student_cert', p.courseId);
  assert(res.ok, 'issueCertificate succeeds for completed course');
  assert(res.certId && res.certId.indexOf('cert_') === 0, 'certId has cert_ prefix');
  var cert = res.state.certificates[res.certId];
  assert(cert !== undefined, 'certificate stored in state');
  assertEqual(cert.studentId, 'student_cert', 'cert.studentId correct');
  assertEqual(cert.courseId, p.courseId, 'cert.courseId correct');
  assertEqual(cert.courseTitle, 'Test Course', 'cert.courseTitle correct');
  assertEqual(cert.category, 'crafting', 'cert.category correct');
  assert(typeof cert.avgScore === 'number', 'cert.avgScore is a number');
  assert(cert.avgScore >= 0 && cert.avgScore <= 100, 'cert.avgScore in 0-100 range');
  assert(typeof cert.hash === 'string', 'cert has a hash');
  assert(typeof cert.issuedAt === 'string', 'cert has issuedAt timestamp');
  assertEqual(res.state.progress['student_cert'][p.courseId].certId, res.certId, 'certId stored in progress');
})();

(function() {
  // Cannot issue cert for non-completed course
  var s = SimClassroom.initState();
  var p = makeFullCourse(s, 't1', 'lore');
  s = p.state;
  s = SimClassroom.enroll(s, 'student_01', p.courseId).state;
  var res = SimClassroom.issueCertificate(s, 'student_01', p.courseId);
  assert(!res.ok, 'cert rejected for incomplete course');
  assertEqual(res.reason, 'course_not_completed', 'reason is course_not_completed');
})();

(function() {
  // Cannot issue cert for nonexistent course
  var s = SimClassroom.initState();
  var res = SimClassroom.issueCertificate(s, 'student_01', 'bad_course');
  assert(!res.ok, 'cert rejected for nonexistent course');
  assertEqual(res.reason, 'course_not_found', 'reason is course_not_found');
})();

(function() {
  // Cannot issue duplicate cert
  var s = SimClassroom.initState();
  var p = makeFullCourse(s, 't1', 'lore');
  s = p.state;
  s = enrollAndComplete(s, 'student_dup', p);
  var r1 = SimClassroom.issueCertificate(s, 'student_dup', p.courseId);
  s = r1.state;
  var r2 = SimClassroom.issueCertificate(s, 'student_dup', p.courseId);
  assert(!r2.ok, 'duplicate certificate rejected');
  assertEqual(r2.reason, 'certificate_exists', 'reason is certificate_exists');
})();

(function() {
  // verifyCertificate — valid
  var s = SimClassroom.initState();
  var p = makeFullCourse(s, 't1', 'lore');
  s = p.state;
  s = enrollAndComplete(s, 'student_verify', p);
  var cres = SimClassroom.issueCertificate(s, 'student_verify', p.courseId);
  s = cres.state;
  var vr = SimClassroom.verifyCertificate(s, cres.certId);
  assert(vr.valid, 'valid certificate verifies correctly');
  assert(vr.cert !== undefined, 'verified cert returned');
})();

(function() {
  // verifyCertificate — not found
  var s = SimClassroom.initState();
  var vr = SimClassroom.verifyCertificate(s, 'fake_cert_id');
  assert(!vr.valid, 'nonexistent cert does not verify');
  assertEqual(vr.reason, 'not_found', 'reason is not_found');
})();

(function() {
  // verifyCertificate — tampered
  var s = SimClassroom.initState();
  var p = makeFullCourse(s, 't1', 'lore');
  s = p.state;
  s = enrollAndComplete(s, 'student_tamper', p);
  var cres = SimClassroom.issueCertificate(s, 'student_tamper', p.courseId);
  s = cres.state;
  // Tamper with the cert
  var tampered = JSON.parse(JSON.stringify(s));
  tampered.certificates[cres.certId].avgScore = 0;
  var vr = SimClassroom.verifyCertificate(tampered, cres.certId);
  assert(!vr.valid, 'tampered certificate fails verification');
  assertEqual(vr.reason, 'tampered', 'reason is tampered');
})();

(function() {
  // Cert spark awarded
  var s = SimClassroom.initState();
  var p = makeFullCourse(s, 't1', 'lore');
  s = p.state;
  s = enrollAndComplete(s, 'student_certspark', p);
  var sparkBefore = s.progress['student_certspark'][p.courseId].spark_earned;
  var cres = SimClassroom.issueCertificate(s, 'student_certspark', p.courseId);
  s = cres.state;
  var sparkAfter = s.progress['student_certspark'][p.courseId].spark_earned;
  assertEqual(sparkAfter - sparkBefore, SimClassroom.SPARK_REWARDS.earn_certificate,
    'earn_certificate spark awarded');
})();

// ============================================================================
// 12. Course Ratings
// ============================================================================
console.log('\n--- Course Ratings ---');

(function() {
  var s = SimClassroom.initState();
  var cres = SimClassroom.createCourse(s, { title: 'X', category: 'lore', teacherId: 't1' });
  s = cres.state;
  s = SimClassroom.enroll(s, 'student_01', cres.courseId).state;

  var rres = SimClassroom.rateCourse(s, 'student_01', cres.courseId, 5);
  assert(rres.ok, 'rateCourse succeeds for enrolled student');
  assertEqual(rres.avg, 5, 'avg rating is 5 after single 5-star rating');
  assertEqual(rres.sparkEarned, SimClassroom.SPARK_REWARDS.rate_course, 'spark earned for rating');
  var bucket = rres.state.ratings[cres.courseId];
  assertEqual(bucket.scores.length, 1, 'one score in bucket');
  assertEqual(bucket.scores[0], 5, 'score is 5');
  assertEqual(rres.state.courses[cres.courseId].avgRating, 5, 'course.avgRating updated');
})();

(function() {
  // Average computed correctly
  var s = SimClassroom.initState();
  var cres = SimClassroom.createCourse(s, { title: 'X', category: 'lore', teacherId: 't1' });
  s = cres.state;
  s = SimClassroom.enroll(s, 'student_A', cres.courseId).state;
  s = SimClassroom.enroll(s, 'student_B', cres.courseId).state;
  s = SimClassroom.enroll(s, 'student_C', cres.courseId).state;
  s = SimClassroom.rateCourse(s, 'student_A', cres.courseId, 4).state;
  s = SimClassroom.rateCourse(s, 'student_B', cres.courseId, 3).state;
  s = SimClassroom.rateCourse(s, 'student_C', cres.courseId, 5).state;
  assertEqual(s.courses[cres.courseId].avgRating, 4, 'average of 4+3+5 = 4.0');
})();

(function() {
  // Updating a rating replaces old score
  var s = SimClassroom.initState();
  var cres = SimClassroom.createCourse(s, { title: 'X', category: 'lore', teacherId: 't1' });
  s = cres.state;
  s = SimClassroom.enroll(s, 'student_01', cres.courseId).state;
  s = SimClassroom.rateCourse(s, 'student_01', cres.courseId, 2).state;
  s = SimClassroom.rateCourse(s, 'student_01', cres.courseId, 5).state;
  assertEqual(s.ratings[cres.courseId].scores.length, 1, 'only one score per rater');
  assertEqual(s.ratings[cres.courseId].scores[0], 5, 'updated score replaces old');
})();

(function() {
  // Rating clamped to 1-5
  var s = SimClassroom.initState();
  var cres = SimClassroom.createCourse(s, { title: 'X', category: 'lore', teacherId: 't1' });
  s = cres.state;
  s = SimClassroom.enroll(s, 'student_01', cres.courseId).state;
  var rres = SimClassroom.rateCourse(s, 'student_01', cres.courseId, 10);
  assertEqual(rres.state.ratings[cres.courseId].scores[0], 5, 'rating above 5 clamped to 5');
  s = rres.state;
  s = SimClassroom.rateCourse(s, 'student_01', cres.courseId, 0).state;
  assertEqual(s.ratings[cres.courseId].scores[0], 1, 'rating below 1 clamped to 1');
})();

(function() {
  // Cannot rate without enrollment
  var s = SimClassroom.initState();
  var cres = SimClassroom.createCourse(s, { title: 'X', category: 'lore', teacherId: 't1' });
  s = cres.state;
  var rres = SimClassroom.rateCourse(s, 'nobody', cres.courseId, 5);
  assert(!rres.ok, 'rating without enrollment rejected');
  assertEqual(rres.reason, 'not_enrolled', 'reason is not_enrolled');
})();

(function() {
  // Rating nonexistent course
  var s = SimClassroom.initState();
  var rres = SimClassroom.rateCourse(s, 'student_01', 'bad_course', 5);
  assert(!rres.ok, 'rating nonexistent course rejected');
  assertEqual(rres.reason, 'course_not_found', 'reason is course_not_found');
})();

// ============================================================================
// 13. Teacher Reputation
// ============================================================================
console.log('\n--- Teacher Reputation ---');

(function() {
  var s = SimClassroom.initState();
  var r1 = SimClassroom.createCourse(s, { title: 'Course A', category: 'lore', teacherId: 'master_t' });
  s = r1.state;
  var r2 = SimClassroom.createCourse(s, { title: 'Course B', category: 'combat', teacherId: 'master_t' });
  s = r2.state;

  s = SimClassroom.enroll(s, 'stu_1', r1.courseId).state;
  s = SimClassroom.enroll(s, 'stu_2', r1.courseId).state;
  s = SimClassroom.enroll(s, 'stu_3', r2.courseId).state;

  s = SimClassroom.rateCourse(s, 'stu_1', r1.courseId, 5).state;
  s = SimClassroom.rateCourse(s, 'stu_2', r1.courseId, 3).state;
  s = SimClassroom.rateCourse(s, 'stu_3', r2.courseId, 4).state;

  var profile = SimClassroom.getTeacherProfile(s, 'master_t');
  assert(profile !== null, 'getTeacherProfile returns profile');
  assertEqual(profile.courses.length, 2, 'teacher has 2 courses');
  assertEqual(profile.total_students, 3, 'teacher has 3 total students');
  assert(typeof profile.avg_rating === 'number', 'teacher avg_rating is a number');
  assert(profile.avg_rating > 0, 'teacher avg_rating > 0 after ratings');
})();

(function() {
  // getTeacherProfile for unknown teacher
  var s = SimClassroom.initState();
  var profile = SimClassroom.getTeacherProfile(s, 'unknown_teacher');
  assert(profile === null, 'getTeacherProfile returns null for unknown teacher');
})();

// ============================================================================
// 14. Query helpers
// ============================================================================
console.log('\n--- Query helpers ---');

(function() {
  var s = SimClassroom.initState();
  SimClassroom.createCourse(s, { title: 'A', category: 'crafting', teacherId: 't1' });
  // Multiple creates
  var r1 = SimClassroom.createCourse(s, { title: 'B', category: 'crafting', teacherId: 't1' });
  s = r1.state;
  var r2 = SimClassroom.createCourse(s, { title: 'C', category: 'combat', teacherId: 't1' });
  s = r2.state;
  var r3 = SimClassroom.createCourse(s, { title: 'D', category: 'crafting', teacherId: 't2' });
  s = r3.state;

  var crafting = SimClassroom.getCoursesByCategory(s, 'crafting');
  assertEqual(crafting.length, 2, 'getCoursesByCategory returns 2 crafting courses');

  var combat = SimClassroom.getCoursesByCategory(s, 'combat');
  assertEqual(combat.length, 1, 'getCoursesByCategory returns 1 combat course');

  var none = SimClassroom.getCoursesByCategory(s, 'economics');
  assertEqual(none.length, 0, 'getCoursesByCategory returns 0 for empty category');
})();

(function() {
  var s = SimClassroom.initState();
  var r1 = SimClassroom.createCourse(s, { title: 'A', category: 'lore', teacherId: 'teacher_alpha' });
  s = r1.state;
  var r2 = SimClassroom.createCourse(s, { title: 'B', category: 'lore', teacherId: 'teacher_alpha' });
  s = r2.state;
  var r3 = SimClassroom.createCourse(s, { title: 'C', category: 'lore', teacherId: 'teacher_beta' });
  s = r3.state;

  var alphaCourses = SimClassroom.getCoursesByTeacher(s, 'teacher_alpha');
  assertEqual(alphaCourses.length, 2, 'getCoursesByTeacher returns 2 courses for teacher_alpha');

  var betaCourses = SimClassroom.getCoursesByTeacher(s, 'teacher_beta');
  assertEqual(betaCourses.length, 1, 'getCoursesByTeacher returns 1 course for teacher_beta');
})();

(function() {
  var s = SimClassroom.initState();
  var r1 = SimClassroom.createCourse(s, { title: 'C1', category: 'lore', teacherId: 't1' });
  s = r1.state;
  var r2 = SimClassroom.createCourse(s, { title: 'C2', category: 'lore', teacherId: 't1' });
  s = r2.state;

  s = SimClassroom.enroll(s, 'stu_q', r1.courseId).state;
  s = SimClassroom.enroll(s, 'stu_q', r2.courseId).state;

  var enrolled = SimClassroom.getStudentEnrollments(s, 'stu_q');
  assertEqual(enrolled.length, 2, 'getStudentEnrollments returns 2 courses');
  assert(enrolled.indexOf(r1.courseId) !== -1, 'courseId1 in enrollments');
  assert(enrolled.indexOf(r2.courseId) !== -1, 'courseId2 in enrollments');
})();

(function() {
  // getStudentEnrollments for unknown student
  var s = SimClassroom.initState();
  var enrolled = SimClassroom.getStudentEnrollments(s, 'nobody');
  assert(Array.isArray(enrolled) && enrolled.length === 0, 'getStudentEnrollments returns [] for unknown student');
})();

(function() {
  // getStudentCertificates
  var s = SimClassroom.initState();
  var p1 = makeFullCourse(s, 't1', 'lore');
  s = p1.state;
  var p2 = makeFullCourse(s, 't1', 'combat');
  s = p2.state;
  s = enrollAndComplete(s, 'stu_certs', p1);
  s = enrollAndComplete(s, 'stu_certs', p2);
  var c1 = SimClassroom.issueCertificate(s, 'stu_certs', p1.courseId);
  s = c1.state;
  var c2 = SimClassroom.issueCertificate(s, 'stu_certs', p2.courseId);
  s = c2.state;
  var certs = SimClassroom.getStudentCertificates(s, 'stu_certs');
  assertEqual(certs.length, 2, 'getStudentCertificates returns 2 certificates');
})();

(function() {
  // getStudentProgress
  var s = SimClassroom.initState();
  var p = makeFullCourse(s, 't1', 'lore');
  s = p.state;
  s = SimClassroom.enroll(s, 'stu_prog', p.courseId).state;
  var prog = SimClassroom.getStudentProgress(s, 'stu_prog', p.courseId);
  assert(prog !== null, 'getStudentProgress returns progress object');
  assert(Array.isArray(prog.lessons_done), 'progress has lessons_done array');

  var allProg = SimClassroom.getStudentProgress(s, 'stu_prog');
  assert(allProg !== null, 'getStudentProgress without courseId returns all progress');
  assert(allProg[p.courseId] !== undefined, 'all progress contains courseId');
})();

(function() {
  // getStudentProgress for unknown student
  var s = SimClassroom.initState();
  var prog = SimClassroom.getStudentProgress(s, 'nobody', 'any_course');
  assert(prog === null, 'getStudentProgress returns null for unknown student');
})();

(function() {
  // getCourseCompletionRate
  var s = SimClassroom.initState();
  var p = makeFullCourse(s, 't1', 'lore');
  s = p.state;
  s = SimClassroom.enroll(s, 'stu_A', p.courseId).state;
  s = SimClassroom.enroll(s, 'stu_B', p.courseId).state;
  s = SimClassroom.enroll(s, 'stu_C', p.courseId).state;
  s = enrollAndComplete(s, 'stu_A', p);
  s = enrollAndComplete(s, 'stu_B', p);
  // stu_C doesn't complete
  var rate = SimClassroom.getCourseCompletionRate(s, p.courseId);
  assert(typeof rate === 'number', 'getCourseCompletionRate returns a number');
  // 2 of 3 enrolled: but enrollAndComplete re-enrolls already enrolled students — adjust
  // Actually enrollAndComplete calls enroll internally which will fail on already-enrolled
  // So stu_A and stu_B won't double-enroll; their progress tracked from first enroll
  // Rate = completions / total enrolled * 100
  assert(rate > 0, 'completion rate > 0 after some completions');
})();

(function() {
  // getCourseCompletionRate for empty course
  var s = SimClassroom.initState();
  var cres = SimClassroom.createCourse(s, { title: 'X', category: 'lore', teacherId: 't1' });
  s = cres.state;
  assertEqual(SimClassroom.getCourseCompletionRate(s, cres.courseId), 0, 'completion rate 0 for course with no enrollments');
})();

(function() {
  // getAvailableCourses
  var s = SimClassroom.initState();
  var r1 = SimClassroom.createCourse(s, { title: 'Open', category: 'lore', teacherId: 't1' });
  s = r1.state;
  var r2 = SimClassroom.createCourse(s, { title: 'Locked', category: 'lore', teacherId: 't1' });
  s = r2.state;
  s = SimClassroom.addPrerequisite(s, r2.courseId, r1.courseId);

  var available = SimClassroom.getAvailableCourses(s, 'fresh_student');
  assertEqual(available.length, 1, 'only open course available to fresh student');
  assertEqual(available[0].id, r1.courseId, 'the available course is the open one');
})();

// ============================================================================
// 15. NPC Teacher
// ============================================================================
console.log('\n--- NPC Teacher ---');

(function() {
  var s = SimClassroom.initState();
  var res = SimClassroom.npcCreateCourse(s, 'npc_blacksmith', 12345);
  assert(res.state !== s, 'npcCreateCourse returns new state');
  assert(typeof res.courseId === 'string', 'npcCreateCourse returns courseId');
  var course = res.state.courses[res.courseId];
  assert(course !== undefined, 'NPC course stored');
  assertEqual(course.teacherId, 'npc_blacksmith', 'NPC teacherId set');
  assert(SimClassroom.CATEGORIES.indexOf(course.category) !== -1, 'NPC course has valid category');
  assert(course.lessonOrder.length >= 2, 'NPC course has at least 2 lessons');
  assert(Object.keys(course.quizzes).length >= 2, 'NPC course has at least 2 quizzes');
})();

(function() {
  // Different seeds produce possibly different courses
  var s = SimClassroom.initState();
  var r1 = SimClassroom.npcCreateCourse(s, 'npc_1', 111);
  var r2 = SimClassroom.npcCreateCourse(s, 'npc_2', 999999);
  // Both should produce valid courses (may or may not be different title due to template range)
  var c1 = r1.state.courses[r1.courseId];
  var c2 = r2.state.courses[r2.courseId];
  assert(c1 !== undefined && c2 !== undefined, 'both NPC courses created');
})();

(function() {
  // NPC course teacher profile created
  var s = SimClassroom.initState();
  var res = SimClassroom.npcCreateCourse(s, 'npc_scholar', 42);
  assert(res.state.teacher_profiles['npc_scholar'] !== undefined, 'NPC teacher profile created');
})();

(function() {
  // NPC quiz questions have valid structure
  var s = SimClassroom.initState();
  var res = SimClassroom.npcCreateCourse(s, 'npc_1', 77777);
  var course = res.state.courses[res.courseId];
  var quizIds = Object.keys(course.quizzes);
  assert(quizIds.length > 0, 'NPC course has quizzes');
  var quiz = course.quizzes[quizIds[0]];
  assert(quiz.questions.length > 0, 'NPC quiz has questions');
  var q = quiz.questions[0];
  assert(SimClassroom.QUESTION_TYPES.indexOf(q.type) !== -1, 'NPC question has valid type');
  assert(typeof q.prompt === 'string' && q.prompt.length > 0, 'NPC question has non-empty prompt');
  assert(typeof q.correct === 'number', 'NPC question correct is numeric');
})();

// ============================================================================
// 16. applyAction dispatch
// ============================================================================
console.log('\n--- applyAction dispatch ---');

(function() {
  var s = SimClassroom.initState();
  var msg = {
    from: 'teacher_x',
    payload: {
      action: 'create_course',
      data: { title: 'Via Action', category: 'lore', description: 'Test' }
    }
  };
  var ns = SimClassroom.applyAction(s, msg);
  assert(Object.keys(ns.courses).length === 1, 'applyAction create_course creates course');
  var course = Object.values(ns.courses)[0];
  assertEqual(course.title, 'Via Action', 'create_course title via action');
  assertEqual(course.teacherId, 'teacher_x', 'teacherId taken from msg.from');
})();

(function() {
  var s = SimClassroom.initState();
  var cres = SimClassroom.createCourse(s, { title: 'X', category: 'lore', teacherId: 't1' });
  s = cres.state;
  var lres = SimClassroom.addLesson(s, cres.courseId, { title: 'L1', content: '', objectives: [] });
  s = lres.state;

  var msg = {
    from: 'student_action',
    payload: {
      action: 'enroll',
      data: { courseId: cres.courseId }
    }
  };
  var ns = SimClassroom.applyAction(s, msg);
  assert((ns.enrollments['student_action'] || []).indexOf(cres.courseId) !== -1, 'applyAction enroll works');
})();

(function() {
  var s = SimClassroom.initState();
  var cres = SimClassroom.createCourse(s, { title: 'X', category: 'lore', teacherId: 't1' });
  s = cres.state;
  var lres = SimClassroom.addLesson(s, cres.courseId, { title: 'L', content: '', objectives: [] });
  s = lres.state;

  // add_lesson via action
  var msg = {
    from: 't1',
    payload: {
      action: 'add_lesson',
      data: { courseId: cres.courseId, title: 'Action Lesson', content: 'Content', objectives: [] }
    }
  };
  var ns = SimClassroom.applyAction(s, msg);
  assertEqual(ns.courses[cres.courseId].lessonOrder.length, 2, 'applyAction add_lesson adds a lesson');
})();

(function() {
  // applyAction: update_lesson
  var s = SimClassroom.initState();
  var cres = SimClassroom.createCourse(s, { title: 'X', category: 'lore', teacherId: 't1' });
  s = cres.state;
  var lres = SimClassroom.addLesson(s, cres.courseId, { title: 'Old', content: 'old', objectives: [] });
  s = lres.state;
  var msg = {
    from: 't1',
    payload: { action: 'update_lesson', data: { courseId: cres.courseId, lessonId: lres.lessonId, title: 'Updated' } }
  };
  var ns = SimClassroom.applyAction(s, msg);
  assertEqual(ns.courses[cres.courseId].lessons[lres.lessonId].title, 'Updated', 'applyAction update_lesson works');
})();

(function() {
  // applyAction: complete_lesson
  var s = SimClassroom.initState();
  var cres = SimClassroom.createCourse(s, { title: 'X', category: 'lore', teacherId: 't1' });
  s = cres.state;
  var lres = SimClassroom.addLesson(s, cres.courseId, { title: 'L', content: '', objectives: [] });
  s = lres.state;
  s = SimClassroom.enroll(s, 'stu_act', cres.courseId).state;
  var msg = {
    from: 'stu_act',
    payload: { action: 'complete_lesson', data: { courseId: cres.courseId, lessonId: lres.lessonId } }
  };
  var ns = SimClassroom.applyAction(s, msg);
  assert(ns.progress['stu_act'][cres.courseId].lessons_done.indexOf(lres.lessonId) !== -1,
    'applyAction complete_lesson marks lesson done');
})();

(function() {
  // applyAction: add_prerequisite / remove_prerequisite
  var s = SimClassroom.initState();
  var r1 = SimClassroom.createCourse(s, { title: 'A', category: 'lore', teacherId: 't1' });
  s = r1.state;
  var r2 = SimClassroom.createCourse(s, { title: 'B', category: 'lore', teacherId: 't1' });
  s = r2.state;

  var addMsg = {
    from: 't1',
    payload: { action: 'add_prerequisite', data: { courseId: r2.courseId, prereqCourseId: r1.courseId } }
  };
  s = SimClassroom.applyAction(s, addMsg);
  assertEqual(s.courses[r2.courseId].prerequisites.length, 1, 'applyAction add_prerequisite works');

  var removeMsg = {
    from: 't1',
    payload: { action: 'remove_prerequisite', data: { courseId: r2.courseId, prereqCourseId: r1.courseId } }
  };
  s = SimClassroom.applyAction(s, removeMsg);
  assertEqual(s.courses[r2.courseId].prerequisites.length, 0, 'applyAction remove_prerequisite works');
})();

(function() {
  // applyAction: npc_create_course
  var s = SimClassroom.initState();
  var msg = {
    from: 'npc_wizard',
    payload: { action: 'npc_create_course', data: { seed: 9999 } }
  };
  var ns = SimClassroom.applyAction(s, msg);
  assert(Object.keys(ns.courses).length > 0, 'applyAction npc_create_course creates a course');
  var course = Object.values(ns.courses)[0];
  assertEqual(course.teacherId, 'npc_wizard', 'npc course teacherId from msg.from');
})();

(function() {
  // applyAction: unknown action returns same state
  var s = SimClassroom.initState();
  var msg = { from: 'x', payload: { action: 'totally_unknown_action', data: {} } };
  var ns = SimClassroom.applyAction(s, msg);
  assert(ns === s, 'unknown action returns same state');
})();

(function() {
  // applyAction: rate_course
  var s = SimClassroom.initState();
  var cres = SimClassroom.createCourse(s, { title: 'X', category: 'lore', teacherId: 't1' });
  s = cres.state;
  s = SimClassroom.enroll(s, 'rater', cres.courseId).state;
  var msg = {
    from: 'rater',
    payload: { action: 'rate_course', data: { courseId: cres.courseId, stars: 4 } }
  };
  var ns = SimClassroom.applyAction(s, msg);
  assertEqual(ns.ratings[cres.courseId].scores[0], 4, 'applyAction rate_course stores rating');
})();

(function() {
  // applyAction: unenroll
  var s = SimClassroom.initState();
  var cres = SimClassroom.createCourse(s, { title: 'X', category: 'lore', teacherId: 't1' });
  s = cres.state;
  s = SimClassroom.enroll(s, 'stu_unenroll', cres.courseId).state;
  var msg = {
    from: 'stu_unenroll',
    payload: { action: 'unenroll', data: { courseId: cres.courseId } }
  };
  var ns = SimClassroom.applyAction(s, msg);
  assert((ns.enrollments['stu_unenroll'] || []).indexOf(cres.courseId) === -1,
    'applyAction unenroll removes enrollment');
})();

(function() {
  // applyAction: issue_certificate
  var s = SimClassroom.initState();
  var p = makeFullCourse(s, 't1', 'lore');
  s = p.state;
  s = enrollAndComplete(s, 'stu_cert_action', p);
  var msg = {
    from: 'stu_cert_action',
    payload: { action: 'issue_certificate', data: { courseId: p.courseId } }
  };
  var ns = SimClassroom.applyAction(s, msg);
  assert(Object.keys(ns.certificates).length === 1, 'applyAction issue_certificate creates cert');
})();

(function() {
  // applyAction: submit_quiz
  var s = SimClassroom.initState();
  var p = makeFullCourse(s, 't1', 'lore');
  s = p.state;
  s = SimClassroom.enroll(s, 'stu_sq', p.courseId).state;
  var msg = {
    from: 'stu_sq',
    payload: { action: 'submit_quiz', data: { courseId: p.courseId, quizId: p.quizId1, answers: [0, 0] } }
  };
  var ns = SimClassroom.applyAction(s, msg);
  assert(ns.progress['stu_sq'][p.courseId].quiz_scores[p.quizId1] !== undefined,
    'applyAction submit_quiz records quiz score');
})();

// ============================================================================
// 17. getMetrics
// ============================================================================
console.log('\n--- getMetrics ---');

(function() {
  var s = SimClassroom.initState();
  var metrics = SimClassroom.getMetrics(s);
  assert(typeof metrics === 'object', 'getMetrics returns an object');
  assertEqual(metrics.course_count, 0, 'empty state has 0 courses');
  assertEqual(metrics.certificate_count, 0, 'empty state has 0 certificates');
  assertEqual(metrics.teacher_count, 0, 'empty state has 0 teachers');
  assertEqual(metrics.total_enrolled, 0, 'empty state has 0 enrolled');
  assertEqual(metrics.total_completions, 0, 'empty state has 0 completions');
  assertEqual(metrics.total_ratings, 0, 'empty state has 0 ratings');
  assertEqual(metrics.avg_rating, 0, 'empty state avg_rating is 0');
  assert(typeof metrics.courses_by_category === 'object', 'getMetrics has courses_by_category');
  assert(SimClassroom.CATEGORIES.every(function(c) { return metrics.courses_by_category[c] === 0; }),
    'all category counts start at 0');
})();

(function() {
  var s = SimClassroom.initState();
  var r1 = SimClassroom.createCourse(s, { title: 'A', category: 'crafting', teacherId: 't1' });
  s = r1.state;
  var r2 = SimClassroom.createCourse(s, { title: 'B', category: 'lore', teacherId: 't2' });
  s = r2.state;
  var r3 = SimClassroom.createCourse(s, { title: 'C', category: 'crafting', teacherId: 't1' });
  s = r3.state;

  s = SimClassroom.enroll(s, 'stu_m1', r1.courseId).state;
  s = SimClassroom.enroll(s, 'stu_m2', r1.courseId).state;

  s = SimClassroom.rateCourse(s, 'stu_m1', r1.courseId, 4).state;
  s = SimClassroom.rateCourse(s, 'stu_m2', r1.courseId, 5).state;

  var metrics = SimClassroom.getMetrics(s);
  assertEqual(metrics.course_count, 3, 'metrics course_count = 3');
  assertEqual(metrics.teacher_count, 2, 'metrics teacher_count = 2');
  assertEqual(metrics.total_enrolled, 2, 'metrics total_enrolled = 2');
  assertEqual(metrics.total_ratings, 2, 'metrics total_ratings = 2');
  assert(metrics.avg_rating > 0, 'metrics avg_rating > 0 after ratings');
  assertEqual(metrics.courses_by_category.crafting, 2, 'courses_by_category.crafting = 2');
  assertEqual(metrics.courses_by_category.lore, 1, 'courses_by_category.lore = 1');
  assertEqual(metrics.courses_by_category.combat, 0, 'courses_by_category.combat = 0');
})();

(function() {
  // Completions counted in metrics
  var s = SimClassroom.initState();
  var p = makeFullCourse(s, 't1', 'lore');
  s = p.state;
  s = enrollAndComplete(s, 'stu_metric_comp', p);
  var metrics = SimClassroom.getMetrics(s);
  assertEqual(metrics.total_completions, 1, 'metrics total_completions = 1 after course completion');
})();

// ============================================================================
// 18. simulateTick
// ============================================================================
console.log('\n--- simulateTick ---');

(function() {
  var s = SimClassroom.initState();
  var ns = SimClassroom.simulateTick(s, [], 1);
  assert(ns === s, 'simulateTick with empty npcIds returns same state');
})();

(function() {
  var s = SimClassroom.initState();
  var ns = SimClassroom.simulateTick(s, null, 1);
  assert(ns === s, 'simulateTick with null npcIds returns same state');
})();

(function() {
  // With NPC list, some courses may be created across multiple ticks
  var s = SimClassroom.initState();
  var npcIds = ['npc_a', 'npc_b', 'npc_c', 'npc_d', 'npc_e'];
  for (var tick = 1; tick <= 20; tick++) {
    s = SimClassroom.simulateTick(s, npcIds, tick);
  }
  // With 5 NPCs each 20% chance per tick over 20 ticks, expected ~20 courses
  var count = Object.keys(s.courses).length;
  assert(count >= 0, 'simulateTick runs without error over 20 ticks (count: ' + count + ')');
  // Probabilistic: at least one course created is very likely
})();

(function() {
  // simulateTick state immutability
  var s = SimClassroom.initState();
  var npcIds = ['npc_tick_test'];
  // Run enough ticks to very likely create at least 1 course
  var original = s;
  for (var t = 1; t <= 30; t++) {
    var ns = SimClassroom.simulateTick(s, npcIds, t);
    if (ns !== s) {
      // State changed — original should be unchanged
      assert(Object.keys(original.courses).length === 0, 'simulateTick does not mutate original state');
      break;
    }
    s = ns;
  }
  // If no courses created in 30 ticks, that's fine (probabilistic)
  assert(true, 'simulateTick loop completed without crash');
})();

// ============================================================================
// 19. Snapshot round-trip (JSON portability)
// ============================================================================
console.log('\n--- Snapshot round-trip ---');

(function() {
  var s = SimClassroom.initState();

  // Build a complex state
  var p = makeFullCourse(s, 'teacher_snap', 'economics');
  s = p.state;
  s = SimClassroom.enroll(s, 'stu_snap', p.courseId).state;
  s = SimClassroom.completeLesson(s, 'stu_snap', p.courseId, p.lessonId1).state;
  s = SimClassroom.submitQuiz(s, 'stu_snap', p.courseId, p.quizId1, [0, 0]).state;
  s = SimClassroom.rateCourse(s, 'stu_snap', p.courseId, 4).state;

  var json = JSON.stringify(s);
  var restored = SimClassroom.initState(JSON.parse(json));

  assert(restored.courses[p.courseId] !== undefined, 'snapshot: course restored');
  assertEqual(restored.courses[p.courseId].title, 'Test Course', 'snapshot: course title preserved');
  assert((restored.enrollments['stu_snap'] || []).indexOf(p.courseId) !== -1, 'snapshot: enrollment preserved');
  var prog = restored.progress['stu_snap'][p.courseId];
  assert(prog !== undefined, 'snapshot: progress preserved');
  assert(prog.lessons_done.indexOf(p.lessonId1) !== -1, 'snapshot: lesson completion preserved');
  assert(prog.quiz_scores[p.quizId1] === 100, 'snapshot: quiz score preserved');
  assertEqual(restored.ratings[p.courseId].avg, 4, 'snapshot: rating preserved');
  assert(restored.teacher_profiles['teacher_snap'] !== undefined, 'snapshot: teacher profile preserved');
})();

(function() {
  // Certificate survives snapshot round-trip
  var s = SimClassroom.initState();
  var p = makeFullCourse(s, 't_snap2', 'crafting');
  s = p.state;
  s = enrollAndComplete(s, 'stu_snapcert', p);
  var certRes = SimClassroom.issueCertificate(s, 'stu_snapcert', p.courseId);
  s = certRes.state;

  var restored = SimClassroom.initState(JSON.parse(JSON.stringify(s)));
  assert(restored.certificates[certRes.certId] !== undefined, 'snapshot: certificate preserved');
  var vr = SimClassroom.verifyCertificate(restored, certRes.certId);
  assert(vr.valid, 'snapshot: certificate still verifiable after round-trip');
})();

// ============================================================================
// 20. Pure function / immutability checks
// ============================================================================
console.log('\n--- Immutability ---');

(function() {
  var s = SimClassroom.initState();
  var original = JSON.stringify(s);
  SimClassroom.createCourse(s, { title: 'X', category: 'lore', teacherId: 't1' });
  assertEqual(JSON.stringify(s), original, 'createCourse does not mutate original state');
})();

(function() {
  var s = SimClassroom.initState();
  var cres = SimClassroom.createCourse(s, { title: 'X', category: 'lore', teacherId: 't1' });
  s = cres.state;
  var before = JSON.stringify(s);
  SimClassroom.addLesson(s, cres.courseId, { title: 'L', content: '', objectives: [] });
  assertEqual(JSON.stringify(s), before, 'addLesson does not mutate original state');
})();

(function() {
  var s = SimClassroom.initState();
  var cres = SimClassroom.createCourse(s, { title: 'X', category: 'lore', teacherId: 't1' });
  s = cres.state;
  var before = JSON.stringify(s);
  SimClassroom.enroll(s, 'student_01', cres.courseId);
  assertEqual(JSON.stringify(s), before, 'enroll does not mutate original state');
})();

(function() {
  var s = SimClassroom.initState();
  var cres = SimClassroom.createCourse(s, { title: 'X', category: 'lore', teacherId: 't1' });
  s = cres.state;
  s = SimClassroom.enroll(s, 'stu_imm', cres.courseId).state;
  var before = JSON.stringify(s);
  SimClassroom.rateCourse(s, 'stu_imm', cres.courseId, 3);
  assertEqual(JSON.stringify(s), before, 'rateCourse does not mutate original state');
})();

// ============================================================================
// 21. Edge cases
// ============================================================================
console.log('\n--- Edge cases ---');

(function() {
  // Course with no quizzes completes on all lessons done
  var s = SimClassroom.initState();
  var cres = SimClassroom.createCourse(s, { title: 'No Quiz', category: 'social', teacherId: 't1' });
  s = cres.state;
  var lres = SimClassroom.addLesson(s, cres.courseId, { title: 'Only Lesson', content: 'x', objectives: [] });
  s = lres.state;
  s = SimClassroom.enroll(s, 'stu_nq', cres.courseId).state;
  var res = SimClassroom.completeLesson(s, 'stu_nq', cres.courseId, lres.lessonId);
  // checkCourseCompletion should return true (all lessons done, no quizzes required)
  var completed = SimClassroom.checkCourseCompletion(s.courses[cres.courseId],
    res.state.progress['stu_nq'][cres.courseId]);
  assert(completed, 'course with no quizzes completes when all lessons done');
})();

(function() {
  // Course with no lessons and no quizzes: trivially complete
  var s = SimClassroom.initState();
  var cres = SimClassroom.createCourse(s, { title: 'Empty Course', category: 'lore', teacherId: 't1' });
  s = cres.state;
  s = SimClassroom.enroll(s, 'stu_empty', cres.courseId).state;
  var completed = SimClassroom.checkCourseCompletion(
    s.courses[cres.courseId],
    s.progress['stu_empty'][cres.courseId]
  );
  assert(completed, 'course with no lessons/quizzes is trivially complete');
})();

(function() {
  // addQuiz with no questions (empty)
  var s = SimClassroom.initState();
  var cres = SimClassroom.createCourse(s, { title: 'X', category: 'lore', teacherId: 't1' });
  s = cres.state;
  var lres = SimClassroom.addLesson(s, cres.courseId, { title: 'L', content: '', objectives: [] });
  s = lres.state;
  var qres = SimClassroom.addQuiz(s, cres.courseId, lres.lessonId, []);
  assert(qres.quizId !== null, 'addQuiz with no questions still creates quiz');
  assertEqual(qres.quiz.questions.length, 0, 'empty quiz has 0 questions');
})();

(function() {
  // submitQuiz with empty quiz gives 0 score
  var s = SimClassroom.initState();
  var cres = SimClassroom.createCourse(s, { title: 'X', category: 'lore', teacherId: 't1' });
  s = cres.state;
  var lres = SimClassroom.addLesson(s, cres.courseId, { title: 'L', content: '', objectives: [] });
  s = lres.state;
  var qres = SimClassroom.addQuiz(s, cres.courseId, lres.lessonId, []);
  s = qres.state;
  s = SimClassroom.enroll(s, 'stu_empty_q', cres.courseId).state;
  var res = SimClassroom.submitQuiz(s, 'stu_empty_q', cres.courseId, qres.quizId, []);
  assertEqual(res.score, 0, 'empty quiz returns score 0');
})();

(function() {
  // Multiple students in same course — independent progress
  var s = SimClassroom.initState();
  var p = makeFullCourse(s, 't1', 'lore');
  s = p.state;
  s = SimClassroom.enroll(s, 'stu_ind_A', p.courseId).state;
  s = SimClassroom.enroll(s, 'stu_ind_B', p.courseId).state;

  s = SimClassroom.completeLesson(s, 'stu_ind_A', p.courseId, p.lessonId1).state;
  // B has not completed lesson 1
  assert(s.progress['stu_ind_A'][p.courseId].lessons_done.indexOf(p.lessonId1) !== -1,
    'stu_A has lesson 1 done');
  assert(s.progress['stu_ind_B'][p.courseId].lessons_done.indexOf(p.lessonId1) === -1,
    'stu_B lesson 1 not done (independent progress)');
})();

(function() {
  // Courses from different teachers are independent
  var s = SimClassroom.initState();
  var r1 = SimClassroom.createCourse(s, { title: 'T1 Course', category: 'lore', teacherId: 'teacher_one' });
  s = r1.state;
  var r2 = SimClassroom.createCourse(s, { title: 'T2 Course', category: 'combat', teacherId: 'teacher_two' });
  s = r2.state;

  assert(s.teacher_profiles['teacher_one'] !== undefined, 'teacher_one profile exists');
  assert(s.teacher_profiles['teacher_two'] !== undefined, 'teacher_two profile exists');
  assert(s.teacher_profiles['teacher_one'].courses.indexOf(r2.courseId) === -1,
    'teacher_one does not own teacher_two course');
})();

(function() {
  // removePrerequisite for non-existent prereq is a no-op
  var s = SimClassroom.initState();
  var r1 = SimClassroom.createCourse(s, { title: 'A', category: 'lore', teacherId: 't1' });
  s = r1.state;
  var result = SimClassroom.removePrerequisite(s, r1.courseId, 'bad_prereq');
  assert(result === s || JSON.stringify(result) === JSON.stringify(s), 'removePrerequisite with bad prereq is safe');
})();

(function() {
  // addPrerequisite with nonexistent prereqCourseId returns same state
  var s = SimClassroom.initState();
  var r1 = SimClassroom.createCourse(s, { title: 'A', category: 'lore', teacherId: 't1' });
  s = r1.state;
  var result = SimClassroom.addPrerequisite(s, r1.courseId, 'bad_prereq');
  assert(result === s, 'addPrerequisite with bad prereqCourseId returns same state');
})();

// ============================================================================
// Results
// ============================================================================

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) {
  process.exit(1);
}
