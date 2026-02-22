/**
 * ZION Emote Builder System
 * Player-authored custom emotes — compose animation sequences from pose frames,
 * name and share publicly, rate others' emotes, earn Spark royalties when used
 * by other players.
 *
 * Dependencies: Social, Cosmetics, Economy, Profiles (optional, guarded)
 */
(function(exports) {
  'use strict';

  // ── Optional dependency guards ──────────────────────────────────────────────
  var Social    = (typeof window !== 'undefined' && window.Social)    || {};
  var Cosmetics = (typeof window !== 'undefined' && window.Cosmetics) || {};
  var Economy   = (typeof window !== 'undefined' && window.Economy)   || {};
  var Profiles  = (typeof window !== 'undefined' && window.Profiles)  || {};

  // ── mulberry32 seeded PRNG ──────────────────────────────────────────────────
  function mulberry32(seed) {
    var s = seed >>> 0;
    return function() {
      s += 0x6D2B79F5;
      var t = s;
      t  = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ── Constants ───────────────────────────────────────────────────────────────

  var ROYALTY_RATE           = 100;   // uses before 1 Spark royalty is paid
  var MAX_FRAMES             = 16;    // max frames per custom emote
  var MIN_FRAMES             = 1;
  var MAX_NAME_LENGTH        = 32;
  var MIN_NAME_LENGTH        = 3;
  var MIN_FRAME_DURATION_MS  = 100;
  var MAX_FRAME_DURATION_MS  = 5000;
  var DEFAULT_FRAME_DURATION = 500;
  var FEATURED_COUNT         = 6;     // number of featured slots
  var MAX_RATING             = 5;
  var MIN_RATING             = 1;
  var SEARCH_RESULTS_LIMIT   = 50;

  // ── Profanity filter (simple blocklist for ZION) ────────────────────────────
  var BLOCKED_WORDS = [
    'damn', 'hell', 'crap', 'ass', 'bastard', 'bitch', 'shit', 'fuck',
    'piss', 'dick', 'cock', 'cunt', 'slut', 'whore', 'nigger', 'faggot',
    'retard', 'nazi', 'kill', 'rape', 'murder', 'hate'
  ];

  function _containsProfanity(name) {
    // Check for whole-word matches to avoid false positives (e.g. "hell" in "hello")
    var lower = name.toLowerCase();
    for (var i = 0; i < BLOCKED_WORDS.length; i++) {
      var word = BLOCKED_WORDS[i];
      var idx  = lower.indexOf(word);
      while (idx !== -1) {
        var before = (idx === 0)                  ? '' : lower[idx - 1];
        var after  = (idx + word.length >= lower.length) ? '' : lower[idx + word.length];
        var isBoundaryBefore = (before === '' || !/[a-z0-9]/.test(before));
        var isBoundaryAfter  = (after  === '' || !/[a-z0-9]/.test(after));
        if (isBoundaryBefore && isBoundaryAfter) return true;
        idx = lower.indexOf(word, idx + 1);
      }
    }
    return false;
  }

  // ── Pre-defined pose frames ─────────────────────────────────────────────────
  var POSE_FRAMES = [
    // Greeting
    { id: 'wave',        label: 'Wave',          category: 'greeting',     description: 'A friendly hand wave.' },
    { id: 'bow',         label: 'Bow',           category: 'greeting',     description: 'A respectful bow.' },
    { id: 'curtsy',      label: 'Curtsy',        category: 'greeting',     description: 'An elegant curtsy.' },
    { id: 'salute',      label: 'Salute',        category: 'greeting',     description: 'A sharp military salute.' },
    { id: 'handshake',   label: 'Handshake',     category: 'greeting',     description: 'Reaching out for a handshake.' },
    { id: 'nod',         label: 'Nod',           category: 'greeting',     description: 'A simple acknowledging nod.' },
    // Celebration
    { id: 'cheer',       label: 'Cheer',         category: 'celebration',  description: 'Arms raised in celebration.' },
    { id: 'clap',        label: 'Clap',          category: 'celebration',  description: 'Enthusiastic clapping.' },
    { id: 'jump',        label: 'Jump',          category: 'celebration',  description: 'A joyful leap in the air.' },
    { id: 'fistpump',    label: 'Fist Pump',     category: 'celebration',  description: 'A victorious fist pump.' },
    { id: 'cartwheel',   label: 'Cartwheel',     category: 'celebration',  description: 'An acrobatic cartwheel.' },
    { id: 'victory',     label: 'Victory Pose',  category: 'celebration',  description: 'A triumphant victory stance.' },
    // Dance
    { id: 'spin',        label: 'Spin',          category: 'dance',        description: 'A graceful spin.' },
    { id: 'sidestep',    label: 'Side Step',     category: 'dance',        description: 'A rhythmic side step.' },
    { id: 'shuffle',     label: 'Shuffle',       category: 'dance',        description: 'Feet shuffling to a beat.' },
    { id: 'twirl',       label: 'Twirl',         category: 'dance',        description: 'A delicate twirl.' },
    { id: 'moonwalk',    label: 'Moonwalk',      category: 'dance',        description: 'The iconic moonwalk glide.' },
    { id: 'groove',      label: 'Groove',        category: 'dance',        description: 'A smooth groove sway.' },
    // Expression
    { id: 'shrug',       label: 'Shrug',         category: 'expression',   description: 'An exaggerated shrug.' },
    { id: 'facepalm',    label: 'Facepalm',      category: 'expression',   description: 'A disappointed facepalm.' },
    { id: 'think',       label: 'Think',         category: 'expression',   description: 'Chin-in-hand thoughtful pose.' },
    { id: 'point',       label: 'Point',         category: 'expression',   description: 'Pointing finger forward.' },
    { id: 'thumbsup',    label: 'Thumbs Up',     category: 'expression',   description: 'An approving thumbs up.' },
    { id: 'thumbsdown',  label: 'Thumbs Down',   category: 'expression',   description: 'A disapproving thumbs down.' },
    { id: 'laugh',       label: 'Laugh',         category: 'expression',   description: 'Holding sides, laughing hard.' },
    { id: 'cry',         label: 'Cry',           category: 'expression',   description: 'Wiping tears from eyes.' },
    { id: 'angry',       label: 'Angry',         category: 'expression',   description: 'Arms crossed, fuming.' },
    { id: 'surprise',    label: 'Surprise',      category: 'expression',   description: 'Hands raised in shock.' },
    // Custom (placeholder for user-extended pose data)
    { id: 'idle',        label: 'Idle',          category: 'custom',       description: 'Default idle standing pose.' },
    { id: 'crouch',      label: 'Crouch',        category: 'custom',       description: 'A low crouching stance.' },
    { id: 'sit',         label: 'Sit',           category: 'custom',       description: 'Sitting on the ground.' },
    { id: 'lean',        label: 'Lean',          category: 'custom',       description: 'Casually leaning to one side.' }
  ];

  // Build pose-frame lookup map
  var _poseFrameMap = (function() {
    var map = {};
    for (var i = 0; i < POSE_FRAMES.length; i++) {
      map[POSE_FRAMES[i].id] = POSE_FRAMES[i];
    }
    return map;
  })();

  // ── Emote categories ────────────────────────────────────────────────────────
  var EMOTE_CATEGORIES = ['greeting', 'celebration', 'dance', 'expression', 'custom'];

  // ── Default built-in emotes ──────────────────────────────────────────────────
  var DEFAULT_EMOTES = [
    {
      id: 'emote_wave',
      name: 'Wave Hello',
      creatorId: 'SYSTEM',
      category: 'greeting',
      frames: [
        { poseId: 'wave', duration: 500 },
        { poseId: 'idle', duration: 300 }
      ],
      isDefault: true
    },
    {
      id: 'emote_bow',
      name: 'Deep Bow',
      creatorId: 'SYSTEM',
      category: 'greeting',
      frames: [
        { poseId: 'bow', duration: 800 },
        { poseId: 'idle', duration: 400 }
      ],
      isDefault: true
    },
    {
      id: 'emote_dance',
      name: 'Victory Dance',
      creatorId: 'SYSTEM',
      category: 'dance',
      frames: [
        { poseId: 'spin',     duration: 400 },
        { poseId: 'sidestep', duration: 400 },
        { poseId: 'cheer',    duration: 600 }
      ],
      isDefault: true
    },
    {
      id: 'emote_celebrate',
      name: 'Celebration',
      creatorId: 'SYSTEM',
      category: 'celebration',
      frames: [
        { poseId: 'jump',     duration: 300 },
        { poseId: 'fistpump', duration: 500 },
        { poseId: 'cheer',    duration: 400 }
      ],
      isDefault: true
    },
    {
      id: 'emote_shrug',
      name: 'Classic Shrug',
      creatorId: 'SYSTEM',
      category: 'expression',
      frames: [
        { poseId: 'shrug', duration: 700 },
        { poseId: 'idle',  duration: 300 }
      ],
      isDefault: true
    }
  ];

  // ── Internal state counter for unique IDs ───────────────────────────────────
  var _emoteCounter = 0;

  // ============================================================================
  // VALIDATION HELPERS
  // ============================================================================

  function _isValidName(name) {
    if (typeof name !== 'string') return false;
    var trimmed = name.trim();
    if (trimmed.length < MIN_NAME_LENGTH) return false;
    if (trimmed.length > MAX_NAME_LENGTH) return false;
    if (_containsProfanity(trimmed)) return false;
    // Must contain at least one letter
    if (!/[a-zA-Z]/.test(trimmed)) return false;
    return true;
  }

  function _isValidCategory(cat) {
    for (var i = 0; i < EMOTE_CATEGORIES.length; i++) {
      if (EMOTE_CATEGORIES[i] === cat) return true;
    }
    return false;
  }

  function _isValidFrame(frame) {
    if (!frame || typeof frame !== 'object') return false;
    if (typeof frame.poseId !== 'string') return false;
    if (!_poseFrameMap[frame.poseId]) return false;
    var dur = (typeof frame.duration === 'number') ? frame.duration : DEFAULT_FRAME_DURATION;
    if (dur < MIN_FRAME_DURATION_MS || dur > MAX_FRAME_DURATION_MS) return false;
    return true;
  }

  function _isValidFrames(frames) {
    if (!Array.isArray(frames)) return false;
    if (frames.length < MIN_FRAMES || frames.length > MAX_FRAMES) return false;
    for (var i = 0; i < frames.length; i++) {
      if (!_isValidFrame(frames[i])) return false;
    }
    return true;
  }

  // ── Ensure library state structure ───────────────────────────────────────────
  function _ensureLibrary(lib) {
    if (!lib || typeof lib !== 'object') lib = {};
    if (!Array.isArray(lib.emotes))    lib.emotes    = [];
    if (!lib.ratings || typeof lib.ratings !== 'object') lib.ratings = {};
    if (!lib.usageCounts || typeof lib.usageCounts !== 'object') lib.usageCounts = {};
    if (!lib.royalties || typeof lib.royalties !== 'object')     lib.royalties   = {};
    if (!lib.featured || !Array.isArray(lib.featured))           lib.featured    = [];
    return lib;
  }

  // ── Generate unique emote ID ─────────────────────────────────────────────────
  function _generateEmoteId(creatorId) {
    _emoteCounter++;
    return 'emote_' + (creatorId || 'anon') + '_' + Date.now() + '_' + _emoteCounter;
  }

  // ── Compute average rating ───────────────────────────────────────────────────
  function _computeAvgRating(ratingMap) {
    if (!ratingMap || typeof ratingMap !== 'object') return 0;
    var keys = Object.keys(ratingMap);
    if (keys.length === 0) return 0;
    var sum = 0;
    for (var i = 0; i < keys.length; i++) {
      sum += ratingMap[keys[i]];
    }
    return sum / keys.length;
  }

  // ── Compute total duration of an emote sequence ──────────────────────────────
  function _computeTotalDuration(frames) {
    var total = 0;
    for (var i = 0; i < frames.length; i++) {
      total += (typeof frames[i].duration === 'number') ? frames[i].duration : DEFAULT_FRAME_DURATION;
    }
    return total;
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Create a new custom emote and add it to the library.
   * @param {Object} lib      - The emote library state (mutated and returned)
   * @param {string} creatorId - Player ID of the creator
   * @param {string} name     - Human-readable emote name (3–32 chars, no profanity)
   * @param {string} category - One of EMOTE_CATEGORIES
   * @param {Array}  frames   - Array of {poseId, duration} (1–16 frames)
   * @returns {{ ok: boolean, emote: Object|null, error: string|null }}
   */
  function createEmote(lib, creatorId, name, category, frames) {
    lib = _ensureLibrary(lib);

    if (!creatorId || typeof creatorId !== 'string') {
      return { ok: false, emote: null, error: 'invalid_creator' };
    }
    if (!_isValidName(name)) {
      return { ok: false, emote: null, error: 'invalid_name' };
    }
    if (!_isValidCategory(category)) {
      return { ok: false, emote: null, error: 'invalid_category' };
    }
    if (!_isValidFrames(frames)) {
      return { ok: false, emote: null, error: 'invalid_frames' };
    }

    // Check name uniqueness (case-insensitive)
    var lowerName = name.trim().toLowerCase();
    for (var i = 0; i < lib.emotes.length; i++) {
      if (lib.emotes[i].name.toLowerCase() === lowerName) {
        return { ok: false, emote: null, error: 'name_taken' };
      }
    }

    var normalizedFrames = frames.map(function(f) {
      return {
        poseId:   f.poseId,
        duration: (typeof f.duration === 'number') ? f.duration : DEFAULT_FRAME_DURATION
      };
    });

    var emote = {
      id:           _generateEmoteId(creatorId),
      name:         name.trim(),
      creatorId:    creatorId,
      category:     category,
      frames:       normalizedFrames,
      totalDuration: _computeTotalDuration(normalizedFrames),
      isDefault:    false,
      createdAt:    Date.now(),
      usageCount:   0,
      royaltiesPaid: 0
    };

    lib.emotes.push(emote);
    lib.ratings[emote.id]     = {};
    lib.usageCounts[emote.id] = 0;
    lib.royalties[emote.id]   = 0;

    return { ok: true, emote: emote, error: null };
  }

  /**
   * Use an emote — increments usage counter and pays royalties to creator
   * when ROYALTY_RATE threshold is crossed.
   * @param {Object} lib      - Emote library state
   * @param {string} emoteId  - ID of the emote being used
   * @param {string} userId   - ID of the player using the emote
   * @param {Object} [ledger] - Optional Economy ledger for Spark royalty payments
   * @returns {{ ok: boolean, royaltyPaid: boolean, royaltyAmount: number, error: string|null }}
   */
  function useEmote(lib, emoteId, userId, ledger) {
    lib = _ensureLibrary(lib);
    if (!emoteId || typeof emoteId !== 'string') {
      return { ok: false, royaltyPaid: false, royaltyAmount: 0, error: 'invalid_emote_id' };
    }
    if (!userId || typeof userId !== 'string') {
      return { ok: false, royaltyPaid: false, royaltyAmount: 0, error: 'invalid_user_id' };
    }

    // Find emote in library or defaults
    var emote = _findEmote(lib, emoteId);
    if (!emote) {
      return { ok: false, royaltyPaid: false, royaltyAmount: 0, error: 'emote_not_found' };
    }

    // Increment usage
    if (typeof lib.usageCounts[emoteId] !== 'number') lib.usageCounts[emoteId] = 0;
    lib.usageCounts[emoteId]++;
    emote.usageCount = lib.usageCounts[emoteId];

    var royaltyPaid  = false;
    var royaltyAmount = 0;

    // Pay royalty if threshold crossed and emote has a non-system creator
    if (!emote.isDefault && emote.creatorId && emote.creatorId !== 'SYSTEM' && emote.creatorId !== userId) {
      if (typeof lib.royalties[emoteId] !== 'number') lib.royalties[emoteId] = 0;
      var prevCount = lib.usageCounts[emoteId] - 1;
      var prevBatch = Math.floor(prevCount / ROYALTY_RATE);
      var newBatch  = Math.floor(lib.usageCounts[emoteId] / ROYALTY_RATE);
      if (newBatch > prevBatch) {
        royaltyAmount = newBatch - prevBatch; // 1 Spark per 100 uses
        lib.royalties[emoteId] += royaltyAmount;
        emote.royaltiesPaid = lib.royalties[emoteId];
        royaltyPaid = true;
        // Optionally credit Economy ledger
        if (ledger && typeof Economy.transfer === 'function') {
          Economy.transfer(ledger, 'SYSTEM', emote.creatorId, royaltyAmount, 'emote_royalty');
        }
      }
    }

    return { ok: true, royaltyPaid: royaltyPaid, royaltyAmount: royaltyAmount, error: null };
  }

  /**
   * Rate an emote (1–5 stars). Each user can rate once; re-rating updates.
   * @param {Object} lib     - Emote library state
   * @param {string} emoteId - Emote to rate
   * @param {string} userId  - Rater's player ID
   * @param {number} stars   - Rating value (1–5)
   * @returns {{ ok: boolean, avgRating: number, ratingCount: number, error: string|null }}
   */
  function rateEmote(lib, emoteId, userId, stars) {
    lib = _ensureLibrary(lib);
    if (!emoteId || typeof emoteId !== 'string') {
      return { ok: false, avgRating: 0, ratingCount: 0, error: 'invalid_emote_id' };
    }
    if (!userId || typeof userId !== 'string') {
      return { ok: false, avgRating: 0, ratingCount: 0, error: 'invalid_user_id' };
    }
    if (typeof stars !== 'number' || !isFinite(stars) || Math.round(stars) < MIN_RATING || Math.round(stars) > MAX_RATING) {
      return { ok: false, avgRating: 0, ratingCount: 0, error: 'invalid_rating' };
    }

    var emote = _findEmote(lib, emoteId);
    if (!emote) {
      return { ok: false, avgRating: 0, ratingCount: 0, error: 'emote_not_found' };
    }

    if (!lib.ratings[emoteId]) lib.ratings[emoteId] = {};
    lib.ratings[emoteId][userId] = Math.round(stars);

    var avg   = _computeAvgRating(lib.ratings[emoteId]);
    var count = Object.keys(lib.ratings[emoteId]).length;
    return { ok: true, avgRating: avg, ratingCount: count, error: null };
  }

  /**
   * Search the public emote library.
   * @param {Object} lib    - Emote library state
   * @param {Object} opts   - { query, category, sortBy: 'rating'|'uses'|'newest', limit }
   * @returns {Array} Matching emote descriptors with avgRating, usageCount
   */
  function searchEmotes(lib, opts) {
    lib = _ensureLibrary(lib);
    opts = opts || {};
    var query    = (typeof opts.query === 'string')    ? opts.query.trim().toLowerCase() : '';
    var category = (typeof opts.category === 'string') ? opts.category : '';
    var sortBy   = opts.sortBy || 'rating';
    var limit    = (typeof opts.limit === 'number' && opts.limit > 0) ? opts.limit : SEARCH_RESULTS_LIMIT;

    // Combine default + custom emotes
    var all = _getAllEmotes(lib);

    var results = [];
    for (var i = 0; i < all.length; i++) {
      var e = all[i];
      if (category && e.category !== category) continue;
      if (query && e.name.toLowerCase().indexOf(query) === -1) continue;
      var avgRating  = _computeAvgRating(lib.ratings[e.id] || {});
      var usageCount = (typeof lib.usageCounts[e.id] === 'number') ? lib.usageCounts[e.id] : (e.usageCount || 0);
      results.push({
        id:          e.id,
        name:        e.name,
        creatorId:   e.creatorId,
        category:    e.category,
        frames:      e.frames,
        totalDuration: e.totalDuration || _computeTotalDuration(e.frames),
        isDefault:   !!e.isDefault,
        avgRating:   avgRating,
        usageCount:  usageCount,
        royalties:   (lib.royalties[e.id] || 0),
        createdAt:   e.createdAt || 0
      });
    }

    // Sort
    results.sort(function(a, b) {
      if (sortBy === 'uses')   return b.usageCount - a.usageCount;
      if (sortBy === 'newest') return b.createdAt - a.createdAt;
      // Default: by rating desc, then uses desc
      if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
      return b.usageCount - a.usageCount;
    });

    return results.slice(0, limit);
  }

  /**
   * Get emote by ID (checks custom library then defaults).
   * @param {Object} lib    - Emote library state
   * @param {string} emoteId
   * @returns {Object|null}
   */
  function getEmote(lib, emoteId) {
    lib = _ensureLibrary(lib);
    return _findEmote(lib, emoteId) || null;
  }

  /**
   * Delete a custom emote (only creator can delete; cannot delete defaults).
   * @param {Object} lib       - Emote library state
   * @param {string} emoteId   - ID of emote to delete
   * @param {string} requesterId - Must match emote.creatorId
   * @returns {{ ok: boolean, error: string|null }}
   */
  function deleteEmote(lib, emoteId, requesterId) {
    lib = _ensureLibrary(lib);
    if (!emoteId || typeof emoteId !== 'string') {
      return { ok: false, error: 'invalid_emote_id' };
    }
    // Check if it's a default emote (they're not in lib.emotes)
    for (var d = 0; d < DEFAULT_EMOTES.length; d++) {
      if (DEFAULT_EMOTES[d].id === emoteId) {
        return { ok: false, error: 'cannot_delete_default' };
      }
    }
    var idx = -1;
    for (var i = 0; i < lib.emotes.length; i++) {
      if (lib.emotes[i].id === emoteId) { idx = i; break; }
    }
    if (idx === -1) {
      return { ok: false, error: 'emote_not_found' };
    }
    var emote = lib.emotes[idx];
    if (emote.creatorId !== requesterId) {
      return { ok: false, error: 'permission_denied' };
    }
    lib.emotes.splice(idx, 1);
    delete lib.ratings[emoteId];
    delete lib.usageCounts[emoteId];
    delete lib.royalties[emoteId];
    // Remove from featured if present
    lib.featured = lib.featured.filter(function(fid) { return fid !== emoteId; });
    return { ok: true, error: null };
  }

  /**
   * Get all emotes by a specific creator.
   * @param {Object} lib       - Emote library state
   * @param {string} creatorId
   * @returns {Array} emote descriptors with ratings/uses enriched
   */
  function getCreatorEmotes(lib, creatorId) {
    lib = _ensureLibrary(lib);
    if (!creatorId || typeof creatorId !== 'string') return [];
    var result = [];
    for (var i = 0; i < lib.emotes.length; i++) {
      var e = lib.emotes[i];
      if (e.creatorId !== creatorId) continue;
      result.push(_enrichEmote(lib, e));
    }
    return result;
  }

  /**
   * Get creator's total royalties earned across all their emotes.
   * @param {Object} lib       - Emote library state
   * @param {string} creatorId
   * @returns {number} Total Spark earned as royalties
   */
  function getCreatorRoyalties(lib, creatorId) {
    lib = _ensureLibrary(lib);
    if (!creatorId || typeof creatorId !== 'string') return 0;
    var total = 0;
    for (var i = 0; i < lib.emotes.length; i++) {
      var e = lib.emotes[i];
      if (e.creatorId === creatorId) {
        total += (lib.royalties[e.id] || 0);
      }
    }
    return total;
  }

  /**
   * Refresh the featured emotes list based on top-rated (deterministic with seed).
   * @param {Object} lib  - Emote library state (mutated)
   * @param {number} [seed] - Optional PRNG seed for tie-breaking
   * @returns {Array} Array of featured emote IDs
   */
  function refreshFeatured(lib, seed) {
    lib = _ensureLibrary(lib);
    var rng = mulberry32(seed !== undefined ? seed : 12345);

    var all = _getAllEmotes(lib);
    var scored = all.map(function(e) {
      var avg   = _computeAvgRating(lib.ratings[e.id] || {});
      var uses  = (lib.usageCounts[e.id] || 0);
      var count = Object.keys(lib.ratings[e.id] || {}).length;
      // Score: average rating weighted by count + small random tiebreak
      var score = avg * Math.log1p(count) + (uses / 1000) + rng() * 0.001;
      return { id: e.id, score: score };
    });

    scored.sort(function(a, b) { return b.score - a.score; });

    lib.featured = scored.slice(0, FEATURED_COUNT).map(function(s) { return s.id; });
    return lib.featured.slice();
  }

  /**
   * Get the current featured emotes (with full detail).
   * @param {Object} lib  - Emote library state
   * @returns {Array} Array of enriched emote objects
   */
  function getFeatured(lib) {
    lib = _ensureLibrary(lib);
    var result = [];
    for (var i = 0; i < lib.featured.length; i++) {
      var emote = _findEmote(lib, lib.featured[i]);
      if (emote) result.push(_enrichEmote(lib, emote));
    }
    return result;
  }

  /**
   * Get emotes filtered by category.
   * @param {Object} lib      - Emote library state
   * @param {string} category
   * @returns {Array}
   */
  function getEmotesByCategory(lib, category) {
    lib = _ensureLibrary(lib);
    if (!_isValidCategory(category)) return [];
    var all = _getAllEmotes(lib);
    var result = [];
    for (var i = 0; i < all.length; i++) {
      if (all[i].category === category) result.push(_enrichEmote(lib, all[i]));
    }
    return result;
  }

  /**
   * Get usage count for a specific emote.
   * @param {Object} lib
   * @param {string} emoteId
   * @returns {number}
   */
  function getUsageCount(lib, emoteId) {
    lib = _ensureLibrary(lib);
    return (typeof lib.usageCounts[emoteId] === 'number') ? lib.usageCounts[emoteId] : 0;
  }

  /**
   * Get average rating for a specific emote.
   * @param {Object} lib
   * @param {string} emoteId
   * @returns {number}
   */
  function getAvgRating(lib, emoteId) {
    lib = _ensureLibrary(lib);
    return _computeAvgRating(lib.ratings[emoteId] || {});
  }

  /**
   * Get rating count for a specific emote.
   * @param {Object} lib
   * @param {string} emoteId
   * @returns {number}
   */
  function getRatingCount(lib, emoteId) {
    lib = _ensureLibrary(lib);
    if (!lib.ratings[emoteId]) return 0;
    return Object.keys(lib.ratings[emoteId]).length;
  }

  /**
   * Get a user's rating for a specific emote.
   * @param {Object} lib
   * @param {string} emoteId
   * @param {string} userId
   * @returns {number|null} The user's rating or null if not rated
   */
  function getUserRating(lib, emoteId, userId) {
    lib = _ensureLibrary(lib);
    if (!lib.ratings[emoteId]) return null;
    var r = lib.ratings[emoteId][userId];
    return (typeof r === 'number') ? r : null;
  }

  /**
   * Validate an emote frame array without creating an emote.
   * @param {Array} frames
   * @returns {{ valid: boolean, error: string|null }}
   */
  function validateFrames(frames) {
    if (!Array.isArray(frames)) return { valid: false, error: 'frames_must_be_array' };
    if (frames.length < MIN_FRAMES) return { valid: false, error: 'too_few_frames' };
    if (frames.length > MAX_FRAMES) return { valid: false, error: 'too_many_frames' };
    for (var i = 0; i < frames.length; i++) {
      var f = frames[i];
      if (!f || typeof f !== 'object') return { valid: false, error: 'invalid_frame_at_' + i };
      if (typeof f.poseId !== 'string') return { valid: false, error: 'missing_poseId_at_' + i };
      if (!_poseFrameMap[f.poseId]) return { valid: false, error: 'unknown_poseId_at_' + i };
      if (typeof f.duration === 'number') {
        if (f.duration < MIN_FRAME_DURATION_MS || f.duration > MAX_FRAME_DURATION_MS) {
          return { valid: false, error: 'duration_out_of_range_at_' + i };
        }
      }
    }
    return { valid: true, error: null };
  }

  /**
   * Validate an emote name.
   * @param {string} name
   * @returns {{ valid: boolean, error: string|null }}
   */
  function validateName(name) {
    if (typeof name !== 'string') return { valid: false, error: 'name_must_be_string' };
    var trimmed = name.trim();
    if (trimmed.length < MIN_NAME_LENGTH) return { valid: false, error: 'name_too_short' };
    if (trimmed.length > MAX_NAME_LENGTH) return { valid: false, error: 'name_too_long' };
    if (_containsProfanity(trimmed)) return { valid: false, error: 'name_contains_profanity' };
    if (!/[a-zA-Z]/.test(trimmed)) return { valid: false, error: 'name_needs_letter' };
    return { valid: true, error: null };
  }

  /**
   * Get a summary/profile for a creator: total emotes, total uses, total royalties, top emote.
   * @param {Object} lib
   * @param {string} creatorId
   * @returns {Object}
   */
  function getCreatorProfile(lib, creatorId) {
    lib = _ensureLibrary(lib);
    var emotes   = getCreatorEmotes(lib, creatorId);
    var totalUses = 0;
    var topEmote  = null;
    var topUses   = -1;
    for (var i = 0; i < emotes.length; i++) {
      totalUses += emotes[i].usageCount;
      if (emotes[i].usageCount > topUses) {
        topUses  = emotes[i].usageCount;
        topEmote = emotes[i];
      }
    }
    return {
      creatorId:     creatorId,
      emoteCount:    emotes.length,
      totalUses:     totalUses,
      totalRoyalties: getCreatorRoyalties(lib, creatorId),
      topEmote:      topEmote
    };
  }

  /**
   * Create a blank emote library state.
   * @returns {Object}
   */
  function createLibrary() {
    return {
      emotes:      [],
      ratings:     {},
      usageCounts: {},
      royalties:   {},
      featured:    []
    };
  }

  /**
   * Get all available pose frames.
   * @returns {Array}
   */
  function getPoseFrames() {
    return POSE_FRAMES.slice();
  }

  /**
   * Get pose frame by ID.
   * @param {string} poseId
   * @returns {Object|null}
   */
  function getPoseFrame(poseId) {
    return _poseFrameMap[poseId] || null;
  }

  /**
   * Get list of valid emote categories.
   * @returns {Array}
   */
  function getCategories() {
    return EMOTE_CATEGORIES.slice();
  }

  /**
   * Get total duration of an emote in milliseconds.
   * @param {Object} lib
   * @param {string} emoteId
   * @returns {number}
   */
  function getEmoteDuration(lib, emoteId) {
    lib = _ensureLibrary(lib);
    var emote = _findEmote(lib, emoteId);
    if (!emote) return 0;
    return _computeTotalDuration(emote.frames);
  }

  /**
   * Get default system emotes.
   * @returns {Array}
   */
  function getDefaultEmotes() {
    return DEFAULT_EMOTES.map(function(e) {
      return {
        id:           e.id,
        name:         e.name,
        creatorId:    e.creatorId,
        category:     e.category,
        frames:       e.frames.slice(),
        totalDuration: _computeTotalDuration(e.frames),
        isDefault:    true,
        usageCount:   0,
        royaltiesPaid: 0,
        avgRating:    0
      };
    });
  }

  /**
   * Get royalties earned for a specific emote.
   * @param {Object} lib
   * @param {string} emoteId
   * @returns {number}
   */
  function getEmoteRoyalties(lib, emoteId) {
    lib = _ensureLibrary(lib);
    return (typeof lib.royalties[emoteId] === 'number') ? lib.royalties[emoteId] : 0;
  }

  /**
   * Preview an emote sequence (returns frame details with poses).
   * @param {Array} frames - Array of {poseId, duration}
   * @returns {Array} Enriched frames with pose metadata
   */
  function previewFrames(frames) {
    if (!Array.isArray(frames)) return [];
    var result = [];
    for (var i = 0; i < frames.length; i++) {
      var f = frames[i];
      var pose = _poseFrameMap[f.poseId] || null;
      result.push({
        index:       i,
        poseId:      f.poseId,
        duration:    (typeof f.duration === 'number') ? f.duration : DEFAULT_FRAME_DURATION,
        pose:        pose,
        valid:       pose !== null
      });
    }
    return result;
  }

  /**
   * Get top emotes by usage.
   * @param {Object} lib
   * @param {number} [limit=10]
   * @returns {Array}
   */
  function getTopByUsage(lib, limit) {
    lib = _ensureLibrary(lib);
    return searchEmotes(lib, { sortBy: 'uses', limit: limit || 10 });
  }

  /**
   * Get top emotes by rating.
   * @param {Object} lib
   * @param {number} [limit=10]
   * @returns {Array}
   */
  function getTopByRating(lib, limit) {
    lib = _ensureLibrary(lib);
    return searchEmotes(lib, { sortBy: 'rating', limit: limit || 10 });
  }

  /**
   * Get newest emotes.
   * @param {Object} lib
   * @param {number} [limit=10]
   * @returns {Array}
   */
  function getNewest(lib, limit) {
    lib = _ensureLibrary(lib);
    return searchEmotes(lib, { sortBy: 'newest', limit: limit || 10 });
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /** Find emote in library emotes or in DEFAULT_EMOTES */
  function _findEmote(lib, emoteId) {
    // Check custom emotes first
    for (var i = 0; i < lib.emotes.length; i++) {
      if (lib.emotes[i].id === emoteId) return lib.emotes[i];
    }
    // Fall back to defaults
    for (var j = 0; j < DEFAULT_EMOTES.length; j++) {
      if (DEFAULT_EMOTES[j].id === emoteId) return DEFAULT_EMOTES[j];
    }
    return null;
  }

  /** Get all emotes: defaults first, then custom */
  function _getAllEmotes(lib) {
    var all = DEFAULT_EMOTES.slice();
    for (var i = 0; i < lib.emotes.length; i++) {
      all.push(lib.emotes[i]);
    }
    return all;
  }

  /** Enrich emote with live stats from lib */
  function _enrichEmote(lib, emote) {
    return {
      id:           emote.id,
      name:         emote.name,
      creatorId:    emote.creatorId,
      category:     emote.category,
      frames:       emote.frames,
      totalDuration: emote.totalDuration || _computeTotalDuration(emote.frames),
      isDefault:    !!emote.isDefault,
      createdAt:    emote.createdAt || 0,
      usageCount:   (typeof lib.usageCounts[emote.id] === 'number') ? lib.usageCounts[emote.id] : (emote.usageCount || 0),
      royaltiesPaid: (lib.royalties[emote.id] || 0),
      avgRating:    _computeAvgRating(lib.ratings[emote.id] || {}),
      ratingCount:  Object.keys(lib.ratings[emote.id] || {}).length
    };
  }

  // ============================================================================
  // EXPORTS
  // ============================================================================

  exports.POSE_FRAMES            = POSE_FRAMES;
  exports.EMOTE_CATEGORIES       = EMOTE_CATEGORIES;
  exports.DEFAULT_EMOTES         = DEFAULT_EMOTES;
  exports.ROYALTY_RATE           = ROYALTY_RATE;
  exports.MAX_FRAMES             = MAX_FRAMES;
  exports.MIN_FRAMES             = MIN_FRAMES;
  exports.MAX_NAME_LENGTH        = MAX_NAME_LENGTH;
  exports.MIN_NAME_LENGTH        = MIN_NAME_LENGTH;
  exports.MIN_FRAME_DURATION_MS  = MIN_FRAME_DURATION_MS;
  exports.MAX_FRAME_DURATION_MS  = MAX_FRAME_DURATION_MS;
  exports.DEFAULT_FRAME_DURATION = DEFAULT_FRAME_DURATION;
  exports.FEATURED_COUNT         = FEATURED_COUNT;

  exports.createLibrary     = createLibrary;
  exports.createEmote       = createEmote;
  exports.useEmote          = useEmote;
  exports.rateEmote         = rateEmote;
  exports.getEmote          = getEmote;
  exports.deleteEmote       = deleteEmote;
  exports.searchEmotes      = searchEmotes;
  exports.getEmotesByCategory = getEmotesByCategory;
  exports.getCreatorEmotes  = getCreatorEmotes;
  exports.getCreatorRoyalties = getCreatorRoyalties;
  exports.getCreatorProfile = getCreatorProfile;
  exports.refreshFeatured   = refreshFeatured;
  exports.getFeatured       = getFeatured;
  exports.getUsageCount     = getUsageCount;
  exports.getAvgRating      = getAvgRating;
  exports.getRatingCount    = getRatingCount;
  exports.getUserRating     = getUserRating;
  exports.validateFrames    = validateFrames;
  exports.validateName      = validateName;
  exports.getEmoteDuration  = getEmoteDuration;
  exports.getDefaultEmotes  = getDefaultEmotes;
  exports.getEmoteRoyalties = getEmoteRoyalties;
  exports.previewFrames     = previewFrames;
  exports.getPoseFrames     = getPoseFrames;
  exports.getPoseFrame      = getPoseFrame;
  exports.getCategories     = getCategories;
  exports.getTopByUsage     = getTopByUsage;
  exports.getTopByRating    = getTopByRating;
  exports.getNewest         = getNewest;

})(typeof module !== 'undefined' ? module.exports : (window.EmoteBuilder = {}));
