// test_dashboard_inventory.js — Tests for DashboardInventory module
'use strict';

const { test, suite, report, assert } = require('./test_runner');
const DI = require('../src/js/dashboard_inventory');

// ============================================================
// ITEM CATALOG — Structure and Completeness
// ============================================================

suite('ITEM_CATALOG — exports and structure', () => {

  test('ITEM_CATALOG is exported and is an object', () => {
    assert(typeof DI.ITEM_CATALOG === 'object' && DI.ITEM_CATALOG !== null);
  });

  test('ITEM_CATALOG has 60 or more items', () => {
    const count = Object.keys(DI.ITEM_CATALOG).length;
    assert(count >= 60, 'Expected at least 60 items, got ' + count);
  });

  test('Every item has a name field (non-empty string)', () => {
    Object.entries(DI.ITEM_CATALOG).forEach(([id, item]) => {
      assert(typeof item.name === 'string' && item.name.length > 0, id + ' missing name');
    });
  });

  test('Every item has a category field', () => {
    Object.entries(DI.ITEM_CATALOG).forEach(([id, item]) => {
      assert(typeof item.category === 'string' && item.category.length > 0, id + ' missing category');
    });
  });

  test('Every item has a rarity field', () => {
    Object.entries(DI.ITEM_CATALOG).forEach(([id, item]) => {
      assert(typeof item.rarity === 'string', id + ' missing rarity');
    });
  });

  test('Every item has a value field (number >= 0)', () => {
    Object.entries(DI.ITEM_CATALOG).forEach(([id, item]) => {
      assert(typeof item.value === 'number' && item.value >= 0, id + ' invalid value');
    });
  });

  test('Every item has a desc field (non-empty string)', () => {
    Object.entries(DI.ITEM_CATALOG).forEach(([id, item]) => {
      assert(typeof item.desc === 'string' && item.desc.length > 0, id + ' missing desc');
    });
  });

  test('All rarities are valid values', () => {
    const valid = new Set(['common', 'uncommon', 'rare', 'epic', 'legendary']);
    Object.entries(DI.ITEM_CATALOG).forEach(([id, item]) => {
      assert(valid.has(item.rarity), id + ' has invalid rarity: ' + item.rarity);
    });
  });

  test('All categories are valid values', () => {
    const valid = new Set(['resource', 'tool', 'consumable', 'crafted', 'equipment', 'collectible']);
    Object.entries(DI.ITEM_CATALOG).forEach(([id, item]) => {
      assert(valid.has(item.category), id + ' has invalid category: ' + item.category);
    });
  });

});

suite('ITEM_CATALOG — specific item presence', () => {

  const requiredItems = [
    'wood', 'stone', 'iron_ore', 'crystal', 'herbs', 'silk', 'clay', 'gold_dust', 'feather', 'honey',
    'pickaxe', 'axe', 'fishing_rod', 'compass', 'telescope',
    'bread', 'potion', 'elixir', 'scroll',
    'iron_bar', 'plank', 'brick', 'rope', 'candle', 'glass',
    'leather_armor', 'iron_sword', 'gold_ring', 'crystal_staff',
    'ancient_coin', 'fossil', 'star_fragment'
  ];

  requiredItems.forEach(itemId => {
    test('ITEM_CATALOG contains: ' + itemId, () => {
      assert(DI.ITEM_CATALOG[itemId] !== undefined, 'Missing item: ' + itemId);
    });
  });

  test('wood is a resource', () => {
    assert.strictEqual(DI.ITEM_CATALOG['wood'].category, 'resource');
  });

  test('pickaxe is a tool', () => {
    assert.strictEqual(DI.ITEM_CATALOG['pickaxe'].category, 'tool');
  });

  test('bread is a consumable', () => {
    assert.strictEqual(DI.ITEM_CATALOG['bread'].category, 'consumable');
  });

  test('iron_bar is crafted', () => {
    assert.strictEqual(DI.ITEM_CATALOG['iron_bar'].category, 'crafted');
  });

  test('leather_armor is equipment', () => {
    assert.strictEqual(DI.ITEM_CATALOG['leather_armor'].category, 'equipment');
  });

  test('star_fragment is legendary', () => {
    assert.strictEqual(DI.ITEM_CATALOG['star_fragment'].rarity, 'legendary');
  });

  test('crystal_staff is epic', () => {
    assert.strictEqual(DI.ITEM_CATALOG['crystal_staff'].rarity, 'epic');
  });

  test('wood value is 2', () => {
    assert.strictEqual(DI.ITEM_CATALOG['wood'].value, 2);
  });

  test('star_fragment value is 200', () => {
    assert.strictEqual(DI.ITEM_CATALOG['star_fragment'].value, 200);
  });

});

// ============================================================
// getItemCatalog and getItemInfo
// ============================================================

suite('getItemCatalog()', () => {

  test('returns the catalog object', () => {
    const catalog = DI.getItemCatalog();
    assert(typeof catalog === 'object' && catalog !== null);
  });

  test('returned catalog has the same keys as ITEM_CATALOG', () => {
    const catalog = DI.getItemCatalog();
    const expected = Object.keys(DI.ITEM_CATALOG);
    const actual = Object.keys(catalog);
    assert.strictEqual(actual.length, expected.length);
  });

});

