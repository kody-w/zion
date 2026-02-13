(function(exports) {
  'use strict';

  // ============================================================================
  // SKILL TREE CONFIGURATION
  // ============================================================================

  var SKILLS = {
    gardening: {
      name: 'Gardening',
      levels: ['Seedling', 'Sprout', 'Gardener', 'Botanist', 'Grove Master'],
      xpPerLevel: [0, 100, 300, 600, 1000]
    },
    crafting: {
      name: 'Crafting',
      levels: ['Novice', 'Apprentice', 'Journeyman', 'Artisan', 'Master Crafter'],
      xpPerLevel: [0, 100, 300, 600, 1000]
    },
    building: {
      name: 'Building',
      levels: ['Laborer', 'Builder', 'Architect', 'Engineer', 'Grand Architect'],
      xpPerLevel: [0, 100, 300, 600, 1000]
    },
    exploration: {
      name: 'Exploration',
      levels: ['Wanderer', 'Scout', 'Explorer', 'Pathfinder', 'Cartographer'],
      xpPerLevel: [0, 100, 300, 600, 1000]
    },
    trading: {
      name: 'Trading',
      levels: ['Haggler', 'Merchant', 'Trader', 'Mogul', 'Trade Baron'],
      xpPerLevel: [0, 100, 300, 600, 1000]
    },
    social: {
      name: 'Social',
      levels: ['Shy', 'Friendly', 'Sociable', 'Diplomat', 'Ambassador'],
      xpPerLevel: [0, 100, 300, 600, 1000]
    },
    combat: {
      name: 'Combat',
      levels: ['Brawler', 'Fighter', 'Warrior', 'Champion', 'Arena Legend'],
      xpPerLevel: [0, 100, 300, 600, 1000]
    },
    lore: {
      name: 'Lore',
      levels: ['Curious', 'Student', 'Scholar', 'Sage', 'Lorekeeper'],
      xpPerLevel: [0, 100, 300, 600, 1000]
    }
  };

  // NPC archetype to skill mapping
  var NPC_TEACHING_SPECIALTIES = {
    farmer: 'gardening',
    gardener: 'gardening',
    artisan: 'crafting',
    creator: 'crafting',
    builder: 'building',
    architect: 'building',
    explorer: 'exploration',
    ranger: 'exploration',
    merchant: 'trading',
    trader: 'trading',
    diplomat: 'social',
    storyteller: 'social',
    warrior: 'combat',
    guardian: 'combat',
    scholar: 'lore',
    sage: 'lore'
  };

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  var playerSkills = {}; // playerId -> { skillName: { xp, level, levelName } }
  var mentorships = {}; // mentorshipId -> mentorship object
  var mentorshipOffers = {}; // offerId -> offer object
  var npcLessons = {}; // lessonId -> lesson object
  var mentorshipIdCounter = 0;
  var offerIdCounter = 0;
  var lessonIdCounter = 0;

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  function generateId(prefix) {
    return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  function getSkillLevel(xp, skill) {
    if (!SKILLS[skill]) return 0;
    var thresholds = SKILLS[skill].xpPerLevel;
    for (var i = thresholds.length - 1; i >= 0; i--) {
      if (xp >= thresholds[i]) return i;
    }
    return 0;
  }

  function getLevelName(level, skill) {
    if (!SKILLS[skill] || level < 0 || level >= SKILLS[skill].levels.length) {
      return 'Unknown';
    }
    return SKILLS[skill].levels[level];
  }

  // ============================================================================
  // PLAYER SKILLS
  // ============================================================================

  function initPlayerSkills(playerId) {
    if (playerSkills[playerId]) return playerSkills[playerId];

    playerSkills[playerId] = {};
    for (var skillName in SKILLS) {
      playerSkills[playerId][skillName] = {
        xp: 0,
        level: 0,
        levelName: SKILLS[skillName].levels[0]
      };
    }
    return playerSkills[playerId];
  }

  function getPlayerSkills(playerId) {
    if (!playerSkills[playerId]) {
      initPlayerSkills(playerId);
    }
    return playerSkills[playerId];
  }

  function addSkillXP(playerId, skill, amount) {
    if (!SKILLS[skill]) {
      return { success: false, error: 'Invalid skill' };
    }

    if (!playerSkills[playerId]) {
      initPlayerSkills(playerId);
    }

    var skillData = playerSkills[playerId][skill];
    var oldLevel = skillData.level;
    skillData.xp += amount;

    var newLevel = getSkillLevel(skillData.xp, skill);
    var leveledUp = newLevel > oldLevel;

    if (leveledUp) {
      skillData.level = newLevel;
      skillData.levelName = getLevelName(newLevel, skill);
    }

    return {
      success: true,
      newXP: skillData.xp,
      leveledUp: leveledUp,
      newLevel: newLevel,
      newLevelName: skillData.levelName
    };
  }

  function getSkillLevelNum(playerId, skill) {
    if (!playerSkills[playerId] || !SKILLS[skill]) {
      return 0;
    }
    return playerSkills[playerId][skill].level;
  }

  // ============================================================================
  // MENTORSHIP SYSTEM
  // ============================================================================

  function offerMentorship(mentorId, menteeId, skill) {
    if (!SKILLS[skill]) {
      return { success: false, error: 'Invalid skill' };
    }

    var mentorLevel = getSkillLevelNum(mentorId, skill);
    if (mentorLevel < 2) {
      return {
        success: false,
        error: 'Mentor must be at least level 2 in ' + SKILLS[skill].name
      };
    }

    var offerId = generateId('offer');
    var offer = {
      id: offerId,
      mentorId: mentorId,
      menteeId: menteeId,
      skill: skill,
      timestamp: Date.now()
    };

    mentorshipOffers[offerId] = offer;

    return {
      success: true,
      offer: offer
    };
  }

  function acceptMentorship(offerId) {
    var offer = mentorshipOffers[offerId];
    if (!offer) {
      return { success: false, error: 'Offer not found' };
    }

    var mentorshipId = generateId('mentorship');
    var mentorship = {
      id: mentorshipId,
      mentorId: offer.mentorId,
      menteeId: offer.menteeId,
      skill: offer.skill,
      stepsCompleted: 0,
      totalSteps: 5,
      startedAt: Date.now()
    };

    mentorships[mentorshipId] = mentorship;
    delete mentorshipOffers[offerId];

    return {
      success: true,
      mentorship: mentorship
    };
  }

  function declineMentorship(offerId) {
    if (mentorshipOffers[offerId]) {
      delete mentorshipOffers[offerId];
    }
  }

  function completeLessonStep(mentorshipId) {
    var mentorship = mentorships[mentorshipId];
    if (!mentorship) {
      return { success: false, error: 'Mentorship not found' };
    }

    if (mentorship.stepsCompleted >= mentorship.totalSteps) {
      return { success: false, error: 'Mentorship already completed' };
    }

    mentorship.stepsCompleted++;
    var progress = mentorship.stepsCompleted / mentorship.totalSteps;
    var completed = mentorship.stepsCompleted >= mentorship.totalSteps;

    // Grant XP to mentee
    addSkillXP(mentorship.menteeId, mentorship.skill, 20);

    // Spark reward for mentor (5-10 per step, 50 bonus on completion)
    var sparkReward = Math.floor(5 + Math.random() * 5);
    if (completed) {
      sparkReward += 50;
    }

    return {
      success: true,
      progress: progress,
      stepsCompleted: mentorship.stepsCompleted,
      totalSteps: mentorship.totalSteps,
      completed: completed,
      sparkReward: sparkReward,
      mentorship: mentorship
    };
  }

  function getActiveMentorships(playerId) {
    var result = [];
    for (var id in mentorships) {
      var m = mentorships[id];
      if (m.mentorId === playerId || m.menteeId === playerId) {
        result.push(m);
      }
    }
    return result;
  }

  function getMentorshipProgress(mentorshipId) {
    var mentorship = mentorships[mentorshipId];
    if (!mentorship) {
      return null;
    }

    return {
      stepsCompleted: mentorship.stepsCompleted,
      totalSteps: mentorship.totalSteps,
      skill: mentorship.skill,
      mentor: mentorship.mentorId,
      mentee: mentorship.menteeId
    };
  }

  function cancelMentorship(mentorshipId, playerId) {
    var mentorship = mentorships[mentorshipId];
    if (!mentorship) {
      return { success: false, error: 'Mentorship not found' };
    }

    if (mentorship.mentorId !== playerId && mentorship.menteeId !== playerId) {
      return { success: false, error: 'Not part of this mentorship' };
    }

    delete mentorships[mentorshipId];
    return { success: true };
  }

  // ============================================================================
  // NPC TEACHING SYSTEM
  // ============================================================================

  function canNPCTeach(npcArchetype, skill) {
    if (!SKILLS[skill]) return false;
    return NPC_TEACHING_SPECIALTIES[npcArchetype] === skill;
  }

  function startNPCLesson(playerId, npcId, npcArchetype, skill) {
    if (!canNPCTeach(npcArchetype, skill)) {
      return {
        success: false,
        error: 'This NPC cannot teach ' + SKILLS[skill].name
      };
    }

    var lessonId = generateId('lesson');
    var lesson = {
      id: lessonId,
      playerId: playerId,
      npcId: npcId,
      npcArchetype: npcArchetype,
      skill: skill,
      startedAt: Date.now()
    };

    npcLessons[lessonId] = lesson;

    return {
      success: true,
      lesson: lesson
    };
  }

  function completeNPCLesson(lessonId) {
    var lesson = npcLessons[lessonId];
    if (!lesson) {
      return { success: false, error: 'Lesson not found' };
    }

    var xpGained = 15;
    addSkillXP(lesson.playerId, lesson.skill, xpGained);

    var sparkCost = Math.floor(5 + Math.random() * 10);

    delete npcLessons[lessonId];

    return {
      success: true,
      xpGained: xpGained,
      sparkCost: sparkCost,
      skill: lesson.skill
    };
  }

  // ============================================================================
  // STATE PERSISTENCE
  // ============================================================================

  function initMentoring(existingData) {
    if (existingData) {
      playerSkills = existingData.playerSkills || {};
      mentorships = existingData.mentorships || {};
      mentorshipOffers = existingData.mentorshipOffers || {};
      npcLessons = existingData.npcLessons || {};
    }
  }

  function getMentoringState() {
    return {
      playerSkills: playerSkills,
      mentorships: mentorships,
      mentorshipOffers: mentorshipOffers,
      npcLessons: npcLessons
    };
  }

  // ============================================================================
  // EXPORTS
  // ============================================================================

  exports.SKILLS = SKILLS;
  exports.NPC_TEACHING_SPECIALTIES = NPC_TEACHING_SPECIALTIES;
  exports.initPlayerSkills = initPlayerSkills;
  exports.getPlayerSkills = getPlayerSkills;
  exports.addSkillXP = addSkillXP;
  exports.getSkillLevel = getSkillLevelNum;
  exports.offerMentorship = offerMentorship;
  exports.acceptMentorship = acceptMentorship;
  exports.declineMentorship = declineMentorship;
  exports.completeLessonStep = completeLessonStep;
  exports.getActiveMentorships = getActiveMentorships;
  exports.getMentorshipProgress = getMentorshipProgress;
  exports.cancelMentorship = cancelMentorship;
  exports.canNPCTeach = canNPCTeach;
  exports.startNPCLesson = startNPCLesson;
  exports.completeNPCLesson = completeNPCLesson;
  exports.initMentoring = initMentoring;
  exports.getMentoringState = getMentoringState;

})(typeof module !== 'undefined' ? module.exports : (window.Mentoring = {}));
