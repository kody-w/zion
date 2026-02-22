/**
 * ZION Player Housing System
 * Claim land, build rooms, place furniture, invite visitors.
 * Layer 1 - No project dependencies
 */

(function(exports) {
  'use strict';

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  var PLOT_COST = 50;
  var ROOM_COST = 10;

  // Room type definitions
  var ROOM_TYPES = {
    bedroom:     { id: 'bedroom',     name: 'Bedroom',     maxFurniture: 8,  comfortBonus: { rest: 10 } },
    kitchen:     { id: 'kitchen',     name: 'Kitchen',     maxFurniture: 6,  comfortBonus: { food: 8 } },
    workshop:    { id: 'workshop',    name: 'Workshop',    maxFurniture: 10, comfortBonus: { craft: 15 } },
    garden:      { id: 'garden',      name: 'Garden',      maxFurniture: 12, comfortBonus: { nature: 10 } },
    gallery:     { id: 'gallery',     name: 'Gallery',     maxFurniture: 10, comfortBonus: { culture: 12 } },
    library:     { id: 'library',     name: 'Library',     maxFurniture: 10, comfortBonus: { knowledge: 15 } },
    music_room:  { id: 'music_room',  name: 'Music Room',  maxFurniture: 8,  comfortBonus: { creativity: 12 } },
    trophy_room: { id: 'trophy_room', name: 'Trophy Room', maxFurniture: 16, comfortBonus: { prestige: 20 } }
  };

  // Furniture catalog — 30+ items
  var FURNITURE_CATALOG = {
    // Seating
    wooden_chair:    { id: 'wooden_chair',    name: 'Wooden Chair',     category: 'seating',         cost: 2,  decorScore: 1 },
    cushioned_chair: { id: 'cushioned_chair', name: 'Cushioned Chair',  category: 'seating',         cost: 5,  decorScore: 3 },
    sofa:            { id: 'sofa',            name: 'Sofa',             category: 'seating',         cost: 12, decorScore: 6 },
    bench:           { id: 'bench',           name: 'Bench',            category: 'seating',         cost: 4,  decorScore: 2 },
    rocking_chair:   { id: 'rocking_chair',   name: 'Rocking Chair',    category: 'seating',         cost: 8,  decorScore: 5 },

    // Tables
    wooden_table:    { id: 'wooden_table',    name: 'Wooden Table',     category: 'tables',          cost: 6,  decorScore: 3 },
    dining_table:    { id: 'dining_table',    name: 'Dining Table',     category: 'tables',          cost: 15, decorScore: 7 },
    writing_desk:    { id: 'writing_desk',    name: 'Writing Desk',     category: 'tables',          cost: 10, decorScore: 5 },
    coffee_table:    { id: 'coffee_table',    name: 'Coffee Table',     category: 'tables',          cost: 8,  decorScore: 4 },

    // Storage
    wooden_chest:    { id: 'wooden_chest',    name: 'Wooden Chest',     category: 'storage',         cost: 8,  decorScore: 2 },
    bookshelf:       { id: 'bookshelf',       name: 'Bookshelf',        category: 'storage',         cost: 12, decorScore: 6 },
    wardrobe:        { id: 'wardrobe',        name: 'Wardrobe',         category: 'storage',         cost: 15, decorScore: 5 },
    cabinet:         { id: 'cabinet',         name: 'Cabinet',          category: 'storage',         cost: 10, decorScore: 4 },

    // Decoration
    painting:        { id: 'painting',        name: 'Painting',         category: 'decoration',      cost: 10, decorScore: 8 },
    tapestry:        { id: 'tapestry',        name: 'Tapestry',         category: 'decoration',      cost: 12, decorScore: 9 },
    trophy:          { id: 'trophy',          name: 'Trophy',           category: 'decoration',      cost: 5,  decorScore: 7 },
    plant_pot:       { id: 'plant_pot',       name: 'Plant Pot',        category: 'decoration',      cost: 3,  decorScore: 3 },
    statue:          { id: 'statue',          name: 'Statue',           category: 'decoration',      cost: 20, decorScore: 12 },
    rug:             { id: 'rug',             name: 'Rug',              category: 'decoration',      cost: 8,  decorScore: 5 },
    mirror:          { id: 'mirror',          name: 'Mirror',           category: 'decoration',      cost: 7,  decorScore: 4 },

    // Lighting
    candle:          { id: 'candle',          name: 'Candle',           category: 'lighting',        cost: 2,  decorScore: 2 },
    lantern:         { id: 'lantern',         name: 'Lantern',          category: 'lighting',        cost: 5,  decorScore: 4 },
    chandelier:      { id: 'chandelier',      name: 'Chandelier',       category: 'lighting',        cost: 25, decorScore: 14 },
    wall_sconce:     { id: 'wall_sconce',     name: 'Wall Sconce',      category: 'lighting',        cost: 6,  decorScore: 4 },

    // Crafting stations
    forge:           { id: 'forge',           name: 'Forge',            category: 'crafting_station', cost: 30, decorScore: 6 },
    alchemy_bench:   { id: 'alchemy_bench',   name: 'Alchemy Bench',    category: 'crafting_station', cost: 25, decorScore: 7 },
    loom:            { id: 'loom',            name: 'Loom',             category: 'crafting_station', cost: 20, decorScore: 5 },
    carpentry_bench: { id: 'carpentry_bench', name: 'Carpentry Bench',  category: 'crafting_station', cost: 18, decorScore: 5 },
    enchanting_table:{ id: 'enchanting_table',name: 'Enchanting Table', category: 'crafting_station', cost: 35, decorScore: 10 },

    // Music
    piano:           { id: 'piano',           name: 'Piano',            category: 'music',           cost: 40, decorScore: 15 },
    harp:            { id: 'harp',            name: 'Harp',             category: 'music',           cost: 30, decorScore: 13 },
    drum_kit:        { id: 'drum_kit',        name: 'Drum Kit',         category: 'music',           cost: 22, decorScore: 8 }
  };

  // House size tiers
  var HOUSE_SIZES = {
    cottage: { id: 'cottage', name: 'Cottage', maxRooms: 4,  upgradeCost: 30 },
    house:   { id: 'house',   name: 'House',   maxRooms: 6,  upgradeCost: 60 },
    manor:   { id: 'manor',   name: 'Manor',   maxRooms: 8,  upgradeCost: 100 },
    estate:  { id: 'estate',  name: 'Estate',  maxRooms: 12, upgradeCost: null }
  };

  var SIZE_UPGRADE_PATH = ['cottage', 'house', 'manor', 'estate'];

  // Visitor access levels
  var ACCESS_LEVELS = {
    public:  'public',
    friends: 'friends',
    private: 'private'
  };

  // ---------------------------------------------------------------------------
  // Module state
  // ---------------------------------------------------------------------------

  var plots = {};          // playerId -> plot object
  var currentVisitors = {};// plotId -> [ playerId, ... ]
  var nextFurnitureId = 1;
  var nextRoomId = 1;

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function _generateRoomId() {
    return 'room_' + (nextRoomId++);
  }

  function _generateFurnitureId() {
    return 'furn_' + (nextFurnitureId++);
  }

  function _getNextSize(currentSize) {
    var idx = SIZE_UPGRADE_PATH.indexOf(currentSize);
    if (idx === -1 || idx === SIZE_UPGRADE_PATH.length - 1) return null;
    return SIZE_UPGRADE_PATH[idx + 1];
  }

  // ---------------------------------------------------------------------------
  // Plot management
  // ---------------------------------------------------------------------------

  /**
   * Claim a plot for a player.
   * @param {string} playerId
   * @param {string} plotName - display name
   * @param {object} ledger - Economy ledger (must have spendSpark method)
   * @param {function} spendFn - spendSpark(ledger, playerId, amount) -> {success,error}
   * @returns {{ success: boolean, plot?: object, error?: string }}
   */
  function claimPlot(playerId, plotName, ledger, spendFn) {
    if (!playerId) return { success: false, error: 'Missing playerId' };
    if (plots[playerId]) return { success: false, error: 'Player already owns a plot' };

    if (ledger && spendFn) {
      var result = spendFn(ledger, playerId, PLOT_COST);
      if (!result.success) return { success: false, error: result.error || 'Insufficient funds' };
    }

    var plot = {
      id: 'plot_' + playerId,
      owner: playerId,
      name: plotName || (playerId + "'s Home"),
      size: 'cottage',
      rooms: [],
      accessLevel: 'private',
      friendList: [],
      createdAt: Date.now()
    };

    plots[playerId] = plot;
    currentVisitors[plot.id] = [];
    return { success: true, plot: plot };
  }

  /**
   * Get a player's plot.
   * @param {string} playerId
   * @returns {object|null}
   */
  function getPlot(playerId) {
    return plots[playerId] || null;
  }

  // ---------------------------------------------------------------------------
  // Room management
  // ---------------------------------------------------------------------------

  /**
   * Build a room in a player's house.
   * @param {string} playerId
   * @param {string} roomType - key from ROOM_TYPES
   * @param {string} roomName - display name
   * @param {object} ledger
   * @param {function} spendFn
   * @returns {{ success: boolean, room?: object, error?: string }}
   */
  function buildRoom(playerId, roomType, roomName, ledger, spendFn) {
    var plot = plots[playerId];
    if (!plot) return { success: false, error: 'No plot found' };
    if (!ROOM_TYPES[roomType]) return { success: false, error: 'Invalid room type' };

    var maxRooms = HOUSE_SIZES[plot.size].maxRooms;
    if (plot.rooms.length >= maxRooms) {
      return { success: false, error: 'House is full. Upgrade to add more rooms.' };
    }

    if (ledger && spendFn) {
      var result = spendFn(ledger, playerId, ROOM_COST);
      if (!result.success) return { success: false, error: result.error || 'Insufficient funds' };
    }

    var room = {
      id: _generateRoomId(),
      type: roomType,
      name: roomName || ROOM_TYPES[roomType].name,
      furniture: []
    };

    plot.rooms.push(room);
    return { success: true, room: room };
  }

  /**
   * Remove a room (and all its furniture) from a player's house.
   * @param {string} playerId
   * @param {string} roomId
   * @returns {{ success: boolean, error?: string }}
   */
  function removeRoom(playerId, roomId) {
    var plot = plots[playerId];
    if (!plot) return { success: false, error: 'No plot found' };

    var idx = -1;
    for (var i = 0; i < plot.rooms.length; i++) {
      if (plot.rooms[i].id === roomId) { idx = i; break; }
    }
    if (idx === -1) return { success: false, error: 'Room not found' };

    plot.rooms.splice(idx, 1);
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // Furniture management
  // ---------------------------------------------------------------------------

  /**
   * Place furniture in a room.
   * @param {string} playerId
   * @param {string} roomId
   * @param {string} furnitureTypeId - key from FURNITURE_CATALOG
   * @param {object} ledger
   * @param {function} spendFn
   * @returns {{ success: boolean, furniture?: object, error?: string }}
   */
  function placeFurniture(playerId, roomId, furnitureTypeId, ledger, spendFn) {
    var plot = plots[playerId];
    if (!plot) return { success: false, error: 'No plot found' };

    var catalogItem = FURNITURE_CATALOG[furnitureTypeId];
    if (!catalogItem) return { success: false, error: 'Invalid furniture type' };

    var room = null;
    for (var i = 0; i < plot.rooms.length; i++) {
      if (plot.rooms[i].id === roomId) { room = plot.rooms[i]; break; }
    }
    if (!room) return { success: false, error: 'Room not found' };

    var maxFurniture = ROOM_TYPES[room.type].maxFurniture;
    if (room.furniture.length >= maxFurniture) {
      return { success: false, error: 'Room is full' };
    }

    if (ledger && spendFn) {
      var result = spendFn(ledger, playerId, catalogItem.cost);
      if (!result.success) return { success: false, error: result.error || 'Insufficient funds' };
    }

    var item = {
      id: _generateFurnitureId(),
      typeId: furnitureTypeId,
      name: catalogItem.name,
      category: catalogItem.category,
      decorScore: catalogItem.decorScore,
      placedAt: Date.now()
    };

    room.furniture.push(item);
    return { success: true, furniture: item };
  }

  /**
   * Remove a piece of furniture from a room.
   * @param {string} playerId
   * @param {string} roomId
   * @param {string} furnitureId - instance id (furn_N)
   * @returns {{ success: boolean, error?: string }}
   */
  function removeFurniture(playerId, roomId, furnitureId) {
    var plot = plots[playerId];
    if (!plot) return { success: false, error: 'No plot found' };

    var room = null;
    for (var i = 0; i < plot.rooms.length; i++) {
      if (plot.rooms[i].id === roomId) { room = plot.rooms[i]; break; }
    }
    if (!room) return { success: false, error: 'Room not found' };

    var idx = -1;
    for (var j = 0; j < room.furniture.length; j++) {
      if (room.furniture[j].id === furnitureId) { idx = j; break; }
    }
    if (idx === -1) return { success: false, error: 'Furniture not found' };

    room.furniture.splice(idx, 1);
    return { success: true };
  }

  /**
   * Get all furniture in a specific room.
   * @param {string} playerId
   * @param {string} roomId
   * @returns {{ success: boolean, furniture?: Array, error?: string }}
   */
  function getFurnitureInRoom(playerId, roomId) {
    var plot = plots[playerId];
    if (!plot) return { success: false, error: 'No plot found', furniture: [] };

    for (var i = 0; i < plot.rooms.length; i++) {
      if (plot.rooms[i].id === roomId) {
        return { success: true, furniture: plot.rooms[i].furniture };
      }
    }
    return { success: false, error: 'Room not found', furniture: [] };
  }

  // ---------------------------------------------------------------------------
  // House layout / upgrade
  // ---------------------------------------------------------------------------

  /**
   * Get a full layout description of a player's house.
   * @param {string} playerId
   * @returns {{ success: boolean, layout?: object, error?: string }}
   */
  function getHouseLayout(playerId) {
    var plot = plots[playerId];
    if (!plot) return { success: false, error: 'No plot found' };

    var sizeInfo = HOUSE_SIZES[plot.size];
    var layout = {
      plotId: plot.id,
      owner: plot.owner,
      name: plot.name,
      size: plot.size,
      sizeName: sizeInfo.name,
      maxRooms: sizeInfo.maxRooms,
      rooms: plot.rooms.map(function(r) {
        return {
          id: r.id,
          type: r.type,
          name: r.name,
          furnitureCount: r.furniture.length,
          maxFurniture: ROOM_TYPES[r.type].maxFurniture
        };
      }),
      accessLevel: plot.accessLevel,
      roomCount: plot.rooms.length
    };
    return { success: true, layout: layout };
  }

  /**
   * Upgrade house to the next size tier.
   * @param {string} playerId
   * @param {object} ledger
   * @param {function} spendFn
   * @returns {{ success: boolean, newSize?: string, error?: string }}
   */
  function upgradeHouse(playerId, ledger, spendFn) {
    var plot = plots[playerId];
    if (!plot) return { success: false, error: 'No plot found' };

    var nextSize = _getNextSize(plot.size);
    if (!nextSize) return { success: false, error: 'House is already at maximum size' };

    var upgradeCost = HOUSE_SIZES[plot.size].upgradeCost;
    if (upgradeCost === null) return { success: false, error: 'House is already at maximum size' };

    if (ledger && spendFn) {
      var result = spendFn(ledger, playerId, upgradeCost);
      if (!result.success) return { success: false, error: result.error || 'Insufficient funds' };
    }

    plot.size = nextSize;
    return { success: true, newSize: nextSize };
  }

  // ---------------------------------------------------------------------------
  // Visitor access
  // ---------------------------------------------------------------------------

  /**
   * Set the visitor access level for a house.
   * @param {string} playerId
   * @param {string} level - 'public' | 'friends' | 'private'
   * @returns {{ success: boolean, error?: string }}
   */
  function setVisitorAccess(playerId, level) {
    if (!ACCESS_LEVELS[level]) return { success: false, error: 'Invalid access level. Use: public, friends, private' };
    var plot = plots[playerId];
    if (!plot) return { success: false, error: 'No plot found' };
    plot.accessLevel = level;
    return { success: true };
  }

  /**
   * Add a player to the friend/visitor permission list.
   * @param {string} ownerId
   * @param {string} friendId
   * @returns {{ success: boolean, error?: string }}
   */
  function addVisitorPermission(ownerId, friendId) {
    if (!friendId) return { success: false, error: 'Missing friendId' };
    var plot = plots[ownerId];
    if (!plot) return { success: false, error: 'No plot found' };
    if (plot.friendList.indexOf(friendId) !== -1) {
      return { success: false, error: 'Already on friend list' };
    }
    plot.friendList.push(friendId);
    return { success: true };
  }

  /**
   * Remove a player from the friend/visitor permission list.
   * @param {string} ownerId
   * @param {string} friendId
   * @returns {{ success: boolean, error?: string }}
   */
  function removeVisitorPermission(ownerId, friendId) {
    var plot = plots[ownerId];
    if (!plot) return { success: false, error: 'No plot found' };
    var idx = plot.friendList.indexOf(friendId);
    if (idx === -1) return { success: false, error: 'Not on friend list' };
    plot.friendList.splice(idx, 1);
    return { success: true };
  }

  /**
   * Get list of friends permitted to visit.
   * @param {string} playerId
   * @returns {{ success: boolean, friends?: Array, error?: string }}
   */
  function getVisitors(playerId) {
    var plot = plots[playerId];
    if (!plot) return { success: false, error: 'No plot found', friends: [] };
    return { success: true, friends: plot.friendList.slice() };
  }

  // ---------------------------------------------------------------------------
  // Visit mechanics
  // ---------------------------------------------------------------------------

  /**
   * Check whether a visitor can enter a house.
   * @param {string} ownerId
   * @param {string} visitorId
   * @returns {boolean}
   */
  function _canVisit(ownerId, visitorId) {
    var plot = plots[ownerId];
    if (!plot) return false;
    if (visitorId === ownerId) return true;
    if (plot.accessLevel === 'public') return true;
    if (plot.accessLevel === 'friends') return plot.friendList.indexOf(visitorId) !== -1;
    return false; // private
  }

  /**
   * A visitor enters a house.
   * @param {string} ownerId
   * @param {string} visitorId
   * @returns {{ success: boolean, error?: string }}
   */
  function visitHouse(ownerId, visitorId) {
    if (!visitorId) return { success: false, error: 'Missing visitorId' };
    var plot = plots[ownerId];
    if (!plot) return { success: false, error: 'No plot found' };
    if (!_canVisit(ownerId, visitorId)) {
      return { success: false, error: 'Access denied' };
    }

    var visitors = currentVisitors[plot.id];
    if (!visitors) { visitors = []; currentVisitors[plot.id] = visitors; }
    if (visitors.indexOf(visitorId) !== -1) {
      return { success: false, error: 'Already visiting' };
    }
    visitors.push(visitorId);
    return { success: true };
  }

  /**
   * A visitor leaves a house.
   * @param {string} ownerId
   * @param {string} visitorId
   * @returns {{ success: boolean, error?: string }}
   */
  function leaveHouse(ownerId, visitorId) {
    var plot = plots[ownerId];
    if (!plot) return { success: false, error: 'No plot found' };

    var visitors = currentVisitors[plot.id] || [];
    var idx = visitors.indexOf(visitorId);
    if (idx === -1) return { success: false, error: 'Visitor not present' };
    visitors.splice(idx, 1);
    return { success: true };
  }

  /**
   * Get current visitors present in a house.
   * @param {string} ownerId
   * @returns {Array}
   */
  function getCurrentVisitors(ownerId) {
    var plot = plots[ownerId];
    if (!plot) return [];
    return (currentVisitors[plot.id] || []).slice();
  }

  // ---------------------------------------------------------------------------
  // Scoring
  // ---------------------------------------------------------------------------

  /**
   * Calculate total decoration score for a house.
   * Higher scores mean better-decorated homes.
   * @param {string} playerId
   * @returns {number}
   */
  function getHouseScore(playerId) {
    var plot = plots[playerId];
    if (!plot) return 0;

    var total = 0;
    for (var i = 0; i < plot.rooms.length; i++) {
      var room = plot.rooms[i];
      for (var j = 0; j < room.furniture.length; j++) {
        total += room.furniture[j].decorScore || 0;
      }
    }

    // Size multiplier bonus
    var sizeBonus = { cottage: 1, house: 1.1, manor: 1.25, estate: 1.5 };
    total = Math.floor(total * (sizeBonus[plot.size] || 1));

    return total;
  }

  /**
   * Calculate comfort bonuses provided by the house.
   * Aggregates room-type bonuses for rooms that have at least one piece of furniture.
   * @param {string} playerId
   * @returns {object} bonus map e.g. { rest: 10, craft: 15 }
   */
  function getComfortBonus(playerId) {
    var plot = plots[playerId];
    if (!plot) return {};

    var bonuses = {};
    for (var i = 0; i < plot.rooms.length; i++) {
      var room = plot.rooms[i];
      // Room must have at least one piece of furniture to grant its bonus
      if (room.furniture.length === 0) continue;
      var roomBonus = ROOM_TYPES[room.type].comfortBonus;
      for (var key in roomBonus) {
        if (roomBonus.hasOwnProperty(key)) {
          bonuses[key] = (bonuses[key] || 0) + roomBonus[key];
        }
      }
    }
    return bonuses;
  }

  // ---------------------------------------------------------------------------
  // State persistence
  // ---------------------------------------------------------------------------

  /**
   * Serialize state for persistence.
   * @returns {object}
   */
  function getHousingState() {
    return {
      plots: plots,
      currentVisitors: currentVisitors,
      nextFurnitureId: nextFurnitureId,
      nextRoomId: nextRoomId
    };
  }

  /**
   * Load saved housing state.
   * @param {object} savedData
   */
  function initHousing(savedData) {
    if (!savedData) return;
    plots = savedData.plots || {};
    currentVisitors = savedData.currentVisitors || {};
    nextFurnitureId = savedData.nextFurnitureId || 1;
    nextRoomId = savedData.nextRoomId || 1;
  }

  /**
   * Reset all housing state (for testing).
   */
  function _reset() {
    plots = {};
    currentVisitors = {};
    nextFurnitureId = 1;
    nextRoomId = 1;
  }

  // ---------------------------------------------------------------------------
  // Exports
  // ---------------------------------------------------------------------------

  exports.ROOM_TYPES            = ROOM_TYPES;
  exports.FURNITURE_CATALOG     = FURNITURE_CATALOG;
  exports.HOUSE_SIZES           = HOUSE_SIZES;
  exports.ACCESS_LEVELS         = ACCESS_LEVELS;
  exports.PLOT_COST             = PLOT_COST;
  exports.ROOM_COST             = ROOM_COST;

  exports.claimPlot             = claimPlot;
  exports.getPlot               = getPlot;

  exports.buildRoom             = buildRoom;
  exports.removeRoom            = removeRoom;

  exports.placeFurniture        = placeFurniture;
  exports.removeFurniture       = removeFurniture;
  exports.getFurnitureInRoom    = getFurnitureInRoom;

  exports.getHouseLayout        = getHouseLayout;
  exports.upgradeHouse          = upgradeHouse;

  exports.setVisitorAccess      = setVisitorAccess;
  exports.addVisitorPermission  = addVisitorPermission;
  exports.removeVisitorPermission = removeVisitorPermission;
  exports.getVisitors           = getVisitors;
  exports.visitHouse            = visitHouse;
  exports.leaveHouse            = leaveHouse;
  exports.getCurrentVisitors    = getCurrentVisitors;

  exports.getHouseScore         = getHouseScore;
  exports.getComfortBonus       = getComfortBonus;

  exports.getHousingState       = getHousingState;
  exports.initHousing           = initHousing;
  exports._reset                = _reset;

})(typeof module !== 'undefined' ? module.exports : (window.Housing = {}));