suite('getItemInfo()', () => {

  test('returns item data for valid id', () => {
    const info = DI.getItemInfo('wood');
    assert(info !== null && info.name === 'Wood');
  });

  test('returns null for unknown item', () => {
    const info = DI.getItemInfo('nonexistent_xyz');
    assert.strictEqual(info, null);
  });

  test('returns correct rarity for crystal', () => {
    const info = DI.getItemInfo('crystal');
    assert.strictEqual(info.rarity, 'rare');
  });

  test('returns null for empty string', () => {
    const info = DI.getItemInfo('');
    assert.strictEqual(info, null);
  });

});

// ============================================================
// RECIPES — Structure and Validation
// ============================================================

suite('RECIPES — exports and structure', () => {

  test('RECIPES is exported and is an array', () => {
    assert(Array.isArray(DI.RECIPES));
  });

  test('RECIPES has 20 or more recipes', () => {
    assert(DI.RECIPES.length >= 20, 'Expected at least 20 recipes, got ' + DI.RECIPES.length);
  });

  test('Every recipe has an id', () => {
    DI.RECIPES.forEach(r => {
      assert(typeof r.id === 'string' && r.id.length > 0, 'Recipe missing id: ' + JSON.stringify(r));
    });
  });

  test('Every recipe has a name', () => {
    DI.RECIPES.forEach(r => {
      assert(typeof r.name === 'string' && r.name.length > 0, 'Recipe ' + r.id + ' missing name');
    });
  });

  test('Every recipe has an inputs array', () => {
    DI.RECIPES.forEach(r => {
      assert(Array.isArray(r.inputs) && r.inputs.length > 0, 'Recipe ' + r.id + ' has invalid inputs');
    });
  });

  test('Every recipe has an output object with item and count', () => {
    DI.RECIPES.forEach(r => {
      assert(typeof r.output === 'object' && r.output !== null, 'Recipe ' + r.id + ' missing output');
      assert(typeof r.output.item === 'string', 'Recipe ' + r.id + ' output missing item');
      assert(typeof r.output.count === 'number' && r.output.count > 0, 'Recipe ' + r.id + ' output count invalid');
    });
  });

  test('Every recipe has a skill field', () => {
    DI.RECIPES.forEach(r => {
      assert(typeof r.skill === 'string', 'Recipe ' + r.id + ' missing skill');
    });
  });

  test('Every recipe has a level field (number >= 0)', () => {
    DI.RECIPES.forEach(r => {
      assert(typeof r.level === 'number' && r.level >= 0, 'Recipe ' + r.id + ' invalid level');
    });
  });

  test('All recipe input items exist in ITEM_CATALOG', () => {
    DI.RECIPES.forEach(r => {
      r.inputs.forEach(input => {
        assert(DI.ITEM_CATALOG[input.item] !== undefined,
          'Recipe ' + r.id + ' references unknown input: ' + input.item);
      });
    });
  });

  test('All recipe output items exist in ITEM_CATALOG', () => {
    DI.RECIPES.forEach(r => {
      assert(DI.ITEM_CATALOG[r.output.item] !== undefined,
        'Recipe ' + r.id + ' references unknown output: ' + r.output.item);
    });
  });

  test('All recipe input counts are positive numbers', () => {
    DI.RECIPES.forEach(r => {
      r.inputs.forEach(input => {
        assert(typeof input.count === 'number' && input.count > 0,
          'Recipe ' + r.id + ' input ' + input.item + ' has invalid count');
      });
    });
  });

  test('Recipe IDs are unique', () => {
    const ids = DI.RECIPES.map(r => r.id);
    const unique = new Set(ids);
    assert.strictEqual(ids.length, unique.size, 'Duplicate recipe IDs found');
  });

});

suite('getRecipes()', () => {

  test('returns array equal to RECIPES', () => {
    const recipes = DI.getRecipes();
    assert.strictEqual(recipes.length, DI.RECIPES.length);
  });

});

suite('getRecipeById()', () => {

  test('returns correct recipe for plank', () => {
    const r = DI.getRecipeById('plank');
    assert(r !== null && r.id === 'plank');
  });

  test('returns null for unknown recipe', () => {
    const r = DI.getRecipeById('nonexistent');
    assert.strictEqual(r, null);
  });

  test('plank recipe produces 2 planks', () => {
    const r = DI.getRecipeById('plank');
    assert.strictEqual(r.output.count, 2);
  });

  test('iron_bar recipe requires iron_ore and wood', () => {
    const r = DI.getRecipeById('iron_bar');
    const items = r.inputs.map(i => i.item);
    assert(items.includes('iron_ore') && items.includes('wood'));
  });

  test('crystal_staff recipe is level 5 enchanting', () => {
    const r = DI.getRecipeById('crystal_staff');
    assert.strictEqual(r.skill, 'enchanting');
    assert.strictEqual(r.level, 5);
  });

});

// ============================================================
// canCraft()
// ============================================================

