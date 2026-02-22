/**
 * tests/test_crafting.js
 * Comprehensive tests for the ZION Crafting module.
 * Run with: node tests/test_crafting.js
 */

'use strict';

var Crafting = require('../src/js/crafting');

var passed = 0;
var failed = 0;
var errors = [];

function assert(condition, msg) {
  if (!condition) {
    throw new Error(msg || 'Assertion failed');
  }
}

assert.strictEqual = function(a, b, msg) {
  if (a !== b) {
    throw new Error((msg || 'strictEqual failed') + ': expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a));
  }
};

assert.notStrictEqual = function(a, b, msg) {
  if (a === b) {
    throw new Error((msg || 'notStrictEqual failed') + ': values are equal: ' + JSON.stringify(a));
  }
};

assert.deepEqual = function(a, b, msg) {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw new Error((msg || 'deepEqual failed') + ': ' + JSON.stringify(a) + ' !== ' + JSON.stringify(b));
  }
};

function test(name, fn) {
  try {
    fn();
    passed++;
    process.stdout.write('  PASS: ' + name + '\n');
  } catch (e) {
    failed++;
    errors.push({ name: name, error: e });
    process.stdout.write('  FAIL: ' + name + '\n    ' + e.message + '\n');
  }
}

function suite(name, fn) {
  console.log('\n' + name);
  fn();
}

// ---------------------------------------------------------------------------
// Helper: build a minimal world state with a player and inventory
// ---------------------------------------------------------------------------
function makeState(items, opts) {
  opts = opts || {};
  var inv = [];
  if (items) {
    var keys = Object.keys(items);
    for (var i = 0; i < keys.length; i++) {
      inv.push({ itemId: keys[i], qty: items[keys[i]] });
    }
  }
  return {
    players: {
      player1: {
        level: opts.level !== undefined ? opts.level : 10,
        zone: opts.zone !== undefined ? opts.zone : null,
        inventory: inv,
        craftingHistory: [],
        xp: 0,
        craftingLevel: opts.craftingLevel || 0,
        perks: opts.perks || []
      }
    }
  };
}

// ---------------------------------------------------------------------------
// SUITE 1: EXPORTS AND STRUCTURE
// ---------------------------------------------------------------------------
suite('Module Exports', function() {

  test('Crafting module exports RECIPES array', function() {
    assert(Array.isArray(Crafting.RECIPES), 'RECIPES should be an array');
    assert(Crafting.RECIPES.length >= 30, 'Should have 30+ recipes, got ' + Crafting.RECIPES.length);
  });

  test('Crafting module exports MATERIALS object', function() {
    assert(typeof Crafting.MATERIALS === 'object', 'MATERIALS should be an object');
    var matCount = Object.keys(Crafting.MATERIALS).length;
    assert(matCount >= 20, 'Should have 20+ materials, got ' + matCount);
  });

  test('Crafting module exports QUALITY_TIERS object', function() {
    assert(typeof Crafting.QUALITY_TIERS === 'object', 'QUALITY_TIERS should be an object');
    assert(Crafting.QUALITY_TIERS.poor,       'Missing poor tier');
    assert(Crafting.QUALITY_TIERS.common,     'Missing common tier');
    assert(Crafting.QUALITY_TIERS.fine,       'Missing fine tier');
    assert(Crafting.QUALITY_TIERS.superior,   'Missing superior tier');
    assert(Crafting.QUALITY_TIERS.masterwork, 'Missing masterwork tier');
  });

  test('All public functions are exported', function() {
    var fns = [
      'getRecipes', 'getRecipeById', 'getCategories', 'getQualityTier',
      'getMaterialsNeeded', 'getMissingMaterials', 'canCraft', 'craft',
      'getCraftableRecipes', 'getCraftingHistory', 'salvage', 'batchCraft',
      'getSkillBonus', 'applyMessage', 'mulberry32'
    ];
    for (var i = 0; i < fns.length; i++) {
      assert(typeof Crafting[fns[i]] === 'function', 'Missing export: ' + fns[i]);
    }
  });

});

// ---------------------------------------------------------------------------
// SUITE 2: RECIPE STRUCTURE VALIDATION
// ---------------------------------------------------------------------------
suite('Recipe Structure — all 30+ recipes', function() {

  test('Every recipe has required fields', function() {
    var required = ['id', 'name', 'category', 'materials', 'output', 'skillRequired',
                    'levelRequired', 'xpReward', 'craftTime', 'quality'];
    for (var i = 0; i < Crafting.RECIPES.length; i++) {
      var r = Crafting.RECIPES[i];
      for (var j = 0; j < required.length; j++) {
        assert(r[required[j]] !== undefined, 'Recipe "' + r.id + '" missing field: ' + required[j]);
      }
    }
  });

  test('Every recipe id is a non-empty string', function() {
    for (var i = 0; i < Crafting.RECIPES.length; i++) {
      var r = Crafting.RECIPES[i];
      assert(typeof r.id === 'string' && r.id.length > 0, 'Recipe at index ' + i + ' has invalid id');
    }
  });

  test('Every recipe id is unique', function() {
    var seen = {};
    for (var i = 0; i < Crafting.RECIPES.length; i++) {
      var id = Crafting.RECIPES[i].id;
      assert(!seen[id], 'Duplicate recipe id: ' + id);
      seen[id] = true;
    }
  });

  test('Every recipe has at least one material', function() {
    for (var i = 0; i < Crafting.RECIPES.length; i++) {
      var r = Crafting.RECIPES[i];
      assert(Array.isArray(r.materials) && r.materials.length >= 1,
        'Recipe "' + r.id + '" has no materials');
    }
  });

  test('Every recipe material has itemId and qty > 0', function() {
    for (var i = 0; i < Crafting.RECIPES.length; i++) {
      var r = Crafting.RECIPES[i];
      for (var j = 0; j < r.materials.length; j++) {
        var m = r.materials[j];
        assert(typeof m.itemId === 'string' && m.itemId.length > 0,
          'Recipe "' + r.id + '" material ' + j + ' missing itemId');
        assert(typeof m.qty === 'number' && m.qty > 0,
          'Recipe "' + r.id + '" material ' + j + ' has invalid qty: ' + m.qty);
      }
    }
  });

  test('Every recipe output has itemId and qty > 0', function() {
    for (var i = 0; i < Crafting.RECIPES.length; i++) {
      var r = Crafting.RECIPES[i];
      assert(typeof r.output.itemId === 'string' && r.output.itemId.length > 0,
        'Recipe "' + r.id + '" output missing itemId');
      assert(typeof r.output.qty === 'number' && r.output.qty > 0,
        'Recipe "' + r.id + '" output has invalid qty: ' + r.output.qty);
    }
  });

  test('Every recipe levelRequired is a positive integer', function() {
    for (var i = 0; i < Crafting.RECIPES.length; i++) {
      var r = Crafting.RECIPES[i];
      assert(Number.isInteger(r.levelRequired) && r.levelRequired >= 1,
        'Recipe "' + r.id + '" levelRequired invalid: ' + r.levelRequired);
    }
  });

  test('Every recipe xpReward is a positive number', function() {
    for (var i = 0; i < Crafting.RECIPES.length; i++) {
      var r = Crafting.RECIPES[i];
      assert(typeof r.xpReward === 'number' && r.xpReward > 0,
        'Recipe "' + r.id + '" xpReward invalid: ' + r.xpReward);
    }
  });

  test('Every recipe craftTime is a positive number (ms)', function() {
    for (var i = 0; i < Crafting.RECIPES.length; i++) {
      var r = Crafting.RECIPES[i];
      assert(typeof r.craftTime === 'number' && r.craftTime > 0,
        'Recipe "' + r.id + '" craftTime invalid: ' + r.craftTime);
    }
  });

  test('Every recipe zone is null or a string', function() {
    for (var i = 0; i < Crafting.RECIPES.length; i++) {
      var r = Crafting.RECIPES[i];
      assert(r.zone === null || typeof r.zone === 'string',
        'Recipe "' + r.id + '" zone invalid: ' + r.zone);
    }
  });

  test('Every recipe quality has min and max', function() {
    for (var i = 0; i < Crafting.RECIPES.length; i++) {
      var r = Crafting.RECIPES[i];
      assert(typeof r.quality.min === 'number', 'Recipe "' + r.id + '" missing quality.min');
      assert(typeof r.quality.max === 'number', 'Recipe "' + r.id + '" missing quality.max');
      assert(r.quality.min < r.quality.max, 'Recipe "' + r.id + '" quality.min >= max');
    }
  });

  test('Every recipe category is one of the 8 valid categories', function() {
    var validCats = { tools: 1, weapons: 1, armor: 1, furniture: 1,
                      potions: 1, food_prep: 1, decorations: 1, instruments: 1 };
    for (var i = 0; i < Crafting.RECIPES.length; i++) {
      var r = Crafting.RECIPES[i];
      assert(validCats[r.category], 'Recipe "' + r.id + '" has invalid category: ' + r.category);
    }
  });

  test('skillRequired is "crafting" for every recipe', function() {
    for (var i = 0; i < Crafting.RECIPES.length; i++) {
      var r = Crafting.RECIPES[i];
      assert.strictEqual(r.skillRequired, 'crafting',
        'Recipe "' + r.id + '" skillRequired should be "crafting"');
    }
  });

});

