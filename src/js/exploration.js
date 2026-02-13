(function(exports) {

  // Discovery types
  const DISCOVERY_TYPES = [
    'location', 'creature', 'artifact', 'secret',
    'landmark', 'ruin', 'cave', 'spring'
  ];

  // Base rarity by discovery type
  const BASE_RARITY = {
    location: 0.3,
    creature: 0.5,
    artifact: 0.7,
    secret: 0.9,
    landmark: 0.2,
    ruin: 0.6,
    cave: 0.4,
    spring: 0.5
  };

  // Generate unique IDs
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  // Calculate distance between two 3D positions
  function calculateDistance(pos1, pos2) {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  // Check if discovery is duplicate
  function isDuplicate(playerId, position, state) {
    if (!state.discoveries || state.discoveries.length === 0) {
      return false;
    }

    // Check if player has already discovered within distance 5
    for (const discovery of state.discoveries) {
      if (discovery.discoverer === playerId) {
        const distance = calculateDistance(position, discovery.position);
        if (distance <= 5) {
          return true;
        }
      }
    }

    return false;
  }

  // Calculate rarity for a discovery type
  function calculateRarity(type) {
    if (BASE_RARITY.hasOwnProperty(type)) {
      return BASE_RARITY[type];
    }
    // Default rarity
    return 0.3;
  }

  // Handle discovery
  function handleDiscover(msg, state) {
    const position = msg.payload.position || {x: 0, y: 0, z: 0};
    const playerId = msg.from;

    // Check for duplicate
    if (isDuplicate(playerId, position, state)) {
      return {
        success: false,
        error: 'Already discovered'
      };
    }

    const discoveryType = msg.payload.type || 'location';
    if (!DISCOVERY_TYPES.includes(discoveryType)) {
      return {
        success: false,
        error: 'Invalid discovery type'
      };
    }

    // Determine rarity
    let rarity = msg.payload.rarity;
    if (typeof rarity !== 'number' || rarity < 0 || rarity > 1) {
      rarity = calculateRarity(discoveryType);
    }

    // Calculate Spark award
    const sparkAwarded = 5 + Math.floor(rarity * 20);

    const discovery = {
      id: generateId(),
      discoverer: playerId,
      type: discoveryType,
      description: msg.payload.description || '',
      position: position,
      zone: msg.payload.zone || 'default',
      ts: Date.now(),
      rarity: rarity
    };

    // Initialize state.discoveries if needed
    if (!state.discoveries) {
      state.discoveries = [];
    }

    state.discoveries.push(discovery);

    return {
      success: true,
      state: state,
      discovery: discovery,
      sparkAwarded: sparkAwarded
    };
  }

  // Handle inspection
  function handleInspect(msg, state) {
    const targetId = msg.payload.target;

    if (!targetId) {
      return {
        success: false,
        error: 'No target specified'
      };
    }

    let info = null;
    let entityType = null;

    // Search in players
    if (state.players && state.players[targetId]) {
      info = {
        type: 'player',
        id: targetId,
        data: state.players[targetId]
      };
      entityType = 'player';
    }

    // Search in structures
    if (!info && state.structures && state.structures.length > 0) {
      const structure = state.structures.find(s => s.id === targetId);
      if (structure) {
        info = {
          type: 'structure',
          id: targetId,
          data: structure
        };
        entityType = 'structure';
      }
    }

    // Search in gardens
    if (!info && state.gardens && state.gardens.length > 0) {
      const garden = state.gardens.find(g => g.id === targetId);
      if (garden) {
        const now = Date.now();
        const elapsed = now - garden.plantedAt;
        const totalGrowthTime = garden.readyAt - garden.plantedAt;
        const currentGrowthStage = Math.min(1.0, elapsed / totalGrowthTime);

        info = {
          type: 'garden',
          id: targetId,
          data: {
            ...garden,
            currentGrowthStage: currentGrowthStage,
            isReady: now >= garden.readyAt
          }
        };
        entityType = 'garden';
      }
    }

    // Search in discoveries
    if (!info && state.discoveries && state.discoveries.length > 0) {
      const discovery = state.discoveries.find(d => d.id === targetId);
      if (discovery) {
        info = {
          type: 'discovery',
          id: targetId,
          data: discovery
        };
        entityType = 'discovery';
      }
    }

    if (!info) {
      return {
        success: false,
        error: 'Target not found'
      };
    }

    return {
      success: true,
      info: info
    };
  }

  // Exports
  exports.DISCOVERY_TYPES = DISCOVERY_TYPES;
  exports.BASE_RARITY = BASE_RARITY;
  exports.handleDiscover = handleDiscover;
  exports.handleInspect = handleInspect;
  exports.isDuplicate = isDuplicate;
  exports.calculateRarity = calculateRarity;

})(typeof module !== 'undefined' ? module.exports : (window.Exploration = {}));
