/**
 * ZION MMO - Performance Stage Module
 *
 * Live player performances in The Studio — scheduled concerts, storytelling
 * sessions, art showcases, audience Spark tipping, crowd reactions, and
 * performance ratings.
 *
 * Per ZION Constitution §6.2: performers earn 5-20 Spark per attendee (capped).
 * Constitution §5.4: The Studio is the creative heart of ZION.
 */
(function(exports) {
  'use strict';

  // ---------------------------------------------------------------------------
  // Optional dependency guards
  // ---------------------------------------------------------------------------
  var MusicComposer = (typeof window !== 'undefined' && window.MusicComposer) || {};
  var SpectatorSystem = (typeof window !== 'undefined' && window.SpectatorSystem) || {};
  var Social = (typeof window !== 'undefined' && window.Social) || {};
  var Economy = (typeof window !== 'undefined' && window.Economy) || {};

  // ---------------------------------------------------------------------------
  // mulberry32 seeded PRNG — deterministic mechanics
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
  // Constants
  // ---------------------------------------------------------------------------

  // Performance types available in The Studio
  var PERFORMANCE_TYPES = {
    music:     { id: 'music',     name: 'Music Concert',      zone: 'studio', maxSetItems: 20, minSetItems: 1 },
    story:     { id: 'story',     name: 'Storytelling',       zone: 'studio', maxSetItems: 15, minSetItems: 1 },
    art:       { id: 'art',       name: 'Art Showcase',       zone: 'studio', maxSetItems: 30, minSetItems: 1 },
    dance:     { id: 'dance',     name: 'Dance Performance',  zone: 'studio', maxSetItems: 12, minSetItems: 1 }
  };

  // Studio stage configurations — different stages for different performance types
  var STAGE_TYPES = {
    main_stage: {
      id: 'main_stage',
      name: 'Main Stage',
      description: 'The grand performance hall — seats up to 200 audience members',
      maxAudience: 200,
      allowedTypes: ['music', 'dance'],
      acousticBonus: 1.2
    },
    intimate_hall: {
      id: 'intimate_hall',
      name: 'Intimate Hall',
      description: 'A cozy hall for storytelling and spoken word — up to 50',
      maxAudience: 50,
      allowedTypes: ['story', 'music'],
      acousticBonus: 1.1
    },
    gallery_stage: {
      id: 'gallery_stage',
      name: 'Gallery Stage',
      description: 'Art gallery with central performance area — up to 80',
      maxAudience: 80,
      allowedTypes: ['art', 'story'],
      acousticBonus: 1.0
    },
    amphitheater: {
      id: 'amphitheater',
      name: 'Studio Amphitheater',
      description: 'Open-air stage for grand performances — up to 300',
      maxAudience: 300,
      allowedTypes: ['music', 'dance', 'art', 'story'],
      acousticBonus: 1.15
    }
  };

  // Reaction types audience members can send
  var REACTION_TYPES = ['cheer', 'applaud', 'encore', 'laugh', 'cry', 'wow'];

  // Reaction sentiment weights (positive = good for score)
  var REACTION_SENTIMENT = {
    cheer:   1.0,
    applaud: 0.9,
    encore:  1.0,
    laugh:   0.7,
    cry:     0.8,
    wow:     1.0
  };

  // Constitution §6.2: Performing music/art for an audience earns 5-20 Spark per attendee (capped)
  var SPARK_PER_ATTENDEE_MIN = 5;
  var SPARK_PER_ATTENDEE_MAX = 20;
  var MAX_AUDIENCE_SPARK_CAP = 300; // max total attendee-counted Spark per performance

  // Encore mechanic: 70%+ audience must request encore
  var ENCORE_THRESHOLD = 0.70;
  var ENCORE_SPARK_BONUS = 10; // bonus Spark per attendee during encore

  // Tip limits per audience member (Constitution: 5-20 Spark per attendee)
  var TIP_MIN = 1;
  var TIP_MAX = 50;
  var TIP_CAP_PER_PERFORMANCE = 100; // max a single attendee can tip in one show

  // Performance scheduling: slot duration in seconds
  var MIN_SLOT_DURATION = 300;  // 5 minutes
  var MAX_SLOT_DURATION = 7200; // 2 hours

  // Rating scale
  var MIN_RATING = 1;
  var MAX_RATING = 5;

  // Internal counters
  var _performanceCounter = 0;
  var _slotCounter = 0;
  var _setListCounter = 0;
  var _reactionCounter = 0;

  // ---------------------------------------------------------------------------
  // ID generators
  // ---------------------------------------------------------------------------
  function nextPerformanceId() {
    _performanceCounter += 1;
    return 'perf_' + _performanceCounter;
  }

  function nextSlotId() {
    _slotCounter += 1;
    return 'slot_' + _slotCounter;
  }

  function nextSetListId() {
    _setListCounter += 1;
    return 'setlist_' + _setListCounter;
  }

  function nextReactionId() {
    _reactionCounter += 1;
    return 'react_' + _reactionCounter;
  }

  // ---------------------------------------------------------------------------
  // State helpers
  // ---------------------------------------------------------------------------
  function ensureState(state) {
    if (!state) return;
    if (!state.performances)       state.performances = [];
    if (!state.scheduledSlots)     state.scheduledSlots = [];
    if (!state.setLists)           state.setLists = {};
    if (!state.performerProfiles)  state.performerProfiles = {};
    if (!state.audienceRecords)    state.audienceRecords = {};
    if (!state.reactions)          state.reactions = {};
    if (!state.ratings)            state.ratings = {};
    if (!state.tipLedger)          state.tipLedger = {};
    if (!state.encoreRequests)     state.encoreRequests = {};
  }

  function findPerformance(state, perfId) {
    if (!state || !state.performances) return null;
    for (var i = 0; i < state.performances.length; i++) {
      if (state.performances[i].id === perfId) return state.performances[i];
    }
    return null;
  }

  function findSlot(state, slotId) {
    if (!state || !state.scheduledSlots) return null;
    for (var i = 0; i < state.scheduledSlots.length; i++) {
      if (state.scheduledSlots[i].id === slotId) return state.scheduledSlots[i];
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Performer profile
  // ---------------------------------------------------------------------------

  /**
   * Get or create a performer profile.
   * Tracks: performance history, average ratings, total tips, total shows.
   */
  function getPerformerProfile(state, performerId) {
    ensureState(state);
    if (!state.performerProfiles[performerId]) {
      state.performerProfiles[performerId] = {
        performerId:     performerId,
        totalShows:      0,
        totalTipsReceived: 0,
        ratingSum:       0,
        ratingCount:     0,
        encoresEarned:   0,
        performanceHistory: [],  // array of { perfId, type, rating, tipsReceived, audienceCount, ts }
        reputation:      0       // computed: ratingSum / ratingCount
      };
    }
    return state.performerProfiles[performerId];
  }

  /**
   * Compute average rating for a performer.
   */
  function getAverageRating(state, performerId) {
    var profile = state.performerProfiles && state.performerProfiles[performerId];
    if (!profile || profile.ratingCount === 0) return 0;
    return profile.ratingSum / profile.ratingCount;
  }

  // ---------------------------------------------------------------------------
  // Schedule a time slot
  // ---------------------------------------------------------------------------

  /**
   * Book a time slot on a studio stage.
   * @param {object} state
   * @param {string} performerId
   * @param {string} stageId       - key of STAGE_TYPES
   * @param {string} perfType      - key of PERFORMANCE_TYPES
   * @param {number} startTime     - unix timestamp (ms) for start
   * @param {number} durationSecs  - duration in seconds
   * @param {string} title         - show title
   * @param {string} description
   * @returns {{ success: boolean, slot?: object, reason?: string }}
   */
  function bookSlot(state, performerId, stageId, perfType, startTime, durationSecs, title, description) {
    ensureState(state);

    if (!performerId || typeof performerId !== 'string' || !performerId.trim()) {
      return { success: false, reason: 'Invalid performer ID' };
    }
    if (!STAGE_TYPES[stageId]) {
      return { success: false, reason: 'Unknown stage: ' + stageId };
    }
    if (!PERFORMANCE_TYPES[perfType]) {
      return { success: false, reason: 'Unknown performance type: ' + perfType };
    }

    var stage = STAGE_TYPES[stageId];
    if (stage.allowedTypes.indexOf(perfType) === -1) {
      return { success: false, reason: 'Stage ' + stageId + ' does not support ' + perfType + ' performances' };
    }
    if (!title || typeof title !== 'string' || !title.trim()) {
      return { success: false, reason: 'Title is required' };
    }
    if (typeof startTime !== 'number' || startTime <= 0) {
      return { success: false, reason: 'Invalid start time' };
    }
    if (typeof durationSecs !== 'number' || durationSecs < MIN_SLOT_DURATION || durationSecs > MAX_SLOT_DURATION) {
      return { success: false, reason: 'Duration must be between ' + MIN_SLOT_DURATION + ' and ' + MAX_SLOT_DURATION + ' seconds' };
    }

    var endTime = startTime + durationSecs * 1000;

    // Check for slot conflicts on the same stage
    for (var i = 0; i < state.scheduledSlots.length; i++) {
      var existing = state.scheduledSlots[i];
      if (existing.stageId === stageId && existing.status !== 'cancelled') {
        var exEnd = existing.startTime + existing.durationSecs * 1000;
        // Overlap check
        if (startTime < exEnd && endTime > existing.startTime) {
          return { success: false, reason: 'Time slot conflicts with existing booking on this stage' };
        }
      }
    }

    var slot = {
      id:           nextSlotId(),
      performerId:  performerId,
      stageId:      stageId,
      perfType:     perfType,
      title:        title.trim(),
      description:  description || '',
      startTime:    startTime,
      durationSecs: durationSecs,
      endTime:      endTime,
      status:       'scheduled',  // scheduled | active | completed | cancelled
      createdAt:    Date.now()
    };

    state.scheduledSlots.push(slot);
    return { success: true, slot: slot };
  }

  /**
   * Cancel a scheduled slot (performer or admin only).
   */
  function cancelSlot(state, slotId, requesterId) {
    ensureState(state);
    var slot = findSlot(state, slotId);
    if (!slot) return { success: false, reason: 'Slot not found' };
    if (slot.performerId !== requesterId) {
      return { success: false, reason: 'Only the performer can cancel their slot' };
    }
    if (slot.status === 'active') {
      return { success: false, reason: 'Cannot cancel an active performance — end it first' };
    }
    if (slot.status === 'cancelled') {
      return { success: false, reason: 'Slot is already cancelled' };
    }
    slot.status = 'cancelled';
    return { success: true, slot: slot };
  }

  /**
   * Get all upcoming (scheduled) slots, optionally filtered by stage or type.
   */
  function getUpcomingSlots(state, options) {
    ensureState(state);
    var now = Date.now();
    var opts = options || {};
    var result = [];
    for (var i = 0; i < state.scheduledSlots.length; i++) {
      var slot = state.scheduledSlots[i];
      if (slot.status !== 'scheduled') continue;
      if (slot.startTime <= now) continue; // already started
      if (opts.stageId && slot.stageId !== opts.stageId) continue;
      if (opts.perfType && slot.perfType !== opts.perfType) continue;
      if (opts.performerId && slot.performerId !== opts.performerId) continue;
      result.push(slot);
    }
    result.sort(function(a, b) { return a.startTime - b.startTime; });
    return result;
  }

  // ---------------------------------------------------------------------------
  // Set List Management
  // ---------------------------------------------------------------------------

  /**
   * Create a set list for a performance.
   * @param {object} state
   * @param {string} performerId
   * @param {string} title
   * @param {string} perfType    - music | story | art | dance
   * @returns {{ success: boolean, setList?: object, reason?: string }}
   */
  function createSetList(state, performerId, title, perfType) {
    ensureState(state);
    if (!performerId || typeof performerId !== 'string' || !performerId.trim()) {
      return { success: false, reason: 'Invalid performer ID' };
    }
    if (!title || typeof title !== 'string' || !title.trim()) {
      return { success: false, reason: 'Set list title is required' };
    }
    if (!PERFORMANCE_TYPES[perfType]) {
      return { success: false, reason: 'Invalid performance type: ' + perfType };
    }

    var setList = {
      id:          nextSetListId(),
      performerId: performerId,
      title:       title.trim(),
      perfType:    perfType,
      items:       [],   // ordered array of set list items
      createdAt:   Date.now(),
      updatedAt:   Date.now()
    };

    state.setLists[setList.id] = setList;
    return { success: true, setList: setList };
  }

  /**
   * Add an item to a set list (song, story chapter, artwork, dance piece).
   * @param {object} state
   * @param {string} setListId
   * @param {string} itemTitle
   * @param {string} itemDescription
   * @param {number} estimatedDurationSecs
   * @returns {{ success: boolean, item?: object, reason?: string }}
   */
  function addSetItem(state, setListId, itemTitle, itemDescription, estimatedDurationSecs) {
    ensureState(state);
    var setList = state.setLists[setListId];
    if (!setList) return { success: false, reason: 'Set list not found' };

    var type = PERFORMANCE_TYPES[setList.perfType];
    if (setList.items.length >= type.maxSetItems) {
      return { success: false, reason: 'Set list is full (max ' + type.maxSetItems + ' items)' };
    }
    if (!itemTitle || typeof itemTitle !== 'string' || !itemTitle.trim()) {
      return { success: false, reason: 'Item title is required' };
    }
    var dur = typeof estimatedDurationSecs === 'number' ? Math.max(0, estimatedDurationSecs) : 0;

    var item = {
      id:           'item_' + Date.now() + '_' + setList.items.length,
      title:        itemTitle.trim(),
      description:  itemDescription || '',
      estimatedDurationSecs: dur,
      order:        setList.items.length
    };

    setList.items.push(item);
    setList.updatedAt = Date.now();
    return { success: true, item: item };
  }

  /**
   * Remove an item from a set list by index.
   */
  function removeSetItem(state, setListId, itemIndex) {
    ensureState(state);
    var setList = state.setLists[setListId];
    if (!setList) return { success: false, reason: 'Set list not found' };
    if (typeof itemIndex !== 'number' || itemIndex < 0 || itemIndex >= setList.items.length) {
      return { success: false, reason: 'Invalid item index' };
    }
    var removed = setList.items.splice(itemIndex, 1)[0];
    // Re-index remaining items
    for (var i = 0; i < setList.items.length; i++) {
      setList.items[i].order = i;
    }
    setList.updatedAt = Date.now();
    return { success: true, removed: removed };
  }

  /**
   * Reorder an item in the set list (move from one index to another).
   */
  function reorderSetItem(state, setListId, fromIndex, toIndex) {
    ensureState(state);
    var setList = state.setLists[setListId];
    if (!setList) return { success: false, reason: 'Set list not found' };
    var len = setList.items.length;
    if (fromIndex < 0 || fromIndex >= len || toIndex < 0 || toIndex >= len) {
      return { success: false, reason: 'Invalid index' };
    }
    if (fromIndex === toIndex) return { success: true, setList: setList };
    var item = setList.items.splice(fromIndex, 1)[0];
    setList.items.splice(toIndex, 0, item);
    // Re-index
    for (var i = 0; i < setList.items.length; i++) {
      setList.items[i].order = i;
    }
    setList.updatedAt = Date.now();
    return { success: true, setList: setList };
  }

  /**
   * Get total estimated duration of a set list in seconds.
   */
  function getSetListDuration(state, setListId) {
    ensureState(state);
    var setList = state.setLists[setListId];
    if (!setList) return 0;
    var total = 0;
    for (var i = 0; i < setList.items.length; i++) {
      total += setList.items[i].estimatedDurationSecs || 0;
    }
    return total;
  }

  // ---------------------------------------------------------------------------
  // Performance Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Start a performance.
   * Linked to a booked slot (optional) or started ad-hoc.
   * @param {object} state
   * @param {string} performerId
   * @param {string} stageId
   * @param {string} perfType
   * @param {string} title
   * @param {string} [setListId]  - optional set list to perform
   * @param {string} [slotId]     - optional pre-booked slot
   * @returns {{ success: boolean, performance?: object, reason?: string }}
   */
  function startPerformance(state, performerId, stageId, perfType, title, setListId, slotId) {
    ensureState(state);

    if (!performerId || typeof performerId !== 'string' || !performerId.trim()) {
      return { success: false, reason: 'Invalid performer ID' };
    }
    if (!STAGE_TYPES[stageId]) {
      return { success: false, reason: 'Unknown stage: ' + stageId };
    }
    if (!PERFORMANCE_TYPES[perfType]) {
      return { success: false, reason: 'Unknown performance type: ' + perfType };
    }

    var stage = STAGE_TYPES[stageId];
    if (stage.allowedTypes.indexOf(perfType) === -1) {
      return { success: false, reason: 'Stage does not support this performance type' };
    }
    if (!title || typeof title !== 'string' || !title.trim()) {
      return { success: false, reason: 'Title is required' };
    }

    // Check if performer already has an active performance
    for (var i = 0; i < state.performances.length; i++) {
      if (state.performances[i].performerId === performerId &&
          state.performances[i].status === 'active') {
        return { success: false, reason: 'Performer already has an active performance' };
      }
    }

    // Check if stage is already occupied
    for (var j = 0; j < state.performances.length; j++) {
      if (state.performances[j].stageId === stageId &&
          state.performances[j].status === 'active') {
        return { success: false, reason: 'Stage is already occupied' };
      }
    }

    // Validate set list if provided
    if (setListId) {
      var setList = state.setLists[setListId];
      if (!setList) return { success: false, reason: 'Set list not found' };
      if (setList.performerId !== performerId) {
        return { success: false, reason: 'Set list belongs to a different performer' };
      }
      var perfTypeDef = PERFORMANCE_TYPES[perfType];
      if (setList.items.length < perfTypeDef.minSetItems) {
        return { success: false, reason: 'Set list needs at least ' + perfTypeDef.minSetItems + ' item(s)' };
      }
    }

    // Link slot if provided
    if (slotId) {
      var slot = findSlot(state, slotId);
      if (!slot) return { success: false, reason: 'Slot not found' };
      if (slot.performerId !== performerId) {
        return { success: false, reason: 'Slot belongs to a different performer' };
      }
      if (slot.status === 'cancelled') {
        return { success: false, reason: 'Slot is cancelled' };
      }
      slot.status = 'active';
    }

    var performance = {
      id:           nextPerformanceId(),
      performerId:  performerId,
      stageId:      stageId,
      perfType:     perfType,
      title:        title.trim(),
      setListId:    setListId || null,
      slotId:       slotId || null,
      status:       'active',    // active | encore | completed | cancelled
      audienceIds:  [],          // player IDs currently in audience
      reactions:    [],          // array of reaction objects
      ratingCount:  0,
      ratingSum:    0,
      totalTips:    0,
      encoreVotes:  0,
      encorePlayed: false,
      startedAt:    Date.now(),
      endedAt:      null,
      currentItemIndex: 0,       // which set list item is being performed
      sparkEarned:  0
    };

    state.performances.push(performance);

    // Initialize tracking collections
    state.reactions[performance.id] = [];
    state.ratings[performance.id] = {};
    state.tipLedger[performance.id] = {};
    state.encoreRequests[performance.id] = {};
    state.audienceRecords[performance.id] = { joined: {}, peak: 0 };

    return { success: true, performance: performance };
  }

  /**
   * End a performance and finalize Spark earnings.
   * @param {object} state
   * @param {string} perfId
   * @param {string} performerId  - must match performance owner
   * @returns {{ success: boolean, summary?: object, reason?: string }}
   */
  function endPerformance(state, perfId, performerId) {
    ensureState(state);
    var perf = findPerformance(state, perfId);
    if (!perf) return { success: false, reason: 'Performance not found' };
    if (perf.performerId !== performerId) {
      return { success: false, reason: 'Only the performer can end the performance' };
    }
    if (perf.status !== 'active' && perf.status !== 'encore') {
      return { success: false, reason: 'Performance is not active' };
    }

    perf.status = 'completed';
    perf.endedAt = Date.now();

    // Link slot to completed
    if (perf.slotId) {
      var slot = findSlot(state, perf.slotId);
      if (slot) slot.status = 'completed';
    }

    // Compute performance rating
    var avgRating = perf.ratingCount > 0 ? perf.ratingSum / perf.ratingCount : 0;
    var audienceCount = perf.audienceIds.length;

    // Compute Spark earned per attendee based on rating
    // Rating of 0 = min, rating of 5 = max
    var ratingFactor = MAX_RATING > 0 ? (avgRating / MAX_RATING) : 0.5;
    var sparkPerHead = SPARK_PER_ATTENDEE_MIN +
      Math.floor((SPARK_PER_ATTENDEE_MAX - SPARK_PER_ATTENDEE_MIN) * ratingFactor);
    var cappedCount = Math.min(audienceCount, MAX_AUDIENCE_SPARK_CAP);

    // Acoustic bonus from stage
    var stage = STAGE_TYPES[perf.stageId];
    var acousticBonus = stage ? stage.acousticBonus : 1.0;
    var sparkFromShow = Math.floor(cappedCount * sparkPerHead * acousticBonus);

    // Add encore bonus
    var encoreBonus = perf.encorePlayed ? Math.floor(cappedCount * ENCORE_SPARK_BONUS) : 0;

    var totalSpark = sparkFromShow + encoreBonus;
    perf.sparkEarned = totalSpark;

    // Update performer profile
    var profile = getPerformerProfile(state, performerId);
    profile.totalShows += 1;
    profile.totalTipsReceived += perf.totalTips;
    if (perf.ratingCount > 0) {
      profile.ratingSum += perf.ratingSum;
      profile.ratingCount += perf.ratingCount;
      profile.reputation = profile.ratingSum / profile.ratingCount;
    }
    if (perf.encorePlayed) {
      profile.encoresEarned += 1;
    }
    profile.performanceHistory.push({
      perfId:        perf.id,
      type:          perf.perfType,
      title:         perf.title,
      rating:        avgRating,
      tipsReceived:  perf.totalTips,
      audienceCount: audienceCount,
      sparkEarned:   totalSpark,
      ts:            perf.endedAt
    });

    var summary = {
      perfId:        perf.id,
      performerId:   performerId,
      title:         perf.title,
      perfType:      perf.perfType,
      audienceCount: audienceCount,
      avgRating:     avgRating,
      ratingCount:   perf.ratingCount,
      totalTips:     perf.totalTips,
      sparkEarned:   totalSpark,
      encorePlayed:  perf.encorePlayed,
      durationMs:    perf.endedAt - perf.startedAt
    };

    return { success: true, summary: summary };
  }

  /**
   * Cancel an active performance (emergency stop).
   */
  function cancelPerformance(state, perfId, performerId) {
    ensureState(state);
    var perf = findPerformance(state, perfId);
    if (!perf) return { success: false, reason: 'Performance not found' };
    if (perf.performerId !== performerId) {
      return { success: false, reason: 'Only the performer can cancel the performance' };
    }
    if (perf.status !== 'active' && perf.status !== 'encore') {
      return { success: false, reason: 'Performance is not active' };
    }
    perf.status = 'cancelled';
    perf.endedAt = Date.now();

    if (perf.slotId) {
      var slot = findSlot(state, perf.slotId);
      if (slot) slot.status = 'cancelled';
    }
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // Audience System
  // ---------------------------------------------------------------------------

  /**
   * Join a performance as audience member.
   * @param {object} state
   * @param {string} perfId
   * @param {string} playerId
   * @returns {{ success: boolean, reason?: string }}
   */
  function joinAudience(state, perfId, playerId) {
    ensureState(state);
    var perf = findPerformance(state, perfId);
    if (!perf) return { success: false, reason: 'Performance not found' };
    if (perf.status !== 'active' && perf.status !== 'encore') {
      return { success: false, reason: 'Performance is not active' };
    }
    if (perf.performerId === playerId) {
      return { success: false, reason: 'Performer cannot join their own audience' };
    }

    var stage = STAGE_TYPES[perf.stageId];
    if (stage && perf.audienceIds.length >= stage.maxAudience) {
      return { success: false, reason: 'Stage is at full capacity' };
    }

    // Already in audience
    for (var i = 0; i < perf.audienceIds.length; i++) {
      if (perf.audienceIds[i] === playerId) {
        return { success: false, reason: 'Player is already in the audience' };
      }
    }

    perf.audienceIds.push(playerId);

    // Track in audience records
    if (!state.audienceRecords[perfId]) state.audienceRecords[perfId] = { joined: {}, peak: 0 };
    state.audienceRecords[perfId].joined[playerId] = Date.now();
    if (perf.audienceIds.length > state.audienceRecords[perfId].peak) {
      state.audienceRecords[perfId].peak = perf.audienceIds.length;
    }

    return { success: true };
  }

  /**
   * Leave a performance as audience member.
   */
  function leaveAudience(state, perfId, playerId) {
    ensureState(state);
    var perf = findPerformance(state, perfId);
    if (!perf) return { success: false, reason: 'Performance not found' };

    var idx = perf.audienceIds.indexOf(playerId);
    if (idx === -1) return { success: false, reason: 'Player is not in the audience' };

    perf.audienceIds.splice(idx, 1);
    return { success: true };
  }

  /**
   * Get current audience size for a performance.
   */
  function getAudienceCount(state, perfId) {
    var perf = findPerformance(state, perfId);
    if (!perf) return 0;
    return perf.audienceIds.length;
  }

  // ---------------------------------------------------------------------------
  // Crowd Reactions
  // ---------------------------------------------------------------------------

  /**
   * Send a reaction from an audience member.
   * Reactions aggregate into crowd mood affecting the performance score.
   * @param {object} state
   * @param {string} perfId
   * @param {string} playerId
   * @param {string} reactionType   - one of REACTION_TYPES
   * @returns {{ success: boolean, reason?: string }}
   */
  function sendReaction(state, perfId, playerId, reactionType) {
    ensureState(state);
    var perf = findPerformance(state, perfId);
    if (!perf) return { success: false, reason: 'Performance not found' };
    if (perf.status !== 'active' && perf.status !== 'encore') {
      return { success: false, reason: 'Performance is not active' };
    }
    if (REACTION_TYPES.indexOf(reactionType) === -1) {
      return { success: false, reason: 'Invalid reaction type: ' + reactionType };
    }

    // Audience members and performer can react
    var inAudience = perf.audienceIds.indexOf(playerId) !== -1;
    var isPerformer = perf.performerId === playerId;
    if (!inAudience && !isPerformer) {
      return { success: false, reason: 'Player is not part of this performance' };
    }

    var reaction = {
      id:           nextReactionId(),
      perfId:       perfId,
      playerId:     playerId,
      type:         reactionType,
      sentiment:    REACTION_SENTIMENT[reactionType] || 0.5,
      ts:           Date.now()
    };

    if (!state.reactions[perfId]) state.reactions[perfId] = [];
    state.reactions[perfId].push(reaction);
    perf.reactions.push(reaction);

    return { success: true, reaction: reaction };
  }

  /**
   * Compute the aggregate crowd mood for a performance (0.0 - 1.0).
   * Based on weighted average of reaction sentiments.
   */
  function getCrowdMood(state, perfId) {
    ensureState(state);
    var reactions = state.reactions[perfId] || [];
    if (reactions.length === 0) return 0.5; // neutral
    var total = 0;
    for (var i = 0; i < reactions.length; i++) {
      total += reactions[i].sentiment || 0;
    }
    return total / reactions.length;
  }

  /**
   * Get reaction breakdown counts for a performance.
   */
  function getReactionCounts(state, perfId) {
    ensureState(state);
    var reactions = state.reactions[perfId] || [];
    var counts = {};
    for (var i = 0; i < REACTION_TYPES.length; i++) {
      counts[REACTION_TYPES[i]] = 0;
    }
    for (var j = 0; j < reactions.length; j++) {
      var t = reactions[j].type;
      if (counts[t] !== undefined) counts[t] += 1;
    }
    return counts;
  }

  // ---------------------------------------------------------------------------
  // Spark Tipping
  // ---------------------------------------------------------------------------

  /**
   * Tip the performer with Spark.
   * Constitution §6.2: 5-20 Spark per attendee (the earn table for performing).
   * Tips are a separate bonus on top of the show earnings.
   * @param {object} state
   * @param {string} perfId
   * @param {string} tipperId    - audience member sending the tip
   * @param {number} amount      - Spark amount
   * @returns {{ success: boolean, reason?: string }}
   */
  function tipPerformer(state, perfId, tipperId, amount) {
    ensureState(state);
    var perf = findPerformance(state, perfId);
    if (!perf) return { success: false, reason: 'Performance not found' };
    if (perf.status !== 'active' && perf.status !== 'encore') {
      return { success: false, reason: 'Performance is not active' };
    }

    // Tipper must be in audience
    if (perf.audienceIds.indexOf(tipperId) === -1) {
      return { success: false, reason: 'Tipper must be in the audience' };
    }
    if (tipperId === perf.performerId) {
      return { success: false, reason: 'Cannot tip yourself' };
    }

    if (typeof amount !== 'number' || !isFinite(amount) || amount < TIP_MIN) {
      return { success: false, reason: 'Tip amount must be at least ' + TIP_MIN + ' Spark' };
    }
    if (amount > TIP_MAX) {
      return { success: false, reason: 'Tip amount exceeds maximum of ' + TIP_MAX + ' Spark' };
    }
    // Check per-performance cap
    if (!state.tipLedger[perfId]) state.tipLedger[perfId] = {};
    var alreadyTipped = state.tipLedger[perfId][tipperId] || 0;
    if (alreadyTipped + amount > TIP_CAP_PER_PERFORMANCE) {
      return { success: false, reason: 'Tip cap of ' + TIP_CAP_PER_PERFORMANCE + ' Spark per performance reached' };
    }

    // Floor to integer
    var tipAmount = Math.floor(amount);
    state.tipLedger[perfId][tipperId] = alreadyTipped + tipAmount;
    perf.totalTips += tipAmount;

    return { success: true, amount: tipAmount };
  }

  /**
   * Get total tips given by a specific player in a performance.
   */
  function getTipsByPlayer(state, perfId, playerId) {
    ensureState(state);
    if (!state.tipLedger[perfId]) return 0;
    return state.tipLedger[perfId][playerId] || 0;
  }

  // ---------------------------------------------------------------------------
  // Performance Rating
  // ---------------------------------------------------------------------------

  /**
   * Rate a completed performance (1-5 stars).
   * Audience members may rate after the show ends.
   * @param {object} state
   * @param {string} perfId
   * @param {string} raterId
   * @param {number} stars    - integer 1-5
   * @returns {{ success: boolean, reason?: string }}
   */
  function ratePerformance(state, perfId, raterId, stars) {
    ensureState(state);
    var perf = findPerformance(state, perfId);
    if (!perf) return { success: false, reason: 'Performance not found' };

    // Can rate active or completed performances
    if (perf.status === 'cancelled') {
      return { success: false, reason: 'Cannot rate a cancelled performance' };
    }

    // Only people who attended can rate
    var records = state.audienceRecords[perfId] || {};
    var wasInAudience = records.joined && records.joined[raterId];
    if (!wasInAudience && perf.audienceIds.indexOf(raterId) === -1) {
      return { success: false, reason: 'Only audience members can rate performances' };
    }

    if (typeof stars !== 'number' || !Number.isInteger(stars) || stars < MIN_RATING || stars > MAX_RATING) {
      return { success: false, reason: 'Rating must be an integer between ' + MIN_RATING + ' and ' + MAX_RATING };
    }

    if (!state.ratings[perfId]) state.ratings[perfId] = {};
    if (state.ratings[perfId][raterId] !== undefined) {
      return { success: false, reason: 'Player has already rated this performance' };
    }

    state.ratings[perfId][raterId] = stars;
    perf.ratingSum += stars;
    perf.ratingCount += 1;

    return { success: true };
  }

  /**
   * Get the average rating for a performance.
   */
  function getPerformanceRating(state, perfId) {
    var perf = findPerformance(state, perfId);
    if (!perf || perf.ratingCount === 0) return 0;
    return perf.ratingSum / perf.ratingCount;
  }

  // ---------------------------------------------------------------------------
  // Encore Mechanic
  // ---------------------------------------------------------------------------

  /**
   * Request an encore from the audience.
   * If 70%+ of current audience votes encore, trigger bonus set.
   * @param {object} state
   * @param {string} perfId
   * @param {string} playerId
   * @returns {{ success: boolean, encoreTriggered?: boolean, reason?: string }}
   */
  function requestEncore(state, perfId, playerId) {
    ensureState(state);
    var perf = findPerformance(state, perfId);
    if (!perf) return { success: false, reason: 'Performance not found' };
    if (perf.status !== 'active') {
      return { success: false, reason: 'Encore can only be requested during an active performance' };
    }
    if (perf.encorePlayed) {
      return { success: false, reason: 'Encore has already been played' };
    }

    // Must be audience member
    if (perf.audienceIds.indexOf(playerId) === -1) {
      return { success: false, reason: 'Only audience members can request an encore' };
    }

    if (!state.encoreRequests[perfId]) state.encoreRequests[perfId] = {};
    if (state.encoreRequests[perfId][playerId]) {
      return { success: false, reason: 'Player has already requested an encore' };
    }

    state.encoreRequests[perfId][playerId] = true;
    perf.encoreVotes += 1;

    // Check threshold: 70%+ of current audience
    var audienceSize = perf.audienceIds.length;
    var encoreTriggered = false;
    if (audienceSize > 0) {
      var voteRatio = perf.encoreVotes / audienceSize;
      if (voteRatio >= ENCORE_THRESHOLD) {
        perf.encorePlayed = true;
        perf.status = 'encore';
        encoreTriggered = true;
      }
    }

    return { success: true, encoreTriggered: encoreTriggered, voteRatio: perf.encoreVotes / Math.max(1, audienceSize) };
  }

  /**
   * End the encore phase (performer ends it voluntarily).
   */
  function endEncore(state, perfId, performerId) {
    ensureState(state);
    var perf = findPerformance(state, perfId);
    if (!perf) return { success: false, reason: 'Performance not found' };
    if (perf.performerId !== performerId) {
      return { success: false, reason: 'Only the performer can end the encore' };
    }
    if (perf.status !== 'encore') {
      return { success: false, reason: 'Performance is not in encore phase' };
    }
    perf.status = 'active';
    return { success: true };
  }

  /**
   * Get encore vote ratio for a performance.
   */
  function getEncoreVoteRatio(state, perfId) {
    ensureState(state);
    var perf = findPerformance(state, perfId);
    if (!perf || perf.audienceIds.length === 0) return 0;
    return perf.encoreVotes / perf.audienceIds.length;
  }

  // ---------------------------------------------------------------------------
  // Set List Progress
  // ---------------------------------------------------------------------------

  /**
   * Advance to the next item in the set list.
   * @param {object} state
   * @param {string} perfId
   * @param {string} performerId
   * @returns {{ success: boolean, currentItem?: object, reason?: string, finished?: boolean }}
   */
  function advanceSetList(state, perfId, performerId) {
    ensureState(state);
    var perf = findPerformance(state, perfId);
    if (!perf) return { success: false, reason: 'Performance not found' };
    if (perf.performerId !== performerId) {
      return { success: false, reason: 'Only the performer can advance the set list' };
    }
    if (!perf.setListId) return { success: false, reason: 'No set list attached to this performance' };

    var setList = state.setLists[perf.setListId];
    if (!setList) return { success: false, reason: 'Set list not found' };

    if (perf.currentItemIndex >= setList.items.length - 1) {
      return { success: true, finished: true, currentItem: null };
    }

    perf.currentItemIndex += 1;
    return { success: true, finished: false, currentItem: setList.items[perf.currentItemIndex] };
  }

  /**
   * Get the currently performing item from the set list.
   */
  function getCurrentSetItem(state, perfId) {
    ensureState(state);
    var perf = findPerformance(state, perfId);
    if (!perf || !perf.setListId) return null;
    var setList = state.setLists[perf.setListId];
    if (!setList || setList.items.length === 0) return null;
    return setList.items[perf.currentItemIndex] || null;
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  /**
   * Get all active performances.
   */
  function getActivePerformances(state) {
    ensureState(state);
    var result = [];
    for (var i = 0; i < state.performances.length; i++) {
      var p = state.performances[i];
      if (p.status === 'active' || p.status === 'encore') result.push(p);
    }
    return result;
  }

  /**
   * Get performance history for a performer (from profile).
   */
  function getPerformerHistory(state, performerId) {
    ensureState(state);
    var profile = state.performerProfiles[performerId];
    if (!profile) return [];
    return profile.performanceHistory.slice();
  }

  /**
   * Get all completed performances sorted by rating descending.
   */
  function getTopPerformances(state, limit) {
    ensureState(state);
    var completed = state.performances.filter(function(p) {
      return p.status === 'completed' && p.ratingCount > 0;
    });
    completed.sort(function(a, b) {
      var ratingA = a.ratingSum / a.ratingCount;
      var ratingB = b.ratingSum / b.ratingCount;
      return ratingB - ratingA;
    });
    return completed.slice(0, limit || 10);
  }

  /**
   * Get leaderboard of performers by average rating.
   */
  function getPerformerLeaderboard(state, limit) {
    ensureState(state);
    var results = [];
    for (var id in state.performerProfiles) {
      var profile = state.performerProfiles[id];
      results.push({
        performerId: profile.performerId,
        avgRating:   profile.ratingCount > 0 ? profile.ratingSum / profile.ratingCount : 0,
        totalShows:  profile.totalShows,
        totalTips:   profile.totalTipsReceived,
        encoresEarned: profile.encoresEarned
      });
    }
    results.sort(function(a, b) { return b.avgRating - a.avgRating; });
    return results.slice(0, limit || 10);
  }

  /**
   * Get performances by type.
   */
  function getPerformancesByType(state, perfType) {
    ensureState(state);
    return state.performances.filter(function(p) {
      return p.perfType === perfType;
    });
  }

  /**
   * Get performances on a specific stage.
   */
  function getPerformancesByStage(state, stageId) {
    ensureState(state);
    return state.performances.filter(function(p) {
      return p.stageId === stageId;
    });
  }

  /**
   * Check if a player is currently in any audience.
   */
  function isInAudience(state, playerId) {
    ensureState(state);
    for (var i = 0; i < state.performances.length; i++) {
      var p = state.performances[i];
      if ((p.status === 'active' || p.status === 'encore') &&
          p.audienceIds.indexOf(playerId) !== -1) {
        return true;
      }
    }
    return false;
  }

  /**
   * Compute a performance score based on crowd mood, rating, and audience size.
   * Returns a value 0-100.
   */
  function computePerformanceScore(state, perfId) {
    ensureState(state);
    var perf = findPerformance(state, perfId);
    if (!perf) return 0;

    var crowdMood = getCrowdMood(state, perfId);                // 0-1
    var avgRating = perf.ratingCount > 0 ? perf.ratingSum / perf.ratingCount : 0;
    var ratingNorm = avgRating / MAX_RATING;                    // 0-1
    var audienceNorm = Math.min(perf.audienceIds.length / 50, 1); // normalize to 50 audience = full

    // Weighted score
    var score = (crowdMood * 40) + (ratingNorm * 40) + (audienceNorm * 20);
    return Math.round(score * 100) / 100; // round to 2 decimal places
  }

  // ---------------------------------------------------------------------------
  // Deterministic helpers using mulberry32
  // ---------------------------------------------------------------------------

  /**
   * Deterministically pick a random audience reaction for an NPC audience member.
   * Seed based on performanceId + playerId for reproducibility.
   */
  function generateNpcReaction(perfId, npcId, seed) {
    var s = seed || (perfId.length * 1000 + npcId.length * 17);
    var rng = mulberry32(s);
    var idx = Math.floor(rng() * REACTION_TYPES.length);
    return REACTION_TYPES[idx];
  }

  /**
   * Deterministically generate a rating for an NPC audience member.
   */
  function generateNpcRating(perfId, npcId, crowdMood, seed) {
    var s = seed || (perfId.length * 1337 + npcId.length * 42);
    var rng = mulberry32(s);
    // Higher crowd mood = higher probability of 4-5 stars
    var raw = rng();
    var adjusted = raw * 0.5 + crowdMood * 0.5;
    var stars = Math.max(1, Math.min(5, Math.ceil(adjusted * 5)));
    return stars;
  }

  // ---------------------------------------------------------------------------
  // State initialization
  // ---------------------------------------------------------------------------

  /**
   * Create a fresh performance stage state.
   */
  function createState() {
    return {
      performances:      [],
      scheduledSlots:    [],
      setLists:          {},
      performerProfiles: {},
      audienceRecords:   {},
      reactions:         {},
      ratings:           {},
      tipLedger:         {},
      encoreRequests:    {}
    };
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  exports.PERFORMANCE_TYPES      = PERFORMANCE_TYPES;
  exports.STAGE_TYPES            = STAGE_TYPES;
  exports.REACTION_TYPES         = REACTION_TYPES;
  exports.REACTION_SENTIMENT     = REACTION_SENTIMENT;
  exports.ENCORE_THRESHOLD       = ENCORE_THRESHOLD;
  exports.SPARK_PER_ATTENDEE_MIN = SPARK_PER_ATTENDEE_MIN;
  exports.SPARK_PER_ATTENDEE_MAX = SPARK_PER_ATTENDEE_MAX;
  exports.TIP_MIN                = TIP_MIN;
  exports.TIP_MAX                = TIP_MAX;
  exports.TIP_CAP_PER_PERFORMANCE= TIP_CAP_PER_PERFORMANCE;
  exports.MIN_SLOT_DURATION      = MIN_SLOT_DURATION;
  exports.MAX_SLOT_DURATION      = MAX_SLOT_DURATION;
  exports.MIN_RATING             = MIN_RATING;
  exports.MAX_RATING             = MAX_RATING;

  // State
  exports.createState            = createState;
  exports.ensureState            = ensureState;

  // Performer profile
  exports.getPerformerProfile    = getPerformerProfile;
  exports.getAverageRating       = getAverageRating;

  // Scheduling
  exports.bookSlot               = bookSlot;
  exports.cancelSlot             = cancelSlot;
  exports.getUpcomingSlots       = getUpcomingSlots;

  // Set lists
  exports.createSetList          = createSetList;
  exports.addSetItem             = addSetItem;
  exports.removeSetItem          = removeSetItem;
  exports.reorderSetItem         = reorderSetItem;
  exports.getSetListDuration     = getSetListDuration;

  // Performance lifecycle
  exports.startPerformance       = startPerformance;
  exports.endPerformance         = endPerformance;
  exports.cancelPerformance      = cancelPerformance;
  exports.advanceSetList         = advanceSetList;
  exports.getCurrentSetItem      = getCurrentSetItem;

  // Audience
  exports.joinAudience           = joinAudience;
  exports.leaveAudience          = leaveAudience;
  exports.getAudienceCount       = getAudienceCount;
  exports.isInAudience           = isInAudience;

  // Reactions
  exports.sendReaction           = sendReaction;
  exports.getCrowdMood           = getCrowdMood;
  exports.getReactionCounts      = getReactionCounts;

  // Tipping
  exports.tipPerformer           = tipPerformer;
  exports.getTipsByPlayer        = getTipsByPlayer;

  // Rating
  exports.ratePerformance        = ratePerformance;
  exports.getPerformanceRating   = getPerformanceRating;

  // Encore
  exports.requestEncore          = requestEncore;
  exports.endEncore              = endEncore;
  exports.getEncoreVoteRatio     = getEncoreVoteRatio;

  // Queries
  exports.getActivePerformances  = getActivePerformances;
  exports.getPerformerHistory    = getPerformerHistory;
  exports.getTopPerformances     = getTopPerformances;
  exports.getPerformerLeaderboard= getPerformerLeaderboard;
  exports.getPerformancesByType  = getPerformancesByType;
  exports.getPerformancesByStage = getPerformancesByStage;
  exports.computePerformanceScore= computePerformanceScore;

  // Deterministic helpers
  exports.mulberry32             = mulberry32;
  exports.generateNpcReaction    = generateNpcReaction;
  exports.generateNpcRating      = generateNpcRating;

  // Internal helpers exposed for testing
  exports.findPerformance        = findPerformance;
  exports.findSlot               = findSlot;

})(typeof module !== 'undefined' ? module.exports : (window.PerformanceStage = {}));
