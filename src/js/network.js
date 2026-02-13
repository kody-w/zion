(function(exports) {
  // PeerJS mesh networking
  let peer = null;
  let connections = new Map(); // peerId -> connection
  let messageCallback = null;
  let peerConnectCallback = null;
  let peerDisconnectCallback = null;
  let seenMessages = new Set(); // For deduplication
  const MAX_SEEN_MESSAGES = 1000;

  /**
   * Initialize PeerJS mesh network
   * @param {string} peerId - Unique peer ID for this client
   * @param {object} options - Configuration
   * @param {function} options.onMessage - Callback for incoming messages (msg)
   * @param {function} options.onPeerConnect - Callback when peer connects (peerId)
   * @param {function} options.onPeerDisconnect - Callback when peer disconnects (peerId)
   */
  function initMesh(peerId, options = {}) {
    // Check if PeerJS is available
    if (typeof Peer === 'undefined') {
      console.warn('PeerJS not available. Network mesh disabled.');
      return null;
    }

    messageCallback = options.onMessage || (() => {});
    peerConnectCallback = options.onPeerConnect || (() => {});
    peerDisconnectCallback = options.onPeerDisconnect || (() => {});

    // Create peer with optional config
    peer = new Peer(peerId, {
      debug: 2 // Set to 3 for verbose logging
    });

    peer.on('open', (id) => {
      console.log('Mesh network initialized. Peer ID:', id);
    });

    peer.on('connection', (conn) => {
      handleConnection(conn);
    });

    peer.on('error', (err) => {
      console.error('Peer error:', err);
      // Auto-reconnect on certain errors
      if (err.type === 'peer-unavailable' || err.type === 'network') {
        attemptReconnect(peerId, 0);
      }
    });

    peer.on('disconnected', () => {
      console.warn('Peer disconnected from signaling server');
      attemptReconnect(peerId, 0);
    });

    return peer;
  }

  /**
   * Handle incoming connection
   * @param {DataConnection} conn
   */
  function handleConnection(conn) {
    const remotePeerId = conn.peer;

    conn.on('open', () => {
      console.log('Connected to peer:', remotePeerId);
      connections.set(remotePeerId, conn);
      peerConnectCallback(remotePeerId);
    });

    conn.on('data', (data) => {
      handleIncomingMessage(data, remotePeerId);
    });

    conn.on('close', () => {
      console.log('Peer disconnected:', remotePeerId);
      connections.delete(remotePeerId);
      peerDisconnectCallback(remotePeerId);
    });

    conn.on('error', (err) => {
      console.error('Connection error with peer', remotePeerId, ':', err);
      connections.delete(remotePeerId);
      peerDisconnectCallback(remotePeerId);
    });
  }

  /**
   * Handle incoming message with deduplication
   * @param {object} data
   * @param {string} fromPeer
   */
  function handleIncomingMessage(data, fromPeer) {
    try {
      const msg = typeof data === 'string' ? JSON.parse(data) : data;

      // Generate message ID for deduplication
      const msgId = generateMessageId(msg);

      // Check if already seen
      if (seenMessages.has(msgId)) {
        return; // Duplicate, ignore
      }

      // Add to seen messages
      seenMessages.add(msgId);

      // Evict oldest if over limit
      if (seenMessages.size > MAX_SEEN_MESSAGES) {
        const firstItem = seenMessages.values().next().value;
        seenMessages.delete(firstItem);
      }

      // Relay to other peers (mesh propagation)
      relayMessage(msg, fromPeer);

      // Invoke callback
      messageCallback(msg);
    } catch (err) {
      console.error('Error handling message:', err);
    }
  }

  /**
   * Generate unique message ID for deduplication
   * @param {object} msg
   * @returns {string}
   */
  function generateMessageId(msg) {
    // Use message fields to create unique ID
    const str = JSON.stringify({
      type: msg.type,
      from: msg.from,
      timestamp: msg.timestamp,
      nonce: msg.nonce
    });
    return simpleHash(str);
  }

  /**
   * Simple hash function
   * @param {string} str
   * @returns {string}
   */
  function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Relay message to all peers except sender
   * @param {object} msg
   * @param {string} excludePeer
   */
  function relayMessage(msg, excludePeer) {
    connections.forEach((conn, peerId) => {
      if (peerId !== excludePeer && conn.open) {
        try {
          conn.send(msg);
        } catch (err) {
          console.error('Error relaying to peer', peerId, ':', err);
        }
      }
    });
  }

  /**
   * Broadcast message to all connected peers
   * @param {object} msg - Message object (will be JSON serialized)
   */
  function broadcastMessage(msg) {
    if (!peer) {
      console.warn('Peer not initialized');
      return;
    }

    // Add to seen messages to prevent echo
    const msgId = generateMessageId(msg);
    seenMessages.add(msgId);

    connections.forEach((conn, peerId) => {
      if (conn.open) {
        try {
          conn.send(msg);
        } catch (err) {
          console.error('Error sending to peer', peerId, ':', err);
        }
      }
    });
  }

  /**
   * Register message handler
   * @param {function} callback
   */
  function onMessage(callback) {
    messageCallback = callback;
  }

  /**
   * Get list of connected peer IDs
   * @returns {string[]}
   */
  function getPeers() {
    return Array.from(connections.keys());
  }

  /**
   * Connect to a specific peer
   * @param {string} peerId
   */
  function connectToPeer(peerId) {
    if (!peer) {
      console.warn('Peer not initialized');
      return;
    }

    if (connections.has(peerId)) {
      console.log('Already connected to peer:', peerId);
      return;
    }

    console.log('Connecting to peer:', peerId);
    const conn = peer.connect(peerId, {
      reliable: true
    });

    handleConnection(conn);
  }

  /**
   * Disconnect from all peers and destroy peer
   */
  function disconnect() {
    if (!peer) return;

    connections.forEach((conn) => {
      conn.close();
    });

    connections.clear();
    peer.destroy();
    peer = null;

    console.log('Disconnected from mesh network');
  }

  /**
   * Attempt to reconnect with exponential backoff
   * @param {string} peerId
   * @param {number} attempt
   */
  function attemptReconnect(peerId, attempt) {
    const maxAttempts = 3;
    if (attempt >= maxAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    const delay = Math.pow(2, attempt) * 1000; // Exponential: 1s, 2s, 4s
    console.log(`Reconnecting in ${delay}ms (attempt ${attempt + 1}/${maxAttempts})`);

    setTimeout(() => {
      if (!peer || peer.destroyed) {
        console.log('Attempting to reconnect...');
        peer.reconnect();

        // Check if reconnection succeeded after 2 seconds
        setTimeout(() => {
          if (peer && !peer.open) {
            attemptReconnect(peerId, attempt + 1);
          }
        }, 2000);
      }
    }, delay);
  }

  /**
   * Generate lobby peer ID from world ID
   * @param {string} worldId - World identifier (default: 'main')
   * @returns {string}
   */
  function getLobbyPeerId(worldId = 'main') {
    return `zion-lobby-${worldId}`;
  }

  // ========================================================================
  // LOBBY SYSTEM — Automatic peer discovery
  // ========================================================================

  var lobbyState = {
    peerId: null,
    worldId: 'main',
    discoveryInterval: null,
    knownPeers: [],       // All peer IDs ever seen
    heartbeatInterval: null,
    playerName: '',
    zone: 'nexus',
    lastAnnounce: 0
  };

  /**
   * Join the world lobby for automatic peer discovery.
   * Uses a well-known lobby peer ID that the first player to join becomes.
   * Others connect to the lobby peer and receive the full peer list.
   */
  function joinLobby(worldId, playerName, zone) {
    lobbyState.worldId = worldId || 'main';
    lobbyState.playerName = playerName || 'Anonymous';
    lobbyState.zone = zone || 'nexus';

    if (!peer) return;

    lobbyState.peerId = peer.id;

    // Try connecting to the lobby peer
    var lobbyId = getLobbyPeerId(lobbyState.worldId);

    if (peer.id !== lobbyId) {
      // Not the lobby — try connecting to it
      connectToPeer(lobbyId);
    }

    // Also try a list of "seed" peer IDs derived from the world
    // This creates a gossip-based discovery pattern
    var seedCount = 5;
    for (var i = 0; i < seedCount; i++) {
      var seedId = 'zion-seed-' + lobbyState.worldId + '-' + i;
      if (seedId !== peer.id) {
        connectToPeer(seedId);
      }
    }

    // Periodically announce presence and discover peers
    if (lobbyState.discoveryInterval) {
      clearInterval(lobbyState.discoveryInterval);
    }

    lobbyState.discoveryInterval = setInterval(function() {
      announcePresence();
    }, 10000); // Every 10 seconds

    // Start heartbeat
    if (lobbyState.heartbeatInterval) {
      clearInterval(lobbyState.heartbeatInterval);
    }

    lobbyState.heartbeatInterval = setInterval(function() {
      sendHeartbeat();
    }, 30000); // Every 30 seconds

    // Initial announce
    announcePresence();
  }

  function announcePresence() {
    if (!peer || !peer.open) return;

    var announcement = {
      type: '_lobby_announce',
      peerId: peer.id,
      playerName: lobbyState.playerName,
      zone: lobbyState.zone,
      peers: getPeers(), // Share our peer list for gossip
      timestamp: Date.now()
    };

    broadcastMessage(announcement);
    lobbyState.lastAnnounce = Date.now();
  }

  function sendHeartbeat() {
    if (!peer || !peer.open) return;

    broadcastMessage({
      type: '_heartbeat',
      peerId: peer.id,
      zone: lobbyState.zone,
      peerCount: connections.size,
      timestamp: Date.now()
    });
  }

  /**
   * Handle lobby-specific messages (called from handleIncomingMessage)
   */
  function handleLobbyMessage(msg) {
    if (!msg || !msg.type) return false;

    if (msg.type === '_lobby_announce') {
      // Someone announced — connect to their known peers
      if (msg.peers && Array.isArray(msg.peers)) {
        msg.peers.forEach(function(peerId) {
          if (peerId !== peer.id && !connections.has(peerId)) {
            // Track known peer
            if (lobbyState.knownPeers.indexOf(peerId) === -1) {
              lobbyState.knownPeers.push(peerId);
            }
            // Try connecting if we have room
            if (connections.size < 20) {
              connectToPeer(peerId);
            }
          }
        });
      }
      return true; // Handled
    }

    if (msg.type === '_heartbeat') {
      // Update known peer activity
      return true; // Handled, don't propagate to game
    }

    if (msg.type === '_peer_list_request') {
      // Someone asking for our peer list
      broadcastMessage({
        type: '_lobby_announce',
        peerId: peer.id,
        playerName: lobbyState.playerName,
        zone: lobbyState.zone,
        peers: getPeers(),
        timestamp: Date.now()
      });
      return true;
    }

    return false; // Not a lobby message
  }

  function updateLobbyZone(zone) {
    lobbyState.zone = zone;
  }

  function leaveLobby() {
    if (lobbyState.discoveryInterval) {
      clearInterval(lobbyState.discoveryInterval);
      lobbyState.discoveryInterval = null;
    }
    if (lobbyState.heartbeatInterval) {
      clearInterval(lobbyState.heartbeatInterval);
      lobbyState.heartbeatInterval = null;
    }
  }

  function getNetworkStats() {
    return {
      peerId: peer ? peer.id : null,
      connected: peer ? peer.open : false,
      peerCount: connections.size,
      knownPeers: lobbyState.knownPeers.length,
      seenMessages: seenMessages.size
    };
  }

  // Export public API
  exports.initMesh = initMesh;
  exports.broadcastMessage = broadcastMessage;
  exports.onMessage = onMessage;
  exports.getPeers = getPeers;
  exports.connectToPeer = connectToPeer;
  exports.disconnect = disconnect;
  exports.getLobbyPeerId = getLobbyPeerId;
  exports.joinLobby = joinLobby;
  exports.leaveLobby = leaveLobby;
  exports.updateLobbyZone = updateLobbyZone;
  exports.handleLobbyMessage = handleLobbyMessage;
  exports.getNetworkStats = getNetworkStats;

})(typeof module !== 'undefined' ? module.exports : (window.Network = {}));
