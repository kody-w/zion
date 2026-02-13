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

  // Export public API
  exports.initMesh = initMesh;
  exports.broadcastMessage = broadcastMessage;
  exports.onMessage = onMessage;
  exports.getPeers = getPeers;
  exports.connectToPeer = connectToPeer;
  exports.disconnect = disconnect;
  exports.getLobbyPeerId = getLobbyPeerId;

})(typeof module !== 'undefined' ? module.exports : (window.Network = {}));
