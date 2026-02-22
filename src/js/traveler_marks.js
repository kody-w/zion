// traveler_marks.js
/**
 * ZION Traveler Marks System — Constitution §10.3
 *
 * Cross-world travel souvenirs per §10.3:
 *   "A Traveler's Mark — a visible cosmetic indicator that you've visited other worlds.
 *    Marks are unique per fork visited. Collectors will want them all."
 *
 * Features:
 *   - Unique cosmetic mark per fork/world visited
 *   - Mark collection tracking with display on profile
 *   - Worlds-visited history log (timestamps, visit duration)
 *   - Cross-world stories become lore entries in home codex
 *   - Mark rarity: common / rare / legendary based on world age & distance
 *   - Equippable marks visible to other players
 *   - Collector achievements (milestones for marks collected)
 *   - Contact registry (cross-fork friends from visited worlds)
 *   - Visit milestones (rewards for repeat visits and long stays)
 *   - mulberry32 seeded PRNG for deterministic mark generation
 */

(function(exports) {
  'use strict';

  // ── Optional dependency guards ────────────────────────────────────────────
  var Federation          = (typeof window !== 'undefined' && window.Federation)          || {};
  var RiftPortal          = (typeof window !== 'undefined' && window.RiftPortal)          || {};
  var MultiverseReputation= (typeof window !== 'undefined' && window.MultiverseReputation)|| {};
  var Cosmetics           = (typeof window !== 'undefined' && window.Cosmetics)           || {};
  var LoreDiscovery       = (typeof window !== 'undefined' && window.LoreDiscovery)       || {};

  // ── Constants ─────────────────────────────────────────────────────────────

  /** Rarity tiers for marks */
  var RARITY = {
    COMMON:    'common',
    RARE:      'rare',
    LEGENDARY: 'legendary'
  };

  /** Rarity thresholds — world age in days */
  var RARITY_AGE_LEGENDARY = 365;   // world age >= 1 year
  var RARITY_AGE_RARE      = 30;    // world age >= 30 days

  /** Rarity thresholds — federation distance (hops) */
  var RARITY_DIST_LEGENDARY = 3;    // 3+ hops away
  var RARITY_DIST_RARE      = 2;    // 2 hops away

  /** Visit milestone definitions */
  var VISIT_MILESTONES = [
    { id: 'first_visit',   visits: 1,  rewardSpark: 50,   rewardXp: 100, description: 'First visit to a new world' },
    { id: 'three_visits',  visits: 3,  rewardSpark: 100,  rewardXp: 200, description: 'Returning visitor (3 visits)' },
    { id: 'ten_visits',    visits: 10, rewardSpark: 250,  rewardXp: 500, description: 'Veteran visitor (10 visits)' },
    { id: 'fifty_visits',  visits: 50, rewardSpark: 1000, rewardXp: 2000,description: 'World pilgrim (50 visits)' }
  ];

  /** Long-stay milestone in minutes */
  var LONG_STAY_MINUTES = [
    { id: 'stay_15min',  minutes: 15,  rewardSpark: 25,  rewardXp: 50,  description: '15-minute stay in a foreign world' },
    { id: 'stay_1hr',   minutes: 60,  rewardSpark: 100, rewardXp: 200, description: 'One-hour stay in a foreign world' },
    { id: 'stay_1day',  minutes: 1440,rewardSpark: 500, rewardXp: 1000,description: 'Full-day stay in a foreign world' }
  ];

  /** Collector achievement milestones */
  var COLLECTOR_MILESTONES = [
    { id: 'first_mark',        marks: 1,   badge: 'wanderer',       rewardSpark: 100,  rewardXp: 200,  tier: 1 },
    { id: 'three_marks',       marks: 3,   badge: 'explorer',       rewardSpark: 250,  rewardXp: 500,  tier: 1 },
    { id: 'five_marks',        marks: 5,   badge: 'adventurer',     rewardSpark: 500,  rewardXp: 1000, tier: 2 },
    { id: 'ten_marks',         marks: 10,  badge: 'pathfinder',     rewardSpark: 1000, rewardXp: 2000, tier: 2 },
    { id: 'rare_collector',    marks: 3,   badge: 'rare_seeker',    rewardSpark: 750,  rewardXp: 1500, tier: 2, rarityFilter: RARITY.RARE },
    { id: 'legendary_finder',  marks: 1,   badge: 'legend_hunter',  rewardSpark: 2000, rewardXp: 4000, tier: 3, rarityFilter: RARITY.LEGENDARY },
    { id: 'twenty_marks',      marks: 20,  badge: 'voyager',        rewardSpark: 2500, rewardXp: 5000, tier: 3 },
    { id: 'fifty_marks',       marks: 50,  badge: 'world_walker',   rewardSpark: 5000, rewardXp: 10000,tier: 4 },
    { id: 'hundred_marks',     marks: 100, badge: 'multiverse_sage',rewardSpark: 10000,rewardXp: 20000,tier: 5 }
  ];

  /** Mark visual shapes available for generation */
  var MARK_SHAPES = [
    'circle', 'triangle', 'star', 'diamond', 'hexagon',
    'crescent', 'spiral', 'rune', 'glyph', 'sigil',
    'wave', 'flame', 'leaf', 'wing', 'eye'
  ];

  /** Mark color palettes (CSS hex strings) */
  var MARK_COLORS_COMMON    = ['#a0a0a0', '#c0b090', '#90a0b0', '#80c080', '#b09090'];
  var MARK_COLORS_RARE      = ['#4080ff', '#a040ff', '#ff4080', '#40d0c0', '#ffa020'];
  var MARK_COLORS_LEGENDARY = ['#ffd700', '#ff4500', '#7fff00', '#00cfff', '#ff00ff'];

  /** Max lore entries stored per player */
  var MAX_LORE_ENTRIES = 500;

  /** Max contacts stored per player */
  var MAX_CONTACTS = 1000;

  // ── mulberry32 seeded PRNG ────────────────────────────────────────────────

  /**
   * Create a mulberry32 PRNG seeded with a 32-bit integer.
   * Returns a function that yields floats in [0, 1).
   * @param {number} seed
   * @returns {function(): number}
   */
  function mulberry32(seed) {
    var s = seed >>> 0;
    return function() {
      s = (s + 0x6d2b79f5) >>> 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) >>> 0;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Hash a string into a 32-bit unsigned integer (djb2 variant).
   * @param {string} str
   * @returns {number}
   */
  function hashStr(str) {
    var h = 5381;
    var s = String(str || '');
    for (var i = 0; i < s.length; i++) {
      h = (((h << 5) + h) + s.charCodeAt(i)) >>> 0;
    }
    return h;
  }

  // ── Internal state helpers ────────────────────────────────────────────────

  /**
   * Ensure a player record exists, returning it.
   * @param {Object} state
   * @param {string} playerId
   * @returns {Object}
   */
  function _ensurePlayer(state, playerId) {
    if (!state.players[playerId]) {
      state.players[playerId] = {
        playerId: playerId,
        marks: {},              // worldId -> mark object
        equippedMark: null,     // worldId of equipped mark (or null)
        worldsVisited: {},      // worldId -> visit-record object
        loreEntries: [],        // cross-world story lore
        contacts: {},           // contactId -> contact object
        collectorAchievements: [], // unlocked collector milestone ids
        visitMilestones: {},    // worldId -> {visitMilestones: [], stayMilestones: []}
        totalVisits: 0,         // aggregate visits across all worlds
        totalStayMinutes: 0     // aggregate stay time in minutes across all worlds
      };
    }
    return state.players[playerId];
  }

  /**
   * Ensure a visit record for a player+world exists, returning it.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} worldId
   * @returns {Object}
   */
  function _ensureVisitRecord(state, playerId, worldId) {
    var player = _ensurePlayer(state, playerId);
    if (!player.worldsVisited[worldId]) {
      player.worldsVisited[worldId] = {
        worldId: worldId,
        worldName: worldId,
        firstVisitTs: null,
        lastVisitTs: null,
        visitCount: 0,
        totalStayMinutes: 0,
        currentVisitStart: null  // ISO string or null if not currently visiting
      };
    }
    return player.worldsVisited[worldId];
  }

  /**
   * Ensure milestone tracking for a player+world exists.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} worldId
   * @returns {Object}
   */
  function _ensureMilestones(state, playerId, worldId) {
    var player = _ensurePlayer(state, playerId);
    if (!player.visitMilestones[worldId]) {
      player.visitMilestones[worldId] = {
        visitMilestones: [],
        stayMilestones: []
      };
    }
    return player.visitMilestones[worldId];
  }

  /**
   * Pick an item from an array using an rng function.
   * @param {Array} arr
   * @param {function} rng
   * @returns {*}
   */
  function _pick(arr, rng) {
    return arr[Math.floor(rng() * arr.length)];
  }

  // ── State factory ─────────────────────────────────────────────────────────

  /**
   * Create a fresh TravelerMarks state object.
   * @returns {Object}
   */
  function createState() {
    return {
      players: {}
    };
  }

  // ── Mark generation ───────────────────────────────────────────────────────

  /**
   * Determine the rarity of a mark based on world metadata.
   * Rarity is deterministic from worldId alone if metadata missing.
   *
   * @param {string} worldId
   * @param {Object} [worldMeta] - optional { ageInDays: number, distanceHops: number }
   * @returns {string} one of RARITY.COMMON / RARE / LEGENDARY
   */
  function computeRarity(worldId, worldMeta) {
    var meta = worldMeta || {};
    var ageInDays   = (typeof meta.ageInDays   === 'number') ? meta.ageInDays   : -1;
    var distanceHops= (typeof meta.distanceHops === 'number') ? meta.distanceHops : -1;

    // Age-based check
    if (ageInDays >= RARITY_AGE_LEGENDARY) return RARITY.LEGENDARY;
    if (distanceHops >= RARITY_DIST_LEGENDARY) return RARITY.LEGENDARY;
    if (ageInDays >= RARITY_AGE_RARE) return RARITY.RARE;
    if (distanceHops >= RARITY_DIST_RARE) return RARITY.RARE;

    // Fallback: use deterministic PRNG on worldId hash
    if (ageInDays < 0 && distanceHops < 0) {
      var rng = mulberry32(hashStr(worldId));
      var roll = rng();
      if (roll >= 0.95) return RARITY.LEGENDARY;
      if (roll >= 0.70) return RARITY.RARE;
    }

    return RARITY.COMMON;
  }

  /**
   * Generate a deterministic cosmetic mark for a given world.
   * Two calls with the same worldId always produce the same mark.
   *
   * @param {string} worldId
   * @param {string} worldName
   * @param {Object} [worldMeta] - { ageInDays, distanceHops }
   * @returns {Object} mark object
   */
  function generateMark(worldId, worldName, worldMeta) {
    var rarity = computeRarity(worldId, worldMeta);
    var seed   = hashStr(worldId + ':mark');
    var rng    = mulberry32(seed);

    var shape  = _pick(MARK_SHAPES, rng);
    var colors;
    if (rarity === RARITY.LEGENDARY) {
      colors = MARK_COLORS_LEGENDARY;
    } else if (rarity === RARITY.RARE) {
      colors = MARK_COLORS_RARE;
    } else {
      colors = MARK_COLORS_COMMON;
    }
    var primaryColor   = _pick(colors, rng);
    var secondaryColor = _pick(colors, rng);

    // Generate a size multiplier 0.8..1.2 for visual variety
    var sizeMult = 0.8 + rng() * 0.4;
    // Generate a rotation angle 0..360
    var rotation = Math.floor(rng() * 360);

    return {
      worldId:        worldId,
      worldName:      worldName || worldId,
      rarity:         rarity,
      shape:          shape,
      primaryColor:   primaryColor,
      secondaryColor: secondaryColor,
      sizeMult:       Math.round(sizeMult * 100) / 100,
      rotation:       rotation,
      slot:           'traveler_mark',
      equippable:     true,
      description:    'A traveler\'s mark from ' + (worldName || worldId) + '. Rarity: ' + rarity + '.'
    };
  }

  // ── Visit recording ───────────────────────────────────────────────────────

  /**
   * Record the start of a visit to a foreign world.
   * Awards the mark for that world if not already collected.
   * Checks visit-count milestones.
   *
   * @param {Object} state
   * @param {string} playerId
   * @param {string} worldId
   * @param {string} [worldName]
   * @param {Object} [worldMeta] - { ageInDays, distanceHops }
   * @param {string} [ts] - ISO timestamp (defaults to now)
   * @returns {Object} result { mark, isNew, milestones }
   */
  function visitWorld(state, playerId, worldId, worldName, worldMeta, ts) {
    var now       = ts || new Date().toISOString();
    var player    = _ensurePlayer(state, playerId);
    var visitRec  = _ensureVisitRecord(state, playerId, worldId);
    var milestones= _ensureMilestones(state, playerId, worldId);
    var newMilestones = [];

    // Update world name
    if (worldName) visitRec.worldName = worldName;

    // Update visit timestamps and count
    if (!visitRec.firstVisitTs) visitRec.firstVisitTs = now;
    visitRec.lastVisitTs     = now;
    visitRec.visitCount      += 1;
    visitRec.currentVisitStart = now;
    player.totalVisits       += 1;

    // Award mark (idempotent — only once per world)
    var isNew = false;
    var mark  = player.marks[worldId];
    if (!mark) {
      mark = generateMark(worldId, worldName, worldMeta);
      player.marks[worldId] = mark;
      isNew = true;
    }

    // Check visit-count milestones
    newMilestones = newMilestones.concat(
      _checkVisitCountMilestones(state, playerId, worldId, visitRec.visitCount, milestones)
    );

    // Check collector achievements
    var collectorResults = _checkCollectorAchievements(state, playerId);
    newMilestones = newMilestones.concat(collectorResults);

    return { mark: mark, isNew: isNew, milestones: newMilestones };
  }

  /**
   * Record the end of a visit (player returned home).
   * Calculates stay duration and awards stay milestones.
   *
   * @param {Object} state
   * @param {string} playerId
   * @param {string} worldId
   * @param {string} [ts] - ISO timestamp of departure (defaults to now)
   * @returns {Object} result { stayMinutes, milestones }
   */
  function leaveWorld(state, playerId, worldId, ts) {
    var now      = ts || new Date().toISOString();
    var player   = _ensurePlayer(state, playerId);
    var visitRec = _ensureVisitRecord(state, playerId, worldId);
    var milestones = _ensureMilestones(state, playerId, worldId);
    var newMilestones = [];
    var stayMinutes = 0;

    if (visitRec.currentVisitStart) {
      var start = new Date(visitRec.currentVisitStart).getTime();
      var end   = new Date(now).getTime();
      if (!isNaN(start) && !isNaN(end) && end > start) {
        stayMinutes = Math.round((end - start) / 60000);
      }
      visitRec.currentVisitStart = null;
    }

    visitRec.totalStayMinutes  += stayMinutes;
    player.totalStayMinutes    += stayMinutes;

    // Check stay milestones
    newMilestones = newMilestones.concat(
      _checkStayMilestones(state, playerId, worldId, visitRec.totalStayMinutes, milestones)
    );

    return { stayMinutes: stayMinutes, milestones: newMilestones };
  }

  // ── Milestone checking ────────────────────────────────────────────────────

  /**
   * Check and unlock visit-count milestones for a world.
   * @private
   */
  function _checkVisitCountMilestones(state, playerId, worldId, visitCount, milestones) {
    var unlocked = [];
    for (var i = 0; i < VISIT_MILESTONES.length; i++) {
      var vm = VISIT_MILESTONES[i];
      var key = worldId + ':' + vm.id;
      if (visitCount >= vm.visits && milestones.visitMilestones.indexOf(key) === -1) {
        milestones.visitMilestones.push(key);
        unlocked.push({
          type: 'visit_milestone',
          id: vm.id,
          worldId: worldId,
          rewardSpark: vm.rewardSpark,
          rewardXp: vm.rewardXp,
          description: vm.description
        });
      }
    }
    return unlocked;
  }

  /**
   * Check and unlock stay milestones for a world.
   * @private
   */
  function _checkStayMilestones(state, playerId, worldId, totalStayMinutes, milestones) {
    var unlocked = [];
    for (var i = 0; i < LONG_STAY_MINUTES.length; i++) {
      var sm = LONG_STAY_MINUTES[i];
      var key = worldId + ':' + sm.id;
      if (totalStayMinutes >= sm.minutes && milestones.stayMilestones.indexOf(key) === -1) {
        milestones.stayMilestones.push(key);
        unlocked.push({
          type: 'stay_milestone',
          id: sm.id,
          worldId: worldId,
          rewardSpark: sm.rewardSpark,
          rewardXp: sm.rewardXp,
          description: sm.description
        });
      }
    }
    return unlocked;
  }

  /**
   * Check and unlock collector achievements.
   * @private
   */
  function _checkCollectorAchievements(state, playerId) {
    var player  = _ensurePlayer(state, playerId);
    var marks   = player.marks;
    var total   = Object.keys(marks).length;
    var unlocked= [];

    for (var i = 0; i < COLLECTOR_MILESTONES.length; i++) {
      var cm = COLLECTOR_MILESTONES[i];
      if (player.collectorAchievements.indexOf(cm.id) !== -1) continue;

      var count;
      if (cm.rarityFilter) {
        // Count marks of that specific rarity
        count = 0;
        var worldIds = Object.keys(marks);
        for (var j = 0; j < worldIds.length; j++) {
          if (marks[worldIds[j]].rarity === cm.rarityFilter) count++;
        }
      } else {
        count = total;
      }

      if (count >= cm.marks) {
        player.collectorAchievements.push(cm.id);
        unlocked.push({
          type: 'collector_achievement',
          id: cm.id,
          badge: cm.badge,
          rewardSpark: cm.rewardSpark,
          rewardXp: cm.rewardXp,
          tier: cm.tier,
          description: 'Collector milestone: ' + cm.id
        });
      }
    }
    return unlocked;
  }

  // ── Mark management ───────────────────────────────────────────────────────

  /**
   * Get all marks collected by a player.
   * @param {Object} state
   * @param {string} playerId
   * @returns {Array} array of mark objects
   */
  function getMarks(state, playerId) {
    var player = state.players[playerId];
    if (!player) return [];
    return Object.keys(player.marks).map(function(wid) { return player.marks[wid]; });
  }

  /**
   * Get a single mark by worldId.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} worldId
   * @returns {Object|null}
   */
  function getMark(state, playerId, worldId) {
    var player = state.players[playerId];
    if (!player) return null;
    return player.marks[worldId] || null;
  }

  /**
   * Equip a mark (makes it visible to other players).
   * @param {Object} state
   * @param {string} playerId
   * @param {string} worldId - worldId of the mark to equip, or null to unequip
   * @returns {boolean} success
   */
  function equipMark(state, playerId, worldId) {
    var player = _ensurePlayer(state, playerId);
    if (worldId === null || worldId === undefined) {
      player.equippedMark = null;
      return true;
    }
    if (!player.marks[worldId]) return false;
    player.equippedMark = worldId;
    return true;
  }

  /**
   * Get the currently equipped mark object, or null.
   * @param {Object} state
   * @param {string} playerId
   * @returns {Object|null}
   */
  function getEquippedMark(state, playerId) {
    var player = state.players[playerId];
    if (!player || !player.equippedMark) return null;
    return player.marks[player.equippedMark] || null;
  }

  /**
   * Get marks grouped by rarity.
   * @param {Object} state
   * @param {string} playerId
   * @returns {Object} { common: [], rare: [], legendary: [] }
   */
  function getMarksByRarity(state, playerId) {
    var all = getMarks(state, playerId);
    var result = {};
    result[RARITY.COMMON]    = [];
    result[RARITY.RARE]      = [];
    result[RARITY.LEGENDARY] = [];
    for (var i = 0; i < all.length; i++) {
      var m = all[i];
      if (result[m.rarity]) result[m.rarity].push(m);
    }
    return result;
  }

  /**
   * Count marks by rarity.
   * @param {Object} state
   * @param {string} playerId
   * @returns {Object} { common: n, rare: n, legendary: n, total: n }
   */
  function countMarksByRarity(state, playerId) {
    var grouped = getMarksByRarity(state, playerId);
    return {
      common:    grouped[RARITY.COMMON].length,
      rare:      grouped[RARITY.RARE].length,
      legendary: grouped[RARITY.LEGENDARY].length,
      total:     grouped[RARITY.COMMON].length + grouped[RARITY.RARE].length + grouped[RARITY.LEGENDARY].length
    };
  }

  // ── Worlds-visited history ────────────────────────────────────────────────

  /**
   * Get the full visit history for a player.
   * @param {Object} state
   * @param {string} playerId
   * @returns {Array} array of visit-record objects
   */
  function getVisitHistory(state, playerId) {
    var player = state.players[playerId];
    if (!player) return [];
    return Object.keys(player.worldsVisited).map(function(wid) {
      return player.worldsVisited[wid];
    });
  }

  /**
   * Get the visit record for a specific world.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} worldId
   * @returns {Object|null}
   */
  function getVisitRecord(state, playerId, worldId) {
    var player = state.players[playerId];
    if (!player) return null;
    return player.worldsVisited[worldId] || null;
  }

  /**
   * Get all worlds a player has visited, sorted by most recent visit.
   * @param {Object} state
   * @param {string} playerId
   * @returns {Array}
   */
  function getVisitedWorldsSorted(state, playerId) {
    var history = getVisitHistory(state, playerId);
    history.sort(function(a, b) {
      var ta = a.lastVisitTs ? new Date(a.lastVisitTs).getTime() : 0;
      var tb = b.lastVisitTs ? new Date(b.lastVisitTs).getTime() : 0;
      return tb - ta;
    });
    return history;
  }

  /**
   * Count distinct worlds visited by a player.
   * @param {Object} state
   * @param {string} playerId
   * @returns {number}
   */
  function countWorldsVisited(state, playerId) {
    var player = state.players[playerId];
    if (!player) return 0;
    return Object.keys(player.worldsVisited).length;
  }

  /**
   * Check whether a player has visited a world.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} worldId
   * @returns {boolean}
   */
  function hasVisited(state, playerId, worldId) {
    var player = state.players[playerId];
    if (!player) return false;
    return !!player.worldsVisited[worldId];
  }

  // ── Cross-world lore entries ──────────────────────────────────────────────

  /**
   * Add a cross-world story as a lore entry in the player's home codex.
   * §10.3: "Stories — cross-world experiences become lore entries in your home world's discovery log"
   *
   * @param {Object} state
   * @param {string} playerId
   * @param {string} worldId        - the visited world
   * @param {string} worldName
   * @param {string} storyTitle
   * @param {string} storyBody
   * @param {string} [ts]           - ISO timestamp
   * @returns {Object} lore entry
   */
  function addLoreEntry(state, playerId, worldId, worldName, storyTitle, storyBody, ts) {
    var player = _ensurePlayer(state, playerId);
    var entry = {
      id:        'lore_' + playerId + '_' + worldId + '_' + (player.loreEntries.length + 1),
      type:      'cross_world_story',
      worldId:   worldId,
      worldName: worldName || worldId,
      title:     storyTitle || 'A Tale from ' + (worldName || worldId),
      body:      storyBody  || '',
      ts:        ts || new Date().toISOString(),
      playerId:  playerId
    };

    player.loreEntries.push(entry);

    // Trim to max
    if (player.loreEntries.length > MAX_LORE_ENTRIES) {
      player.loreEntries = player.loreEntries.slice(player.loreEntries.length - MAX_LORE_ENTRIES);
    }

    return entry;
  }

  /**
   * Get all lore entries for a player.
   * @param {Object} state
   * @param {string} playerId
   * @returns {Array}
   */
  function getLoreEntries(state, playerId) {
    var player = state.players[playerId];
    if (!player) return [];
    return player.loreEntries.slice();
  }

  /**
   * Get lore entries for a specific world.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} worldId
   * @returns {Array}
   */
  function getLoreEntriesForWorld(state, playerId, worldId) {
    var all = getLoreEntries(state, playerId);
    return all.filter(function(e) { return e.worldId === worldId; });
  }

  // ── Cross-fork contact registry ───────────────────────────────────────────

  /**
   * Add a cross-fork contact (friend met in a visited world).
   * §10.3: "Friendships — your social connections persist across worlds"
   *
   * @param {Object} state
   * @param {string} playerId
   * @param {string} contactId     - the contact's playerId
   * @param {string} contactName   - display name
   * @param {string} worldId       - world where they met
   * @param {string} [worldName]
   * @param {string} [ts]
   * @returns {Object} contact record
   */
  function addContact(state, playerId, contactId, contactName, worldId, worldName, ts) {
    var player = _ensurePlayer(state, playerId);

    if (Object.keys(player.contacts).length >= MAX_CONTACTS) return null;

    var existing = player.contacts[contactId];
    if (existing) {
      // Update last-seen and mutual worlds
      existing.lastSeenTs   = ts || new Date().toISOString();
      existing.lastSeenWorld= worldId;
      if (worldId && existing.metInWorlds.indexOf(worldId) === -1) {
        existing.metInWorlds.push(worldId);
      }
      return existing;
    }

    var contact = {
      contactId:     contactId,
      contactName:   contactName || contactId,
      metInWorldId:  worldId,
      metInWorldName:worldName || worldId,
      metTs:         ts || new Date().toISOString(),
      lastSeenTs:    ts || new Date().toISOString(),
      lastSeenWorld: worldId,
      metInWorlds:   worldId ? [worldId] : []
    };

    player.contacts[contactId] = contact;
    return contact;
  }

  /**
   * Get all contacts for a player.
   * @param {Object} state
   * @param {string} playerId
   * @returns {Array}
   */
  function getContacts(state, playerId) {
    var player = state.players[playerId];
    if (!player) return [];
    return Object.keys(player.contacts).map(function(cid) { return player.contacts[cid]; });
  }

  /**
   * Get a specific contact by id.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} contactId
   * @returns {Object|null}
   */
  function getContact(state, playerId, contactId) {
    var player = state.players[playerId];
    if (!player) return null;
    return player.contacts[contactId] || null;
  }

  /**
   * Remove a contact.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} contactId
   * @returns {boolean}
   */
  function removeContact(state, playerId, contactId) {
    var player = state.players[playerId];
    if (!player || !player.contacts[contactId]) return false;
    delete player.contacts[contactId];
    return true;
  }

  /**
   * Get contacts met in a specific world.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} worldId
   * @returns {Array}
   */
  function getContactsFromWorld(state, playerId, worldId) {
    return getContacts(state, playerId).filter(function(c) {
      return c.metInWorldId === worldId || c.metInWorlds.indexOf(worldId) !== -1;
    });
  }

  // ── Profile helpers ───────────────────────────────────────────────────────

  /**
   * Get the full traveler profile for a player.
   * @param {Object} state
   * @param {string} playerId
   * @returns {Object|null}
   */
  function getProfile(state, playerId) {
    var player = state.players[playerId];
    if (!player) return null;
    var counts = countMarksByRarity(state, playerId);
    return {
      playerId:               playerId,
      totalMarks:             counts.total,
      commonMarks:            counts.common,
      rareMarks:              counts.rare,
      legendaryMarks:         counts.legendary,
      worldsVisited:          countWorldsVisited(state, playerId),
      totalVisits:            player.totalVisits,
      totalStayMinutes:       player.totalStayMinutes,
      equippedMark:           getEquippedMark(state, playerId),
      collectorAchievements:  player.collectorAchievements.slice(),
      loreEntryCount:         player.loreEntries.length,
      contactCount:           Object.keys(player.contacts).length
    };
  }

  /**
   * Get the summary of collector achievements for a player.
   * @param {Object} state
   * @param {string} playerId
   * @returns {Array} unlocked milestone ids
   */
  function getCollectorAchievements(state, playerId) {
    var player = state.players[playerId];
    if (!player) return [];
    return player.collectorAchievements.slice();
  }

  /**
   * Get all collector milestones with locked/unlocked status.
   * @param {Object} state
   * @param {string} playerId
   * @returns {Array}
   */
  function getCollectorProgress(state, playerId) {
    var player   = state.players[playerId];
    var unlocked = player ? player.collectorAchievements : [];
    var marks    = player ? player.marks : {};
    var total    = Object.keys(marks).length;

    return COLLECTOR_MILESTONES.map(function(cm) {
      var count;
      if (cm.rarityFilter) {
        count = 0;
        var wids = Object.keys(marks);
        for (var i = 0; i < wids.length; i++) {
          if (marks[wids[i]].rarity === cm.rarityFilter) count++;
        }
      } else {
        count = total;
      }
      return {
        id:           cm.id,
        badge:        cm.badge,
        required:     cm.marks,
        current:      count,
        rarityFilter: cm.rarityFilter || null,
        unlocked:     unlocked.indexOf(cm.id) !== -1,
        rewardSpark:  cm.rewardSpark,
        rewardXp:     cm.rewardXp,
        tier:         cm.tier
      };
    });
  }

  /**
   * Get all visit milestones for a specific world.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} worldId
   * @returns {Object} { visitMilestones: [], stayMilestones: [] }
   */
  function getWorldMilestones(state, playerId, worldId) {
    var player = state.players[playerId];
    if (!player || !player.visitMilestones[worldId]) {
      return { visitMilestones: [], stayMilestones: [] };
    }
    return {
      visitMilestones: player.visitMilestones[worldId].visitMilestones.slice(),
      stayMilestones:  player.visitMilestones[worldId].stayMilestones.slice()
    };
  }

  // ── Serialization / merge ─────────────────────────────────────────────────

  /**
   * Serialize state to a JSON string.
   * @param {Object} state
   * @returns {string}
   */
  function serialize(state) {
    return JSON.stringify(state);
  }

  /**
   * Deserialize state from a JSON string.
   * @param {string} json
   * @returns {Object}
   */
  function deserialize(json) {
    try {
      return JSON.parse(json);
    } catch (e) {
      return createState();
    }
  }

  /**
   * Merge another player's exported traveler data into the main state.
   * Useful for sync between instances.
   *
   * @param {Object} state
   * @param {string} playerId
   * @param {Object} exportedPlayerData - a player object from another state
   * @returns {boolean} success
   */
  function mergePlayerData(state, playerId, exportedPlayerData) {
    if (!exportedPlayerData || typeof exportedPlayerData !== 'object') return false;
    var player = _ensurePlayer(state, playerId);

    // Merge marks
    if (exportedPlayerData.marks && typeof exportedPlayerData.marks === 'object') {
      var wids = Object.keys(exportedPlayerData.marks);
      for (var i = 0; i < wids.length; i++) {
        if (!player.marks[wids[i]]) {
          player.marks[wids[i]] = exportedPlayerData.marks[wids[i]];
        }
      }
    }

    // Merge worlds visited
    if (exportedPlayerData.worldsVisited && typeof exportedPlayerData.worldsVisited === 'object') {
      var worldIds = Object.keys(exportedPlayerData.worldsVisited);
      for (var j = 0; j < worldIds.length; j++) {
        var wid = worldIds[j];
        if (!player.worldsVisited[wid]) {
          player.worldsVisited[wid] = exportedPlayerData.worldsVisited[wid];
        }
      }
    }

    // Merge contacts
    if (exportedPlayerData.contacts && typeof exportedPlayerData.contacts === 'object') {
      var cids = Object.keys(exportedPlayerData.contacts);
      for (var k = 0; k < cids.length; k++) {
        var cid = cids[k];
        if (!player.contacts[cid]) {
          player.contacts[cid] = exportedPlayerData.contacts[cid];
        }
      }
    }

    return true;
  }

  // ── Exports ───────────────────────────────────────────────────────────────

  exports.RARITY                 = RARITY;
  exports.RARITY_AGE_LEGENDARY   = RARITY_AGE_LEGENDARY;
  exports.RARITY_AGE_RARE        = RARITY_AGE_RARE;
  exports.RARITY_DIST_LEGENDARY  = RARITY_DIST_LEGENDARY;
  exports.RARITY_DIST_RARE       = RARITY_DIST_RARE;
  exports.VISIT_MILESTONES       = VISIT_MILESTONES;
  exports.LONG_STAY_MINUTES      = LONG_STAY_MINUTES;
  exports.COLLECTOR_MILESTONES   = COLLECTOR_MILESTONES;
  exports.MARK_SHAPES            = MARK_SHAPES;

  exports.mulberry32             = mulberry32;
  exports.hashStr                = hashStr;
  exports.computeRarity          = computeRarity;
  exports.generateMark           = generateMark;

  exports.createState            = createState;
  exports.visitWorld             = visitWorld;
  exports.leaveWorld             = leaveWorld;

  exports.getMarks               = getMarks;
  exports.getMark                = getMark;
  exports.equipMark              = equipMark;
  exports.getEquippedMark        = getEquippedMark;
  exports.getMarksByRarity       = getMarksByRarity;
  exports.countMarksByRarity     = countMarksByRarity;

  exports.getVisitHistory        = getVisitHistory;
  exports.getVisitRecord         = getVisitRecord;
  exports.getVisitedWorldsSorted = getVisitedWorldsSorted;
  exports.countWorldsVisited     = countWorldsVisited;
  exports.hasVisited             = hasVisited;

  exports.addLoreEntry           = addLoreEntry;
  exports.getLoreEntries         = getLoreEntries;
  exports.getLoreEntriesForWorld = getLoreEntriesForWorld;

  exports.addContact             = addContact;
  exports.getContacts            = getContacts;
  exports.getContact             = getContact;
  exports.removeContact          = removeContact;
  exports.getContactsFromWorld   = getContactsFromWorld;

  exports.getProfile             = getProfile;
  exports.getCollectorAchievements = getCollectorAchievements;
  exports.getCollectorProgress   = getCollectorProgress;
  exports.getWorldMilestones     = getWorldMilestones;

  exports.serialize              = serialize;
  exports.deserialize            = deserialize;
  exports.mergePlayerData        = mergePlayerData;

})(typeof module !== 'undefined' ? module.exports : (window.TravelerMarks = {}));