// ---------------------------------------------------------------------------
// SUITE 3: ALL 8 CATEGORIES HAVE AT LEAST 2 RECIPES
// ---------------------------------------------------------------------------
suite('Category Coverage', function() {

  test('tools category has at least 2 recipes', function() {
    assert(Crafting.getRecipes('tools').length >= 2, 'tools needs at least 2 recipes');
  });

  test('weapons category has at least 2 recipes', function() {
    assert(Crafting.getRecipes('weapons').length >= 2, 'weapons needs at least 2 recipes');
  });

  test('armor category has at least 2 recipes', function() {
    assert(Crafting.getRecipes('armor').length >= 2, 'armor needs at least 2 recipes');
  });

  test('furniture category has at least 2 recipes', function() {
    assert(Crafting.getRecipes('furniture').length >= 2, 'furniture needs at least 2 recipes');
  });

  test('potions category has at least 2 recipes', function() {
    assert(Crafting.getRecipes('potions').length >= 2, 'potions needs at least 2 recipes');
  });

  test('food_prep category has at least 2 recipes', function() {
    assert(Crafting.getRecipes('food_prep').length >= 2, 'food_prep needs at least 2 recipes');
  });

  test('decorations category has at least 2 recipes', function() {
    assert(Crafting.getRecipes('decorations').length >= 2, 'decorations needs at least 2 recipes');
  });

  test('instruments category has at least 2 recipes', function() {
    assert(Crafting.getRecipes('instruments').length >= 2, 'instruments needs at least 2 recipes');
  });

  test('getCategories() returns all 8 categories', function() {
    var cats = Crafting.getCategories();
    assert.strictEqual(cats.length, 8, 'Expected 8 categories, got ' + cats.length);
    var required = ['tools', 'weapons', 'armor', 'furniture',
                    'potions', 'food_prep', 'decorations', 'instruments'];
    for (var i = 0; i < required.length; i++) {
      assert(cats.indexOf(required[i]) !== -1, 'Missing category: ' + required[i]);
    }
  });

});

// ---------------------------------------------------------------------------
// SUITE 4: MATERIALS
// ---------------------------------------------------------------------------
suite('MATERIALS definitions', function() {

  test('All 20 required materials are present', function() {
    var required = ['iron_ore', 'copper_ore', 'gold_ore', 'wood', 'stone', 'clay',
                    'leather', 'fabric', 'herbs', 'crystal', 'bone', 'feather',
                    'shell', 'sand', 'glass', 'dye_red', 'dye_blue', 'dye_green',
                    'gem_ruby', 'gem_sapphire'];
    for (var i = 0; i < required.length; i++) {
      assert(Crafting.MATERIALS[required[i]], 'Missing material: ' + required[i]);
    }
  });

  test('Every material has id, name, type, rarity', function() {
    var mats = Crafting.MATERIALS;
    var keys = Object.keys(mats);
    for (var i = 0; i < keys.length; i++) {
      var m = mats[keys[i]];
      assert(typeof m.id === 'string' && m.id.length > 0,    'Material "' + keys[i] + '" missing id');
      assert(typeof m.name === 'string' && m.name.length > 0, 'Material "' + keys[i] + '" missing name');
      assert(typeof m.type === 'string' && m.type.length > 0, 'Material "' + keys[i] + '" missing type');
      assert(typeof m.rarity === 'string',                    'Material "' + keys[i] + '" missing rarity');
    }
  });

  test('Every material id matches its key', function() {
    var mats = Crafting.MATERIALS;
    var keys = Object.keys(mats);
    for (var i = 0; i < keys.length; i++) {
      assert.strictEqual(mats[keys[i]].id, keys[i], 'Material id mismatch for key: ' + keys[i]);
    }
  });

  test('No recipe references an undefined material', function() {
    for (var i = 0; i < Crafting.RECIPES.length; i++) {
      var r = Crafting.RECIPES[i];
      for (var j = 0; j < r.materials.length; j++) {
        var itemId = r.materials[j].itemId;
        assert(Crafting.MATERIALS[itemId],
          'Recipe "' + r.id + '" references undefined material: ' + itemId);
      }
    }
  });

});

