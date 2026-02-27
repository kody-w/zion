#!/usr/bin/env node
// peer-host.js — Always-on ZION lobby host
//
// Runs as a headless Node.js process that:
// 1. Connects to PeerJS signaling server as 'zion-lobby-main'
// 2. Accepts WebRTC data channel connections from browser clients
// 3. Relays protocol messages between all connected peers
// 4. Maintains canonical world state
// 5. Runs AI citizen heartbeats
//
// Usage:
//   cd cli && npm install && node peer-host.js [--world main] [--ascii]
//
// This makes ZION "always on" — browser clients find the lobby
// host and join the mesh without needing another browser open.

'use strict';

var fs = require('fs');
var path = require('path');
var WebSocket = require('ws');
var nodeDatachannel = require('node-datachannel');

// Load ZION modules
var Protocol = require(path.join(__dirname, '..', 'src', 'js', 'protocol.js'));
var Zones = require(path.join(__dirname, '..', 'src', 'js', 'zones.js'));
var StateModule = require(path.join(__dirname, '..', 'src', 'js', 'state.js'));

var ROOT = path.join(__dirname, '..');

// ========================================================================
// CONFIG
// ========================================================================

var args = process.argv.slice(2);
var worldId = 'main';
var asciiMode = false;
var Renderer = null;

for (var i = 0; i < args.length; i++) {
  if (args[i] === '--world' && args[i + 1]) { worldId = args[i + 1]; i++; }
  if (args[i] === '--ascii') { asciiMode = true; }
}

if (asciiMode) {
  try { Renderer = require(path.join(__dirname, 'renderer.js')); } catch(e) {}
}

var LOBBY_PEER_ID = 'zion-lobby-' + worldId;
var PEERJS_HOST = '0.peerjs.com';
var PEERJS_PORT = 443;
var PEERJS_PATH = '/';
var PEERJS_KEY = 'peerjs';

// ICE servers for WebRTC
var ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];

// ========================================================================
// STATE
// ========================================================================

function loadJsonSafe(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch(e) { return null; }
}

function loadWorldState() {
  var state = StateModule.createWorldState();
  var w = loadJsonSafe(path.join(ROOT, 'state', 'world.json'));
  if (w) state.world = Object.assign(state.world, { zones: w.zones || {} });
  var p = loadJsonSafe(path.join(ROOT, 'state', 'players.json'));
  if (p && p.players) state.players = p.players;
  var s = loadJsonSafe(path.join(ROOT, 'state', 'structures.json'));
  if (s && s.structures) state.structures = s.structures;
  var c = loadJsonSafe(path.join(ROOT, 'state', 'chat.json'));
  if (c && c.messages) state.chat = c.messages;
  return state;
}

var host = {
  peerId: LOBBY_PEER_ID,
  state: loadWorldState(),
  ws: null,
  token: Math.random().toString(36).slice(2),
  peers: new Map(),       // peerId -> { pc, dc, info }
  seenMessages: new Map(),
  messageCount: 0,
  running: true
};

// ========================================================================
// PEERJS SIGNALING — WebSocket connection to PeerJS cloud
// ========================================================================

function connectSignaling() {
  var url = 'wss://' + PEERJS_HOST + ':' + PEERJS_PORT + PEERJS_PATH +
    'peerjs?key=' + PEERJS_KEY + '&id=' + host.peerId + '&token=' + host.token + '&version=1.5.4';

  log('Connecting to PeerJS signaling server...');
  log('Peer ID: ' + host.peerId);

  host.ws = new WebSocket(url);

  host.ws.on('open', function() {
    log('WebSocket connected to signaling server');
    startHeartbeat();
  });

  host.ws.on('message', function(data) {
    try {
      var msg = JSON.parse(data.toString());
      handleSignalingMessage(msg);
    } catch(e) {
      log('Invalid signaling message: ' + e.message);
    }
  });

  host.ws.on('close', function() {
    log('Signaling connection closed. Reconnecting in 5s...');
    setTimeout(connectSignaling, 5000);
  });

  host.ws.on('error', function(err) {
    log('Signaling error: ' + (err.message || err));
  });
}

