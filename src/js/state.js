/**
 * ZION State Management System - Three-tier state management
 * Layer 2 - Self-contained (conceptually depends on protocol.js)
 */

(function(exports) {
  'use strict';

  // In-memory live state
  let liveState = null;

  /**
   * Creates initial world state with all required keys
   * @returns {Object} Initial world state
   */
  function createWorldState() {
    return {
      world: {
        time: 0,
        weather: 'clear',
        season: 'spring',
        dayPhase: 'day'
      },
      players: {},
      economy: {
        balances: {},
        transactions: [],
        listings: []
      },
      gardens: {},
      structures: {},
      discoveries: {},
      anchors: {},
      chat: [],
      actions: [],
      changes: [],
      competitions: {},
      federation: {
        federations: []
      }
    };
  }

  /**
   * Gets current live state
   * @returns {Object} Current in-memory state
   */
  function getLiveState() {
    if (!liveState) {
      liveState = createWorldState();
    }
    return liveState;
  }

  /**
   * Sets a value at a dot-separated path in live state
   * @param {string} path - Dot-separated path (e.g., 'world.time')
   * @param {*} value - Value to set
   */
  function setLiveState(path, value) {
    if (!liveState) {
      liveState = createWorldState();
    }

    const parts = path.split('.');
    let current = liveState;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }

    current[parts[parts.length - 1]] = value;
  }

  /**
   * Flushes live state to localStorage
   */
  function flushToLocal() {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      const state = getLiveState();
      localStorage.setItem('zion_state', JSON.stringify(state));
    } catch (e) {
      console.error('Failed to flush to localStorage:', e);
    }
  }

  /**
   * Loads state from localStorage to live state
   */
  function loadFromLocal() {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      const stored = localStorage.getItem('zion_state');
      if (stored) {
        liveState = JSON.parse(stored);
      } else {
        liveState = createWorldState();
      }
    } catch (e) {
      console.error('Failed to load from localStorage:', e);
      liveState = createWorldState();
    }
  }

  /**
   * Flushes to canonical JSON string
   * @returns {string} JSON string of current state
   */
  function flushToCanonical() {
    const state = getLiveState();
    return JSON.stringify(state);
  }

  /**
   * Loads from canonical JSON string
   * @param {string} json - JSON string
   */
  function loadFromCanonical(json) {
    try {
      liveState = JSON.parse(json);
    } catch (e) {
      console.error('Failed to parse canonical state:', e);
      liveState = createWorldState();
    }
  }

  /**
   * Applies a protocol message to state (PURE function)
   * @param {Object} state - Current state
   * @param {Object} message - Protocol message
   * @returns {Object} New state
   */
  function applyMessage(state, message) {
    // Deep clone state for immutability
    const newState = JSON.parse(JSON.stringify(state));

    const { type, from, payload } = message;
    const timestamp = message.ts || Date.now();

    switch (type) {
      case 'join':
        newState.players[from] = {
          id: from,
          name: payload.name || from,
          position: payload.position || { x: 0, y: 0, z: 0 },
          zone: payload.zone || 'default',
          online: true,
          last_seen: timestamp,
          idle: false,
          inventory: [],
          intentions: [],
          ...payload
        };
        break;

      case 'leave':
        if (newState.players[from]) {
          newState.players[from].online = false;
          newState.players[from].last_seen = timestamp;
        }
        break;

      case 'heartbeat':
        if (newState.players[from]) {
          newState.players[from].last_seen = timestamp;
          newState.players[from].idle = false;
        }
        break;

      case 'idle':
        if (newState.players[from]) {
          newState.players[from].idle = true;
        }
        break;

      case 'move':
        if (newState.players[from] && payload.position) {
          newState.players[from].position = payload.position;
        }
        break;

      case 'warp':
        if (newState.players[from]) {
          if (payload.position) {
            newState.players[from].position = payload.position;
          }
          if (payload.zone) {
            newState.players[from].zone = payload.zone;
          }
        }
        break;

      case 'say':
      case 'shout':
      case 'whisper':
      case 'emote':
        newState.chat.push({
          id: `chat_${timestamp}_${from}`,
          type,
          from,
          to: payload.to,
          text: payload.text || payload.message || '',
          ts: timestamp
        });
        break;

      case 'build':
        if (payload.structure) {
          const structureId = `struct_${timestamp}_${from}`;
          newState.structures[structureId] = {
            id: structureId,
            builder: from,
            type: payload.structure.type,
            position: payload.structure.position,
            data: payload.structure.data || {},
            ts: timestamp
          };
        }
        break;

      case 'plant':
        if (payload.plant) {
          const gardenId = `garden_${timestamp}_${from}`;
          newState.gardens[gardenId] = {
            id: gardenId,
            gardener: from,
            plant: payload.plant.type,
            position: payload.plant.position,
            planted_at: timestamp,
            ready_at: timestamp + (payload.plant.grow_time || 60000),
            ready: false
          };
        }
        break;

      case 'harvest':
        if (payload.gardenId && newState.gardens[payload.gardenId]) {
          const garden = newState.gardens[payload.gardenId];
          if (garden.ready || timestamp >= garden.ready_at) {
            delete newState.gardens[payload.gardenId];
            // Add harvested item to player inventory
            if (newState.players[from] && newState.players[from].inventory) {
              newState.players[from].inventory.push({
                type: garden.plant,
                harvested_at: timestamp
              });
            }
          }
        }
        break;

      case 'craft':
        if (payload.item && newState.players[from]) {
          if (!newState.players[from].inventory) {
            newState.players[from].inventory = [];
          }
          newState.players[from].inventory.push({
            type: payload.item.type,
            crafted_at: timestamp,
            data: payload.item.data || {}
          });
        }
        break;

      case 'compose':
        if (payload.art) {
          const artId = `art_${timestamp}_${from}`;
          newState.structures[artId] = {
            id: artId,
            artist: from,
            type: 'art',
            art_type: payload.art.type,
            position: payload.art.position,
            data: payload.art.data || {},
            ts: timestamp
          };
        }
        break;

      case 'trade_offer':
        newState.actions.push({
          id: `trade_${timestamp}_${from}`,
          type: 'trade_offer',
          from,
          to: payload.to,
          offered: payload.offered || [],
          requested: payload.requested || [],
          status: 'pending',
          ts: timestamp
        });
        break;

      case 'trade_accept':
        if (payload.tradeId) {
          const trade = newState.actions.find(a => a.id === payload.tradeId);
          if (trade && trade.type === 'trade_offer') {
            trade.status = 'accepted';
            trade.completed_at = timestamp;
            // Exchange items between players
            if (newState.players[trade.from] && newState.players[trade.to]) {
              // This is simplified - real implementation would transfer items
            }
          }
        }
        break;

      case 'trade_decline':
        if (payload.tradeId) {
          const trade = newState.actions.find(a => a.id === payload.tradeId);
          if (trade && trade.type === 'trade_offer') {
            trade.status = 'declined';
            trade.completed_at = timestamp;
          }
        }
        break;

      case 'buy':
        // Market buy operation - would integrate with economy ledger
        newState.actions.push({
          id: `buy_${timestamp}_${from}`,
          type: 'buy',
          buyer: from,
          listingId: payload.listingId,
          ts: timestamp
        });
        break;

      case 'sell':
        // Market sell operation - would integrate with economy ledger
        newState.actions.push({
          id: `sell_${timestamp}_${from}`,
          type: 'sell',
          seller: from,
          item: payload.item,
          price: payload.price,
          ts: timestamp
        });
        break;

      case 'gift':
        if (payload.to && payload.item) {
          newState.actions.push({
            id: `gift_${timestamp}_${from}`,
            type: 'gift',
            from,
            to: payload.to,
            item: payload.item,
            ts: timestamp
          });
          // Transfer item from sender to recipient
          if (newState.players[from] && newState.players[payload.to]) {
            if (!newState.players[payload.to].inventory) {
              newState.players[payload.to].inventory = [];
            }
            newState.players[payload.to].inventory.push({
              ...payload.item,
              gifted_from: from,
              gifted_at: timestamp
            });
          }
        }
        break;

      case 'teach':
        newState.actions.push({
          id: `teach_${timestamp}_${from}`,
          type: 'teach',
          teacher: from,
          student: payload.to,
          skill: payload.skill,
          ts: timestamp
        });
        break;

      case 'learn':
        newState.actions.push({
          id: `learn_${timestamp}_${from}`,
          type: 'learn',
          learner: from,
          skill: payload.skill,
          source: payload.source,
          ts: timestamp
        });
        break;

      case 'mentor_offer':
        newState.actions.push({
          id: `mentor_${timestamp}_${from}`,
          type: 'mentor_offer',
          mentor: from,
          mentee: payload.to,
          status: 'pending',
          ts: timestamp
        });
        break;

      case 'mentor_accept':
        if (payload.mentorId) {
          const mentorship = newState.actions.find(a => a.id === payload.mentorId);
          if (mentorship && mentorship.type === 'mentor_offer') {
            mentorship.status = 'accepted';
            mentorship.accepted_at = timestamp;
          }
        }
        break;

      case 'challenge':
        const challengeId = `challenge_${timestamp}_${from}`;
        newState.competitions[challengeId] = {
          id: challengeId,
          challenger: from,
          challenged: payload.to,
          type: payload.challenge_type,
          status: 'pending',
          ts: timestamp
        };
        break;

      case 'accept_challenge':
        if (payload.challengeId && newState.competitions[payload.challengeId]) {
          newState.competitions[payload.challengeId].status = 'active';
          newState.competitions[payload.challengeId].accepted_at = timestamp;
        }
        break;

      case 'forfeit':
        if (payload.challengeId && newState.competitions[payload.challengeId]) {
          newState.competitions[payload.challengeId].status = 'forfeited';
          newState.competitions[payload.challengeId].forfeited_by = from;
          newState.competitions[payload.challengeId].completed_at = timestamp;
        }
        break;

      case 'score':
        if (payload.challengeId && newState.competitions[payload.challengeId]) {
          const comp = newState.competitions[payload.challengeId];
          if (!comp.scores) {
            comp.scores = {};
          }
          comp.scores[from] = payload.score;
        }
        break;

      case 'discover':
        if (payload.discovery) {
          const discoveryId = `discovery_${timestamp}_${from}`;
          newState.discoveries[discoveryId] = {
            id: discoveryId,
            discoverer: from,
            type: payload.discovery.type,
            location: payload.discovery.location,
            data: payload.discovery.data || {},
            ts: timestamp
          };
        }
        break;

      case 'anchor_place':
        if (payload.anchor) {
          const anchorId = `anchor_${timestamp}_${from}`;
          newState.anchors[anchorId] = {
            id: anchorId,
            owner: from,
            position: payload.anchor.position,
            zone: payload.anchor.zone || 'default',
            name: payload.anchor.name,
            ts: timestamp
          };
        }
        break;

      case 'inspect':
        // No state change - returns info only
        break;

      case 'intention_set':
        if (newState.players[from] && payload.intention) {
          if (!newState.players[from].intentions) {
            newState.players[from].intentions = [];
          }
          newState.players[from].intentions.push({
            text: payload.intention,
            set_at: timestamp
          });
        }
        break;

      case 'intention_clear':
        if (newState.players[from]) {
          newState.players[from].intentions = [];
        }
        break;

      case 'warp_fork':
        if (newState.players[from] && payload.target_world) {
          newState.players[from].current_world = payload.target_world;
          newState.players[from].home_world = newState.players[from].home_world || 'default';
          if (payload.position) {
            newState.players[from].position = payload.position;
          }
        }
        break;

      case 'return_home':
        if (newState.players[from]) {
          const homeWorld = newState.players[from].home_world || 'default';
          newState.players[from].current_world = homeWorld;
          if (payload.position) {
            newState.players[from].position = payload.position;
          }
        }
        break;

      case 'federation_announce':
        if (payload.federation) {
          newState.federation.federations.push({
            id: `fed_${timestamp}_${from}`,
            announced_by: from,
            name: payload.federation.name,
            endpoint: payload.federation.endpoint,
            ts: timestamp
          });
        }
        break;

      case 'federation_handshake':
        if (payload.federationId) {
          const fed = newState.federation.federations.find(f => f.id === payload.federationId);
          if (fed) {
            fed.handshake_complete = true;
            fed.handshake_at = timestamp;
          }
        }
        break;

      default:
        // Unknown message type - no state change
        break;
    }

    // Record state change
    newState.changes.push({
      type,
      from,
      ts: timestamp
    });

    return newState;
  }

  /**
   * Resolves conflicts between two states using last-writer-wins
   * @param {Object} stateA - First state
   * @param {Object} stateB - Second state
   * @returns {Object} Merged state
   */
  function resolveConflict(stateA, stateB) {
    // Start with a deep clone of stateA
    const merged = JSON.parse(JSON.stringify(stateA));

    // Merge changes arrays and sort by timestamp
    const allChanges = [
      ...(stateA.changes || []),
      ...(stateB.changes || [])
    ].sort((a, b) => a.ts - b.ts);

    // Remove duplicates
    const uniqueChanges = [];
    const seen = new Set();
    for (const change of allChanges) {
      const key = `${change.type}_${change.from}_${change.ts}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueChanges.push(change);
      }
    }

    merged.changes = uniqueChanges;

    // Merge players (last-writer-wins based on last_seen)
    merged.players = { ...stateA.players };
    for (const [playerId, playerB] of Object.entries(stateB.players || {})) {
      const playerA = merged.players[playerId];
      if (!playerA || (playerB.last_seen || 0) > (playerA.last_seen || 0)) {
        merged.players[playerId] = playerB;
      }
    }

    // Merge collections (combine and deduplicate by ID)
    const mergeById = (collectionA, collectionB) => {
      const result = { ...collectionA };
      for (const [id, item] of Object.entries(collectionB || {})) {
        if (!result[id] || (item.ts || 0) > (result[id].ts || 0)) {
          result[id] = item;
        }
      }
      return result;
    };

    merged.gardens = mergeById(stateA.gardens || {}, stateB.gardens || {});
    merged.structures = mergeById(stateA.structures || {}, stateB.structures || {});
    merged.discoveries = mergeById(stateA.discoveries || {}, stateB.discoveries || {});
    merged.anchors = mergeById(stateA.anchors || {}, stateB.anchors || {});
    merged.competitions = mergeById(stateA.competitions || {}, stateB.competitions || {});

    // Merge chat (combine and sort by timestamp)
    merged.chat = [
      ...(stateA.chat || []),
      ...(stateB.chat || [])
    ].sort((a, b) => a.ts - b.ts);

    // Merge actions (combine and deduplicate)
    merged.actions = [
      ...(stateA.actions || []),
      ...(stateB.actions || [])
    ];
    const actionIds = new Set();
    merged.actions = merged.actions.filter(action => {
      if (actionIds.has(action.id)) {
        return false;
      }
      actionIds.add(action.id);
      return true;
    });

    // Merge economy (combine transactions and listings)
    merged.economy = {
      balances: { ...(stateA.economy?.balances || {}), ...(stateB.economy?.balances || {}) },
      transactions: [
        ...(stateA.economy?.transactions || []),
        ...(stateB.economy?.transactions || [])
      ].sort((a, b) => a.ts - b.ts),
      listings: [
        ...(stateA.economy?.listings || []),
        ...(stateB.economy?.listings || [])
      ]
    };

    // Merge federation
    merged.federation = {
      federations: [
        ...(stateA.federation?.federations || []),
        ...(stateB.federation?.federations || [])
      ]
    };

    // World state - use most recent
    const worldATime = stateA.world?.time || 0;
    const worldBTime = stateB.world?.time || 0;
    merged.world = worldBTime > worldATime ? stateB.world : stateA.world;

    return merged;
  }

  // Convenience helpers used by main.js
  function initState() {
    return createWorldState();
  }

  function addPlayer(state, player) {
    if (!state || !player) return;
    state.players[player.id] = {
      id: player.id,
      name: player.name || player.id,
      position: player.position || { x: 0, y: 0, z: 0 },
      zone: player.zone || 'nexus',
      spark: player.spark || 0,
      warmth: player.warmth || 0,
      online: true,
      lastSeen: new Date().toISOString()
    };
  }

  function removePlayer(state, playerId) {
    if (!state || !playerId) return;
    if (state.players[playerId]) {
      state.players[playerId].online = false;
      state.players[playerId].lastSeen = new Date().toISOString();
    }
  }

  function getPlayer(state, playerId) {
    if (!state || !playerId) return null;
    return state.players[playerId] || null;
  }

  function getPlayers(state) {
    if (!state) return {};
    return state.players;
  }

  // Export public API
  exports.createWorldState = createWorldState;
  exports.initState = initState;
  exports.addPlayer = addPlayer;
  exports.removePlayer = removePlayer;
  exports.getPlayer = getPlayer;
  exports.getPlayers = getPlayers;
  exports.getLiveState = getLiveState;
  exports.setLiveState = setLiveState;
  exports.flushToLocal = flushToLocal;
  exports.loadFromLocal = loadFromLocal;
  exports.flushToCanonical = flushToCanonical;
  exports.loadFromCanonical = loadFromCanonical;
  exports.applyMessage = applyMessage;
  exports.resolveConflict = resolveConflict;

})(typeof module !== 'undefined' ? module.exports : (window.State = {}));