// ---------------------------------------------------------------------------
// SUITE 5: QUALITY TIERS
// ---------------------------------------------------------------------------
suite('Quality Tiers', function() {

  test('getQualityTier(0.0) returns "poor"', function() {
    assert.strictEqual(Crafting.getQualityTier(0.0), 'poor');
  });

  test('getQualityTier(0.15) returns "poor"', function() {
    assert.strictEqual(Crafting.getQualityTier(0.15), 'poor');
  });

  test('getQualityTier(0.3) returns "common"', function() {
    assert.strictEqual(Crafting.getQualityTier(0.3), 'common');
  });

  test('getQualityTier(0.45) returns "common"', function() {
    assert.strictEqual(Crafting.getQualityTier(0.45), 'common');
  });

  test('getQualityTier(0.6) returns "fine"', function() {
    assert.strictEqual(Crafting.getQualityTier(0.6), 'fine');
  });

  test('getQualityTier(0.7) returns "fine"', function() {
    assert.strictEqual(Crafting.getQualityTier(0.7), 'fine');
  });

  test('getQualityTier(0.8) returns "superior"', function() {
    assert.strictEqual(Crafting.getQualityTier(0.8), 'superior');
  });

  test('getQualityTier(0.9) returns "superior"', function() {
    assert.strictEqual(Crafting.getQualityTier(0.9), 'superior');
  });

  test('getQualityTier(0.95) returns "masterwork"', function() {
    assert.strictEqual(Crafting.getQualityTier(0.95), 'masterwork');
  });

  test('getQualityTier(1.0) returns "masterwork"', function() {
    assert.strictEqual(Crafting.getQualityTier(1.0), 'masterwork');
  });

  test('Each quality tier has min, max, label, color', function() {
    var tiers = Crafting.QUALITY_TIERS;
    var names = ['poor', 'common', 'fine', 'superior', 'masterwork'];
    for (var i = 0; i < names.length; i++) {
      var t = tiers[names[i]];
      assert(t, 'Missing tier: ' + names[i]);
      assert(typeof t.min === 'number', 'Tier ' + names[i] + ' missing min');
      assert(typeof t.max === 'number', 'Tier ' + names[i] + ' missing max');
      assert(typeof t.label === 'string', 'Tier ' + names[i] + ' missing label');
      assert(typeof t.color === 'string', 'Tier ' + names[i] + ' missing color');
    }
  });

  test('Tier ranges are in ascending order', function() {
    var tiers = Crafting.QUALITY_TIERS;
    assert(tiers.poor.max <= tiers.common.max,     'poor.max should be <= common.max');
    assert(tiers.common.max <= tiers.fine.max,     'common.max should be <= fine.max');
    assert(tiers.fine.max <= tiers.superior.max,   'fine.max should be <= superior.max');
    assert(tiers.superior.max <= tiers.masterwork.max, 'superior.max should be <= masterwork.max');
  });

});

// ---------------------------------------------------------------------------
// SUITE 6: getRecipes / getRecipeById / getMaterialsNeeded
// ---------------------------------------------------------------------------
suite('Recipe Lookup Functions', function() {

  test('getRecipes() returns all recipes', function() {
    var all = Crafting.getRecipes();
    assert.strictEqual(all.length, Crafting.RECIPES.length, 'getRecipes() should return all recipes');
  });

  test('getRecipes("tools") returns only tools', function() {
    var toolRecipes = Crafting.getRecipes('tools');
    for (var i = 0; i < toolRecipes.length; i++) {
      assert.strictEqual(toolRecipes[i].category, 'tools', 'Expected tools, got ' + toolRecipes[i].category);
    }
    assert(toolRecipes.length >= 2, 'Should have at least 2 tool recipes');
  });

  test('getRecipes("potions") returns only potions', function() {
    var potionRecipes = Crafting.getRecipes('potions');
    for (var i = 0; i < potionRecipes.length; i++) {
      assert.strictEqual(potionRecipes[i].category, 'potions');
    }
    assert(potionRecipes.length >= 2);
  });

  test('getRecipes("nonexistent") returns empty array', function() {
    var result = Crafting.getRecipes('nonexistent');
    assert.strictEqual(result.length, 0, 'Unknown category should return []');
  });

  test('getRecipeById("iron_sword") returns iron_sword recipe', function() {
    var r = Crafting.getRecipeById('iron_sword');
    assert(r !== null, 'iron_sword should exist');
    assert.strictEqual(r.id, 'iron_sword');
    assert.strictEqual(r.category, 'weapons');
  });

  test('getRecipeById("healing_potion") returns healing_potion recipe', function() {
    var r = Crafting.getRecipeById('healing_potion');
    assert(r !== null, 'healing_potion should exist');
    assert.strictEqual(r.id, 'healing_potion');
  });

  test('getRecipeById("fake_recipe") returns null', function() {
    var r = Crafting.getRecipeById('fake_recipe');
    assert.strictEqual(r, null, 'Unknown recipe should return null');
  });

  test('getMaterialsNeeded returns array with itemId, qty, name', function() {
    var mats = Crafting.getMaterialsNeeded('iron_sword');
    assert(Array.isArray(mats), 'Should return array');
    assert(mats.length > 0, 'Should have materials');
    for (var i = 0; i < mats.length; i++) {
      assert(mats[i].itemId, 'Each mat needs itemId');
      assert(mats[i].qty > 0, 'Each mat needs qty > 0');
      assert(mats[i].name, 'Each mat needs name');
    }
  });

  test('getMaterialsNeeded for "iron_sword" includes iron_ore', function() {
    var mats = Crafting.getMaterialsNeeded('iron_sword');
    var iron = mats.filter(function(m) { return m.itemId === 'iron_ore'; });
    assert(iron.length === 1, 'iron_sword should require iron_ore');
    assert.strictEqual(iron[0].qty, 3, 'iron_sword requires 3 iron_ore');
  });

  test('getMaterialsNeeded for invalid recipe returns empty array', function() {
    var mats = Crafting.getMaterialsNeeded('does_not_exist');
    assert.strictEqual(mats.length, 0, 'Unknown recipe should return []');
  });

});

// ---------------------------------------------------------------------------
// SUITE 7: canCraft — positive cases
// ---------------------------------------------------------------------------
suite('canCraft — positive cases', function() {

  test('canCraft returns true when player has exact materials', function() {
    var state = makeState({ iron_ore: 3, wood: 1 }, { zone: 'arena', level: 3 });
    var result = Crafting.canCraft(state, 'player1', 'iron_sword');
    assert(result.canCraft === true, 'Should be craftable: ' + result.reason);
  });

  test('canCraft returns true when player has more than required materials', function() {
    var state = makeState({ iron_ore: 10, wood: 5 }, { zone: 'arena', level: 3 });
    var result = Crafting.canCraft(state, 'player1', 'iron_sword');
    assert(result.canCraft === true, result.reason);
  });

  test('canCraft returns true for zone-free recipe regardless of zone', function() {
    var state = makeState({ bone: 3, wood: 2 }, { zone: 'nexus', level: 3 });
    var result = Crafting.canCraft(state, 'player1', 'bone_spear');
    assert(result.canCraft === true, result.reason);
  });

  test('canCraft returns true for stone_pickaxe with stone + wood', function() {
    var state = makeState({ stone: 3, wood: 2 }, { level: 1 });
    var result = Crafting.canCraft(state, 'player1', 'stone_pickaxe');
    assert(result.canCraft === true, result.reason);
  });

  test('canCraft returns true for healing_potion in gardens zone', function() {
    var state = makeState({ herbs: 3, glass: 1 }, { zone: 'gardens', level: 1 });
    var result = Crafting.canCraft(state, 'player1', 'healing_potion');
    assert(result.canCraft === true, result.reason);
  });

  test('canCraft reason is "OK" on success', function() {
    var state = makeState({ stone: 3, wood: 2 }, { level: 1 });
    var result = Crafting.canCraft(state, 'player1', 'stone_pickaxe');
    assert.strictEqual(result.reason, 'OK');
  });

});

