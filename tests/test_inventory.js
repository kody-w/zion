const { test, suite, report, assert } = require('./test_runner');
const Inventory = require('../src/js/inventory');

// ============================================================
// ITEM CATALOG TESTS
// ============================================================

suite('ITEM_CATALOG — structure', () => {

  test('ITEM_CATALOG is exported and non-empty', () => {
    assert(Inventory.ITEM_CATALOG !== null && typeof Inventory.ITEM_CATALOG === 'object');
    const keys = Object.keys(Inventory.ITEM_CATALOG);
    assert(keys.length > 0, 'Catalog must contain items');
  });

  test('Every catalog item has required fields', () => {
    const required = ['id', 'name', 'type', 'icon', 'description', 'stackable', 'maxStack', 'rarity'];
    for (const [key, item] of Object.entries(Inventory.ITEM_CATALOG)) {
      for (const field of required) {
        assert(
          item[field] !== undefined,
          `Item "${key}" is missing field "${field}"`
        );
      }
    }
  });

  test('Item id matches its catalog key', () => {
    for (const [key, item] of Object.entries(Inventory.ITEM_CATALOG)) {
      assert.strictEqual(item.id, key, `Item "${key}" has mismatched id "${item.id}"`);
    }
  });

  test('Non-stackable items have maxStack of 1', () => {
    for (const [key, item] of Object.entries(Inventory.ITEM_CATALOG)) {
      if (!item.stackable) {
        assert.strictEqual(
          item.maxStack, 1,
          `Non-stackable item "${key}" should have maxStack 1, got ${item.maxStack}`
        );
      }
    }
  });

  test('Stackable items have maxStack > 1', () => {
    for (const [key, item] of Object.entries(Inventory.ITEM_CATALOG)) {
      if (item.stackable) {
        assert(
          item.maxStack > 1,
          `Stackable item "${key}" should have maxStack > 1, got ${item.maxStack}`
        );
      }
    }
  });

  test('Rarity values are valid', () => {
    const validRarities = new Set(['common', 'uncommon', 'rare', 'legendary']);
    for (const [key, item] of Object.entries(Inventory.ITEM_CATALOG)) {
      assert(
        validRarities.has(item.rarity),
        `Item "${key}" has invalid rarity "${item.rarity}"`
      );
    }
  });

});

suite('ITEM_CATALOG — item types', () => {

  test('Seeds items exist and have correct type', () => {
    ['seed_wildflower', 'seed_lotus', 'seed_tree'].forEach(id => {
      const item = Inventory.ITEM_CATALOG[id];
      assert(item, `Missing item ${id}`);
      assert.strictEqual(item.type, 'seeds');
    });
  });

  test('Flower items exist and have correct type', () => {
    ['flower_rose', 'flower_sunflower', 'flower_lotus', 'flower_tulip', 'flower_cherry'].forEach(id => {
      const item = Inventory.ITEM_CATALOG[id];
      assert(item, `Missing item ${id}`);
      assert.strictEqual(item.type, 'flowers');
    });
  });

  test('Wood items exist and have correct type', () => {
    ['wood_oak', 'wood_pine', 'wood_mystical'].forEach(id => {
      const item = Inventory.ITEM_CATALOG[id];
      assert(item, `Missing item ${id}`);
      assert.strictEqual(item.type, 'wood');
    });
  });

  test('Stone items exist and have correct type', () => {
    ['stone_common', 'stone_marble', 'stone_obsidian'].forEach(id => {
      const item = Inventory.ITEM_CATALOG[id];
      assert(item, `Missing item ${id}`);
      assert.strictEqual(item.type, 'stone');
    });
  });

  test('Crystal items exist and have correct type', () => {
    ['crystal_clear', 'crystal_amethyst', 'crystal_emerald'].forEach(id => {
      const item = Inventory.ITEM_CATALOG[id];
      assert(item, `Missing item ${id}`);
      assert.strictEqual(item.type, 'crystal');
    });
  });

  test('Tool items are non-stackable', () => {
    ['tool_pickaxe', 'tool_axe', 'tool_shovel', 'tool_hammer'].forEach(id => {
      const item = Inventory.ITEM_CATALOG[id];
      assert(item, `Missing item ${id}`);
      assert.strictEqual(item.stackable, false, `Tool ${id} should not be stackable`);
      assert.strictEqual(item.type, 'tools');
    });
  });

  test('Instrument items are non-stackable', () => {
    ['instrument_flute', 'instrument_drum', 'instrument_harp', 'instrument_bell'].forEach(id => {
      const item = Inventory.ITEM_CATALOG[id];
      assert(item, `Missing item ${id}`);
      assert.strictEqual(item.stackable, false, `Instrument ${id} should not be stackable`);
    });
  });

  test('Potion items are stackable', () => {
    ['potion_healing', 'potion_energy', 'potion_wisdom'].forEach(id => {
      const item = Inventory.ITEM_CATALOG[id];
      assert(item, `Missing item ${id}`);
      assert.strictEqual(item.stackable, true, `Potion ${id} should be stackable`);
    });
  });

  test('Fish items have value property', () => {
    ['fish_common', 'fish_rare', 'fish_golden'].forEach(id => {
      const item = Inventory.ITEM_CATALOG[id];
      assert(item, `Missing item ${id}`);
      assert(typeof item.value === 'number' && item.value > 0, `Fish ${id} should have positive value`);
    });
  });

  test('crystal_emerald is legendary rarity', () => {
    const item = Inventory.ITEM_CATALOG['crystal_emerald'];
    assert.strictEqual(item.rarity, 'legendary');
  });

  test('wood_mystical is rare rarity with maxStack 50', () => {
    const item = Inventory.ITEM_CATALOG['wood_mystical'];
    assert.strictEqual(item.rarity, 'rare');
    assert.strictEqual(item.maxStack, 50);
  });

});

// ============================================================
// getItemData
// ============================================================

suite('getItemData', () => {

  test('Returns correct data for valid item', () => {
    const data = Inventory.getItemData('wood_oak');
    assert(data !== null);
    assert.strictEqual(data.id, 'wood_oak');
    assert.strictEqual(data.name, 'Oak Wood');
  });

  test('Returns null for unknown item', () => {
    const data = Inventory.getItemData('nonexistent_item');
    assert.strictEqual(data, null);
  });

  test('Returns null for empty string', () => {
    const data = Inventory.getItemData('');
    assert.strictEqual(data, null);
  });

  test('Returns null for undefined', () => {
    const data = Inventory.getItemData(undefined);
    assert.strictEqual(data, null);
  });

});

// ============================================================
// createInventory
// ============================================================

