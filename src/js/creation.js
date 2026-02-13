(function(exports) {

  // Plant species configuration
  const PLANT_SPECIES = {
    sunflower: {
      growthTime: 300000, // 5 min
      yields: [{type: 'sunflower', quantity: 3}]
    },
    oak_tree: {
      growthTime: 600000, // 10 min
      yields: [{type: 'wood', quantity: 5}]
    },
    wheat: {
      growthTime: 180000, // 3 min
      yields: [{type: 'wheat', quantity: 10}]
    },
    crystal_bloom: {
      growthTime: 900000, // 15 min
      yields: [{type: 'crystal', quantity: 1}]
    },
    herbs: {
      growthTime: 120000, // 2 min
      yields: [{type: 'herbs', quantity: 5}]
    }
  };

  // Crafting recipes
  const RECIPES = {
    wooden_bench: {
      materials: {wood: 3},
      produces: {type: 'wooden_bench', quantity: 1},
      complexity: 0.2
    },
    flower_crown: {
      materials: {sunflower: 2},
      produces: {type: 'flower_crown', quantity: 1},
      complexity: 0.1
    },
    crystal_lamp: {
      materials: {crystal: 1, wood: 1},
      produces: {type: 'crystal_lamp', quantity: 1},
      complexity: 0.5
    },
    bread: {
      materials: {wheat: 3, herbs: 1},
      produces: {type: 'bread', quantity: 2},
      complexity: 0.3
    },
    healing_tea: {
      materials: {herbs: 3},
      produces: {type: 'healing_tea', quantity: 1},
      complexity: 0.4
    }
  };

  // Structure types
  const STRUCTURE_TYPES = [
    'house', 'workshop', 'garden_shed', 'monument', 'bridge',
    'fountain', 'stage', 'market_stall', 'bench', 'lantern'
  ];

  // Generate unique IDs
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  // Handle building structures
  function handleBuild(msg, state, zoneRules) {
    if (!zoneRules.building) {
      return {
        success: false,
        error: 'Building not allowed in this zone'
      };
    }

    const structureType = msg.payload.type;
    if (!STRUCTURE_TYPES.includes(structureType)) {
      return {
        success: false,
        error: 'Invalid structure type'
      };
    }

    const structure = {
      id: generateId(),
      type: structureType,
      position: msg.payload.position || {x: 0, y: 0, z: 0},
      zone: msg.payload.zone || 'default',
      builder: msg.from,
      ts: Date.now()
    };

    if (!state.structures) {
      state.structures = [];
    }

    state.structures.push(structure);

    return {
      success: true,
      state: state,
      structure: structure
    };
  }

  // Handle planting
  function handlePlant(msg, state, zoneRules) {
    if (!zoneRules.harvesting) {
      return {
        success: false,
        error: 'Planting not allowed in this zone'
      };
    }

    const species = msg.payload.species;
    if (!PLANT_SPECIES[species]) {
      return {
        success: false,
        error: 'Invalid plant species'
      };
    }

    const speciesData = PLANT_SPECIES[species];
    const plantedAt = Date.now();
    const readyAt = plantedAt + speciesData.growthTime;

    const garden = {
      id: generateId(),
      species: species,
      position: msg.payload.position || {x: 0, y: 0, z: 0},
      zone: msg.payload.zone || 'default',
      planter: msg.from,
      plantedAt: plantedAt,
      growthStage: 0,
      readyAt: readyAt
    };

    if (!state.gardens) {
      state.gardens = [];
    }

    state.gardens.push(garden);

    return {
      success: true,
      state: state,
      garden: garden
    };
  }

  // Handle harvesting
  function handleHarvest(msg, state, zoneRules) {
    if (!zoneRules.harvesting) {
      return {
        success: false,
        error: 'Harvesting not allowed in this zone'
      };
    }

    if (!state.gardens || state.gardens.length === 0) {
      return {
        success: false,
        error: 'No gardens to harvest'
      };
    }

    const targetId = msg.payload.target;
    const gardenIndex = state.gardens.findIndex(g => g.id === targetId);

    if (gardenIndex === -1) {
      return {
        success: false,
        error: 'Garden not found'
      };
    }

    const garden = state.gardens[gardenIndex];
    const now = Date.now();

    // Check if growth is complete
    const isReady = now >= garden.readyAt || garden.growthStage >= 1.0;

    if (!isReady) {
      return {
        success: false,
        error: 'Plant is not ready to harvest yet'
      };
    }

    const speciesData = PLANT_SPECIES[garden.species];
    const items = speciesData.yields;

    // Remove garden from state
    state.gardens.splice(gardenIndex, 1);

    return {
      success: true,
      state: state,
      items: items
    };
  }

  // Handle crafting
  function handleCraft(msg, state) {
    const recipeName = msg.payload.recipe;

    if (!RECIPES[recipeName]) {
      return {
        success: false,
        error: 'Recipe not found'
      };
    }

    const recipe = RECIPES[recipeName];

    // Initialize player inventory if needed
    if (!state.players) {
      state.players = {};
    }
    if (!state.players[msg.from]) {
      state.players[msg.from] = {inventory: {}};
    }
    if (!state.players[msg.from].inventory) {
      state.players[msg.from].inventory = {};
    }

    const inventory = state.players[msg.from].inventory;

    // Check if player has required materials
    for (const [material, quantity] of Object.entries(recipe.materials)) {
      if (!inventory[material] || inventory[material] < quantity) {
        return {
          success: false,
          error: `Insufficient materials: need ${quantity} ${material}`
        };
      }
    }

    // Consume materials
    for (const [material, quantity] of Object.entries(recipe.materials)) {
      inventory[material] -= quantity;
      if (inventory[material] === 0) {
        delete inventory[material];
      }
    }

    // Produce item
    const producedItem = recipe.produces;
    if (!inventory[producedItem.type]) {
      inventory[producedItem.type] = 0;
    }
    inventory[producedItem.type] += producedItem.quantity;

    return {
      success: true,
      state: state,
      item: producedItem
    };
  }

  // Compose types configuration
  const COMPOSE_TYPES = {
    poem: { name: 'Poem', maxLength: 500, sparkReward: [5, 20] },
    song: { name: 'Song', maxLength: 300, sparkReward: [10, 30] },
    story: { name: 'Short Story', maxLength: 1000, sparkReward: [10, 40] },
    painting: { name: 'Painting', sparkReward: [5, 25] },
    sculpture: { name: 'Sculpture', sparkReward: [10, 35] },
    mural: { name: 'Mural', sparkReward: [15, 50] }
  };

  // Handle artistic composition
  function handleCompose(msg, state) {
    const composeType = msg.payload.composeType || 'poem';
    const title = msg.payload.title || 'Untitled';
    const content = msg.payload.content || '';

    if (!COMPOSE_TYPES[composeType]) {
      return {
        success: false,
        error: 'Invalid compose type'
      };
    }

    const typeData = COMPOSE_TYPES[composeType];

    // Check max length for text-based types
    if (typeData.maxLength && content.length > typeData.maxLength) {
      return {
        success: false,
        error: 'Content exceeds maximum length of ' + typeData.maxLength + ' characters'
      };
    }

    const artwork = {
      id: generateId(),
      creator: msg.from,
      type: composeType,
      title: title,
      content: content,
      zone: msg.payload.zone || 'default',
      position: msg.payload.position || {x: 0, y: 0, z: 0},
      ts: Date.now(),
      likes: 0,
      featured: false,
      likedBy: []
    };

    if (!state.artworks) {
      state.artworks = [];
    }

    state.artworks.push(artwork);

    // Calculate spark reward
    const sparkMin = typeData.sparkReward[0];
    const sparkMax = typeData.sparkReward[1];
    const sparkReward = Math.floor(sparkMin + Math.random() * (sparkMax - sparkMin));

    return {
      success: true,
      state: state,
      artwork: artwork,
      sparkReward: sparkReward
    };
  }

  // Like an artwork
  function likeArtwork(artworkId, playerId, state) {
    if (!state.artworks) {
      return { success: false, error: 'No artworks found' };
    }

    const artwork = state.artworks.find(function(a) { return a.id === artworkId; });
    if (!artwork) {
      return { success: false, error: 'Artwork not found' };
    }

    if (!artwork.likedBy) {
      artwork.likedBy = [];
    }

    // Check if already liked
    if (artwork.likedBy.indexOf(playerId) !== -1) {
      return { success: false, error: 'Already liked this artwork' };
    }

    artwork.likedBy.push(playerId);
    artwork.likes = artwork.likedBy.length;

    return {
      success: true,
      artwork: artwork,
      totalLikes: artwork.likes
    };
  }

  // Get artworks in a zone
  function getArtworks(state, zone) {
    if (!state.artworks) return [];

    return state.artworks.filter(function(a) {
      return !zone || a.zone === zone;
    });
  }

  // Get artworks by player
  function getArtworksByPlayer(state, playerId) {
    if (!state.artworks) return [];

    return state.artworks.filter(function(a) {
      return a.creator === playerId;
    });
  }

  // Feature an artwork (most liked in zone)
  function featureArtwork(artworkId, state) {
    if (!state.artworks) {
      return { success: false, error: 'No artworks found' };
    }

    const artwork = state.artworks.find(function(a) { return a.id === artworkId; });
    if (!artwork) {
      return { success: false, error: 'Artwork not found' };
    }

    // Unfeature all other artworks in the same zone
    state.artworks.forEach(function(a) {
      if (a.zone === artwork.zone && a.id !== artworkId) {
        a.featured = false;
      }
    });

    artwork.featured = true;

    return {
      success: true,
      artwork: artwork
    };
  }

  // ========================================================================
  // PLAYER HOUSING SYSTEM — Claim plots in Commons, place furniture
  // ========================================================================

  var PLOT_SIZE = 10; // 10x10 area
  var MAX_FURNITURE_PER_PLOT = 20;
  var HOUSING_ZONE = 'commons'; // Only Commons allows housing plots

  // Available plots in Commons zone (arranged in a grid)
  var PLOT_GRID = [];
  (function initPlotGrid() {
    // 5x4 grid of plots starting at Commons zone center offset
    var baseX = 140, baseZ = 170;
    for (var row = 0; row < 4; row++) {
      for (var col = 0; col < 5; col++) {
        PLOT_GRID.push({
          id: 'plot_' + row + '_' + col,
          x: baseX + col * (PLOT_SIZE + 4),
          z: baseZ + row * (PLOT_SIZE + 4),
          row: row,
          col: col
        });
      }
    }
  })();

  // Player plots: playerId -> { plotId, furniture[], name, claimedAt }
  var playerPlots = {};

  // Furniture types available for housing
  var FURNITURE_TYPES = {
    bed: { name: 'Bed', icon: '&#128716;', cost: 25, description: 'A cozy place to rest' },
    table: { name: 'Table', icon: '&#128207;', cost: 15, description: 'A sturdy wooden table' },
    chair: { name: 'Chair', icon: '&#129681;', cost: 10, description: 'A comfortable chair' },
    bookshelf: { name: 'Bookshelf', icon: '&#128218;', cost: 30, description: 'Stores your favorite books' },
    lamp: { name: 'Lamp', icon: '&#128161;', cost: 12, description: 'Warm ambient light' },
    rug: { name: 'Rug', icon: '&#129531;', cost: 18, description: 'A decorative rug' },
    plant_pot: { name: 'Potted Plant', icon: '&#127793;', cost: 8, description: 'A cheerful houseplant' },
    fireplace: { name: 'Fireplace', icon: '&#128293;', cost: 40, description: 'Warm and inviting' },
    painting: { name: 'Painting', icon: '&#128444;', cost: 20, description: 'Art for your walls' },
    chest: { name: 'Storage Chest', icon: '&#128230;', cost: 22, description: 'Store your treasures' },
    fountain_small: { name: 'Small Fountain', icon: '&#9970;', cost: 35, description: 'A soothing water feature' },
    banner: { name: 'Banner', icon: '&#127988;', cost: 15, description: 'Show your colors' }
  };

  /**
   * Get available plots (unclaimed)
   * @returns {Array} List of available plot positions
   */
  function getAvailablePlots() {
    var claimed = {};
    Object.keys(playerPlots).forEach(function(pid) {
      claimed[playerPlots[pid].plotId] = true;
    });
    return PLOT_GRID.filter(function(plot) {
      return !claimed[plot.id];
    });
  }

  /**
   * Claim a plot for a player
   * @param {string} playerId - Player claiming the plot
   * @param {string} plotId - Plot to claim
   * @param {string} plotName - Name for the plot (e.g., "Kody's Cottage")
   * @returns {Object} Result with success, error, or plot data
   */
  function claimPlot(playerId, plotId, plotName) {
    // Check if player already has a plot
    if (playerPlots[playerId]) {
      return { success: false, error: 'You already have a plot. Release it first.' };
    }
    // Check if plot exists and is unclaimed
    var plotDef = PLOT_GRID.find(function(p) { return p.id === plotId; });
    if (!plotDef) {
      return { success: false, error: 'Plot not found' };
    }
    var alreadyClaimed = Object.keys(playerPlots).some(function(pid) {
      return playerPlots[pid].plotId === plotId;
    });
    if (alreadyClaimed) {
      return { success: false, error: 'Plot already claimed by another player' };
    }

    playerPlots[playerId] = {
      plotId: plotId,
      name: plotName || playerId + "'s Plot",
      furniture: [],
      claimedAt: Date.now(),
      position: { x: plotDef.x, z: plotDef.z },
      size: PLOT_SIZE
    };
    return { success: true, plot: playerPlots[playerId] };
  }

  /**
   * Get a player's plot
   */
  function getPlayerPlot(playerId) {
    return playerPlots[playerId] || null;
  }

  /**
   * Place furniture on a player's plot
   */
  function placeFurniture(playerId, furnitureType, localX, localZ) {
    var plot = playerPlots[playerId];
    if (!plot) return { success: false, error: 'You don\'t have a plot' };
    if (!FURNITURE_TYPES[furnitureType]) return { success: false, error: 'Unknown furniture type' };
    if (plot.furniture.length >= MAX_FURNITURE_PER_PLOT) {
      return { success: false, error: 'Plot is full (max ' + MAX_FURNITURE_PER_PLOT + ' items)' };
    }
    // Clamp to plot bounds
    localX = Math.max(0, Math.min(PLOT_SIZE - 1, localX || 0));
    localZ = Math.max(0, Math.min(PLOT_SIZE - 1, localZ || 0));

    var item = {
      id: 'furn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      type: furnitureType,
      localX: localX,
      localZ: localZ,
      placedAt: Date.now()
    };
    plot.furniture.push(item);
    return { success: true, item: item, cost: FURNITURE_TYPES[furnitureType].cost };
  }

  /**
   * Remove furniture from a player's plot
   */
  function removeFurniture(playerId, furnitureId) {
    var plot = playerPlots[playerId];
    if (!plot) return { success: false, error: 'You don\'t have a plot' };
    var idx = plot.furniture.findIndex(function(f) { return f.id === furnitureId; });
    if (idx === -1) return { success: false, error: 'Furniture not found' };
    plot.furniture.splice(idx, 1);
    return { success: true };
  }

  /**
   * Release a player's plot
   */
  function releasePlot(playerId) {
    if (!playerPlots[playerId]) return { success: false, error: 'You don\'t have a plot' };
    delete playerPlots[playerId];
    return { success: true };
  }

  /**
   * Get plot at world position (check if player is standing on a plot)
   */
  function getPlotAtPosition(worldX, worldZ) {
    for (var pid in playerPlots) {
      var plot = playerPlots[pid];
      if (worldX >= plot.position.x && worldX <= plot.position.x + PLOT_SIZE &&
          worldZ >= plot.position.z && worldZ <= plot.position.z + PLOT_SIZE) {
        return { playerId: pid, plot: plot };
      }
    }
    return null;
  }

  /**
   * Get all claimed plots (for minimap/world rendering)
   */
  function getAllPlots() {
    return playerPlots;
  }

  // Exports
  exports.PLANT_SPECIES = PLANT_SPECIES;
  exports.RECIPES = RECIPES;
  exports.STRUCTURE_TYPES = STRUCTURE_TYPES;
  exports.COMPOSE_TYPES = COMPOSE_TYPES;
  exports.handleBuild = handleBuild;
  exports.handlePlant = handlePlant;
  exports.handleHarvest = handleHarvest;
  exports.handleCraft = handleCraft;
  exports.handleCompose = handleCompose;
  exports.likeArtwork = likeArtwork;
  exports.getArtworks = getArtworks;
  exports.getArtworksByPlayer = getArtworksByPlayer;
  exports.featureArtwork = featureArtwork;
  exports.FURNITURE_TYPES = FURNITURE_TYPES;
  exports.PLOT_GRID = PLOT_GRID;
  exports.getAvailablePlots = getAvailablePlots;
  exports.claimPlot = claimPlot;
  exports.getPlayerPlot = getPlayerPlot;
  exports.placeFurniture = placeFurniture;
  exports.removeFurniture = removeFurniture;
  exports.releasePlot = releasePlot;
  exports.getPlotAtPosition = getPlotAtPosition;
  exports.getAllPlots = getAllPlots;

})(typeof module !== 'undefined' ? module.exports : (window.Creation = {}));