// ---------------------------------------------------------------------------
// SUITE 8: canCraft — negative cases
// ---------------------------------------------------------------------------
suite('canCraft — negative cases', function() {

  test('canCraft returns false for unknown recipe', function() {
    var state = makeState({});
    var result = Crafting.canCraft(state, 'player1', 'nonexistent_recipe');
    assert(result.canCraft === false, 'Unknown recipe should fail');
    assert(result.reason.length > 0, 'Should provide reason');
  });

  test('canCraft returns false with missing materials', function() {
    var state = makeState({}, { zone: 'arena', level: 3 });
    var result = Crafting.canCraft(state, 'player1', 'iron_sword');
    assert(result.canCraft === false, 'No materials should fail');
    assert(/missing/i.test(result.reason), 'Reason should mention missing: ' + result.reason);
  });

  test('canCraft returns false with partial materials', function() {
    var state = makeState({ iron_ore: 1 }, { zone: 'arena', level: 3 });
    var result = Crafting.canCraft(state, 'player1', 'iron_sword');
    assert(result.canCraft === false, 'Partial materials should fail');
  });

  test('canCraft returns false with insufficient level', function() {
    var state = makeState({ iron_ore: 3, wood: 1 }, { zone: 'arena', level: 1 });
    var result = Crafting.canCraft(state, 'player1', 'iron_sword');
    assert(result.canCraft === false, 'Insufficient level should fail');
    assert(/level/i.test(result.reason), 'Reason should mention level: ' + result.reason);
  });

  test('canCraft returns false when level is exactly one below requirement', function() {
    var state = makeState({ crystal: 2, wood: 1, gold_ore: 1 }, { zone: 'athenaeum', level: 5 });
    // crystal_wand requires level 6
    var result = Crafting.canCraft(state, 'player1', 'crystal_wand');
    assert(result.canCraft === false, 'Level 5 vs required 6 should fail');
  });

  test('canCraft returns false in wrong zone', function() {
    var state = makeState({ herbs: 3, glass: 1 }, { zone: 'nexus', level: 1 });
    // healing_potion requires zone: 'gardens'
    var result = Crafting.canCraft(state, 'player1', 'healing_potion');
    assert(result.canCraft === false, 'Wrong zone should fail');
    assert(/zone/i.test(result.reason), 'Reason should mention zone: ' + result.reason);
  });

  test('canCraft returns false for studio recipe when player is in nexus', function() {
    var state = makeState({ gold_ore: 2, wood: 1 }, { zone: 'nexus', level: 5 });
    var result = Crafting.canCraft(state, 'player1', 'gold_chisel');
    assert(result.canCraft === false, 'gold_chisel requires studio zone');
  });

  test('canCraft returns false with empty inventory', function() {
    var state = makeState({}, { level: 10 });
    var result = Crafting.canCraft(state, 'player1', 'wooden_table');
    assert(result.canCraft === false);
  });

});

// ---------------------------------------------------------------------------
// SUITE 9: craft() — execution
// ---------------------------------------------------------------------------
suite('craft() — execution', function() {

  test('craft() returns success:true when conditions met', function() {
    var state = makeState({ stone: 3, wood: 2 }, { level: 1 });
    var result = Crafting.craft(state, 'player1', 'stone_pickaxe', 12345);
    assert(result.success === true, 'craft should succeed: ' + result.reason);
  });

  test('craft() removes materials from inventory', function() {
    var state = makeState({ stone: 5, wood: 4 }, { level: 1 });
    Crafting.craft(state, 'player1', 'stone_pickaxe', 42);
    // stone_pickaxe uses 3 stone and 2 wood
    var stoneLeft = 0;
    var woodLeft = 0;
    state.players.player1.inventory.forEach(function(s) {
      if (s.itemId === 'stone') stoneLeft += s.qty;
      if (s.itemId === 'wood')  woodLeft  += s.qty;
    });
    assert.strictEqual(stoneLeft, 2, 'Stone should be reduced by 3');
    assert.strictEqual(woodLeft,  2, 'Wood should be reduced by 2');
  });

  test('craft() adds output item to inventory', function() {
    var state = makeState({ stone: 3, wood: 2 }, { level: 1 });
    Crafting.craft(state, 'player1', 'stone_pickaxe', 99);
    var found = state.players.player1.inventory.some(function(s) {
      return s.itemId === 'stone_pickaxe';
    });
    assert(found, 'stone_pickaxe should be in inventory after crafting');
  });

  test('craft() returns materialsUsed array', function() {
    var state = makeState({ stone: 3, wood: 2 }, { level: 1 });
    var result = Crafting.craft(state, 'player1', 'stone_pickaxe', 1);
    assert(Array.isArray(result.materialsUsed), 'Should return materialsUsed');
    assert(result.materialsUsed.length > 0, 'materialsUsed should not be empty');
  });

  test('craft() returns xpAwarded > 0', function() {
    var state = makeState({ stone: 3, wood: 2 }, { level: 1 });
    var result = Crafting.craft(state, 'player1', 'stone_pickaxe', 1);
    assert(result.xpAwarded > 0, 'Should award XP');
  });

  test('craft() result item has quality, qualityTier, craftedBy fields', function() {
    var state = makeState({ stone: 3, wood: 2 }, { level: 1 });
    var result = Crafting.craft(state, 'player1', 'stone_pickaxe', 1);
    assert(result.item, 'Should return item');
    assert(typeof result.item.quality === 'number',   'item.quality should be a number');
    assert(typeof result.item.qualityTier === 'string', 'item.qualityTier should be a string');
    assert.strictEqual(result.item.craftedBy, 'player1', 'craftedBy should be player1');
  });

  test('craft() returns success:false for unknown recipe', function() {
    var state = makeState({}, { level: 10 });
    var result = Crafting.craft(state, 'player1', 'nonexistent', 1);
    assert(result.success === false, 'Unknown recipe should return failure');
  });

  test('craft() returns success:false when materials are missing', function() {
    var state = makeState({}, { zone: 'arena', level: 3 });
    var result = Crafting.craft(state, 'player1', 'iron_sword', 1);
    assert(result.success === false, 'Missing materials should return failure');
  });

  test('craft() adds entry to craftingHistory', function() {
    var state = makeState({ stone: 3, wood: 2 }, { level: 1 });
    Crafting.craft(state, 'player1', 'stone_pickaxe', 1);
    var history = state.players.player1.craftingHistory;
    assert(Array.isArray(history) && history.length >= 1, 'craftingHistory should have an entry');
    assert.strictEqual(history[0].recipeId, 'stone_pickaxe');
  });

  test('craft() materialUsed contains correct items and quantities', function() {
    var state = makeState({ iron_ore: 3, wood: 1 }, { zone: 'arena', level: 3 });
    var result = Crafting.craft(state, 'player1', 'iron_sword', 1);
    assert(result.success === true, result.reason);
    var ironUsed = result.materialsUsed.find(function(m) { return m.itemId === 'iron_ore'; });
    var woodUsed = result.materialsUsed.find(function(m) { return m.itemId === 'wood'; });
    assert(ironUsed && ironUsed.qty === 3, 'Should record 3 iron_ore used');
    assert(woodUsed && woodUsed.qty === 1, 'Should record 1 wood used');
  });

  test('craft() item.quality is a number between 0 and 1', function() {
    var state = makeState({ stone: 3, wood: 2 }, { level: 1 });
    var result = Crafting.craft(state, 'player1', 'stone_pickaxe', 7777);
    assert(result.item.quality >= 0 && result.item.quality <= 1.0,
      'Quality should be in [0, 1], got ' + result.item.quality);
  });

});

