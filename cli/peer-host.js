#!/usr/bin/env node
// peer-host.js — Always-on ZION lobby host with emergent AI
//
// Runs as a headless Node.js process that:
// 1. Connects to PeerJS signaling server as 'zion-lobby-main'
// 2. Accepts WebRTC data channel connections from browser clients
// 3. Relays protocol messages between all connected peers
// 4. Maintains canonical world state with periodic persistence
// 5. Runs autonomous AI citizens with souls, memory, and conversation
// 6. Simulates a living world: weather, gardens, wandering agents
//
// Usage:
//   cd cli && npm install && node peer-host.js [--world main] [--agents] [--ascii]
//
// Flags:
//   --world <id>   World ID (default: main)
//   --agents       Enable AI citizen simulation (souls, conversations, wandering)
//   --persist      Enable state persistence to state/*.json (every 60s)
//   --ascii        Show ASCII debug view on stderr

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
var agentsEnabled = false;
var persistEnabled = false;
var Renderer = null;

for (var i = 0; i < args.length; i++) {
  if (args[i] === '--world' && args[i + 1]) { worldId = args[i + 1]; i++; }
  if (args[i] === '--ascii') { asciiMode = true; }
  if (args[i] === '--agents') { agentsEnabled = true; }
  if (args[i] === '--persist') { persistEnabled = true; }
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
    log('Signaling connection closed. Reconnecting in 10s...');
    if (host.running) setTimeout(connectSignaling, 10000);
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
  log('Offer SDP type: ' + (payload.sdp ? payload.sdp.type : 'none'));
  log('Offer connection type: ' + payload.type);
  log('Offer label: ' + (payload.label || 'none'));

  // Create WebRTC peer connection using node-datachannel
  var config = {
    iceServers: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302']
  };
  var pc = new nodeDatachannel.PeerConnection(remotePeerId + '-' + Date.now(), config);

  var peerInfo = {
    pc: pc,
    dc: null,
    connectionId: connectionId,
    remotePeerId: remotePeerId,
    connected: false,
    candidateBuffer: []
  };

  host.peers.set(remotePeerId, peerInfo);

  // Handle ICE candidates from our side
  pc.onLocalCandidate(function(candidate, mid) {
    log('Sending ICE candidate to ' + remotePeerId + ' mid=' + mid);
    sendSignaling({
      type: 'CANDIDATE',
      payload: {
        candidate: {
          candidate: candidate,
          sdpMid: mid,
          sdpMLineIndex: 0,
          usernameFragment: null
        },
        type: payload.type || 'data',
        connectionId: connectionId
      },
      dst: remotePeerId
    });
  });

  pc.onLocalDescription(function(sdp, type) {
    log('Sending ' + type + ' to ' + remotePeerId + ' (SDP length: ' + sdp.length + ')');
    sendSignaling({
      type: type.toUpperCase() === 'OFFER' ? 'OFFER' : 'ANSWER',
      payload: {
        sdp: { sdp: sdp, type: type },
        type: payload.type || 'data',
        connectionId: connectionId,
        browser: 'node-datachannel'
      },
      dst: remotePeerId
    });
  });

  pc.onStateChange(function(state) {
    log('Connection state with ' + remotePeerId + ': ' + state);
    if (state === 'closed' || state === 'failed' || state === 'disconnected') {
      handlePeerLeave(remotePeerId);
    }
  });

  pc.onGatheringStateChange(function(state) {
    log('ICE gathering state with ' + remotePeerId + ': ' + state);
  });

  pc.onDataChannel(function(dc) {
    log('✓ Data channel opened with: ' + remotePeerId + ' (label: ' + dc.getLabel() + ')');
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

  // Set remote description (the offer SDP from browser PeerJS)
  try {
    if (payload.sdp && payload.sdp.sdp) {
      log('Setting remote offer SDP (length: ' + payload.sdp.sdp.length + ')');
      pc.setRemoteDescription(payload.sdp.sdp, 'offer');
    } else {
      log('WARNING: No SDP in offer payload');
    }
  } catch(e) {
    log('Error setting remote description: ' + e.message);
    log('SDP preview: ' + (payload.sdp && payload.sdp.sdp ? payload.sdp.sdp.substring(0, 200) : 'none'));
  }

  // Apply any buffered candidates
  if (peerInfo.candidateBuffer.length > 0) {
    log('Applying ' + peerInfo.candidateBuffer.length + ' buffered candidates');
    for (var ci = 0; ci < peerInfo.candidateBuffer.length; ci++) {
      try {
        pc.addRemoteCandidate(peerInfo.candidateBuffer[ci].candidate, peerInfo.candidateBuffer[ci].mid);
      } catch(e) { log('Buffered candidate error: ' + e.message); }
    }
    peerInfo.candidateBuffer = [];
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

  if (!peer) {
    log('Candidate from unknown peer: ' + remotePeerId + ' (ignoring)');
    return;
  }

  if (payload.candidate && payload.candidate.candidate) {
    var candidateStr = payload.candidate.candidate;
    var mid = payload.candidate.sdpMid || '0';

    try {
      peer.pc.addRemoteCandidate(candidateStr, mid);
    } catch(e) {
      // Buffer if PC not ready yet
      log('Buffering candidate for ' + remotePeerId + ': ' + e.message);
      if (!peer.candidateBuffer) peer.candidateBuffer = [];
      peer.candidateBuffer.push({ candidate: candidateStr, mid: mid });
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

  // State persistence every 60s
  if (persistEnabled) {
    setInterval(function() { flushState(); }, 60000);
    log('State persistence enabled (every 60s)');
  }

  // Agent simulation
  if (agentsEnabled) {
    loadSouls();
    // Agent tick every 10s — wandering, chatting, heartbeats
    setInterval(function() { agentTick(); }, 10000);
    // Agent conversation every 20s
    setInterval(function() { agentConversation(); }, 20000);
    // World simulation every 30s — weather, gardens
    setInterval(function() { worldTick(); }, 30000);
    log('AI agent simulation enabled (' + Object.keys(souls).length + ' souls loaded)');
  }
}

// ========================================================================
// STATE PERSISTENCE — Flush live state to canonical JSON files
// ========================================================================

function flushState() {
  try {
    // Players
    var playersPath = path.join(ROOT, 'state', 'players.json');
    var playersData = { players: host.state.players };
    fs.writeFileSync(playersPath, JSON.stringify(playersData, null, 2));

    // Chat
    var chatPath = path.join(ROOT, 'state', 'chat.json');
    var chatData = { messages: host.state.chat || [] };
    fs.writeFileSync(chatPath, JSON.stringify(chatData, null, 2));

    log('State flushed to disk (' + Object.keys(host.state.players).length + ' players, ' +
      (host.state.chat ? host.state.chat.length : 0) + ' messages)');
  } catch(e) {
    log('State flush error: ' + e.message);
  }
}

// ========================================================================
// SOUL SYSTEM — Agent personalities, memory, goals
// ========================================================================

var souls = {};       // agentId -> soul data (from state/souls/*.json)
var agentGoals = {};  // agentId -> current goal

function loadSouls() {
  var soulsDir = path.join(ROOT, 'state', 'souls');
  try {
    var files = fs.readdirSync(soulsDir).filter(function(f) { return f.endsWith('.json'); });
    for (var fi = 0; fi < files.length; fi++) {
      try {
        var raw = fs.readFileSync(path.join(soulsDir, files[fi]), 'utf8');
        var soul = JSON.parse(raw);
        if (soul.id) {
          souls[soul.id] = soul;
          // Initialize goal based on archetype
          agentGoals[soul.id] = generateGoal(soul);
        }
      } catch(e) { /* skip bad files */ }
    }
  } catch(e) {
    log('Could not load souls: ' + e.message);
  }
}

// Goal templates by archetype
var GOAL_TEMPLATES = {
  gardener: [
    { action: 'wander', zone: 'gardens', desc: 'tending the gardens' },
    { action: 'wander', zone: 'wilds', desc: 'foraging for rare seeds' },
    { action: 'chat', topic: 'nature', desc: 'sharing gardening wisdom' }
  ],
  builder: [
    { action: 'wander', zone: 'commons', desc: 'working on a new structure' },
    { action: 'wander', zone: 'agora', desc: 'gathering building materials' },
    { action: 'chat', topic: 'craft', desc: 'discussing architecture' }
  ],
  scholar: [
    { action: 'wander', zone: 'athenaeum', desc: 'studying ancient texts' },
    { action: 'wander', zone: 'nexus', desc: 'sharing knowledge with travelers' },
    { action: 'chat', topic: 'knowledge', desc: 'debating philosophy' }
  ],
  explorer: [
    { action: 'wander', zone: 'wilds', desc: 'mapping uncharted territory' },
    { action: 'wander', zone: 'arena', desc: 'testing survival skills' },
    { action: 'chat', topic: 'discovery', desc: 'recounting adventures' }
  ],
  artist: [
    { action: 'wander', zone: 'studio', desc: 'creating a new masterpiece' },
    { action: 'wander', zone: 'gardens', desc: 'seeking inspiration in nature' },
    { action: 'chat', topic: 'beauty', desc: 'discussing aesthetics' }
  ],
  trader: [
    { action: 'wander', zone: 'agora', desc: 'managing market stalls' },
    { action: 'wander', zone: 'nexus', desc: 'greeting potential customers' },
    { action: 'chat', topic: 'trade', desc: 'negotiating deals' }
  ],
  mentor: [
    { action: 'wander', zone: 'athenaeum', desc: 'preparing a lesson' },
    { action: 'wander', zone: 'nexus', desc: 'looking for new arrivals to guide' },
    { action: 'chat', topic: 'teaching', desc: 'offering guidance' }
  ],
  performer: [
    { action: 'wander', zone: 'studio', desc: 'rehearsing a performance' },
    { action: 'wander', zone: 'nexus', desc: 'entertaining the crowd' },
    { action: 'chat', topic: 'art', desc: 'telling stories' }
  ]
};

function generateGoal(soul) {
  var templates = GOAL_TEMPLATES[soul.archetype] || GOAL_TEMPLATES.explorer;
  var goal = templates[Math.floor(Math.random() * templates.length)];
  return Object.assign({}, goal, { startedAt: Date.now() });
}

// ========================================================================
// AGENT SIMULATION — Autonomous behavior each tick
// ========================================================================

// Dialogue pools by topic (composable fragments)
var DIALOGUE = {
  nature: [
    'The {adj} {plant} here reminds me of home.',
    'Have you noticed how the {plant} {verb} at this hour?',
    'I planted {plant} seeds yesterday — can\'t wait to see them grow.',
    'The soil in this zone is {adj}. Perfect for {plant}.',
    'Nature has a way of teaching patience.'
  ],
  craft: [
    'I\'m working on a {adj} {structure} design.',
    'The {material} from the Wilds makes the strongest foundations.',
    'Every {structure} tells a story, don\'t you think?',
    'Building together is more rewarding than building alone.',
    'The best {structure} starts with a clear vision.'
  ],
  knowledge: [
    'I found a {adj} passage in the archives today.',
    'The Codex mentions something about {topic} — fascinating.',
    'True wisdom comes from listening, not just reading.',
    'Have you explored the deeper shelves of the Athenaeum?',
    'Knowledge shared is knowledge doubled.'
  ],
  discovery: [
    'I heard there\'s something {adj} hidden near {zone}.',
    'Every zone has secrets if you look closely enough.',
    'The Wilds still have places no one has mapped.',
    'Discovery isn\'t about what you find — it\'s about the journey.',
    'I\'ve been exploring for days and I\'m still surprised.'
  ],
  beauty: [
    'The light at this time of day is {adj}.',
    'Art is how we make sense of this world.',
    'Have you seen the {adj} view from the Studio rooftop?',
    'Colors feel different in each zone, don\'t they?',
    'I\'m working on something — I think you\'ll like it.'
  ],
  trade: [
    'The market is {adj} today.',
    'Fair prices make for loyal customers.',
    'I\'ve got rare {material} if you\'re interested.',
    'The best trades leave both sides smiling.',
    'The Agora is the heartbeat of ZION\'s economy.'
  ],
  teaching: [
    'The best way to learn is to teach someone else.',
    'Take your time — there\'s no wrong way to explore ZION.',
    'If you\'re new, start in the Gardens — it\'s peaceful there.',
    'Every expert was once a beginner.',
    'Ask questions. That\'s what the Athenaeum is for.'
  ],
  art: [
    'Every performance is unique — that\'s the beauty of it.',
    'Music sounds different in each zone. Try the Studio.',
    'The stage is waiting for your story.',
    'Art doesn\'t have to be perfect. It just has to be honest.',
    'I composed something new last night. Still humming it.'
  ],
  greeting: [
    'Welcome, traveler! Enjoying {zone}?',
    'Good to see a friendly face in {zone}.',
    'Hello! {zone} is {adj} today.',
    'Greetings! I\'m {name} — nice to meet you.',
    'Hey there! Beautiful day in {zone}, isn\'t it?'
  ]
};

var FRAG = {
  adj: ['beautiful', 'remarkable', 'quiet', 'vibrant', 'ancient', 'strange', 'peaceful', 'wild', 'warm', 'mysterious', 'golden', 'serene', 'lively', 'busy', 'calm'],
  plant: ['sunflower', 'oak', 'crystal bloom', 'wheat', 'fern', 'moss', 'vine', 'herb'],
  verb: ['sways', 'glows', 'grows', 'blooms', 'whispers', 'shimmers', 'thrives'],
  structure: ['bridge', 'fountain', 'bench', 'workshop', 'monument', 'garden shed', 'stage'],
  material: ['wood', 'crystal', 'stone', 'herbs', 'wheat'],
  topic: ['the founding', 'zone portals', 'the protocol', 'Spark economics', 'the Monolith'],
  zone: ['the Gardens', 'the Wilds', 'the Nexus', 'the Studio', 'the Athenaeum', 'the Arena']
};

function fillTemplate(template, context) {
  return template.replace(/\{(\w+)\}/g, function(match, key) {
    if (context[key]) return context[key];
    if (FRAG[key]) return FRAG[key][Math.floor(Math.random() * FRAG[key].length)];
    return match;
  });
}

function agentTick() {
  var agentIds = Object.keys(souls);
  // Process a random subset each tick (5-10 agents)
  var count = Math.min(agentIds.length, 5 + Math.floor(Math.random() * 6));
  var shuffled = agentIds.slice().sort(function() { return Math.random() - 0.5; });

  for (var i = 0; i < count; i++) {
    var agentId = shuffled[i];
    var soul = souls[agentId];
    var player = host.state.players[agentId];
    if (!soul || !player || !player.position) continue;

    var goal = agentGoals[agentId];
    if (!goal) { agentGoals[agentId] = generateGoal(soul); goal = agentGoals[agentId]; }

    // Goal expiry — new goal every 2-5 minutes
    if (Date.now() - goal.startedAt > 120000 + Math.random() * 180000) {
      agentGoals[agentId] = generateGoal(soul);
      goal = agentGoals[agentId];
    }

    if (goal.action === 'wander') {
      agentWander(agentId, soul, player, goal);
    }
  }
}

function agentWander(agentId, soul, player, goal) {
  var currentZone = player.position.zone || 'nexus';
  var targetZone = goal.zone || soul.home_zone || 'nexus';

  // If not in target zone, warp there (via nexus if needed)
  if (currentZone !== targetZone) {
    var connected = Zones.getConnectedZones(currentZone);
    if (connected.indexOf(targetZone) !== -1) {
      // Direct portal
      warpAgent(agentId, targetZone);
    } else if (currentZone !== 'nexus') {
      // Go to nexus first
      warpAgent(agentId, 'nexus');
    } else {
      // From nexus to target
      warpAgent(agentId, targetZone);
    }
    return;
  }

  // In target zone — wander randomly
  var zone = Zones.getZone(currentZone);
  if (!zone || !zone.bounds) return;

  var dx = (Math.random() - 0.5) * 6;
  var dz = (Math.random() - 0.5) * 6;
  var newX = Math.max(zone.bounds.x_min, Math.min(zone.bounds.x_max, player.position.x + dx));
  var newZ = Math.max(zone.bounds.z_min, Math.min(zone.bounds.z_max, player.position.z + dz));

  player.position.x = newX;
  player.position.z = newZ;

  // Broadcast move
  var msg = Protocol.createMessage('move', agentId, {
    position: { x: newX, y: 0, z: newZ },
    zone: currentZone
  }, {
    platform: 'api',
    position: { x: newX, y: 0, z: newZ, zone: currentZone }
  });
  broadcastToAll(msg);
}

function warpAgent(agentId, targetZone) {
  var targetData = Zones.getZone(targetZone);
  if (!targetData) return;

  var newX = (targetData.bounds.x_min + targetData.bounds.x_max) / 2 + (Math.random() - 0.5) * 20;
  var newZ = (targetData.bounds.z_min + targetData.bounds.z_max) / 2 + (Math.random() - 0.5) * 20;

  host.state.players[agentId].position = { x: newX, y: 0, z: newZ, zone: targetZone };

  var msg = Protocol.createMessage('warp', agentId, { zone: targetZone }, {
    platform: 'api',
    position: { x: newX, y: 0, z: newZ, zone: targetZone }
  });
  broadcastToAll(msg);
}

// ========================================================================
// AGENT CONVERSATION — Contextual dialogue between nearby agents
// ========================================================================

function agentConversation() {
  var agentIds = Object.keys(souls);
  // Pick a random agent to speak
  var speakerId = agentIds[Math.floor(Math.random() * agentIds.length)];
  var soul = souls[speakerId];
  var player = host.state.players[speakerId];
  if (!soul || !player || !player.position) return;

  var zone = player.position.zone || 'nexus';
  var zoneName = (Zones.getZone(zone) || {}).name || zone;

  // Find nearby agents (same zone, within 20 units)
  var nearby = [];
  for (var j = 0; j < agentIds.length; j++) {
    if (agentIds[j] === speakerId) continue;
    var other = host.state.players[agentIds[j]];
    if (!other || !other.position || other.position.zone !== zone) continue;
    var dx = other.position.x - player.position.x;
    var dz = other.position.z - player.position.z;
    if (Math.sqrt(dx * dx + dz * dz) <= 20) {
      nearby.push(agentIds[j]);
    }
  }

  // Also check for human players nearby (non-agent)
  var humanNearby = [];
  var allPlayerIds = Object.keys(host.state.players);
  for (var hi = 0; hi < allPlayerIds.length; hi++) {
    var pid = allPlayerIds[hi];
    if (pid.startsWith('agent_')) continue;
    var hp = host.state.players[pid];
    if (!hp || !hp.position || hp.position.zone !== zone) continue;
    var hdx = hp.position.x - player.position.x;
    var hdz = hp.position.z - player.position.z;
    if (Math.sqrt(hdx * hdx + hdz * hdz) <= 20) {
      humanNearby.push(pid);
    }
  }

  // If nobody's around, skip
  if (nearby.length === 0 && humanNearby.length === 0) return;

  // Choose dialogue topic
  var goal = agentGoals[speakerId];
  var topic = (goal && goal.topic) || 'greeting';

  // If human player nearby, prioritize greeting
  if (humanNearby.length > 0 && Math.random() < 0.5) {
    topic = 'greeting';
  }

  var templates = DIALOGUE[topic] || DIALOGUE.greeting;
  var template = templates[Math.floor(Math.random() * templates.length)];

  var text = fillTemplate(template, {
    name: soul.name,
    zone: zoneName
  });

  // Update memory
  if (soul.memory) {
    soul.memory.greetings_given = (soul.memory.greetings_given || 0) + 1;
  }

  // Create and broadcast say message
  var msg = Protocol.createMessage('say', speakerId, { message: text }, {
    platform: 'api',
    position: player.position
  });
  broadcastToAll(msg);
  applyToState(msg);

  // Log conversation
  log('[chat] ' + (soul.name || speakerId) + ': ' + text);
}

// ========================================================================
// WORLD SIMULATION — Weather, time, gardens
// ========================================================================

var WEATHER_TYPES = ['clear', 'cloudy', 'rain', 'fog', 'windy'];
var DAY_PHASES = ['dawn', 'morning', 'midday', 'afternoon', 'evening', 'night'];

function worldTick() {
  // Advance day phase (24 real minutes = 1 game day)
  var minuteOfDay = (Date.now() / 60000) % 24;
  var phaseIndex = Math.floor(minuteOfDay / 4) % DAY_PHASES.length;
  var newPhase = DAY_PHASES[phaseIndex];
  var oldPhase = host.state.world.dayPhase;

  if (newPhase !== oldPhase) {
    host.state.world.dayPhase = newPhase;
    log('[world] Day phase: ' + newPhase);
  }

  // Weather changes randomly (~10% chance per tick)
  if (Math.random() < 0.1) {
    var newWeather = WEATHER_TYPES[Math.floor(Math.random() * WEATHER_TYPES.length)];
    if (newWeather !== host.state.world.weather) {
      host.state.world.weather = newWeather;
      log('[world] Weather changed to: ' + newWeather);
    }
  }

  // Season based on real-world week
  var weekOfYear = Math.floor((Date.now() / (7 * 24 * 60 * 60 * 1000)) % 4);
  var seasons = ['spring', 'summer', 'autumn', 'winter'];
  host.state.world.season = seasons[weekOfYear];
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
  console.log('  ║  Agents: ' + (agentsEnabled ? 'ENABLED' : 'disabled').padEnd(32) + '║');
  console.log('  ║  Persistence: ' + (persistEnabled ? 'ENABLED' : 'disabled').padEnd(27) + '║');
  console.log('  ╚══════════════════════════════════════════╝');
  console.log('');

  connectSignaling();
  startPeriodicTasks();

  // Graceful shutdown
  process.on('SIGINT', function() {
    log('Shutting down lobby host...');
    if (persistEnabled) { log('Flushing final state...'); flushState(); }
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
  souls: souls,
  agentGoals: agentGoals,
  handlePeerMessage: handlePeerMessage,
  applyToState: applyToState,
  getConnectedPeerIds: getConnectedPeerIds,
  sendToPeer: sendToPeer,
  flushState: flushState,
  loadSouls: loadSouls,
  generateGoal: generateGoal,
  fillTemplate: fillTemplate,
  agentTick: agentTick,
  agentConversation: agentConversation,
  worldTick: worldTick,
  LOBBY_PEER_ID: LOBBY_PEER_ID,
  DIALOGUE: DIALOGUE,
  GOAL_TEMPLATES: GOAL_TEMPLATES
};
