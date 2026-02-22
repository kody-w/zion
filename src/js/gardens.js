// gardens.js — Garden Collaboration System for ZION
// Implements multi-player garden tending per Constitution §5.2 and §5.4
// "The most peaceful place in ZION" — collaborative gardening where multiple
// players can tend the same plot.
(function(exports) {
  'use strict';

  // ── Constants ─────────────────────────────────────────────────────────────

  /** Maximum collaborators per garden (owner + this many others) */
  var MAX_COLLABORATORS = 5;

  /** Growth multiplier bonus per active collaborator (e.g. 0.1 = +10% per collaborator) */
  var COLLABORATION_BONUS = 0.1;

  /** How long (ms) a tending action counts as "active" for bonus calculation */
  var ACTIVE_WINDOW_MS = 86400000; // 24 hours

  /** Minimum tending actions needed to be considered an "active" collaborator */
  var ACTIVE_TEND_THRESHOLD = 1;

  /** Valid tending actions */
  var VALID_TEND_ACTIONS = ['water', 'weed', 'fertilize'];

  /** Zones where garden collaboration is permitted (must have harvesting: true) */
  var GARDEN_ZONES = ['gardens', 'wilds'];

  /** Garden plot sizes */
  var PLOT_SIZES = ['small', 'medium', 'large'];

  /** Default zone for a new garden */
  var DEFAULT_ZONE = 'gardens';

  // ── ID Generation ──────────────────────────────────────────────────────────

  /**
   * Generate a short unique ID
   * @returns {string}
   */
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  // ── In-memory garden store ─────────────────────────────────────────────────
  // Each garden has the shape:
  // {
  //   id: string,
  //   ownerId: string,
  //   position: {x, y, z},
  //   zoneName: string,
  //   collaborators: [string],   // player IDs (not including owner)
  //   isPublic: boolean,
  //   createdAt: number,         // epoch ms
  //   tending: [                 // tending event log
  //     { playerId, action, ts }
  //   ],
  //   contributions: {           // playerId -> count
  //     <playerId>: number
  //   },
  //   fertility: number,         // 0-1, inherited from plot or default 0.7
  //   size: string,
  //   health: number             // 0-1, computed lazily
  // }

  var gardens = {}; // gardenId -> garden object

  // ── Helper: internal garden lookup ─────────────────────────────────────────

  function _getGarden(gardenId) {
    return gardens[gardenId] || null;
  }

  // ── Core API ───────────────────────────────────────────────────────────────

  /**
   * Create a new garden plot.
   *
   * @param {string} ownerId    - Player ID of the owner
   * @param {Object} position   - {x, y, z} world coordinates
   * @param {string} [zoneName] - Zone name (must allow harvesting); defaults to 'gardens'
   * @returns {{success:boolean, garden?:Object, error?:string}}
   */
  function createGarden(ownerId, position, zoneName) {
    if (!ownerId || typeof ownerId !== 'string' || ownerId.trim() === '') {
      return { success: false, error: 'Invalid ownerId' };
    }

    var zone = zoneName || DEFAULT_ZONE;

    if (GARDEN_ZONES.indexOf(zone) === -1) {
      return { success: false, error: 'Gardens not allowed in zone: ' + zone };
    }

    if (!position || typeof position !== 'object') {
      return { success: false, error: 'Invalid position' };
    }

    if (typeof position.x !== 'number' || typeof position.y !== 'number' || typeof position.z !== 'number') {
      return { success: false, error: 'Position must have numeric x, y, z' };
    }

    var garden = {
      id: generateId(),
      ownerId: ownerId,
      position: { x: position.x, y: position.y, z: position.z },
      zoneName: zone,
      collaborators: [],
      isPublic: false,
      createdAt: Date.now(),
      tending: [],
      contributions: {},
      fertility: 0.7,
      size: 'medium',
      health: 1.0
    };

    // Track owner contributions
    garden.contributions[ownerId] = 0;

    gardens[garden.id] = garden;

    return { success: true, garden: garden };
  }

  /**
   * Invite a collaborator to a garden.
   *
   * @param {string} gardenId        - Garden ID
   * @param {string} ownerId         - Must be the garden owner
   * @param {string} collaboratorId  - Player to invite
   * @returns {{success:boolean, error?:string}}
   */
  function addCollaborator(gardenId, ownerId, collaboratorId) {
    var garden = _getGarden(gardenId);
    if (!garden) {
      return { success: false, error: 'Garden not found' };
    }

    if (garden.ownerId !== ownerId) {
      return { success: false, error: 'Only the owner can add collaborators' };
    }

    if (!collaboratorId || typeof collaboratorId !== 'string' || collaboratorId.trim() === '') {
      return { success: false, error: 'Invalid collaboratorId' };
    }

    if (collaboratorId === ownerId) {
      return { success: false, error: 'Owner is already a member of the garden' };
    }

    if (garden.collaborators.indexOf(collaboratorId) !== -1) {
      return { success: false, error: 'Player is already a collaborator' };
    }

    if (garden.collaborators.length >= MAX_COLLABORATORS) {
      return { success: false, error: 'Garden has reached maximum collaborators (' + MAX_COLLABORATORS + ')' };
    }

    garden.collaborators.push(collaboratorId);

    // Initialise contribution counter for new collaborator
    if (garden.contributions[collaboratorId] === undefined) {
      garden.contributions[collaboratorId] = 0;
    }

    return { success: true };
  }

  /**
   * Remove a collaborator from a garden.
   *
   * @param {string} gardenId        - Garden ID
   * @param {string} ownerId         - Must be the garden owner
   * @param {string} collaboratorId  - Player to remove
   * @returns {{success:boolean, error?:string}}
   */
  function removeCollaborator(gardenId, ownerId, collaboratorId) {
    var garden = _getGarden(gardenId);
    if (!garden) {
      return { success: false, error: 'Garden not found' };
    }

    if (garden.ownerId !== ownerId) {
      return { success: false, error: 'Only the owner can remove collaborators' };
    }

    var idx = garden.collaborators.indexOf(collaboratorId);
    if (idx === -1) {
      return { success: false, error: 'Player is not a collaborator' };
    }

    garden.collaborators.splice(idx, 1);

    return { success: true };
  }

  /**
   * List all collaborators for a garden (not including the owner).
   *
   * @param {string} gardenId
   * @returns {string[]} Array of collaborator player IDs
   */
  function getCollaborators(gardenId) {
    var garden = _getGarden(gardenId);
    if (!garden) return [];
    return garden.collaborators.slice();
  }

  /**
   * Check whether a player may tend a garden (owner or collaborator).
   * Public gardens also allow any player to tend.
   *
   * @param {string} gardenId
   * @param {string} playerId
   * @returns {boolean}
   */
  function canTend(gardenId, playerId) {
    var garden = _getGarden(gardenId);
    if (!garden) return false;

    if (garden.ownerId === playerId) return true;
    if (garden.collaborators.indexOf(playerId) !== -1) return true;
    if (garden.isPublic) return true;

    return false;
  }

  /**
   * Record a tending action (water, weed, fertilize) on a garden.
   *
   * @param {string} gardenId
   * @param {string} playerId
   * @param {string} action   - 'water' | 'weed' | 'fertilize'
   * @returns {{success:boolean, tendingEvent?:Object, error?:string}}
   */
  function tendGarden(gardenId, playerId, action) {
    var garden = _getGarden(gardenId);
    if (!garden) {
      return { success: false, error: 'Garden not found' };
    }

    if (!canTend(gardenId, playerId)) {
      return { success: false, error: 'Player does not have permission to tend this garden' };
    }

    if (VALID_TEND_ACTIONS.indexOf(action) === -1) {
      return { success: false, error: 'Invalid tending action: ' + action + '. Valid actions: ' + VALID_TEND_ACTIONS.join(', ') };
    }

    var event = {
      playerId: playerId,
      action: action,
      ts: Date.now()
    };

    garden.tending.push(event);

    // Increment contribution counter
    if (garden.contributions[playerId] === undefined) {
      garden.contributions[playerId] = 0;
    }
    garden.contributions[playerId]++;

    // Recalculate health lazily
    garden.health = getGardenHealth(garden);

    return { success: true, tendingEvent: event };
  }

  /**
   * Compute the overall health score (0–1) of a garden based on recent tending.
   * Health decays toward 0 without tending and is boosted by collaboration bonus.
   *
   * Formula:
   *   base = clamp(recentActions / 10, 0, 1)   // up to 10 actions = full health
   *   bonus = getBonusFromCollaboration(garden)
   *   health = clamp(base * (1 + bonus), 0, 1)
   *
   * @param {Object} garden - Garden object (need not be from the internal store)
   * @returns {number} 0-1 health score
   */
  function getGardenHealth(garden) {
    if (!garden || !garden.tending) return 0;

    var now = Date.now();
    var recentActions = garden.tending.filter(function(e) {
      return (now - e.ts) <= ACTIVE_WINDOW_MS;
    }).length;

    var base = Math.min(recentActions / 10, 1);
    var bonus = getBonusFromCollaboration(garden);
    var health = Math.min(base * (1 + bonus), 1);

    return health;
  }

  /**
   * Return contribution counts per player.
   *
   * @param {string} gardenId
   * @returns {Object} { <playerId>: number } — all-time tending action counts
   */
  function getContributions(gardenId) {
    var garden = _getGarden(gardenId);
    if (!garden) return {};

    // Return a copy so callers cannot mutate internal state
    var result = {};
    var keys = Object.keys(garden.contributions);
    for (var i = 0; i < keys.length; i++) {
      result[keys[i]] = garden.contributions[keys[i]];
    }
    return result;
  }

  /**
   * Calculate the fair harvest share (0–1) for a player based on contributions.
   * Owner always gets at least a base share equal to 1/(collaborators+1).
   * If there are no contributions at all, owner gets 100%.
   *
   * @param {string} gardenId
   * @param {string} playerId
   * @returns {number} Share fraction 0-1
   */
  function getHarvestShare(gardenId, playerId) {
    var garden = _getGarden(gardenId);
    if (!garden) return 0;

    var contributions = garden.contributions;
    var total = 0;
    var keys = Object.keys(contributions);

    for (var i = 0; i < keys.length; i++) {
      total += contributions[keys[i]];
    }

    // No tending at all → owner takes everything
    if (total === 0) {
      if (playerId === garden.ownerId) return 1;
      return 0;
    }

    var playerShare = contributions[playerId] || 0;

    // If player has 0 contributions but is the owner, ensure a minimum share
    if (playerShare === 0 && playerId === garden.ownerId) {
      // Owner base share = 1 / (number of members)
      var memberCount = garden.collaborators.length + 1; // +1 for owner
      var baseShare = 1 / memberCount;
      // Re-weight: owner gets baseShare, rest distributed proportionally
      var remaining = 1 - baseShare;
      // If total collaborator contribution is 0, owner still gets baseShare
      return baseShare;
    }

    return playerShare / total;
  }

  /**
   * Calculate the growth / yield bonus from collaboration.
   * Each "active" collaborator (tended in the last ACTIVE_WINDOW_MS) adds
   * COLLABORATION_BONUS to the multiplier.
   *
   * @param {Object} garden - Garden object
   * @returns {number} Bonus multiplier (e.g. 0.2 = 20% extra yield)
   */
  function getBonusFromCollaboration(garden) {
    if (!garden || !garden.tending) return 0;

    var now = Date.now();
    var activePlayerIds = {};

    // Collect unique players who tended recently
    for (var i = 0; i < garden.tending.length; i++) {
      var event = garden.tending[i];
      if ((now - event.ts) <= ACTIVE_WINDOW_MS) {
        activePlayerIds[event.playerId] = true;
      }
    }

    var activeCount = Object.keys(activePlayerIds).length;

    // Bonus only kicks in when more than 1 person has tended
    var collaboratorCount = Math.max(0, activeCount - 1);
    return collaboratorCount * COLLABORATION_BONUS;
  }

  /**
   * Get comprehensive stats for a garden.
   *
   * @param {string} gardenId
   * @returns {Object|null} Stats object or null if not found
   */
  function getGardenStats(gardenId) {
    var garden = _getGarden(gardenId);
    if (!garden) return null;

    var now = Date.now();
    var recentTending = garden.tending.filter(function(e) {
      return (now - e.ts) <= ACTIVE_WINDOW_MS;
    });

    var activeTenders = {};
    for (var i = 0; i < recentTending.length; i++) {
      activeTenders[recentTending[i].playerId] = true;
    }

    var actionCounts = {};
    for (var j = 0; j < garden.tending.length; j++) {
      var action = garden.tending[j].action;
      actionCounts[action] = (actionCounts[action] || 0) + 1;
    }

    return {
      id: garden.id,
      ownerId: garden.ownerId,
      zoneName: garden.zoneName,
      position: garden.position,
      collaborators: garden.collaborators.slice(),
      isPublic: garden.isPublic,
      createdAt: garden.createdAt,
      health: getGardenHealth(garden),
      collaborationBonus: getBonusFromCollaboration(garden),
      totalTendingActions: garden.tending.length,
      recentTendingActions: recentTending.length,
      activeTenderCount: Object.keys(activeTenders).length,
      contributions: getContributions(gardenId),
      actionBreakdown: actionCounts,
      fertility: garden.fertility,
      size: garden.size
    };
  }

  /**
   * List all gardens that are open for collaboration (isPublic: true).
   *
   * @returns {Object[]} Array of garden stats objects
   */
  function listPublicGardens() {
    var result = [];
    var ids = Object.keys(gardens);
    for (var i = 0; i < ids.length; i++) {
      var garden = gardens[ids[i]];
      if (garden.isPublic) {
        result.push(getGardenStats(garden.id));
      }
    }
    return result;
  }

  /**
   * Toggle a garden between public and private.
   * Public gardens can be tended by any player, even without an invitation.
   *
   * @param {string} gardenId
   * @param {string} ownerId    - Must be the garden owner
   * @param {boolean} isPublic
   * @returns {{success:boolean, error?:string}}
   */
  function setGardenPublic(gardenId, ownerId, isPublic) {
    var garden = _getGarden(gardenId);
    if (!garden) {
      return { success: false, error: 'Garden not found' };
    }

    if (garden.ownerId !== ownerId) {
      return { success: false, error: 'Only the owner can change garden visibility' };
    }

    if (typeof isPublic !== 'boolean') {
      return { success: false, error: 'isPublic must be a boolean' };
    }

    garden.isPublic = isPublic;

    return { success: true };
  }

  // ── Garden store helpers (for testing / state sync) ────────────────────────

  /**
   * Reset the internal garden store. Useful for testing.
   */
  function _resetStore() {
    gardens = {};
  }

  /**
   * Directly inject a garden into the store. Useful for loading canonical state.
   * @param {Object} garden - Full garden object
   */
  function _loadGarden(garden) {
    if (garden && garden.id) {
      gardens[garden.id] = garden;
    }
  }

  /**
   * Retrieve all gardens as a plain object (for serialisation).
   * @returns {Object} gardenId -> garden
   */
  function _getAllGardens() {
    return gardens;
  }

  // ── Protocol message handlers ──────────────────────────────────────────────

  /**
   * Handle a 'garden_create' protocol message.
   * @param {Object} msg   - Protocol message
   * @returns {{success:boolean, garden?:Object, error?:string}}
   */
  function handleGardenCreate(msg) {
    var payload = msg.payload || {};
    return createGarden(
      msg.from,
      payload.position || { x: 0, y: 0, z: 0 },
      payload.zone || DEFAULT_ZONE
    );
  }

  /**
   * Handle a 'garden_invite' protocol message.
   * @param {Object} msg
   * @returns {{success:boolean, error?:string}}
   */
  function handleGardenInvite(msg) {
    var payload = msg.payload || {};
    return addCollaborator(payload.gardenId, msg.from, payload.collaboratorId);
  }

  /**
   * Handle a 'garden_uninvite' protocol message.
   * @param {Object} msg
   * @returns {{success:boolean, error?:string}}
   */
  function handleGardenUninvite(msg) {
    var payload = msg.payload || {};
    return removeCollaborator(payload.gardenId, msg.from, payload.collaboratorId);
  }

  /**
   * Handle a 'garden_tend' protocol message.
   * @param {Object} msg
   * @returns {{success:boolean, tendingEvent?:Object, error?:string}}
   */
  function handleGardenTend(msg) {
    var payload = msg.payload || {};
    return tendGarden(payload.gardenId, msg.from, payload.action);
  }

  /**
   * Handle a 'garden_set_public' protocol message.
   * @param {Object} msg
   * @returns {{success:boolean, error?:string}}
   */
  function handleGardenSetPublic(msg) {
    var payload = msg.payload || {};
    return setGardenPublic(payload.gardenId, msg.from, payload.isPublic);
  }

  // ── Exports ────────────────────────────────────────────────────────────────

  exports.MAX_COLLABORATORS = MAX_COLLABORATORS;
  exports.COLLABORATION_BONUS = COLLABORATION_BONUS;
  exports.ACTIVE_WINDOW_MS = ACTIVE_WINDOW_MS;
  exports.VALID_TEND_ACTIONS = VALID_TEND_ACTIONS;
  exports.GARDEN_ZONES = GARDEN_ZONES;

  exports.createGarden = createGarden;
  exports.addCollaborator = addCollaborator;
  exports.removeCollaborator = removeCollaborator;
  exports.getCollaborators = getCollaborators;
  exports.canTend = canTend;
  exports.tendGarden = tendGarden;
  exports.getGardenHealth = getGardenHealth;
  exports.getContributions = getContributions;
  exports.getHarvestShare = getHarvestShare;
  exports.getBonusFromCollaboration = getBonusFromCollaboration;
  exports.getGardenStats = getGardenStats;
  exports.listPublicGardens = listPublicGardens;
  exports.setGardenPublic = setGardenPublic;

  // Protocol message handlers
  exports.handleGardenCreate = handleGardenCreate;
  exports.handleGardenInvite = handleGardenInvite;
  exports.handleGardenUninvite = handleGardenUninvite;
  exports.handleGardenTend = handleGardenTend;
  exports.handleGardenSetPublic = handleGardenSetPublic;

  // Internal / testing helpers
  exports._resetStore = _resetStore;
  exports._loadGarden = _loadGarden;
  exports._getAllGardens = _getAllGardens;

})(typeof module !== 'undefined' ? module.exports : (window.Gardens = {}));