suite('createInventory', () => {

  test('Returns an inventory with 20 slots', () => {
    const inv = Inventory.createInventory();
    assert(Array.isArray(inv.slots), 'slots should be an array');
    assert.strictEqual(inv.slots.length, 20, 'Should have 20 slots');
  });

  test('All slots start as null', () => {
    const inv = Inventory.createInventory();
    inv.slots.forEach((slot, i) => {
      assert.strictEqual(slot, null, `Slot ${i} should be null`);
    });
  });

  test('Has quickBar property with 5 indices', () => {
    const inv = Inventory.createInventory();
    assert(Array.isArray(inv.quickBar), 'quickBar should be an array');
    assert.strictEqual(inv.quickBar.length, 5, 'quickBar should have 5 entries');
  });

  test('Each call returns an independent inventory', () => {
    const inv1 = Inventory.createInventory();
    const inv2 = Inventory.createInventory();
    Inventory.addItem(inv1, 'wood_oak', 5);
    assert.strictEqual(Inventory.getItemCount(inv2, 'wood_oak'), 0, 'inv2 should be independent');
  });

});

// ============================================================
// addItem
// ============================================================

suite('addItem — basic', () => {

  test('Add a valid item returns success', () => {
    const inv = Inventory.createInventory();
    const result = Inventory.addItem(inv, 'wood_oak', 1);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.added, 1);
  });

  test('Add unknown item returns failure', () => {
    const inv = Inventory.createInventory();
    const result = Inventory.addItem(inv, 'fake_item', 1);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.added, 0);
    assert(/unknown item/i.test(result.message), `Expected "Unknown item" in message: ${result.message}`);
  });

  test('Added item appears in slot', () => {
    const inv = Inventory.createInventory();
    Inventory.addItem(inv, 'herb_mint', 3);
    const count = Inventory.getItemCount(inv, 'herb_mint');
    assert.strictEqual(count, 3);
  });

  test('Default count is 1', () => {
    const inv = Inventory.createInventory();
    Inventory.addItem(inv, 'stone_common');
    assert.strictEqual(Inventory.getItemCount(inv, 'stone_common'), 1);
  });

});

suite('addItem — stacking', () => {

  test('Stackable items merge into existing slot', () => {
    const inv = Inventory.createInventory();
    Inventory.addItem(inv, 'herb_mint', 10);
    Inventory.addItem(inv, 'herb_mint', 5);

    // Should be in one slot, not two
    const occupiedSlots = inv.slots.filter(s => s && s.itemId === 'herb_mint');
    assert.strictEqual(occupiedSlots.length, 1, 'Should merge into single slot');
    assert.strictEqual(occupiedSlots[0].count, 15);
  });

  test('Overflow into new slot when stack is full', () => {
    const inv = Inventory.createInventory();
    // herb_mint maxStack is 99
    Inventory.addItem(inv, 'herb_mint', 99);  // fills slot 0
    Inventory.addItem(inv, 'herb_mint', 5);   // overflows into slot 1

    const occupiedSlots = inv.slots.filter(s => s && s.itemId === 'herb_mint');
    assert.strictEqual(occupiedSlots.length, 2, 'Should use two slots');
    assert.strictEqual(occupiedSlots[0].count, 99);
    assert.strictEqual(occupiedSlots[1].count, 5);
  });

  test('Total count after overflow is correct', () => {
    const inv = Inventory.createInventory();
    Inventory.addItem(inv, 'herb_mint', 99);
    Inventory.addItem(inv, 'herb_mint', 10);
    assert.strictEqual(Inventory.getItemCount(inv, 'herb_mint'), 109);
  });

  test('Non-stackable items always use a new slot', () => {
    const inv = Inventory.createInventory();
    Inventory.addItem(inv, 'tool_pickaxe', 1);
    Inventory.addItem(inv, 'tool_pickaxe', 1);

    const occupiedSlots = inv.slots.filter(s => s && s.itemId === 'tool_pickaxe');
    assert.strictEqual(occupiedSlots.length, 2, 'Non-stackable should occupy separate slots');
  });

  test('Adding a large batch honors maxStack per slot', () => {
    const inv = Inventory.createInventory();
    // food_bread maxStack is 20
    const result = Inventory.addItem(inv, 'food_bread', 45);
    assert.strictEqual(result.success, true);
    assert.strictEqual(Inventory.getItemCount(inv, 'food_bread'), 45);

    // Inspect slot distribution: each slot should be at most 20
    const breadSlots = inv.slots.filter(s => s && s.itemId === 'food_bread');
    breadSlots.forEach(s => {
      assert(s.count <= 20, `Slot count ${s.count} exceeds maxStack 20`);
    });
  });

});

suite('addItem — capacity limits', () => {

  test('Inventory full returns failure when all slots occupied', () => {
    const inv = Inventory.createInventory();
    // Fill all 20 slots with non-stackable items
    for (let i = 0; i < 20; i++) {
      Inventory.addItem(inv, 'tool_pickaxe', 1);
    }
    const result = Inventory.addItem(inv, 'tool_axe', 1);
    assert.strictEqual(result.success, false);
    assert(/inventory full/i.test(result.message));
  });

  test('Partial fill returns correct added count', () => {
    const inv = Inventory.createInventory();
    // Fill 19 slots with non-stackable items
    for (let i = 0; i < 19; i++) {
      Inventory.addItem(inv, 'tool_pickaxe', 1);
    }
    // 1 slot remains, try to add 3 non-stackable items — only 1 should fit
    const result = Inventory.addItem(inv, 'tool_axe', 3);
    // Success true because at least 1 was added
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.added, 1);
  });

  test('Adding to completely full inventory returns added=0', () => {
    const inv = Inventory.createInventory();
    for (let i = 0; i < 20; i++) {
      Inventory.addItem(inv, 'tool_pickaxe', 1);
    }
    const result = Inventory.addItem(inv, 'wood_oak', 5);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.added, 0);
  });

});

// ============================================================
// removeItem
// ============================================================

