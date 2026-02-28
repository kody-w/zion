(function(exports) {
  'use strict';

  // §5.7 — Three-tier state: live → local → canonical
  var _liveState = null;

  function createWorldState() {
    return {
      world: { time: 0, weather: 'clear', season: 'spring' },
      players: {},
      economy: { balances: {}, transactions: [] },
      gardens: [],
      structures: {},
      discoveries: [],
      anchors: [],
      chat: [],
      actions: [],
      changes: [],
      competitions: [],
      federation: { federations: [] }
    };
  }

  // State.applyMessage must be pure — return new state without mutating input
  function applyMessage(state, msg) {
    // Deep clone to preserve purity
    var newState = JSON.parse(JSON.stringify(state));
    var type = msg.type;
    var from = msg.from;
    var payload = msg.payload || {};
    var ts = msg.ts || new Date().toISOString();

    switch (type) {
      case 'join':
        newState.players[from] = {
          id: from,
          name: payload.name || from,
          position: payload.position || { x: 0, y: 0, z: 0 },
          zone: payload.zone || 'nexus',
          online: true,
          joinedAt: ts,
          last_seen: Date.now()
        };
        newState.changes.push({ type: 'join', from: from, ts: ts });
        break;

      case 'leave':
        if (newState.players[from]) {
          newState.players[from].online = false;
          newState.players[from].last_seen = Date.now();
        }
        newState.changes.push({ type: 'leave', from: from, ts: ts });
        break;

      case 'move':
        if (newState.players[from]) {
          if (payload.position) {
            newState.players[from].position = payload.position;
          }
          newState.players[from].last_seen = Date.now();
        }
        break;

      case 'warp':
        if (newState.players[from]) {
          if (payload.zone) {
            newState.players[from].zone = payload.zone;
          }
          if (payload.position) {
            newState.players[from].position = payload.position;
          }
          newState.players[from].last_seen = Date.now();
        }
        newState.changes.push({ type: 'warp', from: from, ts: ts, zone: payload.zone });
        break;

      case 'say':
      case 'shout':
      case 'whisper':
        newState.chat.push({
          type: type,
          from: from,
          text: payload.text || payload.message || '',
          ts: ts
        });
        break;

      case 'build':
        if (payload.structure) {
          var structId = 'struct_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
          newState.structures[structId] = {
            id: structId,
            type: payload.structure.type,
            position: payload.structure.position || { x: 0, y: 0, z: 0 },
            zone: payload.zone || 'commons',
            builder: from,
            data: payload.structure.data || {},
            builtAt: ts
          };
        }
        newState.changes.push({ type: 'build', from: from, ts: ts });
        break;

      case 'plant':
        if (payload.species) {
          newState.gardens.push({
            id: 'garden_' + Date.now().toString(36),
            species: payload.species,
            planter: from,
            position: payload.position || { x: 0, y: 0, z: 0 },
            zone: payload.zone || 'gardens',
            plantedAt: Date.now(),
            readyAt: Date.now() + 300000, // 5 minutes
            growthStage: 0
          });
        }
        newState.changes.push({ type: 'plant', from: from, ts: ts });
        break;

      case 'discover':
        if (payload.type) {
          newState.discoveries.push({
            id: 'disc_' + Date.now().toString(36),
            type: payload.type,
            description: payload.description || '',
            discoverer: from,
            position: payload.position || { x: 0, y: 0, z: 0 },
            zone: payload.zone || 'wilds',
            ts: ts
          });
        }
        newState.changes.push({ type: 'discover', from: from, ts: ts });
        break;

      default:
        newState.changes.push({ type: type, from: from, ts: ts });
        break;
    }

    _liveState = newState;
    return newState;
  }

  function flushToCanonical() {
    return JSON.stringify(_liveState || createWorldState(), null, 2);
  }

  function loadFromCanonical(json) {
    _liveState = JSON.parse(json);
  }

  function getLiveState() {
    return _liveState || createWorldState();
  }

  // §3.5 — Last-writer-wins conflict resolution
  function resolveConflict(stateA, stateB) {
    var merged = createWorldState();

    // Merge players — last-writer-wins by last_seen
    var allPlayerIds = Object.keys(stateA.players).concat(Object.keys(stateB.players));
    var seen = {};
    allPlayerIds.forEach(function(id) {
      if (seen[id]) return;
      seen[id] = true;
      var a = stateA.players[id];
      var b = stateB.players[id];
      if (a && b) {
        merged.players[id] = (a.last_seen || 0) >= (b.last_seen || 0) ? a : b;
      } else {
        merged.players[id] = a || b;
      }
    });

    // Merge changes — combine and sort by ts
    merged.changes = (stateA.changes || []).concat(stateB.changes || []);
    merged.changes.sort(function(a, b) {
      return (a.ts || 0) - (b.ts || 0);
    });

    // Merge other arrays by concatenation + dedup
    merged.chat = (stateA.chat || []).concat(stateB.chat || []);
    merged.gardens = (stateA.gardens || []).concat(stateB.gardens || []);
    merged.discoveries = (stateA.discoveries || []).concat(stateB.discoveries || []);
    merged.anchors = (stateA.anchors || []).concat(stateB.anchors || []);
    merged.competitions = (stateA.competitions || []).concat(stateB.competitions || []);

    // Merge structures (object merge, last-writer-wins)
    Object.assign(merged.structures, stateA.structures || {}, stateB.structures || {});

    return merged;
  }

  exports.State = {
    createWorldState: createWorldState,
    applyMessage: applyMessage,
    flushToCanonical: flushToCanonical,
    loadFromCanonical: loadFromCanonical,
    getLiveState: getLiveState,
    resolveConflict: resolveConflict
  };

  if (typeof module !== 'undefined') {
    module.exports = exports.State;
  }
})(typeof module !== 'undefined' ? module.exports : (window.ZION = window.ZION || {}));
