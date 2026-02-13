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

  // Handle artistic composition
  function handleCompose(msg, state) {
    const composition = {
      id: generateId(),
      type: 'composition',
      medium: msg.payload.medium || 'text',
      content: msg.payload.content || '',
      creator: msg.from,
      position: msg.payload.position || {x: 0, y: 0, z: 0},
      zone: msg.payload.zone || 'default',
      ts: Date.now()
    };

    if (!state.structures) {
      state.structures = [];
    }

    state.structures.push(composition);

    return {
      success: true,
      state: state,
      composition: composition
    };
  }

  // Exports
  exports.PLANT_SPECIES = PLANT_SPECIES;
  exports.RECIPES = RECIPES;
  exports.STRUCTURE_TYPES = STRUCTURE_TYPES;
  exports.handleBuild = handleBuild;
  exports.handlePlant = handlePlant;
  exports.handleHarvest = handleHarvest;
  exports.handleCraft = handleCraft;
  exports.handleCompose = handleCompose;

})(typeof module !== 'undefined' ? module.exports : (window.Creation = {}));
