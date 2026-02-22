// apprenticeship.js
/**
 * ZION Apprenticeship & Teaching System
 * Players mentor NPC citizens; AI agents learn from player behavior.
 */

(function(exports) {
  'use strict';

  // ============================================================================
  // TEACHING TOPICS
  // ============================================================================

  var TOPICS = {
    farming: {
      name: 'Farming',
      zone: 'gardens',
      xpReward: 30,
      sparkReward: 15,
      desc: 'Teach crop rotation and plant care'
    },
    cooking: {
      name: 'Cooking',
      zone: 'commons',
      xpReward: 25,
      sparkReward: 12,
      desc: 'Share recipes and preparation methods'
    },
    smithing: {
      name: 'Smithing',
      zone: 'studio',
      xpReward: 35,
      sparkReward: 18,
      desc: 'Demonstrate metalworking techniques'
    },
    trading: {
      name: 'Trading',
      zone: 'agora',
      xpReward: 30,
      sparkReward: 20,
      desc: 'Teach negotiation and market analysis'
    },
    navigation: {
      name: 'Navigation',
      zone: 'wilds',
      xpReward: 28,
      sparkReward: 14,
      desc: 'Guide through terrain reading and pathfinding'
    },
    history: {
      name: 'History',
      zone: 'athenaeum',
      xpReward: 25,
      sparkReward: 12,
      desc: 'Share knowledge of ZION lore and origins'
    },
    combat: {
      name: 'Combat',
      zone: 'arena',
      xpReward: 32,
      sparkReward: 16,
      desc: 'Train fighting stances and defense'
    },
    music: {
      name: 'Music',
      zone: 'studio',
      xpReward: 22,
      sparkReward: 11,
      desc: 'Teach melody, rhythm, and harmony'
    },
    healing: {
      name: 'Healing',
      zone: 'gardens',
      xpReward: 28,
      sparkReward: 15,
      desc: 'Demonstrate herbal remedies and first aid'
    },
    building: {
      name: 'Building',
      zone: 'commons',
      xpReward: 30,
      sparkReward: 14,
      desc: 'Teach structural design and construction'
    },
    fishing: {
      name: 'Fishing',
      zone: 'wilds',
      xpReward: 20,
      sparkReward: 10,
      desc: 'Share fishing techniques and bait knowledge'
    },
    stargazing: {
      name: 'Stargazing',
      zone: 'nexus',
      xpReward: 25,
      sparkReward: 12,
      desc: 'Identify constellations and celestial events'
    }
  };

  // ============================================================================
  // NPC ARCHETYPE → TEACHABLE TOPICS
  // ============================================================================

  var ARCHETYPE_TOPICS = {
    gardener:    ['farming', 'healing', 'fishing'],
    builder:     ['building', 'smithing', 'navigation'],
    storyteller: ['history', 'music', 'stargazing'],
    merchant:    ['trading', 'cooking', 'history'],
    explorer:    ['navigation', 'fishing', 'stargazing'],
    teacher:     ['history', 'stargazing', 'healing'],
    musician:    ['music', 'history', 'cooking'],
    healer:      ['healing', 'farming', 'cooking'],
    philosopher: ['history', 'stargazing', 'navigation'],
    artist:      ['music', 'smithing', 'building']
  };

  // ============================================================================
  // LESSON STEPS
  // ============================================================================

  var LESSON_STEPS = {
    farming: [
      { index: 0, phase: 'introduce', instruction: 'Show the student how to prepare soil', action: 'gather_herb', description: 'Gather 3 plants to demonstrate crop variety' },
      { index: 1, phase: 'practice',  instruction: 'Guide the student through planting seeds', action: 'plant_seed', description: 'Plant seeds in the correct pattern' },
      { index: 2, phase: 'master',    instruction: 'Demonstrate crop rotation strategy', action: 'answer_question', description: 'Answer: which crops restore soil nutrients?' }
    ],
    cooking: [
      { index: 0, phase: 'introduce', instruction: 'Introduce basic ingredients and their uses', action: 'gather_herb', description: 'Gather 2 cooking herbs' },
      { index: 1, phase: 'practice',  instruction: 'Walk through a recipe step by step', action: 'craft_tool', description: 'Prepare a simple dish together' },
      { index: 2, phase: 'master',    instruction: 'Teach flavor balancing techniques', action: 'answer_question', description: 'Answer: what balances a salty dish?' }
    ],
    smithing: [
      { index: 0, phase: 'introduce', instruction: 'Explain the properties of different metals', action: 'gather_ore', description: 'Gather 2 ore samples to compare' },
      { index: 1, phase: 'practice',  instruction: 'Demonstrate hammer technique at the forge', action: 'craft_tool', description: 'Forge a simple iron item together' },
      { index: 2, phase: 'master',    instruction: 'Show the secret of proper tempering', action: 'answer_question', description: 'Answer: at what temperature does iron become workable?' }
    ],
    trading: [
      { index: 0, phase: 'introduce', instruction: 'Explain the value of goods in each zone', action: 'answer_question', description: 'Answer: which zone values crafted items most?' },
      { index: 1, phase: 'practice',  instruction: 'Role-play a negotiation scenario', action: 'negotiate', description: 'Complete a mock trade negotiation' },
      { index: 2, phase: 'master',    instruction: 'Analyze market supply and demand', action: 'answer_question', description: 'Answer: when is the best time to sell rare goods?' }
    ],
    navigation: [
      { index: 0, phase: 'introduce', instruction: 'Point out landmarks in the current zone', action: 'observe_landmark', description: 'Identify 2 notable landmarks nearby' },
      { index: 1, phase: 'practice',  instruction: 'Walk a planned route through the wilds', action: 'follow_path', description: 'Navigate from one waypoint to another' },
      { index: 2, phase: 'master',    instruction: 'Read terrain elevation for pathfinding', action: 'answer_question', description: 'Answer: how do you find the safest mountain pass?' }
    ],
    history: [
      { index: 0, phase: 'introduce', instruction: 'Recount the founding of ZION', action: 'answer_question', description: 'Answer: who first settled the Nexus?' },
      { index: 1, phase: 'practice',  instruction: 'Discuss the formation of the zones', action: 'answer_question', description: 'Answer: which zone was established last?' },
      { index: 2, phase: 'master',    instruction: 'Tell the story of the Great Council', action: 'tell_story', description: 'Narrate a historical event to the student' }
    ],
    combat: [
      { index: 0, phase: 'introduce', instruction: 'Demonstrate basic defensive stances', action: 'perform_stance', description: 'Show 3 defensive positions' },
      { index: 1, phase: 'practice',  instruction: 'Spar lightly to test reaction time', action: 'spar', description: 'Complete a light sparring round' },
      { index: 2, phase: 'master',    instruction: 'Teach counter-attack timing', action: 'answer_question', description: 'Answer: when is the optimal moment to counter-strike?' }
    ],
    music: [
      { index: 0, phase: 'introduce', instruction: 'Explain the fundamentals of rhythm', action: 'clap_rhythm', description: 'Clap out a basic rhythm pattern' },
      { index: 1, phase: 'practice',  instruction: 'Teach a simple melody together', action: 'play_melody', description: 'Play a 4-note melody sequence' },
      { index: 2, phase: 'master',    instruction: 'Combine melody and harmony', action: 'answer_question', description: 'Answer: what interval creates a harmonious chord?' }
    ],
    healing: [
      { index: 0, phase: 'introduce', instruction: 'Identify common medicinal plants', action: 'gather_herb', description: 'Gather 3 healing herbs' },
      { index: 1, phase: 'practice',  instruction: 'Prepare a basic herbal remedy', action: 'craft_tool', description: 'Mix a simple poultice' },
      { index: 2, phase: 'master',    instruction: 'Diagnose ailments by symptoms', action: 'answer_question', description: 'Answer: what herb treats fever?' }
    ],
    building: [
      { index: 0, phase: 'introduce', instruction: 'Explain load-bearing principles', action: 'answer_question', description: 'Answer: which shape is the strongest foundation?' },
      { index: 1, phase: 'practice',  instruction: 'Lay a foundation together', action: 'craft_tool', description: 'Place 4 foundation stones correctly' },
      { index: 2, phase: 'master',    instruction: 'Design a room with proper proportions', action: 'answer_question', description: 'Answer: what ratio gives ideal room proportions?' }
    ],
    fishing: [
      { index: 0, phase: 'introduce', instruction: 'Explain bait selection for different fish', action: 'gather_herb', description: 'Gather 2 types of bait' },
      { index: 1, phase: 'practice',  instruction: 'Cast and retrieve a fishing line', action: 'cast_line', description: 'Successfully cast and reel in once' },
      { index: 2, phase: 'master',    instruction: 'Identify the best fishing spots', action: 'answer_question', description: 'Answer: what water depth holds the biggest fish?' }
    ],
    stargazing: [
      { index: 0, phase: 'introduce', instruction: 'Point out the main constellations', action: 'observe_landmark', description: 'Identify 3 constellations overhead' },
      { index: 1, phase: 'practice',  instruction: 'Track a moving celestial body', action: 'follow_path', description: 'Follow a planet across the sky' },
      { index: 2, phase: 'master',    instruction: 'Predict weather using star patterns', action: 'answer_question', description: 'Answer: which star cluster signals incoming rain?' }
    ]
  };

  // ============================================================================
  // SKILL LEVELS
  // ============================================================================

  var SKILL_LEVEL_NAMES = ['Untrained', 'Novice', 'Practiced', 'Skilled', 'Expert', 'Master'];

  // ============================================================================
  // TEACHER RANKS
  // ============================================================================

  var TEACHER_RANKS = [
    { min: 0,   max: 49,  rank: 'Tutor' },
    { min: 50,  max: 149, rank: 'Instructor' },
    { min: 150, max: 299, rank: 'Professor' },
    { min: 300, max: Infinity, rank: 'Grand Teacher' }
  ];

  // ============================================================================
  // ID COUNTER
  // ============================================================================

  var lessonIdCounter = 0;

  // ============================================================================
  // STATE FACTORY
  // ============================================================================

  function createApprenticeshipState() {
    return {
      mentorships: {},       // lessonId -> lesson object
      npcSkills: {},         // npcId -> { topic: skillLevel }
      lessonHistory: [],     // completed lesson records
      playerTeachingXP: {}   // playerId -> total teaching XP
    };
  }

  // ============================================================================
  // LESSON STEPS HELPER
  // ============================================================================

  function getLessonSteps(topic) {
    if (!TOPICS[topic]) {
      return null;
    }
    return LESSON_STEPS[topic] || null;
  }

  // ============================================================================
  // SKILL HELPERS
  // ============================================================================

  function getNPCSkill(state, npcId, topic) {
    if (!state || !state.npcSkills) return 0;
    if (!state.npcSkills[npcId]) return 0;
    var level = state.npcSkills[npcId][topic];
    return (typeof level === 'number') ? level : 0;
  }

  function getNPCSkillName(level) {
    if (typeof level !== 'number' || level < 0) return SKILL_LEVEL_NAMES[0];
    if (level >= SKILL_LEVEL_NAMES.length) return SKILL_LEVEL_NAMES[SKILL_LEVEL_NAMES.length - 1];
    return SKILL_LEVEL_NAMES[Math.floor(level)] || SKILL_LEVEL_NAMES[0];
  }

  // ============================================================================
  // ARCHETYPE HELPER
  // ============================================================================

  function getTeachableTopics(npcArchetype) {
    if (!npcArchetype) return [];
    var topics = ARCHETYPE_TOPICS[npcArchetype];
    if (!topics) return [];
    return topics.slice();
  }

  // ============================================================================
  // TEACHER RANK HELPER
  // ============================================================================

  function getTeacherRank(teachingXP) {
    var xp = typeof teachingXP === 'number' ? teachingXP : 0;
    for (var i = 0; i < TEACHER_RANKS.length; i++) {
      var bracket = TEACHER_RANKS[i];
      if (xp >= bracket.min && xp <= bracket.max) {
        return bracket.rank;
      }
    }
    return 'Tutor';
  }

  // ============================================================================
  // PLAYER STATS
  // ============================================================================

  function getPlayerTeachingStats(state, playerId) {
    if (!state || !playerId) {
      return { totalLessons: 0, topicsTaught: [], studentsTaught: [], teachingXP: 0, teacherRank: 'Tutor' };
    }

    var history = state.lessonHistory || [];
    var teachingXP = (state.playerTeachingXP && state.playerTeachingXP[playerId]) || 0;

    var totalLessons = 0;
    var topicsSet = {};
    var studentsSet = {};

    for (var i = 0; i < history.length; i++) {
      var record = history[i];
      if (record.teacherId === playerId) {
        totalLessons++;
        if (record.topic) topicsSet[record.topic] = true;
        if (record.npcId) studentsSet[record.npcId] = true;
      }
    }

    return {
      totalLessons: totalLessons,
      topicsTaught: Object.keys(topicsSet),
      studentsTaught: Object.keys(studentsSet),
      teachingXP: teachingXP,
      teacherRank: getTeacherRank(teachingXP)
    };
  }

  // ============================================================================
  // ACTIVE LESSONS
  // ============================================================================

  function getActiveLessons(state, playerId) {
    if (!state || !state.mentorships) return [];
    var active = [];
    var ids = Object.keys(state.mentorships);
    for (var i = 0; i < ids.length; i++) {
      var lesson = state.mentorships[ids[i]];
      if (lesson && lesson.teacherId === playerId && !lesson.completed) {
        active.push(lesson);
      }
    }
    return active;
  }

  // ============================================================================
  // NPC STUDENTS
  // ============================================================================

  function getNPCStudents(state, playerId) {
    if (!state || !state.lessonHistory) return [];
    var seen = {};
    var students = [];
    for (var i = 0; i < state.lessonHistory.length; i++) {
      var record = state.lessonHistory[i];
      if (record.teacherId === playerId && record.npcId && !seen[record.npcId]) {
        seen[record.npcId] = true;
        students.push(record.npcId);
      }
    }
    return students;
  }

  // ============================================================================
  // START LESSON
  // ============================================================================

  function startLesson(state, playerId, npcId, topic) {
    if (!state) {
      return { state: state, lesson: null, message: 'Invalid state' };
    }

    // Validate topic
    if (!topic || !TOPICS[topic]) {
      return { state: state, lesson: null, message: 'Unknown teaching topic: ' + topic };
    }

    // Validate players
    if (!playerId) {
      return { state: state, lesson: null, message: 'Invalid player ID' };
    }
    if (!npcId) {
      return { state: state, lesson: null, message: 'Invalid NPC ID' };
    }

    // Check NPC is not already in an active lesson with this player
    var activeLessons = getActiveLessons(state, playerId);
    for (var i = 0; i < activeLessons.length; i++) {
      if (activeLessons[i].npcId === npcId) {
        return {
          state: state,
          lesson: null,
          message: 'This NPC is already in an active lesson with you'
        };
      }
    }

    var steps = getLessonSteps(topic);
    if (!steps) {
      return { state: state, lesson: null, message: 'No lesson steps defined for topic: ' + topic };
    }

    lessonIdCounter++;
    var lessonId = 'lesson_' + lessonIdCounter + '_' + Date.now();

    var lesson = {
      id: lessonId,
      topic: topic,
      npcId: npcId,
      teacherId: playerId,
      step: 0,
      steps: steps,
      startedAt: Date.now(),
      completed: false,
      abandoned: false
    };

    var newState = _copyState(state);
    newState.mentorships[lessonId] = lesson;

    var topicData = TOPICS[topic];
    return {
      state: newState,
      lesson: lesson,
      message: 'Lesson started: ' + topicData.name + '. Step 1 of 3 — ' + steps[0].instruction
    };
  }

  // ============================================================================
  // ADVANCE LESSON
  // ============================================================================

  function advanceLesson(state, lessonId, action) {
    if (!state || !state.mentorships) {
      return { state: state, step: null, completed: false, reward: null, message: 'Invalid state' };
    }

    var lesson = state.mentorships[lessonId];
    if (!lesson) {
      return { state: state, step: null, completed: false, reward: null, message: 'Lesson not found: ' + lessonId };
    }

    if (lesson.completed) {
      return { state: state, step: null, completed: true, reward: null, message: 'Lesson is already completed' };
    }

    if (lesson.abandoned) {
      return { state: state, step: null, completed: false, reward: null, message: 'Lesson has been abandoned' };
    }

    var currentStep = lesson.steps[lesson.step];
    if (!currentStep) {
      return { state: state, step: null, completed: false, reward: null, message: 'No more steps' };
    }

    // Check action matches expected
    var actionValid = (action && action === currentStep.action);

    var newState = _copyState(state);
    var updatedLesson = _copyLesson(newState.mentorships[lessonId]);
    newState.mentorships[lessonId] = updatedLesson;

    if (!actionValid) {
      return {
        state: newState,
        step: currentStep,
        completed: false,
        reward: null,
        message: 'Incorrect action. Expected: ' + currentStep.action + ', got: ' + (action || 'nothing') + '. Try again: ' + currentStep.description
      };
    }

    // Advance step
    updatedLesson.step++;

    var isCompleted = (updatedLesson.step >= updatedLesson.steps.length);

    if (isCompleted) {
      // Mark ready for completion
      updatedLesson.readyToComplete = true;
    }

    var nextStep = isCompleted ? null : updatedLesson.steps[updatedLesson.step];
    var message = isCompleted
      ? 'All steps done! Call completeLesson to finalize and award rewards.'
      : 'Step ' + (updatedLesson.step) + ' complete. Next: ' + nextStep.instruction;

    return {
      state: newState,
      step: nextStep,
      completed: isCompleted,
      reward: null,
      message: message
    };
  }

  // ============================================================================
  // COMPLETE LESSON
  // ============================================================================

  function completeLesson(state, lessonId) {
    if (!state || !state.mentorships) {
      return { state: state, playerReward: null, npcSkillGain: null, message: 'Invalid state' };
    }

    var lesson = state.mentorships[lessonId];
    if (!lesson) {
      return { state: state, playerReward: null, npcSkillGain: null, message: 'Lesson not found: ' + lessonId };
    }

    if (lesson.completed) {
      return { state: state, playerReward: null, npcSkillGain: null, message: 'Lesson already completed' };
    }

    if (!lesson.readyToComplete) {
      return { state: state, playerReward: null, npcSkillGain: null, message: 'Lesson not yet finished. Complete all steps first.' };
    }

    var topicData = TOPICS[lesson.topic];
    if (!topicData) {
      return { state: state, playerReward: null, npcSkillGain: null, message: 'Invalid topic in lesson' };
    }

    var newState = _copyState(state);
    var updatedLesson = _copyLesson(newState.mentorships[lessonId]);
    updatedLesson.completed = true;
    updatedLesson.completedAt = Date.now();
    newState.mentorships[lessonId] = updatedLesson;

    // NPC skill gain
    if (!newState.npcSkills[lesson.npcId]) {
      newState.npcSkills[lesson.npcId] = {};
    }
    var currentSkill = newState.npcSkills[lesson.npcId][lesson.topic] || 0;
    var maxSkill = SKILL_LEVEL_NAMES.length - 1;
    var newSkillLevel = Math.min(currentSkill + 1, maxSkill);
    newState.npcSkills[lesson.npcId][lesson.topic] = newSkillLevel;

    // Player teaching XP
    if (!newState.playerTeachingXP) {
      newState.playerTeachingXP = {};
    }
    var currentXP = newState.playerTeachingXP[lesson.teacherId] || 0;
    newState.playerTeachingXP[lesson.teacherId] = currentXP + topicData.xpReward;

    // Record in lesson history
    var historyRecord = {
      lessonId: lessonId,
      teacherId: lesson.teacherId,
      npcId: lesson.npcId,
      topic: lesson.topic,
      completedAt: updatedLesson.completedAt,
      xpAwarded: topicData.xpReward,
      sparkAwarded: topicData.sparkReward,
      npcSkillBefore: currentSkill,
      npcSkillAfter: newSkillLevel
    };
    newState.lessonHistory.push(historyRecord);

    var playerReward = {
      xp: topicData.xpReward,
      spark: topicData.sparkReward,
      teacherRank: getTeacherRank(newState.playerTeachingXP[lesson.teacherId])
    };

    var npcSkillGain = {
      npcId: lesson.npcId,
      topic: lesson.topic,
      before: currentSkill,
      after: newSkillLevel,
      skillName: getNPCSkillName(newSkillLevel)
    };

    var message = 'Lesson complete! ' + lesson.npcId + ' has become ' +
      getNPCSkillName(newSkillLevel) + ' in ' + topicData.name +
      '. You earned ' + topicData.xpReward + ' XP and ' + topicData.sparkReward + ' Spark.';

    return {
      state: newState,
      playerReward: playerReward,
      npcSkillGain: npcSkillGain,
      message: message
    };
  }

  // ============================================================================
  // FORMAT HELPERS
  // ============================================================================

  function formatLessonCard(lesson) {
    if (!lesson) return '<div class="lesson-card lesson-card--empty">No lesson</div>';

    var topic = TOPICS[lesson.topic];
    var topicName = topic ? topic.name : lesson.topic;
    var stepNum = lesson.step || 0;
    var totalSteps = lesson.steps ? lesson.steps.length : 3;
    var progress = Math.min(stepNum, totalSteps);
    var pct = Math.round((progress / totalSteps) * 100);

    var currentStep = (lesson.steps && lesson.steps[stepNum]) || null;
    var stepHtml = currentStep
      ? '<p class="lesson-card__step">' + _escapeHtml(currentStep.instruction) + '</p>'
      : '<p class="lesson-card__step lesson-card__step--done">All steps complete!</p>';

    var statusClass = lesson.completed ? 'lesson-card--completed' : 'lesson-card--active';

    return '<div class="lesson-card ' + statusClass + '">' +
      '<div class="lesson-card__header">' +
      '<span class="lesson-card__topic">' + _escapeHtml(topicName) + '</span>' +
      '<span class="lesson-card__student">Student: ' + _escapeHtml(lesson.npcId) + '</span>' +
      '</div>' +
      '<div class="lesson-card__progress">' +
      '<div class="lesson-card__progress-bar" style="width:' + pct + '%"></div>' +
      '</div>' +
      '<p class="lesson-card__steps">Step ' + progress + ' / ' + totalSteps + '</p>' +
      stepHtml +
      '</div>';
  }

  function formatTeacherProfile(stats) {
    if (!stats) return '<div class="teacher-profile teacher-profile--empty">No data</div>';

    var topicsHtml = '';
    if (stats.topicsTaught && stats.topicsTaught.length > 0) {
      topicsHtml = '<ul class="teacher-profile__topics">';
      for (var i = 0; i < stats.topicsTaught.length; i++) {
        var t = TOPICS[stats.topicsTaught[i]];
        topicsHtml += '<li>' + _escapeHtml(t ? t.name : stats.topicsTaught[i]) + '</li>';
      }
      topicsHtml += '</ul>';
    } else {
      topicsHtml = '<p class="teacher-profile__none">No topics taught yet</p>';
    }

    return '<div class="teacher-profile">' +
      '<div class="teacher-profile__rank">' + _escapeHtml(stats.teacherRank) + '</div>' +
      '<div class="teacher-profile__stats">' +
      '<span class="teacher-profile__xp">Teaching XP: ' + (stats.teachingXP || 0) + '</span>' +
      '<span class="teacher-profile__lessons">Lessons: ' + (stats.totalLessons || 0) + '</span>' +
      '<span class="teacher-profile__students">Students: ' + (stats.studentsTaught ? stats.studentsTaught.length : 0) + '</span>' +
      '</div>' +
      '<div class="teacher-profile__topics-section"><strong>Topics Taught:</strong>' + topicsHtml + '</div>' +
      '</div>';
  }

  function formatNPCSkillCard(npcId, skills) {
    if (!npcId) return '<div class="npc-skill-card npc-skill-card--empty">No NPC</div>';

    var skillsObj = skills || {};
    var topicKeys = Object.keys(skillsObj);

    var skillsHtml = '';
    if (topicKeys.length > 0) {
      skillsHtml = '<ul class="npc-skill-card__list">';
      for (var i = 0; i < topicKeys.length; i++) {
        var topicKey = topicKeys[i];
        var level = skillsObj[topicKey] || 0;
        var topicData = TOPICS[topicKey];
        var topicName = topicData ? topicData.name : topicKey;
        var levelName = getNPCSkillName(level);
        skillsHtml += '<li class="npc-skill-card__skill">' +
          '<span class="npc-skill-card__topic">' + _escapeHtml(topicName) + '</span>' +
          '<span class="npc-skill-card__level">' + _escapeHtml(levelName) + ' (' + level + ')</span>' +
          '</li>';
      }
      skillsHtml += '</ul>';
    } else {
      skillsHtml = '<p class="npc-skill-card__none">No skills learned yet</p>';
    }

    return '<div class="npc-skill-card">' +
      '<div class="npc-skill-card__header">NPC: ' + _escapeHtml(npcId) + '</div>' +
      skillsHtml +
      '</div>';
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  function _copyState(state) {
    var newState = {
      mentorships: {},
      npcSkills: {},
      lessonHistory: (state.lessonHistory || []).slice(),
      playerTeachingXP: {}
    };

    // Copy mentorships
    var mKeys = Object.keys(state.mentorships || {});
    for (var i = 0; i < mKeys.length; i++) {
      newState.mentorships[mKeys[i]] = _copyLesson(state.mentorships[mKeys[i]]);
    }

    // Copy npcSkills
    var nKeys = Object.keys(state.npcSkills || {});
    for (var j = 0; j < nKeys.length; j++) {
      newState.npcSkills[nKeys[j]] = {};
      var tKeys = Object.keys(state.npcSkills[nKeys[j]] || {});
      for (var k = 0; k < tKeys.length; k++) {
        newState.npcSkills[nKeys[j]][tKeys[k]] = state.npcSkills[nKeys[j]][tKeys[k]];
      }
    }

    // Copy playerTeachingXP
    var xpKeys = Object.keys(state.playerTeachingXP || {});
    for (var l = 0; l < xpKeys.length; l++) {
      newState.playerTeachingXP[xpKeys[l]] = state.playerTeachingXP[xpKeys[l]];
    }

    return newState;
  }

  function _copyLesson(lesson) {
    if (!lesson) return null;
    return {
      id: lesson.id,
      topic: lesson.topic,
      npcId: lesson.npcId,
      teacherId: lesson.teacherId,
      step: lesson.step,
      steps: lesson.steps,
      startedAt: lesson.startedAt,
      completed: lesson.completed,
      completedAt: lesson.completedAt,
      abandoned: lesson.abandoned,
      readyToComplete: lesson.readyToComplete
    };
  }

  function _escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ============================================================================
  // EXPORTS
  // ============================================================================

  exports.TOPICS = TOPICS;
  exports.ARCHETYPE_TOPICS = ARCHETYPE_TOPICS;
  exports.SKILL_LEVEL_NAMES = SKILL_LEVEL_NAMES;
  exports.TEACHER_RANKS = TEACHER_RANKS;
  exports.LESSON_STEPS = LESSON_STEPS;

  exports.createApprenticeshipState = createApprenticeshipState;
  exports.startLesson = startLesson;
  exports.advanceLesson = advanceLesson;
  exports.completeLesson = completeLesson;
  exports.getNPCSkill = getNPCSkill;
  exports.getNPCSkillName = getNPCSkillName;
  exports.getTeachableTopics = getTeachableTopics;
  exports.getPlayerTeachingStats = getPlayerTeachingStats;
  exports.getTeacherRank = getTeacherRank;
  exports.getLessonSteps = getLessonSteps;
  exports.getActiveLessons = getActiveLessons;
  exports.getNPCStudents = getNPCStudents;
  exports.formatLessonCard = formatLessonCard;
  exports.formatTeacherProfile = formatTeacherProfile;
  exports.formatNPCSkillCard = formatNPCSkillCard;

})(typeof module !== 'undefined' ? module.exports : (window.Apprenticeship = {}));