// ---------------------------------------------------------------------------
// SUITE 10: Deterministic quality with same seed
// ---------------------------------------------------------------------------
suite('Quality rolls are deterministic', function() {

  test('Same seed produces same quality', function() {
    var state1 = makeState({ stone: 3, wood: 2 }, { level: 1 });
    var state2 = makeState({ stone: 3, wood: 2 }, { level: 1 });
    var r1 = Crafting.craft(state1, 'player1', 'stone_pickaxe', 42);
    var r2 = Crafting.craft(state2, 'player1', 'stone_pickaxe', 42);
    assert.strictEqual(r1.item.quality, r2.item.quality, 'Same seed should produce same quality');
  });

  test('Same seed produces same qualityTier', function() {
    var state1 = makeState({ stone: 3, wood: 2 }, { level: 1 });
    var state2 = makeState({ stone: 3, wood: 2 }, { level: 1 });
    var r1 = Crafting.craft(state1, 'player1', 'stone_pickaxe', 42);
    var r2 = Crafting.craft(state2, 'player1', 'stone_pickaxe', 42);
    assert.strictEqual(r1.item.qualityTier, r2.item.qualityTier);
  });

  test('Different seeds can produce different quality values', function() {
    var results = [];
    for (var seed = 1; seed <= 100; seed++) {
      var state = makeState({ stone: 3, wood: 2 }, { level: 1 });
      var r = Crafting.craft(state, 'player1', 'stone_pickaxe', seed);
      if (r.success) results.push(r.item.quality);
    }
    var allSame = results.every(function(q) { return q === results[0]; });
    assert(!allSame, 'Different seeds should produce varied quality values');
  });

  test('mulberry32 PRNG with same seed returns same sequence', function() {
    var prng1 = Crafting.mulberry32(12345);
    var prng2 = Crafting.mulberry32(12345);
    for (var i = 0; i < 5; i++) {
      var v1 = prng1();
      var v2 = prng2();
      assert.strictEqual(v1, v2, 'Same seed PRNG should return same values');
    }
  });

  test('mulberry32 returns values in [0, 1)', function() {
    var prng = Crafting.mulberry32(999);
    for (var i = 0; i < 20; i++) {
      var v = prng();
      assert(v >= 0 && v < 1, 'mulberry32 value out of range: ' + v);
    }
  });

});

// ---------------------------------------------------------------------------
// SUITE 11: getCraftableRecipes
// ---------------------------------------------------------------------------
suite('getCraftableRecipes', function() {

  test('returns empty array when player has no materials', function() {
    var state = makeState({}, { level: 10 });
    var craftable = Crafting.getCraftableRecipes(state, 'player1');
    assert(craftable.length === 0, 'No materials means no craftable recipes');
  });

  test('returns stone_pickaxe when player has stone + wood at level 1', function() {
    var state = makeState({ stone: 3, wood: 2 }, { level: 1 });
    var craftable = Crafting.getCraftableRecipes(state, 'player1');
    var ids = craftable.map(function(r) { return r.id; });
    assert(ids.indexOf('stone_pickaxe') !== -1, 'stone_pickaxe should be craftable');
  });

  test('does not return zone-restricted recipes when player is in wrong zone', function() {
    var state = makeState(
      { herbs: 3, glass: 1 },
      { zone: 'nexus', level: 1 }
    );
    var craftable = Crafting.getCraftableRecipes(state, 'player1');
    var ids = craftable.map(function(r) { return r.id; });
    assert(ids.indexOf('healing_potion') === -1, 'healing_potion not craftable outside gardens');
  });

  test('returns healing_potion when player is in gardens zone with materials', function() {
    var state = makeState({ herbs: 3, glass: 1 }, { zone: 'gardens', level: 1 });
    var craftable = Crafting.getCraftableRecipes(state, 'player1');
    var ids = craftable.map(function(r) { return r.id; });
    assert(ids.indexOf('healing_potion') !== -1, 'healing_potion should be craftable in gardens');
  });

  test('returns only recipes meeting level requirement', function() {
    // crystal_wand requires level 6
    var state = makeState(
      { crystal: 2, wood: 1, gold_ore: 1 },
      { zone: 'athenaeum', level: 5 }
    );
    var craftable = Crafting.getCraftableRecipes(state, 'player1');
    var ids = craftable.map(function(r) { return r.id; });
    assert(ids.indexOf('crystal_wand') === -1, 'crystal_wand should not be craftable at level 5');
  });

  test('returns all craftable recipes when player has abundant materials', function() {
    // Give player every material in large quantities + high level
    var items = {};
    var matKeys = Object.keys(Crafting.MATERIALS);
    for (var i = 0; i < matKeys.length; i++) {
      items[matKeys[i]] = 99;
    }
    var state = makeState(items, { zone: null, level: 20 });
    var craftable = Crafting.getCraftableRecipes(state, 'player1');
    // Should be at least all non-zone recipes
    assert(craftable.length > 0, 'Should find some craftable recipes');
  });

});