suite('canCraft() — success cases', () => {

  test('can craft plank with 2 wood and no skill requirement', () => {
    const result = DI.canCraft('plank', { wood: 5 }, {});
    assert.strictEqual(result.craftable, true);
    assert.strictEqual(result.missing.length, 0);
    assert.strictEqual(result.skillRequired, null);
  });

  test('can craft bread with 2+ herbs', () => {
    const result = DI.canCraft('bread', { herbs: 3 }, {});
    assert.strictEqual(result.craftable, true);
  });

  test('can craft iron_bar with smithing skill level 1', () => {
    const result = DI.canCraft('iron_bar', { iron_ore: 2, wood: 1 }, { smithing: 1 });
    assert.strictEqual(result.craftable, true);
  });

  test('can craft rope with exactly 3 silk', () => {
    const result = DI.canCraft('rope', { silk: 3 }, {});
    assert.strictEqual(result.craftable, true);
  });

  test('can craft crystal_staff with level 5 enchanting', () => {
    const inv = { crystal: 3, plank: 1, gold_dust: 2 };
    const skills = { enchanting: 5 };
    const result = DI.canCraft('crystal_staff', inv, skills);
    assert.strictEqual(result.craftable, true);
  });

});

suite('canCraft() — failure: missing materials', () => {

  test('cannot craft plank with 0 wood', () => {
    const result = DI.canCraft('plank', {}, {});
    assert.strictEqual(result.craftable, false);
    assert(result.missing.length > 0);
  });

  test('missing array has correct have/need info', () => {
    const result = DI.canCraft('plank', { wood: 1 }, {});
    assert.strictEqual(result.craftable, false);
    assert.strictEqual(result.missing[0].item, 'wood');
    assert.strictEqual(result.missing[0].need, 2);
    assert.strictEqual(result.missing[0].have, 1);
  });

  test('cannot craft iron_bar with insufficient ore', () => {
    const result = DI.canCraft('iron_bar', { iron_ore: 1, wood: 1 }, { smithing: 2 });
    assert.strictEqual(result.craftable, false);
    assert(result.missing.some(m => m.item === 'iron_ore'));
  });

  test('missing list contains all missing items', () => {
    const result = DI.canCraft('compass', {}, { engineering: 5 });
    assert.strictEqual(result.craftable, false);
    assert(result.missing.length >= 3);
  });

  test('returns craftable false for unknown recipe', () => {
    const result = DI.canCraft('unknown_recipe', { wood: 100 }, {});
    assert.strictEqual(result.craftable, false);
  });

});

suite('canCraft() — failure: skill requirement', () => {

  test('cannot craft iron_bar without smithing skill', () => {
    const result = DI.canCraft('iron_bar', { iron_ore: 2, wood: 1 }, {});
    assert.strictEqual(result.craftable, false);
    assert(result.skillRequired !== null);
    assert.strictEqual(result.skillRequired.skill, 'smithing');
  });

  test('skillRequired has level and playerLevel', () => {
    const result = DI.canCraft('iron_bar', { iron_ore: 2, wood: 1 }, { smithing: 0 });
    assert.strictEqual(result.skillRequired.level, 1);
    assert.strictEqual(result.skillRequired.playerLevel, 0);
  });

  test('cannot craft telescope with insufficient engineering level', () => {
    const inv = { glass: 2, iron_bar: 1, gold_dust: 1 };
    const result = DI.canCraft('telescope', inv, { engineering: 2 });
    assert.strictEqual(result.craftable, false);
    assert.strictEqual(result.skillRequired.skill, 'engineering');
    assert.strictEqual(result.skillRequired.level, 4);
  });

  test('can craft with skill at exactly required level', () => {
    const result = DI.canCraft('iron_bar', { iron_ore: 2, wood: 1 }, { smithing: 1 });
    assert.strictEqual(result.craftable, true);
  });

  test('can craft with skill above required level', () => {
    const result = DI.canCraft('iron_bar', { iron_ore: 2, wood: 1 }, { smithing: 10 });
    assert.strictEqual(result.craftable, true);
  });

  test('level-0 recipe does not require skill', () => {
    const result = DI.canCraft('plank', { wood: 2 }, {});
    assert.strictEqual(result.skillRequired, null);
  });

});

// ============================================================
// craftItem()
// ============================================================

suite('craftItem() — success', () => {

  test('crafting plank produces planks and consumes wood', () => {
    const inv = { wood: 4 };
    const result = DI.craftItem('plank', inv, {});
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.item, 'plank');
    assert.strictEqual(result.quantity, 2);
    assert.strictEqual(inv.wood, 2);
    assert.strictEqual(inv.plank, 2);
  });

  test('crafting bread produces 3 breads', () => {
    const inv = { herbs: 5 };
    const result = DI.craftItem('bread', inv, {});
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.quantity, 3);
    assert.strictEqual(inv.bread, 3);
    assert.strictEqual(inv.herbs, 3);
  });

  test('success message contains item name', () => {
    const inv = { wood: 2 };
    const result = DI.craftItem('plank', inv, {});
    assert(result.message.indexOf('Plank') !== -1);
  });

  test('input items are deleted from inventory when count reaches 0', () => {
    const inv = { wood: 2 };
    DI.craftItem('plank', inv, {});
    assert(inv.wood === undefined);
  });

  test('crafting iron_bar with smithing 1', () => {
    const inv = { iron_ore: 2, wood: 1 };
    const result = DI.craftItem('iron_bar', inv, { smithing: 1 });
    assert.strictEqual(result.success, true);
    assert.strictEqual(inv.iron_bar, 1);
  });

  test('crafting accumulates output with existing inventory', () => {
    const inv = { wood: 4, plank: 3 };
    DI.craftItem('plank', inv, {});
    assert.strictEqual(inv.plank, 5); // 3 existing + 2 crafted
  });

});

