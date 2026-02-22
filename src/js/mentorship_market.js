// mentorship_market.js
(function(exports) {
  'use strict';

  // ============================================================================
  // TEACHABLE SUBJECTS CATALOG
  // ============================================================================

  var SUBJECTS = {
    fishing_basics: {
      name: 'Fishing Basics',
      category: 'gathering',
      minLevel: 5,
      basePrice: 10,
      duration: 300
    },
    advanced_fishing: {
      name: 'Advanced Fishing',
      category: 'gathering',
      minLevel: 15,
      basePrice: 25,
      duration: 300
    },
    herb_identification: {
      name: 'Herb Identification',
      category: 'gathering',
      minLevel: 5,
      basePrice: 10,
      duration: 300
    },
    basic_smithing: {
      name: 'Basic Smithing',
      category: 'crafting',
      minLevel: 5,
      basePrice: 12,
      duration: 300
    },
    advanced_crafting: {
      name: 'Advanced Crafting',
      category: 'crafting',
      minLevel: 20,
      basePrice: 30,
      duration: 300
    },
    recipe_mastery: {
      name: 'Recipe Mastery',
      category: 'crafting',
      minLevel: 25,
      basePrice: 40,
      duration: 600
    },
    card_strategy: {
      name: 'Card Game Strategy',
      category: 'minigames',
      minLevel: 10,
      basePrice: 15,
      duration: 300
    },
    dungeon_tactics: {
      name: 'Dungeon Tactics',
      category: 'minigames',
      minLevel: 15,
      basePrice: 20,
      duration: 300
    },
    trading_101: {
      name: 'Trading 101',
      category: 'economy',
      minLevel: 5,
      basePrice: 10,
      duration: 300
    },
    market_analysis: {
      name: 'Market Analysis',
      category: 'economy',
      minLevel: 20,
      basePrice: 35,
      duration: 300
    },
    zone_lore: {
      name: 'Zone Lore & History',
      category: 'knowledge',
      minLevel: 10,
      basePrice: 12,
      duration: 300
    },
    constellation_guide: {
      name: 'Constellation Guide',
      category: 'knowledge',
      minLevel: 10,
      basePrice: 15,
      duration: 300
    },
    navigation_skills: {
      name: 'Navigation Skills',
      category: 'exploration',
      minLevel: 5,
      basePrice: 10,
      duration: 300
    },
    survival_training: {
      name: 'Wilderness Survival',
      category: 'exploration',
      minLevel: 15,
      basePrice: 20,
      duration: 300
    },
    leadership: {
      name: 'Guild Leadership',
      category: 'social',
      minLevel: 20,
      basePrice: 25,
      duration: 600
    }
  };

  // ============================================================================
  // CONSTANTS
  // ============================================================================

  var VALID_CATEGORIES = ['gathering', 'crafting', 'minigames', 'economy', 'knowledge', 'exploration', 'social'];
  var CANCEL_REFUND_TICKS = 60;   // full refund if cancelled > 60 ticks before session
  var MIN_RATING = 1;
  var MAX_RATING = 5;
  var MAX_REVIEW_LENGTH = 200;
  var STUDENT_XP_BASE = 50;       // base XP student earns per session
  var TEACHER_XP_BASE = 20;       // base XP teacher earns per session
  var REPUTATION_BONUS = 5;       // reputation awarded on completion

  // Teacher rank thresholds (score = sessions * avgRating)
  var TEACHER_RANKS = [
    { minScore: 0,   rank: 'New Teacher'   },
    { minScore: 10,  rank: 'Instructor'    },
    { minScore: 30,  rank: 'Professor'     },
    { minScore: 60,  rank: 'Master Teacher' },
    { minScore: 100, rank: 'Grand Mentor'  }
  ];

  // Session status values
  var SESSION_STATUS = {
    BOOKED:    'booked',
    ACTIVE:    'active',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
  };

  // Listing status values
  var LISTING_STATUS = {
    OPEN:      'open',
    FULL:      'full',
    CANCELLED: 'cancelled',
    COMPLETED: 'completed'
  };

  // ============================================================================
  // STATE FACTORY
  // ============================================================================

  /**
   * Creates a fresh market state
   * @returns {Object} Initial market state
   */
  function createMarketState() {
    return {
      listings: [],
      sessions: [],
      ratings: {},      // { sessionId: { teacher: {...}, student: {...} } }
      teacherStats: {}, // { teacherId: { totalSessions, totalEarned, subjectCounts } }
      nextListingId: 1,
      nextSessionId: 1
    };
  }

  // ============================================================================
  // INTERNAL HELPERS
  // ============================================================================

  function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function getListing(state, listingId) {
    for (var i = 0; i < state.listings.length; i++) {
      if (state.listings[i].id === listingId) return state.listings[i];
    }
    return null;
  }

  function getSession(state, sessionId) {
    for (var i = 0; i < state.sessions.length; i++) {
      if (state.sessions[i].id === sessionId) return state.sessions[i];
    }
    return null;
  }

  function getBookingsForListing(state, listingId) {
    var count = 0;
    for (var i = 0; i < state.sessions.length; i++) {
      var s = state.sessions[i];
      if (s.listingId === listingId && s.status !== SESSION_STATUS.CANCELLED) {
        count++;
      }
    }
    return count;
  }

  function updateListingStatus(state, listingId) {
    var listing = getListing(state, listingId);
    if (!listing || listing.status === LISTING_STATUS.CANCELLED) return;
    var booked = getBookingsForListing(state, listingId);
    if (booked >= listing.maxStudents) {
      listing.status = LISTING_STATUS.FULL;
    } else {
      listing.status = LISTING_STATUS.OPEN;
    }
  }

  function ensureTeacherStats(state, teacherId) {
    if (!state.teacherStats[teacherId]) {
      state.teacherStats[teacherId] = {
        totalSessions: 0,
        totalEarned: 0,
        subjectCounts: {}
      };
    }
  }

  function getTeacherRatingData(state, teacherId) {
    var totalStars = 0;
    var count = 0;
    var reviews = [];
    var sessionIds = Object.keys(state.ratings);
    for (var i = 0; i < sessionIds.length; i++) {
      var sid = sessionIds[i];
      var ratingEntry = state.ratings[sid];
      // Find session to see if this teacher was the teacher
      var session = getSession(state, parseInt(sid, 10));
      if (!session) continue;
      var listing = getListing(state, session.listingId);
      if (!listing || listing.teacherId !== teacherId) continue;
      if (ratingEntry.teacher) {
        totalStars += ratingEntry.teacher.rating;
        count++;
        if (ratingEntry.teacher.review) {
          reviews.push({
            sessionId: parseInt(sid, 10),
            rating: ratingEntry.teacher.rating,
            review: ratingEntry.teacher.review,
            raterId: session.studentId
          });
        }
      }
    }
    return {
      average: count > 0 ? Math.round((totalStars / count) * 100) / 100 : 0,
      count: count,
      reviews: reviews
    };
  }

  // ============================================================================
  // LISTING MANAGEMENT
  // ============================================================================

  /**
   * Teacher creates a listing for a teaching session
   * @param {Object} state - Market state
   * @param {string} teacherId - Teacher's player ID
   * @param {string} subjectId - Subject key from SUBJECTS
   * @param {number} price - Price in Spark (>= 0)
   * @param {number} maxStudents - Max students (>= 1)
   * @param {number} scheduleTick - Tick number when session will start
   * @param {number} teacherLevel - Teacher's current level (for validation)
   * @returns {Object} { state, listing, success, message }
   */
  function createListing(state, teacherId, subjectId, price, maxStudents, scheduleTick, teacherLevel) {
    var newState = deepCopy(state);

    if (!teacherId || typeof teacherId !== 'string' || !teacherId.trim()) {
      return { state: newState, listing: null, success: false, message: 'Invalid teacher ID' };
    }
    if (!subjectId || !SUBJECTS[subjectId]) {
      return { state: newState, listing: null, success: false, message: 'Unknown subject: ' + subjectId };
    }
    if (typeof price !== 'number' || price < 0) {
      return { state: newState, listing: null, success: false, message: 'Price must be a non-negative number' };
    }
    if (typeof maxStudents !== 'number' || maxStudents < 1 || !isFinite(maxStudents)) {
      return { state: newState, listing: null, success: false, message: 'maxStudents must be >= 1' };
    }
    if (typeof scheduleTick !== 'number' || scheduleTick < 0) {
      return { state: newState, listing: null, success: false, message: 'scheduleTick must be a non-negative number' };
    }

    var subject = SUBJECTS[subjectId];
    var level = typeof teacherLevel === 'number' ? teacherLevel : 0;
    if (level < subject.minLevel) {
      return {
        state: newState,
        listing: null,
        success: false,
        message: 'Teacher level ' + level + ' is below required level ' + subject.minLevel + ' for ' + subject.name
      };
    }

    var listing = {
      id: newState.nextListingId++,
      teacherId: teacherId,
      subjectId: subjectId,
      subject: subject,
      price: price,
      maxStudents: Math.floor(maxStudents),
      scheduleTick: scheduleTick,
      status: LISTING_STATUS.OPEN,
      createdAt: scheduleTick,
      sessions: []
    };

    newState.listings.push(listing);

    return { state: newState, listing: listing, success: true, message: 'Listing created successfully' };
  }

  /**
   * Teacher cancels their listing
   * @param {Object} state - Market state
   * @param {number} listingId - Listing ID
   * @param {string} teacherId - Teacher's player ID (must match listing)
   * @returns {Object} { state, success, message }
   */
  function cancelListing(state, listingId, teacherId) {
    var newState = deepCopy(state);
    var listing = getListing(newState, listingId);

    if (!listing) {
      return { state: newState, success: false, message: 'Listing not found' };
    }
    if (listing.teacherId !== teacherId) {
      return { state: newState, success: false, message: 'Only the teacher can cancel this listing' };
    }
    if (listing.status === LISTING_STATUS.CANCELLED) {
      return { state: newState, success: false, message: 'Listing is already cancelled' };
    }

    listing.status = LISTING_STATUS.CANCELLED;

    // Cancel all booked sessions and mark them cancelled
    for (var i = 0; i < newState.sessions.length; i++) {
      var session = newState.sessions[i];
      if (session.listingId === listingId && session.status === SESSION_STATUS.BOOKED) {
        session.status = SESSION_STATUS.CANCELLED;
        session.refunded = true;
      }
    }

    return { state: newState, success: true, message: 'Listing cancelled successfully' };
  }

  // ============================================================================
  // BOOKING
  // ============================================================================

  /**
   * Student books a session slot (payment held in escrow)
   * @param {Object} state - Market state
   * @param {number} listingId - Listing ID
   * @param {string} studentId - Student's player ID
   * @returns {Object} { state, session, success, message }
   */
  function bookSession(state, listingId, studentId) {
    var newState = deepCopy(state);

    if (!studentId || typeof studentId !== 'string' || !studentId.trim()) {
      return { state: newState, session: null, success: false, message: 'Invalid student ID' };
    }

    var listing = getListing(newState, listingId);
    if (!listing) {
      return { state: newState, session: null, success: false, message: 'Listing not found' };
    }
    if (listing.status === LISTING_STATUS.CANCELLED) {
      return { state: newState, session: null, success: false, message: 'Listing has been cancelled' };
    }
    if (listing.status === LISTING_STATUS.FULL) {
      return { state: newState, session: null, success: false, message: 'Listing is full' };
    }
    if (listing.teacherId === studentId) {
      return { state: newState, session: null, success: false, message: 'Teacher cannot book their own session' };
    }

    // Check student hasn't already booked this listing
    for (var i = 0; i < newState.sessions.length; i++) {
      var existing = newState.sessions[i];
      if (existing.listingId === listingId &&
          existing.studentId === studentId &&
          existing.status !== SESSION_STATUS.CANCELLED) {
        return { state: newState, session: null, success: false, message: 'Student has already booked this listing' };
      }
    }

    var session = {
      id: newState.nextSessionId++,
      listingId: listingId,
      teacherId: listing.teacherId,
      studentId: studentId,
      subjectId: listing.subjectId,
      price: listing.price,
      scheduleTick: listing.scheduleTick,
      status: SESSION_STATUS.BOOKED,
      escrow: listing.price,
      startedAt: null,
      completedAt: null,
      refunded: false
    };

    newState.sessions.push(session);

    // Update listing status
    var bookedCount = getBookingsForListing(newState, listingId);
    if (bookedCount >= listing.maxStudents) {
      listing.status = LISTING_STATUS.FULL;
    }

    return { state: newState, session: session, success: true, message: 'Session booked successfully' };
  }

  /**
   * Cancel a booking (refund if > CANCEL_REFUND_TICKS before session)
   * @param {Object} state - Market state
   * @param {number} sessionId - Session ID
   * @param {string} playerId - Player cancelling (student or teacher)
   * @param {number} currentTick - Current game tick
   * @returns {Object} { state, refunded, success, message }
   */
  function cancelBooking(state, sessionId, playerId, currentTick) {
    var newState = deepCopy(state);
    var session = getSession(newState, sessionId);

    if (!session) {
      return { state: newState, refunded: false, success: false, message: 'Session not found' };
    }
    if (session.studentId !== playerId && session.teacherId !== playerId) {
      return { state: newState, refunded: false, success: false, message: 'Player is not part of this session' };
    }
    if (session.status === SESSION_STATUS.CANCELLED) {
      return { state: newState, refunded: false, success: false, message: 'Session is already cancelled' };
    }
    if (session.status === SESSION_STATUS.COMPLETED) {
      return { state: newState, refunded: false, success: false, message: 'Cannot cancel a completed session' };
    }
    if (session.status === SESSION_STATUS.ACTIVE) {
      return { state: newState, refunded: false, success: false, message: 'Cannot cancel an active session' };
    }

    var tick = typeof currentTick === 'number' ? currentTick : 0;
    var ticksUntilSession = session.scheduleTick - tick;
    var refunded = ticksUntilSession > CANCEL_REFUND_TICKS;

    session.status = SESSION_STATUS.CANCELLED;
    session.refunded = refunded;

    // Re-open listing slot if it was full
    updateListingStatus(newState, session.listingId);

    return {
      state: newState,
      refunded: refunded,
      success: true,
      message: refunded ? 'Booking cancelled with full refund' : 'Booking cancelled without refund (too close to session time)'
    };
  }

  // ============================================================================
  // SESSION LIFECYCLE
  // ============================================================================

  /**
   * Start a session — both parties check in
   * @param {Object} state - Market state
   * @param {number} sessionId - Session ID
   * @param {number} currentTick - Current game tick
   * @returns {Object} { state, success, message }
   */
  function startSession(state, sessionId, currentTick) {
    var newState = deepCopy(state);
    var session = getSession(newState, sessionId);

    if (!session) {
      return { state: newState, success: false, message: 'Session not found' };
    }
    if (session.status === SESSION_STATUS.CANCELLED) {
      return { state: newState, success: false, message: 'Session has been cancelled' };
    }
    if (session.status === SESSION_STATUS.COMPLETED) {
      return { state: newState, success: false, message: 'Session is already completed' };
    }
    if (session.status === SESSION_STATUS.ACTIVE) {
      return { state: newState, success: false, message: 'Session is already active' };
    }

    var tick = typeof currentTick === 'number' ? currentTick : 0;

    session.status = SESSION_STATUS.ACTIVE;
    session.startedAt = tick;

    return { state: newState, success: true, message: 'Session started successfully' };
  }

  /**
   * Complete a session — distribute rewards and XP
   * @param {Object} state - Market state
   * @param {number} sessionId - Session ID
   * @param {number} currentTick - Current game tick
   * @returns {Object} { state, teacherReward, studentReward, success, message }
   */
  function completeSession(state, sessionId, currentTick) {
    var newState = deepCopy(state);
    var session = getSession(newState, sessionId);

    if (!session) {
      return { state: newState, teacherReward: null, studentReward: null, success: false, message: 'Session not found' };
    }
    if (session.status === SESSION_STATUS.CANCELLED) {
      return { state: newState, teacherReward: null, studentReward: null, success: false, message: 'Session has been cancelled' };
    }
    if (session.status === SESSION_STATUS.COMPLETED) {
      return { state: newState, teacherReward: null, studentReward: null, success: false, message: 'Session is already completed' };
    }
    if (session.status !== SESSION_STATUS.ACTIVE) {
      return { state: newState, teacherReward: null, studentReward: null, success: false, message: 'Session must be started before it can be completed' };
    }

    var tick = typeof currentTick === 'number' ? currentTick : 0;
    var subject = SUBJECTS[session.subjectId] || {};
    var durationBonus = subject.duration === 600 ? 1.5 : 1.0;

    var teacherReward = {
      spark: session.price,
      xp: Math.floor(TEACHER_XP_BASE * durationBonus),
      reputation: REPUTATION_BONUS
    };
    var studentReward = {
      spark: 0,
      xp: Math.floor(STUDENT_XP_BASE * durationBonus),
      reputation: REPUTATION_BONUS
    };

    session.status = SESSION_STATUS.COMPLETED;
    session.completedAt = tick;
    session.escrow = 0;

    // Update teacher stats
    ensureTeacherStats(newState, session.teacherId);
    var stats = newState.teacherStats[session.teacherId];
    stats.totalSessions++;
    stats.totalEarned += session.price;
    if (!stats.subjectCounts[session.subjectId]) {
      stats.subjectCounts[session.subjectId] = 0;
    }
    stats.subjectCounts[session.subjectId]++;

    return {
      state: newState,
      teacherReward: teacherReward,
      studentReward: studentReward,
      success: true,
      message: 'Session completed successfully'
    };
  }

  // ============================================================================
  // RATING SYSTEM
  // ============================================================================

  /**
   * Rate a session (1-5 stars, optional review)
   * @param {Object} state - Market state
   * @param {number} sessionId - Session ID
   * @param {string} raterId - Player giving the rating
   * @param {number} rating - Rating 1-5
   * @param {string} review - Optional review text (max 200 chars)
   * @returns {Object} { state, success, message }
   */
  function rateSession(state, sessionId, raterId, rating, review) {
    var newState = deepCopy(state);
    var session = getSession(newState, sessionId);

    if (!session) {
      return { state: newState, success: false, message: 'Session not found' };
    }
    if (session.status !== SESSION_STATUS.COMPLETED) {
      return { state: newState, success: false, message: 'Can only rate completed sessions' };
    }
    if (session.teacherId !== raterId && session.studentId !== raterId) {
      return { state: newState, success: false, message: 'Rater is not part of this session' };
    }

    if (typeof rating !== 'number' || !isFinite(rating) || rating < MIN_RATING || rating > MAX_RATING) {
      return { state: newState, success: false, message: 'Rating must be between 1 and 5' };
    }
    var intRating = Math.round(rating);
    if (intRating < MIN_RATING || intRating > MAX_RATING) {
      return { state: newState, success: false, message: 'Rating must be between 1 and 5' };
    }

    var reviewText = '';
    if (review && typeof review === 'string') {
      reviewText = review.trim().substring(0, MAX_REVIEW_LENGTH);
    }

    if (!newState.ratings[sessionId]) {
      newState.ratings[sessionId] = {};
    }
    var ratingEntry = newState.ratings[sessionId];

    // Determine whether rater is teacher or student
    var isTeacher = raterId === session.teacherId;
    var ratingKey = isTeacher ? 'student' : 'teacher'; // teacher rates student, student rates teacher

    if (ratingEntry[ratingKey]) {
      return { state: newState, success: false, message: 'Already rated this session' };
    }

    ratingEntry[ratingKey] = {
      raterId: raterId,
      rating: intRating,
      review: reviewText,
      flagged: intRating < 2
    };

    return { state: newState, success: true, message: 'Rating submitted successfully' };
  }

  // ============================================================================
  // QUERIES
  // ============================================================================

  /**
   * Get a teacher's rating summary
   * @param {Object} state - Market state
   * @param {string} teacherId - Teacher's player ID
   * @returns {Object} { average, count, reviews }
   */
  function getTeacherRating(state, teacherId) {
    return getTeacherRatingData(state, teacherId);
  }

  /**
   * Get listings with optional filters
   * @param {Object} state - Market state
   * @param {Object} filters - { subject, category, maxPrice, minRating, teacherId, sortBy }
   * @returns {Array} Filtered and sorted listings
   */
  function getListings(state, filters) {
    var opts = filters || {};
    var results = [];

    for (var i = 0; i < state.listings.length; i++) {
      var listing = state.listings[i];

      // Only show open listings by default
      if (listing.status === LISTING_STATUS.CANCELLED) continue;

      if (opts.subject && listing.subjectId !== opts.subject) continue;
      if (opts.category && listing.subject && listing.subject.category !== opts.category) continue;
      if (typeof opts.maxPrice === 'number' && listing.price > opts.maxPrice) continue;
      if (opts.teacherId && listing.teacherId !== opts.teacherId) continue;

      // minRating filter requires computing teacher rating
      if (typeof opts.minRating === 'number') {
        var ratingData = getTeacherRatingData(state, listing.teacherId);
        if (ratingData.count > 0 && ratingData.average < opts.minRating) continue;
      }

      results.push(listing);
    }

    // Sort
    var sortBy = opts.sortBy || 'rating';

    if (sortBy === 'price') {
      results.sort(function(a, b) { return a.price - b.price; });
    } else if (sortBy === 'date') {
      results.sort(function(a, b) { return a.scheduleTick - b.scheduleTick; });
    } else {
      // Default: sort by teacher rating descending
      results.sort(function(a, b) {
        var rA = getTeacherRatingData(state, a.teacherId).average;
        var rB = getTeacherRatingData(state, b.teacherId).average;
        return rB - rA;
      });
    }

    return results;
  }

  /**
   * Get all subjects
   * @returns {Object} All SUBJECTS
   */
  function getSubjects() {
    return SUBJECTS;
  }

  /**
   * Get subjects filtered by category
   * @param {string} category - Category name
   * @returns {Object} Filtered subjects
   */
  function getSubjectsByCategory(category) {
    var result = {};
    var keys = Object.keys(SUBJECTS);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (SUBJECTS[key].category === category) {
        result[key] = SUBJECTS[key];
      }
    }
    return result;
  }

  /**
   * Get teacher rank label based on score
   * @param {number} totalSessions - Number of sessions completed
   * @param {number} avgRating - Average rating (0-5)
   * @returns {string} Rank label
   */
  function getTeacherRank(totalSessions, avgRating) {
    var sessions = typeof totalSessions === 'number' && isFinite(totalSessions) ? Math.max(0, totalSessions) : 0;
    var rating = typeof avgRating === 'number' && isFinite(avgRating) ? Math.max(0, avgRating) : 0;
    var score = sessions * rating;
    var rank = TEACHER_RANKS[0].rank;
    for (var i = 0; i < TEACHER_RANKS.length; i++) {
      if (score >= TEACHER_RANKS[i].minScore) {
        rank = TEACHER_RANKS[i].rank;
      }
    }
    return rank;
  }

  /**
   * Get a teacher's full profile
   * @param {Object} state - Market state
   * @param {string} teacherId - Teacher's player ID
   * @returns {Object} { totalSessions, averageRating, subjects, totalEarned, rank }
   */
  function getTeacherProfile(state, teacherId) {
    var stats = state.teacherStats[teacherId] || {
      totalSessions: 0,
      totalEarned: 0,
      subjectCounts: {}
    };
    var ratingData = getTeacherRatingData(state, teacherId);
    var rank = getTeacherRank(stats.totalSessions, ratingData.average);

    return {
      teacherId: teacherId,
      totalSessions: stats.totalSessions,
      averageRating: ratingData.average,
      ratingCount: ratingData.count,
      subjects: stats.subjectCounts,
      totalEarned: stats.totalEarned,
      rank: rank
    };
  }

  /**
   * Get top teachers leaderboard
   * @param {Object} state - Market state
   * @param {number} limit - Max results (default 10)
   * @returns {Array} Teachers sorted by rating * sessions
   */
  function getTopTeachers(state, limit) {
    var maxResults = typeof limit === 'number' && limit > 0 ? limit : 10;
    var teacherIds = Object.keys(state.teacherStats);

    var teachers = teacherIds.map(function(tid) {
      var profile = getTeacherProfile(state, tid);
      profile.score = profile.totalSessions * profile.averageRating;
      return profile;
    });

    teachers.sort(function(a, b) { return b.score - a.score; });
    return teachers.slice(0, maxResults);
  }

  /**
   * Get a student's session history
   * @param {Object} state - Market state
   * @param {string} studentId - Student's player ID
   * @returns {Array} Sessions with rating info
   */
  function getStudentHistory(state, studentId) {
    var history = [];
    for (var i = 0; i < state.sessions.length; i++) {
      var session = state.sessions[i];
      if (session.studentId !== studentId) continue;

      var ratingEntry = state.ratings[session.id] || {};
      var myRating = ratingEntry.teacher || null; // student rated the teacher
      var theirRating = ratingEntry.student || null; // teacher rated the student

      history.push({
        session: session,
        subjectName: SUBJECTS[session.subjectId] ? SUBJECTS[session.subjectId].name : session.subjectId,
        myRating: myRating,
        receivedRating: theirRating
      });
    }
    return history;
  }

  // ============================================================================
  // FORMATTING
  // ============================================================================

  /**
   * Format rating as star display: "[***--]" style
   * @param {number} rating - Rating 0-5
   * @returns {string} Star display string
   */
  function formatRatingStars(rating) {
    var r = typeof rating === 'number' ? Math.round(Math.max(0, Math.min(5, rating))) : 0;
    var stars = '';
    for (var i = 0; i < 5; i++) {
      stars += i < r ? '*' : '-';
    }
    return '[' + stars + ']';
  }

  /**
   * Format a listing card as HTML
   * @param {Object} listing - Listing object
   * @param {Object} teacherRating - Rating data { average, count }
   * @returns {string} HTML string
   */
  function formatListingCard(listing, teacherRating) {
    if (!listing) return '<div class="listing-card listing-card--empty">No listing data</div>';
    var subject = listing.subject || SUBJECTS[listing.subjectId] || {};
    var subjectName = subject.name || listing.subjectId || 'Unknown Subject';
    var category = subject.category || 'unknown';
    var duration = subject.duration ? Math.floor(subject.duration / 60) + ' min' : 'N/A';
    var rating = teacherRating || { average: 0, count: 0 };
    var stars = formatRatingStars(rating.average);
    var ratingText = rating.count > 0
      ? stars + ' (' + rating.average.toFixed(1) + ', ' + rating.count + ' ratings)'
      : 'No ratings yet';
    var statusClass = 'listing-card--' + (listing.status || 'open');

    return '<div class="listing-card ' + statusClass + '" data-listing-id="' + listing.id + '">' +
      '<div class="listing-card__header">' +
        '<span class="listing-card__subject">' + subjectName + '</span>' +
        '<span class="listing-card__category listing-card__category--' + category + '">' + category + '</span>' +
      '</div>' +
      '<div class="listing-card__body">' +
        '<div class="listing-card__price">' + listing.price + ' Spark</div>' +
        '<div class="listing-card__duration">' + duration + '</div>' +
        '<div class="listing-card__rating">' + ratingText + '</div>' +
        '<div class="listing-card__slots">' + listing.maxStudents + ' slot(s)</div>' +
        '<div class="listing-card__tick">Tick: ' + listing.scheduleTick + '</div>' +
      '</div>' +
      '<div class="listing-card__footer">' +
        '<span class="listing-card__status">' + (listing.status || 'open') + '</span>' +
        '<span class="listing-card__teacher">Teacher: ' + listing.teacherId + '</span>' +
      '</div>' +
    '</div>';
  }

  /**
   * Format a session card as HTML
   * @param {Object} session - Session object
   * @returns {string} HTML string
   */
  function formatSessionCard(session) {
    if (!session) return '<div class="session-card session-card--empty">No session data</div>';
    var subject = SUBJECTS[session.subjectId] || {};
    var subjectName = subject.name || session.subjectId || 'Unknown Subject';
    var statusClass = 'session-card--' + (session.status || 'booked');
    var tickLabel = session.status === SESSION_STATUS.ACTIVE
      ? 'Started at tick: ' + session.startedAt
      : session.status === SESSION_STATUS.COMPLETED
        ? 'Completed at tick: ' + session.completedAt
        : 'Scheduled for tick: ' + session.scheduleTick;

    return '<div class="session-card ' + statusClass + '" data-session-id="' + session.id + '">' +
      '<div class="session-card__header">' +
        '<span class="session-card__subject">' + subjectName + '</span>' +
        '<span class="session-card__status">' + (session.status || 'booked') + '</span>' +
      '</div>' +
      '<div class="session-card__body">' +
        '<div class="session-card__teacher">Teacher: ' + session.teacherId + '</div>' +
        '<div class="session-card__student">Student: ' + session.studentId + '</div>' +
        '<div class="session-card__price">' + session.price + ' Spark</div>' +
        '<div class="session-card__tick">' + tickLabel + '</div>' +
      '</div>' +
    '</div>';
  }

  /**
   * Format a teacher profile card as HTML
   * @param {Object} profile - Profile from getTeacherProfile
   * @returns {string} HTML string
   */
  function formatTeacherProfile(profile) {
    if (!profile) return '<div class="teacher-profile teacher-profile--empty">No profile data</div>';
    var stars = formatRatingStars(profile.averageRating);
    var subjectList = '';
    var subjectKeys = Object.keys(profile.subjects || {});
    if (subjectKeys.length > 0) {
      subjectList = '<ul class="teacher-profile__subjects">';
      for (var i = 0; i < subjectKeys.length; i++) {
        var subId = subjectKeys[i];
        var subName = SUBJECTS[subId] ? SUBJECTS[subId].name : subId;
        subjectList += '<li>' + subName + ' (' + profile.subjects[subId] + ' sessions)</li>';
      }
      subjectList += '</ul>';
    } else {
      subjectList = '<p class="teacher-profile__no-subjects">No sessions taught yet</p>';
    }

    return '<div class="teacher-profile" data-teacher-id="' + profile.teacherId + '">' +
      '<div class="teacher-profile__header">' +
        '<span class="teacher-profile__id">' + profile.teacherId + '</span>' +
        '<span class="teacher-profile__rank">' + profile.rank + '</span>' +
      '</div>' +
      '<div class="teacher-profile__stats">' +
        '<div class="teacher-profile__sessions">Sessions: ' + profile.totalSessions + '</div>' +
        '<div class="teacher-profile__earned">Total Earned: ' + profile.totalEarned + ' Spark</div>' +
        '<div class="teacher-profile__rating">' + stars + ' ' +
          (profile.averageRating > 0 ? profile.averageRating.toFixed(1) : 'No ratings') +
          ' (' + profile.ratingCount + ' ratings)</div>' +
      '</div>' +
      subjectList +
    '</div>';
  }

  // ============================================================================
  // EXPORTS
  // ============================================================================

  exports.SUBJECTS = SUBJECTS;
  exports.VALID_CATEGORIES = VALID_CATEGORIES;
  exports.SESSION_STATUS = SESSION_STATUS;
  exports.LISTING_STATUS = LISTING_STATUS;
  exports.TEACHER_RANKS = TEACHER_RANKS;
  exports.CANCEL_REFUND_TICKS = CANCEL_REFUND_TICKS;

  exports.createMarketState = createMarketState;
  exports.createListing = createListing;
  exports.cancelListing = cancelListing;
  exports.bookSession = bookSession;
  exports.cancelBooking = cancelBooking;
  exports.startSession = startSession;
  exports.completeSession = completeSession;
  exports.rateSession = rateSession;
  exports.getTeacherRating = getTeacherRating;
  exports.getListings = getListings;
  exports.getSubjects = getSubjects;
  exports.getSubjectsByCategory = getSubjectsByCategory;
  exports.getTeacherProfile = getTeacherProfile;
  exports.getTeacherRank = getTeacherRank;
  exports.getTopTeachers = getTopTeachers;
  exports.getStudentHistory = getStudentHistory;
  exports.formatListingCard = formatListingCard;
  exports.formatSessionCard = formatSessionCard;
  exports.formatTeacherProfile = formatTeacherProfile;
  exports.formatRatingStars = formatRatingStars;

})(typeof module !== 'undefined' ? module.exports : (window.MentorshipMarket = {}));