// ---------------------------------------------------------------------------
// SUITE 12: getMissingMaterials
// ---------------------------------------------------------------------------
suite('getMissingMaterials', function() {

  test('returns empty array when player has all materials', function() {
    var state = makeState({ stone: 3, wood: 2 }, { level: 1 });
    var missing = Crafting.getMissingMaterials(state, 'player1', 'stone_pickaxe');
    assert.strictEqual(missing.length, 0, 'No missing materials');
  });

  test('returns missing items when player has none', function() {
    var state = makeState({}, { level: 1 });
    var missing = Crafting.getMissingMaterials(state, 'player1', 'stone_pickaxe');
    assert(missing.length > 0, 'Should identify missing materials');
  });

  test('identifies correct quantities missing', function() {
    var state = makeState({ stone: 1 }, { level: 1 });
    // stone_pickaxe needs 3 stone, 2 wood
    var missing = Crafting.getMissingMaterials(state, 'player1', 'stone_pickaxe');
    var stoneMissing = missing.find(function(m) { return m.itemId === 'stone'; });
    var woodMissing  = missing.find(function(m) { return m.itemId === 'wood'; });
    assert(stoneMissing, 'Stone should be in missing (have 1, need 3)');
    assert.strictEqual(stoneMissing.have, 1, 'have should be 1');
    assert.strictEqual(stoneMissing.need, 3, 'need should be 3');
    assert(woodMissing, 'Wood should be in missing (have 0, need 2)');
  });

  test('returns empty array for unknown recipe', function() {
    var state = makeState({}, { level: 1 });
    var missing = Crafting.getMissingMaterials(state, 'player1', 'nonexistent');
    assert.strictEqual(missing.length, 0);
  });

  test('each missing entry has itemId, need, have, name', function() {
    var state = makeState({}, { level: 1 });
    var missing = Crafting.getMissingMaterials(state, 'player1', 'iron_sword');
    for (var i = 0; i < missing.length; i++) {
      var m = missing[i];
      assert(m.itemId, 'Missing entry needs itemId');
      assert(typeof m.need === 'number', 'Missing entry needs "need"');
      assert(typeof m.have === 'number', 'Missing entry needs "have"');
      assert(m.name, 'Missing entry needs name');
    }
  });

  test('only lists truly missing materials (not those player has enough of)', function() {
    var state = makeState({ iron_ore: 3, wood: 0 }, { zone: 'arena', level: 3 });
    // iron_sword: 3 iron_ore (have enough), 1 wood (missing)
    var missing = Crafting.getMissingMaterials(state, 'player1', 'iron_sword');
    var ironMissing = missing.find(function(m) { return m.itemId === 'iron_ore'; });
    var woodMissing = missing.find(function(m) { return m.itemId === 'wood'; });
    assert(!ironMissing, 'iron_ore should NOT be in missing (have 3, need 3)');
    assert(woodMissing,  'wood SHOULD be in missing (have 0, need 1)');
  });

});

// ---------------------------------------------------------------------------
// SUITE 13: salvage
// ---------------------------------------------------------------------------
suite('salvage()', function() {

  test('salvage returns success:true when player has the item', function() {
    var state = makeState({ stone: 3, wood: 2 }, { level: 1 });
    // craft first to get item
    Crafting.craft(state, 'player1', 'stone_pickaxe', 1);
    var result = Crafting.salvage(state, 'player1', 'stone_pickaxe');
    assert(result.success === true, 'Salvage should succeed: ' + result.reason);
  });

  test('salvage returns success:false when player lacks the item', function() {
    var state = makeState({}, { level: 1 });
    var result = Crafting.salvage(state, 'player1', 'stone_pickaxe');
    assert(result.success === false, 'Should fail with no item');
  });

  test('salvage removes the item from inventory', function() {
    var state = makeState({ stone: 3, wood: 2 }, { level: 1 });
    Crafting.craft(state, 'player1', 'stone_pickaxe', 1);
    // confirm item is there
    var hasBefore = state.players.player1.inventory.some(function(s) {
      return s.itemId === 'stone_pickaxe';
    });
    assert(hasBefore, 'stone_pickaxe should be in inventory before salvage');
    Crafting.salvage(state, 'player1', 'stone_pickaxe');
    // Item should be removed
    var hasAfter = state.players.player1.inventory.some(function(s) {
      return s.itemId === 'stone_pickaxe';
    });
    assert(!hasAfter, 'stone_pickaxe should be removed after salvage');
  });

  test('salvage recovers some materials', function() {
    var state = makeState({ stone: 3, wood: 2 }, { level: 1 });
    Crafting.craft(state, 'player1', 'stone_pickaxe', 1);
    var result = Crafting.salvage(state, 'player1', 'stone_pickaxe');
    assert(result.recovered.length > 0, 'Should recover some materials');
  });

  test('salvage recovered qty is >= 1', function() {
    var state = makeState({ stone: 3, wood: 2 }, { level: 1 });
    Crafting.craft(state, 'player1', 'stone_pickaxe', 1);
    var result = Crafting.salvage(state, 'player1', 'stone_pickaxe');
    for (var i = 0; i < result.recovered.length; i++) {
      assert(result.recovered[i].qty >= 1, 'Each recovered material should have qty >= 1');
    }
  });

  test('salvage recovered qty is at most 50% of original', function() {
    // stone_pickaxe needs 3 stone, 2 wood — 50% return = floor(1.5)=1 and floor(1)=1
    var state = makeState({ stone: 3, wood: 2 }, { level: 1 });
    Crafting.craft(state, 'player1', 'stone_pickaxe', 1);
    var result = Crafting.salvage(state, 'player1', 'stone_pickaxe');
    var stoneRecovered = result.recovered.find(function(m) { return m.itemId === 'stone'; });
    var woodRecovered  = result.recovered.find(function(m) { return m.itemId === 'wood'; });
    assert(stoneRecovered && stoneRecovered.qty <= Math.ceil(3 * 0.5),
      'Stone recovery should be <= 50% of 3 (at most 1-2)');
    assert(woodRecovered && woodRecovered.qty <= Math.ceil(2 * 0.5),
      'Wood recovery should be <= 50% of 2 (at most 1)');
  });

  test('salvage returns success:false for unknown item', function() {
    var state = makeState({}, { level: 1 });
    var result = Crafting.salvage(state, 'player1', 'magic_item_doesnt_exist');
    assert(result.success === false, 'Salvage unknown item should fail');
  });

});

// ---------------------------------------------------------------------------
// SUITE 14: batchCraft
// ---------------------------------------------------------------------------
suite('batchCraft()', function() {

  test('batchCraft returns array of results', function() {
    var state = makeState({ stone: 9, wood: 6 }, { level: 1 });
    var results = Crafting.batchCraft(state, 'player1', 'stone_pickaxe', 3, 1);
    assert(Array.isArray(results), 'batchCraft should return an array');
    assert.strictEqual(results.length, 3, 'Should return 3 results for count=3');
  });

  test('batchCraft produces correct count of successful crafts', function() {
    var state = makeState({ stone: 9, wood: 6 }, { level: 1 });
    var results = Crafting.batchCraft(state, 'player1', 'stone_pickaxe', 3, 42);
    var successes = results.filter(function(r) { return r.success; });
    assert.strictEqual(successes.length, 3, 'All 3 crafts should succeed with enough materials');
  });

  test('batchCraft stops when materials run out', function() {
    var state = makeState({ stone: 3, wood: 2 }, { level: 1 });
    // Only enough for 1 stone_pickaxe
    var results = Crafting.batchCraft(state, 'player1', 'stone_pickaxe', 3, 1);
    var successes = results.filter(function(r) { return r.success; });
    assert.strictEqual(successes.length, 1, 'Only 1 craft should succeed with limited materials');
  });

  test('batchCraft with count=1 returns single result array', function() {
    var state = makeState({ stone: 3, wood: 2 }, { level: 1 });
    var results = Crafting.batchCraft(state, 'player1', 'stone_pickaxe', 1, 5);
    assert.strictEqual(results.length, 1);
    assert(results[0].success === true, results[0].reason);
  });

  test('batchCraft with same seed produces same quality sequence', function() {
    var state1 = makeState({ stone: 9, wood: 6 }, { level: 1 });
    var state2 = makeState({ stone: 9, wood: 6 }, { level: 1 });
    var r1 = Crafting.batchCraft(state1, 'player1', 'stone_pickaxe', 3, 7777);
    var r2 = Crafting.batchCraft(state2, 'player1', 'stone_pickaxe', 3, 7777);
    for (var i = 0; i < r1.length; i++) {
      if (r1[i].success && r2[i].success) {
        assert.strictEqual(r1[i].item.quality, r2[i].item.quality,
          'Same seed should produce same quality at index ' + i);
      }
    }
  });

  test('batchCraft adds multiple items to inventory', function() {
    var state = makeState({ stone: 9, wood: 6 }, { level: 1 });
    Crafting.batchCraft(state, 'player1', 'stone_pickaxe', 3, 1);
    var pickaxeCount = 0;
    state.players.player1.inventory.forEach(function(s) {
      if (s.itemId === 'stone_pickaxe') pickaxeCount += s.qty;
    });
    assert.strictEqual(pickaxeCount, 3, 'Should have 3 stone_pickaxe in inventory after batch craft');
  });

});

