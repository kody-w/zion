// federation.js — Federation Bridge for ZION (Article X of the Constitution)
// Implements §10.1-10.9: sovereign fork connections, cross-world travel, rift portals
(function(exports) {
  'use strict';

  // ─── Constants ─────────────────────────────────────────────────────────────

  var PROTOCOL_VERSION = 1;
  var FEDERATION_ANNOUNCE = 'federation_announce';
  var FEDERATION_HANDSHAKE = 'federation_handshake';
  var WARP_FORK = 'warp_fork';
  var RETURN_HOME = 'return_home';

  // Latency threshold (ms) below which connection is considered healthy
  var HEALTHY_LATENCY_THRESHOLD = 200;

  // ─── Internal State ────────────────────────────────────────────────────────

  // Active connections map: worldId → connection object
  var connections = {};

  // Visitor registry: players currently visiting THIS world from another fork
  var visitors = [];

  // Visiting registry: players from THIS world currently visiting another fork
  var visiting = [];

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0;
      var v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function now() {
    return new Date().toISOString();
  }

  /**
   * Build a minimal protocol message envelope.
   * All federation messages use platform='api' since they are server/bot originated.
   */
  function buildMessage(type, from, payload) {
    return {
      v: PROTOCOL_VERSION,
      id: generateUUID(),
      ts: now(),
      seq: 0,
      from: from || 'federation',
      type: type,
      platform: 'api',
      position: { x: 0, y: 0, z: 0, zone: 'nexus' },
      geo: null,
      payload: payload || {}
    };
  }

  // ─── Discovery & Handshake ─────────────────────────────────────────────────

  /**
   * Generate a federation_announce message advertising this world.
   * §10.2 step 1: Fork A sends federation_announce with world ID, protocol version, endpoint.
   *
   * @param {Object} worldConfig - {worldId, worldName, endpoint, protocolVersion, adminUser?}
   * @returns {Object} Protocol message of type federation_announce
   */
  function announce(worldConfig) {
    return buildMessage(FEDERATION_ANNOUNCE, worldConfig.adminUser || worldConfig.worldId, {
      worldId: worldConfig.worldId,
      worldName: worldConfig.worldName,
      endpoint: worldConfig.endpoint,
      protocolVersion: worldConfig.protocolVersion || PROTOCOL_VERSION,
      announcedAt: now()
    });
  }

  /**
   * Handle an incoming federation_announce message.
   * §10.2 step 2: Decides whether to accept the connection.
   *
   * @param {Object} message - Incoming federation_announce message
   * @param {string} [localWorldId] - This world's ID (to reject self-connections)
   * @returns {{accept: boolean, reason?: string}}
   */
  function handleAnnounce(message, localWorldId) {
    if (!message || !message.payload) {
      return { accept: false, reason: 'Invalid or missing announcement message' };
    }

    var p = message.payload;

    // Must be a federation_announce message
    if (message.type !== FEDERATION_ANNOUNCE) {
      return { accept: false, reason: 'Message is not a federation_announce' };
    }

    // Must have required fields
    if (!p.worldId || !p.worldName || !p.endpoint) {
      return { accept: false, reason: 'Missing required fields: worldId, worldName, or endpoint' };
    }

    // §10.9 No imperial fork — reject self-connections
    if (localWorldId && p.worldId === localWorldId) {
      return { accept: false, reason: 'Self-connection rejected: cannot federate with yourself' };
    }

    // §10.8 Protocol compatibility check
    var versionCheck = validateProtocolVersion(PROTOCOL_VERSION, p.protocolVersion);
    if (!versionCheck.compatible) {
      return { accept: false, reason: 'Protocol version incompatible: ' + versionCheck.reason };
    }

    return { accept: true };
  }

  /**
   * Generate a federation_handshake message accepting (or declining) a connection.
   * §10.2 step 3: Fork B sends federation_handshake.
   *
   * @param {string} targetWorldId - The remote world's ID
   * @param {Object} localConfig - This world's config
   * @param {Object} remoteConfig - Remote world's config (for validation)
   * @returns {Object} Protocol message of type federation_handshake
   */
  function handshake(targetWorldId, localConfig, remoteConfig) {
    var accepted = true;

    // Check protocol compatibility (§10.8)
    if (accepted && remoteConfig) {
      var versionCheck = validateProtocolVersion(
        localConfig.protocolVersion || PROTOCOL_VERSION,
        remoteConfig.protocolVersion || PROTOCOL_VERSION
      );
      if (!versionCheck.compatible) {
        accepted = false;
      }
    }

    return buildMessage(FEDERATION_HANDSHAKE, localConfig.adminUser || localConfig.worldId, {
      worldId: localConfig.worldId,
      worldName: localConfig.worldName,
      endpoint: localConfig.endpoint,
      protocolVersion: localConfig.protocolVersion || PROTOCOL_VERSION,
      targetWorldId: targetWorldId,
      accepted: accepted,
      handshakeAt: now()
    });
  }

  /**
   * Handle an incoming federation_handshake message.
   * If accepted, creates and registers a connection object.
   *
   * @param {Object} message - Incoming federation_handshake message
   * @param {Object} localConfig - This world's config
   * @returns {Object|null} Connection object, or null if not accepted
   */
  function handleHandshake(message, localConfig) {
    if (!message || !message.payload) {
      return null;
    }

    var p = message.payload;

    if (!p.accepted) {
      return null;
    }

    // §10.9 No imperial fork — reject self-connections at reception
    if (localConfig && p.worldId === localConfig.worldId) {
      return null;
    }

    // Build connection object
    var conn = {
      worldId: p.worldId,
      worldName: p.worldName,
      endpoint: p.endpoint,
      protocolVersion: p.protocolVersion || PROTOCOL_VERSION,
      status: 'active',
      connectedSince: now(),
      lastHeartbeat: now(),
      playerCount: 0,
      latency: 0
    };

    // Register the connection
    connections[conn.worldId] = conn;

    return conn;
  }

  // ─── Connection Management ─────────────────────────────────────────────────

  /**
   * Register or update a connection in the registry.
   * Handles duplicate connections by updating in place (§10.9 peer-to-peer equals).
   *
   * @param {Object} connObj - Connection data {worldId, worldName, endpoint, ...}
   */
  function connect(connObj) {
    if (!connObj || !connObj.worldId) {
      return;
    }
    // Update-in-place for duplicates
    connections[connObj.worldId] = Object.assign({}, connObj, {
      status: connObj.status || 'active'
    });
  }

  /**
   * Disconnect a world by worldId. Generates a leave message and marks as disconnected.
   *
   * @param {string} worldId
   * @returns {Object|null} Protocol message, or null if world was not connected
   */
  function disconnect(worldId) {
    if (!connections[worldId]) {
      return null;
    }

    var conn = connections[worldId];
    connections[worldId] = Object.assign({}, conn, { status: 'disconnected' });

    return buildMessage('leave', conn.worldId, {
      worldId: worldId,
      reason: 'federation_dissolved',
      disconnectedAt: now()
    });
  }

  /**
   * Returns all active (non-disconnected) connections.
   *
   * @returns {Array<{worldId, worldName, status, playerCount, latency}>}
   */
  function getConnections() {
    return Object.values(connections).filter(function(c) {
      return c.status === 'active';
    });
  }

  /**
   * Returns whether a world is currently actively connected.
   *
   * @param {string} worldId
   * @returns {boolean}
   */
  function isConnected(worldId) {
    return !!(connections[worldId] && connections[worldId].status === 'active');
  }

  // ─── Cross-World Travel (§10.3) ────────────────────────────────────────────

  /**
   * Prepare to travel to a federated fork.
   * Generates a warp_fork protocol message and a travelPack.
   *
   * TravelPack includes (§10.3): identity, reputation, appearance, intentions, skills
   * TravelPack EXCLUDES: inventory, spark, gardens, structures, steward status
   *
   * @param {string} worldId - Target fork's world ID
   * @param {Object} player - Player state object
   * @returns {{message: Object, travelPack: Object}}
   */
  function warpToFork(worldId, player) {
    // Build travelPack — only what travels per §10.3
    var travelPack = {
      username: player.username,
      homeWorld: player.homeWorld,
      reputation: player.reputation || 0,
      appearance: player.appearance ? JSON.parse(JSON.stringify(player.appearance)) : {},
      intentions: player.intentions ? JSON.parse(JSON.stringify(player.intentions)) : [],
      skills: player.skills ? JSON.parse(JSON.stringify(player.skills)) : [],
      travelerMarks: player.travelerMarks ? JSON.parse(JSON.stringify(player.travelerMarks)) : [],
      departedAt: now()
    };

    var message = buildMessage(WARP_FORK, player.username, {
      fork_id: worldId,
      destination_zone: 'nexus',   // §10.4 visitors start in Nexus
      travelPack: travelPack
    });

    return { message: message, travelPack: travelPack };
  }

  /**
   * Handle a player arriving from a fork.
   * Creates a local visitor player state in the visited world.
   *
   * @param {Object} travelPack - The travelPack from warpToFork
   * @returns {Object} Visitor player state for the visited world
   */
  function arriveFromFork(travelPack) {
    var visitor = {
      username: travelPack.username,
      homeWorld: travelPack.homeWorld,
      reputation: travelPack.reputation || 0,
      appearance: travelPack.appearance ? JSON.parse(JSON.stringify(travelPack.appearance)) : {},
      intentions: travelPack.intentions ? JSON.parse(JSON.stringify(travelPack.intentions)) : [],
      skills: travelPack.skills ? JSON.parse(JSON.stringify(travelPack.skills)) : [],
      travelerMarks: travelPack.travelerMarks ? JSON.parse(JSON.stringify(travelPack.travelerMarks)) : [],
      // Visitor-specific state
      isVisitor: true,
      arrivedAt: now(),
      inventory: [],      // arrive with empty hands (§10.3)
      spark: 0,           // currency is sovereign (§10.3)
      isSteward: false,   // governance is local (§10.3)
      // Start in nexus (§10.4)
      position: { x: 0, y: 0, z: 0, zone: 'nexus' }
    };

    return visitor;
  }

  /**
   * Generate a return_home protocol message for a visiting player.
   * §10.4: A visitor can return_home at any time.
   *
   * @param {Object} player - Visiting player state
   * @returns {Object} Protocol message of type return_home
   */
  function returnHome(player) {
    return buildMessage(RETURN_HOME, player.username, {
      homeWorld: player.homeWorld,
      departedAt: now()
    });
  }

  // ─── Visitor Management (§10.4) ────────────────────────────────────────────

  /**
   * Register an arriving visitor into the local visitor registry.
   *
   * @param {Object} visitor - Visitor state (from arriveFromFork)
   */
  function registerVisitor(visitor) {
    // Remove any existing entry for this visitor
    visitors = visitors.filter(function(v) { return v.username !== visitor.username; });
    visitors.push({
      username: visitor.username,
      homeWorld: visitor.homeWorld,
      arrivedAt: visitor.arrivedAt || now()
    });
  }

  /**
   * Returns all players currently visiting THIS world from other forks.
   *
   * @returns {Array<{username, homeWorld, arrivedAt}>}
   */
  function getVisitors() {
    return visitors.slice();
  }

  /**
   * Returns all players from THIS world who are currently visiting other forks.
   *
   * @returns {Array<{username, visitingWorld, departedAt}>}
   */
  function getVisiting() {
    return visiting.slice();
  }

  // ─── Rift Portal (§10.5) ───────────────────────────────────────────────────

  /**
   * Create a Rift Portal object representing a federation connection's portal in the Nexus.
   * §10.5: Displays world name, player count, latency indicator, description.
   *
   * @param {Object} connection - Connection data
   * @returns {Object} Portal display data
   */
  function createRiftPortal(connection) {
    var healthy = (connection.latency || 0) < HEALTHY_LATENCY_THRESHOLD && connection.status === 'active';

    return {
      worldId: connection.worldId,
      worldName: connection.worldName,
      playerCount: connection.playerCount || 0,
      latency: connection.latency || 0,
      healthy: healthy,
      description: connection.description || '',
      position: {
        x: 0, y: 0, z: -20,    // Rift portals placed at Nexus center near the hub
        zone: 'nexus'
      },
      type: 'rift_portal',
      createdAt: now()
    };
  }

  /**
   * Update portal data from a connection (e.g. after heartbeat).
   *
   * @param {Object} connection - Updated connection data
   * @returns {Object} Updated portal display data
   */
  function updateRiftPortal(connection) {
    return createRiftPortal(connection);
  }

  // ─── Registry (§10.7) ──────────────────────────────────────────────────────

  /**
   * Load and parse the federation.json registry.
   *
   * @param {Object} federationJson - Parsed federation.json contents
   * @returns {Object} Parsed registry with federations array
   */
  function loadRegistry(federationJson) {
    if (!federationJson) {
      return { worldId: '', worldName: '', federations: [], discoveredWorlds: [] };
    }

    return {
      worldId: federationJson.worldId || '',
      worldName: federationJson.worldName || '',
      endpoint: federationJson.endpoint || '',
      protocolVersion: federationJson.protocolVersion || PROTOCOL_VERSION,
      federations: (federationJson.federations || []).map(function(f) {
        return {
          worldId: f.worldId,
          worldName: f.worldName,
          endpoint: f.endpoint,
          protocolVersion: f.protocolVersion || PROTOCOL_VERSION,
          federatedSince: f.federatedSince || null,
          status: f.status || 'unknown',
          playerCount: f.playerCount || 0,
          lastHeartbeat: f.lastHeartbeat || null
        };
      }),
      discoveredWorlds: federationJson.discoveredWorlds || [],
      lastAnnounce: federationJson.lastAnnounce || null
    };
  }

  /**
   * Serialize active connections into the federation.json registry shape.
   * §10.7: The Multiverse Registry is a public JSON file.
   *
   * @param {Array} activeConnections - Array of connection objects
   * @returns {Object} Updated federation JSON object
   */
  function updateRegistry(activeConnections) {
    return {
      federations: (activeConnections || []).map(function(conn) {
        return {
          worldId: conn.worldId,
          worldName: conn.worldName,
          endpoint: conn.endpoint,
          protocolVersion: conn.protocolVersion || PROTOCOL_VERSION,
          federatedSince: conn.connectedSince || null,
          status: conn.status || 'active',
          playerCount: conn.playerCount || 0,
          lastHeartbeat: conn.lastHeartbeat || null
        };
      }),
      updatedAt: now()
    };
  }

  /**
   * Returns all worlds with status 'active' from the internal connections registry.
   *
   * @returns {Array<{worldId, worldName, endpoint, status, playerCount}>}
   */
  function getActiveWorlds() {
    return getConnections().map(function(conn) {
      return {
        worldId: conn.worldId,
        worldName: conn.worldName,
        endpoint: conn.endpoint,
        status: conn.status,
        playerCount: conn.playerCount || 0
      };
    });
  }

  // ─── Validation (§10.8) ────────────────────────────────────────────────────

  /**
   * Check whether two protocol versions are compatible.
   * §10.8: Incompatible forks cannot federate.
   * For now, exact major version match is required.
   *
   * @param {number} local - Local protocol version
   * @param {number} remote - Remote protocol version
   * @returns {{compatible: boolean, reason?: string}}
   */
  function validateProtocolVersion(local, remote) {
    if (!remote || remote <= 0) {
      return { compatible: false, reason: 'Remote protocol version is missing or invalid (got ' + remote + ')' };
    }

    if (!local || local <= 0) {
      return { compatible: false, reason: 'Local protocol version is missing or invalid (got ' + local + ')' };
    }

    if (local !== remote) {
      return {
        compatible: false,
        reason: 'Protocol version mismatch: local=' + local + ', remote=' + remote
      };
    }

    return { compatible: true };
  }

  /**
   * Validate an incoming federation request message (announce or handshake).
   * §10.8: Both worlds must speak the same protocol.
   *
   * @param {Object} message - Incoming protocol message
   * @param {Object} localConfig - This world's config
   * @returns {{valid: boolean, reason?: string}}
   */
  function validateFederationRequest(message, localConfig) {
    if (!message || typeof message !== 'object') {
      return { valid: false, reason: 'Message must be an object' };
    }

    // Must be a federation message type
    if (message.type !== FEDERATION_ANNOUNCE && message.type !== FEDERATION_HANDSHAKE) {
      return {
        valid: false,
        reason: 'Message type must be federation_announce or federation_handshake, got: ' + message.type
      };
    }

    // Payload must exist and have worldId
    if (!message.payload || !message.payload.worldId) {
      return { valid: false, reason: 'Payload must include worldId' };
    }

    // Protocol version must be compatible (§10.8)
    var versionCheck = validateProtocolVersion(
      (localConfig && localConfig.protocolVersion) || PROTOCOL_VERSION,
      message.payload.protocolVersion
    );
    if (!versionCheck.compatible) {
      return { valid: false, reason: 'Protocol incompatible: ' + versionCheck.reason };
    }

    return { valid: true };
  }

  // ─── State Export ──────────────────────────────────────────────────────────

  /**
   * Return a serializable snapshot of the federation module state.
   * Useful for persistence and debugging.
   *
   * @returns {Object} Serializable state
   */
  function getState() {
    return {
      connections: JSON.parse(JSON.stringify(connections)),
      visitors: JSON.parse(JSON.stringify(visitors)),
      visiting: JSON.parse(JSON.stringify(visiting))
    };
  }

  // ─── Exports ───────────────────────────────────────────────────────────────

  exports.PROTOCOL_VERSION = PROTOCOL_VERSION;

  // Discovery & Handshake
  exports.announce = announce;
  exports.handleAnnounce = handleAnnounce;
  exports.handshake = handshake;
  exports.handleHandshake = handleHandshake;

  // Connection Management
  exports.connect = connect;
  exports.disconnect = disconnect;
  exports.getConnections = getConnections;
  exports.isConnected = isConnected;

  // Cross-World Travel (§10.3)
  exports.warpToFork = warpToFork;
  exports.arriveFromFork = arriveFromFork;
  exports.returnHome = returnHome;

  // Visitor Management (§10.4)
  exports.registerVisitor = registerVisitor;
  exports.getVisitors = getVisitors;
  exports.getVisiting = getVisiting;

  // Rift Portal (§10.5)
  exports.createRiftPortal = createRiftPortal;
  exports.updateRiftPortal = updateRiftPortal;

  // Registry (§10.7)
  exports.loadRegistry = loadRegistry;
  exports.updateRegistry = updateRegistry;
  exports.getActiveWorlds = getActiveWorlds;

  // Validation (§10.8)
  exports.validateProtocolVersion = validateProtocolVersion;
  exports.validateFederationRequest = validateFederationRequest;

  // State
  exports.getState = getState;

})(typeof module !== 'undefined' ? module.exports : (window.Federation = {}));