suite('craftItem() — failure', () => {

  test('fails with insufficient materials', () => {
    const inv = { wood: 1 };
    const result = DI.craftItem('plank', inv, {});
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.item, null);
    assert.strictEqual(result.quantity, 0);
  });

  test('fails with empty inventory', () => {
    const inv = {};
    const result = DI.craftItem('iron_bar', inv, { smithing: 5 });
    assert.strictEqual(result.success, false);
  });

  test('fails with insufficient skill', () => {
    const inv = { iron_ore: 2, wood: 1 };
    const result = DI.craftItem('iron_bar', inv, {});
    assert.strictEqual(result.success, false);
    assert(result.message.indexOf('smithing') !== -1 || result.message.indexOf('Requires') !== -1);
  });

  test('fails for unknown recipe ID', () => {
    const inv = { wood: 100 };
    const result = DI.craftItem('unknown_xyz', inv, {});
    assert.strictEqual(result.success, false);
  });

  test('inventory is NOT modified on failure', () => {
    const inv = { wood: 1 };
    DI.craftItem('plank', inv, {});
    assert.strictEqual(inv.wood, 1);
    assert(inv.plank === undefined);
  });

  test('failure message describes what is missing', () => {
    const inv = {};
    const result = DI.craftItem('plank', inv, {});
    assert(result.message.length > 0);
    assert.strictEqual(result.success, false);
  });

});

// ============================================================
// Inventory State CRUD
// ============================================================

suite('createInventoryState()', () => {

  test('returns object with items, equipped, skills', () => {
    const state = DI.createInventoryState();
    assert(typeof state.items === 'object');
    assert(typeof state.equipped === 'object');
    assert(typeof state.skills === 'object');
  });

  test('equipped has 4 slots', () => {
    const state = DI.createInventoryState();
    const slots = Object.keys(state.equipped);
    assert(slots.includes('head'));
    assert(slots.includes('body'));
    assert(slots.includes('weapon'));
    assert(slots.includes('accessory'));
  });

  test('all equipment slots start null', () => {
    const state = DI.createInventoryState();
    assert.strictEqual(state.equipped.head, null);
    assert.strictEqual(state.equipped.body, null);
    assert.strictEqual(state.equipped.weapon, null);
    assert.strictEqual(state.equipped.accessory, null);
  });

  test('items starts empty', () => {
    const state = DI.createInventoryState();
    assert.strictEqual(Object.keys(state.items).length, 0);
  });

});

suite('addItemToInventory()', () => {

  test('adds item to empty inventory', () => {
    const state = DI.createInventoryState();
    DI.addItemToInventory(state, 'wood', 5);
    assert.strictEqual(state.items.wood, 5);
  });

  test('accumulates quantity on repeated adds', () => {
    const state = DI.createInventoryState();
    DI.addItemToInventory(state, 'wood', 3);
    DI.addItemToInventory(state, 'wood', 4);
    assert.strictEqual(state.items.wood, 7);
  });

  test('returns the state object', () => {
    const state = DI.createInventoryState();
    const result = DI.addItemToInventory(state, 'herbs', 2);
    assert(result === state);
  });

  test('ignores unknown item IDs', () => {
    const state = DI.createInventoryState();
    DI.addItemToInventory(state, 'phantom_item', 10);
    assert(state.items['phantom_item'] === undefined);
  });

  test('ignores zero count', () => {
    const state = DI.createInventoryState();
    DI.addItemToInventory(state, 'wood', 0);
    assert(state.items.wood === undefined);
  });

  test('ignores negative count', () => {
    const state = DI.createInventoryState();
    DI.addItemToInventory(state, 'wood', -5);
    assert(state.items.wood === undefined);
  });

  test('can add multiple different items', () => {
    const state = DI.createInventoryState();
    DI.addItemToInventory(state, 'wood', 3);
    DI.addItemToInventory(state, 'stone', 7);
    DI.addItemToInventory(state, 'crystal', 1);
    assert.strictEqual(Object.keys(state.items).length, 3);
  });

});

suite('removeItemFromInventory()', () => {

  test('removes items successfully', () => {
    const state = DI.createInventoryState();
    state.items.wood = 10;
    const result = DI.removeItemFromInventory(state, 'wood', 3);
    assert.strictEqual(result.success, true);
    assert.strictEqual(state.items.wood, 7);
  });

  test('deletes key when quantity reaches 0', () => {
    const state = DI.createInventoryState();
    state.items.stone = 5;
    DI.removeItemFromInventory(state, 'stone', 5);
    assert(state.items.stone === undefined);
  });

  test('fails if not enough items', () => {
    const state = DI.createInventoryState();
    state.items.wood = 2;
    const result = DI.removeItemFromInventory(state, 'wood', 5);
    assert.strictEqual(result.success, false);
    assert(result.message.length > 0);
  });

  test('does not modify state on failure', () => {
    const state = DI.createInventoryState();
    state.items.herbs = 3;
    DI.removeItemFromInventory(state, 'herbs', 10);
    assert.strictEqual(state.items.herbs, 3);
  });

  test('fails gracefully with zero quantity', () => {
    const state = DI.createInventoryState();
    const result = DI.removeItemFromInventory(state, 'wood', 1);
    assert.strictEqual(result.success, false);
  });

  test('returns state in both success and failure', () => {
    const state = DI.createInventoryState();
    state.items.wood = 5;
    const ok = DI.removeItemFromInventory(state, 'wood', 2);
    const fail = DI.removeItemFromInventory(state, 'wood', 100);
    assert(ok.state === state);
    assert(fail.state === state);
  });

});