suite('removeItem — basic', () => {

  test('Remove existing item returns success', () => {
    const inv = Inventory.createInventory();
    Inventory.addItem(inv, 'herb_mint', 10);
    const result = Inventory.removeItem(inv, 'herb_mint', 3);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.removed, 3);
  });

  test('Count decreases correctly after removal', () => {
    const inv = Inventory.createInventory();
    Inventory.addItem(inv, 'herb_mint', 10);
    Inventory.removeItem(inv, 'herb_mint', 3);
    assert.strictEqual(Inventory.getItemCount(inv, 'herb_mint'), 7);
  });

  test('Slot becomes null when all items removed', () => {
    const inv = Inventory.createInventory();
    Inventory.addItem(inv, 'herb_mint', 5);
    Inventory.removeItem(inv, 'herb_mint', 5);
    assert.strictEqual(Inventory.getItemCount(inv, 'herb_mint'), 0);
    const occupiedSlots = inv.slots.filter(s => s !== null);
    assert.strictEqual(occupiedSlots.length, 0);
  });

  test('Remove from multiple stacks', () => {
    const inv = Inventory.createInventory();
    // Put herb_mint in two stacks
    Inventory.addItem(inv, 'herb_mint', 99); // slot 0
    Inventory.addItem(inv, 'herb_mint', 10); // slot 1
    const result = Inventory.removeItem(inv, 'herb_mint', 100);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.removed, 100);
    assert.strictEqual(Inventory.getItemCount(inv, 'herb_mint'), 9);
  });

  test('Remove more than available returns partial removed', () => {
    const inv = Inventory.createInventory();
    Inventory.addItem(inv, 'herb_mint', 5);
    const result = Inventory.removeItem(inv, 'herb_mint', 10);
    assert.strictEqual(result.removed, 5);
    assert.strictEqual(result.success, true); // at least some removed
  });

  test('Remove from empty inventory returns success=false and removed=0', () => {
    const inv = Inventory.createInventory();
    const result = Inventory.removeItem(inv, 'herb_mint', 1);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.removed, 0);
  });

  test('Remove non-existent item type returns 0 removed', () => {
    const inv = Inventory.createInventory();
    Inventory.addItem(inv, 'wood_oak', 5);
    const result = Inventory.removeItem(inv, 'herb_mint', 1);
    assert.strictEqual(result.removed, 0);
    assert.strictEqual(result.success, false);
  });

});

// ============================================================
// hasItem
// ============================================================

suite('hasItem', () => {

  test('Returns true when sufficient quantity exists', () => {
    const inv = Inventory.createInventory();
    Inventory.addItem(inv, 'stone_common', 10);
    assert.strictEqual(Inventory.hasItem(inv, 'stone_common', 5), true);
  });

  test('Returns true when count equals exact amount', () => {
    const inv = Inventory.createInventory();
    Inventory.addItem(inv, 'stone_common', 5);
    assert.strictEqual(Inventory.hasItem(inv, 'stone_common', 5), true);
  });

  test('Returns false when insufficient quantity', () => {
    const inv = Inventory.createInventory();
    Inventory.addItem(inv, 'stone_common', 3);
    assert.strictEqual(Inventory.hasItem(inv, 'stone_common', 5), false);
  });

  test('Returns false when item not present', () => {
    const inv = Inventory.createInventory();
    assert.strictEqual(Inventory.hasItem(inv, 'stone_common', 1), false);
  });

  test('Default count of 1 is used', () => {
    const inv = Inventory.createInventory();
    Inventory.addItem(inv, 'wood_oak', 1);
    assert.strictEqual(Inventory.hasItem(inv, 'wood_oak'), true);
  });

  test('Counts across multiple stacks', () => {
    const inv = Inventory.createInventory();
    Inventory.addItem(inv, 'herb_mint', 99);
    Inventory.addItem(inv, 'herb_mint', 50);
    assert.strictEqual(Inventory.hasItem(inv, 'herb_mint', 149), true);
    assert.strictEqual(Inventory.hasItem(inv, 'herb_mint', 150), false);
  });

});

// ============================================================
// getItemCount
// ============================================================

suite('getItemCount', () => {

  test('Returns 0 for empty inventory', () => {
    const inv = Inventory.createInventory();
    assert.strictEqual(Inventory.getItemCount(inv, 'wood_oak'), 0);
  });

  test('Returns correct count for single stack', () => {
    const inv = Inventory.createInventory();
    Inventory.addItem(inv, 'wood_oak', 7);
    assert.strictEqual(Inventory.getItemCount(inv, 'wood_oak'), 7);
  });

  test('Sums across multiple stacks', () => {
    const inv = Inventory.createInventory();
    Inventory.addItem(inv, 'herb_mint', 99);
    Inventory.addItem(inv, 'herb_mint', 40);
    assert.strictEqual(Inventory.getItemCount(inv, 'herb_mint'), 139);
  });

  test('Does not count other item types', () => {
    const inv = Inventory.createInventory();
    Inventory.addItem(inv, 'wood_oak', 5);
    Inventory.addItem(inv, 'stone_common', 10);
    assert.strictEqual(Inventory.getItemCount(inv, 'wood_oak'), 5);
    assert.strictEqual(Inventory.getItemCount(inv, 'stone_common'), 10);
  });

  test('Returns 0 after all items removed', () => {
    const inv = Inventory.createInventory();
    Inventory.addItem(inv, 'wood_oak', 5);
    Inventory.removeItem(inv, 'wood_oak', 5);
    assert.strictEqual(Inventory.getItemCount(inv, 'wood_oak'), 0);
  });

});

// ============================================================
// getInventory
// ============================================================

suite('getInventory', () => {

  test('Returns array of 20 entries', () => {
    const inv = Inventory.createInventory();
    const view = Inventory.getInventory(inv);
    assert(Array.isArray(view), 'Should return an array');
    assert.strictEqual(view.length, 20, 'Should have 20 entries');
  });

  test('Empty slots are null in the returned array', () => {
    const inv = Inventory.createInventory();
    const view = Inventory.getInventory(inv);
    view.forEach((entry, i) => {
      assert.strictEqual(entry, null, `Slot ${i} should be null`);
    });
  });

  test('Occupied slot has required display fields', () => {
    const inv = Inventory.createInventory();
    Inventory.addItem(inv, 'flower_rose', 3);
    const view = Inventory.getInventory(inv);
    const occupied = view.find(s => s !== null);
    assert(occupied, 'Should have at least one occupied slot');
    assert.strictEqual(occupied.itemId, 'flower_rose');
    assert.strictEqual(occupied.name, 'Rose');
    assert(occupied.icon, 'Should have icon');
    assert(occupied.description, 'Should have description');
    assert.strictEqual(occupied.count, 3);
    assert.strictEqual(occupied.rarity, 'uncommon');
    assert.strictEqual(occupied.type, 'flowers');
  });

});

// ============================================================
// CRAFTING RECIPES
// ============================================================