function sendSignaling(msg) {
  if (host.ws && host.ws.readyState === WebSocket.OPEN) {
    host.ws.send(JSON.stringify(msg));
  }
}

function startHeartbeat() {
  setInterval(function() {
    sendSignaling({ type: 'HEARTBEAT' });
  }, 25000);
}

// ========================================================================
// SIGNALING MESSAGE HANDLING
// ========================================================================

function handleSignalingMessage(msg) {
  switch (msg.type) {
    case 'OPEN':
      log('✓ Registered as ' + host.peerId + ' on PeerJS signaling server');
      log('Browser clients can now find and connect to this lobby.');
      break;

    case 'OFFER':
      handleOffer(msg);
      break;

    case 'ANSWER':
      handleAnswer(msg);
      break;

    case 'CANDIDATE':
      handleCandidate(msg);
      break;

    case 'LEAVE':
      handlePeerLeave(msg.src);
      break;

    case 'ID-TAKEN':
      log('ERROR: Peer ID "' + host.peerId + '" is already taken!');
      log('Another lobby host may be running. Trying alternative ID...');
      host.peerId = LOBBY_PEER_ID + '-' + Date.now();
      host.ws.close();
      setTimeout(connectSignaling, 2000);
      break;

    case 'ERROR':
      log('Server error: ' + JSON.stringify(msg.payload));
      break;

    case 'EXPIRE':
      log('Peer expired: ' + msg.src);
      break;

    default:
      // Ignore heartbeat responses etc.
      break;
  }
}

// ========================================================================
// WEBRTC CONNECTION HANDLING
// ========================================================================

function handleOffer(msg) {
  var remotePeerId = msg.src;
  var payload = msg.payload;
  var connectionId = payload.connectionId;

  log('Incoming connection from: ' + remotePeerId);

  // Create WebRTC peer connection using node-datachannel
  var pc = new nodeDatachannel.PeerConnection(remotePeerId, {
    iceServers: ['stun:stun.l.google.com:19302']
  });

  var peerInfo = {
    pc: pc,
    dc: null,
    connectionId: connectionId,
    remotePeerId: remotePeerId,
    connected: false
  };

  host.peers.set(remotePeerId, peerInfo);

  // Handle ICE candidates from our side
  pc.onLocalCandidate(function(candidate, mid) {
    sendSignaling({
      type: 'CANDIDATE',
      payload: {
        candidate: { candidate: candidate, sdpMid: mid, sdpMLineIndex: 0 },
        type: 'data',
        connectionId: connectionId
      },
      dst: remotePeerId
    });
  });

  pc.onLocalDescription(function(sdp, type) {
    sendSignaling({
      type: 'ANSWER',
      payload: {
        sdp: { sdp: sdp, type: type },
        type: 'data',
        connectionId: connectionId
      },
      dst: remotePeerId
    });
  });

  pc.onStateChange(function(state) {
    log('Connection state with ' + remotePeerId + ': ' + state);
    if (state === 'closed' || state === 'failed') {
      handlePeerLeave(remotePeerId);
    }
  });

  pc.onDataChannel(function(dc) {
    log('Data channel opened with: ' + remotePeerId);
    peerInfo.dc = dc;
    peerInfo.connected = true;

    dc.onMessage(function(data) {
      handlePeerMessage(remotePeerId, data);
    });

    dc.onClosed(function() {
      log('Data channel closed: ' + remotePeerId);
      handlePeerLeave(remotePeerId);
    });

    // Send welcome state to new peer
    sendToPeer(remotePeerId, {
      type: '_lobby_announce',
      peerId: host.peerId,
      playerName: 'ZION Lobby',
      zone: 'nexus',
      peers: getConnectedPeerIds(),
      timestamp: Date.now()
    });

    logStatus();
  });

  // Set remote description (the offer)
  try {
    if (payload.sdp && payload.sdp.sdp) {
      pc.setRemoteDescription(payload.sdp.sdp, payload.sdp.type || 'offer');
    }
  } catch(e) {
    log('Error setting remote description: ' + e.message);
  }
}