// ---------------------------------------------------------------------------
// SUITE 15: getCraftingHistory
// ---------------------------------------------------------------------------
suite('getCraftingHistory()', function() {

  test('returns empty array for player with no history', function() {
    var state = makeState({}, { level: 1 });
    var history = Crafting.getCraftingHistory(state, 'player1');
    assert(Array.isArray(history) && history.length === 0, 'Should return empty array');
  });

  test('returns one entry after one successful craft', function() {
    var state = makeState({ stone: 3, wood: 2 }, { level: 1 });
    Crafting.craft(state, 'player1', 'stone_pickaxe', 1);
    var history = Crafting.getCraftingHistory(state, 'player1');
    assert.strictEqual(history.length, 1, 'History should have 1 entry');
  });

  test('history entry has recipeId, itemId, quality, qualityTier, timestamp', function() {
    var state = makeState({ stone: 3, wood: 2 }, { level: 1 });
    Crafting.craft(state, 'player1', 'stone_pickaxe', 1);
    var history = Crafting.getCraftingHistory(state, 'player1');
    var entry = history[0];
    assert(entry.recipeId,    'Entry needs recipeId');
    assert(entry.itemId,      'Entry needs itemId');
    assert(typeof entry.quality === 'number', 'Entry needs quality');
    assert(entry.qualityTier, 'Entry needs qualityTier');
    assert(typeof entry.timestamp === 'number', 'Entry needs timestamp');
  });

  test('history grows with each craft', function() {
    var state = makeState({ stone: 12, wood: 8 }, { level: 1 });
    Crafting.craft(state, 'player1', 'stone_pickaxe', 1);
    Crafting.craft(state, 'player1', 'stone_pickaxe', 2);
    Crafting.craft(state, 'player1', 'stone_pickaxe', 3);
    var history = Crafting.getCraftingHistory(state, 'player1');
    assert.strictEqual(history.length, 3, 'History should have 3 entries');
  });

  test('returns empty array for nonexistent player', function() {
    var state = makeState({});
    var history = Crafting.getCraftingHistory(state, 'ghost');
    assert(Array.isArray(history) && history.length === 0);
  });

});

// ---------------------------------------------------------------------------
// SUITE 16: getSkillBonus
// ---------------------------------------------------------------------------
suite('getSkillBonus()', function() {

  test('returns 0 for player with no crafting skill', function() {
    var state = makeState({}, { craftingLevel: 0 });
    var bonus = Crafting.getSkillBonus(state, 'player1');
    assert.strictEqual(bonus, 0, 'No skill = no bonus');
  });

  test('returns positive value for player with crafting skill', function() {
    var state = makeState({}, { craftingLevel: 3 });
    var bonus = Crafting.getSkillBonus(state, 'player1');
    assert(bonus > 0, 'Skill level 3 should give a positive bonus');
  });

  test('bonus increases with skill level', function() {
    var state1 = makeState({}, { craftingLevel: 1 });
    var state2 = makeState({}, { craftingLevel: 3 });
    var bonus1 = Crafting.getSkillBonus(state1, 'player1');
    var bonus2 = Crafting.getSkillBonus(state2, 'player1');
    assert(bonus2 > bonus1, 'Higher skill level should give higher bonus');
  });

});

// ---------------------------------------------------------------------------
// SUITE 17: applyMessage (protocol integration)
// ---------------------------------------------------------------------------
suite('applyMessage()', function() {

  test('applyMessage handles craft message type', function() {
    var state = makeState({ stone: 3, wood: 2 }, { level: 1 });
    var msg = {
      type: 'craft',
      from: 'player1',
      payload: { recipeId: 'stone_pickaxe', seed: 1 }
    };
    var result = Crafting.applyMessage(state, msg);
    assert(result.success === true, 'applyMessage should succeed: ' + result.reason);
  });

  test('applyMessage returns failure for non-craft message type', function() {
    var state = makeState({});
    var msg = { type: 'move', from: 'player1', payload: {} };
    var result = Crafting.applyMessage(state, msg);
    assert(result.success === false, 'Non-craft message should fail');
  });

  test('applyMessage returns failure for null message', function() {
    var state = makeState({});
    var result = Crafting.applyMessage(state, null);
    assert(result.success === false, 'Null message should fail');
  });

  test('applyMessage passes seed from payload', function() {
    var state1 = makeState({ stone: 3, wood: 2 }, { level: 1 });
    var state2 = makeState({ stone: 3, wood: 2 }, { level: 1 });
    var msg1 = { type: 'craft', from: 'player1', payload: { recipeId: 'stone_pickaxe', seed: 555 } };
    var msg2 = { type: 'craft', from: 'player1', payload: { recipeId: 'stone_pickaxe', seed: 555 } };
    var r1 = Crafting.applyMessage(state1, msg1);
    var r2 = Crafting.applyMessage(state2, msg2);
    assert.strictEqual(r1.item.quality, r2.item.quality, 'Same seed via payload should produce same quality');
  });

  test('applyMessage works without seed in payload', function() {
    var state = makeState({ stone: 3, wood: 2 }, { level: 1 });
    var msg = { type: 'craft', from: 'player1', payload: { recipeId: 'stone_pickaxe' } };
    var result = Crafting.applyMessage(state, msg);
    assert(result.success === true, 'applyMessage without seed should succeed: ' + result.reason);
  });

});

