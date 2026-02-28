(function(exports) {
  'use strict';

  // Crafting recipes — inferred from test expectations
  var RECIPES = {
    crystal_lamp: { materials: { wood: 2, crystal: 1 } },
    wooden_bench: { materials: { wood: 3 } },
    flower_crown: { materials: { sunflower: 2 } }
  };

  // Harvest yields by species
  var HARVEST_YIELDS = {
    wheat: { type: 'wheat', quantity: 10 },
    sunflower: { type: 'sunflower', quantity: 5 },
    oak_tree: { type: 'oak_wood', quantity: 3 }
  };

  // Default growth time: 5 minutes
  var DEFAULT_GROWTH_MS = 300000;

  function handleBuild(msg, state, zoneRules) {
    if (!zoneRules || !zoneRules.building) {
      return { success: false, error: 'Building is not allowed in this zone' };
    }

    var structure = {
      id: 'struct_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6),
      type: msg.payload.type,
      position: msg.payload.position || { x: 0, y: 0, z: 0 },
      zone: msg.payload.zone,
      builder: msg.from,
      builtAt: Date.now()
    };

    var newState = { structures: (state.structures || []).concat([structure]) };

    return { success: true, structure: structure, state: newState };
  }

  function handlePlant(msg, state, zoneRules) {
    if (!zoneRules || !zoneRules.harvesting) {
      return { success: false, error: 'Planting is not allowed in this zone' };
    }

    var now = Date.now();
    var garden = {
      id: 'garden_' + now.toString(36) + '_' + Math.random().toString(36).substr(2, 6),
      species: msg.payload.species,
      planter: msg.from,
      position: msg.payload.position || { x: 0, y: 0, z: 0 },
      zone: msg.payload.zone,
      plantedAt: now,
      readyAt: now + DEFAULT_GROWTH_MS,
      growthStage: 0
    };

    var newState = { gardens: (state.gardens || []).concat([garden]) };

    return { success: true, garden: garden, state: newState };
  }

  function handleHarvest(msg, state, zoneRules) {
    var target = msg.payload.target;
    var now = Date.now();

    // Find the garden
    var gardenIdx = -1;
    var garden = null;
    var gardens = state.gardens || [];
    for (var i = 0; i < gardens.length; i++) {
      if (gardens[i].id === target) {
        gardenIdx = i;
        garden = gardens[i];
        break;
      }
    }

    if (!garden) {
      return { success: false, error: 'Garden not found' };
    }

    // Check if plant is ready
    if (now < garden.readyAt && garden.growthStage < 1.0) {
      return { success: false, error: 'Plant is not ready for harvest' };
    }

    // Determine yield
    var yieldInfo = HARVEST_YIELDS[garden.species] || { type: garden.species, quantity: 1 };
    var items = [{ type: yieldInfo.type, quantity: yieldInfo.quantity }];

    // Remove garden from state
    var remaining = gardens.slice();
    remaining.splice(gardenIdx, 1);

    return { success: true, items: items, state: { gardens: remaining } };
  }

  function handleCraft(msg, state) {
    var recipeName = msg.payload.recipe;
    var recipe = RECIPES[recipeName];

    if (!recipe) {
      return { success: false, error: 'Unknown recipe: ' + recipeName };
    }

    var player = state.players[msg.from];
    if (!player || !player.inventory) {
      return { success: false, error: 'Player not found or has no inventory' };
    }

    var inventory = player.inventory;

    // Check materials
    var materialNames = Object.keys(recipe.materials);
    for (var i = 0; i < materialNames.length; i++) {
      var mat = materialNames[i];
      var needed = recipe.materials[mat];
      var have = inventory[mat] || 0;
      if (have < needed) {
        return { success: false, error: 'Insufficient materials: need ' + needed + ' ' + mat + ', have ' + have };
      }
    }

    // Deep clone state to avoid mutation
    var newState = JSON.parse(JSON.stringify(state));

    // Consume materials
    for (var j = 0; j < materialNames.length; j++) {
      var m = materialNames[j];
      newState.players[msg.from].inventory[m] -= recipe.materials[m];
    }

    // Add crafted item
    if (!newState.players[msg.from].inventory[recipeName]) {
      newState.players[msg.from].inventory[recipeName] = 0;
    }
    newState.players[msg.from].inventory[recipeName] += 1;

    var item = { type: recipeName, craftedBy: msg.from, craftedAt: Date.now() };

    return { success: true, item: item, state: newState };
  }

  function handleCompose(msg, state) {
    var composition = {
      id: 'comp_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6),
      type: 'composition',
      medium: msg.payload.medium,
      content: msg.payload.content,
      creator: msg.from,
      position: msg.payload.position || { x: 0, y: 0, z: 0 },
      zone: msg.payload.zone,
      createdAt: Date.now()
    };

    var newStructures = (state.structures || []).concat([composition]);

    return {
      success: true,
      composition: composition,
      state: { structures: newStructures }
    };
  }

  exports.Creation = {
    RECIPES: RECIPES,
    HARVEST_YIELDS: HARVEST_YIELDS,
    handleBuild: handleBuild,
    handlePlant: handlePlant,
    handleHarvest: handleHarvest,
    handleCraft: handleCraft,
    handleCompose: handleCompose
  };

  if (typeof module !== 'undefined') {
    module.exports = exports.Creation;
  }
})(typeof module !== 'undefined' ? module.exports : (window.ZION = window.ZION || {}));