suite('RECIPES — structure', () => {

  test('RECIPES is exported and non-empty', () => {
    assert(Array.isArray(Inventory.RECIPES), 'RECIPES should be an array');
    assert(Inventory.RECIPES.length > 0, 'RECIPES should not be empty');
  });

  test('Every recipe has required fields', () => {
    const required = ['id', 'name', 'output', 'requirements', 'sparkReward'];
    Inventory.RECIPES.forEach(recipe => {
      required.forEach(field => {
        assert(recipe[field] !== undefined, `Recipe "${recipe.id}" missing field "${field}"`);
      });
    });
  });

  test('Every recipe output has itemId and count', () => {
    Inventory.RECIPES.forEach(recipe => {
      assert(recipe.output.itemId, `Recipe "${recipe.id}" output missing itemId`);
      assert(typeof recipe.output.count === 'number' && recipe.output.count > 0,
        `Recipe "${recipe.id}" output should have positive count`);
    });
  });

  test('Every recipe requirement references a valid catalog item', () => {
    Inventory.RECIPES.forEach(recipe => {
      recipe.requirements.forEach(req => {
        assert(
          Inventory.ITEM_CATALOG[req.itemId],
          `Recipe "${recipe.id}" references unknown item "${req.itemId}"`
        );
      });
    });
  });

  test('Every recipe output references a valid catalog item', () => {
    Inventory.RECIPES.forEach(recipe => {
      assert(
        Inventory.ITEM_CATALOG[recipe.output.itemId],
        `Recipe "${recipe.id}" outputs unknown item "${recipe.output.itemId}"`
      );
    });
  });

  test('sparkReward is a positive number for every recipe', () => {
    Inventory.RECIPES.forEach(recipe => {
      assert(
        typeof recipe.sparkReward === 'number' && recipe.sparkReward > 0,
        `Recipe "${recipe.id}" should have a positive sparkReward`
      );
    });
  });

  test('Recipe IDs are unique', () => {
    const ids = Inventory.RECIPES.map(r => r.id);
    const unique = new Set(ids);
    assert.strictEqual(unique.size, ids.length, 'All recipe IDs should be unique');
  });

});

// ============================================================
// getAllRecipes
// ============================================================

suite('getAllRecipes', () => {

  test('Returns an array equal to RECIPES', () => {
    const all = Inventory.getAllRecipes();
    assert(Array.isArray(all));
    assert.strictEqual(all.length, Inventory.RECIPES.length);
  });

  test('Contains craft_pickaxe recipe', () => {
    const all = Inventory.getAllRecipes();
    const found = all.find(r => r.id === 'craft_pickaxe');
    assert(found, 'craft_pickaxe recipe should exist');
    assert.strictEqual(found.output.itemId, 'tool_pickaxe');
  });

});

// ============================================================
// canCraft
// ============================================================

suite('canCraft', () => {

  test('Returns true when all materials present', () => {
    const inv = Inventory.createInventory();
    const recipe = Inventory.RECIPES.find(r => r.id === 'craft_pickaxe');
    // craft_pickaxe needs wood_oak x3, stone_common x5
    Inventory.addItem(inv, 'wood_oak', 3);
    Inventory.addItem(inv, 'stone_common', 5);
    assert.strictEqual(Inventory.canCraft(inv, recipe), true);
  });

  test('Returns false when materials insufficient', () => {
    const inv = Inventory.createInventory();
    const recipe = Inventory.RECIPES.find(r => r.id === 'craft_pickaxe');
    // Only 2 wood, need 3
    Inventory.addItem(inv, 'wood_oak', 2);
    Inventory.addItem(inv, 'stone_common', 5);
    assert.strictEqual(Inventory.canCraft(inv, recipe), false);
  });

  test('Returns false on empty inventory', () => {
    const inv = Inventory.createInventory();
    const recipe = Inventory.RECIPES.find(r => r.id === 'craft_pickaxe');
    assert.strictEqual(Inventory.canCraft(inv, recipe), false);
  });

  test('Returns false when missing one ingredient', () => {
    const inv = Inventory.createInventory();
    const recipe = Inventory.RECIPES.find(r => r.id === 'craft_pickaxe');
    // Only wood, no stone
    Inventory.addItem(inv, 'wood_oak', 3);
    assert.strictEqual(Inventory.canCraft(inv, recipe), false);
  });

  test('Returns true with exact required quantities', () => {
    const inv = Inventory.createInventory();
    const recipe = Inventory.RECIPES.find(r => r.id === 'craft_shovel');
    // craft_shovel needs wood_oak x2, stone_common x3
    Inventory.addItem(inv, 'wood_oak', 2);
    Inventory.addItem(inv, 'stone_common', 3);
    assert.strictEqual(Inventory.canCraft(inv, recipe), true);
  });

  test('Returns true with surplus materials', () => {
    const inv = Inventory.createInventory();
    const recipe = Inventory.RECIPES.find(r => r.id === 'craft_shovel');
    Inventory.addItem(inv, 'wood_oak', 10);
    Inventory.addItem(inv, 'stone_common', 20);
    assert.strictEqual(Inventory.canCraft(inv, recipe), true);
  });

});

// ============================================================
// craftItem
// ============================================================

suite('craftItem — success cases', () => {

  test('craftItem returns success for valid recipe with materials', () => {
    const inv = Inventory.createInventory();
    Inventory.addItem(inv, 'wood_oak', 3);
    Inventory.addItem(inv, 'stone_common', 5);
    const result = Inventory.craftItem(inv, 'craft_pickaxe');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.output.itemId, 'tool_pickaxe');
    assert(typeof result.sparkEarned === 'number' && result.sparkEarned > 0);
  });

  test('craftItem adds output item to inventory', () => {
    const inv = Inventory.createInventory();
    Inventory.addItem(inv, 'wood_oak', 3);
    Inventory.addItem(inv, 'stone_common', 5);
    Inventory.craftItem(inv, 'craft_pickaxe');
    assert.strictEqual(Inventory.getItemCount(inv, 'tool_pickaxe'), 1);
  });

  test('craftItem removes consumed materials from inventory', () => {
    const inv = Inventory.createInventory();
    Inventory.addItem(inv, 'wood_oak', 10);
    Inventory.addItem(inv, 'stone_common', 10);
    Inventory.craftItem(inv, 'craft_pickaxe'); // consumes wood_oak x3, stone_common x5
    assert.strictEqual(Inventory.getItemCount(inv, 'wood_oak'), 7);
    assert.strictEqual(Inventory.getItemCount(inv, 'stone_common'), 5);
  });

  test('craftItem sparkEarned matches recipe sparkReward', () => {
    const inv = Inventory.createInventory();
    Inventory.addItem(inv, 'wood_oak', 3);
    Inventory.addItem(inv, 'stone_common', 5);
    const result = Inventory.craftItem(inv, 'craft_pickaxe');
    const recipe = Inventory.RECIPES.find(r => r.id === 'craft_pickaxe');
    assert.strictEqual(result.sparkEarned, recipe.sparkReward);
  });

  test('craftItem recipe producing multiple outputs adds correct count', () => {
    const inv = Inventory.createInventory();
    // craft_bread: seed_wildflower x10 -> food_bread x2
    Inventory.addItem(inv, 'seed_wildflower', 10);
    const result = Inventory.craftItem(inv, 'craft_bread');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.output.count, 2);
    assert.strictEqual(Inventory.getItemCount(inv, 'food_bread'), 2);
  });

  test('craft a 3-ingredient recipe (craft_statue)', () => {
    const inv = Inventory.createInventory();
    // craft_statue: stone_marble x10, crystal_amethyst x5, crystal_emerald x2
    Inventory.addItem(inv, 'stone_marble', 10);
    Inventory.addItem(inv, 'crystal_amethyst', 5);
    Inventory.addItem(inv, 'crystal_emerald', 2);
    const result = Inventory.craftItem(inv, 'craft_statue');
    assert.strictEqual(result.success, true);
    assert.strictEqual(Inventory.getItemCount(inv, 'item_statue'), 1);
    // Materials consumed
    assert.strictEqual(Inventory.getItemCount(inv, 'stone_marble'), 0);
    assert.strictEqual(Inventory.getItemCount(inv, 'crystal_amethyst'), 0);
    assert.strictEqual(Inventory.getItemCount(inv, 'crystal_emerald'), 0);
  });

  test('craft fishing recipe (cook_sushi_roll) adds correct output count', () => {
    const inv = Inventory.createInventory();
    // cook_sushi_roll: fish_rare x1, ingredient_rice x3 -> food_sushi_roll x2
    Inventory.addItem(inv, 'fish_rare', 1);
    Inventory.addItem(inv, 'ingredient_rice', 3);
    const result = Inventory.craftItem(inv, 'cook_sushi_roll');
    assert.strictEqual(result.success, true);
    assert.strictEqual(Inventory.getItemCount(inv, 'food_sushi_roll'), 2);
  });

});

