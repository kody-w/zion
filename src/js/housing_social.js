/**
 * ZION Housing Social System
 * Visitor system, guestbook, house ratings, and NPC visits.
 * Layer 1 - No project dependencies
 */

(function(exports) {
  'use strict';

  // ---------------------------------------------------------------------------
  // House Styles
  // ---------------------------------------------------------------------------

  var HOUSE_STYLES = {
    cottage: {
      id: 'cottage',
      name: 'Cottage',
      rooms: 3,
      maxFurniture: 15,
      desc: 'Cozy woodland dwelling',
      baseCost: 50
    },
    villa: {
      id: 'villa',
      name: 'Villa',
      rooms: 5,
      maxFurniture: 30,
      desc: 'Spacious riverside home',
      baseCost: 150
    },
    tower: {
      id: 'tower',
      name: 'Tower',
      rooms: 4,
      maxFurniture: 20,
      desc: 'Tall stone observatory',
      baseCost: 200
    },
    treehouse: {
      id: 'treehouse',
      name: 'Treehouse',
      rooms: 3,
      maxFurniture: 12,
      desc: 'Elevated forest retreat',
      baseCost: 100
    },
    workshop: {
      id: 'workshop',
      name: 'Workshop',
      rooms: 6,
      maxFurniture: 25,
      desc: 'Crafting-focused workspace',
      baseCost: 120
    },
    garden_home: {
      id: 'garden_home',
      name: 'Garden Home',
      rooms: 4,
      maxFurniture: 18,
      desc: 'Open-air garden house',
      baseCost: 80
    }
  };

  // ---------------------------------------------------------------------------
  // Room Types
  // ---------------------------------------------------------------------------

  var ROOM_TYPES = {
    bedroom: {
      id: 'bedroom',
      name: 'Bedroom',
      desc: 'Rest and recover energy faster',
      bonus: 'rest_speed_20'
    },
    kitchen: {
      id: 'kitchen',
      name: 'Kitchen',
      desc: 'Cook food with bonus yields',
      bonus: 'cooking_bonus_15'
    },
    workshop: {
      id: 'workshop',
      name: 'Workshop',
      desc: 'Craft items with bonus chance',
      bonus: 'craft_bonus_10'
    },
    gallery: {
      id: 'gallery',
      name: 'Gallery',
      desc: 'Display achievements and art',
      bonus: 'reputation_gain_10'
    },
    library: {
      id: 'library',
      name: 'Library',
      desc: 'Study and gain XP faster',
      bonus: 'xp_bonus_10'
    },
    garden: {
      id: 'garden',
      name: 'Garden',
      desc: 'Grow herbs and flowers',
      bonus: 'herb_production'
    },
    observatory: {
      id: 'observatory',
      name: 'Observatory',
      desc: 'Better stargazing results',
      bonus: 'stargazing_bonus_25'
    },
    trophy_room: {
      id: 'trophy_room',
      name: 'Trophy Room',
      desc: 'Display dungeon trophies',
      bonus: 'dungeon_loot_5'
    }
  };

  // ---------------------------------------------------------------------------
  // Furniture Catalog
  // ---------------------------------------------------------------------------

  var FURNITURE = {
    bed: {
      id: 'bed',
      name: 'Wooden Bed',
      room: 'bedroom',
      rarity: 'common',
      cost: 10,
      comfort: 5
    },
    fancy_bed: {
      id: 'fancy_bed',
      name: 'Fancy Bed',
      room: 'bedroom',
      rarity: 'uncommon',
      cost: 30,
      comfort: 15
    },
    desk: {
      id: 'desk',
      name: 'Writing Desk',
      room: 'library',
      rarity: 'common',
      cost: 12,
      comfort: 3
    },
    bookshelf: {
      id: 'bookshelf',
      name: 'Bookshelf',
      room: 'library',
      rarity: 'common',
      cost: 15,
      comfort: 4
    },
    stove: {
      id: 'stove',
      name: 'Stone Stove',
      room: 'kitchen',
      rarity: 'common',
      cost: 20,
      comfort: 6
    },
    workbench: {
      id: 'workbench',
      name: 'Workbench',
      room: 'workshop',
      rarity: 'common',
      cost: 18,
      comfort: 3
    },
    anvil: {
      id: 'anvil',
      name: 'Iron Anvil',
      room: 'workshop',
      rarity: 'uncommon',
      cost: 35,
      comfort: 2
    },
    painting: {
      id: 'painting',
      name: 'Painting',
      room: 'gallery',
      rarity: 'uncommon',
      cost: 25,
      comfort: 8
    },
    statue: {
      id: 'statue',
      name: 'Small Statue',
      room: 'gallery',
      rarity: 'rare',
      cost: 50,
      comfort: 12
    },
    telescope_f: {
      id: 'telescope_f',
      name: 'Telescope',
      room: 'observatory',
      rarity: 'rare',
      cost: 60,
      comfort: 10
    },
    planter: {
      id: 'planter',
      name: 'Planter Box',
      room: 'garden',
      rarity: 'common',
      cost: 8,
      comfort: 5
    },
    fountain: {
      id: 'fountain',
      name: 'Small Fountain',
      room: 'garden',
      rarity: 'uncommon',
      cost: 40,
      comfort: 15
    },
    rug: {
      id: 'rug',
      name: 'Woven Rug',
      room: null,
      rarity: 'common',
      cost: 12,
      comfort: 6
    },
    chandelier: {
      id: 'chandelier',
      name: 'Chandelier',
      room: null,
      rarity: 'rare',
      cost: 45,
      comfort: 10
    },
    fireplace: {
      id: 'fireplace',
      name: 'Fireplace',
      room: null,
      rarity: 'uncommon',
      cost: 30,
      comfort: 12
    },
    armor_stand: {
      id: 'armor_stand',
      name: 'Armor Stand',
      room: 'trophy_room',
      rarity: 'uncommon',
      cost: 25,
      comfort: 4
    },
    trophy_shelf: {
      id: 'trophy_shelf',
      name: 'Trophy Shelf',
      room: 'trophy_room',
      rarity: 'common',
      cost: 15,
      comfort: 3
    },
    herb_rack: {
      id: 'herb_rack',
      name: 'Herb Rack',
      room: 'kitchen',
      rarity: 'common',
      cost: 10,
      comfort: 3
    },
    window_seat: {
      id: 'window_seat',
      name: 'Window Seat',
      room: null,
      rarity: 'uncommon',
      cost: 20,
      comfort: 8
    },
    potted_plant: {
      id: 'potted_plant',
      name: 'Potted Plant',
      room: null,
      rarity: 'common',
      cost: 5,
      comfort: 4
    },
    banner: {
      id: 'banner',
      name: 'Guild Banner',
      room: null,
      rarity: 'uncommon',
      cost: 20,
      comfort: 5
    },
    music_box: {
      id: 'music_box',
      name: 'Music Box',
      room: 'bedroom',
      rarity: 'rare',
      cost: 40,
      comfort: 10
    },
    mirror: {
      id: 'mirror',
      name: 'Ornate Mirror',
      room: null,
      rarity: 'uncommon',
      cost: 22,
      comfort: 6
    },
    clock: {
      id: 'clock',
      name: 'Wall Clock',
      room: null,
      rarity: 'uncommon',
      cost: 28,
      comfort: 5
    },
    map_wall: {
      id: 'map_wall',
      name: 'World Map',
      room: 'library',
      rarity: 'uncommon',
      cost: 30,
      comfort: 7
    }
  };

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  var MAX_GUESTBOOK_ENTRIES = 100;
  var MAX_GUESTBOOK_MSG_LENGTH = 200;
  var MAX_RECENT_VISITORS = 50;
  var COMFORT_BONUS_THRESHOLD = 50;

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Sanitize HTML from a string — strips tags and encodes entities.
   * @param {string} str
   * @returns {string}
   */
  function _sanitizeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  /**
   * Deep-clone a plain object/array (JSON-safe data only).
   * @param {*} obj
   * @returns {*}
   */
  function _clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Truncate a string to maxLen characters.
   * @param {string} str
   * @param {number} maxLen
   * @returns {string}
   */
  function _truncate(str, maxLen) {
    if (typeof str !== 'string') return '';
    return str.length > maxLen ? str.slice(0, maxLen) : str;
  }

  // ---------------------------------------------------------------------------
  // Core State Factory
  // ---------------------------------------------------------------------------

  /**
   * Create a fresh house state object.
   * @param {string} ownerId
   * @param {string} style  - key of HOUSE_STYLES
   * @param {string} zone   - zone name
   * @returns {object}
   */
  function createHouseState(ownerId, style, zone) {
    if (!ownerId) throw new Error('ownerId is required');
    if (!style || !HOUSE_STYLES[style]) throw new Error('Invalid house style: ' + style);

    return {
      ownerId: ownerId,
      style: style,
      zone: zone || 'nexus',
      rooms: [],
      furniture: [],
      guestbook: [],
      visitors: [],
      rating: { total: 0, count: 0, ratings: {} },
      permissions: {
        public: false,
        friendsOnly: true,
        allowList: []
      },
      comfortScore: 0,
      lastVisited: 0
    };
  }

  // ---------------------------------------------------------------------------
  // Room Management
  // ---------------------------------------------------------------------------

  /**
   * Add a room to the house, respecting the style's room limit.
   * @param {object} state
   * @param {string} roomType  - key of ROOM_TYPES
   * @returns {{ state: object, room?: object, error?: string }}
   */
  function addRoom(state, roomType) {
    if (!state) return { error: 'No house state provided' };
    if (!roomType || !ROOM_TYPES[roomType]) {
      return { state: state, error: 'Invalid room type: ' + roomType };
    }

    var styleData = HOUSE_STYLES[state.style];
    if (!styleData) return { state: state, error: 'Invalid house style' };

    if (state.rooms.length >= styleData.rooms) {
      return {
        state: state,
        error: 'Room limit reached for ' + styleData.name + ' (' + styleData.rooms + ' max)'
      };
    }

    var room = {
      id: 'room_' + state.rooms.length,
      type: roomType,
      name: ROOM_TYPES[roomType].name,
      bonus: ROOM_TYPES[roomType].bonus,
      furniture: []
    };

    var newState = _clone(state);
    newState.rooms.push(room);
    return { state: newState, room: room };
  }

  // ---------------------------------------------------------------------------
  // Furniture Management
  // ---------------------------------------------------------------------------

  /**
   * Place a furniture item in the house (optionally in a specific room).
   * @param {object} state
   * @param {string} furnitureId  - key of FURNITURE
   * @param {number|null} roomIndex - index into state.rooms, or null for general placement
   * @returns {{ state: object, placement?: object, error?: string }}
   */
  function placeFurniture(state, furnitureId, roomIndex) {
    if (!state) return { error: 'No house state provided' };

    var item = FURNITURE[furnitureId];
    if (!item) return { state: state, error: 'Unknown furniture: ' + furnitureId };

    var styleData = HOUSE_STYLES[state.style];
    if (!styleData) return { state: state, error: 'Invalid house style' };

    if (state.furniture.length >= styleData.maxFurniture) {
      return {
        state: state,
        error: 'Furniture limit reached (' + styleData.maxFurniture + ' max for ' + styleData.name + ')'
      };
    }

    // Validate roomIndex if provided
    if (roomIndex !== null && roomIndex !== undefined) {
      if (typeof roomIndex !== 'number' || roomIndex < 0 || roomIndex >= state.rooms.length) {
        return { state: state, error: 'Invalid room index: ' + roomIndex };
      }
    }

    var placement = {
      furnitureId: furnitureId,
      name: item.name,
      comfort: item.comfort,
      rarity: item.rarity,
      roomIndex: (roomIndex !== null && roomIndex !== undefined) ? roomIndex : null,
      placedAt: Date.now()
    };

    var newState = _clone(state);
    newState.furniture.push(placement);
    newState.comfortScore = calculateComfort(newState);
    return { state: newState, placement: placement };
  }

  /**
   * Remove a furniture item by its index in state.furniture.
   * @param {object} state
   * @param {number} furnitureIndex
   * @returns {{ state: object, removed?: object, error?: string }}
   */
  function removeFurniture(state, furnitureIndex) {
    if (!state) return { error: 'No house state provided' };
    if (typeof furnitureIndex !== 'number' || furnitureIndex < 0 || furnitureIndex >= state.furniture.length) {
      return { state: state, error: 'Invalid furniture index: ' + furnitureIndex };
    }

    var newState = _clone(state);
    var removed = newState.furniture.splice(furnitureIndex, 1)[0];
    newState.comfortScore = calculateComfort(newState);
    return { state: newState, removed: removed };
  }

  // ---------------------------------------------------------------------------
  // Comfort
  // ---------------------------------------------------------------------------

  /**
   * Calculate total comfort score from all placed furniture.
   * @param {object} state
   * @returns {number}
   */
  function calculateComfort(state) {
    if (!state || !state.furniture) return 0;
    var total = 0;
    for (var i = 0; i < state.furniture.length; i++) {
      var placement = state.furniture[i];
      var comfort = placement.comfort;
      if (typeof comfort !== 'number') {
        var item = FURNITURE[placement.furnitureId];
        comfort = item ? item.comfort : 0;
      }
      total += comfort;
    }
    return total;
  }

  // ---------------------------------------------------------------------------
  // Visitor System
  // ---------------------------------------------------------------------------

  /**
   * Record a visit to a house.
   * @param {object} state
   * @param {string} visitorId
   * @param {number} timestamp
   * @returns {{ state: object, message: string, comfortBonus: number }}
   */
  function visitHouse(state, visitorId, timestamp) {
    if (!state) return { error: 'No house state provided' };
    if (!visitorId) return { state: state, error: 'visitorId is required' };

    var ts = timestamp || Date.now();
    var newState = _clone(state);

    var isOwner = visitorId === state.ownerId;

    // Record visit in the visitors log
    newState.visitors.push({
      visitorId: visitorId,
      timestamp: ts,
      isOwner: isOwner
    });

    // Keep visitors list bounded
    if (newState.visitors.length > MAX_RECENT_VISITORS) {
      newState.visitors = newState.visitors.slice(newState.visitors.length - MAX_RECENT_VISITORS);
    }

    newState.lastVisited = ts;

    var comfortBonus = 0;
    if (newState.comfortScore >= COMFORT_BONUS_THRESHOLD) {
      comfortBonus = Math.floor(newState.comfortScore / 10);
    }

    var styleData = HOUSE_STYLES[state.style] || {};
    var message = isOwner
      ? 'Welcome home, ' + visitorId + '! Your ' + (styleData.name || state.style) + ' awaits.'
      : 'Welcome to ' + state.ownerId + '\'s ' + (styleData.name || state.style) + '!';

    if (comfortBonus > 0) {
      message += ' (+' + comfortBonus + ' comfort bonus)';
    }

    return { state: newState, message: message, comfortBonus: comfortBonus };
  }

  // ---------------------------------------------------------------------------
  // Guestbook
  // ---------------------------------------------------------------------------

  /**
   * Leave a guestbook entry.
   * @param {object} state
   * @param {string} visitorId
   * @param {string} message
   * @param {number} timestamp
   * @returns {{ state: object, entry?: object, error?: string }}
   */
  function leaveGuestbookEntry(state, visitorId, message, timestamp) {
    if (!state) return { error: 'No house state provided' };
    if (!visitorId) return { state: state, error: 'visitorId is required' };
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return { state: state, error: 'Message cannot be empty' };
    }

    var sanitized = _sanitizeHtml(_truncate(message.trim(), MAX_GUESTBOOK_MSG_LENGTH));

    var entry = {
      visitorId: visitorId,
      message: sanitized,
      timestamp: timestamp || Date.now()
    };

    var newState = _clone(state);

    // Enforce max entries — keep most recent
    if (newState.guestbook.length >= MAX_GUESTBOOK_ENTRIES) {
      newState.guestbook = newState.guestbook.slice(1);
    }

    newState.guestbook.push(entry);
    return { state: newState, entry: entry };
  }

  // ---------------------------------------------------------------------------
  // Rating System
  // ---------------------------------------------------------------------------

  /**
   * Rate a house (1-5). Each visitor may only rate once.
   * @param {object} state
   * @param {string} visitorId
   * @param {number} rating  - integer 1 through 5
   * @returns {{ state: object, averageRating?: number, error?: string }}
   */
  function rateHouse(state, visitorId, rating) {
    if (!state) return { error: 'No house state provided' };
    if (!visitorId) return { state: state, error: 'visitorId is required' };

    var r = Number(rating);
    if (!Number.isFinite(r) || r < 1 || r > 5 || r !== Math.floor(r)) {
      return { state: state, error: 'Rating must be an integer between 1 and 5' };
    }

    if (state.rating.ratings && state.rating.ratings[visitorId] !== undefined) {
      return { state: state, error: 'Visitor ' + visitorId + ' has already rated this house' };
    }

    var newState = _clone(state);
    if (!newState.rating.ratings) newState.rating.ratings = {};

    newState.rating.ratings[visitorId] = r;
    newState.rating.total += r;
    newState.rating.count += 1;

    var avg = getAverageRating(newState);
    return { state: newState, averageRating: avg };
  }

  /**
   * Compute the average rating.
   * @param {object} state
   * @returns {number}  0 if no ratings yet
   */
  function getAverageRating(state) {
    if (!state || !state.rating || state.rating.count === 0) return 0;
    return Math.round((state.rating.total / state.rating.count) * 10) / 10;
  }

  // ---------------------------------------------------------------------------
  // Query helpers
  // ---------------------------------------------------------------------------

  /**
   * Return recent guestbook entries (newest first).
   * @param {object} state
   * @param {number} limit
   * @returns {Array}
   */
  function getGuestbook(state, limit) {
    if (!state || !state.guestbook) return [];
    var entries = state.guestbook.slice().reverse();
    var n = (typeof limit === 'number' && limit > 0) ? limit : entries.length;
    return entries.slice(0, n);
  }

  /**
   * Total count of unique visitors (not counting the owner).
   * @param {object} state
   * @returns {number}
   */
  function getVisitorCount(state) {
    if (!state || !state.visitors) return 0;
    var seen = {};
    for (var i = 0; i < state.visitors.length; i++) {
      var v = state.visitors[i];
      if (v.visitorId !== state.ownerId) {
        seen[v.visitorId] = true;
      }
    }
    return Object.keys(seen).length;
  }

  /**
   * Return recent visitor objects (newest first).
   * @param {object} state
   * @param {number} limit
   * @returns {Array}
   */
  function getRecentVisitors(state, limit) {
    if (!state || !state.visitors) return [];
    var all = state.visitors.slice().reverse();
    var n = (typeof limit === 'number' && limit > 0) ? limit : all.length;
    return all.slice(0, n);
  }

  // ---------------------------------------------------------------------------
  // Permissions
  // ---------------------------------------------------------------------------

  /**
   * Update the access-control settings for a house.
   * @param {object} state
   * @param {object} permissions  - partial or full permissions object
   * @returns {{ state: object }}
   */
  function setPermissions(state, permissions) {
    if (!state) return { error: 'No house state provided' };
    var newState = _clone(state);
    var p = permissions || {};

    if (typeof p.public === 'boolean') newState.permissions.public = p.public;
    if (typeof p.friendsOnly === 'boolean') newState.permissions.friendsOnly = p.friendsOnly;
    if (Array.isArray(p.allowList)) newState.permissions.allowList = p.allowList.slice();

    return { state: newState };
  }

  /**
   * Determine whether a player is allowed to visit.
   * Owners can always visit their own house.
   * @param {object} state
   * @param {string} visitorId
   * @returns {boolean}
   */
  function canVisit(state, visitorId) {
    if (!state || !visitorId) return false;

    // Owner can always visit
    if (visitorId === state.ownerId) return true;

    var perms = state.permissions;
    if (!perms) return false;

    // Public overrides everything
    if (perms.public) return true;

    // Check allow-list
    if (Array.isArray(perms.allowList) && perms.allowList.indexOf(visitorId) !== -1) {
      return true;
    }

    // friendsOnly = true means only allow-listed players and owner
    if (perms.friendsOnly) return false;

    return false;
  }

  // ---------------------------------------------------------------------------
  // Bonuses
  // ---------------------------------------------------------------------------

  /**
   * Return all active room bonuses for this house.
   * @param {object} state
   * @returns {Array<string>}
   */
  function getHouseBonus(state) {
    if (!state || !state.rooms) return [];
    var bonuses = [];
    for (var i = 0; i < state.rooms.length; i++) {
      var room = state.rooms[i];
      var roomDef = ROOM_TYPES[room.type];
      if (roomDef && roomDef.bonus) {
        bonuses.push(roomDef.bonus);
      }
    }
    return bonuses;
  }

  // ---------------------------------------------------------------------------
  // Top-rated Houses
  // ---------------------------------------------------------------------------

  /**
   * Sort an array of house states by average rating (descending).
   * @param {Array<object>} houses
   * @param {number} limit
   * @returns {Array<object>}
   */
  function getTopRatedHouses(houses, limit) {
    if (!Array.isArray(houses)) return [];
    var sorted = houses.slice().sort(function(a, b) {
      return getAverageRating(b) - getAverageRating(a);
    });
    var n = (typeof limit === 'number' && limit > 0) ? limit : sorted.length;
    return sorted.slice(0, n);
  }

  // ---------------------------------------------------------------------------
  // Catalog
  // ---------------------------------------------------------------------------

  /**
   * Return the full furniture catalog.
   * @returns {object}
   */
  function getFurnitureCatalog() {
    return FURNITURE;
  }

  // ---------------------------------------------------------------------------
  // Formatting
  // ---------------------------------------------------------------------------

  /**
   * Generate an HTML card summarising the house.
   * @param {object} state
   * @returns {string}
   */
  function formatHouseCard(state) {
    if (!state) return '<div class="house-card">No house data</div>';

    var styleData = HOUSE_STYLES[state.style] || { name: state.style, desc: '' };
    var avgRating = getAverageRating(state);
    var visitorCount = getVisitorCount(state);
    var comfort = state.comfortScore || calculateComfort(state);
    var roomCount = state.rooms ? state.rooms.length : 0;
    var furnitureCount = state.furniture ? state.furniture.length : 0;

    var stars = '';
    for (var s = 1; s <= 5; s++) {
      stars += s <= Math.round(avgRating) ? '&#9733;' : '&#9734;';
    }

    var roomBonuses = getHouseBonus(state);
    var bonusHtml = '';
    if (roomBonuses.length > 0) {
      bonusHtml = '<ul class="house-bonuses">';
      for (var bi = 0; bi < roomBonuses.length; bi++) {
        bonusHtml += '<li>' + _sanitizeHtml(roomBonuses[bi]) + '</li>';
      }
      bonusHtml += '</ul>';
    }

    var permLabel = state.permissions.public
      ? 'Public'
      : state.permissions.friendsOnly
        ? 'Friends Only'
        : 'Private';

    return [
      '<div class="house-card">',
      '  <div class="house-card-header">',
      '    <span class="house-style">' + _sanitizeHtml(styleData.name) + '</span>',
      '    <span class="house-owner">Owner: ' + _sanitizeHtml(state.ownerId) + '</span>',
      '  </div>',
      '  <div class="house-card-desc">' + _sanitizeHtml(styleData.desc) + '</div>',
      '  <div class="house-card-stats">',
      '    <span class="house-rating" title="' + avgRating + ' / 5">' + stars + ' (' + avgRating + ')</span>',
      '    <span class="house-visitors">Visitors: ' + visitorCount + '</span>',
      '    <span class="house-comfort">Comfort: ' + comfort + '</span>',
      '    <span class="house-rooms">Rooms: ' + roomCount + '</span>',
      '    <span class="house-furniture">Furniture: ' + furnitureCount + '</span>',
      '    <span class="house-access">' + permLabel + '</span>',
      '  </div>',
      bonusHtml,
      '</div>'
    ].join('\n');
  }

  /**
   * Generate an HTML snippet for a single guestbook entry.
   * @param {object} entry
   * @returns {string}
   */
  function formatGuestbookEntry(entry) {
    if (!entry) return '<div class="guestbook-entry">No entry</div>';

    var d = entry.timestamp ? new Date(entry.timestamp).toISOString().slice(0, 10) : '';
    return [
      '<div class="guestbook-entry">',
      '  <span class="guestbook-author">' + _sanitizeHtml(entry.visitorId || 'unknown') + '</span>',
      '  <span class="guestbook-date">' + d + '</span>',
      '  <p class="guestbook-message">' + (entry.message || '') + '</p>',
      '</div>'
    ].join('\n');
  }

  /**
   * Generate an ASCII layout of the rooms in a house.
   * @param {object} state
   * @returns {string}
   */
  function formatRoomLayout(state) {
    if (!state || !state.rooms || state.rooms.length === 0) {
      return '+--------+\n|  empty |\n+--------+';
    }

    var styleData = HOUSE_STYLES[state.style] || { name: state.style, rooms: 0 };
    var lines = [];
    lines.push('[ ' + styleData.name + ' — ' + state.rooms.length + '/' + styleData.rooms + ' rooms ]');
    lines.push('');

    var cols = Math.min(3, state.rooms.length);
    var rows = Math.ceil(state.rooms.length / cols);

    for (var row = 0; row < rows; row++) {
      // Top border row
      var topLine = '';
      for (var col = 0; col < cols; col++) {
        var idx = row * cols + col;
        if (idx < state.rooms.length) {
          topLine += '+----------+  ';
        }
      }
      lines.push(topLine.trimRight());

      // Room name row
      var nameLine = '';
      for (var col2 = 0; col2 < cols; col2++) {
        var idx2 = row * cols + col2;
        if (idx2 < state.rooms.length) {
          var rName = state.rooms[idx2].name || state.rooms[idx2].type;
          var padded = rName.slice(0, 8);
          while (padded.length < 8) padded = ' ' + padded;
          nameLine += '|' + padded + '|  ';
        }
      }
      lines.push(nameLine.trimRight());

      // Bonus row
      var bonusLine = '';
      for (var col3 = 0; col3 < cols; col3++) {
        var idx3 = row * cols + col3;
        if (idx3 < state.rooms.length) {
          var bonus = state.rooms[idx3].bonus || '';
          var bShort = bonus.slice(0, 8);
          while (bShort.length < 8) bShort = ' ' + bShort;
          bonusLine += '|' + bShort + '|  ';
        }
      }
      lines.push(bonusLine.trimRight());

      // Bottom border row
      var botLine = '';
      for (var col4 = 0; col4 < cols; col4++) {
        var idx4 = row * cols + col4;
        if (idx4 < state.rooms.length) {
          botLine += '+----------+  ';
        }
      }
      lines.push(botLine.trimRight());
      lines.push('');
    }

    return lines.join('\n');
  }

  // ---------------------------------------------------------------------------
  // Exports
  // ---------------------------------------------------------------------------

  exports.HOUSE_STYLES       = HOUSE_STYLES;
  exports.ROOM_TYPES         = ROOM_TYPES;
  exports.FURNITURE          = FURNITURE;

  exports.createHouseState   = createHouseState;
  exports.addRoom            = addRoom;
  exports.placeFurniture     = placeFurniture;
  exports.removeFurniture    = removeFurniture;
  exports.calculateComfort   = calculateComfort;
  exports.visitHouse         = visitHouse;
  exports.leaveGuestbookEntry= leaveGuestbookEntry;
  exports.rateHouse          = rateHouse;
  exports.getAverageRating   = getAverageRating;
  exports.getGuestbook       = getGuestbook;
  exports.getVisitorCount    = getVisitorCount;
  exports.getRecentVisitors  = getRecentVisitors;
  exports.setPermissions     = setPermissions;
  exports.canVisit           = canVisit;
  exports.getHouseBonus      = getHouseBonus;
  exports.getTopRatedHouses  = getTopRatedHouses;
  exports.getFurnitureCatalog= getFurnitureCatalog;
  exports.formatHouseCard    = formatHouseCard;
  exports.formatGuestbookEntry = formatGuestbookEntry;
  exports.formatRoomLayout   = formatRoomLayout;

})(typeof module !== 'undefined' ? module.exports : (window.HousingSocial = {}));