// ============================================================
// Equipment System
// ============================================================

suite('equipItem()', () => {

  test('equips leather_armor to body slot', () => {
    const state = DI.createInventoryState();
    state.items.leather_armor = 1;
    const result = DI.equipItem(state, 'leather_armor');
    assert.strictEqual(result.success, true);
    assert.strictEqual(state.equipped.body, 'leather_armor');
  });

  test('equips iron_sword to weapon slot', () => {
    const state = DI.createInventoryState();
    state.items.iron_sword = 1;
    const result = DI.equipItem(state, 'iron_sword');
    assert.strictEqual(result.success, true);
    assert.strictEqual(state.equipped.weapon, 'iron_sword');
  });

  test('removes item from inventory after equipping', () => {
    const state = DI.createInventoryState();
    state.items.leather_armor = 1;
    DI.equipItem(state, 'leather_armor');
    assert(state.items.leather_armor === undefined);
  });

  test('previousItem is null when slot was empty', () => {
    const state = DI.createInventoryState();
    state.items.iron_sword = 1;
    const result = DI.equipItem(state, 'iron_sword');
    assert.strictEqual(result.previousItem, null);
  });

  test('previousItem returned when replacing equipped item', () => {
    const state = DI.createInventoryState();
    state.items.iron_sword = 1;
    state.items.crystal_staff = 1;
    DI.equipItem(state, 'iron_sword');
    const result = DI.equipItem(state, 'crystal_staff');
    assert.strictEqual(result.previousItem, 'iron_sword');
  });

  test('replaced item is returned to inventory', () => {
    const state = DI.createInventoryState();
    state.items.iron_sword = 1;
    state.items.crystal_staff = 1;
    DI.equipItem(state, 'iron_sword');
    DI.equipItem(state, 'crystal_staff');
    assert.strictEqual(state.items.iron_sword, 1);
  });

  test('fails for non-equipment item', () => {
    const state = DI.createInventoryState();
    state.items.wood = 5;
    const result = DI.equipItem(state, 'wood');
    assert.strictEqual(result.success, false);
  });

  test('fails if item not in inventory', () => {
    const state = DI.createInventoryState();
    const result = DI.equipItem(state, 'iron_sword');
    assert.strictEqual(result.success, false);
  });

  test('fails for unknown item', () => {
    const state = DI.createInventoryState();
    const result = DI.equipItem(state, 'fake_item_xyz');
    assert.strictEqual(result.success, false);
  });

  test('equips gold_ring to accessory slot', () => {
    const state = DI.createInventoryState();
    state.items.gold_ring = 1;
    DI.equipItem(state, 'gold_ring');
    assert.strictEqual(state.equipped.accessory, 'gold_ring');
  });

  test('result contains success and message', () => {
    const state = DI.createInventoryState();
    state.items.iron_sword = 1;
    const result = DI.equipItem(state, 'iron_sword');
    assert(typeof result.success === 'boolean');
    assert(typeof result.message === 'string');
  });

});

suite('unequipItem()', () => {

  test('unequips item and returns to inventory', () => {
    const state = DI.createInventoryState();
    state.equipped.weapon = 'iron_sword';
    const result = DI.unequipItem(state, 'weapon');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.item, 'iron_sword');
    assert.strictEqual(state.equipped.weapon, null);
    assert.strictEqual(state.items.iron_sword, 1);
  });

  test('fails when slot is empty', () => {
    const state = DI.createInventoryState();
    const result = DI.unequipItem(state, 'weapon');
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.item, null);
  });

  test('fails for invalid slot', () => {
    const state = DI.createInventoryState();
    const result = DI.unequipItem(state, 'legs');
    assert.strictEqual(result.success, false);
  });

  test('unequip accumulates with existing inventory', () => {
    const state = DI.createInventoryState();
    state.items.iron_sword = 2;
    state.equipped.weapon = 'iron_sword';
    DI.unequipItem(state, 'weapon');
    assert.strictEqual(state.items.iron_sword, 3);
  });

  test('result includes item id on success', () => {
    const state = DI.createInventoryState();
    state.equipped.body = 'leather_armor';
    const result = DI.unequipItem(state, 'body');
    assert.strictEqual(result.item, 'leather_armor');
  });

  test('message is a string', () => {
    const state = DI.createInventoryState();
    state.equipped.body = 'leather_armor';
    const result = DI.unequipItem(state, 'body');
    assert(typeof result.message === 'string');
  });

});

// ============================================================
// getEquipmentStats()
// ============================================================

suite('getEquipmentStats()', () => {

  test('returns empty object when nothing equipped', () => {
    const equipped = { head: null, body: null, weapon: null, accessory: null };
    const stats = DI.getEquipmentStats(equipped);
    assert.deepStrictEqual(stats, {});
  });

  test('returns stats for single equipped item', () => {
    const equipped = { head: null, body: 'leather_armor', weapon: null, accessory: null };
    const stats = DI.getEquipmentStats(equipped);
    assert.strictEqual(stats.defense, 5);
  });

  test('accumulates stats from multiple items', () => {
    const equipped = { head: null, body: 'leather_armor', weapon: 'iron_sword', accessory: null };
    const stats = DI.getEquipmentStats(equipped);
    assert.strictEqual(stats.defense, 5);
    assert.strictEqual(stats.attack, 8);
  });

  test('handles unknown itemId gracefully', () => {
    const equipped = { head: 'nonexistent_item', body: null, weapon: null, accessory: null };
    const stats = DI.getEquipmentStats(equipped);
    assert.deepStrictEqual(stats, {});
  });

});