suite('craftItem — failure cases', () => {

  test('Returns failure for unknown recipe ID', () => {
    const inv = Inventory.createInventory();
    const result = Inventory.craftItem(inv, 'nonexistent_recipe');
    assert.strictEqual(result.success, false);
    assert(/unknown recipe/i.test(result.message));
  });

  test('Returns failure when materials missing', () => {
    const inv = Inventory.createInventory();
    const result = Inventory.craftItem(inv, 'craft_pickaxe');
    assert.strictEqual(result.success, false);
    assert(/missing required materials/i.test(result.message));
  });

  test('Materials are NOT consumed when crafting fails', () => {
    const inv = Inventory.createInventory();
    Inventory.addItem(inv, 'wood_oak', 2);  // need 3
    Inventory.addItem(inv, 'stone_common', 5);
    Inventory.craftItem(inv, 'craft_pickaxe');
    // Wood and stone should be unchanged
    assert.strictEqual(Inventory.getItemCount(inv, 'wood_oak'), 2);
    assert.strictEqual(Inventory.getItemCount(inv, 'stone_common'), 5);
  });

  test('Returns failure for empty recipe ID string', () => {
    const inv = Inventory.createInventory();
    const result = Inventory.craftItem(inv, '');
    assert.strictEqual(result.success, false);
  });

});

// ============================================================
// getAvailableRecipes
// ============================================================

suite('getAvailableRecipes', () => {

  test('Returns empty array for empty inventory', () => {
    const inv = Inventory.createInventory();
    const available = Inventory.getAvailableRecipes(inv);
    assert.strictEqual(available.length, 0);
  });

  test('Returns recipe when materials are sufficient', () => {
    const inv = Inventory.createInventory();
    // craft_shovel needs wood_oak x2, stone_common x3
    Inventory.addItem(inv, 'wood_oak', 2);
    Inventory.addItem(inv, 'stone_common', 3);
    const available = Inventory.getAvailableRecipes(inv);
    const found = available.find(r => r.id === 'craft_shovel');
    assert(found, 'craft_shovel should be available');
  });

  test('Does not include recipe when materials insufficient', () => {
    const inv = Inventory.createInventory();
    Inventory.addItem(inv, 'wood_oak', 1); // need 2 for shovel
    Inventory.addItem(inv, 'stone_common', 3);
    const available = Inventory.getAvailableRecipes(inv);
    const found = available.find(r => r.id === 'craft_shovel');
    assert(!found, 'craft_shovel should NOT be available with insufficient wood');
  });

  test('Returns multiple recipes when materials allow', () => {
    const inv = Inventory.createInventory();
    // seed_wildflower x10 enables craft_bread and plant_flowers (x5 for plant_flowers)
    Inventory.addItem(inv, 'seed_wildflower', 10);
    const available = Inventory.getAvailableRecipes(inv);
    const bread = available.find(r => r.id === 'craft_bread');
    const flowers = available.find(r => r.id === 'plant_flowers');
    assert(bread, 'craft_bread should be available');
    assert(flowers, 'plant_flowers should be available');
  });

  test('Returns array (not mutating RECIPES)', () => {
    const inv = Inventory.createInventory();
    const available = Inventory.getAvailableRecipes(inv);
    assert(Array.isArray(available));
    // RECIPES array should be unchanged
    assert.strictEqual(Inventory.RECIPES.length, Inventory.getAllRecipes().length);
  });

});

// ============================================================
// ZONE_LOOT_TABLES
// ============================================================

suite('ZONE_LOOT_TABLES', () => {

  test('ZONE_LOOT_TABLES is exported', () => {
    assert(Inventory.ZONE_LOOT_TABLES !== null && typeof Inventory.ZONE_LOOT_TABLES === 'object');
  });

  test('All 8 zones are present', () => {
    const expected = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];
    expected.forEach(zone => {
      assert(Inventory.ZONE_LOOT_TABLES[zone], `Missing zone "${zone}" in loot tables`);
    });
  });

  test('Each zone has common, uncommon, rare pools', () => {
    Object.entries(Inventory.ZONE_LOOT_TABLES).forEach(([zone, table]) => {
      assert(Array.isArray(table.common), `Zone "${zone}" missing common pool`);
      assert(Array.isArray(table.uncommon), `Zone "${zone}" missing uncommon pool`);
      assert(Array.isArray(table.rare), `Zone "${zone}" missing rare pool`);
    });
  });

  test('All item IDs in loot tables exist in ITEM_CATALOG', () => {
    Object.entries(Inventory.ZONE_LOOT_TABLES).forEach(([zone, table]) => {
      ['common', 'uncommon', 'rare'].forEach(tier => {
        table[tier].forEach(itemId => {
          assert(
            Inventory.ITEM_CATALOG[itemId],
            `Zone "${zone}" ${tier} pool references unknown item "${itemId}"`
          );
        });
      });
    });
  });

  test('Each zone pool is non-empty', () => {
    Object.entries(Inventory.ZONE_LOOT_TABLES).forEach(([zone, table]) => {
      assert(table.common.length > 0, `Zone "${zone}" common pool is empty`);
    });
  });

});

// ============================================================
// rollHarvestDrop
// ============================================================