function handleAnswer(msg) {
  var remotePeerId = msg.src;
  var payload = msg.payload;
  var peer = host.peers.get(remotePeerId);

  if (peer && peer.pc) {
    try {
      peer.pc.setRemoteDescription(payload.sdp.sdp, payload.sdp.type || 'answer');
    } catch(e) {
      log('Error handling answer: ' + e.message);
    }
  }
}

function handleCandidate(msg) {
  var remotePeerId = msg.src;
  var payload = msg.payload;
  var peer = host.peers.get(remotePeerId);

  if (peer && peer.pc && payload.candidate) {
    try {
      peer.pc.addRemoteCandidate(
        payload.candidate.candidate,
        payload.candidate.sdpMid || '0'
      );
    } catch(e) {
      log('Error adding candidate: ' + e.message);
    }
  }
}

function handlePeerLeave(remotePeerId) {
  var peer = host.peers.get(remotePeerId);
  if (peer) {
    log('Peer disconnected: ' + remotePeerId);
    try { if (peer.dc) peer.dc.close(); } catch(e) {}
    try { if (peer.pc) peer.pc.close(); } catch(e) {}
    host.peers.delete(remotePeerId);
    logStatus();
  }
}

// ========================================================================
// MESSAGE RELAY
// ========================================================================

function handlePeerMessage(fromPeer, data) {
  try {
    var msg = typeof data === 'string' ? JSON.parse(data) : data;

    // Deduplication
    var msgKey = JSON.stringify({ t: msg.type, f: msg.from, ts: msg.timestamp || msg.ts });
    if (host.seenMessages.has(msgKey)) return;
    host.seenMessages.set(msgKey, Date.now());
    host.messageCount++;

    // Evict old messages
    if (host.seenMessages.size > 5000) {
      var now = Date.now();
      for (var [k, v] of host.seenMessages) {
        if (now - v > 60000) host.seenMessages.delete(k);
      }
    }

    // Handle lobby messages
    if (msg.type === '_lobby_announce' || msg.type === '_heartbeat' || msg.type === '_peer_list_request') {
      if (msg.type === '_peer_list_request' || msg.type === '_lobby_announce') {
        // Respond with our peer list
        broadcastToAll({
          type: '_lobby_announce',
          peerId: host.peerId,
          playerName: 'ZION Lobby Host',
          zone: 'nexus',
          peers: getConnectedPeerIds(),
          timestamp: Date.now()
        }, fromPeer);
      }
      return;
    }

    // Relay game messages to all other peers
    relayToOthers(msg, fromPeer);

    // Apply to local state (for tracking)
    applyToState(msg);

    // Log activity
    if (msg.type === 'say' || msg.type === 'shout') {
      log('[chat] ' + (msg.from || '?') + ': ' + (msg.payload ? msg.payload.message : ''));
    } else if (msg.type === 'join') {
      log('[join] ' + (msg.from || '?'));
    } else if (msg.type === 'leave') {
      log('[leave] ' + (msg.from || '?'));
    }

  } catch(e) {
    log('Error handling message from ' + fromPeer + ': ' + e.message);
  }
}

function sendToPeer(peerId, msg) {
  var peer = host.peers.get(peerId);
  if (peer && peer.dc && peer.connected) {
    try {
      peer.dc.sendMessage(JSON.stringify(msg));
    } catch(e) {
      log('Error sending to ' + peerId + ': ' + e.message);
    }
  }
}

function relayToOthers(msg, excludePeer) {
  var data = JSON.stringify(msg);
  for (var [peerId, peer] of host.peers) {
    if (peerId !== excludePeer && peer.dc && peer.connected) {
      try { peer.dc.sendMessage(data); } catch(e) {}
    }
  }
}

function broadcastToAll(msg, excludePeer) {
  var data = JSON.stringify(msg);
  for (var [peerId, peer] of host.peers) {
    if (peerId !== excludePeer && peer.dc && peer.connected) {
      try { peer.dc.sendMessage(data); } catch(e) {}
    }
  }
}

function getConnectedPeerIds() {
  var ids = [host.peerId];
  for (var [peerId, peer] of host.peers) {
    if (peer.connected) ids.push(peerId);
  }
  return ids;
}