// ---------------------------------------------------------------------------
// SUITE 18: Edge Cases
// ---------------------------------------------------------------------------
suite('Edge Cases', function() {

  test('craft with invalid playerId returns failure', function() {
    var state = { players: {} };
    var result = Crafting.canCraft(state, 'ghost_player', 'stone_pickaxe');
    assert(result.canCraft === false, 'Nonexistent player should fail canCraft');
  });

  test('getQualityTier handles value of exactly 0.3 (boundary — common)', function() {
    assert.strictEqual(Crafting.getQualityTier(0.3), 'common');
  });

  test('getQualityTier handles value just below 0.3 (poor)', function() {
    assert.strictEqual(Crafting.getQualityTier(0.299), 'poor');
  });

  test('getQualityTier handles negative quality (clamp to poor)', function() {
    var tier = Crafting.getQualityTier(-0.5);
    assert(tier === 'poor', 'Negative quality should return poor, got: ' + tier);
  });

  test('batchCraft with count=0 returns empty array', function() {
    var state = makeState({ stone: 3, wood: 2 }, { level: 1 });
    var results = Crafting.batchCraft(state, 'player1', 'stone_pickaxe', 0, 1);
    assert.strictEqual(results.length, 0, 'count=0 should return empty array');
  });

  test('craft after salvage makes materials available again', function() {
    var state = makeState({ stone: 3, wood: 2 }, { level: 1 });
    // Craft once
    var r1 = Crafting.craft(state, 'player1', 'stone_pickaxe', 1);
    assert(r1.success, 'First craft should succeed');
    // Salvage the pickaxe
    Crafting.salvage(state, 'player1', 'stone_pickaxe');
    // Add enough materials again for another craft
    state.players.player1.inventory.push({ itemId: 'stone', qty: 2 });
    state.players.player1.inventory.push({ itemId: 'wood', qty: 1 });
    var r2 = Crafting.craft(state, 'player1', 'stone_pickaxe', 2);
    assert(r2.success, 'Second craft after salvage should also succeed');
  });

  test('craft does not fail silently on success (returns item)', function() {
    var state = makeState({ stone: 3, wood: 2 }, { level: 1 });
    var result = Crafting.craft(state, 'player1', 'stone_pickaxe', 1);
    assert(result.success === true && result.item !== undefined, 'Success should include item');
  });

  test('mulberry32(0) does not hang or throw', function() {
    var prng = Crafting.mulberry32(0);
    var v = prng();
    assert(typeof v === 'number', 'Should return a number for seed 0');
  });

  test('getRecipes returns a copy, not the internal array reference', function() {
    var all1 = Crafting.getRecipes();
    var all2 = Crafting.getRecipes();
    // They should be equal length
    assert.strictEqual(all1.length, all2.length);
    // But pushing to one should not affect the other
    all1.push({ id: 'fake' });
    var all3 = Crafting.getRecipes();
    assert.strictEqual(all3.length, Crafting.RECIPES.length, 'getRecipes should return a copy');
  });

  test('craft() for multi-qty output adds correct qty to inventory', function() {
    // herb_bread produces 2 per craft
    var state = makeState({ fiber: 3, herbs: 2 }, { level: 1 });
    var result = Crafting.craft(state, 'player1', 'herb_bread', 1);
    assert(result.success === true, result.reason);
    assert.strictEqual(result.item.qty, 2, 'herb_bread should produce qty 2');
    var breadCount = 0;
    state.players.player1.inventory.forEach(function(s) {
      if (s.itemId === 'herb_bread') breadCount += s.qty;
    });
    assert.strictEqual(breadCount, 2, 'Inventory should have 2 herb_bread');
  });

  test('craft() quality tier name is always a valid tier', function() {
    var validTiers = { poor: 1, common: 1, fine: 1, superior: 1, masterwork: 1 };
    for (var seed = 1; seed <= 20; seed++) {
      var state = makeState({ stone: 3, wood: 2 }, { level: 1 });
      var r = Crafting.craft(state, 'player1', 'stone_pickaxe', seed);
      if (r.success) {
        assert(validTiers[r.item.qualityTier],
          'Quality tier "' + r.item.qualityTier + '" is not a valid tier');
      }
    }
  });

  test('All MATERIALS have rarity of common, uncommon, or rare', function() {
    var validRarities = { common: 1, uncommon: 1, rare: 1 };
    var keys = Object.keys(Crafting.MATERIALS);
    for (var i = 0; i < keys.length; i++) {
      var m = Crafting.MATERIALS[keys[i]];
      assert(validRarities[m.rarity], 'Material "' + keys[i] + '" has invalid rarity: ' + m.rarity);
    }
  });

});

// ---------------------------------------------------------------------------
// SUITE 19: Specific Recipe Checks
// ---------------------------------------------------------------------------
suite('Specific Recipe Validation', function() {

  test('iron_sword recipe is in weapons category with correct level requirement', function() {
    var r = Crafting.getRecipeById('iron_sword');
    assert.strictEqual(r.category, 'weapons');
    assert.strictEqual(r.levelRequired, 2);
    assert.strictEqual(r.zone, 'arena');
  });

  test('healing_potion recipe requires gardens zone', function() {
    var r = Crafting.getRecipeById('healing_potion');
    assert.strictEqual(r.zone, 'gardens');
    assert.strictEqual(r.category, 'potions');
  });

  test('crystal_harp recipe is the highest level instrument', function() {
    var r = Crafting.getRecipeById('crystal_harp');
    assert(r !== null, 'crystal_harp should exist');
    assert.strictEqual(r.category, 'instruments');
    assert(r.levelRequired >= 5, 'crystal_harp should require high level');
  });

  test('wooden_staff is a level 1 weapon', function() {
    var r = Crafting.getRecipeById('wooden_staff');
    assert.strictEqual(r.category, 'weapons');
    assert.strictEqual(r.levelRequired, 1);
  });

  test('herb_bread produces qty 2', function() {
    var r = Crafting.getRecipeById('herb_bread');
    assert.strictEqual(r.output.qty, 2);
    assert.strictEqual(r.category, 'food_prep');
  });

  test('roasted_grain produces qty 3', function() {
    var r = Crafting.getRecipeById('roasted_grain');
    assert.strictEqual(r.output.qty, 3);
  });

  test('gold_chisel requires studio zone and level 5', function() {
    var r = Crafting.getRecipeById('gold_chisel');
    assert.strictEqual(r.zone, 'studio');
    assert.strictEqual(r.levelRequired, 5);
  });

  test('stone_pickaxe requires no zone (null)', function() {
    var r = Crafting.getRecipeById('stone_pickaxe');
    assert.strictEqual(r.zone, null, 'stone_pickaxe should have no zone restriction');
  });

  test('wisdom_potion recipe references valid materials', function() {
    var r = Crafting.getRecipeById('wisdom_potion');
    assert(r !== null);
    r.materials.forEach(function(m) {
      assert(Crafting.MATERIALS[m.itemId], 'wisdom_potion material "' + m.itemId + '" not in MATERIALS');
    });
  });

  test('gem_mosaic requires gem_ruby and gem_sapphire', function() {
    var mats = Crafting.getMaterialsNeeded('gem_mosaic');
    var ruby     = mats.find(function(m) { return m.itemId === 'gem_ruby'; });
    var sapphire = mats.find(function(m) { return m.itemId === 'gem_sapphire'; });
    assert(ruby,     'gem_mosaic should require gem_ruby');
    assert(sapphire, 'gem_mosaic should require gem_sapphire');
  });

});

// ---------------------------------------------------------------------------
// FINAL REPORT
// ---------------------------------------------------------------------------
console.log('\n======================================================');
console.log('ZION Crafting Module — Test Results');
console.log('======================================================');
console.log('Passed: ' + passed);
console.log('Failed: ' + failed);
if (errors.length > 0) {
  console.log('\nFailures:');
  errors.forEach(function(e) {
    console.log('  FAIL: ' + e.name);
    console.log('    ' + e.error.message);
  });
}
console.log('======================================================\n');
process.exit(failed > 0 ? 1 : 0);