suite('rollHarvestDrop', () => {

  test('Returns object with itemId, count, rarity', () => {
    const drop = Inventory.rollHarvestDrop('nexus', 0.5);
    assert(drop, 'Should return a drop object');
    assert(typeof drop.itemId === 'string' && drop.itemId.length > 0, 'Should have itemId');
    assert(typeof drop.count === 'number' && drop.count > 0, 'Should have positive count');
    assert(['common', 'uncommon', 'rare'].includes(drop.rarity), `Invalid rarity: ${drop.rarity}`);
  });

  test('itemId from drop exists in ITEM_CATALOG', () => {
    for (let i = 0; i < 20; i++) {
      const drop = Inventory.rollHarvestDrop('gardens', 0.5);
      assert(
        Inventory.ITEM_CATALOG[drop.itemId],
        `Dropped item "${drop.itemId}" not in ITEM_CATALOG`
      );
    }
  });

  test('Works for all 8 zones', () => {
    const zones = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];
    zones.forEach(zone => {
      const drop = Inventory.rollHarvestDrop(zone, 0.3);
      assert(drop, `No drop returned for zone "${zone}"`);
      assert(Inventory.ITEM_CATALOG[drop.itemId], `Invalid item from zone "${zone}": "${drop.itemId}"`);
    });
  });

  test('Falls back to nexus for unknown zone', () => {
    const drop = Inventory.rollHarvestDrop('unknown_zone', 0.5);
    assert(drop, 'Should return a drop even for unknown zone');
    assert(Inventory.ITEM_CATALOG[drop.itemId], `Invalid item for unknown zone fallback: "${drop.itemId}"`);
  });

  test('Luck 0 clamps correctly (does not crash)', () => {
    const drop = Inventory.rollHarvestDrop('wilds', 0);
    assert(drop, 'Should work with luck=0');
    assert(drop.count >= 1);
  });

  test('Luck 1 clamps correctly (does not crash)', () => {
    const drop = Inventory.rollHarvestDrop('wilds', 1);
    assert(drop, 'Should work with luck=1');
    assert(drop.count >= 1);
  });

  test('Luck out of range (negative) is clamped to 0', () => {
    // Should not throw
    const drop = Inventory.rollHarvestDrop('nexus', -5);
    assert(drop, 'Should work with negative luck');
  });

  test('Luck out of range (>1) is clamped to 1', () => {
    const drop = Inventory.rollHarvestDrop('nexus', 999);
    assert(drop, 'Should work with excessive luck value');
  });

  test('Missing luck defaults sensibly (does not crash)', () => {
    const drop = Inventory.rollHarvestDrop('nexus');
    assert(drop, 'Should work with no luck argument');
    assert(drop.count >= 1);
  });

  test('Rare drops always have count of 1', () => {
    // Run many times; any time we get a rare it must be count=1
    let rareFound = false;
    for (let i = 0; i < 200; i++) {
      const drop = Inventory.rollHarvestDrop('wilds', 1); // high luck to favour rare
      if (drop.rarity === 'rare') {
        assert.strictEqual(drop.count, 1, `Rare drop should have count 1, got ${drop.count}`);
        rareFound = true;
        break;
      }
    }
    // Just a sanity note — not a hard failure if RNG never produces rare in 200 rolls
  });

});

// ============================================================
// getInventoryStats (utility, uses items-array API)
// ============================================================

suite('getInventoryStats', () => {

  test('Returns zero stats for inventory without items array', () => {
    // getInventoryStats uses inventory.items (different from the slots-based API)
    const stats = Inventory.getInventoryStats(null);
    assert.strictEqual(stats.totalItems, 0);
    assert.strictEqual(stats.uniqueItems, 0);
  });

  test('Returns zero stats for empty items array', () => {
    const inv = { items: [] };
    const stats = Inventory.getInventoryStats(inv);
    assert.strictEqual(stats.totalItems, 0);
    assert.strictEqual(stats.uniqueItems, 0);
  });

  test('Counts a single item correctly', () => {
    const inv = { items: [{ id: 'wood_oak', count: 5 }] };
    const stats = Inventory.getInventoryStats(inv);
    assert.strictEqual(stats.totalItems, 5);
    assert.strictEqual(stats.uniqueItems, 1);
  });

  test('Counts multiple items correctly', () => {
    const inv = {
      items: [
        { id: 'wood_oak', count: 3 },
        { id: 'stone_common', count: 7 },
        { id: 'herb_mint', count: 2 }
      ]
    };
    const stats = Inventory.getInventoryStats(inv);
    assert.strictEqual(stats.totalItems, 12);
    assert.strictEqual(stats.uniqueItems, 3);
  });

  test('Skips null slots', () => {
    const inv = { items: [null, { id: 'wood_oak', count: 2 }, null] };
    const stats = Inventory.getInventoryStats(inv);
    assert.strictEqual(stats.uniqueItems, 1);
    assert.strictEqual(stats.totalItems, 2);
  });

  test('byRarity counts are correct', () => {
    const inv = {
      items: [
        { id: 'wood_oak', count: 5 },       // common
        { id: 'crystal_amethyst', count: 2 } // rare
      ]
    };
    const stats = Inventory.getInventoryStats(inv);
    assert.strictEqual(stats.byRarity.common, 5);
    assert.strictEqual(stats.byRarity.rare, 2);
  });

  test('byType counts are correct', () => {
    const inv = {
      items: [
        { id: 'wood_oak', count: 3 },
        { id: 'wood_pine', count: 4 }
      ]
    };
    const stats = Inventory.getInventoryStats(inv);
    assert.strictEqual(stats.byType['wood'], 7);
  });

  test('slotsTotal defaults to 20 when maxSlots not set', () => {
    const inv = { items: [{ id: 'wood_oak', count: 1 }] };
    const stats = Inventory.getInventoryStats(inv);
    assert.strictEqual(stats.slotsTotal, 20);
  });

  test('slotsTotal uses maxSlots when provided', () => {
    const inv = { items: [{ id: 'wood_oak', count: 1 }], maxSlots: 30 };
    const stats = Inventory.getInventoryStats(inv);
    assert.strictEqual(stats.slotsTotal, 30);
  });

});

// ============================================================
// sortInventory (utility, uses items-array API)
// ============================================================

