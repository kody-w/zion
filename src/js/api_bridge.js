// api_bridge.js — Client-side bridge for AI Agent API
(function(exports) {
  'use strict';

  var REPO_OWNER = 'kody-w';
  var REPO_NAME = 'zion';
  var RAW_BASE = 'https://raw.githubusercontent.com/' + REPO_OWNER + '/' + REPO_NAME + '/main';
  var API_BASE = 'https://api.github.com/repos/' + REPO_OWNER + '/' + REPO_NAME;

  var PUBLISH_INTERVAL = 60000;  // 60s between state publishes
  var POLL_INTERVAL = 30000;     // 30s between inbox polls

  var lastPublishTime = 0;
  var lastPollTime = 0;
  var pendingMessages = [];

  /**
   * Initialize the API bridge
   */
  function init() {
    console.log('[ApiBridge] Initialized — publish every %ds, poll every %ds',
      PUBLISH_INTERVAL / 1000, POLL_INTERVAL / 1000);
  }

  /**
   * Update loop — called from main game loop
   * @param {number} now - Current timestamp (Date.now())
   * @param {object} gameState - Current game state
   */
  function update(now, gameState) {
    // Publish state on timer
    if (now - lastPublishTime >= PUBLISH_INTERVAL) {
      lastPublishTime = now;
      publishStateSnapshot(gameState);
    }

    // Poll inbox on timer
    if (now - lastPollTime >= POLL_INTERVAL) {
      lastPollTime = now;
      pollInbox(gameState);
    }

    // Process any pending messages
    if (pendingMessages.length > 0) {
      processPendingMessages(gameState);
    }
  }

  /**
   * Build a world state snapshot from live game state
   * @param {object} gameState - Current game state
   * @returns {object} Snapshot for API consumers
   */
  function buildSnapshot(gameState) {
    var state = typeof State !== 'undefined' ? State : {};
    var zones = typeof Zones !== 'undefined' ? Zones : {};
    var liveState = state.getLiveState ? state.getLiveState() : {};

    var world = liveState.world || {};
    var players = liveState.players || {};
    var economy = liveState.economy || {};
    var chat = liveState.chat || [];

    // Count players per zone
    var playerZones = {};
    var playerEntries = {};
    for (var pid in players) {
      if (players.hasOwnProperty(pid)) {
        var p = players[pid];
        var pzone = (p.position && p.position.zone) || 'nexus';
        playerZones[pzone] = (playerZones[pzone] || 0) + 1;
        playerEntries[pid] = {
          position: p.position || {},
          zone: pzone,
          online: true
        };
      }
    }

    // Zone summaries
    var zoneIds = zones.getAllZoneIds ? zones.getAllZoneIds() : [];
    var zoneSummaries = {};
    for (var i = 0; i < zoneIds.length; i++) {
      var zid = zoneIds[i];
      var zdata = zones.getZone ? zones.getZone(zid) : {};
      zoneSummaries[zid] = {
        name: zdata.name || zid,
        description: zdata.description || '',
        player_count: playerZones[zid] || 0,
        npc_count: 0
      };
    }

    // NPC data
    var npcList = [];
    if (typeof NPCs !== 'undefined' && NPCs.getAllNPCs) {
      var allNpcs = NPCs.getAllNPCs();
      for (var n = 0; n < allNpcs.length; n++) {
        var npc = allNpcs[n];
        var nzone = (npc.position && npc.position.zone) || 'nexus';
        npcList.push({
          id: npc.id || '',
          name: npc.name || '',
          archetype: npc.archetype || '',
          zone: nzone
        });
        if (zoneSummaries[nzone]) {
          zoneSummaries[nzone].npc_count++;
        }
      }
    }

    // Recent chat (last 20)
    var recentChat = [];
    var chatSlice = chat.slice(-20);
    for (var c = 0; c < chatSlice.length; c++) {
      var msg = chatSlice[c];
      recentChat.push({
        from: msg.from || '',
        type: msg.type || 'say',
        text: (msg.payload && msg.payload.text) || '',
        ts: msg.ts || ''
      });
    }

    return {
      v: 1,
      ts: new Date().toISOString(),
      world: {
        time: world.time || 0,
        dayPhase: world.dayPhase || 'day',
        weather: world.weather || 'clear',
        season: world.season || 'spring'
      },
      zones: zoneSummaries,
      players: playerEntries,
      npcs: npcList,
      recent_chat: recentChat,
      economy: {
        total_spark: sumValues(economy.balances || {}),
        active_listings: (economy.listings || []).length
      }
    };
  }

  /**
   * Publish state snapshot (stores in localStorage for local access)
   * @param {object} gameState - Current game state
   */
  function publishStateSnapshot(gameState) {
    try {
      var snapshot = buildSnapshot(gameState);
      // Store locally for any local tools to read
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('zion_api_state', JSON.stringify(snapshot));
        localStorage.setItem('zion_api_state_ts', snapshot.ts);
      }
    } catch (e) {
      console.warn('[ApiBridge] Failed to publish snapshot:', e.message);
    }
  }

  /**
   * Poll GitHub inbox for new messages from AI agents
   * @param {object} gameState - Current game state
   */
  function pollInbox(gameState) {
    var url = API_BASE + '/contents/state/inbox';

    fetch(url, {
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    })
    .then(function(response) {
      if (!response.ok) return [];
      return response.json();
    })
    .then(function(files) {
      if (!Array.isArray(files)) return;

      // Filter for JSON files (not .gitkeep, not _processed dir)
      var messageFiles = files.filter(function(f) {
        return f.name.endsWith('.json') && f.type === 'file';
      });

      if (messageFiles.length === 0) return;

      console.log('[ApiBridge] Found %d inbox messages', messageFiles.length);

      // Fetch each message
      messageFiles.forEach(function(f) {
        fetch(f.download_url)
          .then(function(r) { return r.json(); })
          .then(function(msg) {
            pendingMessages.push(msg);
          })
          .catch(function(e) {
            console.warn('[ApiBridge] Failed to fetch message %s: %s', f.name, e.message);
          });
      });
    })
    .catch(function(e) {
      // Silent fail — GitHub API rate limiting is common for unauthenticated requests
    });
  }

  /**
   * Process pending messages from inbox
   * @param {object} gameState - Current game state
   */
  function processPendingMessages(gameState) {
    var protocol = typeof Protocol !== 'undefined' ? Protocol : null;
    var state = typeof State !== 'undefined' ? State : null;

    if (!protocol || !state) return;

    while (pendingMessages.length > 0) {
      var msg = pendingMessages.shift();

      // Validate
      var result = protocol.validateMessage(msg);
      if (!result.valid) {
        console.warn('[ApiBridge] Invalid message from %s: %s', msg.from, result.errors.join(', '));
        continue;
      }

      // Apply to live state
      try {
        var currentState = state.getLiveState();
        var newState = state.applyMessage(currentState, msg);
        state.setLiveState(newState);
        console.log('[ApiBridge] Applied %s from %s', msg.type, msg.from);

        // Chat messages are rendered by HUD from live state — no extra call needed
      } catch (e) {
        console.warn('[ApiBridge] Failed to apply message: %s', e.message);
      }
    }
  }

  /**
   * Get the latest published snapshot
   * @returns {object|null} Latest snapshot or null
   */
  function getLatestSnapshot() {
    if (typeof localStorage === 'undefined') return null;
    try {
      var raw = localStorage.getItem('zion_api_state');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Sum numeric values in an object
   */
  function sumValues(obj) {
    var total = 0;
    for (var k in obj) {
      if (obj.hasOwnProperty(k) && typeof obj[k] === 'number') {
        total += obj[k];
      }
    }
    return total;
  }

  // Exports
  exports.init = init;
  exports.update = update;
  exports.buildSnapshot = buildSnapshot;
  exports.publishStateSnapshot = publishStateSnapshot;
  exports.pollInbox = pollInbox;
  exports.getLatestSnapshot = getLatestSnapshot;

})(typeof module !== 'undefined' ? module.exports : (window.ApiBridge = {}));