// ========================================================================
// STATE TRACKING
// ========================================================================

function applyToState(msg) {
  if (!msg || !msg.from) return;

  if (msg.type === 'move' && msg.payload && msg.payload.position) {
    if (!host.state.players[msg.from]) host.state.players[msg.from] = {};
    host.state.players[msg.from].position = msg.payload.position;
  }

  if (msg.type === 'join') {
    if (!host.state.players[msg.from]) {
      host.state.players[msg.from] = {
        position: msg.position || { x: 0, y: 0, z: 0, zone: 'nexus' },
        joinedAt: msg.ts || new Date().toISOString(),
        platform: msg.platform || 'desktop'
      };
    }
  }

  if (msg.type === 'leave') {
    delete host.state.players[msg.from];
  }

  if (msg.type === 'say' || msg.type === 'shout') {
    if (!host.state.chat) host.state.chat = [];
    host.state.chat.push({
      from: msg.from,
      text: msg.payload ? msg.payload.message : '',
      ts: msg.ts || new Date().toISOString()
    });
    if (host.state.chat.length > 100) host.state.chat = host.state.chat.slice(-100);
  }
}

// ========================================================================
// LOGGING
// ========================================================================

function log(msg) {
  var ts = new Date().toISOString().substr(11, 8);
  console.log('[' + ts + '] ' + msg);
}

function logStatus() {
  var connected = 0;
  for (var [, peer] of host.peers) { if (peer.connected) connected++; }
  var totalPlayers = Object.keys(host.state.players).length;
  log('Status: ' + connected + ' peers connected, ' + totalPlayers + ' players in world, ' +
    host.messageCount + ' messages relayed');
}

// ========================================================================
// PERIODIC TASKS
// ========================================================================

function startPeriodicTasks() {
  // Status report every 30s
  setInterval(function() {
    logStatus();
  }, 30000);

  // Broadcast lobby announce every 10s (peer discovery)
  setInterval(function() {
    broadcastToAll({
      type: '_lobby_announce',
      peerId: host.peerId,
      playerName: 'ZION Lobby Host',
      zone: 'nexus',
      peers: getConnectedPeerIds(),
      timestamp: Date.now()
    });
  }, 10000);

  // Heartbeat for AI citizens every 60s
  setInterval(function() {
    var aiPlayers = Object.keys(host.state.players).filter(function(id) {
      return id.startsWith('agent_');
    });
    if (aiPlayers.length > 0) {
      var agent = aiPlayers[Math.floor(Math.random() * aiPlayers.length)];
      var msg = Protocol.createMessage('heartbeat', agent, {}, {
        platform: 'api',
        position: host.state.players[agent].position || { x: 0, y: 0, z: 0, zone: 'nexus' }
      });
      broadcastToAll(msg);
    }
  }, 60000);
}

// ========================================================================
// MAIN
// ========================================================================

function main() {
  console.log('');
  console.log('  ╔══════════════════════════════════════════╗');
  console.log('  ║     ZION Always-On Lobby Host            ║');
  console.log('  ╠══════════════════════════════════════════╣');
  console.log('  ║  World: ' + worldId.padEnd(33) + '║');
  console.log('  ║  Peer ID: ' + host.peerId.padEnd(31) + '║');
  console.log('  ║  Players loaded: ' + String(Object.keys(host.state.players).length).padEnd(24) + '║');
  console.log('  ╚══════════════════════════════════════════╝');
  console.log('');

  connectSignaling();
  startPeriodicTasks();

  // Graceful shutdown
  process.on('SIGINT', function() {
    log('Shutting down lobby host...');
    for (var [peerId] of host.peers) handlePeerLeave(peerId);
    if (host.ws) host.ws.close();
    process.exit(0);
  });
  process.on('SIGTERM', function() {
    process.emit('SIGINT');
  });
}

main();

// Export for testing
module.exports = {
  host: host,
  handlePeerMessage: handlePeerMessage,
  applyToState: applyToState,
  getConnectedPeerIds: getConnectedPeerIds,
  sendToPeer: sendToPeer,
  LOBBY_PEER_ID: LOBBY_PEER_ID
};