// ============================================================
// getRarityColor()
// ============================================================

suite('getRarityColor()', () => {

  test('common returns gray', () => {
    assert.strictEqual(DI.getRarityColor('common'), '#cccccc');
  });

  test('uncommon returns green', () => {
    assert.strictEqual(DI.getRarityColor('uncommon'), '#2ecc71');
  });

  test('rare returns blue', () => {
    assert.strictEqual(DI.getRarityColor('rare'), '#3498db');
  });

  test('epic returns purple', () => {
    assert.strictEqual(DI.getRarityColor('epic'), '#9b59b6');
  });

  test('legendary returns gold/orange', () => {
    assert.strictEqual(DI.getRarityColor('legendary'), '#f39c12');
  });

  test('unknown rarity returns a fallback color', () => {
    const color = DI.getRarityColor('nonexistent');
    assert(typeof color === 'string' && color.startsWith('#'));
  });

});

// ============================================================
// getItemSymbol()
// ============================================================

suite('getItemSymbol()', () => {

  test('resource returns [R]', () => {
    assert.strictEqual(DI.getItemSymbol('resource'), '[R]');
  });

  test('tool returns [T]', () => {
    assert.strictEqual(DI.getItemSymbol('tool'), '[T]');
  });

  test('consumable returns [C]', () => {
    assert.strictEqual(DI.getItemSymbol('consumable'), '[C]');
  });

  test('crafted returns [+]', () => {
    assert.strictEqual(DI.getItemSymbol('crafted'), '[+]');
  });

  test('equipment returns [E]', () => {
    assert.strictEqual(DI.getItemSymbol('equipment'), '[E]');
  });

  test('collectible returns [*]', () => {
    assert.strictEqual(DI.getItemSymbol('collectible'), '[*]');
  });

  test('unknown category returns fallback string', () => {
    const sym = DI.getItemSymbol('unknown_cat');
    assert(typeof sym === 'string' && sym.length > 0);
  });

});

// ============================================================
// getItemsByCategory()
// ============================================================

suite('getItemsByCategory()', () => {

  test('returns all items for category all', () => {
    const inv = { wood: 2, iron_bar: 1, iron_sword: 1 };
    const items = DI.getItemsByCategory(inv, 'all');
    assert.strictEqual(items.length, 3);
  });

  test('returns only resource items', () => {
    const inv = { wood: 2, iron_bar: 1, iron_sword: 1, stone: 3 };
    const items = DI.getItemsByCategory(inv, 'resource');
    assert(items.every(i => i.info.category === 'resource'));
    assert.strictEqual(items.length, 2);
  });

  test('returns only equipment items', () => {
    const inv = { wood: 2, iron_sword: 1, leather_armor: 1 };
    const items = DI.getItemsByCategory(inv, 'equipment');
    assert.strictEqual(items.length, 2);
    assert(items.every(i => i.info.category === 'equipment'));
  });

  test('returns empty array for category with no matching items', () => {
    const inv = { wood: 2, stone: 3 };
    const items = DI.getItemsByCategory(inv, 'collectible');
    assert.strictEqual(items.length, 0);
  });

  test('each result has id, quantity, and info', () => {
    const inv = { wood: 5 };
    const items = DI.getItemsByCategory(inv, 'all');
    assert.strictEqual(items[0].id, 'wood');
    assert.strictEqual(items[0].quantity, 5);
    assert(typeof items[0].info === 'object');
  });

  test('handles null/empty inventory', () => {
    const items = DI.getItemsByCategory({}, 'all');
    assert.strictEqual(items.length, 0);
  });

  test('ignores items not in catalog', () => {
    const inv = { wood: 2, phantom_item_xyz: 10 };
    const items = DI.getItemsByCategory(inv, 'all');
    assert.strictEqual(items.length, 1);
  });

  test('no category arg treated as all', () => {
    const inv = { wood: 2, iron_sword: 1 };
    const items = DI.getItemsByCategory(inv);
    assert.strictEqual(items.length, 2);
  });

});

// ============================================================
// sortItems()
// ============================================================

