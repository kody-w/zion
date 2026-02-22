// federation_replication.js — Sync canonical state across federated worlds
// Implements cross-world state replication with conflict resolution via vector clocks
(function(exports) {
  'use strict';

  // ---------------------------------------------------------------------------
  // Seeded PRNG — mulberry32
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
  // Constants
  // ---------------------------------------------------------------------------

  var SYNC_TYPES = [
    {
      id: 'player_roster',
      name: 'Player Roster',
      description: 'Shared player identities and cross-world presence',
      maxBatchSize: 100,
      staleAfterTicks: 10
    },
    {
      id: 'economy_state',
      name: 'Economy State',
      description: 'Cross-world price signals and trade volume data',
      maxBatchSize: 100,
      staleAfterTicks: 20
    },
    {
      id: 'world_events',
      name: 'World Events',
      description: 'Major events visible across the federation',
      maxBatchSize: 100,
      staleAfterTicks: 50
    },
    {
      id: 'lore_progress',
      name: 'Lore Progress',
      description: 'Story and lore milestones unlocked federation-wide',
      maxBatchSize: 100,
      staleAfterTicks: 100
    },
    {
      id: 'reputation',
      name: 'Reputation',
      description: 'Cross-world reputation scores and standing',
      maxBatchSize: 100,
      staleAfterTicks: 30
    }
  ];

  var CONNECTION_STATES = [
    { id: 'connected',     label: 'Connected',     description: 'Active two-way sync link established' },
    { id: 'syncing',       label: 'Syncing',        description: 'Currently exchanging state data' },
    { id: 'disconnected',  label: 'Disconnected',   description: 'Link is down, no sync possible' },
    { id: 'error',         label: 'Error',          description: 'Sync failed due to a conflict or protocol issue' }
  ];

  var MAX_BATCH_SIZE = 100;
  var STALE_TICK_THRESHOLD = 50;
  var MAX_SYNC_LOG = 500;
  var MAX_HEALTH_LOG = 200;

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function generateId(prefix) {
    var ts = Date.now();
    var rnd = Math.floor(Math.random() * 0xFFFFFF).toString(16);
    return (prefix || 'id') + '_' + ts + '_' + rnd;
  }

  function nowTs() {
    return Date.now();
  }

  function cloneDeep(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function getSyncType(id) {
    for (var i = 0; i < SYNC_TYPES.length; i++) {
      if (SYNC_TYPES[i].id === id) return SYNC_TYPES[i];
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // createState
  // ---------------------------------------------------------------------------

  /**
   * Create a fresh federation replication state object.
   * @returns {Object} Initial state
   */
  function createState() {
    return {
      worlds: {},       // worldId -> world record
      syncLog: [],      // array of sync event records
      conflicts: [],    // array of unresolved conflict records
      roster: {},       // playerId -> federation player record
      vectorClocks: {}, // worldId -> {worldId: tickCount, ...}
      healthLog: []     // array of health monitoring records
    };
  }

  // ---------------------------------------------------------------------------
  // World Registration
  // ---------------------------------------------------------------------------

  /**
   * Register a new world in the federation.
   * @param {Object} state
   * @param {string} worldId
   * @param {string} name
   * @param {string} url
   * @param {number} currentTick
   * @returns {{success: boolean, world: Object}}
   */
  function registerWorld(state, worldId, name, url, currentTick) {
    if (!worldId || typeof worldId !== 'string') {
      return { success: false, world: null, error: 'worldId must be a non-empty string' };
    }
    if (!name || typeof name !== 'string') {
      return { success: false, world: null, error: 'name must be a non-empty string' };
    }
    if (!url || typeof url !== 'string') {
      return { success: false, world: null, error: 'url must be a non-empty string' };
    }

    var tick = currentTick || 0;
    var world = {
      id: worldId,
      name: name,
      url: url,
      status: 'connected',
      registeredAt: tick,
      lastSync: null,
      syncCounts: {},
      errorCount: 0,
      latency: 0
    };

    // Initialize per sync-type counts
    for (var i = 0; i < SYNC_TYPES.length; i++) {
      world.syncCounts[SYNC_TYPES[i].id] = 0;
    }

    state.worlds[worldId] = world;

    // Initialize vector clock for this world
    if (!state.vectorClocks[worldId]) {
      state.vectorClocks[worldId] = {};
      state.vectorClocks[worldId][worldId] = tick;
    }

    _logSync(state, worldId, 'register', null, tick, { name: name, url: url });

    return { success: true, world: cloneDeep(world) };
  }

  /**
   * Remove a world from the federation.
   * @param {Object} state
   * @param {string} worldId
   * @param {number} currentTick
   * @returns {{success: boolean}}
   */
  function removeWorld(state, worldId, currentTick) {
    if (!state.worlds[worldId]) {
      return { success: false, error: 'World not found: ' + worldId };
    }
    state.worlds[worldId].status = 'disconnected';
    _logSync(state, worldId, 'remove', null, currentTick || 0, {});
    return { success: true };
  }

  /**
   * Get a single world's info.
   * @param {Object} state
   * @param {string} worldId
   * @returns {Object|null}
   */
  function getWorld(state, worldId) {
    if (!state.worlds[worldId]) return null;
    return cloneDeep(state.worlds[worldId]);
  }

  /**
   * Get all registered worlds.
   * @param {Object} state
   * @returns {Array}
   */
  function getAllWorlds(state) {
    return Object.keys(state.worlds).map(function(id) {
      return cloneDeep(state.worlds[id]);
    });
  }

  // ---------------------------------------------------------------------------
  // Push / Pull Changes
  // ---------------------------------------------------------------------------

  /**
   * Push local changes to a federated world.
   * Groups changes into batches of up to MAX_BATCH_SIZE.
   * @param {Object} state
   * @param {string} worldId
   * @param {string} syncType
   * @param {Array} changes
   * @param {number} currentTick
   * @returns {{success: boolean, batchId: string, changeCount: number}}
   */
  function pushChanges(state, worldId, syncType, changes, currentTick) {
    var tick = currentTick || 0;

    if (!state.worlds[worldId]) {
      return { success: false, error: 'Unknown world: ' + worldId };
    }
    if (!getSyncType(syncType)) {
      return { success: false, error: 'Unknown sync type: ' + syncType };
    }
    if (!Array.isArray(changes)) {
      return { success: false, error: 'changes must be an array' };
    }

    var world = state.worlds[worldId];
    if (world.status === 'disconnected') {
      return { success: false, error: 'World is disconnected: ' + worldId };
    }

    // Limit to MAX_BATCH_SIZE
    var batch = changes.slice(0, MAX_BATCH_SIZE);
    var batchId = generateId('batch');

    // Update world sync metadata
    world.lastSync = tick;
    world.syncCounts[syncType] = (world.syncCounts[syncType] || 0) + batch.length;
    world.status = 'syncing';

    // Advance vector clock
    _advanceClock(state, worldId, tick);

    _logSync(state, worldId, 'push', syncType, tick, {
      batchId: batchId,
      changeCount: batch.length
    });

    // Return to connected after push
    world.status = 'connected';

    return { success: true, batchId: batchId, changeCount: batch.length };
  }

  /**
   * Pull remote changes into local state, resolving conflicts via last-writer-wins.
   * @param {Object} state
   * @param {string} worldId
   * @param {string} syncType
   * @param {Array} remoteChanges  each item: {key, value, clock, ts}
   * @param {number} currentTick
   * @returns {{success: boolean, applied: number, conflicts: number}}
   */
  function pullChanges(state, worldId, syncType, remoteChanges, currentTick) {
    var tick = currentTick || 0;

    if (!state.worlds[worldId]) {
      return { success: false, error: 'Unknown world: ' + worldId };
    }
    if (!getSyncType(syncType)) {
      return { success: false, error: 'Unknown sync type: ' + syncType };
    }
    if (!Array.isArray(remoteChanges)) {
      return { success: false, error: 'remoteChanges must be an array' };
    }

    var world = state.worlds[worldId];
    if (world.status === 'disconnected') {
      return { success: false, error: 'World is disconnected: ' + worldId };
    }

    var applied = 0;
    var conflictCount = 0;

    for (var i = 0; i < remoteChanges.length && i < MAX_BATCH_SIZE; i++) {
      var change = remoteChanges[i];
      var result = _applyChange(state, worldId, syncType, change, tick);
      if (result.conflict) {
        conflictCount++;
        _recordConflict(state, worldId, syncType, change, tick);
      } else if (result.written) {
        applied++;
      }
    }

    world.lastSync = tick;
    _mergeVectorClock(state, worldId, remoteChanges, tick);

    _logSync(state, worldId, 'pull', syncType, tick, {
      applied: applied,
      conflicts: conflictCount
    });

    return { success: true, applied: applied, conflicts: conflictCount };
  }

  // ---------------------------------------------------------------------------
  // Conflict Resolution
  // ---------------------------------------------------------------------------

  /**
   * Apply a single remote change using last-writer-wins with causal ordering.
   * Returns {written: boolean, conflict: boolean}.
   *   written=true  — remote value was stored
   *   written=false — local value kept (remote was stale or equal)
   *   conflict=true — concurrent writes with same ts and different value (still resolved deterministically)
   * @private
   */
  function _applyChange(state, worldId, syncType, change, tick) {
    // We store the "winning" value in state per syncType/key
    var storeKey = syncType + '::' + worldId;
    if (!state._store) state._store = {};
    if (!state._store[storeKey]) state._store[storeKey] = {};

    var key = change.key || change.id || String(Math.random());
    var existing = state._store[storeKey][key];

    if (!existing) {
      // No local copy — apply directly
      state._store[storeKey][key] = {
        value: change.value,
        ts: change.ts || tick,
        clock: change.clock || {}
      };
      return { written: true, conflict: false };
    }

    // Causal ordering: compare vector clocks
    var remoteClock = change.clock || {};
    var localClock = existing.clock || {};
    var remoteTs = change.ts || tick;
    var localTs = existing.ts || 0;

    // Check if remote causally dominates local (all remote counts >= local)
    var remoteDominates = _clockDominates(remoteClock, localClock);
    var localDominates = _clockDominates(localClock, remoteClock);

    if (remoteDominates && !localDominates) {
      // Remote is strictly newer — apply
      state._store[storeKey][key] = {
        value: change.value,
        ts: remoteTs,
        clock: remoteClock
      };
      return { written: true, conflict: false };
    } else if (localDominates && !remoteDominates) {
      // Local is strictly newer — keep local, not a conflict
      return { written: false, conflict: false };
    } else {
      // Concurrent — last-writer-wins by timestamp
      var isConflict = JSON.stringify(change.value) !== JSON.stringify(existing.value);
      if (remoteTs > localTs) {
        state._store[storeKey][key] = {
          value: change.value,
          ts: remoteTs,
          clock: remoteClock
        };
        return { written: true, conflict: false };
      } else if (remoteTs === localTs && isConflict) {
        // Exact same timestamp, different values — true conflict (keep local, deterministic)
        return { written: false, conflict: true };
      } else {
        // remoteTs <= localTs and same value, or remoteTs < localTs — keep local
        return { written: false, conflict: false };
      }
    }
  }

  /**
   * Returns true if clockA causally dominates (>=) clockB.
   * @private
   */
  function _clockDominates(clockA, clockB) {
    var keysB = Object.keys(clockB);
    for (var i = 0; i < keysB.length; i++) {
      var k = keysB[i];
      if ((clockA[k] || 0) < (clockB[k] || 0)) return false;
    }
    return true;
  }

  /**
   * Record a conflict for later resolution.
   * @private
   */
  function _recordConflict(state, worldId, syncType, change, tick) {
    var conflict = {
      id: generateId('conflict'),
      worldId: worldId,
      syncType: syncType,
      change: cloneDeep(change),
      detectedAt: tick,
      resolved: false,
      resolution: null
    };
    state.conflicts.push(conflict);
  }

  /**
   * Resolve a conflict by ID.
   * @param {Object} state
   * @param {string} conflictId
   * @param {string} resolution  'accept_remote' | 'keep_local' | 'manual'
   * @param {number} currentTick
   * @returns {{success: boolean}}
   */
  function resolveConflict(state, conflictId, resolution, currentTick) {
    var tick = currentTick || 0;
    for (var i = 0; i < state.conflicts.length; i++) {
      if (state.conflicts[i].id === conflictId) {
        state.conflicts[i].resolved = true;
        state.conflicts[i].resolution = resolution || 'manual';
        state.conflicts[i].resolvedAt = tick;
        return { success: true };
      }
    }
    return { success: false, error: 'Conflict not found: ' + conflictId };
  }

  /**
   * Get all unresolved conflicts for a world.
   * @param {Object} state
   * @param {string} worldId
   * @returns {Array}
   */
  function getConflicts(state, worldId) {
    return state.conflicts.filter(function(c) {
      return (!worldId || c.worldId === worldId) && !c.resolved;
    }).map(cloneDeep);
  }

  // ---------------------------------------------------------------------------
  // Player Roster Sync
  // ---------------------------------------------------------------------------

  /**
   * Sync a player roster from a remote world.
   * @param {Object} state
   * @param {string} worldId
   * @param {Array} remotePlayers  [{id, username, homeWorld, lastSeen, ...}]
   * @param {number} currentTick
   * @returns {{success: boolean, added: number, updated: number}}
   */
  function syncPlayerRoster(state, worldId, remotePlayers, currentTick) {
    var tick = currentTick || 0;

    if (!state.worlds[worldId]) {
      return { success: false, error: 'Unknown world: ' + worldId };
    }
    if (!Array.isArray(remotePlayers)) {
      return { success: false, error: 'remotePlayers must be an array' };
    }

    var added = 0;
    var updated = 0;

    for (var i = 0; i < remotePlayers.length; i++) {
      var remote = remotePlayers[i];
      var pid = remote.id || remote.username;
      if (!pid) continue;

      if (!state.roster[pid]) {
        // New player — create federation record
        state.roster[pid] = {
          id: pid,
          username: remote.username || pid,
          homeWorld: remote.homeWorld || worldId,
          knownWorlds: [worldId],
          badges: [],
          titles: [],
          federationId: generateId('fed'),
          firstSeenAt: tick,
          lastSeenAt: tick,
          lastSeenWorld: worldId
        };
        added++;
      } else {
        // Existing — update presence info
        var existing = state.roster[pid];
        existing.lastSeenAt = tick;
        existing.lastSeenWorld = worldId;
        if (existing.knownWorlds.indexOf(worldId) === -1) {
          existing.knownWorlds.push(worldId);
        }
        // Merge any new fields from remote
        if (remote.username) existing.username = remote.username;
        updated++;
      }
    }

    _logSync(state, worldId, 'roster_sync', 'player_roster', tick, {
      added: added,
      updated: updated
    });

    return { success: true, added: added, updated: updated };
  }

  /**
   * Get a player's cross-world federation identity.
   * @param {Object} state
   * @param {string} playerId
   * @returns {Object|null}
   */
  function getPlayerFederationId(state, playerId) {
    if (!state.roster[playerId]) return null;
    return cloneDeep(state.roster[playerId]);
  }

  /**
   * Get all traveler badges for a player.
   * @param {Object} state
   * @param {string} playerId
   * @returns {Array}
   */
  function getTravelerBadges(state, playerId) {
    if (!state.roster[playerId]) return [];
    return cloneDeep(state.roster[playerId].badges || []);
  }

  /**
   * Award a cross-world traveler badge to a player.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} worldId
   * @param {Object} badge  {id, name, description, icon?}
   * @param {number} currentTick
   * @returns {{success: boolean}}
   */
  function awardTravelerBadge(state, playerId, worldId, badge, currentTick) {
    var tick = currentTick || 0;

    if (!state.roster[playerId]) {
      return { success: false, error: 'Player not in federation roster: ' + playerId };
    }
    if (!badge || !badge.id) {
      return { success: false, error: 'badge must have an id' };
    }

    var player = state.roster[playerId];
    if (!player.badges) player.badges = [];

    // Check for duplicate badge
    for (var i = 0; i < player.badges.length; i++) {
      if (player.badges[i].id === badge.id && player.badges[i].worldId === worldId) {
        return { success: false, error: 'Badge already awarded' };
      }
    }

    player.badges.push({
      id: badge.id,
      name: badge.name || badge.id,
      description: badge.description || '',
      icon: badge.icon || null,
      worldId: worldId,
      awardedAt: tick
    });

    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // Vector Clocks
  // ---------------------------------------------------------------------------

  /**
   * Get the current vector clock for a world.
   * @param {Object} state
   * @param {string} worldId
   * @returns {Object|null}
   */
  function getVectorClock(state, worldId) {
    if (!state.vectorClocks[worldId]) return null;
    return cloneDeep(state.vectorClocks[worldId]);
  }

  /**
   * Update the vector clock for a world by merging an incoming clock.
   * @param {Object} state
   * @param {string} worldId
   * @param {Object} clock  incoming clock from remote
   * @param {number} currentTick
   * @returns {{success: boolean}}
   */
  function updateVectorClock(state, worldId, clock, currentTick) {
    var tick = currentTick || 0;

    if (!state.vectorClocks[worldId]) {
      state.vectorClocks[worldId] = {};
    }

    var local = state.vectorClocks[worldId];
    var keys = Object.keys(clock || {});
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      local[k] = Math.max(local[k] || 0, clock[k] || 0);
    }
    // Advance own tick
    local[worldId] = Math.max(local[worldId] || 0, tick);

    return { success: true };
  }

  /**
   * Advance the local vector clock for a world.
   * @private
   */
  function _advanceClock(state, worldId, tick) {
    if (!state.vectorClocks[worldId]) {
      state.vectorClocks[worldId] = {};
    }
    var current = state.vectorClocks[worldId][worldId] || 0;
    state.vectorClocks[worldId][worldId] = Math.max(current, tick) + 1;
  }

  /**
   * Merge remote vector clocks from a set of changes.
   * @private
   */
  function _mergeVectorClock(state, worldId, changes, tick) {
    if (!state.vectorClocks[worldId]) {
      state.vectorClocks[worldId] = {};
    }
    var local = state.vectorClocks[worldId];
    for (var i = 0; i < changes.length; i++) {
      var clock = changes[i].clock || {};
      var keys = Object.keys(clock);
      for (var j = 0; j < keys.length; j++) {
        var k = keys[j];
        local[k] = Math.max(local[k] || 0, clock[k] || 0);
      }
    }
    local[worldId] = Math.max(local[worldId] || 0, tick);
  }

  // ---------------------------------------------------------------------------
  // Health Monitoring
  // ---------------------------------------------------------------------------

  /**
   * Get connection health metrics for a world.
   * @param {Object} state
   * @param {string} worldId
   * @returns {Object}
   */
  function getConnectionHealth(state, worldId) {
    var world = state.worlds[worldId];
    if (!world) {
      return { worldId: worldId, status: 'unknown', latency: null, errorRate: null, syncFreshness: null };
    }

    // Compute error rate from recent health logs
    var recentLogs = state.healthLog.filter(function(h) {
      return h.worldId === worldId;
    }).slice(-20);

    var errorCount = 0;
    var totalLatency = 0;
    var latencySamples = 0;

    for (var i = 0; i < recentLogs.length; i++) {
      if (recentLogs[i].type === 'error') errorCount++;
      if (typeof recentLogs[i].latency === 'number') {
        totalLatency += recentLogs[i].latency;
        latencySamples++;
      }
    }

    var avgLatency = latencySamples > 0 ? Math.round(totalLatency / latencySamples) : world.latency || 0;
    var errorRate = recentLogs.length > 0 ? errorCount / recentLogs.length : 0;

    return {
      worldId: worldId,
      status: world.status,
      latency: avgLatency,
      errorRate: errorRate,
      errorCount: world.errorCount || 0,
      lastSync: world.lastSync,
      syncCounts: cloneDeep(world.syncCounts || {})
    };
  }

  /**
   * Get recent sync events for a world.
   * @param {Object} state
   * @param {string} worldId
   * @param {number} count  number of recent events to return
   * @returns {Array}
   */
  function getSyncHistory(state, worldId, count) {
    var n = count || 10;
    var filtered = state.syncLog.filter(function(e) {
      return !worldId || e.worldId === worldId;
    });
    return filtered.slice(-n).map(cloneDeep);
  }

  /**
   * Get global federation statistics.
   * @param {Object} state
   * @returns {Object}
   */
  function getFederationStats(state) {
    var worlds = Object.values(state.worlds);
    var connected = worlds.filter(function(w) { return w.status === 'connected'; }).length;
    var syncing = worlds.filter(function(w) { return w.status === 'syncing'; }).length;
    var disconnected = worlds.filter(function(w) { return w.status === 'disconnected'; }).length;
    var errored = worlds.filter(function(w) { return w.status === 'error'; }).length;

    var totalSyncEvents = state.syncLog.length;
    var unresolvedConflicts = state.conflicts.filter(function(c) { return !c.resolved; }).length;
    var rosterSize = Object.keys(state.roster).length;

    // Count total syncs per type
    var syncTypeStats = {};
    for (var i = 0; i < SYNC_TYPES.length; i++) {
      var typeId = SYNC_TYPES[i].id;
      var total = 0;
      for (var j = 0; j < worlds.length; j++) {
        total += (worlds[j].syncCounts && worlds[j].syncCounts[typeId]) || 0;
      }
      syncTypeStats[typeId] = total;
    }

    return {
      totalWorlds: worlds.length,
      connected: connected,
      syncing: syncing,
      disconnected: disconnected,
      errored: errored,
      totalSyncEvents: totalSyncEvents,
      unresolvedConflicts: unresolvedConflicts,
      rosterSize: rosterSize,
      syncTypeStats: syncTypeStats
    };
  }

  /**
   * Check if sync data for a world is stale.
   * @param {Object} state
   * @param {string} worldId
   * @param {number} currentTick
   * @returns {{stale: boolean, ticksSinceSync: number|null}}
   */
  function checkSyncFreshness(state, worldId, currentTick) {
    var tick = currentTick || 0;
    var world = state.worlds[worldId];
    if (!world) {
      return { stale: true, ticksSinceSync: null, error: 'World not found' };
    }
    if (world.lastSync === null || world.lastSync === undefined) {
      return { stale: true, ticksSinceSync: null };
    }
    var elapsed = tick - world.lastSync;
    var stale = elapsed > STALE_TICK_THRESHOLD;
    return { stale: stale, ticksSinceSync: elapsed };
  }

  // ---------------------------------------------------------------------------
  // Internal Logging
  // ---------------------------------------------------------------------------

  /**
   * Append a sync event to the log, trimming if needed.
   * @private
   */
  function _logSync(state, worldId, action, syncType, tick, data) {
    var entry = {
      id: generateId('log'),
      worldId: worldId,
      action: action,
      syncType: syncType || null,
      tick: tick,
      data: data || {},
      ts: Date.now()
    };
    state.syncLog.push(entry);

    // Trim log to avoid unbounded growth
    if (state.syncLog.length > MAX_SYNC_LOG) {
      state.syncLog = state.syncLog.slice(-MAX_SYNC_LOG);
    }
  }

  /**
   * Record a health monitoring event.
   * @private
   */
  function _logHealth(state, worldId, type, latency, data) {
    var entry = {
      worldId: worldId,
      type: type,
      latency: latency || 0,
      data: data || {},
      ts: Date.now()
    };
    state.healthLog.push(entry);
    if (state.healthLog.length > MAX_HEALTH_LOG) {
      state.healthLog = state.healthLog.slice(-MAX_HEALTH_LOG);
    }
  }

  // ---------------------------------------------------------------------------
  // Exports
  // ---------------------------------------------------------------------------

  exports.SYNC_TYPES = SYNC_TYPES;
  exports.CONNECTION_STATES = CONNECTION_STATES;
  exports.MAX_BATCH_SIZE = MAX_BATCH_SIZE;

  exports.createState = createState;

  exports.registerWorld = registerWorld;
  exports.removeWorld = removeWorld;
  exports.getWorld = getWorld;
  exports.getAllWorlds = getAllWorlds;

  exports.pushChanges = pushChanges;
  exports.pullChanges = pullChanges;

  exports.resolveConflict = resolveConflict;
  exports.getConflicts = getConflicts;

  exports.syncPlayerRoster = syncPlayerRoster;
  exports.getPlayerFederationId = getPlayerFederationId;
  exports.getTravelerBadges = getTravelerBadges;
  exports.awardTravelerBadge = awardTravelerBadge;

  exports.getVectorClock = getVectorClock;
  exports.updateVectorClock = updateVectorClock;

  exports.getConnectionHealth = getConnectionHealth;
  exports.getSyncHistory = getSyncHistory;
  exports.getFederationStats = getFederationStats;
  exports.checkSyncFreshness = checkSyncFreshness;

  // Export internal helpers for testing
  exports._logHealth = _logHealth;
  exports._advanceClock = _advanceClock;

})(typeof module !== 'undefined' ? module.exports : (window.FederationReplication = {}));
