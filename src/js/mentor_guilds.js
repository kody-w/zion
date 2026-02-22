// mentor_guilds.js
(function(exports) {
  'use strict';

  // ============================================================================
  // MENTOR GUILDS — ZION MMO
  // Specialized guild subtype for structured teaching and cohort learning.
  // Mentors lead groups of up to 5 students through 8 curricula with
  // tier certifications, peer review, and prestige ranks.
  // Constitution ref: §2.3 (community formation) §4.1 (education)
  // ============================================================================

  // --------------------------------------------------------------------------
  // CURRICULA DEFINITIONS
  // --------------------------------------------------------------------------

  var CURRICULA = [
    {
      id: 'crafting_mastery',
      name: 'Crafting Mastery',
      description: 'Complete crafting curriculum from basics to master-level',
      category: 'crafting',
      modules: [
        { id: 'basics',    name: 'Crafting Basics',      lessons: 5, xpPerLesson: 20  },
        { id: 'materials', name: 'Material Science',      lessons: 4, xpPerLesson: 30  },
        { id: 'quality',   name: 'Quality Control',       lessons: 4, xpPerLesson: 40  },
        { id: 'advanced',  name: 'Advanced Techniques',   lessons: 5, xpPerLesson: 50  },
        { id: 'mastery',   name: 'Mastery Project',       lessons: 2, xpPerLesson: 100 }
      ],
      totalLessons: 20,
      certifications: {
        bronze: { modulesRequired: 2, title: 'Bronze Crafter'  },
        silver: { modulesRequired: 3, title: 'Silver Crafter'  },
        gold:   { modulesRequired: 5, title: 'Gold Crafter'    }
      }
    },
    {
      id: 'combat_training',
      name: 'Combat Training',
      description: 'Structured combat curriculum from footwork to advanced tactics',
      category: 'combat',
      modules: [
        { id: 'stance',    name: 'Stance & Footwork',     lessons: 4, xpPerLesson: 20  },
        { id: 'strikes',   name: 'Strike Techniques',     lessons: 5, xpPerLesson: 30  },
        { id: 'defense',   name: 'Defense & Parrying',    lessons: 4, xpPerLesson: 40  },
        { id: 'combos',    name: 'Combo Sequences',       lessons: 5, xpPerLesson: 50  },
        { id: 'mastery',   name: 'Combat Mastery Trial',  lessons: 2, xpPerLesson: 100 }
      ],
      totalLessons: 20,
      certifications: {
        bronze: { modulesRequired: 2, title: 'Bronze Fighter'  },
        silver: { modulesRequired: 3, title: 'Silver Warrior'  },
        gold:   { modulesRequired: 5, title: 'Gold Champion'   }
      }
    },
    {
      id: 'exploration_school',
      name: 'Exploration School',
      description: 'Learn to map, navigate, and survive in the wilds of ZION',
      category: 'exploration',
      modules: [
        { id: 'navigation', name: 'Navigation Basics',    lessons: 4, xpPerLesson: 20  },
        { id: 'survival',   name: 'Wilderness Survival',  lessons: 5, xpPerLesson: 30  },
        { id: 'mapping',    name: 'Cartography',          lessons: 4, xpPerLesson: 40  },
        { id: 'scouting',   name: 'Advanced Scouting',    lessons: 5, xpPerLesson: 50  },
        { id: 'mastery',    name: 'Grand Expedition',     lessons: 2, xpPerLesson: 100 }
      ],
      totalLessons: 20,
      certifications: {
        bronze: { modulesRequired: 2, title: 'Bronze Scout'    },
        silver: { modulesRequired: 3, title: 'Silver Explorer' },
        gold:   { modulesRequired: 5, title: 'Gold Pathfinder' }
      }
    },
    {
      id: 'social_arts',
      name: 'Social Arts',
      description: 'Master diplomacy, negotiation, and community leadership',
      category: 'social',
      modules: [
        { id: 'etiquette',    name: 'Social Etiquette',   lessons: 4, xpPerLesson: 20  },
        { id: 'negotiation',  name: 'Negotiation',        lessons: 5, xpPerLesson: 30  },
        { id: 'leadership',   name: 'Leadership Skills',  lessons: 4, xpPerLesson: 40  },
        { id: 'diplomacy',    name: 'Diplomacy',          lessons: 5, xpPerLesson: 50  },
        { id: 'mastery',      name: 'Mediation Project',  lessons: 2, xpPerLesson: 100 }
      ],
      totalLessons: 20,
      certifications: {
        bronze: { modulesRequired: 2, title: 'Bronze Diplomat' },
        silver: { modulesRequired: 3, title: 'Silver Envoy'    },
        gold:   { modulesRequired: 5, title: 'Gold Ambassador' }
      }
    },
    {
      id: 'gardening_academy',
      name: 'Gardening Academy',
      description: 'Grow, cultivate, and master the living world of ZION',
      category: 'gardening',
      modules: [
        { id: 'seeds',      name: 'Seed & Soil',          lessons: 5, xpPerLesson: 20  },
        { id: 'plants',     name: 'Plant Biology',         lessons: 4, xpPerLesson: 30  },
        { id: 'seasons',    name: 'Seasonal Cycles',       lessons: 4, xpPerLesson: 40  },
        { id: 'rare',       name: 'Rare Cultivation',      lessons: 5, xpPerLesson: 50  },
        { id: 'mastery',    name: 'Master Garden',         lessons: 2, xpPerLesson: 100 }
      ],
      totalLessons: 20,
      certifications: {
        bronze: { modulesRequired: 2, title: 'Bronze Gardener'   },
        silver: { modulesRequired: 3, title: 'Silver Botanist'   },
        gold:   { modulesRequired: 5, title: 'Gold Horticulturist'}
      }
    },
    {
      id: 'fishing_school',
      name: 'Fishing School',
      description: 'Learn all aspects of fishing from casting to deep-sea expertise',
      category: 'fishing',
      modules: [
        { id: 'casting',    name: 'Casting Basics',        lessons: 4, xpPerLesson: 20  },
        { id: 'lures',      name: 'Lures & Bait',          lessons: 5, xpPerLesson: 30  },
        { id: 'locations',  name: 'Prime Locations',       lessons: 4, xpPerLesson: 40  },
        { id: 'species',    name: 'Rare Species',          lessons: 5, xpPerLesson: 50  },
        { id: 'mastery',    name: 'Grand Catch Challenge', lessons: 2, xpPerLesson: 100 }
      ],
      totalLessons: 20,
      certifications: {
        bronze: { modulesRequired: 2, title: 'Bronze Angler'    },
        silver: { modulesRequired: 3, title: 'Silver Fisher'    },
        gold:   { modulesRequired: 5, title: 'Gold Deep Angler' }
      }
    },
    {
      id: 'cooking_institute',
      name: 'Cooking Institute',
      description: 'From basic recipes to legendary feasts — master the culinary arts',
      category: 'cooking',
      modules: [
        { id: 'basics',     name: 'Kitchen Fundamentals', lessons: 5, xpPerLesson: 20  },
        { id: 'ingredients',name: 'Ingredient Mastery',   lessons: 4, xpPerLesson: 30  },
        { id: 'techniques', name: 'Cooking Techniques',   lessons: 4, xpPerLesson: 40  },
        { id: 'recipes',    name: 'Advanced Recipes',     lessons: 5, xpPerLesson: 50  },
        { id: 'mastery',    name: 'Legendary Feast',      lessons: 2, xpPerLesson: 100 }
      ],
      totalLessons: 20,
      certifications: {
        bronze: { modulesRequired: 2, title: 'Bronze Cook'   },
        silver: { modulesRequired: 3, title: 'Silver Chef'   },
        gold:   { modulesRequired: 5, title: 'Gold Culinaire'}
      }
    },
    {
      id: 'trading_academy',
      name: 'Trading Academy',
      description: 'Master commerce, supply chains, and the economy of ZION',
      category: 'trading',
      modules: [
        { id: 'basics',     name: 'Market Basics',         lessons: 4, xpPerLesson: 20  },
        { id: 'valuation',  name: 'Item Valuation',        lessons: 5, xpPerLesson: 30  },
        { id: 'logistics',  name: 'Trade Logistics',       lessons: 4, xpPerLesson: 40  },
        { id: 'strategy',   name: 'Market Strategy',       lessons: 5, xpPerLesson: 50  },
        { id: 'mastery',    name: 'Grand Trade Deal',      lessons: 2, xpPerLesson: 100 }
      ],
      totalLessons: 20,
      certifications: {
        bronze: { modulesRequired: 2, title: 'Bronze Trader'  },
        silver: { modulesRequired: 3, title: 'Silver Merchant'},
        gold:   { modulesRequired: 5, title: 'Gold Mogul'     }
      }
    }
  ];

  // --------------------------------------------------------------------------
  // MENTOR RANKS
  // --------------------------------------------------------------------------

  var MENTOR_RANKS = [
    {
      rank: 'apprentice_mentor',
      cohortsRequired: 0,
      studentsGraduated: 0,
      title: 'Apprentice Mentor',
      xpBonus: 0.0
    },
    {
      rank: 'journeyman_mentor',
      cohortsRequired: 1,
      studentsGraduated: 5,
      title: 'Journeyman Mentor',
      xpBonus: 0.1
    },
    {
      rank: 'master_mentor',
      cohortsRequired: 3,
      studentsGraduated: 15,
      title: 'Master Mentor',
      xpBonus: 0.2
    },
    {
      rank: 'grand_mentor',
      cohortsRequired: 6,
      studentsGraduated: 30,
      title: 'Grand Mentor',
      xpBonus: 0.3
    }
  ];

  // Max students per cohort
  var MAX_COHORT_STUDENTS = 5;

  // Mentor XP awarded for graduating a cohort
  var MENTOR_XP_PER_GRADUATE = 50;

  // --------------------------------------------------------------------------
  // HELPER UTILITIES
  // --------------------------------------------------------------------------

  function getCurriculumById(curriculumId) {
    for (var i = 0; i < CURRICULA.length; i++) {
      if (CURRICULA[i].id === curriculumId) {
        return CURRICULA[i];
      }
    }
    return null;
  }

  function getCurricula() {
    return CURRICULA;
  }

  function _generateId(prefix, state) {
    var count = 0;
    if (state.mentorGuilds) count += state.mentorGuilds.length;
    if (state.cohorts)      count += state.cohorts.length;
    return prefix + '_' + Date.now() + '_' + count + '_' + Math.floor(Math.random() * 10000);
  }

  function _ensureState(state) {
    if (!state.mentorGuilds) state.mentorGuilds = [];
    if (!state.cohorts)      state.cohorts = [];
    if (!state.mentorStats)  state.mentorStats = {};
    if (!state.studentXP)    state.studentXP = {};
    return state;
  }

  function _findGuild(state, guildId) {
    for (var i = 0; i < state.mentorGuilds.length; i++) {
      if (state.mentorGuilds[i].id === guildId) return state.mentorGuilds[i];
    }
    return null;
  }

  function _findCohort(state, cohortId) {
    for (var i = 0; i < state.cohorts.length; i++) {
      if (state.cohorts[i].id === cohortId) return state.cohorts[i];
    }
    return null;
  }

  // Count modules the student has fully completed in a curriculum
  function _countModulesCompleted(state, studentId, curriculumId) {
    var curriculum = getCurriculumById(curriculumId);
    if (!curriculum) return 0;

    var completed = 0;
    for (var ci = 0; ci < state.cohorts.length; ci++) {
      var cohort = state.cohorts[ci];
      if (cohort.curriculumId !== curriculumId) continue;
      if (!cohort.progress[studentId]) continue;
      var prog = cohort.progress[studentId];
      // A module is complete when lessonsCompleted in that module == module.lessons
      // We track completion per module in prog.modulesCompleted (array of module indices)
      if (prog.modulesCompleted) {
        for (var mi = 0; mi < prog.modulesCompleted.length; mi++) {
          // Only count unique module indices
          if (prog.modulesCompleted.indexOf(prog.modulesCompleted[mi]) === mi) {
            completed++;
          }
        }
      }
    }
    return completed;
  }

  // --------------------------------------------------------------------------
  // createMentorGuild
  // --------------------------------------------------------------------------

  function createMentorGuild(state, founderId, name) {
    _ensureState(state);

    if (!founderId || typeof founderId !== 'string') {
      return { success: false, reason: 'Invalid founderId' };
    }
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return { success: false, reason: 'Guild name is required' };
    }

    // Check for duplicate name
    for (var i = 0; i < state.mentorGuilds.length; i++) {
      if (state.mentorGuilds[i].name.toLowerCase() === name.trim().toLowerCase()) {
        return { success: false, reason: 'Guild name already exists' };
      }
    }

    var guildId = 'mentor_guild_' + (state.mentorGuilds.length + 1) + '_' + Date.now();

    var guild = {
      id: guildId,
      name: name.trim(),
      founderId: founderId,
      mentors: [founderId],
      createdAt: Date.now(),
      cohortIds: []
    };

    state.mentorGuilds.push(guild);

    // Initialise mentor stats for founder
    if (!state.mentorStats[founderId]) {
      state.mentorStats[founderId] = {
        cohortsLed: 0,
        studentsGraduated: 0,
        totalRatings: 0,
        ratingCount: 0
      };
    }

    return { success: true, guild: guild };
  }

  // --------------------------------------------------------------------------
  // createCohort
  // --------------------------------------------------------------------------

  function createCohort(state, mentorId, guildId, curriculumId) {
    _ensureState(state);

    if (!mentorId || typeof mentorId !== 'string') {
      return { success: false, reason: 'Invalid mentorId' };
    }

    var guild = _findGuild(state, guildId);
    if (!guild) {
      return { success: false, reason: 'Guild not found' };
    }

    // Mentor must belong to the guild
    var isMentor = false;
    for (var i = 0; i < guild.mentors.length; i++) {
      if (guild.mentors[i] === mentorId) { isMentor = true; break; }
    }
    if (!isMentor) {
      return { success: false, reason: 'Mentor is not a member of this guild' };
    }

    var curriculum = getCurriculumById(curriculumId);
    if (!curriculum) {
      return { success: false, reason: 'Curriculum not found' };
    }

    var cohortId = 'cohort_' + (state.cohorts.length + 1) + '_' + Date.now();

    var cohort = {
      id: cohortId,
      curriculumId: curriculumId,
      mentorId: mentorId,
      guildId: guildId,
      students: [],
      maxStudents: MAX_COHORT_STUDENTS,
      status: 'recruiting',
      currentModule: 0,
      progress: {},
      startedAt: null,
      peerReviews: []
    };

    state.cohorts.push(cohort);
    guild.cohortIds.push(cohortId);

    // Init mentor stats
    if (!state.mentorStats[mentorId]) {
      state.mentorStats[mentorId] = {
        cohortsLed: 0,
        studentsGraduated: 0,
        totalRatings: 0,
        ratingCount: 0
      };
    }
    state.mentorStats[mentorId].cohortsLed++;

    return { success: true, cohort: cohort };
  }

  // --------------------------------------------------------------------------
  // joinCohort
  // --------------------------------------------------------------------------

  function joinCohort(state, studentId, cohortId) {
    _ensureState(state);

    if (!studentId || typeof studentId !== 'string') {
      return { success: false, reason: 'Invalid studentId' };
    }

    var cohort = _findCohort(state, cohortId);
    if (!cohort) {
      return { success: false, reason: 'Cohort not found' };
    }

    if (cohort.status !== 'recruiting') {
      return { success: false, reason: 'Cohort is not recruiting' };
    }

    if (cohort.students.length >= cohort.maxStudents) {
      return { success: false, reason: 'Cohort is full' };
    }

    // Already a member
    for (var i = 0; i < cohort.students.length; i++) {
      if (cohort.students[i] === studentId) {
        return { success: false, reason: 'Student already in cohort' };
      }
    }

    // Cannot be own mentor
    if (cohort.mentorId === studentId) {
      return { success: false, reason: 'Mentor cannot join their own cohort as student' };
    }

    cohort.students.push(studentId);
    cohort.progress[studentId] = {
      currentModule: 0,
      lessonsCompleted: 0,
      lessonsInModule: 0,
      totalXP: 0,
      modulesCompleted: []
    };

    // If cohort is now full, auto-activate
    if (cohort.students.length === cohort.maxStudents) {
      cohort.status = 'active';
      cohort.startedAt = Date.now();
    }

    return { success: true };
  }

  // --------------------------------------------------------------------------
  // leaveCohort
  // --------------------------------------------------------------------------

  function leaveCohort(state, studentId, cohortId) {
    _ensureState(state);

    var cohort = _findCohort(state, cohortId);
    if (!cohort) {
      return { success: false, reason: 'Cohort not found' };
    }

    var idx = -1;
    for (var i = 0; i < cohort.students.length; i++) {
      if (cohort.students[i] === studentId) { idx = i; break; }
    }
    if (idx === -1) {
      return { success: false, reason: 'Student not in cohort' };
    }

    cohort.students.splice(idx, 1);
    // Keep progress record but mark as left
    if (cohort.progress[studentId]) {
      cohort.progress[studentId].left = true;
    }

    // If cohort was active and now has no students, disband
    if (cohort.status === 'active' && cohort.students.length === 0) {
      cohort.status = 'disbanded';
    }

    return { success: true };
  }

  // --------------------------------------------------------------------------
  // completeLesson
  // --------------------------------------------------------------------------

  function completeLesson(state, studentId, cohortId, seed) {
    _ensureState(state);

    var cohort = _findCohort(state, cohortId);
    if (!cohort) {
      return { success: false, reason: 'Cohort not found' };
    }

    // Student must be in cohort and not have left
    var found = false;
    for (var i = 0; i < cohort.students.length; i++) {
      if (cohort.students[i] === studentId) { found = true; break; }
    }
    if (!found) {
      return { success: false, reason: 'Student not in cohort' };
    }

    if (cohort.status !== 'active' && cohort.status !== 'recruiting') {
      return { success: false, reason: 'Cohort is not active' };
    }

    var curriculum = getCurriculumById(cohort.curriculumId);
    if (!curriculum) {
      return { success: false, reason: 'Curriculum not found' };
    }

    var prog = cohort.progress[studentId];
    if (!prog) {
      return { success: false, reason: 'No progress record for student' };
    }

    var moduleIdx = cohort.currentModule;
    var module = curriculum.modules[moduleIdx];
    if (!module) {
      return { success: false, reason: 'No more modules' };
    }

    // Check if student already completed all lessons in this module
    if (prog.lessonsInModule >= module.lessons) {
      return { success: false, reason: 'All lessons in current module already completed' };
    }

    // Base XP for the lesson
    var baseXP = module.xpPerLesson;

    // Apply mentor rank bonus
    var mentorRankInfo = getMentorRank(state, cohort.mentorId);
    var bonusXP = Math.floor(baseXP * mentorRankInfo.xpBonus);
    var totalXP = baseXP + bonusXP;

    prog.lessonsCompleted++;
    prog.lessonsInModule++;
    prog.totalXP += totalXP;

    // Track in student global XP map
    if (!state.studentXP) state.studentXP = {};
    if (!state.studentXP[studentId]) state.studentXP[studentId] = {};
    if (!state.studentXP[studentId][cohort.curriculumId]) {
      state.studentXP[studentId][cohort.curriculumId] = 0;
    }
    state.studentXP[studentId][cohort.curriculumId] += totalXP;

    var moduleComplete = false;
    var certificationEarned = null;

    if (prog.lessonsInModule >= module.lessons) {
      moduleComplete = true;
      prog.modulesCompleted.push(moduleIdx);

      // Check for certification
      var cert = getCertification(state, studentId, cohort.curriculumId);
      if (cert.level) {
        certificationEarned = cert;
      }
    }

    return {
      success: true,
      xpAwarded: totalXP,
      moduleComplete: moduleComplete,
      certificationEarned: certificationEarned
    };
  }

  // --------------------------------------------------------------------------
  // advanceModule
  // --------------------------------------------------------------------------

  function advanceModule(state, cohortId, moduleIndex) {
    _ensureState(state);

    var cohort = _findCohort(state, cohortId);
    if (!cohort) {
      return { success: false, reason: 'Cohort not found' };
    }

    if (cohort.status !== 'active' && cohort.status !== 'recruiting') {
      return { success: false, reason: 'Cohort is not active' };
    }

    var curriculum = getCurriculumById(cohort.curriculumId);
    if (!curriculum) {
      return { success: false, reason: 'Curriculum not found' };
    }

    var targetModule = (typeof moduleIndex === 'number') ? moduleIndex : cohort.currentModule + 1;

    if (targetModule < 0 || targetModule >= curriculum.modules.length) {
      return { success: false, reason: 'Invalid module index' };
    }

    if (targetModule <= cohort.currentModule) {
      return { success: false, reason: 'Cannot go back to a previous module' };
    }

    cohort.currentModule = targetModule;

    // Reset per-module lesson counter for all students
    for (var i = 0; i < cohort.students.length; i++) {
      var sId = cohort.students[i];
      if (cohort.progress[sId]) {
        cohort.progress[sId].lessonsInModule = 0;
        cohort.progress[sId].currentModule = targetModule;
      }
    }

    // Mark cohort active if it was recruiting
    if (cohort.status === 'recruiting') {
      cohort.status = 'active';
      cohort.startedAt = cohort.startedAt || Date.now();
    }

    return { success: true, newModule: targetModule };
  }

  // --------------------------------------------------------------------------
  // submitPeerReview
  // --------------------------------------------------------------------------

  function submitPeerReview(state, reviewerId, cohortId, targetId, rating, feedback) {
    _ensureState(state);

    var cohort = _findCohort(state, cohortId);
    if (!cohort) {
      return { success: false, reason: 'Cohort not found' };
    }

    // Reviewer must be in cohort (or be the mentor)
    var reviewerInCohort = (cohort.mentorId === reviewerId);
    for (var i = 0; i < cohort.students.length; i++) {
      if (cohort.students[i] === reviewerId) { reviewerInCohort = true; break; }
    }
    if (!reviewerInCohort) {
      return { success: false, reason: 'Reviewer not in cohort' };
    }

    // Target must be in cohort
    var targetInCohort = false;
    for (var j = 0; j < cohort.students.length; j++) {
      if (cohort.students[j] === targetId) { targetInCohort = true; break; }
    }
    if (!targetInCohort) {
      return { success: false, reason: 'Target student not in cohort' };
    }

    // Cannot review self
    if (reviewerId === targetId) {
      return { success: false, reason: 'Cannot review yourself' };
    }

    // Validate rating
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return { success: false, reason: 'Rating must be between 1 and 5' };
    }

    var review = {
      reviewerId: reviewerId,
      targetId: targetId,
      rating: rating,
      feedback: feedback || '',
      timestamp: Date.now()
    };

    cohort.peerReviews.push(review);

    return { success: true, review: review };
  }

  // --------------------------------------------------------------------------
  // getPeerReviews
  // --------------------------------------------------------------------------

  function getPeerReviews(state, cohortId, studentId) {
    _ensureState(state);

    var cohort = _findCohort(state, cohortId);
    if (!cohort) return [];

    var reviews = [];
    for (var i = 0; i < cohort.peerReviews.length; i++) {
      if (cohort.peerReviews[i].targetId === studentId) {
        reviews.push(cohort.peerReviews[i]);
      }
    }
    return reviews;
  }

  // --------------------------------------------------------------------------
  // getCertification
  // --------------------------------------------------------------------------

  function getCertification(state, studentId, curriculumId) {
    _ensureState(state);

    var curriculum = getCurriculumById(curriculumId);
    if (!curriculum) {
      return { level: null, title: null, modulesCompleted: 0 };
    }

    // Count how many unique modules the student completed across all cohorts for this curriculum
    var completedSet = {};
    for (var ci = 0; ci < state.cohorts.length; ci++) {
      var cohort = state.cohorts[ci];
      if (cohort.curriculumId !== curriculumId) continue;
      var prog = cohort.progress[studentId];
      if (!prog || !prog.modulesCompleted) continue;
      for (var mi = 0; mi < prog.modulesCompleted.length; mi++) {
        completedSet[prog.modulesCompleted[mi]] = true;
      }
    }

    var modulesCompleted = Object.keys(completedSet).length;

    var level = null;
    var title = null;

    if (modulesCompleted >= curriculum.certifications.gold.modulesRequired) {
      level = 'gold';
      title = curriculum.certifications.gold.title;
    } else if (modulesCompleted >= curriculum.certifications.silver.modulesRequired) {
      level = 'silver';
      title = curriculum.certifications.silver.title;
    } else if (modulesCompleted >= curriculum.certifications.bronze.modulesRequired) {
      level = 'bronze';
      title = curriculum.certifications.bronze.title;
    }

    return { level: level, title: title, modulesCompleted: modulesCompleted };
  }

  // --------------------------------------------------------------------------
  // getMentorRank
  // --------------------------------------------------------------------------

  function getMentorRank(state, mentorId) {
    _ensureState(state);

    var stats = (state.mentorStats && state.mentorStats[mentorId]) || {
      cohortsLed: 0,
      studentsGraduated: 0
    };

    var graduated = stats.studentsGraduated || 0;

    var rankDef = MENTOR_RANKS[0];
    for (var i = MENTOR_RANKS.length - 1; i >= 0; i--) {
      if (graduated >= MENTOR_RANKS[i].studentsGraduated) {
        rankDef = MENTOR_RANKS[i];
        break;
      }
    }

    return {
      rank: rankDef.rank,
      title: rankDef.title,
      xpBonus: rankDef.xpBonus,
      studentsGraduated: graduated
    };
  }

  // --------------------------------------------------------------------------
  // getCohortProgress
  // --------------------------------------------------------------------------

  function getCohortProgress(state, cohortId) {
    _ensureState(state);

    var cohort = _findCohort(state, cohortId);
    if (!cohort) return null;

    var curriculum = getCurriculumById(cohort.curriculumId);
    var result = {
      cohortId: cohortId,
      status: cohort.status,
      currentModule: cohort.currentModule,
      students: []
    };

    for (var i = 0; i < cohort.students.length; i++) {
      var sId = cohort.students[i];
      var prog = cohort.progress[sId] || { currentModule: 0, lessonsCompleted: 0, totalXP: 0, modulesCompleted: [] };
      result.students.push({
        studentId: sId,
        currentModule: prog.currentModule || 0,
        lessonsCompleted: prog.lessonsCompleted || 0,
        totalXP: prog.totalXP || 0,
        modulesCompleted: prog.modulesCompleted ? prog.modulesCompleted.length : 0
      });
    }

    return result;
  }

  // --------------------------------------------------------------------------
  // getCohort
  // --------------------------------------------------------------------------

  function getCohort(state, cohortId) {
    _ensureState(state);
    return _findCohort(state, cohortId) || null;
  }

  // --------------------------------------------------------------------------
  // getMentorGuilds
  // --------------------------------------------------------------------------

  function getMentorGuilds(state) {
    _ensureState(state);
    return state.mentorGuilds.slice();
  }

  // --------------------------------------------------------------------------
  // getStudentHistory
  // --------------------------------------------------------------------------

  function getStudentHistory(state, studentId) {
    _ensureState(state);

    var history = [];
    for (var i = 0; i < state.cohorts.length; i++) {
      var cohort = state.cohorts[i];
      if (!cohort.progress[studentId]) continue;

      var prog = cohort.progress[studentId];
      history.push({
        cohortId: cohort.id,
        curriculumId: cohort.curriculumId,
        guildId: cohort.guildId,
        mentorId: cohort.mentorId,
        status: cohort.status,
        lessonsCompleted: prog.lessonsCompleted || 0,
        totalXP: prog.totalXP || 0,
        modulesCompleted: prog.modulesCompleted ? prog.modulesCompleted.length : 0,
        left: prog.left || false
      });
    }

    return history;
  }

  // --------------------------------------------------------------------------
  // graduateCohort
  // --------------------------------------------------------------------------

  function graduateCohort(state, cohortId) {
    _ensureState(state);

    var cohort = _findCohort(state, cohortId);
    if (!cohort) {
      return { success: false, reason: 'Cohort not found' };
    }

    if (cohort.status === 'completed') {
      return { success: false, reason: 'Cohort already graduated' };
    }

    var curriculum = getCurriculumById(cohort.curriculumId);
    if (!curriculum) {
      return { success: false, reason: 'Curriculum not found' };
    }

    var graduates = [];
    var totalGraduated = 0;

    for (var i = 0; i < cohort.students.length; i++) {
      var sId = cohort.students[i];
      var prog = cohort.progress[sId];
      if (!prog) continue;

      var cert = getCertification(state, sId, cohort.curriculumId);

      graduates.push({
        studentId: sId,
        certification: cert.level,
        certificationTitle: cert.title,
        xpTotal: prog.totalXP || 0,
        modulesCompleted: cert.modulesCompleted
      });

      if (cert.level) {
        totalGraduated++;
      }
    }

    cohort.status = 'completed';

    // Update mentor stats
    if (!state.mentorStats[cohort.mentorId]) {
      state.mentorStats[cohort.mentorId] = {
        cohortsLed: 0,
        studentsGraduated: 0,
        totalRatings: 0,
        ratingCount: 0
      };
    }
    state.mentorStats[cohort.mentorId].studentsGraduated += totalGraduated;

    var mentorXP = totalGraduated * MENTOR_XP_PER_GRADUATE;

    return {
      success: true,
      graduates: graduates,
      mentorXP: mentorXP
    };
  }

  // --------------------------------------------------------------------------
  // getLeaderboard
  // --------------------------------------------------------------------------

  function getLeaderboard(state, curriculumId, count) {
    _ensureState(state);

    var limit = (typeof count === 'number') ? count : 10;
    var scores = {};

    for (var ci = 0; ci < state.cohorts.length; ci++) {
      var cohort = state.cohorts[ci];
      if (cohort.curriculumId !== curriculumId) continue;

      for (var sId in cohort.progress) {
        if (!cohort.progress.hasOwnProperty(sId)) continue;
        var prog = cohort.progress[sId];
        if (!scores[sId]) scores[sId] = 0;
        scores[sId] += (prog.totalXP || 0);
      }
    }

    var entries = [];
    for (var id in scores) {
      if (scores.hasOwnProperty(id)) {
        entries.push({ studentId: id, totalXP: scores[id] });
      }
    }

    entries.sort(function(a, b) { return b.totalXP - a.totalXP; });

    return entries.slice(0, limit);
  }

  // --------------------------------------------------------------------------
  // getMentorStats
  // --------------------------------------------------------------------------

  function getMentorStats(state, mentorId) {
    _ensureState(state);

    var stats = (state.mentorStats && state.mentorStats[mentorId]) || {
      cohortsLed: 0,
      studentsGraduated: 0,
      totalRatings: 0,
      ratingCount: 0
    };

    var totalRatings = 0;
    var ratingCount = 0;

    // Pull ratings from peer reviews where mentor is reviewed
    for (var ci = 0; ci < state.cohorts.length; ci++) {
      var cohort = state.cohorts[ci];
      if (cohort.mentorId !== mentorId) continue;
      for (var ri = 0; ri < cohort.peerReviews.length; ri++) {
        var rev = cohort.peerReviews[ri];
        if (rev.targetId === mentorId) {
          totalRatings += rev.rating;
          ratingCount++;
        }
      }
    }

    var avgRating = ratingCount > 0 ? totalRatings / ratingCount : 0;
    var rank = getMentorRank(state, mentorId);

    return {
      mentorId: mentorId,
      cohortsLed: stats.cohortsLed || 0,
      studentsGraduated: stats.studentsGraduated || 0,
      avgRating: avgRating,
      rank: rank.rank,
      title: rank.title,
      xpBonus: rank.xpBonus
    };
  }

  // --------------------------------------------------------------------------
  // getActiveCohorts
  // --------------------------------------------------------------------------

  function getActiveCohorts(state, guildId) {
    _ensureState(state);

    var active = [];
    for (var i = 0; i < state.cohorts.length; i++) {
      var cohort = state.cohorts[i];
      if (cohort.guildId !== guildId) continue;
      if (cohort.status === 'active' || cohort.status === 'recruiting') {
        active.push(cohort);
      }
    }
    return active;
  }

  // --------------------------------------------------------------------------
  // EXPORTS
  // --------------------------------------------------------------------------

  exports.CURRICULA             = CURRICULA;
  exports.MENTOR_RANKS          = MENTOR_RANKS;
  exports.MAX_COHORT_STUDENTS   = MAX_COHORT_STUDENTS;

  exports.getCurricula          = getCurricula;
  exports.getCurriculumById     = getCurriculumById;

  exports.createMentorGuild     = createMentorGuild;
  exports.createCohort          = createCohort;
  exports.joinCohort            = joinCohort;
  exports.leaveCohort           = leaveCohort;
  exports.completeLesson        = completeLesson;
  exports.advanceModule         = advanceModule;
  exports.submitPeerReview      = submitPeerReview;
  exports.getPeerReviews        = getPeerReviews;
  exports.getCertification      = getCertification;
  exports.getMentorRank         = getMentorRank;
  exports.getCohortProgress     = getCohortProgress;
  exports.getCohort             = getCohort;
  exports.getMentorGuilds       = getMentorGuilds;
  exports.getStudentHistory     = getStudentHistory;
  exports.graduateCohort        = graduateCohort;
  exports.getLeaderboard        = getLeaderboard;
  exports.getMentorStats        = getMentorStats;
  exports.getActiveCohorts      = getActiveCohorts;

})(typeof module !== 'undefined' ? module.exports : (window.MentorGuilds = {}));
