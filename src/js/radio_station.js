// radio_station.js — Player-run Radio Station System for ZION
// One station per zone. Players broadcast music, poetry, interviews.
// Audience size affects Spark earnings.
(function(exports) {
  'use strict';

  // ── Zone list (matches ZION world zones) ─────────────────────────────────

  var ZONE_NAMES = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];

  // ── STATIONS — one per zone, auto-created ─────────────────────────────────

  function createStation(zone) {
    return {
      id: 'radio_' + zone,
      zone: zone,
      name: capitalize(zone) + ' Radio',
      currentBroadcast: null,
      queue: [],
      schedule: [],
      listeners: [],
      totalBroadcasts: 0,
      totalListenerTicks: 0,
      broadcastHistory: []
    };
  }

  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // ── BROADCAST_TYPES ───────────────────────────────────────────────────────

  var BROADCAST_TYPES = [
    { id: 'music',     name: 'Music',          minDuration: 10,  maxDuration: 100, sparkPerListener: 2 },
    { id: 'poetry',    name: 'Poetry Reading', minDuration: 5,   maxDuration: 30,  sparkPerListener: 3 },
    { id: 'story',     name: 'Story Time',     minDuration: 10,  maxDuration: 60,  sparkPerListener: 2 },
    { id: 'interview', name: 'Interview',      minDuration: 15,  maxDuration: 60,  sparkPerListener: 4 },
    { id: 'news',      name: 'World News',     minDuration: 5,   maxDuration: 20,  sparkPerListener: 1 },
    { id: 'ambient',   name: 'Ambient Sounds', minDuration: 30,  maxDuration: 300, sparkPerListener: 1 }
  ];

  // Lookup map for broadcast types
  var _typeMap = {};
  for (var _ti = 0; _ti < BROADCAST_TYPES.length; _ti++) {
    _typeMap[BROADCAST_TYPES[_ti].id] = BROADCAST_TYPES[_ti];
  }

  // ── Counter for unique IDs ────────────────────────────────────────────────

  var _broadcastCounter = 0;
  var _queueCounter = 0;

  function nextBroadcastId() {
    _broadcastCounter++;
    return 'bc_' + _broadcastCounter;
  }

  function nextQueueId() {
    _queueCounter++;
    return 'q_' + _queueCounter;
  }

  // ── State initialiser ─────────────────────────────────────────────────────

  /**
   * Create a fresh radio state with 8 zone stations.
   * @returns {Object} state
   */
  function createState() {
    var state = { stations: {}, broadcasts: {} };
    for (var i = 0; i < ZONE_NAMES.length; i++) {
      var z = ZONE_NAMES[i];
      state.stations[z] = createStation(z);
    }
    return state;
  }

  // ── Internal helpers ──────────────────────────────────────────────────────

  function getTypeInfo(typeId) {
    return _typeMap[typeId] || null;
  }

  function validateDuration(typeId, duration) {
    var t = getTypeInfo(typeId);
    if (!t) return false;
    return duration >= t.minDuration && duration <= t.maxDuration;
  }

  // ── Core API ──────────────────────────────────────────────────────────────

  /**
   * Go live on a zone's station. One broadcast per station at a time.
   * @param {Object} state
   * @param {string} broadcasterId
   * @param {string} zone
   * @param {string} type   — broadcast type id
   * @param {string} title
   * @param {string} description
   * @param {number} duration  — in ticks
   * @param {number} currentTick
   * @returns {{success: boolean, broadcast: Object|null, reason: string}}
   */
  function startBroadcast(state, broadcasterId, zone, type, title, description, duration, currentTick) {
    if (!state || !state.stations) {
      return { success: false, broadcast: null, reason: 'Invalid state' };
    }
    var station = state.stations[zone];
    if (!station) {
      return { success: false, broadcast: null, reason: 'Unknown zone: ' + zone };
    }
    if (!broadcasterId) {
      return { success: false, broadcast: null, reason: 'broadcasterId required' };
    }
    if (!getTypeInfo(type)) {
      return { success: false, broadcast: null, reason: 'Unknown broadcast type: ' + type };
    }
    if (!validateDuration(type, duration)) {
      var t = getTypeInfo(type);
      return { success: false, broadcast: null, reason: 'Duration ' + duration + ' out of range [' + t.minDuration + ',' + t.maxDuration + '] for type ' + type };
    }
    if (station.currentBroadcast) {
      return { success: false, broadcast: null, reason: 'Station is already broadcasting' };
    }
    if (!title) {
      return { success: false, broadcast: null, reason: 'Title required' };
    }

    var bc = {
      id: nextBroadcastId(),
      stationId: station.id,
      broadcasterId: broadcasterId,
      type: type,
      title: title,
      description: description || '',
      startTick: currentTick,
      endTick: currentTick + duration,
      listeners: [],
      peakListeners: 0,
      sparkEarned: 0,
      status: 'live'
    };

    state.broadcasts[bc.id] = bc;
    station.currentBroadcast = bc.id;
    station.totalBroadcasts++;

    return { success: true, broadcast: bc, reason: '' };
  }

  /**
   * End a broadcast, calculate Spark earned.
   * @param {Object} state
   * @param {string} broadcastId
   * @param {number} currentTick
   * @returns {{success: boolean, sparkEarned: number, peakListeners: number, totalListenerTicks: number, reason: string}}
   */
  function endBroadcast(state, broadcastId, currentTick) {
    if (!state || !state.broadcasts) {
      return { success: false, sparkEarned: 0, peakListeners: 0, totalListenerTicks: 0, reason: 'Invalid state' };
    }
    var bc = state.broadcasts[broadcastId];
    if (!bc) {
      return { success: false, sparkEarned: 0, peakListeners: 0, totalListenerTicks: 0, reason: 'Broadcast not found' };
    }
    if (bc.status !== 'live') {
      return { success: false, sparkEarned: 0, peakListeners: 0, totalListenerTicks: 0, reason: 'Broadcast is not live (status: ' + bc.status + ')' };
    }

    var typeInfo = getTypeInfo(bc.type);
    var listenerCount = bc.listeners.length;
    var ticksLive = (currentTick - bc.startTick);
    var sparkPerListener = typeInfo ? typeInfo.sparkPerListener : 1;
    var sparkEarned = listenerCount * sparkPerListener * Math.max(1, ticksLive);

    bc.status = 'completed';
    bc.endTick = currentTick;
    bc.sparkEarned = sparkEarned;

    // Find station and clean up
    var zone = bc.stationId.replace('radio_', '');
    var station = state.stations[zone];
    if (station) {
      station.currentBroadcast = null;
      station.totalListenerTicks += ticksLive * listenerCount;
      // Archive to history (keep last 50)
      station.broadcastHistory.push(broadcastId);
      if (station.broadcastHistory.length > 50) {
        station.broadcastHistory.shift();
      }
      // Remove all listeners from station listener list
      station.listeners = [];
    }

    return {
      success: true,
      sparkEarned: sparkEarned,
      peakListeners: bc.peakListeners,
      totalListenerTicks: ticksLive * listenerCount,
      reason: ''
    };
  }

  /**
   * Schedule a future broadcast.
   * @param {Object} state
   * @param {string} broadcasterId
   * @param {string} zone
   * @param {string} type
   * @param {string} title
   * @param {string} description
   * @param {number} duration
   * @param {number} startTick
   * @returns {{success: boolean, broadcast: Object|null, reason: string}}
   */
  function scheduleBroadcast(state, broadcasterId, zone, type, title, description, duration, startTick) {
    if (!state || !state.stations) {
      return { success: false, broadcast: null, reason: 'Invalid state' };
    }
    var station = state.stations[zone];
    if (!station) {
      return { success: false, broadcast: null, reason: 'Unknown zone: ' + zone };
    }
    if (!broadcasterId) {
      return { success: false, broadcast: null, reason: 'broadcasterId required' };
    }
    if (!getTypeInfo(type)) {
      return { success: false, broadcast: null, reason: 'Unknown broadcast type: ' + type };
    }
    if (!validateDuration(type, duration)) {
      var t = getTypeInfo(type);
      return { success: false, broadcast: null, reason: 'Duration ' + duration + ' out of range for type ' + type };
    }
    if (!title) {
      return { success: false, broadcast: null, reason: 'Title required' };
    }
    if (typeof startTick !== 'number') {
      return { success: false, broadcast: null, reason: 'startTick must be a number' };
    }

    var bc = {
      id: nextBroadcastId(),
      stationId: station.id,
      broadcasterId: broadcasterId,
      type: type,
      title: title,
      description: description || '',
      startTick: startTick,
      endTick: startTick + duration,
      listeners: [],
      peakListeners: 0,
      sparkEarned: 0,
      status: 'scheduled'
    };

    state.broadcasts[bc.id] = bc;
    station.schedule.push(bc.id);

    // Keep schedule sorted by startTick
    station.schedule.sort(function(a, b) {
      var ba = state.broadcasts[a];
      var bb = state.broadcasts[b];
      return (ba ? ba.startTick : 0) - (bb ? bb.startTick : 0);
    });

    return { success: true, broadcast: bc, reason: '' };
  }

  /**
   * Cancel a broadcast (either scheduled or live).
   * @param {Object} state
   * @param {string} broadcasterId  — must match original broadcaster
   * @param {string} broadcastId
   * @returns {{success: boolean, reason: string}}
   */
  function cancelBroadcast(state, broadcasterId, broadcastId) {
    if (!state || !state.broadcasts) {
      return { success: false, reason: 'Invalid state' };
    }
    var bc = state.broadcasts[broadcastId];
    if (!bc) {
      return { success: false, reason: 'Broadcast not found' };
    }
    if (bc.broadcasterId !== broadcasterId) {
      return { success: false, reason: 'Only the broadcaster can cancel their broadcast' };
    }
    if (bc.status === 'completed' || bc.status === 'cancelled') {
      return { success: false, reason: 'Broadcast already ' + bc.status };
    }

    var zone = bc.stationId.replace('radio_', '');
    var station = state.stations[zone];

    if (bc.status === 'live' && station) {
      station.currentBroadcast = null;
      station.listeners = [];
    }

    if (bc.status === 'scheduled' && station) {
      var idx = station.schedule.indexOf(broadcastId);
      if (idx !== -1) station.schedule.splice(idx, 1);
    }

    bc.status = 'cancelled';

    return { success: true, reason: '' };
  }

  /**
   * Player starts listening to a zone's station.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} zone
   * @param {number} currentTick
   * @returns {{success: boolean, broadcast: Object|null, reason: string}}
   */
  function tunein(state, playerId, zone, currentTick) {
    if (!state || !state.stations) {
      return { success: false, broadcast: null, reason: 'Invalid state' };
    }
    var station = state.stations[zone];
    if (!station) {
      return { success: false, broadcast: null, reason: 'Unknown zone: ' + zone };
    }
    if (!playerId) {
      return { success: false, broadcast: null, reason: 'playerId required' };
    }

    // Already tuned in?
    if (station.listeners.indexOf(playerId) !== -1) {
      var currentBc = station.currentBroadcast ? state.broadcasts[station.currentBroadcast] : null;
      return { success: true, broadcast: currentBc, reason: 'Already listening' };
    }

    station.listeners.push(playerId);

    var bc = station.currentBroadcast ? state.broadcasts[station.currentBroadcast] : null;
    if (bc && bc.status === 'live') {
      if (bc.listeners.indexOf(playerId) === -1) {
        bc.listeners.push(playerId);
        if (bc.listeners.length > bc.peakListeners) {
          bc.peakListeners = bc.listeners.length;
        }
      }
    }

    return { success: true, broadcast: bc, reason: '' };
  }

  /**
   * Player stops listening to a zone's station.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} zone
   * @returns {{success: boolean, reason: string}}
   */
  function tuneOut(state, playerId, zone) {
    if (!state || !state.stations) {
      return { success: false, reason: 'Invalid state' };
    }
    var station = state.stations[zone];
    if (!station) {
      return { success: false, reason: 'Unknown zone: ' + zone };
    }

    var idx = station.listeners.indexOf(playerId);
    if (idx === -1) {
      return { success: false, reason: 'Player is not listening to this station' };
    }
    station.listeners.splice(idx, 1);

    var bc = station.currentBroadcast ? state.broadcasts[station.currentBroadcast] : null;
    if (bc) {
      var bcIdx = bc.listeners.indexOf(playerId);
      if (bcIdx !== -1) bc.listeners.splice(bcIdx, 1);
    }

    return { success: true, reason: '' };
  }

  /**
   * Get station object for a zone.
   * @param {Object} state
   * @param {string} zone
   * @returns {Object|null}
   */
  function getStation(state, zone) {
    if (!state || !state.stations) return null;
    return state.stations[zone] || null;
  }

  /**
   * Get all stations as an array.
   * @param {Object} state
   * @returns {Array}
   */
  function getAllStations(state) {
    if (!state || !state.stations) return [];
    var result = [];
    for (var z in state.stations) {
      result.push(state.stations[z]);
    }
    return result;
  }

  /**
   * Get the current live broadcast for a zone (or null).
   * @param {Object} state
   * @param {string} zone
   * @returns {Object|null}
   */
  function getCurrentBroadcast(state, zone) {
    if (!state || !state.stations) return null;
    var station = state.stations[zone];
    if (!station || !station.currentBroadcast) return null;
    var bc = state.broadcasts[station.currentBroadcast];
    return bc && bc.status === 'live' ? bc : null;
  }

  /**
   * Get schedule for a zone in a tick range.
   * @param {Object} state
   * @param {string} zone
   * @param {number} fromTick
   * @param {number} toTick
   * @returns {Array}
   */
  function getSchedule(state, zone, fromTick, toTick) {
    if (!state || !state.stations) return [];
    var station = state.stations[zone];
    if (!station) return [];
    var result = [];
    for (var i = 0; i < station.schedule.length; i++) {
      var bc = state.broadcasts[station.schedule[i]];
      if (!bc) continue;
      if (bc.startTick >= fromTick && bc.startTick <= toTick) {
        result.push(bc);
      }
    }
    return result;
  }

  /**
   * Get the queue for a zone.
   * @param {Object} state
   * @param {string} zone
   * @returns {Array}
   */
  function getQueue(state, zone) {
    if (!state || !state.stations) return [];
    var station = state.stations[zone];
    if (!station) return [];
    var result = [];
    for (var i = 0; i < station.queue.length; i++) {
      var entry = station.queue[i];
      result.push(entry);
    }
    return result;
  }

  /**
   * Add a broadcast to a zone's queue (to auto-start when station is free).
   * @param {Object} state
   * @param {string} broadcasterId
   * @param {string} zone
   * @param {string} type
   * @param {string} title
   * @param {string} description
   * @param {number} duration
   * @returns {{success: boolean, entry: Object|null, reason: string}}
   */
  function addToQueue(state, broadcasterId, zone, type, title, description, duration) {
    if (!state || !state.stations) {
      return { success: false, entry: null, reason: 'Invalid state' };
    }
    var station = state.stations[zone];
    if (!station) {
      return { success: false, entry: null, reason: 'Unknown zone: ' + zone };
    }
    if (!broadcasterId) {
      return { success: false, entry: null, reason: 'broadcasterId required' };
    }
    if (!getTypeInfo(type)) {
      return { success: false, entry: null, reason: 'Unknown broadcast type: ' + type };
    }
    if (!validateDuration(type, duration)) {
      return { success: false, entry: null, reason: 'Invalid duration for type ' + type };
    }
    if (!title) {
      return { success: false, entry: null, reason: 'Title required' };
    }

    var entry = {
      id: nextQueueId(),
      broadcasterId: broadcasterId,
      zone: zone,
      type: type,
      title: title,
      description: description || '',
      duration: duration,
      addedAt: Date.now()
    };

    station.queue.push(entry);
    return { success: true, entry: entry, reason: '' };
  }

  /**
   * Get listener list for a zone's station.
   * @param {Object} state
   * @param {string} zone
   * @returns {Array}
   */
  function getListeners(state, zone) {
    if (!state || !state.stations) return [];
    var station = state.stations[zone];
    if (!station) return [];
    return station.listeners.slice();
  }

  /**
   * Get listener count for a zone's station.
   * @param {Object} state
   * @param {string} zone
   * @returns {number}
   */
  function getListenerCount(state, zone) {
    return getListeners(state, zone).length;
  }

  /**
   * Get recent broadcast history for a zone.
   * @param {Object} state
   * @param {string} zone
   * @param {number} count  — max results
   * @returns {Array}
   */
  function getBroadcastHistory(state, zone, count) {
    if (!state || !state.stations) return [];
    var station = state.stations[zone];
    if (!station) return [];
    var history = station.broadcastHistory;
    var n = count || 10;
    var slice = history.slice(-n);
    var result = [];
    for (var i = 0; i < slice.length; i++) {
      var bc = state.broadcasts[slice[i]];
      if (bc) result.push(bc);
    }
    return result;
  }

  /**
   * Get all broadcasts by a player.
   * @param {Object} state
   * @param {string} playerId
   * @returns {Array}
   */
  function getPlayerBroadcasts(state, playerId) {
    if (!state || !state.broadcasts) return [];
    var result = [];
    for (var id in state.broadcasts) {
      var bc = state.broadcasts[id];
      if (bc.broadcasterId === playerId) result.push(bc);
    }
    return result;
  }

  /**
   * Get aggregated broadcaster stats.
   * @param {Object} state
   * @param {string} playerId
   * @returns {{totalBroadcasts: number, totalListeners: number, totalSparkEarned: number, avgAudience: number}}
   */
  function getBroadcasterStats(state, playerId) {
    var broadcasts = getPlayerBroadcasts(state, playerId);
    var totalBroadcasts = broadcasts.length;
    var totalListeners = 0;
    var totalSparkEarned = 0;
    var completedCount = 0;
    for (var i = 0; i < broadcasts.length; i++) {
      var bc = broadcasts[i];
      totalListeners += bc.peakListeners;
      totalSparkEarned += bc.sparkEarned;
      if (bc.status === 'completed') completedCount++;
    }
    var avgAudience = completedCount > 0 ? totalListeners / completedCount : 0;
    return {
      totalBroadcasts: totalBroadcasts,
      totalListeners: totalListeners,
      totalSparkEarned: totalSparkEarned,
      avgAudience: avgAudience
    };
  }

  /**
   * Sort stations by total listener ticks (descending).
   * @param {Object} state
   * @returns {Array}
   */
  function getPopularStations(state) {
    var stations = getAllStations(state);
    stations.sort(function(a, b) {
      return b.totalListenerTicks - a.totalListenerTicks;
    });
    return stations;
  }

  /**
   * Get top broadcasters by total Spark earned.
   * @param {Object} state
   * @param {number} count
   * @returns {Array} [{playerId, totalBroadcasts, totalSparkEarned, avgAudience}, ...]
   */
  function getTopBroadcasters(state, count) {
    if (!state || !state.broadcasts) return [];
    // Collect unique broadcaster ids
    var playerIds = {};
    for (var id in state.broadcasts) {
      var bc = state.broadcasts[id];
      playerIds[bc.broadcasterId] = true;
    }
    var results = [];
    for (var pid in playerIds) {
      var stats = getBroadcasterStats(state, pid);
      results.push({ playerId: pid, totalBroadcasts: stats.totalBroadcasts, totalSparkEarned: stats.totalSparkEarned, avgAudience: stats.avgAudience });
    }
    results.sort(function(a, b) { return b.totalSparkEarned - a.totalSparkEarned; });
    var n = count || 10;
    return results.slice(0, n);
  }

  /**
   * Returns the BROADCAST_TYPES array.
   * @returns {Array}
   */
  function getBroadcastTypes() {
    return BROADCAST_TYPES.slice();
  }

  /**
   * Award small Spark to active listeners of a zone (1 per 10 ticks).
   * Also updates totalListenerTicks on the station.
   * @param {Object} state
   * @param {string} zone
   * @param {number} currentTick
   * @returns {{awarded: Array, totalAwarded: number}}
   */
  function updateListenerRewards(state, zone, currentTick) {
    if (!state || !state.stations) return { awarded: [], totalAwarded: 0 };
    var station = state.stations[zone];
    if (!station || !station.currentBroadcast) return { awarded: [], totalAwarded: 0 };

    var bc = state.broadcasts[station.currentBroadcast];
    if (!bc || bc.status !== 'live') return { awarded: [], totalAwarded: 0 };

    var listenerCount = station.listeners.length;
    if (listenerCount === 0) return { awarded: [], totalAwarded: 0 };

    // Award 1 Spark per listener per 10 ticks
    var ticksElapsed = currentTick - bc.startTick;
    var sparkThisTick = ticksElapsed % 10 === 0 && ticksElapsed > 0 ? 1 : 0;

    var awarded = [];
    if (sparkThisTick > 0) {
      for (var i = 0; i < station.listeners.length; i++) {
        awarded.push({ playerId: station.listeners[i], spark: sparkThisTick });
      }
    }

    // Always update listener ticks
    station.totalListenerTicks += listenerCount;

    // Update peak listeners on broadcast
    if (listenerCount > bc.peakListeners) {
      bc.peakListeners = listenerCount;
    }

    return { awarded: awarded, totalAwarded: sparkThisTick * awarded.length };
  }

  // ── Exports ───────────────────────────────────────────────────────────────

  exports.BROADCAST_TYPES = BROADCAST_TYPES;
  exports.ZONE_NAMES = ZONE_NAMES;

  exports.createState = createState;
  exports.startBroadcast = startBroadcast;
  exports.endBroadcast = endBroadcast;
  exports.scheduleBroadcast = scheduleBroadcast;
  exports.cancelBroadcast = cancelBroadcast;
  exports.tunein = tunein;
  exports.tuneOut = tuneOut;
  exports.getStation = getStation;
  exports.getAllStations = getAllStations;
  exports.getCurrentBroadcast = getCurrentBroadcast;
  exports.getSchedule = getSchedule;
  exports.getQueue = getQueue;
  exports.addToQueue = addToQueue;
  exports.getListeners = getListeners;
  exports.getListenerCount = getListenerCount;
  exports.getBroadcastHistory = getBroadcastHistory;
  exports.getPlayerBroadcasts = getPlayerBroadcasts;
  exports.getBroadcasterStats = getBroadcasterStats;
  exports.getPopularStations = getPopularStations;
  exports.getTopBroadcasters = getTopBroadcasters;
  exports.getBroadcastTypes = getBroadcastTypes;
  exports.updateListenerRewards = updateListenerRewards;

})(typeof module !== 'undefined' ? module.exports : (window.RadioStation = {}));