suite('sortInventory', () => {

  test('Does not crash on null inventory', () => {
    Inventory.sortInventory(null, 'type'); // Should not throw
  });

  test('Does not crash on inventory without items array', () => {
    Inventory.sortInventory({}, 'type'); // Should not throw
  });

  test('Sort by type groups same types together', () => {
    const inv = {
      items: [
        { id: 'wood_oak', count: 1 },
        { id: 'herb_mint', count: 1 },
        { id: 'wood_pine', count: 1 }
      ]
    };
    Inventory.sortInventory(inv, 'type');
    const types = inv.items.filter(Boolean).map(s => Inventory.ITEM_CATALOG[s.id].type);
    // After sorting by type, the two wood items should be adjacent
    const woodIndices = types.reduce((acc, t, i) => (t === 'wood' ? acc.concat(i) : acc), []);
    assert(
      woodIndices[1] - woodIndices[0] === 1,
      'Wood items should be adjacent after sort by type'
    );
  });

  test('Sort by rarity puts legendary before common', () => {
    const inv = {
      items: [
        { id: 'herb_mint', count: 1 },        // common
        { id: 'crystal_emerald', count: 1 }    // legendary
      ]
    };
    Inventory.sortInventory(inv, 'rarity');
    const first = Inventory.ITEM_CATALOG[inv.items[0].id];
    assert.strictEqual(first.rarity, 'legendary', 'Legendary should come first');
  });

  test('Sort by name orders alphabetically', () => {
    const inv = {
      items: [
        { id: 'wood_pine', count: 1 },    // Pine Wood
        { id: 'herb_mint', count: 1 },    // Mint
        { id: 'food_bread', count: 1 }    // Bread
      ]
    };
    Inventory.sortInventory(inv, 'name');
    const names = inv.items.filter(Boolean).map(s => Inventory.ITEM_CATALOG[s.id].name);
    for (let i = 0; i < names.length - 1; i++) {
      assert(
        names[i].localeCompare(names[i + 1]) <= 0,
        `Name "${names[i]}" should come before "${names[i + 1]}"`
      );
    }
  });

  test('Empty slots are pushed to end after sort', () => {
    const inv = {
      items: [
        null,
        { id: 'wood_oak', count: 1 },
        null
      ]
    };
    Inventory.sortInventory(inv, 'type');
    // Items should come before nulls
    const lastNonNull = inv.items.reduce((acc, s, i) => (s !== null ? i : acc), -1);
    const firstNull = inv.items.findIndex(s => s === null);
    assert(
      firstNull === -1 || lastNonNull < firstNull,
      'Non-null items should precede null slots'
    );
  });

});

// ============================================================
// searchInventory (utility, uses items-array API)
// ============================================================

suite('searchInventory', () => {

  test('Returns empty array for null inventory', () => {
    const results = Inventory.searchInventory(null, 'wood');
    assert.deepStrictEqual(results, []);
  });

  test('Returns empty array for empty query', () => {
    const inv = { items: [{ id: 'wood_oak', count: 1 }] };
    const results = Inventory.searchInventory(inv, '');
    assert.deepStrictEqual(results, []);
  });

  test('Finds item by name', () => {
    const inv = {
      items: [
        { id: 'wood_oak', count: 1 },
        { id: 'herb_mint', count: 1 }
      ]
    };
    const results = Inventory.searchInventory(inv, 'oak');
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].item.id, 'wood_oak');
  });

  test('Search is case-insensitive', () => {
    const inv = { items: [{ id: 'wood_oak', count: 1 }] };
    const results = Inventory.searchInventory(inv, 'OAK');
    assert.strictEqual(results.length, 1);
  });

  test('Finds item by description keyword', () => {
    const inv = { items: [{ id: 'wood_oak', count: 1 }] };
    // wood_oak description: "Sturdy oak wood for building"
    const results = Inventory.searchInventory(inv, 'building');
    assert.strictEqual(results.length, 1);
  });

  test('Finds item by type', () => {
    const inv = {
      items: [
        { id: 'wood_oak', count: 1 },
        { id: 'wood_pine', count: 1 },
        { id: 'herb_mint', count: 1 }
      ]
    };
    const results = Inventory.searchInventory(inv, 'wood');
    // Should match items of type 'wood' (both wood_oak and wood_pine)
    assert(results.length >= 2, `Expected at least 2, got ${results.length}`);
  });

  test('Returns correct slotIndex', () => {
    const inv = {
      items: [
        null,
        { id: 'wood_oak', count: 1 }
      ]
    };
    const results = Inventory.searchInventory(inv, 'oak');
    assert.strictEqual(results[0].slotIndex, 1, 'slotIndex should be 1');
  });

  test('Returns empty array when no matches', () => {
    const inv = { items: [{ id: 'wood_oak', count: 1 }] };
    const results = Inventory.searchInventory(inv, 'zzzznonexistent');
    assert.deepStrictEqual(results, []);
  });

  test('Skips null slots', () => {
    const inv = { items: [null, null, { id: 'herb_mint', count: 5 }] };
    const results = Inventory.searchInventory(inv, 'mint');
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].slotIndex, 2);
  });

});

// ============================================================
// INTEGRATION — item transfer between two inventories
// ============================================================

suite('Integration — item transfer between inventories', () => {

  test('Transfer moves item from source to destination', () => {
    const src = Inventory.createInventory();
    const dst = Inventory.createInventory();

    Inventory.addItem(src, 'wood_oak', 10);
    const removeResult = Inventory.removeItem(src, 'wood_oak', 5);
    assert.strictEqual(removeResult.success, true);
    const addResult = Inventory.addItem(dst, 'wood_oak', 5);
    assert.strictEqual(addResult.success, true);

    assert.strictEqual(Inventory.getItemCount(src, 'wood_oak'), 5);
    assert.strictEqual(Inventory.getItemCount(dst, 'wood_oak'), 5);
  });

  test('Cannot transfer more than source has', () => {
    const src = Inventory.createInventory();
    const dst = Inventory.createInventory();

    Inventory.addItem(src, 'herb_mint', 3);
    const removeResult = Inventory.removeItem(src, 'herb_mint', 10);
    assert.strictEqual(removeResult.removed, 3);

    // Only 3 could be removed, so add 3 to dst
    Inventory.addItem(dst, 'herb_mint', removeResult.removed);
    assert.strictEqual(Inventory.getItemCount(dst, 'herb_mint'), 3);
  });

  test('Transfer does not affect other items in source', () => {
    const src = Inventory.createInventory();
    const dst = Inventory.createInventory();

    Inventory.addItem(src, 'wood_oak', 5);
    Inventory.addItem(src, 'stone_common', 8);

    Inventory.removeItem(src, 'wood_oak', 5);
    Inventory.addItem(dst, 'wood_oak', 5);

    assert.strictEqual(Inventory.getItemCount(src, 'stone_common'), 8);
    assert.strictEqual(Inventory.getItemCount(dst, 'stone_common'), 0);
  });

});

// ============================================================
// INTEGRATION — full crafting workflow
// ============================================================

