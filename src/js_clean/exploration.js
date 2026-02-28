(function(exports) {
  'use strict';

  var DUPLICATE_DISTANCE = 5;

  function _distance3d(a, b) {
    var dx = (a.x || 0) - (b.x || 0);
    var dy = (a.y || 0) - (b.y || 0);
    var dz = (a.z || 0) - (b.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  function isDuplicate(playerId, position, state) {
    var discoveries = state.discoveries || [];
    for (var i = 0; i < discoveries.length; i++) {
      var d = discoveries[i];
      if (d.discoverer === playerId) {
        var dist = _distance3d(position, d.position);
        if (dist < DUPLICATE_DISTANCE) {
          return true;
        }
      }
    }
    return false;
  }

  // §6.2 — Discovery awards 5-25 Spark based on rarity
  function handleDiscover(msg, state) {
    var from = msg.from;
    var payload = msg.payload;
    var position = payload.position || { x: 0, y: 0, z: 0 };
    var rarity = payload.rarity || 0;

    // Check for duplicate
    if (isDuplicate(from, position, state)) {
      return { success: false, error: 'Already discovered nearby location' };
    }

    var discovery = {
      id: 'disc_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6),
      type: payload.type,
      description: payload.description || '',
      discoverer: from,
      position: position,
      zone: payload.zone || 'wilds',
      rarity: rarity,
      ts: Date.now()
    };

    var newDiscoveries = (state.discoveries || []).concat([discovery]);
    var sparkAwarded = 5 + Math.floor(rarity * 20);

    return {
      success: true,
      discovery: discovery,
      sparkAwarded: sparkAwarded,
      state: { discoveries: newDiscoveries }
    };
  }

  function handleInspect(msg, state) {
    var target = msg.payload.target;

    // Check players first
    if (state.players && state.players[target]) {
      return {
        success: true,
        info: {
          type: 'player',
          id: target,
          data: state.players[target]
        }
      };
    }

    // Check structures (array or object)
    var structures = state.structures || [];
    if (Array.isArray(structures)) {
      for (var i = 0; i < structures.length; i++) {
        if (structures[i].id === target) {
          return {
            success: true,
            info: {
              type: 'structure',
              id: target,
              data: structures[i]
            }
          };
        }
      }
    } else {
      if (structures[target]) {
        return {
          success: true,
          info: {
            type: 'structure',
            id: target,
            data: structures[target]
          }
        };
      }
    }

    // Check discoveries
    var discoveries = state.discoveries || [];
    for (var j = 0; j < discoveries.length; j++) {
      if (discoveries[j].id === target) {
        return {
          success: true,
          info: {
            type: 'discovery',
            id: target,
            data: discoveries[j]
          }
        };
      }
    }

    // Check gardens
    var gardens = state.gardens || [];
    for (var k = 0; k < gardens.length; k++) {
      if (gardens[k].id === target) {
        return {
          success: true,
          info: {
            type: 'garden',
            id: target,
            data: gardens[k]
          }
        };
      }
    }

    return { success: false, error: 'Target not found: ' + target };
  }

  exports.Exploration = {
    DUPLICATE_DISTANCE: DUPLICATE_DISTANCE,
    handleDiscover: handleDiscover,
    handleInspect: handleInspect,
    isDuplicate: isDuplicate
  };

  if (typeof module !== 'undefined') {
    module.exports = exports.Exploration;
  }
})(typeof module !== 'undefined' ? module.exports : (window.ZION = window.ZION || {}));
