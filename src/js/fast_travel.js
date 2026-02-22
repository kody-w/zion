// fast_travel.js — Fast Travel system for ZION
// Allows players to quickly teleport to zones, POIs, bookmarks, and recent locations
(function(exports) {
  'use strict';

  // Zone waypoints: canonical centers matching zone definitions in zones.js
  // nexus(0,0), gardens(200,30), athenaeum(100,-220), studio(-200,-100),
  // wilds(-30,260), agora(-190,120), commons(170,190), arena(0,-240)
  var ZONE_WAYPOINTS = [
    {
      id: 'zone_nexus',
      name: 'The Nexus',
      zone: 'nexus',
      x: 0,
      z: 0,
      category: 'zone',
      description: 'The central hub connecting all realms.',
      safe: true,
      icon: 'hub'
    },
    {
      id: 'zone_gardens',
      name: 'The Gardens',
      zone: 'gardens',
      x: 200,
      z: 30,
      category: 'zone',
      description: 'Lush botanical gardens filled with herbs and flowers.',
      safe: true,
      icon: 'nature'
    },
    {
      id: 'zone_athenaeum',
      name: 'The Athenaeum',
      zone: 'athenaeum',
      x: 100,
      z: -220,
      category: 'zone',
      description: 'A grand library and hall of learning.',
      safe: true,
      icon: 'school'
    },
    {
      id: 'zone_studio',
      name: 'The Studio',
      zone: 'studio',
      x: -200,
      z: -100,
      category: 'zone',
      description: 'A creative workshop for artists and craftspeople.',
      safe: true,
      icon: 'palette'
    },
    {
      id: 'zone_wilds',
      name: 'The Wilds',
      zone: 'wilds',
      x: -30,
      z: 260,
      category: 'zone',
      description: 'Untamed wilderness filled with rare resources.',
      safe: false,
      icon: 'forest'
    },
    {
      id: 'zone_agora',
      name: 'The Agora',
      zone: 'agora',
      x: -190,
      z: 120,
      category: 'zone',
      description: 'A bustling marketplace for trading.',
      safe: true,
      icon: 'store'
    },
    {
      id: 'zone_commons',
      name: 'The Commons',
      zone: 'commons',
      x: 170,
      z: 190,
      category: 'zone',
      description: 'A collaborative building space.',
      safe: true,
      icon: 'build'
    },
    {
      id: 'zone_arena',
      name: 'The Arena',
      zone: 'arena',
      x: 0,
      z: -240,
      category: 'zone',
      description: 'A proving ground for competitive challenges.',
      safe: false,
      icon: 'sports'
    }
  ];

  // Static POIs — portals, anchors, notable gardens in the world
  var STATIC_POIS = [
    // Nexus portals
    {
      id: 'poi_nexus_portal_gardens',
      name: 'Nexus Portal to Gardens',
      zone: 'nexus',
      x: 60,
      z: 20,
      category: 'portal',
      description: 'A shimmering gateway leading to The Gardens.',
      safe: true,
      icon: 'portal'
    },
    {
      id: 'poi_nexus_portal_athenaeum',
      name: 'Nexus Portal to Athenaeum',
      zone: 'nexus',
      x: -60,
      z: -30,
      category: 'portal',
      description: 'An archway of light leading to The Athenaeum.',
      safe: true,
      icon: 'portal'
    },
    {
      id: 'poi_nexus_portal_studio',
      name: 'Nexus Portal to Studio',
      zone: 'nexus',
      x: -50,
      z: 40,
      category: 'portal',
      description: 'A glowing doorway to The Studio.',
      safe: true,
      icon: 'portal'
    },
    // Garden anchors
    {
      id: 'poi_gardens_anchor_north',
      name: 'Northern Garden Anchor',
      zone: 'gardens',
      x: 220,
      z: -80,
      category: 'anchor',
      description: 'A crystalline anchor marking the northern gardens.',
      safe: true,
      icon: 'anchor'
    },
    {
      id: 'poi_gardens_anchor_east',
      name: 'Eastern Garden Anchor',
      zone: 'gardens',
      x: 350,
      z: 50,
      category: 'anchor',
      description: 'An anchor at the edge of the cultivated lands.',
      safe: true,
      icon: 'anchor'
    },
    // Notable gardens
    {
      id: 'poi_gardens_herb_garden',
      name: 'The Great Herb Garden',
      zone: 'gardens',
      x: 200,
      z: 80,
      category: 'garden',
      description: 'A famous plot of rare herbs tended by generations of gardeners.',
      safe: true,
      icon: 'grass'
    },
    {
      id: 'poi_gardens_bloom_circle',
      name: 'The Bloom Circle',
      zone: 'gardens',
      x: 170,
      z: -10,
      category: 'garden',
      description: 'A ring of perpetually blooming flowers.',
      safe: true,
      icon: 'local_florist'
    },
    // Wilds anchors
    {
      id: 'poi_wilds_anchor_peak',
      name: 'Peak Anchor',
      zone: 'wilds',
      x: -30,
      z: 320,
      category: 'anchor',
      description: 'An anchor at the summit marking a high vantage point.',
      safe: false,
      icon: 'anchor'
    },
    // Agora notable spots
    {
      id: 'poi_agora_grand_market',
      name: 'The Grand Market',
      zone: 'agora',
      x: -190,
      z: 150,
      category: 'portal',
      description: 'The main market entrance with the best merchants.',
      safe: true,
      icon: 'shopping_cart'
    }
  ];

  // Travel cost constants
  var FREE_TRAVEL_RADIUS = 150;   // units — travel within this distance is free
  var COST_PER_100_UNITS = 1;     // Spark per 100 units beyond free radius
  var MAX_BOOKMARKS = 10;
  var MAX_RECENT_LOCATIONS = 5;

  // Per-player state storage (in-memory for module; state.js manages persistence)
  var playerBookmarks = {};     // playerId -> Array of bookmark objects
  var playerRecent = {};        // playerId -> Array of recent location objects
  var panelState = {
    visible: false,
    activeCategory: 'zone',
    searchQuery: ''
  };

  // ─── Distance helpers ───────────────────────────────────────────────────────

  /**
   * Calculate 2D Euclidean distance between two (x,z) positions.
   * @param {number} x1
   * @param {number} z1
   * @param {number} x2
   * @param {number} z2
   * @returns {number}
   */
  function distance(x1, z1, x2, z2) {
    var dx = x2 - x1;
    var dz = z2 - z1;
    return Math.sqrt(dx * dx + dz * dz);
  }

  // ─── Zone Waypoints ─────────────────────────────────────────────────────────

  /**
   * Get all zone waypoints.
   * @returns {Array} Array of zone waypoint destination objects.
   */
  function getZoneWaypoints() {
    return ZONE_WAYPOINTS.slice();
  }

  // ─── Bookmarks ──────────────────────────────────────────────────────────────

  /**
   * Get bookmarks for a player.
   * @param {string} playerId
   * @returns {Array}
   */
  function getBookmarks(playerId) {
    if (!playerBookmarks[playerId]) {
      playerBookmarks[playerId] = [];
    }
    return playerBookmarks[playerId].slice();
  }

  /**
   * Add a bookmark for a player. Max 10 bookmarks allowed.
   * @param {string} playerId
   * @param {Object} dest - Destination object {id, name, x, z, zone, category, ...}
   * @returns {Object} {success: boolean, error?: string}
   */
  function addBookmark(playerId, dest) {
    if (!playerId || typeof playerId !== 'string') {
      return { success: false, error: 'Invalid playerId' };
    }
    if (!dest || typeof dest !== 'object') {
      return { success: false, error: 'Invalid destination' };
    }
    if (!dest.id || !dest.name || typeof dest.x !== 'number' || typeof dest.z !== 'number') {
      return { success: false, error: 'Destination missing required fields (id, name, x, z)' };
    }

    if (!playerBookmarks[playerId]) {
      playerBookmarks[playerId] = [];
    }

    var bookmarks = playerBookmarks[playerId];

    // Check for duplicate
    for (var i = 0; i < bookmarks.length; i++) {
      if (bookmarks[i].id === dest.id) {
        return { success: false, error: 'Destination already bookmarked' };
      }
    }

    // Enforce max
    if (bookmarks.length >= MAX_BOOKMARKS) {
      return { success: false, error: 'Bookmark limit reached (max ' + MAX_BOOKMARKS + ')' };
    }

    var bookmark = {
      id: dest.id,
      name: dest.name,
      zone: dest.zone || 'nexus',
      x: dest.x,
      z: dest.z,
      category: 'bookmark',
      description: dest.description || '',
      safe: dest.safe !== undefined ? dest.safe : true,
      icon: 'bookmark',
      addedAt: Date.now()
    };

    bookmarks.push(bookmark);
    return { success: true, bookmark: bookmark };
  }

  /**
   * Remove a bookmark for a player by destination id.
   * @param {string} playerId
   * @param {string} destId
   * @returns {Object} {success: boolean, error?: string}
   */
  function removeBookmark(playerId, destId) {
    if (!playerId || typeof playerId !== 'string') {
      return { success: false, error: 'Invalid playerId' };
    }
    if (!destId || typeof destId !== 'string') {
      return { success: false, error: 'Invalid destId' };
    }

    if (!playerBookmarks[playerId]) {
      return { success: false, error: 'Bookmark not found' };
    }

    var bookmarks = playerBookmarks[playerId];
    var idx = -1;
    for (var i = 0; i < bookmarks.length; i++) {
      if (bookmarks[i].id === destId) {
        idx = i;
        break;
      }
    }

    if (idx === -1) {
      return { success: false, error: 'Bookmark not found' };
    }

    bookmarks.splice(idx, 1);
    return { success: true };
  }

  // ─── Recent Locations ────────────────────────────────────────────────────────

  /**
   * Get recent locations for a player (last 5).
   * @param {string} playerId
   * @returns {Array}
   */
  function getRecentLocations(playerId) {
    if (!playerRecent[playerId]) {
      playerRecent[playerId] = [];
    }
    return playerRecent[playerId].slice();
  }

  /**
   * Add a location to a player's recent history.
   * Keeps only the last MAX_RECENT_LOCATIONS entries.
   * Does not add duplicates for the same destination id.
   * @param {string} playerId
   * @param {Object} dest - Destination object {id, name, x, z, zone, ...}
   * @returns {boolean} True if added successfully
   */
  function addRecentLocation(playerId, dest) {
    if (!playerId || typeof playerId !== 'string') return false;
    if (!dest || !dest.id || !dest.name || typeof dest.x !== 'number' || typeof dest.z !== 'number') {
      return false;
    }

    if (!playerRecent[playerId]) {
      playerRecent[playerId] = [];
    }

    var recent = playerRecent[playerId];

    // Remove existing entry with same id (will be re-added at front)
    for (var i = recent.length - 1; i >= 0; i--) {
      if (recent[i].id === dest.id) {
        recent.splice(i, 1);
        break;
      }
    }

    var entry = {
      id: dest.id,
      name: dest.name,
      zone: dest.zone || 'nexus',
      x: dest.x,
      z: dest.z,
      category: 'recent',
      description: dest.description || '',
      safe: dest.safe !== undefined ? dest.safe : true,
      icon: 'history',
      visitedAt: Date.now()
    };

    // Prepend (most recent first)
    recent.unshift(entry);

    // Trim to max
    if (recent.length > MAX_RECENT_LOCATIONS) {
      recent.length = MAX_RECENT_LOCATIONS;
    }

    return true;
  }

  // ─── POIs ────────────────────────────────────────────────────────────────────

  /**
   * Get POIs within a given radius of (x, z).
   * @param {number} x
   * @param {number} z
   * @param {number} radius
   * @returns {Array} POIs within radius, sorted by distance ascending.
   */
  function getNearbyPOIs(x, z, radius) {
    if (typeof x !== 'number' || typeof z !== 'number' || typeof radius !== 'number') {
      return [];
    }
    var results = [];
    for (var i = 0; i < STATIC_POIS.length; i++) {
      var poi = STATIC_POIS[i];
      var d = distance(x, z, poi.x, poi.z);
      if (d <= radius) {
        results.push({ dest: poi, distance: d });
      }
    }
    results.sort(function(a, b) { return a.distance - b.distance; });
    return results.map(function(r) { return r.dest; });
  }

  // ─── Travel Cost ─────────────────────────────────────────────────────────────

  /**
   * Calculate the Spark cost to travel from one position to a destination.
   * Free within FREE_TRAVEL_RADIUS units. Beyond that: 1 Spark per 100 units.
   * @param {Object} from - {x, z} current position
   * @param {Object} to   - {x, z} destination
   * @returns {number} Cost in Spark (0 or positive integer)
   */
  function calculateTravelCost(from, to) {
    if (!from || typeof from.x !== 'number' || typeof from.z !== 'number') return 0;
    if (!to || typeof to.x !== 'number' || typeof to.z !== 'number') return 0;

    var dist = distance(from.x, from.z, to.x, to.z);
    if (dist <= FREE_TRAVEL_RADIUS) {
      return 0;
    }

    var beyond = dist - FREE_TRAVEL_RADIUS;
    var cost = Math.ceil(beyond / 100) * COST_PER_100_UNITS;
    return cost;
  }

  // ─── Can Travel ──────────────────────────────────────────────────────────────

  /**
   * Check whether a player can execute fast travel from their current position.
   * @param {string} playerId
   * @param {Object} economy - Economy ledger object with getBalance function available
   *                           OR object with balances map (for direct balance lookup)
   * @param {Object} from   - {x, z} current position
   * @param {Object} to     - {x, z} destination
   * @returns {Object} {allowed: boolean, cost: number, error?: string}
   */
  function canTravel(playerId, economy, from, to) {
    if (!playerId || typeof playerId !== 'string') {
      return { allowed: false, cost: 0, error: 'Invalid playerId' };
    }
    if (!from || typeof from.x !== 'number' || typeof from.z !== 'number') {
      return { allowed: false, cost: 0, error: 'Invalid origin position' };
    }
    if (!to || typeof to.x !== 'number' || typeof to.z !== 'number') {
      return { allowed: false, cost: 0, error: 'Invalid destination position' };
    }

    var cost = calculateTravelCost(from, to);

    if (cost === 0) {
      return { allowed: true, cost: 0 };
    }

    // Check player balance
    var balance = 0;
    if (economy) {
      if (typeof economy.getBalance === 'function') {
        // Economy module API
        balance = economy.getBalance(economy.ledger || economy, playerId);
      } else if (economy.balances) {
        // Direct ledger object
        balance = economy.balances[playerId] || 0;
      }
    }

    if (balance < cost) {
      return {
        allowed: false,
        cost: cost,
        error: 'Insufficient Spark (need ' + cost + ', have ' + balance + ')'
      };
    }

    return { allowed: true, cost: cost };
  }

  // ─── Execute Fast Travel ──────────────────────────────────────────────────────

  /**
   * Execute fast travel and return a warp protocol message.
   * Does NOT deduct Spark — caller must handle economy deduction.
   * Also records the destination in recent locations.
   * @param {string} playerId
   * @param {Object} dest - Destination object {id, name, x, z, zone, ...}
   * @param {Object} currentPos - {x, y, z, zone} current player position
   * @returns {Object} Warp protocol message ready to broadcast
   */
  function executeFastTravel(playerId, dest, currentPos) {
    if (!playerId || typeof playerId !== 'string') {
      throw new Error('Invalid playerId');
    }
    if (!dest || typeof dest.x !== 'number' || typeof dest.z !== 'number') {
      throw new Error('Invalid destination');
    }

    var pos = currentPos || { x: 0, y: 0, z: 0, zone: 'nexus' };

    // Record in recent locations
    addRecentLocation(playerId, dest);

    // Build warp protocol message (follows protocol.js message shape)
    var warpMsg = {
      v: 1,
      id: _generateId(),
      ts: new Date().toISOString(),
      seq: 0,
      from: playerId,
      type: 'warp',
      platform: 'desktop',
      position: {
        x: pos.x || 0,
        y: pos.y || 0,
        z: pos.z || 0,
        zone: pos.zone || 'nexus'
      },
      geo: null,
      payload: {
        destination_id: dest.id,
        destination_name: dest.name,
        destination_zone: dest.zone || 'nexus',
        destination_x: dest.x,
        destination_z: dest.z,
        category: dest.category || 'zone',
        fast_travel: true
      }
    };

    return warpMsg;
  }

  // Simple id generator (not crypto-quality, fine for fast travel)
  function _generateId() {
    return 'ft_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  // ─── Available Destinations ───────────────────────────────────────────────────

  /**
   * Get all available destinations for a player.
   * Combines zone waypoints, POIs, bookmarks, and recent locations.
   * @param {Object} playerData - {id, position: {x,z}}
   * @returns {Array} All destinations with distance metadata
   */
  function getAvailableDestinations(playerData) {
    if (!playerData || !playerData.id) return [];

    var px = (playerData.position && typeof playerData.position.x === 'number') ? playerData.position.x : 0;
    var pz = (playerData.position && typeof playerData.position.z === 'number') ? playerData.position.z : 0;

    var allDests = [];

    // Zone waypoints
    var zones = getZoneWaypoints();
    for (var i = 0; i < zones.length; i++) {
      var z = zones[i];
      allDests.push(_attachMeta(z, px, pz));
    }

    // Static POIs
    for (var j = 0; j < STATIC_POIS.length; j++) {
      var poi = STATIC_POIS[j];
      allDests.push(_attachMeta(poi, px, pz));
    }

    // Player bookmarks
    var bookmarks = getBookmarks(playerData.id);
    for (var k = 0; k < bookmarks.length; k++) {
      allDests.push(_attachMeta(bookmarks[k], px, pz));
    }

    // Recent locations (deduplicated by id)
    var recent = getRecentLocations(playerData.id);
    var seenIds = {};
    for (var l = 0; l < allDests.length; l++) {
      seenIds[allDests[l].id] = true;
    }
    for (var m = 0; m < recent.length; m++) {
      if (!seenIds[recent[m].id]) {
        allDests.push(_attachMeta(recent[m], px, pz));
        seenIds[recent[m].id] = true;
      }
    }

    return allDests;
  }

  /**
   * Attach distance and cost metadata to a destination object.
   * @param {Object} dest
   * @param {number} fromX
   * @param {number} fromZ
   * @returns {Object} Copy of dest with distance and travelCost fields
   */
  function _attachMeta(dest, fromX, fromZ) {
    var dist = distance(fromX, fromZ, dest.x, dest.z);
    var cost = calculateTravelCost({ x: fromX, z: fromZ }, { x: dest.x, z: dest.z });
    return {
      id: dest.id,
      name: dest.name,
      zone: dest.zone,
      x: dest.x,
      z: dest.z,
      category: dest.category,
      description: dest.description || '',
      safe: dest.safe !== undefined ? dest.safe : true,
      icon: dest.icon || 'place',
      addedAt: dest.addedAt,
      visitedAt: dest.visitedAt,
      distance: Math.round(dist),
      travelCost: cost
    };
  }

  // ─── Search & Sort ────────────────────────────────────────────────────────────

  /**
   * Search destinations by name or description (case-insensitive).
   * @param {string} query
   * @param {Array} available - Array returned by getAvailableDestinations
   * @returns {Array} Filtered destinations matching query
   */
  function searchDestinations(query, available) {
    if (!query || typeof query !== 'string' || query.trim() === '') {
      return available ? available.slice() : [];
    }
    if (!available || !Array.isArray(available)) return [];

    var q = query.toLowerCase().trim();
    return available.filter(function(dest) {
      var nameMatch = dest.name && dest.name.toLowerCase().indexOf(q) !== -1;
      var descMatch = dest.description && dest.description.toLowerCase().indexOf(q) !== -1;
      var zoneMatch = dest.zone && dest.zone.toLowerCase().indexOf(q) !== -1;
      var catMatch = dest.category && dest.category.toLowerCase().indexOf(q) !== -1;
      return nameMatch || descMatch || zoneMatch || catMatch;
    });
  }

  /**
   * Sort destinations by distance from player (ascending).
   * @param {Array} dests - Array of destination objects with .distance field
   * @returns {Array} New sorted array
   */
  function sortByDistance(dests) {
    if (!dests || !Array.isArray(dests)) return [];
    return dests.slice().sort(function(a, b) {
      return (a.distance || 0) - (b.distance || 0);
    });
  }

  /**
   * Sort destinations by category then by name.
   * Category order: zone, portal, anchor, garden, bookmark, recent
   * @param {Array} dests
   * @returns {Array} New sorted array
   */
  function sortByCategory(dests) {
    if (!dests || !Array.isArray(dests)) return [];
    var categoryOrder = { zone: 0, portal: 1, anchor: 2, garden: 3, bookmark: 4, recent: 5 };
    return dests.slice().sort(function(a, b) {
      var ca = categoryOrder[a.category] !== undefined ? categoryOrder[a.category] : 99;
      var cb = categoryOrder[b.category] !== undefined ? categoryOrder[b.category] : 99;
      if (ca !== cb) return ca - cb;
      return (a.name || '').localeCompare(b.name || '');
    });
  }

  // ─── Formatting ───────────────────────────────────────────────────────────────

  /**
   * Get a human-readable category icon string for a destination.
   * @param {string} category
   * @returns {string}
   */
  function getCategoryIcon(category) {
    var icons = {
      zone: 'hub',
      portal: 'trip_origin',
      anchor: 'anchor',
      garden: 'local_florist',
      bookmark: 'bookmark',
      recent: 'history'
    };
    return icons[category] || 'place';
  }

  /**
   * Format a destination for display in the HUD panel.
   * @param {Object} dest
   * @returns {Object} Formatted display object
   */
  function formatDestination(dest) {
    if (!dest) return null;

    var costStr = dest.travelCost === 0 ? 'Free' : dest.travelCost + ' Spark';
    var distStr = dest.distance !== undefined ? dest.distance + ' units away' : '';
    var safeStr = dest.safe === false ? ' (Danger)' : '';

    return {
      id: dest.id,
      displayName: dest.name + safeStr,
      zoneName: _zoneDisplayName(dest.zone),
      category: dest.category,
      categoryIcon: getCategoryIcon(dest.category),
      description: dest.description || '',
      costLabel: costStr,
      distanceLabel: distStr,
      safe: dest.safe !== undefined ? dest.safe : true,
      x: dest.x,
      z: dest.z
    };
  }

  function _zoneDisplayName(zoneId) {
    var names = {
      nexus: 'The Nexus',
      gardens: 'The Gardens',
      athenaeum: 'The Athenaeum',
      studio: 'The Studio',
      wilds: 'The Wilds',
      agora: 'The Agora',
      commons: 'The Commons',
      arena: 'The Arena'
    };
    return names[zoneId] || zoneId;
  }

  // ─── HUD Panel ───────────────────────────────────────────────────────────────

  /**
   * Show the fast travel panel. Returns the panel data needed to render the UI.
   * @param {Object} playerData - {id, position: {x,z}}
   * @param {string} [category] - Initial category tab ('zone', 'portal', 'anchor', 'garden', 'bookmark', 'recent', 'all')
   * @returns {Object} Panel data {visible, category, destinations, categories, tabs}
   */
  function showFastTravelPanel(playerData, category) {
    panelState.visible = true;
    panelState.activeCategory = category || 'zone';
    panelState.searchQuery = '';

    var allDests = getAvailableDestinations(playerData);
    var filtered = _filterByCategory(allDests, panelState.activeCategory);
    var sorted = sortByDistance(filtered);

    var categories = _getAvailableCategories(allDests);

    return {
      visible: true,
      activeCategory: panelState.activeCategory,
      searchQuery: '',
      destinations: sorted.map(function(d) { return formatDestination(d); }),
      allDestinations: allDests,
      categories: categories,
      tabs: _buildTabs(allDests)
    };
  }

  /**
   * Hide the fast travel panel. Resets panel state.
   * @returns {Object} {visible: false}
   */
  function hideFastTravelPanel() {
    panelState.visible = false;
    panelState.searchQuery = '';
    return { visible: false };
  }

  /**
   * Get current panel state.
   * @returns {Object}
   */
  function getPanelState() {
    return {
      visible: panelState.visible,
      activeCategory: panelState.activeCategory,
      searchQuery: panelState.searchQuery
    };
  }

  /**
   * Switch the active category tab in the panel.
   * @param {string} category
   * @param {Object} playerData
   * @returns {Object} Updated panel data
   */
  function switchCategory(category, playerData) {
    panelState.activeCategory = category;
    var allDests = getAvailableDestinations(playerData);
    var filtered = _filterByCategory(allDests, category);
    var sorted = sortByDistance(filtered);
    return {
      visible: panelState.visible,
      activeCategory: category,
      searchQuery: panelState.searchQuery,
      destinations: sorted.map(function(d) { return formatDestination(d); }),
      categories: _getAvailableCategories(allDests),
      tabs: _buildTabs(allDests)
    };
  }

  /**
   * Perform a live search within the panel.
   * @param {string} query
   * @param {Object} playerData
   * @returns {Object} Updated panel data
   */
  function searchPanel(query, playerData) {
    panelState.searchQuery = query;
    var allDests = getAvailableDestinations(playerData);
    var filtered = query && query.trim() !== ''
      ? searchDestinations(query, allDests)
      : _filterByCategory(allDests, panelState.activeCategory);
    var sorted = sortByDistance(filtered);
    return {
      visible: panelState.visible,
      activeCategory: panelState.activeCategory,
      searchQuery: query,
      destinations: sorted.map(function(d) { return formatDestination(d); }),
      categories: _getAvailableCategories(allDests),
      tabs: _buildTabs(allDests)
    };
  }

  function _filterByCategory(dests, category) {
    if (!category || category === 'all') return dests;
    return dests.filter(function(d) { return d.category === category; });
  }

  function _getAvailableCategories(dests) {
    var seen = {};
    var cats = [];
    for (var i = 0; i < dests.length; i++) {
      var cat = dests[i].category;
      if (cat && !seen[cat]) {
        seen[cat] = true;
        cats.push(cat);
      }
    }
    return cats;
  }

  function _buildTabs(allDests) {
    var categoryOrder = ['all', 'zone', 'portal', 'anchor', 'garden', 'bookmark', 'recent'];
    var counts = { all: allDests.length };
    for (var i = 0; i < allDests.length; i++) {
      var cat = allDests[i].category;
      counts[cat] = (counts[cat] || 0) + 1;
    }
    var tabs = [];
    for (var j = 0; j < categoryOrder.length; j++) {
      var c = categoryOrder[j];
      if (counts[c] !== undefined) {
        tabs.push({
          category: c,
          label: _categoryLabel(c),
          count: counts[c],
          icon: getCategoryIcon(c)
        });
      }
    }
    return tabs;
  }

  function _categoryLabel(category) {
    var labels = {
      all: 'All',
      zone: 'Zones',
      portal: 'Portals',
      anchor: 'Anchors',
      garden: 'Gardens',
      bookmark: 'Bookmarks',
      recent: 'Recent'
    };
    return labels[category] || category;
  }

  // ─── Constants export ─────────────────────────────────────────────────────────

  // Expose constants for testing
  var FREE_TRAVEL_RADIUS_EXPORT = FREE_TRAVEL_RADIUS;
  var COST_PER_100_UNITS_EXPORT = COST_PER_100_UNITS;
  var MAX_BOOKMARKS_EXPORT = MAX_BOOKMARKS;
  var MAX_RECENT_LOCATIONS_EXPORT = MAX_RECENT_LOCATIONS;

  // ─── Internal reset (for tests) ───────────────────────────────────────────────
  function _resetState() {
    playerBookmarks = {};
    playerRecent = {};
    panelState.visible = false;
    panelState.activeCategory = 'zone';
    panelState.searchQuery = '';
  }

  // ─── Exports ──────────────────────────────────────────────────────────────────
  exports.ZONE_WAYPOINTS = ZONE_WAYPOINTS;
  exports.STATIC_POIS = STATIC_POIS;
  exports.FREE_TRAVEL_RADIUS = FREE_TRAVEL_RADIUS_EXPORT;
  exports.COST_PER_100_UNITS = COST_PER_100_UNITS_EXPORT;
  exports.MAX_BOOKMARKS = MAX_BOOKMARKS_EXPORT;
  exports.MAX_RECENT_LOCATIONS = MAX_RECENT_LOCATIONS_EXPORT;

  exports.distance = distance;
  exports.getZoneWaypoints = getZoneWaypoints;
  exports.getBookmarks = getBookmarks;
  exports.addBookmark = addBookmark;
  exports.removeBookmark = removeBookmark;
  exports.getRecentLocations = getRecentLocations;
  exports.addRecentLocation = addRecentLocation;
  exports.getNearbyPOIs = getNearbyPOIs;
  exports.calculateTravelCost = calculateTravelCost;
  exports.canTravel = canTravel;
  exports.executeFastTravel = executeFastTravel;
  exports.getAvailableDestinations = getAvailableDestinations;
  exports.searchDestinations = searchDestinations;
  exports.sortByDistance = sortByDistance;
  exports.sortByCategory = sortByCategory;
  exports.formatDestination = formatDestination;
  exports.getCategoryIcon = getCategoryIcon;
  exports.showFastTravelPanel = showFastTravelPanel;
  exports.hideFastTravelPanel = hideFastTravelPanel;
  exports.getPanelState = getPanelState;
  exports.switchCategory = switchCategory;
  exports.searchPanel = searchPanel;
  exports._resetState = _resetState;

})(typeof module !== 'undefined' ? module.exports : (window.FastTravel = {}));