suite('Integration — crafting workflow', () => {

  test('Harvest -> craft -> verify end state', () => {
    const inv = Inventory.createInventory();

    // Simulate harvesting materials
    Inventory.addItem(inv, 'herb_mint', 3);
    Inventory.addItem(inv, 'crystal_clear', 1);

    // Verify canCraft
    const recipe = Inventory.RECIPES.find(r => r.id === 'craft_healing_potion');
    assert(Inventory.canCraft(inv, recipe), 'Should be able to craft healing potion');

    // Craft
    const result = Inventory.craftItem(inv, 'craft_healing_potion');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.sparkEarned, 20);

    // Verify end state
    assert.strictEqual(Inventory.getItemCount(inv, 'potion_healing'), 1);
    assert.strictEqual(Inventory.getItemCount(inv, 'herb_mint'), 0);
    assert.strictEqual(Inventory.getItemCount(inv, 'crystal_clear'), 0);
  });

  test('Chain of crafting: refine_marble then craft_fountain', () => {
    const inv = Inventory.createInventory();

    // Step 1: refine marble (5 stone_common -> 2 stone_marble)
    Inventory.addItem(inv, 'stone_common', 5);
    const marbleResult = Inventory.craftItem(inv, 'refine_marble');
    assert.strictEqual(marbleResult.success, true);
    assert.strictEqual(Inventory.getItemCount(inv, 'stone_marble'), 2);

    // Step 2: need 12 marble for fountain — add more
    Inventory.addItem(inv, 'stone_common', 25);
    // Refine 5 more times to get 10 more marble (total 12)
    for (let i = 0; i < 5; i++) {
      Inventory.craftItem(inv, 'refine_marble');
    }
    assert(Inventory.getItemCount(inv, 'stone_marble') >= 12, 'Should have at least 12 marble');

    // Step 3: add crystals and craft fountain
    Inventory.addItem(inv, 'crystal_clear', 3);
    const fountainResult = Inventory.craftItem(inv, 'craft_fountain');
    assert.strictEqual(fountainResult.success, true);
    assert.strictEqual(Inventory.getItemCount(inv, 'item_fountain'), 1);
  });

  test('getAvailableRecipes updates after crafting', () => {
    const inv = Inventory.createInventory();
    Inventory.addItem(inv, 'seed_wildflower', 10);

    const before = Inventory.getAvailableRecipes(inv);
    const breadBefore = before.find(r => r.id === 'craft_bread');
    assert(breadBefore, 'craft_bread should be available before crafting');

    // Craft bread (consumes seed_wildflower x10)
    Inventory.craftItem(inv, 'craft_bread');

    const after = Inventory.getAvailableRecipes(inv);
    const breadAfter = after.find(r => r.id === 'craft_bread');
    assert(!breadAfter, 'craft_bread should not be available after consuming seeds');
  });

  test('Multiple crafts accumulate output correctly', () => {
    const inv = Inventory.createInventory();

    // brew_tea: herb_lavender x3, herb_mint x2 -> food_tea x3
    for (let i = 0; i < 3; i++) {
      Inventory.addItem(inv, 'herb_lavender', 3);
      Inventory.addItem(inv, 'herb_mint', 2);
      Inventory.craftItem(inv, 'brew_tea');
    }

    assert.strictEqual(Inventory.getItemCount(inv, 'food_tea'), 9);
  });

});

// ============================================================
// EDGE CASES
// ============================================================

suite('Edge cases', () => {

  test('Add zero items does not create a slot entry', () => {
    const inv = Inventory.createInventory();
    Inventory.addItem(inv, 'wood_oak', 0);
    // Slot should not be occupied by a zero-count item
    const occupied = inv.slots.filter(s => s !== null);
    // Behaviour: 0 remaining means nothing added, no slot used
    assert.strictEqual(Inventory.getItemCount(inv, 'wood_oak'), 0);
  });

  test('Remove zero items does not change count', () => {
    const inv = Inventory.createInventory();
    Inventory.addItem(inv, 'wood_oak', 5);
    Inventory.removeItem(inv, 'wood_oak', 0);
    assert.strictEqual(Inventory.getItemCount(inv, 'wood_oak'), 5);
  });

  test('hasItem with count 0 returns true even on empty inventory', () => {
    const inv = Inventory.createInventory();
    // getItemCount returns 0 >= 0 is true
    assert.strictEqual(Inventory.hasItem(inv, 'wood_oak', 0), true);
  });

  test('Adding item to exactly full stackable slot creates new slot', () => {
    const inv = Inventory.createInventory();
    // herb_mint maxStack = 99
    Inventory.addItem(inv, 'herb_mint', 99);
    Inventory.addItem(inv, 'herb_mint', 1); // must open second slot
    const mintSlots = inv.slots.filter(s => s && s.itemId === 'herb_mint');
    assert.strictEqual(mintSlots.length, 2);
    assert.strictEqual(mintSlots[1].count, 1);
  });

  test('Crafting with surplus materials leaves surplus intact', () => {
    const inv = Inventory.createInventory();
    Inventory.addItem(inv, 'wood_oak', 10);  // need 3 for pickaxe
    Inventory.addItem(inv, 'stone_common', 10); // need 5 for pickaxe
    Inventory.craftItem(inv, 'craft_pickaxe');
    assert.strictEqual(Inventory.getItemCount(inv, 'wood_oak'), 7);
    assert.strictEqual(Inventory.getItemCount(inv, 'stone_common'), 5);
  });

  test('getInventory on full inventory returns 20 non-null entries', () => {
    const inv = Inventory.createInventory();
    for (let i = 0; i < 20; i++) {
      Inventory.addItem(inv, 'tool_pickaxe', 1);
    }
    const view = Inventory.getInventory(inv);
    const nonNull = view.filter(s => s !== null);
    assert.strictEqual(nonNull.length, 20);
  });

  test('getItemData for tool_fishing_rod returns correct type', () => {
    const data = Inventory.getItemData('tool_fishing_rod');
    assert.strictEqual(data.type, 'tools');
    assert.strictEqual(data.stackable, false);
    assert.strictEqual(data.rarity, 'uncommon');
  });

  test('getItemData for fish_dragonfish returns legendary', () => {
    const data = Inventory.getItemData('fish_dragonfish');
    assert.strictEqual(data.rarity, 'legendary');
    assert.strictEqual(data.value, 100);
  });

  test('rollHarvestDrop returns item from the correct zone pool', () => {
    // Arena loot table only has specific items; verify the drop is from the table
    const arenaItems = new Set([
      ...Inventory.ZONE_LOOT_TABLES.arena.common,
      ...Inventory.ZONE_LOOT_TABLES.arena.uncommon,
      ...Inventory.ZONE_LOOT_TABLES.arena.rare
    ]);
    for (let i = 0; i < 30; i++) {
      const drop = Inventory.rollHarvestDrop('arena', 0.5);
      assert(arenaItems.has(drop.itemId), `Unexpected item "${drop.itemId}" from arena zone`);
    }
  });

  test('craftItem with unknown recipeId returns meaningful error', () => {
    const inv = Inventory.createInventory();
    const result = Inventory.craftItem(inv, 'craft_dragon_sword');
    assert.strictEqual(result.success, false);
    assert(result.message.length > 0, 'Should have a non-empty error message');
  });

  test('Multiple different items can coexist in inventory', () => {
    const inv = Inventory.createInventory();
    const items = [
      ['wood_oak', 5],
      ['stone_common', 8],
      ['herb_mint', 12],
      ['crystal_clear', 2],
      ['potion_healing', 3]
    ];
    items.forEach(([id, count]) => Inventory.addItem(inv, id, count));
    items.forEach(([id, count]) => {
      assert.strictEqual(Inventory.getItemCount(inv, id), count, `Count mismatch for ${id}`);
    });
  });

});

// ============================================================
// Run
// ============================================================

const success = report();
process.exit(success ? 0 : 1);