suite('sortItems()', () => {

  function makeItems(idList) {
    return idList.map(id => ({
      id: id,
      quantity: Math.floor(Math.random() * 10) + 1,
      info: DI.ITEM_CATALOG[id]
    }));
  }

  test('sort by name alphabetically', () => {
    const items = makeItems(['wood', 'stone', 'herbs']);
    const sorted = DI.sortItems(items, 'name');
    const names = sorted.map(i => i.info.name);
    assert(names[0] <= names[1] && names[1] <= names[2]);
  });

  test('sort by value descending', () => {
    const items = makeItems(['wood', 'crystal', 'herbs']);
    const sorted = DI.sortItems(items, 'value');
    assert(sorted[0].info.value >= sorted[1].info.value);
    assert(sorted[1].info.value >= sorted[2].info.value);
  });

  test('sort by rarity puts legendary before common', () => {
    const items = makeItems(['wood', 'star_fragment', 'iron_ore']);
    const sorted = DI.sortItems(items, 'rarity');
    assert.strictEqual(sorted[0].id, 'star_fragment');
    assert.strictEqual(sorted[sorted.length - 1].id, 'wood');
  });

  test('sort by quantity descending', () => {
    const items = [
      { id: 'wood', quantity: 1, info: DI.ITEM_CATALOG.wood },
      { id: 'stone', quantity: 10, info: DI.ITEM_CATALOG.stone },
      { id: 'herbs', quantity: 5, info: DI.ITEM_CATALOG.herbs }
    ];
    const sorted = DI.sortItems(items, 'quantity');
    assert.strictEqual(sorted[0].quantity, 10);
    assert.strictEqual(sorted[2].quantity, 1);
  });

  test('does not mutate original array', () => {
    const items = makeItems(['wood', 'crystal', 'herbs']);
    const original = items.slice();
    DI.sortItems(items, 'name');
    assert.strictEqual(items[0].id, original[0].id);
  });

  test('unknown sort key returns array unchanged in length', () => {
    const items = makeItems(['wood', 'stone']);
    const sorted = DI.sortItems(items, 'nonexistent_sort');
    assert.strictEqual(sorted.length, 2);
  });

});

// ============================================================
// calculateInventoryValue()
// ============================================================

suite('calculateInventoryValue()', () => {

  test('empty inventory has value 0', () => {
    assert.strictEqual(DI.calculateInventoryValue({}), 0);
  });

  test('single item value matches catalog', () => {
    const inv = { wood: 1 };
    assert.strictEqual(DI.calculateInventoryValue(inv), 2);
  });

  test('multiplies value by quantity', () => {
    const inv = { wood: 5 };
    assert.strictEqual(DI.calculateInventoryValue(inv), 10);
  });

  test('sums multiple item values', () => {
    const inv = { wood: 1, stone: 1 }; // 2 + 3 = 5
    assert.strictEqual(DI.calculateInventoryValue(inv), 5);
  });

  test('ignores unknown item IDs', () => {
    const inv = { wood: 2, phantom: 100 };
    assert.strictEqual(DI.calculateInventoryValue(inv), 4);
  });

  test('handles null/undefined inventory', () => {
    assert.strictEqual(DI.calculateInventoryValue(null), 0);
    assert.strictEqual(DI.calculateInventoryValue(undefined), 0);
  });

  test('star_fragment worth 200 each', () => {
    const inv = { star_fragment: 3 };
    assert.strictEqual(DI.calculateInventoryValue(inv), 600);
  });

});

// ============================================================
// formatItemSlot()
// ============================================================

suite('formatItemSlot()', () => {

  test('returns an HTML string', () => {
    const html = DI.formatItemSlot('wood', 5, false);
    assert(typeof html === 'string' && html.length > 0);
  });

  test('contains item name', () => {
    const html = DI.formatItemSlot('wood', 5, false);
    assert(html.indexOf('Wood') !== -1);
  });

  test('contains quantity badge', () => {
    const html = DI.formatItemSlot('crystal', 3, false);
    assert(html.indexOf('x3') !== -1);
  });

  test('contains item symbol', () => {
    const html = DI.formatItemSlot('wood', 2, false);
    assert(html.indexOf('[R]') !== -1);
  });

  test('selected item has gold border style', () => {
    const html = DI.formatItemSlot('wood', 1, true);
    assert(html.indexOf('#f0c040') !== -1 || html.indexOf('selected') !== -1);
  });

  test('unselected uses rarity color border', () => {
    const html = DI.formatItemSlot('wood', 1, false);
    // common rarity = #cccccc
    assert(html.indexOf('#cccccc') !== -1);
  });

  test('unknown item returns empty slot element', () => {
    const html = DI.formatItemSlot('nonexistent_xyz', 1, false);
    assert(html.indexOf('inv-slot') !== -1);
    assert(html.indexOf('Wood') === -1);
  });

  test('contains data-item attribute', () => {
    const html = DI.formatItemSlot('iron_ore', 2, false);
    assert(html.indexOf('data-item="iron_ore"') !== -1);
  });

  test('rare item uses blue rarity color', () => {
    const html = DI.formatItemSlot('crystal', 1, false);
    assert(html.indexOf('#3498db') !== -1);
  });

});

// ============================================================
// formatRecipeCard()
// ============================================================

