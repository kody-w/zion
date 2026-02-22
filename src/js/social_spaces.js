/**
 * ZION MMO - Social Spaces Module
 *
 * Manages public social gathering spaces: campfire gatherings, outdoor
 * performances, community feasts, and Nexus bulletin board posts.
 * Enables players to create and attend public events.
 *
 * Per ZION Constitution §6.2: hosts earn Spark per attendee; attendees
 * earn a smaller reward for participating in community gatherings.
 */
(function(exports) {
  'use strict';

  // ─── Gathering type definitions ────────────────────────────────────────────

  var GATHERING_TYPES = [
    {
      id: 'campfire',
      name: 'Campfire Gathering',
      description: 'A cozy campfire for stories and songs',
      maxAttendees: 12,
      sparkPerAttendee: 5,
      attendeeReward: 3,
      minDuration: 60,
      maxDuration: 600,
      allowedZones: ['wilds', 'gardens', 'commons'],
      category: 'social'
    },
    {
      id: 'concert',
      name: 'Live Concert',
      description: 'A music performance for the community',
      maxAttendees: 50,
      sparkPerAttendee: 4,
      attendeeReward: 2,
      minDuration: 60,
      maxDuration: 480,
      allowedZones: ['studio', 'commons'],
      category: 'performance'
    },
    {
      id: 'feast',
      name: 'Community Feast',
      description: 'A community meal and cooking event',
      maxAttendees: 30,
      sparkPerAttendee: 6,
      attendeeReward: 4,
      minDuration: 120,
      maxDuration: 720,
      allowedZones: ['gardens', 'commons', 'agora'],
      category: 'feast'
    },
    {
      id: 'lecture',
      name: 'Public Lecture',
      description: 'A teaching and education event',
      maxAttendees: 40,
      sparkPerAttendee: 8,
      attendeeReward: 5,
      minDuration: 60,
      maxDuration: 360,
      allowedZones: ['athenaeum'],
      category: 'education'
    },
    {
      id: 'town_hall',
      name: 'Town Hall Meeting',
      description: 'A political and election discussion',
      maxAttendees: 100,
      sparkPerAttendee: 3,
      attendeeReward: 2,
      minDuration: 120,
      maxDuration: 600,
      allowedZones: ['nexus', 'agora'],
      category: 'ceremony'
    },
    {
      id: 'market_fair',
      name: 'Market Fair',
      description: 'A trading bazaar for merchants and shoppers',
      maxAttendees: 60,
      sparkPerAttendee: 4,
      attendeeReward: 2,
      minDuration: 180,
      maxDuration: 900,
      allowedZones: ['agora'],
      category: 'market'
    },
    {
      id: 'tournament_viewing',
      name: 'Tournament Viewing',
      description: 'Watch arena events together',
      maxAttendees: 80,
      sparkPerAttendee: 3,
      attendeeReward: 2,
      minDuration: 60,
      maxDuration: 480,
      allowedZones: ['arena'],
      category: 'competition'
    },
    {
      id: 'festival',
      name: 'Zone Festival',
      description: 'A zone-wide celebration',
      maxAttendees: 200,
      sparkPerAttendee: 5,
      attendeeReward: 3,
      minDuration: 240,
      maxDuration: 1200,
      allowedZones: ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'],
      category: 'celebration'
    }
  ];

  // ─── Valid zone names ───────────────────────────────────────────────────────

  var VALID_ZONES = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];

  // ─── Valid bulletin categories ─────────────────────────────────────────────

  var VALID_BULLETIN_CATEGORIES = ['lfg', 'announcement', 'trade', 'event', 'lore', 'art'];

  // ─── Valid activity types ──────────────────────────────────────────────────

  var VALID_ACTIVITIES = ['tell_story', 'play_music', 'share_meal', 'teach', 'toast'];

  // ─── Internal counters ─────────────────────────────────────────────────────

  var gatheringCounter = 0;
  var bulletinCounter = 0;

  // ─── Helper: find a gathering type by id ───────────────────────────────────

  function getGatheringType(typeId) {
    for (var i = 0; i < GATHERING_TYPES.length; i++) {
      if (GATHERING_TYPES[i].id === typeId) {
        return GATHERING_TYPES[i];
      }
    }
    return null;
  }

  // ─── Helper: find a gathering in state by id ──────────────────────────────

  function findGathering(state, gatheringId) {
    if (!state || !state.gatherings) return null;
    for (var i = 0; i < state.gatherings.length; i++) {
      if (state.gatherings[i].id === gatheringId) {
        return state.gatherings[i];
      }
    }
    return null;
  }

  // ─── Helper: find a bulletin in state by id ───────────────────────────────

  function findBulletin(state, postId) {
    if (!state || !state.bulletins) return null;
    for (var i = 0; i < state.bulletins.length; i++) {
      if (state.bulletins[i].id === postId) {
        return state.bulletins[i];
      }
    }
    return null;
  }

  // ─── Helper: ensure state has required collections ────────────────────────

  function ensureState(state) {
    if (!state) return;
    if (!state.gatherings) state.gatherings = [];
    if (!state.bulletins) state.bulletins = [];
    if (!state.gatheringHistory) state.gatheringHistory = {};
    if (!state.hostStats) state.hostStats = {};
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Gathering Functions
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a new gathering event.
   * @param {object} state - World state
   * @param {string} hostId - ID of the hosting player
   * @param {string} type - Gathering type ID
   * @param {string} zone - Zone where gathering takes place
   * @param {string} title - Display title for the gathering
   * @param {string} description - Description of the gathering
   * @param {number} startTick - World tick when gathering begins (if scheduled)
   * @param {number} duration - Duration in ticks
   * @returns {{success: boolean, gathering?: object, reason?: string}}
   */
  function createGathering(state, hostId, type, zone, title, description, startTick, duration) {
    ensureState(state);

    if (!hostId || typeof hostId !== 'string' || hostId.trim() === '') {
      return { success: false, reason: 'Invalid host ID' };
    }
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return { success: false, reason: 'Title is required' };
    }

    var typeData = getGatheringType(type);
    if (!typeData) {
      return { success: false, reason: 'Unknown gathering type: ' + type };
    }

    if (!zone || VALID_ZONES.indexOf(zone) === -1) {
      return { success: false, reason: 'Invalid zone: ' + zone };
    }

    if (typeData.allowedZones.indexOf(zone) === -1) {
      return { success: false, reason: 'Gathering type "' + type + '" is not allowed in zone "' + zone + '"' };
    }

    if (typeof duration !== 'number' || duration < typeData.minDuration) {
      return { success: false, reason: 'Duration too short. Minimum: ' + typeData.minDuration };
    }
    if (duration > typeData.maxDuration) {
      return { success: false, reason: 'Duration too long. Maximum: ' + typeData.maxDuration };
    }

    gatheringCounter++;
    var gatheringId = 'gathering_' + gatheringCounter;
    var resolvedStartTick = (typeof startTick === 'number') ? startTick : 0;
    var status = (typeof startTick === 'number' && startTick > 0) ? 'scheduled' : 'active';

    var gathering = {
      id: gatheringId,
      type: type,
      hostId: hostId,
      zone: zone,
      title: title.trim(),
      description: (description || '').trim(),
      attendees: [hostId],
      startTick: resolvedStartTick,
      endTick: resolvedStartTick + duration,
      status: status,
      sparkEarned: { host: 0, attendees: {} },
      activities: []
    };

    state.gatherings.push(gathering);
    return { success: true, gathering: gathering };
  }

  /**
   * Player joins an existing gathering.
   * @param {object} state - World state
   * @param {string} playerId - ID of the player joining
   * @param {string} gatheringId - ID of the gathering
   * @returns {{success: boolean, reason?: string}}
   */
  function joinGathering(state, playerId, gatheringId) {
    ensureState(state);

    if (!playerId) return { success: false, reason: 'Invalid player ID' };

    var gathering = findGathering(state, gatheringId);
    if (!gathering) {
      return { success: false, reason: 'Gathering not found: ' + gatheringId };
    }

    if (gathering.status === 'completed') {
      return { success: false, reason: 'Gathering has already ended' };
    }
    if (gathering.status === 'cancelled') {
      return { success: false, reason: 'Gathering has been cancelled' };
    }

    if (gathering.attendees.indexOf(playerId) !== -1) {
      return { success: false, reason: 'Already joined this gathering' };
    }

    var typeData = getGatheringType(gathering.type);
    if (typeData && gathering.attendees.length >= typeData.maxAttendees) {
      return { success: false, reason: 'Gathering is full' };
    }

    gathering.attendees.push(playerId);
    return { success: true };
  }

  /**
   * Player leaves a gathering.
   * @param {object} state - World state
   * @param {string} playerId - ID of the player leaving
   * @param {string} gatheringId - ID of the gathering
   * @returns {{success: boolean, reason?: string}}
   */
  function leaveGathering(state, playerId, gatheringId) {
    ensureState(state);

    if (!playerId) return { success: false, reason: 'Invalid player ID' };

    var gathering = findGathering(state, gatheringId);
    if (!gathering) {
      return { success: false, reason: 'Gathering not found: ' + gatheringId };
    }

    var idx = gathering.attendees.indexOf(playerId);
    if (idx === -1) {
      return { success: false, reason: 'Player is not attending this gathering' };
    }

    gathering.attendees.splice(idx, 1);
    return { success: true };
  }

  /**
   * Transition a gathering from scheduled to active.
   * @param {object} state - World state
   * @param {string} gatheringId - ID of the gathering
   * @param {number} currentTick - Current world tick
   * @returns {{success: boolean, reason?: string}}
   */
  function startGathering(state, gatheringId, currentTick) {
    ensureState(state);

    var gathering = findGathering(state, gatheringId);
    if (!gathering) {
      return { success: false, reason: 'Gathering not found: ' + gatheringId };
    }

    if (gathering.status !== 'scheduled') {
      return { success: false, reason: 'Gathering is not in scheduled state (current: ' + gathering.status + ')' };
    }

    gathering.status = 'active';
    if (typeof currentTick === 'number') {
      gathering.startTick = currentTick;
      var typeData = getGatheringType(gathering.type);
      var duration = gathering.endTick - gathering.startTick;
      // Recalculate endTick from new startTick + original duration if duration was set
      gathering.endTick = currentTick + (duration > 0 ? duration : (typeData ? typeData.minDuration : 60));
    }
    return { success: true };
  }

  /**
   * End a gathering and distribute Spark rewards.
   * Host earns sparkPerAttendee * number of non-host attendees.
   * Each attendee earns attendeeReward.
   * @param {object} state - World state
   * @param {string} gatheringId - ID of the gathering
   * @param {number} currentTick - Current world tick
   * @returns {{success: boolean, rewards?: object, reason?: string}}
   */
  function endGathering(state, gatheringId, currentTick) {
    ensureState(state);

    var gathering = findGathering(state, gatheringId);
    if (!gathering) {
      return { success: false, reason: 'Gathering not found: ' + gatheringId };
    }

    if (gathering.status === 'completed') {
      return { success: false, reason: 'Gathering already ended' };
    }
    if (gathering.status === 'cancelled') {
      return { success: false, reason: 'Gathering was cancelled' };
    }

    var typeData = getGatheringType(gathering.type);
    var sparkPerAttendee = typeData ? typeData.sparkPerAttendee : 0;
    var attendeeReward = typeData ? typeData.attendeeReward : 0;

    // Count non-host attendees
    var nonHostAttendees = [];
    for (var i = 0; i < gathering.attendees.length; i++) {
      if (gathering.attendees[i] !== gathering.hostId) {
        nonHostAttendees.push(gathering.attendees[i]);
      }
    }

    var hostReward = sparkPerAttendee * nonHostAttendees.length;
    var attendeeRewards = {};
    for (var j = 0; j < nonHostAttendees.length; j++) {
      attendeeRewards[nonHostAttendees[j]] = attendeeReward;
    }

    gathering.sparkEarned.host = hostReward;
    for (var k = 0; k < nonHostAttendees.length; k++) {
      gathering.sparkEarned.attendees[nonHostAttendees[k]] = attendeeReward;
    }

    gathering.status = 'completed';
    if (typeof currentTick === 'number') {
      gathering.endTick = currentTick;
    }

    // Update host stats
    if (!state.hostStats[gathering.hostId]) {
      state.hostStats[gathering.hostId] = { eventsHosted: 0, totalAttendees: 0, sparkEarned: 0 };
    }
    state.hostStats[gathering.hostId].eventsHosted++;
    state.hostStats[gathering.hostId].totalAttendees += nonHostAttendees.length;
    state.hostStats[gathering.hostId].sparkEarned += hostReward;

    // Update gathering history for all attendees
    for (var m = 0; m < gathering.attendees.length; m++) {
      var pid = gathering.attendees[m];
      if (!state.gatheringHistory[pid]) {
        state.gatheringHistory[pid] = [];
      }
      state.gatheringHistory[pid].push({
        gatheringId: gathering.id,
        type: gathering.type,
        zone: gathering.zone,
        title: gathering.title,
        endTick: gathering.endTick,
        role: (pid === gathering.hostId) ? 'host' : 'attendee',
        sparkEarned: (pid === gathering.hostId) ? hostReward : attendeeReward
      });
    }

    return {
      success: true,
      rewards: {
        hostReward: hostReward,
        attendeeRewards: attendeeRewards
      }
    };
  }

  /**
   * Cancel a gathering (host only).
   * @param {object} state - World state
   * @param {string} hostId - ID of the host (must match gathering's hostId)
   * @param {string} gatheringId - ID of the gathering
   * @returns {{success: boolean, reason?: string}}
   */
  function cancelGathering(state, hostId, gatheringId) {
    ensureState(state);

    if (!hostId) return { success: false, reason: 'Invalid host ID' };

    var gathering = findGathering(state, gatheringId);
    if (!gathering) {
      return { success: false, reason: 'Gathering not found: ' + gatheringId };
    }

    if (gathering.hostId !== hostId) {
      return { success: false, reason: 'Only the host can cancel a gathering' };
    }

    if (gathering.status === 'completed') {
      return { success: false, reason: 'Cannot cancel a completed gathering' };
    }
    if (gathering.status === 'cancelled') {
      return { success: false, reason: 'Gathering already cancelled' };
    }

    gathering.status = 'cancelled';
    return { success: true };
  }

  /**
   * Return active gatherings, optionally filtered by zone.
   * @param {object} state - World state
   * @param {string|null} zone - Zone to filter by, or null for all zones
   * @returns {Array}
   */
  function getActiveGatherings(state, zone) {
    ensureState(state);

    var results = [];
    for (var i = 0; i < state.gatherings.length; i++) {
      var g = state.gatherings[i];
      if (g.status !== 'active') continue;
      if (zone && g.zone !== zone) continue;
      results.push(g);
    }
    return results;
  }

  /**
   * Return scheduled (upcoming) gatherings, optionally filtered by zone.
   * @param {object} state - World state
   * @param {string|null} zone - Zone to filter by, or null for all zones
   * @returns {Array}
   */
  function getScheduledGatherings(state, zone) {
    ensureState(state);

    var results = [];
    for (var i = 0; i < state.gatherings.length; i++) {
      var g = state.gatherings[i];
      if (g.status !== 'scheduled') continue;
      if (zone && g.zone !== zone) continue;
      results.push(g);
    }
    return results;
  }

  /**
   * Return a gathering by its ID.
   * @param {object} state - World state
   * @param {string} gatheringId - ID of the gathering
   * @returns {object|null}
   */
  function getGatheringById(state, gatheringId) {
    return findGathering(state, gatheringId);
  }

  /**
   * Log an activity during a gathering.
   * @param {object} state - World state
   * @param {string} gatheringId - ID of the gathering
   * @param {string} playerId - ID of the player performing the activity
   * @param {string} activityType - Type of activity
   * @param {object} data - Optional activity data
   * @returns {{success: boolean, activity?: object, reason?: string}}
   */
  function addActivity(state, gatheringId, playerId, activityType, data) {
    ensureState(state);

    if (!playerId) return { success: false, reason: 'Invalid player ID' };

    var gathering = findGathering(state, gatheringId);
    if (!gathering) {
      return { success: false, reason: 'Gathering not found: ' + gatheringId };
    }

    if (gathering.status !== 'active') {
      return { success: false, reason: 'Can only add activities to active gatherings' };
    }

    if (gathering.attendees.indexOf(playerId) === -1) {
      return { success: false, reason: 'Player is not attending this gathering' };
    }

    if (!activityType || VALID_ACTIVITIES.indexOf(activityType) === -1) {
      return { success: false, reason: 'Invalid activity type: ' + activityType };
    }

    var activity = {
      playerId: playerId,
      activityType: activityType,
      data: data || {},
      timestamp: Date.now()
    };

    gathering.activities.push(activity);
    return { success: true, activity: activity };
  }

  /**
   * Return a player's gathering attendance history.
   * @param {object} state - World state
   * @param {string} playerId - ID of the player
   * @returns {Array}
   */
  function getGatheringHistory(state, playerId) {
    ensureState(state);
    if (!playerId) return [];
    return state.gatheringHistory[playerId] || [];
  }

  /**
   * Return a player's hosting statistics.
   * @param {object} state - World state
   * @param {string} playerId - ID of the player
   * @returns {{eventsHosted: number, totalAttendees: number, sparkEarned: number}}
   */
  function getHostStats(state, playerId) {
    ensureState(state);
    if (!playerId) return { eventsHosted: 0, totalAttendees: 0, sparkEarned: 0 };
    return state.hostStats[playerId] || { eventsHosted: 0, totalAttendees: 0, sparkEarned: 0 };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Bulletin Board Functions
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a bulletin board post.
   * @param {object} state - World state
   * @param {string} playerId - ID of the posting player
   * @param {string} zone - Zone bulletin board to post on
   * @param {string} title - Post title
   * @param {string} content - Post content
   * @param {string} category - Post category
   * @param {number} duration - Ticks until expiry
   * @returns {{success: boolean, post?: object, reason?: string}}
   */
  function postBulletin(state, playerId, zone, title, content, category, duration) {
    ensureState(state);

    if (!playerId || typeof playerId !== 'string' || playerId.trim() === '') {
      return { success: false, reason: 'Invalid player ID' };
    }
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return { success: false, reason: 'Title is required' };
    }
    if (!content || typeof content !== 'string' || content.trim() === '') {
      return { success: false, reason: 'Content is required' };
    }

    if (!zone || VALID_ZONES.indexOf(zone) === -1) {
      return { success: false, reason: 'Invalid zone: ' + zone };
    }

    if (!category || VALID_BULLETIN_CATEGORIES.indexOf(category) === -1) {
      return { success: false, reason: 'Invalid category: ' + category };
    }

    var postedAt = 0; // Default tick — callers can set currentTick for real use
    var expiryDuration = (typeof duration === 'number' && duration > 0) ? duration : 1000;

    bulletinCounter++;
    var postId = 'post_' + bulletinCounter;

    var post = {
      id: postId,
      authorId: playerId,
      zone: zone,
      title: title.trim(),
      content: content.trim(),
      category: category,
      postedAt: postedAt,
      expiresAt: postedAt + expiryDuration,
      replies: [],
      pinned: false,
      likes: 0,
      likedBy: []
    };

    state.bulletins.push(post);
    return { success: true, post: post };
  }

  /**
   * Return bulletin board posts for a zone, optionally filtered by category.
   * @param {object} state - World state
   * @param {string} zone - Zone to get bulletins for
   * @param {string|null} category - Optional category filter
   * @returns {Array}
   */
  function getBulletins(state, zone, category) {
    ensureState(state);

    var results = [];
    for (var i = 0; i < state.bulletins.length; i++) {
      var post = state.bulletins[i];
      if (zone && post.zone !== zone) continue;
      if (category && post.category !== category) continue;
      results.push(post);
    }

    // Pinned posts first, then by most recent (highest postedAt)
    results.sort(function(a, b) {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.postedAt - a.postedAt;
    });

    return results;
  }

  /**
   * Add a reply to a bulletin post.
   * @param {object} state - World state
   * @param {string} playerId - ID of the replying player
   * @param {string} postId - ID of the bulletin post
   * @param {string} content - Reply content
   * @returns {{success: boolean, reply?: object, reason?: string}}
   */
  function replyToBulletin(state, playerId, postId, content) {
    ensureState(state);

    if (!playerId) return { success: false, reason: 'Invalid player ID' };
    if (!content || typeof content !== 'string' || content.trim() === '') {
      return { success: false, reason: 'Reply content is required' };
    }

    var post = findBulletin(state, postId);
    if (!post) {
      return { success: false, reason: 'Post not found: ' + postId };
    }

    var reply = {
      authorId: playerId,
      content: content.trim(),
      timestamp: Date.now()
    };

    post.replies.push(reply);
    return { success: true, reply: reply };
  }

  /**
   * Like a bulletin post (one like per player).
   * @param {object} state - World state
   * @param {string} playerId - ID of the player liking the post
   * @param {string} postId - ID of the bulletin post
   * @returns {{success: boolean, reason?: string}}
   */
  function likeBulletin(state, playerId, postId) {
    ensureState(state);

    if (!playerId) return { success: false, reason: 'Invalid player ID' };

    var post = findBulletin(state, postId);
    if (!post) {
      return { success: false, reason: 'Post not found: ' + postId };
    }

    if (post.likedBy.indexOf(playerId) !== -1) {
      return { success: false, reason: 'Already liked this post' };
    }

    post.likedBy.push(playerId);
    post.likes++;
    return { success: true };
  }

  /**
   * Delete own bulletin post.
   * @param {object} state - World state
   * @param {string} playerId - ID of the player (must be author)
   * @param {string} postId - ID of the bulletin post
   * @returns {{success: boolean, reason?: string}}
   */
  function deleteBulletin(state, playerId, postId) {
    ensureState(state);

    if (!playerId) return { success: false, reason: 'Invalid player ID' };

    var post = findBulletin(state, postId);
    if (!post) {
      return { success: false, reason: 'Post not found: ' + postId };
    }

    if (post.authorId !== playerId) {
      return { success: false, reason: 'Can only delete your own posts' };
    }

    var idx = -1;
    for (var i = 0; i < state.bulletins.length; i++) {
      if (state.bulletins[i].id === postId) {
        idx = i;
        break;
      }
    }

    if (idx !== -1) {
      state.bulletins.splice(idx, 1);
    }

    return { success: true };
  }

  /**
   * Pin a bulletin post to the top of the board.
   * @param {object} state - World state
   * @param {string} postId - ID of the bulletin post
   * @returns {{success: boolean, reason?: string}}
   */
  function pinBulletin(state, postId) {
    ensureState(state);

    var post = findBulletin(state, postId);
    if (!post) {
      return { success: false, reason: 'Post not found: ' + postId };
    }

    post.pinned = true;
    return { success: true };
  }

  /**
   * Return the most-liked bulletin posts for a zone.
   * @param {object} state - World state
   * @param {string} zone - Zone to filter by
   * @param {number} count - Maximum number of posts to return
   * @returns {Array}
   */
  function getPopularBulletins(state, zone, count) {
    ensureState(state);

    var results = [];
    for (var i = 0; i < state.bulletins.length; i++) {
      var post = state.bulletins[i];
      if (zone && post.zone !== zone) continue;
      results.push(post);
    }

    results.sort(function(a, b) {
      return b.likes - a.likes;
    });

    var limit = (typeof count === 'number' && count > 0) ? count : results.length;
    return results.slice(0, limit);
  }

  /**
   * Remove expired bulletin posts.
   * @param {object} state - World state
   * @param {number} currentTick - Current world tick
   * @returns {{removed: number}}
   */
  function cleanExpiredBulletins(state, currentTick) {
    ensureState(state);

    if (typeof currentTick !== 'number') {
      return { removed: 0 };
    }

    var before = state.bulletins.length;
    state.bulletins = state.bulletins.filter(function(post) {
      return post.expiresAt > currentTick;
    });
    var removed = before - state.bulletins.length;
    return { removed: removed };
  }

  /**
   * Return all gathering type definitions.
   * @returns {Array}
   */
  function getGatheringTypes() {
    return GATHERING_TYPES;
  }

  // ─── Exports ───────────────────────────────────────────────────────────────

  exports.GATHERING_TYPES = GATHERING_TYPES;
  exports.VALID_ZONES = VALID_ZONES;
  exports.VALID_BULLETIN_CATEGORIES = VALID_BULLETIN_CATEGORIES;
  exports.VALID_ACTIVITIES = VALID_ACTIVITIES;

  exports.createGathering = createGathering;
  exports.joinGathering = joinGathering;
  exports.leaveGathering = leaveGathering;
  exports.startGathering = startGathering;
  exports.endGathering = endGathering;
  exports.cancelGathering = cancelGathering;
  exports.getActiveGatherings = getActiveGatherings;
  exports.getScheduledGatherings = getScheduledGatherings;
  exports.getGatheringById = getGatheringById;
  exports.addActivity = addActivity;
  exports.getGatheringHistory = getGatheringHistory;
  exports.getHostStats = getHostStats;

  exports.postBulletin = postBulletin;
  exports.getBulletins = getBulletins;
  exports.replyToBulletin = replyToBulletin;
  exports.likeBulletin = likeBulletin;
  exports.deleteBulletin = deleteBulletin;
  exports.pinBulletin = pinBulletin;
  exports.getPopularBulletins = getPopularBulletins;
  exports.cleanExpiredBulletins = cleanExpiredBulletins;
  exports.getGatheringTypes = getGatheringTypes;

})(typeof module !== 'undefined' ? module.exports : (window.SocialSpaces = {}));
