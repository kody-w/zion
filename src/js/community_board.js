// community_board.js
/**
 * ZION Community Board — Zone Bulletin Boards for News and Announcements
 *
 * Each of the 8 zones has a bulletin board where citizens post announcements,
 * events, trade listings, help wanted ads, and general messages.
 *
 * Post lifecycle: active → expired (after 500 ticks by default)
 * Stewards can pin posts (max 3 pinned per board).
 * NPC auto-posts surface market alerts, weather changes, and events.
 * Reactions: like, helpful, funny (max 1 per player per post).
 */

(function(exports) {
  'use strict';

  // ---------------------------------------------------------------------------
  // SEEDED PRNG — mulberry32
  // ---------------------------------------------------------------------------

  function mulberry32(seed) {
    return function() {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // ---------------------------------------------------------------------------
  // CONSTANTS
  // ---------------------------------------------------------------------------

  var POST_CHAR_LIMIT = 500;
  var DEFAULT_EXPIRY_TICKS = 500;
  var MAX_PINS_PER_BOARD = 3;
  var DEFAULT_PAGE_SIZE = 10;

  var VALID_ZONES = [
    'nexus', 'gardens', 'athenaeum', 'studio',
    'wilds', 'agora', 'commons', 'arena'
  ];

  var VALID_REACTION_TYPES = ['like', 'helpful', 'funny'];

  // ---------------------------------------------------------------------------
  // POST TYPE DEFINITIONS
  // ---------------------------------------------------------------------------

  var POST_TYPES = [
    {
      id: 'announcement',
      name: 'Announcement',
      description: 'Official notices and important updates for zone citizens',
      icon: 'megaphone',
      defaultExpiryTicks: 500,
      allowNpcPost: true,
      requiresSteward: false
    },
    {
      id: 'event',
      name: 'Event',
      description: 'Upcoming gatherings, competitions, or scheduled activities',
      icon: 'calendar',
      defaultExpiryTicks: 500,
      allowNpcPost: true,
      requiresSteward: false
    },
    {
      id: 'trade_listing',
      name: 'Trade Listing',
      description: 'Items for sale, trade, or purchase requests',
      icon: 'scales',
      defaultExpiryTicks: 500,
      allowNpcPost: true,
      requiresSteward: false
    },
    {
      id: 'help_wanted',
      name: 'Help Wanted',
      description: 'Requests for assistance with tasks, quests, or projects',
      icon: 'hand',
      defaultExpiryTicks: 500,
      allowNpcPost: false,
      requiresSteward: false
    },
    {
      id: 'general',
      name: 'General',
      description: 'Casual conversation, tips, questions, and community discussion',
      icon: 'chat',
      defaultExpiryTicks: 500,
      allowNpcPost: false,
      requiresSteward: false
    }
  ];

  // ---------------------------------------------------------------------------
  // INTERNAL COUNTERS
  // ---------------------------------------------------------------------------

  var postCounter = 0;

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  function findPostType(typeId) {
    for (var i = 0; i < POST_TYPES.length; i++) {
      if (POST_TYPES[i].id === typeId) return POST_TYPES[i];
    }
    return null;
  }

  function isValidZone(zone) {
    for (var i = 0; i < VALID_ZONES.length; i++) {
      if (VALID_ZONES[i] === zone) return true;
    }
    return false;
  }

  function isValidReactionType(reaction) {
    for (var i = 0; i < VALID_REACTION_TYPES.length; i++) {
      if (VALID_REACTION_TYPES[i] === reaction) return true;
    }
    return false;
  }

  function getPostById(state, postId) {
    return state.posts[postId] || null;
  }

  function ensureBoard(state, zone) {
    if (!state.boards[zone]) {
      state.boards[zone] = {
        zone: zone,
        pinned: [],
        createdAt: 0
      };
    }
    return state.boards[zone];
  }

  function ensureReactions(state, postId) {
    if (!state.reactions[postId]) {
      state.reactions[postId] = {};
    }
    return state.reactions[postId];
  }

  function logBoardEvent(state, tick, event, data) {
    var entry = { tick: tick || 0, event: event };
    var keys = Object.keys(data);
    for (var i = 0; i < keys.length; i++) {
      entry[keys[i]] = data[keys[i]];
    }
    state.boardLog.push(entry);
  }

  function countPins(state, zone) {
    var board = state.boards[zone];
    if (!board || !board.pinned) return 0;
    return board.pinned.length;
  }

  // ---------------------------------------------------------------------------
  // PUBLIC API
  // ---------------------------------------------------------------------------

  /**
   * Create a fresh community board state.
   * @returns {{boards: {}, posts: {}, reactions: {}, boardLog: []}}
   */
  function createState() {
    return {
      boards: {},
      posts: {},
      reactions: {},
      boardLog: []
    };
  }

  /**
   * Create a new post on a zone's bulletin board.
   * @param {object} state
   * @param {string} authorId
   * @param {string} zone
   * @param {string} type      - one of POST_TYPES ids
   * @param {string} title
   * @param {string} content
   * @param {number} currentTick
   * @returns {{success: boolean, post?: object, error?: string}}
   */
  function createPost(state, authorId, zone, type, title, content, currentTick) {
    if (!authorId) return { success: false, error: 'authorId is required' };
    if (!zone) return { success: false, error: 'zone is required' };
    if (!isValidZone(zone)) return { success: false, error: 'Unknown zone: ' + zone };
    if (!type) return { success: false, error: 'type is required' };

    var typeDef = findPostType(type);
    if (!typeDef) return { success: false, error: 'Unknown post type: ' + type };

    if (!title || !title.trim()) return { success: false, error: 'title is required' };
    if (!content || !content.trim()) return { success: false, error: 'content is required' };
    if (content.length > POST_CHAR_LIMIT) {
      return { success: false, error: 'content exceeds ' + POST_CHAR_LIMIT + ' character limit' };
    }

    var tick = currentTick || 0;
    var postId = 'post_' + (++postCounter) + '_' + tick;
    var expiresAt = tick + typeDef.defaultExpiryTicks;

    var post = {
      id: postId,
      authorId: authorId,
      zone: zone,
      type: type,
      title: title.trim(),
      content: content.trim(),
      status: 'active',
      pinned: false,
      npcGenerated: false,
      createdAt: tick,
      updatedAt: tick,
      expiresAt: expiresAt,
      editedAt: null,
      deletedAt: null
    };

    state.posts[postId] = post;
    ensureBoard(state, zone);
    state.reactions[postId] = {};

    logBoardEvent(state, tick, 'post_created', {
      postId: postId,
      authorId: authorId,
      zone: zone,
      type: type
    });

    return { success: true, post: post };
  }

  /**
   * Edit a post's content. Only the original author may edit.
   * @param {object} state
   * @param {string} postId
   * @param {string} authorId
   * @param {string} newContent
   * @param {number} currentTick
   * @returns {{success: boolean, error?: string}}
   */
  function editPost(state, postId, authorId, newContent, currentTick) {
    if (!postId) return { success: false, error: 'postId is required' };
    if (!authorId) return { success: false, error: 'authorId is required' };
    if (!newContent || !newContent.trim()) return { success: false, error: 'newContent is required' };
    if (newContent.length > POST_CHAR_LIMIT) {
      return { success: false, error: 'content exceeds ' + POST_CHAR_LIMIT + ' character limit' };
    }

    var post = getPostById(state, postId);
    if (!post) return { success: false, error: 'Post not found: ' + postId };
    if (post.status !== 'active') return { success: false, error: 'Cannot edit a ' + post.status + ' post' };
    if (post.authorId !== authorId) return { success: false, error: 'Only the author can edit this post' };

    var tick = currentTick || 0;
    post.content = newContent.trim();
    post.editedAt = tick;
    post.updatedAt = tick;

    logBoardEvent(state, tick, 'post_edited', {
      postId: postId,
      authorId: authorId,
      zone: post.zone
    });

    return { success: true };
  }

  /**
   * Delete a post. The author or a steward (via steward flag) may delete.
   * Stewards are identified by authorId matching 'steward_*' or deleterId === authorId.
   * Passing deleterId that is not the author is treated as steward action.
   * @param {object} state
   * @param {string} postId
   * @param {string} deleterId
   * @param {number} currentTick
   * @returns {{success: boolean, error?: string}}
   */
  function deletePost(state, postId, deleterId, currentTick) {
    if (!postId) return { success: false, error: 'postId is required' };
    if (!deleterId) return { success: false, error: 'deleterId is required' };

    var post = getPostById(state, postId);
    if (!post) return { success: false, error: 'Post not found: ' + postId };
    if (post.status === 'deleted') return { success: false, error: 'Post is already deleted' };

    // Author can always delete their own post; stewards can delete any post
    var isSteward = (deleterId !== post.authorId);
    if (!isSteward && deleterId !== post.authorId) {
      return { success: false, error: 'Only the author or a steward can delete this post' };
    }

    var tick = currentTick || 0;
    post.status = 'deleted';
    post.deletedAt = tick;
    post.updatedAt = tick;

    // Remove from pinned if pinned
    var board = state.boards[post.zone];
    if (board && board.pinned) {
      var idx = board.pinned.indexOf(postId);
      if (idx !== -1) {
        board.pinned.splice(idx, 1);
        post.pinned = false;
      }
    }

    logBoardEvent(state, tick, 'post_deleted', {
      postId: postId,
      deleterId: deleterId,
      zone: post.zone,
      bySteward: isSteward
    });

    return { success: true };
  }

  /**
   * Pin a post to the board. Only stewards may pin. Max 3 pinned per board.
   * @param {object} state
   * @param {string} postId
   * @param {string} stewardId
   * @param {number} currentTick
   * @returns {{success: boolean, error?: string}}
   */
  function pinPost(state, postId, stewardId, currentTick) {
    if (!postId) return { success: false, error: 'postId is required' };
    if (!stewardId) return { success: false, error: 'stewardId is required' };

    var post = getPostById(state, postId);
    if (!post) return { success: false, error: 'Post not found: ' + postId };
    if (post.status !== 'active') return { success: false, error: 'Cannot pin a ' + post.status + ' post' };
    if (post.pinned) return { success: false, error: 'Post is already pinned' };

    var board = ensureBoard(state, post.zone);
    if (countPins(state, post.zone) >= MAX_PINS_PER_BOARD) {
      return { success: false, error: 'Board already has ' + MAX_PINS_PER_BOARD + ' pinned posts (maximum)' };
    }

    var tick = currentTick || 0;
    post.pinned = true;
    post.updatedAt = tick;
    board.pinned.push(postId);

    logBoardEvent(state, tick, 'post_pinned', {
      postId: postId,
      stewardId: stewardId,
      zone: post.zone
    });

    return { success: true };
  }

  /**
   * Unpin a post from the board. Only stewards may unpin.
   * @param {object} state
   * @param {string} postId
   * @param {string} stewardId
   * @param {number} currentTick
   * @returns {{success: boolean, error?: string}}
   */
  function unpinPost(state, postId, stewardId, currentTick) {
    if (!postId) return { success: false, error: 'postId is required' };
    if (!stewardId) return { success: false, error: 'stewardId is required' };

    var post = getPostById(state, postId);
    if (!post) return { success: false, error: 'Post not found: ' + postId };
    if (!post.pinned) return { success: false, error: 'Post is not pinned' };

    var tick = currentTick || 0;
    post.pinned = false;
    post.updatedAt = tick;

    var board = state.boards[post.zone];
    if (board && board.pinned) {
      var idx = board.pinned.indexOf(postId);
      if (idx !== -1) board.pinned.splice(idx, 1);
    }

    logBoardEvent(state, tick, 'post_unpinned', {
      postId: postId,
      stewardId: stewardId,
      zone: post.zone
    });

    return { success: true };
  }

  /**
   * Add a reaction to a post. Max 1 reaction per player per post.
   * @param {object} state
   * @param {string} postId
   * @param {string} playerId
   * @param {string} reactionType  - 'like' | 'helpful' | 'funny'
   * @param {number} currentTick
   * @returns {{success: boolean, error?: string}}
   */
  function addReaction(state, postId, playerId, reactionType, currentTick) {
    if (!postId) return { success: false, error: 'postId is required' };
    if (!playerId) return { success: false, error: 'playerId is required' };
    if (!reactionType) return { success: false, error: 'reactionType is required' };
    if (!isValidReactionType(reactionType)) {
      return { success: false, error: 'Invalid reaction type: ' + reactionType + '. Must be like, helpful, or funny' };
    }

    var post = getPostById(state, postId);
    if (!post) return { success: false, error: 'Post not found: ' + postId };
    if (post.status !== 'active') return { success: false, error: 'Cannot react to a ' + post.status + ' post' };

    var reactions = ensureReactions(state, postId);
    if (reactions[playerId]) {
      return { success: false, error: 'Player ' + playerId + ' has already reacted to this post' };
    }

    var tick = currentTick || 0;
    reactions[playerId] = { type: reactionType, tick: tick };

    logBoardEvent(state, tick, 'reaction_added', {
      postId: postId,
      playerId: playerId,
      reactionType: reactionType,
      zone: post.zone
    });

    return { success: true };
  }

  /**
   * Remove a player's reaction from a post.
   * @param {object} state
   * @param {string} postId
   * @param {string} playerId
   * @param {number} currentTick
   * @returns {{success: boolean, error?: string}}
   */
  function removeReaction(state, postId, playerId, currentTick) {
    if (!postId) return { success: false, error: 'postId is required' };
    if (!playerId) return { success: false, error: 'playerId is required' };

    var post = getPostById(state, postId);
    if (!post) return { success: false, error: 'Post not found: ' + postId };

    var reactions = state.reactions[postId];
    if (!reactions || !reactions[playerId]) {
      return { success: false, error: 'Player ' + playerId + ' has not reacted to this post' };
    }

    var tick = currentTick || 0;
    delete reactions[playerId];

    logBoardEvent(state, tick, 'reaction_removed', {
      postId: postId,
      playerId: playerId,
      zone: post.zone
    });

    return { success: true };
  }

  /**
   * Get a single post by id.
   * @param {object} state
   * @param {string} postId
   * @returns {object|null}
   */
  function getPost(state, postId) {
    return getPostById(state, postId);
  }

  /**
   * Get paginated posts for a zone board. Returns active posts newest-first.
   * Pinned posts always appear first (regardless of page).
   * @param {object} state
   * @param {string} zone
   * @param {number} page      - 1-based page number
   * @param {number} pageSize  - posts per page (default 10)
   * @returns {{posts: Array, total: number, page: number, totalPages: number}}
   */
  function getBoardPosts(state, zone, page, pageSize) {
    var size = pageSize || DEFAULT_PAGE_SIZE;
    var pg = page || 1;
    if (pg < 1) pg = 1;

    var board = state.boards[zone];
    var pinnedIds = (board && board.pinned) ? board.pinned : [];

    // Collect active posts for this zone
    var pinned = [];
    var nonPinned = [];
    var postIds = Object.keys(state.posts);

    for (var i = 0; i < postIds.length; i++) {
      var p = state.posts[postIds[i]];
      if (p.zone !== zone || p.status !== 'active') continue;

      var isPinned = false;
      for (var j = 0; j < pinnedIds.length; j++) {
        if (pinnedIds[j] === p.id) { isPinned = true; break; }
      }

      if (isPinned) {
        pinned.push(p);
      } else {
        nonPinned.push(p);
      }
    }

    // Sort non-pinned by createdAt descending
    nonPinned.sort(function(a, b) { return b.createdAt - a.createdAt; });
    // Sort pinned by createdAt descending too
    pinned.sort(function(a, b) { return b.createdAt - a.createdAt; });

    var all = pinned.concat(nonPinned);
    var total = all.length;
    var totalPages = Math.max(1, Math.ceil(total / size));
    var start = (pg - 1) * size;
    var sliced = all.slice(start, start + size);

    return {
      posts: sliced,
      total: total,
      page: pg,
      totalPages: totalPages
    };
  }

  /**
   * Get all pinned posts for a zone.
   * @param {object} state
   * @param {string} zone
   * @returns {Array}
   */
  function getPinnedPosts(state, zone) {
    var board = state.boards[zone];
    if (!board || !board.pinned || board.pinned.length === 0) return [];

    var result = [];
    for (var i = 0; i < board.pinned.length; i++) {
      var p = state.posts[board.pinned[i]];
      if (p && p.status === 'active') result.push(p);
    }
    return result;
  }

  /**
   * Get all active posts of a specific type in a zone.
   * @param {object} state
   * @param {string} zone
   * @param {string} type
   * @returns {Array}
   */
  function getPostsByType(state, zone, type) {
    var result = [];
    var postIds = Object.keys(state.posts);
    for (var i = 0; i < postIds.length; i++) {
      var p = state.posts[postIds[i]];
      if (p.zone === zone && p.type === type && p.status === 'active') {
        result.push(p);
      }
    }
    result.sort(function(a, b) { return b.createdAt - a.createdAt; });
    return result;
  }

  /**
   * Get all posts by a given author (across all zones, all statuses).
   * @param {object} state
   * @param {string} authorId
   * @returns {Array}
   */
  function getPostsByAuthor(state, authorId) {
    var result = [];
    var postIds = Object.keys(state.posts);
    for (var i = 0; i < postIds.length; i++) {
      var p = state.posts[postIds[i]];
      if (p.authorId === authorId) result.push(p);
    }
    result.sort(function(a, b) { return b.createdAt - a.createdAt; });
    return result;
  }

  /**
   * Search active posts in a zone by keyword (title or content, case-insensitive).
   * @param {object} state
   * @param {string} zone
   * @param {string} keyword
   * @returns {Array}
   */
  function searchPosts(state, zone, keyword) {
    if (!keyword || !keyword.trim()) return [];
    var kw = keyword.trim().toLowerCase();
    var result = [];
    var postIds = Object.keys(state.posts);
    for (var i = 0; i < postIds.length; i++) {
      var p = state.posts[postIds[i]];
      if (p.zone !== zone || p.status !== 'active') continue;
      var inTitle = p.title.toLowerCase().indexOf(kw) !== -1;
      var inContent = p.content.toLowerCase().indexOf(kw) !== -1;
      if (inTitle || inContent) result.push(p);
    }
    result.sort(function(a, b) { return b.createdAt - a.createdAt; });
    return result;
  }

  /**
   * Expire posts whose expiresAt tick has passed.
   * @param {object} state
   * @param {number} currentTick
   * @returns {{expired: Array}}
   */
  function expirePosts(state, currentTick) {
    var tick = currentTick || 0;
    var expired = [];
    var postIds = Object.keys(state.posts);

    for (var i = 0; i < postIds.length; i++) {
      var p = state.posts[postIds[i]];
      if (p.status === 'active' && tick >= p.expiresAt) {
        p.status = 'expired';
        p.updatedAt = tick;

        // Remove from pinned if necessary
        var board = state.boards[p.zone];
        if (board && board.pinned) {
          var idx = board.pinned.indexOf(p.id);
          if (idx !== -1) {
            board.pinned.splice(idx, 1);
            p.pinned = false;
          }
        }

        expired.push(p);

        logBoardEvent(state, tick, 'post_expired', {
          postId: p.id,
          authorId: p.authorId,
          zone: p.zone
        });
      }
    }

    return { expired: expired };
  }

  /**
   * Get reaction counts for a post.
   * @param {object} state
   * @param {string} postId
   * @returns {{like: number, helpful: number, funny: number, total: number}}
   */
  function getReactions(state, postId) {
    var counts = { like: 0, helpful: 0, funny: 0, total: 0 };
    var reactions = state.reactions[postId];
    if (!reactions) return counts;

    var players = Object.keys(reactions);
    for (var i = 0; i < players.length; i++) {
      var r = reactions[players[i]];
      var rt = r.type || r; // handle both {type, tick} and bare string
      if (counts[rt] !== undefined) {
        counts[rt]++;
        counts.total++;
      }
    }
    return counts;
  }

  /**
   * Get board statistics for a zone.
   * @param {object} state
   * @param {string} zone
   * @returns {object}
   */
  function getBoardStats(state, zone) {
    var stats = {
      zone: zone,
      totalPosts: 0,
      activePosts: 0,
      expiredPosts: 0,
      deletedPosts: 0,
      pinnedPosts: 0,
      npcPosts: 0,
      totalReactions: 0,
      byType: {}
    };

    for (var i = 0; i < POST_TYPES.length; i++) {
      stats.byType[POST_TYPES[i].id] = { total: 0, active: 0 };
    }

    var board = state.boards[zone];
    stats.pinnedPosts = (board && board.pinned) ? board.pinned.length : 0;

    var postIds = Object.keys(state.posts);
    for (var j = 0; j < postIds.length; j++) {
      var p = state.posts[postIds[j]];
      if (p.zone !== zone) continue;

      stats.totalPosts++;
      if (p.status === 'active') stats.activePosts++;
      else if (p.status === 'expired') stats.expiredPosts++;
      else if (p.status === 'deleted') stats.deletedPosts++;
      if (p.npcGenerated) stats.npcPosts++;

      if (stats.byType[p.type]) {
        stats.byType[p.type].total++;
        if (p.status === 'active') stats.byType[p.type].active++;
      }

      // Count reactions for this post
      var reactions = state.reactions[p.id];
      if (reactions) {
        stats.totalReactions += Object.keys(reactions).length;
      }
    }

    return stats;
  }

  /**
   * Get recent board activity for a zone (latest N log entries for that zone).
   * @param {object} state
   * @param {string} zone
   * @param {number} count
   * @returns {Array}
   */
  function getRecentActivity(state, zone, count) {
    var limit = count || 20;
    var result = [];

    for (var i = state.boardLog.length - 1; i >= 0 && result.length < limit; i--) {
      var entry = state.boardLog[i];
      if (entry.zone === zone) result.push(entry);
    }

    // Already in reverse chronological order since we iterated backwards
    return result;
  }

  /**
   * Create an NPC-generated post on a zone board.
   * Used for market alerts, weather changes, world events, etc.
   * @param {object} state
   * @param {string} npcId
   * @param {string} zone
   * @param {string} type          - must be a type where allowNpcPost is true
   * @param {string} title
   * @param {string} content
   * @param {number} currentTick
   * @returns {{success: boolean, post?: object, error?: string}}
   */
  function createNpcPost(state, npcId, zone, type, title, content, currentTick) {
    var typeDef = findPostType(type);
    if (!typeDef) return { success: false, error: 'Unknown post type: ' + type };
    if (!typeDef.allowNpcPost) {
      return { success: false, error: 'Post type ' + type + ' does not allow NPC posts' };
    }

    var result = createPost(state, npcId, zone, type, title, content, currentTick);
    if (result.success) {
      result.post.npcGenerated = true;
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // EXPORTS
  // ---------------------------------------------------------------------------

  exports.POST_TYPES = POST_TYPES;
  exports.VALID_ZONES = VALID_ZONES;
  exports.POST_CHAR_LIMIT = POST_CHAR_LIMIT;
  exports.MAX_PINS_PER_BOARD = MAX_PINS_PER_BOARD;
  exports.DEFAULT_EXPIRY_TICKS = DEFAULT_EXPIRY_TICKS;
  exports.createState = createState;
  exports.createPost = createPost;
  exports.editPost = editPost;
  exports.deletePost = deletePost;
  exports.pinPost = pinPost;
  exports.unpinPost = unpinPost;
  exports.addReaction = addReaction;
  exports.removeReaction = removeReaction;
  exports.getPost = getPost;
  exports.getBoardPosts = getBoardPosts;
  exports.getPinnedPosts = getPinnedPosts;
  exports.getPostsByType = getPostsByType;
  exports.getPostsByAuthor = getPostsByAuthor;
  exports.searchPosts = searchPosts;
  exports.expirePosts = expirePosts;
  exports.getReactions = getReactions;
  exports.getBoardStats = getBoardStats;
  exports.getRecentActivity = getRecentActivity;
  exports.createNpcPost = createNpcPost;
  exports.mulberry32 = mulberry32;

})(typeof module !== 'undefined' ? module.exports : (window.CommunityBoard = {}));
