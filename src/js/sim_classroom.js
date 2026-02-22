// sim_classroom.js — Learning Management System Simulation
// Teachers create courses with lessons and quizzes; students enroll, complete
// modules, earn knowledge certificates, and rate courses.
// Article XI: Simulations run locally, store state as JSON, use pure functions.
(function(exports) {
  'use strict';

  // ---------------------------------------------------------------------------
  // Dependencies (guard pattern)
  // ---------------------------------------------------------------------------

  var Mentoring = (typeof window !== 'undefined' && window.Mentoring) || {};
  var Apprenticeship = (typeof window !== 'undefined' && window.Apprenticeship) || {};
  var SkillMastery = (typeof window !== 'undefined' && window.SkillMastery) || {};
  var Profiles = (typeof window !== 'undefined' && window.Profiles) || {};
  var Economy = (typeof window !== 'undefined' && window.Economy) || {};

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  var CATEGORIES = ['crafting', 'combat', 'lore', 'social', 'economics', 'exploration'];

  var PASS_THRESHOLD = 70; // percent to pass a quiz

  var SPARK_REWARDS = {
    complete_lesson: 5,
    pass_quiz: 10,
    complete_course: 50,
    earn_certificate: 25,
    rate_course: 2
  };

  var QUESTION_TYPES = ['multiple_choice', 'true_false'];

  var NPC_COURSE_TEMPLATES = [
    { category: 'crafting',    title: 'Forge Fundamentals',          desc: 'Learn the basics of metalworking and tool crafting.' },
    { category: 'combat',      title: 'Swordsmanship 101',           desc: 'Master stances, footwork, and the first principles of blade combat.' },
    { category: 'lore',        title: 'History of ZION',             desc: 'Explore the founding myths and ancient lineages of the realm.' },
    { category: 'social',      title: 'Diplomacy & Negotiation',     desc: 'Persuade, mediate, and forge alliances without violence.' },
    { category: 'economics',   title: 'Market Fundamentals',         desc: 'Supply, demand, and the art of the fair trade.' },
    { category: 'exploration', title: 'Cartography for Beginners',   desc: 'Read terrain, mark waypoints, and avoid deadly hazards.' },
    { category: 'crafting',    title: 'Alchemy Essentials',          desc: 'Combine reagents safely and brew potions without explosions.' },
    { category: 'lore',        title: 'Arcane Symbols & Runes',      desc: 'Decode inscriptions found in the Athenaeum vaults.' },
    { category: 'social',      title: 'Community Leadership',        desc: 'Organize citizens, resolve disputes, inspire collective action.' },
    { category: 'economics',   title: 'Advanced Trading Strategies', desc: 'Arbitrage, futures, and cornering the crystal market.' }
  ];

  // ---------------------------------------------------------------------------
  // mulberry32 seeded PRNG
  // ---------------------------------------------------------------------------

  function mulberry32(seed) {
    var s = seed >>> 0;
    return function() {
      s += 0x6D2B79F5;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------------------------------------------------------------------------
  // ID generation
  // ---------------------------------------------------------------------------

  var _idCounter = 0;

  function genId(prefix) {
    _idCounter++;
    return prefix + '_' + Date.now().toString(36) + '_' + _idCounter;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function objectKeys(obj) {
    var keys = [];
    for (var k in obj) {
      if (obj.hasOwnProperty(k)) { keys.push(k); }
    }
    return keys;
  }

  function objectValues(obj) {
    var vals = [];
    for (var k in obj) {
      if (obj.hasOwnProperty(k)) { vals.push(obj[k]); }
    }
    return vals;
  }

  function clamp(val, lo, hi) {
    return Math.max(lo, Math.min(hi, val));
  }

  // ---------------------------------------------------------------------------
  // State initialisation
  // ---------------------------------------------------------------------------

  function initState(snapshot) {
    if (snapshot && (snapshot.courses || snapshot._version)) {
      // Restore id counter from snapshot data
      var maxId = 0;
      function scanId(id) {
        if (typeof id === 'string') {
          var parts = id.split('_');
          var n = parseInt(parts[parts.length - 1], 36);
          if (!isNaN(n) && n > maxId) { maxId = n; }
        }
      }
      var snap = snapshot;
      var ckeys = objectKeys(snap.courses || {});
      for (var ci = 0; ci < ckeys.length; ci++) {
        scanId(ckeys[ci]);
        var course = snap.courses[ckeys[ci]];
        var lkeys = objectKeys(course.lessons || {});
        for (var li = 0; li < lkeys.length; li++) { scanId(lkeys[li]); }
        var qkeys = objectKeys(course.quizzes || {});
        for (var qi = 0; qi < qkeys.length; qi++) { scanId(qkeys[qi]); }
      }
      var certKeys = objectKeys(snap.certificates || {});
      for (var ceri = 0; ceri < certKeys.length; ceri++) { scanId(certKeys[ceri]); }
      _idCounter = maxId;

      var loaded = clone(snapshot);
      if (!loaded._version) { loaded._version = 1; }
      if (!loaded.courses) { loaded.courses = {}; }
      if (!loaded.enrollments) { loaded.enrollments = {}; }
      if (!loaded.progress) { loaded.progress = {}; }
      if (!loaded.certificates) { loaded.certificates = {}; }
      if (!loaded.teacher_profiles) { loaded.teacher_profiles = {}; }
      if (!loaded.ratings) { loaded.ratings = {}; }
      return loaded;
    }

    return {
      _version: 1,
      courses: {},          // courseId -> course object
      enrollments: {},      // studentId -> [courseId, ...]
      progress: {},         // studentId -> { courseId -> { lessons_done, quiz_scores, completed, spark_earned } }
      certificates: {},     // certId -> certificate object
      teacher_profiles: {}, // teacherId -> { courses, total_students, avg_rating }
      ratings: {}           // courseId -> { raterIds: [], scores: [], avg: number }
    };
  }

  // ---------------------------------------------------------------------------
  // Course Creation
  // ---------------------------------------------------------------------------

  function createCourse(state, data) {
    var s = clone(state);
    var teacherId = data.teacherId || data.teacher || 'system';
    var category = data.category || 'lore';
    if (CATEGORIES.indexOf(category) === -1) { category = 'lore'; }

    var courseId = genId('crs');
    var course = {
      id: courseId,
      title: data.title || 'Untitled Course',
      description: data.description || '',
      category: category,
      teacherId: teacherId,
      prerequisites: data.prerequisites || [],
      sparkReward: data.sparkReward || SPARK_REWARDS.complete_course,
      lessons: {},     // lessonId -> lesson object (ordered list maintained separately)
      lessonOrder: [], // [lessonId, ...] in order
      quizzes: {},     // quizId -> quiz object (linked to a lessonId)
      ratings: [],     // kept for quick access
      avgRating: 0,
      totalStudents: 0,
      createdAt: new Date().toISOString()
    };

    s.courses[courseId] = course;

    // Ensure teacher profile
    if (!s.teacher_profiles[teacherId]) {
      s.teacher_profiles[teacherId] = {
        teacherId: teacherId,
        courses: [],
        total_students: 0,
        avg_rating: 0,
        total_ratings: 0
      };
    }
    s.teacher_profiles[teacherId].courses.push(courseId);

    // Ensure ratings bucket
    if (!s.ratings[courseId]) {
      s.ratings[courseId] = { raterIds: [], scores: [], avg: 0 };
    }

    return { state: s, courseId: courseId, course: s.courses[courseId] };
  }

  // ---------------------------------------------------------------------------
  // Lesson Modules
  // ---------------------------------------------------------------------------

  function addLesson(state, courseId, data) {
    if (!state.courses[courseId]) { return { state: state, lessonId: null }; }
    var s = clone(state);
    var course = s.courses[courseId];

    var lessonId = genId('les');
    var lesson = {
      id: lessonId,
      courseId: courseId,
      title: data.title || 'Untitled Lesson',
      content: data.content || '',
      objectives: Array.isArray(data.objectives) ? data.objectives.slice() : [],
      order: course.lessonOrder.length,
      createdAt: new Date().toISOString()
    };

    course.lessons[lessonId] = lesson;
    course.lessonOrder.push(lessonId);

    return { state: s, lessonId: lessonId, lesson: lesson };
  }

  function updateLesson(state, courseId, lessonId, data) {
    if (!state.courses[courseId]) { return state; }
    if (!state.courses[courseId].lessons[lessonId]) { return state; }
    var s = clone(state);
    var lesson = s.courses[courseId].lessons[lessonId];
    if (data.title !== undefined) { lesson.title = data.title; }
    if (data.content !== undefined) { lesson.content = data.content; }
    if (data.objectives !== undefined) { lesson.objectives = data.objectives.slice(); }
    lesson.updatedAt = new Date().toISOString();
    return s;
  }

  // ---------------------------------------------------------------------------
  // Quiz System
  // ---------------------------------------------------------------------------

  function addQuiz(state, courseId, lessonId, questions) {
    if (!state.courses[courseId]) { return { state: state, quizId: null }; }
    var s = clone(state);
    var course = s.courses[courseId];

    // Validate and normalise questions
    var validated = [];
    for (var i = 0; i < questions.length; i++) {
      var q = questions[i];
      var type = q.type || 'multiple_choice';
      if (QUESTION_TYPES.indexOf(type) === -1) { type = 'multiple_choice'; }

      var vq = {
        id: genId('qst'),
        type: type,
        prompt: q.prompt || '',
        options: Array.isArray(q.options) ? q.options.slice() : [],
        correct: q.correct !== undefined ? q.correct : 0 // index for MC, bool for T/F
      };

      if (type === 'true_false') {
        vq.options = ['True', 'False'];
        vq.correct = q.correct === true || q.correct === 'true' || q.correct === 0 ? 0 : 1;
      }
      validated.push(vq);
    }

    var quizId = genId('qz');
    var quiz = {
      id: quizId,
      courseId: courseId,
      lessonId: lessonId || null,
      questions: validated,
      createdAt: new Date().toISOString()
    };

    course.quizzes[quizId] = quiz;
    return { state: s, quizId: quizId, quiz: quiz };
  }

  // ---------------------------------------------------------------------------
  // Enrollment
  // ---------------------------------------------------------------------------

  function canEnroll(state, studentId, courseId) {
    var course = state.courses[courseId];
    if (!course) { return { ok: false, reason: 'course_not_found' }; }

    // Check already enrolled
    var enrolled = state.enrollments[studentId] || [];
    if (enrolled.indexOf(courseId) !== -1) { return { ok: false, reason: 'already_enrolled' }; }

    // Check prerequisites
    var prereqs = course.prerequisites || [];
    for (var i = 0; i < prereqs.length; i++) {
      var prereqId = prereqs[i];
      var prog = (state.progress[studentId] || {})[prereqId];
      if (!prog || !prog.completed) {
        return { ok: false, reason: 'prerequisite_not_met', missing: prereqId };
      }
    }

    return { ok: true };
  }

  function enroll(state, studentId, courseId) {
    var check = canEnroll(state, studentId, courseId);
    if (!check.ok) { return { state: state, ok: false, reason: check.reason }; }

    var s = clone(state);
    if (!s.enrollments[studentId]) { s.enrollments[studentId] = []; }
    s.enrollments[studentId].push(courseId);

    // Init progress record
    if (!s.progress[studentId]) { s.progress[studentId] = {}; }
    s.progress[studentId][courseId] = {
      lessons_done: [],
      quiz_scores: {},    // quizId -> score (0-100)
      completed: false,
      spark_earned: 0,
      enrolled_at: new Date().toISOString()
    };

    // Update course student count
    s.courses[courseId].totalStudents++;

    // Update teacher profile
    var teacherId = s.courses[courseId].teacherId;
    if (s.teacher_profiles[teacherId]) {
      s.teacher_profiles[teacherId].total_students++;
    }

    return { state: s, ok: true };
  }

  function unenroll(state, studentId, courseId) {
    if (!state.enrollments[studentId]) { return state; }
    var idx = state.enrollments[studentId].indexOf(courseId);
    if (idx === -1) { return state; }
    var s = clone(state);
    s.enrollments[studentId].splice(idx, 1);
    if (s.progress[studentId]) {
      delete s.progress[studentId][courseId];
    }
    return s;
  }

  // ---------------------------------------------------------------------------
  // Lesson Completion
  // ---------------------------------------------------------------------------

  function completeLesson(state, studentId, courseId, lessonId) {
    var course = state.courses[courseId];
    if (!course) { return { state: state, ok: false, reason: 'course_not_found' }; }
    if (!course.lessons[lessonId]) { return { state: state, ok: false, reason: 'lesson_not_found' }; }

    var prog = (state.progress[studentId] || {})[courseId];
    if (!prog) { return { state: state, ok: false, reason: 'not_enrolled' }; }
    if (prog.lessons_done.indexOf(lessonId) !== -1) {
      return { state: state, ok: false, reason: 'already_completed' };
    }

    var s = clone(state);
    var sp = s.progress[studentId][courseId];
    sp.lessons_done.push(lessonId);
    sp.spark_earned += SPARK_REWARDS.complete_lesson;

    return { state: s, ok: true, spark: SPARK_REWARDS.complete_lesson };
  }

  // ---------------------------------------------------------------------------
  // Quiz Submission & Grading
  // ---------------------------------------------------------------------------

  function submitQuiz(state, studentId, courseId, quizId, answers) {
    // answers: array of answer values (indices for MC, 0/1 for T/F)
    var course = state.courses[courseId];
    if (!course) { return { state: state, ok: false, reason: 'course_not_found' }; }
    var quiz = course.quizzes[quizId];
    if (!quiz) { return { state: state, ok: false, reason: 'quiz_not_found' }; }

    var prog = (state.progress[studentId] || {})[courseId];
    if (!prog) { return { state: state, ok: false, reason: 'not_enrolled' }; }

    var questions = quiz.questions;
    var correct = 0;
    for (var i = 0; i < questions.length; i++) {
      var q = questions[i];
      var answer = answers[i];
      if (answer === q.correct) { correct++; }
    }

    var score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
    var passed = score >= PASS_THRESHOLD;

    var s = clone(state);
    var sp = s.progress[studentId][courseId];

    // Only record best score
    var prev = sp.quiz_scores[quizId];
    if (prev === undefined || score > prev) {
      sp.quiz_scores[quizId] = score;
    }

    var sparkEarned = 0;
    if (passed && (prev === undefined || prev < PASS_THRESHOLD)) {
      // First time passing
      sparkEarned = SPARK_REWARDS.pass_quiz;
      sp.spark_earned += sparkEarned;
    }

    // Check if course is now completed
    var courseCompleted = false;
    if (!sp.completed) {
      courseCompleted = checkCourseCompletion(s.courses[courseId], sp);
      if (courseCompleted) {
        sp.completed = true;
        sp.completed_at = new Date().toISOString();
        sp.spark_earned += s.courses[courseId].sparkReward;
        sparkEarned += s.courses[courseId].sparkReward;
      }
    }

    return {
      state: s,
      ok: true,
      score: score,
      passed: passed,
      correct: correct,
      total: questions.length,
      sparkEarned: sparkEarned,
      courseCompleted: courseCompleted
    };
  }

  function checkCourseCompletion(course, prog) {
    // All lessons done
    var allLessons = course.lessonOrder;
    for (var i = 0; i < allLessons.length; i++) {
      if (prog.lessons_done.indexOf(allLessons[i]) === -1) { return false; }
    }
    // All quizzes passed (>= threshold)
    var quizIds = objectKeys(course.quizzes);
    for (var j = 0; j < quizIds.length; j++) {
      var score = prog.quiz_scores[quizIds[j]];
      if (score === undefined || score < PASS_THRESHOLD) { return false; }
    }
    return true;
  }

  // ---------------------------------------------------------------------------
  // Certificates
  // ---------------------------------------------------------------------------

  function issueCertificate(state, studentId, courseId) {
    var course = state.courses[courseId];
    if (!course) { return { state: state, ok: false, reason: 'course_not_found' }; }

    var prog = (state.progress[studentId] || {})[courseId];
    if (!prog || !prog.completed) {
      return { state: state, ok: false, reason: 'course_not_completed' };
    }

    // Check if already has cert for this course
    var certs = objectValues(state.certificates);
    for (var i = 0; i < certs.length; i++) {
      if (certs[i].studentId === studentId && certs[i].courseId === courseId) {
        return { state: state, ok: false, reason: 'certificate_exists', certId: certs[i].id };
      }
    }

    var s = clone(state);
    var certId = genId('cert');

    // Compute overall quiz average
    var quizScores = objectValues(prog.quiz_scores);
    var avgScore = 0;
    if (quizScores.length > 0) {
      var sum = 0;
      for (var j = 0; j < quizScores.length; j++) { sum += quizScores[j]; }
      avgScore = Math.round(sum / quizScores.length);
    } else {
      avgScore = 100; // no quizzes = full credit
    }

    var cert = {
      id: certId,
      studentId: studentId,
      courseId: courseId,
      courseTitle: course.title,
      teacherId: course.teacherId,
      category: course.category,
      avgScore: avgScore,
      sparkEarned: SPARK_REWARDS.earn_certificate,
      issuedAt: new Date().toISOString(),
      hash: simpleHash(certId + studentId + courseId + avgScore)
    };

    s.certificates[certId] = cert;
    s.progress[studentId][courseId].certId = certId;
    s.progress[studentId][courseId].spark_earned += SPARK_REWARDS.earn_certificate;

    return { state: s, ok: true, cert: cert, certId: certId };
  }

  function verifyCertificate(state, certId) {
    var cert = state.certificates[certId];
    if (!cert) { return { valid: false, reason: 'not_found' }; }
    var expected = simpleHash(certId + cert.studentId + cert.courseId + cert.avgScore);
    if (expected !== cert.hash) { return { valid: false, reason: 'tampered' }; }
    return { valid: true, cert: cert };
  }

  function simpleHash(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (Math.imul(h, 0x01000193)) >>> 0;
    }
    return h.toString(16);
  }

  // ---------------------------------------------------------------------------
  // Course Ratings
  // ---------------------------------------------------------------------------

  function rateCourse(state, studentId, courseId, stars) {
    var course = state.courses[courseId];
    if (!course) { return { state: state, ok: false, reason: 'course_not_found' }; }

    // Must be enrolled
    var enrolled = state.enrollments[studentId] || [];
    if (enrolled.indexOf(courseId) === -1) {
      return { state: state, ok: false, reason: 'not_enrolled' };
    }

    stars = clamp(Math.round(stars), 1, 5);

    var s = clone(state);
    var bucket = s.ratings[courseId];
    if (!bucket) { bucket = { raterIds: [], scores: [], avg: 0 }; s.ratings[courseId] = bucket; }

    // Update or add rating
    var existing = bucket.raterIds.indexOf(studentId);
    if (existing !== -1) {
      bucket.scores[existing] = stars;
    } else {
      bucket.raterIds.push(studentId);
      bucket.scores.push(stars);
    }

    // Recompute average
    var sum = 0;
    for (var i = 0; i < bucket.scores.length; i++) { sum += bucket.scores[i]; }
    bucket.avg = Math.round((sum / bucket.scores.length) * 10) / 10;

    // Mirror to course object
    s.courses[courseId].avgRating = bucket.avg;
    s.courses[courseId].ratings = bucket.scores.slice();

    // Add spark
    var prog = (s.progress[studentId] || {})[courseId];
    if (prog) { prog.spark_earned += SPARK_REWARDS.rate_course; }

    // Update teacher reputation
    _recomputeTeacherReputation(s, s.courses[courseId].teacherId);

    return { state: s, ok: true, avg: bucket.avg, sparkEarned: SPARK_REWARDS.rate_course };
  }

  function _recomputeTeacherReputation(s, teacherId) {
    var profile = s.teacher_profiles[teacherId];
    if (!profile) { return; }
    var courseIds = profile.courses;
    var totalScore = 0;
    var totalRatings = 0;
    for (var i = 0; i < courseIds.length; i++) {
      var bucket = s.ratings[courseIds[i]];
      if (bucket && bucket.scores.length > 0) {
        totalScore += bucket.avg * bucket.scores.length;
        totalRatings += bucket.scores.length;
      }
    }
    profile.avg_rating = totalRatings > 0 ? Math.round((totalScore / totalRatings) * 10) / 10 : 0;
    profile.total_ratings = totalRatings;
  }

  // ---------------------------------------------------------------------------
  // Teacher Reputation
  // ---------------------------------------------------------------------------

  function getTeacherProfile(state, teacherId) {
    return state.teacher_profiles[teacherId] || null;
  }

  // ---------------------------------------------------------------------------
  // Query Helpers
  // ---------------------------------------------------------------------------

  function getCoursesByCategory(state, category) {
    var results = [];
    var keys = objectKeys(state.courses);
    for (var i = 0; i < keys.length; i++) {
      if (state.courses[keys[i]].category === category) {
        results.push(state.courses[keys[i]]);
      }
    }
    return results;
  }

  function getCoursesByTeacher(state, teacherId) {
    var results = [];
    var keys = objectKeys(state.courses);
    for (var i = 0; i < keys.length; i++) {
      if (state.courses[keys[i]].teacherId === teacherId) {
        results.push(state.courses[keys[i]]);
      }
    }
    return results;
  }

  function getStudentEnrollments(state, studentId) {
    return (state.enrollments[studentId] || []).slice();
  }

  function getStudentCertificates(state, studentId) {
    var results = [];
    var keys = objectKeys(state.certificates);
    for (var i = 0; i < keys.length; i++) {
      if (state.certificates[keys[i]].studentId === studentId) {
        results.push(state.certificates[keys[i]]);
      }
    }
    return results;
  }

  function getStudentProgress(state, studentId, courseId) {
    var prog = state.progress[studentId];
    if (!prog) { return null; }
    if (courseId) { return prog[courseId] || null; }
    return prog;
  }

  function getCourseCompletionRate(state, courseId) {
    var total = 0;
    var completed = 0;
    var studIds = objectKeys(state.enrollments);
    for (var i = 0; i < studIds.length; i++) {
      if (state.enrollments[studIds[i]].indexOf(courseId) !== -1) {
        total++;
        var prog = (state.progress[studIds[i]] || {})[courseId];
        if (prog && prog.completed) { completed++; }
      }
    }
    if (total === 0) { return 0; }
    return Math.round((completed / total) * 100);
  }

  function getAvailableCourses(state, studentId) {
    // Courses the student hasn't enrolled in yet and meets prerequisites for
    var results = [];
    var keys = objectKeys(state.courses);
    for (var i = 0; i < keys.length; i++) {
      var courseId = keys[i];
      var check = canEnroll(state, studentId, courseId);
      if (check.ok) {
        results.push(state.courses[courseId]);
      }
    }
    return results;
  }

  // ---------------------------------------------------------------------------
  // Prerequisites
  // ---------------------------------------------------------------------------

  function addPrerequisite(state, courseId, prereqCourseId) {
    if (!state.courses[courseId]) { return state; }
    if (!state.courses[prereqCourseId]) { return state; }
    var s = clone(state);
    var course = s.courses[courseId];
    if (course.prerequisites.indexOf(prereqCourseId) === -1) {
      course.prerequisites.push(prereqCourseId);
    }
    return s;
  }

  function removePrerequisite(state, courseId, prereqCourseId) {
    if (!state.courses[courseId]) { return state; }
    var s = clone(state);
    var prereqs = s.courses[courseId].prerequisites;
    var idx = prereqs.indexOf(prereqCourseId);
    if (idx !== -1) { prereqs.splice(idx, 1); }
    return s;
  }

  // ---------------------------------------------------------------------------
  // NPC Teacher — AI-driven course creation via intention system
  // ---------------------------------------------------------------------------

  function npcCreateCourse(state, npcId, seed) {
    var rng = mulberry32(seed || (Date.now() & 0x7fffffff));
    var tpl = NPC_COURSE_TEMPLATES[Math.floor(rng() * NPC_COURSE_TEMPLATES.length)];

    var result = createCourse(state, {
      teacherId: npcId,
      title: tpl.title,
      description: tpl.desc,
      category: tpl.category
    });
    var s = result.state;
    var courseId = result.courseId;

    // Add 2-4 lessons
    var lessonCount = 2 + Math.floor(rng() * 3);
    var lessonTitles = [
      'Introduction', 'Core Concepts', 'Practical Application',
      'Advanced Techniques', 'Final Review'
    ];
    for (var i = 0; i < lessonCount; i++) {
      var ltitle = lessonTitles[i % lessonTitles.length] + ' — ' + tpl.title;
      var lres = addLesson(s, courseId, {
        title: ltitle,
        content: 'Lesson content for ' + ltitle + '. Study carefully before proceeding.',
        objectives: ['Understand the fundamentals', 'Apply concepts in practice']
      });
      s = lres.state;

      // Add a quiz for each lesson (3 questions)
      var questions = _npcGenerateQuestions(tpl.category, rng, 3);
      var qres = addQuiz(s, courseId, lres.lessonId, questions);
      s = qres.state;
    }

    return { state: s, courseId: courseId };
  }

  function _npcGenerateQuestions(category, rng, count) {
    var mcBank = {
      crafting:    ['What is the first step in forging?', 'Which alloy is strongest?', 'How long must iron cool?'],
      combat:      ['What stance is best for defense?', 'Which strike targets are vital?', 'When should you retreat?'],
      lore:        ['Who founded ZION?', 'What are the ancient runes called?', 'How many original zones exist?'],
      social:      ['What builds trust fastest?', 'How do you resolve a dispute?', 'What is active listening?'],
      economics:   ['What drives prices up?', 'What is arbitrage?', 'How do you spot a bubble?'],
      exploration: ['How do you read terrain?', 'What does a waypoint marker look like?', 'How to survive the wilds?']
    };
    var opts = mcBank[category] || mcBank.lore;
    var questions = [];
    for (var i = 0; i < count; i++) {
      var type = rng() > 0.5 ? 'multiple_choice' : 'true_false';
      if (type === 'true_false') {
        questions.push({
          type: 'true_false',
          prompt: opts[i % opts.length] + ' (True or False)',
          correct: rng() > 0.5 ? 0 : 1
        });
      } else {
        questions.push({
          type: 'multiple_choice',
          prompt: opts[i % opts.length],
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correct: Math.floor(rng() * 4)
        });
      }
    }
    return questions;
  }

  // ---------------------------------------------------------------------------
  // Spark reward helper (calls Economy if available)
  // ---------------------------------------------------------------------------

  function awardSpark(playerId, amount, reason) {
    if (Economy && typeof Economy.addSpark === 'function') {
      Economy.addSpark(playerId, amount, reason || 'classroom');
    }
    // If Economy not available, silently succeed (pure simulation mode)
  }

  // ---------------------------------------------------------------------------
  // applyAction dispatch (protocol message handler)
  // ---------------------------------------------------------------------------

  function applyAction(state, msg) {
    var payload = msg.payload || msg;
    var action = payload.action;
    var data = payload.data || {};
    var from = msg.from || payload.from || 'system';

    switch (action) {
      case 'create_course':
        return createCourse(state, mergeFrom(data, from)).state;

      case 'add_lesson':
        return addLesson(state, data.courseId, data).state;

      case 'update_lesson':
        return updateLesson(state, data.courseId, data.lessonId, data);

      case 'add_quiz':
        return addQuiz(state, data.courseId, data.lessonId, data.questions || []).state;

      case 'enroll':
        return enroll(state, data.studentId || from, data.courseId).state;

      case 'unenroll':
        return unenroll(state, data.studentId || from, data.courseId);

      case 'complete_lesson':
        return completeLesson(state, data.studentId || from, data.courseId, data.lessonId).state;

      case 'submit_quiz':
        return submitQuiz(state, data.studentId || from, data.courseId, data.quizId, data.answers || []).state;

      case 'issue_certificate':
        return issueCertificate(state, data.studentId || from, data.courseId).state;

      case 'rate_course':
        return rateCourse(state, data.studentId || from, data.courseId, data.stars).state;

      case 'add_prerequisite':
        return addPrerequisite(state, data.courseId, data.prereqCourseId);

      case 'remove_prerequisite':
        return removePrerequisite(state, data.courseId, data.prereqCourseId);

      case 'npc_create_course':
        return npcCreateCourse(state, data.npcId || from, data.seed).state;

      default:
        return state;
    }
  }

  function mergeFrom(data, from) {
    var out = {};
    for (var k in data) { if (data.hasOwnProperty(k)) { out[k] = data[k]; } }
    if (!out.teacherId) { out.teacherId = from; }
    return out;
  }

  // ---------------------------------------------------------------------------
  // Metrics
  // ---------------------------------------------------------------------------

  function getMetrics(state) {
    var courseCount = objectKeys(state.courses).length;
    var certCount = objectKeys(state.certificates).length;
    var teacherCount = objectKeys(state.teacher_profiles).length;

    var totalEnrolled = 0;
    var studIds = objectKeys(state.enrollments);
    for (var i = 0; i < studIds.length; i++) {
      if (state.enrollments[studIds[i]].length > 0) { totalEnrolled++; }
    }

    var completedCount = 0;
    var progStudIds = objectKeys(state.progress);
    for (var j = 0; j < progStudIds.length; j++) {
      var progs = state.progress[progStudIds[j]];
      for (var cid in progs) {
        if (progs.hasOwnProperty(cid) && progs[cid].completed) { completedCount++; }
      }
    }

    var ratingKeys = objectKeys(state.ratings);
    var totalRatings = 0;
    var avgRatingSum = 0;
    var ratedCourses = 0;
    for (var ri = 0; ri < ratingKeys.length; ri++) {
      var bucket = state.ratings[ratingKeys[ri]];
      if (bucket && bucket.scores.length > 0) {
        totalRatings += bucket.scores.length;
        avgRatingSum += bucket.avg;
        ratedCourses++;
      }
    }

    var byCategory = {};
    for (var ci = 0; ci < CATEGORIES.length; ci++) { byCategory[CATEGORIES[ci]] = 0; }
    var ckeys = objectKeys(state.courses);
    for (var ck = 0; ck < ckeys.length; ck++) {
      var cat = state.courses[ckeys[ck]].category;
      if (byCategory[cat] !== undefined) { byCategory[cat]++; }
    }

    return {
      course_count: courseCount,
      certificate_count: certCount,
      teacher_count: teacherCount,
      total_enrolled: totalEnrolled,
      total_completions: completedCount,
      total_ratings: totalRatings,
      avg_rating: ratedCourses > 0 ? Math.round((avgRatingSum / ratedCourses) * 10) / 10 : 0,
      courses_by_category: byCategory
    };
  }

  // ---------------------------------------------------------------------------
  // Simulation tick — NPC teachers occasionally create courses
  // ---------------------------------------------------------------------------

  var _tickSeed = 0x9e3779b9;

  function simulateTick(state, npcIds, tickNum) {
    if (!npcIds || npcIds.length === 0) { return state; }
    _tickSeed = ((_tickSeed ^ (tickNum || 1) * 0x517cc1b727220a95) & 0x7fffffff) >>> 0 || 1;
    var rng = mulberry32(_tickSeed);

    var s = state;
    // Each NPC has a 20% chance to create a course per tick
    for (var i = 0; i < npcIds.length; i++) {
      if (rng() < 0.20) {
        var res = npcCreateCourse(s, npcIds[i], Math.floor(rng() * 0x7fffffff));
        s = res.state;
      }
    }
    return s;
  }

  // ---------------------------------------------------------------------------
  // Exports
  // ---------------------------------------------------------------------------

  exports.CATEGORIES = CATEGORIES;
  exports.PASS_THRESHOLD = PASS_THRESHOLD;
  exports.SPARK_REWARDS = SPARK_REWARDS;
  exports.QUESTION_TYPES = QUESTION_TYPES;

  exports.initState = initState;
  exports.createCourse = createCourse;
  exports.addLesson = addLesson;
  exports.updateLesson = updateLesson;
  exports.addQuiz = addQuiz;
  exports.enroll = enroll;
  exports.unenroll = unenroll;
  exports.canEnroll = canEnroll;
  exports.completeLesson = completeLesson;
  exports.submitQuiz = submitQuiz;
  exports.checkCourseCompletion = checkCourseCompletion;
  exports.issueCertificate = issueCertificate;
  exports.verifyCertificate = verifyCertificate;
  exports.rateCourse = rateCourse;
  exports.getTeacherProfile = getTeacherProfile;
  exports.addPrerequisite = addPrerequisite;
  exports.removePrerequisite = removePrerequisite;
  exports.getCoursesByCategory = getCoursesByCategory;
  exports.getCoursesByTeacher = getCoursesByTeacher;
  exports.getStudentEnrollments = getStudentEnrollments;
  exports.getStudentCertificates = getStudentCertificates;
  exports.getStudentProgress = getStudentProgress;
  exports.getCourseCompletionRate = getCourseCompletionRate;
  exports.getAvailableCourses = getAvailableCourses;
  exports.npcCreateCourse = npcCreateCourse;
  exports.applyAction = applyAction;
  exports.getMetrics = getMetrics;
  exports.simulateTick = simulateTick;
  exports.awardSpark = awardSpark;

})(typeof module !== 'undefined' ? module.exports : (window.SimClassroom = {}));