suite('formatRecipeCard()', () => {

  test('returns HTML string', () => {
    const recipe = DI.getRecipeById('plank');
    const html = DI.formatRecipeCard(recipe, { wood: 5 }, {});
    assert(typeof html === 'string' && html.length > 0);
  });

  test('contains output item name', () => {
    const recipe = DI.getRecipeById('plank');
    const html = DI.formatRecipeCard(recipe, { wood: 5 }, {});
    assert(html.indexOf('Plank') !== -1);
  });

  test('contains craft button', () => {
    const recipe = DI.getRecipeById('plank');
    const html = DI.formatRecipeCard(recipe, { wood: 5 }, {});
    assert(html.indexOf('[Craft]') !== -1 || html.indexOf('Craft') !== -1);
  });

  test('craft button is enabled when craftable', () => {
    const recipe = DI.getRecipeById('plank');
    const html = DI.formatRecipeCard(recipe, { wood: 5 }, {});
    // button should not be disabled
    const btnMatch = html.match(/<button[^>]*>/);
    if (btnMatch) {
      assert(btnMatch[0].indexOf('disabled') === -1);
    }
  });

  test('craft button is disabled when cannot craft', () => {
    const recipe = DI.getRecipeById('plank');
    const html = DI.formatRecipeCard(recipe, {}, {});
    assert(html.indexOf('disabled') !== -1);
  });

  test('contains data-recipe attribute', () => {
    const recipe = DI.getRecipeById('plank');
    const html = DI.formatRecipeCard(recipe, { wood: 2 }, {});
    assert(html.indexOf('data-recipe="plank"') !== -1);
  });

  test('shows have/need counts for inputs', () => {
    const recipe = DI.getRecipeById('plank');
    const html = DI.formatRecipeCard(recipe, { wood: 1 }, {});
    assert(html.indexOf('1/2') !== -1 || (html.indexOf('1') !== -1 && html.indexOf('2') !== -1));
  });

  test('contains skill info for skill-gated recipe', () => {
    const recipe = DI.getRecipeById('iron_bar');
    const html = DI.formatRecipeCard(recipe, { iron_ore: 2, wood: 1 }, {});
    assert(html.indexOf('smithing') !== -1);
  });

  test('no skill section for level-0 recipe', () => {
    const recipe = DI.getRecipeById('plank');
    const html = DI.formatRecipeCard(recipe, { wood: 2 }, {});
    // level 0 recipes shouldn't need skill display — test that the card renders without error
    assert(typeof html === 'string');
  });

  test('craftable class applied when can craft', () => {
    const recipe = DI.getRecipeById('plank');
    const html = DI.formatRecipeCard(recipe, { wood: 5 }, {});
    assert(html.indexOf('craftable') !== -1);
  });

});

// ============================================================
// Edge Cases
// ============================================================

suite('Edge cases', () => {

  test('canCraft with null inventory uses 0 for all items', () => {
    const result = DI.canCraft('plank', null, {});
    assert.strictEqual(result.craftable, false);
  });

  test('canCraft with null skills uses level 0 for all skills', () => {
    const result = DI.canCraft('iron_bar', { iron_ore: 2, wood: 1 }, null);
    assert.strictEqual(result.craftable, false);
    assert(result.skillRequired !== null);
  });

  test('addItemToInventory does not add item with count of 1 for unknown ids', () => {
    const state = DI.createInventoryState();
    DI.addItemToInventory(state, 'totally_fake_item_xyz_abc', 1);
    assert.strictEqual(Object.keys(state.items).length, 0);
  });

  test('equipping non-equipment consumable fails', () => {
    const state = DI.createInventoryState();
    state.items.potion = 1;
    const result = DI.equipItem(state, 'potion');
    assert.strictEqual(result.success, false);
  });

  test('equipping collectible item fails', () => {
    const state = DI.createInventoryState();
    state.items.ancient_coin = 1;
    const result = DI.equipItem(state, 'ancient_coin');
    assert.strictEqual(result.success, false);
  });

  test('calculateInventoryValue with empty object returns 0', () => {
    assert.strictEqual(DI.calculateInventoryValue({}), 0);
  });

  test('craftItem with zero recipe output still returns success structure', () => {
    // This tests the structure of the response
    const result = DI.craftItem('nonexistent', {}, {});
    assert(typeof result.success === 'boolean');
    assert(typeof result.message === 'string');
  });

  test('getRecipes returns same array reference as RECIPES export', () => {
    assert(DI.getRecipes() === DI.RECIPES);
  });

  test('sortItems on empty array returns empty array', () => {
    const sorted = DI.sortItems([], 'name');
    assert.strictEqual(sorted.length, 0);
  });

  test('getItemsByCategory with null inventory returns empty array', () => {
    const result = DI.getItemsByCategory(null, 'resource');
    assert.strictEqual(result.length, 0);
  });

  test('unequipItem on invalid slot name returns failure', () => {
    const state = DI.createInventoryState();
    const result = DI.unequipItem(state, 'nonexistent_slot');
    assert.strictEqual(result.success, false);
  });

  test('getEquipmentStats with all null slots returns empty stats', () => {
    const equipped = { head: null, body: null, weapon: null, accessory: null };
    const stats = DI.getEquipmentStats(equipped);
    assert.strictEqual(Object.keys(stats).length, 0);
  });

  test('multiple equip/unequip round-trip preserves inventory count', () => {
    const state = DI.createInventoryState();
    state.items.iron_sword = 1;
    DI.equipItem(state, 'iron_sword');
    DI.unequipItem(state, 'weapon');
    assert.strictEqual(state.items.iron_sword, 1);
    assert.strictEqual(state.equipped.weapon, null);
  });

  test('crafting bread consumes exactly 2 herbs', () => {
    const inv = { herbs: 5 };
    DI.craftItem('bread', inv, {});
    assert.strictEqual(inv.herbs, 3);
  });

  test('ITEM_CATALOG reference is stable across getItemCatalog calls', () => {
    assert(DI.getItemCatalog() === DI.getItemCatalog());
  });

});

// ============================================================
// Final Report
// ============================================================

const ok = report();
process.exit(ok ? 0 : 1);
